// AI타운 v1.0 엔진 (2026-10-31 XR개발부, 전면 수정판) — 글·장소·주민·미션은 모두 town.config.js(window.TOWN)에서 읽는다.
// 구성: 3D 섬 마을(Three.js r147) · 주민 19명의 생활(11-01 로머 16 → 5)(충전·대기·배달·일·대화, 길 그래프로 이동) · 사람 손님(나) 조작 · 미션 진행(대화·고르기·연출) · 수첩·지도·주민증.
// 좌표: x = 동쪽(+), z = 남쪽(+). 카메라는 늘 남쪽에서 북쪽을 내려다본다(화면 위 = 북쪽).
(function () {
  'use strict';
  const C = window.TOWN, T = C.text, P = C.places;
  const $ = id => document.getElementById(id);
  const loadingEl = $('loading');
  loadingEl.textContent = T.loading;
  if (!window.THREE || !C) { loadingEl.textContent = T.loadFail; return; }

  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

  // ---------- 저장(이 기기에만. 막힌 브라우저에서도 그대로 돌아가게)
  const S0 = { name: '', look: null, q: 0, step: 0, stamps: [], found: [], met: [], trip: '소풍', woke: false, gotBook: false, done: false };
  function readSave() { try { return JSON.parse(localStorage.getItem(C.saveKey)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(C.saveKey, JSON.stringify(S)); } catch (e) { /* 저장 못 해도 진행 */ } }
  let S = Object.assign({}, S0, readSave());
  const fmt = s => String(s).replace(/\{name\}/g, () => S.name || T.guest).replace(/\{trip\}/g, () => S.trip || '소풍');   // 이름의 $ 기호가 바뀌지 않게 함수로 넣는다

  // ---------- 렌더러·장면
  const view = $('view');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { loadingEl.textContent = T.loadFail; return; }          // 3D를 못 켜는 기기: 멈춘 '짓는 중' 대신 안내
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  view.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = (function () {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#8EC1EE'); g.addColorStop(.55, '#CFE3F6'); g.addColorStop(1, '#F6D9EA');
    x.fillStyle = g; x.fillRect(0, 0, 4, 256); return new THREE.CanvasTexture(c);
  })();
  scene.fog = new THREE.Fog(0xDCE6F4, 140, 300);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .5, 800);
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0x9CC6B4, .6));
  const sun = new THREE.DirectionalLight(0xFFF3E0, .55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 180 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  // ---------- 재료·모양 도우미
  const matCache = {};
  function M(color, o) {
    const k = color + JSON.stringify(o || {});
    return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .82, metalness: 0 }, o || {})));
  }
  function B(color, o) {
    const k = 'b' + color + JSON.stringify(o || {});
    return matCache[k] || (matCache[k] = new THREE.MeshBasicMaterial(Object.assign({ color }, o || {})));
  }
  function mesh(geo, mat, x, y, z, parent, shadow) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    (parent || scene).add(m); return m;
  }
  const cols = [];                                   // 사람 손님이 못 지나가는 둥근 자리
  const col = (x, z, r) => cols.push({ x, z, r });
  function canvasOf(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  function wrapText(x, text, maxW) {
    const out = []; let line = '';
    for (const ch of String(text)) { const t = line + ch; if (x.measureText(t).width > maxW && line) { out.push(line); line = ch; } else line = t; }
    if (line) out.push(line); return out;
  }
  function labelSprite(name, dot, scale) {
    const c = canvasOf(640, 170, (x, w) => {
      x.font = '62px Jua, "Noto Sans KR", sans-serif';
      const tw = x.measureText(name).width, bw = Math.min(w - 8, tw + 96);
      rr(x, (w - bw) / 2, 22, bw, 118, 59); x.fillStyle = 'rgba(255,255,255,.93)'; x.fill();
      x.fillStyle = dot || '#9AA6BC'; x.beginPath(); x.arc((w - bw) / 2 + 46, 81, 13, 0, 7); x.fill();
      x.fillStyle = '#1E2B4A'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2 + 14, 84);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    const s = scale || 1; sp.scale.set(9 * s, 2.4 * s, 1); sp.renderOrder = 2; LABELS.push(sp); return sp;
  }
  const LABELS = [], _lp = new THREE.Vector3();
  function fadeLabels() {                             // 카메라에 너무 가까운 이름판은 흐리게(화면을 가리지 않게)
    for (const sp of LABELS) { sp.getWorldPosition(_lp); const d = _lp.distanceTo(camera.position); sp.material.opacity = clamp((d - 15) / 10, 0, 1); sp.visible = sp.material.opacity > .02; }
  }
  function cardSprite(text, bg, fg) {
    const c = canvasOf(512, 160, (x, w, h) => {
      rr(x, 8, 8, w - 16, h - 16, 28); x.fillStyle = bg || '#FFFFFF'; x.fill();
      x.lineWidth = 6; x.strokeStyle = 'rgba(30,43,74,.15)'; x.stroke();
      x.font = '50px Jua, "Noto Sans KR", sans-serif'; x.fillStyle = fg || '#1E2B4A'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, w / 2, h / 2 + 3);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.scale.set(4.4, 1.38, 1); return sp;
  }

  // ---------- 길 그래프(주민 이동) — 모든 점 사이 가장 짧은 길을 미리 계산
  const NID = Object.keys(C.nodes), NP = NID.map(k => C.nodes[k]), NN = NID.length;
  const nd = [], nx = [];
  for (let i = 0; i < NN; i++) { nd.push(new Array(NN).fill(Infinity)); nx.push(new Array(NN).fill(-1)); nd[i][i] = 0; nx[i][i] = i; }
  for (const [a, b] of C.roads) {
    const i = NID.indexOf(a), j = NID.indexOf(b), d = dist2(NP[i][0], NP[i][1], NP[j][0], NP[j][1]);
    nd[i][j] = nd[j][i] = d; nx[i][j] = j; nx[j][i] = i;
  }
  for (let k = 0; k < NN; k++) for (let i = 0; i < NN; i++) for (let j = 0; j < NN; j++) {
    if (nd[i][k] + nd[k][j] < nd[i][j]) { nd[i][j] = nd[i][k] + nd[k][j]; nx[i][j] = nx[i][k]; }
  }
  function nearestNode(x, z) { let b = 0, bd = Infinity; for (let i = 0; i < NN; i++) { const d = dist2(x, z, NP[i][0], NP[i][1]); if (d < bd) { bd = d; b = i; } } return b; }
  function route(fx, fz, tx, tz) {
    if (dist2(fx, fz, tx, tz) < 7) return [[tx, tz]];
    let i = nearestNode(fx, fz); const j = nearestNode(tx, tz);
    const pts = [NP[i]];
    while (i !== j && nx[i][j] >= 0) { i = nx[i][j]; pts.push(NP[i]); }
    if (pts.length > 1 && dist2(fx, fz, pts[1][0], pts[1][1]) < dist2(pts[0][0], pts[0][1], pts[1][0], pts[1][1])) pts.shift();
    if (pts.length && dist2(tx, tz, pts[pts.length - 1][0], pts[pts.length - 1][1]) > 0.1) {
      const L = pts.length; if (L > 1 && dist2(tx, tz, pts[L - 2][0], pts[L - 2][1]) < dist2(pts[L - 1][0], pts[L - 1][1], pts[L - 2][0], pts[L - 2][1])) pts.pop();
    }
    return pts.map(p => [p[0], p[1]]).concat([[tx, tz]]);
  }
  function segDist(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1;
    const t = clamp(((px - ax) * vx + (pz - az) * vz) / L, 0, 1);
    return dist2(px, pz, ax + vx * t, az + vz * t);
  }

  // ================= 세계 짓기 =================
  const R = C.islandR;
  const W = {};                                     // 연출에 쓰는 물건들
  function buildGround() {
    const GS = 2048, k = GS / (2 * R), gx = x => (x + R) * k, gz = z => (z + R) * k;
    const cv = canvasOf(GS, GS, g => {
      g.fillStyle = '#A9DBC4'; g.fillRect(0, 0, GS, GS);
      for (let i = 0; i < 420; i++) {
        g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(80,170,135,.08)';
        g.beginPath(); g.arc(Math.random() * GS, Math.random() * GS, rand(10, 70), 0, 7); g.fill();
      }
      const patch = (p, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(gx(p.x), gz(p.z), r * k, 0, 7); g.fill(); };
      patch(P.forest, 15, '#8FCBB2'); patch(P.waityard, 7, '#D3CBF5'); patch(P.library, 11, '#CEC5F3'); patch(P.market, 10.5, '#F6D2BA');
      patch(P.twin, 9.5, '#D5CCF5'); patch(P.memo, 7.5, '#F3E2AE'); patch(P.bell, 9, '#DCE8BE'); patch(P.garden, 9, '#C3E6A6');
      patch(P.dream, 8, '#F0CBE6'); patch(P.tool, 9, '#F6D3B2'); patch(P.lake, 10.5, '#BFDDF0'); patch(P.arrival, 7, '#C9DCF6');
      // 서버 숲 전선
      g.strokeStyle = 'rgba(70,200,215,.5)'; g.lineWidth = .18 * k;
      for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(gx(-36), gz(3)); g.quadraticCurveTo(gx(-40 - rand(0, 6)), gz(rand(-8, 14)), gx(-42 - rand(0, 10)), gz(rand(-8, 15))); g.stroke(); }
      // 길: 테두리 → 바닥 → 가운데 빛 선
      g.lineCap = 'round'; g.lineJoin = 'round';
      const seg = (a, b) => { g.beginPath(); g.moveTo(gx(C.nodes[a][0]), gz(C.nodes[a][1])); g.lineTo(gx(C.nodes[b][0]), gz(C.nodes[b][1])); g.stroke(); };
      g.strokeStyle = '#D8C6A2'; for (const [a, b, w] of C.roads) { g.lineWidth = (w + 1) * k; seg(a, b); }
      g.strokeStyle = '#FBEFD6'; for (const [a, b, w] of C.roads) { g.lineWidth = w * k; seg(a, b); }
      // 광장
      const pl = P.plaza;
      g.fillStyle = '#D8C6A2'; g.beginPath(); g.arc(gx(pl.x), gz(pl.z), (pl.r + .5) * k, 0, 7); g.fill();
      g.fillStyle = '#F1E8FA'; g.beginPath(); g.arc(gx(pl.x), gz(pl.z), pl.r * k, 0, 7); g.fill();
      g.strokeStyle = '#D9CCF2'; g.lineWidth = .35 * k;
      for (const r of [3.4, 6.5, 9.4]) { g.beginPath(); g.arc(gx(pl.x), gz(pl.z), r * k, 0, 7); g.stroke(); }
      for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; g.beginPath(); g.moveTo(gx(Math.cos(t) * 3.4), gz(Math.sin(t) * 3.4)); g.lineTo(gx(Math.cos(t) * 9.4), gz(Math.sin(t) * 9.4)); g.stroke(); }
      g.setLineDash([1.1 * k, 1.3 * k]); g.strokeStyle = 'rgba(80,205,225,.75)'; g.lineWidth = .24 * k;
      for (const [a, b] of C.roads) seg(a, b);
      g.setLineDash([]);
      g.fillStyle = 'rgba(80,205,225,.8)';
      for (const p of NP) { g.beginPath(); g.arc(gx(p[0]), gz(p[1]), .45 * k, 0, 7); g.fill(); }
      // 기다리는 마당: 점선 원
      g.setLineDash([.8 * k, .8 * k]); g.strokeStyle = 'rgba(140,108,208,.6)'; g.lineWidth = .3 * k;
      g.beginPath(); g.arc(gx(P.waityard.x), gz(P.waityard.z), 5 * k, 0, 7); g.stroke(); g.setLineDash([]);
    });
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    mesh(new THREE.CylinderGeometry(R, R - 1.2, 3.2, 120, 1, true), M('#9FD3BE'), 0, -1.6, 0, null, false);
    const under = mesh(new THREE.ConeGeometry(R - 1.2, 38, 18, 3), M('#B3A6EA', { flatShading: true }), 0, -3.2 - 19, 0, null, false);
    under.rotation.x = Math.PI;
    // 아래 구름
    const cm = M('#FFFFFF', { roughness: 1, emissive: '#FFFFFF', emissiveIntensity: .25 });
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + rand(-.1, .1), d = rand(R + 8, R + 70), g = new THREE.Group();
      for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(rand(4, 8), 14, 10), cm, rand(-6, 6), rand(-1, 1.5), rand(-3, 3), g, false);
      g.position.set(Math.cos(a) * d, rand(-26, -8), Math.sin(a) * d); g.scale.y = .55; scene.add(g);
    }
    // 섬 둘레를 도는 결정 조각
    W.shards = [];
    const sc = ['#9FF0DC', '#B9A2FF', '#8FD8FF', '#FFB3D9'];
    for (let i = 0; i < 14; i++) {
      const m = mesh(new THREE.OctahedronGeometry(rand(.8, 1.8)), M(pick(sc), { flatShading: true, emissive: '#FFFFFF', emissiveIntensity: .15 }), 0, 0, 0, null, false);
      m.userData = { a: rand(0, 6.3), d: rand(R + 4, R + 16), y: rand(-4, 10), s: rand(.03, .07) }; W.shards.push(m);
    }
  }

  function buildGate() {
    const g = P.gate, pm = M('#FFFFFF', { roughness: .5 }), am = M('#B9A2FF', { roughness: .45, emissive: '#B9A2FF', emissiveIntensity: .25 });
    for (const sx of [-5, 5]) { mesh(new THREE.CylinderGeometry(.6, .75, 5.2, 16), pm, g.x + sx, 2.6, g.z); col(g.x + sx, g.z, 1); }
    const arch = mesh(new THREE.TorusGeometry(5, .45, 12, 40, Math.PI), am, g.x, 5.2, g.z); arch.castShadow = false;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.7), new THREE.MeshBasicMaterial({ transparent: true, map: new THREE.CanvasTexture(canvasOf(768, 204, (x, w, h) => {
      rr(x, 6, 6, w - 12, h - 12, 90); x.fillStyle = '#1E2B4A'; x.fill();
      x.font = '108px Jua, sans-serif'; x.fillStyle = '#BFF5FF'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(T.title, w / 2, h / 2 + 6);
    })) }));
    sign.position.set(g.x, 7.6, g.z + .1); scene.add(sign);
    // 입구 팻말(10-09 기획안 4절 그대로)
    const post = new THREE.Group(); post.position.set(g.x + 8.5, 0, g.z + 1.5); post.rotation.y = -.35; scene.add(post);
    mesh(new THREE.BoxGeometry(.25, 2.2, .25), M('#C9B79B'), 0, 1.1, 0, post);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.9), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvasOf(640, 290, (x, w, h) => {
      x.fillStyle = '#FFF9EC'; x.fillRect(0, 0, w, h); x.strokeStyle = '#C9B79B'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
      x.fillStyle = '#1E2B4A'; x.textAlign = 'center'; x.font = '44px Jua, sans-serif';
      x.fillText('이 마을 주민은', w / 2, 92); x.fillText('잠도 밥도 없어요.', w / 2, 152); x.fillStyle = '#7A55C9'; x.fillText('대신 부탁을 기다려요.', w / 2, 220);
    })) }));
    pl.position.set(0, 2.5, .14); post.add(pl);
    const bk = mesh(new THREE.BoxGeometry(4.3, 2, .2), M('#C9B79B'), 0, 2.5, 0, post); bk.receiveShadow = false;
    col(g.x + 8.5, g.z + 1.5, .8);
    // 도착 정거장
    const a = P.arrival;
    mesh(new THREE.CylinderGeometry(4.6, 4.9, .4, 40), M('#E9F2FF', { roughness: .4 }), a.x, .2, a.z);
    const rg = mesh(new THREE.TorusGeometry(4.2, .16, 8, 48), B('#7FE9FF'), a.x, .45, a.z, null, false); rg.rotation.x = Math.PI / 2;
    W.arrRings = [];
    for (let i = 0; i < 2; i++) { const r = mesh(new THREE.TorusGeometry(2.6 - i * .6, .06, 6, 40), new THREE.MeshBasicMaterial({ color: '#BFF5FF', transparent: true, opacity: .7 }), a.x, 2 + i * 1.4, a.z, null, false); r.rotation.x = Math.PI / 2; W.arrRings.push(r); }
    // 큰길 가로등
    for (let z = 52; z >= 16; z -= 9) for (const sx of [-3.4, 3.4]) lamp(sx, z, '#BFF5FF');
  }
  function lamp(x, z, c) {
    mesh(new THREE.CylinderGeometry(.09, .12, 3.4, 8), M('#FFFFFF', { roughness: .4 }), x, 1.7, z);
    mesh(new THREE.SphereGeometry(.34, 14, 10), B(c || '#FFF3B0'), x, 3.55, z, null, false);
    col(x, z, .35);
  }

  function buildPlaza() {
    const p = P.plaza;
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); scene.add(g);
    mesh(new THREE.CylinderGeometry(1.25, 1.35, 2.4, 28), M('#E0483E', { roughness: .45 }), 0, 1.2, 0, g);
    const dome = mesh(new THREE.SphereGeometry(1.25, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M('#E85A50', { roughness: .45 }), 0, 2.4, 0, g); dome.castShadow = true;
    mesh(new THREE.BoxGeometry(1.2, .16, .3), B('#2B1A1A'), 0, 1.95, 1.2, g, false);
    W.mailGlow = M('#FFE58A', { emissive: '#FFD54A', emissiveIntensity: .5 });
    const ring = mesh(new THREE.TorusGeometry(1.28, .11, 8, 40), W.mailGlow, 0, 2.42, 0, g); ring.rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.3, 14, 10), W.mailGlow, 0, 3.75, 0, g);
    mesh(new THREE.CylinderGeometry(1.6, 1.8, .25, 30), M('#FFFFFF', { roughness: .5 }), 0, .12, 0, g);
    const lb = labelSprite('부탁 우체통', '#E0483E', .62); lb.position.set(0, 5, 0); g.add(lb);
    col(p.x, p.z, 1.9);
    W.mail = { x: p.x, y: 2.1, z: p.z + 1.25 };
    for (const a of [45, 135, 225, 315]) { const t = a * Math.PI / 180; lamp(Math.sin(t) * 11.2, -Math.cos(t) * 11.2, '#FFE9A8'); }
    // 멈춘 게시판
    const b = P.board, bd = new THREE.Group(); bd.position.set(b.x, 0, b.z); bd.rotation.y = Math.atan2(-.55, 1); scene.add(bd);
    for (const sx of [-1.5, 1.5]) mesh(new THREE.BoxGeometry(.22, 3, .22), M('#9C8A70'), sx, 1.5, 0, bd);
    mesh(new THREE.BoxGeometry(3.6, 2.3, .16), M('#9C8A70'), 0, 2.15, -.05, bd);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvasOf(680, 420, (x, w, h) => {
      x.fillStyle = '#FFF9EC'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#1E2B4A'; x.font = '50px Jua, sans-serif'; x.textAlign = 'center'; x.fillText('마을 소식 게시판', w / 2, 72);
      rr(x, w / 2 - 150, 104, 300, 196, 20); x.fillStyle = '#FFFFFF'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#E0483E'; x.stroke();
      x.fillStyle = '#E0483E'; x.fillRect(w / 2 - 150, 104, 300, 52);
      x.fillStyle = '#FFFFFF'; x.font = '34px Jua, sans-serif'; x.fillText('오늘 날짜', w / 2, 142);
      x.fillStyle = '#1E2B4A'; x.font = '58px Jua, sans-serif'; x.fillText('배운 날', w / 2, 240);
      x.fillStyle = '#7A55C9'; x.font = '36px Jua, sans-serif'; x.fillText('여기서 멈춤 · 그 뒤 소식 없음', w / 2, 360);
    })) }));
    face.position.set(0, 2.15, .04); bd.add(face);
    col(b.x, b.z, 1.6);
    W.board = { x: b.x, z: b.z };
  }

  function buildForest() {
    const f = P.forest; W.leds = [];
    const ledCols = ['#7FFFD4', '#7FE9FF', '#FFE58A'];
    for (let i = 0; i < 3; i++) W.leds.push(new THREE.MeshStandardMaterial({ color: ledCols[i], emissive: ledCols[i], emissiveIntensity: .8 }));
    const body = M('#2F3666', { roughness: .5 }), crown = M('#8FF0D2', { flatShading: true, emissive: '#3BD6A8', emissiveIntensity: .3 });
    W.trees = [];
    for (const tx of [-42.5, -47, -51.5]) for (const tz of [-7, -2.5, 2, 6.5, 11]) {
      const x = tx + rand(-.6, .6), z = tz + rand(-.5, .5), h = rand(3.6, 6.2);
      mesh(new THREE.BoxGeometry(1.5, h, 1.5), body, x, h / 2, z);
      for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(1.56, .1, 1.56), W.leds[(k + Math.floor(Math.random() * 3)) % 3], x, .8 + k * (h - 1.2) / 3, z, null, false);
      mesh(new THREE.IcosahedronGeometry(1.25, 0), crown, x, h + .9, z);
      col(x, z, 1.25); W.trees.push([x, h + .9, z]);
    }
    for (const s of C.spots.charge) {
      const pad = mesh(new THREE.CircleGeometry(.75, 24), B('#FFE58A', { transparent: true, opacity: .7 }), s[0], .03, s[1], null, false); pad.rotation.x = -Math.PI / 2;
    }
    const lb = labelSprite(f.name, '#2F9F6B'); lb.position.set(f.x, 10, f.z); scene.add(lb);
  }

  function buildTool() {
    const t = P.tool, bx = t.x + 3.5;
    mesh(new THREE.BoxGeometry(7, 4.6, 7.5), M('#FFDDB8'), bx, 2.3, t.z);
    const roof = mesh(new THREE.ConeGeometry(5.9, 2.8, 4), M('#F08A4B', { flatShading: true }), bx, 6, t.z); roof.rotation.y = Math.PI / 4;
    const door = mesh(new THREE.PlaneGeometry(3, 3.4), B('#5A3B2A'), bx - 3.52, 1.7, t.z, null, false); door.rotation.y = -Math.PI / 2;
    col(bx, t.z, 4.9);
    W.tools = {};
    const ped = (z, key, build) => {
      mesh(new THREE.CylinderGeometry(.65, .75, 1, 18), M('#FFFFFF', { roughness: .5 }), 38.6, .5, z); col(38.6, z, .9);
      const g = new THREE.Group(); g.position.set(38.6, 1.6, z); scene.add(g); build(g); W.tools[key] = g;
    };
    ped(-1.6, 'calc', g => { mesh(new THREE.BoxGeometry(.8, 1.05, .22), M('#3D4A6B'), 0, 0, 0, g); mesh(new THREE.PlaneGeometry(.6, .28), B('#BFF5FF'), 0, .3, .12, g, false); g.rotation.y = -Math.PI / 2; });
    ped(3, 'scope', g => { const c = mesh(new THREE.CylinderGeometry(.18, .28, 1.5, 14), M('#5B7FD6', { roughness: .4 }), 0, .1, 0, g); c.rotation.z = .9; mesh(new THREE.SphereGeometry(.2, 12, 8), B('#BFF5FF'), -.6, .52, 0, g, false); });
    ped(7.6, 'brush', g => { const h = mesh(new THREE.CylinderGeometry(.08, .1, 1.2, 10), M('#C98A5B'), 0, .1, 0, g); h.rotation.z = .5; const tip = mesh(new THREE.ConeGeometry(.17, .45, 12), M('#E36FA0'), .33, -.43, 0, g); tip.rotation.z = .5 + Math.PI; });
    const lb = labelSprite(t.name, '#F2A33A'); lb.position.set(bx, 9.6, t.z); scene.add(lb);
  }

  function buildLibrary() {
    const L = P.library; W.towers = [];
    const pal = ['#B9A2FF', '#8FD8FF', '#FFB3D9', '#9FF0DC', '#FFE58A'];
    const set = [[-1.5, -3.5, 8.2, 1], [2.2, -2.6, 6.6, .9], [5, .6, 5, .7], [-4.6, -.6, 3.4, .45], [-3.4, 3.2, 2, .25], [1.4, 1.8, 1.1, .12], [-6.4, -4.4, 4.6, .6]];
    for (const [ox, oz, h, br] of set) {
      const x = L.x + ox, z = L.z + oz, n = Math.max(2, Math.round(h / .42)), mats = [];
      for (let i = 0; i < n; i++) {
        const ci = ((i + Math.round(ox)) % pal.length + pal.length) % pal.length;   // 음수 좌표에서도 0~4
        const m = new THREE.MeshStandardMaterial({ color: pal[ci], emissive: pal[(i + 2) % pal.length], emissiveIntensity: .45 * br, transparent: br < .5, opacity: br < .5 ? .45 + br : 1, roughness: .6 });
        const b = mesh(new THREE.BoxGeometry(rand(1.6, 2.1), .38, rand(1.2, 1.5)), m, x + rand(-.08, .08), .19 + i * .42, z); b.rotation.y = rand(-.18, .18); mats.push(m);
      }
      if (br > .6) mesh(new THREE.OctahedronGeometry(.42), B('#FFFFFF'), x, n * .42 + .7, z, null, false);
      col(x, z, 1.25); W.towers.push({ mats, br });
    }
    const lb = labelSprite(L.name, '#7C6CE0'); lb.position.set(L.x, 11.5, L.z); scene.add(lb);
  }

  function buildMarket() {
    const mk = P.market, cols4 = ['#FFB3D9', '#8FD8FF', '#FFE58A', '#9FF0DC'];
    const words = ['맑아요', '그리고', '흐려요', '다음', '놀아요', '아침', '하늘이', '그래서'];
    W.words = []; let wi = 0;
    [[-7.5, -31], [7.5, -31], [-7.5, -39], [7.5, -39]].forEach(([x, z], i) => {
      mesh(new THREE.BoxGeometry(1.8, 1.1, 3.4), M('#FFFFFF', { roughness: .6 }), x, .55, z);
      for (const sx of [-.8, .8]) for (const sz of [-1.6, 1.6]) mesh(new THREE.CylinderGeometry(.07, .07, 3.1, 6), M('#C9B79B'), x + sx, 1.55, z + sz);
      const cn = mesh(new THREE.BoxGeometry(2.6, .22, 4.1), M(cols4[i]), x, 3.15, z); cn.rotation.z = (x < 0 ? -1 : 1) * .12;
      col(x, z, 1.9);
      for (let k = 0; k < 2; k++) { const sp = cardSprite(words[wi++ % words.length], '#FFFFFF'); sp.scale.multiplyScalar(.5); sp.position.set(x, 4.2 + k * .9, z - .8 + k * 1.6); scene.add(sp); W.words.push(sp); sp.userData.y0 = sp.position.y; }
    });
    const lb = labelSprite(mk.name, '#E36FA0'); lb.position.set(mk.x, 8.6, mk.z); scene.add(lb);
  }

  function buildTwin() {
    const t = P.twin, n = C.nodes.tw, bx = t.x + 2, bz = t.z - 2;
    mesh(new THREE.CylinderGeometry(4.3, 4.5, 4.4, 6), M('#E3DCFF'), bx, 2.2, bz);
    mesh(new THREE.CylinderGeometry(.01, 5, 2.4, 6), M('#8C6CD0', { flatShading: true }), bx, 5.6, bz);
    col(bx, bz, 4.6);
    const fx = n[0] - bx, fz = n[1] - bz, fl = Math.hypot(fx, fz), ux = fx / fl, uz = fz / fl, px = -uz, pz = ux;
    const cx = bx + ux * 7, cz = bz + uz * 7;
    W.twin = { center: { x: cx + ux * 1.6, z: cz + uz * 1.6 }, desks: [] };
    for (const s of [-3, 0, 3]) {
      const dx = cx + px * s, dz = cz + pz * s;
      const d = mesh(new THREE.BoxGeometry(1.7, .9, 1), M('#FFFFFF', { roughness: .5 }), dx, .45, dz); d.rotation.y = Math.atan2(ux, uz);
      mesh(new THREE.PlaneGeometry(1.1, .55), B('#B9A2FF'), dx, .92, dz, null, false).rotation.x = -Math.PI / 2;
      col(dx, dz, .9);
      const pad = mesh(new THREE.CircleGeometry(.6, 20), B('#B9A2FF', { transparent: true, opacity: .55 }), dx + ux * 1.3, .03, dz + uz * 1.3, null, false); pad.rotation.x = -Math.PI / 2;
      W.twin.desks.push({ x: dx + ux * 1.3, z: dz + uz * 1.3, fx: dx, fz: dz });
    }
    const lb = labelSprite(t.name, '#3FA37A'); lb.position.set(bx, 10, bz); scene.add(lb);
  }

  function buildMemo() {
    const m = P.memo; W.notes = [];
    mesh(new THREE.CylinderGeometry(2, 2.4, 13, 24), M('#FFF7DC', { roughness: .6 }), m.x, 6.5, m.z);
    mesh(new THREE.ConeGeometry(2.4, 2.4, 24), M('#F2B544', { roughness: .5 }), m.x, 14.2, m.z);
    W.memoBeacon = mesh(new THREE.SphereGeometry(.45, 14, 10), M('#FFE58A', { emissive: '#FFD54A', emissiveIntensity: .7 }), m.x, 15.8, m.z, null, false);
    for (let i = 0; i < 26; i++) {
      const a = i * .62, y = 1.2 + i * .44, r = 2.28;
      const mt = new THREE.MeshStandardMaterial({ color: '#FFF3B0', emissive: '#FFD54A', emissiveIntensity: i < 14 ? .35 : 0, side: THREE.DoubleSide });
      const pl = mesh(new THREE.PlaneGeometry(.75, .5), mt, m.x + Math.sin(a) * r, y, m.z + Math.cos(a) * r, null, false);
      pl.rotation.y = a; W.notes.push(mt);
    }
    col(m.x, m.z, 2.8);
    const lb = labelSprite(m.name, '#C99400'); lb.position.set(m.x, 18, m.z); scene.add(lb);
  }

  function buildLake() {
    const L = P.lake;
    W.water = new THREE.MeshStandardMaterial({ color: '#7EC8F0', emissive: '#5FB4E8', emissiveIntensity: .25, roughness: .15, metalness: .1, transparent: true, opacity: .9 });
    const w = mesh(new THREE.CircleGeometry(7.4, 48), W.water, L.x, .06, L.z, null, false); w.rotation.x = -Math.PI / 2; w.receiveShadow = true;
    const rim = mesh(new THREE.TorusGeometry(7.5, .4, 8, 56), M('#EFE9DE'), L.x, .1, L.z); rim.rotation.x = Math.PI / 2;
    col(L.x, L.z, 7.9);
    W.qmarks = [];
    for (let i = 0; i < 3; i++) { const sp = cardSprite('?', 'rgba(255,255,255,.85)', '#2F7FD0'); sp.scale.set(1.6, .5, 1); sp.position.set(L.x + (i - 1) * 3.4, 1.6, L.z + (i % 2 ? 1.5 : -1.5)); scene.add(sp); W.qmarks.push(sp); }
    W.lakeCards = ['장소: 큰 공원', '출발: 아침 9시', '공원 안 큰 수영장'].map((t, i) => {
      const sp = cardSprite(t, '#FFFFFF'); sp.position.set(L.x + (i - 1) * 4.6, -1, L.z + .5); sp.material.opacity = 0; sp.visible = false; scene.add(sp); return sp;
    });
    const lb = labelSprite(L.name, '#2F7FD0'); lb.position.set(L.x, 8, L.z); scene.add(lb);
  }

  function buildBell() {
    const b = P.bell;
    mesh(new THREE.CylinderGeometry(7.6, 8.4, .5, 40), M('#E9F1D6'), b.x, .25, b.z);
    const pm = M('#FFFFFF', { roughness: .5 });
    for (const sx of [-2.2, 2.2]) for (const sz of [-2.2, 2.2]) mesh(new THREE.CylinderGeometry(.22, .26, 6.4, 10), pm, b.x + sx, 3.4, b.z + sz);
    const roof = mesh(new THREE.ConeGeometry(3.9, 2.4, 4), M('#2A4D9B', { flatShading: true }), b.x, 7.8, b.z); roof.rotation.y = Math.PI / 4;
    W.bell = new THREE.Group(); W.bell.position.set(b.x, 6.4, b.z); scene.add(W.bell);
    const prof = [[0, 0], [.9, -.1], [1.25, -1.2], [1.5, -2.1], [1.62, -2.3], [0, -2.3]].map(p => new THREE.Vector2(p[0], p[1]));
    mesh(new THREE.LatheGeometry(prof, 28), M('#F2B544', { roughness: .3, metalness: .5 }), 0, 0, 0, W.bell);
    mesh(new THREE.SphereGeometry(.28, 12, 8), M('#C08000'), 0, -2.3, 0, W.bell);
    col(b.x, b.z, 3.3);
    const lb = labelSprite(b.name, '#2A4D9B'); lb.position.set(b.x, 11.6, b.z); scene.add(lb);
  }

  function buildSmall() {
    // 기다리는 마당: 빛 고리 + 떠오르는 알갱이
    const w = P.waityard;
    const ring = mesh(new THREE.TorusGeometry(5.6, .12, 8, 60), B('#C8B8FF', { transparent: true, opacity: .6 }), w.x, .15, w.z, null, false); ring.rotation.x = Math.PI / 2;
    W.motes = [];
    for (let i = 0; i < 16; i++) { const m = mesh(new THREE.SphereGeometry(.07, 6, 4), B('#E7DEFF'), w.x + rand(-5, 5), rand(0, 4), w.z + rand(-5, 5), null, false); W.motes.push(m); }
    const lw = labelSprite(w.name, '#8C6CD0', .8); lw.position.set(w.x, 6.5, w.z); scene.add(lw);
    // 패턴 정원: 빨강·노랑이 번갈아 피고 마지막 자리는 비어 있음(패턴이 문제)
    const g = P.garden, fc = { R: '#E0483E', Y: '#F2B544', B: '#4F8FE0', W: '#FFFFFF', P: '#D9549A' };
    const rows = [['R', 'Y', 'R', 'Y', 'R', null], ['B', 'B', 'W', 'B', 'B', 'W'], ['P', 'Y', 'Y', 'P', 'Y', 'Y']];
    rows.forEach((row, ri) => row.forEach((c, ci) => {
      const x = g.x - 4.5 + ci * 1.8, z = g.z - 2.6 + ri * 2.6;
      if (!c) { const q = cardSprite('?', '#FFFFFF', '#E0483E'); q.scale.set(1.5, .47, 1); q.position.set(x, 1.1, z); scene.add(q); return; }
      mesh(new THREE.CylinderGeometry(.05, .05, .9, 6), M('#4F9A1E'), x, .45, z, null, false);
      mesh(new THREE.SphereGeometry(.3, 12, 8), M(fc[c], { emissive: fc[c], emissiveIntensity: .15 }), x, 1, z);
    }));
    const lg = labelSprite(g.name, '#4F9A1E'); lg.position.set(g.x, 7.2, g.z); scene.add(lg);
    // 꿈 공방: 반투명 둥근 지붕 + 세상에 없던 것들
    const d = P.dream;
    mesh(new THREE.CylinderGeometry(4.6, 4.8, .4, 36), M('#FFFFFF', { roughness: .5 }), d.x + 1.5, .2, d.z + 1);
    const dome = mesh(new THREE.SphereGeometry(4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M('#F7C8EA', { transparent: true, opacity: .55, roughness: .2 }), d.x + 1.5, .4, d.z + 1); dome.castShadow = false;
    mesh(new THREE.ConeGeometry(1.1, 2, 20, 1, true), M('#D9549A'), d.x + 1.5, 1.4, d.z + 1).rotation.x = Math.PI;
    col(d.x + 1.5, d.z + 1, 4.6);
    W.dreamThings = [];
    const fish = new THREE.Group(); mesh(new THREE.SphereGeometry(.55, 14, 10), M('#8FD8FF'), 0, 0, 0, fish).scale.set(1.5, .8, .7);
    for (const s of [-1, 1]) { const wg = mesh(new THREE.PlaneGeometry(1, .5), M('#FFFFFF', { side: THREE.DoubleSide }), 0, .35, s * .4, fish, false); wg.rotation.x = s * .9; }
    mesh(new THREE.ConeGeometry(.35, .6, 10), M('#8FD8FF'), -.95, 0, 0, fish).rotation.z = Math.PI / 2;
    const cube = new THREE.Group(); mesh(new THREE.BoxGeometry(.8, .8, .8), M('#E0483E'), 0, 0, 0, cube); mesh(new THREE.SphereGeometry(.18, 8, 6), M('#4F9A1E'), 0, .55, 0, cube);
    const cloud = new THREE.Group(); for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(.45, 10, 8), M('#FFFFFF'), (i - 1) * .55, 0, 0, cloud); for (const s of [-.5, .5]) mesh(new THREE.CylinderGeometry(.18, .18, .12, 12), M('#3D4A6B'), s, -.45, .3, cloud).rotation.x = Math.PI / 2;
    for (const o of [fish, cube, cloud]) { scene.add(o); W.dreamThings.push(o); }
    const ld = labelSprite(d.name, '#D9549A'); ld.position.set(d.x + 1.5, 9, d.z + 1); scene.add(ld);
    const lp = labelSprite(P.plaza.name, '#E0483E', 1.05); lp.position.set(0, 8.4, -6); scene.add(lp);
  }

  function buildDecor() {
    // 빛 결정 나무: 길과 장소를 피해서 흩어 심는다
    const pal = ['#9FF0DC', '#B9A2FF', '#8FD8FF', '#FFB3D9', '#C8F5A8'];
    const trunk = M('#FFFFFF', { roughness: .5 });
    let n = 0, tries = 0;
    while (n < 46 && tries < 3000) {
      tries++;
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (R - 5), x = Math.cos(a) * d, z = Math.sin(a) * d;
      let ok = true;
      for (const [na, nb, w] of C.roads) { if (segDist(x, z, C.nodes[na][0], C.nodes[na][1], C.nodes[nb][0], C.nodes[nb][1]) < w / 2 + 2.2) { ok = false; break; } }
      if (ok) for (const k in P) { if (dist2(x, z, P[k].x, P[k].z) < P[k].r + 3.2) { ok = false; break; } }
      if (ok) for (const c of cols) { if (dist2(x, z, c.x, c.z) < c.r + 2) { ok = false; break; } }
      if (!ok) continue;
      const s = rand(.8, 1.5), c = pick(pal);
      mesh(new THREE.CylinderGeometry(.08 * s, .14 * s, 1.6 * s, 6), trunk, x, .8 * s, z);
      const cr = mesh(new THREE.OctahedronGeometry(.95 * s, 0), M(c, { flatShading: true, emissive: c, emissiveIntensity: .18 }), x, 2.2 * s, z);
      cr.scale.y = 1.4; cr.rotation.y = rand(0, 3);
      col(x, z, .55); n++;
    }
  }

  // ================= 주민·사람 모양 =================
  const GEO = {
    headR: new THREE.SphereGeometry(.5, 24, 18), headC: new THREE.BoxGeometry(.92, .78, .82),
    bodyR: new THREE.SphereGeometry(.4, 20, 14), tip: new THREE.ConeGeometry(.3, .5, 18),
    bodyT: new THREE.CapsuleGeometry(.3, .32, 6, 14), face: new THREE.CircleGeometry(.3, 24),
    eye: new THREE.SphereGeometry(.07, 10, 8), stick: new THREE.CylinderGeometry(.025, .025, .38, 6),
    ball: new THREE.SphereGeometry(.09, 12, 8), halo: new THREE.TorusGeometry(.26, .04, 8, 24),
    ear: new THREE.SphereGeometry(.12, 10, 8), ring: new THREE.RingGeometry(.34, .54, 28),
    shadow: new THREE.CircleGeometry(.58, 20), letter: new THREE.BoxGeometry(.46, .32, .06)
  };
  const faceMat = new THREE.MeshBasicMaterial({ color: '#1E2B4A' });
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#1E2B4A', transparent: true, opacity: .16, depthWrite: false });
  const letterMat = new THREE.MeshBasicMaterial({ color: '#FFF3B0' });
  function makeBot(look) {
    const root = new THREE.Group(), fl = new THREE.Group(); root.add(fl);
    const bodyMat = new THREE.MeshStandardMaterial({ color: look.body, roughness: .5, emissive: look.body, emissiveIntensity: .06 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: look.eye });
    const ringMat = new THREE.MeshBasicMaterial({ color: look.eye, transparent: true, opacity: .5, depthWrite: false });
    const add = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); (p || fl).add(o); return o; };
    if (look.v === 'tall') add(GEO.bodyT, bodyMat, 0, .58, 0);
    else { const b = add(GEO.bodyR, bodyMat, 0, .62, 0); b.scale.set(look.v === 'cube' ? 1.05 : 1, .85, look.v === 'cube' ? 1.05 : 1); add(GEO.tip, bodyMat, 0, .3, 0).rotation.x = Math.PI; }
    const head = add(look.v === 'cube' ? GEO.headC : GEO.headR, bodyMat, 0, 1.34, 0);
    if (look.v !== 'cube') head.scale.set(1.05, .88, .95);
    const fz = look.v === 'cube' ? .415 : .45;
    add(GEO.face, faceMat, 0, 1.32, fz).scale.set(1.25, .86, 1);
    const eL = add(GEO.eye, eyeMat, -.15, 1.34, fz + .02), eR = add(GEO.eye, eyeMat, .15, 1.34, fz + .02);
    eL.scale.z = eR.scale.z = .4;
    for (const s of [-1, 1]) add(GEO.ear, eyeMat, s * (look.v === 'cube' ? .5 : .52), 1.34, 0).scale.set(.5, 1, 1);
    let ant;
    if (look.ant === 'ring') { ant = add(GEO.halo, eyeMat, 0, 1.98, 0); ant.rotation.x = Math.PI / 2; }
    else if (look.ant === 'twin') { ant = new THREE.Group(); ant.position.y = 1.72; fl.add(ant); for (const s of [-1, 1]) { const st = add(GEO.stick, bodyMat, s * .12, .17, 0, ant); st.rotation.z = -s * .35; add(GEO.ball, eyeMat, s * .19, .36, 0, ant); } }
    else { add(GEO.stick, bodyMat, 0, 1.86, 0); ant = add(GEO.ball, eyeMat, 0, 2.06, 0); }
    const carry = add(GEO.letter, letterMat, 0, 2.45, 0); carry.visible = false;
    const ring = new THREE.Mesh(GEO.ring, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; root.add(ring);
    const sh = new THREE.Mesh(GEO.shadow, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = .03; root.add(sh);
    const s = look.s || 1; fl.scale.setScalar(s);
    scene.add(root);
    return { root, fl, bodyMat, eyeMat, ringMat, eL, eR, ant, carry, sh, s, eyeCol: new THREE.Color(look.eye) };
  }
  function disposeBot(m) { scene.remove(m.root); m.bodyMat.dispose(); m.eyeMat.dispose(); m.ringMat.dispose(); }

  const LOOK = { skin: ['#FFE0C7', '#F6CFAE', '#E8B48F', '#C98E66'], hair: ['#2B2420', '#4A3428', '#7A4E33', '#B98A57', '#E2C48F'], shirt: ['#E0483E', '#2A4D9B', '#F2B544', '#3FA37A', '#8C6CD0', '#4FB3D9'], pants: ['#2F3A56', '#4A5A78', '#6B5B4B', '#3D6B5A'] };
  const randLook = () => ({ skin: pick(LOOK.skin), hair: pick(LOOK.hair), shirt: pick(LOOK.shirt), pants: pick(LOOK.pants) });
  if (!S.look) S.look = randLook();
  function makeHuman(look) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const sk = M(look.skin, { roughness: .7 }), hr = M(look.hair, { roughness: .9 }), sh = M(look.shirt, { roughness: .8 }), pa = M(look.pants, { roughness: .9 });
    const add = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; (p || body).add(o); return o; };
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * .12, .66, 0); body.add(hip);
      add(new THREE.BoxGeometry(.19, .62, .22), pa, 0, -.31, 0, hip); add(new THREE.BoxGeometry(.21, .1, .3), M('#FFFFFF'), 0, -.62, .04, hip); legs.push(hip);
      const sho = new THREE.Group(); sho.position.set(s * .32, 1.16, 0); body.add(sho);
      add(new THREE.BoxGeometry(.13, .48, .15), sh, 0, -.24, 0, sho); add(new THREE.SphereGeometry(.075, 8, 6), sk, 0, -.52, 0, sho); arms.push(sho);
    }
    add(new THREE.CapsuleGeometry(.24, .26, 4, 10), sh, 0, .93, 0);
    add(new THREE.SphereGeometry(.27, 18, 14), sk, 0, 1.48, 0);
    const hair = add(new THREE.SphereGeometry(.29, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), hr, 0, 1.51, -.02); hair.rotation.x = -.25;
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(.035, 8, 6), B('#1E2B4A'), s * .09, 1.48, .25);
    const shd = new THREE.Mesh(GEO.shadow, shadowMat); shd.rotation.x = -Math.PI / 2; shd.position.y = .03; root.add(shd);
    scene.add(root);
    return { root, body, legs, arms };
  }

  // ================= 화면 위 이름표·말풍선 =================
  const tagsEl = $('tags');
  function makeTag(name, color, me) {
    const el = document.createElement('div'); el.className = 'tag' + (me ? ' me' : '');
    el.innerHTML = '<span class="mk" hidden>!</span><span class="mem" hidden><b></b></span><span class="nm"><i></i><span></span></span><span class="st" hidden></span>';
    el.querySelector('.nm i').style.setProperty('--c', color);
    el.querySelector('.nm span').textContent = name;
    const bub = document.createElement('div'); bub.className = 'bub'; bub.hidden = true; el.hidden = true;
    tagsEl.appendChild(bub); tagsEl.appendChild(el);
    return { el, bub, mk: el.querySelector('.mk'), st: el.querySelector('.st'), mem: el.querySelector('.mem'), memB: el.querySelector('.mem b'), shown: false, stTx: '', bubT: 0 };
  }
  const _v = new THREE.Vector3();
  function project(x, y, z) { _v.set(x, y, z).project(camera); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight, ok: _v.z < 1 && _v.z > -1 }; }

  // ================= 주민 =================
  const AMB = C.ambient || {};
  const spotsUsed = {};
  function takeSpot(kind, avoid) {
    const list = C.spots[kind]; if (!list) return null;
    const free = list.map((s, i) => i).filter(i => !spotsUsed[kind + i] && !(avoid && avoid.includes(i)));
    if (!free.length) return null;
    const i = pick(free); spotsUsed[kind + i] = true; return { kind, i, s: list[i] };
  }
  const freeSpot = sp => { if (sp) delete spotsUsed[sp.kind + sp.i]; };
  const WORK = ['market', 'library', 'garden', 'dream', 'tool', 'memo', 'lake', 'market', 'library', 'garden'];
  const GREY = new THREE.Color('#B9C2D3');
  const bots = {}, botList = [];
  let player, hana, rini;

  class Bot {
    constructor(def) {
      this.def = def; this.id = def.id; this.name = def.name; this.role = def.role;
      this.m = makeBot(def.look); this.tag = makeTag(def.name, def.look.eye);
      this.x = 0; this.z = 0; this.yaw = rand(0, 6.28); this.speed = rand(2.5, 3.2);
      this.plan = []; this.wp = null; this.dim = 0; this.dimT = 0; this.busy = false; this.status = 'walk';
      this.ph = rand(0, 6.28); this.blinkT = rand(1, 4); this.blink = 0; this.greeted = false; this.lookT = 0;
      this.mode = null; this.mem = .2; this.showMem = false; this.carrying = false; this.spot = null; this.ambT = rand(4, 12);
    }
    place(x, z) { this.x = x; this.z = z; }
    say(text, dur, ai) {
      const t = this.tag; t.bub.textContent = fmt(text); t.bub.className = 'bub' + (ai ? ' ai' : ''); t.bubT = dur || 2.8;
    }
    face(dx, dz, dt, k) {
      if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
      const want = Math.atan2(dx, dz); let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * (k || 7));
    }
    stepTo(tx, tz, dt, sp) {
      const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
      if (d < .2) return true;
      const st = Math.min(d, (sp || this.speed) * dt);
      this.x += dx / d * st; this.z += dz / d * st; this.face(dx, dz, dt); this.moving = true;
      return d - st < .2;
    }
    releaseAll() { freeSpot(this.spot); this.spot = null; }
    choose() {
      const r = this.role;
      if (r === 'keeper' || r === 'guide') {
        const h = this.home(); const out = [];
        if (dist2(this.x, this.z, h[0], h[1]) > 1.6) out.push({ type: 'goto', x: h[0], z: h[1], sp: r === 'guide' ? 6.5 : 0 });
        out.push({ type: 'do', kind: 'idle', dur: rand(4, 9), face: [h[2] != null ? h[2] : h[0], h[3] != null ? h[3] : h[1] + 5] });
        if (Math.random() < .45) { const a = rand(0, 6.28); out.push({ type: 'goto', x: h[0] + Math.cos(a) * 1.1, z: h[1] + Math.sin(a) * 1.1, sp: 1.4 }); }
        return out;
      }
      if (r === 'courier') return this.deliverPlan(Math.random() < .2);
      const q = Math.random();
      if (q < .2) return this.spotPlan('charge', rand(6, 11));
      if (q < .36) return this.spotPlan('wait', rand(8, 15));
      if (q < .66) return this.spotPlan(pick(WORK), rand(5, 9));
      if (q < .84) { const c = this.chatPlan(); if (c) return c; }
      const n = farNode(); return [{ type: 'goto', x: n[0] + rand(-1.2, 1.2), z: n[1] + rand(-1.2, 1.2) }, { type: 'do', kind: 'idle', dur: rand(1, 3) }];
    }
    spotPlan(kind, dur) {
      const sp = takeSpot(kind, kind === 'wait' ? [0] : null);           // 기다리는 자리 0번은 하나 자리
      if (!sp) return [{ type: 'do', kind: 'idle', dur: 1 }];
      this.releaseAll(); this.spot = sp;
      return [{ type: 'goto', x: sp.s[0], z: sp.s[1] }, { type: 'do', kind, dur, face: [sp.s[2], sp.s[3]], spot: true }];
    }
    deliverPlan(charge) {
      if (charge) return this.spotPlan('charge', rand(5, 8));
      const ms = pick(C.spots.mail), wk = pick(['tool', 'library', 'market', 'memo', 'lake', 'garden', 'dream']);
      const ws = pick(C.spots[wk]);
      return [{ type: 'goto', x: ms[0], z: ms[1] }, { type: 'do', kind: 'mail', dur: 1.4, face: [0, 0], end: b => { b.carrying = true; } },
        { type: 'goto', x: ws[0] + rand(-.8, .8), z: ws[1] + rand(-.8, .8), st: 'deliver' }, { type: 'do', kind: 'deliver', dur: 1.3, face: [ws[2], ws[3]], start: b => { if (Math.random() < .5) b.say(pick(AMB.deliver || ['배달 왔어요!']), 2.2); }, end: b => { b.carrying = false; burst(b.x, 2.4, b.z, ws[2], 1.4, ws[3], '#FFE58A', 5); } }];
    }
    chatPlan() {
      const cand = botList.filter(o => o !== this && o.role === 'wander' && !o.busy && !o.chatting && o.plan.length && o.plan[0].kind !== 'chat' && o.plan[0].type === 'goto' && !o.plan[0].st && dist2(o.x, o.z, this.x, this.z) < 45);
      if (!cand.length) return null;
      // 만나는 곳: 말을 건 주민 가까운 길 점(둘의 가운데는 늘 광장 쪽이라 한곳에 몰림), 사람 손님 근처는 피한다
      const o = pick(cand), n = farNodeNear(this.x, this.z);
      const a = rand(0, 6.28), cx = n[0] + Math.cos(a) * 1.4, cz = n[1] + Math.sin(a) * 1.4;
      const pair = pick(C.chats);
      o.releaseAll(); o.plan = [{ type: 'goto', x: cx + .9, z: cz }, { type: 'do', kind: 'chat', dur: 6.5, with: this, line: pair[1], first: false }];
      o.chatting = true; this.chatting = true;
      return [{ type: 'goto', x: cx - .9, z: cz }, { type: 'do', kind: 'chat', dur: 6.5, with: o, line: pair[0], first: true }];
    }
    home() {
      if (this.role === 'guide') { const q = C.quests[Math.min(S.q, C.quests.length - 1)]; const h = S.q >= C.quests.length ? [-3, 3.2] : q.rini; return [h[0], h[1], P.plaza.x, P.plaza.z + 12]; }
      return this.def.home;
    }
    update(dt, t) {
      this.moving = false;
      this.dim += (this.dimT - this.dim) * Math.min(1, dt * 2);
      if (this.lookT > 0) this.lookT -= dt;
      if (this.busy) { this.face(player.x - this.x, player.z - this.z, dt); }
      else if (this.mode === 'script') { this.status = this.goal ? 'walk' : (this.role === 'hana' ? 'follow' : this.status); if (this.goal) { if (this.stepTo(this.goal.x, this.goal.z, dt, this.goal.sp || 6)) { const g = this.goal; this.goal = null; g.res(); } } else if (this.faceAt) this.face(this.faceAt[0] - this.x, this.faceAt[1] - this.z, dt); }
      else if (this.mode === 'follow') this.follow(dt);
      else if (this.mode === 'wait') this.waitHome(dt);
      else this.runPlan(dt, t);
      const pd = dist2(this.x, this.z, player.x, player.z);
      if (!this.busy && !this.moving && (this.lookT > 0 || ((this.role === 'keeper' || this.role === 'guide') && pd < 7))) this.face(player.x - this.x, player.z - this.z, dt);
      // 처음 보는 사람 손님에게 인사
      if (!this.greeted && pd < 3.6 && this.dim < .5 && !this.busy && started && !D.open && this.mode !== 'follow' && !(this.role === 'guide' && S.q > 0)) {   // 같이 다니는 하나·이미 만난 리니는 다시 인사하지 않음
        this.greeted = true; this.lookT = 2.2;
        this.say(S.done ? pick(C.greetsDone) : (this.def.greet || pick(C.greets)), 2.4);
      }
      if (pd > 14) this.greeted = this.greeted && pd < 40;
      this.anim(dt, t);
    }
    waitHome(dt) {
      const s = C.spots.wait[0];
      if (this.stepTo(s[0], s[1], dt, 3)) { this.dimT = 1; this.status = 'wait'; this.face(s[2] - this.x, s[3] - this.z, dt); }
      else { this.status = 'walk'; this.dimT = 0; }
    }
    follow(dt) {
      this.status = 'follow'; this.dimT = 0;
      // 화면에서 사람 손님을 가리지 않게 늘 옆(동·서 가운데 가까운 쪽)에 붙어 다닌다
      const side = this.x < player.x ? -1 : 1, tx = player.x + side * 1.8, tz = player.z + .2;
      const d = dist2(this.x, this.z, tx, tz);
      if (d > 30) { this.x = tx; this.z = tz; return; }
      if (d > .5) this.stepTo(tx, tz, dt, clamp(d * 2.2, 2, 9));
      else this.face(player.x - this.x, player.z - this.z, dt, 3);
    }
    runPlan(dt) {
      if (!this.plan.length) { this.chatting = false; this.plan = this.choose(); }
      const s = this.plan[0];
      if (!s.started) {
        s.started = true; s.t = 0;
        if (s.type === 'goto') { this.wp = route(this.x, this.z, s.x, s.z); this.status = s.st || 'walk'; }
        else { this.status = s.kind; if (s.kind === 'wait') this.dimT = 1; if (s.start) s.start(this); if (s.kind === 'chat') s.said = 0; }
      }
      let done = false;
      if (s.type === 'goto') {
        const w = this.wp[0], last = this.wp.length === 1, sp = s.sp || this.speed;
        // 지난 장면부터 실제로 움직인 거리(밀려난 것까지 포함)
        const net = this.gx0 == null ? 1 : Math.hypot(this.x - this.gx0, this.z - this.gz0);
        this.gx0 = this.x; this.gz0 = this.z;
        let reached = this.stepTo(w[0], w[1], dt, sp);
        // 길 중간 점은 1.3칸 안이면 지나간 것으로(사람 손님이나 다른 주민이 그 점에 서 있어도 줄줄이 막히지 않게)
        if (!reached && !last && dist2(this.x, this.z, w[0], w[1]) < 1.3) reached = true;
        // 1.2초 넘게 거의 못 움직이면(밀려서 제자리) 그 점은 건너뛴다
        if (!reached) { if (net < sp * dt * .3) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 1.2) reached = true; } else this.stuckT = 0; }
        if (reached) { this.stuckT = 0; this.wp.shift(); if (!this.wp.length) done = true; }
      } else {
        s.t += dt;
        if (s.face) this.face(s.face[0] - this.x, s.face[1] - this.z, dt, 4);
        if (s.kind === 'chat') this.chatTick(s, dt);
        if (s.kind === 'wait' && this.wakeCall) { this.wakeCall = false; done = true; this.dimT = 0; this.say(pick(AMB.wakeup || ['부탁이 왔다!']), 2.4); this.releaseAll(); this.plan = [s].concat(this.deliverPlan(false)); }
        if (s.kind === 'charge' && Math.random() < dt * 1.2) { const tr = nearestTree(this.x, this.z); burst(tr[0], tr[1], tr[2], this.x, 2.3, this.z, '#7FFFD4', 1); }
        this.ambT -= dt;
        if (this.ambT < 0) { this.ambT = rand(7, 16); const L = AMB[s.kind]; if (L && dist2(this.x, this.z, player.x, player.z) < 26) this.say(pick(L), 2.4, true); }
        if (s.t >= s.dur) done = true;
      }
      if (done) {
        if (s.type === 'do') { if (s.kind === 'wait') this.dimT = 0; if (s.spot) this.releaseAll(); if (s.end) s.end(this); if (s.kind === 'chat') this.chatting = false; }
        this.plan.shift();
      }
    }
    chatTick(s, dt) {
      const o = s.with, ready = o && o.plan.length && o.plan[0].kind === 'chat' && o.plan[0].started;
      if (!ready) { s.t -= dt; s.waitT = (s.waitT || 0) + dt; if (s.waitT > 9) s.t = s.dur; return; }   // 상대가 올 때까지 기다림(9초까지)
      this.face(o.x - this.x, o.z - this.z, dt, 5);
      const at = s.first ? .3 : 2.3;
      if (!s.said && s.t > at) { s.said = 1; if (dist2(this.x, this.z, player.x, player.z) < 30) this.say(s.line, 2.6, true); for (let i = 0; i < 6; i++) bit(this.x, 1.5, this.z, o.x, 1.5, o.z, '#7FE9FF', i * .09, .8, .5); }
    }
    anim(dt, t) {
      const m = this.m, d = this.dim;
      m.root.position.set(this.x, 0, this.z); m.root.rotation.y = this.yaw;
      m.fl.position.y = .3 + d * .5 + Math.sin(t * 2.2 + this.ph) * (.07 + d * .05) + (this.lift || 0);
      m.fl.rotation.x = lerp(m.fl.rotation.x, this.moving ? .14 : 0, Math.min(1, dt * 6));
      this.blinkT -= dt; if (this.blinkT < 0) { this.blinkT = rand(2, 5); this.blink = .13; }
      let ey = 1 - d * .85; if (this.blink > 0) { this.blink -= dt; ey *= .15; }
      m.eL.scale.y = m.eR.scale.y = Math.max(.12, ey);
      m.ant.scale.setScalar(1 + Math.sin(t * 4 + this.ph) * .14 * (1 - d));
      const glow = this.status === 'charge' ? .32 + Math.sin(t * 7 + this.ph) * .18 : .06;
      m.bodyMat.emissiveIntensity = lerp(m.bodyMat.emissiveIntensity, glow * (1 - d), Math.min(1, dt * 4));
      m.bodyMat.transparent = d > .02; m.bodyMat.opacity = 1 - d * .5;
      m.eyeMat.color.copy(m.eyeCol).lerp(GREY, d * .75);
      m.ringMat.opacity = .5 * (1 - d) + .1;
      m.sh.scale.setScalar(1 - d * .35);
      m.carry.visible = this.carrying; if (this.carrying) m.carry.rotation.y += dt * 2;
    }
  }
  // 주민이 산책·대화할 길 점은 사람 손님에게서 10칸 넘게 떨어진 곳만(손님 주위로 점점 모이지 않게)
  const awayFromMe = p => !player || dist2(p[0], p[1], player.x, player.z) > 10;
  function farNode() { const ok = NP.filter(awayFromMe); return pick(ok.length ? ok : NP); }
  function farNodeNear(x, z) { const s = NP.filter(awayFromMe).sort((a, b) => dist2(a[0], a[1], x, z) - dist2(b[0], b[1], x, z)); return s[0] || NP[nearestNode(x, z)]; }
  function nearestTree(x, z) { let b = W.trees[0], bd = Infinity; for (const tr of W.trees) { const d = dist2(x, z, tr[0], tr[2]); if (d < bd) { bd = d; b = tr; } } return b; }

  // ================= 사람 손님(나) =================
  class Human {
    constructor() { this.x = P.arrival.x; this.z = P.arrival.z - 2; this.yaw = Math.PI; this.vx = 0; this.vz = 0; this.ph = 0; this.goal = null; this.talkTo = null; this.build(); }
    build() { if (this.m) scene.remove(this.m.root); this.m = makeHuman(S.look); if (!this.tag) this.tag = makeTag(S.name || T.guest, '#E0483E', true); this.tag.el.querySelector('.nm span').textContent = S.name || T.guest; }
    update(dt) {
      let ix = 0, iz = 0;
      if (!locked()) {
        if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
        ix += joy.x; iz += joy.z;
      }
      const il = Math.hypot(ix, iz);
      if (il > .08) { this.goal = null; this.talkTo = null; ix /= Math.max(1, il); iz /= Math.max(1, il); }
      else if (this.goal && !locked()) {
        const gx = this.talkTo ? this.talkTo.x : this.goal.x, gz = this.talkTo ? this.talkTo.z : this.goal.z;
        const dx = gx - this.x, dz = gz - this.z, d = Math.hypot(dx, dz);
        const stopAt = this.talkTo ? 2 : .3;
        if (d < stopAt) { const tb = this.talkTo; this.goal = null; this.talkTo = null; if (tb) talkTo(tb); }
        else { ix = dx / d; iz = dz / d; if (d < 1.5) { ix *= d / 1.5; iz *= d / 1.5; } }
      } else this.goal = null;
      const sp = 7.2, k = Math.min(1, dt * 10);
      this.vx = lerp(this.vx, ix * sp, k); this.vz = lerp(this.vz, iz * sp, k);
      const px0 = this.x, pz0 = this.z;
      this.x += this.vx * dt; this.z += this.vz * dt;
      for (const c of cols) { const dx = this.x - c.x, dz = this.z - c.z, d = Math.hypot(dx, dz), r = c.r + .4; if (d < r && d > 1e-4) { this.x = c.x + dx / d * r; this.z = c.z + dz / d * r; } }
      for (const b of botList) { const dx = this.x - b.x, dz = this.z - b.z, d = Math.hypot(dx, dz), r = .9; if (d < r && d > 1e-4) { this.x = b.x + dx / d * r; this.z = b.z + dz / d * r; } }
      const rr2 = Math.hypot(this.x, this.z); if (rr2 > R - 2.5) { this.x *= (R - 2.5) / rr2; this.z *= (R - 2.5) / rr2; }
      // 눌러 둔 목적지로 가다가 건물·섬 끝에 막혀 제자리걸음이면 멈춘다
      if (this.goal && Math.hypot(this.x - px0, this.z - pz0) < sp * dt * .12) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > .7) { this.goal = null; this.talkTo = null; } } else this.stuckT = 0;
      const spd = Math.hypot(this.vx, this.vz);
      if (spd > .3) { const want = Math.atan2(this.vx, this.vz); let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); }
      else if (D.open && D.bot) { const want = Math.atan2(D.bot.x - this.x, D.bot.z - this.z); let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 6); }
      this.ph += dt * spd * 1.55;
      const sw = Math.sin(this.ph) * Math.min(1, spd / 4) * .7;
      const m = this.m; m.root.position.set(this.x, 0, this.z); m.root.rotation.y = this.yaw;
      m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw; m.arms[0].rotation.x = -sw * .8; m.arms[1].rotation.x = sw * .8;
      m.body.position.y = Math.abs(Math.cos(this.ph)) * .05 * Math.min(1, spd / 4);
    }
  }

  // ================= 빛 알갱이·연출 도구 =================
  const bitGeo = new THREE.BoxGeometry(.12, .12, .12), bits = [];
  function bit(ax, ay, az, bx, by, bz, color, delay, dur, arc) {
    let b = bits.find(o => !o.on);
    if (!b) { if (bits.length > 140) return; b = { m: new THREE.Mesh(bitGeo, B(color)) }; scene.add(b.m); bits.push(b); }
    b.m.material = B(color); Object.assign(b, { on: true, ax, ay, az, bx, by, bz, t: -(delay || 0), dur: dur || .8, arc: arc == null ? 1 : arc }); b.m.visible = false;
  }
  function burst(ax, ay, az, bx, by, bz, color, n) { for (let i = 0; i < n; i++) bit(ax, ay, az, bx, by, bz, color, i * .08, .7 + Math.random() * .3, 1.2); }
  function updBits(dt) {
    for (const b of bits) {
      if (!b.on) continue; b.t += dt; if (b.t < 0) continue;
      const k = b.t / b.dur; if (k >= 1) { b.on = false; b.m.visible = false; continue; }
      b.m.visible = true; b.m.position.set(lerp(b.ax, b.bx, k), lerp(b.ay, b.by, k) + Math.sin(k * Math.PI) * b.arc, lerp(b.az, b.bz, k)); b.m.rotation.y += dt * 6;
    }
  }
  const tweens = [];
  const tween = (dur, fn) => new Promise(res => tweens.push({ t: 0, dur, fn, res }));
  function updTweens(dt) { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(ease(k), k); if (k >= 1) { tweens.splice(i, 1); w.res(); } } }
  function scriptMove(b, x, z, sp) { b.mode = 'script'; return new Promise(res => { b.goal = { x, z, sp, res }; }); }
  function fallingLetter(onLand) {
    const m = new THREE.Mesh(GEO.letter, letterMat); m.scale.setScalar(1.6); scene.add(m);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 40, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#FFE58A', transparent: true, opacity: 0, depthWrite: false })); beam.position.set(W.mail.x, 20, P.plaza.z); scene.add(beam);
    tween(1.7, k => { m.position.set(W.mail.x, lerp(42, 3, k), P.plaza.z); m.rotation.y = k * 9; beam.material.opacity = Math.sin(k * Math.PI) * .35; }).then(() => {
      scene.remove(m); scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); mailFlash(); if (onLand) onLand();
    });
  }
  let mailFlashT = 0;
  const mailFlash = () => { mailFlashT = 1.2; };

  // 마을 쪽지: 일정 시간마다 하늘에서 부탁 쪽지가 우체통에 떨어지고, 기다리던 주민 하나가 깨어나 배달하러 간다
  let requestT = 4;
  function townRequest() {
    fallingLetter(() => {
      const waiting = botList.filter(b => b.role === 'wander' && !b.busy && b.plan.length && b.plan[0].kind === 'wait' && b.plan[0].started);
      if (waiting.length) pick(waiting).wakeCall = true;
    });
  }

  // ================= 입력 =================
  const keys = new Set();
  const joy = { x: 0, z: 0, id: null };
  let started = false, cine = null, camFocus = null, zoom = 1;
  const locked = () => !started || !!cine || D.open || evBusy || !$('book').hidden || !$('mapBox').hidden || !$('certBox').hidden;
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    keys.add(e.code);
    if (e.repeat) return;                                // 길게 누를 때 대사가 줄줄이 넘어가지 않게
    if (D.open) {
      if (/^Digit[1-9]$/.test(e.code)) { const b = $('dlgOpts').querySelectorAll('.opt')[+e.code.slice(5) - 1]; if (b && !b.disabled) b.click(); e.preventDefault(); }
      else if (['Space', 'Enter', 'KeyE'].includes(e.code)) { D.adv(); e.preventDefault(); }
      return;
    }
    if (!started || cine) { if (cine && ['Space', 'Enter', 'Escape'].includes(e.code)) cine.t = cine.dur; return; }
    if (e.code === 'Escape') { closeAll(); return; }
    if (['KeyE', 'Space', 'Enter'].includes(e.code) && promptBot && !locked()) { talkTo(promptBot); e.preventDefault(); }
    if (e.code === 'KeyM') toggleMap();
    if (e.code === 'KeyB' && S.gotBook) toggleBook();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const cv = renderer.domElement;
  let down = null; const touches = new Map(); let pinch0 = 0, zoom0 = 1;
  cv.addEventListener('pointerdown', e => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; down = null; return; }
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  cv.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; zoom = clamp(zoom0 * pinch0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), .55, 2.2); }
  });
  const endPtr = e => {
    touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0;
    if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; const d0 = down; down = null;
    if (Math.hypot(dx, dy) > 10 || performance.now() - d0.t > 600) return;
    if (cine) { cine.t = cine.dur; return; }
    if (locked()) return;
    tapAt(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', e => { touches.delete(e.pointerId); down = null; pinch0 = 0; });
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (1 + Math.sign(e.deltaY) * .1), .55, 2.2); }, { passive: false });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tapAt(cx, cy) {
    let best = null, bd = 48;
    for (const b of botList) { const p = project(b.x, 1.3 * b.m.s, b.z); if (!p.ok) continue; const d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = b; } }
    if (best) { player.talkTo = best; player.goal = { x: best.x, z: best.z }; return; }
    ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction; if (d.y >= -.01) return;
    const t = -o.y / d.y; player.goal = { x: o.x + d.x * t, z: o.z + d.z * t }; player.talkTo = null;
    tapMark(player.goal.x, player.goal.z);
  }
  let tapRing;
  function tapMark(x, z) {
    if (!tapRing) { tapRing = new THREE.Mesh(new THREE.RingGeometry(.3, .45, 24), B('#FFFFFF', { transparent: true, opacity: .9, depthWrite: false })); tapRing.rotation.x = -Math.PI / 2; scene.add(tapRing); }
    tapRing.position.set(x, .06, z); tapRing.userData.t = .6; tapRing.visible = true;
  }
  // 조이스틱(터치)
  const joyEl = $('joy'), knob = $('knob');
  if (isTouch) { joyEl.hidden = false; document.body.classList.add('touch'); }
  joyEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); });
  joyEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.z = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', endJoy); joyEl.addEventListener('pointercancel', endJoy);
  function moveJoy(e) {
    const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 14;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / max; joy.z = dy / max;
  }

  // ================= 대화 상자 =================
  const D = { open: false, bot: null, adv: () => {} };
  const dlg = $('dlg'), dlgLine = $('dlgLine'), dlgFb = $('dlgFb'), dlgOpts = $('dlgOpts'), dlgRow = $('dlgRow');
  dlg.addEventListener('click', e => { if (e.target.closest('.opt') || e.target.closest('.pill')) return; D.adv(); });
  function who(id) {
    if (id === 'me') return { name: S.name || T.guest, c: '#E0483E', sub: T.human };
    const b = bots[id]; return b ? { name: b.name, c: b.def.look.eye } : { name: id, c: '#9AA6BC' };
  }
  function setWho(id) { const w = who(id); $('dlgName').textContent = w.name; $('dlgWho').style.setProperty('--c', w.c); $('dlgWho').querySelector('i').style.setProperty('--c', w.c); }
  let typer = null;
  function typeText(text) {
    clearInterval(typer); dlgLine.textContent = ''; const chars = [...text]; let i = 0;
    return new Promise(res => {
      const finish = () => { clearInterval(typer); typer = null; dlgLine.textContent = text; res(); };
      if (reduce) { finish(); D.skipType = null; return; }
      D.skipType = finish;
      typer = setInterval(() => { i += 2; dlgLine.textContent = chars.slice(0, i).join(''); if (i >= chars.length) { D.skipType = null; finish(); } }, 28);
    });
  }
  function nextBtn(label) {
    dlgRow.innerHTML = ''; dlgRow.hidden = false;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pill primary'; b.textContent = (label || T.next) + ' ▶';
    dlgRow.appendChild(b); requestAnimationFrame(() => b.scrollIntoView({ block: 'nearest' })); return b;   // 낮은 화면에서도 버튼이 보이게
  }
  async function sayLine(id, text) {
    dlg.hidden = false; setWho(id); dlgFb.hidden = true; dlgOpts.hidden = true; dlgRow.hidden = true;
    const sp = bots[id]; if (sp && sp !== D.bot && sp.m) sp.lookT = 2;
    await new Promise(res => {
      let typed = false;
      D.adv = () => { if (!typed && D.skipType) { D.skipType(); return; } if (typed) res(); };
      typeText(fmt(text)).then(() => { typed = true; nextBtn().onclick = () => res(); });
    });
  }
  function askQ(it) {
    return new Promise(async res => {
      dlg.hidden = false; setWho(it.who || 'rini'); dlgFb.hidden = true; dlgRow.hidden = true; dlgOpts.hidden = true;
      D.adv = () => { if (D.skipType) D.skipType(); };
      await typeText(fmt(it.ask));
      dlgOpts.innerHTML = ''; dlgOpts.hidden = false;
      const multi = !!it.multi, need = it.n || 1, chosen = new Set();
      const btns = it.options.map((o, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = i + 1;
        b.innerHTML = '<span></span>'; b.firstChild.textContent = fmt(o.t);
        if (it.bars && o.p != null) { const pc = document.createElement('span'); pc.className = 'pc'; pc.textContent = o.p + '%'; b.appendChild(pc); const bar = document.createElement('i'); bar.className = 'bar'; bar.style.setProperty('--p', o.p + '%'); b.appendChild(bar); }
        dlgOpts.appendChild(b); return b;
      });
      const done = (o) => {
        btns.forEach(b => { b.disabled = true; });
        if (o && o.set) Object.assign(S, o.set);
        D.adv = () => res(); nextBtn().onclick = () => res();
      };
      if (multi) {
        const sub = document.createElement('button'); sub.type = 'button'; sub.className = 'pill primary'; sub.textContent = T.pickDone; sub.disabled = true;
        dlgRow.innerHTML = ''; dlgRow.appendChild(sub); dlgRow.hidden = false;
        dlgFb.hidden = false; dlgFb.className = 'fb'; dlgFb.textContent = T.chooseN.replace('{n}', need);
        btns.forEach((b, i) => b.onclick = () => {
          if (b.classList.contains('no')) b.classList.remove('no');
          if (chosen.has(i)) { chosen.delete(i); b.classList.remove('on'); } else if (chosen.size < need) { chosen.add(i); b.classList.add('on'); }
          sub.disabled = chosen.size !== need;
          if (!sub.disabled) sub.scrollIntoView({ block: 'nearest' });
        });
        sub.onclick = () => {
          const wrong = [...chosen].filter(i => !it.options[i].ok);
          if (!wrong.length) { chosen.forEach(i => { btns[i].classList.remove('on'); btns[i].classList.add('ok'); }); dlgFb.className = 'fb ok'; dlgFb.textContent = fmt(it.okFb || T.next); sub.remove(); done(); return; }
          wrong.forEach(i => { chosen.delete(i); btns[i].classList.remove('on'); btns[i].classList.add('no'); });
          dlgFb.className = 'fb no'; dlgFb.textContent = fmt(it.options[wrong[0]].fb || T.tryAgain); sub.disabled = true;
        };
        D.adv = () => { if (!sub.disabled) sub.click(); };   // 키보드 Enter·Space로도 제출
      } else {
        D.adv = () => {};
        btns.forEach((b, i) => b.onclick = () => {
          const o = it.options[i];
          dlgFb.hidden = false;
          if (o.ok) { b.classList.add('ok'); dlgFb.className = 'fb ok'; dlgFb.textContent = fmt(o.fb || ''); done(o); }
          else { b.classList.add('no'); b.disabled = true; dlgFb.className = 'fb no'; dlgFb.textContent = fmt(o.fb || T.tryAgain); }
        });
      }
    });
  }
  let evBusy = false;
  async function runScene(items, bot) {
    D.open = true; D.bot = bot || null; promptHide(); $('hint').hidden = true;
    if (bot) { bot.busy = true; bot.lookT = 0; }
    try {
      for (const it of items) {
        if (Array.isArray(it)) { focusTalk(it[0]); await sayLine(it[0], it[1]); }
        else if (it.ask || it.multi) {
          if (it.multi) it.ask = it.multi;
          if (it.focus && P[it.focus]) camFocus = { x: P[it.focus].x, z: P[it.focus].z + 7.5, d: 1 };   // 문제에 나오는 물건이 화면에 보이게
          else focusTalk(it.who);
          await askQ(it);
        }
        else if (it.ev) { dlg.hidden = true; evBusy = true; try { await (EV[it.ev] ? EV[it.ev](it.arg) : null); } finally { evBusy = false; } }
      }
    } finally {                                          // 오류가 나도 대화·이동 잠금은 반드시 푼다
      dlg.hidden = true; D.open = false; D.adv = () => {}; camFocus = null; evBusy = false;
      if (bot) bot.busy = false;
      D.bot = null; save();
    }
  }
  function focusTalk(id) {
    const b = bots[id] || D.bot;
    // 대화 상자가 화면 아래를 덮으므로 바라보는 점을 조금 남쪽(카메라 쪽)으로 옮겨 두 인물이 화면 위쪽에 오게 한다
    if (b && b.m) camFocus = { x: (b.x + player.x) / 2, z: (b.z + player.z) / 2 + 2.6, d: .82 };
  }

  // ================= 연출(미션 장면 안의 { ev }) =================
  let clones = [];
  const EV = {
    book: async () => { S.gotBook = true; save(); $('btnBook').hidden = false; updBook(); toast(T.gotBook, 3.4); await wait(500); },
    letterIn: async () => {
      camFocus = { x: W.mail.x, z: P.plaza.z + 2, d: .7 };
      const m = new THREE.Mesh(GEO.letter, letterMat); m.scale.setScalar(1.5); scene.add(m);
      const ax = player.x, az = player.z;
      await tween(1.1, k => { m.position.set(lerp(ax, W.mail.x, k), lerp(1.6, W.mail.y, k) + Math.sin(k * Math.PI) * 2, lerp(az, W.mail.z, k)); m.rotation.y = k * 8; });
      scene.remove(m); mailFlash(); burst(W.mail.x, 3, W.mail.z, W.mail.x, 6, W.mail.z, '#FFE58A', 6);
      await wait(500);
    },
    wakeHana: async () => {
      camFocus = { x: hana.x, z: hana.z, d: .6 };
      await wait(500);
      burst(W.mail.x, 3, P.plaza.z, hana.x, 2.2, hana.z, '#FFE58A', 8);
      await wait(700);
      hana.mode = 'script'; hana.dimT = 0; hana.say('!', 1.4);
      await tween(.8, k => { hana.lift = Math.sin(k * Math.PI) * .9; hana.yaw += .2; });
      hana.lift = 0; S.woke = true; save();
      camFocus = { x: (hana.x + player.x) / 2, z: (hana.z + player.z) / 2, d: .9 };
      await scriptMove(hana, player.x - 1.6, player.z + 1.2, 7);
      hana.mode = 'follow';
    },
    board: async () => { camFocus = { x: W.board.x, z: W.board.z + 1, d: .55 }; await wait(1100); },
    tool: async arg => {
      const g = W.tools[arg]; if (!g) return;
      camFocus = { x: 37, z: g.position.z, d: .62 };
      burst(g.position.x, 2, g.position.z, hana.x, 2.4, hana.z, arg === 'scope' ? '#8FD8FF' : arg === 'calc' ? '#BFF5FF' : '#FFB3D9', 7);
      await tween(1.2, (k, r) => { g.rotation.y = r * Math.PI * 4; g.scale.setScalar(1 + Math.sin(r * Math.PI) * .6); g.position.y = 1.6 + Math.sin(r * Math.PI) * .8; });
    },
    towers: async () => {
      camFocus = { x: P.library.x + 1, z: P.library.z + 3, d: .85 };
      await tween(1.6, (k, r) => { const p = Math.sin(r * Math.PI); for (const tw of W.towers) for (const m of tw.mats) m.emissiveIntensity = .45 * tw.br * (1 + p * (tw.br > .6 ? 1.6 : -.7)); });
    },
    split: async () => {
      const c = W.twin.center, ds = W.twin.desks;
      camFocus = { x: c.x, z: c.z - 1, d: .8 };
      await scriptMove(hana, c.x, c.z, 6);
      clones = [makeBot(hana.def.look), makeBot(hana.def.look)];
      clones.forEach(m => { m.root.position.set(hana.x, 0, hana.z); });
      burst(hana.x, 1.5, hana.z, hana.x, 3, hana.z, '#9FF0DC', 8);
      const from = { x: hana.x, z: hana.z };
      const pts = [ds[0], ds[1], ds[2]];
      const goal = scriptMove(hana, pts[1].x, pts[1].z, 3);
      await tween(1.2, k => { clones.forEach((m, i) => { const p = pts[i === 0 ? 0 : 2]; m.root.position.set(lerp(from.x, p.x, k), 0, lerp(from.z, p.z, k)); m.fl.position.y = .3; }); });
      await goal; hana.faceAt = [ds[1].fx, ds[1].fz];
      clones.forEach((m, i) => { const p = pts[i === 0 ? 0 : 2]; m.root.rotation.y = Math.atan2(p.fx - p.x, p.fz - p.z); });
      const lines = C.splitLines || ['장소 정리!', '준비물 목록!', '시간표 짜기!'];
      clones.forEach((m, i) => { const p = pts[i === 0 ? 0 : 2]; burst(p.x, 2.2, p.z, p.fx, 1, p.fz, '#B9A2FF', 4); });
      hana.say(lines[1], 3, true);
      clones.forEach((m, i) => { m.cloneSay = lines[i === 0 ? 0 : 2]; });
      await wait(900);
    },
    merge: async () => {
      const c = W.twin.center;
      const goal = scriptMove(hana, c.x, c.z, 3);
      const st = clones.map(m => ({ x: m.root.position.x, z: m.root.position.z }));
      await tween(1.1, k => { clones.forEach((m, i) => { m.root.position.set(lerp(st[i].x, c.x, k), 0, lerp(st[i].z, c.z, k)); m.fl.scale.setScalar(1 - k * .7); }); });
      clones.forEach(m => { if (m.tagBub) m.tagBub.remove(); disposeBot(m); }); clones = [];
      await goal; burst(c.x, 1.5, c.z, c.x, 3.4, c.z, '#9FF0DC', 8);
      hana.faceAt = null; hana.mode = 'follow'; await wait(400);
    },
    memBar: async () => { hana.showMem = true; hana.mem = .2; camFocus = { x: hana.x, z: hana.z, d: .6 }; await wait(200); hana.mem = .93; await wait(900); },
    memo: async () => {
      const m = P.memo; camFocus = { x: m.x - 2, z: m.z + 3, d: .9 };
      const n1 = W.notes.findIndex(n => n.emissiveIntensity === 0);
      for (let i = 0; i < 2; i++) bit(hana.x, 2.4, hana.z, m.x, 7 + i, m.z + 2, '#FFE58A', i * .25, 1, 2);
      await wait(1100);
      for (let i = 0; i < 2; i++) if (W.notes[n1 + i]) W.notes[n1 + i].emissiveIntensity = .9;
      W.memoBeacon.material.emissiveIntensity = 1.4; hana.mem = .25;
      await wait(700); W.memoBeacon.material.emissiveIntensity = .7;
      await wait(400); hana.showMem = false;
    },
    lakeShow: async () => {
      const L = P.lake; camFocus = { x: L.x + 2, z: L.z + 4, d: .9 };
      W.lakeCards.forEach(c => { c.visible = true; c.material.color.set('#FFFFFF'); });
      await tween(1.3, k => { W.lakeCards.forEach((c, i) => { c.position.y = lerp(-1, 2.6 + (i % 2) * .5, k); c.material.opacity = k; }); });
    },
    lakeReveal: async () => {
      const f = W.lakeCards[2];
      W.lakeCards[0].material.color.set('#C9F2D8'); W.lakeCards[1].material.color.set('#C9F2D8');
      burst(f.position.x, f.position.y, f.position.z, f.position.x, f.position.y + 3, f.position.z, '#8FD8FF', 8);
      await tween(1.1, k => { f.material.opacity = 1 - k; f.scale.set(4.4 * (1 - k * .6), 1.38 * (1 - k * .6), 1); });
      f.visible = false;
      await wait(700);
      await tween(.8, k => { W.lakeCards.forEach((c, i) => { if (i < 2) c.material.opacity = 1 - k; }); });
      W.lakeCards.forEach((c, i) => { c.visible = false; c.scale.set(4.4, 1.38, 1); c.position.y = -1; });
    },
    bell: async () => {
      const b = P.bell; camFocus = { x: b.x, z: b.z + 4, d: .95 };
      const lines = C.bellLines || ['종이 울렸다!', '사람이 정할 차례야'];
      botList.forEach(o => { if (o !== hana && !o.busy && dist2(o.x, o.z, player.x, player.z) < 60 && Math.random() < .6) setTimeout(() => o.say(pick(lines), 2.4), rand(200, 1200)); });
      for (let i = 0; i < 3; i++) setTimeout(() => wave(b.x, 4.8, b.z), i * 550);
      await tween(2.4, (k, r) => { W.bell.rotation.z = Math.sin(r * Math.PI * 7) * .5 * (1 - r); });
      W.bell.rotation.z = 0;
    },
    hanaHome: async () => { hana.mode = 'wait'; S.woke = false; hana.showMem = false; await wait(700); },
    cert: async () => { S.done = true; save(); pendingCert = true; }
  };
  function wave(x, y, z) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 6, 40), new THREE.MeshBasicMaterial({ color: '#FFE58A', transparent: true, opacity: .8, depthWrite: false }));   // 파동마다 따로(투명도가 서로 안 섞이게)
    m.position.set(x, y, z); m.rotation.x = Math.PI / 2; scene.add(m);
    tween(1.4, (k, r) => { m.scale.setScalar(1 + r * 9); m.material.opacity = .8 * (1 - r); }).then(() => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }
  let pendingCert = false;

  // ================= 미션 진행 =================
  const Q = C.quests;
  const curStop = () => { const q = Q[S.q]; return q ? q.stops[S.step] : null; };
  function stopPos(st) {
    if (!st) return null;
    const b = bots[st.at]; if (b) return { x: b.x, z: b.z, y: 3 * b.m.s + .2, bot: b };
    const p = P[st.at]; return p ? { x: p.x, z: p.z, y: 3.6 } : null;
  }
  let stopRunning = false;
  async function runStop() {
    const st = curStop(); if (!st || stopRunning) return;
    stopRunning = true; player.goal = null; player.talkTo = null;
    const b = bots[st.at]; if (b) meet(b);
    try {
      await runScene(st.scene, b || null);
      S.step++;
      const q = Q[S.q];
      if (S.step >= q.stops.length) await completeQuest(q);
      else { save(); const nx2 = curStop(); if (nx2 && nx2.hanaHint && hana.mode === 'follow') hana.say(nx2.hanaHint, 4); }
    } catch (e) { console.error(e); }
    finally { stopRunning = false; }                     // 오류가 나도 다시 말 걸 수 있게
    updTrack(); updBook();
    if (pendingCert) { pendingCert = false; await wait(400); openCert(); }
  }
  async function completeQuest(q) {
    if (q.stamp && !S.stamps.includes(q.id)) {
      S.stamps.push(q.id);
      const fx = $('stampFx'), ring = $('stampRing'); ring.textContent = q.stamp.mark; ring.style.setProperty('--c', q.stamp.color);
      fx.hidden = false; ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = '';
      toast(T.stamped.replace('{mark}', q.stamp.mark), 2.8);
      await wait(1500); fx.hidden = true;
    }
    S.q++; S.step = 0; save();
    const nq = Q[S.q];
    if (nq) {
      rini.plan = [];
      const hint = nq.stops[0].hanaHint || nq.hanaHint;
      if (hint && hana.mode === 'follow') setTimeout(() => hana.say(hint, 4.5), 600);
    }
  }
  function meet(b) { if (!S.met.includes(b.id)) { S.met.push(b.id); save(); } }
  function talkTo(b) {
    if (D.open || stopRunning) return;
    const st = curStop();
    if (st && st.at === b.id) { runStop(); return; }
    meet(b);
    let scene2 = b.def.talk;
    if (b === hana && hana.mode === 'follow' && st) scene2 = [['hana', (C.hanaTalk || "지금 할 일은 '{obj}'야. 노란 표시를 따라가면 돼!").replace('{obj}', st.obj)]];
    else if (b === rini && st && S.q >= 2) scene2 = [['rini', (C.riniTalk || "하나랑 '{obj}' 하는 중이구나. 힘내!").replace('{obj}', st.obj)]];
    else if (b === rini && S.done) scene2 = [['rini', C.riniDone || '명예 주민님, 마을 구경 더 하고 가! 주민들이 반가워할 거야.']];
    runScene(scene2, b);
  }

  // ================= 화면 안내판 =================
  function toast(msg, sec) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, (sec || 2.4) * 1000); }
  function closeAll() { $('book').hidden = true; $('mapBox').hidden = true; $('certBox').hidden = true; }
  const promptEl = $('prompt'); let promptBot = null;
  promptEl.onclick = () => { if (promptBot) talkTo(promptBot); };
  $('promptKey').hidden = isTouch;
  function promptHide() { promptEl.hidden = true; promptBot = null; }
  function updPrompt() {
    if (locked() || stopRunning) { promptHide(); return; }
    const st = curStop(); let best = null, bd = 2.9, quest = false;
    for (const b of botList) {
      const isQ = st && st.at === b.id; if (b === hana && b.mode === 'follow' && !isQ) continue;   // 따라오는 하나는 눌러서 말 건다(늘 뜨면 시끄러움)
      const d = dist2(b.x, b.z, player.x, player.z); if (d < (isQ ? 3.4 : bd) && (isQ || !quest)) { best = b; bd = d; if (isQ) quest = true; }
    }
    if (!best) { promptHide(); return; }
    if (best !== promptBot || promptEl.dataset.q !== String(quest)) {
      promptBot = best; promptEl.dataset.q = String(quest);
      $('promptTx').textContent = T.talk.replace('{who}', best.name);
      promptEl.classList.toggle('quest', quest);
    }
    promptEl.hidden = false;
  }
  function updTrack() {
    const tr = $('track'); tr.hidden = !started;
    const q = Q[S.q], st = curStop();
    if (!q) { $('qNum').textContent = T.allDone; $('qTitle').textContent = T.title; $('qObj').textContent = T.freeRoam; $('qDir').hidden = true; tr.classList.add('done'); return; }
    tr.classList.remove('done'); $('qDir').hidden = false;
    $('qNum').textContent = S.q === 0 ? T.prologue : T.mission.replace('{i}', S.q).replace('{n}', Q.length - 1);
    $('qTitle').textContent = q.title; $('qObj').textContent = st ? st.obj : '';
  }
  function updBook() {
    const n = Q.length - 1, c = S.stamps.length;
    $('bookLabel').textContent = T.book;
    const cnt = $('bookCnt'); cnt.textContent = c + '/' + n; cnt.classList.toggle('all', c >= n);
    $('btnBook').hidden = !S.gotBook;
    if (!$('book').hidden) renderBook();
  }
  function renderBook() {
    const body = $('bookBody'); body.innerHTML = '';
    const n = Q.length - 1, c = S.stamps.length;
    const sec = (h) => { const d = document.createElement('section'); const t = document.createElement('h3'); t.textContent = h; d.appendChild(t); body.appendChild(d); return d; };
    const s1 = sec(T.bookStamps + ' ' + c + '/' + n);
    const grid = document.createElement('div'); grid.className = 'stamps'; s1.appendChild(grid);
    Q.slice(1).forEach(q => {
      const on = S.stamps.includes(q.id), d = document.createElement('div'); d.className = 'stc' + (on ? ' on' : '');
      d.style.setProperty('--c', q.stamp.color);
      d.innerHTML = '<div class="r"></div><div class="t"></div>'; d.firstChild.textContent = on ? q.stamp.mark : '?'; d.lastChild.textContent = q.title; grid.appendChild(d);
    });
    const pg = document.createElement('div'); pg.className = 'prog'; pg.innerHTML = '<i></i>'; pg.firstChild.style.setProperty('--w', (c / n * 100) + '%'); s1.appendChild(pg);
    const nt = document.createElement('p'); nt.className = 'note'; nt.style.marginTop = '8px'; nt.textContent = c >= n ? T.bookAll : T.bookLeft.replace('{left}', n - c); s1.appendChild(nt);
    if (c >= n) { const b = document.createElement('button'); b.className = 'pill primary'; b.type = 'button'; b.textContent = T.certView; b.style.marginTop = '10px'; b.onclick = openCert; s1.appendChild(b); }
    const disc = Object.keys(P).filter(k => P[k].discover);
    const s2 = sec(T.bookFound + ' ' + S.found.length + '/' + disc.length);
    const fl = document.createElement('div'); fl.className = 'found'; s2.appendChild(fl);
    disc.forEach(k => { const d = document.createElement('div'); const on = S.found.includes(k); d.className = on ? '' : 'no'; d.innerHTML = '<b></b><span></span>'; d.firstChild.textContent = on ? P[k].name : '???'; d.lastChild.textContent = on ? P[k].discover : ''; fl.appendChild(d); });
    const s3 = sec(T.bookMet + ' ' + S.met.length + '/' + botList.length);
    const ml = document.createElement('div'); ml.className = 'met'; s3.appendChild(ml);
    botList.forEach(b => { const on = S.met.includes(b.id); const sp = document.createElement('span'); sp.className = on ? 'on' : ''; sp.style.setProperty('--c', b.def.look.eye); sp.innerHTML = '<i></i>'; sp.appendChild(document.createTextNode(on ? b.name : '???')); ml.appendChild(sp); });
  }
  function toggleBook() { if (D.open || evBusy || cine) return; const bk = $('book'); if (bk.hidden) { closeAll(); renderBook(); bk.hidden = false; } else bk.hidden = true; }
  $('btnBook').onclick = toggleBook; $('bookClose').onclick = () => { $('book').hidden = true; };
  $('bookReset').onclick = () => { if (confirm(T.bookResetAsk)) { const keep = { name: S.name, look: S.look }; S = Object.assign({}, S0, keep, { stamps: [], found: [], met: [] }); save(); location.reload(); } };

  // ---------- 지도(작은 지도 + 큰 지도)
  const mini = $('mini'), miniX = mini.getContext('2d'), mapCv = $('mapCv'), mapX = mapCv.getContext('2d');
  function questPlaces() {
    return Q.slice(1).map((q, i) => { const st = q.stops[q.stops.length - 1]; const b = C.residents.find(r => r.id === st.at); const h = b && b.home ? b.home : (b ? q.rini : null); const p = h ? { x: h[0], z: h[1] } : P[st.at]; return { i: i + 1, x: p.x, z: p.z, q: q }; });
  }
  function drawMap(x, size, big) {
    const s = size / (2 * R) * .97, o = size / 2, X = v => o + v * s, Z = v => o + v * s;
    x.clearRect(0, 0, size, size);
    x.fillStyle = '#CDEFE3'; x.beginPath(); x.arc(o, o, R * s, 0, 7); x.fill();
    x.lineWidth = big ? 6 : 3; x.strokeStyle = '#9FD3BE'; x.stroke();
    const pc = { forest: '#9ED6BF', waityard: '#D9D1FA', library: '#CFC6F7', market: '#F9D6BF', twin: '#D9D0FA', memo: '#F6E3A6', bell: '#DCE8BE', garden: '#C9EBAE', dream: '#F2C9E7', tool: '#F9D3B0', lake: '#8FD0F2', arrival: '#C8DCF7', plaza: '#F1E9FB' };
    for (const k in pc) { const p = P[k]; x.fillStyle = pc[k]; x.beginPath(); x.arc(X(p.x), Z(p.z), (k === 'lake' ? 7.5 : p.r) * s, 0, 7); x.fill(); }
    x.lineCap = 'round'; x.strokeStyle = '#FFF7E8';
    for (const [a, b, w] of C.roads) { x.lineWidth = w * s; x.beginPath(); x.moveTo(X(C.nodes[a][0]), Z(C.nodes[a][1])); x.lineTo(X(C.nodes[b][0]), Z(C.nodes[b][1])); x.stroke(); }
    for (const b of botList) { x.fillStyle = b.dim > .5 ? 'rgba(140,108,208,.45)' : b.def.look.eye; x.beginPath(); x.arc(X(b.x), Z(b.z), big ? 6 : 3.4, 0, 7); x.fill(); }
    if (big) {                                           // 큰 지도: 주민 점 위에 이름과 미션 번호를 얹는다
      x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const k in P) { if (k === 'gate' || k === 'board') continue; const p = P[k]; x.font = '700 24px "Noto Sans KR", sans-serif'; const tw = x.measureText(p.name).width; x.fillStyle = 'rgba(255,255,255,.9)'; rr(x, X(p.x) - tw / 2 - 10, Z(p.z) + p.r * s * .2 - 17, tw + 20, 34, 17); x.fill(); x.fillStyle = '#1E2B4A'; x.fillText(p.name, X(p.x), Z(p.z) + p.r * s * .2 + 1); }
      for (const qp of questPlaces()) {
        const done = S.stamps.includes(qp.q.id), cur = qp.i === S.q;
        let pk = 'plaza', pd = Infinity;                 // 미션 번호는 가장 가까운 장소 이름표 바로 위에
        for (const k in P) { if (k === 'gate' || k === 'board') continue; const d = dist2(qp.x, qp.z, P[k].x, P[k].z); if (d < pd) { pd = d; pk = k; } }
        const cx = X(P[pk].x), cy = Z(P[pk].z) + P[pk].r * s * .2 - 38;
        x.fillStyle = done ? '#3FA37A' : cur ? '#F2B544' : '#9AA6BC'; x.beginPath(); x.arc(cx, cy, cur ? 20 : 16, 0, 7); x.fill();
        x.fillStyle = '#FFFFFF'; x.font = '700 ' + (cur ? 20 : 17) + 'px "Noto Sans KR", sans-serif'; x.fillText(done ? '✓' : String(qp.i), cx, cy + 1);
      }
    }
    const tp = stopPos(curStop());
    if (tp) { const pulse = 1 + Math.sin(performance.now() / 250) * .2; x.fillStyle = 'rgba(242,181,68,.35)'; x.beginPath(); x.arc(X(tp.x), Z(tp.z), (big ? 22 : 11) * pulse, 0, 7); x.fill(); x.fillStyle = '#F2B544'; x.beginPath(); x.arc(X(tp.x), Z(tp.z), big ? 10 : 5.5, 0, 7); x.fill(); }
    x.save(); x.translate(X(player.x), Z(player.z)); x.rotate(-player.yaw + Math.PI);
    const ps = big ? 16 : 9; x.fillStyle = '#E0483E'; x.strokeStyle = '#FFFFFF'; x.lineWidth = big ? 4 : 2.5;
    x.beginPath(); x.moveTo(0, -ps); x.lineTo(ps * .75, ps * .8); x.lineTo(0, ps * .4); x.lineTo(-ps * .75, ps * .8); x.closePath(); x.stroke(); x.fill(); x.restore();
  }
  function toggleMap() { if (D.open || evBusy || cine) return; const mb = $('mapBox'); if (mb.hidden) { closeAll(); mb.hidden = false; drawMap(mapX, 1000, true); } else mb.hidden = true; }
  $('btnMap').onclick = toggleMap; mini.onclick = toggleMap; $('mapClose').onclick = () => { $('mapBox').hidden = true; };
  $('track').onclick = toggleMap;

  // ---------- 명예 주민증
  function openCert() {
    const Wd = 1400, Ht = 990, c = canvasOf(Wd, Ht, x => {
      const g = x.createLinearGradient(0, 0, Wd, Ht); g.addColorStop(0, '#FFF9EC'); g.addColorStop(1, '#F3ECFF'); x.fillStyle = g; x.fillRect(0, 0, Wd, Ht);
      x.strokeStyle = '#C9A96A'; x.lineWidth = 10; x.strokeRect(30, 30, Wd - 60, Ht - 60); x.lineWidth = 3; x.strokeRect(50, 50, Wd - 100, Ht - 100);
      x.textAlign = 'center'; x.fillStyle = '#A98C66'; x.font = '600 26px "Noto Sans KR", sans-serif'; x.fillText(T.certEn.toUpperCase(), Wd / 2, 130);
      x.fillStyle = '#7A55C9'; x.font = '92px Jua, sans-serif'; x.fillText(T.certTitle, Wd / 2, 230);
      x.fillStyle = '#1E2B4A'; x.font = '84px Jua, sans-serif'; x.fillText(S.name || T.guest, Wd / 2, 360);
      x.fillStyle = '#4A5874'; x.font = '500 30px "Noto Sans KR", sans-serif';
      T.certBody.split('\n').forEach((l, i) => x.fillText(l, Wd / 2, 440 + i * 46));
      const qs = Q.slice(1);
      qs.forEach((q, i) => { const cx = Wd / 2 + (i - (qs.length - 1) / 2) * 128, cy = 740; x.save(); x.translate(cx, cy); x.rotate(-.2); x.strokeStyle = q.stamp.color; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 48, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 40, 0, 7); x.stroke(); x.fillStyle = q.stamp.color; x.font = '32px Jua, sans-serif'; x.textBaseline = 'middle'; x.fillText(q.stamp.mark, 0, 2); x.restore(); });
      const d = new Date(); x.textBaseline = 'alphabetic';
      x.fillStyle = '#4A5874'; x.font = '500 28px "Noto Sans KR", sans-serif'; x.fillText(`${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`, Wd / 2, 872);
      x.fillStyle = '#1E2B4A'; x.font = '40px Jua, sans-serif'; x.fillText(T.certIssuer, Wd / 2, 924);
    });
    let url = ''; try { url = c.toDataURL('image/png'); } catch (e) { /* 그림 저장이 막혀도 화면은 보인다 */ }
    $('certImg').src = url; $('certDl').href = url; $('certDl').textContent = T.certSave; $('certDl').setAttribute('download', T.certFile);
    $('certHint').textContent = T.certSaveHint; $('certClose').textContent = T.close;
    closeAll(); $('certBox').hidden = false;
  }
  $('certClose').onclick = () => { $('certBox').hidden = true; };

  // ================= 시작 화면 =================
  function lookPreview() { const me = $('stMe'); me.style.setProperty('--c-skin', S.look.skin); me.style.setProperty('--c-hair', S.look.hair); me.style.setProperty('--c-shirt', S.look.shirt); }
  function showStart() {
    $('stTitle').textContent = T.title; $('stTag').textContent = T.tagline; $('stIntro').textContent = T.intro;
    $('stNameLb').textContent = T.nameLabel; const inp = $('stName'); inp.placeholder = T.namePh; inp.value = S.name || '';
    $('stLook').textContent = T.look; lookPreview();
    const resume = S.q > 0 || S.step > 0;
    $('stGo').textContent = resume ? T.cont : T.start;
    $('stRestart').hidden = !resume; $('stRestart').textContent = T.restart;
    $('start').hidden = false;
    setTimeout(() => { if (!isTouch) inp.focus(); }, 50);
  }
  $('stLook').onclick = () => { S.look = randLook(); lookPreview(); };
  $('stRestart').onclick = () => { if (!confirm(T.bookResetAsk)) return; const keep = { name: $('stName').value.trim().slice(0, 10), look: S.look }; S = Object.assign({}, S0, keep, { stamps: [], found: [], met: [] }); save(); location.reload(); };
  $('stName').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) $('stGo').click(); });   // 한글 조합 중 Enter는 무시
  let begun = false;
  $('stGo').onclick = () => {
    if (begun) return; begun = true;                     // 두 번 눌러도 한 번만 시작
    S.name = $('stName').value.trim().slice(0, 10); save();
    $('start').hidden = true; player.build(); beginGame();
  };

  function beginGame() {
    const resume = S.q > 0;
    // 이어 하기: 마지막으로 있던 자리에서(5초마다 저장). 섬 밖·건물 안 값이면 도착 정거장
    if (resume && Array.isArray(S.pos) && Math.hypot(S.pos[0], S.pos[1]) < R - 4 && !cols.some(c => dist2(S.pos[0], S.pos[1], c.x, c.z) < c.r + .4)) { player.x = S.pos[0]; player.z = S.pos[1]; camTarget(camPos, camLook); }
    if (S.q >= 2 && S.q < Q.length) { hana.mode = 'follow'; hana.place(player.x - 1.6, player.z + 1.5); hana.dim = hana.dimT = 0; }
    $('btnMap').textContent = T.map; updBook(); updTrack();
    if (reduce || resume) { finishIntro(); return; }
    // 들어가며 마을 전체를 한 바퀴 내려다본다(주민들이 사는 모습)
    $('icH').textContent = T.introCap; $('icP').textContent = T.introSub; $('introCap').hidden = false; $('introCap').style.opacity = 1;
    $('skip').textContent = T.skip; $('skip').hidden = false; $('skip').onclick = () => { if (cine) cine.t = cine.dur; };
    cine = { t: 0, dur: 9.5, p0: camera.position.clone() };
    // 카메라가 광장 위를 지날 때 하늘에서 부탁 쪽지가 떨어지고, 광장 둘레 주민들이 빛 글자로 떠든다
    requestT = 4.2;
    const near = botList.filter(b => b.role !== 'keeper' && b.role !== 'guide' && dist2(b.x, b.z, 0, 6) < 22);
    near.slice(0, 7).forEach((b, i) => setTimeout(() => { if (cine) b.say(pick(pick(C.chats)), 2.6, true); }, 2600 + i * 520));
  }
  function finishIntro() {
    cine = null; started = true; $('introCap').hidden = true; $('skip').hidden = true;
    updTrack();
    const h = $('hint'); h.textContent = isTouch ? T.hintTouch : T.hintMouse; h.hidden = false; h.style.opacity = 1;
    setTimeout(() => { h.style.opacity = 0; setTimeout(() => { h.hidden = true; }, 700); }, 7000);
    if (S.q >= 2 && S.q < Q.length) { const st = curStop(); const hint = (st && st.hanaHint) || Q[S.q].hanaHint; if (hint) setTimeout(() => hana.say(hint, 4.5), 1200); }
  }

  // ================= 카메라 =================
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const CINE = { l0: new THREE.Vector3(0, 0, -6), p1: new THREE.Vector3(9, 13, 21), l1: new THREE.Vector3(-1, 1, 3), p2: new THREE.Vector3(-9, 10, 25), l2: new THREE.Vector3(-4, 1, 8) };
  function baseZoom() { const a = innerWidth / innerHeight; return a < .8 ? 1.42 : a < 1.2 ? 1.15 : 1; }
  function camTarget(out, look) {
    const f = camFocus, tx = f ? f.x : player.x, tz = f ? f.z : player.z, z = (f ? f.d : 1) * zoom * baseZoom();
    out.set(tx, 12.5 * z + 1, tz + 14.5 * z); look.set(tx, .9, tz - 1.5);
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function updCamera(dt, t) {
    if (!started && !cine) {                               // 시작 화면 뒤: 마을 위를 천천히 돈다
      const a = t * .045 + .55; camera.position.set(Math.sin(a) * 115, 88, Math.cos(a) * 115); camera.lookAt(0, 0, -6); return;
    }
    if (cine) {
      // 높은 하늘 → 부탁 광장 위로 낮게 내려가 주민들이 사는 모습을 보여 주고 → 도착 정거장의 나에게
      cine.t += dt; const k = clamp(cine.t / cine.dur, 0, 1);
      camTarget(_a, _b);
      const keys2 = [[cine.p0, CINE.l0], [CINE.p1, CINE.l1], [CINE.p2, CINE.l2], [_a, _b]], at = [0, .38, .66, 1];
      let s = 0; while (s < 2 && k > at[s + 1]) s++;
      const e = ease(clamp((k - at[s]) / (at[s + 1] - at[s]), 0, 1));
      camera.position.lerpVectors(keys2[s][0], keys2[s + 1][0], e); camLook.lerpVectors(keys2[s][1], keys2[s + 1][1], e);
      camera.lookAt(camLook);
      if (k > .55) $('introCap').style.opacity = String(clamp((1 - k) / .3, 0, 1));
      if (k >= 1) { camPos.copy(camera.position); finishIntro(); }
      return;
    }
    camTarget(_a, _b);
    const k = 1 - Math.exp(-dt * (camFocus ? 3 : 5));
    camPos.lerp(_a, k); camLook.lerp(_b, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
  }

  // ================= 매 장면 =================
  const marker = new THREE.Group();
  const mk = new THREE.Mesh(new THREE.OctahedronGeometry(.42), B('#F2B544')); marker.add(mk);
  const beamM = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 60, 8, 1, true), B('#FFE58A', { transparent: true, opacity: .28, depthWrite: false })); beamM.position.y = 30; marker.add(beamM);
  scene.add(marker);
  let lastArea = '', miniT = 0;
  function areaName() {
    let best = null, bd = Infinity;
    for (const k in P) { const p = P[k], d = dist2(player.x, player.z, p.x, p.z); if (d < p.r + 2 && d - p.r < bd) { bd = d - p.r; best = p.name; } }
    return best || C.text.street || '마을 길';
  }
  function updOverlay(dt) {
    const st = curStop(), tgt = st && bots[st.at];
    for (const b of botList) {
      const tg = b.tag, pd = dist2(b.x, b.z, player.x, player.z);
      const show = started && !cine && (pd < 15 || b === tgt || (b === hana && hana.mode === 'follow'));
      const p = show || tg.bubT > 0 ? project(b.x, (2.35 + b.dim * .5) * b.m.s + .2, b.z) : null;
      if (show && p.ok) {
        if (!tg.shown) { tg.el.hidden = false; tg.shown = true; }
        tg.el.style.transform = `translate3d(${p.x}px,${p.y}px,0) translate(-50%,-100%)`;
        const stt = (pd < 8 && !b.busy ? ((b.role === 'keeper' || b.role === 'guide') && b.status === 'idle' ? b.def.status : T.status[b.status]) : '') || '';
        if (stt !== tg.stTx) { tg.stTx = stt || ''; tg.st.textContent = tg.stTx; tg.st.hidden = !stt; }
        tg.mk.hidden = b !== tgt;
        tg.mem.hidden = !b.showMem; if (b.showMem) tg.memB.style.setProperty('--w', Math.round(b.mem * 100) + '%');
      } else if (tg.shown) { tg.el.hidden = true; tg.shown = false; }
      if (tg.bubT > 0) {
        tg.bubT -= dt;
        if (p && p.ok && (cine ? camera.position.distanceTo(_v.set(b.x, 1, b.z)) < 40 : pd < 32)) { tg.bub.hidden = false; const off = show ? (b.showMem ? 64 : tg.stTx ? 46 : 28) + (b === tgt ? 28 : 0) : 6; tg.bub.style.transform = `translate3d(${p.x}px,${p.y - off}px,0) translate(-50%,-100%)`; }
        else tg.bub.hidden = true;
        if (tg.bubT <= 0) tg.bub.hidden = true;
      }
    }
    for (const m of clones) if (m.cloneSay && !m.tagBub) { m.tagBub = document.createElement('div'); m.tagBub.className = 'bub ai'; m.tagBub.textContent = m.cloneSay; tagsEl.appendChild(m.tagBub); }
    for (const m of clones) if (m.tagBub) { const p = project(m.root.position.x, 2.6, m.root.position.z); m.tagBub.style.transform = `translate3d(${p.x}px,${p.y}px,0) translate(-50%,-100%)`; }
    const ptg = player.tag, pp = project(player.x, 2.05, player.z);
    ptg.el.hidden = !started || !!cine || !pp.ok;
    if (!ptg.el.hidden) ptg.el.style.transform = `translate3d(${pp.x}px,${pp.y}px,0) translate(-50%,-100%)`;
  }

  const clock = new THREE.Clock(); let T0 = 0;
  // 한 장면에서 오류가 나도 마을이 멈추지 않게: 다음 장면을 먼저 예약하고 본문은 감싼다
  function frame() {
    requestAnimationFrame(frame);
    try { frameBody(); } catch (e) { if (!frame.warned) { frame.warned = true; console.error(e); } }
  }
  function frameBody() {
    const dt = Math.min(.05, clock.getDelta()); T0 += dt; const t = T0;
    updTweens(dt);
    if (started && !cine && performance.now() - savedAt > 5000) savePos();   // 실제 시간 5초마다(느린 기기에서도)
    for (const b of botList) b.update(dt, t);
    // 주민끼리 너무 붙지 않게
    for (let i = 0; i < botList.length; i++) for (let j = i + 1; j < botList.length; j++) {
      const a = botList[i], b = botList[j]; if (a.mode === 'script' || b.mode === 'script' || a.busy || b.busy) continue;
      const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 1.05 && d > 1e-4) { const p = (1.05 - d) * .5; a.x += dx / d * p; a.z += dz / d * p; b.x -= dx / d * p; b.z -= dz / d * p; }
    }
    // 주민이 사람 손님에게 길을 비켜 준다
    if (started) for (const b of botList) {
      if (b.mode === 'script' || b.busy) continue;
      const dx = b.x - player.x, dz = b.z - player.z, d = Math.hypot(dx, dz); if (d < 1.15 && d > 1e-4) { b.x = player.x + dx / d * 1.15; b.z = player.z + dz / d * 1.15; }
    }
    for (const m of clones) { m.fl.position.y = .3 + Math.sin(t * 2.4) * .07; }
    if (started) player.update(dt); else player.m.root.position.set(player.x, 0, player.z);
    updBits(dt);
    // 마을 쪽지
    requestT -= dt; if (requestT < 0) { requestT = rand(11, 18); townRequest(); }
    // 움직이는 꾸밈
    if (mailFlashT > 0) { mailFlashT -= dt; W.mailGlow.emissiveIntensity = .5 + Math.max(0, mailFlashT) * 1.4; } else W.mailGlow.emissiveIntensity = .5 + Math.sin(t * 2) * .12;
    W.leds.forEach((m, i) => { m.emissiveIntensity = .45 + Math.max(0, Math.sin(t * (5 + i * 2.3) + i)) * .9; });
    W.water.emissiveIntensity = .22 + Math.sin(t * 1.3) * .06;
    W.arrRings.forEach((r, i) => { r.position.y = 1.2 + ((t * .5 + i * .5) % 1) * 3; r.material.opacity = .7 * (1 - ((t * .5 + i * .5) % 1)); });
    W.motes.forEach((m, i) => { m.position.y = (t * .4 + i * .37) % 4.5; });
    W.shards.forEach(m => { const u = m.userData; u.a += u.s * dt; m.position.set(Math.cos(u.a) * u.d, u.y + Math.sin(t + u.d) * 1.2, Math.sin(u.a) * u.d); m.rotation.y += dt * .5; m.rotation.x += dt * .3; });
    W.words.forEach((s, i) => { s.position.y = s.userData.y0 + Math.sin(t * 1.6 + i) * .18; });
    W.qmarks.forEach((s, i) => { s.position.y = 1.6 + Math.sin(t * 1.4 + i * 2) * .3; });
    W.dreamThings.forEach((o, i) => { const a = t * .5 + i * 2.1, d = P.dream; o.position.set(d.x + 1.5 + Math.cos(a) * 3.2, 5.6 + Math.sin(t * 1.3 + i) * .6, d.z + 1 + Math.sin(a) * 3.2); o.rotation.y = -a; });
    if (tapRing && tapRing.visible) { tapRing.userData.t -= dt; tapRing.scale.setScalar(1 + (.6 - tapRing.userData.t) * 1.5); tapRing.material.opacity = Math.max(0, tapRing.userData.t / .6); if (tapRing.userData.t <= 0) tapRing.visible = false; }
    // 미션 표시·도착 판정
    const st = curStop(), tp = stopPos(st);
    marker.visible = !!tp && started && !D.open;
    if (tp) {
      marker.position.set(tp.x, 0, tp.z); mk.position.y = tp.y + Math.sin(t * 3) * .18; mk.rotation.y = t * 2;
      if (started && !locked() && !stopRunning) {
        const d = dist2(player.x, player.z, tp.x, tp.z);
        if (!tp.bot && d < (P[st.at].r || 3.4)) runStop();
        else if (tp.bot && st.auto && d < st.auto) runStop();
      }
      const dx = tp.x - player.x, dz = tp.z - player.z;
      $('qArr').style.transform = `rotate(${Math.atan2(dx, -dz)}rad)`;
      $('qDist').textContent = T.meters.replace('{d}', Math.round(Math.hypot(dx, dz)));
    }
    // 장소 이름·새 장소 발견
    if (started) {
      const an = areaName(); if (an !== lastArea) { lastArea = an; $('area').textContent = an; }
      for (const k in P) { const p = P[k]; if (p.discover && !S.found.includes(k) && dist2(player.x, player.z, p.x, p.z) < p.r) { S.found.push(k); save(); showDisc(p); } }
    }
    updPrompt();
    sun.position.set(player.x + 26, 55, player.z + 22); sun.target.position.set(player.x, 0, player.z);
    updCamera(dt, t);
    fadeLabels();
    updOverlay(dt);
    miniT -= dt; if (miniT < 0) { miniT = .12; drawMap(miniX, 300, false); if (!$('mapBox').hidden) drawMap(mapX, 1000, true); }
    renderer.render(scene, camera);
  }
  let savedAt = 0;
  function savePos() { savedAt = performance.now(); if (!player || !started) return; S.pos = [+player.x.toFixed(1), +player.z.toFixed(1)]; save(); }
  addEventListener('pagehide', savePos);
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePos(); });
  function showDisc(p) {
    const d = $('disc'); $('discK').textContent = T.found; $('discN').textContent = p.name; $('discP').textContent = p.discover;
    d.hidden = false; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
    clearTimeout(showDisc.h); showDisc.h = setTimeout(() => { d.hidden = true; }, 5500);
    updBook();
  }

  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  // ================= 시작 =================
  async function init() {
    // 한글 글꼴 조각까지 기다린다(2.5초까지)
    try { await Promise.race([Promise.all([document.fonts.load('40px Jua', '마을가나다AI'), document.fonts.load('700 20px "Noto Sans KR"', '마을가나다')]), wait(2500)]); } catch (e) { /* 글꼴 없이도 진행 */ }
    $('title').textContent = T.title; $('area').textContent = P.arrival.name;
    $('bookTitle').textContent = T.bookTitle; $('bookClose').textContent = T.close; $('bookReset').textContent = T.bookReset;
    $('mapTitle').textContent = T.mapTitle; $('mapClose').textContent = T.close; $('btnMap').textContent = T.map;
    buildGround(); buildGate(); buildPlaza(); buildForest(); buildTool(); buildLibrary(); buildMarket(); buildTwin(); buildMemo(); buildLake(); buildBell(); buildSmall(); buildDecor();
    player = new Human();
    for (const def of C.residents) { const b = new Bot(def); bots[def.id] = b; botList.push(b); }
    hana = bots.hana; rini = bots.rini;
    // 처음 자리: 지킴이는 제자리, 리니는 이번 미션 자리, 하나는 기다리는 마당, 나머지는 길 위 아무 데서나 하던 일을 하는 중
    for (const b of botList) {
      if (b.role === 'keeper') { b.place(b.def.home[0], b.def.home[1]); }
      else if (b.role === 'guide') { const h = b.home(); b.place(h[0], h[1]); }
      else if (b.role === 'hana') { const s = C.spots.wait[0]; spotsUsed.wait0 = true; b.place(s[0], s[1]); b.mode = 'wait'; b.dim = b.dimT = 1; }
      else { const n = pick(NP); b.place(n[0] + rand(-2, 2), n[1] + rand(-2, 2)); if (Math.random() < .5) b.plan = b.choose(); }
    }
    // 몇 초 앞서 돌려 두어 들어가자마자 마을이 살아 있게
    for (let i = 0; i < 240; i++) for (const b of botList) b.update(1 / 30, i / 30);
    for (const b of botList) { b.greeted = false; b.tag.bubT = 0; b.tag.bub.hidden = true; }
    camTarget(camPos, camLook); camera.position.copy(camPos); camera.lookAt(camLook);
    camera.position.set(70, 92, 105); camera.lookAt(0, 0, -12);
    loadingEl.style.opacity = 0; setTimeout(() => { loadingEl.hidden = true; }, 450);
    $('btnBook').hidden = true; $('track').hidden = true;
    // 시험용 손잡이(주소 끝에 ?debug 일 때만): 미션 자리로 순간 이동해 끝까지 빨리 확인
    if (/[?&]debug\b/.test(location.search)) window.__town = { S: () => S, bots, player: () => player, go(x, z) { player.x = x; player.z = z; player.goal = null; }, stop: () => stopPos(curStop()) };
    showStart();
    requestAnimationFrame(frame);
  }
  init().catch(e => { console.error(e); loadingEl.hidden = false; loadingEl.style.opacity = 1; loadingEl.textContent = T.loadFail; });
})();
