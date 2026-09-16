/* GARANG Coach Multimodal v1
   Ephemeral one-photo attachment for authenticated Coach requests.
   Raw image data lives only in memory until the next Coach request and is never written to GARANG state/localStorage. */
(()=>{
'use strict';
if(window.__garangCoachMultimodalV1)return;window.__garangCoachMultimodalV1=true;
const MAX_FILE_BYTES=8*1024*1024,MAX_DATA_URL=2600000;
let draft=null,queued=false;
const ko=()=>document.documentElement.lang!=='en';
function clear(){
 draft=null;
 document.querySelectorAll('.g6-photo-preview').forEach(el=>el.remove());
 document.querySelectorAll('.g2-composer.g6-has-photo').forEach(el=>el.classList.remove('g6-has-photo'));
}
function consumeForRequest(){if(!draft)return null;const out=draft;clear();return out;}
function style(){
 if(document.getElementById('garang-coach-multimodal-v1-style'))return;
 const s=document.createElement('style');s.id='garang-coach-multimodal-v1-style';
 s.textContent=`
 .g2-composer.g6-photo-composer{position:relative}
 .g2-composer.g6-photo-composer textarea{padding-left:52px!important}
 .g2-composer.g6-photo-composer.g6-has-photo textarea{padding-top:60px!important;min-height:104px!important}
 .g6-photo-button{position:absolute;left:9px;bottom:9px;z-index:4;width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(242,239,233,.12);border-radius:999px;background:rgba(12,15,13,.92);color:#d8ddd8;padding:0;font:400 23px/1 var(--g2-ui,system-ui);touch-action:manipulation;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:border-color .16s ease,background .16s ease,transform .16s ease}
 .g6-photo-button:hover{border-color:rgba(79,174,146,.32);background:#101713}
 .g6-photo-button:active{transform:scale(.96)}
 .g6-photo-button:focus-visible{outline:2px solid rgba(79,174,146,.55);outline-offset:2px}
 .g6-photo-preview{position:absolute;left:10px;top:8px;z-index:3;width:46px;height:46px;border:1px solid rgba(242,239,233,.12);border-radius:11px;background:#090b0a;box-shadow:0 5px 16px rgba(0,0,0,.22);overflow:visible}
 .g6-photo-preview img{display:block;width:100%;height:100%;border-radius:10px;object-fit:cover}
 .g6-photo-preview button{position:absolute;right:-7px;top:-7px;width:20px;height:20px;display:grid;place-items:center;border:1px solid rgba(242,239,233,.16);border-radius:999px;background:#171b18;color:#d7dcd7;padding:0;font:500 14px/1 system-ui;box-shadow:0 2px 8px rgba(0,0,0,.28)}
 @media(max-width:800px){.g6-photo-button{width:36px;height:36px;left:8px;bottom:8px}.g2-composer.g6-photo-composer textarea{padding-left:54px!important}}
 `;
 document.head.appendChild(s);
}
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
function renderPreview(composer){
 composer.querySelector('.g6-photo-preview')?.remove();
 composer.classList.toggle('g6-has-photo',!!draft);
 if(!draft)return;
 const box=document.createElement('div');box.className='g6-photo-preview';box.setAttribute('role','group');box.setAttribute('aria-label',ko()?'다음 Coach 요청에 첨부할 사진':'Photo attached to the next Coach request');
 const img=document.createElement('img');img.alt=ko()?'첨부 사진 미리보기':'Attached photo preview';img.src=draft.dataUrl;
 const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',ko()?'첨부 사진 제거':'Remove attached photo');remove.textContent='×';remove.onclick=clear;
 box.append(img,remove);composer.appendChild(box);
}
function ensure(root){
 style();
 const composer=root.querySelector('.g2-composer');if(!composer)return;
 composer.classList.add('g6-photo-composer');
 let button=composer.querySelector('.g6-photo-button'),input=composer.querySelector('.g6-photo-input');
 if(!button){
  button=document.createElement('button');button.type='button';button.className='g6-photo-button';button.textContent='+';button.setAttribute('aria-label',ko()?'Coach에 사진 첨부':'Attach photo to Coach');button.title=ko()?'사진 첨부 · 다음 요청 후 저장되지 않음':'Attach photo · not saved after the next request';composer.appendChild(button);
 }
 if(!input){
  input=document.createElement('input');input.className='g6-photo-input';input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;composer.appendChild(input);
 }
 button.onclick=()=>input.click();
 input.onchange=async()=>{
  const file=input.files?.[0];input.value='';if(!file)return;
  try{
   draft=await compress(file);renderPreview(composer);
   const textarea=composer.querySelector('textarea');
   if(textarea&&!String(textarea.value||'').trim()){
    textarea.value=ko()?'이 사진을 내 GARANG 기록과 함께 보고, 훈련 관점에서 보이는 점을 알려줘.':'Review this photo with my GARANG records and tell me what is visibly relevant to my training.';
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
   }
  }catch(error){
   window.dispatchEvent(new CustomEvent('garang:error',{detail:{category:'coach_photo',code:'COACH_PHOTO_INVALID',retryable:true}}));
   const toast=document.getElementById('toast');if(toast){toast.textContent=String(error?.message||error);toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);}
  }
 };
 renderPreview(composer);
}
function sync(){queued=false;const root=document.querySelector('.garang-coach-v2');if(root)ensure(root);}
function queue(){if(queued)return;queued=true;requestAnimationFrame(sync);}
window.addEventListener('garang:screen-rendered',event=>{if(event?.detail?.screen!=='coach')clear();queue();});
window.addEventListener('garang:coach-mounted',queue);
window.GarangCoachPhotoDraft=Object.freeze({consumeForRequest,clear,hasDraft:()=>!!draft});queue();
})();
