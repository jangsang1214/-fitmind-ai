
// GARANG V8.6 data-flow test
// Verifies multi-exercise, set/weight/reps, volume and certification summary.
const fs=require("fs"), vm=require("vm");
const code=fs.readFileSync(__dirname+"/garang-v8.6-core.js","utf8");
const storage={};
const ctx={
  console,
  localStorage:{
    getItem:k=>storage[k]||null,
    setItem:(k,v)=>storage[k]=v
  },
  CustomEvent:function(name,opts){return {name,detail:opts&&opts.detail}},
  window:null,
  document:{querySelector:()=>null}
};
ctx.window=ctx;
ctx.window.dispatchEvent=function(){};
vm.createContext(ctx);
vm.runInContext(code,ctx);

ctx.GARANG_V86.clear();
ctx.GARANG_V86.addExercise({id:1,name:"벤치프레스"});
ctx.GARANG_V86.addSet(1,80,8);
ctx.GARANG_V86.addSet(1,80,7);
ctx.GARANG_V86.addExercise({id:2,name:"인클라인 덤벨 벤치프레스"});
ctx.GARANG_V86.addSet(2,30,10);

const s=ctx.GARANG_V86.summary();
if(s.exercises.length!==2) throw new Error("multi-exercise failed");
if(s.totalSets!==3) throw new Error("set count failed");
if(s.totalVolume!==1500) throw new Error("volume calculation failed: "+s.totalVolume);
console.log("PASS: V8.6 workout data flow", JSON.stringify(s));
