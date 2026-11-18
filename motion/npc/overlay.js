const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const CH=JSON.parse(fs.readFileSync('chars.json','utf8'));
const JOBS=[['me','hero'],['me','talk'],['ew','hero'],['ew','social'],['rc','hero'],['rc','wanted']];
(async()=>{const b=await chromium.launch();fs.mkdirSync('ov',{recursive:true});
 const p=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 await p.goto('file://'+path.resolve('npc.html'));
 for(const [id,s] of JOBS){await p.evaluate(([c,s])=>window.setup(c,s,true),[CH[id],s]);await p.waitForTimeout(250);
  await p.screenshot({path:`ov/${id}_${s}.png`,omitBackground:true});
  if(s==='social'){await p.evaluate(([c,s])=>window.setup(c,s,false),[CH[id],s]);await p.waitForTimeout(400);await p.screenshot({path:`ov/${id}_${s}_base.png`});}
 }
 // reel cards 1080x1920 transparent
 const r=await b.newPage({viewport:{width:1080,height:1920}});
 const card=(top,mid,bot,acc)=>`<html><head><link rel="stylesheet" href="file://${path.resolve('fonts/kit.css')}"><style>@font-face{font-family:Anton;src:url(file://${path.resolve('fonts/anton.woff2')})}@font-face{font-family:Teko;font-weight:600;src:url(file://${path.resolve('fonts/teko.woff2')})}
 html,body{margin:0;width:1080px;height:1920px;background:transparent;color:#fff;font-family:'DM Sans'}
 .t{position:absolute;left:0;right:0;text-align:center}.d{font-family:Anton;text-transform:uppercase;line-height:.95;-webkit-text-stroke:3px #000;paint-order:stroke fill;text-shadow:0 6px 0 rgba(0,0,0,.5)}
 .h{font-family:Teko;font-weight:600;letter-spacing:.2em;text-transform:uppercase}</style></head><body>${top}${mid}${bot}</body></html>`;
 const C=[
  ['title',card(`<div class="t h" style="top:170px;font-size:40px;color:#f2c14e">614 · OPEN CITY</div>`,`<div class="t d" style="top:700px;font-size:150px">If my clients<br>were NPC<span style="text-transform:none">s</span><br>in GTA 6</div>`,`<div class="t h" style="bottom:170px;font-size:38px;color:#ccc">COLUMBUS, OHIO</div>`)],
  ['lt_ew',card('','',`<div class="t" style="bottom:120px"><div class="h" style="font-size:40px;color:#ff2fa8">EVERYWRAP</div><div class="d" style="font-size:110px">The Wrap King</div></div>`)],
  ['lt_ew2',card('','',`<div class="t" style="bottom:120px"><div class="h" style="font-size:40px;color:#ff2fa8">SIDE QUEST</div><div class="d" style="font-size:96px">Chrome everything</div></div>`)],
  ['lt_rc',card('','',`<div class="t" style="bottom:120px"><div class="h" style="font-size:40px;color:#f2c14e">LOCATION UNLOCKED</div><div class="d" style="font-size:110px">Round City</div></div>`)],
  ['lt_rc2',card('','',`<div class="t" style="bottom:120px"><div class="h" style="font-size:40px;color:#f2c14e">SAFEHOUSE</div><div class="d" style="font-size:96px">Open 24/7</div></div>`)],
  ['lt_me',card('','',`<div class="t" style="bottom:120px"><div class="h" style="font-size:40px;color:#ffc547">ALI · THE ARCHITECT</div><div class="d" style="font-size:110px">Main character</div></div>`)],
  ['lt_me2',card('','',`<div class="t" style="bottom:120px"><div class="h" style="font-size:40px;color:#ffc547">ALI</div><div class="d" style="font-size:96px">“Live by Friday? Bet.”</div></div>`)],
  ['end',card(`<div class="t h" style="top:170px;font-size:40px;color:#f2c14e">614 · OPEN CITY</div>`,`<div class="t d" style="top:690px;font-size:130px;color:#f2c14e">Your business<br>could be next</div><div class="t" style="top:1040px;font-size:46px">Websites, brand & software</div><div class="t d" style="top:1140px;font-size:110px;-webkit-text-stroke:0">roundcity.co</div>`,`<div class="t h" style="bottom:170px;font-size:38px;color:#ccc">WHICH CLIENT IS NEXT? 👇</div>`)],
 ];
 for(const [n,h] of C){fs.writeFileSync(`ov/_${n}.html`,h);await r.goto('file://'+path.resolve(`ov/_${n}.html`));await r.evaluate(()=>document.fonts.ready);await r.waitForTimeout(300);await r.screenshot({path:`ov/${n}.png`,omitBackground:true});}
 await b.close();console.log('ok')})();
