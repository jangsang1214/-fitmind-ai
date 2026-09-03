/* GARANG Coach home exit hotfix.
   Scope: add one Home/Today exit control to the custom Coach workspace.
   No other UI, state, data, or feature behavior is changed.
*/
(() => {
  'use strict';

  const STYLE_ID = 'garang-coach-home-hotfix-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .g2-chat-head .g2-home-exit{
        width:36px;height:36px;min-width:36px;padding:0;border:0;border-radius:9px;
        display:grid;place-items:center;background:transparent;color:#d9d7d1;
        font:300 24px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        cursor:pointer;transition:background .15s ease,color .15s ease;
      }
      .g2-chat-head .g2-home-exit:hover,.g2-chat-head .g2-home-exit:focus-visible{
        background:rgba(255,255,255,.055);color:#f2efe8;outline:none;
      }
      @media(max-width:800px){
        .g2-chat-head .g2-home-exit{width:34px;height:34px;min-width:34px;font-size:23px}
      }
    `;
    document.head.appendChild(style);
  }

  function goToday() {
    const todayButton = document.querySelector('#bottomNav [data-page="today"]');
    if (todayButton) {
      todayButton.click();
      return;
    }
    const fallback = document.querySelector('[data-page="today"]');
    if (fallback) fallback.click();
  }

  function mountHomeButton() {
    const head = document.querySelector('.garang-coach-v2 .g2-chat-head');
    if (!head || head.querySelector('.g2-home-exit')) return;
    ensureStyle();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'g2-home-exit';
    button.setAttribute('aria-label', 'Today 홈으로 나가기');
    button.setAttribute('title', 'Today');
    button.textContent = '‹';
    button.addEventListener('click', goToday);
    head.prepend(button);
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      mountHomeButton();
    });
  });

  observer.observe(document.body, {childList:true, subtree:true});
  mountHomeButton();
})();
