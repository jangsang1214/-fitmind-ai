/* GARANG Today Density v4
   Mobile-first brand surface for Today.
   Today stays factual and read-only: brand cue -> score/state -> one check-in -> accumulation -> recent traces.
   Canonical state writes remain owned by app.js / Daily Plan / Coach.
*/
(() => {
  'use strict';
  if (window.GarangTodayDensityV1?.version === '4.0.0') return;

  const VERSION='4.0.0';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const bridge=()=>window.GarangAgentStateBridge;
  const list=value=>Array.isArray(value)?value:[];
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const pad=value=>String(value).padStart(2,'0');
  const english=()=>doc.documentElement.lang==='en';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let timer=0;

  const localDateString=value=>{
    const d=value instanceof Date?value:new Date(value);
    if(!Number.isFinite(d.getTime()))return '';
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };
  const dateKey=()=>localDateString(new Date());
  const rowDate=row=>{
    const explicit=String(row?.date||row?.day||'').trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(explicit))return explicit.slice(0,10);
    const raw=row?.performedAt||row?.createdAt||row?.updatedAt||'';
    return raw?localDateString(raw):'';
  };
  const sameDate=(row,date)=>rowDate(row)===date;

  function state(){try{return bridge()?.getLiveState?.()||bridge()?.getState?.()||null;}catch{return null;}}
  function checkins(s){
    return [...list(s?.dailyCheckins),...list(s?.checkins)].sort((a,b)=>Date.parse(a?.updatedAt||a?.createdAt||a?.performedAt||a?.date||0)-Date.parse(b?.updatedAt||b?.createdAt||b?.performedAt||b?.date||0));
  }
  function durationMinutes(row){
    const direct=finite(row?.duration??row?.minutes??row?.durationMinutes);
    if(direct!==null)return Math.max(0,direct);
    const seconds=finite(row?.durationSeconds);
    return seconds===null?0:Math.max(0,seconds/60);
  }
  function rowKcal(row){return Math.round(finite(row?.kcal)||list(row?.items).reduce((sum,item)=>sum+(finite(item?.kcal)||0),0));}
  function todayFacts(s,date){
    const workouts=list(s?.workouts).filter(row=>sameDate(row,date));
    const runs=list(s?.runs).filter(row=>sameDate(row,date));
    const meals=list(s?.meals).filter(row=>sameDate(row,date));
    const body=list(s?.body).filter(row=>sameDate(row,date));
    const checkin=checkins(s).filter(row=>sameDate(row,date)).at(-1)||null;
    const trainingRows=[...workouts,...runs];
    const trainingMinutes=Math.round(trainingRows.reduce((sum,row)=>sum+durationMinutes(row),0));
    const kcal=Math.round(meals.reduce((sum,row)=>sum+rowKcal(row),0));
    const sleep=finite(checkin?.sleepHours??checkin?.sleep);
    const recordCount=workouts.length+runs.length+meals.length+body.length+(checkin?1:0);
    return {workouts,runs,meals,body,checkin,trainingRows,trainingMinutes,kcal,sleep,recordCount};
  }
  function stamp(row,index){
    const raw=row?.createdAt||row?.performedAt||row?.updatedAt||row?.date||row?.day||'';
    const value=Date.parse(raw);return Number.isFinite(value)?value:index;
  }
  function timeLabel(row){
    const raw=row?.createdAt||row?.performedAt||row?.updatedAt||'';
    const value=Date.parse(raw);if(!Number.isFinite(value))return '';
    const d=new Date(value);return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function dayLabel(row){
    const d=rowDate(row),today=dateKey();
    if(!d)return english()?'Recent':'최근';
    if(d===today)return english()?'Today':'오늘';
    return d.slice(5).replace('-','.');
  }
  function workoutMeta(row){
    const minutes=Math.round(durationMinutes(row));
    if(minutes>0)return english()?`${minutes} min`:`${minutes}분`;
    const sets=finite(row?.sets),reps=finite(row?.reps);
    if(sets!==null&&reps!==null)return `${sets} × ${reps}`;
    return english()?'Workout record':'운동 기록';
  }
  function mealName(row){return String(row?.name||list(row?.items)[0]?.name||(english()?'Meal':'식단'));}
  function recentItems(s){
    const rows=[];let index=0;
    list(s?.workouts).forEach(row=>rows.push({row,route:'workout',kind:'training',title:String(row?.name||(english()?'Workout':'운동')),meta:workoutMeta(row),time:timeLabel(row),stamp:stamp(row,index++)}));
    list(s?.runs).forEach(row=>{const distance=finite(row?.distance),minutes=Math.round(durationMinutes(row));rows.push({row,route:'running',kind:'running',title:english()?'Running':'러닝',meta:[distance!==null?`${distance.toFixed(2)} km`:'',minutes>0?(english()?`${minutes} min`:`${minutes}분`):''].filter(Boolean).join(' · ')||(english()?'Running record':'러닝 기록'),time:timeLabel(row),stamp:stamp(row,index++)});});
    list(s?.meals).forEach(row=>{const kcal=rowKcal(row);rows.push({row,route:'nutrition',kind:'nutrition',title:mealName(row),meta:kcal>0?`${kcal.toLocaleString()} kcal`:(english()?'Meal record':'식단 기록'),time:timeLabel(row),stamp:stamp(row,index++)});});
    list(s?.body).forEach(row=>{const weight=finite(row?.weight),fat=finite(row?.fatPercent);rows.push({row,route:'body',kind:'body',title:english()?'Body composition':'체성분',meta:[weight!==null?`${weight} kg`:'',fat!==null?`${english()?'Body fat':'체지방'} ${fat}%`:''].filter(Boolean).join(' · ')||(english()?'Body record':'체성분 기록'),time:timeLabel(row),stamp:stamp(row,index++)});});
    return rows.sort((a,b)=>b.stamp-a.stamp).slice(0,6);
  }
  function recentTimeline(s){
    const rows=recentItems(s).slice();let index=100000;
    checkins(s).forEach(row=>{
      const sleep=finite(row?.sleepHours??row?.sleep);if(sleep===null)return;
      rows.push({row,route:null,action:'checkin',kind:'sleep',title:english()?'Sleep record':'수면 기록',meta:`${sleep}h`,time:timeLabel(row),stamp:stamp(row,index++)});
    });
    return rows.sort((a,b)=>b.stamp-a.stamp).slice(0,2).map(item=>({...item,day:dayLabel(item.row)}));
  }

  function icon(kind){
    if(kind==='training')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>';
    if(kind==='running')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 8l3-2 3 3 3 1M12 10l-2 4-4 2M14 12l2 4 4 2"/></svg>';
    if(kind==='nutrition')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M4 3v5c0 2 1.3 3 3 3s3-1 3-3V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/></svg>';
    if(kind==='sleep')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.5A8 8 0 0 1 8.2 6.7 8 8 0 1 0 18 16.5Z"/></svg>';
    if(kind==='body')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 9c0-2 1.8-3 4-3s4 1 4 3l1 5h-3v7h-4v-7H7l1-5Z"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6zM9 10h6M9 14h6"/></svg>';
  }
  function metric(kind,label,value){return `<div class="gtd3-metric"><span class="gtd3-metric-top"><i>${icon(kind==='records'?'record':kind)}</i><b>${esc(label)}</b></span><strong>${esc(value)}</strong></div>`;}

  function heroMarkup(){
    const title=english()?'A little more has accumulated today.':'오늘도, 조금 쌓였습니다.';
    const support=english()?'Small records shape the body you become.':'작은 기록이 오늘의 몸을 만듭니다.';
    return `<section id="garangTodayBrandHero" class="gtd3-hero" aria-label="${english()?'GARANG Today':'GARANG 오늘'}" data-gtd-hero="4">
      <div class="gtd3-hero-copy"><span class="gtd3-eyebrow">TODAY / ${english()?'ACCUMULATION':'누적'}</span><h1>${esc(title)}</h1><p>${esc(support)}</p><button type="button" class="gtd3-coach" data-gtd-coach>${english()?'Open Coach':'Coach 열기'}<span aria-hidden="true">→</span></button></div>
      <div class="gtd3-ripple" aria-hidden="true"><img src="./05_assets/garang-accumulation-ripple.svg?v=1" alt=""></div>
    </section>`;
  }
  function densityMarkup(s,date){
    const facts=todayFacts(s,date),recent=recentTimeline(s);
    const trainingValue=facts.trainingMinutes>0?(english()?`${facts.trainingMinutes} min`:`${facts.trainingMinutes}분`):(facts.trainingRows.length?(english()?`${facts.trainingRows.length} sessions`:`${facts.trainingRows.length}회`):(english()?'0 min':'0분'));
    const sleepValue=facts.sleep!==null?`${facts.sleep}h`:'—';
    const recordValue=english()?`${facts.recordCount}`:`${facts.recordCount}개`;
    const records=recent.length?recent.map(item=>`<button type="button" class="gtd3-record" ${item.route?`data-gtd-route="${esc(item.route)}"`:'data-gtd-checkin'}><i class="gtd3-timeline-dot" aria-hidden="true"></i><span class="gtd3-record-icon">${icon(item.kind)}</span><span class="gtd3-record-copy"><small>${esc(item.day)}${item.time?` · ${esc(item.time)}`:''}</small><strong>${esc(item.title)}</strong></span><em>${esc(item.meta)}</em><b aria-hidden="true">›</b></button>`).join(''):`<div class="gtd3-empty"><span class="gtd3-timeline-dot" aria-hidden="true"></span><p>${english()?'Your accumulation starts with the first saved record.':'첫 기록부터 오늘의 누적이 시작됩니다.'}</p><button type="button" data-gtd-record>${english()?'Add record':'기록하기'}</button></div>`;
    return `<section id="garangTodayDensity" class="gtd3-density" data-garang-today-density="1" aria-label="${english()?'Today accumulation and recent records':'오늘의 누적과 최근 기록'}">
      <div class="gtd3-section-head"><h2>${english()?"Today's accumulation":'오늘의 누적'}</h2><i></i><span>${english()?'ACCUMULATED TODAY':'오늘 쌓인 것'}</span></div>
      <div class="gtd3-metrics">${metric('training',english()?'Training':'운동',trainingValue)}${metric('nutrition',english()?'Nutrition':'식단',`${facts.kcal.toLocaleString()} kcal`)}${metric('sleep',english()?'Sleep':'수면',sleepValue)}${metric('records',english()?'Records':'기록',recordValue)}</div>
      <div class="gtd3-recent"><div class="gtd3-section-head"><h2>${english()?'Recent traces':'최근 쌓인 것'}</h2><i></i><span>${english()?'RECENT':'최근'}</span></div><div class="gtd3-records">${records}</div></div>
    </section>`;
  }

  function injectStyle(){
    const old=doc.getElementById('garangTodayDensityStyle');
    if(old?.dataset?.garangDensityVersion===VERSION)return;
    old?.remove();
    const style=doc.createElement('style');style.id='garangTodayDensityStyle';style.dataset.garangDensityVersion=VERSION;style.textContent=`
#main[data-garang-screen="today"]{--gtd-accent:#79b5a3;--gtd-ink:#f2efe9;--gtd-muted:rgba(242,239,233,.44);--gtd-line:rgba(242,239,233,.085);--gtd-display:var(--font-display,"AppleMyungjo","Noto Serif KR","Batang",Georgia,serif);overflow-x:hidden}
#main[data-garang-screen="today"]>#garangCoreToday{display:none!important}
#main[data-garang-screen="today"] #garangTodayBrandHero{position:relative;display:grid;grid-template-columns:1fr;min-height:0;margin:0 0 22px;padding:18px 0 20px;border-bottom:1px solid var(--gtd-line);overflow:hidden}
#main[data-garang-screen="today"] .gtd3-hero-copy{position:relative;z-index:2;display:flex;flex-direction:column;align-items:flex-start;min-width:0}.gtd3-eyebrow{display:block;margin-bottom:10px;font-size:8px;font-weight:600;letter-spacing:.2em;color:var(--gtd-accent)}
#main[data-garang-screen="today"] .gtd3-hero h1{margin:0;max-width:430px;font-family:var(--gtd-display);font-size:clamp(29px,7vw,38px);font-weight:400;line-height:1.16;letter-spacing:-.055em;color:var(--gtd-ink);text-wrap:balance;word-break:keep-all}
#main[data-garang-screen="today"] .gtd3-hero p{margin:9px 0 0;font-size:10px;line-height:1.55;color:rgba(242,239,233,.46);word-break:keep-all}
#main[data-garang-screen="today"] .gtd3-coach{appearance:none;display:inline-flex;align-items:center;gap:12px;min-width:0;min-height:44px;margin-top:12px;padding:0;border:0;background:transparent;color:var(--gtd-ink);font:inherit;font-size:11px;font-weight:600;cursor:pointer}.gtd3-coach:after{content:"";display:block;width:26px;height:1px;background:rgba(121,181,163,.42);order:-1}.gtd3-coach span{color:var(--gtd-accent);font-size:16px}.gtd3-coach:focus-visible{outline:1px solid var(--gtd-accent);outline-offset:4px}
#main[data-garang-screen="today"] .gtd3-ripple{position:relative;width:100%;height:104px;margin-top:8px;overflow:hidden;isolation:isolate;background:linear-gradient(180deg,transparent,rgba(121,181,163,.014) 70%,transparent)}.gtd3-ripple img{display:none!important;visibility:hidden!important;opacity:0!important}

#main[data-garang-screen="today"] #garangTodayFlow{position:relative;margin:0!important;padding:0!important;border:0!important;background:transparent!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtd3-score-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;margin:0 0 11px}.gtd3-score-head span{font-size:7px;font-weight:600;letter-spacing:.17em;color:var(--gtd-accent)}.gtd3-score-head i{height:1px;background:linear-gradient(90deg,rgba(121,181,163,.42),rgba(242,239,233,.025))}.gtd3-score-head small{font-size:7px;color:rgba(242,239,233,.31);white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{display:grid!important;grid-template-columns:102px minmax(0,1fr)!important;gap:20px!important;align-items:start!important;margin:0!important;padding:0 0 20px!important;border:0!important;border-bottom:1px solid var(--gtd-line)!important;background:transparent!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{position:relative!important;display:block!important;min-width:0!important;min-height:104px!important}.gtf-state-copy{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-visual{display:block!important;width:100%!important;min-height:86px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal{position:relative!important;display:flex!important;align-items:flex-end!important;justify-content:flex-start!important;width:100%!important;height:86px!important;max-width:none!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal:before{content:"";position:absolute;left:0;right:0;bottom:8px;height:1px;background:linear-gradient(90deg,var(--gtd-accent) 0 calc(var(--gtf-signal,0) * 1%),rgba(242,239,233,.09) calc(var(--gtf-signal,0) * 1%) 100%);filter:none}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal>i{display:none!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal em{position:relative!important;z-index:2!important;display:flex!important;align-items:baseline!important;justify-content:flex-start!important;gap:4px!important;margin:0 0 20px!important;font-style:normal!important}.gtf-signal em b{font-family:Georgia,serif!important;font-size:43px!important;font-weight:400!important;line-height:.9!important;letter-spacing:-.055em!important;color:var(--gtd-ink)!important}.gtf-signal em small{font-size:9px!important;color:rgba(242,239,233,.33)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary:after{content:"TODAY";display:block;margin-top:0;font-family:Georgia,serif;font-size:5px;letter-spacing:.28em;color:rgba(242,239,233,.26);white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual{display:grid!important;gap:0!important;min-width:0!important;border:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto 4px!important;gap:7px 10px!important;align-items:center!important;min-height:47px!important;padding:6px 0!important;border-bottom:1px solid rgba(242,239,233,.065)!important;background:transparent!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-icon{display:none!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-copy{grid-column:1!important;grid-row:1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-width:0!important}.gtf-track-copy span{font-size:11px!important;font-weight:600!important;color:rgba(242,239,233,.8)!important}.gtf-track-copy strong{font-size:8px!important;font-weight:500!important;color:rgba(242,239,233,.38)!important;white-space:nowrap!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-badge{grid-column:2!important;grid-row:1!important;font-size:7px!important;font-style:normal!important;color:var(--gtd-accent)!important;white-space:nowrap!important}.gtf-track-line{grid-column:1/3!important;grid-row:2!important;position:relative!important;display:block!important;height:1px!important;overflow:hidden!important;background:rgba(242,239,233,.06)!important}.gtf-track-line b{position:absolute!important;inset:0 auto 0 0!important;width:calc(var(--gtf-track,0) * 1%)!important;background:var(--gtd-accent)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual:after{display:none!important}

#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto auto!important;column-gap:14px!important;row-gap:2px!important;align-items:center!important;width:100%!important;min-width:0!important;min-height:76px!important;margin:15px 0 0!important;padding:12px 0!important;border:0!important;border-top:1px solid rgba(121,181,163,.16)!important;border-bottom:1px solid rgba(242,239,233,.07)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:hidden!important;text-align:left!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>span{position:static!important;display:block!important;grid-column:1!important;grid-row:1!important;margin:0!important;font-size:7px!important;font-weight:600!important;letter-spacing:.17em!important;color:var(--gtd-accent)!important;text-transform:uppercase!important;min-width:0!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>strong{position:static!important;display:block!important;grid-column:1!important;grid-row:2!important;margin:0!important;font-family:var(--gtd-display)!important;font-size:17px!important;font-weight:400!important;line-height:1.2!important;letter-spacing:-.035em!important;color:var(--gtd-ink)!important;min-width:0!important;white-space:normal!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>small{position:static!important;display:block!important;grid-column:1!important;grid-row:3!important;max-width:100%!important;margin:3px 0 0!important;font-size:8px!important;line-height:1.35!important;color:rgba(242,239,233,.36)!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important;min-width:0!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access:before{display:none!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access:after{content:"→"!important;position:static!important;grid-column:2!important;grid-row:1/4!important;display:block!important;width:auto!important;height:auto!important;margin:0!important;border:0!important;border-radius:0!important;transform:none!important;color:var(--gtd-accent)!important;font-size:17px!important;justify-self:end!important;align-self:center!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access{min-height:64px!important;padding:10px 0!important}.gtf-checkin-access:focus-visible{outline:1px solid rgba(121,181,163,.72)!important;outline-offset:3px!important}

#main[data-garang-screen="today"] #garangTodayDensity{margin:25px 0 0;padding:0;border:0;background:transparent;min-width:0}
#main[data-garang-screen="today"] .gtd3-section-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:11px;margin:0 0 12px}.gtd3-section-head h2{margin:0;font-family:var(--gtd-display);font-size:18px;font-weight:400;letter-spacing:-.04em;color:var(--gtd-ink);white-space:nowrap}.gtd3-section-head i{height:1px;background:linear-gradient(90deg,rgba(242,239,233,.15),rgba(242,239,233,.025))}.gtd3-section-head>span{font-size:5.5px;letter-spacing:.14em;color:rgba(242,239,233,.29);white-space:nowrap}
#main[data-garang-screen="today"] .gtd3-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(121,181,163,.18);border-bottom:1px solid rgba(242,239,233,.06);min-width:0}
#main[data-garang-screen="today"] .gtd3-metric{position:relative;min-width:0;padding:13px 10px 14px;border-right:1px solid rgba(242,239,233,.055)}.gtd3-metric:first-child{padding-left:0}.gtd3-metric:last-child{border-right:0;padding-right:0}.gtd3-metric-top{display:flex;align-items:center;gap:5px;min-width:0}.gtd3-metric-top i{display:grid;place-items:center;width:14px;height:14px;flex:0 0 auto;color:rgba(242,239,233,.5)}.gtd3-metric-top svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.35}.gtd3-metric-top b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:7px;font-weight:500;color:rgba(242,239,233,.36)}.gtd3-metric strong{display:block;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Georgia,"Times New Roman",serif;font-size:15px;font-weight:400;letter-spacing:-.035em;color:rgba(242,239,233,.88)}
#main[data-garang-screen="today"] .gtd3-recent{margin-top:24px}.gtd3-records{position:relative;padding-left:7px}.gtd3-records:before{content:"";position:absolute;left:5px;top:17px;bottom:17px;width:1px;background:linear-gradient(180deg,rgba(121,181,163,.38),rgba(121,181,163,.08))}
#main[data-garang-screen="today"] .gtd3-record{appearance:none;position:relative;width:100%;display:grid;grid-template-columns:32px minmax(0,1fr) auto 9px;gap:9px;align-items:center;min-height:55px;padding:8px 0 8px 16px;border:0;border-bottom:1px solid rgba(242,239,233,.055);background:transparent;color:var(--gtd-ink);text-align:left;cursor:pointer;min-width:0}.gtd3-timeline-dot{position:absolute;left:-5px;top:50%;width:5px;height:5px;border-radius:50%;transform:translateY(-50%);background:var(--gtd-accent);box-shadow:0 0 0 3px rgba(121,181,163,.04)}.gtd3-record-icon{display:grid;place-items:center;width:29px;height:29px;color:rgba(242,239,233,.55)}.gtd3-record-icon svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.3}.gtd3-record-copy{display:grid;gap:3px;min-width:0}.gtd3-record-copy small{font-size:7px;color:rgba(242,239,233,.28)}.gtd3-record-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:600;color:rgba(242,239,233,.8)}.gtd3-record em{font-size:9px;font-style:normal;color:var(--gtd-accent);white-space:nowrap}.gtd3-record>b{font-size:16px;font-weight:300;color:rgba(242,239,233,.3)}
#main[data-garang-screen="today"] .gtd3-empty{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:55px;padding:10px 0 10px 16px;border-bottom:1px solid rgba(242,239,233,.055)}.gtd3-empty p{margin:0;font-size:9px;line-height:1.5;color:rgba(242,239,233,.38)}.gtd3-empty button{appearance:none;border:0;background:transparent;color:var(--gtd-accent);padding:8px 0;font-size:8px;white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-action{margin-top:18px!important;padding-top:0!important;border:0!important}.gtf-next{border-color:rgba(121,181,163,.24)!important;background:rgba(121,181,163,.015)!important}

@media(max-width:600px){
#main[data-garang-screen="today"] #garangTodayBrandHero{margin-bottom:19px;padding:14px 0 18px}.gtd3-hero h1{font-size:31px!important;line-height:1.14!important}.gtd3-hero p{font-size:9px!important;margin-top:7px!important}.gtd3-coach{margin-top:9px!important}.gtd3-ripple{height:92px!important;margin-top:4px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:91px minmax(0,1fr)!important;gap:16px!important;padding-bottom:18px!important}.gtf-state-primary{min-height:96px!important}.gtf-state-visual{min-height:80px!important}.gtf-signal{height:80px!important}.gtf-signal em b{font-size:39px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track{min-height:44px!important}.gtf-track-copy span{font-size:10.5px!important}.gtf-track-copy strong{font-size:7.5px!important}
#main[data-garang-screen="today"] .gtd3-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.gtd3-metric{padding:12px 10px!important;border-right:0;border-bottom:1px solid rgba(242,239,233,.05)}.gtd3-metric:nth-child(odd){padding-left:0!important;border-right:1px solid rgba(242,239,233,.055)}.gtd3-metric:nth-child(even){padding-right:0!important}.gtd3-metric:nth-last-child(-n+2){border-bottom:0}.gtd3-metric strong{font-size:15px!important}.gtd3-section-head>span{font-size:5px}
}
@media(max-width:350px){.gtd3-hero h1{font-size:28px!important}.gtd3-ripple{height:84px!important}#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:82px minmax(0,1fr)!important;gap:13px!important}.gtf-signal em b{font-size:35px!important}.gtd3-section-head>span{display:none}.gtd3-record{grid-template-columns:28px minmax(0,1fr) auto 8px}.gtd3-record em{font-size:8px}}
@media(min-width:760px){#main[data-garang-screen="today"] #garangTodayBrandHero{grid-template-columns:minmax(0,.92fr) minmax(280px,1.08fr);column-gap:34px;align-items:end}.gtd3-ripple{height:160px;margin-top:0}.gtd3-hero-copy{padding-bottom:12px}.gtd3-coach{margin-top:16px}}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"] *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;doc.head.appendChild(style);
  }

  function decorateFlow(flow){
    if(!flow)return;
    const date=String(dateKey()).slice(5).replace('-','.');
    const hiddenLabel=flow.querySelector('.gtf-state-copy span'),label=english()?`Today ${date}`:`오늘 ${date}`;
    if(hiddenLabel&&hiddenLabel.textContent!==label)hiddenLabel.textContent=label;
    const hiddenTitle=flow.querySelector('.gtf-state-copy strong');if(hiddenTitle&&hiddenTitle.textContent!=='GARANG')hiddenTitle.textContent='GARANG';
    let head=flow.querySelector('.gtd3-score-head');if(!head){head=doc.createElement('div');head.className='gtd3-score-head';flow.querySelector('.gtf-state')?.insertAdjacentElement('beforebegin',head);}
    const sig=`${english()?'en':'ko'}|${date}`;
    if(head&&head.dataset.gtdSignature!==sig){head.innerHTML=`<span>GARANG SCORE</span><i aria-hidden="true"></i><small>${english()?'Today':'오늘'} · ${esc(date)}</small>`;head.dataset.gtdSignature=sig;}
    flow.querySelectorAll('.gtf-track-copy strong').forEach(node=>{const text=String(node.textContent||'').trim();if(!english()&&text==='준비')node.textContent='준비 중';if(!english()&&text==='—')node.textContent='대기';});
    flow.setAttribute('data-gtd-brand-surface','4');
  }
  function ensureHero(m,flow){
    let current=m.querySelector('#garangTodayBrandHero');
    if(!current){const host=doc.createElement('div');host.innerHTML=heroMarkup();current=host.firstElementChild;if(current)flow.insertAdjacentElement('beforebegin',current);}
    if(!current)return;
    const sig=english()?'en':'ko';if(current.dataset.gtdSignature===sig)return;
    current.querySelector('.gtd3-eyebrow').textContent=`TODAY / ${english()?'ACCUMULATION':'누적'}`;
    current.querySelector('h1').textContent=english()?'A little more has accumulated today.':'오늘도, 조금 쌓였습니다.';
    current.querySelector('p').textContent=english()?'Small records shape the body you become.':'작은 기록이 오늘의 몸을 만듭니다.';
    const coach=current.querySelector('[data-gtd-coach]');if(coach){coach.firstChild.nodeValue=english()?'Open Coach':'Coach 열기';coach.setAttribute('aria-label',english()?'Open Coach':'Coach 열기');}
    current.dataset.gtdSignature=sig;
  }
  function densitySignature(s,date){
    const facts=todayFacts(s,date),recent=recentTimeline(s);
    return JSON.stringify({lang:english()?'en':'ko',date,training:facts.trainingMinutes,kcal:facts.kcal,sleep:facts.sleep,records:facts.recordCount,recent:recent.map(x=>[x.route||x.action,x.title,x.meta,x.day,x.time,x.stamp])});
  }
  function upsertDensity(m,s,date,flow){
    const sig=densitySignature(s,date),current=m.querySelector('#garangTodayDensity');
    if(current?.dataset?.gtdSignature===sig)return;
    const host=doc.createElement('div');host.innerHTML=densityMarkup(s,date);const next=host.firstElementChild;if(!next)return;next.dataset.gtdSignature=sig;
    if(current)current.replaceWith(next);else{const action=flow.querySelector('.gtf-action');if(action)action.insertAdjacentElement('beforebegin',next);else flow.appendChild(next);}
  }
  function placeSupportingCards(m){
    const density=m.querySelector('#garangTodayDensity'),workout=m.querySelector('.garang-daily-workout');
    if(density&&workout&&workout.previousElementSibling!==density)density.insertAdjacentElement('afterend',workout);
  }
  function render(){
    timer=0;injectStyle();const m=main();if(!m)return;
    if(m.dataset.garangScreen!=='today'){m.querySelector('#garangTodayBrandHero')?.remove();m.querySelector('#garangTodayDensity')?.remove();return;}
    const s=state(),flow=m.querySelector('#garangTodayFlow');if(!s||!flow)return;
    const date=dateKey();decorateFlow(flow);ensureHero(m,flow);upsertDensity(m,s,date,flow);placeSupportingCards(m);window.GarangAccumulationMotionV1?.sync?.();
  }
  function schedule(delay=110){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(render),delay);}
  function openRecord(){const trigger=doc.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]');if(window.GarangSimplifiedShell?.openRecordSheet)window.GarangSimplifiedShell.openRecordSheet(trigger);else window.GarangRouter?.navigate?.('log',{source:'today-density-v4',force:true});}
  doc.addEventListener('click',event=>{
    const coach=event.target.closest?.('[data-gtd-coach]');if(coach&&main()?.contains(coach)){event.preventDefault();window.GarangRouter?.navigate?.('coach',{source:'today-brand-hero',force:true});return;}
    const route=event.target.closest?.('[data-gtd-route]');if(route&&main()?.contains(route)){event.preventDefault();window.GarangRouter?.navigate?.(route.dataset.gtdRoute,{source:'today-density-v4',force:true});return;}
    const checkin=event.target.closest?.('[data-gtd-checkin]');if(checkin&&main()?.contains(checkin)){event.preventDefault();main()?.querySelector('[data-action="open-checkin"]')?.click();return;}
    const record=event.target.closest?.('[data-gtd-record]');if(record&&main()?.contains(record)){event.preventDefault();openRecord();}
  },true);
  ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:agent-write','garang:route-completed','garang:workout-intelligence-rendered'].forEach(name=>window.addEventListener(name,()=>schedule(name==='garang:state-updated'?170:90)));
  doc.documentElement.addEventListener('garang:language-changed',()=>schedule(70));
  window.addEventListener('pageshow',()=>schedule(60));
  window.GarangTodayDensityV1=Object.freeze({version:VERSION,render,schedule,todayFacts,recentItems,recentTimeline,rowDate});
  schedule(70);
})();