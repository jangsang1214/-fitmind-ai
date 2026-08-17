
(function(){
 const $=id=>document.getElementById(id);
 let mode="login";
 const screen=$("authScreen"), app=$("app"), status=$("authStatus");
 const showApp=()=>{screen.style.display="none";app.classList.remove("locked");sessionStorage.setItem("garang_session","1");};
 const setMode=m=>{
   mode=m;
   $("loginTab").classList.toggle("active",m==="login");
   $("signupTab").classList.toggle("active",m==="signup");
   $("authSubmit").textContent=m==="login"?"로그인":"회원가입";
   $("authPasswordConfirmWrap").style.display=m==="signup"?"block":"none";
   status.textContent="실제 계정은 Firebase 연결 후 사용할 수 있습니다. 둘러보기 모드는 기기 로컬 데이터로 동작합니다.";
 };
 $("loginTab").onclick=()=>setMode("login");
 $("signupTab").onclick=()=>setMode("signup");
 $("guestEnter").onclick=()=>showApp();
 $("authSubmit").onclick=async()=>{
   const email=$("authEmail").value.trim(), pw=$("authPassword").value;
   if(!email||pw.length<6){status.textContent="이메일과 6자 이상 비밀번호를 입력해주세요.";return;}
   if(mode==="signup" && pw!==$("authPasswordConfirm").value){status.textContent="비밀번호가 일치하지 않습니다.";return;}
   if(!window.GARANG_SERVER?.configured){
     status.textContent="Firebase 서버가 아직 연결되지 않았습니다. 먼저 firebase-config.js를 설정하세요.";
     return;
   }
   try{
     status.textContent=mode==="login"?"로그인 중...":"회원가입 중...";
     const result=mode==="login"
       ? await GARANG_SERVER.auth.signInWithEmailAndPassword(email,pw)
       : await GARANG_SERVER.auth.createUserWithEmailAndPassword(email,pw);
     GARANG_SERVER.user=result.user;
     showApp();
   }catch(err){status.textContent="인증 실패: "+(err?.message||"알 수 없는 오류");}
 };
 if(sessionStorage.getItem("garang_session")==="1") showApp();
})();
