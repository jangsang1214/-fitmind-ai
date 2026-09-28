# GARANG iOS HealthKit Host v1

Additive iOS host for the existing GARANG web application. It does not replace the PWA or change web data ownership.

## Bridge
The host injects `window.GarangNativeHealthBridge`:
- `requestAuthorization(scopes)`
- `syncWorkouts(workouts)`
- `readHealthSignals({ since, metrics })`

HealthKit read support: HRV (SDNN), resting heart rate, sleep duration, steps, Apple exercise time.
Explicit workout write is supported. Stress score and sleep score are not fabricated.

## Safety
- Permission UI only follows the user's explicit Health sync action.
- No page-load/background permission request.
- Native code does not write Firebase or application state.
- Existing web runtime remains the single owner of canonical `state.physiologicalSignals`.
- Real-device HealthKit ingestion is not VERIFIED until an iPhone demonstrates authorization, non-empty provider reads, canonical persistence, and Recovery/Coach consumption.

## Build
```sh
xcodebuild -project native/ios/GARANGNativeHost.xcodeproj -scheme GARANGNativeHost -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```
