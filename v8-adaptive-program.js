/* FitMind V8.0 adaptive program */
window.FitMindAdaptiveProgram={
 build({goal="muscle_gain",days=4,experience="intermediate"}={}){
  const templates={
   muscle_gain:["Upper","Lower","Rest","Upper","Lower"],
   fat_loss:["Full Body","Cardio","Rest","Full Body","Cardio"],
   maintenance:["Upper","Lower","Rest","Upper","Lower"]
  };
  return {goal,days,experience,week:templates[goal]||templates.maintenance};
 },
 adjust(result={}){
  const r=Number(result.rpe);
  if(r>=9)return {action:"reduce",message:"다음 세트는 중량을 낮추거나 볼륨을 줄이자."};
  if(r<=7)return {action:"progress",message:"다음 세션에서 소폭 증량을 고려할 수 있어."};
  return {action:"hold",message:"현재 중량을 유지하자."};
 }
};