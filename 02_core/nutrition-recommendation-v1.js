/* GARANG Nutrition Recommendation v1
   Deterministic next-meal guidance from the saved user state and Food DB.
   This module never writes state and never claims that an unlogged meal was eaten.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangNutritionRecommendation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-nutrition-recommendation-v1';
const list=value=>Array.isArray(value)?value:[];
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const clean=value=>String(value??'').trim();
const round=(value,d=0)=>{const p=10**d;return Math.round(Number(value||0)*p)/p;};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const dateRe=/^\d{4}-\d{2}-\d{2}$/;

function localDate(offset=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+Number(offset||0));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dateParts(value){const s=clean(value).slice(0,10);if(!dateRe.test(s))return null;const [y,m,d]=s.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d?{s,ms:x.getTime()}:null;}
function sameDate(row,date){return clean(row?.date||row?.day||row?.performedAt||row?.createdAt).slice(0,10)===date;}
function goalClass(state){const raw=clean(state?.profile?.goal||state?.onboarding?.goal).toLowerCase();if(/근육|muscle|bulk|hypertrophy/.test(raw))return 'muscle_gain';if(/체지방|체중 감소|감량|fat.?loss|weight.?loss|cut/.test(raw))return 'fat_loss';if(/러닝|running|run/.test(raw))return 'running_performance';if(/퍼포먼스|performance|strength|기록 향상/.test(raw))return 'performance';return 'maintenance';}
function goalLabel(goal,lang='ko'){const labels={ko:{muscle_gain:'근육 증가',fat_loss:'체지방 감소',running_performance:'러닝 퍼포먼스',performance:'퍼포먼스 향상',maintenance:'유지·건강'},en:{muscle_gain:'Muscle gain',fat_loss:'Fat loss',running_performance:'Running performance',performance:'Performance',maintenance:'Maintenance'}};return (labels[lang]||labels.ko)[goal]||goal;}
function profileSex(state){const raw=clean(state?.profile?.gender||state?.profile?.sex||state?.onboarding?.gender||state?.onboarding?.sex).toLowerCase();if(/female|woman|여성|여자/.test(raw))return 'female';if(/male|man|남성|남자/.test(raw))return 'male';return null;}
function latestWeight(state,date){const end=dateParts(date),rows=list(state?.body).filter(row=>{const p=dateParts(row?.date);return p&&end&&p.ms<=end.ms&&finite(row?.weight)>0;}).sort((a,b)=>clean(a.date).localeCompare(clean(b.date)));return finite(rows.at(-1)?.weight)||finite(state?.profile?.weight);}
function activeDays(state,endDate,days=14){const end=dateParts(endDate);if(!end)return 0;const start=end.ms-(Math.max(1,days)-1)*86400000,dates=new Set();for(const row of [...list(state?.workouts),...list(state?.runs)]){const p=dateParts(row?.date);if(p&&p.ms>=start&&p.ms<=end.ms)dates.add(p.s);}return dates.size;}
function activityFactor(days14){if(days14<=1)return 1.2;if(days14<=4)return 1.35;if(days14<=7)return 1.5;if(days14<=10)return 1.6;return 1.7;}
function explicitNumber(state,keys){for(const source of [state?.profile,state?.onboarding,state])for(const key of keys){const value=finite(source?.[key]);if(value!==null&&value>0)return value;}return null;}
function estimateTargets(state,date){
  const goal=goalClass(state),weight=latestWeight(state,date),height=finite(state?.profile?.height),age=finite(state?.profile?.age),sex=profileSex(state),reasons=[];
  const proteinTarget=explicitNumber(state,['proteinTarget','protein_target','targetProtein'])||((weight&&weight>0)?Math.round(weight*1.6):null);
  const explicitCalories=explicitNumber(state,['calorieTarget','calorie_target','targetCalories']);
  if(!(weight>0))reasons.push('MISSING_WEIGHT');
  if(!(height>0))reasons.push('MISSING_HEIGHT');
  if(!(age>0))reasons.push('MISSING_AGE');
  if(!sex)reasons.push('MISSING_SEX');
  if(age!==null&&age<18)reasons.push('AGE_REQUIRES_CLINICAL_TARGET');
  let bmr=null,tdee=null,calorieTarget=explicitCalories,factor=null,adjustment=0;
  if(explicitCalories===null&&weight>0&&height>0&&age!==null&&age>=18&&sex){
    bmr=10*weight+6.25*height-5*age+(sex==='female'?-161:5);factor=activityFactor(activeDays(state,date,14));tdee=bmr*factor;adjustment=goal==='muscle_gain'?250:goal==='fat_loss'?-350:(goal==='running_performance'||goal==='performance'?150:0);calorieTarget=tdee+adjustment;if(goal==='fat_loss')calorieTarget=Math.max(calorieTarget,bmr*1.1);calorieTarget=Math.round(calorieTarget/10)*10;
  }
  return {goal,goalLabel:goalLabel(goal),calorieTarget:calorieTarget===null?null:Math.round(calorieTarget),proteinTarget:proteinTarget===null?null:Math.round(proteinTarget),bmr:bmr===null?null:Math.round(bmr),tdee:tdee===null?null:Math.round(tdee),activityFactor:factor,goalAdjustment:calorieTarget===null?null:adjustment,estimateOnly:true,medicalTarget:false,reasons:[...new Set(reasons)]};
}
function itemMetric(row,key){const direct=finite(row?.[key]);if(direct!==null)return {value:direct,observed:true};const aliases=key==='carbs'?['carbohydrate']:[],items=list(row?.items),values=items.map(item=>finite(item?.[key]??item?.[aliases[0]])).filter(value=>value!==null),strict=key==='fiber'||key==='sodium',complete=strict?items.length>0&&values.length===items.length:values.length>0;return {value:values.length?values.reduce((sum,value)=>sum+value,0):0,observed:complete};}
function mealTotals(state,date){
  return list(state?.meals).filter(row=>sameDate(row,date)).reduce((total,row)=>{
    const kcal=itemMetric(row,'kcal'),protein=itemMetric(row,'protein'),carbs=itemMetric(row,'carbs'),fat=itemMetric(row,'fat'),fiber=itemMetric(row,'fiber'),sodium=itemMetric(row,'sodium');
    return {meals:total.meals+1,kcal:total.kcal+kcal.value,protein:total.protein+protein.value,carbs:total.carbs+carbs.value,fat:total.fat+fat.value,fiber:total.fiber+fiber.value,sodium:total.sodium+sodium.value,kcalObserved:total.kcalObserved+(kcal.observed?1:0),proteinObserved:total.proteinObserved+(protein.observed?1:0),carbsObserved:total.carbsObserved+(carbs.observed?1:0),fatObserved:total.fatObserved+(fat.observed?1:0),fiberObserved:total.fiberObserved+(fiber.observed?1:0),sodiumObserved:total.sodiumObserved+(sodium.observed?1:0)};
  },{meals:0,kcal:0,protein:0,carbs:0,fat:0,fiber:0,sodium:0,kcalObserved:0,proteinObserved:0,carbsObserved:0,fatObserved:0,fiberObserved:0,sodiumObserved:0});
}
function latestMealForDate(state,date){
  const rows=list(state?.meals).filter(row=>sameDate(row,date));
  return rows.slice().sort((a,b)=>{const aa=Date.parse(a?.createdAt||a?.updatedAt||'')||0,bb=Date.parse(b?.createdAt||b?.updatedAt||'')||0;return aa-bb;}).at(-1)||null;
}
function reviewLatestMeal(stateInput={},options={}){
  const state=stateInput&&typeof stateInput==='object'?stateInput:{},date=clean(options.date||localDate()).slice(0,10),meal=latestMealForDate(state,date);
  if(!meal)return {status:'empty',date,meal:null,proteinState:'unknown',details:{}};
  const targets=estimateTargets(state,date),day=mealTotals(state,date),metric=key=>itemMetric(meal,key),kcal=metric('kcal'),protein=metric('protein'),carbs=metric('carbs'),fat=metric('fat'),fiber=metric('fiber'),sodium=metric('sodium'),proteinTarget=targets.proteinTarget,proteinRemaining=proteinTarget===null||!day.proteinObserved?null:Math.max(0,round(proteinTarget-day.protein,1)),proteinState=proteinRemaining===null?'unknown':proteinRemaining<=0?'enough':'more';
  const detailValue=m=>m.observed?round(m.value,1):null;
  return {status:'ready',date,meal:{id:String(meal.id||''),name:clean(meal.name),items:list(meal.items).length},proteinState,proteinTarget,proteinRemaining,dayProtein:day.proteinObserved?round(day.protein,1):null,nextDirection:proteinState==='more'?'protein':'balanced',details:{kcal:detailValue(kcal),protein:detailValue(protein),carbs:detailValue(carbs),fat:detailValue(fat),fiber:detailValue(fiber),sodium:detailValue(sodium)},guardrails:{savedMealOnly:true,noDiagnosis:true,noInventedNutrients:true}};
}
function normalizedName(value){return clean(value).toLowerCase().replace(/[\s·_-]/g,'');}
function validFood(food){return !!food&&clean(food.name)&&finite(food.kcal)!==null&&finite(food.protein)!==null&&finite(food.carbs??food.carbohydrate)!==null&&finite(food.fat)!==null;}
function chooseFood(foods,names){const valid=list(foods).filter(validFood),wanted=names.map(normalizedName),exact=wanted.map(name=>valid.find(food=>normalizedName(food.name)===name)||valid.find(food=>list(food.aliases).some(alias=>normalizedName(alias)===name))).find(Boolean);return exact||wanted.map(name=>valid.find(food=>normalizedName(food.name).includes(name)||name.includes(normalizedName(food.name)))).find(Boolean)||null;}
function portion(food,grams){if(!validFood(food))return null;const g=Math.max(1,round(grams,0)),ratio=g/(finite(food.basis_g)||100),scaled=value=>{const n=finite(value);return n===null?null:round(n*ratio,1);};return {id:clean(food.food_id||food.id||food.name),foodId:clean(food.food_id||food.id||food.name),name:clean(food.name),grams:g,kcal:round(finite(food.kcal)*ratio,1),protein:round(finite(food.protein)*ratio,1),carbs:round(finite(food.carbs??food.carbohydrate)*ratio,1),fat:round(finite(food.fat)*ratio,1),fiber:scaled(food.fiber),sodium:scaled(food.sodium),nutritionStatus:clean(food.nutrition_status)||'unknown'};}
function roundTo(value,step){return Math.max(step,Math.round(value/step)*step);}
function proteinPortion(food,target){const protein=finite(food?.protein);return protein>0?clamp(roundTo(target*100/protein,5),80,220):100;}
function totals(items){const base=items.reduce((out,item)=>({kcal:out.kcal+item.kcal,protein:out.protein+item.protein,carbs:out.carbs+item.carbs,fat:out.fat+item.fat}),{kcal:0,protein:0,carbs:0,fat:0}),optional=key=>{const values=items.map(item=>finite(item?.[key]));return values.length&&values.every(value=>value!==null)?round(values.reduce((sum,value)=>sum+value,0),1):null;};return {...base,fiber:optional('fiber'),sodium:optional('sodium')};}
function buildOption(id,title,summary,specs,reason){const items=specs.map(spec=>portion(spec.food,spec.grams)).filter(Boolean);if(!items.length)return null;const estimated=totals(items);return {id,title,summary,items,estimated:{kcal:round(estimated.kcal),protein:round(estimated.protein,1),carbs:round(estimated.carbs,1),fat:round(estimated.fat,1),fiber:estimated.fiber,sodium:estimated.sodium},reason,basis:'Food DB 영양값을 섭취량으로 환산한 참고치'};}


function recommendationFollowThrough(stateInput={},options={}){
  const state=stateInput&&typeof stateInput==='object'?stateInput:{},asOf=clean(options.asOf||localDate()).slice(0,10),days=Math.max(7,Math.min(56,Number(options.days)||28)),end=dateParts(asOf);
  if(!end)return {asOf,days,sampleSize:0,targetEvaluated:0,targetReached:0,gapReduced:0,inProgress:0,optionUse:{},recent:[],guardrails:{descriptiveOnly:true,noCausalClaim:true,noRecommendationRankingMutation:true}};
  const start=end.ms-(days-1)*86400000,contexts=new Map();
  for(const meal of list(state.meals)){
    const mealDate=dateParts(meal?.date);if(!mealDate||mealDate.ms<start||mealDate.ms>end.ms)continue;
    const rows=[...list(meal?.recommendationContexts),...list(meal?.items).map(item=>item?.recommendationContext).filter(Boolean)];
    for(const context of rows){
      if(clean(context?.source)!=='next_meal')continue;
      const id=clean(context?.recommendationId);if(!id)continue;
      const current=contexts.get(id)||{recommendationId:id,date:clean(context?.date).slice(0,10)||mealDate.s,optionId:clean(context?.optionId)||null,proteinTarget:finite(context?.proteinTarget),proteinActualBefore:finite(context?.proteinActualBefore),proteinRemainingBefore:finite(context?.proteinRemainingBefore),mealIds:[]};
      if(!current.mealIds.includes(String(meal?.id||'')))current.mealIds.push(String(meal?.id||''));
      contexts.set(id,current);
    }
  }
  const totalsByDate=new Map(),optionUse={};
  const recent=[...contexts.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(context=>{
    if(!totalsByDate.has(context.date))totalsByDate.set(context.date,mealTotals(state,context.date));
    const finalProtein=round(totalsByDate.get(context.date).protein,1),target=context.proteinTarget,before=context.proteinActualBefore,remaining=context.proteinRemainingBefore??(target!==null&&before!==null?Math.max(0,target-before):null),gapAfter=target===null?null:Math.max(0,target-finalProtein),gapBefore=remaining===null?null:Math.max(0,remaining),targetReached=target!==null&&target>0&&gapBefore!==null&&gapBefore>0&&finalProtein>=target,gapReduction=gapBefore===null||gapAfter===null?null:round(Math.max(0,gapBefore-gapAfter),1),classification=targetReached?'target_reached':context.date===asOf?'in_progress':gapReduction!==null&&gapReduction>0?'gap_reduced':'saved';
    if(context.optionId)optionUse[context.optionId]=(optionUse[context.optionId]||0)+1;
    return {recommendationId:context.recommendationId,date:context.date,optionId:context.optionId,mealIds:context.mealIds,proteinTarget:target,proteinActualBefore:before,proteinFinal:finalProtein,proteinGapReduction:gapReduction,classification};
  });
  const targetEvaluated=recent.filter(row=>row.proteinTarget!==null).length,targetReached=recent.filter(row=>row.classification==='target_reached').length,gapReduced=recent.filter(row=>row.classification==='gap_reduced').length,inProgress=recent.filter(row=>row.classification==='in_progress').length;
  return {asOf,days,sampleSize:recent.length,targetEvaluated,targetReached,gapReduced,inProgress,optionUse,recent:recent.slice(-8),guardrails:{descriptiveOnly:true,noCausalClaim:true,noRecommendationRankingMutation:true}};
}

function recommend(state,foods,options={}){
  const safe=state&&typeof state==='object'?state:{},date=clean(options.date||localDate()).slice(0,10),lang=options.language==='en'?'en':'ko',targets=estimateTargets(safe,date),actual=mealTotals(safe,date),remaining={kcal:targets.calorieTarget===null?null:Math.max(0,Math.round(targets.calorieTarget-actual.kcal)),protein:targets.proteinTarget===null?null:Math.max(0,Math.round(targets.proteinTarget-actual.protein))};
  const followThrough=recommendationFollowThrough(safe,{asOf:date,days:28}),base={version:VERSION,date,goal:targets.goal,goalLabel:goalLabel(targets.goal,lang),target:targets,followThrough,actual:{meals:actual.meals,kcal:round(actual.kcal),protein:round(actual.protein,1),carbs:round(actual.carbs,1),fat:round(actual.fat,1),fiber:actual.meals>0&&actual.fiberObserved===actual.meals?round(actual.fiber,1):null,sodium:actual.meals>0&&actual.sodiumObserved===actual.meals?round(actual.sodium,1):null,coverage:{fiber:actual.meals?round(actual.fiberObserved/actual.meals,2):0,sodium:actual.meals?round(actual.sodiumObserved/actual.meals,2):0},observed:{kcal:actual.kcalObserved>0,protein:actual.proteinObserved>0,carbs:actual.carbsObserved>0,fat:actual.fatObserved>0,fiber:actual.meals>0&&actual.fiberObserved===actual.meals,sodium:actual.meals>0&&actual.sodiumObserved===actual.meals}},remaining,basis:'saved_meals_only',recommendationBasis:'goal_and_food_db',options:[]};
  if(!list(foods).some(validFood))return {...base,status:'unavailable',message:lang==='en'?'Food data is not available yet.':'Food DB를 불러오지 못해 추천을 만들 수 없습니다.',reasons:['FOOD_DB_UNAVAILABLE']};
  if(!(targets.proteinTarget>0))return {...base,status:'needs_profile',message:lang==='en'?'Add body weight or a protein target to make this recommendation precise.':'체중 또는 단백질 목표를 입력하면 다음 식사를 더 정확히 제안할 수 있습니다.',reasons:['PROTEIN_TARGET_REQUIRED']};
  const chicken=chooseFood(foods,['닭가슴살','닭가슴살구이','닭안심구이']),salmon=chooseFood(foods,['연어스테이크','연어구이','연어']),tofu=chooseFood(foods,['두부','연두부','순두부']),yogurt=chooseFood(foods,['그릭요거트','저지방그릭요거트']),egg=chooseFood(foods,['삶은계란','계란찜','계란']),rice=chooseFood(foods,['현미밥','잡곡밥','흰쌀밥']),banana=chooseFood(foods,['바나나']),oat=chooseFood(foods,['오트밀']);
  const anchor=chicken||salmon||tofu||egg||yogurt,secondary=salmon||tofu||chicken||egg||yogurt,carb=rice||oat||banana,mealProtein=remaining.protein===0?25:clamp(remaining.protein||30,20,45),carbGrams=targets.goal==='fat_loss'?100:(targets.goal==='muscle_gain'||targets.goal==='performance'||targets.goal==='running_performance'?150:120),optionsList=[];
  const first=buildOption('protein-rice',lang==='en'?'Protein + rice':'단백질 중심 한 끼',lang==='en'?'A simple anchor for the next meal.':'다음 한 끼를 단순하게 채우는 기본 조합.',[{food:anchor,grams:proteinPortion(anchor,mealProtein)},{food:carb,grams:carbGrams}],lang==='en'?'Prioritizes the remaining protein signal.':`저장된 단백질 ${Math.round(actual.protein)}g 기준으로 부족한 신호를 먼저 보완합니다.`);if(first)optionsList.push(first);
  const second=buildOption('alternate-protein',lang==='en'?'Alternate protein plate':'다른 단백질 선택',lang==='en'?'Use a different protein source while keeping the portion clear.':'같은 목표를 다른 단백질원으로 이어가는 선택.',[{food:secondary,grams:proteinPortion(secondary,Math.max(22,mealProtein-3))},{food:carb,grams:Math.max(80,carbGrams-30)}],lang==='en'?'Keeps the choice flexible.':'선택지를 바꿔도 목표 단백질 흐름은 유지합니다.');if(second&&!optionsList.some(option=>option.items[0]?.foodId===second.items[0]?.foodId))optionsList.push(second);
  const third=buildOption('light-combo',lang==='en'?'Light combination':'가벼운 조합',lang==='en'?'A smaller combination for a lighter next meal.':'부담을 줄이고 다음 기록으로 이어가기 쉬운 조합.',[{food:yogurt,grams:200},{food:egg,grams:100},{food:banana,grams:100}],lang==='en'?'A lighter alternative to the main plate.':'한 끼를 가볍게 구성할 때의 대안입니다.');if(third&&!optionsList.some(option=>option.items[0]?.foodId===third.items[0]?.foodId))optionsList.push(third);
  const limited=optionsList.slice(0,Math.max(1,Math.min(3,Number(options.limit)||3)));
  return {...base,status:limited.length?'ready':'unavailable',message:limited.length?(lang==='en'?'Choose one option and add it to your meal draft.':'한 가지를 골라 식단 초안에 담아보세요.'):lang==='en'?'Matching food entries are not available yet.':'추천에 필요한 음식 항목이 아직 없습니다.',options:limited,reasons:limited.length?['SAVED_RECORDS_AND_GOAL_USED','NUTRITION_VALUES_ARE_ESTIMATES']:['MATCHING_FOOD_UNAVAILABLE']};
}

return Object.freeze({VERSION,localDate,goalClass,goalLabel,estimateTargets,mealTotals,reviewLatestMeal,recommendationFollowThrough,recommend,recommendation:recommend});
});
