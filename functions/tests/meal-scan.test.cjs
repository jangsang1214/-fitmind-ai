'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseMealImage,validateMealScan,validateLabelScan,createMealScanProvider,createMealScanHandler,MEAL_SCAN_SCHEMA,LABEL_SCAN_SCHEMA}=require('../src/meal-scan.cjs');

const image={mediaType:'image/jpeg',dataUrl:'data:image/jpeg;base64,aGVsbG8='};
assert.equal(parseMealImage(image).mediaType,'image/jpeg');
assert.throws(()=>parseMealImage({...image,mediaType:'image/heic'}),e=>e?.code==='MEAL_SCAN_IMAGE_TYPE_UNSUPPORTED');
assert.deepEqual(validateMealScan({items:[{name:'흰쌀밥',aliases:['밥'],grams:180,confidence:.86,portionConfidence:.72}],overallConfidence:.82,uncertain:false,notes:''}).items[0],{name:'흰쌀밥',aliases:['밥'],grams:180,confidence:.86,portionConfidence:.72});
assert.equal(JSON.stringify(MEAL_SCAN_SCHEMA).includes('kcal'),false,'Vision schema must not own nutrition values');
assert.equal(JSON.stringify(MEAL_SCAN_SCHEMA).includes('protein'),false,'Vision schema must not own nutrition values');
assert.ok(MEAL_SCAN_SCHEMA.properties.items.items.properties.portionConfidence,'Vision schema must expose separate portion confidence');
assert.equal(MEAL_SCAN_SCHEMA.properties.items.minItems,0,'Vision schema must allow an explicit no-food result instead of forcing fabrication');
assert.throws(()=>validateMealScan({items:[],overallConfidence:0,uncertain:true,notes:'not food'}),e=>e?.code==='MEAL_SCAN_NO_FOOD_DETECTED');
assert.ok(LABEL_SCAN_SCHEMA.properties.nutritionConfidence,'Label schema must expose nutrition-reading confidence');
assert.ok(LABEL_SCAN_SCHEMA.properties.barcode,'Label schema must expose optional printed barcode');
assert.ok(LABEL_SCAN_SCHEMA.properties.reportNo,'Label schema must expose optional printed report number');
assert.deepEqual(validateLabelScan({productName:'프로틴 바',brand:'GARANG',barcode:'012345678905',reportNo:'2024-0417-36623',servingGrams:55,calories:210,protein:20,carbs:24,fat:6,confidence:.94,nutritionConfidence:.91,uncertain:false,notes:''}),{productName:'프로틴 바',brand:'GARANG',barcode:'00012345678905',reportNo:'2024041736623',servingGrams:55,calories:210,protein:20,carbs:24,fat:6,confidence:.94,nutritionConfidence:.91,uncertain:false,notes:''});
assert.equal(validateLabelScan({productName:'프로틴 바',brand:'',barcode:'1234',reportNo:'',servingGrams:55,calories:210,protein:20,carbs:24,fat:6,confidence:.94,nutritionConfidence:.91,uncertain:false,notes:''}).uncertain,true);

(async()=>{
 let request;
 const provider=createMealScanProvider({apiKey:'secret',fetchImpl:async(_url,init)=>{request=JSON.parse(init.body);return {ok:true,json:async()=>({id:'meal-response',output:[{content:[{text:JSON.stringify({items:[{name:'닭가슴살',aliases:['chicken breast'],grams:140,confidence:.9,portionConfidence:.74}],overallConfidence:.88,uncertain:false,notes:'visible portion'})}]}]})};}});
 const result=await provider.scan({image,language:'ko',requestId:'meal-1'});
 assert.equal(result.items[0].name,'닭가슴살');
 assert.equal(result.items[0].portionConfidence,.74);
 assert.equal(request.store,false);
 assert.equal(request.input[1].content.some(x=>x.type==='input_image'&&x.image_url===image.dataUrl),true);
 assert.match(request.input[0].content[0].text,/Do not calculate calories/);

 let labelRequest;
 const labelProvider=createMealScanProvider({apiKey:'secret',fetchImpl:async(_url,init)=>{labelRequest=JSON.parse(init.body);return {ok:true,json:async()=>({id:'label-response',output:[{content:[{text:JSON.stringify({productName:'프로틴 바',brand:'GARANG',barcode:'012345678905',reportNo:'2024-0417-36623',servingGrams:55,calories:210,protein:20,carbs:24,fat:6,confidence:.94,nutritionConfidence:.91,uncertain:false,notes:'printed serving'})}]}]})};}});
 const labelResult=await labelProvider.scan({image,language:'ko',requestId:'label-1',mode:'label'});
 assert.equal(labelResult.mode,'label');assert.equal(labelResult.label.productName,'프로틴 바');assert.equal(labelResult.label.protein,20);assert.equal(labelResult.label.barcode,'00012345678905');assert.equal(labelResult.label.reportNo,'2024041736623');
 assert.match(labelRequest.input[0].content[0].text,/Read only nutrition facts and identity fields visibly printed/);
 assert.equal(labelRequest.text.format.name,'garang_nutrition_label_scan');

 let captured=null,rateRoute=null;
 const handler=createMealScanHandler({
  verifyIdToken:async()=>({uid:'user-1'}),
  consumeRateLimit:async(_uid,meta)=>{rateRoute=meta.route;return {allowed:true};},
  providerFactory:()=>({scan:async input=>{captured=input;return {items:[{name:'흰쌀밥',aliases:['밥'],grams:180,confidence:.8,portionConfidence:.65}],overallConfidence:.8,uncertain:false,notes:'',provider:'mock',model:'mock-vision'};}}),
  getProviderConfig:()=>({provider:'mock'})
 });
 const response={statusCode:200,payload:null,headers:{},status(code){this.statusCode=code;return this;},json(value){this.payload=value;return this;},set(k,v){this.headers[k]=v;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer token'},body:{image,language:'ko'},get(){return null;}},response);
 assert.equal(response.statusCode,200);
 assert.equal(response.payload.ok,true);
 assert.equal(response.payload.items[0].name,'흰쌀밥');
 assert.equal(response.payload.items[0].portionConfidence,.65);
 assert.equal(captured.image.dataUrl,image.dataUrl);
 assert.equal(rateRoute,'meal_scan');

 let labelCaptured=null,labelRateRoute=null;
 const labelHandler=createMealScanHandler({
  verifyIdToken:async()=>({uid:'user-1'}),
  consumeRateLimit:async(_uid,meta)=>{labelRateRoute=meta.route;return {allowed:true};},
  providerFactory:()=>({scan:async input=>{labelCaptured=input;return {mode:'label',label:{productName:'프로틴 바',brand:'GARANG',barcode:'00012345678905',reportNo:'2024041736623',servingGrams:55,calories:210,protein:20,carbs:24,fat:6,confidence:.94,nutritionConfidence:.91,uncertain:false,notes:''},provider:'mock',model:'mock-vision'};}}),
  getProviderConfig:()=>({provider:'mock'})
 });
 const labelResponse={statusCode:200,payload:null,headers:{},status(code){this.statusCode=code;return this;},json(value){this.payload=value;return this;},set(k,v){this.headers[k]=v;return this;}};
 await labelHandler({method:'POST',headers:{authorization:'Bearer token'},body:{image,language:'ko',mode:'label'},get(){return null;}},labelResponse);
 assert.equal(labelResponse.statusCode,200);assert.equal(labelResponse.payload.data.mode,'label');assert.equal(labelResponse.payload.label.calories,210);
 assert.equal(labelCaptured.mode,'label');assert.equal(labelRateRoute,'nutrition_label_scan');

 const unauth={statusCode:200,payload:null,status(code){this.statusCode=code;return this;},json(value){this.payload=value;return this;}};
 await handler({method:'POST',headers:{},body:{image}},unauth);
 assert.equal(unauth.statusCode,401);
 console.log('Meal Scan vision boundary: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
