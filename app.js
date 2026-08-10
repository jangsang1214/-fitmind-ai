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

function updateWorkoutCalorieUI(){
  try{
    const today = typeof isoToday === "function" ? isoToday() : new Date().toISOString().slice(0,10);
    const workouts = (db.workouts || []).filter(w => w.date === today);
    let calories = 0, minutes = 0;
    workouts.forEach(w => {
      const c = Number(w.calories || (typeof estimateWorkoutCalories === "function" ? estimateWorkoutCalories(w) : 0));
      if(Number.isFinite(c)) calories += c;
      minutes += Number(w.durationMin || 0);
    });
    const kcal = Math.round(calories);
    const a = document.getElementById("todayWorkoutCalories");
    const b = document.getElementById("todayWorkoutCalorieMeta");
    if(a) a.textContent = kcal.toLocaleString() + " kcal";
    if(b) b.textContent = "운동시간 " + minutes + "분 · 체중/MET/RPE 기반 추정치";
    const intake = (db.meals || []).filter(m => m.date === today).reduce((s,m)=>s+(Number(m.calories)||0),0);
    const i = document.getElementById("dailyIntakeKcal");
    const w = document.getElementById("dailyWorkoutKcal");
    const n = document.getElementById("dailyNetKcal");
    if(i) i.textContent = Math.round(intake).toLocaleString() + " kcal";
    if(w) w.textContent = kcal.toLocaleString() + " kcal";
    if(n) n.textContent = Math.round(intake-calories).toLocaleString() + " kcal";
  }catch(e){ console.warn("FitMind calorie UI:",e); }
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
function openPage(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");render();scrollTo(0,0)}
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
 const q=Math.max(.1,+servings.value||1);
 if(!f){
   foodHint.textContent="음식을 선택하면 DB 데이터를 자동으로 불러옵니다.";
   updateNutritionPreview(null);return;
 }
 window.selectedFoodId=f.food_id;
 const hasNutrition=f.kcal!=null&&f.protein!=null&&f.carbs!=null&&f.fat!=null;
 if(hasNutrition){
   calories.value=Math.round(f.kcal*q);
   protein.value=(f.protein*q).toFixed(1);
   carbs.value=(f.carbs*q).toFixed(1);
   fat.value=(f.fat*q).toFixed(1);
   foodHint.textContent=`${f.name} · 100g 기준 영양정보 · 섭취량 ${q}${servingUnit.value}`;
   updateNutritionPreview({kcal:+calories.value,protein:+protein.value,carbs:+carbs.value,fat:+fat.value});
 }else{
   calories.value="";protein.value="";carbs.value="";fat.value="";
   foodHint.textContent=`${f.name}은(는) 음식 DB에 등록되어 있지만 공식 영양성분 매핑이 아직 필요합니다. 직접 입력할 수 있습니다.`;
   updateNutritionPreview(null);
 }
}
function updateNutritionPreview(n){
 previewKcal.textContent=n?fmtN(n.kcal):"-";previewProtein.textContent=n?fmtN(n.protein):"-";
 previewCarbs.textContent=n?fmtN(n.carbs):"-";previewFat.textContent=n?fmtN(n.fat):"-";
}
function renderTodayNutrition(){
 const k=isoToday(), rows=db.meals.filter(x=>x.date===k);
 const totals=rows.reduce((a,x)=>({kcal:a.kcal+(+x.calories||0),protein:a.protein+(+x.protein||0),carbs:a.carbs+(+x.carbs||0),fat:a.fat+(+x.fat||0)}),{kcal:0,protein:0,carbs:0,fat:0});
 todayNutrition.innerHTML=`
 <div><span>칼로리</span><b>${Math.round(totals.kcal)}</b><small>kcal</small></div>
 <div><span>단백질</span><b>${totals.protein.toFixed(1)}</b><small>g</small></div>
 <div><span>탄수</span><b>${totals.carbs.toFixed(1)}</b><small>g</small></div>
 <div><span>지방</span><b>${totals.fat.toFixed(1)}</b><small>g</small></div>`;
}
meal.addEventListener("input",()=>{window.selectedFoodId=null;renderFoodSearch();applyFoodDefaults()});
servings.addEventListener("input",applyFoodDefaults);servingUnit.addEventListener("change",applyFoodDefaults);
document.addEventListener("click",e=>{
 const wrap=document.querySelector(".foodSearchWrap");
 if(wrap&&!wrap.contains(e.target))document.getElementById("foodSearchResults").hidden=true;
});
mealForm.onsubmit=e=>{
 e.preventDefault();
 const f=window.selectedFoodId?foodDB.find(x=>x.food_id===window.selectedFoodId):findFood(meal.value);
 db.meals.push({foodId:f?.food_id||null,meal:meal.value.trim(),servings:+servings.value||1,unit:servingUnit.value,calories:+calories.value||0,protein:+protein.value||0,carbs:+carbs.value||0,fat:+fat.value||0,mealType:mealType.value.trim(),note:mealNote.value.trim(),date:isoToday()});
 save();e.target.reset();servings.value=1;window.selectedFoodId=null;
 document.getElementById("selectedFoodCard").hidden=true;document.getElementById("foodSearchResults").hidden=true;
 foodHint.textContent="음식을 검색하면 DB에서 영양정보를 불러옵니다.";updateNutritionPreview(null);render()
};

bodyDate.value=isoToday();
bodyForm.onsubmit=async e=>{
 e.preventDefault();let photo="";
 if(bodyPhoto.files[0])photo=await fileToData(bodyPhoto.files[0]);
 db.body.push({weight:+bodyWeight.value||0,waist:+bodyWaist.value||0,note:bodyNote.value.trim(),date:bodyDate.value||isoToday(),photo});
 save();e.target.reset();bodyDate.value=isoToday();render()
};
function fileToData(f){return new Promise(r=>{let a=new FileReader();a.onload=()=>r(a.result);a.readAsDataURL(f)})}

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
