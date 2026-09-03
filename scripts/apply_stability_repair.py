from pathlib import Path
import json
import re

EXPECTED='af755dfba13bb8d98ed0392a4010879f97db1f98'

def one(text, old, new, label):
    n=text.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, got {n}')
    return text.replace(old,new,1)

# index
p=Path('index.html'); idx=p.read_text()
idx=one(idx,'<link rel="icon" href="./garang-mark.svg?v=font-logo-v1-20260904" type="image/svg+xml">','<link rel="icon" href="./garang-app-icon.svg?v=stability-v1-20260904" type="image/svg+xml">','favicon')
idx=one(idx,'<title>GARANG — Quietly Becoming</title>\n','<title>GARANG — Quietly Becoming</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">\n','fonts')
idx=one(idx,'<link rel="stylesheet" href="./garang-font-logo-v1.css?v=1.0.0">','<link rel="stylesheet" href="./garang-font-logo-v1.css?v=2.0.0">\n<link rel="stylesheet" href="./garang-stability-v1.css?v=1.0.0">','css')
idx=idx.replace('<input id="mediaPicker" type="file" accept="image/*,video/*" capture="environment" hidden>','<input id="mediaPicker" type="file" accept="image/*,video/*" hidden>')
idx=one(idx,'<script src="./garang-auth-bootstrap.js?v=1.0.0"></script>\n<script src="./app.js?v=0.11.0-beta.5"></script>','<script src="./data-schema.js?v=7"></script>\n<script src="./performance.js?v=recording-v2"></script>\n<script src="./garang-auth-bootstrap.js?v=1.1.0"></script>\n<script src="./app.js?v=0.11.0-beta.5-stability1"></script>','scripts')
p.write_text(idx)

# auth bootstrap: remove global fetch override; boot no longer waits for DB
p=Path('garang-auth-bootstrap.js'); auth=p.read_text().replace('GARANG AUTH BOOTSTRAP v1','GARANG AUTH BOOTSTRAP v1.1',1)
start=auth.find('  const nativeFetch = window.fetch.bind(window);')
end=auth.find('  function toast(message) {')
if start<0 or end<0 or end<=start: raise SystemExit('auth fetch guard not found')
auth=auth[:start]+auth[end:]
p.write_text(auth)

# app runtime
p=Path('app.js'); app=p.read_text()
app=one(app,"const num = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;","function num(v,f=0){const n=window.GarangSchema?GarangSchema.numeric(v):(v==null||(typeof v==='string'&&!v.trim())?null:(Number.isFinite(Number(v))?Number(v):null));return n===null?f:n;}",'numeric')
app=one(app,'const SERVICES = window.GARANG_SERVICES || {};',"const SERVICES = window.GARANG_SERVICES || {};\nconst accountBootstrapSafe=(...args)=>window.GarangSchema?GarangSchema.accountBootstrap(...args):null;\nconst mergeStatesSafe=(...args)=>window.GarangSchema?GarangSchema.mergeStates(...args):args[0];\nconst coachSummarySafe=(score,lang)=>window.GarangPerformance?GarangPerformance.coachSummary(score,lang):'';",'helpers')
old="""    if(firebaseReady)firebase.auth().onAuthStateChanged(async u=>{\n      currentUser=u;\n      if(u){storageKey=`garang_user_${u.uid}_v3`;loadLocal(storageKey);await cloudLoadAndMerge();showApp();}\n      else if(localStorage.getItem('garang_demo')==='1'){storageKey=DEMO_KEY;loadLocal(storageKey);showApp();}\n      else showAuth();\n    });"""
new="""    if(firebaseReady)firebase.auth().onAuthStateChanged(u=>{\n      currentUser=u;\n      if(u){storageKey=`garang_user_${u.uid}_v3`;loadLocal(storageKey);showApp();cloudLoadAndMerge().catch(e=>{captureError('cloud_load_after_auth',e);toast('클라우드 동기화는 백그라운드에서 다시 시도합니다.');});}\n      else if(localStorage.getItem('garang_demo')==='1'){storageKey=DEMO_KEY;loadLocal(storageKey);showApp();}\n      else showAuth();\n    });"""
app=one(app,old,new,'auth transition')
old="async function boot(){storageKey=localStorage.getItem('garang_demo')==='1'?DEMO_KEY:DEMO_KEY;loadLocal(storageKey);await loadDB();bindAuth();nav();initFirebase();registerSW();if(localStorage.getItem('garang_demo')==='1'&&!firebaseReady)showApp();else if(!firebaseReady)showAuth();}"
new="async function boot(){storageKey=DEMO_KEY;loadLocal(storageKey);bindAuth();nav();initFirebase();registerSW();if(localStorage.getItem('garang_demo')==='1'&&!firebaseReady)showApp();else if(!firebaseReady)showAuth();loadDB().then(()=>{if(!$('appView')?.hidden)render();}).catch(e=>{captureError('db_load',e);toast('일부 운동/식단 데이터는 연결 후 다시 불러옵니다.');});}"
app=one(app,old,new,'boot')

insights=r'''
const ux=(ko,en)=>uiLang()==='en'?en:ko;
function renderWorkoutInsights(){
 if(!window.GarangPerformance?.workoutInsights)return '';
 const x=GarangPerformance.workoutInsights(state,db.exercise),fmt=n=>Math.round(num(n)).toLocaleString();
 if(!x.records?.length)return `<div class="section-title"><h2>${ux('운동 분석','Workout insights')}</h2></div><div class="card empty">${ux('운동을 저장하면 부위별 최근 기록과 PR이 자동으로 정리됩니다.','Save a workout to build body-part history and personal records.')}</div>`;
 const card=(label,record,value)=>`<article class="insight-card"><span>${label}</span><strong>${record?value(record):'—'}</strong><small>${record?`${esc(record.name)} · ${esc(record.date||'—')}`:ux('기록 없음','No record')}</small></article>`;
 const row=e=>`<article class="pr-row"><div class="pr-head"><div><span class="muscle-chip">${esc(e.primaryMuscle)}</span><strong>${esc(e.name)}</strong></div><small>${esc(e.latest?.date||'—')}</small></div><div class="pr-metrics"><span><small>${ux('최고 중량','Max weight')}</small><b>${e.maxWeight?`${e.maxWeight.weight} kg`:'—'}</b></span><span><small>${ux('추정 1RM','Est. 1RM')}</small><b>${e.maxEstimated1RM?`${num(e.maxEstimated1RM.estimated1RM).toFixed(1)} kg`:'—'}</b></span><span><small>${ux('최고 볼륨','Max volume')}</small><b>${e.maxVolume?`${fmt(e.maxVolume.volume)} kg`:'—'}</b></span></div></article>`;
 return `<section class="record-insights"><div class="section-title"><div><span class="eyebrow">PERSONAL RECORDS</span><h2>${ux('최고 기록과 PR','Best records and PRs')}</h2></div></div><div class="insight-grid">${card(ux('전체 최고 중량','Overall max weight'),x.topWeight,r=>`${r.weight} kg`)}${card(ux('전체 추정 1RM','Overall estimated 1RM'),x.topEstimated1RM,r=>`${num(r.estimated1RM).toFixed(1)} kg`)}${card(ux('전체 최고 볼륨','Overall max volume'),x.topVolume,r=>`${fmt(r.volume)} kg`)}</div><div class="section-title compact"><h2>${ux('종목별 PR 현황','PRs by exercise')}</h2></div><div class="pr-list">${x.exercises.slice(0,12).map(row).join('')}</div></section>`;
}
function renderRunningInsights(){
 if(!window.GarangPerformance?.runningInsights)return '';
 const x=GarangPerformance.runningInsights(state),pace=GarangPerformance.formatPace,fmt=n=>num(n).toFixed(2);
 if(!x.records?.length)return `<div class="section-title"><h2>${ux('러닝 분석','Running insights')}</h2></div><div class="card empty">${ux('러닝을 저장하면 평균 페이스와 최고 기록이 표시됩니다.','Save a run to see average pace and best records.')}</div>`;
 const card=(label,value,meta)=>`<article class="insight-card"><span>${label}</span><strong>${value}</strong><small>${meta}</small></article>`;
 return `<section class="record-insights"><div class="section-title"><div><span class="eyebrow">RUNNING RECORDS</span><h2>${ux('평균 페이스와 최고 기록','Average pace and best records')}</h2></div></div><div class="insight-grid run-grid">${card(ux('전체 평균 페이스','Overall average pace'),`${pace(x.averagePace)} /km`,ux('거리 가중 평균','Distance-weighted average'))}${card(ux('최고 페이스','Fastest pace'),`${pace(x.fastest?.pace)} /km`,esc(x.fastest?.date||'—'))}${card(ux('최장 거리','Longest distance'),`${fmt(x.longest?.distance)} km`,esc(x.longest?.date||'—'))}${card(ux('누적 거리','Total distance'),`${fmt(x.totalDistance)} km`,`${x.count}${ux('회',' runs')}`)}</div></section>`;
}
'''
marker='function workoutPage(){'
if marker not in app: raise SystemExit('workout marker missing')
app=app.replace(marker,insights+'\nfunction workoutPageBase(){',1)
app=one(app,'function renderWorkoutDraft(){','function workoutPage(){return workoutPageBase()+renderWorkoutInsights();}\nfunction renderWorkoutDraft(){','workout wrapper')
app=one(app,'function runningPage(){return','function runningPageBase(){return','running base')
app=one(app,'function bodyDerived(','function runningPage(){return runningPageBase()+renderRunningInsights();}\nfunction bodyDerived(','running wrapper')
app=one(app,'<div class="cert-poster-placeholder premium-placeholder"><div class="cert-mark">G</div><div><strong>Performance Plaque</strong><span>사진을 가리지 않는 프리미엄 투명 오버레이</span></div></div><button id="certWorkout" class="ghost wide">사진 / 영상 선택</button>','<div class="cert-poster-placeholder premium-placeholder"><img class="cert-mark-img" src="./garang-mark.svg" alt="GARANG"><div><strong>Performance Plaque</strong><span>사진을 가리지 않는 프리미엄 투명 오버레이</span></div></div><div class="actions"><button id="certWorkout" class="ghost">사진첩에서 불러오기</button><button id="workoutOverlayOnly" class="ghost">투명 오버레이 PNG</button></div>','workout overlay UI')
app=one(app,'<button id="runStart" class="primary">러닝 시작</button><button id="runStop" class="ghost">정지 & 저장</button><button id="runCert" class="ghost">인증 미디어</button>','<button id="runStart" class="primary">러닝 시작</button><button id="runStop" class="ghost">정지 & 저장</button><button id="runCert" class="ghost">사진첩에서 불러오기</button><button id="runOverlayOnly" class="ghost">투명 오버레이 PNG</button>','run overlay UI')
app=one(app,"  $('certWorkout').onclick=()=>pickMedia('mediaPicker',m=>{currentCert.workout=m;showCert('workoutCertArea',m,state.workouts.at(-1),'workout');});","  $('certWorkout').onclick=()=>pickMedia('mediaPicker',m=>{currentCert.workout=m;showCert('workoutCertArea',m,state.workouts.at(-1),'workout');});$('workoutOverlayOnly')?.addEventListener('click',()=>saveTransparentOverlay('workout'));",'bind workout overlay')
app=one(app,"function bindRunning(){$('runStart').onclick=startRun;$('runStop').onclick=stopRun;$('runCert').onclick=()=>pickMedia('mediaPicker',m=>{currentCert.running=m;showCert('runCertArea',m,state.runs.at(-1),'running');});}","function bindRunning(){$('runStart').onclick=startRun;$('runStop').onclick=stopRun;$('runCert').onclick=()=>pickMedia('mediaPicker',m=>{currentCert.running=m;showCert('runCertArea',m,state.runs.at(-1),'running');});$('runOverlayOnly')?.addEventListener('click',()=>saveTransparentOverlay('running'));}",'bind run overlay')

overlay=r'''
async function saveTransparentOverlay(kind,providedInfo){
 try{const info=providedInfo||certInfo(kind==='running'?state.runs.at(-1):state.workouts.at(-1),kind),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=70;c.clearRect(0,0,w,h);c.strokeStyle='rgba(242,240,237,.72)';c.lineWidth=2;drawRoundRect(c,34,34,w-68,h-68,28);c.stroke();c.fillStyle='rgba(7,8,7,.82)';drawRoundRect(c,48,48,430,118,24);c.fill();drawRoundRect(c,48,h-430,w-96,360,28);c.fill();c.fillStyle='#f2f0ed';c.font='500 46px "Cormorant Garamond",Georgia,serif';c.fillText('GARANG',pad,112);c.font='600 19px "Noto Sans KR",system-ui,sans-serif';c.fillStyle='rgba(242,240,237,.70)';c.fillText(info.title,pad,146);c.fillStyle='#f2f0ed';c.font='600 64px "Noto Sans KR",system-ui,sans-serif';c.fillText(String(info.headline||'GARANG VERIFIED').slice(0,25),pad,h-315);c.font='500 24px "Noto Sans KR",system-ui,sans-serif';c.fillStyle='rgba(242,240,237,.76)';c.fillText(String(info.sub||'').slice(0,60),pad,h-265);if(kind==='running')drawRouteCanvas(c,info.coords,w-350,h-660,230,300);else drawAnatomyBadgeCanvas(c,info.muscleKey||'full',w-330,h-690,190,340);const cell=(w-pad*2)/3;info.metrics.slice(0,3).forEach((mt,i)=>{const x=pad+i*cell;c.fillStyle='rgba(242,240,237,.55)';c.font='600 15px "Noto Sans KR",system-ui,sans-serif';c.fillText(String(mt[0]),x,h-190);c.fillStyle='#f2f0ed';c.font='600 24px "Noto Sans KR",system-ui,sans-serif';c.fillText(String(mt[1]),x,h-154);});c.fillStyle='rgba(242,240,237,.62)';c.font='500 17px "Noto Sans KR",system-ui,sans-serif';c.fillText(`${info.date||today()} · GARANG`,pad,h-92);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('overlay export failed');const name=`GARANG_${kind==='running'?'RUN':'WORKOUT'}_${today()}_OVERLAY.png`,file=new File([blob],name,{type:'image/png'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'GARANG VERIFIED',files:[file]});return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}catch(e){captureError('transparent_overlay',e);toast('투명 오버레이 PNG 생성에 실패했습니다.');}
}
'''
marker='async function shareCompositeImage(m,record,kind)'
if marker not in app: raise SystemExit('share marker missing')
app=app.replace(marker,overlay+'\n'+marker,1)
p.write_text(app)
Path('01_app/app.js').write_text(app)

# typography
Path('garang-font-logo-v1.css').write_text(''':root{--garang-brand-display:"Cormorant Garamond","Iowan Old Style",Baskerville,Georgia,"Times New Roman",serif;--garang-brand-ui:"Noto Sans KR",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",system-ui,-apple-system,sans-serif;--garang-brand-korean:var(--garang-brand-ui)}\nhtml[lang="ko"],body{font-family:var(--garang-brand-ui)!important}button,input,select,textarea,label,.muted,.helper,.pill,.badge,.eyebrow,.stat-label,.chat-text,.gpt-text,.settings-row,.plan-row,.memory-card{font-family:var(--garang-brand-ui)!important}.page-head h1,.auth-copy h1,.chat-head h1,.coach-app-head h1,.section-title h2,.card h2,.card h3,.today-decision-panel h2,.profile-goal{font-family:var(--garang-brand-ui)!important;font-style:normal!important;letter-spacing:-.035em!important}.brand b,.cert-wordmark,.score-number,.metric-big,.nutrition-kcal strong,.workout-primary-metric strong{font-family:var(--garang-brand-display)!important;font-weight:500!important}.brand b{letter-spacing:.30em!important}.brand span{font-family:var(--garang-brand-ui)!important;font-weight:500!important;letter-spacing:.18em!important}\n''')
Path('garang-stability-v1.css').write_text('''.record-insights{margin-top:18px;display:grid;gap:12px}.record-insights .section-title{margin:10px 0 2px}.insight-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.insight-grid.run-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.insight-card,.pr-row{min-width:0;background:#0b0c0b;border:1px solid var(--line);border-radius:12px;padding:14px}.insight-card span{display:block;color:var(--muted);font-size:9px}.insight-card strong{display:block;margin:7px 0 4px;font-size:22px;font-weight:600}.insight-card small{color:#777a75;font-size:8px}.pr-list{display:grid;gap:8px}.pr-head{display:flex;justify-content:space-between;gap:12px}.pr-head>div{display:flex;align-items:center;gap:8px;min-width:0}.muscle-chip{display:inline-flex;border:1px solid #28493f;background:#0d1c17;color:#a8c8bd;border-radius:999px;padding:4px 7px;font-size:8px;white-space:nowrap}.pr-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:10px;background:var(--line);border:1px solid var(--line);border-radius:9px;overflow:hidden}.pr-metrics span{display:grid;gap:3px;background:#090a09;padding:9px}.pr-metrics small{color:var(--muted);font-size:8px}.pr-metrics b{font-size:12px}.cert-mark-img{width:48px;height:78px;object-fit:contain}.auth-view,.auth-card{isolation:isolate}.auth-card,.auth-card button,.auth-card input{pointer-events:auto!important}@media(max-width:760px){.insight-grid,.insight-grid.run-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:420px){.insight-grid,.insight-grid.run-grid,.pr-metrics{grid-template-columns:1fr}}\n''')

# exact app icon from current approved mark payload
mark=Path('garang-mark.svg').read_text(); m=re.search(r'href="(data:image/png;base64,[^"]+)"',mark)
if not m: raise SystemExit('mark payload missing')
Path('garang-app-icon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="GARANG app icon">\n<rect width="512" height="512" rx="112" fill="#050605"/>\n<image href="{m.group(1)}" x="178" y="80" width="156" height="351" preserveAspectRatio="xMidYMid meet"/>\n</svg>\n')

manifest=json.loads(Path('manifest.webmanifest').read_text())
manifest['icons']=[{'src':'garang-app-icon.svg','sizes':'512x512','type':'image/svg+xml','purpose':'any maskable'}]
manifest['description']='GARANG Intelligence — 운동·식단·러닝·체성분과 누적된 선택을 이해해 다음 행동을 제안합니다.'
Path('manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

p=Path('sw.js'); sw=p.read_text(); sw=re.sub(r"const CACHE='[^']+';","const CACHE='garang-stability-v1-20260904';",sw,count=1)
sw=one(sw,"'./','./index.html','./styles.css','./garang-target-ui.css','./garang-functional-recovery.css','./garang-runtime-final.css','./garang-brand-runtime-v2.css','./garang-polish-v3.css','./garang-font-logo-v1.css',","'./','./index.html','./styles.css','./garang-target-ui.css','./garang-functional-recovery.css','./garang-runtime-final.css','./garang-brand-runtime-v2.css','./garang-polish-v3.css','./garang-font-logo-v1.css','./garang-stability-v1.css',",'sw css')
sw=one(sw,"'./garang-auth-bootstrap.js','./app.js','./garang-functional-recovery.js'","'./data-schema.js','./performance.js','./garang-auth-bootstrap.js','./app.js','./garang-functional-recovery.js'",'sw scripts')
p.write_text(sw)
