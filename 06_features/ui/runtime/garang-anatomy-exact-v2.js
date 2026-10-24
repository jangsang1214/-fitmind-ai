/* GARANG Anatomy Exact v2.2 — original interactive vector anatomy. No board-image runtime use. */
(()=>{
'use strict';
if(window.GarangAnatomyExactV2)return;
const NS='http://www.w3.org/2000/svg';
const svg=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const MUSCLE_LABELS={chest:'가슴',shoulder:'어깨',biceps:'이두',triceps:'삼두',forearm:'전완',abs:'복근',oblique:'복사근',serratus:'전거근',quad:'대퇴사두',adductor:'내전근',hamstring:'햄스트링',calf:'종아리',trap:'승모',lat:'광배',back:'등',glute:'둔근'};
function defs(root){const d=svg('defs');
 const skin=svg('linearGradient',{id:'g7skin',x1:'0',y1:'0',x2:'1',y2:'1'});skin.append(svg('stop',{offset:'0%','stop-color':'#88919c'}),svg('stop',{offset:'18%','stop-color':'#4f5863'}),svg('stop',{offset:'46%','stop-color':'#252c34'}),svg('stop',{offset:'76%','stop-color':'#12171d'}),svg('stop',{offset:'100%','stop-color':'#07090c'}));
 const skin2=svg('linearGradient',{id:'g7skin2',x1:'0',y1:'0',x2:'1',y2:'0'});skin2.append(svg('stop',{offset:'0%','stop-color':'#151a20'}),svg('stop',{offset:'42%','stop-color':'#68727e'}),svg('stop',{offset:'62%','stop-color':'#343b44'}),svg('stop',{offset:'100%','stop-color':'#0c1015'}));
 const muscle=svg('linearGradient',{id:'g7muscle',x1:'0',y1:'0',x2:'1',y2:'1'});muscle.append(svg('stop',{offset:'0%','stop-color':'#ffc0a7'}),svg('stop',{offset:'16%','stop-color':'#ef7c63'}),svg('stop',{offset:'40%','stop-color':'#c8473d'}),svg('stop',{offset:'68%','stop-color':'#84252a'}),svg('stop',{offset:'100%','stop-color':'#2b0a10'}));
 const muscleDark=svg('linearGradient',{id:'g7muscleDark',x1:'0',y1:'0',x2:'1',y2:'1'});muscleDark.append(svg('stop',{offset:'0%','stop-color':'#da6d5c'}),svg('stop',{offset:'44%','stop-color':'#8e2d2d'}),svg('stop',{offset:'100%','stop-color':'#2b0d14'}));
 const depth=svg('filter',{id:'g7depth',x:'-35%',y:'-35%',width:'170%',height:'170%'});depth.append(svg('feDropShadow',{dx:'0',dy:'2.2','stdDeviation':'1.8','flood-color':'#000','flood-opacity':'.82'}));
 const soft=svg('filter',{id:'g7soft',x:'-30%',y:'-30%',width:'160%',height:'160%'});soft.append(svg('feGaussianBlur',{stdDeviation:'1.6'}));
 d.append(skin,skin2,muscle,muscleDark,depth,soft);root.appendChild(d);
}
function muscle(group,d,name,side='both',hot=true,extra={}){const p=svg('path',{d,fill:hot?'url(#g7muscle)':'url(#g7muscleDark)',stroke:hot?'#f2a38d':'#743736','stroke-width':'1','stroke-linejoin':'round','vector-effect':'non-scaling-stroke','data-muscle':name,'data-side':side,role:'button',tabindex:'0','aria-label':MUSCLE_LABELS[name]||name,filter:'url(#g7depth)',...extra});group.appendChild(p);return p;}
function line(group,d,opacity=.34,width=.65,color='#ffd2c2'){group.appendChild(svg('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','vector-effect':'non-scaling-stroke',opacity}));}
function skinPart(group,d,attrs={}){const p=svg('path',{d,fill:'url(#g7skin)',stroke:'#727c87','stroke-width':'1','vector-effect':'non-scaling-stroke',...attrs});group.appendChild(p);return p;}
function base(root,view='front'){const g=svg('g',{class:`g7-anatomy-base g7-${view}-base`});root.appendChild(g);
 g.appendChild(svg('ellipse',{cx:'120',cy:'27',rx:'15.5',ry:'20.5',fill:'url(#g7skin2)',stroke:'#78838e','stroke-width':'1'}));skinPart(g,'M106 44 C111 48 112 54 108 62 L132 62 C128 54 129 48 134 44 C126 49 114 49 106 44 Z');
 skinPart(g,'M105 58 C88 59 72 63 58 72 C47 80 43 91 44 104 C46 123 56 138 67 151 C71 166 75 187 77 207 C87 215 96 220 105 222 L120 217 135 222 C144 220 153 215 163 207 C165 187 169 166 173 151 C184 138 194 123 196 104 C197 91 193 80 182 72 C168 63 152 59 135 58 C131 66 127 70 120 70 C113 70 109 66 105 58 Z');
 skinPart(g,'M59 72 C47 75 37 87 33 103 C29 124 30 146 36 167 L41 190 37 226 C36 241 43 252 51 249 C58 246 58 234 58 221 L62 188 67 161 75 126 80 99 C80 85 72 75 59 72 Z');skinPart(g,'M181 72 C193 75 203 87 207 103 C211 124 210 146 204 167 L199 190 203 226 C204 241 197 252 189 249 C182 246 182 234 182 221 L178 188 173 161 165 126 160 99 C160 85 168 75 181 72 Z');
 skinPart(g,'M77 202 C84 214 94 221 105 225 L120 220 135 225 C146 221 156 214 163 202 L166 236 C163 248 158 258 155 270 L160 306 156 349 152 378 137 378 132 344 124 301 120 270 116 301 108 344 103 378 88 378 84 349 80 306 85 270 C82 258 77 248 74 236 Z');
 line(g,'M112 21 C117 17 123 17 128 21 M110 28 C114 30 126 30 130 28 M113 36 C117 39 123 39 127 36',.26,.6,'#d0d6dc');line(g,'M120 70 L120 211',.17,.55,'#d3d9df');line(g,'M78 79 C91 70 107 69 118 78 M122 78 C133 69 149 70 162 79',.18,.6,'#eef1f4');return g;}
function front(root,focus){base(root,'front');const g=svg('g',{class:'g7-muscles g7-front'});root.appendChild(g);
 // three-dimensional deltoid caps.
 muscle(g,'M59 70 C47 77 43 89 47 103 C53 110 64 108 75 97 L83 79 C77 71 68 68 59 70 Z','shoulder','front');muscle(g,'M181 70 C193 77 197 89 193 103 C187 110 176 108 165 97 L157 79 C163 71 172 68 181 70 Z','shoulder','front');
 line(g,'M53 84 C61 78 70 77 78 82 M187 84 C179 78 170 77 162 82',.42,.75);
 // clavicular + sternal pectoral volumes, split like real pec heads.
 muscle(g,'M78 77 C90 67 105 66 118 77 L117 92 C104 96 91 94 80 87 Z','chest','front');muscle(g,'M162 77 C150 67 135 66 122 77 L123 92 C136 96 149 94 160 87 Z','chest','front');
 muscle(g,'M79 91 C92 88 105 91 117 96 L116 111 C104 117 90 114 78 104 C75 99 76 95 79 91 Z','chest','front');muscle(g,'M161 91 C148 88 135 91 123 96 L124 111 C136 117 150 114 162 104 C165 99 164 95 161 91 Z','chest','front');
 line(g,'M84 80 C94 87 105 90 114 90 M82 96 C94 104 105 108 114 108 M156 80 C146 87 135 90 126 90 M158 96 C146 104 135 108 126 108',.48,.72);
 // arms.
 muscle(g,'M54 105 C45 119 45 142 51 162 C57 168 65 164 70 155 L73 118 C69 108 62 103 54 105 Z','biceps','front');muscle(g,'M186 105 C195 119 195 142 189 162 C183 168 175 164 170 155 L167 118 C171 108 178 103 186 105 Z','biceps','front');
 muscle(g,'M47 166 C41 183 42 207 45 228 C50 234 56 231 59 221 L62 183 60 162 Z','forearm','front',false);muscle(g,'M193 166 C199 183 198 207 195 228 C190 234 184 231 181 221 L178 183 180 162 Z','forearm','front',false);
 line(g,'M57 112 C53 127 54 145 59 158 M183 112 C187 127 186 145 181 158 M50 174 L55 218 M190 174 L185 218',.4,.68);
 // serratus fans bridge pecs to obliques.
 muscle(g,'M76 107 C83 108 90 113 95 120 L90 139 79 132 73 119 Z','serratus','front',false);muscle(g,'M164 107 C157 108 150 113 145 120 L150 139 161 132 167 119 Z','serratus','front',false);
 line(g,'M78 112 L91 123 M76 118 L89 130 M162 112 L149 123 M164 118 L151 130',.45,.62);
 // external obliques and 6-pack blocks.
 muscle(g,'M79 126 C90 123 98 132 101 146 L98 193 82 184 75 150 Z','oblique','front');muscle(g,'M161 126 C150 123 142 132 139 146 L142 193 158 184 165 150 Z','oblique','front');
 muscle(g,'M103 113 C108 109 114 110 118 114 L117 138 C112 143 107 142 103 138 Z M102 144 C107 141 113 141 117 145 L116 168 C111 172 106 171 102 167 Z M102 174 C107 171 112 171 116 174 L115 199 C110 203 106 202 102 198 Z','abs','front');muscle(g,'M137 113 C132 109 126 110 122 114 L123 138 C128 143 133 142 137 138 Z M138 144 C133 141 127 141 123 145 L124 168 C129 172 134 171 138 167 Z M138 174 C133 171 128 171 124 174 L125 199 C130 203 134 202 138 198 Z','abs','front');
 line(g,'M108 116 L108 135 M108 148 L108 165 M108 178 L108 195 M132 116 L132 135 M132 148 L132 165 M132 178 L132 195',.36,.6);
 // quads: rectus + vastus medialis/lateralis and adductor wedge.
 muscle(g,'M82 221 C92 212 104 214 113 224 L110 283 C103 293 92 290 86 279 L77 242 Z','quad','front');muscle(g,'M158 221 C148 212 136 214 127 224 L130 283 C137 293 148 290 154 279 L163 242 Z','quad','front');
 muscle(g,'M107 225 C114 219 119 223 119 238 L116 286 C109 289 104 282 103 272 Z','quad','front',false);muscle(g,'M133 225 C126 219 121 223 121 238 L124 286 C131 289 136 282 137 272 Z','quad','front',false);
 muscle(g,'M113 228 C118 225 120 228 120 240 L117 281 111 272 Z','adductor','front',false);muscle(g,'M127 228 C122 225 120 228 120 240 L123 281 129 272 Z','adductor','front',false);
 muscle(g,'M86 291 C96 285 105 290 109 304 L103 356 C99 366 91 365 86 352 L81 319 Z','calf','front');muscle(g,'M154 291 C144 285 135 290 131 304 L137 356 C141 366 149 365 154 352 L159 319 Z','calf','front');
 line(g,'M86 229 L99 280 M98 223 L107 280 M154 229 L141 280 M142 223 L133 280 M90 300 L98 350 M150 300 L142 350',.43,.72);
 if(focus==='upper')g.querySelectorAll('[data-muscle="quad"],[data-muscle="adductor"],[data-muscle="calf"]').forEach(n=>n.setAttribute('opacity','.1'));
}
function back(root,focus){base(root,'back');const g=svg('g',{class:'g7-muscles g7-back'});root.appendChild(g);
 muscle(g,'M98 61 C106 56 114 57 120 64 C126 57 134 56 142 61 L134 93 120 113 106 93 Z','trap','back');line(g,'M104 66 L117 101 M136 66 L123 101',.45,.72);
 muscle(g,'M61 71 C49 77 45 90 49 103 C56 110 67 106 78 94 L82 79 C76 71 69 68 61 71 Z','shoulder','back');muscle(g,'M179 71 C191 77 195 90 191 103 C184 110 173 106 162 94 L158 79 C164 71 171 68 179 71 Z','shoulder','back');
 // wide lats and rhomboid/erector columns.
 muscle(g,'M79 95 C91 89 103 96 112 113 L106 184 C97 196 84 189 75 174 L70 127 Z','lat','back');muscle(g,'M161 95 C149 89 137 96 128 113 L134 184 C143 196 156 189 165 174 L170 127 Z','lat','back');
 muscle(g,'M106 104 C112 101 118 107 120 116 L117 195 C112 201 107 195 104 181 Z','back','back');muscle(g,'M134 104 C128 101 122 107 120 116 L123 195 C128 201 133 195 136 181 Z','back','back');
 line(g,'M84 104 L104 175 M156 104 L136 175 M111 112 L113 190 M129 112 L127 190',.45,.72);
 muscle(g,'M54 103 C45 118 46 143 52 162 C58 168 66 164 70 154 L73 117 C68 107 62 102 54 103 Z','triceps','back');muscle(g,'M186 103 C195 118 194 143 188 162 C182 168 174 164 170 154 L167 117 C172 107 178 102 186 103 Z','triceps','back');
 muscle(g,'M81 204 C93 194 108 197 119 212 L115 246 C104 255 89 252 78 240 L74 221 Z','glute','back');muscle(g,'M159 204 C147 194 132 197 121 212 L125 246 C136 255 151 252 162 240 L166 221 Z','glute','back');line(g,'M86 213 C96 221 106 229 113 239 M154 213 C144 221 134 229 127 239',.4,.72);
 muscle(g,'M83 250 C95 243 107 249 113 265 L108 310 C99 316 89 311 84 299 L77 270 Z','hamstring','back');muscle(g,'M157 250 C145 243 133 249 127 265 L132 310 C141 316 151 311 156 299 L163 270 Z','hamstring','back');
 muscle(g,'M86 310 C98 303 106 310 109 324 L102 361 C97 369 89 364 86 352 L81 330 Z','calf','back');muscle(g,'M154 310 C142 303 134 310 131 324 L138 361 C143 369 151 364 154 352 L159 330 Z','calf','back');line(g,'M88 258 L103 302 M152 258 L137 302 M90 318 L99 355 M150 318 L141 355',.38,.7);
 if(focus==='upper')g.querySelectorAll('[data-muscle="glute"],[data-muscle="hamstring"],[data-muscle="calf"]').forEach(n=>n.setAttribute('opacity','.1'));
}
function sideView(root){base(root,'side');const g=svg('g',{class:'g7-muscles g7-side'});root.appendChild(g);muscle(g,'M102 69 C123 63 146 75 153 92 L143 118 C128 124 109 117 97 101 Z','chest','side');muscle(g,'M153 75 C166 80 171 95 165 110 L150 106 142 88 Z','shoulder','side');muscle(g,'M106 112 C123 110 137 123 141 143 L136 196 C126 204 113 196 105 181 L99 144 Z','oblique','side');muscle(g,'M101 217 C122 209 140 219 146 240 L137 295 C124 301 111 292 105 279 L97 244 Z','quad','side');muscle(g,'M103 251 C111 248 117 254 120 267 L116 309 C109 313 103 307 100 296 Z','hamstring','side',false);line(g,'M108 80 L145 102 M111 126 L132 185 M108 228 L134 280',.42,.72);}
function relay(root,name){const escName=window.CSS?.escape?CSS.escape(name):String(name).replace(/[^a-zA-Z0-9_-]/g,'');const canonical=[...document.querySelectorAll(`[data-muscle="${escName}"],[data-muscle-id="${escName}"]`)].find(n=>!root.contains(n));if(canonical&&typeof canonical.click==='function')canonical.click();window.dispatchEvent(new CustomEvent('garang:body-muscle-selected',{detail:{muscle:name,source:'anatomy-exact-v2'}}));}
function create(side='front',gender='male',focus='full'){const root=svg('svg',{viewBox:'0 0 240 390',class:`g7-anatomy g7-anatomy-${side} g7-anatomy-${gender}`,'data-garang-anatomy-model':'exact-v2','data-side':side,role:'img','aria-label':side==='back'?'후면 근육 모델':side==='side'?'측면 근육 모델':'전면 근육 모델'});defs(root);if(side==='back')back(root,focus);else if(side==='side')sideView(root);else front(root,focus);root.addEventListener('click',e=>{const p=e.target.closest?.('[data-muscle]');if(p)relay(root,p.dataset.muscle);});root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-muscle]')){e.preventDefault();relay(root,e.target.dataset.muscle);}});return root;}
window.GarangAnatomyExactV2=Object.freeze({version:'2.2.0',create});
})();