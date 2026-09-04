/* GARANG Today anatomy runtime
   - FRONT/BACK are real interactive controls.
   - Only one anatomy side is visible at a time.
   - Today defaults to FRONT whenever the screen is freshly rendered. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  let scheduled = false;
  let activeView = 'front';
  let activePanel = null;

  function setView(panel, side) {
    const wrap = panel.querySelector('.muscle-map-wrap.compact-map');
    const map = wrap?.querySelector('.muscle-map');
    if (!wrap || !map) return;

    activeView = side === 'back' ? 'back' : 'front';
    wrap.dataset.g3View = activeView;

    const views = [...map.querySelectorAll('.body-view')];
    views.forEach((view, index) => {
      const viewSide = index === 1 ? 'back' : 'front';
      const visible = viewSide === activeView;
      view.hidden = !visible;
      view.setAttribute('aria-hidden', visible ? 'false' : 'true');
      view.style.setProperty('display', visible ? 'flex' : 'none', 'important');
      const caption = view.querySelector(':scope > span');
      if (caption) caption.hidden = true;
    });

    panel.querySelectorAll('[data-today-view]').forEach(button => {
      const selected = button.dataset.todayView === activeView;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
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
      key.setAttribute('aria-label', 'Anatomy view');
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
      const eyebrow = label.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = document.documentElement.lang === 'en' ? 'FOCUS AREA' : '주요 부위';
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

  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
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
