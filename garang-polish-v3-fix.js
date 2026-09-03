/* GARANG POLISH v3 hotfix: keep anatomy controls in their model column and reinforce latest-message anchoring. */
(() => {
  'use strict';
  const main=document.getElementById('main');if(!main)return;
  const bottom=scroller=>{if(!scroller)return;scroller.scrollTop=scroller.scrollHeight;};
  function repair(){
    main.querySelectorAll('.muscle-map-wrap.g3-upgraded').forEach(wrap=>{
      const prev=wrap.previousElementSibling;
      if(prev?.classList.contains('g3-anatomy-tools'))wrap.prepend(prev);
      const tools=wrap.querySelector(':scope > .g3-anatomy-tools');
      if(!tools){
        const near=wrap.parentElement?.querySelector('.g3-anatomy-tools');
        if(near&&near!==wrap)wrap.prepend(near);
      }
    });
    document.querySelectorAll('.g2-chat-scroll').forEach(scroller=>{
      bottom(scroller);requestAnimationFrame(()=>bottom(scroller));
    });
  }
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair();});}).observe(document.body,{childList:true,subtree:true});
  repair();
})();
