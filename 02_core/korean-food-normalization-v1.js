(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GarangKoreanFoodNormalizationV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='garang-korean-food-normalization-v1';
const clean=v=>{const s=String(v??'');try{return s.normalize('NFKC').trim();}catch{return s.trim();}};
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
function stripCorporate(value){
 return clean(value).replace(/^\(?주\)?\s*/,'').replace(/^주식회사\s*/,'').replace(/\s*\(?주\)?$/,'').replace(/\s*주식회사$/,'').replace(/\s+/g,' ').trim();
}
function splitProductName(value){
 const raw=clean(value).replace(/\\+/g,'_');
 const parts=raw.split(/[_|>]+/).map(x=>clean(x)).filter(Boolean);
 if(parts.length<=1)return {raw,category:null,product:raw};
 const category=parts[0],product=parts.slice(1).join(' ').replace(/\s+/g,' ').trim();
 return {raw,category,product:product||raw};
}
function compact(value){return clean(value).toLowerCase().replace(/[\s·_\-()[\]{}.,/\\:+]/g,'');}
function brandCandidates(raw={}){
 return uniq([raw.companyNm,raw.companyName,raw['업체명'],raw.mkrNm,raw.manufacturer,raw['제조사명'],raw.rtlBzentyNm,raw.retailer,raw['유통업체명']].map(stripCorporate));
}
function aliases(raw={}){
 const split=splitProductName(raw.foodNm||raw.foodName||raw['식품명']||raw.name);
 const brands=brandCandidates(raw),out=[split.raw,split.product];
 for(const brand of brands){out.push(brand+' '+split.product);out.push(brand+' '+split.raw);}
 if(split.category&&split.product&&!compact(split.product).startsWith(compact(split.category)))out.push(split.category+' '+split.product);
 return uniq(out);
}
function normalize(raw={}){
 const split=splitProductName(raw.foodNm||raw.foodName||raw['식품명']||raw.name),brands=brandCandidates(raw);
 const brand=brands[0]||null,product=split.product||split.raw;
 return Object.freeze({version:VERSION,rawName:split.raw,categoryPrefix:split.category,productName:product,brand,displayName:brand?(brand+' · '+product):product,aliases:uniq([split.raw,product,...aliases(raw)]),searchKey:compact([brand,product].filter(Boolean).join(' ')),brandCandidates:brands});
}
return Object.freeze({VERSION,clean,stripCorporate,splitProductName,compact,brandCandidates,aliases,normalize});
});
