/* 「공기 분자 실험실」(가칭) v0.2 — 내 방(혼합현실)에서 손으로 공기 분자를 만지며 배우는 앱 (2026-10-18, 공용 엔진 core.js)
   1m 상자 = 실제 10nm 공기(1억 배), 분자 25개(질소 20·산소 5). 크기·간격 모두 1억 배 비율.
   손 실험: ① 분자 집기·던지기 ② 산소 3개 집기 ③ 뚜껑 눌러 압력 ④ 온도계 손잡이로 데우기·식히기 ⑤ 원자 붙여 이산화탄소 만들어 넣기
   압력 = (분자 수 × 절대온도) / 부피 (이상기체, 처음 = 1기압). 던진 분자의 빠르기는 2초쯤 지나면 그 온도의 빠르기로 돌아온다.
   화면 모드(헤드셋 없음)에서는 눌러서 같은 실험을 해 볼 수 있다.                                                  */
(function () {
  'use strict';
  const H = window.HW, A = window.AIR;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[AIR]', ...a);

  const POS = { start: [0, 0.95], rini: [-1.6, -0.95] };
  const TALK = V3(-0.6, 2.08, -0.02), BOARD = V3(0.62, 2.05, -0.06);   // 상자 위 전광판: 왼쪽 = 리니 말, 오른쪽 = 할 일·압력계
  const S = 1.0, C = V3(0, 1.25, 0);                 // 상자 크기·가운데(바닥 0.75, 뚜껑 1.75)
  const LID_MIN = -S / 2 + 0.25;                     // 뚜껑이 내려갈 수 있는 곳(부피 25%)
  const N0 = 25, COUNTS = { N2: 20, O2: 5 };
  const BASE = 0.28, MASS = { N2: 28, O2: 32, Ar: 40, CO2: 44 };
  H.bounds.r = 5.5;
  H.setSky('#7f8fd6', '#e8e6f6', '#f3efe8');
  H.hemi.intensity = 0.85; H.sun.intensity = 1.1; H.sun.position.set(3, 10, 6);

  // ───────────── 실험 공간(VR에서만) ─────────────
  function buildSpace() {
    const v = H.vrOnly;
    mesh(new THREE.CircleGeometry(8, 96), std('#ebe8f0', 0.9), v, [0, 0, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const lm = new THREE.MeshBasicMaterial({ color: '#b9b4d6', transparent: true, opacity: 0.45 });
    for (let i = 1; i <= 7; i++) mesh(new THREE.RingGeometry(i - 0.01, i + 0.01, 128), lm, v, [0, 0.003, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
  }

  // ───────────── 원자·분자 모양(1Å → 1cm) ─────────────
  const EL = { N: { r: 0.0155, c: '#3f6fe8' }, O: { r: 0.0152, c: '#e8423f' }, C: { r: 0.017, c: '#3a3a3a' }, Ar: { r: 0.0188, c: '#80d1e3' } };
  const elMat = {}; for (const k in EL) elMat[k] = std(EL[k].c, 0.35, { emissive: new THREE.Color(EL[k].c), emissiveIntensity: k === 'C' ? 0.06 : 0.2 });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const SHAPE = { N2: [['N', -0.0055], ['N', 0.0055]], O2: [['O', -0.00605], ['O', 0.00605]], CO2: [['O', -0.0116], ['C', 0], ['O', 0.0116]],
    Ar: [['Ar', 0]], O: [['O', 0]], N: [['N', 0]], C: [['C', 0]] };
  function shape(kind, parent) {
    const g = new THREE.Group(); parent.add(g);
    for (const [el, x] of SHAPE[kind]) { const a = mesh(geo.sphere, elMat[el], g, [x, 0, 0], EL[el].r * 2); a.castShadow = false; a.receiveShadow = false; }
    const hit = new THREE.Mesh(geo.lowSphere, hitMat); hit.scale.setScalar(0.12); g.add(hit);   // 화면 모드에서 누르기 쉽게
    return g;
  }
  const NAME = k => (A.types[k] ? A.types[k].name + ' ' + A.types[k].formula : ({ O: '산소 원자 O', N: '질소 원자 N', C: '탄소 원자 C' })[k]);

  // ───────────── 상자(뚜껑이 움직인다) ─────────────
  let box, lid, lidY = S / 2, sides = [], edgesV = [], lidMat, lidFlash = 0;
  function buildBox() {
    box = new THREE.Group(); box.position.copy(C); H.world.add(box);
    const glassM = new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    const edgeM = new THREE.MeshBasicMaterial({ color: '#7fd3ff' });
    // 바닥
    const bottom = mesh(geo.plane, glassM, box, [0, -S / 2, 0], [S, S, 1], [-Math.PI / 2, 0, 0]); bottom.castShadow = false;
    for (const [x, z, ry] of [[0, S / 2, 0], [0, -S / 2, 0], [S / 2, 0, Math.PI / 2], [-S / 2, 0, Math.PI / 2]]) { const w = mesh(geo.plane, glassM, box, [x, 0, z], [S, S, 1], [0, ry, 0]); w.castShadow = false; w.renderOrder = 5; sides.push(w); }
    const edge = (x, y, z, sx, sy, sz, p) => { const e = mesh(geo.box, edgeM, p || box, [x, y, z], [sx, sy, sz]); e.castShadow = false; return e; };
    for (const [x, z] of [[S / 2, 0], [-S / 2, 0]]) edge(x, -S / 2, z, 0.012, 0.012, S);
    for (const [x, z] of [[0, S / 2], [0, -S / 2]]) edge(x, -S / 2, z, S, 0.012, 0.012);
    for (const [x, z] of [[S / 2, S / 2], [S / 2, -S / 2], [-S / 2, S / 2], [-S / 2, -S / 2]]) edgesV.push(edge(x, 0, z, 0.012, S, 0.012));
    // 뚜껑 + 노란 손잡이
    lid = new THREE.Group(); box.add(lid);
    lidMat = std('#cfeeff', 0.3, { transparent: true, opacity: 0.35, emissive: new THREE.Color('#7fd3ff'), emissiveIntensity: 0.15 });
    mesh(geo.box, lidMat, lid, [0, 0, 0], [S, 0.02, S]).castShadow = false;
    for (const [x, z, sx, sz] of [[S / 2, 0, 0.014, S], [-S / 2, 0, 0.014, S], [0, S / 2, S, 0.014], [0, -S / 2, S, 0.014]]) edge(x, 0.012, z, sx, 0.014, sz, lid);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 12), std('#c9a23a', 0.4), lid, [0, 0.07, 0]);
    const knob = mesh(geo.sphere, std('#ffc23d', 0.35, { emissive: new THREE.Color('#ffc23d'), emissiveIntensity: 0.35 }), lid, [0, 0.15, 0], 0.08);
    const lab = new Panel('boxLabel', 760, 'rgba(33,31,46,0.8)'); lab.pad = 20;
    lab.text(A.boxLabel, 42, '#ffffff', { bold: true, align: 'center', gap: 4 }); lab.text(A.boxNote, 26, '#bfe6ff', { align: 'center', gap: 0 }); lab.finish(); lab.pin();
    lab.mesh.position.set(0, -S / 2 - 0.12, S / 2 + 0.02); lab.mesh.scale.multiplyScalar(0.8); box.add(lab.mesh);
    // 손잡이 잡기(헤드셋) · 누르기(화면)
    H.addGrabbable(knob, { radius: 0.1,
      onMove: (g, p) => { setLid(box.worldToLocal(p.clone()).y - 0.15); },
      onRelease: () => { H.showToast(A.m3.reset, 2.2); } });
    H.addPickable(knob, () => setLid(lidY > 0 ? 0 : S / 2), on => { knob.scale.setScalar(on ? 0.1 : 0.08); });
    setLid(S / 2);
    box.scale.setScalar(0.001); box.visible = false;
  }
  function setLid(y) {
    lidY = Math.max(LID_MIN, Math.min(S / 2, y));
    lid.position.y = lidY;
    const h = lidY + S / 2;
    for (const w of sides) { w.scale.y = h; w.position.y = -S / 2 + h / 2; }
    for (const e of edgesV) { e.scale.y = h; e.position.y = -S / 2 + h / 2; }
  }
  const volFrac = () => (lidY + S / 2) / S;

  // ───────────── 기체 분자 ─────────────
  const mols = [];
  let tempC = 25;
  const tempK = () => tempC + 273;
  const speedF = () => Math.sqrt(tempK() / 298);
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function addGas(kind, localPos, vel) {
    const g = shape(kind, box);
    const mean = BASE * Math.sqrt(28 / MASS[kind]), sig = mean / 1.596;
    const v = vel || V3(gauss() * sig, gauss() * sig, gauss() * sig);
    const m = { g, kind, v, s0: Math.max(0.05, V3(gauss() * sig, gauss() * sig, gauss() * sig).length()), w: V3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(1.6), held: null };
    g.position.copy(localPos || V3((Math.random() * 2 - 1) * 0.42, (Math.random() * 2 - 1) * 0.42, (Math.random() * 2 - 1) * 0.42));
    g.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const halo = H.glowSprite(A.types[kind] ? (kind === 'CO2' ? '#ffd27a' : A.types[kind].color) : '#ffffff', 0.15, 0); g.add(halo); m.halo = halo;
    H.addGrabbable(g, { radius: 0.075,
      onGrab: gr => { m.held = gr; halo.material.opacity = 0.8; onMolGrab(m); },
      onMove: (gr, p) => { m.g.position.copy(box.worldToLocal(p.clone())); },
      onRelease: (gr, vel) => { m.held = null; halo.material.opacity = 0; const lv = vel.clone(); if (lv.length() > 2.5) lv.setLength(2.5); m.v.copy(lv.lengthSq() > 1e-4 ? lv : m.v); hideLabelSoon(); } });
    H.addPickable(g, () => { onMolGrab(m); H.burst(g.getWorldPosition(V3()), '#ffffff', 16, 0.5, 0.6, 0.025); hideLabelSoon(); }, on => { halo.material.opacity = on ? 0.6 : (m.held ? 0.8 : 0); });
    mols.push(m); return m;
  }
  function stepGas(dt) {
    if (!box.visible) return;
    let hitsLid = 0; const sf = speedF();
    for (const m of mols) {
      if (m.held) { showLabel(m); continue; }
      const p = m.g.position, r = 0.02;
      // 빠르기는 그 온도의 빠르기로 천천히 돌아간다(분자끼리 부딪혀 고르게 되는 것을 흉내)
      const cur = m.v.length(), want = m.s0 * sf; if (cur > 1e-4) m.v.setLength(cur + (want - cur) * Math.min(1, dt * 1.2)); else m.v.set(gauss(), gauss(), gauss()).setLength(want);
      p.addScaledVector(m.v, dt);
      const lim = { x: S / 2 - r, z: S / 2 - r }, top = lidY - r, bot = -S / 2 + r;
      const outside = Math.abs(p.x) > S / 2 + 0.05 || Math.abs(p.z) > S / 2 + 0.05 || p.y > lidY + 0.05 || p.y < -S / 2 - 0.05;
      if (outside) { m.v.copy(p.clone().multiplyScalar(-1).setLength(0.8)); continue; }   // 밖에 놓으면 상자 안으로 돌아온다
      for (const ax of ['x', 'z']) { if (p[ax] > lim[ax]) { p[ax] = lim[ax]; m.v[ax] = -Math.abs(m.v[ax]); } else if (p[ax] < -lim[ax]) { p[ax] = -lim[ax]; m.v[ax] = Math.abs(m.v[ax]); } }
      if (p.y > top) { p.y = top; m.v.y = -Math.abs(m.v.y); hitsLid++; } else if (p.y < bot) { p.y = bot; m.v.y = Math.abs(m.v.y); }
      m.g.rotation.x += m.w.x * dt * sf; m.g.rotation.y += m.w.y * dt * sf;
    }
    lidFlash = Math.max(0, lidFlash - dt * 3) + hitsLid * 0.25;   // 뚜껑을 두드리는 만큼 반짝
    lidMat.emissiveIntensity = 0.15 + Math.min(0.9, lidFlash);
  }

  // 집은 분자 이름표
  const label = new Panel('molLabel', 420, 'rgba(33,31,46,0.88)'); label.pad = 16; H.scene.add(label.mesh);
  let labelFor = null, labelHideAt = 0;
  function showLabel(m) {
    if (labelFor !== m) {
      labelFor = m; label.clear(); const t = A.types[m.kind];
      label.text(NAME(m.kind), 34, '#ffffff', { bold: true, align: 'center', gap: 2 });
      if (t) label.text(t.pct, 24, '#c9c4d6', { align: 'center', gap: 0 });
      label.finish(); label.show(true);
    }
    const wp = m.g.getWorldPosition(V3()); wp.y += 0.11; H.face(label, wp); labelHideAt = 0;
  }
  function hideLabelSoon() { labelHideAt = H.now + 1.6; }
  H.onUpdate(() => { if (labelHideAt && H.now > labelHideAt) { label.show(false); labelFor = null; labelHideAt = 0; } else if (labelFor && !labelFor.held && labelHideAt) { const wp = labelFor.g.getWorldPosition(V3()); wp.y += 0.11; H.face(label, wp); } });

  // ───────────── 압력계(왼쪽) ─────────────
  let gauge, gaugeKey = '';
  function pressure() { return (mols.length / N0) * (tempK() / 298) / volFrac(); }
  function drawGauge(force) {
    const p = pressure(), key = [p.toFixed(1), tempC, Math.round(volFrac() * 100), mols.length].join('|');
    if (!force && key === gaugeKey) return; gaugeKey = key;
    const G = A.gauge, g = gauge; g.clear(); g.pad = 28;
    if (task) { g.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 2 }); g.text(task + (taskExtra ? '  ' + taskExtra : ''), 28, '#ffffff', { gap: 14 }); g.bar('rgba(255,255,255,0.18)', 2, 12); }
    g.text(G.title, 30, '#c9c4d6', { bold: true, gap: 4 });
    g.row([{ t: G.p.replace('{p}', p.toFixed(1)), size: 46, color: p > 1.6 ? '#ff8a7a' : '#ffd27a', bold: true }], 8);
    g.meter(p / 6, p > 1.6 ? '#ff8a7a' : '#ffd27a', 24, 16);
    g.text(G.t.replace('{t}', tempC) + '   ' + G.v.replace('{v}', Math.round(volFrac() * 100)), 28, '#e7e3f2', { gap: 6 });
    g.text(G.n.replace('{n}', mols.length) + '   ' + G.speed.replace('{s}', Math.round(475 * speedF())), 24, '#c9c4d6', { gap: 0 });
    g.finish(); g.pin();
  }
  function buildGauge() {
    gauge = new Panel('gauge', 560, 'rgba(33,31,46,0.88)'); drawGauge(true); gauge.mesh.visible = false;
    gauge.mesh.position.copy(BOARD); H.world.add(gauge.mesh);
    gauge.mesh.lookAt(V3(POS.start[0], 1.55, POS.start[1] + 0.3));
  }

  // ───────────── 온도계 손잡이(오른쪽, 위 = 뜨겁게) ─────────────
  const TH = { x: C.x - 0.66, z: C.z + 0.45, y0: 0.9, y1: 1.6 };   // 상자 앞 왼쪽
  let thKnob, thFill, thFillMat, thLabel;
  function buildThermo() {
    const g = new THREE.Group(); H.world.add(g); g.visible = false; thKnob = g;
    const track = mesh(new THREE.CylinderGeometry(0.018, 0.018, TH.y1 - TH.y0, 16), std('#ffffff', 0.3, { transparent: true, opacity: 0.5 }), g, [TH.x, (TH.y0 + TH.y1) / 2, TH.z]); track.castShadow = false;
    thFillMat = std('#e8423f', 0.4, { emissive: new THREE.Color('#e8423f'), emissiveIntensity: 0.4 });
    thFill = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 12), thFillMat, g, [TH.x, TH.y0, TH.z]); thFill.castShadow = false;
    mesh(geo.sphere, thFillMat, g, [TH.x, TH.y0 - 0.03, TH.z], 0.06).castShadow = false;
    const knob = mesh(geo.sphere, std('#ffffff', 0.3, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.3 }), g, [TH.x, TH.y0, TH.z], 0.075);
    g.userData.knob = knob;
    thLabel = new Panel('thLabel', 300, 'rgba(33,31,46,0.85)', 0.0008); thLabel.pad = 12; g.add(thLabel.mesh);
    H.addGrabbable(knob, { radius: 0.09, onMove: (gr, p) => { const lp = H.world.worldToLocal(p.clone()); setTemp((lp.y - TH.y0) / (TH.y1 - TH.y0)); } });
    thLabel.mesh.onBeforeRender = () => thLabel.mesh.lookAt(H.headPos());
    H.addPickable(knob, () => { const seq = [-100, 25, 500]; const i = seq.indexOf(tempC); setTempC(seq[(i + 1) % 3]); }, on => knob.scale.setScalar(on ? 0.09 : 0.075));
    setTempC(25);
  }
  function setTemp(f) { f = Math.max(0, Math.min(1, f)); setTempC(Math.round((A.tempRange[0] + f * (A.tempRange[1] - A.tempRange[0])) / 5) * 5); }
  function setTempC(c) {
    tempC = c; const f = (c - A.tempRange[0]) / (A.tempRange[1] - A.tempRange[0]), y = TH.y0 + f * (TH.y1 - TH.y0);
    thKnob.userData.knob.position.y = y;
    thFill.scale.y = Math.max(0.001, y - TH.y0); thFill.position.y = TH.y0 + (y - TH.y0) / 2;
    const col = new THREE.Color('#3f8ce8').lerp(new THREE.Color('#e8423f'), f); thFillMat.color.copy(col); thFillMat.emissive.copy(col);
    thLabel.clear(); thLabel.text(c + '°C', 44, '#ffffff', { bold: true, align: 'center', gap: 0 }); thLabel.finish(); thLabel.pin();
    thLabel.mesh.position.set(TH.x, y + 0.1, TH.z);
  }

  // ───────────── 분자 만들기 쟁반(오른쪽 더 멀리) ─────────────
  const TRAY = V3(C.x + 0.78, 1.02, C.z + 0.42);   // 상자 앞 오른쪽
  const parts = [];
  let tray;
  function buildTray() {
    tray = new THREE.Group(); tray.position.copy(TRAY); tray.visible = false; H.world.add(tray);
    mesh(geo.box, std('#ffffff', 0.4, { transparent: true, opacity: 0.55 }), tray, [0, -0.03, 0], [0.5, 0.012, 0.32]).castShadow = false;
    const t = new Panel('trayLabel', 520, 'rgba(33,31,46,0.8)', 0.0008); t.pad = 14; t.text('분자 만들기 쟁반', 36, '#ffffff', { bold: true, align: 'center', gap: 0 }); t.finish(); t.pin();
    t.mesh.position.set(0, -0.09, 0.17); tray.add(t.mesh);
    for (const [k, x, z] of [['O', -0.16, -0.07], ['O', -0.05, -0.07], ['C', 0.08, -0.07], ['N', -0.1, 0.07], ['N', 0.04, 0.07]]) addPart(k, V3(x, 0.02, z));
  }
  function addPart(kind, local) {
    const g = shape(kind, tray); g.position.copy(local);
    const part = { g, kind, home: local.clone() };
    H.addGrabbable(g, { radius: 0.06,
      onGrab: () => { showPartLabel(part); },
      onMove: (gr, p) => { g.position.copy(tray.worldToLocal(p.clone())); tryCombine(part); },
      onRelease: () => { if (!part.dead) placePart(part); } });
    H.addPickable(g, () => clickPart(part), on => g.scale.setScalar(on ? 1.3 : 1));
    parts.push(part); return part;
  }
  const RULES = [['O', 'O', 'O2'], ['N', 'N', 'N2'], ['C', 'O2', 'CO2']];
  function rule(a, b) { for (const [x, y, z] of RULES) if ((a === x && b === y) || (a === y && b === x)) return z; return null; }
  let lastNoMatch = 0;
  function tryCombine(part) {
    const wp = part.g.getWorldPosition(V3());
    for (const o of parts) {
      if (o === part || o.dead) continue;
      if (o.g.getWorldPosition(V3()).distanceTo(wp) > 0.06) continue;
      const r = rule(part.kind, o.kind);
      if (!r) { if (H.now - lastNoMatch > 2) { lastNoMatch = H.now; showToast(A.m5.noMatch, 1.6); } continue; }
      combine(part, o, r); return true;
    }
    return false;
  }
  function combine(a, b, kind) {
    const mid = a.g.position.clone().add(b.g.position).multiplyScalar(0.5);
    for (const p of [a, b]) { p.dead = true; for (const gr of H.grabbers) if (gr.held === p.g) gr.held = null; H.removeGrabbable(p.g); H.removePickable(p.g); tray.remove(p.g); }
    const n = addPart(kind, mid); H.burst(n.g.getWorldPosition(V3()), kind === 'CO2' ? '#ffd27a' : A.types[kind].color, 60, 1.0, 1.0, 0.03); H.sfx('piece');
    madeKinds.add(kind); showPartLabel(n);
    log('made', kind);
  }
  function placePart(part) {
    // 상자 안에 놓으면 기체가 된다(이산화탄소·산소·질소 분자만)
    const wp = part.g.getWorldPosition(V3()), lp = box.worldToLocal(wp.clone());
    const inBox = box.visible && Math.abs(lp.x) < S / 2 && Math.abs(lp.z) < S / 2 && lp.y < lidY && lp.y > -S / 2;
    if (inBox && MASS[part.kind]) {
      part.dead = true; H.removeGrabbable(part.g); H.removePickable(part.g); tray.remove(part.g);
      addGas(part.kind, lp); putInKinds.add(part.kind); H.sfx('complete'); H.burst(wp, '#bfe6ff', 40, 0.8, 0.9, 0.03);
      log('into box', part.kind); return;
    }
    if (wp.distanceTo(tray.getWorldPosition(V3())) > 0.35) H.tween(0.4, k => part.g.position.lerp(part.home, k));   // 멀리 놓으면 쟁반으로 돌아온다
  }
  let picked = null;
  function clickPart(part) {   // 화면 모드: 두 개를 차례로 누르면 붙고, 분자를 누른 뒤 상자를 누르면 넣는다
    if (part.dead) return;
    if (picked && picked !== part && !picked.dead) { const r = rule(picked.kind, part.kind); const a = picked; picked = null; if (r) combine(a, part, r); else showToast(A.m5.noMatch, 1.6); return; }
    picked = part; showPartLabel(part);
  }
  function showPartLabel(part) { const t = new THREE.Vector3(); part.g.getWorldPosition(t); label.clear(); label.text(NAME(part.kind), 32, '#ffffff', { bold: true, align: 'center', gap: 0 }); label.finish(); t.y += 0.1; H.face(label, t); label.show(true); labelFor = null; hideLabelSoon(); }
  const madeKinds = new Set(), putInKinds = new Set();

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
  let grabbedAny = null, o2Got = new Set();
  function onMolGrab(m) { showLabel(m); if (!m.held) hideLabelSoon(); if (!grabbedAny) grabbedAny = m; if (m.kind === 'O2') o2Got.add(m); else if (curMission === 1) showToast(A.m2.wrong.replace('{name}', A.types[m.kind].name), 1.8); }
  let curMission = -1;
  // 미션 안내판(작게, 압력계 위)
  let task = '', taskExtra = '';
  function missionInfo(text, extra) { task = text || ''; taskExtra = extra || ''; if (gauge) drawGauge(true); }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#7a6ad0', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 76, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 30 });
    p.button(A.start, null, '#7f8fd6', null, 110);
    if (!H.inXR()) {   // 화면 모드: 화면 비율에 맞춰 상자(+온도계·쟁반)가 다 보이는 거리에 선다
      const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * H.camera.aspect);
      const dist = Math.max(1.6, Math.min(4.2, 1.15 / Math.tan(hf)));
      H.place(P([0, C.z + 0.45 + dist]), V3(0, 1.35, 0));
    }
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat');
    await waitPick(p, 0, 1.0); p.show(false);
    H.audio.music('day'); await wait(0.4);
  }
  async function showBox() {
    log('state box');
    box.visible = true; H.sfx('appear'); H.burst(box.getWorldPosition(V3()), '#bfe6ff', 120, 2.0, 1.3, 0.035);
    await H.tween(1.4, k => box.scale.setScalar(Math.max(0.001, H.ease(k))));
    if (H.useHud()) H.hud(gauge, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.6 : 0.36);   // 화면 모드: 왼쪽 위 계기판
    gauge.mesh.visible = true; drawWrist();
  }
  async function m1() {
    curMission = 0; log('state m1');
    await riniSay(A.m1.ask, null, '해 볼게'); missionInfo(A.m1.ask);
    if (H.AUTOTEST) wait(1).then(() => onMolGrab(mols[0]));
    await until(() => grabbedAny); await wait(1.2);
    missionInfo(''); finish(0); showToast(A.m1.done, 3);
  }
  async function m2() {
    curMission = 1; log('state m2'); o2Got.clear();
    await riniSay(A.m2.ask, null, '찾아볼게');
    let last = -1;
    if (H.AUTOTEST) (async () => { for (const m of mols.filter(x => x.kind === 'O2').slice(0, 3)) { await wait(0.6); onMolGrab(m); } })();
    await until(() => { const n = Math.min(3, o2Got.size); if (n !== last) { last = n; missionInfo(A.m2.ask, A.m2.counter + ' ' + n + ' / 3'); if (n > 0) H.sfx('piece'); } return n >= 3; });
    await wait(0.6); missionInfo(''); finish(1);
    await riniSay(A.m2.done);
  }
  async function m3() {
    curMission = 2; log('state m3');
    await riniSay(A.m3.ask, null, '눌러 볼게'); missionInfo(A.m3.ask);
    if (H.AUTOTEST) wait(1).then(() => H.tween(1.5, k => setLid(S / 2 - k * 0.5)));
    await until(() => volFrac() <= 0.55); await wait(1.5);
    missionInfo(''); finish(2);
    await riniSay(A.m3.done);
    await H.tween(0.8, k => setLid(lidY + (S / 2 - lidY) * k));   // 다음 실험을 위해 뚜껑을 다시 올린다
  }
  async function m4() {
    curMission = 3; log('state m4');
    thKnob.visible = true; H.burst(H.world.localToWorld(V3(TH.x, (TH.y0 + TH.y1) / 2, TH.z)), '#ffffff', 40, 1, 1, 0.03);
    await riniSay(A.m4.ask, null, '해 볼게'); missionInfo(A.m4.ask);
    if (H.AUTOTEST) wait(1).then(() => setTempC(500));
    await until(() => tempC >= 300 || tempC <= -60); await wait(2.0);
    missionInfo(''); finish(3);
    await riniSay(A.m4.done);
    setTempC(25);
  }
  async function m5() {
    curMission = 4; log('state m5');
    tray.visible = true; H.burst(tray.getWorldPosition(V3()), '#ffffff', 50, 1, 1, 0.03);
    await riniSay(A.m5.ask, null, '만들어 볼게'); missionInfo(A.m5.ask);
    if (H.AUTOTEST) (async () => { await wait(1); const os = parts.filter(p => p.kind === 'O'); combine(os[0], os[1], 'O2'); await wait(1); const o2 = parts.find(p => p.kind === 'O2' && !p.dead), c = parts.find(p => p.kind === 'C'); combine(o2, c, 'CO2'); })();
    await until(() => madeKinds.has('O2')); missionInfo(A.m5.madeO2);
    await until(() => madeKinds.has('CO2')); missionInfo(A.m5.madeCO2 + ' ' + A.m5.putIn);
    // 화면 모드: 이산화탄소를 누르면 상자로 들어간다
    const co2 = () => parts.find(p => p.kind === 'CO2' && !p.dead);
    if (co2()) { const pc = co2(); pc.g.userData.pick.onPick = () => { pc.g.position.copy(tray.worldToLocal(H.world.localToWorld(C.clone()))); placePart(pc); }; }
    if (H.AUTOTEST) wait(1.2).then(() => { const pc = co2(); if (pc) { pc.g.position.copy(tray.worldToLocal(H.world.localToWorld(C.clone()))); placePart(pc); } });
    await until(() => putInKinds.has('CO2'));
    missionInfo(''); finish(4);
    await riniSay(A.m5.inBox);
  }
  async function ending() {
    log('state ending');
    await lines(A.ending.rini);
    const E = A.ending;
    for (;;) {
      const p = ui.card; p.clear(); p.pad = 46;
      p.text(E.cardKicker, 28, '#7a6ad0', { bold: true, align: 'center', gap: 6 });
      p.text(E.cardTitle, 56, INK, { bold: true, align: 'center', gap: 18 });
      E.rows.forEach(r => p.row([{ t: '✔', size: 30, color: '#5cc3b4', bold: true }, { t: r, size: 30, color: INK }], 10));
      p.space(16);
      p.button(E.free, null, '#7f8fd6', null, 88); p.button(E.restart, null, '#ece5d8', null, 80); p.button(E.exit, null, '#3b3550', null, 80);
      p.finish(); H.placeAhead(p, 1.0, -0.45, -0.25); p.show(true);
      log('state card');
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { showToast('자유롭게 실험해 보세요. 왼손을 들면 미션 목록이 보여요.', 3); await until(() => false); }   // 더 놀기: 그대로 둔다
      const s = H.renderer.xr.getSession(); if (s && i === 2) { s.end(); return; }
      location.reload(); return;
    }
  }
  async function main() {
    if (H.handheld && rini) rini.root.position.y = C.y - S / 2;
    await intro(); await lines(A.hello); await showBox();
    await m1(); await m2(); await m3(); await m4(); await m5(); await ending();
  }

  // ───────────── 짓기·시작 ─────────────
  buildSpace(); buildBox(); buildGauge(); buildThermo(); buildTray();
  for (const [k, n] of Object.entries(COUNTS)) for (let i = 0; i < n; i++) addGas(k);
  H.onUpdate(dt => { stepGas(dt); if (box.visible) drawGauge(false); });
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  const ready = H.loadChar({ url: '../world1/assets/rini-glb.wasm', height: 1.2, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', walk: 'walk', wave: 'wave2' }, trim: { wave: [1.4, 5.0] }, glow: 0.25 }).then(c => { rini = c; });
  // 휴대폰 혼합현실: 톡 누른 바닥·책상에 상자 밑면이 놓이게(anchor), 리니도 같은 면 위에 선다
  H.start({ main, ready, start: { pos: POS.start, look: [C.x, C.z] }, anchor: V3(C.x, C.y - S / 2, C.z) });
  window.AIRX = { mols, setLid, setTempC, parts, pressure };
})();
