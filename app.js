const EMPTY_DB={profile:{},workouts:[],meals:[],body:[],chat:[],api:{}};
const KEY="fitmind_v2";
let foodDB=[];
let exerciseDB=[];
let aiKnowledge={rules:[],sft:[]};
const baseFoodDB=[
  {name:"흰밥",serving:"1공기(200g)",kcal:300,protein:5.4,carbs:66,fat:.6},
  {name:"현미밥",serving:"1공기(200g)",kcal:300,protein:6,carbs:64,fat:2.2},
  {name:"김치찌개",serving:"1인분",kcal:300,protein:17,carbs:12,fat:18},
  {name:"된장찌개",serving:"1인분",kcal:200,protein:15,carbs:14,fat:9},
  {name:"삼겹살",serving:"100g",kcal:330,protein:17,carbs:0,fat:28},
  {name:"닭가슴살",serving:"100g",kcal:165,protein:31,carbs:0,fat:3.6},
  {name:"계란",serving:"1개",kcal:70,protein:6.3,carbs:.4,fat:4.8},
  {name:"두부",serving:"100g",kcal:80,protein:8,carbs:2,fat:4.5},
  {name:"고등어",serving:"100g",kcal:190,protein:20,carbs:0,fat:12},
  {name:"연어",serving:"100g",kcal:208,protein:20,carbs:0,fat:13},
  {name:"바나나",serving:"1개",kcal:105,protein:1.3,carbs:27,fat:.4},
  {name:"사과",serving:"1개",kcal:95,protein:.5,carbs:25,fat:.3},
  {name:"고구마",serving:"100g",kcal:130,protein:1.6,carbs:30,fat:.1},
  {name:"라면",serving:"1봉",kcal:500,protein:10,carbs:65,fat:20},
  {name:"김치",serving:"100g",kcal:30,protein:2,carbs:4,fat:.5},
  {name:"우유",serving:"200ml",kcal:125,protein:6.5,carbs:9.5,fat:6.5},
  {name:"그릭요거트",serving:"100g",kcal:100,protein:10,carbs:4,fat:4},
  {name:"오트밀",serving:"40g",kcal:150,protein:5,carbs:27,fat:3},
  {name:"프로틴 쉐이크",serving:"1회",kcal:120,protein:24,carbs:4,fat:2}
];

let db=JSON.parse(localStorage.getItem(KEY)||JSON.stringify(EMPTY_DB));
let reportPeriod="week";
let reportCursor=new Date();
reportCursor.setHours(0,0,0,0);
let selectedReportDate=new Date();
selectedReportDate.setHours(0,0,0,0);

const firebaseConfig={apiKey:"AIzaSyDq9kU2_tXyb8DKMxezdm7jwr4fvMuOWrE",authDomain:"fitfind-ai.firebaseapp.com",projectId:"fitfind-ai",storageBucket:"fitfind-ai.firebasestorage.app",messagingSenderId:"1025997386401",appId:"1:1025997386401:web:1d63900ff86bb1dcb036e0"};
firebase.initializeApp(firebaseConfig);
const fbAuth=firebase.auth(),fbStore=firebase.firestore();
let currentUser=null,syncTimer=null;

const cloneEmpty=()=>JSON.parse(JSON.stringify(EMPTY_DB));
const localKey=uid=>`fitmind_v2_${uid}`;



function fitmindBodyHistory(){
  const arr = db.bodyHistory || db.bodyChecks || db.inbody || [];
  return Array.isArray(arr) ? arr : [];
}
function fitmindRenderBodyGraphs(){
  const host=document.getElementById("fitmindBodyGraphs");
  if(!host) return;
  const rows=fitmindBodyHistory().slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  const series=[
    ["체중","weight","kg"],["골격근량","skeletalMuscle","kg"],["체지방률","bodyFatPercent","%"]
  ];
  host.innerHTML=series.map(([label,key,unit])=>{
    const vals=rows.map(r=>Number(r[key] ?? r.bodyFat ?? r.body_fat)).filter(Number.isFinite);
    if(!vals.length) return `<div class="card"><b>${label}</b><div class="muted">측정 데이터를 입력하면 그래프가 표시됩니다.</div></div>`;
    const min=Math.min(...vals), max=Math.max(...vals), range=max-min||1;
    const points=vals.map((v,i)=>{
      const x=6+(i*88/Math.max(vals.length-1,1));
      const y=90-(v-min)/range*70;
      return `${x},${y}`;
    }).join(" ");
    return `<div class="card"><b>${label}</b><div class="muted">${min.toFixed(1)}–${max.toFixed(1)} ${unit}</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:130px;margin-top:8px">
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg></div>`;
  }).join("");
}

function fitmindGetUserWeight(){
  const candidates = [
    db.profile?.weight, db.user?.weight, db.settings?.weight,
    db.body?.weight, window.userWeight
  ];
  for(const x of candidates){
    const n=Number(x);
    if(Number.isFinite(n)&&n>0) return n;
  }
  return 70;
}
function fitmindMET(workout){
  const n=Number(workout?.met ?? workout?.met_default ?? workout?.MET);
  return Number.isFinite(n)&&n>0 ? n : 5.0;
}
function fitmindCalcExerciseCalories(workout){
  const weight=fitmindGetUserWeight();
  const minutes=Number(workout?.durationMin ?? workout?.duration ?? workout?.minutes ?? 0);
  if(minutes<=0) return 0;
  let met=fitmindMET(workout);
  const rpe=Number(workout?.rpe);
  if(Number.isFinite(rpe)&&rpe>=1){
    met *= Math.max(0.85, Math.min(1.20, 0.85 + (rpe-1)*0.035));
  }
  return met*3.5*weight/200*minutes;
}

function updateWorkoutCalorieUI(){
  try{
    const today=typeof isoToday==="function"?isoToday():new Date().toISOString().slice(0,10);
    const workouts=(db.workouts||[]).filter(w=>w.date===today);
    let calories=0, minutes=0;
    workouts.forEach(w=>{
      const c=Number(w.calories);
      const calc=Number.isFinite(c)&&c>0?c:fitmindCalcExerciseCalories(w);
      calories += calc; minutes += Number(w.durationMin||w.duration||0);
    });
    const kcal=Math.round(calories);
    const a=document.getElementById("todayWorkoutCalories");
    const b=document.getElementById("todayWorkoutCalorieMeta");
    if(a)a.textContent=kcal.toLocaleString()+" kcal";
    if(b)b.textContent="운동시간 "+minutes+"분 · 체중/MET/RPE 기반 추정치";
    const intake=(db.meals||[]).filter(m=>m.date===today).reduce((s,m)=>s+(Number(m.calories)||0),0);
    const i=document.getElementById("dailyIntakeKcal"), w=document.getElementById("dailyWorkoutKcal"), n=document.getElementById("dailyNetKcal");
    if(i)i.textContent=Math.round(intake).toLocaleString()+" kcal";
    if(w)w.textContent=kcal.toLocaleString()+" kcal";
    if(n)n.textContent=Math.round(intake-calories).toLocaleString()+" kcal";
    fitmindRenderBodyGraphs();
  }catch(e){console.warn("FitMind calorie/body UI:",e);}
}

function normalizeDB(x){return Object.assign(cloneEmpty(),x||{});}
function saveLocal(){if(currentUser)localStorage.setItem(localKey(currentUser.uid),JSON.stringify(db));}
function save(){saveLocal();queueSync();}
function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncToCloud,800)}
async function syncToCloud(){
 if(!currentUser)return;
 try{await fbStore.collection("users").doc(currentUser.uid).set(db)}catch(e){console.warn("클라우드 동기화 실패",e)}
}
async function loadFromCloud(){
 if(!currentUser)return false;
 try{
  const snap=await fbStore.collection("users").doc(currentUser.uid).get();
  if(snap.exists){db=normalizeDB(snap.data());saveLocal();return true}
  const cached=localStorage.getItem(localKey(currentUser.uid));
  db=normalizeDB(cached?JSON.parse(cached):null);
  saveLocal();
  await syncToCloud();
  return false;
 }catch(e){
  console.warn("클라우드 불러오기 실패",e);
  const cached=localStorage.getItem(localKey(currentUser.uid));
  db=normalizeDB(cached?JSON.parse(cached):null);
  return false;
 }
}

function setAuthTab(t){
 document.querySelectorAll("#authTabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
 loginForm.hidden=t!=="login";signupForm.hidden=t!=="signup";authError.textContent="";
}
function authErrorMsg(err){
 const m={
  "auth/email-already-in-use":"이미 가입된 이메일입니다.",
  "auth/invalid-email":"이메일 형식이 올바르지 않습니다.",
  "auth/weak-password":"비밀번호는 6자 이상이어야 합니다.",
  "auth/wrong-password":"비밀번호가 올바르지 않습니다.",
  "auth/user-not-found":"가입되지 않은 이메일입니다.",
  "auth/popup-closed-by-user":"로그인 창이 닫혔습니다.",
  "auth/invalid-credential":"이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/operation-not-allowed":"Firebase 콘솔에서 이메일/비밀번호 로그인 방식이 활성화되어 있지 않습니다.",
  "auth/popup-blocked":"브라우저가 로그인 창을 차단했습니다. Safari 설정을 확인해 주세요.",
  "auth/network-request-failed":"네트워크 연결을 확인해 주세요.",
  "auth/too-many-requests":"잠시 후 다시 시도해 주세요."
 };
 return m[err.code]||`로그인 처리 중 오류가 발생했습니다. (${err.code||"unknown"})`;
}

loginForm.onsubmit=async e=>{
 e.preventDefault();authError.textContent="";
 try{await fbAuth.signInWithEmailAndPassword(loginEmail.value.trim(),loginPw.value)}
 catch(err){authError.textContent=authErrorMsg(err)}
};
signupForm.onsubmit=async e=>{
 e.preventDefault();authError.textContent="";
 if(signupPw.value!==signupPw2.value){authError.textContent="비밀번호가 서로 다릅니다.";return}
 try{
  const cred=await fbAuth.createUserWithEmailAndPassword(signupEmail.value.trim(),signupPw.value);
  db=cloneEmpty();
  db.profile.name=signupName.value.trim();
  await fbStore.collection("users").doc(cred.user.uid).set(db);
  localStorage.setItem(localKey(cred.user.uid),JSON.stringify(db));
 }catch(err){authError.textContent=authErrorMsg(err)}
};
resetPwBtn.onclick=async()=>{
 const email=loginEmail.value.trim();
 if(!email){authError.textContent="비밀번호 재설정 이메일을 받을 이메일 주소를 먼저 입력해 주세요.";return}
 try{await fbAuth.sendPasswordResetEmail(email);authError.textContent="비밀번호 재설정 이메일을 보냈습니다. 받은편지함을 확인해 주세요."}
 catch(err){authError.textContent=authErrorMsg(err)}
};
googleBtn.onclick=async()=>{
 authError.textContent="";
 try{await fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}
 catch(err){authError.textContent=authErrorMsg(err)}
};
async function logout(){
 try{await fbAuth.signOut();authError.textContent=""}catch(e){alert("로그아웃에 실패했습니다. 다시 시도해 주세요.")}
}
async function deleteAccount(){
 if(!currentUser)return;
 if(!confirm("계정을 삭제하면 저장된 클라우드 기록도 함께 삭제됩니다. 정말 삭제할까요?"))return;
 try{
  await fbStore.collection("users").doc(currentUser.uid).delete();
  await currentUser.delete();
  localStorage.removeItem(localKey(currentUser.uid));
 }catch(err){
  if(err.code==="auth/requires-recent-login")alert("보안을 위해 다시 로그인한 후 계정 삭제를 진행해 주세요.");
  else alert(authErrorMsg(err));
 }
}

function fillProfileForm(){
 const p=db.profile||{};
 profName.value=p.name||"";profGender.value=p.gender||"";profAge.value=p.age||"";profHeight.value=p.height||"";
 profWeight.value=p.weight||"";profTargetWeight.value=p.targetWeight||"";profActivity.value=p.activity||"";
 profGoal.value=p.goal||"";profExperience.value=p.experience||"";
 accountEmail.textContent=currentUser?currentUser.email||"Google 계정":"";
}
profileForm.onsubmit=e=>{
 e.preventDefault();
 db.profile={
  name:profName.value.trim(),gender:profGender.value,age:+profAge.value||0,height:+profHeight.value||0,
  weight:+profWeight.value||0,targetWeight:+profTargetWeight.value||0,activity:profActivity.value,
  goal:profGoal.value.trim(),experience:profExperience.value
 };
 if(db.profile.weight&&!db.body.length)db.body.push({weight:db.profile.weight,waist:0,note:"가입 프로필 체중",date:isoToday(),photo:""});
 save();accountBtn.textContent=db.profile.name?db.profile.name+"님":"내정보";openPage("dashboard");
};

fbAuth.onAuthStateChanged(async user=>{
 currentUser=user;
 accountBtn.hidden=!user;mainNav.classList.toggle("hidden",!user);
 if(user){
  await loadFromCloud();
  accountBtn.textContent=db.profile.name?db.profile.name+"님":"내정보";
  openPage(db.profile&&db.profile.name?"dashboard":"profile");
  fillProfileForm();
 }else{
  db=cloneEmpty();
  openPage("auth");
 }
});

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function openPage(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));const page=document.getElementById(id);if(page)page.classList.add("active");if(id==="body")fitmindInitBodyCheck();render();if(id==="body"){fitmindRenderBodyScore();fitmindRenderBodyGraphs(0);fitmindRenderBodyHistory();fitmindCalculateEnergy();}scrollTo(0,0)}
function isoToday(){return new Date().toISOString().slice(0,10)}
function dateObj(s){if(!s)return null;const d=new Date(s);return isNaN(d)?null:d}
function fmtDate(s){const d=dateObj(s);return d?`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`:String(s||"")}
function sameDay(a,b){return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}

function migrateDates(){
 [...db.workouts,...db.meals,...db.body,...db.chat].forEach(x=>{
  if(x.date&&/^\d{4}\.\s?\d{1,2}\.\s?\d{1,2}\./.test(x.date)){
   const m=x.date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);if(m)x.date=`${m[1]}-${String(+m[2]).padStart(2,"0")}-${String(+m[3]).padStart(2,"0")}`;
  }
 });
}
migrateDates();
db.workouts=(db.workouts||[]).map(w=>{if(w.calories==null)w.calories=estimateWorkoutCalories(w);if(w.volume==null)w.volume=workoutVolume(w);return w;});

function render(){
 const lastBody=db.body.at(-1);
 dashWeight.textContent=lastBody?.weight??"-";dashWorkout.textContent=db.workouts.length;dashMeals.textContent=db.meals.length;dashStreak.textContent=calcStreak();
 coachTip.textContent=localCoach();
 workoutList.innerHTML=db.workouts.slice().reverse().map(x=>`<div class="item"><strong>${esc(x.exercise)}</strong> ${x.sets}세트 × ${x.reps}회 ${x.weight?`× ${x.weight}kg`:""}<br><small>${x.volume?`볼륨 ${Math.round(x.volume).toLocaleString()}kg · `:""}${x.durationMin?`${x.durationMin}분 · `:""}${x.calories?`소모 약 ${Math.round(x.calories)}kcal · `:""}${x.rpe?`RPE ${x.rpe} · `:""}${fmtDate(x.date)} · ${esc(x.note)}</small></div>`).join("")||"<div class='card'>아직 운동 기록이 없습니다.</div>";
 mealList.innerHTML=db.meals.slice().reverse().map(x=>`<div class="item"><strong>${esc(x.meal)}</strong>${x.calories||0} kcal · 단백질 ${x.protein||0}g · 탄수화물 ${x.carbs||0}g · 지방 ${x.fat||0}g<br><small>${x.mealType?esc(x.mealType)+" · ":""}${x.servings?`${x.servings}${x.unit||"회"} · `:""}${fmtDate(x.date)} · ${esc(x.note)}</small></div>`).join("")||"<div class='card'>아직 식단 기록이 없습니다.</div>";
 renderTodayNutrition();
 bodyList.innerHTML=db.body.slice().reverse().map(x=>`<div class="item"><strong>${x.weight||"-"}kg ${x.waist?`· 허리 ${x.waist}cm`:""}</strong><small>${fmtDate(x.date)} · ${esc(x.note)}</small></div>`).join("")||"<div class='card'>아직 바디체크 기록이 없습니다.</div>";
 renderFoodList();report();chatRender();
}
function localCoach(){
 const nm=db.profile?.name?`${db.profile.name}님, `:"",goal=db.profile?.goal?` (목표: ${db.profile.goal})`:"";
 if(!db.workouts.length&&!db.meals.length)return `${nm}오늘 운동과 첫 식단을 기록해 주세요. 데이터가 쌓일수록 코칭이 개인화됩니다.${goal}`;
 const w=db.workouts.at(-1),b=db.body.at(-1);
 if(b?.weight)return `${nm}최근 체중 ${b.weight}kg 기준으로 오늘 운동을 기록해 보세요. 최근 운동은 ${w?w.exercise:"없음"}입니다.${goal}`;
 return `${nm}최근 운동과 식단을 계속 기록해 주세요. 기록 패턴을 바탕으로 다음 운동과 식단을 조정할 수 있어요.${goal}`;
}
function calcStreak(){
 const days=new Set([...db.workouts,...db.meals,...db.body].map(x=>x.date));
 let d=new Date();d.setHours(0,0,0,0);let n=0;
 while(days.has(dateKey(d))){n++;d.setDate(d.getDate()-1)}
 return n;
}


function currentBodyWeight(){
  return Number(db.body.at(-1)?.weight || db.profile?.weight || 0);
}
function estimateWorkoutCalories(workout){
  const weight = Number(workout.bodyWeight || currentBodyWeight() || 0);
  const minutes = Number(workout.durationMin || 0);
  const ex = exerciseDB.find(x=>x.exercise_id===workout.exerciseId);
  let met = Number(workout.met || ex?.met_default || 5);
  const rpe = Number(workout.rpe || 0);
  if(rpe >= 9) met *= 1.15;
  else if(rpe >= 8) met *= 1.08;
  else if(rpe >= 7) met *= 1.03;
  else if(rpe > 0 && rpe <= 4) met *= 0.85;
  if(!weight || !minutes) return 0;
  return met * 3.5 * weight / 200 * minutes;
}
function workoutVolume(w){
  return (Number(w.weight)||0) * (Number(w.reps)||0) * (Number(w.sets)||0);
}

function exerciseTokens(x){return [x.exercise_name,...(x.aliases||[])].map(v=>String(v||"").toLowerCase().trim()).filter(Boolean)}
function searchExercises(q){
 q=String(q||"").toLowerCase().trim();
 if(!q)return [];
 return exerciseDB.filter(x=>exerciseTokens(x).some(v=>v.includes(q)||q.includes(v))).slice(0,8);
}
function renderExerciseSearch(){
 const box=document.getElementById("exerciseSearchResults"); if(!box)return;
 const q=exercise.value.trim(); if(!q){box.innerHTML="";box.hidden=true;return;}
 const rs=searchExercises(q); box.hidden=false;
 box.innerHTML=rs.length?rs.map(x=>`<button type="button" class="foodResult" onclick="selectExercise('${String(x.exercise_id).replace(/'/g,"\\'")}')"><strong>${esc(x.exercise_name)}</strong><small>${esc(x.primary_muscle||"")} · ${esc(x.equipment||"")}</small></button>`).join(""):`<div class="foodEmpty">검색 결과가 없습니다. 직접 입력할 수 있어요.</div>`;
}
function selectExercise(id){
 const x=exerciseDB.find(v=>v.exercise_id===id); if(!x)return;
 exercise.value=x.exercise_name;
 if(x.default_sets)sets.value=x.default_sets;
 if(x.default_reps)reps.value=x.default_reps;
 document.getElementById("exerciseSearchResults").hidden=true;
}
exercise.addEventListener("input",renderExerciseSearch);
document.addEventListener("click",e=>{const w=document.querySelector(".exerciseSearchWrap");if(w&&!w.contains(e.target)){const b=document.getElementById("exerciseSearchResults");if(b)b.hidden=true;}});

workoutForm.onsubmit=e=>{
 e.preventDefault();
 const ex=exerciseDB.find(x=>x.exercise_name===exercise.value.trim());
 const w={exercise:exercise.value.trim(),exerciseId:ex?.exercise_id||null,primaryMuscle:ex?.primary_muscle||"",sets:+sets.value,reps:+reps.value,weight:+weight.value||0,durationMin:+duration.value||0,rpe:+rpe.value||0,bodyWeight:currentBodyWeight(),note:workoutNote.value.trim(),date:isoToday()};w.volume=workoutVolume(w);w.calories=estimateWorkoutCalories(w);db.workouts.push(w);
updateWorkoutCalorieUI();
 save();e.target.reset();render()
};

function foodTokens(f){
 const vals=[f.name,...(f.aliases||[])].map(x=>String(x||"").toLowerCase().trim());
 return vals.filter(Boolean);
}
function findFood(name){
 const q=String(name||"").toLowerCase().trim();
 if(!q)return null;
 return foodDB.find(f=>foodTokens(f).includes(q)) ||
        foodDB.find(f=>foodTokens(f).some(x=>x.includes(q)||q.includes(x)));
}
function searchFoods(name){
 const q=String(name||"").toLowerCase().trim();
 if(!q)return [];
 return foodDB.filter(f=>foodTokens(f).some(x=>x.includes(q)||q.includes(x))).slice(0,8);
}
function fmtN(v){
 return v==null||Number.isNaN(Number(v))?"-":Number(v).toFixed(Number(v)%1?1:0);
}
function renderFoodSearch(){
 const box=document.getElementById("foodSearchResults");
 if(!box)return;
 const q=meal.value.trim();
 const results=searchFoods(q);
 if(!q){box.innerHTML="";box.hidden=true;return}
 box.hidden=false;
 box.innerHTML=results.length?results.map(f=>`
   <button type="button" class="foodResult" onclick="selectFood('${String(f.food_id).replace(/'/g,"\\'")}')">
     <strong>${esc(f.name)}</strong>
     <small>${esc(f.category||"")} · ${f.kcal!=null?fmtN(f.kcal)+" kcal / 100g":"영양정보 매핑 필요"}</small>
   </button>`).join(""):`<div class="foodEmpty">검색 결과가 없습니다. 음식명을 직접 입력할 수 있어요.</div>`;
}
function selectFood(id){
 const f=foodDB.find(x=>x.food_id===id);if(!f)return;
 meal.value=f.name;window.selectedFoodId=f.food_id;
 const card=document.getElementById("selectedFoodCard");
 card.hidden=false;
 card.innerHTML=`<div><strong>${esc(f.name)}</strong><span>${esc(f.category||"")}</span></div><div class="foodMacros">${f.kcal!=null?`${fmtN(f.kcal)} kcal`:"영양정보 준비중"} · 단백질 ${f.protein!=null?fmtN(f.protein)+"g":"-"} · 탄수 ${f.carbs!=null?fmtN(f.carbs)+"g":"-"} · 지방 ${f.fat!=null?fmtN(f.fat)+"g":"-"}</div><small class="muted">${esc(f.nutrition_status||"영양정보 확인 필요")} · 기준 ${f.nutrition_basis_g||100}g</small>`;
 document.getElementById("foodSearchResults").hidden=true;
 applyFoodDefaults();
}
function applyFoodDefaults(){
 const f=window.selectedFoodId?foodDB.find(x=>x.food_id===window.selectedFoodId):findFood(meal.value);
 const q=Math.max(.1,+servingsEl?.value||1);
 if(!f){
   foodHintEl.textContent="음식을 선택하면 DB 데이터를 자동으로 불러옵니다.";
   updateNutritionPreview(null);return;
 }
 window.selectedFoodId=f.food_id;
 const hasNutrition=f.kcal!=null&&f.protein!=null&&f.carbs!=null&&f.fat!=null;
 if(hasNutrition){
   caloriesEl.value=Math.round(f.kcal*q);
   proteinEl.value=(f.protein*q).toFixed(1);
   carbsEl.value=(f.carbs*q).toFixed(1);
   fatEl.value=(f.fat*q).toFixed(1);
   foodHintEl.textContent=`${f.name} · 100g 기준 영양정보 · 섭취량 ${q}${servingUnitEl?.value}`;
   updateNutritionPreview({kcal:+caloriesEl.value,protein:+proteinEl.value,carbs:+carbsEl.value,fat:+fatEl.value});
 }else{
   caloriesEl.value="";proteinEl.value="";carbsEl.value="";fatEl.value="";
   foodHintEl.textContent=`${f.name}은(는) 음식 DB에 등록되어 있지만 공식 영양성분 매핑이 아직 필요합니다. 직접 입력할 수 있습니다.`;
   updateNutritionPreview(null);
 }
}
function updateNutritionPreview(n){
 previewKcalEl.textContent=n?fmtN(n.kcal):"-";previewProteinEl.textContent=n?fmtN(n.protein):"-";
 previewCarbsEl.textContent=n?fmtN(n.carbs):"-";previewFatEl.textContent=n?fmtN(n.fat):"-";
}
function renderTodayNutrition(){
 const k=isoToday(), rows=db.meals.filter(x=>x.date===k);
 const totals=rows.reduce((a,x)=>({kcal:a.kcal+(+x.calories||0),protein:a.protein+(+x.protein||0),carbs:a.carbs+(+x.carbs||0),fat:a.fat+(+x.fat||0)}),{kcal:0,protein:0,carbs:0,fat:0});
 todayNutritionEl.innerHTML=`
 <div><span>칼로리</span><b>${Math.round(totals.kcal)}</b><small>kcal</small></div>
 <div><span>단백질</span><b>${totals.protein.toFixed(1)}</b><small>g</small></div>
 <div><span>탄수</span><b>${totals.carbs.toFixed(1)}</b><small>g</small></div>
 <div><span>지방</span><b>${totals.fat.toFixed(1)}</b><small>g</small></div>`;
}
const mealFormEl=document.getElementById("mealForm");
const mealEl=document.getElementById("meal");
const servingsEl=document.getElementById("servings");
const servingUnitEl=document.getElementById("servingUnit");
const mealTypeEl=document.getElementById("mealType");
const caloriesEl=document.getElementById("calories");
const proteinEl=document.getElementById("protein");
const carbsEl=document.getElementById("carbs");
const fatEl=document.getElementById("fat");
const mealNoteEl=document.getElementById("mealNote");
const foodHintEl=document.getElementById("foodHint");
const selectedFoodCardEl=document.getElementById("selectedFoodCard");
const foodSearchResultsEl=document.getElementById("foodSearchResults");
const todayNutritionEl=document.getElementById("todayNutrition");
const previewKcalEl=document.getElementById("previewKcal");
const previewProteinEl=document.getElementById("previewProtein");
const previewCarbsEl=document.getElementById("previewCarbs");
const previewFatEl=document.getElementById("previewFat");

mealEl?.addEventListener("input",()=>{window.selectedFoodId=null;renderFoodSearch();applyFoodDefaults()});
servingsEl?.addEventListener("input",applyFoodDefaults);
servingUnitEl?.addEventListener("change",applyFoodDefaults);
document.addEventListener("click",e=>{
 const wrap=document.querySelector(".foodSearchWrap");
 if(wrap&&!wrap.contains(e.target)&&foodSearchResultsEl)foodSearchResultsEl.hidden=true;
});
if(mealFormEl) mealFormEl.onsubmit=e=>{
 e.preventDefault();
 const foodName=(mealEl?.value||"").trim();
 const f=window.selectedFoodId?foodDB.find(x=>x.food_id===window.selectedFoodId):findFood(foodName);
 if(!foodName){mealEl?.focus();return;}
 db.meals.push({foodId:f?.food_id||null,meal:foodName,servings:+(servingsEl?.value)||1,unit:servingUnitEl?.value||"g",calories:+(caloriesEl?.value)||0,protein:+(proteinEl?.value)||0,carbs:+(carbsEl?.value)||0,fat:+(fatEl?.value)||0,mealType:(mealTypeEl?.value||"").trim(),note:(mealNoteEl?.value||"").trim(),date:isoToday()});
 save();
 e.target.reset();
 if(servingsEl)servingsEl.value=1;
 window.selectedFoodId=null;
 if(selectedFoodCardEl)selectedFoodCardEl.hidden=true;
 if(foodSearchResultsEl)foodSearchResultsEl.hidden=true;
 if(foodHintEl)foodHintEl.textContent="음식을 검색하면 DB에서 영양정보를 불러옵니다.";
 updateNutritionPreview(null);
 render();
};

/* ---------- FitMind BodyCheck integrated module ---------- */
function fitmindNum(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function fitmindBodyRows(){
  if(!Array.isArray(db.body)) db.body=[];
  return db.body;
}
function fitmindGetProfileValue(keys){
  for(const k of keys){
    const v=db.profile?.[k] ?? db.user?.[k] ?? db.settings?.[k];
    if(v!==undefined&&v!==null&&v!=="") return v;
  }
  return null;
}
function fitmindBodyScore(row,prev){
  const bf=fitmindNum(row.bodyFatPercent), sm=fitmindNum(row.skeletalMuscle);
  const muscle=sm===null?75:Math.max(55,Math.min(98,70+(sm-30)*4));
  const fat=bf===null?75:Math.max(50,Math.min(98,95-Math.abs(bf-13)*2.3));
  let trend=80;
  if(prev){
    const pbf=fitmindNum(prev.bodyFatPercent), psm=fitmindNum(prev.skeletalMuscle);
    if(bf!==null&&pbf!==null) trend+=(pbf-bf)*4;
    if(sm!==null&&psm!==null) trend+=(sm-psm)*8;
  }
  trend=Math.round(Math.max(50,Math.min(100,trend)));
  return {muscle:Math.round(muscle),fat:Math.round(fat),trend,total:Math.round((muscle+fat+trend)/3)};
}
function fitmindBodyGrade(s){
  return s>=90?"🟢 매우 우수":s>=80?"🟢 우수":s>=70?"🟡 양호":s>=60?"🟠 개선 권장":"🔴 관리 필요";
}
function fitmindBodyEvaluation(row,prev){
  if(!prev)return "첫 측정값이 저장되었습니다. 다음 측정부터 변화 추세를 분석합니다.";
  const out=[],bf=fitmindNum(row.bodyFatPercent),pbf=fitmindNum(prev.bodyFatPercent),sm=fitmindNum(row.skeletalMuscle),psm=fitmindNum(prev.skeletalMuscle);
  if(bf!==null&&pbf!==null)out.push(bf<pbf-0.2?"체지방률이 감소하고 있습니다.":bf>pbf+0.2?"체지방률이 증가했습니다.":"체지방률이 안정적으로 유지되고 있습니다.");
  if(sm!==null&&psm!==null)out.push(sm>psm+0.2?"골격근량이 증가했습니다.":sm<psm-0.2?"골격근량이 감소했습니다.":"골격근량이 안정적으로 유지되고 있습니다.");
  return out.join(" ");
}
function fitmindRenderBodyScore(){
  const rows=fitmindBodyRows().slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))),cur=rows.at(-1),prev=rows.at(-2);
  const n=document.getElementById("bodyScoreNumber");
  if(!cur){if(n)n.textContent="—";return;}
  const r=fitmindBodyScore(cur,prev);
  n.textContent=r.total;
  document.getElementById("bodyScoreGrade").textContent=fitmindBodyGrade(r.total);
  document.getElementById("bodyScoreSummary").textContent=fitmindBodyEvaluation(cur,prev);
  document.getElementById("bodyScoreBreakdown").innerHTML=[["골격근량",r.muscle],["체지방률",r.fat],["변화 추세",r.trend],["종합",r.total]].map(x=>`<div class="card"><small>${x[0]}</small><div style="font-size:22px;font-weight:800">${x[1]}</div></div>`).join("");
}
function fitmindRenderBodyGraphs(days=0){
  const host=document.getElementById("fitmindBodyGraphs");if(!host)return;
  const all=fitmindBodyRows().slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const rows=days?all.filter(r=>{const t=Date.parse(r.date);return !Number.isFinite(t)||t>=Date.now()-days*86400000;}):all;
  const series=[["체중","weight","kg"],["골격근량","skeletalMuscle","kg"],["체지방률","bodyFatPercent","%"],["체지방량","bodyFatMass","kg"]];
  host.innerHTML=series.map(([label,key,unit])=>{
    const ds=rows.map(r=>({d:r.date,v:fitmindNum(r[key])})).filter(x=>x.v!==null);
    if(!ds.length)return `<div class="card"><b>📈 ${label}</b><div class="muted">측정 데이터 없음</div></div>`;
    const vals=ds.map(x=>x.v),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
    const pts=ds.map((x,i)=>`${6+88*i/Math.max(1,ds.length-1)},${88-68*(x.v-min)/range}`).join(" ");
    return `<div class="card"><b>📈 ${label}</b><div style="font-size:23px;font-weight:800">${ds.at(-1).v.toFixed(1)} ${unit}</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:120px"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5"/></svg><div class="muted">${ds[0].d} → ${ds.at(-1).d}</div></div>`;
  }).join("");
}
function fitmindRenderBodyHistory(){
  const host=document.getElementById("fitmindBodyHistory");if(!host)return;
  const rows=fitmindBodyRows().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  host.innerHTML=rows.length?`<div class="card"><h3>측정 기록</h3>${rows.map(r=>`<div style="padding:9px 0;border-bottom:1px solid rgba(128,128,128,.2)">${r.date} · ${r.weight??"-"}kg · ${r.bodyFatPercent??"-"}% · ${r.skeletalMuscle??"-"}kg · 체지방량 ${r.bodyFatMass??"-"}kg</div>`).join("")}</div>`:"";
}
function fitmindCalculateEnergy(){
  const weight=fitmindNum(document.getElementById("bodyWeight")?.value),bf=fitmindNum(document.getElementById("bodyFatPercent")?.value);
  const activity=Number(document.getElementById("bodyActivity")?.value||1.55);
  const age=fitmindNum(fitmindGetProfileValue(["age"])),height=fitmindNum(fitmindGetProfileValue(["height","heightCm"]));
  const sex=String(fitmindGetProfileValue(["sex","gender"])||"male").toLowerCase();
  let bmr=null,method="";
  if(weight!==null&&bf!==null&&bf>=2&&bf<60){bmr=370+21.6*(weight*(1-bf/100));method="Katch-McArdle · 체중+체지방률";}
  else if(weight!==null&&height!==null&&age!==null){bmr=(sex.includes("female")||sex.includes("여"))?10*weight+6.25*height-5*age-161:10*weight+6.25*height-5*age+5;method="Mifflin-St Jeor · 프로필+체중";}
  const b=document.getElementById("fitmindBMRResult"),t=document.getElementById("fitmindTDEEResult"),n=document.getElementById("fitmindCalorieNote");
  if(bmr===null){if(b)b.textContent="—";if(t)t.textContent="—";if(n)n.textContent="체중을 입력해주세요. 체지방률까지 입력하면 바로 BMR을 계산합니다.";return;}
  if(b)b.textContent=Math.round(bmr).toLocaleString()+" kcal";
  if(t)t.textContent=Math.round(bmr*activity).toLocaleString()+" kcal";
  if(n)n.textContent=`${method} · 활동계수 ${activity}`;
}
function fitmindRenderBodyPhotos(){
  const host=document.getElementById("bodyPhotoGallery");if(!host)return;
  let photos=[];try{photos=JSON.parse(localStorage.getItem("fitmind_body_photos")||"[]")}catch(e){}
  host.innerHTML=photos.length?photos.map((p,i)=>`<div style="position:relative"><img src="${p.data}" alt="바디체크 ${p.date}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;cursor:pointer" onclick="fitmindOpenBodyPhoto(${i})"><button type="button" onclick="fitmindDeleteBodyPhoto(${i})" style="position:absolute;right:4px;top:4px;border:0;border-radius:50%;width:26px;height:26px">×</button><small>${p.date}</small></div>`).join(""):'<div class="muted">아직 저장된 사진이 없습니다.</div>';
}
function fitmindOpenBodyPhoto(i){
  let photos=[];try{photos=JSON.parse(localStorage.getItem("fitmind_body_photos")||"[]")}catch(e){}
  const p=photos[i];if(!p)return;
  const w=window.open("","_blank");if(w)w.document.write(`<title>FitMind 바디체크</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center"><img src="${p.data}" style="max-width:100%;max-height:100vh;object-fit:contain"></body>`);
}
function fitmindDeleteBodyPhoto(i){
  let photos=[];try{photos=JSON.parse(localStorage.getItem("fitmind_body_photos")||"[]")}catch(e){}
  photos.splice(i,1);localStorage.setItem("fitmind_body_photos",JSON.stringify(photos));fitmindRenderBodyPhotos();
}
async function fitmindSaveBodyPhotos(files){
  let photos=[];try{photos=JSON.parse(localStorage.getItem("fitmind_body_photos")||"[]")}catch(e){}
  for(const file of files){
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
    photos.push({date:isoToday(),name:file.name,data});
  }
  localStorage.setItem("fitmind_body_photos",JSON.stringify(photos));fitmindRenderBodyPhotos();
}
function fitmindSaveBodyData(){
  const row={date:document.getElementById("bodyDate").value||isoToday(),weight:fitmindNum(document.getElementById("bodyWeight").value),bodyFatPercent:fitmindNum(document.getElementById("bodyFatPercent").value),skeletalMuscle:fitmindNum(document.getElementById("bodySkeletalMuscle").value),bodyFatMass:fitmindNum(document.getElementById("bodyFatMass").value),waist:fitmindNum(document.getElementById("bodyWaist").value)};
  if([row.weight,row.bodyFatPercent,row.skeletalMuscle,row.bodyFatMass,row.waist].every(v=>v===null)){alert("신체 데이터 중 하나 이상 입력해주세요.");return;}
  const rows=fitmindBodyRows(),i=rows.findIndex(x=>x.date===row.date);
  if(i>=0)rows[i]={...rows[i],...row};else rows.push(row);
  save();
  document.getElementById("bodySaveStatus").textContent=`${row.date} 측정값이 저장되었습니다.`;
  fitmindRenderBodyScore();fitmindRenderBodyGraphs(0);fitmindRenderBodyHistory();fitmindCalculateEnergy();render();
}
function fitmindInitBodyCheck(){
  const d=document.getElementById("bodyDate");if(d&&!d.value)d.value=isoToday();
  const saveBtn=document.getElementById("saveBodyDataBtn");if(saveBtn&&!saveBtn.dataset.bound){saveBtn.dataset.bound="1";saveBtn.addEventListener("click",fitmindSaveBodyData);}
  const photo=document.getElementById("bodyPhotoInput");if(photo&&!photo.dataset.bound){photo.dataset.bound="1";photo.addEventListener("change",e=>fitmindSaveBodyPhotos([...e.target.files]));}
  const act=document.getElementById("bodyActivity");if(act&&!act.dataset.bound){act.dataset.bound="1";act.addEventListener("change",fitmindCalculateEnergy);}
  ["bodyWeight","bodyFatPercent","bodySkeletalMuscle","bodyFatMass"].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.bound){el.dataset.bound="1";el.addEventListener("input",fitmindCalculateEnergy);}});
  document.querySelectorAll(".body-range").forEach(b=>{if(!b.dataset.bound){b.dataset.bound="1";b.addEventListener("click",()=>fitmindRenderBodyGraphs(Number(b.dataset.days)))}});  
  fitmindRenderBodyPhotos();fitmindRenderBodyScore();fitmindRenderBodyGraphs(0);fitmindRenderBodyHistory();fitmindCalculateEnergy();
}

function periodRange(){
 const d=new Date(reportCursor);
 if(reportPeriod==="week"){
  const start=new Date(d);const day=start.getDay();start.setDate(start.getDate()-(day===0?6:day-1));
  const end=new Date(start);end.setDate(end.getDate()+6);return {start,end};
 }
 if(reportPeriod==="month")return {start:new Date(d.getFullYear(),d.getMonth(),1),end:new Date(d.getFullYear(),d.getMonth()+1,0)};
 return {start:new Date(d.getFullYear(),0,1),end:new Date(d.getFullYear(),11,31)};
}
function inRange(x,start,end){const d=dateObj(x.date);return d&&d>=start&&d<=end}
function periodLabel(){return reportPeriod==="week"?"주간":reportPeriod==="month"?"월간":"연간"}
function moveReport(dir){
 if(reportPeriod==="week")reportCursor.setDate(reportCursor.getDate()+dir*7);
 else if(reportPeriod==="month")reportCursor.setMonth(reportCursor.getMonth()+dir);
 else reportCursor.setFullYear(reportCursor.getFullYear()+dir);
 render();
}
function calendarRecords(d){
 const k=dateKey(d);
 return {
  workout:db.workouts.filter(x=>x.date===k).length,
  meal:db.meals.filter(x=>x.date===k).length,
  body:db.body.filter(x=>x.date===k).length
 };
}
function renderCalendar(){
 const box=document.getElementById("calendarBox");
 if(reportPeriod==="year"){
  const y=reportCursor.getFullYear();
  reportTitle.textContent=`${y}년`;
  const months=Array.from({length:12},(_,m)=>{const w=db.workouts.filter(x=>{const d=dateObj(x.date);return d&&d.getFullYear()===y&&d.getMonth()===m}).length;const meals=db.meals.filter(x=>{const d=dateObj(x.date);return d&&d.getFullYear()===y&&d.getMonth()===m}).length;const body=db.body.filter(x=>{const d=dateObj(x.date);return d&&d.getFullYear()===y&&d.getMonth()===m}).length;return `<button class="monthCell" onclick="jumpToMonth(${m})"><b>${m+1}월</b><small>운동 ${w} · 식단 ${meals} · 바디 ${body}</small></button>`}).join("");
  box.innerHTML=`<div class="monthGrid">${months}</div>`;return;
 }
 const r=periodRange();reportTitle.textContent=reportPeriod==="week"?`${r.start.getFullYear()}.${r.start.getMonth()+1}.${r.start.getDate()} ~ ${r.end.getMonth()+1}.${r.end.getDate()}`:`${r.start.getFullYear()}년 ${r.start.getMonth()+1}월`;
 const first=new Date(r.start.getFullYear(),r.start.getMonth(),1),last=new Date(r.end.getFullYear(),r.end.getMonth()+1,0);
 const startDay=first.getDay(),days=last.getDate();
 let cells=["일","월","화","수","목","금","토"].map(x=>`<div class="calHead">${x}</div>`).join("");
 for(let i=0;i<startDay;i++)cells+=`<div class="calBlank"></div>`;
 for(let n=1;n<=days;n++){
  const d=new Date(first.getFullYear(),first.getMonth(),n),rec=calendarRecords(d);
  const active=reportPeriod==="week"?(d>=r.start&&d<=r.end):true;
  cells+=`<button class="calDay ${active?"":"outside"} ${sameDay(d,selectedReportDate)?"selected":""}" onclick="selectReportDate('${dateKey(d)}')"><b>${n}</b><span>${rec.workout?"🏋️":""}${rec.meal?"🥗":""}${rec.body?"⚖️":""}</span></button>`;
 }
 const selected=calendarRecords(selectedReportDate);
 box.innerHTML=`<div class="calendar"><div class="calGrid">${cells}</div><div class="selectedDay card"><b>${fmtDate(dateKey(selectedReportDate))}</b><p>운동 ${selected.workout}회 · 식단 ${selected.meal}건 · 바디체크 ${selected.body}회</p></div></div>`;
}
function selectReportDate(k){selectedReportDate=dateObj(k);reportCursor=new Date(selectedReportDate);render()}
function jumpToMonth(m){reportPeriod="month";reportCursor=new Date(reportCursor.getFullYear(),m,1);render()}
function report(){
 document.querySelectorAll("#reportTabs button").forEach(b=>b.classList.toggle("active",b.dataset.period===reportPeriod));
 const r=periodRange(),s={
  workouts:db.workouts.filter(x=>inRange(x,r.start,r.end)),
  meals:db.meals.filter(x=>inRange(x,r.start,r.end)),
  body:db.body.filter(x=>inRange(x,r.start,r.end))
 };
 const kcal=s.meals.reduce((a,x)=>a+(+x.calories||0),0),protein=s.meals.reduce((a,x)=>a+(+x.protein||0),0);const workoutKcal=s.workouts.reduce((a,x)=>a+(+x.calories||estimateWorkoutCalories(x)),0),volume=s.workouts.reduce((a,x)=>a+(+x.volume||workoutVolume(x)),0),durationMin=s.workouts.reduce((a,x)=>a+(+x.durationMin||0),0);
 const carb=s.meals.reduce((a,x)=>a+(x.carbs||0),0),fat=s.meals.reduce((a,x)=>a+(x.fat||0),0);
 const weightChange=s.body.length>1?s.body.at(-1).weight-s.body[0].weight:null;
 renderCalendar();
 reportContent.innerHTML=`
  <div class="card"><h3>${periodLabel()} 리포트</h3><p class="muted">원하는 기간으로 이동하면서 과거 기록도 확인할 수 있어요.</p></div>
  <div class="grid">
   <div class="card"><span>운동</span><b>${s.workouts.length}</b><small>회</small></div>
   <div class="card"><span>식단</span><b>${s.meals.length}</b><small>기록</small></div>
   <div class="card"><span>바디체크</span><b>${s.body.length}</b><small>회</small></div>
   <div class="card"><span>연속 기록</span><b>${calcStreak()}</b><small>일</small></div>
  </div>
  <div class="card">
   <p>섭취 칼로리 <b>${kcal}</b> kcal · 단백질 <b>${protein.toFixed(1)}</b>g</p>
   <p>탄수화물 <b>${carb.toFixed(1)}</b>g · 지방 <b>${fat.toFixed(1)}</b>g</p><p>운동 소비량 <b>${Math.round(workoutKcal)}</b> kcal · 운동시간 <b>${durationMin}</b>분 · 총 볼륨 <b>${Math.round(volume).toLocaleString()}</b>kg</p>
   <p>${weightChange!==null?`체중 변화: ${s.body[0].weight}kg → ${s.body.at(-1).weight}kg <span class="trend ${weightChange>0?"up":weightChange<0?"down":""}">(${weightChange>0?"+":""}${weightChange.toFixed(1)}kg)</span>`:"이 기간에 바디체크를 2회 이상 기록하면 체중 변화를 볼 수 있어요."}</p>
  </div>`;
}
function setReportPeriod(p){reportPeriod=p;reportCursor=new Date(selectedReportDate);render()}

function exportBackup(){
 let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download=`fitmind-backup-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href)
}
restoreFile.onchange=e=>{
 let r=new FileReader();r.onload=()=>{try{db=normalizeDB(JSON.parse(r.result));save();render();alert("복원 완료")}catch{alert("올바른 백업 파일이 아닙니다.")}};r.readAsText(e.target.files[0])
};
function saveApi(){db.api={url:apiUrl.value.trim(),key:apiKey.value};save();alert("AI 서버 설정을 저장했습니다.")}
async function askAI(text){
 const q=String(text||"").toLowerCase();
 const relevantExercises=exerciseDB.filter(x=>exerciseTokens(x).some(v=>v&&q.includes(v))).slice(0,10);
 const relevantFoods=foodDB.filter(f=>foodTokens(f).some(v=>v&&q.includes(v))).slice(0,10);const context={profile:db.profile,recentWorkout:db.workouts.slice(-10),recentMeals:db.meals.slice(-10),recentBody:db.body.slice(-10),relevantExercises,relevantFoods,todayWorkoutCalories:db.workouts.filter(x=>x.date===isoToday()).reduce((a,x)=>a+(+x.calories||estimateWorkoutCalories(x)),0),fitmindRules:aiKnowledge.rules.slice(0,20)};
 if(db.api.url){
  try{let h={"Content-Type":"application/json"};if(db.api.key)h.Authorization="Bearer "+db.api.key;
   let r=await fetch(db.api.url,{method:"POST",headers:h,body:JSON.stringify({message:text,context})});
   let j=await r.json();return j.reply||j.message||JSON.stringify(j)
  }catch(e){return "AI 서버 연결에 실패했습니다. 로컬 코치로 답변합니다.\n"+localAnswer(text)}
 }
 return localAnswer(text);
}
function localAnswer(t){
 const q=t.toLowerCase(),w=db.workouts.at(-1),b=db.body.at(-1);
 if(q.includes("칼로리")&&q.includes("운동")){const c=db.workouts.filter(x=>x.date===isoToday()).reduce((a,x)=>a+(+x.calories||estimateWorkoutCalories(x)),0);return `오늘 운동으로 추정 소비한 칼로리는 약 ${Math.round(c)}kcal입니다. 체중·운동시간·강도를 기반으로 한 추정치입니다.`;}if(q.includes("운동"))return `최근 운동: ${w?w.exercise:"기록 없음"}\n오늘은 무리하지 않는 선에서 지난 운동을 기준으로 1~2개 동작을 진행해 보세요. 실제 서버 AI를 연결하면 기록 전체를 분석해 더 정교한 루틴을 만들 수 있습니다.`;
 if(q.includes("식단")||q.includes("먹"))return `최근 식단 ${db.meals.length}건이 기록되어 있습니다.\n단백질과 총섭취량을 함께 기록하면 개인화 분석 정확도가 올라갑니다.`;
 if(q.includes("체중")||q.includes("몸"))return `최근 체중: ${b?.weight??"미기록"}kg\n바디체크를 꾸준히 남기면 추세를 분석할 수 있습니다.`;
 return "현재는 로컬 코치 모드입니다. 운동, 식단, 체중, 루틴에 대해 질문해 주세요.";
}
chatForm.onsubmit=async e=>{
 e.preventDefault();let t=chatInput.value.trim();if(!t)return;
 db.chat.push({role:"user",text:t,date:isoToday()});chatInput.value="";render();
 let a=await askAI(t);db.chat.push({role:"ai",text:a,date:isoToday()});save();render()
};
function chatRender(){chatLog.innerHTML=db.chat.slice(-30).map(x=>`<div class="msg ${x.role==="user"?"user":"ai"}">${esc(x.text)}</div>`).join("")||"<div class='card'>안녕하세요. 기록을 바탕으로 운동과 식단을 함께 관리해 드릴게요.</div>"}
async function loadExerciseDB(){
 try{
  const r=await fetch("./exercise-db.json"); exerciseDB=await r.json();
  const aliases={"사레레":["덤벨 레터럴레이즈","케이블 레터럴레이즈"],"오버헤드프레스":["바벨 오버헤드프레스","밀리터리 프레스"],"덤벨숄프":["덤벨 숄더프레스"],"숄더프레스":["덤벨 숄더프레스","머신 숄더프레스"],"벤치":["바벨 벤치프레스","덤벨 벤치프레스"],"랫풀":["랫풀다운"],"턱걸이":["풀업"],"딥스":["딥스","중량 딥스"],"케이블푸쉬다운":["케이블 푸쉬다운"],"스컬크러셔":["EZ바 스컬크러셔"]};
  Object.entries(aliases).forEach(([a,names])=>names.forEach(n=>{const x=exerciseDB.find(v=>v.exercise_name===n);if(x)x.aliases=[...(x.aliases||[]),a]}));
 }catch(e){exerciseDB=[];console.warn("운동 DB 로드 실패",e)}
}
async function loadAIKnowledge(){
 try{
  const [r1,r2]=await Promise.all([fetch("./ai-data/fitmind_rules.jsonl"),fetch("./ai-data/fitmind_sft.jsonl")]);
  const parse=async r=>(await r.text()).split(/\r?\n/).filter(Boolean).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean);
  aiKnowledge.rules=await parse(r1); aiKnowledge.sft=await parse(r2);
 }catch(e){console.warn("AI 지식 데이터 로드 실패",e)}
}

async function loadFoodDB(){
 try{
   const res=await fetch("./food-db.json");
   const remote=await res.json();
   const known=new Map(baseFoodDB.map(f=>[f.name,f]));
   foodDB=remote.map(f=>Object.assign({},f,known.get(f.name)||{}));
   // 별칭을 검색에 연결
   const aliasMap={"닭찌":"닭가슴살","닭찌찌":"닭가슴살","닭가슴살팩":"닭가슴살","프로틴":"프로틴 쉐이크","단백질쉐이크":"프로틴 쉐이크","달걀":"계란","그릭":"그릭요거트"};
   Object.entries(aliasMap).forEach(([alias,target])=>{const f=foodDB.find(x=>x.name===target);if(f){f.aliases=[...(f.aliases||[]),alias]}})
   renderFoodList();
 }catch(e){
   foodDB=baseFoodDB;
   renderFoodList();
   console.warn("음식 DB 로드 실패",e);
 }
}
function renderFoodList(){
 const list=document.getElementById("foodList");
 if(!list)return;
 list.innerHTML=foodDB.map(f=>`<option value="${esc(f.name)}">${esc(f.category||"")} · ${f.kcal!=null?fmtN(f.kcal)+" kcal / 100g":"영양정보 준비중"}</option>`).join("");
}
let deferred;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;installBtn.hidden=false;installBtn.onclick=()=>{deferred.prompt();deferred=null}});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
Promise.all([loadFoodDB(),loadExerciseDB(),loadAIKnowledge()]).then(()=>render());

window.addEventListener('DOMContentLoaded', updateWorkoutCalorieUI);


document.addEventListener("DOMContentLoaded",()=>{if(document.getElementById("body"))fitmindInitBodyCheck();});
