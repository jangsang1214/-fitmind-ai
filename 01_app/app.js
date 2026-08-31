(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clamp = (v,min,max) => Math.max(min, Math.min(max, safeNumber(v,min)));
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `g_${Date.now()}_${Math.random().toString(36).slice(2)}`);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const KEY = 'garang_v99_state_v2';
let state = {profile:null,workouts:[],meals:[],runs:[],body:[],memory:{facts:[],preferences:[],goals:[],events:[]},planner:[],plan:'FREE',language:'ko',settings:{notifications:true},aiChats:[]};
let db = {exercise:[],food:[]};
let knowledge = [];
let firebaseReady = false, currentUser = null, currentPage = 'home';
let runTimer = null, runState = null;
let workoutDraft = [], mealDraft = [], currentCert = {workout:null,running:null};

function toast(msg){ const t=$('toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2400); }
function safeNumber(v, fallback=0){ const n=Number(v); return Number.isFinite(n) ? n : fallback; }
function ensureMemory(){ state.memory ??= {}; for(const k of ['facts','preferences','goals','events']) state.memory[k]=Array.isArray(state.memory[k])?state.memory[k]:[]; }
function normalizeMeals(){
  const src=Array.isArray(state.meals)?state.meals:[];
  state.meals=src.map(m=>{
    const items=Array.isArray(m.items)&&m.items.length?m.items.map(i=>({id:i.id||uid(),name:String(i.name||'음식'),grams:safeNumber(i.grams,100),kcal:safeNumber(i.kcal),protein:safeNumber(i.protein),carbs:safeNumber(i.carbs??i.carbohydrate),fat:safeNumber(i.fat)})):[{id:uid(),name:String(m.name||'음식'),grams:safeNumber(m.grams,100),kcal:safeNumber(m.kcal),protein:safeNumber(m.protein),carbs:safeNumber(m.carbs),fat:safeNumber(m.fat)}];
    const totals=items.reduce((a,i)=>({kcal:a.kcal+i.kcal,protein:a.protein+i.protein,carbs:a.carbs+i.carbs,fat:a.fat+i.fat}),{kcal:0,protein:0,carbs:0,fat:0});
    return {...m,id:m.id||uid(),date:m.date||today(),name:m.name||items.map(i=>i.name).slice(0,2).join(' + '),items,...totals};
  });
}
function normalizeState(){
  state={...{profile:null,workouts:[],meals:[],runs:[],body:[],memory:{facts:[],preferences:[],goals:[],events:[]},planner:[],plan:'FREE',language:'ko',settings:{notifications:true},aiChats:[]},...state};
  for(const k of ['workouts','meals','runs','body','planner']) state[k]=Array.isArray(state[k])?state[k]:[];
  state.planner=state.planner.map(x=>({...x,id:x.id||uid(),date:x.date||today(),time:x.time||'18:30',title:String(x.title||'오늘의 계획'),type:String(x.type||'routine'),done:!!x.done,notify:x.notify!==false,createdAt:x.createdAt||Date.now()}));
  state.plan=state.plan==='PRO'?'PRO':'FREE'; state.language=state.language==='en'?'en':'ko'; state.settings={notifications:state.settings?.notifications!==false}; state.aiChats=Array.isArray(state.aiChats)?state.aiChats:[]; ensureMemory(); normalizeMeals();
}
function loadState(){ try{ const raw=localStorage.getItem(KEY); if(raw) state={...state,...JSON.parse(raw)}; }catch(e){console.warn('local state load failed',e)} normalizeState(); }
function saveLocalOnly(){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){toast('로컬 저장 공간을 확인해 주세요.');} }
function saveState(){ saveLocalOnly(); if(firebaseReady&&currentUser) cloudSave().catch(e=>console.warn('cloud save failed',e)); }
async function cloudSave(){
  if(!firebaseReady||!currentUser)return;
  const fs=firebase.firestore();
  await fs.collection('users').doc(currentUser.uid).set({profile:state.profile,workouts:state.workouts.slice(-200),meals:state.meals.slice(-200),runs:state.runs.slice(-200),body:state.body.slice(-200),memory:state.memory,planner:state.planner.slice(-300),plan:state.plan,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
}
async function cloudLoad(){
  if(!firebaseReady||!currentUser)return;
  const d=await firebase.firestore().collection('users').doc(currentUser.uid).get();
  if(d.exists){ state={...state,...d.data()}; normalizeState(); saveLocalOnly(); }
}
async function loadJSON(path){ const r=await fetch(path,{cache:'no-store'}); if(!r.ok)throw new Error(`${path} ${r.status}`); return r.json(); }
async function loadJSONL(path){ const r=await fetch(path,{cache:'no-store'}); if(!r.ok)throw new Error(`${path} ${r.status}`); const text=await r.text(); return text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean); }
async function loadDB(){
  const results=await Promise.allSettled([loadJSON('../04_data/knowledge/exercise-db.json'),loadJSON('../04_data/knowledge/food-db.json'),loadJSONL('../04_data/knowledge/exercise_knowledge.jsonl'),loadJSONL('../04_data/knowledge/food_knowledge.jsonl'),loadJSONL('../04_data/knowledge/fitmind_rules.jsonl'),loadJSONL('../04_data/knowledge/fitmind_sft.jsonl'),loadJSONL('../04_data/knowledge/synthetic_korean_dialogue_v6.jsonl')]);
  if(results[0].status==='fulfilled')db.exercise=results[0].value;
  if(results[1].status==='fulfilled')db.food=results[1].value;
  knowledge=results.slice(2).filter(x=>x.status==='fulfilled').flatMap(x=>x.value).slice(0,2500);
  if(!db.exercise.length||!db.food.length)toast('운동/식단 DB 일부를 불러오지 못했어요.');
}
function initFirebase(){
  try{
    const cfg=window.GARANG_FIREBASE_CONFIG;
    if(!cfg?.apiKey||!window.firebase?.apps)return;
    if(!firebase.apps.length)firebase.initializeApp(cfg);
    firebaseReady=!!firebase.apps.length;
    if(firebaseReady)firebase.auth().onAuthStateChanged(async u=>{
      currentUser=u;
      if(u){ await cloudLoad().catch(e=>toast('계정 데이터 동기화에 실패했어요.')); state.plan=state.plan||'FREE'; showApp(); }
      else if(!localStorage.getItem('garang_demo'))showAuth();
    });
  }catch(e){firebaseReady=false;console.warn('Firebase unavailable',e);}
}
function showAuth(){$('authView').hidden=false;$('appView').hidden=true;}
function showApp(){$('authView').hidden=true;$('appView').hidden=false;$('planBadge').textContent=state.plan==='PRO'?'PRO':'FREE';render();}
function bindAuth(){
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('loginForm').hidden=b.dataset.authTab!=='login';$('signupForm').hidden=b.dataset.authTab!=='signup';});
  $('loginForm').onsubmit=async e=>{e.preventDefault();await emailAuth(false)};
  $('signupForm').onsubmit=async e=>{e.preventDefault();await emailAuth(true)};
  $('resetPassword').onclick=resetPassword; $('googleBtn').onclick=()=>socialAuth('google'); $('appleBtn').onclick=()=>socialAuth('apple');
  $('demoBtn').onclick=()=>{localStorage.setItem('garang_demo','1');state.profile=state.profile||{name:'GARANG 사용자',age:23,height:174,weight:67,targetWeight:67,goal:'퍼포먼스 향상',activity:'high'};saveState();showApp();};
  $('logoutBtn').onclick=logout;
}
async function emailAuth(signup){
  if(!firebaseReady)return toast('Firebase가 연결되지 않았어요. firebase-config.js와 Firebase 설정을 확인해 주세요.');
  try{const email=$(signup?'signupEmail':'loginEmail').value.trim(),pw=$(signup?'signupPassword':'loginPassword').value;if(signup){const c=await firebase.auth().createUserWithEmailAndPassword(email,pw);await c.user.updateProfile({displayName:email.split('@')[0]});}else await firebase.auth().signInWithEmailAndPassword(email,pw);toast(signup?'계정이 생성됐어요.':'로그인됐어요.');}catch(e){toast(firebaseError(e));}
}
async function socialAuth(kind){
  if(!firebaseReady)return toast('Firebase가 연결되지 않았어요.');
  try{const p=kind==='google'?new firebase.auth.GoogleAuthProvider():new firebase.auth.OAuthProvider('apple.com');await firebase.auth().signInWithPopup(p);}catch(e){toast(firebaseError(e));}
}
async function resetPassword(){if(!firebaseReady)return toast('Firebase가 연결되지 않았어요.');const email=$('loginEmail').value.trim();if(!email)return toast('이메일을 먼저 입력해 주세요.');try{await firebase.auth().sendPasswordResetEmail(email);toast('재설정 메일을 보냈어요.');}catch(e){toast(firebaseError(e));}}
function firebaseError(e){const c=e?.code||'';const map={'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않아요.','auth/email-already-in-use':'이미 사용 중인 이메일이에요.','auth/weak-password':'비밀번호는 6자 이상이어야 해요.','auth/popup-closed-by-user':'로그인이 취소됐어요.','auth/operation-not-allowed':'Firebase Console에서 해당 로그인 방식을 활성화해 주세요.','auth/unauthorized-domain':'Firebase Authentication의 승인 도메인을 확인해 주세요.','auth/popup-blocked':'브라우저에서 팝업을 허용해 주세요.'};return map[c]||e?.message||'인증 중 오류가 발생했어요.';}
function logout(){if(firebaseReady&&currentUser)firebase.auth().signOut().catch(()=>{});localStorage.removeItem('garang_demo');currentUser=null;showAuth();}
function openMenu(){
  let el=$('sideMenu'), back=$('menuBackdrop');
  const en=state.language==='en';
  const labels=en?{
    menu:'Menu',current:'Current plan',viewPlan:'View FREE / PRO',profile:'Profile',body:'InBody / Body Composition',
    score:'Performance Score',planner:'Planner',ai:'GARANG AI',settings:'Settings',close:'Close'
  }:{
    menu:'메뉴',current:'현재 플랜',viewPlan:'FREE / PRO 보기',profile:'프로필',body:'인바디 / 체성분',
    score:'Performance Score',planner:'플래너',ai:'GARANG AI',settings:'설정',close:'닫기'
  };
  if(!el){
    document.body.insertAdjacentHTML('beforeend',`<div id="menuBackdrop" class="menu-backdrop"></div><aside id="sideMenu" class="side-menu" aria-label="${labels.menu}"></aside>`);
    el=$('sideMenu'); back=$('menuBackdrop');
    back.onclick=closeMenu;
  }
  el.innerHTML=`<div class="side-head"><div><span class="eyebrow">GARANG</span><h2>${labels.menu}</h2></div><button id="closeMenu" class="icon-btn" aria-label="${labels.close}">×</button></div><div class="side-plan"><span>${labels.current}</span><b>${state.plan}</b><button class="ghost small" data-menu-page="premium">${labels.viewPlan}</button></div><div class="side-links"><button data-menu-page="profile">👤 ${labels.profile}</button><button data-menu-page="body">📊 ${labels.body}</button><button data-menu-page="score">⚡ ${labels.score}</button><button data-menu-page="planner">◷ ${labels.planner}</button><button data-menu-page="ai">✦ ${labels.ai}</button><button data-menu-page="settings">⚙ ${labels.settings}</button></div><div class="side-foot"><small>GARANG V10</small><span>Personal Performance Agent</span></div>`;
  $('closeMenu').onclick=closeMenu;
  el.querySelectorAll('[data-menu-page]').forEach(b=>b.onclick=()=>{currentPage=b.dataset.menuPage;closeMenu();render();});
  el.classList.add('open'); back.classList.add('open'); document.body.classList.add('menu-open');
}
function closeMenu(){ $('sideMenu')?.classList.remove('open'); $('menuBackdrop')?.classList.remove('open'); document.body.classList.remove('menu-open'); }
function calcPerformanceScore(){
  const cutoff=Date.now()-30*86400000;
  const recent=(arr)=>arr.filter(x=>new Date((x.date||today())+'T23:59:59').getTime()>=cutoff);
  const w=recent(state.workouts), m=recent(state.meals), r=recent(state.runs), b=state.body.at(-1)||{};
  const sessions=new Set(w.map(x=>x.sessionId||x.id)).size;
  const exercise=Math.min(100,35+sessions*8+Math.min(20,w.reduce((a,x)=>a+safeNumber(x.rpe),0)/Math.max(1,w.length)*2));
  const proteinTarget=Math.max(80,safeNumber(state.profile?.weight,67)*1.6);
  const mealDays=new Set(m.map(x=>x.date||today())).size;
  const avgProteinDay=mealDays?m.reduce((a,x)=>a+safeNumber(x.protein),0)/mealDays:0;
  const nutrition=Math.min(100,35+Math.min(65,avgProteinDay/proteinTarget*65));
  const completedPlans=state.planner.filter(x=>x.done&&new Date(x.date||today()).getTime()>=cutoff).length;
  const planCount=state.planner.filter(x=>new Date(x.date||today()).getTime()>=cutoff).length;
  const recovery=Math.min(100,50+(completedPlans?Math.min(35,completedPlans*5):0)+(planCount?15:0));
  const activity=Math.min(100,35+r.length*7+sessions*3);
  let bodyScore=55;
  if(b.weight){
    const bf=safeNumber(b.bodyFat,20);
    bodyScore=clamp(75-Math.abs(bf-20)*1.2,45,95);
  }
  const total=Math.round(exercise*.28+nutrition*.24+recovery*.18+activity*.18+bodyScore*.12);
  const result={total,exercise:Math.round(exercise),nutrition:Math.round(nutrition),recovery:Math.round(recovery),activity:Math.round(activity),body:Math.round(bodyScore)};
  state.scoreHistory=Array.isArray(state.scoreHistory)?state.scoreHistory:[];
  const last=state.scoreHistory.at(-1);
  if(!last||last.date!==today()){state.scoreHistory.push({date:today(),...result});state.scoreHistory=state.scoreHistory.slice(-60);saveLocalOnly();}
  return result;
}
function scoreDelta(){
  const h=Array.isArray(state.scoreHistory)?state.scoreHistory:[];
  if(h.length<2)return 0;
  return (h.at(-1).total||0)-(h.at(-2).total||0);
}
function adaptivePlannerRecommendations(){
  const s=calcPerformanceScore(), plans=[];
  const todayItems=plannerItemsForToday();
  if(s.exercise<60&&!todayItems.some(x=>x.type==='workout')) plans.push({time:'18:30',title:'운동 40~50분',type:'workout',reason:'최근 운동 수행을 보완'});
  if(s.nutrition<60&&!todayItems.some(x=>x.type==='meal')) plans.push({time:'12:30',title:'식단 기록 + 단백질 확인',type:'meal',reason:'영양 기록을 보완'});
  if(s.activity<60&&!todayItems.some(x=>x.type==='run')) plans.push({time:'19:30',title:'가벼운 걷기 또는 러닝',type:'run',reason:'활동량 보완'});
  if(s.recovery<65&&!todayItems.some(x=>x.type==='recovery')) plans.push({time:'22:30',title:'스트레칭 + 취침 준비',type:'recovery',reason:'회복 루틴 확보'});
  if(!plans.length) plans.push({time:'20:00',title:'오늘 기록 검토 + 내일 준비',type:'routine',reason:'현재 상태 유지'});
  return plans.slice(0,4);
}

function addMemoryFromChat(q,a){ensureMemory();state.memory.events.push({type:'ai_chat',date:today(),text:String(q).slice(0,120)});if(state.memory.events.length>500)state.memory.events=state.memory.events.slice(-500);}
function buildAIContext(){const t=totalsMeals(),score=calcPerformanceScore();return {profile:state.profile,today:{meals:dayMeals(),mealTotals:t,workoutKcal:workoutKcalToday(),workouts:state.workouts.filter(x=>x.date===today()),runs:state.runs.filter(x=>x.date===today()),planner:plannerItemsForToday()},recentWorkouts:state.workouts.slice(-10),recentRuns:state.runs.slice(-10),recentBody:state.body.slice(-5),score,memory:state.memory};}
function chatAnswerEN(q){
  const ctx=buildAIContext(), l=String(q).toLowerCase(), t=ctx.today.mealTotals, p=ctx.profile||{};
  if(/hello|hi|안녕|하이/.test(l)) return `Hi${p.name?` ${p.name}`:''}! I’m GARANG. I’ll look at your workouts, nutrition, running, body composition and planner to decide the next best action.`;
  if(/식단|단백질|먹|영양|칼로리|nutrition|protein|food|calorie/.test(l)){
    const target=Math.round(safeNumber(p.weight,67)*1.6), gap=Math.max(0,target-t.protein);
    return `Today you’ve logged ${Math.round(t.kcal)} kcal and ${Math.round(t.protein)}g protein. With a target of about ${target}g, you have roughly ${Math.round(gap)}g left. ${gap>0?'Prioritize 25–40g of protein at your next meal.':'You’re close to your protein target; focus next on overall calories and carb/fat balance.'}`;
  }
  if(/인바디|체성분|체지방|근육|체중|inbody|body|muscle|weight|body fat/.test(l)){
    const b=ctx.recentBody.at(-1);
    return b&&b.weight?`Your latest body composition is ${b.weight}kg${b.bodyFat!=null?`, ${b.bodyFat}% body fat`:''}${b.muscle!=null?`, ${b.muscle}kg muscle`:''}. Keep measuring under similar conditions so GARANG can track the trend more reliably.`:`You don’t have an InBody record yet. Add weight, body-fat percentage and muscle mass to feed them into your Performance Score and coaching.`;
  }
  if(/러닝|달리|페이스|거리|running|run|pace|distance/.test(l)){
    const r=ctx.today.runs.at(-1)||ctx.recentRuns.at(-1);
    return r?`Your latest run was ${safeNumber(r.distance).toFixed(2)} km in ${safeNumber(r.duration).toFixed(1)} min at ${r.pace||'—'} min/km. For the next run, increase either distance or pace slightly, not both at once.`:`You don’t have a running record yet. Log one run and I’ll use distance, time and pace to set the next target.`;
  }
  if(/플래너|계획|일정|오늘 뭐|planner|plan|schedule|today/.test(l)){
    const pending=ctx.today.planner.filter(x=>!x.done);
    return pending.length?`You have ${pending.length} plan${pending.length>1?'s':''} left today: ${pending.slice(0,3).map(x=>`${x.time} ${x.title}`).join(' · ')}. Start with the closest one.`:`Your planner is empty today. I can build a plan around training, meals and recovery.`;
  }
  if(/점수|score|상태|분석|어때|status|analysis/.test(l)){
    return `Your current GARANG Performance Score is ${ctx.score.total}/100: Exercise ${ctx.score.exercise}, Nutrition ${ctx.score.nutrition}, Recovery ${ctx.score.recovery}, Activity ${ctx.score.activity}, Body ${ctx.score.body}. Start with one action in your lowest area for the clearest improvement.`;
  }
  if(/운동|벤치|스쿼트|데드|강도|rpe|workout|bench|squat|deadlift|intensity/.test(l)){
    const last=ctx.recentWorkouts.at(-1);
    return last?`Your latest ${last.name} was ${last.weight}kg × ${last.reps} × ${last.sets} sets at RPE ${last.rpe}. If RPE was 9+, stabilize the same load or reduce total volume by 5–10%. If RPE was 8 or lower, a small 2.5kg increase is an option.`:`You don’t have a workout record yet. Log your first session and I’ll connect load, reps, sets and RPE to suggest the next session.`;
  }
  return `I’m currently using ${state.workouts.length} workout records, ${state.meals.length} meal records, ${state.runs.length} runs, ${state.body.length} body-composition records and ${state.planner.length} planner items. Ask about training, nutrition, running, body composition or your plan and I’ll use those records.`;
}
function chatAnswer(q){
  if(state.language==='en') return chatAnswerEN(q);
  const ctx=buildAIContext(), l=q.toLowerCase(), t=ctx.today.mealTotals, p=ctx.profile||{}; let a;
  if(/안녕|하이|hello|hi/.test(l)) a=`안녕${p.name?` ${p.name}`:''}! 나는 GARANG이야. 운동·식단·러닝·체성분·플래너를 함께 보고 다음 행동을 정해줄게.`;
  else if(/식단|단백질|먹|영양|칼로리/.test(l)){const target=Math.round(safeNumber(p.weight,67)*1.6),gap=Math.max(0,target-t.protein);a=`오늘 식단을 기준으로 보면 ${Math.round(t.kcal)} kcal, 단백질 ${Math.round(t.protein)}g을 기록했어. 단백질 목표를 약 ${target}g으로 잡으면 ${Math.round(gap)}g 정도 남았어. ${gap>0?'다음 식사는 단백질 25~40g을 우선 채우는 게 좋아.':'오늘 단백질 목표는 거의 채웠어. 이후 식사는 총열량과 지방/탄수화물 균형을 보면 돼.'}`;}
  else if(/인바디|체성분|체지방|근육|체중/.test(l)){const b=ctx.recentBody.at(-1);a=b&&b.weight?`최근 체성분은 체중 ${b.weight}kg${b.bodyFat!=null?`, 체지방 ${b.bodyFat}%`:''}${b.muscle!=null?`, 골격근량 ${b.muscle}kg`:''}이야. 다음 측정부터 같은 조건으로 기록하면 변화 추이를 더 정확하게 볼 수 있어.`:`아직 인바디 기록이 없어. 체중·체지방률·골격근량을 입력하면 Performance Score와 코칭에 같이 반영할 수 있어.`;}
  else if(/러닝|달리|페이스|거리/.test(l)){const r=ctx.today.runs.at(-1)||ctx.recentRuns.at(-1);a=r?`최근 러닝은 ${safeNumber(r.distance).toFixed(2)}km, ${safeNumber(r.duration).toFixed(1)}분, 페이스 ${r.pace||'—'}분/km였어. 다음 러닝 목표는 거리 또는 페이스 중 하나만 조금 올리는 방식이 좋아.`:'아직 러닝 기록이 없어. 러닝을 한 번 기록하면 거리·시간·페이스를 기준으로 다음 목표를 잡아줄게.';}
  else if(/플래너|계획|일정|오늘 뭐/.test(l)){const pending=ctx.today.planner.filter(x=>!x.done);a=pending.length?`오늘 남은 계획은 ${pending.length}개야. ${pending.slice(0,3).map(x=>`${x.time} ${x.title}`).join(' · ')}. 가장 가까운 계획부터 하나씩 처리하자.`:'오늘 플래너가 비어 있어. 운동·식사·회복을 기준으로 오늘 계획을 만들어볼까?';}
  else if(/점수|score|상태|분석|어때/.test(l)) a=`현재 GARANG Performance Score는 ${ctx.score.total}/100이야. 운동 ${ctx.score.exercise}, 영양 ${ctx.score.nutrition}, 회복 ${ctx.score.recovery}, 활동 ${ctx.score.activity}, 체성분 ${ctx.score.body}로 계산했어. 점수를 올리려면 가장 낮은 영역부터 한 가지 행동을 고르는 게 효율적이야.`;
  else if(/운동|벤치|스쿼트|데드|강도|rpe/.test(l)){const last=ctx.recentWorkouts.at(-1);a=last?`최근 ${last.name}을 ${last.weight}kg × ${last.reps} × ${last.sets}세트, RPE ${last.rpe}로 기록했어. RPE가 9 이상이었다면 다음 세션은 같은 중량으로 반복을 안정화하거나 총 볼륨을 5~10% 낮추는 쪽을 추천해. RPE 8 이하라면 중량을 2.5kg 정도 올리는 선택지가 있어.`:'아직 운동 기록이 없어. 첫 운동을 기록하면 중량·반복·세트·RPE를 연결해서 다음 세션을 추천할게.';}
  else a=`좋아. 내가 현재 보고 있는 데이터는 운동 ${state.workouts.length}개, 식사 ${state.meals.length}개, 러닝 ${state.runs.length}개, 체성분 ${state.body.length}개, 플래너 ${state.planner.length}개야. 질문을 조금 더 구체적으로 말해주면 이 데이터를 기준으로 다음 행동까지 제안할게.`;
  return a;
}
function saveChatMessage(role,text){state.aiChats.push({id:uid(),role,text:String(text),createdAt:Date.now()});state.aiChats=state.aiChats.slice(-50);saveState();}
function renderChat(){return `<div class="ai-chat-page"><div class="chat-head"><div><span class="eyebrow">GARANG INTELLIGENCE</span><h1>GARANG AI</h1><p class="muted">네 기록을 바탕으로 대화하는 Personal Performance Agent</p></div><button id="newChat" class="ghost small">새 대화</button></div><div class="chat-suggestions"><button data-chat-q="오늘 내 상태를 분석해줘">오늘 상태</button><button data-chat-q="최근 운동을 분석해줘">운동 분석</button><button data-chat-q="오늘 식단을 분석해줘">식단 분석</button><button data-chat-q="오늘 플래너를 정리해줘">플래너</button></div><div id="chatMessages" class="chat-messages">${state.aiChats.length?state.aiChats.map(x=>`<div class="chat-row ${x.role==='user'?'user':''}"><div class="chat-avatar">${x.role==='user'?'나':'✦'}</div><div class="chat-bubble">${esc(x.text).replace(/\n/g,'<br>')}</div></div>`).join(''):`<div class="chat-empty"><div class="chat-spark">✦</div><h2>무엇을 도와줄까?</h2><p>운동, 식단, 러닝, 체성분, 플래너를 한 번에 보고 다음 행동을 정해줄게.</p></div>`}</div><div class="chat-composer"><textarea id="aiQuestion" rows="1" placeholder="GARANG에게 물어보세요..."></textarea><button id="askAI" class="send-btn" aria-label="전송">↑</button></div></div>`;}
function nav(){
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>{
    const target=b.dataset.page;
    if(pages[target]){currentPage=target;closeMenu();render();}
  });
}
function applyLanguage(){
  const en=state.language==='en';
  document.documentElement.lang=en?'en':'ko';
  document.documentElement.dataset.garangLanguage=en?'en':'ko';
  const dict={
    '한 세션에 여러 운동을 추가하고 운동별 MET·시간·체중 기반 소모 kcal를 계산합니다.':'Add multiple exercises to one session and calculate calories from MET, time and body weight.',
    '한 끼에 여러 음식을 계속 추가하거나, 여러 줄로 한 번에 입력할 수 있습니다.':'Add multiple foods to one meal or enter several foods at once.',
    'GPS 거리·페이스·소모 kcal를 기록하고 인증 미디어를 합성·저장하세요.':'Track GPS distance, pace and calories, then create and save verification media.',
    '시간표를 만들고, 실행 여부에 따라 다음 계획을 조정합니다.':'Build a schedule and adjust the next plan based on completion.',
    '현재 기록을 보고 기본적인 오늘 계획을 제안합니다. 실제 AI 호출 없이 안전한 규칙 기반으로 생성합니다.':'Suggests a basic plan from your current records using safe rule-based logic without an external AI call.',
    '최근 30일 데이터를 기준으로 현재 퍼포먼스를 종합합니다.':'Your current performance is calculated from the last 30 days of data.',
    '측정값을 기록하면 Score와 AI 코칭에 함께 반영됩니다.':'Body measurements are included in your Score and AI coaching.',
    'GARANG을 시작하기 위한 기본 기능':'Core features to get started with GARANG',
    '모든 데이터를 연결해 더 깊게 코칭':'Connect all your data for deeper coaching',
    '운동·식단·러닝 기록':'Workout, nutrition and running records',
    '기본 AI 코칭':'Basic AI coaching',
    '고급 AI Coach / Memory':'Advanced AI Coach / Memory',
    '고급 Planner':'Advanced Planner',
    '현재 사용 중':'Currently active',
    '사용 중':'Active',
    '다운그레이드 예정':'Downgrade scheduled',
    '결제 API 연결 전입니다. 결제 완료 처리는 하지 않았어요.':'The payment API is not connected yet. No payment was marked as completed.',
    '이미 PRO를 사용 중이에요.':'You are already using PRO.',
    '아직 선택한 미디어가 없어요.':'No media selected yet.',
    '미디어를 선택하면 러닝 인증 카드가 생성됩니다.':'Select media to create a running verification card.',
    '미디어를 선택하면 GARANG VERIFIED 오버레이를 실제 이미지에 합성할 수 있습니다.':'Select media to create a GARANG VERIFIED overlay on the image.',
    '기록이 쌓일수록 GARANG의 코칭도 정확해져요.':'The more you record, the more precise GARANG’s coaching becomes.',
    '오늘의 데이터':'Today’s data',
    '오늘 약':'Today about',
    '운동 세션 저장 완료':'Workout session saved',
    '한 끼 저장 완료':'Meal saved',
    '러닝 저장 완료':'Run saved',
    '체성분 기록을 저장했어요.':'Body composition saved.',
    '프로필을 저장했어요.':'Profile saved.',
    '데이터를 가져왔어요.':'Data imported.',
    '데이터 내보내기를 시작했어요.':'Data export started.',
    '화면을 다시 불러왔어요.':'The screen was reloaded.',
    '이 브라우저에서는 영상 합성이 제한돼 원본 공유로 전환합니다.':'Video composition is limited in this browser; sharing the original instead.',
    '브라우저 정책상 저장이 제한됩니다. 공유 메뉴를 이용해 주세요.':'Browser policy limits saving. Please use the share menu.',
    '저장을 시작했어요. 모바일에서는 공유 메뉴를 사용할 수 있어요.':'Saving started. On mobile, you can use the share menu.',
    '이미지 저장 중 오류가 발생했어요.':'An error occurred while saving the image.',
    '공유/저장이 브라우저 정책으로 제한됐어요.':'Sharing or saving is limited by browser policy.',
    '홈':'Home','운동':'Workout','식단':'Nutrition','러닝':'Running','플래너':'Planner','GARANG AI':'GARANG AI',
    '오늘의 상태':'Today’s status','오늘 운동 기록':'Log workout','AI에게 물어보기':'Ask GARANG',
    '점수 상세 보기':'View score','오늘 계획 보기':'View plan','프로필':'Profile','설정':'Settings',
    '한국어':'Korean','언어':'Language','알림':'Notifications','플래너 알림':'Planner notifications',
    '데이터':'Data','데이터 내보내기':'Export data','데이터 가져오기':'Import data','로컬 데이터 초기화':'Reset local data',
    '인바디 / 체성분':'InBody / Body Composition','체성분 저장':'Save body composition','최근 측정':'Recent measurements',
    '오늘의 플래너':'Today’s Planner','알림 권한':'Notification permission','AI 추천 계획':'AI recommended plan','계획 추가':'Add plan',
    '오늘 일정':'Today’s schedule','완료 취소':'Undo','완료':'Done','삭제':'Delete','무엇을 도와줄까?':'How can I help?',
    'GARANG에게 물어보세요...':'Ask GARANG...','새 대화':'New chat','오늘 상태':'Today’s status','운동 분석':'Workout analysis',
    '식단 분석':'Nutrition analysis','달성':'Unlocked','진행 중':'In progress','달성 완료':'Completed',
    '로그아웃':'Log out','현재 플랜':'Current plan','메뉴':'Menu','FREE / PRO 보기':'View FREE / PRO',
    '오늘의 데이터':'Today’s data','오늘 운동':'Today’s workout','오늘 식단':'Today’s nutrition','최근 운동':'Recent workout',
    '최근 기록':'Recent records','운동 기록':'Workout log','운동 세션':'Workout session','운동 인증':'Workout verification',
    '운동 추가':'Add workout','운동을 세션에 추가':'Add workout to session','운동 세션 저장':'Save workout session',
    '운동 시간 분':'Workout duration (min)','중량 kg':'Weight (kg)','체중 kg':'Body weight (kg)','반복':'Reps','세트':'Sets','볼륨':'Volume',
    '식사':'Meal','오늘 식사':'Today’s meals','오늘 누적':'Today’s total','섭취 kcal':'Calories','단백질 g':'Protein (g)',
    '탄수화물 g':'Carbs (g)','지방 g':'Fat (g)','섭취량 g':'Serving (g)','음식/메뉴':'Food / menu','음식 추가':'Add food',
    'DB 영양정보 불러오기':'Load nutrition from DB','여러 음식 한 번에 추가':'Add multiple foods','한 끼 전체 저장':'Save meal',
    '여러 음식 빠른 추가 · 한 줄에':'Quick add multiple foods · one per line','오늘 운동 소모':'Today’s workout burn','총 세트':'Total sets',
    '총 볼륨':'Total volume','세션 총 소모':'Session calories','러닝 기록':'Running records','러닝 인증':'Running verification',
    'GPS 러닝 시작':'Start GPS run','정지 & 저장':'Stop & save','인증 사진/영상':'Verification photo/video','원본 공유':'Share original',
    '러닝':'Running','GPS 대기 중':'Waiting for GPS','플래너 알림':'Planner notifications','알림 사용':'Notifications on','알림 안 함':'No notification',
    '시간':'Time','종류':'Type','계획':'Plan','계획 추가':'Add plan','현재 상태 유지':'Maintain current state','GARANG 추천':'GARANG recommendations',
    '이번 주 추세':'This week’s trend','가장 먼저 개선할 영역':'First area to improve','GARANG 종합 퍼포먼스 점수':'GARANG Performance Score',
    '최근 체중':'Latest weight','체성분':'Body composition','측정일':'Measurement date','체지방률 %':'Body fat %','골격근량 kg':'Muscle mass (kg)',
    'BMI':'BMI','기초대사량 kcal':'BMR (kcal)','프로필 저장':'Save profile','이름':'Name','나이':'Age','키 cm':'Height (cm)','목표':'Goal',
    'FREE / PRO':'FREE / PRO','기본 기록':'Basic tracking','기본 체성분 기록':'Basic body composition tracking','기본 Planner':'Basic Planner',
    '기본 AI 코칭':'Basic AI coaching','통합 Performance Score':'Integrated Performance Score','고급 AI Coach / Memory':'Advanced AI Coach / Memory',
    '고급 Planner':'Advanced Planner','향후 웨어러블·외부 데이터 연동':'Future wearable / external data integration',
    'Personal Performance':'Personal Performance','기록이 없습니다.':'No records yet.','아직 운동 기록이 없어요.':'No workout records yet.',
    '아직 측정 기록이 없습니다.':'No body-composition records yet.','오늘 식단을 기록해 보세요.':'Log today’s nutrition.',
    '오늘 플래너가 비어 있어. 운동·식사·회복을 기준으로 오늘 계획을 만들어볼까?':'Your planner is empty today. Want to build a plan around training, meals and recovery?',
    '결제 API 연결 전에는 실제 결제가 완료된 것처럼 처리하지 않습니다.':'Payment is not marked as completed until a real payment API is connected.',
    '결제 서비스 연결 전에는 실제 결제가 발생하지 않습니다.':'No real payment is processed until a payment service is connected.',
    '기록이 쌓이면 추세가 표시됩니다.':'Your trend will appear as records accumulate.',
    '화면을 다시 불러왔어요.':'The screen was reloaded.',
    'GARANG 화면을 불러오지 못했어요.':'GARANG could not load this screen.',
    '페이지를 새로고침해 주세요.':'Please refresh the page.',
    '질문을 입력해 주세요.':'Please enter a question.',
    '음식을 입력해 주세요.':'Please enter a food.',
    '먼저 운동을 추가해 주세요.':'Add a workout first.',
    '먼저 음식을 추가해 주세요.':'Add a food first.',
    '계획을 입력해 주세요.':'Please enter a plan.',
    '새 대화':'New chat','전송':'Send','닫기':'Close','메뉴':'Menu','초기화':'Reset','수정':'Edit','삭제':'Delete',
    '알림 ON':'Notifications ON','알림 OFF':'Notifications OFF','알림 권한이 허용되지 않았어요.':'Notification permission was not granted.',
    '이 브라우저는 알림을 지원하지 않아요.':'This browser does not support notifications.',
    '오늘의 데이터를 쌓아 GARANG의 기준선을 만들어보자.':'Build today’s baseline with GARANG.',
    '기록이 쌓일수록 GARANG의 코칭도 정확해져요.':'The more you record, the more precise GARANG’s coaching becomes.',
    '네 기록을 바탕으로 대화하는 Personal Performance Agent':'A Personal Performance Agent that talks with you using your records',
    '운동, 식단, 러닝, 체성분, 플래너를 한 번에 보고 다음 행동을 정해줄게.':'I’ll look at workouts, nutrition, running, body composition and your planner to decide the next action.',
    '오늘 상태':'Today’s status','운동 분석':'Workout analysis','식단 분석':'Nutrition analysis','플래너':'Planner',
    '프로필':'Profile','인바디 / 체성분':'InBody / Body Composition','Performance Score':'Performance Score','GARANG 메뉴':'GARANG Menu'
  };
  const reverse=Object.fromEntries(Object.entries(dict).map(([ko,enText])=>[enText,ko]));
  Object.assign(reverse,{
    'Personal Performance Agent':'개인 퍼포먼스 에이전트',
    'GARANG Menu':'GARANG 메뉴',
    'A Personal Performance Agent that talks with you using your records':'네 기록을 바탕으로 대화하는 Personal Performance Agent',
    'Today’s status':'오늘의 상태',
    'Today':'오늘',
    'Home':'홈','Workout':'운동','Nutrition':'식단','Running':'러닝','Planner':'플래너',
    'Profile':'프로필','Settings':'설정','Language':'언어','Notifications':'알림','Data':'데이터',
    'Export data':'데이터 내보내기','Import data':'데이터 가져오기','Reset local data':'로컬 데이터 초기화',
    'InBody / Body Composition':'인바디 / 체성분','Save body composition':'체성분 저장',
    'Recent measurements':'최근 측정','Today’s Planner':'오늘의 플래너','Notification permission':'알림 권한',
    'AI recommended plan':'AI 추천 계획','Add plan':'계획 추가','Today’s schedule':'오늘 일정',
    'Undo':'완료 취소','Done':'완료','Delete':'삭제','How can I help?':'무엇을 도와줄까?',
    'Ask GARANG...':'GARANG에게 물어보세요...','New chat':'새 대화','Workout analysis':'운동 분석',
    'Nutrition analysis':'식단 분석','Unlocked':'달성','In progress':'진행 중','Log out':'로그아웃',
    'Current plan':'현재 플랜','Menu':'메뉴','View FREE / PRO':'FREE / PRO 보기',
    'Basic tracking':'기본 기록','Basic body composition tracking':'기본 체성분 기록','Basic Planner':'기본 Planner',
    'Basic AI coaching':'기본 AI 코칭','Integrated Performance Score':'통합 Performance Score',
    'Advanced AI Coach / Memory':'고급 AI Coach / Memory','Advanced Planner':'고급 Planner',
    'No records yet.':'기록이 없습니다.','No workout records yet.':'아직 운동 기록이 없어요.',
    'No body-composition records yet.':'아직 측정 기록이 없습니다.','Log today’s nutrition.':'오늘 식단을 기록해 보세요.',
    'Payment is not marked as completed until a real payment API is connected.':'결제 API 연결 전에는 실제 결제가 완료된 것처럼 처리하지 않습니다.',
    'No real payment is processed until a payment service is connected.':'결제 서비스 연결 전에는 실제 결제가 발생하지 않습니다.',
    'Please enter a question.':'질문을 입력해 주세요.','Please enter a food.':'음식을 입력해 주세요.',
    'Add a workout first.':'먼저 운동을 추가해 주세요.','Add a food first.':'먼저 음식을 추가해 주세요.',
    'Please enter a plan.':'계획을 입력해 주세요.','Close':'닫기','Reset':'초기화','Edit':'수정',
    'Notifications ON':'알림 ON','Notifications OFF':'알림 OFF','Send':'전송'
  });
  const map=en?dict:reverse;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  const entries=Object.entries(map).sort((a,b)=>b[0].length-a[0].length);
  nodes.forEach(n=>{
    let t=n.nodeValue;
    for(const [from,to] of entries) if(t.includes(from)) t=t.split(from).join(to);
    n.nodeValue=t;
  });
  document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
    const to=map[el.placeholder]; if(to)el.placeholder=to;
  });
  document.querySelectorAll('[aria-label]').forEach(el=>{
    const to=map[el.getAttribute('aria-label')]; if(to)el.setAttribute('aria-label',to);
  });
}
function render(){
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));
  const m=$('main');
  try{
    if(!pages[currentPage])currentPage='home';
    m.innerHTML=pages[currentPage]();
    bindPage();
    applyLanguage();
  }catch(err){
    console.error('GARANG render error',err);
    currentPage='home';
    try{m.innerHTML=pages.home();bindPage();applyLanguage();toast('화면을 다시 불러왔어요.');}
    catch(fallback){m.innerHTML='<div class="card"><h2>GARANG 화면을 불러오지 못했어요.</h2><p class="muted">페이지를 새로고침해 주세요.</p></div>';}
  }
}
function dayMeals(){return state.meals.filter(x=>x.date===today());}
function totalsMeals(){return dayMeals().reduce((a,x)=>({kcal:a.kcal+safeNumber(x.kcal),protein:a.protein+safeNumber(x.protein),carbs:a.carbs+safeNumber(x.carbs),fat:a.fat+safeNumber(x.fat)}),{kcal:0,protein:0,carbs:0,fat:0});}
function workoutKcalToday(){return state.workouts.filter(x=>x.date===today()).reduce((a,x)=>a+safeNumber(x.kcal),0);}
function coachHeadline(){const t=totalsMeals(), wk=state.workouts.filter(x=>x.date===today()).length;return wk?`${wk}개 운동 기록을 기준으로 다음 한 걸음을 잡아볼게.`:t.kcal?`오늘 식단과 활동을 기준으로 균형을 잡아볼게.`:'오늘의 데이터를 쌓아 GARANG의 기준선을 만들어보자.';}
function coachSummary(){const t=totalsMeals();return `현재 체중 ${state.profile?.weight||'—'}kg · 오늘 섭취 ${Math.round(t.kcal)} kcal · 단백질 ${Math.round(t.protein)}g · 운동 소모 약 ${Math.round(workoutKcalToday())} kcal`}
function pagesForHome(){const w=state.workouts.at(-1),t=totalsMeals(),last=state.body.at(-1)||{};return `<div class="page-head"><div><span class="eyebrow">TODAY</span><h1>${esc(state.profile?.name||'GARANG 사용자')}의 오늘</h1><p class="muted">기록이 쌓일수록 GARANG의 코칭도 정확해져요.</p></div><button class="ghost" id="profileBtn">프로필</button></div><div class="card hero-card"><span class="eyebrow">GARANG COACH</span><h2>${coachHeadline()}</h2><p class="muted">${coachSummary()}</p><div class="actions"><button class="primary" data-pagego="workout">오늘 운동 기록</button><button class="ghost" data-pagego="ai">AI에게 물어보기</button></div></div><div class="section-title"><h2>오늘의 상태</h2><span class="pill">${state.plan}</span></div><div class="card"><div class="metric-row"><span>Performance Score</span><strong>${calcPerformanceScore().total}/100</strong></div><div class="score-bar"><i style="width:${calcPerformanceScore().total}%"></i></div><div class="actions"><button class="ghost" data-pagego="score">점수 상세 보기</button><button class="ghost" data-pagego="planner">오늘 계획 보기</button></div></div><div class="grid grid-4"><div class="card"><div class="stat">${state.workouts.filter(x=>x.date===today()).length}</div><div class="stat-label">오늘 운동</div></div><div class="card"><div class="stat">${Math.round(t.kcal)}</div><div class="stat-label">섭취 kcal</div></div><div class="card"><div class="stat">${Math.round(t.protein)}g</div><div class="stat-label">단백질</div></div><div class="card"><div class="stat">${last.weight?last.weight+'kg':state.profile?.weight?state.profile.weight+'kg':'—'}</div><div class="stat-label">최근 체중</div></div></div><div class="section-title"><h2>오늘 운동 소모</h2><span class="pill">약 ${Math.round(workoutKcalToday())} kcal</span></div><div class="card"><div class="metric-row"><span>운동 세션</span><b>${new Set(state.workouts.filter(x=>x.date===today()).map(x=>x.sessionId||x.id)).size}개</b></div><div class="metric-row"><span>총 세트</span><b>${state.workouts.filter(x=>x.date===today()).reduce((a,x)=>a+safeNumber(x.sets),0)}</b></div><div class="metric-row"><span>총 볼륨</span><b>${Math.round(state.workouts.filter(x=>x.date===today()).reduce((a,x)=>a+safeNumber(x.volume),0)).toLocaleString()} kg</b></div></div><div class="section-title"><h2>최근 기록</h2></div><div class="grid grid-2"><div class="card"><h3>최근 운동</h3>${w?`<div class="metric-row"><span>${esc(w.name)}</span><b>${Math.round(w.kcal||0)} kcal</b></div><div class="metric-row"><span>볼륨</span><b>${Math.round(w.volume||0)} kg</b></div>`:`<div class="empty">아직 운동 기록이 없어요.</div>`}</div><div class="card"><h3>오늘 식단</h3>${dayMeals().length?dayMeals().slice().reverse().map(x=>`<div class="metric-row"><span>${esc(x.name)} · ${x.items.length}종</span><b>${Math.round(x.kcal)} kcal</b></div>`).join(''):`<div class="empty">오늘 식단을 기록해 보세요.</div>`}</div></div>`;}
function renderWorkoutDraft(){if(!workoutDraft.length)return '<div class="empty">아직 추가한 운동이 없어요. 위에서 운동을 추가하세요.</div>';return `<div class="list">${workoutDraft.map((x,i)=>`<div class="list-item"><div><strong>${esc(x.name)}</strong><div class="muted">${x.sets}×${x.reps} · ${x.weight}kg · RPE ${x.rpe} · ${x.duration}분 · MET ${x.met.toFixed(1)} · 약 ${Math.round(x.kcal)} kcal</div></div><div class="actions"><button class="ghost small" data-edit-workout="${i}">수정</button><button class="ghost small" data-remove-workout="${i}">삭제</button></div></div>`).join('')}</div>`;}
function renderMealDraft(){if(!mealDraft.length)return '<div class="empty">한 끼에 넣을 음식을 계속 추가하세요.</div>';return `<div class="list">${mealDraft.map((x,i)=>`<div class="list-item"><div><strong>${esc(x.name)}</strong><div class="muted">${x.grams}g · ${Math.round(x.kcal)} kcal · P ${Math.round(x.protein)}g · C ${Math.round(x.carbs)}g · F ${Math.round(x.fat)}g</div></div><div class="actions"><button class="ghost small" data-edit-food="${i}">수정</button><button class="ghost small" data-remove-food="${i}">삭제</button></div></div>`).join('')}</div>`;}
function achievementSummary(){
  ensureMemory();
  const workouts=state.workouts, meals=state.meals, runs=state.runs, body=state.body, planner=state.planner;
  const daySet=(arr)=>new Set(arr.map(x=>x.date||today()));
  const streak=(arr)=>{
    const ds=[...daySet(arr)].sort().reverse(); let n=0, cursor=new Date();
    for(const d of ds){const key=cursor.toISOString().slice(0,10);if(d!==key)break;n++;cursor.setDate(cursor.getDate()-1);}
    return n;
  };
  return [
    {id:'workout1',title:'첫 운동',unlocked:workouts.length>=1},
    {id:'meal1',title:'첫 식단',unlocked:meals.length>=1},
    {id:'run1',title:'첫 러닝',unlocked:runs.length>=1},
    {id:'body1',title:'첫 체성분',unlocked:body.length>=1},
    {id:'planner1',title:'첫 계획',unlocked:planner.length>=1},
    {id:'streak7',title:'7일 기록 연속',unlocked:Math.max(streak(workouts),streak(meals),streak(runs))>=7}
  ];
}
const pages={
 home:pagesForHome,
 workout:()=>`<div class="page-head"><div><span class="eyebrow">WORKOUT</span><h1>운동 기록</h1><p class="muted">한 세션에 여러 운동을 추가하고 운동별 MET·시간·체중 기반 소모 kcal를 계산합니다.</p></div></div><div class="grid grid-2"><div class="card"><h3>운동 추가</h3><div class="form-grid"><div class="field full"><label>운동</label><input id="wName" list="exerciseList" placeholder="바벨 벤치프레스"><datalist id="exerciseList">${db.exercise.slice(0,700).map(x=>`<option value="${esc(x.exercise_name)}">`).join('')}</datalist></div><div class="field"><label>세트</label><input id="wSets" type="number" min="1" value="3"></div><div class="field"><label>반복</label><input id="wReps" type="number" min="1" value="10"></div><div class="field"><label>중량 kg</label><input id="wWeight" type="number" min="0" step="0.5" value="60"></div><div class="field"><label>RPE</label><input id="wRpe" type="number" min="1" max="10" step="0.5" value="8"></div><div class="field"><label>운동 시간 분</label><input id="wDuration" type="number" min="1" value="15"></div><div class="field"><label>체중 kg</label><input id="wBody" type="number" min="1" step="0.1" value="${state.profile?.weight||67}"></div></div><div class="actions" style="margin-top:13px"><button id="addWorkout" class="primary">운동을 세션에 추가</button><button id="clearWorkoutDraft" class="ghost">초기화</button></div><div class="helper">운동 DB에 MET 기본값이 있으면 그대로 사용하고, RPE에 따라 완만하게 보정합니다.</div><div id="workoutDraftArea" class="draft-area" style="margin-top:16px">${renderWorkoutDraft()}</div><div class="session-total"><div><span>세션 총 소모</span><strong>${Math.round(workoutDraft.reduce((a,x)=>a+x.kcal,0))} kcal</strong></div><div><span>총 볼륨</span><strong>${Math.round(workoutDraft.reduce((a,x)=>a+x.volume,0)).toLocaleString()} kg</strong></div></div><button id="saveWorkoutSession" class="primary wide" style="margin-top:13px" ${workoutDraft.length?'':'disabled'}>운동 세션 저장</button></div><div class="card"><h3>운동 인증</h3><p class="muted">사진/영상을 선택하면 GARANG VERIFIED 오버레이를 실제 이미지에 합성할 수 있습니다.</p><div class="actions"><button id="certWorkout" class="ghost">사진/영상 선택</button></div><div id="workoutCertArea" class="empty" style="margin-top:12px">아직 선택한 미디어가 없어요.</div></div></div><div class="section-title"><h2>최근 운동</h2><span class="pill">오늘 약 ${Math.round(workoutKcalToday())} kcal</span></div><div class="card"><div class="list">${state.workouts.slice().reverse().slice(0,30).map(w=>`<div class="list-item"><div><strong>${esc(w.name)}</strong><div class="muted">${w.date} · ${w.sets}×${w.reps} · ${w.weight}kg · RPE ${w.rpe} · MET ${safeNumber(w.met,0).toFixed(1)} · 약 ${Math.round(w.kcal||0)} kcal</div></div><span class="pill">${Math.round(w.volume||0)}kg</span></div>`).join('')||'<div class="empty">기록이 없습니다.</div>'}</div></div>`,
 nutrition:()=>{const t=totalsMeals();return `<div class="page-head"><div><span class="eyebrow">NUTRITION</span><h1>식단</h1><p class="muted">한 끼에 여러 음식을 계속 추가하거나, 여러 줄로 한 번에 입력할 수 있습니다.</p></div></div><div class="grid grid-2"><div class="card"><h3>음식 추가</h3><div class="field"><label>음식/메뉴</label><input id="foodSearch" list="foodList" placeholder="닭가슴살"><datalist id="foodList">${db.food.slice(0,1500).map(x=>`<option value="${esc(x.name)}">`).join('')}</datalist></div><div class="form-grid" style="margin-top:12px"><div class="field"><label>섭취량 g</label><input id="foodGram" type="number" min="1" value="100"></div><div class="field"><label>kcal</label><input id="foodKcal" type="number" value="0"></div><div class="field"><label>단백질 g</label><input id="foodProtein" type="number" value="0"></div><div class="field"><label>탄수화물 g</label><input id="foodCarb" type="number" value="0"></div><div class="field"><label>지방 g</label><input id="foodFat" type="number" value="0"></div></div><div class="actions" style="margin-top:13px"><button id="fillFood" class="ghost">DB 영양정보 불러오기</button><button id="addFood" class="primary">음식 추가</button></div><div class="field" style="margin-top:16px"><label>여러 음식 빠른 추가 · 한 줄에 <b>음식명, g</b></label><textarea id="foodBatch" rows="4" placeholder="닭가슴살, 200\n현미밥, 210\n계란, 100"></textarea><button id="addFoodBatch" class="ghost">여러 음식 한 번에 추가</button></div><div id="mealDraftArea" class="draft-area" style="margin-top:16px">${renderMealDraft()}</div><div class="session-total"><div><span>끼니 총 kcal</span><strong>${Math.round(mealDraft.reduce((a,x)=>a+x.kcal,0))} kcal</strong></div><div><span>P / C / F</span><strong>${Math.round(mealDraft.reduce((a,x)=>a+x.protein,0))} / ${Math.round(mealDraft.reduce((a,x)=>a+x.carbs,0))} / ${Math.round(mealDraft.reduce((a,x)=>a+x.fat,0))} g</strong></div></div><button id="saveMeal" class="primary wide" style="margin-top:13px" ${mealDraft.length?'':'disabled'}>한 끼 전체 저장</button></div><div class="card"><h3>오늘 누적</h3><div class="grid grid-2"><div><div class="stat">${Math.round(t.kcal)}</div><div class="stat-label">kcal</div></div><div><div class="stat">${Math.round(t.protein)}g</div><div class="stat-label">단백질</div></div><div><div class="stat">${Math.round(t.carbs)}g</div><div class="stat-label">탄수화물</div></div><div><div class="stat">${Math.round(t.fat)}g</div><div class="stat-label">지방</div></div></div></div></div><div class="section-title"><h2>오늘 식사</h2></div><div class="card"><div class="list">${dayMeals().slice().reverse().map(x=>`<div class="meal-card"><div class="metric-row"><strong>${esc(x.name)}</strong><b>${Math.round(x.kcal)} kcal</b></div><div class="meal-items">${x.items.map(i=>`<span>${esc(i.name)} ${i.grams}g · ${Math.round(i.kcal)} kcal</span>`).join('')}</div><div class="muted">P ${Math.round(x.protein)}g · C ${Math.round(x.carbs)}g · F ${Math.round(x.fat)}g</div></div>`).join('')||'<div class="empty">기록이 없습니다.</div>'}</div></div>`;},
 running:()=>`<div class="page-head"><div><span class="eyebrow">RUNNING</span><h1>러닝</h1><p class="muted">GPS 거리·페이스·소모 kcal를 기록하고 인증 미디어를 합성·저장하세요.</p></div></div><div class="grid grid-2"><div class="card"><div class="grid grid-3"><div><div class="stat" id="runDistance">0.00</div><div class="stat-label">km</div></div><div><div class="stat" id="runTime">00:00</div><div class="stat-label">시간</div></div><div><div class="stat" id="runPace">—</div><div class="stat-label">분/km</div></div></div><div class="map-box" style="margin-top:18px"><div class="map-grid"></div><svg class="route" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="routeLine" points="" opacity=".9"></polyline></svg><div class="map-note" id="gpsStatus">GPS 대기 중</div></div><div class="actions" style="margin-top:13px"><button id="runStart" class="primary">GPS 러닝 시작</button><button id="runStop" class="ghost">정지 & 저장</button><button id="runCert" class="ghost">인증 사진/영상</button></div></div><div class="card"><h3>러닝 인증</h3><div id="runCertArea" class="empty">미디어를 선택하면 러닝 인증 카드가 생성됩니다.</div></div></div><div class="section-title"><h2>러닝 기록</h2></div><div class="card"><div class="list">${state.runs.slice().reverse().slice(0,20).map(x=>`<div class="list-item"><div><strong>${Number(x.distance||0).toFixed(2)} km</strong><div class="muted">${x.date} · ${Number(x.duration||0).toFixed(1)}분 · ${x.pace} /km</div></div><span class="pill">${Math.round(x.kcal||0)} kcal</span></div>`).join('')||'<div class="empty">기록이 없습니다.</div>'}</div></div>`,
 planner:()=>{const d=today(),items=state.planner.filter(x=>x.date===d).sort((a,b)=>String(a.time).localeCompare(String(b.time)));const done=items.filter(x=>x.done).length,pct=items.length?Math.round(done/items.length*100):0;return `<div class="page-head"><div><span class="eyebrow">ADAPTIVE PLANNER</span><h1>오늘의 플래너</h1><p class="muted">시간표를 만들고, 실행 여부에 따라 다음 계획을 조정합니다.</p></div><div class="actions"><button id="plannerNotify" class="ghost">알림 권한</button><button id="plannerSuggest" class="primary">AI 추천 계획</button></div></div><div class="card planner-progress"><div><span class="eyebrow">TODAY PROGRESS</span><strong>${pct}%</strong></div><div class="planner-bar"><i style="width:${pct}%"></i></div><div class="muted">${done}/${items.length}개 완료</div></div><div class="grid grid-2"><div class="card"><h3>계획 추가</h3><div class="form-grid"><div class="field"><label>시간</label><input id="planTime" type="time" value="18:30"></div><div class="field"><label>종류</label><select id="planType"><option value="workout">운동</option><option value="meal">식사</option><option value="run">러닝</option><option value="recovery">회복</option><option value="routine">루틴</option></select></div><div class="field full"><label>계획</label><input id="planTitle" placeholder="오늘의 하체 운동 45분"></div><div class="field full"><label>알림</label><select id="planNotifyMode"><option value="yes">알림 사용</option><option value="no">알림 안 함</option></select></div></div><button id="planAdd" class="primary wide" style="margin-top:13px">계획 추가</button></div><div class="card"><h3>GARANG 추천</h3><p class="muted">현재 기록을 보고 기본적인 오늘 계획을 제안합니다. 실제 AI 호출 없이 안전한 규칙 기반으로 생성합니다.</p><div class="list"><div class="list-item"><div><strong>운동</strong><div class="muted">최근 운동 기록이 있으면 다음 세션을 기준으로 제안</div></div><span class="pill">DATA</span></div><div class="list-item"><div><strong>식사</strong><div class="muted">식단 기록이 없으면 식사 시간을 먼저 확보</div></div><span class="pill">ROUTINE</span></div></div></div></div><div class="section-title"><h2>오늘 일정</h2><span class="pill">${items.length}개</span></div><div class="card"><div class="list">${items.length?items.map(x=>`<div class="list-item planner-item ${x.done?'is-done':''}"><div><strong>${esc(x.time)} · ${esc(x.title)}</strong><div class="muted">${esc(x.type)} · ${x.notify?'알림 ON':'알림 OFF'}</div></div><div class="actions"><button class="ghost small" data-plan-done="${esc(x.id)}">${x.done?'완료 취소':'완료'}</button><button class="ghost small" data-plan-delete="${esc(x.id)}">삭제</button></div></div>`).join(''):'<div class="empty">오늘 계획이 없습니다. 첫 계획을 추가해보세요.</div>'}</div></div>`;},

  ai:()=>renderChat(),
 score:()=>{const x=calcPerformanceScore(),d=scoreDelta(),h=Array.isArray(state.scoreHistory)?state.scoreHistory.slice(-7):[],lowest=[['운동',x.exercise],['영양',x.nutrition],['회복',x.recovery],['활동',x.activity],['체성분',x.body]].sort((a,b)=>a[1]-b[1])[0];return `<div class="page-head"><div><span class="eyebrow">PERFORMANCE</span><h1>Performance Score</h1><p class="muted">최근 30일 데이터를 기준으로 현재 퍼포먼스를 종합합니다.</p></div></div><div class="score-hero card"><div class="score-number">${x.total}</div><span>/100 ${d>0?'↑ '+d:d<0?'↓ '+Math.abs(d):'—'}</span><p>GARANG 종합 퍼포먼스 점수</p></div><div class="grid grid-2">${[['운동',x.exercise],['영양',x.nutrition],['회복',x.recovery],['활동',x.activity],['체성분',x.body]].map(([n,v])=>`<div class="card"><div class="metric-row"><b>${n}</b><strong>${v}</strong></div><div class="score-bar"><i style="width:${v}%"></i></div></div>`).join('')}</div><div class="card"><h3>이번 주 추세</h3><div class="list">${h.slice().reverse().map(v=>`<div class="list-item"><span>${v.date}</span><b>${v.total}</b></div>`).join('')||'<div class="empty">기록이 쌓이면 추세가 표시됩니다.</div>'}</div></div><div class="card"><h3>가장 먼저 개선할 영역</h3><p><strong>${lowest[0]}</strong> · ${lowest[1]}점</p><p class="muted">한 번에 하나의 행동부터 개선하면 Score 변화가 더 명확해집니다.</p><button class="primary" data-pagego="ai">GARANG에게 개선 방법 묻기</button></div><div class="card"><h3>Achievement</h3><div class="list">${achievementSummary().map(a=>`<div class="list-item"><span>${a.unlocked?'🏆':'○'} ${a.title}</span><b>${a.unlocked?'달성':'진행 중'}</b></div>`).join('')}</div></div></div>`},
 body:
()=>{const b=state.body.at(-1)||{};return `<div class="page-head"><div><span class="eyebrow">BODY COMPOSITION</span><h1>인바디 / 체성분</h1><p class="muted">측정값을 기록하면 Score와 AI 코칭에 함께 반영됩니다.</p></div></div><div class="card"><div class="form-grid"><div class="field"><label>측정일</label><input id="bodyDate" type="date" value="${b.date||today()}"></div><div class="field"><label>체중 kg</label><input id="bodyWeight" type="number" step="0.1" value="${b.weight??state.profile?.weight??''}"></div><div class="field"><label>체지방률 %</label><input id="bodyFat" type="number" step="0.1" value="${b.bodyFat??''}"></div><div class="field"><label>골격근량 kg</label><input id="bodyMuscle" type="number" step="0.1" value="${b.muscle??''}"></div><div class="field"><label>BMI</label><input id="bodyBmi" type="number" step="0.1" value="${b.bmi??''}"></div><div class="field"><label>기초대사량 kcal</label><input id="bodyBmr" type="number" value="${b.bmr??''}"></div></div><button id="saveBody" class="primary" style="margin-top:13px">체성분 저장</button></div><div class="card"><h3>최근 측정</h3><div class="list">${state.body.slice().reverse().slice(0,20).map(x=>`<div class="list-item"><div><strong>${x.date||'—'}</strong><div class="muted">체중 ${x.weight??'—'}kg · 체지방 ${x.bodyFat??'—'}% · 골격근 ${x.muscle??'—'}kg</div></div></div>`).join('')||'<div class="empty">아직 측정 기록이 없습니다.</div>'}</div></div></div>`},
 premium:()=>{const pro=state.plan==='PRO';return `<div class="page-head"><div><span class="eyebrow">GARANG PLAN</span><h1>FREE / PRO</h1><p class="muted">결제 API 연결 전에는 실제 결제가 완료된 것처럼 처리하지 않습니다.</p></div></div><div class="pricing-grid"><div class="price-card card"><span class="pill">FREE</span><h2>기본 기록</h2><p>GARANG을 시작하기 위한 기본 기능</p><ul><li>운동·식단·러닝 기록</li><li>기본 체성분 기록</li><li>기본 Planner</li><li>기본 AI 코칭</li></ul><b>현재 ${!pro?'사용 중':'다운그레이드 예정'}</b></div><div class="price-card card featured"><span class="pill">PRO</span><h2>Personal Performance</h2><p>모든 데이터를 연결해 더 깊게 코칭</p><ul><li>통합 Performance Score</li><li>고급 AI Coach / Memory</li><li>고급 Planner</li><li>향후 웨어러블·외부 데이터 연동</li></ul><button id="proCheckout" class="primary wide">${pro?'PRO 사용 중':'PRO 전환 준비'}</button><small>결제 서비스 연결 전에는 실제 결제가 발생하지 않습니다.</small></div></div>`},
 settings:()=>`<div class="page-head"><div><span class="eyebrow">SETTINGS</span><h1>설정</h1></div></div><div class="card"><h3>언어</h3><div class="actions"><button id="langKo" class="${state.language==='ko'?'primary':'ghost'}">한국어</button><button id="langEn" class="${state.language==='en'?'primary':'ghost'}">English</button></div><hr><h3>알림</h3><label class="toggle-row"><span>플래너 알림</span><input id="notifyToggle" type="checkbox" ${state.settings.notifications?'checked':''}></label><hr><h3>데이터</h3><div class="actions"><button id="exportData" class="ghost">데이터 내보내기</button><label class="ghost file-btn">데이터 가져오기<input id="importData" type="file" accept="application/json" hidden></label><button id="clearLocal" class="ghost danger">로컬 데이터 초기화</button></div></div>`,
 profile:()=>`<div class="page-head"><div><span class="eyebrow">PROFILE</span><h1>프로필</h1></div></div><div class="card"><div class="form-grid"><div class="field"><label>이름</label><input id="pName" value="${esc(state.profile?.name||'')}"></div><div class="field"><label>나이</label><input id="pAge" type="number" value="${state.profile?.age||''}"></div><div class="field"><label>키 cm</label><input id="pHeight" type="number" value="${state.profile?.height||''}"></div><div class="field"><label>체중 kg</label><input id="pWeight" type="number" step="0.1" value="${state.profile?.weight||''}"></div><div class="field full"><label>목표</label><input id="pGoal" value="${esc(state.profile?.goal||'퍼포먼스 향상')}"></div></div><button id="saveProfile" class="primary" style="margin-top:13px">프로필 저장</button></div>`
};
function handleImport(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const incoming=JSON.parse(r.result);if(!incoming||typeof incoming!=='object')throw new Error('invalid');state={...state,...incoming};normalizeState();saveState();toast('데이터를 가져왔어요.');render();}catch(err){console.warn('import failed',err);toast('가져오기에 실패했어요. JSON 파일을 확인해 주세요.');}};r.readAsText(f);}
function bindPage(){
  $('menuBtn').onclick=openMenu; $('planBadge').onclick=()=>{currentPage='premium';render();};
  document.querySelectorAll('[data-chat-q]').forEach(b=>b.onclick=()=>{$('aiQuestion').value=b.dataset.chatQ;askAI();});
  $('newChat')?.addEventListener('click',()=>{state.aiChats=[];saveState();render();});
  if(currentPage==='ai'){$('askAI')?.addEventListener('click',askAI);$('aiQuestion')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askAI();}});setTimeout(()=>{const box=$('chatMessages');if(box)box.scrollTop=box.scrollHeight;},0);}
  if(currentPage==='body'){$('saveBody')?.addEventListener('click',()=>{const x={id:uid(),date:$('bodyDate').value||today(),weight:safeNumber($('bodyWeight').value),bodyFat:safeNumber($('bodyFat').value),muscle:safeNumber($('bodyMuscle').value),bmi:safeNumber($('bodyBmi').value),bmr:safeNumber($('bodyBmr').value)};state.body.push(x);if(x.weight)state.profile={...(state.profile||{}),weight:x.weight};saveState();toast('체성분 기록을 저장했어요.');render();});}
  if(currentPage==='premium'){$('proCheckout')?.addEventListener('click',()=>toast(state.plan==='PRO'?'이미 PRO를 사용 중이에요.':'결제 API 연결 전입니다. 결제 완료 처리는 하지 않았어요.'));}
  if(currentPage==='settings'){$('langKo')?.addEventListener('click',()=>{state.language='ko';saveState();render();});$('langEn')?.addEventListener('click',()=>{state.language='en';saveState();render();});$('notifyToggle')?.addEventListener('change',e=>{state.settings.notifications=e.target.checked;saveState();});$('exportData')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`GARANG_${today()}_data.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('데이터 내보내기를 시작했어요.');});$('clearLocal')?.addEventListener('click',()=>{if(confirm('이 기기의 GARANG 로컬 데이터를 삭제할까요?')){localStorage.removeItem(KEY);location.reload();}});$('importData')?.addEventListener('change',handleImport);}
  document.querySelectorAll('[data-pagego]').forEach(b=>b.onclick=()=>{const target=b.dataset.pagego;if(pages[target]){currentPage=target;closeMenu();render();}});
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{currentPage='ai';render();$('aiQuestion').value=b.dataset.q;askAI();});
  $('profileBtn')?.addEventListener('click',()=>{currentPage='profile';render();});
  if(currentPage==='workout'){
    $('addWorkout').onclick=addWorkoutDraft;$('clearWorkoutDraft').onclick=()=>{workoutDraft=[];render();};$('saveWorkoutSession').onclick=saveWorkoutSession;
    $('certWorkout').onclick=()=>pickMedia(m=>{currentCert.workout=m;showCert('workoutCertArea',m,state.workouts.at(-1),'workout');});
    document.querySelectorAll('[data-remove-workout]').forEach(b=>b.onclick=()=>{workoutDraft.splice(Number(b.dataset.removeWorkout),1);render();});
    document.querySelectorAll('[data-edit-workout]').forEach(b=>b.onclick=()=>editWorkout(Number(b.dataset.editWorkout)));
  }
  if(currentPage==='nutrition'){
    $('foodSearch').addEventListener('input',()=>fillFood(false));$('fillFood').onclick=()=>fillFood(true);$('addFood').onclick=addMealDraft;$('addFoodBatch').onclick=addMealBatch;$('saveMeal').onclick=saveMealGroup;
    document.querySelectorAll('[data-remove-food]').forEach(b=>b.onclick=()=>{mealDraft.splice(Number(b.dataset.removeFood),1);render();});
    document.querySelectorAll('[data-edit-food]').forEach(b=>b.onclick=()=>editMeal(Number(b.dataset.editFood)));
  }
  if(currentPage==='running'){$('runStart').onclick=startRun;$('runStop').onclick=stopRun;$('runCert').onclick=()=>pickMedia(m=>{currentCert.running=m;showCert('runCertArea',m,state.runs.at(-1),'running');});}
  if(currentPage==='planner'){ $('planAdd').onclick=addPlannerItem; $('plannerNotify').onclick=requestPlannerNotifications; $('plannerSuggest').onclick=suggestPlanner; document.querySelectorAll('[data-plan-done]').forEach(b=>b.onclick=()=>togglePlanner(b.dataset.planDone)); document.querySelectorAll('[data-plan-delete]').forEach(b=>b.onclick=()=>deletePlanner(b.dataset.planDelete)); }

  if(currentPage==='profile')$('saveProfile').onclick=saveProfile;
}

function plannerItemsForToday(){return state.planner.filter(x=>x.date===today()).sort((a,b)=>String(a.time).localeCompare(String(b.time)));}
function schedulePlannerNotifications(){try{if(!('Notification' in window)||Notification.permission!=='granted')return;window.__garangPlannerTimers?.forEach(clearTimeout);window.__garangPlannerTimers=[];const now=new Date();plannerItemsForToday().filter(x=>x.notify&&!x.done).forEach(x=>{const [h,m]=String(x.time).split(':').map(Number);const target=new Date();target.setHours(h||0,m||0,0,0);const delay=target-now;if(delay>0&&delay<86400000){const id=setTimeout(()=>{try{new Notification('GARANG · '+x.time,{body:x.title,tag:'garang-plan-'+x.id})}catch{toast('알림: '+x.title)}},delay);window.__garangPlannerTimers.push(id);}});}catch(e){console.warn('planner notification schedule failed',e)}}
async function requestPlannerNotifications(){if(!('Notification' in window))return toast('이 브라우저는 알림을 지원하지 않아요.');try{const p=await Notification.requestPermission();toast(p==='granted'?'플래너 알림이 켜졌어요.':'알림 권한이 허용되지 않았어요.');schedulePlannerNotifications();}catch{toast('알림 권한 요청을 완료하지 못했어요.')}}
function addPlannerItem(){const title=$('planTitle')?.value.trim();if(!title)return toast('계획을 입력해 주세요.');const x={id:uid(),date:today(),time:$('planTime')?.value||'18:30',title,type:$('planType')?.value||'routine',done:false,notify:($('planNotifyMode')?.value||'yes')==='yes',createdAt:Date.now()};state.planner.push(x);saveState();toast('오늘 계획을 추가했어요.');schedulePlannerNotifications();render();}
function togglePlanner(id){const x=state.planner.find(x=>x.id===id);if(!x)return;x.done=!x.done;state.memory.events.push({type:'planner',date:today(),text:`플래너 ${x.done?'완료':'미완료'} · ${x.title}`});saveState();schedulePlannerNotifications();render();}
function deletePlanner(id){state.planner=state.planner.filter(x=>x.id!==id);saveState();schedulePlannerNotifications();render();}
function suggestPlanner(){const suggestions=adaptivePlannerRecommendations();const existing=new Set(plannerItemsForToday().map(x=>x.type));const fresh=suggestions.filter(x=>!existing.has(x.type)||x.type==='routine');fresh.forEach(x=>state.planner.push({id:uid(),date:today(),...x,done:false,notify:true,createdAt:Date.now()}));saveState();schedulePlannerNotifications();toast(fresh.length?`${fresh.length}개의 맞춤 계획을 추가했어요.`:'오늘 계획은 현재 상태에 맞게 이미 구성되어 있어요.');render();}
function autoGrow(el){if(!el)return;el.style.height='auto';el.style.height=Math.min(Math.max(el.scrollHeight,180),520)+'px';}
function exerciseFor(name){const q=String(name||'').trim().toLowerCase();return db.exercise.find(x=>String(x.exercise_name||'').toLowerCase()===q)||db.exercise.find(x=>String(x.exercise_name||'').toLowerCase().includes(q));}
function calcWorkoutKcal({duration,body,rpe,met}){const base=safeNumber(met,5);const intensity=1+Math.max(0,Math.min(10,safeNumber(rpe,7))-7)*0.04;return Math.max(1,Math.round(base*intensity*3.5*body/200*duration));}
function buildWorkout(){const name=$('wName').value.trim();if(!name)return toast('운동 종목을 입력해 주세요.');const ref=exerciseFor(name);const sets=Math.max(1,safeNumber($('wSets').value,1)),reps=Math.max(1,safeNumber($('wReps').value,1)),weight=Math.max(0,safeNumber($('wWeight').value)),rpe=Math.min(10,Math.max(1,safeNumber($('wRpe').value,8))),duration=Math.max(1,safeNumber($('wDuration').value,15)),body=Math.max(1,safeNumber($('wBody').value,state.profile?.weight||67));const met=safeNumber(ref?.met_default,5);return {id:uid(),name,sets,reps,weight,rpe,duration,body,met,kcal:calcWorkoutKcal({duration,body,rpe,met}),volume:sets*reps*weight};}
function addWorkoutDraft(){const x=buildWorkout();if(!x)return;workoutDraft.push(x);toast(`${x.name} 추가 · 약 ${Math.round(x.kcal)} kcal`);render();}
function editWorkout(i){const x=workoutDraft[i];if(!x)return;$('wName').value=x.name;$('wSets').value=x.sets;$('wReps').value=x.reps;$('wWeight').value=x.weight;$('wRpe').value=x.rpe;$('wDuration').value=x.duration;$('wBody').value=x.body;workoutDraft.splice(i,1);window.scrollTo({top:0,behavior:'smooth'});toast('운동 값을 수정한 뒤 다시 추가해 주세요.');}
function saveWorkoutSession(){if(!workoutDraft.length)return toast('먼저 운동을 추가해 주세요.');const sessionId=uid(),total=Math.round(workoutDraft.reduce((a,x)=>a+x.kcal,0));workoutDraft.forEach(x=>state.workouts.push({...x,date:today(),sessionId}));state.memory.events.push({type:'workout_session',date:today(),text:`${workoutDraft.length}종목 · ${total} kcal`});workoutDraft=[];saveState();toast(`운동 세션 저장 완료 · 약 ${total} kcal`);render();}
function findFood(q){q=String(q||'').trim().toLowerCase();if(!q)return null;return db.food.find(x=>String(x.name||'').toLowerCase()===q)||db.food.find(x=>(x.aliases||[]).some(a=>String(a).toLowerCase()===q))||db.food.find(x=>String(x.name||'').toLowerCase().includes(q));}
function foodItem(name,grams){const f=findFood(name);if(!f)return null;const g=Math.max(1,safeNumber(grams,100)),ratio=g/(safeNumber(f.basis_g,100));return {id:uid(),name:f.name,grams:g,kcal:safeNumber(f.kcal)*ratio,protein:safeNumber(f.protein)*ratio,carbs:safeNumber(f.carbs)*ratio,fat:safeNumber(f.fat)*ratio};}
function fillFood(manual){const f=findFood($('foodSearch').value);if(!f){if(manual)toast('DB에서 음식을 찾지 못했어요.');return;}const g=Math.max(1,safeNumber($('foodGram').value,100)),x=foodItem(f.name,g);$('foodKcal').value=Math.round(x.kcal);$('foodProtein').value=x.protein.toFixed(1);$('foodCarb').value=x.carbs.toFixed(1);$('foodFat').value=x.fat.toFixed(1);if(manual)toast(`${f.name} 영양정보를 불러왔어요.`);}
function addMealDraft(){const name=$('foodSearch').value.trim();if(!name)return toast('음식을 입력해 주세요.');const f=findFood(name),g=Math.max(1,safeNumber($('foodGram').value,100));const x=f?foodItem(f.name,g):{id:uid(),name,grams:g,kcal:safeNumber($('foodKcal').value),protein:safeNumber($('foodProtein').value),carbs:safeNumber($('foodCarb').value),fat:safeNumber($('foodFat').value)};if(!f&&!x.kcal&&!x.protein&&!x.carbs&&!x.fat)return toast('DB에서 음식을 찾지 못했어요. 먼저 DB 영양정보를 불러오거나 값을 입력해 주세요.');mealDraft.push(x);toast(`${x.name} 추가`);render();}
function addMealBatch(){const raw=$('foodBatch').value.trim();if(!raw)return toast('여러 음식 입력란을 채워 주세요.');let added=0,missing=[];for(const line of raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){const m=line.match(/^(.+?)(?:\s*,\s*|\s+)\s*(\d+(?:\.\d+)?)\s*(?:g)?$/i);const name=(m?m[1]:line).trim(),grams=m?safeNumber(m[2],100):100;const x=foodItem(name,grams);if(x){mealDraft.push(x);added++;}else missing.push(name);}if(added){toast(`${added}개 음식을 한 번에 추가했어요.${missing.length?` 찾지 못한 음식 ${missing.length}개`:''}`);render();}else toast(`DB에서 찾지 못한 음식: ${missing.slice(0,3).join(', ')}`);}
function editMeal(i){const x=mealDraft[i];if(!x)return;$('foodSearch').value=x.name;$('foodGram').value=x.grams;$('foodKcal').value=Math.round(x.kcal);$('foodProtein').value=x.protein.toFixed(1);$('foodCarb').value=x.carbs.toFixed(1);$('foodFat').value=x.fat.toFixed(1);mealDraft.splice(i,1);window.scrollTo({top:0,behavior:'smooth'});toast('음식 값을 수정한 뒤 다시 추가해 주세요.');}
function saveMealGroup(){if(!mealDraft.length)return toast('먼저 음식을 추가해 주세요.');const totals=mealDraft.reduce((a,x)=>({kcal:a.kcal+x.kcal,protein:a.protein+x.protein,carbs:a.carbs+x.carbs,fat:a.fat+x.fat}),{kcal:0,protein:0,carbs:0,fat:0});const meal={id:uid(),date:today(),name:mealDraft.map(x=>x.name).slice(0,2).join(' + ')+(mealDraft.length>2?` 외 ${mealDraft.length-2}종`:''),items:mealDraft.map(x=>({...x})),...totals};state.meals.push(meal);state.memory.events.push({type:'meal',date:today(),text:`${meal.items.length}종 · ${Math.round(meal.kcal)} kcal`});mealDraft=[];saveState();toast(`한 끼 저장 완료 · ${Math.round(totals.kcal)} kcal`);render();}
function pickMedia(cb){const input=$('mediaPicker');input.value='';input.onchange=()=>{const f=input.files?.[0];if(!f)return;const url=URL.createObjectURL(f);cb({url,type:f.type,name:f.name,file:f});};input.click();}
function recordForCert(kind){return kind==='running'?(state.runs.at(-1)||{date:today(),distance:0,duration:0,pace:'—',kcal:0}):(state.workouts.at(-1)||{date:today(),name:workoutDraft.at(-1)?.name||'WORKOUT',weight:workoutDraft.at(-1)?.weight||0,sets:workoutDraft.at(-1)?.sets||0,reps:workoutDraft.at(-1)?.reps||0,rpe:workoutDraft.at(-1)?.rpe||'—',kcal:workoutDraft.at(-1)?.kcal||0});}
function certInfo(record,kind){const r=record||recordForCert(kind);return kind==='running'?{title:'RUN VERIFIED',main:`${safeNumber(r.distance).toFixed(2)} KM`,meta:`${Number(r.duration||0).toFixed(1)} MIN · ${r.pace||'—'} /KM · ${Math.round(r.kcal||0)} KCAL · ${r.date||today()}`}:{title:'WORKOUT VERIFIED',main:`${r.name||'WORKOUT'} · ${r.weight||0} KG`,meta:`${r.sets||0} SETS · ${r.reps||0} REPS · RPE ${r.rpe||'—'} · ${Math.round(r.kcal||0)} KCAL · ${r.date||today()}`};}
function showCert(id,m,record,kind){const area=$(id);if(!area)return;const isVideo=m.type.startsWith('video'),info=certInfo(record,kind);area.className='cert';area.innerHTML=`<div class="cert-media"><${isVideo?'video':'img'} id="certMedia" src="${m.url}" ${isVideo?'controls muted playsinline':''} alt="GARANG 인증 미디어"></${isVideo?'video':'img'}><div class="cert-overlay-pro"><div class="overlay-top"><div class="overlay-brand"><img src="garang-mark.svg" alt="GARANG"><span>GARANG</span></div><span class="verified-chip">VERIFIED</span></div><div class="overlay-bottom"><span class="overlay-kicker">${info.title}</span><strong>${esc(info.main)}</strong><span class="overlay-meta">${esc(info.meta)}</span></div></div></div><div class="cert-controls"><button class="primary small" id="certSave">${isVideo?'영상 합성 저장/공유':'오버레이 이미지 저장'}</button><button class="ghost small" id="certShare">원본 공유</button></div>`;$('certSave').onclick=()=>isVideo?saveVideoWithOverlay(m,info):saveImageWithOverlay(m,info);$('certShare').onclick=()=>shareMedia(m);}
function drawOverlay(ctx,w,h,info){const pad=Math.max(18,w*0.035),size=Math.max(16,Math.min(34,w*0.045));const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'rgba(0,0,0,.58)');grad.addColorStop(.3,'rgba(0,0,0,0)');grad.addColorStop(.7,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.fillStyle='#d9ff45';ctx.font=`900 ${Math.round(size*.55)}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.letterSpacing='3px';ctx.fillText('GARANG',pad,pad+size*.55);ctx.fillStyle='#d9ff45';ctx.font=`900 ${Math.round(size*.55)}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText(info.title,pad,h-pad-size*1.45);ctx.fillStyle='#fff';ctx.font=`900 ${Math.round(size*1.05)}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText(info.main,pad,h-pad-size*.75);ctx.fillStyle='rgba(235,240,240,.9)';ctx.font=`700 ${Math.round(size*.42)}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText(info.meta.slice(0,120),pad,h-pad);}
async function saveImageWithOverlay(m,info){try{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');const max=2400,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);drawOverlay(ctx,c.width,c.height,info);c.toBlob(async blob=>{if(!blob)return toast('이미지 합성에 실패했어요.');const file=new File([blob],`GARANG_${today()}_VERIFIED.jpg`,{type:'image/jpeg'});await shareOrDownloadBlob(file,blob,'GARANG_'+today()+'_VERIFIED.jpg');},'image/jpeg',.94);};img.onerror=()=>toast('이미지를 읽을 수 없어요.');img.src=m.url;}catch(e){toast('이미지 저장 중 오류가 발생했어요.');}}
async function saveVideoWithOverlay(m,info){
  if(!('MediaRecorder' in window)&&!HTMLCanvasElement.prototype.captureStream)return shareMedia(m);
  try{
    const v=document.createElement('video');v.src=m.url;v.muted=true;v.playsInline=true;await v.play();
    const c=document.createElement('canvas');c.width=v.videoWidth||1280;c.height=v.videoHeight||720;const ctx=c.getContext('2d');const stream=c.captureStream(30);let recorder;
    const mime=['video/mp4;codecs=h264','video/webm;codecs=vp9','video/webm'].find(x=>MediaRecorder.isTypeSupported?.(x))||'';recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);const chunks=[];recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(resolve=>recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||'video/webm'})));recorder.start(250);const draw=()=>{if(v.paused||v.ended){recorder.stop();return;}ctx.drawImage(v,0,0,c.width,c.height);drawOverlay(ctx,c.width,c.height,info);requestAnimationFrame(draw);};draw();v.onended=()=>{try{recorder.stop();}catch{}};const blob=await done;const ext=(blob.type.includes('mp4')?'mp4':'webm');const file=new File([blob],`GARANG_${today()}_VERIFIED.${ext}`,{type:blob.type});await shareOrDownloadBlob(file,blob,file.name);}catch(e){console.warn('video overlay failed',e);toast('이 브라우저에서는 영상 합성이 제한돼 원본 공유로 전환합니다.');await shareMedia(m);}}
async function shareOrDownloadBlob(file,blob,name){try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'GARANG 인증',text:'GARANG FITNESS VERIFIED',files:[file]});toast('공유 창을 열었어요.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('저장을 시작했어요. 모바일에서는 공유 메뉴를 사용할 수 있어요.');}catch(e){if(e?.name!=='AbortError')toast('브라우저 정책상 저장이 제한됩니다. 공유 메뉴를 이용해 주세요.');}}
async function shareMedia(m){try{if(navigator.share&&m.file&&navigator.canShare?.({files:[m.file]})){await navigator.share({title:'GARANG 인증',text:'GARANG FITNESS VERIFIED',files:[m.file]});toast('공유 창을 열었어요.');return;}const a=document.createElement('a');a.href=m.url;a.download=m.name;a.target='_blank';a.rel='noopener';a.click();toast('원본 파일 저장/열기를 시도했어요.');}catch(e){if(e?.name!=='AbortError')toast('공유/저장이 브라우저 정책으로 제한됐어요.');}}
function startRun(){if(runState)return;if(!navigator.geolocation)return toast('이 기기에서는 GPS를 사용할 수 없어요.');runState={started:Date.now(),distance:0,coords:[],watchId:null};$('gpsStatus').textContent='GPS 연결 중…';runState.watchId=navigator.geolocation.watchPosition(pos=>{const p=pos.coords;runState.coords.push([p.latitude,p.longitude,pos.timestamp]);if(runState.coords.length>1){const a=runState.coords.at(-2),b=runState.coords.at(-1);runState.distance+=haversine(a[0],a[1],b[0],b[1]);}updateRoute();updateRunUI();$('gpsStatus').textContent=`GPS 연결 · ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`;},()=>{$('gpsStatus').textContent='GPS 권한 또는 신호를 확인해 주세요.';toast('GPS 권한 또는 위치 신호를 확인해 주세요.');},{enableHighAccuracy:true,maximumAge:1000,timeout:10000});runTimer=setInterval(updateRunUI,1000);toast('GPS 러닝을 시작했어요.');}
function updateRunUI(){if(!runState)return;const sec=Math.floor((Date.now()-runState.started)/1000),min=Math.floor(sec/60),s=String(sec%60).padStart(2,'0');$('runDistance').textContent=runState.distance.toFixed(2);$('runTime').textContent=`${String(min).padStart(2,'0')}:${s}`;$('runPace').textContent=runState.distance>0?(sec/60/runState.distance).toFixed(2):'—';}
function updateRoute(){const line=$('routeLine');if(!line||!runState?.coords.length)return;const pts=runState.coords;if(pts.length<2){line.setAttribute('points','50,50');return;}const lats=pts.map(p=>p[0]),lons=pts.map(p=>p[1]),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),dLat=maxLat-minLat||1e-6,dLon=maxLon-minLon||1e-6;line.setAttribute('points',pts.map(p=>`${8+84*(p[1]-minLon)/dLon},${92-84*(p[0]-minLat)/dLat}`).join(' '));}
function stopRun(){if(!runState)return toast('진행 중인 러닝이 없어요.');if(runState.watchId!=null)navigator.geolocation.clearWatch(runState.watchId);clearInterval(runTimer);const sec=Math.max(1,Math.floor((Date.now()-runState.started)/1000)),duration=sec/60,d=runState.distance,pace=d?duration/d:0,body=safeNumber(state.profile?.weight,67),kcal=Math.round(d*body*1.036);const x={id:uid(),date:today(),distance:d,duration,pace:pace.toFixed(2),kcal,coords:runState.coords};state.runs.push(x);state.memory.events.push({type:'run',date:today(),text:`${d.toFixed(2)}km 러닝 · ${kcal} kcal`});runState=null;saveState();toast(`러닝 저장 완료 · 약 ${kcal} kcal`);render();}
function haversine(a,b,c,d){const R=6371,rad=Math.PI/180,da=(c-a)*rad,db=(d-b)*rad,x=Math.sin(da/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(db/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function relevantKnowledge(q){const terms=String(q).toLowerCase().split(/\s+/).filter(x=>x.length>1).slice(0,8);return knowledge.map(item=>{const text=JSON.stringify(item).toLowerCase();const score=terms.reduce((s,t)=>s+(text.includes(t)?1:0),0);return {item,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.item);}
function askAI(){const q=$('aiQuestion')?.value?.trim();if(!q)return toast('질문을 입력해 주세요.');saveChatMessage('user',q);const a=chatAnswer(q);saveChatMessage('assistant',a);addMemoryFromChat(q,a);render();setTimeout(()=>{const box=$('chatMessages');if(box)box.scrollTop=box.scrollHeight;},30);}
function generateAnswer(q){const lower=q.toLowerCase(),ctx=buildAIContext(),last=state.workouts.at(-1),t=ctx.today.mealTotals,notes=relevantKnowledge(q);let answer='';if(/식단|단백질|먹|영양/.test(lower)){const target=Math.round((state.profile?.weight||67)*1.6),gap=Math.max(0,target-t.protein);answer=`오늘 기록 기준 단백질은 약 ${Math.round(t.protein)}g이야. 최소 목표를 약 ${target}g으로 잡으면 ${Math.round(gap)}g 정도 더 필요해. 오늘 섭취 ${Math.round(t.kcal)} kcal / P ${Math.round(t.protein)}g / C ${Math.round(t.carbs)}g / F ${Math.round(t.fat)}g까지 반영했어.`;}else if(/운동|벤치|스쿼트|데드|강도|rpe/.test(lower)){if(!last)answer='아직 운동 기록이 없어서 정확한 조절은 어려워. 첫 세션을 기록하면 중량·볼륨·RPE를 연결해서 추천할 수 있어.';else{const suggestion=last.rpe>=9?'지난 세션 RPE가 높았으니 같은 중량에서 반복을 확보하거나 총 볼륨을 5~10% 낮추는 쪽이 좋아.':'지난 세션 강도가 관리되고 있어. 폼이 유지된다는 전제에서 2.5kg 증가 또는 1회 반복 증가 중 하나만 선택해.';answer=`최근 ${last.name} ${last.weight}kg × ${last.reps} × ${last.sets}세트, RPE ${last.rpe}, 약 ${Math.round(last.kcal||0)} kcal 기록을 봤어. ${suggestion}`;}}else if(/최근|상태|분석|어때/.test(lower))answer=`현재 GARANG 상태: 오늘 운동 ${ctx.today.workouts.length}개, 식사 ${dayMeals().length}개, 러닝 ${ctx.today.runs.length}개. 오늘 섭취 ${Math.round(t.kcal)} kcal, 단백질 ${Math.round(t.protein)}g, 운동 소모 약 ${Math.round(ctx.today.workoutKcal)} kcal야.`;else answer=`현재 ${state.workouts.length}개 운동 기록, ${state.meals.length}개 식사 기록, ${state.runs.length}개 러닝 기록을 같은 사용자 상태로 연결해 보고 있어. 질문을 운동·식단·러닝 중 하나로 구체화하면 더 정확하게 답할 수 있어.`;if(notes.length)answer+=`\n\n[관련 로컬 지식 ${notes.length}개를 참고함]`;return answer;}
function saveProfile(){state.profile={name:$('pName').value.trim()||'GARANG 사용자',age:safeNumber($('pAge').value),height:safeNumber($('pHeight').value),weight:safeNumber($('pWeight').value),goal:$('pGoal').value.trim()||'퍼포먼스 향상'};saveState();toast('프로필을 저장했어요.');render();}
async function boot(){loadState();await loadDB();bindAuth();nav();initFirebase();if(localStorage.getItem('garang_demo'))showApp();else if(!firebaseReady)showAuth();}
boot();
setTimeout(schedulePlannerNotifications,1200);
})();
