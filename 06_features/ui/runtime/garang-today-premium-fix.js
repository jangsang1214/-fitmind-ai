/* GARANG Today anatomy runtime v3.1
   FRONT/BACK remain interactive. Observer-driven DOM writes are idempotent so Today cannot
   self-trigger a MutationObserver feedback loop on iOS/WebKit. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  let scheduled = false;
  let activeView = 'front';
  let activePanel = null;
  const setText=(el,value)=>{const next=String(value??'');if(el&&el.textContent!==next)el.textContent=next;};
  const setAttr=(el,name,value)=>{const next=String(value);if(el&&el.getAttribute(name)!==next)el.setAttribute(name,next);};

  function setView(panel, side) {
    const wrap = panel.querySelector('.muscle-map-wrap.compact-map');
    const map = wrap?.querySelector('.muscle-map');
    if (!wrap || !map) return;

    activeView = side === 'back' ? 'back' : 'front';
    if (wrap.dataset.g3View !== activeView) wrap.dataset.g3View = activeView;

    [...map.querySelectorAll('.body-view')].forEach((view, index) => {
      const visible = (index === 1 ? 'back' : 'front') === activeView;
      if (view.hidden === visible) view.hidden = !visible;
      setAttr(view,'aria-hidden', visible ? 'false' : 'true');
      const wantedDisplay=visible?'flex':'none';
      if (view.style.getPropertyValue('display')!==wantedDisplay || view.style.getPropertyPriority('display')!=='important') {
        view.style.setProperty('display', wantedDisplay, 'important');
      }
      const caption = view.querySelector(':scope > span');
      if (caption && !caption.hidden) caption.hidden = true;
    });

    panel.querySelectorAll('[data-today-view]').forEach(button => {
      const selected = button.dataset.todayView === activeView;
      button.classList.toggle('active', selected);
      setAttr(button,'aria-pressed', selected ? 'true' : 'false');
    });
  }

  function ensureControls(panel) {
    panel.querySelectorAll(':scope > .g3-anatomy-tools').forEach(el => el.remove());

    let key = panel.querySelector(':scope > .today-anatomy-key');
    if (!key) {
      key = document.createElement('div');
      key.className = 'today-anatomy-key';
      panel.appendChild(key);
    }

    if (key.dataset.garangInteractive !== '1') {
      key.dataset.garangInteractive = '1';
      setAttr(key,'aria-label','Anatomy view');
      key.innerHTML = `
        <div class="today-view-switch" role="group" aria-label="Body view">
          <button type="button" data-today-view="front" aria-pressed="true">FRONT</button>
          <button type="button" data-today-view="back" aria-pressed="false">BACK</button>
        </div>
        <div class="today-muscle-legend" aria-hidden="true">
          <span class="today-key-item primary"><i></i>Primary</span>
          <span class="today-key-item secondary"><i></i>Secondary</span>
          <span class="today-key-item tertiary"><i></i>Tertiary</span>
        </div>`;
    }
  }

  function polishToday() {
    scheduled = false;
    const panel = main.querySelector('.today-body-panel');
    if (!panel) {
      activePanel = null;
      return;
    }

    if (panel !== activePanel) {
      activePanel = panel;
      activeView = 'front';
    }

    const wrap = panel.querySelector('.muscle-map-wrap.compact-map');
    if (!wrap) return;

    const label = panel.querySelector('.today-body-label');
    if (label) {
      setText(label.querySelector('.eyebrow'), document.documentElement.lang === 'en' ? 'FOCUS AREA' : '주요 부위');
      label.querySelectorAll('strong').forEach(el => el.remove());
    }

    ensureControls(panel);
    wrap.classList.add('garang-today-anatomy-premium');
    const map = wrap.querySelector('.muscle-map');
    if (!map) return;
    map.classList.add('garang-today-anatomy-map');
    setView(panel, activeView);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(polishToday));
  }

  window.addEventListener('garang:screen-rendered', schedule);
  window.addEventListener('garang:state-updated', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-today-view]');
    if (viewButton) {
      event.preventDefault();
      event.stopPropagation();
      const panel = viewButton.closest('.today-body-panel');
      if (panel) setView(panel, viewButton.dataset.todayView);
      return;
    }
    if (event.target.closest('[data-page="today"],[data-pagego="today"]')) setTimeout(schedule, 0);
  }, true);
  document.documentElement.addEventListener('garang:language-changed', schedule);
  schedule();
})();
