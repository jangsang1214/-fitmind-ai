(() => {
  'use strict';

  const ACTIVE_KEY='garang_wanted_demo_active_v1';
  const STATE_KEY='garang_signed_out_v1';
  const DATASET_URL='./04_data/wanted/wanted-14day-synthetic-v1.json';
  const EMBEDDED_SOURCE='embedded:garang-wanted-judge-data-v1';
  const build=window.GARANG_WANTED_SUBMISSION;
  if(!build)return;

  const byId=id=>document.getElementById(id);
  const day=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+Number(offset||0));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const stamp=(offset=0,hour=8)=>`${day(offset)}T${String(hour).padStart(2,'0')}:00:00.000Z`;
  const demoActive=()=>localStorage.getItem(ACTIVE_KEY)==='1';
  const asArray=value=>Array.isArray(value)?value:[];

  function embeddedTemplate(){
    const sleeps=[7.2,6.8,7.5,6.3,7.6,7,6.9,7.8,7.1,6.7,7.4,7,6.4,6.2];
    const energy=[4,4,5,3,4,4,4,5,4,4,5,4,3,3];
    const stress=[2,2,2,4,2,2,3,1,2,3,2,2,3,4];
    const soreness=[2,2,1,4,2,2,2,1,2,2,2,2,4,4];
    const workoutByOffset={
      '-13':'upper_push','-11':'lower_strength','-9':'upper_pull','-7':'full_body',
      '-5':'upper_push2','-3':'upper_pull2','-2':'lower_volume','-1':'lower_heavy'
    };
    const runByOffset={'-12':'run_easy','-6':'run_tempo','-4':'run_easy2'};
    const days=Array.from({length:14},(_,index)=>{
      const offset=index-13;
      const fatigue=offset===-1||offset===0;
      const kcalShift=(index%4)*13;
      return {
        dayOffset:offset,
        checkin:{
          id:`ci-${index+1}`,
          sleep:sleeps[index],energy:energy[index],stress:stress[index],soreness:soreness[index],
          soreArea:fatigue?'대퇴사두근':'',availableMinutes:offset===0?40:45
        },
        meals:[
          {id:`meal-${index+1}-1`,slot:'아침',name:'그릭요거트 + 오트 + 바나나',kcal:450+kcalShift,protein:31,carbs:64+(index%3),fat:9,hour:8},
          {id:`meal-${index+1}-2`,slot:'점심',name:'현미밥 + 닭가슴살 + 채소',kcal:590+kcalShift,protein:52,carbs:69+(index%4),fat:11,hour:13},
          {id:`meal-${index+1}-3`,slot:'저녁',name:'연어 + 고구마 + 샐러드',kcal:660+kcalShift,protein:47,carbs:55+(index%4),fat:27,hour:20}
        ],
        workoutKey:workoutByOffset[String(offset)]||undefined,
        runKey:runByOffset[String(offset)]||undefined
      };
    });

    return {
      contractVersion:'garang-wanted-judge-data-v1',
      synthetic:true,
      label:'14-day synthetic judging dataset',
      spanDays:14,
      runtimeSource:EMBEDDED_SOURCE,
      scenario:'Performance-focused user balancing strength retention, slow fat-loss, recovery, and adherence.',
      profile:{name:'GARANG Demo',age:29,gender:'male',height:176,weight:74.2,goal:'퍼포먼스 향상'},
      onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:45,preferences:'평일 저녁 운동 선호 · 하체 피로가 높으면 강도 조절'},
      preferences:{language:'ko',unit:'metric'},
      memory:[
        {id:'mem1',type:'goal',key:'performance_goal',value:'근력은 유지하면서 체지방을 천천히 낮추고 싶다.',source:'user',confidence:1,importance:5,userConfirmed:true,dayOffset:-30,expiresAt:null},
        {id:'mem2',type:'preference',key:'training_time',value:'평일 저녁 7시 이후 운동을 선호한다.',source:'user',confidence:1,importance:4,userConfirmed:true,dayOffset:-25,expiresAt:null},
        {id:'mem3',type:'preference',key:'fatigue_adjustment',value:'하체 근육통이 4 이상이면 고강도 하체 대신 상체 또는 회복 세션을 선호한다.',source:'user',confidence:1,importance:5,userConfirmed:true,dayOffset:-18,expiresAt:null}
      ],
      days,
      workoutCatalog:{
        upper_push:{name:'상체 푸시',exercises:[['바벨 벤치프레스','가슴',4,8,70,8,30],['덤벨 숄더프레스','어깨',3,10,22,7.5,18]]},
        lower_strength:{name:'하체 스트렝스',exercises:[['바벨 스쿼트','대퇴사두근',4,5,95,8,28],['루마니안 데드리프트','햄스트링',3,8,77.5,8,20]]},
        upper_pull:{name:'상체 풀',exercises:[['랫풀다운','등',4,10,52.5,7.5,24],['시티드 로우','등',3,10,55,8,20]]},
        full_body:{name:'전신 중강도',exercises:[['프론트 스쿼트','대퇴사두근',3,8,65,7.5,22],['인클라인 덤벨프레스','가슴',3,10,24,7.5,18]]},
        upper_push2:{name:'상체 푸시 2',exercises:[['인클라인 벤치프레스','가슴',4,8,62.5,8,28],['덤벨 숄더프레스','어깨',3,10,22,8,18]]},
        upper_pull2:{name:'상체 풀 2',exercises:[['풀업','등',4,8,0,8,20],['시티드 로우','등',4,10,57.5,8,22]]},
        lower_volume:{name:'하체 볼륨',exercises:[['바벨 스쿼트','대퇴사두근',4,8,82.5,8.5,30],['루마니안 데드리프트','햄스트링',3,10,70,8,22]]},
        lower_heavy:{name:'하체 고강도',exercises:[['바벨 스쿼트','대퇴사두근',5,4,102.5,9.5,34],['루마니안 데드리프트','햄스트링',4,6,85,9,24]]}
      },
      runCatalog:{
        run_easy:{distanceKm:5.2,durationMin:31,paceSecPerKm:358,rpe:5},
        run_tempo:{distanceKm:6.4,durationMin:34,paceSecPerKm:319,rpe:7},
        run_easy2:{distanceKm:4.8,durationMin:29,paceSecPerKm:363,rpe:5}
      },
      bodyTrend:[
        {dayOffset:-13,weight:74.8,bodyFat:18.2,muscleMass:33.5},
        {dayOffset:-6,weight:74.5,bodyFat:18.0,muscleMass:33.6},
        {dayOffset:-2,weight:74.2,bodyFat:17.8,muscleMass:33.6}
      ],
      planner:[
        {id:'wanted-plan-1',dayOffset:-3,type:'workout',title:'상체 풀',status:'completed'},
        {id:'wanted-plan-2',dayOffset:-1,type:'workout',title:'하체 고강도',status:'completed'}
      ],
      actionLog:[
        {id:'wanted-action-1',dayOffset:-10,action:'reduce_lower_intensity',reason:'high_soreness'},
        {id:'wanted-action-2',dayOffset:-7,action:'resume_full_body',reason:'recovery_improved'},
        {id:'wanted-action-3',dayOffset:-2,action:'keep_lower_volume',reason:'readiness_ok'},
        {id:'wanted-action-4',dayOffset:0,action:'replace_lower_with_recovery',reason:'sleep_stress_soreness_tradeoff'}
      ]
    };
  }

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
      meta:{schemaVersion:5,createdAt:stamp(-35),updatedAt:new Date().toISOString(),judgeDataset:{contractVersion:template.contractVersion,synthetic:true,spanDays:14,source:template.runtimeSource||DATASET_URL,scenario:template.scenario}},
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
    return materializeDataset(embeddedTemplate());
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
      console.error('[GARANG Wanted] failed to prepare synthetic judging dataset',error);
      if(button){button.disabled=false;button.innerHTML=original||'<span>60초 심사 체험</span><b>다시 시도 →</b>';}
      const note=document.querySelector('.wanted-demo-entry p');
      if(note)note.textContent='14일 합성 심사 데이터를 준비하지 못했습니다. 새로고침 후 다시 시도해주세요.';
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
