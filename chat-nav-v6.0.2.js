/* FitMind AI V6.0.2 — AI page navigation + New Chat fix */
(function(){
"use strict";
const STORE="fitmind_v602_sessions";
const $=id=>document.getElementById(id);
const read=()=>JSON.parse(localStorage.getItem(STORE)||'{"current":null,"sessions":[]}');
const write=x=>localStorage.setItem(STORE,JSON.stringify(x));
const now=()=>new Date().toISOString();
let navigating=false;

function ensureSession(){
  const s=read();
  if(!s.current){
    const id="chat_"+Date.now();
    s.current=id;s.sessions.push({id,title:"새 대화",createdAt:now(),updatedAt:now(),messages:[]});
    write(s);
  }
  return s.sessions.find(x=>x.id===s.current)||s.sessions[s.sessions.length-1];
}
function injectControls(){
  const page=$("chat"); if(!page)return;
  const h=page.querySelector("h2"); if(!h)return;
  let bar=$("v602ChatControls");
  if(!bar){
    bar=document.createElement("div");bar.id="v602ChatControls";
    bar.innerHTML='<button type="button" id="v602NewChat">＋ 새 채팅</button><button type="button" id="v602ChatHistory">대화 기록</button>';
    h.insertAdjacentElement("afterend",bar);
    $("v602NewChat").onclick=newChat;
    $("v602ChatHistory").onclick=showHistory;
  }
  let panel=$("v602History");
  if(!panel){
    panel=document.createElement("div");panel.id="v602History";panel.hidden=true;
    panel.innerHTML='<div class="v602HistoryHead"><b>대화 기록</b><button type="button" id="v602CloseHistory">닫기</button></div><div id="v602HistoryList"></div>';
    bar.insertAdjacentElement("afterend",panel);
    $("v602CloseHistory").onclick=()=>panel.hidden=true;
  }
}
function scrollToLatest(){
  const log=$("chatLog"); if(!log)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    log.scrollTop=log.scrollHeight;
    log.scrollTo({top:log.scrollHeight,behavior:"smooth"});
    window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});
  }));
}
function renderSession(){
  const sess=ensureSession(),log=$("chatLog");if(!log)return;
  const rows=sess.messages||[];
  // Keep the existing chat renderer's visual language.
  if(rows.length){
    log.innerHTML=rows.map(m=>`<div class="msg ${m.role==="user"?"user":"ai"}">${escapeHtml(m.text)}</div>`).join("");
  }
  scrollToLatest();
}
function escapeHtml(s){
 return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
function archiveCurrent(){
  const s=read(),cur=s.sessions.find(x=>x.id===s.current);
  if(cur){cur.updatedAt=now();if(cur.title==="새 대화"){const u=cur.messages.find(m=>m.role==="user");if(u)cur.title=u.text.slice(0,30);}}
  write(s);
}
function newChat(){
  archiveCurrent();
  const s=read(),id="chat_"+Date.now();
  s.current=id;s.sessions.push({id,title:"새 대화",createdAt:now(),updatedAt:now(),messages:[]});
  if(s.sessions.length>30)s.sessions=s.sessions.slice(-30);
  write(s);
  const log=$("chatLog");if(log)log.innerHTML="";
  const input=$("chatInput");if(input){input.value="";input.focus();}
  $("v602History")?.setAttribute("hidden","");
  scrollToLatest();
}
function showHistory(){
  const s=read(),list=$("v602HistoryList"),panel=$("v602History");if(!list||!panel)return;
  list.innerHTML=s.sessions.slice().reverse().map(x=>`<button type="button" class="v602HistoryItem" data-id="${escapeHtml(x.id)}"><b>${escapeHtml(x.title)}</b><small>${new Date(x.updatedAt).toLocaleString("ko-KR")}</small></button>`).join("");
  list.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    const st=read(),id=b.dataset.id,hit=st.sessions.find(x=>x.id===id);if(!hit)return;
    st.current=id;write(st);renderSession();panel.hidden=true;
  });
  panel.hidden=false;
}
function captureMessage(){
  const form=$("chatForm"),input=$("chatInput");if(!form||!input)return;
  if(form.dataset.v602Bound==="1")return;
  form.dataset.v602Bound="1";
  form.addEventListener("submit",()=>{
    setTimeout(()=>{
      const s=read(),cur=s.sessions.find(x=>x.id===s.current)||ensureSession();
      const text=input.value.trim();
      // app's native handler normally clears the input after reading it; use the
      // input snapshot before submission via a temporary fallback.
      if(text){
        cur.messages.push({role:"user",text,ts:Date.now()});
        cur.updatedAt=now();
        if(cur.title==="새 대화")cur.title=text.slice(0,30);
        write(s);
      }
      scrollToLatest();
      setTimeout(scrollToLatest,250);
    },0);
  });
}
function observe(){
  injectControls();captureMessage();
  const page=$("chat");
  if(page && page.classList.contains("active")){ensureSession();scrollToLatest();}
}
function patchOpenPage(){
  if(typeof window.openPage!=="function")return;
  if(window.openPage.__v602)return;
  const original=window.openPage;
  function wrapped(id){
    original.apply(this,arguments);
    if(id==="chat"){
      ensureSession();injectControls();
      setTimeout(()=>{injectControls();scrollToLatest();},0);
      setTimeout(()=>{injectControls();scrollToLatest();},120);
      setTimeout(()=>{injectControls();scrollToLatest();},500);
    }
  }
  wrapped.__v602=true;
  window.openPage=wrapped;
}
function style(){
  if($("v602Style"))return;
  const st=document.createElement("style");st.id="v602Style";st.textContent=`
    #v602ChatControls{display:flex!important;gap:8px;margin:10px 0 12px}
    #v602ChatControls button{appearance:none;border:1px solid #dce2ee;background:#fff;border-radius:14px;padding:10px 14px;font-weight:800;color:#172033;cursor:pointer}
    #v602ChatControls button:first-child{background:#111827;color:#fff;border-color:#111827}
    #v602History{background:#fff;border:1px solid #e2e7f0;border-radius:16px;padding:12px;margin:0 0 12px;box-shadow:0 10px 30px rgba(15,23,42,.08)}
    .v602HistoryHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .v602HistoryHead button{border:0;background:transparent;padding:6px 8px}
    .v602HistoryItem{display:flex;width:100%;justify-content:space-between;gap:10px;text-align:left;background:#fff;border:0;border-top:1px solid #eef1f6;padding:12px 4px}
    .v602HistoryItem small{color:#7b8495}
    #chatLog{scroll-behavior:smooth;overflow-y:auto;overscroll-behavior:contain}
  `;document.head.appendChild(st);
}
function init(){
  style();patchOpenPage();observe();
  const mo=new MutationObserver(()=>{patchOpenPage();if($("chat")?.classList.contains("active")){injectControls();captureMessage();}});
  mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
}
document.addEventListener("DOMContentLoaded",()=>{init();setTimeout(init,300);setTimeout(init,1000);});
window.FitMindV602={newChat,showHistory,scrollToLatest};
})();
