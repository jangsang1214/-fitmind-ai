'use strict';

const {parseBearer,buildAgentContext,validLimit,validMemoryLimit}=require('./agent-context.cjs');

function json(response,status,body){
 response.set('Cache-Control','private, no-store');
 response.set('Vary','Authorization');
 return response.status(status).json(body);
}

function createAgentContextHandler({verifyIdToken,readUser,clock=()=>new Date()}){
 if(typeof verifyIdToken!=='function'||typeof readUser!=='function')throw new Error('INVALID_HANDLER_DEPENDENCY');
 return async function agentContext(request,response){
  if(request.method!=='GET'){
   response.set('Allow','GET');
   return json(response,405,{ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}});
  }
  const token=parseBearer(request.get?.('authorization')||request.headers?.authorization);
  if(!token)return json(response,401,{ok:false,error:{code:'UNAUTHENTICATED',message:'A valid Firebase ID token is required.'}});
  try{
   const decoded=await verifyIdToken(token);
   if(!decoded?.uid)throw new Error('INVALID_TOKEN');
   const state=await readUser(decoded.uid);
   const now=clock(),recordLimit=validLimit(request.query?.limit),memoryLimit=validMemoryLimit(request.query?.memoryLimit),query=String(request.query?.q||request.query?.query||'').slice(0,500);
   return json(response,200,{ok:true,data:{generatedAt:now.toISOString(),recordLimit,memoryLimit,context:buildAgentContext(state,{now,limit:recordLimit,memoryLimit,query})}});
  }catch(error){
   if(error?.code==='USER_DATA_READ_FAILED')return json(response,503,{ok:false,error:{code:'DATA_UNAVAILABLE',message:'User data is temporarily unavailable.'}});
   return json(response,401,{ok:false,error:{code:'UNAUTHENTICATED',message:'The Firebase ID token is invalid or expired.'}});
  }
 };
}

module.exports={createAgentContextHandler};
