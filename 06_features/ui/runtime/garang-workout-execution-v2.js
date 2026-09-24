(function(){
'use strict';
if(window.__GARANG_WORKOUT_EXECUTION_V2__)return;
window.__GARANG_WORKOUT_EXECUTION_V2__=true;
const VERSION='workout-execution-v2.2';
const SESSION_KEY='garang_workout_session_v2';
let sessionStartedAt=0,restUntil=0,timer=null,pendingResult=null,lastResult=null,setSnapshot=[],liveSetDraft=[],liveSetCount=0,liveDuration='',liveDraftCount=-1,liveExercise='',restoringLiveSetCount=false,sessionHydrated=false;

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d;}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function clock(ms){const total=Math.max(0,Math.ceil(num(ms)/1000)),m=Math.floor(total/60),s=String(total%60).padStart(2,'0');return String(m).padStart(2,'0')+':'+s;}
function bridge(){return window.GarangWorkoutExecutionBridge||null;}
function metricBufferedWeight(value){const converted=bridge()?.toMetricWeight?.(value),n=Number(converted);return Number.isFinite(n)?n:num(value);}
function displayBufferedWeight(value){const shown=bridge()?.displayWeight?.(value,1);return shown===null||shown===undefined?'':String(shown);}
function persistSessionState(){try{const draft=bridge()?.sessionDraft?.()||[],context=bridge()?.sessionContext?.()||null;const active=!!(sessionStartedAt||restUntil||liveSetDraft.length||draft.length);if(!active){sessionStorage.removeItem(SESSION_KEY);return;}sessionStorage.setItem(SESSION_KEY,JSON.stringify({sessionStartedAt,restUntil,liveSetDraft,liveSetCount,liveDuration,liveDraftCount,liveExercise,draft,context,updatedAt:Date.now()}));}catch{}}
function clearPersistedSession(){try{sessionStorage.removeItem(SESSION_KEY);}catch{}}
function hydrateSessionState(){if(sessionHydrated)return false;sessionHydrated=true;try{const raw=sessionStorage.getItem(SESSION_KEY);if(!raw)return false;const saved=JSON.parse(raw);if(!saved||Date.now()-num(saved.updatedAt)>1000*60*60*24){clearPersistedSession();return false;}sessionStartedAt=num(saved.sessionStartedAt);restUntil=num(saved.restUntil);liveSetDraft=Array.isArray(saved.liveSetDraft)?saved.liveSetDraft.map(x=>({...x})):[];liveSetCount=Math.max(0,num(saved.liveSetCount,liveSetDraft.length));liveDuration=String(saved.liveDuration||'');liveDraftCount=num(saved.liveDraftCount,-1);liveExercise=String(saved.liveExercise||'');bridge()?.restoreSessionContext?.(saved.context||null);const existing=draftSummary();if(Array.isArray(saved.draft)&&saved.draft.length&&!existing.exercises){bridge()?.restoreSessionDraft?.(saved.draft);return true;}return false;}catch{clearPersistedSession();return false;}}
function estimated1RMMetric(weight,reps){const w=Math.max(0,num(weight)),r=Math.max(1,num(reps,1));return w?r===1?w:w*(1+Math.min(r,12)/30):0;}
function updateLivePR(){const builder=document.querySelector('.workout-execution-v2');if(!builder)return;let chip=builder.querySelector('.workout-live-pr');if(!chip){chip=document.createElement('div');chip.className='workout-live-pr';const head=builder.querySelector('.workout-exercise-head');head?.appendChild(chip);}if(!chip)return;const exercise=document.getElementById('wName')?.value||'',baseline=num(bridge()?.exercisePRBaseline?.(exercise));let best=0;currentRows().forEach(row=>{const w=metricBufferedWeight(row.querySelector('[data-set-weight]')?.value||0),r=num(row.querySelector('[data-set-reps]')?.value);best=Math.max(best,estimated1RMMetric(w,r));});if(baseline>0&&best>baseline+.05){chip.textContent='NEW PR · e1RM '+displayBufferedWeight(best)+' '+displayUnit();chip.hidden=false;}else chip.hidden=true;}
function previous(){return bridge()?.previousSets?.(document.getElementById('wName')?.value)||[];}
function currentRows(){return [...document.querySelectorAll('#workoutSetDetails [data-set-row]')];}
function completedCurrent(){return currentRows().filter(row=>row.dataset.executionCompleted==='true').length;}
function refreshSetStates(){let currentClaimed=false;currentRows().forEach((row,index)=>{const done=row.dataset.executionCompleted==='true',current=!done&&!currentClaimed;if(current)currentClaimed=true;row.classList.toggle('current-set',current);row.classList.toggle('upcoming-set',!done&&!current);row.dataset.executionState=done?'completed':current?'current':'upcoming';if(current)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');const button=row.querySelector('[data-execution-set-complete]');if(button){const mobile=window.matchMedia?.('(max-width: 800px)')?.matches!==false;button.classList.toggle('is-current-action',current);button.textContent=done?(mobile?'✓ 완료':'✓'):current?(mobile?'세트 완료  →':'○'):'○';button.setAttribute('aria-label',done?(index+1)+'세트 완료됨':(index+1)+'세트 완료');}const detail=row.querySelector('[data-execution-set-detail]');if(detail){detail.hidden=!current;if(!current){row.classList.remove('is-details-open');detail.setAttribute('aria-expanded','false');detail.textContent='상세';}}});}
function captureLiveSetRows(){const rows=currentRows();liveSetDraft=rows.map(row=>({weightMetric:metricBufferedWeight(row.querySelector('[data-set-weight]')?.value||0),reps:row.querySelector('[data-set-reps]')?.value||'',rpe:row.querySelector('[data-set-rpe]')?.value||'',rir:row.querySelector('[data-set-rir]')?.value||'',setType:row.querySelector('[data-set-type]')?.value||'working',completed:row.dataset.executionCompleted==='true'}));if(rows.length)liveSetCount=rows.length;const duration=document.getElementById('wDuration');if(duration?.value)liveDuration=duration.value;bridge()?.persistExecutionRows?.(liveSetDraft);persistSessionState();updateLivePR();}
function snapshotSetRows(){if(restoringLiveSetCount){setSnapshot=liveSetDraft.map(row=>({...row}));return;}captureLiveSetRows();const requested=Math.max(1,num(document.getElementById('wSets')?.value,liveSetCount||1));liveSetCount=requested;setSnapshot=liveSetDraft.slice(0,requested).map(row=>({...row}));}
function restoreSetRows(){if(!setSnapshot.length)return;currentRows().forEach((row,i)=>{const saved=setSnapshot[i];if(!saved)return;const weight=row.querySelector('[data-set-weight]'),reps=row.querySelector('[data-set-reps]'),rpe=row.querySelector('[data-set-rpe]'),rir=row.querySelector('[data-set-rir]'),setType=row.querySelector('[data-set-type]'),button=row.querySelector('[data-execution-set-complete]');if(weight)weight.value=displayBufferedWeight(saved.weightMetric??metricBufferedWeight(saved.weight??0));if(reps)reps.value=saved.reps;if(rpe)rpe.value=saved.rpe;if(rir)rir.value=saved.rir??2;if(setType)setType.value=saved.setType||'working';row.dataset.executionCompleted=saved.completed?'true':'false';row.classList.toggle('completed',saved.completed);if(button){button.classList.toggle('is-complete',saved.completed);button.textContent=saved.completed?'✓':'○';}});setSnapshot=[];captureLiveSetRows();refreshSetStates();}
function applyPrefill({details=[],weight,reps,rpe,rir,setType,duration}={}){if(duration!==undefined&&duration!==null&&duration!==''){liveDuration=String(duration);const durationInput=document.getElementById('wDuration');if(durationInput)durationInput.value=liveDuration;}currentRows().forEach((row,i)=>{const source=details[i]||details[0]||{};const values={weight:source.weight??source.w??weight,reps:source.reps??source.r??reps,rpe:source.rpe??rpe,rir:source.rir??rir,type:source.setType??setType};for(const [key,value] of Object.entries(values)){if(value===undefined||value===null||value==='')continue;const input=row.querySelector('[data-set-'+key+']');if(input)input.value=String(value);}row.dataset.executionCompleted='false';row.classList.remove('completed');const button=row.querySelector('[data-execution-set-complete]');if(button){button.classList.remove('is-complete');button.textContent='○';}});setSnapshot=[];captureLiveSetRows();refreshSetStates();updateLive();}
function draftSummary(){return bridge()?.draftSummary?.()||{exercises:0,sets:0,volume:0,unit:'kg'};}
function displayUnit(){return String(draftSummary().unit||'kg').toUpperCase();}
function ensureSession(){if(!sessionStartedAt)sessionStartedAt=Date.now();persistSessionState();startTicker();}
function startWorkoutSession(){ensureSession();updateLive();}
function finishWorkoutSession(){
  if(!sessionStartedAt)return false;
  let save=document.getElementById('saveWorkoutSession');
  if(save?.disabled&&draftSummary().exercises===0&&completedCurrent()===0){
    sessionStartedAt=0;restUntil=0;pendingResult=null;clearPersistedSession();
    if(timer){clearInterval(timer);timer=null;}
    updateLive();
    return true;
  }
  if(save?.disabled){
    const add=document.getElementById('addWorkout');
    if(add&&!add.disabled){
      add.click();
      save=document.getElementById('saveWorkoutSession');
    }
  }
  if(!save||save.disabled)return false;
  save.click();
  return true;
}
function startTicker(){if(timer)return;timer=setInterval(()=>{if(!document.querySelector('.workout-execution-v2')){clearInterval(timer);timer=null;return;}updateLive();},500);}
function hardHideCanonicalSave(){const save=document.getElementById('saveWorkoutSession');if(!save)return null;save.classList.add('workout-canonical-save');save.hidden=true;save.setAttribute('aria-hidden','true');save.tabIndex=-1;save.style.setProperty('display','none','important');save.style.setProperty('pointer-events','none','important');return save;}
function stopRest(){restUntil=0;persistSessionState();updateLive();}
function startRest(setType='working'){const custom=Math.max(15,num(document.getElementById('workoutRestSeconds')?.value,90)),type=String(setType||'working');if(type==='drop'){restUntil=0;persistSessionState();updateLive();return;}const seconds=type==='warmup'?Math.min(custom,60):type==='failure'?Math.max(custom,120):custom;restUntil=Date.now()+seconds*1000;persistSessionState();updateLive();}
function updateLive(){
  const elapsed=document.getElementById('workoutExecutionElapsed');
  if(elapsed)elapsed.textContent=clock(sessionStartedAt?Date.now()-sessionStartedAt:0);
  const active=!!sessionStartedAt,stateLabel=document.getElementById('workoutExecutionState'),start=document.getElementById('startWorkoutSession'),finish=document.getElementById('finishWorkoutSession');
  if(stateLabel)stateLabel.textContent=active?'LIVE SESSION':'READY';
  if(start){start.hidden=active;start.disabled=active;}
  if(finish){finish.hidden=!active;finish.disabled=!active;}
  const summary=draftSummary(),progress=document.getElementById('workoutExecutionProgress');
  if(progress)progress.textContent=(summary.sets+completedCurrent())+' SETS';
  refreshSetStates();
  const group=bridge()?.groupExecutionContext?.(),groupCue=document.getElementById('workoutGroupExecutionCue');if(groupCue){groupCue.hidden=!group;if(group)groupCue.textContent=String(group.groupType||'group').toUpperCase()+' '+String(group.groupId||'')+' · ROUND '+Math.min(group.rounds,group.round+1)+'/'+group.rounds+' · '+String(group.members?.[group.position]?.name||'');}
  const rest=document.getElementById('workoutExecutionRest'),restClock=document.getElementById('workoutExecutionRestClock'),left=Math.max(0,restUntil-Date.now());
  if(rest){rest.hidden=!left;rest.classList.toggle('active',!!left);}
  if(restClock)restClock.textContent=clock(left);
  if(restUntil&&left<=0)restUntil=0;
}
function targetFor(row){
  if(!row)return null;
  const exercise=document.getElementById('wName')?.value||'',context=bridge()?.progressionContext?.(exercise)||{},readinessScore=context?.readiness?.score,readiness=readinessScore===null||readinessScore===undefined?NaN:num(readinessScore,NaN),recent=Array.isArray(context?.recent)?context.recent:[],rpe=num(row.rpe,8),rir=num(row.rir,Math.max(0,10-rpe)),base=num(row.weightMetric,metricBufferedWeight(row.weight)),setType=String(row.setType||'working'),step=base>=100?2.5:base>=40?1.25:0.5;
  const recentTrend=recent.length>=2&&num(recent[1].estimated1RMMetric)>0?(num(recent[0].estimated1RMMetric)-num(recent[1].estimated1RMMetric))/num(recent[1].estimated1RMMetric):0;
  let delta=0,reason='지난 수행 유지';
  if(setType==='warmup'){reason='워밍업 기준 유지';}
  else if(setType==='drop'){reason='드롭 세트 유지';}
  else if(setType==='failure'||rpe>=9.5||rir<=0){delta=-step;reason='실패/고강도 피로 반영';}
  else if(Number.isFinite(readiness)&&readiness<50){delta=-step;reason='오늘 readiness 보호';}
  else if(rpe<=8&&rir>=2&&recentTrend>=-.03){delta=step;reason=recent.length>=2?'최근 추세 + 여유 반영':'지난 세트 여유 반영';}
  else if(recentTrend<-.05){delta=-step;reason='최근 성능 하락 반영';}
  const weightMetric=Math.max(0,base+delta),reps=Math.max(1,Math.round(num(row.reps,8)+(Number.isFinite(readiness)&&readiness>=80&&rpe<=7.5&&rir>=3?1:0)));
  return {weightMetric,reps,reason};
}
function cueText(rows){
  if(!rows.length)return '첫 기록 · 오늘의 기준을 만드세요';
  const best=rows.reduce((a,b)=>num(b.estimated1RM)>num(a.estimated1RM)?b:a,rows[0]),target=targetFor(best);
  return '지난 '+num(best.weight).toFixed(1)+' × '+Math.round(num(best.reps))+' → GARANG '+displayBufferedWeight(target.weightMetric)+' × '+target.reps+' · '+target.reason;
}
function previousText(row){return row?(num(row.weight).toFixed(1)+' × '+Math.round(num(row.reps))):'—';}
function refreshPrevious(rows=previous()){
  currentRows().forEach((row,i)=>{const cell=row.querySelector('.execution-previous');if(cell)cell.textContent=previousText(rows[i]);});
}
function changeSetCount(nextCount,removeIndex=null){const sets=document.getElementById('wSets');if(!sets)return;captureLiveSetRows();if(Number.isInteger(removeIndex)&&removeIndex>=0&&removeIndex<liveSetDraft.length)liveSetDraft.splice(removeIndex,1);liveSetCount=Math.max(1,num(nextCount,1));setSnapshot=liveSetDraft.slice(0,liveSetCount).map(row=>({...row}));restoringLiveSetCount=true;sets.value=String(liveSetCount);sets.dispatchEvent(new Event('input',{bubbles:true}));restoringLiveSetCount=false;persistSessionState();}
function replaceSetPlan(rows=[]){
  if(!Array.isArray(rows)||!rows.length)return false;
  const sets=document.getElementById('wSets');if(!sets)return false;
  liveSetDraft=rows.map(row=>({weightMetric:Math.max(0,num(row.weightMetric??row.weight)),reps:String(Math.max(1,num(row.reps,1))),rpe:String(num(row.rpe,8)),rir:String(num(row.rir,2)),setType:String(row.setType||'working'),completed:false}));
  liveSetCount=liveSetDraft.length;setSnapshot=liveSetDraft.map(row=>({...row}));restoringLiveSetCount=true;sets.value=String(liveSetCount);sets.dispatchEvent(new Event('input',{bubbles:true}));restoringLiveSetCount=false;persistSessionState();setTimeout(()=>{enhance();restoreSetRows();updateLive();},0);return true;
}
function enhanceRows(){
  const host=document.getElementById('workoutSetDetails');if(!host)return;
  const disclosure=host.closest('details');if(disclosure&&!disclosure.open)disclosure.open=true;
  if(host.hidden){window.dispatchEvent(new CustomEvent('garang:set-options-toggled',{detail:{open:true,source:VERSION}}));if(host.hidden)return;}
  host.classList.add('workout-execution-sets');
  const summary=draftSummary(),exercise=document.getElementById('wName')?.value||'',rowsBefore=currentRows(),seededEdit=rowsBefore.some(row=>row.dataset.executionCompleted==='true'&&!row.dataset.executionEnhanced),durationInput=document.getElementById('wDuration');if(liveExercise&&exercise!==liveExercise){liveSetDraft=[];liveSetCount=0;}if(liveDraftCount>=0&&summary.exercises>liveDraftCount){liveSetDraft=[];liveSetCount=0;liveDuration='';}if(seededEdit){liveSetDraft=[];liveSetCount=Math.max(1,num(document.getElementById('wSets')?.value,rowsBefore.length||1));if(durationInput?.value)liveDuration=durationInput.value;}liveDraftCount=summary.exercises;liveExercise=exercise;if(liveDuration&&durationInput)durationInput.value=liveDuration;
  const setsInput=document.getElementById('wSets');if(liveSetCount>0&&setsInput&&(Math.max(1,num(setsInput.value,1))!==liveSetCount||currentRows().length!==liveSetCount)){restoringLiveSetCount=true;setsInput.value=String(liveSetCount);setsInput.dispatchEvent(new Event('input',{bubbles:true}));restoringLiveSetCount=false;}
  const prev=previous();
  currentRows().forEach((row,i)=>{
    if(row.dataset.executionEnhanced==='true')return;
    const saved=liveSetDraft[i]||null,initiallyComplete=saved?saved.completed:row.dataset.executionCompleted==='true',target=targetFor(prev[i]),existingWeight=row.querySelector('[data-set-weight]')?.value??0,reps=saved?.reps??row.querySelector('[data-set-reps]')?.value??target?.reps??10,weight=saved?displayBufferedWeight(saved.weightMetric??metricBufferedWeight(saved.weight??0)):(seededEdit?existingWeight:(target?displayBufferedWeight(target.weightMetric):existingWeight)),rpe=saved?.rpe??row.querySelector('[data-set-rpe]')?.value??8,rir=saved?.rir??row.querySelector('[data-set-rir]')?.value??prev[i]?.rir??2,setType=saved?.setType??row.querySelector('[data-set-type]')?.value??prev[i]?.setType??'working',previousValue=previousText(prev[i]),targetValue=target?(displayBufferedWeight(target.weightMetric)+' × '+target.reps):'—';
    row.dataset.executionEnhanced='true';row.classList.add('execution-set-row');row.classList.toggle('completed',initiallyComplete);
    row.innerHTML='<b class="execution-set-index">'+(i+1)+'</b><span class="execution-previous">'+esc(previousValue)+'</span><span class="execution-target">'+esc(targetValue)+'</span><label class="execution-field execution-type-field"><span>TYPE</span><select data-set-type><option value="working"'+(setType==='working'?' selected':'')+'>WORK</option><option value="warmup"'+(setType==='warmup'?' selected':'')+'>WARM</option><option value="drop"'+(setType==='drop'?' selected':'')+'>DROP</option><option value="failure"'+(setType==='failure'?' selected':'')+'>FAIL</option></select></label><label class="execution-field execution-weight-field"><span>중량</span><input data-set-weight inputmode="decimal" type="number" min="0" step="0.5" value="'+esc(weight)+'"></label><label class="execution-field execution-reps-field"><span>반복</span><input data-set-reps inputmode="numeric" type="number" min="1" value="'+esc(reps)+'"></label><label class="execution-field execution-rpe-field"><span>RPE</span><input data-set-rpe inputmode="decimal" type="number" min="1" max="10" step="0.5" value="'+esc(rpe)+'"></label><label class="execution-field execution-rir-field"><span>RIR</span><input data-set-rir inputmode="numeric" type="number" min="0" max="10" step="1" value="'+esc(rir)+'"></label><button type="button" class="set-delete-button" data-execution-set-delete aria-label="'+(i+1)+'세트 삭제">×</button><button type="button" class="set-complete-button" data-execution-set-complete aria-label="'+(i+1)+'세트 완료">○</button><button type="button" class="set-detail-toggle" data-execution-set-detail aria-expanded="false">상세</button>';
    const initialButton=row.querySelector('[data-execution-set-complete]');if(initialButton){initialButton.classList.toggle('is-complete',initiallyComplete);initialButton.textContent=initiallyComplete?'✓':'○';}
    row.querySelector('[data-execution-set-delete]')?.addEventListener('click',()=>{if(currentRows().length<=1)return;changeSetCount(currentRows().length-1,i);});
    row.querySelector('[data-execution-set-detail]')?.addEventListener('click',()=>{
      const open=!row.classList.contains('is-details-open');
      row.classList.toggle('is-details-open',open);
      const button=row.querySelector('[data-execution-set-detail]');
      if(button){button.setAttribute('aria-expanded',open?'true':'false');button.textContent=open?'접기':'상세';}
    });
    row.querySelector('[data-execution-set-complete]')?.addEventListener('click',()=>{
      const done=row.dataset.executionCompleted==='true';row.dataset.executionCompleted=done?'false':'true';row.classList.toggle('completed',!done);const button=row.querySelector('[data-execution-set-complete]');if(button){button.classList.toggle('is-complete',!done);button.textContent=done?'○':'✓';}
      if(!done)ensureSession();captureLiveSetRows();const grouped=!done?bridge()?.nextGroupedExecution?.(i):null;if(!done&&grouped){if(grouped.groupComplete){stopRest();}else{if(grouped.roundEnded)startRest(row.querySelector('[data-set-type]')?.value||'working');else stopRest();setTimeout(()=>bridge()?.activateGroupedExercise?.(grouped.target.index),0);}}else if(!done)startRest(row.querySelector('[data-set-type]')?.value||'working');updateLive();
    });
  });
  refreshPrevious(prev);captureLiveSetRows();refreshSetStates();
  const headerScope=host.closest('.gws-panel[data-garang-workout-surface="log"]')||host.parentElement;
  [...headerScope.querySelectorAll('.workout-set-table-head')].forEach(node=>node.remove());
  const head=document.createElement('div');head.className='workout-set-table-head';head.innerHTML='<span>SET</span><span>PREVIOUS</span><span>TARGET</span><span>TYPE</span><span>'+esc(displayUnit())+'</span><span>REPS</span><span>RPE</span><span>RIR</span><span>DEL</span><span>✓</span>';host.prepend(head);
}
function resultCard(){
  if(!lastResult||document.querySelector('.workout-result-card'))return;
  const builder=document.querySelector('.workout-execution-v2');if(!builder)return;
  const card=document.createElement('section');card.className='card workout-result-card';
  card.innerHTML='<div class="workout-result-kicker"><span>SESSION COMPLETE</span><b>GARANG RECORDED</b></div><h2>오늘의 운동이 기록됐습니다.</h2><div class="workout-result-grid"><div><span>TIME</span><strong>'+clock(lastResult.elapsedMs)+'</strong></div><div><span>SETS</span><strong>'+Math.round(num(lastResult.sets))+'</strong></div><div><span>VOLUME</span><strong>'+Math.round(num(lastResult.volume)).toLocaleString()+'<small> '+esc(String(lastResult.unit||'kg').toUpperCase())+'</small></strong></div><div><span>EXERCISES</span><strong>'+Math.round(num(lastResult.exercises))+'</strong></div></div><p>오늘 기록은 다음 Coach 판단과 Progress 해석의 근거가 됩니다.</p><div class="workout-result-pr" id="workoutResultPr"></div>';
  const log=builder.closest('.gws-panel[data-garang-workout-surface="log"]');if(!log)return;log.appendChild(card);const pr=card.querySelector('#workoutResultPr'),comparisons=Array.isArray(lastResult.prComparisons)?lastResult.prComparisons:[];if(pr&&comparisons.length){const improved=comparisons.filter(x=>num(x.sessionMetric)>num(x.baselineMetric)+.05),pool=improved.length?improved:comparisons,best=pool.reduce((a,b)=>num(b.sessionMetric)>num(a.sessionMetric)?b:a,pool[0]),shown=bridge()?.displayWeight?.(best.sessionMetric,1)??best.sessionMetric;pr.textContent=improved.length?('NEW PR · '+improved.map(x=>x.name).join(', ')+' · 최고 estimated 1RM '+shown+' '+displayUnit()):('PR 유지 · 최고 estimated 1RM '+shown+' '+displayUnit());}lastResult=null;
}
function enhance(){
  const builder=document.querySelector('.workout-builder-v2');if(!builder)return;
  if(hydrateSessionState()){setTimeout(enhance,0);return;}
  builder.classList.add('workout-execution-v2');
  document.querySelector('.workout-visual-hero')?.classList.add('workout-execution-hero');
  const oldHead=builder.querySelector('.visual-section-head');
  if(oldHead){oldHead.classList.add('workout-exercise-head');const exerciseName=document.getElementById('wName')?.value||'운동',title=oldHead.querySelector('h3'),eyebrow=oldHead.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='CURRENT EXERCISE';if(title)title.textContent=exerciseName;let cue=oldHead.querySelector('.workout-previous-cue');if(!cue){cue=document.createElement('p');cue.className='workout-previous-cue';oldHead.querySelector('div')?.appendChild(cue);}cue.textContent=cueText(previous());let note=oldHead.querySelector('.workout-previous-note');const previousNote=String(bridge()?.previousContext?.(exerciseName)?.notes||'').trim();if(previousNote&&!note){note=document.createElement('p');note.className='workout-previous-note';oldHead.querySelector('div')?.appendChild(note);}if(note){note.hidden=!previousNote;note.textContent=previousNote?('LAST NOTE · '+previousNote):'';}}
  let bar=builder.querySelector('.workout-session-bar');
  if(!bar){
    bar=document.createElement('div');bar.className='workout-session-bar';
    bar.innerHTML='<div class="workout-session-live"><span><i></i><b id="workoutExecutionState">READY</b></span><strong id="workoutExecutionElapsed">00:00</strong></div><div class="workout-session-controls" role="group" aria-label="운동 세션 제어"><button id="startWorkoutSession" class="workout-session-icon workout-start" type="button" aria-label="운동 시작" title="운동 시작"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5.5 18.5 12 8 18.5Z"/></svg></button><button id="finishWorkoutSession" class="workout-session-icon workout-finish" type="button" aria-label="운동 종료 및 저장" title="운동 종료 및 저장" hidden disabled><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg></button></div><div class="workout-session-progress"><small>SESSION</small><b id="workoutExecutionProgress">0 SETS</b></div><div id="workoutGroupExecutionCue" class="workout-group-execution-cue" hidden></div>';
    builder.prepend(bar);
    bar.querySelector('#startWorkoutSession')?.addEventListener('click',startWorkoutSession);
    bar.querySelector('#finishWorkoutSession')?.addEventListener('click',finishWorkoutSession);
    hardHideCanonicalSave();
  }
  hardHideCanonicalSave();
  const toggle=document.getElementById('toggleSetDetails');if(toggle){toggle.setAttribute('aria-expanded','true');toggle.hidden=true;}
  const fields=document.querySelector('.workout-fields');if(fields){fields.classList.add('execution-compact-fields');const mark=(id,className)=>document.getElementById(id)?.closest('.field')?.classList.add(className);mark('wName','execution-exercise-field');mark('wSets','execution-sets-field');mark('wDuration','execution-duration-field');for(const id of ['wReps','wWeight','wRpe','wBody'])mark(id,'execution-default-field');}
  document.querySelector('.one-rm-panel')?.classList.add('execution-secondary-metric');
  const toolbar=builder.querySelector('.set-detail-toolbar');if(toolbar){toolbar.classList.add('workout-set-toolbar');const note=toolbar.querySelector('span');if(note)note.textContent='세트 완료 시 휴식 타이머가 자동 시작됩니다.';if(!toolbar.querySelector('[data-execution-add-set]')){const addSet=document.createElement('button');addSet.type='button';addSet.className='ghost small';addSet.dataset.executionAddSet='true';addSet.textContent='+ 세트';addSet.addEventListener('click',()=>changeSetCount(currentRows().length+1));toolbar.appendChild(addSet);}}
  enhanceRows();
  if(!document.getElementById('workoutExecutionRest')){
    const host=document.getElementById('workoutSetDetails');if(host){const rest=document.createElement('div');rest.id='workoutExecutionRest';rest.className='workout-rest-timer';rest.hidden=true;rest.innerHTML='<div><span>REST</span><strong id="workoutExecutionRestClock">01:30</strong><small>NEXT SET · 다음 세트를 준비하세요</small></div><label>휴식 <input id="workoutRestSeconds" type="number" min="15" max="600" step="15" value="90">초</label><button id="skipWorkoutRest" class="ghost small" type="button">건너뛰기</button>';host.after(rest);document.getElementById('skipWorkoutRest')?.addEventListener('click',stopRest);}}
  const add=document.getElementById('addWorkout');if(add)add.textContent='이 운동 세션에 추가';
  const clear=document.getElementById('clearWorkoutDraft');if(clear)clear.textContent='세션 초기화';
  const name=document.getElementById('wName');if(name&&!name.dataset.executionBound){name.dataset.executionBound='true';name.addEventListener('change',()=>{liveSetDraft=[];liveSetCount=0;setSnapshot=[];liveExercise=name.value||'';bridge()?.resetExerciseRows?.();setTimeout(enhance,0);});}
  const sets=document.getElementById('wSets');if(sets&&!sets.dataset.executionBound){sets.dataset.executionBound='true';sets.addEventListener('input',snapshotSetRows,true);sets.addEventListener('input',()=>setTimeout(()=>{enhance();restoreSetRows();updateLive();},0));}
  const setHost=document.getElementById('workoutSetDetails');if(setHost&&!setHost.dataset.executionLiveBound){setHost.dataset.executionLiveBound='true';setHost.addEventListener('input',captureLiveSetRows);}
  if(sessionStartedAt||restUntil)startTicker();
  updateLive();updateLivePR();persistSessionState();resultCard();
}
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-gws-step="log"]'))setTimeout(enhance,0);
  if(event.target.closest?.('#addWorkout')){
    setTimeout(()=>{
      const drawer=document.getElementById('garangWorkoutTools');
      if(drawer)drawer.open=false;
      const action=document.querySelector('#workoutDraftArea [data-edit-workout],#workoutDraftArea [data-execute-workout]');
      action?.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
    },120);
  }
  const target=event.target.closest?.('#saveWorkoutSession');if(!target)return;
  const s=draftSummary(),prComparisons=bridge()?.draftPRComparisons?.()||[];pendingResult={...s,prComparisons,elapsedMs:sessionStartedAt?Date.now()-sessionStartedAt:0};
},true);
window.addEventListener('garang:state-updated',event=>{
  if(event.detail?.event!=='workout_saved'||!pendingResult)return;
  lastResult=pendingResult;pendingResult=null;sessionStartedAt=0;restUntil=0;setSnapshot=[];liveSetDraft=[];liveSetCount=0;liveDuration='';liveDraftCount=0;liveExercise='';clearPersistedSession();
});
window.addEventListener('garang:workout-session-clearing',()=>{sessionStartedAt=0;restUntil=0;pendingResult=null;setSnapshot=[];liveSetDraft=[];liveSetCount=0;liveDuration='';liveDraftCount=0;liveExercise='';clearPersistedSession();stopRest();updateLive();});
window.addEventListener('garang:workout-exercise-added',()=>{updateLive();persistSessionState();});
window.addEventListener('garang:workout-set-rows-rendered',()=>{enhanceRows();updateLive();});
window.addEventListener('garang:screen-rendered',event=>{if(event.detail?.screen==='workout')enhance();});
if(document.querySelector('.workout-builder-v2'))enhance();
window.GarangWorkoutExecutionV2=Object.freeze({version:VERSION,enhance,applyPrefill,replaceSetPlan,startWorkoutSession,finishWorkoutSession});
})();