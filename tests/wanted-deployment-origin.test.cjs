'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

(async()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../07_config/version.js'),'utf8');
  const appended=[];
  let fetched=null;
  let nativeObserver=null;

  class FakeNativeMutationObserver{
    constructor(callback){this.callback=callback;nativeObserver=this;}
    observe(target,options){this.target=target;this.options=options;}
    disconnect(){}
    takeRecords(){return [];}
  }

  const sandbox={
    URL,
    console,
    MutationObserver:FakeNativeMutationObserver,
    fetch:(input,init)=>{fetched={input,init};return Promise.resolve({ok:true});},
    document:{
      documentElement:{dataset:{}},
      currentScript:{src:'https://cdn.example.test/garang/frozen/07_config/version.js?v=1'},
      baseURI:'https://shell.example.test/',
      createElement(tag){
        const listeners={};
        return {
          tag,
          listeners,
          addEventListener(type,callback){listeners[type]=callback;}
        };
      },
      head:{appendChild(node){appended.push(node);}}
    }
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'version.js'});

  assert.equal(sandbox.GARANG_WANTED_ASSET_ROOT,'https://cdn.example.test/garang/frozen/');
  assert.equal(appended.length,3);
  assert.equal(appended[0].href,'https://cdn.example.test/garang/frozen/03_styles/runtime/garang-wanted-submission-v1.css?v=1.0.0');
  assert.equal(appended[1].href,'https://cdn.example.test/garang/frozen/03_styles/runtime/garang-wanted-ux-fixes-v1.css?v=1.0.0');
  assert.equal(appended[2].src,'https://cdn.example.test/garang/frozen/06_features/ui/runtime/garang-wanted-submission-v1.js?v=1.0.1');

  await sandbox.fetch('./04_data/wanted/wanted-14day-synthetic-v1.json',{cache:'no-store'});
  assert.equal(fetched.input,'https://cdn.example.test/garang/frozen/04_data/wanted/wanted-14day-synthetic-v1.json');
  assert.equal(fetched.init.cache,'no-store');

  await sandbox.fetch('./04_data/knowledge/food-db.json');
  assert.equal(fetched.input,'./04_data/knowledge/food-db.json','unrelated runtime fetches must remain untouched');

  const SafeObserver=sandbox.MutationObserver;
  assert.notEqual(SafeObserver,FakeNativeMutationObserver,'Wanted loader should temporarily wrap MutationObserver');
  let calls=0;
  const observer=new SafeObserver(()=>{calls++;});
  const target={hasAttribute:()=>true};
  observer.observe(target,{attributes:true,attributeFilter:['hidden']});
  assert.equal(nativeObserver.options.attributeOldValue,true,'observer wrapper must request old attribute value');

  nativeObserver.callback([{type:'attributes',attributeName:'hidden',oldValue:'',target}]);
  assert.equal(calls,0,'redundant hidden=true writes must not recursively trigger judge rendering');

  nativeObserver.callback([{type:'attributes',attributeName:'hidden',oldValue:null,target}]);
  assert.equal(calls,1,'real hidden state changes must still reach judge rendering');

  appended[2].listeners.load?.();
  assert.equal(sandbox.MutationObserver,FakeNativeMutationObserver,'global MutationObserver must be restored after Wanted script loads');
  assert.equal(appended.length,5,'Wanted UX and Real AI presentation scripts should load after the core judge runtime');
  assert.equal(appended[3].src,'https://cdn.example.test/garang/frozen/06_features/ui/runtime/garang-wanted-ux-fixes-v1.js?v=1.0.0');
  assert.equal(appended[4].src,'https://cdn.example.test/garang/frozen/06_features/ui/runtime/garang-wanted-real-llm-v1.js?v=1.0.0');

  console.log('Wanted deployment-origin, observer and extra asset compatibility: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
