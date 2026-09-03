from pathlib import Path
import json

ROOT=Path('.')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing replacement target: {label}')
    return text.replace(old,new,1)

units_js=r'''(() => {
'use strict';
const KG_TO_LB=2.2046226218487757;
const CM_TO_IN=1/2.54;
const KM_TO_MI=0.621371192237334;
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const rounded=(v,d=1)=>{const p=10**Math.max(0,d);return Math.round((v+Number.EPSILON)*p)/p;};
const normalize=unit=>unit==='imperial'?'imperial':'metric';
const weight=(kg,unit='metric',digits=1)=>{const n=finite(kg);if(n===null)return null;return rounded(normalize(unit)==='imperial'?n*KG_TO_LB:n,digits);};
const toMetricWeight=(value,unit='metric')=>{const n=finite(value);if(n===null)return null;return normalize(unit)==='imperial'?n/KG_TO_LB:n;};
const length=(cm,unit='metric',digits=1)=>{const n=finite(cm);if(n===null)return null;return rounded(normalize(unit)==='imperial'?n*CM_TO_IN:n,digits);};
const toMetricLength=(value,unit='metric')=>{const n=finite(value);if(n===null)return null;return normalize(unit)==='imperial'?n/CM_TO_IN:n;};
const distance=(km,unit='metric',digits=2)=>{const n=finite(km);if(n===null)return null;return rounded(normalize(unit)==='imperial'?n*KM_TO_MI:n,digits);};
const toMetricDistance=(value,unit='metric')=>{const n=finite(value);if(n===null)return null;return normalize(unit)==='imperial'?n/KM_TO_MI:n;};
const pace=(minutesPerKm,unit='metric',digits=2)=>{const n=finite(minutesPerKm);if(n===null)return null;return rounded(normalize(unit)==='imperial'?n/KM_TO_MI:n,digits);};
const weightUnit=unit=>normalize(unit)==='imperial'?'lb':'kg';
const lengthUnit=unit=>normalize(unit)==='imperial'?'in':'cm';
const distanceUnit=unit=>normalize(unit)==='imperial'?'mi':'km';
const paceUnit=unit=>normalize(unit)==='imperial'?'min/mi':'min/km';
const formatPace=(minutes,unit='metric')=>{const p=pace(minutes,unit,3);if(p===null||!Number.isFinite(p))return '—';let m=Math.floor(p),s=Math.round((p-m)*60);if(s===60){m+=1;s=0;}return `${m}:${String(s).padStart(2,'0')}`;};
globalThis.GarangUnits={KG_TO_LB,CM_TO_IN,KM_TO_MI,normalize,weight,toMetricWeight,length,toMetricLength,distance,toMetricDistance,pace,weightUnit,lengthUnit,distanceUnit,paceUnit,formatPace};
})();
'''
(ROOT/'services/units.js').write_text(units_js,encoding='utf-8')

runtime_js=r'''(() => {
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
'''
ui_runtime=ROOT/'06_features/ui/runtime/garang-units-runtime.js'
ui_runtime.parent.mkdir(parents=True,exist_ok=True)
ui_runtime.write_text(runtime_js,encoding='utf-8')

app_path=ROOT/'01_app/app.js'
app=app_path.read_text(encoding='utf-8')
needle="function uiLang(){return state.preferences?.language==='en'?'en':'ko';}"
helpers=r'''function uiLang(){return state.preferences?.language==='en'?'en':'ko';}
function unitSystem(){return window.GarangUnits?.normalize(state.preferences?.unit)||((state.preferences?.unit==='imperial')?'imperial':'metric');}
function metricWeight(v){const n=num(v);return window.GarangUnits?GarangUnits.toMetricWeight(n,unitSystem()):n;}
function metricLength(v){const n=num(v);return window.GarangUnits?GarangUnits.toMetricLength(n,unitSystem()):n;}
function shownWeight(v,d=1){if(v===null||v===undefined||v==='')return '';const x=window.GarangUnits?GarangUnits.weight(num(v),unitSystem(),d):num(v);return x===null?'':x;}
function shownLength(v,d=1){if(v===null||v===undefined||v==='')return '';const x=window.GarangUnits?GarangUnits.length(num(v),unitSystem(),d):num(v);return x===null?'':x;}
function shownDistance(v,d=2){if(v===null||v===undefined||v==='')return '';const x=window.GarangUnits?GarangUnits.distance(num(v),unitSystem(),d):num(v);return x===null?'':x;}
function shownPace(v,d=2){if(v===null||v===undefined||v==='')return '';const x=window.GarangUnits?GarangUnits.pace(num(v),unitSystem(),d):num(v);return x===null?'':x;}
function weightUnit(){return window.GarangUnits?GarangUnits.weightUnit(unitSystem()):'kg';}
function lengthUnit(){return window.GarangUnits?GarangUnits.lengthUnit(unitSystem()):'cm';}
function distanceUnit(){return window.GarangUnits?GarangUnits.distanceUnit(unitSystem()):'km';}
function paceUnit(){return window.GarangUnits?GarangUnits.paceUnit(unitSystem()):'min/km';}
window.GarangUnitPreference=unitSystem;'''
app=replace_once(app,needle,helpers,'unit helpers')

app=replace_once(app,"<strong>${body?.weight||state.profile?.weight||'—'}</strong><small>kg</small>","<strong>${shownWeight(body?.weight||state.profile?.weight||'',1)||'—'}</strong><small>${weightUnit()}</small>",'today body unit')
app=replace_once(app,"<strong>${draftVol.toLocaleString()}</strong><span>VOLUME kg</span>","<strong>${Math.round(shownWeight(draftVol,0)||0).toLocaleString()}</strong><span>VOLUME ${weightUnit()}</span>",'workout draft volume')
app=replace_once(app,"<b id=\"oneRmPreview\">72.0</b><small>kg</small>","<b id=\"oneRmPreview\">${Number(shownWeight(72,1)).toFixed(1)}</b><small>${weightUnit()}</small>",'1rm preview unit')
app=replace_once(app,"${best1?best1.toFixed(1):'—'} <small>kg</small>","${best1?Number(shownWeight(best1,1)).toFixed(1):'—'} <small>${weightUnit()}</small>",'best 1rm unit')
app=replace_once(app,"<label>중량 kg</label><input id=\"wWeight\" type=\"number\" min=\"0\" step=\"0.5\" value=\"60\">","<label>중량 ${weightUnit()}</label><input id=\"wWeight\" type=\"number\" min=\"0\" step=\"0.5\" value=\"${shownWeight(60,1)}\">",'workout weight input')
app=replace_once(app,"<label>체중 kg</label><input id=\"wBody\" type=\"number\" min=\"1\" step=\"0.1\" value=\"${state.profile?.weight||67}\">","<label>체중 ${weightUnit()}</label><input id=\"wBody\" type=\"number\" min=\"1\" step=\"0.1\" value=\"${shownWeight(state.profile?.weight||67,1)}\">",'workout body input')
app=replace_once(app,"weight=Math.max(0,num($('wWeight').value))","weight=Math.max(0,metricWeight($('wWeight').value))",'workout canonical weight')
app=replace_once(app,"body=Math.max(1,num($('wBody').value,state.profile?.weight||67))","body=Math.max(1,metricWeight($('wBody').value)||state.profile?.weight||67)",'workout canonical body')
app=replace_once(app,"const update1RM=()=>{const el=$('oneRmPreview');if(el)el.textContent=calcEstimated1RM($('wWeight')?.value,$('wReps')?.value).toFixed(1);};","const update1RM=()=>{const el=$('oneRmPreview');if(el){const rm=calcEstimated1RM(metricWeight($('wWeight')?.value),$('wReps')?.value);el.textContent=Number(shownWeight(rm,1)||0).toFixed(1);}};",'live 1rm conversion')
app=replace_once(app,"$('wWeight').value=x.weight;","$('wWeight').value=shownWeight(x.weight,1);",'edit workout weight')
app=replace_once(app,"$('wBody').value=x.body;","$('wBody').value=shownWeight(x.body,1);",'edit workout body')
app=replace_once(app,"<b>${Math.round(w.volume||0).toLocaleString()}</b><span>kg</span>","<b>${Math.round(shownWeight(w.volume||0,0)||0).toLocaleString()}</b><span>${weightUnit()}</span>",'workout history volume')

app=replace_once(app,"<label>키 cm</label><input id=\"pHeight\" type=\"number\" value=\"${state.profile?.height||''}\">","<label>키 ${lengthUnit()}</label><input id=\"pHeight\" type=\"number\" step=\"0.1\" value=\"${shownLength(state.profile?.height||'',1)}\">",'profile height input')
app=replace_once(app,"<label>체중 kg</label><input id=\"pWeight\" type=\"number\" step=\"0.1\" value=\"${state.profile?.weight||''}\">","<label>체중 ${weightUnit()}</label><input id=\"pWeight\" type=\"number\" step=\"0.1\" value=\"${shownWeight(state.profile?.weight||'',1)}\">",'profile weight input')
app=replace_once(app,"height:num($('pHeight').value),weight:num($('pWeight').value)","height:metricLength($('pHeight').value),weight:metricWeight($('pWeight').value)",'profile canonical units')

app=replace_once(app,"<div><span>골격근</span><b>${b?.muscle??'—'}<small>kg</small></b></div>","<div><span>골격근</span><b>${b?.muscle?shownWeight(b.muscle,1):'—'}<small>${weightUnit()}</small></b></div>",'body muscle hero')
app=replace_once(app,"<label>체중 kg</label><input id=\"bWeight\" type=\"number\" step=\"0.1\" value=\"${b?.weight||state.profile?.weight||''}\">","<label>체중 ${weightUnit()}</label><input id=\"bWeight\" type=\"number\" step=\"0.1\" value=\"${shownWeight(b?.weight||state.profile?.weight||'',1)}\">",'body weight input')
app=replace_once(app,"<label>키 cm</label><input id=\"bHeight\" type=\"number\" step=\"0.1\" value=\"${state.profile?.height||''}\">","<label>키 ${lengthUnit()}</label><input id=\"bHeight\" type=\"number\" step=\"0.1\" value=\"${shownLength(state.profile?.height||'',1)}\">",'body height input')
app=replace_once(app,"<label>골격근량 kg</label><input id=\"bMuscle\" type=\"number\" step=\"0.1\" value=\"${b?.muscle||''}\">","<label>골격근량 ${weightUnit()}</label><input id=\"bMuscle\" type=\"number\" step=\"0.1\" value=\"${shownWeight(b?.muscle||'',1)}\">",'body muscle input')
old_preview="function updateBodyDerivedPreview(){const box=$('bodyDerived');if(!box)return;const d=bodyDerived($('bWeight')?.value,$('bHeight')?.value||state.profile?.height,$('bFatPct')?.value);box.innerHTML=`<div><span>체지방량</span><b>${d.fatMass?d.fatMass.toFixed(1):'—'} kg</b></div><div><span>제지방량</span><b>${d.leanMass?d.leanMass.toFixed(1):'—'} kg</b></div><div><span>BMI</span><b>${d.bmi?d.bmi.toFixed(1):'—'}</b></div><div><span>BMR</span><b>${d.bmr||'—'} kcal</b></div>`;}"
new_preview="function updateBodyDerivedPreview(){const box=$('bodyDerived');if(!box)return;const d=bodyDerived(metricWeight($('bWeight')?.value),metricLength($('bHeight')?.value)||state.profile?.height,$('bFatPct')?.value);box.innerHTML=`<div><span>체지방량</span><b>${d.fatMass?Number(shownWeight(d.fatMass,1)).toFixed(1):'—'} ${weightUnit()}</b></div><div><span>제지방량</span><b>${d.leanMass?Number(shownWeight(d.leanMass,1)).toFixed(1):'—'} ${weightUnit()}</b></div><div><span>BMI</span><b>${d.bmi?d.bmi.toFixed(1):'—'}</b></div><div><span>BMR</span><b>${d.bmr||'—'} kcal</b></div>`;}"
app=replace_once(app,old_preview,new_preview,'body derived preview')
app=replace_once(app,"async function saveBody(){const weight=num($('bWeight').value),height=num($('bHeight').value||state.profile?.height),fatPct=num($('bFatPct').value),muscle=num($('bMuscle').value);","async function saveBody(){const weight=metricWeight($('bWeight').value),height=metricLength($('bHeight').value)||state.profile?.height,fatPct=num($('bFatPct').value),muscle=metricWeight($('bMuscle').value);",'body canonical save')

app=replace_once(app,"<div class=\"stat\">${bestWeight||'—'}</div><div class=\"stat-label\">최고 중량 kg</div>","<div class=\"stat\">${bestWeight?shownWeight(bestWeight,1):'—'}</div><div class=\"stat-label\">최고 중량 ${weightUnit()}</div>",'progress best weight')
app=replace_once(app,"<div class=\"stat\">${bestVolume?Math.round(bestVolume).toLocaleString():'—'}</div><div class=\"stat-label\">최고 볼륨 kg</div>","<div class=\"stat\">${bestVolume?Math.round(shownWeight(bestVolume,0)).toLocaleString():'—'}</div><div class=\"stat-label\">최고 볼륨 ${weightUnit()}</div>",'progress best volume')
app=replace_once(app,"<div class=\"stat\">${bestRun?bestRun.toFixed(1):'—'}</div><div class=\"stat-label\">최장 러닝 km</div>","<div class=\"stat\">${bestRun?Number(shownDistance(bestRun,1)).toFixed(1):'—'}</div><div class=\"stat-label\">최장 러닝 ${distanceUnit()}</div>",'progress run distance')
app=replace_once(app,"<strong>${r.volume.toLocaleString()}</strong><span>총 볼륨 kg</span>","<strong>${Math.round(shownWeight(r.volume,0)||0).toLocaleString()}</strong><span>총 볼륨 ${weightUnit()}</span>",'weekly volume')
app=replace_once(app,"<strong>${r.runKm.toFixed(1)}</strong><span>러닝 km</span>","<strong>${Number(shownDistance(r.runKm,1)||0).toFixed(1)}</strong><span>러닝 ${distanceUnit()}</span>",'weekly run')

app=replace_once(app,"<div class=\"stat-label\">km</div>","<div class=\"stat-label\">${distanceUnit()}</div>",'running distance label')
app=replace_once(app,"<div class=\"stat-label\">분/km</div>","<div class=\"stat-label\">${paceUnit()}</div>",'running pace label')
app=replace_once(app,"if($('runDistance'))$('runDistance').textContent=runState.distance.toFixed(2);","if($('runDistance'))$('runDistance').textContent=Number(shownDistance(runState.distance,2)||0).toFixed(2);",'live running distance')
app=replace_once(app,"if($('runPace'))$('runPace').textContent=runState.distance>0?(sec/60/runState.distance).toFixed(2):'—';","if($('runPace'))$('runPace').textContent=runState.distance>0?Number(shownPace(sec/60/runState.distance,2)).toFixed(2):'—';",'live running pace')

app=replace_once(app,"function paceText(r){const p=num(r?.duration)/(num(r?.distance)||1);if(!Number.isFinite(p)||!num(r?.distance))return '—';const m=Math.floor(p),s=Math.round((p-m)*60);return `${m}'${String(s).padStart(2,'0')}\\\"`;}","function paceText(r){const p=num(r?.duration)/(num(r?.distance)||1);if(!Number.isFinite(p)||!num(r?.distance))return '—';const shown=shownPace(p,3),m=Math.floor(shown),s0=Math.round((shown-m)*60),s=s0===60?0:s0,mm=s0===60?m+1:m;return `${mm}'${String(s).padStart(2,'0')}\\\"`;}",'pace text imperial')
app=replace_once(app,"headline:`${num(r.distance).toFixed(2)} KM`,sub:`${formatRunMinutes(num(r.duration))} · ${paceText(r)} /KM`","headline:`${Number(shownDistance(num(r.distance),2)).toFixed(2)} ${distanceUnit().toUpperCase()}`,sub:`${formatRunMinutes(num(r.duration))} · ${paceText(r)} /${distanceUnit().toUpperCase()}`",'cert running units')
app=replace_once(app,"['PACE',paceText(r)]","['PACE',`${paceText(r)} /${distanceUnit().toUpperCase()}`]",'cert pace metric')
app=replace_once(app,"topLift:top?`${top.name} · ${top.weight}kg × ${top.reps}`:'—'","topLift:top?`${top.name} · ${shownWeight(top.weight,1)}${weightUnit()} × ${top.reps}`:'—'",'cert top lift')
app=replace_once(app,"['VOLUME',`${Math.round(num(s.volume)).toLocaleString()} kg`]","['VOLUME',`${Math.round(shownWeight(num(s.volume),0)).toLocaleString()} ${weightUnit()}`]",'cert volume')

old_csv="function exportBodyCSV(){const rows=[['date','weight_kg','skeletal_muscle_kg','body_fat_percent','body_fat_mass_kg','lean_mass_kg','bmi','bmr_kcal'],...state.body.map(x=>[x.date,x.weight??'',x.muscle??'',x.fatPercent??'',x.fatMass??'',x.leanMass??'',x.bmi??'',x.bmr??''])];"
new_csv="function exportBodyCSV(){const wu=weightUnit(),cv=v=>(v===null||v===undefined||v==='')?'':shownWeight(v,1);const rows=[['date',`weight_${wu}`,`skeletal_muscle_${wu}`,'body_fat_percent',`body_fat_mass_${wu}`,`lean_mass_${wu}`,'bmi','bmr_kcal'],...state.body.map(x=>[x.date,cv(x.weight),cv(x.muscle),x.fatPercent??'',cv(x.fatMass),cv(x.leanMass),x.bmi??'',x.bmr??''])];"
app=replace_once(app,old_csv,new_csv,'body csv units')
app=replace_once(app,"c.fillText(`${b.weight} kg`,72,305);","c.fillText(`${shownWeight(b.weight,1)} ${weightUnit()}`,72,305);",'body image weight')
app=replace_once(app,"['SKELETAL MUSCLE',b.muscle?`${b.muscle} kg`:'—']","['SKELETAL MUSCLE',b.muscle?`${shownWeight(b.muscle,1)} ${weightUnit()}`:'—']",'body image muscle')
app=replace_once(app,"c.fillText(`${vals.at(-1).toFixed(1)} ${cfg.unit}`,102,1130);","c.fillText(`${cfg.unit==='kg'?Number(shownWeight(vals.at(-1),1)).toFixed(1):vals.at(-1).toFixed(1)} ${cfg.unit==='kg'?weightUnit():cfg.unit}`,102,1130);",'body image trend')

app_path.write_text(app,encoding='utf-8')

index=Path('index.html').read_text(encoding='utf-8')
index=replace_once(index,'<script src="./services/performance.js?v=recording-v2"></script>','<script src="./services/performance.js?v=recording-v2"></script>\n<script src="./services/units.js?v=1.0.0"></script>','index unit service')
index=replace_once(index,'<script src="./06_features/ui/i18n/runtime.js?v=1.0.0"></script>','<script src="./06_features/ui/i18n/runtime.js?v=1.0.0"></script>\n<script src="./06_features/ui/runtime/garang-units-runtime.js?v=1.0.0"></script>','index unit runtime')
Path('index.html').write_text(index,encoding='utf-8')

manifest=json.loads(Path('runtime-manifest.json').read_text(encoding='utf-8'))
scripts=manifest['scripts']
if 'services/units.js' not in scripts:scripts.insert(scripts.index('services/performance.js')+1,'services/units.js')
if '06_features/ui/runtime/garang-units-runtime.js' not in scripts:scripts.append('06_features/ui/runtime/garang-units-runtime.js')
Path('runtime-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

sw=Path('02_core/sw-runtime.js').read_text(encoding='utf-8')
sw=sw.replace("garang-structured-i18n-v1-20260904","garang-units-v1-20260904")
sw=sw.replace('"./services/performance.js",','"./services/performance.js","./services/units.js",')
sw=sw.replace('"./06_features/ui/i18n/runtime.js",','"./06_features/ui/i18n/runtime.js","./06_features/ui/runtime/garang-units-runtime.js",')
Path('02_core/sw-runtime.js').write_text(sw,encoding='utf-8')

unit_test=r'''const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(root,'services/units.js'),'utf8'),ctx);
const U=ctx.GarangUnits;
assert.equal(U.weight(70,'metric',1),70);
assert.equal(U.weight(70,'imperial',1),154.3);
assert.equal(U.length(180,'imperial',1),70.9);
assert.equal(U.distance(5,'imperial',2),3.11);
assert.equal(U.formatPace(5,'imperial'),'8:03');
assert.ok(Math.abs(U.toMetricWeight(U.weight(80,'imperial',4),'imperial')-80)<0.01);
assert.ok(Math.abs(U.toMetricLength(U.length(175,'imperial',4),'imperial')-175)<0.01);
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),manifest=require('../runtime-manifest.json');
for(const token of ['metricWeight($(\'wWeight\').value)','metricLength($(\'bHeight\').value)','shownDistance(runState.distance','distanceUnit()','weightUnit()'])assert.ok(app.includes(token),token);
assert.ok(html.includes('./services/units.js'));assert.ok(html.includes('./06_features/ui/runtime/garang-units-runtime.js'));
assert.ok(manifest.scripts.includes('services/units.js'));assert.ok(manifest.scripts.includes('06_features/ui/runtime/garang-units-runtime.js'));
console.log(JSON.stringify([{name:'metric and imperial unit system',status:'PASS'}],null,2));
'''
Path('tests/units.test.cjs').write_text(unit_test,encoding='utf-8')

pkg=json.loads(Path('package.json').read_text(encoding='utf-8'))
if 'tests/units.test.cjs' not in pkg['scripts']['test']:
    pkg['scripts']['test'] += ' && node tests/units.test.cjs'
Path('package.json').write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print(json.dumps({'status':'prepared','unit':'metric/imperial','canonicalStorage':'metric'},ensure_ascii=False))
