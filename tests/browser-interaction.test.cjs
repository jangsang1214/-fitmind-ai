'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8765,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('built GARANG server did not start');}
const dirtyState=()=>({
  meta:{schemaVersion:5,updatedAt:'2026-10-13T00:00:00.000Z'},profile:{name:'Regression User',goal:'퍼포먼스 향상',weight:70,calorieTarget:2400,proteinTarget:150,carbTarget:280,fatTarget:70},
  onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},
  workouts:[null,'bad',{id:'w-safe',date:'2026-10-13',name:'스쿼트',weight:80,reps:5,sets:3,updatedAt:'2026-10-13T00:00:00.000Z'}],
  meals:[null,{id:'m-safe',date:'2026-10-13',name:'아침',kcal:500,protein:35,carbs:55,fat:14,items:[null,{id:'food-safe',name:'계란',grams:100,kcal:150,protein:13,carbs:1,fat:10}],updatedAt:'2026-10-13T00:00:00.000Z'}],
  checkins:[null,{id:'c-safe',date:'2026-10-13',sleep:7,energy:3,stress:2,soreness:2,updatedAt:'2026-10-13T00:00:00.000Z'}],
  dailyCheckins:[],physiologicalSignals:[],runs:[null],body:[null],planner:[null],aiChat:[null],actionLog:[null],errors:[null],memory:null,analytics:null,plan:'FREE'
});
async function assertOwnsPoint(locator,label){await locator.waitFor({state:'visible',timeout:5000});await locator.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));const ok=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===el||el.contains(hit));});assert.equal(ok,true,`${label} must own its physical touch point`);}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await chromium.launch({headless:true});
    for(const mode of [{name:'desktop',viewport:{width:1280,height:900},touch:false},{name:'mobile',viewport:{width:390,height:844},touch:true}]){
      const context=await browser.newContext({viewport:mode.viewport,isMobile:mode.touch,hasTouch:mode.touch});
      await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked by init script */'}));
      await context.addInitScript(state=>{
        localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(state));
        const user={uid:'mock-user',displayName:'Regression User',email:'regression@example.com',updateProfile:async()=>{},getIdToken:async()=> 'mock-id-token'};let db;
        class DocRef{constructor(path){this.path=path;this.id=path.split('/').pop();this.firestore=db;}collection(name){return new CollectionRef(`${this.path}/${name}`);}async get(){return {exists:false,id:this.id,ref:this,metadata:{},data:()=>null,get:()=>undefined};}async set(){return undefined;}}
        class CollectionRef{constructor(path){this.path=path;}doc(id){return new DocRef(`${this.path}/${id}`);}}
        db={collection:name=>new CollectionRef(name),runTransaction:async fn=>fn({get:ref=>ref.get(),set:()=>{}})};
        const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),20);return ()=>{};},signOut:async()=>{auth.currentUser=null;}};
        function firestore(){return db;}firestore.FieldValue={serverTimestamp:()=> 'mock-server-time'};function authFn(){return auth;}authFn.GoogleAuthProvider=function(){};authFn.OAuthProvider=function(){};
        window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
      },dirtyState());
      const page=await context.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e?.message||e)));
      await page.goto(`${baseURL}/?mode=${mode.name}`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
      await page.waitForFunction(()=>window.GarangGoldenMasterV1?.version==='garang-golden-master-v1.0.0'&&document.getElementById('garangGoldenMaster'),null,{timeout:10000});

      const repaired=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')));
      assert.equal(repaired.workouts.length,1,`${mode.name}: malformed workouts must be removed`);
      assert.equal(repaired.meals.length,1);assert.equal(repaired.meals[0].items.length,1);assert.equal(repaired.checkins.length,1);
      assert.ok(repaired.memory&&Array.isArray(repaired.memory.entries));assert.ok(repaired.analytics&&Array.isArray(repaired.analytics.events));

      assert.equal(await page.locator('#garangGoldenNav .gm-nav').count(),1,`${mode.name}: Golden Master must own primary navigation`);
      assert.equal(await page.locator('#bottomNav').getAttribute('data-gm-canonical'),'hidden',`${mode.name}: canonical nav stays internal as routing owner`);
      for(const surface of ['home','recovery','training','nutrition','coach']){
        const nav=page.locator(`[data-gm-nav="${surface}"]`);await assertOwnsPoint(nav,`${mode.name}: ${surface}`);
        if(mode.touch){const box=await nav.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else await nav.click();
        await page.waitForFunction(s=>document.getElementById('main')?.dataset?.goldenSurface===s,surface,{timeout:5000});
        assert.equal(await page.locator(`[data-gm-nav="${surface}"]`).getAttribute('class'),'active',`${mode.name}: ${surface} nav must be active`);
        assert.ok((await page.locator('#garangGoldenMaster').innerText()).trim().length>0,`${mode.name}: ${surface} must render content`);
      }

      await page.locator('[data-gm-nav="nutrition"]').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='nutrition');
      await assertOwnsPoint(page.locator('[data-gm-meal-scan]'),`${mode.name}: Meal Scan add`);
      assert.equal(await page.locator('[data-gm-meal-scan]').getAttribute('aria-label'),'Add meal');

      await page.locator('[data-gm-nav="coach"]').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='coach');
      const ask=page.locator('[data-gm-coach-form] input');await assertOwnsPoint(ask,`${mode.name}: Coach composer`);await ask.fill('오늘 운동 강도를 알려줘');assert.equal(await ask.inputValue(),'오늘 운동 강도를 알려줘');

      await page.locator('[data-gm-nav="home"]').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='home');
      await assertOwnsPoint(page.locator('.gm-home [data-gm-open="training"]'),`${mode.name}: Home training row`);
      assert.deepEqual(pageErrors,[],`${mode.name} browser runtime errors:\n${pageErrors.join('\n')}`);
      await context.close();
    }
    console.log('Browser interaction verification passed for Golden Master desktop and mobile surfaces.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
