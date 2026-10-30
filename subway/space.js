/* 「지하철을 타요」 지하철역·열차 공간 (2026-10-21) — 모두 코드로 짓고 글씨·노선도는 캔버스로 그린다(내려받기 없음, 실제 회사·로고 없음).
   벽·바닥·천장·터널은 VR·화면에서만(H.vrOnly — 혼합현실에서는 실제 방). 역무실·노선도·개찰구·충전 기계·표지판·스크린도어·열차는 혼합현실에서도 보인다(H.world).
   역과 열차 안은 같은 자리에 지어 두고 보이기만 바꾼다(타면 역을 숨기고 열차 안을 보임) — 헤드셋·휴대폰 혼합현실에서도 사용자를 옮기지 않아도 된다.
   좌표: 사용자는 +Z 쪽(z≈2.4)에서 -Z를 본다. 바닥 y=0. 대합실 x -3.4~3.4, 스크린도어 z=-2.6, 열차 z≈-3.2. 단위 m.                       */
window.SUBWAY_SPACE = (function () {
  'use strict';
  const H = window.HW;
  const { V3, std, mesh, geo } = H;

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    t.userData = { canvas: c, draw };
    return t;
  }
  function redraw(t, draw) { const c = t.userData.canvas; draw(c.getContext('2d'), c.width, c.height); t.needsUpdate = true; }
  const FONT = '"Noto Sans KR","Malgun Gothic",system-ui,sans-serif';
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const basic = (map, extra) => new THREE.MeshBasicMaterial(Object.assign({ map }, extra || {}));
  const noShadow = m => { m.castShadow = false; return m; };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function txt(g, s, x, y, size, color, align = 'center', weight = 900) { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function badge(g, x, y, r, color, label) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); txt(g, label, x, y + r * 0.06, r * 1.25, '#ffffff'); }
  function arrow(g, x, y, s, dir, color) {   // dir: 1 = →, -1 = ←, 0 = ↑
    g.save(); g.translate(x, y); g.rotate(dir === 0 ? -Math.PI / 2 : dir < 0 ? Math.PI : 0); g.fillStyle = color;
    g.beginPath(); g.moveTo(-s * 0.5, -s * 0.16); g.lineTo(s * 0.1, -s * 0.16); g.lineTo(s * 0.1, -s * 0.42); g.lineTo(s * 0.55, 0); g.lineTo(s * 0.1, s * 0.42); g.lineTo(s * 0.1, s * 0.16); g.lineTo(-s * 0.5, s * 0.16); g.closePath(); g.fill(); g.restore();
  }

  const ST = { x0: -3.4, x1: 3.4, z0: -2.6, z1: 3.2, h: 3.0 };
  let L = null;   // 노선(content.js의 lines)

  // ───────────── 역 바탕(벽·바닥·천장·선로 터널) — VR·화면에서만 ─────────────
  function buildShell(parent) {
    const root = new THREE.Group(); parent.add(root);
    const W = ST.x1 - ST.x0, D = ST.z1 - ST.z0, cx = 0, cz = (ST.z0 + ST.z1) / 2;
    const floorT = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 128) { g.fillStyle = `hsl(35,6%,${78 + rnd() * 6}%)`; g.fillRect(x + 2, y + 2, 124, 124); }
      g.fillStyle = 'rgba(90,85,80,0.35)'; for (let i = 0; i <= w; i += 128) { g.fillRect(i - 1, 0, 3, h); g.fillRect(0, i - 1, w, 3); }
    }, [W / 1.0, D / 1.0]);
    mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', 0.6, { map: floorT }), root, [cx, 0.001, cz], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    // 스크린도어 앞 노란 점자 블록 띠
    const tileT = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9a91c'; for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }, [W / 1.2, 1]);
    noShadow(mesh(new THREE.PlaneGeometry(W, 0.3), std('#ffffff', 0.7, { map: tileT }), root, [cx, 0.003, ST.z0 + 0.25], null, [-Math.PI / 2, 0, 0]));
    // 옆벽·앞벽: 흰 타일 + 청록 띠
    const wallT = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 2;
      for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#2a9d8f'; g.fillRect(0, h * 0.6, w, h * 0.05); g.fillStyle = '#b9b5ab'; g.fillRect(0, h * 0.93, w, h * 0.07);
    }, [4, 1]);
    const wallM = std('#ffffff', 0.85, { map: wallT });
    for (const [x, z, len, ry] of [[ST.x0, cz, D, Math.PI / 2], [ST.x1, cz, D, -Math.PI / 2], [cx, ST.z1, W, Math.PI]]) { const m = mesh(new THREE.PlaneGeometry(len, ST.h), wallM, root, [x, ST.h / 2, z], null, [0, ry, 0]); m.castShadow = false; }
    // 스크린도어 위 벽(문 높이 2.2 위)
    mesh(new THREE.PlaneGeometry(W, ST.h - 2.2), std('#e4e1d9', 0.85), root, [cx, 2.2 + (ST.h - 2.2) / 2, ST.z0 - 0.02]).castShadow = false;
    // 천장 + 긴 등
    noShadow(mesh(new THREE.PlaneGeometry(W, D + 2), std('#dcdad3', 0.95), root, [cx, ST.h, cz - 1], null, [Math.PI / 2, 0, 0]));
    const lampM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const x of [-2.2, 0, 2.2]) for (const z of [-1.6, 0.4, 2.2]) noShadow(mesh(geo.box, lampM, root, [x, ST.h - 0.02, z], [1.2, 0.03, 0.14]));
    // 선로 쪽(스크린도어 뒤): 어두운 터널 벽·선로 바닥
    noShadow(mesh(new THREE.PlaneGeometry(W + 4, ST.h), std('#3b3f45', 0.9), root, [cx, ST.h / 2, -4.6]));
    noShadow(mesh(new THREE.PlaneGeometry(W + 4, 2.0), std('#2a2c30', 0.95), root, [cx, -0.02, -3.6], null, [-Math.PI / 2, 0, 0]));
    for (const sx of [-1, 1]) noShadow(mesh(new THREE.PlaneGeometry(2.0, ST.h), std('#3b3f45', 0.9), root, [sx * (W / 2), ST.h / 2, -3.6], null, [0, -sx * Math.PI / 2, 0]));
    return root;
  }

  // ───────────── 걸이 표지판(천장에서 내려온 상자, 앞면에 글씨) ─────────────
  function hangSign(parent, x, y, z, w, h, draw, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const px = 256 * (o.res || 2), tex = canvasTex(Math.round(px * w / h), px, draw);
    const face = basic(tex, { toneMapped: false }), side = std(o.side || '#2f3337', 0.5);
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), [side, side, side, side, face, side]); box.castShadow = true; g.add(box);
    if (o.rods !== false) for (const sx of [-1, 1]) { const top = ST.h - y; mesh(geo.box, std('#8a8f95', 0.4), g, [sx * w * 0.35, h / 2 + (top - h / 2) / 2, 0], [0.02, top - h / 2, 0.02]).castShadow = false; }
    g.userData.size = V3(w, h, 0.06); g.userData.tex = tex;
    return g;
  }

  // ───────────── 역무실 창구(가운데 x, 앞면 z) ─────────────
  function booth(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const w = 1.5, d = 0.5, h = 0.95;
    const frontT = canvasTex(512, 256, (gg, ww, hh) => { gg.fillStyle = '#f3f1ea'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#2a9d8f'; gg.fillRect(0, hh * 0.12, ww, hh * 0.08); gg.fillStyle = '#c9c4b8'; gg.fillRect(0, hh * 0.9, ww, hh * 0.1); });
    mesh(geo.box, std('#ffffff', 0.6, { map: frontT }), g, [0, h / 2, -d / 2], [w, h, d]);
    mesh(geo.box, std('#b9b2a4', 0.35), g, [0, h + 0.02, -d / 2 + 0.03], [w + 0.08, 0.04, d + 0.1]);   // 윗판
    // 창틀(유리 없이 틀만: 하나 얼굴이 가리지 않게)
    const frame = std('#8c939a', 0.35, { metalness: 0.3 });
    for (const sx of [-1, 1]) mesh(geo.box, frame, g, [sx * (w / 2 - 0.03), h + 0.62, -0.02], [0.06, 1.2, 0.06]);
    mesh(geo.box, frame, g, [0, h + 1.2, -0.02], [w, 0.06, 0.06]);
    // 위 간판
    const signT = canvasTex(1024, 192, (gg, ww, hh) => { gg.fillStyle = '#2a9d8f'; gg.fillRect(0, 0, ww, hh); txt(gg, '역무실 · 안내', ww / 2, hh * 0.52, 104, '#ffffff'); });
    noShadow(mesh(geo.box, std('#ffffff', 0.5, { map: signT, emissive: H.hex('#ffffff'), emissiveMap: signT, emissiveIntensity: 0.3 }), g, [0, h + 1.42, -0.02], [w + 0.1, 0.28, 0.06]));
    // 뒤 벽(사무실 안쪽 느낌)
    mesh(geo.box, std('#dad6cc', 0.8), g, [0, 1.25, -1.15], [w + 0.2, 2.5, 0.06]);
    for (const sx of [-1, 1]) mesh(geo.box, std('#e4e0d6', 0.8), g, [sx * (w / 2 + 0.07), 1.25, -0.6], [0.06, 2.5, 1.1]);
    return { g, top: h };
  }

  // ───────────── 노선도(서 있는 판) ─────────────
  // 1호선: 가로(학교–하나–공원–병원), 2호선: 공원에서 세로(시장 위, 바다 아래)
  function drawMap(g, w, h, o = {}) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f3337'; g.fillRect(0, 0, w, h * 0.13); txt(g, '노선도', w * 0.04, h * 0.066, h * 0.07, '#ffffff', 'left');
    txt(g, 'Route Map', w * 0.96, h * 0.066, h * 0.045, '#c9cdd2', 'right', 500);
    const c1 = L[1].color, c2 = L[2].color;
    const y1 = h * 0.5, xs = [0.12, 0.38, 0.62, 0.88].map(f => f * w), park = xs[2];
    const ys2 = [h * 0.24, y1, h * 0.84];
    const lw = h * 0.035;
    g.lineCap = 'round';
    g.strokeStyle = c1; g.lineWidth = lw; g.beginPath(); g.moveTo(xs[0], y1); g.lineTo(xs[3], y1); g.stroke();
    g.strokeStyle = c2; g.beginPath(); g.moveTo(park, ys2[0]); g.lineTo(park, ys2[2]); g.stroke();
    if (o.path) {   // 하나 → 공원 → 바다 길 표시(노란 굵은 선)
      g.strokeStyle = 'rgba(255,196,0,0.85)'; g.lineWidth = lw * 2.2; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(xs[1], y1); g.lineTo(park, y1); g.lineTo(park, ys2[2]); g.stroke();
      g.strokeStyle = c1; g.lineWidth = lw; g.beginPath(); g.moveTo(xs[1], y1); g.lineTo(park, y1); g.stroke();
      g.strokeStyle = c2; g.beginPath(); g.moveTo(park, y1); g.lineTo(park, ys2[2]); g.stroke();
    }
    const stn = (x, y, name, color, big, below) => {
      g.fillStyle = '#ffffff'; g.strokeStyle = color; g.lineWidth = lw * 0.5; g.beginPath(); g.arc(x, y, big ? lw * 1.1 : lw * 0.8, 0, 7); g.fill(); g.stroke();
      txt(g, name, x, below ? y + h * 0.085 : y - h * 0.08, h * 0.058, '#29263a', 'center', 800);
    };
    L[1].stations.forEach((n, i) => { if (i !== 2) stn(xs[i], y1, n, c1, false, true); });
    stn(xs[2] - w * 0.0, y1, '', '#555', true);   // 공원역: 갈아타는 역(굵은 테)
    txt(g, '공원역', park + w * 0.075, y1 - h * 0.075, h * 0.058, '#29263a', 'center', 800);
    stn(park, ys2[0], '시장역', c2, false, false);
    stn(park, ys2[2], '바다역', c2, false, false);
    // 갈아타는 표시 ⇄
    txt(g, '⇄', park - w * 0.05, y1 + h * 0.085, h * 0.06, '#555', 'center', 900);
    // 현재 위치
    g.fillStyle = '#e63946'; g.beginPath(); g.moveTo(xs[1], y1 - lw * 1.2); g.lineTo(xs[1] - lw, y1 - lw * 2.8); g.lineTo(xs[1] + lw, y1 - lw * 2.8); g.closePath(); g.fill();
    txt(g, '지금 여기', xs[1], y1 - h * 0.15, h * 0.05, '#e63946', 'center', 800);
    // 범례
    badge(g, w * 0.07, h * 0.92, h * 0.035, c1, '1'); txt(g, '1호선', w * 0.1, h * 0.92, h * 0.045, '#29263a', 'left', 700);
    badge(g, w * 0.27, h * 0.92, h * 0.035, c2, '2'); txt(g, '2호선', w * 0.3, h * 0.92, h * 0.045, '#29263a', 'left', 700);
  }
  function mapBoard(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const bw = 1.3, bh = 0.95, cy = 1.45;
    const tex = canvasTex(1300, 950, (gg, w, h) => drawMap(gg, w, h));
    const back = std('#2f3337', 0.5);
    const board = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.04), [back, back, back, back, basic(tex, { toneMapped: false }), back]); board.position.y = cy; board.castShadow = true; g.add(board);
    for (const sx of [-1, 1]) mesh(geo.box, std('#6f757b', 0.4, { metalness: 0.3 }), g, [sx * (bw / 2 - 0.08), (cy - bh / 2) / 2, -0.01], [0.05, cy - bh / 2, 0.05]);
    mesh(geo.box, std('#6f757b', 0.4), g, [0, 0.02, 0], [bw * 0.8, 0.04, 0.3]);
    return { g, center: V3(x, cy, z), size: V3(bw, bh, 0.04), setPath(on) { redraw(tex, (gg, w, h) => drawMap(gg, w, h, { path: on })); } };
  }

  // ───────────── 개찰구(4칸 장 → 3줄) ─────────────
  function gates(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const xs = [-0.82, -0.27, 0.27, 0.82], cw = 0.18, cd = 0.9, ch = 0.95;
    const bodyT = canvasTex(256, 256, (gg, w, h) => { gg.fillStyle = '#c9ced3'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#2a9d8f'; gg.fillRect(0, h * 0.18, w, h * 0.06); });
    const body = std('#ffffff', 0.35, { map: bodyT, metalness: 0.2 });
    const readerT = canvasTex(128, 128, (gg, w, h) => { gg.fillStyle = '#1f6fb2'; rr(gg, 4, 4, w - 8, h - 8, 16); gg.fill(); gg.strokeStyle = '#ffffff'; gg.lineWidth = 6; for (const r of [16, 30, 44]) { gg.beginPath(); gg.arc(w / 2, h * 0.62, r, -2.4, -0.74); gg.stroke(); } });
    const readers = [], flaps = [];
    xs.forEach((cx, i) => {
      mesh(geo.box, body, g, [cx, ch / 2, 0], [cw, ch, cd]);
      mesh(geo.box, std('#3a3f45', 0.4), g, [cx, ch + 0.01, 0], [cw + 0.01, 0.02, cd + 0.01]);
      if (i < 3) {   // 오른쪽 줄의 카드 대는 곳(장 위 앞쪽)
        const r = noShadow(mesh(new THREE.PlaneGeometry(0.13, 0.13), basic(readerT, { toneMapped: false }), g, [cx + 0.0, ch + 0.022, cd / 2 - 0.12], null, [-Math.PI / 2, 0, 0]));
        readers.push(r);
        const lamp = noShadow(mesh(geo.sphere, new THREE.MeshBasicMaterial({ color: 0x2bd96b }), g, [cx + cw / 2 - 0.02, ch - 0.06, cd / 2 + 0.002], [0.04, 0.04, 0.01]));
        r.userData.lamp = lamp;
      }
    });
    // 문(날개): 줄마다 양쪽 장에서 나온 반투명 판 두 장
    const flapM = std('#e86a5a', 0.3, { transparent: true, opacity: 0.75 });
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(side < 0 ? xs[i] + cw / 2 : xs[i + 1] - cw / 2, 0.62, 0.05); g.add(pivot);
        const f = mesh(geo.box, flapM, pivot, [-side * 0.09, 0, 0], [0.18, 0.42, 0.02]); f.castShadow = false;
        flaps.push({ pivot, side, lane: i });
      }
    }
    return { g, readers, top: ch, size: V3(1.9, ch, cd),
      readerPos(i) { return readers[i].getWorldPosition(V3()); },
      open(lane, k) { for (const f of flaps) if (f.lane === lane) f.pivot.rotation.y = f.side * k * Math.PI / 2 * 0.95; } };
  }

  // ───────────── 교통카드 충전 기계 ─────────────
  function machine(parent, x, z, active) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const w = 0.56, d = 0.42, h = 1.72;
    mesh(geo.box, std('#e6e8ea', 0.4, { metalness: 0.15 }), g, [0, h / 2, -d / 2], [w, h, d]);
    const capT = canvasTex(512, 128, (gg, ww, hh) => { gg.fillStyle = '#2a9d8f'; gg.fillRect(0, 0, ww, hh); txt(gg, '교통카드 충전', ww / 2, hh * 0.54, 62, '#ffffff'); });
    noShadow(mesh(new THREE.PlaneGeometry(w - 0.04, 0.13), basic(capT, { toneMapped: false }), g, [0, h - 0.1, 0.002]));
    // 화면
    const scrT = canvasTex(400, 300, (gg, ww, hh) => drawScreen(gg, ww, hh, ['교통카드를', '올려 주세요']));
    const scr = noShadow(mesh(new THREE.PlaneGeometry(0.36, 0.27), basic(scrT, { toneMapped: false }), g, [0, 1.3, 0.003]));
    mesh(geo.box, std('#2c2f35', 0.4), g, [0, 1.3, -0.005], [0.4, 0.31, 0.01]);
    // 카드 올려놓는 곳(앞으로 나온 받침 + 파란 판)
    mesh(geo.box, std('#3a3f45', 0.4), g, [0, 0.98, 0.07], [0.3, 0.04, 0.16]);
    const padT = canvasTex(128, 96, (gg, ww, hh) => { gg.fillStyle = '#1f6fb2'; gg.fillRect(0, 0, ww, hh); txt(gg, '카드', ww / 2, hh * 0.52, 34, '#ffffff', 'center', 800); });
    noShadow(mesh(new THREE.PlaneGeometry(0.2, 0.12), basic(padT, { toneMapped: false }), g, [0, 1.002, 0.075], null, [-Math.PI / 2, 0, 0]));
    // 지폐 넣는 곳
    mesh(geo.box, std('#222', 0.5), g, [0.12, 0.78, 0.003], [0.18, 0.02, 0.01]);
    if (!active) redraw(scrT, (gg, ww, hh) => drawScreen(gg, ww, hh, ['교통카드', '충전 · 구입']));
    return { g, pad: V3(x, 1.01, z + 0.075), size: V3(w, h, d), setScreen(lines, color) { redraw(scrT, (gg, ww, hh) => drawScreen(gg, ww, hh, lines, color)); } };
  }
  function drawScreen(g, w, h, lines, color) {
    g.fillStyle = color || '#123a5c'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, h * 0.16); txt(g, '교통카드 충전', w / 2, h * 0.08, h * 0.08, '#cfe8ff', 'center', 700);
    lines.forEach((s, i) => txt(g, s, w / 2, h * (0.42 + i * 0.2), h * 0.13, '#ffffff', 'center', 800));
  }

  // ───────────── 교통카드(가상 무늬) ─────────────
  function transitCard() {
    const g = new THREE.Group();
    const t = canvasTex(256, 160, (gg, w, h) => {
      const gr = gg.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a9d8f'); gr.addColorStop(1, '#3d6fd1'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
      gg.strokeStyle = 'rgba(255,255,255,0.35)'; gg.lineWidth = 10; gg.beginPath(); gg.moveTo(-10, h * 0.8); gg.bezierCurveTo(w * 0.3, h * 0.4, w * 0.6, h * 1.1, w + 10, h * 0.5); gg.stroke();
      txt(gg, '교통카드', 20, 38, 34, '#ffffff', 'left'); txt(gg, 'T-CARD', w - 18, h - 26, 22, 'rgba(255,255,255,0.85)', 'right', 700);
    });
    const edge = std('#2a7f86', 0.4);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.003, 0.054), [edge, edge, std('#ffffff', 0.35, { map: t }), edge, edge, edge]);
    c.position.y = 0.002; c.castShadow = true; g.add(c);
    return g;
  }

  // ───────────── 스크린도어 + 역 이름판 ─────────────
  const DOOR_X = [-2.0, 0, 2.0];
  function screenDoors(parent) {
    const g = new THREE.Group(); g.position.set(0, 0, ST.z0); parent.add(g);
    const glass = std('#cfe8f0', 0.08, { transparent: true, opacity: 0.28 }), frame = std('#9aa2aa', 0.35, { metalness: 0.4 });
    const W = ST.x1 - ST.x0, dh = 2.05;
    // 고정 유리벽(문 사이) + 기둥
    const fixed = [];
    let prev = ST.x0;
    for (const dx of DOOR_X) { fixed.push([prev, dx - 0.6]); prev = dx + 0.6; } fixed.push([prev, ST.x1]);
    for (const [a, b] of fixed) { if (b - a < 0.05) continue; const m = mesh(geo.box, glass, g, [(a + b) / 2, dh / 2, 0], [b - a, dh, 0.03]); m.castShadow = false; }
    for (const dx of DOOR_X) for (const sx of [-1, 1]) mesh(geo.box, frame, g, [dx + sx * 0.62, dh / 2, 0], [0.05, dh, 0.08]);
    mesh(geo.box, std('#4a5057', 0.5), g, [0, dh + 0.08, 0], [W, 0.16, 0.12]);   // 위 머리
    // 문짝(가운데에서 양옆으로 열림)
    const leaves = [];
    for (const dx of DOOR_X) for (const sx of [-1, 1]) {
      const leaf = new THREE.Group(); leaf.position.set(dx + sx * 0.3, 0, 0.02); g.add(leaf);
      mesh(geo.box, glass, leaf, [0, dh / 2, 0], [0.6, dh, 0.025]).castShadow = false;
      mesh(geo.box, frame, leaf, [0, dh / 2, 0], [0.6, 0.04, 0.03]);
      leaves.push({ leaf, sx, x0: dx + sx * 0.3 });
    }
    // 문 위 작은 화면(노선 색 띠)
    return { g, open(k) { for (const l of leaves) l.leaf.position.x = l.x0 + l.sx * 0.56 * k; } };
  }
  function drawName(g, w, h, st) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = st.color; g.fillRect(0, h * 0.7, w, h * 0.08);
    badge(g, w * 0.09, h * 0.36, h * 0.16, st.color, st.line);
    txt(g, st.name, w / 2, h * 0.36, h * 0.38, '#1d1b26');
    if (st.prev) txt(g, '← ' + st.prev, w * 0.04, h * 0.88, h * 0.12, '#4a4658', 'left', 700);
    if (st.next) txt(g, st.next + ' →', w * 0.96, h * 0.88, h * 0.12, '#4a4658', 'right', 700);
  }
  function nameBoard(parent, x, y, z) {
    const w = 1.3, h = 0.42;
    const tex = canvasTex(1040, 336, (g, ww, hh) => drawName(g, ww, hh, { name: '하나역', line: '1', color: L[1].color, prev: '학교역', next: '공원역' }));
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const side = std('#3a3f45', 0.5);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), [side, side, side, side, basic(tex, { toneMapped: false }), side]); b.castShadow = true; g.add(b);
    g.userData.size = V3(w, h, 0.04);
    return { g, set(st) { redraw(tex, (gg, ww, hh) => drawName(gg, ww, hh, st)); } };
  }

  // ───────────── 열차(바깥) ─────────────
  function train(parent) {
    const g = new THREE.Group(); g.position.set(0, 0, -3.25); parent.add(g);
    const len = 8.4, hh = 2.45, dep = 1.2;
    const bodyM = std('#d9dde1', 0.3, { metalness: 0.35 });
    mesh(geo.box, bodyM, g, [0, 0.12 + hh / 2, -dep / 2], [len, hh, dep]);
    const stripes = [std('#2a9d8f', 0.4), std('#2a9d8f', 0.4)];
    mesh(geo.box, stripes[0], g, [0, 0.95, 0.005], [len, 0.12, 0.02]);
    mesh(geo.box, stripes[1], g, [0, 2.25, 0.005], [len, 0.08, 0.02]);
    const winM = std('#2c3a46', 0.15, { metalness: 0.2 });
    const winX = [-3.6, -1.0, 1.0, 3.6];
    for (const wx of winX) mesh(geo.box, winM, g, [wx, 1.55, 0.006], [wx === -3.6 || wx === 3.6 ? 0.9 : 1.1, 0.72, 0.02]);
    const doors = [];
    for (const dx of DOOR_X) for (const sx of [-1, 1]) {
      const d = new THREE.Group(); d.position.set(dx + sx * 0.32, 0, 0.012); g.add(d);
      mesh(geo.box, std('#c9ced3', 0.3, { metalness: 0.35 }), d, [0, 0.12 + 1.0, 0], [0.62, 2.0, 0.02]);
      mesh(geo.box, winM, d, [0, 1.55, 0.012], [0.4, 0.7, 0.01]);
      doors.push({ d, sx, x0: dx + sx * 0.32 });
    }
    // 앞 행선 표시(열차 위 작은 판)
    const destT = canvasTex(512, 96, (gg, w, h) => { gg.fillStyle = '#111'; gg.fillRect(0, 0, w, h); txt(gg, '1호선 · 병원역 행', w / 2, h / 2, 48, '#ffb347', 'center', 800); });
    const dest = noShadow(mesh(new THREE.PlaneGeometry(0.9, 0.17), basic(destT, { toneMapped: false }), g, [-2.0, 2.38, 0.02]));
    g.userData.size = V3(len, hh, dep);
    return { g, center: V3(0, 1.3, -3.25),
      setLine(no) { const c = L[no].color; stripes.forEach(m => m.color.set(c)); redraw(destT, (gg, w, h) => { gg.fillStyle = '#111'; gg.fillRect(0, 0, w, h); txt(gg, no === 1 ? '1호선 · 병원역 행' : '2호선 · 바다역 행', w / 2, h / 2, 48, '#ffb347', 'center', 800); }); },
      open(k) { for (const o of doors) o.d.position.x = o.x0 + o.sx * 0.6 * k; } };
  }

  // ───────────── 열차 안(역과 같은 자리, 보이기만 바꿈) ─────────────
  function carInside(worldParent, shellParent) {
    const w = new THREE.Group(), s = new THREE.Group(); worldParent.add(w); shellParent.add(s); w.visible = s.visible = false;
    const zBack = 0.2, zFront = 3.3, x0 = -4.2, x1 = 4.2, ch = 2.35;
    // 껍데기(VR·화면에서만): 바닥·천장·옆벽
    noShadow(mesh(new THREE.PlaneGeometry(x1 - x0, zFront - zBack), std('#a7a29a', 0.8), s, [0, 0.002, (zBack + zFront) / 2], null, [-Math.PI / 2, 0, 0]));
    noShadow(mesh(new THREE.PlaneGeometry(x1 - x0, zFront - zBack), std('#eef0f2', 0.9), s, [0, ch, (zBack + zFront) / 2], null, [Math.PI / 2, 0, 0]));
    for (const sx of [-1, 1]) noShadow(mesh(new THREE.PlaneGeometry(zFront - zBack, ch), std('#dfe3e6', 0.7), s, [sx * x1, ch / 2, (zBack + zFront) / 2], null, [0, -sx * Math.PI / 2, 0]));
    noShadow(mesh(new THREE.PlaneGeometry(x1 - x0, ch), std('#dfe3e6', 0.7), s, [0, ch / 2, zFront], null, [0, Math.PI, 0]));
    const lampM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const z of [0.9, 2.6]) noShadow(mesh(geo.box, lampM, s, [0, ch - 0.02, z], [7.5, 0.03, 0.1]));
    // 맞은편 벽(창문 + 문): 혼합현실에서도 보이게 world
    const wallM = std('#dfe3e6', 0.7);
    const tunnelT = canvasTex(512, 128, (g, ww, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#15181c'); gr.addColorStop(0.5, '#2a2f36'); gr.addColorStop(1, '#15181c'); g.fillStyle = gr; g.fillRect(0, 0, ww, hh); g.fillStyle = 'rgba(255,214,140,0.9)'; for (let x = 20; x < ww; x += 128) g.fillRect(x, hh * 0.3, 36, 6); g.fillStyle = 'rgba(120,130,140,0.5)'; g.fillRect(0, hh * 0.72, ww, 3); }, [1, 1]);
    tunnelT.wrapS = THREE.RepeatWrapping;
    const winM = basic(tunnelT, { toneMapped: false });
    const winX = [-2.9, -0.95, 0.95, 2.9];
    mesh(geo.box, wallM, w, [0, 1.15, zBack - 0.03], [x1 - x0, 2.3, 0.03]);
    for (const wx of winX) {
      mesh(geo.box, std('#b9bfc5', 0.4), w, [wx, 1.45, zBack - 0.005], [1.3, 0.8, 0.02]);
      noShadow(mesh(new THREE.PlaneGeometry(1.2, 0.7), winM, w, [wx, 1.45, zBack + 0.008]));
    }
    // 문(창 사이 세 곳)
    const doorM = std('#c9ced3', 0.3, { metalness: 0.35 }), doorWin = std('#2c3a46', 0.15);
    for (const dx of [-1.93, 0, 1.93]) for (const sx of [-1, 1]) { mesh(geo.box, doorM, w, [dx + sx * 0.17, 1.0, zBack - 0.005], [0.33, 2.0, 0.02]); mesh(geo.box, doorWin, w, [dx + sx * 0.17, 1.45, zBack + 0.007], [0.22, 0.6, 0.01]); }
    // 긴 의자(맞은편, 창 아래)
    const seatM = std('#4f7fb8', 0.7);
    for (const [a, b] of winX.map(x => [x - 0.6, x + 0.6])) {
      mesh(geo.box, seatM, w, [(a + b) / 2, 0.44, zBack + 0.25], [b - a, 0.08, 0.42]);
      mesh(geo.box, seatM, w, [(a + b) / 2, 0.72, zBack + 0.05], [b - a, 0.5, 0.06]);
      mesh(geo.box, std('#9aa2aa', 0.4, { metalness: 0.4 }), w, [(a + b) / 2, 0.2, zBack + 0.25], [b - a - 0.1, 0.4, 0.3]);
    }
    // 손잡이 봉·손잡이
    const pole = std('#c0c6cc', 0.25, { metalness: 0.6 });
    for (const px of [-1.9, 1.9]) mesh(new THREE.CylinderGeometry(0.018, 0.018, ch, 12), pole, w, [px, ch / 2, 1.3]);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 7.6, 12), pole, w, [0, 1.95, 0.75], null, [0, 0, Math.PI / 2]);
    const handles = [];
    for (let x = -3.4; x <= 3.4; x += 0.45) {
      const hg = new THREE.Group(); hg.position.set(x, 1.95, 0.75); w.add(hg);
      mesh(geo.box, std('#f2f2f2', 0.6), hg, [0, -0.1, 0], [0.025, 0.2, 0.015]);
      const ring = mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 18), std('#f2c230', 0.5), hg, [0, -0.25, 0]); ring.castShadow = false;
      handles.push(hg);
    }
    // 안내 화면(LED): 맞은편 벽 위 가운데
    const ledT = canvasTex(1024, 160, (g, ww, hh) => drawLED(g, ww, hh, '이번 역은', '공원역', L[1].color));
    noShadow(mesh(new THREE.PlaneGeometry(1.6, 0.25), basic(ledT, { toneMapped: false }), w, [0, 2.17, zBack + 0.02]));
    mesh(geo.box, std('#222', 0.5), w, [0, 2.17, zBack + 0.005], [1.68, 0.31, 0.02]);
    // 노선 띠(창 위)
    const stripT = canvasTex(1024, 96, (g, ww, hh) => drawStrip(g, ww, hh, 1));
    for (const wx of [-2.9, 2.9]) noShadow(mesh(new THREE.PlaneGeometry(1.4, 0.13), basic(stripT, { toneMapped: false }), w, [wx, 1.92, zBack + 0.02]));
    let speed = 0, sway = 0;
    H.onUpdate(dt => {
      if (!w.visible) return;
      tunnelT.offset.x += speed * dt * 0.6;
      sway += dt * (0.8 + speed * 2);
      for (const [i, hg] of handles.entries()) hg.rotation.z = Math.sin(sway + i * 0.3) * 0.08 * Math.min(1, speed);
    });
    return { w, s, center: V3(0, 1.4, zBack),
      show(on) { w.visible = s.visible = on; },
      setSpeed(v) { speed = v; },
      setLED(a, b, c) { redraw(ledT, (g, ww, hh) => drawLED(g, ww, hh, a, b, c)); },
      setLine(no) { redraw(stripT, (g, ww, hh) => drawStrip(g, ww, hh, no)); } };
  }
  function drawLED(g, w, h, a, b, color) {
    g.fillStyle = '#0c0d10'; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.fillRect(0, 0, w * 0.02, h);
    txt(g, a, w * 0.06, h * 0.5, h * 0.42, '#ffb347', 'left', 800);
    txt(g, b, w * 0.94, h * 0.52, h * 0.62, '#ffffff', 'right', 900);
  }
  function drawStrip(g, w, h, no) {
    const ln = L[no]; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = ln.color; g.lineWidth = h * 0.12; g.beginPath(); g.moveTo(w * 0.06, h * 0.38); g.lineTo(w * 0.94, h * 0.38); g.stroke();
    const n = ln.stations.length;
    ln.stations.forEach((s, i) => { const x = w * (0.1 + 0.8 * i / (n - 1)); g.fillStyle = '#fff'; g.strokeStyle = ln.color; g.lineWidth = h * 0.06; g.beginPath(); g.arc(x, h * 0.38, h * 0.13, 0, 7); g.fill(); g.stroke(); txt(g, s, x, h * 0.78, h * 0.28, '#29263a', 'center', 700); });
  }

  // ───────────── 표지판 글씨 ─────────────
  function dirSign(text, sub, dir, color) {
    return (g, w, h) => {
      g.fillStyle = '#26292d'; g.fillRect(0, 0, w, h);
      g.fillStyle = color; g.fillRect(0, 0, w, h * 0.08);
      badge(g, dir < 0 ? h * 1.05 : h * 0.36, h * 0.52, h * 0.24, color, '1');
      arrow(g, dir < 0 ? h * 0.42 : w - h * 0.45, h * 0.52, h * 0.55, dir, '#ffffff');
      const tx = dir < 0 ? h * 1.42 : h * 0.72;
      txt(g, text, tx, h * 0.44, h * 0.36, '#ffffff', 'left', 900);
      txt(g, sub, tx, h * 0.8, h * 0.17, '#c9cdd2', 'left', 600);
    };
  }
  function exitSign(n, to, dir) {   // 노란 출구 표지: [번호] 가는 곳 화살표
    return (g, w, h) => {
      g.fillStyle = '#f5c518'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d1b26'; rr(g, h * 0.12, h * 0.14, h * 0.72, h * 0.72, h * 0.12); g.fill();
      txt(g, String(n), h * 0.48, h * 0.52, h * 0.56, '#f5c518');
      txt(g, to, h * 1.05, h * 0.42, h * 0.34, '#1d1b26', 'left', 900);
      txt(g, '출구', h * 1.05, h * 0.78, h * 0.2, '#1d1b26', 'left', 700);
      arrow(g, w - h * 0.42, h * 0.5, h * 0.5, dir, '#1d1b26');
    };
  }
  function exitMain() {   // 대합실 '나가는 곳' 표지(낱말 '출구')
    return (g, w, h) => {
      g.fillStyle = '#f5c518'; g.fillRect(0, 0, w, h);
      txt(g, '출구', h * 0.2, h * 0.46, h * 0.46, '#1d1b26', 'left', 900);
      txt(g, 'Exit', h * 0.22, h * 0.82, h * 0.18, '#1d1b26', 'left', 700);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#1d1b26'; rr(g, w * 0.42 + i * h * 0.6, h * 0.24, h * 0.5, h * 0.5, h * 0.08); g.fill(); txt(g, String(i + 1), w * 0.42 + i * h * 0.6 + h * 0.25, h * 0.5, h * 0.38, '#f5c518'); }
      arrow(g, w - h * 0.4, h * 0.5, h * 0.5, 0, '#1d1b26');
    };
  }
  function transferSign(color) {
    return (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      txt(g, '⇄', h * 0.42, h * 0.5, h * 0.6, '#ffffff');
      txt(g, '갈아타는 곳', h * 0.85, h * 0.4, h * 0.32, '#ffffff', 'left', 900);
      txt(g, 'Transfer', h * 0.87, h * 0.78, h * 0.17, 'rgba(255,255,255,0.85)', 'left', 600);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w - h * 1.0, h * 0.5, h * 0.28, 0, 7); g.fill(); txt(g, '2', w - h * 1.0, h * 0.52, h * 0.38, color);
      arrow(g, w - h * 0.38, h * 0.5, h * 0.45, 1, '#ffffff');
    };
  }
  function lineBadge(color) {   // 기둥에 붙는 '1호선' 표
    return (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); badge(g, w / 2, h * 0.38, w * 0.3, color, '1'); txt(g, '1호선', w / 2, h * 0.82, h * 0.15, '#29263a', 'center', 900); };
  }
  function pillar(parent, x, z, color) {
    const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    mesh(geo.box, std('#e7e4dc', 0.7), g, [0, ST.h / 2, 0], [0.4, ST.h, 0.4]);
    const tex = canvasTex(256, 320, lineBadge(color));
    const face = noShadow(mesh(new THREE.PlaneGeometry(0.34, 0.425), basic(tex, { toneMapped: false }), g, [0, 1.65, 0.202]));
    face.userData.size = V3(0.34, 0.43, 0.02);
    return { g, face };
  }

  function setLines(lines) { L = lines; }
  return { ST, DOOR_X, setLines, buildShell, hangSign, booth, mapBoard, gates, machine, transitCard, screenDoors, nameBoard, train, carInside, pillar, dirSign, exitSign, exitMain, transferSign, redraw, canvasTex };
})();
