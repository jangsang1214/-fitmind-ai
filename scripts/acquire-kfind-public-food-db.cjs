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

async function candidateInfo(locator,index){
  try{
    return await locator.evaluate((el,i)=>({
      index:i,
      tag:el.tagName,
      text:(el.innerText||el.value||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim(),
      href:el.href||el.getAttribute('href')||null,
      onclick:el.getAttribute('onclick'),
      title:el.getAttribute('title'),
      name:el.getAttribute('name'),
      id:el.id||null,
      type:el.getAttribute('type'),
      value:el.value||null,
      cls:el.className||null
    }),index);
  }catch{return null;}
}

async function clickForDownload(page,locator,label,timeout=12000){
  const downloadPromise=page.waitForEvent('download',{timeout}).catch(()=>null);
  try{await locator.click({timeout:8000});}catch(error){console.log(`[kfind] click failed ${label}: ${error.message}`);return null;}
  return downloadPromise;
}

async function saveDownload(download){
  if(!download)return null;
  const suggested=clean(download.suggestedFilename())||'kfind-download.bin';
  const target=path.join(OUT,suggested.replace(/[\\/:*?"<>|]/g,'_'));
  await download.saveAs(target);
  return target;
}

async function inspectFrame(frame,index){
  const info={index,url:frame.url(),name:frame.name(),title:null,text:null,controls:[]};
  try{info.title=await frame.title();}catch{}
  try{info.text=clean((await frame.locator('body').innerText({timeout:3000})).slice(0,12000));}catch{}
  try{
    const controls=frame.locator('input,select,textarea,button,a');
    const n=Math.min(await controls.count(),120);
    for(let i=0;i<n;i++){
      const item=await candidateInfo(controls.nth(i),i);
      if(item)info.controls.push(item);
    }
    const html=await frame.content();
    write(`frame-${index}.html`,html);
  }catch{}
  return info;
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true,locale:'ko-KR'});
  const page=await context.newPage();
  page.on('console',msg=>console.log(`[browser:${msg.type()}] ${msg.text()}`));
  page.on('request',req=>{
    const u=req.url();
    if(/download|excel|file|history|chemi|usage|use/i.test(u))console.log(`[request] ${req.method()} ${u}`);
  });
  page.on('response',res=>{
    const u=res.url(),h=res.headers();
    if(/download|excel|file|history|chemi|usage|use/i.test(u)||/attachment/i.test(h['content-disposition']||''))console.log(`[response] ${res.status()} ${u} ${h['content-disposition']||''}`);
  });

  console.log(`[kfind] source=${SOURCE}`);
  await page.goto(SOURCE,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(1500);
  console.log(`[kfind] title=${await page.title()}`);
  write('page.html',await page.content());

  const runtimeFunctions=await page.evaluate(()=>{
    const read=name=>{try{const v=eval(name);return typeof v==='function'?Function.prototype.toString.call(v):String(v??'');}catch{return null;}};
    return {
      fnDetail:read('fnObj.fnDetail'),
      fnSearchGubun:read('fnObj.fnSearchGubun'),
      ComFileDownDirect:read('ComFileDownDirect'),
      ComAjaxCall:read('ComAjaxCall')
    };
  }).catch(()=>({}));
  write('runtime-functions.json',runtimeFunctions);

  const rows=page.locator('tr');
  const rowCount=await rows.count(),foodRows=[];
  for(let i=0;i<rowCount;i++){
    const text=clean(await rows.nth(i).innerText().catch(()=>''));
    if(text.includes('음식 DB')&&!text.includes('건강기능식품'))foodRows.push({index:i,text});
  }
  console.log(`[kfind] matching rows=${JSON.stringify(foodRows)}`);

  const all=page.locator('a,button,input[type=button],input[type=submit]');
  const allCount=await all.count(),candidates=[];
  for(let i=0;i<allCount;i++){
    const info=await candidateInfo(all.nth(i),i);
    if(!info)continue;
    const hay=clean(`${info.text} ${info.href||''} ${info.onclick||''} ${info.title||''} ${info.cls||''}`);
    if(/다운|download|excel|xlsx|xls|file|db/i.test(hay))candidates.push(info);
  }
  write('candidates.json',candidates);

  let downloaded=null,openedDetail=false;
  for(const hit of foodRows){
    const row=rows.nth(hit.index);
    write(`food-row-${hit.index}.html`,await row.evaluate(el=>el.outerHTML));
    const control=row.locator('a').first();
    const info=await candidateInfo(control,0);
    console.log(`[kfind] food detail control=${JSON.stringify(info)}`);
    const download=await clickForDownload(page,control,`row-${hit.index}-detail`,6000);
    downloaded=await saveDownload(download);
    openedDetail=true;
    break;
  }

  if(openedDetail&&!downloaded){
    await page.waitForTimeout(1500);
    const modalData=[];
    const modals=page.locator('[role=dialog], .jqx-window, .jqx_layer');
    const modalCount=Math.min(await modals.count(),20);
    for(let i=0;i<modalCount;i++){
      try{
        const modal=modals.nth(i);
        modalData.push({index:i,id:await modal.getAttribute('id'),text:clean((await modal.innerText()).slice(0,12000)),html:(await modal.evaluate(el=>el.outerHTML)).slice(0,30000)});
      }catch{}
    }
    write('modals.json',modalData);

    const frames=[];
    for(const [index,frame] of page.frames().entries())frames.push(await inspectFrame(frame,index));
    write('frames.json',frames);
    console.log(`[kfind] frames=${JSON.stringify(frames.map(f=>({index:f.index,url:f.url,name:f.name,title:f.title,text:f.text?.slice(0,700),controls:f.controls.slice(0,30)})))}`);

    const sourceHtml=await page.content();
    write('after-detail-page.html',sourceHtml);
  }

  const scripts=await page.locator('script').allTextContents();
  write('download-scripts.txt',scripts.filter(x=>/download|excel|file|history|dbGubun|filePop/i.test(x)).join('\n\n/* ---- */\n\n'));

  const result={source:SOURCE,retrievedAt:new Date().toISOString(),downloaded:null,detailOpened:openedDetail};
  if(downloaded){
    const stat=fs.statSync(downloaded);
    result.downloaded={file:path.basename(downloaded),bytes:stat.size,sha256:sha256(downloaded)};
    console.log(`[kfind] downloaded=${JSON.stringify(result.downloaded)}`);
  }else console.log('[kfind] no download captured; modal/runtime discovery artifacts retained');
  write('acquisition.json',result);
  await browser.close();
  if(!downloaded)process.exitCode=2;
})().catch(error=>{console.error(`[kfind] fatal ${error.stack||error.message}`);process.exitCode=1;});
