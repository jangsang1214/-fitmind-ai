/* GARANG V9.5 Global + Local AI Upgrade
 * Built additively on V9.5 MASTER PATCH1. No Server LLM required.
 */
(function(){
'use strict';
const VERSION='9.5.1-global';
const SETTINGS_KEY='garang_v95_global_settings_v1';
const MEM_KEY='garang_v95_language_memory_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let settings=Object.assign({language:'ko',weightUnit:'kg',heightUnit:'cm',currency:'USD',plan:'free'},read(SETTINGS_KEY,{}));
function persist(){save(SETTINGS_KEY,settings)}
function db(){try{return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem('fitmind_v2')||'{}')}catch{return{}}}
function appSave(){try{window.__FitMindV6Save?.();window.save?.()}catch{}}
function memory(){return read(MEM_KEY,{facts:[],preferences:[],goals:[],conversation:[]})}
function rememberFact(text,meta={}){const m=memory();const row={id:'m_'+Date.now().toString(36),text:String(text).slice(0,800),topic:meta.topic||'conversation',lang:meta.lang||settings.language,createdAt:new Date().toISOString()};m.facts=[row,...m.facts.filter(x=>x.text!==row.text)].slice(0,500);save(MEM_KEY,m);return row}
function lang(){return settings.language==='en'?'en':'ko'}
const T={ko:{app:'GARANG',coach:'나의 AI 코치',send:'전송',placeholder:'운동·식단·내 기록은 물론, 그냥 일상 얘기도 편하게 해보세요.',free:'무료',pro:'GARANG Pro',language:'언어',units:'단위',price:'$9.99 / month',learn:'외부 지식',memory:'개인 기억'},en:{app:'GARANG',coach:'My AI Coach',send:'Send',placeholder:'Ask about training, nutrition, your data — or just talk.',free:'Free',pro:'GARANG Pro',language:'Language',units:'Units',price:'$9.99 / month',learn:'External Knowledge',memory:'Personal Memory'}};
function t(k){return T[lang()][k]||k}
function detectLanguage(q){return /[가-힣]/.test(q)?'ko':/\b(the|and|you|your|how|what|why|can|today|workout|protein|calories|sleep)\b/i.test(q)?'en':settings.language}
function convertWeight(v,to=settings.weightUnit){const n=Number(v);if(!Number.isFinite(n))return null;return to==='lb'?n*2.2046226218:n}
function convertHeight(v,to=settings.heightUnit){const n=Number(v);if(!Number.isFinite(n))return null;return to==='in'?n/2.54:n}
function fmtWeight(v){const n=convertWeight(v);return n==null?'-':`${n.toFixed(1)} ${settings.weightUnit}`}
function fmtHeight(v){const n=convertHeight(v);return n==null?'-':`${n.toFixed(1)} ${settings.heightUnit}`}
function localizedProfile(){const d=db(),p=d.profile||{};return{...p,weightDisplay:fmtWeight(p.weight),heightDisplay:fmtHeight(p.height)}}
function unitPatch(){
 const q=(id)=>document.getElementById(id);
 document.documentElement.lang=lang();
 const input=q('chatInput');if(input)input.placeholder=t('placeholder');
 const send=q('chatForm')?.querySelector('button');if(send)send.textContent=t('send');
 const hint=q('v95UnitHint');if(hint)hint.textContent=settings.weightUnit==='kg'?'입력 데이터는 kg/cm 기준으로 안전하게 저장됩니다. 화면 표시용 lb/in 변환은 Personal Profile에서 제공합니다.':'Stored data remains normalized as kg/cm; lb/in is used for localized display and future native integrations.';
}

function renderGlobalPanel(){
 if(document.getElementById('v95GlobalPanel'))return;
 const profile=document.getElementById('profile');if(!profile)return;
 const box=document.createElement('div');box.id='v95GlobalPanel';box.className='card';
 box.innerHTML=`<div class="v95-global-head"><div><span class="eyebrow">GLOBAL</span><h3>GARANG Global & AI</h3><p>언어·단위·개인 기억을 분리해 저장하고 글로벌 확장을 준비합니다.</p></div><span class="v95-global-badge">V9.5</span></div>
 <div class="row"><label>${t('language')}<select id="gLang"><option value="ko">한국어</option><option value="en">English</option></select></label><label>${t('units')}<select id="gWeight"><option value="kg">kg / cm</option><option value="lb">lb / in</option></select></label></div>
 <div class="v95-plan-grid"><div class="v95-plan-card"><b>${t('free')}</b><span>기본 기록 · 기본 코칭</span></div><div class="v95-plan-card premium"><b>${t('pro')}</b><span>${t('price')} · Memory · Knowledge · 고급 분석 · 멀티모달 기반</span></div></div>
 <div id="v95UnitHint" class="muted" style="margin-top:8px"></div><div class="v95-global-stats"><span>Personal Memory <b id="gMemCount">0</b></span><span>Knowledge <b id="gKnowCount">0</b></span><span>Connectors <b id="gConnCount">0</b></span></div>`;
 profile.appendChild(box);
 document.getElementById('gLang').value=settings.language;document.getElementById('gWeight').value=settings.weightUnit;
 document.getElementById('gLang').onchange=e=>{settings.language=e.target.value;persist();unitPatch();renderGlobalPanel();};
 document.getElementById('gWeight').onchange=e=>{settings.weightUnit=e.target.value;settings.heightUnit=e.target.value==='lb'?'in':'cm';persist();unitPatch();};
 const m=memory();document.getElementById('gMemCount').textContent=m.facts.length;document.getElementById('gKnowCount').textContent=String(window.GARANGKnowledge?.stats?.().knowledge||0);document.getElementById('gConnCount').textContent=String(Object.keys(window.GARANGDataConnectors||{}).length);
}

function translateCoreUI(){
 const en=lang()==='en';
 const map={
  '홈': 'Home','운동':'Workout','식단':'Nutrition','바디':'Body','러닝':'Run','리포트':'Reports','AI':'AI','학습':'Learning','메모리':'Memory','프로필':'Profile',
  '나의 AI 코치':'My AI Coach','리포트':'Reports','내 GARANG':'My GARANG','바디체크':'Body Check','신체 데이터':'Body Data','대사량 & 권장 섭취 칼로리':'Metabolism & Calories','신체 변화':'Body Progress',
  '정보 저장':'Save Profile','로그아웃':'Log out','계정 삭제':'Delete Account','GARANG 시작하기':'Start GARANG','계정 만들기':'Create account'
 };
 document.querySelectorAll('nav#mainNav button, .pageTitle h2, #profileForm button, #body h2, #body h3, #report h2').forEach(el=>{
   if(!el.dataset.i18nBase)el.dataset.i18nBase=el.textContent.trim();
   const base=el.dataset.i18nBase; if(en&&map[base])el.textContent=map[base]; else if(!en)el.textContent=base;
 });
}
function hideServer(){const el=document.getElementById('serverLLMSettings');if(el)el.style.display='none';}
function casualAnswer(q){
 const x=q.trim(), n=x.toLowerCase(), p=localizedProfile(), d=db(), cm=d.coachMemory||{};
 const korean=/[가-힣]/.test(x);
 const recent=(d.chat||[]).slice(-8).filter(v=>v.role==='user').map(v=>v.text).join(' ');
 if(/^(안녕|하이|ㅎㅇ|hello|hi|hey)\b/i.test(x))return korean?`오 ㅋㅋ 왔네. 오늘 컨디션 어때? 운동 얘기든 그냥 잡담이든 편하게 해.`:`Hey. Good to see you. How are you feeling today? We can talk training or just chat.`;
 if(/고마워|감사|thanks|thank you/i.test(x))return korean?'ㅋㅋ 별말을. 계속 같이 가보자.':`Anytime. I'm here.`;
 if(/잘자|굿나잇|good night/i.test(x))return korean?'잘 자. 오늘은 회복도 훈련이다 😴':'Good night. Recovery is part of training too 😴';
 if(/힘들|지쳤|스트레스|우울|답답|힘드네|tired|stressed|overwhelmed/i.test(x))return korean?'그럴 수 있어. 지금 당장 해결하려고 몰아붙이지 말고, 뭐가 제일 힘든지 하나만 말해봐. 같이 정리해보자.':'That happens. You do not have to solve everything at once. Tell me what feels hardest right now and we can sort it out.';
 if(/오늘 뭐하지|뭐할까|what should i do|what do i do/i.test(x))return korean?`오늘 기록을 기준으로 정해보자. 운동할지 쉴지, 먹을지, 아니면 그냥 쉬어갈지 지금 컨디션부터 알려줘.`:`Let’s decide from your current state. Training, recovery, food, or just taking it easy — tell me how you feel.`;
 if(/내가 누군|내 목표|my goal|who am i/i.test(x)){const goal=cm.goal||p.goal||'-';return korean?`내가 지금 기억하는 네 목표는 ${goal}이고, 최근 프로필 체중은 ${p.weightDisplay}야. 더 정확한 걸 원하면 지금 목표를 다시 말해줘.`:`I currently remember your goal as ${goal}, and your profile weight is ${p.weightDisplay}. Tell me if you want to update that.`}
 if(/뭐 먹|밥|먹을까|meal|eat|food/i.test(x))return korean?'오늘 운동량과 현재 섭취량을 같이 보면 더 정확해. 지금까지 먹은 것과 오늘 운동했는지만 알려줘.':'I can help choose food based on today’s training and intake. Tell me what you have eaten and whether you trained today.';
 if(/심심|재미|놀자|bored|fun/i.test(x))return korean?'ㅋㅋ 좋지. 운동 얘기 말고도 그냥 잡담하자. 요즘 제일 하고 싶은 게 뭐야?':'Sure 😄 We can just chat. What have you been wanting to do lately?';
 if(/기억해|저장해|remember|save this/i.test(x)){rememberFact(x,{topic:'user_instruction',lang:detectLanguage(x)});return korean?'ㅇㅋ. 이건 개인 코치 기억에 저장해둘게. 다음 관련 대화에서 참고할게.':'Got it. I’ll keep that in your personal coach memory and use it in relevant conversations.'}
 return null;
}
function broadLocalAsk(q){
 const casual=casualAnswer(q);if(casual)return casual;
 try{const e=window.GARANGCoachEngine;if(e?.decision){const r=e.decision(q);if(r)return r;}}catch{}
 const base=lang()==='en';
 const d=db(),p=d.profile||{};const goal=p.goal||d.coachMemory?.goal||'';
 return base?`I’m listening. I can talk about your training, nutrition, body data, goals, recovery, plans, or everyday life. ${goal?`Your current goal is ${goal}. `:''}Tell me what’s on your mind.`:`응, 듣고 있어. 운동·식단·몸 상태·목표·회복뿐 아니라 그냥 일상 얘기도 할 수 있어. ${goal?`지금 목표는 ${goal}로 기억하고 있어. `:''}편하게 말해줘.`;
}
function bindBroadChat(){
 const form=document.getElementById('chatForm'),input=document.getElementById('chatInput');if(!form||!input||form.dataset.globalBound)return;form.dataset.globalBound='1';
 form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value='';const d=db();d.chat=Array.isArray(d.chat)?d.chat:[];d.chat.push({role:'user',text,date:new Date().toISOString().slice(0,10),ts:Date.now()});appSave();window.GARANGCoachEngine?.render?.();
 let answer='';
 try{
   if(window.GARANGKnowledge?.needsExternalSearch?.(text)){
     const r=await window.GARANGKnowledge.search(text);if(r?.results?.length){answer=(lang()==='en'?`I found ${r.results.length} relevant sources and saved them to Knowledge. `:`관련 자료 ${r.results.length}개를 찾았고 Knowledge에 저장했어. `)+ (r.results[0].summary||r.results[0].title);}
   }
 }catch{}
 if(!answer)answer=broadLocalAsk(text);
 d.chat.push({role:'ai',text:answer,date:new Date().toISOString().slice(0,10),ts:Date.now(),engine:VERSION,category:'conversation'});rememberFact(`Q: ${text}\nA: ${answer}`,{topic:'conversation',lang:detectLanguage(text)});appSave();window.GARANGCoachEngine?.render?.();
 };
}
function addPhotoInput(){
 const chat=document.getElementById('chat');if(!chat||document.getElementById('gPhotoBtn'))return;
 const bar=document.getElementById('chatForm');const b=document.createElement('button');b.type='button';b.id='gPhotoBtn';b.textContent='📷';b.title='사진 추가';b.style.cssText='width:44px;flex:0 0 44px';const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.hidden=true;inp.id='gPhotoInput';bar.insertBefore(b,bar.querySelector('button'));bar.insertBefore(inp,bar.querySelector('button'));b.onclick=()=>inp.click();inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;try{window.GARANGKnowledge?.recordPhoto(f,{source:'chat',note:'사용자 사진 이벤트'});}catch{}const input=document.getElementById('chatInput');if(input)input.value=lang()==='en'?'I sent a photo. Please help me understand it.':'사진을 보냈어. 이 사진을 어떻게 봐야 할지 도와줘.';bar.requestSubmit();};
}
function addWearableConnectors(){
 const C=window.GARANGDataConnectors=window.GARANGDataConnectors||{};
 C.appleHealth={name:'Apple Health',status:'connector-ready',readOnly:true,reason:'Native HealthKit permission bridge required for live data.'};
 C.healthConnect={name:'Health Connect',status:'connector-ready',readOnly:true,reason:'Native Health Connect permission bridge required for live data.'};
 C.appleWatch={name:'Apple Watch',status:'connector-ready',via:'Apple Health'};
 C.galaxyWatch={name:'Galaxy Watch',status:'connector-ready',via:'Health Connect'};
}
function globalSearchUpgrade(){
 const old=window.GARANGKnowledge?.search;if(!old)return;
 const original=old;
 window.GARANGKnowledge.search=async function(q){
   const r=await original(q);return r;
 };
}
function init(){hideServer();renderGlobalPanel();unitPatch();translateCoreUI();addWearableConnectors();addPhotoInput();bindBroadChat();globalSearchUpgrade();}
window.GARANGGlobalAI={version:VERSION,settings:()=>({...settings}),memory,rememberFact,format:{weight:fmtWeight,height:fmtHeight},localizedProfile,casualAnswer,broadLocalAsk,connectors:()=>window.GARANGDataConnectors};
window.addEventListener('DOMContentLoaded',()=>{init();setTimeout(init,800);setTimeout(init,1800)});
window.addEventListener('load',()=>setTimeout(init,500));
})();
