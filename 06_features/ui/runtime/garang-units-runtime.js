(() => {
'use strict';
const U=window.GarangUnits;if(!U)return;
const textState=new WeakMap();
const skipSelector='script,style,noscript,code,pre,textarea,#unitSetting,#unitSetting option,[data-unit-skip],.gpt-message.user .gpt-text,.memory-value,.meal-visual-copy>strong,.workout-history-row strong,.pr-head strong,.list-item strong';
function unit(){try{return window.GarangUnitPreference?.()||document.getElementById('unitSetting')?.value||'metric';}catch{return 'metric';}}
function decimals(raw,fallback){const m=String(raw).replace(/,/g,'').match(/\.(\d+)/);return m?Math.min(2,Math.max(fallback,m[1].length)):fallback;}
function fmt(v,d){return Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});}
function parseNum(s){return Number(String(s).replace(/,/g,''));}
function paceText(out){
 out=out.replace(/(\d+):([0-5]\d)\s*\/\s*km\b/gi,(_,m,s)=>`${U.formatPace(Number(m)+Number(s)/60,'imperial')} /mi`);
 out=out.replace(/(\d+)'([0-5]\d)"\s*\/\s*km\b/gi,(_,m,s)=>{const p=U.pace(Number(m)+Number(s)/60,'imperial',3);let mm=Math.floor(p),ss=Math.round((p-mm)*60);if(ss===60){mm++;ss=0;}return `${mm}'${String(ss).padStart(2,'0')}" /mi`;});
 out=out.replace(/(\d+(?:\.\d+)?)\s*\/\s*km\b/gi,(_,v)=>`${U.pace(Number(v),'imperial',2).toFixed(2)} /mi`);
 return out;
}
function convert(source){
 if(U.normalize(unit())!=='imperial')return source;
 let out=paceText(source);
 out=out.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*kg\b/gi,(m,v)=>`${fmt(U.weight(parseNum(v),'imperial',decimals(v,1)),decimals(v,1))} lb`);
 out=out.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*cm\b/gi,(m,v)=>`${fmt(U.length(parseNum(v),'imperial',decimals(v,1)),decimals(v,1))} in`);
 out=out.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*km\b/gi,(m,v)=>`${fmt(U.distance(parseNum(v),'imperial',decimals(v,2)),decimals(v,2))} mi`);
 out=out.replace(/\bkg\b/g,'lb').replace(/\bcm\b/g,'in').replace(/\bKM\b/g,'MI').replace(/\bkm\b/g,'mi');
 out=out.replace(/min\s*\/\s*mi/gi,'min/mi').replace(/분\s*\/\s*mi/g,'분/mi');
 return out;
}
function skipped(el){return !!el?.closest?.(skipSelector);}
function applyText(node){if(!node||node.nodeType!==Node.TEXT_NODE||skipped(node.parentElement))return;const cur=node.nodeValue||'';let rec=textState.get(node);if(!rec||cur!==rec.last)rec={source:cur,last:cur};const next=convert(rec.source);rec.last=next;textState.set(node,rec);if(next!==cur)node.nodeValue=next;}
function applyRoot(root=document){if(root.nodeType===Node.TEXT_NODE){applyText(root);return;}const scope=(root.nodeType===Node.ELEMENT_NODE||root.nodeType===Node.DOCUMENT_NODE)?root:null;if(!scope)return;const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))applyText(n);}
const observer=new MutationObserver(muts=>{for(const m of muts){if(m.type==='characterData')applyText(m.target);if(m.type==='childList')m.addedNodes.forEach(applyRoot);}});observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.GarangUnitsUI={refresh:()=>applyRoot(document),unit};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>applyRoot(document),{once:true});else applyRoot(document);
})();
