// Manual virtual clock: time only moves when window.__tick(ms) is called.
(()=>{ window.__realTimeout=window.setTimeout.bind(window);
  let vt=0; window.__vt=()=>vt;
  // seeded random so particle layouts are identical in every render
  let s=0x9e3779b9; Math.random=()=>{ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  performance.now=()=>vt; const D0=Date.UTC(2026,10,9,12); Date.now=()=>D0+vt;
  const timers=new Map(); let id=1;
  window.setTimeout=(f,d,...a)=>{const i=id++;timers.set(i,{at:vt+(d||0),f,a});return i;};
  window.clearTimeout=(i)=>timers.delete(i);
  window.setInterval=(f,d,...a)=>{const i=id++;timers.set(i,{at:vt+(d||0),f,a,every:Math.max(1,d||0)});return i;};
  window.clearInterval=(i)=>timers.delete(i);
  const cbs=new Map(); let rid=1;
  window.requestAnimationFrame=(cb)=>{const i=rid++;cbs.set(i,cb);return i;};
  window.cancelAnimationFrame=(i)=>cbs.delete(i);
  window.__tick=(to)=>{ // advance to absolute ms `to`, run due timers, then one rAF round
    vt=Math.max(vt,to);
    for(let k=0;k<50;k++){ let ran=false; for(const [i,t] of [...timers]){ if(t.at<=vt){ ran=true; if(t.every){t.at+=t.every;} else timers.delete(i); try{typeof t.f==='function'&&t.f(...t.a);}catch(e){console.error(e)} } } if(!ran)break; }
    const list=[...cbs]; cbs.clear();
    for(const [i,cb] of list){ try{cb(vt);}catch(e){console.error(e)} }
  };
})();
