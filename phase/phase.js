/* 「물의 상태 변화 실험실」(가칭) v0.1 — 내 방(혼합현실)에서 손으로 물 분자를 만지며 얼음·물·수증기를 배우는 앱 (2026-10-18, 공용 엔진 core.js)
   1m 상자 = 실제 약 2.3nm(약 4억 배), 물 분자 72개(실제보다 적게). 얼음 = 육각 얼음 격자 3층(층마다 24개).
   손 실험: ① 물 분자 집기 ② 손잡이로 얼음 녹이기(0°C에서 멈춤) ③ 물 끓이기(100°C에서 멈춤) ④ 차가운 판을 벽에 대어 응결 ⑤ 얼음 조각을 물컵에 띄우기
   온도 모형: 손잡이 = 히터 설정 온도. 실제 온도가 따라가다가 0°C·100°C에서는 상태가 다 바뀔 때까지 멈춘다(열이 상태 바꾸기에 쓰임).
   분자 움직임: 얼음 = 격자 자리에서 떨림, 물 = 서로 당기며 뭉친 채 미끄러짐, 수증기 = 벽에 튕기며 빠르게 날아감.
   화면 모드(헤드셋 없음)에서는 눌러서 같은 실험을 해 볼 수 있다.                                                          */
(function () {
  'use strict';
  const H = window.HW, A = window.PHASE;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[PHASE]', ...a);

  const POS = { start: [0, 0.95], rini: [-2.0, -1.0] };   /* 리니는 차가운 판에 가리지 않게 왼쪽 뒤 */
  const TALK = V3(-0.6, 2.1, -0.02), BOARD = V3(0.62, 2.07, -0.06);   /* 상자 위 전광판: 왼쪽 = 리니 말, 오른쪽 = 할 일·계기판 */
  const S = 1.0, C = V3(0, 1.25, 0);                 /* 상자 크기·가운데(바닥 0.75, 뚜껑 1.75) */
  const HALF = S / 2, R_MOL = 0.04, D0 = 0.115;       /* 분자 반지름(벽 충돌)·분자끼리 가까이 갈 수 있는 거리 */
  const LM = 80, LB = 160;                            /* 녹이기·끓이기에 드는 열(°C 단위로 줄인 값, content.js 머리말) */
  H.bounds.r = 5.5;
  H.setSky('#6f9fd8', '#e3eefa', '#f1f0ec');
  H.hemi.intensity = 0.85; H.sun.intensity = 1.1; H.sun.position.set(3, 10, 6);

  /* ───────────── 실험 공간(VR에서만) ───────────── */
  function buildSpace() {
    const v = H.vrOnly;
    mesh(new THREE.CircleGeometry(8, 96), std('#e8edf2', 0.9), v, [0, 0, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const lm = new THREE.MeshBasicMaterial({ color: '#b4c8dc', transparent: true, opacity: 0.45 });
    for (let i = 1; i <= 7; i++) mesh(new THREE.RingGeometry(i - 0.01, i + 0.01, 128), lm, v, [0, 0.003, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
  }

  /* ───────────── 물 분자 모양(산소 빨강 1 + 수소 하양 2, 104.5°) ───────────── */
  const BOND = 0.041, HALF_ANG = THREE.MathUtils.degToRad(104.5 / 2);
  const oMat = std('#d42a26', 0.4, { emissive: new THREE.Color('#d42a26'), emissiveIntensity: 0.08 });
  const hMat = std('#ffffff', 0.35, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.15 });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function waterShape(parent) {
    const g = new THREE.Group(); parent.add(g);
    const o = mesh(geo.sphere, oMat, g, [0, 0, 0], 0.07); o.castShadow = false; o.receiveShadow = false;
    for (const s of [1, -1]) { const h = mesh(geo.lowSphere, hMat, g, [s * BOND * Math.sin(HALF_ANG), BOND * Math.cos(HALF_ANG), 0], 0.044); h.castShadow = false; h.receiveShadow = false; }
    const hit = new THREE.Mesh(geo.lowSphere, hitMat); hit.scale.setScalar(0.12); g.add(hit);   /* 화면 모드에서 누르기 쉽게 */
    return g;
  }

  /* ───────────── 육각 얼음 격자(Ih): 층 안은 벌집, 층 사이는 위아래로 곧게 이어짐 ───────────── */
  const AH = 0.113, PUCK = 0.04, LAYER = 0.16, PER_LAYER = 24, LAYERS = 3, N = PER_LAYER * LAYERS;
  const sites = [];
  function buildSites() {
    const cand = [], key = p => Math.round(p.x * 1000) + ',' + Math.round(p.z * 1000), seen = new Set();
    const s3 = Math.sqrt(3) * AH;
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const cx = s3 * (i + j / 2), cz = s3 * (Math.sqrt(3) / 2) * j;
      for (let k = 0; k < 6; k++) {
        const a = THREE.MathUtils.degToRad(30 + 60 * k), p = { x: cx + AH * Math.cos(a), z: cz + AH * Math.sin(a), sub: k % 2 };
        const kk = key(p); if (seen.has(kk)) continue; seen.add(kk); cand.push(p);
      }
    }
    cand.sort((a, b) => (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z));
    const layer = cand.slice(0, PER_LAYER), y0 = -HALF + 0.07;
    for (let l = 0; l < LAYERS; l++) for (const p of layer) {
      const up = (l % 2 === 0) ? p.sub === 1 : p.sub === 0;
      sites.push({ pos: V3(p.x, y0 + LAYER * l + (up ? PUCK : 0), p.z), occ: null, q: new THREE.Quaternion() });
    }
    /* 수소 2개는 이웃 산소 쪽을 향하게(수소 결합 방향) */
    for (const s of sites) {
      const nb = sites.filter(o => o !== s && o.pos.distanceTo(s.pos) < 0.125).map(o => o.pos.clone().sub(s.pos).normalize());
      while (nb.length < 2) nb.push(V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize());
      const i = Math.floor(Math.random() * nb.length); let j = Math.floor(Math.random() * (nb.length - 1)); if (j >= i) j++;
      const b = nb[i].clone().add(nb[j]).normalize(), n = V3().crossVectors(nb[i], nb[j]).normalize(), x = V3().crossVectors(b, n).normalize();
      s.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, b, n));
      s.key = (s.pos.y + HALF) * 10 + Math.hypot(s.pos.x, s.pos.z);
    }
  }

  /* ───────────── 상자 + 히터 ───────────── */
  let box, heatMat;
  function buildBox() {
    box = new THREE.Group(); box.position.copy(C); H.world.add(box);
    const glassM = new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    const edgeM = new THREE.MeshBasicMaterial({ color: '#7fd3ff' });
    mesh(geo.plane, glassM, box, [0, -HALF, 0], [S, S, 1], [-Math.PI / 2, 0, 0]).castShadow = false;
    mesh(geo.plane, glassM, box, [0, HALF, 0], [S, S, 1], [-Math.PI / 2, 0, 0]).castShadow = false;
    for (const [x, z, ry] of [[0, HALF, 0], [0, -HALF, 0], [HALF, 0, Math.PI / 2], [-HALF, 0, Math.PI / 2]]) { const w = mesh(geo.plane, glassM, box, [x, 0, z], [S, S, 1], [0, ry, 0]); w.castShadow = false; w.renderOrder = 5; }
    const edge = (x, y, z, sx, sy, sz) => { mesh(geo.box, edgeM, box, [x, y, z], [sx, sy, sz]).castShadow = false; };
    for (const y of [-HALF, HALF]) {
      for (const x of [HALF, -HALF]) edge(x, y, 0, 0.012, 0.012, S);
      for (const z of [HALF, -HALF]) edge(0, y, z, S, 0.012, 0.012);
    }
    for (const [x, z] of [[HALF, HALF], [HALF, -HALF], [-HALF, HALF], [-HALF, -HALF]]) edge(x, 0, z, 0.012, S, 0.012);
    heatMat = std('#8a8f99', 0.5, { emissive: new THREE.Color('#000000'), emissiveIntensity: 1 });
    mesh(geo.box, heatMat, box, [0, -HALF - 0.012, 0], [S * 0.96, 0.018, S * 0.96]).castShadow = false;
    const lab = new Panel('boxLabel', 760, 'rgba(33,31,46,0.8)'); lab.pad = 20;
    lab.text(A.boxLabel, 40, '#ffffff', { bold: true, align: 'center', gap: 4 }); lab.text(A.boxNote, 26, '#bfe6ff', { align: 'center', gap: 0 }); lab.finish(); lab.pin();
    lab.mesh.position.set(0, HALF + 0.08, HALF + 0.02); lab.mesh.scale.multiplyScalar(0.62); box.add(lab.mesh);
    box.scale.setScalar(0.001); box.visible = false;
  }

  /* ───────────── 물 분자들 ───────────── */
  const mols = [];
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const g3 = () => V3(gauss(), gauss(), gauss());
  function addMol(i) {
    const g = waterShape(box), s = sites[i];
    const m = { g, st: 'ice', site: s, v: V3(), w: g3().multiplyScalar(1.2), ph: g3().multiplyScalar(3), held: null, spot: null };
    s.occ = m; g.position.copy(s.pos); g.quaternion.copy(s.q);
    const halo = H.glowSprite('#ffffff', 0.16, 0); g.add(halo); m.halo = halo;
    H.addGrabbable(g, { radius: 0.075,
      onGrab: gr => { m.held = gr; halo.material.opacity = 0.8; onMolPick(m); },
      onMove: (gr, p) => { m.g.position.copy(box.worldToLocal(p.clone())); },
      onRelease: (gr, vel) => { m.held = null; halo.material.opacity = 0; if (m.st === 'gas') { const lv = vel.clone(); if (lv.length() > 2) lv.setLength(2); m.v.copy(lv); } else m.v.set(0, 0, 0); hideLabelSoon(); } });
    H.addPickable(g, () => { onMolPick(m); H.burst(g.getWorldPosition(V3()), '#ffffff', 16, 0.5, 0.6, 0.025); hideLabelSoon(); }, on => { halo.material.opacity = on ? 0.6 : (m.held ? 0.8 : 0); });
    mols.push(m); return m;
  }

  /* ───────────── 온도(히터 설정을 따라가다 0°C·100°C에서 멈춤) ───────────── */
  let T = -20, Tset = -20, fMelt = 0, fBoil = 0, tMax = 120, rate = H.AUTOTEST ? 40 : 20, heatDir = 0;   /* 시험 때만 두 배 빠르게 */
  function heat(q) {
    for (let n = 0; n < 8 && q > 1e-6; n++) {
      if (T === 0 && fMelt < 1) { if (Tset <= 0) return; const d = Math.min(1 - fMelt, q / LM); fMelt = d >= 1 - fMelt - 1e-9 ? 1 : fMelt + d; q -= d * LM; continue; }
      if (T === 100 && fBoil < 1) { if (Tset <= 100) return; const d = Math.min(1 - fBoil, q / LB); fBoil = d >= 1 - fBoil - 1e-9 ? 1 : fBoil + d; q -= d * LB; continue; }
      const next = T < 0 ? 0 : T < 100 ? 100 : Infinity, dT = Math.min(q, next - T, Tset - T);
      if (dT <= 0) return;
      T = (T + dT >= next - 1e-9) ? next : T + dT; q -= dT;
    }
  }
  function cool(q) {
    for (let n = 0; n < 8 && q > 1e-6; n++) {
      if (T === 100 && fBoil > 0) { if (Tset >= 100) return; const d = Math.min(fBoil, q / LB); fBoil = d >= fBoil - 1e-9 ? 0 : fBoil - d; q -= d * LB; continue; }
      if (T === 0 && fMelt > 0) { if (Tset >= 0) return; const d = Math.min(fMelt, q / LM); fMelt = d >= fMelt - 1e-9 ? 0 : fMelt - d; q -= d * LM; continue; }
      const next = T > 100 ? 100 : T > 0 ? 0 : -Infinity, dT = Math.min(q, T - next, T - Tset);
      if (dT <= 0) return;
      T = (T - dT <= next + 1e-9) ? next : T - dT; q -= dT;
    }
  }
  function stepTemp(dt) {
    const T0 = T, f0 = fMelt + fBoil;
    if (Tset > T || (Tset > T - 1e-9 && ((T === 0 && fMelt < 1 && Tset > 0) || (T === 100 && fBoil < 1 && Tset > 100)))) heat(rate * dt);
    else if (Tset < T || (T === 0 && fMelt > 0 && Tset < 0) || (T === 100 && fBoil > 0 && Tset < 100)) cool(rate * dt);
    heatDir = (T > T0 || fMelt + fBoil > f0) ? 1 : (T < T0 || fMelt + fBoil < f0) ? -1 : 0;
  }
  const TK = () => T + 273.15;
  function phaseKey() {
    if (T === 0 && fMelt > 0 && fMelt < 1) return heatDir < 0 ? 'freezing' : 'melting';
    if (T === 100 && fBoil > 0 && fBoil < 1) return heatDir < 0 ? 'condensing' : 'boiling';
    if (fBoil >= 1) return 'gas';
    if (fMelt <= 0) return 'solid';
    return 'liquid';
  }

  /* 상태 맞추기: 녹은 비율·끓은 비율만큼 분자의 상태를 하나씩 바꾼다 */
  function reconcile() {
    const av = mols.filter(m => m.st !== 'drop'), n = av.length;
    const wantGas = Math.round(fBoil * n), wantIce = n - Math.round(fMelt * n);
    const ice = av.filter(m => m.st === 'ice'), gas = av.filter(m => m.st === 'gas'), liq = av.filter(m => m.st === 'liq');
    if (ice.length > wantIce) { const m = ice.filter(x => !x.held).sort((a, b) => b.site.key - a.site.key)[0]; if (m) { m.site.occ = null; m.site = null; m.st = 'liq'; m.v.copy(g3().multiplyScalar(0.05)); } }
    else if (ice.length < wantIce && liq.length) {
      const s = sites.filter(x => !x.occ).sort((a, b) => a.key - b.key)[0];
      if (s) { let best = null, bd = Infinity; for (const m of liq) { if (m.held) continue; const d = m.g.position.distanceTo(s.pos); if (d < bd) { bd = d; best = m; } } if (best) { best.st = 'ice'; best.site = s; s.occ = best; } }
    }
    if (gas.length < wantGas && liq.length) { const m = liq.filter(x => !x.held).sort((a, b) => b.g.position.y - a.g.position.y)[0]; if (m) { m.st = 'gas'; m.v.set(gauss() * 0.3, 1, gauss() * 0.3).setLength(gasSpeed()); } }
    else if (gas.length > wantGas) {
      const c = centroid(); let best = null, bd = Infinity; for (const m of gas) { if (m.held) continue; const d = m.g.position.distanceTo(c); if (d < bd) { bd = d; best = m; } }
      if (best) { best.st = 'liq'; best.v.multiplyScalar(0.15); }
    }
  }
  const gasSpeed = () => 0.6 * Math.sqrt(TK() / 373);
  const cen = V3();
  function centroid() {
    cen.set(0, 0, 0); let k = 0;
    for (const m of mols) if (m.st === 'ice' || m.st === 'liq') { cen.add(m.g.position); k++; }
    if (!k) cen.set(0, -HALF + 0.2, 0); else cen.divideScalar(k);
    return cen;
  }

  /* ───────────── 움직임 ───────────── */
  const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = V3();
  function stepMols(dt) {
    if (!box.visible) return;
    dt = Math.min(dt, 0.05);
    const tk = TK(), vib = 0.004 + 0.012 * Math.max(0, (tk - 250) / 25), now = H.now;
    const c = centroid().clone(), nCond = mols.filter(m => m.st === 'liq' || m.st === 'ice').length, Rb = 0.075 * Math.cbrt(Math.max(1, nCond));
    const noise = 0.32 * Math.sqrt(tk / 300), vg = gasSpeed();
    for (const m of mols) {
      if (m.held) { showLabel(m); continue; }
      const p = m.g.position;
      if (m.st === 'ice') {
        tmpV.set(Math.sin(now * 23 + m.ph.x), Math.sin(now * 19 + m.ph.y), Math.sin(now * 29 + m.ph.z)).multiplyScalar(vib);
        p.lerp(tmpV.add(m.site.pos), Math.min(1, dt * 6));
        tmpE.set(Math.sin(now * 17 + m.ph.y) * vib * 4, Math.sin(now * 13 + m.ph.z) * vib * 4, 0); tmpQ.setFromEuler(tmpE).premultiply(m.site.q);
        m.g.quaternion.slerp(tmpQ, Math.min(1, dt * 5)); m.v.set(0, 0, 0); continue;
      }
      if (m.st === 'drop') { tmpV.set(Math.sin(now * 7 + m.ph.x), Math.sin(now * 6 + m.ph.y), Math.sin(now * 8 + m.ph.z)).multiplyScalar(0.006); p.lerp(tmpV.add(m.spot), Math.min(1, dt * 4)); continue; }
      if (m.st === 'liq') {
        m.v.addScaledVector(g3(), noise * Math.sqrt(dt) * 1.4);
        m.v.y -= 0.6 * dt;
        tmpV.copy(c).sub(p); const d = tmpV.length(); if (d > Rb * 0.7) m.v.addScaledVector(tmpV, 7 * dt * (d - Rb * 0.7) / d * 3);
        m.v.multiplyScalar(Math.exp(-2.2 * dt));
        m.g.rotation.x += m.w.x * dt * 0.8; m.g.rotation.y += m.w.y * dt * 0.8;
      } else {
        const cur = m.v.length(); if (cur > 1e-4) m.v.setLength(cur + (vg - cur) * Math.min(1, dt * 1.5)); else m.v.copy(g3()).setLength(vg);
        m.g.rotation.x += m.w.x * dt * 3; m.g.rotation.y += m.w.y * dt * 3;
      }
      p.addScaledVector(m.v, dt);
      const lim = HALF - R_MOL;
      const outside = Math.abs(p.x) > HALF + 0.05 || Math.abs(p.z) > HALF + 0.05 || Math.abs(p.y) > HALF + 0.05;
      if (outside) { m.v.copy(p.clone().multiplyScalar(-1).setLength(0.8)); continue; }   /* 밖에 놓으면 상자 안으로 돌아온다 */
      for (const ax of ['x', 'y', 'z']) { if (p[ax] > lim) { p[ax] = lim; m.v[ax] = -Math.abs(m.v[ax]) * (m.st === 'gas' ? 1 : 0.3); } else if (p[ax] < -lim) { p[ax] = -lim; m.v[ax] = Math.abs(m.v[ax]) * (m.st === 'gas' ? 1 : 0.3); } }
      if (m.st === 'gas' && plateOn) capture(m);
    }
    /* 서로 겹치지 않게(얼음·물방울은 그 자리 그대로, 물·수증기만 밀린다) */
    for (let i = 0; i < mols.length; i++) {
      const a = mols[i]; const wa = a.held || a.st === 'ice' || a.st === 'drop' ? 0 : 1;
      for (let j = i + 1; j < mols.length; j++) {
        const b = mols[j]; const wb = b.held || b.st === 'ice' || b.st === 'drop' ? 0 : 1;
        if (!wa && !wb) continue;
        tmpV.copy(b.g.position).sub(a.g.position); const d2 = tmpV.lengthSq(); if (d2 >= D0 * D0 || d2 < 1e-10) continue;
        const d = Math.sqrt(d2), push = (D0 - d) / (wa + wb); tmpV.divideScalar(d);
        if (wa) a.g.position.addScaledVector(tmpV, -push * wa);
        if (wb) b.g.position.addScaledVector(tmpV, push * wb);
        for (const [m, s] of [[a, -1], [b, 1]]) { if (m.held || (m.st !== 'gas' && m.st !== 'liq')) continue; const vn = m.v.dot(tmpV) * s; if (vn < 0) m.v.addScaledVector(tmpV, -vn * s * (m.st === 'gas' ? 2 : 1)); }
      }
    }
  }

  /* 집은 분자 이름표 */
  const label = new Panel('molLabel', 440, 'rgba(33,31,46,0.88)'); label.pad = 16; H.scene.add(label.mesh);
  let labelFor = null, labelHideAt = 0;
  function showLabel(m) {
    if (labelFor !== m) {
      labelFor = m; label.clear();
      label.text(A.mol.name, 34, '#ffffff', { bold: true, align: 'center', gap: 2 });
      label.text(A.mol.parts, 24, '#ffb3ad', { align: 'center', gap: 0 });
      label.text(A.mol.bend, 24, '#c9c4d6', { align: 'center', gap: 0 });
      label.finish(); label.show(true);
    }
    const wp = m.g.getWorldPosition(V3()); wp.y += 0.13; H.face(label, wp); labelHideAt = 0;
  }
  function hideLabelSoon() { labelHideAt = H.now + 2.4; }
  H.onUpdate(() => { if (labelHideAt && H.now > labelHideAt) { label.show(false); labelFor = null; labelHideAt = 0; } else if (labelFor && !labelFor.held && labelHideAt) { const wp = labelFor.g.getWorldPosition(V3()); wp.y += 0.13; H.face(label, wp); } });

  /* ───────────── 계기판 ───────────── */
  let gauge, gaugeKey = '', task = '', taskExtra = '';
  function drawGauge(force) {
    const k = phaseKey(), prog = k === 'melting' || k === 'freezing' ? fMelt : k === 'boiling' || k === 'condensing' ? fBoil : -1;
    const key = [Math.round(T), Tset, k, Math.round(prog * 20), task, taskExtra].join('|');
    if (!force && key === gaugeKey) return; gaugeKey = key;
    const G = A.gauge, g = gauge, st = A.states; g.clear(); g.pad = 28;
    if (task) { g.text(G.task, 24, '#ffc766', { bold: true, gap: 2 }); g.text(task + (taskExtra ? '  ' + taskExtra : ''), 28, '#ffffff', { gap: 14 }); g.bar('rgba(255,255,255,0.18)', 2, 12); }
    const tc = T <= 0 ? '#9fd8ff' : T >= 100 ? '#ffd27a' : '#8fe3ff';
    g.row([{ t: G.temp.replace('{t}', Math.round(T)), size: 52, color: tc, bold: true }, { t: G.set.replace('{t}', Tset), size: 24, color: '#c9c4d6' }], 4);
    const main = st[k], dom = k === 'melting' || k === 'freezing' ? (fMelt < 0.5 ? 'solid' : 'liquid') : k === 'boiling' || k === 'condensing' ? (fBoil < 0.5 ? 'liquid' : 'gas') : k;
    g.text(main.name, 34, main.color || '#ffd27a', { bold: true, gap: 6 });
    if (prog >= 0) { g.text(main.note, 24, '#ffe9b0', { gap: 6 }); g.meter(prog, '#ffc766', 18, 12); }
    g.text(G.move + ' · ' + st[dom].move, 24, '#e7e3f2', { gap: 6 });
    g.meter(TK() / 400, st[dom].color, 18, 10);
    if (fBoil > 0) g.text(G.speed.replace('{s}', Math.round(Math.sqrt(8 * 8.314 * TK() / (Math.PI * 0.018)) / 10) * 10), 22, '#c9c4d6', { gap: 0 });
    else if (fMelt < 1) g.text(G.vol, 22, '#c9c4d6', { gap: 0 });
    g.finish(); g.pin();
  }
  function buildGauge() {
    gauge = new Panel('gauge', 580, 'rgba(33,31,46,0.88)'); drawGauge(true); gauge.mesh.visible = false;
    gauge.mesh.position.copy(BOARD); H.world.add(gauge.mesh);
    gauge.mesh.lookAt(V3(POS.start[0], 1.55, POS.start[1] + 0.3));
  }
  function missionInfo(text, extra) { task = text || ''; taskExtra = extra || ''; if (gauge) drawGauge(true); }

  /* ───────────── 온도 손잡이(상자 앞 아래, 오른쪽 = 뜨겁게) ───────────── */
  const SL = { x0: C.x - 0.42, x1: C.x + 0.42, y: C.y - HALF + 0.07, z: C.z + HALF + 0.17 };
  let slider, knob, knobLabel, fillMat, fill;
  const tToX = t => SL.x0 + (t - A.tempRange[0]) / (A.tempRange[1] - A.tempRange[0]) * (SL.x1 - SL.x0);
  function buildSlider() {
    slider = new THREE.Group(); H.world.add(slider); slider.visible = false;
    const len = SL.x1 - SL.x0, mid = (SL.x0 + SL.x1) / 2;
    mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 16), std('#ffffff', 0.3, { transparent: true, opacity: 0.55 }), slider, [mid, SL.y, SL.z], null, [0, 0, Math.PI / 2]).castShadow = false;
    fillMat = std('#3f8ce8', 0.4, { emissive: new THREE.Color('#3f8ce8'), emissiveIntensity: 0.4 });
    fill = mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 12), fillMat, slider, [SL.x0, SL.y, SL.z], null, [0, 0, Math.PI / 2]); fill.castShadow = false;
    const tick = (t, txt, col, dx) => {
      mesh(geo.box, new THREE.MeshBasicMaterial({ color: col }), slider, [tToX(t), SL.y, SL.z], [0.006, 0.07, 0.006]).castShadow = false;
      const p = new Panel('tick' + t, 300, 'rgba(33,31,46,0.75)', 0.0006); p.pad = 10; p.text(txt, 40, col, { bold: true, align: 'center', gap: 0 }); p.finish(); p.pin();
      p.mesh.position.set(tToX(t) + dx, SL.y - (dx ? 0 : 0.07), SL.z + 0.01); slider.add(p.mesh);   /* 끝 눈금 글씨는 옆으로 빼서 겹치지 않게 */
    };
    tick(-20, A.slider.min, '#9fd8ff', -0.13); tick(0, A.slider.melt, '#bfe6ff', 0); tick(100, A.slider.boil, '#ffd27a', 0); tick(120, A.slider.max, '#ff9a7a', 0.13);
    knob = mesh(geo.sphere, std('#ffffff', 0.3, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35 }), slider, [SL.x0, SL.y, SL.z], 0.07);
    knobLabel = new Panel('knobLabel', 360, 'rgba(33,31,46,0.85)', 0.0007); knobLabel.pad = 10; slider.add(knobLabel.mesh);
    H.addGrabbable(knob, { radius: 0.09, onMove: (gr, p) => { const lp = H.world.worldToLocal(p.clone()); setTargetF((lp.x - SL.x0) / (SL.x1 - SL.x0)); } });
    H.addPickable(knob, () => { const seq = [-20, 25, 120]; let i = seq.findIndex(v => v > Tset); if (i < 0) i = 0; setTarget(seq[i]); }, on => knob.scale.setScalar(on ? 0.085 : 0.07));
    setTarget(-20, true);
  }
  let lastLimit = -9;
  function setTargetF(f) { f = Math.max(0, Math.min(1, f)); setTarget(Math.round((A.tempRange[0] + f * (A.tempRange[1] - A.tempRange[0])) / 5) * 5); }
  function setTarget(c, quiet) {
    if (c > tMax) { c = tMax; if (!quiet && H.now - lastLimit > 3) { lastLimit = H.now; showToast(A.m2.limit, 2.2); } }
    if (c === Tset && knobLabel.items.length) return;
    Tset = c; const x = tToX(c);
    knob.position.x = x;
    knobLabel.clear(); knobLabel.text(A.slider.title + ' ' + c + '°C', 34, '#ffffff', { bold: true, align: 'center', gap: 0 }); knobLabel.finish(); knobLabel.pin();
    knobLabel.mesh.position.set(x, SL.y + 0.08, SL.z);
  }
  function updateSlider() {
    const x = tToX(T), w = Math.max(0.001, x - SL.x0); fill.scale.y = w; fill.position.x = SL.x0 + w / 2;
    const f = (T - A.tempRange[0]) / (A.tempRange[1] - A.tempRange[0]), col = new THREE.Color('#3f8ce8').lerp(new THREE.Color('#e8423f'), f);
    fillMat.color.copy(col); fillMat.emissive.copy(col);
    knobLabel.mesh.lookAt(H.headPos());
    /* 히터 판: 데우는 중 = 주황, 식히는 중 = 파랑 */
    const target = heatDir > 0 ? new THREE.Color('#ff7a2a') : heatDir < 0 ? new THREE.Color('#3f8ce8') : new THREE.Color('#000000');
    heatMat.emissive.lerp(target, 0.08);
  }

  /* ───────────── 차가운 판(응결) ───────────── */
  const PLATE_HOME = V3(C.x - 0.86, C.y - 0.1, C.z + 0.32);
  let plate, plateOn = false, plateWall = null, plateLocal = V3(), drops = 0;
  const spots = [];
  function buildPlate() {
    plate = new THREE.Group(); plate.position.copy(PLATE_HOME); plate.visible = false; H.world.add(plate);
    const pm = std('#cfe3f5', 0.25, { metalness: 0.6, emissive: new THREE.Color('#7fc4ff'), emissiveIntensity: 0.25 });
    mesh(geo.box, pm, plate, [0, 0, 0], [0.025, 0.34, 0.34]).castShadow = false;
    for (let i = 0; i < 14; i++) { const f = mesh(geo.lowSphere, std('#ffffff', 0.6, { transparent: true, opacity: 0.7 }), plate, [(i % 2 ? 1 : -1) * 0.014, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3], 0.012 + Math.random() * 0.01); f.castShadow = false; }
    const lab = new Panel('plateLabel', 340, 'rgba(33,31,46,0.8)', 0.0007); lab.pad = 12;
    lab.text(A.m4.plate, 32, '#bfe6ff', { bold: true, align: 'center', gap: 2 }); lab.text(A.m4.plateNote, 22, '#ffffff', { align: 'center', gap: 0 }); lab.finish(); lab.pin();
    lab.mesh.position.set(0, 0.25, 0); plate.add(lab.mesh); plate.userData.label = lab;
    const hit = new THREE.Mesh(geo.box, hitMat); hit.scale.set(0.12, 0.36, 0.36); plate.add(hit);
    H.addGrabbable(plate, { radius: 0.2, onMove: (gr, p) => { plate.position.copy(H.world.worldToLocal(p.clone())); checkPlate(); }, onRelease: () => { if (!plateOn) H.tween(0.5, k => plate.position.lerp(PLATE_HOME, k)); } });
    H.addPickable(plate, () => tapPlate(), on => plate.scale.setScalar(on ? 1.06 : 1));
  }
  function checkPlate() {
    const lp = box.worldToLocal(plate.getWorldPosition(V3()));
    let wall = null;
    if (Math.abs(lp.x) > HALF - 0.06 && Math.abs(lp.x) < HALF + 0.16 && Math.abs(lp.y) < HALF && Math.abs(lp.z) < HALF) wall = lp.x > 0 ? 'x+' : 'x-';
    else if (Math.abs(lp.z) > HALF - 0.06 && Math.abs(lp.z) < HALF + 0.16 && Math.abs(lp.y) < HALF && Math.abs(lp.x) < HALF) wall = lp.z > 0 ? 'z+' : 'z-';
    plate.rotation.y = wall && wall[0] === 'z' ? Math.PI / 2 : 0;
    if (wall !== plateWall) { plateWall = wall; if (wall) { plateLocal.copy(lp); makeSpots(); H.sfx('piece'); } }
    if (wall) plateLocal.copy(lp);
    plateOn = !!wall && plateActive;
    plate.userData.label.mesh.visible = !wall;
  }
  function makeSpots() {
    spots.length = 0;
    const ax = plateWall[0], sign = plateWall[1] === '+' ? 1 : -1, wallPos = sign * (HALF - 0.045);
    const seeds = [[-0.07, 0.07], [0.08, 0.02], [-0.02, -0.09]];
    for (let ring = 0; ring < 7; ring++) for (const [u, v] of seeds) {
      const a = ring === 0 ? 0 : (ring - 1) * Math.PI / 3, r = ring === 0 ? 0 : 0.075;
      const pu = u + r * Math.cos(a), pv = v + r * Math.sin(a);
      const y = Math.max(-HALF + 0.05, Math.min(HALF - 0.05, plateLocal.y + pv)), o = (ax === 'x' ? plateLocal.z : plateLocal.x) + pu;
      const s = ax === 'x' ? V3(wallPos, y, Math.max(-0.45, Math.min(0.45, o))) : V3(Math.max(-0.45, Math.min(0.45, o)), y, wallPos);
      spots.push({ pos: s, used: drops > spots.length });
    }
  }
  function capture(m) {
    const p = m.g.position, ax = plateWall[0], sign = plateWall[1] === '+' ? 1 : -1;
    const near = ax === 'x' ? p.x * sign > HALF - 0.16 && Math.abs(p.z - plateLocal.z) < 0.22 : p.z * sign > HALF - 0.16 && Math.abs(p.x - plateLocal.x) < 0.22;
    if (!near || Math.abs(p.y - plateLocal.y) > 0.22) return;
    const s = spots.find(x => !x.used); if (!s) return;
    s.used = true; m.st = 'drop'; m.spot = s.pos; m.v.set(0, 0, 0); drops++;
    H.burst(box.localToWorld(s.pos.clone()), '#bfe6ff', 8, 0.3, 0.5, 0.02);
  }
  let plateActive = false;
  function tapPlate() {
    if (!plateActive || plateWall) return;
    const target = H.world.worldToLocal(box.localToWorld(V3(-HALF - 0.03, -0.05, 0.05)));
    const from = plate.position.clone();
    H.tween(0.7, k => { plate.position.lerpVectors(from, target, H.ease(k)); if (k >= 1) checkPlate(); });
  }

  /* ───────────── 물컵 + 얼음 조각 ───────────── */
  const CUP = V3(C.x + 0.86, C.y - HALF + 0.03, C.z + 0.3), CUP_R = 0.078, CUP_H = 0.2, WATER_H = 0.15, ICE = 0.08;
  const ICE_HOME = V3(C.x + 0.7, C.y - HALF + 0.08, C.z + 0.62);
  let cup, cube, floated = false, floatT = 0, cubeActive = false;
  function buildCup() {
    cup = new THREE.Group(); cup.position.copy(CUP); cup.visible = false; H.world.add(cup);
    const glass = mesh(new THREE.CylinderGeometry(CUP_R, CUP_R * 0.9, CUP_H, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: 0.22, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }), cup, [0, CUP_H / 2, 0]);
    glass.castShadow = false; glass.renderOrder = 6;
    mesh(new THREE.CylinderGeometry(CUP_R * 0.9, CUP_R * 0.9, 0.01, 40), std('#dff3ff', 0.2, { transparent: true, opacity: 0.5 }), cup, [0, 0.005, 0]).castShadow = false;
    const w = mesh(new THREE.CylinderGeometry(CUP_R * 0.97, CUP_R * 0.9, WATER_H, 40), new THREE.MeshStandardMaterial({ color: '#5ea8ff', transparent: true, opacity: 0.42, roughness: 0.15, depthWrite: false }), cup, [0, WATER_H / 2 + 0.01, 0]);
    w.castShadow = false; w.renderOrder = 7;
    const lab = new Panel('cupLabel', 260, 'rgba(33,31,46,0.8)', 0.0007); lab.pad = 10; lab.text(A.m5.cup, 30, '#9fd0ff', { bold: true, align: 'center', gap: 0 }); lab.finish(); lab.pin();
    lab.mesh.position.set(0, CUP_H + 0.06, 0); cup.add(lab.mesh);
    cube = new THREE.Group(); cube.position.copy(ICE_HOME); cube.visible = false; H.world.add(cube);
    const im = mesh(geo.box, std('#eef9ff', 0.15, { transparent: true, opacity: 0.8, emissive: new THREE.Color('#bfe6ff'), emissiveIntensity: 0.3 }), cube, [0, 0, 0], ICE); im.castShadow = false; im.renderOrder = 8;
    const il = new Panel('iceLabel', 280, 'rgba(33,31,46,0.8)', 0.0007); il.pad = 10; il.text(A.m5.ice, 30, '#ffffff', { bold: true, align: 'center', gap: 0 }); il.finish(); il.pin();
    il.mesh.position.set(0, 0.09, 0); cube.add(il.mesh); cube.userData.label = il;
    const hit = new THREE.Mesh(geo.box, hitMat); hit.scale.setScalar(0.13); cube.add(hit);
    H.addGrabbable(cube, { radius: 0.1, onGrab: () => { floated = false; }, onMove: (gr, p) => { cube.position.copy(H.world.worldToLocal(p.clone())); }, onRelease: () => dropCube() });
    H.addPickable(cube, () => { if (!cubeActive || floated) return; const from = cube.position.clone(), to = CUP.clone().add(V3(0, CUP_H + 0.08, 0)); H.tween(0.6, k => { cube.position.lerpVectors(from, to, H.ease(k)); if (k >= 1) dropCube(); }); }, on => cube.scale.setScalar(on ? 1.12 : 1));
  }
  function dropCube() {
    const d = Math.hypot(cube.position.x - CUP.x, cube.position.z - CUP.z);
    if (cubeActive && d < CUP_R + 0.04 && cube.position.y > CUP.y && cube.position.y < CUP.y + CUP_H + 0.3) {
      const from = cube.position.clone(), top = CUP.y + 0.01 + WATER_H, to = V3(CUP.x, top - 0.917 * ICE + ICE / 2, CUP.z);   /* 약 92%가 물에 잠긴다(얼음 0.917 / 물 1.000) */
      floated = true; floatT = H.now + 0.8; cube.userData.label.mesh.visible = false;
      H.tween(0.8, k => { cube.position.lerpVectors(from, to, k < 0.6 ? k / 0.6 : 1); cube.position.y = to.y + (k < 0.6 ? (from.y - to.y) * (1 - k / 0.6) - 0.03 * Math.sin(k / 0.6 * Math.PI) : -0.02 * Math.sin((k - 0.6) / 0.4 * Math.PI)); });
      H.burst(H.world.localToWorld(V3(CUP.x, top, CUP.z)), '#9fd0ff', 30, 0.5, 0.7, 0.02); H.sfx('piece');
      return;
    }
    const from = cube.position.clone(); H.tween(0.5, k => cube.position.lerpVectors(from, ICE_HOME, k));
  }
  H.onUpdate(() => { if (floated && H.now > floatT) cube.position.y = CUP.y + 0.01 + WATER_H - 0.917 * ICE + ICE / 2 + 0.003 * Math.sin(H.now * 2); });

  /* ───────────── 미션 목록·리니 ───────────── */
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
  let pickedAny = null;
  function onMolPick(m) { showLabel(m); if (!m.held) hideLabelSoon(); if (!pickedAny) pickedAny = m; }
  const flatMode = () => H.handheld || !H.inXR();

  /* ───────────── 흐름 ───────────── */
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#3f7fc8', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 72, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 30 });
    p.button(A.start, null, '#6f9fd8', null, 110);
    if (!H.inXR()) {   /* 화면 모드: 화면 비율에 맞춰 상자 + 차가운 판 + 물컵이 다 보이는 거리에 선다 */
      const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * H.camera.aspect);
      const dist = Math.max(1.7, Math.min(4.4, (H.camera.aspect < 1 ? 1.05 : 1.2) / Math.tan(hf)));   /* 세로 화면은 조금 더 가까이 */
      H.place(P([0, C.z + 0.45 + dist]), V3(0, 0.6, 0));   /* 조금 내려다봐서 상자가 아래 자막에 가리지 않게 */
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
    if (H.useHud()) H.hud(gauge, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.56 : 0.36);   /* 화면 모드: 왼쪽 위 계기판 */
    gauge.mesh.visible = true; drawWrist();
    await riniSay(A.boxShown);
  }
  async function m1() {
    log('state m1');
    await riniSay(A.m1.ask, null, '해 볼게'); missionInfo(A.m1.ask);
    if (H.AUTOTEST) wait(1).then(() => onMolPick(mols[PER_LAYER * 2 + 3]));
    await until(() => pickedAny); await wait(1.4);
    missionInfo(''); finish(0);
    await riniSay(A.m1.done);
  }
  async function m2() {
    log('state m2'); tMax = 50;
    slider.visible = true; H.burst(H.world.localToWorld(V3((SL.x0 + SL.x1) / 2, SL.y, SL.z)), '#ffffff', 40, 1, 1, 0.03);
    await riniSay(A.m2.ask, null, '해 볼게'); missionInfo(A.m2.ask);
    if (H.AUTOTEST) wait(1).then(() => setTarget(25));
    let said = false;
    await until(() => { if (!said && T === 0 && fMelt > 0) { said = true; showToast(A.m2.plateau, 3.5); log('plateau 0'); } return fMelt >= 1 && T > 0.5; });
    await wait(1.5); missionInfo(''); finish(1);
    await riniSay(A.m2.done);
  }
  async function m3() {
    log('state m3'); tMax = 120;
    await riniSay(A.m3.ask, null, '끓여 볼게'); missionInfo(A.m3.ask);
    if (H.AUTOTEST) wait(1).then(() => setTarget(120));
    let said = false;
    await until(() => { if (!said && T === 100 && fBoil > 0) { said = true; showToast(A.m3.plateau, 3.5); log('plateau 100'); } return fBoil >= 1 && mols.every(m => m.st === 'gas' || m.held); });
    await wait(1.5); missionInfo(''); finish(2);
    await riniSay(A.m3.done); await riniSay(A.m3.far); await riniSay(A.m3.evap);
  }
  async function m4() {
    log('state m4');
    plate.visible = true; plateActive = true; H.burst(H.world.localToWorld(PLATE_HOME.clone()), '#bfe6ff', 40, 1, 1, 0.03);
    const ask = flatMode() ? A.m4.askTap : A.m4.ask;
    await riniSay(ask, null, '대 볼게');
    let last = -1;
    if (H.AUTOTEST) wait(1).then(tapPlate);
    await until(() => { checkPlate(); const n = Math.min(12, drops); if (n !== last) { last = n; missionInfo(ask, A.m4.counter + ' ' + n + ' / 12'); } return n >= 12; });
    log('m4 drops', drops); await wait(1.2); missionInfo(''); finish(3);
    await riniSay(A.m4.done);
    /* 판을 치우고 물방울을 다시 수증기로 */
    plateActive = false; plateOn = false; plateWall = null; plate.rotation.y = 0;
    const from = plate.position.clone(); await H.tween(0.6, k => plate.position.lerpVectors(from, PLATE_HOME, k)); plate.visible = false;
    for (const m of mols) if (m.st === 'drop') { m.st = 'gas'; m.spot = null; m.v.copy(g3()).setLength(gasSpeed()); }
    drops = 0;
  }
  async function m5() {
    log('state m5');
    rate = H.AUTOTEST ? 60 : 30; setTarget(-20, true);
    await riniSay(A.m5.cool);
    cup.visible = true; cube.visible = true; cubeActive = true; H.burst(H.world.localToWorld(CUP.clone()), '#ffffff', 40, 1, 1, 0.03);
    const ask = flatMode() ? A.m5.askTap : A.m5.ask;
    await riniSay(ask, null, '넣어 볼게'); missionInfo(ask);
    if (H.AUTOTEST) wait(1).then(() => cube.userData.pick.onPick());
    await until(() => floated && !cube.userData.grab.held); log('m5 floated'); await wait(1.2);
    await riniSay(A.m5.floated);
    await until(() => fMelt <= 0 && T <= -10);
    missionInfo(''); finish(4);
    await riniSay(A.m5.why);
    rate = 20;
  }
  async function ending() {
    log('state ending');
    await lines(A.ending.rini);
    const E = A.ending;
    for (;;) {
      const p = ui.card; p.clear(); p.pad = 46;
      p.text(E.cardKicker, 28, '#3f7fc8', { bold: true, align: 'center', gap: 6 });
      p.text(E.cardTitle, 54, INK, { bold: true, align: 'center', gap: 18 });
      E.rows.forEach(r => p.row([{ t: '✔', size: 28, color: '#5cc3b4', bold: true }, { t: r, size: 28, color: INK }], 8));
      p.space(14);
      p.button(E.free, null, '#6f9fd8', null, 88); p.button(E.restart, null, '#ece5d8', null, 80); p.button(E.exit, null, '#3b3550', null, 80);
      p.finish(); H.placeAhead(p, 1.0, -0.45, -0.25); p.show(true);
      log('state card');
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { tMax = 120; showToast(E.freeToast, 3); await until(() => false); }   /* 더 놀기: 그대로 둔다 */
      const s = H.renderer.xr.getSession(); if (s && i === 2) { s.end(); return; }
      location.reload(); return;
    }
  }
  async function main() {
    if (H.handheld && rini) rini.root.position.y = C.y - HALF;
    await intro(); await lines(A.hello); await showBox();
    await m1(); await m2(); await m3(); await m4(); await m5(); await ending();
  }

  /* ───────────── 짓기·시작 ───────────── */
  buildSpace(); buildSites(); buildBox(); buildGauge(); buildSlider(); buildPlate(); buildCup();
  for (let i = 0; i < N; i++) addMol(i);
  let recT = 0;
  H.onUpdate(dt => {
    if (!box.visible) return;
    stepTemp(Math.min(dt, 0.1));
    if ((recT += dt) > 0.06) { recT = 0; reconcile(); }
    stepMols(dt); updateSlider(); drawGauge(false);
  });
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  const ready = H.loadChar({ url: '../world1/assets/rini-glb.wasm', height: 1.2, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', walk: 'walk', wave: 'wave2' }, trim: { wave: [1.4, 5.0] }, glow: 0.25 }).then(c => { rini = c; });
  /* 휴대폰 혼합현실: 톡 누른 바닥·책상에 상자 밑면이 놓이게(anchor), 리니도 같은 면 위에 선다 */
  H.start({ main, ready, start: { pos: POS.start, look: [C.x, C.z] }, anchor: V3(C.x, C.y - HALF, C.z) });
  window.PHASEX = { mols, sites, setTarget, get T() { return T; }, get fMelt() { return fMelt; }, get fBoil() { return fBoil; }, phaseKey, tapPlate, get drops() { return drops; } };
})();
