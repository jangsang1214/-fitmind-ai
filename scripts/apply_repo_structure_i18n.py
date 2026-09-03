from pathlib import Path
import json, os, re, shutil

ROOT=Path(__file__).resolve().parents[1]


def copy_file(src,dst):
    src=ROOT/src; dst=ROOT/dst
    if not src.exists():
        raise SystemExit(f'missing source: {src.relative_to(ROOT)}')
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dst)


def write(path,text):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text,encoding='utf-8')

# 1) Canonical categorized runtime sources.
STYLE_NAMES=[
 'styles.css','garang-target-ui.css','garang-functional-recovery.css','garang-runtime-final.css',
 'garang-brand-runtime-v2.css','garang-polish-v3.css','garang-font-logo-v1.css','garang-stability-v1.css'
]
for name in STYLE_NAMES: copy_file(name,f'03_styles/runtime/{name}')

UI_RUNTIME=[
 'garang-auth-bootstrap.js','garang-functional-recovery.js','garang-brand-runtime-v2.js',
 'garang-polish-v3.js','garang-polish-v3-fix.js','garang-coach-home-hotfix.js'
]
for name in UI_RUNTIME: copy_file(name,f'06_features/ui/runtime/{name}')

copy_file('app.js','01_app/app.js')
copy_file('data-schema.js','02_core/data-schema.js')
copy_file('performance.js','services/performance.js')
copy_file('firebase-config.js','07_config/firebase-config.js')
copy_file('garang-services-config.js','07_config/garang-services-config.js')

for name in [
 'exercise-db.json','food-db.json','exercise_knowledge.jsonl','food_knowledge.jsonl','fitmind_rules.jsonl',
 'fitmind_sft.jsonl','synthetic_korean_dialogue_v6.jsonl','korean-dialogue-sources-v6.json',
 'v5_coach_rules.json','v5_conversation_sft.jsonl'
]:
    if (ROOT/name).exists(): copy_file(name,f'04_data/knowledge/{name}')

copy_file('garang-mark.svg','05_assets/garang-mark.svg')
copy_file('garang-app-icon.svg','05_assets/garang-app-icon.svg')
for name in ['garang-running-standard.svg','garang-workout-standard.svg','garang-v10.4-certification-overlay-mockup.png']:
    if (ROOT/name).exists(): copy_file(name,f'05_assets/{name}')

for name in ['firebase-config.example.js','google-maps-config.example.js','GOOGLE_MAPS_CONFIG.txt','fitmind-manifest.json','services-config.js','version.js']:
    if (ROOT/name).exists(): copy_file(name,f'07_config/{name}')
if (ROOT/'firestore.rules').exists(): copy_file('firestore.rules','07_config/firestore.rules')
if (ROOT/'firestore.indexes.json').exists(): copy_file('firestore.indexes.json','07_config/firestore.indexes.json')
if (ROOT/'pricing-and-unit-economics.json').exists(): copy_file('pricing-and-unit-economics.json','08_business/pricing-and-unit-economics.json')
if (ROOT/'qa_commercial_core.py').exists(): copy_file('qa_commercial_core.py','scripts/legacy/qa_commercial_core.py')

# 2) Consolidated UI translations live under the UI category.
base=(ROOT/'04_data/ui-translations.js').read_text(encoding='utf-8') if (ROOT/'04_data/ui-translations.js').exists() else (ROOT/'ui-translations.js').read_text(encoding='utf-8')
final=(ROOT/'04_data/ui-final-translations.js').read_text(encoding='utf-8') if (ROOT/'04_data/ui-final-translations.js').exists() else (ROOT/'ui-final-translations.js').read_text(encoding='utf-8')
EXTRA={
 '기록을 넘어,':'Beyond tracking,',
 '당신의 시간을 이해하는 AI.':'AI that understands your time.',
 '운동·식단·러닝·체성분과 반복되는 선택을 기억하고, GARANG이 지금 필요한 다음 행동을 제안합니다.':'GARANG remembers your workouts, nutrition, running, body data and repeated choices, then recommends the next action you need now.',
 '로그인 없이도 로컬 데모에서 전체 기능을 확인할 수 있습니다.':'Explore every feature in local demo mode without signing in.',
 '6자 이상':'At least 6 characters','전체 기능':'All features','동기화 상태':'Sync status','주요 메뉴':'Main navigation',
 '동기화됨':'Synced','동기화 중':'Syncing','동기화 대기':'Waiting to sync','동기화 확인':'Check sync','동기화 재시도':'Retrying sync','로컬 저장':'Saved locally','저장':'Save',
 '기기 저장 공간을 확인해 주세요.':'Check available storage on this device.',
 '클라우드 연결을 확인 중입니다. 기록은 기기에 안전하게 저장됩니다.':'Checking the cloud connection. Your records remain safely stored on this device.',
 '클라우드 동기화는 백그라운드에서 다시 시도합니다.':'Cloud sync will retry in the background.',
 '클라우드 동기화를 다시 확인합니다.':'Checking cloud sync again.','동기화가 완료되었습니다.':'Sync completed.','로그인하면 Firebase와 동기화됩니다.':'Sign in to sync with Firebase.',
 'Firebase 설정을 확인해 주세요.':'Check the Firebase configuration.','계정을 만들었습니다.':'Account created.','로그인했습니다.':'Signed in.',
 '이메일을 먼저 입력해 주세요.':'Enter your email first.','재설정 메일을 보냈습니다.':'Password reset email sent.',
 '이메일 또는 비밀번호가 올바르지 않습니다.':'The email or password is incorrect.','이미 사용 중인 이메일입니다.':'This email is already in use.','비밀번호는 6자 이상이어야 합니다.':'Password must be at least 6 characters.',
 '로그인이 취소되었습니다.':'Sign-in was canceled.','Firebase Console에서 로그인 방식을 활성화해 주세요.':'Enable this sign-in method in Firebase Console.','Firebase 승인 도메인을 확인해 주세요.':'Check Firebase authorized domains.','브라우저 팝업을 허용해 주세요.':'Allow browser pop-ups.','Firestore 권한 규칙을 확인해 주세요.':'Check Firestore security rules.','인증 중 오류가 발생했습니다.':'An authentication error occurred.',
 '오늘':'Today','오늘 계획 적용':'Apply today’s plan','분석 보기':'View analysis','오늘의 상태':'Today’s status','수면':'Sleep','에너지':'Energy','스트레스':'Stress','근육통':'Soreness',
 '상태를 저장하면 오늘의 추천이 더 정확해집니다.':'Save your status to make today’s recommendation more precise.','상태 수정':'Edit status','상태 저장':'Save status','오늘 일정':'Today’s schedule','전체 보기':'View all','오늘 계획 만들기':'Build today’s plan','GARANG 추천을 확인하고 직접 승인합니다.':'Review GARANG’s recommendation and approve it yourself.','빠른 기록':'Quick log','부위를 보고 기록':'Log by body area','사진으로 시작':'Start with a photo','거리와 페이스':'Distance and pace','바디':'Body','체성분 변화':'Body composition changes',
 '오늘 판단':'Today’s decision','추천':'Recommendation','추천 적용':'Apply recommendation','Planner 적용':'Apply to Planner','오늘 운동':'Today’s workout','최근 기록':'Recent records','오늘 식단':'Today’s nutrition','회복 상태':'Recovery status','GARANG에게 메시지 보내기':'Message GARANG','전송':'Send','AI 연결 상태와 데이터 출처를 숨기지 않습니다.':'AI connection status and data sources are always disclosed.','GARANG Coach Engine V1 · 실제 저장 기록 기반':'GARANG Coach Engine V1 · based on saved records',
 '기록':'Log','부위 → 종목 → 세트':'Body area → exercise → sets','사진 → 확인 → 저장':'Photo → review → save','GPS · 페이스 · 기록':'GPS · pace · records','몸의 변화를 추적':'Track body changes','계획과 기억':'Plans and memory','추천을 승인해 실제 일정으로 연결':'Approve recommendations and turn them into a real schedule','목표·선호·습관을 장기 기억':'Long-term memory for goals, preferences and habits',
 '운동 선택':'Choose workout','전체':'All','가슴':'Chest','등':'Back','어깨':'Shoulders','하체':'Lower body','코어':'Core','이두':'Biceps','삼두':'Triceps','전신':'Full body','주의 부위':'Area to watch','최근 부하':'Recent load','현재 상태':'Current state',
 '세트 기록':'Set logging','이 종목 최고':'Best for this exercise','시간 분':'Minutes','세션에 추가':'Add to session','세션 저장':'Save session','초기화':'Reset','사진을 가리지 않는 프리미엄 투명 오버레이':'A premium transparent overlay that keeps the photo visible.','사진첩에서 불러오기':'Choose from library','투명 오버레이 PNG':'Transparent overlay PNG','선택한 미디어가 없습니다.':'No media selected.','최근 운동 기록':'Recent workout records','필요할 때 펼치기':'Expand when needed','운동 기록이 없습니다.':'No workout records yet.','예상 1RM':'Estimated 1RM','운동을 추가하면 세션 초안이 여기에 표시됩니다.':'Added exercises will appear in the session draft here.',
 '음식 사진으로 기록 시작':'Start logging with a food photo','사진 촬영 / 선택':'Take or choose photo','단백질 목표':'Protein target','사진 분석 초안':'Photo analysis draft','음식명 / 보정':'Food name / correction','예상 중량 g':'Estimated weight (g)','사진 분석':'Analyze photo','DB 초안 생성':'Create DB draft','확인하고 식사에 추가':'Review and add to meal','직접 입력':'Manual entry','사진 대신 검색해서 기록':'Search and log instead of using a photo','음식 / 메뉴':'Food / menu','DB 불러오기':'Load from DB','추가':'Add','한 끼 저장':'Save meal','오늘 먹은 것':'Today’s meals','첫 식사를 사진으로 남겨보세요.':'Log your first meal with a photo.','음식 또는 Meal Scan 초안을 추가하세요.':'Add a food item or Meal Scan draft.','식사 사진 미리보기':'Meal photo preview','취소':'Cancel',
 'GPS 기반 거리·시간·페이스를 기록합니다.':'Track GPS-based distance, time and pace.','시간':'Time','분/km':'min/km','GPS 대기 중':'Waiting for GPS','러닝 시작':'Start run','정지 & 저장':'Stop & save','러닝 인증':'Run verification','미디어를 선택하면 인증 오버레이를 생성합니다.':'Choose media to create a verification overlay.','러닝 기록이 없습니다.':'No running records yet.',
 '체중':'Weight','골격근량':'Skeletal muscle','체지방률':'Body fat %','체지방량':'Fat mass','측정 기록':'Measurement records','신체 모델':'Body model','남성':'Male','여성':'Female','기본 프로필':'Basic profile','사용자 모델 수정':'Edit user model','회 / week':'times / week','몸과 목표 정보만 관리합니다.':'Manage only your body and goal information.',
 '언어, 플랜, 데이터와 계정을 관리합니다.':'Manage language, plan, data and account settings.','언어 및 표시':'Language & display','앱 기본 언어':'App language','표시 단위':'Display units','설정 저장':'Save settings','기록과 기본 코칭':'Tracking and basic coaching','개인 퍼포먼스 에이전트':'Personal performance agent','기본 GARANG Score':'Basic GARANG Score','제한된 AI Coach':'Limited AI Coach','장기 분석 / Body Intelligence':'Long-term analysis / Body Intelligence','확장 AI Coach':'Expanded AI Coach','PRO 사용 중':'PRO active','PRO 알아보기':'Learn about PRO','실제 결제 공급자가 연결되기 전에는 플랜을 임의로 활성화하지 않습니다.':'Plans are not activated until a real payment provider is connected.','기록은 먼저 기기에 저장되고 이후 동기화됩니다.':'Records are saved to the device first, then synced.','재시도':'Retry','구버전 가져오기':'Import legacy data',
 'GARANG이 먼저 알아야 할 것':'What GARANG should know first','입력값은 나중에 언제든 수정할 수 있으며 건너뛸 수 있습니다.':'You can edit these values later or skip this step.','주요 목표':'Primary goal','근육 증가':'Build muscle','체지방 감소':'Lose body fat','러닝 퍼포먼스':'Running performance','전반적인 건강':'Overall health','운동 경험':'Training experience','입문':'Beginner','중급':'Intermediate','숙련':'Advanced','주간 가능 횟수':'Available days per week','하루 가능 시간':'Available time per day','운동 선호 / 제약':'Training preferences / constraints','GARANG 시작':'Start GARANG','나중에 설정':'Set later',
 'Memory 추가':'Add Memory','Memory 수정':'Edit Memory','유형':'Type','중요도 1~5':'Importance 1–5','내용':'Content','Memory 기준':'Memory criteria','전체 Memory':'Total Memory','사용자 확인':'User confirmed','기억 중인 내용':'Remembered information','확인 취소':'Undo confirmation','저장된 Memory가 없습니다.':'No saved Memory.','Memory를 저장했습니다.':'Memory saved.','이 Memory를 삭제할까요?':'Delete this Memory?',
 '이 계획을 삭제할까요?':'Delete this plan?','계획 내용을 입력해 주세요.':'Enter the plan details.','계획을 저장했습니다.':'Plan saved.','Key와 내용을 입력해 주세요.':'Enter both Key and content.','프로필을 저장했습니다.':'Profile saved.','설정을 저장했습니다.':'Settings saved.','동기화 설정을 확인해 주세요.':'Check the sync configuration.','로그인 상태에서 클라우드 동기화를 사용할 수 있습니다.':'Cloud sync is available when signed in.','GARANG PRO가 활성화되어 있습니다.':'GARANG PRO is active.','실제 결제 연동 후 PRO 업그레이드를 사용할 수 있습니다.':'PRO upgrades will be available after payment integration.','사용자 모델을 저장했습니다.':'User model saved.','구버전 로컬 데이터를 찾지 못했습니다.':'No legacy local data found.','구버전 로컬 데이터를 현재 계정/데모 상태로 가져올까요? 현재 데이터와 병합됩니다.':'Import legacy local data into the current account/demo state? It will be merged with current data.','구버전 데이터를 병합했습니다.':'Legacy data merged.',
 '현재 기록 기준으로 계획을 유지해도 좋습니다.':'Based on your current records, maintaining the plan is appropriate.','오늘 컨디션 체크인이 없어 최근 기록 중심으로 판단했습니다.':'No check-in today, so this judgment is based mainly on recent records.','회복 우선':'Prioritize recovery','수면 부족이 커서 고강도 훈련보다 회복을 우선합니다.':'Sleep is too low, so prioritize recovery over high-intensity training.','수면이 4.5시간 미만입니다.':'Sleep is under 4.5 hours.','오늘은 강도를 낮추고 움직임과 회복에 집중하는 편이 좋습니다.':'Lower intensity today and focus on movement and recovery.','근육통이 높은 부위를 피하고 다른 부위 또는 Zone 2로 대체합니다.':'Avoid highly sore areas and replace the session with another body area or Zone 2.','최근 훈련량을 고려해 오늘 총 볼륨을 약 20% 낮춥니다.':'Reduce total volume by about 20% today based on recent training load.','기록이 쌓이면 GARANG Score가 생성됩니다.':'GARANG Score will appear as records accumulate.','오늘 회복 상태가 전체 점수를 낮추고 있습니다.':'Today’s recovery status is lowering the overall score.','최근 7일 운동 일관성을 높일 여지가 있습니다.':'There is room to improve training consistency over the last 7 days.','최근 단백질 목표 달성률이 낮습니다.':'Recent protein-target adherence is low.','최근 기록이 안정적으로 유지되고 있습니다.':'Recent records are staying stable.',
 '일부 운동/식단 데이터는 연결 후 다시 불러옵니다.':'Some workout and nutrition data will reload after reconnecting.','운동/식단 데이터 일부를 불러오지 못했습니다.':'Some workout or nutrition data could not be loaded.','인증 이미지 저장에 실패했습니다.':'Failed to save the verification image.','투명 오버레이 PNG 생성에 실패했습니다.':'Failed to create the transparent overlay PNG.','공유/저장이 브라우저 정책으로 제한됩니다.':'Sharing or saving is limited by browser policy.','원본 영상 공유':'Share original video','영상 합성은 서버/네이티브 인코더 연결 전까지 원본을 변조하지 않습니다.':'Until a server/native encoder is connected, video verification does not alter the original.','프리미엄 인증 이미지 저장 / 공유':'Save / share premium verification image'
}
translations=base.rstrip()+"\n\n"+final.rstrip()+"\n\nObject.assign(window.GARANG_UI_TRANSLATIONS,"+json.dumps(EXTRA,ensure_ascii=False,separators=(',',':'))+");\n"
write('06_features/ui/i18n/translations.js',translations)

RUNTIME=r'''(() => {
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
'''
write('06_features/ui/i18n/runtime.js',RUNTIME)
write('06_features/ui/README.md','''# GARANG UI\n\nCanonical UI runtime source lives here.\n\n- `runtime/`: auth, polish, recovery and other UI runtime modules\n- `i18n/`: translation dictionary and live language runtime\n\nThe public `index.html` loads these categorized files directly. Do not recreate loose root-level copies.\n''')

# 3) App runtime references categorized data/assets.
app_path=ROOT/'01_app/app.js'; app=app_path.read_text(encoding='utf-8')
for name in ['exercise-db.json','food-db.json','exercise_knowledge.jsonl','food_knowledge.jsonl','fitmind_rules.jsonl']:
    app=app.replace(f"'{name}'",f"'04_data/knowledge/{name}'")
app=app.replace('src="./garang-mark.svg"','src="./05_assets/garang-mark.svg"').replace('src="garang-mark.svg"','src="./05_assets/garang-mark.svg"')
app_path.write_text(app,encoding='utf-8')

# 4) Public index points to categorized runtime files.
idx=(ROOT/'index.html').read_text(encoding='utf-8')
for name in STYLE_NAMES: idx=idx.replace(f'./{name}',f'./03_styles/runtime/{name}')
idx=idx.replace('./manifest.webmanifest','./07_config/manifest.webmanifest')
idx=idx.replace('./garang-app-icon.svg','./05_assets/garang-app-icon.svg').replace('./garang-mark.svg','./05_assets/garang-mark.svg')
repls={
 './firebase-config.js':'./07_config/firebase-config.js','./garang-services-config.js':'./07_config/garang-services-config.js',
 './data-schema.js':'./02_core/data-schema.js','./performance.js':'./services/performance.js','./garang-auth-bootstrap.js':'./06_features/ui/runtime/garang-auth-bootstrap.js',
 './app.js':'./01_app/app.js','./garang-functional-recovery.js':'./06_features/ui/runtime/garang-functional-recovery.js','./garang-brand-runtime-v2.js':'./06_features/ui/runtime/garang-brand-runtime-v2.js',
 './garang-polish-v3.js':'./06_features/ui/runtime/garang-polish-v3.js','./garang-polish-v3-fix.js':'./06_features/ui/runtime/garang-polish-v3-fix.js','./garang-coach-home-hotfix.js':'./06_features/ui/runtime/garang-coach-home-hotfix.js'
}
for a,b in repls.items(): idx=idx.replace(a,b)
needle='</body>'
i18n='<script src="./06_features/ui/i18n/translations.js?v=1.0.0"></script>\n<script src="./06_features/ui/i18n/runtime.js?v=1.0.0"></script>\n'
if '06_features/ui/i18n/runtime.js' not in idx: idx=idx.replace(needle,i18n+needle)
(ROOT/'index.html').write_text(idx,encoding='utf-8')

# 5) Manifest and service worker.
manifest=json.loads((ROOT/'manifest.webmanifest').read_text(encoding='utf-8'))
manifest['start_url']='../'; manifest['scope']='../'
manifest['icons']=[{'src':'../05_assets/garang-app-icon.svg','sizes':'512x512','type':'image/svg+xml','purpose':'any maskable'}]
write('07_config/manifest.webmanifest',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

styles=[f'03_styles/runtime/{n}' for n in STYLE_NAMES]
scripts=['07_config/firebase-config.js','07_config/garang-services-config.js','02_core/data-schema.js','services/performance.js','06_features/ui/runtime/garang-auth-bootstrap.js','01_app/app.js','06_features/ui/runtime/garang-functional-recovery.js','06_features/ui/runtime/garang-brand-runtime-v2.js','06_features/ui/runtime/garang-polish-v3.js','06_features/ui/runtime/garang-polish-v3-fix.js','06_features/ui/runtime/garang-coach-home-hotfix.js','06_features/ui/i18n/translations.js','06_features/ui/i18n/runtime.js']
data=[f'04_data/knowledge/{n}' for n in ['exercise-db.json','food-db.json','exercise_knowledge.jsonl','food_knowledge.jsonl','fitmind_rules.jsonl','fitmind_sft.jsonl','synthetic_korean_dialogue_v6.jsonl']]
assets=['07_config/manifest.webmanifest','sw.js','02_core/sw-runtime.js','05_assets/garang-mark.svg','05_assets/garang-app-icon.svg']
runtime_manifest={'version':json.loads((ROOT/'package.json').read_text())['version'],'entry':'index.html','branch':'main','deployRoot':'.','styles':styles,'scripts':scripts,'data':data,'assets':assets}
write('runtime-manifest.json',json.dumps(runtime_manifest,ensure_ascii=False,indent=2)+'\n')

shell=['./','./index.html']+[f'./{x}' for x in styles+scripts+['07_config/manifest.webmanifest','05_assets/garang-mark.svg','05_assets/garang-app-icon.svg','04_data/knowledge/exercise-db.json','04_data/knowledge/food-db.json']]
sw_runtime="const CACHE='garang-structured-i18n-v1-20260904';\nconst SHELL="+json.dumps(shell,ensure_ascii=False,separators=(',',':'))+";\n"+r'''self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));});
'''
write('02_core/sw-runtime.js',sw_runtime)
write('sw.js',"importScripts('./02_core/sw-runtime.js');\n")

# 6) Firebase config now points to categorized Firestore files.
fb=json.loads((ROOT/'firebase.json').read_text(encoding='utf-8'))
if 'firestore' in fb:
    fb['firestore']['rules']='07_config/firestore.rules'; fb['firestore']['indexes']='07_config/firestore.indexes.json'
write('firebase.json',json.dumps(fb,ensure_ascii=False,indent=2)+'\n')

# 7) Test suite follows the canonical paths and adds i18n/repository checks.
path_map={
 'data-schema.js':'02_core/data-schema.js','performance.js':'services/performance.js','features.js':'06_features/final/features.js',
 'final.css':'03_styles/features/final.css','commercial.css':'03_styles/features/commercial.css','commercial-core.js':'06_features/final/commercial-core.js',
 'records.js':'services/records.js','adapters.js':'services/adapters.js','storage.js':'services/storage.js','today.js':'02_core/today.js','app.js':'01_app/app.js'
}
for test in (ROOT/'tests').rglob('*.cjs'):
    text=test.read_text(encoding='utf-8')
    for old,new in path_map.items(): text=text.replace(f"path.join(root,'{old}')",f"path.join(root,'{new}')")
    if test.name=='major-update.test.cjs':
        start=text.find("test('flat runtime and categorized source stay synchronized'")
        end=text.find("\n\nconsole.log(JSON.stringify(tests,null,2));")
        if start>=0 and end>start:
            repl="""test('runtime uses categorized sources without loose root duplicates',()=>{\n const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));\n for(const token of ['01_app/app.js','02_core/data-schema.js','services/performance.js','06_features/ui/i18n/runtime.js'])assert.ok(manifest.scripts.includes(token),token);\n for(const loose of ['app.js','data-schema.js','performance.js','styles.css','features.js','final.css'])assert.equal(fs.existsSync(path.join(root,loose)),false,loose);\n});"""
            text=text[:start]+repl+text[end:]
    test.write_text(text,encoding='utf-8')

i18n_test=r'''const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');
const tr=fs.readFileSync(path.join(root,'06_features/ui/i18n/translations.js'),'utf8');
const rt=fs.readFileSync(path.join(root,'06_features/ui/i18n/runtime.js'),'utf8');
for(const p of ['./03_styles/runtime/styles.css','./01_app/app.js','./06_features/ui/i18n/translations.js','./06_features/ui/i18n/runtime.js','./05_assets/garang-mark.svg'])assert.ok(html.includes(p),p);
assert.match(app,/preferences:\{language:'ko'/);assert.match(app,/language:\$\('languageSetting'\)\.value==='en'\?'en':'ko'/);assert.match(app,/saveState\(\{event:'settings_updated'\}\)/);
for(const phrase of ['기록을 넘어,','오늘의 상태','운동 선택','사진 촬영 / 선택','러닝 인증','언어 및 표시','GARANG이 먼저 알아야 할 것'])assert.ok(tr.includes(phrase),phrase);
for(const token of ['MutationObserver','document.documentElement.lang','window.confirm','placeholder','aria-label','GarangI18n'])assert.ok(rt.includes(token),token);
for(const loose of ['app.js','styles.css','data-schema.js','performance.js','garang-auth-bootstrap.js','garang-mark.svg','garang-app-icon.svg','exercise-db.json','food-db.json'])assert.equal(fs.existsSync(path.join(root,loose)),false,loose);
console.log(JSON.stringify({status:'PASS',scope:'categorized runtime + persistent English UI translation wiring'},null,2));
'''
write('tests/i18n-structure.test.cjs',i18n_test)
pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
if 'node tests/i18n-structure.test.cjs' not in pkg['scripts']['test']:
    pkg['scripts']['test'] += ' && node tests/i18n-structure.test.cjs'
write('package.json',json.dumps(pkg,ensure_ascii=False,indent=2)+'\n')

# 8) New static checker understands categorized runtime and rejects loose active duplicates.
check=r'''const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>['.git','dist','node_modules'].includes(x.name)?[]:x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const files=walk(root),failures=[],counts={javascript:0,json:0,jsonl:0,activeAssets:0};
for(const f of files){const ext=path.extname(f);if(['.js','.cjs'].includes(ext)){counts.javascript++;const result=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(result.status!==0)failures.push({file:path.relative(root,f),error:result.stderr});}
 if(['.json','.webmanifest','.jsonl'].includes(ext)){try{const text=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');if(ext==='.jsonl'){text.split(/\r?\n/).filter(x=>x.trim()).forEach(x=>JSON.parse(x));counts.jsonl++;}else{JSON.parse(text);counts.json++;}}catch(e){failures.push({file:path.relative(root,f),error:e.message});}}}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8')),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(manifest.version!==pkg.version)failures.push({file:'runtime-manifest.json',error:'Version does not match package.json'});
for(const group of ['styles','scripts','data','assets'])for(const asset of manifest[group]||[]){if(!fs.existsSync(path.join(root,asset)))failures.push({asset,error:'Missing runtime-manifest asset'});}
for(const asset of [...(manifest.styles||[]),...(manifest.scripts||[])])if(!html.includes('./'+asset))failures.push({asset,error:'Runtime entry does not reference declared style/script'});
if((manifest.scripts||[]).some(x=>/v8|v9|v99|integrated/i.test(x)))failures.push({file:'runtime-manifest.json',error:'Historical runtime source is active'});
const assets=new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('https:')&&!x.startsWith('data:')).map(x=>x.replace(/^\.\//,'').split('?')[0]));
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');for(const m of app.matchAll(/(?:loadJSONL?|fetch)\('([^']+)'/g)){const a=m[1];if(!/^https?:|^\//.test(a))assets.add(a.replace(/^\.\//,''));}
for(const asset of assets){if(!asset||asset==='#')continue;counts.activeAssets++;if(!fs.existsSync(path.join(root,asset)))failures.push({asset,error:'Missing active asset'});}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);if(new Set(ids).size!==ids.length)failures.push({error:'Duplicate shell IDs'});
for(const f of ['services/adapters.js','services/storage.js','02_core/data-schema.js']){const text=fs.readFileSync(path.join(root,f),'utf8');if(/\beval\s*\(|new Function\s*\(/.test(text))failures.push({file:f,error:'Dynamic code execution forbidden'});}
for(const loose of ['app.js','styles.css','data-schema.js','performance.js','features.js','final.css','commercial.css','garang-auth-bootstrap.js','garang-functional-recovery.js','garang-brand-runtime-v2.js','garang-polish-v3.js','garang-polish-v3-fix.js','garang-coach-home-hotfix.js','garang-mark.svg','garang-app-icon.svg','exercise-db.json','food-db.json'])if(fs.existsSync(path.join(root,loose)))failures.push({file:loose,error:'Loose root runtime duplicate forbidden'});
for(const required of ['06_features/ui/README.md','06_features/ui/i18n/translations.js','06_features/ui/i18n/runtime.js'])if(!fs.existsSync(path.join(root,required)))failures.push({file:required,error:'Missing UI/i18n source'});
const result={timestamp:new Date().toISOString(),status:failures.length?'FAIL':'PASS',counts,failures,scope:'Categorized runtime, JS/JSON syntax, active entry assets, shell IDs, i18n wiring, no loose root runtime duplicates.'};
fs.mkdirSync(path.join(root,'09_docs/qa-data'),{recursive:true});fs.writeFileSync(path.join(root,'09_docs/qa-data/final-static.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
else if(process.argv.includes('--build')){const dist=path.join(root,'dist');fs.rmSync(dist,{recursive:true,force:true});for(const f of files){const relative=path.relative(root,f);if(relative.startsWith('tests'+path.sep)||relative.startsWith('scripts'+path.sep)||relative.startsWith('09_docs'+path.sep+'archive'+path.sep))continue;const to=path.join(dist,relative);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(f,to);}console.log('Static build copied to dist');}
'''
write('scripts/check.cjs',check)

# 9) Keep root only for actual project/build entry files. Identical duplicates are deleted; unique legacy files are archived by category.
KEEP={'.firebaserc','.gitignore','README.md','index.html','sw.js','package.json','runtime-manifest.json','firebase.json'}
# Old root manifest is replaced by categorized one.
if (ROOT/'manifest.webmanifest').exists(): (ROOT/'manifest.webmanifest').unlink()

def identical_candidate(p):
    for top in ['01_app','02_core','03_styles','04_data','05_assets','06_features','07_config','08_business','09_docs','services','scripts']:
        d=ROOT/top
        if not d.exists(): continue
        for c in d.rglob(p.name):
            if 'archive' in c.parts: continue
            try:
                if c.resolve()!=p.resolve() and c.read_bytes()==p.read_bytes(): return c
            except Exception: pass
    return None

def archive_target(p):
    ext=p.suffix.lower(); name=p.name
    if ext=='.css': return ROOT/'03_styles/archive/root-legacy'/name
    if ext in {'.svg','.png','.jpg','.jpeg','.webp'}: return ROOT/'05_assets/archive/root-legacy'/name
    if ext in {'.json','.jsonl'}: return ROOT/'04_data/archive/root-legacy'/name
    if ext in {'.md','.txt'}: return ROOT/'09_docs/archive/root-legacy'/name
    if ext=='.py': return ROOT/'scripts/legacy'/name
    if ext in {'.js','.cjs'}:
        low=name.lower()
        if any(x in low for x in ['ui','touch','polish','brand','auth']): return ROOT/'06_features/ui/archive'/name
        if 'coach' in low or 'ai' in low: return ROOT/'06_features/ai-coach/archive'/name
        if 'running' in low: return ROOT/'06_features/running/archive'/name
        if 'workout' in low or 'share' in low: return ROOT/'06_features/workout/archive'/name
        if 'nutrition' in low: return ROOT/'06_features/nutrition/archive'/name
        if any(x in low for x in ['planner','adaptive','batch']): return ROOT/'06_features/planner/archive'/name
        if any(x in low for x in ['core','release','stability','schema','today','sw']): return ROOT/'02_core/archive'/name
        return ROOT/'06_features/misc/archive'/name
    return ROOT/'09_docs/archive/root-legacy'/name

for p in list(ROOT.iterdir()):
    if not p.is_file() or p.name in KEEP or p.name.startswith('.'): continue
    if identical_candidate(p): p.unlink(); continue
    target=archive_target(p); target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and target.read_bytes()==p.read_bytes(): p.unlink()
    else:
        if target.exists(): target=target.with_name(target.stem+'-root'+target.suffix)
        shutil.move(str(p),str(target))

layout='''# GARANG Repository Layout\n\nThe repository root is intentionally minimal because GitHub Pages, npm and Firebase need a few root entry files. Runtime source belongs to categorized folders.\n\n- `01_app/` — canonical application shell/runtime\n- `02_core/` — schema, core logic and service-worker runtime\n- `03_styles/` — active styles in `runtime/`, historical styles in archive/core/features\n- `04_data/` — knowledge/data assets\n- `05_assets/` — brand and media assets\n- `06_features/` — feature modules; UI is under `06_features/ui/`\n- `07_config/` — Firebase, manifest and service configuration\n- `08_business/` — business/pricing material\n- `09_docs/` — documentation, QA and legacy root archive\n- `services/` — reusable service modules\n- `backend/`, `functions/` — server code\n- `tests/`, `scripts/` — validation and repository tooling\n\nRoot runtime duplicates are forbidden by `scripts/check.cjs`.\n'''
write('09_docs/REPOSITORY_LAYOUT.md',layout)

print(json.dumps({'status':'prepared','styles':len(STYLE_NAMES),'uiRuntime':len(UI_RUNTIME),'i18nExtra':len(EXTRA)},ensure_ascii=False))
