(() => {
'use strict';
const dict=window.GARANG_UI_TRANSLATIONS||{};
const textState=new WeakMap(),attrState=new WeakMap();
const skipSelector='script,style,noscript,code,pre,textarea,[data-i18n-skip],.gpt-message.user .gpt-text,.memory-value,.meal-visual-copy>strong,.workout-history-row strong,.pr-head strong,.list-item strong';
const nativeConfirm=window.confirm.bind(window),nativeAlert=window.alert.bind(window),nativePrompt=window.prompt?.bind(window);
const glossary=[
 ['사진첩에서 불러오기','Choose from library'],['투명 오버레이 PNG','Transparent overlay PNG'],['최근 운동 기록','Recent workout records'],['최근 기록','Recent records'],['오늘의 상태','Today’s status'],['오늘 일정','Today’s schedule'],['빠른 기록','Quick log'],['운동 인증','Workout verification'],['러닝 인증','Run verification'],['체성분','Body composition'],['사용자 모델','User model'],['동기화','Sync'],['로그아웃','Log out'],['프로필','Profile'],['설정','Settings'],['운동','Workout'],['식단','Nutrition'],['러닝','Running'],['기록','Record'],['오늘','Today'],['최근','Recent'],['저장','Save'],['삭제','Delete'],['수정','Edit'],['완료','Done'],['목표','Goal'],['시간','Time'],['세트','Sets'],['반복','Reps'],['중량','Weight'],['체중','Weight'],['단백질','Protein'],['탄수화물','Carbs'],['지방','Fat'],['사진','Photo'],['선택','Choose'],['상태','Status'],['계획','Plan'],['추천','Recommendation'],['전체','All'],['없습니다','None'],['없어요','None']
];
function lang(){return document.documentElement.lang==='en'?'en':'ko';}
function dynamic(s){
 let out=window.GarangTranslateDynamic?window.GarangTranslateDynamic(s,'en'):s;
 if(out!==s)return out;
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
  .replace(/^(\d+(?:\.\d+)?)분 · (.*)$/,'$1 min · $2')
  .replace(/^단백질 목표 (\d+)g · (\d+)%$/,'Protein target $1 g · $2%')
  .replace(/^(\d+)회 \/ week$/,'$1 times / week');
}
function translateCore(source){
 if(lang()!=='en'||!source||!/[가-힣]/.test(source))return source;
 const m=source.match(/^(\s*)([\s\S]*?)(\s*)$/),lead=m?m[1]:'',body=m?m[2]:source,tail=m?m[3]:'';
 let out=dict[body]||dynamic(body);
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
