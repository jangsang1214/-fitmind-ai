(function(){
'use strict';
const VERSION='GARANG FINAL AI BASE 1.0';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let globalRunning={entries:[],principles:[]};

async function loadGlobalRunning(){try{const r=await fetch('garang-global-running.json',{cache:'no-store'});if(r.ok)globalRunning=await r.json();}catch(e){console.warn('[GARANG] global running load failed',e)}}
function api(){return window.GARANG_APP_API||null}
function getState(){return api()?.getState?.()||{profile:null,workouts:[],meals:[],runs:[],body:[],memory:{}}}
function save(){api()?.save?.()}
function toast(x){api()?.toast?.(x)}
function today(){return new Date().toISOString().slice(0,10)}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function norm(s){return String(s||'').trim().replace(/\s+/g,' ')}
function arr(x){return Array.isArray(x)?x:[]}
function ensureMemory(s){s.memory=s.memory&&typeof s.memory==='object'?s.memory:{};for(const k of ['facts','preferences','goals','events','shortTerm'])s.memory[k]=arr(s.memory[k]);s.memory.learning=s.memory.learning&&typeof s.memory.learning==='object'?s.memory.learning:{};s.memory.learning.events=arr(s.memory.learning.events);s.memory.learning.patterns=arr(s.memory.learning.patterns);s.aiChat=arr(s.aiChat);return s}
function category(q){if(/벤치|스쿼트|데드|운동|중량|세트|반복|rpe|rir|근육|루틴|회복|workout|bench|squat|deadlift|sets|reps|recovery/i.test(q))return'workout';if(/식단|먹|단백질|칼로리|영양|탄수|지방|끼니|nutrition|protein|calorie|meal|food/i.test(q))return'nutrition';if(/러닝|달리|페이스|거리|마라톤|gps|running|run|pace|distance|marathon/i.test(q))return'running';if(/체중|몸무게|체지방|감량|증량|바디|weight|body fat|cut|bulk/i.test(q))return'body';if(/목표|goal|린벌크|다이어트|유지/i.test(q))return'goal';if(/기억|저장|기억해|내가 말한|memory|remember|save/i.test(q))return'memory';return'general'}
function needsWeb(q){return /(최신|최근|연구|논문|근거|검색|찾아|효과|권장|가이드|메타분석|통계|자료|출처|영양정보|성분|latest|recent|research|study|evidence|search|guideline|meta-analysis|statistics|source|nutrition facts)/i.test(q)}
function needsGlobalRunning(q){return /(러닝|달리|마라톤|페이스|코스|기후|날씨|고도|언덕|해외|글로벌|running|run|marathon|pace|route|climate|altitude|hill|city)/i.test(q)}
function localKnowledge(q){try{return window.GARANGKnowledge?.knowledgeContext?.(q)||[]}catch{return[]}}
function matchGlobalRunning(q,s){const text=(q+' '+(s.profile?.country||'')+' '+(s.profile?.city||'')).toLowerCase();const hits=globalRunning.entries.filter(e=>[e.city,e.country,...(e.tags||[])].join(' ').toLowerCase().split(/\s+/).some(t=>t&&text.includes(t))).slice(0,4);return hits.length?hits:globalRunning.principles.filter(p=>text.includes(p.topic)||/러닝|running|기후|날씨|고도|wind|heat|humidity|altitude/i.test(q)).slice(0,4)}
function buildContext(q){
 const s=ensureMemory(getState()), d=today(), meals=arr(s.meals), workouts=arr(s.workouts), runs=arr(s.runs), body=arr(s.body);
 const todayMeals=meals.filter(x=>x.date===d), todayWorkouts=workouts.filter(x=>x.date===d), todayRuns=runs.filter(x=>x.date===d);
 const totals=todayMeals.reduce((a,x)=>({kcal:a.kcal+n(x.kcal),protein:a.protein+n(x.protein),carbs:a.carbs+n(x.carbs),fat:a.fat+n(x.fat)}),{kcal:0,protein:0,carbs:0,fat:0});
 const global=needsGlobalRunning(q)?matchGlobalRunning(q,s):[];
 return {profile:s.profile||{},today:{date:d,workouts:todayWorkouts,meals:todayMeals,runs:todayRuns,body:body.filter(x=>x.date===d),mealTotals:totals},recent:{workouts:workouts.slice(-20).reverse(),meals:meals.slice(-20).reverse(),runs:runs.slice(-20).reverse(),body:body.slice(-20).reverse()},memory:{facts:s.memory.facts.slice(-30),preferences:s.memory.preferences.slice(-30),goals:s.memory.goals.slice(-20),shortTerm:s.memory.shortTerm.slice(-20),events:s.memory.events.slice(-40)},learning:{events:s.memory.learning.events.slice(-60),patterns:s.memory.learning.patterns.slice(-30)},globalRunning:global,knowledge:localKnowledge(q).slice(0,8)};
}
async function searchWeb(q){
 const endpoint=window.GARANG_SEARCH_ENDPOINT||'/api/search';
 if(window.GARANG_SEARCH_ENABLED!==false){try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:q})});if(r.ok){const j=await r.json();const results=j.results||j.items||j.data||[];if(Array.isArray(results)&&results.length)return{results,searched:true,provider:'GARANG Web Search Adapter'};}}catch(e){}}
 try{if(window.GARANGKnowledge?.search){const r=await window.GARANGKnowledge.search(q);return{results:arr(r?.results),searched:!!r?.searched,provider:'Knowledge External Search'}}}catch(e){}
 return{results:[],searched:false,provider:null};
}
async function callLLM(packet){
 const endpoint=window.GARANG_LLM_ENDPOINT||'/api/coach';
 if(window.GARANG_LLM_ENABLED===false)return null;
 try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(packet)});if(!r.ok)return null;const j=await r.json();return j.answer||j.text||j.message||j.output||null}catch(e){return null}}
function localAnswer(q,c){
 const s=getState(), p=s.profile||{}, lower=q.toLowerCase(), t=c.today.mealTotals, last=c.recent.workouts[0], run=c.recent.runs[0];
 if(/안녕|하이|ㅎㅇ|hello|hi/.test(lower))return'왔네 ㅋㅋ. 지금까지 기록과 기억까지 같이 보고 오늘 뭐부터 볼지 정해보자.';
 if(/기억해|저장해|앞으로/.test(lower))return'ㅇㅋ. 이 내용은 개인 코치 기억에 저장해서 관련 대화에서 참고할게.';
 if(/단백질|식단|먹|영양|칼로리/.test(lower)){const target=n(p.targetProtein)||n(p.weight)*1.8;const gap=Math.max(0,target-t.protein);return`오늘 기록은 ${Math.round(t.kcal)} kcal · 단백질 ${Math.round(t.protein)}g · 탄수화물 ${Math.round(t.carbs)}g · 지방 ${Math.round(t.fat)}g이야. 단백질 목표를 약 ${Math.round(target)}g으로 잡으면 ${Math.round(gap)}g 정도 남았어.`}
 if(/운동|벤치|스쿼트|데드|중량|rpe|rir/.test(lower)){if(!last)return'아직 최근 운동 기록이 없어. 기록을 쌓으면 중량·반복·볼륨·RPE를 연결해서 다음 세션을 판단할 수 있어.';const suggestion=n(last.rpe)>=9?'최근 RPE가 높았으니 같은 중량에서 반복을 안정화하거나 볼륨을 조금 낮추는 쪽이 좋아.':'수행이 안정적이었다면 다음 세션에서 2.5~5kg 또는 1회 반복 증가 중 하나만 선택해.';return`최근 ${last.name||last.exercise} ${n(last.weight)}kg × ${n(last.reps)} × ${n(last.sets)}세트, RPE ${n(last.rpe)} 기록을 봤어. ${suggestion}`}
 if(/러닝|달리|페이스|마라톤|running|run|pace/.test(lower)){return run?`최근 러닝은 ${n(run.distance).toFixed(2)}km · ${n(run.duration).toFixed(1)}분 · ${run.pace||'—'} /km야. 다음 세션은 최근 거리와 회복을 기준으로 강도를 정하자.`:'아직 최근 러닝 기록이 없어. GPS 러닝을 기록하면 거리·페이스·빈도와 글로벌 러닝 지식을 함께 사용해 코칭할 수 있어.'}
 if(/체중|몸무게|체지방|감량|증량/.test(lower)){const b=c.recent.body.filter(x=>n(x.weight)>0);return b.length?`최근 기록 체중은 ${n(b[0].weight).toFixed(1)}kg이야. 더 정확한 추세 판단을 위해 최근 7~14일 데이터를 함께 비교할게.`:'체중 기록이 더 쌓이면 추세와 목표를 함께 분석할 수 있어.'}
 return`현재 프로필, 운동 ${c.recent.workouts.length}건, 식단 ${c.recent.meals.length}건, 러닝 ${c.recent.runs.length}건, 장기기억 ${c.memory.facts.length+c.memory.preferences.length+c.memory.goals.length}개, 학습 이벤트 ${c.learning.events.length}개를 같은 사용자 상태로 보고 있어. 질문에 필요한 정보부터 연결해서 판단할게.`;
}
function extractMemory(q,s){
 const text=norm(q); if(!text)return;
 const m=s.memory;
 if(/기억해|기억하자|저장해|앞으로 기억|remember|save this/i.test(text)){
   if(!m.facts.some(x=>x.text===text))m.facts.push({id:'fact_'+Date.now(),text,createdAt:new Date().toISOString(),source:'conversation'});
 }
 if(/내 목표는|목표는|goal is/i.test(text)){
   if(!m.goals.some(x=>x.text===text))m.goals.push({id:'goal_'+Date.now(),text,createdAt:new Date().toISOString(),source:'conversation'});
 }
 if(/좋아|싫어|선호|원해|prefer|like|dislike/i.test(text)){
   if(!m.preferences.some(x=>x.text===text))m.preferences.push({id:'pref_'+Date.now(),text,createdAt:new Date().toISOString(),source:'conversation'});
 }
 m.facts=m.facts.slice(-100);m.preferences=m.preferences.slice(-100);m.goals=m.goals.slice(-100);
}
function recordLearning(q,ctx,usedWeb){const s=ensureMemory(getState()), cat=category(q), ev={id:'learn_'+Date.now(),eventType:'coach_query',category:cat,context:{goal:s.profile?.goal||null,experience:s.profile?.experience||null},action:{query:q,usedWeb,usedKnowledge:ctx.knowledge.length>0,usedGlobalRunning:ctx.globalRunning.length>0},outcome:{status:'completed'},createdAt:new Date().toISOString()};s.memory.learning.events.push(ev);const map={};for(const e of s.memory.learning.events){const k=e.category||'general';map[k]=map[k]||{category:k,count:0,web:0,globalRunning:0};map[k].count++;if(e.action?.usedWeb)map[k].web++;if(e.action?.usedGlobalRunning)map[k].globalRunning++;}s.memory.learning.patterns=Object.values(map).sort((a,b)=>b.count-a.count);s.memory.learning.events=s.memory.learning.events.slice(-500);}
async function maybeGlobalLearning(q,ctx){try{const g=window.GARANG_SERVER;if(!g?.configured||!g?.consent?.globalLearning||!g.saveLearning)return;await g.saveLearning({eventType:'coach_query',context:{goal:null,experience:null},outcome:{status:'completed'},actionSummary:category(q),quality:{usedWeb:!!ctx.web?.length,usedGlobalRunning:!!ctx.globalRunning?.length}})}catch{}}
async function ask(q){
 const text=norm(q);if(!text)return null;const s=ensureMemory(getState());extractMemory(text,s);
 s.memory.shortTerm.push({text,createdAt:new Date().toISOString(),type:'user_message'});s.memory.shortTerm=s.memory.shortTerm.slice(-80);
 s.memory.events.push({type:'conversation',date:today(),text:text.slice(0,1000)});s.memory.events=s.memory.events.slice(-300);
 const ctx=buildContext(text);let web=[];let searched=false;
 if(needsWeb(text)){const r=await searchWeb(text);web=arr(r.results).slice(0,8);searched=r.searched;ctx.web=web;}
 const packet={version:VERSION,question:text,category:category(text),context:ctx,instructions:'Act as GARANG Local Coach. Use personal data and memory first, global running knowledge when relevant, and web evidence when present. Do not claim to have searched if web results are absent. Separate user-specific facts from general evidence. Give an actionable next step.'};
 let answer=await callLLM(packet);if(!answer)answer=localAnswer(text,ctx);
 if(searched)answer+='\n\n🔎 최신/외부 지식을 확인해 답변에 반영했어.';
 if(ctx.globalRunning?.length)answer+='\n\n🌍 Global Running 지식도 함께 반영했어.';
 if(web.length){answer+='\n\n출처\n'+web.slice(0,4).map((x,i)=>`${i+1}. ${x.title||x.source||'Source'}${x.source?' · '+x.source:''}`).join('\n');}
 s.memory.shortTerm.push({text:answer,createdAt:new Date().toISOString(),type:'assistant_message'});recordLearning(text,{...ctx,web},searched);s.aiChat.push({role:'user',text,ts:Date.now()});s.aiChat.push({role:'assistant',text:answer,ts:Date.now(),meta:{web:searched,sources:web.slice(0,5),globalRunning:ctx.globalRunning?.length>0,knowledge:ctx.knowledge.length}});s.aiChat=s.aiChat.slice(-120);save();await maybeGlobalLearning(text,{...ctx,web});api()?.render?.();return answer;
}
function clearChat(){const s=ensureMemory(getState());s.aiChat=[];save();api()?.render?.();}
function renderChat(){const s=ensureMemory(getState());if(!s.aiChat.length)return'<div class="garang-chat-empty"><div class="garang-chat-empty-mark">✦</div><h2>GARANG AI</h2><p>운동·식단·러닝·몸 상태·목표·기억을 하나의 맥락으로 연결해서 대화해.</p><div class="garang-chat-suggestions"><button data-chat-q="최근 운동 기록을 분석해서 다음 운동을 정해줘">최근 운동 분석</button><button data-chat-q="오늘 단백질을 얼마나 더 먹어야 해?">오늘 식단 분석</button><button data-chat-q="내 러닝 기록과 글로벌 러닝 지식을 같이 보고 조언해줘">러닝 분석</button></div></div>';return s.aiChat.map(m=>`<div class="garang-msg ${m.role==='user'?'user':'assistant'}"><div class="garang-msg-role">${m.role==='user'?'나':'GARANG'}</div><div class="garang-msg-body">${esc(m.text).replace(/\n/g,'<br>')}</div>${m.meta?(m.meta.web||m.meta.globalRunning?`<div class="garang-msg-meta">${m.meta.web?'🔎 Web Search ':''}${m.meta.globalRunning?'🌍 Global Running':''}</div>`:''):''}</div>`).join('')}
function buildPage(){const s=ensureMemory(getState());const mem=s.memory;return `<div class="garang-ai-shell"><div class="garang-ai-head"><div><span class="eyebrow">LOCAL COACH · UNIFIED INTELLIGENCE</span><h1>GARANG AI</h1><p>대화 한 번으로 사용자 데이터 · 장기기억 · 학습 · Global Running · Web Search를 필요한 만큼 연결합니다.</p></div><button class="ghost" id="garangNewChat">새 대화</button></div><div class="garang-ai-layout"><section class="garang-chat-panel"><div id="garangChatLog" class="garang-chat-log">${renderChat()}</div><form id="garangChatForm" class="garang-chat-form"><textarea id="garangChatInput" rows="1" placeholder="GARANG에게 메시지를 입력하세요…"></textarea><button class="primary" id="garangChatSend" type="submit">↑</button></form><div class="garang-chat-hint">Enter 전송 · Shift+Enter 줄바꿈 · 필요한 경우 Web Search 자동 실행</div></section><aside class="garang-context-panel"><div class="garang-context-card"><span class="eyebrow">AI CONTEXT</span><h3>현재 연결된 기억</h3><div class="garang-context-grid"><div><b>${mem.facts.length}</b><span>장기 사실</span></div><div><b>${mem.preferences.length}</b><span>선호</span></div><div><b>${mem.goals.length}</b><span>목표</span></div><div><b>${mem.learning.events.length}</b><span>학습 이벤트</span></div></div><div class="garang-context-list"><div>운동 <b>${s.workouts.length}</b></div><div>식단 <b>${s.meals.length}</b></div><div>러닝 <b>${s.runs.length}</b></div><div>Global Running <b>활성</b></div><div>Web Search <b>필요 시 자동</b></div></div></div></aside></div></div>`}
function bind(){const form=$('garangChatForm'),input=$('garangChatInput');if(!form||form.dataset.bound)return;form.dataset.bound='1';const send=$('garangChatSend');form.addEventListener('submit',async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;send.disabled=true;input.value='';await ask(q).catch(()=>toast('AI 처리 중 문제가 생겼어요. 다시 시도해 주세요.'));send.disabled=false;setTimeout(()=>input.focus(),50)});input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(180,Math.max(52,input.scrollHeight))+'px'});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});$('garangNewChat')?.addEventListener('click',clearChat);document.querySelectorAll('[data-chat-q]').forEach(b=>b.onclick=()=>{input.value=b.dataset.chatQ;form.requestSubmit()});const log=$('garangChatLog');if(log)requestAnimationFrame(()=>log.scrollTop=log.scrollHeight)}
function patchApp(){const A=api();if(!A)return;A.setAIPage=buildPage;A.bindAIPage=bind;A.finalAI={ask,buildContext,version:VERSION};}
window.GARANGFinalAI={version:VERSION,ask,buildContext,buildPage,bind,globalRunning:()=>globalRunning,needsWeb};
window.addEventListener('DOMContentLoaded',async()=>{await loadGlobalRunning();patchApp();ARefresh();});
window.addEventListener('load',()=>setTimeout(()=>{loadGlobalRunning().then(()=>{patchApp();ARefresh()})},500));
function ARefresh(){try{const A=api();if(A?.getCurrentPage?.()==='ai'){A.render?.();setTimeout(bind,0)}}catch{}}
})();
