// node cap.js page.html outdir fps from to [list] [w] [h]  -- deterministic frame capture
const {chromium}=require('playwright');const fs=require('fs');
const [,,page,out,fpsS='30',a='0',b='0',list,w='1080',h='1920']=process.argv;const fps=+fpsS;
(async()=>{
 const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const p=await br.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
 await p.addInitScript({path:__dirname+'/vclock2.js'});
 p.on('pageerror',e=>console.log('pageerror',e.message));p.on('console',m=>{if(['error','warning'].includes(m.type()))console.log('console',m.text().slice(0,300))});
 await p.goto('http://localhost:8811/'+page,{waitUntil:'load'});
 await p.waitForFunction(()=>window.__ready!==undefined,null,{timeout:120000});
 await p.evaluate(()=>window.__ready);
 await p.evaluate(()=>document.fonts.ready);
 fs.mkdirSync(out,{recursive:true});
 let frames=[];
 if(list&&list!=='-') frames=list.split(',').map((t,i)=>({n:i,t:+t}));
 else for(let n=Math.round(+a*fps);n<Math.round(+b*fps);n++)frames.push({n,t:n/fps});
 // warm-up: tick from 0 to first frame so stateful smoothing is consistent
 const T=Date.now();let i=0;
 for(const f of frames){
   const file=`${out}/${String(f.n).padStart(5,'0')}.jpg`;
   await p.evaluate(async t=>{await window.seek(t);window.__tick(t*1000);if(window.after)await window.after(t);},f.t);
   await p.screenshot({path:file,type:'jpeg',quality:94});
   i++; if(i%15==0)console.log(i,'/',frames.length,((Date.now()-T)/i/1000).toFixed(2)+'s/f');
 }
 console.log('done',frames.length,((Date.now()-T)/1000).toFixed(0)+'s');
 await br.close();})();
