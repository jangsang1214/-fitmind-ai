'use strict';

const fs=require('node:fs');
const path=require('node:path');

const PRODUCTION_PROJECT_ID='fitfind-ai';
const REGION='asia-northeast3';
const PROJECT_ID_PATTERN=/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

function validateStagingProjectId(value){
  const projectId=String(value||'').trim();
  if(!projectId)throw new Error('GARANG_FIREBASE_STAGING_PROJECT_ID is required.');
  if(projectId===PRODUCTION_PROJECT_ID)throw new Error('Refusing staging operation against production Firebase project fitfind-ai.');
  if(!PROJECT_ID_PATTERN.test(projectId))throw new Error('GARANG_FIREBASE_STAGING_PROJECT_ID must be a valid Google Cloud/Firebase project ID.');
  return projectId;
}

function coachEndpoint(projectId){
  const safe=validateStagingProjectId(projectId);
  return `https://${REGION}-${safe}.cloudfunctions.net/api/coach`;
}

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}

function inspectRepository(root=path.resolve(__dirname,'..')){
  const firebase=readJson(path.join(root,'firebase.json'));
  const firebaserc=readJson(path.join(root,'.firebaserc'));
  const functionsIndex=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
  const gitignore=fs.readFileSync(path.join(root,'.gitignore'),'utf8');
  const functionConfig=Array.isArray(firebase.functions)?firebase.functions[0]:firebase.functions;
  if(functionConfig?.source!=='functions')throw new Error('Firebase functions source must remain functions/.');
  if(functionConfig?.runtime!=='nodejs22')throw new Error('Firebase staging gate requires nodejs22 to match the verified runtime.');
  if(firebaserc?.projects?.default!==PRODUCTION_PROJECT_ID)throw new Error('Unexpected Firebase default project; review project ownership before staging work.');
  if(!functionsIndex.includes("defineSecret('GARANG_LLM_API_KEY')"))throw new Error('GARANG_LLM_API_KEY Secret Manager binding is missing.');
  if(!functionsIndex.includes("region:'asia-northeast3'"))throw new Error('Cloud Functions region drifted from asia-northeast3.');
  if(!gitignore.split(/\r?\n/).includes('.env.*'))throw new Error('Project-specific .env files must remain ignored.');
  return {runtime:functionConfig.runtime,source:functionConfig.source,productionProjectId:PRODUCTION_PROJECT_ID,region:REGION,secret:'GARANG_LLM_API_KEY'};
}

function buildPlan(projectId){
  const safe=validateStagingProjectId(projectId),endpoint=coachEndpoint(safe);
  return {
    status:'READY_FOR_EXTERNAL_STAGING_SETUP',
    stagingProjectId:safe,
    productionProjectId:PRODUCTION_PROJECT_ID,
    region:REGION,
    coachEndpoint:endpoint,
    commands:{
      setSecret:`npx firebase-tools functions:secrets:set GARANG_LLM_API_KEY --project ${safe}`,
      deployFunction:`npx firebase-tools deploy --only functions:api --project ${safe}`,
      deployFirestore:`npx firebase-tools deploy --only firestore:rules,firestore:indexes --project ${safe}`,
      smoke:`GARANG_FIREBASE_STAGING_PROJECT_ID=${safe} GARANG_FIREBASE_ID_TOKEN=<STAGING_ID_TOKEN> npm run smoke:coach:staging`
    }
  };
}

if(require.main===module){
  try{
    inspectRepository();
    console.log(JSON.stringify(buildPlan(process.env.GARANG_FIREBASE_STAGING_PROJECT_ID),null,2));
  }catch(error){
    console.error(`Firebase staging preflight: FAIL ${error?.message||error}`);
    process.exit(1);
  }
}

module.exports={PRODUCTION_PROJECT_ID,REGION,validateStagingProjectId,coachEndpoint,inspectRepository,buildPlan};
