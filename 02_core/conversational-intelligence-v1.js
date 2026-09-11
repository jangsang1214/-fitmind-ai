(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangConversationalIntelligenceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-conversational-intelligence-v1.0.0';
const ORIGIN='garang-conversational-intelligence-v1';
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const numeric=value=>Number.isFinite(Number(value))?Number(value):null;
const koCount={한:1,하나:1,두:2,둘:2,세:3,셋:3,네:4,넷:4,다섯:5,여섯:6};
const EXERCISES=['벤치프레스','벤치','스쿼트','데드리프트','데드','랫풀다운','랫 풀다운','시티드로우','시티드 로우','바벨로우','바벨 로우','덤벨로우','덤벨 로우','풀업','턱걸이','오버헤드프레스','숄더프레스','레그프레스','레그익스텐션','레그컬','런지','힙쓰러스트','푸쉬업','푸시업','딥스','사이드레터럴레이즈','레터럴레이즈','케이블플라이','체스트프레스','바이셉컬','컬','트라이셉스','플랭크','크런치','로잉','사이클','자전거','수영','bench press','squat','deadlift','lat pulldown','seated row','row','pull-up','pullup','overhead press','leg press','lunge','push-up','pushup'];
const BODY_PARTS=['가슴','등','하체','어깨','팔','이두','삼두','코어','복근','전신','상체'];
const FOODS=['닭가슴살','닭고기','샐러드','계란','달걀','삼겹살','소고기','돼지고기','연어','참치','생선','두부','김치','라면','파스타','샌드위치','요거트','그릭요거트','우유','프로틴','단백질쉐이크','바나나','사과','과일','오트밀','고구마','감자','빵','피자','햄버거','떡볶이','초밥','김밥','비빔밥','볶음밥','국밥','치킨','rice','chicken','salad','egg','beef','pork','salmon','tuna','tofu','ramen','pasta','sandwich','yogurt','milk','protein shake','banana','oatmeal','pizza','burger'];
const RECOVERY_ACTIONS=['스트레칭','폼롤러','폼 롤러','마사지','걷기','산책','호흡','명상','요가','냉탕','온탕','사우나','낮잠','일찍 잤','일찍 잠','stretch','foam roll','massage','walk','breathing','meditation','yoga','nap'];

const DEFAULT_QUESTIONS={
  workout:{activity:{ko:'오늘 어떤 운동 했어? 종목만 말해줘도 돼.',en:'What did you train today? Just the exercise names are enough.'},volume:{ko:'대략 몇 세트 정도 했어?',en:'About how many sets did you do?'},duration:{ko:'몇 분 정도 했어?',en:'About how many minutes did you train?'}},
  nutrition:{foods:{ko:'뭐 먹었어? 기억나는 것만 말해줘.',en:'What did you eat? Just tell me what you remember.'},mealCount:{ko:'오늘 몇 끼 정도 먹었어?',en:'About how many meals did you have today?'}},
  running:{distance:{ko:'몇 km 정도 뛰었어?',en:'About how far did you run?'},duration:{ko:'몇 분 정도 걸렸어?',en:'About how many minutes did it take?'}},
  recovery:{sleepHours:{ko:'어젯밤 몇 시간 정도 잤어?',en:'About how many hours did you sleep last night?'},action:{ko:'오늘 회복을 위해 실제로 한 건 뭐가 있어?',en:'What did you actually do for recovery today?'}}
};

function localDate(date=new Date()){
  const d=date instanceof Date?date:new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function matchNumber(text,unit){
  const escaped=unit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const hit=String(text||'').match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${escaped}`,'i'));
  return hit?numeric(hit[1]):null;
}
function koreanCount(text,unit){
  const n=matchNumber(text,unit);if(n!==null)return n;
  for(const [word,value] of Object.entries(koCount))if(new RegExp(`${word}\\s*${unit}`).test(text))return value;
  return null;
}
function uniq(items){return [...new Set(items.map(clean).filter(Boolean))];}
function detectDomain(message,pending=null){
  if(pending?.domain)return pending.domain;
  const text=clean(message).toLowerCase();
  if(!text)return null;
  if(/(러닝|달리|뛰었|뛰었어|조깅|run\b|running|jog)/i.test(text))return'running';
  if(/(먹었|먹었어|먹음|식사|밥\s*먹|끼니|아침|점심|저녁|간식|meal|ate\b|eating|food)/i.test(text))return'nutrition';
  if(/(운동했|운동\s*했|헬스|웨이트|근력|벤치|스쿼트|데드|랫풀|로우|풀업|프레스|런지|workout|trained|lifted)/i.test(text))return'workout';
  if(/(피곤|회복|근육통|스트레스|잠|수면|잤|스트레칭|폼롤러|마사지|명상|요가|recovery|tired|sleep|sore|stretch)/i.test(text))return'recovery';
  return null;
}
function genericWorkout(text){return /^(나\s*)?(오늘\s*)?(운동|헬스|웨이트)(\s*(했어|했음|했다|함|완료))?[.!? ]*$/i.test(clean(text));}
function genericMeal(text){return /^(나\s*)?(오늘\s*)?(밥|식사)(\s*(먹었어|먹음|먹었다|했어))?[.!? ]*$/i.test(clean(text));}
function answerText(text){
  return clean(text).replace(/^(오늘|나는|나|그냥|대략|한|약)\s+/,'').replace(/(했어|했음|했다|먹었어|먹었음|먹었다|이야|야)$/,'').trim();
}
function extractWorkout(text,pending){
  const raw=clean(text),lower=raw.toLowerCase();
  const exercises=uniq(EXERCISES.filter(name=>lower.includes(name.toLowerCase())).map(name=>name.replace(/\s+/g,' ')));
  const focus=BODY_PARTS.find(name=>raw.includes(name))||null;
  const sets=koreanCount(raw,'세트');
  const reps=koreanCount(raw,'회');
  const duration=matchNumber(raw,'분');
  const weight=matchNumber(raw,'kg');
  const rpe=(()=>{const m=raw.match(/rpe\s*(\d+(?:\.\d+)?)/i);return m?numeric(m[1]):null;})();
  let activityText='';
  if(exercises.length)activityText=exercises.join(' + ');
  else if(focus)activityText=`${focus} 운동`;
  else if(pending?.expected==='activity'&&!genericWorkout(raw)&&!/^\d+[\s\S]*$/.test(raw))activityText=answerText(raw);
  return {exercises,focus,activityText,sets,reps,duration,weight,rpe};
}
function extractNutrition(text,pending){
  const raw=clean(text),lower=raw.toLowerCase();
  const foods=uniq(FOODS.filter(name=>lower.includes(name.toLowerCase())));
  const mealCount=koreanCount(raw,'끼');
  const grams=matchNumber(raw,'g');
  const occasion=['아침','점심','저녁','간식'].find(x=>raw.includes(x))||null;
  let foodsText=foods.join(' + ');
  if(!foodsText&&pending?.expected==='foods'&&!genericMeal(raw)&&raw.length>1&&!/^(응|어|네|예|맞아|몰라|기억안나)/.test(raw))foodsText=answerText(raw);
  return {foods,foodsText,mealCount,grams,occasion};
}
function extractRunning(text){
  const raw=clean(text);
  let distance=matchNumber(raw,'km');
  if(distance===null){const meters=matchNumber(raw,'m');if(meters!==null&&meters>=100)distance=meters/1000;}
  const duration=matchNumber(raw,'분');
  const pace=(()=>{const m=raw.match(/(\d{1,2})\s*[:분]\s*(\d{1,2})\s*(?:초)?\s*(?:\/\s*km|페이스)?/i);if(!m)return null;return `${String(m[1]).padStart(2,'0')}:${String(m[2]).padStart(2,'0')}`;})();
  return {distance,duration,pace};
}
function extractRecovery(text,pending){
  const raw=clean(text),lower=raw.toLowerCase();
  const sleepHours=(()=>{let n=matchNumber(raw,'시간');if(n===null){const m=raw.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i);n=m?numeric(m[1]):null;}return n;})();
  const duration=matchNumber(raw,'분');
  const actions=uniq(RECOVERY_ACTIONS.filter(name=>lower.includes(name.toLowerCase())));
  let actionText=actions.join(' + ');
  if(!actionText&&pending?.expected==='action'&&raw.length>1&&!/^(없어|안했어|못했어|몰라)/.test(raw))actionText=answerText(raw);
  const stateSignal=/(피곤|회복|근육통|스트레스|잠|수면|잤|tired|sleep|sore|stress)/i.test(raw);
  return {sleepHours,duration,actions,actionText,stateSignal};
}
function mergeSlots(domain,previous,text,pending){
  const before=clone(previous||{}),next=domain==='workout'?extractWorkout(text,pending):domain==='nutrition'?extractNutrition(text,pending):domain==='running'?extractRunning(text):extractRecovery(text,pending);
  const merged={...before};
  for(const [key,value] of Object.entries(next)){
    if(Array.isArray(value)){if(value.length)merged[key]=uniq([...(Array.isArray(merged[key])?merged[key]:[]),...value]);}
    else if(value!==null&&value!==undefined&&value!=='')merged[key]=value;
  }
  return merged;
}
function questionFor(domain,slot,kb,language='ko',state={}){
  const custom=kb?.domains?.[domain]?.questions?.[slot]?.[language]||DEFAULT_QUESTIONS?.[domain]?.[slot]?.[language]||'';
  if(domain==='workout'&&slot==='volume'&&String(state?.onboarding?.experience||state?.userModel?.experience||'').toLowerCase()==='advanced')return language==='en'?'Roughly how many sets for each exercise?':'각 종목은 대략 몇 세트씩 했어?';
  return custom;
}
function sourceIds(domain,kb){return clone(kb?.domains?.[domain]?.sourceIds||[]);}
function cancellation(text){return /^(취소|아니|아니야|됐어|기록하지마|기록하지 마|cancel|never mind|don'?t log)/i.test(clean(text));}
function buildPending(domain,slots,questionCount,expected,sourceMessageId,kb){return {version:VERSION,domain,slots:clone(slots),questionCount,expected,sourceMessageId:sourceMessageId||null,sourceIds:sourceIds(domain,kb),startedAt:new Date().toISOString()};}
function ask(domain,slot,slots,questionCount,sourceMessageId,kb,language,state){return {type:'ask',domain,slot,question:questionFor(domain,slot,kb,language,state),pending:buildPending(domain,slots,questionCount+1,slot,sourceMessageId,kb),sourceIds:sourceIds(domain,kb)};}
function baseMeta(domain,raw,date,confidence){return {date,source:'coach-conversation',origin:ORIGIN,conversationDomain:domain,conversationConfidence:confidence,conversationRaw:clean(raw),loggedAt:new Date().toISOString()};}
function workoutAction(slots,raw,date){
  const name=slots.activityText||slots.exercises?.join(' + ')||slots.focus?`${slots.focus||''} 운동`.trim():'운동';
  const record={...baseMeta('workout',raw,date,.96),name};
  if(slots.sets!==null&&slots.sets!==undefined)record.sets=slots.exercises?.length>1?slots.sets*slots.exercises.length:slots.sets;
  if(slots.reps!==null&&slots.reps!==undefined)record.reps=slots.reps;
  if(slots.duration!==null&&slots.duration!==undefined)record.duration=slots.duration;
  if(slots.weight!==null&&slots.weight!==undefined)record.weight=slots.weight;
  if(slots.rpe!==null&&slots.rpe!==undefined)record.rpe=slots.rpe;
  if(slots.exercises?.length)record.exercises=slots.exercises.map(name=>({name,sets:slots.sets??null}));
  if(slots.focus)record.focus=slots.focus;
  return {type:'record',domain:'workout',write:{kind:'create',domain:'workouts',record},summary:name,confidence:.96};
}
function nutritionAction(slots,raw,date){
  const name=slots.foodsText||slots.foods?.join(' + ')||'식사';
  const item={name};if(slots.grams!==null&&slots.grams!==undefined)item.grams=slots.grams;
  const record={...baseMeta('nutrition',raw,date,.94),name,items:[item]};if(slots.occasion)record.occasion=slots.occasion;if(slots.mealCount)record.mealCount=slots.mealCount;
  return {type:'record',domain:'nutrition',write:{kind:'create',domain:'meals',record},summary:name,confidence:.94};
}
function runningAction(slots,raw,date){
  const record={...baseMeta('running',raw,date,.97),name:'러닝'};if(slots.distance!==null&&slots.distance!==undefined)record.distance=slots.distance;if(slots.duration!==null&&slots.duration!==undefined)record.duration=slots.duration;if(slots.pace)record.pace=slots.pace;
  const summary=[slots.distance!=null?`${slots.distance}km`:'러닝',slots.duration!=null?`${slots.duration}분`:null].filter(Boolean).join(' · ');
  return {type:'record',domain:'running',write:{kind:'create',domain:'runs',record},summary,confidence:.97};
}
function recoveryAction(slots,raw,date){
  if(slots.actionText){return {type:'record',domain:'recovery',write:{kind:'recovery-action',record:{...baseMeta('recovery',raw,date,.93),name:slots.actionText,duration:slots.duration??null}},summary:slots.duration?`${slots.actionText} · ${slots.duration}분`:slots.actionText,confidence:.93};}
  const value=[slots.sleepHours!=null?`sleep=${slots.sleepHours}h`:null,clean(raw)].filter(Boolean).join(' · ');
  return {type:'record',domain:'recovery',write:{kind:'create',domain:'memory',record:{type:'recovery_observation',key:`recovery_observation_${date}_${Date.now()}`,value,importance:1,confidence:.9,userConfirmed:true,source:'coach-conversation',expiresAt:new Date(Date.now()+14*864e5).toISOString(),date}},summary:slots.sleepHours!=null?`수면 ${slots.sleepHours}시간`:'회복 상태',confidence:.9};
}
function decide(message,state={},pending=null,kb={},options={}){
  const raw=clean(message),language=options.language==='en'?'en':'ko',date=options.date||localDate();if(!raw)return {type:'ignore'};
  if(pending&&cancellation(raw))return {type:'cancel',domain:pending.domain,summary:language==='en'?'Logging cancelled.':'기록을 취소했어.'};
  const domain=detectDomain(raw,pending);if(!domain)return {type:'ignore'};
  const slots=mergeSlots(domain,pending?.slots,raw,pending||{}),questions=Math.max(0,Number(pending?.questionCount)||0),maxQuestions=Math.max(1,Number(kb?.policy?.maxQuestionsPerLog)||2),sourceMessageId=options.messageId||null;
  if(domain==='workout'){
    const activity=clean(slots.activityText)||slots.exercises?.length||slots.focus;
    if(!activity&&questions<maxQuestions)return ask(domain,'activity',slots,questions,sourceMessageId,kb,language,state);
    const strength=!!(slots.exercises?.length||slots.focus||/(웨이트|근력|헬스|세트|벤치|스쿼트|데드|프레스|로우|컬)/i.test(raw));
    if(strength&&slots.sets==null&&slots.duration==null&&questions<maxQuestions)return ask(domain,'volume',slots,questions,sourceMessageId,kb,language,state);
    if(activity)return workoutAction(slots,raw,date);
    return {type:'ignore'};
  }
  if(domain==='nutrition'){
    const foods=clean(slots.foodsText)||slots.foods?.length;
    if(!foods&&questions<maxQuestions)return ask(domain,'foods',slots,questions,sourceMessageId,kb,language,state);
    if(foods)return nutritionAction(slots,raw,date);
    return {type:'ignore'};
  }
  if(domain==='running'){
    if(slots.distance==null&&questions<maxQuestions)return ask(domain,'distance',slots,questions,sourceMessageId,kb,language,state);
    if(slots.duration==null&&questions<maxQuestions)return ask(domain,'duration',slots,questions,sourceMessageId,kb,language,state);
    return runningAction(slots,raw,date);
  }
  if(domain==='recovery'){
    if(slots.actionText)return recoveryAction(slots,raw,date);
    if(slots.stateSignal&&slots.sleepHours==null&&questions<maxQuestions)return ask(domain,'sleepHours',slots,questions,sourceMessageId,kb,language,state);
    if(slots.sleepHours!=null)return recoveryAction(slots,raw,date);
    if(questions<maxQuestions)return ask(domain,'action',slots,questions,sourceMessageId,kb,language,state);
  }
  return {type:'ignore'};
}

return Object.freeze({VERSION,ORIGIN,detectDomain,decide,localDate,extractWorkout,extractNutrition,extractRunning,extractRecovery,mergeSlots});
});
