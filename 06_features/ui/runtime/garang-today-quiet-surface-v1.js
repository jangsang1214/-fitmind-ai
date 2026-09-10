(function (root) {
  'use strict';

  var VERSION = 'garang-today-quiet-surface-v1.0.0';
  var mounted = false;
  var scheduled = false;

  function isToday() {
    var main = document.getElementById('main');
    return !!main && (main.dataset.garangScreen || 'today') === 'today';
  }

  function make(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function move(parent, node) {
    if (node && node.parentNode !== parent) parent.appendChild(node);
  }

  function detail(parent, key, title, hint) {
    var node = parent.querySelector('[data-gq-details="' + key + '"]');
    if (!node) {
      node = make('details', 'gq-details', {
        'data-gq-details': key,
        'data-gq-open-key': 'garang-today-' + key
      });
      var summary = make('summary', 'gq-summary');
      summary.appendChild(make('span', 'gq-summary-title')).textContent = title;
      summary.appendChild(make('span', 'gq-summary-hint')).textContent = hint;
      summary.appendChild(make('span', 'gq-summary-mark', { 'aria-hidden': 'true' })).textContent = '+';
      node.appendChild(summary);
      node.appendChild(make('div', 'gq-detail-body'));
      parent.appendChild(node);
    }
    node.querySelector('.gq-summary-title').textContent = title;
    node.querySelector('.gq-summary-hint').textContent = hint;
    return node.querySelector('.gq-detail-body');
  }

  function mount() {
    scheduled = false;
    if (!isToday()) {
      mounted = false;
      return;
    }
    var main = document.getElementById('main');
    if (!main) return;
    var flow = document.getElementById('garangTodayFlow');
    var core = document.getElementById('garangCoreToday');
    var golden = main.querySelector('[data-golden-path-surface]');
    var hero = main.querySelector('.visual-today-hero');
    var snapshot = main.querySelector('.today-snapshot');
    var status = main.querySelector('.status-visual-card');
    var plan = main.querySelector('.today-plan-card');
    var workout = main.querySelector('.garang-daily-workout');
    if (!flow || !core || !hero || !snapshot || !status || !plan) return;

    var shell = document.getElementById('garangQuietToday');
    if (!shell) {
      shell = make('div', 'gq-today', {
        id: 'garangQuietToday',
        'data-garang-quiet-today': '1'
      });
      main.insertBefore(shell, main.firstChild);
    }
    main.classList.add('garang-quiet-today');
    var focus = shell.querySelector('.gq-focus') || shell.appendChild(make('section', 'gq-focus', { 'aria-label': '오늘의 방향' }));
    var evidence = shell.querySelector('.gq-evidence') || shell.appendChild(make('section', 'gq-evidence', { 'aria-label': '오늘의 판단' }));
    var detailHost = shell.querySelector('.gq-details-host') || shell.appendChild(make('section', 'gq-details-host', { 'aria-label': '상세 정보' }));

    move(focus, flow);
    move(focus, core);
    if (golden) move(focus, golden);
    move(evidence, hero);
    var signals = detail(detailHost, 'signals', '기록과 상태', '오늘의 신호를 확인');
    move(signals, snapshot);
    var statusTitle = status.previousElementSibling;
    if (statusTitle && statusTitle.classList.contains('section-title')) move(signals, statusTitle);
    move(signals, status);
    var plansTitle = plan.previousElementSibling;
    if (plansTitle && plansTitle.classList.contains('section-title')) move(detail(detailHost, 'plan', '오늘의 계획', '일정과 추천을 확인'), plansTitle);
    var planBody = detailHost.querySelector('[data-gq-details="plan"] .gq-detail-body');
    move(planBody, plan);
    if (workout) move(planBody, workout);

    var quick = main.querySelector('.quick-visual-grid');
    if (quick && quick.parentNode === main) main.appendChild(quick);
    mounted = true;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(mount);
    });
  }

  ['garang:screen-rendered', 'garang:state-updated', 'garang:state-hydrated', 'garang:route-completed', 'garang:workout-intelligence-rendered'].forEach(function (eventName) {
    document.addEventListener(eventName, schedule);
  });
  window.addEventListener('pageshow', schedule);
  window.GarangTodayQuietSurface = { version: VERSION, mount: mount, schedule: schedule };
  schedule();
})(window);
