/* GARANG Founder v8 workout summary — presentation derived only from persisted workout truth. */
(()=>{
'use strict';
if(window.GarangFounderV8WorkoutSummary)return;
const VERSION='8.0.0';
let lastSessionId='';
const main=()=>document.getElementById('main');
function readState(){try{return window.GarangRepositories?.StateRepository?.read?.()||null}catch{return null}}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function latestSession(state){
  const workouts=Array.isArray(state?.workouts)?state.workouts:[];
  if(!workouts.length)return null;
  const ordered=[...workouts].sort((a,b)=>String(b?.createdAt||b?.updatedAt||'').localeCompare(String(a?.createdAt||a?.updatedAt||'')));
  const latest=ordered[0],sessionId=String(latest?.sessionId||'');
  const rows=sessionId?workouts.filter(row=>String(row?.sessionId||'')===sessionId):[latest];
  if(!rows.length)return null;
  return {sessionId:sessionId||String(latest?.id||latest?.createdAt||'latest'),rows};
}
function metrics(rows){
  let sets=0,volume=0,duration=0;
  for(const row of rows){
    const detail=Array.isArray(row?.setDetails)?row.setDetails:[];
    if(detail.length){
      sets+=detail.length;
      for(const set of detail)volume+=n(set?.weight??set?.w)*n(set?.reps??set?.r);
    }else{
      const count=Math.max(0,n(row?.sets));sets+=count;volume+=count*n(row?.weight)*n(row?.reps);
    }
    duration+=Math.max(0,n(row?.duration));
  }
  return {exercises:rows.length,sets,volume:Math.round(volume),duration:Math.round(duration)};
}
function renderFromState({force=false}={}){
  const m=main();if(!m||m.dataset.garangScreen!=='workout')return false;
  const session=latestSession(readState());if(!session)return false;
  if(!force&&session.sessionId===lastSessionId&&m.querySelector('.workout-result-card'))return true;
  lastSessionId=session.sessionId;
  m.querySelectorAll('.workout-result-card[data-garang-v8-actual-result="1"]').forEach(node=>node.remove());
  const value=metrics(session.rows),names=session.rows.map(row=>String(row?.name||'').trim()).filter(Boolean);
  const card=document.createElement('section');
  card.className='workout-result-card';
  card.dataset.garangV8ActualResult='1';
  card.dataset.sessionId=session.sessionId;
  card.innerHTML=`<div class="g8-result-metrics"><div><span>운동</span><strong>${value.exercises}</strong></div><div><span>세트</span><strong>${value.sets}</strong></div><div><span>볼륨</span><strong>${value.volume.toLocaleString()} kg</strong></div><div><span>시간</span><strong>${value.duration?`${value.duration}분`:'—'}</strong></div></div><div class="g8-result-exercises"><span>오늘 수행</span><strong>${esc(names.slice(0,3).join(' · ')||'운동 기록')}</strong></div>`;
  m.appendChild(card);
  card.hidden=false;
  card.style.setProperty('display','block','important');
  window.GarangFounderV8?.schedule?.();
  requestAnimationFrame(()=>window.GarangFounderV8ExactBoard?.schedule?.());
  return true;
}
function onState(event){
  if(event?.detail?.event!=='workout_saved')return;
  requestAnimationFrame(()=>renderFromState({force:true}));
}
window.addEventListener('garang:state-updated',onState,{passive:true});
window.addEventListener('garang:route-completed',()=>{if(main()?.dataset?.garangScreen==='workout'&&lastSessionId)renderFromState();},{passive:true});
window.GarangFounderV8WorkoutSummary=Object.freeze({version:VERSION,render:renderFromState});
})();
