'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('runtime-manifest.json')),index=read('index.html'),services=read('07_config/garang-services-config.js'),privacy=read('06_features/ui/runtime/garang-privacy-security-v1.js'),functionsIndex=read('functions/index.js'),doc=read('09_docs/SERVER_READINESS_STAGE0.md');

assert.ok(manifest.scripts.includes('02_core/repository-boundary-v1.js'));
assert.match(index,/repository-boundary-v1\.js/);
assert.match(privacy,/GarangRepositories/);
assert.match(functionsIndex,/server-state-boundary\.cjs/);
assert.match(functionsIndex,/\/account\/export/);
assert.match(functionsIndex,/\/account\/delete/);
assert.match(functionsIndex,/\/analytics\/events/);
assert.match(functionsIndex,/\/telemetry\/errors/);
assert.match(functionsIndex,/securityMiddleware/);
assert.match(services,/const stagingProjectId='garang-staging'/);
assert.match(services,/const privilegedStagingEnabled=selectedProjectId===stagingProjectId/);
for(const [key,pathSuffix] of [['accountDeleteEndpoint','account/delete'],['analyticsEndpoint','analytics/events'],['telemetryErrorEndpoint','telemetry/errors']]){
 assert.match(services,new RegExp(`${key}:\x60\\$\\{apiBase\\}/${pathSuffix.replace('/','\\/') }\x60`),`${key} must be explicitly wired to the authenticated production API`);
}
assert.match(services,/accountExportEndpoint:`\$\{apiBase\}\/account\/export`/,'authenticated read-only account export must be available in production');
assert.match(services,/serverReadinessVersion:'server-readiness-stage0-v1'/);
assert.match(doc,/Production activation remains a separate explicit release decision/);
assert.doesNotMatch(services,/GARANG_LLM_API_KEY\s*[:=]\s*['"][^'"]+/,'browser config must never contain provider secrets');
console.log('server-readiness-stage0 authenticated export + staging privileged boundary: PASS');
