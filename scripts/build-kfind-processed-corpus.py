#!/usr/bin/env python3
import argparse,json,re,unicodedata,zipfile,xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

VERSION='garang-kfind-processed-corpus-v1'
SOURCE_URL='https://various.foodsafetykorea.go.kr/nutrient/general/down/historyList.do'
DATASET='K-FIND 가공식품 DB 2026-08-28'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
CHOSEONG=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

def clean(v):
    s=str(v or '').replace('\ufeff','').replace('\u200b','').strip()
    return unicodedata.normalize('NFKC',s)
def finite(v):
    s=clean(v).replace(',','')
    if not s or s in {'-','trace','Tr','미량'}: return None
    try:return float(s)
    except:return None
def compact(v):return re.sub(r'[\s·_\-()\[\]{},./\\:+]+','',clean(v).lower())
def strip_corp(v):
    s=clean(v)
    s=re.sub(r'^\(?주\)?\s*','',s);s=re.sub(r'^주식회사\s*','',s);s=re.sub(r'\s*\(?주\)?$','',s);s=re.sub(r'\s*주식회사$','',s)
    return re.sub(r'\s+',' ',s).strip()
def col_index(ref):
    m=re.match(r'([A-Z]+)',ref); letters=m.group(1) if m else 'A'; n=0
    for ch in letters:n=n*26+ord(ch)-64
    return n-1
def read_shared(z):
    if 'xl/sharedStrings.xml' not in z.namelist():return []
    root=ET.fromstring(z.read('xl/sharedStrings.xml'));return [''.join(t.text or '' for t in si.findall('.//m:t',NS)) for si in root.findall('m:si',NS)]
def iter_rows(xlsx):
    with zipfile.ZipFile(xlsx) as z:
        shared=read_shared(z)
        with z.open('xl/worksheets/sheet1.xml') as fh:
            for _,elem in ET.iterparse(fh,events=('end',)):
                if not elem.tag.endswith('}row'):continue
                vals={}
                for cell in list(elem):
                    if not cell.tag.endswith('}c'):continue
                    idx=col_index(cell.attrib.get('r','A1'));typ=cell.attrib.get('t');val=''
                    if typ=='inlineStr':val=''.join(t.text or '' for t in cell.findall('.//m:t',NS))
                    else:
                        v=cell.find('m:v',NS)
                        if v is not None and v.text is not None:val=shared[int(v.text)] if typ=='s' else v.text
                    vals[idx]=val
                width=max(vals.keys(),default=-1)+1;yield [vals.get(i,'') for i in range(width)];elem.clear()
def basis(text):
    s=clean(text).lower().replace(' ','');m=re.search(r'(\d+(?:\.\d+)?)\s*(g|ml)',s)
    return (float(m.group(1)),m.group(2)) if m else (None,None)
def bucket_of(value):
    s=compact(value)
    if not s:return '*'
    ch=s[0];code=ord(ch)
    if 0xAC00<=code<=0xD7A3:return CHOSEONG[(code-0xAC00)//588]
    if ch.isascii() and ch.isalpha():return ch.upper()
    if ch.isdigit():return '#'
    return '*'
def safe_bucket(bucket):
    if bucket=='*':return 'other'
    if bucket=='#':return 'digit'
    if len(bucket)==1 and bucket.isascii() and bucket.isalpha():return 'latin-'+bucket.lower()
    return 'ko-'+bucket.encode().hex()
def brand_of(row):
    vals=[row.get('제조사명'),row.get('수입업체명'),row.get('유통업체명')]
    vals=[strip_corp(v) for v in vals if clean(v) and clean(v)!='해당없음']
    return vals[0] if vals else None
def aliases(row,name,brand):
    vals=[name,name.replace('_',' '),name.replace('_',''),clean(row.get('대표식품명'))]
    if brand:vals += [brand+' '+name,brand+name]
    out=[]
    for v in vals:
        v=clean(v)
        if v and v not in out:out.append(v)
    return out[:8]
def build_record(row):
    code=clean(row.get('식품코드'));name=clean(row.get('식품명'));b,u=basis(row.get('영양성분함량기준량'))
    if not code or not name or u!='g' or not b:return None
    core={
      'kcal':finite(row.get('에너지(kcal)')),'protein':finite(row.get('단백질(g)')),'carbs':finite(row.get('탄수화물(g)')),'fat':finite(row.get('지방(g)')),
      'sugar':finite(row.get('당류(g)')),'fiber':finite(row.get('식이섬유(g)')),'sodium':finite(row.get('나트륨(mg)')),'cholesterol':finite(row.get('콜레스테롤(mg)')),
      'saturated_fat':finite(row.get('포화지방산(g)')),'trans_fat':finite(row.get('트랜스지방산(g)'))}
    if any(core[k] is None for k in ['kcal','protein','carbs','fat']):return None
    brand=brand_of(row);report_no=clean(row.get('품목제조보고번호')) or None
    return {
      'food_id':'kfind-processed:'+code,'name':name,'product_name':name,'brand':brand,'category':clean(row.get('식품대분류명')) or '가공식품','subcategory':clean(row.get('식품중분류명')) or None,
      'serving':clean(row.get('1회 섭취참고량')) or clean(row.get('식품중량')) or None,'basis_g':b,'basis_unit':'g',**core,'aliases':aliases(row,name,brand),
      'nutrition_status':'verified','source':'식품영양성분 데이터베이스','nutrition_basis_g':b,'report_no':report_no,
      'provenance':{'provider':'식품의약품안전처 K-FIND','dataset':DATASET,'recordId':code,'url':SOURCE_URL,'sourceDate':clean(row.get('데이터생성일자')) or '2026-08-28','retrievedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'label':'식품영양성분 데이터베이스'}
    }
def rank(rec):
    return (1 if rec.get('brand') else 0,1 if rec.get('report_no') else 0,sum(rec.get(k) is not None for k in ['sugar','fiber','sodium','cholesterol','saturated_fat','trans_fat']),rec.get('provenance',{}).get('sourceDate',''),rec.get('food_id',''))
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--output-dir',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--meta',required=True);a=ap.parse_args()
    rows=iter_rows(a.input);header=next(rows);raw=0;invalid=0;non_g=0;incomplete=0;by_key={};duplicate=0
    for vals in rows:
        raw+=1;row={header[i]:vals[i] if i<len(vals) else '' for i in range(len(header))}
        b,u=basis(row.get('영양성분함량기준량'))
        if u!='g':non_g+=1
        rec=build_record(row)
        if not clean(row.get('식품코드')) or not clean(row.get('식품명')):invalid+=1
        if rec is None:
            if u=='g':incomplete+=1
            continue
        key=compact((rec.get('brand') or '')+' '+rec['name']) or compact(rec['name'])
        prev=by_key.get(key)
        if prev is None:by_key[key]=rec
        else:
            duplicate+=1
            if rank(rec)>rank(prev):by_key[key]=rec
    records=sorted(by_key.values(),key=lambda r:(bucket_of(r.get('brand') or r['name']),compact(r.get('brand') or ''),compact(r['name']),r['food_id']))
    out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True);buckets=defaultdict(list)
    for rec in records:
        # index the same product under brand and product initial when they differ
        keys={bucket_of(rec['name'])}
        if rec.get('brand'):keys.add(bucket_of(rec['brand']))
        for key in keys:buckets[key].append(rec)
    shards={}
    for bucket,items in buckets.items():
        fn=safe_bucket(bucket)+'.json';(out/fn).write_text(json.dumps({'version':VERSION,'bucket':bucket,'count':len(items),'records':items},ensure_ascii=False,separators=(',',':'))+'\n')
        shards[bucket]={'file':fn,'count':len(items)}
    now=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    manifest={'version':VERSION,'generatedAt':now,'status':'ready','purpose':'K-FIND processed-food brand/product supplemental corpus','precedence':['GARANG canonical Korean DB','K-FIND Korean food supplemental','K-FIND processed-food supplemental','USDA supplemental','source-backed web lookup'],'rawCount':raw,'count':len(records),'shards':shards}
    brand_count=sum(1 for r in records if r.get('brand'));report_count=sum(1 for r in records if r.get('report_no'))
    meta={'version':VERSION,'status':'ready','rawRows':raw,'records':len(records),'brandRows':brand_count,'brandRate':brand_count/len(records) if records else 0,'reportNoRows':report_count,'reportNoRate':report_count/len(records) if records else 0,'duplicateBrandProductRows':duplicate,'excludedNonGramRows':non_g,'incompleteCoreRows':incomplete,'invalidRows':invalid,'shardCount':len(shards),'source':{'provider':'식품의약품안전처 K-FIND','dataset':DATASET,'url':SOURCE_URL},'guardrails':{'verifiedOnly':True,'gramBasisOnlyForAutomaticCalculation':True,'traceableProvenanceRequired':True,'deterministicAliasesOnly':True,'noAutomaticCanonicalOverwrite':True}}
    Path(a.manifest).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');Path(a.meta).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print(json.dumps(meta,ensure_ascii=False,indent=2))
    if len(records)<100000:raise SystemExit('K-FIND processed corpus unexpectedly small: '+str(len(records))

if __name__=='__main__':main()
