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
for(const key of ['accountDeleteEndpoint','accountExportEndpoint','analyticsEndpoint','telemetryErrorEndpoint'])assert.match(services,new RegExp(`${key}:null`),`${key} must remain activation-gated before deployment smoke`);
assert.match(services,/serverReadinessVersion:'server-readiness-stage0-v1'/);
assert.match(doc,/Production activation remains a separate explicit release decision/);
assert.doesNotMatch(services,/GARANG_LLM_API_KEY\s*[:=]\s*['"][^'"]+/,'browser config must never contain provider secrets');
console.log('server-readiness-stage0: PASS');
