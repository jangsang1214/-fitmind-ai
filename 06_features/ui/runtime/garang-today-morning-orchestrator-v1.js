/* GARANG Today Morning Orchestrator v1
   One quiet Today surface: STATE -> GARANG DECISION -> NEXT.
   Morning check-in owns NEXT before recovery context exists; three-track details stay progressive.
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

  function state(){
    try{return bridge()?.getLiveState?.()||bridge()?.getState?.()||null;}catch{return null;}
  }

  function todayCheckin(s,date){
    return [...list(s?.dailyCheckins),...list(s?.checkins)].filter(row=>sameDate(row,date)).at(-1)||null;
  }

  function domainOf(item,index=0){
    const explicit=String(item?.domain||'').toLowerCase();
    if(['training','recovery','nutrition'].includes(explicit))return explicit;
    const type=String(item?.type||'').toLowerCase();
    if(type==='recovery')return 'recovery';
    if(type==='nutrition'||type==='meal')return 'nutrition';
    if(['workout','running','run'].includes(type))return 'training';
    return ['training','recovery','nutrition'][index]||'training';
  }

  function normalizeTrack(item,domain,index=0){
    if(!item)return {domain,title:'',duration:null,intensityScale:null};
    return {domain:domain||domainOf(item,index),title:String(item.title||item.name||'').trim(),duration:finite(item.duration),intensityScale:finite(item.intensityScale)};
  }

  function draftGroup(s,date){
    const group=s?.meta?.dailyPlanDrafts?.[date];
    return group&&typeof group==='object'?group:null;
  }

  function confirmedPlans(s,date){
    return list(s?.planner).filter(row=>sameDate(row,date)&&String(row?.status||'confirmed').toLowerCase()!=='draft');
  }

  function currentTracks(s,date){
    const group=draftGroup(s,date),out=new Map();
    if(group&&Array.isArray(group.items))group.items.forEach((item,index)=>{const domain=domainOf(item,index);if(!out.has(domain))out.set(domain,normalizeTrack(item,domain,index));});
    confirmedPlans(s,date).forEach((item,index)=>{const domain=domainOf(item,index);if(!out.has(domain)||group?.status==='confirmed')out.set(domain,normalizeTrack(item,domain,index));});
    return ['training','recovery','nutrition'].map(domain=>out.get(domain)||normalizeTrack(null,domain));
  }

  function snapshotBaseline(){
    const m=main(),s=state(),date=dateKey();
    if(m?.dataset.garangScreen!=='today'||!s||todayCheckin(s,date))return;
    try{
      if(sessionStorage.getItem(baselineKey(date)))return;
      const group=draftGroup(s,date);
      sessionStorage.setItem(baselineKey(date),JSON.stringify({date,at:new Date().toISOString(),revision:Number(group?.revision)||1,status:String(group?.status||''),tracks:currentTracks(s,date)}));
    }catch{}
  }

  function readBaseline(date){
    try{const raw=sessionStorage.getItem(baselineKey(date));return raw?JSON.parse(raw):null;}catch{return null;}
  }

  function changed(a,b){
    if(!a||!b)return false;
    return String(a.title||'')!==String(b.title||'')||finite(a.duration)!==finite(b.duration)||finite(a.intensityScale)!==finite(b.intensityScale);
  }

  function trackLabel(domain){
    if(english())return {training:'Training',recovery:'Recovery',nutrition:'Nutrition'}[domain]||domain;
    return {training:'운동',recovery:'회복',nutrition:'식단'}[domain]||domain;
  }

  function compactChange(before,after,isChanged,confirmedLocked){
    if(confirmedLocked)return english()?'Kept':'확정 유지';
    if(!isChanged)return english()?'Reflected':'반영';
    const beforeDuration=finite(before?.duration),afterDuration=finite(after?.duration);
    if(beforeDuration!==null&&afterDuration!==null&&beforeDuration!==afterDuration){
      const delta=Math.round(afterDuration-beforeDuration);
      return `${delta>0?'+':''}${delta}${english()?' min':'분'}`;
    }
    const beforeIntensity=finite(before?.intensityScale),afterIntensity=finite(after?.intensityScale);
    if(beforeIntensity!==null&&afterIntensity!==null&&beforeIntensity!==afterIntensity)return afterIntensity>beforeIntensity?(english()?'Intensity ↑':'강도 ↑'):(english()?'Intensity ↓':'강도 ↓');
    const title=String(after?.title||'').trim();
    if(title)return title.length>22?`${title.slice(0,22)}…`:title;
    return english()?'Adjusted':'조정';
  }

  function injectStyle(){
    if(document.getElementById('garangTodayMorningOrchestratorStyle'))return;
    const style=document.createElement('style');style.id='garangTodayMorningOrchestratorStyle';style.textContent=`
#main[data-garang-screen="today"][data-gto="1"]>#garangCoreToday{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-context{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow{padding-top:4px!important;margin-bottom:12px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-state{padding:8px 0 18px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision{padding:26px 0 18px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision>span{margin-bottom:9px!important;font-size:7px!important;letter-spacing:.17em!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision>p{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-disclosure{margin-top:8px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-action{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{margin:0!important;border-radius:0!important;box-shadow:none!important;transition:opacity .18s ease,border-color .18s ease!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px 18px!important;align-items:end!important;min-height:56px!important;padding:18px 0!important;border:0!important;border-top:1px solid rgba(242,239,233,.1)!important;border-bottom:1px solid rgba(242,239,233,.1)!important;background:transparent!important;color:#f2efe9!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>span{grid-column:1 / -1;color:#78aa99!important;font-size:7px!important;letter-spacing:.17em!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>strong{font-family:Georgia,'Noto Serif KR','Apple SD Gothic Neo',serif!important;font-size:16px!important;font-weight:500!important;line-height:1.45!important;color:#f2efe9!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>small{font-size:8px!important;line-height:1.4!important;color:rgba(242,239,233,.38)!important;text-align:right!important;white-space:nowrap!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;min-height:44px!important;padding:9px 0 11px!important;border:0!important;background:transparent!important;color:rgba(242,239,233,.38)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access>span{font-size:7px!important;letter-spacing:.12em!important;color:#78aa99!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access>strong{font-size:9px!important;font-weight:500!important;color:rgba(242,239,233,.5)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access>small{font-size:8px!important;color:rgba(242,239,233,.28)!important}
.gto-impact{margin:0 0 14px;border-top:1px solid rgba(242,239,233,.07);border-bottom:1px solid rgba(242,239,233,.07);background:transparent}
.gto-impact[data-state="pending"]{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;margin-top:-2px}
.gto-impact[data-state="pending"]>span{font-size:7px;font-weight:600;letter-spacing:.15em;color:#78aa99;white-space:nowrap}
.gto-impact[data-state="pending"]>strong{font-size:9px;font-weight:500;line-height:1.45;text-align:right;color:rgba(242,239,233,.36);word-break:keep-all}
.gto-impact[data-state="complete"]{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:16px;padding:11px 0}
.gto-impact-label{font-size:7px;font-weight:600;letter-spacing:.15em;color:#78aa99;white-space:nowrap}
.gto-impact-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-width:0}
.gto-impact-chip{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0;padding:0 12px;border-left:1px solid rgba(242,239,233,.06)}
.gto-impact-chip:first-child{border-left:0;padding-left:0}.gto-impact-chip:last-child{padding-right:0}
.gto-impact-chip>span{font-size:8px;font-weight:500;color:rgba(242,239,233,.36);white-space:nowrap}.gto-impact-chip>strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:500;color:rgba(242,239,233,.64)}
.gto-impact-chip[data-change="changed"]>strong{color:#ad715b}.gto-impact-chip[data-change="stable"]>strong{color:#78aa99}
@media(max-width:600px){#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision{padding:22px 0 16px!important}#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access{grid-template-columns:minmax(0,1fr)!important;min-height:64px!important;padding:16px 0!important}#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="precheckin"] .gtf-checkin-access>small{grid-column:1!important;text-align:left!important;white-space:normal!important}.gto-impact[data-state="pending"]{display:grid;gap:4px}.gto-impact[data-state="pending"]>strong{text-align:left}.gto-impact[data-state="complete"]{grid-template-columns:1fr;gap:8px}.gto-impact-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.gto-impact-chip{display:grid;gap:3px;padding:0 8px}.gto-impact-chip>strong{font-size:8px}}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{transition:none!important}}
`;document.head.appendChild(style);
  }

  function updateCheckinControl(checkin){
    const f=flow();if(!f)return null;
    try{window.GarangNonblockingActions?.promoteTodayCheckin?.();}catch{}
    const access=f.querySelector('[data-garang-checkin-access="1"]');
    if(!access)return f.querySelector('.gtf-next[data-gtf-action="open-checkin"]');
    const checked=!!checkin,hour=new Date().getHours(),morning=hour>=5&&hour<12;
    const sleep=finite(checkin?.sleepHours??checkin?.sleep),energy=finite(checkin?.energy);
    const summary=checked?[sleep!==null?(english()?`Sleep ${sleep}h`:`수면 ${sleep}h`):'',energy!==null?(english()?`Energy ${energy}/5`:`에너지 ${energy}/5`):''].filter(Boolean).join(' · '):'';
    access.dataset.gtoPriority=checked?'0':'1';
    access.setAttribute('aria-label',checked?(english()?'Edit today state':'오늘 상태 수정'):(english()?'Check in for today':'오늘 상태 체크인'));
    access.innerHTML=checked
      ?`<span>STATE UPDATED</span><strong>${english()?'Edit state':'상태 수정'}</strong><small>${esc(summary||(english()?'Saved':'저장됨'))}</small>`
      :`<span>${morning?'MORNING CHECK-IN':'CHECK-IN'}</span><strong>${english()?(morning?'Good morning. Tell GARANG how you are today.':'Tell GARANG how you are today.'):(morning?'좋은 아침입니다. 오늘 상태를 알려주세요.':'오늘 상태를 알려주세요.')}</strong><small>${english()?'30 sec · GARANG adjusts all 3 tracks':'30초 · 운동 · 회복 · 식단 자동 조정'}</small>`;
    return access;
  }

  function impactMarkup(s,date,checkin){
    const group=draftGroup(s,date),confirmed=confirmedPlans(s,date),current=currentTracks(s,date),baseline=readBaseline(date),checked=!!checkin;
    if(!checked)return `<section class="gto-impact" data-gto-impact="1" data-state="pending"><span>AFTER CHECK-IN</span><strong>${english()?'Training · recovery · nutrition adjust together after one check-in.':'체크인 후 운동 · 회복 · 식단을 한 번에 다시 맞춥니다.'}</strong></section>`;
    const baselineMap=new Map(list(baseline?.tracks).map(track=>[track.domain,track])),revision=Number(group?.revision)||1,confirmedLocked=confirmed.length>0&&(!group||group.status==='confirmed');
    const chips=current.map(track=>{
      const before=baselineMap.get(track.domain),isChanged=!!before&&changed(before,track),value=compactChange(before,track,isChanged,confirmedLocked);
      return `<div class="gto-impact-chip" data-domain="${track.domain}" data-change="${isChanged?'changed':'stable'}"><span>${trackLabel(track.domain)}</span><strong>${esc(value)}</strong></div>`;
    }).join('');
    return `<section class="gto-impact" data-gto-impact="1" data-state="complete" data-revision="${revision}"><span class="gto-impact-label">TODAY ADJUSTMENT</span><div class="gto-impact-strip">${chips}</div></section>`;
  }

  function render(){
    timer=null;injectStyle();const m=main(),f=flow();if(!m||m.dataset.garangScreen!=='today'||!f)return;
    const s=state();if(!s)return;const date=dateKey(),checkin=todayCheckin(s,date),checked=!!checkin;
    m.dataset.gto='1';f.dataset.gtoChecked=checked?'1':'0';f.dataset.gtoPhase=checked?'checked':'precheckin';
    const label=f.querySelector('.gtf-decision>span');if(label)label.textContent=checked?'GARANG DECISION · CHECK-IN REFLECTED':'GARANG DECISION';
    const access=updateCheckinControl(checkin),stateNode=f.querySelector('.gtf-state'),decision=f.querySelector('.gtf-decision'),action=f.querySelector('.gtf-action');
    if(access&&access.classList.contains('gtf-checkin-access')){
      if(checked&&stateNode)stateNode.insertAdjacentElement('afterend',access);
      else if(!checked&&decision)decision.insertAdjacentElement('afterend',access);
    }
    const previous=f.querySelector('[data-gto-impact="1"]');previous?.remove();
    const host=document.createElement('div');host.innerHTML=impactMarkup(s,date,checkin);const node=host.firstElementChild;
    if(node){
      if(checked&&action)action.insertAdjacentElement('beforebegin',node);
      else if(!checked&&access?.classList.contains('gtf-checkin-access'))access.insertAdjacentElement('afterend',node);
      else if(action)action.insertAdjacentElement('beforebegin',node);
      else decision?.insertAdjacentElement('afterend',node);
    }
  }

  function schedule(delay=120){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(render)),delay);}

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-garang-checkin-access="1"],.gtf-next[data-gtf-action="open-checkin"],[data-action="open-checkin"]');
    if(target&&main()?.dataset.garangScreen==='today')snapshotBaseline();
  },true);
  ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:agent-write','garang:route-completed'].forEach(name=>window.addEventListener(name,()=>schedule(name==='garang:state-updated'?180:100)));
  window.addEventListener('pageshow',()=>schedule(80));

  window.GarangTodayMorningOrchestratorV1=Object.freeze({version:VERSION,render,schedule,snapshotBaseline});
  schedule(120);
})();
