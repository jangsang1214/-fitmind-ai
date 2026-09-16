'use strict';

const COACH_ENDPOINT='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach';
function storageKey(uid='mock-user'){return `garang_user_${uid}_v3`;}

async function installAuthenticatedFirebaseMock(context,options={}){
  const uid=String(options.uid||'mock-user');
  const displayName=String(options.displayName||'Regression User');
  const email=String(options.email||'regression@example.com');
  const standalone=options.standalone===true;
  const mockCoachGateway=options.mockCoachGateway!==false;
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked by authenticated browser fixture */'}));
  if(mockCoachGateway){
    await context.route(COACH_ENDPOINT,async route=>{
      if(route.request().method()!=='POST')return route.continue();
      const answer='GARANG TEST COACH: 저장된 기록과 현재 상태를 기준으로 다음 행동을 판단했습니다.';
      return route.fulfill({
        status:200,
        contentType:'application/json',
        headers:{'Access-Control-Allow-Origin':'*'},
        body:JSON.stringify({
          ok:true,
          answer,
          data:{
            answer,
            decisionSummary:'GARANG의 결정 규칙을 유지합니다.',
            reasoningSummary:'브라우저 회귀 테스트에서는 결정론적 Coach gateway fixture를 사용합니다.',
            suggestedNextStep:'현재 Golden Path의 다음 행동을 진행하세요.',
            confidence:.6,
            source:'llm',
            metadata:{provider:'authenticated-browser-fixture',model:'deterministic-test'}
          }
        })
      });
    });
  }
  await context.addInitScript(({uid,displayName,email,standalone})=>{
    if(standalone){try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}}
    const user={uid,displayName,email,updateProfile:async()=>{},getIdToken:async()=>`mock-id-token-${uid}`};
    let db;
    class DocRef{
      constructor(path){this.path=path;this.id=path.split('/').pop();this.firestore=db;}
      collection(name){return new CollectionRef(`${this.path}/${name}`);}
      async get(){return {exists:false,id:this.id,ref:this,metadata:{},data:()=>null,get:()=>undefined};}
      async set(){return undefined;}
      async delete(){return undefined;}
    }
    class CollectionRef{
      constructor(path,opts={}){this.path=path;this._after=opts.after||null;this._limit=opts.limit||null;}
      doc(id){return new DocRef(`${this.path}/${id}`);}
      orderBy(){return this;}
      startAfter(doc){return new CollectionRef(this.path,{after:doc?.id||String(doc||''),limit:this._limit});}
      limit(n){return new CollectionRef(this.path,{after:this._after,limit:Number(n)||null});}
      async get(){return {docs:[]};}
    }
    db={
      collection:name=>new CollectionRef(name),
      batch:()=>({set(){},delete(){},commit:async()=>{}}),
      runTransaction:async fn=>fn({get:ref=>ref.get(),set:()=>{},delete:()=>{}})
    };
    const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),20);return()=>{};},signOut:async()=>{auth.currentUser=null;}};
    function firestore(){return db;}
    firestore.FieldValue={serverTimestamp:()=>new Date().toISOString()};
    firestore.FieldPath={documentId:()=>'__name__'};
    function authFn(){return auth;}
    authFn.GoogleAuthProvider=function(){};
    authFn.OAuthProvider=function(){};
    window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
  },{uid,displayName,email,standalone});
  return {uid,storageKey:storageKey(uid)};
}

async function installAuthenticatedBrowserFixture(context,state,options={}){
  const identity=await installAuthenticatedFirebaseMock(context,options);
  await context.addInitScript(({state,key})=>{localStorage.setItem(key,JSON.stringify(state));},{state,key:identity.storageKey});
  return identity;
}

module.exports={COACH_ENDPOINT,installAuthenticatedFirebaseMock,installAuthenticatedBrowserFixture,storageKey};
