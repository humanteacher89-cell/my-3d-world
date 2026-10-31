/* 「심장과 폐 탐험실」(가칭) v0.1 — 내 방(혼합현실)에 사람 상반신 모형을 띄워 손으로 심장·폐·피의 길을 알아보는 앱 (2026-10-18, 공용 엔진 core.js)
   모형: 실제 크기에 가까운 투명한 상반신(몸통 외곽선·갈비뼈·등뼈) + 폐 두 개 + 기관·기관지 + 심장 + 가로막 + 큰 혈관(온몸 순환 1줄·폐 순환 2줄).
   혈관 속 적혈구 = 산소가 많으면 밝은 빨강, 적으면 어두운 보라 기운. 심장은 맥박만큼 뛰고, 폐는 호흡 수만큼 부푼다.
   손 미션: ① 심장 꺼내 보기 ② 가로막 손잡이 당겨 숨 3번 ③ 폐포에 적혈구 대서 산소 받기 3개 ④ 피의 길(심장 → 온몸 → 심장 → 폐 → 심장) ⑤ 운동 손잡이 '달리기'
   화면 모드(헤드셋 없음)에서는 눌러서 같은 미션을 해 볼 수 있다. 글은 모두 content.js(window.BODY).              */
(function () {
  'use strict';
  const H = window.HW, B = window.BODY;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[BODY]', ...a);

  const POS = { start: [0, 1.0], rini: [-1.35, -0.6] };
  const TALK = V3(-0.66, 1.98, -0.02), BOARD = V3(0.7, 2.0, -0.06);   /* 모형 위 전광판: 왼쪽 = 리니 말, 오른쪽 = 할 일·계기판 */
  const C = V3(0, 1.3, 0);                                            /* 상반신 모형 가운데(몸통 아래 1.0, 목 1.7) */
  const ALV = V3(0.62, 1.34, 0.12);                                   /* 폐포 확대 자리(모형 오른쪽) */
  const SW = V3(0.52, 1.36, 0.22);                                    /* 운동 손잡이(모형 오른쪽 앞, 5번 미션 때는 폐포가 사라진 자리) */
  const OXY = new THREE.Color('#ff3b3b'), LOW = new THREE.Color('#6a3a8c');
  H.bounds.r = 5.5;
  H.setSky('#e8848f', '#f6e6e8', '#f3efe8');
  H.hemi.intensity = 0.9; H.sun.intensity = 1.05; H.sun.position.set(3, 10, 6);

  /* ───────────── 탐험 공간(VR에서만) ───────────── */
  function buildSpace() {
    const v = H.vrOnly;
    mesh(new THREE.CircleGeometry(8, 96), std('#f1e9ea', 0.9), v, [0, 0, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const lm = new THREE.MeshBasicMaterial({ color: '#e3b9c0', transparent: true, opacity: 0.45 });
    for (let i = 1; i <= 7; i++) mesh(new THREE.RingGeometry(i - 0.01, i + 0.01, 128), lm, v, [0, 0.003, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
  }

  /* 가장자리만 은은히 보이는 투명 재질(몸통 외곽선) */
  function rimMat(color, base, k) {
    return new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(color) }, base: { value: base }, k: { value: k } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 c; uniform float base; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(c, base + k * pow(r, 2.2)); }'
    });
  }
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const curve = (pts, closed) => new THREE.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2])), !!closed, 'centripetal');
  const noShadow = o => { o.traverse(x => { if (x.isMesh) { x.castShadow = false; x.receiveShadow = false; } }); return o; };
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const tall = () => innerWidth < innerHeight;   /* 세로 화면(휴대폰): 이름표를 크게, 심장 카드는 위로 */
  const LS = tall() ? 1.6 : 1;

  /* 이름표(늘 머리 쪽을 본다) */
  function label(parent, pos, title, sub, w, scale) {
    const p = new Panel('lab', w || 300, 'rgba(33,31,46,0.8)', scale ? scale * Math.min(LS, 1.15) : 0.00085); p.pad = 12;
    p.text(title, 32, '#ffffff', { bold: true, align: 'center', gap: sub ? 2 : 0 });
    if (sub) p.text(sub, 22, '#f2c9cf', { align: 'center', gap: 0 });
    p.finish(); p.pin(); p.mesh.position.copy(pos); parent.add(p.mesh);
    p.mesh.onBeforeRender = () => p.mesh.lookAt(H.headPos());
    return p;
  }

  /* 적혈구(가운데가 오목한 원반) */
  const rbcGeo = new THREE.LatheGeometry([V2(0.0001, 0.0035), V2(0.008, 0.0035), V2(0.015, 0.0058), V2(0.02, 0.0045), V2(0.022, 0), V2(0.02, -0.0045), V2(0.015, -0.0058), V2(0.008, -0.0035), V2(0.0001, -0.0035)], 28);
  function rbcMat(oxy) { const c = LOW.clone().lerp(OXY, oxy); return std('#ffffff', 0.45, { color: c, emissive: c.clone(), emissiveIntensity: 0.35, side: THREE.DoubleSide }); }
  function setOxy(m, oxy) { const c = LOW.clone().lerp(OXY, oxy); m.material.color.copy(c); m.material.emissive.copy(c); m.userData.oxy = oxy; }

  /* ───────────── 상반신 모형 ───────────── */
  let bigLabel, body, heart, heartHome, lungs = [], dia, knob, knobRod, trachea, partLabels = [];
  const DIA0 = -0.10, DIA_PULL = 0.055;          /* 가로막 꼭대기(몸통 기준 y) · 당기면 내려가는 거리 */
  const LUNG_TOP = 0.155, LUNG_H = 0.255;
  function buildBody() {
    body = new THREE.Group(); body.position.copy(C); H.world.add(body);
    /* 몸통 외곽선 */
    const prof = [[0.15, -0.30], [0.16, -0.24], [0.155, -0.14], [0.165, -0.02], [0.18, 0.10], [0.195, 0.20], [0.19, 0.26], [0.15, 0.30], [0.08, 0.325], [0.055, 0.345], [0.05, 0.40]].map(a => V2(a[0], a[1]));
    const skin = rimMat('#f7b9a8', 0.035, 0.55);
    const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), skin); torso.scale.z = 0.62; torso.renderOrder = 4; body.add(torso);
    const head = new THREE.Mesh(geo.sphere, skin); head.scale.set(0.17, 0.215, 0.19); head.position.set(0, 0.5, 0.01); head.renderOrder = 4; body.add(head);
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(geo.sphere, skin); sh.scale.set(0.11, 0.1, 0.1); sh.position.set(sx * 0.19, 0.24, 0); sh.renderOrder = 4; body.add(sh); }
    /* 갈비뼈·등뼈·가슴뼈 */
    const boneM = std('#fff4e2', 0.6, { transparent: true, opacity: 0.7 });
    for (let i = 0; i < 6; i++) {
      const y0 = 0.2 - i * 0.055, rx = 0.15 + Math.min(i, 3) * 0.008 - Math.max(0, i - 3) * 0.006, rz = rx * 0.6, gap = 0.42 + i * 0.05, pts = [];
      for (let k = 0; k <= 24; k++) { const th = gap + (Math.PI * 2 - gap * 2) * k / 24; pts.push([rx * Math.sin(th), y0 - 0.035 * (1 + Math.cos(th)) / 2, rz * Math.cos(th)]); }
      body.add(new THREE.Mesh(new THREE.TubeGeometry(curve(pts), 48, 0.0065, 6, false), boneM));
    }
    for (let i = 0; i < 12; i++) mesh(geo.box, boneM, body, [0, 0.27 - i * 0.05, -0.105], [0.03, 0.036, 0.026]);
    mesh(geo.box, boneM, body, [0, 0.09, 0.098], [0.026, 0.2, 0.012]);
    /* 기관·기관지 */
    const tm = std('#efd3da', 0.6);
    trachea = new THREE.Group(); body.add(trachea);
    trachea.add(new THREE.Mesh(new THREE.TubeGeometry(curve([[0, 0.43, 0.01], [0, 0.3, 0], [0, 0.17, -0.005]]), 16, 0.011, 10, false), tm));
    for (const sx of [-1, 1]) trachea.add(new THREE.Mesh(new THREE.TubeGeometry(curve([[0, 0.17, -0.005], [sx * 0.035, 0.14, -0.008], [sx * 0.07, 0.1, -0.01]]), 12, 0.0075, 8, false), tm));
    /* 폐(꼭대기를 기준으로 아래로 부푼다) */
    const lp = [[0.0001, -1], [0.19, -0.99], [0.25, -0.86], [0.27, -0.6], [0.24, -0.33], [0.17, -0.12], [0.07, -0.01], [0.0001, 0]].map(a => V2(a[0], a[1] * LUNG_H));
    const lungGeo = new THREE.LatheGeometry(lp, 36);
    for (const [sx, wid] of [[-1, 1.0], [1, 0.86]]) {   /* -X = 몸의 오른쪽(모형이 나를 본다), 왼쪽 폐는 심장 자리 때문에 조금 작다 */
      const g = new THREE.Group(); g.position.set(sx * 0.088, LUNG_TOP, -0.012); body.add(g);
      const m = new THREE.Mesh(lungGeo, std('#ee7f98', 0.6, { transparent: true, opacity: 0.92, emissive: new THREE.Color('#ee7f98'), emissiveIntensity: 0.22 }));
      m.scale.set(wid * 0.26, 1, 0.22); g.add(m); g.userData.w = wid; lungs.push(g);
    }
    /* 가로막(폐 아래 둥근 막) + 손잡이(모형 오른쪽 옆) */
    dia = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, 0.78).translate(0, -1, 0), std('#ee9447', 0.55, { transparent: true, opacity: 0.85, side: THREE.DoubleSide, emissive: new THREE.Color('#f0a35e'), emissiveIntensity: 0.15 }));
    dia.position.set(0, DIA0, 0); dia.scale.set(0.24, 0.22, 0.155); body.add(dia);
    knobRod = mesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 8), std('#c9a23a', 0.4), body, [0, 0, 0]);
    knob = mesh(geo.sphere, std('#ffc23d', 0.35, { emissive: new THREE.Color('#ffc23d'), emissiveIntensity: 0.4 }), body, [0.27, -0.14, 0.05], 0.06);
    /* 심장 */
    heart = new THREE.Group(); heartHome = V3(0.028, -0.012, 0.062); heart.position.copy(heartHome); body.add(heart);
    const hm = std('#d8404c', 0.45, { emissive: new THREE.Color('#d8404c'), emissiveIntensity: 0.22 });
    const hb = new THREE.Group(); heart.add(hb); heart.userData.beat = hb;
    mesh(geo.sphere, hm, hb, [0.004, -0.008, 0], [0.078, 0.1, 0.066], [0, 0, 0.5]);
    mesh(geo.sphere, std('#c23642', 0.5), hb, [-0.026, 0.03, 0.004], [0.042, 0.04, 0.04]);
    mesh(geo.sphere, std('#c23642', 0.5), hb, [0.026, 0.034, -0.004], [0.036, 0.036, 0.036]);
    mesh(new THREE.TorusGeometry(0.022, 0.0085, 8, 18, Math.PI), std('#e34b55', 0.45), hb, [-0.002, 0.052, -0.006], null, [0, 0.3, 0]);
    mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.04, 10), std('#8f5aa8', 0.5), hb, [0.012, 0.05, 0.016], null, [0.3, 0, -0.4]);
    const hit = new THREE.Mesh(geo.lowSphere, hitMat); hit.scale.setScalar(0.15); heart.add(hit);
    noShadow(body);
    /* 받침(휴대폰 혼합현실에서 책상·바닥 위에 놓이는 면) */
    const st = new THREE.Group(); H.world.add(st); body.userData.stand = st;
    mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.02, 48), std('#f3e6e4', 0.7), st, [0, C.y - 0.49, 0]).castShadow = false;
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 10), std('#d9c9c6', 0.6), st, [0, C.y - 0.44, -0.07]);
    /* 이름표 */
    const N = B.parts;
    partLabels.push(label(body, V3(-0.25, 0.2, 0.02), N.lungR), label(body, V3(0.25, 0.2, 0.02), N.lungL), label(body, V3(0.08, 0.44, 0.02), N.trachea),
      label(body, V3(0.36, -0.07, 0.05), N.diaphragm), label(body, V3(-0.13, -0.05, 0.14), N.heart));
    bigLabel = label(body, V3(0, -0.5, 0.3), B.modelLabel, B.modelNote, 620, 0.0008);
    setPull(0);
  }

  /* 숨: f = 0(내쉼) ~ 1(가득 들이쉼) */
  let pull = 0, pullPrev = 0;
  function setPull(f) {
    pull = Math.max(0, Math.min(1, f));
    const top = DIA0 - DIA_PULL * pull;
    dia.position.y = top; dia.scale.y = 0.22 - 0.07 * pull;
    for (const g of lungs) { const sy = (LUNG_TOP - top) / LUNG_H; g.scale.set(1 + 0.08 * pull, sy, 1 + 0.07 * pull); }
    const ky = -0.14 - 0.1 * pull; knob.position.y = ky;
    const a = V3(0.15, top - 0.03, 0.02), b = knob.position.clone(), mid = a.clone().add(b).multiplyScalar(0.5);
    knobRod.position.copy(mid); knobRod.scale.y = a.distanceTo(b); knobRod.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
  }

  /* 숨 공기 알갱이(기관 → 기관지 → 폐) */
  const airDots = [];
  function buildAir() {
    const paths = [-1, 1].map(sx => curve([[0, 0.47, 0.03], [0, 0.3, 0.005], [0, 0.17, -0.005], [sx * 0.05, 0.12, -0.01], [sx * 0.09, 0.02, -0.01]]));
    for (let i = 0; i < 18; i++) { const s = H.glowSprite('#8fd3ff', 0.028, 0); body.add(s); airDots.push({ s, path: paths[i % 2], u: i / 18 }); }
  }
  function stepAir(dt) {
    const df = (pull - pullPrev) / Math.max(dt, 1e-3); pullPrev = pull;
    const vis = Math.min(1, Math.abs(df) * 1.2);
    for (const d of airDots) { d.u = ((d.u + df * dt * 0.9) % 1 + 1) % 1; d.s.position.copy(d.path.getPointAt(d.u)); d.s.material.opacity = vis * 0.9 * Math.sin(Math.PI * d.u); }
    return df;
  }

  /* ───────────── 혈관·흐르는 적혈구 ───────────── */
  const loops = [], cells = [];
  function uOf(c, p) { let best = 0, bd = Infinity; for (let i = 0; i <= 400; i++) { const d = c.getPointAt(i / 400).distanceToSquared(p); if (d < bd) { bd = d; best = i / 400; } } return best; }
  function oxyAt(L, u) {
    const s = 0.035, k = Math.min(1, Math.max(0, (u - L.uT) / s + 0.5));
    return L.kind === 'sys' ? 1 - k : k;
  }
  function buildVessels() {
    const SYS = [[0.03, 0.035, 0.05], [0.012, 0.1, 0.03], [-0.012, 0.125, -0.02], [-0.004, 0.07, -0.072], [0.012, -0.1, -0.075], [0.022, -0.26, -0.055], [0.03, -0.39, -0.02], [0.0, -0.43, 0.02], [-0.035, -0.39, 0.05], [-0.04, -0.25, 0.062], [-0.036, -0.1, 0.062], [-0.012, -0.03, 0.07]];
    const PR = [[0.0, 0.02, 0.075], [-0.03, 0.065, 0.045], [-0.075, 0.065, 0.005], [-0.11, 0.02, -0.01], [-0.085, -0.025, 0.02], [-0.035, -0.012, 0.055]];
    const PL = [[0.035, 0.035, 0.075], [0.06, 0.075, 0.035], [0.1, 0.06, -0.008], [0.12, 0.015, -0.02], [0.095, -0.03, 0.0], [0.055, -0.005, 0.045]];
    for (const [pts, kind, ti, n] of [[SYS, 'sys', 7, 16], [PR, 'pul', 3, 8], [PL, 'pul', 3, 8]]) {
      const c = curve(pts, true), L = { c, kind, uT: 0 }; L.uT = uOf(c, V3(...pts[ti]));
      const tg = new THREE.TubeGeometry(c, 160, 0.0075, 8, true), cnt = tg.attributes.position.count, col = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) { const seg = Math.floor(i / 9); const cc = LOW.clone().lerp(OXY, oxyAt(L, (seg % 161) / 160)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
      tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const tube = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, transparent: true, opacity: 0.42, depthWrite: false }));
      tube.renderOrder = 3; body.add(tube); L.tube = tube;
      /* 몸 쪽(온몸) 모세 혈관 그물 */
      if (kind === 'sys') {
        const net = new THREE.Group(); net.position.copy(c.getPointAt(L.uT)); body.add(net); L.net = net;
        const nm = new THREE.MeshBasicMaterial({ color: '#d77a9a', transparent: true, opacity: 0.55 });
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; net.add(new THREE.Mesh(new THREE.TubeGeometry(curve([[-0.05, 0.03, 0], [Math.cos(a) * 0.04, Math.sin(a) * 0.025, 0.02], [0.05, 0.03, 0.0]]), 12, 0.0025, 5, false), nm)); }
      }
      loops.push(L);
      for (let i = 0; i < n; i++) { const m = new THREE.Mesh(rbcGeo, rbcMat(1)); m.scale.setScalar(0.32); body.add(m); cells.push({ m, L, u: i / n, spin: Math.random() * 6 }); }
    }
  }
  let bpm = 70, br = 20, oxyFlow = 0.35, running = false, beatPh = 0, breathPh = 0, manualBreath = false;   /* 쉴 때 호흡 약 20회/분(만 10~12세, 연구부 10-31) */
  function beatShape(p) { return p < 0.16 ? Math.sin(p / 0.16 * Math.PI) : (p > 0.3 && p < 0.4 ? 0.35 * Math.sin((p - 0.3) / 0.1 * Math.PI) : 0); }
  function stepBody(dt) {
    const tB = running ? 140 : 70, tR = running ? 40 : 20, tO = running ? 0.9 : 0.35, k = Math.min(1, dt * 0.45);
    bpm += (tB - bpm) * k; br += (tR - br) * k; oxyFlow += (tO - oxyFlow) * k;
    beatPh = (beatPh + dt * bpm / 60) % 1; const bs = beatShape(beatPh);
    heart.userData.beat.scale.setScalar(1 - 0.075 * bs);
    if (!manualBreath) { breathPh = (breathPh + dt * br / 60) % 1; setPull((running ? 1 : 0.75) * (1 - Math.cos(breathPh * Math.PI * 2)) / 2); }
    const sp = 0.1 * (bpm / 70) * (0.55 + 1.3 * bs);
    for (const c of cells) {
      c.u = (c.u + sp * dt * (c.L.kind === 'sys' ? 0.6 : 1.4)) % 1;
      c.m.position.copy(c.L.c.getPointAt(c.u)); c.spin += dt * 2; c.m.rotation.set(c.spin, c.spin * 0.7, 0);
      const o = oxyAt(c.L, c.u); if (Math.abs((c.m.userData.oxy == null ? -1 : c.m.userData.oxy) - o) > 0.02) setOxy(c.m, o);
    }
    for (const L of loops) if (L.net) L.net.children.forEach((t, i) => { t.material.opacity = 0.35 + 0.25 * bs; });
  }

  /* ───────────── 계기판(오른쪽) ───────────── */
  let gauge, gaugeKey = '', task = '', taskExtra = '';
  function drawGauge(force) {
    const key = [Math.round(bpm), Math.round(br), Math.round(oxyFlow * 20), running, task, taskExtra].join('|');
    if (!force && key === gaugeKey) return; gaugeKey = key;
    const G = B.gauge, g = gauge; g.clear(); g.pad = 28;
    if (task) { g.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 2 }); g.text(task + (taskExtra ? '  ' + taskExtra : ''), 27, '#ffffff', { gap: 14 }); g.bar('rgba(255,255,255,0.18)', 2, 12); }
    g.row([{ t: G.title, size: 30, color: '#c9c4d6', bold: true }, { t: running ? G.mode.run : G.mode.rest, size: 26, color: running ? '#ff9a7a' : '#8fe3a8', bold: true }], 8);
    g.row([{ t: '♥', size: 38, color: '#ff6b78' }, { t: G.pulse.replace('{n}', Math.round(bpm / 5) * 5), size: 38, color: '#ffd27a', bold: true }], 4);
    g.meter(bpm / 180, '#ff6b78', 18, 12);
    g.row([{ t: '≈', size: 38, color: '#8fd3ff' }, { t: G.breath.replace('{n}', Math.round(br)), size: 38, color: '#ffd27a', bold: true }], 4);
    g.meter(br / 50, '#8fd3ff', 18, 12);
    g.row([{ t: G.oxy, size: 26, color: '#e7e3f2' }, { t: oxyFlow > 0.6 ? G.oxyHigh : G.oxyLow, size: 26, color: '#ff8a8a', bold: true }], 4);
    g.meter(oxyFlow, '#ff4b4b', 18, 10);
    g.text(G.note, 22, '#a9a4b8', { gap: 0 });
    g.finish(); g.pin(); g.mesh.visible = gaugeOn;
  }
  let gaugeOn = false;
  function buildGauge() {
    gauge = new Panel('gauge', 560, 'rgba(33,31,46,0.88)'); drawGauge(true); gauge.mesh.visible = false;
    gauge.mesh.position.copy(BOARD); H.world.add(gauge.mesh);
    gauge.mesh.lookAt(V3(POS.start[0], 1.55, POS.start[1] + 0.3));
  }
  function missionInfo(text, extra) { task = text || ''; taskExtra = extra || ''; if (gauge) drawGauge(true); }

  /* ───────────── 미션 1: 심장 꺼내기 ───────────── */
  let heartCard, heartOut = false, heartBusy = false, heartHeld = false;
  function buildHeartCard() {
    heartCard = new Panel('heartCard', 520, 'rgba(33,31,46,0.9)', 0.0007); heartCard.pad = 22; H.scene.add(heartCard.mesh);
    const c = B.m1.card; heartCard.text(c[0], 38, '#ff8a94', { bold: true, align: 'center', gap: 6 });
    for (let i = 1; i < c.length; i++) heartCard.text(c[i], 27, '#ffffff', { align: 'center', gap: 4 });
    heartCard.finish();
  }
  function cardFollow() { const wp = heart.getWorldPosition(V3()), r = V3(1, 0, 0).applyQuaternion(H.camera.getWorldQuaternion(new THREE.Quaternion())); r.y = 0; r.normalize(); if (tall()) wp.y += 0.17; else { wp.addScaledVector(r, 0.27); wp.y += 0.03; } H.face(heartCard, wp); }
  H.onUpdate(() => { if (heartCard.mesh.visible) cardFollow(); });
  function setupHeart() {
    H.addGrabbable(heart, { radius: 0.1,
      onGrab: () => { heartHeld = true; heartCard.show(true); },
      onMove: (g, p) => { heart.position.copy(body.worldToLocal(p.clone())); if (heart.position.distanceTo(heartHome) > 0.12) heartOut = true; },
      onRelease: () => { heartHeld = false; wait(1.2).then(() => { if (!heartHeld) { heartCard.show(false); H.tween(0.6, k => heart.position.lerp(heartHome, k)); } }); } });
    H.addPickable(heart, () => pullOutHeart(), on => { heart.userData.beat.children[0].material.emissiveIntensity = on ? 0.5 : 0.22; });
  }
  async function pullOutHeart() {
    if (heartBusy || heartHeld) return; heartBusy = true;
    const from = heart.position.clone(), to = heartHome.clone().add(V3(0, 0.06, 0.3));
    await H.tween(0.7, k => heart.position.lerpVectors(from, to, H.ease(k)));
    heartOut = true; heartCard.show(true); H.sfx('piece');
    await wait(4);
    heartCard.show(false); await H.tween(0.7, k => heart.position.lerpVectors(to, heartHome, H.ease(k)));
    heartBusy = false;
  }

  /* ───────────── 미션 2: 숨 쉬기(가로막 손잡이) ───────────── */
  let breaths = 0, armed = false, knobHeld = false, tapBreathing = false;
  function setupKnob() {
    H.addGrabbable(knob, { radius: 0.09,
      onGrab: () => { if (!manualBreath) return; knobHeld = true; },
      onMove: (g, p) => { if (!manualBreath) return; const lp = body.worldToLocal(p.clone()); setPull((-0.14 - lp.y) / 0.1); },
      onRelease: () => { knobHeld = false; if (manualBreath) { const f0 = pull; H.tween(1.1, k => { if (!knobHeld) setPull(f0 * (1 - H.ease(k))); }); } } });
    H.addPickable(knob, () => tapBreath(), on => knob.scale.setScalar(on ? 0.075 : 0.06));
  }
  async function tapBreath() {
    if (!manualBreath || tapBreathing || knobHeld) return; tapBreathing = true;
    const f0 = pull;
    await H.tween(1.3, k => setPull(f0 + (1 - f0) * H.ease(k))); await wait(0.3);
    await H.tween(1.3, k => setPull(1 - H.ease(k))); tapBreathing = false;
  }
  function countBreath() { if (pull > 0.8) armed = true; else if (armed && pull < 0.15) { armed = false; breaths++; H.sfx('piece'); } }

  /* ───────────── 미션 3: 폐포에서 산소 받기 ───────────── */
  let alv, alvBall, alvO2 = [], alvCells = [], exchanged = 0;
  function o2Mesh(parent, col, el2) {
    const g = new THREE.Group(); parent.add(g);
    const a = std(col, 0.4, { emissive: new THREE.Color(col), emissiveIntensity: 0.3 });
    if (el2) { mesh(geo.sphere, std('#444444', 0.4), g, [0, 0, 0], 0.026); mesh(geo.sphere, a, g, [-0.022, 0, 0], 0.024); mesh(geo.sphere, a, g, [0.022, 0, 0], 0.024); }
    else { mesh(geo.sphere, a, g, [-0.01, 0, 0], 0.024); mesh(geo.sphere, a, g, [0.01, 0, 0], 0.024); }
    return noShadow(g);
  }
  function buildAlveolus() {
    alv = new THREE.Group(); alv.position.copy(ALV); alv.visible = false; H.world.add(alv);
    const am = std('#f8b4c2', 0.5, { transparent: true, opacity: 0.38, depthWrite: false, emissive: new THREE.Color('#f8b4c2'), emissiveIntensity: 0.2 });
    alvBall = mesh(geo.sphere, am, alv, [0, 0, 0], 0.2); alvBall.renderOrder = 4;
    const rim = new THREE.Mesh(geo.sphere, rimMat('#ff8fa6', 0.02, 0.7)); rim.scale.setScalar(0.202); rim.renderOrder = 5; alv.add(rim);
    for (const [x, y, z, s] of [[-0.1, 0.09, -0.08, 0.12], [0.1, 0.1, -0.09, 0.11], [0.0, -0.1, -0.1, 0.1]]) { const b = mesh(geo.sphere, am, alv, [x, y, z], s); b.renderOrder = 4; }
    mesh(new THREE.TubeGeometry(curve([[0, 0.09, -0.02], [-0.06, 0.18, -0.03], [-0.14, 0.24, -0.04]]), 16, 0.022, 10, false), std('#efd3da', 0.6, { transparent: true, opacity: 0.7 }), alv);
    /* 모세 혈관(왼쪽 아래 어두운 피 → 오른쪽 위 밝은 피) */
    const cap = curve([[-0.24, -0.17, 0.08], [-0.1, -0.11, 0.1], [0.0, -0.06, 0.105], [0.09, 0.0, 0.09], [0.2, 0.07, 0.03], [0.28, 0.1, -0.02]]);
    const tg = new THREE.TubeGeometry(cap, 80, 0.026, 12, false), cnt = tg.attributes.position.count, col = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) { const u = Math.floor(i / 13) / 80, cc = LOW.clone().lerp(OXY, Math.min(1, Math.max(0, (u - 0.35) / 0.3))); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const ct = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false })); ct.renderOrder = 3; alv.add(ct);
    for (let i = 0; i < 6; i++) { const o = o2Mesh(alv, '#e8423f'); o.position.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.06); o.userData.w = V3(Math.random(), Math.random(), Math.random()); alvO2.push(o); }
    label(alv, V3(0.12, -0.27, 0.12), B.m3.alvLabel, B.m3.alvNote, 600, 0.0007);
    label(alv, V3(-0.26, -0.27, 0.1), B.m3.rbc, null, 300, 0.0006);
    const homes = [[-0.3, -0.2, 0.1], [-0.24, -0.23, 0.15], [-0.18, -0.26, 0.2]];
    const exits = [[0.26, 0.04, 0.04], [0.3, 0.12, 0.0], [0.22, 0.14, 0.06]];
    homes.forEach((hp, i) => {
      const m = new THREE.Mesh(rbcGeo, rbcMat(0)); m.scale.setScalar(1.15); m.position.set(...hp); m.rotation.set(1.2, 0.3, 0); alv.add(m);
      const hit = new THREE.Mesh(geo.lowSphere, hitMat); hit.scale.setScalar(0.07); m.add(hit);
      const cell = { m, home: V3(...hp), exit: V3(...exits[i]), done: false, held: false, busy: false };
      H.addGrabbable(m, { radius: 0.07,
        onGrab: () => { cell.held = true; },
        onMove: (g, p) => { if (cell.done || cell.busy) return; m.position.copy(alv.worldToLocal(p.clone())); if (m.position.length() < 0.15) exchange(cell); },
        onRelease: () => { cell.held = false; if (!cell.done && !cell.busy) H.tween(0.4, k => m.position.lerp(cell.home, k)); } });
      H.addPickable(m, () => tapCell(cell), on => m.scale.setScalar(on ? 1.35 : 1.15));
      alvCells.push(cell);
    });
  }
  async function tapCell(cell) {
    if (cell.done || cell.busy || !alv.visible) return; cell.busy = true;
    const from = cell.m.position.clone(), to = V3(-0.04, -0.1, 0.13);
    await H.tween(0.8, k => cell.m.position.lerpVectors(from, to, H.ease(k)));
    cell.busy = false; exchange(cell);
  }
  async function exchange(cell) {
    if (cell.done || cell.busy) return; cell.done = true; cell.busy = true;
    for (const gr of H.grabbers) if (gr.held === cell.m) { gr.held = null; cell.m.userData.grab.held = null; }
    cell.held = false;
    const at = cell.m.position.clone();
    const o2 = alvO2.find(o => o.visible && !o.userData.used); if (o2) o2.userData.used = true;
    const co2 = o2Mesh(alv, '#e8423f', true); co2.position.copy(at); co2.scale.setScalar(0.9);
    const o2from = o2 ? o2.position.clone() : V3();
    H.sfx('piece');
    await H.tween(1.0, k => { const e = H.ease(k); if (o2) o2.position.lerpVectors(o2from, at, e); co2.position.lerpVectors(at, V3(0.02, 0.02, 0), e); setOxy(cell.m, e); });
    if (o2) o2.visible = false;
    H.burst(alv.localToWorld(at.clone()), '#ff6b6b', 30, 0.5, 0.8, 0.025);
    exchanged++; showToast(B.m3.got, 2.2);
    const from = cell.m.position.clone();
    H.tween(1.2, k => cell.m.position.lerpVectors(from, cell.exit, H.ease(k)));
    await wait(0.6); await H.tween(2.0, k => { co2.position.lerpVectors(V3(0.02, 0.02, 0), V3(-0.14, 0.26, -0.04), H.ease(k)); });   /* 이산화탄소는 숨길(세기관지)로 나간다 */
    co2.visible = false; cell.busy = false;
  }

  /* ───────────── 미션 4: 피의 길 따라가기 ───────────── */
  let token = null, marks = {}, routeStep = 0, routeBusy = false, tokenHeld = false;
  const ROUTE = ['body', 'heart', 'lung', 'heart'];
  function buildRoute() {
    token = new THREE.Mesh(rbcGeo, rbcMat(1)); token.scale.setScalar(0.85); token.visible = false; body.add(token);
    const halo = H.glowSprite('#ffffff', 0.09, 0.6); token.add(halo);
    const hit = new THREE.Mesh(geo.lowSphere, hitMat); hit.scale.setScalar(0.06); token.add(hit);
    const M = B.m4.marks;
    for (const [k, pos, lp] of [['heart', V3(0.03, 0.0, 0.2), V3(0, 0.055, 0)], ['body', V3(0.0, -0.43, 0.15), V3(0.09, 0.0, 0)], ['lung', V3(-0.27, 0.03, 0.06), V3(0, 0.055, 0)]]) {
      const g = new THREE.Group(); g.position.copy(pos); g.visible = false; body.add(g);
      const ball = mesh(geo.sphere, std('#ffd27a', 0.35, { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.5 }), g, [0, 0, 0], 0.045); ball.castShadow = false;
      const glow = H.glowSprite('#ffd27a', 0.16, 0); g.add(glow);
      const lab = label(g, lp, M[k], null, 220, 0.0006);
      H.addPickable(g, () => pickMark(k), on => ball.scale.setScalar(on ? 0.06 : 0.045));
      marks[k] = { g, ball, glow, lab };
    }
    H.addGrabbable(token, { radius: 0.07,
      onGrab: () => { if (routeBusy) return; tokenHeld = true; },
      onMove: (g, p) => { if (!tokenHeld) return; token.position.copy(body.worldToLocal(p.clone())); const k = ROUTE[routeStep]; if (k && token.position.distanceTo(marks[k].g.position) < 0.07) { tokenHeld = false; for (const gr of H.grabbers) if (gr.held === token) { gr.held = null; token.userData.grab.held = null; } pickMark(k); } },
      onRelease: () => { if (!tokenHeld) return; tokenHeld = false; const from = token.position.clone(), to = stationPos(); H.tween(0.4, k => token.position.lerpVectors(from, to, k)); } });
  }
  /* 각 칸의 길: [고리, 시작 u, 끝 u] */
  function segs() { const S = loops[0], Pp = loops[1]; return [[S, 0, S.uT], [S, S.uT, 0.999], [Pp, 0, Pp.uT], [Pp, Pp.uT, 0.999]]; }
  function stationPos() { const sg = segs(); if (routeStep === 0) return sg[0][0].c.getPointAt(0); const s = sg[routeStep - 1]; return s[0].c.getPointAt(s[2]); }
  function lightMarks() { const want = ROUTE[routeStep]; for (const k in marks) { const on = k === want; marks[k].glow.material.opacity = on ? 0.75 : 0; marks[k].ball.material.emissiveIntensity = on ? 0.9 : 0.2; } }
  async function pickMark(k) {
    if (routeBusy || routeStep >= ROUTE.length || !token.visible) return;
    if (k !== ROUTE[routeStep]) { showToast(B.m4.wrong, 1.8); return; }
    routeBusy = true; H.sfx('select');
    const [L, u0, u1] = segs()[routeStep], from = token.position.clone();
    await H.tween(0.3, k2 => token.position.lerpVectors(from, L.c.getPointAt(u0), k2));
    await H.tween(2.2, k2 => { const u = u0 + (u1 - u0) * k2; token.position.copy(L.c.getPointAt(u)); setOxy(token, oxyAt(L, u)); });
    H.burst(token.getWorldPosition(V3()), routeStep % 2 ? '#ffffff' : (routeStep === 0 ? '#9a6ad0' : '#ff6b6b'), 30, 0.5, 0.8, 0.025);
    showToast(B.m4.step[routeStep], 3.2);
    routeStep++; drawRoute(); lightMarks(); routeBusy = false;
  }
  function drawRoute() {
    const R = B.m4.route; let s = '';
    R.forEach((t, i) => { s += (i ? ' → ' : '') + (i === routeStep ? '[' + t + ']' : t); });
    missionInfo(H.inXR() && !H.handheld ? B.m4.ask + ' ' + B.m4.askGrab : B.m4.ask, s);
  }

  /* ───────────── 미션 5: 운동 손잡이 ───────────── */
  let sw, swKnob, swX = -0.1;
  function buildSwitch() {
    sw = new THREE.Group(); sw.position.copy(SW); sw.visible = false; H.world.add(sw);
    mesh(geo.box, std('#ffffff', 0.4, { transparent: true, opacity: 0.6 }), sw, [0, 0, 0], [0.28, 0.022, 0.05]).castShadow = false;
    mesh(geo.box, std('#8fe3a8', 0.5), sw, [-0.1, 0.004, 0], [0.07, 0.024, 0.052]).castShadow = false;
    mesh(geo.box, std('#ff9a7a', 0.5), sw, [0.1, 0.004, 0], [0.07, 0.024, 0.052]).castShadow = false;
    swKnob = mesh(geo.sphere, std('#ffffff', 0.3, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35 }), sw, [swX, 0.04, 0], 0.07);
    label(sw, V3(-0.1, 0.12, 0), B.m5.rest, null, 180, 0.0006); label(sw, V3(0.1, 0.12, 0), B.m5.run, null, 200, 0.0006);
    label(sw, V3(0, 0.21, 0), B.m5.switchLabel, null, 300, 0.0006);
    H.addGrabbable(swKnob, { radius: 0.09, onMove: (g, p) => { const lp = sw.worldToLocal(p.clone()); setSwitch(lp.x); } });
    H.addPickable(swKnob, () => { H.tween(0.4, k => setSwitch(running ? 0.1 - 0.2 * k : -0.1 + 0.2 * k)); }, on => swKnob.scale.setScalar(on ? 0.085 : 0.07));
  }
  function setSwitch(x) {
    swX = Math.max(-0.1, Math.min(0.1, x)); swKnob.position.x = swX;
    const r = swX > 0.02; if (r !== running) { running = r; H.sfx(r ? 'whoosh' : 'click'); log('running', r); }
  }

  /* ───────────── 미션 목록·리니 ───────────── */
  const MISSIONS = [B.m1.title, B.m2.title, B.m3.title, B.m4.title, B.m5.title], done = MISSIONS.map(() => false);
  let wrist;
  function drawWrist() {
    const p = wrist; p.clear();
    p.row([{ t: B.wrist, size: 36, color: '#ffffff', bold: true }, { t: done.filter(Boolean).length + '/' + MISSIONS.length, size: 36, color: '#ffc766', bold: true }], 12);
    const cur = done.indexOf(false);
    MISSIONS.forEach((t, i) => p.row([{ t: done[i] ? '●' : i === cur ? '▶' : '○', size: 30, color: done[i] ? '#8fe3a8' : i === cur ? '#ffc766' : '#8a8698' }, { t, size: 30, color: done[i] ? '#b9b5c6' : '#ffffff' }], 8));
    p.finish(); p.show(true);
  }
  function finish(i) { done[i] = true; drawWrist(); H.sfx('complete'); }
  let rini = null;
  const spk = () => ({ name: B.guide.name, role: B.guide.role, dot: B.guide.dot, char: rini, pos: P(POS.rini) });
  const riniSay = (text, options, single, o) => say(spk(), text, options, single || '다음', o || { at: TALK });
  async function lines(arr) { for (const l of arr) { if (typeof l === 'string') await riniSay(l); else await riniSay(l.text, l.choices); } }
  const tapMode = () => H.handheld || !H.inXR();

  /* 화면 모드: 미션마다 볼 곳으로 천천히 옮겨 선다(헤드셋에서는 내가 걸어 다닌다) */
  async function view(cx, cy, cz, halfW) {
    if (H.inXR()) return;
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * H.camera.aspect);
    const dist = Math.max(1.15, Math.min(4.0, halfW / Math.tan(hf)));
    const f1 = V3(cx, 0, cz + dist), l1 = V3(cx, cy, cz), f0 = H.rig.position.clone(), l0 = viewLook.clone();
    viewLook.copy(l1);
    await H.tween(0.9, k => { const e = H.ease(k); H.place(f0.clone().lerp(f1, e), l0.clone().lerp(l1, e)); });
  }
  const viewLook = V3(0, 1.3, 0);

  /* ───────────── 흐름 ───────────── */
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(B.kicker, 30, '#c0566a', { bold: true, align: 'center', gap: 10 });
    p.text(B.title, 76, INK, { bold: true, align: 'center', gap: 18 });
    p.text(B.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? B.howPhone : H.inXR() ? (handMode ? B.howHand : B.howHand + ' ' + B.howCtrl) : B.howFlat, 28, '#b5873e', { align: 'center', gap: 30 });
    p.button(B.start, null, '#e8848f', null, 110);
    if (!H.inXR()) {
      const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * H.camera.aspect);
      const dist = Math.max(1.4, Math.min(4.2, 0.95 / Math.tan(hf)));
      H.place(P([0.05, dist]), V3(0.05, 1.3, 0)); viewLook.set(0.05, 1.3, 0);
    }
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat');
    await waitPick(p, 0, 1.0); p.show(false);
    H.audio.music('day'); await wait(0.4);
  }
  async function showBody() {
    log('state body');
    body.visible = true; body.userData.stand.visible = true; H.sfx('appear'); H.burst(body.getWorldPosition(V3()), '#ffd0d6', 120, 1.6, 1.3, 0.035);
    await H.tween(1.4, k => { const s = Math.max(0.001, H.ease(k)); body.scale.setScalar(s); });
    if (H.useHud()) H.hud(gauge, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.5 : 0.3);
    gaugeOn = true; gauge.mesh.visible = true; drawWrist();
  }
  async function m1() {
    log('state m1');
    bigLabel.mesh.visible = false;
    await view(0.1, 1.3, 0, 0.5);
    await riniSay(B.m1.ask, null, '해 볼게'); missionInfo(tapMode() ? B.m1.askTap : B.m1.ask);
    if (H.AUTOTEST) wait(1).then(() => pullOutHeart());
    await until(() => heartOut); await wait(1.5);
    if (!tapMode()) showToast(B.m1.fist, 3);
    missionInfo(''); finish(0);
    await riniSay(B.m1.done);
  }
  async function m2() {
    log('state m2');
    await view(0.1, 1.25, 0, 0.5);
    manualBreath = true; breaths = 0; armed = false;
    await H.tween(0.6, k => setPull(pull * (1 - k)));
    await riniSay(tapMode() ? B.m2.askTap : B.m2.ask, null, '해 볼게');
    const ask = tapMode() ? B.m2.askTap : B.m2.ask;
    if (H.AUTOTEST) (async () => { for (let i = 0; i < 3; i++) { await wait(0.5); await tapBreath(); } })();
    let last = '', lp = pull, ph = '';
    await until(() => {
      countBreath();
      if (Math.abs(pull - lp) > 0.002) ph = pull > lp ? B.m2.inhale : B.m2.exhale; lp = pull;
      const phase = pull > 0.03 ? ph : '';
      const key = breaths + phase; if (key !== last) { last = key; missionInfo(ask, B.m2.counter + ' ' + Math.min(3, breaths) + ' / 3' + (phase ? '\n' + phase : '')); }
      return breaths >= 3;
    });
    await until(() => pull < 0.05 || !tapBreathing); await wait(0.6);
    missionInfo(''); finish(1); manualBreath = false;
    await riniSay(B.m2.done);
  }
  async function m3() {
    log('state m3');
    for (const l of partLabels) l.mesh.visible = false;
    alv.visible = true; H.sfx('appear'); H.burst(alv.getWorldPosition(V3()), '#ffd0d6', 60, 1, 1, 0.03);
    await view(0.55, 1.3, 0.05, 0.5);
    await riniSay(B.m3.ask, null, '해 볼게');
    const ask = tapMode() ? B.m3.askTap : B.m3.ask;
    if (H.AUTOTEST) (async () => { for (const c of alvCells) { await wait(0.6); await tapCell(c); await until(() => !c.busy); } })();
    let last = -1;
    await until(() => { if (exchanged !== last) { last = exchanged; missionInfo(ask, B.m3.counter + ' ' + exchanged + ' / 3'); } return exchanged >= 3; });
    await until(() => alvCells.every(c => !c.busy)); await wait(0.4);
    missionInfo(''); finish(2);
    await riniSay(B.m3.done);
    alv.visible = false;
  }
  async function m4() {
    log('state m4');
    heart.userData.pick.enabled = false;
    await view(0.0, 1.12, 0, 0.5);
    for (const l of partLabels) l.mesh.visible = false;
    token.visible = true; token.position.copy(stationPos()); setOxy(token, 1);
    for (const k in marks) marks[k].g.visible = true;
    routeStep = 0; lightMarks();
    await riniSay(B.m4.ask, null, '따라갈게'); drawRoute();
    if (H.AUTOTEST) (async () => { while (routeStep < ROUTE.length) { await wait(0.6); await pickMark(ROUTE[routeStep]); } })();
    await until(() => routeStep >= ROUTE.length && !routeBusy); await wait(1.2);
    missionInfo(''); finish(3);
    await riniSay(B.m4.done);
    for (const k in marks) marks[k].g.visible = false;
    token.visible = false; heart.userData.pick.enabled = true;
    for (const l of partLabels) l.mesh.visible = true;
  }
  async function m5() {
    log('state m5');
    alv.visible = false;
    sw.visible = true; H.burst(sw.getWorldPosition(V3()), '#ffffff', 40, 1, 1, 0.03);
    await view(0.22, 1.3, 0.05, 0.5);
    await riniSay(tapMode() ? B.m5.askTap : B.m5.ask, null, '달려 볼게'); missionInfo(tapMode() ? B.m5.askTap : B.m5.ask);
    if (H.AUTOTEST) wait(1).then(() => H.tween(0.4, k => setSwitch(-0.1 + 0.2 * k)));
    await until(() => running && bpm > 128 && br > 34); await wait(1.0);
    missionInfo(''); finish(4);
    await riniSay(B.m5.why);
    await riniSay(B.m5.back);
    await H.tween(0.5, k => setSwitch(0.1 - 0.2 * k));
  }
  async function ending() {
    log('state ending');
    await view(0.05, 1.3, 0, 0.6);
    await lines(B.ending.rini);
    const E = B.ending;
    for (;;) {
      const p = ui.card; p.clear(); p.pad = 46;
      p.text(E.cardKicker, 28, '#c0566a', { bold: true, align: 'center', gap: 6 });
      p.text(E.cardTitle, 56, INK, { bold: true, align: 'center', gap: 18 });
      E.rows.forEach(r => p.row([{ t: '✔', size: 30, color: '#e8737f', bold: true }, { t: r, size: 30, color: INK }], 10));
      p.space(16);
      p.button(E.free, null, '#e8848f', null, 88); p.button(E.restart, null, '#ece5d8', null, 80); p.button(E.exit, null, '#3b3550', null, 80);
      p.finish(); H.placeAhead(p, 1.0, -0.45, -0.25); p.show(true);
      log('state card');
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { showToast(E.freeToast, 3); await until(() => false); }
      const s = H.renderer.xr.getSession(); if (s && i === 2) { s.end(); return; }
      location.reload(); return;
    }
  }
  async function main() {
    if (H.handheld && rini) rini.root.position.y = C.y - 0.48;
    await intro(); await lines(B.hello); await showBody();
    await m1(); await m2(); await m3(); await m4(); await m5(); await ending();
  }

  /* ───────────── 짓기·시작 ───────────── */
  buildSpace(); buildBody(); buildAir(); buildVessels(); buildGauge(); buildHeartCard(); setupHeart(); setupKnob(); buildAlveolus(); buildRoute(); buildSwitch();
  body.scale.setScalar(0.001); body.visible = false; body.userData.stand.visible = false;
  H.onUpdate(dt => {
    if (!body.visible) return;
    stepBody(dt); stepAir(dt);
    for (const o of alvO2) if (o.visible && !o.userData.used) { o.rotation.x += dt * o.userData.w.x; o.rotation.y += dt * o.userData.w.y; o.position.x += Math.sin(H.now * (0.6 + o.userData.w.z)) * dt * 0.01; }
    if (gaugeOn) drawGauge(false);
  });
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  const ready = H.loadChar({ url: '../world1/assets/rini-glb.wasm', height: 1.2, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', walk: 'walk', wave: 'wave2' }, trim: { wave: [1.4, 5.0] }, glow: 0.25 }).then(c => { rini = c; });
  /* 휴대폰 혼합현실: 톡 누른 바닥·책상에 받침이 놓이게(anchor), 리니도 같은 면 위에 선다 */
  H.start({ main, ready, start: { pos: POS.start, look: [C.x, C.z] }, anchor: V3(C.x, C.y - 0.5, C.z) });
  window.BODYX = { body, heart, lungs, setPull, setSwitch, pullOutHeart, tapBreath, tapCell, pickMark, alvCells, cells, get state() { return { bpm, br, oxyFlow, running, breaths, exchanged, routeStep, heartOut, done: done.slice() }; } };
})();
