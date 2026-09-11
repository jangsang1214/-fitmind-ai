/* GARANG Today Morning Orchestrator v1
   One quiet Today surface: morning check-in -> GARANG decision -> three-track impact -> next action.
   Read-only UI orchestration only. Canonical check-in and plan writes remain owned by app.js / Daily Plan.
*/
(() => {
  'use strict';
  if (window.GarangTodayMorningOrchestratorV1) return;

  const VERSION='1.0.0';
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

  function fallbackTitle(domain){
    if(english())return {training:'Training direction',recovery:'Recovery direction',nutrition:'Nutrition direction'}[domain];
    return {training:'운동 방향',recovery:'회복 방향',nutrition:'식단 방향'}[domain];
  }

  function detailText(track){
    const parts=[];
    if(track?.title)parts.push(track.title);
    if(finite(track?.duration)!==null)parts.push(`${Math.round(Number(track.duration))}${english()?' min':'분'}`);
    return parts.join(' · ')||fallbackTitle(track?.domain);
  }

  function injectStyle(){
    if(document.getElementById('garangTodayMorningOrchestratorStyle'))return;
    const style=document.createElement('style');style.id='garangTodayMorningOrchestratorStyle';style.textContent=`
#main[data-garang-screen="today"][data-gto="1"]>#garangCoreToday{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-context{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow{padding-top:10px!important;margin-bottom:16px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-state{padding-bottom:15px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision{padding:30px 0 22px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision>span{margin-bottom:10px!important;font-size:7px!important;letter-spacing:.17em!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{min-height:0!important;grid-template-columns:92px minmax(0,1fr) auto!important;gap:12px!important;margin:18px 0 0!important;padding:14px 15px!important;border:1px solid rgba(242,239,233,.1)!important;border-radius:12px!important;background:rgba(242,239,233,.018)!important;transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-checked="0"] .gtf-checkin-access{background:#eeeae2!important;border-color:#eeeae2!important;color:#111210!important;box-shadow:0 10px 28px rgba(0,0,0,.16)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-checked="0"] .gtf-checkin-access>span{color:#477565!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-checked="0"] .gtf-checkin-access>strong{color:#111210!important;font-size:11px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-checked="0"] .gtf-checkin-access>small{color:rgba(17,18,16,.52)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-checked="0"] .gtf-action .gtf-next:not([data-gtf-action="open-checkin"]){background:transparent!important;border-color:rgba(242,239,233,.16)!important;color:rgba(242,239,233,.66)!important;box-shadow:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-checked="0"] .gtf-action .gtf-next:not([data-gtf-action="open-checkin"])>span{color:#78aa99!important}
.gto-impact{margin:0 0 18px;border-top:1px solid rgba(242,239,233,.07);border-bottom:1px solid rgba(242,239,233,.07);background:transparent}.gto-impact-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:13px 0 12px}.gto-impact-head>span{font-size:7px;font-weight:600;line-height:1.2;letter-spacing:.17em;color:#78aa99;white-space:nowrap}.gto-impact-head>strong{max-width:530px;font-size:10px;font-weight:500;line-height:1.55;text-align:right;color:rgba(242,239,233,.48);word-break:keep-all}.gto-impact-tracks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid rgba(242,239,233,.055)}.gto-impact-row{min-width:0;padding:13px 12px 14px 0;border-right:1px solid rgba(242,239,233,.055)}.gto-impact-row:last-child{padding-right:0;padding-left:12px;border-right:0}.gto-impact-row:nth-child(2){padding-left:12px}.gto-impact-row>span{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:7px;font-size:8px;font-weight:600;letter-spacing:.09em;color:rgba(242,239,233,.36)}.gto-impact-row>span>b{font-size:7px;font-weight:600;letter-spacing:.08em;color:#78aa99}.gto-impact-row>strong{display:block;min-height:30px;font-size:10px;font-weight:500;line-height:1.45;color:rgba(242,239,233,.72);word-break:keep-all}.gto-impact-row>small{display:block;margin-top:5px;font-size:8px;line-height:1.45;color:rgba(242,239,233,.31);word-break:keep-all}.gto-impact-row[data-change="changed"]>span>b{color:#ad715b}.gto-impact[data-state="pending"] .gto-impact-row>strong{min-height:auto;color:rgba(242,239,233,.42)}.gto-impact[data-state="pending"] .gto-impact-row>small{display:none}
@media(max-width:600px){#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-decision{padding:26px 0 20px!important}#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{grid-template-columns:74px minmax(0,1fr)!important;padding:13px 14px!important}#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>small{grid-column:2;text-align:left!important;max-width:none!important;margin-top:-4px}.gto-impact-head{display:grid;gap:6px}.gto-impact-head>strong{text-align:left}.gto-impact-tracks{display:block}.gto-impact-row,.gto-impact-row:nth-child(2),.gto-impact-row:last-child{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:8px;align-items:center;padding:11px 0!important;border-right:0;border-bottom:1px solid rgba(242,239,233,.05)}.gto-impact-row:last-child{border-bottom:0}.gto-impact-row>span{display:block;margin:0}.gto-impact-row>span>b{display:block;margin-top:3px}.gto-impact-row>strong{min-height:0}.gto-impact-row>small{margin:0;text-align:right;max-width:110px}}
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
      ?`<span>CHECK-IN COMPLETE</span><strong>${english()?'State reflected':'오늘 상태 반영 완료'}</strong><small>${esc(summary||(english()?'Saved':'저장됨'))}</small>`
      :`<span>${morning?'MORNING CHECK-IN':'CHECK-IN'}</span><strong>${english()?(morning?'Good morning. Tell GARANG how you are today.':'Tell GARANG how you are today.'):(morning?'좋은 아침입니다. 오늘 상태를 알려주세요.':'오늘 상태를 알려주세요.')}</strong><small>${english()?'30 sec · auto-adjust plan':'30초 · 계획 자동 조정'}</small>`;
    return access;
  }

  function impactMarkup(s,date,checkin){
    const group=draftGroup(s,date),confirmed=confirmedPlans(s,date),current=currentTracks(s,date),baseline=readBaseline(date),checked=!!checkin;
    if(!checked){
      const rows=current.map(track=>`<div class="gto-impact-row" data-domain="${track.domain}" data-change="pending"><span>${trackLabel(track.domain)}<b>${english()?'READY':'대기'}</b></span><strong>${english()?'Adjusts after check-in':'체크인 후 자동 보정'}</strong></div>`).join('');
      return `<section class="gto-impact" data-gto-impact="1" data-state="pending"><div class="gto-impact-head"><span>AFTER CHECK-IN</span><strong>${english()?'Training, recovery and nutrition are re-aligned from one check-in.':'한 번의 체크인으로 운동 · 회복 · 식단을 함께 다시 맞춥니다.'}</strong></div><div class="gto-impact-tracks">${rows}</div></section>`;
    }
    const baselineMap=new Map(list(baseline?.tracks).map(track=>[track.domain,track])),revision=Number(group?.revision)||1,adapted=!!baseline&&revision>(Number(baseline?.revision)||1),confirmedLocked=confirmed.length>0&&(!group||group.status==='confirmed');
    const summary=confirmedLocked
      ?(english()?'Check-in is reflected. Confirmed plans stay untouched unless you choose to edit them.':'체크인은 반영됐습니다. 이미 확정한 계획은 사용자의 선택 없이 자동으로 덮어쓰지 않습니다.')
      :adapted||revision>1
        ?(english()?'GARANG re-aligned today’s three tracks from your check-in.':'체크인을 반영해 오늘의 운동 · 회복 · 식단을 다시 맞췄습니다.')
        :(english()?'Today’s three tracks now include your check-in.':'오늘의 세 영역에 체크인 상태가 반영됐습니다.');
    const rows=current.map(track=>{
      const before=baselineMap.get(track.domain),isChanged=!!before&&changed(before,track),status=confirmedLocked?(english()?'LOCKED':'확정 유지'):isChanged?(english()?'CHANGED':'변경'):(english()?'REFLECTED':'반영');
      const previous=isChanged?detailText(before):'';
      const after=detailText(track);
      return `<div class="gto-impact-row" data-domain="${track.domain}" data-change="${isChanged?'changed':'stable'}"><span>${trackLabel(track.domain)}<b>${status}</b></span><strong>${esc(after)}</strong><small>${isChanged?`${esc(previous)} → ${esc(after)}`:(confirmedLocked?(english()?'User-confirmed plan':'사용자 확정 계획'):(english()?'Check-in reflected':'체크인 반영'))}</small></div>`;
    }).join('');
    return `<section class="gto-impact" data-gto-impact="1" data-state="complete" data-revision="${revision}"><div class="gto-impact-head"><span>3-TRACK IMPACT</span><strong>${esc(summary)}</strong></div><div class="gto-impact-tracks">${rows}</div></section>`;
  }

  function render(){
    timer=null;injectStyle();const m=main(),f=flow();if(!m||m.dataset.garangScreen!=='today'||!f)return;
    const s=state();if(!s)return;const date=dateKey(),checkin=todayCheckin(s,date);
    m.dataset.gto='1';f.dataset.gtoChecked=checkin?'1':'0';
    const label=f.querySelector('.gtf-decision>span');if(label)label.textContent=checkin?'TODAY DECISION · CHECK-IN REFLECTED':'TODAY DECISION · PRE-CHECK-IN';
    updateCheckinControl(checkin);
    const previous=f.querySelector('[data-gto-impact="1"]');previous?.remove();
    const decision=f.querySelector('.gtf-decision'),action=f.querySelector('.gtf-action');
    if(decision){const host=document.createElement('div');host.innerHTML=impactMarkup(s,date,checkin);const node=host.firstElementChild;if(node){if(action)action.insertAdjacentElement('beforebegin',node);else decision.insertAdjacentElement('afterend',node);}}
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
