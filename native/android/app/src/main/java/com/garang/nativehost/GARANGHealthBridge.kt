package com.garang.nativehost

import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class GARANGHealthBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {
    private val client by lazy { HealthConnectClient.getOrCreate(activity) }

    companion object {
        val bridgeJavaScript = """
            (() => {
              if (window.GarangNativeHealthBridge) return;
              const pending = new Map();
              let seq = 0;
              window.__garangNativeResolve = (id, ok, payload) => {
                const entry = pending.get(String(id));
                if (!entry) return;
                pending.delete(String(id));
                ok ? entry.resolve(payload) : entry.reject(new Error(payload?.message || String(payload || 'Health Connect error')));
              };
              const call = (method, payload = {}) => new Promise((resolve, reject) => {
                const id = String(++seq);
                pending.set(id, { resolve, reject });
                try {
                  window.GarangAndroidHealth.postMessage(JSON.stringify({ id, method, payload }));
                } catch (error) {
                  pending.delete(id);
                  reject(error);
                }
              });
              window.GarangNativeHealthBridge = Object.freeze({
                platform: 'android-health-connect',
                requestAuthorization(scopes) { return call('requestAuthorization', { scopes: Array.isArray(scopes) ? scopes : [] }); },
                syncWorkouts(workouts) { return call('syncWorkouts', { workouts: Array.isArray(workouts) ? workouts : [] }); },
                readHealthSignals(request) { return call('readHealthSignals', request && typeof request === 'object' ? request : {}); }
              });
            })();
        """.trimIndent()
    }

    @JavascriptInterface
    fun postMessage(raw: String) {
        val message = runCatching { JSONObject(raw) }.getOrNull() ?: return
        val requestId = message.optString("id")
        val method = message.optString("method")
        val payload = message.optJSONObject("payload") ?: JSONObject()
        when (method) {
            "requestAuthorization" -> requestAuthorization(requestId, payload)
            "syncWorkouts" -> syncWorkouts(requestId, payload)
            "readHealthSignals" -> readHealthSignals(requestId, payload)
            else -> reject(requestId, "Unsupported native method: " + method)
        }
    }

    private fun requestAuthorization(requestId: String, payload: JSONObject) {
        if (!activity.healthSdkAvailable()) {
            resolve(requestId, JSONObject().put("granted", false).put("status", "unavailable"))
            return
        }
        val scopes = payload.optJSONArray("scopes").toStrings().map { it.lowercase() }.toSet()
        val permissions = mutableSetOf<String>()
        if ("heartratevariability" in scopes || "hrv" in scopes) permissions += HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)
        if ("restingheartrate" in scopes || "rhr" in scopes) permissions += HealthPermission.getReadPermission(RestingHeartRateRecord::class)
        if ("sleep" in scopes || "sleepscore" in scopes) permissions += HealthPermission.getReadPermission(SleepSessionRecord::class)
        if ("steps" in scopes) permissions += HealthPermission.getReadPermission(StepsRecord::class)
        if ("activeminutes" in scopes) permissions += HealthPermission.getReadPermission(ExerciseSessionRecord::class)
        if ("workout" in scopes) permissions += HealthPermission.getWritePermission(ExerciseSessionRecord::class)
        if (permissions.isEmpty()) {
            resolve(requestId, JSONObject().put("granted", true).put("status", "no_supported_scope"))
            return
        }
        activity.runOnUiThread { activity.requestHealthPermissions(requestId, permissions) }
    }

    fun resolveAuthorization(requestId: String, granted: Set<String>) {
        activity.lifecycleScope.launch {
            val current = if (activity.healthSdkAvailable()) client.permissionController.getGrantedPermissions() else emptySet()
            resolve(requestId, JSONObject().put("granted", current.containsAll(granted)).put("status", if (current.containsAll(granted)) "authorized" else "partial_or_denied"))
        }
    }

    private fun syncWorkouts(requestId: String, payload: JSONObject) {
        if (!activity.healthSdkAvailable()) {
            resolve(requestId, JSONObject().put("saved", 0).put("status", "unavailable"))
            return
        }
        activity.lifecycleScope.launch {
            runCatching {
                val workouts = payload.optJSONArray("workouts") ?: JSONArray()
                val records = buildList {
                    for (index in 0 until workouts.length()) {
                        val item = workouts.optJSONObject(index) ?: continue
                        val date = runCatching { LocalDate.parse(item.optString("date")) }.getOrNull() ?: continue
                        val minutes = item.optDouble("duration", 1.0).coerceAtLeast(1.0)
                        val start = date.atTime(12, 0).atZone(ZoneId.systemDefault()).toInstant()
                        val end = start.plusSeconds((minutes * 60).toLong())
                        val offset = ZoneOffset.systemDefault().rules.getOffset(start)
                        val stableId = ("garang-" + date.toString() + "-" + item.optString("name", "workout")).replace(Regex("[^A-Za-z0-9._-]"), "-")
                        add(
                            ExerciseSessionRecord(
                                startTime = start,
                                startZoneOffset = offset,
                                endTime = end,
                                endZoneOffset = offset,
                                exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                                metadata = Metadata.activelyRecorded(device = Device(type = Device.TYPE_PHONE), clientRecordId = stableId)
                            )
                        )
                    }
                }
                if (records.isNotEmpty()) client.insertRecords(records)
                JSONObject().put("saved", records.size).put("received", workouts.length()).put("provider", "Health Connect")
            }.onSuccess { resolve(requestId, it) }
             .onFailure { reject(requestId, it.message ?: "Health Connect workout sync failed") }
        }
    }

    private fun readHealthSignals(requestId: String, payload: JSONObject) {
        if (!activity.healthSdkAvailable()) {
            resolve(requestId, JSONObject().put("provider", "Health Connect").put("records", JSONArray()))
            return
        }
        activity.lifecycleScope.launch {
            runCatching {
                val metrics = payload.optJSONArray("metrics").toStrings().map { it.lowercase() }.toSet()
                val since = runCatching { Instant.parse(payload.optString("since")) }.getOrNull() ?: Instant.now().minus(Duration.ofDays(14))
                val until = Instant.now()
                val records = JSONArray()

                if ("heartratevariability" in metrics) {
                    client.readRecords(ReadRecordsRequest<HeartRateVariabilityRmssdRecord>(timeRangeFilter = TimeRangeFilter.between(since, until))).records.forEach {
                        records.put(record("HeartRateVariabilityRmssd", it.time, it.heartRateVariabilityMillis, "ms", it.metadata.dataOrigin.packageName))
                    }
                }
                if ("restingheartrate" in metrics) {
                    client.readRecords(ReadRecordsRequest<RestingHeartRateRecord>(timeRangeFilter = TimeRangeFilter.between(since, until))).records.forEach {
                        records.put(record("RestingHeartRate", it.time, it.beatsPerMinute, "count/min", it.metadata.dataOrigin.packageName))
                    }
                }
                if ("steps" in metrics) {
                    client.readRecords(ReadRecordsRequest<StepsRecord>(timeRangeFilter = TimeRangeFilter.between(since, until))).records.forEach {
                        records.put(record("StepCount", it.endTime, it.count, "count", it.metadata.dataOrigin.packageName))
                    }
                }
                if ("sleep" in metrics || "sleepscore" in metrics) {
                    client.readRecords(ReadRecordsRequest<SleepSessionRecord>(timeRangeFilter = TimeRangeFilter.between(since, until))).records.forEach {
                        val hours = Duration.between(it.startTime, it.endTime).toMinutes().toDouble() / 60.0
                        records.put(record("SleepDuration", it.endTime, hours, "h", it.metadata.dataOrigin.packageName))
                    }
                }
                if ("activeminutes" in metrics) {
                    client.readRecords(ReadRecordsRequest<ExerciseSessionRecord>(timeRangeFilter = TimeRangeFilter.between(since, until))).records.forEach {
                        val minutes = Duration.between(it.startTime, it.endTime).toMinutes().toDouble()
                        records.put(record("ExerciseTime", it.endTime, minutes, "min", it.metadata.dataOrigin.packageName))
                    }
                }
                JSONObject().put("provider", "Health Connect").put("records", records)
            }.onSuccess { resolve(requestId, it) }
             .onFailure { reject(requestId, it.message ?: "Health Connect read failed") }
        }
    }

    private fun record(type: String, time: Instant, value: Number, unit: String, source: String): JSONObject =
        JSONObject().put("provider", "Health Connect").put("sourceName", source).put("dataType", type).put("startTime", time.toString()).put("value", value).put("unit", unit)

    private fun resolve(requestId: String, payload: JSONObject) = evaluate(requestId, true, payload)
    private fun reject(requestId: String, message: String) = evaluate(requestId, false, JSONObject().put("message", message))

    private fun evaluate(requestId: String, ok: Boolean, payload: JSONObject) {
        val id = JSONObject.quote(requestId)
        val script = "window.__garangNativeResolve(" + id + ", " + (if (ok) "true" else "false") + ", " + payload.toString() + ");"
        activity.runOnUiThread { webView.evaluateJavascript(script, null) }
    }

    private fun JSONArray?.toStrings(): List<String> {
        if (this == null) return emptyList()
        return buildList { for (index in 0 until length()) add(optString(index)) }
    }
}
