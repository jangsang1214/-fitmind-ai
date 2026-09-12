/* GARANG Today Density v2
   Brand surface for Today: quiet accumulation, Korean restraint, one check-in and factual records.
   Existing Today Action Flow remains the data/action owner. This layer only composes and styles it.
*/
(() => {
  'use strict';
  if (window.GarangTodayDensityV1) return;

  const VERSION='2.0.0';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const bridge=()=>window.GarangAgentStateBridge;
  const list=value=>Array.isArray(value)?value:[];
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const pad=value=>String(value).padStart(2,'0');
  const dateKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const rowDate=row=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10);
  const sameDate=(row,date)=>rowDate(row)===date;
  const english=()=>doc.documentElement.lang==='en';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let timer=null;

  function state(){try{return bridge()?.getLiveState?.()||bridge()?.getState?.()||null;}catch{return null;}}
  function checkins(s){return list(s?.dailyCheckins).length?list(s.dailyCheckins):list(s?.checkins);}
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
    list(s?.workouts).forEach(row=>rows.push({route:'workout',kind:'training',label:english()?'WORKOUT':'운동',title:String(row?.name||(english()?'Workout':'운동')),meta:workoutMeta(row),time:timeLabel(row),stamp:stamp(row,index++)}));
    list(s?.runs).forEach(row=>{const distance=finite(row?.distance),minutes=Math.round(durationMinutes(row));rows.push({route:'running',kind:'running',label:english()?'RUNNING':'러닝',title:english()?'Running':'러닝',meta:[distance!==null?`${distance.toFixed(2)} km`:'',minutes>0?(english()?`${minutes} min`:`${minutes}분`):''].filter(Boolean).join(' · ')||(english()?'Running record':'러닝 기록'),time:timeLabel(row),stamp:stamp(row,index++)});});
    list(s?.meals).forEach(row=>{const kcal=rowKcal(row);rows.push({route:'nutrition',kind:'nutrition',label:english()?'NUTRITION':'식단',title:mealName(row),meta:kcal>0?`${kcal.toLocaleString()} kcal`:(english()?'Meal record':'식단 기록'),time:timeLabel(row),stamp:stamp(row,index++)});});
    list(s?.body).forEach(row=>{const weight=finite(row?.weight),fat=finite(row?.fatPercent);rows.push({route:'body',kind:'body',label:english()?'BODY':'체성분',title:english()?'Body composition':'체성분',meta:[weight!==null?`${weight} kg`:'',fat!==null?`${english()?'Body fat':'체지방'} ${fat}%`:''].filter(Boolean).join(' · ')||(english()?'Body record':'체성분 기록'),time:timeLabel(row),stamp:stamp(row,index++)});});
    return rows.sort((a,b)=>b.stamp-a.stamp).slice(0,2);
  }
  function recentTimeline(s){
    const rows=recentItems(s).slice();let index=100000;
    checkins(s).forEach(row=>{
      const sleep=finite(row?.sleepHours??row?.sleep);if(sleep===null)return;
      rows.push({route:null,action:'checkin',kind:'sleep',label:english()?'RECOVERY':'수면',title:english()?'Sleep record':'수면 기록',meta:`${sleep}h`,time:timeLabel(row),stamp:stamp(row,index++)});
    });
    return rows.sort((a,b)=>b.stamp-a.stamp).slice(0,2);
  }

  function icon(kind){
    if(kind==='training')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>';
    if(kind==='running')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 8l3-2 3 3 3 1M12 10l-2 4-4 2M14 12l2 4 4 2"/></svg>';
    if(kind==='nutrition')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M4 3v5c0 2 1.3 3 3 3s3-1 3-3V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/></svg>';
    if(kind==='sleep')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.5A8 8 0 0 1 8.2 6.7 8 8 0 1 0 18 16.5Z"/></svg>';
    if(kind==='body')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 9c0-2 1.8-3 4-3s4 1 4 3l1 5h-3v7h-4v-7H7l1-5Z"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6zM9 10h6M9 14h6"/></svg>';
  }
  function metricIcon(kind){return icon(kind==='records'?'record':kind);}
  function bars(percent){
    const p=clamp(Math.round(percent||0),0,100),active=Math.max(p>0?1:0,Math.round(p/12.5));
    return `<span class="gtd2-bars" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i class="${i<active?'is-on':''}" style="--gtd-i:${i}"></i>`).join('')}</span>`;
  }
  function metric(kind,label,value,percent){return `<div class="gtd2-metric"><span class="gtd2-metric-icon">${metricIcon(kind)}</span><span class="gtd2-metric-label">${esc(label)}</span><strong>${esc(value)}</strong>${bars(percent)}</div>`;}

  function heroMarkup(facts){
    const hasAnything=facts.recordCount>0;
    const title=english()?(hasAnything?'A little more has accumulated today.':'Start today’s accumulation here.'):(hasAnything?'오늘도, 조금 쌓였습니다.':'오늘의 누적을 시작하세요.');
    const support=english()?'Small records shape the body you become.':'작은 기록이 오늘의 몸을 만듭니다.';
    return `<section id="garangTodayBrandHero" class="gtd2-hero" aria-label="${english()?'GARANG Today':'GARANG 오늘'}">
      <div class="gtd2-hero-copy"><span class="gtd2-eyebrow">TODAY / ${english()?'ACCUMULATION':'누적'}</span><h1>${esc(title)}</h1><p>${esc(support)}</p><button type="button" class="gtd2-coach" data-gtd-coach>${english()?'Open Coach':'Coach 열기'}<span aria-hidden="true">→</span></button></div>
      <div class="gtd2-ripple" aria-hidden="true"><i class="gtd2-drop-line"></i><i class="gtd2-drop"></i><span></span><small>QUIETLY<br>BECOMING.</small></div>
    </section>`;
  }
  function densityMarkup(s,date){
    const facts=todayFacts(s,date),recent=recentTimeline(s);
    const trainingValue=facts.trainingMinutes>0?(english()?`${facts.trainingMinutes} min`:`${facts.trainingMinutes}분`):(facts.trainingRows.length?(english()?`${facts.trainingRows.length} sessions`:`${facts.trainingRows.length}회`):(english()?'0 min':'0분'));
    const sleepValue=facts.sleep!==null?`${facts.sleep}h`:'—';
    const recordValue=english()?`${facts.recordCount}`:`${facts.recordCount}개`;
    const records=recent.length?recent.map((item,index)=>`<button type="button" class="gtd2-record" ${item.route?`data-gtd-route="${esc(item.route)}"`:'data-gtd-checkin'}><i class="gtd2-timeline-dot" aria-hidden="true"></i><span class="gtd2-record-icon">${icon(item.kind)}</span><span class="gtd2-record-copy"><small>${english()?'Today':'오늘'}${item.time?` · ${esc(item.time)}`:''}</small><strong>${esc(item.title)}</strong></span><em>${esc(item.meta)}</em><b aria-hidden="true">›</b></button>`).join(''):`<div class="gtd2-empty"><span class="gtd2-timeline-dot" aria-hidden="true"></span><p>${english()?'Your accumulation starts with the first saved record.':'첫 기록부터 오늘의 누적이 시작됩니다.'}</p><button type="button" data-gtd-record>${english()?'Add record':'기록하기'}</button></div>`;
    return `<section id="garangTodayDensity" class="gtd2-density" data-garang-today-density="1" aria-label="${english()?'Today accumulation and recent records':'오늘의 누적과 최근 기록'}">
      <div class="gtd2-section-head"><h2>${english()?"Today's accumulation":'오늘의 누적'}</h2><i></i><span>TODAY’S ACCUMULATION</span></div>
      <div class="gtd2-metrics">${metric('training',english()?'Training':'운동',trainingValue,(facts.trainingMinutes/60)*100)}${metric('nutrition',english()?'Nutrition':'식단',`${facts.kcal.toLocaleString()} kcal`,(facts.kcal/2000)*100)}${metric('sleep',english()?'Sleep':'수면',sleepValue,facts.sleep!==null?(facts.sleep/8)*100:0)}${metric('records',english()?'Records':'기록',recordValue,(facts.recordCount/6)*100)}</div>
      <div class="gtd2-recent"><div class="gtd2-section-head"><h2>${english()?'Recent records':'최근 기록'}</h2><i></i><span>RECENT RECORDS</span></div><div class="gtd2-records">${records}</div></div>
    </section>`;
  }

  function injectStyle(){
    if(doc.getElementById('garangTodayDensityStyle'))doc.getElementById('garangTodayDensityStyle').remove();
    const style=doc.createElement('style');style.id='garangTodayDensityStyle';style.textContent=`
#main[data-garang-screen="today"]{--gtd-accent:#79b5a3;--gtd-ink:#f2efe9;--gtd-muted:rgba(242,239,233,.42);--gtd-line:rgba(242,239,233,.09)}
#main[data-garang-screen="today"] #garangTodayBrandHero{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(124px,.75fr);gap:16px;min-height:150px;margin:0 0 24px;padding:22px 0 23px;border-bottom:1px solid var(--gtd-line);overflow:hidden}
#main[data-garang-screen="today"] .gtd2-hero-copy{position:relative;z-index:2;align-self:center;min-width:0}.gtd2-eyebrow{display:block;margin-bottom:9px;font-size:8px;font-weight:600;letter-spacing:.2em;color:var(--gtd-accent)}
#main[data-garang-screen="today"] .gtd2-hero h1{margin:0;max-width:440px;font-family:var(--font-display,"AppleMyungjo","Noto Serif KR",Georgia,serif);font-size:clamp(24px,5.8vw,36px);font-weight:400;line-height:1.18;letter-spacing:-.045em;color:var(--gtd-ink);text-wrap:balance}
#main[data-garang-screen="today"] .gtd2-hero p{margin:10px 0 0;font-size:10px;line-height:1.55;color:rgba(242,239,233,.47)}
#main[data-garang-screen="today"] .gtd2-coach{appearance:none;display:inline-flex;align-items:center;gap:13px;min-height:38px;margin-top:17px;padding:0 17px;border:1px solid rgba(121,181,163,.58);border-radius:999px;background:rgba(5,18,15,.26);color:var(--gtd-ink);font:inherit;font-size:11px;font-weight:600;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(121,181,163,.04)}
#main[data-garang-screen="today"] .gtd2-coach span{color:var(--gtd-accent);font-size:14px}.gtd2-coach:focus-visible{outline:1px solid var(--gtd-accent);outline-offset:4px}
#main[data-garang-screen="today"] .gtd2-ripple{position:relative;align-self:stretch;min-height:130px;opacity:.94;background:radial-gradient(ellipse at 52% 76%,transparent 0 12%,rgba(172,211,200,.14) 12.8% 13.6%,transparent 14.4% 20%,rgba(172,211,200,.11) 20.8% 21.6%,transparent 22.4% 30%,rgba(172,211,200,.075) 30.8% 31.6%,transparent 32.4% 42%,rgba(172,211,200,.045) 42.8% 43.7%,transparent 44.6%),linear-gradient(180deg,transparent 0 48%,rgba(121,181,163,.025) 100%)}
#main[data-garang-screen="today"] .gtd2-drop-line{position:absolute;left:52%;top:6px;width:1px;height:74px;background:linear-gradient(180deg,rgba(242,239,233,0),rgba(242,239,233,.76) 78%,rgba(121,181,163,.25))}.gtd2-drop{position:absolute;left:calc(52% - 5px);top:72px;width:10px;height:14px;border:1px solid rgba(242,239,233,.7);border-radius:52% 48% 56% 44% / 68% 68% 32% 32%;transform:rotate(45deg);box-shadow:0 0 14px rgba(121,181,163,.18)}
#main[data-garang-screen="today"] .gtd2-ripple>span{position:absolute;left:52%;top:88px;width:4px;height:28px;border-radius:50%;transform:translateX(-50%);background:linear-gradient(180deg,rgba(242,239,233,.5),rgba(121,181,163,0));filter:blur(.3px)}
#main[data-garang-screen="today"] .gtd2-ripple small{position:absolute;right:0;top:28px;font-family:Georgia,serif;font-size:6px;line-height:1.8;letter-spacing:.36em;color:rgba(242,239,233,.48)}

#main[data-garang-screen="today"] #garangTodayFlow{position:relative;margin:0 0 12px!important;padding:0!important;border:0!important;background:transparent!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{display:grid!important;grid-template-columns:minmax(116px,.82fr) minmax(0,1.18fr)!important;gap:22px!important;align-items:center!important;margin:0!important;padding:0 0 22px!important;border:0!important;border-bottom:1px solid var(--gtd-line)!important;background:transparent!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-copy{display:grid!important;gap:4px!important;margin:0 0 7px!important}.gtf-state-copy span{font-size:7px!important;line-height:1.4!important;letter-spacing:.08em!important;color:rgba(242,239,233,.35)!important}.gtf-state-copy strong{font-size:9px!important;font-weight:600!important;letter-spacing:.16em!important;color:var(--gtd-accent)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-visual{display:grid!important;place-items:center!important;width:100%!important;min-height:138px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal{position:relative!important;display:grid!important;place-items:center!important;width:128px!important;height:128px!important;max-width:100%!important;border:1px solid rgba(121,181,163,.18)!important;border-radius:50%!important;background:radial-gradient(circle at 50% 50%,rgba(5,8,8,.96) 0 30%,transparent 31%),repeating-radial-gradient(circle at 50% 50%,transparent 0 15px,rgba(121,181,163,.13) 16px,transparent 17px 23px)!important;box-shadow:0 0 34px rgba(121,181,163,.035),inset 0 0 28px rgba(0,0,0,.62)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal:before{content:"";position:absolute;inset:8px;border-radius:50%;background:conic-gradient(from -90deg,var(--gtd-accent) calc(var(--gtf-signal,0) * 1%),rgba(121,181,163,.08) 0);mask:radial-gradient(circle,transparent 0 43px,#000 44px 46px,transparent 47px);-webkit-mask:radial-gradient(circle,transparent 0 43px,#000 44px 46px,transparent 47px);filter:drop-shadow(0 0 5px rgba(121,181,163,.2))}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal>i{position:absolute!important;top:23px!important;left:50%!important;width:7px!important;height:10px!important;border:1px solid rgba(242,239,233,.62)!important;border-radius:55% 45% 60% 40%!important;transform:translateX(-50%) rotate(45deg)!important;background:transparent!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-signal em{position:relative!important;z-index:2!important;display:flex!important;align-items:baseline!important;justify-content:center!important;gap:3px!important;font-style:normal!important}.gtf-signal em b{font-family:Georgia,serif!important;font-size:32px!important;font-weight:400!important;letter-spacing:-.05em!important;color:var(--gtd-ink)!important}.gtf-signal em small{font-size:9px!important;color:rgba(242,239,233,.38)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary:after{content:"QUIET PROGRESS  ·  EVERYDAY";align-self:center;margin-top:2px;font-family:Georgia,serif;font-size:5px;letter-spacing:.32em;color:rgba(242,239,233,.34);white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual{display:grid!important;gap:0!important;min-width:0!important;border-top:0!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track{position:relative!important;display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;grid-template-rows:auto 5px!important;gap:7px 11px!important;align-items:center!important;min-height:54px!important;padding:7px 0!important;border-bottom:1px solid rgba(242,239,233,.07)!important;background:transparent!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-icon{grid-column:1!important;grid-row:1/3!important;display:grid!important;place-items:center!important;width:32px!important;height:32px!important;border:1px solid rgba(242,239,233,.12)!important;border-radius:11px!important;background:rgba(242,239,233,.012)!important;color:rgba(242,239,233,.62)!important}.gtf-track-icon svg{width:16px!important;height:16px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.25!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-copy{grid-column:2!important;grid-row:1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-width:0!important}.gtf-track-copy span{font-size:11px!important;font-weight:600!important;color:rgba(242,239,233,.82)!important}.gtf-track-copy strong{font-size:8px!important;font-weight:600!important;color:rgba(242,239,233,.42)!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-badge{grid-column:3!important;grid-row:1!important;font-size:7px!important;font-style:normal!important;color:var(--gtd-accent)!important}.gtf-track-line{grid-column:2/4!important;grid-row:2!important;position:relative!important;display:block!important;height:2px!important;overflow:hidden!important;border-radius:999px!important;background:rgba(242,239,233,.07)!important}.gtf-track-line b{position:absolute!important;inset:0 auto 0 0!important;width:calc(var(--gtf-track,0) * 1%)!important;background:linear-gradient(90deg,var(--gtd-accent),rgba(121,181,163,.45))!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual:after{content:"작은 행동의 반복이 큰 변화를 만듭니다.";display:block;margin-top:10px;text-align:right;font-size:7px;line-height:1.4;color:rgba(242,239,233,.29)}
html[lang="en"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-track-visual:after{content:"Quiet repetition becomes visible change."}

#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{position:relative!important;width:100%!important;min-height:82px!important;margin:18px 0 0!important;padding:16px 58px 15px 16px!important;border:1px solid rgba(121,181,163,.23)!important;border-radius:13px!important;background:radial-gradient(ellipse at 78% 115%,rgba(121,181,163,.13),transparent 48%),linear-gradient(115deg,rgba(242,239,233,.018),rgba(121,181,163,.018))!important;box-shadow:inset 0 1px 0 rgba(242,239,233,.025)!important;overflow:hidden!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>span{display:block!important;grid-column:auto!important;grid-row:auto!important;margin:0 0 7px!important;font-size:7px!important;font-weight:600!important;letter-spacing:.18em!important;color:var(--gtd-accent)!important;text-transform:uppercase!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>strong{display:block!important;grid-column:auto!important;grid-row:auto!important;font-family:var(--font-display,"AppleMyungjo","Noto Serif KR",Georgia,serif)!important;font-size:18px!important;font-weight:400!important;line-height:1.2!important;letter-spacing:-.035em!important;color:var(--gtd-ink)!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access>small{position:absolute!important;left:16px!important;bottom:12px!important;grid-column:auto!important;grid-row:auto!important;max-width:none!important;font-size:8px!important;line-height:1.35!important;color:rgba(242,239,233,.42)!important;text-align:left!important;white-space:nowrap!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access:before{content:"";position:absolute;right:43px;bottom:6px;width:120px;height:38px;opacity:.4;background:repeating-radial-gradient(ellipse at 100% 100%,transparent 0 9px,rgba(121,181,163,.22) 10px,transparent 11px 16px);transform:rotate(-8deg);pointer-events:none}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access:after{content:"→"!important;position:absolute!important;right:14px!important;top:50%!important;display:grid!important;place-items:center!important;width:34px!important;height:34px!important;margin:0!important;border:1px solid rgba(121,181,163,.27)!important;border-radius:50%!important;transform:translateY(-50%)!important;color:var(--gtd-accent)!important;font-size:13px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow[data-gto-phase="checked"] .gtf-checkin-access{min-height:56px!important;padding:12px 54px 11px 14px!important}.gtf-checkin-access:focus-visible{outline:1px solid rgba(121,181,163,.72)!important;outline-offset:3px!important}

#main[data-garang-screen="today"] #garangTodayDensity{margin:26px 0 0;padding:0;border:0;background:transparent}
#main[data-garang-screen="today"] .gtd2-section-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin:0 0 12px}.gtd2-section-head h2{margin:0;font-family:var(--font-display,"AppleMyungjo","Noto Serif KR",Georgia,serif);font-size:16px;font-weight:400;letter-spacing:-.035em;color:var(--gtd-ink)}.gtd2-section-head i{height:1px;background:linear-gradient(90deg,rgba(242,239,233,.18),rgba(242,239,233,.04))}.gtd2-section-head>span{font-size:5.5px;letter-spacing:.2em;color:rgba(242,239,233,.35);white-space:nowrap}
#main[data-garang-screen="today"] .gtd2-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:hidden;border:1px solid rgba(121,181,163,.18);border-radius:12px;background:linear-gradient(180deg,rgba(121,181,163,.025),rgba(242,239,233,.012))}
#main[data-garang-screen="today"] .gtd2-metric{position:relative;min-width:0;padding:13px 11px 12px;border-right:1px solid rgba(242,239,233,.065)}.gtd2-metric:last-child{border-right:0}.gtd2-metric-icon{display:inline-grid;place-items:center;width:17px;height:17px;margin-right:4px;color:rgba(242,239,233,.63);vertical-align:middle}.gtd2-metric-icon svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.35}.gtd2-metric-label{font-size:8px;color:rgba(242,239,233,.4);vertical-align:middle}.gtd2-metric strong{display:block;margin-top:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Georgia,"Times New Roman",serif;font-size:17px;font-weight:400;letter-spacing:-.03em;color:rgba(242,239,233,.9)}
#main[data-garang-screen="today"] .gtd2-bars{display:flex;align-items:flex-end;gap:3px;height:13px;margin-top:9px}.gtd2-bars i{display:block;width:2px;height:calc(4px + (var(--gtd-i) % 4) * 2px);border-radius:2px;background:rgba(242,239,233,.11)}.gtd2-bars i.is-on{background:rgba(121,181,163,.72);box-shadow:0 0 5px rgba(121,181,163,.12)}
#main[data-garang-screen="today"] .gtd2-recent{margin-top:25px}.gtd2-records{position:relative;padding-left:7px}.gtd2-records:before{content:"";position:absolute;left:5px;top:17px;bottom:17px;width:1px;background:linear-gradient(180deg,rgba(121,181,163,.5),rgba(121,181,163,.12))}
#main[data-garang-screen="today"] .gtd2-record{appearance:none;position:relative;width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) auto 12px;gap:9px;align-items:center;min-height:58px;padding:8px 0 8px 17px;border:0;border-bottom:1px solid rgba(242,239,233,.065);background:transparent;color:var(--gtd-ink);text-align:left;cursor:pointer}.gtd2-timeline-dot{position:absolute;left:-5px;top:50%;width:6px;height:6px;border-radius:50%;transform:translateY(-50%);background:var(--gtd-accent);box-shadow:0 0 0 3px rgba(121,181,163,.06)}.gtd2-record-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(242,239,233,.12);border-radius:12px;color:rgba(242,239,233,.62)}.gtd2-record-icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.3}.gtd2-record-copy{display:grid;gap:3px;min-width:0}.gtd2-record-copy small{font-size:7px;color:rgba(242,239,233,.32)}.gtd2-record-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:600;color:rgba(242,239,233,.82)}.gtd2-record em{font-size:10px;font-style:normal;color:var(--gtd-accent);white-space:nowrap}.gtd2-record>b{font-size:18px;font-weight:300;color:rgba(242,239,233,.37)}
#main[data-garang-screen="today"] .gtd2-empty{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:10px 0 10px 17px;border-bottom:1px solid rgba(242,239,233,.065)}.gtd2-empty p{margin:0;font-size:9px;line-height:1.5;color:rgba(242,239,233,.4)}.gtd2-empty button{appearance:none;border:1px solid rgba(121,181,163,.25);border-radius:999px;background:transparent;color:var(--gtd-accent);padding:7px 10px;font-size:8px;white-space:nowrap}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-action{margin-top:20px!important;padding-top:0!important;border:0!important}.gtf-next{border-color:rgba(121,181,163,.28)!important;background:rgba(121,181,163,.02)!important}

@media(max-width:600px){
#main[data-garang-screen="today"] #garangTodayBrandHero{grid-template-columns:minmax(0,1fr) 108px;gap:9px;min-height:136px;margin-bottom:18px;padding:14px 0 18px}.gtd2-hero h1{font-size:26px!important}.gtd2-hero p{font-size:9px!important;margin-top:7px!important}.gtd2-coach{margin-top:13px!important;min-height:36px!important;padding:0 14px!important}.gtd2-ripple{min-height:118px!important}.gtd2-ripple small{right:-2px!important;top:19px!important;font-size:5px!important}.gtd2-drop-line{height:62px!important}.gtd2-drop{top:60px!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:118px minmax(0,1fr)!important;gap:16px!important;padding-bottom:17px!important}.gtf-state-copy{margin-bottom:3px!important}.gtf-state-visual{min-height:126px!important}.gtf-signal{width:116px!important;height:116px!important}.gtf-signal:before{inset:7px!important;mask:radial-gradient(circle,transparent 0 38px,#000 39px 41px,transparent 42px)!important;-webkit-mask:radial-gradient(circle,transparent 0 38px,#000 39px 41px,transparent 42px)!important}.gtf-signal em b{font-size:29px!important}.gtf-state-primary:after{font-size:4.5px!important;letter-spacing:.24em!important}.gtf-track{grid-template-columns:29px minmax(0,1fr) auto!important;gap:5px 8px!important;min-height:47px!important;padding:5px 0!important}.gtf-track-icon{width:28px!important;height:28px!important;border-radius:9px!important}.gtf-track-copy span{font-size:10px!important}.gtf-track-copy strong{font-size:7px!important}.gtf-track-visual:after{margin-top:8px!important;font-size:6.5px!important}
#main[data-garang-screen="today"][data-gto="1"] #garangTodayFlow .gtf-checkin-access{min-height:76px!important;margin-top:14px!important;padding:14px 53px 14px 14px!important}.gtf-checkin-access>strong{font-size:17px!important}.gtf-checkin-access>small{left:14px!important;bottom:10px!important;font-size:7.5px!important}.gtf-checkin-access:after{right:12px!important;width:32px!important;height:32px!important}
#main[data-garang-screen="today"] #garangTodayDensity{margin-top:22px}.gtd2-section-head{gap:8px;margin-bottom:10px}.gtd2-section-head h2{font-size:15px}.gtd2-section-head>span{font-size:5px;letter-spacing:.15em}.gtd2-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.gtd2-metric{padding:11px 7px 10px}.gtd2-metric-icon{display:none}.gtd2-metric-label{font-size:7px}.gtd2-metric strong{font-size:13px;margin-top:6px}.gtd2-bars{gap:2px;margin-top:7px}.gtd2-bars i{width:1.5px}.gtd2-recent{margin-top:21px}.gtd2-record{grid-template-columns:34px minmax(0,1fr) auto 9px;gap:7px;min-height:54px;padding-left:15px}.gtd2-record-icon{width:31px;height:31px;border-radius:10px}.gtd2-record-copy strong{font-size:10px}.gtd2-record em{font-size:9px}
}
@media(max-width:350px){#main[data-garang-screen="today"] #garangTodayBrandHero{grid-template-columns:1fr 82px}.gtd2-ripple small{display:none}.gtd2-hero h1{font-size:23px!important}#main[data-garang-screen="today"] #garangTodayFlow .gtf-state{grid-template-columns:104px minmax(0,1fr)!important;gap:11px!important}.gtf-signal{width:102px!important;height:102px!important}.gtf-signal:before{mask:radial-gradient(circle,transparent 0 33px,#000 34px 36px,transparent 37px)!important;-webkit-mask:radial-gradient(circle,transparent 0 33px,#000 34px 36px,transparent 37px)!important}.gtd2-section-head>span{display:none}}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"] *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;doc.head.appendChild(style);
  }

  function decorateFlow(flow){
    if(!flow)return;
    const date=String(dateKey()).slice(5).replace('-','.');
    const label=flow.querySelector('.gtf-state-copy span');if(label)label.textContent=english()?`GARANG SCORE · Today ${date}`:`GARANG SCORE · 오늘 ${date}`;
    const title=flow.querySelector('.gtf-state-copy strong');if(title)title.textContent='GARANG';
    flow.setAttribute('data-gtd-brand-surface','2');
  }
  function upsertHero(m,facts,flow){
    const host=doc.createElement('div');host.innerHTML=heroMarkup(facts);const next=host.firstElementChild;if(!next)return;
    const current=m.querySelector('#garangTodayBrandHero');if(current)current.replaceWith(next);else flow.insertAdjacentElement('beforebegin',next);
  }
  function upsertDensity(m,s,date,flow){
    const host=doc.createElement('div');host.innerHTML=densityMarkup(s,date);const next=host.firstElementChild;if(!next)return;
    const current=m.querySelector('#garangTodayDensity');if(current)current.replaceWith(next);else{const action=flow.querySelector('.gtf-action');if(action)action.insertAdjacentElement('beforebegin',next);else flow.appendChild(next);}
  }
  function render(){
    timer=null;injectStyle();const m=main();if(!m)return;
    if(m.dataset.garangScreen!=='today'){m.querySelector('#garangTodayBrandHero')?.remove();m.querySelector('#garangTodayDensity')?.remove();return;}
    const s=state(),flow=m.querySelector('#garangTodayFlow');if(!s||!flow)return;
    const date=dateKey(),facts=todayFacts(s,date);decorateFlow(flow);upsertHero(m,facts,flow);upsertDensity(m,s,date,flow);
  }
  function schedule(delay=260){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(render)),delay);}
  function openRecord(){const trigger=doc.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]');if(window.GarangSimplifiedShell?.openRecordSheet)window.GarangSimplifiedShell.openRecordSheet(trigger);else window.GarangRouter?.navigate?.('log',{source:'today-density-v2',force:true});}
  doc.addEventListener('click',event=>{
    const coach=event.target.closest?.('[data-gtd-coach]');if(coach&&main()?.contains(coach)){event.preventDefault();window.GarangRouter?.navigate?.('coach',{source:'today-brand-hero',force:true});return;}
    const route=event.target.closest?.('[data-gtd-route]');if(route&&main()?.contains(route)){event.preventDefault();window.GarangRouter?.navigate?.(route.dataset.gtdRoute,{source:'today-density-v2',force:true});return;}
    const checkin=event.target.closest?.('[data-gtd-checkin]');if(checkin&&main()?.contains(checkin)){event.preventDefault();main()?.querySelector('[data-action="open-checkin"]')?.click();return;}
    const record=event.target.closest?.('[data-gtd-record]');if(record&&main()?.contains(record)){event.preventDefault();openRecord();}
  },true);
  ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:agent-write','garang:route-completed'].forEach(name=>window.addEventListener(name,()=>schedule(name==='garang:state-updated'?340:220)));
  doc.documentElement.addEventListener('garang:language-changed',()=>schedule(120));
  window.addEventListener('pageshow',()=>schedule(160));
  window.GarangTodayDensityV1=Object.freeze({version:VERSION,render,schedule,todayFacts,recentItems,recentTimeline});
  schedule(220);
})();