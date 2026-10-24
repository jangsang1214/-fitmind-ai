/* GARANG Founder v8 chrome guard — owns legacy topbar suppression plus canonical Menu and four primary nav buttons. */
(()=>{
'use strict';
if(window.GarangFounderV8ChromeGuard)return;
const VERSION='8.1.5';
let navObserver=null,mainObserver=null,observedNav=null,observedMain=null,menuOwner=null,queued=false;
const labels={today:'오늘',log:'기록',coach:'코치',progress:'누적'};
function ensureChromeStyle(){
  if(document.getElementById('garangFounderV8ChromeStyle'))return;
  const style=document.createElement('style');
  style.id='garangFounderV8ChromeStyle';
  style.textContent=`
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]::before,
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]::after,
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]>span:first-child::after,
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]>b::before{content:none!important;display:none!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]>span:first-child{font-size:0!important;line-height:0!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]>b{display:block!important;font-size:0!important;line-height:1.05!important;color:inherit!important;white-space:nowrap!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"]>b::after{display:block!important;font:750 10px/1.05 "Noto Sans KR",-apple-system,BlinkMacSystemFont,sans-serif!important;color:inherit!important;letter-spacing:-.03em!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-page="today"]>b::after{content:"오늘"!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-page="log"]>b::after{content:"기록"!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-page="coach"]>b::after{content:"코치"!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-page="progress"]>b::after{content:"누적"!important}
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"].active,
html.garang-v8 body #bottomNav.bottom-nav>button[data-garang-primary-nav="1"][aria-current="page"]{background:var(--g8-red-soft)!important;color:var(--g8-red)!important}
html.garang-v8 body #main[data-garang-screen="today"] #garangTodayFlow.g8-canonical-today-owner>:not(.g8-today){display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}
html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-copy>span,
html.garang-v8 body #main[data-garang-screen="today"] .g8-state-card .gtf-track-copy>strong{max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:keep-all!important;text-overflow:clip!important}

html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition details:not([open])>:not(summary){display:none!important}
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-surface{background:transparent!important;color:#111!important;border-color:#e7e3dd!important}
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-head h2,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-option-copy strong,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review h2,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review-status em,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review-detail em{color:#111!important}
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-head p,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-option-copy p,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-option-copy small,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-footnote,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review>p,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review-status b,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review-detail b{color:#77736d!important}
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-eyebrow{color:#ef263d!important}
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-option,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-review-detail,
html.garang-v8 body #main[data-garang-screen="nutrition"] .g8-nutrition .gnr-alternatives{border-color:#e7e3dd!important}

html.garang-v8 body #main .g8-summary .g8-result-metrics{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin:0 0 12px!important}
html.garang-v8 body #main .g8-summary .g8-result-metrics>div{display:flex!important;min-width:0!important;min-height:74px!important;flex-direction:column!important;justify-content:space-between!important;padding:12px!important;border:1px solid #e7e3dd!important;border-radius:14px!important;background:#f7f5f1!important}
html.garang-v8 body #main .g8-summary .g8-result-metrics span{font-size:10px!important;line-height:1.2!important;color:#77736d!important}
html.garang-v8 body #main .g8-summary .g8-result-metrics strong{font-size:20px!important;line-height:1.08!important;font-weight:850!important;letter-spacing:-.035em!important;color:#111!important;overflow-wrap:anywhere!important}
html.garang-v8 body #main .g8-summary .g8-result-exercises{padding-top:12px!important;border-top:1px solid #e7e3dd!important}
html.garang-v8 body #main .g8-summary .g8-result-exercises>span{display:block!important;margin-bottom:4px!important;font-size:9px!important;letter-spacing:.08em!important;color:#99938b!important}
html.garang-v8 body #main .g8-summary .g8-result-exercises>strong{display:block!important;font-size:14px!important;line-height:1.4!important;color:#111!important}

html.garang-v8 body #main[data-garang-screen="coach"] .g8-coach .g2-composer-wrap{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;padding:8px 10px 10px!important;background:#fff!important;background-image:none!important}
html.garang-v8 body #main[data-garang-screen="coach"] .g8-coach .g2-composer{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;margin:0!important;border:1px solid #e7e3dd!important;background:#fff!important;box-shadow:none!important}
html.garang-v8 body #main[data-garang-screen="coach"] .g8-coach .g2-composer textarea{min-width:0!important;color:#111!important;background:transparent!important}
html.garang-v8 body #main[data-garang-screen="coach"] .g8-coach .g2-composer textarea::placeholder{color:#99938b!important}
html.garang-v8 body #main[data-garang-screen="coach"] .g8-coach .g2-send{background:#111!important;color:#fff!important}
html.garang-v8 body #main[data-garang-screen="coach"] .g8-coach .g4-prompt-strip{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
`;
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
function ownNavButton(button){
  button.hidden=false;
  button.removeAttribute('aria-hidden');
  button.removeAttribute('tabindex');
  button.style.setProperty('display','flex','important');
  button.style.setProperty('visibility','visible','important');
  button.style.setProperty('opacity','1','important');
  button.style.setProperty('pointer-events','auto','important');
  button.style.setProperty('width','auto','important');
  button.style.setProperty('min-width','0','important');
  button.style.setProperty('font-size','0','important');
  [...button.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE&&/[A-Za-z]/.test(node.nodeValue||''))node.nodeValue='';});
  const iconSlot=button.querySelector(':scope > span:first-child');
  if(iconSlot){iconSlot.style.setProperty('font-size','0','important');iconSlot.style.setProperty('line-height','0','important');if(!iconSlot.children.length&&/[A-Za-z]/.test(iconSlot.textContent||''))iconSlot.textContent='';}
  const label=button.querySelector('b');
  const next=labels[button.dataset.page];
  if(label){if(next&&label.textContent!==next)label.textContent=next;label.style.setProperty('font-size','0','important');label.style.setProperty('line-height','1.05','important');}
  const active=button.classList.contains('active')||button.getAttribute('aria-current')==='page';
  button.style.setProperty('background',active?'var(--g8-red-soft)':'transparent','important');
  button.style.setProperty('color',active?'var(--g8-red)':'#817c77','important');
}
function isFocusedWorkout(main){
  if(!main||main.dataset.garangScreen!=='workout')return false;
  return main.classList.contains('g8-live-mode')||main.classList.contains('g8-record-mode')||main.classList.contains('g8-summary-mode')||!!document.querySelector('#workoutExecutionRest.active:not([hidden])');
}
function rgb(value){const m=String(value||'').match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)(?:[, /]+([\d.]+))?\)/i);return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]==null?1:+m[4]}:null;}
function luminance(c){return c?(.2126*c.r+.7152*c.g+.0722*c.b):255;}
function softenDarkNode(node){
  if(!(node instanceof HTMLElement)||node.matches('img,svg,canvas,video'))return;
  const rect=node.getBoundingClientRect();if(rect.width<42||rect.height<38||rect.width*rect.height<2200)return;
  const cs=getComputedStyle(node),bg=rgb(cs.backgroundColor),dark=(bg&&bg.a>.18&&luminance(bg)<95)||(/gradient/i.test(cs.backgroundImage)&&cs.backgroundImage!=='none');
  if(!dark)return;
  node.dataset.garangFounderNeutralized='1';
  node.style.setProperty('background','#f7f5f1','important');node.style.setProperty('background-image','none','important');node.style.setProperty('border-color','#e7e3dd','important');node.style.setProperty('box-shadow','none','important');node.style.setProperty('filter','none','important');
  [node,...node.querySelectorAll('h1,h2,h3,h4,p,small,span,strong,b,em,label')].forEach((text,index)=>{const color=rgb(getComputedStyle(text).color);if(color&&luminance(color)>165)text.style.setProperty('color',index===0?'#111':'#6f6a64','important');});
}
function repairCoachLayout(main){
  if(String(main?.dataset?.garangScreen||'')!=='coach')return;
  const root=main.querySelector('.g8-coach .garang-coach-v2');if(!root)return;
  root.style.setProperty('display','grid','important');root.style.setProperty('grid-template-columns','1fr','important');root.style.setProperty('width','100%','important');root.style.setProperty('max-width','100%','important');root.style.setProperty('min-width','0','important');root.style.setProperty('height','auto','important');root.style.setProperty('min-height','0','important');root.style.setProperty('overflow','visible','important');
  const chat=root.querySelector('.g2-chat-main');if(chat){chat.style.setProperty('display','grid','important');chat.style.setProperty('grid-template-rows','auto auto auto','important');chat.style.setProperty('width','100%','important');chat.style.setProperty('max-width','100%','important');chat.style.setProperty('min-width','0','important');chat.style.setProperty('height','auto','important');chat.style.setProperty('overflow','visible','important');}
  const scroll=root.querySelector('.g2-chat-scroll');if(scroll){scroll.style.setProperty('width','100%','important');scroll.style.setProperty('max-width','100%','important');scroll.style.setProperty('min-width','0','important');scroll.style.setProperty('height','auto','important');scroll.style.setProperty('min-height','150px','important');scroll.style.setProperty('max-height','410px','important');scroll.style.setProperty('overflow-y','auto','important');}
  const composerWrap=root.querySelector('.g2-composer-wrap');if(composerWrap){composerWrap.style.setProperty('width','100%','important');composerWrap.style.setProperty('max-width','100%','important');composerWrap.style.setProperty('min-width','0','important');composerWrap.style.setProperty('position','relative','important');composerWrap.style.setProperty('inset','auto','important');composerWrap.style.setProperty('box-sizing','border-box','important');}
  const composer=root.querySelector('.g2-composer');if(composer){composer.style.setProperty('width','100%','important');composer.style.setProperty('max-width','100%','important');composer.style.setProperty('min-width','0','important');composer.style.setProperty('box-sizing','border-box','important');}
}
function neutralizeSecondaryResidue(main){
  const s=String(main?.dataset?.garangScreen||'');
  if(s==='history'||s==='progress'){
    const root=main.querySelector('.g8-history-content')||main.querySelector('.g8-history');
    root?.querySelectorAll('div,section,article,aside,details').forEach(softenDarkNode);
  }
  if(s==='nutrition'){
    const root=main.querySelector('.g8-nutrition');
    root?.querySelectorAll('.nutrition-quick-summary *,[class*="ring"],[class*="progress"],section,article').forEach(softenDarkNode);
  }
}
function fix(){
  queued=false;
  if(!document.documentElement.classList.contains('garang-v8'))return;
  ensureChromeStyle();
  if(!menuOwner)menuOwner=document.getElementById('menuBtn');
  const main=document.getElementById('main');
  observeMain(main);
  mountMenu();
  neutralizeSecondaryResidue(main);
  repairCoachLayout(main);
  const app=document.getElementById('appView');
  const top=app?.querySelector(':scope > .topbar');
  if(top){top.hidden=true;top.setAttribute('aria-hidden','true');top.style.setProperty('display','none','important');top.style.setProperty('height','0','important');top.style.setProperty('min-height','0','important');top.style.setProperty('margin','0','important');top.style.setProperty('padding','0','important');}
  if(app){app.style.setProperty('display','block','important');app.style.setProperty('grid-template-rows','none','important');app.style.setProperty('padding','0','important');app.style.setProperty('margin','0','important');app.style.setProperty('top','0','important');}
  if(main){main.style.setProperty('margin-top','0','important');main.style.setProperty('top','0','important');main.style.setProperty('transform','none','important');}
  const nav=document.getElementById('bottomNav');
  if(!nav)return;
  if(isFocusedWorkout(main)){
    nav.hidden=true;
    nav.setAttribute('aria-hidden','true');
    nav.style.setProperty('display','none','important');
    return;
  }
  nav.hidden=false;nav.removeAttribute('aria-hidden');nav.style.setProperty('display','grid','important');ownNavGeometry(nav);
  [...nav.querySelectorAll('button[data-garang-primary-nav="1"]')].forEach(ownNavButton);
  [...nav.querySelectorAll('button:not([data-garang-primary-nav="1"])')].forEach(button=>{button.hidden=true;button.setAttribute('aria-hidden','true');button.style.setProperty('display','none','important');});
  if(nav!==observedNav){
    navObserver?.disconnect();observedNav=nav;
    navObserver=new MutationObserver(records=>{if(records.some(r=>r.type==='characterData'||(r.type==='childList'&&(r.addedNodes?.length||r.removedNodes?.length))))schedule();});
    navObserver.observe(nav,{subtree:true,childList:true,characterData:true});
  }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(fix);}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-started','garang:workout-session-ended','garang:coach-mounted','garang:coach-message-rendered','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
window.GarangFounderV8ChromeGuard=Object.freeze({version:VERSION,schedule,reconcile:fix});
})();