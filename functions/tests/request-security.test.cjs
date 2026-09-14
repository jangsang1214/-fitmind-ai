'use strict';
const assert=require('node:assert/strict');
const {parseAllowedOrigins,securityMiddleware}=require('../src/request-security.cjs');

const origins=parseAllowedOrigins('https://staging.garang.example,http://evil.example');
assert.equal(origins.has('https://jangsang1214.github.io'),true);
assert.equal(origins.has('https://staging.garang.example'),true);
assert.equal(origins.has('http://evil.example'),false);

function response(){return {statusCode:0,headers:{},body:null,set(k,v){this.headers[k]=v;return this;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){this.ended=true;return this;}};}
let nextCalled=false;const middleware=securityMiddleware({allowedOrigins:origins});
const ok=response();middleware({method:'GET',headers:{origin:'https://staging.garang.example'},get:key=>key==='origin'?'https://staging.garang.example':''},ok,()=>{nextCalled=true;});
assert.equal(nextCalled,true);assert.equal(ok.headers['Access-Control-Allow-Origin'],'https://staging.garang.example');assert.equal(ok.headers['X-Frame-Options'],'DENY');
const blocked=response();middleware({method:'GET',headers:{origin:'https://evil.example'},get:key=>key==='origin'?'https://evil.example':''},blocked,()=>{});assert.equal(blocked.statusCode,403);assert.equal(blocked.body.error.code,'ORIGIN_NOT_ALLOWED');
console.log('request-security: PASS');
