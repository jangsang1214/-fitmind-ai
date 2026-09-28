import Foundation
import HealthKit
import WebKit

final class GARANGHealthBridge: NSObject {
    static let messageHandlerName = "garangHealth"
    static let bridgeJavaScript = #"""
    (() => {
      if (window.GarangNativeHealthBridge) return;
      const pending = new Map();
      let seq = 0;
      window.__garangNativeResolve = (id, ok, payload) => {
        const entry = pending.get(String(id));
        if (!entry) return;
        pending.delete(String(id));
        ok ? entry.resolve(payload) : entry.reject(new Error(payload?.message || String(payload || 'Native Health error')));
      };
      const call = (method, payload = {}) => new Promise((resolve, reject) => {
        const id = String(++seq);
        pending.set(id, { resolve, reject });
        try {
          window.webkit.messageHandlers.garangHealth.postMessage({ id, method, payload });
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      });
      window.GarangNativeHealthBridge = Object.freeze({
        platform: 'ios-healthkit',
        requestAuthorization(scopes) { return call('requestAuthorization', { scopes: Array.isArray(scopes) ? scopes : [] }); },
        syncWorkouts(workouts) { return call('syncWorkouts', { workouts: Array.isArray(workouts) ? workouts : [] }); },
        readHealthSignals(request) { return call('readHealthSignals', request && typeof request === 'object' ? request : {}); }
      });
    })();
    """#

    private weak var webView: WKWebView?
    private let healthStore = HKHealthStore()
    private let iso = ISO8601DateFormatter()
    private let recordsQueue = DispatchQueue(label: "com.garang.health-records")

    func attach(_ webView: WKWebView) { self.webView = webView }

    func handle(message: WKScriptMessage) {
        guard message.name == Self.messageHandlerName,
              let body = message.body as? [String: Any],
              let requestID = body["id"] as? String,
              let method = body["method"] as? String else { return }
        let payload = body["payload"] as? [String: Any] ?? [:]

        switch method {
        case "requestAuthorization":
            requestAuthorization(payload: payload) { [weak self] in self?.resolve(requestID: requestID, result: $0) }
        case "syncWorkouts":
            syncWorkouts(payload: payload) { [weak self] in self?.resolve(requestID: requestID, result: $0) }
        case "readHealthSignals":
            readHealthSignals(payload: payload) { [weak self] in self?.resolve(requestID: requestID, result: $0) }
        default:
            reject(requestID: requestID, message: "Unsupported native method: \(method)")
        }
    }

    private func requestAuthorization(payload: [String: Any], completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(.success(["granted": false, "status": "unavailable"])); return
        }
        let scopes = Set((payload["scopes"] as? [String] ?? []).map { $0.lowercased() })
        let read = readTypes(scopes)
        let share = shareTypes(scopes)
        healthStore.requestAuthorization(toShare: share, read: read) { success, error in
            if let error { completion(.failure(error)); return }
            completion(.success(["granted": success, "status": success ? "authorized" : "denied"]))
        }
    }

    private func readTypes(_ scopes: Set<String>) -> Set<HKObjectType> {
        var types = Set<HKObjectType>()
        func include(_ names: [String], _ type: HKObjectType?) {
            if names.contains(where: scopes.contains), let type { types.insert(type) }
        }
        include(["heartratevariability","hrv"], HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN))
        include(["restingheartrate","rhr"], HKObjectType.quantityType(forIdentifier: .restingHeartRate))
        include(["sleep","sleepscore"], HKObjectType.categoryType(forIdentifier: .sleepAnalysis))
        include(["steps"], HKObjectType.quantityType(forIdentifier: .stepCount))
        include(["activeminutes"], HKObjectType.quantityType(forIdentifier: .appleExerciseTime))
        include(["heartrate"], HKObjectType.quantityType(forIdentifier: .heartRate))
        return types
    }

    private func shareTypes(_ scopes: Set<String>) -> Set<HKSampleType> {
        var types = Set<HKSampleType>()
        if scopes.contains("workout") { types.insert(HKObjectType.workoutType()) }
        if scopes.contains("activeenergy"), let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { types.insert(type) }
        return types
    }

    private func syncWorkouts(payload: [String: Any], completion: @escaping (Result<[String: Any], Error>) -> Void) {
        let raw = payload["workouts"] as? [[String: Any]] ?? []
        let workouts: [HKWorkout] = raw.compactMap { item in
            guard let start = workoutStart(item) else { return nil }
            let minutes = max(1, number(item["duration"]) ?? 1)
            let end = start.addingTimeInterval(minutes * 60)
            let kcal = max(0, number(item["kcal"]) ?? 0)
            let energy = kcal > 0 ? HKQuantity(unit: .kilocalorie(), doubleValue: kcal) : nil
            return HKWorkout(
                activityType: .traditionalStrengthTraining,
                start: start,
                end: end,
                duration: minutes * 60,
                totalEnergyBurned: energy,
                totalDistance: nil,
                metadata: [HKMetadataKeyWorkoutBrandName: "GARANG"]
            )
        }
        guard !workouts.isEmpty else { completion(.success(["saved": 0, "received": raw.count])); return }
        healthStore.save(workouts) { success, error in
            if let error { completion(.failure(error)); return }
            completion(.success(["saved": success ? workouts.count : 0, "received": raw.count]))
        }
    }

    private func readHealthSignals(payload: [String: Any], completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(.success(["provider": "Apple Health", "records": []])); return
        }
        let metrics = Set((payload["metrics"] as? [String] ?? []).map { $0.lowercased() })
        let since = parseDate(payload["since"]) ?? Calendar.current.date(byAdding: .day, value: -14, to: Date())!
        let group = DispatchGroup()
        var records: [[String: Any]] = []
        var firstError: Error?

        func append(_ values: [[String: Any]], _ error: Error?) {
            recordsQueue.sync {
                records.append(contentsOf: values)
                if firstError == nil { firstError = error }
            }
        }
        func quantity(_ names: [String], _ identifier: HKQuantityTypeIdentifier, _ dataType: String, _ unit: HKUnit, _ unitName: String) {
            guard names.contains(where: metrics.contains), let type = HKObjectType.quantityType(forIdentifier: identifier) else { return }
            group.enter()
            readQuantity(type: type, dataType: dataType, unit: unit, unitName: unitName, since: since) {
                append($0, $1); group.leave()
            }
        }

        quantity(["heartratevariability"], .heartRateVariabilitySDNN, "HeartRateVariabilitySDNN", HKUnit.secondUnit(with: .milli), "ms")
        quantity(["restingheartrate"], .restingHeartRate, "RestingHeartRate", HKUnit.count().unitDivided(by: .minute()), "count/min")
        quantity(["steps"], .stepCount, "StepCount", .count(), "count")
        quantity(["activeminutes"], .appleExerciseTime, "AppleExerciseTime", .minute(), "min")

        if ["sleep","sleepscore"].contains(where: metrics.contains),
           let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            group.enter()
            readSleep(type: type, since: since) { append($0, $1); group.leave() }
        }

        group.notify(queue: .global(qos: .userInitiated)) {
            if let firstError { completion(.failure(firstError)); return }
            let sorted = self.recordsQueue.sync {
                records.sorted { String(describing: $0["startTime"] ?? "") < String(describing: $1["startTime"] ?? "") }
            }
            completion(.success(["provider": "Apple Health", "records": sorted]))
        }
    }

    private func readQuantity(type: HKQuantityType, dataType: String, unit: HKUnit, unitName: String, since: Date, completion: @escaping ([[String: Any]], Error?) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
            let rows = (samples as? [HKQuantitySample] ?? []).map { sample in
                ["provider":"Apple Health","sourceName":sample.sourceRevision.source.name,"dataType":dataType,"startTime":self.iso.string(from: sample.endDate),"value":sample.quantity.doubleValue(for: unit),"unit":unitName] as [String: Any]
            }
            completion(rows, error)
        }
        healthStore.execute(query)
    }

    private func readSleep(type: HKCategoryType, since: Date, completion: @escaping ([[String: Any]], Error?) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
            let asleep = (samples as? [HKCategorySample] ?? []).filter {
                $0.value == HKCategoryValueSleepAnalysis.asleep.rawValue || $0.value >= 4
            }
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "yyyy-MM-dd"
            var byDay: [String: (Double, Date)] = [:]
            for sample in asleep {
                let day = formatter.string(from: sample.startDate)
                let hours = max(0, sample.endDate.timeIntervalSince(sample.startDate) / 3600)
                let prior = byDay[day] ?? (0, sample.endDate)
                byDay[day] = (prior.0 + hours, max(prior.1, sample.endDate))
            }
            let rows = byDay.keys.sorted().compactMap { day -> [String: Any]? in
                guard let value = byDay[day], value.0 > 0 else { return nil }
                return ["provider":"Apple Health","dataType":"SleepDuration","startTime":self.iso.string(from:value.1),"value":value.0,"unit":"h"]
            }
            completion(rows, error)
        }
        healthStore.execute(query)
    }

    private func workoutStart(_ item: [String: Any]) -> Date? {
        guard let raw = item["date"] as? String else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: raw) else { return nil }
        return Calendar.current.date(bySettingHour: 12, minute: 0, second: 0, of: date)
    }

    private func parseDate(_ value: Any?) -> Date? {
        guard let raw = value as? String, !raw.isEmpty else { return nil }
        return iso.date(from: raw)
    }

    private func number(_ value: Any?) -> Double? {
        if let value = value as? NSNumber { return value.doubleValue }
        if let value = value as? String { return Double(value) }
        return nil
    }

    private func resolve(requestID: String, result: Result<[String: Any], Error>) {
        switch result {
        case .success(let payload): evaluate(requestID: requestID, ok: true, payload: payload)
        case .failure(let error): reject(requestID: requestID, message: error.localizedDescription)
        }
    }

    private func reject(requestID: String, message: String) {
        evaluate(requestID: requestID, ok: false, payload: ["message": message])
    }

    private func evaluate(requestID: String, ok: Bool, payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        let safeID = requestID.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        let script = "window.__garangNativeResolve('\(safeID)', \(ok ? "true" : "false"), \(json));"
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript(script) }
    }
}
