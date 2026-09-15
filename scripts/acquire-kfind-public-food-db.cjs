'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const { chromium }=require('playwright');

const OUT=path.resolve(process.env.KFIND_OUT_DIR||'tmp/kfind-source');
const SOURCE='https://various.foodsafetykorea.go.kr/nutrient/general/down/historyList.do';
fs.mkdirSync(OUT,{recursive:true});
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');

async function saveDownload(download){
  if(!download)return null;
  const suggested=clean(download.suggestedFilename())||'kfind-download.bin';
  const target=path.join(OUT,suggested.replace(/[\\/:*?"<>|]/g,'_'));
  await download.saveAs(target);
  return target;
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true,locale:'ko-KR'});
  const page=await context.newPage();
  page.on('request',req=>{const u=req.url();if(/download|excel|file|history|chemi|usage|use/i.test(u))console.log(`[request] ${req.method()} ${u}`);});
  page.on('response',res=>{const u=res.url(),h=res.headers();if(/download|excel|file|history|chemi|usage|use/i.test(u)||/attachment/i.test(h['content-disposition']||''))console.log(`[response] ${res.status()} ${u} ${h['content-disposition']||''}`);});

  console.log(`[kfind] source=${SOURCE}`);
  await page.goto(SOURCE,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(1200);
  write('page.html',await page.content());

  const runtimeFunctions=await page.evaluate(()=>{
    const read=name=>{try{const v=eval(name);return typeof v==='function'?Function.prototype.toString.call(v):String(v??'');}catch{return null;}};
    return {fnDetail:read('fnObj.fnDetail'),fnSearchGubun:read('fnObj.fnSearchGubun'),ComFileDownDirect:read('ComFileDownDirect'),ComAjaxCall:read('ComAjaxCall')};
  }).catch(()=>({}));
  write('runtime-functions.json',runtimeFunctions);
  console.log(`[kfind] fnDetail=${runtimeFunctions.fnDetail||'unavailable'}`);
  console.log(`[kfind] ComFileDownDirect=${runtimeFunctions.ComFileDownDirect||'unavailable'}`);

  const food=page.locator('tr').filter({hasText:'음식 DB'}).filter({hasNotText:'건강기능식품'}).first();
  const foodText=clean(await food.innerText({timeout:8000}));
  const foodHtml=await food.evaluate(el=>el.outerHTML);
  write('food-row.html',foodHtml);
  console.log(`[kfind] food row=${foodText}`);

  const link=food.locator('a').first();
  const downloadPromise=page.waitForEvent('download',{timeout:7000}).catch(()=>null);
  await link.click({timeout:8000});
  const downloaded=await saveDownload(await downloadPromise);

  if(!downloaded){
    await page.waitForTimeout(1400);
    const snapshot=await page.evaluate(()=>{
      const text=el=>(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
      const attrs=el=>({tag:el.tagName,id:el.id||null,name:el.getAttribute('name'),type:el.getAttribute('type'),value:'value'in el?el.value:null,text:text(el),href:el.href||el.getAttribute('href'),onclick:el.getAttribute('onclick'),title:el.getAttribute('title'),required:!!el.required,checked:'checked'in el?!!el.checked:null});
      const dialogs=[...document.querySelectorAll('[role=dialog],.jqx-window,.jqx_layer')].map((el,index)=>({index,id:el.id||null,text:text(el).slice(0,12000),html:el.outerHTML.slice(0,30000)}));
      const iframes=[...document.querySelectorAll('iframe')].map((el,index)=>{
        let doc=null,error=null;try{doc=el.contentDocument;}catch(e){error=String(e);}
        const controls=doc?[...doc.querySelectorAll('input,select,textarea,button,a')].slice(0,160).map(attrs):[];
        return {index,title:el.title||null,name:el.name||null,src:el.getAttribute('src'),error,text:doc?text(doc.body).slice(0,16000):null,html:doc?.documentElement?.outerHTML?.slice(0,50000)||null,controls};
      });
      const pageControls=[...document.querySelectorAll('input,select,textarea,button,a')].filter(el=>/다운|확인|동의|활용|목적|download|file/i.test(text(el)+' '+(el.id||'')+' '+(el.name||'')+' '+(el.getAttribute('onclick')||''))).slice(0,120).map(attrs);
      return {dialogs,iframes,pageControls};
    });
    write('modal-snapshot.json',snapshot);
    console.log(`[kfind] modal snapshot=${JSON.stringify({dialogs:snapshot.dialogs.map(x=>({id:x.id,text:x.text.slice(0,1000)})),iframes:snapshot.iframes.map(x=>({index:x.index,title:x.title,name:x.name,src:x.src,text:x.text?.slice(0,1800),controls:x.controls.slice(0,60)})),pageControls:snapshot.pageControls})}`);
    write('after-detail-page.html',await page.content());
  }

  const result={source:SOURCE,retrievedAt:new Date().toISOString(),downloaded:null};
  if(downloaded){const stat=fs.statSync(downloaded);result.downloaded={file:path.basename(downloaded),bytes:stat.size,sha256:sha256(downloaded)};console.log(`[kfind] downloaded=${JSON.stringify(result.downloaded)}`);}else console.log('[kfind] no file yet; modal snapshot retained');
  write('acquisition.json',result);
  await browser.close();
  if(!downloaded)process.exitCode=2;
})().catch(error=>{console.error(`[kfind] fatal ${error.stack||error.message}`);process.exitCode=1;});
