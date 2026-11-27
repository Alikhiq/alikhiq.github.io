import{a as V,d as W,e as Y,g as H,h as Z,i as N,j as J,k as K,l as Q,m as $,n as ee,o as te,p as ie,q as oe,s as ae,t as se,u as ne,v as re}from"./chunk-JJKLDU2A.js";var fe={AdditiveBlending:V,BufferAttribute:Q,BufferGeometry:$,Color:K,Group:ae,LinearFilter:W,LinearMipmapLinearFilter:Y,Mesh:ee,PerspectiveCamera:ie,PlaneGeometry:oe,Points:re,Scene:ne,ShaderMaterial:te,Texture:Z,Vector2:H,Vector3:J,Vector4:N,WebGLRenderer:se};(function(){if(customElements.get("muse-story"))return;let le=()=>Promise.resolve(fe),ce="./brand/muse-master.webp",j="./brand/muse-master-1168.webp",C=2336,E=3520,U=C/E,M=[{box:[1060,730,1900,905],f:[1480,830],zoom:2.5},{box:[1490,1350,1795,1595],f:[1642,1470],zoom:2.8},{box:[1100,895,1885,1055],f:[1492,975],zoom:2.6},{box:[555,2140,1285,3040],f:[920,2590],zoom:1.55},{box:[575,1110,870,1400],f:[722,1262],zoom:2.7},{box:[930,1860,1880,2330],f:[1400,2120],zoom:1.75}],O=(g,e,t)=>{let i=Math.min(1,Math.max(0,(t-g)/(e-g)));return i*i*(3-2*i)},G=(g,e,t)=>g+(e-g)*t,q=`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
 const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
 vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
 i=mod289(i);
 vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
 float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
 vec4 j=p-49.0*floor(p*ns.z*ns.z);
 vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
 vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
 vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
 vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
 p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
 vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
 return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`,he="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",ue=`
uniform sampler2D tMap; uniform vec3 uBg; uniform vec2 uLight;
uniform float uFoil, uReveal, uSheen, uBlink, uTime, uGlint, uIrisAmt;
uniform vec3 uIrisA, uIrisB;
uniform vec4 uBox[6]; uniform float uAct[6];
varying vec2 vUv;
const vec2 IMG = vec2(2336.0, 3520.0);
const float NX[8] = float[8](1262.0,1280.0,1300.0,1340.0,1380.0,1420.0,1460.0,1492.0);
const float NT[8] = float[8](990.0,981.0,975.0,958.0,953.0,956.0,975.0,995.0);
const float NB[8] = float[8](991.0,1000.0,1008.0,1018.0,1020.0,1012.0,1000.0,996.0);
const float FX[8] = float[8](1680.0,1700.0,1720.0,1740.0,1760.0,1775.0,1790.0,1800.0);
const float FT[8] = float[8](952.0,947.0,945.0,944.0,944.0,946.0,950.0,958.0);
const float FB[8] = float[8](995.0,998.0,1000.0,1000.0,999.0,996.0,988.0,975.0);
float pl(float X[8], float Y[8], float x){
  float y = Y[0];
  for (int i = 0; i < 7; i++) { if (x >= X[i] && x <= X[i+1]) y = mix(Y[i], Y[i+1], (x - X[i]) / (X[i+1] - X[i])); }
  if (x > X[7]) y = Y[7];
  return y;
}
vec2 warpEye(vec2 p, float X[8], float T[8], float B[8], float band, float skin, float b){
  if (p.x < X[0] || p.x > X[7]) return p;
  float t = pl(X, T, p.x), bt = pl(X, B, p.x);
  float d = b * max(bt - t - 1.5, 0.0);
  float L = t + d, bandTop = t - band, skinTop = bandTop - skin;
  if (p.y > L || p.y < skinTop) return p;
  if (p.y >= bandTop + d) return vec2(p.x, p.y - d);
  float k = (p.y - skinTop) / max(bandTop + d - skinTop, 0.001);
  return vec2(p.x, skinTop + k * (bandTop - skinTop));
}
float openMask(vec2 s, float X[8], float T[8], float B[8]){
  if (s.x < X[0] || s.x > X[7]) return 0.0;
  float t = pl(X, T, s.x), b = pl(X, B, s.x);
  return smoothstep(t - 0.5, t + 2.5, s.y) * smoothstep(b + 0.5, b - 2.5, s.y);
}
vec4 iris(vec2 s, vec3 ir, vec3 pu, float open, vec2 ldir){
  vec2 v = s - ir.xy; float r = length(v);
  float m = smoothstep(ir.z + 1.0, ir.z - 2.5, r) * open;
  if (m <= 0.0) return vec4(0.0);
  float rp = length(s - pu.xy);
  float pm = smoothstep(pu.z + 1.5, pu.z - 1.0, rp);
  float k = clamp(rp / ir.z, 0.0, 1.0);
  vec3 col = mix(uIrisA, uIrisB, smoothstep(0.15, 0.95, k));
  col *= 1.0 - 0.55 * smoothstep(0.8, 1.0, r / ir.z);
  float ang = atan(s.y - pu.y, s.x - pu.x);
  col *= 0.82 + 0.18 * sin(ang * 41.0 + sin(ang * 7.0) * 2.0);
  float lit = 0.5 + 0.5 * dot(normalize(v + 1e-4), -ldir);
  col *= 0.72 + 0.6 * lit;
  return vec4(col, m * (1.0 - pm));
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 P = vec2(vUv.x, 1.0 - vUv.y) * IMG;
  vec2 S = P;
  if (uBlink > 0.001) { S = warpEye(S, NX, NT, NB, 50.0, 26.0, uBlink); S = warpEye(S, FX, FT, FB, 22.0, 16.0, uBlink); }
  vec2 uv = vec2(S.x / IMG.x, 1.0 - S.y / IMG.y);
  vec3 c = texture2D(tMap, uv).rgb;
  vec3 dd = max(c - uBg, 0.0) / max(1.0 - uBg, vec3(0.001));
  float a = clamp((max(max(dd.r, dd.g), dd.b) - 0.012) / 0.988, 0.0, 1.0);
  vec3 col = clamp((c - uBg * (1.0 - a)) / max(a, 0.001), 0.0, 1.0);
  float ins = 0.0, amax = 0.0; float bi[6];
  for (int i = 0; i < 6; i++) {
    vec4 bx = uBox[i]; vec2 cc = (bx.xy + bx.zw) * 0.5, hs = (bx.zw - bx.xy) * 0.5;
    vec2 q = abs(P - cc) - hs; float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    bi[i] = uAct[i] * smoothstep(36.0, -12.0, sd);
    ins = max(ins, bi[i]); amax = max(amax, uAct[i]);
  }
  float insN = amax > 0.001 ? ins / amax : 0.0;
  vec2 dl = (vUv - uLight) * vec2(0.6636, 1.0);
  float spot = exp(-dot(dl, dl) * 10.0);
  float band = pow(0.5 + 0.5 * sin((vUv.x * 1.2 + vUv.y * 0.8) * 4.2 - uSheen), 12.0);
  float grain = 0.75 + 0.5 * hash(floor(vUv * vec2(1168.0, 1760.0)));
  float fk = uFoil * (spot * 0.55 + band * 0.25 + ins * 0.4) * grain * smoothstep(0.2, 0.8, a);
  col = mix(col, vec3(0.973, 0.906, 0.808), clamp(fk, 0.0, 0.75));
  float la = smoothstep(0.15, 0.7, a);
  // per-service finish (colour only on her existing linework; geometry untouched)
  col = mix(col, vec3(0.80, 0.60, 0.42), bi[0] * la * 0.42);                       // brows: warm pigment
  col = mix(col, vec3(0.93, 0.64, 0.56), bi[1] * la * 0.48);                       // lips: soft blush
  col = mix(col, vec3(0.95, 0.80, 0.62), bi[2] * la * 0.30);                       // liner: gilded
  float tw = fract((P.y * 0.8 - P.x * 0.45) / 520.0 + uTime * 0.16);
  col = mix(col, vec3(1.0, 0.95, 0.86), bi[3] * la * 0.55 * exp(-pow((tw - 0.5) * 9.0, 2.0))); // tattoo: ink shimmer
  float nb = fract((P.x * 0.9 + P.y * 0.35) / 900.0 - uTime * 0.12);
  col = mix(col, vec3(1.0, 0.94, 0.84), bi[5] * la * 0.5 * exp(-pow((nb - 0.5) * 8.0, 2.0))); // body piercing: light traces neck + collarbone line (no jewellery added)
  vec3 pm = col * a; float A = a;
  vec2 ldir = normalize((uLight - vec2(0.62, 0.72)) * vec2(1.0, -1.0) + vec2(0.0001));
  if (bi[4] > 0.001) { // piercings: polished studs catch the light
    vec3 ST[4]; ST[0] = vec3(610.0, 1148.0, 20.0); ST[1] = vec3(614.0, 1197.0, 20.0); ST[2] = vec3(743.0, 1337.0, 21.0); ST[3] = vec3(820.0, 1356.0, 33.0);
    for (int k = 0; k < 4; k++) {
      vec2 d = (S - ST[k].xy) / ST[k].z; float r2 = dot(d, d);
      if (r2 < 1.0) {
        vec3 n = vec3(d, sqrt(1.0 - r2)); vec3 L = normalize(vec3(ldir * 0.8, 0.7));
        float sp = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 26.0);
        float sh = 0.55 + 0.45 * max(dot(n, L), 0.0);
        vec3 metal = vec3(0.89, 0.74, 0.57) * sh + vec3(1.0, 0.97, 0.92) * sp * 1.2;
        float m = bi[4] * smoothstep(1.0, 0.86, r2);
        pm = mix(pm, metal, m * 0.85); A = mix(A, 1.0, m * 0.85);
      }
      float ph = uTime * 1.3 + float(k) * 1.7, tk = pow(0.5 + 0.5 * sin(ph), 8.0);
      vec2 o = S - (ST[k].xy + ldir * vec2(1.0, -1.0) * ST[k].z * 0.35);
      float star = (exp(-abs(o.x) / 1.6) * exp(-abs(o.y) / (ST[k].z * 0.9)) + exp(-abs(o.y) / 1.6) * exp(-abs(o.x) / (ST[k].z * 0.9))) * 0.7 + exp(-dot(o, o) / 14.0);
      float g = bi[4] * tk * star * uGlint;
      pm += vec3(1.0, 0.97, 0.92) * g; A += g;
    }
  }
  float oN = openMask(S, NX, NT, NB), oF = openMask(S, FX, FT, FB);
  vec4 ir = iris(S, vec3(1343.0, 974.0, 44.0), vec3(1342.0, 966.0, 9.0), oN, ldir)
          + iris(S, vec3(1721.0, 966.0, 28.0), vec3(1714.0, 948.0, 8.0), oF, ldir);
  float fa = clamp(ir.a * uIrisAmt, 0.0, 1.0);
  pm = mix(pm, pm * (ir.rgb * 1.6 + 0.35), fa * 0.5);
  pm += ir.rgb * fa * (1.0 - a);
  A += fa * (1.0 - a);
  vec2 lo = ldir * 3.0;
  vec2 g1 = S - (vec2(1351.0, 959.0) + lo), g2 = S - (vec2(1325.0, 985.0) - lo * 0.5), g3 = S - (vec2(1716.0, 942.0) + lo * 0.7);
  float gl = exp(-dot(g1, g1) / 18.0) + 0.45 * exp(-dot(g2, g2) / 5.0) + 0.85 * exp(-dot(g3, g3) / 10.0);
  gl *= uGlint * (0.86 + 0.14 * sin(uTime * 2.1)) * max(oN, oF);
  pm += vec3(1.0, 0.975, 0.94) * gl; A += gl;
  float dim = 1.0 - amax * 0.6 * (1.0 - insN);
  float vis = 1.0 - smoothstep(uReveal - 0.18, uReveal, 1.0 - vUv.y);
  float f = dim * vis;
  A = clamp(A, 0.0, 1.0) * f; pm = min(pm, vec3(1.0)) * f;
  if (A < 0.002) discard;
  gl_FragColor = vec4(pm, A);
}`,me=`
uniform vec3 uA, uC; varying float vA; varying float vMix;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d2 = dot(c, c);
  if (d2 > 0.25) discard;
  float a = (exp(-d2 * 70.0) + exp(-d2 * 14.0) * 0.4) * vA;
  gl_FragColor = vec4(mix(uA, uC, vMix) * a, a);
}`,ve=q+`
attribute vec4 aSeed; attribute float aReg; attribute float aSize;
uniform float uTime, uPR, uZoom; uniform float uAct[6];
varying float vA; varying float vMix;
void main(){
  vec3 p = position;
  float act = 0.0;
  for (int i = 0; i < 6; i++) act += uAct[i] * (1.0 - step(0.5, abs(aReg - float(i))));
  float st = aSeed.w * 0.5;
  float e = smoothstep(st, st + 0.5, act);
  vec3 dir = normalize(aSeed.xyz - 0.5 + vec3(1e-4));
  float rad = 0.012 + 0.085 * aSeed.w * aSeed.x;
  vec3 sc = p + vec3(dir.x * rad, dir.y * rad + 0.03 * (1.0 - act), dir.z * 0.3);
  sc.xy += vec2(snoise(vec3(sc.xy * 7.0, uTime * 0.12)), snoise(vec3(sc.xy * 7.0 + 19.0, uTime * 0.12))) * 0.02;
  vec3 q = mix(sc, p, e);
  q.xy += vec2(snoise(vec3(p.xy * 60.0, uTime * 0.6)), snoise(vec3(p.xy * 60.0 + 5.0, uTime * 0.6))) * 0.0011 * e;
  float tw = 0.72 + 0.28 * sin(uTime * (1.5 + 2.0 * aSeed.y) + aSeed.z * 40.0);
  vA = smoothstep(0.02, 0.35, act) * (0.22 + 0.78 * e) * tw;
  vMix = aSeed.y;
  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vA < 0.003 ? 0.0 : aSize * uPR * (0.7 + 0.3 * uZoom) * (1.866 / -mv.z) * (1.0 + (1.0 - e) * 0.9);
}`,pe=q+`
attribute vec4 aSeed; attribute float aSize;
uniform float uTime, uPR, uAmb, uAspect;
varying float vA; varying float vMix;
void main(){
  vec3 p = position;
  p.y = fract(p.y + 0.5 + uTime * 0.005 * (0.4 + aSeed.x)) - 0.5;
  vec3 w = vec3(p.x * uAspect * 1.25, p.y * 1.25, p.z * 1.1);
  w.xy += vec2(snoise(vec3(w.xy * 1.5, uTime * 0.05)), snoise(vec3(w.xy * 1.5 + 9.0, uTime * 0.05))) * 0.05;
  vec4 mv = modelViewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPR * (1.866 / -mv.z);
  vA = uAmb * (0.08 + 0.22 * aSeed.y) * smoothstep(0.5, 0.38, abs(p.y));
  vMix = aSeed.z;
}`;function de(){return new Promise((g,e)=>{let t=new Image;t.onload=()=>{let i=Math.round(C*.5),c=Math.round(E*.5),x=document.createElement("canvas");x.width=i,x.height=c;let s=x.getContext("2d",{willReadFrequently:!0});s.drawImage(t,0,0,i,c);let h=s.getImageData(0,0,i,1).data,A=[],l=[],T=[];for(let p=0;p<i;p+=8)A.push(h[p*4]),l.push(h[p*4+1]),T.push(h[p*4+2]);let w=p=>(p.sort((d,_)=>d-_),p[p.length>>1]/255),r=[w(A),w(l),w(T)],u=M.map(p=>{let[d,_,B,F]=p.box.map(y=>Math.round(y*.5)),b=B-d,z=F-_,k=s.getImageData(d,_,b,z).data,P=[];for(let y=0;y<z;y++)for(let m=0;m<b;m++){let S=(y*b+m)*4;Math.max((k[S]/255-r[0])/(1-r[0]),(k[S+1]/255-r[1])/(1-r[1]),(k[S+2]/255-r[2])/(1-r[2]))>.5&&P.push((d+m)/.5,(_+y)/.5)}return P});g({img:t,bg:r,regions:u})},t.onerror=e,t.src=j})}let X=["track","blink","irisa","irisb","irisamt","glint","foil","tilt","still","dust"];class D extends HTMLElement{static get observedAttributes(){return X}constructor(){super(),this._p={},this._frameB=this._frame.bind(this)}attributeChangedCallback(e,t,i){this._p[e]=i}_num(e,t){let i=parseFloat(this._p[e]);return isFinite(i)?i:t}_bool(e){let t=this._p[e];return t===!0||t==="true"}connectedCallback(){X.forEach(e=>{if(Object.prototype.hasOwnProperty.call(this,e)){let t=this[e];delete this[e],this[e]=t}}),this.style.display="block",this.style.position="relative",this.style.width||(this.style.width="100%"),this.style.height||(this.style.height="100%"),this._alive=!0,this._mq=window.matchMedia("(prefers-reduced-motion: reduce)"),this._r?this._start():le().then(e=>{if(this._alive&&!this._r)try{this._setup(e)}catch{this._fallback()}}).catch(()=>this._fallback())}disconnectedCallback(){this._alive=!1,this._dispose()}_fallback(){if(this._fb)return;let e=this._fb=document.createElement("img");e.src=j,e.alt="",e.setAttribute("aria-hidden","true"),Object.assign(e.style,{position:"absolute",top:"0",right:"0",height:"100%",width:"auto",maxWidth:"100%",objectFit:"contain",objectPosition:"right center",mixBlendMode:"lighten",pointerEvents:"none"}),window.innerWidth/window.innerHeight<.9&&Object.assign(e.style,{right:"auto",left:"50%",transform:"translateX(-50%)",height:"72%",objectPosition:"center top"}),this.appendChild(e)}_setup(e){this.T=e;let t=this._r=new e.WebGLRenderer({antialias:!0,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"});t.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),t.setClearColor(0,0),Object.assign(t.domElement.style,{position:"absolute",inset:"0",width:"100%",height:"100%",display:"block",pointerEvents:"none"}),this._glow=document.createElement("div"),Object.assign(this._glow.style,{position:"absolute",inset:"0",pointerEvents:"none"}),this.appendChild(this._glow),this.appendChild(t.domElement),this._scene=new e.Scene,this._cam=new e.PerspectiveCamera(30,1,.01,20),this._camZ=.5/Math.tan(15*Math.PI/180),this._cam.position.z=this._camZ,this._museG=new e.Group,this._scene.add(this._museG),this._sheet=new e.Group,this._museG.add(this._sheet);let i=new e.Color("#E4BD91"),c=new e.Color("#F4EADD");this._mu={tMap:{value:null},uBg:{value:new e.Vector3(.13,.11,.14)},uLight:{value:new e.Vector2(.6,.66)},uFoil:{value:1},uReveal:{value:0},uSheen:{value:0},uBlink:{value:0},uTime:{value:0},uGlint:{value:1},uIrisAmt:{value:.9},uIrisA:{value:new e.Color("#F0C27E")},uIrisB:{value:new e.Color("#8C5A2E")},uBox:{value:M.map(s=>new e.Vector4(s.box[0],s.box[1],s.box[2],s.box[3]))},uAct:{value:[0,0,0,0,0,0]}},this._muse=new e.Mesh(new e.PlaneGeometry(1,1),new e.ShaderMaterial({uniforms:this._mu,vertexShader:he,fragmentShader:ue,transparent:!0,depthWrite:!1,depthTest:!1,premultipliedAlpha:!0})),this._muse.renderOrder=2,this._sheet.add(this._muse);let x=(s,h)=>new e.ShaderMaterial({uniforms:Object.assign({uA:{value:i},uC:{value:c},uTime:{value:0},uPR:{value:t.getPixelRatio()}},h),vertexShader:s,fragmentShader:me,transparent:!0,depthWrite:!1,depthTest:!1,blending:e.AdditiveBlending,premultipliedAlpha:!0});this._pu=null,this._du=null,de().then(s=>{if(!this._r)return;let h=new e.Texture(s.img);h.generateMipmaps=!0,h.minFilter=e.LinearMipmapLinearFilter,h.magFilter=e.LinearFilter,h.anisotropy=t.capabilities.getMaxAnisotropy(),h.needsUpdate=!0,this._mu.tMap.value=h,this._mu.uBg.value.set(s.bg[0],s.bg[1],s.bg[2]);let A=this.clientWidth/Math.max(1,this.clientHeight)<.9,l=A?2200:3600,T=l*M.length,w=new Float32Array(T*3),r=new Float32Array(T*4),u=new Float32Array(T),p=new Float32Array(T),d=0;s.regions.forEach((f,o)=>{let a=f.length>>1;for(let v=0;v<l;v++,d++){let n=a?(Math.random()*a|0)*2:0,I=(a?f[n]:M[o].f[0])+(Math.random()-.5)*2,L=(a?f[n+1]:M[o].f[1])+(Math.random()-.5)*2;w[d*3]=I/C-.5,w[d*3+1]=.5-L/E,w[d*3+2]=.004+Math.random()*.012;for(let R=0;R<4;R++)r[d*4+R]=Math.random();u[d]=o,p[d]=Math.random()<.03?3.2+Math.random()*1.6:.9+Math.random()*1.5}});let _=new e.BufferGeometry;_.setAttribute("position",new e.BufferAttribute(w,3)),_.setAttribute("aSeed",new e.BufferAttribute(r,4)),_.setAttribute("aReg",new e.BufferAttribute(u,1)),_.setAttribute("aSize",new e.BufferAttribute(p,1));let B=x(ve,{uZoom:{value:1},uAct:{value:[0,0,0,0,0,0]}});this._pu=B.uniforms;let F=new e.Points(_,B);F.frustumCulled=!1,F.renderOrder=3,this._sheet.add(F);let b=A?900:1800,z=new Float32Array(b*3),k=new Float32Array(b*4),P=new Float32Array(b);for(let f=0;f<b;f++){z[f*3]=Math.random()-.5,z[f*3+1]=Math.random()-.5,z[f*3+2]=Math.random()-.5;for(let o=0;o<4;o++)k[f*4+o]=Math.random();P[f]=Math.random()<.06?4+Math.random()*5:.8+Math.random()*1.4}let y=new e.BufferGeometry;y.setAttribute("position",new e.BufferAttribute(z,3)),y.setAttribute("aSeed",new e.BufferAttribute(k,4)),y.setAttribute("aSize",new e.BufferAttribute(P,1));let m=x(pe,{uAmb:{value:1},uAspect:{value:1.6}});this._du=m.uniforms;let S=new e.Points(y,m);S.frustumCulled=!1,S.renderOrder=1,this._scene.add(S),this._ready=!0,this._t0=performance.now(),(()=>{let f=navigator.connection;if(f&&f.saveData)return;let o=performance.now()+2400,a=new Image;a.decoding="async";let v=()=>{if(!this._r||!this._mu||this._mu.tMap.value!==h)return;let n=new e.Texture(a);n.generateMipmaps=!0,n.minFilter=e.LinearMipmapLinearFilter,n.magFilter=e.LinearFilter,n.anisotropy=h.anisotropy,n.needsUpdate=!0,this._mu.tMap.value=n,h.dispose()};a.onload=()=>{let n=()=>setTimeout(v,Math.max(0,o-performance.now()));a.decode?a.decode().then(n,n):n()},a.src=ce})()}),this._ro=new ResizeObserver(()=>this._resize()),this._io=new IntersectionObserver(s=>{this._vis=s[s.length-1].isIntersecting}),this._onMove=s=>{this._ptr={x:s.clientX,y:s.clientY}},this._onLeave=()=>{this._ptr=null},this._start()}_start(){!this._r||this._running||(this._running=!0,this._ro.observe(this),this._io.observe(this),window.addEventListener("pointermove",this._onMove,{passive:!0}),document.documentElement.addEventListener("pointerleave",this._onLeave),this._resize(),this._raf=requestAnimationFrame(this._frameB))}_stop(){this._running&&(this._running=!1,cancelAnimationFrame(this._raf),this._ro.disconnect(),this._io.disconnect(),window.removeEventListener("pointermove",this._onMove),document.documentElement.removeEventListener("pointerleave",this._onLeave))}_dispose(){this._stop(),this._scene?.traverse?.(e=>{e.geometry?.dispose?.(),(Array.isArray(e.material)?e.material:e.material?[e.material]:[]).forEach(t=>{Object.values(t.uniforms||{}).forEach(i=>i?.value?.isTexture&&i.value.dispose()),t.dispose?.()})}),this._r?.dispose?.(),this._r?.forceContextLoss?.(),this.replaceChildren(),this._r=this._scene=this._cam=this._museG=this._sheet=this._muse=this._glow=null,this._mu=this._pu=this._du=this._fb=null,this._ready=this._running=!1}_resize(){let e=this.clientWidth,t=this.clientHeight;!this._r||!e||!t||(this._r.setSize(e,t,!1),this._aspect=e/t,this._cam.aspect=e/t,this._cam.updateProjectionMatrix())}_progress(){let e=this._p.track,t=e&&document.getElementById(e);if(!t)return 0;let i=t.getBoundingClientRect(),c=t.querySelector(".story-stage")?.clientHeight||document.documentElement.clientHeight||1;return Math.max(0,Math.min(M.length,-i.top/c))}_views(){let e=this._aspect,t=e<.9,i=e<1.45,c=t?[.5,.3,.58]:i?[.76,.54,.92]:[.7,.52,1.04],x=[{fu:.5,fv:.5,tx:c[0],ty:c[1],mh:c[2],gb:[1e3,500,2100,1700]}];return M.forEach(s=>x.push({gb:s.box,fu:s.f[0]/C,fv:s.f[1]/E,tx:t?.5:i?.7:.66,ty:t?.33:.5,mh:s.zoom*(t?.62:i?.85:1)})),x}_frame(e){if(this._raf=requestAnimationFrame(this._frameB),!this._ready||!this._aspect)return;let t=Math.min(.05,(e-(this._last||e))/1e3);if(this._last=e,this._vis===!1||document.hidden)return;let i=this._bool("still")||this._mq.matches,c=(e-this._t0)/1e3,x=this._aspect,s=this._progress();this._pd=this._pd==null||i?s:this._pd+(s-this._pd)*(1-Math.exp(-t*6));let h=this._pd,A=this._views(),l=A[0];if(i)l=A[Math.max(0,Math.min(M.length,Math.round(h)))];else{let o=Math.min(M.length-1,Math.floor(h)),a=O(.2,.8,h-o),v=A[o],n=A[o+1];l={gb:v.gb.map((I,L)=>G(I,n.gb[L],a)),fu:G(v.fu,n.fu,a),fv:G(v.fv,n.fv,a),tx:G(v.tx,n.tx,a),ty:G(v.ty,n.ty,a),mh:Math.exp(G(Math.log(v.mh),Math.log(n.mh),a))}}let T=l.tx-(l.fu-.5)*l.mh*U/x,w=l.ty-(l.fv-.5)*l.mh,r={x:(T-.5)*x,y:.5-w,w:l.mh*U,h:l.mh};this._museG.position.set(r.x,r.y,0),this._sheet.scale.set(r.w,r.h,1);{let o=l.gb,a=.5+(r.x+((o[0]+o[2])/2/C-.5)*r.w)/x,v=.5-(r.y+(.5-(o[1]+o[3])/2/E)*r.h),n=Math.max(.12,(o[2]-o[0])/C*r.w/x*.9),I=Math.max(.12,(o[3]-o[1])/E*r.h*.9),L=[a,v,n,I].map(R=>R.toFixed(3)).join();L!==this._gk&&(this._gk=L,this._glow.style.background="radial-gradient(ellipse "+(n*100).toFixed(1)+"% "+(I*100).toFixed(1)+"% at "+(a*100).toFixed(1)+"% "+(v*100).toFixed(1)+"%, rgba(228,189,145,0.10), rgba(228,189,145,0.03) 55%, rgba(33,27,35,0) 100%)")}let u=this._s||(this._s={px:0,py:0,lu:.6,lv:.66}),p=0,d=0,_=.6,B=.68;if(!i){let o=this.getBoundingClientRect(),a=this._ptr;if(a&&a.x>=o.left&&a.x<=o.right&&a.y>=o.top&&a.y<=o.bottom){let v=(a.x-o.left)/o.width,n=(a.y-o.top)/o.height;p=v-.5,d=n-.5,_=((v-.5)*x-r.x)/r.w+.5,B=(.5-n-r.y)/r.h+.5}else{p=.16*Math.sin(c*.21),d=.1*Math.sin(c*.17+1.3);let v=l.fu,n=1-l.fv;_=v+.1+.12*Math.sin(c*.23)/Math.max(1,l.mh),B=n+.08+.08*Math.cos(c*.19)/Math.max(1,l.mh)}}let F=i?1:1-Math.exp(-t*3.2),b=i?1:1-Math.exp(-t*4.5);u.px+=(p-u.px)*F,u.py+=(d-u.py)*F,u.lu+=(_-u.lu)*b,u.lv+=(B-u.lv)*b;let z=this._num("tilt",3)*Math.PI/180/Math.max(1,l.mh*.8);this._museG.rotation.y=u.px*2*z,this._museG.rotation.x=u.py*1.4*z,this._cam.position.x=i?0:u.px*.03,this._cam.position.y=i?0:-u.py*.02;let k=M.map((o,a)=>1-O(.18,.6,Math.abs(h-(a+1)))),P=this._num("blink",2),y=0;if(!i&&P>0&&c>2.6){let o=(c-2.6)%P;y=o<.075?Math.pow(o/.075,2):o<.105?1:o<.225?1-(1-Math.pow(1-(o-.105)/.12,3)):0}let m=this._mu,S=i?1.3:1.3*(1-Math.pow(1-Math.min(1,c/2.2),3));m.uLight.value.set(u.lu,u.lv),m.uFoil.value=this._num("foil",1),m.uReveal.value=S,m.uSheen.value=(i?2.2:c*.2)+this._museG.rotation.y*16-this._museG.rotation.x*10,m.uBlink.value=y,m.uTime.value=i?0:c,m.uGlint.value=this._num("glint",1),m.uIrisAmt.value=this._num("irisamt",.9),this._p.irisa&&m.uIrisA.value.set(this._p.irisa),this._p.irisb&&m.uIrisB.value.set(this._p.irisb),m.uAct.value=k;let f=this._p.dust!=="false"&&this._p.dust!==!1;this._pu&&(this._pu.uTime.value=i?0:c,this._pu.uZoom.value=Math.sqrt(l.mh),this._pu.uAct.value=f?k:[0,0,0,0,0,0]),this._du&&(this._du.uTime.value=i?0:c,this._du.uAspect.value=x,this._du.uAmb.value=f?Math.min(1,S):0),this._r.render(this._scene,this._cam)}}X.forEach(g=>Object.defineProperty(D.prototype,g,{get(){return this._p[g]},set(e){this._p[g]=e},configurable:!0})),customElements.define("muse-story",D)})();
