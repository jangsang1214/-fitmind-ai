/* GARANG Coach Multimodal v1
   Ephemeral one-photo attachment for authenticated Coach requests.
   Raw image data lives only in memory until the next Coach request and is never written to GARANG state/localStorage. */
(()=>{
'use strict';
if(window.__garangCoachMultimodalV1)return;window.__garangCoachMultimodalV1=true;
const MAX_FILE_BYTES=8*1024*1024,MAX_DATA_URL=2600000;
let draft=null,queued=false;
const ko=()=>document.documentElement.lang!=='en';
function clear(){draft=null;document.querySelectorAll('.g6-photo-preview').forEach(el=>el.remove());}
function consumeForRequest(){if(!draft)return null;const out=draft;clear();return out;}
function style(){if(document.getElementById('garang-coach-multimodal-v1-style'))return;const s=document.createElement('style');s.id='garang-coach-multimodal-v1-style';s.textContent=`.g6-photo-tools{display:flex;align-items:center;gap:7px;margin:0 0 7px}.g6-photo-button{min-width:38px;height:34px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0c0f0d;color:#d7dad6;padding:0 10px;font:600 11px/1 var(--g2-ui,system-ui);touch-action:manipulation}.g6-photo-button:focus-visible{outline:1px solid rgba(79,174,146,.7)}.g6-photo-note{color:#777d78;font:500 9px/1.35 var(--g2-ui,system-ui)}.g6-photo-preview{display:flex;align-items:center;gap:9px;padding:8px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:#0a0c0b;margin:0 0 7px}.g6-photo-preview img{width:48px;height:48px;border-radius:8px;object-fit:cover}.g6-photo-preview span{flex:1;color:#aeb3ae;font:500 10px/1.35 var(--g2-ui,system-ui)}.g6-photo-preview button{border:0;background:transparent;color:#aeb3ae;font-size:16px;padding:8px}`;document.head.appendChild(s);}
function read(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('PHOTO_READ_FAILED'));r.readAsDataURL(file);});}
function imageFrom(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('PHOTO_DECODE_FAILED'));image.src=src;});}
async function compress(file){
 if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type||''))throw new Error(ko()?'JPG, PNG, WebP 사진만 사용할 수 있습니다.':'Use a JPG, PNG, or WebP image.');
 if(file.size>MAX_FILE_BYTES)throw new Error(ko()?'사진은 8MB 이하로 선택해 주세요.':'Choose an image under 8 MB.');
 const src=await read(file),image=await imageFrom(src);let limit=1280,quality=.82;
 for(let attempt=0;attempt<3;attempt++){
  const scale=Math.min(1,limit/Math.max(image.naturalWidth||1,image.naturalHeight||1)),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,w,h);
  const dataUrl=canvas.toDataURL('image/jpeg',quality);if(dataUrl.length<=MAX_DATA_URL)return {kind:'body_photo',mediaType:'image/jpeg',dataUrl};
  limit=1024;quality=.68;
 }
 throw new Error(ko()?'사진을 더 작은 크기로 선택해 주세요.':'Choose a smaller image.');
}
function renderPreview(wrap){wrap.querySelector('.g6-photo-preview')?.remove();if(!draft)return;const box=document.createElement('div');box.className='g6-photo-preview';const img=document.createElement('img');img.alt=ko()?'전송할 사진 미리보기':'Photo preview';img.src=draft.dataUrl;const text=document.createElement('span');text.textContent=ko()?'이 사진은 다음 Coach 요청에만 사용되며 GARANG 기록에는 저장되지 않습니다.':'This photo is used only for the next Coach request and is not saved to GARANG records.';const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',ko()?'사진 제거':'Remove photo');remove.textContent='×';remove.onclick=clear;box.append(img,text,remove);wrap.prepend(box);}
function ensure(root){
 style();const composer=root.querySelector('.g2-composer'),wrap=root.querySelector('.g2-composer-wrap');if(!composer||!wrap||wrap.querySelector('.g6-photo-tools'))return;
 const tools=document.createElement('div');tools.className='g6-photo-tools';const button=document.createElement('button');button.type='button';button.className='g6-photo-button';button.textContent=ko()?'사진':'Photo';button.setAttribute('aria-label',ko()?'Coach에 사진 첨부':'Attach photo to Coach');const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;const note=document.createElement('span');note.className='g6-photo-note';note.textContent=ko()?'사진 1장 · 요청 후 원본 미저장':'1 photo · raw image not saved';button.onclick=()=>input.click();input.onchange=async()=>{const file=input.files?.[0];input.value='';if(!file)return;try{draft=await compress(file);renderPreview(wrap);const textarea=composer.querySelector('textarea');if(textarea&&!String(textarea.value||'').trim()){textarea.value=ko()?'이 사진을 내 GARANG 기록과 함께 보고, 훈련 관점에서 보이는 점을 알려줘.':'Review this photo with my GARANG records and tell me what is visibly relevant to my training.';textarea.dispatchEvent(new Event('input',{bubbles:true}));}}catch(error){window.dispatchEvent(new CustomEvent('garang:error',{detail:{category:'coach_photo',code:'COACH_PHOTO_INVALID',retryable:true}}));const toast=document.getElementById('toast');if(toast){toast.textContent=String(error?.message||error);toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);}}};tools.append(button,input,note);wrap.insertBefore(tools,composer);renderPreview(wrap);
}
function sync(){queued=false;const root=document.querySelector('.garang-coach-v2');if(root)ensure(root);}
function queue(){if(queued)return;queued=true;requestAnimationFrame(sync);}
window.addEventListener('garang:screen-rendered',event=>{if(event?.detail?.screen!=='coach')clear();queue();});
window.addEventListener('garang:coach-mounted',queue);
window.GarangCoachPhotoDraft=Object.freeze({consumeForRequest,clear,hasDraft:()=>!!draft});queue();
})();
