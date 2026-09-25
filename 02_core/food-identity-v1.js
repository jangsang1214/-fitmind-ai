(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GarangFoodIdentityV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='garang-food-identity-v1';
const GTIN_LENGTHS=new Set([8,12,13,14]);
function digits(value){return String(value??'').replace(/\D/g,'');}
function validCheckDigit(code){
 const s=digits(code);if(!GTIN_LENGTHS.has(s.length))return false;
 const body=s.slice(0,-1),expected=Number(s.at(-1));let sum=0,weight=3;
 for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*weight;weight=weight===3?1:3;}
 return ((10-(sum%10))%10)===expected;
}
function normalizeGtin(value){
 const raw=digits(value);if(!validCheckDigit(raw))return null;
 return Object.freeze({raw,canonical:raw.padStart(14,'0'),display:raw});
}
function normalizeReportNo(value){const s=digits(value);return s.length>=8&&s.length<=20?s:null;}
function compact(value){let s=String(value??'');try{s=s.normalize('NFKC');}catch{}return s.toLowerCase().replace(/[\s·_\-()[\]{}.,/\\:+]/g,'');}
function clean(value,limit=180){let s=String(value??'');try{s=s.normalize('NFKC');}catch{}return s.trim().slice(0,limit);}
function mappingFromItem(barcode,item={},meta={}){
 const gtin=normalizeGtin(barcode);if(!gtin)return null;
 const name=clean(item.name,180);if(!name)return null;
 return Object.freeze({
  gtin:gtin.canonical,displayGtin:gtin.display,foodId:item.foodId?String(item.foodId):null,name,
  grams:Number.isFinite(Number(item.grams))?Math.max(1,Number(item.grams)):100,
  kcal:Number(item.kcal)||0,protein:Number(item.protein)||0,carbs:Number(item.carbs)||0,fat:Number(item.fat)||0,
  nutritionStatus:clean(item.nutritionStatus||'unknown',30),
  nutritionSource:item.nutritionSource&&typeof item.nutritionSource==='object'?item.nutritionSource:null,
  brand:clean(meta.brand||item.brand||'',120)||null,reportNo:normalizeReportNo(meta.reportNo||item.reportNo),
  source:clean(meta.source||item?.scanEvidence?.source||'user_confirmed',80),
  confirmedAt:clean(meta.confirmedAt||new Date().toISOString(),40),
  lastUsedAt:clean(meta.lastUsedAt||meta.confirmedAt||new Date().toISOString(),40),
  uses:Math.max(1,Number(meta.uses)||1)
 });
}
function findMapping(mappings,barcode){
 const gtin=normalizeGtin(barcode);if(!gtin)return null;
 return (Array.isArray(mappings)?mappings:[]).find(row=>String(row?.gtin||'')===gtin.canonical)||null;
}
function upsertMapping(mappings,next,max=300){
 const rows=(Array.isArray(mappings)?mappings:[]).filter(Boolean),map=next?.gtin?next:null;if(!map)return rows.slice(-max);
 const out=rows.filter(row=>String(row?.gtin||'')!==map.gtin);out.push(map);return out.slice(-Math.max(1,max));
}
function identityKey(value={}){
 return [clean(value.brand,120),clean(value.productName||value.name,180),clean(value.packageGrams||value.grams,40),normalizeReportNo(value.reportNo)||''].map(compact).filter(Boolean).join('|');
}
function queryNames(value={}){
 const brand=clean(value.brand,120),name=clean(value.productName||value.name,180);
 return [...new Set([brand&&name?brand+' '+name:'',name,brand].filter(Boolean))];
}
function findReportNoMatch(rows,reportNo){
 const target=normalizeReportNo(reportNo);if(!target)return null;
 return (Array.isArray(rows)?rows:[]).find(row=>normalizeReportNo(row?.report_no||row?.reportNo)===target)||null;
}
return Object.freeze({VERSION,digits,validCheckDigit,normalizeGtin,normalizeReportNo,compact,mappingFromItem,findMapping,upsertMapping,identityKey,queryNames,findReportNoMatch});
});
