// 프랑스 한글학교 로비 엔진 v0.2 (three.js r147 UMD, 전역 THREE)
// 글·학교·지역 색·교실 내용: lobby.config.js / 지도 좌표: france-map.js(tools/make_map.py가 만듦) / 교실: room.js
// 멀티플레이: 같은 폴더 relay.json의 온라인 중계 서버(relay/server.js)에 붙는다. 로비 방 'fr:lobby', 교실 방 'fr:<학교 id>'.
// 시험 주소: ?bots=50 가짜 참가자 50명(#bots50도 됨), ?fps=1 초당 화면 수, ?mp=0 접속 끔, ?mp=ws://127.0.0.1:8787/ws 시험 서버, ?room=이름 다른 방
(function () {
  'use strict';
  const C = window.LOBBY_CONFIG, M = window.FRANCE_MAP, T = C.text;
  const Q = new URLSearchParams(location.search);
  const HASH = (location.hash || '').slice(1);   // 아티팩트 링크에는 #bots50 같은 짧은 표시만 전달된다
  const BOTS = parseInt(Q.get('bots') || (HASH.match(/bots(\d+)/) || [])[1] || '0', 10) || 0;
  const SHOW_STAT = Q.has('fps') || BOTS > 0 || /fps/.test(HASH);
  const MPQ = Q.get('mp');                        // null: relay.json대로, '0': 끔, 그 밖: 중계 서버 주소
  const ROOM_SUFFIX = String(Q.get('room') || '').replace(/[^\w가-힣-]/g, '').slice(0, 20);
  const IS_TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAND_Y = 0.6;                       // 프랑스 땅 윗면 높이
  const SPEED = 6;                          // 걷는 속도(칸/초). 1칸은 약 9km
  const SCALE = 0.82;                       // 캐릭터 크기(키 약 1.6칸)
  const MAX_CHARS = 64;                     // 한 번에 그릴 수 있는 최대 인원
  const NEAR_TAGS = IS_TOUCH ? 10 : 16;     // 이름표를 보여 줄 가까운 사람 수
  const VFOV = 32;
  const FONT_D = "'Jua', 'Noto Sans KR', sans-serif", FONT_B = "'Noto Sans KR', sans-serif";
  const $ = id => document.getElementById(id);
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : ''));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  if (!window.THREE) { $('loading').textContent = T.loadFail; return; }

  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ── 지도 좌표: 경도·위도 → 칸(x 동쪽 +, z 남쪽 +) ──
  const toXZ = (lon, lat) => [(lon - M.lon0) * M.k * M.s, -(lat - M.lat0) * M.s];
  const ringOf = f => { const a = []; for (let i = 0; i < f.length; i += 2) a.push([f[i], f[i + 1]]); return a; };
  const REG = M.regions.map((g, i) => ({
    idx: i + 1, code: g.c, rings: g.r.map(ringOf), lx: g.l[0], lz: g.l[1],
    info: C.regions[g.c] || { ko: g.n, fr: g.n, color: '#dddddd' }
  }));

  // ── 땅 판정 격자(0.25칸): 칸마다 지역 번호, 0은 바다·이웃 나라 ──
  const CELL = 0.25;
  let gx0 = 1e9, gz0 = 1e9, gx1 = -1e9, gz1 = -1e9;
  for (const g of REG) for (const r of g.rings) for (const [x, z] of r) {
    if (x < gx0) gx0 = x; if (x > gx1) gx1 = x; if (z < gz0) gz0 = z; if (z > gz1) gz1 = z;
  }
  gx0 -= 1; gz0 -= 1; gx1 += 1; gz1 += 1;
  const GW = Math.ceil((gx1 - gx0) / CELL), GH = Math.ceil((gz1 - gz0) / CELL), GRID = new Uint8Array(GW * GH);
  for (const g of REG) for (const r of g.rings) {
    let rz0 = 1e9, rz1 = -1e9;
    for (const p of r) { if (p[1] < rz0) rz0 = p[1]; if (p[1] > rz1) rz1 = p[1]; }
    const j0 = Math.max(0, Math.floor((rz0 - gz0) / CELL)), j1 = Math.min(GH - 1, Math.ceil((rz1 - gz0) / CELL));
    for (let j = j0; j <= j1; j++) {
      const z = gz0 + (j + 0.5) * CELL, xs = [];
      for (let i = 0, k = r.length - 1; i < r.length; k = i++) {
        const za = r[k][1], zb = r[i][1];
        if ((za > z) !== (zb > z)) xs.push(r[k][0] + (z - za) / (zb - za) * (r[i][0] - r[k][0]));
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      for (let n = 0; n + 1 < xs.length; n += 2) {
        const i0 = Math.max(0, Math.ceil((xs[n] - gx0) / CELL - 0.5));
        const i1 = Math.min(GW - 1, Math.floor((xs[n + 1] - gx0) / CELL - 0.5));
        for (let i = i0; i <= i1; i++) GRID[j * GW + i] = g.idx;
      }
    }
  }
  function regionAt(x, z) {
    const i = Math.floor((x - gx0) / CELL), j = Math.floor((z - gz0) / CELL);
    if (i < 0 || j < 0 || i >= GW || j >= GH) return null;
    const v = GRID[j * GW + i];
    return v ? REG[v - 1] : null;
  }

  // ── 부딪힘: 땅 밖·건물·산은 못 지나간다 ──
  const COLL = [];
  function blocked(x, z, rad) {
    if (!WORLD.walk(x, z)) return true;
    const cl = WORLD.coll;
    for (let i = 0; i < cl.length; i++) {
      const c = cl[i], dx = x - c.x, dz = z - c.z, rr = c.r + rad;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }
  function tryMove(ch, dx, dz) {
    const nx = ch.x + dx, nz = ch.z + dz;
    if (!blocked(nx, nz, 0.25)) { ch.x = nx; ch.z = nz; return true; }
    // 막히면 비스듬히 비켜 간다(45°, 90° 양쪽). 둥근 물체·책상 옆을 미끄러지듯 돌아간다
    for (const a of [0.75, -0.75, 1.5, -1.5]) {
      const c = Math.cos(a), s = Math.sin(a), rx = dx * c - dz * s, rz = dx * s + dz * c;
      if (!blocked(ch.x + rx, ch.z + rz, 0.25)) { ch.x += rx; ch.z += rz; return true; }
    }
    return false;
  }

  // ── 장면 ──
  const view = $('view');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.75 : 2));
  view.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const SKY = new THREE.Color(C.look.sky);
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 80, 200);
  const camera = new THREE.PerspectiveCamera(VFOV, 1, 0.5, 3000);
  // 윗면 밝기 합이 1 정도가 되게(넘으면 색이 하얗게 날아간다)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4c3d3, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
  sun.position.set(-30, 80, 55);
  scene.add(sun);
  // 지금 걷고 있는 세계: 로비 지도(LOBBY_WORLD) 또는 학교 교실(room.js가 만든 world).
  // walk: 설 수 있는 곳, coll: 부딪히는 둥근 물체, signs: 화면을 보는 이름판, camD: 카메라 거리, speedK: 걷는 속도 배율
  const LOBBY_WORLD = { id: 'lobby', scene, walk: (x, z) => !!regionAt(x, z), coll: COLL, signs: null, hit: null, pitch: 0.96, speedK: 1,
    camD: () => baseD() * CAM.zoom };
  let WORLD = LOBBY_WORLD;
  const SHARED = [];          // 세계를 바꿀 때 같이 옮기는 것(사람 부위 메시, 걷기 표시)
  let PAUSED = false;         // 팝업·대화가 열려 있으면 걷지 않는다

  // ── 도형 도구 ──
  function colored(geo, hex) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    const n = geo.attributes.position.count, c = new THREE.Color(hex), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  }
  function merge(list) {
    list = list.map(g => (g.index ? g.toNonIndexed() : g));
    let n = 0;
    list.forEach(g => { n += g.attributes.position.count; });
    const hasCol = !!list[0].attributes.color;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = hasCol ? new Float32Array(n * 3) : null;
    let o = 0;
    list.forEach(g => {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (col) col.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  function shapeOf(r) {
    const s = new THREE.Shape();
    r.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    return s;
  }
  function slab(rings, depth, top, side) {
    const geo = new THREE.ExtrudeGeometry(rings.map(shapeOf), { depth, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, [
      new THREE.MeshLambertMaterial({ color: top }),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(side || top).multiplyScalar(side ? 1 : 0.8) })
    ]);
    scene.add(mesh);
    return mesh;
  }
  function ribbons(rings, w, color, opacity, y) {
    const pos = [];
    for (const r of rings) for (let i = 0; i < r.length; i++) {
      const [ax, az] = r[i], [bx, bz] = r[(i + 1) % r.length];
      const L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * w / 2, nz = (bx - ax) / L * w / 2;
      pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz,
        ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 1;
    scene.add(m);
    return m;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function pill(g, x, y, w, h) {
    const r = h / 2;
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y);
    g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(x + r, y + h);
    g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
    g.closePath();
  }
  function fitFont(g, text, weight, size, family, maxW) {
    g.font = `${weight} ${size}px ${family}`;
    const w = g.measureText(text).width;
    if (w > maxW) { size = Math.floor(size * maxW / w); g.font = `${weight} ${size}px ${family}`; }
    return size;
  }
  function inst(geo, mat, n) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    return m;
  }
  const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _base = new THREE.Matrix4(), _bob = new THREE.Matrix4();
  const _t = new THREE.Matrix4(), _r = new THREE.Matrix4(), _r2 = new THREE.Matrix4();
  const _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  // ── 바다·이웃 나라·프랑스 땅 ──
  let seaTex;
  function buildMap() {
    seaTex = canvasTex(256, 256, (g) => {
      g.fillStyle = C.look.sea; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 3; g.lineCap = 'round';
      const R = rng(7);
      for (let i = 0; i < 16; i++) {
        const x = 20 + R() * 200, y = 10 + R() * 236, w = 14 + R() * 22;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke();
      }
    });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping;
    seaTex.repeat.set(70, 70);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: seaTex }));
    sea.position.y = 0.05;
    scene.add(sea);
    const nbRings = M.nb.map(o => ringOf(o.r));
    nbRings.forEach(r => slab([r], 0.3, C.look.neighbor));
    ribbons(nbRings, 0.12, C.look.neighborLine, 0.9, 0.31);
    slab(M.base.map(ringOf), LAND_Y - 0.1, C.look.base);
    for (const g of REG) slab(g.rings, LAND_Y, g.info.color);
    ribbons(REG.flatMap(g => g.rings), 0.16, '#FFFFFF', 0.92, LAND_Y + 0.012);
  }

  // ── 땅에 쓴 지역 이름 ──
  function groundLabel(ko, fr, x, z, size) {
    const W = 1024, H = 300;
    const tex = canvasTex(W, H, (g) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      fitFont(g, ko, 'normal', 132, FONT_D, W - 70);
      g.lineWidth = 20; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.strokeText(ko, W / 2, 118);
      g.fillStyle = '#22304F'; g.fillText(ko, W / 2, 118);
      fitFont(g, fr, '700', 52, FONT_B, W - 70);
      g.lineWidth = 12; g.strokeText(fr, W / 2, 240);
      g.fillStyle = 'rgba(34,48,79,0.72)'; g.fillText(fr, W / 2, 240);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * H / W),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, LAND_Y + 0.04, z);
    m.renderOrder = 2;
    scene.add(m);
    return m;
  }
  const LABELS = [];
  function buildLabels() {
    for (const g of REG) {
      const L = g.info.label || {}, size = L.size || 11;
      const x = g.lx + (L.dx || 0), z = g.lz + (L.dz || 0);
        const mesh = groundLabel(g.info.ko, g.info.fr, x, z, size);
      LABELS.push({ x, z, hw: size / 2, hd: size * 0.16, mesh });
    }
  }
  const nearLabel = (x, z, pad) => LABELS.some(l => Math.abs(x - l.x) < l.hw + pad && Math.abs(z - l.z) < l.hd + pad);

  // ── 위에 뜨는 이름판(항상 화면을 본다) ──
  function signSprite(title, sub, opt) {
    opt = opt || {};
    const W = 512, H = sub ? 176 : 124;
    const tex = canvasTex(W, H, (g) => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, title, '900', 54, FONT_B, W - 96);
      const tw = Math.min(W - 16, g.measureText(title).width + 72);
      g.fillStyle = 'rgba(30,43,74,0.2)'; pill(g, (W - tw) / 2, 18, tw, 90); g.fill();
      g.fillStyle = opt.bg || '#FFFFFF'; pill(g, (W - tw) / 2, 12, tw, 90); g.fill();
      g.fillStyle = opt.fg || '#1E2B4A'; g.fillText(title, W / 2, 59);
      if (sub) {
        fitFont(g, sub, '700', 32, FONT_B, W - 40);
        g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.strokeText(sub, W / 2, 142);
        g.fillStyle = '#41506D'; g.fillText(sub, W / 2, 142);
      }
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const w = opt.w || 4.6;
    sp.userData.base = [w, w * H / W];
    sp.scale.set(w, w * H / W, 1);
    sp.renderOrder = 4;
    (opt.scene || scene).add(sp);
    return sp;
  }

  // ── 만남의 광장 ──
  const PLAZA = {};
  function buildPlaza() {
    const [px, pz] = toXZ(C.plaza.lon, C.plaza.lat);
    PLAZA.x = px; PLAZA.z = pz; PLAZA.r = 5;
    const tex = canvasTex(512, 512, (g, w) => {
      const c = w / 2;
      g.fillStyle = '#F6F1E7'; g.beginPath(); g.arc(c, c, c - 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(30,43,74,0.16)'; g.lineWidth = 6;
      g.beginPath(); g.arc(c, c, c - 34, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, long = k % 2 === 0, R = long ? 186 : 112, wd = long ? 34 : 22;
        g.fillStyle = k === 0 ? '#E0483E' : (long ? '#2A4D9B' : '#9FB3D9');
        g.beginPath();
        g.moveTo(c + Math.sin(a) * R, c - Math.cos(a) * R);
        g.lineTo(c + Math.sin(a + Math.PI / 2) * wd, c - Math.cos(a + Math.PI / 2) * wd);
        g.lineTo(c, c);
        g.lineTo(c + Math.sin(a - Math.PI / 2) * wd, c - Math.cos(a - Math.PI / 2) * wd);
        g.closePath(); g.fill();
      }
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(c, c, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1E2B4A'; g.font = `60px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(T.north, c, 50);
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r, 48), new THREE.MeshLambertMaterial({ map: tex }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(px, LAND_Y + 0.03, pz);
    disc.renderOrder = 2;
    scene.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(PLAZA.r, 0.13, 6, 56), new THREE.MeshLambertMaterial({ color: '#E3D7C3' }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(px, LAND_Y + 0.06, pz);
    scene.add(rim);
    const sign = signSprite(T.plaza, T.plazaSub, { bg: '#1E2B4A', fg: '#FFFFFF' });
    sign.userData.anchor = [px, LAND_Y + 1.6, pz - PLAZA.r - 0.4];
    SIGNS.push(sign);
  }

  // ── 에펠탑(파리 표시) ──
  function beam(a, b, r) {
    const va = new THREE.Vector3(a[0], a[1], a[2]), vb = new THREE.Vector3(b[0], b[1], b[2]);
    const g = new THREE.CylinderGeometry(r * 0.75, r, va.distanceTo(vb), 4);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y_AXIS, vb.clone().sub(va).normalize()));
    const mid = va.add(vb).multiplyScalar(0.5);
    return g.translate(mid.x, mid.y, mid.z);
  }
  const LANDMARKS = [];
  function buildLandmarks() {
    for (const L of C.landmarks || []) {
      if (L.id !== 'eiffel') continue;
      const [x, z] = toXZ(L.lon, L.lat);
      const parts = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        parts.push(beam([sx * 1.05, 0, sz * 1.05], [sx * 0.42, 1.72, sz * 0.42], 0.17));
        parts.push(beam([sx * 0.42, 1.72, sz * 0.42], [sx * 0.19, 3.32, sz * 0.19], 0.1));
      }
      parts.push(new THREE.BoxGeometry(1.3, 0.14, 1.3).translate(0, 1.74, 0));
      parts.push(new THREE.BoxGeometry(0.64, 0.12, 0.64).translate(0, 3.34, 0));
      parts.push(new THREE.CylinderGeometry(0.05, 0.25, 2.4, 4).rotateY(Math.PI / 4).translate(0, 4.6, 0));
      parts.push(new THREE.CylinderGeometry(0.015, 0.05, 0.7, 4).translate(0, 6.15, 0));
      const arch = () => new THREE.TorusGeometry(0.6, 0.07, 4, 12, Math.PI);
      parts.push(arch().translate(0, 0.82, 0.74), arch().translate(0, 0.82, -0.74),
        arch().rotateY(Math.PI / 2).translate(0.74, 0.82, 0), arch().rotateY(Math.PI / 2).translate(-0.74, 0.82, 0));
      const geo = merge(parts.map(p => colored(p, '#8C6A4F')));
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      mesh.position.set(x, LAND_Y, z);
      scene.add(mesh);
      COLL.push({ x, z, r: 1.25 });
      LANDMARKS.push({ x, z, r: 3.4 });
    }
  }

  // ── 한글학교 ──
  const SCHOOLS = [], HIT = [], SIGNS = [];
  let schoolBody, schoolFlag, schoolPad;
  function placeSchools() {
    const list = (C.schools || []).map((s, i) => {
      const [x, z] = toXZ(s.lon, s.lat);
      const g = regionAt(x, z);
      return Object.assign({}, s, { i, x, z, regionCode: s.region || (g && g.code) });
    });
    // 가까이 붙은 학교(3.6칸 안)는 동서로 한 줄로 벌려 세우고, 이름판은 계단처럼 쌓는다
    const used = new Set(), groups = [];
    for (const a of list) {
      if (used.has(a)) continue;
      const grp = list.filter(b => !used.has(b) && Math.hypot(a.x - b.x, a.z - b.z) < 3.6);
      grp.forEach(b => used.add(b));
      groups.push(grp);
      if (grp.length < 2) { a.stack = 0; continue; }
      const cx = grp.reduce((v, b) => v + b.x, 0) / grp.length, cz = grp.reduce((v, b) => v + b.z, 0) / grp.length;
      grp.sort((p, q) => p.x - q.x);
      grp.forEach((b, k) => { b.x = cx + (k - (grp.length - 1) / 2) * 3.6; b.z = cz; b.stack = k; });
    }
    // 큰 표지물(에펠탑)과 겹치는 무리는 통째로 그 앞(남쪽)으로 비켜 선다
    for (const grp of groups) for (const L of LANDMARKS) {
      if (grp.some(s => Math.hypot(s.x - L.x, s.z - L.z) < L.r)) grp.forEach(s => { s.z = L.z + L.r; });
    }
    for (const s of list) {
      // 바닷가 학교는 땅 안쪽으로 조금씩 옮긴다(건물과 발판이 모두 땅 위에 오도록)
      const okAt = (x, z) => regionAt(x, z) && regionAt(x - 1.2, z) && regionAt(x + 1.2, z) && regionAt(x, z - 1) && regionAt(x, z + 2.5);
      for (let k = 0; k < 80 && !okAt(s.x, s.z); k++) {
        const L = Math.hypot(s.x, s.z) || 1;
        s.x -= s.x / L * 0.3; s.z -= s.z / L * 0.3;
      }
      s.px = s.x; s.pz = s.z + 1.75;   // 입장 발판(건물 남쪽 문 앞)
      if (!s.regionCode) { const g = regionAt(s.x, s.z); s.regionCode = g && g.code; }
      SCHOOLS.push(s);
    }
  }
  function buildSchools() {
    const n = Math.max(1, SCHOOLS.length);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.35, 0); roofShape.lineTo(1.35, 0); roofShape.lineTo(0, 0.8); roofShape.closePath();
    const body = merge([
      colored(new THREE.BoxGeometry(2.2, 1.25, 1.6).translate(0, 0.625, 0), '#FFF7EA'),
      colored(new THREE.ExtrudeGeometry(roofShape, { depth: 1.84, bevelEnabled: false }).translate(0, 1.25, -0.92), '#2A4D9B'),
      colored(new THREE.BoxGeometry(0.5, 0.78, 0.06).translate(0, 0.39, 0.8), '#E0483E'),
      colored(new THREE.BoxGeometry(0.42, 0.36, 0.05).translate(-0.66, 0.8, 0.8), '#BFE3F5'),
      colored(new THREE.BoxGeometry(0.42, 0.36, 0.05).translate(0.66, 0.8, 0.8), '#BFE3F5'),
      colored(new THREE.BoxGeometry(0.9, 0.08, 0.32).translate(0, 0.04, 0.94), '#E8DCC8'),
      colored(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 6).translate(0.75, 2.07, -0.2), '#9AA3B2')
    ]);
    schoolBody = inst(body, new THREE.MeshLambertMaterial({ vertexColors: true }), n);
    const flagTex = canvasTex(128, 84, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#E0483E'; g.fillRect(0, 0, w, 7);
      g.fillStyle = '#2A4D9B'; g.fillRect(0, h - 7, w, 7);
      g.fillStyle = '#1E2B4A'; g.font = `56px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(T.flag, w / 2, h / 2 + 3);
    });
    schoolFlag = inst(new THREE.PlaneGeometry(0.56, 0.37).translate(0.28, 0, 0),
      new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }), n);
    const padTex = canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill();
      g.lineWidth = 16; g.strokeStyle = '#2A4D9B'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 8; g.strokeStyle = '#E0483E'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke();
    });
    schoolPad = inst(new THREE.CircleGeometry(0.95, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false }), n);
    schoolPad.renderOrder = 3;
    SCHOOLS.forEach((s, k) => {
      _m.makeTranslation(s.x, LAND_Y, s.z);
      schoolBody.setMatrixAt(k, _m);
      COLL.push({ x: s.x, z: s.z, r: 1.25 });
      const reg = REG.find(g => g.code === s.regionCode);
      s.regionName = reg ? reg.info.ko : '';
      s.sign = signSprite(s.name);
      s.sign.userData.anchor = [s.x, LAND_Y + 2.7, s.z];
      s.sign.userData.stack = s.stack || 0;
      s.sign.userData.school = s;
      SIGNS.push(s.sign);
      HIT.push(s.sign);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.6, 4.2), new THREE.MeshBasicMaterial());
      hb.visible = false;
      hb.position.set(s.x, LAND_Y + 1.2, s.z + 0.7);
      hb.userData.school = s;
      scene.add(hb);
      HIT.push(hb);
    });
    schoolBody.count = schoolFlag.count = schoolPad.count = SCHOOLS.length;
    schoolBody.instanceMatrix.needsUpdate = true;
  }
  function animateSchools(t) {
    SCHOOLS.forEach((s, k) => {
      _q.setFromAxisAngle(Y_AXIS, REDUCED ? 0.2 : 0.25 + Math.sin(t * 2.2 + k) * 0.22);
      _p.set(s.x + 0.75, LAND_Y + 2.36, s.z - 0.2); _s.set(1, 1, 1);
      schoolFlag.setMatrixAt(k, _m.compose(_p, _q, _s));
      const near = s === CUR_SCHOOL;
      const sc = (near ? 1.15 : 1) * (REDUCED ? 1 : 1 + Math.sin(t * 3 + k) * 0.06);
      _q.identity(); _p.set(s.px, LAND_Y + 0.035, s.pz); _s.set(sc, 1, sc);
      schoolPad.setMatrixAt(k, _m.compose(_p, _q, _s));
    });
    schoolFlag.instanceMatrix.needsUpdate = true;
    schoolPad.instanceMatrix.needsUpdate = true;
  }

  // ── 산과 나무 ──
  const MOUNT = [];
  function buildNature() {
    const R = rng(2026);
    const far = (x, z, d) => Math.hypot(x - PLAZA.x, z - PLAZA.z) > PLAZA.r + d &&
      SCHOOLS.every(s => Math.hypot(x - s.x, z - (s.z + 0.8)) > 4.2 + d) &&
      LANDMARKS.every(L => Math.hypot(x - L.x, z - L.z) > 2.6 + d);
    for (const rg of C.mountains || []) {
      let made = 0;
      for (let k = 0; k < rg.count * 8 && made < rg.count; k++) {
        const [x, z] = toXZ(rg.lon[0] + R() * (rg.lon[1] - rg.lon[0]), rg.lat[0] + R() * (rg.lat[1] - rg.lat[0]));
        const g = regionAt(x, z);
        if (!g || (rg.regions && !rg.regions.includes(g.code))) continue;
        const r = rg.r[0] + R() * (rg.r[1] - rg.r[0]), h = rg.h[0] + R() * (rg.h[1] - rg.h[0]);
        if (!far(x, z, r) || nearLabel(x, z, r * 0.6)) continue;
        if (!regionAt(x + r * 0.7, z) || !regionAt(x - r * 0.7, z) || !regionAt(x, z + r * 0.7) || !regionAt(x, z - r * 0.7)) continue;
        if (MOUNT.some(m => Math.hypot(m.x - x, m.z - z) < (m.r + r) * 0.62)) continue;
        MOUNT.push({ x, z, r, h, rot: R() * 6.283, snow: rg.snow && h > rg.snow, color: rg.colors[Math.floor(R() * rg.colors.length)] });
        made++;
      }
    }
    const cone = new THREE.ConeGeometry(1, 1, 7, 1).translate(0, 0.5, 0);
    const rock = inst(cone, new THREE.MeshLambertMaterial({ flatShading: true }), Math.max(1, MOUNT.length));
    const snows = MOUNT.filter(m => m.snow);
    const snow = inst(cone, new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true }), Math.max(1, snows.length));
    MOUNT.forEach((m, k) => {
      _q.setFromAxisAngle(Y_AXIS, m.rot); _p.set(m.x, LAND_Y - 0.02, m.z); _s.set(m.r, m.h, m.r);
      rock.setMatrixAt(k, _m.compose(_p, _q, _s));
      rock.setColorAt(k, _c.set(m.color));
      COLL.push({ x: m.x, z: m.z, r: m.r * 0.62 });
    });
    snows.forEach((m, k) => {
      _q.setFromAxisAngle(Y_AXIS, m.rot); _p.set(m.x, LAND_Y - 0.02 + m.h * 0.58, m.z); _s.set(m.r * 0.44, m.h * 0.43, m.r * 0.44);
      snow.setMatrixAt(k, _m.compose(_p, _q, _s));
    });
    rock.count = MOUNT.length; snow.count = snows.length;
    // 나무: 동글동글한 나무를 땅 곳곳에
    const trees = [];
    const TC = C.trees || { count: 0 };
    for (let k = 0; k < TC.count * 6 && trees.length < TC.count; k++) {
      const x = gx0 + R() * (gx1 - gx0), z = gz0 + R() * (gz1 - gz0);
      const g = regionAt(x, z);
      if (!g || g.code === '94' && R() < 0.5) continue;
      if (!regionAt(x + 0.8, z) || !regionAt(x - 0.8, z) || !regionAt(x, z + 0.8) || !regionAt(x, z - 0.8)) continue;
      if (!far(x, z, 0.8) || nearLabel(x, z, 0.6)) continue;
      if (MOUNT.some(m => Math.hypot(m.x - x, m.z - z) < m.r + 0.6)) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 1.1)) continue;
      trees.push({ x, z, s: 0.8 + R() * 0.55, rot: R() * 6.283, color: TC.colors[Math.floor(R() * TC.colors.length)] });
    }
    const trunk = inst(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 5).translate(0, 0.25, 0), new THREE.MeshLambertMaterial({ color: '#9A7356' }), Math.max(1, trees.length));
    const crown = inst(new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.85, 0), new THREE.MeshLambertMaterial({ flatShading: true }), Math.max(1, trees.length));
    trees.forEach((t, k) => {
      _q.setFromAxisAngle(Y_AXIS, t.rot); _p.set(t.x, LAND_Y, t.z); _s.set(t.s, t.s, t.s);
      _m.compose(_p, _q, _s);
      trunk.setMatrixAt(k, _m); crown.setMatrixAt(k, _m); crown.setColorAt(k, _c.set(t.color));
      COLL.push({ x: t.x, z: t.z, r: 0.3 * t.s });
    });
    trunk.count = crown.count = trees.length;
  }

  // ── 사람(부위마다 한 번에 그린다: 50명이 모여도 그리는 횟수는 9번) ──
  const PART = {};
  const LOOK = C.charLook;
  function buildCrowd() {
    const lam = () => new THREE.MeshLambertMaterial({ color: 0xffffff });
    const cap = () => new THREE.SphereGeometry(0.465, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.43).rotateX(-0.32).translate(0, 1.6, -0.01);
    const eye = s => colored(new THREE.SphereGeometry(0.055, 8, 6).scale(1, 1.35, 0.55).translate(0.15 * s, 1.6, 0.405), '#2B2B35');
    const cheek = s => colored(new THREE.CircleGeometry(0.075, 12).rotateY(0.55 * s).translate(0.27 * s, 1.47, 0.33), '#F7A1B0');
    PART.shadow = inst(new THREE.CircleGeometry(0.55, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x1E2B4A, transparent: true, opacity: 0.2, depthWrite: false }), MAX_CHARS);
    PART.legs = inst(new THREE.CapsuleGeometry(0.12, 0.2, 3, 8).translate(0, -0.22, 0), lam(), MAX_CHARS * 2);
    PART.arms = inst(new THREE.CapsuleGeometry(0.09, 0.24, 3, 6).translate(0, -0.2, 0), lam(), MAX_CHARS * 2);
    PART.body = inst(new THREE.CapsuleGeometry(0.3, 0.3, 4, 12).scale(1, 0.9, 0.85).translate(0, 0.8, 0), lam(), MAX_CHARS);
    PART.head = inst(new THREE.SphereGeometry(0.43, 18, 14).translate(0, 1.58, 0), lam(), MAX_CHARS);
    PART.face = inst(merge([eye(-1), eye(1), cheek(-1), cheek(1)]), new THREE.MeshBasicMaterial({ vertexColors: true }), MAX_CHARS);
    PART.hair = [
      cap(),
      merge([cap(), new THREE.SphereGeometry(0.44, 14, 10).scale(1, 1.05, 0.5).translate(0, 1.4, -0.24)]),
      merge([cap(), new THREE.SphereGeometry(0.17, 12, 8).translate(0, 2.03, -0.2)])
    ].map(g => inst(g, lam(), MAX_CHARS));
    PART.shadow.renderOrder = 3;
    [PART.legs, PART.arms, PART.body, PART.head].concat(PART.hair).forEach(m => m.setColorAt(0, _c.set(0xffffff)));
    SHARED.push(PART.shadow, PART.legs, PART.arms, PART.body, PART.head, PART.face, ...PART.hair);
  }
  const CHARS = [];
  function addChar(o) {
    if (CHARS.length >= MAX_CHARS) return null;
    const ch = Object.assign({ x: 0, z: 0, yaw: 0, tyaw: 0, phase: 0, amp: 0, moving: false, seed: Math.random() * 10, tag: null, world: WORLD.id }, o);
    CHARS.push(ch);
    return ch;
  }
  function removeChar(ch) {
    const i = CHARS.indexOf(ch);
    if (i >= 0) CHARS.splice(i, 1);
    if (ch.tag) { ch.tag.removeFromParent(); ch.tag.material.map.dispose(); ch.tag.material.dispose(); ch.tag = null; }
  }
  // 생김새는 번호 5개(피부·머리색·옷·바지·머리 모양)로 저장하고 주고받는다. 그릴 때 색으로 바꾼다
  function randomIdx(R) {
    const n = a => Math.floor(R() * a.length);
    return [n(LOOK.skin), n(LOOK.hair), n(LOOK.shirt), n(LOOK.pants), Math.floor(R() * 3)];
  }
  function lookOf(idx) {
    const at = (a, i) => a[Math.max(0, Math.floor(Number(i) || 0)) % a.length];
    idx = Array.isArray(idx) && idx.length >= 5 ? idx : [0, 0, 0, 0, 0];
    return { skin: at(LOOK.skin, idx[0]), hair: at(LOOK.hair, idx[1]), hairStyle: Math.abs(Math.floor(Number(idx[4]) || 0)) % 3, shirt: at(LOOK.shirt, idx[2]), pants: at(LOOK.pants, idx[3]) };
  }
  function randomLook(R) { return lookOf(randomIdx(R)); }
  function stepChar(ch, vx, vz, dt) {
    const len = Math.hypot(vx, vz);
    if (len < 0.01) { ch.moving = false; return false; }
    const d = SPEED * dt * Math.min(1, len) * (ch.speedK || 1) * (WORLD.speedK || 1);
    const moved = tryMove(ch, vx / len * d, vz / len * d);
    ch.tyaw = Math.atan2(vx, vz);
    ch.moving = moved;
    if (moved) ch.phase += d * 2.3 / (ch.speedK || 1);
    return moved;
  }
  function drawCrowd(t, dt) {
    let n = 0;
    const hc = [0, 0, 0];
    for (const ch of CHARS) {
      if (ch.world !== WORLD.id) continue;
      let dy = ch.tyaw - ch.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      ch.yaw += dy * (1 - Math.exp(-dt * 14));
      ch.amp += ((ch.moving ? 1 : 0) - ch.amp) * (1 - Math.exp(-dt * 10));
      const sw = Math.sin(ch.phase) * ch.amp;
      const bob = Math.abs(Math.sin(ch.phase)) * 0.08 * ch.amp + (REDUCED ? 0 : Math.sin(t * 2 + ch.seed) * 0.012 * (1 - ch.amp));
      _q.setFromAxisAngle(Y_AXIS, ch.yaw); _s.set(SCALE, SCALE, SCALE); _p.set(ch.x, LAND_Y, ch.z);
      _base.compose(_p, _q, _s);
      _bob.copy(_base).multiply(_t.makeTranslation(0, bob, 0));
      PART.body.setMatrixAt(n, _bob); PART.body.setColorAt(n, _c.set(ch.look.shirt));
      PART.head.setMatrixAt(n, _bob); PART.head.setColorAt(n, _c.set(ch.look.skin));
      PART.face.setMatrixAt(n, _bob);
      const hs = ch.look.hairStyle % 3, hm = PART.hair[hs];
      hm.setMatrixAt(hc[hs], _bob); hm.setColorAt(hc[hs], _c.set(ch.look.hair)); hc[hs]++;
      for (let k = 0; k < 2; k++) {
        const sg = k ? 1 : -1;
        _m.copy(_bob).multiply(_t.makeTranslation(0.13 * sg, 0.44, 0)).multiply(_r.makeRotationX(sg * sw * 0.65));
        PART.legs.setMatrixAt(n * 2 + k, _m); PART.legs.setColorAt(n * 2 + k, _c.set(ch.look.pants));
        _m.copy(_bob).multiply(_t.makeTranslation(0.37 * sg, 1.08, 0)).multiply(_r.makeRotationZ(sg * 0.12)).multiply(_r2.makeRotationX(-sg * sw * 0.6));
        PART.arms.setMatrixAt(n * 2 + k, _m); PART.arms.setColorAt(n * 2 + k, _c.set(ch.look.shirt));
      }
      _q.identity(); _p.set(ch.x, LAND_Y + 0.02, ch.z);
      const ss = SCALE * (1 - bob * 1.5); _s.set(ss, 1, ss);
      PART.shadow.setMatrixAt(n, _m2.compose(_p, _q, _s));
      n++;
    }
    PART.body.count = PART.head.count = PART.face.count = PART.shadow.count = n;
    PART.legs.count = PART.arms.count = n * 2;
    PART.hair.forEach((m, k) => { m.count = hc[k]; });
    [PART.body, PART.head, PART.face, PART.shadow, PART.legs, PART.arms].concat(PART.hair).forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }
  // 이름표: 카메라에 가까운 몇 명만
  function nameSprite(text, me) {
    const tex = canvasTex(256, 72, (g, w) => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, text, '700', 34, FONT_B, w - 40);
      const tw = Math.min(w - 6, g.measureText(text).width + 32);
      g.fillStyle = me ? '#2A4D9B' : 'rgba(255,255,255,0.94)';
      pill(g, (w - tw) / 2, 10, tw, 52); g.fill();
      g.fillStyle = me ? '#FFFFFF' : '#1E2B4A';
      g.fillText(text, w / 2, 37);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(2.1, 0.59, 1);
    sp.renderOrder = 5;
    WORLD.scene.add(sp);
    return sp;
  }
  let tagTimer = 0;
  function updateTags(dt) {
    tagTimer -= dt;
    if (tagTimer <= 0) {
      tagTimer = 0.25;
      const order = CHARS.filter(ch => ch.world === WORLD.id && !ch.npc).map(ch => ({ ch, d: Math.hypot(ch.x - CAM.tx, ch.z - CAM.tz) })).sort((a, b) => a.d - b.d);
      order.forEach((o, i) => { o.ch.showTag = (o.ch === ME || i < NEAR_TAGS) && CAM.mode !== 'over'; });
    }
    for (const ch of CHARS) {
      if (ch.world !== WORLD.id || ch.npc) { if (ch.tag) ch.tag.visible = false; continue; }
      if (ch.showTag && !ch.tag) ch.tag = nameSprite(ch.name, ch === ME);
      if (ch.tag) {
        ch.tag.visible = !!ch.showTag;
        ch.tag.scale.set(TAG_W, TAG_W * 72 / 256, 1);
        ch.tag.position.set(ch.x, LAND_Y + 1.8 + TAG_W * 0.16, ch.z);
      }
    }
  }

  // ── 시험용 가짜 참가자 ──
  function spawnBots(n) {
    const R = rng(1234 + CHARS.length);
    n = Math.min(n, MAX_CHARS - CHARS.length);
    const first = CHARS.filter(c => c.bot).length;
    for (let i = first; i < first + n; i++) {
      let x = PLAZA.x, z = PLAZA.z, tries = 0;
      do {
        const a = R() * Math.PI * 2, r = 1.5 + R() * 11;
        x = PLAZA.x + Math.cos(a) * r; z = PLAZA.z + Math.sin(a) * r;
      } while (blocked(x, z, 0.3) && ++tries < 50);
      addChar({ x, z, yaw: R() * 6.283, look: randomLook(R), name: fill(T.bot, { n: i + 1 }), world: 'lobby',
        bot: { wait: R() * 3, tx: x, tz: z, stuck: 0 }, speedK: 0.7 + R() * 0.35 });
    }
  }
  const BR = rng(99);
  function pickBotTarget(ch) {
    if (SCHOOLS.length && BR() < 0.25) {
      const s = SCHOOLS[Math.floor(BR() * SCHOOLS.length)];
      ch.bot.tx = s.px + (BR() - 0.5) * 1.4; ch.bot.tz = s.pz + 0.4 + BR() * 0.8;
      return;
    }
    for (let k = 0; k < 20; k++) {
      const a = BR() * 6.283, r = 2 + BR() * 13;
      const x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
      if (!blocked(x, z, 0.3)) { ch.bot.tx = x; ch.bot.tz = z; return; }
    }
  }
  function updateBot(ch, dt) {
    const b = ch.bot;
    if (b.wait > 0) { b.wait -= dt; ch.moving = false; return; }
    const dx = b.tx - ch.x, dz = b.tz - ch.z;
    if (Math.hypot(dx, dz) < 0.3) { ch.moving = false; b.wait = 1 + BR() * 4; pickBotTarget(ch); return; }
    if (stepChar(ch, dx, dz, dt)) b.stuck = 0;
    else if ((b.stuck += dt) > 0.6) { b.stuck = 0; pickBotTarget(ch); }
  }

  // ── 카메라: 위에서 비스듬히 내려다보는 고정 시점(북쪽이 위) ──
  const CAM = { mode: 'follow', zoom: 1, tx: 0, tz: 0, d: 40, pitch: 0.96 };
  const OV = {};
  const tanV = () => Math.tan(THREE.MathUtils.degToRad(VFOV / 2));
  function baseD() { return clamp(17 / (2 * tanV() * camera.aspect), 26, 72); }
  // 전체 지도: 기울어진 카메라로 보이는 땅의 앞뒤 길이를 계산해 프랑스가 꼭 들어오게 한다
  const OVP = 1.2;
  function overBand() {
    const a = THREE.MathUtils.degToRad(VFOV / 2), s = Math.sin(OVP), c = Math.cos(OVP);
    const near = c - s / Math.tan(OVP + a), far = s / Math.tan(OVP - a) - c;   // 겨눈 점에서 화면 아래·위 끝까지(D 배)
    return { depth: near + far, shift: (far - near) / 2 };
  }
  function overD() {
    const b = overBand();
    return Math.max(OV.h / b.depth, OV.w / (2 * tanV() * camera.aspect)) * 1.04;
  }
  function updateCam(dt, snap) {
    const over = CAM.mode === 'over';
    let g;
    if (over) {
      const d = overD() * OV.zoom;
      g = { tx: OV.x + OV.px, tz: OV.cz + OV.pz + overBand().shift * d, d, p: OVP };
    } else {
      const d = WORLD.camD();
      g = { tx: ME.x, tz: ME.z, d, p: WORLD.pitch };
      // 교실처럼 작은 세계는 카메라가 벽 밖을 보지 않게 겨누는 점을 안쪽으로 당긴다
      if (WORLD.camClamp) { const c = WORLD.camClamp(ME, d * tanV() * camera.aspect, d * tanV() / Math.sin(WORLD.pitch)); g.tx = c[0]; g.tz = c[1]; }
    }
    const k = snap ? 1 : 1 - Math.exp(-dt * (over ? 3.2 : 6)), k2 = snap ? 1 : 1 - Math.exp(-dt * 3.2);
    // 창 크기가 0인 순간(숨은 창)에 계산이 깨지면 그 값이 계속 남지 않게 막는다
    if (!isFinite(g.d)) g.d = isFinite(CAM.d) ? CAM.d : 40;
    if (!isFinite(CAM.d)) CAM.d = g.d;
    CAM.tx += (g.tx - CAM.tx) * k; CAM.tz += (g.tz - CAM.tz) * k;
    CAM.d += (g.d - CAM.d) * k2; CAM.pitch += (g.p - CAM.pitch) * k2;
    camera.position.set(CAM.tx, LAND_Y + CAM.d * Math.sin(CAM.pitch), CAM.tz + CAM.d * Math.cos(CAM.pitch));
    camera.lookAt(CAM.tx, LAND_Y, CAM.tz);
    if (WORLD.scene.fog) { WORLD.scene.fog.near = CAM.d * 1.35; WORLD.scene.fog.far = CAM.d * 3.4; }
    // 이름판·이름표는 화면에서 늘 비슷한 크기로 보이게(땅에서 1픽셀이 몇 칸인지로 계산)
    const wpp = 2 * CAM.d * tanV() * camera.aspect / Math.max(1, view.clientWidth || innerWidth);
    const goalPx = over ? (IS_TOUCH ? 78 : 112) : (IS_TOUCH ? 112 : 150);
    signPx += (goalPx - signPx) * (snap ? 1 : k2);
    camUp.set(0, Math.cos(CAM.pitch), -Math.sin(CAM.pitch));
    for (const sp of (WORLD.signs || SIGNS)) {
      const b = sp.userData.base, w = clamp(signPx * wpp, 2.2, 90), h = w * b[1] / b[0], a = sp.userData.anchor;
      sp.scale.set(w, h, 1);
      // 붙어 선 학교의 이름판: 전체 지도에서는 계단처럼 다 쌓고, 가까이서는 하나 걸러 한 칸만 올린다
      const st = sp.userData.stack || 0, lvl = over ? st : st % 2;
      sp.position.set(a[0], a[1] + h * 0.5, a[2]).addScaledVector(camUp, lvl * h * 1.06);
    }
    TAG_W = clamp((IS_TOUCH ? 74 : 88) * wpp, 1.3, 5);
    if (WORLD === LOBBY_WORLD) {
      const ls = clamp(CAM.d / 80, 1, 1.6);   // 전체 지도에서는 땅에 쓴 지역 이름을 조금 키운다
      for (const l of LABELS) l.mesh.scale.set(ls, ls, ls);
    }
  }
  let signPx = IS_TOUCH ? 112 : 150, TAG_W = 2;
  const camUp = new THREE.Vector3();
  function setZoom(z) { CAM.zoom = clamp(z, 0.55, 2.2); }
  function setMode(m) {
    // 전체 지도를 열 때는 학교들이 모인 가운데를 겨누고, 세로 화면에서는 조금 당겨 본다(끌어서 옮길 수 있음)
    if (m === 'over' && CAM.mode !== 'over') { OV.px = OV.sx - OV.x; OV.pz = 0; OV.zoom = camera.aspect < 0.8 ? 0.8 : 1; }
    CAM.mode = m;
    $('btnMap').textContent = m === 'over' ? T.mapClose : T.map;
    if (m === 'over') { hideCard(); showToast(T.overHint); }
  }

  // ── 조작: 키보드, 조이스틱, 누른 곳으로 걷기, 확대·축소 ──
  const KEYS = {};
  addEventListener('keydown', e => {
    KEYS[e.code] = true;
    if (/^Arrow/.test(e.code)) e.preventDefault();
    if (e.code === 'KeyM' && !e.repeat && WORLD === LOBBY_WORLD && !PAUSED) setMode(CAM.mode === 'over' ? 'follow' : 'over');
    if ((e.code === 'Enter' || e.code === 'Space') && CUR_TARGET && !PAUSED && document.activeElement === document.body) { e.preventDefault(); CUR_TARGET.go(); }
  });
  addEventListener('keyup', e => { KEYS[e.code] = false; });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });
  const JOY = { active: false, x: 0, y: 0, id: null };
  function setupJoy() {
    if (!IS_TOUCH) return;
    const el = $('joy'), knob = $('knob'), R = 46;
    el.hidden = false;
    const upd = e => {
      const b = el.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2), l = Math.hypot(dx, dy) || 1;
      const k = Math.min(l, R) / l;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      if (l / R < 0.25) { JOY.x = 0; JOY.y = 0; } else { JOY.x = dx / l; JOY.y = dy / l; }
    };
    el.addEventListener('pointerdown', e => {
      JOY.active = true; JOY.id = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* 시험 이벤트에서는 예외가 난다 */ }
      ME.target = null; upd(e); e.preventDefault();
    });
    el.addEventListener('pointermove', e => { if (JOY.active && e.pointerId === JOY.id) upd(e); });
    const end = e => { if (e.pointerId !== JOY.id) return; JOY.active = false; JOY.x = JOY.y = 0; knob.style.transform = ''; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  const PTR = new Map();
  let pinch0 = 0, zoom0 = 1, tapStart = null;
  function setupPointer() {
    canvas.addEventListener('pointerdown', e => {
      PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (PTR.size === 1) tapStart = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      else {
        tapStart = null;
        const [a, b] = [...PTR.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = CAM.mode === 'over' ? OV.zoom : CAM.zoom;
      }
    });
    canvas.addEventListener('pointermove', e => {
      if (!PTR.has(e.pointerId)) return;
      const prev = PTR.get(e.pointerId);
      PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (PTR.size === 2 && pinch0 > 0) {
        const [a, b] = [...PTR.values()], k = pinch0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
        if (CAM.mode === 'over') OV.zoom = clamp(zoom0 * k, 0.3, 1.1); else setZoom(zoom0 * k);
      } else if (PTR.size === 1 && CAM.mode === 'over') {
        // 전체 지도에서는 한 손가락으로 끌어 지도를 옮긴다
        const wpp = 2 * CAM.d * tanV() * camera.aspect / Math.max(1, view.clientWidth || innerWidth);
        OV.px = clamp(OV.px - (e.clientX - prev.x) * wpp, -OV.w / 2, OV.w / 2);
        OV.pz = clamp(OV.pz - (e.clientY - prev.y) * wpp / Math.sin(OVP), -OV.h / 2, OV.h / 2);
      }
    });
    const up = e => {
      const s = tapStart;
      PTR.delete(e.pointerId);
      if (PTR.size < 2) pinch0 = 0;
      if (s && s.id === e.pointerId && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 12 && performance.now() - s.t < 450) onTap(e.clientX, e.clientY);
      tapStart = null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', e => { PTR.delete(e.pointerId); tapStart = null; pinch0 = 0; });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const k = Math.exp(e.deltaY * 0.0012);
      if (CAM.mode === 'over') OV.zoom = clamp(OV.zoom * k, 0.3, 1.1); else setZoom(CAM.zoom * k);
    }, { passive: false });
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAND_Y), HITP = new THREE.Vector3();
  let marker;
  function onTap(cx, cy) {
    const b = canvas.getBoundingClientRect();
    ndc.set((cx - b.left) / b.width * 2 - 1, -(cy - b.top) / b.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (PAUSED) return;
    const hs = ray.intersectObjects(WORLD.hit || HIT, false);
    if (hs.length && hs[0].object.userData.school) {
      const s = hs[0].object.userData.school;
      if (CAM.mode === 'over') travelTo(s); else walkTo(s.px, s.pz);
      return;
    }
    if (hs.length && hs[0].object.userData.target) { const sp = hs[0].object.userData.target; walkTo(sp.x, sp.z); return; }
    if (!ray.ray.intersectPlane(GROUND, HITP) || !WORLD.walk(HITP.x, HITP.z)) return;
    if (CAM.mode === 'over') teleport(HITP.x, HITP.z);
    else walkTo(HITP.x, HITP.z);
  }
  function walkTo(x, z) {
    ME.target = { x, z, stuck: 0 };
    marker.position.set(x, LAND_Y + 0.05, z);
    marker.visible = true;
    marker.userData.t = 0;
  }
  function teleport(x, z) {
    const fade = $('fade');
    fade.classList.add('on');
    setTimeout(() => {
      let tx = x, tz = z;
      for (let k = 0; k < 40 && blocked(tx, tz, 0.3); k++) { const a = k * 2.4, r = 0.4 + k * 0.15; tx = x + Math.cos(a) * r; tz = z + Math.sin(a) * r; }
      ME.x = tx; ME.z = tz; ME.target = null; ME.tyaw = ME.yaw = 0;
      setMode('follow');
      CAM.d = WORLD.camD(); CAM.pitch = WORLD.pitch;
      updateCam(0, true);
      fade.classList.remove('on');
    }, REDUCED ? 0 : 230);
  }
  function travelTo(s) { teleport(s.px, s.pz + 0.2); }

  // ── 화면 안내판 ──
  let toastTimer = 0;
  function showToast(html, sec) {
    const el = $('toast');
    el.innerHTML = html;
    el.hidden = false;
    toastTimer = sec || 2.4;
  }
  // 아래 카드: 학교 발판(입장하기)과 교실의 교장·책·사진첩·TV(말 걸기·펼쳐 보기…)가 같이 쓴다. go()가 버튼의 일
  let CUR_SCHOOL = null, CUR_TARGET = null;
  function showCard(o) {
    CUR_TARGET = o;
    $('cardName').textContent = o.name;
    $('cardSub').textContent = o.sub || '';
    $('cardPend').hidden = !o.pending;
    $('btnEnter').textContent = o.btn || T.enter;
    $('card').hidden = false;
    $('hint').style.opacity = 0;
  }
  function hideCard() { $('card').hidden = true; CUR_SCHOOL = null; CUR_TARGET = null; }
  function schoolCard(s) {
    showCard({ name: s.name, sub: [s.city, s.regionName].filter(Boolean).join(' · '), pending: s.pending, btn: T.enter, go: () => openEnter(s) });
  }
  function openEnter(s) {
    if (C.rooms && C.rooms[s.id]) { enterRoom(s); return; }
    $('enterName').textContent = s.name;
    $('enterSub').textContent = [s.nameFr, s.city, s.regionName].filter(Boolean).join(' · ');
    $('enterBody').textContent = fill(T.enterBody, s);
    $('enter').hidden = false;
    $('btnBack').focus();
  }

  // ── 학교 공간(교실)으로 들어가기·나오기: 세계를 바꾸고 사람 메시를 옮긴 뒤 카메라를 바로 맞춘다 ──
  const ROOM = window.LOBBY_ROOM ? window.LOBBY_ROOM({
    THREE, LAND_Y, FONT_D, FONT_B, $, fill, clamp, canvasTex, colored, merge, pill, fitFont, signSprite, addChar, removeChar,
    showCard, hideCard, showToast, T, IS_TOUCH, setPaused: v => { PAUSED = !!v; if (v) { ME.target = null; ME.moving = false; } },
    vfovRad: () => THREE.MathUtils.degToRad(VFOV), aspect: () => camera.aspect, zoom: () => CAM.zoom
  }) : null;
  let CUR_ROOM = null;
  function switchWorld(w) {
    WORLD = w;
    for (const m of SHARED) w.scene.add(m);
    for (const ch of CHARS) if (ch.tag) { ch.tag.removeFromParent(); ch.tag.material.map.dispose(); ch.tag.material.dispose(); ch.tag = null; }
    ME.world = w.id;
  }
  function enterRoom(s) {
    if (!ROOM || CUR_ROOM) return;
    const cfg = C.rooms[s.id];
    const fade = $('fade');
    fade.classList.add('on');
    hideCard();
    setTimeout(() => {
      const w = ROOM.enter(s, cfg);
      CUR_ROOM = s;
      switchWorld(w);
      hideCard();
      ME.x = w.spawn.x; ME.z = w.spawn.z; ME.target = null; ME.tyaw = ME.yaw = w.spawn.yaw;
      if (CAM.mode === 'over') setMode('follow');
      CAM.tx = ME.x; CAM.tz = ME.z; CAM.d = w.camD(); CAM.pitch = w.pitch;
      updateCam(0, true);
      $('title').textContent = s.name;
      $('region').textContent = [s.city, s.regionName].filter(Boolean).join(' · ');
      $('btnMap').hidden = true; $('btnList').hidden = true; $('btnLobby').hidden = false;
      $('list').hidden = true;
      $('hint').textContent = T.hintRoom; $('hint').style.opacity = 1;
      setTimeout(() => { $('hint').style.opacity = 0; }, 7000);
      showToast(cfg.welcome || fill(T.roomEnter, { school: s.name }), 3.2);
      mpSetRoom(C.multiplayer.roomPrefix + s.id);
      fade.classList.remove('on');
    }, REDUCED ? 0 : 230);
  }
  function leaveRoom() {
    if (!CUR_ROOM) return;
    const s = CUR_ROOM;
    const fade = $('fade');
    fade.classList.add('on');
    hideCard();
    setTimeout(() => {
      ROOM.leave();
      CUR_ROOM = null;
      switchWorld(LOBBY_WORLD);
      hideCard();   // 나오는 동안 교실 카드가 다시 떴을 수 있다
      ME.x = s.px; ME.z = s.pz + 1.5; ME.target = null; ME.tyaw = ME.yaw = 0;
      CAM.tx = ME.x; CAM.tz = ME.z; CAM.d = LOBBY_WORLD.camD(); CAM.pitch = LOBBY_WORLD.pitch;
      updateCam(0, true);
      $('title').textContent = T.title;
      LAST_REGION = regionAt(ME.x, ME.z);
      $('region').textContent = LAST_REGION ? LAST_REGION.info.ko : '';
      $('btnMap').hidden = false; $('btnList').hidden = false; $('btnLobby').hidden = true;
      $('hint').textContent = IS_TOUCH ? T.hintTouch : T.hintMouse;
      mpSetRoom(C.multiplayer.lobbyRoom);
      fade.classList.remove('on');
    }, REDUCED ? 0 : 230);
  }
  function buildList() {
    const body = $('listBody');
    body.textContent = '';
    if (!SCHOOLS.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = T.noSchools; body.appendChild(p); return; }
    for (const code of C.regionOrder) {
      const ss = SCHOOLS.filter(s => s.regionCode === code);
      if (!ss.length) continue;
      const reg = REG.find(g => g.code === code);
      const sec = document.createElement('section'); sec.className = 'grp';
      const h = document.createElement('h3'); h.textContent = reg ? reg.info.ko : code;
      sec.appendChild(h);
      for (const s of ss) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'item';
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s.name;
        if (C.rooms && C.rooms[s.id]) { const o = document.createElement('span'); o.className = 'open'; o.textContent = T.enter; nm.appendChild(o); }
        const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = s.city;
        b.append(nm, ct);
        b.addEventListener('click', () => { $('list').hidden = true; travelTo(s); });
        sec.appendChild(b);
      }
      body.appendChild(sec);
    }
    if (T.listNote) { const p = document.createElement('p'); p.className = 'note'; p.textContent = T.listNote; body.appendChild(p); }
  }
  function setupUI() {
    document.title = T.title;
    $('title').textContent = T.title;
    $('btnMap').textContent = T.map;
    $('btnList').textContent = T.list;
    $('listTitle').textContent = T.listTitle;
    $('btnListClose').textContent = T.close;
    $('btnEnter').textContent = T.enter;
    $('cardPend').textContent = T.pending;
    $('btnBack').textContent = T.back;
    $('hint').textContent = IS_TOUCH ? T.hintTouch : T.hintMouse;
    $('btnLobby').textContent = T.toLobby;
    $('btnProfile').textContent = T.profileButton;
    $('nameTitle').textContent = T.nameTitle;
    $('nameIn').placeholder = T.nameHint;
    $('nameGo').textContent = T.nameGo;
    $('nameLook').textContent = T.nameLook;
    $('popClose').textContent = T.close;
    $('talkClose').textContent = T.close;
    $('talkListen').textContent = T.listen;
    $('albumNote').textContent = T.photoSoon;
    $('tvNote').textContent = T.videoSoon;
    $('bookTag').textContent = T.sampleTag;
    $('btnMap').addEventListener('click', () => setMode(CAM.mode === 'over' ? 'follow' : 'over'));
    $('btnList').addEventListener('click', () => { $('list').hidden = !$('list').hidden; });
    $('btnListClose').addEventListener('click', () => { $('list').hidden = true; });
    $('btnEnter').addEventListener('click', () => { if (CUR_TARGET && !PAUSED) CUR_TARGET.go(); });
    $('btnBack').addEventListener('click', () => { $('enter').hidden = true; });
    $('btnLobby').addEventListener('click', () => { if (ROOM) ROOM.closePop(); leaveRoom(); });
    $('btnProfile').addEventListener('click', () => { $('list').hidden = true; profileUI(); });
    buildList();
    setTimeout(() => { $('hint').style.opacity = 0; }, 7000);
    if (SHOW_STAT) $('stat').hidden = false;
    // 시험: 30~50명이 모인 모습을 보는 버튼(가짜 참가자, 접속 아님)
    $('btnBots').textContent = T.botsButton;
    $('btnBots').hidden = BOTS > 0;
    $('btnBots').addEventListener('click', () => {
      spawnBots(50);
      $('btnBots').hidden = true;
      $('stat').hidden = false;
      $('list').hidden = true;
      showToast(T.botsToast, 3);
    });
  }

  // ── 시작 ──
  let ME;
  function resize() {
    const w = view.clientWidth || innerWidth, h = view.clientHeight || innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* 저장 못 해도 진행 */ } };
  function loadLookIdx() {
    const v = lsGet('frLobbyLook2', null);
    if (Array.isArray(v) && v.length >= 5) return v;
    const idx = randomIdx(rng((Math.random() * 1e9) | 0));
    lsSet('frLobbyLook2', idx);
    return idx;
  }
  function init() {
    buildMap();
    buildLabels();
    buildPlaza();
    buildLandmarks();
    placeSchools();
    buildSchools();
    buildNature();
    buildCrowd();
    let fx = 1e9, fz = 1e9, fx1 = -1e9, fz1 = -1e9;
    for (const g of REG) if (g.code !== '94') for (const r of g.rings) for (const [x, z] of r) {
      fx = Math.min(fx, x); fx1 = Math.max(fx1, x); fz = Math.min(fz, z); fz1 = Math.max(fz1, z);
    }
    OV.x = (fx + fx1) / 2; OV.cz = (fz + fz1) / 2; OV.w = fx1 - fx + 4; OV.h = fz1 - fz + 4;
    OV.px = 0; OV.pz = 0; OV.zoom = 1;
    OV.sx = SCHOOLS.length ? (Math.min(...SCHOOLS.map(s => s.x)) + Math.max(...SCHOOLS.map(s => s.x))) / 2 : OV.x;
    const myIdx = loadLookIdx();
    ME = addChar({ x: PLAZA.x, z: PLAZA.z + 1.6, look: lookOf(myIdx), idx: myIdx, name: lsGet('frLobbyName', null) || T.me, me: true, world: 'lobby' });
    spawnBots(BOTS);
    marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#2A4D9B', transparent: true, depthWrite: false }));
    marker.visible = false;
    marker.renderOrder = 3;
    scene.add(marker);
    SHARED.push(marker);
    LOBBY_WORLD.signs = SIGNS; LOBBY_WORLD.hit = HIT;
    setupUI();
    setupJoy();
    setupPointer();
    resize();
    addEventListener('resize', resize);
    updateCam(0, true);
    LAST_REGION = regionAt(ME.x, ME.z);
    $('region').textContent = LAST_REGION ? `${T.plaza} · ${LAST_REGION.info.ko}` : T.plaza;
    renderer.setAnimationLoop(frame);
    mpInit();
    // 시험용 손잡이(브라우저 콘솔에서 위치·카메라를 바로 바꿔 본다)
    window.LOBBY = { ME, CHARS, CAM, SCHOOLS, REG, MOUNT, MP, teleport, setZoom, setMode, regionAt, toXZ, walkTo, openEnter, enterRoom, leaveRoom, renderer, camera,
      world: () => WORLD, room: ROOM, snap: () => updateCam(0, true) };
  }
  let LAST_REGION = null, last = performance.now(), fpsN = 0, fpsT = 0, firstFrame = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const inLobby = WORLD === LOBBY_WORLD;
    // 내 캐릭터
    let ix = 0, iz = 0;
    if (!PAUSED) {
      if (KEYS.KeyW || KEYS.ArrowUp) iz -= 1;
      if (KEYS.KeyS || KEYS.ArrowDown) iz += 1;
      if (KEYS.KeyA || KEYS.ArrowLeft) ix -= 1;
      if (KEYS.KeyD || KEYS.ArrowRight) ix += 1;
      if (JOY.active) { ix += JOY.x; iz += JOY.y; }
    }
    if (CAM.mode === 'over' && (ix || iz)) setMode('follow');
    if (ix || iz) { ME.target = null; stepChar(ME, ix, iz, dt); }
    else if (ME.target) {
      const dx = ME.target.x - ME.x, dz = ME.target.z - ME.z;
      if (Math.hypot(dx, dz) < 0.2) { ME.target = null; ME.moving = false; }
      else if (!stepChar(ME, dx, dz, dt) && (ME.target.stuck += dt) > 0.5) { ME.target = null; ME.moving = false; }
    } else ME.moving = false;
    for (const ch of CHARS) { if (ch.bot && inLobby) updateBot(ch, dt); else if (ch.peer) updatePeer(ch, dt); }
    if (inLobby) {
      // 지역이 바뀌면 알림
      const rg = regionAt(ME.x, ME.z);
      if (rg && rg !== LAST_REGION) {
        LAST_REGION = rg;
        showToast(`${rg.info.ko}<small>${rg.info.fr}</small>`);
        $('region').textContent = rg.info.ko;
      }
      // 입장 발판
      let near = null;
      if (CAM.mode !== 'over') for (const s of SCHOOLS) if (Math.hypot(ME.x - s.px, ME.z - s.pz) < 1.15) { near = s; break; }
      if (near !== CUR_SCHOOL) { if (near) { CUR_SCHOOL = near; schoolCard(near); } else hideCard(); }
      if (!REDUCED) seaTex.offset.x = (seaTex.offset.x + dt * 0.006) % 1;
      animateSchools(t);
    } else if (ROOM) ROOM.update(dt, ME);
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) $('toast').hidden = true;
    if (marker.visible) {
      marker.userData.t += dt;
      marker.material.opacity = Math.max(0, 1 - marker.userData.t / 1.2);
      marker.scale.setScalar(1 + marker.userData.t * 0.5);
      if (!ME.target && marker.userData.t > 0.3) marker.visible = false;
    }
    drawCrowd(t, dt);
    updateCam(dt, false);
    updateTags(dt);
    mpUpdate(dt);
    renderer.render(WORLD.scene, camera);
    if (firstFrame) { firstFrame = false; const L = $('loading'); L.style.opacity = 0; setTimeout(() => { L.hidden = true; }, 450); }
    fpsN++; fpsT += dt;
    if (fpsT >= 0.5) { $('stat').textContent = fill(T.stat, { n: CHARS.filter(c => c.world === WORLD.id).length, fps: Math.round(fpsN / fpsT) }); fpsN = 0; fpsT = 0; }
  }

  /* ─────────────────────────────────────────────────────────────
     MULTI — 온라인 중계 서버 접속(2026-10-06). relay.json의 주소를 읽어 /health로 먼저 깨운 뒤(무료 서버는 쉬다가 약 1분 만에 깬다) WebSocket으로 붙는다.
     보내는 것: 초당 8번까지, 바뀌었을 때만 [x, 0, z, 방향, 걷기(0/1), 0]. 받는 것: 같은 방 사람들의 상태 묶음(snap).
     다른 사람 = 같은 만화풍 캐릭터(생김새 번호 5개). 로비 방 'fr:lobby', 교실 방 'fr:<학교 id>'. ?mp=0이면 끔, ?mp=주소면 그 서버.
     ───────────────────────────────────────────────────────────── */
  const MPC = C.multiplayer || {};
  const MP = { on: false, url: '', health: '', ws: null, id: null, peers: new Map(), room: (MPC.lobbyRoom || 'fr:lobby') + (ROOM_SUFFIX ? '-' + ROOM_SUFFIX : ''),
    sendT: 0, last: '', retry: 0, name: '', full: false, state: 'solo', waking: false, pending: null };
  function wsFrom(h) {
    h = String(h || '').trim();
    if (!h) return '';
    if (/^wss?:\/\//.test(h)) return h;
    h = h.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return (/^(localhost|127\.0\.0\.1)(:|$)/.test(h) ? 'ws://' : 'wss://') + h + '/ws';
  }
  function healthFrom(ws) { return ws.replace(/^ws/, 'http').replace(/\/ws$/, '/health'); }
  function mpBadge(st) {
    const b = $('mpBadge');
    MP.state = st;
    if (st === 'solo') { b.hidden = true; return; }
    b.dataset.st = st; b.hidden = false;
    b.textContent = st === 'on' ? fill(T.mpOn, { n: MP.peers.size + 1 }) : st === 'wake' ? T.mpWake + '…' : st === 'wait' ? T.mpWait + '…' : st === 'full' ? T.mpFullBadge : T.mpOff;
  }
  function mpInit() {
    if (MPQ === '0') return;
    if (MPQ) { MP.url = wsFrom(MPQ); MP.health = healthFrom(MP.url); MP.on = true; mpStart(); return; }
    if (!MPC.file) return;
    fetch(MPC.file + '?t=' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => {
      const u = j && typeof j.relay === 'string' ? wsFrom(j.relay) : '';
      if (!u) return;
      MP.url = u; MP.health = (j.health && /^https?:/.test(j.health)) ? j.health : healthFrom(u); MP.on = true;
      mpStart();
    }).catch(() => {});
  }
  // 처음 접속: 이름이 없으면 묻고, 있으면 바로 서버를 깨워 붙는다
  function mpStart() {
    const saved = lsGet('frLobbyName', null);
    if (saved == null) { profileUI(true); return; }
    MP.name = saved;
    mpWakeAndConnect();
  }
  function mpWakeAndConnect() {
    if (!MP.on || MP.ws || MP.waking) return;
    MP.waking = true;
    mpBadge('wake');
    const tryHealth = n => {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const tm = setTimeout(() => { if (ctl) ctl.abort(); }, 75000);
      fetch(MP.health + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(r => {
        clearTimeout(tm);
        if (!r.ok) throw new Error('bad');
        MP.waking = false;
        mpConnect();
      }).catch(() => {
        clearTimeout(tm);
        if (n < 2) setTimeout(() => tryHealth(n + 1), 4000);
        else { MP.waking = false; mpBadge('solo'); MP.on = false; }   // 서버가 없으면 조용히 혼자 보기
      });
    };
    tryHealth(0);
  }
  function mpState() {
    const r = v => Math.round(v * 100) / 100;
    return [r(ME.x), 0, r(ME.z), r(ME.yaw), ME.moving ? 1 : 0, 0];
  }
  function mpConnect() {
    if (!MP.on || MP.ws) return;
    let ws;
    try { ws = new WebSocket(MP.url); } catch (_) { mpBadge('off'); return; }
    MP.ws = ws; MP.full = false; mpBadge('wait');
    ws.onopen = () => { MP.retry = 0; ws.send(JSON.stringify({ t: 'hello', room: MP.room, name: MP.name, look: ME.idx, s: mpState() })); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } mpMsg(m); };
    ws.onclose = () => {
      if (MP.ws !== ws) return;
      MP.ws = null; MP.id = null; mpClear();
      if (MP.pending) { const r = MP.pending; MP.pending = null; MP.room = r; mpConnect(); return; }   // 방을 바꾸려고 끊은 것
      if (!MP.on) { mpBadge('solo'); return; }
      if (MP.full) { mpBadge('full'); return; }
      mpBadge('off');
      MP.retry = Math.min(MP.retry + 1, 6);
      setTimeout(() => { if (MP.on && !MP.ws) mpWakeAndConnect(); }, 1500 * MP.retry);
    };
    ws.onerror = () => {};
  }
  function mpSetRoom(room) {
    room = room + (ROOM_SUFFIX ? '-' + ROOM_SUFFIX : '');
    if (room === MP.room && MP.ws) return;
    if (!MP.ws) { MP.room = room; return; }
    MP.pending = room;
    try { MP.ws.close(); } catch (_) { MP.ws = null; MP.pending = null; MP.room = room; mpConnect(); }
  }
  function mpMsg(m) {
    if (m.t === 'welcome') { MP.id = m.id; (m.peers || []).forEach(mpAdd); mpBadge('on'); ME.name = String(m.name || MP.name || T.guest).slice(0, 12); if (ME.tag) { ME.tag.removeFromParent(); ME.tag = null; } }
    else if (m.t === 'join') mpAdd(m);
    else if (m.t === 'leave') mpRemove(m.id);
    else if (m.t === 'snap') { (m.ps || []).forEach(a => { const p = MP.peers.get(a[0]); if (p) mpSet(p, a.slice(1)); }); }
    else if (m.t === 'full') { MP.full = true; showToast(T.mpFull, 4); }
  }
  function mpAdd(d) {
    if (!d || d.id === MP.id || MP.peers.has(d.id)) return;
    const i = d.id, idx = Array.isArray(d.look) ? d.look : [i % 4, (i * 3) % 6, (i * 5 + 1) % 8, (i * 7) % 5, i % 3];
    const s = Array.isArray(d.s) ? d.s : [0, 0, 0, 0, 0, 0];
    const ch = addChar({ x: +s[0] || 0, z: +s[2] || 0, yaw: +s[3] || 0, tyaw: +s[3] || 0, look: lookOf(idx), idx, name: String(d.name || T.guest).slice(0, 12), world: WORLD.id,
      peer: { id: i, tx: +s[0] || 0, tz: +s[2] || 0, anim: s[4] | 0, t: 0 } });
    if (!ch) return;
    MP.peers.set(i, ch);
    mpBadge('on');
  }
  function mpSet(ch, s) {
    const p = ch.peer;
    p.tx = +s[0] || 0; p.tz = +s[2] || 0; ch.tyaw = +s[3] || 0; p.anim = s[4] | 0; p.t = 0;
  }
  function mpRemove(id) {
    const ch = MP.peers.get(id);
    if (!ch) return;
    removeChar(ch);
    MP.peers.delete(id);
    mpBadge(MP.state);
  }
  function mpClear() { [...MP.peers.keys()].forEach(mpRemove); }
  // 다른 사람: 받은 자리로 부드럽게 옮기고, 걷는 중이면 발을 움직인다
  function updatePeer(ch, dt) {
    const p = ch.peer;
    const dx = p.tx - ch.x, dz = p.tz - ch.z, dist = Math.hypot(dx, dz);
    if (dist > 8) { ch.x = p.tx; ch.z = p.tz; }
    else if (dist > 0.01) {
      const step = Math.min(dist, Math.max(dist * dt * 9, SPEED * (WORLD.speedK || 1) * dt * 0.6));
      ch.x += dx / dist * step; ch.z += dz / dist * step;
    }
    p.t += dt;
    const moving = p.anim === 1 && p.t < 0.6 || dist > 0.15;
    ch.moving = moving;
    if (moving) ch.phase += SPEED * (WORLD.speedK || 1) * dt * 2.3 * Math.min(1, dist * 3 + 0.4);
  }
  function mpUpdate(dt) {
    if (!MP.ws || MP.ws.readyState !== 1 || MP.id == null) return;
    MP.sendT += dt;
    if (MP.sendT >= 1 / (MPC.sendHz || 8)) {
      const s = mpState(), k = s.join(',');
      if (k !== MP.last || MP.sendT > 2) { try { MP.ws.send(JSON.stringify({ t: 's', s })); } catch (_) { /* 끊기면 onclose가 처리 */ } MP.last = k; MP.sendT = 0; }
    }
  }
  // 이름·모습 정하기(처음 접속할 때, 학교 목록 맨 아래 '내 이름·모습 바꾸기')
  function paintMe() {
    const lk = ME.look, el = $('nameMe').firstElementChild;
    el.style.setProperty('--c-skin', lk.skin); el.style.setProperty('--c-hair', lk.hair); el.style.setProperty('--c-shirt', lk.shirt);
  }
  function profileUI(first) {
    const box = $('nameBox'), inp = $('nameIn');
    inp.value = first ? '' : (MP.name || lsGet('frLobbyName', '') || '');
    paintMe();
    box.hidden = false;
    PAUSED = true; ME.target = null;
    $('nameLook').onclick = () => { ME.idx = randomIdx(rng((Math.random() * 1e9) | 0)); ME.look = lookOf(ME.idx); lsSet('frLobbyLook2', ME.idx); paintMe(); };
    const go = () => {
      const n = String(inp.value || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12);
      lsSet('frLobbyName', n);
      MP.name = n;
      ME.name = n || T.me;
      if (ME.tag) { ME.tag.removeFromParent(); ME.tag = null; }
      box.hidden = true; PAUSED = false;
      try { inp.blur(); } catch (_) { /* 없어도 됨 */ }
      if (!MP.on) return;
      if (MP.ws) { MP.pending = MP.room; try { MP.ws.close(); } catch (_) { /* onclose가 다시 붙인다 */ } }   // 새 이름·모습을 알리려고 다시 붙는다
      else mpWakeAndConnect();
    };
    $('nameGo').onclick = go;
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    if (!IS_TOUCH) setTimeout(() => { try { inp.focus(); } catch (_) { /* 없어도 됨 */ } }, 60);
  }

  $('loading').textContent = T.loading;
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.race([
      Promise.all([document.fonts.load("40px 'Jua'", '가나다'), document.fonts.load("700 40px 'Noto Sans KR'", '가나다Île'), document.fonts.load("900 40px 'Noto Sans KR'", '가나다')]).catch(() => {}),
      new Promise(r => setTimeout(r, 3000))])
    : Promise.resolve();
  fontsReady.then(init);
})();
