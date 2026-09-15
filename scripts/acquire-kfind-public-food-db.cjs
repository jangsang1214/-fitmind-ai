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

async function candidateInfo(locator,index){
  try{
    return await locator.evaluate((el,i)=>({
      index:i,
      tag:el.tagName,
      text:(el.innerText||el.value||el.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim(),
      href:el.href||el.getAttribute('href')||null,
      onclick:el.getAttribute('onclick'),
      title:el.getAttribute('title'),
      cls:el.className||null
    }),index);
  }catch{return null;}
}

async function clickForDownload(page,locator,label){
  const downloadPromise=page.waitForEvent('download',{timeout:12000}).catch(()=>null);
  try{await locator.click({timeout:8000});}catch(error){console.log(`[kfind] click failed ${label}: ${error.message}`);return null;}
  const download=await downloadPromise;
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
  page.on('console',msg=>console.log(`[browser:${msg.type()}] ${msg.text()}`));
  page.on('request',req=>{
    const u=req.url();
    if(/download|excel|file|history/i.test(u))console.log(`[request] ${req.method()} ${u}`);
  });
  page.on('response',res=>{
    const u=res.url();
    const h=res.headers();
    if(/download|excel|file|history/i.test(u)||/attachment/i.test(h['content-disposition']||''))console.log(`[response] ${res.status()} ${u} ${h['content-disposition']||''}`);
  });

  console.log(`[kfind] source=${SOURCE}`);
  await page.goto(SOURCE,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(1500);
  console.log(`[kfind] title=${await page.title()}`);
  fs.writeFileSync(path.join(OUT,'page.html'),await page.content());

  const rows=page.locator('tr');
  const rowCount=await rows.count();
  const foodRows=[];
  for(let i=0;i<rowCount;i++){
    const text=clean(await rows.nth(i).innerText().catch(()=>''));
    if(text.includes('음식 DB')&&!text.includes('건강기능식품'))foodRows.push({index:i,text});
  }
  console.log(`[kfind] matching rows=${JSON.stringify(foodRows)}`);

  const all=page.locator('a,button,input[type=button],input[type=submit]');
  const allCount=await all.count();
  const candidates=[];
  for(let i=0;i<allCount;i++){
    const info=await candidateInfo(all.nth(i),i);
    if(!info)continue;
    const hay=clean(`${info.text} ${info.href||''} ${info.onclick||''} ${info.title||''} ${info.cls||''}`);
    if(/다운|download|excel|xlsx|xls|file|db/i.test(hay))candidates.push(info);
  }
  fs.writeFileSync(path.join(OUT,'candidates.json'),JSON.stringify(candidates,null,2)+'\n');
  console.log(`[kfind] download candidates=${JSON.stringify(candidates.slice(0,30))}`);

  let downloaded=null;
  for(const hit of foodRows){
    const row=rows.nth(hit.index);
    fs.writeFileSync(path.join(OUT,`food-row-${hit.index}.html`),await row.evaluate(el=>el.outerHTML));
    const controls=row.locator('a,button,input[type=button],input[type=submit]');
    const n=await controls.count();
    for(let j=0;j<n&&!downloaded;j++){
      const info=await candidateInfo(controls.nth(j),j);
      console.log(`[kfind] row control=${JSON.stringify(info)}`);
      downloaded=await clickForDownload(page,controls.nth(j),`row-${hit.index}-${j}`);
    }
  }

  if(!downloaded){
    const exact=page.getByText('DB 다운로드 받기',{exact:true});
    const n=await exact.count();
    for(let i=0;i<n&&!downloaded;i++)downloaded=await clickForDownload(page,exact.nth(i),`generic-${i}`);
  }

  const scripts=await page.locator('script').allTextContents();
  const useful=scripts.filter(x=>/download|excel|file|history|dbGubun/i.test(x)).join('\n\n/* ---- */\n\n');
  fs.writeFileSync(path.join(OUT,'download-scripts.txt'),useful);

  const result={source:SOURCE,retrievedAt:new Date().toISOString(),downloaded:null};
  if(downloaded){
    const stat=fs.statSync(downloaded);
    result.downloaded={file:path.basename(downloaded),bytes:stat.size,sha256:sha256(downloaded)};
    console.log(`[kfind] downloaded=${JSON.stringify(result.downloaded)}`);
  }else{
    console.log('[kfind] no download captured; discovery artifacts retained');
  }
  fs.writeFileSync(path.join(OUT,'acquisition.json'),JSON.stringify(result,null,2)+'\n');
  await browser.close();
  if(!downloaded)process.exitCode=2;
})().catch(error=>{console.error(`[kfind] fatal ${error.stack||error.message}`);process.exitCode=1;});
