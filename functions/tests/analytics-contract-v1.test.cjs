'use strict';
const assert=require('node:assert/strict');
const Browser=require('../../07_config/analytics-contract-v1.json');
const Server=require('../src/analytics-contract-v1.cjs');

assert.equal(Server.version,Browser.version);
assert.deepEqual(Server.canonicalEvents,Browser.canonicalEvents,'Functions analytics allowlist must match browser frozen contract');
assert.deepEqual(Server.legacyEventMapping,Browser.legacyEventMapping,'Functions legacy analytics mappings must match browser frozen contract');
console.log('functions analytics-contract-v1: PASS');
