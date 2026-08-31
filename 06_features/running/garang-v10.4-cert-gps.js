/* GARANG V10.4 — Certification overlays + GPS/Google Maps bridge
 * Transparent PNG overlays are designed to sit on top of user photos/videos.
 */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const D=()=>window.__FitMindV6DB?window.__FitMindV6DB():null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  let map=null, mapReady=false, mapMarkers=[], mapPolyline=null;

  function addStyle(){
    if($('g104Style'))return;
    const s=document.createElement('style');s.id='g104Style';s.textContent=`
      .g104-map{min-height:280px;border-radius:20px;overflow:hidden;background:#080c0a;border:1px solid #25322b;position:relative}
      .g104-map #runGoogleMap{position:absolute;inset:0}.g104-map .g104-fallback{position:absolute;inset:0;display:grid;place-items:center;color:#8d9b93;font-size:13px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 40%,rgba(57,230,111,.08),transparent 55%)}
      .g104-gpsbar{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:10px 0}.g104-gpspill{padding:10px 12px;border-radius:14px;background:#101815;border:1px solid #26362d;color:#a9b7af;font-size:12px}.g104-gpspill strong{color:#39e66f}.g104-map-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .g104-overlay-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.g104-overlay-actions button{min-height:48px}.g104-overlay-note{padding:12px;border-radius:14px;background:#0d1511;border:1px solid #24362b;color:#9eaca4;font-size:12px;line-height:1.5;margin-top:10px}
      .g104-template{border:1px solid #2a3931;background:#101714;color:#dfe7e2;border-radius:14px;padding:11px;font-weight:800}.g104-template.active{border-color:#39e66f;color:#39e66f;background:rgba(57,230,111,.08)}
      @media(max-width:600px){.g104-overlay-actions{grid-template-columns:1fr}.g104-map{min-height:250px}}
    `;document.head.appendChild(s);
  }

  function addRunningUI(){
    const page=$('running');if(!page||page.dataset.g104)return;page.dataset.g104='1';
    const live=page.querySelector('.runLive');
    const block=document.createElement('div');block.className='card';block.innerHTML=`
      <div class="sectionHead"><div><span class="eyebrow">LOCATION SERVICE</span><h3>실시간 위치 · 러닝 경로</h3><p class="muted">휴대폰 위치 권한을 허용하면 이동 경로와 위치 정확도를 기록합니다.</p></div><span class="g104-gpspill" id="g104GpsState">GPS 대기</span></div>
      <div class="g104-gpsbar"><div class="g104-gpspill">위치 서비스 <strong id="g104GpsPermission">확인 중</strong></div><button class="ghostBtn" id="g104GpsPermissionBtn" type="button">위치 권한 확인</button></div>
      <div class="g104-map"><div id="runGoogleMap"></div><div class="g104-fallback" id="g104MapFallback">러닝을 시작하면 현재 위치와 경로가 지도에 표시됩니다.</div></div>
      <div class="g104-map-actions"><button class="ghostBtn" id="g104CenterMap" type="button">현재 위치로 이동</button><button class="ghostBtn" id="g104MapMode" type="button">지도 스타일 전환</button></div>`;
    if(live)live.insertAdjacentElement('afterend',block);else page.appendChild(block);
    $('g104GpsPermissionBtn').onclick=requestLocation;
    $('g104CenterMap').onclick=()=>{const pts=getLivePoints();const p=pts[pts.length-1];if(map&&p)map.setCenter({lat:p.lat,lng:p.lon}),map.setZoom(17)};
    $('g104MapMode').onclick=()=>{if(map){const cur=map.getMapTypeId();map.setMapTypeId(cur==='satellite'?'roadmap':'satellite')}};
    checkPermission();loadGoogleMaps();
  }

  function getLivePoints(){
    const host=window.GARANG_V104_RUN_POINTS;return Array.isArray(host)?host:[];
  }
  function setLivePoints(points){window.GARANG_V104_RUN_POINTS=points||[];updateMap(points||[])}
  function updateMap(points){
    const fallback=$('g104MapFallback');if(!points.length){if(fallback)fallback.style.display='grid';return}
    if(fallback)fallback.style.display=mapReady?'none':'grid';
    if(!mapReady||!window.google?.maps)return;
    const path=points.map(p=>({lat:p.lat,lng:p.lon}));
    if(!map){map=new google.maps.Map($('runGoogleMap'),{center:path[path.length-1],zoom:17,mapTypeId:'roadmap',disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy',styles:[{elementType:'geometry',stylers:[{color:'#0d1511'}]},{elementType:'labels.text.fill',stylers:[{color:'#8fa69a'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#27352e'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#08110d'}]}]});}
    mapMarkers.forEach(m=>m.setMap(null));mapMarkers=[];
    mapMarkers.push(new google.maps.Marker({position:path[0],map,title:'START',icon:{path:google.maps.SymbolPath.CIRCLE,scale:6,fillColor:'#39e66f',fillOpacity:1,strokeColor:'#07110a',strokeWeight:2}}));
    mapMarkers.push(new google.maps.Marker({position:path[path.length-1],map,title:'CURRENT',icon:{path:google.maps.SymbolPath.CIRCLE,scale:7,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#39e66f',strokeWeight:3}}));
    if(mapPolyline)mapPolyline.setMap(null);mapPolyline=new google.maps.Polyline({path,geodesic:true,strokeColor:'#39e66f',strokeOpacity:.95,strokeWeight:5,map});
    const bounds=new google.maps.LatLngBounds();path.forEach(p=>bounds.extend(p));map.fitBounds(bounds,{top:40,right:40,bottom:40,left:40});
  }
  function requestLocation(){
    if(!navigator.geolocation){setGpsText('지원 안 됨');return}
    navigator.geolocation.getCurrentPosition(pos=>{setGpsText('허용됨',true);window.GARANG_V104_LAST_POS={lat:pos.coords.latitude,lon:pos.coords.longitude,acc:pos.coords.accuracy};updateMap([window.GARANG_V104_LAST_POS])},err=>setGpsText(err.code===1?'권한 거부':'확인 실패'));
  }
  function checkPermission(){
    if(navigator.permissions?.query){navigator.permissions.query({name:'geolocation'}).then(p=>{setGpsText(p.state==='granted'?'허용됨':p.state==='denied'?'거부됨':'대기',p.state==='granted')}).catch(()=>setGpsText('버튼으로 확인'))}else setGpsText('버튼으로 확인');
  }
  function setGpsText(text,ok){if($('g104GpsPermission')){$('g104GpsPermission').textContent=text;$('g104GpsPermission').style.color=ok?'#39e66f':''}if($('g104GpsState'))$('g104GpsState').textContent=text}
  function loadGoogleMaps(){
    const key=window.GARANG_GOOGLE_MAPS_API_KEY||window.GARANG_GOOGLE_MAPS_CONFIG?.apiKey;
    if(!key){if($('g104MapFallback'))$('g104MapFallback').innerHTML='<b>위치 서비스 연결 준비 완료</b><br>Google Maps API Key를 설정하면 실제 지도가 표시됩니다.<br><small>키가 없어도 GPS 경로 데이터는 기록됩니다.</small>';return}
    if(window.google?.maps){mapReady=true;return updateMap(getLivePoints())}
    const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly';s.async=true;s.defer=true;s.onload=()=>{mapReady=true;updateMap(getLivePoints())};s.onerror=()=>{if($('g104MapFallback'))$('g104MapFallback').innerHTML='<b>Google Maps 연결 실패</b><br>API Key, Maps JavaScript API 활성화, HTTP referrer 제한을 확인하세요.'};document.head.appendChild(s);
  }

  function ensureOverlayControls(){
    const modal=$('garang86CertModal');if(!modal||modal.dataset.g104)return;modal.dataset.g104='1';
    const controls=modal.querySelector('.g86-controls');if(!controls)return;
    const box=document.createElement('div');box.className='g104-overlay-box';box.innerHTML=`
      <div style="margin-top:12px"><b>투명 오버레이</b><div class="g104-overlay-actions"><button class="g104-template active" data-g104-overlay="standard">GARANG STANDARD</button><button class="g104-template" data-g104-overlay="run">RUN DATA</button></div><div class="g104-overlay-note">배경이 투명한 PNG입니다. 사진 위에 올리거나 영상 편집 앱에서 레이어로 추가할 수 있어요.</div></div>
      <div class="g104-overlay-actions"><button id="g104OverlayDownload" class="g86-primary">투명 PNG 저장</button><button id="g104OverlayShare" class="g86-secondary">투명 PNG 공유</button></div>`;
    controls.appendChild(box);
    modal.querySelectorAll('[data-g104-overlay]').forEach(b=>b.onclick=()=>{modal.querySelectorAll('[data-g104-overlay]').forEach(x=>x.classList.remove('active'));b.classList.add('active');window.GARANG_V104_OVERLAY=b.dataset.g104Overlay});
    $('g104OverlayDownload').onclick=downloadOverlay;$('g104OverlayShare').onclick=shareOverlay;
  }
  function currentRecord(){return window.GARANGV86?.summary?.()||{} }
  function isRunRecord(r){return r?.distance!=null||r?.pace!=null||r?.type==='run'||r?.run}
  function drawOverlayCanvas(){
    const m=$('garang86CertModal');const base=$('g86Canvas');if(!m||!base)return null;
    const r=window.__GARANG_V104_CERT_RECORD||currentRecord();const run=isRunRecord(r);const landscape=m.querySelector('[data-orient].selected')?.dataset.orient==='16:9';const W=landscape?1600:1080,H=landscape?900:1920;const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
    ctx.clearRect(0,0,W,H);const pad=landscape?72:58;
    // transparent dark glass panels only; no full-screen background
    ctx.fillStyle='rgba(4,10,7,.70)';const panelH=run?(landscape?270:410):(landscape?250:360);ctx.roundRect(pad,H-panelH-pad,W-pad*2,panelH,30);ctx.fill();
    ctx.strokeStyle='rgba(57,230,111,.58)';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#39e66f';ctx.font=`900 ${landscape?30:26}px Arial`;ctx.fillText('GARANG',pad+28,H-pad-panelH+48);
    ctx.fillStyle='#ffffff';ctx.font=`900 ${landscape?54:48}px Arial`;
    if(run){ctx.fillText('RUN VERIFIED',pad+28,H-pad-panelH+110);ctx.font=`700 ${landscape?29:25}px Arial`;ctx.fillText(`${Number(r.distance||r.run?.distance||0).toFixed(2)} km   ·   ${r.pace||r.run?.pace||'--:--'}   ·   ${r.time||r.run?.time||''}`,pad+28,H-pad-panelH+156);ctx.fillStyle='#a9b7af';ctx.font=`600 ${landscape?22:19}px Arial`;ctx.fillText(`${r.calories||r.run?.calories||0} kcal   ·   GPS VERIFIED   ·   ${r.date||today()}`,pad+28,H-pad-panelH+194);drawRoute(ctx,r,pad+28,H-pad+18,W-pad-28,H-pad-18);}
    else{const name=r.exercises?.length===1?r.exercises[0].name:'WORKOUT SESSION';ctx.fillText('WORKOUT VERIFIED',pad+28,H-pad-panelH+110);ctx.font=`800 ${landscape?32:28}px Arial`;ctx.fillText(String(name).toUpperCase(),pad+28,H-pad-panelH+158);ctx.fillStyle='#a9b7af';ctx.font=`600 ${landscape?22:19}px Arial`;ctx.fillText(`${r.totalSets||0} SETS   ·   ${(r.totalVolume||0).toLocaleString()} KG VOLUME   ·   ${r.date||today()}`,pad+28,H-pad-panelH+198);}
    return c;
  }
  function drawRoute(ctx,r,x1,y1,x2,y2){const pts=r.points||r.run?.points||[];if(pts.length<2)return;const minLat=Math.min(...pts.map(p=>p.lat)),maxLat=Math.max(...pts.map(p=>p.lat)),minLon=Math.min(...pts.map(p=>p.lon)),maxLon=Math.max(...pts.map(p=>p.lon));const dx=Math.max(maxLon-minLon,.00001),dy=Math.max(maxLat-minLat,.00001);ctx.strokeStyle='#39e66f';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();pts.forEach((p,i)=>{const x=x1+(p.lon-minLon)/dx*(x2-x1),y=y2-(p.lat-minLat)/dy*(y2-y1);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
  async function overlayBlob(){const c=drawOverlayCanvas();return new Promise(resolve=>c.toBlob(resolve,'image/png',1))}
  async function downloadOverlay(){const b=await overlayBlob();const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`GARANG-${window.GARANG_V104_OVERLAY||'standard'}-overlay.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function shareOverlay(){const b=await overlayBlob();const f=new File([b],`GARANG-${window.GARANG_V104_OVERLAY||'standard'}-overlay.png`,{type:'image/png'});if(navigator.share){try{await navigator.share({title:'GARANG 인증 오버레이',text:'GARANG transparent certification overlay',files:[f]})}catch(e){}}else downloadOverlay()}
  function patchCertOpen(){
    if(!window.GARANGV86?.openCertification||window.GARANGV86.openCertification.__g104)return;
    const original=window.GARANGV86.openCertification;
    const wrapped=function(record){window.__GARANG_V104_CERT_RECORD=record;window.GARANG_V104_OVERLAY='standard';original(record);setTimeout(ensureOverlayControls,30)};wrapped.__g104=true;window.GARANGV86.openCertification=wrapped;
    const oldShare=window.garangOpenShare;window.garangOpenShare=function(data){const r=data?.run||data?.workout||data?.data||data||{};window.__GARANG_V104_CERT_RECORD=r;window.GARANG_V104_OVERLAY=isRunRecord(r)?'run':'standard';if(oldShare)oldShare(data);setTimeout(ensureOverlayControls,30)};
  }
  function syncRunPoints(){
    window.addEventListener('garang-run-gps',e=>updateMap(e.detail?.points||[]));
    const original=window.garangRenderRuns;
    // v8.5-running keeps points on saved run records. On active runs we can mirror any exposed points if available.
    setInterval(()=>{const d=D();const last=(d?.runs||[]).slice(-1)[0];if(last?.points?.length)setLivePoints(last.points)},1200);
    if(original) setTimeout(()=>original(),100);
  }
  function boot(){addStyle();addRunningUI();setTimeout(()=>{patchCertOpen();ensureOverlayControls();syncRunPoints()},500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
