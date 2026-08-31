/* FitMind V8.2 complete DB selectors */
(function(){
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function getJSON(file){try{return await fetch(file).then(r=>r.json())}catch{return[]}}
function exerciseSelect(id,cls=""){
 return `<select id="${id}" class="${cls}" required><option value="">운동을 선택하세요</option>${
 window.__FM_EX_DB.map(x=>`<option value="${esc(x.exercise_name)}">${esc(x.exercise_name)}${x.primary_muscle?` · ${esc(x.primary_muscle)}`:""}${x.equipment?` · ${esc(x.equipment)}`:""}</option>`).join("")
 }</select>`;
}
function foodSelect(id,cls=""){
 return `<select id="${id}" class="${cls}" required><option value="">음식을 선택하세요</option>${
 window.__FM_FOOD_DB.map(x=>`<option value="${esc(x.name)}">${esc(x.name)} · ${esc(x.category||"")} · ${Number(x.kcal)||0} kcal/100g</option>`).join("")
 }</select>`;
}
function batchWorkoutRow(){
 return `<div class="batchRow workoutBatchRow">
 <select class="batchName" aria-label="운동명"><option value="">운동을 선택하세요</option>${window.__FM_EX_DB.map(x=>`<option value="${esc(x.exercise_name)}">${esc(x.exercise_name)} · ${esc(x.primary_muscle||"")}</option>`).join("")}</select>
 <input data-k="sets" type="number" min="1" value="3" placeholder="세트">
 <input data-k="reps" type="number" min="1" value="10" placeholder="반복">
 <input data-k="weight" type="number" min="0" step=".5" placeholder="kg">
 <input data-k="duration" type="number" min="0" value="10" placeholder="분">
 <input data-k="rpe" type="number" min="1" max="10" step=".5" placeholder="RPE">
 <button type="button" class="removeRow" aria-label="행 삭제">×</button></div>`;
}
function batchMealRow(){
 return `<div class="batchRow food mealBatchRow">
 <select class="batchName" aria-label="음식명"><option value="">음식을 선택하세요</option>${window.__FM_FOOD_DB.map(x=>`<option value="${esc(x.name)}">${esc(x.name)} · ${esc(x.category||"")} · ${Number(x.kcal)||0} kcal</option>`).join("")}</select>
 <input data-k="qty" type="number" min=".1" step=".1" value="100" placeholder="g">
 <input data-k="kcal" type="number" min="0" step=".1" placeholder="kcal/100g">
 <input data-k="protein" type="number" min="0" step=".1" placeholder="단백질">
 <input data-k="carbs" type="number" min="0" step=".1" placeholder="탄수">
 <input data-k="fat" type="number" min="0" step=".1" placeholder="지방">
 <button type="button" class="removeRow" aria-label="행 삭제">×</button></div>`;
}
function replaceTopForms(){
 const ex=document.getElementById("exercise");
 if(ex && ex.tagName==="SELECT"){
  ex.addEventListener("change",()=>{
   const x=window.__FM_EX_DB.find(v=>v.exercise_name===ex.value);
   if(x){const a=document.getElementById("sets"),b=document.getElementById("reps");if(a&&x.default_sets)a.value=x.default_sets;if(b&&x.default_reps)b.value=x.default_reps;}
  });
 }
 const meal=document.getElementById("meal");
 if(meal && meal.tagName==="SELECT"){
  meal.addEventListener("change",()=>{
   const f=window.__FM_FOOD_DB.find(v=>v.name===meal.value);
   if(f && typeof window.selectFood==="function") window.selectFood(f.food_id);
  });
 }
 ["exerciseSearchResults","foodSearchResults"].forEach(id=>{const el=document.getElementById(id);if(el){el.hidden=true;el.style.display="none"}});
}
function replaceBatch(){
 const wr=document.getElementById("batchWorkoutRows"),mr=document.getElementById("batchMealRows");
 if(wr){wr.innerHTML=batchWorkoutRow()}
 if(mr){mr.innerHTML=batchMealRow()}
 const addW=document.getElementById("addBatchWorkout");
 if(addW) addW.onclick=()=>{wr.insertAdjacentHTML("beforeend",batchWorkoutRow())};
 const addM=document.getElementById("addBatchMeal");
 if(addM) addM.onclick=()=>{mr.insertAdjacentHTML("beforeend",batchMealRow())};
 // Remove legacy datalists; the selects now contain the complete DB.
 document.querySelectorAll("#fitmindExerciseList,#fitmindFoodList").forEach(x=>x.remove());
}
Promise.all([getJSON("exercise-db.json"),getJSON("food-db.json")]).then(([ex,food])=>{
 window.__FM_EX_DB=ex;window.__FM_FOOD_DB=food;
 replaceTopForms();
 const forceBatch=()=>{if(document.getElementById("batchWorkoutRows")&&document.getElementById("batchMealRows"))replaceBatch()};
 forceBatch();
 [250,700,1400,2500].forEach(ms=>setTimeout(forceBatch,ms));
 document.documentElement.dataset.fitmindDbSelectors="v8.2";
});
})();