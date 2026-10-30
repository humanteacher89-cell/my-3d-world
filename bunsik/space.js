/* 「분식집에 가요」 분식집 공간·음식 (2026-10-21) — 모두 코드로 짓고 글씨는 캔버스로 그린다(내려받기 없음, 실제 상표 없음). 2판 store/space.js의 틀을 이어 씀.
   벽·바닥·천장·간판은 VR·화면에서만(H.vrOnly — 혼합현실에서는 실제 방). 조리대·음식·메뉴판·탁자·정수기는 혼합현실에서도 보인다(H.world).
   좌표: 사용자는 +Z(입구) 쪽에서 -Z(안쪽)를 본다. 바닥 y=0. 가게 안 x -2.3~2.3, z -2.4~2.6. 단위 m.                         */
window.BUNSIK_SPACE = (function () {
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
  const texCache = {}, matCache = {};
  const cached = (k, f) => texCache[k] || (texCache[k] = f());
  const M = (c, r = 0.5, o) => o ? std(c, r, o) : (matCache[c + r] || (matCache[c + r] = std(c, r)));
  const steel = () => matCache.steel || (matCache.steel = std('#c9cdd2', 0.3, { metalness: 0.45 }));
  const noShadow = m => { m.castShadow = false; return m; };

  // ───────────── 가게 바탕(벽·바닥·천장·간판) ─────────────
  const SHOP = { x0: -2.3, x1: 2.3, z0: -2.4, z1: 2.6, h: 2.7 };
  function build(opts = {}) {
    const root = new THREE.Group(); H.vrOnly.add(root);
    const W = SHOP.x1 - SHOP.x0, D = SHOP.z1 - SHOP.z0, cx = (SHOP.x0 + SHOP.x1) / 2, cz = (SHOP.z0 + SHOP.z1) / 2;
    // 바닥: 따뜻한 갈색 타일
    const floorT = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#cdb79a'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 128) { g.fillStyle = `hsl(32,${22 + rnd() * 6}%,${66 + rnd() * 6}%)`; g.fillRect(x + 2, y + 2, 124, 124); }
      g.fillStyle = 'rgba(90,70,50,0.35)'; for (let i = 0; i <= w; i += 128) { g.fillRect(i - 1, 0, 3, h); g.fillRect(0, i - 1, w, 3); }
    }, [W / 1.0, D / 1.0]);
    const floor = mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', 0.6, { map: floorT }), root, [cx, 0.001, cz], null, [-Math.PI / 2, 0, 0]); floor.receiveShadow = true; floor.castShadow = false;
    // 벽: 크림색 벽 + 아래쪽 하얀 타일(분식집 주방 느낌) + 빨간 띠
    const wallT = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#fbf1de'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4f4f0'; g.fillRect(0, h * 0.62, w, h * 0.38);
      g.strokeStyle = 'rgba(150,150,140,0.45)'; g.lineWidth = 2;
      for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, h * 0.62); g.lineTo(x, h); g.stroke(); }
      for (let y = h * 0.62; y <= h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#d8402f'; g.fillRect(0, h * 0.58, w, h * 0.04);
    }, [3, 1]);
    const wallM = std('#ffffff', 0.9, { map: wallT });
    const walls = [[cx, SHOP.z0, W, 0], [SHOP.x0, cz, D, Math.PI / 2], [SHOP.x1, cz, D, -Math.PI / 2]];
    for (const [x, z, len, ry] of walls) { const m = mesh(new THREE.PlaneGeometry(len, SHOP.h), wallM, root, [x, SHOP.h / 2, z], null, [0, ry, 0]); m.castShadow = false; m.receiveShadow = true; }
    // 앞(입구) 벽: 유리문
    const glass = std('#bfe3ef', 0.1, { transparent: true, opacity: 0.35 });
    noShadow(mesh(new THREE.PlaneGeometry(W, SHOP.h), glass, root, [cx, SHOP.h / 2, SHOP.z1], null, [0, Math.PI, 0]));
    for (const x of [-2.3, -0.8, 0.8, 2.3]) mesh(geo.box, std('#8a7a6a', 0.5), root, [x, SHOP.h / 2, SHOP.z1], [0.06, SHOP.h, 0.06]);
    // 천장 + 둥근 등
    noShadow(mesh(new THREE.PlaneGeometry(W, D), std('#f6f1e8', 0.95), root, [cx, SHOP.h, cz], null, [Math.PI / 2, 0, 0]));
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
    for (const [x, z] of [[-1.6, -0.8], [0.5, -0.8], [1.45, -0.25], [-0.6, 1.0]]) {
      mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 6), M('#333333'), root, [x, SHOP.h - 0.25, z]);
      noShadow(mesh(new THREE.SphereGeometry(0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#d8402f', 0.5), root, [x, SHOP.h - 0.5, z]));
      noShadow(mesh(geo.lowSphere || geo.sphere, lampM, root, [x, SHOP.h - 0.52, z], [0.05, 0.05, 0.05]));
    }
    // 간판(안쪽 벽 위): 빨간 바탕에 흰 글씨
    const signT = canvasTex(1024, 192, (g, w, h) => {
      g.fillStyle = '#d8402f'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd34d'; g.fillRect(0, h - 18, w, 8);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 112px ${FONT}`; g.fillText(opts.name || '분식', w / 2, h * 0.47);
    });
    noShadow(mesh(geo.box, std('#ffffff', 0.5, { map: signT, emissive: H.hex('#ffffff'), emissiveMap: signT, emissiveIntensity: 0.35 }), root, [-0.55, 2.48, SHOP.z0 + 0.04], [1.6, 0.3, 0.04]));
    // 벽 장식: 둥근 '분식' 붙임 글
    const tBun = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill(); g.fillStyle = '#7a2a12'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 84px ${FONT}`; g.fillText('분식', w / 2, h / 2 + 4); });
    noShadow(mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshBasicMaterial({ map: tBun }), root, [SHOP.x1 - 0.02, 1.8, -1.2], null, [0, -Math.PI / 2, 0]));
    const outT = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#cfe6f6'); gr.addColorStop(1, '#f6efe2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    noShadow(mesh(new THREE.PlaneGeometry(W * 3, SHOP.h * 2), new THREE.MeshBasicMaterial({ map: outT }), root, [cx, SHOP.h / 2, SHOP.z1 + 2], null, [0, Math.PI, 0]));
    return { root };
  }

  // ───────────── 가구 ─────────────
  // 조리대(손님 쪽 +z): 스테인리스 윗판 + 흰 앞판(빨간 띠). 점원 뒤 선반(꾸밈).
  function counter(parent, cx, cz, w, d, h) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const frontT = canvasTex(1024, 256, (gg, ww, hh) => { gg.fillStyle = '#fbfaf6'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#d8402f'; gg.fillRect(0, hh * 0.08, ww, hh * 0.12); gg.fillStyle = '#ffd34d'; gg.fillRect(0, hh * 0.2, ww, hh * 0.03); gg.fillStyle = '#cfc6b8'; gg.fillRect(0, hh * 0.9, ww, hh * 0.1); });
    mesh(geo.box, std('#ffffff', 0.6, { map: frontT }), g, [0, h / 2 - 0.02, 0], [w, h - 0.04, d]);
    mesh(geo.box, steel(), g, [0, h - 0.02, 0.01], [w + 0.04, 0.04, d + 0.06]);   // 윗판
    // 점원 뒤 선반: 그릇·양념통
    const back = new THREE.Group(); back.position.set(0, 0, -d / 2 - 0.78); g.add(back);
    mesh(geo.box, std('#e8dfd0', 0.7), back, [0, 0.45, 0], [w, 0.9, 0.3]);
    mesh(geo.box, steel(), back, [0, 0.91, 0], [w, 0.02, 0.32]);
    for (let i = 0; i < 7; i++) { const x = -w / 2 + 0.25 + i * (w - 0.5) / 6;
      for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.035, 18), M(['#ffffff', '#f2e6cf', '#e9eef2'][i % 3], 0.4), back, [x, 0.94 + k * 0.03, 0]); }
    // 벽 선반(양념통): 벽에 붙은 것이라 VR·화면에서만 — 혼합현실에서 허공에 뜨지 않게
    const ws = new THREE.Group(); ws.position.set(cx, 0, cz - d / 2 - 0.78); H.vrOnly.add(ws);
    mesh(geo.box, std('#e8dfd0', 0.7), ws, [0, 1.55, 0.05], [w, 0.03, 0.25]);
    for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), M(['#d8402f', '#f2b233', '#7a4a2a'][i % 3], 0.4), ws, [-w / 2 + 0.4 + i * 0.36, 1.65, 0.05]);
    return { g, top: h, w, d };
  }
  // 메뉴판: 다리 둘 위에 선 판(혼합현실에서도 보이게 H.world). 낱말·값을 크게 또렷하게.
  function menuBoard(parent, x, y, z, menu) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const W = 1.5, Hh = 0.66;
    const t = canvasTex(1536, 676, (c, w, h) => {
      c.fillStyle = '#2b2622'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d8402f'; c.fillRect(0, 0, w, 96);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 66px ${FONT}`; c.fillText('메뉴', w / 2, 50);
      const colW = w / 2, rowH = (h - 120) / 3;
      menu.forEach((m, i) => {
        const col = i % 2, row = Math.floor(i / 2), x0 = col * colW + 70, yy = 120 + row * rowH + rowH / 2;
        c.textAlign = 'left'; c.fillStyle = '#fff6e0'; c.font = `900 84px ${FONT}`; c.fillText(m.ko, x0, yy);
        c.textAlign = 'right'; c.fillStyle = '#ffd34d'; c.font = `800 64px ${FONT}`; c.fillText(m.price.toLocaleString('ko-KR') + '원', x0 + colW - 130, yy + 4);
        c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x0, yy + rowH / 2 - 2, colW - 130, 3);
      });
    });
    noShadow(mesh(geo.box, std('#ffffff', 0.7, { map: t, emissive: H.hex('#ffffff'), emissiveMap: t, emissiveIntensity: 0.25 }), g, [0, y, 0], [W, Hh, 0.03]));
    mesh(geo.box, std('#5a3a22', 0.6), g, [0, y, -0.02], [W + 0.06, Hh + 0.06, 0.02]);
    for (const sx of [-1, 1]) mesh(geo.box, std('#5a3a22', 0.6), g, [sx * (W / 2 - 0.05), (y - Hh / 2) / 2, -0.03], [0.04, y - Hh / 2, 0.04]);
    g.userData.size = V3(W, Hh, 0.05); g.userData.center = V3(0, y, 0);
    return g;
  }
  // 손님 탁자 + 의자 둘
  function table(parent, cx, cz, w = 0.8, d = 0.6, h = 0.72) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    mesh(geo.box, std('#f3ece0', 0.45), g, [0, h - 0.015, 0], [w, 0.03, d]);
    mesh(geo.box, std('#d8402f', 0.5), g, [0, h - 0.035, 0], [w + 0.01, 0.012, d + 0.01]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(geo.box, steel(), g, [sx * (w / 2 - 0.05), (h - 0.03) / 2, sz * (d / 2 - 0.05)], [0.03, h - 0.03, 0.03]);
    for (const sz of [-1, 1]) { const st = new THREE.Group(); st.position.set(0, 0, sz * (d / 2 + 0.22)); g.add(st);
      mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), M('#d8402f', 0.4), st, [0, 0.45, 0]);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; mesh(geo.box, steel(), st, [Math.cos(a) * 0.1, 0.215, Math.sin(a) * 0.1], [0.02, 0.43, 0.02]); } }
    // 수저통·휴지(꾸밈)
    const sp = new THREE.Group(); sp.position.set(w / 2 - 0.12, h, -d / 2 + 0.1); g.add(sp);
    mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 14), steel(), sp, [0, 0.05, 0]);
    for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 5), M('#b9bec4', 0.3), sp, [(i % 3 - 1) * 0.012, 0.13, (i < 3 ? -1 : 1) * 0.008]);
    mesh(geo.box, M('#ffffff', 0.8), g, [-w / 2 + 0.12, h + 0.04, -d / 2 + 0.1], [0.12, 0.08, 0.1]);
    return { g, top: h, w, d };
  }

  // ───────────── 낱말 모양 — 바닥 가운데가 원점, 앞이 +z ─────────────
  // 조리대 위 '진열'(station)과 쟁반에 올릴 '한 그릇'(dish) 두 가지
  const sauce = (c = '#c8321e') => M(c, 0.25);
  function rice(g, n, area, y, red) {   // 떡: 흰 가래떡 토막(빨간 양념이 묻은)
    const m = M(red ? '#f0a58e' : '#f6eee0', 0.45);
    for (let i = 0; i < n; i++) { const t = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.055, 10), m, g, [(rnd() - 0.5) * area[0], y + rnd() * 0.01, (rnd() - 0.5) * area[1]]); t.rotation.order = 'YXZ'; t.rotation.set(Math.PI / 2, rnd() * Math.PI, 0); }   // 눕힌 뒤 아무 쪽으로나 돌림
  }
  function fishTri(g, n, area, y) {   // 떡볶이 속 어묵 세모
    for (let i = 0; i < n; i++) { const t = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 3), M('#d99a55', 0.5), g, [(rnd() - 0.5) * area[0], y + 0.006, (rnd() - 0.5) * area[1]]); t.rotation.set(rnd() * 0.4, rnd() * 3, rnd() * 0.4); }
  }
  function onions(g, n, area, y) { for (let i = 0; i < n; i++) { const t = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8), M('#5aa64a', 0.5), g, [(rnd() - 0.5) * area[0], y + 0.012, (rnd() - 0.5) * area[1]]); t.castShadow = false; } }
  function bowl(g, r, h, c = '#ffffff') {   // 넓은 접시·그릇
    const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector2(r * (0.55 + 0.45 * Math.sin(k * Math.PI / 2)), h * k)); }
    const b = mesh(new THREE.LatheGeometry(pts, 28), std(c, 0.35, { side: THREE.DoubleSide }), g, [0, 0, 0]);
    return b;
  }
  // 떡볶이
  function tteokStation() {
    const g = new THREE.Group(), w = 0.44, d = 0.3;
    mesh(geo.box, M('#2b2b2e', 0.4), g, [0, 0.02, 0], [w + 0.04, 0.04, d + 0.04]);   // 버너 받침
    mesh(geo.box, steel(), g, [0, 0.05, 0], [w, 0.012, d]);
    for (const [sx, sz, ww, dd] of [[0, 1, w, 0.01], [0, -1, w, 0.01], [1, 0, 0.01, d], [-1, 0, 0.01, d]]) mesh(geo.box, steel(), g, [sx * w / 2, 0.075, sz * d / 2], [ww, 0.05, dd]);
    noShadow(mesh(geo.box, sauce(), g, [0, 0.062, 0], [w - 0.02, 0.012, d - 0.02]));
    rice(g, 44, [w - 0.06, d - 0.06], 0.072, true); fishTri(g, 12, [w - 0.08, d - 0.08], 0.07); onions(g, 18, [w - 0.06, d - 0.06], 0.07);
    return g;
  }
  function tteokDish(o = {}) {
    const g = new THREE.Group(); bowl(g, 0.085, 0.035);
    noShadow(mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.012, 24), sauce(o.mild ? '#e0782f' : '#c8321e'), g, [0, 0.02, 0]));
    rice(g, 12, [0.07, 0.07], 0.034, !o.mild); fishTri(g, 4, [0.07, 0.07], 0.03); onions(g, 5, [0.07, 0.07], 0.03);
    return g;
  }
  // 어묵: 꼬치에 접힌 어묵
  function skewer(g, x, z, tilt) {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.set(tilt, 0, tilt * 0.6); g.add(s);
    mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.26, 5), M('#d9c09a', 0.6), s, [0, 0.13, 0]);
    const fm = M('#d9a463', 0.55);
    for (let k = 0; k < 5; k++) mesh(geo.box, fm, s, [(k % 2 ? 1 : -1) * 0.014, 0.045 + k * 0.024, 0], [0.05, 0.028, 0.01]).rotation.z = (k % 2 ? 0.45 : -0.45);
    return s;
  }
  function eomukStation() {
    const g = new THREE.Group(), w = 0.3, d = 0.24, h = 0.1;
    mesh(geo.box, M('#2b2b2e', 0.4), g, [0, 0.015, 0], [w + 0.03, 0.03, d + 0.03]);
    for (const [sx, sz, ww, dd] of [[0, 1, w, 0.008], [0, -1, w, 0.008], [1, 0, 0.008, d], [-1, 0, 0.008, d]]) mesh(geo.box, steel(), g, [sx * w / 2, 0.03 + h / 2, sz * d / 2], [ww, h, dd]);
    mesh(geo.box, steel(), g, [0, 0.032, 0], [w, 0.004, d]);
    noShadow(mesh(geo.box, M('#b9884a', 0.2, { transparent: true, opacity: 0.85 }), g, [0, 0.03 + h * 0.75, 0], [w - 0.01, 0.006, d - 0.01]));   // 국물
    for (let i = 0; i < 8; i++) skewer(g, -0.1 + (i % 4) * 0.066, (i < 4 ? -0.05 : 0.05), -0.25 + (i % 2) * 0.12).position.y = 0.04;
    const ladle = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.25, 6), steel(), g, [0.12, 0.17, 0.06]); ladle.rotation.z = 0.5;
    return g;
  }
  function eomukDish() {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.012, 24), M('#ffffff', 0.35), g, [0, 0.006, 0]);
    const a = skewer(g, -0.025, 0, Math.PI / 2 - 0.05); a.position.y = 0.02; a.rotation.set(0, 0.3, Math.PI / 2 - 0.05); a.position.x = 0.11;
    const b = skewer(g, 0.025, 0.03, 0); b.position.y = 0.02; b.rotation.set(0, -0.2, Math.PI / 2 + 0.05); b.position.x = 0.11; b.position.z = 0.035;
    const cup = new THREE.Group(); cup.position.set(-0.05, 0, -0.07); g.add(cup);   // 국물 컵
    mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.07, 16, 1, true), std('#ffffff', 0.5, { side: THREE.DoubleSide }), cup, [0, 0.035, 0]);
    noShadow(mesh(new THREE.CircleGeometry(0.028, 16), M('#b9884a', 0.2), cup, [0, 0.06, 0], null, [-Math.PI / 2, 0, 0]));
    return g;
  }
  // 튀김: 유리 덮개 쟁반에 노란 튀김
  function friedPiece(g, x, z, kind, rot) {
    const m = M(['#e3a53e', '#d8952f', '#eab454'][kind], 0.75), y = 0.02;
    let p;
    if (kind === 0) p = mesh(geo.sphere, m, g, [x, y, z], [0.085, 0.03, 0.03]);            // 새우·오징어 길쭉
    else if (kind === 1) p = mesh(geo.sphere, m, g, [x, y, z], [0.06, 0.022, 0.045]);       // 고구마 납작
    else p = mesh(geo.sphere, m, g, [x, y + 0.004, z], [0.05, 0.035, 0.05]);                // 김말이 둥글
    p.rotation.y = rot; return p;
  }
  function twigimStation() {
    const g = new THREE.Group(), w = 0.36, d = 0.26;
    mesh(geo.box, steel(), g, [0, 0.005, 0], [w, 0.01, d]);
    const paper = noShadow(mesh(geo.box, M('#f6ecd2', 0.9), g, [0, 0.012, 0], [w - 0.03, 0.002, d - 0.03]));
    for (let i = 0; i < 12; i++) friedPiece(g, -0.12 + (i % 4) * 0.08, -0.07 + Math.floor(i / 4) * 0.07, i % 3, rnd() * 3);
    const cover = noShadow(mesh(geo.box, std('#e9f6ff', 0.7, { transparent: true, opacity: 0.14, depthWrite: false }), g, [0, 0.07, 0], [w, 0.12, d])); cover.renderOrder = 2;
    mesh(geo.box, steel(), g, [0, 0.13, 0], [w + 0.01, 0.006, d + 0.01]);
    return g;
  }
  function twigimDish() {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.012, 24), M('#ffffff', 0.35), g, [0, 0.006, 0]);
    noShadow(mesh(geo.box, M('#f6ecd2', 0.9), g, [0, 0.013, 0], [0.1, 0.002, 0.1])).rotation.y = 0.4;
    friedPiece(g, -0.02, -0.02, 0, 0.4).position.y = 0.03; friedPiece(g, 0.03, 0.02, 1, -0.3).position.y = 0.03; friedPiece(g, -0.03, 0.035, 2, 0).position.y = 0.032;
    return g;
  }
  // 순대: 찜기 위 둥글게 감긴 순대 + 썬 것
  function sundaeSlice(g, x, y, z, ry) {
    const s = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 14), M('#3a2a2f', 0.6), g, [x, y, z]); s.rotation.set(Math.PI / 2 - 0.25, ry, 0);
    const f = noShadow(mesh(new THREE.CircleGeometry(0.014, 12), M('#6b4a4f', 0.8), s, [0, 0.0062, 0], null, [-Math.PI / 2, 0, 0]));
    return s;
  }
  function sundaeStation() {
    const g = new THREE.Group(), r = 0.15;
    mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.12, 28, 1, true), std('#c9cdd2', 0.3, { metalness: 0.45, side: THREE.DoubleSide }), g, [0, 0.06, 0]);
    mesh(new THREE.CylinderGeometry(r - 0.005, r - 0.005, 0.006, 28), steel(), g, [0, 0.1, 0]);
    const coil = mesh(new THREE.TorusGeometry(0.08, 0.018, 10, 36, Math.PI * 1.7), M('#3a2a2f', 0.55), g, [0, 0.12, 0]); coil.rotation.x = -Math.PI / 2;
    const coil2 = mesh(new THREE.TorusGeometry(0.045, 0.018, 10, 30, Math.PI * 1.6), M('#3a2a2f', 0.55), g, [0, 0.12, 0]); coil2.rotation.set(-Math.PI / 2, 0, 1.2);
    for (let i = 0; i < 5; i++) sundaeSlice(g, 0.06 + i * 0.014, 0.125, 0.07 - i * 0.01, 0.3);
    noShadow(mesh(new THREE.CircleGeometry(r, 28), std('#ffffff', 0.3, { transparent: true, opacity: 0.12 }), g, [0, 0.16, 0], null, [-Math.PI / 2, 0, 0]));   // 김
    return g;
  }
  function sundaeDish() {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.012, 24), M('#ffffff', 0.35), g, [0, 0.006, 0]);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 1.6 - 0.4; sundaeSlice(g, Math.cos(a) * 0.045, 0.026, Math.sin(a) * 0.045, -a); }
    mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.012, 12), M('#f2f2f2', 0.4), g, [0, 0.018, 0]);   // 소금 종지
    return g;
  }
  // 김밥: 썬 김밥(2판 모양) — 도마 위 한 줄 + 썬 것 / 접시
  function gimbapSlice(g, x, y, z) {
    const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.x = -Math.PI / 2 + 0.35; g.add(s);
    const r = 0.022, t = 0.016;
    mesh(new THREE.CylinderGeometry(r, r, t, 18), M('#1f2a1f', 0.7), s);
    noShadow(mesh(new THREE.CircleGeometry(r * 0.88, 18), M('#f4f1e8', 0.8), s, [0, t * 0.51, 0], null, [-Math.PI / 2, 0, 0]));
    ['#f2c53d', '#e2574c', '#5fb36b', '#d98a3a'].forEach((c, k) => { const a = k / 4 * Math.PI * 2; noShadow(mesh(new THREE.CircleGeometry(r * 0.22, 8), M(c, 0.6), s, [Math.cos(a) * r * 0.32, t * 0.52, Math.sin(a) * r * 0.32], null, [-Math.PI / 2, 0, 0])); });
    return s;
  }
  function gimbapStation() {
    const g = new THREE.Group();
    mesh(geo.box, std('#d9b48a', 0.7), g, [0, 0.01, 0], [0.3, 0.02, 0.2]);   // 도마
    const roll = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 18), M('#1f2a1f', 0.7), g, [0, 0.043, -0.05]); roll.rotation.z = Math.PI / 2;
    for (let i = 0; i < 7; i++) gimbapSlice(g, -0.1 + i * 0.03, 0.04, 0.04);
    return g;
  }
  function gimbapDish() {
    const g = new THREE.Group();
    mesh(geo.box, M('#ffffff', 0.35), g, [0, 0.005, 0], [0.18, 0.01, 0.09]);
    for (let i = 0; i < 8; i++) gimbapSlice(g, -0.07 + i * 0.02, 0.032, 0);
    return g;
  }
  // 라면: 노란 양은냄비(손잡이 둘) + 꼬불꼬불 면 + 달걀 + 파
  function ramenPot(g, s = 1) {
    const r = 0.085 * s, h = 0.06 * s, pm = std('#e8b84a', 0.3, { metalness: 0.5, side: THREE.DoubleSide });
    mesh(new THREE.CylinderGeometry(r, r * 0.92, h, 28, 1, true), pm, g, [0, h / 2, 0]);
    mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.003, 28), pm, g, [0, 0.0015, 0]);
    for (const sx of [-1, 1]) { const hd = mesh(new THREE.TorusGeometry(0.02 * s, 0.004 * s, 6, 12, Math.PI), pm, g, [sx * (r + 0.012 * s), h * 0.85, 0]); hd.rotation.set(Math.PI / 2, 0, sx > 0 ? -Math.PI / 2 : Math.PI / 2); }
    noShadow(mesh(new THREE.CircleGeometry(r * 0.96, 28), M('#d4552a', 0.25), g, [0, h * 0.78, 0], null, [-Math.PI / 2, 0, 0]));
    const nm = M('#f0d58a', 0.55);
    for (let i = 0; i < 16; i++) { const t = mesh(new THREE.TorusGeometry(0.012 * s, 0.0025 * s, 5, 10), nm, g, [(rnd() - 0.5) * r * 1.3, h * 0.8, (rnd() - 0.5) * r * 1.3]); t.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.6, 0, rnd() * 3); }
    const egg = new THREE.Group(); egg.position.set(r * 0.25, h * 0.82, -r * 0.2); g.add(egg);
    noShadow(mesh(new THREE.CircleGeometry(0.03 * s, 18), M('#ffffff', 0.5), egg, [0, 0, 0], null, [-Math.PI / 2, 0, 0]));
    mesh(geo.sphere, M('#f5b52e', 0.4), egg, [0, 0.003, 0], [0.026 * s, 0.012 * s, 0.026 * s]);
    onions(g, 8, [r, r], h * 0.78);
  }
  function ramenStation() {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), M('#2b2b2e', 0.4), g, [0, 0.02, 0]);   // 가스레인지
    const pot = new THREE.Group(); pot.position.y = 0.045; g.add(pot); ramenPot(pot, 1);
    return g;
  }
  function ramenDish() { const g = new THREE.Group(); ramenPot(g, 0.9); return g; }
  // 물: 정수기 + 컵 / 탁자 위 물컵
  function waterStation() {
    const g = new THREE.Group();
    mesh(geo.box, M('#f2f2f0', 0.4), g, [0, 0.55, 0], [0.32, 1.1, 0.34]);
    const t = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#3d8fd1'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 74px ${FONT}`; c.fillText('물', w / 2, h / 2 + 4); });
    noShadow(mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: t }), g, [0, 0.95, 0.171]));
    mesh(geo.box, M('#2b3138', 0.4), g, [0, 0.72, 0.13], [0.2, 0.12, 0.1]);
    for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), sx < 0 ? M('#3d8fd1', 0.4) : M('#d8402f', 0.4), g, [sx * 0.05, 0.65, 0.16]);
    mesh(geo.box, M('#9aa3ab', 0.4), g, [0, 0.5, 0.15], [0.2, 0.01, 0.08]);
    for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.025, 0.021, 0.075, 14), std('#cfe8f7', 0.1, { metalness: 0.6 }), g, [0.1, 1.11 + i * 0.012, 0.08]);   // 스테인리스 컵 쌓음
    return g;
  }
  function waterCup() {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.085, 16, 1, true), std('#cfd8de', 0.15, { metalness: 0.6, side: THREE.DoubleSide }), g, [0, 0.0425, 0]);
    noShadow(mesh(new THREE.CircleGeometry(0.028, 16), std('#bfe3f5', 0.1, { transparent: true, opacity: 0.7 }), g, [0, 0.07, 0], null, [-Math.PI / 2, 0, 0]));
    return g;
  }
  // 포장: 포장 용기 쌓음 + 비닐봉투
  function pojangStation() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.05, 20), std('#ffffff', 0.4, { transparent: true, opacity: 0.85 }), g, [-0.05, 0.025 + i * 0.012, 0]);
    mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.008, 20), M('#d8402f', 0.4), g, [-0.05, 0.085, 0]);
    const bagT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8402f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 64px ${FONT}`; c.fillText('포장', w / 2, h / 2 + 3); });
    const bag = mesh(geo.sphere, M('#f7f7f4', 0.6), g, [0.07, 0.09, 0], [0.12, 0.18, 0.07]);
    noShadow(mesh(new THREE.PlaneGeometry(0.075, 0.037), new THREE.MeshBasicMaterial({ map: bagT }), g, [0.07, 0.09, 0.036]));
    for (const sx of [-1, 1]) mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI), M('#f7f7f4', 0.6), g, [0.07 + sx * 0.03, 0.17, 0]);
    return g;
  }
  function takeoutBag() {   // 포장해 줄 때 음식이 들어가는 봉투
    const g = new THREE.Group();
    mesh(geo.sphere, M('#f7f7f4', 0.6), g, [0, 0.12, 0], [0.28, 0.24, 0.16]);
    for (const sx of [-1, 1]) mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 12, Math.PI), M('#f7f7f4', 0.6), g, [sx * 0.05, 0.235, 0]);
    return g;
  }
  // 현금: 연습용 만 원짜리(실제 지폐 그림 아님) 한 장이 작은 돈받침 위에
  function cashStation() {
    const g = new THREE.Group();
    mesh(geo.box, M('#7a4a2a', 0.6), g, [0, 0.006, 0], [0.2, 0.012, 0.13]);   // 돈받침(나무)
    const t = cached('bill', () => canvasTex(512, 240, (c, w, h) => {
      c.fillStyle = '#d9ecd0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5c8f55'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = '#5c8f55'; c.beginPath(); c.arc(w * 0.78, h * 0.5, 62, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 50px ${FONT}`; c.fillText('만', w * 0.78, h * 0.5 + 2);
      c.fillStyle = '#2f5a2c'; c.textAlign = 'left'; c.font = `900 72px ${FONT}`; c.fillText('10000원', 34, h * 0.42);
      c.font = `700 34px ${FONT}`; c.fillText('만 원 · 연습용', 38, h * 0.74);
    }));
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.002, 0.07), [M('#d9ecd0', 0.6), M('#d9ecd0', 0.6), std('#ffffff', 0.6, { map: t }), M('#d9ecd0', 0.6), M('#d9ecd0', 0.6), M('#d9ecd0', 0.6)]);
    bill.position.y = 0.014; bill.castShadow = true; g.add(bill); g.userData.bill = bill;
    return g;
  }
  function tray() {   // 쟁반
    const g = new THREE.Group(), w = 0.46, d = 0.3;
    mesh(geo.box, M('#b5432f', 0.4), g, [0, 0.006, 0], [w, 0.012, d]);
    for (const [sx, sz, ww, dd] of [[0, 1, w, 0.01], [0, -1, w, 0.01], [1, 0, 0.01, d], [-1, 0, 0.01, d]]) mesh(geo.box, M('#b5432f', 0.4), g, [sx * w / 2, 0.016, sz * d / 2], [ww, 0.02, dd]);
    return g;
  }
  const STATION = { tteokbokki: tteokStation, eomuk: eomukStation, twigim: twigimStation, sundae: sundaeStation, gimbap: gimbapStation, ramyeon: ramenStation, mul: waterStation, pojang: pojangStation, hyeongeum: cashStation };
  const DISH = { tteokbokki: tteokDish, eomuk: eomukDish, twigim: twigimDish, sundae: sundaeDish, gimbap: gimbapDish, ramyeon: ramenDish, mul: waterCup };
  const shadowAll = g => { g.traverse(o => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; }); return g; };
  const station = id => shadowAll(STATION[id]());
  const dish = (id, o) => shadowAll(DISH[id](o));

  // 값표(조리대 앞판에 붙는 작은 표)
  function priceTag(parent, x, y, z, price) {
    const t = canvasTex(256, 112, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8402f'; g.fillRect(0, 0, w, 16); g.fillStyle = '#222222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 54px ${FONT}`; g.fillText(price.toLocaleString('ko-KR') + '원', w / 2, h * 0.6); });
    const m = mesh(new THREE.PlaneGeometry(0.11, 0.048), new THREE.MeshBasicMaterial({ map: t }), parent, [x, y, z]); m.castShadow = false; return m;
  }

  return { build, counter, menuBoard, table, station, dish, takeoutBag, tray, priceTag, SHOP };
})();
