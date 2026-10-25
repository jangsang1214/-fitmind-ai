/* GARANG Anatomy Exact v2.3 — integrated interactive muscle body. No board-image runtime use. */
(()=>{
'use strict';
if(window.GarangAnatomyExactV2?.version==='2.3.0')return;
const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
const LABEL={chest:'가슴',shoulder:'어깨',biceps:'이두',triceps:'삼두',forearm:'전완',abs:'복근',oblique:'복사근',serratus:'전거근',quad:'대퇴사두',adductor:'내전근',hamstring:'햄스트링',calf:'종아리',trap:'승모',lat:'광배',back:'등',glute:'둔근'};
function defs(root){
 const d=el('defs');
 const base=el('linearGradient',{id:'g23base',x1:'0',y1:'0',x2:'1',y2:'1'});base.append(el('stop',{offset:'0%','stop-color':'#b36a5f'}),el('stop',{offset:'34%','stop-color':'#8e5149'}),el('stop',{offset:'72%','stop-color':'#6f3c38'}),el('stop',{offset:'100%','stop-color':'#4a2928'}));
 const muscle=el('linearGradient',{id:'g23muscle',x1:'0',y1:'0',x2:'1',y2:'1'});muscle.append(el('stop',{offset:'0%','stop-color':'#d58a78'}),el('stop',{offset:'30%','stop-color':'#b85f54'}),el('stop',{offset:'70%','stop-color':'#8b403d'}),el('stop',{offset:'100%','stop-color':'#642f31'}));
 const light=el('linearGradient',{id:'g23light',x1:'0',y1:'0',x2:'1',y2:'1'});light.append(el('stop',{offset:'0%','stop-color':'#e2a18d'}),el('stop',{offset:'42%','stop-color':'#c56f60'}),el('stop',{offset:'100%','stop-color':'#7d3a39'}));
 const deep=el('linearGradient',{id:'g23deep',x1:'0',y1:'0',x2:'1',y2:'1'});deep.append(el('stop',{offset:'0%','stop-color':'#a8524a'}),el('stop',{offset:'55%','stop-color':'#7a3938'}),el('stop',{offset:'100%','stop-color':'#51282c'}));
 const sheen=el('linearGradient',{id:'g23sheen',x1:'0',y1:'0',x2:'0',y2:'1'});sheen.append(el('stop',{offset:'0%','stop-color':'#f7d7c7','stop-opacity':'.28'}),el('stop',{offset:'45%','stop-color':'#fff','stop-opacity':'.04'}),el('stop',{offset:'100%','stop-color':'#2b1518','stop-opacity':'.18'}));
 const depth=el('filter',{id:'g23depth',x:'-25%',y:'-25%',width:'150%',height:'150%'});depth.append(el('feDropShadow',{dx:'0',dy:'1.2','stdDeviation':'1.15','flood-color':'#32171a','flood-opacity':'.28'}));
 d.append(base,muscle,light,deep,sheen,depth);root.appendChild(d);
}
function basePath(group,d,extra={}){const p=el('path',{d,fill:'url(#g23base)',stroke:'#613735','stroke-width':'.55','stroke-linejoin':'round','vector-effect':'non-scaling-stroke',...extra});group.appendChild(p);return p;}
function muscle(group,d,name,side='both',tone='muscle',extra={}){const fill=tone==='light'?'url(#g23light)':tone==='deep'?'url(#g23deep)':'url(#g23muscle)';const p=el('path',{d,fill,stroke:'#7b3c39','stroke-width':'.34','stroke-opacity':'.35','stroke-linejoin':'round','vector-effect':'non-scaling-stroke','data-muscle':name,'data-side':side,role:'button',tabindex:'0','aria-label':LABEL[name]||name,filter:'url(#g23depth)',...extra});group.appendChild(p);return p;}
function fiber(group,d,opacity=.48,width=.58){group.appendChild(el('path',{d,fill:'none',stroke:'#f3c2af','stroke-width':width,'stroke-linecap':'round','vector-effect':'non-scaling-stroke',opacity,'pointer-events':'none'}));}
function seam(group,d,opacity=.34,width=.42){group.appendChild(el('path',{d,fill:'none',stroke:'#542b2d','stroke-width':width,'stroke-linecap':'round','vector-effect':'non-scaling-stroke',opacity,'pointer-events':'none'}));}
function bodyBase(root,view='front'){
 const g=el('g',{class:`g7-anatomy-base g7-${view}-base`});root.appendChild(g);
 g.appendChild(el('ellipse',{cx:'120',cy:'26',rx:'15.5',ry:'20.5',fill:'#8a6960',stroke:'#684944','stroke-width':'.55'}));
 basePath(g,'M106 43 C111 49 111 54 108 61 L95 64 C84 65 72 68 61 75 C51 82 46 91 46 103 C46 119 54 135 66 149 C70 164 74 183 76 204 C84 212 94 218 105 222 L120 217 L135 222 C146 218 156 212 164 204 C166 183 170 164 174 149 C186 135 194 119 194 103 C194 91 189 82 179 75 C168 68 156 65 145 64 L132 61 C129 54 129 49 134 43 C126 48 114 48 106 43 Z');
 basePath(g,'M61 75 C49 77 39 88 35 103 C30 123 31 145 37 166 L42 188 38 224 C37 239 43 250 51 249 C58 247 59 235 59 222 L62 190 67 162 74 129 80 102 C82 88 74 78 61 75 Z');
 basePath(g,'M179 75 C191 77 201 88 205 103 C210 123 209 145 203 166 L198 188 202 224 C203 239 197 250 189 249 C182 247 181 235 181 222 L178 190 173 162 166 129 160 102 C158 88 166 78 179 75 Z');
 basePath(g,'M77 202 C85 214 95 221 106 225 L120 220 134 225 C145 221 155 214 163 202 L166 235 C163 248 158 260 155 272 L160 307 156 349 152 378 137 378 132 344 124 302 120 270 116 302 108 344 103 378 88 378 84 349 80 307 85 272 C82 260 77 248 74 235 Z');
 fiber(g,'M112 19 C117 17 123 17 128 19 M111 28 C115 30 125 30 129 28 M114 36 C118 38 122 38 126 36',.24,.48);
 return g;
}
function front(root,focus){
 bodyBase(root,'front');const g=el('g',{class:'g7-muscles g7-front'});root.appendChild(g);
 muscle(g,'M60 72 C49 76 44 87 47 100 C50 108 58 112 67 108 C73 104 78 97 82 88 L82 80 C76 73 68 70 60 72 Z','shoulder','front','light');
 muscle(g,'M180 72 C191 76 196 87 193 100 C190 108 182 112 173 108 C167 104 162 97 158 88 L158 80 C164 73 172 70 180 72 Z','shoulder','front','light');
 muscle(g,'M79 78 C90 68 105 66 118 75 L118 94 C107 99 93 99 80 91 C76 87 76 82 79 78 Z','chest','front','light');
 muscle(g,'M161 78 C150 68 135 66 122 75 L122 94 C133 99 147 99 160 91 C164 87 164 82 161 78 Z','chest','front','light');
 muscle(g,'M80 92 C91 94 104 98 117 100 L116 116 C103 120 91 116 79 106 C76 101 76 96 80 92 Z','chest','front');
 muscle(g,'M160 92 C149 94 136 98 123 100 L124 116 C137 120 149 116 161 106 C164 101 164 96 160 92 Z','chest','front');
 muscle(g,'M54 104 C46 118 46 140 51 159 C56 166 64 164 69 156 L72 119 C69 109 62 103 54 104 Z','biceps','front');
 muscle(g,'M186 104 C194 118 194 140 189 159 C184 166 176 164 171 156 L168 119 C171 109 178 103 186 104 Z','biceps','front');
 muscle(g,'M47 160 C41 179 42 204 45 226 C49 234 56 231 59 221 L62 184 60 159 Z','forearm','front','deep');
 muscle(g,'M193 160 C199 179 198 204 195 226 C191 234 184 231 181 221 L178 184 180 159 Z','forearm','front','deep');
 muscle(g,'M77 108 C84 108 91 113 96 121 L92 142 C85 139 78 133 74 124 Z','serratus','front','deep');
 muscle(g,'M163 108 C156 108 149 113 144 121 L148 142 C155 139 162 133 166 124 Z','serratus','front','deep');
 muscle(g,'M79 125 C89 123 98 132 101 146 L99 192 C92 190 84 185 78 177 L74 150 Z','oblique','front','deep');
 muscle(g,'M161 125 C151 123 142 132 139 146 L141 192 C148 190 156 185 162 177 L166 150 Z','oblique','front','deep');
 muscle(g,'M102 112 C108 109 114 110 118 114 L118 198 C113 203 107 203 102 198 C99 174 99 137 102 112 Z','abs','front');
 muscle(g,'M138 112 C132 109 126 110 122 114 L122 198 C127 203 133 203 138 198 C141 174 141 137 138 112 Z','abs','front');
 muscle(g,'M81 219 C91 212 102 214 111 224 C114 245 113 267 109 286 C103 294 94 291 87 282 C81 264 77 243 77 229 Z','quad','front','light');
 muscle(g,'M159 219 C149 212 138 214 129 224 C126 245 127 267 131 286 C137 294 146 291 153 282 C159 264 163 243 163 229 Z','quad','front','light');
 muscle(g,'M108 223 C114 218 119 224 119 240 L116 287 C110 290 104 282 103 270 Z','quad','front');
 muscle(g,'M132 223 C126 218 121 224 121 240 L124 287 C130 290 136 282 137 270 Z','quad','front');
 muscle(g,'M114 226 C118 224 120 229 120 240 L117 280 111 270 Z','adductor','front','deep');
 muscle(g,'M126 226 C122 224 120 229 120 240 L123 280 129 270 Z','adductor','front','deep');
 muscle(g,'M86 291 C95 285 104 291 108 304 L103 355 C99 366 91 365 86 352 L81 319 Z','calf','front');
 muscle(g,'M154 291 C145 285 136 291 132 304 L137 355 C141 366 149 365 154 352 L159 319 Z','calf','front');
 fiber(g,'M84 80 C94 86 105 90 115 90 M82 98 C94 104 105 108 114 108 M156 80 C146 86 135 90 125 90 M158 98 C146 104 135 108 126 108',.56,.62);
 fiber(g,'M53 113 C50 128 52 144 58 157 M187 113 C190 128 188 144 182 157 M49 171 L55 218 M191 171 L185 218',.48,.58);
 fiber(g,'M79 113 L92 124 M77 120 L90 132 M161 113 L148 124 M163 120 L150 132',.52,.54);
 fiber(g,'M108 116 L108 194 M132 116 L132 194',.42,.48);seam(g,'M120 111 L120 200',.55,.5);seam(g,'M101 142 L118 142 M101 170 L117 170 M139 142 L122 142 M139 170 L123 170',.38,.44);
 fiber(g,'M85 229 L99 279 M97 223 L107 282 M155 229 L141 279 M143 223 L133 282 M90 300 L98 350 M150 300 L142 350',.53,.6);
 if(focus==='upper')g.querySelectorAll('[data-muscle="quad"],[data-muscle="adductor"],[data-muscle="calf"]').forEach(n=>n.setAttribute('opacity','.14'));
}
function back(root,focus){
 bodyBase(root,'back');const g=el('g',{class:'g7-muscles g7-back'});root.appendChild(g);
 muscle(g,'M97 61 C106 56 114 57 120 64 C126 57 134 56 143 61 L136 88 120 109 104 88 Z','trap','back','light');
 muscle(g,'M61 72 C50 76 45 87 48 100 C52 108 60 111 69 106 C75 102 80 95 83 86 L81 79 C75 73 68 70 61 72 Z','shoulder','back','light');
 muscle(g,'M179 72 C190 76 195 87 192 100 C188 108 180 111 171 106 C165 102 160 95 157 86 L159 79 C165 73 172 70 179 72 Z','shoulder','back','light');
 muscle(g,'M78 94 C90 88 103 96 112 113 L108 180 C101 193 88 191 78 179 L70 129 Z','lat','back');
 muscle(g,'M162 94 C150 88 137 96 128 113 L132 180 C139 193 152 191 162 179 L170 129 Z','lat','back');
 muscle(g,'M107 102 C113 99 118 106 120 116 L117 196 C112 202 106 196 104 185 Z','back','back','deep');
 muscle(g,'M133 102 C127 99 122 106 120 116 L123 196 C128 202 134 196 136 185 Z','back','back','deep');
 muscle(g,'M55 104 C47 118 47 140 52 159 C57 165 65 163 70 154 L72 118 C68 108 62 103 55 104 Z','triceps','back');
 muscle(g,'M185 104 C193 118 193 140 188 159 C183 165 175 163 170 154 L168 118 C172 108 178 103 185 104 Z','triceps','back');
 muscle(g,'M47 160 C41 181 42 204 45 226 C50 233 56 230 59 220 L62 184 60 159 Z','forearm','back','deep');
 muscle(g,'M193 160 C199 181 198 204 195 226 C190 233 184 230 181 220 L178 184 180 159 Z','forearm','back','deep');
 muscle(g,'M80 194 C91 188 105 193 117 207 L116 233 C105 241 91 238 80 226 C75 216 75 204 80 194 Z','glute','back','light');
 muscle(g,'M160 194 C149 188 135 193 123 207 L124 233 C135 241 149 238 160 226 C165 216 165 204 160 194 Z','glute','back','light');
 muscle(g,'M83 232 C93 224 105 229 112 244 L108 299 C102 307 93 304 87 294 L79 256 Z','hamstring','back');
 muscle(g,'M157 232 C147 224 135 229 128 244 L132 299 C138 307 147 304 153 294 L161 256 Z','hamstring','back');
 muscle(g,'M86 296 C95 291 104 297 108 309 L103 356 C99 366 91 365 86 352 L82 320 Z','calf','back');
 muscle(g,'M154 296 C145 291 136 297 132 309 L137 356 C141 366 149 365 154 352 L158 320 Z','calf','back');
 fiber(g,'M103 66 L117 100 M137 66 L123 100',.55,.62);
 fiber(g,'M78 104 C88 118 97 136 103 172 M162 104 C152 118 143 136 137 172',.5,.6);seam(g,'M120 111 L120 197',.52,.48);
 fiber(g,'M53 112 C50 129 53 146 59 157 M187 112 C190 129 187 146 181 157',.47,.58);
 fiber(g,'M84 203 C94 211 104 217 114 220 M156 203 C146 211 136 217 126 220',.48,.58);
 fiber(g,'M85 241 L101 293 M155 241 L139 293 M90 306 L98 351 M150 306 L142 351',.52,.6);
 if(focus==='upper')g.querySelectorAll('[data-muscle="glute"],[data-muscle="hamstring"],[data-muscle="calf"]').forEach(n=>n.setAttribute('opacity','.14'));
}
function sideView(root){
 bodyBase(root,'side');const g=el('g',{class:'g7-muscles g7-side'});root.appendChild(g);
 muscle(g,'M103 70 C122 64 144 75 152 92 L143 116 C128 124 111 118 98 102 Z','chest','side','light');
 muscle(g,'M151 75 C165 80 171 94 166 108 C160 113 153 111 147 105 L141 88 Z','shoulder','side','light');
 muscle(g,'M105 111 C122 109 137 122 141 143 L136 196 C126 204 113 196 105 181 L99 144 Z','oblique','side');
 muscle(g,'M101 216 C121 209 139 219 146 240 L137 295 C124 301 111 292 105 279 L97 244 Z','quad','side','light');
 muscle(g,'M103 250 C112 246 120 254 122 267 L118 310 C110 314 103 307 100 296 Z','hamstring','side','deep');
 muscle(g,'M100 300 C109 295 117 302 120 315 L116 359 C109 366 102 361 99 350 Z','calf','side');
 fiber(g,'M109 81 L145 101 M111 127 L132 183 M108 227 L134 280 M105 258 L115 302 M105 309 L113 350',.5,.58);
}
function relay(root,name){
 const esc=window.CSS?.escape?CSS.escape(name):String(name).replace(/[^a-zA-Z0-9_-]/g,'');
 const canonical=[...document.querySelectorAll(`[data-muscle="${esc}"],[data-muscle-id="${esc}"]`)].find(node=>!root.contains(node));
 if(canonical&&typeof canonical.click==='function')canonical.click();
 window.dispatchEvent(new CustomEvent('garang:body-muscle-selected',{detail:{muscle:name,source:'anatomy-exact-v2'}}));
}
function create(side='front',gender='male',focus='full'){
 const root=el('svg',{viewBox:'0 0 240 390',class:`g7-anatomy g7-anatomy-${side} g7-anatomy-${gender}`,'data-garang-anatomy-model':'exact-v2','data-anatomy-version':'2.3.0','data-side':side,role:'img','aria-label':side==='back'?'후면 근육 모델':side==='side'?'측면 근육 모델':'전면 근육 모델'});
 defs(root);if(side==='back')back(root,focus);else if(side==='side')sideView(root);else front(root,focus);
 root.addEventListener('click',event=>{const target=event.target.closest?.('[data-muscle]');if(target)relay(root,target.dataset.muscle);});
 root.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('[data-muscle]')){event.preventDefault();relay(root,event.target.dataset.muscle);}});
 return root;
}
window.GarangAnatomyExactV2=Object.freeze({version:'2.3.0',create});
})();