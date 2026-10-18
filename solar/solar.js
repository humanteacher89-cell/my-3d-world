/* 「손 위의 태양계」(가칭) v0.1 — 내 방(혼합현실)에 태양계를 띄워 손으로 크기·거리·공전을 견주는 앱 (2026-10-18, 공용 엔진 core.js)
   두 축척: ① 크기 비교 = 실제 지름 비율(지구 지름 3cm, 태양 약 3.3m는 뒤쪽 벽처럼) ② 거리 비교 = 1AU = 1m(해왕성 약 30m, 크기는 보기 좋게 키움).
   공전은 실제 주기(일) 비율, 시간 손잡이로 빠르기를 바꾼다. 처음 펼칠 때는 모든 행성이 한 줄로 늘어선 채 시작한다(거리 비교를 보이려고).
   손 미션: ① 지구 집기 ② 가장 큰 행성(목성) 찾기 ③ 거리로 펼치기 ④ 시간 손잡이로 지구 1바퀴(1년) ⑤ 달을 지구 지름 30배 거리에 놓기
   보이는 모양(사실 아님, 꾸밈): 행성 무늬는 캔버스로 그린 단순한 띠·점. 자전축 기울기는 지구 23.4° · 토성 26.7° · 천왕성 97.8°로 기울였다.
   화면 모드(헤드셋 없음)에서는 눌러서 같은 미션을 해 볼 수 있다.                                                          */
(function () {
  'use strict';
  const H = window.HW, A = window.SOLAR;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[SOLAR]', ...a);

  const POS = { start: [0, 1.3], rini: [-2.0, -0.5] };
  const TALK = V3(-0.62, 1.8, 0.1), BOARD = V3(0.66, 1.8, 0.1);   /* 행성 줄 위 전광판: 왼쪽 = 리니 말, 오른쪽 = 할 일·계기판 */
  const ROW_Y = 1.08, ROW_Z = 0;                                   /* 크기 비교 선반(행성 줄) 높이·자리 */
  const KM = 0.03 / 12756;                                         /* 크기 비교 축척: 지구 지름 12,756km → 3cm */
  const SUN_BIG = V3(0, 1.64, -3.7), SUN_BIG_D = A.sun.d * KM;      /* 태양 약 3.3m: 바닥에 닿는 큰 공, 앞면은 z ≈ -2.06 */
  const DCEN = V3(0, 1.05, -0.4), SUN_SMALL_D = 0.24;              /* 거리 비교: 태양 자리(1AU = 1m), 태양은 24cm로 키워 그림 */
  const ALIGN = THREE.MathUtils.degToRad(115);                      /* 처음 펼칠 때 행성이 늘어서는 방향(앞쪽 조금 왼쪽) */
  const EARTH_STAGE = V3(-0.452, 0.92, 0.45), MOON_T = V3(0.452, 0.92, 0.45), MOON_START = V3(-0.28, 0.86, 0.62);   /* 지구~달 90.4cm = 지구 지름 30.1개 */
  const LEVELS = [0, 10, 60, 365, 3650];                            /* 화면 모드에서 손잡이를 누를 때 바뀌는 빠르기(1초에 n일) */
  H.bounds.r = 6;
  H.setSky('#03040f', '#1a2150', '#20243a');
  H.fogVR.near = 150; H.fogVR.far = 420;
  H.hemi.intensity = 1.0; H.sun.intensity = 1.15; H.sun.position.set(2, 6, 8);

  // ───────────── 우주 공간(VR에서만) ─────────────
  function buildSpace() {
    const v = H.vrOnly;
    mesh(new THREE.CircleGeometry(7, 96), std('#0b0d20', 0.95), v, [0, 0, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const lm = new THREE.MeshBasicMaterial({ color: '#4b5396', transparent: true, opacity: 0.3 });
    for (let i = 1; i <= 6; i++) mesh(new THREE.RingGeometry(i - 0.01, i + 0.01, 128), lm, v, [0, 0.003, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const n = 1400, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const d = V3(Math.random() * 2 - 1, Math.random() * 1.2 - 0.15, Math.random() * 2 - 1).normalize().multiplyScalar(240); arr.set([d.x, d.y, d.z], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    v.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  }

  // ───────────── 무늬(캔버스로 그림, 바깥 그림 파일 없음) ─────────────
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function bands(g, w, h, cols, n, wob) {
    let y = 0; const step = h / n;
    for (let i = 0; i < n; i++) {
      const hh = step * (0.6 + rnd() * 0.8); g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / w * Math.PI * (2 + i % 3) + i) * wob);
      g.lineTo(w, y + hh + 2); for (let x = w; x >= 0; x -= 16) g.lineTo(x, y + hh + 2 + Math.sin(x / w * Math.PI * (3 + i % 2) + i * 2) * wob); g.closePath(); g.fill();
      y += hh; if (y > h) break;
    }
    if (y < h) { g.fillStyle = cols[0]; g.fillRect(0, y, w, h - y); }
  }
  function spots(g, w, h, n, cols, r0, r1, alpha, yBand) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = yBand ? yBand[0] + rnd() * (yBand[1] - yBand[0]) : rnd() * h, r = r0 + rnd() * (r1 - r0);
      g.globalAlpha = alpha; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(x, y, r * (1 + rnd()), r, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
  const TEX = {
    sun: (g, w, h) => { g.fillStyle = '#ffb12e'; g.fillRect(0, 0, w, h); spots(g, w, h, 2600, ['#ffd56b', '#f59a2a', '#ffe59a'], 1, 3, 0.3); spots(g, w, h, 6, ['#c4561a'], 5, 9, 0.5, [h * 0.3, h * 0.7]); },
    mercury: (g, w, h) => { g.fillStyle = '#9b958c'; g.fillRect(0, 0, w, h); spots(g, w, h, 160, ['#7d776f', '#b3ada3', '#6c665f'], 3, 14, 0.55); },
    venus: (g, w, h) => { bands(g, w, h, ['#e8cf9c', '#dcbc82', '#efdcae', '#d6b276'], 14, 6); spots(g, w, h, 40, ['#f3e2b8'], 10, 30, 0.25); },
    earth: (g, w, h) => {
      g.fillStyle = '#2a62c9'; g.fillRect(0, 0, w, h);
      for (let c = 0; c < 7; c++) { const cx = rnd() * w, cy = h * (0.25 + rnd() * 0.5); for (let i = 0; i < 9; i++) { g.fillStyle = rnd() < 0.7 ? '#3f8f4a' : '#a08a5a'; g.beginPath(); g.ellipse(cx + (rnd() - 0.5) * 70, cy + (rnd() - 0.5) * 50, 12 + rnd() * 26, 8 + rnd() * 18, rnd() * 3, 0, Math.PI * 2); g.fill(); } }
      g.fillStyle = '#f4f7fb'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.94, w, h * 0.06);
      spots(g, w, h, 60, ['#ffffff'], 6, 18, 0.35);
    },
    mars: (g, w, h) => { g.fillStyle = '#c1532f'; g.fillRect(0, 0, w, h); spots(g, w, h, 50, ['#8e3a22', '#a8462a', '#d77a4c'], 8, 30, 0.45); g.fillStyle = '#f6efe8'; g.fillRect(0, 0, w, h * 0.04); g.fillRect(0, h * 0.96, w, h * 0.04); },
    jupiter: (g, w, h) => { bands(g, w, h, ['#d8c3a5', '#b07f56', '#e9dcc6', '#a8693f', '#d9b48a', '#c99c70', '#efe4d2'], 22, 4); g.fillStyle = '#c0553a'; g.beginPath(); g.ellipse(w * 0.64, h * 0.64, 26, 13, 0, 0, Math.PI * 2); g.fill(); },
    saturn: (g, w, h) => { bands(g, w, h, ['#e6d3a3', '#d2b679', '#efe0b9', '#c9a96a', '#ddc58f'], 18, 3); },
    uranus: (g, w, h) => { bands(g, w, h, ['#9fd8df', '#a9e0e6', '#93cfd8', '#a3dbe1'], 10, 2); },
    neptune: (g, w, h) => { bands(g, w, h, ['#3b62d6', '#3558c8', '#4a73e0', '#2f50b8'], 12, 3); g.fillStyle = '#22388f'; g.beginPath(); g.ellipse(w * 0.3, h * 0.62, 20, 10, 0, 0, Math.PI * 2); g.fill(); },
    moon: (g, w, h) => { g.fillStyle = '#b9b6ae'; g.fillRect(0, 0, w, h); spots(g, w, h, 30, ['#8f8c85'], 14, 34, 0.5); spots(g, w, h, 140, ['#a19e97', '#cfccc4'], 2, 9, 0.6); }
  };
  const ringTex = () => canvasTex(512, 512, (g) => {
    /* 고리 무늬: 반지름 비(바깥 A고리 끝 = 1) — C고리 0.545~0.673 흐림, B고리 0.673~0.86 밝음, 카시니 틈 0.86~0.893, A고리 0.893~1 */
    const R = 256, ring = (r0, r1, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(R, R, r1 * R, 0, Math.PI * 2); g.arc(R, R, r0 * R, 0, Math.PI * 2, true); g.fill(); };
    ring(0.545, 0.673, '#a89a7e', 0.35); ring(0.673, 0.86, '#e2cf9e', 0.9);
    for (let r = 0.68; r < 0.86; r += 0.012) ring(r, r + 0.004, '#c9b07a', 0.5);
    ring(0.893, 1.0, '#cdb889', 0.75); ring(0.97, 0.975, '#8a7a5e', 0.6); g.globalAlpha = 1;
  });
  const TILT = { earth: 0.41, saturn: 0.47, uranus: 1.71, mars: 0.44, neptune: 0.49, jupiter: 0.05 };
  const GLOW = { mercury: '#d8d2c8', venus: '#ffe2a6', earth: '#7fb2ff', mars: '#ff8a5c', jupiter: '#ffd9a8', saturn: '#ffe6a8', uranus: '#a8f0f6', neptune: '#7d9bff', moon: '#ffffff' };

  // ───────────── 천체 만들기 ─────────────
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const planets = [];
  function makeBody(b, parent) {
    const g = new THREE.Group(); parent.add(g);
    const tilt = new THREE.Group(); g.add(tilt); tilt.rotation.set(b.id === 'saturn' ? 0.42 : 0, 0, TILT[b.id] || 0);   /* 토성은 고리가 보이게 앞으로 조금 숙임 */
    const tex = canvasTex(512, 256, TEX[b.id]);
    const body = mesh(geo.sphere, std('#ffffff', 0.85, { map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.14 }), tilt, [0, 0, 0], 0.03);
    body.castShadow = false;
    if (b.id === 'saturn') {
      const rg = new THREE.RingGeometry(0.618, 1.135, 128, 1).rotateX(-Math.PI / 2);
      const ringM = new THREE.MeshStandardMaterial({ map: ringTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.12 });
      ringM.emissiveMap = ringM.map; const ring = new THREE.Mesh(rg, ringM); body.add(ring);
    }
    const hit = new THREE.Mesh(geo.lowSphere, hitMat); g.add(hit);
    const halo = H.glowSprite(GLOW[b.id] || '#ffffff', 0.1, 0); g.add(halo);
    return { b, g, tilt, body, hit, halo, spin: 0.3 + rnd() * 0.5 };
  }
  function makeLabel(id) {
    const p = new Panel('lab-' + id, 300, 'rgba(18,20,40,0.78)', 0.0007); p.pad = 12; H.world.add(p.mesh); p.static = true;
    return p;
  }
  function drawLabel(o, distMode) {
    const p = o.label; p.ctx.font = p.font(36, true); p.w = Math.ceil(Math.max(110, p.ctx.measureText(distMode && o.b.au ? o.b.au + 'AU' : o.b.name).width + 34)); p.clear(); p.pad = 12;   /* 글 길이에 맞춘 너비(작은 행성끼리 이름표가 겹치지 않게) */
    p.text(o.b.name, 36, '#ffffff', { bold: true, align: 'center', gap: distMode && o.b.au ? 2 : 0 });
    if (distMode && o.b.au) p.text(o.b.au + 'AU', 28, '#ffd27a', { align: 'center', gap: 0 });
    p.finish(); p.pin(); o.labelBase = p.mesh.scale.clone();
  }
  function buildPlanets() {
    for (const b of A.planets) {
      const o = makeBody(b, H.world);
      o.sizeD = b.d * KM; o.distD = 0.035 * Math.sqrt(b.d / 12756);
      o.sizePos = V3(0, ROW_Y, ROW_Z); o.shelf = V3(); o.pop = 0; o.lock = false; o.alt = b.id === 'venus' || b.id === 'mars';
      o.label = makeLabel(b.id); drawLabel(o, false);
      H.addGrabbable(o.g, { radius: 0.05,
        onGrab: () => { touch(o); o.halo.material.opacity = 0.6; },
        onMove: (gr, pt) => { o.sizePos.copy(H.world.worldToLocal(pt.clone())); },
        onRelease: () => { o.halo.material.opacity = 0; } });
      H.addPickable(o.g, () => { touch(o); H.burst(o.g.getWorldPosition(V3()), GLOW[b.id], 18, 0.5, 0.6, 0.025); }, on => { o.hover = on; });
      o.g.visible = false; planets.push(o);
    }
  }
  const byId = id => planets.find(p => p.b.id === id);
  function shelfLayout(portrait) {
    const w = o => o.b.id === 'saturn' ? o.sizeD * 2.27 : o.sizeD;
    const rows = portrait ? [planets.slice(0, 5), planets.slice(5)] : [planets];
    const gap = portrait ? 0.05 : 0.06; let half = 0;
    rows.forEach((row, ri) => {
      const total = row.reduce((s, o) => s + w(o), 0) + gap * (row.length - 1); half = Math.max(half, total / 2);
      let x = -total / 2; const y = rows.length > 1 ? ROW_Y + (ri === 0 ? 0.24 : -0.2) : ROW_Y;
      for (const o of row) { o.shelf.set(x + w(o) / 2, y, ROW_Z); x += w(o) + gap; }
    });
    return half;
  }
  let rowHalf = 0.9;

  // 태양
  let sunO;
  function buildSun() {
    const g = new THREE.Group(); H.world.add(g);
    const tex = canvasTex(512, 256, TEX.sun);
    const body = new THREE.Mesh(geo.sphere, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false })); g.add(body);
    const halo = H.glowSprite('#ffb347', 1, 0.55); g.add(halo);
    sunO = { b: A.sun, g, body, halo, pop: 0 };
    H.addPickable(g, () => touch(sunO));
    g.visible = false;
  }
  // 달
  let moonO, moonPos = MOON_START.clone(), moonPlaced = false, moonHeld = false, moonGhost, moonLine, moonTag;
  function buildMoon() {
    moonO = makeBody(A.moon, H.world); moonO.body.scale.setScalar(A.moon.d * KM); moonO.hit.scale.setScalar(0.07); moonO.g.visible = false;
    H.addGrabbable(moonO.g, { radius: 0.05,
      onGrab: () => { moonHeld = true; touch(moonO); moonO.halo.material.opacity = 0.7; },
      onMove: (gr, pt) => { if (!moonPlaced) moonPos.copy(H.world.worldToLocal(pt.clone())); },
      onRelease: () => { moonHeld = false; moonO.halo.material.opacity = 0; if (!moonPlaced && moonPos.distanceTo(MOON_T) < 0.13) placeMoon(); } });
    H.addPickable(moonO.g, () => { touch(moonO); if (!moonPlaced && curMission === 4) placeMoon(); });
    moonGhost = new THREE.Group(); moonGhost.position.copy(MOON_T); H.world.add(moonGhost); moonGhost.visible = false;
    const gm = new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.85 });
    moonGhost.add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0025, 8, 48), gm));
    moonGhost.add(H.glowSprite('#bfe6ff', 0.12, 0.35));
    const lg = new THREE.BufferGeometry().setFromPoints([EARTH_STAGE, MOON_T]);
    moonLine = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: '#bfe6ff', dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.7 }));
    moonLine.computeLineDistances(); moonLine.visible = false; H.world.add(moonLine);
  }
  async function placeMoon() {
    if (moonPlaced) return; moonPlaced = true;
    const from = moonPos.clone(); H.sfx('piece');
    await H.tween(0.8, k => moonPos.lerpVectors(from, MOON_T, H.ease(k)));
    H.burst(H.world.localToWorld(MOON_T.clone()), '#ffffff', 50, 0.8, 0.9, 0.03);
    moonGhost.visible = false;
    moonTag = new Panel('moonTag', 620, 'rgba(18,20,40,0.82)', 0.0007); moonTag.pad = 16;
    moonTag.text(A.moon.far, 34, '#ffffff', { bold: true, align: 'center', gap: 2 });
    moonTag.text(A.m5.far.replace('{cm}', 90).replace('{k}', 30), 26, '#bfe6ff', { align: 'center', gap: 0 });
    moonTag.finish(); moonTag.pin(); moonTag.mesh.position.copy(EARTH_STAGE).lerp(MOON_T, 0.5); moonTag.mesh.position.y += 0.09; H.world.add(moonTag.mesh);
    log('moon placed');
  }

  // 공전 궤도 선(거리 비교에서만)
  const orbitMats = [];
  function buildOrbits() {
    const og = new THREE.Group(); og.position.copy(DCEN); H.world.add(og);
    for (const o of planets) {
      const r = o.b.au, pts = []; for (let i = 0; i <= 256; i++) { const t = i / 256 * Math.PI * 2; pts.push(V3(r * Math.cos(t), 0, -r * Math.sin(t))); }
      const m = new THREE.LineBasicMaterial({ color: GLOW[o.b.id], transparent: true, opacity: 0, depthWrite: false });
      og.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m)); orbitMats.push(m);
    }
  }

  // ───────────── 축척 바꾸기·시간 ─────────────
  let mode = 'size', morph = 0, morphing = false, simDays = 0, speed = 0, m4goal = 0, m4Reached = false;
  const orbitPos = o => { const t = ALIGN + Math.PI * 2 * simDays / o.b.days, r = o.b.au; return V3(DCEN.x + r * Math.cos(t), DCEN.y, DCEN.z - r * Math.sin(t)); };
  async function setMode(m) {
    if (morphing || m === mode) return; morphing = true; mode = m; log('mode', m);
    for (const gr of H.grabbers) if (gr.held && planets.some(o => o.g === gr.held)) { gr.held.userData.grab.held = null; gr.held = null; }
    if (m === 'size') for (const o of planets) if (!o.lock) o.sizePos.copy(o.shelf);
    drawSwitch(); H.sfx('whoosh');
    const a = morph, b = m === 'dist' ? 1 : 0;
    flatGo(m === 'dist' ? VIEW.dist() : VIEW.size(), 2.4);
    await H.tween(2.4, k => { morph = a + (b - a) * k; });
    morph = b; morphing = false; gaugeKey = '';
  }
  function setSpeed(s) {
    speed = Math.max(0, s);
    const f = speed <= 0 ? 0 : Math.max(0.05, Math.min(1, Math.log10(speed / 5) / 2.86));
    if (sKnob) sKnob.position.x = SL.x0 + f * (SL.x1 - SL.x0);
    drawSpeed();
  }
  const speedText = () => speed <= 0 ? A.speed.stop : speed < 365 ? A.speed.day.replace('{n}', Math.round(speed)) : A.speed.year.replace('{n}', Number((speed / 365.25).toFixed(1)));

  // ───────────── 단추·시간 손잡이 ─────────────
  const SL = { x0: 0.05, x1: 0.55 };
  const CTRL_SIZE = V3(0.5, 1.4, 0.3), CTRL_DIST = V3(0.55, 1.3, 0.3);   /* 화면 모드 단추 자리: 크기 비교(오른쪽 위) · 거리 비교(오른쪽) */
  let ctrlFixed = false;
  let ctrl, swG, swCap, swLabel, sG, sKnob, sLabel, capMat;
  function buildControls() {
    ctrl = new THREE.Group(); H.world.add(ctrl); ctrl.visible = false;
    swG = new THREE.Group(); swG.position.set(-0.32, 0, 0); ctrl.add(swG);
    mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.03, 40), std('#2d2b48', 0.5), swG, [0, 0, 0]).castShadow = false;
    capMat = std('#f2a94f', 0.35, { emissive: new THREE.Color('#f2a94f'), emissiveIntensity: 0.45 });
    swCap = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 40), capMat, swG, [0, 0.025, 0]); swCap.castShadow = false;
    const swHit = new THREE.Mesh(geo.lowSphere, hitMat); swHit.scale.setScalar(0.18); swG.add(swHit);
    swLabel = new Panel('swLabel', 400, 'rgba(18,20,40,0.85)', 0.0007); swLabel.pad = 14; swLabel.static = true; swG.add(swLabel.mesh);
    H.addPickable(swG, () => toggleMode(), on => swCap.scale.setScalar(on ? 1.15 : 1));
    H.addGrabbable(swCap, { radius: 0.09, onGrab: () => toggleMode() });
    sG = new THREE.Group(); ctrl.add(sG);
    mesh(geo.box, std('#ffffff', 0.4, { transparent: true, opacity: 0.55 }), sG, [(SL.x0 + SL.x1) / 2, 0, 0], [SL.x1 - SL.x0 + 0.04, 0.02, 0.04]).castShadow = false;
    for (let i = 0; i <= 4; i++) mesh(geo.box, std('#9aa4ff', 0.4), sG, [SL.x0 + i / 4 * (SL.x1 - SL.x0), 0.012, 0.024], [0.004, 0.008, 0.008]).castShadow = false;
    sKnob = mesh(geo.sphere, std('#7fd3ff', 0.3, { emissive: new THREE.Color('#7fd3ff'), emissiveIntensity: 0.5 }), sG, [SL.x0, 0.03, 0], 0.06); sKnob.castShadow = false;
    const sHit = new THREE.Mesh(geo.box, hitMat); sHit.position.set((SL.x0 + SL.x1) / 2, 0.02, 0); sHit.scale.set(SL.x1 - SL.x0 + 0.12, 0.12, 0.12); sG.add(sHit);
    sLabel = new Panel('sLabel', 420, 'rgba(18,20,40,0.85)', 0.0007); sLabel.pad = 14; sLabel.static = true; sG.add(sLabel.mesh);
    H.addGrabbable(sKnob, { radius: 0.08, onMove: (gr, pt) => { const lx = sG.worldToLocal(pt.clone()).x, f = (lx - SL.x0) / (SL.x1 - SL.x0); setSpeedF(f); } });
    H.addPickable(sG, () => { const i = LEVELS.indexOf(speed); setSpeed(LEVELS[(i + 1) % LEVELS.length]); H.sfx('piece'); }, on => sKnob.scale.setScalar(on ? 0.075 : 0.06));
    drawSwitch(); setSpeed(0);
  }
  function setSpeedF(f) { f = Math.max(0, Math.min(1, f)); const s = f < 0.04 ? 0 : 5 * Math.pow(10, f * 2.86); speed = s; sKnob.position.x = SL.x0 + f * (SL.x1 - SL.x0); drawSpeed(); }
  let lastSpeedText = '';
  function drawSpeed() {
    if (!sLabel) return; const t = speedText(); if (t === lastSpeedText) return; lastSpeedText = t;
    sLabel.clear(); sLabel.text(A.speed.title, 26, '#c9c4d6', { bold: true, align: 'center', gap: 2 }); sLabel.text(t, 36, '#ffffff', { bold: true, align: 'center', gap: 0 });
    sLabel.finish(); sLabel.pin(); sLabel.mesh.position.set((SL.x0 + SL.x1) / 2, 0.14, 0);
  }
  function drawSwitch() {
    if (!swLabel) return; swLabel.clear();
    swLabel.text(mode === 'dist' ? A.sw.toSize : A.sw.toDist, 36, '#ffffff', { bold: true, align: 'center', gap: 0 });
    swLabel.finish(); swLabel.pin(); swLabel.mesh.position.set(0, 0.12, 0);
    capMat.color.set(mode === 'dist' ? '#5cc3b4' : '#f2a94f'); capMat.emissive.copy(capMat.color);
  }
  let lastToggle = -9;
  function toggleMode() { if (morphing || H.now - lastToggle < 0.8) return; lastToggle = H.now; H.burst(swG.getWorldPosition(V3()), '#ffd27a', 30, 0.6, 0.7, 0.025); setMode(mode === 'dist' ? 'size' : 'dist'); }
  function placeControls() {
    ctrlFixed = H.inXR() && !H.handheld;
    if (ctrlFixed) ctrl.position.set(0, 0.92, 0.8);                      /* 헤드셋: 허리 높이, 손이 닿는 곳 */
    else ctrl.position.copy(CTRL_SIZE);                                  /* 화면·휴대폰: 보이는 곳(축척에 따라 옮김, update) */
  }

  // ───────────── 화면 모드 카메라(헤드셋에서는 쓰지 않음) ─────────────
  let camEye = V3(0, 1.6, 2), camTgt = V3(0, 1, 0);
  function flatView(eye, tgt) {
    if (H.inXR()) return;
    camEye.copy(eye); camTgt.copy(tgt);
    const feet = V3(eye.x, 0, eye.z), dir = V3(tgt.x - eye.x, 0, tgt.z - eye.z), hd = Math.max(0.01, dir.length()); dir.divideScalar(hd);
    const p = Math.min(0.9, Math.max(0, Math.atan2(eye.y - tgt.y, hd)));
    /* core의 place()는 눈 높이 1.6m 기준이라, 바라볼 점을 바꿔 같은 아래보기 각을 만든다 */
    const look = p < 0.01 ? V3(feet.x + dir.x * 5, 1.6, feet.z + dir.z * 5) : (() => { const dh = 1.6 / Math.tan(p / 0.6); return V3(feet.x + dir.x * dh, 0.0001, feet.z + dir.z * dh); })();
    H.place(feet, look); H.rig.position.y = eye.y - 1.6; H.rig.updateMatrixWorld(true);
  }
  function flatGo(v, dur = 1.2) {
    if (H.inXR() || !v) return Promise.resolve();
    const e0 = camEye.clone(), t0 = camTgt.clone();
    return H.tween(dur, k => { const e = H.ease(k); flatView(e0.clone().lerp(v[0], e), t0.clone().lerp(v[1], e)); });
  }
  const halfFov = () => Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * H.camera.aspect);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const VIEW = {
    size: () => { const d = clamp((rowHalf + 0.14) / Math.tan(halfFov()), 1.25, 3.4); return [V3(0, ROW_Y + 0.32, ROW_Z + d), V3(0, ROW_Y + 0.02, ROW_Z)]; },
    dist: () => { const d = clamp(1.9 / Math.tan(halfFov()), 2.4, 6.5); return [V3(0, DCEN.y + d * 0.75, DCEN.z + d), V3(0, DCEN.y, DCEN.z + 0.1)]; },
    over: () => {
      const dir = V3(Math.cos(ALIGN), 0, -Math.sin(ALIGN)), tgt = DCEN.clone().addScaledVector(dir, 15), dh = clamp(18 / Math.tan(halfFov()), 16, 70);
      return [tgt.clone().add(V3(dir.z, 0, -dir.x).multiplyScalar(-dh)).add(V3(0, dh * 0.55, 0)), tgt];
    },
    moon: () => { const c = EARTH_STAGE.clone().lerp(MOON_T, 0.5), d = clamp(0.62 / Math.tan(halfFov()), 1.1, 3); return [V3(c.x, c.y + 0.25, c.z + d), c]; }
  };

  // ───────────── 매 화면 ─────────────
  const lerpLog = (a, b, k) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * k);
  let labelMode = 'size';
  function update(dt) {
    if (mode === 'dist' && morph >= 1 && speed > 0) {
      simDays += speed * dt;
      if (m4goal && simDays >= m4goal) { simDays = m4goal; m4goal = 0; m4Reached = true; setSpeed(0); }
    }
    const k = H.ease(morph), hp = H.headPos(), lm = k > 0.5 ? 'dist' : 'size';
    if (lm !== labelMode) { labelMode = lm; for (const o of planets) drawLabel(o, lm === 'dist'); }
    for (const o of planets) {
      const D = lerpLog(o.sizeD, o.distD, k) * Math.max(0.001, o.pop);
      o.g.position.lerpVectors(o.sizePos, k > 0 ? orbitPos(o) : o.sizePos, k);
      o.body.scale.setScalar(D); o.body.rotation.y += dt * o.spin;
      const wp = o.g.getWorldPosition(V3()), dh = wp.distanceTo(hp), s = Math.max(1, dh / 1.4);
      const hitD = k > 0.5 ? Math.max(D * 1.6, 0.06 * s) : Math.max((o.b.id === 'saturn' ? D * 2.27 : D) * 1.15, 0.07);
      o.hit.scale.setScalar(hitD);
      const gd = o.g.userData.grab; gd.enabled = mode === 'size' && !morphing && !o.lock; gd.radius = Math.max(0.05, D / 2 + 0.03);
      const hal = k > 0.5 ? 0.6 : (gd.held ? 0.6 : (o.hover || sel === o) ? 0.45 : 0);
      o.halo.material.opacity += (hal * Math.min(1, o.pop) - o.halo.material.opacity) * Math.min(1, dt * 8);
      o.halo.scale.setScalar(k > 0.5 ? Math.max(D * 2.6, dh * 0.03) : D * 2.2 + 0.03);
      const L = o.label; L.mesh.visible = o.g.visible && o.pop > 0.5;
      L.mesh.scale.copy(o.labelBase).multiplyScalar(s);
      const up = lm === 'dist' || (o.alt && !o.lock);   /* 크기 비교: 금성·화성 이름표는 위로(이웃과 엇갈리게) */
      L.mesh.position.copy(o.g.position); L.mesh.position.y += (up ? 1 : -1) * (D / 2 + 0.035 * s) + (up ? 0.02 * s : -0.01);
      L.mesh.lookAt(hp);
    }
    if (sunO) {
      const D = lerpLog(SUN_BIG_D, SUN_SMALL_D, k) * Math.max(0.001, sunO.pop);
      sunO.g.position.lerpVectors(SUN_BIG, DCEN, k); sunO.body.scale.setScalar(D); sunO.body.rotation.y += dt * 0.05;
      const dh = sunO.g.getWorldPosition(V3()).distanceTo(hp);
      sunO.halo.scale.setScalar(Math.max(D * (k > 0.5 ? 3.2 : 1.45), dh * 0.05 * k));
    }
    for (const m of orbitMats) m.opacity = 0.45 * k;
    if (moonO && moonO.g.visible) {
      moonO.g.position.copy(moonPos); moonO.body.rotation.y += dt * 0.2;
      moonO.halo.scale.setScalar(0.05);
      if (moonGhost.visible) moonGhost.scale.setScalar(1 + Math.sin(H.now * 4) * 0.12);
      if (moonGhost.visible) moonGhost.lookAt(hp);
      if (moonHeld && curMission === 4) missionInfo(task, A.m5.far.replace('{cm}', Math.round(moonPos.distanceTo(EARTH_STAGE) * 100)).replace('{k}', Math.round(moonPos.distanceTo(EARTH_STAGE) / 0.03)));
    }
    if (ctrl.visible && !ctrlFixed) ctrl.position.lerpVectors(CTRL_SIZE, CTRL_DIST, k);
    for (const p of [swLabel, sLabel]) if (p && ctrl.visible) p.mesh.lookAt(hp);
    if (moonTag) moonTag.mesh.lookAt(hp);
    drawGauge(false);
  }

  // ───────────── 계기판(이름·지름·거리·주기 + 시간) ─────────────
  let gauge, gaugeKey = '', gaugeT = -9, sel = null, task = '', taskExtra = '';
  const fmt = n => Math.round(n).toLocaleString('en-US');
  function timeText() { const d = simDays; return d < 365.25 ? A.gauge.timeDay.replace('{n}', Math.floor(d)) : A.gauge.timeYear.replace('{n}', (d / 365.25).toFixed(1)); }
  function drawGauge(force) {
    if (!gauge) return;
    const showTime = morph > 0.5 || curMission >= 3;
    const key = [task, taskExtra, sel && sel.b.id, morph > 0.5, showTime && timeText(), showTime && speedText(), m4Day0 != null && ((simDays - m4Day0) / 87.97).toFixed(1)].join('|');
    if (!force && (key === gaugeKey || H.now - gaugeT < 0.15)) return; gaugeKey = key; gaugeT = H.now;
    const G = A.gauge, g = gauge; g.clear(); g.pad = 28;
    if (task) { g.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 2 }); g.text(task + (taskExtra ? '  ' + taskExtra : ''), 28, '#ffffff', { gap: 14 }); g.bar('rgba(255,255,255,0.18)', 2, 12); }
    g.row([{ t: G.title, size: 30, color: '#c9c4d6', bold: true }, { t: morph > 0.5 ? G.modeDist : G.modeSize, size: 22, color: '#9aa4ff' }], 8);
    if (sel) {
      const b = sel.b;
      g.text(b.name, 44, '#ffd27a', { bold: true, gap: 2 });
      g.text(b.note, 24, '#c9c4d6', { gap: 8 });
      g.text(G.d.replace('{d}', fmt(b.d)).replace('{x}', b.x), 27, '#ffffff', { gap: 4 });
      if (b.au) g.text(G.au.replace('{au}', b.au).replace('{km}', b.km), 27, '#ffffff', { gap: 4 });
      if (b.far) g.text(b.far, 27, '#ffffff', { gap: 4 });
      if (b.period) g.text(G.period.replace('{p}', b.period), 27, '#ffffff', { gap: 6 });
    } else g.text(G.hint, 26, '#e7e3f2', { gap: 6 });
    if (showTime) {
      g.bar('rgba(255,255,255,0.18)', 2, 10);
      g.text(timeText(), 32, '#8fe3a8', { bold: true, gap: 2 });
      g.text(A.speed.title + ': ' + speedText(), 24, '#c9c4d6', { gap: 2 });
      if (m4Day0 != null) { const e = simDays - m4Day0; g.text(G.laps.replace('{e}', (e / 365.25).toFixed(1)).replace('{m}', (e / 87.97).toFixed(1)), 26, '#ffffff', { gap: 0 }); }
    }
    g.finish(); g.pin();
  }
  let m4Day0 = null;
  function buildGauge() {
    gauge = new Panel('gauge', 560, 'rgba(18,20,40,0.88)'); drawGauge(true); gauge.mesh.visible = false;
    gauge.mesh.position.copy(BOARD); H.world.add(gauge.mesh);
    gauge.mesh.lookAt(V3(POS.start[0], 1.55, POS.start[1] + 0.3));
  }
  function missionInfo(text, extra) { const t = text || '', x = extra || ''; if (t === task && x === taskExtra) return; task = t; taskExtra = x; drawGauge(true); }

  // ───────────── 미션 목록·리니 ─────────────
  const MISSIONS = [A.m1.title, A.m2.title, A.m3.title, A.m4.title, A.m5.title], done = MISSIONS.map(() => false);
  let wrist;
  function drawWrist() {
    const p = wrist; p.clear();
    p.row([{ t: A.wrist, size: 36, color: '#ffffff', bold: true }, { t: done.filter(Boolean).length + '/' + MISSIONS.length, size: 36, color: '#ffc766', bold: true }], 12);
    const cur = done.indexOf(false);
    MISSIONS.forEach((t, i) => p.row([{ t: done[i] ? '●' : i === cur ? '▶' : '○', size: 30, color: done[i] ? '#8fe3a8' : i === cur ? '#ffc766' : '#8a8698' }, { t, size: 30, color: done[i] ? '#b9b5c6' : '#ffffff' }], 8));
    p.finish(); p.show(true);
  }
  function finish(i) { done[i] = true; drawWrist(); H.sfx('complete'); }
  let rini = null;
  const spk = () => ({ name: A.guide.name, role: A.guide.role, dot: A.guide.dot, char: rini, pos: P(POS.rini) });
  const riniSay = (text, options, single, o) => say(spk(), text, options, single || '다음', o || { at: TALK });
  async function lines(arr) { for (const l of arr) { if (typeof l === 'string') await riniSay(l); else await riniSay(l.text, l.choices); } }
  let curMission = -1, gotEarth = false, gotJupiter = false, lastWrong = -9;
  function touch(o) {
    sel = o; drawGauge(true); H.sfx('select');
    if (curMission === 0 && o.b.id === 'earth') gotEarth = true;
    if (curMission === 1) {
      if (o.b.id === 'jupiter') gotJupiter = true;
      else if (H.now - lastWrong > 1.2) { lastWrong = H.now; showToast(o.b.id === 'saturn' ? A.m2.saturn : o.b.id === 'sun' ? A.m2.sun : o.b.is ? A.m2.wrong.replace('{is}', o.b.is) : A.m2.wrong.replace('{is}', o.b.name), 2.2); }
    }
  }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#7a6ad0', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 76, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 30 });
    p.button(A.start, null, '#f2a94f', null, 110);
    rowHalf = shelfLayout(!H.inXR() && H.camera.aspect < 0.8);
    for (const o of planets) o.sizePos.copy(o.shelf);
    if (!H.inXR()) { const v = VIEW.size(); flatView(v[0], v[1]); }
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat');
    await waitPick(p, 0, 1.0); p.show(false);
    H.audio.music('day'); await wait(0.4);
  }
  async function showSolar() {
    log('state solar');
    for (const o of planets) {
      o.g.visible = true; H.sfx('piece');
      H.burst(H.world.localToWorld(o.sizePos.clone()), GLOW[o.b.id], 24, 0.6, 0.7, 0.025);
      H.tween(0.45, k => { o.pop = H.ease(k); });
      await wait(H.AUTOTEST ? 0.12 : 0.28);
    }
    await wait(0.4);
    sunO.g.visible = true; H.sfx('appear'); H.burst(H.world.localToWorld(V3(0, 1.6, -2.1)), '#ffd27a', 140, 2.2, 1.4, 0.04);
    await H.tween(1.6, k => { sunO.pop = H.ease(k); });
    if (H.useHud()) H.hud(gauge, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.6 : 0.36);   /* 화면 모드: 왼쪽 위 계기판 */
    gauge.mesh.visible = true; drawWrist();
    await riniSay(A.sunBig);
  }
  async function m1() {
    curMission = 0; log('state m1');
    await riniSay(A.m1.ask, null, '해 볼게'); missionInfo(A.m1.ask);
    if (H.AUTOTEST) wait(1).then(() => touch(byId('earth')));
    await until(() => gotEarth); await wait(1.0);
    missionInfo(''); finish(0);
    await riniSay(A.m1.done);
  }
  async function m2() {
    curMission = 1; log('state m2');
    await riniSay(A.m2.ask, null, '찾아볼게'); missionInfo(A.m2.ask);
    if (H.AUTOTEST) (async () => { await wait(0.8); touch(byId('saturn')); await wait(1.4); touch(byId('jupiter')); })();
    await until(() => gotJupiter); await wait(0.8);
    missionInfo(''); finish(1);
    await riniSay(A.m2.done);
  }
  async function m3() {
    curMission = 2; log('state m3');
    placeControls(); ctrl.visible = true; sG.visible = false;
    H.burst(swG.getWorldPosition(V3()), '#ffd27a', 40, 0.8, 0.8, 0.03);
    await riniSay(A.m3.ask, null, '눌러 볼게'); missionInfo(A.m3.ask);
    if (H.AUTOTEST) wait(1).then(() => toggleMode());
    await until(() => mode === 'dist' && !morphing);
    missionInfo('');
    showToast(A.m3.far, 4);
    if (!H.inXR()) { await flatGo(VIEW.over(), 2.6); await wait(H.AUTOTEST ? 1.5 : 3.5); await flatGo(VIEW.dist(), 2.2); }
    else await wait(3);
    finish(2);
    await riniSay(A.m3.done); await riniSay(A.m3.note);
  }
  async function m4() {
    curMission = 3; log('state m4');
    if (mode !== 'dist') await setMode('dist');
    sG.visible = true; setSpeed(0); H.burst(sKnob.getWorldPosition(V3()), '#7fd3ff', 40, 0.8, 0.8, 0.03);
    m4Day0 = simDays; m4goal = simDays + 365.25; m4Reached = false;
    await riniSay(A.m4.ask, null, '돌려 볼게'); missionInfo(A.m4.ask);
    if (H.AUTOTEST) wait(1).then(() => setSpeed(120));
    await until(() => m4Reached); await wait(1.2);
    missionInfo(''); finish(3);
    await riniSay(A.m4.done); await riniSay(A.m4.note);
  }
  async function m5() {
    curMission = 4; log('state m5');
    ctrl.visible = false; m4goal = 0;
    const e = byId('earth'); e.lock = true;
    await setMode('size');
    const from = e.sizePos.clone();
    flatGo(VIEW.moon(), 1.4);
    await H.tween(1.2, k => e.sizePos.lerpVectors(from, EARTH_STAGE, H.ease(k)));
    moonPos.copy(MOON_START); moonO.g.visible = true; moonGhost.visible = true; moonLine.visible = true;
    H.burst(H.world.localToWorld(MOON_START.clone()), '#ffffff', 40, 0.6, 0.8, 0.025); H.sfx('appear');
    sel = moonO; drawGauge(true);
    const tap = !H.inXR() || H.handheld;
    await riniSay(tap ? A.m5.askTap : A.m5.ask, null, '놓아 볼게'); missionInfo(tap ? A.m5.askTap : A.m5.ask);
    if (H.AUTOTEST) wait(1).then(() => placeMoon());
    await until(() => moonPlaced); await wait(1.4);
    missionInfo(''); finish(4);
    await riniSay(A.m5.done);
  }
  async function ending() {
    log('state ending');
    await lines(A.ending.rini);
    const E = A.ending;
    for (;;) {
      const p = ui.card; p.clear(); p.pad = 46;
      p.text(E.cardKicker, 28, '#7a6ad0', { bold: true, align: 'center', gap: 6 });
      p.text(E.cardTitle, 56, INK, { bold: true, align: 'center', gap: 18 });
      E.rows.forEach(r => p.row([{ t: '✔', size: 30, color: '#f2a94f', bold: true }, { t: r, size: 30, color: INK }], 10));
      p.space(16);
      p.button(E.free, null, '#f2a94f', null, 88); p.button(E.restart, null, '#ece5d8', null, 80); p.button(E.exit, null, '#3b3550', null, 80);
      p.finish(); H.placeAhead(p, 1.0, -0.45, -0.25); p.show(true);
      log('state card');
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) {   /* 더 놀기: 단추·손잡이를 다시 꺼내 두고 그대로 둔다 */
        curMission = 5; e5(); showToast(E.freeToast, 3); await until(() => false);
      }
      const s = H.renderer.xr.getSession(); if (s && i === 2) { s.end(); return; }
      location.reload(); return;
    }
  }
  function e5() { placeControls(); ctrl.visible = true; sG.visible = true; const e = byId('earth'); e.lock = false; }
  async function main() {
    if (H.handheld && rini) rini.root.position.y = ROW_Y - 0.28;
    await intro(); await lines(A.hello); await showSolar();
    await m1(); await m2(); await m3(); await m4(); await m5(); await ending();
  }

  // ───────────── 짓기·시작 ─────────────
  buildSpace(); buildPlanets(); buildSun(); buildMoon(); buildOrbits(); buildControls(); buildGauge();
  rowHalf = shelfLayout(false); for (const o of planets) o.sizePos.copy(o.shelf);
  H.onUpdate(update);
  wrist = new Panel('wrist', 440, 'rgba(18,20,40,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  const ready = H.loadChar({ url: '../world1/assets/rini-glb.wasm', height: 1.2, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', walk: 'walk', wave: 'wave2' }, trim: { wave: [1.4, 5.0] }, glow: 0.25 }).then(c => { rini = c; });
  /* 휴대폰 혼합현실: 톡 누른 바닥·책상 높이가 행성 줄보다 28cm 아래가 되게(anchor), 리니도 같은 면 위에 선다 */
  H.start({ main, ready, start: { pos: POS.start, look: [0, ROW_Z] }, anchor: V3(0, ROW_Y - 0.28, 0) });
  window.SOLARX = { planets, sun: () => sunO, moon: () => moonO, setMode, setSpeed, placeMoon, state: () => ({ mode, morph, simDays, speed, curMission, done: done.slice(), sel: sel && sel.b.id }) };
})();
