'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json'),manifest=require('../runtime-manifest.json');
const versionJs=fs.readFileSync(path.join(root,'07_config/version.js'),'utf8'),app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');
assert.equal(pkg.version,manifest.version);
assert.ok(versionJs.includes(`version:'${pkg.version}'`),`version.js must use ${pkg.version}`);
assert.ok(app.includes(`<span>Version</span><b>${pkg.version}</b>`),`Settings UI must display ${pkg.version}`);
console.log('version-ui-contract: PASS');
