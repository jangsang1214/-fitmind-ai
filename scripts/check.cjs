const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>['.git','dist','node_modules'].includes(x.name)?[]:x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const files=walk(root),failures=[],counts={javascript:0,json:0,jsonl:0,activeAssets:0};
for(const f of files){const ext=path.extname(f);if(['.js','.cjs'].includes(ext)){counts.javascript++;const result=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(result.status!==0)failures.push({file:path.relative(root,f),error:result.stderr});}
 if(['.json','.webmanifest','.jsonl'].includes(ext)){try{const text=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');if(ext==='.jsonl'){text.split(/\r?\n/).filter(x=>x.trim()).forEach(x=>JSON.parse(x));counts.jsonl++;}else{JSON.parse(text);counts.json++;}}catch(e){failures.push({file:path.relative(root,f),error:e.message});}}
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const assets=new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('https:')));
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');for(const m of app.matchAll(/(?:loadJSONL?|fetch)\('([^']+)'/g))assets.add(m[1]);
// Check literal template assets too, including certification overlay images.
for(const m of app.matchAll(/(?:src|href)="([^"$]+)"/g))if(!/^(https?:|data:|blob:|#)/.test(m[1]))assets.add(m[1]);
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8'),list=worker.match(/const ASSETS=\[([^\]]+)\]/);
if(list)for(const m of list[1].matchAll(/'([^']+)'/g))assets.add(m[1]);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'07_config/manifest.webmanifest'),'utf8'));
for(const icon of manifest.icons||[])assets.add(path.posix.normalize('07_config/'+icon.src));
for(const asset of assets){counts.activeAssets++;if(!fs.existsSync(path.join(root,asset.split('?')[0])))failures.push({asset,error:'Missing active asset'});}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);if(new Set(ids).size!==ids.length)failures.push({error:'Duplicate shell IDs'});
for(const f of ['services/adapters.js','services/storage.js','02_core/data-schema.js']){const text=fs.readFileSync(path.join(root,f),'utf8');if(/\beval\s*\(|new Function\s*\(/.test(text))failures.push({file:f,error:'Dynamic code execution forbidden'});}
const result={timestamp:new Date().toISOString(),status:failures.length?'FAIL':'PASS',counts,failures,scope:'All JS syntax and JSON/JSONL; active entry assets; shell IDs; service no-eval rule. Not a proof of all undefined identifiers or all legacy runtime behavior.'};
fs.mkdirSync(path.join(root,'09_docs/qa-data'),{recursive:true});fs.writeFileSync(path.join(root,'09_docs/qa-data/final-static.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
else if(process.argv.includes('--build')){const dist=path.join(root,'dist');for(const f of files){const relative=path.relative(root,f);if(relative.startsWith('tests'+path.sep)||relative.startsWith('scripts'+path.sep))continue;const to=path.join(dist,relative);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(f,to);}console.log('Static build copied to dist');}
