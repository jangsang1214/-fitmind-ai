/* FitMind AI V6.1 — local conversation learning */
(function(){
"use strict";
const STORE="fitmind_v61_learning";
const $=id=>document.getElementById(id);
const load=()=>JSON.parse(localStorage.getItem(STORE)||'{"facts":[],"preferences":[],"topics":[],"feedback":[],"style":{"casual":0,"formal":0,"emoji":0,"short":0},"updatedAt":null}');
const save=x=>localStorage.setItem(STORE,JSON.stringify(x));
const norm=s=>String(s||"").trim().replace(/\s+/g," ");
function add(arr,text,score=1){
 text=norm(text);if(!text)return;
 const hit=arr.find(x=>x.text===text);
 if(hit){hit.score=(hit.score||1)+score;hit.updatedAt=Date.now();}
 else arr.push({text,score,updatedAt:Date.now()});
 arr.sort((a,b)=>(b.score||0)-(a.score||0));if(arr.length>80)arr.length=80;
}
function learnFromUser(text){
 const q=norm(text),d=load();
 const patterns=[
  [/내 목표(?:는|가)\s*(.+)/,"fact",5],
  [/나는\s*(.+?)(?:을|를)\s*(좋아해|싫어해)/,"preference",4],
  [/나는\s*(.+?)\s*(좋아해|싫어해)/,"preference",4],
  [/기억해(?:둬|줘)?[\.! ]*(.+)/,"fact",5],
  [/앞으로\s*(.+)/,"preference",3]
 ];
 for(const [re,type,score] of patterns){
  const m=q.match(re);if(m){const txt=(m[1]||m[0]).trim();add(type==="preference"?d.preferences:d.facts,txt,score);}
 }
 if(/ㅋㅋ|ㅎㅎ|ㄹㅇ|개[가-힣]|존나|ㅅㅂ/.test(q))d.style.casual++;
 if(/ㅠㅠ|ㅜㅜ|🥲|😢/.test(q))d.style.emoji++;
 if(q.length<18)d.style.short++;
 add(d.topics,q,1);d.updatedAt=new Date().toISOString();save(d);
}
function learnFeedback(user,assistant){
 const q=norm(user),a=norm(assistant),d=load();
 if(/좋아|도움됐|고마워|정확|딱이네|맞아/.test(q))add(d.feedback,"긍정적 답변",1);
 if(/아니|틀렸|별로|그게 아니라|다시|왜 못/.test(q))add(d.feedback,"답변 수정 필요",2);
 if(a)add(d.topics,"최근 코칭 주제: "+q.slice(0,80),1);
 d.updatedAt=new Date().toISOString();save(d);
}
function context(){
 const d=load();
 return {facts:d.facts.slice(0,12),preferences:d.preferences.slice(0,12),topics:d.topics.slice(0,12),feedback:d.feedback.slice(0,8),style:d.style};
}
function wire(){
 const form=$("chatForm"),input=$("chatInput");
 if(form&&!form.dataset.v61Learning){
  form.dataset.v61Learning="1";
  form.addEventListener("submit",()=>{
   const q=norm(input?.value);if(q)learnFromUser(q);
   setTimeout(()=>{const msgs=[...document.querySelectorAll("#chatLog .msg.ai")];const last=msgs[msgs.length-1]?.textContent||"";if(q&&last)learnFeedback(q,last);},500);
  },true);
 }
 const n=$("v61NewChat");
 if(n&&!n.dataset.v61){n.dataset.v61="1";n.onclick=()=>{window.FitMindV6?.newChat?.();setTimeout(()=>{$("chatLog")?.scrollTo({top:$("chatLog").scrollHeight,behavior:"instant"});$("chatInput")?.focus();},50);};}
 const h=$("v61History"),p=$("v61HistoryPanel"),c=$("v61CloseHistory");
 if(h&&!h.dataset.v61){h.dataset.v61="1";h.onclick=()=>{p.hidden=false;};}
 if(c&&!c.dataset.v61){c.dataset.v61="1";c.onclick=()=>p.hidden=true;}
}
window.FitMindConversationLearning={version:"6.1.0",context,learnFromUser,learnFeedback};
document.addEventListener("DOMContentLoaded",()=>{wire();setTimeout(wire,300);setTimeout(wire,1000);});
})();
