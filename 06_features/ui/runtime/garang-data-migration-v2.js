/* GARANG data recovery runtime v3.4
   iOS/WebKit recovery safety rules:
   - cancellation is generation based; no rejected Promise.race branch survives a closed UI
   - Firestore history is read in bounded pages instead of materializing an entire account at once
   - CPU-heavy normalization yields frequently so touch/scroll/navigation stay responsive
   - recovery owns only its modal; it never locks html/body or restores focus on touch devices
   - recovery remains non-destructive until the user confirms the final restore
*/
(() => {
'use strict';
if(window.__garangDataMigrationV2)return;window.__garangDataMigrationV2=true;
const Sanitizer=window.GarangStateSanitizer,Core=window.GarangSyncDurability,History=window.GarangHistoryPersistence;
const VERSION='v3.4',LEGACY_KEY='garang_v99_state_v2',RECOVERY_BACKUP_PREFIX='garang_recovery_backup_v3::';
const PROTECTED=Object.freeze(['workouts','meals','runs','body']);
const CLOUD_PAGE_SIZE=60,PROCESS_YIELD_EVERY=40,MERGE_YIELD_EVERY=60;
let lastReport=null,bindingQueued=false,lastTrigger=null,scanGeneration=0,activeScan=null;

function authUid(){try{return window.firebase?.auth?.().currentUser?.uid||null;}catch{return null;}}
function activeKey(){const u=authUid();return u?`garang_user_${u}_v3`:'garang_demo_state_v3';}
function clone(value){try{return value===undefined?undefined:JSON.parse(JSON.stringify(value));}catch{return null;}}
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function unwrap(value){if(!value||typeof value!=='object')return null;if(value.payload&&typeof value.payload==='object')return value.payload;if(value.shell&&typeof value.shell==='object')return value.shell;if(value.state&&typeof value.state==='object')return value.state;return value;}
function sanitize(value,owner=null){const raw=unwrap(value);if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;try{return Sanitizer?.sanitizeState?Sanitizer.sanitizeState(raw,{ownerUid:owner}):clone(raw);}catch{return clone(raw);}}
function rows(value){return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];}
function counts(state){const out={};for(const domain of PROTECTED)out[domain]=rows(state?.[domain]).length;out.total=PROTECTED.reduce((sum,d)=>sum+out[d],0);return out;}
function stateStamp(state){const values=[Date.parse(state?.meta?.updatedAt||0)||0,Date.parse(state?.clientUpdatedAt||0)||0,Number(state?.updatedAtMs)||0];for(const domain of PROTECTED)for(const row of rows(state?.[domain]))values.push(History?.rowStamp?History.rowStamp(row):(Date.parse(row?.updatedAt||row?.createdAt||0)||0));return Math.max(0,...values);}
function candidate(label,type,key,state,owner=null){const safe=sanitize(state,owner);if(!safe)return null;return {label,type,key:key||null,state:safe,counts:counts(safe),stamp:stateStamp(safe)};}
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__recoveryTimer);el.__recoveryTimer=setTimeout(()=>el.classList.remove('show'),3000);}
function clearOldRecoveryToast(){const el=document.getElementById('toast');if(!el||!/저장된 기록을 안전하게 확인/.test(String(el.textContent||'')))return;clearTimeout(el.__recoveryTimer);el.classList.remove('show');}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-');}
function keys(){const out=[];try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key)out.push(key);}}catch{}return out;}
function yieldToUI(){return new Promise(resolve=>setTimeout(resolve,0));}
function isScanCurrent(id){return id==null||id===scanGeneration;}
function cancelError(){const error=new Error('GARANG_RECOVERY_SCAN_CANCELLED');error.garangRecoveryCancelled=true;return error;}
function assertScanCurrent(id){if(!isScanCurrent(id))throw cancelError();}
function beginScan(){
  activeScan=null;
  const id=++scanGeneration;
  activeScan={id};
  return id;
}
function finishScan(id){if(activeScan?.id===id)activeScan=null;}
function cancelActiveScan(){activeScan=null;scanGeneration++;}
function guardedAwait(promise,scanId=null){
  if(scanId==null)return Promise.resolve(promise);
  if(activeScan?.id!==scanId)return Promise.reject(cancelError());
  return Promise.resolve(promise).then(
    value=>{assertScanCurrent(scanId);return value;},
    error=>{assertScanCurrent(scanId);throw error;}
  );
}
function yieldForScan(scanId=null){return guardedAwait(yieldToUI(),scanId);}
function canProgrammaticFocus(){try{return !('ontouchstart' in window)&&window.matchMedia?.('(hover:hover) and (pointer:fine)')?.matches===true;}catch{return false;}}
function focusClose(modal){if(!canProgrammaticFocus())return;requestAnimationFrame(()=>modal?.isConnected&&modal.querySelector('[data-recovery-close]')?.focus({preventScroll:true}));}

function sameAccountBackupKey(key,u){const active=activeKey();if(key===active||key===LEGACY_KEY)return true;if(key.startsWith('garang_sync_backup_v2::'))return key.includes(active);if(key.startsWith('garang_state_backup_v3::'))return key.includes(active);if(key.startsWith('garang_cloud_recovery_backup_v2::')||key.startsWith('garang_cloud_recovery_backup_v3::'))return !!u&&key.includes(u);if(key.startsWith('garang_import_backup_v2::')||key.startsWith('garang_state_recovery_backup_v1::'))return key.includes(active)||key.includes(LEGACY_KEY);if(key.startsWith(RECOVERY_BACKUP_PREFIX))return key.includes(active)|| (!!u&&key.includes(u));return false;}
function labelForKey(key){if(key===activeKey())return '현재 기기 상태';if(key===LEGACY_KEY)return '구버전 로컬 상태';if(key.startsWith('garang_sync_backup_v2::'))return '동기화 이전 백업';if(key.startsWith('garang_state_backup_v3::'))return '기기 롤링 백업';if(key.startsWith('garang_cloud_recovery_backup_v3::'))return '클라우드 롤링 백업';if(key.startsWith('garang_cloud_recovery_backup_v2::'))return '클라우드 최초 백업';if(key.startsWith('garang_import_backup_v2::'))return '가져오기 이전 백업';if(key.startsWith('garang_state_recovery_backup_v1::'))return '상태 복구 백업';if(key.startsWith(RECOVERY_BACKUP_PREFIX))return '복구 실행 이전 백업';return '로컬 백업';}

async function localCandidates(u,scanId=null){
  const out=[],matching=keys().filter(key=>sameAccountBackupKey(key,u));
  for(let i=0;i<matching.length;i++){
    assertScanCurrent(scanId);
    const key=matching[i],hit=candidate(labelForKey(key),'local',key,read(key),key===activeKey()?u:null);
    if(hit)out.push(hit);
    if(i%2===1)await yieldForScan(scanId);
  }
  return out.sort((a,b)=>b.stamp-a.stamp);
}
function bestPrimary(candidates){const active=candidates.find(x=>x.key===activeKey());if(active)return active.state;const cloud=candidates.find(x=>x.type==='cloud-state');if(cloud)return cloud.state;return candidates.slice().sort((a,b)=>b.stamp-a.stamp)[0]?.state||{};}

async function responsiveMerge(domain,lists,state,u,scanId=null){
  const map=new Map(),tombstones=new Map();
  for(const item of rows(state?.meta?.syncTombstones)){
    if(item.explicit!==true||String(item.domain||'')!==domain||!item.id)continue;
    tombstones.set(String(item.id),Date.parse(item.deletedAt||0)||0);
  }
  const flat=[];for(const list of lists)flat.push(...rows(list));
  for(let i=0;i<flat.length;i++){
    assertScanCurrent(scanId);
    const row=flat[i];
    if(History?.normalizeRecord&&History?.recordId&&History?.rowStamp){
      const id=String(History.recordId(domain,row)),deletedAt=tombstones.get(id)||0;
      if(deletedAt>=History.rowStamp(row))continue;
      const normalized=History.normalizeRecord(domain,row,row.ownerUid||state?.meta?.syncOwnerUid||u||null);
      if(!normalized)continue;
      const old=map.get(normalized.id);
      if(!old||History.rowStamp(normalized)>=History.rowStamp(old))map.set(normalized.id,normalized);
    }else{
      const id=String(row.id||`${domain}:${i}`);
      map.set(id,clone(row)||row);
    }
    if(i%MERGE_YIELD_EVERY===MERGE_YIELD_EVERY-1)await yieldForScan(scanId);
  }
  const merged=[...map.values()];
  if(History?.rowStamp)merged.sort((a,b)=>History.rowStamp(a)-History.rowStamp(b));
  return merged;
}
async function combineHistory(baseInput,candidates,history,u,scanId=null){
  let out=sanitize(baseInput,u)||{};
  out.meta=out.meta&&typeof out.meta==='object'?out.meta:{};
  out.meta.syncOwnerUid=u||out.meta.syncOwnerUid||null;
  out.meta.syncTombstones=rows(out.meta.syncTombstones).filter(t=>!PROTECTED.includes(String(t.domain||''))||t.explicit===true);
  for(const domain of PROTECTED){
    assertScanCurrent(scanId);
    const lists=[rows(out[domain]),...candidates.map(item=>rows(item?.state?.[domain])),rows(history?.[domain])];
    out[domain]=await responsiveMerge(domain,lists,out,u,scanId);
    await yieldForScan(scanId);
  }
  assertScanCurrent(scanId);
  return sanitize(out,u)||out;
}
async function docsToRows(docs,mapper,scanId=null){
  const out=[],list=Array.isArray(docs)?docs:[];
  for(let i=0;i<list.length;i++){
    assertScanCurrent(scanId);
    const value=mapper(list[i]);if(value)out.push(value);
    if(i%PROCESS_YIELD_EVERY===PROCESS_YIELD_EVERY-1)await yieldForScan(scanId);
  }
  return out;
}
function orderedCollection(collection,direction='asc'){
  try{
    const documentId=window.firebase?.firestore?.FieldPath?.documentId?.();
    if(documentId&&typeof collection.orderBy==='function')return collection.orderBy(documentId,direction);
  }catch{}
  return collection;
}
async function readHistoryCollection(collection,scanId=null){
  const base=orderedCollection(collection,'asc');
  if(typeof base.limit!=='function'||typeof base.startAfter!=='function'){
    const snap=await guardedAwait(base.get(),scanId);
    return docsToRows(snap?.docs,doc=>History.recordFromDoc(doc.data()),scanId);
  }
  const out=[];let cursor=null;
  for(;;){
    assertScanCurrent(scanId);
    let query=base;
    if(cursor)query=query.startAfter(cursor);
    query=query.limit(CLOUD_PAGE_SIZE);
    const snap=await guardedAwait(query.get(),scanId),docs=Array.isArray(snap?.docs)?snap.docs:[];
    out.push(...await docsToRows(docs,doc=>History.recordFromDoc(doc.data()),scanId));
    if(docs.length<CLOUD_PAGE_SIZE)break;
    cursor=docs[docs.length-1];
    await yieldForScan(scanId);
  }
  return out;
}
function recentSnapshotQuery(collection){
  const ordered=orderedCollection(collection,'desc');
  try{return typeof ordered.limit==='function'?ordered.limit(30):ordered;}catch{return collection;}
}
async function readCloud(u,scanId=null){
  const result={candidates:[],history:Object.fromEntries(PROTECTED.map(d=>[d,[]])),errors:[]};
  if(!u||!window.firebase?.apps?.length)return result;
  const db=window.firebase.firestore(),user=db.collection('users').doc(u);
  try{
    const snap=await guardedAwait(user.collection('app').doc('state').get(),scanId);
    if(snap?.exists){const c=candidate('클라우드 현재 상태','cloud-state','users/app/state',snap.data(),u);if(c)result.candidates.push(c);}
  }catch(error){if(error?.garangRecoveryCancelled)throw error;result.errors.push(`클라우드 상태: ${error?.code||error?.message||'확인 실패'}`);}
  for(const domain of PROTECTED){
    try{
      const name=History?.COLLECTIONS?.[domain];if(!name)continue;
      result.history[domain]=await readHistoryCollection(user.collection(name),scanId);
    }catch(error){if(error?.garangRecoveryCancelled)throw error;result.errors.push(`${domain}: ${error?.code||error?.message||'확인 실패'}`);}
    await yieldForScan(scanId);
  }
  try{
    const snap=await guardedAwait(recentSnapshotQuery(user.collection('recoverySnapshots')).get(),scanId);
    let docs=Array.isArray(snap?.docs)?snap.docs:[];
    if(docs.length>30)docs=docs.slice(0,30);
    for(let i=0;i<docs.length;i++){
      assertScanCurrent(scanId);
      const doc=docs[i],data=doc.data(),state=data?.shell||data?.state||data?.payload||null;
      if(state){const c=candidate('클라우드 복구 스냅샷','cloud-backup',doc.id,state,u);if(c)result.candidates.push(c);}
      if(i%4===3)await yieldForScan(scanId);
    }
  }catch(error){if(error?.garangRecoveryCancelled)throw error;result.errors.push(`복구 스냅샷: ${error?.code||error?.message||'확인 실패'}`);}
  return result;
}
async function scanData(options={}){
  const scanId=options.scanId??null,u=authUid();
  const local=await localCandidates(u,scanId);assertScanCurrent(scanId);
  const cloud=await readCloud(u,scanId);assertScanCurrent(scanId);
  const all=[...local,...cloud.candidates],primary=bestPrimary(all);
  const recovered=await combineHistory(primary,all,cloud.history,u,scanId);assertScanCurrent(scanId);
  const current=candidate('현재 상태','current',activeKey(),read(activeKey()),u)?.state||sanitize(primary,u)||{};
  return {uid:u,activeKey:activeKey(),local,cloudCandidates:cloud.candidates,history:cloud.history,errors:cloud.errors,all,current,recovered,currentCounts:counts(current),recoveredCounts:counts(recovered),scannedAt:new Date().toISOString()};
}
function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));}
function countText(c){return `운동 ${c.workouts} · 식단 ${c.meals} · 러닝 ${c.runs} · 신체 ${c.body}`;}
function sourceRows(report){const historyCounts={workouts:rows(report.history.workouts).length,meals:rows(report.history.meals).length,runs:rows(report.history.runs).length,body:rows(report.history.body).length};historyCounts.total=PROTECTED.reduce((sum,d)=>sum+historyCounts[d],0);const list=[...report.all];if(historyCounts.total)list.push({label:'클라우드 장기 기록',type:'cloud-history',counts:historyCounts,stamp:0});const unique=[];const seen=new Set();for(const item of list){const key=`${item.type}|${item.key||item.label}|${item.counts.total}`;if(seen.has(key))continue;seen.add(key);unique.push(item);}return unique.sort((a,b)=>(b.counts?.total||0)-(a.counts?.total||0)).slice(0,20);}

function ensureStyle(){
  if(document.getElementById('garang-data-recovery-v34-style'))return;
  document.getElementById('garang-data-recovery-v31-style')?.remove();document.getElementById('garang-data-recovery-v32-style')?.remove();document.getElementById('garang-data-recovery-v33-style')?.remove();
  const style=document.createElement('style');style.id='garang-data-recovery-v34-style';style.textContent=`
  .garang-data-recovery-modal{position:fixed;inset:0;z-index:12050;background:rgba(0,0,0,.78);display:grid;place-items:end center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));box-sizing:border-box;overscroll-behavior:contain;touch-action:pan-y;pointer-events:auto}
  .garang-data-recovery-panel{width:min(680px,100%);max-height:calc(100dvh - max(28px,env(safe-area-inset-top,0px)) - max(24px,env(safe-area-inset-bottom,0px)));overflow:auto;-webkit-overflow-scrolling:touch;background:#0b0d0b;border:1px solid #2a2e29;border-radius:18px;padding:16px;color:#ecefe9;box-sizing:border-box;box-shadow:0 20px 80px rgba(0,0,0,.5);touch-action:pan-y;pointer-events:auto}
  .garang-data-recovery-head{display:flex;justify-content:space-between;align-items:center;gap:12px;position:sticky;top:-16px;z-index:2;background:#0b0d0b;padding:16px 0 10px}.garang-data-recovery-head small{color:#68bca5;letter-spacing:.1em}.garang-data-recovery-head h2{margin:4px 0 0;font-size:19px}
  .garang-data-recovery-close{width:38px;height:38px;border:1px solid #2c312d;border-radius:50%;background:#101310;color:#eee;font-size:24px;line-height:1;display:grid;place-items:center;touch-action:manipulation;pointer-events:auto}
  .garang-data-recovery-copy{margin:6px 0 12px;color:#a6aca5;font-size:12px;line-height:1.55;word-break:keep-all}.garang-data-recovery-loading{display:grid;gap:10px;padding:16px 0}.garang-data-recovery-loading b{font-size:13px}.garang-data-recovery-loading span{color:#8d958e;font-size:10px;line-height:1.55}
  .garang-data-recovery-counts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.garang-data-recovery-count{padding:10px;border:1px solid #252824;border-radius:11px;min-width:0}.garang-data-recovery-count.safe{border-color:#35594f}.garang-data-recovery-count small{display:block;color:#8e948c;font-size:9px}.garang-data-recovery-count.safe small{color:#68bca5}.garang-data-recovery-count b{display:block;margin-top:4px;font-size:11px;line-height:1.5}
  .garang-data-recovery-source{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid #252824}.garang-data-recovery-source b{display:block;color:#f3f1eb;font-size:11px}.garang-data-recovery-source small{color:#8e948c;font-size:9px}.garang-data-recovery-source>small{text-align:right;color:#b8bdb7;line-height:1.45}
  .garang-data-recovery-errors{margin-top:10px;padding:9px;border:1px solid #573d33;border-radius:10px;color:#d6a38f;font-size:10px;line-height:1.5}
  .garang-data-recovery-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px}.garang-data-recovery-actions button{min-height:42px;padding:9px 10px;border-radius:10px;border:1px solid #38403a;background:#171a17;color:#eee;font-size:10px;font-weight:600;touch-action:manipulation;pointer-events:auto}.garang-data-recovery-actions [data-recovery-restore]{grid-column:1/-1;border-color:transparent;background:#62b89f;color:#06110d}.garang-data-recovery-actions [data-recovery-restore]:disabled{background:#343834;color:#8b908a}.garang-data-recovery-actions [data-recovery-restore][data-confirming="true"]{background:#d8c58d;color:#17140b}
  .garang-data-recovery-status{min-height:17px;margin:9px 0 0;color:#9ca39d;font-size:10px;line-height:1.5}.garang-data-recovery-note{margin:8px 0 0;color:#777f78;font-size:9px;line-height:1.5}
  @media(min-width:801px){.garang-data-recovery-modal{place-items:center}.garang-data-recovery-panel{padding:18px}.garang-data-recovery-head{top:-18px;padding-top:18px}.garang-data-recovery-actions{grid-template-columns:1fr 1fr 1.4fr}.garang-data-recovery-actions [data-recovery-restore]{grid-column:auto}}
  `;document.head.appendChild(style);
}
function removeModal({cancelScan=false,restoreFocus=false}={}){
  if(cancelScan)cancelActiveScan();
  const modal=document.querySelector('.garang-data-recovery-modal');
  if(modal){modal.style.setProperty('pointer-events','none','important');modal.setAttribute('aria-hidden','true');modal.remove();}
  if(restoreFocus&&canProgrammaticFocus()){
    const target=lastTrigger;lastTrigger=null;
    if(target?.isConnected)requestAnimationFrame(()=>target?.isConnected&&target.focus({preventScroll:true}));
  }else if(restoreFocus)lastTrigger=null;
}
function closeModal(){removeModal({cancelScan:true,restoreFocus:true});}
function mountModal(html){
  removeModal();ensureStyle();
  const modal=document.createElement('div');modal.className='garang-data-recovery-modal';modal.innerHTML=html;document.body.appendChild(modal);
  modal.querySelector('[data-recovery-close]')?.addEventListener('click',closeModal);
  modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
  return modal;
}
function renderLoading(){
  const modal=mountModal(`<section class="garang-data-recovery-panel" role="dialog" aria-modal="true" aria-label="GARANG 데이터 복구 센터"><div class="garang-data-recovery-head"><div><small>DATA HEALTH</small><h2>데이터 복구 센터</h2></div><button type="button" class="garang-data-recovery-close" data-recovery-close aria-label="닫기">×</button></div><div class="garang-data-recovery-loading"><b>저장된 기록을 안전하게 확인하고 있습니다.</b><span>기기와 클라우드 기록을 작은 단위로 순서대로 확인합니다. 확인 중에도 이 창을 닫을 수 있습니다.</span></div><div class="garang-data-recovery-status" aria-live="polite">원본 데이터는 변경하지 않습니다.</div></section>`);
  focusClose(modal);
}
function resetRestoreButton(button){if(!button?.isConnected||button.disabled)return;button.dataset.confirming='false';button.textContent='누락 기록 안전 복구';const status=button.closest('.garang-data-recovery-panel')?.querySelector('[data-recovery-status]');if(status)status.textContent='';}
function requestRestore(report,button){
  if(!button||button.disabled)return;
  if(button.dataset.confirming!=='true'){button.dataset.confirming='true';button.textContent='한 번 더 눌러 복구 실행';const status=button.closest('.garang-data-recovery-panel')?.querySelector('[data-recovery-status]');if(status)status.textContent=`현재 ${report.currentCounts.total}개 기록에서 최대 ${report.recoveredCounts.total}개 기록으로 안전 병합합니다. 한 번 더 누르면 실행됩니다.`;clearTimeout(button.__confirmTimer);button.__confirmTimer=setTimeout(()=>resetRestoreButton(button),6000);return;}
  clearTimeout(button.__confirmTimer);restoreReport(report,button);
}
function renderReport(report){
  lastReport=report;
  const recoverable=report.recoveredCounts.total>report.currentCounts.total;
  const rowsHtml=sourceRows(report).map(item=>`<div class="garang-data-recovery-source"><span><b>${esc(item.label)}</b><small>${esc(item.type)}</small></span><small>${esc(countText(item.counts))}</small></div>`).join('');
  const errors=report.errors.length?`<div class="garang-data-recovery-errors">일부 확인 실패: ${report.errors.map(esc).join(' · ')}</div>`:'';
  const modal=mountModal(`<section class="garang-data-recovery-panel" role="dialog" aria-modal="true" aria-label="GARANG 데이터 복구 센터"><div class="garang-data-recovery-head"><div><small>DATA HEALTH</small><h2>데이터 복구 센터</h2></div><button type="button" class="garang-data-recovery-close" data-recovery-close aria-label="닫기">×</button></div><p class="garang-data-recovery-copy">현재 계정의 기기 저장소, 같은 계정 백업, 클라우드 상태, 장기 기록과 복구 스냅샷을 확인했습니다. 스캔만으로 원본을 변경하지 않습니다.</p><div class="garang-data-recovery-counts"><div class="garang-data-recovery-count"><small>현재 화면 기준</small><b>${esc(countText(report.currentCounts))}</b></div><div class="garang-data-recovery-count safe"><small>안전 병합 가능</small><b>${esc(countText(report.recoveredCounts))}</b></div></div><div>${rowsHtml||'<div class="garang-data-recovery-copy">확인 가능한 저장 소스가 없습니다.</div>'}</div>${errors}<div class="garang-data-recovery-actions"><button type="button" data-recovery-rescan>다시 확인</button><button type="button" data-recovery-export>현재 백업 내보내기</button><button type="button" data-recovery-restore ${recoverable?'':'disabled'}>${recoverable?'누락 기록 안전 복구':'추가 복구 기록 없음'}</button></div><div class="garang-data-recovery-status" data-recovery-status aria-live="polite"></div><p class="garang-data-recovery-note">복구 시 현재 상태와 클라우드 상태를 먼저 별도 백업한 뒤, 운동·식단·러닝·신체 기록만 비파괴 병합합니다.</p></section>`);
  modal.querySelector('[data-recovery-rescan]').onclick=()=>openRecoveryCenter({preserveFocus:true});
  modal.querySelector('[data-recovery-export]').onclick=()=>window.GarangSyncDurabilityRuntime?.exportVerifiedBackup?.();
  const restore=modal.querySelector('[data-recovery-restore]');if(recoverable)restore.onclick=()=>requestRestore(report,restore);
  focusClose(modal);
}
async function openRecoveryCenter(options={}){
  if(!options.preserveFocus)lastTrigger=typeof HTMLElement!=='undefined'&&document.activeElement instanceof HTMLElement?document.activeElement:null;
  clearOldRecoveryToast();
  const scanId=beginScan();renderLoading();
  try{
    await yieldForScan(scanId);
    const report=await scanData({scanId});
    if(!isScanCurrent(scanId))return;
    finishScan(scanId);renderReport(report);
  }catch(error){
    finishScan(scanId);
    if(error?.garangRecoveryCancelled)return;
    console.warn('[GARANG] recovery scan failed',error);
    if(isScanCurrent(scanId)){closeModal();toast('데이터 확인 중 오류가 발생했습니다. 원본은 변경하지 않았습니다.');}
  }
}
async function guardedPersistHistory(db,u,state){
  let out=clone(state);
  for(const domain of PROTECTED){
    const collection=db.collection('users').doc(u).collection(History.COLLECTIONS[domain]),final=[];
    for(let offset=0;offset<rows(out[domain]).length;offset+=25){
      const chunk=rows(out[domain]).slice(offset,offset+25),checked=await Promise.all(chunk.map(async row=>{const local=History.normalizeRecord(domain,row,u),ref=collection.doc(encodeURIComponent(local.id)),snap=await ref.get(),remote=snap.exists?History.recordFromDoc(snap.data()):null;return {local,remote,ref};}));
      for(const item of checked){if(item.remote&&History.rowStamp(item.remote)>History.rowStamp(item.local)){final.push(item.remote);continue;}await item.ref.set(History.docPayload(domain,item.local,u),{merge:false});final.push(item.local);}
      await yieldToUI();
    }
    out[domain]=History.mergeRows(domain,[],final,out);await yieldToUI();
  }
  return out;
}
async function restoreReport(report,button){
  if(!report||report!==lastReport)return;
  const before=report.currentCounts,after=report.recoveredCounts;if(after.total<=before.total)return toast('추가로 복구할 기록이 없습니다.');
  const status=button?.closest('.garang-data-recovery-panel')?.querySelector('[data-recovery-status]');
  if(button){button.disabled=true;button.dataset.confirming='false';button.textContent='복구 중…';}
  if(status)status.textContent='기록을 안전하게 병합하고 있습니다. 이 화면을 닫지 마세요.';
  const u=authUid();let recovered=clone(report.recovered);
  try{
    const raw=localStorage.getItem(report.activeKey);if(raw)localStorage.setItem(`${RECOVERY_BACKUP_PREFIX}${u||'demo'}::${report.activeKey}::${stamp()}`,raw);
    if(u&&window.firebase?.apps?.length){
      const db=window.firebase.firestore(),user=db.collection('users').doc(u),current=report.current||{};
      await user.collection('recoverySnapshots').doc(`manual-recovery-v3-${Date.now()}`).set({recoveryVersion:3,ownerUid:u,createdAt:new Date().toISOString(),source:'pre-recovery',counts:counts(current),shell:History.compactShell(current)},{merge:false});
      recovered=await guardedPersistHistory(db,u,recovered);localStorage.setItem(report.activeKey,JSON.stringify(recovered));
      const shell=Core?.compactForCloud?Core.compactForCloud(History.compactShell(recovered)):History.compactShell(recovered);shell.meta={...(shell.meta||{}),syncOwnerUid:u};shell.clientUpdatedAt=new Date().toISOString();shell.cloudUpdatedAt=window.firebase.firestore.FieldValue.serverTimestamp();await user.collection('app').doc('state').set(shell,{merge:false});
    }else localStorage.setItem(report.activeKey,JSON.stringify(recovered));
    if(status)status.textContent='복구가 완료되었습니다. 앱을 새 상태로 다시 불러옵니다.';
    toast('기록 복구가 완료되었습니다.');setTimeout(()=>location.reload(),450);
  }catch(error){
    console.warn('[GARANG] safe recovery failed',error);toast('복구를 완료하지 못했습니다. 복구 전 백업은 유지됩니다.');
    if(status)status.textContent='복구를 완료하지 못했습니다. 복구 전 백업은 그대로 유지됩니다.';
    if(button){button.disabled=false;button.textContent='누락 기록 안전 복구';}
  }
}
function bindSettingsButton(){
  const button=document.getElementById('importLegacy');if(!button)return;
  const label='데이터 복구 확인',title='기기·클라우드·백업의 기록을 확인하고 누락 기록을 안전하게 병합합니다.';
  if(button.textContent!==label)button.textContent=label;
  if(button.title!==title)button.title=title;
  if(button.dataset.garangSafeImport===VERSION)return;
  button.dataset.garangSafeImport=VERSION;button.onclick=()=>openRecoveryCenter();
}
function queueBinding(){if(bindingQueued)return;bindingQueued=true;requestAnimationFrame(()=>{bindingQueued=false;bindSettingsButton();});}
function startBinding(){ensureStyle();bindSettingsButton();}
window.addEventListener('garang:screen-rendered',queueBinding);
window.addEventListener('garang:state-hydrated',queueBinding);
window.addEventListener('pageshow',queueBinding);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.garang-data-recovery-modal'))closeModal();});
setTimeout(startBinding,0);window.addEventListener('load',startBinding,{once:true});
window.GarangDataMigrationV2=Object.freeze({version:VERSION,importLegacy:openRecoveryCenter,openRecoveryCenter,closeRecoveryCenter:closeModal,scanData,counts,combineHistory,activeKey,get scanActive(){return !!activeScan;},get scanGeneration(){return scanGeneration;}});
})();