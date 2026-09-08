'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const MIME=Object.freeze({
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.cjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8'
});

function requestPath(root,rawUrl){
  let pathname;
  try{pathname=decodeURIComponent(new URL(rawUrl||'/','http://127.0.0.1').pathname);}catch{return null;}
  let relative=pathname.replace(/^\/+/, '');
  if(!relative)relative='index.html';
  const base=path.resolve(root),candidate=path.resolve(base,relative);
  if(candidate!==base&&!candidate.startsWith(`${base}${path.sep}`))return null;
  return candidate;
}

function sendFile(root,req,res){
  const initial=requestPath(root,req.url);
  if(!initial){res.writeHead(400);res.end('Bad Request');return;}
  fs.stat(initial,(error,stats)=>{
    let file=initial;
    if(!error&&stats.isDirectory())file=path.join(initial,'index.html');
    fs.stat(file,(fileError,fileStats)=>{
      if(fileError||!fileStats.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');return;}
      res.writeHead(200,{
        'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream',
        'Content-Length':fileStats.size,
        'Cache-Control':'no-store'
      });
      if(req.method==='HEAD'){res.end();return;}
      const stream=fs.createReadStream(file);
      stream.on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end();});
      stream.pipe(res);
    });
  });
}

function startStaticServer(root,port,host='127.0.0.1'){
  const base=path.resolve(root);
  const server=http.createServer((req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    sendFile(base,req,res);
  });
  server.on('clientError',(_error,socket)=>{try{socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');}catch{}});
  server.listen(port,host);
  return {
    get exitCode(){return server.listening?null:0;},
    kill(){if(server.listening)server.close();},
    close(){return new Promise(resolve=>{if(!server.listening){resolve();return;}server.close(()=>resolve());});}
  };
}

module.exports={startStaticServer};
