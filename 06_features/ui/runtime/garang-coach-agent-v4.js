/* GARANG Coach Agent v4.6
   - Single owner for persistent recommended prompts and Agent proposal cards.
   - Canonical Korean action prompts keep the local/Agent branch stable while labels localize.
   - Mock Agent Contract E2E: question -> context -> tool proposal -> approval -> write.
   - Agent proposals wait for authenticated state hydration instead of marking a message processed early.
*/
(() => {
'use strict';

const main=document.getElementById('main');if(!main)return;
const sessionsByMessage=new Map(),seenAssistantIds=new Set(),processingAssistantIds=new Set();
let activeRoot=null,rootQueued=false;
const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const PROMPTS=Object.freeze([
 {id:'training',koLabel:'오늘 운동 강도',enLabel:"Today's training",koPrompt:'오늘 운동 강도를 내 기록 기준으로 정해줘',enPrompt:"Set today's training intensity based on my records."},
 {id:'recent',koLabel:'최근 운동 분석',enLabel:'Recent workouts',koPrompt:'내 최근 운동 기록을 분석해줘',enPrompt:'Analyze my recent workout records.'},
 {id:'nutrition',koLabel:'오늘 식단 분석',enLabel:"Today's nutrition",koPrompt:'오늘 저장된 식단 기록을 분석해줘',enPrompt:"Analyze today's nutrition based on my saved meals."},
 {id:'recovery',koLabel:'회복 상태',enLabel:'Recovery',koPrompt:'오늘 회복 상태를 알려줘',enPrompt:'How is my recovery today?'},
 {id:'plan',koLabel:'계획 만들기',enLabel:'Create plan',koPrompt:'오늘 계획을 만들어줘',enPrompt:'Create a plan for today.'}
]);

function contextFromState(state){const s=state||{};return {profile:clone(s.profile||null),userModel:clone(s.userModel||s.onboarding||null),recent:{workouts:clone((s.workouts||[]).slice(-30)),meals:clone((s.meals||[]).slice(-30)),runs:clone((s.runs||[]).slice(-20)),body:clone((s.body||[]).slice(-20)),planner:clone((s.planner||[]).slice(-30))},memory:{entries:clone((s.memory?.entries||[]).filter(x=>x?.userConfirmed!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())).slice(-40))}};}
function toolLabel(tool){const ko={createPlan:'계획 생성',updatePlan:'계획 수정',saveMemory:'기억 저장',deleteRecord:'기록 삭제',updateGoal:'목표 변경'},en={createPlan:'Create plan',updatePlan:'Update plan',saveMemory:'Save memory',deleteRecord:'Delete record',updateGoal:'Update goal'};return (english()?en:ko)[tool]||tool;}
function proposalSummary(proposal){const a=proposal.args||{};if(proposal.tool==='createPlan')return a.title||'';if(proposal.tool==='updatePlan')return `${a.id||''}${a.title?` · ${a.title}`:''}`;if(proposal.tool==='saveMemory')return `${a.key||''}${a.value?` · ${a.value}`:''}`;if(proposal.tool==='deleteRecord')return `${a.domain||''} · ${a.id||''}`;if(proposal.tool==='updateGoal')return a.goal||'';return JSON.stringify(a);}
function renderProposalCard(messageEl,entry){const body=messageEl.querySelector('.g2-message-body');if(!body)return;let wrap=body.querySelector('.g4-agent-proposals');if(!wrap){wrap=document.createElement('div');wrap.className='g4-agent-proposals';body.appendChild(wrap);}const {proposal}=entry;let card=wrap.querySelector(`[data-g4-proposal="${CSS.escape(proposal.id)}"]`);if(!card){card=document.createElement('section');card.className='g4-agent-proposal';card.dataset.g4Proposal=proposal.id;wrap.appendChild(card);}const status=entry.status||proposal.status||'pending',pending=status==='pending',renderKey=`${english()?'en':'ko'}:${status}:${proposal.tool}:${proposalSummary(proposal)}`;if(card.dataset.renderKey===renderKey)return;card.dataset.status=status;card.dataset.renderKey=renderKey;card.innerHTML=`<div class="g4-proposal-head"><span>${english()?'ACTION PROPOSAL':'행동 제안'}</span><b>${esc(toolLabel(proposal.tool))}</b></div><p>${esc(proposalSummary(proposal))}</p><div class="g4-proposal-state">${pending?(english()?'Nothing changes until you approve this action.':'승인하기 전에는 아무것도 변경되지 않습니다.'):(status==='confirmed'?(english()?'Approved and applied.':'승인되어 적용되었습니다.'):(status==='rejected'?(english()?'Rejected. No data was changed.':'거절되었습니다. 데이터는 변경되지 않았습니다.'):(english()?'This proposal is no longer active.':'이 제안은 더 이상 활성 상태가 아닙니다.')))}</div>${pending?`<div class="g4-proposal-actions"><button type="button" data-g4-reject>${english()?'Reject':'거절'}</button><button type="button" class="approve" data-g4-approve>${english()?'Approve':'승인'}</button></div>`:''}`;if(pending){card.querySelector('[data-g4-reject]').onclick=()=>resolveProposal(messageEl,entry,false);card.querySelector('[data-g4-approve]').onclick=()=>resolveProposal(messageEl,entry,true);}}
function resolveProposal(messageEl,entry,approved){if(entry.status&&entry.status!=='pending')return;try{const result=entry.session.confirm(entry.proposal.id,approved);entry.status=result.proposal.status;entry.result=result.result;renderProposalCard(messageEl,entry);window.dispatchEvent(new CustomEvent('garang:agent-proposal-resolved',{detail:{id:entry.proposal.id,tool:entry.proposal.tool,status:entry.status}}));}catch(error){entry.status='expired';entry.error=String(error?.message||error);renderProposalCard(messageEl,entry);}}
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
 }catch(error){
  messageEl.dataset.g4AgentPending='1';console.warn('[GARANG] Agent E2E layer deferred',error);
 }finally{processingAssistantIds.delete(messageId);}
}
function promptSignature(){const isEn=english();return PROMPTS.map(item=>`${item.id}\u0001${isEn?item.enLabel:item.koLabel}\u0001${item.koPrompt}`).join('\u0002');}
function currentPromptSignature(strip){return strip.dataset.garangPromptSignature||'';}
function submitPrompt(root,input,prompt){
 input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));
 const send=root.querySelector('.g2-send');if(typeof send?.onclick==='function')send.onclick.call(send,{type:'garang-coach-submit',target:send,currentTarget:send,preventDefault(){},stopPropagation(){}});
}
function syncPromptStrip(root){
 const composerWrap=root.querySelector('.g2-composer-wrap'),composer=root.querySelector('.g2-composer'),input=root.querySelector('.g2-composer textarea');if(!composerWrap||!composer||!input)return;
 const legacy=root.querySelector('.g2-empty-chat .g2-prompts');if(legacy?.isConnected)legacy.remove();
 let strip=composerWrap.querySelector('.g4-prompt-strip');
 if(!strip){strip=document.createElement('div');strip.className='g4-prompt-strip';composerWrap.insertBefore(strip,composer);}
 if(strip.nextElementSibling!==composer)composerWrap.insertBefore(strip,composer);
 strip.dataset.garangPromptOwner='coach-agent-v4';strip.dataset.garangPersistent='1';
 const placeholder=english()?'Message GARANG':'GARANG에게 메시지 보내기';
 if(input.placeholder!==placeholder)input.placeholder=placeholder;
 if(input.getAttribute('aria-label')!==placeholder)input.setAttribute('aria-label',placeholder);
 const wanted=promptSignature();if(currentPromptSignature(strip)===wanted)return;
 const isEn=english();
 strip.innerHTML=PROMPTS.map(item=>`<button type="button" data-g4-prompt="${esc(isEn?item.enPrompt:item.koPrompt)}" data-garang-canonical-prompt="${esc(item.koPrompt)}" data-garang-prompt-id="${item.id}">${esc(isEn?item.enLabel:item.koLabel)}</button>`).join('');
 strip.dataset.garangPromptSignature=wanted;
 strip.querySelectorAll('[data-garang-canonical-prompt]').forEach(button=>{button.onclick=()=>submitPrompt(root,input,button.dataset.garangCanonicalPrompt||'');});
}
function syncProposalLanguage(root){root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>{const entries=sessionsByMessage.get(message.dataset.messageId);if(entries)entries.forEach(entry=>renderProposalCard(message,entry));});}
function syncRoot(root){if(root!==activeRoot||!root.isConnected)return;syncPromptStrip(root);syncProposalLanguage(root);root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(processAssistant);}
function queueRootSync(root=activeRoot){if(!root||root!==activeRoot||rootQueued)return;rootQueued=true;requestAnimationFrame(()=>{rootQueued=false;syncRoot(root);});}
function activateRoot(root){
 if(!root||!root.isConnected)return;
 if(activeRoot===root){queueRootSync(root);return;}
 activeRoot=root;rootQueued=false;
 root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>seenAssistantIds.add(message.dataset.messageId));
 syncPromptStrip(root);queueRootSync(root);
}
function syncLifecycleRoot(){
 const root=main.querySelector('.garang-coach-v2');
 if(!root){if(activeRoot&&!activeRoot.isConnected){activeRoot=null;rootQueued=false;}return;}
 activateRoot(root);
}
window.addEventListener('garang:screen-rendered',syncLifecycleRoot);
window.addEventListener('garang:coach-mounted',syncLifecycleRoot);
window.addEventListener('garang:coach-message-rendered',()=>queueRootSync(activeRoot));
window.addEventListener('garang:state-hydrated',()=>queueRootSync(activeRoot));
new MutationObserver(()=>queueRootSync(activeRoot)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:cloud-state-ready',()=>queueRootSync(activeRoot));
window.addEventListener('garang:agent-write',()=>queueRootSync(activeRoot));
window.GarangCoachAgentV4=Object.freeze({version:'garang-coach-agent-v4.6',prompts:PROMPTS});
syncLifecycleRoot();
})();
