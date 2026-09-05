(() => {
'use strict';

const dict=window.GARANG_UI_TRANSLATIONS||(window.GARANG_UI_TRANSLATIONS={});
Object.assign(dict,{
  /* Profile / user model */
  '몸과 목표 정보만 관리합니다.':'Manage only your body and goal information.',
  '기본 프로필':'Basic profile','목표':'Goal','사용자 모델 수정':'Edit user model',
  '근육 증가':'Muscle gain','체지방 감소':'Fat loss','러닝 퍼포먼스':'Running performance','퍼포먼스 향상':'Performance improvement','전반적인 건강':'Overall health',
  '입문':'Beginner','중급':'Intermediate','숙련':'Advanced','남성':'Male','여성':'Female',
  '주요 목표':'Primary goal','신체 모델':'Body model','운동 경험':'Training experience','주간 가능 횟수':'Available days per week','하루 가능 시간':'Available time per day','운동 선호 / 제약':'Training preferences / constraints',
  '예: 저녁 운동 선호, 무릎 충격 큰 동작은 피하고 싶음':'e.g. Prefer evening training; avoid high-impact knee movements',
  'GARANG 시작':'Start GARANG','나중에 설정':'Set later','입력값은 나중에 언제든 수정할 수 있으며 건너뛸 수 있습니다.':'You can change these values anytime or skip them for now.',

  /* Progress */
  '진행 상황':'Progress','기록을 쌓는 화면과 해석하는 화면을 분리했습니다.':'Tracking and interpretation are separated for clarity.',
  'Score 구성':'Score breakdown','체중 추세':'Weight trend','기간 내 체중 기록이 2개 이상 필요합니다.':'At least 2 weight records are required in this period.',
  '최근 7일':'Last 7 days','운동 일수':'Training days','평균 단백질':'Average protein','계획 수행률':'Plan completion',
  '최근 7일 운동 일관성을 높일 여지가 있습니다.':'Training consistency can improve over the last 7 days.',
  '최근 단백질 목표 달성률이 낮습니다.':'Recent protein target adherence is low.',
  '최근 기록이 안정적으로 유지되고 있습니다.':'Your recent records are staying consistent.',

  /* Local Coach */
  '현재 기록 기준으로 계획을 유지해도 좋습니다.':'Based on your current records, keeping the plan is appropriate.',
  '오늘 컨디션 체크인이 없어 최근 기록 중심으로 판단했습니다.':'There is no check-in for today, so this decision is based mainly on recent records.',
  '회복 우선':'Prioritize recovery',
  '수면 부족이 커서 고강도 훈련보다 회복을 우선합니다.':'Sleep is too low, so recovery should take priority over high-intensity training.',
  '수면이 4.5시간 미만입니다.':'Sleep is below 4.5 hours.',
  '오늘은 강도를 낮추고 움직임과 회복에 집중하는 편이 좋습니다.':'Lower the intensity today and focus on movement and recovery.',
  '근육통이 높은 부위를 피하고 다른 부위 또는 Zone 2로 대체합니다.':'Avoid the highly sore area and substitute another body part or Zone 2 work.',
  '최근 훈련량을 고려해 오늘 총 볼륨을 약 20% 낮춥니다.':'Reduce today’s total volume by about 20% based on your recent training load.',
  '외부 AI Gateway가 연결되어 있습니다.':'The external AI Gateway is connected.',
  '현재 외부 LLM 미연결 상태입니다. 위 내용은 실제 기록을 사용하는 로컬 규칙 엔진 분석입니다.':'The external LLM is not connected yet. This analysis comes from GARANG’s local rule engine using your actual records.',
  '외부 LLM은 현재 연결되지 않았습니다. GARANG의 실제 데이터 기반 규칙 엔진으로 답할 수 있는 범위는 운동 강도, 오늘 상태, 식단 목표, 최근 기록 분석입니다.':'The external LLM is not connected yet. GARANG’s local data-driven engine can currently answer about training intensity, today’s status, nutrition targets, and recent records.',
  '외부 AI 연결에 실패했습니다. 가짜 응답으로 처리하지 않고 로컬 Coach Engine 분석을 표시합니다.':'The external AI connection failed. GARANG will show its local Coach Engine analysis instead of fabricating a response.',
  '로컬 Coach Engine V1 분석':'Local Coach Engine V1 analysis',
  '사진 자동 인식은 Vision API 연결 전까지 실제 인식했다고 표시하지 않습니다.':'Photo recognition will not be presented as completed until the Vision API is connected.',
  '오늘 결정':'Today’s decision','기준선 생성 중':'Building baseline'
});

const previousDynamic=window.GarangTranslateDynamic;
const replaceAll=(text,from,to)=>text.split(from).join(to);
const embeddedTerms=[
 ['스미스머신','Smith machine'],['인클라인','Incline'],['디클라인','Decline'],['덤벨','Dumbbell'],['바벨','Barbell'],['체스트프레스','Chest press'],['벤치프레스','Bench press'],['랫풀다운','Lat pulldown'],['숄더프레스','Shoulder press'],['레그프레스','Leg press'],['레그익스텐션','Leg extension'],['레그컬','Leg curl'],['데드리프트','Deadlift'],['스쿼트','Squat'],['런지','Lunge'],['풀업','Pull-up'],['친업','Chin-up'],['딥스','Dips'],['푸시업','Push-up'],['플라이','Fly'],['프레스','Press'],['컬','Curl'],['익스텐션','Extension'],['레이즈','Raise'],['크런치','Crunch'],['플랭크','Plank'],['브리지','Bridge'],['킥백','Kickback'],['풀오버','Pullover'],['슈러그','Shrug'],['케이블','Cable'],['머신','Machine'],['가슴','Chest'],['등','Back'],['어깨','Shoulders'],['하체','Lower body'],['이두','Biceps'],['삼두','Triceps'],['코어','Core'],['전신','Full body']
];
function translateDynamic(source,target){
  let out=typeof previousDynamic==='function'?previousDynamic(source,target):source;
  if(target!=='en')return out;
  if(typeof out!=='string')return out;

  const replacements=[
    [/^최고 중량\s+(kg|lb)$/,'Best weight $1'],[/^최고 볼륨\s+(kg|lb)$/,'Best volume $1'],[/^최장 러닝\s+(km|mi)$/,'Longest run $1'],
    [/^총 볼륨\s+(kg|lb)$/,'Total volume $1'],[/^러닝\s+(km|mi)$/,'Running $1'],
    [/수면\s+([0-9.]+)시간\s*·\s*에너지\s*([0-9.]+)\/5\s*·\s*스트레스\s*([0-9.]+)\/5/g,'Sleep $1 h · Energy $2/5 · Stress $3/5'],
    [/회복 지표가\s*([0-9.]+)점으로 낮습니다\./g,'Recovery score is low at $1.'],
    [/근육통\s*([0-9.]+)\/5/g,'Soreness $1/5'],
    [/최근 3일 운동 기록\s*(\d+)개가 있습니다\./g,'There are $1 workout records in the last 3 days.'],
    [/최근 3일 운동 기록\s*(\d+)개를 반영했습니다\./g,'Included $1 workout records from the last 3 days.'],
    [/최근 러닝\s*(\d+)회를 함께 반영했습니다\./g,'Also included $1 recent runs.'],
    [/오늘 Planner의 “([^”]+)” 일정과 함께 판단했습니다\./g,'Judged together with today’s Planner item “$1”.'],
    [/오늘 단백질\s*([0-9.]+)g\s*\/\s*목표 약\s*([0-9.]+)g입니다\.\s*([0-9.]+)g 정도 여유가 있습니다\.\s*오늘 섭취는\s*([0-9.]+)\s*kcal입니다\./g,'Today’s protein is $1 g / about $2 g target. You have about $3 g remaining. Today’s intake is $4 kcal.'],
    [/운동\s*(\d+)개,\s*식사\s*(\d+)개,\s*러닝\s*(\d+)개,\s*Body\s*(\d+)개 기록을 현재 사용자 Context로 보고 있습니다\./g,'The current user context includes $1 workouts, $2 meals, $3 runs, and $4 body records.'],
    [/최근 운동은\s*([^\n]+?)\s*([0-9.]+)kg\s*×\s*([0-9.]+)\s*×\s*([0-9.]+)세트입니다\./g,'Your latest workout was $1 $2 kg × $3 × $4 sets.'],
    [/오늘 결정:\s*/g,'Today’s decision: '],[/GARANG Score:\s*기준선 생성 중/g,'GARANG Score: Building baseline']
  ];
  for(const [pattern,replacement] of replacements)out=out.replace(pattern,replacement);
  const phrases={
    '현재 기록 기준으로 계획을 유지해도 좋습니다.':'Based on your current records, keeping the plan is appropriate.',
    '오늘 컨디션 체크인이 없어 최근 기록 중심으로 판단했습니다.':'There is no check-in for today, so this decision is based mainly on recent records.',
    '수면 부족이 커서 고강도 훈련보다 회복을 우선합니다.':'Sleep is too low, so recovery should take priority over high-intensity training.',
    '수면이 4.5시간 미만입니다.':'Sleep is below 4.5 hours.',
    '오늘은 강도를 낮추고 움직임과 회복에 집중하는 편이 좋습니다.':'Lower the intensity today and focus on movement and recovery.',
    '근육통이 높은 부위를 피하고 다른 부위 또는 Zone 2로 대체합니다.':'Avoid the highly sore area and substitute another body part or Zone 2 work.',
    '최근 훈련량을 고려해 오늘 총 볼륨을 약 20% 낮춥니다.':'Reduce today’s total volume by about 20% based on your recent training load.',
    '로컬 Coach Engine V1 분석':'Local Coach Engine V1 analysis',
    '사진 자동 인식은 Vision API 연결 전까지 실제 인식했다고 표시하지 않습니다.':'Photo recognition will not be presented as completed until the Vision API is connected.',
    '현재 외부 LLM 미연결 상태입니다. 위 내용은 실제 기록을 사용하는 로컬 규칙 엔진 분석입니다.':'The external LLM is not connected yet. This analysis comes from GARANG’s local rule engine using your actual records.',
    '외부 LLM은 현재 연결되지 않았습니다. GARANG의 실제 데이터 기반 규칙 엔진으로 답할 수 있는 범위는 운동 강도, 오늘 상태, 식단 목표, 최근 기록 분석입니다.':'The external LLM is not connected yet. GARANG’s local data-driven engine can currently answer about training intensity, today’s status, nutrition targets, and recent records.',
    '외부 AI 연결에 실패했습니다. 가짜 응답으로 처리하지 않고 로컬 Coach Engine 분석을 표시합니다.':'The external AI connection failed. GARANG will show its local Coach Engine analysis instead of fabricating a response.'
  };
  for(const [from,to] of Object.entries(phrases))out=replaceAll(out,from,to);
  if(/[가-힣]/.test(out))for(const [ko,en] of embeddedTerms)out=replaceAll(out,ko,en);
  return out;
}
window.GarangTranslateDynamic=translateDynamic;

/* Keep canonical Korean values in persisted user-model data while English labels are shown. */
const goalCanonical={
  '근육 증가':'근육 증가','Muscle gain':'근육 증가',
  '체지방 감소':'체지방 감소','Fat loss':'체지방 감소',
  '러닝 퍼포먼스':'러닝 퍼포먼스','Running performance':'러닝 퍼포먼스',
  '퍼포먼스 향상':'퍼포먼스 향상','Performance improvement':'퍼포먼스 향상','Improve performance':'퍼포먼스 향상',
  '전반적인 건강':'전반적인 건강','Overall health':'전반적인 건강'
};
function protectCanonicalUserModel(root=document){
  const selects=[];
  if(root?.matches?.('#oGoal'))selects.push(root);
  root?.querySelectorAll?.('#oGoal').forEach(x=>selects.push(x));
  for(const select of selects){
    [...select.options].forEach(option=>{
      const label=(option.textContent||'').trim();
      const canonical=option.dataset.garangCanonicalGoal||goalCanonical[label]||goalCanonical[option.value];
      if(!canonical)return;
      option.dataset.garangCanonicalGoal=canonical;
      option.value=canonical;
    });
  }
}

/* Future AI Gateway calls always receive the active response language. */
const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  try{
    const endpoint=window.GARANG_SERVICES?.coachEndpoint;
    const url=typeof input==='string'?input:input?.url;
    if(endpoint&&url===endpoint&&init?.body&&typeof init.body==='string'){
      const payload=JSON.parse(init.body);
      const english=document.documentElement.lang==='en';
      const language=english?'en':'ko',locale=english?'en-US':'ko-KR',responseLanguage=english?'English':'Korean';
      payload.language=language;
      payload.locale=locale;
      payload.responseLanguage=responseLanguage;
      payload.context={...(payload.context&&typeof payload.context==='object'?payload.context:{}),uiLanguage:language,locale,responseLanguage};
      init={...init,body:JSON.stringify(payload)};
    }
  }catch(error){console.warn('[GARANG] coach language policy fallback',error);}
  return nativeFetch(input,init);
};

const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
    mutation.addedNodes.forEach(node=>{if(node.nodeType===1)protectCanonicalUserModel(node);});
    if(mutation.type==='characterData')protectCanonicalUserModel(mutation.target.parentElement||document);
  }
});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>protectCanonicalUserModel(document),{once:true});
else protectCanonicalUserModel(document);
})();
