'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8766,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('built GARANG auth test server did not start');}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
    await page.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked by init script */'}));
    await page.addInitScript(()=>{
      const remote={
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z',syncOwnerUid:'mock-user',syncRevision:1},profile:{name:'Authenticated Regression',goal:'퍼포먼스 향상',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},
        workouts:[null,{id:'w-cloud',date:'2026-09-06',name:'스쿼트',weight:80,reps:5,sets:3}],
        meals:[null,{id:'m-cloud',date:'2026-09-06',name:'아침',items:[null,{id:'f-cloud',name:'계란',grams:100,kcal:150,protein:13,carbs:1,fat:10}]}],
        runs:[null],body:[null],planner:[null],checkins:[null,{id:'c-cloud',date:'2026-09-06',sleep:7,energy:3,stress:2,soreness:2}],aiChat:[null],memory:null,actionLog:[null],errors:[null],analytics:null,plan:'FREE',clientUpdatedAt:'2026-09-06T00:00:00.000Z'
      };
      const user={uid:'mock-user',displayName:'Authenticated Regression',email:'regression@example.com',updateProfile:async()=>{}};let db;
      class DocRef{constructor(path){this.path=path;this.id=path.split('/').pop();this.firestore=db;}collection(name){return new CollectionRef(`${this.path}/${name}`);}async get(){if(this.path==='users/mock-user/app/state')return {exists:true,id:this.id,ref:this,metadata:{},data:()=>structuredClone(remote),get:f=>remote[f]};return {exists:false,id:this.id,ref:this,metadata:{},data:()=>null,get:()=>undefined};}async set(){return undefined;}}
      class CollectionRef{constructor(path){this.path=path;}doc(id){return new DocRef(`${this.path}/${id}`);}}
      db={collection:name=>new CollectionRef(name),runTransaction:async fn=>fn({get:ref=>ref.get(),set:()=>{}})};
      const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),20);return ()=>{};},signOut:async()=>{auth.currentUser=null;}};
      function firestore(){return db;}firestore.FieldValue={serverTimestamp:()=> 'mock-server-time'};function authFn(){return auth;}authFn.GoogleAuthProvider=function(){};authFn.OAuthProvider=function(){};
      window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
    });
    const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e?.message||e)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:10000});await page.waitForFunction(()=>document.getElementById('main')?.innerText?.trim().length>0,{timeout:10000});
    await page.locator('[data-today-view="front"]').waitFor({state:'visible',timeout:7000});await page.locator('[data-today-view="back"]').waitFor({state:'visible',timeout:7000});await page.locator('#menuBtn').waitFor({state:'visible',timeout:5000});
    assert.equal(await page.locator('#authView').isHidden(),true);assert.equal(await page.locator('#appView').isVisible(),true);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')||'null'));
    assert.ok(saved&&saved.profile?.name==='Authenticated Regression','authenticated state must persist');
    assert.equal(saved.workouts.length,1);assert.equal(saved.meals.length,1);assert.equal(saved.meals[0].items.length,1);assert.equal(saved.checkins.length,1);
    assert.ok(saved.memory&&Array.isArray(saved.memory.entries));assert.ok(saved.analytics&&Array.isArray(saved.analytics.events));
    await page.locator('[data-today-view="back"]').click();await page.waitForFunction(()=>document.querySelector('[data-today-view="back"]')?.classList.contains('active'));

    for(const route of ['today','coach','progress']){
      await page.locator(`#bottomNav [data-garang-primary-nav="1"][data-page="${route}"]`).click();
      await page.waitForFunction(r=>document.getElementById('main')?.dataset?.garangScreen===r,route,{timeout:5000});
      assert.ok((await page.locator('#main').innerText()).trim().length>0,`${route} must render after authenticated boot`);
    }

    const preservedRoutes=[['workout','#saveWorkoutSession'],['body','#saveBody']];
    for(const [route,selector] of preservedRoutes){
      const moved=await page.evaluate(r=>window.GarangRouter?.navigate?.(r,{source:'authenticated-boot-test',force:true}),route);
      assert.equal(moved,true,`${route} must remain routable after authenticated boot`);
      await page.waitForFunction(r=>document.getElementById('main')?.dataset?.garangScreen===r,route,{timeout:5000});
      assert.equal(await page.locator(selector).count(),1,`${route} capability must remain rendered after authenticated boot`);
      assert.equal(await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').getAttribute('aria-current'),'page',`${route} must belong to the Record primary axis`);
    }

    assert.deepEqual(pageErrors,[],`authenticated browser runtime errors:\n${pageErrors.join('\n')}`);console.log('browser-authenticated malformed-cloud boot: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
