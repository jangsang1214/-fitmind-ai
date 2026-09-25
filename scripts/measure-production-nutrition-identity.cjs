'use strict';

const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');

if(!getApps().length)initializeApp({projectId:process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'fitfind-ai'});
const db=getFirestore();

const DAY=24*60*60*1000;
const now=Date.now();
const ms=value=>{const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0;};
const recent=(value,days)=>{const t=ms(value);return t>0&&t>=now-days*DAY;};
const inc=(obj,key,n=1)=>{const k=String(key||'unknown');obj[k]=(obj[k]||0)+n;};
const pct=(a,b)=>b>0?Math.round((a/b)*1000)/10:null;

(async()=>{
 const snap=await db.collectionGroup('app').get();
 let stateDocs=0,usersWithAnalyticsConsent=0,usersWithIdentity=0,usersWithMappings=0,usersWithMisses=0,usersWithCorrections=0;
 let mappings=0,mappingUseSum=0,misses=0,corrections=0,mealItems=0,itemsWithBarcode=0,itemsWithReportNo=0,identityMealItems=0;
 let mappings7=0,mappings30=0,misses7=0,misses30=0,corrections7=0,corrections30=0,identityItems7=0,identityItems30=0;
 const missesByKind={},missesByReason={},sources={};
 for(const doc of snap.docs){
   if(doc.id!=='state')continue;
   stateDocs++;
   const s=doc.data()||{},fi=s.foodIdentity&&typeof s.foodIdentity==='object'?s.foodIdentity:{};
   if(s?.privacy?.consent?.analytics===true)usersWithAnalyticsConsent++;
   const bs=Array.isArray(fi.barcodes)?fi.barcodes:[],mi=Array.isArray(fi.misses)?fi.misses:[],co=Array.isArray(fi.corrections)?fi.corrections:[];
   if(bs.length||mi.length||co.length)usersWithIdentity++;
   if(bs.length)usersWithMappings++;if(mi.length)usersWithMisses++;if(co.length)usersWithCorrections++;
   mappings+=bs.length;misses+=mi.length;corrections+=co.length;
   for(const b of bs){
     mappingUseSum+=Math.max(1,Number(b?.uses)||1);
     const at=b?.lastUsedAt||b?.confirmedAt;
     if(recent(at,7))mappings7++;
     if(recent(at,30))mappings30++;
   }
   for(const m of mi){
     inc(missesByKind,m?.kind);inc(missesByReason,m?.reason);
     if(recent(m?.at,7))misses7++;if(recent(m?.at,30))misses30++;
   }
   for(const x of co){
     if(recent(x?.at,7))corrections7++;if(recent(x?.at,30))corrections30++;
   }
   const meals=Array.isArray(s.meals)?s.meals:[];
   for(const meal of meals){
     const mealAt=meal?.updatedAt||meal?.createdAt||(meal?.date?String(meal.date)+'T00:00:00Z':'');
     for(const item of Array.isArray(meal?.items)?meal.items:[]){
       mealItems++;
       const barcode=String(item?.barcode||item?.scanEvidence?.barcode||'').trim();
       const reportNo=String(item?.reportNo||item?.scanEvidence?.reportNo||'').trim();
       const source=String(item?.scanEvidence?.source||item?.nutritionSource?.source||'').trim();
       if(barcode)itemsWithBarcode++;
       if(reportNo)itemsWithReportNo++;
       if(barcode||reportNo||/barcode|label/i.test(source)){
         identityMealItems++;inc(sources,source||'identity-unspecified');
         if(recent(mealAt,7))identityItems7++;
         if(recent(mealAt,30))identityItems30++;
       }
     }
   }
 }
 const searchMisses=missesByKind.search||0,barcodeMisses=missesByKind.barcode||0;
 const telemetrySnap=await db.collectionGroup('telemetry').get();
 const telemetryEventNames={};let telemetryDocs=0,telemetryAnalyticsDocs=0,telemetryErrorDocs=0,telemetryEvents=0;
 for(const doc of telemetrySnap.docs){const row=doc.data()||{};telemetryDocs++;if(row.kind==='analytics'){telemetryAnalyticsDocs++;for(const ev of Array.isArray(row.events)?row.events:[]){telemetryEvents++;inc(telemetryEventNames,ev?.name);}}else if(row.kind==='error')telemetryErrorDocs++;}
 const metrics={
   observedAt:new Date().toISOString(),
   scope:'aggregate production Firestore state only; no user IDs, GTINs, product names, or raw records emitted',
   stateDocs,
   analytics:{usersWithConsent:usersWithAnalyticsConsent,telemetryDocs,telemetryAnalyticsDocs,telemetryErrorDocs,telemetryEvents,canonicalEventNames:telemetryEventNames},
   adoption:{usersWithIdentity,usersWithMappings,usersWithMisses,usersWithCorrections},
   cumulative:{
     confirmedBarcodeMappings:mappings,
     barcodeMappingUseSum:mappingUseSum,
     misses,
     missesByKind,
     missesByReason,
     corrections,
     mealItems,
     identityMealItems,
     itemsWithBarcode,
     itemsWithReportNo,
     identitySources:sources
   },
   recent7d:{confirmedOrReusedMappings:mappings7,misses:misses7,corrections:corrections7,identityMealItems:identityItems7},
   recent30d:{confirmedOrReusedMappings:mappings30,misses:misses30,corrections:corrections30,identityMealItems:identityItems30},
   derived:{
     searchMissToManualCorrectionProxyPct:pct(corrections,searchMisses),
     barcodeMappingVsMissProxyPct:pct(mappings,mappings+barcodeMisses),
     identityMealItemSharePct:pct(identityMealItems,mealItems),
     exactAttemptMissRatePct:null,
     mismatchRatePct:null,
     note:'Exact attempt miss rate and mismatch rate cannot be computed from current persisted state because total attempt and mismatch-denominator events are not stored.'
   }
 };
 console.log('GARANG_NUTRITION_IDENTITY_METRICS='+JSON.stringify(metrics));
 console.log(JSON.stringify(metrics,null,2));
})().catch(error=>{console.error('GARANG_NUTRITION_IDENTITY_MEASURE_FAILED',error?.code||error?.message||error);process.exit(1);});
