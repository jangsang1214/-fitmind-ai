/* GARANG Coach Agent v4.7.1
   Canonical owner for Coach recommended prompts, proposal cards and Coach message display localization.
   Retires the former item4-final overlay by absorbing its bilingual prompt + stored-message repair behavior.
*/
(() => {
'use strict';

const main=document.getElementById('main');if(!main)return;
const sessionsByMessage=new Map(),seenAssistantIds=new Set(),processingAssistantIds=new Set();
let activeRoot=null,rootQueued=false;
const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const clean=text=>String(text??'').replace(/\r\n/g,'\n').trim();
const hasHangul=text=>/[가-힣]/.test(String(text||''));
const PROMPTS=Object.freeze([
 {id:'training',koLabel:'오늘 운동 강도',enLabel:"Today's training",koPrompt:'오늘 운동 강도를 내 기록 기준으로 정해줘',enPrompt:"Set today's training intensity based on my records."},
 {id:'recent',koLabel:'최근 운동 분석',enLabel:'Recent workouts',koPrompt:'내 최근 운동 기록을 분석해줘',enPrompt:'Analyze my recent workout records.'},
 {id:'nutrition',koLabel:'오늘 식단 분석',enLabel:"Today's nutrition",koPrompt:'오늘 저장된 식단 기록을 분석해줘',enPrompt:"Analyze today's nutrition based on my saved meals."},
 {id:'recovery',koLabel:'회복 상태',enLabel:'Recovery',koPrompt:'오늘 회복 상태를 알려줘',enPrompt:'How is my recovery today?'},
 {id:'plan',koLabel:'계획 만들기',enLabel:'Create plan',koPrompt:'오늘 계획을 만들어줘',enPrompt:'Create a plan for today.'}
]);
const promptByKo=new Map(PROMPTS.map(item=>[item.koPrompt,item]));
function cloudReady(){try{if(window.firebase?.auth?.().currentUser)return window.GarangCloudHydrationReady!==false;}catch{}return true;}
function loadConversationalIntelligence(){
 if(window.GarangConversationalIntelligenceV1||document.querySelector('script[data-garang-conversational-intelligence-v1]'))return;
 const core=document.createElement('script');core.src='./02_core/conversational-intelligence-v1.js?v=1.0.0';core.dataset.garangConversationalIntelligenceV1='core';core.async=false;
 core.onload=()=>{if(window.GarangConversationalIntelligenceV1||document.querySelector('script[data-garang-conversational-intelligence-runtime-v1]'))return;const runtime=document.createElement('script');runtime.src='./06_features/ui/runtime/garang-conversational-intelligence-v1.js?v=1.1.0';runtime.dataset.garangConversationalIntelligenceRuntimeV1='1';runtime.async=false;document.head.appendChild(runtime);};
 core.onerror=()=>console.warn('[GARANG] Conversational Intelligence core failed to load.');document.head.appendChild(core);
}

function translateExercise(name){try{return window.GarangEntityI18n?.translateExercise?.(name)||name;}catch{return name;}}
function translateKnownCoachText(source){
 const input=clean(source);if(!input)return input;
 let out=input;try{out=window.GarangCoachLanguagePolicy?.translate?.(input)||input;}catch{}
 if(!hasHangul(out))return out;
 const exact=new Map([
  ['현재 외부 AI 연결이 없어서 GARANG 로컬 코치로 응답하고 있습니다. 운동 강도, 회복 상태, 식단, 최근 기록에 대해서는 실제 저장 데이터를 기준으로 분석할 수 있습니다.','The external AI is not connected yet, so GARANG is responding with its local Coach Engine. It can still analyze training intensity, recovery, nutrition, and recent records from your actual saved data.'],
  ['오늘 체크인이 아직 없습니다. 수면, 에너지, 스트레스, 근육통을 저장하면 GARANG이 오늘 훈련 강도를 실제 기록에 맞춰 판단할 수 있습니다.','There is no check-in for today yet. Save sleep, energy, stress, and soreness so GARANG can judge today’s training intensity from your actual data.'],
  ['지금은 실제 저장된 식단 기록만 사용해 판단했습니다.','This judgment uses only your actual saved nutrition records.'],
  ['수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다.','Sleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.'],
  ['고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다.','A recovery session or reduced-volume session is better than high intensity today.'],
  ['평소보다 약간 보수적인 강도가 적절합니다.','A slightly more conservative intensity than usual is appropriate today.'],
  ['현재 기록상 정상 훈련을 진행할 수 있는 범위입니다.','Your current records support a normal training session today.']
 ]);
 if(exact.has(input))return exact.get(input);
 out=input.replace(/오늘 기록 기준으로\s*([0-9.]+)\s*kcal,\s*단백질\s*([0-9.]+)g입니다\.\s*목표 단백질을 약\s*([0-9.]+)g으로 보면\s*([0-9.]+)g 정도 남아 있습니다\.\s*지금은 실제 저장된 식단 기록만 사용해 판단했습니다\./s,'Based on today’s records: $1 kcal and $2 g protein. With a protein target of about $3 g, roughly $4 g remains. This judgment uses only your actual saved nutrition records.');
 if(!hasHangul(out))return out;
 out=out.replace(/현재 저장된 운동 기록은\s*(\d+)개입니다\.(?:\s*최근 기록:\s*([^\n]+?)\s+([0-9.]+)kg\s*×\s*([0-9.]+)\s*×\s*([0-9.]+)세트\.)?\s*수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다\./s,(_,count,name,weight,reps,sets)=>`There are ${count} saved workout records.${name?`\nLatest record: ${translateExercise(name)} ${weight} kg × ${reps} × ${sets} sets.`:''}\n\nSleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.`);
 if(!hasHangul(out))return out;
 out=out.replace(/오늘 회복 지표는 약\s*([0-9.]+)\/100입니다\.\s*수면\s*([0-9.]+)시간\s*·\s*에너지\s*([0-9.]+)\/5\s*·\s*스트레스\s*([0-9.]+)\/5\s*·\s*근육통\s*([0-9.]+)\/5를 반영했습니다\.\s*(고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다\.|평소보다 약간 보수적인 강도가 적절합니다\.|현재 기록상 정상 훈련을 진행할 수 있는 범위입니다\.)/s,(_,score,sleep,energy,stress,soreness,tail)=>`Today’s recovery score is about ${score}/100.\nSleep ${sleep} h · Energy ${energy}/5 · Stress ${stress}/5 · Soreness ${soreness}/5 are included.\n\n${exact.get(tail)||tail}`);
 if(!hasHangul(out))return out;
 try{const generic=window.GarangI18n?.translate?.(input);if(generic&&!hasHangul(generic))return generic;}catch{}
 return 'GARANG reviewed your saved data, but this local-only response is not available as a complete English sentence yet. Please ask again or switch to Korean until the external AI adapter is connected.';
}
function threadMessageById(id){
 if(!id)return null;
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);if(!String(key||'').startsWith('garang_coach_threads_v2::'))continue;
   const store=JSON.parse(localStorage.getItem(key)||'null');
   for(const thread of store?.threads||[]){const message=(thread.messages||[]).find(item=>String(item?.id)===String(id));if(message)return message;}
  }
 }catch{}
 return null;
}
function repairMessageLanguage(root){
 if(!english())return;
 root.querySelectorAll('.g2-message[data-message-id]').forEach(messageEl=>{
  const textEl=messageEl.querySelector('.g2-message-text');if(!textEl)return;
  const stored=threadMessageById(messageEl.dataset.messageId),source=clean(stored?.text||textEl.textContent||'');if(!source)return;
  let next=source;
  if(messageEl.classList.contains('user')&&promptByKo.has(source))next=promptByKo.get(source).enPrompt;
  else if(messageEl.classList.contains('assistant'))next=translateKnownCoachText(source);
  if(textEl.textContent!==next)textEl.textContent=next;
 });
}
function contextFromState(state){const s=state||{};return {profile:clone(s.profile||null),userModel:clone(s.userModel||s.onboarding||null),recent:{workouts:clone((s.workouts||[]).slice(-30)),meals:clone((s.meals||[]).slice(-30)),runs:clone((s.runs||[]).slice(-20)),body:clone((s.body||[]).slice(-20)),planner:clone((s.planner||[]).slice(-30))},memory:{entries:clone((s.memory?.entries||[]).filter(x=>x?.userConfirmed!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())).slice(-40))}};}
function toolLabel(tool){const ko={createPlan:'계획 생성',updatePlan:'계획 수정',saveMemory:'기억 저장',deleteRecord:'기록 삭제',updateGoal:'목표 변경'},en={createPlan:'Create plan',updatePlan:'Update plan',saveMemory:'Save memory',deleteRecord:'Delete record',updateGoal:'Update goal'};return (english()?en:ko)[tool]||tool;}
function proposalSummary(proposal){const a=proposal.args||{};if(proposal.tool==='createPlan'){try{const summary=window.GarangCanonicalDailyPlanV1?.summaryToday?.({lang:english()?'en':'ko'});if(summary)return summary;}catch{}return a.title||'';}if(proposal.tool==='updatePlan')return `${a.id||''}${a.title?` · ${a.title}`:''}`;if(proposal.tool==='saveMemory')return `${a.key||''}${a.value?` · ${a.value}`:''}`;if(proposal.tool==='deleteRecord')return `${a.domain||''} · ${a.id||''}`;if(proposal.tool==='updateGoal')return a.goal||'';return JSON.stringify(a);}
function renderProposalCard(messageEl,entry){const body=messageEl.querySelector('.g2-message-body');if(!body)return;let wrap=body.querySelector('.g4-agent-proposals');if(!wrap){wrap=document.createElement('div');wrap.className='g4-agent-proposals';body.appendChild(wrap);}const {proposal}=entry;let card=wrap.querySelector(`[data-g4-proposal="${CSS.escape(proposal.id)}"]`);if(!card){card=document.createElement('section');card.className='g4-agent-proposal';card.dataset.g4Proposal=proposal.id;wrap.appendChild(card);}const status=entry.status||proposal.status||'pending',pending=status==='pending',renderKey=`${english()?'en':'ko'}:${status}:${proposal.tool}:${proposalSummary(proposal)}`;if(card.dataset.renderKey===renderKey)return;card.dataset.status=status;card.dataset.renderKey=renderKey;const approveLabel=proposal.tool==='createPlan'?(english()?'Apply & open plan':'반영하고 계획 열기'):(english()?'Approve':'승인');card.innerHTML=`<div class="g4-proposal-head"><span>${english()?'ACTION PROPOSAL':'행동 제안'}</span><b>${esc(toolLabel(proposal.tool))}</b></div><p>${esc(proposalSummary(proposal))}</p><div class="g4-proposal-state">${pending?(english()?'Nothing changes until you approve this action.':'승인하기 전에는 아무것도 변경되지 않습니다.'):(status==='confirmed'?(english()?'Approved and applied.':'승인되어 적용되었습니다.'):(status==='rejected'?(english()?'Rejected. No data was changed.':'거절되었습니다. 데이터는 변경되지 않았습니다.'):(english()?'This proposal is no longer active.':'이 제안은 더 이상 활성 상태가 아닙니다.')))}</div>${pending?`<div class="g4-proposal-actions"><button type="button" data-g4-reject>${english()?'Reject':'거절'}</button><button type="button" class="approve" data-g4-approve>${approveLabel}</button></div>`:''}`;if(pending){card.querySelector('[data-g4-reject]').onclick=()=>resolveProposal(messageEl,entry,false);card.querySelector('[data-g4-approve]').onclick=()=>resolveProposal(messageEl,entry,true);}}
function resolveProposal(messageEl,entry,approved){if(entry.status&&entry.status!=='pending')return;try{const result=entry.session.confirm(entry.proposal.id,approved);entry.status=result.proposal.status;entry.result=result.result;renderProposalCard(messageEl,entry);window.dispatchEvent(new CustomEvent('garang:agent-proposal-resolved',{detail:{id:entry.proposal.id,tool:entry.proposal.tool,status:entry.status}}));if(approved&&entry.status==='confirmed'&&entry.proposal.tool==='createPlan')window.GarangRouter?.navigate?.('planner',{source:'coach-plan-applied',force:true});}catch(error){entry.status='expired';entry.error=String(error?.message||error);renderProposalCard(messageEl,entry);}}
function attachStoredProposals(messageEl,messageId){const entries=sessionsByMessage.get(messageId);if(!entries)return false;entries.forEach(entry=>renderProposalCard(messageEl,entry));return true;}
async function processAssistant(messageEl){
 if(messageEl.dataset.thinking==='1')return;
 const messageId=messageEl.dataset.messageId||'';if(!messageId)return;
 if(attachStoredProposals(messageEl,messageId))return;
 if(seenAssistantIds.has(messageId)||processingAssistantIds.has(messageId))return;
 const siblings=[...messageEl.parentElement.children],index=siblings.indexOf(messageEl);let userEl=null;
 for(let i=index-1;i>=0;i--){if(siblings[i].classList?.contains('user')){userEl=siblings[i];break;}}
 const text=userEl?.querySelector('.g2-message-text')?.textContent?.trim();if(!text)return;
 const Contract=window.GarangAgentContract,Bridge=window.GarangAgentStateBridge;
 if(!cloudReady()){messageEl.dataset.g4AgentPending='1';return;}
 if(!Contract||!Bridge?.ready?.()){messageEl.dataset.g4AgentPending='1';return;}
 processingAssistantIds.add(messageId);delete messageEl.dataset.g4AgentPending;
 try{
  const state=Bridge.getState(),context=contextFromState(state);
  if(Bridge.getMemoryContext)context.memory=Bridge.getMemoryContext(text,{limit:24,budgetChars:6000});
  if(Bridge.getUserStateContext)context.userState=Bridge.getUserStateContext();
  if(Bridge.getDecisionContext)context.decision=Bridge.getDecisionContext();
  const session=Contract.createSession({getState:()=>Bridge.getState(),applyWrite:(tool,args)=>Bridge.applyWrite(tool,args)}),result=await session.run({message:text,context,language:english()?'en':'ko'},{adapter:Contract.createMockAdapter()});
  const entries=result.proposals.map(proposal=>({session,proposal,status:'pending',reads:result.reads.length}));
  if(entries.length){sessionsByMessage.set(messageId,entries);entries.forEach(entry=>renderProposalCard(messageEl,entry));}
  seenAssistantIds.add(messageId);messageEl.dataset.g4AgentProcessed='1';
 }catch(error){messageEl.dataset.g4AgentPending='1';console.warn('[GARANG] Agent E2E layer deferred',error);}finally{processingAssistantIds.delete(messageId);}
}
function promptSignature(){const isEn=english();return PROMPTS.map(item=>`${item.id}\u0001${isEn?item.enLabel:item.koLabel}\u0001${item.koPrompt}`).join('\u0002');}
function currentPromptSignature(strip){return strip.dataset.garangPromptSignature||'';}
function submitPrompt(root,input,prompt){input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));const send=root.querySelector('.g2-send');if(typeof send?.onclick==='function')send.onclick.call(send,{type:'garang-coach-submit',target:send,currentTarget:send,preventDefault(){},stopPropagation(){}});}
function syncPromptStrip(root){
 const composerWrap=root.querySelector('.g2-composer-wrap'),composer=root.querySelector('.g2-composer'),input=root.querySelector('.g2-composer textarea');if(!composerWrap||!composer||!input)return;
 const legacy=root.querySelector('.g2-empty-chat .g2-prompts');if(legacy?.isConnected)legacy.remove();
 let strip=composerWrap.querySelector('.g4-prompt-strip');if(!strip){strip=document.createElement('div');strip.className='g4-prompt-strip';composerWrap.insertBefore(strip,composer);}if(strip.nextElementSibling!==composer)composerWrap.insertBefore(strip,composer);
 strip.dataset.garangPromptOwner='coach-agent-v4';strip.dataset.garangPersistent='1';
 const placeholder=english()?'Message GARANG':'GARANG에게 메시지 보내기';if(input.placeholder!==placeholder)input.placeholder=placeholder;if(input.getAttribute('aria-label')!==placeholder)input.setAttribute('aria-label',placeholder);
 const wanted=promptSignature();if(currentPromptSignature(strip)===wanted)return;
 const isEn=english();strip.innerHTML=PROMPTS.map(item=>`<button type="button" data-g4-prompt="${esc(isEn?item.enPrompt:item.koPrompt)}" data-garang-canonical-prompt="${esc(item.koPrompt)}" data-garang-prompt-id="${item.id}">${esc(isEn?item.enLabel:item.koLabel)}</button>`).join('');strip.dataset.garangPromptSignature=wanted;
 strip.querySelectorAll('[data-garang-canonical-prompt]').forEach(button=>{button.onclick=()=>submitPrompt(root,input,button.dataset.garangCanonicalPrompt||'');});
}
function syncProposalLanguage(root){root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>{const entries=sessionsByMessage.get(message.dataset.messageId);if(entries)entries.forEach(entry=>renderProposalCard(message,entry));});}
function syncRoot(root){if(root!==activeRoot||!root.isConnected)return;syncPromptStrip(root);repairMessageLanguage(root);syncProposalLanguage(root);root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(processAssistant);}
function queueRootSync(root=activeRoot){if(!root||root!==activeRoot||rootQueued)return;rootQueued=true;requestAnimationFrame(()=>{rootQueued=false;syncRoot(root);});}
function activateRoot(root){if(!root||!root.isConnected)return;if(activeRoot===root){queueRootSync(root);return;}activeRoot=root;rootQueued=false;root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>seenAssistantIds.add(message.dataset.messageId));syncPromptStrip(root);repairMessageLanguage(root);queueRootSync(root);}
function syncLifecycleRoot(){const root=main.querySelector('.garang-coach-v2');if(!root){if(activeRoot&&!activeRoot.isConnected){activeRoot=null;rootQueued=false;}return;}activateRoot(root);}
window.addEventListener('garang:screen-rendered',syncLifecycleRoot);
window.addEventListener('garang:coach-mounted',syncLifecycleRoot);
window.addEventListener('garang:coach-message-rendered',()=>queueRootSync(activeRoot));
window.addEventListener('garang:state-hydrated',()=>queueRootSync(activeRoot));
new MutationObserver(()=>queueRootSync(activeRoot)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:cloud-state-ready',()=>queueRootSync(activeRoot));
window.addEventListener('garang:agent-write',()=>queueRootSync(activeRoot));
window.GarangCoachAgentV4=Object.freeze({version:'garang-coach-agent-v4.7.1',prompts:PROMPTS,translateCoachText:translateKnownCoachText});
loadConversationalIntelligence();syncLifecycleRoot();
})();