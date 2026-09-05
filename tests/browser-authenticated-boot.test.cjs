'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8766;
const baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}
  throw new Error('built GARANG auth test server did not start');
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
  let browser;
  try{
    await waitForServer();
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage();
    await page.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked by init script */'}));
    await page.addInitScript(()=>{
      const remote={
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z',syncOwnerUid:'mock-user',syncRevision:1},
        profile:{name:'Authenticated Regression',goal:'퍼포먼스 향상',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[],deletedIds:[]},actionLog:[],errors:[],analytics:{events:[]},plan:'FREE',clientUpdatedAt:'2026-09-06T00:00:00.000Z'
      };
      const user={uid:'mock-user',displayName:'Authenticated Regression',email:'regression@example.com',updateProfile:async()=>{}};
      let db;
      class DocRef{
        constructor(path){this.path=path;this.id=path.split('/').pop();this.firestore=db;}
        collection(name){return new CollectionRef(`${this.path}/${name}`);}
        async get(){
          if(this.path==='users/mock-user/app/state')return {exists:true,id:this.id,ref:this,metadata:{},data:()=>structuredClone(remote),get:f=>remote[f]};
          return {exists:false,id:this.id,ref:this,metadata:{},data:()=>null,get:()=>undefined};
        }
        async set(){return undefined;}
      }
      class CollectionRef{constructor(path){this.path=path;}doc(id){return new DocRef(`${this.path}/${id}`);}}
      db={collection:name=>new CollectionRef(name),runTransaction:async fn=>fn({get:ref=>ref.get(),set:()=>{}})};
      const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),20);return ()=>{};},signOut:async()=>{auth.currentUser=null;}};
      function firestore(){return db;}
      firestore.FieldValue={serverTimestamp:()=> 'mock-server-time'};
      function authFn(){return auth;}
      authFn.GoogleAuthProvider=function(){};authFn.OAuthProvider=function(){};
      window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
    });

    const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e?.message||e)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:10000});
    await page.waitForFunction(()=>document.getElementById('main')?.innerText?.trim().length>0,{timeout:10000});
    await page.waitForTimeout(1800);

    assert.equal(await page.locator('#authView').isHidden(),true,'auth screen must be hidden after authenticated callback');
    assert.equal(await page.locator('#appView').isVisible(),true,'app must remain visible after authenticated cloud load');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')||'null'));
    assert.ok(saved&&saved.profile?.name==='Authenticated Regression','authenticated user state must load and persist');

    for(const route of ['today','coach','workout','body','progress']){
      await page.locator(`#bottomNav button[data-page="${route}"]`).click();
      await page.waitForFunction(r=>document.querySelector(`#bottomNav button[data-page="${r}"]`)?.classList.contains('active'),route);
      assert.ok((await page.locator('#main').innerText()).trim().length>0,`${route} must render after authenticated boot`);
    }
    await page.locator('#settingsTopBtn').click();
    await page.waitForFunction(()=>/설정|SETTING/i.test(document.getElementById('main')?.innerText||''));
    assert.deepEqual(pageErrors,[],`authenticated browser runtime errors:\n${pageErrors.join('\n')}`);
    console.log('browser-authenticated-boot: PASS');
  } finally {
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
