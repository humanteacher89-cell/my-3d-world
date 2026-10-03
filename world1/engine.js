/* =====================================================================
   휴먼쌤 월드 엔진 v0.1 (2026-10-01, XR자료제작팀장)
   -----------------------------------------------------------------
   하늘섬(sky-island.html)의 진행 코드만 떼어 낸 것이다.
   - 선택지를 눌러 자동으로 이동, 체크리스트, 카메라 연출, 캐릭터, 엔딩, 문.
   - 내용(미션·대사·이름)은 window.WORLD_CONFIG(설정 파일)에서 읽는다.
   - 무대(배경)는 stage 프리셋으로 갈아 끼운다. 지금은 'placeholder'(임시 원형 무대) 하나.
   의존: three.js r147 UMD (+ 선택: EffectComposer/UnrealBloomPass/GammaCorrectionShader)
   ===================================================================== */
(function(){
'use strict';
const $=s=>document.querySelector(s);
// 소리(audio.js). 없거나 실패해도 월드는 그대로 돈다
const SND=(fn,a,b)=>{try{const W=window.WorldAudio;if(W&&W[fn])W[fn](a,b);}catch(e){}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const ez=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const cleanText=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim().slice(0,n);
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
const tpl=(s,vars)=>String(s==null?'':s).replace(/\{(\w+)\}/g,(m,k)=>vars&&vars[k]!=null?vars[k]:m);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function distSeg(px,pz,A,B){const vx=B.x-A.x,vz=B.z-A.z;const l2=vx*vx+vz*vz||1e-6;const t=clamp(((px-A.x)*vx+(pz-A.z)*vz)/l2,0,1);return Math.hypot(px-(A.x+vx*t),pz-(A.z+vz*t));}

const UI_HTML=`
<canvas id="c" aria-label="3D 월드"></canvas>
<div id="brand"><span class="k"></span><b></b></div>
<section id="checklist" class="panel" aria-label="미션 목록">
  <button id="clHead" aria-expanded="true"><span id="clTitle"></span><b id="clCount"></b><span class="chev" aria-hidden="true">▾</span></button>
  <ol id="clList"></ol>
</section>
<section id="journey" class="panel" hidden aria-label="선택지"><div id="jWhere"></div><div id="jBtns"></div></section>
<section id="talk" class="panel" hidden role="dialog" aria-live="polite"><div class="who"><b id="talkName"></b><span id="talkRole"></span></div><p id="talkText"></p><div id="talkBtns"></div></section>
<section id="card" class="panel" hidden role="dialog" aria-labelledby="cardTitle">
  <div id="cardEyebrow"></div><h2 id="cardTitle"></h2>
  <p id="cardReply"></p><p id="cardText"></p><p id="cardMore"></p><div id="cardPending" hidden></div>
  <div id="cardSrc"></div><button id="cardClose"></button>
</section>
<div id="toast" class="panel" role="status" aria-live="polite"></div>
<div id="joy" hidden aria-label="걷기 조이스틱"><div id="joyKnob"></div></div>
<section id="say" class="panel" hidden aria-live="polite"><b id="sayName"></b><p id="sayText"></p></section>
<div id="mpBadge" class="panel" hidden role="status"></div>
<section id="mpName" class="panel" hidden role="dialog" aria-labelledby="mpNameT"><b id="mpNameT"></b><input id="mpNameIn" maxlength="12" autocomplete="off"><button id="mpNameGo" class="jb hot"></button></section>
<div id="cine" hidden aria-live="polite"><div class="bar top"></div><div class="bar bot"></div><button id="cineSkip"></button><div id="cineTitle"></div>
  <div id="cineSubs"><div id="cineWho"></div><p id="cineText"></p></div><span id="cineNext" hidden></span><div id="cineFade"></div></div>
<div id="intro"><p class="kicker"></p><h1></h1><p class="sub"></p><button id="introGo"></button><button id="introSkip"></button></div>
<div id="end" hidden><div class="box"><p class="kicker"></p><h1></h1><p class="sub"></p><button id="endExit"></button><small id="endVer"></small></div>
  <div class="btns"><button id="endReplay"></button><button id="endRestart"></button></div>
  <div id="exit" hidden><p class="kicker"></p><h1></h1><p class="sub"></p><a id="exitLink" hidden></a></div></div>`;

function start(CFG){
  if(!document.body){addEventListener('DOMContentLoaded',()=>start(CFG),{once:true});return;}
  document.body.insertAdjacentHTML('beforeend',UI_HTML);
  if(!window.THREE){document.body.insertAdjacentHTML('beforeend','<p class="fatal">3D 엔진을 불러오지 못했어요. 새로고침해 주세요.</p>');return;}
  THREE.ColorManagement.legacyMode=false;
  const V=Object.assign({},CFG.vars||{});const T_=(s,extra)=>tpl(s,extra?Object.assign({},V,extra):V);
  const UI=CFG.ui||{},M=CFG.missions||[],KEY=(CFG.id||'world')+':';
  const canvas=$('#c');
  let vw=0,vh=0,T=0;
  $('#brand .k').textContent=T_(CFG.kicker);$('#brand b').textContent=T_(CFG.title);
  document.title=T_(CFG.title);

  /* ---------- renderer / scene ---------- */
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.96;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const ST=CFG.stage||{},SKY=ST.sky||{top:'#5f87c9',hor:'#dfe9f3',bot:'#f4efe6'};
  scene.fog=new THREE.Fog(new THREE.Color(ST.fog||SKY.hor),28,70);
  const camera=new THREE.PerspectiveCamera(52,1,0.05,400);
  // ctr: 하늘 구의 중심(문 너머 도시에서는 도시 가운데로 옮긴다)
  const skyU={top:{value:new THREE.Color(SKY.top)},hor:{value:new THREE.Color(SKY.hor)},bot:{value:new THREE.Color(SKY.bot)},ctr:{value:new THREE.Vector3()}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(320,40,20),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,hor,bot,ctr;varying vec3 vW;void main(){float h=normalize(vW-ctr).y;vec3 c=h>0.?mix(hor,top,pow(h,0.55)):mix(hor,bot,pow(-h,0.7));gl_FragColor=linearToOutputTexel(vec4(c,1.));}'}));
  scene.add(sky);
  const hemi=new THREE.HemisphereLight('#e6f0ff','#8c7a66',0.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff3dc',1.45);sun.position.set(18,26,14);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.near=5;sun.shadow.camera.far=80;
  sun.shadow.camera.left=sun.shadow.camera.bottom=-14;sun.shadow.camera.right=sun.shadow.camera.top=14;sun.shadow.bias=-0.0008;sun.shadow.normalBias=0.02;
  scene.add(sun,sun.target);
  let composer=null,bloomPass=null,useBloom=true;
  if(THREE.EffectComposer&&THREE.UnrealBloomPass&&THREE.GammaCorrectionShader){try{
    const rt=new THREE.WebGLRenderTarget(innerWidth||2,innerHeight||2,{type:THREE.HalfFloatType,samples:4});
    composer=new THREE.EffectComposer(renderer,rt);composer.addPass(new THREE.RenderPass(scene,camera));
    bloomPass=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth||2,innerHeight||2),0.28,0.55,0.9);composer.addPass(bloomPass);
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));}catch(e){composer=null;bloomPass=null;}}

  /* ---------- textures / small helpers ---------- */
  function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
  const GLOW=canvasTex(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});
  const std=(color,o={})=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:.8},o));
  function shadowize(o,cast=true,recv=true){o.traverse(m=>{if(m.isMesh){m.castShadow=cast&&!m.userData.noShadow;m.receiveShadow=recv;}});return o;}
  function textSprite(){const c=document.createElement('canvas');c.width=512;c.height=160;const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false,fog:false}));s.userData.cv=c;s.renderOrder=5;return s;}
  function drawTag(s,name,color){const c=s.userData.cv,g=c.getContext('2d');g.clearRect(0,0,512,160);
    g.font='600 44px "IBM Plex Sans KR",sans-serif';const w=Math.min(480,g.measureText(name).width+56);
    g.fillStyle='rgba(18,22,44,.72)';g.beginPath();if(g.roundRect)g.roundRect(256-w/2,92,w,60,30);else g.rect(256-w/2,92,w,60);g.fill();
    g.fillStyle=color;g.beginPath();g.arc(256-w/2+26,122,8,0,7);g.fill();
    g.fillStyle='#f7eee2';g.textAlign='center';g.textBaseline='middle';g.fillText(name,256+10,123,w-60);s.material.map.needsUpdate=true;}
  function drawBubble(s,text){const c=s.userData.cv,g=c.getContext('2d');g.clearRect(0,0,512,160);
    g.font='500 34px "IBM Plex Sans KR",sans-serif';const lines=[];let cur='';
    for(const ch of [...text]){if(g.measureText(cur+ch).width>440){lines.push(cur);cur=ch;if(lines.length===2)break;}else cur+=ch;}
    if(lines.length<2&&cur)lines.push(cur);else if(cur&&lines.length===2)lines[1]=lines[1].slice(0,-1)+'…';
    const w=Math.max(...lines.map(l=>g.measureText(l).width))+44,h=lines.length*42+26,y0=140-h;
    g.fillStyle='rgba(255,252,246,.95)';g.beginPath();if(g.roundRect)g.roundRect(256-w/2,y0,w,h,22);else g.rect(256-w/2,y0,w,h);g.fill();
    g.beginPath();g.moveTo(244,y0+h);g.lineTo(256,y0+h+16);g.lineTo(268,y0+h);g.fill();
    g.fillStyle='#231d2e';g.textAlign='center';g.textBaseline='top';lines.forEach((l,i)=>g.fillText(l,256,y0+14+i*42));s.material.map.needsUpdate=true;}
  let toastT=0;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3400);}

  /* =====================================================================
     STAGE — 'placeholder': 임시 원형 무대. 무대가 정해지면 이 함수만 바꾼다.
     반환: floorAt(x,z), spots[], door, 좌표들
     ===================================================================== */
  function buildPlaceholderStage(){
    const R=9,g=new THREE.Group();scene.add(g);
    const floorCol=ST.floor||'#ebe2d3',edgeCol=ST.edge||'#ffc46b';
    const top=new THREE.Mesh(new THREE.CylinderGeometry(R,R+0.35,0.9,96),std(floorCol,{roughness:.92}));top.position.y=-0.45;top.receiveShadow=true;g.add(top);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(R-0.08,0.035,10,160),new THREE.MeshStandardMaterial({color:edgeCol,emissive:edgeCol,emissiveIntensity:.9,roughness:.4}));ring.rotation.x=Math.PI/2;ring.position.y=0.012;g.add(ring);
    // faint radial lines so the floor reads as a stage, not a disc
    const lineMat=new THREE.MeshBasicMaterial({color:'#d9cdb9',transparent:true,opacity:.55,depthWrite:false});
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const l=new THREE.Mesh(new THREE.PlaneGeometry(0.03,R-1.4),lineMat);l.rotation.x=-Math.PI/2;l.rotation.z=a;l.position.set(Math.sin(a)*(R/2+0.1),0.006,Math.cos(a)*(R/2+0.1));l.rotation.set(-Math.PI/2,0,-a);g.add(l);}
    const inner=new THREE.Mesh(new THREE.RingGeometry(2.4,2.46,96),lineMat);inner.rotation.x=-Math.PI/2;inner.position.y=0.006;g.add(inner);
    // under-cloud so the stage floats
    const cloudMat=std('#f6f1ea',{roughness:1});const rnd=mulberry32(7);
    for(let i=0;i<7;i++){const a=rnd()*Math.PI*2,r=rnd()*4;const c=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),cloudMat);c.position.set(Math.sin(a)*r,-1.9-rnd()*0.8,Math.cos(a)*r);c.scale.set(4.5+rnd()*3,1.3+rnd()*0.6,4.5+rnd()*3);c.castShadow=false;g.add(c);}
    const floorAt=(x,z)=>Math.hypot(x,z)<=R+0.3?0:-30;
    // spots
    const SPOT_POS=[[-6.4,0.6],[6.4,0.6],[0,6.6]];
    const spots=M.map((m,i)=>{const p=SPOT_POS[i%SPOT_POS.length];const pos=new THREE.Vector3(p[0],0,p[1]);const toC=new THREE.Vector3(-pos.x,0,-pos.z).normalize();
      const stand=pos.clone().addScaledVector(toC,1.75);const col=new THREE.Color(m.color||'#ffffff');
      const sg=new THREE.Group();sg.position.copy(pos);g.add(sg);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.25,0.14,48),std('#e9dfcc',{roughness:.9}));pad.position.y=0.07;sg.add(pad);
      const padRing=new THREE.Mesh(new THREE.TorusGeometry(1.1,0.03,8,80),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.1,roughness:.4}));padRing.rotation.x=Math.PI/2;padRing.position.y=0.15;sg.add(padRing);
      const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,0.95,24),std('#d9cdb8',{roughness:.85}));ped.position.y=0.62;sg.add(ped);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.24,0.08,24),std('#cbbda6'));cap.position.y=1.12;sg.add(cap);
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.26,32,24),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.7,roughness:.25}));orb.position.y=1.65;orb.castShadow=false;sg.add(orb);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:col,transparent:true,opacity:.75,depthWrite:false,toneMapped:false}));glow.scale.setScalar(1.7);glow.position.y=1.65;sg.add(glow);
      const light=new THREE.PointLight(col,0.55,4,2);light.position.y=1.8;sg.add(light);
      // sign on the outer side, facing the center
      const out=toC.clone().negate();const sign=new THREE.Group();sign.position.copy(out.clone().multiplyScalar(1.45));sign.lookAt(new THREE.Vector3(0,0,0).sub(sign.position).multiplyScalar(-1));sign.rotation.y=Math.atan2(-out.x,-out.z);sg.add(sign);
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,1.35,10),std('#9a7a5a'));post.position.y=0.67;sign.add(post);
      const tex=canvasTex(512,320,gg=>{gg.fillStyle='#fffaf0';gg.fillRect(0,0,512,320);gg.fillStyle=m.color||'#333';gg.fillRect(0,0,22,320);
        gg.fillStyle='#2a2430';gg.font='900 90px "Noto Sans KR",sans-serif';gg.fillText(m.label||'',56,124);
        gg.fillStyle='#5a5262';gg.font='500 38px "Noto Sans KR",sans-serif';gg.fillText(m.title||'',56,206,430);
        gg.fillStyle='#8a8290';gg.font='400 30px "Noto Sans KR",sans-serif';gg.fillText(m.sub||'',56,262,430);});
      const board=new THREE.Mesh(new THREE.BoxGeometry(1.25,0.8,0.05),[std('#8a6a4a'),std('#8a6a4a'),std('#8a6a4a'),std('#8a6a4a'),new THREE.MeshStandardMaterial({map:tex,roughness:.9}),std('#8a6a4a')]);board.position.y=1.5;sign.add(board);
      shadowize(sg,true,true);orb.castShadow=false;glow.castShadow=false;
      return{i,m,pos,stand,group:sg,orb,glow,light,padRing,col,yaw:Math.atan2(pos.x-stand.x,pos.z-stand.z)};});
    // door (gate) at the back
    const D=new THREE.Vector3(0,0,-8.0);const door=new THREE.Group();door.position.copy(D);g.add(door);
    const stone=std('#efe7da',{roughness:.7});
    for(const s of[-1,1]){const pil=new THREE.Mesh(new THREE.BoxGeometry(0.55,3.8,0.55),stone);pil.position.set(1.55*s,1.9,0);door.add(pil);
      const base=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.25,0.8),stone);base.position.set(1.55*s,0.125,0);door.add(base);}
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(4.0,0.55,0.65),stone);lintel.position.y=4.05;door.add(lintel);
    const lintelRing=new THREE.Mesh(new THREE.BoxGeometry(4.0,0.06,0.68),new THREE.MeshStandardMaterial({color:edgeCol,emissive:edgeCol,emissiveIntensity:.8}));lintelRing.position.y=3.76;door.add(lintelRing);
    const panelMat=std('#f7f2ea',{roughness:.6,metalness:.05});const hinges=[-1,1].map(s=>{const h=new THREE.Group();h.position.set(1.28*s,0,0);door.add(h);
      const p=new THREE.Mesh(new THREE.BoxGeometry(1.28,3.5,0.12),panelMat);p.position.set(-0.64*s,1.75,0);h.add(p);
      const knob=new THREE.Mesh(new THREE.SphereGeometry(0.06,12,10),std(edgeCol,{metalness:.4,roughness:.3}));knob.position.set(-1.18*s,1.7,0.09);h.add(knob);return{h,s};});
    const glowPlane=new THREE.Mesh(new THREE.PlaneGeometry(2.6,3.55),new THREE.MeshBasicMaterial({color:'#fff4dc',transparent:true,opacity:0,toneMapped:false,depthWrite:false}));glowPlane.position.set(0,1.78,-0.1);door.add(glowPlane);
    const doorLight=new THREE.PointLight('#ffe7bf',0,9,2);doorLight.position.set(0,2,0.8);door.add(doorLight);
    shadowize(door,true,true);glowPlane.castShadow=false;
    const doorOpen=k=>{hinges.forEach(({h,s})=>h.rotation.y=-s*1.75*k);glowPlane.material.opacity=k*0.95;doorLight.intensity=k*3.2;};
    // floating motes
    const N=70,mg=new THREE.BufferGeometry(),mp=new Float32Array(N*3),mb=[];const r2=mulberry32(11);
    for(let i=0;i<N;i++){const a=r2()*Math.PI*2,r=3+r2()*13,y=0.4+r2()*6;mb.push([Math.sin(a)*r,y,Math.cos(a)*r,r2()*6.28]);mp.set(mb[i].slice(0,3),i*3);}
    mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
    const motes=new THREE.Points(mg,new THREE.PointsMaterial({color:'#fff2d6',size:0.14,map:GLOW,transparent:true,opacity:.7,depthWrite:false,sizeAttenuation:true}));g.add(motes);
    const updateStage=(dt,T)=>{const a=mg.attributes.position;for(let i=0;i<N;i++){const b=mb[i];a.setXYZ(i,b[0]+Math.sin(T*0.35+b[3])*0.6,b[1]+Math.sin(T*0.7+b[3]*2)*0.25,b[2]+Math.cos(T*0.3+b[3])*0.6);}a.needsUpdate=true;
      spots.forEach(s=>{s.orb.position.y=1.65+Math.sin(T*1.4+s.i)*0.08;s.glow.position.y=s.orb.position.y;s.orb.rotation.y+=dt*0.6;});};
    return{group:g,R,floorAt,spots,door:{group:door,pos:D,open:doorOpen},guide:{pos:new THREE.Vector3(0,0,-1.0),facing:0},hub:new THREE.Vector3(0,0,1.15),
      doorNode:new THREE.Vector3(0,0,-5.3),gate:new THREE.Vector3(0,0,-7.55),human:new THREE.Vector3(0,0,-6.2),meet:new THREE.Vector3(0,0,-3.5),updateStage};
  }
  const STAGE=buildPlaceholderStage();
  // 문 너머 도시는 x=CITY_X에 따로 짓는다(월드 1 무대와 겹치지 않게). 그쪽 바닥은 평지
  const CITY_X=300,floorAt=(x,z)=>x>CITY_X-120?0:STAGE.floorAt(x,z);

  /* =====================================================================
     CHARACTER — 하늘섬 Char 그대로 (절차적 몸체, 발 IK, 표정). 머리 모양 2=짧은 머리 추가
     ===================================================================== */
  const SKIN=['#f6d3b5','#eab690','#c88b61','#8a5638'];
  const HAIR=['#2a1c15','#6e3f22','#d9a65b','#e8e2da','#e38aa6','#3d8c88'];
  const COAT=['#3b6db3','#d5504c','#4b9a5c','#e3a432','#8b6bc2','#efeae0'];
  const SCARF=['#ff8f45','#ffd35c','#6fd0c8','#ff7fa5','#ffffff','#34343f'];
  const CH={L1:0.38,L2:0.36,ANK:0.075,HIP:0.84,HJ:-0.05,SC:0.9};
  const rimU={color:{value:new THREE.Color('#ffd9b8')},strength:{value:.35}};
  function charMat(color,o={}){const m=new THREE.MeshStandardMaterial(Object.assign({color,roughness:.75},o));
    m.onBeforeCompile=sh=>{sh.uniforms.rimColor=rimU.color;sh.uniforms.rimStrength=rimU.strength;
      sh.fragmentShader='uniform vec3 rimColor;uniform float rimStrength;\n'+sh.fragmentShader.replace('#include <output_fragment>',
        'float rimF=1.0-clamp(dot(normal,normalize(vViewPosition)),0.,1.);outgoingLight+=rimColor*pow(rimF,3.)*rimStrength;\n#include <output_fragment>');};
    return m;}
  function limbGeo(len,r1,r2,seg=14){const pts=[],n=6;
    for(let i=0;i<=n;i++){const t=-Math.PI/2+(i/n)*Math.PI/2;pts.push(new THREE.Vector2(Math.max(Math.cos(t)*r2,0.0005),-len+Math.sin(t)*r2));}
    for(let i=1;i<=n;i++){const t=(i/n)*Math.PI/2;pts.push(new THREE.Vector2(Math.max(Math.cos(t)*r1,0.0005),Math.sin(t)*r1));}
    return new THREE.LatheGeometry(pts,seg);}
  function lathe(arr,seg=28){return new THREE.LatheGeometry(arr.map(([r,y])=>new THREE.Vector2(Math.max(r,0.0005),y)),seg);}
  const CGEO=(()=>{const g={};
    g.torso=lathe([[0,-0.03],[0.112,-0.02],[0.142,0.04],[0.136,0.14],[0.142,0.25],[0.157,0.34],[0.153,0.42],[0.128,0.48],[0.075,0.52],[0,0.53]]);g.torso.scale(1,1,0.78);
    g.hem=lathe([[0.146,-0.02],[0.16,0.02],[0.15,0.07],[0.14,0.075]]);g.hem.scale(1,1,0.8);
    g.shorts=lathe([[0,-0.14],[0.09,-0.145],[0.148,-0.11],[0.152,-0.03],[0.142,0.04],[0,0.05]]);g.shorts.scale(1,1,0.8);
    g.collar=new THREE.TorusGeometry(0.075,0.03,12,28);g.neck=limbGeo(0.07,0.042,0.046);
    g.thigh=limbGeo(CH.L1,0.068,0.056);g.shin=limbGeo(CH.L2,0.054,0.043);g.upper=limbGeo(0.22,0.05,0.043);g.fore=limbGeo(0.19,0.042,0.036);
    g.cuff=new THREE.TorusGeometry(0.04,0.014,8,18);g.sphere=new THREE.SphereGeometry(1,32,24);g.lowSphere=new THREE.SphereGeometry(1,16,12);
    g.hairCap=new THREE.SphereGeometry(0.184,40,28,0,Math.PI*2,0,Math.PI*0.56);g.lock=limbGeo(0.1,0.034,0.009,10);g.longLock=limbGeo(0.15,0.036,0.012,10);
    g.tail=limbGeo(0.11,0.046,0.03,12);g.tie=new THREE.TorusGeometry(0.03,0.012,8,16);g.sole=new THREE.BoxGeometry(0.115,0.022,0.225);
    g.mouth=new THREE.TorusGeometry(0.02,0.0055,6,14,Math.PI);g.blush=new THREE.CircleGeometry(0.024,20);g.strap=new THREE.TorusGeometry(0.1,0.011,6,18,Math.PI);
    g.scarfTail=new THREE.BoxGeometry(0.075,0.15,0.022).translate(0,-0.075,0);return g;})();
  const PF=['hy','hx','hry','hrz','sx','sz','cy','nx','hdx','hdy','hdz','px','pz','py','lth','lkn','lan','rth','rkn','ran','lthz','rthz','lsx','lsz','lsy','lel','rsx','rsz','rsy','rel'];
  const newPose=()=>{const p={};for(const k of PF)p[k]=0;p.hy=CH.HIP;return p;};
  const spring=(b,tx,tz,k,c,dt)=>{b.vx+=((tx-b.x)*k-b.vx*c)*dt;b.x+=b.vx*dt;b.vz+=((tz-b.z)*k-b.vz*c)*dt;b.z+=b.vz*dt;};
  const tmpV=new THREE.Vector3();
  class Char{
    constructor(look,opts={}){
      const r=this.root=new THREE.Group();const inner=this.inner=new THREE.Group();inner.scale.setScalar(CH.SC);r.add(inner);
      const pose=this.pose=new THREE.Group();inner.add(pose);
      const Mt=this.mats={skin:charMat('#fff',{roughness:.62}),hair:charMat('#fff',{roughness:.45}),coat:charMat('#fff',{roughness:.8}),scarf:charMat('#fff',{roughness:.9}),
        pants:charMat(opts.pants||'#2b2f3e',{roughness:.85}),shoe:charMat(opts.shoe||'#f4f1ea',{roughness:.55}),sole:charMat('#3a3434',{roughness:.9}),bag:charMat('#8a5a36',{roughness:.7}),
        eyeW:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.25}),iris:new THREE.MeshStandardMaterial({color:'#2a2340',roughness:.15}),
        hl:new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),mouth:new THREE.MeshStandardMaterial({color:'#8a3a3a',roughness:.6}),
        blush:new THREE.MeshBasicMaterial({color:'#ff8a8a',transparent:true,opacity:.35,depthWrite:false})};
      const mk=(geo,mat,x,y,z,parent,shadow=true)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;parent.add(m);return m;};
      const G=(x,y,z,parent)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
      const hips=this.hips=G(0,CH.HIP,0,pose);mk(CGEO.shorts,Mt.pants,0,0,0,hips);
      this.leg=[-1,1].map(s=>{const th=G(0.092*s,CH.HJ,0,hips);mk(CGEO.thigh,Mt.pants,0,0,0,th);const kn=G(0,-CH.L1,0,th);mk(CGEO.shin,Mt.pants,0,0,0,kn);
        const an=G(0,-CH.L2,0,kn);const sh=mk(CGEO.sphere,Mt.shoe,0,-0.03,0.035,an);sh.scale.set(0.064,0.047,0.118);
        mk(CGEO.sole,Mt.sole,0,-0.066,0.03,an);const lace=mk(CGEO.lowSphere,Mt.sole,0,-0.005,0.07,an);lace.scale.set(0.03,0.012,0.04);return{th,kn,an};});
      const spine=this.spine=G(0,0,0,hips);mk(CGEO.torso,Mt.coat,0,0,0,spine);mk(CGEO.hem,Mt.coat,0,0,0,spine);
      const zip=mk(new THREE.BoxGeometry(0.012,0.36,0.01),Mt.sole,0,0.19,0.118,spine);zip.rotation.x=-0.08;
      const chest=this.chest=G(0,0.36,0,spine);
      const bag=this.bag=G(0,0.1,-0.11,chest);bag.visible=opts.bag!==false;
      const bm=mk(CGEO.lowSphere,Mt.bag,0,-0.13,-0.05,bag);bm.scale.set(0.12,0.15,0.066);const fl=mk(CGEO.lowSphere,Mt.bag,0,-0.04,-0.06,bag);fl.scale.set(0.118,0.06,0.06);
      const pk=mk(CGEO.lowSphere,Mt.scarf,0,-0.17,-0.108,bag);pk.scale.set(0.07,0.05,0.022);
      for(const s of[-1,1]){const st=mk(CGEO.strap,Mt.bag,0.085*s,0.07,0,chest);st.rotation.y=Math.PI/2;st.visible=opts.bag!==false;}
      const col=mk(CGEO.collar,Mt.scarf,0,0.155,0,chest);col.rotation.x=Math.PI/2;col.scale.set(1,1.15,1);
      const sa=this.scarfA=G(0.05,0.15,-0.09,chest);mk(CGEO.scarfTail,Mt.scarf,0,0,0,sa);const sb=this.scarfB=G(0,-0.14,0,sa);const st2=mk(CGEO.scarfTail,Mt.scarf,0,0,0,sb);st2.scale.set(0.9,0.9,1);
      const neck=this.neck=G(0,0.15,0,chest);mk(CGEO.neck,Mt.skin,0,0.06,0,neck);const head=this.head=G(0,0.06,0,neck);
      const skull=mk(CGEO.sphere,Mt.skin,0,0.16,0,head);skull.scale.set(0.17,0.162,0.165);const cheek=mk(CGEO.sphere,Mt.skin,0,0.11,0.035,head);cheek.scale.set(0.14,0.1,0.12);
      for(const s of[-1,1]){const e=mk(CGEO.lowSphere,Mt.skin,0.166*s,0.15,0,head);e.scale.set(0.028,0.04,0.024);}
      const nose=mk(CGEO.lowSphere,Mt.skin,0,0.128,0.163,head);nose.scale.setScalar(0.013);
      this.eyes=[-1,1].map(s=>{const eg=G(0.058*s,0.162,0.148,head);eg.rotation.y=0.36*s;const w=mk(CGEO.sphere,Mt.eyeW,0,0,0,eg,false);w.scale.set(0.03,0.037,0.014);
        const ir=mk(CGEO.sphere,Mt.iris,0,-0.003,0.008,eg,false);ir.scale.set(0.022,0.028,0.01);const h=mk(CGEO.lowSphere,Mt.hl,0.007,0.01,0.017,eg,false);h.scale.setScalar(0.0065);
        const h2=mk(CGEO.lowSphere,Mt.hl,-0.006,-0.012,0.016,eg,false);h2.scale.setScalar(0.0035);return eg;});
      this.brows=[-1,1].map(s=>{const b=mk(CGEO.lowSphere,Mt.hair,0.058*s,0.212,0.157,head,false);b.scale.set(0.026,0.0065,0.008);b.rotation.z=-0.14*s;return b;});
      const mo=this.mouth=mk(CGEO.mouth,Mt.mouth,0,0.093,0.158,head,false);mo.rotation.z=Math.PI;
      for(const s of[-1,1]){const b=mk(CGEO.blush,Mt.blush,0.094*s,0.118,0.136,head,false);b.rotation.y=0.62*s;}
      const cap=mk(CGEO.hairCap,Mt.hair,0,0.172,-0.004,head);cap.rotation.x=-0.42;const back=mk(CGEO.sphere,Mt.hair,0,0.15,-0.032,head);back.scale.set(0.177,0.168,0.165);
      [-0.78,-0.47,-0.16,0.16,0.47,0.78].forEach((a,i)=>{const g=G(Math.sin(a)*0.15,0.292-Math.abs(a)*0.03,Math.cos(a)*0.118,head);g.rotation.order='YXZ';g.rotation.set(-0.62-Math.abs(a)*0.25,a,(i%2?0.08:-0.08));mk(CGEO.lock,Mt.hair,0,0,0,g);});
      for(const s of[-1,1]){const g=G(0.152*s,0.22,0.065,head);g.rotation.set(-0.08,0,0.12*s);mk(CGEO.longLock,Mt.hair,0,0,0,g);}
      const pony=this.pony=G(0,0,0,head);mk(CGEO.tie,Mt.scarf,0,0.215,-0.168,pony);
      const tA=this.tailA=G(0,0.215,-0.175,pony);mk(CGEO.tail,Mt.hair,0,0,0,tA);const tB=this.tailB=G(0,-0.11,0,tA);mk(CGEO.tail,Mt.hair,0,0,0,tB).scale.set(0.9,1,0.9);
      const tC=this.tailC=G(0,-0.105,0,tB);mk(CGEO.tail,Mt.hair,0,0,0,tC).scale.set(0.75,0.9,0.75);
      const bob=this.bob=G(0,0,0,head);[-2.3,-1.7,-1.2,Math.PI,1.2,1.7,2.3].forEach(a=>{const g=G(Math.sin(a)*0.155,0.22,Math.cos(a)*0.15,bob);g.rotation.order='YXZ';g.rotation.set(-0.25,a,0);mk(CGEO.longLock,Mt.hair,0,0,0,g);});
      this.arm=[-1,1].map(s=>{const sh=G(0.172*s,0.115,0,chest);mk(CGEO.upper,Mt.coat,0,0,0,sh);const el=G(0,-0.22,0,sh);mk(CGEO.fore,Mt.coat,0,0,0,el);
        const cf=mk(CGEO.cuff,Mt.scarf,0,-0.185,0,el);cf.rotation.x=Math.PI/2;const hd=G(0,-0.2,0,el);const palm=mk(CGEO.lowSphere,Mt.skin,0,-0.035,0.004,hd);palm.scale.set(0.036,0.048,0.027);
        const th=mk(CGEO.lowSphere,Mt.skin,-0.026*s,-0.02,0.02,hd);th.scale.set(0.014,0.022,0.013);th.rotation.z=0.5*s;return{sh,el,hd};});
      this.tag=textSprite();this.tag.scale.set(1.0,0.31,1);this.tag.position.y=1.98;r.add(this.tag);this.tag.visible=false;
      this.bubble=textSprite();this.bubble.scale.set(1.25,0.39,1);this.bubble.position.y=2.32;r.add(this.bubble);this.bubble.visible=false;
      shadowize(inner,true,false);inner.traverse(m=>{if(m.isMesh&&(m.material===Mt.blush||m.material===Mt.hl||m.material===Mt.eyeW||m.material===Mt.iris||m.material===Mt.mouth))m.castShadow=false;});
      this.st={init:false,vel:new THREE.Vector3(),prev:new THREE.Vector3(),phase:0,m:0,run:0,wAir:0,accF:0,accR:0,turn:0,facing:0,land:0,blinkT:1.5,blink:0,look:0,lookT:2,em:null,
        sp:{a:{x:0,vx:0,z:0,vz:0},b:{x:0,vx:0,z:0,vz:0},c:{x:0,vx:0,z:0,vz:0},sa:{x:0,vx:0,z:0,vz:0},sb:{x:0,vx:0,z:0,vz:0},bag:{x:0,vx:0,z:0,vz:0}},g:newPose(),o:newPose()};
      this.setLook(look||[0,1,0,0,0]);}
    setLook(lk){lk=Array.isArray(lk)?lk:[];const pick=(arr,i)=>arr[Number.isInteger(i)&&i>=0&&i<arr.length?i:0];
      this.look=[0,1,2,3,4].map(i=>Number.isInteger(lk[i])?lk[i]:0);
      this.mats.skin.color.set(pick(SKIN,lk[0]));this.mats.hair.color.set(pick(HAIR,lk[1]));this.mats.coat.color.set(pick(COAT,lk[2]));this.mats.scarf.color.set(pick(SCARF,lk[3]));
      const st=lk[4]===1?1:lk[4]===2?2:0;this.pony.visible=st===0;this.bob.visible=st===1;
      if(this.name!=null)drawTag(this.tag,this.name,pick(COAT,lk[2]));}
    setName(n){n=cleanText(n,16)||'여행자';if(n===this.name)return;this.name=n;drawTag(this.tag,n,COAT[this.look[2]]||COAT[0]);}
    setScale(k){this.inner.scale.setScalar(CH.SC*Math.max(0.001,k));}
    say(text){text=cleanText(text,80);if(!text)return;drawBubble(this.bubble,text);this.bubble.visible=true;this.bubbleT=6;}
    emote(k){if(k!=='wave'&&k!=='dance')return;this.st.em={k,t:0,dur:k==='wave'?2.4:4.2};}
    update(dt,T,inp){
      const s=this.st,pos=inp.pos;if(!s.init){s.prev.copy(pos);s.facing=inp.facing;s.init=true;}
      tmpV.copy(pos).sub(s.prev).divideScalar(Math.max(dt,1e-3));s.prev.copy(pos);if(tmpV.lengthSq()>1600)tmpV.set(0,0,0);
      const k=1-Math.exp(-dt*12),pvx=s.vel.x,pvz=s.vel.z;s.vel.lerp(tmpV,k);
      const hs=Math.hypot(s.vel.x,s.vel.z),f=inp.facing,sf=Math.sin(f),cf=Math.cos(f);
      const aF=((s.vel.x-pvx)*sf+(s.vel.z-pvz)*cf)/Math.max(dt,1e-3),aR=((s.vel.x-pvx)*cf-(s.vel.z-pvz)*sf)/Math.max(dt,1e-3);
      s.accF+=(clamp(aF,-25,25)-s.accF)*k;s.accR+=(clamp(aR,-25,25)-s.accR)*k;
      let dF=f-s.facing;dF=Math.atan2(Math.sin(dF),Math.cos(dF));s.facing=f;s.turn+=(clamp(dF/Math.max(dt,1e-3),-8,8)-s.turn)*k;
      const ap=(key,t,rate)=>{s[key]+=(t-s[key])*Math.min(1,rate*dt);};ap('m',hs>0.25?1:0,8);ap('run',clamp((hs-2.8)/3,0,1),5);s.land*=Math.exp(-dt*7);
      const run=s.run,m=s.m,duty=lerp(0.6,0.38,run),hipDrop=m*(0.05+0.07*run);
      const vert=CH.HIP-hipDrop+CH.HJ-CH.ANK,reachMax=(CH.L1+CH.L2)*0.97,reachH=Math.sqrt(Math.max(0.01,reachMax*reachMax-vert*vert));
      const SL=Math.max(0.22,Math.min(lerp(0.62,1.15,run),reachH*1.9)),shuffle=(1-m)*clamp((Math.abs(s.turn)-0.8)/2,0,1);
      const freq=Math.max(hs>0.05?hs*duty/(SL*CH.SC):0,1.5*shuffle);s.phase=(s.phase+freq*dt)%1;
      const P2=Math.PI*2,ph=s.phase;this.root.position.copy(pos);this.root.rotation.y=f;
      const g=s.g,sc=CH.SC,breathe=Math.sin(T*1.7),lift=lerp(0.08,0.17,run);
      const feet=[0,1].map(i=>{const p=(ph+i*0.5)%1;let z,l,toe;
        if(p<duty){const q=p/duty;z=SL/2-SL*q;l=0;toe=q<0.12?-0.2*(1-q/0.12):0.42*sstep(0.55,1,q);}
        else{const q=(p-duty)/(1-duty),e=q*q*(3-2*q);z=-SL/2+SL*e;l=Math.sin(Math.PI*Math.min(1,q*1.12))*lift;toe=q<0.35?0.42*(1-q/0.35):-0.3*sstep(0.45,1,q);}
        const idleZ=(i?-0.035:0.035)+Math.sin(T*0.5+i)*0.005;z=lerp(idleZ,z,m);l=l*m+(p>=duty?Math.sin(Math.PI*(p-duty)/(1-duty))*0.05*shuffle:0);toe*=m;
        const sx=i?0.1:-0.1;const wx=pos.x+(sx*cf+z*sf)*sc,wz=pos.z+(-sx*sf+z*cf)*sc;const go=clamp((floorAt(wx,wz)-pos.y)/sc,-0.3,0.25);
        return{z,l,go:Number.isFinite(go)?Math.max(go,-0.3):0,fw:z/(SL/2),toe};});
      const drop=Math.min(0,feet[0].go,feet[1].go);
      g.hy=CH.HIP-hipDrop-m*Math.cos(ph*P2*2)*lerp(0.022,0.04,run)+drop-s.land-breathe*0.004*(1-m);
      g.hx=(1-m)*Math.sin(T*0.45)*0.012+m*Math.sin(ph*P2)*lerp(0.028,0.012,run);g.hry=m*Math.sin(ph*P2)*lerp(0.12,0.2,run);g.hrz=m*Math.sin(ph*P2)*0.045+(1-m)*Math.sin(T*0.45)*0.02;
      g.sx=0.03+m*0.05+run*0.22+clamp(s.accF*0.012,-0.12,0.18)+s.land*1.2;g.sz=clamp(-s.turn*hs*0.02,-0.2,0.2);g.cy=-g.hry*1.3;g.nx=-g.sx*0.35;g.hdx=-g.sx*0.35+breathe*0.01*(1-m);
      s.lookT-=dt;if(s.lookT<0){s.lookT=2+Math.random()*4;s.look=m>0.5?0:(Math.random()-.5)*1.1;}
      g.hdy=lerp(g.hdy,s.look*(1-m)-g.cy*0.5,Math.min(1,dt*3));g.hdz=(1-m)*Math.sin(T*0.6)*0.03;g.px=0;g.pz=g.sz*0.5;g.py=0;
      const L1=CH.L1,L2=CH.L2;
      [0,1].forEach(i=>{const ft=feet[i];const hipY=g.hy+CH.HJ;const ty=CH.ANK+ft.go+ft.l;const dy=ty-hipY,dz=ft.z;const dist=clamp(Math.hypot(dy,dz),0.12,L1+L2-0.003);
        const th0=Math.atan2(-dz,-dy);const a1=Math.acos(clamp((L1*L1+dist*dist-L2*L2)/(2*L1*dist),-1,1));const kn=Math.PI-Math.acos(clamp((L1*L1+L2*L2-dist*dist)/(2*L1*L2),-1,1));
        const th=th0-a1;if(i===0){g.lth=th;g.lkn=kn;g.lan=-(th+kn)+ft.toe;g.lthz=-0.03;}else{g.rth=th;g.rkn=kn;g.ran=-(th+kn)+ft.toe;g.rthz=0.03;}});
      const amp=lerp(0.38,0.9,run);g.lsx=-feet[1].fw*amp*m+breathe*0.02*(1-m);g.rsx=-feet[0].fw*amp*m-breathe*0.02*(1-m);
      g.lsz=-(0.1+run*0.16)-(1-m)*0.02;g.rsz=0.1+run*0.16+(1-m)*0.02;g.lsy=0;g.rsy=0;
      g.lel=-(0.15+m*0.12+run*1.05+Math.max(0,-g.lsx)*0.45);g.rel=-(0.15+m*0.12+run*1.05+Math.max(0,-g.rsx)*0.45);
      const o=s.o;for(const kk of PF)o[kk]=g[kk];
      if(s.em){const e=s.em;e.t+=dt;if(e.t>e.dur||(e.k==='dance'&&hs>0.6))s.em=null;else{const w=Math.min(1,e.t/0.25,(e.dur-e.t)/0.3);
        if(e.k==='wave'){o.rsz=lerp(o.rsz,2.5+Math.sin(e.t*11)*0.3,w);o.rsx=lerp(o.rsx,-0.25,w);o.rel=lerp(o.rel,-0.45,w);o.hdz=lerp(o.hdz,0.13,w);o.hdy=lerp(o.hdy,0,w);}
        else{const q=e.t*7.2;o.py+=Math.abs(Math.sin(q))*0.07*w;o.hx+=Math.sin(q)*0.045*w;o.sz+=Math.sin(q)*0.14*w;o.hry+=Math.sin(q*0.5)*0.35*w;
          o.lsz=lerp(o.lsz,-1.7+Math.sin(q)*0.6,w);o.rsz=lerp(o.rsz,1.7+Math.sin(q)*0.6,w);o.lel=lerp(o.lel,-1.3,w);o.rel=lerp(o.rel,-1.3,w);
          o.lsx=lerp(o.lsx,-0.3+Math.cos(q)*0.25,w);o.rsx=lerp(o.rsx,-0.3-Math.cos(q)*0.25,w);o.hdz=lerp(o.hdz,-Math.sin(q)*0.15,w);}}}
      s.actW=(s.actW||0)+((this.act?1:0)-(s.actW||0))*Math.min(1,dt*5);if(this.act)s.lastAct=this.act;
      if(s.actW>0.01&&s.lastAct){const w=s.actW;
        if(s.lastAct==='think'){o.rsx=lerp(o.rsx,-1.45,w);o.rsz=lerp(o.rsz,0.3,w);o.rel=lerp(o.rel,-2.25,w);o.lsx=lerp(o.lsx,-0.55,w);o.lsz=lerp(o.lsz,-0.15,w);o.lel=lerp(o.lel,-1.5,w);
          o.hdz=lerp(o.hdz,0.14,w);o.hdx=lerp(o.hdx,0.06+Math.sin(T*1.3)*0.03,w);o.hdy=lerp(o.hdy,0.15,w);}
        else if(s.lastAct==='open'){o.lsx=lerp(o.lsx,-0.7,w);o.rsx=lerp(o.rsx,-0.7,w);o.lsz=lerp(o.lsz,-0.9,w);o.rsz=lerp(o.rsz,0.9,w);o.lel=lerp(o.lel,-0.4,w);o.rel=lerp(o.rel,-0.4,w);o.hdx=lerp(o.hdx,-0.08,w);}
        else{o.rsx=lerp(o.rsx,-0.55+Math.sin(T*2.6)*0.28,w);o.rsz=lerp(o.rsz,0.28+Math.sin(T*1.7)*0.12,w);o.rel=lerp(o.rel,-1.25+Math.sin(T*3.1)*0.2,w);
          o.lsx=lerp(o.lsx,-0.35+Math.sin(T*2.1+1)*0.2,w);o.lel=lerp(o.lel,-0.9,w);o.hdz=lerp(o.hdz,Math.sin(T*1.1)*0.06,w);o.hdx=lerp(o.hdx,Math.sin(T*2.4)*0.04,w);o.hdy=lerp(o.hdy,0,w);}}
      this.pose.rotation.set(o.px,0,o.pz);this.pose.position.y=o.py;this.hips.position.set(o.hx,o.hy,0);this.hips.rotation.set(0,o.hry,o.hrz);
      this.spine.rotation.set(o.sx,0,o.sz);this.chest.rotation.y=o.cy;this.neck.rotation.x=o.nx;this.head.rotation.set(o.hdx,o.hdy,o.hdz);
      const L=this.leg,A=this.arm;L[0].th.rotation.set(o.lth,0,o.lthz);L[0].kn.rotation.x=o.lkn;L[0].an.rotation.x=o.lan;L[1].th.rotation.set(o.rth,0,o.rthz);L[1].kn.rotation.x=o.rkn;L[1].an.rotation.x=o.ran;
      A[0].sh.rotation.set(o.lsx,o.lsy,o.lsz);A[0].el.rotation.x=o.lel;A[1].sh.rotation.set(o.rsx,o.rsy,o.rsz);A[1].el.rotation.x=o.rel;
      s.blinkT-=dt;if(s.blinkT<0){s.blink=0.13;s.blinkT=1.8+Math.random()*3.5;}const eyeY=s.blink>0?0.12:1;s.blink-=dt;this.eyes.forEach(e=>e.scale.y=eyeY);
      this.mouth.scale.set(1,1,1);if(this.act==='talk')this.mouth.scale.y=1+Math.abs(Math.sin(T*13))*1.5;
      const sp=s.sp,pitch=o.px+o.sx,headP=pitch+o.nx+o.hdx,stream=clamp(hs*0.06,0,0.7),accT=clamp(s.accF*0.012,-0.35,0.35),side=clamp(-s.accR*0.012-s.turn*hs*0.01,-0.4,0.4);
      spring(sp.a,0.45-headP+stream+accT,side-o.hdz,70,9,dt);spring(sp.b,0.12+(sp.a.x-(0.45-headP))*-0.2+stream*0.3,side*0.5,50,6,dt);spring(sp.c,0.1+stream*0.2,side*0.4,40,5,dt);
      this.tailA.rotation.set(sp.a.x,0,sp.a.z);this.tailB.rotation.set(sp.b.x,0,sp.b.z);this.tailC.rotation.set(sp.c.x,0,sp.c.z);
      spring(sp.sa,0.3-pitch+stream*1.2+accT,side+0.1,60,7,dt);spring(sp.sb,0.1+stream*0.4,side*0.5,45,5,dt);this.scarfA.rotation.set(sp.sa.x,0,sp.sa.z);this.scarfB.rotation.set(sp.sb.x,0,sp.sb.z);
      spring(sp.bag,clamp(-s.accF*0.008,-0.15,0.15)+m*Math.cos(ph*P2*2)*0.03,0,80,9,dt);this.bag.rotation.x=sp.bag.x;
      if(this.bubbleT>0){this.bubbleT-=dt;if(this.bubbleT<=0)this.bubble.visible=false;}}
  }

  /* ---------- GLB 실물 아바타 (webxr-world/avatar.js의 보정을 옮김: metalness 0, 고친 텍스처, 자세 보정, 대화 끄덕임) ---------- */
  function measureBounds(model){model.updateMatrixWorld(true);const v=new THREE.Vector3();const min=new THREE.Vector3(Infinity,Infinity,Infinity),max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
    model.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const pos=o.geometry.attributes.position;const bt=o.boneTransform?'boneTransform':'applyBoneTransform';
      for(let i=0;i<pos.count;i+=3){v.fromBufferAttribute(pos,i);o[bt](i,v);v.applyMatrix4(o.matrixWorld);min.min(v);max.max(v);}});
    return(max.y>min.y&&Number.isFinite(max.y-min.y))?{min,max,height:max.y-min.y}:null;}
  const BODY_FORWARD=new THREE.Vector3(0,0,1),BODY_SIDE=new THREE.Vector3(1,0,0),BODY_UP=new THREE.Vector3(0,1,0);
  const _axis=new THREE.Vector3(),_pq=new THREE.Quaternion(),_dq=new THREE.Quaternion(),_mq=new THREE.Quaternion();
  function nodAngle(t){const p=t%3.2;if(p>1.3)return 0;const env=Math.sin(Math.PI*p/1.3);return 0.13*env*(0.5-0.5*Math.cos(2*Math.PI*p/0.65));}
  class GlbChar{
    constructor(gltf,o){const root=this.root=new THREE.Group();const inner=this.inner=new THREE.Group();root.add(inner);
      const model=this.model=gltf.scene;this.bones={};this.restPos={};this.applied=[];
      this.fix=Object.assign({armSpread:0.12,shoulderLift:0.08,armLength:0.92,spineBend:0.15,neckBend:-0.3,headBend:0.15},o.poseFix||{});
      model.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=false;if(x.isSkinnedMesh)x.frustumCulled=false;
          // 폰에서는 노멀맵을 뺀다: Tripo GLB에 탄젠트가 없어 화면 미분으로 계산하는데, 폰 GPU 정밀도에서는 몸에 때 같은 얼룩이 생긴다(2026-10-03 휴먼쌤 폰)
          (Array.isArray(x.material)?x.material:[x.material]).forEach(m=>{m.metalness=0;m.metalnessMap=null;if(IS_TOUCH)m.normalMap=null;m.needsUpdate=true;});}
        if(x.isBone)this.bones[x.name.replace('mixamorig','')]=x;});
      for(const side of['Left','Right'])for(const n of[side+'ForeArm',side+'Hand'])if(this.bones[n])this.restPos[n]=this.bones[n].position.clone();
      // 키를 맞추고, 발 가운데가 원점(0,0,0)에 오도록 모델을 옮긴다(파일 속 원점이 비껴 있으면 카메라 구도가 어긋난다)
      const bb=measureBounds(model);const h=bb?bb.height:1.75;this.height=o.height||1.68;this.baseScale=this.height/h;inner.scale.setScalar(this.baseScale);
      if(bb)model.position.set(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);inner.add(model);
      if(o.fixedTexture){new THREE.TextureLoader().load(o.fixedTexture,tex=>{tex.encoding=THREE.sRGBEncoding;tex.flipY=false;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
        model.traverse(x=>{if(x.isMesh)(Array.isArray(x.material)?x.material:[x.material]).forEach(m=>{m.map=tex;m.needsUpdate=true;});});},undefined,()=>{});}
      const mixer=this.mixer=new THREE.AnimationMixer(model);this.actions={};const clip=k=>gltf.animations.find(a=>a.name.toLowerCase().includes(k));
      const idle=clip((o.idle||'a person standing').toLowerCase())||clip('standing_relax')||clip('wait')||gltf.animations[0];if(idle)this.actions.idle=mixer.clipAction(idle);
      const idle2=clip((o.idle2||'standing_relax').toLowerCase());if(idle2&&idle2!==idle)this.actions.idle2=mixer.clipAction(idle2);
      // 말할 때 번갈아 틀 대기 동작(설정 talkIdles). 팔이 몸을 뚫는 동작은 설정에서 빼면 된다
      (o.talkIdles||[]).forEach((k,n)=>{const c=clip(String(k).toLowerCase());if(c&&c!==idle&&c!==idle2)this.actions['talk'+n]=mixer.clipAction(c);});
      this.talkSet=['idle'].concat(this.actions.idle2?['idle2']:[],Object.keys(this.actions).filter(k=>/^talk\d/.test(k)));
      this.talkOpt=Object.assign({idleSwap:6,gesture:1},o.talk||{});
      // waveEnd(초): 손 인사 동작을 앞부분만 쓴다(wave_goodbye_02는 2.8초 뒤 제자리걸음이 들어 있음)
      // waveStart(초): 앞쪽 가만히 있는 부분을 건너뛴다(리니 wave2는 1.6초까지 움직임 없음)
      let wv=clip((o.wave||'wave_goodbye_02').toLowerCase())||clip('wave');
      if(wv&&(o.waveStart||(o.waveEnd&&o.waveEnd<wv.duration))){const s=o.waveStart||0,e=Math.min(o.waveEnd||wv.duration,wv.duration);wv=wv.clone();wv.tracks.forEach(t=>{t.trim(s,e);if(s)t.shift(-s);});wv.duration=e-s;}if(wv){const a=this.actions.wave=mixer.clipAction(wv);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
      if(o.walk){const c=clip(o.walk.toLowerCase());if(c)this.actions.walk=mixer.clipAction(c);}
      mixer.addEventListener('finished',e=>{if(e.action===this.actions.wave){this.waving=false;this.setState('idle');}});
      this.current=null;this.waving=false;this.talkBlend=0;this.talkTime=0;this.act=null;this.setState('idle');
      this.tag=textSprite();this.tag.scale.set(1.0,0.31,1);this.tag.position.y=this.height+0.3;root.add(this.tag);this.tag.visible=false;
      this.bubble=textSprite();this.bubble.visible=false;root.add(this.bubble);}
    setState(n){const next=this.actions[n];if(!next||next===this.current)return;next.reset().setEffectiveWeight(1).fadeIn(0.25).play();if(this.current)this.current.fadeOut(0.25);this.current=next;}
    setName(n){n=cleanText(n,16)||'휴먼쌤';this.name=n;drawTag(this.tag,n,'#3b6db3');}
    setScale(k){this.inner.scale.setScalar(this.baseScale*Math.max(0.001,k));}
    say(){}
    emote(k){if(k==='wave'&&this.actions.wave&&!this.waving){this.waving=true;this.setState('wave');}}
    rot(bone,axisLocal,angle){if(!bone||!bone.parent||!angle)return;this.model.getWorldQuaternion(_mq);_axis.copy(axisLocal).applyQuaternion(_mq);bone.parent.getWorldQuaternion(_pq).invert();
      _axis.applyQuaternion(_pq).normalize();_dq.setFromAxisAngle(_axis,angle);bone.quaternion.premultiply(_dq);this.applied.push({bone,q:_dq.clone()});}
    poseFix(sign){const B=this.bones;
      if(sign<0){for(let i=this.applied.length-1;i>=0;i--){const a=this.applied[i];a.bone.quaternion.premultiply(_dq.copy(a.q).invert());}this.applied.length=0;for(const n in this.restPos)B[n].position.copy(this.restPos[n]);return;}
      const f=this.fix;for(const n of['Spine','Spine1','Spine2'])this.rot(B[n],BODY_SIDE,f.spineBend/3);
      const nod=this.talkBlend*nodAngle(this.talkTime);this.rot(B.Neck,BODY_SIDE,f.neckBend+nod*0.35);this.rot(B.Head,BODY_SIDE,f.headBend+nod);
      for(const [side,s] of[['Left',1],['Right',-1]])this.rot(B[side+'Shoulder'],BODY_FORWARD,s*f.shoulderLift);
      for(const [side,s] of[['Left',1],['Right',-1]]){this.rot(B[side+'Arm'],BODY_FORWARD,s*f.armSpread);for(const n of[side+'ForeArm',side+'Hand'])if(B[n]&&this.restPos[n])B[n].position.copy(this.restPos[n]).multiplyScalar(f.armLength);}
      // 말할 때 작은 손짓·몸 돌림(기본 대기 동작 위에서만. 뒷짐 같은 동작 중에는 팔을 건드리지 않는다)
      const gestOK=this.current===this.actions.idle||this.current===this.actions.idle2;const tb=this.talkBlend*(this.talkOpt?this.talkOpt.gesture:0)*(gestOK?1:0);
      if(tb>0.001){const t=this.talkTime;const p=(t%4.8)/4.8,env=sstep(0.12,0.4,p)*(1-sstep(0.62,0.95,p));
        this.rot(B.Spine,BODY_UP,tb*Math.sin(t*0.8)*0.035);
        this.rot(B.RightArm,BODY_SIDE,-tb*env*0.36);this.rot(B.RightForeArm,BODY_SIDE,-tb*env*0.5);
        const p2=((t+2.6)%6.3)/6.3,env2=sstep(0.15,0.45,p2)*(1-sstep(0.6,0.9,p2));this.rot(B.LeftArm,BODY_SIDE,-tb*env2*0.2);this.rot(B.LeftForeArm,BODY_SIDE,-tb*env2*0.36);}
      // 문을 열어 줄 때: 두 팔을 벌려 맞이하는 자세
      const ob=this.openBlend||0;if(ob>0.001)for(const [side,s] of[['Left',1],['Right',-1]]){this.rot(B[side+'Arm'],BODY_FORWARD,s*ob*0.5);this.rot(B[side+'Arm'],BODY_SIDE,-ob*0.3);this.rot(B[side+'ForeArm'],BODY_SIDE,-ob*0.25);}}
    update(dt,T,inp){this.root.position.copy(inp.pos);this.root.rotation.y=inp.facing;const talking=this.act==='talk';
      this.talkBlend=clamp(this.talkBlend+(talking?dt:-dt)/0.3,0,1);if(this.talkBlend>0)this.talkTime+=dt;
      this.openBlend=clamp((this.openBlend||0)+(this.act==='open'?dt:-dt)/0.5,0,1);
      if(!this.waving){if(talking&&this.talkSet.length>1){const sw=this.talkOpt.idleSwap||6,want=this.talkSet[Math.floor(this.talkTime/sw)%this.talkSet.length];if(want!==this.wantIdle){this.wantIdle=want;this.setState(want);}}
        else if(!talking){const w=this.actions[this.hold]?this.hold:'idle';if(this.current!==this.actions[w]){this.wantIdle=w;this.setState(w);}}}
      this.poseFix(-1);this.mixer.update(dt);this.poseFix(1);}
  }
  function loadGltf(url){if(!THREE.GLTFLoader||!window.fetch)return Promise.reject(new Error('GLTFLoader 없음'));
    return fetch(url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
      .then(buf=>new Promise((res,rej)=>{const loader=new THREE.GLTFLoader();const cib=window.createImageBitmap;
        // createImageBitmap을 잠시 숨기면 GLTFLoader가 fetch 대신 <img>로 내장 텍스처를 읽는다(아티팩트에서 blob fetch가 막혔던 문제 회피)
        try{window.createImageBitmap=undefined;loader.parse(buf,'',res,rej);}finally{window.createImageBitmap=cib;}}));}
  function loadGlbHuman(o){if(!THREE.GLTFLoader||!window.fetch)return;
    loadGltf(o.url)
      .then(gltf=>{const g=new GlbChar(gltf,o);g.setName(human.name);g.root.visible=human.root.visible;g.tag.visible=human.tag.visible;g.act=human.act;
        scene.remove(human.root);human=g;scene.add(g.root);g.setScale(hState.scale);g.update(0.001,T,{pos:hState.pos,facing:hState.facing});})
      .catch(e=>{console.warn('[world] 실물 아바타를 불러오지 못해 만화풍 캐릭터를 씁니다:',e);});}

  /* ---------- entities ---------- */
  const player={pos:STAGE.hub.clone(),vx:0,vz:0,facing:Math.PI,faceT:null,speed:0,path:[],base:2.3};
  const me=new Char(lsGet(KEY+'look',[0,1,0,0,0]));scene.add(me.root);
  const GD=CFG.guide||{},HM=CFG.human||{};
  const guide=new Char(GD.look||[1,5,2,2,1],{bag:false});guide.setName(GD.name||'안내자');guide.tag.visible=true;scene.add(guide.root);
  const gState={pos:STAGE.guide.pos.clone(),facing:0};
  let human=new Char(HM.look||[0,0,0,5,2],{bag:false,pants:'#3a3f52',shoe:'#4a3a2a'});human.setName(HM.name||'휴먼쌤');human.tag.visible=true;human.root.visible=false;scene.add(human.root);
  const hState={pos:STAGE.human.clone(),facing:0,scale:0};
  if(HM.model&&HM.model.url)loadGlbHuman(HM.model);
  // "!" marker over the guide until met
  const qMark=(()=>{const s=textSprite();const c=s.userData.cv,g=c.getContext('2d');g.clearRect(0,0,512,160);g.fillStyle='#ffc766';g.beginPath();g.arc(256,80,62,0,7);g.fill();
    g.fillStyle='#2a1a0c';g.font='700 92px "IBM Plex Sans KR",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('!',256,86);s.material.map.needsUpdate=true;s.scale.set(0.9,0.28,1);scene.add(s);return s;})();

  /* ---------- FX: bursts ---------- */
  const FXN=360,fxGeo=new THREE.BufferGeometry(),fxPos=new Float32Array(FXN*3),fxCol=new Float32Array(FXN*3),fxVel=new Float32Array(FXN*3),fxLife=new Float32Array(FXN);let fxHead=0;
  fxGeo.setAttribute('position',new THREE.BufferAttribute(fxPos,3));fxGeo.setAttribute('color',new THREE.BufferAttribute(fxCol,3));
  const fx=new THREE.Points(fxGeo,new THREE.PointsMaterial({size:0.15,map:GLOW,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));fx.frustumCulled=false;scene.add(fx);
  for(let i=0;i<FXN;i++)fxPos[i*3+1]=-100;
  function burst(p,color,n=90,speed=5,life=1.4){const c=new THREE.Color(color);for(let k=0;k<n;k++){const i=fxHead;fxHead=(fxHead+1)%FXN;
    const th=Math.random()*6.283,phi=Math.acos(2*Math.random()-1),sp=speed*(0.35+Math.random()*0.65);
    fxPos.set([p.x,p.y,p.z],i*3);fxVel.set([Math.sin(phi)*Math.cos(th)*sp,Math.cos(phi)*sp+1.5,Math.sin(phi)*Math.sin(th)*sp],i*3);fxCol.set([c.r,c.g,c.b],i*3);fxLife[i]=life*(0.6+Math.random()*0.4);}}
  function updateFX(dt){for(let i=0;i<FXN;i++){if(fxLife[i]<=0)continue;fxLife[i]-=dt;if(fxLife[i]<=0){fxPos[i*3+1]=-100;continue;}
    fxVel[i*3+1]-=4*dt;fxVel[i*3]*=0.98;fxVel[i*3+2]*=0.98;fxPos[i*3]+=fxVel[i*3]*dt;fxPos[i*3+1]+=fxVel[i*3+1]*dt;fxPos[i*3+2]+=fxVel[i*3+2]*dt;}
    fxGeo.attributes.position.needsUpdate=true;fxGeo.attributes.color.needsUpdate=true;}

  /* =====================================================================
     QUEST STATE + CHECKLIST
     ===================================================================== */
  // got: 미션 번호 → 모은 선택지 번호 목록. collectAll 미션은 선택지를 다 모아야 완성.
  function sanitizeGot(g){const o={};M.forEach((m,i)=>{const a=(g&&typeof g==='object'&&Array.isArray(g[i]))?g[i].filter(ci=>Number.isInteger(ci)&&ci>=0&&ci<m.choices.length):[];o[i]=[...new Set(a)];});return o;}
  const Q={met:lsGet(KEY+'met',false),got:sanitizeGot(lsGet(KEY+'got2',{})),human:lsGet(KEY+'human',false),entered:lsGet(KEY+'entered',false),plaza:lsGet(KEY+'plaza',false)};
  function qSave(){lsSet(KEY+'met',Q.met);lsSet(KEY+'got2',Q.got);lsSet(KEY+'human',Q.human);lsSet(KEY+'entered',Q.entered);lsSet(KEY+'plaza',Q.plaza);}
  const gotList=i=>Q.got[i]||(Q.got[i]=[]);
  const missionDone=i=>{const m=M[i],g=gotList(i);return m.collectAll?g.length>=m.choices.length:g.length>0;};
  const remaining=()=>M.map((m,i)=>i).filter(i=>!missionDone(i));
  const pieceName=m=>T_(UI.piece||'{label}의 조각',{label:m.label});
  const GUIDED=(CFG.missionOrder||'guided')!=='free';
  function checklistUI(){const rows=[{t:UI.rowMeet||'안내자 만나기',d:Q.met}];
    M.forEach((m,i)=>rows.push({t:m.label+(m.collectAll&&!missionDone(i)&&gotList(i).length?` ${gotList(i).length}/${m.choices.length}`:''),d:missionDone(i),c:m.color,n:i+1}));
    rows.push({t:UI.rowHuman||'휴먼쌤 만나기',d:Q.human},{t:UI.rowDoor||'문 열기',d:Q.entered});
    const cur=rows.findIndex(r=>!r.d),done=rows.filter(r=>r.d).length;$('#clTitle').textContent=UI.checklist||'미션';$('#clCount').textContent=`${done}/${rows.length}`;
    const ol=$('#clList');ol.textContent='';rows.forEach((r,i)=>{const li=document.createElement('li');li.className=(r.d?'done':i===cur?'now':'');
      const b=document.createElement('span');b.className='box';if(r.n)b.textContent=String(r.n);const t=document.createElement('span');t.className='txt';t.textContent=r.t;li.append(b,t);
      if(i===cur&&UI.nowBadge){const g=document.createElement('span');g.className='now-badge';g.textContent=UI.nowBadge;li.appendChild(g);}
      else if(r.c){const c=document.createElement('span');c.className='dotc';c.style.setProperty('--c',r.c);li.appendChild(c);}ol.appendChild(li);});
    STAGE.spots.forEach(s=>{const got=missionDone(s.i);s.orb.visible=!got;s.glow.visible=!got;s.light.intensity=got?0.15:0.9;s.padRing.material.emissiveIntensity=got?0.25:1.1;});
    qMark.visible=!Q.met;}
  $('#clHead').onclick=()=>{const cl=$('#checklist');const open=cl.classList.toggle('min');$('#clHead').setAttribute('aria-expanded',String(!open));};

  /* =====================================================================
     TRAVEL — nodes, straight routes that step around the guide
     ===================================================================== */
  const NODES={hub:STAGE.hub,door:STAGE.doorNode,gate:STAGE.gate,meet:STAGE.meet};STAGE.spots.forEach(s=>NODES['s'+s.i]=s.stand);
  function route(from,to){const A=NODES[from]||player.pos,B=NODES[to];const G=gState.pos;const path=[];
    if(distSeg(G.x,G.z,A,B)<1.25&&Math.hypot(B.x-G.x,B.z-G.z)>1.0&&Math.hypot(A.x-G.x,A.z-G.z)>1.0){const vx=B.x-A.x,vz=B.z-A.z,l=Math.hypot(vx,vz)||1;const nx=-vz/l,nz=vx/l;
      const side=((G.x-A.x)*nx+(G.z-A.z)*nz)>=0?-1:1;path.push({x:G.x+nx*side*1.7,z:G.z+nz*side*1.7});}
    path.push({x:B.x,z:B.z});return path;}
  const J={node:'hub',dest:null,traveling:false,onArrive:null,stuck:0,busy:false,label:'',staying:false};let walkTo=null;
  function placeName(id){if(id==='hub')return(UI.where&&UI.where.hub)||'안내자 곁';if(id==='door'||id==='meet'||id==='gate')return(UI.where&&UI.where.door)||'문 앞';
    if(id&&id[0]==='s'){const m=M[+id.slice(1)];return m?pieceName(m):'';}return T_(CFG.title);}
  function hideChoices(){$('#journey').hidden=true;}
  function setChoices(where,list){$('#jWhere').textContent=where;const box=$('#jBtns');box.textContent='';
    list.forEach((c,i)=>{const b=document.createElement('button');b.className='jb'+(c.hot?' hot':'')+(c.minor?' minor':'');b.id='jc-'+i;
      const t=document.createElement('span');t.className='t';t.textContent=c.label;b.appendChild(t);
      if(c.sub){const s=document.createElement('span');s.className='s';s.textContent=c.sub;b.appendChild(s);}
      if(c.hot&&list.length===1){const a=document.createElement('span');a.className='ar';a.textContent='→';b.appendChild(a);}
      b.onclick=()=>{SND('sfx','select');c.fn();};box.appendChild(b);});
    const j=$('#journey');j.classList.remove('travel');j.classList.toggle('single',list.length===1);j.hidden=false;}
  function showTravel(){$('#jWhere').textContent=(UI.arriving||'걸어가는 중')+' · '+J.label;const box=$('#jBtns');box.textContent='';
    const b=document.createElement('button');b.className='jb minor';b.id='jc-0';b.textContent=UI.arriveNow||'바로 도착하기';b.onclick=skipTravel;box.appendChild(b);
    const j=$('#journey');j.classList.add('travel');j.hidden=false;}
  function travel(id,cb,label){hideChoices();clearShot();player.faceT=null;J.staying=false;
    if(J.node===id&&!J.traveling){if(cb)cb();else refreshChoices();return;}
    player.path=route(J.node,id);walkTo=null;J.dest=id;J.traveling=true;J.onArrive=cb||null;J.stuck=0;J.label=label||placeName(id);showTravel();}
  function arrive(){J.traveling=false;J.node=J.dest;player.path=[];walkTo=null;hideChoices();const cb=J.onArrive;J.onArrive=null;if(cb)cb();else refreshChoices();}
  function skipTravel(){if(!J.traveling)return;const n=NODES[J.dest];player.pos.set(n.x,0,n.z);player.vx=player.vz=0;DIR.init=false;arrive();}
  function faceTo(x,z){player.faceT=Math.atan2(x-player.pos.x,z-player.pos.z);}
  function updatePlayer(dt){const P=player.pos;
    if(PZ.active){plazaMove(dt);return;}
    if(!walkTo&&player.path.length)walkTo=player.path.shift();let mx=0,mz=0,remain=0;
    if(walkTo){const dx=walkTo.x-P.x,dz=walkTo.z-P.z,d=Math.hypot(dx,dz);remain=d;let px=walkTo.x,pz=walkTo.z;player.path.forEach(q=>{remain+=Math.hypot(q.x-px,q.z-pz);px=q.x;pz=q.z;});
      if(d<0.12&&!player.path.length&&remain<0.12)walkTo=null;else if(d<0.35&&player.path.length)walkTo=player.path.shift();
      if(walkTo){const ex=walkTo.x-P.x,ez2=walkTo.z-P.z,dd=Math.hypot(ex,ez2)||1;mx=ex/dd;mz=ez2/dd;if(remain<0.9){const s=Math.max(0.2,remain/0.9);mx*=s;mz*=s;}}}
    player.base=lerp(player.base,remain>7?4.2:2.4,Math.min(1,dt*1.5));
    const tx=mx*player.base,tz=mz*player.base,accel=Math.hypot(tx,tz)>Math.hypot(player.vx,player.vz)?5.5:9;
    player.vx=lerp(player.vx,tx,Math.min(1,dt*accel));player.vz=lerp(player.vz,tz,Math.min(1,dt*accel));
    const nx=P.x+player.vx*dt,nz=P.z+player.vz*dt;if(floorAt(nx,nz)>-1){P.x=nx;P.z=nz;}else{player.vx=player.vz=0;}
    player.speed=Math.hypot(player.vx,player.vz);P.y=0;
    if(J.traveling&&walkTo&&player.speed<0.25){J.stuck+=dt;if(J.stuck>1.2){P.x=walkTo.x;P.z=walkTo.z;walkTo=null;J.stuck=0;}}else J.stuck=0;
    if(player.speed>0.2){const tgt=Math.atan2(player.vx,player.vz);let d=tgt-player.facing;d=Math.atan2(Math.sin(d),Math.cos(d));player.facing+=clamp(d*Math.min(1,dt*8),-dt*9,dt*9);}
    else if(player.faceT!=null){let d=player.faceT-player.facing;d=Math.atan2(Math.sin(d),Math.cos(d));player.facing+=clamp(d*Math.min(1,dt*5),-dt*6,dt*6);if(Math.abs(d)<0.02)player.faceT=null;}
    if(J.traveling&&!walkTo&&!player.path.length&&player.speed<0.4)arrive();}

  /* =====================================================================
     CAMERA — follow cam + director shots + drag/zoom
     ===================================================================== */
  const DIR={shot:null,t:0,pos:new THREE.Vector3(),look:new THREE.Vector3(),init:false,manual:0};
  const dPos=new THREE.Vector3(),dLook=new THREE.Vector3(),camTarget=new THREE.Vector3();
  let camYaw=0,camPitch=0.3,camDist=4.8,camDistT=4.8;
  function shot(fn,dur,onEnd,skippable){DIR.shot={fn,dur,onEnd,skippable:!!skippable};DIR.t=0;}
  function clearShot(){DIR.shot=null;}
  function endShot(){const s=DIR.shot;if(!s)return;DIR.shot=null;if(s.onEnd){const f=s.onEnd;s.onEnd=null;f();}}
  function shotArrive(sp){const o=sp.pos,a0=Math.atan2(player.pos.x-o.x,player.pos.z-o.z);return(k,pos,look)=>{const e=ez(k),a=a0+1.35-0.5*e,r=8.5-4.1*e,h=5.8-3.6*e;
    pos.set(o.x+Math.sin(a)*r,h,o.z+Math.cos(a)*r);look.set((o.x*0.6+player.pos.x*0.4),1.1+0.2*e,(o.z*0.6+player.pos.z*0.4));};}
  function shotCollect(sp){const o=sp.orb.getWorldPosition(new THREE.Vector3());return(k,pos,look)=>{const dx=player.pos.x-o.x,dz=player.pos.z-o.z,l=Math.hypot(dx,dz)||1;const d=2.5-k*0.4;
    pos.set(o.x+dx/l*d-dz/l*2.2,o.y+0.6-k*0.2,o.z+dz/l*d+dx/l*2.2);look.set(o.x,o.y-0.1,o.z);sp.orb.scale.setScalar(1+Math.sin(k*Math.PI)*0.4);sp.glow.scale.setScalar(1.7+Math.sin(k*Math.PI)*0.8);};}
  function shotOrbit(c,r,h){const a0=camYaw;return(k,pos,look)=>{const a=a0+ez(k)*2.2;pos.set(c.x+Math.sin(a)*r,h-k*1.2,c.z+Math.cos(a)*r);look.set(c.x,1.2,c.z);};}
  function shotTalk(npcPos){return(k,pos,look)=>{const P=player.pos,dx=npcPos.x-P.x,dz=npcPos.z-P.z,l=Math.hypot(dx,dz)||1;pos.set(P.x-dx/l*2.2-dz/l*1.1,1.75,P.z-dz/l*2.2+dx/l*1.1);look.set((P.x+npcPos.x)/2,1.25,(P.z+npcPos.z)/2);};}
  function shotIntro(){return(k,pos,look)=>{const a=0.35+T*0.08;pos.set(Math.sin(a)*15,11-k*2,Math.cos(a)*15);look.set(0,0.8,-1);};}
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;
    if(drag.moved&&!cine.active&&!intro.active){camYaw-=dx*0.006;camPitch=clamp(camPitch-dy*0.004,-0.05,1.1);DIR.manual=5;}drag.x=e.clientX;drag.y=e.clientY;});
  const tap=()=>{if(cine.active||intro.active)return;if(DIR.shot&&DIR.shot.skippable){endShot();return;}if(J.staying){J.staying=false;refreshChoices();}};
  canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;canvas.classList.remove('dragging');if(!moved)tap();});
  canvas.addEventListener('pointercancel',()=>{drag=null;canvas.classList.remove('dragging');});
  canvas.addEventListener('wheel',e=>{e.preventDefault();camDistT=clamp(camDistT+Math.sign(e.deltaY)*0.5,2.6,9);},{passive:false});
  function updateCamera(dt){camDist+=(camDistT-camDist)*Math.min(1,dt*8);DIR.manual-=dt;const P=player.pos;camTarget.set(P.x,P.y+1.35,P.z);let rate=3.2;
    if(DIR.shot){DIR.t+=dt;const s=DIR.shot,k=Math.min(1,DIR.t/s.dur);s.fn(k,dPos,dLook);rate=3.6;if(DIR.t>=s.dur&&s.onEnd){const f=s.onEnd;s.onEnd=null;f();}}
    else if(talk.open){shotTalk(talk.npc)(0,dPos,dLook);}
    // 걸으면 카메라가 등 뒤로 돈다. 광장에서 직접 걸을 때는 앞쪽(±63°)으로 걸을 때만(옆·뒤로 밀 때 돌면 빙빙 돈다)
    else{if(DIR.manual<=0&&player.speed>0.3){let d=(player.facing+Math.PI)-camYaw;d=Math.atan2(Math.sin(d),Math.cos(d));
        if(!PZ.active||PZ.follow||Math.abs(d)<1.1){camYaw+=d*Math.min(1,dt*1.6);camPitch+=(0.3-camPitch)*Math.min(1,dt*1.5);}}
      const cp=Math.cos(camPitch);dPos.set(camTarget.x+Math.sin(camYaw)*cp*camDist,camTarget.y+Math.sin(camPitch)*camDist,camTarget.z+Math.cos(camYaw)*cp*camDist);dLook.copy(camTarget);}
    if(dPos.y<0.35)dPos.y=0.35;
    if(!DIR.init){DIR.pos.copy(dPos);DIR.look.copy(dLook);DIR.init=true;}
    DIR.pos.lerp(dPos,1-Math.exp(-dt*rate));DIR.look.lerp(dLook,1-Math.exp(-dt*(rate+1.5)));camera.position.copy(DIR.pos);camera.lookAt(DIR.look);}

  /* =====================================================================
     TALK BOX (guide dialogue)
     ===================================================================== */
  const talk={open:false,npc:gState.pos,lines:[],i:0,onDone:null,who:null};
  // lines: 글자열(NPC 말) 또는 {text, choices:[{label}]}(플레이어 대답 선택, 어느 쪽을 골라도 다음 줄로)
  function openTalk(who,lines,onDone,lastLabel){talk.open=true;talk.who=who;talk.npc=who===guide?gState.pos:hState.pos;
    talk.lines=lines.map(l=>typeof l==='string'?{text:T_(l)}:Object.assign({},l,{text:T_(l.text)}));talk.i=0;talk.onDone=onDone||null;talk.last=lastLabel||UI.talkLast||'알겠어요';
    hideChoices();clearShot();document.body.classList.add('talking');$('#talk').hidden=false;$('#talkName').textContent=who.name;$('#talkRole').textContent=who===guide?(GD.role||''):(HM.role||'');
    who.act='talk';faceTo(talk.npc.x,talk.npc.z);talkShow();}
  function talkShow(){const it=talk.lines[talk.i]||{text:''};$('#talkText').textContent=it.text;const box=$('#talkBtns');box.textContent='';const last=talk.i>=talk.lines.length-1;
    const mk=(label,primary)=>{const b=document.createElement('button');b.className='jb'+(primary?' hot':'');b.textContent=label;b.onclick=()=>{SND('sfx','click');if(last)closeTalk();else{talk.i++;talkShow();}};box.appendChild(b);};
    if(it.choices&&it.choices.length)it.choices.forEach((c,k)=>mk(T_(c.label),k===0));else mk(last?talk.last:(UI.talkNext||'다음'),true);}
  function closeTalk(){if(!talk.open)return;talk.open=false;$('#talk').hidden=true;document.body.classList.remove('talking');if(talk.who)talk.who.act=null;const f=talk.onDone;talk.onDone=null;if(f)f();else refreshChoices();}
  function talkGuide(){travel('hub',()=>{faceTo(gState.pos.x,gState.pos.z);const lines=!Q.met?(GD.greeting||['안녕하세요.']):Q.human?(GD.afterMeet||GD.help||[]):remaining().length===0?(GD.afterAll||GD.help||[]):(GD.help||[]);
    const first=!Q.met;openTalk(guide,lines,()=>{if(first){Q.met=true;qSave();checklistUI();}refreshChoices();},first?(UI.greetLast||'출발'):undefined);},GD.name);}

  /* =====================================================================
     MISSIONS — go → arrive (crane) → one choice → collect + card
     ===================================================================== */
  let cardOpen=false;
  function goMission(i){travel('s'+i,()=>arriveMission(i),pieceName(M[i]));}
  function arriveMission(i){const s=STAGE.spots[i];faceTo(s.pos.x,s.pos.z);J.busy=true;if(M[i].arrive&&!missionDone(i)&&!gotList(i).length)toast(T_(M[i].arrive));
    shot(shotArrive(s),3.2,()=>{J.busy=false;refreshChoices();},true);}
  function answerMission(i,ci){const m=M[i],s=STAGE.spots[i];J.busy=true;hideChoices();faceTo(s.pos.x,s.pos.z);
    shot(shotCollect(s),1.6,()=>{const o=s.orb.getWorldPosition(new THREE.Vector3());burst(o,m.color||'#fff',missionDone(i)?60:140,5,1.4);s.orb.scale.setScalar(1);s.glow.scale.setScalar(1.7);
      const g=gotList(i);if(!g.includes(ci))g.push(ci);qSave();checklistUI();showCard(i,ci);});}
  function showCard(i,ci){const m=M[i],c=m.choices[ci]||{},f=m.fact||{};cardOpen=true;document.body.classList.add('talking');hideChoices();
    const done=missionDone(i),chosen=T_(c.fact||c.label||''),chosenTitle=T_(c.title||f.title||m.title),others=m.collectAll?'':m.choices.filter((x,k)=>k!==ci).map(x=>T_(x.fact||x.label)).join(', ');
    const ex={chosen,chosenTitle,others,label:m.label};$('#card').style.setProperty('--c',m.color||'#fff');
    $('#cardEyebrow').textContent=pieceName(m)+(m.collectAll?` · ${gotList(i).length}/${m.choices.length}`:'');$('#cardTitle').textContent=T_(f.title||m.title,ex);
    const reply=T_(c.reply||'',ex);$('#cardReply').textContent=reply;$('#cardReply').hidden=!reply;
    $('#cardText').textContent=T_(f.text||'',ex);const more=f.more&&others?T_(f.more,ex):(done&&m.complete?T_(m.complete,ex):'');$('#cardMore').textContent=more;$('#cardMore').hidden=!more;
    const pend=(!reply&&f.pending)?T_(f.pending,ex):'';$('#cardPending').textContent=pend;$('#cardPending').hidden=!pend;
    $('#cardSrc').textContent=f.source?T_(f.source,ex):'';$('#cardClose').textContent=done?(UI.cardClose||'간직하기'):(UI.cardCloseMore||UI.cardClose||'다음');$('#card').hidden=false;
    SND('sfx','card');setTimeout(()=>SND('sfx',done?'complete':'piece'),220);}
  $('#cardClose').onclick=()=>{SND('sfx','click');cardOpen=false;$('#card').hidden=true;document.body.classList.remove('talking');J.busy=false;clearShot();refreshChoices();};
  function lookAround(){const n=NODES[J.node]||player.pos;J.busy=true;hideChoices();toast(UI.lookHint||'화면을 누르면 둘러보기를 마쳐요.');shot(shotOrbit(n,9,5.5),8,()=>{J.busy=false;clearShot();refreshChoices();},true);}
  function stay(){J.staying=true;hideChoices();toast(UI.stayHint||'화면을 누르면 선택지가 다시 나와요.');}
  function restartAll(quiet){if(PZ.active)exitPlaza();SND('music','day');Q.met=false;Q.got=sanitizeGot({});Q.human=false;Q.entered=false;qSave();STAGE.door.open(0);human.root.visible=false;hState.scale=0;checklistUI();
    player.pos.copy(STAGE.hub);player.vx=player.vz=0;player.facing=Math.PI;J.node='hub';J.traveling=false;player.path=[];walkTo=null;DIR.init=false;camYaw=0;if(!quiet)toast('처음부터 다시 시작해요.');refreshChoices();}
  function showPlaces(){const L=[{label:placeName('hub'),fn:()=>travel('hub',()=>{faceTo(gState.pos.x,gState.pos.z);refreshChoices();})}];
    M.forEach((m,i)=>L.push({label:pieceName(m),sub:missionDone(i)?'완성':m.title,fn:()=>goMission(i)}));
    if(remaining().length===0)L.push({label:placeName('door'),fn:()=>travel('door',()=>{faceTo(STAGE.door.pos.x,STAGE.door.pos.z);refreshChoices();})});
    L.push({label:UI.back||'돌아가기',fn:refreshChoices,minor:true});setChoices('어디로 갈까요?',L);}
  function refreshChoices(){if(PZ.active){plazaChoices();return;}if(cine.active||talk.open||cardOpen||J.traveling||J.busy||intro.active||J.staying)return;
    const n=J.node,rem=remaining(),L=[],E=CFG.ending||{};
    const toHub=()=>travel('hub',()=>{faceTo(gState.pos.x,gState.pos.z);refreshChoices();});
    const meetBtn=()=>({label:UI.meetHuman||'휴먼쌤 만나러 가기',sub:UI.meetHumanSub||'',fn:()=>travel('meet',()=>startEnding(false),placeName('door')),hot:true});
    const enterBtn=()=>({label:T_(E.enterLabel||'문으로 들어가기'),sub:T_(E.doorTitle||''),fn:enterDoor,hot:true});
    const missionBtn=(i,hot)=>({label:pieceName(M[i]),sub:M[i].title||'',fn:()=>goMission(i),hot:hot!==false});
    // 조각 자리에 있고 아직 완성 전이면: 남은 선택지만(collectAll은 고른 것을 빼고 다시)
    if(n[0]==='s'){const i=+n.slice(1),m=M[i];
      if(!missionDone(i)){const g=gotList(i);m.choices.forEach((c,ci)=>{if(g.includes(ci))return;L.push({label:T_(c.label),fn:()=>answerMission(i,ci),hot:true});});
        if(!GUIDED)L.push({label:UI.elsewhere||'다른 곳으로…',fn:showPlaces,minor:true});setChoices(T_(g.length&&m.moreQuestion?m.moreQuestion:(m.question||m.title)),L);return;}}
    // 순서 유도 모드: 어디서든 다음 할 일 버튼 하나만
    if(GUIDED){let b;
      if(!Q.met)b={label:UI.meetGuide||'안내자와 이야기하기',fn:talkGuide,hot:true};
      else if(rem.length)b=missionBtn(rem[0]);
      else if(!Q.human)b=(n==='door'||n==='meet')?{label:UI.meetHuman||'휴먼쌤 만나기',fn:()=>startEnding(false),hot:true}:meetBtn();
      else b=enterBtn();
      setChoices(placeName(n),[b]);return;}
    // 자유 모드: 여러 선택지
    if(n==='hub'){if(!Q.met)L.push({label:UI.meetGuide||'안내자와 이야기하기',fn:talkGuide,hot:true});
      else if(rem.length)L.push(...rem.map((i,k)=>missionBtn(i,k===0)),{label:UI.talkGuide||'안내자와 이야기하기',fn:talkGuide});
      else if(!Q.human)L.push(meetBtn(),{label:UI.talkGuide||'안내자와 이야기하기',fn:talkGuide});
      else L.push({label:UI.toDoor||'문으로 가기',sub:T_(E.doorTitle||''),fn:()=>travel('door',()=>{faceTo(STAGE.door.pos.x,STAGE.door.pos.z);refreshChoices();}),hot:true},{label:UI.meetAgain||'휴먼쌤 다시 만나기',fn:()=>travel('meet',()=>startEnding(true),placeName('door'))},{label:UI.talkGuide||'안내자와 이야기하기',fn:talkGuide},
        {label:UI.restart||'처음부터 다시',fn:()=>setChoices(UI.restartAsk||'처음부터 다시 할까요?',[{label:UI.yes||'네',fn:restartAll,hot:true},{label:UI.no||'아니요',fn:refreshChoices}]),minor:true});}
    else if(n[0]==='s'){if(rem.length)L.push(...rem.map((i,k)=>missionBtn(i,k===0)));else if(!Q.human)L.push(meetBtn());
      L.push({label:UI.look||'여기 둘러보기',fn:lookAround},{label:UI.toGuide||'안내자에게 돌아가기',fn:toHub});}
    else if(n==='door'||n==='meet'){if(!Q.human)L.push({label:UI.meetHuman||'휴먼쌤 만나기',fn:()=>startEnding(false),hot:true});
      else L.push(enterBtn(),{label:UI.meetAgain||'휴먼쌤 다시 만나기',fn:()=>startEnding(true)},{label:UI.toGuide||'안내자에게 돌아가기',fn:toHub});}
    L.push({label:UI.elsewhere||'다른 곳으로…',fn:showPlaces,minor:true});setChoices(placeName(n),L.filter(Boolean));}

  /* =====================================================================
     ENDING — gather → appear → talk → door opens → enter → "곧 열립니다"
     ===================================================================== */
  const END=CFG.ending||{},PH={GATHER:0,APPEAR:1,TALK:2,DOOR:3,DONE:4};
  const cine={active:false,phase:0,pt:0,li:0,ci:0,full:'',cut:true,replay:false,orbs:[],doorK:0,lines:[]};
  const cPos=new THREE.Vector3(),cLook=new THREE.Vector3();
  function letterbox(){const h=innerHeight,w=innerWidth;const bar=Math.max(6,Math.min(h*0.09,(h-w/2.39)/2));document.documentElement.style.setProperty('--bar',bar.toFixed(1)+'px');}
  function cineTitle(t){const el=$('#cineTitle');el.textContent=t||'';el.classList.toggle('on',!!t);}
  function setSub(who,text){$('#cineWho').textContent=who;$('#cineText').textContent=text;$('#cineSubs').classList.toggle('show',!!(who||text));}
  function startEnding(replay){if(cine.active)return;if(talk.open)closeTalk();if(cardOpen){$('#card').hidden=true;cardOpen=false;}
    hideChoices();clearShot();$('#toast').classList.remove('show');J.busy=true;J.traveling=false;player.path=[];walkTo=null;
    Object.assign(cine,{active:true,phase:replay?PH.APPEAR:PH.GATHER,pt:0,li:0,ci:0,full:'',cut:true,replay:!!replay,orbs:[],doorK:0,appearSnd:false,lines:(END.lines||['안녕하세요.']).map(l=>T_(l))});
    SND('music','ending');if(!replay)SND('sfx','gather');
    letterbox();document.body.classList.add('cine','talking');$('#cine').hidden=false;setSub('','');$('#cineNext').hidden=true;$('#cineSkip').textContent=UI.skip||'건너뛰기';$('#cineNext').textContent=UI.tapNext||'눌러서 계속';$('#cineFade').classList.remove('on');
    player.pos.copy(STAGE.meet);player.vx=player.vz=0;player.faceT=null;player.facing=Math.PI;J.node='meet';
    hState.pos.copy(STAGE.human);hState.facing=Math.atan2(player.pos.x-hState.pos.x,player.pos.z-hState.pos.z);human.root.visible=false;hState.scale=0;human.act=null;STAGE.door.open(0);
    if(replay){cineTitle('');}else{cineTitle(T_(END.gatherTitle||''));
      cine.orbs=STAGE.spots.map(s=>{const o=new THREE.Mesh(new THREE.SphereGeometry(0.22,24,18),new THREE.MeshStandardMaterial({color:s.col,emissive:s.col,emissiveIntensity:2,roughness:.3}));o.position.copy(s.pos).setY(1.65);
        const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:s.col,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));gl.scale.setScalar(1.4);o.add(gl);scene.add(o);return{o,from:o.position.clone(),col:s.col};});}}
  function nextPhase(){cine.phase++;cine.pt=0;cine.cut=true;}
  function cineShowLine(){cine.full=cine.lines[cine.li]||'';cine.ci=0;cine.hold=0;cine.t0=performance.now();setSub(human.name,'');$('#cineNext').hidden=true;human.act='talk';cine.cut=true;}
  function cineAdvance(){if(!cine.active)return;const p=cine.phase;
    if(p===PH.TALK){if(cine.ci<cine.full.length){cine.ci=cine.full.length;setSub(human.name,cine.full);human.act=null;$('#cineNext').hidden=false;return;}
      cine.li++;if(cine.li>=cine.lines.length){setSub('','');$('#cineNext').hidden=true;human.act='open';nextPhase();SND('sfx','door');cineTitle(T_(END.doorTitle||''));}else cineShowLine();return;}
    if(cine.pt>0.6)cine.pt+=99;}
  function finishEnding(){SND('music','day');cine.orbs.forEach(x=>scene.remove(x.o));cine.orbs=[];hState.scale=1;human.root.visible=true;human.act=null;STAGE.door.open(1);cine.doorK=1;
    hState.pos.set(2.1,0,-6.0);hState.facing=Math.atan2(player.pos.x-hState.pos.x,player.pos.z-hState.pos.z);
    Q.human=true;qSave();checklistUI();cine.active=false;document.body.classList.remove('cine','talking');$('#cine').hidden=true;cineTitle('');setSub('','');J.busy=false;J.node='meet';DIR.init=false;camYaw=0;camPitch=0.3;refreshChoices();}
  $('#cine').addEventListener('pointerdown',e=>{if(e.target.closest('#cineSkip,#arrGo'))return;e.preventDefault();if(END.autoAdvance===false)cineAdvance();});
  $('#cineSkip').onclick=()=>{if(cine.active)finishEnding();else if(ARR.active)skipArrival();};
  function updateEnding(dt){cine.pt+=dt;const pt=cine.pt;let rate=4;const Hp=hState.pos,P=player.pos;
    switch(cine.phase){
      case PH.GATHER:{const k=Math.min(1,pt/3.4),e=ez(k);const tgt=new THREE.Vector3(Hp.x,2.4,Hp.z);
        cine.orbs.forEach((x,i)=>{const f=x.from;const a=Math.min(1,Math.max(0,(k-i*0.08)/0.8));const ee=ez(a);x.o.position.set(lerp(f.x,tgt.x,ee),lerp(f.y,tgt.y+Math.sin(a*Math.PI)*2.2,ee),lerp(f.z,tgt.z,ee));x.o.scale.setScalar(1+Math.sin(T*6+i)*0.08);});
        const a=0.9-e*0.9;cPos.set(Math.sin(a)*12,8.5-e*5,Math.cos(a)*12-2);cLook.set(0,1.6-e*0.4,lerp(0,Hp.z,e));rate=2.6;
        if(k>=1){cine.orbs.forEach(x=>{burst(x.o.position,x.col,80,5,1.3);scene.remove(x.o);});cine.orbs=[];burst(new THREE.Vector3(Hp.x,1.4,Hp.z),'#fff6dc',160,5,1.6);SND('sfx','appear');cineTitle(T_(END.appearTitle||''));nextPhase();}break;}
      case PH.APPEAR:{const k=Math.min(1,pt/2.2);human.root.visible=true;hState.scale=ez(k);if(cine.pt<0.05&&cine.replay&&!cine.appearSnd){cine.appearSnd=true;burst(new THREE.Vector3(Hp.x,1.4,Hp.z),'#fff6dc',160,5,1.6);SND('sfx','appear');}
        {const f=hState.facing;cPos.set(Hp.x+Math.sin(f)*2.4+Math.cos(f)*1.5,1.4-k*0.1,Hp.z+Math.cos(f)*2.4-Math.sin(f)*1.5);cLook.set(Hp.x,1.2,Hp.z);rate=3.2;}
        if(k>=1){cineTitle('');human.emote('wave');nextPhase();cineShowLine();}break;}
      case PH.TALK:{const auto=END.autoAdvance!==false,len=cine.full.length;
        // 실제 시계(performance.now) 기준: 느린 기기에서 프레임이 떨어져도 글자 속도와 머무는 시간이 같다
        const el=(performance.now()-(cine.t0||performance.now()))/1000,typeSec=len/16,holdSec=(END.lineHold||1.1)+len*0.05;
        if(cine.ci<len){cine.ci=Math.min(len,el*16);setSub(human.name,cine.full.slice(0,Math.floor(cine.ci)));
          if(cine.ci>=len){human.act=null;if(!auto)$('#cineNext').hidden=false;}}
        else if(auto&&el>=typeSec+holdSec){cine.li++;if(cine.li>=cine.lines.length){setSub('','');human.act='open';nextPhase();SND('sfx','door');cineTitle(T_(END.doorTitle||''));}else cineShowLine();}
        // 옆에서 두 사람을 함께 찍는다. 세로 화면에서는 방문자 어깨 뒤쪽으로 돌아(두 사람이 화면 가로로 덜 벌어짐) 뒤로 물린다
        const mx=(P.x+Hp.x)/2,mz=(P.z+Hp.z)/2,dx=Hp.x-P.x,dz=Hp.z-P.z,l=Math.hypot(dx,dz)||1,th=0.85*clamp((1.3-camera.aspect)/0.8,0,1);
        const vx=(-dz/l)*Math.cos(th)-(dx/l)*Math.sin(th),vz=(dx/l)*Math.cos(th)-(dz/l)*Math.sin(th);
        cPos.set(mx+vx*3.4,1.5,mz+vz*3.4);cLook.set(mx,1.2,mz);fitBack(cPos,cLook,1.3);cPos.y=Math.min(cPos.y,2.4);rate=2.2;break;}
      case PH.DOOR:{const k=Math.min(1,pt/3.2);cine.doorK=ez(k);STAGE.door.open(cine.doorK);const D=STAGE.door.pos;
        cPos.set(P.x+3.2-k*0.8,2.2,P.z+3.0);cLook.set(D.x,1.9,D.z);rate=2.4;if(k>=0.5&&!cine.doorBurst){cine.doorBurst=true;burst(new THREE.Vector3(D.x,2,D.z+0.3),'#ffe9c0',120,4,1.5);}
        if(k>=1&&pt>4.2){cine.doorBurst=false;finishEnding();return;}break;}}
    if(cine.cut){DIR.pos.copy(cPos);DIR.look.copy(cLook);cine.cut=false;}
    DIR.pos.lerp(cPos,1-Math.exp(-dt*rate));DIR.look.lerp(cLook,1-Math.exp(-dt*(rate+1)));camera.position.copy(DIR.pos);camera.lookAt(DIR.look);}
  function enterDoor(){hideChoices();J.busy=true;const D=STAGE.door.pos;
    travel('gate',()=>{if(AD){startArrival();return;}$('#cineFade').classList.add('on');setTimeout(()=>{Q.entered=true;qSave();checklistUI();showEnd();},1100);},T_(END.doorTitle||'문'));
    shot((k,pos,look)=>{const P=player.pos;pos.set(P.x+1.6,1.7,P.z+3.4-k*0.5);look.set(D.x,1.8,D.z);},9,null,false);}

  /* =====================================================================
     ARRIVAL — 문 너머 도착 연출 약 20초(기획안 「메인월드-문너머」 3절). 같은 페이지에서 이어진다.
     WHITE 0~2 → CITY 2~7 → LIGHTS 7~11 → DESCEND 11~16 → RINI 16~20 → 버튼 하나 → '곧 열립니다'(showEnd)
     시간은 performance.now 기준(느린 기기에서도 20초). 건너뛰기는 끝 장면(리니 앞, 버튼)으로 바로 간다.
     도시는 처음 문을 열 때 한 번만 짓는다. 설정: CFG.afterDoor(없으면 예전처럼 바로 '곧 열립니다')
     ===================================================================== */
  const AD=CFG.afterDoor||null,ARR_LEN=20.2,PZC=(AD&&AD.plaza)||null;   // PZC: 2단계 광장 설정(아래 PLAZA)
  const ARR={active:false,begun:false,t0:0,cut:true,skip:false,btn:false,fired:{},saved:null,orbs:[]};
  let CITY=null;
  // 리니 3D(설정 afterDoor.riniModel). 미리 불러 두고, 없거나 실패하면 임시 로봇(makeBot)을 쓴다. 로봇이라 사람용 자세 보정은 끈다
  let RINI_GLB=null,RINI_WAIT=!!(AD&&AD.riniModel&&AD.riniModel.url);   // RINI_WAIT: 아직 불러오는 중(실패하면 false)
  if(RINI_WAIT)loadGltf(AD.riniModel.url).then(g=>{RINI_GLB=new GlbChar(g,Object.assign({poseFix:{armSpread:0,shoulderLift:0,armLength:1,spineBend:0,neckBend:0,headBend:0}},AD.riniModel));RINI_GLB.isGlb=true;RINI_WAIT=false;})
    .catch(e=>{RINI_WAIT=false;console.warn('[world] 리니 3D를 불러오지 못해 임시 로봇을 씁니다:',e);});
  function buildCityStage(){
    const C=new THREE.Vector3(CITY_X,0,0),g=new THREE.Group();g.position.copy(C);scene.add(g);const rnd=mulberry32(23);
    const flat=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;g.add(m);return m;};
    // 바닥 · 십자 길 · 광장(가운데 낮은 분수)
    flat(new THREE.PlaneGeometry(260,260),std('#3b3946',{roughness:.95}),0,0,0);
    const road=std('#2a2a33',{roughness:.9});flat(new THREE.PlaneGeometry(5,200),road,0,0.01,0);flat(new THREE.PlaneGeometry(200,5),road,0,0.011,0);
    const dash=new THREE.MeshBasicMaterial({color:'#7d7466'});
    for(let s=10;s<70;s+=4){flat(new THREE.PlaneGeometry(0.14,1.6),dash,0,0.02,s);flat(new THREE.PlaneGeometry(0.14,1.6),dash,0,0.02,-s);flat(new THREE.PlaneGeometry(1.6,0.14),dash,s,0.02,0);flat(new THREE.PlaneGeometry(1.6,0.14),dash,-s,0.02,0);}
    flat(new THREE.CircleGeometry(8.6,72),std('#69657a',{roughness:.85}),0,0.03,0);
    flat(new THREE.RingGeometry(8.35,8.6,72),std('#8d88a0',{roughness:.7}),0,0.035,0);
    flat(new THREE.RingGeometry(3.1,3.22,72),std('#7f7a91',{roughness:.7}),0,0.035,0);
    const stone=std('#7b7689',{roughness:.8});
    const basin=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.6,0.42,40,1,true),stone);basin.position.y=0.21;g.add(basin);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(1.52,0.08,8,48),stone);rim.rotation.x=Math.PI/2;rim.position.y=0.43;g.add(rim);
    flat(new THREE.CircleGeometry(1.5,40),new THREE.MeshStandardMaterial({color:'#2c4a66',emissive:'#3d7aa8',emissiveIntensity:.35,roughness:.15,metalness:.2}),0,0.32,0);
    const spout=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,0.9,16),stone);spout.position.y=0.45;g.add(spout);
    // 건물: 창문 질감 3종(불 켜진 창은 emissiveMap). 지붕은 창 없는 칸을 가리키게 UV를 모은다
    const winMats=[0,1,2].map(v=>{const r=mulberry32(100+v),wall=['#4c5062','#575163','#465058'][v],pat=[];for(let i=0;i<64;i++)pat.push(r()<[0.3,0.22,0.36][v]);
      const cell=(c,i)=>c.fillRect((i%8)*32+8,Math.floor(i/8)*32+12,16,14);
      const map=canvasTex(256,256,c=>{c.fillStyle=wall;c.fillRect(0,0,256,256);pat.forEach((on,i)=>{c.fillStyle=on?'#ffe2b0':'#272c39';cell(c,i);});});
      const em=canvasTex(256,256,c=>{c.fillStyle='#000';c.fillRect(0,0,256,256);c.fillStyle='#ffcf8a';pat.forEach((on,i)=>{if(on)cell(c,i);});});
      [map,em].forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;});
      return new THREE.MeshStandardMaterial({map,emissiveMap:em,emissive:'#ffffff',emissiveIntensity:1.0,roughness:.85});});
    const building=(x,z,w,d,h,mat)=>{const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv;
      for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;if(f===2||f===3){uv.setXY(i,0.5,0.985);continue;}uv.setXY(i,uv.getX(i)*(f<2?d:w)/12.8,uv.getY(i)*h/24);}
      const m=new THREE.Mesh(geo,mat);m.position.set(x,h/2,z);m.receiveShadow=true;g.add(m);rects.push({x,z,hw:w/2,hd:d/2});return m;};
    // rects·blocks: 광장에서 걸을 때 막는 곳(도시 가운데 기준). 로봇 학교 자리(PZC가 있을 때)는 비워 둔다
    const rects=[],blocks=[],SCH=PZC?{x:-16.5,z:-12.5,w:11,d:7,h:6.6}:null;
    for(let gx=-6;gx<=6;gx++)for(let gz=-6;gz<=6;gz++){const x=gx*8.5+(rnd()-.5)*2,z=gz*8.5+(rnd()-.5)*2,r=Math.hypot(x,z);
      if(r<14||r>52||Math.abs(x)<6.8||Math.abs(z)<6.8||rnd()<0.15)continue;
      const w=4+rnd()*3.5,d=4+rnd()*3.5,h=(5+rnd()*9)*(0.7+r/40),mi=Math.floor(rnd()*3);   // 난수 순서는 예전 그대로(도착 연출 모습 유지)
      if(SCH&&Math.abs(x-SCH.x)<w/2+SCH.w/2+1.2&&Math.abs(z-SCH.z)<d/2+SCH.d/2+1.2)continue;
      if(PZC&&z<-12&&Math.abs(x)<18)continue;   // 섬 출발점 너머(북쪽)는 하늘의 섬이 보이게 비워 둔다
      building(x,z,w,d,h,winMats[mi]);}
    // 가로등: 광장 뒤쪽 셋은 조각 색으로 켜지고, 길가의 나머지는 아직 꺼져 있다
    const metal=std('#2d2f38',{metalness:.5,roughness:.5});
    const lamp=(x,z,col,lit)=>{const L=new THREE.Group();L.position.set(x,0,z);g.add(L);blocks.push([x,z,0.4]);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.1,4.2,10),metal);pole.position.y=2.1;L.add(pole);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.3,12),metal);base.position.y=0.15;L.add(base);
      const hm=new THREE.MeshStandardMaterial({color:'#d9d4c8',emissive:col,emissiveIntensity:0,roughness:.4});
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.3,20,14),hm);head.position.y=4.45;L.add(head);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(0.38,0.25,16),metal);cap.position.y=4.82;L.add(cap);shadowize(L,true,false);
      if(!lit)return null;
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:col,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));glow.scale.setScalar(2.8);glow.position.y=4.45;L.add(glow);
      const light=new THREE.PointLight(col,0,15,1.5);light.position.y=4.2;L.add(light);
      return{head:new THREE.Vector3(x,4.45,z).add(C),col,on:k=>{hm.emissiveIntensity=k*2.4;glow.material.opacity=k*0.9;light.intensity=k*2.4;}};};
    const warm=new THREE.Color('#ffd9a0');
    const lamps=[[-5.8,-4.6],[0,-7.6],[5.8,-4.6]].map((p,i)=>lamp(p[0],p[1],warm.clone().lerp(new THREE.Color((M[i]&&M[i].color)||'#ffffff'),0.5),true));
    [[3.4,-16],[3.4,-28],[-3.4,-22],[16,3.4],[28,3.4],[-16,-3.4],[-28,-3.4],[-3.4,16],[3.4,26]].forEach(p=>lamp(p[0],p[1],warm,false));
    // 정류장: 표지판 + 벤치
    const bs=new THREE.Group();bs.position.set(10.5,0,3.9);g.add(bs);
    const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.6,8),metal);sp.position.set(-1.6,1.3,0);bs.add(sp);
    const sign=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.05,24),new THREE.MeshStandardMaterial({color:'#3f7fbf',emissive:'#3f7fbf',emissiveIntensity:.6}));sign.rotation.x=Math.PI/2;sign.position.set(-1.6,2.55,0);bs.add(sign);
    const wood=std('#8a6446',{roughness:.8});
    const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.08,0.5),wood);seat.position.y=0.48;bs.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.45,0.06),wood);back.position.set(0,0.78,0.24);back.rotation.x=-0.12;bs.add(back);
    for(const s of[-0.8,0.8]){const leg=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.48,0.42),metal);leg.position.set(s,0.24,0);bs.add(leg);}
    shadowize(bs,true,true);blocks.push([10.2,3.8,1.25]);
    const out={group:g,C,lamps,rects,blocks,dock:null,islands:[],islandC:null};
    if(PZC)buildPlazaExtras(g,C,flat,metal,rects,blocks,SCH,out);
    return out;
  }
  // 2단계 광장에만 쓰는 것: 로봇 학교(풍경 건물), 섬 출발점(빈 승강장 + 안내판), 북쪽 하늘의 섬들(모두 '준비 중')
  function buildPlazaExtras(g,C,flat,metal,rects,blocks,SCH,out){const P=PZC;
    const label=(w,h,draw)=>{const t=canvasTex(w,h,draw);t.anisotropy=4;return t;};
    const FONT='"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    // 로봇 학교: 크림색 2층 건물, 앞면(+z, 광장 쪽)에 창·문·시계·이름
    {const S=SCH,wall='#eadfca';
      const front=label(1024,616,(c,w,h)=>{c.fillStyle=wall;c.fillRect(0,0,w,h);c.fillStyle='#d9ccb1';c.fillRect(0,h*0.47,w,8);
        c.fillStyle='#3d4a63';c.fillRect(w*0.3,h*0.08,w*0.4,h*0.15);c.fillStyle='#fff6e2';c.font=`900 ${Math.round(h*0.095)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(T_(P.school||'로봇 학교'),w/2,h*0.157);
        for(const row of[0.29,0.6])for(let i=0;i<6;i++){if(row>0.5&&(i===2||i===3))continue;const x=w*(0.07+i*0.148);c.fillStyle='#ffe2b0';c.fillRect(x,h*row,w*0.1,h*0.2);c.fillStyle='#c8b994';c.fillRect(x+w*0.048,h*row,6,h*0.2);}
        c.fillStyle='#7a5a44';c.fillRect(w*0.43,h*0.62,w*0.14,h*0.38);c.fillStyle='#ffd9a0';c.fillRect(w*0.445,h*0.66,w*0.11,h*0.34);});
      const em=label(1024,616,(c,w,h)=>{c.fillStyle='#000';c.fillRect(0,0,w,h);c.fillStyle='#b88a52';
        for(const row of[0.29,0.6])for(let i=0;i<6;i++){if(row>0.5&&(i===2||i===3))continue;c.fillRect(w*(0.07+i*0.148),h*row,w*0.1,h*0.2);}c.fillStyle='#ffcf8a';c.fillRect(w*0.445,h*0.66,w*0.11,h*0.34);c.fillStyle='#5a4a3a';c.fillRect(w*0.3,h*0.08,w*0.4,h*0.15);});
      const side=std(wall,{roughness:.85}),fm=new THREE.MeshStandardMaterial({map:front,emissiveMap:em,emissive:'#ffffff',emissiveIntensity:.9,roughness:.85});
      const top=std('#9a6a55',{roughness:.8});
      const b=new THREE.Mesh(new THREE.BoxGeometry(S.w,S.h,S.d),[side,side,top,side,fm,side]);b.position.set(S.x,S.h/2,S.z);b.receiveShadow=true;b.castShadow=true;g.add(b);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(S.w+0.6,0.35,S.d+0.6),top);roof.position.set(S.x,S.h+0.17,S.z);g.add(roof);
      const clk=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.62,0.12,32),new THREE.MeshStandardMaterial({color:'#fff8ea',emissive:'#ffe9c2',emissiveIntensity:.5}));clk.rotation.x=Math.PI/2;clk.position.set(S.x,S.h+0.95,S.z+S.d/2-0.4);g.add(clk);
      const clkB=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.5,0.5),top);clkB.position.set(S.x,S.h+0.95,S.z+S.d/2-0.75);g.add(clkB);
      for(const [len,rz] of[[0.42,0.5],[0.3,2.1]]){const hand=new THREE.Mesh(new THREE.BoxGeometry(0.05,len,0.03),std('#2b2f3a'));hand.geometry.translate(0,len/2,0);hand.position.set(S.x,S.h+0.95,S.z+S.d/2-0.33);hand.rotation.z=rz;g.add(hand);}
      rects.push({x:S.x,z:S.z,hw:S.w/2,hd:S.d/2});}
    // 섬 출발점: 북쪽 큰길 위의 둥근 승강장(빈 자리, 출발 수단은 시안 뒤에 정함) + 안내판
    const D={x:0,z:-18.2};
    flat(new THREE.CircleGeometry(2.7,56),std('#6c6780',{roughness:.7}),D.x,0.045,D.z);
    const ringM=new THREE.MeshStandardMaterial({color:'#7fe3d0',emissive:'#7fe3d0',emissiveIntensity:.6,roughness:.4});
    flat(new THREE.RingGeometry(2.48,2.7,56),ringM,D.x,0.05,D.z);flat(new THREE.RingGeometry(1.05,1.16,48),ringM,D.x,0.05,D.z);
    const B=P.board||{},rows=(B.rows||[]).slice(0,5);
    const boardT=label(768,512,(c,w,h)=>{c.fillStyle='#1d2133';c.fillRect(0,0,w,h);c.strokeStyle='#7fe3d0';c.lineWidth=6;c.strokeRect(10,10,w-20,h-20);
      c.fillStyle='#f4f3f7';c.font=`900 ${Math.round(h*0.13)}px ${FONT}`;c.textAlign='left';c.textBaseline='middle';c.fillText(T_(B.title||'섬 출발점'),48,h*0.19);
      rows.forEach((r,i)=>{const y=h*(0.42+i*0.17);c.fillStyle='rgba(244,243,247,.35)';c.beginPath();c.arc(64,y,13,0,7);c.fill();
        c.fillStyle='rgba(244,243,247,.75)';c.font=`500 ${Math.round(h*0.085)}px ${FONT}`;c.fillText(T_(r),98,y);});});
    const bd=new THREE.Group();bd.position.set(D.x-3.0,0,D.z+0.7);bd.rotation.y=0.42;g.add(bd);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.27),new THREE.MeshStandardMaterial({map:boardT,emissiveMap:boardT,emissive:'#ffffff',emissiveIntensity:.55,roughness:.6}));face.position.y=1.75;bd.add(face);
    const backP=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.37,0.06),metal);backP.position.set(0,1.75,-0.04);bd.add(backP);
    for(const s of[-0.85,0.85]){const post=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,1.2,8),metal);post.position.set(s,0.6,-0.04);bd.add(post);}
    shadowize(bd,true,false);blocks.push([bd.position.x,bd.position.z,1.1]);
    out.dock=new THREE.Vector3(C.x+D.x,0,C.z+D.z);
    // 북쪽 하늘의 섬들: 떠 있는 바위 + 풀밭 + 나무 + 꺼진 등(섬이 열리면 켜진다). 주제가 정해지기 전이라 이름은 없다
    // 거리에서 올려다보므로 밑면(둥근 바위)과 위로 솟은 나무·등대가 모양을 만든다
    const IP=[[-22,24,-96,9],[4,32,-110,11],[26,21,-92,8],[-7,17,-80,5],[40,28,-112,7]],n=clamp(P.islands==null?3:P.islands,0,IP.length),sum=new THREE.Vector3();
    const rockM=std('#6a5f74',{roughness:.95}),grassM=std('#62806a',{roughness:.9}),treeM=std('#4a6b55',{roughness:.9});
    for(let i=0;i<n;i++){const [x,y,z,r]=IP[i],o=new THREE.Group();o.position.set(x,y,z);o.userData.y=y;g.add(o);
      const bowl=new THREE.Mesh(new THREE.SphereGeometry(r,18,10,0,Math.PI*2,Math.PI/2,Math.PI/2),rockM);bowl.scale.y=0.75;o.add(bowl);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(r*0.55,r*0.9,9,1),rockM);tip.rotation.x=Math.PI;tip.position.y=-r*0.75-r*0.3;o.add(tip);
      const top=new THREE.Mesh(new THREE.CylinderGeometry(r*1.0,r*1.0,r*0.12,20),grassM);top.position.y=r*0.06;o.add(top);
      for(let k=0;k<6;k++){const a=k*1.05+i,rr=r*(0.35+0.55*((k*37+i*11)%10)/10),th=r*(0.55+0.25*((k*13+i*7)%5)/5);const t=new THREE.Mesh(new THREE.ConeGeometry(r*0.14,th,7),treeM);t.position.set(Math.cos(a)*rr,r*0.12+th/2,Math.sin(a)*rr);o.add(t);}
      // 아직 꺼진 등(섬이 열리면 켜진다): 기둥 + 희미한 빛
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(r*0.025,r*0.03,r*1.1,6),metal);pole.position.y=r*0.67;o.add(pole);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(r*0.1,14,10),new THREE.MeshStandardMaterial({color:'#cfc8da',emissive:'#ffd9a0',emissiveIntensity:.25,roughness:.4}));bulb.position.y=r*1.25;o.add(bulb);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:'#ffd9a0',transparent:true,opacity:.22,depthWrite:false,toneMapped:false}));glow.scale.setScalar(r*0.9);glow.position.y=r*1.25;o.add(glow);
      out.islands.push(o);sum.add(o.position);}
    out.islandC=n?sum.divideScalar(n).add(C):new THREE.Vector3(C.x,30,C.z-100);}
  // 둥근 머리 로봇(리니 임시 모델·거리의 로봇). 바퀴 대신 떠 있는 받침
  function makeBot(o){const root=new THREE.Group(),inner=new THREE.Group();inner.scale.setScalar(o.s||1);root.add(inner);
    const bm=std(o.body,{roughness:.42,metalness:.08,emissive:o.body,emissiveIntensity:o.glow||0}),am=std(o.accent,{roughness:.5});
    const eye=new THREE.MeshStandardMaterial({color:o.eye,emissive:o.eye,emissiveIntensity:1.8,roughness:.3});
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.26,0.26,6,16),bm);torso.position.y=0.56;inner.add(torso);
    const belly=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),am);belly.position.set(0,0.58,0.24);belly.scale.z=0.4;inner.add(belly);
    const head=new THREE.Group();head.position.y=1.12;inner.add(head);
    const hr=o.head||0.34;head.add(new THREE.Mesh(new THREE.SphereGeometry(hr,24,18),bm));
    // 얼굴 화면(검은 유리)은 머리 앞으로 조금 나오게, 눈은 그 위에
    const visor=new THREE.Mesh(new THREE.SphereGeometry(0.27,24,16),new THREE.MeshStandardMaterial({color:'#1a1f2e',roughness:.18,metalness:.2}));visor.scale.set(1.1,0.75,0.6);visor.position.set(0,-0.01,hr-0.1);head.add(visor);
    const eyes=[-0.09,0.09].map(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.048,12,10),eye);e.position.set(x,0.0,hr+0.045);e.scale.set(1,1.25,0.6);head.add(e);return e;});
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.2,6),am);ant.position.y=(o.head||0.34)+0.08;head.add(ant);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,10),new THREE.MeshStandardMaterial({color:o.accent,emissive:o.accent,emissiveIntensity:1.2}));tip.position.y=(o.head||0.34)+0.2;head.add(tip);
    const arms=[-1,1].map(s=>{const a=new THREE.Group();a.position.set(0.3*s,0.72,0);inner.add(a);const al=o.arm||0.2,m=new THREE.Mesh(new THREE.CapsuleGeometry(0.06,al,4,8),bm);m.position.y=-al/2-0.04;a.add(m);a.rotation.z=0.18*s;return a;});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.08,20),am);base.position.y=0.18;inner.add(base);
    shadowize(root,true,false);return{root,inner,head,arms,eyes};}
  function arrivalCast(){const C=CITY.C,P=(x,z)=>new THREE.Vector3(C.x+x,0,C.z+z);const cast={walkers:[],extras:[]};
    const person=(look,opts)=>{const c=new Char(look,Object.assign({bag:false},opts||{}));c.tag.visible=false;scene.add(c.root);cast.extras.push(c.root);return c;};
    const bot=o=>{const b=makeBot(o);scene.add(b.root);cast.extras.push(b.root);return b;};
    const walk=(obj,a,b,speed,u,side)=>cast.walkers.push({obj,a,b,speed,u,side:side||0,pos:new THREE.Vector3()});
    // 거리 풍경: 오가는 사람, 장바구니를 같이 드는 사람과 작은 로봇, 혼자 다니는 로봇, 정류장의 노인
    walk(person([1,0,4,1,1]),P(-32,1.4),P(32,1.4),1.25,0.42);
    const shopper=person([0,1,0,4,0]),helper=bot({body:'#9aa7ba',accent:'#ffcf6b',eye:'#ffd98f',s:0.78});
    const basket=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.26,0.32),std('#c48a4c',{roughness:.8}));scene.add(basket);cast.extras.push(basket);
    walk(shopper,P(30,-3.3),P(-30,-3.3),1.0,0.38,-0.42);walk(helper,P(30,-3.3),P(-30,-3.3),1.0,0.38,0.42);   // 둘이 함께 분수대 뒤로 지나간다(2단계에서 z -1.3 → -3.3)cast.basket={a:shopper,b:helper,m:basket};
    walk(bot({body:'#c7ccd6',accent:'#7fd3c4',eye:'#9ff3ff',s:0.9}),P(-1.4,-34),P(-1.4,30),0.9,0.47);
    walk(person([2,2,2,0,2]),P(1.5,30),P(1.5,-30),1.1,0.4);
    const elder=person([0,3,5,4,1],{pants:'#4a4650'});elder.update(0.016,T,{pos:P(9.9,3.3),facing:Math.PI});cast.elder=elder;
    const rini=RINI_GLB||makeBot({body:'#f4f1ea',accent:'#ff9f7a',eye:'#8ff4ff',s:0.66,head:0.4,glow:0.12,arm:0.3});scene.add(rini.root);cast.extras.push(rini.root);cast.rini=rini;
    if(rini.isGlb){rini.waving=false;rini.hold='idle';rini.act=null;rini.facing=-0.6;rini.setState('idle');}
    return cast;}
  let CITY_ON=false;   // 도시 조명·하늘을 켠 상태(두 번 켜면 저장해 둔 월드 1 값을 덮어쓰므로 막는다)
  function arrSet(on){if(!!on===CITY_ON)return;CITY_ON=!!on;const A=AD||{},S=ARR.saved||(ARR.saved={});
    if(on){S.sky=[skyU.top.value.clone(),skyU.hor.value.clone(),skyU.bot.value.clone()];S.fog=[scene.fog.color.clone(),scene.fog.near,scene.fog.far];
      S.hemi=[hemi.color.clone(),hemi.groundColor.clone(),hemi.intensity];S.sun=[sun.color.clone(),sun.intensity,sun.position.clone(),sun.target.position.clone()];S.exp=renderer.toneMappingExposure;S.bloom=bloomPass?bloomPass.strength:0;
      S.vis=[STAGE.group.visible,guide.root.visible,human.root.visible,qMark.visible,me.tag.visible];
      const sk=A.sky||{};skyU.top.value.set(sk.top||'#1b2244');skyU.hor.value.set(sk.hor||'#d9876a');skyU.bot.value.set(sk.bot||'#29242f');skyU.ctr.value.copy(CITY.C);sky.position.copy(CITY.C);
      scene.fog.color.set(A.fog||'#5d4f68');scene.fog.near=34;scene.fog.far=150;
      hemi.color.set('#8d9ccc');hemi.groundColor.set('#382c36');hemi.intensity=0.42;sun.color.set('#ffb48a');sun.intensity=0.6;sun.position.copy(CITY.C).add(new THREE.Vector3(-20,16,12));sun.target.position.copy(CITY.C);
      renderer.toneMappingExposure=1.0;if(bloomPass)bloomPass.strength=0.55;
      STAGE.group.visible=false;guide.root.visible=false;human.root.visible=false;qMark.visible=false;me.tag.visible=false;CITY.group.visible=true;}
    else{skyU.top.value.copy(S.sky[0]);skyU.hor.value.copy(S.sky[1]);skyU.bot.value.copy(S.sky[2]);skyU.ctr.value.set(0,0,0);sky.position.set(0,0,0);
      scene.fog.color.copy(S.fog[0]);scene.fog.near=S.fog[1];scene.fog.far=S.fog[2];hemi.color.copy(S.hemi[0]);hemi.groundColor.copy(S.hemi[1]);hemi.intensity=S.hemi[2];
      sun.color.copy(S.sun[0]);sun.intensity=S.sun[1];sun.position.copy(S.sun[2]);sun.target.position.copy(S.sun[3]);renderer.toneMappingExposure=S.exp;if(bloomPass)bloomPass.strength=S.bloom;
      [STAGE.group.visible,guide.root.visible,human.root.visible,qMark.visible,me.tag.visible]=S.vis;CITY.group.visible=false;}}
  function startArrival(){if(ARR.active)return;hideChoices();clearShot();J.busy=true;SND('music','city');SND('sfx','whoosh');
    Object.assign(ARR,{active:true,begun:false,t0:performance.now(),cut:true,skip:false,btn:false,fired:{},orbs:[],waited:0});
    letterbox();document.body.classList.add('cine','talking');$('#cine').hidden=false;cineTitle('');setSub('','');$('#cineNext').hidden=true;
    $('#cineSkip').hidden=false;$('#cineSkip').textContent=UI.skip||'건너뛰기';$('#cineFade').classList.add('on');}
  function beginArrival(){ARR.begun=true;if(!CITY)CITY=buildCityStage();arrSet(true);ARR.cast=arrivalCast();Q.entered=true;qSave();checklistUI();
    player.pos.set(CITY.C.x-1.3,0,CITY.C.z+4.8);player.vx=player.vz=0;player.path=[];player.facing=Math.PI;player.faceT=null;}
  function skipArrival(){if(!ARR.active||ARR.btn)return;ARR.skip=true;ARR.t0=performance.now()-ARR_LEN*1000;ARR.cut=true;if(!ARR.begun)beginArrival();
    ARR.orbs.forEach(o=>scene.remove(o.m));ARR.orbs=[];$('#cineFade').classList.remove('on');}
  function finishArrival(){const go=$('#arrGo');if(go)go.remove();ARR.orbs.forEach(o=>scene.remove(o.m));ARR.orbs=[];
    ARR.active=false;ARR.btn=false;$('#cineSkip').hidden=false;$('#cine').hidden=true;document.body.classList.remove('cine','talking');cineTitle('');setSub('','');
    // 2단계: 같은 장면에서 광장으로 이어지고, 리니가 섬 출발점으로 앞장선다
    if(PZC&&ARR.cast){const c=ARR.cast;ARR.cast=null;enterPlaza(c);startGuide(true);return;}
    (ARR.cast?ARR.cast.extras:[]).forEach(o=>scene.remove(o));ARR.cast=null;arrSet(false);showEnd();}
  // 거리의 사람·로봇(긴 길을 한 방향으로 걷는다). 분수대 가까이에서는 바깥으로 비켜 돈다. 도착 연출과 광장이 같이 쓴다
  function castLife(cast,t,dt){const C=CITY.C;
    cast.walkers.forEach(w=>{const L=w.a.distanceTo(w.b),s=(w.u*L+t*w.speed)%L;const dx=(w.b.x-w.a.x)/L,dz=(w.b.z-w.a.z)/L,f=Math.atan2(dx,dz);
      w.pos.set(w.a.x+dx*s+dz*w.side,0,w.a.z+dz*s-dx*w.side);
      const lx=w.pos.x-C.x,lz=w.pos.z-C.z,rr=Math.hypot(lx,lz);if(rr<2.5){const k=2.5/Math.max(rr,0.01);w.pos.x=C.x+lx*k;w.pos.z=C.z+lz*k;}
      if(w.obj.update)w.obj.update(dt,T,{pos:w.pos,facing:f});else{w.obj.root.position.copy(w.pos);w.obj.root.position.y=0.04+Math.abs(Math.sin(T*7+w.u*9))*0.03;w.obj.root.rotation.y=f;w.obj.inner.rotation.x=0.06;
        w.obj.arms.forEach((ar,j)=>ar.rotation.x=Math.sin(T*7+j*Math.PI)*0.35);}});
    if(cast.basket){const p=cast.basket.a.root.position,q=cast.basket.b.root.position;cast.basket.m.position.set((p.x+q.x)/2,0.72,(p.z+q.z)/2);cast.basket.m.rotation.y=Math.atan2(q.x-p.x,q.z-p.z)+Math.PI/2;
      cast.basket.b.arms.forEach(ar=>ar.rotation.x=-0.9);}
    cast.elder.update(dt,T,{pos:cast.elder.root.position.clone(),facing:Math.PI});}
  // 카메라 키 장면(도시 가운데 기준): [초, 위치, 바라볼 곳]
  // 남쪽 큰길 위(|x|<3, 건물 없음)로 날아 들어와 광장에 내려앉는다
  const ARR_CAM=[[0,[0,44,60],[0,0,-6]],[7,[0,31,44],[0,1,-6]],[11,[-1.2,13,23],[0,2.6,-5]],[16,[-3.8,2.1,10.6],[0.4,1.2,-1]],[17.6,[1.0,1.75,8.9],[-0.7,0.9,3.3]],[20.2,[0.75,1.6,8.3],[-0.6,0.85,3.3]]];
  // 리니 걷기: t0~t1초 동안 speed(m/초)로 걷고, 걷기 동작은 anim 배속(보폭에 맞춤)
  // rini_v1 walk 동작은 1배속에서 디딘 발이 0.30m/초로 뒤로 간다(키 1.2m 기준 측정) → 2배속 + 0.6m/초면 발이 미끄러지지 않는다
  const RINI_WALK={t0:13.6,t1:17.6,speed:0.6,anim:2};
  // 세로 화면(폭이 좁음)에서는 가까운 장면의 카메라를 뒤로 물려 인물이 잘리지 않게 한다. ref = 그 장면을 맞춘 화면 비율
  function fitBack(pos,look,ref){const a=camera.aspect;if(a>=ref)return;pos.sub(look).multiplyScalar(Math.min(2.6,ref/a)).add(look);}
  // ARR.freeze(초)를 넣으면 그 순간에 멈춘다(시험·캡처용)
  function updateArrival(dt){const t=ARR.freeze!=null?ARR.freeze:(performance.now()-ARR.t0)/1000,A=AD||{};
    // 리니 3D를 아직 불러오는 중이면(건너뛰기로 바로 온 경우) 흰 화면에서 최대 10초 기다린다. 그래도 안 오면 임시 로봇으로 시작
    if(!ARR.begun){if(t<1.1)return;if(RINI_WAIT&&t<10){ARR.t0=performance.now()-1100;ARR.waited=(ARR.waited||0)+dt;if(ARR.waited<10)return;}beginArrival();}
    // 시작 뒤에 3D가 도착하면 임시 로봇을 3D 리니로 바꾼다
    if(RINI_GLB&&ARR.cast&&ARR.cast.rini!==RINI_GLB){const old=ARR.cast.rini;scene.remove(old.root);const R=RINI_GLB;scene.add(R.root);ARR.cast.extras.push(R.root);ARR.cast.rini=R;
      R.waving=false;R.hold='idle';R.act=null;R.facing=-0.6;R.setState('idle');if(t>18)ARR.fired.wave=false;}
    if(t>1.3)$('#cineFade').classList.remove('on');
    const C=CITY.C,cast=ARR.cast;
    // 카메라
    let i=0;while(i<ARR_CAM.length-2&&t>ARR_CAM[i+1][0])i++;const a=ARR_CAM[i],b=ARR_CAM[i+1],k=ez(clamp((t-a[0])/(b[0]-a[0]),0,1));
    cPos.set(C.x+lerp(a[1][0],b[1][0],k),lerp(a[1][1],b[1][1],k),C.z+lerp(a[1][2],b[1][2],k));cLook.set(C.x+lerp(a[2][0],b[2][0],k),lerp(a[2][1],b[2][1],k),C.z+lerp(a[2][2],b[2][2],k));
    if(t>15)fitBack(cPos,cLook,1.25*clamp((t-15)/2,0,1)+0.0001);
    if(ARR.cut){DIR.pos.copy(cPos);DIR.look.copy(cLook);ARR.cut=false;}
    DIR.pos.lerp(cPos,1-Math.exp(-dt*6));DIR.look.lerp(cLook,1-Math.exp(-dt*7));camera.position.copy(DIR.pos);camera.lookAt(DIR.look);
    if(ARR.camOv){camera.position.copy(ARR.camOv.p);camera.lookAt(ARR.camOv.l);}   // 시험·캡처용 카메라 고정
    // 자막 제목
    cineTitle(t>2.6&&t<6.6?T_(A.title||''):'');
    // 조각 세 개가 날아가 가로등을 켠다
    CITY.lamps.forEach((L,n)=>{const t1=7.3+n*0.6,t2=t1+2.1;
      if(t>=t1&&t<t2&&!ARR.skip){let o=ARR.orbs[n];if(!o){const m=new THREE.Mesh(new THREE.SphereGeometry(0.22,20,14),new THREE.MeshStandardMaterial({color:L.col,emissive:L.col,emissiveIntensity:2.2}));
          const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:L.col,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));gl.scale.setScalar(1.6);m.add(gl);scene.add(m);
          o=ARR.orbs[n]={m,from:new THREE.Vector3(C.x-3+n*3,15,C.z+20)};}
        const e=ez((t-t1)/(t2-t1));o.m.position.set(lerp(o.from.x,L.head.x,e),lerp(o.from.y,L.head.y,e)+Math.sin(e*Math.PI)*2.4,lerp(o.from.z,L.head.z,e));}
      if(t>=t2&&ARR.orbs[n]){scene.remove(ARR.orbs[n].m);ARR.orbs[n]=null;}
      if(t>=t2&&!ARR.fired['l'+n]){ARR.fired['l'+n]=true;if(!ARR.skip){burst(L.head,L.col,90,4,1.3);SND('sfx','lamp',n);}}
      L.on(clamp((t-t2)/0.7,0,1));});
    castLife(cast,t,dt);
    // 리니: 광장 오른쪽에서 두리번거리다가(16초~) 방문자 앞으로 와서 인사한다
    const R=cast.rini,to=new THREE.Vector3(player.pos.x+0.95,0,player.pos.z-1.6);
    if(R.isGlb){// 3D 리니: 두리번(대기) → 걸어갈 쪽으로 돌기 → 걷기 동작 보폭에 맞춘 일정한 속도로 걸어옴 → 손 인사(wave2) → 대기
      // 몸이 다리보다 빨리 움직이면 문워크처럼 미끄러진다(v0.6 폰 검수). 거리 = 속도 × 걷는 시간
      const W=RINI_WALK,dir=new THREE.Vector3(5,0,-5.8).normalize(),from=to.clone().addScaledVector(dir,W.speed*(W.t1-W.t0));
      const u=clamp((t-W.t0)/(W.t1-W.t0),0,1),walking=t>W.t0&&t<W.t1;
      const p=new THREE.Vector3().lerpVectors(from,to,u);
      const wantF=t<W.t0-0.6?-0.6+Math.sin(T*0.9)*0.5:walking||t<W.t0?Math.atan2(-dir.x,-dir.z):Math.atan2(player.pos.x-p.x,player.pos.z-p.z);
      {const d=wantF-R.facing;R.facing+=Math.atan2(Math.sin(d),Math.cos(d))*Math.min(1,dt*(walking?10:5));}
      R.hold=walking?'walk':'idle';if(R.actions.walk)R.actions.walk.timeScale=W.anim;
      if(t>18.0&&!ARR.fired.wave){ARR.fired.wave=true;R.emote('wave');SND('sfx','robot');}
      R.update(dt,T,{pos:p,facing:R.facing});}
    else{const from=new THREE.Vector3(C.x+4.6,0,C.z-2.6),mk=ez(clamp((t-16)/2.2,0,1));
    R.root.position.lerpVectors(from,to,mk);R.root.position.y=0.06+Math.sin(T*2.6)*0.04;
    const wantF=mk<=0?-0.6+Math.sin(T*0.9)*0.5:mk<1?Math.atan2(to.x-from.x,to.z-from.z):Math.atan2(player.pos.x-R.root.position.x,player.pos.z-R.root.position.z);
    {const d=wantF-R.root.rotation.y;R.root.rotation.y+=Math.atan2(Math.sin(d),Math.cos(d))*Math.min(1,dt*5);}R.inner.rotation.x=mk>0&&mk<1?0.12:0;
    R.head.rotation.y=mk<=0?Math.sin(T*1.7)*0.5:0;R.head.rotation.z=t>18.2?Math.sin(T*3)*0.08:0;
    // 인사: 깡충 한 번 + 팔을 옆으로 들어 흔들기(머리가 커서 위로 들면 가려진다)
    const wave=t>18.0&&t<21.5;if(t>18&&t<18.6)R.root.position.y+=Math.sin((t-18)/0.6*Math.PI)*0.1;R.arms[1].rotation.z=wave?1.85+Math.sin(T*10)*0.4:0.18;R.arms[0].rotation.z=-0.18;
    const blink=(T%3.2)<0.12;R.eyes.forEach(e=>e.scale.y=blink?0.2:1.25);}
    // 방문자(이 도시에 처음 온 사람)는 광장 입구에 서서 리니를 본다
    if(t>16.6)player.facing=Math.atan2(R.root.position.x-player.pos.x,R.root.position.z-player.pos.z);
    // 리니 대사
    const line=T_(A.riniLine||''),name=T_(A.riniName||'리니');
    if(t>=18.0&&line){const n=Math.min(line.length,Math.floor((t-18.0)*14));setSub(name,line.slice(0,n));}
    if(t>=ARR_LEN&&!ARR.btn){ARR.btn=true;$('#cineSkip').hidden=true;
      const go=document.createElement('button');go.id='arrGo';go.className='jb hot';go.textContent=T_(A.button||'계속');
      Object.assign(go.style,{position:'absolute',left:'50%',transform:'translateX(-50%)',bottom:'calc(var(--bar) + 92px)',zIndex:'4',flex:'none',width:'auto'});
      go.onclick=finishArrival;$('#cine').appendChild(go);}}
  /* =====================================================================
     PLAZA — 2단계 v0.1 광장 + 섬 출발점(기획안 「메인월드-문너머」 0-1절·8절 2단계, 2026-10-03).
     도착 연출 끝 버튼을 누르면 같은 장면에서 이어진다. 방문자가 직접 걷는다(폰 조이스틱, PC W·A·S·D/방향키).
     리니는 곁을 따라다니다가 '따라가기'를 누르면 섬 출발점까지 앞장선다(방문자는 자동으로 뒤따름, 조이스틱을 쓰면 혼자 걷기).
     출발점에 닿으면 하늘의 섬들을 보여 주고 리니가 '준비 중'이라고 말한다. 출발 수단은 시안 뒤에 정한다(지금은 빈 승강장).
     두 번째 방문부터는 시작 화면에서 광장으로 바로 온다(Q.plaza). 설정: CFG.afterDoor.plaza(없으면 예전처럼 '곧 열립니다')
     ===================================================================== */
  const PZ={active:false,t:0,cast:null,rpos:new THREE.Vector3(),rface:0,rfaceT:0,rmode:'idle',rpath:[],rspeed:0,follow:false,waiting:false,cut:false,atDock:false,menu:false};
  // RINI_STEP: rini_v1 walk 1배속 보폭 속도(m/초). 걷기 배속 = 속도 ÷ 보폭 속도.
  // 2026-10-03 측정: 3.17배속에서 디딘 발(몸 기준)이 0.75~0.78m/초로 뒤로 간다 → 1배속 약 0.25(도착 연출의 0.30은 2배속 기준 어림)
  const PZ_SPEED=2.3,RINI_STEP=0.25,RINI_GUIDE=0.85,RINI_COME=1.0;
  const KEYS={},KEYMAP={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  addEventListener('keydown',e=>{const k=KEYMAP[e.code];if(!k||!PZ.active||(e.target&&e.target.closest&&e.target.closest('input,textarea')))return;KEYS[k]=true;e.preventDefault();});
  addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)KEYS[k]=false;});
  addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=false;});
  // 조이스틱(터치 기기): 살짝 밀면 0, 그 위는 걷기 속도 그대로(느린 걸음은 미끄러져 보인다 — webxr-world 노하우)
  const JOY={on:false,x:0,y:0,id:null};
  (()=>{const el=$('#joy'),knob=$('#joyKnob'),R=44;const setK=(x,y)=>{knob.style.transform=`translate(${x}px,${y}px)`;};
    const move=e=>{const r=el.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const d=Math.hypot(dx,dy);if(d>R){dx*=R/d;dy*=R/d;}JOY.x=dx/R;JOY.y=dy/R;setK(dx,dy);};
    el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();JOY.on=true;JOY.id=e.pointerId;try{el.setPointerCapture(e.pointerId);}catch(_){}move(e);});
    el.addEventListener('pointermove',e=>{if(JOY.on&&e.pointerId===JOY.id)move(e);});
    const end=e=>{if(e.pointerId!==JOY.id)return;JOY.on=false;JOY.x=JOY.y=0;setK(0,0);};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);})();
  // 걸을 수 있는 곳: 도시 안(반지름 46m) 가운데 건물·분수대·가로등·정류장·안내판이 아닌 곳
  function cityOK(x,z){if(!CITY)return true;const lx=x-CITY.C.x,lz=z-CITY.C.z,r=Math.hypot(lx,lz);if(r<1.95||r>46)return false;
    for(const b of CITY.blocks)if(Math.hypot(lx-b[0],lz-b[1])<b[2])return false;
    for(const q of CITY.rects)if(Math.abs(lx-q.x)<q.hw+0.35&&Math.abs(lz-q.z)<q.hd+0.35)return false;return true;}
  // 막히면 벽을 따라 미끄러진다
  function slideMove(p,vx,vz,dt){const nx=p.x+vx*dt,nz=p.z+vz*dt;if(cityOK(nx,nz)){p.x=nx;p.z=nz;return 3;}if(cityOK(nx,p.z)){p.x=nx;return 1;}if(cityOK(p.x,nz)){p.z=nz;return 2;}return 0;}
  const angTo=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
  // 리니 말(화면 위 작은 말풍선). 글 길이만큼 보이고 다음 줄로 넘어간다. 누르면 바로 다음 줄
  const SAY={q:[],cur:null,t:0,dur:0,onDone:null};
  function sayLines(lines,onDone){SAY.q=(lines||[]).map(s=>T_(s)).filter(Boolean);SAY.onDone=onDone||null;sayNext();}
  function sayNext(){const s=SAY.q.shift(),el=$('#say');if(s==null){SAY.cur=null;el.hidden=true;const f=SAY.onDone;SAY.onDone=null;if(f)f();return;}
    SAY.cur=s;SAY.t=0;SAY.dur=1.9+s.length*0.085;$('#sayName').textContent=T_(AD.riniName||'리니');$('#sayText').textContent=s;el.hidden=false;}
  function sayStop(){SAY.q=[];SAY.onDone=null;SAY.cur=null;$('#say').hidden=true;}
  $('#say').onclick=()=>{if(SAY.cur)sayNext();};
  function setCut(on){PZ.cut=on;document.body.classList.toggle('pzcut',on);if(on){for(const k in KEYS)KEYS[k]=false;}}
  function enterPlaza(cast){if(!PZC||PZ.active)return;
    if(!CITY)CITY=buildCityStage();arrSet(true);CITY.lamps.forEach(L=>L.on(1));
    const C=CITY.C,fresh=!cast;
    if(fresh){cast=arrivalCast();player.pos.set(C.x-1.3,0,C.z+4.8);player.facing=Math.PI;const R=cast.rini;R.root.position.set(C.x-0.35,0,C.z+3.2);if(R.isGlb){R.facing=Math.PI*0.75;}else R.root.rotation.y=Math.PI*0.75;}
    const R=cast.rini;PZ.cast=cast;PZ.active=true;PZ.t=ARR_LEN;PZ.atDock=false;PZ.menu=false;PZ.follow=false;PZ.waiting=false;PZ.rmode='idle';PZ.rpath=[];setCut(false);
    PZ.rpos.set(R.root.position.x,0,R.root.position.z);PZ.rface=PZ.rfaceT=R.isGlb?R.facing:R.root.rotation.y;
    Q.entered=true;Q.plaza=true;qSave();checklistUI();
    J.busy=false;J.traveling=false;J.staying=false;player.path=[];walkTo=null;player.faceT=null;player.vx=player.vz=0;clearShot();
    // 카메라: 지금 자리에서 부드럽게 어깨 너머로(처음 오는 경우는 바로 뒤에서)
    if(fresh||!DIR.init){camYaw=player.facing+Math.PI;DIR.init=false;}else camYaw=Math.atan2(camera.position.x-player.pos.x,camera.position.z-player.pos.z);
    camPitch=0.3;camDistT=camDist=camera.aspect<0.8?6.6:5.0;DIR.manual=0;
    document.body.classList.add('plaza');$('#joy').hidden=!IS_TOUCH;$('#brand .k').textContent='';$('#brand b').textContent=T_(AD.title||'');
    SND('music','city');
    if(fresh){if(PZC.backLine)sayLines([PZC.backLine]);plazaChoices();}
    mpBegin();
    setTimeout(()=>{if(PZ.active)toast(T_(IS_TOUCH?(PZC.moveHintTouch||'왼쪽 아래 동그라미를 밀면 걸어요.'):(PZC.moveHintKeys||'키보드 W·A·S·D나 방향키로 걸어요.')));},2600);}
  function exitPlaza(){if(!PZ.active)return;mpStop();PZ.active=false;sayStop();clearShot();setCut(false);PZ.atDock=false;PZ.menu=false;PZ.follow=false;
    (PZ.cast?PZ.cast.extras:[]).forEach(o=>scene.remove(o));PZ.cast=null;arrSet(false);
    document.body.classList.remove('plaza');$('#joy').hidden=true;hideChoices();$('#brand .k').textContent=T_(CFG.kicker);$('#brand b').textContent=T_(CFG.title);}
  // 리니가 섬 출발점으로 앞장선다(분수대를 리니가 있는 쪽으로 돌아서). 방문자는 자동으로 뒤따른다
  function startGuide(withLine){if(!PZ.active||PZ.atDock)return;const C=CITY.C,R=PZ.rpos,side=(R.x-C.x)>0.3?1:-1;
    const W=[[2.9*side,1.4],[3.1*side,-3.6],[0.9*side,-10.6],[1.1,-17.4]].map(p=>new THREE.Vector3(C.x+p[0],0,C.z+p[1]));
    PZ.rpath=W.filter((w,i)=>i===W.length-1||w.z<R.z-0.4);PZ.rmode='guide';PZ.follow=true;PZ.waiting=false;PZ.menu=false;
    if(withLine&&PZC.guideLine)sayLines([PZC.guideLine]);plazaChoices();}
  function arriveNow(){const C=CITY.C;player.pos.set(C.x+0.2,0,C.z-15.4);player.vx=player.vz=0;player.facing=Math.PI;PZ.rpos.set(C.x+1.1,0,C.z-17.4);PZ.rpath=[];PZ.rmode='dock';PZ.follow=false;DIR.init=false;camYaw=0;}
  // 출발점 도착: 하늘의 섬들을 보여 주며 리니가 말한다. 누르면 건너뛴다
  function dockArrive(){PZ.atDock=true;PZ.follow=false;PZ.rpath=[];PZ.rmode='dock';PZ.menu=false;setCut(true);hideChoices();
    const I=CITY.islandC;player.faceT=Math.atan2(I.x-player.pos.x,I.z-player.pos.z);
    shot((k,pos,look)=>{const P=player.pos,ax=P.x+1.4,ay=1.9+k*0.5,az=P.z+5.6-k*0.8;pos.set(ax,ay,az);
      const f=0.2,hx=(I.x-ax)*f,hz=(I.z-az)*f;look.set(ax+hx+lerp(-2.5,2.5,ez(k))*(camera.aspect<0.8?1.6:0.6),ay+Math.hypot(hx,hz)*0.11,az+hz);},12,finishDock,true);
    sayLines(PZC.dockLines||[],()=>endShot());}
  function finishDock(){sayStop();clearShot();setCut(false);DIR.manual=0;plazaChoices();}
  function plazaLook(){hideChoices();setCut(true);toast(UI.lookHint||'화면을 누르면 둘러보기를 마쳐요.');shot(shotOrbit(player.pos.clone(),11,6.5),8,()=>{clearShot();setCut(false);plazaChoices();},true);}
  function plazaChoices(){if(!PZ.active||PZ.cut)return;const P=PZC,L=[];let where;
    if(PZ.menu){where=T_(P.menu||'메뉴');
      L.push({label:T_(UI.restart||'처음부터 다시'),fn:()=>{PZ.menu=false;restartAll();}});
      L.push({label:T_(P.exit||'월드 나가기'),fn:()=>{PZ.menu=false;hideChoices();showEnd();$('#endExit').onclick();}});
      L.push({label:T_(UI.back||'돌아가기'),minor:true,fn:()=>{PZ.menu=false;plazaChoices();}});}
    else if(PZ.atDock){where=T_(P.dockName||'섬 출발점');
      L.push({label:T_(P.depart||'섬으로 떠나기'),sub:T_(P.departSub||'준비 중'),fn:()=>{toast(T_(P.departToast||'섬들은 아직 준비 중이에요.'));const R=PZ.cast&&PZ.cast.rini;if(R&&R.isGlb)R.emote('wave');}});
      L.push({label:T_(P.look||'둘러보기'),minor:true,fn:plazaLook},{label:T_(P.menu||'메뉴'),minor:true,fn:()=>{PZ.menu=true;plazaChoices();}});}
    else if(PZ.rmode==='guide'){where=T_(P.following||'리니를 따라가는 중');
      if(!PZ.follow)L.push({label:T_(P.followAgain||'리니 따라가기'),hot:true,fn:()=>{PZ.follow=true;plazaChoices();}});
      L.push({label:T_(P.arriveNow||'바로 도착하기'),minor:true,fn:arriveNow},{label:T_(P.menu||'메뉴'),minor:true,fn:()=>{PZ.menu=true;plazaChoices();}});}
    else{where=T_(P.where||'광장');
      L.push({label:T_(P.follow||'리니를 따라 섬 출발점으로'),hot:true,fn:()=>startGuide(false)});
      L.push({label:T_(P.look||'둘러보기'),minor:true,fn:plazaLook},{label:T_(P.menu||'메뉴'),minor:true,fn:()=>{PZ.menu=true;plazaChoices();}});}
    if(MP.id!=null&&!PZ.menu)L.splice(L.length-1,0,{label:T_(P.wave||'손 흔들기'),minor:true,fn:mpWave});   // 멀티플레이: 메뉴 앞에
    setChoices(where,L);const j=$('#journey');document.documentElement.style.setProperty('--jh',(j.offsetHeight||0)+'px');}
  // 방문자 걷기(광장): 입력은 카메라 기준. 따라가기 중에는 리니 뒤 1.5m를 유지한다
  function plazaMove(dt){const P=player.pos;let tx=0,tz=0;
    let fx=(KEYS.right?1:0)-(KEYS.left?1:0),fz=(KEYS.up?1:0)-(KEYS.down?1:0);if(JOY.on){fx=JOY.x;fz=-JOY.y;}
    const mag=Math.hypot(fx,fz),manual=!PZ.cut&&mag>0.22;
    if(manual){fx/=mag;fz/=mag;if(PZ.follow){PZ.follow=false;plazaChoices();}player.faceT=null;
      const fwx=-Math.sin(camYaw),fwz=-Math.cos(camYaw);tx=(fwx*fz-fwz*fx)*PZ_SPEED;tz=(fwz*fz+fwx*fx)*PZ_SPEED;}
    // 따라가기: 리니 오른쪽 뒤를 따른다(바로 뒤에 서면 어깨 너머 카메라에서 리니가 방문자 몸에 가린다)
    else if(PZ.follow&&!PZ.cut){const R=PZ.rpos,f=PZ.rface,gx=R.x-Math.cos(f)*0.9,gz=R.z+Math.sin(f)*0.9,dx=gx-P.x,dz=gz-P.z,d=Math.hypot(dx,dz);if(d>0.9){const s=Math.min(PZ_SPEED,(d-0.7)*1.8);tx=dx/d*s;tz=dz/d*s;}}
    const accel=Math.hypot(tx,tz)>Math.hypot(player.vx,player.vz)?6:9;
    player.vx=lerp(player.vx,tx,Math.min(1,dt*accel));player.vz=lerp(player.vz,tz,Math.min(1,dt*accel));
    const m=slideMove(P,player.vx,player.vz,dt);if(m===1)player.vz*=0.5;else if(m===2)player.vx*=0.5;else if(m===0){player.vx=player.vz=0;}
    P.y=0;player.speed=Math.hypot(player.vx,player.vz);
    if(player.speed>0.2){const tgt=Math.atan2(player.vx,player.vz);let d=tgt-player.facing;d=Math.atan2(Math.sin(d),Math.cos(d));player.facing+=clamp(d*Math.min(1,dt*8),-dt*9,dt*9);}
    else if(player.faceT!=null){let d=player.faceT-player.facing;d=Math.atan2(Math.sin(d),Math.cos(d));player.facing+=clamp(d*Math.min(1,dt*5),-dt*6,dt*6);if(Math.abs(d)<0.02)player.faceT=null;}}
  // 리니 한 걸음: 목표까지 speed로(가까우면 천천히). 도착하면 true
  function riniWalk(to,speed,stop,dt){const R=PZ.rpos,dx=to.x-R.x,dz=to.z-R.z,d=Math.hypot(dx,dz);if(d<=stop)return true;
    const s=Math.min(speed,(d-stop)*2.2+0.3),vx=dx/d*s,vz=dz/d*s;if(slideMove(R,vx,vz,dt)){PZ.rspeed=s;PZ.rfaceT=Math.atan2(vx,vz);}return false;}
  function updatePlaza(dt){PZ.t+=dt;const cast=PZ.cast,P=player.pos;
    // 3D 리니가 늦게 오면 그 자리에서 바꿔 끼운다
    if(RINI_GLB&&cast.rini!==RINI_GLB){const old=cast.rini;scene.remove(old.root);const N=RINI_GLB;scene.add(N.root);cast.extras.push(N.root);cast.rini=N;N.waving=false;N.hold='idle';N.act=null;N.setState('idle');}
    castLife(cast,PZ.t,dt);
    const R=cast.rini,rp=PZ.rpos,dP=Math.hypot(P.x-rp.x,P.z-rp.z),busy=(R.isGlb&&R.waving)||PZ.cut;PZ.rspeed=0;let face=null;
    if(PZ.rmode==='guide'){
      if(!PZ.follow){if(PZ.waiting?dP>4:dP>6.5){PZ.waiting=true;face=angTo(rp,P);}else PZ.waiting=false;}else PZ.waiting=false;
      if(!PZ.waiting&&!busy){const w=PZ.rpath[0];if(w){if(riniWalk(w,RINI_GUIDE,0.15,dt))PZ.rpath.shift();}else{PZ.rmode='dock';PZ.follow=false;plazaChoices();}}}
    else if(PZ.rmode==='come'){if(!busy){const k=1.8/Math.max(dP,0.01),to={x:P.x+(rp.x-P.x)*k,z:P.z+(rp.z-P.z)*k};if(riniWalk(to,RINI_COME,0.2,dt)||dP<2.1)PZ.rmode='idle';}}
    else if(PZ.rmode==='dock'){if(dP>8)PZ.rmode='come';}
    else if(dP>4.5)PZ.rmode='come';
    if(PZ.rspeed===0&&face==null&&dP<10)face=angTo(rp,P);
    {const want=PZ.rspeed>0?PZ.rfaceT:face!=null?face:PZ.rface;let d=want-PZ.rface;d=Math.atan2(Math.sin(d),Math.cos(d));PZ.rface+=d*Math.min(1,dt*(PZ.rspeed>0?9:4));}
    const moving=PZ.rspeed>0.05;
    if(R.isGlb){R.hold=moving?'walk':'idle';if(R.actions.walk)R.actions.walk.timeScale=clamp(PZ.rspeed/RINI_STEP,1,4);R.update(dt,T,{pos:rp,facing:PZ.rface});}
    else{R.root.position.copy(rp);R.root.position.y=0.06+(moving?Math.abs(Math.sin(T*7))*0.03:Math.sin(T*2.6)*0.04);R.root.rotation.y=PZ.rface;R.inner.rotation.x=moving?0.1:0;R.head.rotation.set(0,0,0);
      R.arms[0].rotation.z=-0.18;R.arms[1].rotation.z=0.18;R.arms.forEach((a,j)=>a.rotation.x=moving?Math.sin(T*7+j*Math.PI)*0.35:0);const blink=(T%3.2)<0.12;R.eyes.forEach(e=>e.scale.y=blink?0.2:1.25);}
    // 섬 출발점: 가까이 오면 섬 장면, 멀어지면 광장 선택지로
    const D=CITY.dock,dD=Math.hypot(P.x-D.x,P.z-D.z);
    if(!PZ.atDock&&!PZ.cut&&dD<3.3)dockArrive();else if(PZ.atDock&&!PZ.cut&&dD>7.5){PZ.atDock=false;PZ.rmode='come';plazaChoices();}
    if(SAY.cur){SAY.t+=dt;if(SAY.t>SAY.dur)sayNext();}
    CITY.islands.forEach((o,i)=>{o.position.y=o.userData.y+Math.sin(T*0.35+i*1.7)*0.6;});
    mpUpdate(dt);}

  /* =====================================================================
     MULTI — 광장 멀티플레이(2026-10-03). 주소에 ?mp=1(이 PC 중계소가 페이지도 내줄 때) 또는 ?mp=<중계소 주소>가 있으면 켠다.
     주소에 mp가 없으면 같은 폴더의 mp.json(오늘의 중계소 주소, start-multiplayer.ps1이 GitHub에 올림)을 읽고 중계소가 살아 있을 때만 켠다.
     ?mp=0이면 끈다. mp.json이 없는 곳(아티팩트·미리보기)은 혼자 하기. 중계 서버: XR개발부\webxr-world\server\server.js(방 'plaza:<room>', 초당 10번).
     다른 방문자 = 월드 1 방문자와 같은 만화풍 캐릭터(생김새 숫자 5개를 주고받음). 가까운 몇 명만 캐릭터, 나머지는 색 캡슐 + 이름표.
     좌표는 도시 가운데 기준으로 주고받는다. 리니는 각자 화면에 따로 있다.
     ===================================================================== */
  const QS=new URLSearchParams(location.search),MPQ=QS.get('mp');
  const MP={on:!!(MPQ&&MPQ!=='0'&&PZC),host:null,ws:null,id:null,peers:new Map(),sendT:0,last:'',retry:0,name:'',full:false,pickT:0,waveT:0,
    room:'plaza:'+(String(QS.get('room')||'lobby').replace(/[^\w가-힣-]/g,'').slice(0,30)||'lobby')};
  const MP_NEAR=IS_TOUCH?6:10;   // 진짜 캐릭터로 그릴 가까운 사람 수(폰은 적게, webxr-world 노하우)
  const CAP_GEO=new THREE.CapsuleGeometry(0.2,0.62,4,10),CAP_HEAD=new THREE.SphereGeometry(0.17,14,10);
  function mpURL(){const q=MP.host||MPQ;if(q==='1')return(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
    const h=q.replace(/^(wss?|https?):\/\//,'').replace(/\/.*$/,'');return(/^(localhost|127\.0\.0\.1)(:|$)/.test(h)?'ws://':'wss://')+h+'/ws';}
  // 짧은 주소: mp.json의 중계소에 한 번 붙어 보고(8초) 열리면 켠다. PC가 꺼져 있으면 조용히 혼자 하기
  if(PZC&&MPQ==null)fetch('mp.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{
    const h=j&&typeof j.relay==='string'?j.relay.trim():'';if(!h)return;MP.host=h;let ws;try{ws=new WebSocket(mpURL());}catch(_){return;}
    const tm=setTimeout(()=>{try{ws.close();}catch(_){}},8000);ws.onerror=()=>{};
    ws.onopen=()=>{clearTimeout(tm);try{ws.close();}catch(_){}MP.on=true;if(PZ.active&&!PZ.cut)mpBegin();};}).catch(()=>{});
  // 처음 광장에 들어오는 사람은 생김새를 하나 정해 저장한다(모두 같은 옷이면 구별이 안 된다)
  function myLook(){let lk=lsGet(KEY+'look',null);if(!Array.isArray(lk)){const r=n=>Math.floor(Math.random()*n);lk=[r(SKIN.length),r(HAIR.length),r(COAT.length),r(SCARF.length),r(3)];lsSet(KEY+'look',lk);me.setLook(lk);}return lk;}
  function mpState(){const a=MP.waveT>0?3:player.speed>2.8?2:player.speed>0.3?1:0,r=v=>Math.round(v*100)/100;return[r(player.pos.x-CITY.C.x),0,r(player.pos.z-CITY.C.z),r(player.facing),a,0];}
  function mpBadge(st){const b=$('#mpBadge');if(!MP.on||!PZ.active){b.hidden=true;return;}const P=PZC;st=st||b.dataset.st||'wait';b.dataset.st=st;b.hidden=false;
    b.textContent=st==='on'?T_(P.mpCount||'광장에 {n}명',{n:MP.peers.size+1}):st==='wait'?T_(P.mpWait||'연결하는 중'):st==='full'?T_(P.mpFullBadge||'광장이 가득 참'):T_(P.mpOff||'연결 끊김 · 다시 연결 중');}
  function mpBegin(){if(!MP.on)return;myLook();const saved=lsGet(KEY+'mpName',null);if(saved!=null){MP.name=saved;mpConnect();return;}
    const box=$('#mpName'),inp=$('#mpNameIn');$('#mpNameT').textContent=T_(PZC.mpNameTitle||'광장에서 쓸 이름');inp.placeholder=T_(PZC.mpNameHint||'비워 두면 손님');$('#mpNameGo').textContent=T_(PZC.mpNameGo||'광장에 들어가기');
    inp.value='';box.hidden=false;setCut(true);hideChoices();
    const go=()=>{const n=cleanText(inp.value,12);lsSet(KEY+'mpName',n);MP.name=n;box.hidden=true;try{inp.blur();}catch(_){}setCut(false);mpConnect();plazaChoices();};
    $('#mpNameGo').onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go();};setTimeout(()=>{try{inp.focus();}catch(_){}},60);}
  function mpConnect(){if(!MP.on||MP.ws||!PZ.active)return;let ws;try{ws=new WebSocket(mpURL());}catch(e){mpBadge('off');return;}MP.ws=ws;MP.full=false;mpBadge('wait');
    ws.onopen=()=>{MP.retry=0;ws.send(JSON.stringify({t:'hello',room:MP.room,name:MP.name,look:myLook(),s:mpState()}));};
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(_){return;}mpMsg(m);};
    ws.onclose=()=>{if(MP.ws!==ws)return;MP.ws=null;MP.id=null;mpClear();if(!PZ.active)return;if(MP.full){mpBadge('full');return;}
      mpBadge('off');MP.retry=Math.min(MP.retry+1,6);setTimeout(()=>{if(PZ.active&&!MP.ws)mpConnect();},1500*MP.retry);};
    ws.onerror=()=>{};}
  function mpStop(){const ws=MP.ws;MP.ws=null;MP.id=null;if(ws){try{ws.close();}catch(_){}}mpClear();$('#mpBadge').hidden=true;$('#mpName').hidden=true;}
  function mpMsg(m){if(m.t==='welcome'){MP.id=m.id;(m.peers||[]).forEach(mpAdd);mpBadge('on');plazaChoices();}
    else if(m.t==='join')mpAdd(m);else if(m.t==='leave')mpRemove(m.id);
    else if(m.t==='snap'){(m.ps||[]).forEach(a=>{const p=MP.peers.get(a[0]);if(p)mpSet(p,a.slice(1));});}
    else if(m.t==='full'){MP.full=true;toast(T_(PZC.mpFull||'광장이 가득 찼어요. 잠시 뒤에 다시 와 주세요.'));}}
  function mpAdd(d){if(!d||d.id===MP.id||MP.peers.has(d.id))return;const i=d.id;
    const lk=Array.isArray(d.look)?d.look:[i%SKIN.length,(i*3)%HAIR.length,(i*5+1)%COAT.length,(i*7)%SCARF.length,i%3];
    const p={id:i,name:cleanText(d.name,12)||'손님',look:lk,pos:new THREE.Vector3(),tgt:new THREE.Vector3(),face:0,faceT:0,anim:0,ch:null,near:false,d:0};
    const col=COAT[lk[2]%COAT.length],cap=new THREE.Group();
    const body=new THREE.Mesh(CAP_GEO,new THREE.MeshStandardMaterial({color:col,roughness:.7}));body.position.y=0.62;cap.add(body);
    const head=new THREE.Mesh(CAP_HEAD,new THREE.MeshStandardMaterial({color:SKIN[lk[0]%SKIN.length],roughness:.8}));head.position.y=1.32;cap.add(head);
    const tag=textSprite();tag.scale.set(1.0,0.31,1);tag.position.y=1.8;drawTag(tag,p.name,col);cap.add(tag);
    cap.visible=false;scene.add(cap);p.cap=cap;MP.peers.set(i,p);mpSet(p,d.s);p.pos.copy(p.tgt);p.face=p.faceT;MP.pickT=0;mpBadge('on');}
  function mpSet(p,s){if(!Array.isArray(s)||!CITY)return;p.tgt.set(CITY.C.x+(+s[0]||0),0,CITY.C.z+(+s[2]||0));p.faceT=+s[3]||0;
    const a=s[4]|0;if(a===3&&p.anim!==3&&p.ch)p.ch.emote('wave');p.anim=a;}
  function mpRemove(id){const p=MP.peers.get(id);if(!p)return;scene.remove(p.cap);if(p.ch)scene.remove(p.ch.root);MP.peers.delete(id);mpBadge('on');}
  function mpClear(){[...MP.peers.keys()].forEach(mpRemove);}
  function mpWave(){if(MP.waveT>0)return;me.emote('wave');MP.waveT=2.4;MP.last='';}
  function mpUpdate(dt){if(!MP.on)return;if(MP.waveT>0)MP.waveT-=dt;
    // 내 상태: 초당 10번까지, 바뀌었을 때만(가만히 있어도 2초마다 한 번)
    MP.sendT+=dt;if(MP.ws&&MP.ws.readyState===1&&MP.id!=null&&MP.sendT>=0.1){const s=mpState(),k=s.join(',');if(k!==MP.last||MP.sendT>2){try{MP.ws.send(JSON.stringify({t:'s',s}));}catch(_){}MP.last=k;MP.sendT=0;}}
    // 가까운 사람 고르기: 0.5초마다, 이미 캐릭터인 사람은 2m 덤(경계에서 깜빡이지 않게)
    MP.pickT-=dt;if(MP.pickT<=0){MP.pickT=0.5;const P=player.pos,arr=[...MP.peers.values()];
      arr.forEach(p=>p.d=Math.hypot(p.pos.x-P.x,p.pos.z-P.z)-(p.near?2:0));arr.sort((a,b)=>a.d-b.d);arr.forEach((p,i)=>p.near=i<MP_NEAR);}
    const k=1-Math.exp(-dt*8);
    MP.peers.forEach(p=>{if(p.pos.distanceTo(p.tgt)>6)p.pos.copy(p.tgt);else p.pos.lerp(p.tgt,k);let d=p.faceT-p.face;d=Math.atan2(Math.sin(d),Math.cos(d));p.face+=d*Math.min(1,dt*10);
      if(p.near){if(!p.ch){p.ch=new Char(p.look);p.ch.setName(p.name);p.ch.tag.visible=true;scene.add(p.ch.root);}
        if(!p.ch.root.visible){p.ch.root.visible=true;p.ch.st.init=false;}p.cap.visible=false;p.ch.update(dt,T,{pos:p.pos,facing:p.face});}
      else{if(p.ch)p.ch.root.visible=false;p.cap.visible=true;p.cap.position.copy(p.pos);p.cap.rotation.y=p.face;}});}
  function showEnd(){const cs=END.comingSoon||{};$('#end .box .kicker').textContent=T_(cs.kicker||V.mainWorld||'');$('#end .box h1').textContent=T_(cs.title||'곧 열립니다');$('#end .box .sub').textContent=T_(cs.text||'');
    $('#endExit').textContent=UI.endExit||'종료';$('#endReplay').textContent=UI.endReplay||'엔딩 다시 보기';$('#endRestart').textContent=UI.endRestart||'처음부터 다시';$('#endVer').textContent=`${T_(CFG.title)} · ${CFG.version||''}`;
    $('#end .box').hidden=false;$('#end .btns').hidden=false;$('#exit').hidden=true;$('#end').hidden=false;}
  // 종료: 창 닫기를 시도하고, 닫히지 않는 환경(아티팩트·일반 탭)에서는 '나왔습니다' 화면으로 바꾼다. ending.exitUrl이 있으면 그 링크를 보여 준다
  $('#endExit').onclick=()=>{SND('music',null);const ex=END.exit||{};$('#end .box').hidden=true;$('#end .btns').hidden=true;const x=$('#exit');x.hidden=false;
    x.querySelector('.kicker').textContent=T_(ex.kicker||CFG.title||'');x.querySelector('h1').textContent=T_(ex.title||'월드를 나왔습니다');x.querySelector('.sub').textContent=T_(ex.text||'이 창을 닫아 주세요.');
    const a=$('#exitLink');if(END.exitUrl){a.href=END.exitUrl;a.target='_blank';a.rel='noopener';a.textContent=T_(ex.linkLabel||END.exitUrl);a.hidden=false;}else a.hidden=true;
    if(END.exitUrl&&ex.go!==false){try{location.href=END.exitUrl;}catch(e){}}
    try{window.close();}catch(e){}};
  function leaveEnd(){$('#end').hidden=true;$('#cineFade').classList.remove('on');J.busy=false;player.pos.copy(STAGE.meet);player.vx=player.vz=0;player.facing=Math.PI;J.node='meet';player.path=[];walkTo=null;clearShot();DIR.init=false;camYaw=0;camPitch=0.3;}
  $('#endReplay').onclick=()=>{leaveEnd();startEnding(true);};
  $('#endRestart').onclick=()=>{leaveEnd();restartAll();};

  /* ---------- intro ---------- */
  const intro={active:true};document.body.classList.add('intro');
  $('#intro .kicker').textContent=T_(CFG.kicker||'');$('#intro h1').textContent=T_(CFG.title||'');$('#intro .sub').textContent=T_(CFG.subtitle||'');$('#introGo').textContent=UI.start||'시작하기';$('#introSkip').textContent=UI.skipWorld||'건너뛰고 바로 문 너머로';
  shot(shotIntro(),9999,null,false);
  function closeIntro(){intro.active=false;document.body.classList.remove('intro');$('#intro').classList.add('off');setTimeout(()=>{$('#intro').hidden=true;},700);clearShot();DIR.init=false;camYaw=0;}
  // 건너뛰기: 이미 해 본 사람은 미션 없이 문 너머(도착 연출)로 바로 간다
  // 광장에 와 본 사람은 연출 없이 광장으로 바로 온다(2단계, 기획안 5절 '두 번째 방문부터는 광장에서 시작')
  // 주소에 plaza=1이 있으면(연수 때 바로 광장으로 모일 때) 처음 온 사람도 같은 버튼으로 광장에 바로 온다
  const TO_PLAZA=!!PZC&&(Q.plaza||QS.get('plaza')==='1');
  if(TO_PLAZA)$('#introSkip').textContent=T_(PZC.toPlaza||'광장으로 바로 가기');
  $('#introSkip').onclick=()=>{SND('unlock');SND('sfx','select');closeIntro();hideChoices();if(TO_PLAZA){enterPlaza(null);return;}if(AD)startArrival();else{Q.entered=true;qSave();checklistUI();showEnd();}};
  // 처음부터: 저장된 진행을 지우고 처음부터 시작한다
  $('#introGo').onclick=()=>{SND('unlock');SND('sfx','select');SND('music','day');if(Q.met||Q.human||Q.entered||Object.keys(Q.got).some(k=>gotList(k).length))restartAll(true);closeIntro();
    if(IS_TOUCH&&innerHeight>innerWidth)toast(UI.rotateHint||'가로로 돌리면 더 잘 보여요.');
    if(Q.human){STAGE.door.open(1);human.root.visible=true;hState.scale=1;hState.pos.set(2.1,0,-6.0);hState.facing=Math.atan2(0-2.1,-3.5+6.0);}
    if(!Q.met){hideChoices();setTimeout(()=>{if(!talk.open&&!cine.active)talkGuide();},700);}else refreshChoices();};
  checklistUI();

  /* ---------- NPC updates ---------- */
  const gIn={pos:gState.pos,facing:0},hIn={pos:hState.pos,facing:0};
  function updateNPC(dt){const P=player.pos;
    const near=Math.hypot(P.x-gState.pos.x,P.z-gState.pos.z);const want=near<4?Math.atan2(P.x-gState.pos.x,P.z-gState.pos.z):0;let d=want-gState.facing;d=Math.atan2(Math.sin(d),Math.cos(d));gState.facing+=d*Math.min(1,dt*3);
    gIn.facing=gState.facing;guide.update(dt,T,gIn);qMark.position.set(gState.pos.x,2.45+Math.sin(T*2.2)*0.06,gState.pos.z);
    if(human.root.visible){const wantH=Math.atan2(P.x-hState.pos.x,P.z-hState.pos.z);let dh=wantH-hState.facing;dh=Math.atan2(Math.sin(dh),Math.cos(dh));hState.facing+=dh*Math.min(1,dt*3);
      hIn.facing=hState.facing;human.update(dt,T,hIn);human.setScale(hState.scale);human.tag.visible=hState.scale>0.95;}}

  /* ---------- main loop ---------- */
  const clock=new THREE.Clock();
  function fitViewport(){vw=innerWidth;vh=innerHeight;if(vw<2||vh<2)return;camera.aspect=vw/vh;camera.updateProjectionMatrix();renderer.setSize(vw,vh,false);if(composer)composer.setSize(vw,vh);letterbox();}
  renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),0.1);if(innerWidth!==vw||innerHeight!==vh)fitViewport();if(vw<2||vh<2)return;T+=dt;
    if(!intro.active&&!cine.active&&!ARR.active)updatePlayer(dt);
    me.update(dt,T,{pos:player.pos,facing:player.facing});updateNPC(dt);STAGE.updateStage(dt,T);updateFX(dt);
    if(PZ.active)updatePlaza(dt);
    if(cine.active)updateEnding(dt);else if(ARR.active)updateArrival(dt);else updateCamera(dt);
    if(useBloom&&composer)composer.render(dt);else renderer.render(scene,camera);});
  addEventListener('resize',fitViewport);fitViewport();
  window.__world={CFG,Q,J,player,startEnding,restartAll,goMission,talkGuide,refreshChoices,get intro(){return intro;},get cine(){return cine;},get human(){return human;},enterDoor,startArrival,skipArrival,get arr(){return ARR;},get rini(){return RINI_GLB;},
    get pz(){return PZ;},get city(){return CITY;},get mp(){return MP;},enterPlaza,exitPlaza,startGuide,arriveNow,dockArrive,keys:KEYS,joy:JOY};
}
window.WorldEngine={start};
})();
