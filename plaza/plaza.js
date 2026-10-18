// 융합 광장(웹XR 시범) — 블렌더로 빛을 구운 광장(assets/plaza.glb) + 가상 구역 빛·포털·리니.
// 주소 뒤 ?shot=spawn|lawn|virtual|portal|rini|aerial 이면 표지 없이 그 자리에서 시작(시험용), &fx=0 이면 빛 번짐 끔, &lite=1 이면 휴대폰용 가벼운 광장.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Q = new URLSearchParams(location.search);
const log = (...a) => console.log('[PLAZA]', ...a);
const $ = id => document.getElementById(id);
const MOBILE = matchMedia('(pointer: coarse)').matches;
const FX = Q.get('fx') !== '0';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 리니 말(가안·확인 전)
const RINI_LINES = [
  '안녕! 나는 리니야. 여기는 융합 광장이야.',
  '왼쪽은 우리가 매일 다니는 학교 교정이야.',
  '오른쪽은 컴퓨터 속 가상 구역이야. 바닥에 빛이 흘러!',
  '가운데 고리는 두 세계를 잇는 문이야. 아직은 열리지 않아.',
  '천천히 걸어 다니면서 둘러봐. 또 말 걸어 줘!',
];

// ───────────── 기본 틀 ─────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;          // 구운 그림은 블렌더(AgX)에서 이미 색이 정해짐
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1500);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
const EYE = 1.6;
camera.position.set(0, EYE, 0);
let yaw = 0, pitch = 0;

const HORIZON = new THREE.Color('#b7bfc3');
scene.fog = new THREE.Fog(HORIZON, 80, 340);

// 동적인 것(리니·결정)만 받는 빛 — 구운 광장은 빛을 받지 않는다
const hemi = new THREE.HemisphereLight('#cfe0f2', '#6d7a4a', 1.4); scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#fff3e0', 2.4); scene.add(sunLight);

// ───────────── 하늘 ─────────────
// 블렌더 하늘(단일 산란, 같은 노출)을 높이별로 잰 색에 맞춤 — test\sky-colors.ps1
const SKY = { zen: '#52698c', mid: '#7f95ad', hor: '#b7bfc3', ground: '#8f9a82', sun: '#fff1d8' };
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, cZen: { value: new THREE.Color(SKY.zen) }, cMid: { value: new THREE.Color(SKY.mid) },
    cHor: { value: new THREE.Color(SKY.hor) }, cGround: { value: new THREE.Color(SKY.ground) }, cSun: { value: new THREE.Color(SKY.sun) },
  },
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 sunDir, cZen, cMid, cHor, cGround, cSun; varying vec3 vDir;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 d = normalize(vDir); float e = d.y;
      vec3 col = mix(cHor, cMid, smoothstep(0.0, 0.22, e));
      col = mix(col, cZen, smoothstep(0.18, 0.95, e));
      float s = max(dot(d, normalize(sunDir)), 0.0);
      col += cSun * (pow(s, 6.0) * 0.18 + pow(s, 48.0) * 0.25) * smoothstep(-0.05, 0.1, e);
      col += cSun * smoothstep(0.99985, 0.99992, s) * 6.0;
      col = mix(col, mix(cHor, cGround, 1.0 - smoothstep(-0.08, 0.0, e)), step(e, 0.0));
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

// ───────────── 화면 효과(빛 번짐) ─────────────
const rt = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: MOBILE ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.55, 1.0);
if (FX) composer.addPass(bloom);
composer.addPass(new OutputPass());

// 세로 화면(휴대폰)에서도 옆이 너무 좁지 않게: 가로 시야 50도 이상, 세로 시야 70~92도
function fitFov() {
  const a = innerWidth / innerHeight;
  camera.fov = clamp(2 * Math.atan(Math.tan(25 * Math.PI / 180) / a) * 180 / Math.PI, 70, 92);
}
fitFov(); camera.updateProjectionMatrix();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; fitFov(); camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ───────────── 도우미 ─────────────
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const glowTex = canvasTex(64, 64, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const shadowTex = canvasTex(64, 64, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.6, 'rgba(0,0,0,0.25)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrapText(g, text, maxW) {   // 띄어쓰기 단위로 줄을 나눈다(너무 긴 낱말만 글자 단위)
  const out = []; let line = '';
  for (const word of text.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (g.measureText(t).width <= maxW) { line = t; continue; }
    if (line) out.push(line);
    line = '';
    for (const ch of word) { const u = line + ch; if (g.measureText(u).width > maxW && line) { out.push(line); line = ch; } else line = u; }
  }
  if (line) out.push(line); return out;
}
const FONT = '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';

function signBoard(text, sub, color = '#2d3550', accent = '#f4c060') {
  const tex = canvasTex(512, 200, (g, w, h) => {
    g.fillStyle = color; roundRect(g, 4, 4, w - 8, h - 8, 26); g.fill();
    g.fillStyle = accent; g.fillRect(36, h - 34, w - 72, 6);
    g.fillStyle = '#ffffff'; g.font = `700 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, sub ? 78 : 96);
    if (sub) { g.font = `500 30px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.82)'; g.fillText(sub, w / 2, 138); }
  });
  const grp = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.586), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  panel.position.y = 1.35; grp.add(panel);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 10), new THREE.MeshLambertMaterial({ color: '#3a3f47' }));
  post.position.y = 0.55; grp.add(post);
  return grp;
}

// ───────────── 불러오기 ─────────────
const manager = new THREE.LoadingManager();
const progress = {};
function setProgress(key, f) { progress[key] = f; const v = Object.values(progress); const p = v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1); $('loading').textContent = `불러오는 중… ${Math.round(p * 100)}%`; }
const gltfLoader = new GLTFLoader(manager);
// 광장 glb는 Draco로 줄였다(블렌더 내보내기). 풀개는 three와 같은 판(0.170.0)을 CDN에서.
gltfLoader.setDRACOLoader(new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/'));
// 휴대폰은 그림을 절반으로 줄인 판(plaza-m.glb). ?lite=1·?lite=0 으로 바꿔 볼 수 있다.
const LITE = Q.has('lite') ? Q.get('lite') !== '0' : MOBILE;
const loadGLB = (url, key) => new Promise((res, rej) => gltfLoader.load(url, res, e => { if (e.total) setProgress(key, e.loaded / e.total); }, rej));

let layout, rini = null, riniHit = null, riniMixer = null, riniActs = {}, riniCur = null, riniLine = -1, bubble = null, bubbleTimer = 0;
const colliders = [];
const anim = [];       // 매 장면마다 부를 것들: f(t, dt)
const clickables = []; // { mesh, onClick }

async function main() {
  layout = await (await fetch('assets/layout.json')).json();
  setProgress('plaza', 0); setProgress('rini', 0);
  const sd = new THREE.Vector3(...layout.sun.dir).normalize();
  skyMat.uniforms.sunDir.value.copy(sd);
  sunLight.position.copy(sd).multiplyScalar(50);
  colliders.push(...layout.colliders);

  const [plaza, riniGltf] = await Promise.all([
    loadGLB(LITE ? 'assets/plaza-m.glb' : 'assets/plaza.glb', 'plaza'),
    // 리니: 공용 world1 리니(10MB)의 그림만 1024로 줄인 사본(blender\shrink_glb_images.py). 없으면 공용 원본.
    loadGLB('assets/rini-lite.glb', 'rini').catch(() => loadGLB('../world1/assets/rini-glb.wasm', 'rini')).catch(e => { log('rini load failed', e && e.message); return null; }),
  ]);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  let meshes = 0;
  plaza.scene.traverse(o => {
    if (!o.isMesh) return; meshes++;
    const map = o.material.map;
    // 가장자리에서 반대편 그림이 섞이면 바닥 조각 경계에 가는 줄이 보인다 → 끝에서 멈춤
    if (map) { map.anisotropy = aniso; map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping; map.needsUpdate = true; }
    o.material = new THREE.MeshBasicMaterial({ map, fog: true });
    o.matrixAutoUpdate = false; o.updateMatrix();
  });
  scene.add(plaza.scene);
  log('plaza meshes', meshes);

  buildVirtual(); buildPortal(); buildSigns();
  if (riniGltf) setupRini(riniGltf);
  setupEnv();

  $('loading').style.display = 'none';
  $('flatBtn').disabled = false; $('flatBtn').textContent = '화면으로 보기';
  placeAt('spawn');
  if (Q.get('shot')) { startFlat(); placeAt(Q.get('shot')); }
  window.PLAZA = { camera, rig, scene, renderer, composer, placeAt, talk: () => riniTalk(), look: (y, p = 0) => { yaw = y; pitch = p; }, tick: (t, dt = 1 / 60) => { for (const f of anim) f(t, dt); }, ready: true };
  log('ready');
}

// 리니·결정이 하늘빛을 받게(반사)
function setupEnv() {
  const pm = new THREE.PMREMGenerator(renderer);
  const s2 = new THREE.Scene(); s2.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat.clone()));
  s2.children[0].material.uniforms.sunDir.value.copy(skyMat.uniforms.sunDir.value);
  scene.environment = pm.fromScene(s2, 0.02).texture; scene.environmentIntensity = 0.6;
  pm.dispose();
}

// ───────────── 가상 구역 ─────────────
function buildVirtual() {
  const V = layout.virtual; // 블렌더 x 10..30, y −20..20 → three x 10..30, z −20..20
  const x0 = V.min[0], x1 = V.max[0], z0 = -V.max[1], z1 = -V.min[1];
  const gridMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color('#3fd2ff') }, uCol2: { value: new THREE.Color('#b48cff') } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uCol, uCol2; varying vec3 vW;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec2 g = (vW.xz - vec2(${x0.toFixed(1)}, ${z0.toFixed(1)})) / ${V.grid.toFixed(1)};
        vec2 f = abs(fract(g + 0.5) - 0.5) * ${V.grid.toFixed(1)};      // 가장 가까운 줄까지(미터)
        float d = min(f.x, f.y);
        float w = max(fwidth(d) * 1.2, 1e-4);
        float line = 1.0 - smoothstep(0.018, 0.018 + w, d);
        float glow = exp(-d * 9.0) * 0.35;
        // 줄을 따라 흐르는 빛 알갱이
        vec2 id = floor(g + 0.5);
        float px = fract(vW.z * 0.09 + hash(id.x * 7.1) - uTime * (0.12 + 0.1 * hash(id.x)));
        float pz = fract(vW.x * 0.09 + hash(id.y * 3.7) - uTime * (0.1 + 0.1 * hash(id.y + 2.0)));
        float onX = 1.0 - smoothstep(0.02, 0.05 + w, f.x), onZ = 1.0 - smoothstep(0.02, 0.05 + w, f.y);
        float pulse = onX * smoothstep(0.93, 1.0, px) + onZ * smoothstep(0.93, 1.0, pz);
        float edge = smoothstep(0.0, 1.5, vW.x - ${x0.toFixed(1)}) * 0.6 + 0.4;
        vec3 c = mix(uCol, uCol2, 0.5 + 0.5 * sin(vW.x * 0.12 + vW.z * 0.08 + uTime * 0.3));
        float a = (line * 0.9 + glow) * edge + pulse * 2.2;
        gl_FragColor = vec4(c * a * 1.6, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), gridMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2); scene.add(floor);
  anim.push(t => { gridMat.uniforms.uTime.value = t; });

  // 가장자리 빛 울타리(동·남·북)
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color('#47c8ff') } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uCol; varying vec2 vUv; varying vec3 vW;
      void main(){
        float along = vW.x + vW.z;
        float lines = smoothstep(0.92, 1.0, fract(vUv.y * 6.0 - uTime * 0.25)) * 0.5;
        float vert = 1.0 - smoothstep(0.0, 0.04, abs(fract(along * 0.5) - 0.5) * 2.0 * 0.5);
        float fade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.0);
        float a = (0.12 + lines + vert * 0.25) * fade + (1.0 - smoothstep(0.0, 0.03, vUv.y)) * 1.2;
        gl_FragColor = vec4(uCol * a, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const H = 2.4;
  const walls = [[x1, (z0 + z1) / 2, z1 - z0, Math.PI / 2], [(x0 + x1) / 2, z0, x1 - x0, 0], [(x0 + x1) / 2, z1, x1 - x0, 0]];
  for (const [x, z, len, ry] of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), wallMat); m.position.set(x, H / 2, z); m.rotation.y = ry; scene.add(m);
  }
  anim.push(t => { wallMat.uniforms.uTime.value = t; });

  // 받침 위 떠 있는 결정 + 빛기둥
  const cols = ['#5fe0ff', '#b48cff', '#7dffc8', '#ff9ad5', '#ffd36b'];
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#6fd8ff') } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float a = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6) * 0.35; gl_FragColor = vec4(uCol * a, 1.0);
      #include <colorspace_fragment>
    }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  layout.plinths.forEach((p, i) => {
    const col = new THREE.Color(cols[i % cols.length]);
    const geo = new THREE.OctahedronGeometry(0.32, 0); geo.scale(1, 1.9, 1);
    const mat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.5), emissive: col, emissiveIntensity: 1.8, metalness: 0.2, roughness: 0.15, flatShading: true });
    const c = new THREE.Mesh(geo, mat); c.position.set(p[0], p[1] + 0.95, p[2]); scene.add(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.022, 8, 48), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.5), toneMapped: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p[0], p[1] + 0.03, p[2]); scene.add(ring);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, fog: false }));
    halo.scale.setScalar(1.6); c.add(halo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 12, 1, true), beamMat.clone());
    beam.material.uniforms.uCol.value = col; beam.geometry.translate(0, 3.5, 0); beam.position.set(p[0], p[1] + 1.0, p[2]); scene.add(beam);
    const ph = i * 1.3;
    anim.push(t => { c.position.y = p[1] + 0.95 + Math.sin(t * 1.2 + ph) * 0.09; c.rotation.y = t * 0.6 + ph; });
  });

  // 떠오르는 빛 알갱이
  const N = MOBILE ? 260 : 520, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = Math.random() * 3.5; pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0); spd[i] = 0.12 + Math.random() * 0.3; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: glowTex, color: new THREE.Color('#8fe6ff').multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(pts);
  anim.push((t, dt) => {
    const a = pg.attributes.position.array;
    for (let i = 0; i < N; i++) { a[i * 3 + 1] += spd[i] * dt; if (a[i * 3 + 1] > 3.8) a[i * 3 + 1] = 0; }
    pg.attributes.position.needsUpdate = true;
  });
}

// ───────────── 포털 ─────────────
function buildPortal() {
  const P = layout.portal, c = new THREE.Vector3(...P.center);
  const rIn = P.radius - P.tube * 0.85;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = r > 1e-4 ? atan(p.y, p.x) : 0.0;   // 한가운데 atan(0,0)은 값이 정해져 있지 않다
        float sw = sin(a * 3.0 + r * 9.0 - uTime * 1.4) * 0.5 + 0.5;
        float sw2 = sin(a * 5.0 - r * 14.0 + uTime * 0.9) * 0.5 + 0.5;
        vec3 cA = vec3(0.25, 0.85, 1.0), cB = vec3(0.62, 0.45, 1.0);
        vec3 col = mix(cA, cB, sw) * (0.3 + 0.8 * sw * sw2);
        float rim = smoothstep(0.78, 1.0, r);
        float alpha = (1.0 - smoothstep(0.94, 1.0, r)) * (0.26 + 0.3 * sw * sw2 + rim * 0.5);
        gl_FragColor = vec4(col * alpha * (1.0 + rim * 1.2), 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(rIn, 96), mat); disc.position.copy(c); scene.add(disc);
  anim.push(t => { mat.uniforms.uTime.value = t; });
  for (const dz of [-0.06, 0.06]) {
    const glow = new THREE.Mesh(new THREE.TorusGeometry(rIn + 0.02, 0.025, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fe3ff').multiplyScalar(2.6), toneMapped: false, fog: false }));
    glow.position.set(c.x, c.y, c.z + dz); scene.add(glow);
  }
  // 고리를 도는 빛 알갱이
  const N = 90, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) ph[i] = Math.random() * Math.PI * 2;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, map: glowTex, color: new THREE.Color('#bfeaff').multiplyScalar(2.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(pts);
  anim.push(t => {
    for (let i = 0; i < N; i++) {
      const a = ph[i] + t * (0.25 + (i % 7) * 0.05), rr = rIn * (0.55 + 0.45 * ((i * 37) % 100) / 100);
      pos[i * 3] = c.x + Math.cos(a) * rr; pos[i * 3 + 1] = c.y + Math.sin(a) * rr; pos[i * 3 + 2] = c.z + Math.sin(t * 0.7 + i) * 0.25;
    }
    g.attributes.position.needsUpdate = true;
  });
  clickables.push({ mesh: disc, onClick: () => say('이 문은 아직 열리지 않아. 다음 시범에서 열어 볼게!', new THREE.Vector3(c.x, c.y + P.radius + 0.3, c.z + 0.3)) });
}

// ───────────── 안내판 ─────────────
function buildSigns() {
  const a = signBoard('← 학교 교정', '', '#3d5a3a', '#f4c060'); a.position.set(-9.35, 0, 14.6); scene.add(a);
  const b = signBoard('가상 구역 →', '', '#1f2a4a', '#5fe0ff'); b.position.set(9.35, 0, 14.6); scene.add(b);
  // 남쪽 문 위 가로 간판
  const gate = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 0.18), new THREE.MeshLambertMaterial({ color: '#3a3f47' })); bar.position.y = 2.8; gate.add(bar);
  const tex = canvasTex(1024, 180, (g, w, h) => {
    g.fillStyle = '#26304a'; roundRect(g, 4, 4, w - 8, h - 8, 30); g.fill();
    g.fillStyle = '#ffffff'; g.font = `700 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('융합 광장', w / 2, h / 2 + 4);
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  panel.position.y = 3.4; gate.add(panel);
  for (const sx of [-1.2, 1.2]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), bar.material); r.position.set(sx, 2.97, 0); gate.add(r); }
  gate.position.set(0, 0, 20.0); scene.add(gate);
}

// ───────────── 리니 ─────────────
function setupRini(gltf) {
  const model = gltf.scene, root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  model.traverse(o => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    if (o.name && /^Icosphere/i.test(o.name)) o.visible = false;
    for (const m of [].concat(o.material)) { m.metalness = 0; m.metalnessMap = null; if (m.map) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.12; } m.envMapIntensity = 0.5; m.needsUpdate = true; }
  });
  riniMixer = new THREE.AnimationMixer(model);
  const find = k => gltf.animations.find(a => a.name.toLowerCase().includes(k));
  const idle = find('idle') || gltf.animations[0], talk = find('talk'); let wave = find('wave2') || find('wave');
  if (wave) { wave = wave.clone(); const s = 1.4, e = Math.min(5.0, wave.duration); wave.tracks.forEach(tr => { tr.trim(s, e); tr.shift(-s); }); wave.duration = e - s; }
  if (idle) riniActs.idle = riniMixer.clipAction(idle);
  if (talk) riniActs.talk = riniMixer.clipAction(talk);
  if (wave) { riniActs.wave = riniMixer.clipAction(wave); riniActs.wave.setLoop(THREE.LoopOnce, 1); riniActs.wave.clampWhenFinished = true; }
  if (riniActs.idle) { riniActs.idle.play(); riniCur = riniActs.idle; }
  riniMixer.update(0.01);
  inner.add(model); model.updateMatrixWorld(true);
  model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
  const box = new THREE.Box3().setFromObject(model, true), h = box.max.y - box.min.y || 1.7;
  const s = 1.2 / h; inner.scale.setScalar(s);
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  root.position.set(...layout.rini); scene.add(root);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(layout.rini[0], 0.015, layout.rini[2]); scene.add(sh);
  riniHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.35, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  riniHit.position.set(layout.rini[0], 0.68, layout.rini[2]); scene.add(riniHit);
  clickables.push({ mesh: riniHit, onClick: riniTalk });
  colliders.push({ type: 'circle', c: [layout.rini[0], layout.rini[2]], r: 0.45 });
  riniMixer.addEventListener('finished', e => { if (e.action === riniActs.wave) playRini(bubble && bubble.visible && riniActs.talk ? 'talk' : 'idle', 0.4); });
  rini = root;
  anim.push((t, dt) => {
    riniMixer.update(dt);
    const hp = camera.getWorldPosition(new THREE.Vector3()), d = hp.sub(root.position); d.y = 0;
    if (d.lengthSq() > 0.01) { const want = Math.atan2(d.x, d.z); let df = want - root.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); root.rotation.y += df * (1 - Math.exp(-3 * dt)); }
  });
  log('rini loaded', 'height', h.toFixed(2), 'clips', gltf.animations.map(a => a.name).join(','));
}
function playRini(name, dur = 0.3) {
  const a = riniActs[name]; if (!a || a === riniCur) return;
  a.reset(); a.play(); if (riniCur) riniCur.crossFadeTo(a, dur, false); riniCur = a;
}
function riniTalk() {
  riniLine = (riniLine + 1) % RINI_LINES.length;
  say(RINI_LINES[riniLine]);
  if (riniActs.wave && riniLine === 0) playRini('wave', 0.25); else playRini('talk', 0.3);
}

// 말풍선(리니 머리 위, 화면·VR 모두). at: 말풍선 아래 끝 자리(없으면 리니 머리 위)
function say(text, at) {
  const tex = canvasTex(1024, 300, (g, w, h) => {
    g.font = `600 54px ${FONT}`; const lines = wrapText(g, text, w - 120);
    const bh = Math.min(h - 40, 70 + lines.length * 66);
    g.fillStyle = 'rgba(255,255,255,0.96)'; roundRect(g, 10, 10, w - 20, bh, 40); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 26, bh + 8); g.lineTo(w / 2, bh + 34); g.lineTo(w / 2 + 26, bh + 8); g.fill();
    g.fillStyle = '#26304a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((ln, i) => g.fillText(ln, w / 2, 10 + bh / 2 + (i - (lines.length - 1) / 2) * 66));
  });
  if (!bubble) {
    bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false })); bubble.renderOrder = 20; scene.add(bubble);
  } else { bubble.material.map.dispose(); bubble.material.map = tex; bubble.material.needsUpdate = true; }
  const p = at || (rini ? new THREE.Vector3(rini.position.x, 1.25, rini.position.z) : new THREE.Vector3(...layout.portal.center));
  bubble.position.set(p.x, p.y + 0.7, p.z);
  bubble.scale.set(2.3, 0.675, 1); bubble.visible = true; bubbleTimer = 6.5;
}

// ───────────── 이동·보기 ─────────────
const keys = new Set();
addEventListener('keydown', e => { keys.add(e.code); });
addEventListener('keyup', e => { keys.delete(e.code); });
const stick = { x: 0, y: 0, id: null };
let drag = null;
const el = renderer.domElement;
const capture = (node, id) => { try { node.setPointerCapture(id); } catch (e) {} };
el.addEventListener('pointerdown', e => { if (!started) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }; capture(el, e.pointerId); });
el.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const k = MOBILE ? 0.006 : 0.0045;
  yaw -= (e.clientX - drag.x) * k; pitch = clamp(pitch - (e.clientY - drag.y) * k, -1.2, 1.2);
  drag.x = e.clientX; drag.y = e.clientY;
});
el.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
  if (moved < 8 && performance.now() - drag.t < 500) clickAt(e.clientX, e.clientY);
  drag = null;
});
const stickEl = $('stick'), knob = stickEl.querySelector('i');
function stickMove(e) {
  const r = stickEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = r.width / 2 - 10, d = Math.hypot(dx, dy);
  if (d > m) { dx *= m / d; dy *= m / d; }
  stick.x = dx / m; stick.y = dy / m; knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
stickEl.addEventListener('pointerdown', e => { stick.id = e.pointerId; capture(stickEl, e.pointerId); stickMove(e); e.stopPropagation(); });
stickEl.addEventListener('pointermove', e => { if (e.pointerId === stick.id) stickMove(e); });
const stickEnd = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);

const ray = new THREE.Raycaster();
function clickAt(x, y) {
  rig.rotation.y = yaw; camera.rotation.set(pitch, 0, 0, 'YXZ'); rig.updateMatrixWorld(true);
  ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  hit(ray);
}
function hit(r) {
  const hits = r.intersectObjects(clickables.map(c => c.mesh), false);
  if (!hits.length || hits[0].distance > 14) return false;
  clickables.find(c => c.mesh === hits[0].object).onClick(); return true;
}

function collide(p) {
  const R = 0.3;
  for (const c of colliders) {
    if (c.type === 'circle') {
      const dx = p.x - c.c[0], dz = p.z - c.c[1], d = Math.hypot(dx, dz), m = c.r + R;
      if (d < m && d > 1e-6) { p.x = c.c[0] + dx / d * m; p.z = c.c[1] + dz / d * m; }
    } else {
      const nx = clamp(p.x, c.min[0], c.max[0]), nz = clamp(p.z, c.min[1], c.max[1]);
      const dx = p.x - nx, dz = p.z - nz, d = Math.hypot(dx, dz);
      if (d < R) {
        if (d > 1e-6) { p.x = nx + dx / d * R; p.z = nz + dz / d * R; }
        else {
          const opts = [[c.min[0] - R - p.x, 0], [c.max[0] + R - p.x, 0], [0, c.min[1] - R - p.z], [0, c.max[1] + R - p.z]];
          opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1])); p.x += opts[0][0]; p.z += opts[0][1];
        }
      }
    }
  }
  const B = layout.bounds; p.x = clamp(p.x, B.min[0], B.max[0]); p.z = clamp(p.z, B.min[1], B.max[1]);
}

// [x, z, yaw, pitch] — yaw 0 = 북쪽(−z)을 봄
const SHOTS = {
  spawn: [0, 17.5, 0, -0.05], lawn: [-24, 14, -0.41, 0.04], virtual: [6, 16, -0.61, -0.06], portal: [0, 0.2, 0, 0.12],
  rini: [2.6, 11.4, 0, -0.16], aerial: [24, 40, 0.54, -0.55], gate: [0, 23.5, 0, 0.05],
};
function placeAt(name) {
  const s = SHOTS[name] || SHOTS.spawn; rig.position.set(s[0], 0, s[1]); yaw = s[2]; pitch = s[3];
  if (name === 'aerial') rig.position.y = 26;
}

// ───────────── 시작·VR ─────────────
let started = false;
function startFlat() {
  started = true; $('cover').style.display = 'none';
  if (MOBILE) stickEl.style.display = 'block';
  const help = $('help');
  help.textContent = MOBILE ? '왼쪽 아래 동그라미로 걷고, 화면을 끌어 둘러봐요 · 리니를 톡' : '끌어서 둘러보기 · WASD·방향키로 걷기 · 리니를 눌러 보세요';
  help.style.display = 'block'; setTimeout(() => { help.style.opacity = '0'; }, 7000);
}
$('flatBtn').addEventListener('click', startFlat);

const vrBtn = $('vrBtn');
if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then(ok => {
    if (ok) { vrBtn.disabled = false; vrBtn.textContent = 'VR로 들어가기'; }
    else { vrBtn.textContent = 'VR 기기가 아니에요'; $('note').textContent = 'VR은 퀘스트 같은 기기의 브라우저에서 열어 주세요.'; }
  }).catch(() => { vrBtn.textContent = 'VR 기기가 아니에요'; });
} else { vrBtn.textContent = 'VR 기기가 아니에요'; }
vrBtn.addEventListener('click', async () => {
  try {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    await renderer.xr.setSession(session); started = true; $('cover').style.display = 'none';
    camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
    session.addEventListener('end', () => { camera.position.set(0, EYE, 0); });
  } catch (e) { $('note').textContent = 'VR을 열지 못했어요: ' + (e && e.message); }
});

// VR 손잡이: 왼쪽 막대 = 걷기, 오른쪽 막대 = 30도씩 돌기, 방아쇠 = 누르기
const ctrls = [0, 1].map(i => {
  const c = renderer.xr.getController(i);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -5)]), new THREE.LineBasicMaterial({ color: '#9fe4ff' }));
  c.add(line); rig.add(c);
  c.addEventListener('select', () => {
    const m = new THREE.Matrix4().extractRotation(c.matrixWorld);
    const r = new THREE.Raycaster(); r.ray.origin.setFromMatrixPosition(c.matrixWorld); r.ray.direction.set(0, 0, -1).applyMatrix4(m); hit(r);
  });
  return c;
});
let snapCool = 0;
function xrInput(dt) {
  const s = renderer.xr.getSession(); if (!s) return;
  for (const src of s.inputSources) {
    const gp = src.gamepad; if (!gp || gp.axes.length < 4) continue;
    const ax = gp.axes[2], ay = gp.axes[3];
    if (src.handedness === 'left') {
      if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) {
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
        const right = new THREE.Vector3(-dir.z, 0, dir.x);
        rig.position.addScaledVector(dir, -ay * 2.0 * dt).addScaledVector(right, ax * 2.0 * dt);
        collide(rig.position);
      }
    } else if (src.handedness === 'right') {
      snapCool -= dt;
      if (Math.abs(ax) > 0.65 && snapCool <= 0) {
        const head = camera.getWorldPosition(new THREE.Vector3()); const ang = -Math.sign(ax) * Math.PI / 6;
        rig.position.sub(head).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).add(head); rig.rotation.y += ang; snapCool = 0.35;
      }
    }
  }
}

// ───────────── 매 장면 ─────────────
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), side = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (renderer.xr.isPresenting) xrInput(dt);
  else {
    rig.rotation.y = yaw; camera.rotation.set(pitch, 0, 0, 'YXZ');
    if (started) {
      let mx = 0, mz = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) mz -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      mx += stick.x; mz += stick.y;
      const len = Math.hypot(mx, mz);
      if (len > 0.05 && layout) {
        const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2.3) * Math.min(len, 1) / len;
        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); side.set(Math.cos(yaw), 0, -Math.sin(yaw));
        rig.position.addScaledVector(fwd, -mz * sp * dt).addScaledVector(side, mx * sp * dt);
        if (rig.position.y < 1) collide(rig.position);
      }
    }
  }
  for (const f of anim) f(t, dt);
  if (bubble && bubble.visible) {
    bubbleTimer -= dt; if (bubbleTimer <= 0) { bubble.visible = false; if (riniCur === riniActs.talk) playRini('idle', 0.5); }
    const k = clamp(camera.getWorldPosition(new THREE.Vector3()).distanceTo(bubble.position) / 4.5, 1, 2.6);   // 멀리서도 읽히게
    bubble.scale.set(2.3 * k, 0.675 * k, 1);
  }
  sky.position.copy(camera.getWorldPosition(new THREE.Vector3()));
  if (renderer.xr.isPresenting || !FX) renderer.render(scene, camera); else composer.render();
});

main().catch(e => { log('failed', e && (e.stack || e.message)); $('loading').textContent = '불러오지 못했어요. 새로 고쳐 주세요.'; });
