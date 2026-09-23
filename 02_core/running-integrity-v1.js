(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangRunningIntegrity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='running-integrity-v1';
const MAX_ACCURACY_M=50;
const MAX_SPEED_MPS=12.5;
const MIN_STEP_M=2;
const rad=Math.PI/180;

function finite(v){return Number.isFinite(Number(v));}
function haversineKm(a,b,c,d){
  const da=(c-a)*rad,db=(d-b)*rad,x=Math.sin(da/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(db/2)**2;
  return 2*6371*Math.asin(Math.sqrt(x));
}
function normalizePoint(point={}){
  return {
    latitude:Number(point.latitude),
    longitude:Number(point.longitude),
    timestamp:Number(point.timestamp),
    elapsedMs:Number(point.elapsedMs),
    accuracy:Number(point.accuracy)
  };
}
function assessPosition(previous,raw,limits={}){
  const point=normalizePoint(raw),maxAccuracy=Number(limits.maxAccuracyM||MAX_ACCURACY_M),maxSpeed=Number(limits.maxSpeedMps||MAX_SPEED_MPS),minStep=Number(limits.minStepM||MIN_STEP_M);
  if(!finite(point.latitude)||!finite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180)return {accepted:false,reason:'INVALID_COORDINATE',point};
  if(!finite(point.accuracy)||point.accuracy<0||point.accuracy>maxAccuracy)return {accepted:false,reason:'LOW_ACCURACY',point};
  if(!previous)return {accepted:true,reason:'FIRST_FIX',point,segmentKm:0,speedMps:0};
  const prev=normalizePoint(previous),segmentKm=haversineKm(prev.latitude,prev.longitude,point.latitude,point.longitude),segmentM=segmentKm*1000;
  const dtMs=(finite(point.elapsedMs)&&finite(prev.elapsedMs))?point.elapsedMs-prev.elapsedMs:point.timestamp-prev.timestamp;
  if(!finite(dtMs)||dtMs<=0)return {accepted:false,reason:'NON_MONOTONIC_TIME',point,segmentKm};
  const speedMps=segmentM/(dtMs/1000);
  if(speedMps>maxSpeed)return {accepted:false,reason:'IMPLAUSIBLE_SPEED',point,segmentKm,speedMps};
  if(segmentM<minStep)return {accepted:false,ignored:true,reason:'GPS_JITTER',point,segmentKm,speedMps};
  return {accepted:true,reason:'OK',point,segmentKm,speedMps};
}
function tuplePoint(tuple){
  if(!Array.isArray(tuple))return null;
  return {latitude:Number(tuple[0]),longitude:Number(tuple[1]),timestamp:Number(tuple[2]),elapsedMs:Number(tuple[3]),accuracy:Number(tuple[4])};
}
function buildSplits(coords=[]){
  const points=coords.map(tuplePoint).filter(Boolean);
  if(points.length<2)return [];
  const out=[];let cumulative=0,nextKm=1,splitStartElapsed=Number.isFinite(points[0].elapsedMs)?points[0].elapsedMs:0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],segment=haversineKm(a.latitude,a.longitude,b.latitude,b.longitude);
    if(!Number.isFinite(segment)||segment<=0)continue;
    const before=cumulative,after=before+segment;
    while(after+1e-9>=nextKm){
      const ratio=Math.max(0,Math.min(1,(nextKm-before)/segment));
      const aElapsed=Number.isFinite(a.elapsedMs)?a.elapsedMs:a.timestamp-points[0].timestamp;
      const bElapsed=Number.isFinite(b.elapsedMs)?b.elapsedMs:b.timestamp-points[0].timestamp;
      const crossingElapsed=aElapsed+(bElapsed-aElapsed)*ratio;
      const durationMs=Math.max(1,crossingElapsed-splitStartElapsed);
      out.push({km:nextKm,durationMin:durationMs/60000,paceMinPerKm:durationMs/60000});
      splitStartElapsed=crossingElapsed;nextKm++;
    }
    cumulative=after;
  }
  return out;
}
return Object.freeze({VERSION,MAX_ACCURACY_M,MAX_SPEED_MPS,MIN_STEP_M,haversineKm,assessPosition,buildSplits});
});