const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>['.git','dist','node_modules'].includes(x.name)?[]:x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const files=walk(root),failures=[],counts={javascript:0,json:0,jsonl:0,activeAssets:0};
for(const f of files){const ext=path.extname(f);if(['.js','.cjs'].includes(ext)){counts.javascript++;const result=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(result.status!==0)failures.push({file:path.relative(root,f),error:result.stderr});}
 if(['.json','.webmanifest','.jsonl'].includes(ext)){try{const text=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');if(ext==='.jsonl'){text.split(/\r?\n/).filter(x=>x.trim()).forEach(x=>JSON.parse(x));counts.jsonl++;}else{JSON.parse(text);counts.json++;}}catch(e){failures.push({file:path.relative(root,f),error:e.message});}}
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8')),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(manifest.version!==pkg.version)failures.push({file:'runtime-manifest.json',error:'Version does not match package.json'});
for(const group of ['styles','scripts','data','assets'])for(const asset of manifest[group]||[]){if(!fs.existsSync(path.join(root,asset)))failures.push({asset,error:'Missing runtime-manifest asset'});}
for(const asset of [...(manifest.styles||[]),...(manifest.scripts||[])])if(!html.includes('./'+asset))failures.push({asset,error:'Runtime entry does not reference declared style/script'});
if((manifest.scripts||[]).some(x=>/v8|v9|v99|stability|integrated/i.test(x)))failures.push({file:'runtime-manifest.json',error:'Historical runtime source is active'});
const assets=new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('https:')));
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');for(const m of app.matchAll(/(?:loadJSONL?|fetch)\('([^']+)'/g))assets.add(m[1]);
for(const asset of assets){counts.activeAssets++;if(!fs.existsSync(path.join(root,asset.split('?')[0])))failures.push({asset,error:'Missing active asset'});}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);if(new Set(ids).size!==ids.length)failures.push({error:'Duplicate shell IDs'});
for(const f of ['services/adapters.js','services/storage.js','02_core/data-schema.js']){const text=fs.readFileSync(path.join(root,f),'utf8');if(/\beval\s*\(|new Function\s*\(/.test(text))failures.push({file:f,error:'Dynamic code execution forbidden'});}
for(const [flat,source] of Object.entries({'data-schema.js':'02_core/data-schema.js','records.js':'services/records.js','features.js':'06_features/final/features.js','final.css':'03_styles/features/final.css','commercial.css':'03_styles/features/commercial.css','version.js':'07_config/version.js','services-config.js':'07_config/services-config.js','commercial-core.js':'06_features/final/commercial-core.js'}))if(fs.readFileSync(path.join(root,flat),'utf8')!==fs.readFileSync(path.join(root,source),'utf8'))failures.push({file:flat,error:'Flat runtime and categorized source differ'});
const result={timestamp:new Date().toISOString(),status:failures.length?'FAIL':'PASS',counts,failures,scope:'All JS syntax and JSON/JSONL; active entry assets; shell IDs; service no-eval rule. Not a proof of all undefined identifiers or all legacy runtime behavior.'};
fs.mkdirSync(path.join(root,'09_docs/qa-data'),{recursive:true});fs.writeFileSync(path.join(root,'09_docs/qa-data/final-static.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
else if(process.argv.includes('--build')){const dist=path.join(root,'dist');for(const f of files){const relative=path.relative(root,f);if(relative.startsWith('tests'+path.sep)||relative.startsWith('scripts'+path.sep))continue;const to=path.join(dist,relative);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(f,to);}console.log('Static build copied to dist');}
