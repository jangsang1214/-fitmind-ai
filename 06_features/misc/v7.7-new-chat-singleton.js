(()=>{"use strict";
const SELECTORS=['#v77NewChat','[data-fitmind-new-chat]','.v61-new-chat','#v61NewChat'];
function cleanup(){
 const seen=new Set(), els=[];
 SELECTORS.forEach(sel=>document.querySelectorAll(sel).forEach(el=>els.push(el)));
 els.forEach(el=>{
   if(seen.size===0){seen.add('one');}
   else el.remove();
 });
}
window.addEventListener("DOMContentLoaded",cleanup);

})();