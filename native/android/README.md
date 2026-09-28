# GARANG Android Health Connect Host v1

Additive Android host for the existing GARANG web app. It keeps the same `window.GarangNativeHealthBridge` contract as iOS.

Health Connect SDK: `androidx.health.connect:connect-client:1.1.0` stable.

Read: HRV RMSSD, resting heart rate, sleep duration, steps, exercise time.
Write: explicit strength workout session sync.

Permissions are requested only from the explicit GARANG Health sync action. Native code does not own Firebase/Firestore or canonical GARANG state. Provider records return to the existing web importer, which remains the canonical `state.physiologicalSignals` owner. Stress and sleep score are not fabricated.

Real-device Health Connect ingestion remains unverified until an Android device demonstrates permission, non-empty reads, canonical persistence, and Recovery/Coach consumption.
