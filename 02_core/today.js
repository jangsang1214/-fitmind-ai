(function(root){
 'use strict';
 const ENGINE_VERSION='coach-v0.1', CHECKIN_SCHEMA_VERSION=1;
 const THRESHOLDS=Object.freeze({lowEnergy:2,highSoreness:4,shortSleepHours:5,volumeScale:.7});
 const PART_LABELS=Object.freeze({legs:'하체',chest:'가슴',back:'등',shoulders:'어깨',arms:'팔',core:'코어'});
 const numberOrNull=value=>value==null||(typeof value==='string'&&!value.trim())?null:Number.isFinite(Number(value))?Number(value):null;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const localDate=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const timezone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch{return 'UTC';}};
 function normalizeCheckin(input={},previous=null,now=new Date()){
  const soreness={};
  for(const [part,value] of Object.entries(input.soreness||{})){const n=numberOrNull(value);if(n!==null)soreness[String(part)]=clamp(n,0,5);}
  const sleepHours=numberOrNull(input.sleepHours),energy=numberOrNull(input.energy),stress=numberOrNull(input.stress),availableMinutes=numberOrNull(input.availableMinutes);
  return {
   id:String(previous?.id||input.id||`checkin_${localDate(now)}`),date:String(input.date||previous?.date||localDate(now)),timezone:String(input.timezone||previous?.timezone||timezone()),
   sleepHours:sleepHours===null?null:clamp(sleepHours,0,24),energy:energy===null?null:clamp(energy,1,5),stress:stress===null?null:clamp(stress,1,5),soreness,
   availableMinutes:availableMinutes===null?null:Math.max(0,Math.round(availableMinutes)),notes:String(input.notes||'').slice(0,500),painCaution:input.painCaution===true,
   schemaVersion:CHECKIN_SCHEMA_VERSION,revision:Math.max(1,Number(previous?.revision||0)+1),createdAt:String(previous?.createdAt||now.toISOString()),updatedAt:now.toISOString()
  };
 }
 function evaluate({checkin=null,plan=null,recentWorkouts=[],exerciseMeta=[]}={}){
  const base={engineVersion:ENGINE_VERSION,status:'needs_checkin',reasonCodes:[],reasons:[],information:'missing',planId:plan?.id||null,adjustment:null};
  if(!checkin)return {...base,reasonCodes:['CHECKIN_REQUIRED'],reasons:['오늘 상태를 입력하면 기록에 근거해 운동을 조정할 수 있습니다.']};
  const result={...base,status:'ready',information:plan?'sufficient':'partial'};
  const highSoreness=Object.entries(checkin.soreness||{}).filter(([,value])=>Number(value)>=THRESHOLDS.highSoreness).map(([part])=>part);
  if(checkin.availableMinutes===0){result.status='no_time';result.reasonCodes.push('NO_AVAILABLE_TIME');result.reasons.push('오늘 운동 가능 시간이 0분으로 입력되었습니다.');result.adjustment={type:'skip',summary:'운동 시작 대신 휴식 또는 일정 확인'};return result;}
  if(checkin.painCaution){result.status='caution';result.reasonCodes.push('PAIN_CAUTION');result.reasons.push('통증·부상 관련 주의가 표시되어 고강도 진행이나 증량을 제안하지 않습니다.');result.adjustment={type:'caution',summary:'강도 조정 또는 운동 건너뛰기 선택'};return result;}
  if(checkin.energy!==null&&checkin.energy<=THRESHOLDS.lowEnergy){result.status='light';result.reasonCodes.push('LOW_ENERGY');result.reasons.push(`에너지 ${checkin.energy}/5 입력을 기준으로 휴식 또는 저강도 선택을 제안합니다.`);result.adjustment={type:'reduce_intensity',summary:'휴식 또는 저강도 세션 선택',volumeScale:THRESHOLDS.volumeScale};}
  if(highSoreness.length){if(result.status==='ready')result.status='adjusted';result.reasonCodes.push('HIGH_SORENESS');result.reasons.push(`${highSoreness.map(x=>PART_LABELS[x]||x).join(', ')} 근육통이 4 이상이어서 해당 부위 운동 제외를 제안합니다.`);result.adjustment={type:'exclude_parts',parts:highSoreness,summary:'근육통이 높은 부위 제외 제안'};}
  if(checkin.sleepHours!==null&&checkin.sleepHours<THRESHOLDS.shortSleepHours){if(result.status==='ready')result.status='light';result.reasonCodes.push('SHORT_SLEEP');result.reasons.push(`수면 ${checkin.sleepHours}시간 입력을 기준으로 세트 수나 운동 시간 축소를 제안합니다.`);result.adjustment=result.adjustment||{type:'reduce_volume',summary:'세트 수 또는 운동 시간 축소',volumeScale:THRESHOLDS.volumeScale};}
  if(!plan){if(result.status==='ready')result.status='insufficient_data';result.reasonCodes.push('NO_TODAY_PLAN');result.reasons.push('오늘 운동 계획이 없어 유지 또는 조정할 기준이 부족합니다.');}
  if(checkin.availableMinutes!==null&&plan?.duration&&checkin.availableMinutes<Number(plan.duration)){if(result.status==='ready')result.status='adjusted';result.reasonCodes.push('TIME_LIMIT');result.reasons.push(`가능 시간 ${checkin.availableMinutes}분이 계획 시간보다 짧아 축소안을 제안합니다.`);result.adjustment={type:'fit_time',minutes:checkin.availableMinutes,summary:`${checkin.availableMinutes}분 안으로 계획 축소`};}
  if(!result.reasonCodes.length){result.reasonCodes.push('PLAN_READY');result.reasons.push('입력한 상태와 확인 가능한 계획에서 조정이 필요한 조건이 발견되지 않았습니다.');}
  return result;
 }
 root.GarangToday={ENGINE_VERSION,CHECKIN_SCHEMA_VERSION,THRESHOLDS,PART_LABELS,localDate,timezone,normalizeCheckin,evaluate};
})(typeof window==='undefined'?globalThis:window);
