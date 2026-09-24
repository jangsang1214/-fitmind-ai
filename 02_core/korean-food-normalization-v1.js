(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangKoreanFoodNormalizationV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-korean-food-normalization-v1';
const CHOSEONG=['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h'];
const SIZE_SUFFIX=/\s*[\[(](?:xs|s|m|l|xl|xxl|r|regular|small|medium|large|family|f|대|중|소|라지|미디엄|레귤러)[\])]?\s*$/i;
const PORTION_SUFFIX=/\s*(?:\d+(?:\.\d+)?\s*(?:g|kg|ml|l|그램|밀리리터)|\d+\s*(?:개|팩|봉|병|캔|인분))\s*$/i;
const clean=v=>String(v??'').trim();
function normalize(value){
 let s=clean(value);try{s=s.normalize('NFKC');}catch{}
 return s.toLocaleLowerCase('ko-KR').replace(/[·•ㆍ]/g,' ').replace(/[_/\\|,:;]+/g,' ').replace(/[()[\]{}]/g,' ').replace(/\s+/g,' ').trim();
}
function compact(value){return normalize(value).replace(/[^\p{L}\p{N}]+/gu,'');}
function stripDecorators(value){
 let s=clean(value).replace(/_/g,' ').replace(/\s+/g,' ').trim();
 s=s.replace(SIZE_SUFFIX,'').replace(PORTION_SUFFIX,'').replace(/\s+/g,' ').trim();
 return s;
}
function categoryTail(value){
 const s=clean(value),parts=s.split(/[_>]/).map(x=>stripDecorators(x)).filter(Boolean);
 if(parts.length<=1)return stripDecorators(s);
 const first=parts[0],tail=parts.slice(1).join(' ');
 if(first.length<=12&&tail.length>=2)return tail;
 return stripDecorators(s);
}
function unique(values){
 const out=[],seen=new Set();
 for(const raw of values){const v=stripDecorators(raw);if(!v)continue;const k=compact(v);if(!k||seen.has(k))continue;seen.add(k);out.push(v);}
 return out;
}
function structuralAliases({name,brand,manufacturer,company,retailer}={}){
 const base=stripDecorators(name),tail=categoryTail(name),brands=unique([brand,manufacturer,company,retailer]);
 const variants=[base,tail,clean(name).replace(/_/g,' ')];
 for(const b of brands){variants.push(`${b} ${tail}`,`${b} ${base}`);}
 if(tail&&/\s/.test(tail))variants.push(tail.replace(/\s+/g,''));
 if(base&&/\s/.test(base))variants.push(base.replace(/\s+/g,''));
 return unique(variants).filter(v=>compact(v)!==compact(name));
}
function firstChars(value,count=2){return [...compact(value)].slice(0,count).join('');}
function shardKey(value){
 const s=compact(value);if(!s)return'other';
 const cp=s.codePointAt(0);
 if(cp>=0xAC00&&cp<=0xD7A3){const initial=Math.floor((cp-0xAC00)/588);return 'ko-'+(CHOSEONG[initial]||'other');}
 const ch=String.fromCodePoint(cp);
 if(/[a-z]/i.test(ch)){const c=ch.toLowerCase();if(c<='f')return'latin-af';if(c<='l')return'latin-gl';if(c<='r')return'latin-mr';return'latin-sz';}
 if(/[0-9]/.test(ch))return'digit';
 return'other';
}
function routeKeys(values=[]){
 const one=new Set(),two=new Set();
 for(const v of values){const c=compact(v);if(!c)continue;const chars=[...c];one.add(chars[0]);if(chars.length>=2)two.add(chars[0]+chars[1]);}
 return {one:[...one],two:[...two]};
}
return Object.freeze({VERSION,normalize,compact,stripDecorators,categoryTail,structuralAliases,firstChars,shardKey,routeKeys});
});
