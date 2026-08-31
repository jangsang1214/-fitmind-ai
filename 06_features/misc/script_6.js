
window.addEventListener("DOMContentLoaded", async ()=>{
  const status=document.getElementById("serverStatus");
  if(window.GARANG_FIREBASE_CONFIG && window.GARANG_FIREBASE_CONFIG.apiKey && window.GARANG_FIREBASE_CONFIG.apiKey!=="YOUR_FIREBASE_WEB_API_KEY"){
    try{
      const ok=await window.GARANG_SERVER.init(window.GARANG_FIREBASE_CONFIG);
      if(ok && status) status.textContent="Firebase 준비됨 · 로그인/회원가입 가능";
    }catch(e){console.warn("Firebase auto-init failed",e);}
  }
  document.getElementById("serverConnect")?.addEventListener("click", async ()=>{
    status.textContent="Firebase 연결 준비 중...";
    try{
      if(!window.GARANG_FIREBASE_CONFIG || window.GARANG_FIREBASE_CONFIG.apiKey==="YOUR_FIREBASE_WEB_API_KEY"){
        status.textContent="firebase-config.js에 Firebase Web App 설정을 넣어주세요."; return;
      }
      const ok=await window.GARANG_SERVER.init(window.GARANG_FIREBASE_CONFIG);
      status.textContent=ok?"Firebase 연결됨":"Firebase SDK/설정 확인 필요";
    }catch(e){status.textContent="연결 실패: "+e.message;}
  });
  document.getElementById("learningConsent")?.addEventListener("click", async ()=>{
    const next=!window.GARANG_SERVER.consent.globalLearning;
    await window.GARANG_SERVER.setConsent(next);
    document.getElementById("learningConsent").textContent=next?"Global Learning 철회":"Global Learning 동의";
    status.textContent=next?"전역 학습 참여: ON":"전역 학습 참여: OFF";
  });
});
