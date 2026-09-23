(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GarangIntelligenceEpisodeV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='intelligence-episode-v1.1.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v.filter(object):[];
const clean=v=>String(v??'').trim();
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const dateKey=v=>clean(v).slice(0,10)||null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
function eventName(row){return clean(row?.event||row?.action).toLowerCase();}
function recommendationId(row){return clean(row?.recommendationId||row?.args?.recommendationId||row?.callId||row?.targetId)||null;}
function hourOf(value){const m=clean(value).match(/T(\d{2}):/);return m?Number(m[1]):null;}
function timeBucket(value){const h=hourOf(value);if(h===null)return null;if(h<6)return 'overnight';if(h<12)return 'morning';if(h<17)return 'afternoon';if(h<22)return 'evening';return 'night';}
function dayOfWeek(date){if(!date)return null;const d=new Date(`${date}T12:00:00Z`);return Number.isNaN(d.getTime())?null:d.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'}).toLowerCase();}
function resolution(events,id){
 const rows=list(events).filter(row=>recommendationId(row)===id).sort((a,b)=>String(a?.at||a?.createdAt||'').localeCompare(String(b?.at||b?.createdAt||'')));
 const map={write_confirmed:'accepted',recommendation_accepted:'accepted',write_modified:'edited',recommendation_modified:'edited',write_rejected:'rejected',recommendation_rejected:'rejected',recommendation_dismissed:'dismissed',recommendation_ignored:'ignored'};
 const row=rows.slice().reverse().find(x=>map[eventName(x)]);
 return row?{status:map[eventName(row)],at:clean(row.at||row.createdAt)||null,eventId:clean(row.id)||null}:{status:'unresolved',at:null,eventId:null};
}
function planFor(state,cycle){return list(state?.planner).find(row=>clean(row?.id)===clean(cycle?.planId)||clean(row?.recommendationId)===clean(cycle?.recommendationId))||null;}
function checkinFor(state,date){return list(state?.dailyCheckins||state?.checkins).filter(row=>dateKey(row?.date)===date).slice(-1)[0]||null;}
function nextCheckin(state,date){return list(state?.dailyCheckins||state?.checkins).filter(row=>dateKey(row?.date)>date).sort((a,b)=>dateKey(a.date).localeCompare(dateKey(b.date)))[0]||null;}
function recoveryDelta(before={},after={}){
 const energyA=finite(before?.energy??before?.energyLevel),energyB=finite(after?.energy??after?.energyLevel),stressA=finite(before?.stress??before?.stressLevel),stressB=finite(after?.stress??after?.stressLevel),sleepA=finite(before?.sleepHours??before?.sleep),sleepB=finite(after?.sleepHours??after?.sleep);
 const parts=[];
 if(energyA!==null&&energyB!==null)parts.push(clamp((energyB-energyA)/4,-1,1));
 if(stressA!==null&&stressB!==null)parts.push(clamp((stressA-stressB)/4,-1,1));
 if(sleepA!==null&&sleepB!==null)parts.push(clamp((sleepB-sleepA)/3,-1,1));
 return parts.length?round(parts.reduce((a,b)=>a+b,0)/parts.length,3):null;
}
function build(stateInput={},graphInput={},options={}){
 const state=object(stateInput)?stateInput:{},graph=object(graphInput)?graphInput:{},events=list(state.actionLog),episodes=[];
 for(const cycle of list(graph.cycles)){
  const recommendationIdValue=clean(cycle?.recommendationId)||null;if(!recommendationIdValue)continue;
  const date=dateKey(cycle?.date),plan=planFor(state,cycle),checkin=checkinFor(state,date),after=nextCheckin(state,date),response=resolution(events,recommendationIdValue),completion=finite(cycle?.execution?.score),responseAt=response.at||clean(plan?.createdAt||plan?.updatedAt)||null;
  const episode={
   version:VERSION,episodeId:'episode_'+hash([cycle?.decisionId,recommendationIdValue,cycle?.planId,date].filter(Boolean).join('|')),date,
   context:{goal:clean(state?.profile?.goal||state?.onboarding?.goal)||null,readiness:finite(checkin?.readiness??checkin?.energy),sleepHours:finite(checkin?.sleepHours??checkin?.sleep),stress:finite(checkin?.stress??checkin?.stressLevel),soreness:finite(checkin?.soreness),availableMinutes:finite(checkin?.availableMinutes),timeBucket:timeBucket(responseAt),dayOfWeek:dayOfWeek(date)},
   decision:{decisionId:clean(cycle?.decisionId)||null,mode:clean(cycle?.decisionMode)||null,policyVersion:clean(plan?.decisionEngineVersion)||null},
   recommendation:{recommendationId:recommendationIdValue,duration:finite(plan?.duration),intensityScale:finite(plan?.intensityScale),volumeScale:finite(plan?.volumeScale),revision:finite(cycle?.recommendationRevision)},
   userResponse:response,
   execution:{executionId:clean(cycle?.executionId)||null,status:clean(cycle?.execution?.status)||null,completionRatio:completion===null?null:clamp(completion/100,0,1)},
   outcome:{outcomeId:clean(cycle?.outcomeId)||null,classification:clean(cycle?.outcome?.classification)||null,score:finite(cycle?.outcome?.score??cycle?.outcome?.rate),nextCheckin:{date:dateKey(after?.date),energy:finite(after?.energy??after?.energyLevel),sleepHours:finite(after?.sleepHours??after?.sleep),stress:finite(after?.stress??after?.stressLevel)},recoveryDelta:recoveryDelta(checkin,after)},
   attribution:{complete:cycle?.attribution?.complete===true,confidence:cycle?.attribution?.complete===true?1:cycle?.outcomeId?0.7:cycle?.executionId?0.5:0.25}
  };
  episodes.push(Object.freeze(episode));
 }
 return Object.freeze({version:VERSION,asOf:String(graph.asOf||options.asOf||new Date().toISOString().slice(0,10)),windowDays:Math.max(7,Math.min(56,Number(options.days||graph.lookbackDays)||28)),episodes:Object.freeze(episodes),guardrails:Object.freeze({derivedOnly:true,noRawChatRequired:true,noCausalClaim:true,noSilentMutation:true})});
}
function compactForContext(value={}){const v=object(value)?value:{};return {version:String(v.version||VERSION),asOf:String(v.asOf||''),windowDays:Number(v.windowDays)||28,episodes:list(v.episodes).slice(-12).map(x=>({episodeId:x.episodeId,date:x.date,context:x.context,decision:x.decision,recommendation:x.recommendation,userResponse:x.userResponse,execution:x.execution,outcome:x.outcome,attribution:x.attribution})),guardrails:{derivedOnly:true,noRawChatRequired:true,noCausalClaim:true,noSilentMutation:true}};}
return Object.freeze({VERSION,build,compactForContext,timeBucket,recoveryDelta});

});
