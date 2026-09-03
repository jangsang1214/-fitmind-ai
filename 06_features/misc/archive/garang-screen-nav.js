/* Approved-reference screen chrome: Today owns the bottom nav; detail screens use a back control. */
(() => {
  'use strict';
  const main=document.getElementById('main');
  if(!main)return;
  function go(page){
    const proxy=document.querySelector('#bottomNav button');
    if(!proxy)return;
    const old=proxy.dataset.page;proxy.dataset.page=page;proxy.click();proxy.dataset.page=old;
  }
  function addBack(){
    if(main.querySelector('.visual-today-hero'))return;
    const coach=main.querySelector('.coach-app-head');
    if(coach&&!coach.querySelector('.gx-back-button')){
      const b=document.createElement('button');b.type='button';b.className='gx-back-button';b.setAttribute('aria-label','Back');b.onclick=()=>go('today');coach.prepend(b);return;
    }
    const head=main.querySelector('.page-head');
    if(head&&!head.querySelector('.gx-back-button')){
      const b=document.createElement('button');b.type='button';b.className='gx-back-button';b.setAttribute('aria-label','Back');b.onclick=()=>go('today');head.prepend(b);
    }
  }
  function repair(){addBack();}
  let queued=false;const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair();});});
  obs.observe(main,{childList:true,subtree:true});repair();
})();
