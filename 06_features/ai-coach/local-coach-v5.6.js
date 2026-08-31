/* FitMind AI V5.6 — Personal Context + Coaching Decision Layer
 * Built on V5.5.1 without removing legacy behavior.
 */
(function(){
  const VERSION="5.6.0";
  const baseAnswer=window.FitMindV5?.answer;
  const S=x=>String(x??"");
  const A=x=>Array.isArray(x)?x:[];
  const N=x=>Number(x)||0;
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const norm=s=>S(s).toLowerCase().replace(/\s+/g,"");
  function profile(db){return db?.profile||{}}
  function ex(w){return S(w?.exercise||w?.name)}
  function wt(w){return N(w?.weight)}
  function reps(w){return N(w?.reps)}
  function sets(w){return N(w?.sets)}
  function kcal(m){return N(m?.calories)}
  function ensureMemory(db){
    db.coachMemory=db.coachMemory||{};
    const m=db.coachMemory;
    m.facts=A(m.facts);m.topics=A(m.topics);m.advice=A(m.advice);m.feedback=A(m.feedback);
    m.preferences=m.preferences||{};m.sessions=A(m.sessions);m.updatedAt=m.updatedAt||new Date().toISOString();
    return m;
  }
  function remember(db,item,legacyTopic){
    const m=ensureMemory(db);
    if(typeof item==='string') item={type:'topic',topic:legacyTopic||'conversation',text:item};
    item=item||{};
    const row={text:S(item.text),date:today(),topic:S(item.topic||'')};
    if(item.type==='fact')m.facts=m.facts.slice(-99).concat(row);
    else if(item.type==='advice')m.advice=m.advice.slice(-49).concat(row);
    else if(item.type==='feedback')m.feedback=m.feedback.slice(-49).concat({...row,result:S(item.result),exercise:S(item.exercise)});
    else m.topics=m.topics.slice(-99).concat(row);
    m.updatedAt=new Date().toISOString();
  }
  function context(db){
    const p=profile(db),m=ensureMemory(db),ws=A(db?.workouts),ms=A(db?.meals),bs=A(db?.body);
    const recentW=ws.slice(-10),recentM=ms.slice(-10),recentB=bs.slice(-5);
    const todayMeals=ms.filter(x=>x.date===today());
    const todayW=ws.filter(x=>x.date===today());
    return {profile:p,memory:m,recentW,recentM,recentB,todayMeals,todayW,
      latestWeight:recentB.at(-1)?.weight??p.weight??null,
      todayKcal:todayMeals.reduce((s,x)=>s+kcal(x),0),
      todayProtein:todayMeals.reduce((s,x)=>s+N(x.protein),0),
      todayWorkoutKcal:todayW.reduce((s,x)=>s+kcal(x),0)};
  }
  function rememberSession(db,q,a){
    const m=ensureMemory(db);m.sessions=m.sessions.slice(-39).concat([{date:today(),user:S(q),assistant:S(a).slice(0,500)}]);m.updatedAt=new Date().toISOString();
  }
  function naturalDaily(c,q){
    const nq=norm(q),p=c.profile||{};
    if(/오늘.*(단백질.*남|남.*단백질)/.test(nq)){ const weight=N(c.latestWeight),target=N(p.proteinGoal)||((p.goal||'').includes('근육')&&weight?Math.round(weight*1.8):0); return target?`오늘 단백질 ${c.todayProtein.toFixed(1)}g 기록이야. 기본 목표 ${target}g으로 잡으면 약 ${Math.max(0,target-c.todayProtein).toFixed(1)}g 남았어.`:`오늘 단백질 ${c.todayProtein.toFixed(1)}g 기록이야. 단백질 목표를 설정하면 남은 양까지 계산해줄게.`; }
    if(/오늘.*(얼마나|뭐먹|먹은|섭취)/.test(nq)) return `오늘 기록된 섭취량은 약 ${Math.round(c.todayKcal)}kcal, 단백질 ${c.todayProtein.toFixed(1)}g이야. 기록이 더 있으면 같이 합쳐서 볼게.`;
    if(/오늘.*운동.*(했|몇|어때)/.test(nq)) return c.todayW.length?`오늘 ${c.todayW.length}개의 운동 기록이 있어. 운동 소비 추정치는 약 ${Math.round(c.todayWorkoutKcal)}kcal야.`:`아직 오늘 운동 기록은 없어. 컨디션 괜찮으면 기록부터 남겨두자.`;
    if(/내.*(체중|몸무게)/.test(nq)) return c.latestWeight?`최근 기록 체중은 ${c.latestWeight}kg이야.`:`아직 체중 기록이 없어.`;
    if(/내.*(목표|목표가)/.test(nq)) return p.goal?`기억하고 있어. 지금 목표는 ${p.goal}이야.`:`아직 목표가 저장되어 있지 않아. 목표를 알려주면 기억해둘게.`;
    if(/요즘.*(어때|상태|괜찮)/.test(nq)){
      const goal=p.goal?` 목표는 ${p.goal}이고,`:' ';
      return `최근 기록을 보면${goal} 운동 ${c.recentW.length}건, 식단 ${c.recentM.length}건 정도가 쌓여 있어. 데이터가 더 쌓이면 추세까지 같이 판단할 수 있어.`;
    }
    return null;
  }
  function coachingAnswer(c,q){
    const nq=norm(q),p=c.profile||{},last=c.recentW.at(-1);
    if(/(중량|증량|몇키로|몇킬로|올려|올릴)/.test(nq) && last){
      const r=reps(last),w=wt(last),rpe=N(last.rpe);
      if(rpe>=9) return `${ex(last)}은 최근 ${w}kg × ${r}회에 RPE ${rpe}였어. 지금은 증량보다 같은 중량에서 반복수나 RIR 여유를 확보하는 쪽이 좋아 보여.`;
      if(r>=8) return `${ex(last)} 최근 기록이 ${w}kg × ${r}회야. 세트가 안정적이었다면 다음엔 2.5kg 정도의 작은 증량을 검토할 수 있어. RPE가 높았다면 유지하자.`;
      return `${ex(last)}은 ${w}kg × ${r}회가 최근 기록이야. 우선 같은 중량에서 목표 반복수를 채우는 게 좋아 보여.`;
    }
    if(/(단백질|칼로리|식단|먹어야|더먹)/.test(nq)){
      const target=N(p.calorieGoal),left=target?Math.max(0,target-c.todayKcal):null;
      const weight=N(c.latestWeight),proteinTarget=N(p.proteinGoal)||((p.goal||'').includes('근육')&&weight?Math.round(weight*1.8):0);
      if(/단백질.*남|남.*단백질/.test(nq)&&proteinTarget) return `오늘 단백질 ${c.todayProtein.toFixed(1)}g 기록이야. 기본 목표 ${proteinTarget}g으로 잡으면 약 ${Math.max(0,proteinTarget-c.todayProtein).toFixed(1)}g 남았어.`;
      return target?`오늘 ${Math.round(c.todayKcal)}kcal를 기록했고 목표 ${Math.round(target)}kcal 기준 약 ${Math.round(left)}kcal 남았어. 단백질은 ${c.todayProtein.toFixed(1)}g 기록됐어.`:`오늘 ${Math.round(c.todayKcal)}kcal, 단백질 ${c.todayProtein.toFixed(1)}g 기록이야. 목표 칼로리를 설정하면 남은 양까지 계산해줄게.`;
    }
    return null;
  }
  function answer(q,ctx){
    const db=ctx?.db||{};const text=S(q);const c=context(db);
    const direct=naturalDaily(c,text)||coachingAnswer(c,text);
    if(direct){rememberSession(db,text,direct);return {text:direct,topic:'personal_context',engine:VERSION};}
    if(/(기억해|기억하자|저장해|앞으로)/.test(norm(text))){remember(db,{type:'fact',text});const out='ㅇㅋ, 이건 개인 코치 메모에 저장해둘게. 다음 관련 대화에서 참고할게.';rememberSession(db,text,out);return{text:out,topic:'memory',engine:VERSION};}
    if(typeof baseAnswer==='function'){
      const r=baseAnswer(text,ctx);
      const out=r?.text||'좋아. 편하게 말해줘.';
      rememberSession(db,text,out);
      return Object.assign({},r,{engine:r.engine&&r.engine!=='5.0-fallback'?r.engine:VERSION});
    }
    return {text:'좋아. 운동·식단·체중이든 그냥 일상 얘기든 편하게 말해줘.',topic:'conversation',engine:VERSION};
  }
  window.FitMindV56={version:VERSION,context,remember,rememberSession};
  if(window.FitMindV5){window.FitMindV5.answer=answer;window.FitMindV5.version=VERSION;}
})();
