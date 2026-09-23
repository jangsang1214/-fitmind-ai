(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangCoachKnowledgeGroundingV2=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-coach-knowledge-grounding-v2.1-semantic';
const clean=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const uniq=value=>[...new Set(list(value).map(clean).filter(Boolean))];

const TAG_PATTERNS=Object.freeze({
  pain:/pain|통증|부상|injury/i,
  recovery:/recover|recovery|회복|수면|sleep|soreness|근육통|fatigue|피로/i,
  progression:/progress|progressive|overload|증량|반복수|rir|rpe|strength|근력/i,
  nutrition:/nutrition|protein|단백질|식단|섭취|carb|탄수|칼로리|calorie/i,
  body:/body|체중|체지방|근육량|인바디|weight/i,
  running:/run|running|러닝|pace|페이스|distance|거리/i
});

const lower=value=>clean(value).toLocaleLowerCase('en-US');
const SEMANTIC_GROUPS=Object.freeze([
 ['protein','단백질','고단백','protein-rich','amino'],
 ['recovery','recover','회복','피로','fatigue','soreness','근육통'],
 ['sleep','수면','잠','sleeping'],['pain','통증','부상','injury','ache'],
 ['strength','근력','웨이트','resistance'],['progression','progress','progressive','overload','증량'],
 ['running','run','러닝','달리기','pace','페이스'],['nutrition','식단','영양','섭취','meal','food'],
 ['calorie','calories','kcal','칼로리','열량'],['carb','carbs','탄수','탄수화물'],['weight','체중','몸무게'],
 ['goal','목표','target']
]);
function semanticFeatures(value){const text=lower(value),raw=[...(text.match(/[\p{L}\p{N}]+/gu)||[])],features=new Set(raw);for(const group of SEMANTIC_GROUPS){if(group.some(term=>text.includes(lower(term))))for(const term of group)features.add(lower(term));}for(const token of raw){if(token.length>=3)for(let i=0;i<=token.length-3;i++)features.add('#'+token.slice(i,i+3));}return features;}
function semanticSimilarity(a,b){const A=semanticFeatures(a),B=semanticFeatures(b);if(!A.size||!B.size)return 0;let overlap=0;for(const x of A)if(B.has(x))overlap++;return overlap/Math.sqrt(A.size*B.size);}
function textOf(rule){return [rule?.id,rule?.title,rule?.rule,rule?.use,...list(rule?.tags),...list(rule?.sourceIds)].map(clean).filter(Boolean).join(' ');}
function tagsFor(rule){const text=textOf(rule),tags=[];for(const [tag,re] of Object.entries(TAG_PATTERNS))if(re.test(text))tags.push(tag);return tags;}
function wantedTags(input={}){
  const reasons=uniq([...(input.decision?.reasonCodes||[]),...(input.nutrition?.reasonCodes||[]),...(input.userState?.readiness?.reasons||[]),...(input.userState?.fatigue?.reasons||[])]),mode=clean(input.decision?.mode),query=clean(input.query),text=[mode,query,...reasons].join(' '),tags=[];
  for(const [tag,re] of Object.entries(TAG_PATTERNS))if(re.test(text))tags.push(tag);
  if(['caution','recover','reduce'].includes(mode))tags.push('recovery');
  if(mode==='progress')tags.push('progression');
  if(input.nutrition&&input.nutrition.mode&&input.nutrition.mode!=='maintain')tags.push('nutrition');
  return uniq(tags);
}
function scoreRule(rule,tags,query=''){const ruleTags=tagsFor(rule);let score=0;for(const tag of tags)if(ruleTags.includes(tag))score+=tag==='pain'?50:20;const semantic=semanticSimilarity(query,textOf(rule));score+=semantic*36;const tier=clean(rule?.tier).toUpperCase();if(tier==='A')score+=8;else if(tier==='B')score+=4;if(clean(rule?.id).startsWith('V5R'))score+=2;return {score,ruleTags,semantic:Number(semantic.toFixed(3))};}
function compactRule(rule,meta){return {id:clean(rule?.id)||null,title:clean(rule?.title)||null,principle:clean(rule?.rule||rule?.use)||null,sourceIds:uniq(rule?.sourceIds),tier:clean(rule?.tier)||null,tags:meta.ruleTags,semanticScore:meta.semantic};}
function ground(input={}){
  const decision=input.decision&&typeof input.decision==='object'?input.decision:{},rules=[...list(input.coachRules),...list(input.followupSources),...list(input.extraKnowledge)],tags=wantedTags(input),query=clean(input.query),ranked=rules.map(rule=>({rule,...scoreRule(rule,tags,query)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||clean(a.rule?.id).localeCompare(clean(b.rule?.id))),limit=Math.max(1,Math.min(8,Number(input.limit)||5)),evidence=ranked.slice(0,limit).map(item=>compactRule(item.rule,item));
  const reasonCodes=uniq([...(decision.reasonCodes||[]),...(input.nutrition?.reasonCodes||[])]);
  return {
    version:VERSION,
    decisionIdentity:{decisionId:clean(decision.decisionId)||null,mode:clean(decision.mode)||null},
    queryTags:tags,
    reasonCodes,
    evidence,
    evidenceCount:evidence.length,
    contract:{decisionOwnedBy:'GARANG',llmRole:'explain_only',stateMutationAllowed:false,unsupportedKnowledgeAllowed:false},
    warnings:evidence.length?[]:['NO_RELEVANT_KNOWLEDGE_EVIDENCE']
  };
}
function verifyAlignment(grounding={},response={}){
  const expected=grounding?.decisionIdentity||{},alignment=response?.alignment||{},allowedReasons=new Set(grounding?.reasonCodes||[]),used=list(alignment.reasonCodesUsed),unsupported=used.filter(code=>!allowedReasons.has(code));
  const ok=!!expected.decisionId&&alignment.decisionId===expected.decisionId&&alignment.decisionMode===expected.mode&&unsupported.length===0;
  return {ok,unsupportedReasons:unsupported,decisionIdMatch:alignment.decisionId===expected.decisionId,decisionModeMatch:alignment.decisionMode===expected.mode};
}

return Object.freeze({VERSION,TAG_PATTERNS,tagsFor,wantedTags,scoreRule,ground,verifyAlignment});
});