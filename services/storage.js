(function(root){
 'use strict';
 root.GarangStorage={create(storage,key,notify=()=>{}){
  let blocked=false;
  return {
   read(){try{const raw=storage.getItem(key);if(!raw)return root.GarangSchema.empty();try{const parsed=JSON.parse(raw);const result=root.GarangSchema.migrate(parsed);if(parsed.schemaVersion!==root.GarangSchema.VERSION)storage.setItem(key+'.pre-migration',raw);return result;}catch(e){storage.setItem(key+'.corrupt.'+Date.now(),raw);blocked=true;notify(e.message==='FUTURE_SCHEMA'?'FUTURE_SCHEMA':'CORRUPT');return root.GarangSchema.empty();}}catch{blocked=true;notify('STORAGE_UNAVAILABLE');return root.GarangSchema.empty();}},
   write(s){if(blocked){notify('RESTORE_REQUIRED');return false;}try{const value=JSON.stringify(s);storage.setItem(key,value);return true;}catch{notify('STORAGE_UNAVAILABLE');return false;}},
   backup(){const raw=storage.getItem(key);if(raw)storage.setItem(key+'.backup',raw);},
   import(x){const next=root.GarangSchema.validateImport(x);this.backup();storage.setItem(key,JSON.stringify(next));blocked=false;return next;},
   restore(){const raw=storage.getItem(key+'.backup');if(!raw)throw new Error('NO_BACKUP');const next=root.GarangSchema.validateImport(JSON.parse(raw));storage.setItem(key,JSON.stringify(next));blocked=false;return next;},
   reset(){this.backup();const next=root.GarangSchema.empty();storage.setItem(key,JSON.stringify(next));blocked=false;return next;}
  };
 }};
})(typeof window==='undefined'?globalThis:window);
