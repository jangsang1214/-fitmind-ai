'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const tests=path.join(root,'tests');
const files=fs.readdirSync(tests).filter(name=>/^browser.*\.cjs$/.test(name));
const pattern=/spawn\(\s*['"]python3['"]\s*,\s*\[\s*['"]-m['"]\s*,\s*['"]http\.server['"]\s*,\s*String\(port\)\s*,\s*['"]--bind['"]\s*,\s*['"]127\.0\.0\.1['"]\s*\]\s*,\s*\{\s*cwd\s*:\s*serveRoot\s*,\s*stdio\s*:\s*['"]ignore['"]\s*\}\s*\)/g;
const helper="const {startStaticServer}=require('./helpers/static-server.cjs');\n";
let changed=0;
for(const file of files){
  const full=path.join(tests,file);
  let source=fs.readFileSync(full,'utf8');
  if(!pattern.test(source)){pattern.lastIndex=0;continue;}
  pattern.lastIndex=0;
  if(!source.includes("require('./helpers/static-server.cjs')")){
    const marker="'use strict';\n";
    if(!source.startsWith(marker))throw new Error(`${file}: expected strict-mode header`);
    source=source.replace(marker,marker+helper);
  }
  source=source.replace(pattern,'startStaticServer(serveRoot,port)');
  fs.writeFileSync(full,source);
  changed++;
}
const leftovers=[];
for(const file of files){
  const source=fs.readFileSync(path.join(tests,file),'utf8');
  if(/spawn\(\s*['"]python3?['"]/.test(source)||/http\.server/.test(source))leftovers.push(file);
}
if(leftovers.length)throw new Error(`browser server migration incomplete: ${leftovers.join(', ')}`);
if(changed<1)throw new Error('browser server migration changed no files');
console.log(`browser server migration: PASS (${changed} files)`);
