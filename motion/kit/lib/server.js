// static server: ads folder first, then the site folder; /__fonts -> fonts; /cdn/three -> cached three.js
const http=require('http'),fs=require('fs'),path=require('path');
// Paths are relative to this kit: motion/kit (compositions), motion/kit/work (frames/out), repo susu-preview (site assets)
const KIT=path.resolve(__dirname,'..'); const WORK=process.env.WORK||path.join(KIT,'work');
const roots=[WORK,KIT,path.resolve(KIT,'../../susu-preview')];
const T={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4','.json':'application/json'};
http.createServer((q,r)=>{
  let u=decodeURIComponent(q.url.split('?')[0]);
  let cands=[];
  if(u.startsWith('/__fonts/')) cands=[path.join(KIT,'fonts',u.slice(9))];
  else if(u.startsWith('/three/')) cands=[path.join(KIT,'cdn',u.slice(7))];
  else cands=roots.map(x=>path.join(x,u));
  for(const f of cands){ if(fs.existsSync(f)&&fs.statSync(f).isFile()){ r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream','cache-control':'max-age=3600','access-control-allow-origin':'*'}); fs.createReadStream(f).pipe(r); return; } }
  r.writeHead(404);r.end('nf '+u);
}).listen(8811,()=>console.log('on 8811'));
