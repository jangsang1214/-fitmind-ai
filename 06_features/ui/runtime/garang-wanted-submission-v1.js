(() => {
  'use strict';

  const ACTIVE_KEY='garang_wanted_demo_active_v1';
  const STATE_KEY='garang_signed_out_v1';
  const build=window.GARANG_WANTED_SUBMISSION;
  if(!build)return;

  const byId=id=>document.getElementById(id);
  const day=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const stamp=(offset=0,hour=8)=>`${day(offset)}T${String(hour).padStart(2,'0')}:00:00.000Z`;
  const demoActive=()=>localStorage.getItem(ACTIVE_KEY)==='1';

  function demoState(){
    const today=day(0);
    return {
      meta:{schemaVersion:5,createdAt:stamp(-35),updatedAt:new Date().toISOString()},
      profile:{name:'GARANG Demo',age:29,gender:'male',height:176,weight:74.2,goal:'퍼포먼스 향상'},
      onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:45,preferences:'평일 저녁 운동 선호 · 하체 피로가 높으면 강도 조절'},
      preferences:{language:'ko',unit:'metric'},
      checkins:[{id:'wanted-ci',date:today,sleep:6.2,energy:3,stress:4,soreness:4,soreArea:'대퇴사두근',availableMinutes:40,updatedAt:new Date().toISOString()}],
      planner:[
        {id:'wanted-plan-today',date:today,time:'19:00',type:'workout',title:'하체 고강도 60분',source:'user',status:'confirmed',completed:false,goalClass:'performance',goalLabel:'퍼포먼스 향상',createdAt:stamp(-2),updatedAt:stamp(-2)},
        {id:'wanted-plan-prev',date:day(-2),time:'19:20',type:'workout',title:'상체 푸시 50분',source:'ai',status:'confirmed',completed:true,goalClass:'performance',goalLabel:'퍼포먼스 향상',createdAt:stamp(-3),updatedAt:stamp(-2)}
      ],
      workouts:[
        {id:'w1',date:day(-1),name:'바벨 스쿼트',primaryMuscle:'대퇴사두근',sets:4,reps:6,weight:100,rpe:9,duration:28,body:74.2,met:6,kcal:228,volume:2400,estimated1RM:120,createdAt:stamp(-1,20),updatedAt:stamp(-1,20)},
        {id:'w2',date:day(-1),name:'루마니안 데드리프트',primaryMuscle:'햄스트링',sets:3,reps:8,weight:80,rpe:8.5,duration:20,body:74.2,met:5.5,kcal:170,volume:1920,estimated1RM:101.3,createdAt:stamp(-1,20),updatedAt:stamp(-1,20)},
        {id:'w3',date:day(-3),name:'바벨 벤치프레스',primaryMuscle:'가슴',sets:4,reps:8,weight:72.5,rpe:8,duration:30,body:74.4,met:5.5,kcal:210,volume:2320,estimated1RM:91.8,createdAt:stamp(-3,20),updatedAt:stamp(-3,20)},
        {id:'w4',date:day(-5),name:'랫풀다운',primaryMuscle:'등',sets:4,reps:10,weight:55,rpe:7.5,duration:24,body:74.5,met:5,kcal:165,volume:2200,estimated1RM:73.3,createdAt:stamp(-5,20),updatedAt:stamp(-5,20)}
      ],
      meals:[
        {id:'m1',date:today,name:'현미밥 + 닭가슴살',items:[{id:'m1a',name:'현미밥',grams:200,kcal:300,protein:6,carbs:64,fat:2},{id:'m1b',name:'닭가슴살',grams:160,kcal:264,protein:49,carbs:0,fat:6}],kcal:564,protein:55,carbs:64,fat:8,createdAt:stamp(0,12),updatedAt:stamp(0,12)},
        {id:'m2',date:day(-1),name:'연어 + 샐러드',items:[{id:'m2a',name:'연어',grams:180,kcal:374,protein:40,carbs:0,fat:23},{id:'m2b',name:'샐러드',grams:180,kcal:130,protein:5,carbs:18,fat:4}],kcal:504,protein:45,carbs:18,fat:27,createdAt:stamp(-1,13),updatedAt:stamp(-1,13)},
        {id:'m3',date:day(-2),name:'그릭요거트 + 달걀',items:[{id:'m3a',name:'그릭요거트',grams:200,kcal:170,protein:20,carbs:14,fat:4},{id:'m3b',name:'달걀',grams:150,kcal:215,protein:19,carbs:2,fat:14}],kcal:385,protein:39,carbs:16,fat:18,createdAt:stamp(-2,9),updatedAt:stamp(-2,9)}
      ],
      runs:[{id:'r1',date:day(-4),distance:5.2,duration:30.7,pace:'5.90',kcal:399,coords:[],createdAt:stamp(-4,19),updatedAt:stamp(-4,19)}],
      body:[
        {id:'b1',date:day(-30),weight:76.1,muscle:35.2,fatPercent:18.8,fatMass:14.3,leanMass:61.8,bmi:24.6,bmr:1730,source:'manual',userConfirmed:true,createdAt:stamp(-30),updatedAt:stamp(-30)},
        {id:'b2',date:day(-2),weight:74.2,muscle:35.8,fatPercent:16.9,fatMass:12.5,leanMass:61.7,bmi:24.0,bmr:1718,source:'manual',userConfirmed:true,createdAt:stamp(-2),updatedAt:stamp(-2)}
      ],
      aiChat:[],
      memory:{entries:[
        {id:'mem1',type:'goal',key:'performance_goal',value:'근력은 유지하면서 체지방을 천천히 낮추고 싶다.',source:'user',confidence:1,importance:5,userConfirmed:true,createdAt:stamp(-30),updatedAt:stamp(-30),expiresAt:null},
        {id:'mem2',type:'preference',key:'training_time',value:'평일 저녁 7시 이후 운동을 선호한다.',source:'user',confidence:1,importance:4,userConfirmed:true,createdAt:stamp(-25),updatedAt:stamp(-25),expiresAt:null}
      ],facts:[],preferences:[],goals:[],events:[]},
      actionLog:[{id:'a1',action:'create_plan',targetId:'wanted-plan-prev',reason:'최근 피로와 일정에 맞춘 세션',userConfirmed:true,sourceData:['checkin','workout_history','planner'],at:stamp(-3,18)}],
      analytics:{events:[]},errors:[],plan:'FREE',wantedDemo:true
    };
  }

  function seedAndReload(){
    localStorage.setItem(STATE_KEY,JSON.stringify(demoState()));
    localStorage.setItem(ACTIVE_KEY,'1');
    const url=new URL(location.href);url.searchParams.set('judge','1');
    location.replace(url.toString());
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
    block.innerHTML='<button type="button" class="wanted-demo-button" data-wanted-demo-start><span>60초 심사 체험</span><b>샘플 기록으로 GARANG의 판단 루프 바로 보기 →</b></button><p>계정·클라우드 없이 샘플 데이터만 사용합니다. 실제 Production AI Coach는 회원가입 후 이용할 수 있습니다.</p>';
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
    guide.innerHTML='<div><span>JUDGING MODE · SAMPLE DATA</span><b>1분 추천 동선</b></div><nav><button data-wanted-route="today">1. Today 판단</button><button data-wanted-route="coach">2. Coach 설명</button><button data-wanted-route="progress">3. 누적 변화</button></nav><small>샘플 모드에서는 GARANG 결정 엔진을 체험합니다. 사진 + 실제 LLM 호출은 로그인 후 Production Coach에서 검증됩니다.</small>';
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
    note.innerHTML='<b>심사 체험 모드</b><span>이 화면의 판단은 샘플 기록을 읽는 GARANG deterministic intelligence입니다. 실제 GPT 기반 설명·사진 해석은 계정 생성 후 동일 Coach에서 동작합니다.</span>';
    shell.insertBefore(note,shell.querySelector('.coach-thread'));
  }

  function ensureDemo(){
    if(!demoActive())return;
    document.body.classList.add('wanted-demo-active');
    document.documentElement.dataset.wantedDemo='1';
    const auth=byId('authView'),app=byId('appView');
    if(auth)auth.hidden=true;
    if(app)app.hidden=false;
    if(byId('planBadge'))byId('planBadge').textContent='DEMO';
    if(byId('syncLabel'))byId('syncLabel').textContent='SAMPLE';
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
