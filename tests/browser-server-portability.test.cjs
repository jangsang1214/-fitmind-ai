'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const dir=__dirname;
const files=fs.readdirSync(dir).filter(name=>/^browser.*\.cjs$/.test(name)&&name!==path.basename(__filename));
assert.ok(files.length>=10,'expected GARANG browser regression inventory');
for(const file of files){
  const source=fs.readFileSync(path.join(dir,file),'utf8');
  assert.equal(/spawn\(\s*['"]python3?['"]/.test(source),false,`${file} must not spawn Python for its test server`);
  assert.equal(/http\.server/.test(source),false,`${file} must not depend on Python http.server`);
}
const helper=require('./helpers/static-server.cjs');
assert.equal(typeof helper.startStaticServer,'function','shared Node static server must be available');
console.log(`browser server portability: PASS (${files.length} browser files)`);
