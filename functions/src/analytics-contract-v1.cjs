'use strict';

/* Deployable Functions copy of the frozen garang-analytics-v1 allowlist.
   Parity with 07_config/analytics-contract-v1.json is enforced in tests. */
module.exports=Object.freeze({
 version:'garang-analytics-v1',
 canonicalEvents:Object.freeze({
  signup_completed:{stage:'activation',allowedProperties:[]},
  onboarding_completed:{stage:'activation',allowedProperties:[]},
  record_created:{stage:'activation',allowedProperties:['recordType','source']},
  first_record_created:{stage:'activation',allowedProperties:['recordType','source']},
  today_viewed:{stage:'engagement',allowedProperties:['source']},
  coach_opened:{stage:'engagement',allowedProperties:['source']},
  coach_recommendation_shown:{stage:'intelligence',allowedProperties:['provider','source','episodeId','decisionId','decisionMode','recommendationId','policyVersion']},
  coach_recommendation_resolved:{stage:'intelligence',allowedProperties:['source','episodeId','decisionId','recommendationId','policyVersion','resolution']},
  daily_plan_applied:{stage:'activation',allowedProperties:['source','episodeId','decisionId','recommendationId','policyVersion']},
  planned_action_started:{stage:'execution',allowedProperties:['actionType','source','episodeId','recommendationId']},
  planned_action_completed:{stage:'execution',allowedProperties:['actionType','source','episodeId','recommendationId']},
  accumulation_viewed:{stage:'retention',allowedProperties:['source']}
 }),
 legacyEventMapping:Object.freeze({
  workout_saved:{canonical:'record_created',recordType:'workout'},
  meal_saved:{canonical:'record_created',recordType:'nutrition'},
  run_saved:{canonical:'record_created',recordType:'running'},
  inbody_saved:{canonical:'record_created',recordType:'body'},
  ai_chat_answered:{canonical:'coach_recommendation_shown'},
  ai_plan_applied:{canonical:'daily_plan_applied'},
  planner_completed:{canonical:'planned_action_completed'},
  'screen_viewed:today':{canonical:'today_viewed'},
  'screen_viewed:coach':{canonical:'coach_opened'},
  'screen_viewed:progress':{canonical:'accumulation_viewed'}
 })
});
