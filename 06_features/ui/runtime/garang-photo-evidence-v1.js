/* GARANG Photo Evidence v1
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

  async function deleteMany(ids){
    const keys=[...new Set((Array.isArray(ids)?ids:[]).map(value=>String(value||'').trim()).filter(Boolean))];
    if(!keys.length)return 0;
    const db=await openDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
        keys.forEach(id=>store.delete(id));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('PHOTO_DELETE_FAILED'));
        tx.onabort=()=>reject(tx.error||new Error('PHOTO_DELETE_ABORTED'));
      });
    }finally{db.close();}
    return keys.length;
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

  async function show(id,title='기록 사진',meta=''){
    let file=null;
    try{file=await read(id);}catch{return {ok:false,reason:'READ_FAILED'};}
    if(!file)return {ok:false,reason:'MISSING_DEVICE_MEDIA'};
    if(!root.document)return {ok:true,file};
    const url=URL.createObjectURL(file),shade=root.document.createElement('div');
    shade.className='garang-photo-evidence-lightbox';
    const dialog=root.document.createElement('div');dialog.className='garang-photo-evidence-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    const head=root.document.createElement('div');head.className='garang-photo-evidence-dialog-head';
    const label=root.document.createElement('div');const eyebrow=root.document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent='GARANG EVIDENCE';const strong=root.document.createElement('strong');strong.textContent=title;label.append(eyebrow,strong);if(meta){const detail=root.document.createElement('span');detail.className='garang-photo-evidence-dialog-meta';detail.textContent=meta;label.append(detail);}
    const close=root.document.createElement('button');close.className='ghost small';close.type='button';close.textContent='닫기';
    const img=root.document.createElement('img');img.src=url;img.alt=title;img.className='garang-photo-evidence-full';
    const note=root.document.createElement('small');note.className='garang-photo-evidence-local-note';note.textContent='사진 원본은 현재 기기에 저장됩니다.';
    head.append(label,close);dialog.append(head,img,note);shade.append(dialog);root.document.body.append(shade);
    const dispose=()=>{try{URL.revokeObjectURL(url);}catch{}shade.remove();};
    close.onclick=dispose;shade.onclick=e=>{if(e.target===shade)dispose();};
    return {ok:true,file};
  }

  root.GarangPhotoEvidence=Object.freeze({VERSION,MAX_FILE_BYTES,IMAGE_TYPES,validateFile,pick,store,read,deleteMany,metadata,show,revoke});
})(typeof window==='undefined'?globalThis:window);
