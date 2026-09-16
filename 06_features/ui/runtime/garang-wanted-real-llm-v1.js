(() => {
  'use strict';
  const ACTIVE_KEY='garang_wanted_demo_active_v1';
  const active=()=>localStorage.getItem(ACTIVE_KEY)==='1';
  function refresh(){
    const entry=document.querySelector('.wanted-demo-entry p');
    if(entry)entry.textContent='계정 없이 명확히 표시된 14일 합성 데이터만 사용합니다. Coach의 텍스트 설명은 호출량이 제한된 Wanted 심사 전용 Real AI 경로로 동작합니다.';
    if(!active())return;
    document.documentElement.dataset.wantedRealLlm='1';
    const guide=document.querySelector('.wanted-demo-guide small');
    if(guide)guide.textContent='14일 운동·식단·회복·체성분 합성 기록을 GARANG 결정 엔진이 읽고, Coach의 텍스트 설명은 제한된 심사 전용 Real AI 경로를 사용합니다. 사진 해석은 로그인 후 Production Coach에서 이용할 수 있습니다.';
    const note=document.querySelector('.wanted-coach-demo-note span');
    if(note)note.textContent='최근 2주 합성 기록을 GARANG deterministic intelligence가 판단하고, 이 Coach의 텍스트 설명은 실제 LLM이 생성합니다. 사진 해석과 실제 사용자 클라우드 데이터는 사용하지 않습니다.';
  }
  window.GarangWantedRealLlmV1=Object.freeze({version:'wanted-real-llm-v1',active,refresh});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
  window.addEventListener('garang:screen-rendered',refresh);
  setTimeout(refresh,250);setTimeout(refresh,900);
})();
