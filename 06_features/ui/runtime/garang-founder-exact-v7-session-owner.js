/* GARANG Founder Exact v7 — canonical Workout session action mount. */
(()=>{
'use strict';
if(window.__garangExactV7SessionOwner)return;window.__garangExactV7SessionOwner=true;
function workoutMain(){const m=document.getElementById('main');return m?.dataset?.garangScreen==='workout'?m:null;}
function active(m){return !!m?.querySelector('.workout-session-bar.is-live');}
function ensureStartHost(m){let host=m.querySelector(':scope > .g7-session-start-host');if(host)return host;host=document.createElement('div');host.className='g7-session-start-host';const media=m.querySelector(':scope > .g7-workout-media');if(media)media.insertAdjacentElement('afterend',host);else m.prepend(host);return host;}
function ensureFinishHost(m){let host=m.querySelector(':scope > .g7-record-finish');if(host)return host;host=document.createElement('div');host.className='g7-record-finish';const builder=m.querySelector('.workout-execution-v2,.workout-builder-v2');if(builder)builder.insertAdjacentElement('afterend',host);else m.appendChild(host);return host;}
function showControl(node,display='grid'){if(!node)return;node.hidden=false;node.removeAttribute('hidden');node.removeAttribute('aria-hidden');node.disabled=false;node.style.setProperty('display',display,'important');node.style.setProperty('visibility','visible','important');node.style.setProperty('pointer-events','auto','important');}
function hideControl(node){if(!node)return;node.hidden=true;node.setAttribute('hidden','');node.style.setProperty('display','none','important');}
function sync(){const m=workoutMain();if(!m)return;const live=active(m),start=document.getElementById('startWorkoutSession'),finish=document.getElementById('finishWorkoutSession'),startHost=ensureStartHost(m),finishHost=ensureFinishHost(m);
 if(start){if(!live){if(start.parentElement!==startHost)startHost.appendChild(start);showControl(start);startHost.hidden=false;startHost.style.setProperty('display','block','important');}else{hideControl(start);startHost.hidden=true;startHost.style.setProperty('display','none','important');}}
 const record=m.classList.contains('g7-record-mode');
 if(finish&&live&&record){if(finish.parentElement!==finishHost)finishHost.appendChild(finish);finish.textContent='세션 완료';showControl(finish);finishHost.hidden=false;finishHost.style.setProperty('display','block','important');}
 else if(finishHost){finishHost.hidden=true;finishHost.style.setProperty('display','none','important');}
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(e=>window.addEventListener(e,schedule,{passive:true}));document.addEventListener('click',()=>setTimeout(schedule,0),true);window.GarangExactV7SessionOwner=Object.freeze({sync:schedule});schedule();
})();