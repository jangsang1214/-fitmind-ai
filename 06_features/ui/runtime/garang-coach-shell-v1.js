/* GARANG Coach Shell v1.3 — conversation-first chrome with explicit drawer ownership. */
(()=>{
'use strict';
const main=document.getElementById('main');
if(!main||window.__garangCoachShellV1)return;
window.__garangCoachShellV1=true;
const ACTIVE='data-garang-coach-shell',STYLE='garang-coach-shell-v1-style';
let queued=false,activeLast=false,settleTimer=null;
const ko=()=>document.documentElement.lang!=='en';
const set=(node,key,value)=>node?.style.setProperty(key,value,'important');
function forceDrawer(root,open){
 const sidebar=root?.querySelector('.g2-chat-sidebar'),backdrop=root?.querySelector('.g2-sidebar-backdrop');
 if(sidebar){set(sidebar,'position','fixed');set(sidebar,'top','0');set(sidebar,'bottom','0');set(sidebar,'transform','none');set(sidebar,'left',open?'0':'-100vw');set(sidebar,'pointer-events',open?'auto':'none');}
 if(backdrop){set(backdrop,'visibility',open?'visible':'hidden');set(backdrop,'opacity',open?'1':'0');set(backdrop,'pointer-events',open?'auto':'none');}
}
function closeDrawer(root){
 if(!root)return;delete root.dataset.g5UserOpen;delete root.dataset.g5SidebarIntent;root.classList.remove('sidebar-open');forceDrawer(root,false);
}
function openDrawer(root){
 if(!root)return;root.dataset.g5UserOpen='1';root.dataset.g5SidebarIntent='open';root.classList.add('sidebar-open');forceDrawer(root,true);
}
function navigate(route,root){closeDrawer(root);return window.GarangRouter?.navigate?.(route,{source:'coach-shell'})===true;}
function ensureStyle(){
 if(document.getElementById(STYLE))return;
 const style=document.createElement('style');style.id=STYLE;style.textContent=`
html.garang-v8[${ACTIVE}="active"] #main .g8-coach .garang-coach-v2{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important;min-width:0!important;height:calc(100dvh - 178px)!important;min-height:calc(100dvh - 178px)!important;max-height:calc(100dvh - 178px)!important;margin:0!important;border:1px solid #e7e3dd!important;border-radius:18px!important;background:#fff!important;overflow:hidden!important;isolation:isolate!important}
html.garang-v8[${ACTIVE}="active"] #main .g8-coach .g2-chat-main{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr) auto!important;width:100%!important;min-width:0!important;height:100%!important;min-height:0!important;overflow:hidden!important}
html.garang-v8[${ACTIVE}="active"] #main .g8-coach .g2-chat-scroll{width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important}
html.garang-v8[${ACTIVE}="active"] #main .g8-coach .g2-composer-wrap{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:8px!important;box-sizing:border-box!important;background:#fff!important}
html.garang-v8[${ACTIVE}="active"] #main .g8-coach .g2-composer,html.garang-v8[${ACTIVE}="active"] #main .g8-coach .g4-prompt-strip{width:100%!important;max-width:100%!important;min-width:0!important;margin-left:0!important;margin-right:0!important;transform:none!important;box-sizing:border-box!important}
html[${ACTIVE}="active"] .g2-chat-sidebar{z-index:11020!important;width:min(82vw,320px)!important;max-width:320px!important}
html[${ACTIVE}="active"] .g5-app-nav{display:none!important}
html[${ACTIVE}="active"] .g5-settings{width:36px!important;min-width:36px!important;height:36px!important;min-height:36px!important;padding:0!important;border:1px solid #e7e3dd!important;border-radius:50%!important;background:#fff!important;color:#222!important;display:grid!important;place-items:center!important;box-shadow:none!important}
@media(max-width:360px){html.garang-v8[${ACTIVE}="active"] #main .g8-coach .garang-coach-v2{height:calc(100dvh - 170px)!important;min-height:calc(100dvh - 170px)!important;max-height:calc(100dvh - 170px)!important}}
`;
 document.head.appendChild(style);
}
function ensureHeader(root){
 const head=root.querySelector('.g2-chat-head');if(!head)return;
 head.querySelectorAll('.g2-home-exit').forEach(node=>node.remove());
 const menu=head.querySelector('.g2-mobile-threads');if(menu){menu.setAttribute('aria-label',ko()?'대화 목록':'Conversations');menu.setAttribute('title',ko()?'대화 목록':'Conversations');menu.onclick=()=>openDrawer(root);}
 const backdrop=root.querySelector('.g2-sidebar-backdrop');if(backdrop)backdrop.onclick=()=>closeDrawer(root);
 let settings=head.querySelector('.g5-settings');if(!settings){settings=document.createElement('button');settings.type='button';settings.className='g5-settings';settings.textContent='⚙';head.appendChild(settings);}
 settings.setAttribute('aria-label',ko()?'설정':'Settings');settings.setAttribute('title',ko()?'설정':'Settings');if(settings.dataset.g5Bound!=='1'){settings.dataset.g5Bound='1';settings.addEventListener('click',()=>navigate('settings',root));}
 const fresh=head.querySelector('.g2-head-new');if(fresh)fresh.textContent=ko()?'＋ 새 대화':'+ New chat';
}
function normalize(root){
 if(!root)return;
 set(root,'width','100%');set(root,'max-width','100%');set(root,'min-width','0');set(root,'height','100%');set(root,'min-height','0');set(root,'overflow','hidden');
 const chat=root.querySelector('.g2-chat-main');set(chat,'display','grid');set(chat,'grid-template-columns','minmax(0,1fr)');set(chat,'grid-template-rows','auto minmax(0,1fr) auto');set(chat,'width','100%');set(chat,'height','100%');set(chat,'min-height','0');set(chat,'overflow','hidden');
 const scroll=root.querySelector('.g2-chat-scroll');set(scroll,'width','100%');set(scroll,'max-width','100%');set(scroll,'min-width','0');set(scroll,'height','auto');set(scroll,'min-height','0');set(scroll,'max-height','none');set(scroll,'overflow-y','auto');
 const wrap=root.querySelector('.g2-composer-wrap');set(wrap,'position','relative');set(wrap,'inset','auto');set(wrap,'transform','none');set(wrap,'width','100%');set(wrap,'max-width','100%');set(wrap,'min-width','0');set(wrap,'margin','0');set(wrap,'box-sizing','border-box');
 [root.querySelector('.g2-composer'),root.querySelector('.g4-prompt-strip')].forEach(node=>{set(node,'width','100%');set(node,'max-width','100%');set(node,'min-width','0');set(node,'margin-left','0');set(node,'margin-right','0');set(node,'transform','none');set(node,'box-sizing','border-box');});
 if(root.dataset.g5UserOpen==='1')forceDrawer(root,true);else closeDrawer(root);
}
function sync(){
 queued=false;ensureStyle();
 const root=main.querySelector('.garang-coach-v2'),isActive=main.dataset.garangScreen==='coach'&&!!root;
 if(!isActive){document.documentElement.removeAttribute(ACTIVE);activeLast=false;return;}
 document.documentElement.setAttribute(ACTIVE,'active');
 if(!activeLast){closeDrawer(root);activeLast=true;}
 ensureHeader(root);normalize(root);clearTimeout(settleTimer);settleTimer=setTimeout(()=>normalize(root),80);
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync));}
['garang:screen-rendered','garang:route-completed','garang:coach-mounted','garang:state-hydrated','garang:coach-message-rendered','garang:state-updated','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.documentElement.addEventListener('garang:language-changed',schedule);
window.GarangCoachShell=Object.freeze({version:'garang-coach-shell-v1.3.0',sync:schedule,close:()=>closeDrawer(main.querySelector('.garang-coach-v2'))});
schedule();
})();