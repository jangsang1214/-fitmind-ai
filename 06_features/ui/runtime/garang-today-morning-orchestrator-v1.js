/* GARANG Today Morning Orchestrator v1.2
   One quiet Today surface: VISUAL STATE -> GARANG DECISION -> NEXT.
   Check-in owns NEXT before recovery context exists; its effect is reflected inside the three-track visual instead of another text section.
   Read-only UI orchestration only. Canonical check-in and plan writes remain owned by app.js / Daily Plan.
*/
(() => {
  'use strict';
  if (window.GarangTodayMorningOrchestratorV1) return;

  const VERSION='1.1.1';
  const main=()=>document.getElementById('main');
  const flow=()=>main()?.querySelector('#garangTodayFlow');
  const bridge=()=>window.GarangAgentStateBridge;
  const list=value=>Array.isArray(value)?value:[];
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const pad=value=>String(value).padStart(2,'0');
  const dateKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const sameDate=(row,date)=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;
  const english=()=>document.documentElement.lang==='en';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const baselineKey=date=>`garang_today_checkin_baseline_v1:${date}`;
  let timer=null;

  function state(){try{return bridge()?.getLiveState?.()||bridge()?.getState?.()||null;}catch{return null;}}
  function todayCheckin(s,date){return [...list(s?.dailyCheckins),...list(s?.checkins)].filter(row=>sameDate(row,date)).at(-1)||null;}
  function domainOf(item,index=0){const explicit=String(item?.domain||'').toLowerCase();if(['training','recovery','nutrition'].includes(explicit))return explicit;const type=String(item?.type||'').toLowerCase();if(type==='recovery')return'recovery';if(type==='nutrition'||type==='meal')return'nutrition';if(['workout','running','run'].includes(type))return'training';return ['training','recovery','nutrition'][index]||'training';}
  function normalizeTrack(item,domain,index=0){if(!item)return {domain,title:'',duration:null,intensityScale:null};return {domain:domain||domainOf(item,index),title:String(item.title||item.name||'').trim(),duration:finite(item.duration),intensityScale:finite(item.intensityScale)};}
  function draftGroup(s,date){const group=s?.meta?.dailyPlanDrafts?.[date];return group&&typeof group==='object'?group:null;}
  function confirmedPlans(s,date){return list(s?.planner).filter(row=>sameDate(row,date)&&String(row?.status||'confirmed').toLowerCase()!=='draft');}
  function currentTracks(s,date){const group=draftGroup(s,date),out=new Map();if(group&&Array.isArray(group.items))group.items.forEach((item,index)=>{const domain=domainOf(item,index);if(!out.has(domain))out.set(domain,normalizeTrack(item,domain,index));});confirmedPlans(s,date).forEach((item,index)=>{const domain=domainOf(item,index);if(!out.has(domain)||group?.status==='confirmed')out.set(domain,normalizeTrack(item,domain,index));});return ['training','recovery','nutrition'].map(domain=>out.get(domain)||normalizeTrack(null,domain));}

  function snapshotBaseline(){
    const m=main(),s=state(),date=dateKey();if(m?.dataset.garangScreen!=='today'||!s||todayCheckin(s,date))return;
    try{if(sessionStorage.getItem(baselineKey(date)))return;const group=draftGroup(s,date);sessionStorage.setItem(baselineKey(date),JSON.stringify({date,at:new Date().toISOString(),revision:Number(group?.revision)||1,status:String(group?.status||''),tracks:currentTracks(s,date)}));}catch{}
  }
  function readBaseline(date){try{const raw=sessionStorage.getItem(baselineKey(date));return raw?JSON.parse(raw):null;}catch{return null;}}
  function changed(a,b){if(!a||!b)return false;return String(a.title||'')!==String(b.title||'')||finite(a.duration)!==finite(b.duration)||finite(a.intensityScale)!==finite(b.intensityScale);}
  function compactChange(before,after,isChanged,confirmedLocked){
    if(confirmedLocked)return english()?'KEPT':'유지';
    if(!isChanged)return english()?'REFLECTED':'반영';
    const beforeDuration=finite(before?.duration),afterDuration=finite(after?.duration);if(beforeDuration!==null&&afterDuration!==null&&beforeDuration!==afterDuration){const delta=Math.round(afterDuration-beforeDuration);return `${delta>0?'+':''}${delta}${english()?'m':'분'}`;}
    const beforeIntensity=finite(before?.intensityScale),afterIntensity=finite(after?.intensityScale);if(beforeIntensity!==null&&afterIntensity!==null&&beforeIntensity!==afterIntensity)return afterIntensity>beforeIntensity?(english()?'INTENSITY ↑':'강도 ↑'):(english()?'INTENSITY ↓':'강도 ↓');
    return english()?'ADJUSTED':'조정';
  }

  function injectStyle(){
    if(document.getElementById('garangTodayMorningOrchestratorStyle'))return;
    const style=document.createElement('style');style.id='garangTodayMorningOrchestratorStyle';style.textContent=`
#main[data-garang-screen="today"][data-gto="1"]>#garangCoreToday{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-context{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow{margin-bottom:10px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision>p{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-disclosure{margin-top:7px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-action{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{margin:0!important;border-radius:10px!important;box-shadow:none!important;transition:opacity .18s ease,border-color .18s ease,background .18s ease!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:5px 14px!important;align-items:center!important;min-height:52px!important;padding:10px 13px!important;border:1px solid rgba(242,239,233,.11)!important;background:rgba(242,239,233,.018)!important;color:#f2efe9!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>span{grid-column:1!important;grid-row:1!important;color:#78aa99!important;font-size:7px!important;letter-spacing:.16em!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>strong{grid-column:1!important;grid-row:2!important;font-size:12px!important;font-weight:600!important;line-height:1.25!important;color:#f2efe9!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>small{grid-column:2!important;grid-row:1/3!important;font-size:8px!important;line-height:1.35!important;color:rgba(242,239,233,.38)!important;text-align:right!important;white-space:nowrap!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access:after{content:"→";grid-column:3!important;grid-row:1/3!important;display:grid;place-items:center;width:26px;height:26px;border:1px solid rgba(120,170,153,.24);border-radius:50%;color:#78aa99;font-size:11px}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;min-height:38px!important;padding:6px 0 8px!important;border:0!important;border-radius:0!important;background:transparent!important;color:rgba(242,239,233,.38)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access>span{font-size:7px!important;letter-spacing:.12em!important;color:#78aa99!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access>strong{font-size:9px!important;font-weight:600!important;color:rgba(242,239,233,.52)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access>small{font-size:8px!important;color:rgba(242,239,233,.3)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access:after{content:"↗";margin-left:auto;color:rgba(120,170,153,.55);font-size:10px}
@media(max-width:600px){#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access{grid-template-columns:minmax(0,1fr) auto auto!important;min-height:54px!important;padding:10px 11px!important}#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>small{max-width:92px!important;white-space:normal!important}}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{transition:none!important}}
`;document.head.appendChild(style);
  }

  function updateCheckinControl(checkin){
    const f=flow();if(!f)return null;try{window.GarangNonblockingActions?.promoteTodayCheckin?.();}catch{}
    const access=f.querySelector('[data-garang-checkin-access="1"]');if(!access)return f.querySelector('.gtf-next[data-gtf-action="open-checkin"]');
    const checked=!!checkin,hour=new Date().getHours(),morning=hour>=5&&hour<12,sleep=finite(checkin?.sleepHours??checkin?.sleep),energy=finite(checkin?.energy),summary=checked?[sleep!==null?(english()?`Sleep ${sleep}h`:`수면 ${sleep}h`):'',energy!==null?(english()?`Energy ${energy}/5`:`에너지 ${energy}/5`):''].filter(Boolean).join(' · '):'';
    access.dataset.gtoPriority=checked?'0':'1';access.setAttribute('aria-label',checked?(english()?'Edit today state':'오늘 상태 수정'):(english()?'Check in for today':'오늘 상태 체크인'));
    access.innerHTML=checked
      ?`<span>STATE</span><strong>${english()?'Edit':'수정'}</strong><small>${esc(summary||(english()?'Saved':'저장됨'))}</small>`
      :`<span>${morning?'MORNING':'CHECK-IN'}</span><strong>${english()?'Today check-in':'오늘 상태 체크인'}</strong><small>${english()?'30 sec · 3 tracks':'30초 · 3영역 자동 조정'}</small>`;
    return access;
  }

  function decorateTracks(s,date,checkin){
    const f=flow();if(!f)return;const checked=!!checkin,group=draftGroup(s,date),confirmed=confirmedPlans(s,date),baseline=readBaseline(date),baselineMap=new Map(list(baseline?.tracks).map(track=>[track.domain,track])),current=currentTracks(s,date),currentMap=new Map(current.map(track=>[track.domain,track])),confirmedLocked=confirmed.length>0&&(!group||group.status==='confirmed');
    f.querySelectorAll('.gtf-track[data-domain]').forEach(node=>{
      const domain=node.dataset.domain,after=currentMap.get(domain),before=baselineMap.get(domain),isChanged=checked&&!!before&&changed(before,after),badge=node.querySelector('.gtf-track-badge');
      node.removeAttribute('data-change');if(!badge)return;if(!checked){badge.textContent='';return;}
      node.dataset.change=isChanged?'changed':'stable';badge.textContent=compactChange(before,after,isChanged,confirmedLocked);
    });
  }

  function render(){
    timer=null;injectStyle();const m=main(),f=flow();if(!m||m.dataset.garangScreen!=='today'||!f)return;const s=state();if(!s)return;const date=dateKey(),checkin=todayCheckin(s,date),checked=!!checkin;
    m.dataset.gto='1';f.dataset.gtoChecked=checked?'1':'0';f.dataset.gtoPhase=checked?'checked':'precheckin';
    const label=f.querySelector('.gtf-decision>span');if(label)label.textContent=checked?'GARANG DECISION · UPDATED':'GARANG DECISION';
    const access=updateCheckinControl(checkin),stateNode=f.querySelector('.gtf-state'),decision=f.querySelector('.gtf-decision');
    if(access&&access.classList.contains('gtf-checkin-access')){if(checked&&stateNode)stateNode.insertAdjacentElement('afterend',access);else if(!checked&&decision)decision.insertAdjacentElement('afterend',access);}
    f.querySelector('[data-gto-impact="1"]')?.remove();decorateTracks(s,date,checkin);
  }

  function schedule(delay=120){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(render)),delay);}
  document.addEventListener('click',event=>{const target=event.target.closest?.('[data-garang-checkin-access="1"],.gtf-next[data-gtf-action="open-checkin"],[data-action="open-checkin"]');if(target&&main()?.dataset.garangScreen==='today')snapshotBaseline();},true);
  ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:agent-write','garang:route-completed'].forEach(name=>window.addEventListener(name,()=>schedule(name==='garang:state-updated'?180:100)));
  window.addEventListener('pageshow',()=>schedule(80));
  window.GarangTodayMorningOrchestratorV1=Object.freeze({version:VERSION,render,schedule,snapshotBaseline});
  schedule(120);
})();