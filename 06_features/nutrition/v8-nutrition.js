/* FitMind V8.0 nutrition coach */
window.FitMindNutritionCoach={
 analyze({meals=[],targetKcal=0,targetProtein=0}={}){
  const kcal=meals.reduce((s,x)=>s+(+x.kcal||0),0);
  const protein=meals.reduce((s,x)=>s+(+x.protein||0),0);
  return {kcal,protein,remainingKcal:Math.max(0,targetKcal-kcal),remainingProtein:Math.max(0,targetProtein-protein)};
 },
 suggest({remainingProtein=0,remainingKcal=0}={}){
  if(remainingProtein>30)return "단백질이 더 필요해. 닭가슴살, 계란, 살코기처럼 단백질 중심으로 맞춰보자.";
  if(remainingKcal>500)return "남은 칼로리가 꽤 있어. 탄수화물과 단백질을 균형 있게 채우자.";
  return "현재 섭취량을 유지하면서 배고픔과 컨디션을 기준으로 조정하자.";
 }
};