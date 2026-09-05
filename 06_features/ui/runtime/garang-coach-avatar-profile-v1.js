/* GARANG Coach Avatar Profile v1
   Makes the GARANG mark beside assistant messages open the deeper Coach understanding panel.
   The existing profile panel remains read-only; this runtime only changes the interaction entry point.
*/
(() => {
'use strict';
const main=document.getElementById('main');if(!main||window.__garangCoachAvatarProfileV1)return;
window.__garangCoachAvatarProfileV1=true;
const VERSION='garang-coach-avatar-profile-v1';
const english=()=>document.documentElement.lang==='en';
function ensureStyle(){if(document.getElementById('garang-coach-avatar-profile-style'))return;const style=document.createElement('style');style.id='garang-coach-avatar-profile-style';style.textContent=`
.gca-coach-avatar{cursor:pointer;border-radius:999px;transition:transform .15s ease,box-shadow .15s ease}.gca-coach-avatar:hover{transform:translateY(-1px)}.gca-coach-avatar:focus-visible{outline:1px solid rgba(255,255,255,.55);outline-offset:3px}.gca-coach-avatar img{pointer-events:none}
`;document.head.appendChild(style);}
function avatarContainers(root){
 const direct=[...root.querySelectorAll('.g2-message.assistant .g2-avatar,.g2-message.assistant .gpt-avatar,.gpt-message.assistant .gpt-avatar')];
 const imageParents=[...root.querySelectorAll('.g2-message.assistant img,.gpt-message.assistant img')].map(img=>img.closest('.g2-avatar,.gpt-avatar')||img);
 return [...new Set([...direct,...imageParents])];
}
function openProfile(root){
 const trigger=root.querySelector('.gcp-profile-trigger');
 if(trigger){trigger.click();return true;}
 return false;
}
function bind(){
 ensureStyle();
 const root=main.querySelector('.garang-coach-v2');if(!root)return;
 for(const avatar of avatarContainers(root)){
  if(avatar.dataset.gcaBound==='1')continue;
  avatar.dataset.gcaBound='1';avatar.classList.add('gca-coach-avatar');avatar.setAttribute('role','button');avatar.setAttribute('tabindex','0');avatar.setAttribute('aria-label',english()?'Open GARANG Coach details':'GARANG 코치 상세 보기');avatar.setAttribute('title',english()?'Open GARANG Coach details':'GARANG 코치 상세 보기');
  avatar.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openProfile(root);});
  avatar.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;event.preventDefault();openProfile(root);});
 }
}
let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;bind();});}
new MutationObserver(queue).observe(main,{childList:true,subtree:true});
new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
queue();
window.GarangCoachAvatarProfile=Object.freeze({version:VERSION});
})();
