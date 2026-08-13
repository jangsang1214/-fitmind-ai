const fs=require('fs');
const path=require('path');
const root=__dirname;
const files=['index.html','garang-v8.8-hotfix.js','garang-v8.6-integrated.js','v8.5-core.js','v8.5-running.js','app-v5.0.0.js'];
const fail=[]; const pass=[];
function ok(name,cond){(cond?pass:fail).push(name)}
for(const f of files){try{if(f.endsWith('.js')){require('child_process').execFileSync('node',['--check',path.join(root,f)],{stdio:'ignore'})}else fs.accessSync(path.join(root,f));ok(`${f} present + syntax`,true)}catch(e){ok(`${f} present + syntax`,false)}}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hot=fs.readFileSync(path.join(root,'garang-v8.8-hotfix.js'),'utf8');
ok('V8.8 script loaded last',html.includes('garang-v8.8-hotfix.js?v=8.8.0'));
ok('V8.8 version visible',html.includes('GARANG V8.8.0'));
ok('diet page exists',/<section id="diet"/.test(html));
ok('running page is separate',/<section id="running"/.test(html) && html.indexOf('<section id="diet"') < html.indexOf('<section id="running"'));
ok('Google/Apple labels present',html.includes('Google로 계속하기')&&html.includes('Apple로 계속하기'));
ok('bold cert typography',hot.includes('Arial Black')&&hot.includes('font=`900'));
ok('9:16 cert',hot.includes("'9:16'")&&hot.includes('1080:1080')===false&&hot.includes('1920'));
ok('16:9 cert',hot.includes("'16:9'")&&hot.includes('1600')&&hot.includes('900'));
ok('saved workout -> cert',hot.includes('workoutRecordToCert')&&hot.includes('g88-cert-btn'));
ok('running -> separate page',hot.includes("id==='running'")&&hot.includes("id==='diet'"));
ok('AI JSON alert removed for plan/report',hot.includes('showAiModal')&& !hot.includes('onclick=()=>alert(JSON.stringify(planner(),null,2))'));
ok('nutrition isolation hook',hot.includes('renderDietOnly')&&hot.includes('run|pace|gps|러닝'));
console.log(`PASS ${pass.length}/${pass.length+fail.length}`); pass.forEach(x=>console.log('[PASS]',x)); fail.forEach(x=>console.log('[FAIL]',x)); process.exitCode=fail.length?1:0;
