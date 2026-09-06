/* GARANG Coach Decision UI v1.2
   Compact-by-default decision strip for Coach.
   Details remain available on demand and plan changes still flow through the approval gate.
*/
(() => {
'use strict';
const main=document.getElementById('main');if(!main)return;
const VERSION='garang-coach-decision-v1.2';
const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const LABELS={
 collect_data:{ko:'데이터 필요',en:'More data needed'},caution:{ko:'주의',en:'Caution'},recover:{ko:'회복 우선',en:'Recovery first'},reduce:{ko:'강도 조정',en:'Reduce load'},maintain:{ko:'계획 유지',en:'Maintain'},progress:{ko:'점진 향상',en:'Progress'},goal_focus:{ko:'목표 집중',en:'Goal focus'}
};
const SIGNAL={readinessBand:{ko:'준비도',en:'Readiness'},fatigueBand:{ko:'피로',en:'Fatigue'},loadBand:{ko:'부하',en:'Load'}};
function text(pair){return english()?pair?.en:pair?.ko;}
function ensureStyle(){
 if(document.getElementById('garang-coach-decision-v1-style'))return;
 const style=document.createElement('style');style.id='garang-coach-decision-v1-style';style.textContent=`
section.garang-decision-card{margin:10px 0 12px!important;padding:0!important;min-height:0!important;height:auto!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:16px!important;background:#0b0d0b!important;display:block!important;box-shadow:none!important}
.garang-coach-v2>.garang-decision-card{margin-left:0!important;margin-right:0!important}
.garang-decision-toggle{width:100%;min-height:56px;margin:0;padding:0 15px;border:0;background:transparent;color:inherit;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;text-align:left;cursor:pointer}
.garang-decision-kicker{font-size:10px;letter-spacing:.11em;color:#8c918b;white-space:nowrap}
.garang-decision-mode{justify-self:start;font-size:14px;font-weight:650;color:#efeee9;letter-spacing:-.01em}
.garang-decision-chevron{width:30px;height:30px;border:1px solid rgba(255,255,255,.12);border-radius:999px;display:grid;place-items:center;color:#a8ada7;font-size:16px;line-height:1;transition:transform .18s ease,background .18s ease}
.garang-decision-card[data-expanded="true"] .garang-decision-chevron{transform:rotate(180deg);background:rgba(255,255,255,.04)}
.garang-decision-details{padding:0 15px 14px;border-top:1px solid rgba(255,255,255,.075)}
.garang-decision-details[hidden]{display:none!important}
.garang-decision-summary{margin:13px 0 10px;font-size:12px;line-height:1.6;color:#b8bbb6;word-break:keep-all}
.garang-decision-signals{display:flex;gap:6px;flex-wrap:wrap}
.garang-decision-signals span{font-size:10px;padding:5px 7px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:#8f958f}
.garang-decision-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;font-size:9px;color:#727873}
.garang-decision-action{border:1px solid rgba(88,170,145,.28);background:#0d1b17;color:#b8d8ce;border-radius:9px;padding:8px 10px;font-size:10px;cursor:pointer;white-space:nowrap}
.garang-decision-action:hover,.garang-decision-action:focus-visible{border-color:rgba(88,170,145,.46);outline:none}
@media(max-width:800px){
 section.garang-decision-card{margin:8px 0 10px!important;border-radius:14px!important}
 .garang-decision-toggle{min-height:52px;padding:0 13px;grid-template-columns:auto 1fr auto;gap:10px}
 .garang-decision-kicker{font-size:9px}.garang-decision-mode{font-size:13px}.garang-decision-chevron{width:28px;height:28px;font-size:15px}
 .garang-decision-details{padding:0 13px 13px}.garang-decision-foot{align-items:flex-end}.garang-decision-action{padding:8px 9px}
}
`;document.head.appendChild(style);
}
function placeCard(root,card,wrap,composer){
 const head=root.querySelector('.g2-chat-head,.coach-app-head');
 if(head?.parentNode){if(head.nextElementSibling!==card)head.parentNode.insertBefore(card,head.nextSibling);return;}
 const thread=root.querySelector('.g2-chat-main,.g2-thread,.coach-thread,#coachChat');
 if(thread?.parentNode){if(thread.previousElementSibling!==card)thread.parentNode.insertBefore(card,thread);return;}
 if(wrap&&composer&&card.parentNode!==wrap)wrap.insertBefore(card,wrap.querySelector('.g4-prompt-strip')||composer);
}
function setExpanded(card,expanded){
 card.dataset.expanded=expanded?'true':'false';
 const toggle=card.querySelector('.garang-decision-toggle'),details=card.querySelector('.garang-decision-details');
 if(toggle)toggle.setAttribute('aria-expanded',expanded?'true':'false');
 if(details)details.hidden=!expanded;
}
function render(){
 const root=main.querySelector('.garang-coach-v2'),Bridge=window.GarangAgentStateBridge;if(!root||!Bridge?.ready?.()||!Bridge.getDecisionContext)return;
 const wrap=root.querySelector('.g2-composer-wrap'),composer=root.querySelector('.g2-composer'),input=root.querySelector('.g2-composer textarea');if(!wrap||!composer||!input)return;
 let decision=null;try{decision=Bridge.getDecisionContext();}catch{return;}if(!decision)return;
 let card=root.querySelector('.garang-decision-card');if(!card){card=document.createElement('section');card.className='garang-decision-card';card.dataset.garangDecision=VERSION;card.dataset.expanded='false';}
 placeCard(root,card,wrap,composer);
 const isEn=english(),mode=LABELS[decision.mode]||{ko:decision.mode,en:decision.mode},confidence=Math.round((Number(decision.confidence)||0)*100),signals=decision.signals||{},summary=text(decision.summary)||'',canPlan=!!decision.actionProposal;
 const signature=JSON.stringify([isEn,decision.decisionId,decision.mode,confidence,signals,summary,canPlan]);if(card.dataset.signature===signature)return;card.dataset.signature=signature;
 const wasExpanded=card.dataset.expanded==='true';
 card.innerHTML=`<button type="button" class="garang-decision-toggle" aria-expanded="${wasExpanded?'true':'false'}"><span class="garang-decision-kicker">${isEn?'GARANG DECISION':'GARANG 판단'}</span><b class="garang-decision-mode">${esc(text(mode))}</b><span class="garang-decision-chevron" aria-hidden="true">⌄</span></button><div class="garang-decision-details" ${wasExpanded?'':'hidden'}>${summary?`<p class="garang-decision-summary">${esc(summary)}</p>`:''}<div class="garang-decision-signals"><span>${text(SIGNAL.readinessBand)} · ${esc(signals.readinessBand||'unknown')}</span><span>${text(SIGNAL.fatigueBand)} · ${esc(signals.fatigueBand||'unknown')}</span><span>${text(SIGNAL.loadBand)} · ${esc(signals.loadBand||'unknown')}</span></div><div class="garang-decision-foot"><span>${isEn?'Confidence':'판단 신뢰도'} ${confidence}% · ${isEn?'No silent changes':'자동 변경 없음'}</span>${canPlan?`<button type="button" class="garang-decision-action">${isEn?'Propose this plan':'계획 제안'}</button>`:''}</div></div>`;
 const toggle=card.querySelector('.garang-decision-toggle');if(toggle)toggle.onclick=()=>setExpanded(card,card.dataset.expanded!=='true');
 const button=card.querySelector('.garang-decision-action');if(button)button.onclick=()=>{input.value='오늘 계획을 만들어줘';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('.g2-send')?.click();};
}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureStyle();render();});}
new MutationObserver(queue).observe(main,{childList:true,subtree:true});new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:agent-write',queue);window.addEventListener('garang:agent-proposal-resolved',queue);window.addEventListener('online',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();});
queue();
})();
