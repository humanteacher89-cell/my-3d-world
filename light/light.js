/* 「빛과 그림자 실험실」(가칭) v0.1 — 내 방(혼합현실)에서 손전등·거울로 빛과 그림자를 실험하는 앱 (2026-10-18, 공용 엔진 core.js)
   실험 탁자(1.2m × 0.9m, 높이 75cm) + 흰 스크린(1m × 0.6m) + 받침대 + 물체 선반. 모두 HW.world(혼합현실에서도 보임).
   손전등 = SpotLight(점광원) + 실시간 그림자 지도. 손전등은 늘 받침대 위 물체를 향한다. 빛 원뿔(반투명)·물체 끝을 스치는 빛 선(노랑)을 그린다.
   유리판·기름종이판은 그림자 지도 대신 '빛이 일부 지나간 연한 그림자'를 직접 계산해 스크린에 그린다(점광원에서 판 네 모서리를 스크린 평면에 투영).
   손 실험: ① 손전등 켜기 ② 별 모양 판 올리기 ③ 가까이 → 그림자 크게(배율 = 광원~스크린 ÷ 광원~물체) ④ 옆으로 → 그림자는 반대쪽
            ⑤ 유리·기름종이·나무판 비교 ⑥ 거울 돌려 빛줄기를 과녁에(반사 계산 r = d − 2(d·n)n, 직접 광선 계산)
   화면 모드(헤드셋 없음)에서는 손전등·물체·탁자 앞 판을 눌러서 같은 실험을 한다.                                              */
(function () {
  'use strict';
  const H = window.HW, L = window.LIGHT;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[LIGHT]', ...a);
  const UP = V3(0, 1, 0);

  const POS = { start: [0, 1.05], rini: [-1.05, -0.3] };
  const TALK = V3(-0.62, 1.74, -0.34), BOARD = V3(0.64, 1.74, -0.36);   /* 스크린 위: 왼쪽 = 리니 말, 오른쪽 = 할 일·계기판 */
  const TOP = 0.75;                                    /* 탁자 윗면 높이 */
  const TW = 1.2, TD = 0.9;                            /* 탁자 가로·세로 */
  const SZ = -0.36, SW = 1.0, SH = 0.6, SY = 1.06;     /* 스크린 평면 z, 가로, 세로, 가운데 높이 */
  const OBJ = V3(0, 1.0, -0.06);                       /* 받침대 위 물체 가운데 = 손전등이 겨누는 곳 */
  const STAND_TOP = 0.95;
  const TORCH0 = V3(0, 1.0, 0.36);
  const TLIM = { x: 0.28, y0: 0.85, y1: 1.3, z0: OBJ.z + 0.12, z1: 0.44 };
  const LB = V3(-0.56, 1.0, 0.22), MC = V3(-0.22, 1.0, 0.22), PHI_GOAL = 30;   /* 빛 상자, 거울 가운데, 맞는 거울 각(도) */
  H.bounds.r = 5.5;
  H.setSky('#1d2134', '#3c4058', '#2b2834');
  H.hemi.intensity = 0.42; H.sun.intensity = 0.3; H.sun.castShadow = false;   /* 어두운 실험실: 그림자는 손전등에서만 */

  // ───────────── 실험 공간(VR에서만) ─────────────
  function buildSpace() {
    const v = H.vrOnly;
    mesh(new THREE.CircleGeometry(8, 96), std('#4a4658', 0.95), v, [0, 0, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const lm = new THREE.MeshBasicMaterial({ color: '#6c6884', transparent: true, opacity: 0.45 });
    for (let i = 1; i <= 7; i++) mesh(new THREE.RingGeometry(i - 0.01, i + 0.01, 128), lm, v, [0, 0.003, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
  }

  // ───────────── 실험 탁자·스크린·받침대 ─────────────
  const lab = new THREE.Group(); H.world.add(lab);
  const toLab = p => lab.worldToLocal(p.clone());
  const fromLab = p => lab.localToWorld(p.clone());
  const noShadow = o => { o.traverse(x => { if (x.isMesh) x.castShadow = false; }); return o; };
  let legs = [];
  function label(text, w, size, color, bg, scale) {
    const p = new Panel('lab_' + text, w, bg || 'rgba(33,31,46,0.82)', scale || 0.0005); p.pad = 14;
    p.text(text, size || 34, color || '#ffffff', { bold: true, align: 'center', gap: 0 }); p.finish(); p.pin(); return p;
  }
  function buildTable() {
    const wood = std('#d8c19c', 0.75);
    const top = mesh(geo.box, wood, lab, [0, TOP - 0.02, 0], [TW, 0.04, TD]); top.castShadow = false;
    for (const [x, z] of [[TW / 2 - 0.05, TD / 2 - 0.05], [-TW / 2 + 0.05, TD / 2 - 0.05], [TW / 2 - 0.05, -TD / 2 + 0.05], [-TW / 2 + 0.05, -TD / 2 + 0.05]]) {
      const l = mesh(geo.cyl, std('#8f7a5c', 0.7), lab, [x, (TOP - 0.04) / 2, z], [0.05, (TOP - 0.04) / 2, 0.05]); l.castShadow = false; legs.push(l);
    }
    // 흰 스크린 + 테두리 + 발
    const scr = mesh(geo.plane, std('#ffffff', 0.95), lab, [0, SY, SZ], [SW, SH, 1]); scr.castShadow = false; scr.receiveShadow = true;
    const back = mesh(geo.box, std('#3b3850', 0.8), lab, [0, SY, SZ - 0.012], [SW + 0.04, SH + 0.04, 0.02]); back.castShadow = false;
    const fr = std('#2d2a3c', 0.6);
    for (const [x, y, sx, sy] of [[0, SY + SH / 2 + 0.01, SW + 0.04, 0.02], [0, SY - SH / 2 - 0.01, SW + 0.04, 0.02], [SW / 2 + 0.01, SY, 0.02, SH + 0.04], [-SW / 2 - 0.01, SY, 0.02, SH + 0.04]])
      mesh(geo.box, fr, lab, [x, y, SZ - 0.004], [sx, sy, 0.02]).castShadow = false;
    for (const x of [SW / 2 - 0.06, -SW / 2 + 0.06]) mesh(geo.box, fr, lab, [x, TOP + 0.01, SZ - 0.01], [0.06, 0.02, 0.12]).castShadow = false;
    const sl = label(L.screenLabel, 260, 30); sl.mesh.position.set(-SW / 2 + 0.09, SY + SH / 2 + 0.035, SZ + 0.01); lab.add(sl.mesh);
    // 받침대(가는 막대 + 작은 접시)
    const sm = std('#9aa0b4', 0.4);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, STAND_TOP - TOP, 12), sm, lab, [OBJ.x, (STAND_TOP + TOP) / 2, OBJ.z]);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 24), sm, lab, [OBJ.x, STAND_TOP - 0.003, OBJ.z]);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 24), sm, lab, [OBJ.x, TOP + 0.005, OBJ.z]).castShadow = false;
    const st = label(L.standLabel, 200, 30); st.mesh.position.set(OBJ.x, TOP + 0.04, OBJ.z + 0.07); lab.add(st.mesh);
    const sh = label(L.shelfLabel, 260, 30); sh.mesh.position.set(0.46, TOP + 0.03, 0.38); sh.mesh.rotation.x = -0.9; lab.add(sh.mesh);
  }

  // ───────────── 손전등(점광원 + 그림자 지도) ─────────────
  let torch, spot, cone, coneMat, lens, bulbGlow, torchOn = false, aimObj;
  function buildTorch() {
    torch = new THREE.Group(); lab.add(torch); torch.position.copy(TORCH0);
    const body = std('#3a5fc8', 0.45), dark = std('#22242e', 0.5);
    mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 24).rotateX(Math.PI / 2), body, torch, [0, 0, -0.085]);
    mesh(new THREE.CylinderGeometry(0.036, 0.024, 0.04, 24).rotateX(Math.PI / 2), dark, torch, [0, 0, -0.01]);
    mesh(new THREE.BoxGeometry(0.012, 0.01, 0.025), std('#ff5a4a', 0.5), torch, [0, 0.024, -0.09]);
    lens = mesh(new THREE.CircleGeometry(0.032, 24), new THREE.MeshBasicMaterial({ color: '#777777' }), torch, [0, 0, 0.0105]);
    bulbGlow = H.glowSprite('#fff2c0', 0.14, 0); bulbGlow.position.z = 0.015; torch.add(bulbGlow);
    noShadow(torch);
    const tl = label(L.torchLabel, 220, 30); tl.mesh.position.set(0, 0.06, -0.08); torch.add(tl.mesh);
    // 빛: 손전등 앞(0,0,0)에서 물체 쪽으로
    spot = new THREE.SpotLight(0xfff4dc, 2.4, 0, 0.5, 0.25, 1);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.002;
    spot.shadow.camera.near = 0.03; spot.shadow.camera.far = 2.5; spot.shadow.focus = 1;
    torch.add(spot); spot.position.set(0, 0, 0.02);
    aimObj = new THREE.Object3D(); aimObj.position.copy(OBJ); lab.add(aimObj); spot.target = aimObj;
    // 빛 원뿔(꼭짓점 = 손전등, +z로 퍼짐)
    const cg = new THREE.ConeGeometry(1, 1, 40, 1, true); cg.translate(0, -0.5, 0); cg.rotateX(-Math.PI / 2);
    coneMat = new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    cone = new THREE.Mesh(cg, coneMat); cone.castShadow = false; cone.receiveShadow = false; cone.raycast = () => {}; torch.add(cone);
    setTorch(false);
    H.addGrabbable(torch, { radius: 0.1,
      onGrab: () => { setTorch(true); },
      onMove: (g, p) => { moveTorch(toLab(p)); } });
    H.addPickable(torch, () => setTorch(!torchOn), on => { torch.scale.setScalar(on ? 1.12 : 1); });
    aimTorch();
  }
  function setTorch(on) {
    if (on && !torchOn) { H.sfx('click'); log('torch on'); }
    torchOn = on; spot.visible = on; cone.visible = on; bulbGlow.material.opacity = on ? 0.9 : 0;
    lens.material.color.set(on ? '#fffbe8' : '#777777');
  }
  function moveTorch(p) {
    torch.position.set(Math.max(-TLIM.x, Math.min(TLIM.x, p.x)), Math.max(TLIM.y0, Math.min(TLIM.y1, p.y)), Math.max(TLIM.z0, Math.min(TLIM.z1, p.z)));
    aimTorch();
  }
  function aimTorch() {
    lab.updateMatrixWorld(true);
    torch.lookAt(fromLab(OBJ));
    // 원뿔 길이 = 손전등에서 스크린 평면까지(축 방향)
    const dir = OBJ.clone().sub(torch.position).normalize();
    const len = Math.max(0.2, Math.min(2.0, (SZ - torch.position.z) / dir.z));
    const r = len * Math.tan(spot.angle * 0.92);
    cone.scale.set(r, r, len);
  }

  // ───────────── 물체(선반 ↔ 받침대) ─────────────
  const items = {};
  let standItem = null;
  const SLOTS = { cube: [0.40, 0.25], cyl: [0.53, 0.25], star: [0.40, 0.10], glass: [0.53, 0.10], paper: [0.40, -0.05], wood: [0.53, -0.05] };
  function buildItems() {
    const woodM = std('#b07a43', 0.75), cylM = std('#5cc3b4', 0.5), starM = std('#ffc23d', 0.5, { emissive: new THREE.Color('#ffc23d'), emissiveIntensity: 0.1 });
    const glassM = std('#cfeeff', 0.05, { transparent: true, opacity: 0.22, depthWrite: false });
    const paperM = std('#fffbea', 0.9, { transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    const plateM = std('#a06a36', 0.8);
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.027 : 0.066; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) starShape.lineTo(x, y); else starShape.moveTo(x, y); }
    const starG = new THREE.ExtrudeGeometry(starShape, { depth: 0.014, bevelEnabled: false }); starG.center();
    const defs = {
      cube: { w: 0.09, h: 0.09, make: g => mesh(geo.box, woodM, g, [0, 0, 0], 0.09) },
      cyl: { w: 0.07, h: 0.1, make: g => mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 32), cylM, g, [0, 0, 0]) },
      star: { w: 0.126, h: 0.126, make: g => mesh(starG, starM, g, [0, 0, 0]) },
      glass: { w: 0.13, h: 0.13, make: g => { const m = mesh(geo.box, glassM, g, [0, 0, 0], [0.13, 0.13, 0.006]); m.castShadow = false;
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.13, 0.13, 0.006)), new THREE.LineBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.8 })); g.add(e); } },
      paper: { w: 0.13, h: 0.13, make: g => { mesh(geo.box, paperM, g, [0, 0, 0], [0.13, 0.13, 0.003]).castShadow = false; } },
      wood: { w: 0.13, h: 0.13, make: g => mesh(geo.box, plateM, g, [0, 0, 0], [0.13, 0.13, 0.012]) }
    };
    for (const id in defs) {
      const d = defs[id], g = new THREE.Group(); lab.add(g); d.make(g);
      const hit = new THREE.Mesh(geo.lowSphere, new THREE.MeshBasicMaterial({ visible: false })); hit.scale.setScalar(0.12); g.add(hit);   /* 누르기 쉽게 */
      const lb = label(L.items[id].name, 300, 30, '#ffffff', 'rgba(33,31,46,0.78)', 0.00038); lb.mesh.position.set(0, -d.h / 2 - 0.02, 0.03); g.add(lb.mesh);
      const it = { id, g, w: d.w, h: d.h, kind: L.items[id].kind, slot: V3(SLOTS[id][0], TOP + d.h / 2 + 0.002, SLOTS[id][1]), lb };
      g.position.copy(it.slot); items[id] = it;
      H.addGrabbable(g, { radius: 0.08,
        onGrab: () => { if (standItem === it) standItem = null; setCast(it, false); },
        onMove: (gr, p) => { g.position.copy(toLab(p)); },
        onRelease: () => { const sp = V3(OBJ.x, STAND_TOP + it.h / 2, OBJ.z); if (g.position.distanceTo(sp) < 0.16) putOnStand(it); else toShelf(it); } });
      H.addPickable(g, () => { if (standItem !== it) putOnStand(it); }, on => { g.scale.setScalar(on ? 1.15 : 1); });
      setCast(it, false);
    }
  }
  function setCast(it, on) { it.g.traverse(x => { if (x.isMesh && !x.userData.panel && x.material.visible !== false) x.castShadow = on && it.kind === 'opaque'; }); }
  function putOnStand(it, quick) {
    if (standItem && standItem !== it) toShelf(standItem);
    standItem = it; it.lb.mesh.visible = false;
    const from = it.g.position.clone(), to = V3(OBJ.x, STAND_TOP + it.h / 2, OBJ.z);
    setCast(it, true);
    if (quick) it.g.position.copy(to); else H.tween(0.45, k => { it.g.position.lerpVectors(from, to, H.ease(k)); it.g.position.y += Math.sin(k * Math.PI) * 0.08; });
    H.sfx('piece'); log('on stand', it.id);
    onPlaced(it);
  }
  function toShelf(it) {
    if (standItem === it) standItem = null;
    setCast(it, false); it.lb.mesh.visible = true;
    const from = it.g.position.clone();
    H.tween(0.4, k => it.g.position.lerpVectors(from, it.slot, H.ease(k)));
  }

  // ───────────── 물체 끝을 스치는 빛 선 + 연한 그림자(유리·기름종이) ─────────────
  let rayLines, rayPos, fake, fakePos, fakeMat;
  function buildRays() {
    const g = new THREE.BufferGeometry(); rayPos = new Float32Array(4 * 3); g.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
    rayLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.85 }));
    rayLines.frustumCulled = false; rayLines.visible = false; lab.add(rayLines);
    const fg = new THREE.BufferGeometry(); fakePos = new Float32Array(8 * 3 * 3); fg.setAttribute('position', new THREE.BufferAttribute(fakePos, 3));
    fakeMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    fake = new THREE.Mesh(fg, fakeMat); fake.frustumCulled = false; fake.visible = false; fake.renderOrder = 2; fake.raycast = () => {}; lab.add(fake);
  }
  const toScreen = (Lp, C) => { const k = (Lp.z - SZ) / (Lp.z - C.z); return V3(Lp.x + (C.x - Lp.x) * k, Lp.y + (C.y - Lp.y) * k, SZ); };
  function clipPoly(pts) {   /* 스크린 사각형 안으로 자르기(Sutherland–Hodgman) */
    const E = [[0, 1, -SW / 2], [0, -1, -SW / 2], [1, 1, SY - SH / 2], [1, -1, -(SY + SH / 2)]];
    let out = pts;
    for (const [ax, s, c] of E) {
      const inn = p => s * p[ax] >= c, cut = (a, b) => { const t = (c / s - a[ax]) / (b[ax] - a[ax]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
      const res = [];
      for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; if (inn(a)) { res.push(a); if (!inn(b)) res.push(cut(a, b)); } else if (inn(b)) res.push(cut(a, b)); }
      out = res; if (!out.length) break;
    }
    return out;
  }
  function updateRays() {
    const it = standItem, Lp = torch.position;
    const showRays = torchOn && it && !mirrorMode && Lp.z > OBJ.z + 0.05;
    rayLines.visible = !!showRays;
    if (showRays) {
      const y = STAND_TOP + it.h, z = OBJ.z;
      [[-it.w / 2, y], [it.w / 2, y]].forEach(([x, yy], i) => { const S = toScreen(Lp, V3(x, yy, z)); rayPos.set([Lp.x, Lp.y, Lp.z, S.x, S.y, S.z + 0.002], i * 6); });
      rayLines.geometry.attributes.position.needsUpdate = true;
    }
    const soft = torchOn && it && it.kind !== 'opaque';
    fake.visible = !!soft;
    if (soft) {
      fakeMat.opacity = it.kind === 'translucent' ? 0.36 : 0.07;
      const c = it.g.position, hw = it.w / 2, hh = it.h / 2;
      const poly = clipPoly([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => { const S = toScreen(Lp, V3(c.x + x, c.y + y, c.z)); return [S.x, S.y]; }));
      let n = 0;
      for (let i = 1; i + 1 < poly.length && n < 8; i++, n++) [poly[0], poly[i], poly[i + 1]].forEach((q, j) => fakePos.set([q[0], q[1], SZ + 0.003], (n * 3 + j) * 3));
      fake.geometry.setDrawRange(0, n * 3); fake.geometry.attributes.position.needsUpdate = true;
    }
  }
  /* 그림자 계산값(계기판용): 물체 가운데를 지나는 빛줄기 기준 */
  function shadowInfo() {
    const Lp = torch.position, S = toScreen(Lp, OBJ);
    const dLO = Lp.distanceTo(OBJ), dLS = Lp.distanceTo(S), mag = dLS / dLO;
    return { dLO, dLS, mag, sx: S.x };
  }

  // ───────────── 거울·빛 상자·과녁 ─────────────
  let mirrorSet, mirror, phi = 80, beam1, beam2, hitDot, target, targetMat, normalLine, mirrorMode = false, aimHit = false, aimDist = 1, angI = 0;
  const T = (() => { const p = PHI_GOAL * Math.PI / 180, n = V3(Math.sin(p), 0, Math.cos(p)), d = V3(1, 0, 0), r = d.clone().addScaledVector(n, -2 * d.dot(n)); const t = (SZ + 0.003 - MC.z) / r.z; return MC.clone().addScaledVector(r, t); })();
  function makeBeam(color) {
    const g = new THREE.Group(), cg = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    const core = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color, toneMapped: false })); core.scale.set(0.0035, 1, 0.0035);
    const glow = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(0.012, 1, 0.012);
    for (const m of [core, glow]) { m.castShadow = false; m.raycast = () => {}; g.add(m); }
    mirrorSet.add(g);
    return { g, set(a, b) { const d = b.clone().sub(a), len = d.length(); g.position.copy(a).addScaledVector(d, 0.5); g.quaternion.setFromUnitVectors(UP, d.normalize()); g.scale.set(1, Math.max(0.001, len), 1); } };
  }
  function buildMirror() {
    mirrorSet = new THREE.Group(); lab.add(mirrorSet); mirrorSet.visible = false;
    // 빛 상자
    const bx = new THREE.Group(); mirrorSet.add(bx); bx.position.copy(LB);
    mesh(geo.box, std('#2d2a3c', 0.5), bx, [-0.05, 0, 0], [0.1, 0.07, 0.07]);
    mesh(geo.box, std('#ffe27a', 0.4, { emissive: new THREE.Color('#ffe27a'), emissiveIntensity: 0.8 }), bx, [0.001, 0, 0], [0.004, 0.04, 0.008]);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, LB.y - TOP - 0.035, 10), std('#9aa0b4', 0.4), bx, [-0.05, -(LB.y - TOP) / 2 - 0.017, 0]);
    const bl = label(L.boxLabel, 200, 30); bl.mesh.position.set(-0.05, 0.065, 0); bx.add(bl.mesh);
    // 거울(그룹 +z = 법선 n, 비추는 면은 -n 쪽)
    mirror = new THREE.Group(); mirrorSet.add(mirror); mirror.position.copy(MC);
    mesh(geo.plane, std('#e6f2fa', 0.08, { metalness: 0.35, emissive: new THREE.Color('#9fc6e0'), emissiveIntensity: 0.35 }), mirror, [0, 0, -0.004], [0.16, 0.12, 1], [0, Math.PI, 0]).castShadow = false;
    mesh(geo.box, std('#4b4860', 0.6), mirror, [0, 0, 0.002], [0.17, 0.13, 0.008]);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, MC.y - TOP - 0.06, 10), std('#9aa0b4', 0.4), mirrorSet, [MC.x, (MC.y - 0.06 + TOP) / 2, MC.z]);
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 24), std('#9aa0b4', 0.4), mirrorSet, [MC.x, TOP + 0.005, MC.z]).castShadow = false;
    // 돌리는 손잡이(거울 옆으로 뻗은 막대 끝 노란 공)
    mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 8).rotateZ(Math.PI / 2), std('#c9a23a', 0.4), mirror, [0.1, -0.07, 0]).castShadow = false;
    const knob = mesh(geo.sphere, std('#ffc23d', 0.35, { emissive: new THREE.Color('#ffc23d'), emissiveIntensity: 0.35 }), mirror, [0.15, -0.07, 0], 0.04); knob.castShadow = false;
    let a0 = 0, phi0 = 0;
    const ang = p => Math.atan2(p.x - MC.x, p.z - MC.z);
    H.addGrabbable(knob, { radius: 0.08,
      onGrab: (g) => { a0 = ang(toLab(g.point)); phi0 = phi; },
      onMove: (g, p) => { setPhi(phi0 + H.angDiff(a0, ang(toLab(p))) * 180 / Math.PI); } });
    H.addPickable(mirror, () => setPhi(phi - 10 < 10 ? 170 : phi - 10), on => { mirror.scale.setScalar(on ? 1.08 : 1); });
    // 과녁(스크린 위)
    const tc = document.createElement('canvas'); tc.width = tc.height = 128; const x = tc.getContext('2d');
    for (const [r, c] of [[62, '#e8423f'], [46, '#ffffff'], [30, '#e8423f'], [14, '#ffffff']]) { x.beginPath(); x.arc(64, 64, r, 0, Math.PI * 2); x.fillStyle = c; x.fill(); }
    const tt = new THREE.CanvasTexture(tc); tt.encoding = THREE.sRGBEncoding;
    targetMat = new THREE.MeshBasicMaterial({ map: tt, transparent: true, toneMapped: false });
    target = new THREE.Mesh(new THREE.CircleGeometry(0.045, 40), targetMat); target.position.set(T.x, T.y, SZ + 0.004); target.raycast = () => {}; mirrorSet.add(target);
    beam1 = makeBeam('#ffe36b'); beam2 = makeBeam('#ffe36b');
    hitDot = H.glowSprite('#fff2a0', 0.07, 0.95); mirrorSet.add(hitDot);
    normalLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(), V3()]), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0.9 }));
    normalLine.frustumCulled = false; mirrorSet.add(normalLine);
    setPhi(80);
  }
  function setPhi(deg) {
    phi = Math.max(10, Math.min(170, Math.round(deg)));
    mirror.rotation.y = phi * Math.PI / 180;
    const p = phi * Math.PI / 180, n = V3(Math.sin(p), 0, Math.cos(p)), d = V3(1, 0, 0);
    const r = d.clone().addScaledVector(n, -2 * d.dot(n)).normalize();
    beam1.set(LB.clone().add(V3(0.004, 0, 0)), MC);
    let end, onScreen = false;
    if (r.z < -1e-3) { const t = (SZ + 0.003 - MC.z) / r.z, Q = MC.clone().addScaledVector(r, t); onScreen = Math.abs(Q.x) <= SW / 2 && Math.abs(Q.y - SY) <= SH / 2; end = onScreen ? Q : MC.clone().addScaledVector(r, Math.min(t, 1.0)); }
    else end = MC.clone().addScaledVector(r, 0.9);
    beam2.set(MC, end); hitDot.position.copy(end); hitDot.visible = onScreen;
    aimDist = onScreen ? end.distanceTo(T) : 1; aimHit = aimDist < 0.035;
    targetMat.color.set(aimHit ? '#fff3a0' : '#ffffff');
    const fn = n.clone().multiplyScalar(-1);   /* 비추는 면 쪽 법선 */
    normalLine.geometry.setFromPoints([MC.clone(), MC.clone().addScaledVector(fn, 0.16)]); normalLine.computeLineDistances();
    angI = Math.round(Math.acos(Math.min(1, Math.abs(d.dot(n)))) * 180 / Math.PI);
  }

  // ───────────── 탁자 앞 누름판(화면·휴대폰·헤드셋 모두) ─────────────
  const pads = {};
  function buildPads() {
    const defs = { left: [-0.24, () => nudge(-0.1, 0)], near: [-0.08, () => nudge(0, -0.06)], far: [0.08, () => nudge(0, 0.06)], right: [0.24, () => nudge(0.1, 0)],
      rotL: [-0.16, () => setPhi(phi + 10)], rotR: [0.04, () => setPhi(phi - 10)] };
    for (const k in defs) {
      const [x, fn] = defs[k];
      const p = new Panel('pad_' + k, k.startsWith('rot') ? 340 : 280, 'rgba(44,40,66,0.92)', 0.00055); p.pad = 18;
      p.text(L.pads[k], 40, '#ffe9a8', { bold: true, align: 'center', gap: 0 }); p.finish(); p.pin();
      p.mesh.position.set(x, TOP + 0.012, 0.405); p.mesh.rotation.x = -1.05; lab.add(p.mesh);
      H.addPickable(p.mesh, () => { H.sfx('select'); fn(); }, on => { p.bg = on ? 'rgba(92,84,140,0.96)' : 'rgba(44,40,66,0.92)'; p.draw(); });
      pads[k] = p;
    }
    showPads('torch');
  }
  function showPads(mode) {
    for (const k in pads) { const rot = k.startsWith('rot'); pads[k].mesh.visible = mode === 'mirror' ? rot : !rot; }
  }
  function nudge(dx, dz) {
    if (!torchOn) setTorch(true);
    const from = torch.position.clone(), to = from.clone().add(V3(dx, 0, dz));
    to.x = Math.max(-TLIM.x + 0.03, Math.min(TLIM.x - 0.03, to.x)); to.z = Math.max(TLIM.z0, Math.min(TLIM.z1, to.z));
    H.tween(0.3, k => { torch.position.lerpVectors(from, to, H.ease(k)); aimTorch(); });
  }

  // ───────────── 계기판 ─────────────
  let gauge, gaugeKey = '', task = '', taskExtra = '';
  function drawGauge(force) {
    const G = L.gauge, si = shadowInfo();
    const key = [task, taskExtra, torchOn, mirrorMode, si.mag.toFixed(2), Math.round(si.dLO * 100), Math.round(si.sx * 100), standItem && standItem.id, phi, aimHit].join('|');
    if (!force && key === gaugeKey) return; gaugeKey = key;
    const g = gauge; g.clear(); g.pad = 28;
    if (task) { g.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 2 }); g.text(task + (taskExtra ? '  ' + taskExtra : ''), 28, '#ffffff', { gap: 14 }); g.bar('rgba(255,255,255,0.18)', 2, 12); }
    if (mirrorMode) {
      g.text(G.mirrorTitle, 30, '#c9c4d6', { bold: true, gap: 6 });
      g.row([{ t: G.ai.replace('{a}', angI), size: 40, color: '#ffd27a', bold: true }, { t: '=', size: 40, color: '#ffffff', bold: true }, { t: G.ar.replace('{a}', angI), size: 40, color: '#ffd27a', bold: true }], 8);
      g.text(G.normal, 24, '#c9c4d6', { gap: 6 });
      g.text(aimHit ? G.aimHit : aimDist >= 1 ? G.aimOff : G.aim.replace('{d}', Math.round(aimDist * 100)), 30, aimHit ? '#8fe3a8' : '#e7e3f2', { bold: aimHit, gap: 0 });
    } else {
      g.text(G.title, 30, '#c9c4d6', { bold: true, gap: 6 });
      if (!torchOn) g.text(G.off, 30, '#e7e3f2', { gap: 0 });
      else {
        g.text(G.dl.replace('{d}', Math.round(si.dLO * 100)) + '   ' + G.ds.replace('{d}', Math.round(si.dLS * 100)), 26, '#e7e3f2', { gap: 6 });
        g.row([{ t: G.mag.replace('{m}', si.mag.toFixed(1)), size: 44, color: si.mag >= 2.2 ? '#8fe3a8' : '#ffd27a', bold: true }], 6);
        g.meter((si.mag - 1) / 3, si.mag >= 2.2 ? '#8fe3a8' : '#ffd27a', 20, 8);
        g.text(G.magNote, 22, '#c9c4d6', { gap: 8 });
        if (standItem) g.text(G.size.replace('{s}', Math.round(standItem.h * si.mag * 100)).replace('{o}', Math.round(standItem.h * 100)), 24, '#e7e3f2', { gap: 4 });
        const pv = Math.abs(si.sx) < 0.03 ? 'center' : si.sx > 0 ? 'right' : 'left';
        g.text(G.pos.replace('{p}', G.posV[pv]) + '   ' + G.dark.replace('{k}', G.darkV[standItem ? standItem.kind : 'none']), 24, '#e7e3f2', { gap: 0 });
      }
    }
    g.finish(); g.pin();
  }
  function buildGauge() {
    gauge = new Panel('gauge', 600, 'rgba(33,31,46,0.88)'); drawGauge(true); gauge.mesh.visible = false;
    gauge.mesh.position.copy(BOARD); lab.add(gauge.mesh);
  }
  function missionInfo(text, extra) { task = text || ''; taskExtra = extra || ''; if (gauge) drawGauge(true); }

  // ───────────── 미션 목록·리니 ─────────────
  const MISSIONS = [L.m1.title, L.m2.title, L.m3.title, L.m4.title, L.m5.title, L.m6.title], done = MISSIONS.map(() => false);
  let wrist;
  function drawWrist() {
    const p = wrist; p.clear();
    p.row([{ t: L.wrist, size: 36, color: '#ffffff', bold: true }, { t: done.filter(Boolean).length + '/' + MISSIONS.length, size: 36, color: '#ffc766', bold: true }], 12);
    const cur = done.indexOf(false);
    MISSIONS.forEach((t, i) => p.row([{ t: done[i] ? '●' : i === cur ? '▶' : '○', size: 30, color: done[i] ? '#8fe3a8' : i === cur ? '#ffc766' : '#8a8698' }, { t, size: 30, color: done[i] ? '#b9b5c6' : '#ffffff' }], 8));
    p.finish(); p.show(true);
  }
  function finish(i) { done[i] = true; drawWrist(); H.sfx('complete'); }
  let rini = null;
  const spk = () => ({ name: L.guide.name, role: L.guide.role, dot: L.guide.dot, char: rini, pos: P(POS.rini) });
  const talkAt = () => H.world.localToWorld(TALK.clone());
  const riniSay = (text, options, single, o) => say(spk(), text, options, single || '다음', o || { at: talkAt() });
  async function lines(arr) { for (const l of arr) { if (typeof l === 'string') await riniSay(l); else await riniSay(l.text, l.choices); } }
  const tapMode = () => !H.inXR();   /* 화면 모드(PC·휴대폰 브라우저): 누르기로 */
  const ask = m => (tapMode() || H.handheld ? m.askTap : m.ask);
  const seen = new Set();
  let lastPlaced = null;
  function onPlaced(it) {
    lastPlaced = it.id;
    if (curMission === 4 && ['glass', 'paper', 'wood'].includes(it.id)) { if (!torchOn) setTorch(true); seen.add(it.id); wait(0.5).then(() => showToast(L.m5[it.id], 3.2)); }
  }
  let curMission = -1;
  function burstAt(p, c, n) { H.burst(fromLab(p), c || '#fff2c0', n || 40, 0.8, 0.9, 0.03); }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(L.kicker, 30, '#7a6ad0', { bold: true, align: 'center', gap: 10 });
    p.text(L.title, 76, INK, { bold: true, align: 'center', gap: 18 });
    p.text(L.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? L.howPhone : H.inXR() ? (handMode ? L.howHand : L.howHand + ' ' + L.howCtrl) : L.howFlat, 28, '#b5873e', { align: 'center', gap: 30 });
    p.button(L.start, null, '#ffc23d', null, 110);
    if (!H.inXR()) {   /* 화면 모드: 화면 비율에 맞춰 탁자가 다 보이는 거리에 선다 */
      const asp = H.camera.aspect, hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * asp);
      const dist = Math.max(0.9, Math.min(2.4, (asp < 1 ? 0.66 : 0.9) / Math.tan(hf)));
      const camZ = 0.45 + dist, pitch = THREE.MathUtils.degToRad((asp < 1 ? 20 : 25) / 0.6);   /* 내려다보는 각: 스크린이 화면 위쪽, 탁자 앞 판이 자막 위에 오게 */
      H.place(P([0, camZ]), V3(0, 0.3, camZ - 1.3 / Math.tan(pitch)));
    }
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat');
    await waitPick(p, 0, 1.0); p.show(false);
    H.audio.music('day'); await wait(0.4);
  }
  async function showLab() {
    log('state lab');
    lab.visible = true; H.sfx('appear'); burstAt(V3(0, 1.0, 0), '#fff2c0', 120);
    await H.tween(1.4, k => lab.scale.setScalar(Math.max(0.001, H.ease(k))));
    aimTorch(); setPhi(phi);
    gauge.mesh.lookAt(fromLab(V3(POS.start[0], 1.55, POS.start[1] + 0.3)));
    if (H.useHud()) H.hud(gauge, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.6 : 0.36);   /* 화면 모드: 왼쪽 위 계기판 */
    gauge.mesh.visible = true; drawWrist();
  }
  async function m1() {
    curMission = 0; log('state m1');
    await riniSay(ask(L.m1), null, '해 볼게'); missionInfo(ask(L.m1));
    if (H.AUTOTEST) wait(1).then(() => setTorch(true));
    await until(() => torchOn); await wait(1.4);
    missionInfo(''); finish(0);
    await riniSay(L.m1.done);
    await riniSay(L.m1.rays);
  }
  async function m2() {
    curMission = 1; log('state m2');
    await riniSay(ask(L.m2), null, '해 볼게'); missionInfo(ask(L.m2));
    if (H.AUTOTEST) wait(1).then(() => putOnStand(items.star));
    await until(() => standItem === items.star && !items.star.g.userData.grab.held); await wait(1.2);
    if (!torchOn) setTorch(true);
    missionInfo(''); finish(1);
    await riniSay(L.m2.done);
  }
  async function m3() {
    curMission = 2; log('state m3');
    if (!torchOn) setTorch(true);
    if (!standItem) putOnStand(items.cube);
    await riniSay(ask(L.m3), null, '해 볼게'); missionInfo(ask(L.m3));
    if (H.AUTOTEST) (async () => { for (let i = 0; i < 3; i++) { await wait(0.7); nudge(0, -0.06); } })();
    await until(() => torchOn && shadowInfo().mag >= 2.2); await wait(1.4);
    missionInfo(''); finish(2);
    await riniSay(L.m3.done, null, '다음', { at: talkAt(), sub: L.m3.formula });
  }
  async function m4() {
    curMission = 3; log('state m4');
    if (!torchOn) setTorch(true);
    await riniSay(ask(L.m4), null, '옮겨 볼게'); missionInfo(ask(L.m4));
    if (H.AUTOTEST) (async () => { for (let i = 0; i < 2; i++) { await wait(0.7); nudge(-0.1, 0); } })();
    await until(() => torchOn && Math.abs(torch.position.x) >= 0.15); await wait(1.4);
    const wentLeft = torch.position.x < 0;
    missionInfo(''); finish(3);
    await riniSay(wentLeft ? L.m4.doneL : L.m4.doneR);
    await H.tween(0.6, k => { torch.position.x *= (1 - k); aimTorch(); });   /* 다음 실험을 위해 가운데로 */
  }
  async function m5() {
    curMission = 4; log('state m5'); seen.clear();
    if (!torchOn) setTorch(true);
    await riniSay(ask(L.m5), null, '비교해 볼게');
    let last = -1;
    if (H.AUTOTEST) (async () => { for (const id of ['glass', 'paper', 'wood']) { await wait(1.6); putOnStand(items[id]); } })();
    await until(() => { const n = seen.size; if (n !== last) { last = n; missionInfo(ask(L.m5), L.m5.counter + ' ' + n + ' / 3'); } return n >= 3; });
    await wait(3.4); missionInfo(''); finish(4);
    await riniSay(L.m5.done);
  }
  async function m6() {
    curMission = 5; log('state m6');
    setTorch(false); if (standItem) toShelf(standItem);
    mirrorMode = true; mirrorSet.visible = true; showPads('mirror'); setPhi(80); burstAt(MC, '#ffe36b', 50); H.sfx('appear');
    drawGauge(true);
    await riniSay(L.m6.intro);
    await riniSay(ask(L.m6), null, '돌려 볼게'); missionInfo(ask(L.m6));
    if (H.AUTOTEST) (async () => { for (let i = 0; i < 5; i++) { await wait(0.6); setPhi(phi - 10); } })();
    await until(() => aimHit && !H.grabbers.some(g => g.held && g.held.parent === mirror));
    H.burst(fromLab(T), '#fff2a0', 60, 0.8, 1.0, 0.03); showToast(L.m6.hit, 2.4);
    await wait(1.6); missionInfo(''); finish(5);
    await riniSay(L.m6.done, null, '다음', { at: talkAt(), sub: L.m6.safety });
  }
  async function ending() {
    log('state ending');
    await lines(L.ending.rini);
    const E = L.ending;
    for (;;) {
      const p = ui.card; p.clear(); p.pad = 46;
      p.text(E.cardKicker, 28, '#7a6ad0', { bold: true, align: 'center', gap: 6 });
      p.text(E.cardTitle, 56, INK, { bold: true, align: 'center', gap: 18 });
      E.rows.forEach(r => p.row([{ t: '✔', size: 30, color: '#e0a92c', bold: true }, { t: r, size: 30, color: INK }], 10));
      p.space(16);
      p.button(E.free, null, '#ffc23d', null, 88); p.button(E.restart, null, '#ece5d8', null, 80); p.button(E.exit, null, '#3b3550', null, 80);
      p.finish(); H.placeAhead(p, 1.0, -0.45, -0.25); p.show(true);
      log('state card');
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) {   /* 더 놀기: 손전등을 다시 켜고, 거울도 그대로 둔다 */
        mirrorMode = false; showPads('torch'); setTorch(true); if (!standItem) putOnStand(items.cube); drawGauge(true);
        showToast(E.freeToast, 3.4); await until(() => false);
      }
      const s = H.renderer.xr.getSession(); if (s && i === 2) { s.end(); return; }
      location.reload(); return;
    }
  }
  async function main() {
    if (H.handheld) { if (rini) rini.root.position.y = TOP; for (const l of legs) l.visible = false; }   /* 휴대폰: 실제 책상 위에 탁자판만 */
    await intro(); await lines(L.hello); await showLab();
    await m1(); await m2(); await m3(); await m4(); await m5(); await m6(); await ending();
  }

  // ───────────── 짓기·시작 ─────────────
  buildSpace(); buildTable(); buildTorch(); buildItems(); buildRays(); buildMirror(); buildPads(); buildGauge();
  putOnStand(items.cube, true); lastPlaced = null;
  lab.scale.setScalar(0.001); lab.visible = false;
  H.onUpdate(() => { if (!lab.visible) return; updateRays(); drawGauge(false); });
  wrist = new Panel('wrist', 460, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  const ready = H.loadChar({ url: '../world1/assets/rini-glb.wasm', height: 1.2, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', walk: 'walk', wave: 'wave2' }, trim: { wave: [1.4, 5.0] }, glow: 0.25 }).then(c => { rini = c; });
  // 휴대폰 혼합현실: 톡 누른 책상·바닥에 탁자 윗면이 놓이게(anchor)
  H.start({ main, ready, start: { pos: POS.start, look: [0, 0] }, anchor: V3(0, TOP, 0) });
  window.LIGHTX = { items, setTorch, moveTorch, nudge, putOnStand, setPhi, shadowInfo, get phi() { return phi; }, get aimHit() { return aimHit; }, torch: () => torch, T };
})();
