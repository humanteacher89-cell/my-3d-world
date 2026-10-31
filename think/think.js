// 생각놀이섬 시범판(2026-11-01, 데스크톱) — 블렌더로 빛을 구운 섬(assets/island.glb) 위를 걸으며 리니와 오늘의 수수께끼 하나로
// 질문의 숲(A) → 확인 다리(C) → 해 보기 공방(T) → 약속 언덕을 한 바퀴 돈다. 본보기는 융합 광장 plaza.js(구운 GLB · 1인칭 걷기 · 휴대폰 막대).
// 글은 모두 kids.config.js(window.KIDS_CONFIG). 땅 높이는 블렌더 island_build.py의 H(x, y)를 그대로 옮긴 것(layout.json의 ground 값).
// 좌표: 논리는 블렌더 좌표(x 동, y 북)로 하고 그릴 때만 three (x, 높이, -y)로 바꾼다.
// 주소: ?lite=1|0 폰판 GLB, ?fx=0 빛 번짐 끔, ?reset=1 진행 지우기, ?at=forest|bridge|shop|hill 그 앞에서 시작(시험용, 앞 단계는 끝난 것으로).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const C = window.KIDS_CONFIG, U = C.ui;
let R = null;     // 지금 수수께끼 = 공통 글(C.riddle) + 그 수수께끼(C.riddles[]) — useRiddle()
const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const log = (...a) => console.log('[THINK]', ...a);
const MOBILE = matchMedia('(pointer: coarse)').matches;
const FX = Q.get('fx') !== '0';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const KEY = C.id + ':v1';
const lsGet = d => { try { const v = localStorage.getItem(KEY); return v ? Object.assign({}, d, JSON.parse(v)) : d; } catch (e) { return d; } };
const lsSet = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ACT_COL = { A: '#f0a91e', C: '#23a98f', T: '#ec5f4b', end: '#8a6cf0' };
const STEPS = ['meet', 'forest', 'bridge', 'shop', 'hill', 'done'];

// ───────────── 진행 상태(이 기기에만) ─────────────
// rid = 지금 수수께끼, solved = 다 푼 수수께끼(다시 하면 안 푼 것부터)
const S0 = { step: 'meet', my: -1, sure: 1, guess: -1, methods: [], l2: -1, l3: -1, promise: -1, name: '', badges: [], rid: null, solved: [] };
if (Q.get('reset') === '1') lsSet(S0);
let S = lsGet(S0);
if (!Array.isArray(S.solved)) S.solved = [];
const save = () => lsSet(S);
if (Q.get('at')) {     // 시험용: 그 구역 앞에서, 앞 단계는 끝난 것으로
  const at = Q.get('at'), i = STEPS.indexOf(at);
  if (i > 0) { S = Object.assign({}, S0, { step: at, my: 1, sure: 1, guess: 1, methods: [0, 1], l2: 0, l3: 0, badges: ['A', 'C', 'T'].slice(0, Math.max(0, i - 1)), rid: S.rid, solved: S.solved }); }
}
if (Q.get('rid')) S.rid = Q.get('rid');     // 시험용: ?rid=magnet
function pickRiddle() { const ids = C.riddles.map(r => r.id), left = ids.filter(i => !S.solved.includes(i)); return (left.length ? left : ids)[0]; }
function useRiddle() {
  if (!S.rid || !C.riddles.some(r => r.id === S.rid)) { S.rid = pickRiddle(); save(); }
  R = Object.assign({}, C.riddle, C.riddles.find(r => r.id === S.rid));
}
useRiddle();

// ───────────── 기본 틀 ─────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;          // 구운 그림은 블렌더(Standard)에서 이미 색이 정해짐
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1500);
const EYE = 1.45;
let yaw = 0, pitch = -0.08;
scene.fog = new THREE.Fog('#cfe6fb', 60, 220);
scene.add(new THREE.HemisphereLight('#eaf4ff', '#7ea35a', 1.5));
const sunLight = new THREE.DirectionalLight('#fff4e2', 2.2); scene.add(sunLight);

// 하늘: 블렌더 하늘(위 진한 파랑 · 지평선 밝은 하늘색 · 아래 하늘색)과 같은 꼴
const skyMat = new THREE.ShaderMaterial({
  uniforms: { cTop: { value: new THREE.Color('#5d9ff0') }, cHor: { value: new THREE.Color('#d6ebff') }, cBot: { value: new THREE.Color('#9cc8f4') } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 cTop, cHor, cBot; varying vec3 vDir;
    void main(){ vec3 d = normalize(vDir); float e = d.y;
      vec3 col = e > 0.0 ? mix(cHor, cTop, pow(smoothstep(0.0, 0.85, e), 0.8)) : mix(cHor, cBot, smoothstep(0.0, 0.5, -e));
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 40, 20), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

const rt = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: MOBILE ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.45, 0.985);   // 등불 · 고리만 살짝(말풍선 흰 바탕은 번지지 않게)
if (FX) composer.addPass(bloom);
composer.addPass(new OutputPass());
function fitFov() { const a = innerWidth / innerHeight; camera.fov = clamp(2 * Math.atan(Math.tan(28 * Math.PI / 180) / a) * 180 / Math.PI, 66, 92); }
fitFov(); camera.updateProjectionMatrix();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; fitFov(); camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });

const V3 = (x, y, z = 0) => new THREE.Vector3(x, z, -y);     // 블렌더 (x, y, z) → three

// ───────────── 땅 높이(island_build.py의 H를 그대로) ─────────────
let L = null, GR = null;
const rmax = t => GR.R0 * (1 + 0.05 * Math.sin(3 * t + 0.4) + 0.035 * Math.cos(5 * t + 1.3));
const polar = (x, y) => { const xs = x / GR.SX, t = Math.atan2(y, xs); return Math.hypot(xs, y) / rmax(t); };
const ys = x => 4.0 + 1.5 * Math.sin(x * 0.25);
function carve(x, y) {
  const c = 0.6 * Math.exp(-(((y - ys(x)) / 0.95) ** 2)) * smooth(-14.2, -13.2, x);
  return Math.max(c, 0.6 * Math.exp(-((Math.hypot(x - GR.POND[0], y - GR.POND[1]) / 1.55) ** 2)));
}
function H(x, y) {
  const rho = polar(x, y);
  let h = 0.75 * (1 - Math.min(rho, 1) ** 2.4) + 2.8 * Math.exp(-((x - GR.HILL[0]) ** 2 + (y - GR.HILL[1]) ** 2) / (2 * 9)) + 0.12 * Math.sin(x * 0.55 + 1) * Math.cos(y * 0.45);
  for (const [cx, cy, r1, r2, hf] of GR.FLATS) { const f = 1 - smooth(r1, r2, Math.hypot(x - cx, y - cy)); h = h * (1 - f) + hf * f; }
  return h - carve(x, y);
}
const PLAZA = { x: 0, y: -3 };
function bridgeZ(y) { const B = L.bridge, u = clamp((y - B.y0) / (B.y1 - B.y0), 0, 1); return B.z0 + (B.z1 - B.z0) * u + B.arc * Math.sin(Math.PI * u) + 0.06 + 0.05; }
function onBridge(x, y) { const B = L.bridge; return Math.abs(x - B.x) < B.half && y > B.y0 - 0.3 && y < B.y1 + 0.3; }
function floorZ(x, y) {
  let z = H(x, y);
  if (Math.hypot(x - PLAZA.x, y - PLAZA.y) < 4.3) z = Math.max(z, H(PLAZA.x, PLAZA.y) + 0.09);
  const A = L.arrive; if (Math.hypot(x - A.pad[0], y - A.pad[1]) < A.r) z = Math.max(z, A.pad[2]);
  if (bridgeOpen && onBridge(x, y)) z = Math.max(z, bridgeZ(y));
  return z;
}
let bridgeOpen = false;
// 걸을 수 있나: 섬 안쪽 · 시냇물 · 샘 밖(다리는 판이 놓인 뒤)
function blockedWhy(x, y) {
  if (polar(x, y) > 0.9) return 'edge';
  if (onBridge(x, y)) return bridgeOpen ? null : 'bridge';
  if (x > L.stream.pond[0] + 0.3 && x < L.stream.xe + 2 && Math.abs(y - ys(x)) < L.stream.half) return 'water';
  return null;
}

// ───────────── 불러오기 ─────────────
// 비공개 아티팩트 미리보기판은 window.THINK_ASSETS = { island, lite, draco:false }로 Draco 없는 GLB를 쓴다(그곳에선 CDN에서 풀개를 못 받음)
const AS = window.THINK_ASSETS || {};
const gltfLoader = new GLTFLoader();
if (AS.draco !== false) gltfLoader.setDRACOLoader(new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/'));
const LITE = Q.has('lite') ? Q.get('lite') !== '0' : MOBILE;
const progress = {};
function setProgress(k, f) { progress[k] = f; const v = Object.values(progress); $('loading').textContent = `${U.loading} ${Math.round(v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1) * 100)}%`; }
const loadGLB = (url, key) => new Promise((res, rej) => gltfLoader.load(url, res, e => { if (e.total) setProgress(key, e.loaded / e.total); }, rej));

const P = { x: 0, y: -12.4, z: 0 };     // 나(블렌더 좌표)
const anim = [];
const clickables = [];
let lini = null, liniMixer = null, liniActs = {}, liniCur = null, liniPath = [], liniFace = null;
const LP = { x: 0, y: 0, z: 0 };
let bubble = null, bubbleT = 0, marker = null, planks = [], flag = null;

async function main() {
  L = await (await fetch('assets/layout.json')).json(); GR = L.ground;
  const sd = new THREE.Vector3(...L.sun).normalize(); sunLight.position.copy(sd).multiplyScalar(50);
  setProgress('island', 0); setProgress('lini', 0);
  const [island, liniG] = await Promise.all([
    loadGLB(LITE ? (AS.lite || 'assets/island-m.glb') : (AS.island || 'assets/island.glb'), 'island'),
    loadGLB(AS.lini || 'assets/rini-lite.glb', 'lini').catch(e => { log('lini failed', e && e.message); return null; }),
  ]);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  island.scene.traverse(o => {
    if (!o.isMesh) return;
    const m0 = o.material, map = m0.map;
    if (map) { map.anisotropy = aniso; map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping; map.needsUpdate = true; o.material = new THREE.MeshBasicMaterial({ map, fog: true }); }
    else {   // EM_(물 · 폭포 · 등불 · 승강장 고리): 블렌더 기본색을 빛 없이 그대로
      const col = (m0.color || new THREE.Color('#fff')).clone();
      o.material = new THREE.MeshBasicMaterial({ color: col, fog: true });
      if (/water/i.test(o.name) || /water/i.test(m0.name)) o.userData.water = true;
    }
    o.matrixAutoUpdate = false; o.updateMatrix();
  });
  scene.add(island.scene);
  if (liniG) setupLini(liniG);
  buildPlanks(); buildMarker(); buildFlag();
  bridgeOpen = S.badges.includes('C');
  if (bridgeOpen) planks.forEach((p, i) => placePlank(p, i, 1));
  const at = Q.get('at') && L.zones[Q.get('at')];
  if (at) { const z = L.zones[Q.get('at')]; P.x = z.at[0]; P.y = z.at[1] - 3.2; if (Q.get('at') === 'shop') { P.x = z.at[0] - 2.2; P.y = z.at[1] - 1.6; } if (Q.get('at') === 'hill') { P.x = z.at[0] + 3.0; P.y = z.at[1] + 0.6; } }
  else { P.x = L.spawn[0]; P.y = L.spawn[1]; }
  P.z = floorZ(P.x, P.y);
  const st = S.step === 'meet' ? L.lini : (L.zones[S.step] || L.zones.hill).lini;
  LP.x = st[0]; LP.y = st[1]; LP.z = floorZ(LP.x, LP.y);
  if (at) { yaw = Math.atan2(-(L.zones[Q.get('at')].at[0] - P.x), L.zones[Q.get('at')].at[1] - P.y); }
  $('loading').style.display = 'none';
  const has = S.step !== 'meet' || S.badges.length;
  $('startBtn').disabled = false; $('startBtn').textContent = has ? U.resume : U.start;
  $('restartBtn').hidden = !has;
  updateHUD();
  window.THINK = { S, P, LP, L, H, floorZ, go: z => goZone(z), open: k => openZone(k), tick: (t, dt = 1 / 60) => { for (const f of anim) f(t, dt); }, look: (y, p = 0) => { yaw = y; pitch = p; }, place: (x, y) => { P.x = x; P.y = y; P.z = floorZ(x, y); }, ready: true };
  if (Q.get('auto')) startGame();
  log('ready', LITE ? 'lite' : 'full');
}

// ───────────── 리니 ─────────────
function setupLini(gltf) {
  const model = gltf.scene, root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  model.traverse(o => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    if (o.name && /^Icosphere/i.test(o.name)) o.visible = false;      // rini-lite.glb에 같이 든 군더더기
    for (const m of [].concat(o.material)) { m.metalness = 0; m.metalnessMap = null; if (m.map) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.16; } m.needsUpdate = true; }
  });
  liniMixer = new THREE.AnimationMixer(model);
  const find = k => gltf.animations.find(a => a.name.toLowerCase().includes(k));
  const idle = find('idle') || gltf.animations[0], talk = find('talk'); let wave = find('wave2') || find('wave');
  if (wave) { wave = wave.clone(); const s = 1.4, e = Math.min(5.0, wave.duration); wave.tracks.forEach(tr => { tr.trim(s, e); tr.shift(-s); }); wave.duration = e - s; }
  if (idle) liniActs.idle = liniMixer.clipAction(idle);
  if (talk) liniActs.talk = liniMixer.clipAction(talk);
  if (wave) { liniActs.wave = liniMixer.clipAction(wave); liniActs.wave.setLoop(THREE.LoopOnce, 1); liniActs.wave.clampWhenFinished = true; }
  if (liniActs.idle) { liniActs.idle.play(); liniCur = liniActs.idle; }
  liniMixer.update(0.01); inner.add(model); model.updateMatrixWorld(true);
  model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
  const box = new THREE.Box3().setFromObject(model, true), h = box.max.y - box.min.y || 1.7;
  inner.scale.setScalar(1.3 / h);
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  scene.add(root);
  const shadowTex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(20,40,20,0.45)'); r.addColorStop(1, 'rgba(20,40,20,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; scene.add(sh);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.9), new THREE.MeshBasicMaterial({ visible: false })); scene.add(hit);
  clickables.push({ mesh: hit, onClick: liniTap });
  liniMixer.addEventListener('finished', e => { if (e.action === liniActs.wave) playLini(bubble && bubble.visible && liniActs.talk ? 'talk' : 'idle', 0.4); });
  lini = root;
  anim.push((t, dt) => {
    liniMixer.update(dt);
    let moving = false;
    if (liniPath.length) {      // 길을 따라 미끄러지듯(걷기 동작이 없는 로봇)
      const [tx, ty] = liniPath[0], dx = tx - LP.x, dy = ty - LP.y, d = Math.hypot(dx, dy), sp = 3.6 * dt;     // 나(2.6)보다 빨라 앞장선다
      if (d <= sp) { LP.x = tx; LP.y = ty; liniPath.shift(); if (!liniPath.length && liniFace) liniFace = null; }
      else { LP.x += dx / d * sp; LP.y += dy / d * sp; moving = true; root.rotation.y = turn(root.rotation.y, Math.atan2(dx, -dy), dt, 8); }
    }
    LP.z = floorZ(LP.x, LP.y);
    root.position.copy(V3(LP.x, LP.y, LP.z + (moving ? Math.abs(Math.sin(t * 9)) * 0.05 : 0)));
    sh.position.copy(V3(LP.x, LP.y, LP.z + 0.02)); hit.position.copy(V3(LP.x, LP.y, LP.z + 0.7));
    if (!moving) { const dx = P.x - LP.x, dy = P.y - LP.y; if (dx * dx + dy * dy > 0.01) root.rotation.y = turn(root.rotation.y, Math.atan2(dx, -dy), dt, 3); }
  });
}
function turn(cur, want, dt, k) { let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); return cur + d * (1 - Math.exp(-k * dt)); }
function playLini(name, dur = 0.3) { const a = liniActs[name]; if (!a || a === liniCur) return; a.reset(); a.play(); if (liniCur) liniCur.crossFadeTo(a, dur, false); liniCur = a; }
let tapI = -1;
function liniTap() {
  if (S.step === 'meet' && near(L.lini, 6)) { openZone('meet'); return; }
  const zk = S.step === 'done' ? 'hill' : S.step, z = L.zones[zk];     // 다 끝난 뒤 언덕의 리니를 누르면 탐험대원증 · 새 수수께끼
  if (z && Math.hypot(P.x - z.at[0], P.y - z.at[1]) < z.r + 2.5) { openZone(zk); return; }
  tapI = (tapI + 1) % C.lini.tap.length; say(S.step === 'done' ? C.lini.done : C.lini.tap[tapI]); playLini(tapI === 0 && liniActs.wave ? 'wave' : 'talk');
}
function liniWalk(leg, extra) { const pts = (L.legs[leg] || []).slice(); if (extra) pts.push(extra); liniPath = pts; }

// ───────────── 도우미 ─────────────
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
function wrapText(g, text, maxW) {
  const out = []; let line = '';
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width <= maxW) { line = t; continue; } if (line) out.push(line); line = word; }
  if (line) out.push(line); return out;
}
function say(text) {      // 리니 머리 위 말풍선
  const tex = canvasTex(1024, 300, (g, w, h) => {
    g.font = `700 52px ${FONT}`; const lines = wrapText(g, text, w - 120).slice(0, 3), bh = Math.min(h - 40, 66 + lines.length * 64);
    g.fillStyle = 'rgba(255,255,255,0.97)'; roundRect(g, 10, 10, w - 20, bh, 40); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 26, bh + 8); g.lineTo(w / 2, bh + 34); g.lineTo(w / 2 + 26, bh + 8); g.fill();
    g.fillStyle = '#3a3550'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((ln, i) => g.fillText(ln, w / 2, 10 + bh / 2 + (i - (lines.length - 1) / 2) * 64));
  });
  if (!bubble) { bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false })); bubble.renderOrder = 20; scene.add(bubble); }
  else { bubble.material.map.dispose(); bubble.material.map = tex; bubble.material.needsUpdate = true; }
  bubble.visible = true; bubbleT = 6.5; playLini('talk'); sfx('talk');
}
function near(pt, r) { return Math.hypot(P.x - pt[0], P.y - pt[1]) < r; }

// ───────────── 소리(웹오디오로 합성, 파일 없음 · 켜기/끄기는 이 기기에 저장) ─────────────
let AC = null, SND = (() => { try { return localStorage.getItem(KEY + ':snd') !== '0'; } catch (e) { return true; } })();
function audioOn() {      // 소리는 사용자가 누른 뒤에만 켤 수 있다(들어가기 단추에서)
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}
function tone(f, t0, dur, type = 'sine', vol = 0.1, f2) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.03);
}
function hiss(t0, dur, vol, f0, f1) {      // 바람 · 휙 소리: 흰 소음 + 띠 거르개
  const n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(AC.destination); src.start(t0);
}
function sfx(name) {
  if (!SND || !AC || AC.state !== 'running') return;
  const t = AC.currentTime;
  try {
    ({
      tap: () => tone(660, t, 0.07, 'triangle', 0.07),
      pop: () => tone(520, t, 0.12, 'sine', 0.08, 780),
      talk: () => { tone(880, t, 0.05, 'sine', 0.04); tone(1046, t + 0.06, 0.05, 'sine', 0.035); },
      ok: () => { tone(660, t, 0.12, 'triangle', 0.09); tone(880, t + 0.09, 0.18, 'triangle', 0.09); },
      no: () => tone(311, t, 0.2, 'square', 0.035, 220),
      badge: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.24, 'triangle', 0.09)),
      plank: () => { hiss(t, 0.9, 0.08, 300, 2200); tone(392, t + 0.95, 0.12, 'triangle', 0.09); tone(523, t + 1.1, 0.2, 'triangle', 0.09); },
      flag: () => tone(392, t, 0.7, 'sine', 0.08, 784),
      wind: () => hiss(t, 1.2, 0.05, 700, 3200)
    })[name]();
  } catch (e) {}
}
function setSound(on) { SND = on; try { localStorage.setItem(KEY + ':snd', on ? '1' : '0'); } catch (e) {} $('sndBtn').textContent = on ? U.soundOn : U.soundOff; $('sndBtn').classList.toggle('off', !on); if (on) { audioOn(); sfx('pop'); } }
$('sndBtn').addEventListener('click', () => setSound(!SND));

// 다리 빈칸에 놓일 판 둘(맞게 확인하면 둑에서 날아가 제자리로)
function buildPlanks() {
  const mat = new THREE.MeshLambertMaterial({ color: '#d7a06e' });
  L.bridge.stack.forEach((s, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.25), mat);
    m.position.copy(V3(s[0], s[1], s[2])); m.rotation.y = s[3]; scene.add(m);
    planks.push({ m, from: m.position.clone(), fromR: s[3], to: V3(...L.bridge.planks[i]), t: 0, go: false });
  });
  anim.push((t, dt) => { planks.forEach((p, i) => { if (!p.go || p.t >= 1) return; p.t = Math.min(1, p.t + dt / 1.4); placePlank(p, i, p.t); }); });
}
function placePlank(p, i, k) {
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  p.m.position.lerpVectors(p.from, p.to, e); p.m.position.y += Math.sin(Math.PI * e) * 1.6; p.m.rotation.y = p.fromR * (1 - e); p.m.rotation.z = Math.sin(Math.PI * e) * 0.6;
  p.t = k;
}
// 다음에 갈 곳: 빛 고리 + 빛기둥
function buildMarker() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; g.add(ring);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#ffd34d') } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float a = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.2) * 0.16; gl_FragColor = vec4(uCol * a, 1.0);
      #include <colorspace_fragment>
    }`, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.0, 7, 24, 1, true), beamMat); beam.geometry.translate(0, 3.5, 0); g.add(beam);
  scene.add(g); marker = { g, ring, beam };
  anim.push(t => {
    if (!g.visible) return; const s = 1 + Math.sin(t * 3) * 0.08; ring.scale.set(s, s, s); ring.position.y = 0.06 + Math.sin(t * 3) * 0.04;
    const d = Math.hypot(P.x - g.position.x, P.y + g.position.z); ring.visible = !cardOpen && d > 1.6; beam.visible = ring.visible && S.step !== 'meet';   // 다 왔으면(카드가 열리면) 숨김
  });
}
function setMarker() {
  const zk = S.step === 'meet' ? null : S.step, z = zk && L.zones[zk];
  let pt = null, col = '#ffffff';
  if (S.step === 'meet') { pt = L.lini; col = '#ffd34d'; }
  else if (z) { pt = z.at; col = ACT_COL[C.zones[zk].act] || '#fff'; }
  marker.g.visible = !!pt;
  if (!pt) return;
  marker.g.position.copy(V3(pt[0], pt[1], floorZ(pt[0], pt[1])));
  marker.ring.material.color.set(col).multiplyScalar(1.15); marker.beam.material.uniforms.uCol.value.set(col);   // 리니에게 갈 때는 빛기둥 없이 고리만(매 장면에서)
}
// 약속 언덕에 올라가는 깃발(고른 약속)
function buildFlag() {
  const top = L.hill.top, bx = top[0] + 0.9, by = top[1] - 0.9, bz = H(bx, by);
  const g = new THREE.Group(); g.position.copy(V3(bx, by, bz));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 10), new THREE.MeshLambertMaterial({ color: '#ffffff' })); pole.position.y = 1.6; g.add(pole);
  const geo = new THREE.PlaneGeometry(1.1, 0.7, 10, 4); geo.translate(0.58, 0, 0);
  const cloth = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#8a6cf0', side: THREE.DoubleSide })); cloth.position.y = 0.5; g.add(cloth);
  scene.add(g); flag = { g, cloth, up: S.promise >= 0 ? 1 : 0, go: S.promise >= 0 };
  const base = geo.attributes.position.array.slice();
  anim.push((t, dt) => {
    if (flag.go && flag.up < 1) flag.up = Math.min(1, flag.up + dt / 2.2);
    cloth.position.y = 0.5 + flag.up * 2.35;
    const a = geo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) { const x = base[i]; a[i + 2] = Math.sin(x * 4 - t * 5) * 0.08 * x; }
    geo.attributes.position.needsUpdate = true;
  });
}

// ───────────── 이동·보기 ─────────────
const keys = new Set();
addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; keys.add(e.code); if (/Key[WASD]|Arrow/.test(e.code)) stopGuide(); });
addEventListener('keyup', e => keys.delete(e.code));
const stick = { x: 0, y: 0, id: null };
let drag = null, started = false, cardOpen = false;
const el = renderer.domElement;
const capture = (n, id) => { try { n.setPointerCapture(id); } catch (e) {} };
el.addEventListener('pointerdown', e => { if (!started) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }; capture(el, e.pointerId); });
el.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const k = MOBILE ? 0.006 : 0.0045; yaw -= (e.clientX - drag.x) * k; pitch = clamp(pitch - (e.clientY - drag.y) * k, -1.1, 0.9); drag.x = e.clientX; drag.y = e.clientY;
});
el.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8 && performance.now() - drag.t < 500) clickAt(e.clientX, e.clientY);
  drag = null;
});
const stickEl = $('stick'), knob = stickEl.querySelector('i');
function stickMove(e) {
  const r = stickEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = r.width / 2 - 10, d = Math.hypot(dx, dy);
  if (d > m) { dx *= m / d; dy *= m / d; }
  stick.x = dx / m; stick.y = dy / m; knob.style.transform = `translate(${dx}px, ${dy}px)`; if (d > 6) stopGuide();
}
stickEl.addEventListener('pointerdown', e => { stick.id = e.pointerId; capture(stickEl, e.pointerId); stickMove(e); e.stopPropagation(); });
stickEl.addEventListener('pointermove', e => { if (e.pointerId === stick.id) stickMove(e); });
const stickEnd = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
const ray = new THREE.Raycaster();
function clickAt(x, y) {
  ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(clickables.map(c => c.mesh), false);
  if (hits.length && hits[0].distance < 18) clickables.find(c => c.mesh === hits[0].object).onClick();
}
function collide(p) {
  const RR = 0.3;
  for (const [cx, cy, r] of L.colliders) { const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy), m = r + RR; if (d < m && d > 1e-6) { p.x = cx + dx / d * m; p.y = cy + dy / d * m; } }
  const dx = p.x - LP.x, dy = p.y - LP.y, d = Math.hypot(dx, dy); if (d < 1.3 && d > 1e-6) { p.x = LP.x + dx / d * 1.3; p.y = LP.y + dy / d * 1.3; }   // 리니 얼굴이 화면을 가리지 않게 1.3m 앞에서 멈춤
}
let warnT = 0;
function moveTo(nx, ny) {
  const q = { x: nx, y: ny }; collide(q);
  let why = blockedWhy(q.x, q.y);
  if (!why) { P.x = q.x; P.y = q.y; return true; }
  if (!blockedWhy(q.x, P.y)) { P.x = q.x; return true; }      // 막힌 쪽만 빼고 미끄러지듯
  if (!blockedWhy(P.x, q.y)) { P.y = q.y; return true; }
  if (warnT <= 0) { toast(why === 'bridge' ? C.hints.bridgeClosed : why === 'water' ? C.hints.water : C.hints.edge); warnT = 3.5; }
  return false;
}
// 길 안내: 지금 단계의 길을 따라 저절로 걷기
let guide = null;
function startGuide() {
  const leg = { meet: 'plaza', forest: 'forest', bridge: 'bridge', shop: S.badges.includes('C') ? 'shop' : 'bridge', hill: 'hill' }[S.step];
  if (!leg) return;
  let pts = L.legs[leg].slice();
  if (S.step === 'shop') pts = L.legs.cross.concat(pts);
  if (S.step === 'hill' && P.y < L.bridge.y0) pts = L.legs.cross.concat(L.legs.shop, pts);
  let best = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p[0] - P.x, p[1] - P.y); if (d < bd) { bd = d; best = i; } });
  guide = pts.slice(best); $('guideBtn').textContent = C.hints.guideStop; $('guideBtn').classList.add('on');
}
function stopGuide() { if (!guide) return; guide = null; $('guideBtn').textContent = C.hints.guide; $('guideBtn').classList.remove('on'); }
$('guideBtn').addEventListener('click', () => { if (guide) stopGuide(); else startGuide(); });

// ───────────── 구역 · 카드 ─────────────
function inZone() {
  if (cardOpen) return;
  if (S.step === 'meet') { if (near([LP.x, LP.y], 2.6)) openZone('meet'); return; }
  const z = L.zones[S.step]; if (z && near(z.at, z.r)) openZone(S.step);
}
function goZone(k) { const z = L.zones[k]; if (z) { P.x = z.at[0]; P.y = z.at[1]; P.z = floorZ(P.x, P.y); } }
function advance(next) {
  S.step = next; save(); updateHUD(); setMarker();
  const lw = { forest: ['forest', C.lini.toForest], bridge: ['bridge', C.lini.toBridge], shop: [null, C.lini.toShop], hill: [null, C.lini.toHill] }[next];
  if (lw) {
    const z = L.zones[next];
    if (next === 'shop') liniPath = L.legs.cross.concat(L.legs.shop).concat([z.lini]);
    else if (next === 'hill') liniPath = L.legs.hill.concat([z.lini]);
    else liniWalk(lw[0], z.lini);
    setTimeout(() => say(lw[1]), 400);
  }
  if (next === 'done') { if (!S.solved.includes(S.rid)) { S.solved.push(S.rid); save(); } say(C.lini.done); }
}
function badge(k) { if (!S.badges.includes(k)) S.badges.push(k); save(); updateHUD(); sfx('badge'); const b = document.querySelector(`.badge[data-k="${k}"]`); if (b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } }
function updateHUD() {
  const zk = S.step, z = C.zones[zk];
  $('zoneChip').innerHTML = z ? `<i style="background:${ACT_COL[z.act]}">${z.act === 'end' ? '끝' : esc(z.act + ' ' + C.acts[z.act])}</i>${esc(z.name)}` : `<i style="background:#8f8aa8">시작</i>모임 광장`;
  $('hint').textContent = C.hints[zk] || '';
  document.querySelectorAll('.badge').forEach(b => b.classList.toggle('got', S.badges.includes(b.dataset.k)));
  $('badgeN').textContent = S.badges.length;
  $('guideBtn').hidden = S.step === 'done';
}
const card = $('card');
function showCard(html, act, wide) {
  if (card.hidden) sfx('pop');
  cardOpen = true; stopGuide(); card.innerHTML = html; card.style.setProperty('--act', ACT_COL[act] || '#8f8aa8'); card.classList.toggle('wide', !!wide); card.hidden = false; card.scrollTop = 0;
  document.body.classList.add('carding');
}
function closeCard() { card.hidden = true; cardOpen = false; document.body.classList.remove('carding'); cooldown = 2.5; }
let cooldown = 0;
const face = () => `<div class="face"><img src="assets/lini-face.jpg" alt="" onerror="this.parentNode.classList.add('noimg')"></div>`;
const who = text => `<div class="who">${face()}<div class="bubble">${text}</div></div>`;
// 수수께끼 그림(작은 아이콘): 수수께끼 id마다
const ICON = {
  bean: '<rect x="15" y="34" width="24" height="16" rx="4" fill="#e9895f"/><rect x="12" y="31" width="30" height="6" rx="3" fill="#d9764d"/><path d="M27 32c0-8 3-14 9-19" fill="none" stroke="#5aa83a" stroke-width="3" stroke-linecap="round"/><ellipse cx="38" cy="12" rx="7" ry="4" transform="rotate(-25 38 12)" fill="#7cc44f"/><ellipse cx="30" cy="20" rx="6" ry="3.4" transform="rotate(30 30 20)" fill="#6bb845"/><circle cx="47" cy="6" r="4" fill="#ffd34d"/>',
  magnet: '<path d="M14 8 v18 a13 13 0 0 0 26 0 v-18" fill="none" stroke="#e8564a" stroke-width="9"/><rect x="9" y="4" width="10" height="8" fill="#4f7fd8"/><rect x="35" y="4" width="10" height="8" fill="#d9dde6"/><rect x="20" y="40" width="14" height="12" rx="2" fill="#cfd6e2" stroke="#9aa5b8" stroke-width="1.5"/>',
  phone: '<path d="M6 20 l12 -6 v26 l-12 -6z" fill="#fff" stroke="#c9b9a2" stroke-width="2"/><path d="M48 20 l-12 -6 v26 l12 -6z" fill="#fff" stroke="#c9b9a2" stroke-width="2"/><path d="M18 27 H36" stroke="#8a6c52" stroke-width="2"/><path d="M22 18 q5 -6 10 0" fill="none" stroke="#23a98f" stroke-width="2"/>',
  towel: '<circle cx="44" cy="10" r="7" fill="#ffd34d"/><line x1="4" y1="14" x2="36" y2="14" stroke="#8a6c52" stroke-width="2"/><rect x="8" y="14" width="24" height="22" rx="3" fill="#8fc3ff" stroke="#5fa0e0" stroke-width="1.5"/><path d="M14 40 q3 5 0 7 q-3 -2 0 -7z M24 42 q3 5 0 7 q-3 -2 0 -7z" fill="#5fa8f0"/>',
  shadow: '<circle cx="40" cy="10" r="7" fill="#ffd34d"/><rect x="18" y="18" width="4" height="28" rx="1" fill="#8a6c52"/><path d="M20 46 L48 46 L48 49 L20 49z" fill="#8a7a66" opacity=".55"/><line x1="4" y1="48" x2="50" y2="48" stroke="#c9b9a2" stroke-width="2"/>'
};
const riddleBox = () => `<div class="riddle"><svg class="sprout" viewBox="0 0 54 54">${ICON[R.id] || ICON.bean}</svg><p><small>${esc(R.title)} · ${esc(R.name || '')}</small>${esc(R.text)}</p></div>`;
const head = (k, step) => { const z = C.zones[k]; return `<div class="chead"><span class="zone"><i>${z.act === 'end' ? '끝' : esc(z.act + ' ' + C.acts[z.act])}</i>${esc(z.name)}</span>${step ? `<span class="cstep">${esc(step)}</span>` : ''}<button class="x" data-close aria-label="${esc(U.close)}">×</button></div>`; };
card.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCard(); });

function openZone(k) {
  if (cardOpen) return;
  ({ meet: cardMeet, forest: cardForest, bridge: cardBridge, shop: cardShop, hill: cardHill })[k] && ({ meet: cardMeet, forest: cardForest, bridge: cardBridge, shop: cardShop, hill: cardHill })[k]();
}
// 광장: 오늘의 수수께끼
function cardMeet() {
  playLini('wave');
  const n = C.riddles.findIndex(r => r.id === S.rid) + 1, solvedN = S.solved.filter(id => id !== S.rid).length;
  showCard(`<div class="chead"><span class="zone"><i>시작</i>모임 광장</span><span class="cstep">수수께끼 ${n}/${C.riddles.length} · 푼 것 ${solvedN}</span><button class="x" data-close>×</button></div>
    ${who(esc(R.intro[0]) + '<br>' + esc(R.intro[1]))}${riddleBox()}
    <div class="route"><span class="A">A 질문의 숲</span>→<span class="C">C 확인 다리</span>→<span class="T">T 해 보기 공방</span>→<span class="E">약속 언덕</span></div>
    <div class="go"><small>글은 가안</small><button class="btn" id="b">${esc(U.toForest)} →</button></div>`, 'end');
  $('b').onclick = () => { closeCard(); advance('forest'); };
}
// 질문의 숲(A): ① 내 생각 먼저 + 확실한 정도 → ② 부탁하는 말 만들기
function cardForest() {
  let my = S.my, sure = S.sure;
  const draw = () => {
    showCard(`${head('forest', '① 내 생각 먼저')}${who(esc(R.mySay))}${riddleBox()}
      <h3>${esc(R.myTitle)}</h3><div class="choices">${R.my.map((t, i) => `<button class="choice${i === my ? ' sel' : ''}" data-i="${i}"><b>${i + 1}</b>${esc(t)}</button>`).join('')}</div>
      <div class="sure"><span class="q">${esc(R.sureTitle)}</span><div class="dots">${R.sure.map((t, i) => `<button class="${i <= sure ? 'on' : ''}" data-s="${i}">${esc(t)}</button>`).join('')}</div></div>
      <div class="go"><small>글은 가안</small><button class="btn" id="b" ${my < 0 ? 'disabled' : ''}>${esc(U.next)} →</button></div>`, 'A');
    card.querySelectorAll('.choice').forEach(b => b.onclick = () => { my = +b.dataset.i; sfx('tap'); draw(); });
    card.querySelectorAll('.dots button').forEach(b => b.onclick = () => { sure = +b.dataset.s; sfx('tap'); draw(); });
    $('b').onclick = () => { S.my = my; S.sure = sure; save(); ask(); };
  };
  let picked = [];
  const ask = (reply, good) => {
    const sentence = picked.slice().sort((a, b) => a - b).map(i => R.chips[i].t).join(' ');     // 누른 차례와 상관없이 말이 되는 차례로
    showCard(`${head('forest', '② 리니에게 부탁하기')}${who(esc(reply || R.askSay))}
      <h3>${esc(R.askTitle)}</h3>
      <div class="sentence${picked.length ? '' : ' empty'}">${picked.length ? esc(sentence) : '낱말을 눌러 보세요'}</div>
      <div class="chips">${R.chips.map((c, i) => `<button class="${picked.includes(i) ? 'used' : ''}" data-c="${i}">${esc(c.t)}</button>`).join('')}</div>
      <div class="go"><button class="ghost" id="clr">${esc(U.clear)}</button>${good ? `<button class="btn" id="nx">${esc(U.toBridge)} →</button>` : `<button class="btn" id="ask" ${picked.length ? '' : 'disabled'}>${esc(U.ask)}</button>`}</div>`, 'A');
    card.querySelectorAll('.chips button').forEach(b => b.onclick = () => { if (good) return; const i = +b.dataset.c; picked = picked.includes(i) ? picked.filter(x => x !== i) : picked.concat(i); sfx('tap'); ask(); });
    $('clr').onclick = () => { picked = []; ask(); };
    if ($('ask')) $('ask').onclick = () => {
      const keysGot = new Set(picked.map(i => R.chips[i].k).filter(k => k !== 'vague' && k !== 'end'));
      if (keysGot.size >= R.needKeys) { say(R.replyGood); badge('A'); ask(R.replyGood + ' ' + R.afterA, true); }
      else if (keysGot.size >= 1) { say(R.replyHalf); sfx('no'); ask(R.replyHalf); }
      else { say(R.replyVague); sfx('no'); ask(R.replyVague); }
    };
    if ($('nx')) $('nx').onclick = () => { closeCard(); advance('bridge'); };
  };
  if (S.badges.includes('A')) { picked = [0, 1, 2, 3, 6]; ask(R.replyGood + ' ' + R.afterA, true); } else draw();
}
// 확인 다리(C): ① 예상 → ② 확인 방법 두 가지(바로 믿기는 미끄럼틀로) → 다리 판이 놓임
function cardBridge() {
  let guess = S.guess, picked = S.methods.slice(), msg = '', bad = false;
  const done = () => picked.filter(i => R.methods[i].ok).length >= R.needMethods;
  const draw = () => {
    const ok = done();
    showCard(`${head('bridge', ok ? '확인 끝' : '진짜일까?')}${who(esc(msg || (ok ? R.checked : '리니 말이 진짜인지 확인해 보자. 바로 믿지 말고!')))}
      <div class="heard"><small>${esc(R.heardTitle)}</small>${esc(R.heard)}</div>
      <h3>${esc(R.guessTitle)}</h3><div class="choices three">${R.guess.map((t, i) => `<button class="choice${i === guess ? ' sel' : ''}" data-g="${i}">${esc(t)}</button>`).join('')}</div>
      <h3>${esc(R.methodTitle)} <span class="cnt">${picked.filter(i => R.methods[i].ok).length}/${R.needMethods}</span></h3>
      <div class="methods${bad ? ' shake' : ''}">${R.methods.map((m, i) => `<button class="method${picked.includes(i) ? (m.ok ? ' ok' : ' no') : ''}" data-m="${i}" ${guess < 0 || ok ? 'disabled' : ''}>${esc(m.t)}${picked.includes(i) && m.res ? `<small>${esc(m.res)}</small>` : ''}</button>`).join('')}</div>
      <div class="go"><small>과학 문장은 연구부 확인 · 글은 가안</small>${ok ? `<button class="btn" id="nx">${esc(U.toShop)} →</button>` : ''}</div>`, 'C', true);
    card.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { guess = +b.dataset.g; S.guess = guess; save(); msg = ''; bad = false; sfx('tap'); draw(); });
    card.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const i = +b.dataset.m, m = R.methods[i];
      if (!m.ok) { msg = R.badMethod; bad = true; sfx('no'); if (!picked.includes(i)) picked.push(i); setTimeout(() => { picked = picked.filter(x => x !== i); bad = false; draw(); }, 1600); draw(); return; }
      if (!picked.includes(i)) { picked.push(i); sfx('ok'); } S.methods = picked.filter(x => R.methods[x].ok); save(); msg = ''; bad = false;
      if (done()) { openBridge(); }
      draw();
    });
    if ($('nx')) $('nx').onclick = () => { closeCard(); advance('shop'); };
  };
  draw();
}
function openBridge() {
  if (S.badges.includes('C')) return;
  badge('C'); bridgeOpen = true; planks.forEach(p => { p.go = true; p.t = 0; }); say(R.checked); setTimeout(() => sfx('plank'), 500);
}
// 해 보기 공방(T): ① 직접 해 보기(수수께끼마다 그림 세 장 R.exp.frames, 단추 둘, 빨리 감기는 wait) → ② 세 줄 정리
function cardShop() {
  const E = R.exp;
  let phase = S.badges.includes('T') ? 3 : 0, l2 = S.l2, l3 = S.l3, hint = '';
  const draw = () => {
    if (phase < 3) {
      const f = Math.min(phase, 2);
      showCard(`${head('shop', R.expTitle)}${who(esc(E.say[f]))}<div class="expwrap">${E.frames[f]}<div class="ff" hidden><i></i><span>${esc(R.expWaitLabel)} ▶▶</span></div></div>
        <div class="go"><small>실험 장면은 그림 가안</small><button class="btn" id="b">${phase < 2 ? esc(E.btn[phase]) + (E.wait[phase] ? ' ▶▶' : '') : esc(U.next) + ' →'}</button></div>`, 'T');
      $('b').onclick = () => {
        if (phase >= 2) { phase = 3; draw(); return; }
        if (E.wait[phase]) {      // 빨리 감기: 막대가 차오른 뒤 다음 그림
          $('b').disabled = true; const ff = card.querySelector('.ff'); ff.hidden = false; sfx('wind');
          setTimeout(() => { phase++; sfx('ok'); draw(); }, 1300);
        } else { phase++; sfx('ok'); draw(); }
      };
      return;
    }
    const first = S.my >= 0 ? R.my[S.my] : '잘 모르겠어요';
    const ok = l2 >= 0 && l3 >= 0 && R.line2Choices[l2].ok && R.line3Choices[l3].ok;
    showCard(`${head('shop', R.linesTitle)}${who(esc(hint || (ok ? R.linesDone : '처음 생각에서 지금 생각까지, 세 줄로 정리해 보자!')))}
      <div class="lines">
        <div class="ln"><b>${esc(R.line1)}</b><span class="fixed">${esc(first)}</span></div>
        <div class="ln"><b>${esc(R.line2)}</b><div class="opts">${R.line2Choices.map((c, i) => `<button class="${i === l2 ? (c.ok ? 'ok' : 'no') : ''}" data-a="${i}">${esc(c.t)}</button>`).join('')}</div></div>
        <div class="ln"><b>${esc(R.line3)}</b><div class="opts">${R.line3Choices.map((c, i) => `<button class="${i === l3 ? (c.ok ? 'ok' : 'no') : ''}" data-b="${i}">${esc(c.t)}</button>`).join('')}</div></div>
      </div>
      ${ok ? `<div class="fact"><b>${esc(R.factTitle)}</b>${esc(R.fact)}</div>` : ''}
      <div class="go"><small>과학 문장은 연구부 확인 · 글은 가안</small>${ok ? `<button class="btn" id="nx">${esc(U.toHill)} →</button>` : ''}</div>`, 'T', true);
    const chk = () => {
      if (l2 >= 0 && l3 >= 0) {
        if (R.line2Choices[l2].ok && R.line3Choices[l3].ok) { hint = ''; S.l2 = l2; S.l3 = l3; save(); if (!S.badges.includes('T')) { badge('T'); say('멋져! 직접 해 보니까 알게 됐지?'); } }
        else { hint = R.lineHint; sfx('no'); }
      } else sfx('tap');
      draw();
    };
    card.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { l2 = +b.dataset.a; chk(); });
    card.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { l3 = +b.dataset.b; chk(); });
    if ($('nx')) $('nx').onclick = () => { closeCard(); advance('hill'); };
  };
  draw();
}
// 약속 언덕(끝): 약속 하나 → 깃발이 오름 → 생각 탐험대원증 → (다음에) 새 수수께끼
function cardHill() {
  let pick = S.promise;
  const left = C.riddles.filter(r => r.id !== S.rid && !S.solved.includes(r.id)).length;
  const draw = () => {
    showCard(`${head('hill', pick >= 0 ? R.certTitle : '약속 하나')}${who(esc(pick >= 0 ? '깃발이 올라갔어! 이건 네 생각 탐험대원증이야.' : R.promiseSay))}
      ${pick < 0 ? `<h3>${esc(R.promiseTitle)}</h3><div class="methods">${R.promises.map((t, i) => `<button class="method" data-p="${i}">${esc(t)}</button>`).join('')}</div>` : certHTML()}
      <div class="go"><small>${esc(R.certNote)}</small>${pick >= 0 ? `<button class="ghost" id="sv">${esc(R.certSave)}</button><button class="ghost" id="nr">${esc(R.newRound)}${left ? ` (${left}개 남음)` : ''}</button><button class="btn" id="dn">${esc(U.ok)}</button>` : ''}</div>`, 'end', true);
    card.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pick = +b.dataset.p; S.promise = pick; save(); flag.go = true; sfx('flag'); say('좋은 약속이야! 깃발이 올라간다!'); draw(); });
    const nm = $('nm'); if (nm) nm.oninput = () => { S.name = nm.value.replace(/[\u0000-\u001f]/g, '').slice(0, 12); save(); };
    if ($('sv')) $('sv').onclick = saveCert;
    if ($('nr')) $('nr').onclick = newRound;
    if ($('dn')) $('dn').onclick = () => { closeCard(); if (S.step !== 'done') advance('done'); };
  };
  draw();
}
// 새 수수께끼: 푼 것에 넣고, 아직 안 푼 수수께끼로 섬 입구부터 다시(이름은 그대로)
function newRound() {
  if (!S.solved.includes(S.rid)) S.solved.push(S.rid);
  const solved = S.solved.slice(), name = S.name;
  S = Object.assign({}, S0, { solved, name, rid: null });
  S.rid = pickRiddle();
  if (C.riddles.every(r => solved.includes(r.id))) { S.solved = []; }     // 다섯을 다 풀었으면 처음부터 다시 돌기
  save(); reloadClean();
}
function reloadClean() { if (location.search) location.href = location.pathname; else location.reload(); }     // 시험용 주소(?reset · ?rid)는 떼고 다시
function certHTML() {
  const first = S.my >= 0 ? R.my[S.my] : '잘 모르겠어요', l2 = R.line2Choices[Math.max(0, S.l2)].t, l3 = R.line3Choices[Math.max(0, S.l3)].t;
  return `<div class="cert"><div class="ct">${esc(R.certTitle)}</div><div class="cr">${esc(R.title)} · ${esc(R.name)}</div>
    <label>${esc(R.certName)} <input id="nm" maxlength="12" placeholder="${esc(R.certNameHint)}" value="${esc(S.name)}" autocomplete="off"></label>
    <div class="cb">${['A', 'C', 'T'].map(k => `<span class="cbd ${S.badges.includes(k) ? 'got' : ''}" style="--c:${ACT_COL[k]}">${k}<small>${esc(C.acts[k])}</small></span>`).join('')}</div>
    <div class="c3"><p><b>처음엔</b>${esc(first)}</p><p><b>확인했더니</b>${esc(l2)}</p><p><b>지금은</b>${esc(l3)}</p></div>
    <div class="cp"><b>내 약속</b>${esc(R.promises[Math.max(0, S.promise)])}</div>
    <div class="cp"><b>${esc(R.factTitle)}</b>${esc(R.fact)}</div></div>`;
}
let faceImg = null;
function saveCert() {     // 탐험대원증을 그림 한 장으로(카드에 띄워 길게 눌러 저장)
  const draw = () => {
    const W = 1200, Hh = 860, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, Hh); grd.addColorStop(0, '#dff0ff'); grd.addColorStop(1, '#fff7e6'); g.fillStyle = grd; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#fff'; roundRect(g, 40, 40, W - 80, Hh - 80, 44); g.fill();
    ['#f0a91e', '#23a98f', '#ec5f4b', '#8a6cf0'].forEach((col, i) => { g.fillStyle = col; roundRect(g, 40 + i * (W - 80) / 4, 40, (W - 80) / 4, 16, 0); g.fill(); });     /* 위 띠: ACT 셋 + 끝 */
    if (faceImg && faceImg.complete && faceImg.naturalWidth) { g.save(); g.beginPath(); g.arc(150, 170, 74, 0, 7); g.clip(); g.drawImage(faceImg, 76, 96, 148, 148); g.restore(); g.strokeStyle = '#8a6cf0'; g.lineWidth = 8; g.beginPath(); g.arc(150, 170, 74, 0, 7); g.stroke(); }
    g.fillStyle = '#3a3550'; g.textAlign = 'left'; g.font = `900 62px ${FONT}`; g.fillText(R.certTitle, 260, 150);
    g.font = `800 40px ${FONT}`; g.fillStyle = '#8a6cf0'; g.fillText(S.name || '생각 탐험대원', 262, 212);
    g.font = `700 26px ${FONT}`; g.fillStyle = '#6d6888'; g.fillText(`${R.title} · ${R.name}`, 262, 254);
    ['A', 'C', 'T'].forEach((k, i) => { const x = 260 + i * 150 + 50, y = 330; g.fillStyle = S.badges.includes(k) ? ACT_COL[k] : '#e5e2ef'; g.beginPath(); g.arc(x, y, 46, 0, 7); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `900 42px ${FONT}`; g.fillText(k, x, y + 15); g.fillStyle = '#6d6888'; g.font = `700 22px ${FONT}`; g.fillText(C.acts[k], x, y + 80); });
    g.textAlign = 'left';
    const first = S.my >= 0 ? R.my[S.my] : '잘 모르겠어요';
    const rows = [['처음엔', first], ['확인했더니', R.line2Choices[Math.max(0, S.l2)].t], ['지금은', R.line3Choices[Math.max(0, S.l3)].t], ['내 약속', R.promises[Math.max(0, S.promise)]], [R.factTitle, R.fact]];
    let y = 480;
    rows.forEach(([a, b]) => {
      g.fillStyle = '#8a6cf0'; g.font = `800 28px ${FONT}`; g.fillText(a, 110, y);
      g.fillStyle = '#3a3550'; g.font = `700 28px ${FONT}`; const lines = wrapText(g, b, W - 440); lines.forEach((ln, j) => g.fillText(ln, 330, y + j * 38)); y += 38 * lines.length + 22;
    });
    g.textAlign = 'center'; g.font = `600 22px ${FONT}`; g.fillStyle = '#9a95b3'; g.fillText(`${C.title} · ${new Date().toLocaleDateString('ko-KR')}`, W / 2, Hh - 64);
    const url = c.toDataURL('image/png');
    const box = card.querySelector('.cert'); if (box) box.outerHTML = `<div class="certimg"><img src="${url}" alt="${esc(R.certTitle)}"><small>그림을 길게 누르거나(휴대폰) 오른쪽 클릭(PC)해서 저장하세요.</small></div>`;
    sfx('badge');     /* 저절로 내려받기는 하지 않는다(아이 기기에서 놀라지 않게, 아티팩트에선 막힘) — 그림을 길게 눌러 저장 */
  };
  if (!faceImg) { faceImg = new Image(); faceImg.onload = draw; faceImg.onerror = draw; faceImg.src = 'assets/lini-face.jpg'; } else draw();
}

// ───────────── 화면 위 글 ─────────────
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }
function startGame() {
  started = true; $('cover').style.display = 'none'; document.body.classList.add('playing');
  if (MOBILE) $('stick').style.display = 'block';
  const help = $('help'); help.textContent = MOBILE ? U.helpTouch : U.helpPC; help.style.display = 'block'; setTimeout(() => { help.style.opacity = '0'; }, 7000);
  setMarker(); updateHUD(); audioOn(); setSound(SND);
  if (S.step === 'meet') setTimeout(() => {
    if (S.solved.length) say(C.lini.greetAgain);      // 두 번째부터는 짧게
    else { say(C.lini.greet[0]); setTimeout(() => say(C.lini.greet[1]), 3600); }
    playLini('wave');
  }, 600);
}
$('startBtn').addEventListener('click', startGame);
function restart() { S = Object.assign({}, S0); save(); reloadClean(); }
$('restartBtn').addEventListener('click', restart);
// 처음부터: 브라우저 확인 창(confirm)이 막힌 곳(아티팩트)도 있어 카드로 묻는다
$('menuBtn').addEventListener('click', () => {
  if (cardOpen) return;
  const back = C.backUrl && !AS.noBack ? `<a class="ghost" href="${esc(C.backUrl)}" style="text-decoration:none">${esc(C.backLabel || '돌아가기')}</a>` : '';
  showCard(`<div class="chead"><span class="zone"><i>메뉴</i>처음부터</span><button class="x" data-close>×</button></div>
    ${who('처음부터 다시 할까? 이 기기에 저장된 배지와 고른 답이 지워져.')}
    <div class="go">${back}<button class="ghost" data-close>${esc(U.close)}</button><button class="btn" id="rs">${esc(U.restart)}</button></div>`, 'end');
  $('rs').onclick = restart;
});

// ───────────── 매 장면 ─────────────
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (L) {
    warnT -= dt; cooldown -= dt;
    if (started && !cardOpen) {
      let mx = 0, mz = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) mz -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      mx += stick.x; mz += stick.y;
      const len = Math.hypot(mx, mz);
      if (guide && guide.length) {
        const [tx, ty] = guide[0], dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy), sp = 2.6 * dt;
        if (d < 0.35) guide.shift(); else { moveTo(P.x + dx / d * sp, P.y + dy / d * sp); yaw = turn(yaw, Math.atan2(-dx, dy), dt, 4); pitch += (-0.08 - pitch) * Math.min(1, dt * 2); }
        if (!guide.length) stopGuide();
      } else if (len > 0.05) {
        const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.4 : 2.6) * Math.min(len, 1) / len;
        const fx = -Math.sin(yaw), fy = Math.cos(yaw), rx = Math.cos(yaw), ry = Math.sin(yaw);
        moveTo(P.x + (fx * -mz + rx * mx) * sp * dt, P.y + (fy * -mz + ry * mx) * sp * dt);
      }
      if (cooldown <= 0) inZone();
    }
    P.z += (floorZ(P.x, P.y) - P.z) * Math.min(1, dt * 10);
    camera.position.copy(V3(P.x, P.y, P.z + EYE));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    for (const f of anim) f(t, dt);
    if (bubble && bubble.visible) {
      bubbleT -= dt; if (bubbleT <= 0) { bubble.visible = false; if (liniCur === liniActs.talk) playLini('idle', 0.5); }
      bubble.position.copy(V3(LP.x, LP.y, LP.z + 2.15));
      const k = clamp(camera.position.distanceTo(bubble.position) / 4.5, 0.5, 2.8); bubble.scale.set(2.3 * k, 0.675 * k, 1);   // 가까우면 작게, 멀어도 읽히게
    }
  }
  sky.position.copy(camera.position);
  if (FX) composer.render(); else renderer.render(scene, camera);
});

main().catch(e => { log('failed', e && (e.stack || e.message)); $('loading').textContent = '불러오지 못했어요. 새로 고쳐 주세요.'; });
