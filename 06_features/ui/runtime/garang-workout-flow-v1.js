/* GARANG Workout Flow v1
   One workout feature, three quiet surfaces: overview -> exercise -> log -> overview.
   Existing app rendering and bindings remain the source of truth.
*/
(function(root){
'use strict';
if(!root||root.__garangWorkoutFlowV1)return;
root.__garangWorkoutFlowV1=true;
let active='overview';
const styleId='garang-workout-flow-v1-style';
function ensureStyle(){
 if(document.getElementById(styleId))return;
 const style=document.createElement('style');style.id=styleId;style.textContent=`
.gwf-nav{display:flex;align-items:center;gap:7px;margin:0 0 18px;padding:4px;border-bottom:1px solid rgba(242,239,233,.1);overflow-x:auto;scrollbar-width:none}.gwf-nav::-webkit-scrollbar{display:none}.gwf-step{flex:1 0 auto;min-width:0;padding:9px 12px;border:0;border-radius:999px;background:transparent;color:#777d77;font:500 9px/1 var(--g2-ui,system-ui);letter-spacing:.04em;white-space:nowrap}.gwf-step.active{background:rgba(79,174,146,.12);color:#e9e8e2}.gwf-step em{display:block;margin-top:4px;color:#4fae92;font-size:7px;font-style:normal;letter-spacing:.14em}.gwf-next{display:flex;justify-content:flex-end;margin:18px 0 0}.gwf-next button{border:1px solid rgba(79,174,146,.3);border-radius:999px;background:transparent;color:#e9e8e2;padding:10px 14px;font:500 10px/1 var(--g2-ui,system-ui)}.gwf-panel-note{margin:-8px 0 16px;color:#7c807b;font-size:10px;line-height:1.5}.gwf-overview .workout-visual-hero{margin-bottom:0}.gwf-exercise .exercise-visual-library{margin-top:0}.gwf-log .workout-builder{margin-top:0}@media(max-width:700px){.gwf-nav{margin-left:-2px;margin-right:-2px}.gwf-step{padding:9px 10px;font-size:8px}.gwf-next{margin-top:14px}}`;
 document.head.appendChild(style);
}
function direct(main,selector){return main.querySelector(':scope > '+selector);}
function button(label,next){const wrap=document.createElement('div');wrap.className='gwf-next';const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.gwfNext=next;wrap.appendChild(b);return wrap;}
function mount(){
 const main=document.getElementById('main');if(!main||main.dataset.garangScreen!=='workout')return;
 ensureStyle();
 const head=direct(main,'.page-head'),hero=direct(main,'.workout-visual-hero'),library=direct(main,'.exercise-visual-library'),builder=direct(main,'.workout-builder'),cert=direct(main,'.cert-entry-card'),history=direct(main,'.compact-history'),insights=direct(main,'.record-insights'),libraryTitle=hero?.nextElementSibling?.matches('.section-title')?hero.nextElementSibling:null;
 if(!hero||!library||!builder)return;
 let nav=main.querySelector(':scope > .gwf-nav');
 if(!nav){nav=document.createElement('nav');nav.className='gwf-nav';nav.setAttribute('aria-label','운동 흐름');if(head)head.insertAdjacentElement('afterend',nav);else main.insertAdjacentElement('afterbegin',nav);}
 nav.innerHTML=[['overview','Overview','개요'],['exercise','Exercise','종목'],['log','Log','기록']].map(([id,en,ko])=>'<button type="button" class="gwf-step '+(active===id?'active':'')+'" data-gwf-step="'+id+'">'+en+'<em>'+ko+'</em></button>').join('');
 nav.querySelectorAll('[data-gwf-step]').forEach(b=>b.onclick=()=>{active=b.dataset.gwfStep;mount();});
 const all=[hero,libraryTitle,library,builder,cert,history,insights].filter(Boolean);
 all.forEach(n=>{n.hidden=false;n.removeAttribute('data-gwf-hidden');});
 const show=(n,on)=>{if(!n)return;n.hidden=!on;if(!on)n.dataset.gwfHidden='1';};
 show(hero,active==='overview');show(libraryTitle,active==='exercise');show(library,active==='exercise');show(builder,active==='log');show(cert,active==='log');show(history,active==='overview');show(insights,active==='overview');
 let note=main.querySelector(':scope > .gwf-panel-note');if(note)note.remove();
 let next=main.querySelector(':scope > .gwf-next');if(next)next.remove();
 const noteText={overview:'운동 상태와 최근 누적을 확인한 뒤, 필요한 종목을 선택합니다.',exercise:'오늘 수행할 종목만 고르고, 기록 화면으로 이동합니다.',log:'같은 중량 세트와 세트별 중량을 한 입력 흐름에서 기록합니다.'};
 nav.insertAdjacentHTML('afterend','<p class="gwf-panel-note">'+noteText[active]+'</p>');
 const nextMap={overview:['종목 선택으로','exercise'],exercise:['기록 시작','log'],log:['운동 개요로 돌아가기','overview']};
 main.appendChild(button(nextMap[active][0],nextMap[active][1]));
}
root.addEventListener('garang:screen-rendered',mount);
root.addEventListener('garang:route-completed',mount);
if(document.readyState!=='loading')root.requestAnimationFrame(mount);else document.addEventListener('DOMContentLoaded',mount);
})(typeof globalThis!=='undefined'?globalThis:window);
