(() => {
  'use strict';

  const ACTIVE_KEY='garang_wanted_demo_active_v1';
  const STATE_KEY='garang_signed_out_v1';
  const DATASET_URL='./04_data/wanted/wanted-14day-synthetic-v1.json';
  const build=window.GARANG_WANTED_SUBMISSION;
  if(!build)return;

  const byId=id=>document.getElementById(id);
  const day=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+Number(offset||0));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const stamp=(offset=0,hour=8)=>`${day(offset)}T${String(hour).padStart(2,'0')}:00:00.000Z`;
  const demoActive=()=>localStorage.getItem(ACTIVE_KEY)==='1';
  const asArray=value=>Array.isArray(value)?value:[];

  function materializeDataset(template){
    if(!template||template.synthetic!==true||Number(template.spanDays)!==14)throw new Error('WANTED_DATASET_INVALID');

    const checkins=[],meals=[],workouts=[],runs=[];
    for(const entry of asArray(template.days)){
      const offset=Number(entry.dayOffset||0);
      const date=day(offset);
      const checkin=entry.checkin||{};
      checkins.push({...checkin,date,updatedAt:stamp(offset,8)});

      for(const meal of asArray(entry.meals)){
        meals.push({
          id:meal.id,
          date,
          name:`${meal.slot||'식사'} · ${meal.name}`,
          items:[{id:`${meal.id}-item`,name:meal.name,kcal:Number(meal.kcal||0),protein:Number(meal.protein||0),carbs:Number(meal.carbs||0),fat:Number(meal.fat||0)}],
          kcal:Number(meal.kcal||0),
          protein:Number(meal.protein||0),
          carbs:Number(meal.carbs||0),
          fat:Number(meal.fat||0),
          source:'wanted_synthetic',
          createdAt:stamp(offset,Number(meal.hour||12)),
          updatedAt:stamp(offset,Number(meal.hour||12))
        });
      }

      const workout=template.workoutCatalog?.[entry.workoutKey];
      if(workout){
        asArray(workout.exercises).forEach((exercise,index)=>{
          const [name,primaryMuscle,sets,reps,weight,rpe,duration]=exercise;
          const volume=Math.round(Number(sets||0)*Number(reps||0)*Number(weight||0)*10)/10;
          const estimated1RM=Number(weight||0)>0?Math.round(Number(weight)*(1+Number(reps||0)/30)*10)/10:null;
          workouts.push({
            id:`wanted-w-${Math.abs(offset)}-${index+1}`,
            date,
            sessionName:workout.name,
            name,
            primaryMuscle,
            sets:Number(sets||0),
            reps:Number(reps||0),
            weight:Number(weight||0),
            rpe:Number(rpe||0),
            duration:Number(duration||0),
            body:74.2,
            met:5.5,
            kcal:Math.round(Number(duration||0)*6.6),
            volume,
            estimated1RM,
            source:'wanted_synthetic',
            createdAt:stamp(offset,20),
            updatedAt:stamp(offset,20)
          });
        });
      }

      const run=template.runCatalog?.[entry.runKey];
      if(run){
        runs.push({id:`wanted-r-${Math.abs(offset)}`,date,...run,coords:[],source:'wanted_synthetic',createdAt:stamp(offset,19),updatedAt:stamp(offset,19)});
      }
    }

    const body=asArray(template.bodyTrend).map((item,index)=>{
      const offset=Number(item.dayOffset||0);
      const {dayOffset:ignored,...rest}=item;
      return {id:`wanted-b-${index+1}`,date:day(offset),...rest,source:'manual',userConfirmed:true,createdAt:stamp(offset,8),updatedAt:stamp(offset,8)};
    });

    const planner=asArray(template.planner).map(item=>{
      const offset=Number(item.dayOffset||0);
      const {dayOffset:ignored,...rest}=item;
      return {...rest,date:day(offset),createdAt:stamp(Math.min(offset-1,-1),18),updatedAt:stamp(offset,18)};
    });

    const memoryEntries=asArray(template.memory).map(item=>{
      const offset=Number(item.dayOffset||0);
      const {dayOffset:ignored,...rest}=item;
      return {...rest,createdAt:stamp(offset,9),updatedAt:stamp(offset,9)};
    });

    const actionLog=asArray(template.actionLog).map(item=>{
      const offset=Number(item.dayOffset||0);
      const {dayOffset:ignored,...rest}=item;
      return {...rest,at:stamp(offset,18)};
    });

    return {
      meta:{schemaVersion:5,createdAt:stamp(-35),updatedAt:new Date().toISOString(),judgeDataset:{contractVersion:template.contractVersion,synthetic:true,spanDays:14,source:DATASET_URL,scenario:template.scenario}},
      profile:template.profile,
      onboarding:template.onboarding,
      preferences:template.preferences,
      checkins,
      planner,
      workouts,
      meals,
      runs,
      body,
      aiChat:[],
      memory:{entries:memoryEntries,facts:[],preferences:[],goals:[],events:[]},
      actionLog,
      analytics:{events:[]},
      errors:[],
      plan:'FREE',
      wantedDemo:true
    };
  }

  async function loadDataset(){
    const response=await fetch(DATASET_URL,{cache:'no-store'});
    if(!response.ok)throw new Error(`WANTED_DATASET_HTTP_${response.status}`);
    return materializeDataset(await response.json());
  }

  async function seedAndReload(event){
    const button=event?.currentTarget||document.querySelector('[data-wanted-demo-start]');
    const original=button?.innerHTML;
    if(button){button.disabled=true;button.innerHTML='<span>14일 데이터 준비 중</span><b>최근 기록을 심사 체험에 연결하고 있습니다…</b>';}
    try{
      const state=await loadDataset();
      localStorage.setItem(STATE_KEY,JSON.stringify(state));
      localStorage.setItem(ACTIVE_KEY,'1');
      const url=new URL(location.href);url.searchParams.set('judge','1');
      location.replace(url.toString());
    }catch(error){
      console.error('[GARANG Wanted] failed to load synthetic judging dataset',error);
      if(button){button.disabled=false;button.innerHTML=original||'<span>60초 심사 체험</span><b>다시 시도 →</b>';}
      const note=document.querySelector('.wanted-demo-entry p');
      if(note)note.textContent='14일 합성 심사 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.';
    }
  }

  function exitDemo(){
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(STATE_KEY);
    const url=new URL(location.href);url.searchParams.delete('judge');
    location.replace(url.toString());
  }

  function addEntry(){
    const card=document.querySelector('.auth-card');
    if(!card||card.querySelector('[data-wanted-demo-entry]'))return;
    const block=document.createElement('div');
    block.className='wanted-demo-entry';
    block.dataset.wantedDemoEntry='1';
    block.innerHTML='<button type="button" class="wanted-demo-button" data-wanted-demo-start><span>60초 심사 체험</span><b>최근 14일 운동·식단·회복 기록으로 판단 루프 바로 보기 →</b></button><p>계정·클라우드 없이 명확히 표시된 합성 데이터만 사용합니다. 실제 Production AI Coach는 회원가입 후 이용할 수 있습니다.</p>';
    card.appendChild(block);
    block.querySelector('[data-wanted-demo-start]').addEventListener('click',seedAndReload);

    const copy=document.querySelector('.auth-copy');
    if(copy&&!copy.querySelector('.wanted-submission-kicker')){
      const kicker=document.createElement('div');
      kicker.className='wanted-submission-kicker';
      kicker.innerHTML='<span>WANTED AI CHAMPIONSHIP 2026</span><b>기록을 모으는 앱이 아니라, 다음 행동을 판단하는 Personal Performance Intelligence.</b>';
      copy.insertBefore(kicker,copy.querySelector('h1'));
    }
  }

  function addGuide(){
    const app=byId('appView');if(!app||document.querySelector('.wanted-demo-guide'))return;
    const guide=document.createElement('aside');
    guide.className='wanted-demo-guide';
    guide.innerHTML='<div><span>JUDGING MODE · 14 DAYS SYNTHETIC DATA</span><b>1분 추천 동선</b></div><nav><button data-wanted-route="today">1. Today 판단</button><button data-wanted-route="coach">2. Coach 설명</button><button data-wanted-route="progress">3. 2주 누적 변화</button></nav><small>14일 운동·식단·회복·체성분 합성 기록을 GARANG 결정 엔진이 읽습니다. 사진 + 실제 LLM 호출은 로그인 후 Production Coach에서 검증됩니다.</small>';
    app.appendChild(guide);
    guide.querySelectorAll('[data-wanted-route]').forEach(button=>button.addEventListener('click',()=>{
      document.querySelector(`.bottom-nav [data-page="${button.dataset.wantedRoute}"]`)?.click();
    }));
  }

  function addCoachNotice(){
    if(!demoActive())return;
    const shell=document.querySelector('.coach-app-shell');
    if(!shell||shell.querySelector('.wanted-coach-demo-note'))return;
    const note=document.createElement('div');
    note.className='wanted-coach-demo-note';
    note.innerHTML='<b>심사 체험 모드 · 14일 합성 기록</b><span>이 화면의 판단은 최근 2주 샘플 기록을 읽는 GARANG deterministic intelligence입니다. 실제 GPT 기반 설명·사진 해석은 계정 생성 후 동일 Coach에서 동작합니다.</span>';
    shell.insertBefore(note,shell.querySelector('.coach-thread'));
  }

  function ensureDemo(){
    if(!demoActive())return;
    document.body.classList.add('wanted-demo-active');
    document.documentElement.dataset.wantedDemo='1';
    const auth=byId('authView'),app=byId('appView');
    if(auth)auth.hidden=true;
    if(app)app.hidden=false;
    if(byId('planBadge'))byId('planBadge').textContent='14D DEMO';
    if(byId('syncLabel'))byId('syncLabel').textContent='SYNTHETIC';
    addGuide();
    if(document.body.dataset.wantedDemoRendered!=='1'){
      document.body.dataset.wantedDemoRendered='1';
      requestAnimationFrame(()=>document.querySelector('.bottom-nav [data-page="today"]')?.click());
    }
    addCoachNotice();
  }

  function bindExit(){
    document.addEventListener('click',event=>{
      if(!demoActive())return;
      const target=event.target.closest?.('#logoutBtn,#settingsLogout,[data-wanted-demo-exit]');
      if(!target)return;
      event.preventDefault();event.stopImmediatePropagation();exitDemo();
    },true);
  }

  function boot(){
    addEntry();bindExit();
    if(demoActive()){
      const auth=byId('authView'),app=byId('appView');
      const observer=new MutationObserver(ensureDemo);
      if(auth)observer.observe(auth,{attributes:true,attributeFilter:['hidden']});
      if(app)observer.observe(app,{attributes:true,attributeFilter:['hidden']});
      window.addEventListener('garang:screen-rendered',()=>{ensureDemo();addCoachNotice();});
      ensureDemo();
      setTimeout(ensureDemo,250);setTimeout(ensureDemo,900);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
