
/* GARANG V8.6 — Workout record + certification core */
(function(){
  const KEY="garangWorkoutV86";
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{"date":"","exercises":[],"photo":""}')}catch(e){return {date:"",exercises:[],photo:""}}}
  function save(){localStorage.setItem(KEY,JSON.stringify(window.GARANG_WORKOUT_V86));window.dispatchEvent(new CustomEvent("garang-workout-updated",{detail:window.GARANG_WORKOUT_V86}));}
  window.GARANG_WORKOUT_V86=load();

  window.GARANG_V86 = {
    addExercise(ex){
      if(!ex || !ex.id) return;
      if(!GARANG_WORKOUT_V86.exercises.some(x=>x.id===ex.id))
        GARANG_WORKOUT_V86.exercises.push({...ex,sets:[]});
      save(); return GARANG_WORKOUT_V86;
    },
    removeExercise(id){
      GARANG_WORKOUT_V86.exercises=GARANG_WORKOUT_V86.exercises.filter(x=>x.id!==id); save();
    },
    addSet(id,weight,reps){
      const e=GARANG_WORKOUT_V86.exercises.find(x=>x.id===id); if(!e)return;
      e.sets.push({weight:Number(weight)||0,reps:Number(reps)||0}); save(); return e;
    },
    setPhoto(dataUrl){GARANG_WORKOUT_V86.photo=dataUrl||"";save();},
    clear(){GARANG_WORKOUT_V86={date:new Date().toISOString().slice(0,10),exercises:[],photo:""};save();},
    summary(){
      let sets=0,volume=0;
      GARANG_WORKOUT_V86.exercises.forEach(e=>e.sets.forEach(s=>{sets++;volume+=(+s.weight||0)*(+s.reps||0)}));
      return {exercises:GARANG_WORKOUT_V86.exercises,totalSets:sets,totalVolume:volume,date:GARANG_WORKOUT_V86.date,photo:GARANG_WORKOUT_V86.photo};
    }
  };
  if(!GARANG_WORKOUT_V86.date) GARANG_WORKOUT_V86.date=new Date().toISOString().slice(0,10);

  // Food and running are explicitly separate data namespaces.
  window.GARANG_FOOD_V86 = JSON.parse(localStorage.getItem("garangFoodV86")||'{"items":[]}');
  window.GARANG_RUNNING_V86 = JSON.parse(localStorage.getItem("garangRunningV86")||'{"runs":[]}');

  window.GARANG_V86_CERT = function(target, options={}){
    const el=typeof target==="string"?document.querySelector(target):target;
    if(!el)return;
    const s=GARANG_V86.summary();
    el.className="garang-cert-v86 " + (options.orientation==="16:9" ? "landscape-16-9" : "story-9-16");
    const ex=s.exercises;
    el.innerHTML=`
      ${s.photo?`<img class="garang-cert-v86-photo" src="${s.photo}" alt="Workout photo">`:""}
      <div class="garang-cert-v86-top"><span class="garang-brand-v86"><i>G</i> GARANG</span><span>${s.date||""}</span></div>
      <div class="garang-cert-v86-bottom">
        <div class="garang-cert-v86-eyebrow">WORKOUT</div>
        <h2>${ex.length===1?ex[0].name:"TODAY'S SESSION"}</h2>
        <div class="garang-cert-v86-grid">
          <div><small>EXERCISES</small><b>${ex.length}</b></div>
          <div><small>SETS</small><b>${s.totalSets}</b></div>
          <div><small>VOLUME</small><b>${s.totalVolume.toLocaleString()} kg</b></div>
        </div>
        <div class="garang-cert-v86-list">${ex.map(e=>`<div><span>${e.name}</span><span>${e.sets.map(x=>`${x.weight}×${x.reps}`).join(" · ")||"—"}</span></div>`).join("")}</div>
      </div>`;
    if(options.monochrome) el.classList.add("mono");
    return el;
  };
})();
