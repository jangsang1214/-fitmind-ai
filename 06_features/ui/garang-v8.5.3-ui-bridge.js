
/* GARANG V8.5.3 — UI bridge */
(function(){
  function h(tag, attrs, html){
    const el=document.createElement(tag);
    Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,v));
    if(html!==undefined) el.innerHTML=html;
    return el;
  }

  function mountWorkoutPicker(root){
    if(!root || root.dataset.garang853Mounted) return;
    root.dataset.garang853Mounted="1";
    root.classList.add("garang-v853-panel");
    root.innerHTML = `
      <div>
        <h3>운동 추가</h3>
        <input class="garang-v853-search" placeholder="운동 검색 (예: 벤치)" aria-label="운동 검색">
        <div class="garang-v853-results"></div>
        <div class="garang-v853-selected"></div>
        <button class="garang-v853-cert-btn" type="button">운동 기록 인증하기</button>
        <div class="garang-v853-cert-preview"></div>
      </div>`;
    const search=root.querySelector(".garang-v853-search");
    const results=root.querySelector(".garang-v853-results");
    const selected=root.querySelector(".garang-v853-selected");
    const cert=root.querySelector(".garang-v853-cert-btn");
    const preview=root.querySelector(".garang-v853-cert-preview");

    function renderResults(){
      results.innerHTML="";
      GARANGSearchExercises(search.value).forEach(ex=>{
        const row=h("div",{class:"garang-v853-result"});
        row.innerHTML=`<span><b>${ex.name}</b><small> · ${ex.muscle} · ${ex.equipment}</small></span>`;
        const b=h("button",{type:"button"},"추가");
        b.onclick=()=>{GARANGAddExercise(ex);renderSelected();};
        row.appendChild(b); results.appendChild(row);
      });
    }
    function renderSelected(){
      selected.innerHTML="";
      GARANGWorkoutSession.exercises.forEach(ex=>{
        const card=h("div",{class:"garang-v853-exercise"});
        card.innerHTML=`<b>${ex.name}</b><div class="garang-v853-sets"></div>`;
        const sets=card.querySelector(".garang-v853-sets");
        ex.sets.forEach((s,i)=>{
          const r=h("div",{class:"garang-v853-set-row"});
          r.innerHTML=`<input value="${s.weight}" aria-label="세트 ${i+1} 중량"><input value="${s.reps}" aria-label="세트 ${i+1} 반복"><button type="button">삭제</button>`;
          r.querySelector("button").onclick=()=>{ex.sets.splice(i,1);localStorage.setItem("garangWorkoutSessionV853",JSON.stringify(GARANGWorkoutSession));renderSelected();};
          sets.appendChild(r);
        });
        const add=h("button",{type:"button"},"+ 세트");
        add.style.marginTop="8px";
        add.onclick=()=>{
          const w=prompt("중량(kg)을 입력하세요","0");
          const r=prompt("반복수를 입력하세요","0");
          if(w!==null && r!==null) GARANGAddSet(ex.id,w,r);
          renderSelected();
        };
        card.appendChild(add);
        selected.appendChild(card);
      });
    }
    search.addEventListener("input",renderResults);
    cert.onclick=()=>{
      const s=GARANGOpenWorkoutCertification();
      preview.innerHTML=`<div class="garang-v853-running-note">운동 기록 ${s.exercises.length}개 · ${s.totalSets}세트 · 총 볼륨 ${s.totalVolume.toLocaleString()} kg</div>`;
      window.dispatchEvent(new CustomEvent("garang-workout-cert-data",{detail:s}));
    };
    renderResults();renderSelected();
  }

  // Expose mount function for existing app to call.
  window.GARANGMountWorkoutPicker=mountWorkoutPicker;

  // If an obvious workout container exists, mount only when it is empty/marked.
  const auto=()=>document.querySelector('[data-garang-workout-picker], #workout-picker, .workout-picker');
  const obs=new MutationObserver(()=>{
    const root=auto();
    if(root && !root.dataset.garang853Mounted) mountWorkoutPicker(root);
  });
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>{const root=auto();if(root)mountWorkoutPicker(root);},300);
})();
