/* FitMind AI V5.6 — modern mobile UI enhancement, no legacy feature removal */
(function(){
  const $=s=>document.querySelector(s);
  function inject(){
    if($('#fitmindV56Style'))return;
    const st=document.createElement('style');st.id='fitmindV56Style';
    st.textContent=`
      .fm-topline{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}
      .fm-topline .eyebrow{font-size:12px;font-weight:900;color:#64748b;letter-spacing:.05em}
      .fm-status{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#eefcf4;color:#15803d;font-size:11px;font-weight:900}
      .fm-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12)}
      .fm-ai-card{background:linear-gradient(135deg,#111827,#292d4b);color:#fff;border-radius:24px;padding:20px;box-shadow:0 18px 42px rgba(15,23,42,.18);margin-bottom:12px}
      .fm-ai-card .label{font-size:11px;color:rgba(255,255,255,.6);font-weight:900}.fm-ai-card h3{margin:7px 0;font-size:20px}.fm-ai-card p{margin:0;color:rgba(255,255,255,.78);font-size:13px;line-height:1.55}
      .fm-quick{display:flex;gap:8px;overflow:auto;margin:10px 0 16px;padding:2px 0 5px}.fm-quick button{white-space:nowrap;background:#fff;color:#334155;border:1px solid #e7ebf2;padding:9px 12px;border-radius:999px;font-size:12px;box-shadow:none}
      .fm-chat-title{display:flex;justify-content:space-between;align-items:center;gap:10px}.fm-chat-title small{color:#64748b}.fm-memory-pill{font-size:11px;background:#f3f1ff;color:#5b50d8;padding:6px 9px;border-radius:999px;font-weight:800}
    `;document.head.appendChild(st);
  }
  function dashboard(){
    const page=$('#dashboard');if(!page||page.dataset.v56==='1')return;page.dataset.v56='1';
    const h=page.querySelector('h1');
    const top=document.createElement('div');top.className='fm-topline';top.innerHTML='<span class="eyebrow">PERSONAL COACH · V5.6</span><span class="fm-status"><i class="fm-dot"></i>로컬 코치 ON</span>';
    h?.after(top);
    const hero=page.querySelector('.hero');
    if(hero){hero.insertAdjacentHTML('afterend',`<div class="fm-ai-card"><div class="label">TODAY\'S COACHING</div><h3>오늘 기록을 바탕으로 다음 행동을 정리해줄게.</h3><p id="fmCoachSummary">운동·식단·바디 데이터를 계속 연결해서 판단합니다.</p></div>`);}
  }
  function chat(){
    const page=$('#chat');if(!page||page.dataset.v56==='1')return;page.dataset.v56='1';
    const h=page.querySelector('h2');if(h){h.innerHTML='<span class="fm-chat-title"><span>AI 코치</span><small class="fm-memory-pill">개인 데이터 연결됨</small></span>';}
    page.querySelectorAll('.fm-quick').forEach(x=>x.remove());
  }
  function nav(){
    const n=$('#mainNav');if(!n||n.dataset.v56==='1')return;n.dataset.v56='1';
    const labels=['홈','운동','식단','바디','러닝','리포트','AI','학습','메모리','프로필'];const icons=['⌂','↗','◒','◉','🏃','▥','✦','▤','◎','◌'];
    [...n.querySelectorAll('button')].forEach((b,i)=>{if(labels[i])b.innerHTML=`<span style="font-size:17px;line-height:1">${icons[i]}</span><span>${labels[i]}</span>`});
  }
  function refreshSummary(){
    const el=$('#fmCoachSummary');if(!el)return; const db=JSON.parse(localStorage.getItem('fitmind_v2')||'null');if(!db)return;
    const p=db.profile||{},w=(db.workouts||[]).at(-1),m=(db.meals||[]).filter(x=>x.date===new Date().toISOString().slice(0,10));
    const kcal=m.reduce((s,x)=>s+(+x.calories||0),0), protein=m.reduce((s,x)=>s+(+x.protein||0),0);
    el.textContent=w?`최근 ${w.exercise||'운동'} 기록과 오늘 식단 ${Math.round(kcal)}kcal · 단백질 ${protein.toFixed(1)}g을 함께 보고 있어.${p.goal?` 목표는 ${p.goal}이야.`:''}`:'운동·식단·바디 데이터를 기록하면 개인화 판단이 시작돼.';
  }
  function run(){inject();dashboard();chat();nav();refreshSummary();}
  document.addEventListener('DOMContentLoaded',run);setTimeout(run,500);setTimeout(run,1500);setInterval(()=>{try{refreshSummary()}catch(e){}},3000);
})();
