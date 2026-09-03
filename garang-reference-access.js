/* Access bridges for controls hidden by the approved visual hierarchy. */
(() => {
  'use strict';
  document.addEventListener('click',(e)=>{
    const score=e.target.closest('.visual-today-hero .score-orb');
    if(score){
      const edit=document.querySelector('[data-action="open-checkin"]');
      if(edit){e.preventDefault();edit.click();}
    }
  },true);
})();
