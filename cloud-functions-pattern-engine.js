exports.buildPatterns = async function(db) {
  const snap = await db.collection("globalLearningEvents").limit(5000).get();
  const groups = new Map();
  snap.forEach(doc => {
    const e = doc.data();
    const key = [e.eventType||"unknown",e.context?.goal||"unknown",e.context?.experience||"unknown"].join("|");
    const g = groups.get(key) || {key,eventType:e.eventType||"unknown",goal:e.context?.goal||"unknown",experience:e.context?.experience||"unknown",count:0,success:0,failure:0};
    g.count++;
    if(e.outcome?.status==="success")g.success++;
    if(e.outcome?.status==="failure")g.failure++;
    groups.set(key,g);
  });
  const batch=db.batch();
  for(const g of groups.values()){
    if(g.count<10)continue;
    const confidence=(g.success+1)/(g.success+g.failure+2);
    const ref=db.collection("globalPatterns").doc(g.key.replace(/[^a-zA-Z0-9_-]/g,"_"));
    batch.set(ref,{...g,confidence,updatedAt:new Date()},{merge:true});
  }
  await batch.commit();
};
