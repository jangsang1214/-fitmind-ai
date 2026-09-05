/* GARANG Coach Agent v4
   - Persistent bilingual recommended questions above the composer.
   - Mock Agent Contract E2E: question -> context -> tool proposal -> approval -> write.
   - Existing local Coach answer remains the visible analysis until a real LLM adapter is connected.
*/
(() => {
'use strict';

const main=document.getElementById('main');
if(!main)return;
const sessionsByMessage=new Map();
const seenAssistantIds=new Set();
let rootObserver=null;
let activeRoot=null;

const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const prompts=()=>english()?[
 {label:'Today’s training',prompt:"Set today's training intensity based on my records."},
 {label:'Recent workouts',prompt:'Analyze my recent workout records.'},
 {label:'Today’s nutrition',prompt:"Analyze today's nutrition based on my saved meals."},
 {label:'Recovery',prompt:'How is my recovery today?'},
 {label:'Create plan',prompt:'Create a plan for today.'}
]:[
 {label:'오늘 운동 강도',prompt:'오늘 운동 강도를 내 기록 기준으로 정해줘'},
 {label:'최근 운동 분석',prompt:'내 최근 운동 기록을 분석해줘'},
 {label:'오늘 식단 분석',prompt:'오늘 저장된 식단 기록을 분석해줘'},
 {label:'회복 상태',prompt:'오늘 회복 상태를 알려줘'},
 {label:'계획 만들기',prompt:'오늘 계획을 만들어줘'}
];

function contextFromState(state){
 const s=state||{};
 return {
  profile:clone(s.profile||null),
  userModel:clone(s.userModel||s.onboarding||null),
  recent:{
   workouts:clone((s.workouts||[]).slice(-30)),
   meals:clone((s.meals||[]).slice(-30)),
   runs:clone((s.runs||[]).slice(-20)),
   body:clone((s.body||[]).slice(-20)),
   planner:clone((s.planner||[]).slice(-30))
  },
  memory:{entries:clone((s.memory?.entries||[]).filter(x=>x?.userConfirmed!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())).slice(-40))}
 };
}

function toolLabel(tool){
 const ko={createPlan:'계획 생성',updatePlan:'계획 수정',saveMemory:'기억 저장',deleteRecord:'기록 삭제',updateGoal:'목표 변경'};
 const en={createPlan:'Create plan',updatePlan:'Update plan',saveMemory:'Save memory',deleteRecord:'Delete record',updateGoal:'Update goal'};
 return (english()?en:ko)[tool]||tool;
}
function proposalSummary(proposal){
 const a=proposal.args||{};
 if(proposal.tool==='createPlan')return a.title||'';
 if(proposal.tool==='updatePlan')return `${a.id||''}${a.title?` · ${a.title}`:''}`;
 if(proposal.tool==='saveMemory')return `${a.key||''}${a.value?` · ${a.value}`:''}`;
 if(proposal.tool==='deleteRecord')return `${a.domain||''} · ${a.id||''}`;
 if(proposal.tool==='updateGoal')return a.goal||'';
 return JSON.stringify(a);
}

function renderProposalCard(messageEl,entry){
 const body=messageEl.querySelector('.g2-message-body');if(!body)return;
 let wrap=body.querySelector('.g4-agent-proposals');
 if(!wrap){wrap=document.createElement('div');wrap.className='g4-agent-proposals';body.appendChild(wrap);}
 const {proposal}=entry;
 let card=wrap.querySelector(`[data-g4-proposal="${CSS.escape(proposal.id)}"]`);
 if(!card){card=document.createElement('section');card.className='g4-agent-proposal';card.dataset.g4Proposal=proposal.id;wrap.appendChild(card);}
 const status=entry.status||proposal.status||'pending';
 const pending=status==='pending';
 card.dataset.status=status;
 card.innerHTML=`<div class="g4-proposal-head"><span>${english()?'ACTION PROPOSAL':'행동 제안'}</span><b>${esc(toolLabel(proposal.tool))}</b></div><p>${esc(proposalSummary(proposal))}</p><div class="g4-proposal-state">${pending?(english()?'Nothing changes until you approve this action.':'승인하기 전에는 아무것도 변경되지 않습니다.'):(status==='confirmed'?(english()?'Approved and applied.':'승인되어 적용되었습니다.'):(status==='rejected'?(english()?'Rejected. No data was changed.':'거절되었습니다. 데이터는 변경되지 않았습니다.'):(english()?'This proposal is no longer active.':'이 제안은 더 이상 활성 상태가 아닙니다.')))}</div>${pending?`<div class="g4-proposal-actions"><button type="button" data-g4-reject>${english()?'Reject':'거절'}</button><button type="button" class="approve" data-g4-approve>${english()?'Approve':'승인'}</button></div>`:''}`;
 if(pending){
  card.querySelector('[data-g4-reject]').onclick=()=>resolveProposal(messageEl,entry,false);
  card.querySelector('[data-g4-approve]').onclick=()=>resolveProposal(messageEl,entry,true);
 }
}

function resolveProposal(messageEl,entry,approved){
 if(entry.status&&entry.status!=='pending')return;
 try{
  const result=entry.session.confirm(entry.proposal.id,approved);
  entry.status=result.proposal.status;
  entry.result=result.result;
  renderProposalCard(messageEl,entry);
  window.dispatchEvent(new CustomEvent('garang:agent-proposal-resolved',{detail:{id:entry.proposal.id,tool:entry.proposal.tool,status:entry.status}}));
 }catch(error){
  entry.status='expired';entry.error=String(error?.message||error);renderProposalCard(messageEl,entry);
 }
}

function attachStoredProposals(messageEl,messageId){
 const entries=sessionsByMessage.get(messageId);if(!entries)return false;
 entries.forEach(entry=>renderProposalCard(messageEl,entry));return true;
}

async function processAssistant(messageEl){
 if(messageEl.dataset.thinking==='1')return;
 const messageId=messageEl.dataset.messageId||'';if(!messageId)return;
 if(attachStoredProposals(messageEl,messageId))return;
 if(seenAssistantIds.has(messageId))return;
 seenAssistantIds.add(messageId);
 const siblings=[...messageEl.parentElement.children],index=siblings.indexOf(messageEl);
 let userEl=null;
 for(let i=index-1;i>=0;i--){if(siblings[i].classList?.contains('user')){userEl=siblings[i];break;}}
 const text=userEl?.querySelector('.g2-message-text')?.textContent?.trim();if(!text)return;
 const Contract=window.GarangAgentContract,Bridge=window.GarangAgentStateBridge;
 if(!Contract||!Bridge?.ready?.())return;
 try{
  const state=Bridge.getState();
  const session=Contract.createSession({getState:()=>Bridge.getState(),applyWrite:(tool,args)=>Bridge.applyWrite(tool,args)});
  const result=await session.run({message:text,context:contextFromState(state),language:english()?'en':'ko'},{adapter:Contract.createMockAdapter()});
  const entries=result.proposals.map(proposal=>({session,proposal,status:'pending',reads:result.reads.length}));
  if(entries.length){sessionsByMessage.set(messageId,entries);entries.forEach(entry=>renderProposalCard(messageEl,entry));}
  messageEl.dataset.g4AgentProcessed='1';
 }catch(error){
  console.warn('[GARANG] Agent E2E layer skipped',error);
 }
}

function syncPromptStrip(root){
 const composerWrap=root.querySelector('.g2-composer-wrap'),composer=root.querySelector('.g2-composer'),input=root.querySelector('.g2-composer textarea');
 if(!composerWrap||!composer||!input)return;
 root.querySelector('.g2-empty-chat .g2-prompts')?.remove();
 let strip=composerWrap.querySelector('.g4-prompt-strip');
 if(!strip){strip=document.createElement('div');strip.className='g4-prompt-strip';composerWrap.insertBefore(strip,composer);}
 strip.innerHTML=prompts().map(item=>`<button type="button" data-g4-prompt="${esc(item.prompt)}">${esc(item.label)}</button>`).join('');
 strip.querySelectorAll('[data-g4-prompt]').forEach(button=>button.onclick=()=>{
  input.value=button.dataset.g4Prompt||'';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('.g2-send')?.click();
 });
 input.placeholder=english()?'Message GARANG':'GARANG에게 메시지 보내기';
 input.setAttribute('aria-label',input.placeholder);
}

function syncProposalLanguage(root){
 root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>{
  const entries=sessionsByMessage.get(message.dataset.messageId);if(entries)entries.forEach(entry=>renderProposalCard(message,entry));
 });
}

function enhance(root){
 if(activeRoot===root){syncPromptStrip(root);syncProposalLanguage(root);return;}
 activeRoot=root;
 root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>seenAssistantIds.add(message.dataset.messageId));
 syncPromptStrip(root);
 rootObserver?.disconnect();
 rootObserver=new MutationObserver(()=>{
  syncPromptStrip(root);syncProposalLanguage(root);
  root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(processAssistant);
 });
 rootObserver.observe(root,{childList:true,subtree:true});
}

function scan(){const root=main.querySelector('.garang-coach-v2');if(root)enhance(root);}
new MutationObserver(scan).observe(main,{childList:true,subtree:true});
new MutationObserver(()=>{if(activeRoot){syncPromptStrip(activeRoot);syncProposalLanguage(activeRoot);}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
scan();
})();
