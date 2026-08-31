/* GARANG V9.9 FINAL MASTER
   Clean single-app controller. Legacy data assets are preserved separately.
   No legacy UI/controller scripts are loaded by index.html.
*/
(() => {
  'use strict';
  const VERSION = 'GARANG V9.9 FINAL MASTER';
  const LOCAL_GUEST = 'garang_v99_guest';
  const LOCAL_PREFIX = 'garang_v99_user_';
  const OLD_KEY = 'fitmind_v2';
  const $ = id => document.getElementById(id);
  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => [...root.querySelectorAll(sel)];
  const today = () => new Date().toISOString().slice(0,10);
  const uid = (prefix='id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const round = (v,d=1) => Number(n(v).toFixed(d));
  const fmt = v => Math.round(n(v)).toLocaleString('ko-KR');
  const clamp = (v,min,max) => Math.max(min, Math.min(max, v));

  const EMPTY = {
    profile: {name:'',height:174,weight:70,targetWeight:70,goal:'maintain',tier:'free'},
    preferences:{language:'ko',country:'KR',unit:'metric'},
    workouts:[], workoutSessions:[], meals:[], mealSessions:[], running:[], body:[], chat:[],
    coachMemory:{facts:[],preferences:[],goals:[],events:[],lastAdvice:'',updatedAt:''},
    certifications:[], consent:{globalLearning:false}, api:{}, createdAt:null, updatedAt:null
  };
  let db = structuredCloneSafe(EMPTY);
  let foods = [], exercises = [];
  let currentUser = null;
  let firebaseReady = false;
  let firestoreTimer = null;
  let authBooted = false;
  let workoutRowId = 0, mealRowId = 0;

  function structuredCloneSafe(x){ return JSON.parse(JSON.stringify(x)); }
  function normalizeDb(input){
    const src = input && typeof input === 'object' ? input : {};
    const out = structuredCloneSafe(EMPTY);
    Object.assign(out, src);
    for (const k of ['workouts','workoutSessions','meals','mealSessions','running','body','chat','certifications']) if(!Array.isArray(out[k])) out[k]=[];
    out.profile = {...EMPTY.profile, ...(src.profile||{})};
    out.preferences = {...EMPTY.preferences, ...(src.preferences||{})};
    out.coachMemory = {...EMPTY.coachMemory, ...(src.coachMemory||{})};
    for (const k of ['facts','preferences','goals','events']) if(!Array.isArray(out.coachMemory[k])) out.coachMemory[k]=[];
    out.consent = {...EMPTY.consent, ...(src.consent||{})};
    out.api = {...(src.api||{})};
    // Backward-compatible normalization: preserve legacy flat records and synthesize sessions
    // only when the new session collections are absent. No legacy record is discarded.
    if(!out.workoutSessions.length && out.workouts.length){
      const groups=new Map();
      out.workouts.forEach(w=>{const key=w.sessionId||`${w.date||w.createdAt||today()}_legacy`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w);});
      out.workoutSessions=[...groups.entries()].map(([id,items])=>({id,date:items[0].date||today(),createdAt:items[0].createdAt||new Date().toISOString(),bodyWeight:n(items[0].bodyWeight)||n(out.profile.weight)||70,items:items.map(w=>({...w,exercise:w.exercise||w.name||w.exercise_name||'운동',sets:n(w.sets),reps:n(w.reps),weight:n(w.weight),rpe:n(w.rpe),durationMin:n(w.durationMin||w.duration),calories:n(w.calories),volume:n(w.volume)||n(w.weight)*n(w.reps)*Math.max(1,n(w.sets))})),totalVolume:items.reduce((a,w)=>a+(n(w.volume)||n(w.weight)*n(w.reps)*Math.max(1,n(w.sets))),0),totalSets:items.reduce((a,w)=>a+n(w.sets),0),durationMin:items.reduce((a,w)=>a+n(w.durationMin||w.duration),0),calories:items.reduce((a,w)=>a+n(w.calories),0)}));
    }
    if(!out.mealSessions.length && out.meals.length){
      const groups=new Map();
      out.meals.forEach(m=>{const key=m.sessionId||`${m.date||m.createdAt||today()}_${m.mealType||'legacy'}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
      out.mealSessions=[...groups.entries()].map(([id,items])=>({id,date:items[0].date||today(),createdAt:items[0].createdAt||new Date().toISOString(),mealType:items[0].mealType||'식사',note:'legacy import',items:items.map(m=>({foodId:m.foodId||null,name:m.name||m.meal||'음식',qty:n(m.qty)||n(m.servings)*100,unit:'g',kcal:n(m.kcal||m.calories),protein:n(m.protein),carbs:n(m.carbs),fat:n(m.fat)})),totalKcal:items.reduce((a,m)=>a+n(m.kcal||m.calories),0),totalProtein:items.reduce((a,m)=>a+n(m.protein),0),totalCarbs:items.reduce((a,m)=>a+n(m.carbs),0),totalFat:items.reduce((a,m)=>a+n(m.fat),0)}));
    }
    if(!Array.isArray(out.running) && Array.isArray(src.runs)) out.running=src.runs;
    return out;
  }

  function showToast(message, kind='info'){
    const el=$('toast'); if(!el) return;
    el.textContent=message; el.dataset.kind=kind; el.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>el.classList.remove('show'),3200);
  }
  function setAuthError(message){ const el=$('authError'); if(el) el.textContent=message||''; }
  function authErrorMessage(err){
    const code=err?.code||'';
    const map={
      'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
      'auth/user-not-found':'가입되지 않은 이메일입니다.',
      'auth/wrong-password':'비밀번호가 올바르지 않습니다.',
      'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/email-already-in-use':'이미 가입된 이메일입니다.',
      'auth/weak-password':'비밀번호는 6자 이상이어야 합니다.',
      'auth/operation-not-allowed':'Firebase Console에서 해당 로그인 제공자를 활성화해야 합니다.',
      'auth/popup-blocked':'팝업이 차단되었습니다. 다시 시도해 주세요.',
      'auth/popup-closed-by-user':'로그인 창이 닫혔습니다.',
      'auth/network-request-failed':'네트워크 연결을 확인해 주세요.',
      'auth/too-many-requests':'요청이 많습니다. 잠시 후 다시 시도해 주세요.',
      'auth/unauthorized-domain':'Firebase Authentication의 승인된 도메인에 현재 도메인을 추가해야 합니다.',
      'auth/invalid-api-key':'Firebase Web App 설정의 API Key를 확인해 주세요.'
    };
    return map[code] || `인증 처리 중 오류가 발생했습니다.${code?` (${code})`:''}`;
  }

  function localKey(){ return currentUser ? LOCAL_PREFIX + currentUser.uid : LOCAL_GUEST; }
  function saveLocal(){
    try { db.updatedAt=new Date().toISOString(); localStorage.setItem(localKey(), JSON.stringify(db)); return true; }
    catch(e){ console.warn('[GARANG] local save failed',e); return false; }
  }
  function loadLocal(){
    try {
      const raw=localStorage.getItem(localKey());
      if(raw) return normalizeDb(JSON.parse(raw));
      if(!currentUser){ const old=localStorage.getItem(OLD_KEY); if(old) return migrateLegacy(JSON.parse(old)); }
    } catch(e){ console.warn('[GARANG] local load failed',e); }
    return structuredCloneSafe(EMPTY);
  }
  function migrateLegacy(old){
    const out=normalizeDb(old||{});
    if(out.profile.weight) out.profile.weight=n(out.profile.weight);
    if(!out.running.length && Array.isArray(old?.runs)) out.running=old.runs;
    out.migratedFrom='fitmind_v2';
    return out;
  }
  function scheduleCloudSave(){
    saveLocal();
    if(!currentUser || !firebaseReady) return;
    clearTimeout(firestoreTimer); firestoreTimer=setTimeout(syncCloud,700);
  }
  async function syncCloud(){
    if(!currentUser || !firebaseReady) return;
    try { await firebase.firestore().collection('users').doc(currentUser.uid).set(db,{merge:true}); }
    catch(e){ console.warn('[GARANG] Firestore sync failed',e); showToast('클라우드 저장에 실패했습니다. 로컬에는 저장되었습니다.','warn'); }
  }
  async function loadAccountData(user){
    currentUser=user;
    let local=loadLocal();
    if(!firebaseReady){db=local;return;}
    try{
      const snap=await firebase.firestore().collection('users').doc(user.uid).get();
      if(snap.exists) db=normalizeDb({...local,...snap.data(),profile:{...local.profile,...(snap.data().profile||{})}});
      else { db=local; db.profile.name=db.profile.name||user.displayName||''; await syncCloud(); }
      saveLocal();
    }catch(e){
      console.warn('[GARANG] account data load failed',e); db=local;
      showToast('클라우드 데이터를 불러오지 못해 기기 저장 데이터를 사용합니다.','warn');
    }
  }

  async function initFirebase(){
    const cfg=window.GARANG_FIREBASE_CONFIG;
    if(!window.firebase || !cfg || !cfg.apiKey || cfg.apiKey.startsWith('YOUR_')) return false;
    try{
      if(!firebase.apps.length) firebase.initializeApp(cfg);
      const auth=firebase.auth();
      if(auth.setPersistence) await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      firebaseReady=true;
      try { await auth.getRedirectResult(); } catch(e){ if(e?.code && e.code!=='auth/no-auth-event') setAuthError(authErrorMessage(e)); }
      auth.onAuthStateChanged(async user=>{
        if(!authBooted){ authBooted=true; }
        if(user){
          await loadAccountData(user);
          renderAll();
          showApp();
        } else if(!currentUser){ showAuth(); }
      });
      return true;
    }catch(e){
      console.error('[GARANG] Firebase init failed',e); firebaseReady=false; return false;
    }
  }

  function showAuth(){ $('authScreen').hidden=false; $('appScreen').hidden=true; }
  function showApp(){ $('authScreen').hidden=true; $('appScreen').hidden=false; }

  function bindAuth(){
    qa('[data-auth-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      qa('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===btn));
      $('loginForm').hidden=btn.dataset.authTab!=='login'; $('signupForm').hidden=btn.dataset.authTab!=='signup'; setAuthError('');
    }));
    $('loginForm').addEventListener('submit',async e=>{
      e.preventDefault(); setAuthError('');
      if(!firebaseReady){setAuthError('Firebase가 연결되지 않았습니다. Firebase Web App 설정을 확인해 주세요.');return;}
      try{ await firebase.auth().signInWithEmailAndPassword($('loginEmail').value.trim(),$('loginPw').value); }
      catch(err){ setAuthError(authErrorMessage(err)); }
    });
    $('signupForm').addEventListener('submit',async e=>{
      e.preventDefault(); setAuthError('');
      if(!firebaseReady){setAuthError('Firebase가 연결되지 않았습니다. Firebase Web App 설정을 확인해 주세요.');return;}
      if($('signupPw').value!==$('signupPw2').value){setAuthError('비밀번호가 서로 다릅니다.');return;}
      try{
        const cred=await firebase.auth().createUserWithEmailAndPassword($('signupEmail').value.trim(),$('signupPw').value);
        if($('signupName').value.trim()) await cred.user.updateProfile({displayName:$('signupName').value.trim()});
        db=structuredCloneSafe(EMPTY); db.profile.name=$('signupName').value.trim(); db.createdAt=new Date().toISOString();
        await loadAccountData(cred.user); await syncCloud(); showToast('계정이 생성되었습니다.','success');
      }catch(err){setAuthError(authErrorMessage(err));}
    });
    $('resetPwBtn').addEventListener('click',async()=>{
      const email=$('loginEmail').value.trim();
      if(!email){setAuthError('먼저 이메일을 입력해 주세요.');return;}
      try{await firebase.auth().sendPasswordResetEmail(email);showToast('비밀번호 재설정 이메일을 보냈습니다.','success');}
      catch(err){setAuthError(authErrorMessage(err));}
    });
    const redirectProvider=async type=>{
      setAuthError('');
      if(!firebaseReady){setAuthError('Firebase가 연결되지 않았습니다.');return;}
      try{
        const provider=type==='google'?new firebase.auth.GoogleAuthProvider():new firebase.auth.OAuthProvider('apple.com');
        await firebase.auth().signInWithRedirect(provider);
      }catch(err){setAuthError(authErrorMessage(err));}
    };
    $('googleBtn').addEventListener('click',()=>redirectProvider('google'));
    $('appleBtn').addEventListener('click',()=>redirectProvider('apple'));
  }

  function bindShell(){
    $('menuBtn').addEventListener('click',()=> $('sideMenu').classList.toggle('open'));
    $('logoutBtn').addEventListener('click',async()=>{ if(firebaseReady){try{await firebase.auth().signOut()}catch(e){}} currentUser=null; db=structuredCloneSafe(EMPTY); showAuth(); });
    $('tierBtn').addEventListener('click',()=>openPage('profile'));
    $('homeProfileBtn').addEventListener('click',()=>openPage('profile'));
    $('homeAskBtn').addEventListener('click',()=>{openPage('ai');setTimeout(()=>{$('chatInput').focus()},50)});
    qa('[data-page]').forEach(btn=>btn.addEventListener('click',()=>openPage(btn.dataset.page)));
  }
  function openPage(id){
    qa('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    qa('#bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    qa('#sideMenu button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    $('sideMenu').classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
    renderPage(id);
  }
  window.openPage=openPage;

  async function loadAssets(){
    const [f,e]=await Promise.allSettled([
      fetch('data/food-db.json?v=20260823',{cache:'no-store'}).then(r=>r.ok?r.json():[]),
      fetch('data/exercise-db.json?v=20260823',{cache:'no-store'}).then(r=>r.ok?r.json():[])
    ]);
    foods=f.status==='fulfilled'&&Array.isArray(f.value)?f.value:[];
    exercises=e.status==='fulfilled'&&Array.isArray(e.value)?e.value:[];
    if(!foods.length) showToast('식단 DB를 불러오지 못했습니다. data/food-db.json 경로를 확인해 주세요.','warn');
    if(!exercises.length) showToast('운동 DB를 불러오지 못했습니다. data/exercise-db.json 경로를 확인해 주세요.','warn');
  }

  function exerciseMatches(text){
    const t=String(text||'').toLowerCase().trim(); if(!t)return exercises.slice(0,8);
    return exercises.filter(x=>(x.exercise_name+' '+(x.aliases||[]).join(' ')).toLowerCase().includes(t)).slice(0,10);
  }
  function foodMatches(text){
    const t=String(text||'').toLowerCase().trim(); if(!t)return foods.slice(0,8);
    return foods.filter(x=>(x.name+' '+(x.aliases||[]).join(' ')).toLowerCase().includes(t)).slice(0,10);
  }

  function workoutRow(data={}){
    workoutRowId++;
    const id=`wr_${workoutRowId}`;
    const row=document.createElement('div'); row.className='record-row workout-row'; row.dataset.id=id;
    const options=exerciseMatches(data.exercise||'').map(x=>`<option value="${esc(x.exercise_name)}">`).join('');
    row.innerHTML=`<div class="row-top"><label class="grow">운동<input class="exercise-name" list="exerciseDatalist" placeholder="예: 바벨 벤치프레스" value="${esc(data.exercise||'')}"></label><button type="button" class="remove-row" aria-label="운동 삭제">×</button></div><div class="row-grid five"><label>세트<input class="sets" type="number" min="1" value="${n(data.sets)||3}"></label><label>반복<input class="reps" type="number" min="1" value="${n(data.reps)||10}"></label><label>중량 kg<input class="weight" type="number" min="0" step="0.5" value="${data.weight??''}"></label><label>시간 분<input class="duration" type="number" min="0" step="1" value="${data.durationMin??''}" placeholder="자동"></label><label>RPE<input class="rpe" type="number" min="1" max="10" step="0.5" value="${data.rpe??8}"></label></div><div class="row-meta"><span class="row-cal">예상 소비 0 kcal</span><span class="row-vol">볼륨 0 kg</span></div>`;
    return row;
  }
  function findExercise(name){
    const t=String(name||'').trim().toLowerCase();
    return exercises.find(x=>x.exercise_name.toLowerCase()===t) || exercises.find(x=>(x.aliases||[]).some(a=>String(a).toLowerCase()===t));
  }
  function bodyWeight(){ return n(db.profile.weight) || n(db.body.slice(-1)[0]?.weight) || 70; }
  function exerciseCalc(row){
    const ex=findExercise(q('.exercise-name',row)?.value);
    const sets=n(q('.sets',row)?.value), reps=n(q('.reps',row)?.value), weight=n(q('.weight',row)?.value);
    const rpe=clamp(n(q('.rpe',row)?.value)||8,1,10);
    const entered=n(q('.duration',row)?.value);
    const minutes=entered>0?entered:Math.max(2,sets*2.5);
    const met=n(ex?.met_default)||5;
    const intensity=0.85+(rpe-1)*0.035;
    const kcal=met*3.5*bodyWeight()/200*minutes*clamp(intensity,0.85,1.2);
    const volume=sets*reps*weight;
    return {sets,reps,weight,rpe,minutes,kcal,volume,met,exercise:ex?.exercise_name||q('.exercise-name',row)?.value.trim()||'운동',exerciseId:ex?.exercise_id||null,primaryMuscle:ex?.primary_muscle||''};
  }
  function renderWorkoutRows(){
    const host=$('workoutRows'); if(!host)return;
    if(!host.children.length) host.appendChild(workoutRow());
    updateWorkoutTotals();
  }
  function updateWorkoutTotals(){
    const rows=qa('.workout-row',$('workoutRows')); let v=0,s=0,m=0,k=0;
    rows.forEach(row=>{const x=exerciseCalc(row);v+=x.volume;s+=x.sets;m+=x.minutes;k+=x.kcal;q('.row-cal',row).textContent=`예상 소비 ${Math.round(x.kcal)} kcal`;q('.row-vol',row).textContent=`볼륨 ${Math.round(x.volume).toLocaleString()} kg`;});
    $('workoutTotalVolume').textContent=`${Math.round(v).toLocaleString()} kg`;
    $('workoutTotalSets').textContent=String(s);
    $('workoutTotalMinutes').textContent=`${Math.round(m)} min`;
    $('workoutTotalKcal').textContent=`${Math.round(k)} kcal`;
  }
  function saveWorkoutSession(){
    const rows=qa('.workout-row',$('workoutRows')).map(exerciseCalc).filter(x=>x.exercise);
    if(!rows.length){showToast('운동을 하나 이상 추가해 주세요.','warn');return;}
    const session={id:uid('ws'),date:today(),createdAt:new Date().toISOString(),bodyWeight:bodyWeight(),items:rows,totalVolume:rows.reduce((s,x)=>s+x.volume,0),totalSets:rows.reduce((s,x)=>s+x.sets,0),durationMin:rows.reduce((s,x)=>s+x.minutes,0),calories:rows.reduce((s,x)=>s+x.kcal,0)};
    db.workoutSessions.push(session);
    rows.forEach(x=>db.workouts.push({...x,date:session.date,sessionId:session.id,bodyWeight:session.bodyWeight,durationMin:x.minutes,calories:x.kcal,createdAt:session.createdAt}));
    learnEvent('workout_saved',{count:rows.length,calories:session.calories}); scheduleCloudSave(); renderAll(); showToast(`${rows.length}개 운동을 한 세션으로 저장했습니다.`,'success');
    $('workoutRows').innerHTML=''; renderWorkoutRows();
  }
  function renderWorkoutHistory(){
    const host=$('workoutHistory'); const sessions=db.workoutSessions.filter(x=>x.date===today()).slice().reverse();
    if(!sessions.length){host.innerHTML='<div class="empty-state small">오늘 저장된 운동이 없습니다.</div>';return;}
    host.innerHTML=sessions.map(s=>`<div class="history-item"><div><strong>${s.items.map(x=>esc(x.exercise)).join(' · ')}</strong><small>${esc(s.date)} · ${Math.round(s.totalSets)}세트 · ${Math.round(s.durationMin)}분</small></div><b>${Math.round(s.calories)} kcal</b></div>`).join('');
  }
  function todayWorkoutKcal(){ return db.workoutSessions.filter(x=>x.date===today()).reduce((s,x)=>s+n(x.calories),0); }

  function mealRow(data={}){
    mealRowId++;
    const row=document.createElement('div'); row.className='record-row meal-row'; row.dataset.id=`mr_${mealRowId}`;
    row.innerHTML=`<div class="row-top"><label class="grow">음식<input class="food-name" list="foodDatalist" placeholder="예: 닭가슴살" value="${esc(data.name||'')}"></label><button type="button" class="remove-row" aria-label="음식 삭제">×</button></div><div class="row-grid four"><label>섭취량 g<input class="food-qty" type="number" min="0.1" step="1" value="${data.qty??100}"></label><label>kcal<input class="food-kcal" type="number" readonly></label><label>단백질 g<input class="food-protein" type="number" readonly></label><label>탄수 g<input class="food-carbs" type="number" readonly></label></div><div class="row-meta"><span class="food-fat">지방 0 g</span><span class="food-source">DB 대기</span></div>`;
    updateMealRow(row); return row;
  }
  function findFood(name){
    const t=String(name||'').trim().toLowerCase();
    return foods.find(x=>x.name.toLowerCase()===t) || foods.find(x=>(x.aliases||[]).some(a=>String(a).toLowerCase()===t));
  }
  function updateMealRow(row){
    const food=findFood(q('.food-name',row)?.value); const qty=n(q('.food-qty',row)?.value); const basis=n(food?.basis_g||food?.nutrition_basis_g)||100; const factor=qty/basis;
    const kcal=n(food?.kcal)*factor, protein=n(food?.protein)*factor, carbs=n(food?.carbs)*factor, fat=n(food?.fat)*factor;
    q('.food-kcal',row).value=round(kcal,1); q('.food-protein',row).value=round(protein,1); q('.food-carbs',row).value=round(carbs,1); q('.food-fat',row).textContent=`지방 ${round(fat,1)} g`;
    q('.food-source',row).textContent=food?`${food.source||'GARANG DB'} · ${basis}g 기준`:'음식 DB에서 선택하세요';
    row.dataset.fat=fat; row.dataset.foodId=food?.food_id||''; row.dataset.basis=basis;
  }
  function updateMealTotals(){
    const rows=qa('.meal-row',$('mealRows')); let k=0,p=0,c=0,f=0;
    rows.forEach(r=>{updateMealRow(r);k+=n(q('.food-kcal',r)?.value);p+=n(q('.food-protein',r)?.value);c+=n(q('.food-carbs',r)?.value);f+=n(r.dataset.fat);});
    $('mealTotalKcal').textContent=fmt(k);$('mealTotalProtein').textContent=`${round(p,1)} g`;$('mealTotalCarbs').textContent=`${round(c,1)} g`;$('mealTotalFat').textContent=`${round(f,1)} g`;
  }
  function saveMealSession(){
    const rows=qa('.meal-row',$('mealRows')); const items=[];
    rows.forEach(r=>{const food=findFood(q('.food-name',r)?.value); if(!food)return; const qty=n(q('.food-qty',r)?.value); const basis=n(food.basis_g||food.nutrition_basis_g)||100;const factor=qty/basis;items.push({foodId:food.food_id,name:food.name,qty,unit:'g',kcal:n(food.kcal)*factor,protein:n(food.protein)*factor,carbs:n(food.carbs)*factor,fat:n(food.fat)*factor});});
    if(!items.length){showToast('영양 DB에서 음식 하나 이상을 선택해 주세요.','warn');return;}
    const session={id:uid('ms'),date:today(),createdAt:new Date().toISOString(),mealType:$('mealType').value,note:$('mealSessionNote').value.trim(),items,totalKcal:items.reduce((s,x)=>s+x.kcal,0),totalProtein:items.reduce((s,x)=>s+x.protein,0),totalCarbs:items.reduce((s,x)=>s+x.carbs,0),totalFat:items.reduce((s,x)=>s+x.fat,0)};
    db.mealSessions.push(session);
    items.forEach(x=>db.meals.push({...x,meal:x.name,servings:x.qty/(x.unit==='g'?100:1),mealType:session.mealType,sessionId:session.id,date:session.date,createdAt:session.createdAt,calories:x.kcal}));
    learnEvent('meal_saved',{count:items.length,kcal:session.totalKcal,protein:session.totalProtein});scheduleCloudSave();renderAll();showToast(`${items.length}개 음식을 한 끼로 저장했습니다.`,'success');
    $('mealRows').innerHTML=''; $('mealRows').appendChild(mealRow()); $('mealSessionNote').value=''; updateMealTotals();
  }
  function dailyNutrition(){
    const meals=db.mealSessions.filter(x=>x.date===today());
    return meals.reduce((a,x)=>({kcal:a.kcal+n(x.totalKcal),protein:a.protein+n(x.totalProtein),carbs:a.carbs+n(x.totalCarbs),fat:a.fat+n(x.totalFat)}),{kcal:0,protein:0,carbs:0,fat:0});
  }
  function renderDietDaily(){
    const x=dailyNutrition(); const target=n(db.profile.targetProtein)||Math.max(1,n(db.profile.weight)*1.8); const targetKcal=n(db.profile.targetCalories)||0;
    $('dietDaily').innerHTML=`<div class="nutrition-line"><div><span>kcal</span><b>${fmt(x.kcal)}</b>${targetKcal?` / ${fmt(targetKcal)}`:''}</div><i style="--p:${targetKcal?clamp(x.kcal/targetKcal*100,0,100):0}%"></i></div><div class="nutrition-line"><div><span>단백질</span><b>${round(x.protein,1)}g</b> / ${round(target,0)}g</div><i style="--p:${clamp(x.protein/target*100,0,100)}%"></i></div><div class="nutrition-line"><div><span>탄수화물</span><b>${round(x.carbs,1)}g</b></div><i style="--p:${clamp(x.carbs/Math.max(1,n(db.profile.weight)*4)*100,0,100)}%"></i></div><div class="nutrition-line"><div><span>지방</span><b>${round(x.fat,1)}g</b></div><i style="--p:${clamp(x.fat/Math.max(1,n(db.profile.weight)*1.1)*100,0,100)}%"></i></div>`;
    $('dietDayLabel').textContent=today();
  }
  function renderMealHistory(){
    const host=$('mealHistory'); const sessions=db.mealSessions.filter(x=>x.date===today()).slice().reverse();
    if(!sessions.length){host.innerHTML='<div class="empty-state small">오늘 저장된 식단이 없습니다.</div>';return;}
    host.innerHTML=sessions.map(s=>`<div class="history-item"><div><strong>${esc(s.mealType)} · ${s.items.map(x=>esc(x.name)).join(', ')}</strong><small>${Math.round(s.totalKcal)} kcal · P ${round(s.totalProtein,1)}g · C ${round(s.totalCarbs,1)}g · F ${round(s.totalFat,1)}g</small></div><b>${s.items.length}종</b></div>`).join('');
  }

  // ---------- Running / GPS ----------
  const run={active:false,paused:false,watchId:null,startMs:0,elapsedMs:0,lastTs:0,lastPos:null,distance:0,points:[],accuracy:null,timer:null};
  const haversine=(a,b)=>{const R=6371000,rad=Math.PI/180;const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  function runElapsed(){return run.paused?run.elapsedMs:run.active?Date.now()-run.startMs:run.elapsedMs;}
  function runKcal(){const hours=runElapsed()/3600000;const met=8.5;return met*3.5*bodyWeight()/200*hours*60;}
  function renderRunLive(){
    const ms=runElapsed(), sec=Math.floor(ms/1000);const mm=String(Math.floor(sec/60)).padStart(2,'0'),ss=String(sec%60).padStart(2,'0');
    const km=run.distance/1000;const pace=km>0?(ms/60000)/km:0;const pm=String(Math.floor(pace)).padStart(2,'0'),ps=String(Math.round((pace-Math.floor(pace))*60)).padStart(2,'0');
    $('runDistance').textContent=km.toFixed(2);$('runTime').textContent=`${mm}:${ss}`;$('runPace').textContent=km>0?`${pm}:${ps}`:'--:--';$('runKcal').textContent=`${Math.round(runKcal())} kcal`;$('runAccuracy').textContent=run.accuracy?`${Math.round(run.accuracy)}m`:'대기';
    $('runStatus').textContent=run.active?(run.paused?'PAUSED':'RUNNING'):'READY';$('runStart').disabled=run.active;$('runPause').disabled=!run.active;$('runStop').disabled=!run.active;
    if(run.timer) return; if(run.active){run.timer=setInterval(()=>{renderRunLive();},1000);}
  }
  function setRoute(){
    if(!run.points.length){$('routeLine').setAttribute('points','');return;}
    const lats=run.points.map(p=>p.lat),lons=run.points.map(p=>p.lon);const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);const dLat=maxLat-minLat||0.0001,dLon=maxLon-minLon||0.0001;
    const pts=run.points.map(p=>`${((p.lon-minLon)/dLon*86+7).toFixed(2)},${(100-((p.lat-minLat)/dLat*86+7)).toFixed(2)}`).join(' ');$('routeLine').setAttribute('points',pts);
  }
  function gpsError(err){ $('runHint').textContent=err?.code===1?'위치 권한이 거부되었습니다. Safari 설정에서 위치 권한을 허용하면 GPS 러닝을 사용할 수 있습니다.':'GPS를 사용할 수 없습니다. 네트워크/위치 설정을 확인해 주세요.'; showToast('GPS 상태를 확인해 주세요.','warn'); }
  function startRun(){
    if(!navigator.geolocation){showToast('이 브라우저는 GPS 위치 기능을 지원하지 않습니다.','warn');return;}
    run.active=true;run.paused=false;run.distance=0;run.points=[];run.lastPos=null;run.accuracy=null;run.elapsedMs=0;run.startMs=Date.now();run.lastTs=Date.now();
    $('runHint').textContent='GPS 추적 중… 화면을 잠그거나 백그라운드로 보내면 측정이 중단될 수 있습니다.';
    run.watchId=navigator.geolocation.watchPosition(pos=>{
      if(!run.active||run.paused)return;const c=pos.coords;run.accuracy=c.accuracy;
      if(run.lastPos){const delta=haversine(run.lastPos,{lat:c.latitude,lon:c.longitude});if(delta>=2 && delta<1000)run.distance+=delta;}
      run.lastPos={lat:c.latitude,lon:c.longitude};run.points.push({lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,ts:pos.timestamp});if(run.points.length>1000)run.points.shift();setRoute();renderRunLive();
    },gpsError,{enableHighAccuracy:true,maximumAge:1000,timeout:10000});
    renderRunLive();showToast('러닝을 시작했습니다.','success');
  }
  function pauseRun(){
    if(!run.active)return;
    if(!run.paused){run.elapsedMs=Date.now()-run.startMs;run.paused=true;}else{run.startMs=Date.now()-run.elapsedMs;run.paused=false;}renderRunLive();
  }
  function stopRun(){
    if(!run.active)return; if(run.watchId!=null)navigator.geolocation.clearWatch(run.watchId);run.watchId=null;run.elapsedMs=runElapsed();run.active=false;run.paused=false;if(run.timer){clearInterval(run.timer);run.timer=null;}
    const record={id:uid('run'),date:today(),createdAt:new Date().toISOString(),distanceKm:run.distance/1000,durationMin:run.elapsedMs/60000,paceMinPerKm:run.distance>0?(run.elapsedMs/60000)/(run.distance/1000):0,calories:runKcal(),points:run.points.slice(-1000),accuracy:run.accuracy};
    db.running.push(record);learnEvent('run_saved',{distanceKm:record.distanceKm,durationMin:record.durationMin});scheduleCloudSave();renderAll();showToast(`${record.distanceKm.toFixed(2)}km 러닝을 저장했습니다.`,'success');
  }
  function renderRunHistory(){
    const host=$('runHistory');const rows=db.running.slice().reverse().slice(0,12);if(!rows.length){host.innerHTML='<div class="empty-state small">최근 러닝 기록이 없습니다.</div>';return;}
    host.innerHTML=rows.map(r=>`<div class="history-item"><div><strong>${n(r.distanceKm).toFixed(2)} km</strong><small>${esc(r.date)} · ${formatDuration(n(r.durationMin)*60000)} · 페이스 ${formatPace(r.paceMinPerKm)}</small></div><b>${Math.round(n(r.calories))} kcal</b></div>`).join('');
  }
  function formatDuration(ms){const s=Math.round(ms/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function formatPace(p){if(!n(p))return '--:--';const m=Math.floor(p),s=Math.round((p-m)*60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}/km`;}

  // ---------- Certification ----------
  const cert={file:null,type:'workout',isVideo:false,objectUrl:null};
  function latestWorkout(){return db.workoutSessions.slice().reverse()[0]||null;}
  function latestRun(){return db.running.slice().reverse()[0]||null;}
  function certStats(){
    if($('certType').value==='run'){const r=latestRun();return r?`${r.distanceKm.toFixed(2)} km · ${formatDuration(r.durationMin*60000)} · ${formatPace(r.paceMinPerKm)} · ${Math.round(r.calories)} kcal`: '최근 러닝 기록 없음';}
    const w=latestWorkout();return w?`${w.items.length}종 · ${Math.round(w.totalSets)}세트 · ${Math.round(w.totalVolume)}kg · ${Math.round(w.calories)} kcal`:'최근 운동 기록 없음';
  }
  function openCert(type){openPage('certify');$('certType').value=type||'workout';updateCertOverlay();}
  function updateCertOverlay(){
    const type=$('certType').value; $('certOverlayTitle').textContent=type==='run'?'RUN VERIFIED':'WORKOUT VERIFIED';$('certOverlayStats').textContent=certStats();$('certOverlay').style.transform=`scale(${n($('overlayScale').value)||1})`;$('certOverlay').style.opacity=n($('overlayOpacity').value)||1;
  }
  function chooseCertFile(file){
    if(!file)return;cert.file=file;cert.isVideo=file.type.startsWith('video/');if(cert.objectUrl)URL.revokeObjectURL(cert.objectUrl);cert.objectUrl=URL.createObjectURL(file);
    $('certOverlay').hidden=false;$('certExport').disabled=cert.isVideo;$('certShare').disabled=false;$('certVideoShare').disabled=!cert.isVideo;$('certHint').textContent=cert.isVideo?'영상은 오버레이 프리뷰를 유지하고 Web Share/다운로드를 지원합니다. 브라우저가 캔버스 영상 인코딩을 지원하지 않으면 원본 영상 공유로 fallback합니다.':'사진은 GARANG 오버레이를 캔버스에 합성해 실제 이미지 파일로 저장합니다.';
    if(cert.isVideo){$('certCanvas').hidden=true;$('certVideoPreview').hidden=false;$('certVideoPreview').src=cert.objectUrl;$('certVideoPreview').load();}
    else{$('certVideoPreview').hidden=true;$('certCanvas').hidden=false;const img=new Image();img.onload=()=>renderCertImage(img);img.src=cert.objectUrl;}
    renderCertMeta();
  }
  function renderCertMeta(){ $('certOverlayTitle').textContent=$('certType').value==='run'?'RUN VERIFIED':'WORKOUT VERIFIED';$('certOverlayStats').textContent=certStats();updateCertOverlay(); }
  function renderCertImage(img){
    const c=$('certCanvas'),stage=$('certStage');const maxW=stage.clientWidth||700;const scale=Math.min(1,maxW/img.naturalWidth||1);c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);drawOverlayCanvas(ctx,c.width,c.height);}
  function drawOverlayCanvas(ctx,w,h){
    const s=n($('overlayScale').value)||1,o=n($('overlayOpacity').value)||1;const pad=Math.max(18,w*0.035);const boxH=Math.max(70,h*0.13)*s;ctx.save();ctx.globalAlpha=o;ctx.fillStyle='rgba(5,6,7,.76)';ctx.roundRect(pad,h-pad-boxH,w-pad*2,boxH,22);ctx.fill();ctx.fillStyle='#39ff7a';ctx.font=`900 ${Math.max(18,w*.04)*s}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText('GARANG',pad+20,h-pad-boxH+36*s);ctx.fillStyle='#ffffff';ctx.font=`800 ${Math.max(12,w*.025)*s}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText($('certOverlayTitle').textContent,pad+20,h-pad-boxH+62*s);ctx.fillStyle='#b5bec5';ctx.font=`600 ${Math.max(10,w*.019)*s}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText(certStats(),pad+20,h-pad-boxH+84*s);ctx.restore();
  }
  async function exportCertImage(){
    if(!cert.file||cert.isVideo)return;const a=document.createElement('a');const c=$('certCanvas');c.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);a.href=url;a.download=`GARANG_${today()}_VERIFIED.jpg`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showToast('인증 이미지를 저장했습니다.','success');},'image/jpeg',.92);
  }
  async function shareBlob(blob,name,text){
    const file=new File([blob],name,{type:blob.type});if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:'GARANG Verified',text});return true;}catch(e){if(e?.name==='AbortError')return false;}}
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return true;
  }
  async function shareCert(){
    if(!cert.file)return; if(cert.isVideo){return shareVideo();}
    $('certCanvas').toBlob(blob=>shareBlob(blob,`GARANG_${today()}_VERIFIED.jpg`,'GARANG 인증'), 'image/jpeg', .92);
  }
  async function shareVideo(){
    if(!cert.file)return;
    if(navigator.share){try{const file=cert.file;if(!navigator.canShare || navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'GARANG RUN/WORKOUT VERIFIED',text:certStats()});showToast('영상을 공유했습니다.','success');return;}}catch(e){if(e?.name==='AbortError')return;}}
    const a=document.createElement('a');a.href=cert.objectUrl;a.download=cert.file.name||`GARANG_${today()}.mp4`;document.body.appendChild(a);a.click();a.remove();showToast('영상 원본을 저장하도록 요청했습니다.','success');
  }

  // ---------- AI / Memory ----------
  function memoryItems(){return [...db.coachMemory.facts.map(x=>({type:'장기 사실',text:x.text||x})),...db.coachMemory.preferences.map(x=>({type:'선호',text:x.text||x})),...db.coachMemory.goals.map(x=>({type:'목표',text:x.text||x}))];}
  function learnEvent(type,payload){
    const e={id:uid('ev'),type,createdAt:new Date().toISOString(),payload};db.coachMemory.events.push(e);db.coachMemory.events=db.coachMemory.events.slice(-200);db.coachMemory.updatedAt=e.createdAt;
  }
  function isPro(){ return String(db.profile.tier||'free').toLowerCase()==='pro'; }
  function personalState(){
    const nut=dailyNutrition(), wk7=db.workoutSessions.filter(x=>new Date(x.date)>=new Date(Date.now()-7*864e5)), run30=db.running.filter(x=>new Date(x.date)>=new Date(Date.now()-30*864e5));
    return {weight:bodyWeight(),targetWeight:n(db.profile.targetWeight),goal:db.profile.goal,protein:n(nut.protein),kcal:n(nut.kcal),workoutDays7:new Set(wk7.map(x=>x.date)).size,workoutKcal:todayWorkoutKcal(),runs30:run30.length,distance30:run30.reduce((s,x)=>s+n(x.distanceKm),0),memoryCount:memoryItems().length};
  }
  function coachAnswer(text){
    const t=String(text||'').toLowerCase();const s=personalState();
    if(/단백질|protein/.test(t)){const target=n(db.profile.targetProtein)||s.weight*1.8;const remain=Math.max(0,target-s.protein);return `오늘 단백질은 ${round(s.protein,1)}g 섭취했고, 목표를 약 ${round(target,0)}g으로 잡으면 ${round(remain,1)}g 정도 남았어. 운동량과 체중 변화를 같이 보면서 조정하자.`;}
    if(/러닝|달리|페이스|거리|gps|running|run/.test(t)){return s.runs30?`최근 30일 러닝은 ${s.runs30}회, 총 ${s.distance30.toFixed(2)}km야. 오늘 러닝을 한다면 최근 거리와 회복 상태를 기준으로 무리 없이 진행하자.`:'최근 30일 러닝 기록이 없어. 러닝 탭에서 GPS 러닝을 한 번 기록하면 다음 코칭부터 거리·페이스·소모 kcal까지 연결할 수 있어.';}
    if(/운동|루틴|벤치|스쿼트|데드|workout/.test(t)){const last=db.workoutSessions.slice().reverse()[0];if(last){const names=last.items.map(x=>x.exercise).join(', ');return `최근 세션은 ${names}이고 ${Math.round(last.totalVolume)}kg 볼륨, 약 ${Math.round(last.calories)} kcal를 기록했어. 최근 7일 ${s.workoutDays7}일 운동했으니 다음 세션은 수행 질과 회복을 먼저 확인하자.`;}return '아직 운동 기록이 없어. 운동 탭에서 한 세션에 여러 운동을 기록하면 볼륨·세트·시간·소모 kcal를 한 번에 연결해줄게.';}
    if(/식단|칼로리|먹|영양|diet|calorie|nutrition/.test(t)){return `오늘 ${Math.round(s.kcal)} kcal, 단백질 ${round(s.protein,1)}g을 기록했어. 여러 음식을 한 끼로 저장하면 탄수화물·지방까지 자동 합산돼.`;}
    if(/기억|내 기록|memory|내가/.test(t)){return `GARANG Memory에는 장기 사실 ${db.coachMemory.facts.length}개, 선호 ${db.coachMemory.preferences.length}개, 목표 ${db.coachMemory.goals.length}개가 있어. 운동·식단·러닝·체중 상태도 함께 참조해.`;}
    if(/최근|분석|상태|report|분석해/.test(t)){return `현재 Personal State: 체중 ${s.weight.toFixed(1)}kg · 오늘 섭취 ${Math.round(s.kcal)} kcal · 운동 소비 ${Math.round(s.workoutKcal)} kcal · 최근 7일 운동 ${s.workoutDays7}일 · 최근 30일 러닝 ${s.runs30}회/${s.distance30.toFixed(1)}km.`;}
    return `현재 GARANG은 체중 ${s.weight.toFixed(1)}kg, 오늘 섭취 ${Math.round(s.kcal)} kcal, 운동 소비 ${Math.round(s.workoutKcal)} kcal를 기준으로 보고 있어. 운동·식단·러닝 중 무엇을 더 구체적으로 분석할지 말해줘.`;
  }
  function renderChat(){
    const host=$('chatLog');if(!host)return;const rows=db.chat.slice(-80);host.innerHTML=rows.length?rows.map(x=>`<div class="chat-msg ${x.role}">${x.role==='ai'?'<span class="ai-tag">GARANG</span>':''}<div>${esc(x.text).replace(/\n/g,'<br>')}</div></div>`).join(''):'<div class="empty-state">GARANG에게 운동, 식단, 러닝, 체중에 대해 물어보세요.</div>';host.scrollTop=host.scrollHeight;
    const mem=memoryItems();const visible=isPro()?mem.slice(0,20):mem.slice(0,5);$('memoryCount').textContent=mem.length;$('aiMemorySummary').textContent=`장기기억 ${isPro()?mem.length:Math.min(mem.length,5)}개 참조 · ${isPro()?'PRO':'FREE'} Personal State`;
    $('memoryList').innerHTML=visible.map(x=>`<div class="memory-item"><span>${esc(x.type)}</span><b>${esc(x.text)}</b></div>`).join('')||'<div class="empty-state small">아직 저장된 장기기억이 없습니다.</div>';
    if(!isPro() && mem.length>5) $('memoryList').insertAdjacentHTML('beforeend','<div class="fine" style="margin-top:10px">FREE에서는 최근 핵심 기억만 참조합니다. 장기 통합 분석과 확장 Memory는 PRO에서 활성화됩니다.</div>');
  }
  async function sendChat(text){
    const t=String(text||'').trim();if(!t)return;db.chat.push({role:'user',text:t,createdAt:new Date().toISOString()});saveLocal();renderChat();
    const answer=coachAnswer(t);db.chat.push({role:'ai',text:answer,createdAt:new Date().toISOString(),engine:VERSION});db.coachMemory.lastAdvice=answer;learnEvent('coach_question',{query:t,answer});scheduleCloudSave();renderChat();
  }

  // ---------- Body check ----------
  function latestBody(){ return db.body.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(-1)[0] || null; }
  function bodyBmr(row){
    const w=n(row?.weight)||bodyWeight(), bf=n(row?.bodyFatPercent);
    if(w>0 && bf>0 && bf<60){ const lean=w*(1-bf/100); return Math.max(0,370+21.6*lean); }
    const h=n(db.profile.height)||174, age=n(db.profile.age)||25, sex=(db.profile.sex||'male').toLowerCase();
    return Math.max(0,10*w+6.25*h-5*age+(sex==='female'?-161:5));
  }
  function renderBody(){
    const latest=latestBody();
    if(latest){ $('bodyDate').value=latest.date||today();$('bodyWeight').value=latest.weight??'';$('bodyFatPercent').value=latest.bodyFatPercent??'';$('bodySkeletalMuscle').value=latest.skeletalMuscle??'';$('bodyFatMass').value=latest.bodyFatMass??'';$('bodyWaist').value=latest.waist??''; }
    else $('bodyDate').value=today();
    const row=latest||{weight:bodyWeight()};const bmr=bodyBmr(row);const tdee=bmr*(n($('bodyActivity').value)||1.55);$('bodyBmr').textContent=Math.round(bmr).toLocaleString();$('bodyTdee').textContent=Math.round(tdee).toLocaleString();$('bodyFatNow').textContent=n(row.bodyFatPercent)?round(row.bodyFatPercent,1):'—';$('bodyMuscleNow').textContent=n(row.skeletalMuscle)?round(row.skeletalMuscle,1):'—';
    const bf=n(row.bodyFatPercent);const muscle=n(row.skeletalMuscle);const score=latest?clamp(Math.round(100 - Math.max(0,bf-12)*2 + Math.min(10,Math.max(0,muscle-30))),0,100):0;$('bodyScore').textContent=latest?String(score):'—';$('bodyScoreText').textContent=latest?(score>=80?'현재 기록 기준으로 좋은 상태야.':'추세를 보면서 체지방·근육량·훈련량을 함께 조정하자.'):'측정값을 저장하면 상태를 계산합니다.';
    const rows=db.body.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);$('bodyHistory').innerHTML=rows.map(x=>`<div class="history-item"><div><strong>${esc(x.date)}</strong><small>체중 ${n(x.weight).toFixed(1)}kg · 체지방 ${n(x.bodyFatPercent).toFixed(1)}% · 골격근 ${n(x.skeletalMuscle).toFixed(1)}kg</small></div><b>${x.score??''}</b></div>`).join('')||'<div class="empty-state small">아직 바디 기록이 없습니다.</div>';
    const gallery=db.bodyPhotos||[];$('bodyPhotoGallery').innerHTML=gallery.slice(-12).reverse().map(x=>`<img src="${x.data}" alt="바디체크">`).join('');
  }
  function saveBody(){
    const row={id:uid('body'),date:$('bodyDate').value||today(),weight:n($('bodyWeight').value),bodyFatPercent:n($('bodyFatPercent').value),skeletalMuscle:n($('bodySkeletalMuscle').value),bodyFatMass:n($('bodyFatMass').value),waist:n($('bodyWaist').value),createdAt:new Date().toISOString()};
    const score=clamp(Math.round(100-Math.max(0,row.bodyFatPercent-12)*2+Math.min(10,Math.max(0,row.skeletalMuscle-30))),0,100);row.score=score;db.body.push(row);db.profile.weight=row.weight||db.profile.weight;learnEvent('body_saved',row);scheduleCloudSave();renderAll();showToast('바디체크를 저장했습니다.','success');
  }
  function bindBody(){
    $('saveBodyData').addEventListener('click',saveBody);$('bodyActivity').addEventListener('change',renderBody);
    $('bodyPhotoInput').addEventListener('change',e=>{const files=[...(e.target.files||[])];if(!files.length)return;db.bodyPhotos=db.bodyPhotos||[];files.slice(0,6).forEach(file=>{const reader=new FileReader();reader.onload=()=>{db.bodyPhotos.push({id:uid('photo'),data:reader.result,name:file.name,createdAt:new Date().toISOString()});db.bodyPhotos=db.bodyPhotos.slice(-30);scheduleCloudSave();renderBody();};reader.readAsDataURL(file);});});
  }

  // ---------- Profile / report ----------
  function saveProfile(){
    db.profile.name=$('profileName').value.trim();db.profile.height=n($('profileHeight').value);db.profile.weight=n($('profileWeight').value);db.profile.targetWeight=n($('profileTargetWeight').value);db.profile.goal=$('profileGoal').value;
    if(db.profile.weight>0) db.profile.targetProtein=n(db.profile.targetProtein)||db.profile.weight*1.8;
    scheduleCloudSave();renderAll();showToast('프로필을 저장했습니다.','success');
  }
  function renderProfile(){
    $('profileName').value=db.profile.name||currentUser?.displayName||'';$('profileHeight').value=db.profile.height||'';$('profileWeight').value=db.profile.weight||'';$('profileTargetWeight').value=db.profile.targetWeight||'';$('profileGoal').value=db.profile.goal||'maintain';$('profileTier').value=(db.profile.tier||'free').toUpperCase();
  }
  function reportData(){
    const d=new Date();const days=[];for(let i=6;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);const key=x.toISOString().slice(0,10);const w=db.workoutSessions.filter(s=>s.date===key);const m=db.mealSessions.filter(s=>s.date===key);const r=db.running.filter(s=>s.date===key);days.push({date:key,workoutKcal:w.reduce((s,x)=>s+n(x.calories),0),workoutCount:w.length,mealKcal:m.reduce((s,x)=>s+n(x.totalKcal),0),protein:m.reduce((s,x)=>s+n(x.totalProtein),0),runKm:r.reduce((s,x)=>s+n(x.distanceKm),0)});}return days;
  }
  function renderReport(){
    const days=reportData();const totals=days.reduce((a,d)=>({workoutKcal:a.workoutKcal+d.workoutKcal,mealKcal:a.mealKcal+d.mealKcal,protein:a.protein+d.protein,runKm:a.runKm+d.runKm}),{workoutKcal:0,mealKcal:0,protein:0,runKm:0});
    $('reportCards').innerHTML=`<div class="metric card"><span>7일 운동 소비</span><strong>${Math.round(totals.workoutKcal)}</strong><small>kcal</small></div><div class="metric card"><span>7일 섭취</span><strong>${Math.round(totals.mealKcal)}</strong><small>kcal</small></div><div class="metric card"><span>7일 단백질</span><strong>${Math.round(totals.protein)}</strong><small>g</small></div><div class="metric card"><span>7일 러닝</span><strong>${totals.runKm.toFixed(1)}</strong><small>km</small></div>`;
    $('reportHistory').innerHTML=days.map(d=>`<div class="history-item"><div><strong>${d.date}</strong><small>운동 ${d.workoutCount}회 · 러닝 ${d.runKm.toFixed(2)}km · 단백질 ${Math.round(d.protein)}g</small></div><b>${Math.round(d.mealKcal)} / ${Math.round(d.workoutKcal)} kcal</b></div>`).join('');
    const pro=$('proInsightCard'); if(pro){ if(isPro()){ const w30=db.workoutSessions.filter(x=>new Date(x.date)>=new Date(Date.now()-30*864e5)); const r30=db.running.filter(x=>new Date(x.date)>=new Date(Date.now()-30*864e5)); const m30=db.mealSessions.filter(x=>new Date(x.date)>=new Date(Date.now()-30*864e5)); pro.innerHTML=`<span class="eyebrow">PRO INTEGRATED INSIGHT</span><h3>최근 30일 Personal Performance</h3><p class="fine">운동 ${w30.length}세션 · 러닝 ${r30.reduce((a,x)=>a+n(x.distanceKm),0).toFixed(1)}km · 식단 ${m30.reduce((a,x)=>a+n(x.totalKcal),0).toFixed(0)}kcal 기록이 통합 분석에 연결되어 있습니다.</p>`; } else { pro.innerHTML='<span class="eyebrow">PRO PREVIEW</span><h3>장기 통합 분석</h3><p class="fine">최근 30일 운동·식단·러닝·체중 패턴을 함께 비교해 다음 훈련과 영양 전략을 조정하는 기능입니다. 현재 FREE에서는 미리보기만 제공합니다.</p>'; }}
  }

  function renderHome(){
    const s=personalState();const name=db.profile.name||currentUser?.displayName||'GARANG';$('homeTitle').textContent=`${name}의 오늘`;$('homeIntake').textContent=fmt(s.kcal);$('homeBurn').textContent=fmt(s.workoutKcal);$('homeProtein').textContent=round(s.protein,1);$('homeRun').textContent=s.distance30.toFixed(2);
    const headline=s.workoutDays7>=6?'최근 운동 빈도가 높아. 회복까지 같이 보자.':s.kcal>0?`오늘 기록을 기준으로 다음 행동을 잡아볼게.`:'오늘 첫 기록부터 시작해보자.';$('coachHeadline').textContent=headline;$('coachSummary').textContent=`체중 ${s.weight.toFixed(1)}kg · 오늘 단백질 ${round(s.protein,1)}g · 운동 소비 ${Math.round(s.workoutKcal)} kcal`;
    $('homeTier').textContent=(db.profile.tier||'free').toUpperCase();$('tierBtn').textContent=(db.profile.tier||'free').toUpperCase();$('sideName').textContent=name;$('sideEmail').textContent=currentUser?.email||'로컬 테스트';$('sideAvatar').textContent=(name[0]||'G').toUpperCase();
    const acts=[];db.workoutSessions.filter(x=>x.date===today()).forEach(x=>acts.push(`🏋️ 운동 ${x.items.length}종 · ${Math.round(x.calories)} kcal`));db.mealSessions.filter(x=>x.date===today()).forEach(x=>acts.push(`🍚 ${x.mealType} · ${Math.round(x.totalKcal)} kcal`));db.running.filter(x=>x.date===today()).forEach(x=>acts.push(`🏃 러닝 ${x.distanceKm.toFixed(2)} km`));$('homeActivity').innerHTML=acts.length?acts.map(x=>`<div class="activity-item">${esc(x)}</div>`).join(''):'<div class="empty-state small">아직 오늘의 기록이 없습니다.</div>';
    $('homeState').innerHTML=`<div><span>체중</span><b>${s.weight.toFixed(1)}kg</b></div><div><span>목표</span><b>${goalLabel(db.profile.goal)}</b></div><div><span>7일 운동</span><b>${s.workoutDays7}일</b></div><div><span>30일 러닝</span><b>${s.runs30}회</b></div>`;
  }
  function goalLabel(g){return ({muscle_gain:'근육 증가',fat_loss:'체지방 감량',maintain:'체중 유지',performance:'체력 향상'})[g]||'목표 설정';}

  function renderLearning(){ const ev=db.coachMemory.events||[]; const count=t=>ev.filter(x=>x.type===t).length; $('learningEvents').textContent=ev.length; $('learningWorkout').textContent=count('workout_saved'); $('learningMeal').textContent=count('meal_saved'); $('learningRun').textContent=count('run_saved'); $('learningTier').textContent=(isPro()?'PRO':'FREE'); $('learningList').innerHTML=ev.slice().reverse().slice(0,30).map(x=>`<div class="history-item"><div><strong>${esc(x.type)}</strong><small>${new Date(x.createdAt).toLocaleString('ko-KR')}</small></div><b>stored</b></div>`).join('')||'<div class="empty-state small">아직 학습 이벤트가 없습니다.</div>'; }
  function renderPage(id){
    if(id==='home')renderHome();if(id==='workout'){renderWorkoutRows();renderWorkoutHistory();$('workoutTodayKcal').textContent=`${Math.round(todayWorkoutKcal())} kcal`;}
    if(id==='diet'){if(!$('mealRows').children.length)$('mealRows').appendChild(mealRow());updateMealTotals();renderDietDaily();renderMealHistory();}
    if(id==='running'){renderRunLive();renderRunHistory();}if(id==='body'){renderBody();}if(id==='learning'){renderLearning();}if(id==='certify')updateCertOverlay();if(id==='ai')renderChat();if(id==='profile')renderProfile();if(id==='report')renderReport();
  }
  function renderAll(){renderHome();renderBody();renderLearning();renderWorkoutHistory();renderDietDaily();renderMealHistory();renderRunHistory();renderChat();renderProfile();renderReport();renderWorkoutRows();updateMealTotals();renderRunLive();}

  function bindWorkoutDiet(){
    $('addWorkoutRow').addEventListener('click',()=>{$('workoutRows').appendChild(workoutRow());updateWorkoutTotals();});
    $('workoutRows').addEventListener('input',updateWorkoutTotals);$('workoutRows').addEventListener('change',updateWorkoutTotals);$('workoutRows').addEventListener('click',e=>{if(e.target.classList.contains('remove-row')){if($('workoutRows').children.length>1)e.target.closest('.record-row').remove();updateWorkoutTotals();}});
    $('saveWorkoutSession').addEventListener('click',saveWorkoutSession);
    $('addMealRow').addEventListener('click',()=>{$('mealRows').appendChild(mealRow());updateMealTotals();});$('mealRows').addEventListener('input',updateMealTotals);$('mealRows').addEventListener('change',updateMealTotals);$('mealRows').addEventListener('click',e=>{if(e.target.classList.contains('remove-row')){if($('mealRows').children.length>1)e.target.closest('.record-row').remove();updateMealTotals();}});$('saveMealSession').addEventListener('click',saveMealSession);
  }
  function bindRun(){ $('runStart').addEventListener('click',startRun);$('runPause').addEventListener('click',pauseRun);$('runStop').addEventListener('click',stopRun);$('workoutCertBtn').addEventListener('click',()=>openCert('workout'));$('runCertBtn').addEventListener('click',()=>openCert('run')); }
  function bindCert(){
    $('certCamera').addEventListener('click',()=>$('certCameraInput').click());$('certGallery').addEventListener('click',()=>$('certGalleryInput').click());$('certVideo').addEventListener('click',()=>$('certVideoInput').click());
    $('certCameraInput').addEventListener('change',e=>chooseCertFile(e.target.files?.[0]));$('certGalleryInput').addEventListener('change',e=>chooseCertFile(e.target.files?.[0]));$('certVideoInput').addEventListener('change',e=>chooseCertFile(e.target.files?.[0]));$('certType').addEventListener('change',renderCertMeta);$('overlayScale').addEventListener('input',()=>{updateCertOverlay();if(cert.file&&!cert.isVideo){const img=new Image();img.onload=()=>renderCertImage(img);img.src=cert.objectUrl;}});$('overlayOpacity').addEventListener('input',()=>{updateCertOverlay();if(cert.file&&!cert.isVideo){const img=new Image();img.onload=()=>renderCertImage(img);img.src=cert.objectUrl;}});$('certExport').addEventListener('click',exportCertImage);$('certShare').addEventListener('click',shareCert);$('certVideoShare').addEventListener('click',shareVideo);
  }
  function bindAI(){
    $('chatForm').addEventListener('submit',e=>{e.preventDefault();const v=$('chatInput').value.trim();if(!v)return;$('chatInput').value='';sendChat(v);});$('chatInput').addEventListener('input',()=>{$('chatInput').style.height='auto';$('chatInput').style.height=Math.min($('chatInput').scrollHeight,220)+'px';});qa('[data-ai]').forEach(b=>b.addEventListener('click',()=>{$('chatInput').value=b.dataset.ai;$('chatForm').requestSubmit();}));$('newChat').addEventListener('click',()=>{db.chat=[];scheduleCloudSave();renderChat();$('chatInput').focus();});
  }
  function bindProfile(){
    $('saveProfile').addEventListener('click',saveProfile);$('backupBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`GARANG_V9.9_BACKUP_${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});$('restoreInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{db=normalizeDb(JSON.parse(await f.text()));scheduleCloudSave();renderAll();showToast('백업을 복원했습니다.','success');}catch(err){showToast('백업 JSON을 읽지 못했습니다.','warn');}});$('resetLocalBtn').addEventListener('click',()=>{if(!confirm('현재 기기의 로컬 캐시를 초기화할까요? 클라우드 계정 데이터는 삭제하지 않습니다.'))return;localStorage.removeItem(localKey());db=structuredCloneSafe(EMPTY);renderAll();showToast('로컬 캐시를 초기화했습니다.','success');});
  }

  function buildDatalists(){
    const ex=document.createElement('datalist');ex.id='exerciseDatalist';ex.innerHTML=exercises.map(x=>`<option value="${esc(x.exercise_name)}">`).join('');document.body.appendChild(ex);
    const fo=document.createElement('datalist');fo.id='foodDatalist';fo.innerHTML=foods.map(x=>`<option value="${esc(x.name)}">`).join('');document.body.appendChild(fo);
  }
  function installSW(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('sw.js?v=20260823',{updateViaCache:'none'}).catch(()=>{});
  }

  async function boot(){
    bindAuth();bindShell();bindWorkoutDiet();bindRun();bindCert();bindAI();bindProfile();bindBody();
    await loadAssets();buildDatalists();
    db=loadLocal();
    renderAll();showAuth();installSW();
    await initFirebase();
    if(!firebaseReady) setAuthError('Firebase Web App 설정이 연결되지 않았습니다. 로그인/회원가입을 사용하려면 config/firebase-config.js를 확인하세요.');
    if(firebaseReady && !currentUser) showAuth();
  }
  boot().catch(e=>{console.error('[GARANG] boot failed',e);setAuthError('앱 초기화 중 오류가 발생했습니다. 콘솔을 확인해 주세요.');});
})();
