from pathlib import Path


def replace_once(path, old, new):
    p=Path(path)
    text=p.read_text()
    if old not in text:
        raise SystemExit(f'missing replacement in {path}: {old[:140]!r}')
    p.write_text(text.replace(old,new,1))

# Data recovery: bind Settings recovery action from explicit screen/hydration lifecycle.
p='06_features/ui/runtime/garang-data-migration-v2.js'
replace_once(p,
"let lastReport=null,observer=null,bindingQueued=false,lastTrigger=null,scanGeneration=0,activeScan=null;",
"let lastReport=null,bindingQueued=false,lastTrigger=null,scanGeneration=0,activeScan=null;")
replace_once(p,
"function startBinding(){ensureStyle();bindSettingsButton();const main=document.getElementById('main');if(!main||observer)return;observer=new MutationObserver(queueBinding);observer.observe(main,{childList:true,subtree:true});}\ndocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.garang-data-recovery-modal'))closeModal();});\nsetTimeout(startBinding,0);window.addEventListener('load',startBinding,{once:true});",
"function startBinding(){ensureStyle();bindSettingsButton();}\nwindow.addEventListener('garang:screen-rendered',queueBinding);\nwindow.addEventListener('garang:state-hydrated',queueBinding);\nwindow.addEventListener('pageshow',queueBinding);\ndocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.garang-data-recovery-modal'))closeModal();});\nsetTimeout(startBinding,0);window.addEventListener('load',startBinding,{once:true});")

# Functional recovery: route/page and feature lifecycle replace #main subtree observation.
p='06_features/ui/runtime/garang-functional-recovery.js'
replace_once(p,
"  function repair(){killCachedFacades();repairBrandImages();repairCoach();repairWorkout();bindGlobalRecovery();repairDataActions();}\n  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair();});});observer.observe(main,{childList:true,subtree:true});repair();",
"  function repair(){killCachedFacades();repairBrandImages();repairCoach();repairWorkout();bindGlobalRecovery();repairDataActions();}\n  let queued=false;function scheduleRepair(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair();});}\n  window.addEventListener('garang:screen-rendered',scheduleRepair);\n  window.addEventListener('garang:state-updated',scheduleRepair);\n  window.addEventListener('garang:coach-mounted',scheduleRepair);\n  window.addEventListener('garang:coach-message-rendered',scheduleRepair);\n  window.addEventListener('pageshow',scheduleRepair);\n  document.addEventListener('click',event=>{if(event.target.closest('#addWorkout,#clearWorkoutDraft,#saveWorkoutSession,[data-edit-workout],[data-remove-workout],#exportData,#importLegacy'))setTimeout(scheduleRepair,0);},true);\n  repair();")

# Settings safety: settle only after canonical render/hydration events.
p='06_features/ui/runtime/garang-settings-touch-safety-v1.js'
replace_once(p,
"  if (!main || !gear || typeof MutationObserver !== 'function') return;",
"  if (!main || !gear) return;")
replace_once(p,
"  const settingsObserver = new MutationObserver(settleSettingsScreen);\n  settingsObserver.observe(main, { childList: true, subtree: true });\n  settleSettingsScreen();",
"  window.addEventListener('garang:screen-rendered', settleSettingsScreen);\n  window.addEventListener('garang:state-hydrated', settleSettingsScreen);\n  window.addEventListener('pageshow', settleSettingsScreen);\n  settleSettingsScreen();")

# Coach avatar entry follows Coach/message lifecycle.
p='06_features/ui/runtime/garang-coach-avatar-profile-v1.js'
replace_once(p,
"new MutationObserver(queue).observe(main,{childList:true,subtree:true});\nnew MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});",
"window.addEventListener('garang:screen-rendered',queue);\nwindow.addEventListener('garang:coach-mounted',queue);\nwindow.addEventListener('garang:coach-message-rendered',queue);\nwindow.addEventListener('garang:state-hydrated',queue);\nnew MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});")

# Today anatomy polish is screen-owned rather than mutation-owned.
p='06_features/ui/runtime/garang-today-premium-fix.js'
replace_once(p,
"  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });\n  window.addEventListener('resize', schedule, { passive: true });",
"  window.addEventListener('garang:screen-rendered', schedule);\n  window.addEventListener('garang:state-updated', schedule);\n  window.addEventListener('pageshow', schedule);\n  window.addEventListener('resize', schedule, { passive: true });")

# Workout library follows screen/state/filter lifecycle.
p='06_features/ui/runtime/garang-workout-library-v2.js'
replace_once(p,
"  new MutationObserver(schedule).observe(main, { childList:true, subtree:true });\n  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });",
"  window.addEventListener('garang:screen-rendered', schedule);\n  window.addEventListener('garang:state-updated', schedule);\n  window.addEventListener('garang:state-hydrated', schedule);\n  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });")

# Workout Intelligence owns its generated surfaces and publishes a lifecycle for downstream UI.
p='06_features/ui/runtime/garang-workout-intelligence-ui-v1.js'
replace_once(p,
"function run(){queued=false;ensureStyle();mountDailyWorkout();mountSetBuilder();enhanceCoach();processImportQueue();}\nfunction schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(run));}\nnew MutationObserver(schedule).observe(main,{childList:true,subtree:true});new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});document.addEventListener('click',e=>{if(e.target.closest('[data-page],[data-pagego]'))setTimeout(schedule,0);},true);window.addEventListener('garang:agent-write',schedule);window.GarangWorkoutIntelligenceUI=Object.freeze({version:VERSION,queueImport,processImportQueue});schedule();",
"function run(){queued=false;ensureStyle();mountDailyWorkout();mountSetBuilder();enhanceCoach();processImportQueue();try{window.dispatchEvent(new CustomEvent('garang:workout-intelligence-rendered'));}catch{}}\nfunction schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(run));}\nwindow.addEventListener('garang:screen-rendered',schedule);window.addEventListener('garang:state-updated',schedule);window.addEventListener('garang:state-hydrated',schedule);window.addEventListener('garang:coach-message-rendered',schedule);new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});document.addEventListener('click',e=>{if(e.target.closest('[data-page],[data-pagego],#addWorkout,#clearWorkoutDraft,#saveWorkoutSession,[data-edit-workout],[data-remove-workout]'))setTimeout(schedule,0);},true);window.addEventListener('garang:agent-write',schedule);window.GarangWorkoutIntelligenceUI=Object.freeze({version:VERSION,queueImport,processImportQueue});schedule();")

# Collapsible enhancement follows the surfaces that actually create its targets.
p='06_features/ui/runtime/garang-collapsible-intelligence-ui-v1.js'
replace_once(p,
"new MutationObserver(schedule).observe(main,{childList:true,subtree:true});\nnew MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});\nwindow.addEventListener('garang:agent-write',schedule);window.addEventListener('garang:agent-proposal-resolved',schedule);",
"window.addEventListener('garang:screen-rendered',schedule);\nwindow.addEventListener('garang:state-updated',schedule);\nwindow.addEventListener('garang:state-hydrated',schedule);\nwindow.addEventListener('garang:workout-intelligence-rendered',schedule);\nwindow.addEventListener('garang:coach-decision-rendered',schedule);\nnew MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});\nwindow.addEventListener('garang:agent-write',schedule);window.addEventListener('garang:agent-proposal-resolved',schedule);")
