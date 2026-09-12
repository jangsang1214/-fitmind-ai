/* GARANG Today Density v1
   Restores useful Today density without duplicating Coach judgment.
   Today stays factual: current accumulation, recent records and navigation only.
   Reads canonical state and never owns writes.
*/
(() => {
  'use strict';
  if (window.GarangTodayDensityV1) return;

  const VERSION='1.0.0';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const bridge=()=>window.GarangAgentStateBridge;
  const list=value=>Array.isArray(value)?value:[];
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
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
  function todayFacts(s,date){
    const workouts=list(s?.workouts).filter(row=>sameDate(row,date));
    const runs=list(s?.runs).filter(row=>sameDate(row,date));
    const meals=list(s?.meals).filter(row=>sameDate(row,date));
    const body=list(s?.body).filter(row=>sameDate(row,date));
    const checkin=checkins(s).filter(row=>sameDate(row,date)).at(-1)||null;
    const trainingRows=[...workouts,...runs];
    const trainingMinutes=Math.round(trainingRows.reduce((sum,row)=>sum+durationMinutes(row),0));
    const kcal=Math.round(meals.reduce((sum,row)=>sum+(finite(row?.kcal)||list(row?.items).reduce((acc,item)=>acc+(finite(item?.kcal)||0),0)),0));
    const sleep=finite(checkin?.sleepHours??checkin?.sleep);
    const recordCount=workouts.length+runs.length+meals.length+body.length+(checkin?1:0);
    return {workouts,runs,meals,body,checkin,trainingRows,trainingMinutes,kcal,sleep,recordCount};
  }
  function stamp(row,index){
    const raw=row?.createdAt||row?.performedAt||row?.updatedAt||row?.date||row?.day||'';
    const value=Date.parse(raw);return Number.isFinite(value)?value:index;
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
    list(s?.workouts).forEach(row=>rows.push({route:'workout',label:english()?'WORKOUT':'운동',title:String(row?.name||(english()?'Workout':'운동')),meta:workoutMeta(row),stamp:stamp(row,index++)}));
    list(s?.runs).forEach(row=>{const distance=finite(row?.distance),minutes=Math.round(durationMinutes(row));rows.push({route:'running',label:english()?'RUNNING':'러닝',title:english()?'Running':'러닝',meta:[distance!==null?`${distance.toFixed(2)} km`:'',minutes>0?(english()?`${minutes} min`:`${minutes}분`):''].filter(Boolean).join(' · ')||(english()?'Running record':'러닝 기록'),stamp:stamp(row,index++)});});
    list(s?.meals).forEach(row=>{const kcal=Math.round(finite(row?.kcal)||list(row?.items).reduce((sum,item)=>sum+(finite(item?.kcal)||0),0));rows.push({route:'nutrition',label:english()?'NUTRITION':'식단',title:mealName(row),meta:kcal>0?`${kcal.toLocaleString()} kcal`:(english()?'Meal record':'식단 기록'),stamp:stamp(row,index++)});});
    list(s?.body).forEach(row=>{const weight=finite(row?.weight),fat=finite(row?.fatPercent);rows.push({route:'body',label:english()?'BODY':'체성분',title:english()?'Body composition':'체성분',meta:[weight!==null?`${weight} kg`:'',fat!==null?`${english()?'Body fat':'체지방'} ${fat}%`:''].filter(Boolean).join(' · ')||(english()?'Body record':'체성분 기록'),stamp:stamp(row,index++)});});
    return rows.sort((a,b)=>b.stamp-a.stamp).slice(0,2);
  }
  function injectStyle(){
    if(doc.getElementById('garangTodayDensityStyle'))return;
    const style=doc.createElement('style');style.id='garangTodayDensityStyle';style.textContent=`
#main[data-garang-screen="today"] #garangTodayDensity{margin:22px 0 0;padding:18px 0 0;border-top:1px solid rgba(242,239,233,.09)}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:12px}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-head>div{display:grid;gap:4px}.gtd-eyebrow{font-size:8px;font-weight:600;letter-spacing:.12em;color:#78aa99}.gtd-title{font-size:17px;line-height:1.25;font-weight:600;letter-spacing:-.025em;color:#f2efe9}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-link{appearance:none;border:0;background:transparent;padding:4px 0;color:rgba(242,239,233,.43);font:inherit;font-size:9px;cursor:pointer}.gtd-link:focus-visible{outline:1px solid rgba(120,170,153,.65);outline-offset:4px}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(242,239,233,.07);border-bottom:1px solid rgba(242,239,233,.07)}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric{min-width:0;padding:12px 10px 13px;border-right:1px solid rgba(242,239,233,.06)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric:last-child{border-right:0}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric span{display:block;margin-bottom:5px;font-size:8px;color:rgba(242,239,233,.38)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;color:rgba(242,239,233,.88)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric small{display:block;margin-top:3px;font-size:7px;color:rgba(120,170,153,.62)}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-recent{margin-top:20px;padding-top:16px;border-top:1px solid rgba(242,239,233,.07)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-recent .gtd-head{margin-bottom:7px}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-records{display:grid}.gtd-record-row{appearance:none;width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:11px 0;border:0;border-bottom:1px solid rgba(242,239,233,.06);background:transparent;color:#f2efe9;text-align:left;cursor:pointer}.gtd-record-row>span{grid-column:1;font-size:7px;letter-spacing:.08em;color:#78aa99}.gtd-record-row>strong{grid-column:1;font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(242,239,233,.84)}.gtd-record-row>small{grid-column:2;grid-row:1/3;font-size:8px;color:rgba(242,239,233,.34);text-align:right}.gtd-record-row:after{content:"→";grid-column:3;grid-row:1/3;color:rgba(120,170,153,.58);font-size:10px}.gtd-record-row:focus-visible{outline:1px solid rgba(120,170,153,.65);outline-offset:-1px}
#main[data-garang-screen="today"] #garangTodayDensity .gtd-empty{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid rgba(242,239,233,.06)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-empty p{margin:0;font-size:10px;line-height:1.5;color:rgba(242,239,233,.42)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-empty button{appearance:none;border:1px solid rgba(120,170,153,.28);border-radius:999px;background:transparent;color:#78aa99;padding:7px 10px;font-size:9px;white-space:nowrap}
@media(max-width:600px){#main[data-garang-screen="today"] #garangTodayDensity{margin-top:18px;padding-top:16px}#main[data-garang-screen="today"] #garangTodayDensity .gtd-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric:nth-child(2){border-right:0}#main[data-garang-screen="today"] #garangTodayDensity .gtd-metric:nth-child(-n+2){border-bottom:1px solid rgba(242,239,233,.06)}#main[data-garang-screen="today"] #garangTodayDensity .gtd-title{font-size:16px}}
`;doc.head.appendChild(style);
  }
  function metric(label,value,meta){return `<div class="gtd-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(meta)}</small></div>`;}
  function markup(s,date){
    const facts=todayFacts(s,date),recent=recentItems(s);
    const trainingValue=facts.trainingMinutes>0?(english()?`${facts.trainingMinutes} min`:`${facts.trainingMinutes}분`):(facts.trainingRows.length?(english()?`${facts.trainingRows.length} session${facts.trainingRows.length===1?'':'s'}`:`${facts.trainingRows.length}회`):(english()?'0 min':'0분'));
    const sleepValue=facts.sleep!==null?`${facts.sleep}h`:'—';
    const recordValue=english()?`${facts.recordCount}`:`${facts.recordCount}개`;
    const records=recent.length?recent.map(item=>`<button type="button" class="gtd-record-row" data-gtd-route="${esc(item.route)}"><span>${esc(item.label)}</span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></button>`).join(''):`<div class="gtd-empty"><p>${english()?'Your accumulation starts with the first saved record.':'첫 기록부터 오늘의 누적이 시작됩니다.'}</p><button type="button" data-gtd-record>${english()?'Add record':'기록하기'}</button></div>`;
    return `<section id="garangTodayDensity" data-garang-today-density="1" aria-label="${english()?'Today accumulation and recent records':'오늘의 누적과 최근 기록'}"><div class="gtd-head"><div><span class="gtd-eyebrow">ACCUMULATION / ${english()?'TODAY':'오늘'}</span><strong class="gtd-title">${english()?"Today's accumulation":'오늘의 누적'}</strong></div><button type="button" class="gtd-link" data-gtd-route="progress">${english()?'View all':'누적 보기'}</button></div><div class="gtd-metrics">${metric(english()?'Training':'운동',trainingValue,english()?'today':'오늘')}${metric(english()?'Nutrition':'식단',`${facts.kcal.toLocaleString()} kcal`,english()?`${facts.meals.length} meal${facts.meals.length===1?'':'s'}`:`${facts.meals.length}회`)}${metric(english()?'Sleep':'수면',sleepValue,facts.checkin?(english()?'check-in':'체크인'):(english()?'not checked':'미체크'))}${metric(english()?'Records':'기록',recordValue,english()?'today':'오늘')}</div><div class="gtd-recent"><div class="gtd-head"><div><span class="gtd-eyebrow">RECENT / ${english()?'LOG':'기록'}</span><strong class="gtd-title">${english()?'Recent records':'최근 기록'}</strong></div><button type="button" class="gtd-link" data-gtd-record>${english()?'Add':'기록하기'}</button></div><div class="gtd-records">${records}</div></div></section>`;
  }
  function render(){
    timer=null;injectStyle();const m=main();if(!m)return;
    if(m.dataset.garangScreen!=='today'){m.querySelector('#garangTodayDensity')?.remove();return;}
    const s=state(),flow=m.querySelector('#garangTodayFlow');if(!s||!flow)return;
    const host=doc.createElement('div');host.innerHTML=markup(s,dateKey());const next=host.firstElementChild;if(!next)return;
    const current=m.querySelector('#garangTodayDensity');if(current)current.replaceWith(next);else{const action=flow.querySelector('.gtf-action');if(action)action.insertAdjacentElement('beforebegin',next);else flow.appendChild(next);}
  }
  function schedule(delay=260){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(render)),delay);}
  function openRecord(){const trigger=doc.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]');if(window.GarangSimplifiedShell?.openRecordSheet)window.GarangSimplifiedShell.openRecordSheet(trigger);else window.GarangRouter?.navigate?.('log',{source:'today-density',force:true});}
  doc.addEventListener('click',event=>{
    const route=event.target.closest?.('[data-gtd-route]');if(route&&main()?.contains(route)){event.preventDefault();window.GarangRouter?.navigate?.(route.dataset.gtdRoute,{source:'today-density',force:true});return;}
    const record=event.target.closest?.('[data-gtd-record]');if(record&&main()?.contains(record)){event.preventDefault();openRecord();}
  },true);
  ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:agent-write','garang:route-completed'].forEach(name=>window.addEventListener(name,()=>schedule(name==='garang:state-updated'?320:220)));
  doc.documentElement.addEventListener('garang:language-changed',()=>schedule(120));
  window.addEventListener('pageshow',()=>schedule(160));
  window.GarangTodayDensityV1=Object.freeze({version:VERSION,render,schedule,todayFacts,recentItems});
  schedule(220);
})();
