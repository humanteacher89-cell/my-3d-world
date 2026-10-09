// 가상융합교육 지도 엔진 v0.1 — 프랑스 한글학교 로비 엔진 v0.2를 복사해 캠퍼스 판(campus-map.js, M.campus)을 그리게 바꾼 것(2026-10-07 XR개발부).
// 바뀐 곳: buildMap(우주·빛 격자·융합선), buildPlaza(포털), placeSchools·buildSchools(관 건물 kind별), buildNature(나무 구역), loadContent(contentMap). 나머지는 프랑스 로비와 같다.
// 프랑스 한글학교 로비 엔진 v0.2 (three.js r147 UMD, 전역 THREE)
// 글·학교·지역 색·교실 내용: lobby.config.js / 지도 좌표: france-map.js(tools/make_map.py가 만듦) / 교실: room.js
// 멀티플레이: 같은 폴더 relay.json의 온라인 중계 서버(relay/server.js)에 붙는다. 로비 방 'fr:lobby', 교실 방 'fr:<학교 id>'.
// 시험 주소: ?bots=50 가짜 참가자 50명(#bots50도 됨), ?test=1(#test) 학교 목록에 '시험용 참가자' 버튼, ?fps=1 초당 화면 수, ?mp=0 접속 끔, ?mp=ws://127.0.0.1:8787/ws 시험 서버, ?room=이름 다른 방
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
  const MAX_CHARS = 80; /* 동시접속 60명 예정(10-06 휴먼쌤) + NPC·여유 */                    // 한 번에 그릴 수 있는 최대 인원
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
    if (M.ai) { buildAiIsland(); return; }
    if (M.campus) { buildCampus(); return; }
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
  // 캠퍼스 판: 판 밖은 별이 흐르는 우주, 판 = 현실 교정(풀밭) · 융합 광장(돌) · 가상 구역(남색 + 빛 격자), 경계 = 융합선
  function buildCampus() {
    seaTex = canvasTex(256, 256, (g) => {
      g.fillStyle = C.look.sea; g.fillRect(0, 0, 256, 256);
      const R = rng(11);
      for (let i = 0; i < 26; i++) {
        const x = R() * 256, y = R() * 256, r = 0.6 + R() * 1.6;
        g.fillStyle = `rgba(255,255,255,${0.35 + R() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping;
    seaTex.repeat.set(36, 36);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: seaTex }));
    sea.position.y = -6;
    scene.add(sea);
    // 판 테두리(두꺼운 받침) + 구역 판
    slab(M.base.map(ringOf), 2.2, C.look.base, '#252A55').position.y = LAND_Y - 0.08 - 2.2;
    for (const g of REG) slab(g.rings, LAND_Y, g.info.color);
    // 가상 구역: 2칸 간격 빛 격자(구역 안쪽만)
    const vz = REG.find(g => g.code === 'virtual'), pos = [], y = LAND_Y + 0.015, st = 2;
    if (vz) {
      const inV = (x, z) => regionAt(x, z) === vz;
      for (let x = Math.ceil(gx0 / st) * st; x <= gx1; x += st) for (let z = Math.ceil(gz0 / st) * st; z < gz1; z += st) {
        if (inV(x, z) && inV(x, z + st)) pos.push(x, y, z, x, y, z + st);
        if (inV(x, z) && inV(x + st, z)) pos.push(x, y, z, x + st, y, z);
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C.look.grid, transparent: true, opacity: 0.55 }));
      lines.renderOrder = 1;
      scene.add(lines);
    }
    // 판 둘레선 + 융합선(현실·가상과 광장 사이의 빛나는 띠)
    ribbons(REG.filter(g => g.code !== 'fusion').flatMap(g => g.rings), 0.16, '#FFFFFF', 0.5, LAND_Y + 0.012);
    const S = M.size;
    for (const sx of [-1, 1]) ribbons([[[sx * S.B, -S.H], [sx * S.B, S.H]]], 0.9, C.look.fusionLine, 0.85, LAND_Y + 0.02);
    // 별 몇 개를 판 위 하늘에도(밤 분위기)
    const sp = [], R = rng(5);
    for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, d = 90 + R() * 160; sp.push(Math.cos(a) * d, 25 + R() * 90, Math.sin(a) * d - 40); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.9, fog: false })));
  }

  // AI가 지은 섬(ai-map.js, M.ai): 새벽빛 하늘에 뜬 육각 결정 판들 + 빛 다리. 판 위에 옅은 회로 선, 둘레에 떠 있는 결정 조각
  const AI_FX = { shards: null, t: 0 };
  function buildAiIsland() {
    const sk = C.look.skyGrad || ['#3B2C7A', '#E9A6C9'];
    scene.background = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sk[0]); gr.addColorStop(0.62, sk[1]); gr.addColorStop(1, sk[2] || sk[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog.color.set(C.look.fog || sk[1]);
    // 아래 멀리 구름 바다(분홍 안개 판)
    seaTex = canvasTex(256, 256, (g) => {
      g.fillStyle = C.look.sea; g.fillRect(0, 0, 256, 256);
      const R = rng(11);
      for (let i = 0; i < 18; i++) { const x = R() * 256, y = R() * 256, r = 18 + R() * 30, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping;
    seaTex.repeat.set(12, 12);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: seaTex }));
    sea.position.y = -14;
    scene.add(sea);
    // 결정 판: 두꺼운 받침(아래로 좁아지는 느낌은 두 겹으로) + 윗면 색
    slab(M.base.map(ringOf), 1.6, C.look.base, C.look.baseSide || '#5B4FA8').position.y = LAND_Y - 0.08 - 1.6;
    const under = slab(M.base.map(ringOf), 1.2, C.look.baseSide || '#5B4FA8');
    under.position.y = LAND_Y - 0.08 - 2.8; under.visible = false;
    under.position.x = 0;
    for (const g of REG) {
      if (g.code === 'bridge') continue;
      slab(g.rings, LAND_Y, g.info.color);
    }
    // 빛 다리: 판보다 조금 낮게(겹친 곳이 판 아래로 숨게), 반투명 빛
    const br = REG.find(g => g.code === 'bridge');
    if (br) {
      const geo = new THREE.ExtrudeGeometry(br.rings.map(shapeOf), { depth: 0.25, bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: br.info.color, transparent: true, opacity: 0.78 }));
      m.position.y = LAND_Y - 0.3; scene.add(m);
      ribbons(br.rings, 0.14, C.look.grid, 0.9, LAND_Y - 0.03);
    }
    // 판 둘레선 + 회로 선(판 안쪽만, 꺾인 짧은 선)
    ribbons(REG.filter(g => g.code !== 'bridge').flatMap(g => g.rings), 0.18, '#FFFFFF', 0.55, LAND_Y + 0.012);
    const pos = [], y = LAND_Y + 0.014, R = rng(23);
    for (const g of REG) {
      if (g.code === 'bridge') continue;
      const inG = (x, z) => regionAt(x, z) === g;
      const [cx, cz] = [g.rings[0].reduce((v, p) => v + p[0], 0) / g.rings[0].length, g.rings[0].reduce((v, p) => v + p[1], 0) / g.rings[0].length];
      const n = g.code === 'core' ? 10 : g.code === 'village' ? 6 : 7;
      for (let i = 0; i < n; i++) {
        let x = cx + (R() - 0.5) * 12, z = cz + (R() - 0.5) * 12;
        if (!inG(x, z)) continue;
        for (let s = 0; s < 3; s++) {
          const horiz = (s + i) % 2 === 0, L = 1.2 + R() * 2.4, nx = horiz ? x + (R() < 0.5 ? -L : L) : x, nz = horiz ? z : z + (R() < 0.5 ? -L : L);
          if (!inG(nx, nz)) break;
          pos.push(x, y, z, nx, y, nz); x = nx; z = nz;
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C.look.grid, transparent: true, opacity: 0.5 }));
    lines.renderOrder = 1; scene.add(lines);
    // 떠 있는 결정 조각(섬 둘레·아래)
    const n = 46, sh = inst(new THREE.OctahedronGeometry(0.6, 0), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85 }), n);
    const cols = C.look.shards || ['#9FF0DC', '#B9A2FF', '#8FD8FF', '#FFB3D9'];
    AI_FX.list = [];
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = 34 + R() * 26, s = 0.5 + R() * 1.6;
      AI_FX.list.push({ x: Math.cos(a) * d, y: LAND_Y - 4 + R() * 12, z: Math.sin(a) * d + 4, s, ph: R() * 6.28 });
      sh.setColorAt(i, _c.set(cols[i % cols.length]));
    }
    AI_FX.shards = sh; sh.count = n;
    // 별 몇 개(새벽 하늘 위쪽)
    const sp = [], RS = rng(5);
    for (let i = 0; i < 160; i++) { const a = RS() * Math.PI * 2, d = 120 + RS() * 120; sp.push(Math.cos(a) * d, 60 + RS() * 80, Math.sin(a) * d - 60); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.8, fog: false, transparent: true, opacity: 0.7 })));
  }
  // 깨어나는 마을(로비 판 위 꾸밈): 동쪽 서버 숲(빛이 깜빡이는 나무), 서쪽에 희미하게 떠서 기다리는 주민들
  function buildAiDecor() {
    const [vx, vz] = M.vil, R = rng(77), P = [], G = [];
    const ok = (x, z, r) => regionAt(x, z) && SCHOOLS.every(s => Math.hypot(x - s.x, z - s.z) > 4 + r && Math.hypot(x - s.px, z - s.pz) > 2.2 + r);
    AI_FX.leds = [];
    for (let i = 0, made = 0; i < 80 && made < 9; i++) {
      const x = vx + 4 + R() * 7, z = vz - 6 + R() * 12;
      if (!ok(x, z, 0.8) || P.some(p => Math.hypot(p.x - x, p.z - z) < 1.9)) continue;
      const h = 2.2 + R() * 1.6; P.push({ x, z, h }); made++;
      COLL.push({ x, z, r: 0.55 });
    }
    const body = inst(new THREE.BoxGeometry(0.9, 1, 0.7).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#7A70C4' }), Math.max(1, P.length));
    const led = inst(new THREE.BoxGeometry(0.12, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), Math.max(1, P.length * 6));
    let n = 0;
    P.forEach((p, k) => {
      _q.identity(); _p.set(p.x, LAND_Y, p.z); _s.set(1, p.h, 1); body.setMatrixAt(k, _m.compose(_p, _q, _s));
      for (let j = 0; j < 6; j++) { _p.set(p.x - 0.25 + (j % 3) * 0.25, LAND_Y + 0.4 + Math.floor(j / 3) * 0.5 + (p.h - 1.6) * 0.5, p.z + 0.36); _s.set(1, 1, 1); led.setMatrixAt(n, _m.compose(_p, _q, _s)); AI_FX.leds.push({ i: n, ph: R() * 6.28, sp: 2 + R() * 5 }); n++; }
    });
    body.count = P.length; led.count = n; AI_FX.led = led;
    // 서버 숲 이름판
    if (P.length) { const s = signSprite(T.serverForest || '서버 숲', T.serverForestSub || '', { bg: '#2A2466', fg: '#FFFFFF', w: 3.6 }); s.userData.anchor = [vx + 8, LAND_Y + 4.6, vz]; SIGNS.push(s); }
    // 기다리는 주민: 둥근 몸 + 빛 눈. 평소 희미(투명), 가끔 한 명이 밝아졌다 다시 희미해진다
    AI_FX.res = [];
    for (let i = 0, made = 0; i < 80 && made < 7; i++) {
      const x = vx - 10 + R() * 7, z = vz - 6 + R() * 12;
      if (!ok(x, z, 0.6) || G.some(p => Math.hypot(p.x - x, p.z - z) < 1.8)) continue;
      G.push({ x, z }); made++;
      const grp = new THREE.Group(); grp.position.set(x, LAND_Y + 0.9, z); grp.rotation.y = R() * 0.8 - 0.4;
      const mat = new THREE.MeshLambertMaterial({ color: '#E6E0FF', transparent: true, opacity: 0.35, emissive: '#7C6CE0', emissiveIntensity: 0.2 });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat); b.scale.set(1, 1.15, 1); grp.add(b);
      const eyeM = new THREE.MeshBasicMaterial({ color: '#9FF0DC', transparent: true, opacity: 0.4 });
      [-0.18, 0.18].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeM); e.position.set(ex, 0.12, 0.5); grp.add(e); });
      scene.add(grp);
      AI_FX.res.push({ grp, mat, eyeM, y: LAND_Y + 0.9, ph: R() * 6.28 });
    }
    if (G.length) { const s = signSprite(T.waitSquare || '기다리는 주민들', T.waitSquareSub || '', { bg: '#2A2466', fg: '#FFFFFF', w: 3.6 }); s.userData.anchor = [vx - 7, LAND_Y + 3.2, vz]; SIGNS.push(s); }
  }
  function animateAi(t) {
    if (AI_FX.led) { AI_FX.leds.forEach(o => AI_FX.led.setColorAt(o.i, _c.set(Math.sin(t * o.sp + o.ph) > 0.2 ? '#9FF0DC' : '#3A3478'))); if (AI_FX.led.instanceColor) AI_FX.led.instanceColor.needsUpdate = true; }
    if (AI_FX.res) {
      const wake = Math.floor(t / 4) % Math.max(1, AI_FX.res.length), ph = (t % 4) / 4;   // 4초마다 한 명씩 '부탁을 받아' 깨어난다
      AI_FX.res.forEach((o, i) => {
        const on = i === wake ? Math.sin(ph * Math.PI) : 0;
        o.mat.opacity = 0.32 + on * 0.66; o.mat.emissiveIntensity = 0.2 + on * 0.6; o.eyeM.opacity = 0.35 + on * 0.65;
        o.grp.position.y = o.y + (REDUCED ? 0 : Math.sin(t * 0.8 + o.ph) * 0.12) + on * 0.3;
      });
    }
    const sh = AI_FX.shards;
    if (!sh) return;
    AI_FX.list.forEach((o, i) => {
      _q.setFromEuler(new THREE.Euler(t * 0.3 + o.ph, t * 0.4 + o.ph, 0));
      _p.set(o.x, o.y + (REDUCED ? 0 : Math.sin(t * 0.7 + o.ph) * 0.6), o.z); _s.set(o.s, o.s * 1.4, o.s);
      sh.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    sh.instanceMatrix.needsUpdate = true;
    if (CORE.ring) { CORE.ring.rotation.z = t * 0.5; CORE.ring2.rotation.z = -t * 0.35; CORE.gem.rotation.y = t * 0.4; CORE.gem.position.y = CORE.gy + (REDUCED ? 0 : Math.sin(t * 1.2) * 0.25); }
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
      if (g.info.noLabel) continue;
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
    if (M.ai) { buildCorePlaza(px, pz); return; }
    if (M.campus) { buildPortalPlaza(px, pz); return; }
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

  // 캠퍼스의 융합 광장: 둥근 돌 광장 + 북쪽에 세로로 선 포털 링(하늘색 → 분홍). 포털 기둥은 부딪힘, 고리 안은 지나갈 수 있다
  let portalGlow = null;
  function buildPortalPlaza(px, pz) {
    const tex = canvasTex(512, 512, (g, w) => {
      const c = w / 2;
      g.fillStyle = '#EEEAF6'; g.beginPath(); g.arc(c, c, c - 2, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 4; k++) {
        g.strokeStyle = k % 2 ? 'rgba(127,214,255,0.55)' : 'rgba(255,154,213,0.45)'; g.lineWidth = 7;
        g.beginPath(); g.arc(c, c, 70 + k * 46, 0, Math.PI * 2); g.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        g.fillStyle = 'rgba(42,77,155,0.28)'; g.beginPath(); g.arc(c + Math.cos(a) * 214, c + Math.sin(a) * 214, 9, 0, Math.PI * 2); g.fill();
      }
      const gr = g.createRadialGradient(c, c, 4, c, c, 60); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, 'rgba(185,162,255,0.6)');
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, 56, 0, Math.PI * 2); g.fill();
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r, 48), new THREE.MeshLambertMaterial({ map: tex }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(px, LAND_Y + 0.03, pz);
    disc.renderOrder = 2;
    scene.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(PLAZA.r, 0.13, 6, 56), new THREE.MeshLambertMaterial({ color: '#B9A2FF' }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(px, LAND_Y + 0.06, pz);
    scene.add(rim);
    // 포털 링
    const qz = pz - PLAZA.r - 1.6, R = 2.4;
    const gt = canvasTex(256, 16, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#8FD8FF'); gr.addColorStop(0.5, '#B9A2FF'); gr.addColorStop(1, '#FF9AD5');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.24, 14, 64), new THREE.MeshBasicMaterial({ map: gt }));
    ring.position.set(px, LAND_Y + R + 0.35, qz);
    scene.add(ring);
    const film = new THREE.Mesh(new THREE.CircleGeometry(R - 0.2, 40), new THREE.MeshBasicMaterial({ color: '#CFEFFF', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    film.position.copy(ring.position);
    scene.add(film);
    portalGlow = film;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.35, 24), new THREE.MeshLambertMaterial({ color: '#D9D6E6' }));
    base.position.set(px, LAND_Y + 0.17, qz);
    scene.add(base);
    for (const sx of [-1, 1]) COLL.push({ x: px + sx * R, z: qz, r: 0.45 });
    LANDMARKS.push({ x: px, z: qz, r: 3.2 });
    const sign = signSprite(T.plaza, T.plazaSub, { bg: '#1E2B4A', fg: '#FFFFFF' });
    sign.userData.anchor = [px, LAND_Y + 2 * R + 0.9, qz];
    SIGNS.push(sign);
  }

  // AI 섬의 생각의 핵: 둥근 빛 바닥 + 북쪽에 떠서 도는 다면체 보석과 고리 둘(부딪힘은 받침만)
  const CORE = {};
  function buildCorePlaza(px, pz) {
    const tex = canvasTex(512, 512, (g, w) => {
      const c = w / 2;
      g.fillStyle = '#F3EEFF'; g.beginPath(); g.arc(c, c, c - 2, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        g.strokeStyle = 'rgba(111,233,255,0.55)'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60); g.lineTo(c + Math.cos(a) * 230, c + Math.sin(a) * 230); g.stroke();
        g.fillStyle = 'rgba(185,162,255,0.7)'; g.beginPath(); g.arc(c + Math.cos(a) * 230, c + Math.sin(a) * 230, 10, 0, Math.PI * 2); g.fill();
      }
      for (let k = 0; k < 3; k++) { g.strokeStyle = k % 2 ? 'rgba(255,154,213,0.45)' : 'rgba(127,214,255,0.55)'; g.lineWidth = 7; g.beginPath(); g.arc(c, c, 90 + k * 60, 0, Math.PI * 2); g.stroke(); }
      const gr = g.createRadialGradient(c, c, 4, c, c, 64); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, 'rgba(159,240,220,0.6)');
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, 60, 0, Math.PI * 2); g.fill();
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r, 48), new THREE.MeshLambertMaterial({ map: tex }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(px, LAND_Y + 0.03, pz); disc.renderOrder = 2; scene.add(disc);
    const qz = pz - PLAZA.r + 0.4, gy = LAND_Y + 4.2;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.5, 6), new THREE.MeshLambertMaterial({ color: '#D9D2F2' }));
    base.position.set(px, LAND_Y + 0.25, qz); scene.add(base);
    const beamM = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.4, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#9FF0DC', transparent: true, opacity: 0.45, depthWrite: false }));
    beamM.position.set(px, LAND_Y + 2.1, qz); scene.add(beamM);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 0), new THREE.MeshLambertMaterial({ color: '#BFF5FF', emissive: '#4FB8D8', emissiveIntensity: 0.55, flatShading: true }));
    gem.position.set(px, gy, qz); scene.add(gem);
    const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshBasicMaterial({ color: '#9FF0DC', transparent: true, opacity: 0.14, depthWrite: false }));
    gem.add(halo);
    const ringM = (r, c) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 6, 64), new THREE.MeshBasicMaterial({ color: c })); m.position.set(px, gy, qz); scene.add(m); return m; };
    CORE.ring = ringM(2.3, '#B9A2FF'); CORE.ring.rotation.x = 1.2;
    CORE.ring2 = ringM(2.8, '#FFB3D9'); CORE.ring2.rotation.x = 1.9; CORE.ring2.rotation.y = 0.5;
    CORE.gem = gem; CORE.gy = gy;
    COLL.push({ x: px, z: qz, r: 1.4 });
    LANDMARKS.push({ x: px, z: qz, r: 3.0 });
    const sign = signSprite(T.plaza, T.plazaSub, { bg: '#2A2466', fg: '#FFFFFF' });
    sign.userData.anchor = [px, gy + 3.1, qz];
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
      s.px = s.x; s.pz = s.z + (C.hallPad || 1.75);   // 입장 발판(건물 남쪽 문 앞). 캠퍼스의 관은 건물이 커서 더 앞
      if (!s.regionCode) { const g = regionAt(s.x, s.z); s.regionCode = g && g.code; }
      SCHOOLS.push(s);
    }
  }
  // 캠퍼스의 관 건물(kind별). 앞(+z)이 문·발판 쪽. 돌려주는 값: 부딪힘 반지름 r, 높이 h
  function buildHall(s) {
    const P = [], G = [], EX = [];   // P: 빛 받는 몸(꼭짓점 색), G: 스스로 빛나는 부분 [geo, color]
    const box = (w, h, d, x, y, z, c) => P.push(colored(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c));
    const cyl = (r0, r1, h, x, y, z, c, n) => P.push(colored(new THREE.CylinderGeometry(r0, r1, h, n || 20).translate(x, y, z), c));
    const glow = (geo, c) => G.push([geo, c]);
    let r = 2.2, h = 3;
    const door = (z, c) => box(0.9, 1.3, 0.12, 0, 0.65, z, c || '#2A4D9B');
    switch (s.kind) {
      case 'dome': {   // 개념관: 유리 돔 + 빛 고리
        cyl(2.9, 3.0, 0.35, 0, 0.17, 0, '#E9E5F5', 28);
        P.push(colored(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.35, 0), '#BFE6FF'));
        for (const k of [0.95, 1.75]) glow(new THREE.TorusGeometry(2.6 * Math.sqrt(1 - Math.pow(k / 2.6, 2)), 0.06, 6, 40).rotateX(Math.PI / 2).translate(0, 0.35 + k, 0), '#8FD8FF');
        cyl(0.06, 0.06, 1.1, 0, 3.4, 0, '#C9C4DC', 6);
        glow(new THREE.SphereGeometry(0.22, 12, 8).translate(0, 4.0, 0), '#FF9AD5');
        box(1.5, 1.6, 0.9, 0, 0.8, 2.45, '#E9E5F5'); door(2.92);
        r = 2.8; h = 4.2; break;
      }
      case 'school': {   // 수업 사례관: 큰 학교 건물 + 시계탑
        box(5.2, 2.4, 3.2, 0, 1.2, 0, '#FFF3E2');
        const rs = new THREE.Shape(); rs.moveTo(-2.9, 0); rs.lineTo(2.9, 0); rs.lineTo(0, 1.3); rs.closePath();
        P.push(colored(new THREE.ExtrudeGeometry(rs, { depth: 3.5, bevelEnabled: false }).translate(0, 2.4, -1.75), '#D4774F'));
        box(1.2, 1.4, 1.2, 0, 3.6, 0.4, '#FFF3E2'); glow(new THREE.CircleGeometry(0.38, 20).translate(0, 3.75, 1.01), '#FFFFFF');
        for (const x of [-1.7, -0.9, 0.9, 1.7]) glow(new THREE.PlaneGeometry(0.6, 0.55).translate(x, 1.5, 1.61), '#FFE2A8');
        door(1.62, '#7A5A44');
        r = 2.7; h = 4.6; break;
      }
      case 'headset': {   // 장비관: VR 헤드셋 모양 건물
        box(4.6, 2.6, 2.8, 0, 1.6, 0, '#F4F2FB');
        glow(new THREE.BoxGeometry(3.8, 1.3, 0.2).translate(0, 1.85, 1.45), '#3B3F8F');
        for (const sx of [-1, 1]) glow(new THREE.CircleGeometry(0.5, 24).translate(sx * 0.95, 1.85, 1.56), '#8FD8FF');
        for (const sx of [-1, 1]) P.push(colored(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 20).rotateZ(Math.PI / 2).translate(sx * 2.5, 1.6, 0), '#C9C4DC'));
        P.push(colored(new THREE.TorusGeometry(2.4, 0.16, 6, 30, Math.PI).rotateX(-Math.PI / 2).translate(0, 1.9, -0.2), '#6E6A8E'));
        box(1.4, 0.3, 1.4, 0, 0.15, 1.9, '#D9D6E6'); door(1.42, '#2A2F66');
        r = 2.7; h = 3.6; break;
      }
      case 'workshop': {   // 제작 공방: 네온 테두리 작업동 + 쌓인 블록
        box(4.4, 2.6, 3.2, 0, 1.3, 0, '#2B3170');
        const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.4, 2.6, 3.2));
        const e = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: '#8FD8FF' })); e.position.set(0, 1.3, 0); EX.push(e);
        glow(new THREE.PlaneGeometry(3.6, 0.5).translate(0, 2.2, 1.61), '#8FD8FF');
        [[1.6, 0.45, -2.2, '#FF9AD5'], [2.3, 0.45, -1.9, '#FFD27F'], [1.9, 1.3, -2.1, '#7FE3D0']].forEach(([x, y, z, c]) => box(0.8, 0.8, 0.8, x, y, z + 0.6, c));
        door(1.62, '#8FD8FF');
        r = 2.6; h = 3.2; break;
      }
      case 'tower': {   // 미래 전망대: 가는 탑 + 유리 전망층
        cyl(1.4, 1.7, 0.6, 0, 0.3, 0, '#D9D6E6', 24);
        cyl(0.55, 0.8, 3.6, 0, 2.4, 0, '#E7ECFF', 16);
        cyl(1.9, 1.4, 0.8, 0, 4.5, 0, '#9CA3E6', 24);
        glow(new THREE.CylinderGeometry(1.95, 1.95, 0.32, 24, 1, true).translate(0, 4.62, 0), '#8FD8FF');
        cyl(0.05, 0.05, 1.2, 0, 5.5, 0, '#C9C4DC', 6); glow(new THREE.SphereGeometry(0.2, 10, 8).translate(0, 6.2, 0), '#FF9AD5');
        box(1.2, 1.4, 0.8, 0, 0.7, 1.2, '#E7ECFF'); door(1.62);
        r = 2.0; h = 6.4; break;
      }
      case 'lighthouse': {   // 안전·윤리 등대: 빨강·하양 줄무늬 + 등불
        [0, 1, 2].forEach(k => cyl(1.25 - k * 0.15, 1.4 - k * 0.15, 1.4, 0, 0.7 + k * 1.4, 0, k % 2 ? '#F5F5F5' : '#E0483E', 20));
        cyl(1.15, 1.15, 0.15, 0, 4.28, 0, '#3A3F74', 20);
        glow(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 16).translate(0, 4.8, 0), '#FFE58A');
        P.push(colored(new THREE.ConeGeometry(0.9, 0.8, 16).translate(0, 5.65, 0), '#E0483E'));
        door(1.36, '#3A3F74');
        r = 1.8; h = 6.1; break;
      }
      // ── AI가 지은 섬(2026-10-09): 사람 기준 문 대신 둥근 입구·떠 있는 발판. 몸은 연한 색, 빛나는 부분은 G ──
      case 'library': {   // 기억의 도서관: 빛나는 책 탑 셋 + 둥근 아치
        cyl(2.6, 2.8, 0.3, 0, 0.15, 0, '#E9E2FF', 6);
        [[-1.4, 3.4, -0.4], [0, 4.6, -0.9], [1.4, 2.8, -0.4]].forEach(([x, hh, z], i) => {
          for (let k = 0; k * 0.42 < hh; k++) box(1.0, 0.36, 0.8, x, 0.5 + k * 0.42, z, ['#C9B8FF', '#A9E8FF', '#FFD0E8', '#BFF5E0'][(k + i) % 4]);
          glow(new THREE.BoxGeometry(1.06, 0.05, 0.86).translate(x, 0.3 + hh, z), '#FFFFFF');
        });
        glow(new THREE.TorusGeometry(1.0, 0.09, 8, 32, Math.PI).translate(0, 0.35, 1.6), '#9FF0DC');
        r = 2.6; h = 5.2; break;
      }
      case 'garden': {   // 패턴 정원: 육각 화단 + 규칙대로 놓인 빛 꽃 + 가운데 줄기 탑
        cyl(2.6, 2.7, 0.35, 0, 0.17, 0, '#DFF7EA', 6);
        const cols = ['#FF9AD5', '#9FF0DC', '#FFD27F'];
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, d = 1.9; cyl(0.04, 0.04, 0.6, Math.cos(a) * d, 0.65, Math.sin(a) * d * 0.9 - 0.2, '#6FBF8A', 5); glow(new THREE.SphereGeometry(0.22, 10, 8).translate(Math.cos(a) * d, 1.05, Math.sin(a) * d * 0.9 - 0.2), cols[k % 3]); }
        cyl(0.18, 0.28, 3.0, 0, 1.85, -0.2, '#7FCF9A', 8);
        glow(new THREE.IcosahedronGeometry(0.6, 0).translate(0, 3.6, -0.2), '#9FF0DC');
        r = 2.6; h = 4.4; break;
      }
      case 'market': {   // 확률의 시장: 줄무늬 차양 가판대 셋 + 떠 있는 주사위
        cyl(2.7, 2.8, 0.3, 0, 0.15, 0, '#FFF0E0', 6);
        [[-1.6, -0.3, '#FF9AD5'], [0, -1.0, '#8FD8FF'], [1.6, -0.3, '#FFD27F']].forEach(([x, z, c]) => {
          box(1.3, 0.8, 0.8, x, 0.7, z, '#F7F1FF');
          for (let k = 0; k < 4; k++) box(0.34, 0.08, 1.0, x - 0.48 + k * 0.32, 1.9 - Math.abs(k - 1.5) * 0.06, z + 0.1, k % 2 ? '#FFFFFF' : c);
          [[-0.55, 0.3], [0.55, 0.3]].forEach(([a, b]) => cyl(0.04, 0.04, 1.2, x + a, 1.3, z + b, '#B8B0D8', 5));
        });
        glow(new THREE.BoxGeometry(0.7, 0.7, 0.7).rotateX(0.6).rotateZ(0.5).translate(0, 3.3, 0), '#FFFFFF');
        glow(new THREE.BoxGeometry(0.5, 0.5, 0.5).rotateX(0.3).rotateY(0.8).translate(1.1, 2.9, 0.4), '#FFD27F');
        r = 2.7; h = 4.0; break;
      }
      case 'dream': {   // 꿈 공방: 반투명 돔 + 떠 나오는 모양들
        cyl(2.6, 2.7, 0.35, 0, 0.17, 0, '#EDE3FF', 24);
        P.push(colored(new THREE.SphereGeometry(2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.35, 0), '#D8C8FF'));
        glow(new THREE.TorusGeometry(2.2, 0.07, 6, 40).rotateX(Math.PI / 2).translate(0, 0.4, 0), '#FFB3D9');
        glow(new THREE.TorusKnotGeometry(0.4, 0.13, 48, 8).translate(-0.9, 3.4, 0), '#FFB3D9');
        glow(new THREE.OctahedronGeometry(0.45, 0).translate(0.9, 3.0, 0.3), '#9FF0DC');
        glow(new THREE.SphereGeometry(0.32, 14, 10).translate(0.1, 3.9, -0.4), '#FFD27F');
        box(1.4, 1.2, 0.9, 0, 0.75, 2.1, '#EDE3FF'); door(2.56, '#7C6CE0');
        r = 2.6; h = 4.4; break;
      }
      case 'lake': {   // 물음 호수: 둥근 호수 + 물 위 물음표 결정
        cyl(2.8, 2.9, 0.2, 0, 0.1, 0, '#E3F4FF', 32);
        glow(new THREE.CircleGeometry(2.4, 40).rotateX(-Math.PI / 2).translate(0, 0.22, 0), '#8FC8F0');
        glow(new THREE.TorusGeometry(0.42, 0.13, 8, 24, Math.PI * 1.4).rotateZ(-0.6).translate(0, 2.6, -0.3), '#FFFFFF');
        glow(new THREE.SphereGeometry(0.14, 10, 8).translate(0, 1.7, -0.3), '#FFFFFF');
        cyl(0.03, 0.03, 1.3, 0, 1.3, -0.3, '#C9E6FF', 5);
        r = 2.8; h = 3.6; break;
      }
      case 'village': {   // 깨어나는 마을 입구: 기둥 둘 + 빛 들보 + 부탁 우체통
        [-2.2, 2.2].forEach(x => { cyl(0.32, 0.4, 3.6, x, 1.8, 0, '#E3DCFF', 6); glow(new THREE.OctahedronGeometry(0.4, 0).translate(x, 3.95, 0), '#9FF0DC'); });
        glow(new THREE.BoxGeometry(4.8, 0.22, 0.3).translate(0, 3.4, 0), '#B9A2FF');
        box(0.6, 1.0, 0.5, 1.2, 0.5, 1.0, '#7C6CE0'); glow(new THREE.PlaneGeometry(0.36, 0.08).translate(1.2, 0.8, 1.26), '#FFFFFF');
        r = 0.6; h = 4.2; break;
      }
      default: box(2.2, 1.6, 1.6, 0, 0.8, 0, '#FFF7EA'); door(0.82);
    }
    const HS = C.hallScale || 1, grp = new THREE.Group();   // 관 건물 크기 배율(넓은 판에서 잘 보이게)
    grp.position.set(s.x, LAND_Y, s.z); grp.scale.setScalar(HS); scene.add(grp);
    grp.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));
    for (const [geo, c] of G) grp.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })));
    for (const e of EX) grp.add(e);
    return { r: r * HS, h: h * HS };
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
      const H = M.campus ? buildHall(s) : null;
      COLL.push({ x: s.x, z: s.z, r: H ? H.r : 1.25 });
      const reg = REG.find(g => g.code === s.regionCode);
      s.regionName = reg ? reg.info.ko : '';
      s.sign = signSprite(s.name, M.campus ? s.nameFr : '');
      s.sign.userData.anchor = [s.x, LAND_Y + (H ? H.h + 0.6 : 2.7), s.z];
      s.sign.userData.stack = s.stack || 0;
      s.sign.userData.school = s;
      SIGNS.push(s.sign);
      HIT.push(s.sign);
      const hb = H ? new THREE.Mesh(new THREE.BoxGeometry(H.r * 2.2, H.h, H.r * 2 + 2.6), new THREE.MeshBasicMaterial())
        : new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.6, 4.2), new THREE.MeshBasicMaterial());
      hb.visible = false;
      if (H) hb.position.set(s.x, LAND_Y + H.h / 2, s.z + 1.3); else hb.position.set(s.x, LAND_Y + 1.2, s.z + 0.7);
      hb.userData.school = s;
      scene.add(hb);
      HIT.push(hb);
    });
    schoolBody.count = schoolFlag.count = schoolPad.count = SCHOOLS.length;
    if (M.campus) {
      schoolBody.count = schoolFlag.count = 0;   // 캠퍼스는 관마다 따로 지은 건물(buildHall)
      // 광장에서 관 발판까지 흐린 길(넓게 벌린 관을 찾아가기 쉽게)
      for (const s of SCHOOLS) {
        const dx = s.px - PLAZA.x, dz = s.pz - PLAZA.z, L = Math.hypot(dx, dz) || 1;
        ribbons([[[PLAZA.x + dx / L * (PLAZA.r + 0.3), PLAZA.z + dz / L * (PLAZA.r + 0.3)], [s.px - dx / L * 1.2, s.pz - dz / L * 1.2]]], 1.0, '#FFFFFF', 0.2, LAND_Y + 0.017);
      }
    }
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
      if (TC.regions && !TC.regions.includes(g.code)) continue;
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
    const goalPx = over ? (IS_TOUCH ? 60 : 80) : (IS_TOUCH ? 112 : 150);   // 전체 지도에서는 이름판을 작게(지역 이름을 덜 가리게, 10-06 검수)
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
    const web = $('cardWeb');
    if (web) { web.hidden = !o.web; if (o.web) web.href = o.web; }
    $('btnEnter').textContent = o.btn || T.enter;
    $('card').hidden = false;
    $('hint').style.opacity = 0;
  }
  function hideCard() { $('card').hidden = true; CUR_SCHOOL = null; CUR_TARGET = null; }
  function schoolCard(s) {
    showCard({ name: s.name, sub: [s.city, s.regionName].filter(Boolean).join(' · '), pending: s.pending, web: s.web, btn: T.enter, go: () => openEnter(s) });
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
    vfovRad: () => THREE.MathUtils.degToRad(VFOV), aspect: () => camera.aspect, zoom: () => CAM.zoom,
    exit: () => leaveRoom(),
    onStamp: (id, fresh) => passStamped(id, fresh)
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
      $('list').hidden = true; $('pass').hidden = true;
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
    if ($('cardWeb')) $('cardWeb').textContent = T.homepage || '홈페이지';
    $('btnMap').addEventListener('click', () => setMode(CAM.mode === 'over' ? 'follow' : 'over'));
    $('btnList').addEventListener('click', () => { $('pass').hidden = true; $('list').hidden = !$('list').hidden; });
    $('btnListClose').addEventListener('click', () => { $('list').hidden = true; });
    passSetup();
    $('btnEnter').addEventListener('click', () => { if (CUR_TARGET && !PAUSED) CUR_TARGET.go(); });
    $('btnBack').addEventListener('click', () => { $('enter').hidden = true; });
    $('btnLobby').addEventListener('click', () => { if (ROOM) ROOM.closePop(); leaveRoom(); });
    $('btnProfile').addEventListener('click', () => { $('list').hidden = true; profileUI(); });
    buildList();
    setTimeout(() => { $('hint').style.opacity = 0; }, 7000);
    if (SHOW_STAT) $('stat').hidden = false;
    // 시험: 30~50명이 모인 모습을 보는 버튼(가짜 참가자, 접속 아님). 공개 화면에서는 숨김(10-06 휴먼쌤), 주소 ?test=1 또는 #test 일 때만
    $('btnBots').textContent = T.botsButton;
    $('btnBots').hidden = BOTS > 0 || !(Q.get('test') === '1' || /test/.test(HASH));
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
    if (M.ai) buildAiDecor();
    buildCrowd();
    let fx = 1e9, fz = 1e9, fx1 = -1e9, fz1 = -1e9;
    for (const g of REG) if (g.code !== '94') for (const r of g.rings) for (const [x, z] of r) {
      fx = Math.min(fx, x); fx1 = Math.max(fx1, x); fz = Math.min(fz, z); fz1 = Math.max(fz1, z);
    }
    OV.x = (fx + fx1) / 2; OV.cz = (fz + fz1) / 2; OV.w = fx1 - fx + 4; OV.h = fz1 - fz + 4;
    OV.px = 0; OV.pz = 0; OV.zoom = 1;
    OV.sx = M.campus ? OV.x : SCHOOLS.length ? (Math.min(...SCHOOLS.map(s => s.x)) + Math.max(...SCHOOLS.map(s => s.x))) / 2 : OV.x;
    const myIdx = loadLookIdx();
    const SP = C.spawn ? toXZ(C.spawn.lon, C.spawn.lat) : [PLAZA.x, PLAZA.z + 1.6];   // 처음 서는 곳(AI 섬은 남쪽 마을 입구)
    ME = addChar({ x: SP[0], z: SP[1], look: lookOf(myIdx), idx: myIdx, name: lsGet('frLobbyName', null) || T.me, me: true, world: 'lobby' });
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
    $('region').textContent = LAST_REGION && LAST_REGION.info.ko !== T.plaza ? `${T.plaza} · ${LAST_REGION.info.ko}` : T.plaza;
    renderer.setAnimationLoop(frame);
    mpInit();
    loadContent();
    // 시험용 손잡이(브라우저 콘솔에서 위치·카메라를 바로 바꿔 본다)
    window.LOBBY = { ME, CHARS, CAM, SCHOOLS, REG, MOUNT, MP, CONTENT, teleport, setZoom, setMode, regionAt, toXZ, walkTo, openEnter, enterRoom, leaveRoom, renderer, camera,
      world: () => WORLD, room: ROOM, snap: () => updateCam(0, true), pass: { open: passOpen, stamped: passStamped, cert: certShow } };
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
      if (M.ai) animateAi(t);
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
    // 방 이름은 주소(?room=)와 첫 인사(hello) 둘 다에 넣는다: Cloudflare 판은 주소로 방을 고르고, Node 판은 인사를 본다
    try { ws = new WebSocket(MP.url + (MP.url.includes('?') ? '&' : '?') + 'room=' + encodeURIComponent(MP.room)); } catch (_) { mpBadge('off'); return; }
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
  // 연결을 끊고 다시 붙는다(방을 바꾸거나 이름·모습을 새로 알릴 때). onclose가 2.5초 안에 안 오면(서버가 닫기 응답을 늦게 줄 때) 옛 연결을 버리고 새로 붙는다
  function mpReconnect(room) {
    const old = MP.ws;
    MP.pending = room;
    try { old.close(); } catch (_) { MP.ws = null; MP.pending = null; MP.room = room; mpConnect(); return; }
    setTimeout(() => {
      if (MP.ws !== old || MP.pending !== room) return;
      MP.ws = null; MP.id = null; mpClear(); MP.pending = null; MP.room = room;
      mpConnect();
    }, 2500);
  }
  function mpSetRoom(room) {
    room = room + (ROOM_SUFFIX ? '-' + ROOM_SUFFIX : '');
    if (room === MP.room && MP.ws) return;
    if (!MP.ws) { MP.room = room; return; }
    mpReconnect(room);
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
      if (!$('pass').hidden) passRender();
      try { inp.blur(); } catch (_) { /* 없어도 됨 */ }
      if (!MP.on) return;
      if (MP.ws) mpReconnect(MP.room);   // 새 이름·모습을 알리려고 다시 붙는다
      else mpWakeAndConnect();
    };
    $('nameGo').onclick = go;
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    if (!IS_TOUCH) setTimeout(() => { try { inp.focus(); } catch (_) { /* 없어도 됨 */ } }, 60);
  }

  /* ─────────────────────────────────────────────────────────────
     PASS — 연수 수첩(2026-10-09). 오른쪽 위 '연수 수첩 n/6' 버튼 → 시트에 관 6곳 도장 칸. 도장은 room.js stamp()가
     localStorage 'xrStamps'({관 id: 'YYYY-MM-DD'})에 적고 core.onStamp로 알려 준다. 6개를 다 모으면 수료증(시트 맨 위 + 그림 저장).
     ───────────────────────────────────────────────────────────── */
  const STAMP_KEY = C.stampKey || 'xrStamps';   // 판마다 도장 기록을 따로(AI 섬 = aiStamps)
  const PASS_IDS = () => SCHOOLS.filter(s => C.rooms && C.rooms[s.id] && C.rooms[s.id].stampId).map(s => ({ s, sid: C.rooms[s.id].stampId }));
  const passLoad = () => { const v = lsGet(STAMP_KEY, {}); return v && typeof v === 'object' ? v : {}; };
  function passCount() { const st = passLoad(); return PASS_IDS().filter(o => st[o.sid]).length; }
  const passTotal = () => PASS_IDS().length;
  const myName = () => (MP.name || lsGet('frLobbyName', '') || '').trim();
  function passBadge() {
    const c = passCount(), n = passTotal();
    const el = $('passCnt');
    el.textContent = fill(T.passCount || '{c}/{n}', { c, n });
    el.classList.toggle('all', n > 0 && c >= n);
  }
  function passStamped(id, fresh) {
    passBadge();
    if (!$('pass').hidden) passRender();
    if (fresh && passTotal() > 0 && passCount() >= passTotal()) {
      setTimeout(() => { showToast(T.passAllToast || T.passAll, 5); passOpen(); }, 1600);
    }
  }
  function passOpen() { $('list').hidden = true; passRender(); $('pass').hidden = false; }
  function passRender() {
    const st = passLoad(), ids = PASS_IDS(), c = ids.filter(o => st[o.sid]).length, n = ids.length, all = n > 0 && c >= n;
    const body = $('passBody');
    body.textContent = '';
    const name = myName();
    // 이름 줄
    const who = document.createElement('div'); who.className = 'who';
    const wt = document.createElement('div');
    const wb = document.createElement('b'); wb.textContent = name || (T.passNoName || '');
    const ws = document.createElement('small'); ws.textContent = T.passSub || '';
    wt.append(wb, ws);
    const wbtn = document.createElement('button'); wbtn.type = 'button'; wbtn.className = 'pill'; wbtn.textContent = T.passRename || '';
    wbtn.addEventListener('click', () => { $('pass').hidden = true; profileUI(); });
    who.append(wt, wbtn);
    body.appendChild(who);
    // 수료증(다 모았을 때 맨 위)
    if (all) {
      const last = ids.map(o => st[o.sid]).sort().pop() || '';
      const ce = document.createElement('div'); ce.className = 'cert';
      const en = document.createElement('div'); en.className = 'en'; en.textContent = T.certEn || '';
      const h3 = document.createElement('h3'); h3.textContent = T.certTitle || '수료증';
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = name || T.guest || '';
      const p = document.createElement('p'); p.textContent = (T.certCourse || '') + '\n' + fill(T.certDate || '{date}', { date: last }) + '\n' + (T.certTag || '');
      const bs = document.createElement('div'); bs.className = 'btns2';
      const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'pill primary'; b1.textContent = T.certView || '수료증 보기';
      b1.addEventListener('click', () => certShow(name || T.guest || '', last));
      bs.append(b1);
      ce.append(en, h3, nm, p, bs);
      body.appendChild(ce);
    }
    // 진행 막대
    const pr = document.createElement('div'); pr.className = 'prog'; const pi = document.createElement('i'); pi.style.setProperty('--w', (n ? c / n * 100 : 0) + '%'); pr.appendChild(pi);
    body.appendChild(pr);
    // 도장 6칸
    const grid = document.createElement('div'); grid.className = 'stamps';
    const inLobby = WORLD === LOBBY_WORLD;
    for (const o of ids) {
      const on = !!st[o.sid];
      const cell = document.createElement('div'); cell.className = 'stampc' + (on ? ' on' : ''); cell.style.setProperty('--c', o.s.stampColor || '#2A4D9B');
      const ring = document.createElement('div'); ring.className = 'ring'; ring.textContent = o.s.stampMark || o.s.name.slice(0, 2);
      const nmv = document.createElement('div'); nmv.className = 'nm'; nmv.textContent = o.s.name;
      const dt = document.createElement('div'); dt.className = 'dt'; dt.textContent = on ? String(st[o.sid]).replace(/^\d{4}-/, '').replace('-', '.') : (T.passNot || '');
      cell.append(ring, nmv, dt);
      if (!on && inLobby) {
        const go = document.createElement('button'); go.type = 'button'; go.className = 'pill'; go.textContent = T.passGo || '가기';
        go.addEventListener('click', () => { $('pass').hidden = true; travelTo(o.s); });
        cell.appendChild(go);
      }
      grid.appendChild(cell);
    }
    body.appendChild(grid);
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = all ? (T.passAll || '') : (fill(T.passLeft || '', { left: n - c }) + (inLobby ? '' : ' · ' + (T.passGoRoom || '')));
    body.appendChild(note);
    $('btnPassReset').hidden = c === 0;
  }
  function passSetup() {
    $('passLabel').textContent = T.pass || '연수 수첩';
    $('passTitle').textContent = T.passTitle || T.pass || '';
    $('btnPassClose').textContent = T.close;
    $('btnPassReset').textContent = T.passReset || '';
    $('certClose').textContent = T.close;
    $('certDl').textContent = T.certSave || '';
    $('certHint').textContent = T.certSaveHint || '';
    passBadge();
    $('btnPass').addEventListener('click', () => { if ($('pass').hidden) passOpen(); else $('pass').hidden = true; });
    $('btnPassClose').addEventListener('click', () => { $('pass').hidden = true; });
    $('btnPassReset').addEventListener('click', () => {
      if (!confirm(T.passResetAsk || '?')) return;
      try { localStorage.removeItem(STAMP_KEY); } catch (_) { /* 없어도 됨 */ }
      passBadge(); passRender(); showToast(T.passResetDone || '', 3);
    });
    $('certClose').addEventListener('click', () => { $('certBox').hidden = true; const u = $('certDl').dataset.url; if (u) { try { URL.revokeObjectURL(u); } catch (_) { /* 없어도 됨 */ } $('certDl').dataset.url = ''; } });
  }
  // 수료증 그림(canvas 1400×1000)
  function certCanvas(name, date) {
    const W = 1400, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#FFF9EC'; g.fillRect(0, 0, W, H);
    // 테두리 둘(청·홍)과 모서리 장식
    g.lineWidth = 10; g.strokeStyle = '#2A4D9B'; g.strokeRect(40, 40, W - 80, H - 80);
    g.lineWidth = 3; g.strokeStyle = '#E0483E'; g.strokeRect(62, 62, W - 124, H - 124);
    g.fillStyle = '#C9A96A';
    for (const [x, y] of [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]]) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#A98C66'; g.font = `500 22px ${FONT_B}`; g.fillText((T.certEn || '').toUpperCase().split('').join(' '), W / 2, 130);
    g.fillStyle = '#8C6A4F'; g.font = `normal 92px ${FONT_D}`; g.fillText(T.certTitle || '수료증', W / 2, 215);
    g.fillStyle = '#4A5874'; g.font = `700 30px ${FONT_B}`; g.fillText(T.certCourse || '', W / 2, 292);
    // 이름
    g.fillStyle = '#1E2B4A'; fitFont(g, name, 'normal', 76, FONT_D, 900); g.fillText(name, W / 2, 400);
    g.fillStyle = '#C9A96A'; g.fillRect(W / 2 - 240, 448, 480, 3);
    // 본문
    g.fillStyle = '#2B3650'; g.font = `500 27px ${FONT_B}`;
    String(T.certBody || '').split('\n').forEach((ln, i) => g.fillText(ln, W / 2, 510 + i * 42));
    // 도장 6개
    const ids = PASS_IDS(), st = passLoad(), n = ids.length, gap = 170, x0 = W / 2 - (n - 1) * gap / 2, y = 716;
    ids.forEach((o, i) => {
      const x = x0 + i * gap, col = o.s.stampColor || '#2A4D9B';
      g.save(); g.translate(x, y); g.rotate(-0.2 + (i % 3) * 0.13);
      g.lineWidth = 6; g.strokeStyle = col; g.beginPath(); g.arc(0, 0, 54, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke();
      g.fillStyle = col; g.font = `normal 34px ${FONT_D}`; g.fillText(o.s.stampMark || o.s.name.slice(0, 2), 0, -4);
      g.font = `700 14px ${FONT_B}`; g.fillText(String(st[o.sid] || '').replace(/^\d{4}-/, '').replace('-', '.'), 0, 26);
      g.restore();
      g.fillStyle = '#4A5874'; g.font = `700 19px ${FONT_B}`; g.fillText(o.s.name, x, y + 86);
    });
    // 날짜·발급
    g.fillStyle = '#1E2B4A'; g.font = `700 28px ${FONT_B}`; g.fillText(fill(T.certDate || '{date}', { date }), W / 2, 856);
    g.font = `normal 32px ${FONT_D}`; g.fillText(T.certIssuer || '', W / 2, 900);
    g.fillStyle = '#E0483E'; g.font = `700 16px ${FONT_B}`; g.textAlign = 'right'; g.fillText(T.certTag || '', W - 84, H - 86);
    return c;
  }
  function certShow(name, date) {
    let cv;
    try { cv = certCanvas(name, date); } catch (_) { showToast(T.loadFail, 3); return; }
    const img = $('certImg'), dl = $('certDl');
    img.src = cv.toDataURL('image/png');
    img.alt = T.certTitle || '';
    dl.hidden = true;
    dl.download = T.certFile || 'certificate.png';
    if (cv.toBlob) cv.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b); dl.href = u; dl.dataset.url = u; dl.hidden = false; }, 'image/png');
    $('certBox').hidden = false;
    showToast(fill(T.certHello || '', { name }), 3.5);
  }

  /* ─────────────────────────────────────────────────────────────
     CONTENT — 관리자 페이지(admin/)에서 고친 학교 홈페이지·교실 글·사진첩·TV 영상·링크(2026-10-06).
     relay.json의 api(Cloudflare 저장소)에서 /api/content를 한 번 읽어 lobby.config.js 값 위에 덮는다. 빈 값은 기본 글 그대로.
     서버가 없거나 늦으면(6초) 기본 글로 본다. 시험: ?api=http://127.0.0.1:8791
     ───────────────────────────────────────────────────────────── */
  const CONTENT = { api: '', loaded: false, v: 0 };
  function loadContent() {
    if (!C.contentMap) return;   // 관리자 저장소를 안 쓰는 판
    const go = api => {
      api = String(api || '').replace(/\/+$/, '');
      if (!/^https?:\/\//.test(api)) return;
      CONTENT.api = api;
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const tm = setTimeout(() => { if (ctl) ctl.abort(); }, 6000);
      fetch(api + '/api/content?map=' + encodeURIComponent(C.contentMap), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(r => (r.ok ? r.json() : null)).then(j => { clearTimeout(tm); if (j) applyContent(j); }).catch(() => clearTimeout(tm));
    };
    const q = Q.get('api');
    if (q) { go(q); return; }
    if (!MPC.file) return;
    fetch(MPC.file + '?t=' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
      .then(j => { if (j) go(j.api || (typeof j.health === 'string' ? j.health.replace(/\/health\/?$/, '') : '')); }).catch(() => {});
  }
  // 가상융합 관(map xr): halls.<관>.text = { "경로": "글" } 를 rooms.<관>의 같은 자리에 덮는다(원래 글(문자열·글 배열)이 있는 자리만).
  // media.<교과 id> = 책·TV·사진첩·링크 → rooms.cases.subjects[i]에 넣어 기본 틀 대신 보이게 한다.
  function applyHalls(j) {
    const has = v => typeof v === 'string' && v.trim() !== '';
    const own = (o, k) => o != null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
    const setPath = (root, path, val) => {
      const segs = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      let o = root;
      for (let i = 0; i < segs.length - 1; i++) { if (!own(o, segs[i])) return; o = o[segs[i]]; }
      const k = segs[segs.length - 1];
      if (!own(o, k)) return;
      const cur = o[k];
      if (typeof cur === 'string') o[k] = val;
      else if (Array.isArray(cur) && cur.every(x => typeof x === 'string')) o[k] = val.split('\n').map(x => x.trim()).filter(Boolean);
    };
    const HL = j.halls || {};
    for (const id of Object.keys(HL)) {
      const cfg = C.rooms && C.rooms[id], d = HL[id];
      if (!cfg || !d) continue;
      const tx = d.text && typeof d.text === 'object' ? d.text : {};
      for (const p of Object.keys(tx)) if (has(tx[p])) setPath(cfg, p, tx[p]);
      const md = d.media && typeof d.media === 'object' ? d.media : {};
      if (Array.isArray(cfg.subjects)) for (const s of cfg.subjects) {
        const m = md[s.id];
        if (!m) continue;
        const b = m.book || {}, t = m.tv || {}, a = m.album || {};
        // 실제 글·영상·사진이 오면 틀의 '(예시)' 제목·부제는 쓰지 않는다
        if (has(b.title) || has(b.sub) || has(b.text)) { s.book = Object.assign({}, s.book); if (has(b.title)) s.book.title = b.title; if (has(b.sub)) s.book.sub = b.sub; if (has(b.text)) { s.book.text = b.text; s.book.sample = false; if (!has(b.sub)) s.book.sub = ''; if (!has(b.title)) s.book.title = s.name + ' 지도안'; } }
        if (has(t.title) || has(t.video)) { s.tv = Object.assign({}, s.tv); if (has(t.title)) s.tv.title = t.title; if (has(t.video) && /^https:\/\/www\.youtube\.com\/embed\//.test(t.video)) { s.tv.video = t.video; s.tv.sample = false; if (!has(t.title)) s.tv.title = s.name + ' 수업 영상'; } }
        if (has(a.title) || (Array.isArray(a.photos) && a.photos.length)) {
          s.album = Object.assign({}, s.album);
          if (has(a.title)) s.album.title = a.title; else if (a.photos && a.photos.length) s.album.title = s.name + ' 학생 결과물';
          if (Array.isArray(a.photos) && a.photos.length) { s.album.photos = a.photos.map(p => CONTENT.api + '/api/img/' + encodeURIComponent(p.id)); s.album.captions = a.photos.map(p => String(p.cap || '')); }
        }
        if (Array.isArray(m.links) && m.links.length) { s.book = Object.assign({}, s.book); s.book.links = m.links.filter(l => l && /^https?:\/\//.test(l.url)).slice(0, 8); }
      }
    }
  }
  function applyContent(j) {
    if (j.map === 'xr' || j.halls) {
      applyHalls(j);
      CONTENT.loaded = true; CONTENT.v = j.v || 0;
      if (ROOM && ROOM.invalidate) ROOM.invalidate();
      return;
    }
    const has = v => typeof v === 'string' && v.trim() !== '';
    const S = j.schools || {}, RM = j.rooms || {};
    for (const s of SCHOOLS) { const d = S[s.id]; if (d && has(d.web) && /^https?:\/\//.test(d.web)) s.web = d.web; }
    for (const id of Object.keys(RM)) {
      const cfg = C.rooms && C.rooms[id], d = RM[id];
      if (!cfg || !d) continue;
      if (has(d.boardTitle)) cfg.boardTitle = d.boardTitle;
      if (has(d.boardLine)) cfg.boardLine = d.boardLine;
      if (has(d.welcome)) cfg.welcome = d.welcome;
      const pr = cfg.principal = cfg.principal || {}, dp = d.principal || {};
      if (has(dp.name)) pr.name = dp.name;
      if (Array.isArray(dp.lines) && dp.lines.length) pr.lines = dp.lines.slice(0, 8);
      const it = cfg.items = cfg.items || {};
      const bk = it.book = it.book || {}, db = d.book || {};
      if (has(db.title)) bk.title = db.title;
      if (has(db.sub)) bk.sub = db.sub;
      if (has(db.text)) { bk.text = db.text; bk.sample = false; }
      const al = it.album = it.album || {}, da = d.album || {};
      if (has(da.title)) al.title = da.title;
      if (Array.isArray(da.photos) && da.photos.length) {
        al.photos = da.photos.map(p => CONTENT.api + '/api/img/' + encodeURIComponent(p.id));
        al.captions = da.photos.map(p => String(p.cap || ''));
      }
      const tv = it.tv = it.tv || {}, dt = d.tv || {};
      if (has(dt.title)) tv.title = dt.title;
      if (has(dt.video) && /^https:\/\/www\.youtube\.com\/embed\//.test(dt.video)) { tv.video = dt.video; tv.sample = false; }
      if (Array.isArray(d.links)) cfg.links = d.links.filter(l => l && /^https?:\/\//.test(l.url)).slice(0, 8);
    }
    CONTENT.loaded = true; CONTENT.v = j.v || 0;
    if (ROOM && ROOM.invalidate) ROOM.invalidate();   // 이미 지어 둔 교실은 다음에 들어갈 때 새 글로 다시 짓는다
    if (CUR_SCHOOL && !$('card').hidden) schoolCard(CUR_SCHOOL);
  }

  $('loading').textContent = T.loading;
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.race([
      Promise.all([document.fonts.load("40px 'Jua'", '가나다'), document.fonts.load("700 40px 'Noto Sans KR'", '가나다Île'), document.fonts.load("900 40px 'Noto Sans KR'", '가나다')]).catch(() => {}),
      new Promise(r => setTimeout(r, 3000))])
    : Promise.resolve();
  fontsReady.then(init);
})();
