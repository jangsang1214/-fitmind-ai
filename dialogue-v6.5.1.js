/* FitMind AI V6.5.1 — conversational fallback
   Provides varied, context-aware Korean dialogue when no server LLM is connected.
   It is deliberately separate from fitness-data tools.
*/
(function(){
"use strict";
const esc=s=>String(s||"").trim();
function mood(q){
 if(/힘들|지쳐|피곤|졸려|스트레스|답답/.test(q))return"support";
 if(/ㅋㅋ|ㅎㅎ|ㄹㅇ|진짜|개[가-힣]|ㅅㅂ/.test(q))return"casual";
 if(/왜|어떻게|뭐가|가능|맞아/.test(q))return"question";
 return"normal";
}
function answer(q,ctx){
 q=esc(q); const m=mood(q), p=ctx?.profile||{};
 if(/안녕|ㅎㅇ|하이|반가/.test(q)) return "ㅋㅋ 왔네. 오늘은 뭐 얘기해볼까? 운동 얘기든 그냥 일상 얘기든 편하게 해.";
 if(/고마워|감사/.test(q)) return m==="casual"?"ㅋㅋ 별말을.":"도움됐다니 다행이야. 이어서 필요한 거 있으면 말해줘.";
 if(/잘자|자러|잠/.test(q)) return "ㅇㅋ 오늘은 여기까지 하고 푹 자자. 내일 이어서 보면 돼.";
 if(/힘들|지쳐|피곤|졸려/.test(q)) return "오늘 좀 많이 지쳤나 보네. 무리해서 뭘 더 하려고 하기보다 지금은 쉬는 게 우선이야. 무슨 일 있었어?";
 if(/ㅋㅋ|ㅎㅎ/.test(q)) return "ㅋㅋ 그러니까. 나도 무슨 말인지 알겠어. 계속 얘기해봐.";
 if(/뭐해|뭐하고/.test(q)) return "나는 여기서 네 얘기 듣고 있는 중이지 ㅋㅋ 오늘은 무슨 얘기하려고?";
 if(/너는|넌/.test(q)) return "나는 네가 말해주는 맥락을 따라가면서 같이 정리해주는 쪽에 가까워. 그래서 편하게 말하면 돼.";
 if(q.endsWith("?")||m==="question") return `그건 맥락을 조금 더 알아야 정확하게 얘기할 수 있어. 지금 상황을 한두 문장만 더 말해줘.`;
 if(q.length<12) return `응, 듣고 있어. "${q}" 다음에 하고 싶은 말까지 편하게 이어서 말해봐.`;
 const names=p.name?` ${p.name}아`:"";
 return m==="casual"?`ㅇㅇ${names}, 무슨 말인지 감 잡았어. 조금 더 얘기해봐. 그 흐름 그대로 맞춰볼게.`:`응${names}, 무슨 말인지 이해했어. 그 얘기에서 이어서 같이 생각해보자.`;
}
window.FitMindDialogueV651={answer};
})();
