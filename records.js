/* Persistence-independent CRUD: a server adapter can replace this repository. */
(function(root){
 'use strict';
 root.GarangRecords={create(getState){
  const G=root.GarangSchema,categories=new Set(['goals','preferences','workout','nutrition','lifestyle','body','planner','coaching','notes']);
  return {
   MemoryService:{list:()=>getState().memory.entries,save(data,id){if(typeof data.text!=='string'||!data.text.trim()||!categories.has(data.category))throw new Error('INVALID_MEMORY');const old=this.list().find(x=>x.id===id);if(id&&!old)throw new Error('NOT_FOUND');const item={...old,...data,id:id||G.id(),text:data.text.trim().slice(0,10000),updatedAt:new Date().toISOString()};if(old)Object.assign(old,item);else this.list().push(item);return item;},remove(id){getState().memory.entries=this.list().filter(x=>x.id!==id);}},
   PlannerService:{save(data,id){if(typeof data.title!=='string'||!data.title.trim()||!G.validDate(data.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time))throw new Error('INVALID_PLAN');const rows=getState().planner,old=rows.find(x=>x.id===id);if(id&&!old)throw new Error('NOT_FOUND');const item={...old,...data,id:id||G.id(),title:data.title.trim().slice(0,500),done:old?.done||false,createdAt:old?.createdAt||Date.now()};if(old)Object.assign(old,item);else rows.push(item);return item;},remove(id){getState().planner=getState().planner.filter(x=>x.id!==id);},toggle(id){const x=getState().planner.find(x=>x.id===id);if(!x)throw new Error('NOT_FOUND');x.done=!x.done;}}
  };
 }};
})(typeof window==='undefined'?globalThis:window);
