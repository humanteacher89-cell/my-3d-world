/* 「약국에 가요」 약국 공간·소품 (2026-10-21) — 2판 store\space.js 방식 그대로: 모두 코드로 짓고 글씨·그림은 캔버스로 그린다(내려받기 없음).
   실제 약 이름·상표 없음: 약 상자는 '하나 약국 · 연습용' 가상 상품, 크게 쓴 글씨는 몸 낱말(머리·배·목).
   벽·바닥·천장·간판·의자·포스터는 VR·화면에서만(H.vrOnly — 혼합현실에서는 실제 방). 계산대·약 선반·몸 그림판은 혼합현실에서도 보인다(H.world).
   좌표: 사용자는 +Z(입구) 쪽에서 -Z(안쪽)를 본다. 바닥 y=0. 약국 안 x -2.3~2.3, z -2.4~2.4. 단위 m.                       */
window.PHARM_SPACE = (function () {
  'use strict';
  const H = window.HW;
  const { V3, std, mesh, geo } = H;

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const FONT = '"Noto Sans KR","Malgun Gothic",system-ui,sans-serif';
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const TEAL = '#3a8fb7', TEAL_D = '#2a6f90';

  // ───────────── 약국 바탕(벽·바닥·천장·간판·의자·포스터) ─────────────
  const SHOP = { x0: -2.3, x1: 2.3, z0: -2.4, z1: 2.4, h: 2.7 };
  function build(opts = {}) {
    const root = new THREE.Group(); H.vrOnly.add(root);
    const W = SHOP.x1 - SHOP.x0, D = SHOP.z1 - SHOP.z0, cx = (SHOP.x0 + SHOP.x1) / 2, cz = (SHOP.z0 + SHOP.z1) / 2;
    // 바닥: 연한 나무 무늬
    const floorT = canvasTex(512, 512, (g, w, h) => {
      for (let y = 0; y < h; y += 64) { g.fillStyle = `hsl(35,30%,${78 + rnd() * 6}%)`; g.fillRect(0, y, w, 64); g.fillStyle = 'rgba(120,90,60,0.25)'; g.fillRect(0, y, w, 2); const off = rnd() * w; g.fillRect(off, y, 2, 64); }
    }, [W / 1.6, D / 1.6]);
    const floor = mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', 0.6, { map: floorT }), root, [cx, 0.001, cz], null, [-Math.PI / 2, 0, 0]); floor.receiveShadow = true; floor.castShadow = false;
    // 벽: 흰 벽 + 아래쪽 청록 띠(약국 색)
    const wallT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f7f8f6'; g.fillRect(0, 0, w, h); g.fillStyle = TEAL; g.fillRect(0, h * 0.8, w, h * 0.05); g.fillStyle = '#d8dcd8'; g.fillRect(0, h * 0.93, w, h * 0.07); }, [3, 1]);
    const wallM = std('#ffffff', 0.9, { map: wallT });
    const walls = [[cx, SHOP.z0, W, 0], [SHOP.x0, cz, D, Math.PI / 2], [SHOP.x1, cz, D, -Math.PI / 2]];
    for (const [x, z, len, ry] of walls) { const m = mesh(new THREE.PlaneGeometry(len, SHOP.h), wallM, root, [x, SHOP.h / 2, z], null, [0, ry, 0]); m.castShadow = false; m.receiveShadow = true; }
    // 앞(입구): 유리문
    const glass = std('#c7e6ef', 0.1, { transparent: true, opacity: 0.35 });
    mesh(new THREE.PlaneGeometry(W, SHOP.h), glass, root, [cx, SHOP.h / 2, SHOP.z1], null, [0, Math.PI, 0]).castShadow = false;
    for (const x of [-2.3, -0.8, 0.8, 2.3]) mesh(geo.box, std('#8a9096', 0.4), root, [x, SHOP.h / 2, SHOP.z1], [0.06, SHOP.h, 0.06]);
    // 천장 + 둥근 등
    mesh(new THREE.PlaneGeometry(W, D), std('#f4f4f2', 0.95), root, [cx, SHOP.h, cz], null, [Math.PI / 2, 0, 0]).castShadow = false;
    const lampM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-1.1, 1.1]) for (const z of [-1.2, 0.6]) mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 28), lampM, root, [x, SHOP.h - 0.02, z]).castShadow = false;
    // 간판(안쪽 벽 위): 큰 '약' 글자 동그라미 + 가게 이름
    const signT = canvasTex(1024, 192, (g, w, h) => {
      g.fillStyle = TEAL_D; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(0, h - 18, w, 6);
      g.beginPath(); g.arc(120, h * 0.47, 70, 0, 7); g.fillStyle = '#ffffff'; g.fill();
      g.fillStyle = TEAL_D; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 96px ${FONT}`; g.fillText('약', 120, h * 0.5);
      g.fillStyle = '#ffffff'; g.font = `900 104px ${FONT}`; g.fillText(opts.name || '약국', w / 2 + 70, h * 0.48);
    });
    mesh(geo.box, std('#ffffff', 0.5, { map: signT, emissive: H.hex('#ffffff'), emissiveMap: signT, emissiveIntensity: 0.35 }), root, [-0.4, 2.35, SHOP.z0 + 0.04], [1.9, 0.36, 0.04]).castShadow = false;
    // 포스터(왼쪽 벽): 손 씻기 그림 — 글은 일반 표현
    const posterT = canvasTex(384, 512, (g, w, h) => {
      g.fillStyle = '#eaf6fb'; g.fillRect(0, 0, w, h); g.fillStyle = TEAL; g.fillRect(0, 0, w, 90);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 52px ${FONT}`; g.fillText('손 씻기', w / 2, 47);
      g.fillStyle = '#f2c9a5'; for (const [x, y] of [[150, 270], [234, 270]]) { g.beginPath(); g.ellipse(x, y, 52, 80, 0, 0, 7); g.fill(); }
      g.fillStyle = '#9fd6ef'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(90 + rnd() * 210, 180 + rnd() * 190, 6 + rnd() * 10, 0, 7); g.fill(); }
      g.fillStyle = '#2a4a5a'; g.font = `700 40px ${FONT}`; g.fillText('비누로 깨끗이', w / 2, 440);
    });
    mesh(new THREE.PlaneGeometry(0.6, 0.8), std('#ffffff', 0.8, { map: posterT }), root, [SHOP.x0 + 0.01, 1.5, -0.6], null, [0, Math.PI / 2, 0]).castShadow = false;
    // 기다리는 의자(왼쪽 앞)
    const chairM = std(TEAL, 0.5), legM = std('#9aa3ab', 0.3, { metalness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group(); g.position.set(-1.95, 0, 0.55 + i * 0.55); g.rotation.y = Math.PI / 2; root.add(g);
      mesh(geo.box, chairM, g, [0, 0.45, 0], [0.46, 0.06, 0.44]);
      mesh(geo.box, chairM, g, [0, 0.72, -0.2], [0.46, 0.5, 0.05]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(geo.box, legM, g, [sx * 0.2, 0.21, sz * 0.18], [0.03, 0.42, 0.03]);
    }
    // 화분(오른쪽 앞)
    mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.32, 18), std('#d9cbb5', 0.7), root, [1.95, 0.16, 1.6]);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(geo.sphere, std('#5fa66b', 0.7), root, [1.95 + Math.cos(a) * 0.1, 0.5 + rnd() * 0.2, 1.6 + Math.sin(a) * 0.1], [0.14, 0.24, 0.14]); }
    // 바깥 대신 입구 쪽 밝은 빛
    const outT = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d3ecf5'); gr.addColorStop(1, '#eef3f0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    mesh(new THREE.PlaneGeometry(W * 3, SHOP.h * 2), new THREE.MeshBasicMaterial({ map: outT }), root, [cx, SHOP.h / 2, SHOP.z1 + 2], null, [0, Math.PI, 0]).castShadow = false;
    return { root };
  }

  // ───────────── 계산대(약사 쪽 -z, 손님 쪽 +z) ─────────────
  function counter(parent, cx, cz, w = 1.5, d = 0.6, h = 0.95) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const frontT = canvasTex(512, 256, (gg, ww, hh) => {
      gg.fillStyle = '#f6f7f5'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = TEAL; gg.fillRect(0, hh * 0.12, ww, hh * 0.09); gg.fillStyle = '#d6dad6'; gg.fillRect(0, hh * 0.9, ww, hh * 0.1);
      gg.beginPath(); gg.arc(ww / 2, hh * 0.52, 46, 0, 7); gg.fillStyle = TEAL; gg.fill(); gg.fillStyle = '#ffffff'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.font = `900 58px ${FONT}`; gg.fillText('약', ww / 2, hh * 0.54);
    });
    mesh(geo.box, std('#ffffff', 0.6, { map: frontT }), g, [0, h / 2 - 0.02, 0], [w, h - 0.04, d]);
    mesh(geo.box, std('#e4ddd0', 0.35), g, [0, h - 0.02, 0.02], [w + 0.06, 0.04, d + 0.08]);   // 윗판
    // 카드 단말기(오른쪽)
    const term = new THREE.Group(); term.position.set(w / 2 - 0.22, h, -0.04); g.add(term);
    mesh(geo.box, std('#2c2f35', 0.4), term, [0, 0.03, 0], [0.09, 0.06, 0.16]);
    const scr = canvasTex(128, 128, (gg, ww, hh) => { gg.fillStyle = '#1a3550'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#9fe0ff'; gg.textAlign = 'center'; gg.font = `700 34px ${FONT}`; gg.fillText('카드', ww / 2, hh * 0.45); gg.font = `500 22px ${FONT}`; gg.fillText('CARD', ww / 2, hh * 0.72); });
    mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ map: scr }), term, [0, 0.065, 0.02], null, [-Math.PI / 2 + 0.5, 0, 0]).castShadow = false;
    // 계산기 화면(약사 쪽을 봄)
    const pos = new THREE.Group(); pos.position.set(-w / 2 + 0.3, h, -0.12); g.add(pos);
    mesh(geo.box, std('#3a3d44', 0.4), pos, [0, 0.12, 0], [0.04, 0.24, 0.04]);
    mesh(geo.box, std('#24272c', 0.4), pos, [0, 0.27, 0], [0.32, 0.2, 0.03], [0.2, Math.PI, 0]);
    return { g, top: h, term: V3(cx + w / 2 - 0.22, h + 0.07, cz - 0.04), w, d };
  }

  // ───────────── 약 선반(약사 뒤, 앞이 +z) ─────────────
  function shelf(parent, cx, cz, w = 2.6, d = 0.34, ys = [0.55, 0.95, 1.35, 1.75], h = 2.05) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const m = std('#f3f1ec', 0.5), edge = std(TEAL, 0.5);
    mesh(geo.box, m, g, [0, h / 2, -d / 2 + 0.02], [w, h, 0.04]);
    for (const sx of [-1, 0, 1]) mesh(geo.box, m, g, [sx * (w / 2 - 0.02), h / 2, 0], [0.04, h, d]);
    mesh(geo.box, std('#d9d4ca', 0.6), g, [0, 0.25, 0], [w, 0.5, d]);                                // 아래 서랍장
    for (let i = 0; i < 4; i++) mesh(geo.box, std('#c9c2b5', 0.5), g, [-w / 2 + (i + 0.5) * w / 4, 0.25, d / 2 + 0.005], [0.12, 0.02, 0.01]);   // 서랍 손잡이
    for (const y of ys) { mesh(geo.box, m, g, [0, y - 0.012, 0.01], [w - 0.04, 0.024, d - 0.02]); mesh(geo.box, edge, g, [0, y - 0.03, d / 2 - 0.01], [w - 0.04, 0.04, 0.012]); }
    return { g, ys, w, d };
  }

  // 약 상자 겉면: 흰 바탕 + 색 띠 + 몸 그림 + 몸 낱말(크게) + '하나 약국 · 연습용'(작게)
  const ICON = {
    meori: (g, x, y, s) => { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); },
    bae:   (g, x, y, s) => { g.beginPath(); g.ellipse(x, y, s * 0.8, s * 1.1, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x, y + s * 0.15, s * 0.12, 0, 7); g.fill(); },
    mok:   (g, x, y, s) => { g.beginPath(); g.arc(x, y - s * 0.55, s * 0.55, 0, 7); g.fill(); g.fillRect(x - s * 0.22, y - s * 0.1, s * 0.44, s * 0.6); g.fillRect(x - s * 0.8, y + s * 0.45, s * 1.6, s * 0.4); }
  };
  const boxCache = {};
  function medBox(key, word, color) {
    const tex = boxCache[key] || (boxCache[key] = canvasTex(512, 384, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = color; g.fillRect(0, 0, w, h * 0.16); g.fillRect(0, h * 0.86, w, h * 0.14);
      g.fillStyle = color; ICON[key](g, w * 0.24, h * 0.5, h * 0.16);
      g.fillStyle = '#222b33'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.round(h * 0.36)}px ${FONT}`; g.fillText(word, w * 0.64, h * 0.5);
      g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(h * 0.09)}px ${FONT}`; g.fillText('하나 약국 · 연습용', w / 2, h * 0.08);
    }));
    const grp = new THREE.Group();
    const side = std(color, 0.5), face = std('#ffffff', 0.45, { map: tex }), top = std('#f6f6f6', 0.5);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.125, 0.06), [side, side, top, top, face, face]); b.position.y = 0.0625; b.castShadow = true; grp.add(b);
    return grp;
  }
  // 꾸밈 상자(글씨 없음, 누를 수 없음)
  function plainBox(color, w = 0.1, h = 0.13, d = 0.06) {
    const tex = canvasTex(64, 64, (g, ww, hh) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, ww, hh); g.fillStyle = color; g.fillRect(0, 0, ww, hh * 0.3); g.fillRect(ww * 0.15, hh * 0.5, ww * 0.7, hh * 0.08); g.fillRect(ww * 0.15, hh * 0.66, ww * 0.5, hh * 0.08); });
    const face = std('#ffffff', 0.5, { map: tex }), side = std(color, 0.5), top = std('#f4f4f4', 0.5);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, face, face]); m.position.y = h / 2; m.castShadow = true;
    const g = new THREE.Group(); g.add(m); return g;
  }
  function bottle(color) {   // 작은 갈색 병(이름 없음)
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 16), std(color, 0.15, { transparent: true, opacity: 0.85 }), g, [0, 0.045, 0]);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 12), std('#ffffff', 0.4), g, [0, 0.1, 0]);
    return g;
  }
  // 약 봉투(종이): 앞에 '약' + 해 그림 셋(하루에 세 번)
  function medBag() {
    const t = canvasTex(256, 320, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = TEAL; g.fillRect(0, 0, w, 54);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 34px ${FONT}`; g.fillText('하나 약국', w / 2, 28);
      g.fillStyle = TEAL_D; g.font = `900 110px ${FONT}`; g.fillText('약', w / 2, 140);
      g.fillStyle = '#f2b233'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w / 2 + (i - 1) * 62, 250, 20, 0, 7); g.fill(); }
      g.fillStyle = '#5a6670'; g.font = `700 26px ${FONT}`; g.fillText('하루에 세 번', w / 2, 296);
    });
    const g = new THREE.Group(), face = std('#ffffff', 0.7, { map: t }), side = std('#f1efe9', 0.8);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.19, 0.035), [side, side, side, side, face, face]); b.position.y = 0.095; b.castShadow = true; g.add(b);
    return g;
  }
  function card() {   // 카드: 작은 받침 위 파란 카드(IC칩) — 2판과 같음
    const g = new THREE.Group();
    const t = canvasTex(256, 160, (gg, w, h) => {
      const gr = gg.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3b6fd8'); gr.addColorStop(1, '#6a3fc4'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#e8c45a'; gg.fillRect(28, 56, 44, 34); gg.strokeStyle = '#b8942e'; gg.strokeRect(28, 56, 44, 34);
      gg.fillStyle = '#ffffff'; gg.font = `900 40px ${FONT}`; gg.textAlign = 'right'; gg.fillText('카드', w - 20, h - 22);
    });
    mesh(geo.box, std('#d0cdc4', 0.6), g, [0, 0.006, 0], [0.12, 0.012, 0.08]);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.002, 0.054), [std('#3b5fc0', 0.4), std('#3b5fc0', 0.4), std('#ffffff', 0.35, { map: t }), std('#2a3f80', 0.4), std('#3b5fc0', 0.4), std('#3b5fc0', 0.4)]);
    c.position.y = 0.013; c.castShadow = true; g.add(c); g.userData.card = c;
    return g;
  }

  // ───────────── 몸 그림판(서 있는 판) ─────────────
  // 그림 좌표(512×768 캔버스) → 판 위 자리. 판 가로 BW·세로 BH, 판 아래 끝 높이 Y0.
  const BOARD = { W: 0.78, H: 1.17, Y0: 0.42, CW: 512, CH: 768 };
  const PARTS = {   // 누르는 자리(캔버스 좌표)와 누름 반지름(m)
    meori: { x: 256, y: 92,  r: 0.06 },
    nun:   { x: 300, y: 178, r: 0.032 },
    ko:    { x: 256, y: 214, r: 0.03 },
    i:     { x: 256, y: 258, r: 0.032 },
    mok:   { x: 256, y: 330, r: 0.04 },
    bae:   { x: 256, y: 478, r: 0.075 },
    son:   { x: 400, y: 560, r: 0.055 }
  };
  function bodyBoard(parent, cx, cz, ry) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; parent.add(g);
    const tex = canvasTex(BOARD.CW, BOARD.CH, (c, w, h) => {
      c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, w, h);
      c.lineWidth = 6; c.strokeStyle = TEAL; c.strokeRect(6, 6, w - 12, h - 12);
      const skin = '#f5d0b0', line = '#5a4636';
      c.lineCap = 'round'; c.lineJoin = 'round';
      // 다리
      c.fillStyle = '#3d4f7a'; c.fillRect(196, 590, 50, 150); c.fillRect(266, 590, 50, 150);
      c.fillStyle = '#ffffff'; c.fillRect(186, 728, 66, 22); c.fillRect(260, 728, 66, 22);
      // 팔(셔츠) + 손
      c.strokeStyle = '#8fc6dc'; c.lineWidth = 44; c.beginPath(); c.moveTo(178, 380); c.lineTo(122, 530); c.moveTo(334, 380); c.lineTo(390, 530); c.stroke();
      c.fillStyle = skin; for (const x of [112, 400]) { c.beginPath(); c.arc(x, 560, 34, 0, 7); c.fill(); }
      // 몸통(셔츠) + 배
      c.fillStyle = '#8fc6dc'; c.beginPath(); c.moveTo(170, 360); c.quadraticCurveTo(256, 340, 342, 360); c.lineTo(334, 600); c.quadraticCurveTo(256, 615, 178, 600); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(256, 478, 52, 58, 0, 0, 7); c.fill();
      c.fillStyle = line; c.beginPath(); c.arc(256, 490, 5, 0, 7); c.fill();
      // 목
      c.fillStyle = skin; c.fillRect(226, 296, 60, 66);
      // 머리(얼굴) + 머리카락
      c.fillStyle = skin; c.beginPath(); c.arc(256, 196, 104, 0, 7); c.fill();
      c.fillStyle = '#2b2522'; c.beginPath(); c.arc(256, 186, 108, Math.PI * 1.02, Math.PI * 1.98); c.fill();
      c.beginPath(); c.ellipse(256, 100, 96, 34, 0, 0, 7); c.fill();
      // 눈·코·입(이)
      c.fillStyle = '#2b2522'; for (const x of [212, 300]) { c.beginPath(); c.ellipse(x, 178, 13, 17, 0, 0, 7); c.fill(); }
      c.fillStyle = '#ffffff'; for (const x of [216, 304]) { c.beginPath(); c.arc(x, 172, 5, 0, 7); c.fill(); }
      c.strokeStyle = '#c48a62'; c.lineWidth = 6; c.beginPath(); c.moveTo(256, 196); c.quadraticCurveTo(246, 222, 258, 228); c.stroke();
      c.fillStyle = '#b8434a'; c.beginPath(); c.moveTo(220, 248); c.quadraticCurveTo(256, 296, 292, 248); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(226, 249, 60, 12);
      c.strokeStyle = '#d9d2c8'; c.lineWidth = 2; for (const x of [241, 256, 271]) { c.beginPath(); c.moveTo(x, 249); c.lineTo(x, 261); c.stroke(); }
      c.fillStyle = 'rgba(240,140,140,0.35)'; for (const x of [192, 320]) { c.beginPath(); c.arc(x, 222, 18, 0, 7); c.fill(); }
      // 위 제목
      c.fillStyle = TEAL; c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = `900 44px ${FONT}`; c.fillText('몸', 26, 40);
    });
    const face = std('#ffffff', 0.7, { map: tex }), edgeM = std('#e8e4dc', 0.6);
    const panel = new THREE.Mesh(geo.box, [edgeM, edgeM, edgeM, edgeM, face, edgeM]);   // 그림은 앞면(+z)에만
    panel.position.set(0, BOARD.Y0 + BOARD.H / 2, 0); panel.scale.set(BOARD.W, BOARD.H, 0.025); panel.castShadow = panel.receiveShadow = true; g.add(panel);
    // 다리 받침(이젤)
    const legM = std('#b08a5e', 0.6);
    for (const sx of [-1, 1]) mesh(geo.box, legM, g, [sx * (BOARD.W / 2 - 0.06), (BOARD.Y0 + BOARD.H) / 2, -0.035], [0.035, BOARD.Y0 + BOARD.H - 0.06, 0.035]);   // 판 뒤에(그림 위로 비져 나오지 않게)
    const back = mesh(geo.box, legM, g, [0, (BOARD.Y0 + BOARD.H) * 0.45, -0.22], [0.035, (BOARD.Y0 + BOARD.H) * 0.92, 0.035]); back.rotation.x = -0.22;
    mesh(geo.box, legM, g, [0, BOARD.Y0 - 0.02, 0.03], [BOARD.W, 0.04, 0.07]);   // 판 받침 턱
    const at = id => { const p = PARTS[id]; return V3((p.x / BOARD.CW - 0.5) * BOARD.W, BOARD.Y0 + (1 - p.y / BOARD.CH) * BOARD.H, 0.016); };
    return { g, at, PARTS, BOARD };
  }

  // 그림판 위 표시: 열(체온계 + 빨간 얼굴 김), 기침(말풍선 '콜록콜록')
  function signSprite(kind) {
    const t = canvasTex(256, 256, (g, w, h) => {
      if (kind === 'pain') {   // 아픈 곳: 빨간 동그라미 테 + 바깥으로 뻗는 욱신 줄(밝은 바탕·머리카락 위 어디서나 보이게)
        g.strokeStyle = '#e8352b'; g.lineCap = 'round'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 62, 0, 7); g.stroke();
        g.lineWidth = 12; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); g.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); g.stroke(); }
      } else if (kind === 'yeol') {
        g.fillStyle = '#ffffff'; g.strokeStyle = '#c0392b'; g.lineWidth = 8; g.beginPath(); g.roundRect ? g.roundRect(108, 26, 40, 160, 20) : g.rect(108, 26, 40, 160); g.fill(); g.stroke();
        g.fillStyle = '#e74c3c'; g.fillRect(120, 90, 16, 100); g.beginPath(); g.arc(128, 200, 34, 0, 7); g.fill();
        g.strokeStyle = '#e74c3c'; g.lineWidth = 6; for (const [x, y] of [[60, 70], [196, 70], [60, 140], [196, 140]]) { g.beginPath(); g.moveTo(x - 14, y); g.quadraticCurveTo(x, y - 18, x + 14, y); g.stroke(); }
      } else {
        g.fillStyle = '#ffffff'; g.strokeStyle = '#3a8fb7'; g.lineWidth = 8;
        g.beginPath(); g.ellipse(128, 110, 112, 74, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(60, 170); g.lineTo(36, 232); g.lineTo(104, 180); g.fill();
        g.fillStyle = '#2a4a5a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 46px ${FONT}`; g.fillText('콜록콜록', 128, 112);
      }
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(0.2, 0.2, 1); return s;
  }

  return { build, counter, shelf, medBox, plainBox, bottle, medBag, card, bodyBoard, signSprite, SHOP };
})();
