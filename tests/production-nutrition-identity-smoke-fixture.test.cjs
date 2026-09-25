'use strict';
const assert=require('node:assert/strict');
const {TEST_EAN13,TEST_GTIN14,validGtin,ean13Bits,barcodePng}=require('../scripts/verify-production-nutrition-identity.cjs');

assert.equal(TEST_EAN13,'4006381333931');
assert.equal(TEST_GTIN14,'04006381333931');
assert.equal(validGtin(TEST_EAN13),true);
assert.equal(validGtin('4006381333932'),false);
const bits=ean13Bits(TEST_EAN13);
assert.equal(bits.length,95);assert.equal(bits.slice(0,3),'101');assert.equal(bits.slice(-3),'101');
const png=barcodePng(TEST_EAN13);
assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
assert.ok(png.length>1000);
console.log('production-nutrition-identity-smoke-fixture: PASS');
