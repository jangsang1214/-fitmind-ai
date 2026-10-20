/* GARANG Founder Exact v7 — canonical Workout session action mount. */
(()=>{
'use strict';
if(window.__garangExactV7SessionOwner)return;window.__garangExactV7SessionOwner=true;
function workoutMain(){const m=document.getElementById('main');return m?.dataset?.garangScreen==='workout'?m:null;}
function active(m){return !!m?.querySelector('.workout-session-bar.is-live');}
function ensureStartHost(m){let host=m.querySelector(':scope > .g7-session-start-host');if(host)return host;host=document.createElement('div');host.className='g7-session-start-host';const media=m.querySelector(':scope > .g7-workout-media');if(media)media.insertAdjacentElement('afterend',host);else m.prepend(host);return host;}
function sync(){const m=workoutMain();if(!m)return;const start=document.getElementById('startWorkoutSession');if(!start)return;const host=ensureStartHost(m);if(!active(m)){
 if(start.parentElement!==host)host.appendChild(start);
 start.hidden=false;start.removeAttribute('hidden');start.disabled=false;start.removeAttribute('aria-hidden');
 start.style.setProperty('display','grid','important');start.style.setProperty('visibility','visible','important');start.style.setProperty('pointer-events','auto','important');
 host.hidden=false;host.style.setProperty('display','block','important');
}else{
 start.hidden=true;start.setAttribute('hidden','');start.style.setProperty('display','none','important');host.hidden=true;host.style.setProperty('display','none','important');
}
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(e=>window.addEventListener(e,schedule,{passive:true}));document.addEventListener('click',()=>setTimeout(schedule,0),true);window.GarangExactV7SessionOwner=Object.freeze({sync:schedule});schedule();
})();