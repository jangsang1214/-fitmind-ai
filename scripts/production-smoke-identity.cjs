'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const mode=String(process.argv[2]||'').trim();
const config=fs.readFileSync('07_config/firebase-config.js','utf8');
const apiKey=config.match(/apiKey:\s*"([^"]+)"/)?.[1];
if(!apiKey)throw new Error('FIREBASE_WEB_API_KEY_NOT_FOUND');
async function mint(){
 const email=`garang.meal.scan.smoke.${process.env.GITHUB_RUN_ID||'local'}.${crypto.randomUUID()}@example.com`,password=`Gg!${crypto.randomBytes(18).toString('hex')}Aa1`;
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})}),body=await response.json().catch(()=>({}));
 if(!response.ok||!body.idToken)throw new Error(`FIREBASE_SMOKE_SIGNUP_FAILED:${body?.error?.message||response.status}`);
 console.log(`::add-mask::${body.idToken}`);if(body.refreshToken)console.log(`::add-mask::${body.refreshToken}`);
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`GARANG_FIREBASE_ID_TOKEN=${body.idToken}\nGARANG_FIREBASE_WEB_API_KEY=${apiKey}\n`);
 else console.log(JSON.stringify({idToken:body.idToken,apiKey}));
}
async function remove(){
 const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim(),key=String(process.env.GARANG_FIREBASE_WEB_API_KEY||apiKey).trim();if(!token)return;
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
 if(!response.ok)throw new Error(`FIREBASE_SMOKE_DELETE_FAILED:${response.status}`);console.log('Disposable Firebase smoke identity deleted.');
}
(mode==='mint'?mint():mode==='delete'?remove():Promise.reject(new Error('MODE_REQUIRED'))).catch(error=>{console.error(error?.message||error);process.exit(1);});
