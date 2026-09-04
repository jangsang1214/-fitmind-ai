const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
vm.runInThisContext(fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-screen-registry-v1.js'),'utf8'));

function node(text=''){
  return {textContent:text,hidden:false};
}

function fakeMain({selectors=[],eyebrow='',title=''}={}){
  const hits=new Set(selectors);
  const eyebrowNode=node(eyebrow),titleNode=node(title);
  const head={querySelector(sel){if(sel==='.eyebrow')return eyebrowNode;if(sel==='h1')return titleNode;return null;}};
  const classes=new Set();
  return {
    dataset:{},
    classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},
    querySelector(sel){if(sel==='.page-head')return head;return hits.has(sel)?{}:null;},
    _eyebrow:eyebrowNode,_title:titleNode,_classes:classes
  };
}

function fakeDoc(active='today',lang='ko'){
  return {
    documentElement:{lang},
    querySelector(sel){return sel==='#bottomNav button.active'?{dataset:{page:active}}:null;}
  };
}

assert.equal(GarangScreens.label('planner','ko'),'PLAN / 계획');
assert.equal(GarangScreens.label('planner','en'),'PLAN');
assert.equal(GarangScreens.isCompact('profile'),true);
assert.equal(GarangScreens.isCompact('planner'),false);

{
  const main=fakeMain({selectors:['#addPlan'],eyebrow:'TODAY / 오늘',title:'Planner'});
  assert.equal(GarangScreens.detect(main,fakeDoc('today')),'planner','Planner must beat stale Today bottom-nav state');
  GarangScreens.applyHeader(main,fakeDoc('today','ko'));
  assert.equal(main._eyebrow.textContent,'PLAN / 계획');
  assert.equal(main._title.hidden,false);
  assert.equal(main.dataset.garangScreen,'planner');
}

{
  const main=fakeMain({selectors:['#saveProfile'],eyebrow:'PROFILE',title:'프로필'});
  GarangScreens.applyHeader(main,fakeDoc('today','ko'));
  assert.equal(main._eyebrow.textContent,'PROFILE / 프로필');
  assert.equal(main._title.hidden,true,'Profile oversized title must stay hidden');
  assert.equal(main.classList.contains('garang-primary-title-hidden'),true);
}

{
  const main=fakeMain({selectors:['#saveOnboarding'],eyebrow:'START',title:'GARANG이 먼저 알아야 할 것'});
  GarangScreens.applyHeader(main,fakeDoc('today','ko'));
  assert.equal(main._eyebrow.textContent,'MODELING / 모델링');
  assert.equal(main._title.hidden,true,'User Model oversized title must stay hidden');
}

{
  const main=fakeMain({selectors:['#runStart'],eyebrow:'LOG / RUNNING',title:'러닝'});
  assert.equal(GarangScreens.detect(main,fakeDoc('today')),'running');
  GarangScreens.applyHeader(main,fakeDoc('today','en'));
  assert.equal(main._eyebrow.textContent,'RUNNING');
}

console.log(JSON.stringify({status:'PASS',suite:'screen-registry',screens:Object.keys(GarangScreens.SCREENS).length},null,2));
