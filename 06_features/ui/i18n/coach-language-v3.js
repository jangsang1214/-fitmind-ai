(() => {
'use strict';

const dict=window.GARANG_UI_TRANSLATIONS||(window.GARANG_UI_TRANSLATIONS={});
Object.assign(dict,{
  '현재 외부 AI 연결이 없어서 GARANG 로컬 코치로 응답하고 있습니다. 운동 강도, 회복 상태, 식단, 최근 기록에 대해서는 실제 저장 데이터를 기준으로 분석할 수 있습니다.':'The external AI is not connected yet, so GARANG is responding with its local Coach Engine. It can still analyze training intensity, recovery, nutrition, and recent records from your actual saved data.',
  '오늘 체크인이 아직 없습니다. 수면, 에너지, 스트레스, 근육통을 저장하면 GARANG이 오늘 훈련 강도를 실제 기록에 맞춰 판단할 수 있습니다.':'There is no check-in for today yet. Save sleep, energy, stress, and soreness so GARANG can judge today’s training intensity from your actual data.',
  '수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다.':'Sleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.',
  '지금은 실제 저장된 식단 기록만 사용해 판단했습니다.':'This judgment uses only your actual saved nutrition records.',
  '고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다.':'A recovery session or reduced-volume session is better than high intensity today.',
  '평소보다 약간 보수적인 강도가 적절합니다.':'A slightly more conservative intensity than usual is appropriate today.',
  '현재 기록상 정상 훈련을 진행할 수 있는 범위입니다.':'Your current records support a normal training session today.'
});

const previous=window.GarangTranslateDynamic;
const entity=()=>window.GarangEntityI18n;
const replaceAll=(text,from,to)=>String(text).split(from).join(to);
const isCoachText=text=>/(외부 AI|외부 LLM|로컬|로Curl|Coach Engine|체크인|회복 지표|저장된 운동 기록|오늘 기록 기준|최근 기록:|오늘 단백질|현재 사용자 Context)/i.test(String(text||''));
function exerciseName(name){return entity()?.translateExercise?.(name)||name;}

function translateCoach(source){
  let out=String(source??'');
  const exact=dict[out.trim()];if(exact)return out.replace(out.trim(),exact);

  /* Repair the old token-level corruption first, then translate the whole Coach sentence. */
  out=replaceAll(out,'로Curl','로컬');

  out=out.replace(/오늘 기록 기준으로\s*([0-9.]+)\s*kcal,\s*단백질\s*([0-9.]+)g입니다\.\s*목표 단백질을 약\s*([0-9.]+)g으로 보면\s*([0-9.]+)g 정도 남아 있습니다\.\s*지금은 실제 저장된 식단 기록만 사용해 판단했습니다\./gs,
    'Based on today’s records: $1 kcal and $2 g protein. With a protein target of about $3 g, roughly $4 g remains. This judgment uses only your actual saved nutrition records.');

  out=out.replace(/현재 저장된 운동 기록은\s*(\d+)개입니다\.(?:\s*최근 기록:\s*([^\n]+?)\s+([0-9.]+)kg\s*×\s*([0-9.]+)\s*×\s*([0-9.]+)세트\.)?\s*수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다\./gs,
    (_,count,name,weight,reps,sets)=>`There are ${count} saved workout records.${name?`\nLatest record: ${exerciseName(name)} ${weight} kg × ${reps} × ${sets} sets.`:''}\n\nSleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.`);

  out=out.replace(/오늘 회복 지표는 약\s*([0-9.]+)\/100입니다\.\s*수면\s*([0-9.]+)시간\s*·\s*에너지\s*([0-9.]+)\/5\s*·\s*스트레스\s*([0-9.]+)\/5\s*·\s*근육통\s*([0-9.]+)\/5를 반영했습니다\./gs,
    'Today’s recovery score is about $1/100.\nSleep $2 h · Energy $3/5 · Stress $4/5 · Soreness $5/5 are included.');

  out=out.replace(/오늘 단백질\s*([0-9.]+)g\s*\/\s*목표 약\s*([0-9.]+)g입니다\.\s*([0-9.]+)g 정도 여유가 있습니다\.\s*오늘 섭취는\s*([0-9.]+)\s*kcal입니다\./g,
    'Today’s protein is $1 g / about $2 g target. About $3 g remains. Today’s intake is $4 kcal.');

  out=out.replace(/운동\s*(\d+)개,\s*식사\s*(\d+)개,\s*러닝\s*(\d+)개,\s*Body\s*(\d+)개 기록을 현재 사용자 Context로 보고 있습니다\./g,
    'The current user context includes $1 workouts, $2 meals, $3 runs, and $4 body records.');
  out=out.replace(/최근 운동은\s*([^\n]+?)\s+([0-9.]+)kg\s*×\s*([0-9.]+)\s*×\s*([0-9.]+)세트입니다\./g,
    (_,name,weight,reps,sets)=>`Your latest workout was ${exerciseName(name)} ${weight} kg × ${reps} × ${sets} sets.`);

  const phrases={
    '현재 외부 AI 연결이 없어서 GARANG 로컬 코치로 응답하고 있습니다. 운동 강도, 회복 상태, 식단, 최근 기록에 대해서는 실제 저장 데이터를 기준으로 분석할 수 있습니다.':'The external AI is not connected yet, so GARANG is responding with its local Coach Engine. It can still analyze training intensity, recovery, nutrition, and recent records from your actual saved data.',
    '오늘 체크인이 아직 없습니다. 수면, 에너지, 스트레스, 근육통을 저장하면 GARANG이 오늘 훈련 강도를 실제 기록에 맞춰 판단할 수 있습니다.':'There is no check-in for today yet. Save sleep, energy, stress, and soreness so GARANG can judge today’s training intensity from your actual data.',
    '수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다.':'Sleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.',
    '지금은 실제 저장된 식단 기록만 사용해 판단했습니다.':'This judgment uses only your actual saved nutrition records.',
    '고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다.':'A recovery session or reduced-volume session is better than high intensity today.',
    '평소보다 약간 보수적인 강도가 적절합니다.':'A slightly more conservative intensity than usual is appropriate today.',
    '현재 기록상 정상 훈련을 진행할 수 있는 범위입니다.':'Your current records support a normal training session today.',
    '현재 기록 기준으로 계획을 유지해도 좋습니다.':'Based on your current records, keeping the plan is appropriate.',
    '오늘 컨디션 체크인이 없어 최근 기록 중심으로 판단했습니다.':'There is no check-in for today, so this decision is based mainly on recent records.',
    '수면 부족이 커서 고강도 훈련보다 회복을 우선합니다.':'Sleep is too low, so recovery should take priority over high-intensity training.',
    '수면이 4.5시간 미만입니다.':'Sleep is below 4.5 hours.',
    '오늘은 강도를 낮추고 움직임과 회복에 집중하는 편이 좋습니다.':'Lower the intensity today and focus on movement and recovery.',
    '근육통이 높은 부위를 피하고 다른 부위 또는 Zone 2로 대체합니다.':'Avoid the highly sore area and substitute another body part or Zone 2 work.',
    '최근 훈련량을 고려해 오늘 총 볼륨을 약 20% 낮춥니다.':'Reduce today’s total volume by about 20% based on your recent training load.',
    '현재 외부 LLM 미연결 상태입니다. 위 내용은 실제 기록을 사용하는 로컬 규칙 엔진 분석입니다.':'The external LLM is not connected yet. This analysis comes from GARANG’s local rule engine using your actual records.',
    '외부 LLM은 현재 연결되지 않았습니다. GARANG의 실제 데이터 기반 규칙 엔진으로 답할 수 있는 범위는 운동 강도, 오늘 상태, 식단 목표, 최근 기록 분석입니다.':'The external LLM is not connected yet. GARANG’s local data-driven engine can currently answer about training intensity, today’s status, nutrition targets, and recent records.',
    '외부 AI 연결에 실패했습니다. 가짜 응답으로 처리하지 않고 로컬 Coach Engine 분석을 표시합니다.':'The external AI connection failed. GARANG will show its local Coach Engine analysis instead of fabricating a response.',
    '로컬 Coach Engine V1 분석':'Local Coach Engine V1 analysis','오늘 결정:':'Today’s decision:','기준선 생성 중':'Building baseline'
  };
  for(const [ko,en] of Object.entries(phrases))out=replaceAll(out,ko,en);

  out=out.replace(/수면\s*([0-9.]+)시간\s*·\s*에너지\s*([0-9.]+)\/5\s*·\s*스트레스\s*([0-9.]+)\/5/g,'Sleep $1 h · Energy $2/5 · Stress $3/5');
  out=out.replace(/근육통\s*([0-9.]+)\/5/g,'Soreness $1/5');
  out=out.replace(/회복 지표가\s*([0-9.]+)점으로 낮습니다\./g,'Recovery score is low at $1.');
  out=out.replace(/최근 3일 운동 기록\s*(\d+)개가 있습니다\./g,'There are $1 workout records in the last 3 days.');
  out=out.replace(/최근 3일 운동 기록\s*(\d+)개를 반영했습니다\./g,'Included $1 workout records from the last 3 days.');
  out=out.replace(/최근 러닝\s*(\d+)회를 함께 반영했습니다\./g,'Also included $1 recent runs.');
  out=out.replace(/오늘 Planner의 “([^”]+)” 일정과 함께 판단했습니다\./g,'Judged together with today’s Planner item “$1”.');

  out=replaceAll(out,'로컬','local');
  return out;
}

window.GarangTranslateDynamic=function(source,target){
  /* Coach text must be translated before the generic token translator can touch it.
     This prevents words such as 로컬 from ever becoming mixed strings such as 로Curl. */
  if(target==='en'&&typeof source==='string'&&isCoachText(source)){
    const direct=translateCoach(source);
    if(!/[가-힣]/.test(direct))return direct;
    const fallback=typeof previous==='function'?previous(direct,target):direct;
    return translateCoach(fallback);
  }
  const out=typeof previous==='function'?previous(source,target):source;
  if(target!=='en'||typeof out!=='string')return out;
  return isCoachText(out)?translateCoach(out):out;
};

window.GarangCoachLanguagePolicy=Object.freeze({translate:translateCoach,isCoachText});
})();
