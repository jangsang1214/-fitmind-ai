/* GARANG muscular anatomy v1
   Shared presentation component for Today / Body / Summary.
   Original SVG geometry; no reference screenshot data is embedded.
*/
(()=>{
'use strict';
if(window.GarangMuscularAnatomyV1)return;
const VERSION='garang-muscular-anatomy-v1.0.0';
const NS='http://www.w3.org/2000/svg';
const esc=value=>String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function markup(side='front',gender='male',focus='upper'){
 const back=side==='back',female=gender==='female',id=`gma-${side}-${gender}-${Math.random().toString(36).slice(2,8)}`;
 const torso=female?'M110 71 C82 72 68 89 66 118 C65 146 75 180 86 205 C93 221 101 231 110 231 C119 231 127 221 134 205 C145 180 155 146 154 118 C152 89 138 72 110 71Z':'M110 69 C77 70 61 88 60 118 C59 151 72 185 84 210 C91 225 100 234 110 234 C120 234 129 225 136 210 C148 185 161 151 160 118 C159 88 143 70 110 69Z';
 const pelvis=female?'M82 201 C77 219 80 242 94 254 C103 260 117 260 126 254 C140 242 143 219 138 201 C124 213 96 213 82 201Z':'M83 205 C77 224 80 244 93 254 C102 260 118 260 127 254 C140 244 143 224 137 205 C124 216 96 216 83 205Z';
 const frontMuscles=`
 <path class="gma-muscle gma-shoulder" d="M64 92 C72 77 84 74 94 80 C89 96 80 108 65 111Z"/><path class="gma-muscle gma-shoulder" d="M156 92 C148 77 136 74 126 80 C131 96 140 108 155 111Z"/>
 <path class="gma-muscle gma-chest" d="M72 101 C83 86 96 84 108 91 L107 128 C92 134 80 130 70 119Z"/><path class="gma-muscle gma-chest" d="M148 101 C137 86 124 84 112 91 L113 128 C128 134 140 130 150 119Z"/>
 <path class="gma-muscle gma-biceps" d="M58 112 C66 105 73 110 73 122 C70 143 65 160 59 174 C50 167 48 148 51 128Z"/><path class="gma-muscle gma-biceps" d="M162 112 C154 105 147 110 147 122 C150 143 155 160 161 174 C170 167 172 148 169 128Z"/>
 <path class="gma-muscle gma-core" d="M88 135 C95 130 102 132 108 136 L107 162 C99 166 92 165 87 160Z"/><path class="gma-muscle gma-core" d="M132 135 C125 130 118 132 112 136 L113 162 C121 166 128 165 133 160Z"/>
 <path class="gma-muscle gma-core" d="M89 166 C96 163 103 164 108 168 L107 191 C99 196 92 194 88 190Z"/><path class="gma-muscle gma-core" d="M131 166 C124 163 117 164 112 168 L113 191 C121 196 128 194 132 190Z"/>
 <path class="gma-muscle gma-quad" d="M88 249 C97 242 104 248 108 263 L102 319 C96 333 87 332 82 320 C77 296 79 266 88 249Z"/><path class="gma-muscle gma-quad" d="M132 249 C123 242 116 248 112 263 L118 319 C124 333 133 332 138 320 C143 296 141 266 132 249Z"/>
 <path class="gma-muscle gma-calf" d="M80 326 C88 318 97 325 99 338 L94 374 C90 386 82 385 77 374 C74 356 75 340 80 326Z"/><path class="gma-muscle gma-calf" d="M140 326 C132 318 123 325 121 338 L126 374 C130 386 138 385 143 374 C146 356 145 340 140 326Z"/>`;
 const backMuscles=`
 <path class="gma-muscle gma-shoulder" d="M64 92 C72 77 85 74 95 81 C89 98 80 109 65 112Z"/><path class="gma-muscle gma-shoulder" d="M156 92 C148 77 135 74 125 81 C131 98 140 109 155 112Z"/>
 <path class="gma-muscle gma-trap" d="M88 78 C96 73 104 73 109 78 L108 107 C98 114 87 110 79 103 C80 91 83 82 88 78Z"/><path class="gma-muscle gma-trap" d="M132 78 C124 73 116 73 111 78 L112 107 C122 114 133 110 141 103 C140 91 137 82 132 78Z"/>
 <path class="gma-muscle gma-back" d="M74 108 C86 100 99 104 108 112 L106 164 C97 174 85 171 76 161 C69 145 68 123 74 108Z"/><path class="gma-muscle gma-back" d="M146 108 C134 100 121 104 112 112 L114 164 C123 174 135 171 144 161 C151 145 152 123 146 108Z"/>
 <path class="gma-muscle gma-triceps" d="M57 112 C65 106 72 111 72 124 C69 145 64 162 58 177 C50 169 48 149 51 129Z"/><path class="gma-muscle gma-triceps" d="M163 112 C155 106 148 111 148 124 C151 145 156 162 162 177 C170 169 172 149 169 129Z"/>
 <path class="gma-muscle gma-glute" d="M86 205 C96 197 105 199 109 211 L106 242 C97 252 88 249 82 239 C78 225 80 213 86 205Z"/><path class="gma-muscle gma-glute" d="M134 205 C124 197 115 199 111 211 L114 242 C123 252 132 249 138 239 C142 225 140 213 134 205Z"/>
 <path class="gma-muscle gma-ham" d="M87 251 C96 244 104 250 108 264 L102 318 C96 332 87 331 82 320 C77 296 79 267 87 251Z"/><path class="gma-muscle gma-ham" d="M133 251 C124 244 116 250 112 264 L118 318 C124 332 133 331 138 320 C143 296 141 267 133 251Z"/>
 <path class="gma-muscle gma-calf" d="M80 326 C88 318 97 325 99 338 L94 374 C90 386 82 385 77 374 C74 356 75 340 80 326Z"/><path class="gma-muscle gma-calf" d="M140 326 C132 318 123 325 121 338 L126 374 C130 386 138 385 143 374 C146 356 145 340 140 326Z"/>`;
 return `<svg xmlns="${NS}" class="gma-figure ${back?'is-back':'is-front'} ${focus==='upper'?'is-upper':''}" viewBox="0 0 220 400" role="img" aria-label="${back?'Back':'Front'} muscular anatomy">
 <defs>
  <linearGradient id="${id}-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d555d"/><stop offset=".2" stop-color="#8f9698"/><stop offset=".46" stop-color="#d0c9bc"/><stop offset=".72" stop-color="#6d7477"/><stop offset="1" stop-color="#252b30"/></linearGradient>
  <linearGradient id="${id}-limb" x1="0" x2="1"><stop offset="0" stop-color="#242a30"/><stop offset=".46" stop-color="#a7a69f"/><stop offset=".62" stop-color="#d0c9bc"/><stop offset="1" stop-color="#30363a"/></linearGradient>
  <linearGradient id="${id}-muscle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4a18a"/><stop offset=".23" stop-color="#d2745e"/><stop offset=".58" stop-color="#a94538"/><stop offset="1" stop-color="#5d2524"/></linearGradient>
  <linearGradient id="${id}-muscle-hi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0b6"/><stop offset=".35" stop-color="#ee8168"/><stop offset="1" stop-color="#7c2e2b"/></linearGradient>
  <radialGradient id="${id}-head" cx="38%" cy="30%" r="70%"><stop offset="0" stop-color="#d8d2c8"/><stop offset=".55" stop-color="#777d7e"/><stop offset="1" stop-color="#282e32"/></radialGradient>
 </defs>
 <ellipse class="gma-shadow" cx="110" cy="390" rx="54" ry="8"/>
 <g class="gma-body ${female?'is-female':'is-male'}">
  <ellipse class="gma-base gma-head" cx="110" cy="33" rx="20" ry="26" fill="url(#${id}-head)"/>
  <path class="gma-base gma-neck" d="M91 55 C89 65 84 69 77 74 L143 74 C136 69 131 65 129 55 C123 63 97 63 91 55Z" fill="url(#${id}-skin)"/>
  <path class="gma-base gma-torso" d="${torso}" fill="url(#${id}-skin)"/>
  <path class="gma-base gma-pelvis" d="${pelvis}" fill="url(#${id}-skin)"/>
  <path class="gma-base gma-arm" d="M64 88 C50 96 44 113 45 133 C46 154 52 177 58 196 L60 219 C61 232 69 237 76 227 L75 198 C73 180 78 159 81 141 L82 103 C77 93 71 88 64 88Z" fill="url(#${id}-limb)"/>
  <path class="gma-base gma-arm" d="M156 88 C170 96 176 113 175 133 C174 154 168 177 162 196 L160 219 C159 232 151 237 144 227 L145 198 C147 180 142 159 139 141 L138 103 C143 93 149 88 156 88Z" fill="url(#${id}-limb)"/>
  <path class="gma-base gma-hand" d="M60 214 C56 229 56 242 62 252 C68 257 75 251 76 237 L74 218Z" fill="url(#${id}-limb)"/><path class="gma-base gma-hand" d="M160 214 C164 229 164 242 158 252 C152 257 145 251 144 237 L146 218Z" fill="url(#${id}-limb)"/>
  <path class="gma-base gma-leg" d="M88 248 C79 276 79 305 83 328 C77 350 77 371 80 389 L99 389 C102 367 103 347 101 328 C107 298 111 270 108 247Z" fill="url(#${id}-limb)"/>
  <path class="gma-base gma-leg" d="M132 248 C141 276 141 305 137 328 C143 350 143 371 140 389 L121 389 C118 367 117 347 119 328 C113 298 109 270 112 247Z" fill="url(#${id}-limb)"/>
  ${back?backMuscles:frontMuscles}
  <path class="gma-fiber" d="M78 103 C88 111 98 113 107 112 M142 103 C132 111 122 113 113 112 M88 143 L107 143 M113 143 L132 143 M89 170 L107 170 M113 170 L131 170"/>
  <path class="gma-highlight" d="M96 64 C103 68 111 69 119 66 M72 90 C62 113 64 145 72 168 M92 256 C86 280 87 305 90 322"/>
 </g></svg>`;
}
function create(side='front',gender='male',focus='upper'){
 const template=document.createElement('template');template.innerHTML=markup(side,gender,focus).trim();return template.content.firstElementChild;
}
window.GarangMuscularAnatomyV1=Object.freeze({version:VERSION,markup,create});
})();
