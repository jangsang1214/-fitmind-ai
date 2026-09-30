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
  coach_recommendation_shown:{stage:'intelligence',allowedProperties:['provider','source']},
  daily_plan_applied:{stage:'activation',allowedProperties:['source']},
  planned_action_started:{stage:'execution',allowedProperties:['actionType','source']},
  planned_action_completed:{stage:'execution',allowedProperties:['actionType','source']},
  accumulation_viewed:{stage:'retention',allowedProperties:['source']},
  meal_reminder_configured:{stage:'activation',allowedProperties:['enabledCount','timezoneMode','source']},
  meal_reminder_shown:{stage:'activation',allowedProperties:['mealType','preferredTime','localDate','source']},
  meal_reminder_opened:{stage:'activation',allowedProperties:['mealType','preferredTime','localDate','source']},
  meal_scan_started_from_reminder:{stage:'activation',allowedProperties:['mealType','preferredTime','localDate','source']},
  meal_scan_confirmed:{stage:'activation',allowedProperties:['itemCount','source']},
  meal_review_viewed:{stage:'engagement',allowedProperties:['mealId','proteinState','source']},
  next_meal_recommendation_shown:{stage:'intelligence',allowedProperties:['recommendationId','optionId','direction','source']},
  next_meal_recommendation_accepted:{stage:'execution',allowedProperties:['recommendationId','optionId','direction','source']},
  next_meal_recommendation_modified:{stage:'execution',allowedProperties:['recommendationId','optionId','source']},
  next_meal_recommendation_dismissed:{stage:'engagement',allowedProperties:['recommendationId','optionId','direction','source']},
  next_meal_recorded:{stage:'execution',allowedProperties:['recommendationId','optionId','mealId','source']}
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
