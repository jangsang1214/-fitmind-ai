'use strict';
const assert=require('node:assert/strict'),zlib=require('node:zlib');

const mealEndpoint=String(process.env.GARANG_MEAL_SCAN_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan').trim();
const lookupEndpoint=String(process.env.GARANG_NUTRITION_LOOKUP_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/nutrition/lookup').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
const TEST_EAN13='4006381333931';
const TEST_GTIN14='04006381333931';
const TEST_LOOKUP_GTIN14='00012345678905';
if(require.main===module){
 if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated production Nutrition Identity smoke verification.');
 if(!mealEndpoint.startsWith('https://')||!lookupEndpoint.startsWith('https://'))throw new Error('Production endpoints must use https.');
}

const L={
  0:'0001101',1:'0011001',2:'0010011',3:'0111101',4:'0100011',
  5:'0110001',6:'0101111',7:'0111011',8:'0110111',9:'0001011'
},G={
  0:'0100111',1:'0110011',2:'0011011',3:'0100001',4:'0011101',
  5:'0111001',6:'0000101',7:'0010001',8:'0001001',9:'0010111'
},R={
  0:'1110010',1:'1100110',2:'1101100',3:'1000010',4:'1011100',
  5:'1001110',6:'1010000',7:'1000100',8:'1001000',9:'1110100'
};
const PARITY=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const FONT={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],
 '3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
 '6':['111','100','111','101','111'],'7':['111','001','001','001','001'],'8':['111','101','111','101','111'],
 '9':['111','101','111','001','111']
};
function validGtin(value){
 const s=String(value||'').replace(/\D/g,'');if(![8,12,13,14].includes(s.length))return false;
 let sum=0,weight=3;for(let i=s.length-2;i>=0;i--){sum+=Number(s[i])*weight;weight=weight===3?1:3;}
 return ((10-(sum%10))%10)===Number(s.at(-1));
}
function ean13Bits(code){
 const s=String(code);if(s.length!==13||!validGtin(s))throw new Error('VALID_EAN13_REQUIRED');
 const parity=PARITY[Number(s[0])];let bits='101';
 for(let i=1;i<=6;i++)bits+=(parity[i-1]==='L'?L:G)[Number(s[i])];
 bits+='01010';
 for(let i=7;i<=12;i++)bits+=R[Number(s[i])];
 return bits+'101';
}
let crcTable=null;
function crc32(buf){
 if(!crcTable){crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0;}}
 let c=0xffffffff;for(const byte of buf)c=crcTable[(c^byte)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;
}
function chunk(type,data){
 const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));
 return Buffer.concat([len,t,data,crc]);
}
function barcodePng(code=TEST_EAN13){
 const bits=ean13Bits(code),modulePx=5,quiet=12,barTop=18,barHeight=150,digitScale=4,digitTop=178;
 const width=(bits.length+quiet*2)*modulePx,height=220,rowBytes=width*3,raw=Buffer.alloc((rowBytes+1)*height,255);
 for(let y=0;y<height;y++)raw[y*(rowBytes+1)]=0;
 function setPixel(x,y,black=true){if(x<0||y<0||x>=width||y>=height)return;const o=y*(rowBytes+1)+1+x*3,v=black?0:255;raw[o]=raw[o+1]=raw[o+2]=v;}
 for(let i=0;i<bits.length;i++)if(bits[i]==='1'){const x0=(quiet+i)*modulePx;for(let x=x0;x<x0+modulePx;x++)for(let y=barTop;y<barTop+barHeight;y++)setPixel(x,y);}
 const glyphWidth=3*digitScale,gap=2*digitScale,total=code.length*glyphWidth+(code.length-1)*gap,start=Math.floor((width-total)/2);
 for(let i=0;i<code.length;i++){
  const glyph=FONT[code[i]],x0=start+i*(glyphWidth+gap);
  for(let gy=0;gy<glyph.length;gy++)for(let gx=0;gx<glyph[gy].length;gx++)if(glyph[gy][gx]==='1'){
   for(let dx=0;dx<digitScale;dx++)for(let dy=0;dy<digitScale;dy++)setPixel(x0+gx*digitScale+dx,digitTop+gy*digitScale+dy);
  }
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
async function callJson(url,body){
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));return {response,payload};
}
async function run(){
 const png=barcodePng(),image={mediaType:'image/png',dataUrl:`data:image/png;base64,${png.toString('base64')}`};
 const barcode=await callJson(mealEndpoint,{image,language:'ko',mode:'barcode'});
 assert.equal(barcode.response.ok,true,`Barcode Vision failed HTTP ${barcode.response.status} code=${barcode.payload?.error?.code||'unknown'}`);
 const scan=barcode.payload?.barcode||barcode.payload?.data?.barcode||{};
 assert.equal(scan.barcode,TEST_GTIN14,`Barcode Vision mismatch expected ${TEST_GTIN14} got ${scan.barcode||'missing'}`);
 assert.equal(barcode.payload?.data?.mode,'barcode');assert.equal(barcode.payload?.data?.source,'vision');
 assert.ok(Number(scan.confidence)>=0&&Number(scan.confidence)<=1);

 const lookup=await callJson(lookupEndpoint,{items:[{name:'GARANG production GTIN identity smoke 012345678905',grams:100,barcode:TEST_LOOKUP_GTIN14}],language:'ko'});
 assert.equal(lookup.response.ok,true,`GTIN lookup failed HTTP ${lookup.response.status} code=${lookup.payload?.error?.code||'unknown'}`);
 const items=Array.isArray(lookup.payload?.items)?lookup.payload.items:[],unresolved=Array.isArray(lookup.payload?.unresolved)?lookup.payload.unresolved:[];
 if(items.length){
  assert.equal(items[0].barcode,TEST_LOOKUP_GTIN14,'resolved GTIN must preserve canonical barcode');
  assert.equal(items[0].nutritionSource?.matchRule,'barcode_source_backed','resolved GTIN must be explicitly source-backed');
  assert.ok(/^https:\/\//.test(String(items[0].nutritionSource?.url||'')),'resolved GTIN must expose source URL');
 }else{
  assert.ok(unresolved.some(row=>Number(row?.inputIndex)===0),'unknown GTIN must fail closed as unresolved');
 }
 console.log(JSON.stringify({
  status:'PASS',
  barcodeVision:{expected:TEST_GTIN14,read:scan.barcode,confidence:scan.confidence,uncertain:scan.uncertain===true},
  gtinLookup:{mode:items.length?'source_backed_exact':'fail_closed_unresolved',resolved:items.length,unresolved:unresolved.length}
 },null,2));
}
if(require.main===module)run().catch(error=>{console.error(`production Nutrition Identity smoke: FAIL ${error?.message||error}`);process.exit(1);});
module.exports={TEST_EAN13,TEST_GTIN14,validGtin,ean13Bits,barcodePng};
