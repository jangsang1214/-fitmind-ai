'use strict';

require('../../02_core/data-schema.js');
const Schema=globalThis.GarangSchema;
if(!Schema?.toTransport)throw new Error('GARANG_SCHEMA_UNAVAILABLE');

const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function canonicalTransport(stateInput={}){
 return clone(Schema.toTransport(object(stateInput)?stateInput:{}));
}

function normalizeForServer(stateInput={}){
 const raw=object(stateInput)?clone(stateInput):{},canonical=canonicalTransport(raw);
 return {
  ...raw,
  ...canonical,
  meta:object(raw.meta)?raw.meta:{},
  checkins:clone(canonical.dailyCheckins),
  aiChat:clone(canonical.aiChats),
  onboarding:clone(canonical.userModel),
  preferences:{...(object(raw.preferences)?raw.preferences:{}),language:canonical.language,unit:canonical.settings?.unit||'metric'}
 };
}

function contractSummary(stateInput={}){
 const canonical=canonicalTransport(stateInput);
 return {contractVersion:canonical.contractVersion,schemaVersion:canonical.schemaVersion,updatedAtMs:canonical.updatedAtMs};
}

module.exports={canonicalTransport,normalizeForServer,contractSummary,CONTRACT_VERSION:Schema.CONTRACT_VERSION,SCHEMA_VERSION:Schema.VERSION};
