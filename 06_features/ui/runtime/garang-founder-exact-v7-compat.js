/* GARANG Exact v7 compatibility facade — preserves canonical test/event contracts only. */
(()=>{
'use strict';
if(window.__garangExactV7Compat)return;window.__garangExactV7Compat=true;
function sync(){
 const main=document.getElementById('main');if(main)main.dataset.garangPresentation='v4';
 const rest=document.getElementById('workoutExecutionRest');if(rest)rest.classList.add('g4-rest-portal');
 const today=document.getElementById('garangTodayFlow');if(today&&!today.closest('.g4-today-shell')){let shell=document.querySelector('#main>.g4-today-shell');if(!shell&&main?.dataset?.garangScreen==='today'){shell=document.createElement('section');shell.className='g4-today-shell';main.insertBefore(shell,main.firstChild);shell.appendChild(today);}}
 const workout=document.getElementById('main');if(workout?.dataset?.garangScreen==='workout')workout.classList.add('g4-workout-shell');
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();window.GarangFounderExactV7?.schedule?.();});}
window.GarangPresentationV4=Object.freeze({version:'garang-presentation-v4.7.0-exact',schedule});
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(e=>window.addEventListener(e,schedule,{passive:true}));new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});schedule();
})();