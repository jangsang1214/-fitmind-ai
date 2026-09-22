'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseMealImage,validateMealScan,createMealScanProvider,createMealScanHandler,MEAL_SCAN_SCHEMA}=require('../src/meal-scan.cjs');

const image={mediaType:'image/jpeg',dataUrl:'data:image/jpeg;base64,aGVsbG8='};
assert.equal(parseMealImage(image).mediaType,'image/jpeg');
assert.throws(()=>parseMealImage({...image,mediaType:'image/heic'}),e=>e?.code==='MEAL_SCAN_IMAGE_TYPE_UNSUPPORTED');
assert.deepEqual(validateMealScan({items:[{name:'흰쌀밥',aliases:['밥'],grams:180,confidence:.86}],overallConfidence:.82,uncertain:false,notes:''}).items[0],{name:'흰쌀밥',aliases:['밥'],grams:180,confidence:.86});
assert.equal(JSON.stringify(MEAL_SCAN_SCHEMA).includes('kcal'),false,'Vision schema must not own nutrition values');
assert.equal(JSON.stringify(MEAL_SCAN_SCHEMA).includes('protein'),false,'Vision schema must not own nutrition values');
assert.equal(MEAL_SCAN_SCHEMA.properties.items.minItems,0,'Vision schema must allow an explicit no-food result instead of forcing fabrication');
assert.throws(()=>validateMealScan({items:[],overallConfidence:0,uncertain:true,notes:'not food'}),e=>e?.code==='MEAL_SCAN_NO_FOOD_DETECTED');

(async()=>{
 let request;
 const provider=createMealScanProvider({apiKey:'secret',fetchImpl:async(_url,init)=>{request=JSON.parse(init.body);return {ok:true,json:async()=>({id:'meal-response',output:[{content:[{text:JSON.stringify({items:[{name:'닭가슴살',aliases:['chicken breast'],grams:140,confidence:.9}],overallConfidence:.88,uncertain:false,notes:'visible portion'})}]}]})};}});
 const result=await provider.scan({image,language:'ko',requestId:'meal-1'});
 assert.equal(result.items[0].name,'닭가슴살');
 assert.equal(request.store,false);
 assert.equal(request.input[1].content.some(x=>x.type==='input_image'&&x.image_url===image.dataUrl),true);
 assert.match(request.input[0].content[0].text,/Do not calculate calories/);

 let captured=null,rateRoute=null;
 const handler=createMealScanHandler({
  verifyIdToken:async()=>({uid:'user-1'}),
  consumeRateLimit:async(_uid,meta)=>{rateRoute=meta.route;return {allowed:true};},
  providerFactory:()=>({scan:async input=>{captured=input;return {items:[{name:'흰쌀밥',aliases:['밥'],grams:180,confidence:.8}],overallConfidence:.8,uncertain:false,notes:'',provider:'mock',model:'mock-vision'};}}),
  getProviderConfig:()=>({provider:'mock'})
 });
 const response={statusCode:200,payload:null,headers:{},status(code){this.statusCode=code;return this;},json(value){this.payload=value;return this;},set(k,v){this.headers[k]=v;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer token'},body:{image,language:'ko'},get(){return null;}},response);
 assert.equal(response.statusCode,200);
 assert.equal(response.payload.ok,true);
 assert.equal(response.payload.items[0].name,'흰쌀밥');
 assert.equal(captured.image.dataUrl,image.dataUrl);
 assert.equal(rateRoute,'meal_scan');

 const unauth={statusCode:200,payload:null,status(code){this.statusCode=code;return this;},json(value){this.payload=value;return this;}};
 await handler({method:'POST',headers:{},body:{image}},unauth);
 assert.equal(unauth.statusCode,401);
 console.log('Meal Scan vision boundary: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
