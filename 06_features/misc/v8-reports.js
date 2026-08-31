/* FitMind V8.0 reports & retention */
window.FitMindReports={
 build(data={}){
  const a=data.workouts||[],m=data.meals||[];
  return {workouts:a.length,meals:m.length,kcal:m.reduce((s,x)=>s+(+x.kcal||0),0),protein:m.reduce((s,x)=>s+(+x.protein||0),0),volume:a.reduce((s,x)=>s+(+x.volume||0),0),generatedAt:new Date().toISOString()};
 },
 retention:{streakKey:"fitmindV8Streak"},
 subscription:{free:["기본 기록","기본 통계"],pro:["장기기억","고급 AI 코치","AI 운동 처방","AI 식단 코칭","AI 리포트","적응형 프로그램"]}
};