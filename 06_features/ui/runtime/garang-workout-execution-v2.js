(function(){
'use strict';
if(window.__GARANG_WORKOUT_EXECUTION_V2__)return;
window.__GARANG_WORKOUT_EXECUTION_V2__=true;
const VERSION='workout-execution-v2';
let sessionStartedAt=0,restUntil=0,timer=null,pendingResult=null,lastResult=null,setSnapshot=[],liveSetDraft=[],liveDraftCount=-1,liveExercise='';

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d;}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function clock(ms){const total=Math.max(0,Math.ceil(num(ms)/1000)),m=Math.floor(total/60),s=String(total%60).padStart(2,'0');return String(m).padStart(2,'0')+':'+s;}
function bridge(){return window.GarangWorkoutExecutionBridge||null;}
function previous(){return bridge()?.previousSets?.(document.getElementById('wName')?.value)||[];}
function currentRows(){return [...document.querySelectorAll('#workoutSetDetails [data-set-row]')];}
function completedCurrent(){return currentRows().filter(row=>row.dataset.executionCompleted==='true').length;}
function refreshSetStates(){let currentClaimed=false;currentRows().forEach(row=>{const done=row.dataset.executionCompleted==='true',current=!done&&!currentClaimed;if(current)currentClaimed=true;row.classList.toggle('current-set',current);row.classList.toggle('upcoming-set',!done&&!current);row.dataset.executionState=done?'completed':current?'current':'upcoming';if(current)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');});}
function captureLiveSetRows(){liveSetDraft=currentRows().map(row=>({weight:row.querySelector('[data-set-weight]')?.value||'',reps:row.querySelector('[data-set-reps]')?.value||'',rpe:row.querySelector('[data-set-rpe]')?.value||'',completed:row.dataset.executionCompleted==='true'}));}
function snapshotSetRows(){captureLiveSetRows();setSnapshot=liveSetDraft.map(row=>({...row}));}
function restoreSetRows(){if(!setSnapshot.length)return;currentRows().forEach((row,i)=>{const saved=setSnapshot[i];if(!saved)return;const weight=row.querySelector('[data-set-weight]'),reps=row.querySelector('[data-set-reps]'),rpe=row.querySelector('[data-set-rpe]'),button=row.querySelector('[data-execution-set-complete]');if(weight)weight.value=saved.weight;if(reps)reps.value=saved.reps;if(rpe)rpe.value=saved.rpe;row.dataset.executionCompleted=saved.completed?'true':'false';row.classList.toggle('completed',saved.completed);if(button){button.classList.toggle('is-complete',saved.completed);button.textContent=saved.completed?'✓':'○';}});setSnapshot=[];captureLiveSetRows();refreshSetStates();}
function applyPrefill({details=[],weight,reps,rpe}={}){currentRows().forEach((row,i)=>{const source=details[i]||details[0]||{};const values={weight:source.weight??source.w??weight,reps:source.reps??source.r??reps,rpe:source.rpe??rpe};for(const [key,value] of Object.entries(values)){if(value===undefined||value===null||value==='')continue;const input=row.querySelector('[data-set-'+key+']');if(input)input.value=String(value);}row.dataset.executionCompleted='false';row.classList.remove('completed');const button=row.querySelector('[data-execution-set-complete]');if(button){button.classList.remove('is-complete');button.textContent='○';}});setSnapshot=[];captureLiveSetRows();refreshSetStates();updateLive();}
function draftSummary(){return bridge()?.draftSummary?.()||{exercises:0,sets:0,volume:0,unit:'kg'};}
function displayUnit(){return String(draftSummary().unit||'kg').toUpperCase();}
function ensureSession(){if(!sessionStartedAt)sessionStartedAt=Date.now();startTicker();}
function startTicker(){if(timer)return;timer=setInterval(()=>{if(!document.querySelector('.workout-execution-v2')){clearInterval(timer);timer=null;return;}updateLive();},500);}
function stopRest(){restUntil=0;updateLive();}
function startRest(){const seconds=Math.max(15,num(document.getElementById('workoutRestSeconds')?.value,90));restUntil=Date.now()+seconds*1000;updateLive();}
function updateLive(){
  const elapsed=document.getElementById('workoutExecutionElapsed');
  if(elapsed)elapsed.textContent=clock(sessionStartedAt?Date.now()-sessionStartedAt:0);
  const summary=draftSummary(),progress=document.getElementById('workoutExecutionProgress');
  if(progress)progress.textContent=(summary.sets+completedCurrent())+' SETS';
  refreshSetStates();
  const rest=document.getElementById('workoutExecutionRest'),restClock=document.getElementById('workoutExecutionRestClock'),left=Math.max(0,restUntil-Date.now());
  if(rest){rest.hidden=!left;rest.classList.toggle('active',!!left);}
  if(restClock)restClock.textContent=clock(left);
  if(restUntil&&left<=0)restUntil=0;
}
function cueText(rows){
  if(!rows.length)return '첫 기록 · 오늘의 기준을 만드세요';
  const best=rows.reduce((a,b)=>num(b.estimated1RM)>num(a.estimated1RM)?b:a,rows[0]);
  return '지난 기록 '+num(best.weight).toFixed(1)+' × '+Math.round(num(best.reps))+' · 오늘 세트와 바로 비교';
}
function previousText(row){return row?(num(row.weight).toFixed(1)+' × '+Math.round(num(row.reps))):'—';}
function refreshPrevious(rows=previous()){
  currentRows().forEach((row,i)=>{const cell=row.querySelector('.execution-previous');if(cell)cell.textContent=previousText(rows[i]);});
}
function enhanceRows(){
  const host=document.getElementById('workoutSetDetails');if(!host)return;
  const disclosure=host.closest('details');if(disclosure&&!disclosure.open)disclosure.open=true;
  if(host.hidden){window.dispatchEvent(new CustomEvent('garang:set-options-toggled',{detail:{open:true,source:VERSION}}));if(host.hidden)return;}
  host.classList.add('workout-execution-sets');
  const summary=draftSummary(),exercise=document.getElementById('wName')?.value||'';if(summary.exercises!==liveDraftCount||liveExercise&&exercise!==liveExercise){liveSetDraft=[];liveDraftCount=summary.exercises;}liveExercise=exercise;
  const prev=previous();
  currentRows().forEach((row,i)=>{
    if(row.dataset.executionEnhanced==='true')return;
    const saved=liveSetDraft[i]||null,initiallyComplete=saved?saved.completed:row.dataset.executionCompleted==='true',reps=saved?.reps??row.querySelector('[data-set-reps]')?.value??10,weight=saved?.weight??row.querySelector('[data-set-weight]')?.value??0,rpe=saved?.rpe??row.querySelector('[data-set-rpe]')?.value??8,previousValue=previousText(prev[i]);
    row.dataset.executionEnhanced='true';row.classList.add('execution-set-row');row.classList.toggle('completed',initiallyComplete);
    row.innerHTML='<b class="execution-set-index">'+(i+1)+'</b><span class="execution-previous">'+esc(previousValue)+'</span><label><span>중량</span><input data-set-weight inputmode="decimal" type="number" min="0" step="0.5" value="'+esc(weight)+'"></label><label><span>반복</span><input data-set-reps inputmode="numeric" type="number" min="1" value="'+esc(reps)+'"></label><label><span>RPE</span><input data-set-rpe inputmode="decimal" type="number" min="1" max="10" step="0.5" value="'+esc(rpe)+'"></label><button type="button" class="set-complete-button" data-execution-set-complete aria-label="'+(i+1)+'세트 완료">○</button>';
    const initialButton=row.querySelector('[data-execution-set-complete]');if(initialButton){initialButton.classList.toggle('is-complete',initiallyComplete);initialButton.textContent=initiallyComplete?'✓':'○';}
    row.querySelector('[data-execution-set-complete]')?.addEventListener('click',()=>{
      const done=row.dataset.executionCompleted==='true';row.dataset.executionCompleted=done?'false':'true';row.classList.toggle('completed',!done);const button=row.querySelector('[data-execution-set-complete]');if(button){button.classList.toggle('is-complete',!done);button.textContent=done?'○':'✓';}
      if(!done){ensureSession();startRest();}captureLiveSetRows();updateLive();
    });
  });
  refreshPrevious(prev);captureLiveSetRows();refreshSetStates();
  const heads=[...host.parentElement.querySelectorAll('.workout-set-table-head')];let head=heads.shift()||null;heads.forEach(node=>node.remove());
  if(!head){head=document.createElement('div');head.className='workout-set-table-head';head.innerHTML='<span>SET</span><span>PREVIOUS</span><span>'+esc(displayUnit())+'</span><span>REPS</span><span>RPE</span><span>✓</span>';}
  if(head.nextElementSibling!==host)host.before(head);
}
function resultCard(){
  if(!lastResult||document.querySelector('.workout-result-card'))return;
  const builder=document.querySelector('.workout-execution-v2');if(!builder)return;
  const card=document.createElement('section');card.className='card workout-result-card';
  card.innerHTML='<div class="workout-result-kicker"><span>SESSION COMPLETE</span><b>GARANG RECORDED</b></div><h2>오늘의 운동이 기록됐습니다.</h2><div class="workout-result-grid"><div><span>TIME</span><strong>'+clock(lastResult.elapsedMs)+'</strong></div><div><span>SETS</span><strong>'+Math.round(num(lastResult.sets))+'</strong></div><div><span>VOLUME</span><strong>'+Math.round(num(lastResult.volume)).toLocaleString()+'<small> '+esc(String(lastResult.unit||'kg').toUpperCase())+'</small></strong></div><div><span>EXERCISES</span><strong>'+Math.round(num(lastResult.exercises))+'</strong></div></div><p>오늘 기록은 다음 Coach 판단과 Progress 해석의 근거가 됩니다.</p>';
  const log=builder.closest('.gws-panel[data-garang-workout-surface="log"]');if(!log)return;log.appendChild(card);lastResult=null;
}
function enhance(){
  const builder=document.querySelector('.workout-builder-v2');if(!builder)return;
  builder.classList.add('workout-execution-v2');
  document.querySelector('.workout-visual-hero')?.classList.add('workout-execution-hero');
  const oldHead=builder.querySelector('.visual-section-head');
  if(oldHead){oldHead.classList.add('workout-exercise-head');const title=oldHead.querySelector('h3'),eyebrow=oldHead.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='CURRENT EXERCISE';if(title)title.textContent=document.getElementById('wName')?.value||'운동';let cue=oldHead.querySelector('.workout-previous-cue');if(!cue){cue=document.createElement('p');cue.className='workout-previous-cue';oldHead.querySelector('div')?.appendChild(cue);}cue.textContent=cueText(previous());}
  let bar=builder.querySelector('.workout-session-bar');
  if(!bar){
    bar=document.createElement('div');bar.className='workout-session-bar';
    bar.innerHTML='<div class="workout-session-live"><span><i></i> LIVE SESSION</span><strong id="workoutExecutionElapsed">00:00</strong></div><div class="workout-session-progress"><small>COMPLETED</small><b id="workoutExecutionProgress">0 SETS</b></div>';
    builder.prepend(bar);
    const finish=document.getElementById('saveWorkoutSession');if(finish){finish.classList.add('workout-finish');finish.textContent='운동 완료';bar.appendChild(finish);}
  }
  const toggle=document.getElementById('toggleSetDetails');if(toggle){toggle.setAttribute('aria-expanded','true');toggle.hidden=true;}
  const fields=document.querySelector('.workout-fields');if(fields){fields.classList.add('execution-compact-fields');const mark=(id,className)=>document.getElementById(id)?.closest('.field')?.classList.add(className);mark('wName','execution-exercise-field');mark('wSets','execution-sets-field');mark('wDuration','execution-duration-field');for(const id of ['wReps','wWeight','wRpe','wBody'])mark(id,'execution-default-field');}
  document.querySelector('.one-rm-panel')?.classList.add('execution-secondary-metric');
  const toolbar=builder.querySelector('.set-detail-toolbar');if(toolbar){toolbar.classList.add('workout-set-toolbar');const note=toolbar.querySelector('span');if(note)note.textContent='세트 완료 시 휴식 타이머가 자동 시작됩니다.';}
  enhanceRows();
  if(!document.getElementById('workoutExecutionRest')){
    const host=document.getElementById('workoutSetDetails');if(host){const rest=document.createElement('div');rest.id='workoutExecutionRest';rest.className='workout-rest-timer';rest.hidden=true;rest.innerHTML='<div><span>REST</span><strong id="workoutExecutionRestClock">01:30</strong><small>NEXT SET · 다음 세트를 준비하세요</small></div><label>휴식 <input id="workoutRestSeconds" type="number" min="15" max="600" step="15" value="90">초</label><button id="skipWorkoutRest" class="ghost small" type="button">건너뛰기</button>';host.after(rest);document.getElementById('skipWorkoutRest')?.addEventListener('click',stopRest);}}
  const add=document.getElementById('addWorkout');if(add){add.textContent='이 운동 세션에 추가';if(!add.dataset.executionSessionBound){add.dataset.executionSessionBound='true';add.addEventListener('click',()=>{if(add.dataset.executionImport!=='true')ensureSession();});}}
  const clear=document.getElementById('clearWorkoutDraft');if(clear){clear.textContent='세션 초기화';if(!clear.dataset.executionResetBound){clear.dataset.executionResetBound='true';clear.addEventListener('click',()=>{sessionStartedAt=0;restUntil=0;pendingResult=null;setSnapshot=[];liveSetDraft=[];liveDraftCount=0;stopRest();updateLive();});}}
  const name=document.getElementById('wName');if(name&&!name.dataset.executionBound){name.dataset.executionBound='true';name.addEventListener('change',()=>{liveSetDraft=[];liveExercise=name.value||'';setTimeout(enhance,0);});}
  const sets=document.getElementById('wSets');if(sets&&!sets.dataset.executionBound){sets.dataset.executionBound='true';sets.addEventListener('input',snapshotSetRows,true);sets.addEventListener('input',()=>setTimeout(()=>{enhance();restoreSetRows();updateLive();},0));}
  const setHost=document.getElementById('workoutSetDetails');if(setHost&&!setHost.dataset.executionLiveBound){setHost.dataset.executionLiveBound='true';setHost.addEventListener('input',captureLiveSetRows);}
  if(sessionStartedAt||restUntil)startTicker();
  updateLive();resultCard();
}
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-gws-step="log"]'))setTimeout(enhance,0);
  const target=event.target.closest?.('#saveWorkoutSession');if(!target)return;
  const s=draftSummary();pendingResult={...s,elapsedMs:sessionStartedAt?Date.now()-sessionStartedAt:0};
},true);
window.addEventListener('garang:state-updated',event=>{
  if(event.detail?.event!=='workout_saved'||!pendingResult)return;
  lastResult=pendingResult;pendingResult=null;sessionStartedAt=0;restUntil=0;
});
window.addEventListener('garang:screen-rendered',event=>{if(event.detail?.screen==='workout')enhance();});
if(document.querySelector('.workout-builder-v2'))enhance();
window.GarangWorkoutExecutionV2=Object.freeze({version:VERSION,enhance,applyPrefill});
})();