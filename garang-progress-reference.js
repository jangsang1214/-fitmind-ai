/* Progress Performance / Insights composition using canonical Progress data. */
(() => {
  'use strict';
  const main=document.getElementById('main');if(!main)return;
  function route(page){const proxy=document.querySelector('#bottomNav button');if(!proxy)return;const old=proxy.dataset.page;proxy.dataset.page=page;proxy.click();proxy.dataset.page=old;}
  function enhance(){
    const range=main.querySelector('.progress-tabs');
    const head=main.querySelector('.page-head h1');
    if(!range||!head)return;
    head.textContent='Progress';
    range.classList.add('gx-range-tabs');
    const grids=[...main.querySelectorAll(':scope > .grid')];
    const perf=grids.find(g=>g.classList.contains('grid-4'));if(perf)perf.classList.add('gx-performance-metrics');
    const titles=[...main.querySelectorAll(':scope > .section-title')];
    if(titles[0]){titles[0].classList.add('gx-score-title');titles[0].nextElementSibling?.classList.add('gx-score-grid');}
    if(titles[1]){titles[1].classList.add('gx-weekly-title');titles[1].nextElementSibling?.classList.add('gx-weekly-card');}
    const tabs=main.querySelector('.gx-progress-title-tabs');
    if(tabs&&!tabs.dataset.gxBound){
      tabs.dataset.gxBound='1';
      main.dataset.gxProgressTab='performance';
      const bs=[...tabs.querySelectorAll('button')];
      bs.forEach((b,i)=>b.classList.toggle('active',i===1));
      bs[0]?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();route('nutrition');},true);
      bs[1]?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();main.dataset.gxProgressTab='performance';bs.forEach((x,j)=>x.classList.toggle('active',j===1));},true);
      bs[2]?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();main.dataset.gxProgressTab='insights';bs.forEach((x,j)=>x.classList.toggle('active',j===2));},true);
    }
  }
  let q=false;const o=new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;enhance();});});o.observe(main,{childList:true,subtree:true});enhance();
})();
