/* GARANG V9.3.2 — Learning + Memory integration on V8.8.2 core */
(function(){
  "use strict";
  const KEY="garang_v93_learning";
  const now=()=>new Date().toISOString();
  const today=()=>new Date().toISOString().slice(0,10);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")||{events:[],patterns:[],knowledge:[]}}catch(e){return{events:[],patterns:[],knowledge:[]}}};
  let L=read();
  function save(){localStorage.setItem(KEY,JSON.stringify(L)); render();}
  const appDB=()=>typeof window.__FitMindV6DB==="function"?window.__FitMindV6DB():{};
  const appSave=()=>{try{window.__FitMindV6Save?.();window.save?.()}catch(e){}};
  function add(type,data,outcome=null){
    const d=appDB()||{}, p=d.profile||{};
    const ev={id:crypto.randomUUID(),eventType:type,context:{
      goal:(d.coachMemory?.goal)||localStorage.getItem("fitmind_v65_goal")||null,
      experience:p.experience||null,weightKg:p.weight||null
    },action:data,outcome,quality:{validated:!!outcome,weight:type==="workout"?1:type==="nutrition"?.8:type==="running"?.8:.4},createdAt:now()};
    L.events.push(ev);L.events=L.events.slice(-1000);buildPatterns();
    if(window.GARANG_V93_SERVER?.configured&&window.GARANG_V93_SERVER?.consent?.globalLearning) window.GARANG_V93_SERVER.saveLearning(ev).catch(()=>{});
    save();
  }
  function buildPatterns(){
    const map={};
    L.events.forEach(e=>{
      const k=[e.eventType,e.context?.goal||"unknown",e.context?.experience||"unknown"].join("|");
      map[k]??={key:k,eventType:e.eventType,goal:e.context?.goal||"unknown",experience:e.context?.experience||"unknown",count:0,success:0,failure:0};
      map[k].count++; if(e.outcome?.status==="success")map[k].success++; if(e.outcome?.status==="failure")map[k].failure++;
    });
    L.patterns=Object.values(map).sort((a,b)=>b.count-a.count).slice(0,100);
  }
  function syncFromCore(){
    const d=appDB()||{};
    const marker=L.lastSync||"";
    const all=[
      ...(d.workouts||[]).map(x=>({type:"workout",x})),
      ...(d.meals||[]).map(x=>({type:"nutrition",x})),
      ...(d.runs||[]).map(x=>({type:"running",x}))
    ];
    const known=new Set(L.events.map(e=>e.sourceId).filter(Boolean));
    let changed=false;
    all.forEach(({type,x})=>{
      const id=x.id||x.createdAt;
      if(id&&!known.has(id)){
        const p=d.profile||{};
        L.events.push({id:crypto.randomUUID(),sourceId:id,eventType:type,context:{goal:d.coachMemory?.goal||null,experience:p.experience||null,weightKg:p.weight||null},action:x,outcome:null,quality:{validated:false,weight:type==="workout"?1:.8},createdAt:x.createdAt||x.date||now()});
        changed=true;
      }
    });
    if(changed){L.events=L.events.slice(-1000);buildPatterns();L.lastSync=now();localStorage.setItem(KEY,JSON.stringify(L));}
  }
  function state(){
    const d=appDB()||{}, w=d.workouts||[], m=d.meals||[], r=d.runs||[];
    const recent=w.slice(-14), protein=m.filter(x=>String(x.date||"").slice(0,10)>=new Date(Date.now()-6*864e5).toISOString().slice(0,10)).reduce((s,x)=>s+(+x.protein||0),0);
    return {profile:d.profile||{},workouts:w.length,meals:m.length,runs:r.length,recentWorkoutVolume:recent.reduce((s,x)=>s+(+x.volume||(+x.weight||0)*(+x.reps||0)*(+x.sets||1)),0),recentProtein:protein,events:L.events.length,patterns:L.patterns.length};
  }
  function render(){
    const s=state(), el=id=>document.getElementById(id), set=(id,v)=>{if(el(id))el(id).textContent=v};
    set("v93LearnEvents",L.events.length);set("v93LearnPatterns",L.patterns.length);
    set("v93LearnSuccess",L.events.filter(e=>e.outcome?.status==="success").length);
    set("v93LearnFailure",L.events.filter(e=>e.outcome?.status==="failure").length);
    const list=el("v93LearningList"); if(list)list.innerHTML=L.events.slice().reverse().slice(0,40).map(e=>`<div class="item"><b>${e.eventType}</b> · ${e.outcome?.status||"pending"}<br>${esc(JSON.stringify(e.action))}<div class="muted">${e.createdAt}</div></div>`).join("")||'<div class="muted">아직 학습 이벤트가 없습니다.</div>';
    const pl=el("v93PatternList"); if(pl)pl.innerHTML=L.patterns.map(p=>`<div class="item"><b>${p.eventType}</b> · ${p.goal} · ${p.experience}<br>표본 ${p.count} · 성공 ${p.success} · 실패 ${p.failure}</div>`).join("")||'<div class="muted">아직 패턴이 없습니다.</div>';
    const ml=el("v93MemoryList"); const d=appDB()||{}, p=d.profile||{}, cm=d.coachMemory||{};
    if(ml){
      const label={name:"이름",age:"나이",height:"키",weight:"체중",targetWeight:"목표 체중",goal:"목표",experience:"운동 경험",activity:"활동 수준",coachStyle:"코칭 스타일"};
      const rows=Object.entries(p).filter(([k])=>label[k]).map(([k,v])=>`<div class="memoryRow"><div class="label">${label[k]}</div><div class="value">${esc(v==null||v===""?"-":v)}</div></div>`).join("");
      const recent=L.events.slice().reverse().slice(0,8).map(e=>`<div class="memoryRow"><div class="label">${esc(e.eventType)} · ${esc(e.createdAt||"")}</div><div class="value">${esc(typeof e.action==="string"?e.action:JSON.stringify(e.action||{}))}</div></div>`).join("");
      const goal=cm.goal||p.goal||"-";
      ml.innerHTML=`<div class="memoryGrid">
        <div class="memoryStat"><span>체중</span><b>${esc(p.weight??"-")} kg</b></div>
        <div class="memoryStat"><span>운동 기록</span><b>${s.workouts}</b></div>
        <div class="memoryStat"><span>식단 기록</span><b>${s.meals}</b></div>
        <div class="memoryStat"><span>러닝 기록</span><b>${s.runs}</b></div>
      </div>
      <h3>User State</h3>${rows||'<div class="muted">프로필 데이터가 없습니다.</div>'}
      <div class="memoryRow"><div class="label">현재 목표</div><div class="value">${esc(goal)}</div></div>
      <h3>최근 학습 이벤트</h3>${recent||'<div class="muted">아직 학습 이벤트가 없습니다.</div>'}
      <div class="memoryRow"><div class="label">학습 상태</div><div class="value">이벤트 ${s.events} · 패턴 ${s.patterns} · 성공 ${L.events.filter(e=>e.outcome?.status==="success").length} · 실패 ${L.events.filter(e=>e.outcome?.status==="failure").length}</div></div>`;
    }
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

  function userStateContext(){
    const s=state(), d=appDB()||{}, p=d.profile||{};
    return {
      profile:p,
      goal:d.coachMemory?.goal||p.goal||null,
      activity:d.coachMemory?.activity||p.activity||null,
      recent:{workouts:s.workouts,meals:s.meals,runs:s.runs,volume:s.recentWorkoutVolume,protein:s.recentProtein},
      learning:{events:L.events.length,patterns:L.patterns.length}
    };
  }
  window.GARANG_V93_LEARNING={
    record:(type,data,outcome)=>add(type,data,outcome),
    success:(type,notes="")=>recordOutcome(type,"success",notes),
    failure:(type,notes="")=>recordOutcome(type,"failure",notes),
    sync:()=>{syncFromCore();render();},
    state,
    userState:userStateContext,
    data:()=>L,
    clear:()=>{if(confirm("V9 학습 이벤트를 초기화할까요?")){L={events:[],patterns:[],knowledge:[]};save();}}
  };
  function recordOutcome(type,status,notes){
    for(let i=L.events.length-1;i>=0;i--){const e=L.events[i];if(e.eventType===type&&!e.outcome){e.outcome={status,notes,recordedAt:now()};e.quality.validated=status==="success";break;}}
    buildPatterns();save();
  }
  window.GARANG_V93_SERVER={
    configured:false,consent:{globalLearning:false},
    async init(){
      try{
        if(!window.firebase)return false;
        if(!firebase.apps.length)return false;
        this.auth=firebase.auth();this.db=firebase.firestore();this.configured=true;
        this.auth.onAuthStateChanged(u=>this.user=u||null);return true;
      }catch(e){return false}
    },
    async saveLearning(ev){
      if(!this.configured||!this.user||!this.consent.globalLearning)return false;
      await this.db.collection("globalLearningEvents").add({
        eventType:ev.eventType,
        context:{goal:ev.context?.goal||null,experience:ev.context?.experience||null},
        outcome:ev.outcome||null,actionSummary:ev.eventType,quality:ev.quality||{},
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });return true;
    },
    async setConsent(v){this.consent.globalLearning=!!v}
  };
  window.addEventListener("DOMContentLoaded",async()=>{
    syncFromCore();render();
    setTimeout(()=>{GARANG_V93_SERVER.init().catch(()=>{});},500);
    document.getElementById("v93LearningConsent")?.addEventListener("click",async e=>{
      const next=!GARANG_V93_SERVER.consent.globalLearning; await GARANG_V93_SERVER.setConsent(next);
      e.target.textContent=next?"Global Learning 철회":"Global Learning 동의";
      const s=document.getElementById("v93ServerStatus");if(s)s.textContent=next?"전역 학습 참여 ON":"전역 학습 참여 OFF";
    });
    document.getElementById("v93Sync")?.addEventListener("click",()=>{syncFromCore();render();});
  });
  let lastRenderKey=""; setInterval(()=>{syncFromCore(); const k=JSON.stringify([L.events.length,L.patterns.length,L.lastSync]); if(k!==lastRenderKey){lastRenderKey=k;render();}},5000);
})();
