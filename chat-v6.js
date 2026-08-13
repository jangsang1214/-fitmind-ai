/* FitMind AI V6.0.1 — Chat UX + Memory + Coach Orchestrator */
(function(){
"use strict";
const V="6.0.1", KEY="fitmind_v2";
const $=id=>document.getElementById(id);
const db=()=>window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||'{"chat":[],"coachMemory":{},"profile":{},"workouts":[],"meals":[],"body":[]}');
const save=()=>window.__FitMindV6Save?window.__FitMindV6Save():localStorage.setItem(KEY,JSON.stringify(db()));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);

function memory(){
 const d=db(); d.coachMemory=d.coachMemory||{};
 d.coachMemory.facts=Array.isArray(d.coachMemory.facts)?d.coachMemory.facts:[];
 d.coachMemory.topics=Array.isArray(d.coachMemory.topics)?d.coachMemory.topics:[];
 d.coachMemory.feedback=Array.isArray(d.coachMemory.feedback)?d.coachMemory.feedback:[];
 d.coachMemory.preferences=d.coachMemory.preferences||{};
 return d.coachMemory;
}
function addMemory(text,type="topic"){
 const m=memory(); const item={text:String(text),type,date:today()};
 const arr=type==="fact"?m.facts:m.topics;
 arr.push(item); if(arr.length>100)arr.splice(0,arr.length-100);
 m.updatedAt=new Date().toISOString(); save();
}
function compactContext(){
 const d=db(),m=memory(), ws=(d.workouts||[]).slice(-10), meals=(d.meals||[]).slice(-10), body=(d.body||[]).slice(-5);
 return {profile:d.profile||{},recentWorkouts:ws,recentMeals:meals,recentBody:body,
   recentChat:(d.chat||[]).slice(-12),memory:{facts:m.facts.slice(-15),topics:m.topics.slice(-15),feedback:m.feedback.slice(-10)}};
}
function ensureUI(){
 const page=$("chat"); if(!page)return;
 const h=page.querySelector("h2");
 if(h && !$("v6ChatActions")){
   const actions=document.createElement("div"); actions.id="v6ChatActions"; actions.className="v6-actions";
   actions.innerHTML='<button type="button" id="v6NewChat">＋ 새 채팅</button><button type="button" id="v6History">대화 기록</button>';
   h.parentNode.insertBefore(actions,h.nextSibling);
   $("v6NewChat").onclick=newChat;
   $("v6History").onclick=toggleHistory;
 }
 if(!$("v6NewChat") && h){
   // no-op; above creates it
 }
 if(!$("v6HistoryPanel")){
   const panel=document.createElement("div");panel.id="v6HistoryPanel";panel.className="v6-history hidden";
   panel.innerHTML='<div class="v6-history-head"><b>최근 대화</b><button type="button" id="v6CloseHistory">닫기</button></div><div id="v6HistoryList"></div>';
   page.insertBefore(panel,page.querySelector(".chatlog"));
   $("v6CloseHistory").onclick=()=>panel.classList.add("hidden");
 }
}
function scrollLatest(force=true){
 const log=$("chatLog"); if(!log)return;
 if(force)requestAnimationFrame(()=>log.scrollTo({top:log.scrollHeight,behavior:"smooth"}));
}
function renderChat(){
 const d=db(), log=$("chatLog"); if(!log)return;
 const rows=(d.chat||[]).slice(-60);
 log.innerHTML=rows.length?rows.map(x=>`<div class="msg ${x.role==="user"?"user":"ai"}">${esc(x.text)}</div>`).join("")
  :"<div class='card'>안녕하세요. 운동·식단·바디 데이터뿐 아니라 그냥 일상적인 얘기도 편하게 해줘.</div>";
 scrollLatest(true);
}
function history(){
 const d=db(), list=$("v6HistoryList");if(!list)return;
 const rows=d.chat||[]; const groups=[];
 for(let i=0;i<rows.length;i+=20){
   const r=rows.slice(i,i+20), first=r.find(x=>x.role==="user");
   groups.push({idx:i,title:first?.text||"새 대화",date:r[0]?.date||""});
 }
 list.innerHTML=groups.reverse().slice(0,12).map(g=>`<button type="button" class="v6-history-item" data-i="${g.idx}"><b>${esc(g.title.slice(0,34))}</b><small>${esc(g.date)}</small></button>`).join("")||"<small>저장된 대화가 없어.</small>";
 list.querySelectorAll("button").forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.i); const r=(db().chat||[]).slice(i,i+20);
   const log=$("chatLog");if(log)log.innerHTML=r.map(x=>`<div class="msg ${x.role==="user"?"user":"ai"}">${esc(x.text)}</div>`).join("");
   $("v6HistoryPanel").classList.add("hidden"); scrollLatest(true);
 });
}
function toggleHistory(){history();$("v6HistoryPanel").classList.toggle("hidden");}
function newChat(){
 const d=db(); d.chat=d.chat||[];
 // Persist a short summary as long-term topic, but do not delete long-term memory.
 const users=d.chat.filter(x=>x.role==="user").slice(-5).map(x=>x.text).join(" / ");
 if(users)addMemory("이전 채팅 주제: "+users,"topic");
 d.chat=[]; save(); renderChat(); $("v6HistoryPanel")?.classList.add("hidden");
}
function routeCoach(text){
 const grounded=window.FitMindDataEngineV65?.groundedAnswer?.(text);
 const context=compactContext();
 if(grounded && grounded.text){
   // Grounded local tools are authoritative for app-data questions; cloud is reserved for deeper synthesis.
   return Promise.resolve(grounded.text);
 }
 if(window.FitMindCloud?.route){
   return window.FitMindCloud.route(text,context,(t,c)=>{
     const r=window.FitMindV5?.answer?.(t,{db:db(),context:c});
     return r?.text||"지금은 로컬 코치로 답변할게.";
   });
 }
 const r=window.FitMindV5?.answer?.(text,{db:db(),context});
 if(r?.text) return Promise.resolve(r.text);
 const conversational=window.FitMindDialogueV651?.answer?.(text,context);
 return Promise.resolve(conversational||"응, 듣고 있어. 조금 더 얘기해줘.");
}
async function send(text){
 const d=db(),t=String(text||"").trim();if(!t)return;
 d.chat=d.chat||[];d.chat.push({role:"user",text:t,date:today(),ts:Date.now()});save();renderChat();
 addMemory(t,"topic");
 const answer=await routeCoach(t);
 const d2=db();d2.chat=d2.chat||[];d2.chat.push({role:"ai",text:answer,date:today(),ts:Date.now()});save();renderChat();
}
function bind(){
 const form=$("chatForm"),input=$("chatInput");if(!form||!input)return;
 // Replace the V5 handler only for the V6 chat page.
 form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(!t)return;input.value="";send(t);};
 input.addEventListener("focus",()=>setTimeout(()=>scrollLatest(true),50));
 renderChat();
 ensureUI();
}
function injectStyle(){
 if($("v6ChatStyle"))return;
 const st=document.createElement("style");st.id="v6ChatStyle";st.textContent=`
 .v6-actions{display:flex;gap:8px;margin:8px 0 10px}
 .v6-actions button{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:8px 12px;font-weight:700}
 .v6-history{background:#fff;border:1px solid #e7eaf0;border-radius:16px;padding:12px;margin:0 0 12px;box-shadow:0 12px 30px rgba(15,23,42,.08)}
 .v6-history.hidden{display:none}.v6-history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
 .v6-history-item{display:flex;justify-content:space-between;gap:10px;width:100%;border:0;border-bottom:1px solid #f0f2f5;background:transparent;padding:11px 4px;text-align:left}
 .v6-history-item small{color:#94a3b8}.chatlog{scroll-behavior:smooth;overscroll-behavior:contain}
 `;
 document.head.appendChild(st);
}
function init(){injectStyle();bind();}
window.FitMindV6=Object.assign(window.FitMindV6||{},{
 version:V,send,newChat,renderChat,compactContext,addMemory,getMemory:memory
});
document.addEventListener("DOMContentLoaded",()=>{init();setTimeout(init,700);});
})();
