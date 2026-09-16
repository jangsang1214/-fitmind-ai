'use strict';

const DEFAULT_ORIGINS=Object.freeze(['https://jangsang1214.github.io','https://garang-wanted-2026-jangsang1214.vercel.app','http://localhost:8765','http://127.0.0.1:8765']);
const LOOPBACK_ORIGIN=/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;
function parseAllowedOrigins(value=process.env.GARANG_ALLOWED_ORIGINS||''){
 const configured=String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
 return new Set([...DEFAULT_ORIGINS,...configured.filter(origin=>/^https:\/\//i.test(origin)||LOOPBACK_ORIGIN.test(origin))]);
}
function securityMiddleware({allowedOrigins=parseAllowedOrigins()}={}){
 return function garangSecurity(request,response,next){
  const origin=request.get?.('origin')||request.headers?.origin||'';
  const originAllowed=!!origin&&(allowedOrigins.has(origin)||LOOPBACK_ORIGIN.test(origin));
  if(originAllowed){
   response.set('Access-Control-Allow-Origin',origin);
   response.set('Vary','Origin');
   response.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-Trace-Id, Idempotency-Key');
   response.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  }
  response.set('Cache-Control','no-store');
  response.set('X-Content-Type-Options','nosniff');
  response.set('Referrer-Policy','no-referrer');
  response.set('X-Frame-Options','DENY');
  if(String(request.method||'').toUpperCase()==='OPTIONS')return originAllowed?response.status(204).end():response.status(403).end();
  if(origin&&!originAllowed)return response.status(403).json({ok:false,error:{code:'ORIGIN_NOT_ALLOWED'}});
  next();
 };
}
module.exports={DEFAULT_ORIGINS,LOOPBACK_ORIGIN,parseAllowedOrigins,securityMiddleware};
