(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./food-data-foundation-v2.js'):root?.GarangFoodDataFoundation);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangFoodIntelligenceV2=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Foundation){
'use strict';
if(!Foundation)throw new Error('FOOD_DATA_FOUNDATION_REQUIRED');
const VERSION='garang-food-intelligence-v2.1.0';
const list=v=>Array.isArray(v)?v:[],clean=v=>String(v??'').trim(),clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const QUALITY_WEIGHT=Object.freeze({verified:.025,approximate:.012,estimated:.006,unknown:0});
const BROAD=new Set(['라면','밥','국','탕','찌개','빵','면','우유','치즈','요거트','고기','생선','샐러드','rice','soup','bread','noodle','milk','cheese','yogurt']);
const GROUPS=Object.freeze([
 ['달걀','계란','egg'],['닭가슴살','chicken breast','chickenbreast'],['현미밥','brown rice','brownrice'],['흰쌀밥','백미밥','white rice','whiterice'],
 ['고구마','sweet potato','sweetpotato'],['감자','potato'],['그릭요거트','그릭 요구르트','greek yogurt','greekyogurt'],['요거트','요구르트','yogurt'],
 ['두부','tofu'],['김치','kimchi'],['바나나','banana'],['사과','apple'],['아보카도','avocado'],['오트밀','oatmeal','oats'],['연어','salmon'],
 ['소고기','쇠고기','beef'],['돼지고기','pork'],['참치','tuna'],['브로콜리','broccoli'],['우유','milk'],['치즈','cheese']
]);
const NOISE=/\b(?:serving|portion|piece|pieces|bowl|plate|cup|slice|pack|bottle|can|gram|grams|kg|g|ml|oz)\b/gi;
const KOREAN_QUANTITY=/(?:\d+(?:\.\d+)?\s*)?(?:그램|킬로그램|밀리리터|리터|개|인분|그릇|접시|조각|팩|봉|봉지|병|캔|스푼|큰술|작은술)(?=\s|$)/gi;
function normalize(value){
 let s=clean(value);try{s=s.normalize('NFKC');}catch{}
 return s.toLocaleLowerCase('en-US').replace(KOREAN_QUANTITY,' ').replace(NOISE,' ').replace(/[()[\]{}.,/\\·_\-:+]+/g,' ').replace(/\d+(?:\.\d+)?\s*(?:kg|g|gram|grams|ml|oz)?/gi,' ').replace(/\s+/g,' ').trim();
}
function compact(value){return normalize(value).replace(/\s+/g,'');}
function tokens(value){return new Set(normalize(value).match(/[\p{L}\p{N}]+/gu)||[]);}
function trigrams(value){const s=compact(value),out=new Set();if(s.length<3){if(s)out.add(s);return out;}for(let i=0;i<=s.length-3;i++)out.add(s.slice(i,i+3));return out;}
function overlap(a,b){if(!a.size||!b.size)return 0;let n=0;for(const x of a)if(b.has(x))n++;return n/Math.max(a.size,b.size);}
function queryCoverage(a,b){if(!a.size||!b.size)return 0;let n=0;for(const x of a)if(b.has(x))n++;return n/a.size;}
function dice(a,b){if(!a.size||!b.size)return 0;let n=0;for(const x of a)if(b.has(x))n++;return 2*n/(a.size+b.size);}
function editRatio(a,b){a=compact(a);b=compact(b);if(!a||!b)return 0;if(a===b)return 1;if(Math.abs(a.length-b.length)>4||Math.max(a.length,b.length)>32)return 0;const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let left=i,diag=i-1;for(let j=1;j<=b.length;j++){const up=prev[j],cost=a[i-1]===b[j-1]?0:1,next=Math.min(up+1,left+1,diag+cost);prev[j]=left=next;diag=up;}}return 1-prev[b.length]/Math.max(a.length,b.length);}
function conceptSet(value){const text=normalize(value),out=new Set();for(let i=0;i<GROUPS.length;i++)if(GROUPS[i].some(x=>text.includes(normalize(x))))out.add(i);return out;}
function conceptOverlap(a,b){return overlap(conceptSet(a),conceptSet(b));}
function keyScore(query,key){
 const q=compact(query),k=compact(key);if(!q||!k)return {score:0,kind:'none'};if(q===k)return {score:1,kind:'exact'};
 const contains=(q.includes(k)||k.includes(q))?Math.min(q.length,k.length)/Math.max(q.length,k.length):0;
 const qt=tokens(query),kt=tokens(key),tok=overlap(qt,kt),coverage=queryCoverage(qt,kt),tri=dice(trigrams(query),trigrams(key)),edit=editRatio(query,key),concept=conceptOverlap(query,key);
 const score=Math.max(contains*.9,tok*.88,coverage*.91,tri*.78,edit*.86,concept*.82,concept*.65+tri*.25);
 return {score,kind:concept>=1?'semantic':edit>=.85?'typo':contains>=.8?'contains':'fuzzy'};
}
const INDEX_CACHE=typeof WeakMap==='function'?new WeakMap():null;
function index(corpus=[]){if(Array.isArray(corpus)&&INDEX_CACHE?.has(corpus))return INDEX_CACHE.get(corpus);const built=list(corpus).map((raw,order)=>{const food=Foundation.canonicalize(raw),brand=clean(food.brand||raw?.brand||raw?.brand_name||raw?.manufacturer),product=clean(food.productName||raw?.product_name||raw?.productName),keys=[{value:food.name,kind:'primary'},{value:food.nameEn,kind:'english'},{value:product,kind:'product'},{value:brand&&food.name?`${brand} ${food.name}`:'',kind:'brand-primary'},{value:brand&&product?`${brand} ${product}`:'',kind:'brand-product'},...list(food.aliases).map(value=>({value,kind:'alias'}))].filter(x=>clean(x.value));return {raw,food,brand,product,order,keys};});if(Array.isArray(corpus)&&INDEX_CACHE)INDEX_CACHE.set(corpus,built);return built;}
function resolve(corpus,query,options={}){
 const q=clean(query),mode=options.mode==='vision'?'vision':'manual',min=Number.isFinite(Number(options.minConfidence))?Number(options.minConfidence):(mode==='vision'?.8:.72),margin=Number.isFinite(Number(options.margin))?Number(options.margin):.055;
 if(!q)return {version:VERSION,status:'unmatched',query:q,confidence:0,reason:'EMPTY_QUERY',alternatives:[]};
 const broad=BROAD.has(compact(q)),rows=[];
 for(const entry of index(corpus)){let best={score:0,kind:'none',keyKind:null,key:null};for(const k of entry.keys){const s=keyScore(q,k.value);if(s.score>best.score)best={...s,keyKind:k.kind,key:k.value};}
   const exact=best.kind==='exact',quality=QUALITY_WEIGHT[entry.food.quality]||0,score=clamp(best.score+(exact?0:quality),0,1);
   if(score>0)rows.push({entry,score,exact,kind:best.kind,keyKind:best.keyKind,key:best.key});
 }
 rows.sort((a,b)=>b.score-a.score||Number(b.exact)-Number(a.exact)||(b.entry.food.quality==='verified')-(a.entry.food.quality==='verified')||a.entry.order-b.entry.order);
 const top=rows[0],second=rows[1],alternatives=rows.slice(0,4).map(x=>({foodId:x.entry.food.foodId,name:x.entry.food.name,score:Number(x.score.toFixed(3)),quality:x.entry.food.quality,kind:x.kind}));
 if(!top)return {version:VERSION,status:'unmatched',query:q,confidence:0,reason:'NO_CANDIDATE',alternatives};
 if(broad&&!top.exact)return {version:VERSION,status:'unmatched',query:q,confidence:Number(top.score.toFixed(3)),reason:'BROAD_QUERY_REQUIRES_EXACT_MATCH',alternatives};
 const delta=second?top.score-second.score:1;
 if(!top.exact&&(top.score<min||delta<margin))return {version:VERSION,status:delta<margin?'ambiguous':'unmatched',query:q,confidence:Number(top.score.toFixed(3)),reason:delta<margin?'LOW_MARGIN':'LOW_CONFIDENCE',alternatives};
 return {version:VERSION,status:'matched',query:q,confidence:Number(top.score.toFixed(3)),reason:top.exact?'EXACT':top.kind.toUpperCase(),matchKey:top.key,matchKeyKind:top.keyKind,food:top.entry.raw,canonical:top.entry.food,alternatives};
}
function resolveVisionRow(corpus,row={},options={}){
 const confidence=clamp(Number(row?.confidence)||0,0,1),names=[row?.name,...list(row?.aliases)].map(clean).filter(Boolean);if(confidence<.35)return {version:VERSION,status:'unmatched',confidence:0,reason:'VISION_CONFIDENCE_TOO_LOW',alternatives:[]};
 const results=names.map(name=>resolve(corpus,name,{mode:'vision',...options})).filter(Boolean).sort((a,b)=>(b.status==='matched')-(a.status==='matched')||b.confidence-a.confidence);
 const top=results[0]||{version:VERSION,status:'unmatched',confidence:0,reason:'NO_QUERY',alternatives:[]};if(top.status!=='matched')return top;
 const competing=results.find(x=>x.status==='matched'&&x.canonical?.foodId&&x.canonical.foodId!==top.canonical?.foodId);if(competing&&Math.abs(top.confidence-competing.confidence)<(options.aliasConflictMargin??.06))return {...top,status:'ambiguous',reason:'VISION_ALIAS_CONFLICT',alternatives:[...(top.alternatives||[]),...(competing.alternatives||[])].slice(0,4)};
 const combined=clamp(top.confidence*(.65+.35*confidence),0,1);if(combined<(options.minCombinedConfidence??.68))return {...top,status:'unmatched',confidence:Number(combined.toFixed(3)),reason:'VISION_DB_COMBINED_CONFIDENCE_LOW'};
 return {...top,confidence:Number(combined.toFixed(3)),visionConfidence:confidence};
}
function toMealItem(foodInput,grams=100){const food=Foundation.canonicalize(foodInput),g=Math.max(1,Number(grams)||100),ratio=g/(food.basisG||100);return {foodId:food.foodId||null,name:food.name,grams:g,kcal:(food.nutrients.kcal??0)*ratio,protein:(food.nutrients.protein??0)*ratio,carbs:(food.nutrients.carbs??0)*ratio,fat:(food.nutrients.fat??0)*ratio,nutritionStatus:food.quality,nutritionSource:{provider:food.provenance.provider,dataset:food.provenance.dataset,recordId:food.provenance.recordId,url:food.provenance.url,label:food.provenance.label},userOverride:false};}
return Object.freeze({VERSION,normalize,compact,tokens,keyScore,resolve,resolveVisionRow,toMealItem});
});
