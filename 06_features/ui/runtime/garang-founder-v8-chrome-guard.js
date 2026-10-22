/* GARANG Founder v8 chrome guard — owns legacy topbar suppression plus canonical Menu and four primary nav buttons. */
(()=>{
'use strict';
if(window.GarangFounderV8ChromeGuard)return;
const VERSION='8.0.8';
let navObserver=null,mainObserver=null,observedNav=null,observedMain=null,menuOwner=null,queued=false;
const labels={today:'오늘',log:'기록',coach:'코치',progress:'누적'};
function ensureChromeStyle(){
  if(document.getElementById('garangFounderV8ChromeStyle'))return;
  const style=document.createElement('style');
  style.id='garangFounderV8ChromeStyle';
  style.textContent='html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]::before,html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]::after{content:none!important;display:none!important}';
  document.head.appendChild(style);
}
function mountMenu(){
  const main=document.getElementById('main');
  const menu=menuOwner||document.getElementById('menuBtn');
  if(menu&&!menuOwner)menuOwner=menu;
  if(!main||!menu||main.dataset.garangScreen!=='today')return;
  const host=main.querySelector('.g8-today .g8-today-header-actions');
  if(!host)return;
  if(menu.parentElement!==host)host.appendChild(menu);
  menu.hidden=false;
  menu.removeAttribute('aria-hidden');
  menu.removeAttribute('tabindex');
  menu.style.setProperty('display','grid','important');
  menu.style.setProperty('place-items','center','important');
  menu.style.setProperty('visibility','visible','important');
  menu.style.setProperty('opacity','1','important');
  menu.style.setProperty('pointer-events','auto','important');
  menu.style.setProperty('width','40px','important');
  menu.style.setProperty('min-width','40px','important');
  menu.style.setProperty('height','40px','important');
  menu.style.setProperty('min-height','40px','important');
  menu.style.setProperty('margin','0','important');
  menu.style.setProperty('padding','0','important');
  menu.style.setProperty('border','1px solid var(--g8-line)','important');
  menu.style.setProperty('border-radius','999px','important');
  menu.style.setProperty('background','#fff','important');
  menu.style.setProperty('color','var(--g8-ink)','important');
  menu.style.setProperty('box-shadow','none','important');
}
function observeMain(main){
  if(!main||main===observedMain)return;
  mainObserver?.disconnect();observedMain=main;
  mainObserver=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'&&(r.addedNodes?.length||r.removedNodes?.length)))schedule();
  });
  mainObserver.observe(main,{subtree:true,childList:true});
}
function ownNavGeometry(nav){
  nav.style.setProperty('position','fixed','important');
  nav.style.setProperty('left','50%','important');
  nav.style.setProperty('right','auto','important');
  nav.style.setProperty('top','auto','important');
  nav.style.setProperty('bottom','calc(8px + env(safe-area-inset-bottom, 0px))','important');
  nav.style.setProperty('translate','none','important');
  nav.style.setProperty('transform','translateX(-50%)','important');
  nav.style.setProperty('width','min(calc(100% - 20px), 410px)','important');
  nav.style.setProperty('max-width','410px','important');
  nav.style.setProperty('height','66px','important');
  nav.style.setProperty('min-height','66px','important');
  nav.style.setProperty('margin','0','important');
  nav.style.setProperty('padding','6px','important');
  nav.style.setProperty('box-sizing','border-box','important');
  nav.style.setProperty('grid-template-columns','repeat(4,minmax(0,1fr))','important');
  nav.style.setProperty('gap','3px','important');
  nav.style.setProperty('contain','none','important');
  nav.style.setProperty('backdrop-filter','none','important');
  nav.style.setProperty('-webkit-backdrop-filter','none','important');
  nav.style.setProperty('z-index','2500','important');
}
function fix(){
  queued=false;
  if(!document.documentElement.classList.contains('garang-v8'))return;
  ensureChromeStyle();
  if(!menuOwner)menuOwner=document.getElementById('menuBtn');
  const main=document.getElementById('main');
  observeMain(main);
  mountMenu();
  const app=document.getElementById('appView');
  const top=app?.querySelector(':scope > .topbar');
  if(top){top.hidden=true;top.setAttribute('aria-hidden','true');top.style.setProperty('display','none','important');top.style.setProperty('height','0','important');top.style.setProperty('min-height','0','important');top.style.setProperty('margin','0','important');top.style.setProperty('padding','0','important');}
  if(app){app.style.setProperty('display','block','important');app.style.setProperty('grid-template-rows','none','important');app.style.setProperty('padding','0','important');app.style.setProperty('margin','0','important');app.style.setProperty('top','0','important');}
  if(main){main.style.setProperty('margin-top','0','important');main.style.setProperty('top','0','important');main.style.setProperty('transform','none','important');}
  const nav=document.getElementById('bottomNav');
  if(!nav)return;
  nav.hidden=false;nav.removeAttribute('aria-hidden');nav.style.setProperty('display','grid','important');ownNavGeometry(nav);
  [...nav.querySelectorAll('button[data-garang-primary-nav="1"]')].forEach(button=>{
    button.hidden=false;button.removeAttribute('aria-hidden');button.removeAttribute('tabindex');button.style.setProperty('display','flex','important');button.style.setProperty('visibility','visible','important');button.style.setProperty('opacity','1','important');button.style.setProperty('pointer-events','auto','important');button.style.setProperty('width','auto','important');button.style.setProperty('min-width','0','important');button.style.setProperty('font-size','0','important');
    [...button.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE&&/[A-Za-z]/.test(node.nodeValue||''))node.nodeValue='';});
    const iconSlot=button.querySelector(':scope > span:first-child');if(iconSlot){iconSlot.style.setProperty('font-size','0','important');iconSlot.style.setProperty('line-height','0','important');if(!iconSlot.children.length&&/[A-Za-z]/.test(iconSlot.textContent||''))iconSlot.textContent='';}
    const label=button.querySelector('b');const next=labels[button.dataset.page];if(label){if(next&&label.textContent!==next)label.textContent=next;label.style.setProperty('font-size','10px','important');label.style.setProperty('line-height','1.05','important');}
  });
  [...nav.querySelectorAll('button:not([data-garang-primary-nav="1"])')].forEach(button=>{button.hidden=true;button.setAttribute('aria-hidden','true');button.style.setProperty('display','none','important');});
  if(nav!==observedNav){
    navObserver?.disconnect();observedNav=nav;
    navObserver=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'||r.addedNodes?.length||r.removedNodes?.length))schedule();});
    navObserver.observe(nav,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','style','class','aria-hidden']});
  }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(fix);}
['garang:screen-rendered','garang:route-completed','garang:state-updated','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
window.GarangFounderV8ChromeGuard=Object.freeze({version:VERSION,schedule,reconcile:fix});
})();
