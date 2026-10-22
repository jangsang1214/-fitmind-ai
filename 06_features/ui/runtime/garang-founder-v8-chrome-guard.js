/* GARANG Founder v8 chrome guard — only owns legacy topbar visibility and the four primary nav buttons. */
(()=>{
'use strict';
if(window.GarangFounderV8ChromeGuard)return;
const VERSION='8.0.0';
let observer=null,observedNav=null,queued=false;
const labels={today:'오늘',log:'기록',coach:'코치',progress:'누적'};
function fix(){
  queued=false;
  if(!document.documentElement.classList.contains('garang-v8'))return;
  const app=document.getElementById('appView');
  const top=app?.querySelector(':scope > .topbar');
  if(top){top.hidden=true;top.setAttribute('aria-hidden','true');top.style.setProperty('display','none','important');top.style.setProperty('height','0','important');top.style.setProperty('min-height','0','important');top.style.setProperty('margin','0','important');top.style.setProperty('padding','0','important');}
  if(app){app.style.setProperty('display','block','important');app.style.setProperty('grid-template-rows','none','important');app.style.setProperty('padding','0','important');app.style.setProperty('margin','0','important');app.style.setProperty('top','0','important');}
  const main=document.getElementById('main');
  if(main){main.style.setProperty('margin-top','0','important');main.style.setProperty('top','0','important');main.style.setProperty('transform','none','important');}
  const nav=document.getElementById('bottomNav');
  if(!nav)return;
  nav.hidden=false;nav.removeAttribute('aria-hidden');nav.style.setProperty('display','grid','important');
  [...nav.querySelectorAll('button[data-garang-primary-nav="1"]')].forEach(button=>{
    button.hidden=false;button.removeAttribute('aria-hidden');button.removeAttribute('tabindex');button.style.setProperty('display','flex','important');button.style.setProperty('visibility','visible','important');button.style.setProperty('opacity','1','important');button.style.setProperty('pointer-events','auto','important');const label=button.querySelector('b');const next=labels[button.dataset.page];if(label&&next)label.textContent=next;
  });
  [...nav.querySelectorAll('button:not([data-garang-primary-nav="1"])')].forEach(button=>{button.hidden=true;button.setAttribute('aria-hidden','true');button.style.setProperty('display','none','important');});
  if(nav!==observedNav){
    observer?.disconnect();observedNav=nav;
    observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'||r.addedNodes?.length||r.removedNodes?.length))schedule();});
    observer.observe(nav,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','style','class','aria-hidden']});
  }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(fix);}
['garang:screen-rendered','garang:route-completed','garang:state-updated','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
window.GarangFounderV8ChromeGuard=Object.freeze({version:VERSION,schedule,reconcile:fix});
})();
