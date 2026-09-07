from pathlib import Path
import json
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_once(path, old, new):
    text = read(path)
    if old not in text:
        raise SystemExit(f"missing replacement in {path}: {old[:140]!r}")
    write(path, text.replace(old, new, 1))


def replace_regex(path, pattern, replacement):
    text = read(path)
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"regex replacement count={count} in {path}: {pattern}")
    write(path, out)


# Core lifecycle and hydration continuity.
app = "01_app/app.js"
replace_once(
    app,
    "function saveState(opts={}){writeLocal();trackEvent(opts.event||'state_saved',{source:opts.source||'app'},false);if(firebaseReady&&currentUser)queueCloudSync();updateSyncUI();}",
    "function emitLifecycle(name,detail={}){try{window.dispatchEvent(new CustomEvent(name,{detail:{page:currentPage,storageKey,...detail}}));}catch{}}\nfunction saveState(opts={}){writeLocal();trackEvent(opts.event||'state_saved',{source:opts.source||'app'},false);if(firebaseReady&&currentUser)queueCloudSync();updateSyncUI();emitLifecycle('garang:state-updated',{source:opts.source||'app',event:opts.event||'state_saved'});}"
)
text = read(app)
if "function reconcileAfterHydration(status)" not in text:
    needle = "async function cloudLoadAndMerge(){"
    helper = """function reconcileAfterHydration(status){
  /* Background Firebase hydration updates state without replacing an active Coach interaction tree. */
  const interactiveCoach=currentPage==='coach'&&$('appView')&&!$('appView').hidden;
  emitLifecycle('garang:state-hydrated',{status});
  if(interactiveCoach){applyLanguageChrome();updateSyncUI();return;}
  render();
}
"""
    if needle not in text:
        raise SystemExit("cloudLoadAndMerge marker missing")
    text = text.replace(needle, helper + needle, 1)
    success = "state.syncState='synced';setSync('synced');render();"
    failure = "toast('클라우드 연결을 확인 중입니다. 기록은 기기에 안전하게 저장됩니다.');render();"
    if success not in text or failure not in text:
        raise SystemExit("hydration render markers missing")
    text = text.replace(success, "state.syncState='synced';setSync('synced');reconcileAfterHydration('success');", 1)
    text = text.replace(failure, "toast('클라우드 연결을 확인 중입니다. 기록은 기기에 안전하게 저장됩니다.');reconcileAfterHydration('error');", 1)
    write(app, text)

replace_once(
    app,
    "function render(){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));const m=$('main');const fn=pages[currentPage]||pages.today;m.innerHTML=fn();bindPage();applyLanguageChrome();updateSyncUI();}",
    "function render(){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));const m=$('main');const fn=pages[currentPage]||pages.today;m.innerHTML=fn();bindPage();applyLanguageChrome();updateSyncUI();emitLifecycle('garang:screen-rendered',{screen:currentPage});}"
)

# Brand runtime becomes canonical Coach thread/message/scroll owner.
brand = "06_features/ui/runtime/garang-brand-runtime-v2.js"
text = read(brand)
esc_line = "  const esc = s => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]));"
if esc_line not in text:
    raise SystemExit("brand esc marker missing")
text = text.replace(
    esc_line,
    esc_line + "\n  const bottomQueued = new WeakSet();\n  const emit = (name,detail={}) => { try{window.dispatchEvent(new CustomEvent(name,{detail}));}catch{} };",
    1
)
write(brand, text)
replace_regex(
    brand,
    r"  function forceBottom\(runtime\)\{.*?\n  \}\n",
    """  function forceBottom(runtime){
    const scroller=runtime.root.querySelector('.g2-chat-scroll');if(!scroller||bottomQueued.has(scroller))return;
    bottomQueued.add(scroller);
    requestAnimationFrame(()=>{
      if(scroller.isConnected)scroller.scrollTop=scroller.scrollHeight;
      requestAnimationFrame(()=>{
        if(scroller.isConnected)scroller.scrollTop=scroller.scrollHeight;
        bottomQueued.delete(scroller);
      });
    });
  }
"""
)
replace_once(
    brand,
    "    forceBottom(runtime);\n  }\n\n  function renderThreadList(runtime){",
    "    forceBottom(runtime);\n    emit('garang:coach-message-rendered',{root:runtime.root,threadId:thread.id});\n  }\n\n  function renderThreadList(runtime){"
)
replace_once(
    brand,
    "    root.dataset.garangCoachV2='1';root.dataset.garangCoachAccount=activeAppRecord().key;setTimeout(()=>forceBottom(runtime),0);",
    "    root.dataset.garangCoachV2='1';root.dataset.garangCoachAccount=activeAppRecord().key;forceBottom(runtime);emit('garang:coach-mounted',{root});"
)
replace_once(
    brand,
    "  function repairAll(){replaceBrandMarks(document);renderBodyModels();mountCoach();}\n  let queued=false;\n  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repairAll();});});\n  observer.observe(document.body,{childList:true,subtree:true});\n  repairAll();",
    "  function repairAll(){replaceBrandMarks(document);renderBodyModels();mountCoach();}\n  let repairQueued=false;\n  function scheduleRepair(){if(repairQueued)return;repairQueued=true;requestAnimationFrame(()=>{repairQueued=false;repairAll();});}\n  window.addEventListener('garang:screen-rendered',scheduleRepair);\n  window.addEventListener('pageshow',scheduleRepair);\n  repairAll();"
)

# Polish owns visual/anatomy upgrade only; absorb polish-fix and remove duplicate Coach scroll owner.
polish = "06_features/ui/runtime/garang-polish-v3.js"
text = read(polish)
marker = "  const scrollLocks=new WeakMap();"
if marker not in text:
    raise SystemExit("polish scroll marker missing")
prefix = text.split(marker, 1)[0]
suffix = """  function repairAnatomyTools(){
    main.querySelectorAll('.muscle-map-wrap.g3-upgraded').forEach(wrap=>{
      const prev=wrap.previousElementSibling;
      if(prev?.classList.contains('g3-anatomy-tools'))wrap.prepend(prev);
      const tools=wrap.querySelector(':scope > .g3-anatomy-tools');
      if(!tools){
        const near=wrap.parentElement?.querySelector('.g3-anatomy-tools');
        if(near&&near!==wrap)wrap.prepend(near);
      }
    });
  }
  function polish(){refineMarks(document);upgradeAnatomy();repairAnatomyTools();}
  let queued=false;
  function schedulePolish(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish();});}
  window.addEventListener('garang:screen-rendered',schedulePolish);
  window.addEventListener('pageshow',schedulePolish);
  schedulePolish();
})();
"""
write(polish, prefix + suffix)
fix = Path("06_features/ui/runtime/garang-polish-v3-fix.js")
if fix.exists():
    fix.unlink()

# Experience layers follow explicit lifecycle/state/action events rather than broad DOM observers.
exp3 = "06_features/ui/runtime/garang-experience-v3.js"
replace_once(
    exp3,
    "  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });\n  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });",
    "  window.addEventListener('garang:screen-rendered', schedule);\n  window.addEventListener('garang:state-updated', schedule);\n  window.addEventListener('garang:coach-mounted', schedule);\n  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });"
)
replace_once(
    exp3,
    "    if (event.target.closest('[data-page],[data-pagego]')) setTimeout(schedule, 0);",
    "    if (event.target.closest('[data-page],[data-pagego],#addWorkout,#clearWorkoutDraft,#saveWorkoutSession,[data-edit-workout],[data-remove-workout],#saveProfile,#savePreferences,#saveOnboarding')) setTimeout(schedule, 0);"
)

exp4 = "06_features/ui/runtime/garang-experience-v4.js"
replace_once(
    exp4,
    "  /* body already contains #main; a second main observer duplicated every reconciliation. */\n  new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });\n  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });",
    "  /* Screen/state lifecycle replaces broad body reconciliation. */\n  window.addEventListener('garang:screen-rendered', schedule);\n  window.addEventListener('garang:state-updated', schedule);\n  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });"
)
replace_once(
    exp4,
    "    if (event.target.closest('[data-page],[data-pagego],#menuBtn,#settingsTopBtn,#addFood')) setTimeout(schedule, 0);",
    "    if (event.target.closest('[data-page],[data-pagego],#menuBtn,#settingsTopBtn,#addFood,#saveMeal,#clearMealScan,#confirmMealScan')) {setTimeout(schedule,0);requestAnimationFrame(schedule);}"
)

# Coach shell follows lifecycle and no longer writes the Decision subtree.
shell = "06_features/ui/runtime/garang-coach-home-hotfix.js"
text = read(shell)
text = text.replace("  let mainObserver = null;\n", "", 1)
text, count = re.subn(r"\n  function observeMain\(\) \{.*?\n  \}\n\n  function syncShell", "\n  function syncShell", text, count=1, flags=re.S)
if count != 1:
    raise SystemExit("shell observeMain block missing")
text = text.replace("    mainObserver?.disconnect();\n", "", 1)
text = text.replace("      observeMain();\n", "", 1)
text = text.replace("      compactDecision(root);\n", "", 1)
old = """  mainObserver = new MutationObserver(() => {
    if (!syncing) queueSync();
  });
  observeMain();

"""
if old not in text:
    raise SystemExit("shell observer tail missing")
text = text.replace(
    old,
    "  window.addEventListener('garang:screen-rendered', queueSync);\n  window.addEventListener('garang:coach-mounted', queueSync);\n  window.addEventListener('garang:coach-decision-rendered', queueSync);\n\n",
    1
)
write(shell, text)

# Agent follows Coach mount/message/state lifecycle instead of watching the Coach subtree.
agent = "06_features/ui/runtime/garang-coach-agent-v4.js"
text = read(agent)
old_decl = "let rootObserver=null,mainObserver=null,activeRoot=null,rootQueued=false;"
if old_decl not in text:
    raise SystemExit("agent observer declaration missing")
text = text.replace(old_decl, "let activeRoot=null,rootQueued=false;", 1)
pattern = r"function enhance\(root\)\{.*?\nscan\(\);\n"
replacement = """function activateRoot(root){
 if(!root||!root.isConnected)return;
 if(activeRoot===root){queueRootSync(root);return;}
 activeRoot=root;rootQueued=false;
 root.querySelectorAll('.g2-message.assistant[data-message-id]').forEach(message=>seenAssistantIds.add(message.dataset.messageId));
 syncPromptStrip(root);queueRootSync(root);
}
function syncLifecycleRoot(){
 const root=main.querySelector('.garang-coach-v2');
 if(!root){if(activeRoot&&!activeRoot.isConnected){activeRoot=null;rootQueued=false;}return;}
 activateRoot(root);
}
window.addEventListener('garang:screen-rendered',syncLifecycleRoot);
window.addEventListener('garang:coach-mounted',syncLifecycleRoot);
window.addEventListener('garang:coach-message-rendered',()=>queueRootSync(activeRoot));
window.addEventListener('garang:state-hydrated',()=>queueRootSync(activeRoot));
new MutationObserver(()=>queueRootSync(activeRoot)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:cloud-state-ready',()=>queueRootSync(activeRoot));
window.addEventListener('garang:agent-write',()=>queueRootSync(activeRoot));
syncLifecycleRoot();
"""
out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"agent lifecycle replacement count={count}")
write(agent, out)

# Decision owns its card only and publishes explicit lifecycle.
decision = "06_features/ui/runtime/garang-coach-decision-v1.js"
replace_once(
    decision,
    " const button=card.querySelector('.garang-decision-action');if(button)button.onclick=()=>{input.value='오늘 계획을 만들어줘';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('.g2-send')?.click();};\n}",
    " const button=card.querySelector('.garang-decision-action');if(button)button.onclick=()=>{input.value='오늘 계획을 만들어줘';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('.g2-send')?.click();};\n try{window.dispatchEvent(new CustomEvent('garang:coach-decision-rendered',{detail:{card,root}}));}catch{}\n}"
)
replace_once(
    decision,
    "new MutationObserver(queue).observe(main,{childList:true,subtree:true});new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});\nwindow.addEventListener('garang:agent-write',queue);",
    "window.addEventListener('garang:screen-rendered',queue);window.addEventListener('garang:coach-mounted',queue);new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});\nwindow.addEventListener('garang:state-hydrated',queue);window.addEventListener('garang:agent-write',queue);"
)

# Profile enhancement follows lifecycle rather than #main mutation.
profile = "06_features/ui/runtime/garang-coach-profile-stability-v1.js"
replace_once(
    profile,
    "new MutationObserver(queue).observe(main,{childList:true,subtree:true});\nnew MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});",
    "window.addEventListener('garang:screen-rendered',queue);\nwindow.addEventListener('garang:coach-mounted',queue);\nwindow.addEventListener('garang:coach-decision-rendered',queue);\nwindow.addEventListener('garang:state-hydrated',queue);\nnew MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});"
)

# Persistent prompts/language follow message lifecycle, not characterData-wide observation.
item4 = "06_features/ui/runtime/garang-coach-item4-final.js"
replace_once(
    item4,
    "new MutationObserver(queueRepair).observe(main,{childList:true,subtree:true,characterData:true});\nnew MutationObserver(queueRepair).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});",
    "window.addEventListener('garang:screen-rendered',queueRepair);\nwindow.addEventListener('garang:coach-mounted',queueRepair);\nwindow.addEventListener('garang:coach-message-rendered',queueRepair);\nwindow.addEventListener('garang:state-hydrated',queueRepair);\nnew MutationObserver(queueRepair).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});"
)

# Boot surface: remove absorbed polish hotfix and bust changed runtime assets.
index = "index.html"
text = read(index)
text, count = re.subn(r'<script src="\./06_features/ui/runtime/garang-polish-v3-fix\.js\?v=[^"]+"></script>', "", text, count=1)
if count != 1:
    raise SystemExit("polish-fix script tag missing")
versions = {
    "./01_app/app.js?v=0.11.0-beta.5-stability2-datav2-iosroot1": "./01_app/app.js?v=0.11.0-beta.5-lifecycle1",
    "./06_features/ui/runtime/garang-brand-runtime-v2.js?v=2.1.0-auth-pinned-coach": "./06_features/ui/runtime/garang-brand-runtime-v2.js?v=2.2.0-lifecycle",
    "./06_features/ui/runtime/garang-polish-v3.js?v=3.0.0": "./06_features/ui/runtime/garang-polish-v3.js?v=3.1.0-lifecycle",
    "./06_features/ui/runtime/garang-coach-home-hotfix.js?v=5.2.0-hit-test-safety": "./06_features/ui/runtime/garang-coach-home-hotfix.js?v=5.3.0-lifecycle",
    "./06_features/ui/runtime/garang-coach-agent-v4.js?v=4.4.0-auth-hydration-retry": "./06_features/ui/runtime/garang-coach-agent-v4.js?v=4.5.0-lifecycle",
    "./06_features/ui/runtime/garang-coach-profile-stability-v1.js?v=1.0.0": "./06_features/ui/runtime/garang-coach-profile-stability-v1.js?v=1.1.0-lifecycle",
    "./06_features/ui/runtime/garang-coach-decision-v1.js?v=1.3.0-compact-grid": "./06_features/ui/runtime/garang-coach-decision-v1.js?v=1.4.0-lifecycle",
    "./06_features/ui/runtime/garang-coach-item4-final.js?v=1.0.0": "./06_features/ui/runtime/garang-coach-item4-final.js?v=1.1.0-lifecycle",
    "./06_features/ui/runtime/garang-experience-v3.js?v=1.2.0-stability-final": "./06_features/ui/runtime/garang-experience-v3.js?v=1.3.0-lifecycle",
    "./06_features/ui/runtime/garang-experience-v4.js?v=1.5.0-stability-final": "./06_features/ui/runtime/garang-experience-v4.js?v=1.6.0-lifecycle"
}
for old, new in versions.items():
    if old not in text:
        raise SystemExit(f"index cache marker missing: {old}")
    text = text.replace(old, new, 1)
write(index, text)

manifest = Path("runtime-manifest.json")
data = json.loads(manifest.read_text())
obsolete = "06_features/ui/runtime/garang-polish-v3-fix.js"
data["scripts"] = [entry for entry in data["scripts"] if entry != obsolete]
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

# Rotate service worker cache so physical iPhone receives this runtime build.
replace_once("02_core/sw-runtime.js", "const CACHE=`${CACHE_PREFIX}v17-20260907`;", "const CACHE=`${CACHE_PREFIX}v18-20260908`;")
replace_once(
    "sw.js",
    "/* GARANG SW loader app-shell-v17-20260907 */\nimportScripts('./02_core/sw-runtime.js?v=app-shell-v17-20260907');",
    "/* GARANG SW loader app-shell-v18-20260908 */\nimportScripts('./02_core/sw-runtime.js?v=app-shell-v18-20260908');"
)

# Freeze complete product capability surface before structural removal is allowed.
preservation = r'''\'use strict\';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),app=read('01_app/app.js'),manifest=JSON.parse(read('runtime-manifest.json'));
const agent=read('06_features/final/agent-state-hook-v1.js');
const coach=read('06_features/ui/runtime/garang-brand-runtime-v2.js');
const decision=read('06_features/ui/runtime/garang-coach-decision-v1.js');
const recovery=read('06_features/ui/runtime/garang-data-migration-v2.js');
const settings=read('06_features/ui/runtime/garang-settings-touch-safety-v1.js');
for(const route of ['today','coach','workout','body','progress']) assert.ok(html.includes(`data-page="${route}"`),`bottom route missing ${route}`);
for(const id of ['menuBtn','syncBadge','settingsTopBtn','profileTopBtn','logoutBtn','main','bottomNav','mediaPicker','mealScanPicker','bodyScanPicker']) assert.ok(html.includes(`id="${id}"`),`global capability missing ${id}`);
for(const token of ["$('settingsTopBtn').onclick=()=>go('settings')","$('profileTopBtn').onclick=()=>go('profile')","function cloudLoadAndMerge()","function saveState(","function go(page)","function render()"]) assert.ok(app.includes(token),`core behavior missing ${token}`);
for(const token of ['createPlan','updatePlan','saveMemory','deleteRecord','updateGoal']) assert.ok(agent.includes(`case '${token}'`),`Agent write capability missing ${token}`);
for(const token of ['g2-send','g2-new-chat','g2-mobile-threads','g2-thread-list','garang_coach_threads_v2::']) assert.ok(coach.includes(token),`Coach capability missing ${token}`);
for(const token of ['garang-decision-toggle','garang-decision-action']) assert.ok(decision.includes(token),`Decision capability missing ${token}`);
for(const token of ['scanData','restoreReport','data-recovery-rescan','data-recovery-export','data-recovery-restore']) assert.ok(recovery.includes(token),`Recovery capability missing ${token}`);
assert.ok(settings.includes('GarangSettingsTouchSafety'),'Settings touch capability missing');
for(const required of ['06_features/ui/runtime/garang-brand-runtime-v2.js','06_features/ui/runtime/garang-polish-v3.js','06_features/ui/runtime/garang-coach-home-hotfix.js','06_features/ui/runtime/garang-coach-agent-v4.js','06_features/ui/runtime/garang-coach-decision-v1.js','06_features/ui/runtime/garang-coach-profile-stability-v1.js','06_features/ui/runtime/garang-coach-item4-final.js','06_features/ui/runtime/garang-experience-v3.js','06_features/ui/runtime/garang-experience-v4.js']) assert.ok(manifest.scripts.includes(required),`runtime capability missing ${required}`);
assert.equal(manifest.scripts.includes('06_features/ui/runtime/garang-polish-v3-fix.js'),false,'absorbed polish hotfix must not boot');
assert.equal(fs.existsSync(path.join(root,'06_features/ui/runtime/garang-polish-v3-fix.js')),false,'absorbed polish hotfix file must be removed');
console.log('stability-feature-preservation: PASS');
'''
Path("tests/stability-feature-preservation.test.cjs").write_text(preservation)

lifecycle = r'''\'use strict\';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('01_app/app.js');
const files={brand:read('06_features/ui/runtime/garang-brand-runtime-v2.js'),polish:read('06_features/ui/runtime/garang-polish-v3.js'),shell:read('06_features/ui/runtime/garang-coach-home-hotfix.js'),agent:read('06_features/ui/runtime/garang-coach-agent-v4.js'),decision:read('06_features/ui/runtime/garang-coach-decision-v1.js'),profile:read('06_features/ui/runtime/garang-coach-profile-stability-v1.js'),item4:read('06_features/ui/runtime/garang-coach-item4-final.js'),exp3:read('06_features/ui/runtime/garang-experience-v3.js'),exp4:read('06_features/ui/runtime/garang-experience-v4.js')};
assert.ok(app.includes("emitLifecycle('garang:screen-rendered'"),'screen render lifecycle missing');
assert.ok(app.includes("emitLifecycle('garang:state-updated'"),'state lifecycle missing');
assert.ok(app.includes("emitLifecycle('garang:state-hydrated'"),'hydration lifecycle missing');
assert.equal(app.includes("state.syncState='synced';setSync('synced');render();"),false,'hydration must not rebuild active Coach');
for(const [name,src] of Object.entries(files)){
  assert.equal(/\.observe\(document\.body\s*,\s*\{[^}]*subtree\s*:\s*true/s.test(src),false,`${name} must not broadly observe body`);
  if(['shell','agent','decision','profile','item4','exp3'].includes(name)) assert.equal(/\.observe\(main\s*,\s*\{[^}]*subtree\s*:\s*true/s.test(src),false,`${name} must not broadly observe #main`);
}
assert.equal(files.brand.includes('setTimeout(jump'),false,'Coach scroll owner must not schedule timeout cascades');
assert.equal(files.brand.includes('[32,80,160,320,600]'),false,'legacy repeated scroll cascade must be absent');
assert.equal(files.polish.includes('hardBottom'),false,'polish must not own Coach scrolling');
assert.equal(files.polish.includes('.g2-chat-scroll'),false,'polish must not touch Coach scroller');
for(const name of ['brand','shell','agent','decision','profile','item4','exp3','exp4']) assert.ok(files[name].includes('garang:screen-rendered')||files[name].includes('garang:coach-mounted'),`${name} must use lifecycle ownership`);
assert.ok(files.brand.includes('garang:coach-message-rendered'),'Coach owner must publish message lifecycle');
assert.ok(files.decision.includes('garang:coach-decision-rendered'),'Decision owner must publish card lifecycle');
console.log('runtime-lifecycle-contract: PASS');
'''
Path("tests/runtime-lifecycle-contract.test.cjs").write_text(lifecycle)

# Add the new preservation/lifecycle checks to every npm test.
package = Path("package.json")
pkg = json.loads(package.read_text())
current = pkg["scripts"]["test"]
needle = "node tests/commercial-core.test.cjs && "
insert = "node tests/commercial-core.test.cjs && node tests/stability-feature-preservation.test.cjs && node tests/runtime-lifecycle-contract.test.cjs && "
if "stability-feature-preservation.test.cjs" not in current:
    if needle not in current:
        raise SystemExit("package npm test insertion marker missing")
    current = current.replace(needle, insert, 1)
pkg["scripts"]["test"] = current
package.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")

# Tighten existing WebKit idle-mutation budget after Coach interaction.
stress = "tests/browser-mobile-stability-stress.test.cjs"
text = read(stress)
needle = "await settle(page,`coach ${cycle}`,16);"
if needle not in text:
    raise SystemExit("stress coach settle marker missing")
text = text.replace(needle, "await settle(page,`coach ${cycle}`,8);await page.waitForTimeout(650);await settle(page,`coach idle ${cycle}`,4);", 1)
write(stress, text)
