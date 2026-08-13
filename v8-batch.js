/* FitMind V8.0 Batch Logger */
(function(){
"use strict";
const key="fitmindV8BatchState";
const load=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return{}}};
const save=x=>localStorage.setItem(key,JSON.stringify(x));
function sum(items, fields){return fields.reduce((o,k)=>(o[k]=(items||[]).reduce((s,x)=>s+(Number(x[k])||0),0),o),{});}
window.FitMindBatch={
 addWorkoutBatch(items=[]){
   const d=load(), a=d.workouts||[];
   const normalized=items.map(x=>({...x,volume:(Number(x.weight)||0)*(Number(x.reps)||0)*(Number(x.sets)||1)}));
   d.workouts=a.concat(normalized); d.lastWorkoutTotal=sum(normalized,["volume","kcal"]);
   save(d); return d.lastWorkoutTotal;
 },
 addMealBatch(items=[]){
   const d=load(), a=d.meals||[];
   const normalized=items.map(x=>({...x,kcal:Number(x.kcal)||0,protein:Number(x.protein)||0,carbs:Number(x.carbs)||0,fat:Number(x.fat)||0}));
   d.meals=a.concat(normalized); d.lastMealTotal=sum(normalized,["kcal","protein","carbs","fat"]);
   save(d); return d.lastMealTotal;
 },
 calcWorkout(items){return sum(items,["volume","kcal"])},
 calcMeal(items){return sum(items,["kcal","protein","carbs","fat"])},
 getToday(){
   const d=load(); return {workouts:d.workouts||[],meals:d.meals||[]};
 }
};
})();