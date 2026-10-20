/* GARANG Anatomy Exact v2 — original interactive vector anatomy. No board-image runtime use. */
(()=>{
'use strict';
if(window.GarangAnatomyExactV2)return;
const NS='http://www.w3.org/2000/svg';
const svg=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const MUSCLE_LABELS={chest:'가슴',shoulder:'어깨',biceps:'이두',triceps:'삼두',forearm:'전완',abs:'복근',oblique:'복사근',quad:'대퇴사두',hamstring:'햄스트링',calf:'종아리',trap:'승모',lat:'광배',back:'등',glute:'둔근'};
function defs(root){
 const d=svg('defs');
 const skin=svg('linearGradient',{id:'g7skin',x1:'0',y1:'0',x2:'1',y2:'1'});skin.append(svg('stop',{offset:'0%','stop-color':'#68717d'}),svg('stop',{offset:'23%','stop-color':'#303740'}),svg('stop',{offset:'58%','stop-color':'#171c22'}),svg('stop',{offset:'100%','stop-color':'#07090c'}));
 const skin2=svg('linearGradient',{id:'g7skin2',x1:'0',y1:'0',x2:'1',y2:'0'});skin2.append(svg('stop',{offset:'0%','stop-color':'#151a20'}),svg('stop',{offset:'50%','stop-color':'#4b535e'}),svg('stop',{offset:'100%','stop-color':'#101419'}));
 const muscle=svg('linearGradient',{id:'g7muscle',x1:'0',y1:'0',x2:'1',y2:'1'});muscle.append(svg('stop',{offset:'0%','stop-color':'#ff967d'}),svg('stop',{offset:'26%','stop-color':'#e66250'}),svg('stop',{offset:'55%','stop-color':'#a83230'}),svg('stop',{offset:'82%','stop-color':'#61191f'}),svg('stop',{offset:'100%','stop-color':'#27090e'}));
 const dark=svg('linearGradient',{id:'g7dark',x1:'0',y1:'0',x2:'1',y2:'1'});dark.append(svg('stop',{offset:'0%','stop-color':'#d56354'}),svg('stop',{offset:'46%','stop-color':'#8b2d2b'}),svg('stop',{offset:'100%','stop-color':'#321016'}));
 const shadow=svg('filter',{id:'g7depth',x:'-30%',y:'-30%',width:'160%',height:'160%'});shadow.append(svg('feDropShadow',{dx:'0',dy:'2','stdDeviation':'2','flood-color':'#000','flood-opacity':'.7'}));
 d.append(skin,skin2,muscle,dark,shadow);root.appendChild(d);
}
function muscle(group,d,name,side='both',hot=true){const p=svg('path',{d,fill:hot?'url(#g7muscle)':'url(#g7dark)',stroke:hot?'#f1a08a':'#703735','stroke-width':'1.05','stroke-linejoin':'round','data-muscle':name,'data-side':side,role:'button',tabindex:'0','aria-label':MUSCLE_LABELS[name]||name,filter:'url(#g7depth)'});group.appendChild(p);return p;}
function line(group,d,opacity=.32,width=.72,color='#ffd1bf'){group.appendChild(svg('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round',opacity}));}
function skinPart(group,d,attrs={}){const p=svg('path',{d,fill:'url(#g7skin)',stroke:'#68727e','stroke-width':'1.05',...attrs});group.appendChild(p);return p;}
function base(root,view='front'){
 const g=svg('g',{class:`g7-anatomy-base g7-${view}-base`});root.appendChild(g);
 // head + neck: independent volumes create the mannequin-like anatomy silhouette in the board.
 g.appendChild(svg('ellipse',{cx:'120',cy:'29',rx:'14.5',ry:'19.5',fill:'url(#g7skin2)',stroke:'#76808b','stroke-width':'1'}));
 skinPart(g,'M108 44 C111 50 111 56 107 62 L133 62 C129 56 129 50 132 44 C126 48 114 48 108 44 Z');
 // broad chest / narrow waist.
 skinPart(g,'M106 58 C91 60 79 62 66 69 C54 76 48 88 48 103 C48 124 58 139 67 151 C72 164 75 187 78 209 L96 219 C105 213 111 209 120 209 C129 209 135 213 144 219 L162 209 C165 187 168 164 173 151 C182 139 192 124 192 103 C192 88 186 76 174 69 C161 62 149 60 134 58 C130 66 126 70 120 70 C114 70 110 66 106 58 Z');
 // powerful arms taper into forearms/hands.
 skinPart(g,'M66 70 C53 72 43 83 39 99 C34 120 34 142 39 164 L43 190 40 226 C39 242 46 252 53 247 C59 243 58 232 58 220 L61 188 65 164 72 129 77 100 C77 86 73 77 66 70 Z');
 skinPart(g,'M174 70 C187 72 197 83 201 99 C206 120 206 142 201 164 L197 190 200 226 C201 242 194 252 187 247 C181 243 182 232 182 220 L179 188 175 164 168 129 163 100 C163 86 167 77 174 70 Z');
 // pelvis and thick legs.
 skinPart(g,'M78 205 C84 215 93 221 103 224 L120 219 137 224 C147 221 156 215 162 205 L164 236 C161 248 156 258 154 270 L159 306 155 349 151 377 137 377 132 343 124 300 120 270 116 300 108 343 103 377 89 377 85 349 81 306 86 270 C84 258 79 248 76 236 Z');
 // subtle head structure and torso centerline.
 line(g,'M112 25 C115 22 125 22 128 25 M113 34 C117 37 123 37 127 34',.24,.62,'#b5bdc6');
 line(g,'M120 70 L120 206',.18,.62,'#cbd1d8');
 line(g,'M83 79 C95 72 107 72 118 79 M122 79 C133 72 145 72 157 79',.16,.7,'#d4d9df');
 return g;
}
function front(root,focus){base(root,'front');const g=svg('g',{class:'g7-muscles g7-front'});root.appendChild(g);
 // deltoids and chest are intentionally oversized to match the binding board physique.
 muscle(g,'M65 72 C53 77 49 88 51 101 C56 106 65 105 75 94 L82 78 C77 73 71 71 65 72 Z','shoulder','front');
 muscle(g,'M175 72 C187 77 191 88 189 101 C184 106 175 105 165 94 L158 78 C163 73 169 71 175 72 Z','shoulder','front');
 muscle(g,'M79 78 C91 68 106 68 118 78 L117 108 C106 114 91 113 78 102 C74 93 75 84 79 78 Z','chest','front');
 muscle(g,'M161 78 C149 68 134 68 122 78 L123 108 C134 114 149 113 162 102 C166 93 165 84 161 78 Z','chest','front');
 // upper arms and forearms.
 muscle(g,'M57 104 C48 116 47 139 53 160 C58 165 65 163 69 155 L72 116 C69 107 64 103 57 104 Z','biceps','front');
 muscle(g,'M183 104 C192 116 193 139 187 160 C182 165 175 163 171 155 L168 116 C171 107 176 103 183 104 Z','biceps','front');
 muscle(g,'M49 166 C44 183 44 205 47 225 C51 230 56 228 58 220 L61 181 60 164 Z','forearm','front',false);
 muscle(g,'M191 166 C196 183 196 205 193 225 C189 230 184 228 182 220 L179 181 180 164 Z','forearm','front',false);
 // serratus/oblique frame and 8-pack.
 muscle(g,'M79 108 C91 111 99 119 102 134 L99 190 82 180 75 145 Z','oblique','front');
 muscle(g,'M161 108 C149 111 141 119 138 134 L141 190 158 180 165 145 Z','oblique','front');
 muscle(g,'M103 112 C108 109 114 109 118 113 L117 139 C112 142 107 141 103 138 Z M102 144 C107 141 113 141 117 144 L116 168 C111 171 106 170 102 167 Z M102 173 C107 170 112 170 116 173 L115 198 C110 201 106 200 102 197 Z','abs','front');
 muscle(g,'M137 112 C132 109 126 109 122 113 L123 139 C128 142 133 141 137 138 Z M138 144 C133 141 127 141 123 144 L124 168 C129 171 134 170 138 167 Z M138 173 C133 170 128 170 124 173 L125 198 C130 201 134 200 138 197 Z','abs','front');
 // massive quads/adductors and calves.
 muscle(g,'M84 222 C92 214 103 214 113 223 L109 286 C101 292 91 289 86 279 L78 242 Z','quad','front');
 muscle(g,'M156 222 C148 214 137 214 127 223 L131 286 C139 292 149 289 154 279 L162 242 Z','quad','front');
 muscle(g,'M112 226 C117 222 120 224 120 238 L116 285 108 276 Z','quad','front',false);muscle(g,'M128 226 C123 222 120 224 120 238 L124 285 132 276 Z','quad','front',false);
 muscle(g,'M87 292 C96 286 105 291 109 304 L103 354 C99 364 91 363 87 351 L82 318 Z','calf','front');
 muscle(g,'M153 292 C144 286 135 291 131 304 L137 354 C141 364 149 363 153 351 L158 318 Z','calf','front');
 // fiber direction follows actual muscle orientation, not decorative random lines.
 line(g,'M82 82 C91 92 103 98 114 101 M82 89 C93 101 104 106 114 106 M158 82 C149 92 137 98 126 101 M158 89 C147 101 136 106 126 106',.42,.78);
 line(g,'M60 111 C57 126 57 142 60 155 M180 111 C183 126 183 142 180 155',.38,.72);
 line(g,'M85 119 L96 178 M155 119 L144 178 M108 116 L108 194 M132 116 L132 194',.3,.68);
 line(g,'M88 230 L101 278 M99 224 L108 280 M152 230 L139 278 M141 224 L132 280',.4,.76);
 if(focus==='upper')g.querySelectorAll('[data-muscle="quad"],[data-muscle="calf"]').forEach(n=>n.setAttribute('opacity','.12'));
}
function back(root,focus){base(root,'back');const g=svg('g',{class:'g7-muscles g7-back'});root.appendChild(g);
 muscle(g,'M101 62 C108 57 114 57 120 64 C126 57 132 57 139 62 L132 105 120 116 108 105 Z','trap','back');
 muscle(g,'M66 73 C55 77 50 88 52 101 C59 106 69 103 78 91 L81 79 C76 74 71 72 66 73 Z','shoulder','back');muscle(g,'M174 73 C185 77 190 88 188 101 C181 106 171 103 162 91 L159 79 C164 74 169 72 174 73 Z','shoulder','back');
 muscle(g,'M80 96 C91 91 103 99 111 116 L106 183 C97 193 85 187 77 174 L72 126 Z','lat','back');muscle(g,'M160 96 C149 91 137 99 129 116 L134 183 C143 193 155 187 163 174 L168 126 Z','lat','back');
 muscle(g,'M109 108 C114 105 118 108 120 116 L117 196 C112 199 108 194 106 183 Z','back','back');muscle(g,'M131 108 C126 105 122 108 120 116 L123 196 C128 199 132 194 134 183 Z','back','back');
 muscle(g,'M57 103 C49 117 49 141 55 160 C60 165 67 162 70 154 L72 116 C68 107 63 103 57 103 Z','triceps','back');muscle(g,'M183 103 C191 117 191 141 185 160 C180 165 173 162 170 154 L168 116 C172 107 177 103 183 103 Z','triceps','back');
 muscle(g,'M83 205 C94 195 108 198 119 213 L115 245 C104 253 90 251 79 239 L75 222 Z','glute','back');muscle(g,'M157 205 C146 195 132 198 121 213 L125 245 C136 253 150 251 161 239 L165 222 Z','glute','back');
 muscle(g,'M84 250 C95 244 107 250 112 265 L108 309 C99 315 90 310 85 299 L78 270 Z','hamstring','back');muscle(g,'M156 250 C145 244 133 250 128 265 L132 309 C141 315 150 310 155 299 L162 270 Z','hamstring','back');
 muscle(g,'M87 310 C98 304 106 310 109 324 L102 360 C97 367 90 363 87 352 L82 330 Z','calf','back');muscle(g,'M153 310 C142 304 134 310 131 324 L138 360 C143 367 150 363 153 352 L158 330 Z','calf','back');
 line(g,'M108 68 L117 108 M132 68 L123 108 M84 104 L104 174 M156 104 L136 174',.42,.78);line(g,'M87 214 L110 239 M153 214 L130 239 M89 258 L104 302 M151 258 L136 302',.36,.75);
 if(focus==='upper')g.querySelectorAll('[data-muscle="glute"],[data-muscle="hamstring"],[data-muscle="calf"]').forEach(n=>n.setAttribute('opacity','.12'));
}
function sideView(root){base(root,'side');const g=svg('g',{class:'g7-muscles g7-side'});root.appendChild(g);muscle(g,'M105 70 C123 65 145 75 151 91 L142 116 C128 122 111 116 99 102 Z','chest','side');muscle(g,'M151 75 C163 80 169 94 164 108 L150 105 143 89 Z','shoulder','side');muscle(g,'M106 113 C121 112 135 123 139 143 L135 195 C125 202 113 195 106 181 L100 144 Z','oblique','side');muscle(g,'M103 217 C122 210 139 220 144 239 L136 294 C124 299 112 291 106 279 L98 244 Z','quad','side');line(g,'M109 81 L143 101 M111 127 L130 184 M109 228 L133 280',.4,.76);}
function relay(root,name){const escName=window.CSS?.escape?CSS.escape(name):String(name).replace(/[^a-zA-Z0-9_-]/g,'');const canonical=[...document.querySelectorAll(`[data-muscle="${escName}"],[data-muscle-id="${escName}"]`)].find(n=>!root.contains(n));if(canonical&&typeof canonical.click==='function')canonical.click();window.dispatchEvent(new CustomEvent('garang:body-muscle-selected',{detail:{muscle:name,source:'anatomy-exact-v2'}}));}
function create(side='front',gender='male',focus='full'){const root=svg('svg',{viewBox:'0 0 240 390',class:`g7-anatomy g7-anatomy-${side} g7-anatomy-${gender}`,'data-garang-anatomy-model':'exact-v2','data-side':side,role:'img','aria-label':side==='back'?'후면 근육 모델':side==='side'?'측면 근육 모델':'전면 근육 모델'});defs(root);if(side==='back')back(root,focus);else if(side==='side')sideView(root);else front(root,focus);root.addEventListener('click',e=>{const p=e.target.closest?.('[data-muscle]');if(p)relay(root,p.dataset.muscle);});root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-muscle]')){e.preventDefault();relay(root,e.target.dataset.muscle);}});return root;}
window.GarangAnatomyExactV2=Object.freeze({version:'2.1.0',create});
})();