/* GARANG Coach Profile + Decision Stability v1
   - Keeps Stage 3 decision calculations stable across legacy/current check-in aliases.
   - Preserves the compact decision row in chat.
   - Makes the visible Coach profile mark open a deeper "how GARANG understands me" panel.
   - Read-only: never mutates workout, meal, check-in, memory, planner or sync data.
*/
(() => {
'use strict';
const main=document.getElementById('main');if(!main)return;
const Bridge0=window.GarangAgentStateBridge;
const StateEngine=window.GarangStateIntelligence;
const DecisionEngine=window.GarangDecisionIntelligence;
if(!Bridge0||!StateEngine||!DecisionEngine||window.__garangCoachProfileStabilityV1)return;
window.__garangCoachProfileStabilityV1=true;
const VERSION='garang-coach-profile-stability-v1';
const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=value=>Array.isArray(value)?value.filter(isObject):[];
const num=(value,f=null)=>Number.isFinite(Number(value))?Number(value):f;
const dateOnly=value=>{const m=String(value||'').match(/^\d{4}-\d{2}-\d{2}/);return m?m[0]:'';};
const stamp=row=>Math.max(Date.parse(row?.updatedAt||0)||0,Date.parse(row?.createdAt||0)||0,Date.parse(`${dateOnly(row?.date)||'1970-01-01'}T00:00:00Z`)||0);

function normalizeCheckin(raw){
 const row=isObject(raw)?{...raw}:{};
 const scalar=Number(row.soreness);
 const soreness=isObject(row.soreness)?clone(row.soreness):(Number.isFinite(scalar)?{general:scalar}:{});
 return {...row,sleepHours:row.sleepHours??row.sleep??null,soreness,painCaution:row.painCaution===true};
}
function canonicalCheckins(state){
 const sources=[
  {list:rows(state?.dailyCheckins),priority:1},
  {list:rows(state?.checkins),priority:2}
 ];
 const byDate=new Map(),undated=[];
 for(const source of sources){
  for(const raw of source.list){
   const row=normalizeCheckin(raw),date=dateOnly(row.date),key=date?`date:${date}`:(row.id?`id:${row.id}`:'');
   if(!key){undated.push(row);continue;}
   const prev=byDate.get(key),candidate={row,priority:source.priority,stamp:stamp(row)};
   if(!prev||candidate.stamp>prev.stamp||(candidate.stamp===prev.stamp&&candidate.priority>=prev.priority))byDate.set(key,candidate);
  }
 }
 return [...byDate.values()].map(x=>x.row).concat(undated).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||stamp(a)-stamp(b));
}
function intelligenceState(){
 const state=clone(Bridge0.getState());
 const checkins=canonicalCheckins(state);
 state.dailyCheckins=checkins;
 /* Keep a normalized read-only alias too so every intelligence consumer sees the same source. */
 state.checkins=checkins;
 return state;
}
function memoryContext(){
 try{return Bridge0.getMemoryContext?.('',{limit:24,budgetChars:6000})||null;}catch{return null;}
}
function userState(){return StateEngine.estimateState(intelligenceState());}
function decision(){return DecisionEngine.decide(userState(),{memoryContext:memoryContext()});}

/* Replace only read-side intelligence accessors. applyWrite/getLiveState remain the original bridge. */
const StableBridge=Object.freeze({
 ...Bridge0,
 getIntelligenceState:()=>clone(intelligenceState()),
 getUserState:()=>clone(userState()),
 getUserStateContext:()=>StateEngine.compactForContext?clone(StateEngine.compactForContext(userState())):clone(userState()),
 getUserStateDiagnostics:()=>StateEngine.diagnostics?clone(StateEngine.diagnostics(intelligenceState())):null,
 getDecision:()=>clone(decision()),
 getDecisionContext:()=>DecisionEngine.compactForContext?clone(DecisionEngine.compactForContext(decision())):clone(decision()),
 getDecisionDiagnostics:()=>DecisionEngine.diagnostics?clone(DecisionEngine.diagnostics(userState(),{memoryContext:memoryContext()})):null
});
window.GarangAgentStateBridge=StableBridge;

const MODE={
 collect_data:{ko:'데이터 필요',en:'More data needed'},caution:{ko:'주의',en:'Caution'},recover:{ko:'회복 우선',en:'Recovery first'},reduce:{ko:'강도 조정',en:'Reduce load'},maintain:{ko:'계획 유지',en:'Maintain'},progress:{ko:'점진 향상',en:'Progress'},goal_focus:{ko:'목표 집중',en:'Goal focus'}
};
const BAND_KO={unknown:'데이터 부족',low:'낮음',guarded:'주의',ready:'양호',high:'높음',moderate:'보통',very_high:'매우 높음',stable:'안정',spike:'급증',drop:'감소',mixed:'혼합'};
const BAND_EN={unknown:'Not enough data',low:'Low',guarded:'Guarded',ready:'Ready',high:'High',moderate:'Moderate',very_high:'Very high',stable:'Stable',spike:'Spike',drop:'Drop',mixed:'Mixed'};
const bandLabel=value=>(english()?BAND_EN:BAND_KO)[String(value||'unknown')]||String(value||'unknown');
const modeLabel=value=>english()?(MODE[value]?.en||value):(MODE[value]?.ko||value);
function text(pair){return english()?pair?.en:pair?.ko;}
function ensureStyle(){if(document.getElementById('garang-coach-profile-stability-style'))return;const style=document.createElement('style');style.id='garang-coach-profile-stability-style';style.textContent=`
.gcp-profile-trigger{border:0;background:transparent;padding:0;margin:0;display:grid;place-items:center;color:inherit;cursor:pointer;border-radius:999px}.gcp-profile-trigger:focus-visible{outline:1px solid rgba(255,255,255,.55);outline-offset:3px}.gcp-profile-trigger .garang-code-mark{pointer-events:none}.gcp-profile-hint{font-size:9px;opacity:.48;margin-left:2px}.gcp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(3px);z-index:1200}.gcp-panel{position:fixed;right:14px;top:14px;bottom:14px;width:min(420px,calc(100vw - 28px));z-index:1201;border:1px solid rgba(255,255,255,.13);border-radius:22px;background:#0c0d0c;box-shadow:0 24px 80px rgba(0,0,0,.5);overflow:auto;padding:18px;display:grid;align-content:start;gap:16px}.gcp-panel[hidden],.gcp-backdrop[hidden]{display:none!important}.gcp-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.gcp-head-copy small{font-size:10px;letter-spacing:.13em;opacity:.58}.gcp-head-copy h2{font-size:22px;margin:3px 0 0}.gcp-close{width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.04);color:inherit;font-size:20px;cursor:pointer}.gcp-decision{padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.03);display:grid;gap:8px}.gcp-decision-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.gcp-decision-top strong{font-size:16px}.gcp-decision-top span{font-size:11px;opacity:.68}.gcp-summary{font-size:12px;line-height:1.55;opacity:.82;margin:0}.gcp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gcp-metric{padding:11px;border-radius:13px;border:1px solid rgba(255,255,255,.08);display:grid;gap:4px}.gcp-metric small{font-size:9px;letter-spacing:.06em;opacity:.55;text-transform:uppercase}.gcp-metric b{font-size:15px}.gcp-section{display:grid;gap:9px}.gcp-section h3{font-size:12px;margin:0;letter-spacing:.04em}.gcp-data-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.gcp-data{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:9px;display:grid;gap:3px}.gcp-data b{font-size:15px}.gcp-data small{font-size:9px;opacity:.55}.gcp-list{display:grid;gap:7px}.gcp-row{padding:9px 10px;border-radius:11px;background:rgba(255,255,255,.035);display:grid;gap:3px}.gcp-row b{font-size:11px}.gcp-row span{font-size:10px;line-height:1.4;opacity:.68}.gcp-note{font-size:10px;line-height:1.5;opacity:.5}.garang-decision-signals span{transition:opacity .15s ease}
@media(max-width:700px){.gcp-panel{top:auto;left:8px;right:8px;bottom:8px;width:auto;max-height:84vh;border-radius:22px 22px 16px 16px}.gcp-data-grid{grid-template-columns:repeat(3,1fr)}}
`;document.head.appendChild(style);}
function countData(state){const checkins=canonicalCheckins(state);return {workouts:rows(state.workouts).length,checkins:checkins.length,meals:rows(state.meals).length,runs:rows(state.runs).length,body:rows(state.body).length,memory:rows(state.memory?.entries).filter(x=>x.status!=='superseded'&&x.status!=='expired'&&x.userConfirmed!==false).length};}
function memoryRows(state){
 const active=rows(state.memory?.entries).filter(x=>x.status!=='superseded'&&x.status!=='expired'&&x.userConfirmed!==false);
 const priority=x=>String(x.type||'')==='goal'?0:String(x.memoryClass||x.type||'')==='preference'?1:2;
 return active.slice().sort((a,b)=>priority(a)-priority(b)||Number(b.importance||0)-Number(a.importance||0)).slice(0,5);
}
function panelHTML(){
 let state={},u=null,d=null;try{state=StableBridge.getIntelligenceState();u=StableBridge.getUserState();d=StableBridge.getDecisionContext();}catch{}
 const c=countData(state),signals=d?.signals||{},confidence=Math.round(num(d?.confidence,0)*100),summary=text(d?.summary)||'',patterns=rows(u?.patterns).slice(0,5),mem=memoryRows(state),goal=String(state?.profile?.goal||state?.onboarding?.goal||'').trim();
 const value=(n,suffix='')=>n==null?'—':`${n}${suffix}`;
 const metric=(label,valueText,band)=>`<div class="gcp-metric"><small>${label}</small><b>${esc(valueText)}</b><span style="font-size:10px;opacity:.58">${esc(bandLabel(band))}</span></div>`;
 const data=(label,n)=>`<div class="gcp-data"><b>${n}</b><small>${label}</small></div>`;
 return `<div class="gcp-head"><div class="gcp-head-copy"><small>GARANG COACH</small><h2>${english()?'How GARANG understands you':'GARANG이 나를 이해하는 방식'}</h2></div><button type="button" class="gcp-close" aria-label="${english()?'Close':'닫기'}">×</button></div>
 <section class="gcp-decision"><div class="gcp-decision-top"><strong>${esc(modeLabel(d?.mode||'collect_data'))}</strong><span>${english()?'Confidence':'판단 신뢰도'} ${confidence}%</span></div><p class="gcp-summary">${esc(summary|| (english()?'GARANG is still collecting enough evidence for a stable decision.':'GARANG이 안정적인 판단을 위해 데이터를 확인하고 있어.'))}</p></section>
 <section class="gcp-grid">${metric(english()?'Readiness':'준비도',value(signals.readinessValue,'/100'),signals.readinessBand)}${metric(english()?'Fatigue':'피로',value(signals.fatigueScore,'/100'),signals.fatigueBand)}${metric(english()?'Training load':'훈련 부하',signals.loadRatio==null?'—':`${Number(signals.loadRatio).toFixed(2)}×`,signals.loadBand)}${metric(english()?'Goal alignment':'목표 정렬',value(signals.goalScore,'/100'),signals.goalBand)}</section>
 <section class="gcp-section"><h3>${english()?'DATA GARANG IS USING':'GARANG이 참고 중인 데이터'}</h3><div class="gcp-data-grid">${data(english()?'Workouts':'운동',c.workouts)}${data(english()?'Check-ins':'체크인',c.checkins)}${data(english()?'Meals':'식단',c.meals)}${data(english()?'Runs':'러닝',c.runs)}${data(english()?'Body':'신체',c.body)}${data(english()?'Memories':'기억',c.memory)}</div></section>
 <section class="gcp-section"><h3>${english()?'CURRENT UNDERSTANDING':'현재 기억 중'}</h3><div class="gcp-list">${goal?`<div class="gcp-row"><b>${english()?'Primary goal':'현재 목표'}</b><span>${esc(goal)}</span></div>`:''}${mem.map(x=>`<div class="gcp-row"><b>${esc(String(x.type||x.memoryClass||'memory'))}</b><span>${esc(String(x.value||x.content||''))}</span></div>`).join('')||`<div class="gcp-row"><span>${english()?'No confirmed long-term memory yet.':'확인된 장기 기억이 아직 없어.'}</span></div>`}</div></section>
 <section class="gcp-section"><h3>${english()?'RECENT PATTERNS':'최근 감지 패턴'}</h3><div class="gcp-list">${patterns.map(p=>`<div class="gcp-row"><b>${esc(String(p.id||'pattern').replaceAll('_',' '))}</b><span>${esc(String(p.summary||''))}</span></div>`).join('')||`<div class="gcp-row"><span>${english()?'No strong recent pattern detected yet.':'아직 강하게 감지된 최근 패턴은 없어.'}</span></div>`}</div></section>
 <div class="gcp-note">${english()?'The compact decision stays in chat. This profile shows the deeper evidence GARANG is using. No data is changed by opening this panel.':'채팅에는 핵심 판단만 남기고, 이 프로필에서는 GARANG이 참고하는 근거를 더 깊게 보여줘. 이 화면을 열어도 어떤 데이터도 변경되지 않아.'}</div>`;
}
function closePanel(root){const panel=root.querySelector('.gcp-panel'),back=root.querySelector('.gcp-backdrop');if(panel)panel.hidden=true;if(back)back.hidden=true;root.classList.remove('gcp-open');}
function openPanel(root){ensureStyle();let panel=root.querySelector('.gcp-panel'),back=root.querySelector('.gcp-backdrop');if(!back){back=document.createElement('div');back.className='gcp-backdrop';back.hidden=true;root.appendChild(back);back.onclick=()=>closePanel(root);}if(!panel){panel=document.createElement('aside');panel.className='gcp-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.hidden=true;root.appendChild(panel);}panel.innerHTML=panelHTML();panel.hidden=false;back.hidden=false;root.classList.add('gcp-open');panel.querySelector('.gcp-close')?.addEventListener('click',()=>closePanel(root));panel.querySelector('.gcp-close')?.focus();}
function bindProfile(){const root=main.querySelector('.garang-coach-v2');if(!root)return;const head=root.querySelector('.g2-chat-head');if(!head)return;let trigger=head.querySelector('.gcp-profile-trigger');if(!trigger){const logo=head.querySelector('.garang-code-mark,.garang-exact-logo');if(!logo)return;trigger=document.createElement('button');trigger.type='button';trigger.className='gcp-profile-trigger';trigger.setAttribute('aria-label',english()?'Open GARANG Coach profile':'GARANG 코치 프로필 열기');logo.replaceWith(trigger);trigger.appendChild(logo);trigger.addEventListener('click',()=>openPanel(root));}
 const copy=head.querySelector('.g2-chat-head-copy');if(copy&&!copy.querySelector('.gcp-profile-hint')){const hint=document.createElement('span');hint.className='gcp-profile-hint';hint.textContent='›';copy.querySelector('small')?.appendChild(hint);copy.querySelector('small')?.setAttribute('title',english()?'Tap the GARANG mark for Coach profile':'GARANG 로고를 눌러 코치 프로필 보기');}}
function humanizeDecisionCard(){const card=main.querySelector('.garang-decision-card');if(!card)return;card.querySelectorAll('.garang-decision-signals span').forEach(el=>{const raw=String(el.textContent||'');const parts=raw.split('·');if(parts.length<2)return;const label=parts.shift().trim(),value=parts.join('·').trim();const mapped=bandLabel(value);if(mapped!==value)el.textContent=`${label} · ${mapped}`;});}
let queued=false;function run(){queued=false;ensureStyle();bindProfile();humanizeDecisionCard();}
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(run));}
new MutationObserver(queue).observe(main,{childList:true,subtree:true});
new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:agent-write',queue);window.addEventListener('garang:agent-proposal-resolved',queue);window.addEventListener('garang:sync-durable',()=>{queue();window.dispatchEvent(new CustomEvent('garang:decision-stable-refresh'));});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const root=main.querySelector('.garang-coach-v2');if(root?.classList.contains('gcp-open'))closePanel(root);});
queue();
window.GarangCoachProfileStability=Object.freeze({version:VERSION,canonicalCheckins,stateForIntelligence:()=>clone(intelligenceState())});
})();
