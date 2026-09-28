const assert=require('node:assert/strict');
const fs=require('node:fs');

const bridge=fs.readFileSync('native/ios/GARANGNativeHost/GARANGHealthBridge.swift','utf8');
const web=fs.readFileSync('native/ios/GARANGNativeHost/GARANGWebView.swift','utf8');
const plist=fs.readFileSync('native/ios/GARANGNativeHost/Info.plist','utf8');
const entitlements=fs.readFileSync('native/ios/GARANGNativeHost/GARANGNativeHost.entitlements','utf8');
const project=fs.readFileSync('native/ios/GARANGNativeHost.xcodeproj/project.pbxproj','utf8');

assert.match(bridge,/window\.GarangNativeHealthBridge/);
assert.match(bridge,/requestAuthorization\(scopes\)/);
assert.match(bridge,/syncWorkouts\(workouts\)/);
assert.match(bridge,/readHealthSignals\(request\)/);
assert.match(bridge,/heartRateVariabilitySDNN/);
assert.match(bridge,/restingHeartRate/);
assert.match(bridge,/sleepAnalysis/);
assert.match(bridge,/stepCount/);
assert.match(bridge,/appleExerciseTime/);
assert.doesNotMatch(bridge,/stressScore\s*[:=]/i,'native host must not fabricate HealthKit stress');
assert.doesNotMatch(bridge,/sleepScore\s*[:=]/i,'native host must not fabricate HealthKit sleep score');
assert.match(bridge,/requestAuthorization\(toShare: share, read: read\)/);
assert.match(bridge,/HKMetadataKeyWorkoutBrandName: "GARANG"/);
assert.match(web,/WKUserScript/);
assert.match(web,/injectionTime: \.atDocumentStart/);
assert.match(plist,/NSHealthShareUsageDescription/);
assert.match(plist,/NSHealthUpdateUsageDescription/);
assert.match(entitlements,/com\.apple\.developer\.healthkit/);
assert.match(project,/PRODUCT_BUNDLE_IDENTIFIER = com\.garang\.nativehost/);
assert.match(project,/IPHONEOS_DEPLOYMENT_TARGET = 17\.0/);
assert.doesNotMatch(bridge,/Firebase|Firestore|firebase/i,'native host must not own cloud persistence');

console.log('native-health-ios-host-v1: PASS');
