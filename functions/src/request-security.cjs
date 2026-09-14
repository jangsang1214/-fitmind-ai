'use strict';

const DEFAULT_ORIGINS=Object.freeze(['https://jangsang1214.github.io','http://localhost:8765','http://127.0.0.1:8765']);
function parseAllowedOrigins(value=process.env.GARANG_ALLOWED_ORIGINS||''){
 const configured=String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
 return new Set([...DEFAULT_ORIGINS,...configured.filter(origin=>/^https:\/\//i.test(origin)||/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin))]);
}
function securityMiddleware({allowedOrigins=parseAllowedOrigins()}={}){
 return function garangSecurity(request,response,next){
  const origin=request.get?.('origin')||request.headers?.origin||'';
  if(origin&&allowedOrigins.has(origin)){
   response.set('Access-Control-Allow-Origin',origin);
   response.set('Vary','Origin');
   response.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-Trace-Id, Idempotency-Key');
   response.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  }
  response.set('Cache-Control','no-store');
  response.set('X-Content-Type-Options','nosniff');
  response.set('Referrer-Policy','no-referrer');
  response.set('X-Frame-Options','DENY');
  if(String(request.method||'').toUpperCase()==='OPTIONS')return origin&&allowedOrigins.has(origin)?response.status(204).end():response.status(403).end();
  if(origin&&!allowedOrigins.has(origin))return response.status(403).json({ok:false,error:{code:'ORIGIN_NOT_ALLOWED'}});
  next();
 };
}
module.exports={DEFAULT_ORIGINS,parseAllowedOrigins,securityMiddleware};
