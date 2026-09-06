'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8767;
const baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('built GARANG Firebase fallback test server did not start');
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
  let browser;
  try{
    await waitForServer();
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(String(error?.stack||error?.message||error)));

    // Reproduce the production symptom: every primary gstatic Firebase SDK request fails.
    await page.route('https://www.gstatic.com/firebasejs/**',route=>route.abort('failed'));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});

    await page.waitForFunction(()=>!!window.firebase &&
      Array.isArray(window.firebase.apps) && window.firebase.apps.length>0 &&
      typeof window.firebase.auth==='function' &&
      typeof window.firebase.firestore==='function',
      {timeout:15000});

    const diagnostic=await page.evaluate(()=>({
      projectId:window.firebase.app().options.projectId,
      authDomain:window.firebase.app().options.authDomain,
      fallbacks:window.GARANG_FIREBASE_BOOT?.fallbacks||[],
      sdkReady:window.GARANG_FIREBASE_BOOT?.sdkReady===true,
      authVisible:!!document.getElementById('authView')&&!document.getElementById('authView').hidden,
      toast:document.getElementById('toast')?.textContent||''
    }));

    assert.equal(diagnostic.projectId,'fitfind-ai');
    assert.equal(diagnostic.authDomain,'fitfind-ai.firebaseapp.com');
    assert.deepEqual(diagnostic.fallbacks.sort(),[
      'firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'
    ].sort(),'all three missing primary Firebase components must fall back');
    assert.equal(diagnostic.sdkReady,true,'Firebase fallback bootstrap must finish before app boot');
    assert.equal(diagnostic.authVisible,true,'normal authenticated entry screen must remain available');
    assert.equal(/Firebase 설정을 확인/.test(diagnostic.toast),false,'fallback boot must not report Firebase configuration failure');
    assert.deepEqual(pageErrors,[],`Firebase fallback browser errors:\n${pageErrors.join('\n')}`);

    console.log('browser Firebase gstatic-failure -> jsDelivr fallback: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
