/* GARANG data recovery runtime v3.1
   User-triggered, non-destructive recovery across current local state, same-account
   backups, Firestore app state, durable history collections and recovery snapshots.
   No source is deleted during scan or restore. Recovery UI is non-blocking on iOS/WebKit.
*/
(() => {
'use strict';
if(window.__garangDataMigrationV2)return;window.__garangDataMigrationV2=true;
const Legacy=window.GarangLegacyMigration,Sanitizer=window.GarangStateSanitizer,Core=window.GarangSyncDurability,History=window.GarangHistoryPersistence;
const LEGACY_KEY='garang_v99_state_v2',RECOVERY_BACKUP_PREFIX='garang_recovery_backup_v3::';
const PROTECTED=Object.freeze(['workouts','meals','runs','body']);
let lastReport=null,observer=null,bindingQueued=false,lastTrigger=null;

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
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-');}
function keys(){const out=[];try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key)out.push(key);}}catch{}return out;}
function sameAccountBackupKey(key,u){const active=activeKey();if(key===active||key===LEGACY_KEY)return true;if(key.startsWith('garang_sync_backup_v2::'))return key.includes(active);if(key.startsWith('garang_state_backup_v3::'))return key.includes(active);if(key.startsWith('garang_cloud_recovery_backup_v2::')||key.startsWith('garang_cloud_recovery_backup_v3::'))return !!u&&key.includes(u);if(key.startsWith('garang_import_backup_v2::')||key.startsWith('garang_state_recovery_backup_v1::'))return key.includes(active)||key.includes(LEGACY_KEY);if(key.startsWith(RECOVERY_BACKUP_PREFIX))return key.includes(active)|| (!!u&&key.includes(u));return false;}
function labelForKey(key){if(key===activeKey())return '현재 기기 상태';if(key===LEGACY_KEY)return '구버전 로컬 상태';if(key.startsWith('garang_sync_backup_v2::'))return '동기화 이전 백업';if(key.startsWith('garang_state_backup_v3::'))return '기기 롤링 백업';if(key.startsWith('garang_cloud_recovery_backup_v3::'))return '클라우드 롤링 백업';if(key.startsWith('garang_cloud_recovery_backup_v2::'))return '클라우드 최초 백업';if(key.startsWith('garang_import_backup_v2::'))return '가져오기 이전 백업';if(key.startsWith('garang_state_recovery_backup_v1::'))return '상태 복구 백업';if(key.startsWith(RECOVERY_BACKUP_PREFIX))return '복구 실행 이전 백업';return '로컬 백업';}
function localCandidates(u){const out=[];for(const key of keys()){if(!sameAccountBackupKey(key,u))continue;const hit=candidate(labelForKey(key),'local',key,read(key),key===activeKey()?u:null);if(hit)out.push(hit);}return out.sort((a,b)=>b.stamp-a.stamp);}
function combineHistory(baseInput,candidates,history,u){let out=sanitize(baseInput,u)||{};out.meta=out.meta&&typeof out.meta==='object'?out.meta:{};out.meta.syncOwnerUid=u||out.meta.syncOwnerUid||null;const safeTombstones=rows(out.meta.syncTombstones).filter(t=>!PROTECTED.includes(String(t.domain||''))||t.explicit===true);out.meta.syncTombstones=safeTombstones;
  for(const domain of PROTECTED){let merged=rows(out[domain]);for(const item of candidates){const list=rows(item?.state?.[domain]);if(History?.mergeRows)merged=History.mergeRows(domain,merged,list,out);else merged=[...merged,...list];}if(History?.mergeRows)merged=History.mergeRows(domain,merged,rows(history?.[domain]),out);out[domain]=merged;}
  return sanitize(out,u)||out;
}
function bestPrimary(candidates,u){const active=candidates.find(x=>x.key===activeKey());if(active)return active.state;const cloud=candidates.find(x=>x.type==='cloud-state');if(cloud)return cloud.state;return candidates.slice().sort((a,b)=>b.stamp-a.stamp)[0]?.state||{};}
async function readCloud(u){const result={candidates:[],history:Object.fromEntries(PROTECTED.map(d=>[d,[]])),errors:[]};if(!u||!window.firebase?.apps?.length)return result;const db=window.firebase.firestore(),user=db.collection('users').doc(u);
  try{const snap=await user.collection('app').doc('state').get();if(snap?.exists){const c=candidate('클라우드 현재 상태','cloud-state','users/app/state',snap.data(),u);if(c)result.candidates.push(c);}}catch(error){result.errors.push(`클라우드 상태: ${error?.code||error?.message||'확인 실패'}`);}
  for(const domain of PROTECTED){try{const col=user.collection(History.COLLECTIONS[domain]),snap=await col.get(),docs=Array.isArray(snap?.docs)?snap.docs:[];result.history[domain]=docs.map(doc=>History.recordFromDoc(doc.data())).filter(Boolean);}catch(error){result.errors.push(`${domain}: ${error?.code||error?.message||'확인 실패'}`);}}
  try{const snap=await user.collection('recoverySnapshots').get(),docs=Array.isArray(snap?.docs)?snap.docs:[];for(const doc of docs.slice(-30)){const data=doc.data(),state=data?.shell||data?.state||data?.payload||null;if(!state)continue;const c=candidate('클라우드 복구 스냅샷','cloud-backup',doc.id,state,u);if(c)result.candidates.push(c);}}catch(error){result.errors.push(`복구 스냅샷: ${error?.code||error?.message||'확인 실패'}`);}
  return result;
}
async function scanData(){const u=authUid(),local=localCandidates(u),cloud=await readCloud(u),all=[...local,...cloud.candidates],primary=bestPrimary(all,u),recovered=combineHistory(primary,all,cloud.history,u),current=candidate('현재 상태','current',activeKey(),read(activeKey()),u)?.state||sanitize(primary,u)||{};return {uid:u,activeKey:activeKey(),local,cloudCandidates:cloud.candidates,history:cloud.history,errors:cloud.errors,all,current,recovered,currentCounts:counts(current),recoveredCounts:counts(recovered),scannedAt:new Date().toISOString()};}
function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function countText(c){return `운동 ${c.workouts} · 식단 ${c.meals} · 러닝 ${c.runs} · 신체 ${c.body}`;}
function sourceRows(report){const historyCounts={workouts:rows(report.history.workouts).length,meals:rows(report.history.meals).length,runs:rows(report.history.runs).length,body:rows(report.history.body).length};historyCounts.total=PROTECTED.reduce((sum,d)=>sum+historyCounts[d],0);const list=[...report.all];if(historyCounts.total)list.push({label:'클라우드 장기 기록',type:'cloud-history',counts:historyCounts,stamp:0});const unique=[];const seen=new Set();for(const item of list){const key=`${item.type}|${item.key||item.label}|${item.counts.total}`;if(seen.has(key))continue;seen.add(key);unique.push(item);}return unique.sort((a,b)=>(b.counts?.total||0)-(a.counts?.total||0)).slice(0,20);}

function ensureStyle(){
  if(document.getElementById('garang-data-recovery-v31-style'))return;
  const style=document.createElement('style');style.id='garang-data-recovery-v31-style';style.textContent=`
  html.garang-recovery-open,html.garang-recovery-open body{overflow:hidden!important}
  .garang-data-recovery-modal{position:fixed;inset:0;z-index:12050;background:rgba(0,0,0,.78);display:grid;place-items:end center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));box-sizing:border-box;overscroll-behavior:contain;touch-action:pan-y;pointer-events:auto}
  .garang-data-recovery-panel{width:min(680px,100%);max-height:calc(100dvh - max(28px,env(safe-area-inset-top,0px)) - max(24px,env(safe-area-inset-bottom,0px)));overflow:auto;-webkit-overflow-scrolling:touch;background:#0b0d0b;border:1px solid #2a2e29;border-radius:18px;padding:16px;color:#ecefe9;box-sizing:border-box;box-shadow:0 20px 80px rgba(0,0,0,.5);touch-action:pan-y;pointer-events:auto}
  .garang-data-recovery-head{display:flex;justify-content:space-between;align-items:center;gap:12px;position:sticky;top:-16px;z-index:2;background:#0b0d0b;padding:16px 0 10px}
  .garang-data-recovery-head small{color:#68bca5;letter-spacing:.1em}.garang-data-recovery-head h2{margin:4px 0 0;font-size:19px}.garang-data-recovery-close{width:38px;height:38px;border:1px solid #2c312d;border-radius:50%;background:#101310;color:#eee;font-size:24px;line-height:1;display:grid;place-items:center;touch-action:manipulation}
  .garang-data-recovery-copy{margin:6px 0 12px;color:#a6aca5;font-size:12px;line-height:1.55;word-break:keep-all}
  .garang-data-recovery-counts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.garang-data-recovery-count{padding:10px;border:1px solid #252824;border-radius:11px;min-width:0}.garang-data-recovery-count.safe{border-color:#35594f}.garang-data-recovery-count small{display:block;color:#8e948c;font-size:9px}.garang-data-recovery-count.safe small{color:#68bca5}.garang-data-recovery-count b{display:block;margin-top:4px;font-size:11px;line-height:1.5}
  .garang-data-recovery-source{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid #252824}.garang-data-recovery-source b{display:block;color:#f3f1eb;font-size:11px}.garang-data-recovery-source small{color:#8e948c;font-size:9px}.garang-data-recovery-source>small{text-align:right;color:#b8bdb7;line-height:1.45}
  .garang-data-recovery-errors{margin-top:10px;padding:9px;border:1px solid #573d33;border-radius:10px;color:#d6a38f;font-size:10px;line-height:1.5}
  .garang-data-recovery-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px}.garang-data-recovery-actions button{min-height:42px;padding:9px 10px;border-radius:10px;border:1px solid #38403a;background:#171a17;color:#eee;font-size:10px;font-weight:600;touch-action:manipulation;pointer-events:auto}.garang-data-recovery-actions [data-recovery-restore]{grid-column:1/-1;border-color:transparent;background:#62b89f;color:#06110d}.garang-data-recovery-actions [data-recovery-restore]:disabled{background:#343834;color:#8b908a}.garang-data-recovery-actions [data-recovery-restore][data-confirming="true"]{background:#d8c58d;color:#17140b}
  .garang-data-recovery-status{min-height:17px;margin:9px 0 0;color:#9ca39d;font-size:10px;line-height:1.5}.garang-data-recovery-note{margin:8px 0 0;color:#777f78;font-size:9px;line-height:1.5}
  @media(min-width:801px){.garang-data-recovery-modal{place-items:center}.garang-data-recovery-panel{padding:18px}.garang-data-recovery-head{top:-18px;padding-top:18px}.garang-data-recovery-actions{grid-template-columns:1fr 1fr 1.4fr}.garang-data-recovery-actions [data-recovery-restore]{grid-column:auto}}
  `;document.head.appendChild(style);
}
function closeModal(){
  document.querySelector('.garang-data-recovery-modal')?.remove();
  document.documentElement.classList.remove('garang-recovery-open');
  const target=lastTrigger;lastTrigger=null;
  if(target?.isConnected)requestAnimationFrame(()=>target.focus({preventScroll:true}));
}
function resetRestoreButton(button){
  if(!button?.isConnected||button.disabled)return;
  button.dataset.confirming='false';
  button.textContent='누락 기록 안전 복구';
  const status=button.closest('.garang-data-recovery-panel')?.querySelector('[data-recovery-status]');
  if(status)status.textContent='';
}
function requestRestore(report,button){
  if(!button||button.disabled)return;
  if(button.dataset.confirming!=='true'){
    button.dataset.confirming='true';
    button.textContent='한 번 더 눌러 복구 실행';
    const status=button.closest('.garang-data-recovery-panel')?.querySelector('[data-recovery-status]');
    if(status)status.textContent=`현재 ${report.currentCounts.total}개 기록에서 최대 ${report.recoveredCounts.total}개 기록으로 안전 병합합니다. 한 번 더 누르면 실행됩니다.`;
    clearTimeout(button.__confirmTimer);button.__confirmTimer=setTimeout(()=>resetRestoreButton(button),6000);
    return;
  }
  clearTimeout(button.__confirmTimer);restoreReport(report,button);
}
function renderReport(report){
  lastReport=report;closeModal();ensureStyle();
  const recoverable=report.recoveredCounts.total>report.currentCounts.total,modal=document.createElement('div');
  modal.className='garang-data-recovery-modal';
  const rowsHtml=sourceRows(report).map(item=>`<div class="garang-data-recovery-source"><span><b>${esc(item.label)}</b><small>${esc(item.type)}</small></span><small>${esc(countText(item.counts))}</small></div>`).join('');
  const errors=report.errors.length?`<div class="garang-data-recovery-errors">일부 확인 실패: ${report.errors.map(esc).join(' · ')}</div>`:'';
  modal.innerHTML=`<section class="garang-data-recovery-panel" role="dialog" aria-modal="true" aria-label="GARANG 데이터 복구 센터"><div class="garang-data-recovery-head"><div><small>DATA HEALTH</small><h2>데이터 복구 센터</h2></div><button type="button" class="garang-data-recovery-close" data-recovery-close aria-label="닫기">×</button></div><p class="garang-data-recovery-copy">현재 계정의 기기 저장소, 같은 계정 백업, 클라우드 상태, 장기 기록과 복구 스냅샷을 확인했습니다. 스캔만으로 원본을 변경하지 않습니다.</p><div class="garang-data-recovery-counts"><div class="garang-data-recovery-count"><small>현재 화면 기준</small><b>${esc(countText(report.currentCounts))}</b></div><div class="garang-data-recovery-count safe"><small>안전 병합 가능</small><b>${esc(countText(report.recoveredCounts))}</b></div></div><div>${rowsHtml||'<div class="garang-data-recovery-copy">확인 가능한 저장 소스가 없습니다.</div>'}</div>${errors}<div class="garang-data-recovery-actions"><button type="button" data-recovery-rescan>다시 확인</button><button type="button" data-recovery-export>현재 백업 내보내기</button><button type="button" data-recovery-restore ${recoverable?'':'disabled'}>${recoverable?'누락 기록 안전 복구':'추가 복구 기록 없음'}</button></div><div class="garang-data-recovery-status" data-recovery-status aria-live="polite"></div><p class="garang-data-recovery-note">복구 시 현재 상태와 클라우드 상태를 먼저 별도 백업한 뒤, 운동·식단·러닝·신체 기록만 비파괴 병합합니다.</p></section>`;
  document.documentElement.classList.add('garang-recovery-open');document.body.appendChild(modal);
  modal.querySelector('[data-recovery-close]').onclick=closeModal;
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  modal.querySelector('[data-recovery-rescan]').onclick=()=>openRecoveryCenter({preserveFocus:true});
  modal.querySelector('[data-recovery-export]').onclick=()=>window.GarangSyncDurabilityRuntime?.exportVerifiedBackup?.();
  const restore=modal.querySelector('[data-recovery-restore]');if(recoverable)restore.onclick=()=>requestRestore(report,restore);
  requestAnimationFrame(()=>modal.querySelector('[data-recovery-close]')?.focus({preventScroll:true}));
}
async function openRecoveryCenter(options={}){
  if(!options.preserveFocus)lastTrigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
  closeModal();toast('저장된 기록을 안전하게 확인하고 있습니다.');
  try{const report=await scanData();renderReport(report);}catch(error){console.warn('[GARANG] recovery scan failed',error);toast('데이터 확인 중 오류가 발생했습니다. 원본은 변경하지 않았습니다.');}
}
async function guardedPersistHistory(db,u,state){let out=clone(state);for(const domain of PROTECTED){const collection=db.collection('users').doc(u).collection(History.COLLECTIONS[domain]),final=[];for(let offset=0;offset<rows(out[domain]).length;offset+=25){const chunk=rows(out[domain]).slice(offset,offset+25),checked=await Promise.all(chunk.map(async row=>{const local=History.normalizeRecord(domain,row,u),ref=collection.doc(encodeURIComponent(local.id)),snap=await ref.get(),remote=snap.exists?History.recordFromDoc(snap.data()):null;return {local,remote,ref};}));for(const item of checked){if(item.remote&&History.rowStamp(item.remote)>History.rowStamp(item.local)){final.push(item.remote);continue;}await item.ref.set(History.docPayload(domain,item.local,u),{merge:false});final.push(item.local);}}out[domain]=History.mergeRows(domain,[],final,out);}return out;}
async function restoreReport(report,button){
  if(!report||report!==lastReport)return;const before=report.currentCounts,after=report.recoveredCounts;if(after.total<=before.total)return toast('추가로 복구할 기록이 없습니다.');
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
  if(button.dataset.garangSafeImport==='v3.1')return;
  button.dataset.garangSafeImport='v3.1';button.onclick=()=>openRecoveryCenter();
}
function queueBinding(){if(bindingQueued)return;bindingQueued=true;requestAnimationFrame(()=>{bindingQueued=false;bindSettingsButton();});}
function startBinding(){ensureStyle();bindSettingsButton();const main=document.getElementById('main');if(!main||observer)return;observer=new MutationObserver(queueBinding);observer.observe(main,{childList:true,subtree:true});}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.garang-data-recovery-modal'))closeModal();});
setTimeout(startBinding,0);window.addEventListener('load',startBinding,{once:true});
window.GarangDataMigrationV2=Object.freeze({version:'v3.1',importLegacy:openRecoveryCenter,openRecoveryCenter,closeRecoveryCenter:closeModal,scanData,counts,combineHistory,activeKey});
})();
