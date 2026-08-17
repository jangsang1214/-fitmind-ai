const fs=require('fs'), vm=require('vm');
function run(file, setup={}){
  const storage={};
  const doc={readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},createElement(){return {}}};
  const ctx={console,document:doc,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v)},window:null,CustomEvent:function(){},fetch:()=>Promise.reject(new Error('not called in unit test')),URL,File:function(){},navigator:{}};
  ctx.window=ctx;ctx.window.dispatchEvent=function(){};Object.assign(ctx,setup);vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});return ctx;
}
const core=run(__dirname+'/garang-v8.6-core.js');
core.GARANG_V86.clear();core.GARANG_V86.addExercise({id:1,name:'벤치프레스'});core.GARANG_V86.addSet(1,80,8);core.GARANG_V86.addSet(1,80,7);core.GARANG_V86.addExercise({id:2,name:'인클라인 덤벨 벤치프레스'});core.GARANG_V86.addSet(2,30,10);
const s=core.GARANG_V86.summary();if(s.exercises.length!==2||s.totalSets!==3||s.totalVolume!==1500)throw new Error('core data flow failed');
const integ=run(__dirname+'/garang-v8.6-integrated.js');
integ.GARANGV86.addExercise({exercise_id:'1',exercise_name:'벤치프레스',primary_muscle:'가슴',equipment:'바벨'});integ.GARANGV86.addSet('1');
integ.GARANGV86.addSet('1');const si=integ.GARANGV86.summary();if(si.exercises.length!==1||si.totalSets!==2)throw new Error('integrated session failed');
console.log('PASS core multi-exercise/sets/volume');
console.log('PASS integrated UI data model');
