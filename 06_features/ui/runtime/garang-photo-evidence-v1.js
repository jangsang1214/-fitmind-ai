/* GARANG Photo Evidence v1.5
   Device-local binary storage for user-confirmed workout and nutrition evidence.
   State records store metadata only; raw image bytes never enter Firestore/local JSON. */
(function(root){
  'use strict';

  const VERSION='garang-photo-evidence-v1.5';
  const DB_NAME='garang_photo_evidence_v1';
  const STORE='evidence';
  const MAX_FILE_BYTES=8*1024*1024;
  const IMAGE_TYPES=Object.freeze(['image/jpeg','image/png','image/webp','image/heic','image/heif']);

  function validateFile(file){
    if(!file)return {ok:false,reason:'NO_FILE',message:'사진을 선택해 주세요.'};
    const type=String(file.type||'').toLowerCase();
    if(!IMAGE_TYPES.includes(type))return {ok:false,reason:'UNSUPPORTED_TYPE',message:'JPG, PNG, WebP, HEIC 사진만 사용할 수 있습니다.'};
    if(Number(file.size||0)>MAX_FILE_BYTES)return {ok:false,reason:'FILE_TOO_LARGE',message:'사진은 8MB 이하로 선택해 주세요.'};
    return {ok:true};
  }

  function revoke(draft){
    if(draft?.url)try{URL.revokeObjectURL(draft.url);}catch{}
  }

  function pick(input,kind,onReady,onError){
    if(!input)return onError?.('사진 선택기를 찾지 못했습니다.');
    input.value='';
    input.onchange=()=>{
      const file=input.files?.[0]||null,check=validateFile(file);
      if(!check.ok){onError?.(check.message,check.reason);return;}
      const draft={kind:String(kind||'evidence'),file,url:URL.createObjectURL(file),name:file.name||'photo',type:file.type,size:file.size};
      onReady?.(draft);
    };
    input.click();
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!root.indexedDB)return reject(new Error('INDEXEDDB_UNAVAILABLE'));
      const req=root.indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('PHOTO_DB_OPEN_FAILED'));
    });
  }

  async function store(id,file){
    const check=validateFile(file);
    if(!check.ok)throw new Error(check.reason);
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(file,String(id));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('PHOTO_STORE_FAILED'));
        tx.onabort=()=>reject(tx.error||new Error('PHOTO_STORE_ABORTED'));
      });
    }finally{db.close();}
    return true;
  }

  async function read(id){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(String(id));
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error||new Error('PHOTO_READ_FAILED'));
      });
    }finally{db.close();}
  }

  async function remove(id){
    if(id===undefined||id===null||id==='')return false;
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).delete(String(id));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('PHOTO_DELETE_FAILED'));
        tx.onabort=()=>reject(tx.error||new Error('PHOTO_DELETE_ABORTED'));
      });
    }finally{db.close();}
    return true;
  }

  async function removeMany(ids){
    const values=[...new Set((Array.isArray(ids)?ids:[]).filter(value=>value!==undefined&&value!==null&&String(value).trim()).map(String))];
    if(!values.length)return 0;
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
        values.forEach(id=>store.delete(id));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('PHOTO_DELETE_FAILED'));
        tx.onabort=()=>reject(tx.error||new Error('PHOTO_DELETE_ABORTED'));
      });
    }finally{db.close();}
    return values.length;
  }

  function metadata(id,file,kind){
    return Object.freeze({
      id:String(id),
      kind:String(kind||'evidence'),
      name:String(file?.name||'photo'),
      type:String(file?.type||''),
      size:Number(file?.size||0),
      storage:'device-indexeddb',
      localOnly:true,
      userConfirmed:true,
      createdAt:new Date().toISOString()
    });
  }

  async function show(id,title="기록 사진",context={}){
    let file=null;
    try{file=await read(id);}catch{return {ok:false,reason:"READ_FAILED"};}
    if(!file)return {ok:false,reason:"MISSING_DEVICE_MEDIA"};
    if(!root.document)return {ok:true,file};
    const url=URL.createObjectURL(file),shade=root.document.createElement("div");
    shade.className="garang-photo-evidence-lightbox";
    const dialog=root.document.createElement("div");dialog.className="garang-photo-evidence-dialog";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label",title);
    const head=root.document.createElement("div");head.className="garang-photo-evidence-dialog-head";
    const label=root.document.createElement("div"),eyebrow=root.document.createElement("span"),strong=root.document.createElement("strong");
    eyebrow.className="eyebrow";eyebrow.textContent="GARANG EVIDENCE";strong.textContent=title;label.append(eyebrow,strong);
    const close=root.document.createElement("button");close.className="ghost small";close.type="button";close.textContent="닫기";close.setAttribute("aria-label","사진 닫기");
    const frame=root.document.createElement("div");frame.className="garang-photo-evidence-viewer-frame";
    const img=root.document.createElement("img");img.src=url;img.alt=title;img.className="garang-photo-evidence-full";frame.append(img);
    const meta=root.document.createElement("div");meta.className="garang-photo-evidence-meta";
    const metaTop=root.document.createElement("div");metaTop.className="garang-photo-evidence-meta-top";
    const kind=root.document.createElement("span");kind.textContent=String(context.kind||"evidence").toLowerCase()==="nutrition"?"MEAL EVIDENCE":"WORKOUT EVIDENCE";
    const date=root.document.createElement("span");date.textContent=String(context.date||"");
    metaTop.append(kind,date);
    const detail=root.document.createElement("strong");detail.textContent=String(context.meta||"기록과 함께 저장된 사진");
    const note=root.document.createElement("small");note.className="garang-photo-evidence-local-note";note.textContent="사진 원본은 현재 기기에 저장됩니다.";
    meta.append(metaTop,detail,note);
    head.append(label,close);dialog.append(head,frame,meta);shade.append(dialog);root.document.body.append(shade);
    const onKey=event=>{if(event.key==="Escape")dispose();};
    const dispose=()=>{root.removeEventListener?.("keydown",onKey);try{URL.revokeObjectURL(url);}catch{}shade.remove();};
    close.onclick=dispose;shade.onclick=event=>{if(event.target===shade)dispose();};root.addEventListener?.("keydown",onKey);
    close.focus?.();
    return {ok:true,file};
  }

  root.GarangPhotoEvidence=Object.freeze({VERSION,MAX_FILE_BYTES,IMAGE_TYPES,validateFile,pick,store,read,remove,removeMany,metadata,show,revoke});
})(typeof window==='undefined'?globalThis:window);
