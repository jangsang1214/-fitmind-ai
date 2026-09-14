'use strict';

const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const Staging=require('../scripts/firebase-staging-preflight.cjs');

const root=path.resolve(__dirname,'..');

assert.equal(Staging.validateStagingProjectId('garang-staging-01'),'garang-staging-01');
assert.throws(()=>Staging.validateStagingProjectId(''),/required/);
assert.throws(()=>Staging.validateStagingProjectId('fitfind-ai'),/Refusing staging operation against production/);
assert.throws(()=>Staging.validateStagingProjectId('BAD_PROJECT'),/valid Google Cloud\/Firebase project ID/);
assert.equal(Staging.coachEndpoint('garang-staging-01'),'https://asia-northeast3-garang-staging-01.cloudfunctions.net/api/coach');

const repo=Staging.inspectRepository(root);
assert.deepEqual(repo,{
  runtime:'nodejs22',
  source:'functions',
  productionProjectId:'fitfind-ai',
  region:'asia-northeast3',
  secret:'GARANG_LLM_API_KEY'
});

const plan=Staging.buildPlan('garang-staging-01');
assert.equal(plan.stagingProjectId,'garang-staging-01');
assert.equal(plan.productionProjectId,'fitfind-ai');
assert.match(plan.commands.setSecret,/--project garang-staging-01$/);
assert.match(plan.commands.deployFunction,/--project garang-staging-01$/);
assert.match(plan.commands.deployFirestore,/--project garang-staging-01$/);
assert.ok(!Object.values(plan.commands).some(value=>String(value).includes('--project fitfind-ai')),'staging commands must never target production');

const stagingSmoke=fs.readFileSync(path.join(root,'scripts','verify-staging-coach.cjs'),'utf8');
assert.match(stagingSmoke,/validateStagingProjectId/);
assert.match(stagingSmoke,/must exactly match the staging Coach endpoint/);
assert.match(stagingSmoke,/verify-production-coach\.cjs/);

console.log('firebase-staging-contract production isolation + staging preflight: PASS');
