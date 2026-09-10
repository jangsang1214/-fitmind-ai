/* GARANG Today Anatomy v2
   Lightweight 3D model B for Today FRONT/BACK anatomy.
   Preserves the canonical view controls and muscle focus contract without a heavy 3D engine.
*/
(() => {
'use strict';
const main=document.getElementById('main');if(!main||window.__garangTodayAnatomyV1)return;window.__garangTodayAnatomyV1=true;
let scheduled=false,activeView='front',activePanel=null,tiltFrame=0;
const setText=(el,value)=>{const next=String(value??'');if(el&&el.textContent!==next)el.textContent=next;};
const setAttr=(el,name,value)=>{const next=String(value);if(el&&el.getAttribute(name)!==next)el.setAttribute(name,next);};
function lite3dSvg(side='front',gender='male'){
 const back=side==='back',id=`gb1-${side}-${gender}`,figureTransform=gender==='female'?'translate(6 0) scale(.94 1)':'';
 const frontMuscles=`
  <path class="b1-muscle muscle-zone muscle-shoulders" d="M49 82 C53 67 64 60 77 61 C73 72 65 82 53 89 Z"/><path class="b1-muscle muscle-zone muscle-shoulders" d="M151 82 C147 67 136 60 123 61 C127 72 135 82 147 89 Z"/>
  <path class="b1-muscle muscle-zone muscle-chest" d="M61 86 C70 74 83 71 98 74 L97 107 C84 111 71 107 59 99 Z"/><path class="b1-muscle muscle-zone muscle-chest" d="M139 86 C130 74 117 71 102 74 L103 107 C116 111 129 107 141 99 Z"/>
  <path class="b1-muscle muscle-zone muscle-biceps" d="M47 102 C51 91 58 88 65 96 C64 112 60 127 55 139 C48 136 44 124 44 112 Z"/><path class="b1-muscle muscle-zone muscle-biceps" d="M153 102 C149 91 142 88 135 96 C136 112 140 127 145 139 C152 136 156 124 156 112 Z"/>
  <path class="b1-muscle muscle-zone muscle-core" d="M77 111 C83 107 91 107 97 111 L96 139 C89 143 82 142 77 137 Z"/><path class="b1-muscle muscle-zone muscle-core" d="M123 111 C117 107 109 107 103 111 L104 139 C111 143 118 142 123 137 Z"/>
  <path class="b1-muscle muscle-zone muscle-core" d="M79 143 C84 140 91 141 97 144 L96 167 C89 172 83 170 79 166 Z"/><path class="b1-muscle muscle-zone muscle-core" d="M121 143 C116 140 109 141 103 144 L104 167 C111 172 117 170 121 166 Z"/>
  <path class="b1-muscle muscle-zone muscle-legs" d="M75 196 C82 187 92 190 98 199 L92 254 C86 264 77 263 72 253 C67 233 68 213 75 196 Z"/><path class="b1-muscle muscle-zone muscle-legs" d="M125 196 C118 187 108 190 102 199 L108 254 C114 264 123 263 128 253 C133 233 132 213 125 196 Z"/>
  <path class="b1-muscle muscle-zone muscle-legs b1-calf" d="M70 267 C76 258 85 261 89 271 L84 331 C80 342 71 341 67 331 C63 309 64 283 70 267 Z"/><path class="b1-muscle muscle-zone muscle-legs b1-calf" d="M130 267 C124 258 115 261 111 271 L116 331 C120 342 129 341 133 331 C137 309 136 283 130 267 Z"/>`;
 const backMuscles=`
  <path class="b1-muscle muscle-zone muscle-shoulders" d="M49 82 C53 67 65 60 78 62 C73 74 64 84 52 90 Z"/><path class="b1-muscle muscle-zone muscle-shoulders" d="M151 82 C147 67 135 60 122 62 C127 74 136 84 148 90 Z"/>
  <path class="b1-muscle muscle-zone muscle-back" d="M78 63 C84 59 92 59 98 63 L97 92 C90 100 82 102 71 100 C70 84 72 71 78 63 Z"/><path class="b1-muscle muscle-zone muscle-back" d="M122 63 C116 59 108 59 102 63 L103 92 C110 100 118 102 129 100 C130 84 128 71 122 63 Z"/>
  <path class="b1-muscle muscle-zone muscle-back" d="M68 102 C78 96 89 98 98 104 L96 151 C88 160 78 159 70 151 C64 137 63 116 68 102 Z"/><path class="b1-muscle muscle-zone muscle-back" d="M132 102 C122 96 111 98 102 104 L104 151 C112 160 122 159 130 151 C136 137 137 116 132 102 Z"/>
  <path class="b1-muscle muscle-zone muscle-triceps" d="M48 101 C53 91 60 90 65 99 C63 118 59 133 54 145 C47 138 44 126 44 112 Z"/><path class="b1-muscle muscle-zone muscle-triceps" d="M152 101 C147 91 140 90 135 99 C137 118 141 133 146 145 C153 138 156 126 156 112 Z"/>
  <path class="b1-muscle muscle-zone muscle-legs" d="M74 191 C82 184 93 186 99 196 L94 222 C87 230 78 228 72 219 C68 207 69 197 74 191 Z"/><path class="b1-muscle muscle-zone muscle-legs" d="M126 191 C118 184 107 186 101 196 L106 222 C113 230 122 228 128 219 C132 207 131 197 126 191 Z"/>
  <path class="b1-muscle muscle-zone muscle-legs" d="M72 226 C80 219 90 222 94 233 L90 262 C84 270 75 267 70 258 C66 245 67 234 72 226 Z"/><path class="b1-muscle muscle-zone muscle-legs" d="M128 226 C120 219 110 222 106 233 L110 262 C116 270 125 267 130 258 C134 245 133 234 128 226 Z"/>
  <path class="b1-muscle muscle-zone muscle-legs b1-calf" d="M70 269 C76 260 85 262 89 272 L84 332 C80 343 71 342 67 331 C63 309 64 284 70 269 Z"/><path class="b1-muscle muscle-zone muscle-legs b1-calf" d="M130 269 C124 260 115 262 111 272 L116 332 C120 343 129 342 133 331 C137 309 136 284 130 269 Z"/>`;
 const contour=back?`<path class="b1-seam" d="M100 60 C98 92 99 128 100 176"/><path class="b1-seam fine" d="M72 101 C82 108 90 111 98 119 M128 101 C118 108 110 111 102 119"/><path class="b1-seam fine" d="M74 151 C83 157 91 159 98 160 M126 151 C117 157 109 159 102 160"/>`:`<path class="b1-seam" d="M100 73 L100 174"/><path class="b1-seam fine" d="M60 85 C74 90 87 91 98 88 M140 85 C126 90 113 91 102 88"/><path class="b1-seam fine" d="M78 126 L97 126 M103 126 L122 126 M79 153 L97 153 M103 153 L121 153"/>`;
 return `<svg class="g3-body-model garang-body-b1" data-garang-anatomy-model="b1-lite-3d" data-side="${side}" data-gender="${gender}" viewBox="0 0 200 380" role="img" aria-label="${back?'Back':'Front'} body 3D anatomy"><defs>
  <linearGradient id="${id}-skin" x1="0" x2="1"><stop offset="0" stop-color="#262a28"/><stop offset=".22" stop-color="#5f625d"/><stop offset=".5" stop-color="#c5c0b6"/><stop offset=".72" stop-color="#777a73"/><stop offset="1" stop-color="#202321"/></linearGradient>
  <linearGradient id="${id}-limb" x1="0" x2="1"><stop offset="0" stop-color="#1e2220"/><stop offset=".43" stop-color="#898a82"/><stop offset=".58" stop-color="#b5b0a7"/><stop offset="1" stop-color="#292d2a"/></linearGradient>
  <radialGradient id="${id}-head" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#d4cec3"/><stop offset=".52" stop-color="#777973"/><stop offset="1" stop-color="#252926"/></radialGradient>
  <linearGradient id="${id}-muscle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d09a82"/><stop offset=".52" stop-color="#b36d56"/><stop offset="1" stop-color="#663b31"/></linearGradient>
  <linearGradient id="${id}-full" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#91b3a7"/><stop offset="1" stop-color="#49685f"/></linearGradient>
 </defs><ellipse class="b1-ground" cx="100" cy="355" rx="49" ry="10"/><g class="b1-stage"><g class="b1-figure ${back?'is-back':'is-front'}" transform="${figureTransform}">
  <g class="b1-depth" aria-hidden="true"><ellipse cx="103" cy="31" rx="19" ry="24"/><path d="M82 52 C80 59 77 63 71 67 L129 67 C123 63 120 59 118 52 C113 58 87 58 82 52 Z"/><path d="M73 63 C57 66 49 76 48 91 C47 111 55 135 63 158 C68 173 77 183 100 183 C123 183 132 173 137 158 C145 135 153 111 152 91 C151 76 143 66 127 63 C119 69 111 71 100 71 C89 71 81 69 73 63 Z"/></g>
  <ellipse class="b1-form b1-head" cx="100" cy="31" rx="19" ry="24" fill="url(#${id}-head)"/><path class="b1-form b1-neck" d="M82 52 C80 59 77 63 71 67 L129 67 C123 63 120 59 118 52 C113 58 87 58 82 52 Z" fill="url(#${id}-skin)"/>
  <path class="b1-form b1-torso" d="M73 63 C57 66 49 76 48 91 C47 111 55 135 63 158 C68 173 77 183 100 183 C123 183 132 173 137 158 C145 135 153 111 152 91 C151 76 143 66 127 63 C119 69 111 71 100 71 C89 71 81 69 73 63 Z" fill="url(#${id}-skin)"/>
  <path class="b1-form b1-pelvis" d="M72 171 C67 184 67 197 73 207 C81 216 119 216 127 207 C133 197 133 184 128 171 C119 178 81 178 72 171 Z" fill="url(#${id}-skin)"/>
  <path class="b1-form b1-arm" d="M51 80 C41 86 37 99 38 114 C39 132 43 148 48 163 L50 184 C51 194 58 198 63 190 L63 165 C62 151 66 135 68 120 L69 92 C65 84 59 80 51 80 Z" fill="url(#${id}-limb)"/><path class="b1-form b1-arm" d="M149 80 C159 86 163 99 162 114 C161 132 157 148 152 163 L150 184 C149 194 142 198 137 190 L137 165 C138 151 134 135 132 120 L131 92 C135 84 141 80 149 80 Z" fill="url(#${id}-limb)"/>
  <path class="b1-form b1-hand" d="M50 181 C47 193 47 202 52 210 C57 214 62 210 63 199 L62 186 Z" fill="url(#${id}-limb)"/><path class="b1-form b1-hand" d="M150 181 C153 193 153 202 148 210 C143 214 138 210 137 199 L138 186 Z" fill="url(#${id}-limb)"/>
  <path class="b1-form b1-leg" d="M74 202 C68 226 67 248 71 266 C65 289 65 318 68 342 L69 359 C72 369 84 369 88 359 L89 340 C92 313 93 288 90 266 C96 241 99 220 97 202 Z" fill="url(#${id}-limb)"/><path class="b1-form b1-leg" d="M126 202 C132 226 133 248 129 266 C135 289 135 318 132 342 L131 359 C128 369 116 369 112 359 L111 340 C108 313 107 288 110 266 C104 241 101 220 103 202 Z" fill="url(#${id}-limb)"/>
  <path class="b1-form b1-foot" d="M69 354 C66 362 61 367 57 371 C64 376 82 375 88 368 L88 357 Z" fill="url(#${id}-limb)"/><path class="b1-form b1-foot" d="M131 354 C134 362 139 367 143 371 C136 376 118 375 112 368 L112 357 Z" fill="url(#${id}-limb)"/>
  ${back?backMuscles:frontMuscles}${contour}
  <path class="b1-specular" d="M83 56 C88 60 93 61 100 61 M61 75 C55 91 56 112 62 132 M77 210 C73 231 74 247 77 258"/><path class="b1-rim" d="M79 9 C69 14 67 26 70 38 M54 80 C43 103 46 137 54 158 M74 204 C67 232 68 257 72 272"/>
 </g></g></svg>`;
}
function installModel(map){
 if(!map)return;const gender=String(map.dataset.gender||'male').toLowerCase()==='female'?'female':'male';const views=[...map.querySelectorAll('.body-view')];
 views.forEach((view,index)=>{const side=index===1?'back':'front';const current=view.querySelector('svg');if(current?.dataset?.garangAnatomyModel==='b1-lite-3d'&&current.dataset.side===side&&current.dataset.gender===gender)return;const template=document.createElement('template');template.innerHTML=lite3dSvg(side,gender).trim();const svg=template.content.firstElementChild;if(!svg)return;if(current)current.replaceWith(svg);else view.appendChild(svg);});
 map.dataset.garangAnatomyModel='b1-lite-3d';
}
function setView(panel,side){
 const wrap=panel.querySelector('.muscle-map-wrap.compact-map'),map=wrap?.querySelector('.muscle-map');if(!wrap||!map)return;
 activeView=side==='back'?'back':'front';if(wrap.dataset.garangTodayView!==activeView)wrap.dataset.garangTodayView=activeView;
 [...map.querySelectorAll('.body-view')].forEach((view,index)=>{const visible=(index===1?'back':'front')===activeView;if(view.hidden===visible)view.hidden=!visible;setAttr(view,'aria-hidden',visible?'false':'true');const display=visible?'flex':'none';if(view.style.getPropertyValue('display')!==display||view.style.getPropertyPriority('display')!=='important')view.style.setProperty('display',display,'important');const caption=view.querySelector(':scope > span');if(caption&&!caption.hidden)caption.hidden=true;});
 panel.querySelectorAll('[data-today-view]').forEach(button=>{const selected=button.dataset.todayView===activeView;button.classList.toggle('active',selected);setAttr(button,'aria-pressed',selected?'true':'false');});
}
function ensureControls(panel){
 panel.querySelectorAll(':scope > .g3-anatomy-tools').forEach(el=>el.remove());let key=panel.querySelector(':scope > .today-anatomy-key');if(!key){key=document.createElement('div');key.className='today-anatomy-key';panel.appendChild(key);}if(key.dataset.garangInteractive==='1')return;key.dataset.garangInteractive='1';setAttr(key,'aria-label','Anatomy view');key.innerHTML='<div class="today-view-switch" role="group" aria-label="Body view"><button type="button" data-today-view="front" aria-pressed="true">FRONT</button><button type="button" data-today-view="back" aria-pressed="false">BACK</button></div>';
}
function bindTilt(panel){
 if(panel.dataset.garangB1Tilt==='1'||!matchMedia('(pointer:fine)').matches)return;panel.dataset.garangB1Tilt='1';
 panel.addEventListener('pointermove',event=>{if(tiltFrame)return;tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;const rect=panel.getBoundingClientRect();const x=(event.clientX-rect.left)/Math.max(1,rect.width)-.5,y=(event.clientY-rect.top)/Math.max(1,rect.height)-.5;panel.style.setProperty('--b1-ry',`${(x*8).toFixed(2)}deg`);panel.style.setProperty('--b1-rx',`${(-y*5).toFixed(2)}deg`);});},{passive:true});
 panel.addEventListener('pointerleave',()=>{panel.style.setProperty('--b1-ry','0deg');panel.style.setProperty('--b1-rx','0deg');},{passive:true});
}
function render(){scheduled=false;const panel=main.querySelector('.today-body-panel');if(!panel){activePanel=null;return;}if(panel!==activePanel){activePanel=panel;activeView='front';}const wrap=panel.querySelector('.muscle-map-wrap.compact-map');if(!wrap)return;const label=panel.querySelector('.today-body-label');if(label)setText(label.querySelector('.eyebrow'),document.documentElement.lang==='en'?'3D TRAINING FOCUS':'3D TRAINING FOCUS / 주요 부위');ensureControls(panel);bindTilt(panel);wrap.classList.add('garang-today-anatomy-premium','garang-today-anatomy-3d');const map=wrap.querySelector('.muscle-map');if(!map)return;map.classList.add('garang-today-anatomy-map');installModel(map);setView(panel,activeView);}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(render));}
window.addEventListener('garang:screen-rendered',schedule);window.addEventListener('garang:state-updated',schedule);window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule,{passive:true});document.addEventListener('click',event=>{const button=event.target.closest('[data-today-view]');if(button){event.preventDefault();event.stopPropagation();const panel=button.closest('.today-body-panel');if(panel)setView(panel,button.dataset.todayView);return;}if(event.target.closest('[data-page="today"],[data-pagego="today"]'))setTimeout(schedule,0);},true);document.documentElement.addEventListener('garang:language-changed',schedule);window.GarangTodayAnatomy=Object.freeze({version:'garang-today-anatomy-v2.0.0',model:'b1-lite-3d',engine:'svg-css'});schedule();
})();
