/* GARANG V8.5.2 — runtime auth text visibility (safe observer fix) */
(function(){
  const reveal = () => {
    document.querySelectorAll('button,[role="button"],a').forEach(el=>{
      const t=(el.textContent||'').trim();
      if (t === '다음' || t.includes('다음')) {
        if (el.style.color !== 'rgb(17, 17, 17)') el.style.setProperty('color','#111','important');
        if (el.style.opacity !== '1') el.style.setProperty('opacity','1','important');
        if (el.style.visibility !== 'visible') el.style.setProperty('visibility','visible','important');
        if (getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' && el.style.background !== 'rgb(255, 255, 255)')
          el.style.setProperty('background','#fff','important');
      }
    });
  };
  // Do not observe attributes: reveal() changes inline styles and would retrigger itself forever.
  new MutationObserver(reveal).observe(document.documentElement,{subtree:true,childList:true});
  reveal();
})();
