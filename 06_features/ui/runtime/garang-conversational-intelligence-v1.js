/* GARANG Conversational Intelligence v1
   Conversation -> Observation -> canonical record -> state/plan re-evaluation.
   One high-value follow-up at a time; clear natural-language reports can auto-log.
*/
(() => {
'use strict';
const Core=window.GarangConversationalIntelligenceCore;
const main=document.getElementById('main');
if(!Core||!main||window.GarangConversationalIntelligenceV1)return;

const VERSION='garang-conversational-intelligence-v1.0.0';
const KB_URL='./04_data/knowledge/coach-followup-kb-v1.json?v=1.0.0';
const STYLE_ID='garang-conversational-intelligence-v1-style';
const processedUserIds=new Set(),outcomes=new Map();
let activeRoot=null,queued=false,kb={};
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const now=()=>new Date().toISOString();

function storageScope(){try{return window.GarangAgentStateBridge?.getStorageKey?.()||'anonymous';}catch{return'anonymous';}}
function pendingKey(){return `garang_conversation_pending_v1::${storageScope()}`;}
function readPending(){try{const value=JSON.parse(sessionStorage.getItem(pendingKey())||'null');if(!value)return null;if(Date.now()-Date.parse(value.startedAt||0)>8*60*60*1000){sessionStorage.removeItem(pendingKey());return null;}return value;}catch{return null;}}
function writePending(value){try{if(value)sessionStorage.setItem(pendingKey(),JSON.stringify(value));else sessionStorage.removeItem(pendingKey());}catch{}}
async function loadKb(){try{const response=await fetch(KB_URL,{cache:'no-store'});if(response.ok)kb=await response.json();}catch(error){console.warn('[GARANG] Coach follow-up KB unavailable; using built-in priorities.',error);}}

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
.gci-coach-turn{margin:10px 0 2px;padding:10px 0 0;border-top:1px solid rgba(242,239,233,.075);display:grid;gap:6px;color:#f2efe9}.gci-coach-turn>small{font-size:7px;line-height:1;letter-spacing:.16em;color:#78aa99}.gci-coach-turn>strong{font-size:12px;line-height:1.55;font-weight:500;letter-spacing:-.01em;color:rgba(242,239,233,.92)}.gci-coach-turn>p{margin:0;font-size:9px;line-height:1.5;color:rgba(242,239,233,.46)}.gci-coach-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:1px}.gci-coach-actions button{min-height:32px;padding:0 9px;border:1px solid rgba(242,239,233,.1);border-radius:999px;background:transparent;color:rgba(242,239,233,.62);font:500 9px/1 var(--g2-ui,system-ui);touch-action:manipulation}.gci-coach-actions button:focus-visible{outline:1px solid rgba(120,170,153,.7);outline-offset:2px}.gci-coach-turn[data-state="undone"]>small,.gci-coach-turn[data-state="cancelled"]>small{color:rgba(242,239,233,.34)}.gci-coach-turn[data-state="undone"]>strong,.gci-coach-turn[data-state="cancelled"]>strong{color:rgba(242,239,233,.5)}
`;document.head.appendChild(style);
}
function state(){try{return window.GarangAgentStateBridge?.getState?.()||{};}catch{return{};}}
function bridge(){const b=window.GarangActionDataBridge;return b?.ready?.()?b:null;}
function sameDate(row,date){return String(row?.date||row?.createdAt||'').slice(0,10)===date;}
function idempotency(userId,suffix){return `gci:${String(userId||'message')}:${suffix}`;}
function sourceRecord(record,domain){return {id:record?.id||null,domain,at:record?.createdAt||record?.updatedAt||now(),source:'coach-conversation'};}

function executeRecoveryAction(decision,userId){
 const b=bridge();if(!b)return null;
 const s=state(),date=decision.write.record.date||Core.localDate(),plans=(Array.isArray(s.planner)?s.planner:[]).filter(row=>sameDate(row,date)&&String(row?.domain||'')==='recovery'&&row?.status!=='draft');
 const plan=plans.find(row=>row.completed!==true)||plans[0]||null;
 if(plan&&plan.completed!==true){
  const previous={completed:!!plan.completed,executionScore:plan.executionScore??0,evidence:Array.isArray(plan.evidence)?clone(plan.evidence):[],evidenceAt:plan.evidenceAt??null};
  const evidence=[...(Array.isArray(plan.evidence)?plan.evidence:[]),{type:'coach-conversation-recovery',label:decision.summary,at:now(),raw:decision.write.record.conversationRaw}];
  const result=b.updateRecord('planner',plan.id,{completed:true,executionScore:100,evidence,evidenceAt:now()},{userConfirmed:true,callId:idempotency(userId,'recovery-plan')});
  return {result,undo:{kind:'update',domain:'planner',id:plan.id,patch:previous},summary:decision.summary,recordDomain:'planner'};
 }
 const record={type:'recovery_action',key:`recovery_action_${date}_${String(userId||Date.now())}`,value:decision.summary,importance:1,confidence:decision.confidence||.9,userConfirmed:true,source:'coach-conversation',expiresAt:new Date(Date.now()+30*864e5).toISOString(),date,conversationRaw:decision.write.record.conversationRaw,origin:Core.ORIGIN};
 const result=b.createRecord('memory',record,{userConfirmed:true,callId:idempotency(userId,'recovery-memory')});
 return {result,undo:{kind:'delete',domain:'memory',id:result.id},summary:decision.summary,recordDomain:'memory'};
}
function executeDecision(decision,userId){
 const b=bridge();if(!b)return null;
 if(decision.write?.kind==='recovery-action')return executeRecoveryAction(decision,userId);
 if(decision.write?.kind!=='create')return null;
 const domain=decision.write.domain,result=b.createRecord(domain,decision.write.record,{userConfirmed:true,callId:idempotency(userId,`${domain}-create`)});
 return {result,undo:{kind:'delete',domain,id:result.id},summary:decision.summary,recordDomain:domain};
}
function undoOutcome(userId){
 const outcome=outcomes.get(userId),undo=outcome?.undo,b=bridge();if(!outcome||!undo||!b)return;
 try{
  if(undo.kind==='delete')b.deleteRecord(undo.domain,undo.id,{userConfirmed:true,callId:idempotency(userId,`${undo.domain}-undo`)});
  else if(undo.kind==='update')b.updateRecord(undo.domain,undo.id,undo.patch,{userConfirmed:true,callId:idempotency(userId,`${undo.domain}-undo-update`)});
  outcome.state='undone';outcome.undo=null;outcomes.set(userId,outcome);renderOutcomeForUser(activeRoot,userId);
 }catch(error){console.warn('[GARANG] conversational undo deferred',error);}
}

function nearestAssistantAfter(userEl){for(let node=userEl?.nextElementSibling;node;node=node.nextElementSibling){if(node.classList?.contains('user'))break;if(node.classList?.contains('assistant'))return node;}return null;}
function renderOutcomeForUser(root,userId){
 if(!root)return;const user=[...root.querySelectorAll('.g2-message.user[data-message-id]')].find(el=>String(el.dataset.messageId)===String(userId));if(!user)return;const assistant=nearestAssistantAfter(user);if(!assistant)return;const body=assistant.querySelector('.g2-message-body');if(!body)return;
 const outcome=outcomes.get(userId);if(!outcome)return;let card=body.querySelector(`[data-gci-for="${CSS.escape(String(userId))}"]`);if(!card){card=document.createElement('section');card.className='gci-coach-turn';card.dataset.gciFor=String(userId);body.appendChild(card);}card.dataset.state=outcome.state||outcome.type;
 if(outcome.type==='ask'){
  card.dataset.sourceIds=(outcome.sourceIds||[]).join(',');
  card.innerHTML=`<small>GARANG FOLLOW-UP</small><strong>${esc(outcome.question)}</strong><p>${english()?'I will ask only what changes the log or next decision.':'기록이나 다음 판단에 필요한 것만 한 가지씩 물어볼게.'}</p>`;
 }else if(outcome.type==='record'){
  const undone=outcome.state==='undone';card.innerHTML=`<small>${undone?(english()?'LOG UNDONE':'기록 취소됨'):(english()?'AUTO LOGGED':'자동 기록')}</small><strong>${esc(outcome.summary||'')}</strong><p>${undone?(english()?'The automatic record was removed.':'자동 기록을 되돌렸어.'):(english()?'Your report was saved and GARANG will re-evaluate today from the canonical record.':'네 답을 실제 기록에 저장했고 오늘 판단과 계획에 다시 반영해.')}</p>${!undone&&outcome.undo?`<div class="gci-coach-actions"><button type="button" data-gci-undo>${english()?'Undo':'실행 취소'}</button></div>`:''}`;card.querySelector('[data-gci-undo]')?.addEventListener('click',()=>undoOutcome(userId),{once:true});
 }else if(outcome.type==='cancel')card.innerHTML=`<small>${english()?'LOG CANCELLED':'기록 취소'}</small><strong>${esc(outcome.summary||'')}</strong>`;
}
function renderOutcomes(root){for(const id of outcomes.keys())renderOutcomeForUser(root,id);}

function processUser(userEl){
 const id=String(userEl?.dataset?.messageId||'');if(!id||processedUserIds.has(id))return;
 const text=userEl.querySelector('.g2-message-text')?.textContent?.trim();if(!text)return;
 let pending=readPending();
 if(pending?.sourceMessageId&&!activeRoot?.querySelector(`.g2-message.user[data-message-id="${CSS.escape(String(pending.sourceMessageId))}"]`)){writePending(null);pending=null;}
 const decision=Core.decide(text,state(),pending,kb,{language:english()?'en':'ko',date:Core.localDate(),messageId:id});
 if(decision.type==='ignore'){processedUserIds.add(id);return;}
 if(decision.type==='ask'){
  writePending(decision.pending);outcomes.set(id,{type:'ask',question:decision.question,sourceIds:decision.sourceIds,state:'asking'});processedUserIds.add(id);return;
 }
 if(decision.type==='cancel'){
  writePending(null);outcomes.set(id,{type:'cancel',summary:decision.summary,state:'cancelled'});processedUserIds.add(id);return;
 }
 if(decision.type==='record'){
  const applied=executeDecision(decision,id);if(!applied){setTimeout(queueSync,350);return;}
  writePending(null);outcomes.set(id,{type:'record',state:'logged',summary:applied.summary||decision.summary,undo:applied.undo,result:sourceRecord(applied.result,applied.recordDomain),confidence:decision.confidence,sourceIds:decision.sourceIds||[]});processedUserIds.add(id);
  try{window.dispatchEvent(new CustomEvent('garang:coach-conversation-recorded',{detail:{domain:decision.domain,id:applied.result?.id||null,sourceMessageId:id,confidence:decision.confidence}}));}catch{}
 }
}
function syncRoot(root){
 queued=false;if(!root||root!==activeRoot||!root.isConnected)return;
 root.querySelectorAll('.g2-message.user[data-message-id]').forEach(processUser);renderOutcomes(root);
}
function queueSync(){if(queued||!activeRoot)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>syncRoot(activeRoot)));}
function activateRoot(root){
 if(!root||!root.isConnected)return;
 if(activeRoot===root){queueSync();return;}
 activeRoot=root;processedUserIds.clear();outcomes.clear();
 root.querySelectorAll('.g2-message.user[data-message-id]').forEach(el=>processedUserIds.add(String(el.dataset.messageId||'')));
 queueSync();
}
function discover(){const root=main.querySelector('.garang-coach-v2');if(root)activateRoot(root);else activeRoot=null;}
function apiDecision(message,{pending=readPending(),state:providedState=state(),language=english()?'en':'ko'}={}){return Core.decide(message,providedState,pending,kb,{language,date:Core.localDate()});}

ensureStyle();loadKb();
window.addEventListener('garang:screen-rendered',discover);
window.addEventListener('garang:coach-mounted',discover);
window.addEventListener('garang:coach-message-rendered',queueSync);
window.addEventListener('garang:state-hydrated',queueSync);
window.addEventListener('garang:agent-write',queueSync);
window.addEventListener('garang:route-completed',discover);
window.GarangConversationalIntelligenceV1=Object.freeze({version:VERSION,decide:apiDecision,getPending:readPending,clearPending:()=>writePending(null),getKnowledge:()=>clone(kb)});
discover();
})();