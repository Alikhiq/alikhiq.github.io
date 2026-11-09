// node logoshot.js outdir t0 t1 [fps] [stepList]
const {chromium}=require('playwright');const fs=require('fs');
const [,,out,a,b,fps='30',list]=process.argv;
(async()=>{
 const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await br.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:1});
 await p.addInitScript({path:__dirname+'/vclock2.js'});
 p.on('pageerror',e=>console.log('pageerror',e.message));p.on('console',m=>{if(m.type()==='error')console.log('console',m.text())});
 await p.goto('http://localhost:8811/logo.html');
 await p.waitForFunction(()=>window.__ready===true,null,{timeout:300000});
 fs.mkdirSync(out,{recursive:true});
 const ts=list?list.split(',').map(Number):[];
 if(!list){const n0=Math.round(+a*fps),n1=Math.round(+b*fps);for(let n=n0;n<n1;n++)ts.push(n/fps);}
 let i=0;const T=Date.now();
 for(const t of ts){
   const n=list?i:Math.round(t*fps);
   const f=`${out}/${String(n).padStart(5,'0')}.png`;
   if(!fs.existsSync(f)){ await p.evaluate(t=>window.renderLogo(t),t); await p.screenshot({path:f}); }
   i++; if(i%30==0)console.log(i,'/',ts.length,((Date.now()-T)/i/1000).toFixed(2)+'s/f');
 }
 await br.close();})();
