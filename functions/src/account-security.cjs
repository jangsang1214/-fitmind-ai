'use strict';
function httpError(status,code,message=code){const e=new Error(message);e.status=status;e.code=code;return e;}
function bearer(header){const m=String(header||'').match(/^Bearer\s+(.+)$/i);if(!m)throw httpError(401,'AUTH_REQUIRED','Bearer token required.');return m[1];}
function requireFresh(decoded,nowSeconds=Math.floor(Date.now()/1000),maxAgeSeconds=300){const authTime=Number(decoded?.auth_time)||0;if(!decoded?.uid)throw httpError(401,'AUTH_REQUIRED');if(!authTime||nowSeconds-authTime<0||nowSeconds-authTime>maxAgeSeconds)throw httpError(401,'RECENT_LOGIN_REQUIRED','Recent authentication required.');return decoded;}
function createDeleteAccountHandler({verifyIdToken,deleteUserData,deleteAuthUser,nowSeconds=()=>Math.floor(Date.now()/1000)}){
 return async function deleteAccount(request,response){
  try{
   const token=bearer(request.headers?.authorization);const decoded=requireFresh(await verifyIdToken(token),nowSeconds());
   await deleteUserData(decoded.uid);await deleteAuthUser(decoded.uid);
   return response.status(200).json({ok:true,deleted:true});
  }catch(error){const status=Number(error?.status)||500,code=error?.code||'ACCOUNT_DELETE_FAILED';return response.status(status).json({ok:false,error:{code,message:status>=500?'Account deletion failed.':String(error.message||code)}});}
 };
}
module.exports={bearer,requireFresh,createDeleteAccountHandler};
