/* GARANG Coach Shell v1 — deterministic Founder v8 conversation chrome. */
(()=>{
'use strict';
const main=document.getElementById('main');
if(!main||window.__garangCoachShellV1)return;
window.__garangCoachShellV1=true;
const ACTIVE_ATTR='data-garang-coach-shell',STYLE_ID='garang-coach-shell-v1-style';
const ROUTES=[['today','Today','오늘'],['workout','Workout','운동'],['nutrition','Nutrition','식단'],['running','Running','러닝'],['body','Body','체성분'],['planner','Planner','계획'],['progress','Progress','분석'],['profile','Profile','프로필'],['onboarding','Modeling','모델링']];
let queued=false,syncing=false,coachActive=false,syncTimer=null,settleTimer=null;
const isKo=()=>document.documentElement.lang!=='en';
const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
const setAttr=(el,name,value)=>{if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value);};
function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
html[${ACTIVE_ATTR}="active"] .garang-coach-v2{position:relative!important;display:grid!important;grid-template-columns:1fr!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;overflow:hidden!important;isolation:isolate!important}
html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .garang-coach-v2{min-height:calc(100dvh - 178px)!important;height:calc(100dvh - 178px)!important;max-height:calc(100dvh - 178px)!important;border:1px solid #e7e3dd!important;border-radius:18px!important;background:#fff!important;overflow:hidden!important}
html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .g2-chat-main{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr) auto!important;width:100%!important;min-width:0!important;height:100%!important;min-height:0!important;overflow:hidden!important}
html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .g2-chat-scroll{grid-column:1/-1!important;width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important}
html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .g2-composer-wrap{grid-column:1/-1!important;position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:8px!important;box-sizing:border-box!important;background:#fff!important}
html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .g2-composer,html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .g4-prompt-strip{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important;transform:none!important}
html[${ACTIVE_ATTR}="active"] .g2-chat-sidebar{position:fixed!important;z-index:11020!important;top:0!important;bottom:0!important;left:-100vw!important;width:min(82vw,320px)!important;max-width:320px!important;transform:none!important;transition:left .18s ease!important;pointer-events:none!important}
html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open[data-g5-sidebar-intent="open"] .g2-chat-sidebar{left:0!important;pointer-events:auto!important}
html[${ACTIVE_ATTR}="active"] .g2-sidebar-backdrop{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open[data-g5-sidebar-intent="open"] .g2-sidebar-backdrop{visibility:visible!important;opacity:1!important;pointer-events:auto!important}
.g5-app-nav{display:grid;gap:5px;padding:8px 8px 12px}.g5-app-nav-label{padding:4px 4px 6px;font-size:9px;letter-spacing:.1em;color:#888}.g5-app-nav-grid,.g5-account-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}.g5-app-route,.g5-app-action{min-height:40px;padding:7px 9px;border:1px solid #e7e3dd;border-radius:11px;background:#fff;color:#222;text-align:left;font-size:11px;box-shadow:none}.g5-app-route span,.g5-app-action span{display:block;margin-top:2px;color:#999;font-size:8px}.g5-settings{width:36px;min-width:36px;height:36px;min-height:36px;padding:0;border:1px solid #e7e3dd;border-radius:50%;background:#fff;color:#222;display:grid;place-items:center;box-shadow:none}
@media(max-width:360px){html.garang-v8[${ACTIVE_ATTR}="active"] #main .g8-coach .garang-coach-v2{min-height:calc(100dvh - 170px)!important;height:calc(100dvh - 170px)!important;max-height:calc(100dvh - 170px)!important}}
`;
 document.head.appendChild(style);
}
function closeSidebar(root){if(!root)return;delete root.dataset.g5SidebarIntent;root.classList.remove('sidebar-open');}
function openSidebar(root){if(!root)return;root.dataset.g5SidebarIntent='open';root.classList.add('sidebar-open');}
function navigate(route,root){closeSidebar(root);return window.GarangRouter?.navigate?.(route,{source:'coach-shell'})===true;}
function callHandler(id){const target=document.getElementById(id);if(!target||typeof target.onclick!=='function')return false;target.onclick.call(target,{type:'garang-shell-action',target,currentTarget:target,preventDefault(){},stopPropagation(){}});return true;}
function runAccountAction(action,root){
 closeSidebar(root);
 if(action==='settings'){navigate('settings',root);return;}
 if(action==='profile'){navigate('profile',root);return;}
 if(action==='logout'){callHandler('logoutBtn');return;}
 if(action==='sync'){
  clearTimeout(syncTimer);const button=root?.querySelector('[data-g5-action="sync"]');button?.setAttribute('aria-busy','true');
  syncTimer=setTimeout(()=>{button?.removeAttribute('aria-busy');document.getElementById('syncBadge')?.click();},180);
 }
}
function ensureSidebar(root){
 const sidebar=root.querySelector('.g2-chat-sidebar'),brand=sidebar?.querySelector('.g2-sidebar-brand');if(!sidebar||!brand)return;
 let nav=sidebar.querySelector('.g5-app-nav');if(!nav){nav=document.createElement('nav');nav.className='g5-app-nav';brand.insertAdjacentElement('afterend',nav);}
 const language=isKo()?'ko':'en';setAttr(nav,'aria-label',isKo()?'GARANG 전체 기능':'GARANG app navigation');
 if(nav.dataset.language!==language){
  nav.dataset.language=language;
  const routes=ROUTES.map(([route,en,ko])=>`<button type="button" class="g5-app-route" data-g5-route="${route}">${isKo()?ko:en}<span>${en}</span></button>`).join('');
  nav.innerHTML=`<div class="g5-app-nav-label">${isKo()?'GARANG 전체 기능':'GARANG APP'}</div><div class="g5-app-nav-grid">${routes}</div><div class="g5-account-actions"><button type="button" class="g5-app-action" data-g5-action="settings">${isKo()?'설정':'Settings'}<span>SETTINGS</span></button><button type="button" class="g5-app-action" data-g5-action="sync">${isKo()?'동기화':'Sync'}<span>SYNC</span></button><button type="button" class="g5-app-action" data-g5-action="profile">${isKo()?'프로필':'Profile'}<span>PROFILE</span></button><button type="button" class="g5-app-action" data-g5-action="logout">${isKo()?'로그아웃':'Log out'}<span>ACCOUNT</span></button></div>`;
  nav.querySelectorAll('[data-g5-route]').forEach(button=>button.onclick=()=>navigate(button.dataset.g5Route,root));
  nav.querySelectorAll('[data-g5-action]').forEach(button=>button.onclick=()=>runAccountAction(button.dataset.g5Action,root));
 }
 setText(sidebar.querySelector('.g2-thread-label'),isKo()?'대화 기록 / CONVERSATIONS':'CONVERSATIONS');
}
function ensureHeader(root){
 const head=root.querySelector('.g2-chat-head');if(!head)return;
 head.querySelectorAll('.g2-home-exit').forEach(button=>button.remove());
 const menu=head.querySelector('.g2-mobile-threads');if(menu){setAttr(menu,'aria-label',isKo()?'전체 기능 및 대화 목록':'App menu and conversations');setAttr(menu,'title',isKo()?'전체 메뉴':'Menu');menu.onclick=()=>openSidebar(root);}
 const backdrop=root.querySelector('.g2-sidebar-backdrop');if(backdrop)backdrop.onclick=()=>closeSidebar(root);
 let settings=head.querySelector('.g5-settings');if(!settings){settings=document.createElement('button');settings.type='button';settings.className='g5-settings';settings.textContent='⚙';head.appendChild(settings);}
 setAttr(settings,'aria-label',isKo()?'설정':'Settings');setAttr(settings,'title',isKo()?'설정':'Settings');if(settings.dataset.g5Bound!=='1'){settings.dataset.g5Bound='1';settings.addEventListener('click',()=>navigate('settings',root));}
 setText(head.querySelector('.g2-head-new'),isKo()?'＋ 새 대화':'+ New chat');
}
function normalizeGeometry(root){
 if(!document.documentElement.classList.contains('garang-v8'))return;
 const set=(node,key,value)=>node?.style.setProperty(key,value,'important');
 set(root,'width','100%');set(root,'max-width','100%');set(root,'min-width','0');set(root,'height','100%');set(root,'min-height','0');set(root,'overflow','hidden');
 const chat=root.querySelector('.g2-chat-main');set(chat,'display','grid');set(chat,'grid-template-columns','minmax(0,1fr)');set(chat,'grid-template-rows','auto minmax(0,1fr) auto');set(chat,'width','100%');set(chat,'height','100%');set(chat,'min-height','0');set(chat,'overflow','hidden');
 const scroll=root.querySelector('.g2-chat-scroll');set(scroll,'width','100%');set(scroll,'max-width','100%');set(scroll,'min-width','0');set(scroll,'height','auto');set(scroll,'min-height','0');set(scroll,'max-height','none');set(scroll,'overflow-y','auto');
 const wrap=root.querySelector('.g2-composer-wrap');set(wrap,'position','relative');set(wrap,'inset','auto');set(wrap,'left','auto');set(wrap,'right','auto');set(wrap,'top','auto');set(wrap,'bottom','auto');set(wrap,'transform','none');set(wrap,'width','100%');set(wrap,'max-width','100%');set(wrap,'min-width','0');set(wrap,'margin','0');set(wrap,'box-sizing','border-box');
 const composer=root.querySelector('.g2-composer');set(composer,'width','100%');set(composer,'max-width','100%');set(composer,'min-width','0');set(composer,'box-sizing','border-box');
 const strip=root.querySelector('.g4-prompt-strip');set(strip,'width','100%');set(strip,'max-width','100%');set(strip,'min-width','0');set(strip,'margin-left','0');set(strip,'margin-right','0');set(strip,'transform','none');set(strip,'box-sizing','border-box');
}
function syncShell(){
 queued=false;if(syncing)return;syncing=true;
 try{
  ensureStyle();const html=document.documentElement,active=main.dataset.garangScreen==='coach',root=main.querySelector('.garang-coach-v2');
  if(!active||!root){html.removeAttribute(ACTIVE_ATTR);coachActive=false;return;}
  html.setAttribute(ACTIVE_ATTR,'active');
  if(!coachActive){closeSidebar(root);coachActive=true;}
  if(root.dataset.g5SidebarIntent!=='open')root.classList.remove('sidebar-open');
  ensureSidebar(root);ensureHeader(root);normalizeGeometry(root);clearTimeout(settleTimer);settleTimer=setTimeout(()=>normalizeGeometry(root),0);
 }finally{syncing=false;}
}
function queueSync(){if(queued||syncing)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(syncShell));}
['garang:screen-rendered','garang:route-completed','garang:coach-mounted','garang:state-hydrated','garang:coach-message-rendered','pageshow'].forEach(name=>window.addEventListener(name,queueSync,{passive:true}));
new MutationObserver(queueSync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.GarangCoachShell=Object.freeze({version:'garang-coach-shell-v1.1.0',sync:queueSync,close:()=>closeSidebar(main.querySelector('.garang-coach-v2'))});
queueSync();
})();