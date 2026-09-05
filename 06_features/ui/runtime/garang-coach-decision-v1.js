/* GARANG Coach Decision UI v1
   Surfaces the deterministic Stage 3 decision above Coach prompts.
   It never writes data directly. Plan changes still flow through the existing approval gate.
*/
(() => {
'use strict';
const main=document.getElementById('main');if(!main)return;
const VERSION='garang-coach-decision-v1';
const english=()=>document.documentElement.lang==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const LABELS={
 collect_data:{ko:'데이터 필요',en:'More data needed'},caution:{ko:'주의',en:'Caution'},recover:{ko:'회복 우선',en:'Recovery first'},reduce:{ko:'강도 조정',en:'Reduce load'},maintain:{ko:'계획 유지',en:'Maintain'},progress:{ko:'점진 향상',en:'Progress'},goal_focus:{ko:'목표 집중',en:'Goal focus'}
};
const SIGNAL={readinessBand:{ko:'준비도',en:'Readiness'},fatigueBand:{ko:'피로',en:'Fatigue'},loadBand:{ko:'부하',en:'Load'}};
function text(pair){return english()?pair?.en:pair?.ko;}
function ensureStyle(){if(document.getElementById('garang-coach-decision-v1-style'))return;const style=document.createElement('style');style.id='garang-coach-decision-v1-style';style.textContent=`
.garang-decision-card{margin:0 0 8px;padding:12px 13px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(255,255,255,.035);display:grid;gap:8px}
.garang-decision-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.86}.garang-decision-head b{font-size:12px;letter-spacing:0;text-transform:none;opacity:1}
.garang-decision-summary{margin:0;font-size:13px;line-height:1.5}.garang-decision-signals{display:flex;gap:6px;flex-wrap:wrap}.garang-decision-signals span{font-size:11px;padding:5px 7px;border:1px solid rgba(255,255,255,.1);border-radius:999px;opacity:.82}
.garang-decision-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;opacity:.7}.garang-decision-action{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;border-radius:10px;padding:7px 10px;font-size:11px;cursor:pointer}
@media(max-width:800px){.garang-decision-card{padding:10px 11px}.garang-decision-foot{align-items:flex-end}.garang-decision-action{padding:7px 9px}}
`;document.head.appendChild(style);}
function render(){
 const root=main.querySelector('.garang-coach-v2'),Bridge=window.GarangAgentStateBridge;if(!root||!Bridge?.ready?.()||!Bridge.getDecisionContext)return;
 const wrap=root.querySelector('.g2-composer-wrap'),composer=root.querySelector('.g2-composer'),input=root.querySelector('.g2-composer textarea');if(!wrap||!composer||!input)return;
 let decision=null;try{decision=Bridge.getDecisionContext();}catch{return;}if(!decision)return;
 let card=wrap.querySelector('.garang-decision-card');if(!card){card=document.createElement('section');card.className='garang-decision-card';card.dataset.garangDecision=VERSION;wrap.insertBefore(card,wrap.querySelector('.g4-prompt-strip')||composer);}
 const isEn=english(),mode=LABELS[decision.mode]||{ko:decision.mode,en:decision.mode},confidence=Math.round((Number(decision.confidence)||0)*100),signals=decision.signals||{},summary=text(decision.summary)||'',canPlan=!!decision.actionProposal;
 const signature=JSON.stringify([isEn,decision.decisionId,decision.mode,confidence,signals,summary,canPlan]);if(card.dataset.signature===signature)return;card.dataset.signature=signature;
 card.innerHTML=`<div class="garang-decision-head"><span>${isEn?'GARANG DECISION':'GARANG 판단'}</span><b>${esc(text(mode))}</b></div><p class="garang-decision-summary">${esc(summary)}</p><div class="garang-decision-signals"><span>${text(SIGNAL.readinessBand)} · ${esc(signals.readinessBand||'unknown')}</span><span>${text(SIGNAL.fatigueBand)} · ${esc(signals.fatigueBand||'unknown')}</span><span>${text(SIGNAL.loadBand)} · ${esc(signals.loadBand||'unknown')}</span></div><div class="garang-decision-foot"><span>${isEn?'Confidence':'판단 신뢰도'} ${confidence}% · ${isEn?'No silent changes':'자동 변경 없음'}</span>${canPlan?`<button type="button" class="garang-decision-action">${isEn?'Propose this plan':'이 판단으로 계획 제안'}</button>`:''}</div>`;
 const button=card.querySelector('.garang-decision-action');if(button)button.onclick=()=>{input.value='오늘 계획을 만들어줘';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('.g2-send')?.click();};
}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureStyle();render();});}
new MutationObserver(queue).observe(main,{childList:true,subtree:true});new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:agent-write',queue);window.addEventListener('garang:agent-proposal-resolved',queue);window.addEventListener('online',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();});
queue();
})();
