/* FitMind V8.1 Multi-entry workout & meal logger */
(function(){
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const today=()=>typeof window.isoToday==="function"?window.isoToday():new Date().toISOString().slice(0,10);
const db=()=>typeof window.__FitMindV6DB==="function"?window.__FitMindV6DB():null;
const persist=()=>{try{if(typeof window.save==="function")return window.save(); if(typeof window.__FitMindV6Save==="function")return window.__FitMindV6Save();}catch(e){console.warn(e)} return false};
const refresh=()=>{try{if(typeof window.render==="function")window.render()}catch(e){console.warn("render",e)}};

let foods=[],exercises=[];
async function loadDBs(){
 try{foods=await fetch("food-db.json").then(r=>r.json())}catch(e){foods=[]}
 try{exercises=await fetch("exercise-db.json").then(r=>r.json())}catch(e){exercises=[]}
}
function exOptions(q){
 q=String(q||"").toLowerCase();
 return exercises.filter(x=>String(x.exercise_name||"").toLowerCase().includes(q)).slice(0,8);
}
function foodOptions(q){
 q=String(q||"").toLowerCase();
 return foods.filter(x=>(String(x.name||"")+" "+(x.aliases||[]).join(" ")).toLowerCase().includes(q)).slice(0,8);
}
function workoutRow(){
 return `<div class="batchRow workoutBatchRow">
 <input class="batchName" list="fitmindExerciseList" placeholder="운동명" aria-label="운동명">
 <input data-k="sets" type="number" min="1" value="3" placeholder="세트">
 <input data-k="reps" type="number" min="1" value="10" placeholder="반복">
 <input data-k="weight" type="number" min="0" step=".5" placeholder="kg">
 <input data-k="duration" type="number" min="0" value="10" placeholder="분">
 <input data-k="rpe" type="number" min="1" max="10" step=".5" placeholder="RPE">
 <button type="button" class="removeRow" aria-label="행 삭제">×</button>
 </div>`;
}
function mealRow(){
 return `<div class="batchRow food mealBatchRow">
 <input class="batchName" list="fitmindFoodList" placeholder="음식명" aria-label="음식명">
 <input data-k="qty" type="number" min=".1" step=".1" value="100" placeholder="g">
 <input data-k="kcal" type="number" min="0" step=".1" placeholder="kcal/100g">
 <input data-k="protein" type="number" min="0" step=".1" placeholder="단백질">
 <input data-k="carbs" type="number" min="0" step=".1" placeholder="탄수">
 <input data-k="fat" type="number" min="0" step=".1" placeholder="지방">
 <button type="button" class="removeRow" aria-label="행 삭제">×</button>
 </div>`;
}
function metFor(name){
 const x=exercises.find(e=>e.exercise_name===name);
 return Number(x?.met_default)||5;
}
function bodyWeight(){
 const d=db(); return Number(d?.profile?.weight||d?.body?.at(-1)?.weight)||70;
}
function workoutCalc(row){
 const sets=+row.querySelector('[data-k="sets"]').value||0,reps=+row.querySelector('[data-k="reps"]').value||0,w=+row.querySelector('[data-k="weight"]').value||0,dur=+row.querySelector('[data-k="duration"]').value||0,rpe=+row.querySelector('[data-k="rpe"]').value||0;
 const volume=sets*reps*w;
 const met=metFor(row.querySelector(".batchName").value);
 const intensity=rpe?Math.max(.85,Math.min(1.2,.85+(rpe-1)*.035)):1;
 const kcal=dur>0?met*3.5*bodyWeight()/200*dur*intensity:0;
 return {volume,kcal,sets,reps,weight:w,duration:dur,rpe};
}
function mealCalc(row){
 const qty=+row.querySelector('[data-k="qty"]').value||0;
 const k=+row.querySelector('[data-k="kcal"]').value||0,p=+row.querySelector('[data-k="protein"]').value||0,c=+row.querySelector('[data-k="carbs"]').value||0,f=+row.querySelector('[data-k="fat"]').value||0;
 const factor=qty/100; return {kcal:k*factor,protein:p*factor,carbs:c*factor,fat:f*factor,qty};
}
function updateWorkoutTotals(){
 const rows=[...document.querySelectorAll(".workoutBatchRow")];
 let v=0,k=0,s=0,m=0;
 rows.forEach(r=>{const x=workoutCalc(r);v+=x.volume;k+=x.kcal;s+=x.sets;m+=x.duration});
 document.getElementById("batchWorkoutVolume").textContent=Math.round(v).toLocaleString()+" kg";
 document.getElementById("batchWorkoutKcal").textContent=Math.round(k).toLocaleString()+" kcal";
 document.getElementById("batchWorkoutSets").textContent=s.toLocaleString()+" 세트";
 document.getElementById("batchWorkoutTime").textContent=m.toLocaleString()+" 분";
}
function updateMealTotals(){
 const rows=[...document.querySelectorAll(".mealBatchRow")];
 let k=0,p=0,c=0,f=0;
 rows.forEach(r=>{const x=mealCalc(r);k+=x.kcal;p+=x.protein;c+=x.carbs;f+=x.fat});
 document.getElementById("batchMealKcal").textContent=Math.round(k).toLocaleString()+" kcal";
 document.getElementById("batchMealProtein").textContent=p.toFixed(1)+" g";
 document.getElementById("batchMealCarbs").textContent=c.toFixed(1)+" g";
 document.getElementById("batchMealFat").textContent=f.toFixed(1)+" g";
}
function fillFood(row){
 const name=row.querySelector(".batchName").value.trim();
 const f=foods.find(x=>x.name===name)||foodOptions(name)[0];
 if(!f)return;
 row.querySelector('[data-k="kcal"]').value=Number(f.kcal)||0;
 row.querySelector('[data-k="protein"]').value=Number(f.protein)||0;
 row.querySelector('[data-k="carbs"]').value=Number(f.carbs)||0;
 row.querySelector('[data-k="fat"]').value=Number(f.fat)||0;
 const basis=Number(f.basis_g||f.nutrition_basis_g)||100;
 row.dataset.basis=basis;
 row.querySelector('[data-k="qty"]').placeholder=basis+"g";
 updateMealTotals();
}
function saveWorkouts(){
 const d=db(); if(!d)return;
 const rows=[...document.querySelectorAll(".workoutBatchRow")].filter(r=>r.querySelector(".batchName").value.trim());
 if(!rows.length){alert("운동을 하나 이상 입력해줘.");return}
 const date=today();
 rows.forEach(r=>{
  const name=r.querySelector(".batchName").value.trim(), x=workoutCalc(r), ex=exercises.find(e=>e.exercise_name===name);
  d.workouts=d.workouts||[];
  d.workouts.push({exercise:name,exerciseId:ex?.exercise_id||null,primaryMuscle:ex?.primary_muscle||"",sets:x.sets,reps:x.reps,weight:x.weight,durationMin:x.duration,rpe:x.rpe,bodyWeight:bodyWeight(),note:"다중 운동 기록",date,volume:x.volume,calories:x.kcal});
 });
 if(persist()===false){alert("저장에 실패했어.");return}
 document.getElementById("batchWorkoutRows").innerHTML=workoutRow();
 updateWorkoutTotals(); refresh();
}
function saveMeals(){
 const d=db(); if(!d)return;
 const rows=[...document.querySelectorAll(".mealBatchRow")].filter(r=>r.querySelector(".batchName").value.trim());
 if(!rows.length){alert("음식을 하나 이상 입력해줘.");return}
 const date=today();
 rows.forEach(r=>{
  const name=r.querySelector(".batchName").value.trim(), x=mealCalc(r), f=foods.find(z=>z.name===name);
  d.meals=d.meals||[];
  d.meals.push({foodId:f?.food_id||null,meal:name,servings:x.qty/100,unit:"g",calories:x.kcal,protein:x.protein,carbs:x.carbs,fat:x.fat,mealType:"",note:"다중 음식 기록",date});
 });
 if(persist()===false){alert("저장에 실패했어.");return}
 document.getElementById("batchMealRows").innerHTML=mealRow();
 updateMealTotals(); refresh();
}
function setup(){
 const wf=document.getElementById("batchWorkoutRows"),mf=document.getElementById("batchMealRows");
 if(!wf||!mf)return;
 wf.innerHTML=workoutRow(); mf.innerHTML=mealRow();
 const dl1=document.getElementById("fitmindExerciseList"),dl2=document.getElementById("fitmindFoodList");
 dl1.innerHTML=exercises.map(x=>`<option value="${esc(x.exercise_name)}">`).join("");
 dl2.innerHTML=foods.map(x=>`<option value="${esc(x.name)}">`).join("");
 document.getElementById("addBatchWorkout").onclick=()=>{wf.insertAdjacentHTML("beforeend",workoutRow());updateWorkoutTotals()};
 document.getElementById("addBatchMeal").onclick=()=>{mf.insertAdjacentHTML("beforeend",mealRow());updateMealTotals()};
 document.getElementById("saveBatchWorkout").onclick=saveWorkouts;
 document.getElementById("saveBatchMeal").onclick=saveMeals;
 document.addEventListener("input",e=>{
  if(e.target.closest(".workoutBatchRow"))updateWorkoutTotals();
  if(e.target.closest(".mealBatchRow"))updateMealTotals();
 });
 document.addEventListener("change",e=>{
  if(e.target.matches(".mealBatchRow .batchName"))fillFood(e.target.closest(".mealBatchRow"));
 });
 document.addEventListener("click",e=>{
  if(e.target.classList.contains("removeRow")){
   const row=e.target.closest(".batchRow");
   const parent=row?.parentElement;
   if(parent?.querySelectorAll(".batchRow").length>1)row.remove();
   if(row?.classList.contains("workoutBatchRow"))updateWorkoutTotals(); else updateMealTotals();
  }
 });
 updateWorkoutTotals();updateMealTotals();
}
loadDBs().then(setup);
})();