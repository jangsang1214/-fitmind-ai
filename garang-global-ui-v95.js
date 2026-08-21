/* GARANG V9.5 Global UI layer
   Language/unit preferences are user-level display settings. Core data remains metric + language-neutral.
*/
(function(){
'use strict';
const PREF_KEY='garang_v95_preferences';
const M={
  '홈':'Home','운동':'Workout','식단':'Nutrition','바디':'Body','러닝':'Running','리포트':'Reports','AI':'AI','학습':'Learning','메모리':'Memory','프로필':'Profile',
  '로그인':'Log in','회원가입':'Sign up','닉네임':'Nickname','이메일':'Email','비밀번호 (6자 이상)':'Password (6+ characters)','비밀번호 확인':'Confirm password','계정 만들기':'Create account','GARANG 시작하기':'Start GARANG','비밀번호를 잊으셨나요?':'Forgot your password?','또는':'or','Google로 계속하기':'Continue with Google','Apple로 계속하기':'Continue with Apple',
  '서비스 이용 및 개인정보 처리에 동의합니다.':'I agree to the Terms of Service and Privacy Policy.','가입 후 기록은 계정별로 저장되며 언제든 백업·삭제할 수 있습니다.':'Your records are saved to your account and can be backed up or deleted anytime.',
  '내정보':'Profile','설치':'Install','온보딩 다시하기':'Restart onboarding','이전':'Back','다음':'Next','완료':'Done','저장':'Save','취소':'Cancel','닫기':'Close',
  '오늘 운동 뭐 할까?':'What should I train today?','단백질':'Protein','최근 분석':'Recent analysis','전송':'Send','새 채팅':'New chat','나의 AI 코치':'My AI Coach','개인 AI 코치':'Personal AI Coach','AI 코치':'AI Coach',
  '운동/식단/내 기록에 대해 물어보세요':'Ask about your workouts, nutrition, or records','파일':'File','사진':'Photo','첨부':'Attach','파일 선택':'Choose file',
  '무엇을 만들고 싶나요?':'What do you want to achieve?','가장 중요한 목표부터 알려주세요.':'Tell me your most important goal.','현재 몸 상태':'Current body state','정확할수록 코칭이 정교해집니다.':'The more accurate, the better the coaching.','무엇을 주로 하나요?':'What do you mainly do?','여러 개를 선택할 수 있습니다.':'You can select multiple.','어떤 코치가 좋나요?':'What kind of coach do you want?','대화 스타일도 나에게 맞춥니다.':'Your conversation style is personalized too.','준비됐습니다.':'You are ready.','이제 GARANG이 당신의 기록을 기준으로 코칭합니다.':'GARANG will now coach you based on your records.',
  '근육 증가':'Muscle gain','체지방 감량':'Fat loss','체중 유지':'Maintain weight','체력 향상':'Improve fitness','헬스':'Gym','러닝':'Running','축구/풋살':'Soccer/Futsal','홈트':'Home workout','직설적':'Direct','친근함':'Friendly','데이터 중심':'Data-driven','강하게 밀어붙이기':'Push me hard',
  '성별':'Gender','남성':'Male','여성':'Female','기타':'Other','나이':'Age','키 cm':'Height cm','현재 체중 kg':'Current weight kg','목표 체중 kg':'Target weight kg','활동 수준':'Activity level','낮음':'Low','보통':'Moderate','높음':'High','운동 목표 (예: 체지방 감량, 근력 증가)':'Training goal (e.g. fat loss, strength)','운동 경험':'Training experience','초보':'Beginner','중급':'Intermediate','상급':'Advanced','AI 코칭 스타일':'AI coaching style',
  '데이터 관리':'Data management','백업 파일 만들기':'Create backup','백업 복원':'Restore backup','오늘의 기록과 코칭을 한눈에.':'Your records and coaching at a glance.','코치에게 질문':'Ask your coach','프로필':'Profile',
  '총 볼륨':'Total volume','총 소모':'Calories burned','총 세트':'Total sets','운동시간':'Workout time','운동 인증':'Workout certification','인증 만들기':'Create certification',
  '총 칼로리':'Total calories','단백질':'Protein','탄수화물':'Carbs','지방':'Fat','러닝 시작':'Start running','일시정지':'Pause','종료':'Stop','시간':'Time','페이스':'Pace','칼로리':'Calories',
  '측정 기록':'Measurement history','체지방량':'Fat mass','바디체크 사진':'Body check photos','저장된 사진은 바디 탭에서 언제든 다시 볼 수 있습니다.':'Saved photos are always available in the Body tab.',
  'AI Learning':'AI Learning','운동·식단·러닝 기록에서 개인화 패턴을 축적합니다.':'Build personalized patterns from your workout, nutrition, and running records.','학습 이벤트':'Learning events','패턴':'Patterns','성공':'Success','실패':'Failure','기록 다시 학습':'Learn from records again','Global Learning 동의':'Global Learning consent','로컬 학습 ON':'Local learning ON','학습 패턴':'Learning patterns','최근 학습 이벤트':'Recent learning events','AI Memory':'AI Memory','기존 GARANG 데이터와 V9 학습 데이터를 한 곳에서 확인합니다.':'View GARANG data and learned data in one place.','V9 학습 데이터 초기화':'Clear V9 learning data',
  '외부 지식 · 학습':'External knowledge · Learning','한 번 검색한 지식은 저장하고 다음 코칭에서 다시 활용합니다.':'Knowledge you search is saved and reused in future coaching.','외부 검색':'External search','학습 지식':'Learned knowledge',
  '설치':'Install','계정 만들기':'Create account'
};
const K=Object.fromEntries(Object.entries(M).map(([k,v])=>[v,k]));
const original=new WeakMap();
function prefs(){try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'null');return x&&typeof x==='object'?x:{language:'ko',country:'KR',unit:'metric'}}catch{return{language:'ko',country:'KR',unit:'metric'}}}
function savePrefs(p){localStorage.setItem(PREF_KEY,JSON.stringify(p));document.documentElement.dataset.garangLanguage=p.language;document.documentElement.dataset.garangUnit=p.unit;document.documentElement.dataset.garangCountry=p.country||'KR';window.GARANGPreferences=p;applyAll();}
function lang(){return prefs().language==='en'?'en':'ko'}
function unit(){return prefs().unit==='imperial'?'imperial':'metric'}
function country(){return prefs().country||'KR'}
function tr(s){const x=String(s||'');return lang()==='en'?(M[x]||x):(K[x]||x)}
function translateNode(node){if(node.nodeType!==3)return;const p=node.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))return;const raw=original.has(node)?original.get(node):node.nodeValue; if(!original.has(node))original.set(node,raw); const out=lang()==='en'?(M[raw.trim()]?raw.replace(raw.trim(),M[raw.trim()]):raw):(K[raw.trim()]?raw.replace(raw.trim(),K[raw.trim()]):raw); if(node.nodeValue!==out)node.nodeValue=out;}
function applyAll(){
 document.documentElement.lang=lang()==='en'?'en':'ko';
 document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{if(!el.dataset.garangPlaceholderKo)el.dataset.garangPlaceholderKo=el.getAttribute('placeholder')||'';const ko=el.dataset.garangPlaceholderKo;el.setAttribute('placeholder',lang()==='en'?(M[ko]||ko):ko)});
 document.querySelectorAll('option').forEach(el=>{if(!el.dataset.garangTextKo)el.dataset.garangTextKo=el.textContent;const ko=el.dataset.garangTextKo;const out=lang()==='en'?(M[ko]||ko):ko;if(el.textContent!==out)el.textContent=out});
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())translateNode(n);
 updateUnits();
}
function updateUnits(){
 const imp=unit()==='imperial';
 document.querySelectorAll('[data-unit-label]').forEach(el=>{el.textContent=imp?el.dataset.imperial:el.dataset.metric});
 const replacements=[['키(cm)','Height '+(imp?'in':'cm')],['체중(kg)','Weight '+(imp?'lb':'kg')],['목표 체중(kg)','Target weight '+(imp?'lb':'kg')],['키 cm','Height '+(imp?'in':'cm')],['현재 체중 kg','Current weight '+(imp?'lb':'kg')],['목표 체중 kg','Target weight '+(imp?'lb':'kg')]];
 document.querySelectorAll('label').forEach(el=>{const t=(el.firstChild?.nodeValue||'').trim();const hit=replacements.find(x=>x[0]===t);if(hit)el.firstChild.nodeValue=lang()==='en'?hit[1]:(imp?({'키(cm)':'키(in)','체중(kg)':'체중(lb)','목표 체중(kg)':'목표 체중(lb)','키 cm':'키 in','현재 체중 kg':'현재 체중 lb','목표 체중 kg':'목표 체중 lb'}[hit[0]]||hit[0]):hit[0])});
 // Keep stored data metric. Only convert visible profile/body fields.
 document.querySelectorAll('#profHeight,#profWeight,#profTargetWeight,#onHeight,#onWeight,#onTargetWeight,#bodyWeight,#bodySkeletalMuscle,#bodyFatMass,#bodyWaist').forEach(el=>{
   if(!el||el.value===''||el.dataset.garangConverting==='1')return;
   const baseKey=el.id;const last=el.dataset.garangUnit||'metric';
   if(last===unit())return;
   let v=Number(el.value);if(!Number.isFinite(v))return;
   if(last==='metric' && imp){ if(/Height/.test(el.id)||el.id==='profHeight'||el.id==='onHeight')v=v/2.54; else if(el.id==='bodyWaist')v=v/2.54; else v=v*2.2046226218; }
   else if(last==='imperial' && !imp){ if(/Height/.test(el.id)||el.id==='profHeight'||el.id==='onHeight')v=v*2.54; else if(el.id==='bodyWaist')v=v*2.54; else v=v/2.2046226218; }
   el.dataset.garangUnit=unit();el.value=String(Math.round(v*10)/10);
 });
}
function setupSignup(){
 const form=document.getElementById('signupForm');if(!form||form.dataset.garangGlobalBound)return;form.dataset.garangGlobalBound='1';
 const wrap=document.createElement('div');wrap.className='garangGlobalSignup';wrap.innerHTML='<label class="garangPrefLabel">Country / Region<select id="garangSignupCountry"><option value="KR">🇰🇷 대한민국</option><option value="US">🇺🇸 United States</option><option value="JP">🇯🇵 日本</option><option value="GB">🇬🇧 United Kingdom</option><option value="CA">🇨🇦 Canada</option><option value="AU">🇦🇺 Australia</option><option value="DE">🇩🇪 Deutschland</option><option value="FR">🇫🇷 France</option><option value="SG">🇸🇬 Singapore</option><option value="OTHER">Other</option></select></label><label class="garangPrefLabel">Language<select id="garangSignupLanguage"><option value="ko">한국어</option><option value="en">English</option></select></label><label class="garangPrefLabel">Units<select id="garangSignupUnit"><option value="metric">Metric · kg / cm</option><option value="imperial">Imperial · lb / in</option></select></label>';
 const terms=document.getElementById('terms');if(terms)terms.parentElement.before(wrap);else form.appendChild(wrap);
 const saved=prefs();
 const cs=document.getElementById('garangSignupCountry'),ls=document.getElementById('garangSignupLanguage'),us=document.getElementById('garangSignupUnit');
 if(cs)cs.value=saved.country||'KR';if(ls)ls.value=saved.language||'ko';if(us)us.value=saved.unit||'metric';
 const old=form.onsubmit;form.onsubmit=async function(e){
   const p={country:cs?.value||'KR',language:ls?.value||'ko',unit:us?.value||'metric'};
   try{localStorage.setItem(PREF_KEY,JSON.stringify(p));window.GARANGPreferences=p;document.documentElement.dataset.garangLanguage=p.language;document.documentElement.dataset.garangUnit=p.unit;document.documentElement.dataset.garangCountry=p.country;}catch(_){}
   if(old)return old.call(this,e);
 };
}

function setupChatAttach(){
 const form=document.getElementById('chatForm');if(!form||form.dataset.garangAttachBound)return;
 const input=document.getElementById('chatInput');const send=form.querySelector('button[type="submit"]');if(!input||!send)return;
 // Remove any legacy attachment control left by older V9.5 global UI code.
 form.querySelectorAll('#garangChatAttachBtn,.garangChatPlus').forEach(el=>el.remove());
 // V9.9 already owns the official composer. Reuse its single attachment control
 // instead of injecting a second plus button. This prevents duplicate composers.
 let plus=document.getElementById('chatAttachBtn');
 let file=document.getElementById('chatFile');
 if(!plus){
   plus=document.createElement('button');
   plus.type='button';plus.id='chatAttachBtn';plus.className='chatPlus';
   plus.setAttribute('aria-label','파일 또는 사진 첨부');plus.textContent='＋';
   form.insertBefore(plus,input);
 }
 if(!file){
   file=document.createElement('input');file.type='file';file.id='chatFile';
   file.accept='image/*,.pdf,.txt,.csv,.json';file.hidden=true;form.appendChild(file);
 }
 if(!plus.dataset.garangAttachClickBound){
   plus.dataset.garangAttachClickBound='1';
   plus.addEventListener('click',()=>file.click());
 }
 if(!file.dataset.garangAttachChangeBound){
   file.dataset.garangAttachChangeBound='1';
   file.addEventListener('change',()=>{
     const f=file.files?.[0];if(!f)return;
     window.GARANGKnowledge?.recordPhoto?.(f,{source:'chat_attachment',language:lang()});
     const note=lang()==='en'?`Attached: ${f.name}`:`첨부됨: ${f.name}`;
     let tag=form.querySelector('.garangAttachPill');
     if(!tag){tag=document.createElement('span');tag.className='garangAttachPill';form.insertBefore(tag,input);}
     tag.textContent=note;
   });
 }
 form.dataset.garangAttachBound='1';
}

function authTouchSafety(){
 const force=()=>{
   const auth=document.getElementById('auth');
   if(auth&&auth.classList.contains('active')){
     auth.style.pointerEvents='auto';auth.style.position='relative';auth.style.zIndex='200';
     auth.querySelectorAll('button,input,select,label,a').forEach(el=>{el.style.pointerEvents='auto';el.style.touchAction='manipulation';});
     ['garang88AiModal'].forEach(id=>{const m=document.getElementById(id);if(m){m.classList.remove('open');m.style.display='none';}});
     document.querySelectorAll('.g86-modal.open,.shareModal.open').forEach(m=>{m.classList.remove('open');m.style.display='none';});
   }
 };
 force();document.addEventListener('click',force,true);window.addEventListener('pageshow',force);
}
function observe(){
 let queued=false, observing=false, mo=null;
 const schedule=()=>{
   if(queued||window.__garangI18nApplying)return;
   queued=true;
   const run=()=>{
     queued=false;
     if(window.__garangI18nApplying)return;
     window.__garangI18nApplying=true;
     try{
       if(mo) mo.disconnect();
       applyAll();
     }finally{
       window.__garangI18nApplying=false;
       if(mo&&!observing){mo.observe(document.body,{subtree:true,childList:true});}
     }
   };
   if(window.requestAnimationFrame) requestAnimationFrame(run); else setTimeout(run,0);
 };
 mo=new MutationObserver(records=>{
   if(window.__garangI18nApplying)return;
   // Only react to meaningful additions/removals outside our own preference widgets.
   const relevant=records.some(r=>{
     if(r.type!=='childList'||(!r.addedNodes.length&&!r.removedNodes.length))return false;
     const t=r.target;
     return !(t&&t.closest&&t.closest('.garangGlobalSignup,#garangChatFile,#garangChatAttachBtn'));
   });
   if(relevant)schedule();
 });
 mo.observe(document.body,{subtree:true,childList:true});
 observing=true;
}
window.GARANGPreferences={...prefs()};window.GARANGLocale={get:prefs,set:savePrefs,translate:tr,language:lang,unit,country};
document.addEventListener('DOMContentLoaded',()=>{setupSignup();setupChatAttach();authTouchSafety();document.documentElement.dataset.garangLanguage=lang();document.documentElement.dataset.garangUnit=unit();applyAll();observe();});
})();
