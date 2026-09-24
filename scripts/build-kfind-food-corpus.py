#!/usr/bin/env python3
import argparse, json, re, unicodedata, zipfile, xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

VERSION='garang-kfind-food-corpus-v1'
SOURCE_URL='https://various.foodsafetykorea.go.kr/nutrient/general/down/historyList.do'
DATASET='K-FIND 음식 DB 2026-08-28'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
CHOSEONG=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

def clean(v): return str(v or '').strip()
def compact(v):
    s=unicodedata.normalize('NFKC',clean(v)).lower()
    return re.sub(r'[\s·_\-()\[\]{},./\\:+]+','',s)
def finite(v):
    s=clean(v).replace(',','')
    if not s or s in {'-', 'trace', 'Tr', '미량'}: return None
    try: return float(s)
    except: return None
def col_index(ref):
    letters=re.match(r'([A-Z]+)',ref).group(1); n=0
    for ch in letters: n=n*26+ord(ch)-64
    return n-1
def bucket_of(value):
    s=compact(value)
    if not s: return '*'
    ch=s[0]; code=ord(ch)
    if 0xAC00<=code<=0xD7A3: return CHOSEONG[(code-0xAC00)//588]
    if ch.isascii() and ch.isalpha(): return ch.upper()
    if ch.isdigit(): return '#'
    return '*'
def safe_bucket(bucket):
    if bucket=='*': return 'other'
    if bucket=='#': return 'digit'
    if len(bucket)==1 and bucket.isascii() and bucket.isalpha(): return 'latin-'+bucket.lower()
    return 'ko-'+bucket.encode().hex()
def read_shared(z):
    if 'xl/sharedStrings.xml' not in z.namelist(): return []
    root=ET.fromstring(z.read('xl/sharedStrings.xml')); out=[]
    for si in root.findall('m:si',NS): out.append(''.join(t.text or '' for t in si.findall('.//m:t',NS)))
    return out
def iter_rows(xlsx):
    with zipfile.ZipFile(xlsx) as z:
        shared=read_shared(z)
        with z.open('xl/worksheets/sheet1.xml') as fh:
            for event,elem in ET.iterparse(fh,events=('end',)):
                if not elem.tag.endswith('}row'): continue
                vals={}
                for cell in list(elem):
                    if not cell.tag.endswith('}c'): continue
                    ref=cell.attrib.get('r','A1'); idx=col_index(ref); typ=cell.attrib.get('t')
                    val=''
                    if typ=='inlineStr':
                        val=''.join(t.text or '' for t in cell.findall('.//m:t',NS))
                    else:
                        v=cell.find('m:v',NS)
                        if v is not None and v.text is not None:
                            val=shared[int(v.text)] if typ=='s' else v.text
                    vals[idx]=val
                width=max(vals.keys(),default=-1)+1
                yield [vals.get(i,'') for i in range(width)]
                elem.clear()
def basis(text):
    s=clean(text).lower().replace(' ','')
    m=re.search(r'(\d+(?:\.\d+)?)\s*(g|ml)',s)
    if not m: return None,None
    return float(m.group(1)),m.group(2)
def rank(row):
    method=clean(row.get('데이터생성방법명')); origin=clean(row.get('식품기원명')); basis_value,basis_unit=basis(row.get('영양성분함량기준량'))
    method_score=5 if '분석' in method else 3 if '산출' in method else 1
    origin_score=5 if '가정식' in origin else 4 if '외식' in origin else 3 if '산업체' in origin else 2 if '급식' in origin else 1
    unit_score=4 if basis_unit=='g' else 0
    complete=sum(finite(row.get(k)) is not None for k in ['에너지(kcal)','단백질(g)','탄수화물(g)','지방(g)','당류(g)','식이섬유(g)','나트륨(mg)'])
    date=re.sub(r'\D','',clean(row.get('데이터생성일자')))[:8]
    return (unit_score,method_score,origin_score,complete,date,clean(row.get('식품코드')))
def aliases(row):
    name=clean(row.get('식품명')); rep=clean(row.get('대표식품명')); origin=clean(row.get('식품기원명')); out=[]
    for v in [name,name.replace('_',' '),name.replace('_',''),rep,rep.replace(' ',''), (name+' '+origin.split('(')[0].strip()) if origin else '']:
        v=clean(v)
        if v and v not in out: out.append(v)
    return out
def build_record(row,variant_count,variant_origins):
    b,u=basis(row.get('영양성분함량기준량')); code=clean(row.get('식품코드')); name=clean(row.get('식품명'))
    if u!='g' or not b: return None
    nutrients={
      'kcal':finite(row.get('에너지(kcal)')),'protein':finite(row.get('단백질(g)')),'carbs':finite(row.get('탄수화물(g)')),'fat':finite(row.get('지방(g)')),
      'sugar':finite(row.get('당류(g)')),'fiber':finite(row.get('식이섬유(g)')),'sodium':finite(row.get('나트륨(mg)')),'cholesterol':finite(row.get('콜레스테롤(mg)')),
      'saturated_fat':finite(row.get('포화지방산(g)')),'trans_fat':finite(row.get('트랜스지방산(g)'))}
    if any(nutrients[k] is None for k in ['kcal','protein','carbs','fat']): return None
    return {
      'food_id':'kfind-food:'+code,'name':name,'name_en':None,'product_name':clean(row.get('대표식품명')) or name,
      'category':clean(row.get('식품대분류명')) or clean(row.get('식품중분류명')) or '음식',
      'subcategory':clean(row.get('식품중분류명')) or None,'origin':clean(row.get('식품기원명')) or None,
      'serving':clean(row.get('식품중량')) or clean(row.get('1인(회)분량 참고량')) or None,'basis_g':b,'basis_unit':'g',
      **nutrients,'aliases':aliases(row),'nutrition_status':'verified','source':'식품영양성분 데이터베이스',
      'nutrition_basis_g':b,'variant_count':variant_count,'variant_origins':variant_origins[:12],
      'provenance':{'provider':'식품의약품안전처 K-FIND','dataset':DATASET,'recordId':code,'url':SOURCE_URL,'sourceDate':clean(row.get('데이터생성일자')) or '2026-08-28','retrievedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'label':'식품영양성분 데이터베이스'}
    }
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--input',required=True); ap.add_argument('--output-dir',required=True); ap.add_argument('--manifest',required=True); ap.add_argument('--meta',required=True); a=ap.parse_args()
    rows=iter_rows(a.input); header=next(rows); groups=defaultdict(list); raw_count=0; excluded_non_g=0; invalid=0
    for values in rows:
        raw_count+=1; row={header[i]:values[i] if i<len(values) else '' for i in range(len(header))}; name=clean(row.get('식품명')); code=clean(row.get('식품코드'))
        if not name or not code: invalid+=1; continue
        b,u=basis(row.get('영양성분함량기준량'))
        if u!='g': excluded_non_g+=1
        groups[compact(name)].append(row)
    records=[]; duplicate_groups=0; preferred_g_groups=0
    for key,variants in groups.items():
        if len(variants)>1: duplicate_groups+=1
        g_variants=[r for r in variants if basis(r.get('영양성분함량기준량'))[1]=='g']
        if g_variants: preferred_g_groups+=1; candidates=g_variants
        else: continue
        best=max(candidates,key=rank); origins=sorted({clean(v.get('식품기원명')) for v in variants if clean(v.get('식품기원명'))})
        rec=build_record(best,len(variants),origins)
        if rec: records.append(rec)
    records.sort(key=lambda r:(compact(r['name']),r['food_id']))
    out_dir=Path(a.output_dir); out_dir.mkdir(parents=True,exist_ok=True); buckets=defaultdict(list)
    for rec in records: buckets[bucket_of(rec['name'])].append(rec)
    shards={}
    for bucket,items in buckets.items():
        filename=safe_bucket(bucket)+'.json'; (out_dir/filename).write_text(json.dumps({'version':VERSION,'bucket':bucket,'count':len(items),'records':items},ensure_ascii=False,separators=(',',':'))+'\n')
        shards[bucket]={'file':filename,'count':len(items)}
    manifest={'version':VERSION,'generatedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'status':'ready','purpose':'K-FIND Korean food supplemental lookup corpus; curated GARANG canonical remains primary','precedence':['GARANG canonical Korean DB','K-FIND Korean food supplemental','USDA supplemental','source-backed web lookup'],'rawCount':raw_count,'count':len(records),'shards':shards}
    meta={'version':VERSION,'status':'ready','rawRows':raw_count,'uniqueNormalizedNames':len(groups),'duplicateNameGroups':duplicate_groups,'records':len(records),'excludedNonGramRows':excluded_non_g,'invalidRows':invalid,'preferredGramGroups':preferred_g_groups,'shardCount':len(shards),'source':{'provider':'식품의약품안전처 K-FIND','dataset':DATASET,'url':SOURCE_URL},'guardrails':{'canonicalPrimary':True,'verifiedOnly':True,'gramBasisOnlyForAutomaticCalculation':True,'traceableProvenanceRequired':True,'representativeSelection':'gram basis > analyzed > calculated > household/restaurant > foodservice > completeness > recency','noAutomaticCanonicalOverwrite':True}}
    Path(a.manifest).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'); Path(a.meta).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(meta,ensure_ascii=False,indent=2))
    if len(records)<1000: raise SystemExit('K-FIND representative corpus unexpectedly small: '+str(len(records)))

if __name__=='__main__': main()
