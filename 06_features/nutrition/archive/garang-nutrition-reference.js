/* Nutrition -> approved Progress/Nutrition reference composition */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  function route(page){const proxy=document.querySelector('#bottomNav button');if(!proxy)return;const old=proxy.dataset.page;proxy.dataset.page=page;proxy.click();proxy.dataset.page=old;}
  function currentState(){
    try{
      const c=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||(!k.startsWith('garang_user_')&&!k.startsWith('garang_demo_state')))continue;const v=JSON.parse(localStorage.getItem(k)||'null');if(v?.meta||v?.profile)c.push(v);}
      c.sort((a,b)=>String(b?.meta?.updatedAt||'').localeCompare(String(a?.meta?.updatedAt||'')));return c[0]||null;
    }catch{return null;}
  }
  function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function weeklyNutrition(){
    const meals=Array.isArray(currentState()?.meals)?currentState().meals:[];
    const days=[];const now=new Date();now.setHours(0,0,0,0);
    for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const key=dateKey(d);const rows=meals.filter(x=>x.date===key);days.push({date:key,kcal:rows.reduce((s,x)=>s+Number(x.kcal||0),0),protein:rows.reduce((s,x)=>s+Number(x.protein||0),0),day:['S','M','T','W','T','F','S'][d.getDay()]});}
    return {days,avgKcal:Math.round(days.reduce((s,x)=>s+x.kcal,0)/7),avgProtein:Math.round(days.reduce((s,x)=>s+x.protein,0)/7)};
  }

  function enhance(){
    const hero=main.querySelector('.nutrition-visual-hero');
    if(!hero||main.querySelector('.gx-nutrition-tabs'))return;
    main.dataset.gxNutritionEntry='closed';
    const target=main.querySelector('.protein-target');
    const pct=Number(target?.textContent.match(/(\d+)%/)?.[1]||0);
    const status=pct>=80?'On track':pct>=50?'Building':'Needs attention';
    hero.style.setProperty('--gx-nutrition-pct',Math.max(0,Math.min(100,pct)));
    hero.dataset.gxStatus=status;
    const kcal=main.querySelector('.nutrition-kcal');if(kcal)kcal.dataset.gxStatus=status;

    const tabs=document.createElement('div');tabs.className='gx-screen-tabs gx-nutrition-tabs';
    ['Nutrition','Performance','Insights'].forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(i===0)b.classList.add('active');b.onclick=()=>{if(i===1)route('progress');if(i===2)route('coach');};tabs.appendChild(b);});
    main.querySelector('.page-head')?.insertAdjacentElement('afterend',tabs);

    const meals=main.querySelector('.meal-visual-list');
    if(meals){
      const add=document.createElement('button');add.type='button';add.className='ghost gx-add-food';add.textContent='+  Add Food';
      add.onclick=()=>{const open=main.dataset.gxNutritionEntry!=='open';main.dataset.gxNutritionEntry=open?'open':'closed';add.textContent=open?'Close Entry':'+  Add Food';if(open)requestAnimationFrame(()=>main.querySelector('#pickMealScan')?.scrollIntoView({behavior:'smooth',block:'center'}));};
      meals.insertAdjacentElement('afterend',add);
      const w=weeklyNutrition();const max=Math.max(1,...w.days.map(x=>x.kcal));
      const section=document.createElement('section');section.className='gx-weekly-overview';
      section.innerHTML=`<span>WEEKLY OVERVIEW</span><div class="gx-weekly-metrics"><article><small>Avg. Intake</small><strong>${w.avgKcal.toLocaleString()}<em> kcal</em></strong></article><article><small>Protein Avg.</small><strong>${w.avgProtein}<em> g</em></strong></article></div><div class="gx-weekly-bars">${w.days.map(x=>`<i><b style="height:${Math.max(8,Math.round(x.kcal/max*100))}%"></b><small>${x.day}</small></i>`).join('')}</div>`;
      add.insertAdjacentElement('afterend',section);
    }
  }

  let queued=false;const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});});
  obs.observe(main,{childList:true,subtree:true});enhance();
})();
