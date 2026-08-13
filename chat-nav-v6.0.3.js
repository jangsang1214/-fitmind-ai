/* FitMind AI V6.0.3 — reliable AI-tab landing + always-visible new chat */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="fitmind_v2";
function db(){return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||'{"chat":[],"coachMemory":{},"profile":{},"workouts":[],"meals":[],"body":[]}');}
function save(d){if(window.__FitMindV6Save) window.__FitMindV6Save(); else localStorage.setItem(KEY,JSON.stringify(d));}
function scrollAI(){
 const page=$("chat"),log=$("chatLog"),form=$("chatForm");
 if(!page)return;
 const go=()=>{
   if(log) log.scrollTop=log.scrollHeight;
   if(form) form.scrollIntoView({block:"end",behavior:"smooth"});
   setTimeout(()=>{ if(log) log.scrollTop=log.scrollHeight; if(form) form.scrollIntoView({block:"end",behavior:"smooth"}); },180);
 };
 requestAnimationFrame(go); setTimeout(go,500);
}
function newChat(){
 const d=db(); d.chat=d.chat||[];
 // Preserve the old conversation in a session archive before starting a blank one.
 d.chatSessions=Array.isArray(d.chatSessions)?d.chatSessions:[];
 if(d.chat.length){
   d.chatSessions.push({id:"s_"+Date.now(),createdAt:new Date().toISOString(),messages:d.chat.slice()});
   if(d.chatSessions.length>30)d.chatSessions=d.chatSessions.slice(-30);
 }
 d.chat=[]; save(d);
 if(window.FitMindV6?.renderChat) window.FitMindV6.renderChat(); else {
   const log=$("chatLog"); if(log)log.innerHTML="<div class='card'>새 대화가 시작됐어요.</div>";
 }
 const input=$("chatInput");if(input){input.value="";input.focus();}
 scrollAI();
}
function showHistory(){
 const d=db(), sessions=Array.isArray(d.chatSessions)?d.chatSessions:[];
 let panel=$("v603HistoryPanel");
 if(!panel){
   panel=document.createElement("div");panel.id="v603HistoryPanel";panel.className="v603-history-panel";
   panel.innerHTML='<div class="v603-history-head"><b>대화 기록</b><button type="button" id="v603Close">닫기</button></div><div id="v603HistoryList"></div>';
   $("v603ChatControls").insertAdjacentElement("afterend",panel);
   $("v603Close").onclick=()=>panel.remove();
 }
 const list=$("v603HistoryList");
 list.innerHTML=sessions.slice().reverse().map((s,i)=>{
   const first=(s.messages||[]).find(m=>m.role==="user");
   return `<button type="button" class="v603-history-item" data-idx="${sessions.length-1-i}"><b>${esc(first?.text||"새 대화")}</b><small>${new Date(s.createdAt).toLocaleString("ko-KR")}</small></button>`;
 }).join("")||"<p>저장된 이전 대화가 없습니다.</p>";
 list.querySelectorAll("[data-idx]").forEach(b=>b.onclick=()=>{
   const st=db(),s=(st.chatSessions||[])[Number(b.dataset.idx)]; if(!s)return;
   st.chat=s.messages.slice(); save(st);
   if(window.FitMindV6?.renderChat)window.FitMindV6.renderChat();
   panel.remove();scrollAI();
 });
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function bind(){
 const n=$("mainNav");
 if(n && n.dataset.v603!=="1"){
   n.dataset.v603="1";
   const ai=[...n.querySelectorAll("button")].find(b=>b.textContent.includes("AI"));
   if(ai)ai.addEventListener("click",()=>setTimeout(scrollAI,30));
 }
 const nb=$("v603NewChat"),hb=$("v603History");
 if(nb && nb.dataset.bound!=="1"){nb.dataset.bound="1";nb.addEventListener("click",newChat);}
 if(hb && hb.dataset.bound!=="1"){hb.dataset.bound="1";hb.addEventListener("click",showHistory);}
 if($("chat")?.classList.contains("active"))scrollAI();
}
function style(){
 if($("v603Style"))return;
 const st=document.createElement("style");st.id="v603Style";st.textContent=`
 .v603-chat-controls{display:flex;gap:8px;margin:10px 0 14px}
 .v603-chat-controls button{border:1px solid #dfe4ee;border-radius:14px;padding:10px 15px;background:#fff;color:#172033;font-weight:800}
 .v603-chat-controls button:first-child{background:#111827;color:#fff;border-color:#111827}
 .v603-history-panel{background:#fff;border:1px solid #e1e6ef;border-radius:16px;padding:12px;margin:0 0 14px;box-shadow:0 12px 30px rgba(15,23,42,.08)}
 .v603-history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
 .v603-history-head button{border:0;background:transparent;padding:6px}
 .v603-history-item{display:flex;width:100%;justify-content:space-between;gap:8px;text-align:left;background:#fff;border:0;border-top:1px solid #eef1f5;padding:12px 4px}
 .v603-history-item small{color:#7b8494}
 `;
 document.head.appendChild(st);
}
function init(){style();bind();setTimeout(bind,300);setTimeout(bind,1000);}
document.addEventListener("DOMContentLoaded",init);
window.addEventListener("load",()=>setTimeout(bind,100));
})();
