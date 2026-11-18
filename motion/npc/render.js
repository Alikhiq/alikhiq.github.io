const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const CH=JSON.parse(fs.readFileSync('chars.json','utf8')); const [mode,...who]=process.argv.slice(2);
const SL=['hero','card','talk','phone','wanted','done'];
(async()=>{const b=await chromium.launch();
 for(const id of (who.length?who:Object.keys(CH))){const c=CH[id];
  if(mode==='stills'){const p=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:2});
   await p.goto('file://'+path.resolve('npc.html'));fs.mkdirSync('out/'+id,{recursive:true});
   for(const [i,s] of SL.entries()){await p.evaluate(([c,s])=>window.setup(c,s),[c,s]);await p.waitForTimeout(300);
    await p.screenshot({path:`out/${id}/${id}-0${i+1}-${s}.png`});}
   await p.close();console.log('stills',id)}
  if(mode==='clip'){for(const [s,D] of [['hero',6.5],['wanted',2.6]]){const p=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
   await p.goto('file://'+path.resolve('npc.html'));await p.evaluate(([c,s])=>window.setup(c,s),[c,s]);await p.waitForTimeout(300);
   const dir=`frames/${id}_${s}`;fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
   const N=Math.round(D*30);for(let f=0;f<N;f++){await p.evaluate(([t,D])=>window.seek(t,D),[f/30,D]);await p.screenshot({path:`${dir}/${String(f).padStart(4,'0')}.jpg`,type:'jpeg',quality:94});}
   await p.close();console.log('clip',id,s,N)}}
 } await b.close();})();
