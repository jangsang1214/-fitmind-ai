'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8777,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw new Error('Wanted UX browser server did not start');}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase intentionally unavailable for local judging mode */'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});

    const entry=page.locator('[data-wanted-demo-start]');
    await entry.waitFor({state:'visible',timeout:10000});
    await entry.tap();
    await page.waitForURL(/judge=1/,{timeout:10000});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:10000});
    await page.locator('.wanted-demo-guide').waitFor({state:'visible',timeout:10000});

    await page.evaluate(()=>window.GarangRouter?.navigate?.('today',{source:'wanted-ux-test',force:true}));
    await page.waitForFunction(()=>window.GarangRouter?.current?.()==='today',null,{timeout:7000});
    const plannerPlus=page.locator('[data-wanted-planner-plus]');
    await plannerPlus.waitFor({state:'visible',timeout:7000});
    assert.equal(await plannerPlus.getAttribute('aria-label'),'플래너 열기');
    await plannerPlus.tap();
    await page.waitForFunction(()=>window.GarangRouter?.current?.()==='planner',null,{timeout:7000});

    await page.evaluate(()=>window.GarangRouter?.navigate?.('coach',{source:'wanted-ux-test',force:true}));
    await page.waitForFunction(()=>window.GarangRouter?.current?.()==='coach',null,{timeout:7000});
    const guide=page.locator('.wanted-demo-guide');
    await page.waitForFunction(()=>document.querySelector('.wanted-demo-guide')?.classList.contains('is-collapsed'),null,{timeout:5000});
    assert.equal(await guide.getAttribute('data-wanted-collapsed'),'1','Coach must auto-collapse the judging route guide');

    const input=page.locator('.g2-composer textarea');
    await input.waitFor({state:'visible',timeout:7000});
    await input.focus();
    await input.fill('테스트 메시지');
    assert.equal(await input.inputValue(),'테스트 메시지','Coach composer must remain interactive in judging mode');

    const guideBox=await guide.boundingBox(),inputBox=await input.boundingBox();
    assert.ok(guideBox&&inputBox,'Guide and Coach composer need measurable layouts');
    const overlap=!(guideBox.x+guideBox.width<=inputBox.x||inputBox.x+inputBox.width<=guideBox.x||guideBox.y+guideBox.height<=inputBox.y||inputBox.y+inputBox.height<=guideBox.y);
    assert.equal(overlap,false,'Collapsed judging guide must not cover the Coach composer');

    assert.equal(errors.length,0,`Wanted UX browser errors: ${errors.join(' | ')}`);
    console.log('Wanted Coach guide + Today planner affordance: PASS');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
