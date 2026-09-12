/* GARANG Today Density v3
   Visual parity pass for the approved GARANG Today mockup.
   Today stays factual and read-only: brand cue -> score/state -> one check-in -> accumulation -> recent traces -> next action.
   Canonical state writes remain owned by app.js / Daily Plan / Coach.
*/
(() => {
  'use strict';
  if (window.GarangTodayDensityV1) return;

  const VERSION='3.0.0';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const bridge=()=>window.GarangAgentStateBridge;
  const list=value=>Array.isArray(value)?value:[];
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const pad=value=>String(value).padStart(2,'0');
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
  const english=()=>doc.documentElement.lang==='en';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let timer=null;

  function state(){try{return bridge()?.getLiveState?.()||bridge()?.getState?.()||null;}catch{return null;}}
  function checkins(s){
    const rows=[...list(s?.dailyCheckins),...list(s?.checkins)];
    return rows.sort((a,b)=>Date.parse(a?.updatedAt||a?.createdAt||a?.performedAt||a?.date||0)-Date.parse(b?.updatedAt||b?.createdAt||b?.performedAt||b?.date||0));
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
  function bars(percent){
    const p=clamp(Math.round(percent||0),0,100),active=Math.max(p>0?1:0,Math.round(p/12.5));
    return `<span class="gtd3-bars" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i class="${i<active?'is-on':''}" style="--gtd-i:${i}"></i>`).join('')}</span>`;
  }
  function metric(kind,label,value,percent){return `<div class="gtd3-metric"><span class="gtd3-metric-top"><i>${icon(kind==='records'?'record':kind)}</i><b>${esc(label)}</b></span><strong>${esc(value)}</strong>${bars(percent)}</div>`;}

  function heroMarkup(){
    const title=english()?'A little more has accumulated today.':'오늘도, 조금 쌓였습니다.';
    const support=english()?'Small records shape the body you become.':'작은 기록이 오늘의 몸을 만듭니다.';
    return `<section id="garangTodayBrandHero" class="gtd3-hero" aria-label="${english()?'GARANG Today':'GARANG 오늘'}">
      <div class="gtd3-hero-copy"><span class="gtd3-eyebrow">TODAY / ${english()?'ACCUMULATION':'누적'}</span><h1>${esc(title)}</h1><p>${esc(support)}</p><button type="button" class="gtd3-coach" data-gtd-coach>${english()?'Open Coach':'Coach 열기'}<span aria-hidden="true">→</span></button></div>
      <div class="gtd3-ripple" aria-hidden="true"><img src="./05_assets/garang-accumulation-ripple.svg?v=1" alt=""><small>QUIETLY<br>BECOMING.</small></div>
    </section>`;
  }
  function densityMarkup(s,date){
    const facts=todayFacts(s,date),recent=recentTimeline(s);
    const trainingValue=facts.trainingMinutes>0?(english()?`${facts.trainingMinutes} min`:`${facts.trainingMinutes}분`):(facts.trainingRows.length?(english()?`${facts.trainingRows.length} sessions`:`${facts.trainingRows.length}회`):(english()?'0 min':'0분'));
    const sleepValue=facts.sleep!==null?`${facts.sleep}h`:'—';
    const recordValue=english()?`${facts.recordCount}`:`${facts.recordCount}개`;
    const records=recent.length?recent.map(item=>`<button type="button" class="gtd3-record" ${item.route?`data-gtd-route="${esc(item.route)}"`:'data-gtd-checkin'}><i class="gtd3-timeline-dot" aria-hidden="true"></i><span class="gtd3-record-icon">${icon(item.kind)}</span><span class="gtd3-record-copy"><small>${esc(item.day)}${item.time?` · ${esc(item.time)}`:''}</small><strong>${esc(item.title)}</strong></span><em>${esc(item.meta)}</em><b aria-hidden="true">›</b></button>`).join(''):`<div class="gtd3-empty"><span class="gtd3-timeline-dot" aria-hidden="true"></span><p>${english()?'Your accumulation starts with the first saved record.':'첫 기록부터 오늘의 누적이 시작됩니다.'}</p><button type="button" data-gtd-record>${english()?'Add record':'기록하기'}</button></div>`;
    return `<section id="garangTodayDensity" class="gtd3-density" data-garang-today-density="1" aria-label="${english()?'Today accumulation and recent records':'오늘의 누적과 최근 기록'}">
      <div class="gtd3-section-head"><h2>${english()?"Today's accumulation":'오늘의 누적'}</h2><i></i><span>TODAY’S ACCUMULATION</span></div>
      <div class="gtd3-metrics">${metric('training',english()?'Training':'운동',trainingValue,(facts.trainingMinutes/60)*100)}${metric('nutrition',english()?'Nutrition':'식단',`${facts.kcal.toLocaleString()} kcal`,(facts.kcal/2000)*100)}${metric('sleep',english()?'Sleep':'수면',sleepValue,facts.sleep!==null?(facts.sleep/8)*100:0)}${metric('records',english()?'Records':'기록',recordValue,(facts.recordCount/6)*100)}</div>
      <div class="gtd3-recent"><div class="gtd3-section-head"><h2>${english()?'Recent records':'최근 기록'}</h2><i></i><span>RECENT RECORDS</span></div><div class="gtd3-records">${records}</div></div>
    </section>`;
  }

  function injectStyle(){
    doc.getElementById('garangTodayDensityStyle')?.remove();
    const style=doc.createElement('style');style.id='garangTodayDensityStyle';style.textContent=`
#main[data-garang-screen="today"]{--gtd-accent:#79b5a3;--gtd-ink:#f2efe9;--gtd-muted:rgba(242,239,233,.43);--gtd-line:rgba(242,239,233,.085);--gtd-display:var(--font-display,"AppleMyungjo","Noto Serif KR","Batang",Georgia,serif);overflow-x:hidden}
#main[data-garang-screen="today"]>#garangCoreToday{display:none!important}
#main[data-garang-screen="today"] #garangTodayBrandHero{position:relative;display:grid;grid-template-columns:minmax(0,1.34fr) minmax(126px,.66fr);gap:12px;align-items:stretch;min-height:164px;margin:0 0 21px;padding:18px 0 20px;border-bottom:1px solid var(--gtd-line);overflow:hidden}
#main[data-garang-screen="today"] .gtd3-hero-copy{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;min-width:0}.gtd3-eyebrow{display:block;margin-bottom:9px;font-size:8px;font-weight:600;letter-spacing:.2em;color:var(--gtd-accent)}
#main[data-garang-screen="today"] .gtd3-hero h1{margin:0;max-width:430px;font-family:var(--gtd-display);font-size:clamp(25px,5.8vw,35px);font-weight:400;line-height:1.17;letter-spacing:-.05em;color:var(--gtd-ink);text-wrap:balance;word-break:keep-all}
#main[data-garang-screen="today"] .gtd3-hero p{margin:9px 0 0;font-size:10px;line-height:1.55;color:rgba(242,239,233,.48);word-break:keep-all}
#main[data-garang-screen="today"] .gtd3-coach{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:14px;width:max-content;min-height:40px;margin-top:16px;padding:0 18px;border:1px solid rgba(121,181,163,.58);border-radius:999px;background:rgba(7,19,16,.18);color:var(--gtd-ink);font:inherit;font-size:11px;font-weight:600;cursor:pointer}.gtd3-coach span{color:var(--gtd-accent);font-size:15px}.gtd3-coach:focus-visible{outline:1px solid var(--gtd-accent);outline-offset:4px}
#main[data-garang-screen="today"] .gtd3-ripple{position:relative;min-width:0;overflow:hidden}.gtd3-ripple img{position:absolute;left:50%;bottom:-13px;width:185%;max-width:none;height:auto;transform:translateX(-50%);opacity:.92}.gtd3-ripple small{position:absolute;right:1px;top:25px;font-family:Georgia,serif;font-size:5.5px;line-height:1.9;letter-spacing:.34em;color:rgba(242,239,233,.47);text-align:left}

#main[data-garang-screen="today"] #garangTodayFlow{position:relative;margin:0!important;padding:0!important;border:0!important;background:transparent!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtd3-score-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;margin:0 0 10px}.gtd3-score-head span{font-size:7px;font-weight:600;letter-spacing:.16em;color:var(--gtd-accent)}.gtd3-score-head i{height:1px;background:linear-gradient(90deg,rgba(121,181,163,.5),rgba(242,239,233,.035))}.gtd3-score-head small{font-size:7px;color:rgba(242,239,233,.35);white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{display:grid!important;grid-template-columns:minmax(128px,.9fr) minmax(0,1.1fr)!important;gap:19px!important;align-items:center!important;margin:0!important;padding:0 0 19px!important;border:0!important;border-bottom:1px solid var(--gtd-line)!important;background:transparent!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{display:flex!important;flex-direction:column!important;align-items:center!important;min-width:0!important}.gtf-state-copy{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-visual{display:grid!important;place-items:center!important;width:100%!important;min-height:140px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal{position:relative!important;display:grid!important;place-items:center!important;width:132px!important;height:132px!important;max-width:100%!important;border:1px solid rgba(121,181,163,.18)!important;border-radius:50%!important;background:radial-gradient(circle at 50% 50%,rgba(4,8,7,.98) 0 31%,transparent 32%),repeating-radial-gradient(circle at 50% 50%,transparent 0 14px,rgba(121,181,163,.12) 15px,transparent 16px 22px)!important;box-shadow:0 0 36px rgba(121,181,163,.04),inset 0 0 30px rgba(0,0,0,.64)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal:before{content:"";position:absolute;inset:7px;border-radius:50%;background:conic-gradient(from -90deg,var(--gtd-accent) calc(var(--gtf-signal,0) * 1%),rgba(121,181,163,.075) 0);mask:radial-gradient(circle,transparent 0 43px,#000 44px 47px,transparent 48px);-webkit-mask:radial-gradient(circle,transparent 0 43px,#000 44px 47px,transparent 48px);filter:drop-shadow(0 0 5px rgba(121,181,163,.22))}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal>i{position:absolute!important;top:24px!important;left:50%!important;width:7px!important;height:10px!important;border:1px solid rgba(242,239,233,.63)!important;border-radius:55% 45% 60% 40%!important;transform:translateX(-50%) rotate(45deg)!important;background:transparent!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal em{position:relative!important;z-index:2!important;display:flex!important;align-items:baseline!important;justify-content:center!important;gap:4px!important;font-style:normal!important}.gtf-signal em b{font-family:Georgia,serif!important;font-size:33px!important;font-weight:400!important;letter-spacing:-.05em!important;color:var(--gtd-ink)!important}.gtf-signal em small{font-size:9px!important;color:rgba(242,239,233,.38)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary:after{content:"QUIET PROGRESS  ·  EVERYDAY";margin-top:5px;font-family:Georgia,serif;font-size:5px;letter-spacing:.3em;color:rgba(242,239,233,.32);white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual{display:grid!important;gap:0!important;min-width:0!important;border:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track{position:relative!important;display:grid!important;grid-template-columns:35px minmax(0,1fr) auto!important;grid-template-rows:auto 5px!important;gap:6px 10px!important;align-items:center!important;min-height:53px!important;padding:6px 0!important;border-bottom:1px solid rgba(242,239,233,.07)!important;background:transparent!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-icon{grid-column:1!important;grid-row:1/3!important;display:grid!important;place-items:center!important;width:33px!important;height:33px!important;border:1px solid rgba(242,239,233,.12)!important;border-radius:11px!important;background:rgba(242,239,233,.012)!important;color:rgba(242,239,233,.62)!important}.gtf-track-icon svg{width:16px!important;height:16px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.25!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-copy{grid-column:2!important;grid-row:1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-width:0!important}.gtf-track-copy span{font-size:11px!important;font-weight:600!important;color:rgba(242,239,233,.84)!important}.gtf-track-copy strong{font-size:8px!important;font-weight:600!important;color:rgba(242,239,233,.42)!important;white-space:nowrap!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-badge{grid-column:3!important;grid-row:1!important;font-size:7px!important;font-style:normal!important;color:var(--gtd-accent)!important;white-space:nowrap!important}.gtf-track-line{grid-column:2/4!important;grid-row:2!important;position:relative!important;display:block!important;height:2px!important;overflow:hidden!important;border-radius:999px!important;background:rgba(242,239,233,.065)!important}.gtf-track-line b{position:absolute!important;inset:0 auto 0 0!important;width:calc(var(--gtf-track,0) * 1%)!important;background:linear-gradient(90deg,var(--gtd-accent),rgba(121,181,163,.42))!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual:after{content:"작은 행동의 반복이 큰 변화를 만듭니다.";display:block;margin-top:9px;text-align:right;font-size:7px;line-height:1.4;color:rgba(242,239,233,.3)}
html[lang="en"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual:after{content:"Quiet repetition becomes visible change."}

#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) 42px!important;grid-template-rows:auto auto auto!important;column-gap:14px!important;row-gap:3px!important;align-items:center!important;width:100%!important;min-width:0!important;min-height:88px!important;margin:16px 0 0!important;padding:15px 14px!important;border:1px solid rgba(121,181,163,.23)!important;border-radius:14px!important;background:radial-gradient(ellipse at 77% 125%,rgba(121,181,163,.12),transparent 45%),linear-gradient(115deg,rgba(242,239,233,.018),rgba(121,181,163,.016))!important;box-shadow:inset 0 1px 0 rgba(242,239,233,.025)!important;overflow:hidden!important;text-align:left!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>span{position:static!important;display:block!important;grid-column:1!important;grid-row:1!important;margin:0!important;font-size:7px!important;font-weight:600!important;letter-spacing:.18em!important;color:var(--gtd-accent)!important;text-transform:uppercase!important;min-width:0!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>strong{position:static!important;display:block!important;grid-column:1!important;grid-row:2!important;margin:0!important;font-family:var(--gtd-display)!important;font-size:18px!important;font-weight:400!important;line-height:1.2!important;letter-spacing:-.035em!important;color:var(--gtd-ink)!important;min-width:0!important;white-space:normal!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>small{position:static!important;display:block!important;grid-column:1!important;grid-row:3!important;max-width:100%!important;margin:4px 0 0!important;font-size:8px!important;line-height:1.35!important;color:rgba(242,239,233,.42)!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important;min-width:0!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access:before{content:"";position:absolute;right:42px;bottom:-8px;width:132px;height:50px;opacity:.38;background:repeating-radial-gradient(ellipse at 100% 100%,transparent 0 9px,rgba(121,181,163,.22) 10px,transparent 11px 16px);transform:rotate(-8deg);pointer-events:none}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access:after{content:"→"!important;position:static!important;grid-column:2!important;grid-row:1/4!important;display:grid!important;place-items:center!important;width:38px!important;height:38px!important;margin:0!important;border:1px solid rgba(121,181,163,.27)!important;border-radius:50%!important;transform:none!important;color:var(--gtd-accent)!important;font-size:14px!important;justify-self:end!important;align-self:center!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access{min-height:68px!important;padding:12px 14px!important}.gtf-checkin-access:focus-visible{outline:1px solid rgba(121,181,163,.72)!important;outline-offset:3px!important}

#main[data-garang-screen="today"] #garangTodayDensity{margin:24px 0 0;padding:0;border:0;background:transparent;min-width:0}
#main[data-garang-screen="today"] .gtd3-section-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:11px;margin:0 0 11px}.gtd3-section-head h2{margin:0;font-family:var(--gtd-display);font-size:17px;font-weight:400;letter-spacing:-.04em;color:var(--gtd-ink);white-space:nowrap}.gtd3-section-head i{height:1px;background:linear-gradient(90deg,rgba(242,239,233,.17),rgba(242,239,233,.035))}.gtd3-section-head>span{font-size:5.5px;letter-spacing:.2em;color:rgba(242,239,233,.34);white-space:nowrap}
#main[data-garang-screen="today"] .gtd3-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:hidden;border:1px solid rgba(121,181,163,.18);border-radius:13px;background:linear-gradient(180deg,rgba(121,181,163,.024),rgba(242,239,233,.01));min-width:0}
#main[data-garang-screen="today"] .gtd3-metric{position:relative;min-width:0;padding:12px 9px 11px;border-right:1px solid rgba(242,239,233,.06)}.gtd3-metric:last-child{border-right:0}.gtd3-metric-top{display:flex;align-items:center;gap:5px;min-width:0}.gtd3-metric-top i{display:grid;place-items:center;width:15px;height:15px;flex:0 0 auto;color:rgba(242,239,233,.58)}.gtd3-metric-top svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.35}.gtd3-metric-top b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:7.5px;font-weight:500;color:rgba(242,239,233,.39)}.gtd3-metric strong{display:block;margin-top:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Georgia,"Times New Roman",serif;font-size:clamp(11px,3.2vw,16px);font-weight:400;letter-spacing:-.035em;color:rgba(242,239,233,.91)}
#main[data-garang-screen="today"] .gtd3-bars{display:flex;align-items:flex-end;gap:2.5px;height:13px;margin-top:8px}.gtd3-bars i{display:block;width:2px;height:calc(4px + (var(--gtd-i) % 4) * 2px);border-radius:2px;background:rgba(242,239,233,.1)}.gtd3-bars i.is-on{background:rgba(121,181,163,.68);box-shadow:0 0 5px rgba(121,181,163,.1)}
#main[data-garang-screen="today"] .gtd3-recent{margin-top:23px}.gtd3-records{position:relative;padding-left:7px}.gtd3-records:before{content:"";position:absolute;left:5px;top:17px;bottom:17px;width:1px;background:linear-gradient(180deg,rgba(121,181,163,.48),rgba(121,181,163,.11))}
#main[data-garang-screen="today"] .gtd3-record{appearance:none;position:relative;width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) auto 11px;gap:9px;align-items:center;min-height:58px;padding:8px 0 8px 17px;border:0;border-bottom:1px solid rgba(242,239,233,.06);background:transparent;color:var(--gtd-ink);text-align:left;cursor:pointer;min-width:0}.gtd3-timeline-dot{position:absolute;left:-5px;top:50%;width:6px;height:6px;border-radius:50%;transform:translateY(-50%);background:var(--gtd-accent);box-shadow:0 0 0 3px rgba(121,181,163,.055)}.gtd3-record-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(242,239,233,.12);border-radius:12px;color:rgba(242,239,233,.62)}.gtd3-record-icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.3}.gtd3-record-copy{display:grid;gap:3px;min-width:0}.gtd3-record-copy small{font-size:7px;color:rgba(242,239,233,.31)}.gtd3-record-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:600;color:rgba(242,239,233,.83)}.gtd3-record em{font-size:10px;font-style:normal;color:var(--gtd-accent);white-space:nowrap}.gtd3-record>b{font-size:18px;font-weight:300;color:rgba(242,239,233,.36)}
#main[data-garang-screen="today"] .gtd3-empty{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:10px 0 10px 17px;border-bottom:1px solid rgba(242,239,233,.06)}.gtd3-empty p{margin:0;font-size:9px;line-height:1.5;color:rgba(242,239,233,.4)}.gtd3-empty button{appearance:none;border:1px solid rgba(121,181,163,.25);border-radius:999px;background:transparent;color:var(--gtd-accent);padding:7px 10px;font-size:8px;white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-action{margin-top:18px!important;padding-top:0!important;border:0!important}.gtf-next{border-color:rgba(121,181,163,.28)!important;background:rgba(121,181,163,.02)!important}

@media(max-width:600px){
#main[data-garang-screen="today"] #garangTodayBrandHero{grid-template-columns:minmax(0,1fr) 112px;gap:8px;min-height:148px;margin-bottom:18px;padding:14px 0 17px}.gtd3-hero h1{font-size:27px!important;line-height:1.16!important}.gtd3-hero p{font-size:9px!important;margin-top:7px!important}.gtd3-coach{margin-top:13px!important;min-height:37px!important;padding:0 15px!important}.gtd3-ripple img{width:205%!important;bottom:-8px!important}.gtd3-ripple small{right:-2px!important;top:18px!important;font-size:5px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:124px minmax(0,1fr)!important;gap:15px!important;padding-bottom:16px!important}.gtf-state-visual{min-height:130px!important}.gtf-signal{width:120px!important;height:120px!important}.gtf-signal:before{inset:7px!important;mask:radial-gradient(circle,transparent 0 39px,#000 40px 43px,transparent 44px)!important;-webkit-mask:radial-gradient(circle,transparent 0 39px,#000 40px 43px,transparent 44px)!important}.gtf-signal em b{font-size:30px!important}.gtf-state-primary:after{font-size:4.5px!important;letter-spacing:.23em!important}.gtf-track{grid-template-columns:30px minmax(0,1fr) auto!important;gap:5px 8px!important;min-height:48px!important;padding:5px 0!important}.gtf-track-icon{width:29px!important;height:29px!important;border-radius:9px!important}.gtf-track-copy span{font-size:10px!important}.gtf-track-copy strong{font-size:7px!important}.gtf-track-visual:after{margin-top:8px!important;font-size:6.5px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{grid-template-columns:minmax(0,1fr) 40px!important;min-height:84px!important;margin-top:14px!important;padding:13px!important}.gtf-checkin-access>strong{font-size:17px!important}.gtf-checkin-access>small{font-size:7.5px!important}.gtf-checkin-access:after{width:36px!important;height:36px!important}
#main[data-garang-screen="today"] #garangTodayDensity{margin-top:21px}.gtd3-section-head{gap:8px;margin-bottom:9px}.gtd3-section-head h2{font-size:16px}.gtd3-section-head>span{font-size:5px;letter-spacing:.15em}.gtd3-metric{padding:10px 7px 10px}.gtd3-metric-top{gap:4px}.gtd3-metric-top i{width:13px;height:13px}.gtd3-metric-top svg{width:12px;height:12px}.gtd3-metric-top b{font-size:6.8px}.gtd3-metric strong{margin-top:6px;font-size:clamp(10.5px,3vw,13px)}.gtd3-bars{gap:2px;margin-top:7px}.gtd3-bars i{width:1.5px}.gtd3-recent{margin-top:20px}.gtd3-record{grid-template-columns:34px minmax(0,1fr) auto 9px;gap:7px;min-height:54px;padding-left:15px}.gtd3-record-icon{width:31px;height:31px;border-radius:10px}.gtd3-record-copy strong{font-size:10px}.gtd3-record em{font-size:9px}
}
@media(max-width:390px){
#main[data-garang-screen="today"] #garangTodayBrandHero{grid-template-columns:minmax(0,1fr) 101px}.gtd3-hero h1{font-size:25px!important}.gtd3-ripple img{width:220%!important}.gtd3-score-head small{font-size:6.5px!important}#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:116px minmax(0,1fr)!important;gap:13px!important}.gtf-signal{width:112px!important;height:112px!important}.gtf-signal:before{mask:radial-gradient(circle,transparent 0 36px,#000 37px 40px,transparent 41px)!important;-webkit-mask:radial-gradient(circle,transparent 0 36px,#000 37px 40px,transparent 41px)!important}.gtf-signal em b{font-size:28px!important}.gtd3-section-head>span{font-size:4.7px!important}.gtd3-metric{padding-left:6px;padding-right:6px}.gtd3-metric-top i{display:none}.gtd3-metric-top b{font-size:6.5px}.gtd3-metric strong{font-size:11.5px!important}
}
@media(max-width:350px){#main[data-garang-screen="today"] #garangTodayBrandHero{grid-template-columns:1fr 82px}.gtd3-ripple small{display:none}.gtd3-hero h1{font-size:23px!important}#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:104px minmax(0,1fr)!important;gap:10px!important}.gtf-signal{width:100px!important;height:100px!important}.gtf-signal:before{mask:radial-gradient(circle,transparent 0 32px,#000 33px 36px,transparent 37px)!important;-webkit-mask:radial-gradient(circle,transparent 0 32px,#000 33px 36px,transparent 37px)!important}.gtd3-section-head>span{display:none}.gtd3-metric strong{font-size:10.5px!important}}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"] *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;doc.head.appendChild(style);
  }

  function decorateFlow(flow){
    if(!flow)return;
    const date=String(dateKey()).slice(5).replace('-','.');
    const hiddenLabel=flow.querySelector('.gtf-state-copy span');if(hiddenLabel)hiddenLabel.textContent=english()?`Today ${date}`:`오늘 ${date}`;
    const hiddenTitle=flow.querySelector('.gtf-state-copy strong');if(hiddenTitle)hiddenTitle.textContent='GARANG';
    let head=flow.querySelector('.gtd3-score-head');if(!head){head=doc.createElement('div');head.className='gtd3-score-head';flow.querySelector('.gtf-state')?.insertAdjacentElement('beforebegin',head);}
    if(head)head.innerHTML=`<span>GARANG SCORE</span><i aria-hidden="true"></i><small>${english()?'Today':'오늘'} · ${esc(date)}</small>`;
    flow.querySelectorAll('.gtf-track-copy strong').forEach(node=>{const text=String(node.textContent||'').trim();if(!english()&&text==='준비')node.textContent='준비 중';if(!english()&&text==='—')node.textContent='대기';});
    flow.setAttribute('data-gtd-brand-surface','3');
  }
  function upsertHero(m,flow){
    const host=doc.createElement('div');host.innerHTML=heroMarkup();const next=host.firstElementChild;if(!next)return;
    const current=m.querySelector('#garangTodayBrandHero');if(current)current.replaceWith(next);else flow.insertAdjacentElement('beforebegin',next);
  }
  function upsertDensity(m,s,date,flow){
    const host=doc.createElement('div');host.innerHTML=densityMarkup(s,date);const next=host.firstElementChild;if(!next)return;
    const current=m.querySelector('#garangTodayDensity');if(current)current.replaceWith(next);else{const action=flow.querySelector('.gtf-action');if(action)action.insertAdjacentElement('beforebegin',next);else flow.appendChild(next);}
  }
  function placeSupportingCards(m){
    const density=m.querySelector('#garangTodayDensity'),workout=m.querySelector('.garang-daily-workout');
    if(density&&workout&&workout.previousElementSibling!==density)density.insertAdjacentElement('afterend',workout);
  }
  function render(){
    timer=null;injectStyle();const m=main();if(!m)return;
    if(m.dataset.garangScreen!=='today'){m.querySelector('#garangTodayBrandHero')?.remove();m.querySelector('#garangTodayDensity')?.remove();return;}
    const s=state(),flow=m.querySelector('#garangTodayFlow');if(!s||!flow)return;
    const date=dateKey();decorateFlow(flow);upsertHero(m,flow);upsertDensity(m,s,date,flow);placeSupportingCards(m);
  }
  function schedule(delay=180){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(render)),delay);}
  function openRecord(){const trigger=doc.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]');if(window.GarangSimplifiedShell?.openRecordSheet)window.GarangSimplifiedShell.openRecordSheet(trigger);else window.GarangRouter?.navigate?.('log',{source:'today-density-v3',force:true});}
  doc.addEventListener('click',event=>{
    const coach=event.target.closest?.('[data-gtd-coach]');if(coach&&main()?.contains(coach)){event.preventDefault();window.GarangRouter?.navigate?.('coach',{source:'today-brand-hero',force:true});return;}
    const route=event.target.closest?.('[data-gtd-route]');if(route&&main()?.contains(route)){event.preventDefault();window.GarangRouter?.navigate?.(route.dataset.gtdRoute,{source:'today-density-v3',force:true});return;}
    const checkin=event.target.closest?.('[data-gtd-checkin]');if(checkin&&main()?.contains(checkin)){event.preventDefault();main()?.querySelector('[data-action="open-checkin"]')?.click();return;}
    const record=event.target.closest?.('[data-gtd-record]');if(record&&main()?.contains(record)){event.preventDefault();openRecord();}
  },true);
  ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:agent-write','garang:route-completed','garang:workout-intelligence-rendered'].forEach(name=>window.addEventListener(name,()=>schedule(name==='garang:state-updated'?260:140)));
  doc.documentElement.addEventListener('garang:language-changed',()=>schedule(90));
  window.addEventListener('pageshow',()=>schedule(120));
  window.GarangTodayDensityV1=Object.freeze({version:VERSION,render,schedule,todayFacts,recentItems,recentTimeline,rowDate});
  schedule(140);
})();