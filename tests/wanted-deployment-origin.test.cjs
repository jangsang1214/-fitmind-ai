'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

(async()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../07_config/version.js'),'utf8');
  const appended=[];
  let fetched=null;
  const sandbox={
    URL,
    console,
    fetch:(input,init)=>{fetched={input,init};return Promise.resolve({ok:true});},
    document:{
      documentElement:{dataset:{}},
      currentScript:{src:'https://cdn.example.test/garang/frozen/07_config/version.js?v=1'},
      baseURI:'https://shell.example.test/',
      createElement(tag){return {tag};},
      head:{appendChild(node){appended.push(node);}}
    }
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'version.js'});

  assert.equal(sandbox.GARANG_WANTED_ASSET_ROOT,'https://cdn.example.test/garang/frozen/');
  assert.equal(appended.length,2);
  assert.equal(appended[0].href,'https://cdn.example.test/garang/frozen/03_styles/runtime/garang-wanted-submission-v1.css?v=1.0.0');
  assert.equal(appended[1].src,'https://cdn.example.test/garang/frozen/06_features/ui/runtime/garang-wanted-submission-v1.js?v=1.0.0');

  await sandbox.fetch('./04_data/wanted/wanted-14day-synthetic-v1.json',{cache:'no-store'});
  assert.equal(fetched.input,'https://cdn.example.test/garang/frozen/04_data/wanted/wanted-14day-synthetic-v1.json');
  assert.equal(fetched.init.cache,'no-store');

  await sandbox.fetch('./04_data/knowledge/food-db.json');
  assert.equal(fetched.input,'./04_data/knowledge/food-db.json','unrelated runtime fetches must remain untouched');

  console.log('Wanted deployment-origin compatibility: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
