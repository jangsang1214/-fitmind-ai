'use strict';
const assert=require('node:assert/strict');
const {
 parseInput,collectCitationUrls,normalizeLookupItems,createNutritionLookupProvider,createNutritionLookupHandler,WEB_NUTRITION_SCHEMA
}=require('../src/nutrition-web-lookup.cjs');

assert.deepEqual(parseInput([{name:'아메리카노',grams:355}])[0],{name:'아메리카노',aliases:[],grams:355});
assert.equal(WEB_NUTRITION_SCHEMA.properties.items.maxItems,6);

const citedPayload={output:[{type:'web_search_call',action:{sources:[{url:'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171890/nutrients'}]}},{type:'message',content:[{type:'output_text',text:'{}',annotations:[{type:'url_citation',url:'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171890/nutrients',title:'USDA'}]}]}]};
const citations=collectCitationUrls(citedPayload);assert.ok(citations.length>=1);
const normalized=normalizeLookupItems({items:[{inputIndex:0,matchedName:'아메리카노',kcal:4,protein:.2,carbs:.6,fat:0,confidence:.82,sourceUrl:'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171890/nutrients',sourceTitle:'USDA FoodData Central',sourceType:'government',basisNote:'355g black coffee equivalent'}]},[{name:'아메리카노',aliases:['Americano'],grams:355}],citations);
assert.equal(normalized.items.length,1);assert.equal(normalized.items[0].nutritionStatus,'estimated_web');assert.equal(normalized.unresolved.length,0);
const uncited=normalizeLookupItems({items:[{inputIndex:0,matchedName:'아메리카노',kcal:4,protein:.2,carbs:.6,fat:0,confidence:.9,sourceUrl:'https://example.com/nutrition',sourceTitle:'Example',sourceType:'manufacturer',basisNote:'serving'}]},[{name:'아메리카노',grams:355}],citations);
assert.equal(uncited.items.length,0);assert.equal(uncited.unresolved[0].reason,'UNVERIFIED_WEB_RESULT');

(async()=>{
 let request=null;
 const provider=createNutritionLookupProvider({apiKey:'secret',fetchImpl:async(_url,init)=>{
  request=JSON.parse(init.body);
  const result={items:[{inputIndex:0,matchedName:'아메리카노',kcal:5,protein:.3,carbs:.7,fat:0,confidence:.78,sourceUrl:'https://www.starbucks.com/menu/product/406/hot/nutrition',sourceTitle:'Starbucks Americano nutrition',sourceType:'manufacturer',basisNote:'Grande serving scaled to requested amount'}]};
  return {ok:true,json:async()=>({id:'nutrition-search-1',output:[
   {type:'web_search_call',action:{sources:[{url:'https://www.starbucks.com/menu/product/406/hot/nutrition'}]}},
   {type:'message',content:[{type:'output_text',text:JSON.stringify(result),annotations:[{type:'url_citation',url:'https://www.starbucks.com/menu/product/406/hot/nutrition',title:'Starbucks Americano nutrition'}]}]}
  ]})};
 }});
 const result=await provider.lookup({items:[{name:'아메리카노',aliases:['Americano'],grams:355}],language:'ko',requestId:'lookup-1'});
 assert.equal(result.items.length,1);assert.equal(result.items[0].nutritionSource.source,'web_search');
 assert.equal(request.store,false);assert.equal(request.tool_choice,'required');assert.equal(request.tools[0].type,'web_search');assert.equal(request.tools[0].external_web_access,true);
 assert.match(request.input[0].content[0].text,/Never use blogs/);

 let route=null;
 const handler=createNutritionLookupHandler({
  verifyIdToken:async()=>({uid:'u1'}),
  consumeRateLimit:async(_uid,meta)=>{route=meta.route;return {allowed:true};},
  providerFactory:()=>({lookup:async()=>({items:result.items,unresolved:[],provider:'mock',model:'mock',citationCount:1})}),
  getProviderConfig:()=>({})
 });
 const response={statusCode:200,payload:null,headers:{},status(code){this.statusCode=code;return this;},json(v){this.payload=v;return this;},set(k,v){this.headers[k]=v;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer token'},body:{items:[{name:'아메리카노',grams:355}],language:'ko'}},response);
 assert.equal(response.statusCode,200);assert.equal(response.payload.items[0].nutritionStatus,'estimated_web');assert.equal(route,'nutrition_lookup');

 const unauth={statusCode:200,payload:null,status(code){this.statusCode=code;return this;},json(v){this.payload=v;return this;}};
 await handler({method:'POST',headers:{},body:{items:[{name:'아메리카노'}]}},unauth);assert.equal(unauth.statusCode,401);
 console.log('Nutrition web lookup fallback: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
