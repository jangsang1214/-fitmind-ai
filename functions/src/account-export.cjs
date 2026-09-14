'use strict';
const {bearer}=require('./account-security.cjs');

function createAccountExportHandler({verifyIdToken,readExport}){
 if(typeof verifyIdToken!=='function'||typeof readExport!=='function')throw new Error('ACCOUNT_EXPORT_DEPENDENCIES_REQUIRED');
 return async function accountExport(request,response){
  try{
   const token=bearer(request.headers?.authorization);const decoded=await verifyIdToken(token);const uid=String(decoded?.uid||'').trim();
   if(!uid)return response.status(401).json({ok:false,error:{code:'AUTH_REQUIRED'}});
   const data=await readExport(uid);
   return response.status(200).json({ok:true,data});
  }catch(error){
   const status=Number(error?.status)||(/AUTH|TOKEN|CREDENTIAL/i.test(String(error?.code||error?.message||''))?401:500);
   return response.status(status).json({ok:false,error:{code:status===401?'AUTH_REQUIRED':'ACCOUNT_EXPORT_FAILED',message:status===401?'Authentication required.':'Account export failed.'}});
  }
 };
}
module.exports={createAccountExportHandler};
