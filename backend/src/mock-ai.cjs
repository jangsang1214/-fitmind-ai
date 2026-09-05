'use strict';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
class MockAIAdapter{
  constructor(){this.name='mock';}
  async generate({message,mockScenario=null}={}){
    const text=clean(message),scenario=mockScenario||this.inferScenario(text);
    if(scenario==='createPlan')return {text:'요청한 계획을 만들 준비가 됐어. 저장 전 확인이 필요해.',toolCalls:[{tool:'createPlan',args:{title:'GARANG AI 계획',type:'workout'}}],usage:{provider:'mock',tokens:0}};
    if(scenario==='updateGoal')return {text:'목표 변경안을 준비했어. 확인하면 프로필 목표에 반영할게.',toolCalls:[{tool:'updateGoal',args:{goal:'근력 향상'}}],usage:{provider:'mock',tokens:0}};
    if(scenario==='saveMemory')return {text:'기억 후보를 만들었어. 확인하면 장기기억에 저장할게.',toolCalls:[{tool:'saveMemory',args:{type:'note',value:text,importance:3,confidence:.9,userConfirmed:true}}],usage:{provider:'mock',tokens:0}};
    return {text:'Mock AI 응답이야. 실제 LLM adapter로 교체해도 같은 GARANG AI 계약을 사용해.',toolCalls:[],usage:{provider:'mock',tokens:0}};
  }
  inferScenario(text){
    if(/기억해|저장해|remember/i.test(text))return 'saveMemory';
    if(/목표.*(?:바꿔|변경|설정)|(?:바꿔|변경).*목표/i.test(text))return 'updateGoal';
    if(/계획|플랜|일정|루틴/i.test(text)&&/만들|추가|짜/i.test(text))return 'createPlan';
    return 'none';
  }
}
module.exports={MockAIAdapter};
