'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8787,baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-conversational-intelligence: WATCHDOG TIMEOUT');process.exit(1);},70000);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pad=n=>String(n).padStart(2,'0');
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await sleep(180);}throw new Error('conversational intelligence server did not start');}
async function tap(page,selector,label=selector){const loc=page.locator(selector).last();await loc.waitFor({state:'visible',timeout:7000});await loc.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));await page.waitForTimeout(35);const box=await loc.boundingBox();assert.ok(box,`${label}: missing touch box`);const hit=await loc.evaluate(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===el||el.contains(h));});assert.equal(hit,true,`${label}: does not own touch point`);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
async function sendCoach(page,text){const before=await page.locator('.g2-message.user[data-message-id]').count();const input=page.locator('.g2-composer textarea');await input.waitFor({state:'visible',timeout:7000});await input.fill(text);await tap(page,'.g2-send',`send ${text}`);await page.waitForFunction(({before,text})=>{const rows=[...document.querySelectorAll('.g2-message.user[data-message-id]')];return rows.length>before&&String(rows.at(-1)?.querySelector('.g2-message-text')?.textContent||'').includes(text);},{before,text},{timeout:7000});await page.waitForFunction(before=>document.querySelectorAll('.g2-message.assistant[data-message-id]').length>=before,Math.max(1,before),{timeout:7000}).catch(()=>{});}
function demoState(){const date=localDate(),confirmedAt=new Date(Date.now()-60_000).toISOString();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Conversation User',age:28,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},preferences:{language:'ko',unit:'metric'},checkins:[],dailyCheckins:[],planner:[{id:'p-training',date,type:'workout',domain:'training',title:'상체 근력 45분',status:'confirmed',completed:false,confirmedAt},{id:'p-recovery',date,type:'recovery',domain:'recovery',title:'스트레칭 15분',status:'confirmed',completed:false,confirmedAt},{id:'p-nutrition',date,type:'nutrition',domain:'nutrition',title:'단백질 포함 3끼',status:'confirmed',completed:false,confirmedAt}],workouts:[],meals:[],runs:[],body:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}

(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(payload=>{try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},demoState());
  const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));page.on('dialog',async dialog=>{dialogs.push(`${dialog.type()}:${dialog.message()}`);await dialog.dismiss().catch(()=>{});});
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await tap(page,'#bottomNav button[data-page="coach"]','open Coach');
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach'&&document.querySelector('.garang-coach-v2'),null,{timeout:10000});
  await page.waitForFunction(()=>window.GarangConversationalIntelligenceV1?.version==='garang-conversational-intelligence-v1.1.0',null,{timeout:7000});
  await page.waitForFunction(()=>window.GarangConversationalIntelligenceV1?.getKnowledge?.()?.version==='garang-coach-followup-kb-v1',null,{timeout:7000});
  assert.equal(await page.evaluate(date=>window.GarangPlanExecution.daily(window.GarangAgentStateBridge.getState(),date).plan.rate,localDate()),0,'three confirmed tracks must start unexecuted');

  await sendCoach(page,'나 오늘 운동했어');
  await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.gci-coach-turn[data-state="asking"] strong')];return cards.some(el=>/어떤 운동/.test(el.textContent||''));},null,{timeout:7000});
  let pending=await page.evaluate(()=>window.GarangConversationalIntelligenceV1.getPending());assert.equal(pending?.domain,'workout');assert.equal(pending?.expected,'activity');assert.ok(pending?.sourceIds?.includes('acsm-fitt-vp'),'workout follow-up must retain curated evidence provenance');

  await sendCoach(page,'등 했어. 랫풀다운이랑 시티드로우');
  await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.gci-coach-turn[data-state="asking"] strong')];return /세트/.test(cards.at(-1)?.textContent||'');},null,{timeout:7000});
  pending=await page.evaluate(()=>window.GarangConversationalIntelligenceV1.getPending());assert.equal(pending?.expected,'volume');assert.deepEqual((pending?.slots?.exercises||[]).sort(),['랫풀다운','시티드로우'].sort());

  await sendCoach(page,'각각 4세트');
  await page.waitForFunction(()=>document.querySelector('.gci-coach-turn[data-state="logged"] [data-gci-undo]'),null,{timeout:7000});
  const logged=await page.evaluate(()=>{const s=window.GarangAgentStateBridge?.getState?.()||{};return (s.workouts||[]).filter(row=>row?.source==='coach-conversation').at(-1)||null;});
  assert.ok(logged,'Coach conversation must write into the canonical workouts collection');assert.equal(logged.sets,8);assert.match(logged.name,/랫풀다운/);assert.match(logged.name,/시티드로우/);assert.deepEqual((logged.exercises||[]).map(x=>x.name).sort(),['랫풀다운','시티드로우'].sort());assert.match(logged.conversationRaw,/오늘 운동했어/);assert.match(logged.conversationRaw,/4세트/);
  assert.equal(await page.evaluate(()=>window.GarangConversationalIntelligenceV1.getPending()),null,'successful auto-log must close the follow-up transaction');
  await page.waitForFunction(date=>window.GarangPlanExecution.daily(window.GarangAgentStateBridge.getState(),date).plan.domains.training.rate===100,localDate(),{timeout:5000});
  const trainingImpact=page.locator('.gci-coach-turn[data-state="logged"] [data-gci-impact][data-domain="training"]').last();await trainingImpact.waitFor({state:'visible',timeout:5000});const trainingImpactText=await trainingImpact.innerText();assert.match(trainingImpactText,/TODAY UPDATED/);assert.match(trainingImpactText,/운동/);assert.match(trainingImpactText,/100%/);assert.match(trainingImpactText,/다음 · 회복/,'Coach must immediately expose the next incomplete track after execution evidence changes');

  await tap(page,'.gci-coach-turn[data-state="logged"] [data-gci-undo]','undo conversational workout');
  await page.waitForFunction(()=>document.querySelector('.gci-coach-turn[data-state="undone"]'),null,{timeout:5000});
  await page.waitForFunction(()=>!(window.GarangAgentStateBridge?.getState?.()?.workouts||[]).some(row=>row?.source==='coach-conversation'),null,{timeout:5000});
  assert.equal(await page.evaluate(date=>window.GarangPlanExecution.daily(window.GarangAgentStateBridge.getState(),date).plan.domains.training.rate,localDate()),0,'undo must remove the derived training execution evidence');
  const restoredImpact=page.locator('.gci-coach-turn[data-state="undone"] [data-gci-impact][data-restored="1"]');await restoredImpact.waitFor({state:'visible',timeout:5000});assert.match(await restoredImpact.innerText(),/TODAY RESTORED/);

  await sendCoach(page,'밥 먹었어');
  await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.gci-coach-turn[data-state="asking"] strong')];return /뭐 먹었어/.test(cards.at(-1)?.textContent||'');},null,{timeout:7000});
  await sendCoach(page,'닭가슴살이랑 샐러드 먹었어');
  await page.waitForFunction(()=>{const s=window.GarangAgentStateBridge?.getState?.()||{};return (s.meals||[]).some(row=>row?.source==='coach-conversation');},null,{timeout:7000});
  const meal=await page.evaluate(()=>window.GarangAgentStateBridge.getState().meals.filter(row=>row?.source==='coach-conversation').at(-1));assert.match(meal.name,/닭가슴살/);assert.match(meal.name,/샐러드/);
  await page.waitForFunction(date=>window.GarangPlanExecution.daily(window.GarangAgentStateBridge.getState(),date).plan.domains.nutrition.rate===34,localDate(),{timeout:5000});
  const nutritionImpact=page.locator('.gci-coach-turn[data-state="logged"] [data-gci-impact][data-domain="nutrition"]').last();await nutritionImpact.waitFor({state:'visible',timeout:5000});const nutritionImpactText=await nutritionImpact.innerText();assert.match(nutritionImpactText,/식단/);assert.match(nutritionImpactText,/34%/,'one meal must remain partial evidence rather than falsely completing nutrition');

  await sendCoach(page,'스트레칭 15분 했어');
  await page.waitForFunction(date=>window.GarangPlanExecution.daily(window.GarangAgentStateBridge.getState(),date).plan.domains.recovery.rate===100,localDate(),{timeout:7000});
  const recoveryPlan=await page.evaluate(()=>window.GarangAgentStateBridge.getState().planner.find(row=>row.id==='p-recovery'));assert.equal(recoveryPlan.completed,true,'explicit recovery action in Coach must complete the recovery plan');assert.ok(Array.isArray(recoveryPlan.evidence)&&recoveryPlan.evidence.some(item=>item.type==='coach-conversation-recovery'));
  const recoveryImpact=page.locator('.gci-coach-turn[data-state="logged"] [data-gci-impact][data-domain="recovery"]').last();await recoveryImpact.waitFor({state:'visible',timeout:5000});assert.match(await recoveryImpact.innerText(),/회복/);assert.match(await recoveryImpact.innerText(),/100%/);

  assert.deepEqual(dialogs,[],`conversational logging must not use native blocking dialogs: ${dialogs.join(' | ')}`);assert.deepEqual(errors,[],`conversational intelligence browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-conversational-intelligence follow-up -> canonical log -> execution impact -> undo: PASS');
 }finally{clearTimeout(watchdog);if(browser)await browser.close().catch(()=>{});if(server.exitCode===null)server.kill('SIGTERM');}
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
