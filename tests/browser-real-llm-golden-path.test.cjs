'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8765,baseURL=`http://127.0.0.1:${port}`;
const endpoint='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach';
const watchdog=setTimeout(()=>{console.error('browser-real-llm-golden-path: WATCHDOG TIMEOUT');process.exit(1);},70000);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){for(let i=0;i<80;i++){try{if((await fetch(baseURL)).ok)return;}catch{}await sleep(150);}throw new Error('server start timeout');}
async function tap(page,selector,label=selector){const loc=page.locator(selector).first();await loc.waitFor({state:'visible',timeout:7000});await loc.scrollIntoViewIfNeeded();const box=await loc.boundingBox();assert.ok(box,`${label}: no box`);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked */'}));
  await context.addInitScript(({coachEndpoint})=>{
   const nativeFetch=window.fetch.bind(window),gatewayCalls=[];
   window.__GARANG_TEST_GATEWAY_CALLS__=gatewayCalls;
   window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input?.url,method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url!==coachEndpoint||method!=='POST')return nativeFetch(input,init);
    const headers=Object.fromEntries(new Headers(init.headers||{}).entries()),body=JSON.parse(init.body||'{}');
    gatewayCalls.push({url,headers,body});
    const planIntent=/계획|plan/i.test(String(body.message||'')),answer=planIntent?'SERVER PLAN: 요청한 오늘 계획을 GARANG 서버에서 반영했습니다.':'REAL LLM: 최근 훈련량은 있지만 오늘 회복과 수면 신호가 낮아 강도를 낮추는 편이 좋습니다.';
    const toolResults=planIntent?[{name:'createPlan',callId:'server-plan-1',status:'executed',code:null,executed:true,duplicate:false,targetId:'plan-server-1'}]:[];
    return new Response(JSON.stringify({ok:true,answer,data:{answer,decisionSummary:'GARANG은 오늘 강도 감소를 권장합니다.',reasoningSummary:'낮은 수면과 에너지 신호를 우선 반영했습니다.',suggestedNextStep:'오늘 계획의 운동 볼륨을 조정하세요.',confidence:.86,source:'llm',requestId:planIntent?'req-server-plan':'req-analysis',toolResults,metadata:{provider:'mock-openai',model:'gpt-test'},garangDecision:{mode:'reduce',reasonCodes:['SHORT_SLEEP','LOW_ENERGY']}}}),{status:200,headers:{'Content-Type':'application/json'}});
   };
   const date=new Date().toISOString().slice(0,10),remote={meta:{schemaVersion:5,updatedAt:new Date().toISOString(),syncOwnerUid:'llm-user'},profile:{name:'LLM User',age:29,height:175,weight:75,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',weeklyFrequency:4,availableMinutes:50},preferences:{language:'ko',unit:'metric'},checkins:[{id:'ci1',date,sleep:5.5,energy:2,stress:3,soreness:3,availableMinutes:50}],dailyCheckins:[],planner:[],workouts:[{id:'w1',date,name:'벤치프레스',weight:80,reps:5,sets:5,duration:45}],meals:[{id:'m1',date,name:'아침',kcal:550,protein:35}],runs:[],body:[{id:'b1',date,weight:75}],aiChat:[],memory:{entries:[{id:'mem1',type:'preference',key:'training_time',value:'evening',userConfirmed:true,confidence:.9,importance:4}],facts:[],preferences:[],goals:[],events:[]},actionLog:[],errors:[],analytics:{events:[]},plan:'FREE'};
   localStorage.removeItem('garang_demo');
   const user={uid:'llm-user',displayName:'LLM User',email:'llm@example.com',getIdToken:async()=> 'firebase-id-token-llm-user',updateProfile:async()=>{}};let db;
   class DocRef{constructor(p){this.path=p;this.id=p.split('/').pop();this.firestore=db;}collection(n){return new CollectionRef(`${this.path}/${n}`);}async get(){if(this.path==='users/llm-user/app/state')return {exists:true,id:this.id,ref:this,metadata:{},data:()=>structuredClone(remote),get:k=>remote[k]};return {exists:false,id:this.id,ref:this,metadata:{},data:()=>null,get:()=>undefined};}async set(data){if(this.path==='users/llm-user/app/state')Object.assign(remote,structuredClone(data||{}));}async delete(){}}
   class CollectionRef{constructor(p){this.path=p;}doc(id){return new DocRef(`${this.path}/${id}`);}orderBy(){return this;}startAfter(){return this;}limit(){return this;}async get(){return {docs:[]};}}
   db={collection:n=>new CollectionRef(n),batch:()=>({set(){},delete(){},commit:async()=>{}}),runTransaction:async fn=>fn({get:r=>r.get(),set:()=>{}})};
   const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),10);return()=>{};},signOut:async()=>{auth.currentUser=null;}};function authFn(){return auth;}authFn.GoogleAuthProvider=function(){};authFn.OAuthProvider=function(){};function firestore(){return db;}firestore.FieldValue={serverTimestamp:()=>new Date().toISOString()};firestore.FieldPath={documentId:()=>'__name__'};window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
  },{coachEndpoint:endpoint});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await tap(page,'#bottomNav button[data-page="coach"]','open Coach');
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach'&&document.querySelector('.garang-coach-v2')&&document.querySelector('.g2-composer textarea')&&document.querySelector('.gcl-context-actions [data-gcl-coach="0"]'),null,{timeout:10000});
  assert.equal(await page.locator('.garang-coach-v2').count(),1,'decision-first Coach root must remain present');
  assert.equal(await page.locator('.gcl-context-actions [data-gcl-actions-toggle]').count(),1,'decision-first Coach next-action disclosure must remain present');
  const transport=await page.evaluate(()=>({endpoint:window.GARANG_SERVICES?.coachEndpoint||null,transport:window.__GARANG_COACH_GATEWAY_TRANSPORT_V1__?.version||null,uid:window.firebase?.auth?.().currentUser?.uid||null,getIdToken:typeof window.firebase?.auth?.().currentUser?.getIdToken}));
  assert.equal(transport.endpoint,endpoint,'Coach must retain the production Functions endpoint');assert.equal(transport.transport,'garang-coach-gateway-transport-v1.1.1');assert.equal(transport.uid,'llm-user');assert.equal(transport.getIdToken,'function');
  const beforeAssistant=await page.locator('.g2-message.assistant:not([data-thinking="1"]) .g2-message-text').count();
  const input=page.locator('.g2-composer textarea');await input.fill('오늘 벤치 세게 해도 돼?');await tap(page,'.g2-send','send real LLM question');
  await page.waitForFunction(before=>document.querySelectorAll('.g2-message.assistant:not([data-thinking="1"]) .g2-message-text').length>before,beforeAssistant,{timeout:9000});
  const latestAssistant=String(await page.locator('.g2-message.assistant:not([data-thinking="1"]) .g2-message-text').last().textContent()||'');
  const result=await page.evaluate(()=>({calls:structuredClone(window.__GARANG_TEST_GATEWAY_CALLS__||[]),diag:structuredClone(window.__GARANG_COACH_GATEWAY_TRANSPORT_V1__?.diagnostics||null)})),gatewayCalls=result.calls;
  assert.equal(gatewayCalls.length>=1,true,`authenticated Coach must call the real gateway transport; assistant=${latestAssistant}; transport=${JSON.stringify(transport)}; gatewayDiag=${JSON.stringify(result.diag)}`);assert.match(latestAssistant,/REAL LLM:/,`successful gateway response must be rendered as the Coach answer; assistant=${latestAssistant}`);
  const first=gatewayCalls[0];assert.equal(first.url,endpoint);assert.match(first.headers.authorization||'',/^Bearer firebase-id-token-llm-user$/);assert.deepEqual(Object.keys(first.body).sort(),['language','message']);assert.equal(first.body.message,'오늘 벤치 세게 해도 돼?');assert.equal('context' in first.body,false);
  let state=await page.evaluate(()=>window.GarangAgentStateBridge.getState());assert.equal(state.planner.length,0,'LLM explanation alone must never mutate Planner');
  const beforePlanAssistant=await page.locator('.g2-message.assistant:not([data-thinking="1"]) .g2-message-text').count();
  await tap(page,'.gcl-context-actions [data-gcl-actions-toggle]','open Coach actions');await page.locator('.gcl-context-actions [data-gcl-actions-panel]').waitFor({state:'visible',timeout:2500});await tap(page,'.gcl-context-actions [data-gcl-actions-panel] [data-gcl-coach="0"]','request plan');
  await page.waitForFunction(before=>document.querySelectorAll('.g2-message.assistant:not([data-thinking="1"]) .g2-message-text').length>before,beforePlanAssistant,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.g2-message.assistant:not([data-thinking="1"]):last-of-type')?.dataset?.g4ActionOwner==='server',null,{timeout:8000}).catch(()=>{});
  const ownership=await page.evaluate(()=>{
    const assistants=[...document.querySelectorAll('.g2-message.assistant:not([data-thinking="1"])')],latestEl=assistants.at(-1);
    const key=Object.keys(localStorage).find(k=>k.startsWith('garang_coach_threads_v2::garang_user_llm-user_v3'));
    const store=key?JSON.parse(localStorage.getItem(key)||'null'):null,thread=store?.threads?.find(t=>t.id===store.activeId)||store?.threads?.[0],latest=(thread?.messages||[]).filter(m=>m.role==='assistant').at(-1)||null;
    return {owner:latestEl?.dataset?.g4ActionOwner||null,proposalCount:document.querySelectorAll('.g4-agent-proposal').length,latest,key};
  });
  assert.equal(ownership.owner,'server',`successful gateway response must mark the server as canonical action owner: ${JSON.stringify(ownership)}`);
  assert.equal(ownership.proposalCount,0,`server-owned plan action must not create a browser mock proposal: ${JSON.stringify(ownership)}`);
  assert.equal(ownership.latest?.actionOwner,'server');assert.equal(ownership.latest?.source,'llm');assert.equal(ownership.latest?.requestId,'req-server-plan');
  assert.equal(ownership.latest?.toolResults?.length,1);assert.equal(ownership.latest.toolResults[0].name,'createPlan');assert.equal(ownership.latest.toolResults[0].executed,true);assert.equal(ownership.latest.toolResults[0].targetId,'plan-server-1');
  const afterPlan=await page.evaluate(()=>({calls:structuredClone(window.__GARANG_TEST_GATEWAY_CALLS__||[]),state:window.GarangAgentStateBridge.getState()}));
  assert.ok(afterPlan.calls.length>=2,`plan request must use the authenticated gateway: ${JSON.stringify(afterPlan.calls)}`);assert.match(String(afterPlan.calls.at(-1)?.body?.message||''),/계획/);
  assert.equal(afterPlan.state.planner.length,0,'browser must not perform a second local Planner write after a server-owned createPlan result');
  assert.equal((afterPlan.state.actionLog||[]).some(row=>row.action==='daily_plan_draft_confirmed'),false,'server-owned createPlan must not be mirrored by the local confirmation path');
  assert.deepEqual(errors,[],`real LLM ownership browser errors:\n${errors.join('\n')}`);
  console.log('browser Real LLM -> server-owned action -> no duplicate browser proposal: PASS');
 }finally{clearTimeout(watchdog);if(browser)await browser.close().catch(()=>{});if(server.exitCode===null)server.kill('SIGTERM');}
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
