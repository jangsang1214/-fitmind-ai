'use strict';

const {PRODUCTION_PROJECT_ID,coachEndpoint,validateStagingProjectId}=require('./firebase-staging-preflight.cjs');

const projectId=validateStagingProjectId(process.env.GARANG_FIREBASE_STAGING_PROJECT_ID);
const expected=coachEndpoint(projectId);
const configured=String(process.env.GARANG_COACH_ENDPOINT||'').trim();

if(projectId===PRODUCTION_PROJECT_ID)throw new Error('Refusing staging smoke against production Firebase project.');
if(configured&&configured!==expected)throw new Error(`GARANG_COACH_ENDPOINT must exactly match the staging Coach endpoint: ${expected}`);

process.env.GARANG_COACH_ENDPOINT=expected;
require('./verify-production-coach.cjs');
