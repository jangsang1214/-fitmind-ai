'use strict';
const {webkit}=require('playwright');

const URL='https://garang-wanted-2026-jangsang1214.vercel.app/';
const TARGET='/wanted/coach';

(async()=>{
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const events=[];
  page.on('console',msg=>events.push({type:'console',level:msg.type(),text:msg.text().slice(0,1000)}));
  page.on('pageerror',err=>events.push({type:'pageerror',text:String(err?.message||err).slice(0,1000)}));
  page.on('requestfailed',req=>{if(req.url().includes('/coach'))events.push({type:'requestfailed',url:req.url(),failure:req.failure()});});
  page.on('response',async res=>{
    if(!res.url().includes('/coach'))return;
    let body='';try{body=(await res.text()).slice(0,3000);}catch(error){body=`<unreadable:${error.message}>`;}
    events.push({type:'response',url:res.url(),status:res.status(),headers:await res.allHeaders(),body});
  });

  try{
    await page.goto(URL,{waitUntil:'domcontentloaded',timeout:30000});
    const entry=page.locator('[data-wanted-demo-start]');
    await entry.waitFor({state:'visible',timeout:15000});
    await entry.tap();
    await page.waitForURL(/judge=1/,{timeout:15000});
    await page.waitForFunction(()=>localStorage.getItem('garang_wanted_demo_active_v1')==='1',{timeout:10000});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.locator('[data-wanted-route="coach"]').tap();
    await page.waitForFunction(()=>document.querySelector('#bottomNav [data-page="coach"]')?.classList.contains('active'),null,{timeout:10000});

    const before=await page.evaluate(()=>({
      href:location.href,
      origin:location.origin,
      dataset:{...document.documentElement.dataset},
      services:window.GARANG_SERVICES,
      transport:window.__GARANG_SERVICE_TRANSPORT_V2__?{
        version:window.__GARANG_SERVICE_TRANSPORT_V2__.version,
        endpoint:window.__GARANG_SERVICE_TRANSPORT_V2__.wantedCoachEndpoint,
        diagnostics:window.__GARANG_SERVICE_TRANSPORT_V2__.diagnostics
      }:null,
      demoActive:localStorage.getItem('garang_wanted_demo_active_v1'),
      stateBytes:(localStorage.getItem('garang_signed_out_v1')||'').length
    }));
    console.log('BEFORE',JSON.stringify(before));

    const textarea=page.locator('.g2-composer textarea');
    const send=page.locator('.g2-send');
    await textarea.waitFor({state:'visible',timeout:10000});
    await send.waitFor({state:'visible',timeout:10000});
    await textarea.fill('나 준나 강해지고싶어');
    await send.tap();

    await page.waitForFunction(()=>document.querySelectorAll('.g2-message.user').length>0,null,{timeout:10000});
    await page.waitForTimeout(32000);
    const after=await page.evaluate(()=>({
      diagnostics:window.__GARANG_SERVICE_TRANSPORT_V2__?.diagnostics||null,
      messages:[...document.querySelectorAll('.g2-message')].slice(-4).map(el=>({className:el.className,id:el.dataset.messageId,text:el.innerText?.slice(0,2500)}))
    }));
    console.log('AFTER',JSON.stringify(after));
    console.log('EVENTS',JSON.stringify(events));

    const coachResponses=events.filter(e=>e.type==='response'&&e.url.includes(TARGET));
    if(!coachResponses.length){console.error('DIAG_NO_WANTED_RESPONSE');process.exitCode=2;}
    else if(coachResponses.at(-1).status!==200){console.error('DIAG_WANTED_HTTP_FAILURE',JSON.stringify(coachResponses.at(-1)));process.exitCode=3;}
    else if(!/"source"\s*:\s*"llm"/i.test(coachResponses.at(-1).body)){console.error('DIAG_WANTED_NON_LLM_RESPONSE',JSON.stringify(coachResponses.at(-1)));process.exitCode=4;}
  } finally {await browser.close();}
})().catch(error=>{console.error('DIAG_FATAL',error);process.exit(1);});
