/* GARANG V8.6 — REAL UI INTEGRATION
 * This module is intentionally wired to the existing app DB and visible UI.
 */
(function(){
  'use strict';
  const KEY='garangWorkoutSessionV86';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  const appDB=()=>window.__FitMindV6DB?window.__FitMindV6DB():null;
  const appSave=()=>window.__FitMindV6Save?window.__FitMindV6Save():localStorage.setItem('fitmind_v2',JSON.stringify(appDB()));
  const appRender=()=>{try{window.render?.()}catch(e){console.warn('[V8.6] render',e)}};
  let exerciseDB=[];
  let session=JSON.parse(localStorage.getItem(KEY)||'{"exercises":[],"startedAt":null}');
  let certState={orientation:'9:16',template:'dark',photo:null,video:false,record:null};

  function saveSession(){localStorage.setItem(KEY,JSON.stringify(session));}
  function normalize(s){return String(s||'').toLowerCase().replace(/\s+/g,'');}
  function search(q){
    const n=normalize(q);
    if(!n)return [];
    return exerciseDB
      .map(x=>({x,score:(normalize(x.exercise_name||'').startsWith(n)?3:0)+(normalize(x.exercise_name||'').includes(n)?2:0)+((x.aliases||[]).some(a=>normalize(a).includes(n))?1:0)}))
      .filter(o=>o.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(o=>o.x);
  }
  function addExercise(ex){
    if(!ex)return;
    if(!session.exercises.some(x=>x.id===ex.exercise_id))session.exercises.push({id:ex.exercise_id,name:ex.exercise_name,muscle:ex.primary_muscle||'',equipment:ex.equipment||'',sets:[]});
    saveSession(); renderSession();
  }
  function addSet(id){
    const e=session.exercises.find(x=>String(x.id)===String(id)); if(!e)return;
    e.sets.push({weight:0,reps:10}); saveSession(); renderSession();
  }
  function updateSet(id,index,key,value){
    const e=session.exercises.find(x=>String(x.id)===String(id)); if(!e)return;
    e.sets[index][key]=Number(value)||0; saveSession(); updateTotals();
  }
  function removeSet(id,index){const e=session.exercises.find(x=>String(x.id)===String(id));if(!e)return;e.sets.splice(index,1);saveSession();renderSession();}
  function removeExercise(id){session.exercises=session.exercises.filter(x=>String(x.id)!==String(id));saveSession();renderSession();}
  function summary(){
    let sets=0,volume=0;
    session.exercises.forEach(e=>e.sets.forEach(s=>{sets++;volume+=(Number(s.weight)||0)*(Number(s.reps)||0)}));
    return {exercises:session.exercises.map(e=>({...e,sets:e.sets.map(s=>({...s}))})),totalSets:sets,totalVolume:volume,date:today()};
  }
  function renderSearch(results){
    const box=document.getElementById('garang86SearchResults'); if(!box)return;
    box.innerHTML=results.length?results.map(x=>`<button type="button" class="g86-search-item" data-ex="${esc(x.exercise_id)}"><span><b>${esc(x.exercise_name)}</b><small>${esc(x.primary_muscle||'')} · ${esc(x.equipment||'')}</small></span><strong>＋</strong></button>`).join(''):'<div class="g86-empty">검색 결과가 없습니다.</div>';
    box.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>addExercise(exerciseDB.find(x=>String(x.exercise_id)===String(b.dataset.ex))));
  }
  function renderSession(){
    const root=document.getElementById('garang86Selected'); if(!root)return;
    root.innerHTML=session.exercises.length?session.exercises.map(e=>`<div class="g86-ex-card">
      <div class="g86-ex-head"><div><b>${esc(e.name)}</b><small>${esc(e.muscle)} · ${esc(e.equipment)}</small></div><button type="button" class="g86-remove-ex" data-id="${esc(e.id)}">삭제</button></div>
      <div class="g86-set-head"><span>SET</span><span>KG</span><span>REPS</span><span></span></div>
      <div class="g86-sets">${e.sets.map((s,i)=>`<div class="g86-set-row"><span>${i+1}</span><input type="number" min="0" step="0.5" value="${s.weight}" data-id="${esc(e.id)}" data-i="${i}" data-k="weight"><input type="number" min="0" value="${s.reps}" data-id="${esc(e.id)}" data-i="${i}" data-k="reps"><button type="button" class="g86-remove-set" data-id="${esc(e.id)}" data-i="${i}">×</button></div>`).join('')}</div>
      <button type="button" class="g86-add-set" data-id="${esc(e.id)}">＋ 세트 추가</button>
    </div>`).join(''):'<div class="g86-empty">아직 운동이 없습니다. 위에서 운동을 검색해 추가하세요.</div>';
    root.querySelectorAll('.g86-remove-ex').forEach(b=>b.onclick=()=>removeExercise(b.dataset.id));
    root.querySelectorAll('.g86-add-set').forEach(b=>b.onclick=()=>addSet(b.dataset.id));
    root.querySelectorAll('.g86-remove-set').forEach(b=>b.onclick=()=>removeSet(b.dataset.id,Number(b.dataset.i)));
    root.querySelectorAll('input[data-k]').forEach(i=>i.oninput=()=>updateSet(i.dataset.id,Number(i.dataset.i),i.dataset.k,i.value));
    updateTotals();
  }
  function updateTotals(){
    const s=summary();
    const q=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    q('g86TotalVolume',Math.round(s.totalVolume).toLocaleString()+' kg');
    q('g86TotalSets',s.totalSets+' 세트'); q('g86ExerciseCount',s.exercises.length+' 종');
  }
  function persistSession(){
    const d=appDB(); if(!d)return false;
    const s=summary();
    if(!s.exercises.length||!s.totalSets){alert('운동과 세트를 하나 이상 기록해줘.');return false;}
    const duration=Number(document.getElementById('g86Duration')?.value||0);
    const rpe=Number(document.getElementById('g86Rpe')?.value||0);
    const bw=Number(d.profile?.weight||0);
    const rows=s.exercises.map(e=>({
      exercise:e.name,exerciseId:e.id,primaryMuscle:e.muscle,sets:e.sets.length,reps:e.sets.reduce((a,x)=>a+(Number(x.reps)||0),0),weight:e.sets.length?Math.max(...e.sets.map(x=>Number(x.weight)||0)):0,
      setDetails:e.sets,volume:e.sets.reduce((a,x)=>a+(Number(x.weight)||0)*(Number(x.reps)||0),0),durationMin:duration,rpe,bodyWeight:bw,date:today(),note:'GARANG V8.6 운동 기록'
    }));
    rows.forEach(w=>d.workouts.push(w));
    appSave(); session={exercises:[],startedAt:null}; saveSession(); appRender();
    openCert(s);
    return true;
  }
  function ensureWorkoutUI(){
    if(document.getElementById('garang86WorkoutPanel'))return;
    const section=document.getElementById('workout'), form=document.getElementById('workoutForm'); if(!section||!form)return;
    const panel=document.createElement('div'); panel.id='garang86WorkoutPanel'; panel.className='g86-panel';
    panel.innerHTML=`<div class="g86-panel-head"><div><span class="eyebrow">GARANG V8.6</span><h3>오늘의 운동</h3><p>여러 운동을 한 번에 기록하고 바로 인증할 수 있어요.</p></div><button type="button" id="g86Reset" class="g86-quiet">초기화</button></div>
      <div class="g86-search"><input id="g86Search" placeholder="운동 검색 · 예: 벤치" autocomplete="off"><button type="button" id="g86SearchButton" aria-label="운동 DB 검색">⌕</button></div><div id="garang86SearchResults" class="g86-results"></div>
      <div id="garang86Selected" class="g86-selected"></div>
      <div class="g86-session-meta"><div><small>운동</small><b id="g86ExerciseCount">0 종</b></div><div><small>세트</small><b id="g86TotalSets">0 세트</b></div><div><small>볼륨</small><b id="g86TotalVolume">0 kg</b></div></div>
      <div class="g86-row"><input id="g86Duration" type="number" min="0" placeholder="운동시간 (분)"><input id="g86Rpe" type="number" min="1" max="10" step="0.5" placeholder="RPE (선택)"></div>
      <div class="g86-actions"><button type="button" id="g86Save" class="g86-primary">운동 기록 저장</button><button type="button" id="g86Cert" class="g86-secondary">인증하기</button></div>`;
    form.insertAdjacentElement('afterend',panel);
    form.style.display='none';
    const oldBatch=document.getElementById('fitmindBatchWorkoutCard'); if(oldBatch)oldBatch.style.display='none';
    const q=document.getElementById('g86Search'),sb=document.getElementById('g86SearchButton'); q.oninput=()=>{const v=q.value.trim();renderSearch(v?search(v):[])}; q.onfocus=()=>{if(q.value.trim())renderSearch(search(q.value))}; sb.onclick=()=>{q.focus();const v=q.value.trim();renderSearch(v?search(v):exerciseDB.slice(0,12))};
    document.getElementById('g86Save').onclick=persistSession;
    document.getElementById('g86Cert').onclick=()=>{const s=summary();if(!s.totalSets){alert('먼저 운동 기록을 입력해줘.');return}openCert(s)};
    document.getElementById('g86Reset').onclick=()=>{session={exercises:[],startedAt:null};saveSession();renderSession()};
    renderSession(); renderSearch(search(''));
  }

  function ensureShareModal(){
    if(document.getElementById('garang86CertModal'))return;
    const m=document.createElement('div');m.id='garang86CertModal';m.className='g86-modal';
    m.innerHTML=`<div class="g86-sheet"><div class="g86-modal-head"><div><span class="eyebrow">GARANG CERTIFICATE</span><h3>운동 인증</h3><small>사진이 주인공 · 기록은 보조</small></div><button type="button" id="g86Close" class="g86-quiet">닫기</button></div>
      <div class="g86-preview-wrap"><canvas id="g86Canvas"></canvas></div>
      <div class="g86-controls"><div><b>비율</b><div class="g86-buttons"><button data-orient="9:16">9:16 스토리</button><button data-orient="16:9">16:9 가로</button></div></div>
      <div><b>템플릿</b><div class="g86-buttons"><button data-template="dark">01 DARK</button><button data-template="white">02 WHITE</button><button data-template="pr">03 PR</button><button data-template="data">04 DATA</button></div></div>
      <label class="g86-upload">사진/영상 추가<input id="g86Media" type="file" accept="image/*,video/*"></label>
      <div class="g86-buttons"><button id="g86Download" class="g86-primary">이미지 저장</button><button id="g86Share" class="g86-secondary">공유</button></div></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#g86Close').onclick=()=>m.classList.remove('open');
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
    m.querySelectorAll('[data-orient]').forEach(b=>b.onclick=()=>{certState.orientation=b.dataset.orient;drawCert()});
    m.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{certState.template=b.dataset.template;drawCert()});
    m.querySelector('#g86Media').onchange=loadCertMedia;
    m.querySelector('#g86Download').onclick=downloadCert;
    m.querySelector('#g86Share').onclick=shareCert;
  }
  function openCert(record){ensureShareModal();certState.record=record;certState.photo=null;certState.video=false;document.getElementById('g86Media').value='';document.getElementById('garang86CertModal').classList.add('open');drawCert()}
  function loadCertMedia(e){
    const f=e.target.files?.[0];if(!f)return;
    if(f.type.startsWith('video/')){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(f);certState.photo=v;certState.video=true;v.onloadeddata=()=>drawCert()}
    else{const im=new Image();im.onload=()=>{certState.photo=im;certState.video=false;drawCert()};im.src=URL.createObjectURL(f)}
  }
  function recordLines(r){
    const lines=[];(r.exercises||[]).forEach(e=>lines.push(`${e.name}  ${e.sets.map(s=>`${s.weight}kg × ${s.reps}`).join('  ·  ')}`));return lines;
  }
  function drawImageCover(ctx,src,W,H){const sw=src.videoWidth||src.naturalWidth||src.width,sh=src.videoHeight||src.naturalHeight||src.height;if(!sw||!sh)return;const scale=Math.max(W/sw,H/sh),w=sw*scale,h=sh*scale;ctx.drawImage(src,(W-w)/2,(H-h)/2,w,h)}
  function drawCert(){
    const c=document.getElementById('g86Canvas');if(!c)return;const landscape=certState.orientation==='16:9';const W=landscape?1600:1080,H=landscape?900:1920;c.width=W;c.height=H;const ctx=c.getContext('2d');const r=certState.record||summary();
    let bg='#0b0b0d',fg='#fff',accent='#c9a35d';if(certState.template==='white'){bg='#f5f5f2';fg='#111';accent='#80652f'}if(certState.template==='pr'){bg='#090909';fg='#fff';accent='#d8b36a'}if(certState.template==='data'){bg='#151515';fg='#fff';accent='#d8b36a'}
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    if(certState.photo){ctx.save();ctx.globalAlpha=.78;drawImageCover(ctx,certState.photo,W,H);ctx.restore();ctx.fillStyle=landscape?'rgba(0,0,0,.58)':'rgba(0,0,0,.62)';ctx.fillRect(0,0,W,H)}
    const pad=landscape?90:70;ctx.fillStyle=fg;ctx.font=`800 ${landscape?34:30}px Arial`;ctx.fillText('G  GARANG',pad,landscape?72:80);
    ctx.fillStyle=accent;ctx.font=`900 ${landscape?72:64}px Arial`;ctx.fillText(certState.template==='pr'?'PR ACHIEVED':'WORKOUT COMPLETE',pad,landscape?185:190);
    ctx.fillStyle=fg;ctx.font=`700 ${landscape?42:38}px Arial`;ctx.fillText(r.exercises?.length===1?r.exercises[0].name.toUpperCase():"TODAY'S SESSION",pad,landscape?245:255);
    const lines=recordLines(r);ctx.font=`500 ${landscape?25:23}px Arial`;let y=landscape?315:330;lines.slice(0,landscape?7:8).forEach(line=>{ctx.fillText(line,pad,y);y+=landscape?40:38});
    const stats=`${r.totalSets||0} SETS     ${(r.totalVolume||0).toLocaleString()} KG VOLUME`;
    ctx.fillStyle=accent;ctx.font=`800 ${landscape?32:28}px Arial`;ctx.fillText(stats,pad,landscape?H-95:H-145);
    ctx.fillStyle=fg;ctx.font=`500 ${landscape?20:18}px Arial`;ctx.fillText(r.date||today(),pad,landscape?H-52:H-92);
    if(certState.template==='pr'){ctx.font=`900 ${landscape?92:82}px Arial`;ctx.fillText((r.totalVolume||0).toLocaleString()+' KG',landscape?W-520:pad,landscape?H-120:H-240)}
    document.querySelectorAll('#garang86CertModal [data-orient]').forEach(b=>b.classList.toggle('selected',b.dataset.orient===certState.orientation));document.querySelectorAll('#garang86CertModal [data-template]').forEach(b=>b.classList.toggle('selected',b.dataset.template===certState.template));
  }
  function blob(){return new Promise(resolve=>document.getElementById('g86Canvas').toBlob(resolve,'image/png',.95))}
  async function downloadCert(){const b=await blob();const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`GARANG-${certState.orientation.replace(':','x')}-certification.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function shareCert(){const b=await blob();const f=new File([b],'GARANG-certification.png',{type:'image/png'});if(navigator.share){try{await navigator.share({title:'GARANG',text:'GARANG workout',files:[f]})}catch(e){}}else downloadCert()}

  function hookRenderedWorkoutList(){
    const list=document.getElementById('workoutList');if(!list||list.dataset.g86Hook)return;list.dataset.g86Hook='1';
    const augment=()=>{list.querySelectorAll('.item').forEach((card,idx)=>{
        if(card.querySelector('.g86-record-cert'))return;
        const d=appDB()?.workouts?.slice().reverse()?.[idx];if(!d)return;
        const b=document.createElement('button');b.type='button';b.className='g86-record-cert';b.textContent='인증하기';b.onclick=()=>openCert({exercises:[{name:d.exercise,sets:d.setDetails||[{weight:d.weight||0,reps:d.reps||0}]}],totalSets:d.sets||0,totalVolume:d.volume||0,date:d.date||today()});card.appendChild(b);
      });};
    augment();
    const obs=new MutationObserver(augment);obs.observe(list,{childList:true,subtree:true});
  }
  function hookRunning(){
    const host=document.getElementById('runHistory');if(!host||host.dataset.g86Run)return;host.dataset.g86Run='1';
    const obs=new MutationObserver(()=>{host.querySelectorAll('.item,.runHistoryItem,.runItem').forEach((card,idx)=>{if(card.querySelector('.g86-run-cert'))return;const r=appDB()?.running?.slice().reverse()?.[idx]||appDB()?.runs?.slice().reverse()?.[idx];if(!r)return;const b=document.createElement('button');b.type='button';b.className='g86-run-cert';b.textContent='인증하기';b.onclick=()=>openCert({exercises:[{name:'RUN',sets:[],weight:0,reps:0}],totalSets:0,totalVolume:0,date:r.date||today(),distance:r.distance,time:r.time,pace:r.pace,calories:r.calories});card.appendChild(b)})});obs.observe(host,{childList:true,subtree:true});
  }
  function boot(){
    window.garangOpenShare=function(data){
      const d=data?.workout||data?.data||data||{};
      const rec=d.exercises?d:{exercises:[{name:d.exercise||d.name||'WORKOUT',sets:d.setDetails||[{weight:d.weight||0,reps:d.reps||0}]}],totalSets:d.sets||0,totalVolume:d.volume||0,date:d.date||today()};
      openCert(rec);
    };
    ensureWorkoutUI();ensureShareModal();hookRenderedWorkoutList();hookRunning();
    const v=document.getElementById('fitmindBuildVersion');if(v)v.textContent='GARANG V8.6.0';
    // Do not merge running data into diet; reinforce the separate navigation labels.
    const diet=document.querySelector('#mainNav button[onclick*="diet"]');const run=document.querySelector('#mainNav button[onclick*="running"]');if(diet)diet.textContent='식단';if(run)run.textContent='러닝';
    fetch('exercise-db.json').then(r=>r.json()).then(x=>{exerciseDB=Array.isArray(x)?x:[];renderSearch(search(''))}).catch(()=>{exerciseDB=window.GARANG_EXERCISE_DB||[];renderSearch(search(''))});
  }
  window.GARANGV86={version:'8.6.0',summary,searchExercises:search,addExercise,addSet,saveWorkout:persistSession,openCertification:openCert};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));else setTimeout(boot,80);
})();
