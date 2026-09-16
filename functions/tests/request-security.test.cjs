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
let loopbackNext=false;const loopback=response();middleware({method:'POST',headers:{origin:'http://127.0.0.1:8786'},get:key=>key==='origin'?'http://127.0.0.1:8786':''},loopback,()=>{loopbackNext=true;});assert.equal(loopbackNext,true);assert.equal(loopback.headers['Access-Control-Allow-Origin'],'http://127.0.0.1:8786');
const preflight=response();middleware({method:'OPTIONS',headers:{origin:'http://localhost:9999'},get:key=>key==='origin'?'http://localhost:9999':''},preflight,()=>{});assert.equal(preflight.statusCode,204);assert.equal(preflight.headers['Access-Control-Allow-Origin'],'http://localhost:9999');
const blocked=response();middleware({method:'GET',headers:{origin:'https://evil.example'},get:key=>key==='origin'?'https://evil.example':''},blocked,()=>{});assert.equal(blocked.statusCode,403);assert.equal(blocked.body.error.code,'ORIGIN_NOT_ALLOWED');
console.log('request-security: PASS');
