const KEY="fitmind_v1";
let db=JSON.parse(localStorage.getItem(KEY)||'{"profile":{},"workouts":[],"meals":[],"body":[],"chat":[],"api":{}}');
let reportPeriod="week";
const firebaseConfig={apiKey:"AIzaSyDq9kU2_tXyb8DKMxezdm7jwr4fvMuOWrE",authDomain:"fitfind-ai.firebaseapp.com",projectId:"fitfind-ai",storageBucket:"fitfind-ai.firebasestorage.app",messagingSenderId:"1025997386401",appId:"1:1025997386401:web:1d63900ff86bb1dcb036e0"};
firebase.initializeApp(firebaseConfig);
const fbAuth=firebase.auth(), fbStore=firebase.firestore();
let currentUser=null, syncTimer=null;
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));queueSync()};
function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncToCloud,800)}
async function syncToCloud(){
 if(!currentUser)return;
 try{await fbStore.collection("users").doc(currentUser.uid).set(db)}catch(e){console.warn("클라우드 동기화 실패",e)}
}
async function loadFromCloud(){
 if(!currentUser)return false;
 try{
  const snap=await fbStore.collection("users").doc(currentUser.uid).get();
  if(snap.exists){db=Object.assign({profile:{},workouts:[],meals:[],body:[],chat:[],api:{}},snap.data());localStorage.setItem(KEY,JSON.stringify(db));return true}
 }catch(e){console.warn("클라우드 불러오기 실패",e)}
 return false;
}
function setAuthTab(t){
 document.querySelectorAll("#authTabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
 loginForm.hidden=t!=="login"; signupForm.hidden=t!=="signup"; authError.textContent="";
}
function authErrorMsg(err){
 const m={"auth/email-already-in-use":"이미 가입된 이메일입니다.","auth/invalid-email":"이메일 형식이 올바르지 않습니다.","auth/weak-password":"비밀번호는 6자 이상이어야 합니다.","auth/wrong-password":"비밀번호가 올바르지 않습니다.","auth/user-not-found":"가입되지 않은 이메일입니다.","auth/popup-closed-by-user":"로그인 창이 닫혔습니다.","auth/invalid-credential":"이메일 또는 비밀번호가 올바르지 않습니다."};
 return m[err.code]||"오류가 발생했습니다. 다시 시도해 주세요.";
}
loginForm.onsubmit=async e=>{e.preventDefault();authError.textContent="";try{await fbAuth.signInWithEmailAndPassword(loginEmail.value,loginPw.value)}catch(err){authError.textContent=authErrorMsg(err)}};
signupForm.onsubmit=async e=>{e.preventDefault();authError.textContent="";try{await fbAuth.createUserWithEmailAndPassword(signupEmail.value,signupPw.value)}catch(err){authError.textContent=authErrorMsg(err)}};
googleBtn.onclick=async()=>{authError.textContent="";try{await fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(err){authError.textContent=authErrorMsg(err)}};
function logout(){fbAuth.signOut()}
function fillProfileForm(){
 profName.value=db.profile.name||""; profGender.value=db.profile.gender||"";
 profAge.value=db.profile.age||""; profHeight.value=db.profile.height||""; profGoal.value=db.profile.goal||"";
}
profileForm.onsubmit=e=>{
 e.preventDefault();
 db.profile={name:profName.value.trim(),gender:profGender.value,age:+profAge.value||0,height:+profHeight.value||0,goal:profGoal.value.trim()};
 save(); accountBtn.textContent=db.profile.name?db.profile.name+"님":"내정보"; openPage("dashboard");
};
fbAuth.onAuthStateChanged(async user=>{
 currentUser=user;
 accountBtn.hidden=!user; mainNav.classList.toggle("hidden",!user);
 if(user){
  await loadFromCloud();
  accountBtn.textContent=db.profile.name?db.profile.name+"님":"내정보";
  openPage(db.profile&&db.profile.name?"dashboard":"profile");
  if(document.getElementById("profile"))fillProfileForm();
 }else{
  db=JSON.parse(localStorage.getItem(KEY)||'{"profile":{},"workouts":[],"meals":[],"body":[],"chat":[],"api":{}}');
  openPage("auth");
 }
});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function openPage(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");render();scrollTo(0,0)}
function today(){return new Date().toLocaleDateString("ko-KR")}
function render(){
 document.getElementById("dashWeight").textContent=db.body.at(-1)?.weight??"-";
 document.getElementById("dashWorkout").textContent=db.workouts.length;
 document.getElementById("dashMeals").textContent=db.meals.length;
 document.getElementById("dashStreak").textContent=calcStreak();
 document.getElementById("coachTip").textContent=localCoach();
 document.getElementById("workoutList").innerHTML=db.workouts.slice().reverse().map(x=>`<div class="item"><strong>${esc(x.exercise)}</strong>${x.sets}세트 × ${x.reps}회 ${x.weight?`× ${x.weight}kg`:""}<br><small>${x.date} · ${esc(x.note)}</small></div>`).join("")||"<div class='card'>아직 운동 기록이 없습니다.</div>";
 document.getElementById("mealList").innerHTML=db.meals.slice().reverse().map(x=>`<div class="item"><strong>${esc(x.meal)}</strong>${x.calories||0} kcal · 단백질 ${x.protein||0}g<br><small>${x.date} · ${esc(x.note)}</small></div>`).join("")||"<div class='card'>아직 식단 기록이 없습니다.</div>";
 document.getElementById("bodyList").innerHTML=db.body.slice().reverse().map(x=>`<div class="item"><strong>${x.weight||"-"}kg ${x.waist?`· 허리 ${x.waist}cm`:""}</strong><small>${x.date} · ${esc(x.note)}</small></div>`).join("")||"<div class='card'>아직 바디체크 기록이 없습니다.</div>";
 report();
 chatRender();
}
function localCoach(){
 const nm=db.profile?.name?`${db.profile.name}님, `:"", goal=db.profile?.goal?` (목표: ${db.profile.goal})`:"";
 if(!db.workouts.length&&!db.meals.length)return `${nm}오늘 운동과 첫 식단을 기록해 주세요. 데이터가 쌓일수록 코칭이 개인화됩니다.${goal}`;
 const w=db.workouts.at(-1), b=db.body.at(-1);
 if(b?.weight)return `${nm}최근 체중 ${b.weight}kg 기준으로 오늘 운동을 기록해 보세요. 최근 운동은 ${w? w.exercise:"없음"}입니다.${goal}`;
 return `${nm}최근 운동과 식단을 계속 기록해 주세요. 기록 패턴을 바탕으로 다음 운동과 식단을 조정할 수 있어요.${goal}`;
}
function calcStreak(){
 const days=[...new Set([...db.workouts,...db.meals,...db.body].map(x=>x.date))];
 let d=new Date(), n=0;
 while(days.includes(d.toLocaleDateString("ko-KR"))){n++;d.setDate(d.getDate()-1)}
 return n;
}
workoutForm.onsubmit=e=>{e.preventDefault();db.workouts.push({exercise:exercise.value,sets:+sets.value,reps:+reps.value,weight:+weight.value||0,note:workoutNote.value,date:today()});save();e.target.reset();render()};
mealForm.onsubmit=e=>{e.preventDefault();db.meals.push({meal:meal.value,calories:+calories.value||0,protein:+protein.value||0,note:mealNote.value,date:today()});save();e.target.reset();render()};
bodyForm.onsubmit=async e=>{e.preventDefault();let photo="";if(bodyPhoto.files[0])photo=await fileToData(bodyPhoto.files[0]);db.body.push({weight:+bodyWeight.value||0,waist:+bodyWaist.value||0,note:bodyNote.value,date:today(),photo});save();e.target.reset();render()};
function fileToData(f){return new Promise(r=>{let a=new FileReader();a.onload=()=>r(a.result);a.readAsDataURL(f)})}
function parseKoDate(s){
 if(!s)return null;
 const m=s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
 if(!m)return null;
 return new Date(+m[1],+m[2]-1,+m[3]);
}
function periodDays(p){return {week:7,month:30,year:365,all:Infinity}[p]}
function periodLabel(p){return {week:"주간 (최근 7일)",month:"월간 (최근 30일)",year:"연간 (최근 365일)",all:"전체 기간"}[p]}
function rangeText(days){
 if(days===Infinity)return "누적 전체 기록";
 const end=new Date(),start=new Date();start.setDate(start.getDate()-days+1);
 const f=d=>`${d.getMonth()+1}/${d.getDate()}`;
 return `${f(start)} ~ ${f(end)}`;
}
function periodStats(days){
 if(days===Infinity)return{workouts:db.workouts,meals:db.meals,body:db.body,prevWorkouts:[],prevMeals:[]};
 const now=new Date();now.setHours(0,0,0,0);
 const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-days+1);
 const prevCutoff=new Date(cutoff);prevCutoff.setDate(prevCutoff.getDate()-days);
 const inCur=d=>{const dt=parseKoDate(d);return dt&&dt>=cutoff&&dt<=now};
 const inPrev=d=>{const dt=parseKoDate(d);return dt&&dt>=prevCutoff&&dt<cutoff};
 return{
  workouts:db.workouts.filter(x=>inCur(x.date)),
  meals:db.meals.filter(x=>inCur(x.date)),
  body:db.body.filter(x=>inCur(x.date)),
  prevWorkouts:db.workouts.filter(x=>inPrev(x.date)),
  prevMeals:db.meals.filter(x=>inPrev(x.date))
 };
}
function diffText(cur,prev){
 if(!prev)return cur>0?`(이전 기간 0건 → +${cur})`:"(이전 기간과 동일)";
 const diff=cur-prev,pct=Math.round(diff/prev*100);
 if(diff===0)return "(이전 기간과 동일)";
 return `(${diff>0?"+":""}${diff}건, 이전 대비 ${diff>0?"+":""}${pct}%)`;
}
function report(){
 document.querySelectorAll("#reportTabs button").forEach(b=>b.classList.toggle("active",b.dataset.period===reportPeriod));
 const days=periodDays(reportPeriod), s=periodStats(days);
 const kcal=s.meals.reduce((a,x)=>a+(x.calories||0),0), protein=s.meals.reduce((a,x)=>a+(x.protein||0),0);
 const wOrder=s.body;
 const weightChange=wOrder.length>1?(wOrder.at(-1).weight-wOrder[0].weight):null;
 let cmp="";
 if(days!==Infinity){
  cmp=`<p class="muted">운동 ${diffText(s.workouts.length,s.prevWorkouts.length)}<br>식단 기록 ${diffText(s.meals.length,s.prevMeals.length)}</p>`;
 }
 document.getElementById("reportContent").innerHTML=`
  <div class="card"><h3>${periodLabel(reportPeriod)} 리포트</h3><p class="muted">${rangeText(days)}</p></div>
  <div class="grid">
   <div class="card"><span>운동</span><b>${s.workouts.length}</b><small>회</small></div>
   <div class="card"><span>식단</span><b>${s.meals.length}</b><small>기록</small></div>
   <div class="card"><span>바디체크</span><b>${s.body.length}</b><small>회</small></div>
   <div class="card"><span>연속 기록</span><b>${calcStreak()}</b><small>일</small></div>
  </div>
  <div class="card">
   <p>섭취 칼로리 합계: <b>${kcal}</b> kcal · 단백질 합계: <b>${protein}</b> g</p>
   <p>${weightChange!==null?`체중 변화: ${wOrder[0].weight}kg → ${wOrder.at(-1).weight}kg <span class="trend ${weightChange>0?"up":weightChange<0?"down":""}">(${weightChange>0?"+":""}${weightChange.toFixed(1)}kg)</span>`:"체중 변화를 보려면 이 기간에 바디체크를 2회 이상 기록하세요."}</p>
   ${cmp}
  </div>
 `;
}
function setReportPeriod(p){reportPeriod=p;report()}
function exportBackup(){let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`fitmind-backup-${Date.now()}.json`;a.click()}
restoreFile.onchange=e=>{let r=new FileReader();r.onload=()=>{try{db=JSON.parse(r.result);save();render();alert("복원 완료");}catch{alert("올바른 백업 파일이 아닙니다.")}};r.readAsText(e.target.files[0])};
function saveApi(){db.api={url:apiUrl.value.trim(),key:apiKey.value};save();alert("AI 서버 설정을 저장했습니다.")}
async function askAI(text){
 const context={profile:db.profile,recentWorkout:db.workouts.slice(-10),recentMeals:db.meals.slice(-10),recentBody:db.body.slice(-10)};
 if(db.api.url){try{let h={"Content-Type":"application/json"};if(db.api.key)h.Authorization="Bearer "+db.api.key;let r=await fetch(db.api.url,{method:"POST",headers:h,body:JSON.stringify({message:text,context})});let j=await r.json();return j.reply||j.message||JSON.stringify(j)}catch(e){return "AI 서버 연결에 실패했습니다. 로컬 코치로 답변합니다.\n"+localAnswer(text)}}
 return localAnswer(text);
}
function localAnswer(t){
 const q=t.toLowerCase(), w=db.workouts.at(-1), b=db.body.at(-1);
 if(q.includes("운동"))return `최근 운동: ${w?w.exercise:"기록 없음"}\n오늘은 무리하지 않는 선에서 지난 운동을 기준으로 1~2개 동작을 진행해 보세요. 실제 서버 AI를 연결하면 기록 전체를 분석해 더 정교한 루틴을 만들 수 있습니다.`;
 if(q.includes("식단")||q.includes("먹"))return `최근 식단 ${db.meals.length}건이 기록되어 있습니다.\n단백질과 총섭취량을 함께 기록하면 개인화 분석 정확도가 올라갑니다.`;
 if(q.includes("체중")||q.includes("몸"))return `최근 체중: ${b?.weight??"미기록"}kg\n바디체크를 꾸준히 남기면 추세를 분석할 수 있습니다.`;
 return "현재는 로컬 코치 모드입니다. 운동, 식단, 체중, 루틴에 대해 질문해 주세요.";
}
chatForm.onsubmit=async e=>{e.preventDefault();let t=chatInput.value.trim();if(!t)return;db.chat.push({role:"user",text:t,date:today()});chatInput.value="";render();let a=await askAI(t);db.chat.push({role:"ai",text:a,date:today()});save();render()};
function chatRender(){chatLog.innerHTML=db.chat.slice(-30).map(x=>`<div class="msg ${x.role==="user"?"user":"ai"}">${esc(x.text)}</div>`).join("")||"<div class='card'>안녕하세요. 기록을 바탕으로 운동과 식단을 함께 관리해 드릴게요.</div>"}
let deferred;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;installBtn.hidden=false;installBtn.onclick=()=>{deferred.prompt();deferred=null}});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
render();