/* GARANG V10 App Shell: one visible route, auth isolation, accessible navigation. */
(function(){
  'use strict';
  const pages=()=>Array.from(document.querySelectorAll('#app .page'));
  const nav=document.getElementById('mainNav');
  const authIds=new Set(['auth','onboarding']);
  function setRoute(id){
    const target=document.getElementById(id);
    if(!target)return false;
    pages().forEach(p=>p.classList.toggle('active',p===target));
    pages().forEach(p=>p.setAttribute('aria-hidden',String(p!==target)));
    if(nav) nav.classList.toggle('hidden',authIds.has(id));
    document.querySelectorAll('#mainNav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    if(id!=='auth'&&id!=='onboarding') document.getElementById('moreNav')?.classList.remove('open');
    history.replaceState({garangRoute:id},'',location.pathname+'#'+id);
    return true;
  }
  const nativeOpen=window.openPage;
  window.openPage=function(id){
    if(nativeOpen && nativeOpen!==window.openPage){
      try{nativeOpen.call(this,id);}catch(e){console.warn('legacy openPage isolated',e);}
    }
    return setRoute(id);
  };
  window.__GARANG_V10_ROUTE__=setRoute;
  function initialRoute(){
    const hash=location.hash.replace(/^#/,'');
    const authActive=document.getElementById('auth')?.classList.contains('active');
    if(hash && document.getElementById(hash)) return hash;
    if(authActive) return 'auth';
    return 'dashboard';
  }
  function isolate(){
    const id=initialRoute(); setRoute(id);
    const observer=new MutationObserver(()=>{
      const active=pages().filter(p=>p.classList.contains('active'));
      if(active.length>1){
        const preferred=active.find(p=>p.id===location.hash.slice(1))||active[active.length-1];
        setRoute(preferred.id);
      }
    });
    observer.observe(document.getElementById('app'),{subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('popstate',()=>setRoute(location.hash.slice(1)||'dashboard'));
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(isolate,30),{once:true});
})();
