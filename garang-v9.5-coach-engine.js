/* GARANG Coach Engine V9.5 — true primary AI coach controller
   V8.8.2 runtime preserved. V7.7 controller is intentionally not loaded.
*/
(function(){
"use strict";
const VERSION="9.5.0", KEY="fitmind_v2";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const n=x=>Number.isFinite(Number(x))?Number(x):0;
function db(){try{return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return{}}}
function save(){try{if(window.__FitMindV6Save)window.__FitMindV6Save();else localStorage.setItem(KEY,JSON.stringify(db()))}catch(e){}}
function ensure(){const d=db();d.chat=Array.isArray(d.chat)?d.chat:[];d.chatSessions=Array.isArray(d.chatSessions)?d.chatSessions:[];d.coachMemory=d.coachMemory&&typeof d.coachMemory==="object"?d.coachMemory:{};d.coachMemory.facts=Array.isArray(d.coachMemory.facts)?d.coachMemory.facts:[];d.coachMemory.preferences=Array.isArray(d.coachMemory.preferences)?d.coachMemory.preferences:[];d.coachMemory.goals=Array.isArray(d.coachMemory.goals)?d.coachMemory.goals:[];return d}
function arr(k){const d=ensure();return Array.isArray(d[k])?d[k]:[]}
function iso(x){return String(x?.date||x?.createdAt||"").slice(0,10)}
function profile(){return ensure().profile||{}}
function goal(){const d=ensure(),p=profile(),g=d.coachMemory?.goal;return typeof g==="object"?g:{type:g||p.goal||"muscle_gain",targetWeight:p.targetWeight??null,targetCalories:p.recommendedCalories??p.tdee??null,targetProtein:p.targetProtein??n(p.weight)*1.8}}
function exerciseName(w){return w.exercise||w.name||w.exercise_name||w.exerciseId||w.title||"운동"}
function volume(w){if(n(w.volume))return n(w.volume);if(Array.isArray(w.setDetails))return w.setDetails.reduce((s,x)=>s+n(x.w??x.weight)*n(x.r??x.reps),0);if(Array.isArray(w.sets))return w.sets.reduce((s,x)=>s+n(x.weight??x.w)*n(x.reps??x.r),0);return n(w.weight??w.load)*n(w.reps??w.repeat)*Math.max(1,n(w.sets))}
function workouts(days=30){const cut=Date.now()-days*864e5;return arr("workouts").filter(w=>{const t=new Date(w.date||w.createdAt||0).getTime();return !t||t>=cut})}
function meals(days=30){const cut=Date.now()-days*864e5;return arr("meals").filter(m=>{const t=new Date(m.date||m.createdAt||0).getTime();return !t||t>=cut})}
function runs(days=30){const cut=Date.now()-days*864e5,seen=new Set(),out=[];for(const r of arr("running").concat(arr("runs"))){const id=r.id||r.createdAt||JSON.stringify(r);if(seen.has(id))continue;seen.add(id);const t=new Date(r.date||r.createdAt||0).getTime();if(!t||t>=cut)out.push(r)}return out}
function nutritionToday(){const m=arr("meals").filter(x=>iso(x)===today());return{count:m.length,kcal:m.reduce((s,x)=>s+n(x.kcal??x.calories),0),protein:m.reduce((s,x)=>s+n(x.protein),0),carbs:m.reduce((s,x)=>s+n(x.carbs??x.carbohydrate),0),fat:m.reduce((s,x)=>s+n(x.fat),0)}}
function weightTrend(){const b=arr("body").filter(x=>n(x.weight)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const a=b.slice(-7),c=b.slice(-14,-7),avg=x=>x.length?x.reduce((s,r)=>s+n(r.weight),0)/x.length:null;const aa=avg(a),cc=avg(c);return{current:aa,previous:cc,delta:aa!=null&&cc!=null?aa-cc:null,count:b.length}}
function load(){const w=workouts(14),last7=w.filter(x=>new Date(x.date||x.createdAt||0).getTime()>=Date.now()-7*864e5);return{records:w.length,volume:w.reduce((s,x)=>s+volume(x),0),last7Sessions:new Set(last7.map(iso)).size,last7Volume:last7.reduce((s,x)=>s+volume(x),0)}}
function state(){const p=profile(),g=goal(),t=load(),nu=nutritionToday(),wt=weightTrend(),r=runs(30);return{version:VERSION,profile:p,goal:g,training:t,nutritionToday:nu,weightTrend:wt,running30:{count:r.length,distance:r.reduce((s,x)=>s+n(x.distanceKm??x.distance??x.km),0)},recentWorkouts:arr("workouts").slice(-12).reverse().map(w=>({exercise:exerciseName(w),date:iso(w),weight:n(w.weight??w.load),reps:n(w.reps),volume:volume(w)}))}}
function category(q){if(/(벤치|스쿼트|데드|중량|세트|반복|RPE|RIR|운동|루틴|과부하|회복|근육|bench|squat|deadlift|weight|sets|reps|workout|routine|overload|recovery|muscle)/i.test(q))return"workout";if(/(먹|식단|칼로리|단백질|탄수|지방|영양|끼니|eat|diet|calorie|protein|carb|fat|nutrition|meal)/i.test(q))return"nutrition";if(/(체중|몸무게|체지방|감량|증량|추세|정체|weight|body fat|cut|bulk|trend|plateau)/i.test(q))return"body";if(/(러닝|달리기|달린|페이스|거리|GPS|running|run|pace|distance|jog)/i.test(q))return"running";if(/(기억|내 기록|내가 말한|memory|my records|remember|what i said)/i.test(q))return"memory";if(/(목표|벌크|린벌크|컷|다이어트|유지|goal|bulk|lean bulk|cut|diet|maintain)/i.test(q))return"goal";return"general"}
function garangLang(){return window.GARANGLocale?.language?.()||((JSON.parse(localStorage.getItem("garang_v95_preferences")||"{}")||{}).language==="en"?"en":"ko");}
function garangUnit(){return window.GARANGLocale?.unit?.()||((JSON.parse(localStorage.getItem("garang_v95_preferences")||"{}")||{}).unit==="imperial"?"imperial":"metric");}
function uiWeight(v){const x=Number(v);if(!Number.isFinite(x))return "-";return garangUnit()==="imperial"?`${(x*2.2046226218).toFixed(1)}lb`:`${x.toFixed(1)}kg`;}
function uiDistance(v){const x=Number(v)||0;return garangUnit()==="imperial"?`${(x*0.621371).toFixed(2)}mi`:`${x.toFixed(2)}km`;}
function decisionEnglish(q){
 const s=state(),g=s.goal||{},p=s.profile||{},t=s.training,nu=s.nutritionToday,c=category(q);
 if(/\b(hi|hello|hey|good morning|good evening)\b/i.test(q))return "Hey. I can look at your workout, nutrition, running and body data together. What do you want to work on today?";
 if(c==="nutrition"){const target=n(g.targetProtein)||n(p.targetProtein)||n(p.weight)*1.8,left=Math.max(0,target-nu.protein);return `Today you logged ${Math.round(nu.kcal)} kcal and ${Math.round(nu.protein)}g protein. ${left>10?`You are about ${Math.round(left)}g short of your protein target.`:"Your protein intake is close to target."}`;}
 if(c==="body"){return s.weightTrend.delta==null?"I need a few more body records to compare your recent 7-day average with the previous 7 days.":`Your recent 7-day average is ${uiWeight(s.weightTrend.current)} versus ${uiWeight(s.weightTrend.previous)} in the prior 7 days (${s.weightTrend.delta>=0?"+":""}${garangUnit()==="imperial"?(s.weightTrend.delta*2.2046226218).toFixed(1):s.weightTrend.delta.toFixed(1)}${garangUnit()==="imperial"?"lb":"kg"}).`;}
 if(c==="running"){return s.running30.count?`You logged ${s.running30.count} runs and ${uiDistance(s.running30.distance)} in the last 30 days. Let's set the next session using your recent distance and recovery.`:"You do not have a recent running record yet. Log a GPS run and I can use distance, pace and frequency in coaching.";}
 if(c==="memory"){const m=ensure().coachMemory;return `Your coach currently references ${m.facts.length} long-term facts, ${m.preferences.length} preferences and ${m.goals.length} goals, along with your workout, nutrition, running and body state.`;}
 if(c==="goal")return `Your current goal is ${g.type||p.goal||"not set"}${g.targetWeight?`, target weight ${g.targetWeight}kg`:""}. I will adjust training and nutrition together around that goal.`;
 if(c==="workout"){const bench=s.recentWorkouts.find(x=>/bench/i.test(x.exercise));if(t.last7Sessions>=6)return `You trained ${t.last7Sessions} days in the last 7. Check recovery and performance quality before adding more load.`;if(bench)return `Your recent bench press was ${uiWeight(bench.weight)} × ${bench.reps||"-"}. Next session, use successful reps and RIR to decide whether a small 2.5–5kg increase makes sense.`;return `You trained ${t.last7Sessions} days in the last 7 with about ${garangUnit()==="imperial"?Math.round(t.last7Volume*2.2046226218).toLocaleString():Math.round(t.last7Volume).toLocaleString()}${garangUnit()==="imperial"?"lb":"kg"} of volume. Compare load, reps and RIR before progressing.`;}
 return `I can reference your profile, ${t.records} workouts, ${nu.count} meals today and ${s.running30.count} recent runs. Ask me anything and I will pull in the relevant data.`;
}
function decision(q){
 if(garangLang()==="en")return decisionEnglish(q);
 const s=state(),g=s.goal||{},p=s.profile||{},t=s.training,nu=s.nutritionToday,c=category(q);
 if(/안녕|ㅎㅇ|하이|반가/.test(q))return"왔네 ㅋㅋ. 지금까지 기록도 같이 보고 운동·식단·러닝을 연결해서 보자. 오늘 뭐부터 볼까?";
 if(c==="nutrition"){const target=n(g.targetProtein)||n(p.targetProtein)||n(p.weight)*1.8,left=Math.max(0,target-nu.protein);return `오늘 ${Math.round(nu.kcal)}kcal, 단백질 ${Math.round(nu.protein)}g을 기록했어. ${left>10?`단백질 목표까지 약 ${Math.round(left)}g 남았어.`:"단백질은 목표 흐름에 가까워."}`;}
 if(c==="body"){return s.weightTrend.delta==null?"체중 기록이 더 쌓이면 최근 7일 평균과 이전 7일 평균을 비교해서 추세를 볼게.":`최근 7일 평균 ${s.weightTrend.current.toFixed(1)}kg, 이전 7일 ${s.weightTrend.previous.toFixed(1)}kg으로 ${s.weightTrend.delta>=0?"+":""}${s.weightTrend.delta.toFixed(1)}kg 변했어.`}
 if(c==="running"){return s.running30.count?`최근 30일 러닝 ${s.running30.count}회, 총 ${s.running30.distance.toFixed(2)}km야. 다음 러닝은 최근 거리와 회복 상태를 같이 보고 강도를 정하자.`:"아직 러닝 기록이 없어. GPS 러닝을 기록하면 거리·페이스·빈도까지 코칭에 연결할 수 있어."}
 if(c==="memory"){const m=ensure().coachMemory;return `현재 코치가 참조하는 장기기억은 사실 ${m.facts.length}개, 선호 ${m.preferences.length}개, 목표 ${m.goals.length}개야. 여기에 운동·식단·러닝·체중 상태를 함께 연결해.`}
 if(c==="goal")return `현재 목표는 ${g.type||p.goal||"미설정"}${g.targetWeight?`, 목표 체중 ${g.targetWeight}kg`:""}야. 이후 운동과 식단을 따로 보지 않고 목표 달성 관점에서 같이 조정할게.`;
 if(c==="workout"){const bench=s.recentWorkouts.find(x=>/벤치/i.test(x.exercise));if(t.last7Sessions>=6)return `최근 7일에 ${t.last7Sessions}일 운동했어. 지금은 무조건 중량을 올리기보다 회복과 수행 질을 먼저 확인하는 게 좋아.`;if(bench)return `최근 벤치는 ${bench.weight||"-"}kg × ${bench.reps||"-"}회야. 다음 세션은 최근 반복 성공 여부와 RIR을 확인하고 2.5~5kg 정도의 작은 증량을 우선 판단하자.`;return `최근 7일 운동 ${t.last7Sessions}일, 볼륨 약 ${Math.round(t.last7Volume).toLocaleString()}kg야. 다음 세션은 같은 동작의 중량·반복·RIR을 비교해서 증량 여부를 결정하자.`}
 return `현재 네 프로필과 운동 ${t.records}개, 오늘 식단 ${nu.count}개, 최근 러닝 ${s.running30.count}회를 함께 참조하고 있어. 질문하면 필요한 데이터부터 꺼내서 판단할게.`
}
function insight(){const s=state();if(garangLang()==="en"){if(s.training.last7Sessions>=6)return "Your training frequency is high. Check recovery before pushing intensity.";const b=s.recentWorkouts.find(x=>/bench/i.test(x.exercise));if(b)return `Recent ${b.exercise} ${b.weight||"-"}kg × ${b.reps||"-"}. I can use this to adjust your next session.`;if(s.running30.count)return `Last 30 days: ${s.running30.count} runs · ${uiDistance(s.running30.distance)}.`;return "I will keep updating your coaching from your workout, nutrition, running and body records.";}if(s.training.last7Sessions>=6)return"최근 운동 빈도가 높아. 다음 세션은 회복 상태를 확인한 뒤 강도를 조절하는 게 좋아.";const b=s.recentWorkouts.find(x=>/벤치/i.test(x.exercise));if(b)return`최근 ${b.exercise} ${b.weight||"-"}kg × ${b.reps||"-"}회 기록을 기준으로 다음 세션의 중량과 볼륨을 조절할 수 있어.`;if(s.running30.count)return`최근 30일 러닝 ${s.running30.count}회 · ${s.running30.distance.toFixed(1)}km가 코칭 데이터에 연결돼 있어.`;return"운동·식단·러닝·체중 기록을 연결해서 오늘의 코칭을 계속 업데이트할게."}
function todayUnifiedState(){
 const d=ensure(), t=today(), body=arr("body").filter(x=>iso(x)===t).slice(-1)[0]||null;
 const workouts=arr("workouts").filter(x=>iso(x)===t), meals=arr("meals").filter(x=>iso(x)===t);
 return {date:t,workouts,meals,body,workoutKcal:workouts.reduce((s,x)=>s+n(x.calories??x.kcal??x.estimatedKcal),0),kcal:meals.reduce((s,x)=>s+n(x.kcal??x.calories),0),protein:meals.reduce((s,x)=>s+n(x.protein),0)};
}
function unifiedIntent(text){
 const q=String(text||'').trim();
 const casual=/^(안녕|하이|ㅎㅇ|반가|고마워|감사|ㅋㅋ+|ㅎㅎ+|hi|hello|hey|thanks|thank you)[!,.? ]*$/i.test(q);
 const personal=/(내|오늘|최근|지난|기록|운동|식단|체중|러닝|단백질|벤치|스쿼트|데드|목표|회복|수면|내가|나의)/i.test(q);
 const external=window.GARANGIntegratedAI?.needsExternalSearch?.(q) || /(연구|논문|근거|최신|최근 연구|가이드|통계|효과|왜|무엇|어떻게|recommend|research|study|evidence|latest|guideline)/i.test(q);
 return {casual,personal,external,mixed:personal&&external,mode:casual?'casual':(personal&&external?'mixed':external?'knowledge':personal?'personal':'general')};
}
function compactContext(extra={}){
 const d=ensure(), t=todayUnifiedState();
 return {version:VERSION, profile:d.profile||{}, workouts:arr("workouts").slice(-40), meals:arr("meals").slice(-40), body:arr("body").slice(-14), running:runs(30), coachMemory:d.coachMemory, coachState:state(), todayCoach:t, learning:window.GARANG_V93_LEARNING?.userState?.()||null, recentChat:d.chat.slice(-20), ...extra};
}
function serverUrl(){const d=ensure();return d.api?.url||localStorage.getItem("fitmind_server_endpoint")||""}
async function ask(text){
 const intent=unifiedIntent(text), url=serverUrl();
 let knowledge=[];
 if(intent.external && window.GARANGKnowledge?.search){
   try{const r=await window.GARANGKnowledge.search(text);knowledge=(r?.results||[]).filter(Boolean).slice(0,8)}catch(e){console.warn('[GARANG Unified AI] knowledge search skipped',e)}
 }else{try{knowledge=window.GARANGKnowledge?.knowledgeContext?.(text)||[]}catch(e){}}
 const kctx=knowledge.map(x=>({title:x.title,summary:x.summary,source:x.source,url:x.url,confidence:x.confidence||'medium'}));
 const unifiedInstruction=[
  'You are GARANG Unified Intelligence. Answer as ONE assistant, not as separate coaches.',
  'Use the user profile, workout/nutrition/running/body records, today state, long-term memory, learning state, and external knowledge together when relevant.',
  'Do not tell the user to open Today Coach, Local Coach, Learning, Memory, or Knowledge. Those are internal capabilities.',
  'If external evidence is supplied, distinguish evidence from personal coaching judgment and cite the supplied sources briefly.',
  'Prioritize the user actual records over generic assumptions. If data is missing, say what is missing instead of inventing it.',
  'For casual conversation, respond naturally and do not force fitness analysis.'
 ].join(' ');
 const context=compactContext({intent,knowledge:kctx,unifiedInstruction});
 window.GARANGIntegratedAI=window.GARANGIntegratedAI||{};
 window.GARANGIntegratedAI.lastPacket={intent,context,knowledge:kctx,at:Date.now()};
 window.GARANGIntegratedAI.lastMeta={mode:intent.mode,usedToday:false,usedMemory:true,usedLearning:false,usedExternal:!!kctx.length,searched:!!intent.external,sources:kctx.slice(0,5)};
 if(url){
  try{
   const h={'Content-Type':'application/json'},key=ensure().api?.key;if(key)h.Authorization='Bearer '+key;
   const r=await fetch(url,{method:'POST',headers:h,body:JSON.stringify({version:VERSION,query:text,mode:'unified',instruction:unifiedInstruction,intent,context,knowledge:kctx})});
   if(r.ok){const j=await r.json(),answer=j.text||j.reply||j.message;if(answer){
    try{if(kctx.length)window.GARANGKnowledge?.learn?.({topic:text,query:text,title:'GARANG Unified AI evidence',summary:kctx.slice(0,5).map(x=>x.summary||x.title).join(' | '),source:'GARANG Unified Intelligence',url:kctx[0]?.url||'',confidence:'medium',tags:['v9.9','unified-ai',intent.mode]})}catch(e){}
    window.GARANGIntegratedAI.lastMeta={mode:intent.mode,usedToday:!!(context.todayCoach?.workouts?.length||context.todayCoach?.meals?.length||context.todayCoach?.body),usedMemory:true,usedLearning:!!context.learning,usedExternal:!!kctx.length,searched:!!intent.external,sources:kctx.slice(0,5)};
    return answer;
   }}
  }catch(e){console.warn('[GARANG Unified AI] server fallback',e)}
 }
 const answer=decision(text);
 if(kctx.length){
  try{window.GARANGKnowledge?.learn?.({topic:text,query:text,title:'GARANG Unified AI evidence',summary:kctx.slice(0,5).map(x=>x.summary||x.title).join(' | '),source:'GARANG Unified Intelligence',url:kctx[0]?.url||'',confidence:'medium',tags:['v9.9','unified-ai',intent.mode]})}catch(e){}
 }
 window.GARANGIntegratedAI.lastMeta={mode:intent.mode,usedToday:!!(context.todayCoach?.workouts?.length||context.todayCoach?.meals?.length||context.todayCoach?.body),usedMemory:true,usedLearning:!!context.learning,usedExternal:!!kctx.length,searched:!!intent.external,sources:kctx.slice(0,5)};
 return answer;
}
function render(){
 const log=$('chatLog');if(!log)return;const d=ensure();
 const escAttr=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const sourceHtml=meta=>{
   if(!meta?.sources?.length)return '';
   const links=meta.sources.map((x,i)=>{const u=/^https?:\/\//i.test(String(x.url||''))?x.url:'';return u?`<a href="${escAttr(u)}" target="_blank" rel="noopener">${i+1}. ${esc(x.title||x.source||'출처')}</a>`:`<span>${i+1}. ${esc(x.title||x.source||'출처')}</span>`}).join('<br>');
   const label=garangLang()==='en'?'Sources checked':'근거 확인';
   return `<div class="aiMeta"><button type="button" class="aiSourcesToggle">${label} ${meta.sources.length}개</button><div class="aiSourceList">${links}</div></div>`;
 };
 const metaFor=x=>x.meta||null;
 log.innerHTML=d.chat.length?d.chat.slice(-80).map(x=>{
   if(x.role==='user')return `<div class="msg user">${esc(x.text)}</div>`;
   const m=metaFor(x);return `<div class="msg ai"><span class="v99-tag">GARANG AI</span>${esc(x.text)}${sourceHtml(m)}</div>`;
 }).join(''):'<div class="card coach-welcome"><strong>GARANG AI</strong><p style="margin:7px 0 0;color:#858a95">운동·식단·러닝·회복·목표·일상, 필요한 정보를 내가 알아서 연결해서 답할게.</p></div>';
 log.querySelectorAll('.aiSourcesToggle').forEach(b=>b.addEventListener('click',()=>b.parentElement.classList.toggle('open')));
 requestAnimationFrame(()=>log.scrollTop=log.scrollHeight);
}
function record(text,answer){const d=ensure();d.coachMemory.v95=d.coachMemory.v95||{events:[]};d.coachMemory.v95.events.push({date:today(),query:String(text).slice(0,500),answer:String(answer).slice(0,1000),state:state()});d.coachMemory.v95.events=d.coachMemory.v95.events.slice(-200);d.coachMemory.lastAdvice=answer;save();try{window.GARANG_V93_LEARNING?.add?.('coach_decision',{query:String(text).slice(0,300),category:category(text),answer:String(answer).slice(0,500)},{status:'success'})}catch(e){}}
function newChat(){const d=ensure();if(d.chat.length){const first=d.chat.find(x=>x.role==='user');d.chatSessions.push({id:'s_'+Date.now(),title:first?.text||'새 대화',createdAt:new Date().toISOString(),messages:d.chat.slice()});d.chatSessions=d.chatSessions.slice(-50)}d.chat=[];save();render();$('chatInput')?.focus()}
function history(){const d=ensure();let p=$('v95History');if(p)p.remove();p=document.createElement('div');p.id='v95History';p.className='v95-panel';const rows=d.chatSessions.slice().reverse();p.innerHTML=`<div class="v95-panel-head"><b>대화 기록</b><button type="button" id="v95Close">닫기</button></div>${rows.length?rows.map((x,i)=>`<button type="button" class="v95-history-item" data-i="${d.chatSessions.length-1-i}"><span>${esc(String(x.title||'새 대화').slice(0,42))}</span><small>${new Date(x.createdAt).toLocaleDateString('ko-KR')}</small></button>`).join(''):'<p>저장된 대화가 없습니다.</p>'}`;$('chat')?.appendChild(p);$('v95Close').onclick=()=>p.remove();p.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const s=ensure().chatSessions[Number(b.dataset.i)];if(!s)return;const x=ensure();x.chat=s.messages.slice();save();render();p.remove()})}
function plan(){const s=state();if(garangLang()==='en'){const focus=s.recentWorkouts[0]?.exercise||'main lift';return `Today, use your recent ${focus} record to prioritize performance quality. If the target is met, consider a small progression. You trained ${s.training.last7Sessions} days in the last 7, so recovery matters.`;}const focus=s.recentWorkouts[0]?.exercise||'주요 운동';return `오늘은 ${focus} 최근 기록을 기준으로 수행 질을 먼저 확인하고, 성공하면 소폭 증량하는 방향이 좋아. 최근 7일 운동 ${s.training.last7Sessions}일이므로 회복 상태도 함께 보자.`}
function report(){const s=state();if(garangLang()==='en')return `Last 7 days: ${s.training.last7Sessions} training days · ${garangUnit()==='imperial'?Math.round(s.training.last7Volume*2.2046226218).toLocaleString():Math.round(s.training.last7Volume).toLocaleString()}${garangUnit()==='imperial'?'lb':'kg'} volume / Today: ${Math.round(s.nutritionToday.kcal)}kcal · ${Math.round(s.nutritionToday.protein)}g protein / Last 30 days: ${s.running30.count} runs · ${s.running30.distance.toFixed(1)}km`;return `최근 7일 운동 ${s.training.last7Sessions}일 · 볼륨 ${Math.round(s.training.last7Volume).toLocaleString()}kg / 오늘 식단 ${Math.round(s.nutritionToday.kcal)}kcal · 단백질 ${Math.round(s.nutritionToday.protein)}g / 최근 30일 러닝 ${s.running30.count}회 · ${s.running30.distance.toFixed(1)}km`;}
function bind(){const form=$('chatForm'),input=$('chatInput');if(!form||!input||form.dataset.v99Bound)return;form.dataset.v99Bound='1';form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value='';const d=ensure();d.chat.push({role:'user',text,date:today(),ts:Date.now()});save();render();const send=$('chatSendBtn');send?.setAttribute('disabled','disabled');try{const answer=await ask(text);const meta=window.GARANGIntegratedAI?.lastMeta||null;const d2=ensure();d2.chat.push({role:'ai',text:answer,date:today(),ts:Date.now(),engine:'GARANG Unified Intelligence',category:category(text),meta});record(text,answer);save();render()}catch(err){const d2=ensure();d2.chat.push({role:'ai',text:garangLang()==='en'?'I hit a temporary error while processing that. Please try again.':'잠깐 문제가 생겼어. 한 번만 다시 보내줘.',date:today(),ts:Date.now(),engine:'GARANG Unified Intelligence',category:'error'});save();render()}finally{send?.removeAttribute('disabled')}}}
function buildUI(){
 const page=$('chat');if(!page)return;
 page.querySelector('#v95CoachBar')?.remove();page.querySelector('.coachQuick')?.remove();page.querySelector('.coachInsight')?.remove();page.querySelector('.v77-memory-mini')?.remove();page.querySelector('#v77ChatActions')?.remove();
 const legacy=page.querySelector('.pageTitle');if(legacy)legacy.remove();
 bind();render();
}
window.garangAsk=async q=>{const input=$('chatInput');if(input){input.value=q;$('chatForm')?.requestSubmit()}};
window.newGarangChat=newChat;
window.GARANGCoachEngine={version:VERSION,state,ask,decision,compactContext,todayUnifiedState,plan,report};
window.FitMindV77={version:VERSION,db,save,render,newChat,showHistory:history,planner:()=>({text:plan()}),weeklyReport:()=>({text:report()}),ask};
const style=document.createElement('style');style.id='v95Style';style.textContent=`
#v95CoachBar{display:none!important}
.v99-tag{display:inline-block;color:#b9a2e8;border:1px solid #46385b;border-radius:7px;font-size:9px;font-weight:900;padding:2px 6px;margin-right:7px;vertical-align:middle}
#v95History{border:1px solid #2c3038;background:#111216;border-radius:18px;padding:14px;margin:12px 0}.v95-panel-head{display:flex;justify-content:space-between;color:#fff;margin-bottom:8px}.v95-panel-head button{background:#202228;color:#fff;border:1px solid #30343d;border-radius:10px;padding:7px 10px}.v95-history-item{width:100%;display:flex;justify-content:space-between;gap:8px;background:none;color:#ddd;border:0;border-top:1px solid #252831;padding:12px 4px;text-align:left}.v95-history-item small{color:#777}
#chatSendBtn[disabled]{opacity:.55;cursor:wait}
`;
document.head.appendChild(style);
function init(){buildUI();setTimeout(buildUI,300)}
document.addEventListener('DOMContentLoaded',init);window.addEventListener('load',()=>setTimeout(init,250));

})();
