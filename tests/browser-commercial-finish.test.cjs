'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8781;
const baseURL=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const watchdog=setTimeout(()=>{console.error('browser-commercial-finish: WATCHDOG TIMEOUT');process.exit(1);},45000);

async function waitForServer(){
  const deadline=Date.now()+12000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await sleep(150);
  }
  throw new Error('commercial finish server did not start');
}
async function tap(page,selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  await loc.evaluate(el=>el.scrollIntoView({block:'center',behavior:'auto'}));
  const box=await loc.boundingBox();
  assert.ok(box,`${selector} has no touch box`);
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  await page.waitForTimeout(80);
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
  let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:320,height:700},
      isMobile:true,
      hasTouch:true,
      reducedMotion:'reduce',
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-08T00:00:00.000Z'},
        profile:{name:'Commercial QA',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
        preferences:{language:'ko',unit:'metric'},checkins:[],planner:[],workouts:[],meals:[],runs:[],body:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:10000});

    const initialOverflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(initialOverflow.scroll<=initialOverflow.width+1,`Today horizontally overflows at 320px: ${JSON.stringify(initialOverflow)}`);

    await tap(page,'#settingsTopBtn');
    await page.locator('#savePreferences').waitFor({state:'visible',timeout:7000});

    const metrics=await page.evaluate(()=>{
      const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
      const fields=[...document.querySelectorAll('input:not([type="range"]),select,textarea')].filter(visible);
      const fontSizes=fields.map(el=>parseFloat(getComputedStyle(el).fontSize));
      const save=document.getElementById('savePreferences');
      const saveBox=save?.getBoundingClientRect();
      const toast=document.getElementById('toast');
      const transition=getComputedStyle(toast).transitionDuration.split(',').map(v=>v.trim());
      return {
        fontSizes,
        saveHeight:saveBox?.height||0,
        transition,
        viewport:innerWidth,
        scroll:document.documentElement.scrollWidth
      };
    });
    assert.ok(metrics.fontSizes.length>0,'Settings must expose at least one visible form control');
    assert.ok(metrics.fontSizes.every(size=>size>=16),`mobile form controls below 16px can trigger iOS zoom: ${JSON.stringify(metrics.fontSizes)}`);
    assert.ok(metrics.saveHeight>=44,`primary Settings save target must be at least 44px: ${metrics.saveHeight}`);
    assert.ok(metrics.scroll<=metrics.viewport+1,`Settings horizontally overflows at 320px: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.transition.every(value=>value==='0s'||value==='0.001ms'||value==='0.000001s'),`reduced motion did not collapse transitions: ${JSON.stringify(metrics.transition)}`);

    await page.keyboard.press('Tab');
    const focus=await page.evaluate(()=>{
      const el=document.activeElement;if(!el)return null;const s=getComputedStyle(el);
      return {tag:el.tagName,id:el.id||'',outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth};
    });
    assert.ok(focus&&focus.tag!=='BODY','keyboard navigation must move focus to an interactive control');
    assert.notEqual(focus.outlineStyle,'none',`keyboard focus must remain visible: ${JSON.stringify(focus)}`);
    assert.ok(parseFloat(focus.outlineWidth)>=2,`focus ring must be at least 2px: ${JSON.stringify(focus)}`);

    assert.deepEqual(errors,[],`commercial finish runtime errors:\n${errors.join('\n')}`);
    console.log('browser-commercial-finish: PASS');
  }finally{
    clearTimeout(watchdog);
    if(browser)await browser.close().catch(()=>{});
    if(server.exitCode===null)server.kill('SIGTERM');
  }
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
