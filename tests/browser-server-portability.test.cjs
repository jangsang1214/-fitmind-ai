'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const dir=__dirname;
const root=path.resolve(dir,'..');
const files=fs.readdirSync(dir).filter(name=>/^browser.*\.cjs$/.test(name)&&name!==path.basename(__filename));
assert.ok(files.length>=10,'expected GARANG browser regression inventory');
for(const file of files){
  const source=fs.readFileSync(path.join(dir,file),'utf8');
  assert.equal(/spawn\(\s*['"]python3?['"]/.test(source),false,`${file} must not spawn Python for its test server`);
  assert.equal(/http\.server/.test(source),false,`${file} must not depend on Python http.server`);
}
const helper=require('./helpers/static-server.cjs');
assert.equal(typeof helper.startStaticServer,'function','shared Node static server must be available');

const workflow=fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');
assert.match(workflow,/image:\s*mcr\.microsoft\.com\/playwright:v1\.55\.0-noble/,'browser CI must use the Playwright image matching the locked package version');
assert.match(workflow,/PLAYWRIGHT_BROWSERS_PATH:\s*\/ms-playwright/,'browser CI must use the image-provided browser path');
assert.equal(/npx playwright install-deps/.test(workflow),false,'browser CI must not depend on mutable apt-based Playwright install-deps');
assert.equal(/npx playwright install chromium webkit/.test(workflow),false,'browser CI must not redownload browsers outside the pinned image');

console.log(`browser server/runner portability: PASS (${files.length} browser files)`);
