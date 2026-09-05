(() => {
'use strict';

const hasKo=s=>/[가-힣]/.test(String(s||''));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const lower=s=>clean(s).toLowerCase();
const english=()=>document?.documentElement?.lang==='en';

const CHO=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG=['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];
function romanizeHangul(value){
  return String(value??'').replace(/[가-힣]+/g,word=>[...word].map(ch=>{
    const code=ch.charCodeAt(0)-0xAC00;if(code<0||code>11171)return ch;
    const cho=Math.floor(code/588),jung=Math.floor((code%588)/28),jong=code%28;
    return `${CHO[cho]}${JUNG[jung]}${JONG[jong]}`;
  }).join(''));
}
function titleCase(value){
  return clean(value).split(' ').map((x,i)=>{
    if(!x||/^(EZ-bar|RPE|MET|T-bar|Zone)$/i.test(x)||/^\d/.test(x))return x;
    if(i>0&&/^(with|and|of|per)$/i.test(x))return x.toLowerCase();
    return x.charAt(0).toUpperCase()+x.slice(1);
  }).join(' ');
}
function replaceTerms(value,terms){
  let out=String(value??'');
  const sorted=[...terms].sort((a,b)=>b[0].length-a[0].length);
  for(const [ko,en] of sorted)out=out.split(ko).join(` ${en} `);
  return out.replace(/\s+/g,' ').trim();
}

const EXERCISE_EXACT=new Map(Object.entries({
  '바벨 벤치프레스':'Barbell bench press','인클라인 바벨 벤치프레스':'Incline barbell bench press','디클라인 바벨 벤치프레스':'Decline barbell bench press',
  '덤벨 벤치프레스':'Dumbbell bench press','인클라인 덤벨 벤치프레스':'Incline dumbbell bench press','디클라인 덤벨 벤치프레스':'Decline dumbbell bench press',
  '덤벨 플라이':'Dumbbell fly','인클라인 덤벨 플라이':'Incline dumbbell fly','케이블 플라이':'Cable fly','하이 케이블 플라이':'High cable fly','로우 케이블 플라이':'Low cable fly',
  '머신 체스트프레스':'Machine chest press','인클라인 머신 체스트프레스':'Incline machine chest press','디클라인 머신 체스트프레스':'Decline machine chest press','펙덱 플라이':'Pec deck fly',
  '스미스머신 벤치프레스':'Smith machine bench press','스미스머신 인클라인 벤치프레스':'Smith machine incline bench press',
  '랫풀다운':'Lat pulldown','와이드그립 랫풀다운':'Wide-grip lat pulldown','언더그립 랫풀다운':'Underhand lat pulldown','시티드 케이블 로우':'Seated cable row',
  '바벨 로우':'Barbell row','덤벨 로우':'Dumbbell row','원암 덤벨 로우':'One-arm dumbbell row','펜들레이 로우':'Pendlay row','티바 로우':'T-bar row','T바 로우':'T-bar row',
  '풀업':'Pull-up','친업':'Chin-up','어시스트 풀업':'Assisted pull-up','데드리프트':'Deadlift','루마니안 데드리프트':'Romanian deadlift','스모 데드리프트':'Sumo deadlift',
  '오버헤드프레스':'Overhead press','밀리터리프레스':'Military press','덤벨 숄더프레스':'Dumbbell shoulder press','아놀드 프레스':'Arnold press','사이드 레터럴 레이즈':'Lateral raise','프론트 레이즈':'Front raise','리어 델트 플라이':'Rear delt fly','페이스풀':'Face pull','바벨 슈러그':'Barbell shrug',
  '백 스쿼트':'Back squat','프론트 스쿼트':'Front squat','스쿼트':'Squat','해크 스쿼트':'Hack squat','핵 스쿼트':'Hack squat','불가리안 스플릿 스쿼트':'Bulgarian split squat','레그프레스':'Leg press','레그익스텐션':'Leg extension','레그컬':'Leg curl','라잉 레그컬':'Lying leg curl','시티드 레그컬':'Seated leg curl','런지':'Lunge','워킹 런지':'Walking lunge','힙쓰러스트':'Hip thrust','글루트 브리지':'Glute bridge','카프레이즈':'Calf raise','스탠딩 카프레이즈':'Standing calf raise','시티드 카프레이즈':'Seated calf raise',
  '바벨 컬':'Barbell curl','덤벨 컬':'Dumbbell curl','해머 컬':'Hammer curl','프리처 컬':'Preacher curl','케이블 컬':'Cable curl','트라이셉스 푸시다운':'Triceps pushdown','라잉 트라이셉스 익스텐션':'Lying triceps extension','오버헤드 트라이셉스 익스텐션':'Overhead triceps extension','딥스':'Dips','푸시업':'Push-up',
  '크런치':'Crunch','싯업':'Sit-up','플랭크':'Plank','사이드 플랭크':'Side plank','레그레이즈':'Leg raise','행잉 레그레이즈':'Hanging leg raise','앱 롤아웃':'Ab rollout','버피':'Burpee','마운틴 클라이머':'Mountain climber','점핑잭':'Jumping jack'
}));
const EXERCISE_TERMS=[
 ['스미스머신','Smith machine'],['스미스 머신','Smith machine'],['체스트 서포티드','Chest-supported'],['불가리안 스플릿','Bulgarian split'],['컨센트레이션','Concentration'],['트라이셉스','Triceps'],['오버헤드','Overhead'],['밀리터리','Military'],['인클라인','Incline'],['디클라인','Decline'],['벤트오버','Bent-over'],['루마니안','Romanian'],['컨벤셔널','Conventional'],['싱글레그','Single-leg'],['원 레그','Single-leg'],['원암','One-arm'],['원 암','One-arm'],['어시스트','Assisted'],['웨이티드','Weighted'],['언더그립','Underhand'],['오버그립','Overhand'],['와이드그립','Wide-grip'],['클로즈그립','Close-grip'],['뉴트럴그립','Neutral-grip'],['시티드','Seated'],['스탠딩','Standing'],['라잉','Lying'],['리버스','Reverse'],['프론트','Front'],['리어 델트','Rear delt'],['리어','Rear'],['레터럴','Lateral'],['사이드','Lateral'],['아놀드','Arnold'],['펜들레이','Pendlay'],['해크','Hack'],['핵','Hack'],['스모','Sumo'],
 ['랫풀다운','Lat pulldown'],['풀다운','Pulldown'],['벤치프레스','Bench press'],['체스트프레스','Chest press'],['숄더프레스','Shoulder press'],['오버헤드프레스','Overhead press'],['밀리터리프레스','Military press'],['레그프레스','Leg press'],['레그익스텐션','Leg extension'],['레그컬','Leg curl'],['레그레이즈','Leg raise'],['카프레이즈','Calf raise'],['힙쓰러스트','Hip thrust'],['글루트 브리지','Glute bridge'],['페이스풀','Face pull'],['푸시다운','Pushdown'],['풀오버','Pullover'],['데드리프트','Deadlift'],['스쿼트','Squat'],['런지','Lunge'],['풀업','Pull-up'],['친업','Chin-up'],['푸시업','Push-up'],['플라이','Fly'],['크로스오버','Crossover'],['프리처 컬','Preacher curl'],['해머 컬','Hammer curl'],['컬','Curl'],['익스텐션','Extension'],['레이즈','Raise'],['슈러그','Shrug'],['크런치','Crunch'],['싯업','Sit-up'],['플랭크','Plank'],['롤아웃','Rollout'],['브리지','Bridge'],['킥백','Kickback'],['딥스','Dips'],['버피','Burpee'],['마운틴 클라이머','Mountain climber'],['점핑잭','Jumping jack'],['로우','Row'],
 ['스미스','Smith'],['바벨','Barbell'],['덤벨','Dumbbell'],['케이블','Cable'],['머신','Machine'],['케틀벨','Kettlebell'],['EZ바','EZ-bar'],['이지바','EZ-bar'],['밴드','Band'],['로프','Rope'],['플레이트','Plate'],['맨몸','Bodyweight'],['티바','T-bar'],['T바','T-bar'],
 ['가슴','Chest'],['등','Back'],['어깨','Shoulders'],['하체','Lower body'],['이두','Biceps'],['삼두','Triceps'],['코어','Core'],['복근','Abs'],['둔근','Glutes'],['햄스트링','Hamstrings'],['대퇴사두근','Quadriceps'],['대퇴사두','Quadriceps'],['종아리','Calves'],['전신','Full body']
];
function translateExercise(value){
  const source=clean(value);if(!source||!hasKo(source))return source;
  if(EXERCISE_EXACT.has(source))return EXERCISE_EXACT.get(source);
  let out=replaceTerms(source,EXERCISE_TERMS);
  if(hasKo(out))out=romanizeHangul(out);
  return titleCase(out).replace(/\bRow cable fly\b/i,'Low cable fly');
}

const FOOD_EXACT=new Map(Object.entries({
  '흰쌀밥':'White rice','현미밥':'Brown rice','잡곡밥':'Multigrain rice','보리밥':'Barley rice','귀리밥':'Oat rice','콩밥':'Rice with beans','흑미밥':'Black rice','곤드레밥':'Gondre rice','버섯밥':'Mushroom rice',
  '김치볶음밥':'Kimchi fried rice','새우볶음밥':'Shrimp fried rice','참치볶음밥':'Tuna fried rice','계란볶음밥':'Egg fried rice','달걀볶음밥':'Egg fried rice','햄볶음밥':'Ham fried rice','소고기볶음밥':'Beef fried rice','닭가슴살볶음밥':'Chicken breast fried rice','카레라이스':'Curry rice','하이라이스':'Hayashi rice',
  '닭가슴살':'Chicken breast','닭다리살':'Chicken thigh','닭다리':'Chicken drumstick','닭고기':'Chicken','소고기':'Beef','돼지고기':'Pork','삼겹살':'Pork belly','목살':'Pork shoulder','불고기':'Bulgogi','제육볶음':'Spicy stir-fried pork','갈비':'Short ribs','갈비찜':'Braised short ribs',
  '연어':'Salmon','참치':'Tuna','고등어':'Mackerel','새우':'Shrimp','오징어':'Squid','계란':'Egg','달걀':'Egg','두부':'Tofu','순두부':'Soft tofu','그릭요거트':'Greek yogurt','요거트':'Yogurt','우유':'Milk','두유':'Soy milk','치즈':'Cheese',
  '고구마':'Sweet potato','감자':'Potato','바나나':'Banana','사과':'Apple','오렌지':'Orange','귤':'Tangerine','딸기':'Strawberry','블루베리':'Blueberry','포도':'Grapes','키위':'Kiwi','아보카도':'Avocado','오트밀':'Oatmeal','식빵':'White bread','통밀빵':'Whole-wheat bread','베이글':'Bagel',
  '김치':'Kimchi','배추김치':'Napa cabbage kimchi','깍두기':'Radish kimchi','샐러드':'Salad','브로콜리':'Broccoli','양배추':'Cabbage','상추':'Lettuce','토마토':'Tomato','오이':'Cucumber','양파':'Onion','시금치':'Spinach','버섯':'Mushrooms',
  '비빔밥':'Bibimbap','김밥':'Gimbap','떡볶이':'Tteokbokki','된장찌개':'Soybean paste stew','김치찌개':'Kimchi stew','순두부찌개':'Soft tofu stew','미역국':'Seaweed soup','갈비탕':'Short rib soup','설렁탕':'Ox bone soup','곰탕':'Beef bone soup','육개장':'Spicy beef soup','삼계탕':'Ginseng chicken soup',
  '라면':'Ramyeon','우동':'Udon','메밀국수':'Buckwheat noodles','잔치국수':'Korean noodle soup','비빔국수':'Spicy mixed noodles','냉면':'Cold noodles','파스타':'Pasta','스파게티':'Spaghetti','짜장면':'Jajangmyeon','짬뽕':'Jjamppong','칼국수':'Knife-cut noodles',
  '프로틴 쉐이크':'Protein shake','단백질 쉐이크':'Protein shake','웨이 프로틴':'Whey protein','프로틴바':'Protein bar','에너지바':'Energy bar'
}));
const FOOD_TERMS=[
 ['닭가슴살','Chicken breast'],['닭다리살','Chicken thigh'],['돼지목살','Pork shoulder'],['돼지고기','Pork'],['소고기','Beef'],['삼겹살','Pork belly'],['닭고기','Chicken'],['닭다리','Chicken drumstick'],['오리고기','Duck'],['연어','Salmon'],['참치','Tuna'],['고등어','Mackerel'],['새우','Shrimp'],['오징어','Squid'],['문어','Octopus'],['계란','Egg'],['달걀','Egg'],['순두부','Soft tofu'],['두부','Tofu'],['그릭요거트','Greek yogurt'],['요거트','Yogurt'],['두유','Soy milk'],['우유','Milk'],['치즈','Cheese'],
 ['김치볶음밥','Kimchi fried rice'],['볶음밥','Fried rice'],['비빔밥','Bibimbap'],['덮밥','Rice bowl'],['죽','Porridge'],['현미밥','Brown rice'],['잡곡밥','Multigrain rice'],['흰쌀밥','White rice'],['흑미밥','Black rice'],['보리밥','Barley rice'],['귀리밥','Oat rice'],['밥','Rice'],
 ['된장찌개','Soybean paste stew'],['김치찌개','Kimchi stew'],['찌개','Stew'],['미역국','Seaweed soup'],['국','Soup'],['갈비탕','Short rib soup'],['설렁탕','Ox bone soup'],['삼계탕','Ginseng chicken soup'],['탕','Soup'],['구이','Grilled'],['볶음','Stir-fried'],['조림','Braised'],['찜','Steamed'],['튀김','Fried'],['전','Pancake'],['샐러드','Salad'],
 ['메밀국수','Buckwheat noodles'],['비빔국수','Spicy mixed noodles'],['잔치국수','Korean noodle soup'],['국수','Noodles'],['냉면','Cold noodles'],['짜장면','Jajangmyeon'],['짬뽕','Jjamppong'],['라면','Ramyeon'],['우동','Udon'],['파스타','Pasta'],['스파게티','Spaghetti'],['떡볶이','Tteokbokki'],['김밥','Gimbap'],
 ['고구마','Sweet potato'],['감자','Potato'],['오트밀','Oatmeal'],['통밀빵','Whole-wheat bread'],['식빵','White bread'],['빵','Bread'],['바나나','Banana'],['사과','Apple'],['오렌지','Orange'],['귤','Tangerine'],['딸기','Strawberry'],['블루베리','Blueberry'],['포도','Grapes'],['키위','Kiwi'],['아보카도','Avocado'],
 ['배추김치','Napa cabbage kimchi'],['깍두기','Radish kimchi'],['김치','Kimchi'],['브로콜리','Broccoli'],['양배추','Cabbage'],['상추','Lettuce'],['토마토','Tomato'],['오이','Cucumber'],['양파','Onion'],['시금치','Spinach'],['버섯','Mushrooms'],['콩','Beans'],
 ['프로틴 쉐이크','Protein shake'],['단백질 쉐이크','Protein shake'],['웨이 프로틴','Whey protein'],['프로틴바','Protein bar'],['에너지바','Energy bar'],['단백질','Protein'],['카레','Curry'],['햄','Ham']
];
function translateFood(value){
  const source=clean(value);if(!source||!hasKo(source))return source;
  if(FOOD_EXACT.has(source))return FOOD_EXACT.get(source);
  let out=replaceTerms(source,FOOD_TERMS);
  if(hasKo(out))out=romanizeHangul(out);
  return titleCase(out);
}
function translateFoodList(value){
  return String(value??'').split(/(\s*[·+/,]\s*)/).map(part=>hasKo(part)?translateFood(part):part).join('');
}

const reverse={exercise:new Map(),food:new Map()};
const textState=new WeakMap();
function rememberReverse(kind,translated,canonical){if(translated&&canonical&&translated!==canonical)reverse[kind].set(lower(translated),canonical);}
function kindFor(el){
  if(!el?.closest)return null;
  if(el.closest('.exercise-visual-card,.workout-visual-copy,#workoutDraftArea,.workout-history-row,.pr-card,.workout-builder-v2'))return 'exercise';
  if(el.closest('.meal-visual-copy,#mealDraftArea,.scan-result-card'))return 'food';
  return null;
}
function eligibleText(node){
  const el=node?.parentElement;if(!el)return null;
  if(el.matches('.exercise-visual-card strong,.workout-selected-name,#workoutDraftArea strong,.workout-history-row strong,.pr-head strong'))return 'exercise';
  if(el.matches('.meal-visual-copy strong,.meal-visual-copy span,#mealDraftArea strong,.scan-result-card strong'))return 'food';
  return kindFor(el)&&el.matches('strong')?kindFor(el):null;
}
function applyText(node){
  if(!node||node.nodeType!==Node.TEXT_NODE)return;
  const kind=eligibleText(node);if(!kind)return;
  const current=node.nodeValue||'';let rec=textState.get(node);
  if(!rec||current!==rec.last)rec={source:current,last:current};
  let next=rec.source;
  if(english()&&hasKo(rec.source)){
    next=kind==='exercise'?translateExercise(rec.source):translateFoodList(rec.source);
    rememberReverse(kind,next,rec.source);
  }
  rec.last=next;textState.set(node,rec);if(next!==current)node.nodeValue=next;
}
function applyOption(option,kind){
  if(!option)return;
  if(!option.dataset.garangCanonicalName)option.dataset.garangCanonicalName=option.value||'';
  const canonical=option.dataset.garangCanonicalName;
  if(!canonical)return;
  if(english()){
    const translated=kind==='exercise'?translateExercise(canonical):translateFood(canonical);
    rememberReverse(kind,translated,canonical);option.value=translated;option.label=translated;
  }else{option.value=canonical;option.removeAttribute('label');}
}
function applyInput(input,kind){
  if(!input)return;
  if(!english()){
    if(input.dataset.garangCanonicalName){input.value=input.dataset.garangCanonicalName;delete input.dataset.garangDisplayName;}
    return;
  }
  const raw=clean(input.value);if(!raw)return;
  let canonical=input.dataset.garangCanonicalName||'';
  if(hasKo(raw))canonical=raw;
  else canonical=canonical||reverse[kind].get(lower(raw))||'';
  if(!canonical)return;
  const translated=kind==='exercise'?translateExercise(canonical):translateFood(canonical);
  input.dataset.garangCanonicalName=canonical;input.dataset.garangDisplayName=translated;rememberReverse(kind,translated,canonical);
  if(input.value!==translated)input.value=translated;
}
function applyRoot(root=document){
  const scope=root?.nodeType===Node.ELEMENT_NODE||root?.nodeType===Node.DOCUMENT_NODE?root:null;
  if(!scope)return;
  if(scope.nodeType===Node.ELEMENT_NODE){
    if(scope.matches('#exerciseList option'))applyOption(scope,'exercise');
    if(scope.matches('#foodList option'))applyOption(scope,'food');
    if(scope.matches('#wName'))applyInput(scope,'exercise');
    if(scope.matches('#foodSearch'))applyInput(scope,'food');
  }
  scope.querySelectorAll?.('#exerciseList option').forEach(x=>applyOption(x,'exercise'));
  scope.querySelectorAll?.('#foodList option').forEach(x=>applyOption(x,'food'));
  scope.querySelectorAll?.('#wName').forEach(x=>applyInput(x,'exercise'));
  scope.querySelectorAll?.('#foodSearch').forEach(x=>applyInput(x,'food'));
  const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))applyText(node);
}
function canonicalizeInput(input,kind){
  if(!input)return;
  const current=clean(input.value);const canonical=input.dataset.garangCanonicalName||reverse[kind].get(lower(current));
  if(!canonical)return;
  input.value=canonical;
  setTimeout(()=>{if(input.isConnected&&english()&&clean(input.value)===canonical)applyInput(input,kind);},0);
}

document.addEventListener('input',event=>{
  if(event.target?.id==='wName')setTimeout(()=>applyInput(event.target,'exercise'),0);
  if(event.target?.id==='foodSearch')setTimeout(()=>applyInput(event.target,'food'),0);
},false);
document.addEventListener('change',event=>{
  if(event.target?.id==='wName')canonicalizeInput(event.target,'exercise');
  if(event.target?.id==='foodSearch')canonicalizeInput(event.target,'food');
},true);
document.addEventListener('click',event=>{
  const button=event.target?.closest?.('button');if(!button)return;
  if(button.id==='addWorkout')canonicalizeInput(document.getElementById('wName'),'exercise');
  if(button.id==='fillFood'||button.id==='addFood')canonicalizeInput(document.getElementById('foodSearch'),'food');
},true);

let queued=false;function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;applyRoot(document);});}
new MutationObserver(mutations=>{
  let full=false;
  for(const mutation of mutations){
    if(mutation.type==='attributes'&&mutation.target===document.documentElement&&mutation.attributeName==='lang')full=true;
    if(mutation.type==='childList')mutation.addedNodes.forEach(node=>{if(node.nodeType===1)applyRoot(node);else if(node.nodeType===3)applyText(node);});
    if(mutation.type==='characterData')applyText(mutation.target);
  }
  if(full)queue();
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang']});

window.GarangEntityI18n=Object.freeze({translateExercise,translateFood,translateFoodList,romanizeHangul,refresh:queue});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>applyRoot(document),{once:true});else applyRoot(document);
})();
