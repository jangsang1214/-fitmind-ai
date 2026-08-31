/* FitMind V8.0 Personal AI Coach layer */
(function(){
"use strict";
const read=()=>{try{return JSON.parse(localStorage.getItem("fitmindV8Memory")||"{}")}catch{return{}}};
const write=x=>localStorage.setItem("fitmindV8Memory",JSON.stringify(x));
window.FitMindPersonalAI={
 remember(key,value){const d=read();d[key]=value;write(d);return d},
 memory(){return read()},
 weeklySummary(data){
   const w=data?.workouts||[], m=data?.meals||[];
   const kcal=m.reduce((s,x)=>s+(+x.kcal||0),0), protein=m.reduce((s,x)=>s+(+x.protein||0),0);
   const volume=w.reduce((s,x)=>s+(+x.volume||((+x.weight||0)*(+x.reps||0)*(+x.sets||1))),0);
   return {workoutCount:w.length,foodCount:m.length,kcal,protein,volume};
 },
 nextAction(data){
   const s=this.weeklySummary(data);
   if(!s.workoutCount)return "오늘 첫 운동을 기록해보자.";
   if(!s.foodCount)return "오늘 식단을 기록하면 운동과 함께 분석해줄게.";
   return "최근 운동·식단 데이터를 기준으로 다음 운동과 식단을 조정할 수 있어.";
 }
};
})();