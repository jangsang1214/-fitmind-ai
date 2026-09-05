/* GARANG Coach Item 4 Finalization
   - Keeps recommended questions persistently visible above the composer.
   - Uses Korean canonical prompts underneath so the local Coach Engine follows the correct branch.
   - Renders the same recommended prompts fully in English when the UI language is English.
   - Repairs mixed Korean/English local Coach answers from the original stored message text.
*/
(() => {
'use strict';

const VERSION='garang-coach-item4-final-v1';
const main=document.getElementById('main');
if(!main)return;

const PROMPTS=Object.freeze([
  {id:'training',koLabel:'오늘 운동 강도',enLabel:"Today's training",koPrompt:'오늘 운동 강도를 내 기록 기준으로 정해줘',enPrompt:"Set today's training intensity based on my records."},
  {id:'recent',koLabel:'최근 운동 분석',enLabel:'Recent workouts',koPrompt:'내 최근 운동 기록을 분석해줘',enPrompt:'Analyze my recent workout records.'},
  {id:'nutrition',koLabel:'오늘 식단 분석',enLabel:"Today's nutrition",koPrompt:'오늘 저장된 식단 기록을 분석해줘',enPrompt:"Analyze today's nutrition based on my saved meals."},
  {id:'recovery',koLabel:'회복 상태',enLabel:'Recovery',koPrompt:'오늘 회복 상태를 알려줘',enPrompt:'How is my recovery today?'},
  {id:'plan',koLabel:'계획 만들기',enLabel:'Create plan',koPrompt:'오늘 계획을 만들어줘',enPrompt:'Create a plan for today.'}
]);
const promptByKo=new Map(PROMPTS.map(item=>[item.koPrompt,item]));
const hasHangul=text=>/[가-힣]/.test(String(text||''));
const english=()=>document.documentElement.lang==='en';
const clean=text=>String(text??'').replace(/\r\n/g,'\n').trim();

function translateExercise(name){
  try{return window.GarangEntityI18n?.translateExercise?.(name)||name;}catch{return name;}
}

function translateKnownCoachText(source){
  const input=clean(source);if(!input)return input;
  let out=input;
  try{out=window.GarangCoachLanguagePolicy?.translate?.(input)||input;}catch{}
  if(!hasHangul(out))return out;

  const exact=new Map([
    ['현재 외부 AI 연결이 없어서 GARANG 로컬 코치로 응답하고 있습니다. 운동 강도, 회복 상태, 식단, 최근 기록에 대해서는 실제 저장 데이터를 기준으로 분석할 수 있습니다.','The external AI is not connected yet, so GARANG is responding with its local Coach Engine. It can still analyze training intensity, recovery, nutrition, and recent records from your actual saved data.'],
    ['오늘 체크인이 아직 없습니다. 수면, 에너지, 스트레스, 근육통을 저장하면 GARANG이 오늘 훈련 강도를 실제 기록에 맞춰 판단할 수 있습니다.','There is no check-in for today yet. Save sleep, energy, stress, and soreness so GARANG can judge today’s training intensity from your actual data.'],
    ['지금은 실제 저장된 식단 기록만 사용해 판단했습니다.','This judgment uses only your actual saved nutrition records.'],
    ['수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다.','Sleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.'],
    ['고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다.','A recovery session or reduced-volume session is better than high intensity today.'],
    ['평소보다 약간 보수적인 강도가 적절합니다.','A slightly more conservative intensity than usual is appropriate today.'],
    ['현재 기록상 정상 훈련을 진행할 수 있는 범위입니다.','Your current records support a normal training session today.']
  ]);
  if(exact.has(input))return exact.get(input);

  out=input.replace(/오늘 기록 기준으로\s*([0-9.]+)\s*kcal,\s*단백질\s*([0-9.]+)g입니다\.\s*목표 단백질을 약\s*([0-9.]+)g으로 보면\s*([0-9.]+)g 정도 남아 있습니다\.\s*지금은 실제 저장된 식단 기록만 사용해 판단했습니다\./s,
    'Based on today’s records: $1 kcal and $2 g protein. With a protein target of about $3 g, roughly $4 g remains. This judgment uses only your actual saved nutrition records.');
  if(!hasHangul(out))return out;

  out=out.replace(/현재 저장된 운동 기록은\s*(\d+)개입니다\.(?:\s*최근 기록:\s*([^\n]+?)\s+([0-9.]+)kg\s*×\s*([0-9.]+)\s*×\s*([0-9.]+)세트\.)?\s*수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다\./s,
    (_,count,name,weight,reps,sets)=>`There are ${count} saved workout records.${name?`\nLatest record: ${translateExercise(name)} ${weight} kg × ${reps} × ${sets} sets.`:''}\n\nSleep, soreness, and recent training load let GARANG adjust today’s intensity more precisely.`);
  if(!hasHangul(out))return out;

  out=out.replace(/오늘 회복 지표는 약\s*([0-9.]+)\/100입니다\.\s*수면\s*([0-9.]+)시간\s*·\s*에너지\s*([0-9.]+)\/5\s*·\s*스트레스\s*([0-9.]+)\/5\s*·\s*근육통\s*([0-9.]+)\/5를 반영했습니다\.\s*(고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다\.|평소보다 약간 보수적인 강도가 적절합니다\.|현재 기록상 정상 훈련을 진행할 수 있는 범위입니다\.)/s,
    (_,score,sleep,energy,stress,soreness,tail)=>`Today’s recovery score is about ${score}/100.\nSleep ${sleep} h · Energy ${energy}/5 · Stress ${stress}/5 · Soreness ${soreness}/5 are included.\n\n${exact.get(tail)||tail}`);
  if(!hasHangul(out))return out;

  try{const generic=window.GarangI18n?.translate?.(input);if(generic&&!hasHangul(generic))return generic;}catch{}
  return 'GARANG reviewed your saved data, but this local-only response is not available as a complete English sentence yet. Please ask again or switch to Korean until the external AI adapter is connected.';
}

function threadMessageById(id){
  if(!id)return null;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!String(key||'').startsWith('garang_coach_threads_v2::'))continue;
      const store=JSON.parse(localStorage.getItem(key)||'null');
      for(const thread of store?.threads||[]){const message=(thread.messages||[]).find(item=>String(item?.id)===String(id));if(message)return message;}
    }
  }catch{}
  return null;
}

function repairMessageLanguage(root){
  const isEn=english();
  root.querySelectorAll('.g2-message[data-message-id]').forEach(messageEl=>{
    const textEl=messageEl.querySelector('.g2-message-text');if(!textEl)return;
    const stored=threadMessageById(messageEl.dataset.messageId);const source=clean(stored?.text||textEl.textContent||'');if(!source)return;
    let next=source;
    if(messageEl.classList.contains('user')){
      if(isEn&&promptByKo.has(source))next=promptByKo.get(source).enPrompt;
    }else if(messageEl.classList.contains('assistant')&&isEn){next=translateKnownCoachText(source);}
    if(textEl.textContent!==next)textEl.textContent=next;
  });
}

function ensurePersistentPrompts(root){
  const wrap=root.querySelector('.g2-composer-wrap'),composer=root.querySelector('.g2-composer'),input=root.querySelector('.g2-composer textarea');
  if(!wrap||!composer||!input)return;
  root.querySelector('.g2-empty-chat .g2-prompts')?.remove();
  let strip=wrap.querySelector('.g4-prompt-strip');
  if(!strip){strip=document.createElement('div');strip.className='g4-prompt-strip';wrap.insertBefore(strip,composer);}
  if(strip.nextElementSibling!==composer)wrap.insertBefore(strip,composer);
  strip.dataset.garangPersistent='1';
  const isEn=english();
  const signature=PROMPTS.map(item=>`${isEn?item.enLabel:item.koLabel}\u0001${isEn?item.enPrompt:item.koPrompt}`).join('\u0002');
  if(strip.dataset.garangSignature!==signature){
    strip.innerHTML=PROMPTS.map(item=>`<button type="button" data-g4-prompt="${isEn?item.enPrompt:item.koPrompt}" data-garang-canonical-prompt="${item.koPrompt}" data-garang-prompt-id="${item.id}">${isEn?item.enLabel:item.koLabel}</button>`).join('');
    strip.dataset.garangSignature=signature;
  }
  strip.querySelectorAll('[data-garang-canonical-prompt]').forEach(button=>{
    button.onclick=()=>{
      input.value=button.dataset.garangCanonicalPrompt||'';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      root.querySelector('.g2-send')?.click();
      queueRepair();
    };
  });
  const placeholder=isEn?'Message GARANG':'GARANG에게 메시지 보내기';
  input.placeholder=placeholder;input.setAttribute('aria-label',placeholder);
}

function ensureStyle(){
  if(document.getElementById('garang-item4-final-style'))return;
  const style=document.createElement('style');style.id='garang-item4-final-style';style.textContent=`
    .g4-prompt-strip[data-garang-persistent="1"]{display:flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;min-height:37px!important}
    .g2-composer-wrap>.g4-prompt-strip[data-garang-persistent="1"]{order:-1}
    @media(max-width:800px){.g4-prompt-strip[data-garang-persistent="1"]{min-height:36px!important;padding-bottom:7px!important}}
  `;document.head.appendChild(style);
}

let queued=false;
function repair(){queued=false;const root=main.querySelector('.garang-coach-v2');if(!root)return;ensureStyle();ensurePersistentPrompts(root);repairMessageLanguage(root);root.dataset.garangItem4Final=VERSION;}
function queueRepair(){if(queued)return;queued=true;requestAnimationFrame(repair);}

new MutationObserver(queueRepair).observe(main,{childList:true,subtree:true,characterData:true});
new MutationObserver(queueRepair).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('garang:agent-proposal-resolved',queueRepair);
window.GarangCoachItem4Final=Object.freeze({version:VERSION,prompts:PROMPTS,translateCoachText:translateKnownCoachText});
queueRepair();
})();
