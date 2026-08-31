
/* GARANG V8.5.3 — Exercise DB / multi-exercise picker / workout certification bridge */
(function(){
  const DB = [
    ["벤치프레스","가슴","바벨"],["인클라인 바벨 벤치프레스","가슴","바벨"],
    ["인클라인 덤벨 벤치프레스","가슴","덤벨"],["덤벨 벤치프레스","가슴","덤벨"],
    ["체스트프레스","가슴","머신"],["딥스","가슴","맨몸"],["케이블 플라이","가슴","케이블"],
    ["덤벨 플라이","가슴","덤벨"],["푸쉬업","가슴","맨몸"],
    ["스쿼트","하체","바벨"],["프론트 스쿼트","하체","바벨"],["레그프레스","하체","머신"],
    ["핵스쿼트","하체","머신"],["불가리안 스플릿 스쿼트","하체","덤벨"],
    ["레그 익스텐션","하체","머신"],["레그컬","하체","머신"],["루마니안 데드리프트","하체","바벨"],
    ["데드리프트","등","바벨"],["바벨로우","등","바벨"],["티바로우","등","머신"],
    ["원암 덤벨로우","등","덤벨"],["랫풀다운","등","케이블"],["풀업","등","맨몸"],
    ["친업","등","맨몸"],["시티드 케이블로우","등","케이블"],
    ["밀리터리 프레스","어깨","바벨"],["오버헤드프레스","어깨","바벨"],
    ["덤벨 숄더프레스","어깨","덤벨"],["사이드 레터럴 레이즈","어깨","덤벨"],
    ["프론트 레이즈","어깨","덤벨"],["리어델트 플라이","어깨","덤벨"],
    ["페이스풀","어깨","케이블"],["바벨컬","팔","바벨"],["덤벨컬","팔","덤벨"],
    ["해머컬","팔","덤벨"],["케이블 컬","팔","케이블"],["트라이셉스 푸쉬다운","팔","케이블"],
    ["오버헤드 트라이셉스 익스텐션","팔","덤벨"],["딥스(삼두)","팔","맨몸"],
    ["크런치","복근","맨몸"],["레그레이즈","복근","맨몸"],["행잉 레그레이즈","복근","맨몸"],
    ["플랭크","복근","맨몸"]
  ].map((x,i)=>({id:i+1,name:x[0],muscle:x[1],equipment:x[2]}));

  window.GARANG_EXERCISE_DB = DB;

  function norm(s){ return String(s||"").toLowerCase().replace(/\s+/g,""); }
  window.GARANGSearchExercises = function(query){
    const q=norm(query);
    if(!q) return DB.slice(0,30);
    const exact=DB.filter(x=>norm(x.name)===q);
    const starts=DB.filter(x=>norm(x.name).startsWith(q) && !exact.includes(x));
    const contains=DB.filter(x=>norm(x.name).includes(q) && !exact.includes(x) && !starts.includes(x));
    // Korean "벤치" should naturally surface bench variants.
    return [...exact,...starts,...contains].slice(0,30);
  };

  window.GARANGWorkoutSession = JSON.parse(localStorage.getItem("garangWorkoutSessionV853")||'{"exercises":[]}');

  function save(){ localStorage.setItem("garangWorkoutSessionV853",JSON.stringify(window.GARANGWorkoutSession)); }

  window.GARANGAddExercise = function(exercise){
    if(!exercise) return;
    if(!window.GARANGWorkoutSession.exercises.some(e=>e.id===exercise.id)){
      window.GARANGWorkoutSession.exercises.push({
        ...exercise, sets:[]
      });
      save();
    }
    return window.GARANGWorkoutSession.exercises;
  };

  window.GARANGRemoveExercise = function(id){
    window.GARANGWorkoutSession.exercises =
      window.GARANGWorkoutSession.exercises.filter(e=>e.id!==id);
    save();
  };

  window.GARANGAddSet = function(exerciseId, weight, reps){
    const e=window.GARANGWorkoutSession.exercises.find(x=>x.id===exerciseId);
    if(!e) return;
    e.sets.push({weight:Number(weight)||0,reps:Number(reps)||0});
    save();
    return e;
  };

  window.GARANGClearWorkout = function(){
    window.GARANGWorkoutSession={exercises:[]};
    save();
  };

  window.GARANGWorkoutSummary = function(){
    const exercises=window.GARANGWorkoutSession.exercises||[];
    let totalVolume=0,totalSets=0;
    exercises.forEach(e=>{
      totalSets += e.sets.length;
      totalVolume += e.sets.reduce((s,x)=>s+(Number(x.weight)||0)*(Number(x.reps)||0),0);
    });
    return {exercises,totalVolume,totalSets};
  };

  window.GARANGOpenWorkoutCertification = function(){
    const s=window.GARANGWorkoutSummary();
    window.dispatchEvent(new CustomEvent("garang-open-workout-cert",{detail:s}));
    return s;
  };
})();
