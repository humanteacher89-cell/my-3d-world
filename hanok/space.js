/* 「하나네 집에 놀러 가요」 한옥 공간 (2026-10-19, 휴먼쌤 피드백 "배경에 격자무늬 문 말고는 한옥이라고 볼 수가 없어")
   VR·화면 모드에서만 보인다(H.vrOnly — 혼합현실에서는 실제 방이 대신한다). 모두 코드로 짓고 무늬는 캔버스로 그린다(내려받기 없음).
   공간: 안채 부엌(흙바닥·부뚜막·아궁이·서까래·흙벽·살창) → 뒤쪽 부엌문(판문)이 열려 있어 마당 건너 사랑채(기단·기둥·대청·창호·기와지붕)와 장독대·돌담이 보인다.
   좌표: 사용자는 +Z 쪽에서 -Z(뒤쪽)를 본다. 부엌 바닥 y=0. 부엌 안 x -2.6~2.6, z -2.4~2.6. 뒷벽 z=-2.4(가운데에 문).               */
window.HANOK_SPACE = (function () {
  'use strict';
  const H = window.HW;
  const { V3, std, mesh, geo } = H;

  // ───────────── 캔버스 무늬 ─────────────
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();   // 늘 같은 무늬
  function noise(g, w, h, n, a, dark) { for (let i = 0; i < n; i++) { g.fillStyle = (dark ? 'rgba(60,40,20,' : 'rgba(255,255,255,') + (rnd() * a).toFixed(3) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } }

  const T = {};
  // 흙바닥(다진 흙): 누런 갈색 + 얼룩
  T.earth = () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#9c7a55'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const r = 10 + rnd() * 50; const gr = g.createRadialGradient(rnd() * w, rnd() * h, 0, rnd() * w, rnd() * h, r); g.fillStyle = rnd() < 0.5 ? 'rgba(80,58,36,0.10)' : 'rgba(190,160,120,0.10)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); }
    noise(g, w, h, 5000, 0.25, true); noise(g, w, h, 2000, 0.18);
  }, [3, 3]);
  // 흙벽(초벽 위 누런 흙): 연한 황토 + 짚 결
  T.mud = () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cdb38a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(150,115,75,0.10)' : 'rgba(235,215,180,0.12)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 15 + rnd() * 60, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(160,125,70,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 400; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * 3.14; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); }
    noise(g, w, h, 3000, 0.15, true);
  }, [2, 1.5]);
  // 나무 결(기둥·보·판문·마루)
  const woodTex = (base, rep, vertical) => canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = rnd() * w; g.strokeStyle = `rgba(${rnd() < 0.5 ? '40,24,10' : '255,230,190'},${(0.05 + rnd() * 0.12).toFixed(2)})`; g.lineWidth = 0.5 + rnd() * 2.5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y); g.stroke(); }
    noise(g, w, h, 800, 0.12, true);
  }, rep);
  T.wood = () => woodTex('#8a5d34', [1, 1]);
  T.oldWood = () => woodTex('#6b4a2e', [1, 1]);        // 부엌은 연기에 그을려 어둡다
  // 우물마루(사랑채 대청): 긴 귀틀 사이 짧은 청판
  T.maru = () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#a7743f'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 128) { g.fillStyle = `hsl(28,${38 + rnd() * 12}%,${36 + rnd() * 9}%)`; g.fillRect(x + 2, y + 2, 60, 124); g.strokeStyle = 'rgba(40,22,8,0.25)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + 6 + rnd() * 50, y + 4); g.lineTo(x + 6 + rnd() * 50, y + 122); g.stroke(); } }
    g.fillStyle = '#7a4f28'; for (let y = 0; y < h; y += 256) g.fillRect(0, y, w, 14);   // 장귀틀
  }, [2, 2]);
  // 띠살문(창호): 나무 살 + 한지. 위·가운데·아래에 가로살 띠
  T.ttisal = (lit) => canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = lit ? '#fbf3dd' : '#efe4c8'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, h * 0.6); gr.addColorStop(0, 'rgba(255,248,225,0.5)'); gr.addColorStop(1, 'rgba(200,180,140,0.15)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6e4a2a';
    const fr = 14; g.fillRect(0, 0, w, fr); g.fillRect(0, h - fr, w, fr); g.fillRect(0, 0, fr, h); g.fillRect(w - fr, 0, fr, h);
    for (let i = 1; i < 9; i++) g.fillRect(fr + (w - 2 * fr) * i / 9 - 2, 0, 4, h);              // 세로살
    for (const band of [0.1, 0.5, 0.9]) for (let k = -1; k <= 1; k++) g.fillRect(0, h * band + k * 12 - 2, w, 4);   // 가로살 띠
  });
  // 살창(부엌 창): 굵은 세로 나무살, 뒤는 밝은 바깥
  T.salchang = () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff4dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a3c22'; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16); g.fillRect(0, 0, 16, h); g.fillRect(w - 16, 0, 16, h);
    for (let i = 1; i < 7; i++) g.fillRect(i * w / 7 - 7, 0, 14, h);
  });
  // 기와(지붕 윗면): 골(수키와 줄)이 진 짙은 회색
  T.giwa = () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b4f55'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#3a3d42'); gr.addColorStop(0.35, '#6a6f76'); gr.addColorStop(0.6, '#585c62'); gr.addColorStop(1, '#33363a'); g.fillStyle = gr; g.fillRect(x, 0, 32, h); }
    g.fillStyle = 'rgba(20,20,24,0.35)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
    noise(g, w, h, 1500, 0.10);
  }, [8, 2]);
  // 회벽(사랑채 벽 위쪽): 흰 회칠
  T.plaster = () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f1ece1'; g.fillRect(0, 0, w, h); noise(g, w, h, 1500, 0.06, true); }, [2, 1]);
  // 돌(기단·돌담): 둥근 돌 쌓기
  T.stone = () => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#8b8378'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h + 30; y += 34) for (let x = (y / 34 % 2) * 26; x < w + 40; x += 52) { g.fillStyle = `hsl(${30 + rnd() * 15},${8 + rnd() * 10}%,${50 + rnd() * 18}%)`; g.beginPath(); g.ellipse(x + rnd() * 6, y + rnd() * 4, 24 + rnd() * 6, 15 + rnd() * 3, rnd() * 0.4, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,36,30,0.4)'; g.lineWidth = 2; g.stroke(); }
  }, [3, 1]);

  // 장판(안방 바닥): 콩기름 먹인 누런 종이 네모
  T.jangpan = () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d29b52'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 128) { const gr = g.createLinearGradient(x, y, x + 128, y + 128); gr.addColorStop(0, `hsl(34,${55 + rnd() * 8}%,${54 + rnd() * 6}%)`); gr.addColorStop(1, `hsl(32,${52 + rnd() * 8}%,${47 + rnd() * 6}%)`); g.fillStyle = gr; g.fillRect(x + 1, y + 1, 126, 126); }
    g.strokeStyle = 'rgba(120,70,20,0.55)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    noise(g, w, h, 1500, 0.08, true);
  }, [3, 3]);
  // 벽지(한지 바른 흰 벽)
  T.wallpaper = () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f4efe3'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(180,160,120,0.12)'; for (let i = 0; i < 300; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 14 - 7, y + rnd() * 14 - 7); g.stroke(); } }, [3, 2]);
  // 반자(종이 바른 천장 + 나무 반자틀)
  T.banja = () => canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#8a6440'; for (let i = 0; i <= w; i += 128) { g.fillRect(i - 5, 0, 10, h); g.fillRect(0, i - 5, w, 10); } }, [2, 2]);
  // 병풍 한 폭: 비단 테두리 + 꽃(모란)·새·돌 그림을 단순하게
  T.screen = (k) => canvasTex(256, 768, (g, w, h) => {
    g.fillStyle = '#2f3f63'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f1e6cc'; g.fillRect(18, 40, w - 36, h - 80);
    const base = h - 120;
    g.fillStyle = '#8f8b80'; g.beginPath(); g.ellipse(w * (0.35 + 0.3 * (k % 2)), base, 60, 34, 0, 0, 7); g.fill();   // 돌
    g.strokeStyle = '#5b4026'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, base); g.bezierCurveTo(w * 0.3, base - 200, w * 0.7, base - 300, w * (0.4 + 0.15 * (k % 3)), 160 + 30 * (k % 2)); g.stroke();
    for (let i = 0; i < 9; i++) { const y = base - 60 - i * 55, x = w / 2 + Math.sin(i * 1.7 + k) * 55; g.fillStyle = '#4f7a3a'; g.beginPath(); g.ellipse(x - 26, y + 8, 30, 12, -0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 26, y + 6, 30, 12, 0.6, 0, 7); g.fill(); }
    for (let i = 0; i < 3; i++) { const y = base - 150 - i * 150 - (k % 2) * 40, x = w / 2 + Math.sin(i * 2.3 + k * 1.3) * 50; const col = ['#d8455a', '#e88aa0', '#c9364a'][(i + k) % 3]; for (let p = 0; p < 8; p++) { const a = p / 8 * 6.28; g.fillStyle = col; g.beginPath(); g.ellipse(x + Math.cos(a) * 16, y + Math.sin(a) * 12, 16, 12, a, 0, 7); g.fill(); } g.fillStyle = '#f3d36b'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
    if (k % 3 === 1) { g.fillStyle = '#3d3a44'; g.beginPath(); g.ellipse(w * 0.7, 120, 22, 10, -0.3, 0, 7); g.fill(); g.beginPath(); g.moveTo(w * 0.7 - 20, 120); g.lineTo(w * 0.7 - 50, 104); g.lineTo(w * 0.7 - 18, 112); g.fill(); }   // 새
  });

  // ───────────── 짓기 도우미 ─────────────
  const mats = {};
  function M(name) {
    if (mats[name]) return mats[name];
    const m = {
      earth: () => std('#ffffff', 0.98, { map: T.earth() }), mud: () => std('#ffffff', 0.97, { map: T.mud() }),
      wood: () => std('#8a5d34', 0.8), oldWood: () => std('#5b3f27', 0.85),   // 긴 나무(보·도리)에 결 무늬를 늘이면 격자처럼 보여서 단색으로
      grainWood: () => std('#ffffff', 0.8, { map: T.wood() }), stoveClay: () => std('#a07f5c', 0.97, { map: T.mud() }),
      maru: () => std('#ffffff', 0.7, { map: T.maru() }), plaster: () => std('#ffffff', 0.95, { map: T.plaster() }),
      ttisal: () => std('#ffffff', 0.9, { map: T.ttisal(false), emissive: new THREE.Color('#5a4a30'), emissiveIntensity: 0.25 }),
      ttisalLit: () => std('#ffffff', 0.9, { map: T.ttisal(true), emissive: new THREE.Color('#fff2cc'), emissiveIntensity: 0.35 }),
      salchang: () => std('#ffffff', 0.9, { map: T.salchang(), emissive: new THREE.Color('#fff0d0'), emissiveIntensity: 0.55 }),
      giwa: () => std('#ffffff', 0.75, { map: T.giwa() }), giwaEdge: () => std('#3f4247', 0.7),
      stone: () => std('#ffffff', 0.95, { map: T.stone() }), soot: () => std('#2e2620', 0.95),
      clay: () => std('#a07850', 0.95), fire: () => new THREE.MeshBasicMaterial({ color: '#ff8a2a', toneMapped: false }),
      leaf: () => std('#5b7f3a', 0.9), trunk: () => std('#5a4330', 0.9), persimmon: () => std('#ee7a22', 0.5),
      hill: () => new THREE.MeshBasicMaterial({ color: '#9fb39a', fog: true }), hill2: () => new THREE.MeshBasicMaterial({ color: '#b9c8b4', fog: true }),
      white: () => std('#f4efe4', 0.9),
      jangpan: () => std('#ffffff', 0.45, { map: T.jangpan() }), wallpaper: () => std('#ffffff', 0.95, { map: T.wallpaper() }),
      banja: () => std('#ffffff', 0.95, { map: T.banja(), side: THREE.DoubleSide }), silk: () => std('#2f3f63', 0.8),
      cushion: () => std('#b2403a', 0.85), cushionEdge: () => std('#2f5d8a', 0.8), brass: () => std('#c9a24a', 0.35, { metalness: 0.6 }), chest: () => std('#6e4426', 0.6)
    }[name]();
    return (mats[name] = m);
  }
  const box = (parent, m, x, y, z, sx, sy, sz, shadow = true) => { const o = mesh(geo.box, M(m), parent, [x, y, z], [sx, sy, sz]); o.castShadow = shadow; return o; };
  const cylG = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
  const cyl = (parent, m, x, y, z, r, h, rot) => { const o = mesh(cylG, M(m), parent, [x, y, z], [r * 2, h, r * 2], rot); return o; };
  function plane(parent, m, x, y, z, w, h, ry = 0, rx = 0) { const o = mesh(geo.plane, M(m), parent, [x, y, z], [w, h, 1], [rx, ry, 0]); o.castShadow = false; return o; }
  // 같은 모양 여럿(서까래·기와 끝 등) = InstancedMesh 하나
  function many(parent, g, m, list) {
    const im = new THREE.InstancedMesh(g, M(m), list.length), o = new THREE.Object3D();
    list.forEach((l, i) => { o.position.set(l[0], l[1], l[2]); o.rotation.set(l[3] || 0, l[4] || 0, l[5] || 0); o.scale.set(l[6] || 1, l[7] || 1, l[8] || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
  }

  // ───────────── 기와지붕(처마 곡선) ─────────────
  // 너비 w, 깊이 d(앞뒤), 앞쪽 처마 높이 y0 → 용마루 높이 y1. 모서리가 살짝 들린다(앙곡). 앞면만(뒤에서 볼 일 없음) + 처마 밑 서까래.
  function roof(parent, cx, cz, w, d, y0, y1, faceZ = 1) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); parent.add(g);
    const nx = 24, nz = 6, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / nz, x = (u - 0.5) * w, ex = Math.abs(u - 0.5) * 2;
      const lift = Math.pow(ex, 3) * 0.32 * (1 - v);                   // 끝으로 갈수록 들림
      const z = faceZ * (d / 2 - v * d / 2) + faceZ * Math.pow(ex, 4) * 0.25 * (1 - v);   // 귀가 앞으로 살짝 나옴(안허리)
      const sag = Math.sin(v * Math.PI) * 0.12;                          // 지붕면이 오목하게
      pos.push(x, y0 + (y1 - y0) * v + lift - sag, z); uv.push(u * 8, v * 2);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, e = c + 1; if (faceZ > 0) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e); }
    const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geom.setIndex(idx); geom.computeVertexNormals();
    const top = new THREE.Mesh(geom, M('giwa')); top.castShadow = true; top.receiveShadow = true; g.add(top);
    const under = new THREE.Mesh(geom, M('oldWood')); under.material = M('wood'); under.position.y = -0.06; under.scale.set(1, 1, 1); g.add(under);   // 처마 밑(나무)
    // 처마 끝 막새 줄
    const edge = []; for (let i = 0; i <= 60; i++) { const u = i / 60, ex = Math.abs(u - 0.5) * 2; edge.push([(u - 0.5) * w, y0 + Math.pow(ex, 3) * 0.32 - 0.03, faceZ * (d / 2 + Math.pow(ex, 4) * 0.25) + faceZ * 0.02, Math.PI / 2, 0, 0, 1, 1, 1]); }
    many(g, new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), 'giwaEdge', edge);
    // 용마루
    const ridge = box(g, 'giwaEdge', 0, y1 + 0.07, 0, w * 0.82, 0.16, 0.22);
    for (const s of [-1, 1]) { const end = box(g, 'giwaEdge', s * w * 0.41, y1 + 0.16, 0, 0.18, 0.2, 0.24); end.rotation.z = -s * 0.5; }
    // 서까래(처마 밑에 보이는 둥근 나무)
    const raf = []; for (let i = 0; i <= 26; i++) { const u = i / 26, x = (u - 0.5) * w * 0.92; raf.push([x, y0 - 0.06 + Math.pow(Math.abs(u - 0.5) * 2, 3) * 0.25, faceZ * (d / 2 - 0.25), 0.25 * faceZ - Math.PI / 2, 0, 0, 1, 0.7, 1]); }
    many(g, new THREE.CylinderGeometry(0.045, 0.05, 1, 8), 'wood', raf);
    return g;
  }

  // ───────────── 띠살 분합문 한 짝 ─────────────
  function door(parent, x, y, z, w, h, ry = 0, lit) { return plane(parent, lit ? 'ttisalLit' : 'ttisal', x, y, z, w, h, ry); }

  // ───────────── 사랑채(마당 건너 보이는 집) ─────────────
  function sarangchae(parent, cz) {
    const g = new THREE.Group(); g.position.set(0, 0, cz); parent.add(g);
    const W = 10.8, bay = 2.16, baseH = 0.55, colH = 2.45, D = 3.2;
    box(g, 'stone', 0, baseH / 2, 0, W + 0.6, baseH, D + 0.6);                      // 기단(돌)
    for (let i = -2; i <= 2; i++) box(g, 'stone', i * bay, baseH + 0.03, D / 2 + 0.45, 0.6, 0.08, 0.35);   // 댓돌
    const top = baseH;
    // 기둥(앞줄) + 주춧돌
    for (let i = 0; i <= 5; i++) { const x = -W / 2 + i * bay; cyl(g, 'stone', x, top + 0.08, D / 2, 0.2, 0.16); box(g, 'wood', x, top + colH / 2, D / 2, 0.22, colH, 0.22); }
    box(g, 'wood', 0, top + colH - 0.1, D / 2, W, 0.22, 0.2);                       // 창방(기둥 위 가로 나무)
    box(g, 'wood', 0, top + colH + 0.08, D / 2 + 0.05, W + 0.3, 0.18, 0.3);         // 도리
    // 칸 채우기: 가운데 두 칸 = 대청(앞이 트이고 안쪽 뒷벽에 판문), 양쪽 = 방(띠살문 + 머름)
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + bay * (i + 0.5);
      if (i === 2) {
        box(g, 'maru', x, top + 0.02, 0, bay, 0.04, D, false).material = M('maru');   // 대청 우물마루
        door(g, x - bay / 4, top + 1.15, -D / 2 + 0.05, bay / 2 - 0.04, 2.1, 0, true); door(g, x + bay / 4, top + 1.15, -D / 2 + 0.05, bay / 2 - 0.04, 2.1, 0, true);   // 대청 뒤 분합문
        box(g, 'wood', x, top + 2.3, -D / 2 + 0.05, bay, 0.14, 0.1);
        plane(g, 'plaster', x, top + 2.42, -D / 2 + 0.04, bay, 0.3);
        continue;
      }
      box(g, 'wood', x, top + 0.22, D / 2, bay - 0.22, 0.44, 0.12);                 // 머름(문 아래 나무판)
      const dw = (bay - 0.3) / 2;
      door(g, x - dw / 2 - 0.02, top + 1.36, D / 2 + 0.01, dw, 1.7, 0, i % 2 === 0); door(g, x + dw / 2 + 0.02, top + 1.36, D / 2 + 0.01, dw, 1.7, 0, i % 2 === 0);
      plane(g, 'plaster', x, top + 2.3, D / 2 + 0.005, bay - 0.22, 0.24);
    }
    box(g, 'plaster', 0, top + colH / 2, -D / 2, W, colH, 0.1);                     // 뒷벽
    roof(g, 0, 0.2, W + 2.6, D + 2.4, top + colH + 0.05, top + colH + 1.9, 1);
    return g;
  }

  // ───────────── 장독대 ─────────────
  // jarPromise = 항아리 GLB({ wrap, size }) — 불러오기 전에는 둥근 도형, 불러오면 바꾼다
  function jangdokdae(parent, x, z, jarPromise) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    box(g, 'stone', 0, 0.15, 0, 2.4, 0.3, 1.3);
    const spots = [[-0.8, -0.3, 1.35], [-0.15, -0.35, 1.2], [0.5, -0.3, 1.4], [-0.95, 0.3, 0.8], [-0.4, 0.32, 0.9], [0.15, 0.3, 0.75], [0.7, 0.32, 0.85]];
    const temp = spots.map(([sx, sz, s]) => mesh(geo.sphere, M('clay'), g, [sx, 0.3 + 0.28 * s, sz], [0.5 * s, 0.56 * s, 0.5 * s]));
    Promise.resolve(jarPromise).then(r => {
      if (!r) return;
      spots.forEach(([sx, sz, s], i) => { g.remove(temp[i]); const j = r.wrap.clone(); j.scale.multiplyScalar(s * 0.62 / Math.max(0.3, r.size.y)); j.position.set(sx, 0.3, sz); j.rotation.y = rnd() * 6; g.add(j); });
    });
    return g;
  }

  // ───────────── 돌담(기와 얹은 담) ─────────────
  function wall(parent, x, z, w, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
    box(g, 'stone', 0, 0.75, 0, w, 1.5, 0.45);
    box(g, 'plaster', 0, 1.62, 0, w, 0.25, 0.42);
    const cap = box(g, 'giwa', 0, 1.82, 0, w + 0.1, 0.12, 0.7); cap.material = M('giwaEdge');
    return g;
  }
  function tree(parent, x, z, s = 1, fruit) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
    cyl(g, 'trunk', 0, 1.0, 0, 0.12, 2.0);
    const crown = [[0, 2.4, 0, 1.1], [-0.6, 2.1, 0.2, 0.75], [0.6, 2.2, -0.1, 0.8], [0.1, 2.9, 0.1, 0.8]];
    for (const [cx, cy, cz, r] of crown) mesh(new THREE.IcosahedronGeometry(r, 1), M('leaf'), g, [cx, cy, cz]);
    if (fruit) { const list = []; for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, r = 0.8 + rnd() * 0.4; list.push([Math.cos(a) * r * 0.9, 2.1 + rnd() * 0.9, Math.sin(a) * r * 0.6 + 0.3, 0, 0, 0, 0.13, 0.13, 0.13]); } many(g, geo.lowSphere, 'persimmon', list); }   // 감
    return g;
  }

  // ───────────── 부엌(사용자가 서 있는 곳) ─────────────
  const K = { x0: -1.95, x1: 2.0, z0: -1.95, z1: 2.3, h: 2.4, ridge: 3.4, doorX: -0.62, doorW: 1.3, doorH: 2.0 };
  function kitchen(parent) {
    const g = new THREE.Group(); parent.add(g);
    const W = K.x1 - K.x0, D = K.z1 - K.z0;
    // 흙바닥
    const fl = plane(g, 'earth', 0, 0.001, (K.z0 + K.z1) / 2, W, D, 0, -Math.PI / 2); fl.receiveShadow = true;
    // 뒷벽: 문 자리만 비우고 흙벽 + 나무 틀(심벽)
    const left = K.doorX - K.doorW / 2 - K.x0, right = K.x1 - (K.doorX + K.doorW / 2);
    box(g, 'mud', K.x0 + left / 2, K.h / 2, K.z0, left, K.h, 0.14);
    box(g, 'mud', K.x1 - right / 2, K.h / 2, K.z0, right, K.h, 0.14);
    box(g, 'mud', K.doorX, (K.doorH + K.h) / 2, K.z0, K.doorW, K.h - K.doorH, 0.14);
    // 문틀과 열린 판문 두 짝
    box(g, 'oldWood', K.doorX - K.doorW / 2 - 0.06, K.h / 2, K.z0, 0.14, K.h, 0.2); box(g, 'oldWood', K.doorX + K.doorW / 2 + 0.06, K.h / 2, K.z0, 0.14, K.h, 0.2);
    box(g, 'oldWood', K.doorX, K.doorH + 0.06, K.z0, K.doorW + 0.26, 0.14, 0.2);
    box(g, 'oldWood', K.doorX, 0.06, K.z0, K.doorW + 0.26, 0.12, 0.22);                    // 문지방
    for (const s of [-1, 1]) { const leaf = box(g, 'grainWood', K.doorX + s * (K.doorW / 2 + 0.02), K.doorH / 2, K.z0 + 0.38, 0.05, K.doorH - 0.06, 0.72); leaf.rotation.y = s * 0.25; }
    // 기둥(네 모서리 + 문 양옆)과 보
    for (const x of [K.x0, K.x1]) for (const z of [K.z0, K.z1]) box(g, 'oldWood', x, K.h / 2, z, 0.22, K.h, 0.22);
    box(g, 'oldWood', 0, K.h + 0.09, K.z0, W + 0.3, 0.2, 0.24);                            // 뒤 도리
    for (const x of [K.x0, K.x1]) box(g, 'oldWood', x, K.h + 0.09, (K.z0 + K.z1) / 2, 0.24, 0.2, D + 0.2);
    box(g, 'oldWood', 0, K.h + 0.22, (K.z0 + K.z1) / 2 - 0.4, W + 0.3, 0.32, 0.3);            // 대들보(가로)
    // 옆벽: 흙벽 + 가운데 기둥·인방, 오른쪽 벽에 살창
    for (const s of [-1, 1]) {
      const x = s > 0 ? K.x1 : K.x0;
      box(g, 'mud', x, K.h / 2, (K.z0 + K.z1) / 2, 0.14, K.h, D);
      box(g, 'oldWood', x - s * 0.01, 1.3, (K.z0 + K.z1) / 2, 0.16, 0.12, D);             // 인방
      box(g, 'oldWood', x - s * 0.01, K.h / 2, (K.z0 + K.z1) / 2, 0.16, K.h, 0.18);        // 샛기둥
    }
    plane(g, 'salchang', K.x1 - 0.08, 1.65, -0.5, 0.9, 0.6, -Math.PI / 2);                 // 살창(바깥 빛)
    plane(g, 'salchang', 0.82, 1.72, K.z0 + 0.08, 0.8, 0.5);                                // 찬장 위 살창
    // 지붕 밑: 서까래가 그대로 보이는 연등천장(그을린 나무) — 가운데 용마루로 올라간다
    const rafters = [], n = 15;
    for (let i = 0; i <= n; i++) { const z = K.z0 + 0.1 + (D - 0.2) * i / n; for (const s of [-1, 1]) { const len = Math.hypot(W / 2, K.ridge - K.h) + 0.1, ang = Math.atan2(K.ridge - K.h, W / 2); rafters.push([s * W / 4, (K.h + K.ridge) / 2 + 0.05, z, 0, 0, s * (Math.PI / 2 - ang), 1, len, 1]); } }
    many(g, new THREE.CylinderGeometry(0.05, 0.055, 1, 8), 'oldWood', rafters).castShadow = false;   // 지붕이 해를 가리니 서까래 그림자는 안 그린다
    for (const s of [-1, 1]) { const len = Math.hypot(W / 2, K.ridge - K.h) + 0.15, ang = Math.atan2(K.ridge - K.h, W / 2); const p = box(g, 'soot', s * W / 4, (K.h + K.ridge) / 2 + 0.12, (K.z0 + K.z1) / 2, len, 0.03, D + 0.3, false); p.rotation.z = -s * ang; }   // 개판(서까래 위 판)
    box(g, 'oldWood', 0, K.ridge + 0.05, (K.z0 + K.z1) / 2, 0.26, 0.24, D + 0.3);          // 마룻대
    // 뒷벽 위 박공(삼각 흙벽)
    const tri = new THREE.Shape(); tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, K.ridge - K.h); tri.closePath();
    const gable = new THREE.Mesh(new THREE.ShapeGeometry(tri), M('mud')); gable.position.set(0, K.h + 0.19, K.z0 - 0.02); g.add(gable);
    const gable2 = gable.clone(); gable2.position.z = K.z1 + 0.02; gable2.rotation.y = Math.PI; g.add(gable2);
    return g;
  }

  // ───────────── 부뚜막(아궁이 위 솥 걸린 흙 단) ─────────────
  // 왼쪽 벽에 붙여 앞(+X)을 본다. 솥 자리 위쪽 높이를 돌려준다.
  function buttumak(parent, x, z, len) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const h = 0.62, d = 0.95;
    box(g, 'stoveClay', 0, h / 2, 0, d, h, len);
    box(g, 'stoveClay', 0, h + 0.015, 0, d + 0.04, 0.03, len + 0.04);   // 윗면(매끈하게 바른 흙)
    const holes = [-len / 4, len / 4], fires = [];
    const holeM = new THREE.MeshBasicMaterial({ color: '#140d08' });
    const flameG = new THREE.ConeGeometry(0.05, 0.16, 8);
    for (const hz of holes) {
      // 아궁이: 아래는 네모, 위는 둥근 아치 모양으로 뚫린 검은 입구 + 안에서 일렁이는 불
      mesh(geo.box, holeM, g, [d / 2 - 0.005, 0.13, hz], [0.02, 0.22, 0.34]).castShadow = false;
      mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20, 1, false, 0, Math.PI), holeM, g, [d / 2 - 0.005, 0.24, hz], null, [0, 0, Math.PI / 2]).castShadow = false;
      for (const [dz, s] of [[-0.07, 0.8], [0, 1.15], [0.07, 0.9]]) { const f = mesh(flameG, M('fire'), g, [d / 2 + 0.01, 0.08 + 0.08 * s, hz + dz], s); f.castShadow = false; f.userData.s = s; fires.push(f); }
      const glowS = H.glowSprite('#ff8a30', 0.45, 0.6); glowS.position.set(d / 2 + 0.03, 0.16, hz); g.add(glowS);
      mesh(geo.box, M('soot'), g, [d / 2 + 0.003, 0.43, hz], [0.01, 0.1, 0.42]).castShadow = false;   // 아궁이 위 그을음 자국
    }
    const glow = new THREE.PointLight('#ff9a4a', 0.9, 2.4, 2); glow.position.set(d / 2 + 0.3, 0.3, 0); g.add(glow);
    H.onUpdate(() => { if (!g.visible) return; const t = H.now; fires.forEach((f, i) => { const k = f.userData.s * (0.85 + 0.2 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i)); f.scale.set(f.userData.s, k, f.userData.s); }); glow.intensity = 0.75 + 0.2 * Math.sin(t * 7.1) * Math.sin(t * 3.7); });
    return { g, top: h + 0.03, holes };
  }

  // ───────────── 살강(벽에 단 그릇 선반) — 낱말 물건을 올려 둔다 ─────────────
  function salgang(parent, x, z, w, levels) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    for (const y of levels) { box(g, 'wood', 0, y - 0.0125, 0, w, 0.025, 0.36); for (let i = 0; i < 9; i++) box(g, 'wood', -w / 2 + 0.05 + (w - 0.1) * i / 8, y - 0.03, 0, 0.03, 0.02, 0.36, false); }
    for (const sx of [-1, 1]) box(g, 'oldWood', sx * (w / 2 - 0.02), levels[levels.length - 1] / 2 + 0.05, 0, 0.05, levels[levels.length - 1] + 0.1, 0.36);
    return g;
  }

  // ───────────── 안방(같이 먹는 곳): 장판·벽지·반자·띠살문·병풍·방석·반닫이 ─────────────
  // 부엌 왼쪽 벽 너머(부뚜막이 안방 쪽 벽에 붙어 있다 — 한국민족문화대백과 '부엌'). 가운데 (cx, cz), 안쪽 너비 W·깊이 D.
  const AN = { cx: -6.3, cz: 0, W: 3.6, D: 3.4, H: 2.3 };
  function anbang(parent) {
    const { cx, cz, W, D, H: RH } = AN, x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2;
    const g = new THREE.Group(); parent.add(g);
    const fl = plane(g, 'jangpan', cx, 0.002, cz, W, D, 0, -Math.PI / 2); fl.receiveShadow = true;
    plane(g, 'banja', cx, RH, cz, W, D, 0, Math.PI / 2);
    // 벽: 뒤·왼쪽은 벽지, 앞은 띠살문 네 짝, 오른쪽(부엌 쪽)은 벽지 + 작은 문
    plane(g, 'wallpaper', cx, RH / 2, z0, W, RH);
    plane(g, 'wallpaper', x0, RH / 2, cz, D, RH, Math.PI / 2);
    plane(g, 'wallpaper', x1, RH / 2, cz, D, RH, -Math.PI / 2);
    const dw = (W - 0.3) / 4;
    for (let i = 0; i < 4; i++) door(g, x0 + 0.15 + dw * (i + 0.5), 1.0, z1, dw - 0.03, 1.9, Math.PI, true);
    plane(g, 'wallpaper', cx, 2.15, z1, W, 0.3, Math.PI);
    door(g, x1 - 0.01, 0.95, cz - 0.9, 0.62, 1.6, -Math.PI / 2, false);                          // 부엌으로 통하는 작은 문
    // 나무 뼈대: 네 모서리 기둥, 위·아래 인방
    for (const x of [x0, x1]) for (const z of [z0, z1]) box(g, 'wood', x, RH / 2, z, 0.18, RH, 0.18);
    for (const z of [z0, z1]) { box(g, 'wood', cx, RH - 0.06, z, W, 0.12, 0.14); box(g, 'wood', cx, 0.05, z, W, 0.1, 0.14); }
    for (const x of [x0, x1]) { box(g, 'wood', x, RH - 0.06, cz, 0.14, 0.12, D); box(g, 'wood', x, 0.05, cz, 0.14, 0.1, D); }
    box(g, 'wood', cx, 1.95, z1, W, 0.08, 0.12);
    // 병풍 여덟 폭(지그재그)
    const n = 8, pw = 0.36, sx = cx - (n * pw * 0.94) / 2;
    for (let i = 0; i < n; i++) { const p = mesh(geo.plane, std('#ffffff', 0.85, { map: T.screen(i), side: THREE.DoubleSide }), g, [sx + (i + 0.5) * pw * 0.94, 0.8, z0 + 0.32 + (i % 2) * 0.1], [pw, 1.5, 1], [0, (i % 2 ? -1 : 1) * 0.33, 0]); p.castShadow = true; }
    // 방석 둘(하나 자리·손님 자리), 반닫이(왼쪽 벽)
    for (const [z, s] of [[cz - 0.55, 1], [cz + 0.85, 1]]) { box(g, 'cushionEdge', cx + 0.2, 0.035, z, 0.62 * s, 0.07, 0.62 * s); box(g, 'cushion', cx + 0.2, 0.06, z, 0.52 * s, 0.05, 0.52 * s); }
    box(g, 'chest', x0 + 0.3, 0.42, cz + 0.4, 0.45, 0.84, 1.0);                                       // 반닫이
    box(g, 'oldWood', x0 + 0.3, 0.86, cz + 0.4, 0.5, 0.04, 1.06);
    for (const dz of [-0.3, 0.3]) box(g, 'brass', x0 + 0.53, 0.62, cz + 0.4 + dz, 0.015, 0.16, 0.05, false);   // 경첩
    box(g, 'brass', x0 + 0.53, 0.5, cz + 0.4, 0.015, 0.09, 0.09, false);                                // 자물쇠 앞바탕
    const lamp = new THREE.PointLight('#ffe2b0', 0.5, 6, 2); lamp.position.set(cx, 2.0, cz + 0.3); g.add(lamp);   // 방 안이 어둡지 않게
    return g;
  }

  // ───────────── 전체 ─────────────
  // opts.jarPromise = 장독대에 쓸 항아리 모델(Promise)
  function build(opts = {}) {
    const root = new THREE.Group(); H.vrOnly.add(root);
    const kit = new THREE.Group(), out = new THREE.Group(); root.add(kit, out);
    kitchen(kit); const an = anbang(root); an.visible = false;   // 안방은 같이 먹을 때만 보인다(그리는 양을 줄이려고 한 번에 한 곳만)
    // 바깥: 마당(흙) → 사랑채, 장독대, 돌담, 감나무, 먼 산
    const yard = plane(out, 'earth', 0, -0.005, -11, 30, 18, 0, -Math.PI / 2); yard.receiveShadow = true;
    sarangchae(out, -12.5);
    jangdokdae(out, -2.1, -5.2, opts.jarPromise);
    wall(out, -6.5, -8, 9, Math.PI / 2); wall(out, 7.3, -9, 8, Math.PI / 2);
    tree(out, 1.3, -7.6, 1.1, true); tree(out, 6.6, -14.5, 1.3, false);
    for (const [x, z, s, m] of [[-18, -40, 1, 'hill'], [14, -44, 1.2, 'hill'], [-2, -55, 1.6, 'hill2']]) { const h = mesh(new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(m), out, [x, -1, z], [s * 1.6, s * 0.7, s]); h.castShadow = false; h.receiveShadow = false; }
    root.updateMatrixWorld(true);
    out.traverse(o => { if (o.isMesh && o.getWorldPosition(V3()).z < -9) o.castShadow = false; });   // 먼 것은 그림자를 안 만든다
    return { root, kitchen: kit, outside: out, anbang: an, show(where) { const a = where === 'anbang'; an.visible = a; kit.visible = !a; out.visible = !a; } };
  }
  return { build, buttumak, salgang, K, AN, M, box };
})();
