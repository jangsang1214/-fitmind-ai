'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=p=>path.join(root,p);
const read=p=>fs.readFileSync(file(p),'utf8');
const write=(p,s)=>fs.writeFileSync(file(p),s);
function replaceOnce(source,from,to,label){if(!source.includes(from))throw new Error(`missing ${label}`);if(source.indexOf(from)!==source.lastIndexOf(from))throw new Error(`duplicate ${label}`);return source.replace(from,to);}

let html=read('index.html');
const cssAnchor='<link rel="stylesheet" href="./03_styles/runtime/garang-app-shell-v1.css?v=1.0.0">';
if(!html.includes('garang-simplified-shell-v1.css'))html=replaceOnce(html,cssAnchor,`<link rel="stylesheet" href="./03_styles/runtime/garang-simplified-shell-v1.css?v=1.0.0">\n${cssAnchor}`,'app-shell css anchor');
const oldNav='<nav class="bottom-nav" id="bottomNav" aria-label="주요 메뉴"><button data-page="today" class="active"><span></span><b>Today</b></button><button data-page="coach"><span></span><b>Coach</b></button><button data-page="workout"><span></span><b>Workout</b></button><button data-page="body"><span></span><b>Body</b></button><button data-page="progress"><span></span><b>Progress</b></button></nav>';
const newNav='<nav class="bottom-nav" id="bottomNav" aria-label="주요 메뉴"><button data-page="today" class="active"><span></span><b>Today</b></button><button data-page="log"><span></span><b>Record</b></button><button data-page="coach"><span></span><b>Coach</b></button><button data-page="progress"><span></span><b>누적.</b></button></nav>';
if(!html.includes(newNav))html=replaceOnce(html,oldNav,newNav,'legacy five-axis bottom nav');
const jsAnchor='<script src="./06_features/ui/runtime/garang-experience-v4.js?v=1.6.0-lifecycle"></script>';
if(!html.includes('garang-simplified-shell-v1.js'))html=replaceOnce(html,jsAnchor,`${jsAnchor}<script src="./06_features/ui/runtime/garang-simplified-shell-v1.js?v=1.0.0"></script>`,'experience-v4 script anchor');
write('index.html',html);

const manifest=JSON.parse(read('runtime-manifest.json'));
const style='03_styles/runtime/garang-simplified-shell-v1.css',styleAnchor='03_styles/runtime/garang-app-shell-v1.css';
if(!manifest.styles.includes(style)){const i=manifest.styles.indexOf(styleAnchor);if(i<0)throw new Error('missing manifest app-shell style anchor');manifest.styles.splice(i,0,style);}
const script='06_features/ui/runtime/garang-simplified-shell-v1.js',scriptAnchor='06_features/ui/runtime/garang-experience-v4.js';
if(!manifest.scripts.includes(script)){const i=manifest.scripts.indexOf(scriptAnchor);if(i<0)throw new Error('missing manifest experience-v4 script anchor');manifest.scripts.splice(i+1,0,script);}
write('runtime-manifest.json',JSON.stringify(manifest,null,2)+'\n');

const pkg=JSON.parse(read('package.json'));
const unit='node tests/simplified-shell-v1.test.cjs';
if(!pkg.scripts.test.includes(unit))pkg.scripts.test+=' && '+unit;
write('package.json',JSON.stringify(pkg,null,2)+'\n');

let ci=read('.github/workflows/ci.yml');
const today='      - name: Verify Today action flow\n        run: node tests/browser-today-action-flow.test.cjs';
const shell='      - name: Verify Simplified Shell WebKit\n        run: node tests/browser-simplified-shell.test.cjs';
if(!ci.includes(shell))ci=replaceOnce(ci,today,`${today}\n${shell}`,'Today browser test step');
write('.github/workflows/ci.yml',ci);
console.log('simplified shell wiring: PASS');
