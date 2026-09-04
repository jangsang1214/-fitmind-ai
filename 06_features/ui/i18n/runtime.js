(() => {
'use strict';
const dict=window.GARANG_UI_TRANSLATIONS||{};
const authBrandCopy={
 '누적. / ACCUMULATION.':'누적. / ACCUMULATION.',
 '당신의 시간은,':'Your time becomes',
 '결국 당신이 됩니다.':'who you are.',
 '운동 · 식단 · 러닝 · 체성분을 기억하고,':'GARANG remembers your training, nutrition, running, and body composition.',
 '쌓인 시간을 읽어 당신의 다음 선택을 설계합니다.':'It reads what accumulates to design your next choice.'
};
const exactCopy={
 '체중 변화':'Weight change','골격근량 변화':'Skeletal muscle change','체지방률 변화':'Body fat % change','체지방량 변화':'Fat mass change',
 '체중':'Weight','골격근량':'Skeletal muscle','체지방률':'Body fat %','체지방량':'Fat mass','제지방량':'Lean mass','골격근':'Skeletal muscle','체지방':'Body fat',
 '이미지':'Image','7일':'7D','30일':'30D','90일':'90D','3개월':'3M','1년':'1Y','전체':'All',
 '기록이 2개 이상 쌓이면 변화 그래프가 표시됩니다.':'The trend graph appears after at least 2 records.',
 '새 체성분 기록':'New body composition record','체중 · 키 · 골격근량 · 체지방률 4개만 입력':'Enter only weight, height, skeletal muscle, and body fat %.',
 '체성분 기록':'Body composition records','측정일':'Measurement date','키':'Height','첨부':'Attachment','파일 선택':'Choose file','선택 안 함':'Not selected','원본 보관 · OCR 미연결':'Original kept · OCR not connected','OCR 연결 가능':'OCR available',
 '세션 기록 시작':'Start session','세션 기록':'Session record','추가한 운동은 이 세션 초안에 표시됩니다.':'Added exercises will appear in the session draft here.',
 '가슴':'Chest','등':'Back','어깨':'Shoulders','하체':'Lower body','이두':'Biceps','삼두':'Triceps','코어':'Core','전신':'Full body',
 'GARANG은 당신의 운동·식단·회복·반복되는 선택을 읽고 다음 행동을 함께 판단합니다.':'GARANG reads your training, nutrition, recovery, and repeated choices to help decide what comes next.',
 'GARANG은 당신의 운동·식단·회복·반복되는 선택을 읽고 다음 행동을 함께 판단합니다':'GARANG reads your training, nutrition, recovery, and repeated choices to help decide what comes next.',
 'GARANG은 저장된 개인 데이터를 근거로 답합니다. 중요한 판단은 직접 확인하세요.':'GARANG answers from your saved personal data. Review important decisions yourself.'
};
const exerciseTerms=[
 ['스미스머신','Smith machine'],['체스트프레스','Chest press'],['벤치프레스','Bench press'],['랫풀다운','Lat pulldown'],['숄더프레스','Shoulder press'],['레그프레스','Leg press'],['레그익스텐션','Leg extension'],['레그컬','Leg curl'],['케이블','Cable'],['인클라인','Incline'],['디클라인','Decline'],['덤벨','Dumbbell'],['바벨','Barbell'],['머신','Machine'],['프론트','Front'],['리어','Rear'],['사이드','Lateral'],['해머','Hammer'],['리버스','Reverse'],['원암','One-arm'],['원 레그','Single-leg'],['루마니안','Romanian'],['스모','Sumo'],['데드리프트','Deadlift'],['스쿼트','Squat'],['런지','Lunge'],['로우','Row'],['풀업','Pull-up'],['친업','Chin-up'],['딥스','Dips'],['푸시업','Push-up'],['플라이','Fly'],['프레스','Press'],['컬','Curl'],['익스텐션','Extension'],['레이즈','Raise'],['크런치','Crunch'],['플랭크','Plank'],['브리지','Bridge'],['킥백','Kickback'],['풀오버','Pullover'],['슈러그','Shrug'],['하이','High'],['로우','Low']
];
const textState=new WeakMap(),attrState=new WeakMap();
const skipSelector='script,style,noscript,code,pre,textarea,[data-i18n-skip],.gpt-message.user .gpt-text,.memory-value,.meal-visual-copy>strong,.workout-history-row strong,.pr-head strong,.list-item strong';
const nativeConfirm=window.confirm.bind(window),nativeAlert=window.alert.bind(window),nativePrompt=window.prompt?.bind(window);
const glossary=[
 ['사진첩에서 불러오기','Choose from library'],['투명 오버레이 PNG','Transparent overlay PNG'],['최근 운동 기록','Recent workout records'],['최근 기록','Recent records'],['오늘의 상태','Today’s status'],['오늘 일정','Today’s schedule'],['빠른 기록','Quick log'],['운동 인증','Workout verification'],['러닝 인증','Run verification'],['체성분','Body composition'],['사용자 모델','User model'],['동기화','Sync'],['로그아웃','Log out'],['프로필','Profile'],['설정','Settings'],['운동','Workout'],['식단','Nutrition'],['러닝','Running'],['기록','Record'],['세션','Session'],['시작','Start'],['오늘','Today'],['최근','Recent'],['저장','Save'],['삭제','Delete'],['수정','Edit'],['완료','Done'],['목표','Goal'],['시간','Time'],['세트','Sets'],['반복','Reps'],['중량','Weight'],['체중','Weight'],['키','Height'],['골격근량','Skeletal muscle'],['골격근','Skeletal muscle'],['체지방률','Body fat %'],['체지방량','Fat mass'],['제지방량','Lean mass'],['체지방','Body fat'],['단백질','Protein'],['탄수화물','Carbs'],['지방','Fat'],['사진','Photo'],['이미지','Image'],['선택','Choose'],['상태','Status'],['계획','Plan'],['추천','Recommendation'],['전체','All'],['변화','Change'],['회복','Recovery'],['다음 행동','next action'],['필요할 때만 보기','view when needed'],['필요할 때 펼치기','expand when needed'],['없습니다','None'],['없어요','None']
];
function lang(){return document.documentElement.lang==='en'?'en':'ko';}
function exerciseName(s){
 if(!/(벤치프레스|체스트프레스|데드리프트|스쿼트|런지|로우|풀다운|프레스|컬|익스텐션|레이즈|플라이|푸시업|풀업|친업|딥스|크런치|플랭크|브리지|킥백|풀오버|슈러그)/.test(s))return null;
 let out=s;for(const [ko,en] of exerciseTerms)out=out.split(ko).join(en);
 return /[가-힣]/.test(out)?null:out.replace(/\s+/g,' ').trim();
}
function dynamic(s){
 let out=window.GarangTranslateDynamic?window.GarangTranslateDynamic(s,'en'):s;
 if(out!==s)return out;
 const exercise=exerciseName(s);if(exercise)return exercise;
 return s
  .replace(/^(\d+(?:\.\d+)?)분 기본 훈련$/,'$1 min baseline training')
  .replace(/^(\d+(?:\.\d+)?)분 회복 세션$/,'$1 min recovery session')
  .replace(/^(\d+(?:\.\d+)?)분 대체 세션$/,'$1 min replacement session')
  .replace(/^(\d+(?:\.\d+)?)분 감량 세션$/,'$1 min reduced-volume session')
  .replace(/^수면 (.*?)시간 · 에너지 (.*?)\/5 · 스트레스 (.*?)\/5$/,'Sleep $1 h · Energy $2/5 · Stress $3/5')
  .replace(/^회복 지표가 (.*?)점으로 낮습니다\.$/,'Recovery score is low at $1.')
  .replace(/^근육통 (.*?)\/5(?: · (.*))?$/,(_,a,b)=>`Soreness ${a}/5${b?` · ${b}`:''}`)
  .replace(/^최근 3일 운동 기록 (\d+)개가 있습니다\.$/,'There are $1 workout records in the last 3 days.')
  .replace(/^최근 3일 운동 기록 (\d+)개를 반영했습니다\.$/,'Included $1 workout records from the last 3 days.')
  .replace(/^최근 러닝 (\d+)회를 함께 반영했습니다\.$/,'Also included $1 recent runs.')
  .replace(/^오늘 Planner의 “(.*)” 일정과 함께 판단했습니다\.$/,'Judged together with today’s Planner item “$1”.')
  .replace(/^(\d+) records · 필요할 때 펼치기$/,'$1 records · expand when needed')
  .replace(/^(\d+) records · 필요할 때만 보기$/,'$1 records · view when needed')
  .replace(/^(\d+(?:\.\d+)?)분 · (.*)$/,'$1 min · $2')
  .replace(/^단백질 목표 (\d+)g · (\d+)%$/,'Protein target $1 g · $2%')
  .replace(/^(\d+)회 \/ week$/,'$1 times / week');
}
function translateCore(source){
 if(lang()!=='en'||!source||!/[가-힣]/.test(source))return source;
 const m=source.match(/^(\s*)([\s\S]*?)(\s*)$/),lead=m?m[1]:'',body=m?m[2]:source,tail=m?m[3]:'';
 let out=authBrandCopy[body]||exactCopy[body]||dict[body]||dynamic(body);
 if(out===body){for(const [ko,en] of glossary)out=out.split(ko).join(en);}
 return lead+out+tail;
}
function skipped(el){return !!el?.closest?.(skipSelector);}
function applyText(node){
 if(!node||node.nodeType!==Node.TEXT_NODE||skipped(node.parentElement))return;
 const cur=node.nodeValue||'';let rec=textState.get(node);
 if(!rec||cur!==rec.last)rec={source:cur,last:cur};
 const next=lang()==='en'?translateCore(rec.source):rec.source;rec.last=next;textState.set(node,rec);if(next!==cur)node.nodeValue=next;
}
function applyAttr(el,name){
 if(!el||skipped(el)||!el.hasAttribute(name))return;
 let bag=attrState.get(el)||{},cur=el.getAttribute(name)||'',rec=bag[name];if(!rec||cur!==rec.last)rec={source:cur,last:cur};
 const next=lang()==='en'?translateCore(rec.source):rec.source;rec.last=next;bag[name]=rec;attrState.set(el,bag);if(next!==cur)el.setAttribute(name,next);
}
function applyRoot(root=document){
 if(root.nodeType===Node.TEXT_NODE){applyText(root);return;}
 const scope=root.nodeType===Node.ELEMENT_NODE||root.nodeType===Node.DOCUMENT_NODE?root:null;if(!scope)return;
 if(scope.nodeType===Node.ELEMENT_NODE){for(const a of ['placeholder','aria-label','title','alt'])applyAttr(scope,a);}
 const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))applyText(n);
 scope.querySelectorAll?.('[placeholder],[aria-label],[title],[alt]').forEach(el=>{for(const a of ['placeholder','aria-label','title','alt'])applyAttr(el,a);});
}
let queued=false;function queue(root=document){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;applyRoot(root);});}
const observer=new MutationObserver(muts=>{let full=false;for(const m of muts){if(m.type==='attributes'&&m.target===document.documentElement&&m.attributeName==='lang'){full=true;continue;}if(m.type==='characterData')applyText(m.target);if(m.type==='childList')m.addedNodes.forEach(n=>applyRoot(n));if(m.type==='attributes')applyAttr(m.target,m.attributeName);}if(full)queue(document);});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang','placeholder','aria-label','title','alt']});
window.confirm=msg=>nativeConfirm(lang()==='en'?translateCore(String(msg)):msg);
window.alert=msg=>nativeAlert(lang()==='en'?translateCore(String(msg)):msg);
if(nativePrompt)window.prompt=(msg,def)=>nativePrompt(lang()==='en'?translateCore(String(msg)):msg,def);
window.GarangI18n={translate:translateCore,refresh:()=>applyRoot(document),language:lang};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>applyRoot(document),{once:true});else applyRoot(document);
})();
