/* Body reference actions — preserves canonical export logic. */
(() => {
  'use strict';
  const main=document.getElementById('main');if(!main)return;
  function enhance(){
    if(!main.querySelector('.body-trend-primary')||main.querySelector('.gx-body-export'))return;
    const b=document.createElement('button');b.type='button';b.className='ghost gx-body-export';b.textContent='Export / Share Report';
    b.onclick=()=>main.querySelector('#exportBodyImage')?.click();
    main.appendChild(b);
  }
  let q=false;const o=new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;enhance();});});o.observe(main,{childList:true,subtree:true});enhance();
})();
