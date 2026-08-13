/* GARANG V8.8 — real integration hotfix
   Final layer loaded after legacy V5/V7/V8/V8.6 scripts.
*/
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const today=()=>new Date().toISOString().slice(0,10);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function db(){try{return typeof window.__FitMindV6DB==='function'?window.__FitMindV6DB():null}catch(e){return null}}
  function save(){try{if(typeof window.__FitMindV6Save==='function')window.__FitMindV6Save();else if(typeof window.save==='function')window.save()}catch(e){}}

  function version(){
    const v=$('fitmindBuildVersion'); if(v)v.textContent='GARANG V8.8.0';
    document.title='GARANG · Your personal AI coach · V8.8.0';
  }

  function authFix(){
    document.querySelectorAll('#loginForm input,#signupForm input').forEach(i=>{
      i.style.color='#111'; i.style.background='#fff'; i.style.opacity='1'; i.style.visibility='visible';
      i.style.webkitTextFillColor='#111';
    });
    document.querySelectorAll('#googleBtn,#appleBtn').forEach((b,i)=>{
      b.hidden=false; b.style.display='flex'; b.style.visibility='visible'; b.style.opacity='1';
      b.style.color='#111'; b.style.background='#fff'; b.style.webkitTextFillColor='#111';
      b.style.border='1px solid #d9dce2'; b.style.minHeight='52px'; b.style.alignItems='center'; b.style.justifyContent='center';
      b.style.fontWeight='800'; b.style.fontSize='15px'; b.textContent=i===0?'Google로 계속하기':'Apple로 계속하기';
    });
    const terms=$('terms'); if(terms){terms.style.width='22px';terms.style.height='22px';terms.style.opacity='1';terms.style.visibility='visible'}
  }

  function forcePage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    const diet=$('diet'), running=$('running');
    if(id==='diet'){
      if(diet){diet.classList.add('active');diet.style.display='block';}
      if(running){running.classList.remove('active');running.style.display='none';}
    }
    if(id==='running'){
      if(running){running.classList.add('active');running.style.display='block';}
      if(diet){diet.classList.remove('active');diet.style.display='none';}
    }
    document.querySelectorAll('#mainNav button').forEach(b=>b.classList.remove('active'));
    const target=document.querySelector(`#mainNav button[onclick*="'${id}'"]`); if(target)target.classList.add('active');
    window.scrollTo(0,0);
  }
  function navFix(){
    const base=window.openPage;
    if(!base||base.__garang88)return;
    function wrapped(id){
      try{base(id)}catch(e){console.warn('[GARANG 8.8] base openPage',e)}
      forcePage(id);
      if(id==='diet')setTimeout(renderDietOnly,0);
      if(id==='running')setTimeout(()=>window.garangRenderRuns&&window.garangRenderRuns(),0);
    }
    wrapped.__garang88=true; window.openPage=wrapped;
  }

  function renderDietOnly(){
    const diet=$('diet'); if(!diet)return;
    // The diet page is an isolated nutrition surface. Running belongs only to #running.
    diet.querySelectorAll('[id*="run" i],[class*="run" i]').forEach(el=>{
      if(el.id==='diet' || el.closest('#running'))return;
      if(/run|pace|gps|러닝|달리기|거리/i.test((el.id||'')+' '+(el.className||'')+' '+(el.textContent||''))){
        if(!el.closest('#mealForm') && !el.closest('#fitmindBatchMealCard') && !el.closest('#mealList') && !el.closest('#fitmindDietOnlyTodayIntake')) el.remove();
      }
    });
    const title=diet.querySelector('.pageTitle h2'); if(title)title.textContent='식단';
    const eye=diet.querySelector('.pageTitle .eyebrow'); if(eye)eye.textContent='NUTRITION';
  }

  function workoutRecordToCert(w){
    const details=Array.isArray(w?.setDetails)?w.setDetails:[];
    const sets=details.length?details.map(s=>({weight:Number(s.weight||s.load||0),reps:Number(s.reps||0)})):Array.from({length:Number(w?.sets||0)},()=>({weight:Number(w?.weight||w?.load||0),reps:Number(w?.reps||0)}));
    return {type:'workout',date:w?.date||today(),exercises:[{name:w?.exercise||w?.name||'WORKOUT',sets}],totalSets:Number(w?.sets||sets.length||0),totalVolume:Number(w?.volume||w?.totalVolume||sets.reduce((a,s)=>a+s.weight*s.reps,0)),duration:Number(w?.duration||w?.durationMin||0),calories:Number(w?.calories||0)};
  }
  function lastSavedWorkout(){const d=db();const arr=d?.workouts||[];return arr.length?workoutRecordToCert(arr[arr.length-1]):null}

  function addCertButtons(){
    const list=$('workoutList'); if(!list)return;
    const d=db(); const arr=(d?.workouts||[]).slice().reverse();
    const cards=[...list.children];
    cards.forEach((card,i)=>{
      if(card.querySelector('.g88-cert-btn'))return;
      const rec=arr[i]; if(!rec)return;
      const b=document.createElement('button'); b.type='button'; b.className='g88-cert-btn'; b.textContent='인증하기';
      b.onclick=()=>window.garangOpenShare?window.garangOpenShare(workoutRecordToCert(rec)):window.GARANGV86?.openCertification?.(workoutRecordToCert(rec));
      card.appendChild(b);
    });
  }

  function certEnhance(){
    const old=window.garangOpenShare;
    if(!old||old.__garang88)return;
    function open(data){
      const d=data||{};
      const rec=d.type==='run'||d.run?{type:'run',date:d.date||today(),distance:Number(d.distance||d.run?.distance||0),time:d.time||d.run?.time||'00:00',pace:d.pace||d.run?.pace||'--:--',calories:Number(d.calories||d.run?.calories||0)}:(d.exercises?d:workoutRecordToCert(d));
      old(rec);
      setTimeout(()=>{
        const m=$('garang86CertModal'); if(!m)return;
        const canvas=$('g86Canvas'); if(!canvas)return;
        // Replace renderer once per modal with the V8.8 renderer.
        if(!window.__garang88CanvasPatched){
          window.__garang88CanvasPatched=true;
          const stateGetter=()=>window.__GARANG_V86_CERT_STATE||{};
          // The existing module keeps its state private; patch by wrapping canvas draw via a new explicit renderer below.
        }
        const media=$('g86Media');
        const redraw=()=>drawCert88(rec,canvas,media?.files?.[0]);
        m.querySelectorAll('[data-orient]').forEach(b=>{b.onclick=()=>{window.__garang88Orientation=b.dataset.orient;redraw()}});
        m.querySelectorAll('[data-template]').forEach(b=>{b.onclick=()=>{window.__garang88Template=b.dataset.template;redraw()}});
        if(media)media.onchange=()=>{const f=media.files?.[0];if(f&&f.type.startsWith('image/')){const im=new Image();im.onload=()=>drawCert88(rec,canvas,im);im.src=URL.createObjectURL(f)}else redraw()};
        window.__garang88Orientation=window.__garang88Orientation||'9:16';
        window.__garang88Template=window.__garang88Template||'dark';
        redraw();
      },30);
    }
    open.__garang88=true; window.garangOpenShare=open;
  }

  function drawImageCover(ctx,src,W,H){
    const sw=src?.naturalWidth||src?.videoWidth||src?.width, sh=src?.naturalHeight||src?.videoHeight||src?.height; if(!sw||!sh)return;
    const s=Math.max(W/sw,H/sh),w=sw*s,h=sh*s;ctx.drawImage(src,(W-w)/2,(H-h)/2,w,h);
  }
  function wrapText(ctx,text,x,y,maxW,lineH){
    const words=String(text).split(' ');let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxW&&line){ctx.fillText(line,x,y);y+=lineH;line=word}else line=test}if(line){ctx.fillText(line,x,y);y+=lineH}return y;
  }
  function drawCert88(rec,canvas,fileOrImage){
    const landscape=window.__garang88Orientation==='16:9'; const W=landscape?1600:1080,H=landscape?900:1920;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d'); const tpl=window.__garang88Template||'dark';
    let bg=tpl==='white'?'#f4f4f1':'#090a0c',fg=tpl==='white'?'#111':'#fff',accent=tpl==='white'?'#6f5528':'#d7b36b';
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    if(fileOrImage){ctx.save();ctx.globalAlpha=.88;drawImageCover(ctx,fileOrImage,W,H);ctx.restore();ctx.fillStyle=tpl==='white'?'rgba(255,255,255,.45)':'rgba(0,0,0,.52)';ctx.fillRect(0,0,W,H)}
    const pad=landscape?88:72;
    ctx.fillStyle=fg;ctx.font=`900 ${landscape?38:34}px Arial Black, Arial, sans-serif`;ctx.fillText('G  GARANG',pad,landscape?68:82);
    if(rec.type==='run'){
      ctx.fillStyle=accent;ctx.font=`900 ${landscape?92:88}px Arial Black, Arial, sans-serif`;ctx.fillText(`${Number(rec.distance||0).toFixed(2)}`,pad,landscape?190:230);
      ctx.fillStyle=fg;ctx.font=`900 ${landscape?34:32}px Arial Black, Arial, sans-serif`;ctx.fillText('KM',pad+(landscape?330:300),landscape?190:230);
      ctx.font=`900 ${landscape?30:28}px Arial Black, Arial, sans-serif`;ctx.fillText('RUN COMPLETE',pad,landscape?245:290);
      ctx.font=`800 ${landscape?26:24}px Arial, sans-serif`;ctx.fillText(`TIME  ${rec.time||'00:00'}    PACE  ${rec.pace||'--:--'} /KM    KCAL  ${Number(rec.calories||0).toLocaleString()}`,pad,landscape?315:365);
      ctx.font=`700 ${landscape?22:20}px Arial, sans-serif`;ctx.fillText(rec.date||today(),pad,H-(landscape?48:80));
    }else{
      const title=tpl==='pr'?'PR ACHIEVED':'WORKOUT COMPLETE';
      ctx.fillStyle=accent;ctx.font=`900 ${landscape?70:66}px Arial Black, Arial, sans-serif`;ctx.fillText(title,pad,landscape?180:205);
      const main=rec.exercises?.length===1?(rec.exercises[0].name||'WORKOUT').toUpperCase():"TODAY'S SESSION";
      ctx.fillStyle=fg;ctx.font=`900 ${landscape?42:38}px Arial Black, Arial, sans-serif`;ctx.fillText(main,pad,landscape?245:275);
      let y=landscape?315:345;ctx.font=`800 ${landscape?27:25}px Arial Black, Arial, sans-serif`;
      for(const e of (rec.exercises||[]).slice(0,landscape?6:8)){
        const setText=(e.sets||[]).map(s=>`${Number(s.weight||0)}kg × ${Number(s.reps||0)}`).join('  ·  ');
        y=wrapText(ctx,`${e.name||'운동'}  ${setText}`,pad,y,W-pad*2,landscape?42:39);
      }
      ctx.fillStyle=accent;ctx.font=`900 ${landscape?32:29}px Arial Black, Arial, sans-serif`;ctx.fillText(`${Number(rec.totalSets||0)} SETS   ·   ${Number(rec.totalVolume||0).toLocaleString()} KG VOLUME`,pad,H-(landscape?105:155));
      ctx.fillStyle=fg;ctx.font=`700 ${landscape?20:19}px Arial, sans-serif`;ctx.fillText(`${rec.duration?rec.duration+' MIN  ·  ':''}${rec.date||today()}`,pad,H-(landscape?62:92));
      if(tpl==='pr'){ctx.font=`900 ${landscape?92:82}px Arial Black, Arial, sans-serif`;ctx.fillText(`${Number(rec.totalVolume||0).toLocaleString()} KG`,landscape?W-520:pad,H-(landscape?150:230));}
    }
  }

  function aiPretty(){
    const btn=$('v77Plan'); if(btn&&!btn.dataset.g88){btn.dataset.g88='1';btn.onclick=()=>{
      const raw=typeof window.planner==='function'?window.planner():null; showAiModal('이번 주 운동 플랜',raw);
    }}
    const report=$('v77Report'); if(report&&!report.dataset.g88){report.dataset.g88='1';report.onclick=()=>{const raw=typeof window.weeklyReport==='function'?window.weeklyReport():null;showAiModal('주간 리포트',raw)}}
  }
  function showAiModal(title,data){
    let m=$('garang88AiModal');if(!m){m=document.createElement('div');m.id='garang88AiModal';m.innerHTML='<div class="g88-ai-sheet"><div class="g88-ai-head"><div><span>GARANG AI COACH</span><h3></h3></div><button type="button">닫기</button></div><div class="g88-ai-body"></div></div>';document.body.appendChild(m);m.querySelector('button').onclick=()=>m.classList.remove('open');}
    m.querySelector('h3').textContent=title;const body=m.querySelector('.g88-ai-body');
    if(!data){body.innerHTML='<p>아직 충분한 기록이 없습니다.</p>'}
    else if(data.daysPlan){body.innerHTML=`<div class="g88-plan-summary"><b>${esc(data.goal||'개인 목표')}</b><span>주 ${data.days||data.daysPerWeek||0}일</span></div>`+(data.daysPlan||[]).map(x=>`<div class="g88-plan-row"><strong>DAY ${x.day}</strong><div><b>${esc(x.focus)}</b><p>${esc(x.note)}</p></div></div>`).join('');}
    else {body.innerHTML='<pre>'+esc(JSON.stringify(data,null,2))+'</pre>'}
    m.classList.add('open');
  }

  function injectStyles(){
    if($('garang88Style'))return;const st=document.createElement('style');st.id='garang88Style';st.textContent=`
      .garang-v853-auth-fix input,.authForm input{color:#111!important;background:#fff!important;-webkit-text-fill-color:#111!important;opacity:1!important;visibility:visible!important}
      #googleBtn,#appleBtn{display:flex!important;visibility:visible!important;opacity:1!important;color:#111!important;background:#fff!important;-webkit-text-fill-color:#111!important;border:1px solid #d9dce2!important;min-height:52px!important;align-items:center;justify-content:center;font-weight:800!important}
      #signupForm .check{color:#111!important;font-weight:600!important;opacity:1!important}
      .g88-cert-btn,.g88-record-cert{display:inline-flex!important;align-items:center;justify-content:center;margin-top:10px;border:1px solid #111;background:#111;color:#fff;border-radius:12px;padding:10px 14px;font-weight:900}
      .g88-ai-modal{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:11000}
      #garang88AiModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:11000;padding:18px;align-items:center;justify-content:center}
      #garang88AiModal.open{display:flex}.g88-ai-sheet{width:min(720px,100%);max-height:85vh;overflow:auto;background:#fff;color:#111;border-radius:24px;padding:18px}.g88-ai-head{display:flex;justify-content:space-between;align-items:flex-start}.g88-ai-head span{font-size:11px;letter-spacing:.14em;color:#777;font-weight:800}.g88-ai-head h3{margin:6px 0 14px;font-size:26px}.g88-ai-head button{border:1px solid #ddd;background:#fff;border-radius:10px;padding:8px 12px}.g88-plan-summary{display:flex;justify-content:space-between;padding:16px;background:#f4f4f1;border-radius:16px;margin-bottom:10px}.g88-plan-row{display:grid;grid-template-columns:90px 1fr;gap:14px;padding:16px 4px;border-bottom:1px solid #eee}.g88-plan-row strong{font-size:14px}.g88-plan-row b{font-size:18px}.g88-plan-row p{margin:5px 0 0;color:#666}.g88-ai-body pre{white-space:pre-wrap;font:14px/1.6 monospace;background:#f5f5f5;padding:14px;border-radius:14px}
      .g86-modal .g86-buttons button{font-weight:900!important}.g86-modal #g86Canvas{font-weight:900}.g86-modal .g86-modal-head h3{font-weight:900!important}.g86-modal .g86-buttons button.selected{font-weight:900!important}
      @media(max-width:600px){.g88-plan-row{grid-template-columns:70px 1fr}.g88-ai-sheet{padding:15px}}
    `;document.head.appendChild(st);
  }

  function boot(){
    version();authFix();injectStyles();navFix();renderDietOnly();
    const mo=new MutationObserver(()=>{authFix();addCertButtons();aiPretty();renderDietOnly();});mo.observe(document.body,{subtree:true,childList:true});
    addCertButtons();aiPretty();
    // If a legacy page opener is recreated later, re-wrap it.
    setInterval(()=>{navFix();addCertButtons();aiPretty()},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120));else setTimeout(boot,120);
  window.GARANG88={version:'8.8.0',renderDietOnly,workoutRecordToCert,lastSavedWorkout};
})();
