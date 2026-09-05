'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={console,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),Node:{TEXT_NODE:3,ELEMENT_NODE:1,DOCUMENT_NODE:9},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}},document:{readyState:'loading',documentElement:{lang:'en'},addEventListener(){},createTreeWalker(){return {nextNode:()=>null};},querySelectorAll(){return [];}},GARANG_UI_TRANSLATIONS:{}};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'06_features/ui/i18n/entities-v1.js'),'utf8'),context);
const entity=context.GarangEntityI18n;
assert.equal(entity.translateExercise('바벨 벤치프레스'),'Barbell bench press');
assert.equal(entity.translateExercise('인클라인 덤벨 벤치프레스'),'Incline dumbbell bench press');
assert.equal(entity.translateExercise('펙덱 플라이'),'Pec deck fly');
assert.equal(/[가-힣]/.test(entity.translateExercise('케이블 리어델트 플라이')),false);
assert.equal(entity.translateFood('흰쌀밥'),'White rice');
assert.equal(entity.translateFood('김치볶음밥'),'Kimchi fried rice');
assert.equal(entity.translateFood('닭가슴살'),'Chicken breast');
assert.equal(/[가-힣]/.test(entity.translateFood('곤약밥')),false);
assert.equal(/[가-힣]/.test(entity.translateFoodList('현미밥 · 닭가슴살 · 브로콜리')),false);

/* Simulate the older generic token translator that used to corrupt 로컬 -> 로Curl. */
context.GarangTranslateDynamic=(source,target)=>target==='en'?String(source).split('컬').join('Curl'):source;
vm.runInContext(fs.readFileSync(path.join(root,'06_features/ui/i18n/coach-language-v3.js'),'utf8'),context);
const policy=context.GarangCoachLanguagePolicy;
const finalTranslate=context.GarangTranslateDynamic;
const fallback='현재 외부 AI 연결이 없어서 GARANG 로컬 코치로 응답하고 있습니다. 운동 강도, 회복 상태, 식단, 최근 기록에 대해서는 실제 저장 데이터를 기준으로 분석할 수 있습니다.';
const translated=finalTranslate(fallback,'en');
assert.equal(/[가-힣]/.test(translated),false);
assert.equal(/로Curl|로컬/.test(translated),false);
assert.match(translated,/local Coach Engine/);

const recoverySource='오늘 회복 지표는 약 74/100입니다.\n수면 7.5시간 · 에너지 4/5 · 스트레스 2/5 · 근육통 1/5를 반영했습니다.\n\n현재 기록상 정상 훈련을 진행할 수 있는 범위입니다.';
const recovery=finalTranslate(recoverySource,'en');
assert.equal(/[가-힣]/.test(recovery),false);
assert.match(recovery,/74\/100/);
assert.match(recovery,/normal training session/);

const workoutSource='현재 저장된 운동 기록은 3개입니다.\n최근 기록: 바벨 벤치프레스 60kg × 10 × 3세트.\n\n수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다.';
const workout=finalTranslate(workoutSource,'en');
assert.equal(/[가-힣]/.test(workout),false);
assert.match(workout,/Barbell bench press/);
assert.match(workout,/3 saved workout records/);

const nutritionSource='오늘 기록 기준으로 1850 kcal, 단백질 112g입니다.\n목표 단백질을 약 130g으로 보면 18g 정도 남아 있습니다.\n\n지금은 실제 저장된 식단 기록만 사용해 판단했습니다.';
const nutrition=finalTranslate(nutritionSource,'en');
assert.equal(/[가-힣]/.test(nutrition),false);
assert.match(nutrition,/1850 kcal/);
assert.match(nutrition,/actual saved nutrition records/);

assert.equal(policy.isCoachText(fallback),true);
console.log(JSON.stringify({status:'PASS',scope:'exercise + food entity English + final local Coach full-English regression'},null,2));
