/* GARANG V9.9 Premium UI controller — design/navigation only. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const nav=$('#mainNav');
  if(!nav) return;

  const items=[
    ['dashboard','⌂','홈'],
    ['workout','◇','운동'],
    ['diet','◫','식단'],
    ['body','◉','바디'],
    ['more','•••','더보기']
  ];
  nav.innerHTML=items.map(([page,icon,label])=>
    `<button type="button" data-garang-page="${page}" class="${page==='more'?'navMore':''}"><span class="navIcon">${icon}</span><span class="navLabel">${label}</span></button>`
  ).join('');

  const drawer=document.createElement('div');
  drawer.id='garangMoreDrawer';
  drawer.innerHTML=`<div id="garangMoreSheet"><div class="eyebrow">GARANG</div><h3 style="margin:5px 0 14px;font-size:24px">더보기</h3><div class="moreGrid">
    <button data-more-page="report">📊 분석</button><button data-more-page="chat">✦ AI 코치</button><button data-more-page="running">⌁ 러닝</button>
    <button data-more-page="v93Learning">◎ AI 학습</button><button data-more-page="v93Memory">◌ AI 메모리</button><button data-more-page="profile">◉ 프로필</button>
  </div><button class="moreClose" type="button">닫기</button></div>`;
  document.body.appendChild(drawer);

  function setActive(page){
    nav.querySelectorAll('button[data-garang-page]').forEach(b=>b.classList.toggle('active',b.dataset.garangPage===page));
    if(['report','chat','running','v93Learning','v93Memory','profile'].includes(page)) nav.querySelector('[data-garang-page="more"]')?.classList.add('active');
  }
  function openMore(){drawer.classList.add('open')}
  function closeMore(){drawer.classList.remove('open')}

  nav.addEventListener('click',e=>{
    const b=e.target.closest('button[data-garang-page]'); if(!b) return;
    const p=b.dataset.garangPage;
    if(p==='more'){openMore();return}
    if(typeof window.openPage==='function') window.openPage(p);
    setActive(p);
    window.scrollTo({top:0,behavior:'smooth'});
  });
  drawer.addEventListener('click',e=>{
    if(e.target===drawer || e.target.closest('.moreClose')){closeMore();return}
    const b=e.target.closest('[data-more-page]'); if(!b)return;
    const p=b.dataset.morePage;
    if(typeof window.openPage==='function') window.openPage(p);
    setActive(p); closeMore(); window.scrollTo({top:0,behavior:'smooth'});
  });

  // Keep the premium nav synchronized with the app's existing openPage function.
  const original=window.openPage;
  if(typeof original==='function'){
    window.openPage=function(page){
      const result=original.apply(this,arguments);
      setTimeout(()=>setActive(page),0);
      return result;
    };
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMore()});
  window.addEventListener('load',()=>{
    const active=document.querySelector('.page.active'); if(active) setActive(active.id);
  });
})();
