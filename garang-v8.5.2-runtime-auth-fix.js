
/* GARANG V8.5.2 — runtime auth text visibility */
(function(){
  const reveal = () => {
    document.querySelectorAll('button,[role="button"],a').forEach(el=>{
      const t=(el.textContent||'').trim();
      if (t === '다음' || t.includes('다음')) {
        el.style.setProperty('color','#111','important');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('visibility','visible','important');
        if (getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)')
          el.style.setProperty('background','#fff','important');
      }
    });
  };
  new MutationObserver(reveal).observe(document.documentElement,{subtree:true,childList:true,attributes:true});
  reveal();
})();
