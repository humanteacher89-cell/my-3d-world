/* 「편의점에 가요」 편의점 공간·상품 (2026-10-20) — 모두 코드로 짓고 글씨·무늬는 캔버스로 그린다(내려받기 없음, 실제 상표 없음).
   벽·바닥·천장·간판은 VR·화면에서만(H.vrOnly — 혼합현실에서는 실제 방). 계산대·선반·냉장고·냉동고는 혼합현실에서도 보인다(H.world).
   좌표: 사용자는 +Z(입구) 쪽에서 -Z(안쪽)를 본다. 바닥 y=0. 가게 안 x -2.3~2.3, z -2.3~2.6. 단위 m.                         */
window.STORE_SPACE = (function () {
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
  const rnd = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const texCache = {};
  const cached = (k, f) => texCache[k] || (texCache[k] = f());

  // 상품 겉면: 바탕색 + 띠 + 한글 이름(크게)
  function labelTex(key, bg, band, text, ink, o = {}) {
    return cached('lab_' + key, () => canvasTex(o.w || 256, o.h || 256, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (band) { g.fillStyle = band; g.fillRect(0, h * (o.bandY || 0.62), w, h * (o.bandH || 0.2)); }
      if (o.dots) { g.fillStyle = o.dots; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.55, 4 + rnd() * 7, 0, 7); g.fill(); } }
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${Math.round((o.size || 0.3) * h)}px ${FONT}`; g.fillText(text, w / 2, h * (o.textY || 0.38));
    }));
  }

  // ───────────── 가게 바탕(벽·바닥·천장·간판) ─────────────
  const SHOP = { x0: -2.3, x1: 2.3, z0: -2.3, z1: 2.6, h: 2.7 };
  function build(opts = {}) {
    const root = new THREE.Group(); H.vrOnly.add(root);
    const W = SHOP.x1 - SHOP.x0, D = SHOP.z1 - SHOP.z0, cx = (SHOP.x0 + SHOP.x1) / 2, cz = (SHOP.z0 + SHOP.z1) / 2;
    // 바닥: 밝은 회색 타일
    const floorT = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#e9e6df'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 128) { g.fillStyle = `hsl(40,8%,${86 + rnd() * 5}%)`; g.fillRect(x + 2, y + 2, 124, 124); }
      g.fillStyle = 'rgba(120,115,105,0.35)'; for (let i = 0; i <= w; i += 128) { g.fillRect(i - 1, 0, 3, h); g.fillRect(0, i - 1, w, 3); }
    }, [W / 1.2, D / 1.2]);
    const floor = mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', 0.55, { map: floorT }), root, [cx, 0.001, cz], null, [-Math.PI / 2, 0, 0]); floor.receiveShadow = true; floor.castShadow = false;
    // 벽: 흰 벽 + 아래쪽 초록 띠(가게 색)
    const wallT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f6f5f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f9e5c'; g.fillRect(0, h * 0.8, w, h * 0.06); g.fillStyle = '#d9d6cc'; g.fillRect(0, h * 0.93, w, h * 0.07); }, [3, 1]);
    const wallM = std('#ffffff', 0.9, { map: wallT });
    const walls = [[cx, SHOP.z0, W, 0], [SHOP.x0, cz, D, Math.PI / 2], [SHOP.x1, cz, D, -Math.PI / 2]];
    for (const [x, z, len, ry] of walls) { const m = mesh(new THREE.PlaneGeometry(len, SHOP.h), wallM, root, [x, SHOP.h / 2, z], null, [0, ry, 0]); m.castShadow = false; m.receiveShadow = true; }
    // 앞(입구) 벽: 유리문 — 사용자 뒤라 거의 안 보이지만 VR에서 돌아보면 보인다
    const glass = std('#bfe3ef', 0.1, { transparent: true, opacity: 0.35 });
    mesh(new THREE.PlaneGeometry(W, SHOP.h), glass, root, [cx, SHOP.h / 2, SHOP.z1], null, [0, Math.PI, 0]).castShadow = false;
    for (const x of [-2.3, -0.8, 0.8, 2.3]) mesh(geo.box, std('#8a9096', 0.4), root, [x, SHOP.h / 2, SHOP.z1], [0.06, SHOP.h, 0.06]);
    // 천장 + 긴 형광등
    mesh(new THREE.PlaneGeometry(W, D), std('#f3f3f0', 0.95), root, [cx, SHOP.h, cz], null, [Math.PI / 2, 0, 0]).castShadow = false;
    const lampM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-1.2, 0, 1.2]) for (const z of [-1.2, 0.3, 1.8]) mesh(geo.box, lampM, root, [x, SHOP.h - 0.02, z], [0.9, 0.03, 0.12]).castShadow = false;
    // 간판(안쪽 벽, 계산대 위)
    const signT = canvasTex(1024, 192, (g, w, h) => {
      g.fillStyle = '#2f8a4c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(0, h - 18, w, 6);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 110px ${FONT}`; g.fillText(opts.name || '편의점', w / 2, h * 0.47);
    });
    mesh(geo.box, std('#ffffff', 0.5, { map: signT, emissive: H.hex('#ffffff'), emissiveMap: signT, emissiveIntensity: 0.35 }), root, [-1.05, 2.25, SHOP.z0 + 0.04], [1.7, 0.32, 0.04]).castShadow = false;
    // '24시' 붙임 글(앞 유리 안쪽에서 보이는 건 아니고 벽 장식)
    const t24 = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2b233'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill(); g.fillStyle = '#2a2010'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 92px ${FONT}`; g.fillText('24시', w / 2, h / 2 + 4); });
    const s24 = mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshBasicMaterial({ map: t24 }), root, [0.55, 2.2, SHOP.z0 + 0.02]); s24.castShadow = false;
    // 바깥 풍경 대신 입구 쪽 밝은 빛
    const outT = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#cfe6f6'); gr.addColorStop(1, '#eef1e6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    mesh(new THREE.PlaneGeometry(W * 3, SHOP.h * 2), new THREE.MeshBasicMaterial({ map: outT }), root, [cx, SHOP.h / 2, SHOP.z1 + 2], null, [0, Math.PI, 0]).castShadow = false;
    return { root };
  }

  // ───────────── 가구 ─────────────
  // 계산대: 가운데(cx,cz), 가로 w(x)·깊이 d(z)·높이 h. 손님은 +z 쪽
  function counter(parent, cx, cz, w = 1.4, d = 0.6, h = 0.9) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const frontT = canvasTex(512, 256, (gg, ww, hh) => { gg.fillStyle = '#f4f3ee'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#3f9e5c'; gg.fillRect(0, hh * 0.12, ww, hh * 0.1); gg.fillStyle = '#d0cdc4'; gg.fillRect(0, hh * 0.9, ww, hh * 0.1); });
    const body = std('#ffffff', 0.6, { map: frontT });
    mesh(geo.box, body, g, [0, h / 2 - 0.02, 0], [w, h - 0.04, d]);
    mesh(geo.box, std('#cfc8bb', 0.35), g, [0, h - 0.02, 0.02], [w + 0.06, 0.04, d + 0.08]);   // 윗판
    // 카드 단말기
    const term = new THREE.Group(); term.position.set(w / 2 - 0.25, h, -0.05); g.add(term);
    mesh(geo.box, std('#2c2f35', 0.4), term, [0, 0.03, 0], [0.09, 0.06, 0.16]);
    const scr = canvasTex(128, 128, (gg, ww, hh) => { gg.fillStyle = '#1a3550'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#9fe0ff'; gg.textAlign = 'center'; gg.font = `700 34px ${FONT}`; gg.fillText('카드', ww / 2, hh * 0.45); gg.font = `500 22px ${FONT}`; gg.fillText('CARD', ww / 2, hh * 0.72); });
    const scrM = new THREE.MeshBasicMaterial({ map: scr });
    mesh(new THREE.PlaneGeometry(0.07, 0.07), scrM, term, [0, 0.065, 0.02], null, [-Math.PI / 2 + 0.5, 0, 0]).castShadow = false;
    // 계산기(포스) 화면: 점원 쪽을 본다
    const pos = new THREE.Group(); pos.position.set(-w / 2 + 0.3, h, -0.12); g.add(pos);
    mesh(geo.box, std('#3a3d44', 0.4), pos, [0, 0.12, 0], [0.04, 0.24, 0.04]);
    mesh(geo.box, std('#24272c', 0.4), pos, [0, 0.27, 0], [0.32, 0.2, 0.03], [0.2, Math.PI, 0]);
    // 점원 뒤 선반(꾸밈: 작은 상자들)
    const back = new THREE.Group(); back.position.set(0, 0, -d / 2 - 0.85); g.add(back);
    mesh(geo.box, std('#e6e2d8', 0.7), back, [0, 0.9, 0], [w + 0.2, 1.8, 0.3]);
    const cols = ['#e2574c', '#f2b233', '#4c8fe2', '#5fb36b', '#ffffff', '#8e6bd6'];
    for (const y of [1.05, 1.4]) for (let i = 0; i < 9; i++) mesh(geo.box, std(cols[(i * 7 + Math.round(y * 10)) % cols.length], 0.6), back, [-w / 2 + 0.12 + i * (w / 8.6), y + 0.07, 0.17], [0.11, 0.14, 0.06]);
    return { g, top: h, term: V3(cx + w / 2 - 0.25, h + 0.07, cz - 0.05), w, d };
  }
  // 곤돌라 선반: 칸 높이 ys, 앞이 +z. 칸마다 값표 자리
  function shelf(parent, cx, cz, w = 1.3, d = 0.45, ys = [0.32, 0.72, 1.12], h = 1.45) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const m = std('#f2f1ec', 0.5), edge = std('#3f9e5c', 0.5);
    mesh(geo.box, m, g, [0, h / 2, -d / 2 + 0.02], [w, h, 0.04]);                       // 뒤판
    for (const sx of [-1, 1]) mesh(geo.box, m, g, [sx * (w / 2 - 0.02), h / 2, 0], [0.04, h, d]);
    mesh(geo.box, m, g, [0, 0.06, 0], [w, 0.12, d]);                                        // 아래 받침
    for (const y of ys) { mesh(geo.box, m, g, [0, y - 0.012, 0.01], [w - 0.04, 0.024, d - 0.02]); mesh(geo.box, edge, g, [0, y - 0.035, d / 2 - 0.01], [w - 0.04, 0.05, 0.012]); }
    return { g, ys, w, d };
  }
  // 오픈 냉장 진열대(문 없는 냉장고): 칸 ys, 위에 불빛 띠
  function fridge(parent, cx, cz, w = 1.1, d = 0.55, ys = [0.5, 0.9, 1.3], h = 1.95) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const body = std('#e9edf0', 0.4), dark = std('#2b3138', 0.5);
    mesh(geo.box, body, g, [0, h / 2, -d / 2 + 0.03], [w, h, 0.06]);
    for (const sx of [-1, 1]) mesh(geo.box, body, g, [sx * (w / 2 - 0.03), h / 2, 0], [0.06, h, d]);
    mesh(geo.box, dark, g, [0, 0.2, 0.02], [w, 0.4, d - 0.04]);                             // 아래 기계칸
    mesh(geo.box, body, g, [0, h - 0.1, 0.02], [w, 0.2, d]);                                // 윗머리
    const capT = canvasTex(512, 96, (gg, ww, hh) => { gg.fillStyle = '#2f6fb3'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#ffffff'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.font = `900 58px ${FONT}`; gg.fillText('냉장', ww / 2, hh / 2 + 2); });
    mesh(new THREE.PlaneGeometry(w - 0.1, 0.16), new THREE.MeshBasicMaterial({ map: capT }), g, [0, h - 0.1, d / 2 + 0.021]).castShadow = false;
    mesh(geo.box, new THREE.MeshBasicMaterial({ color: 0xeaf6ff }), g, [0, h - 0.215, 0.05], [w - 0.14, 0.02, 0.03]).castShadow = false;   // 불빛 띠
    for (const y of ys) { mesh(geo.box, std('#cfd6dc', 0.3, { metalness: 0.3 }), g, [0, y - 0.01, 0.02], [w - 0.12, 0.02, d - 0.08]); mesh(geo.box, std('#2f6fb3', 0.5), g, [0, y - 0.03, d / 2 - 0.03], [w - 0.12, 0.04, 0.01]); }
    for (const y of ys) { const glow = new THREE.PointLight(0xeef8ff, 0.45, 0.9); glow.position.set(0, y + 0.3, 0.25); g.add(glow); }   // 칸마다 냉장고 불빛(아래 칸이 윗칸 그림자에 묻히지 않게)
    return { g, ys, w, d };
  }
  // 아이스크림 냉동고(위가 열린 낮은 상자, 안에 아이스크림)
  function freezer(parent, cx, cz, w = 0.7, d = 1.0, h = 0.8) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const sideT = canvasTex(512, 256, (gg, ww, hh) => { gg.fillStyle = '#f7f7f7'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#5bb8e8'; gg.fillRect(0, hh * 0.1, ww, hh * 0.32); gg.fillStyle = '#ffffff'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.font = `900 70px ${FONT}`; gg.fillText('아이스크림', ww / 2, hh * 0.27); });
    const sideM = std('#ffffff', 0.5, { map: sideT }), plain = std('#f2f2f2', 0.5);
    const t = 0.05;
    mesh(geo.box, plain, g, [0, 0.05, 0], [w, 0.1, d]);
    const outside = [plain, plain, plain, plain, sideM, plain];   // 글씨는 바깥 면(+z)에만(안쪽 면에 거꾸로 비치지 않게)
    const wall = (pos, sx, ry) => { const m = new THREE.Mesh(geo.box, outside); m.position.set(...pos); m.scale.set(sx, h, t); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); };
    wall([0, h / 2, d / 2 - t / 2], w, 0);
    mesh(geo.box, plain, g, [0, h / 2, -d / 2 + t / 2], [w, h, t]);
    wall([w / 2 - t / 2, h / 2, 0], d, Math.PI / 2);   // 손님 쪽(+x) 옆면에도 글씨
    mesh(geo.box, plain, g, [-w / 2 + t / 2, h / 2, 0], [t, h, d]);
    mesh(geo.box, std('#dff3ff', 0.3), g, [0, h - 0.22, 0], [w - 2 * t, 0.02, d - 2 * t]);   // 안쪽 바닥(얼음빛)
    for (const sx of [-1, 1]) mesh(geo.box, std('#9aa3ab', 0.3, { metalness: 0.4 }), g, [sx * (w / 2 - t / 2), h + 0.005, 0], [t + 0.01, 0.01, d]);
    return { g, top: h, inner: h - 0.21, w, d };
  }

  // ───────────── 상품(낱말) 모양 — 바닥 가운데가 원점, 앞이 +z ─────────────
  const plastic = c => std(c, 0.35);
  function bottle() {   // 생수병: 투명한 파란 병 + 흰 뚜껑 + 라벨 '물'
    const g = new THREE.Group();
    const body = std('#9fd3f0', 0.08, { transparent: true, opacity: 0.6 });
    mesh(new THREE.CylinderGeometry(0.033, 0.035, 0.17, 20), body, g, [0, 0.085, 0]);
    mesh(new THREE.CylinderGeometry(0.014, 0.033, 0.04, 20), body, g, [0, 0.19, 0]);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 14), plastic('#ffffff'), g, [0, 0.22, 0]);
    const lab = mesh(new THREE.CylinderGeometry(0.0355, 0.0355, 0.06, 24, 1, true), std('#ffffff', 0.5, { map: labelTex('mul', '#ffffff', '#3d8fd1', '물', '#1d5f99', { w: 768, h: 192, size: 0.62, textY: 0.42, bandY: 0.8, bandH: 0.12 }) }), g, [0, 0.1, 0]);
    lab.rotation.y = Math.PI;   // 원기둥 무늬 가운데(u=0.5)는 -z를 본다 → 반 바퀴 돌려 앞(+z)으로
    return g;
  }
  function carton() {   // 우유팩: 흰 몸통 + 파란 띠 + 세모 지붕
    const g = new THREE.Group(), w = 0.07, hb = 0.15;
    const t = labelTex('uyu', '#ffffff', '#3b78c9', '우유', '#2a5ea8', { size: 0.3, textY: 0.38, bandY: 0.68, bandH: 0.18 });
    const side = std('#ffffff', 0.55, { map: t }), plain = std('#f4f6fa', 0.55);
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, hb, w), [side, side, plain, plain, side, side]); box.position.y = hb / 2; box.castShadow = true; g.add(box);
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.001, w / Math.SQRT2, 0.035, 4, 1), plain); gable.rotation.y = Math.PI / 4; gable.position.y = hb + 0.017; g.add(gable);   // 세모 지붕
    const fin = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.004), plain); fin.position.y = hb + 0.04; g.add(fin);   // 지붕 꼭대기 접합선
    return g;
  }
  function gimbapPack() {   // 김밥: 투명 상자 안에 썬 김밥 8개
    const g = new THREE.Group(), n = 8, r = 0.025, t = 0.018;
    const nori = std('#1f2a1f', 0.7), rice = std('#f4f1e8', 0.8);
    const fill = ['#f2c53d', '#e2574c', '#5fb36b', '#d98a3a'];
    for (let i = 0; i < n; i++) {
      const x = -((n - 1) * t) / 2 + i * t;
      const s = new THREE.Group(); s.position.set(x, r + 0.004, 0); s.rotation.z = Math.PI / 2; g.add(s);
      mesh(new THREE.CylinderGeometry(r, r, t * 0.92, 20), nori, s);
      const face = mesh(new THREE.CircleGeometry(r * 0.88, 20), rice, s, [0, t * 0.47, 0], null, [-Math.PI / 2, 0, 0]); face.castShadow = false;
      fill.forEach((c, k) => { const a = k / fill.length * Math.PI * 2; const f = mesh(new THREE.CircleGeometry(r * 0.2, 10), std(c, 0.6), s, [Math.cos(a) * r * 0.32, t * 0.475, Math.sin(a) * r * 0.32], null, [-Math.PI / 2, 0, 0]); f.castShadow = false; });
    }
    const L = n * t + 0.02;
    mesh(geo.box, std('#e6e2d8', 0.6), g, [0, 0.002, 0], [L, 0.004, 0.06]);
    const lid = mesh(geo.box, std('#ffffff', 0.1, { transparent: true, opacity: 0.25 }), g, [0, r + 0.006, 0], [L, r * 2 + 0.01, 0.062]); lid.castShadow = false;
    const tag = mesh(new THREE.PlaneGeometry(0.07, 0.035), new THREE.MeshBasicMaterial({ map: labelTex('gimbap', '#ffffff', null, '김밥', '#2d6a3e', { w: 256, h: 128, size: 0.62, textY: 0.52 }) }), g, [0, r + 0.012, 0.0315]); tag.castShadow = false;
    return g;
  }
  function breadBag() {   // 빵: 둥근 빵이 든 비닐봉지
    const g = new THREE.Group();
    const bun = std('#c98a45', 0.6);
    mesh(geo.sphere, bun, g, [0, 0.04, 0], [0.13, 0.08, 0.1]);
    const bag = mesh(geo.box, std('#ffffff', 0.25, { transparent: true, opacity: 0.4 }), g, [0, 0.045, 0], [0.16, 0.09, 0.12]); bag.castShadow = false;
    const tag = mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({ map: labelTex('ppang', '#fff4d9', '#e2574c', '빵', '#8a4a17', { w: 256, h: 128, size: 0.62, textY: 0.45, bandY: 0.85, bandH: 0.15 }) }), g, [0, 0.05, 0.0605]); tag.castShadow = false;
    return g;
  }
  function chipBag() {   // 과자: 부푼 봉지
    const g = new THREE.Group();
    const t = labelTex('gwaja', '#e2574c', '#f2c53d', '과자', '#ffffff', { size: 0.3, textY: 0.36, bandY: 0.66, bandH: 0.16, dots: 'rgba(255,220,120,0.5)' });
    const face = std('#ffffff', 0.35, { map: t }), side = std('#e2574c', 0.4);
    const geoB = new THREE.BoxGeometry(0.14, 0.2, 0.05, 1, 6, 1), pos = geoB.attributes.position;   // 가운데가 부푼 봉지: 위·아래 끝으로 갈수록 얇게
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 0.1; pos.setZ(i, pos.getZ(i) * (1 - 0.75 * y * y)); }
    geoB.computeVertexNormals();
    const b = new THREE.Mesh(geoB, [side, side, side, side, face, face]); b.position.y = 0.1; b.castShadow = true; g.add(b);
    mesh(geo.box, std('#c4433a', 0.4), g, [0, 0.2, 0], [0.14, 0.012, 0.014]);
    mesh(geo.box, std('#c4433a', 0.4), g, [0, 0.0, 0], [0.14, 0.012, 0.014]);
    return g;
  }
  function cupRamen() {   // 컵라면: 위가 넓은 컵 + 뚜껑
    const g = new THREE.Group();
    const t = labelTex('ramyeon', '#ffffff', '#e2574c', '라면', '#c3271b', { w: 768, h: 256, size: 0.42, textY: 0.36, bandY: 0.7, bandH: 0.2 });
    const cup = mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.1, 24), std('#ffffff', 0.5, { map: t }), g, [0, 0.05, 0]); cup.rotation.y = Math.PI;
    mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.006, 24), std('#f2c53d', 0.4, { metalness: 0.2 }), g, [0, 0.103, 0]);
    return g;
  }
  function iceCream() {   // 아이스크림: 콘 + 둥근 아이스크림
    const g = new THREE.Group();
    const cone = mesh(new THREE.ConeGeometry(0.028, 0.1, 16), std('#d9a05a', 0.7), g, [0, 0.05, 0]); cone.rotation.x = Math.PI;
    mesh(geo.sphere, std('#f5a3b8', 0.6), g, [0, 0.11, 0], [0.065, 0.06, 0.065]);
    const wrap = mesh(new THREE.CylinderGeometry(0.03, 0.006, 0.07, 16, 1, true), std('#ffffff', 0.4, { map: labelTex('icecream', '#5bb8e8', null, '아이스크림', '#ffffff', { w: 512, h: 128, size: 0.4, textY: 0.5 }), side: THREE.DoubleSide }), g, [0, 0.065, 0]); wrap.rotation.y = Math.PI;
    return g;
  }
  function basket() {   // 장바구니: 빨간 플라스틱, 위가 열림 + 손잡이 둘
    const g = new THREE.Group(), w = 0.42, d = 0.28, h = 0.2, t = 0.012;
    const m = std('#d8332b', 0.45);
    mesh(geo.box, m, g, [0, t / 2, 0], [w - 0.03, t, d - 0.03]);
    for (const sz of [-1, 1]) mesh(geo.box, m, g, [0, h / 2, sz * (d / 2 - t / 2)], [w, h, t]);
    for (const sx of [-1, 1]) mesh(geo.box, m, g, [sx * (w / 2 - t / 2), h / 2, 0], [t, h, d]);
    // 구멍 무늬 대신 옆면 띠
    for (const sz of [-1, 1]) mesh(geo.box, std('#b52822', 0.5), g, [0, h * 0.55, sz * (d / 2 + 0.001)], [w * 0.9, 0.03, 0.002]);
    const hm = std('#222222', 0.5);
    for (const sx of [-1, 1]) { const arc = mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 18, Math.PI), hm, g, [sx * 0.06, h, 0]); arc.rotation.y = Math.PI / 2; arc.scale.set(1, 0.7, 1); }
    g.userData.inner = { w: w - 0.06, d: d - 0.06, y: t };
    return g;
  }
  function plasticBag() {   // 봉투: 흰 비닐봉투(접혀 쌓인 것 + 하나 펼친 것)
    const g = new THREE.Group();
    const m = std('#f7f7f4', 0.6, { transparent: true, opacity: 0.95 });
    for (let i = 0; i < 4; i++) mesh(geo.box, m, g, [0, 0.004 + i * 0.006, 0], [0.18, 0.005, 0.12]);
    const b = mesh(geo.sphere, m, g, [0, 0.11, 0], [0.18, 0.18, 0.08]);
    for (const sx of [-1, 1]) { const hnd = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI), m, g, [sx * 0.045, 0.19, 0]); }
    const tag = mesh(new THREE.PlaneGeometry(0.08, 0.04), new THREE.MeshBasicMaterial({ map: labelTex('bongtu', '#ffffff', null, '봉투', '#3f9e5c', { w: 256, h: 128, size: 0.55, textY: 0.52 }), transparent: true }), g, [0, 0.11, 0.041]); tag.castShadow = false;
    return g;
  }
  function card() {   // 카드: 작은 받침 위 파란 카드(IC칩)
    const g = new THREE.Group();
    const t = cached('cardface', () => canvasTex(256, 160, (gg, w, h) => {
      const gr = gg.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3b6fd8'); gr.addColorStop(1, '#6a3fc4'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#e8c45a'; gg.fillRect(28, 56, 44, 34); gg.strokeStyle = '#b8942e'; gg.strokeRect(28, 56, 44, 34);
      gg.fillStyle = '#ffffff'; gg.font = `900 40px ${FONT}`; gg.textAlign = 'right'; gg.fillText('카드', w - 20, h - 22);
    }));
    mesh(geo.box, std('#d0cdc4', 0.6), g, [0, 0.006, 0], [0.12, 0.012, 0.08]);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.002, 0.054), [std('#3b5fc0', 0.4), std('#3b5fc0', 0.4), std('#ffffff', 0.35, { map: t }), std('#2a3f80', 0.4), std('#3b5fc0', 0.4), std('#3b5fc0', 0.4)]);
    c.position.y = 0.013; c.castShadow = true; g.add(c); g.userData.card = c;
    return g;
  }
  const MAKERS = { mul: bottle, uyu: carton, gimbap: gimbapPack, ppang: breadBag, gwaja: chipBag, ramyeon: cupRamen, icecream: iceCream, baguni: basket, bongtu: plasticBag, kadeu: card };
  function product(id) { const g = MAKERS[id](); g.traverse(o => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; }); return g; }

  // 값표(선반 앞 띠에 붙는 작은 표)
  function priceTag(parent, x, y, z, price) {
    const t = canvasTex(256, 112, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b233'; g.fillRect(0, 0, w, 16); g.fillStyle = '#222222'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 54px ${FONT}`; g.fillText(price.toLocaleString('ko-KR') + '원', w / 2, h * 0.6); });
    const m = mesh(new THREE.PlaneGeometry(0.1, 0.044), new THREE.MeshBasicMaterial({ map: t }), parent, [x, y, z]); m.castShadow = false; return m;
  }

  return { build, counter, shelf, fridge, freezer, product, priceTag, SHOP };
})();
