/* GARANG V9.5 — External Data + Knowledge + Personal Memory Layer
   V9.5 goal: build the environment that can retrieve, normalize, cite and remember
   external knowledge/data without requiring a server LLM. V10 can attach a server LLM.
*/
(function(){
'use strict';
const KEY='garang_v95_knowledge_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const now=()=>new Date().toISOString();
const norm=s=>String(s||'').trim().replace(/\s+/g,' ');
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&typeof x==='object'?x:{knowledge:[],sources:[],connectors:[],photoEvents:[],feedback:[],updatedAt:null}}catch{return{knowledge:[],sources:[],connectors:[],photoEvents:[],feedback:[],updatedAt:null}}}
let S=load();
function save(){S.updatedAt=now();localStorage.setItem(KEY,JSON.stringify(S));}
function uid(p='k'){return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function fingerprint(x){return norm((x.title||'')+'|'+(x.url||'')+'|'+(x.source||'')).toLowerCase()}
function addKnowledge(entry){
 const e={id:entry.id||uid('knowledge'),topic:norm(entry.topic||entry.query||'general'),query:norm(entry.query||''),title:norm(entry.title||'Untitled'),summary:norm(entry.summary||''),source:norm(entry.source||'External'),url:entry.url||'',confidence:entry.confidence||'medium',learnedAt:entry.learnedAt||now(),tags:Array.isArray(entry.tags)?entry.tags:[],kind:entry.kind||'external'};
 const key=fingerprint(e); const old=S.knowledge.find(x=>fingerprint(x)===key);
 if(old){old.summary=e.summary||old.summary;old.confidence=e.confidence||old.confidence;old.learnedAt=now();old.tags=[...new Set([...(old.tags||[]),...(e.tags||[])])];}
 else S.knowledge.unshift(e);
 S.knowledge=S.knowledge.slice(0,1000);save();return old||e;
}
function searchKnowledge(q,limit=8){const n=norm(q).toLowerCase();if(!n)return[];const toks=n.split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>1);return S.knowledge.map(x=>{const hay=(x.topic+' '+x.query+' '+x.title+' '+x.summary+' '+(x.tags||[]).join(' ')).toLowerCase();let score=0;if(hay.includes(n))score+=10;toks.forEach(t=>{if(hay.includes(t))score+=2});return{x,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.x)}
async function json(url){const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function wikipedia(q){try{const j=await json('https://ko.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch='+encodeURIComponent(q)+'&gsrnamespace=0&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*');return Object.values(j.query?.pages||{}).map(x=>({title:x.title,summary:String(x.extract||'').slice(0,700),url:x.fullurl||('https://ko.wikipedia.org/wiki/'+encodeURIComponent(x.title)),source:'Wikipedia'}));}catch{return[]}}
async function openAlex(q){try{const j=await json('https://api.openalex.org/works?search='+encodeURIComponent(q)+'&per-page=4&select=id,display_name,publication_year,doi,primary_location,cited_by_count');return(j.results||[]).map(x=>({title:x.display_name,summary:[x.publication_year&&('Published '+x.publication_year),x.cited_by_count!=null&&('Citations '+x.cited_by_count)].filter(Boolean).join('. '),url:x.doi||x.primary_location?.landing_page_url||x.id,source:'OpenAlex'}));}catch{return[]}}
async function crossref(q){try{const j=await json('https://api.crossref.org/works?query.bibliographic='+encodeURIComponent(q)+'&rows=4&select=title,URL,published,author,DOI');return(j.message?.items||[]).map(x=>({title:(x.title||[''])[0],summary:[x.published?.['date-parts']?.[0]?.[0]&&('Published '+x.published['date-parts'][0][0]),x.author?.[0]?.family&&('First author '+x.author[0].family)].filter(Boolean).join('. '),url:x.URL||('https://doi.org/'+(x.DOI||'')),source:'Crossref'}));}catch{return[]}}
async function pubmed(q){try{const s=await json('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term='+encodeURIComponent(q)+'&retmode=json&retmax=4');const ids=s.esearchresult?.idlist||[];if(!ids.length)return[];const j=await json('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id='+ids.join(',')+'&retmode=json');return ids.map(id=>{const x=j.result?.[id]||{};return{title:x.title||('PubMed '+id),summary:[x.pubdate,x.authors?.[0]?.name].filter(Boolean).join(' · '),url:'https://pubmed.ncbi.nlm.nih.gov/'+id+'/',source:'PubMed'}})}catch{return[]}}
async function externalSearch(q){
 const query=norm(q);if(!query)return{query:'',results:[],searched:false,fromMemory:[]};
 const memory=searchKnowledge(query,6);if(memory.length>=3)return{query,results:memory.map(x=>({...x,learned:true})),searched:false,fromMemory:memory};
 const settled=await Promise.allSettled([wikipedia(query),openAlex(query),crossref(query),pubmed(query)]);let results=[];settled.forEach(x=>{if(x.status==='fulfilled')results=results.concat(x.value)});
 const seen=new Set();results=results.filter(x=>x.url&&!seen.has(x.url)&&seen.add(x.url)).slice(0,10).map(x=>({...x,query,learned:false}));
 results.forEach(x=>addKnowledge({topic:query,query,title:x.title,summary:x.summary,source:x.source,url:x.url,confidence:/PubMed|OpenAlex|Crossref/i.test(x.source)?'high':'medium',tags:query.split(/\s+/).slice(0,8)}));
 return{query,results,searched:true,fromMemory:memory,timestamp:now()};
}
const needsExternalSearch=q=>/(최신|최근|연구|논문|근거|자료|검색|찾아|찾아줘|효과|권장|가이드|메타분석|통계|영양정보|영양 정보|성분|recommend|research|study|evidence|latest|trend|nutrition|guideline|meta-analysis)/i.test(String(q||''));
function knowledgeContext(q){return searchKnowledge(q,8).map(x=>({title:x.title,summary:x.summary,source:x.source,url:x.url,confidence:x.confidence,learnedAt:x.learnedAt}));}
function registerConnector(name,fn,meta={}){S.connectors=S.connectors.filter(x=>x.name!==name);S.connectors.push({name,description:meta.description||'',type:meta.type||'custom',registeredAt:now()});save();window.GARANGDataConnectors[name]=fn;}
function recordPhoto(file,meta={}){const e={id:uid('photo'),name:file?.name||'photo',type:file?.type||'',size:file?.size||0,createdAt:now(),context:meta};S.photoEvents.unshift(e);S.photoEvents=S.photoEvents.slice(0,300);save();return e;}
function addFeedback(text,meta={}){const e={id:uid('feedback'),text:norm(text),createdAt:now(),status:'open',meta};S.feedback.unshift(e);S.feedback=S.feedback.slice(0,300);save();return e;}
function stats(){return{knowledge:S.knowledge.length,sources:new Set(S.knowledge.map(x=>x.source)).size,connectors:S.connectors.length,photoEvents:S.photoEvents.length,feedbackOpen:S.feedback.filter(x=>x.status==='open').length,updatedAt:S.updatedAt}}
function renderPanel(){
 // Knowledge is an internal capability of GARANG Unified Intelligence.
 // Do not render a separate user-facing Knowledge Layer panel.
 const old=document.getElementById('v95DataPanel');
 if(old) old.remove();
}

function updateStats(){const e=document.getElementById('v95KnowledgeCount');if(e)e.textContent=String(S.knowledge.length);}
window.GARANGDataConnectors={};
window.GARANGKnowledge={version:'9.5.0',search:externalSearch,searchKnowledge,knowledgeContext,needsExternalSearch,learn:addKnowledge,recordPhoto,addFeedback,registerConnector,stats,data:()=>S};
registerConnector('openalex',openAlex,{type:'research',description:'OpenAlex public research metadata'});
registerConnector('crossref',crossref,{type:'research',description:'Crossref public scholarly metadata'});
registerConnector('pubmed',pubmed,{type:'research',description:'NCBI PubMed public biomedical metadata'});
registerConnector('wikipedia',wikipedia,{type:'knowledge',description:'Wikipedia public knowledge search'});
window.addEventListener('DOMContentLoaded',()=>setTimeout(renderPanel,800));
})();
