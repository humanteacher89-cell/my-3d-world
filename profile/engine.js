/* =====================================================================
   휴먼쌤 월드 엔진 — 월드 1 「휴먼쌤이 누구인가」 프로필 새 판 (2026-11-01, XR개발부 데스크톱)
   엑스리아 월드 엔진(xrea/engine.js, 2026-10-30)을 복사해 고친 것이다. 엑스리아·옛 월드 1 엔진은 그대로다.
   이 판에서 더한 것: 무대 'classroom'(구운 교실 GLB · 책상 사이 통로 길찾기 · 카메라를 교실 안에) · 조각 넷 · 리니가 따라 걷기 ·
   휴먼쌤이 앞문으로 걸어 들어오는 엔딩 · 프로필 카드(그림으로 저장) · '프로필 바로 보기'와 조각 넘겨 보기 · 그림틀 viz 덩이 목록·책 모양.
   엑스리아에서 가져온 것: GLB 캐릭터 · 문 너머 고르기(pickWorld) · 선명도 고침. 문 너머 도시·광장·멀티플레이 코드는 뺐다.
   (아래는 엑스리아 판·옛 월드 1 판 머리말)
   엑스리아 월드 판(2026-10-30, 데스크톱): world1/engine.js를 복사해 둘만 더했다. 월드 1 엔진은 그대로다.
   - 휴머노이드 로봇 캐릭터: Char의 opts.robot(설정 guide.robot / human.robot). 같은 뼈대·동작에 금속 판·헬멧·눈빛·가슴 코어·관절·안테나.
   - 문 너머 '누구의 월드로 들어갈까요?' 고르기: 설정 ending.pickWorld(없으면 예전처럼 '곧 열립니다').
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
const GLOW_Q=(v=>v==null?null:(Number(v)||0))(new URLSearchParams(location.search).get('glow'));   // 3D 캐릭터 밝기 시험용(?glow=0.5)
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
<section id="journey" class="panel" hidden aria-label="선택지"><div id="jSay" hidden><b id="jSayWho"></b><span id="jSayText"></span></div><div id="jWhere"></div><div id="jBtns"></div></section>
<section id="talk" class="panel" hidden role="dialog" aria-live="polite"><div class="who"><b id="talkName"></b><span id="talkRole"></span></div><p id="talkText"></p><div id="talkBtns"></div></section>
<section id="card" class="panel" hidden role="dialog" aria-labelledby="cardTitle">
  <div id="cardEyebrow"></div><h2 id="cardTitle"></h2>
  <p id="cardReply"></p><div id="cardViz" hidden></div><p id="cardText"></p><p id="cardMore"></p><div id="cardPending" hidden></div>
  <div id="cardSrc"></div><button id="cardClose"></button><div id="cardNav" hidden></div>
</section>
<div id="toast" class="panel" role="status" aria-live="polite"></div>
<div id="joy" hidden aria-label="걷기 조이스틱"><div id="joyKnob"></div></div>
<section id="say" class="panel" hidden aria-live="polite"><b id="sayName"></b><p id="sayText"></p></section>
<div id="mpBadge" class="panel" hidden role="status"></div>
<section id="mpName" class="panel" hidden role="dialog" aria-labelledby="mpNameT"><b id="mpNameT"></b><input id="mpNameIn" maxlength="12" autocomplete="off"><div id="mpLook"></div><button id="mpNameGo" class="jb hot"></button></section>
<div id="cine" hidden aria-live="polite"><div class="bar top"></div><div class="bar bot"></div><button id="cineSkip"></button><div id="cineTitle"></div>
  <div id="cineSubs"><div id="cineWho"></div><p id="cineText"></p></div><span id="cineNext" hidden></span><div id="cineFade"></div></div>
<div id="intro"><p class="kicker"></p><h1></h1><p class="sub"></p><button id="introGo"></button><button id="introSkip"></button></div>
<div id="end" hidden><div class="box"><p class="kicker"></p><h1></h1><p class="sub"></p><button id="endExit"></button><small id="endVer"></small></div>
  <div class="btns"><button id="endReplay"></button><button id="endRestart"></button></div>
  <div id="exit" hidden><p class="kicker"></p><h1></h1><p class="sub"></p><a id="exitLink" hidden></a></div></div>
<div id="pick" hidden role="dialog" aria-labelledby="pickTitle"><div class="box"><p class="kicker"></p><div class="who"><b id="pickName"></b><span id="pickRole"></span></div><div id="pickHero" hidden></div><h1 id="pickTitle"></h1><p class="sub" id="pickSub"></p><div id="pickList"></div><p id="pickCredit" hidden></p></div>
  <div class="btns"><button id="pickBack"></button><button id="pickReplay" hidden></button><button id="pickRestart" hidden></button></div></div>
<div id="prof" hidden role="dialog" aria-labelledby="pfName"><div class="pwrap">
  <article id="pfCard"><header><span id="pfAv" class="av lg"></span><div class="hd"><p class="k" id="pfKicker"></p><h2 id="pfName"></h2><p class="rl" id="pfRole"></p></div></header>
    <p id="pfOne"></p><ul id="pfRows"></ul><div id="pfCh"></div><div id="pfAsk"></div></article>
  <div id="pfBtns"></div></div>
  <div id="pfShot" hidden><div class="in"><img id="pfImg" alt="프로필 카드 그림"><p id="pfShotHint"></p><button id="pfShotClose"></button></div></div></div>`;

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
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    // 렌더 타깃을 직접 넘기면 EffectComposer가 화면 배율(devicePixelRatio)을 1로 잡아 CSS 픽셀 크기로만 그려 고해상도 화면에서 흐릿했다(휴먼쌤 10-30 "해상도가 전체적으로 흐려보이는데") → 배율을 알려 준다
    composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth||2,innerHeight||2);}catch(e){composer=null;bloomPass=null;}}
  if(bloomPass&&ST.bloom){if(ST.bloom.strength!=null)bloomPass.strength=ST.bloom.strength;if(ST.bloom.threshold!=null)bloomPass.threshold=ST.bloom.threshold;}   /* 밝은 교실은 약하게(설정 stage.bloom) */

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
  /* =====================================================================
     STAGE — 'holodeck': 화이트 홀로그램 데크(엑스리아 월드 시안 C, 2026-10-30).
     밝은 흰 데크 + 하늘색 격자 빛 + 떠 있는 홀로그램 패널 + 미끄러져 열리는 빛 포털. 자리 좌표·반환값은 placeholder와 같다.
     ===================================================================== */
  function buildHoloDeckStage(){
    const R=9,g=new THREE.Group();scene.add(g);
    const acc=new THREE.Color(ST.edge||'#4fd8ff'),accHex='#'+acc.getHexString(),floorCol=ST.floor||'#f4f6f9';
    const rgba=a=>'rgba('+Math.round(acc.r*255)+','+Math.round(acc.g*255)+','+Math.round(acc.b*255)+','+a+')';
    // 데크: 두꺼운 흰 원판 + 아래 받침 + 가장자리 빛 띠 둘
    const top=new THREE.Mesh(new THREE.CylinderGeometry(R,R,0.5,128),std(floorCol,{roughness:.38,metalness:.04}));top.position.y=-0.25;top.receiveShadow=true;g.add(top);
    const under=new THREE.Mesh(new THREE.CylinderGeometry(R-0.5,R-1.8,1.5,96),std('#c9d2de',{roughness:.6}));under.position.y=-1.25;g.add(under);
    const rimMat=new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:1.2,roughness:.3});
    const rim=new THREE.Mesh(new THREE.TorusGeometry(R-0.05,0.04,10,200),rimMat);rim.rotation.x=Math.PI/2;rim.position.y=0.02;g.add(rim);
    const rim2=new THREE.Mesh(new THREE.TorusGeometry(R+0.01,0.03,8,200),new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:.9,roughness:.3,transparent:true,opacity:.75}));rim2.rotation.x=Math.PI/2;rim2.position.y=-0.32;g.add(rim2);
    // 격자 빛: 캔버스(격자 + 동심원)를 바닥 위에 살짝 띄운 원판에
    const gridTex=canvasTex(1024,1024,gg=>{gg.clearRect(0,0,1024,1024);gg.strokeStyle=rgba(0.32);gg.lineWidth=2;for(let i=0;i<=16;i++){const p=i*64;gg.beginPath();gg.moveTo(p,0);gg.lineTo(p,1024);gg.stroke();gg.beginPath();gg.moveTo(0,p);gg.lineTo(1024,p);gg.stroke();}
      gg.strokeStyle=rgba(0.8);gg.lineWidth=5;for(const r of[140,290,440]){gg.beginPath();gg.arc(512,512,r,0,Math.PI*2);gg.stroke();}});
    const grid=new THREE.Mesh(new THREE.CircleGeometry(R-0.12,96),new THREE.MeshBasicMaterial({map:gridTex,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));grid.rotation.x=-Math.PI/2;grid.position.y=0.008;g.add(grid);
    // 가장자리 기둥 여섯: 가는 흰 기둥 + 빛나는 끝
    const postMat=std('#eef2f7',{roughness:.35,metalness:.1}),tipMat=new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:1.4});
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.PI/6;const x=Math.sin(a)*(R-0.5),z=Math.cos(a)*(R-0.5);if(z<-6)continue;
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,2.6,12),postMat);post.position.set(x,1.3,z);g.add(post);
      const tip=new THREE.Mesh(new THREE.SphereGeometry(0.1,14,10),tipMat);tip.position.set(x,2.68,z);tip.castShadow=false;g.add(tip);}
    const floorAt=(x,z)=>Math.hypot(x,z)<=R+0.3?0:-30;
    // 조각 자리 셋: 흰 받침 + 떠 있는 빛 고리 + 구슬 + 기둥 없이 떠 있는 홀로그램 표지판
    const SPOT_POS=[[-6.4,0.6],[6.4,0.6],[0,6.6]];
    const spots=M.map((m,i)=>{const p=SPOT_POS[i%SPOT_POS.length];const pos=new THREE.Vector3(p[0],0,p[1]);const toC=new THREE.Vector3(-pos.x,0,-pos.z).normalize();
      const stand=pos.clone().addScaledVector(toC,1.75);const col=new THREE.Color(m.color||'#ffffff');
      const sg=new THREE.Group();sg.position.copy(pos);g.add(sg);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.2,0.1,64),std('#ffffff',{roughness:.3,metalness:.05}));pad.position.y=0.05;sg.add(pad);
      const padRing=new THREE.Mesh(new THREE.TorusGeometry(1.12,0.03,8,96),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.1,roughness:.4}));padRing.rotation.x=Math.PI/2;padRing.position.y=0.11;sg.add(padRing);
      const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.26,0.9,32),std('#e3e8ef',{roughness:.4,metalness:.1}));ped.position.y=0.55;sg.add(ped);
      const halo=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.03,48),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.8,transparent:true,opacity:.55,depthWrite:false}));halo.position.y=1.08;sg.add(halo);
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.26,32,24),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.7,roughness:.25}));orb.position.y=1.65;orb.castShadow=false;sg.add(orb);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:col,transparent:true,opacity:.75,depthWrite:false,toneMapped:false}));glow.scale.setScalar(1.7);glow.position.y=1.65;sg.add(glow);
      const light=new THREE.PointLight(col,0.55,4,2);light.position.y=1.8;sg.add(light);
      const out=toC.clone().negate();const sign=new THREE.Group();sign.position.copy(out.clone().multiplyScalar(1.45));sign.rotation.y=Math.atan2(-out.x,-out.z);sg.add(sign);
      const tex=canvasTex(512,320,gg=>{gg.clearRect(0,0,512,320);gg.fillStyle=rgba(0.18);gg.fillRect(0,0,512,320);gg.strokeStyle=rgba(0.9);gg.lineWidth=6;gg.strokeRect(3,3,506,314);gg.fillStyle=m.color||'#fff';gg.fillRect(0,0,22,320);
        gg.fillStyle='#0b2a3a';gg.font='900 90px "Noto Sans KR",sans-serif';gg.fillText(m.label||'',56,124);
        gg.fillStyle='#17546e';gg.font='500 38px "Noto Sans KR",sans-serif';gg.fillText(m.title||'',56,206,430);
        gg.fillStyle='#3b7f99';gg.font='400 30px "Noto Sans KR",sans-serif';gg.fillText(m.sub||'',56,262,430);});
      const board=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.875),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));board.position.y=1.55;sign.add(board);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.1,8),new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:.9,transparent:true,opacity:.5,depthWrite:false}));beam.position.y=0.55;sign.add(beam);
      shadowize(sg,true,true);orb.castShadow=false;glow.castShadow=false;board.castShadow=false;halo.castShadow=false;beam.castShadow=false;
      return{i,m,pos,stand,group:sg,orb,glow,light,padRing,col,board,yaw:Math.atan2(pos.x-stand.x,pos.z-stand.z)};});
    // 빛 포털(문): 흰 기둥 둘 + 빛 띠, 닫혀 있을 땐 반투명 유리 막 둘, 열리면 양옆으로 미끄러지며 사라지고 가운데가 빛난다
    const D=new THREE.Vector3(0,0,-8.0);const door=new THREE.Group();door.position.copy(D);g.add(door);
    const white=std('#f2f5f9',{roughness:.35,metalness:.1});
    for(const s of[-1,1]){const pil=new THREE.Mesh(new THREE.BoxGeometry(0.42,4.0,0.42),white);pil.position.set(1.6*s,2.0,0);door.add(pil);
      const strip=new THREE.Mesh(new THREE.BoxGeometry(0.06,3.6,0.08),new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:1.3}));strip.position.set(1.36*s,2.0,0.18);door.add(strip);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,0.2,32),white);base.position.set(1.6*s,0.1,0);door.add(base);}
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(4.1,0.4,0.5),white);lintel.position.y=4.2;door.add(lintel);
    const lintelRing=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.06,0.52),new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:1.2}));lintelRing.position.y=3.98;door.add(lintelRing);
    const paneMat=new THREE.MeshStandardMaterial({color:'#dff3ff',transparent:true,opacity:.42,roughness:.1,metalness:0,emissive:acc,emissiveIntensity:.15,depthWrite:false,side:THREE.DoubleSide});
    const hinges=[-1,1].map(s=>{const h=new THREE.Group();door.add(h);const p=new THREE.Mesh(new THREE.BoxGeometry(1.4,3.6,0.06),paneMat);p.position.set(0.7*s,1.9,0);p.castShadow=false;h.add(p);return{h,s};});
    const glowPlane=new THREE.Mesh(new THREE.PlaneGeometry(2.9,3.7),new THREE.MeshBasicMaterial({color:'#eafcff',transparent:true,opacity:0,toneMapped:false,depthWrite:false,side:THREE.DoubleSide}));glowPlane.position.set(0,1.95,-0.1);door.add(glowPlane);
    const doorLight=new THREE.PointLight(acc,0,9,2);doorLight.position.set(0,2,0.8);door.add(doorLight);
    shadowize(door,true,true);glowPlane.castShadow=false;hinges.forEach(x=>x.h.traverse(m=>{if(m.isMesh)m.castShadow=false;}));
    const doorOpen=k=>{hinges.forEach(({h,s})=>{h.position.x=s*0.9*k;});paneMat.opacity=0.42*(1-k);glowPlane.material.opacity=k*0.95;doorLight.intensity=k*3.5;};
    // 떠 있는 홀로그램 패널 아홉(데크 바깥 둘레, 천천히 떠오르내림)
    const pr=mulberry32(5),panels=[];
    const panelTex=canvasTex(256,160,gg=>{gg.clearRect(0,0,256,160);gg.fillStyle=rgba(0.16);gg.fillRect(0,0,256,160);gg.strokeStyle=rgba(0.85);gg.lineWidth=4;gg.strokeRect(2,2,252,156);gg.fillStyle=rgba(0.7);for(let i=0;i<5;i++)gg.fillRect(22,30+i*24,60+((i*73)%140),8);});
    for(let i=0;i<9;i++){const a=(i/9)*Math.PI*2+0.3,r=R+1.8+pr()*3,y=2.2+pr()*2.6;const p=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.0),new THREE.MeshBasicMaterial({map:panelTex,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
      p.position.set(Math.sin(a)*r,y,Math.cos(a)*r);p.rotation.y=a+Math.PI;p.userData.b=[y,pr()*6.28];g.add(p);panels.push(p);}
    // 떠다니는 빛 알갱이
    const N=70,mg=new THREE.BufferGeometry(),mp=new Float32Array(N*3),mb=[];const r2=mulberry32(11);
    for(let i=0;i<N;i++){const a=r2()*Math.PI*2,r=3+r2()*13,y=0.4+r2()*6;mb.push([Math.sin(a)*r,y,Math.cos(a)*r,r2()*6.28]);mp.set(mb[i].slice(0,3),i*3);}
    mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
    const motes=new THREE.Points(mg,new THREE.PointsMaterial({color:accHex,size:0.12,map:GLOW,transparent:true,opacity:.6,depthWrite:false,sizeAttenuation:true}));g.add(motes);
    const updateStage=(dt,T)=>{const a=mg.attributes.position;for(let i=0;i<N;i++){const b=mb[i];a.setXYZ(i,b[0]+Math.sin(T*0.35+b[3])*0.6,b[1]+Math.sin(T*0.7+b[3]*2)*0.25,b[2]+Math.cos(T*0.3+b[3])*0.6);}a.needsUpdate=true;
      spots.forEach(s=>{s.orb.position.y=1.65+Math.sin(T*1.4+s.i)*0.08;s.glow.position.y=s.orb.position.y;s.orb.rotation.y+=dt*0.6;s.board.position.y=1.55+Math.sin(T*1.1+s.i*2)*0.04;});
      panels.forEach(p=>{const b=p.userData.b;p.position.y=b[0]+Math.sin(T*0.6+b[1])*0.15;});rimMat.emissiveIntensity=1.1+Math.sin(T*1.3)*0.25;};
    return{group:g,R,floorAt,spots,door:{group:door,pos:D,open:doorOpen},guide:{pos:new THREE.Vector3(0,0,-1.0),facing:0},hub:new THREE.Vector3(0,0,1.15),
      doorNode:new THREE.Vector3(0,0,-5.3),gate:new THREE.Vector3(0,0,-7.55),human:new THREE.Vector3(0,0,-6.2),meet:new THREE.Vector3(0,0,-3.5),updateStage};
  }
  /* =====================================================================
     STAGE — 'orbit': 궤도 플랫폼(엑스리아 월드 시안 A, 2026-10-30).
     우주 하늘(별·오로라) + 아래 푸른 행성 + 어두운 유리 육각 판에 빛 테두리 + 도는 빛 고리 + 빛 기둥 게이트. 자리 좌표·반환값은 같다.
     ===================================================================== */
  function buildOrbitStage(){
    const R=9,g=new THREE.Group();scene.add(g);document.body.classList.add('darkstage');
    const fb=new THREE.Group();g.add(fb);const fbHide=[];   /* 코드로 그린 구조물(블렌더 GLB 무대를 불러오면 숨긴다) */
    const acc=new THREE.Color(ST.edge||'#4fd8ff'),accHex='#'+acc.getHexString();
    const rgba=a=>'rgba('+Math.round(acc.r*255)+','+Math.round(acc.g*255)+','+Math.round(acc.b*255)+','+a+')';
    // 밤 조명: 해는 차갑고 약하게, 하늘빛은 푸르게
    sun.intensity=0.95;sun.color.set('#cfe0ff');hemi.intensity=0.4;hemi.color.set('#9fb8ff');hemi.groundColor.set('#141a33');
    // 별: 먼 구 위에 점 900개(안개 영향 없음)
    const SN=900,sg=new THREE.BufferGeometry(),sp=new Float32Array(SN*3),sr=mulberry32(21);
    for(let i=0;i<SN;i++){const u=sr()*2-1,t=sr()*Math.PI*2,r=240+sr()*30,s=Math.sqrt(1-u*u);sp.set([s*Math.cos(t)*r,Math.abs(u)*r*0.9+2,s*Math.sin(t)*r],i*3);}
    sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
    const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:'#e8f0ff',size:1.8,sizeAttenuation:false,transparent:true,opacity:.9,fog:false,depthWrite:false}));g.add(stars);
    // 오로라: 먼 하늘에 세로 그라데이션 띠 셋(더하기 섞기, 천천히 흐름)
    const auTex=canvasTex(64,256,gg=>{const gr=gg.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(80,255,200,0)');gr.addColorStop(0.35,'rgba(80,255,200,0.55)');gr.addColorStop(0.6,'rgba(90,160,255,0.35)');gr.addColorStop(1,'rgba(90,160,255,0)');gg.fillStyle=gr;gg.fillRect(0,0,64,256);});
    const auroras=[];for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(140+i*40,34+i*8,24,1),new THREE.MeshBasicMaterial({map:auTex,transparent:true,opacity:.35-i*0.08,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,side:THREE.DoubleSide}));
      const a=-0.5+i*0.5;m.position.set(Math.sin(a)*170,48+i*9,-Math.cos(a)*170);m.rotation.y=-a;m.userData.i=i;g.add(m);auroras.push(m);}
    // 행성: 무대 아래 큰 푸른 구 + 대기 테두리
    const plTex=canvasTex(512,256,gg=>{gg.fillStyle='#163a7a';gg.fillRect(0,0,512,256);const pr=mulberry32(3);gg.fillStyle='#1f6a8f';for(let i=0;i<26;i++){gg.beginPath();gg.ellipse(pr()*512,pr()*256,20+pr()*60,10+pr()*30,pr()*3,0,Math.PI*2);gg.fill();}
      gg.fillStyle='rgba(255,255,255,0.35)';for(let i=0;i<40;i++){gg.beginPath();gg.ellipse(pr()*512,pr()*256,15+pr()*50,4+pr()*10,pr()*3,0,Math.PI*2);gg.fill();}});
    const planet=new THREE.Mesh(new THREE.SphereGeometry(120,64,40),new THREE.MeshStandardMaterial({map:plTex,roughness:.9,emissive:'#0b2a5a',emissiveIntensity:.5,fog:false}));planet.position.set(0,-158,-20);g.add(planet);
    const atmo=new THREE.Mesh(new THREE.SphereGeometry(124,64,40),new THREE.MeshBasicMaterial({color:'#4fa3ff',transparent:true,opacity:.22,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));atmo.position.copy(planet.position);g.add(atmo);
    // 육각 유리 판: 어두운 유리 + 위 격자 빛 + 빛 테두리(위·아래)
    const HR=9.6;const slab=new THREE.Mesh(new THREE.CylinderGeometry(HR,HR,0.6,6),std('#0f1626',{roughness:.18,metalness:.55}));slab.position.y=-0.3;slab.receiveShadow=true;fb.add(slab);
    const slab2=new THREE.Mesh(new THREE.CylinderGeometry(HR-1.2,HR-2.6,1.6,6),std('#0a0f1c',{roughness:.5,metalness:.3}));slab2.position.y=-1.4;fb.add(slab2);
    const gridTex=canvasTex(1024,1024,gg=>{gg.clearRect(0,0,1024,1024);gg.strokeStyle=rgba(0.28);gg.lineWidth=2;for(let i=0;i<=16;i++){const p=i*64;gg.beginPath();gg.moveTo(p,0);gg.lineTo(p,1024);gg.stroke();gg.beginPath();gg.moveTo(0,p);gg.lineTo(1024,p);gg.stroke();}
      gg.strokeStyle=rgba(0.7);gg.lineWidth=5;for(const r of[140,290,440]){gg.beginPath();gg.arc(512,512,r,0,Math.PI*2);gg.stroke();}});
    const grid=new THREE.Mesh(new THREE.CircleGeometry(R-0.1,96),new THREE.MeshBasicMaterial({map:gridTex,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));grid.rotation.x=-Math.PI/2;grid.position.y=0.06;g.add(grid);
    const edgeMat=new THREE.MeshBasicMaterial({color:acc,toneMapped:false,side:THREE.DoubleSide});
    const edge=new THREE.Mesh(new THREE.RingGeometry(HR-0.1,HR+0.08,6),edgeMat);edge.rotation.x=-Math.PI/2;edge.position.y=0.012;fb.add(edge);
    const edge2=new THREE.Mesh(new THREE.RingGeometry(HR-0.02,HR+0.2,6),new THREE.MeshBasicMaterial({color:acc,toneMapped:false,transparent:true,opacity:.6,side:THREE.DoubleSide}));edge2.rotation.x=-Math.PI/2;edge2.position.y=-0.62;fb.add(edge2);
    // 도는 빛 고리 둘(기울어져 천천히 돈다)
    const rings=[11.5,13.5].map((rr,i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(rr,0.045,8,220),new THREE.MeshBasicMaterial({color:acc,toneMapped:false,transparent:true,opacity:i?.45:.8}));m.rotation.x=Math.PI/2+(i?-0.12:0.1);m.position.y=i?6.4:-1.3;g.add(m);return m;});
    // 가장자리 빛 기둥 여섯
    const tipMat=new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:1.6});
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const x=Math.sin(a)*(HR-0.7),z=Math.cos(a)*(HR-0.7);if(z<-6)continue;
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,10),new THREE.MeshStandardMaterial({color:acc,emissive:acc,emissiveIntensity:.7,transparent:true,opacity:.75}));post.position.set(x,1.2,z);post.castShadow=false;fb.add(post);
      const tip=new THREE.Mesh(new THREE.SphereGeometry(0.1,14,10),tipMat);tip.position.set(x,2.48,z);tip.castShadow=false;fb.add(tip);}
    // 허공의 데이터 기둥(멀리, 세로 빛줄기)
    const dr=mulberry32(9),pillars=[];for(let i=0;i<14;i++){const a=dr()*Math.PI*2,r=15+dr()*9,h=5+dr()*9;const m=new THREE.Mesh(new THREE.PlaneGeometry(0.18,h),new THREE.MeshBasicMaterial({color:acc,toneMapped:false,transparent:true,opacity:.18+dr()*0.2,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
      m.position.set(Math.sin(a)*r,-2+h/2+dr()*2,Math.cos(a)*r);m.rotation.y=a+Math.PI;m.userData.b=[m.position.y,dr()*6.28];g.add(m);pillars.push(m);}
    const floorAt=(x,z)=>Math.hypot(x,z)<=R+0.3?0:-30;
    // 조각 자리 셋: 떠 있는 어두운 받침 + 빛 고리 + 구슬 + 홀로그램 표지판
    const SPOT_POS=[[-6.4,0.6],[6.4,0.6],[0,6.6]];
    const spots=M.map((m,i)=>{const p=SPOT_POS[i%SPOT_POS.length];const pos=new THREE.Vector3(p[0],0,p[1]);const toC=new THREE.Vector3(-pos.x,0,-pos.z).normalize();
      const stand=pos.clone().addScaledVector(toC,1.75);const col=new THREE.Color(m.color||'#ffffff');
      const sgp=new THREE.Group();sgp.position.copy(pos);g.add(sgp);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.05,0.12,64),std('#18213a',{roughness:.3,metalness:.5}));pad.position.y=0.26;sgp.add(pad);fbHide.push(pad);
      const padRing=new THREE.Mesh(new THREE.TorusGeometry(1.12,0.03,8,96),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.2,roughness:.4}));padRing.rotation.x=Math.PI/2;padRing.position.y=0.42;sgp.add(padRing);
      const under=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.6,0.22,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.35,toneMapped:false,depthWrite:false}));under.position.y=0.1;sgp.add(under);fbHide.push(under);
      const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,0.8,32),new THREE.MeshStandardMaterial({color:'#1b2440',emissive:col,emissiveIntensity:.25,roughness:.3,metalness:.4}));ped.position.y=0.72;sgp.add(ped);fbHide.push(ped);
      const halo=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.03,48),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.9,transparent:true,opacity:.55,depthWrite:false}));halo.position.y=1.15;sgp.add(halo);
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.26,32,24),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.9,roughness:.25}));orb.position.y=1.65;orb.castShadow=false;sgp.add(orb);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:col,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));glow.scale.setScalar(1.9);glow.position.y=1.65;sgp.add(glow);
      const light=new THREE.PointLight(col,0.8,5,2);light.position.y=1.8;sgp.add(light);
      const out=toC.clone().negate();const sign=new THREE.Group();sign.position.copy(out.clone().multiplyScalar(1.45));sign.rotation.y=Math.atan2(-out.x,-out.z);sgp.add(sign);
      const tex=canvasTex(512,320,gg=>{gg.clearRect(0,0,512,320);gg.fillStyle=rgba(0.2);gg.fillRect(0,0,512,320);gg.strokeStyle=rgba(0.95);gg.lineWidth=6;gg.strokeRect(3,3,506,314);gg.fillStyle=m.color||'#fff';gg.fillRect(0,0,22,320);
        gg.fillStyle='#eefbff';gg.font='900 90px "Noto Sans KR",sans-serif';gg.fillText(m.label||'',56,124);
        gg.fillStyle='#bfefff';gg.font='500 38px "Noto Sans KR",sans-serif';gg.fillText(m.title||'',56,206,430);
        gg.fillStyle='#8fd3ea';gg.font='400 30px "Noto Sans KR",sans-serif';gg.fillText(m.sub||'',56,262,430);});
      const board=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.875),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));board.position.y=1.6;sign.add(board);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.2,8),new THREE.MeshBasicMaterial({color:acc,toneMapped:false,transparent:true,opacity:.5,depthWrite:false}));beam.position.y=0.6;sign.add(beam);fbHide.push(beam);
      shadowize(sgp,true,true);orb.castShadow=false;glow.castShadow=false;board.castShadow=false;halo.castShadow=false;beam.castShadow=false;under.castShadow=false;
      return{i,m,pos,stand,group:sgp,orb,glow,light,padRing,col,board,yaw:Math.atan2(pos.x-stand.x,pos.z-stand.z)};});
    // 게이트(문): 빛 기둥 둘 + 빛 들보, 닫혀 있을 땐 푸른 빛 장막 둘, 열리면 장막이 걷히고 가운데가 빛난다
    const D=new THREE.Vector3(0,0,-8.0);const door=new THREE.Group();door.position.copy(D);g.add(door);
    const dark=std('#121a2e',{roughness:.35,metalness:.5});
    for(const s of[-1,1]){const base=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.6,0.3,6),dark);base.position.set(1.6*s,0.15,0);door.add(base);fbHide.push(base);
      const core=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,4.0,16),new THREE.MeshBasicMaterial({color:'#dff8ff',toneMapped:false}));core.position.set(1.6*s,2.3,0);core.castShadow=false;door.add(core);fbHide.push(core);
      const halo2=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,4.0,16,1,true),new THREE.MeshBasicMaterial({color:acc,toneMapped:false,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));halo2.position.set(1.6*s,2.3,0);halo2.castShadow=false;door.add(halo2);fbHide.push(halo2);}
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.1,0.1),new THREE.MeshBasicMaterial({color:'#dff8ff',toneMapped:false}));lintel.position.y=4.3;lintel.castShadow=false;door.add(lintel);fbHide.push(lintel);
    const paneMat=new THREE.MeshBasicMaterial({color:acc,transparent:true,opacity:.28,toneMapped:false,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const hinges=[-1,1].map(s=>{const h=new THREE.Group();door.add(h);const p=new THREE.Mesh(new THREE.PlaneGeometry(1.45,3.9),paneMat);p.position.set(0.725*s,2.25,0);p.castShadow=false;h.add(p);return{h,s};});
    const glowPlane=new THREE.Mesh(new THREE.PlaneGeometry(3.0,4.0),new THREE.MeshBasicMaterial({color:'#eafcff',transparent:true,opacity:0,toneMapped:false,depthWrite:false,side:THREE.DoubleSide}));glowPlane.position.set(0,2.25,-0.1);glowPlane.castShadow=false;door.add(glowPlane);
    const doorLight=new THREE.PointLight(acc,0.6,9,2);doorLight.position.set(0,2,0.8);door.add(doorLight);
    const doorOpen=k=>{hinges.forEach(({h,s})=>{h.position.x=s*0.9*k;});paneMat.opacity=0.28*(1-k);glowPlane.material.opacity=k*0.95;doorLight.intensity=0.6+k*3.5;};
    // 떠다니는 빛 알갱이
    const N=90,mg=new THREE.BufferGeometry(),mp=new Float32Array(N*3),mb=[];const r2=mulberry32(11);
    for(let i=0;i<N;i++){const a=r2()*Math.PI*2,r=3+r2()*14,y=0.4+r2()*7;mb.push([Math.sin(a)*r,y,Math.cos(a)*r,r2()*6.28]);mp.set(mb[i].slice(0,3),i*3);}
    mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
    const motes=new THREE.Points(mg,new THREE.PointsMaterial({color:accHex,size:0.14,map:GLOW,transparent:true,opacity:.75,depthWrite:false,sizeAttenuation:true}));g.add(motes);
    // 블렌더로 짓고 빛을 구운 무대 GLB(설정 stage.model: url PC판, lite 폰판). BK_ = 구운 그림 그대로(조명 없이), EM_ = 발광 띠. 불러오면 코드 구조물을 숨기고 그림자 판만 얹는다
    const GM=ST.model||null;
    if(GM&&GM.url){const url=(IS_TOUCH&&GM.lite)?GM.lite:GM.url;
      loadGltf(url).then(gltf=>{const s=gltf.scene;s.traverse(o=>{if(!o.isMesh)return;const nm=o.name||'';o.castShadow=false;o.receiveShadow=false;
          if(nm.indexOf('BK_')===0){const map=o.material&&o.material.map;if(map){map.anisotropy=renderer.capabilities.getMaxAnisotropy();}o.material=new THREE.MeshBasicMaterial({map:map||null,color:map?'#ffffff':'#222a3a'});}
          else if(o.material){const m=o.material;if(m.emissiveIntensity>2.2)m.emissiveIntensity=2.2;m.needsUpdate=true;}});
        g.add(s);fb.visible=false;fbHide.forEach(o=>{o.visible=false;});grid.visible=false;   /* 네모 격자 덧그림은 구운 바닥 선과 겹치므로 끈다(휴먼쌤 10-30 "하단에 그리드는?") */
        const sh=new THREE.Mesh(new THREE.CircleGeometry(R,64),new THREE.ShadowMaterial({opacity:.38}));sh.rotation.x=-Math.PI/2;sh.position.y=0.058;sh.receiveShadow=true;g.add(sh);
        console.info('[world] 블렌더 무대 GLB 불러옴:',url);})
      .catch(e=>{console.warn('[world] 무대 GLB를 불러오지 못해 코드 무대를 씁니다:',e);});}
    const updateStage=(dt,T)=>{const a=mg.attributes.position;for(let i=0;i<N;i++){const b=mb[i];a.setXYZ(i,b[0]+Math.sin(T*0.35+b[3])*0.6,b[1]+Math.sin(T*0.7+b[3]*2)*0.25,b[2]+Math.cos(T*0.3+b[3])*0.6);}a.needsUpdate=true;
      spots.forEach(s=>{s.orb.position.y=1.65+Math.sin(T*1.4+s.i)*0.08;s.glow.position.y=s.orb.position.y;s.orb.rotation.y+=dt*0.6;s.board.position.y=1.6+Math.sin(T*1.1+s.i*2)*0.04;s.group.position.y=Math.sin(T*0.8+s.i*1.7)*0.05;});
      rings[0].rotation.z+=dt*0.08;rings[1].rotation.z-=dt*0.05;planet.rotation.y+=dt*0.004;stars.rotation.y+=dt*0.002;
      auroras.forEach(m=>{m.material.opacity=(0.3-m.userData.i*0.07)+Math.sin(T*0.25+m.userData.i)*0.06;});pillars.forEach(m=>{const b=m.userData.b;m.position.y=b[0]+Math.sin(T*0.4+b[1])*0.4;});};
    return{group:g,R,floorAt,spots,door:{group:door,pos:D,open:doorOpen},guide:{pos:new THREE.Vector3(0,0,-1.0),facing:0},hub:new THREE.Vector3(0,0,1.15),
      doorNode:new THREE.Vector3(0,0,-5.3),gate:new THREE.Vector3(0,0,-7.55),human:new THREE.Vector3(0,0,-6.2),meet:new THREE.Vector3(0,0,-3.5),updateStage};
  }
  /* =====================================================================
     STAGE — 'classroom': 햇살 낮 교실(월드 1 프로필 새 판, 2026-11-01, 휴먼쌤 "A 햇살 낮으로").
     블렌더로 짓고 빛을 구운 GLB(설정 stage.model)가 무대 전부다: BK_ = 구운 그림 그대로(조명 없이), EM_ = 발광(바닥 빛 고리 st_s1~4 · 앞문 빛).
     좌표: 블렌더 (x, y, z) → three (x, z, -y). 교실 16 x 13 m(x -8~8, z -6.5~6.5), 천장 3.6 m.
       북(z -6.5) 칠판·교탁 / 서(x -8) 창가 / 동(x 8) 책장·앞문(z -5.6~-4.2, 아래 반쪽만 열려 있음) / 남(z 6.5) 뒤 게시판·사물함.
     걷기는 책상 사이 통로 그래프(route)로만 다니고, 카메라는 교실 안에 가둔다(clampCam). 만드는 법: tools\unity\projects\vr-maps\world1-profile\blender\classroom_build.py
     ===================================================================== */
  function buildClassroomStage(){
    const g=new THREE.Group();scene.add(g);document.body.classList.add('roomstage');
    const V3=(x,y,z)=>new THREE.Vector3(x,y,z),B=(x,y)=>V3(x,0,-y);   /* B: 블렌더 바닥 (x, y) → three */
    const RX=7.7,RZ=6.2,CEIL=3.3;
    const clampCam=v=>{v.x=clamp(v.x,-RX,RX);v.z=clamp(v.z,-RZ,RZ);v.y=clamp(v.y,0.45,CEIL);return v;};
    // 빛: 구운 무대는 조명을 안 받는다. 캐릭터만 서쪽 창으로 드는 햇빛과 따뜻한 하늘빛으로 비춘다
    scene.fog.near=60;scene.fog.far=160;
    sun.color.set('#fff1dc');sun.intensity=1.25;sun.position.set(-12,9,4.5);sun.target.position.set(0,0,0);
    sun.shadow.camera.left=sun.shadow.camera.bottom=-11;sun.shadow.camera.right=sun.shadow.camera.top=11;sun.shadow.camera.far=40;sun.shadow.camera.updateProjectionMatrix();
    hemi.intensity=0.95;hemi.color.set('#fffaf2');hemi.groundColor.set('#e2cdb4');   /* 아래 반사광을 밝게(얼굴 아래가 갈색으로 얼룩져 보이지 않게, 11-01) */
    // 무대 GLB를 못 불러올 때 쓰는 간단한 방
    const fb=new THREE.Group();g.add(fb);
    {const fl=new THREE.Mesh(new THREE.PlaneGeometry(16,13),std('#b98a5e',{roughness:.9}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;fb.add(fl);
      const room=new THREE.Mesh(new THREE.BoxGeometry(16.2,3.6,13.2),std('#efe6d4',{roughness:.95,side:THREE.BackSide}));room.position.y=1.8;fb.add(room);}
    // 앞문 너머 복도(문틈으로 검게 보이지 않게 밝은 바닥·벽·천장)
    {const cm=new THREE.MeshBasicMaterial({color:'#efe5d4',toneMapped:false,side:THREE.DoubleSide}),cf=new THREE.MeshBasicMaterial({color:'#d9c6a8',toneMapped:false});
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(1.6,3.2),cf);fl.rotation.x=-Math.PI/2;fl.position.set(8.9,0.003,-4.9);g.add(fl);
      const ce=new THREE.Mesh(new THREE.PlaneGeometry(1.6,3.2),cm);ce.rotation.x=Math.PI/2;ce.position.set(8.9,3.0,-4.9);g.add(ce);
      for(const z of[-6.45,-3.35]){const w=new THREE.Mesh(new THREE.PlaneGeometry(1.6,3.0),cm);w.position.set(8.9,1.5,z);g.add(w);}}
    // 칠판 글: 구운 칠판 위에 또렷한 글로 덧그린다(설정 stage.board, 글꼴 Gaegu)
    if(ST.board){const BD=ST.board,bt=canvasTex(2048,584,()=>{}),cv=bt.image;
      const draw=()=>{const gg=cv.getContext('2d'),w=2048,h=584;const gr=gg.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#34594b');gr.addColorStop(1,'#2c4e41');gg.fillStyle=gr;gg.fillRect(0,0,w,h);
        const rn=mulberry32(5);gg.fillStyle='rgba(255,255,255,0.035)';for(let i=0;i<70;i++){gg.beginPath();gg.ellipse(rn()*w,rn()*h,60+rn()*220,10+rn()*40,rn()*3,0,7);gg.fill();}
        gg.textAlign='center';gg.textBaseline='middle';gg.fillStyle='#f6f3e8';gg.shadowColor='rgba(255,255,255,.35)';gg.shadowBlur=6;
        gg.font='700 176px Gaegu,"Noto Sans KR",sans-serif';gg.fillText(BD.name||'',w/2,168,w-160);
        gg.font='700 100px Gaegu,"Noto Sans KR",sans-serif';gg.fillText(BD.role||'',w/2,318,w-160);
        gg.shadowBlur=0;gg.strokeStyle='rgba(246,243,232,.55)';gg.lineWidth=5;gg.beginPath();gg.moveTo(w*0.3,392);gg.quadraticCurveTo(w/2,404,w*0.7,390);gg.stroke();
        gg.fillStyle='rgba(246,243,232,.92)';gg.font='400 64px Gaegu,"Noto Sans KR",sans-serif';gg.fillText(BD.line||'',w/2,478,w-140);bt.needsUpdate=true;};
      draw();if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('700 100px Gaegu','휴먼쌤'),document.fonts.load('400 64px Gaegu','휴먼쌤')]).then(draw).catch(()=>{});
      bt.anisotropy=renderer.capabilities.getMaxAnisotropy();
      const bm=new THREE.Mesh(new THREE.PlaneGeometry(5.1,1.45),new THREE.MeshBasicMaterial({map:bt,toneMapped:false}));bm.position.set(0,1.75,-6.40);g.add(bm);}
    // 전시물 글(설정 stage.exhibits): 창가 액자 셋 · 교탁 앞 팻말 · 책장 앞 책 둘 · 뒤 게시판 · 게시판 위 띠. 구운 무대 위에 또렷한 그림으로 덧붙인다
    {const EX=ST.exhibits||{},HAND='Gaegu,"Noto Sans KR",sans-serif',SANS='"Noto Sans KR",sans-serif';
      const ready=(document.fonts&&document.fonts.load)?Promise.all([document.fonts.load('700 80px Gaegu','휴먼쌤'),document.fonts.load('700 40px "Noto Sans KR"','휴먼쌤'),document.fonts.load('500 32px "Noto Sans KR"','휴먼쌤')]).catch(()=>{}):Promise.resolve();
      const paint=(w,h,draw)=>{const t=canvasTex(w,h,draw);ready.then(()=>{const gg=t.image.getContext('2d');gg.clearRect(0,0,w,h);draw(gg,w,h);t.needsUpdate=true;});t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;};
      const plate=(tex,w,h,x,y,z,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,transparent:true}));m.position.set(x,y,z);m.rotation.y=ry;g.add(m);return m;};
      const rr=(gg,x,y,w,h,r)=>{gg.beginPath();if(gg.roundRect)gg.roundRect(x,y,w,h,r);else gg.rect(x,y,w,h);};
      // 창가 액자 셋(서쪽 벽, 창 사이 기둥). 창을 보고 서면 왼쪽(뒤)부터 옛날 → 지금
      (EX.window||[]).slice(0,3).forEach((it,k)=>plate(paint(420,520,(gg,w,h)=>{const gr=gg.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#fbefd9');gr.addColorStop(1,'#efd2a2');gg.fillStyle=gr;gg.fillRect(0,0,w,h);
          gg.fillStyle='rgba(242,168,79,.28)';gg.beginPath();gg.arc(w*0.8,h*0.17,64,0,7);gg.fill();gg.fillStyle='rgba(255,255,255,.35)';gg.fillRect(0,h*0.86,w,h*0.14);
          gg.textAlign='center';gg.textBaseline='middle';gg.fillStyle='#5a3812';gg.font='700 '+(String(it.big||'').length>6?66:92)+'px '+HAND;gg.fillText(it.big||'',w/2,h*0.42,w-36);
          gg.fillStyle='#7a5530';gg.font='600 30px '+SANS;wrapLines(gg,it.small||'',w-50).slice(0,2).forEach((l,j,a)=>gg.fillText(l,w/2,h*0.68+(j-(a.length-1)/2)*40,w-40));}),0.42,0.52,-7.935,1.95,[2.8,0,-2.8][k],Math.PI/2));
      // 교탁 앞 팻말
      if(EX.lectern){const L=EX.lectern;plate(paint(880,440,(gg,w,h)=>{gg.fillStyle='#efe6d3';rr(gg,0,0,w,h,30);gg.fill();gg.fillStyle='#5cc2b5';gg.fillRect(30,0,w-60,14);
        gg.textAlign='center';gg.textBaseline='middle';gg.fillStyle='#21403b';gg.font='700 96px '+HAND;gg.fillText(L.title||'',w/2,h*0.35,w-60);
        const cs=L.chips||[],cw=226,gap=26,x0=w/2-(cs.length*cw+(cs.length-1)*gap)/2;cs.forEach((c,i)=>{const x=x0+i*(cw+gap);gg.fillStyle='#5cc2b5';rr(gg,x,h*0.6,cw,108,54);gg.fill();gg.fillStyle='#0f2f2b';gg.font='700 56px '+SANS;gg.fillText(c,x+cw/2,h*0.6+56,cw-24);});}),1.1,0.55,0,0.72,-4.835,0);}
      // 책장 앞에 세워 둔 함께 쓴 책 둘(표지 그림 없이 제목·출판사)
      (EX.shelf||[]).slice(0,2).forEach((b,k)=>plate(paint(260,360,(gg,w,h)=>{gg.fillStyle=b.color||'#ffd27a';gg.fillRect(0,0,w,h);gg.fillStyle='rgba(0,0,0,.22)';gg.fillRect(0,0,16,h);gg.fillStyle='rgba(255,255,255,.32)';gg.fillRect(16,0,4,h);
          gg.fillStyle='#15161f';gg.textAlign='left';gg.textBaseline='top';gg.font='900 34px '+SANS;wrapLines(gg,b.title||'',w-62).slice(0,5).forEach((l,i)=>gg.fillText(l,36,32+i*44));
          gg.globalAlpha=.72;gg.font='700 22px '+SANS;gg.fillText([b.pub,b.year].filter(Boolean).join(' · '),36,h-52);gg.globalAlpha=1;}),0.26,0.36,7.56,1.18,[1.42,1.78][k],-Math.PI/2));   /* 빛 구슬(z 1) 오른쪽에 */
      // 뒤 게시판(코르크): 왼쪽 생각주도력 글귀 종이 · 가운데~오른쪽 ACT 세 걸음 붙임쪽지
      if(EX.board){const Bd=EX.board;plate(paint(2048,430,(gg,w,h)=>{gg.fillStyle='#b98b5c';gg.fillRect(0,0,w,h);const rn=mulberry32(9);for(let i=0;i<900;i++){gg.fillStyle=rn()<.5?'rgba(90,55,25,.18)':'rgba(255,230,190,.16)';gg.fillRect(rn()*w,rn()*h,3+rn()*4,2+rn()*3);}
          const pin=(x,y,c)=>{gg.fillStyle=c;gg.beginPath();gg.arc(x,y,11,0,7);gg.fill();gg.fillStyle='rgba(255,255,255,.6)';gg.beginPath();gg.arc(x-3,y-3,4,0,7);gg.fill();};
          gg.save();gg.translate(80,38);gg.rotate(-0.012);gg.fillStyle='rgba(0,0,0,.18)';gg.fillRect(8,10,840,350);gg.fillStyle='#f6f1e6';gg.fillRect(0,0,840,350);
          gg.textAlign='left';gg.textBaseline='top';gg.fillStyle='#4b3b8f';gg.font='700 88px '+HAND;gg.fillText(Bd.title||'',44,26);
          gg.fillStyle='#2a2440';gg.font='500 32px '+SANS;wrapLines(gg,Bd.text||'',752).slice(0,4).forEach((l,i)=>gg.fillText(l,46,150+i*46));gg.restore();pin(500,50,'#9e8cff');
          const cols=['#ffe27a','#a8ecd0','#ffc2cf'],st=Bd.steps||[];st.forEach((t,i)=>{const x=1010+i*340,y=62+(i%2)*24;gg.save();gg.translate(x+130,y+130);gg.rotate((i-1)*0.04);gg.fillStyle='rgba(0,0,0,.16)';gg.fillRect(-122,-116,260,260);gg.fillStyle=cols[i%3];gg.fillRect(-130,-130,260,260);
            gg.fillStyle='#2a2440';gg.textAlign='center';gg.textBaseline='middle';const p=String(t).split(' ');gg.font='700 66px '+HAND;gg.fillText(p[0]||'',0,-20,236);if(p.length>1){gg.font='700 36px '+SANS;gg.fillText(p.slice(1).join(' '),0,52,236);}gg.restore();pin(x+130,y+14,'#ff7a7a');
            if(i<st.length-1){gg.fillStyle='#fff3df';gg.font='700 56px '+SANS;gg.textAlign='center';gg.textBaseline='middle';gg.fillText('→',x+300,y+140);}});}),6.1,1.28,0,2.2,6.398,Math.PI);   /* 구운 종이(6.409)보다 앞 */
        if(Bd.slogan)plate(paint(1760,128,(gg,w,h)=>{gg.fillStyle='#8576dc';gg.fillRect(0,0,w,h);gg.fillStyle='#ffffff';gg.textAlign='center';gg.textBaseline='middle';gg.font='700 72px '+HAND;gg.fillText(Bd.slogan,w/2,h/2+4,w-60);}),2.2,0.16,0,2.92,6.394,Math.PI);}}
    // 캐릭터 그림자만 받는 바닥
    {const sh=new THREE.Mesh(new THREE.PlaneGeometry(16,13),new THREE.ShadowMaterial({opacity:.22}));sh.rotation.x=-Math.PI/2;sh.position.y=0.004;sh.receiveShadow=true;g.add(sh);}
    // 조각 자리 넷: r = 바닥 빛 고리(무대에 구워 있음), n = 전시물에서 교실 안쪽 방향, look = 전시물. 방문자는 고리 앞(r + n*0.8)에 서서 전시물을 본다
    // oy = 빛 구슬 높이(교탁은 칠판 글을 가리지 않게 낮게), gs = 리니가 비켜 서는 쪽
    const SP=[{r:B(-6.4,0),n:V3(1,0,0),look:V3(-7.95,1.95,0),gs:-1},      /* 창가 — 걸어온 길(액자·연표 띠) */
              {r:B(0,3.9),n:V3(0,0,1),look:V3(0,1.2,-5.4),gs:1,oy:1.28},  /* 교탁 — 지금 하는 일 */
              {r:B(6.4,-1),n:V3(-1,0,0),look:V3(7.8,1.15,1),gs:1},         /* 책장 — 쌓아 온 것 */
              {r:B(0,-4.9),n:V3(0,0,-1),look:V3(0,2.1,6.44),gs:1}];        /* 뒤 게시판 — 생각 */
    const RING={},EMD=[];
    const spots=M.map((m,i)=>{const d=SP[i%SP.length],n=d.n,r=d.r,col=new THREE.Color(m.color||'#ffffff');
      const S=r.clone().addScaledVector(n,0.8),perpG=V3(-n.z,0,n.x).multiplyScalar(d.gs);
      const O=r.clone().addScaledVector(n,-0.25);O.y=d.oy||1.55;
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.19,32,24),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.5,roughness:.25}));orb.position.copy(O);g.add(orb);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:col,transparent:true,opacity:.7,depthWrite:false,toneMapped:false}));glow.scale.setScalar(1.25);glow.position.copy(O);g.add(glow);
      const tag=textSprite();drawTag(tag,m.label||'',m.color||'#ffffff');tag.scale.set(1.0,0.31,1);tag.position.copy(O).setY(O.y+0.42);g.add(tag);
      const sp={i,m,pos:r.clone(),stand:S,face:d.look,look:d.look,n,orb,glow,tag,col,orbPos:O,done:false,
        light:{intensity:0},padRing:{material:{emissiveIntensity:0}},
        guide:S.clone().addScaledVector(perpG,1.1).addScaledVector(n,0.15),
        // 빛 구슬·이름표는 지금 갈 조각(cur)만 보인다(교탁 구슬이 칠판 글을 가리지 않게). 바닥 빛 고리는 늘 있고, 모은 조각은 어둡게
        setDone(got,cur){sp.done=got;if(cur!=null)sp.cur=cur;const on=!got&&sp.cur!==false;orb.visible=on;glow.visible=on;tag.visible=on;const rm=RING['st_s'+(i+1)];if(rm)rm.emissiveIntensity=got?0.3:rm.userData.base;},
        // 도착 연출: 방문자 뒤 높은 곳에서 어깨 너머로 내려오며 전시물을 본다(리니 반대쪽에서)
        arriveShot(){const cs=perpG.clone().negate(),LK=d.look;return(k,pos,look)=>{const e=ez(k),back=lerp(3.4,2.2,e),side=lerp(1.5,1.05,e);
          pos.set(S.x+n.x*back+cs.x*side,lerp(2.8,1.75,e),S.z+n.z*back+cs.z*side);clampCam(pos);look.set(lerp(S.x,LK.x,0.5+0.3*e),lerp(1.35,LK.y,0.5+0.3*e),lerp(S.z,LK.z,0.5+0.3*e));};},
        // 조각 모으기 연출: 리니 반대쪽 어깨 너머에서 빛 구슬로 다가간다(리니가 화면을 가리지 않게)
        glowScale:1.25,
        collectShot(){const cs=perpG.clone().negate();return(k,pos,look)=>{const e=ez(k),q=Math.sin(k*Math.PI);pos.set(S.x+n.x*lerp(1.9,1.3,e)+cs.x*lerp(1.0,0.75,e),lerp(1.95,1.75,e),S.z+n.z*lerp(1.9,1.3,e)+cs.z*lerp(1.0,0.75,e));clampCam(pos);
          look.copy(orb.position);orb.scale.setScalar(1+q*0.4);glow.scale.setScalar(1.25+q*0.8);};}};
      return sp;});
    // 앞문: 열면 문틈에 빛 막 + 문틀 빛이 밝아진다(문짝은 무대에 구워 있어 움직이지 않는다)
    const curtain=new THREE.Mesh(new THREE.PlaneGeometry(0.7,2.3),new THREE.MeshBasicMaterial({color:'#fff1d6',transparent:true,opacity:0,toneMapped:false,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    curtain.rotation.y=Math.PI/2;curtain.position.set(8.06,1.15,-5.26);g.add(curtain);
    const dLight=new THREE.PointLight('#ffe2b0',0,7,2);dLight.position.set(7.4,2.0,-5.0);g.add(dLight);
    const door={group:g,pos:V3(8.0,0,-5.1),k:0,target:null,open(k){door.k=k;curtain.material.opacity=k*0.55;dLight.intensity=k*1.6;EMD.forEach(mt=>{mt.emissiveIntensity=(mt.userData.base||1)*(1+k*0.8);});}};
    // 무대 GLB(PC판 · 폰판)
    const GM=ST.model||null;
    if(GM&&GM.url){const url=(IS_TOUCH&&GM.lite)?GM.lite:GM.url;
      loadGltf(url).then(gltf=>{const sc=gltf.scene;sc.traverse(o=>{if(!o.isMesh)return;const nm=o.name||'';o.castShadow=false;o.receiveShadow=false;
          if(nm.indexOf('BK_')===0){const map=o.material&&o.material.map;if(map)map.anisotropy=renderer.capabilities.getMaxAnisotropy();o.material=new THREE.MeshBasicMaterial({map:map||null,color:map?'#ffffff':'#d9cbb5',toneMapped:false});}
          else(Array.isArray(o.material)?o.material:[o.material]).forEach(mt=>{if(!mt)return;if(mt.emissiveIntensity>(ST.emMax||2.2))mt.emissiveIntensity=ST.emMax||2.2;mt.userData.base=mt.emissiveIntensity;mt.toneMapped=false;mt.needsUpdate=true;
            if(/^st_s\d/.test(mt.name||''))RING[mt.name]=mt;if(/glow_door|corridor/.test(mt.name||''))EMD.push(mt);});});
        g.add(sc);fb.visible=false;spots.forEach(sp=>sp.setDone(sp.done));door.open(door.k);console.info('[world] 교실 무대 GLB 불러옴:',url);})
      .catch(e=>{console.warn('[world] 교실 무대 GLB를 불러오지 못해 간단한 방을 씁니다:',e);});}
    // 걷는 길: 책상 사이 통로 그래프(가운데 통로 · 창가 통로 · 책장 통로 · 앞 · 뒤 · 앞문)
    const GN={cb:B(0,-4.4),cm:B(0,-1),cf:B(0,3.25),lb:B(-6.1,-4.4),lm:B(-6.1,0),lf:B(-6.1,3.25),rb:B(6.3,-4.4),rm:B(6.3,-1),rf:B(6.3,3.25),din:V3(7.1,0,-5.0),gt:V3(8.0,0,-5.25),by:V3(9.3,0,-5.25)};
    const GE=[['cb','cm'],['cm','cf'],['lb','lm'],['lm','lf'],['rb','rm'],['rm','rf'],['cb','lb'],['cb','rb'],['cf','lf'],['cf','rf'],['rf','din'],['din','gt'],['gt','by']];
    const ATT={hub:'cm',s0:'lm',s1:'cf',s2:'rm',s3:'cb',meet:'cf',door:'din',gate:'gt',beyond:'by'};
    const nearNode=p=>{let k0='cm',d0=1e9;for(const k in GN){if(k==='gt'||k==='by')continue;const d=GN[k].distanceTo(p);if(d<d0){d0=d;k0=k;}}return k0;};   /* 자유 이동 뒤처럼 정한 자리가 아닐 때 */
    // 자유 이동(교실에 조금 더 있기)에서 부딪히는 것: 책상·의자 30 · 교탁 · 교사 책상 · 책장. 사람 반지름 r(기본 0.22 m), 교실 밖(앞문 포함)으로는 못 나감
    const BOX=[];for(const x of[-4.7,-3.4,-2.1,2.1,3.4,4.7])for(const y of[-3.2,-1.8,-0.4,1.0,2.4])BOX.push([x-0.31,x+0.31,-(y+0.23),-(y-0.62)]);
    BOX.push([-0.73,0.73,-5.51,-4.79],[-5.45,-3.75,-5.83,-4.97],[7.55,8,-1.05,3.05]);
    const canWalk=(x,z,r)=>{r=r==null?0.22:r;if(Math.abs(x)>RX-0.25||Math.abs(z)>5.85)return false;for(const b of BOX)if(x>b[0]-r&&x<b[1]+r&&z>b[2]-r&&z<b[3]+r)return false;return true;};
    function gpath(a,b){const Dd={},Pv={},Qs=new Set(Object.keys(GN));for(const k of Qs)Dd[k]=Infinity;Dd[a]=0;
      while(Qs.size){let u=null;for(const k of Qs)if(u===null||Dd[k]<Dd[u])u=k;Qs.delete(u);if(u===b)break;
        for(const [x,y] of GE){const v=x===u?y:y===u?x:null;if(!v||!Qs.has(v))continue;const nd=Dd[u]+GN[u].distanceTo(GN[v]);if(nd<Dd[v]){Dd[v]=nd;Pv[v]=u;}}}
      const out=[];let c=b;while(c){out.unshift(c);c=Pv[c];}return out[0]===a?out:[a,b];}
    const route=(from,to,pos,NODES)=>{const a=ATT[from]||nearNode(pos),b=ATT[to],BB=NODES[to];if(!b)return[{x:BB.x,z:BB.z}];
      const pts=gpath(a||b,b).map(k=>GN[k]);
      if(pts.length>=2&&pos.distanceTo(pts[1])<=pts[0].distanceTo(pts[1])+0.6)pts.shift();   /* 출발 옆 점은 건너뛸 수 있으면 건너뛴다 */
      if(pts.length>=2&&BB.distanceTo(pts[pts.length-2])<=pts[pts.length-1].distanceTo(pts[pts.length-2])+0.6)pts.pop();   /* 도착 앞 점도 */
      if(pts.length===1&&pos.distanceTo(BB)<pts[0].distanceTo(BB)+0.6&&pos.distanceTo(BB)<pos.distanceTo(pts[0]))pts.pop();
      const path=pts.map(p=>({x:p.x,z:p.z}));path.push({x:BB.x,z:BB.z});return path;};
    const floorAt=(x,z)=>(Math.abs(x)<=RX&&Math.abs(z)<=6.1)?0:(x>RX-0.1&&x<8.2&&z>-5.6&&z<-4.93)?0:(x>=8.2&&x<9.45&&z>-6.3&&z<-3.5)?0:-30;
    const hub=B(0,-1),meet=V3(0.25,0,-3.0),human=V3(1.1,0,-4.6);
    const guideSpots={hub:V3(0.75,0,-0.35),meet:V3(-0.75,0,-3.55),door:V3(6.2,0,-3.9),gate:V3(6.6,0,-4.3),beyond:V3(7.0,0,-4.4)};spots.forEach(sp=>{guideSpots['s'+sp.i]=sp.guide;});
    const updateStage=(dt,T)=>{spots.forEach(sp=>{const y=sp.orbPos.y+Math.sin(T*1.4+sp.i)*0.06;sp.orb.position.y=y;sp.glow.position.y=y;sp.orb.rotation.y+=dt*0.6;sp.tag.position.y=y+0.42;
        sp.tag.material.opacity=clamp((camera.position.distanceTo(sp.tag.position)-2.6)/1.4,0,1);});   /* 가까이 오면 이름표는 흐려진다(전시물을 가리지 않게) */
      if(door.target!=null){let k=door.k+(door.target-door.k)*Math.min(1,dt*2.2);if(Math.abs(door.target-k)<0.01)k=door.target;door.open(k);if(door.k===door.target)door.target=null;}};
    return{group:g,walk:true,floorAt,spots,door,route,clampCam,canWalk,doorWalk:true,
      guide:{pos:guideSpots.hub.clone(),facing:Math.atan2(hub.x-guideSpots.hub.x,hub.z-guideSpots.hub.z)},guideSpots,
      hub,doorNode:V3(7.1,0,-5.0),gate:V3(8.0,0,-5.25),beyond:V3(9.3,0,-5.25),meet,human,
      humanWalk:[V3(9.2,0,-5.25),V3(8.0,0,-5.25),V3(7.0,0,-4.95),human.clone()],
      views:{board:{pos:V3(0,1.75,-1.6),look:V3(0,1.72,-6.4),ref:1.7}},
      introShot:()=>(k,pos,look)=>{const t=T*0.06,tall=camera.aspect<1;pos.set(Math.sin(t)*(tall?1.2:2.4),tall?3.15:2.4,tall?6.1:5.3);   /* 폰 세로는 높이·뒤로(방문자가 화면을 다 가리지 않게) */look.set(Math.sin(t*0.7)*1.5,1.3,-4.5);},
      cine:{gather(e,pos,look,H){pos.set(lerp(-2.6,-1.2,e),lerp(2.9,2.1,e),lerp(2.4,-0.6,e));look.set(lerp(0.2,H.x*0.8,e),lerp(1.7,2.1,e),lerp(-2.0,H.z,e));},
        appear(H,P,pos,look){pos.set(P.x-1.3,1.75,P.z+2.0);clampCam(pos);look.set(lerp(P.x,H.x,0.7),1.35,lerp(P.z,H.z,0.7));}},
      updateStage};
  }
  const STAGE=ST.preset==='classroom'?buildClassroomStage():ST.preset==='holodeck'?buildHoloDeckStage():ST.preset==='orbit'?buildOrbitStage():buildPlaceholderStage();
  // 걸을 수 있는 바닥(이 판에는 문 너머 도시가 없다)
  const floorAt=STAGE.walk?STAGE.floorAt:(x,z)=>(Math.abs(x)<1.3&&z<-7&&z>-11.5)?0:STAGE.floorAt(x,z);   /* 교실 무대는 자기 floorAt(앞문 너머 복도 포함), 다른 무대는 문(z -8) 너머 좁은 통로를 걸을 수 있게 */

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
      // 휴머노이드 로봇(opts.robot, 엑스리아 월드 2026-10-30): 같은 뼈대·걷기·손짓 위에 금속 판·헬멧·눈빛·가슴 코어·관절 구슬·안테나를 얹고 머리카락·볼터치·코·목도리는 뺀다.
      // robot: { plate 얼굴·손 판, body 몸·헬멧, joint 관절·다리, accent 빛나는 테·코어, eye 눈빛, feet 발 } (true만 주면 기본 색)
      this.robot=opts.robot?Object.assign({plate:'#e3e7ee',body:'#8d97a8',joint:'#2d3240',accent:'#4fd8ff',eye:'#7af0ff',feet:'#9aa3b2'},typeof opts.robot==='object'?opts.robot:{}):null;
      if(this.robot){const R=this.robot;
        Mt.skin.metalness=.55;Mt.skin.roughness=.32;Mt.coat.metalness=.45;Mt.coat.roughness=.42;Mt.pants.color.set(R.joint);Mt.pants.metalness=.35;Mt.pants.roughness=.5;Mt.shoe.color.set(R.feet);Mt.shoe.metalness=.4;Mt.shoe.roughness=.4;
        Mt.scarf.emissive=new THREE.Color(R.accent);Mt.scarf.emissiveIntensity=.9;Mt.scarf.roughness=.4;
        Mt.eyeW.color.set(R.eye);Mt.eyeW.emissive=new THREE.Color(R.eye);Mt.eyeW.emissiveIntensity=1.6;Mt.iris.color.set('#0a1a2a');
        Mt.mouth.color.set(R.accent);Mt.mouth.emissive=new THREE.Color(R.accent);Mt.mouth.emissiveIntensity=1.2;
        cap.material=Mt.coat;back.material=Mt.coat;
        inner.traverse(m=>{if(m.isMesh&&(m.material===Mt.hair||m.material===Mt.blush))m.visible=false;});
        nose.visible=false;cheek.visible=false;sa.visible=false;zip.visible=false;
        this.eyes.forEach(e=>{e.position.z=0.158;e.scale.setScalar(1.25);});
        const glass=new THREE.MeshStandardMaterial({color:'#101622',roughness:.15,metalness:.3});const visor=mk(CGEO.sphere,glass,0,0.16,0.052,head);visor.scale.set(0.172,0.056,0.108);
        const acc=this.accMat=new THREE.MeshStandardMaterial({color:R.accent,emissive:R.accent,emissiveIntensity:1.4,roughness:.3});
        mk(new THREE.CylinderGeometry(0.009,0.011,0.11,8),Mt.pants,0,0.37,-0.02,head);const tip=mk(CGEO.lowSphere,acc,0,0.435,-0.02,head,false);tip.scale.setScalar(0.028);
        mk(new THREE.CircleGeometry(0.034,24),acc,0,0.30,0.121,spine,false);mk(new THREE.TorusGeometry(0.046,0.008,8,24),Mt.pants,0,0.30,0.119,spine,false);
        for(const a of this.arm){mk(CGEO.lowSphere,Mt.pants,0,0,0,a.sh).scale.setScalar(0.058);mk(CGEO.lowSphere,Mt.pants,0,0,0,a.el).scale.setScalar(0.046);}
        for(const l of this.leg){mk(CGEO.lowSphere,Mt.pants,0,0,0,l.th).scale.setScalar(0.072);mk(CGEO.lowSphere,Mt.pants,0,0,0,l.kn).scale.setScalar(0.06);}
        for(const s of[-1,1]){const ear=mk(new THREE.CylinderGeometry(0.03,0.03,0.02,16),Mt.pants,0.17*s,0.15,0,head);ear.rotation.z=Math.PI/2;const ed=mk(CGEO.lowSphere,acc,0.183*s,0.15,0,head,false);ed.scale.setScalar(0.012);}
      }
      this.tag=textSprite();this.tag.scale.set(1.0,0.31,1);this.tag.position.y=1.98;r.add(this.tag);this.tag.visible=false;
      this.bubble=textSprite();this.bubble.scale.set(1.25,0.39,1);this.bubble.position.y=2.32;r.add(this.bubble);this.bubble.visible=false;
      shadowize(inner,true,false);inner.traverse(m=>{if(m.isMesh&&(m.material===Mt.blush||m.material===Mt.hl||m.material===Mt.eyeW||m.material===Mt.iris||m.material===Mt.mouth))m.castShadow=false;});
      this.st={init:false,vel:new THREE.Vector3(),prev:new THREE.Vector3(),phase:0,m:0,run:0,wAir:0,accF:0,accR:0,turn:0,facing:0,land:0,blinkT:1.5,blink:0,look:0,lookT:2,em:null,
        sp:{a:{x:0,vx:0,z:0,vz:0},b:{x:0,vx:0,z:0,vz:0},c:{x:0,vx:0,z:0,vz:0},sa:{x:0,vx:0,z:0,vz:0},sb:{x:0,vx:0,z:0,vz:0},bag:{x:0,vx:0,z:0,vz:0}},g:newPose(),o:newPose()};
      this.setLook(look||[0,1,0,0,0]);}
    setLook(lk){lk=Array.isArray(lk)?lk:[];const pick=(arr,i)=>arr[Number.isInteger(i)&&i>=0&&i<arr.length?i:0];
      this.look=[0,1,2,3,4].map(i=>Number.isInteger(lk[i])?lk[i]:0);
      if(this.robot){const R=this.robot;this.mats.skin.color.set(R.plate);this.mats.hair.color.set(R.body);this.mats.coat.color.set(R.body);this.mats.scarf.color.set(R.accent);this.pony.visible=false;this.bob.visible=false;if(this.name!=null)drawTag(this.tag,this.name,R.accent);return;}
      this.mats.skin.color.set(pick(SKIN,lk[0]));this.mats.hair.color.set(pick(HAIR,lk[1]));this.mats.coat.color.set(pick(COAT,lk[2]));this.mats.scarf.color.set(pick(SCARF,lk[3]));
      const st=lk[4]===1?1:lk[4]===2?2:0;this.pony.visible=st===0;this.bob.visible=st===1;
      if(this.name!=null)drawTag(this.tag,this.name,pick(COAT,lk[2]));}
    setName(n){n=cleanText(n,16)||'여행자';if(n===this.name)return;this.name=n;drawTag(this.tag,n,this.robot?this.robot.accent:(COAT[this.look[2]]||COAT[0]));}
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
      if(this.accMat)this.accMat.emissiveIntensity=1.25+Math.sin(T*2.6)*0.35+(this.act==='talk'?Math.abs(Math.sin(T*13))*0.5:0);
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
      const glow=GLOW_Q!=null?GLOW_Q:(o.glow!=null?o.glow:0.3);   // 설정 glow(0~1), 시험은 주소 ?glow=0.5
      model.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=false;if(x.isSkinnedMesh)x.frustumCulled=false;
          // 저녁 광장처럼 어두운 조명에서는 Tripo 텍스처(리니 가방 무늬·등)가 때처럼 보여서, 텍스처 색으로 살짝 스스로 빛나게 한다(2026-10-03 휴먼쌤 "꾸질꾸질")
          (Array.isArray(x.material)?x.material:[x.material]).forEach(m=>{m.metalness=0;m.metalnessMap=null;
            if(glow>0&&m.map){m.emissive=new THREE.Color('#ffffff');m.emissiveMap=m.map;m.emissiveIntensity=glow;}m.needsUpdate=true;});}
        if(x.isBone)this.bones[x.name.replace(/^mixamorig:?/,'')]=x;});   /* Mixamo 뼈 이름은 'mixamorig:Hips'(콜론) 또는 'mixamorigHips' 둘 다 */
      // 로봇 GLB 색 입히기(설정 model.tint, 엑스리아 월드): 재질 이름에 joint가 들면 관절색, 아니면 몸색. 금속감·거칠기·은은한 빛도 같이
      const tint=o.tint||null;this.tagColor=o.tagColor||null;
      if(tint)model.traverse(x=>{if(!x.isMesh)return;(Array.isArray(x.material)?x.material:[x.material]).forEach(m=>{const joint=/joint/i.test(m.name||'');const c=joint?tint.joint:tint.body;if(c)m.color.set(c);
        if(tint.metal!=null)m.metalness=joint?Math.min(1,tint.metal+0.2):tint.metal;if(tint.rough!=null)m.roughness=joint?Math.max(0.2,tint.rough-0.1):tint.rough;
        if(!joint&&tint.emissive){m.emissive=new THREE.Color(tint.emissive);m.emissiveMap=null;m.emissiveIntensity=tint.emissiveIntensity!=null?tint.emissiveIntensity:0.1;}m.needsUpdate=true;});});
      for(const side of['Left','Right'])for(const n of[side+'ForeArm',side+'Hand'])if(this.bones[n])this.restPos[n]=this.bones[n].position.clone();
      // 키를 맞추고, 발 가운데가 원점(0,0,0)에 오도록 모델을 옮긴다(파일 속 원점이 비껴 있으면 카메라 구도가 어긋난다)
      const bb=measureBounds(model);const h=bb?bb.height:1.75;this.height=o.height||1.68;this.baseScale=this.height/h;inner.scale.setScalar(this.baseScale);
      if(bb)model.position.set(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);inner.add(model);
      if(o.fixedTexture){new THREE.TextureLoader().load(o.fixedTexture,tex=>{tex.encoding=THREE.sRGBEncoding;tex.flipY=false;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
        model.traverse(x=>{if(x.isMesh)(Array.isArray(x.material)?x.material:[x.material]).forEach(m=>{m.map=tex;if(m.emissiveMap)m.emissiveMap=tex;m.needsUpdate=true;});});},undefined,()=>{});}
      const mixer=this.mixer=new THREE.AnimationMixer(model);this.actions={};const clip=k=>gltf.animations.find(a=>a.name.toLowerCase().includes(k));
      const idle=clip((o.idle||'a person standing').toLowerCase())||clip('standing_relax')||clip('wait')||gltf.animations[0];if(idle)this.actions.idle=mixer.clipAction(idle);
      const idle2=clip((o.idle2||'standing_relax').toLowerCase());if(idle2&&idle2!==idle)this.actions.idle2=mixer.clipAction(idle2);
      // 말할 때 번갈아 틀 대기 동작(설정 talkIdles). 팔이 몸을 뚫는 동작은 설정에서 빼면 된다
      (o.talkIdles||[]).forEach((k,n)=>{const c=clip(String(k).toLowerCase());if(c&&c!==idle&&c!==idle2)this.actions['talk'+n]=mixer.clipAction(c);});
      this.talkSet=['idle'].concat(this.actions.idle2?['idle2']:[],Object.keys(this.actions).filter(k=>/^talk\d/.test(k)));
      this.talkOpt=Object.assign({idleSwap:6,gesture:1},o.talk||{});
      if(o.talkClip){const c=clip(String(o.talkClip).toLowerCase());if(c&&c!==idle)this.actions.talkc=mixer.clipAction(c);}   /* 말하는 동안 틀 동작(설정 model.talkClip, 리니 'talk') */
      this.armTuck=o.armTuck||0;   /* 걷기 동작에서 팔이 옆으로 벌어지면 위팔을 몸 쪽으로 모으는 각(라디안). 만화풍 휴먼쌤 걷기용(휴먼쌤 10-30 "팔 벌리고 걷고있음") */
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
    setName(n){n=cleanText(n,16)||'휴먼쌤';this.name=n;drawTag(this.tag,n,this.tagColor||'#3b6db3');}
    setScale(k){this.inner.scale.setScalar(this.baseScale*Math.max(0.001,k));}
    setLook(){}
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
      // 걷기 동작의 팔 벌어짐 줄이기: 걷기 가중치만큼 위팔을 몸 쪽으로(UE 뼈 이름 upperarm_l/r, Mixamo면 LeftArm/RightArm)
      if(this.armTuck&&this.actions.walk){const ww=this.actions.walk.getEffectiveWeight();if(ww>0.001){this.rot(B.upperarm_l||B.LeftArm,BODY_FORWARD,-this.armTuck*ww);this.rot(B.upperarm_r||B.RightArm,BODY_FORWARD,this.armTuck*ww);}}
      // 문을 열어 줄 때: 두 팔을 벌려 맞이하는 자세
      const ob=this.openBlend||0;if(ob>0.001)for(const [side,s] of[['Left',1],['Right',-1]]){this.rot(B[side+'Arm'],BODY_FORWARD,s*ob*0.5);this.rot(B[side+'Arm'],BODY_SIDE,-ob*0.3);this.rot(B[side+'ForeArm'],BODY_SIDE,-ob*0.25);}}
    update(dt,T,inp){this.root.position.copy(inp.pos);this.root.rotation.y=inp.facing;const talking=this.act==='talk';
      this.talkBlend=clamp(this.talkBlend+(talking?dt:-dt)/0.3,0,1);if(this.talkBlend>0)this.talkTime+=dt;
      this.openBlend=clamp((this.openBlend||0)+(this.act==='open'?dt:-dt)/0.5,0,1);
      if(!this.waving){if(talking&&this.actions.talkc){if(this.current!==this.actions.talkc)this.setState('talkc');}else if(talking&&this.talkSet.length>1){const sw=this.talkOpt.idleSwap||6,want=this.talkSet[Math.floor(this.talkTime/sw)%this.talkSet.length];if(want!==this.wantIdle){this.wantIdle=want;this.setState(want);}}
        else if(!talking){const w=this.actions[this.hold]?this.hold:'idle';if(this.current!==this.actions[w]){this.wantIdle=w;this.setState(w);}}}
      this.poseFix(-1);this.mixer.update(dt);this.poseFix(1);}
  }
  function loadGltf(url){if(!THREE.GLTFLoader||!window.fetch)return Promise.reject(new Error('GLTFLoader 없음'));
    return fetch(url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
      .then(buf=>new Promise((res,rej)=>{const loader=new THREE.GLTFLoader();if(THREE.DRACOLoader){if(!loadGltf.draco){loadGltf.draco=new THREE.DRACOLoader();loadGltf.draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/libs/draco/gltf/');}loader.setDRACOLoader(loadGltf.draco);}const cib=window.createImageBitmap;
        // createImageBitmap을 잠시 숨기면 GLTFLoader가 fetch 대신 <img>로 내장 텍스처를 읽는다(아티팩트에서 blob fetch가 막혔던 문제 회피)
        try{window.createImageBitmap=undefined;loader.parse(buf,'',res,rej);}finally{window.createImageBitmap=cib;}}));}
  function loadGlbHuman(o){if(!THREE.GLTFLoader||!window.fetch)return;
    loadGltf(o.url)
      .then(gltf=>{const g=new GlbChar(gltf,o);g.setName(human.name);g.root.visible=human.root.visible;g.tag.visible=human.tag.visible;g.act=human.act;
        scene.remove(human.root);human=g;scene.add(g.root);g.setScale(hState.scale);g.update(0.001,T,{pos:hState.pos,facing:hState.facing});})
      .catch(e=>{console.warn('[world] 실물 아바타를 불러오지 못해 만화풍 캐릭터를 씁니다:',e);});}
  // 안내 로봇 GLB(설정 guide.model, 엑스리아 월드): 불러오면 코드 캐릭터와 바꿔 끼운다. 실패하면 코드 로봇 그대로
  function loadGlbGuide(o){if(!THREE.GLTFLoader||!window.fetch)return;
    loadGltf(o.url)
      .then(gltf=>{const old=guide,g=new GlbChar(gltf,o);g.setName(old.name);g.tag.visible=old.tag.visible;g.root.visible=old.root.visible;g.act=old.act;
        if(talk.open&&talk.who===old)talk.who=g;scene.remove(old.root);guide=g;scene.add(g.root);g.update(0.001,T,{pos:gState.pos,facing:gState.facing});})
      .catch(e=>{console.warn('[world] 안내 로봇 3D를 불러오지 못해 코드 로봇을 씁니다:',e);});}
  // 플레이어 GLB(설정 player.model, 엑스리아 월드): 만화풍 휴먼쌤. 걷기 동작은 메인 루프에서 hold='walk'
  function loadGlbMe(o){if(!THREE.GLTFLoader||!window.fetch)return;
    loadGltf(o.url)
      .then(gltf=>{const old=me,g=new GlbChar(gltf,o);g.setName(old.name||'');g.tag.visible=old.tag.visible;g.root.visible=old.root.visible;
        scene.remove(old.root);me=g;scene.add(g.root);g.update(0.001,T,{pos:player.pos,facing:player.facing});})
      .catch(e=>{console.warn('[world] 플레이어 3D를 불러오지 못해 만화풍 캐릭터를 씁니다:',e);});}

  /* ---------- entities ---------- */
  const player={pos:STAGE.hub.clone(),vx:0,vz:0,facing:Math.PI,faceT:null,speed:0,path:[],base:2.3};
  let me=new Char(lsGet(KEY+'look',[0,1,0,0,0]));scene.add(me.root);
  const GD=CFG.guide||{},HM=CFG.human||{};
  const NOHOST=!!(CFG.ending&&CFG.ending.noHost);   /* 엔딩에 주인(휴먼쌤·로봇)이 안 나오고 조각이 모이면 문만 열린다(엑스리아 월드, 휴먼쌤 10-30) */
  let guide=new Char(GD.look||[1,5,2,2,1],{bag:false,robot:GD.robot});guide.setName(GD.name||'안내자');guide.tag.visible=true;scene.add(guide.root);
  const gState={pos:STAGE.guide.pos.clone(),facing:STAGE.guide.facing||0};
  let human=new Char(HM.look||[0,0,0,5,2],{bag:false,pants:'#3a3f52',shoe:'#4a3a2a',robot:HM.robot});human.setName(HM.name||'휴먼쌤');human.tag.visible=true;human.root.visible=false;scene.add(human.root);
  const hState={pos:STAGE.human.clone(),facing:0,scale:0};
  if(HM.model&&HM.model.url&&!NOHOST)loadGlbHuman(HM.model);
  const PM=CFG.player||{};if(GD.model&&GD.model.url)loadGlbGuide(GD.model);if(PM.model&&PM.model.url)loadGlbMe(PM.model);
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
  const pieceName=m=>T_(UI.piece||'{label}의 조각',{label:m.label,n:M.indexOf(m)+1});
  const GUIDED=(CFG.missionOrder||'guided')!=='free';
  function checklistUI(){const rows=[{t:UI.rowMeet||'안내자 만나기',d:Q.met}];
    M.forEach((m,i)=>rows.push({t:m.label+(m.collectAll&&!missionDone(i)&&gotList(i).length?` ${gotList(i).length}/${m.choices.length}`:''),d:missionDone(i),c:m.color,n:i+1}));
    if(!NOHOST)rows.push({t:UI.rowHuman||'휴먼쌤 만나기',d:Q.human});rows.push({t:UI.rowDoor||'문 열기',d:Q.entered});
    const cur=rows.findIndex(r=>!r.d),done=rows.filter(r=>r.d).length;$('#clTitle').textContent=UI.checklist||'미션';$('#clCount').textContent=`${done}/${rows.length}`;
    const ol=$('#clList');ol.textContent='';rows.forEach((r,i)=>{const li=document.createElement('li');li.className=(r.d?'done':i===cur?'now':'');
      const b=document.createElement('span');b.className='box';if(r.n)b.textContent=String(r.n);const t=document.createElement('span');t.className='txt';t.textContent=r.t;li.append(b,t);
      if(i===cur&&UI.nowBadge){const g=document.createElement('span');g.className='now-badge';g.textContent=UI.nowBadge;li.appendChild(g);}
      else if(r.c){const c=document.createElement('span');c.className='dotc';c.style.setProperty('--c',r.c);li.appendChild(c);}ol.appendChild(li);});
    STAGE.spots.forEach(s=>{const got=missionDone(s.i);if(s.setDone){s.setDone(got,!GUIDED||remaining()[0]===s.i);return;}s.orb.visible=!got;s.glow.visible=!got;s.light.intensity=got?0.15:0.9;s.padRing.material.emissiveIntensity=got?0.25:1.1;});
    qMark.visible=!Q.met;}
  $('#clHead').onclick=()=>{const cl=$('#checklist');const open=cl.classList.toggle('min');$('#clHead').setAttribute('aria-expanded',String(!open));};

  /* =====================================================================
     TRAVEL — nodes, straight routes that step around the guide
     ===================================================================== */
  const NODES={hub:STAGE.hub,door:STAGE.doorNode,gate:STAGE.gate,meet:STAGE.meet,beyond:STAGE.beyond||new THREE.Vector3(0,0,-10.3)};STAGE.spots.forEach(s=>NODES['s'+s.i]=s.stand);   /* beyond: 문 밖(걸어 나가는 연출 끝 자리) */
  function route(from,to){if(STAGE.route)return STAGE.route(from,to,player.pos,NODES);const A=NODES[from]||player.pos,B=NODES[to];const G=gState.pos;const path=[];
    if(distSeg(G.x,G.z,A,B)<1.25&&Math.hypot(B.x-G.x,B.z-G.z)>1.0&&Math.hypot(A.x-G.x,A.z-G.z)>1.0){const vx=B.x-A.x,vz=B.z-A.z,l=Math.hypot(vx,vz)||1;const nx=-vz/l,nz=vx/l;
      const side=((G.x-A.x)*nx+(G.z-A.z)*nz)>=0?-1:1;path.push({x:G.x+nx*side*1.7,z:G.z+nz*side*1.7});}
    path.push({x:B.x,z:B.z});return path;}
  const J={node:'hub',dest:null,traveling:false,onArrive:null,stuck:0,busy:false,label:'',staying:false};let walkTo=null;
  function placeName(id){if(id==='hub')return(UI.where&&UI.where.hub)||'안내자 곁';if(id==='door'||id==='meet'||id==='gate')return(UI.where&&UI.where.door)||'문 앞';if(id==='beyond')return(UI.where&&UI.where.beyond)||'문 너머';
    if(id&&id[0]==='s'){const m=M[+id.slice(1)];return m?pieceName(m):'';}return T_(CFG.title);}
  function hideChoices(){$('#journey').hidden=true;}
  function setChoices(where,list,say){$('#jWhere').textContent=where;const js=$('#jSay');js.hidden=!(say&&say.text);if(say&&say.text){$('#jSayWho').textContent=say.who||'';$('#jSayText').textContent=say.text;}$('#journey').classList.toggle('q',!!say);const box=$('#jBtns');box.textContent='';
    list.forEach((c,i)=>{const b=document.createElement('button');b.className='jb'+(c.hot?' hot':'')+(c.minor?' minor':'');b.id='jc-'+i;
      const t=document.createElement('span');t.className='t';t.textContent=c.label;b.appendChild(t);
      if(c.sub){const s=document.createElement('span');s.className='s';s.textContent=c.sub;b.appendChild(s);}
      if(c.hot&&list.length===1){const a=document.createElement('span');a.className='ar';a.textContent='→';b.appendChild(a);}
      b.onclick=()=>{SND('sfx','select');c.fn();};box.appendChild(b);});
    const j=$('#journey');j.classList.remove('travel');j.classList.toggle('single',list.length===1);j.hidden=false;}
  function showTravel(){$('#jSay').hidden=true;$('#journey').classList.remove('q');$('#jWhere').textContent=(UI.arriving||'걸어가는 중')+' · '+J.label;const box=$('#jBtns');box.textContent='';
    const b=document.createElement('button');b.className='jb minor';b.id='jc-0';b.textContent=UI.arriveNow||'바로 도착하기';b.onclick=skipTravel;box.appendChild(b);
    const j=$('#journey');j.classList.add('travel');j.hidden=false;}
  function travel(id,cb,label){hideChoices();clearShot();player.faceT=null;J.staying=false;
    if(J.node===id&&!J.traveling){if(cb)cb();else refreshChoices();return;}
    player.path=route(J.node,id);walkTo=null;J.dest=id;J.traveling=true;J.onArrive=cb||null;J.stuck=0;J.label=label||placeName(id);showTravel();}
  function arrive(){J.traveling=false;J.node=J.dest;player.path=[];walkTo=null;hideChoices();const cb=J.onArrive;J.onArrive=null;if(cb)cb();else refreshChoices();}
  function skipTravel(){if(!J.traveling)return;const n=NODES[J.dest];player.pos.set(n.x,0,n.z);player.vx=player.vz=0;DIR.init=false;GF.snap=true;arrive();}
  function faceTo(x,z){player.faceT=Math.atan2(x-player.pos.x,z-player.pos.z);}
  function updatePlayer(dt){const P=player.pos;if(FREE.on&&!J.traveling){freeMove(dt);return;}
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
  let camYaw=0,camPitch=0.3,camDist=4.8,camDistT=4.8,camLift=0;   // camLift: 바라보는 점을 올려 캐릭터를 화면 아래쪽에 둔다(생김새 고르기 창)
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
  canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;canvas.classList.remove('dragging');if(!moved){if(FREE.on&&!cardOpen&&!J.traveling)freeTap(e.clientX,e.clientY);else tap();}});
  canvas.addEventListener('pointercancel',()=>{drag=null;canvas.classList.remove('dragging');});
  canvas.addEventListener('wheel',e=>{e.preventDefault();camDistT=clamp(camDistT+Math.sign(e.deltaY)*0.5,2.6,9);},{passive:false});
  function updateCamera(dt){camDist+=(camDistT-camDist)*Math.min(1,dt*8);DIR.manual-=dt;const P=player.pos;camTarget.set(P.x,P.y+1.35+camLift,P.z);let rate=3.2;
    if(DIR.shot){DIR.t+=dt;const s=DIR.shot,k=Math.min(1,DIR.t/s.dur);s.fn(k,dPos,dLook);rate=3.6;if(DIR.t>=s.dur&&s.onEnd){const f=s.onEnd;s.onEnd=null;f();}}
    else if(talk.open){const it=talk.lines[talk.i],vw=it&&it.view&&STAGE.views&&STAGE.views[it.view];if(vw){dPos.copy(vw.pos);dLook.copy(vw.look);fitBack(dPos,dLook,vw.ref||1.5);rate=2.4;}else shotTalk(talk.npc)(0,dPos,dLook);}   /* 대사 줄 view:'board' = 칠판을 비춘다 */
    // 걸으면 카메라가 등 뒤로 돈다. 광장에서 직접 걸을 때는 앞쪽(±63°)으로 걸을 때만(옆·뒤로 밀 때 돌면 빙빙 돈다)
    else{if(DIR.manual<=0&&player.speed>0.3){let d=(player.facing+Math.PI)-camYaw;d=Math.atan2(Math.sin(d),Math.cos(d));
        if((!PZ.active&&!FREE.on)||PZ.follow||Math.abs(d)<1.1){camYaw+=d*Math.min(1,dt*1.6);camPitch+=(0.3-camPitch)*Math.min(1,dt*1.5);}}
      const cp=Math.cos(camPitch);dPos.set(camTarget.x+Math.sin(camYaw)*cp*camDist,camTarget.y+Math.sin(camPitch)*camDist,camTarget.z+Math.cos(camYaw)*cp*camDist);dLook.copy(camTarget);}
    if(dPos.y<0.35)dPos.y=0.35;if(STAGE.clampCam)STAGE.clampCam(dPos);
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
  function talkShow(){const it=talk.lines[talk.i]||{text:''};$('#talkText').textContent=it.text;showTalkCard(it.card||null);const box=$('#talkBtns');box.textContent='';const last=talk.i>=talk.lines.length-1;
    const mk=(label,primary)=>{const b=document.createElement('button');b.className='jb'+(primary?' hot':'');b.textContent=label;b.onclick=()=>{SND('sfx','click');if(last)closeTalk();else{talk.i++;talkShow();}};box.appendChild(b);};
    if(it.choices&&it.choices.length)it.choices.forEach((c,k)=>mk(T_(c.label),k===0));else mk(last?talk.last:(UI.talkNext||'다음'),true);document.documentElement.style.setProperty('--talkH',($('#talk').offsetHeight||90)+'px');}
  function closeTalk(){if(!talk.open)return;talk.open=false;showTalkCard(null);$('#talk').hidden=true;document.body.classList.remove('talking');if(talk.who)talk.who.act=null;const f=talk.onDone;talk.onDone=null;if(f)f();else refreshChoices();}
  function talkGuide(){travel('hub',()=>{faceTo(gState.pos.x,gState.pos.z);const lines=!Q.met?(GD.greeting||['안녕하세요.']):Q.human?(GD.afterMeet||GD.help||[]):remaining().length===0?(GD.afterAll||GD.help||[]):(GD.help||[]);
    const first=!Q.met;openTalk(guide,lines,()=>{if(first){Q.met=true;qSave();checklistUI();if(GD.autoGo&&GUIDED&&remaining().length){goMission(remaining()[0]);return;}}refreshChoices();},first?(UI.greetLast||'출발'):undefined);},GD.name);}

  /* =====================================================================
     MISSIONS — go → arrive (crane) → one choice → collect + card
     ===================================================================== */
  let cardOpen=false;
  function goMission(i){travel('s'+i,()=>arriveMission(i),pieceName(M[i]));}
  function arriveMission(i){const s=STAGE.spots[i],f=s.face||s.pos;faceTo(f.x,f.z);J.busy=true;if(M[i].arrive&&!missionDone(i)&&!gotList(i).length&&!GD.sayArrive)toast(T_(M[i].arrive));
    shot(s.arriveShot?s.arriveShot():shotArrive(s),2.6,()=>{J.busy=false;refreshChoices();},true);}   /* 도착 연출 2.6초(11-01 "2~3분 정도에") */
  function answerMission(i,ci){const m=M[i],s=STAGE.spots[i];J.busy=true;hideChoices();{const f=s.face||s.pos;faceTo(f.x,f.z);}
    shot(s.collectShot?s.collectShot():shotCollect(s),1.6,()=>{const o=s.orb.getWorldPosition(new THREE.Vector3());burst(o,m.color||'#fff',missionDone(i)?60:140,5,1.4);s.orb.scale.setScalar(1);s.glow.scale.setScalar(s.glowScale||1.7);
      const g=gotList(i);if(!g.includes(ci))g.push(ci);qSave();checklistUI();showCard(i,ci);});}
  // 그림틀 아이콘(24x24 선 그림, 월드 1 프로필 판). 카드 viz의 icon 이름으로 쓴다
  const ICON={
    class:'<rect x="3" y="4" width="18" height="11.5" rx="1.5"/><path d="M7 8.5h6M7 11.5h9M8 20l1.5-4.5M16 20l-1.5-4.5"/>',
    org:'<circle cx="12" cy="8" r="3"/><circle cx="5.2" cy="10.2" r="2.2"/><circle cx="18.8" cy="10.2" r="2.2"/><path d="M7 20c.4-3.4 2.4-5.4 5-5.4s4.6 2 5 5.4M1.8 18.6c.3-2.3 1.5-3.7 3.4-4M22.2 18.6c-.3-2.3-1.5-3.7-3.4-4"/>',
    home:'<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M12 17.5s-3-1.8-3-3.6a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.8-3 3.6-3 3.6z"/>',
    book:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    screen:'<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M10.2 8.3v5.4l4.6-2.7z"/>',
    play:'<path d="M9 7v10l8-5z"/>',
    ticket:'<path d="M3 6.5h18v3.5a2 2 0 0 0 0 4v3.5H3V14a2 2 0 0 0 0-4z"/><path d="M15 7v10" stroke-dasharray="1.6 2"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
    vr:'<path d="M3 9.5A2.5 2.5 0 0 1 5.5 7h13A2.5 2.5 0 0 1 21 9.5v5a2.5 2.5 0 0 1-2.5 2.5H15l-2-2.5h-2L9 17H5.5A2.5 2.5 0 0 1 3 14.5z"/>',
    ask:'<path d="M4 5h16v11H10l-4.5 3.5V16H4z"/><path d="M10 8.8a2 2 0 1 1 2.9 1.8c-.6.3-.9.8-.9 1.4M12 13.6v.1"/>',
    check:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4 20.5 20.5M7.8 10.6l1.9 1.9 3.4-3.6"/>',
    try:'<path d="M4 12h12M12 6l6 6-6 6"/>',
    bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
    dot:'<circle cx="12" cy="12" r="4"/>'};
  const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  function icon(n){const s=document.createElement('span');s.className='ico';s.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICON[n]||ICON.dot)+'</svg>';return s;}
  // 순환도(휴먼쌤 ACT 세 걸음): 원 위에 단계 셋 + 화살표, 가운데 글
  function cycleSvg(c,ex){const st=c.steps||[],n=st.length||3,R=86,cx=180,cy=142;let s='<svg viewBox="0 0 360 262" role="img" aria-label="'+escH(T_(c.center||'',ex))+'"><defs><marker id="vzArr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>';
    for(let k=0;k<n;k++){const a0=(-90+k*360/n+26)*Math.PI/180,a1=(-90+(k+1)*360/n-26)*Math.PI/180;s+='<path class="arc" marker-end="url(#vzArr)" d="M'+(cx+Math.cos(a0)*R).toFixed(1)+' '+(cy+Math.sin(a0)*R).toFixed(1)+'A'+R+' '+R+' 0 0 1 '+(cx+Math.cos(a1)*R).toFixed(1)+' '+(cy+Math.sin(a1)*R).toFixed(1)+'"/>';}
    s+='<text class="ctr" x="'+cx+'" y="'+(cy+7)+'">'+escH(T_(c.center||'',ex))+'</text>';
    st.forEach((it,k)=>{const a=(-90+k*360/n)*Math.PI/180,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;s+='<circle class="nd" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="29"/><g class="ni" transform="translate('+(x-14).toFixed(1)+' '+(y-14).toFixed(1)+') scale(1.1667)">'+(ICON[it.icon]||'')+'</g>';
      const ly=k===0?y-39:y+50;s+='<text class="lb" x="'+x.toFixed(1)+'" y="'+ly.toFixed(1)+'">'+escH(T_(it.t||'',ex))+'<tspan class="en" dx="5">'+escH(T_(it.e||'',ex))+'</tspan></text>';});
    const d=document.createElement('div');d.className='vz-cyc';d.innerHTML=s+'</svg>';return d;}
  // 그림틀(viz): 한 덩이 또는 덩이 목록. 덩이 = label · quote{text,by,small,banner} · timeline[{t,s}] · stats · grid · steps · books[{title,pub,year,color}] · note
  //   roles(true = 그 조각 선택지의 icon·label·tag로 아이콘 칸. 모은 것은 채우고 지금 고른 것은 강조) · big{t,s}(큰 글) · screens[{t,s}](연수 화면) · tickets[{icon,t,s}](행사 표) · cycle{center,steps[{icon,t,e}]}(순환도)
  //   ex = 글 바꿀 값 + m(조각) · ci(지금 고른 것) · got(모은 것)
  function renderViz(vz,viz,ex){vz.textContent='';vz.hidden=!viz;if(!viz)return;const many=Array.isArray(viz);ex=ex||{};
    const el=(tag,cls,txt,parent)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=T_(String(txt),ex);(parent||vz).appendChild(e);return e;};
    (many?viz:[viz]).forEach(b=>{const box=many?el('div','vz-b'):vz;
      if(b.label)el('div','vz-lb',b.label,box);
      if(b.roles){const m=ex.m,got=ex.got||[],items=b.roles===true&&m?m.choices.map(c=>({icon:c.icon,t:c.label,s:c.tag})):(Array.isArray(b.roles)?b.roles:[]);
        const w=el('div','vz-roles',null,box);items.forEach((it,k)=>{const has=got.includes(k)||!m;const r=el('div','r'+(has?' got':'')+(ex.ci===k?' on':''),null,w);r.appendChild(icon(it.icon));el('b',null,it.t,r);el('small',null,has&&it.s?it.s:'?',r);});}
      if(b.big){const g=el('div','vz-big',null,box);el('b',null,b.big.t,g);if(b.big.s)el('span',null,b.big.s,g);}
      // roleRows: 모습(역할)마다 한 줄 판 — 색 동그라미 아이콘 · 작은 이름 · 큰 글 · 한 줄 · 칩(11-01 "한 번에 나오게")
      if(b.roleRows){const w=el('div','vz-rr',null,box);b.roleRows.forEach(it=>{const r=el('div','rw',null,w);el('div','ic',null,r).appendChild(icon(it.icon));const tx=el('div','tx',null,r);
        if(it.t)el('i',null,it.t,tx);if(it.big)el('b',null,it.big,tx);if(it.s)el('span',null,it.s,tx);if(it.chips&&it.chips.length){const ch=el('div','ch',null,tx);it.chips.forEach(c=>el('em',null,c,ch));}});}
      if(b.screens){const w=el('div','vz-screens',null,box);b.screens.forEach(it=>{const d=el('div','sc',null,w);el('div','scr',null,d).appendChild(icon('play'));el('b',null,it.t,d);if(it.s)el('small',null,it.s,d);});}
      if(b.tickets){const w=el('div','vz-tickets',null,box);b.tickets.forEach(it=>{const d=el('div','tk',null,w);el('div','ic',null,d).appendChild(icon(it.icon||'ticket'));const tx=el('div','tx',null,d);el('b',null,it.t,tx);if(it.s)el('small',null,it.s,tx);});}
      if(b.cycle)box.appendChild(cycleSvg(b.cycle,ex));
      if(b.quote){const q=el('div','vz-quote'+(b.quote.small?' sm':'')+(b.quote.banner?' banner':''),b.quote.text,box);if(b.quote.by)el('small',null,b.quote.by,q);}
      if(b.timeline){const w=el('div','vz-tl',null,box);b.timeline.forEach(it=>{const d=el('div','it',null,w);if(it.t)el('div','t',it.t,d);el('div','s',it.s,d);});}
      if(b.stats){const w=el('div','vz-stats',null,box);b.stats.forEach(it=>{const d=el('div','it',null,w);el('div','n',it.n,d);el('div','s',it.s,d);});}
      if(b.grid){const w=el('div','vz-grid',null,box);b.grid.forEach(it=>el('span','it',it,w));}
      if(b.steps){const w=el('div','vz-steps',null,box);b.steps.forEach((it,k)=>{if(k)el('span','ar','→',w);el('span','it',it,w);});}
      if(b.books){const w=el('div','vz-books',null,box);b.books.forEach(it=>{const d=el('div','bk',null,w);if(it.color)d.style.setProperty('--b',it.color);el('b','bt',it.title,d);el('span','bp',[it.pub,it.year].filter(Boolean).join(' · '),d);});}
      if(b.note)el('div','vz-note',b.note,box);});}
  // 카드 모양: '' = 조각 카드(간직하기), 'talk' = 대화 중 위에 뜨는 카드(칠판 명함), 'pager' = 조각 넘겨 보기
  function cardMode(m){const el=$('#card');el.classList.toggle('withtalk',m==='talk');el.classList.toggle('pager',m==='pager');$('#cardClose').hidden=!!m;$('#cardNav').hidden=m!=='pager';$('#cardReply').hidden=false;}
  function showTalkCard(c){const el=$('#card');document.body.classList.toggle('talkcard',!!c);if(!c){if(el.classList.contains('withtalk')){el.hidden=true;cardMode('');}return;}
    cardMode('talk');el.style.setProperty('--c',c.color||'#ffcf5a');$('#cardEyebrow').textContent=T_(c.eyebrow||'');$('#cardTitle').textContent=T_(c.title||'');
    $('#cardReply').hidden=true;renderViz($('#cardViz'),c.viz||null,{});const tx=T_(c.text||'');$('#cardText').textContent=tx;$('#cardText').hidden=!tx;$('#cardMore').hidden=true;$('#cardPending').hidden=true;$('#cardSrc').textContent='';
    el.hidden=false;SND('sfx','card');}
  function showCard(i,ci){const m=M[i],c=m.choices[ci]||{},f=m.fact||{};cardOpen=true;document.body.classList.add('talking');hideChoices();cardMode('');$('#cardReply').dataset.who=T_(GD.name||'');
    const done=missionDone(i),chosen=T_(c.fact||c.label||''),chosenTitle=T_(c.title||f.title||m.title),others=m.collectAll?'':m.choices.filter((x,k)=>k!==ci).map(x=>T_(x.fact||x.label)).join(', ');
    const ex={chosen,chosenTitle,others,label:m.label,m,ci:m.collectAll?ci:-1,got:gotList(i).slice()};$('#card').style.setProperty('--c',m.color||'#fff');
    $('#cardEyebrow').textContent=pieceName(m)+(m.collectAll?` · ${gotList(i).length}/${m.choices.length}`:'');$('#cardTitle').textContent=T_(f.title||m.title,ex);
    const reply=T_(c.reply||'',ex);$('#cardReply').textContent=reply;$('#cardReply').hidden=!reply;
    // 줄글 대신 그림처럼(엑스리아 월드, 휴먼쌤 10-30 "줄글말고 다른방식없어?"): 선택지 c.viz 또는 조각 f.viz — quote(큰 글귀)·timeline(연표)·stats(큰 숫자 타일)·grid(칩)·steps(단계 화살표)
    const viz=c.viz||f.viz||null;renderViz($('#cardViz'),viz,ex);
    {const tx=T_(c.text||f.text||'',ex);$('#cardText').textContent=tx;$('#cardText').hidden=!tx;}const more=f.more&&others?T_(f.more,ex):(done&&m.complete?T_(m.complete,ex):'');$('#cardMore').textContent=more;$('#cardMore').hidden=!more;
    const pend=(!reply&&f.pending)?T_(f.pending,ex):'';$('#cardPending').textContent=pend;$('#cardPending').hidden=!pend;
    $('#cardSrc').textContent=f.source?T_(f.source,ex):'';$('#cardClose').textContent=done?(UI.cardClose||'간직하기'):(UI.cardCloseMore||UI.cardClose||'다음');$('#card').hidden=false;
    SND('sfx','card');setTimeout(()=>SND('sfx',done?'complete':'piece'),220);}
  $('#cardClose').onclick=()=>{SND('sfx','click');cardOpen=false;$('#card').hidden=true;document.body.classList.remove('talking');J.busy=false;clearShot();refreshChoices();};
  function lookAround(){const n=NODES[J.node]||player.pos;J.busy=true;hideChoices();toast(UI.lookHint||'화면을 누르면 둘러보기를 마쳐요.');shot(shotOrbit(n,9,5.5),8,()=>{J.busy=false;clearShot();refreshChoices();},true);}
  function stay(){J.staying=true;hideChoices();toast(UI.stayHint||'화면을 누르면 선택지가 다시 나와요.');}
  function restartAll(quiet){if(PZ.active)exitPlaza();exitFree();SND('music','day');hideProfile();cardMode('');$('#card').hidden=true;cardOpen=false;gState.pos.copy(STAGE.guide.pos);gState.facing=STAGE.guide.facing||0;GF.trail.length=0;GF.last=null;GF.side=null;hState.walk=0;STAGE.door.target=null;Q.met=false;Q.got=sanitizeGot({});Q.human=false;Q.entered=false;qSave();STAGE.door.open(0);human.root.visible=false;hState.scale=0;checklistUI();
    player.pos.copy(STAGE.hub);player.vx=player.vz=0;player.facing=Math.PI;J.node='hub';J.traveling=false;player.path=[];walkTo=null;DIR.init=false;camYaw=0;if(!quiet)toast('처음부터 다시 시작해요.');refreshChoices();}
  function showPlaces(){const L=[{label:placeName('hub'),fn:()=>travel('hub',()=>{faceTo(gState.pos.x,gState.pos.z);refreshChoices();})}];
    M.forEach((m,i)=>L.push({label:pieceName(m),sub:missionDone(i)?'완성':m.title,fn:()=>goMission(i)}));
    if(remaining().length===0)L.push({label:placeName('door'),fn:()=>travel('door',()=>{faceTo(STAGE.door.pos.x,STAGE.door.pos.z);refreshChoices();})});
    L.push({label:UI.back||'돌아가기',fn:refreshChoices,minor:true});setChoices('어디로 갈까요?',L);}
  function refreshChoices(){if(PZ.active){plazaChoices();return;}if(FREE.on){if(!(cine.active||talk.open||cardOpen))freeChoices(true);return;}if(cine.active||talk.open||cardOpen||J.traveling||J.busy||intro.active||J.staying)return;
    const n=J.node,rem=remaining(),L=[],E=CFG.ending||{};
    const toHub=()=>travel('hub',()=>{faceTo(gState.pos.x,gState.pos.z);refreshChoices();});
    const meetBtn=()=>({label:UI.meetHuman||'휴먼쌤 만나러 가기',sub:UI.meetHumanSub||'',fn:()=>travel('meet',()=>startEnding(false),placeName('door')),hot:true});
    const enterBtn=()=>({label:T_(E.enterLabel||'문으로 들어가기'),sub:T_(E.doorTitle||''),fn:enterDoor,hot:true});
    const missionBtn=(i,hot)=>({label:pieceName(M[i]),sub:M[i].title||'',fn:()=>goMission(i),hot:hot!==false});
    // 조각 자리에 있고 아직 완성 전이면: 남은 선택지만(collectAll은 고른 것을 빼고 다시)
    if(n[0]==='s'){const i=+n.slice(1),m=M[i];
      if(!missionDone(i)){const g=gotList(i);m.choices.forEach((c,ci)=>{if(g.includes(ci))return;L.push({label:T_(c.label),fn:()=>answerMission(i,ci),hot:true});});
        if(!GUIDED)L.push({label:UI.elsewhere||'다른 곳으로…',fn:showPlaces,minor:true});setChoices(T_(g.length&&m.moreQuestion?m.moreQuestion:(m.question||m.title)),L,{who:guide.name,text:(GD.sayArrive&&!g.length&&m.arrive)?T_(m.arrive):''});return;}}
    // 순서 유도 모드: 어디서든 다음 할 일 버튼 하나만
    if(GUIDED){let b;
      if(!Q.met)b={label:UI.meetGuide||'안내자와 이야기하기',fn:talkGuide,hot:true};
      else if(rem.length)b=missionBtn(rem[0]);
      else if(!Q.human)b=(n==='door'||n==='meet')?{label:UI.meetHuman||'휴먼쌤 만나기',fn:()=>startEnding(false),hot:true}:meetBtn();
      else b=enterBtn();
      setChoices(placeName(n),(Q.human&&PROF)?[b,{label:T_(PROF.again||'프로필 카드 다시 보기'),fn:()=>showProfile('full'),minor:true}]:[b],(GD.sayArrive&&Q.met&&!rem.length&&!Q.human&&GD.afterAll)?{who:guide.name,text:T_(GD.afterAll[0])}:null);return;}
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
  const END=CFG.ending||{},PK=END.pickWorld||null,PH={GATHER:0,APPEAR:1,TALK:2,DOOR:3,DONE:4};   /* PK: 문 너머 '누구의 월드로 들어갈까요?' 고르기 설정(엑스리아 월드) */
  const cine={active:false,phase:0,pt:0,li:0,ci:0,full:'',cut:true,replay:false,orbs:[],doorK:0,lines:[]};
  const cPos=new THREE.Vector3(),cLook=new THREE.Vector3();
  function letterbox(){const h=innerHeight,w=innerWidth;const bar=Math.max(6,Math.min(h*0.09,(h-w/2.39)/2));document.documentElement.style.setProperty('--bar',bar.toFixed(1)+'px');}
  function cineTitle(t){const el=$('#cineTitle');el.textContent=t||'';el.classList.toggle('on',!!t);}
  function setSub(who,text){$('#cineWho').textContent=who;$('#cineText').textContent=text;$('#cineSubs').classList.toggle('show',!!(who||text));}
  function startEnding(replay){if(cine.active)return;exitFree();if(talk.open)closeTalk();if(cardOpen){$('#card').hidden=true;cardOpen=false;}
    hideChoices();clearShot();$('#toast').classList.remove('show');J.busy=true;J.traveling=false;player.path=[];walkTo=null;
    Object.assign(cine,{active:true,phase:replay?(NOHOST?PH.DOOR:PH.APPEAR):PH.GATHER,pt:0,li:0,ci:0,full:'',cut:true,replay:!!replay,orbs:[],doorK:0,appearSnd:false,walk:null,lines:NOHOST?[]:(END.lines||['안녕하세요.']).map(l=>T_(l))});
    if(NOHOST&&replay){SND('sfx','door');}
    SND('music','ending');if(!replay)SND('sfx','gather');
    letterbox();document.body.classList.add('cine','talking');$('#cine').hidden=false;setSub('','');$('#cineNext').hidden=true;$('#cineSkip').textContent=UI.skip||'건너뛰기';$('#cineNext').textContent=UI.tapNext||'눌러서 계속';$('#cineFade').classList.remove('on');
    player.pos.copy(STAGE.meet);player.vx=player.vz=0;player.faceT=null;player.facing=STAGE.humanWalk?Math.atan2(STAGE.human.x-STAGE.meet.x,STAGE.human.z-STAGE.meet.z):Math.PI;J.node='meet';if(STAGE.guideSpots&&STAGE.guideSpots.meet){gState.pos.copy(STAGE.guideSpots.meet);GF.trail.length=0;GF.last=null;GF.side=null;}hState.walk=0;
    hState.pos.copy(STAGE.human);hState.facing=Math.atan2(player.pos.x-hState.pos.x,player.pos.z-hState.pos.z);human.root.visible=false;hState.scale=0;human.act=null;STAGE.door.open(0);
    if(replay){cineTitle(NOHOST?T_(END.doorTitle||''):'');}else{cineTitle(T_(END.gatherTitle||''));
      cine.orbs=STAGE.spots.map(s=>{const o=new THREE.Mesh(new THREE.SphereGeometry(0.22,24,18),new THREE.MeshStandardMaterial({color:s.col,emissive:s.col,emissiveIntensity:2,roughness:.3}));if(s.orbPos)o.position.copy(s.orbPos);else o.position.copy(s.pos).setY(1.65);
        const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:s.col,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));gl.scale.setScalar(1.4);o.add(gl);scene.add(o);return{o,from:o.position.clone(),col:s.col};});}}
  function nextPhase(){cine.phase++;cine.pt=0;cine.cut=true;}
  function cineShowLine(){cine.full=cine.lines[cine.li]||'';cine.ci=0;cine.hold=0;cine.t0=performance.now();setSub(human.name,'');$('#cineNext').hidden=true;human.act='talk';cine.cut=true;}
  function cineAdvance(){if(!cine.active)return;const p=cine.phase;
    if(p===PH.TALK){if(cine.ci<cine.full.length){cine.ci=cine.full.length;setSub(human.name,cine.full);human.act=null;$('#cineNext').hidden=false;return;}
      cine.li++;if(cine.li>=cine.lines.length){$('#cineNext').hidden=true;talkDone();}else cineShowLine();return;}
    if(cine.pt>0.6)cine.pt+=99;}
  // 말이 끝나면: 프로필 카드(설정 profile)가 있으면 연출을 마치고 카드를 띄운다(문은 '문으로 가기'를 누를 때 열린다). 없으면 예전처럼 문이 열린다
  function talkDone(){setSub('','');if(PROF){finishEnding();showProfile('full');return;}human.act='open';nextPhase();SND('sfx','door');cineTitle(T_(END.doorTitle||''));}
  // 교실 무대: 휴먼쌤이 앞문으로 걸어 들어와 교탁 옆에 선다(STAGE.humanWalk 점들, 빠르기 END.humanSpeed). 들어오는 동안 리니 한마디(END.guideLine)
  function appearWalk(dt,pt){const W=STAGE.humanWalk,Hp=hState.pos;
    if(!cine.walk){cine.walk={i:1,done:false,t:0};Hp.copy(W[0]);hState.facing=Math.atan2(W[1].x-W[0].x,W[1].z-W[0].z);human.root.visible=true;hState.scale=1;human.act=null;cineTitle('');SND('sfx','door');
      if(END.guideLine){setSub(guide.name,T_(END.guideLine));guide.act='talk';}}
    const w=cine.walk;hState.walk=0;
    if(!w.done){const t=W[w.i],dx=t.x-Hp.x,dz=t.z-Hp.z,d=Math.hypot(dx,dz),v=END.humanSpeed||1.3;
      if(d<0.05){w.i++;if(w.i>=W.length){w.done=true;w.t=pt;}}
      else{const st=Math.min(d,v*dt);Hp.x+=dx/d*st;Hp.z+=dz/d*st;hState.walk=v;const want=Math.atan2(dx,dz);let df=want-hState.facing;df=Math.atan2(Math.sin(df),Math.cos(df));hState.facing+=df*Math.min(1,dt*7);}}
    if(pt>3.4&&guide.act==='talk'){guide.act=null;setSub('','');}
    STAGE.cine.appear(Hp,player.pos,cPos,cLook);
    if(w.done&&pt-w.t>0.7){guide.act=null;setSub('','');cine.walk=null;cineTitle('');human.emote('wave');nextPhase();cineShowLine();}}
  function finishEnding(){/* 엔딩 뒤에도 엔딩 곡을 이어 튼다(휴먼쌤 10-30: 조각 다 모은 뒤부터는 5번 곡) */cine.orbs.forEach(x=>scene.remove(x.o));cine.orbs=[];hState.scale=NOHOST?0:1;human.root.visible=!NOHOST;human.act=null;guide.act=null;cine.walk=null;hState.walk=0;if(!PROF){STAGE.door.open(1);cine.doorK=1;}
    hState.pos.copy(STAGE.humanWalk?STAGE.human:new THREE.Vector3(2.1,0,-6.0));hState.facing=Math.atan2(player.pos.x-hState.pos.x,player.pos.z-hState.pos.z);
    Q.human=true;qSave();checklistUI();cine.active=false;document.body.classList.remove('cine','talking');$('#cine').hidden=true;cineTitle('');setSub('','');J.busy=false;J.node='meet';DIR.init=false;camYaw=0;camPitch=0.3;refreshChoices();}
  $('#cine').addEventListener('pointerdown',e=>{if(e.target.closest('#cineSkip,#arrGo'))return;e.preventDefault();if(END.autoAdvance===false)cineAdvance();});
  $('#cineSkip').onclick=()=>{if(cine.active){finishEnding();if(PROF)showProfile('full');}};
  function updateEnding(dt){cine.pt+=dt;const pt=cine.pt;let rate=4;const Hp=hState.pos,P=player.pos;
    switch(cine.phase){
      case PH.GATHER:{const k=Math.min(1,pt/3.4),e=ez(k);const tgt=new THREE.Vector3(Hp.x,2.4,Hp.z);
        cine.orbs.forEach((x,i)=>{const f=x.from;const a=Math.min(1,Math.max(0,(k-i*0.08)/0.8));const ee=ez(a);x.o.position.set(lerp(f.x,tgt.x,ee),lerp(f.y,tgt.y+Math.sin(a*Math.PI)*2.2,ee),lerp(f.z,tgt.z,ee));x.o.scale.setScalar(1+Math.sin(T*6+i)*0.08);});
        if(STAGE.cine)STAGE.cine.gather(e,cPos,cLook,Hp);else{const a=0.9-e*0.9;cPos.set(Math.sin(a)*12,8.5-e*5,Math.cos(a)*12-2);cLook.set(0,1.6-e*0.4,lerp(0,Hp.z,e));}rate=2.6;
        if(k>=1){cine.orbs.forEach(x=>{burst(x.o.position,x.col,80,5,1.3);scene.remove(x.o);});cine.orbs=[];burst(new THREE.Vector3(Hp.x,1.4,Hp.z),'#fff6dc',160,5,1.6);
          if(NOHOST){SND('sfx','door');cineTitle(T_(END.doorTitle||''));cine.phase=PH.DOOR;cine.pt=0;cine.cut=true;}   /* 주인 없이: 조각이 모이면 바로 문이 열린다 */
          else{SND('sfx','appear');cineTitle(T_(END.appearTitle||''));nextPhase();}}break;}
      case PH.APPEAR:{if(STAGE.humanWalk){appearWalk(dt,pt);rate=2.6;break;}const k=Math.min(1,pt/2.2);human.root.visible=true;hState.scale=ez(k);if(cine.pt<0.05&&cine.replay&&!cine.appearSnd){cine.appearSnd=true;burst(new THREE.Vector3(Hp.x,1.4,Hp.z),'#fff6dc',160,5,1.6);SND('sfx','appear');}
        {const f=hState.facing;cPos.set(Hp.x+Math.sin(f)*2.4+Math.cos(f)*1.5,1.4-k*0.1,Hp.z+Math.cos(f)*2.4-Math.sin(f)*1.5);cLook.set(Hp.x,1.2,Hp.z);rate=3.2;}
        if(k>=1){cineTitle('');human.emote('wave');nextPhase();cineShowLine();}break;}
      case PH.TALK:{const auto=END.autoAdvance!==false,len=cine.full.length;
        // 실제 시계(performance.now) 기준: 느린 기기에서 프레임이 떨어져도 글자 속도와 머무는 시간이 같다
        const el=(performance.now()-(cine.t0||performance.now()))/1000,typeSec=len/16,holdSec=(END.lineHold||1.1)+len*0.05;
        if(cine.ci<len){cine.ci=Math.min(len,el*16);setSub(human.name,cine.full.slice(0,Math.floor(cine.ci)));
          if(cine.ci>=len){human.act=null;if(!auto)$('#cineNext').hidden=false;}}
        else if(auto&&el>=typeSec+holdSec){cine.li++;if(cine.li>=cine.lines.length){talkDone();if(!cine.active)return;}else cineShowLine();}
        // 옆에서 두 사람을 함께 찍는다. 세로 화면에서는 방문자 어깨 뒤쪽으로 돌아(두 사람이 화면 가로로 덜 벌어짐) 뒤로 물린다
        const mx=(P.x+Hp.x)/2,mz=(P.z+Hp.z)/2,dx=Hp.x-P.x,dz=Hp.z-P.z,l=Math.hypot(dx,dz)||1,th=0.85*clamp((1.3-camera.aspect)/0.8,0,1);
        const vx=(-dz/l)*Math.cos(th)-(dx/l)*Math.sin(th),vz=(dx/l)*Math.cos(th)-(dz/l)*Math.sin(th);
        cPos.set(mx+vx*3.4,1.5,mz+vz*3.4);cLook.set(mx,1.2,mz);fitBack(cPos,cLook,1.3);cPos.y=Math.min(cPos.y,2.4);if(STAGE.clampCam)STAGE.clampCam(cPos);rate=2.2;break;}
      case PH.DOOR:{const k=Math.min(1,pt/3.2);cine.doorK=ez(k);STAGE.door.open(cine.doorK);const D=STAGE.door.pos;
        cPos.set(P.x+3.2-k*0.8,2.2,P.z+3.0);cLook.set(D.x,1.9,D.z);rate=2.4;if(k>=0.5&&!cine.doorBurst){cine.doorBurst=true;burst(new THREE.Vector3(D.x,2,D.z+0.3),'#ffe9c0',120,4,1.5);}
        if(k>=1&&pt>4.2){cine.doorBurst=false;finishEnding();return;}break;}}
    if(cine.cut){DIR.pos.copy(cPos);DIR.look.copy(cLook);cine.cut=false;}
    DIR.pos.lerp(cPos,1-Math.exp(-dt*rate));DIR.look.lerp(cLook,1-Math.exp(-dt*(rate+1)));camera.position.copy(DIR.pos);camera.lookAt(DIR.look);}
  function enterDoor(){hideChoices();hideProfile();J.busy=true;const D=STAGE.door.pos;
    // 교실 무대: 앞문 앞까지 걸어가 문이 열리면(빛) 문틈으로 복도에 나간 뒤 고르기 화면
    if(STAGE.doorWalk){const lbl=T_(END.enterLabel||'문으로 가기'),wl=T_((PK&&PK.walkLabel)||'문 너머로');
      travel('door',()=>{faceTo(D.x,D.z);SND('sfx','door');STAGE.door.target=1;J.busy=true;
        setTimeout(()=>travel('gate',()=>travel('beyond',()=>{Q.entered=true;qSave();checklistUI();setTimeout(showPick,300);},wl),wl),1000);},lbl);return;}
    travel('gate',()=>{if(AD){startArrival();return;}
      if(PK){travel('beyond',()=>{Q.entered=true;qSave();checklistUI();setTimeout(showPick,250);},T_(PK.walkLabel||'문 너머로'));return;}   /* 문을 지나 밖으로 몇 걸음 더 걸어 나간 뒤 고르기 화면 */$('#cineFade').classList.add('on');setTimeout(()=>{Q.entered=true;qSave();checklistUI();showEnd();},1100);},T_(END.doorTitle||'문'));
    shot((k,pos,look)=>{const P=player.pos;pos.set(P.x+1.6,1.7,P.z+3.4-k*0.5);look.set(D.x,1.8,D.z);},9,null,false);}

  /* =====================================================================
     (뺌) 문 너머 도시 도착 연출 · 2단계 광장 · 멀티플레이 — 월드 1 프로필 판에는 없다(엑스리아·옛 월드 1 엔진에 그대로 있음).
     남은 코드가 부르는 이름만 빈 자리로 둔다.
     ===================================================================== */
  const AD=null,PZC=null,ARR={active:false},PZ={active:false,cut:false},MP={on:false},QS=new URLSearchParams(location.search);
  function startArrival(){}function skipArrival(){}function updateArrival(){}function enterPlaza(){}function exitPlaza(){}function plazaChoices(){}function plazaMove(){}function updatePlaza(){}
  function fitBack(pos,look,ref){const a=camera.aspect;if(a>=ref)return;pos.sub(look).multiplyScalar(Math.min(2.6,ref/a)).add(look);}
  function showEnd(){const cs=END.comingSoon||{};$('#end .box .kicker').textContent=T_(cs.kicker||V.mainWorld||'');$('#end .box h1').textContent=T_(cs.title||'곧 열립니다');$('#end .box .sub').textContent=T_(cs.text||'');
    $('#endExit').textContent=UI.endExit||'종료';$('#endReplay').textContent=UI.endReplay||'엔딩 다시 보기';$('#endRestart').textContent=UI.endRestart||'처음부터 다시';$('#endVer').textContent=`${T_(CFG.title)} · ${CFG.version||''}`;
    $('#end .box').hidden=false;$('#end .btns').hidden=false;$('#exit').hidden=true;$('#end').hidden=false;}
  // 종료: 창 닫기를 시도하고, 닫히지 않는 환경(아티팩트·일반 탭)에서는 '나왔습니다' 화면으로 바꾼다. ending.exitUrl이 있으면 그 링크를 보여 준다
  $('#endExit').onclick=()=>{SND('music',null);const ex=END.exit||{};$('#end .box').hidden=true;$('#end .btns').hidden=true;const x=$('#exit');x.hidden=false;
    x.querySelector('.kicker').textContent=T_(ex.kicker||CFG.title||'');x.querySelector('h1').textContent=T_(ex.title||'월드를 나왔습니다');x.querySelector('.sub').textContent=T_(ex.text||'이 창을 닫아 주세요.');
    const a=$('#exitLink');if(END.exitUrl){a.href=END.exitUrl;a.target='_blank';a.rel='noopener';a.textContent=T_(ex.linkLabel||END.exitUrl);a.hidden=false;}else a.hidden=true;
    if(END.exitUrl&&ex.go!==false){try{location.href=END.exitUrl;}catch(e){}}
    try{window.close();}catch(e){}};
  function leaveEnd(){$('#end').hidden=true;$('#pick').hidden=true;GF.trail.length=0;GF.last=null;GF.side=null;if(STAGE.guideSpots&&STAGE.guideSpots.meet)gState.pos.copy(STAGE.guideSpots.meet);$('#cineFade').classList.remove('on');J.busy=false;player.pos.copy(STAGE.meet);player.vx=player.vz=0;player.facing=Math.PI;J.node='meet';player.path=[];walkTo=null;clearShot();DIR.init=false;camYaw=0;camPitch=0.3;}
  $('#endReplay').onclick=()=>{leaveEnd();startEnding(true);};
  $('#endRestart').onclick=()=>{leaveEnd();restartAll();};

  /* ---------- 문 너머: '누구의 월드로 들어갈까요?' (설정 ending.pickWorld, 엑스리아 월드 2026-10-30) ----------
     문을 지나면 주인 로봇이 묻는 화면이 뜨고, 월드 하나를 고르면 그 주소로 간다. worlds[]는 설정에서만 고친다. */
  // 같은 사이트 안(http·https)에서 열었으면 상대 주소(url), 파일로 열었거나 url이 없으면 절대 주소(urlAbs)
  function pickUrl(w){const rel=w.url,abs=w.urlAbs||w.url;if(!rel)return abs||'';return /^https?:$/.test(location.protocol)?rel:abs;}
  // 회원 프로필(휴먼쌤 10-31 "회원들 프로필처럼 … 나중에 가상의 프로필 아바타도"): PK.members[]가 있으면 회원 카드 → 그 회원의 월드 목록 → (묶음이면) 그 안 목록.
  // 없으면 예전처럼 PK.worlds 목록 하나. 회원 칸은 설정 파일 머리말 참고(avatar = 그림 주소, 없으면 머리글자 동그라미, ready:false = 빈 자리)
  const MEMBERS=PK&&Array.isArray(PK.members)?PK.members:null,PSTACK=[];   /* PSTACK: 묶음 안으로 들어간 길(돌아가기) */
  function pel(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  const AV_EMPTY='<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="25" r="11"/><path d="M12 56c2-11 10-17 20-17s18 6 20 17z"/></svg>';
  function avatarEl(m,big){const d=pel('span','av'+(big?' lg':''));d.style.setProperty('--c',m.color||'#c9b28a');
    const initial=()=>{d.classList.add('ini');d.textContent=T_(m.initial||String(m.name||'?').trim().charAt(0));};
    if(m.avatar){const i=pel('img');i.alt='';i.decoding='async';i.onerror=()=>{i.remove();initial();};i.src=m.avatar;d.appendChild(i);}
    else if(m.ready===false){d.classList.add('empty');d.innerHTML=AV_EMPTY;}else initial();
    return d;}
  function pickHero(m){const h=$('#pickHero');h.textContent='';h.hidden=!m;$('#pick').classList.toggle('member',!!m);if(!m)return;h.appendChild(avatarEl(m,true));if(m.role)h.appendChild(pel('span','rl',T_(m.role)));}
  function showPick(){if(!PK)return;hideChoices();J.busy=true;
    $('#pick .kicker').textContent=T_(PK.kicker||V.mainWorld||'');$('#pickName').textContent=T_(PK.asker||human.name||'');$('#pickRole').textContent=T_(PK.askerRole||HM.role||'');
    $('#pickTitle').textContent=T_(PK.title||'누구의 월드로 들어갈까요?');$('#pickSub').textContent=T_(PK.sub||'');$('#pickBack').textContent=T_(PK.back||END.stayLabel||'조금 더 머물기');
    PSTACK.length=0;if(MEMBERS)renderMembers();else renderPick(PK.worlds||[],null,null);{const r=$('#pickReplay'),x=$('#pickRestart');r.textContent=T_(UI.endReplay||'엔딩 다시 보기');x.textContent=T_(UI.endRestart||'처음부터');r.hidden=x.hidden=!PROF;}
    const cr=$('#pickCredit');cr.textContent=T_(PK.credit||'');cr.hidden=!PK.credit;   /* 음악 등 출처 한 줄(CC BY 표기) */
    const el=$('#pick');el.classList.remove('leaving');el.hidden=false;el.scrollTop=0;}
  // 회원 카드: 아바타 · 이름 · 하는 일 · 한 줄 소개 · 월드 이름 칩(PK.chipMax개까지, 기본 둘 + 나머지 수). 빈 자리는 점선 카드, 누르면 '준비 중' 한 줄
  function renderMembers(){const list=$('#pickList');list.textContent='';list.className='members';pickHero(null);
    $('#pickTitle').textContent=T_(PK.title||'누구의 월드로 들어갈까요?');$('#pickSub').textContent=T_(PK.sub||'');
    MEMBERS.forEach(m=>{const ws=Array.isArray(m.worlds)?m.worlds:[];const empty=m.ready===false||!ws.length;const b=pel('button','mcard'+(empty?' empty':''));b.style.setProperty('--c',m.color||'#c9b28a');
      b.appendChild(avatarEl(m));const tx=pel('span','tx');tx.appendChild(pel('b','nm',T_(m.name||'')));if(m.role)tx.appendChild(pel('span','rl',T_(m.role)));if(m.intro)tx.appendChild(pel('span','in',T_(m.intro)));
      if(!empty){const ch=pel('span','chips'),k=PK.chipMax||2;ws.slice(0,k).forEach(w=>ch.appendChild(pel('i','',T_(w.short||w.name||''))));if(ws.length>k)ch.appendChild(pel('i','more','+'+(ws.length-k)));tx.appendChild(ch);}
      b.appendChild(tx);if(!empty)b.appendChild(pel('span','ar','›'));
      b.onclick=()=>{SND('sfx','click');if(empty){$('#pickSub').textContent=T_(m.toast||PK.soonToast||'아직 준비 중이에요.');return;}renderPick(ws,null,m);$('#pick').scrollTop=0;};list.appendChild(b);});}
  // 월드 목록 그리기(member = 그 회원의 월드, 없으면 예전 목록). 묶음(w.children)은 누르면 그 안 목록으로 들어가고 '뒤로'가 생긴다(예: XR 과학 실험실 다섯)
  function renderPick(items,parent,member){const list=$('#pickList');list.textContent='';list.className='';pickHero(member);
    if(parent){$('#pickTitle').textContent=T_(parent.name||'');$('#pickSub').textContent=T_(parent.pickSub||parent.sub||'');}
    else if(member){$('#pickTitle').textContent=T_(PK.memberTitle||'{name}의 월드',{name:T_(member.name||'')});$('#pickSub').textContent=T_(member.intro||'');}
    else{$('#pickTitle').textContent=T_(PK.title||'누구의 월드로 들어갈까요?');$('#pickSub').textContent=T_(PK.sub||'');}
    items.forEach(w=>{const group=Array.isArray(w.children)&&w.children.length>0;const soon=!group&&(w.ready===false||!(w.url||w.urlAbs));const b=document.createElement('button');b.className='jb'+(soon?' soon':' hot');
      const t=document.createElement('span');t.className='t';t.textContent=T_(w.name||'');b.appendChild(t);if(w.sub){const s=document.createElement('span');s.className='s';s.textContent=T_(w.sub);b.appendChild(s);}
      if(group){const a=document.createElement('span');a.className='ar';a.textContent='›';b.appendChild(a);}
      b.onclick=()=>{SND('sfx','click');if(group){PSTACK.push({items,parent});renderPick(w.children,w,member);return;}if(soon){$('#pickSub').textContent=T_(w.toast||PK.soonToast||'아직 준비 중이에요.');return;}goWorld(w);};list.appendChild(b);});
    if(parent||member){const back=document.createElement('button');back.className='jb back';back.textContent=T_(parent?(PK.backList||'← 돌아가기'):(PK.backMembers||'← 회원 목록'));
      back.onclick=()=>{SND('sfx','click');if(parent){const p=PSTACK.pop()||{items:member?member.worlds:(PK.worlds||[]),parent:null};renderPick(p.items,p.parent,member);}else renderMembers();};list.appendChild(back);}}
  function goWorld(w){const url=pickUrl(w);if(!url)return;SND('sfx','whoosh');$('#pick').classList.add('leaving');if(PK.leaving)$('#pickSub').textContent=T_(PK.leaving,{name:T_(w.name||'')});
    setTimeout(()=>{try{location.href=url;}catch(e){}},700);}
  $('#pickBack').onclick=()=>{SND('sfx','click');leaveEnd();if(STAGE.canWalk)enterFree();else refreshChoices();};   /* 교실에 조금 더 있기 = 자유 이동 */
  $('#pickReplay').onclick=()=>{SND('sfx','click');leaveEnd();startEnding(true);};
  $('#pickRestart').onclick=()=>{SND('sfx','click');leaveEnd();restartAll();};

  /* ---------- 프로필 카드 (설정 profile, 월드 1 프로필 판 2026-11-01) ----------
     'full' = 엔딩 뒤(문으로 가기 · 그림으로 저장), 'quick' = 시작 화면 '프로필 바로 보기'(조각 하나씩 보기 · 그림으로 저장 · 교실 둘러보기 · 문 너머로).
     그림으로 저장 = 1080x1350 그림을 그려 내려받고, 같은 그림을 화면에 띄운다(폰에서 내려받기가 막히면 길게 눌러 저장). */
  const PROF=CFG.profile||null;let profMode=null,pagerI=0;
  function btnText(b,t,sub){b.textContent='';b.appendChild(pel('span','t',T_(t||'')));if(sub)b.appendChild(pel('small','s',T_(sub)));}
  function fillProfile(){if(fillProfile.done)return;fillProfile.done=true;const P=PROF;
    const av=$('#pfAv');av.textContent='';av.style.setProperty('--c',P.color||'#ffcf5a');if(P.avatar){const i=pel('img');i.alt='';i.src=P.avatar;av.appendChild(i);}else{av.classList.add('ini');av.textContent=T_(P.initial||'휴');}
    $('#pfKicker').textContent=T_(P.kicker||'');$('#pfName').textContent=T_(P.name||'');$('#pfRole').textContent=T_(P.role||'');$('#pfOne').textContent=T_(P.intro||'');
    const ul=$('#pfRows');ul.textContent='';(P.rows||[]).forEach(r=>{const li=pel('li');li.style.setProperty('--c',r.color||'#cccccc');li.appendChild(pel('b',null,T_(r.label)));li.appendChild(pel('span',null,T_(r.text)));ul.appendChild(li);});
    const ch=$('#pfCh');ch.textContent='';if(P.channelsTitle)ch.appendChild(pel('b','h',T_(P.channelsTitle)));const cl=pel('div','cl');
    (P.channels||[]).forEach(c=>{const a=pel('a','c');a.href=c.url;a.target='_blank';a.rel='noopener';a.appendChild(pel('b',null,T_(c.name)));if(c.handle)a.appendChild(pel('span',null,T_(c.handle)));cl.appendChild(a);});ch.appendChild(cl);
    const ask=$('#pfAsk');ask.textContent='';ask.hidden=!P.contact;if(P.contact){ask.appendChild(pel('b',null,T_(P.contact.label)));const a=pel('a',null,T_(P.contact.text||P.contact.url));a.href=P.contact.url;a.target='_blank';a.rel='noopener';ask.appendChild(a);}}
  function showProfile(mode){if(!PROF)return;profMode=mode;hideChoices();J.busy=true;cardMode('');$('#card').hidden=true;cardOpen=false;fillProfile();
    const bx=$('#pfBtns'),Bt=PROF.buttons||{};bx.textContent='';
    const mk=(t,cls,fn,sub)=>{const b=pel('button','jb'+(cls?' '+cls:''));btnText(b,t,sub);b.onclick=()=>{SND('sfx','click');fn();};bx.appendChild(b);return b;};
    if(mode==='quick'){mk(Bt.pieces||'조각 하나씩 보기','hot',()=>openPager(0));mk(Bt.save||'그림으로 저장','',saveProfileImage);mk(Bt.tour||'교실 둘러보기','',startTour,Bt.tourSub);
      mk(Bt.door||'문 너머로','minor',()=>{hideProfile();J.busy=true;Q.entered=true;qSave();checklistUI();showPick();});
      mk(Bt.stay||'교실에 조금 더 있기','minor',()=>{hideProfile();enterFree();});}   /* 11-01 휴먼쌤 "이 마지막 페이지에서는 교실에 더 머물기라는 버튼은 없네" */
    else{mk(Bt.toDoor||'문으로 가기','hot',enterDoor);mk(Bt.save||'그림으로 저장','',saveProfileImage);mk(Bt.stay||'교실에 조금 더 있기','minor',()=>{hideProfile();enterFree();});}
    const el=$('#prof');el.hidden=false;el.scrollTop=0;document.body.classList.add('profopen');SND('sfx','complete');}
  function hideProfile(){$('#prof').hidden=true;$('#pfShot').hidden=true;document.body.classList.remove('profopen');J.busy=false;}
  // 교실 둘러보기(약 4분): 프로필 바로 보기에서 처음부터 시작하기와 같게
  function startTour(){hideProfile();cardMode('');$('#card').hidden=true;$('#introGo').onclick();}
  // 조각 하나씩 보기(프로필 바로 보기): 조각 넷의 카드(설정 missions[].summary)를 넘겨 본다. 끝에서 교실 둘러보기
  // mode 'free' = 자유 이동 중 그 조각 앞에서 다시 보기(닫기만)
  function openPager(i,mode){const n=M.length;pagerI=clamp(i,0,n-1);const m=M[pagerI],sm=m.summary||{},f=m.fact||{},el=$('#card');
    $('#prof').hidden=true;cardMode('pager');el.style.setProperty('--c',m.color||'#ffffff');if(mode==='free'){cardOpen=true;hideChoices();}
    $('#cardEyebrow').textContent=T_(UI.pagerEyebrow||'조각 {n} / {total} · {label}',{n:pagerI+1,total:n,label:m.label});
    $('#cardTitle').textContent=T_(sm.title||m.title||'');$('#cardReply').hidden=true;renderViz($('#cardViz'),sm.viz||f.viz||null,{m,got:m.choices.map((c,k)=>k)});
    const tx=T_(sm.text!=null?sm.text:(f.text||''));$('#cardText').textContent=tx;$('#cardText').hidden=!tx;$('#cardMore').hidden=true;$('#cardPending').hidden=true;$('#cardSrc').textContent='';
    const nav=$('#cardNav');nav.textContent='';const mk=(t,cls,fn)=>{const b=pel('button',cls,T_(t));b.onclick=()=>{SND('sfx','click');fn();};nav.appendChild(b);};
    if(mode==='free')mk(UI.close||'닫기','nx',()=>{cardMode('');el.hidden=true;cardOpen=false;J.busy=false;freeChoices(true);});
    else{mk(UI.pagerProfile||'프로필 카드','bk',()=>{cardMode('');el.hidden=true;showProfile('quick');});
      if(pagerI>0)mk(UI.pagerPrev||'‹ 이전','pv',()=>openPager(pagerI-1));
      if(pagerI<n-1)mk(UI.pagerNext||'다음 ›','nx',()=>openPager(pagerI+1));else mk(UI.pagerTour||'교실 둘러보기','nx',startTour);}
    el.hidden=false;el.scrollTop=0;SND('sfx','card');}
  function wrapLines(g,text,maxW){const out=[];let line='';
    for(const w of String(text).split(' ')){const t=line?line+' '+w:w;if(g.measureText(t).width<=maxW){line=t;continue;}
      if(line)out.push(line);if(g.measureText(w).width<=maxW){line=w;continue;}
      line='';for(const ch of w){if(g.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;}else line+=ch;}}
    if(line)out.push(line);return out;}
  function saveProfileImage(){if(!PROF)return;const P=PROF,W=1080,H=1900;let c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
    const F='"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
    const fonts=(document.fonts&&document.fonts.load)?Promise.all(['900 74px','700 34px','500 34px'].map(f=>document.fonts.load(f+' "Noto Sans KR"','휴먼쌤'))).catch(()=>{}):Promise.resolve();
    const img=new Image();const av=new Promise(r=>{if(!P.avatar)return r(false);img.onload=()=>r(true);img.onerror=()=>r(false);img.src=P.avatar;});
    return Promise.all([fonts,av]).then(([,ok])=>{
      const rr=(x,y,w,h,r)=>{g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);};
      g.fillStyle='#fbf8f2';g.fillRect(0,0,W,H);
      const cols=(P.rows||[]).map(r=>r.color||'#cccccc');cols.forEach((col,i)=>{g.fillStyle=col;g.fillRect(i*W/cols.length,0,W/cols.length+1,14);});
      const hg=g.createLinearGradient(0,14,0,440);hg.addColorStop(0,'#f5ead6');hg.addColorStop(1,'#fbf8f2');g.fillStyle=hg;g.fillRect(0,14,W,426);
      const ax=200,ay=236,ar=116;g.save();g.beginPath();g.arc(ax,ay,ar+16,0,7);g.fillStyle=P.color||'#ffcf5a';g.fill();g.beginPath();g.arc(ax,ay,ar+8,0,7);g.fillStyle='#ffffff';g.fill();
      g.beginPath();g.arc(ax,ay,ar,0,7);g.clip();const rg=g.createRadialGradient(ax,ay-40,10,ax,ay,ar);rg.addColorStop(0,'#2a3d70');rg.addColorStop(1,'#0b1230');g.fillStyle=rg;g.fillRect(ax-ar,ay-ar,ar*2,ar*2);
      if(ok)g.drawImage(img,ax-ar,ay-ar,ar*2,ar*2);g.restore();
      const x0=372;g.textBaseline='alphabetic';g.textAlign='left';
      g.fillStyle='#8a6a3a';g.font='600 27px '+F;g.fillText(T_(P.kicker||''),x0,168);
      g.fillStyle='#15161f';g.font='900 74px '+F;g.fillText(T_(P.name||''),x0,252,W-x0-60);
      g.fillStyle='#8a6a3a';g.font='700 36px '+F;g.fillText(T_(P.role||''),x0,310,W-x0-60);
      let y=476;g.font='500 37px '+F;const il=wrapLines(g,T_(P.intro||''),W-200);rr(70,y-58,W-140,il.length*56+48,26);g.fillStyle='#ffffff';g.fill();g.strokeStyle='rgba(21,22,31,.08)';g.lineWidth=2;g.stroke();
      g.fillStyle='#22232f';il.forEach((l,i)=>g.fillText(l,102,y+i*56));y+=il.length*56+62;
      (P.rows||[]).forEach(r=>{g.fillStyle=r.color||'#cccccc';g.beginPath();g.arc(94,y-11,11,0,7);g.fill();g.fillStyle='rgba(21,22,31,.66)';g.font='700 29px '+F;g.fillText(T_(r.label),120,y);
        g.fillStyle='#15161f';g.font='500 33px '+F;const ls=wrapLines(g,T_(r.text),W-330-70);ls.forEach((l,i)=>g.fillText(l,330,y+i*46));y+=Math.max(1,ls.length)*46+24;});
      y+=18;g.fillStyle='#8a6a3a';g.font='700 26px '+F;g.fillText(T_(P.channelsTitle||'채널'),80,y);y+=58;
      let cx=80;g.font='600 27px '+F;(P.channels||[]).forEach(ch=>{const t=T_(ch.name)+'  '+T_(ch.handle||'');const w=g.measureText(t).width+44;if(cx+w>W-80){cx=80;y+=66;}
        rr(cx,y-40,w,56,28);g.fillStyle='rgba(21,22,31,.07)';g.fill();g.fillStyle='#15161f';g.fillText(t,cx+22,y-2);cx+=w+12;});
      y+=50;
      if(P.contact){rr(70,y,W-140,100,26);g.fillStyle='#15161f';g.fill();g.fillStyle='#ffcf5a';g.font='700 30px '+F;g.fillText(T_(P.contact.label),112,y+62);
        g.fillStyle='#ffffff';g.font='700 34px '+F;g.textAlign='right';g.fillText(T_(P.contact.text||P.contact.url),W-112,y+63);g.textAlign='left';y+=100;}
      // 글이 길어 넘치면 그림을 길게(기본 1080x1350): 큰 판에 그린 것을 알맞은 높이 판으로 옮기고 맨 아래 한 줄
      const H2=Math.max(1350,Math.ceil(y+110)),out=document.createElement('canvas');out.width=W;out.height=H2;const o=out.getContext('2d');o.fillStyle='#fbf8f2';o.fillRect(0,0,W,H2);o.drawImage(c,0,0);
      o.fillStyle='rgba(21,22,31,.42)';o.font='500 24px '+F;o.textAlign='center';o.fillText(T_(P.footer||CFG.title||''),W/2,H2-44);c=out;
      saveProfileImage.last=c;
      const show=url=>{$('#pfImg').src=url;$('#pfShotHint').textContent=T_(IS_TOUCH?(P.saveHintTouch||'저장이 안 되면 그림을 길게 눌러 저장하세요.'):(P.saveHint||'그림 파일로 내려받았어요.'));$('#pfShotClose').textContent=T_(UI.close||'닫기');$('#pfShot').hidden=false;};
      const name=(P.saveFile||'profile')+'.png';
      if(c.toBlob)c.toBlob(b=>{if(!b){show(c.toDataURL('image/png'));return;}const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);try{a.click();}catch(e){}a.remove();show(url);},'image/png');
      else show(c.toDataURL('image/png'));
      SND('sfx','piece');});}
  $('#pfShotClose').onclick=()=>{SND('sfx','click');$('#pfShot').hidden=true;};

  /* ---------- intro ---------- */
  const intro={active:true};document.body.classList.add('intro');
  $('#intro .kicker').textContent=T_(CFG.kicker||'');$('#intro h1').textContent=T_(CFG.title||'');$('#intro .sub').textContent=T_(CFG.subtitle||'');btnText($('#introGo'),UI.start||'시작하기',UI.startSub);btnText($('#introSkip'),UI.skipWorld||'건너뛰고 바로 문 너머로',UI.skipWorldSub);
  shot(STAGE.introShot?STAGE.introShot():shotIntro(),9999,null,false);
  function closeIntro(){intro.active=false;document.body.classList.remove('intro');$('#intro').classList.add('off');setTimeout(()=>{$('#intro').hidden=true;},700);clearShot();DIR.init=false;camYaw=0;}
  // 건너뛰기: 이미 해 본 사람은 미션 없이 문 너머(도착 연출)로 바로 간다
  // 광장에 와 본 사람은 연출 없이 광장으로 바로 온다(2단계, 기획안 5절 '두 번째 방문부터는 광장에서 시작')
  // 주소에 plaza=1이 있으면(연수 때 바로 광장으로 모일 때) 처음 온 사람도 같은 버튼으로 광장에 바로 온다
  const TO_PLAZA=!!PZC&&(Q.plaza||QS.get('plaza')==='1');
  if(TO_PLAZA)$('#introSkip').textContent=T_(PZC.toPlaza||'광장으로 바로 가기');
  $('#introSkip').onclick=()=>{SND('unlock');SND('sfx','select');closeIntro();hideChoices();if(PROF){SND('music','day');shot(STAGE.introShot?STAGE.introShot():shotIntro(),9999,null,false);showProfile('quick');return;}if(TO_PLAZA){enterPlaza(null);return;}if(AD)startArrival();else{Q.entered=true;qSave();checklistUI();if(PK)showPick();else showEnd();}};
  // 처음부터: 저장된 진행을 지우고 처음부터 시작한다
  $('#introGo').onclick=()=>{SND('unlock');SND('sfx','select');SND('music','day');if(Q.met||Q.human||Q.entered||Object.keys(Q.got).some(k=>gotList(k).length))restartAll(true);closeIntro();
    if(IS_TOUCH&&innerWidth>innerHeight&&UI.rotateHintLandscape)toast(UI.rotateHintLandscape);else if(IS_TOUCH&&innerHeight>innerWidth&&UI.rotateHint)toast(UI.rotateHint);   /* 월드 1 프로필은 세로가 기본(11-01) — 가로로 들었을 때만 안내 */
    if(Q.human){STAGE.door.open(1);human.root.visible=!NOHOST;hState.scale=NOHOST?0:1;hState.pos.set(2.1,0,-6.0);hState.facing=Math.atan2(0-2.1,-3.5+6.0);}
    if(!Q.met){hideChoices();setTimeout(()=>{if(!talk.open&&!cine.active)talkGuide();},700);}else refreshChoices();};
  checklistUI();

  /* ---------- 자유 이동(교실에 조금 더 있기, 11-01 휴먼쌤 "더 머물다가기를 누르면 자유롭게 움직이면 좋겠고") ----------
     폰 = 왼쪽 아래 막대, PC = 방향키·WASD, 둘 다 바닥을 누르면 그 자리로 걷는다. 책상·교탁 등은 STAGE.canWalk로 막고 벽·책상을 따라 미끄러진다.
     조각 자리 가까이 가면 '조각 다시 보기' 단추가 생긴다. '문으로 가기'·'프로필 카드'를 누르면 자유 이동을 끝낸다. 리니는 발자국을 따라온다. */
  const FREE={on:false,goal:null,near:-2,stuck:0,t:0};
  const KEYS={},KEYMAP={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  addEventListener('keydown',e=>{const k=KEYMAP[e.code];if(!k||!FREE.on||cardOpen)return;KEYS[k]=true;FREE.goal=null;e.preventDefault();});
  addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)KEYS[k]=false;});
  addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=false;});
  const JOY={x:0,y:0,id:null};
  {const joy=$('#joy'),knob=$('#joyKnob');const set=e=>{const r=joy.getBoundingClientRect(),R=r.width*0.42;let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l;}JOY.x=dx/R;JOY.y=dy/R;knob.style.transform='translate('+dx+'px,'+dy+'px)';};
    joy.addEventListener('pointerdown',e=>{JOY.id=e.pointerId;try{joy.setPointerCapture(e.pointerId);}catch(_){}FREE.goal=null;set(e);e.preventDefault();});
    joy.addEventListener('pointermove',e=>{if(JOY.id===e.pointerId)set(e);});
    const end=e=>{if(JOY.id!==e.pointerId)return;JOY.id=null;JOY.x=JOY.y=0;knob.style.transform='';};joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);}
  function enterFree(){if(!STAGE.canWalk){refreshChoices();return;}FREE.on=true;FREE.goal=null;FREE.near=-2;J.busy=false;J.traveling=false;J.staying=false;J.node='free';player.path=[];walkTo=null;clearShot();DIR.init=false;
    document.body.classList.add('free');$('#joy').hidden=!IS_TOUCH;toast(T_(IS_TOUCH?(UI.freeHintTouch||'왼쪽 아래 막대를 밀거나 바닥을 누르면 걸어가요.'):(UI.freeHint||'방향키·WASD로 걷거나 바닥을 누르면 걸어가요.')));freeChoices(true);}
  function exitFree(){if(!FREE.on)return;FREE.on=false;FREE.goal=null;for(const k in KEYS)KEYS[k]=false;JOY.x=JOY.y=0;JOY.id=null;$('#joyKnob').style.transform='';document.body.classList.remove('free');$('#joy').hidden=true;}
  function nearSpot(){const P=player.pos;let k=-1,d0=1.8;STAGE.spots.forEach(s=>{const d=Math.hypot(s.stand.x-P.x,s.stand.z-P.z);if(d<d0){d0=d;k=s.i;}});return k;}
  function freeChoices(force){if(!FREE.on||cardOpen||talk.open||cine.active)return;const k=nearSpot();if(!force&&k===FREE.near)return;FREE.near=k;const L=[];
    if(k>=0)L.push({label:T_(UI.freePiece||'{piece} 다시 보기',{piece:pieceName(M[k])}),fn:()=>openPager(k,'free'),hot:true});
    L.push({label:T_(END.enterLabel||'문으로 가기'),fn:()=>{exitFree();enterDoor();},hot:k<0},{label:T_((PROF&&PROF.again)||'프로필 카드'),fn:()=>{exitFree();showProfile('full');},minor:true});
    setChoices(T_(UI.freeWhere||'교실 둘러보기'),L);document.documentElement.style.setProperty('--jh',($('#journey').offsetHeight||70)+'px');}
  function freeMove(dt){const P=player.pos;let ix=(KEYS.right?1:0)-(KEYS.left?1:0)+JOY.x,iy=(KEYS.down?1:0)-(KEYS.up?1:0)+JOY.y,l=Math.hypot(ix,iy);
    const sY=Math.sin(camYaw),cY=Math.cos(camYaw);let tx=0,tz=0,spd=0;
    if(l>0.12){if(l>1){ix/=l;iy/=l;l=1;}tx=-sY*-iy+cY*ix;tz=-cY*-iy-sY*ix;const n=Math.hypot(tx,tz)||1;tx/=n;tz/=n;spd=3.0*l;}   /* 앞 = 카메라에서 멀어지는 쪽 */
    else if(FREE.goal){const dx=FREE.goal.x-P.x,dz=FREE.goal.z-P.z,d=Math.hypot(dx,dz);if(d<0.15)FREE.goal=null;else{tx=dx/d;tz=dz/d;spd=Math.min(3.0,0.6+d*1.5);}}
    const acc=spd>Math.hypot(player.vx,player.vz)?7:10;player.vx=lerp(player.vx,tx*spd,Math.min(1,dt*acc));player.vz=lerp(player.vz,tz*spd,Math.min(1,dt*acc));
    const ok=(x,z)=>STAGE.canWalk(x,z)&&!(human.root.visible&&Math.hypot(x-hState.pos.x,z-hState.pos.z)<0.45),ox=P.x,oz=P.z,nx=P.x+player.vx*dt,nz=P.z+player.vz*dt;
    if(ok(nx,nz)){P.x=nx;P.z=nz;}else if(ok(nx,P.z)){P.x=nx;player.vz*=0.5;}else if(ok(P.x,nz)){P.z=nz;player.vx*=0.5;}else{player.vx=player.vz=0;}
    const moved=Math.hypot(P.x-ox,P.z-oz);if(FREE.goal&&spd>0.3&&moved<spd*dt*0.2){FREE.stuck+=dt;if(FREE.stuck>0.5){FREE.goal=null;FREE.stuck=0;}}else FREE.stuck=0;
    player.speed=moved/Math.max(dt,1e-4);P.y=0;
    if(player.speed>0.2){const tg=Math.atan2(player.vx,player.vz);let d=tg-player.facing;d=Math.atan2(Math.sin(d),Math.cos(d));player.facing+=clamp(d*Math.min(1,dt*10),-dt*10,dt*10);}
    FREE.t+=dt;if(FREE.t>0.3){FREE.t=0;freeChoices(false);}}
  // 바닥 누르기: 누른 화면 점에서 바닥(높이 0)까지 광선을 쏴 걸어갈 곳을 정한다
  const _ray=new THREE.Raycaster(),_ndc=new THREE.Vector2(),_floorPl=new THREE.Plane(new THREE.Vector3(0,1,0),0),_hit=new THREE.Vector3();
  function freeTap(cx,cy){const r=canvas.getBoundingClientRect();_ndc.set((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1);_ray.setFromCamera(_ndc,camera);if(!_ray.ray.intersectPlane(_floorPl,_hit))return;
    const gx=clamp(_hit.x,-7.3,7.3),gz=clamp(_hit.z,-5.7,5.7);FREE.goal={x:gx,z:gz};FREE.stuck=0;burst(new THREE.Vector3(gx,0.05,gz),'#ffffff',18,1.2,0.6);}

  /* ---------- 리니가 방문자를 따라 걷기(설정 guide.follow, 교실 무대 2026-11-01) ----------
     방문자가 걸은 자리를 0.3 m마다 발자국으로 남기고, 그 길을 lag m 뒤에서 따라간다(책상 사이 통로로만).
     방문자가 멈추면 가까운 발자국을 지우고 그 자리 옆(STAGE.guideSpots)으로 비켜 선다. '바로 도착하기'면 옆자리로 바로 옮긴다. */
  const GF={on:!!(GD.follow&&STAGE.guideSpots),trail:[],last:null,side:null,dir:0,v:0,snap:false,lag:(GD.follow&&GD.follow.lag)||1.5};
  function guideFollow(dt){const G=gState.pos,P=player.pos;
    if(GF.snap){GF.snap=false;GF.trail.length=0;GF.last=null;const sd=STAGE.guideSpots[J.node];if(sd){G.copy(sd);GF.side=sd;}GF.v=0;return 0;}
    if(cine.active||intro.active){GF.v=0;return 0;}
    const moving=J.traveling||player.speed>0.2;
    if(moving){GF.side=null;if(!GF.last||Math.hypot(P.x-GF.last.x,P.z-GF.last.z)>0.3){GF.last={x:P.x,z:P.z};GF.trail.push(GF.last);}}
    else if(!GF.side){GF.side=STAGE.guideSpots[J.node]||null;GF.last=null;
      while(GF.trail.length){const e=GF.trail[GF.trail.length-1];if(Math.hypot(e.x-P.x,e.z-P.z)<1.2)GF.trail.pop();else break;}}
    let tx=null,tz=null,want=0;
    if(GF.trail.length){let L=Math.hypot(GF.trail[0].x-G.x,GF.trail[0].z-G.z);for(let i=1;i<GF.trail.length;i++)L+=Math.hypot(GF.trail[i].x-GF.trail[i-1].x,GF.trail[i].z-GF.trail[i-1].z);
      const e=GF.trail[GF.trail.length-1];L+=Math.hypot(P.x-e.x,P.z-e.z);
      if(!moving||L>GF.lag){tx=GF.trail[0].x;tz=GF.trail[0].z;want=moving?clamp(player.speed+(L-GF.lag)*1.2,0.8,4.6):2.2;}}
    else if(GF.side&&Math.hypot(GF.side.x-G.x,GF.side.z-G.z)>0.08){tx=GF.side.x;tz=GF.side.z;want=Math.min(2.0,0.6+Math.hypot(tx-G.x,tz-G.z)*2);}
    GF.v=lerp(GF.v,want,Math.min(1,dt*(want>GF.v?4:8)));
    if(tx!=null&&GF.v>0.02){const dx=tx-G.x,dz=tz-G.z,d=Math.hypot(dx,dz),st=Math.min(d,GF.v*dt);if(d>1e-4){G.x+=dx/d*st;G.z+=dz/d*st;GF.dir=Math.atan2(dx,dz);}
      if(GF.trail.length&&tx===GF.trail[0].x&&tz===GF.trail[0].z&&d<0.12)GF.trail.shift();}
    else if(tx==null)GF.v=0;
    return GF.v;}

  /* ---------- NPC updates ---------- */
  const gIn={pos:gState.pos,facing:0},hIn={pos:hState.pos,facing:0};
  function updateNPC(dt){const P=player.pos;const gm=GF.on?guideFollow(dt):0,gw=gm>0.15;
    const near=Math.hypot(P.x-gState.pos.x,P.z-gState.pos.z);const want=gw?GF.dir:near<(GF.on?7:4)?Math.atan2(P.x-gState.pos.x,P.z-gState.pos.z):(STAGE.guide.facing||0);let d=want-gState.facing;d=Math.atan2(Math.sin(d),Math.cos(d));gState.facing+=d*Math.min(1,dt*(gw?8:3));
    if(guide.actions){guide.hold=gw?'walk':'idle';if(guide.actions.walk)guide.actions.walk.timeScale=clamp(gm/((GD.model&&GD.model.step)||1.0),0.6,2.4);}   /* GLB 리니: 걸을 때 걷기 동작 */
    gIn.facing=gState.facing;guide.update(dt,T,gIn);qMark.position.set(gState.pos.x,(guide.height?guide.height+0.75:2.45)+Math.sin(T*2.2)*0.06,gState.pos.z);
    if(human.root.visible){const hw=hState.walk||0;if(human.actions){human.hold=hw>0.1?'walk':'idle';if(human.actions.walk)human.actions.walk.timeScale=clamp(hw/((HM.model&&HM.model.step)||1.4),0.6,2);}const wantH=hw>0.1?hState.facing:Math.atan2(P.x-hState.pos.x,P.z-hState.pos.z);let dh=wantH-hState.facing;dh=Math.atan2(Math.sin(dh),Math.cos(dh));hState.facing+=dh*Math.min(1,dt*3);
      hIn.facing=hState.facing;human.update(dt,T,hIn);human.setScale(hState.scale);human.tag.visible=hState.scale>0.95;}}

  /* ---------- main loop ---------- */
  const clock=new THREE.Clock();
  function fitViewport(){vw=innerWidth;vh=innerHeight;if(vw<2||vh<2)return;camera.aspect=vw/vh;camera.updateProjectionMatrix();renderer.setSize(vw,vh,false);if(composer)composer.setSize(vw,vh);letterbox();}
  renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),0.1);if(innerWidth!==vw||innerHeight!==vh)fitViewport();if(vw<2||vh<2)return;T+=dt;
    if(!intro.active&&!cine.active&&!ARR.active)updatePlayer(dt);else{player.vx=player.vz=0;player.speed=0;}   /* 연출 중에는 속도를 0으로 — 걷기 자세가 남지 않게(휴먼쌤 10-30 "걷는 포즈가 안없어져") */
    if(me.actions){const mv=player.speed>0.3;me.hold=mv?'walk':'idle';if(me.actions.walk)me.actions.walk.timeScale=clamp(player.speed/((PM.model&&PM.model.step)||1.0),0.6,2.6);}   /* GLB 플레이어: 걸을 때 걷기 동작, 속도에 맞춰 배속 */
    me.update(dt,T,{pos:player.pos,facing:player.facing});updateNPC(dt);STAGE.updateStage(dt,T);updateFX(dt);
    if(PZ.active)updatePlaza(dt);
    if(cine.active)updateEnding(dt);else if(ARR.active)updateArrival(dt);else updateCamera(dt);
    if(useBloom&&composer)composer.render(dt);else renderer.render(scene,camera);});
  addEventListener('resize',fitViewport);fitViewport();
  window.__world={CFG,Q,J,player,gState,hState,GF,STAGE,FREE,enterFree,exitFree,startEnding,finishEnding,restartAll,goMission,answerMission,talkGuide,closeTalk,refreshChoices,skipTravel,enterDoor,showPick,showProfile,hideProfile,openPager,saveProfileImage,get talk(){return talk;},get intro(){return intro;},get cine(){return cine;},get human(){return human;},get me(){return me;},get guide(){return guide;},get dir(){return DIR;},get cardOpen(){return cardOpen;}};
}
window.WorldEngine={start};
})();
