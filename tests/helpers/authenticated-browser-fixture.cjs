'use strict';

function storageKey(uid='mock-user'){return `garang_user_${uid}_v3`;}

async function installAuthenticatedBrowserFixture(context,state,options={}){
  const uid=String(options.uid||'mock-user');
  const displayName=String(options.displayName||'Regression User');
  const email=String(options.email||'regression@example.com');
  const standalone=options.standalone===true;
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked by authenticated browser fixture */'}));
  await context.addInitScript(({state,uid,displayName,email,standalone})=>{
    if(standalone){try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}}
    localStorage.setItem(`garang_user_${uid}_v3`,JSON.stringify(state));
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
  },{state,uid,displayName,email,standalone});
  return {uid,storageKey:storageKey(uid)};
}

module.exports={installAuthenticatedBrowserFixture,storageKey};
