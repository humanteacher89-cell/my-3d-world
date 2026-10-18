/* 월드 1 「휴먼쌤이 누구인가」 WebXR판 (2026-10-18, 유니티 VR판 v0.1을 웹으로 옮김)
   - 헤드셋(퀘스트 브라우저): 'VR로 들어가기' → 1인칭, 손 빛줄기 + 방아쇠, 왼쪽 막대 걷기·오른쪽 막대 30도 돌기, 왼손 위 미션 목록
   - 화면(PC·휴대폰): 끌어서 둘러보기, 눌러서 고르기, PC는 W·A·S·D
   - 고르면 어두워졌다가 그 자리로 옮겨 간다(저절로 걷지 않음: 멀미 줄이기)
   - 시험: ?autotest=1 (저절로 끝까지), ?jump=ending (엔딩부터)                                             */
(function () {
  'use strict';
  const C = window.W1_CONTENT;
  const Q = new URLSearchParams(location.search);
  const AUTOTEST = Q.has('autotest');
  const JUMP = Q.get('jump');
  const log = (...a) => { console.log('[W1]', ...a); };
  const audio = window.WorldAudio || { unlock() {}, music() {}, sfx() {} };
  const sfx = n => { try { audio.sfx(n); } catch (e) {} };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = a => V3(a[0], 0, a[1]);              // [x, z] → 바닥 위 점
  const hex = h => new THREE.Color(h);
  const UP = V3(0, 1, 0);

  // ───────────── 렌더러·장면 ─────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // 웹판과 같은 색감(노출 0.96)
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdfe9f3, 28, 70);
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 400);
  camera.rotation.order = 'YXZ';
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);
  camera.position.set(0, 1.6, 0);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const world = new THREE.Group();   // '곧 열립니다'에서 통째로 숨긴다
  scene.add(world);

  // 하늘(세 색 그라데이션, 웹판과 같은 식)
  const skyU = { top: { value: hex('#5f87c9') }, hor: { value: hex('#dfe9f3') }, bot: { value: hex('#f4efe6') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.55)) : mix(hor, bot, pow(-h, 0.7)); gl_FragColor = vec4(c, 1.0); }'
  }));
  scene.add(sky);
  function setSky(t, h, b, fog) { skyU.top.value.set(t); skyU.hor.value.set(h); skyU.bot.value.set(b); scene.fog.color.set(fog); }

  const hemi = new THREE.HemisphereLight(0xe6f0ff, 0x8c7a66, 0.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dc, 1.55);
  sun.position.set(18, 26, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // ───────────── 도우미 ─────────────
  const geo = {
    sphere: new THREE.SphereGeometry(0.5, 40, 24),
    lowSphere: new THREE.SphereGeometry(0.5, 20, 12),
    capsule: new THREE.CapsuleGeometry(0.5, 1, 8, 20),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 2, 40),
    box: new THREE.BoxGeometry(1, 1, 1),
    plane: new THREE.PlaneGeometry(1, 1)
  };
  const std = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: hex(c), roughness: r, metalness: 0 }, extra));
  const glowMat = (c, k = 0.8, r = 0.4) => std(c, r, { emissive: hex(c), emissiveIntensity: k });
  function mesh(g, m, parent, pos, scale, rot) {
    const o = new THREE.Mesh(g, m);
    if (pos) o.position.set(pos[0], pos[1], pos[2]);
    if (scale) { if (typeof scale === 'number') o.scale.setScalar(scale); else o.scale.set(scale[0], scale[1], scale[2]); }
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    o.castShadow = true; o.receiveShadow = true;
    (parent || world).add(o);
    return o;
  }
  const torus = (R, r, s1 = 96, s2 = 10) => new THREE.TorusGeometry(R, r, s2, s1).rotateX(Math.PI / 2);
  const ease = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

  // 둥근 빛 그림(조각 빛·알갱이)
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  })();
  function glowSprite(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    return s;
  }

  // ───────────── 시간·기다림(렌더 루프에서 푼다: VR에서도 같은 박자) ─────────────
  let now = 0;
  const waits = [], updaters = [];
  const wait = s => new Promise(r => waits.push({ t: now + s, r }));
  const until = f => new Promise(r => waits.push({ f, r }));
  function tween(dur, fn) { return new Promise(r => { const t0 = now; updaters.push(() => { const k = Math.min(1, (now - t0) / dur); fn(k); if (k >= 1) { r(); return false; } return true; }); }); }
  function every(fn) { updaters.push(() => fn() !== false); }

  // ───────────── 글 패널(캔버스 그림 → 판) ─────────────
  const FONT = '"Noto Sans KR","Noto Sans CJK KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif';
  const RES = 1.6;          // 캔버스 1px당 그림 배율(선명도)
  const panels = [];
  const INK = '#29263a', DIM = '#7a748a', PAPER = 'rgba(255,251,244,0.97)';
  class Panel {
    constructor(name, width, bg, scale = 0.001) {
      this.name = name; this.w = width; this.bg = bg; this.pad = 44; this.scale = scale;
      this.canvas = document.createElement('canvas'); this.ctx = this.canvas.getContext('2d');
      this.mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(geo.plane, this.mat);
      this.mesh.renderOrder = 10;
      this.mesh.userData.panel = this;
      this.mesh.visible = false;
      this.hover = -1; this.alpha = 0; this.clear();
      panels.push(this);
    }
    clear() { this.items = []; this.buttons = []; this.y = this.pad; this.hover = -1; return this; }
    font(size, bold) { return (bold ? '700 ' : '400 ') + size + 'px ' + FONT; }
    wrap(s, size, bold, maxW) {
      const g = this.ctx; g.font = this.font(size, bold);
      const out = [];
      for (const para of String(s).split('\n')) {
        let line = '';
        for (const word of para.split(/(\s+)/)) {
          if (!word) continue;
          const test = line + word;
          if (g.measureText(test).width <= maxW || !line.trim()) {
            if (g.measureText(test).width <= maxW) { line = test; continue; }
            // 한 낱말이 너무 길면 글자 단위로 자른다
            for (const ch of word) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
            continue;
          }
          out.push(line.trimEnd()); line = word.trimStart();
        }
        out.push(line);
      }
      return out;
    }
    text(s, size, color, o = {}) {
      const maxW = this.w - this.pad * 2;
      const lines = this.wrap(s, size, o.bold, maxW);
      const lh = Math.round(size * 1.38);
      const it = { type: 'text', s: String(s), lines, size, color, bold: o.bold, align: o.align || 'left', y: this.y, lh, shown: Infinity };
      this.items.push(it);
      this.y += lines.length * lh + (o.gap != null ? o.gap : 18);
      return it;
    }
    row(segs, gap = 14) {   // 한 줄에 여러 색 글자 [{t,size,color,bold}]
      const size = Math.max(...segs.map(s => s.size));
      this.items.push({ type: 'row', segs, y: this.y, size, align: 'left' });
      this.y += Math.round(size * 1.38) + gap;
    }
    bar(color, h = 8, gap = 20) { this.items.push({ type: 'bar', color, y: this.y, h }); this.y += h + gap; }
    space(h) { this.y += h; }
    button(label, sub, color, onClick, h = 100, gap = 16) {
      const b = { label, sub, color, onClick, x: this.pad, y: this.y, w: this.w - this.pad * 2, h };
      this.buttons.push(b); this.y += h + gap; return b;
    }
    finish(minH = 0) {
      this.h = Math.max(minH, this.y - 16 + this.pad * 0.6);
      this.canvas.width = Math.round(this.w * RES); this.canvas.height = Math.round(this.h * RES);
      if (this.tex) this.tex.dispose();
      this.tex = new THREE.CanvasTexture(this.canvas); this.tex.encoding = THREE.sRGBEncoding; this.tex.anisotropy = 4;
      this.mat.map = this.tex; this.mat.needsUpdate = true;
      this.mesh.scale.set(this.w * this.scale, this.h * this.scale, 1);
      this.draw();
      return this;
    }
    draw() {
      const g = this.ctx; g.setTransform(RES, 0, 0, RES, 0, 0);
      g.clearRect(0, 0, this.w, this.h);
      if (this.bg) { g.fillStyle = this.bg; rr(g, 0, 0, this.w, this.h, 26); g.fill(); }
      for (const it of this.items) {
        if (it.type === 'bar') { g.fillStyle = it.color; rr(g, this.pad, it.y, this.w - this.pad * 2, it.h, it.h / 2); g.fill(); continue; }
        if (it.type === 'row') {
          let x = this.pad; g.textBaseline = 'top';
          for (const s of it.segs) { g.font = this.font(s.size, s.bold); g.fillStyle = s.color; g.fillText(s.t, x, it.y + (it.size - s.size) * 0.9); x += g.measureText(s.t).width + (s.gap || 10); }
          continue;
        }
        g.font = this.font(it.size, it.bold); g.fillStyle = it.color; g.textBaseline = 'top';
        let left = it.shown;
        it.lines.forEach((ln, i) => {
          if (left <= 0) return;
          const part = ln.length > left ? ln.slice(0, left) : ln; left -= ln.length + 1;
          const tx = it.align === 'center' ? (this.w - g.measureText(ln).width) / 2 : this.pad;
          g.fillText(part, tx, it.y + i * it.lh);
        });
      }
      this.buttons.forEach((b, i) => {
        const hv = i === this.hover;
        g.fillStyle = hv ? lighten(b.color, 0.28) : b.color; rr(g, b.x, b.y, b.w, b.h, 22); g.fill();
        if (hv) { g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 5; rr(g, b.x + 2.5, b.y + 2.5, b.w - 5, b.h - 5, 20); g.stroke(); }
        const dark = isDark(b.color); g.fillStyle = dark ? '#ffffff' : INK; g.textBaseline = 'middle';
        g.font = this.font(b.sub ? 36 : 38, true);
        const cy = b.sub ? b.y + b.h * 0.38 : b.y + b.h / 2;
        g.fillText(b.label, b.x + (b.w - g.measureText(b.label).width) / 2, cy);
        if (b.sub) { g.font = this.font(26, false); g.globalAlpha = 0.78; g.fillText(b.sub, b.x + (b.w - g.measureText(b.sub).width) / 2, b.y + b.h * 0.72); g.globalAlpha = 1; }
      });
      if (this.tex) this.tex.needsUpdate = true;
    }
    hitButton(uv) {
      const x = uv.x * this.w, y = (1 - uv.y) * this.h;
      return this.buttons.findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    }
    setHover(i) { if (i !== this.hover) { this.hover = i; this.draw(); if (i >= 0) sfx('click'); } }
    show(on) {
      this.target = on ? 1 : 0;
      if (on) { this.mesh.visible = true; }
    }
    tick(dt) {
      if (this.target == null) return;
      this.alpha += (this.target - this.alpha) * Math.min(1, dt * 12);
      if (Math.abs(this.target - this.alpha) < 0.01) this.alpha = this.target;
      this.mat.opacity = this.alpha;
      const s = 0.94 + 0.06 * this.alpha;
      this.mesh.scale.set(this.w * this.scale * s, this.h * this.scale * s, 1);
      if (this.alpha === 0 && this.target === 0) this.mesh.visible = false;
    }
    get active() { return this.mesh.visible && this.alpha > 0.6 && this.target === 1; }
  }
  function rr(g, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function lighten(c, k) { const col = new THREE.Color(c); col.lerp(new THREE.Color('#ffffff'), k); return '#' + col.getHexString(); }
  function isDark(c) { const col = new THREE.Color(c); return col.r * 0.3 + col.g * 0.59 + col.b * 0.11 < 0.55; }

  // ───────────── 무대 ─────────────
  function buildStage() {
    mesh(new THREE.CylinderGeometry(9, 9.35, 0.9, 96), std('#e2d7c3', 0.92), world, [0, -0.45, 0]).castShadow = false;
    mesh(new THREE.CylinderGeometry(9.35, 9.0, 0.25, 96), std('#d3c6ae', 0.95), world, [0, -1.02, 0]).castShadow = false;
    mesh(torus(8.92, 0.035, 160, 8), glowMat('#ffc46b', 0.9), world, [0, 0.012, 0]).castShadow = false;
    const deco = new THREE.MeshBasicMaterial({ color: hex('#d9cdb9'), transparent: true, opacity: 0.55 });
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, s = mesh(geo.box, deco, world, [Math.sin(a) * 4.6, 0.006, Math.cos(a) * 4.6], [0.03, 0.002, 7.6], [0, a, 0]);
      s.castShadow = s.receiveShadow = false;
    }
    const ring = mesh(new THREE.RingGeometry(2.4, 2.46, 96), deco, world, [0, 0.006, 0], null, [-Math.PI / 2, 0, 0]);
    ring.castShadow = false;
    // 무대 아래·멀리 구름
    const cloud = new THREE.MeshLambertMaterial({ color: hex('#f3f1ee') });
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const R = (a, b) => a + rnd() * (b - a);
    for (let i = 0; i < 7; i++) {
      const a = R(0, 6.28), r = R(0, 4);
      const c = mesh(geo.lowSphere, cloud, world, [Math.cos(a) * r, R(-2.7, -1.9), Math.sin(a) * r], [R(9, 15), R(2.6, 3.8), R(9, 15)]); c.castShadow = false;
    }
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * 6.28 + R(-0.2, 0.2), r = R(30, 55), cy = R(-10, -4);
      const side = V3(-Math.sin(a), 0, Math.cos(a)), size = R(7, 12), parts = 3 + (rnd() < 0.5 ? 1 : 0);
      for (let k = 0; k < parts; k++) {
        const off = (k - (parts - 1) / 2) * size * 0.6, s = size * R(0.7, 1.15) * (k === (parts >> 1) ? 1.25 : 1);
        const c = mesh(geo.lowSphere, cloud, world, [Math.cos(a) * r + side.x * off, cy + R(0, s * 0.25), Math.sin(a) * r + side.z * off], [s, s * R(0.55, 0.75), s * R(0.8, 1.1)]);
        c.castShadow = c.receiveShadow = false;
      }
    }
    // 떠다니는 빛 알갱이
    const n = 70, pos = new Float32Array(n * 3), base = [];
    for (let i = 0; i < n; i++) { const a = R(0, 6.28), r = R(3, 16); base.push([Math.cos(a) * r, R(0.4, 6.4), Math.sin(a) * r, R(0, 6.28)]); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex, color: hex('#fff2d6'), size: 0.14, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    world.add(motes);
    every(() => {
      for (let i = 0; i < n; i++) { const b = base[i]; pos[i * 3] = b[0] + Math.sin(now * 0.3 + b[3]) * 0.6; pos[i * 3 + 1] = b[1] + Math.sin(now * 0.5 + b[3] * 2) * 0.25; pos[i * 3 + 2] = b[2] + Math.cos(now * 0.33 + b[3]) * 0.6; }
      pg.attributes.position.needsUpdate = true;
    });
  }

  // 조각 자리 셋
  const st = [];
  function buildStation(i) {
    const m = C.missions[i], s = {};
    const g = s.root = new THREE.Group(); g.position.copy(P(m.pad)); world.add(g);
    mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.14, 64), std('#e9dfcc', 0.85), g, [0, 0.07, 0]);
    s.ringMat = glowMat(m.color, 1.1);
    mesh(torus(1.1, 0.03, 80, 8), s.ringMat, g, [0, 0.15, 0]).castShadow = false;
    mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.95, 32), std('#d9cdb8', 0.8), g, [0, 0.62, 0]);
    mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.08, 32), std('#cbbda6', 0.8), g, [0, 1.12, 0]);
    s.holder = new THREE.Group(); s.holder.position.set(0, 1.65, 0); g.add(s.holder);
    s.orbMat = glowMat(m.color, 1.2, 0.25);
    s.orb = mesh(geo.sphere, s.orbMat, s.holder, [0, 0, 0], 0.52); s.orb.castShadow = false;
    s.glow = glowSprite(m.color, 1.7, 0.6); s.holder.add(s.glow);
    s.light = new THREE.PointLight(hex(m.color), 0.9, 4, 2); s.light.position.set(0, 1.8, 0); g.add(s.light);
    s.beacon = mesh(new THREE.CylinderGeometry(0.09, 0.09, 10, 24, 1, true), new THREE.MeshBasicMaterial({ color: hex(m.color), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), g, [0, 5.2, 0]);
    s.beacon.castShadow = false; s.beacon.visible = false;
    every(() => { s.holder.position.y = 1.65 + Math.sin(now * 1.4 + i) * 0.08; s.orb.rotation.y += 0.01; s.beacon.material.opacity = 0.16 + 0.08 * Math.sin(now * 3); });
    // 표지판: 무대 가운데를 본다
    const sg = new THREE.Group(); sg.position.copy(P(m.sign)); sg.rotation.y = Math.atan2(-m.sign[0], -m.sign[1]); world.add(sg);
    const frame = std('#8a6a4a', 0.7);
    mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.35, 12), frame, sg, [0, 0.67, -0.02]);
    mesh(geo.box, frame, sg, [0, 1.5, -0.02], [1.31, 0.86, 0.05]);
    const board = new Panel('sign', 1250, '#fffaf0'); board.pad = 70;
    board.space(70);
    board.text(m.label, 150, '#2a2430', { bold: true, align: 'center', gap: 6 });
    board.text(m.title, 54, '#5a5262', { bold: true, align: 'center', gap: 12 });
    board.text(m.sub, 42, '#8a8290', { align: 'center' });
    board.finish(800);
    // 왼쪽 세로 색 띠
    const g2 = board.ctx; g2.setTransform(RES, 0, 0, RES, 0, 0); g2.fillStyle = m.color; rr(g2, 34, 40, 26, 720, 13); g2.fill(); board.tex.needsUpdate = true;
    board.static = true;
    board.mesh.position.set(0, 1.5, 0.006); board.mesh.visible = true; board.alpha = 1; board.mat.opacity = 1; board.target = null;
    board.mesh.renderOrder = 0; board.mat.transparent = false;
    sg.add(board.mesh);
    st.push(s);
  }

  // 문
  const door = {};
  function buildDoor() {
    const g = door.root = new THREE.Group(); g.position.copy(P(C.pos.door)); world.add(g);
    const stone = std('#efe7da', 0.7);
    for (const sx of [-1, 1]) { mesh(geo.box, stone, g, [sx * 1.55, 1.9, 0], [0.55, 3.8, 0.55]); mesh(geo.box, stone, g, [sx * 1.55, 0.125, 0], [0.8, 0.25, 0.8]); }
    mesh(geo.box, stone, g, [0, 4.05, 0], [4.0, 0.55, 0.65]);
    mesh(geo.box, glowMat('#ffc46b', 0.8), g, [0, 3.76, 0], [4.0, 0.06, 0.68]);
    const leaf = std('#f7f2ea', 0.6), knob = std('#ffc46b', 0.35, { metalness: 0.5 });
    door.L = new THREE.Group(); door.L.position.set(-1.28, 0, 0); g.add(door.L);
    mesh(geo.box, leaf, door.L, [0.64, 1.75, 0], [1.28, 3.5, 0.12]); mesh(geo.sphere, knob, door.L, [1.12, 1.05, 0.09], 0.1);
    door.R = new THREE.Group(); door.R.position.set(1.28, 0, 0); g.add(door.R);
    mesh(geo.box, leaf, door.R, [-0.64, 1.75, 0], [1.28, 3.5, 0.12]); mesh(geo.sphere, knob, door.R, [-1.12, 1.05, 0.09], 0.1);
    door.glow = mesh(geo.plane, new THREE.MeshBasicMaterial({ color: hex('#fff4dc'), transparent: true, opacity: 0, depthWrite: false }), g, [0, 1.78, -0.1], [2.6, 3.55, 1]);
    door.glow.castShadow = false;
    door.light = new THREE.PointLight(0xffe7bf, 0, 9, 2); door.light.position.set(0, 2, 0.8); g.add(door.light);
    door.set = k => { door.k = k; door.L.rotation.y = 1.75 * k; door.R.rotation.y = -1.75 * k; door.glow.material.opacity = 0.95 * k; door.light.intensity = 2.2 * k; };
    door.set(0);
  }

  // ───────────── 안내자(웹판 만화풍 캐릭터를 기본 도형으로) ─────────────
  const SKIN = ['#f6d3b5', '#eab690', '#c88b61', '#8a5638'], HAIR = ['#2a1c15', '#6e3f22', '#d9a65b', '#e8e2da', '#e38aa6', '#3d8c88'];
  const COAT = ['#3b6db3', '#d5504c', '#4b9a5c', '#e3a432', '#8b6bc2', '#efeae0'], SCARF = ['#ff8f45', '#ffd35c', '#6fd0c8', '#ff7fa5', '#ffffff', '#34343f'];
  let guide;
  function buildGuide() {
    const L = C.guide.look, root = new THREE.Group(); root.position.copy(P(C.pos.guide)); world.add(root);
    const body = new THREE.Group(); body.scale.setScalar(0.9); root.add(body);
    const skin = std(SKIN[L[0]], 0.62), hair = std(HAIR[L[1]], 0.45), coatC = COAT[L[2]], coat = std(coatC, 0.8), scarf = std(SCARF[L[3]], 0.9);
    const pants = std('#2b2f3e', 0.85), shoe = std('#f4f1ea', 0.55), sole = std('#3a3434'), white = std('#ffffff', 0.3), iris = std('#2a2340', 0.3), mouthM = std('#8a3a3a');
    const blush = new THREE.MeshBasicMaterial({ color: hex('#ff8a8a'), transparent: true, opacity: 0.35, depthWrite: false });
    for (const sx of [-1, 1]) {
      mesh(geo.capsule, pants, body, [sx * .092, .65, 0], [.13, .2, .13]);
      mesh(geo.capsule, pants, body, [sx * .092, .28, 0], [.1, .19, .1]);
      mesh(geo.sphere, shoe, body, [sx * .092, .055, .035], [.13, .1, .24]);
      mesh(geo.box, sole, body, [sx * .092, .011, .035], [.115, .022, .225]);
    }
    mesh(geo.sphere, pants, body, [0, .85, 0], [.3, .2, .24]);
    const chest = new THREE.Group(); chest.position.set(0, .84, 0); body.add(chest);
    mesh(geo.capsule, coat, chest, [0, .27, 0], [.31, .28, .245]);
    mesh(new THREE.TorusGeometry(.085, .034, 8, 32).rotateX(Math.PI / 2), scarf, chest, [0, .52, 0]);
    mesh(geo.box, scarf, chest, [.04, .4, -.12], [.075, .15, .022], [-.14, 0, .1]);
    mesh(geo.box, scarf, chest, [-.03, .38, -.125], [.075, .13, .022], [-.14, 0, -.07]);
    const arm = sx => {
      const sh = new THREE.Group(); sh.position.set(sx * .172, .43, 0); sh.rotation.z = sx * .12; chest.add(sh);
      mesh(geo.sphere, coat, sh, [0, 0, 0], .1); mesh(geo.capsule, coat, sh, [0, -.11, 0], [.1, .13, .1]);
      const fore = new THREE.Group(); fore.position.set(0, -.22, 0); sh.add(fore);
      mesh(geo.capsule, coat, fore, [0, -.095, 0], [.084, .11, .084]);
      mesh(new THREE.TorusGeometry(.04, .014, 6, 20).rotateX(Math.PI / 2), scarf, fore, [0, -.18, 0]);
      mesh(geo.sphere, skin, fore, [0, -.235, .005], [.072, .096, .054]);
      return { sh, fore };
    };
    const aL = arm(-1), aR = arm(1);
    mesh(geo.cyl, skin, chest, [0, .55, 0], [.09, .04, .09]);
    const head = new THREE.Group(); head.position.set(0, .57, 0); chest.add(head);
    mesh(geo.sphere, skin, head, [0, .15, 0], [.34, .345, .33]);
    const eyes = [];
    for (const sx of [-1, 1]) {
      mesh(geo.sphere, skin, head, [sx * .166, .16, 0], [.056, .08, .048]);
      const e = new THREE.Group(); e.position.set(sx * .058, .162, .146); e.rotation.y = sx * .35; head.add(e);
      mesh(geo.sphere, white, e, [0, 0, 0], [.06, .074, .028]); mesh(geo.sphere, iris, e, [0, -.004, .009], [.044, .056, .02]); mesh(geo.sphere, white, e, [.009, .012, .018], [.012, .012, .006]);
      eyes.push(e);
      mesh(geo.box, hair, head, [sx * .06, .215, .15], [.05, .011, .012], [0, 0, sx * -.14]);
      const b = mesh(geo.cyl, blush, head, [sx * .094, .11, .135], [.05, .002, .03], [1.4, sx * .44, 0]); b.castShadow = false;
    }
    mesh(geo.sphere, skin, head, [0, .13, .168], .026);
    const mouth = mesh(geo.sphere, mouthM, head, [0, .093, .158], [.045, .012, .012]);
    mesh(geo.sphere, hair, head, [0, .235, -.015], [.37, .33, .36]);
    if (L[4] === 1) { mesh(geo.sphere, hair, head, [0, .12, -.07], [.4, .36, .3]); mesh(geo.sphere, hair, head, [-.165, .07, .01], [.08, .22, .12]); mesh(geo.sphere, hair, head, [.165, .07, .01], [.08, .22, .12]); }
    guide = { root, chest, head, aL, aR, eyes, mouth, talking: false, coatC, blinkAt: 2, blinkT: 0, look: 0, lookT: 0, nextLook: 0 };
    guide.tag = nameTag(root, C.guide.name, C.guide.role, coatC, 1.98);
    // 처음 만나기 전 '!' 표시
    const mk = new Panel('mark', 130, '#ffc766'); mk.pad = 10; mk.text('!', 90, '#3a2a10', { bold: true, align: 'center', gap: 0 }); mk.finish(130);
    mk.mesh.position.set(0, 2.42, 0); root.add(mk.mesh); mk.show(true); mk.alpha = 1; guide.mark = mk;
    root.rotation.y = 0;
  }
  function nameTag(parent, name, role, dot, y) {
    const p = new Panel('tag', 420, 'rgba(255,255,255,0.92)'); p.pad = 18;
    p.row([{ t: '●', size: 40, color: dot }, { t: name, size: 40, color: INK, bold: true }], 2);
    p.text(role, 26, DIM, { align: 'center', gap: 0 });
    p.finish(); p.mesh.position.set(0, y, 0); parent.add(p.mesh); p.show(true); p.alpha = 1;
    // 이름 줄 가운데 맞춤
    const g = p.ctx; g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, p.w, p.h); g.fillStyle = p.bg; rr(g, 0, 0, p.w, p.h, 26); g.fill();
    g.textBaseline = 'top'; g.font = p.font(40, true); const nw = g.measureText(name).width; g.font = p.font(40, false); const dw = g.measureText('● ').width;
    let x = (p.w - nw - dw) / 2; g.fillStyle = dot; g.fillText('● ', x, 18); g.font = p.font(40, true); g.fillStyle = INK; g.fillText(name, x + dw, 18);
    g.font = p.font(26, false); g.fillStyle = DIM; g.fillText(role, (p.w - g.measureText(role).width) / 2, 18 + 58); p.tex.needsUpdate = true;
    p.static = true;
    return p;
  }
  function updateGuide(dt) {
    if (!guide) return;
    const g = guide, t = now, head = headPos();
    const d = head.clone().sub(g.root.position); d.y = 0;
    if (d.length() < 6) { const want = Math.atan2(d.x, d.z); g.root.rotation.y += angDiff(g.root.rotation.y, want) * (1 - Math.exp(-3 * dt)); }
    g.chest.scale.y = 1 + Math.sin(t * 1.7) * 0.012;
    if (t > g.nextLook) { g.nextLook = t + 2 + Math.random() * 4; g.lookT = g.talking ? 0 : (Math.random() - 0.5) * 0.6; }
    g.look += (g.lookT - g.look) * Math.min(1, dt * 2);
    const hp = g.head.getWorldPosition(V3());
    const pitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(head.y - hp.y, Math.max(0.5, d.length()))));
    g.head.rotation.set(pitch + (g.talking ? Math.sin(t * 5) * 0.05 : 0), g.look, 0);
    if (t > g.blinkAt) { g.blinkT = 0.13; g.blinkAt = t + 1.8 + Math.random() * 3.5; }
    g.blinkT -= dt; const ey = g.blinkT > 0 ? 0.12 : 1; g.eyes.forEach(e => e.scale.y = ey);
    g.mouth.scale.y = g.talking ? 0.012 * (1 + Math.abs(Math.sin(t * 13)) * 1.5) : 0.012;
    const k = g.talking ? 1 : 0;
    g.aR.sh.rotation.x = -k * (0.2 + Math.sin(t * 1.3) * 0.17); g.aL.sh.rotation.x = -k * (0.1 + Math.sin(t) * 0.1);
    g.aR.fore.rotation.x = -k * (0.44 + Math.sin(t * 1.3) * 0.26); g.aL.fore.rotation.x = -k * 0.26;
    if (g.mark) g.mark.mesh.position.y = 2.42 + Math.sin(t * 2.4) * 0.06;
  }
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  // ───────────── 휴먼쌤(실물 아바타 GLB) ─────────────
  let human = null;
  function measureBounds(model) {   // 웹판 engine.js와 같은 방식(뼈대 변형까지 넣어 잰다)
    model.updateMatrixWorld(true); const v = V3(), min = V3(Infinity, Infinity, Infinity), max = V3(-Infinity, -Infinity, -Infinity);
    model.traverse(o => { if (!o.isSkinnedMesh) return; o.skeleton.update(); const pos = o.geometry.attributes.position; const bt = o.boneTransform ? 'boneTransform' : 'applyBoneTransform';
      for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i); o[bt](i, v); v.applyMatrix4(o.matrixWorld); min.min(v); max.max(v); } });
    return (max.y > min.y && Number.isFinite(max.y - min.y)) ? { min, max, height: max.y - min.y } : null;
  }
  function loadHuman() {
    const H = C.human;
    return new Promise(res => {
      new THREE.GLTFLoader().load(H.url, gltf => {
        const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
        const model = gltf.scene;
        model.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = false; if (x.isSkinnedMesh) x.frustumCulled = false;
          (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => { m.metalness = 0; m.metalnessMap = null; if (m.map) { m.emissive = hex('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.3; } m.needsUpdate = true; }); } });
        const mixer = new THREE.AnimationMixer(model);
        const clip = k => gltf.animations.find(a => a.name.toLowerCase().includes(k));
        const actions = {};
        const idle = clip(H.idle) || gltf.animations[0]; if (idle) { actions.idle = mixer.clipAction(idle); actions.idle.play(); }
        let wv = clip(H.wave);
        if (wv && H.waveEnd < wv.duration) { wv = wv.clone(); wv.tracks.forEach(t => t.trim(0, H.waveEnd)); wv.duration = H.waveEnd; }
        if (wv) { actions.wave = mixer.clipAction(wv); actions.wave.setLoop(THREE.LoopOnce, 1); actions.wave.clampWhenFinished = true; }
        const wk = clip(H.walk); if (wk) actions.walk = mixer.clipAction(wk);
        mixer.update(0.01);
        const bb = measureBounds(model), h = bb ? bb.height : 1.75;
        inner.scale.setScalar(H.height / h);
        if (bb) model.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
        inner.add(model);
        new THREE.TextureLoader().load(H.tex, tex => { tex.encoding = THREE.sRGBEncoding; tex.flipY = false; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          model.traverse(x => { if (x.isMesh) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => { m.map = tex; if (m.emissiveMap) m.emissiveMap = tex; m.needsUpdate = true; }); }); });
        root.position.copy(P(C.pos.human)); root.visible = false; world.add(root);
        human = { root, mixer, actions, cur: actions.idle, talking: false, look: true };
        mixer.addEventListener('finished', e => { if (e.action === actions.wave) fade('idle', 0.4); });
        human.tag = nameTag(root, C.human.name, C.human.role, '#3b6db3', 1.92); human.tag.mesh.visible = false;
        log('human loaded, raw height', h.toFixed(3), 'clips', gltf.animations.length);
        res(human);
      }, undefined, err => { log('human load failed', err); res(null); });
    });
  }
  function fade(name, dur) {
    if (!human || !human.actions[name]) return;
    const a = human.actions[name];
    a.reset(); a.play();
    if (human.cur && human.cur !== a) human.cur.crossFadeTo(a, dur, false);
    human.cur = a;
  }
  function updateHuman(dt) {
    if (!human || !human.root.visible) return;
    human.mixer.update(dt);
    if (human.look) { const d = headPos().sub(human.root.position); d.y = 0; if (d.lengthSq() > 0.01) human.root.rotation.y += angDiff(human.root.rotation.y, Math.atan2(d.x, d.z)) * (1 - Math.exp(-3 * dt)); }
  }

  // ───────────── 플레이어(머리·손·옮겨 가기) ─────────────
  const _v = V3();
  function headPos() { return camera.getWorldPosition(V3()); }
  function headDir() { const d = camera.getWorldDirection(V3()); d.y = 0; if (d.lengthSq() < 1e-4) d.set(0, 0, -1); return d.normalize(); }
  function feetPos() { const h = headPos(); h.y = rig.position.y; return h; }
  const inXR = () => renderer.xr.isPresenting;
  let flatYaw = 0, flatPitch = 0;
  function place(feet, lookAt) {
    if (!inXR()) {
      rig.rotation.y = 0; rig.position.set(feet.x, 0, feet.z);
      flatYaw = Math.atan2(-(lookAt.x - feet.x), -(lookAt.z - feet.z)); flatPitch = 0;
      camera.rotation.set(flatPitch, flatYaw, 0);
      rig.updateMatrixWorld(true); return;
    }
    rig.updateMatrixWorld(true);
    const hp = headPos(), hd = headDir();
    const want = Math.atan2(lookAt.x - feet.x, lookAt.z - feet.z), cur = Math.atan2(hd.x, hd.z);
    const delta = angDiff(cur, want);
    rig.position.sub(hp).applyAxisAngle(UP, delta).add(hp); rig.rotation.y += delta;
    rig.updateMatrixWorld(true);
    const h2 = headPos(); rig.position.x += feet.x - h2.x; rig.position.z += feet.z - h2.z; rig.position.y = 0;
    rig.updateMatrixWorld(true);
  }
  // 눈앞 막(옮겨 갈 때 어둡게)
  const fadeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0a0810, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false }));
  fadeMesh.renderOrder = 999; camera.add(fadeMesh);
  const setFade = a => { fadeMesh.material.opacity = a; fadeMesh.visible = a > 0.001; };
  setFade(0);
  async function moveTo(feet, lookAt, dur = 0.22) {
    await tween(dur, k => setFade(k)); place(feet, lookAt); await wait(0.03); await tween(dur * 1.4, k => setFade(1 - k));
  }
  const fadeTo = (a, dur) => { const a0 = fadeMesh.material.opacity; return tween(dur, k => setFade(a0 + (a - a0) * k)); };

  // 터널링(편안함 비네트): 움직이는 동안만 시야 가장자리를 동그랗게 어둡게 좁힌다(멀미 줄이기, 10-18 휴먼쌤 요청)
  // 걷기 = 막대를 민 만큼, 돌기 = 잠깐, 문으로 미끄러질 때 = 내내. 헤드셋에서만.
  const vigU = { strength: { value: 0 }, inner: { value: 0.42 }, outer: { value: 0.85 } };
  const vignette = new THREE.Mesh(new THREE.SphereGeometry(0.28, 48, 24), new THREE.ShaderMaterial({
    uniforms: vigU, side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float strength; uniform float inner; uniform float outer; varying vec3 vP;' +
      'void main(){ vec3 d = normalize(vP); float a = acos(clamp(-d.z, -1.0, 1.0));' +
      ' float k = smoothstep(inner, outer, a) * strength; gl_FragColor = vec4(0.015, 0.012, 0.03, k * 0.95); }'
  }));
  vignette.renderOrder = 998; vignette.visible = false; camera.add(vignette);
  const vig = { move: 0, pulse: 0, glide: 0, cur: 0 };
  function updateVignette(dt) {
    vig.pulse = Math.max(0, vig.pulse - dt * 2.8);
    const test = Q.has('vigtest') ? 1 : 0;   // 시험용: 화면 모드에서 강제로 켜 본다
    const target = inXR() || test ? Math.max(vig.move, vig.pulse, vig.glide, test) : 0;
    vig.cur += (target - vig.cur) * Math.min(1, dt * (target > vig.cur ? 10 : 5));
    vigU.strength.value = vig.cur;
    vignette.visible = vig.cur > 0.01;
  }

  // 컨트롤러
  const hands = [];
  const lineMatOff = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const lineMatOn = new THREE.LineBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 2; i++) {
    const ray = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i);
    rig.add(ray); rig.add(grip);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), lineMatOff);
    line.scale.z = 0.35; ray.add(line);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.visible = false; ray.add(dot);
    const h = { ray, grip, line, dot, src: null, hand: '', hit: null, turnHeld: false };
    ray.addEventListener('connected', e => {
      h.src = e.data; h.hand = e.data.handedness;
      grip.clear();
      const body = std('#2d2b38', 0.5);
      const gm = mesh(geo.sphere, body, grip, [0, -0.01, 0.02], [0.042, 0.05, 0.12], [0.35, 0, 0]); gm.castShadow = false;
      const rc = h.hand === 'left' ? '#5cc3b4' : '#f2a94f';
      mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 32), glowMat(rc, 0.6), grip, [0, 0.02, -0.035], null, [0.96, 0, 0]).castShadow = false;
      if (h.hand === 'left' && checklist) attachChecklist();
    });
    ray.addEventListener('disconnected', () => { h.src = null; });
    ray.addEventListener('selectstart', () => onSelect(h));
    hands.push(h);
  }
  const raycaster = new THREE.Raycaster();
  function pickPanel(origin, dir) {
    raycaster.set(origin, dir); raycaster.far = 15;
    const list = panels.filter(p => p.active && !p.static && p.buttons.length).map(p => p.mesh);
    const hit = raycaster.intersectObjects(list, false)[0];
    if (!hit) return null;
    const p = hit.object.userData.panel; const bi = p.hitButton(hit.uv);
    return { p, bi, dist: hit.distance };
  }
  let flatHover = null;
  function updatePointers() {
    let anyHover = new Set();
    if (inXR()) {
      for (const h of hands) {
        if (!h.src) { h.line.visible = false; continue; }
        h.line.visible = true;
        const o = h.ray.getWorldPosition(V3()), q = h.ray.getWorldQuaternion(new THREE.Quaternion()), d = V3(0, 0, -1).applyQuaternion(q);
        const r = pickPanel(o, d);
        h.hit = r && r.bi >= 0 ? r : null;
        h.line.material = h.hit ? lineMatOn : lineMatOff;
        h.line.scale.z = r ? r.dist : 0.35;
        h.dot.visible = !!h.hit; if (h.hit) h.dot.position.set(0, 0, -r.dist);
        if (h.hit) { anyHover.add(h.hit.p); if (h.hit.p.hover !== h.hit.bi) { h.hit.p.setHover(h.hit.bi); haptic(h, 0.15, 20); } }
      }
    } else if (flatHover) { anyHover.add(flatHover.p); flatHover.p.setHover(flatHover.bi); }
    for (const p of panels) if (!anyHover.has(p) && p.hover >= 0 && !p.static) p.setHover(-1);
  }
  function haptic(h, a, ms) { try { const act = h.src && h.src.gamepad && h.src.gamepad.hapticActuators && h.src.gamepad.hapticActuators[0]; if (act) act.pulse(a, ms); } catch (e) {} }
  let emptyAction = null;
  function onSelect(h) {
    audio.unlock();
    if (h && h.hit) { haptic(h, 0.5, 40); clickButton(h.hit.p, h.hit.bi); return; }
    if (emptyAction) emptyAction();
  }
  function clickButton(p, bi) { const b = p.buttons[bi]; if (!b || !p.active) return; sfx('select'); if (b.onClick) b.onClick(bi); }

  // 막대: 왼쪽 걷기, 오른쪽 30도 돌기
  let canMove = true;
  function updateSticks(dt) {
    vig.move = 0;
    if (!inXR() || !canMove) return;
    for (const h of hands) {
      const gp = h.src && h.src.gamepad; if (!gp || gp.axes.length < 4) continue;
      const x = gp.axes[2], y = gp.axes[3];
      if (h.hand === 'left') {
        const m2 = x * x + y * y;
        if (m2 > 0.04) { const f = headDir(), r = V3().crossVectors(f, UP); rig.position.addScaledVector(f, -y * 1.4 * dt).addScaledVector(r, x * 1.4 * dt); clampStage(); vig.move = Math.min(1, Math.sqrt(m2) * 1.1); }
      } else if (h.hand === 'right') {
        if (!h.turnHeld && Math.abs(x) > 0.7) { h.turnHeld = true; vig.pulse = 1; const hp = headPos(), a = -Math.sign(x) * Math.PI / 6; rig.position.sub(hp).applyAxisAngle(UP, a).add(hp); rig.rotation.y += a; }
        else if (h.turnHeld && Math.abs(x) < 0.3) h.turnHeld = false;
      }
    }
  }
  function clampStage() { const f = feetPos(); const r = Math.hypot(f.x, f.z); if (r > 8.6) { rig.position.x -= f.x * (1 - 8.6 / r); rig.position.z -= f.z * (1 - 8.6 / r); } }

  // 화면 모드: 끌어서 둘러보기, 눌러서 고르기, W·A·S·D
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space' || e.code === 'Enter') onSelect(null); });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let drag = null;
  const cv = renderer.domElement;
  function flatPick(e) {
    const r = cv.getBoundingClientRect(), m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(m, camera);
    const list = panels.filter(p => p.active && !p.static && p.buttons.length).map(p => p.mesh);
    const hit = raycaster.intersectObjects(list, false)[0];
    if (!hit) return null; const p = hit.object.userData.panel, bi = p.hitButton(hit.uv); return bi >= 0 ? { p, bi } : null;
  }
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: flatYaw, pitch: flatPitch }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (inXR()) return;
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); if (drag.moved > 6) { flatYaw = drag.yaw + dx * 0.005; flatPitch = Math.max(-1.2, Math.min(1.2, drag.pitch + dy * 0.004)); } }
    else flatHover = flatPick(e);
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return; const moved = drag.moved; drag = null;
    if (moved <= 6) { audio.unlock(); const hit = flatPick(e); if (hit) clickButton(hit.p, hit.bi); else if (emptyAction) emptyAction(); }
  });
  function updateFlat(dt) {
    if (inXR()) return;
    camera.rotation.set(flatPitch, flatYaw, 0);
    if (!canMove) return;
    const f = V3(-Math.sin(flatYaw), 0, -Math.cos(flatYaw)), r = V3(Math.cos(flatYaw), 0, -Math.sin(flatYaw)), mv = V3();
    if (keys.KeyW || keys.ArrowUp) mv.add(f); if (keys.KeyS || keys.ArrowDown) mv.sub(f);
    if (keys.KeyD || keys.ArrowRight) mv.add(r); if (keys.KeyA || keys.ArrowLeft) mv.sub(r);
    if (mv.lengthSq() > 0) { rig.position.addScaledVector(mv.normalize(), 2.2 * dt); clampStage(); }
  }

  // ───────────── 패널 놓기 ─────────────
  const eyeY = () => headPos().y;
  function face(p, pos) { p.mesh.position.copy(pos); p.mesh.lookAt(headPos()); }
  function placeToward(p, target, dist, side, dy) {
    const f = feetPos(), dir = target.clone().sub(f); dir.y = 0; if (dir.lengthSq() < 0.01) dir.copy(headDir()); dir.normalize();
    const right = V3().crossVectors(dir, UP);
    const pos = f.addScaledVector(dir, dist).addScaledVector(right, side); pos.y = eyeY() + dy; face(p, pos);
  }
  function placeAhead(p, dist, side, dy) {
    const dir = headDir(), right = V3().crossVectors(dir, UP);
    const pos = feetPos().addScaledVector(dir, dist).addScaledVector(right, side); pos.y = eyeY() + dy; face(p, pos);
  }

  // ───────────── 패널들 ─────────────
  let talk, card, nav, toast, title, soon, intro, checklist;
  function buildPanels() {
    for (const p of [talk = new Panel('talk', 900, PAPER), card = new Panel('card', 840, PAPER), nav = new Panel('nav', 700, PAPER),
      toast = new Panel('toast', 780, 'rgba(33,31,46,0.9)'), title = new Panel('title', 1300, 'rgba(33,31,46,0.72)'),
      soon = new Panel('soon', 1000, null), intro = new Panel('intro', 1000, PAPER)]) scene.add(p.mesh);
    checklist = new Panel('checklist', 400, 'rgba(33,31,46,0.88)', 0.0005); checklist.pad = 26;
    attachChecklist();
  }
  function attachChecklist() {
    const left = hands.find(h => h.hand === 'left');
    if (inXR() && left) { left.grip.add(checklist.mesh); checklist.mesh.position.set(0, 0.07, -0.04); checklist.mesh.rotation.set(-0.95, 0, 0); }
    else { camera.add(checklist.mesh); checklist.mesh.position.set(0.62, 0.3, -1.0); checklist.mesh.rotation.set(0, 0, 0); }
  }

  const state = { met: false, done: [false, false, false], seen: [0, 0, 0], metHuman: false, doorOpen: false, current: -1 };
  function updateChecklist() {
    const p = checklist; p.clear();
    const n = (state.met ? 1 : 0) + state.done.filter(Boolean).length + (state.metHuman ? 1 : 0) + (state.doorOpen ? 1 : 0);
    p.row([{ t: C.ui.checklist, size: 36, color: '#ffffff', bold: true }, { t: n + '/6', size: 36, color: '#ffc766', bold: true }], 12);
    const row = (name, ok, cur) => p.row([
      { t: ok ? '●' : cur ? '▶' : '○', size: 30, color: ok ? '#8fe3a8' : cur ? '#ffc766' : '#8a8698' },
      { t: name, size: 32, color: ok ? '#b9b5c6' : cur ? '#ffffff' : '#d6d2e0' },
      ...(cur && !ok ? [{ t: C.ui.now, size: 30, color: '#ffc766' }] : [])], 8);
    const all = state.done.every(Boolean);
    row(C.guide.name, state.met, !state.met);
    C.missions.forEach((m, i) => row(m.label + (m.collectAll ? ` (${state.seen[i]}/${m.choices.length})` : ''), state.done[i], state.met && state.current === i));
    row(C.human.name, state.metHuman, all && !state.metHuman);
    row('문', state.doorOpen, state.metHuman && !state.doorOpen);
    p.finish(); p.show(true);
  }

  // ───────────── 말하기·고르기 ─────────────
  let typing = false, skipType = false;
  async function typeText(p, it, cps) {
    typing = true; skipType = false; it.shown = 0; p.draw();
    const total = it.s.length; let shown = 0;
    await until(() => {
      if (skipType) return true;
      const n = Math.min(total, Math.ceil((now - it.t0) * cps));
      if (n !== shown) { shown = n; it.shown = n; p.draw(); }
      return shown >= total;
    });
    it.shown = Infinity; p.draw(); typing = false;
  }
  function waitPick(p, autoIndex = 0, autoDelay = 1.2) {
    return new Promise(res => {
      let done = false;
      p.buttons.forEach((b, i) => { const prev = b.onClick; b.onClick = () => { if (done) return; done = true; emptyAction = null; if (prev) prev(i); res(i); }; });
      const single = p.buttons.length === 1 ? p.buttons[0] : null;
      emptyAction = () => { if (typing) skipType = true; else if (single) clickButton(p, 0); };
      if (AUTOTEST) { const t0 = now; until(() => done || (!typing && now - t0 > autoDelay && p.active)).then(() => { if (!done) clickButton(p, Math.min(autoIndex, p.buttons.length - 1)); }); }
    });
  }
  function nameRow(p, dot, name, role) { p.row([{ t: '●', size: 30, color: dot }, { t: name, size: 32, color: INK, bold: true }, { t: role, size: 24, color: '#8a8698' }], 14); }

  async function say(speakerPos, name, role, dot, text, options, single, g) {
    const p = talk; p.clear(); nameRow(p, dot, name, role);
    const body = p.text(text, 40, INK, { gap: 26 });
    if (options) options.forEach(o => p.button(o, null, '#3b3550', null, 96)); else p.button(single, null, '#ece5d8', null, 84);
    p.finish();
    const dist = Math.max(1.0, Math.min(1.4, feetPos().distanceTo(speakerPos) - 0.8));
    placeToward(p, speakerPos, dist, 0.45, -0.3);
    p.show(true);
    if (g) g.talking = true;
    body.t0 = now; await typeText(p, body, 30);
    if (g) g.talking = false;
    const i = await waitPick(p);
    p.show(false); await wait(0.15);
    return i;
  }
  let toastTimer = 0;
  function showToast(text, hold = 3.4) {
    toast.clear(); toast.pad = 30; toast.text(text, 34, '#ffffff', { align: 'center', gap: 0 }); toast.finish();
    placeAhead(toast, 1.5, 0, -0.55); toast.show(true);
    const my = ++toastTimer; wait(hold).then(() => { if (my === toastTimer) toast.show(false); });
  }
  function showTitle(text, at) { title.clear(); title.pad = 30; title.text(text, 64, '#ffffff', { bold: true, align: 'center', gap: 0 }); title.finish(); face(title, at); title.show(true); }

  // ───────────── 흐름 ─────────────
  async function main() {
    place(P(C.pos.hub), P(C.pos.guide));
    if (JUMP === 'ending') { state.met = true; state.done = [true, true, true]; state.seen = [1, 3, 2]; st.forEach(s => s.holder.visible = false); guide.mark.mesh.visible = false; updateChecklist(); await ending(false); return; }
    await introStep();
    await greeting();
    for (let i = 0; i < 3; i++) { await goStation(i); await mission(i); }
    await goMeet();
    await ending(false);
  }
  async function introStep() {
    const p = intro; p.clear(); p.pad = 56;
    p.text(C.kicker, 30, '#b5873e', { bold: true, align: 'center', gap: 10 });
    p.text(C.title, 76, INK, { bold: true, align: 'center', gap: 18 });
    p.text(inXR() ? C.subVR : C.subFlat, 32, DIM, { align: 'center', gap: 10 });
    p.text(inXR() ? C.moveVR : C.moveFlat, 28, DIM, { align: 'center', gap: 30 });
    p.button(C.start, null, '#f2a94f', null, 110);
    p.finish();
    placeToward(p, P(C.pos.guide), 1.45, 0.55, -0.18); p.show(true);
    await wait(0.4); log('state intro');
    await waitPick(p, 0, 1.0); p.show(false);
    audio.music('day'); sfx('appear');
    await wait(0.7);
  }
  async function greeting() {
    log('state greeting');
    const lines = C.greeting(inXR()); guide.mark.mesh.visible = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await say(P(C.pos.guide), C.guide.name, C.guide.role, guide.coatC, l.text, l.choices, i === lines.length - 1 ? C.ui.greetLast : C.ui.next, guide);
      if (i === 0) { state.met = true; updateChecklist(); }
    }
  }
  async function goStation(i) {
    state.current = i; const m = C.missions[i], s = st[i]; s.beacon.visible = true; updateChecklist();
    const p = nav; p.clear(); p.pad = 34;
    p.text(C.ui.nextPlace, 28, DIM, { align: 'center', gap: 10 });
    p.button(C.fill(C.ui.piece, m.label), m.title, m.color, null, 120);
    p.text(C.ui.walkHint, 24, DIM, { align: 'center', gap: 0 });
    p.finish(); placeToward(p, P(m.pad), 1.25, 0, -0.42); p.show(true);
    let picked = false, walked = false;
    p.buttons[0].onClick = () => { picked = true; };
    emptyAction = () => placeAhead(nav, 1.25, 0, -0.42);
    const t0 = now;
    await until(() => {
      const f = feetPos(), d = Math.hypot(f.x - m.pad[0], f.z - m.pad[1]);
      if (d < 2.3) walked = true;
      if (AUTOTEST && now - t0 > 1.0) picked = true;
      return picked || walked;
    });
    emptyAction = null; p.show(false);
    if (!walked) await moveTo(P(m.stand), V3(m.pad[0], 1.65, m.pad[1]));
    s.beacon.visible = false; log('state station', m.id, walked ? '(walked)' : '');
  }
  async function mission(i) {
    const m = C.missions[i], s = st[i]; sfx('select');
    const left = m.choices.map((_, k) => k); let first = true;
    while (left.length) {
      const p = talk; p.clear();
      p.row([{ t: '●', size: 30, color: m.color }, { t: C.fill(C.ui.piece, m.label), size: 32, color: INK, bold: true }, { t: m.title, size: 24, color: '#8a8698' }], 14);
      if (first) p.text(m.arrive, 30, DIM, { gap: 14 });
      p.text(first ? m.question : m.moreQuestion, 42, INK, { bold: true, gap: 24 });
      left.forEach(k => p.button(m.choices[k].label, null, '#3b3550', null, 96));
      p.finish(); placeToward(p, P(m.pad), 1.2, 0.62, -0.3); p.show(true);
      await wait(0.3);
      const pi = await waitPick(p, 0, 1.5);
      const ci = left.splice(pi, 1)[0]; state.seen[i]++; p.show(false); updateChecklist();
      await tween(1.4, k => { const w = Math.sin(k * Math.PI); s.orb.scale.setScalar(0.52 * (1 + 0.4 * w)); s.orbMat.emissiveIntensity = 1.2 + 0.9 * w; s.glow.material.opacity = 0.6 + 0.3 * w; });
      burst(s.holder.getWorldPosition(V3()), m.color, 140, 4, 1.4);
      sfx('card'); wait(0.22).then(() => sfx('piece'));
      const last = !m.collectAll || left.length === 0;
      await showCard(m, m.choices[ci], last, i);
      if (!m.collectAll) break;
      first = false;
    }
    s.holder.visible = false; s.ringMat.emissiveIntensity = 0.25; s.light.intensity = 0.15;
    burst(s.holder.getWorldPosition(V3()), m.color, 90, 3, 1.3); sfx('complete');
    state.done[i] = true; state.current = -1; updateChecklist();
    showToast(m.complete || C.fill(C.ui.pieceDone, m.label));
    await wait(0.8);
  }
  async function showCard(m, c, last, i) {
    const p = card; p.clear(); p.pad = 50;
    const reply = C.fill(c.reply || '');
    p.row([{ t: C.fill(C.ui.piece, m.label), size: 28, color: m.color, bold: true }, { t: '· ' + c.label, size: 28, color: '#8a8698', bold: true }], 14);
    if (reply) p.text(reply, 34, INK, { gap: 22 });
    p.bar(m.color, 8, 20);
    p.text(C.fill(m.fact.title.replace('{chosenTitle}', c.title || '')), 52, INK, { bold: true, gap: 12 });
    p.text(C.fill(m.fact.text.replace('{chosen}', C.fill(c.fact || ''))), 40, INK, { gap: 16 });
    if (m.fact.pending) p.text(reply ? m.fact.pending : C.ui.pending + ' · ' + m.fact.pending, 28, '#b5873e', { gap: 12 });
    p.text(C.fill(m.fact.source), 24, DIM, { gap: 26 });
    p.button(last ? C.ui.cardClose : C.ui.cardCloseMore, null, m.color, null, 100);
    p.finish(); placeToward(p, P(m.pad), 1.15, 0, -0.18); p.show(true);
    await wait(0.35); log('state card', m.id, state.seen[i]);
    await waitPick(p, 0, 1.3); p.show(false); await wait(0.2);
  }
  async function goMeet() {
    showToast(C.afterAll, 3); updateChecklist();
    const p = nav; p.clear(); p.pad = 34;
    p.button(C.ui.meetHuman, C.ui.meetHumanSub, '#3b6db3', null, 120); p.finish();
    placeAhead(p, 1.25, 0, -0.42); p.show(true);
    const w = waitPick(p, 0, 1.5);
    emptyAction = () => placeAhead(nav, 1.25, 0, -0.42);
    await w; p.show(false);
  }

  async function ending(replay) {
    log('state ending', replay ? 'replay' : '');
    canMove = false; audio.music('ending');
    const E = C.ending, hp = P(C.pos.human);
    await moveTo(P(C.pos.meet), V3(hp.x, 1.5, hp.z));
    const meetPoint = V3(0, 2.2, hp.z), titleAt = V3(0, 2.85, hp.z + 0.6);
    if (!replay) {
      showTitle(E.gatherTitle, titleAt); sfx('gather');
      const orbs = C.missions.map(m => { const o = mesh(geo.sphere, glowMat(m.color, 2.0, 0.25), world, [m.pad[0], 1.65, m.pad[1]], 0.44); o.castShadow = false; o.add(glowSprite(m.color, 3.2, 0.6)); return o; });
      const dur = 3.4;
      await tween(dur, k => {
        orbs.forEach((o, i) => {
          const m = C.missions[i], e = ease((k * dur - i * 0.08 * dur) / (dur * 0.8));
          o.position.set(m.pad[0] + (meetPoint.x - m.pad[0]) * e, 1.65 + (meetPoint.y - 1.65) * e + Math.sin(e * Math.PI) * 2.2, m.pad[1] + (meetPoint.z - m.pad[1]) * e);
          o.scale.setScalar(0.44 * (1 + Math.sin(now * 6) * 0.08));
        });
      });
      orbs.forEach((o, i) => { burst(o.position.clone(), C.missions[i].color, 80, 3, 1.3); world.remove(o); });
    }
    burst(V3(0, 1.4, hp.z), '#fff6dc', 160, 3.5, 1.6, 0.09); sfx('appear');
    showTitle(E.appearTitle, titleAt);
    if (human) {
      human.root.position.copy(hp); human.root.visible = true; human.look = true; human.tag.mesh.visible = false;
      human.root.rotation.y = Math.atan2(headPos().x - hp.x, headPos().z - hp.z);
      await tween(2.2, k => human.root.scale.setScalar(Math.max(0.001, ease(k))));
      human.tag.mesh.visible = true; fade('wave', 0.25);
    }
    state.metHuman = true; updateChecklist();
    await wait(1.6); title.show(false);
    const p = talk;
    for (let li = 0; li < E.lines.length; li++) {
      const line = E.lines[li]; p.clear(); nameRow(p, '#3b6db3', C.human.name, C.human.role);
      const body = p.text(line, 42, INK, { gap: 8 }); p.finish();
      placeToward(p, hp, 1.5, 0.62, -0.4); if (li === 0) p.show(true);
      let next = false; emptyAction = () => { if (typing) skipType = true; else next = true; };
      body.t0 = now; await typeText(p, body, 16);
      const hold = E.lineHold + 0.05 * line.length, t0 = now;
      await until(() => next || now - t0 > hold); emptyAction = null;
    }
    p.show(false);
    showTitle(E.doorTitle, V3(0, 3.3, C.pos.door[1] + 1.2)); sfx('door');
    let burstDone = false;
    await tween(3.2, k => { door.set(ease(k)); if (!burstDone && k > 0.5) { burstDone = true; burst(V3(0, 2, C.pos.door[1] + 0.3), '#ffe9c0', 120, 4, 1.5); } });
    state.doorOpen = true; updateChecklist(); audio.music('day');
    if (human) {
      human.look = false; const a = human.root.position.clone(), b = P(C.pos.aside);
      human.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); fade('walk', 0.3);
      await tween(1.6, k => human.root.position.lerpVectors(a, b, ease(k)));
      fade('idle', 0.3); human.look = true;
    }
    title.show(false); canMove = true;
    await doorChoice();
  }
  async function doorChoice() {
    const E = C.ending;
    for (;;) {
      const p = nav; p.clear(); p.pad = 34;
      p.text(E.doorTitle, 34, INK, { bold: true, align: 'center', gap: 16 });
      p.button(E.enter, null, '#f2a94f', null, 110); p.button(E.stay, null, '#ece5d8', null, 84);
      p.finish(); placeToward(p, P(C.pos.door), 1.3, -0.35, -0.4); p.show(true);
      await wait(0.3); log('state door choice');
      const i = await waitPick(p, 0, 1.2); p.show(false);
      if (i === 0) break;
      let again = false; emptyAction = () => { again = true; };
      const g = P(C.pos.gate); await until(() => again || feetPos().distanceTo(g) < 1.2); emptyAction = null;
      if (!again) break;
    }
    await enterDoor();
  }
  async function enterDoor() {
    log('state enter door'); canMove = false;
    const start = rig.position.clone(), f = feetPos(), tgt = P(C.pos.gate).add(V3(0, 0, -0.6)), delta = V3(tgt.x - f.x, 0, tgt.z - f.z);
    const dur = Math.max(1.2, Math.min(4, delta.length() / 1.3));
    fadeMesh.material.color.set('#fff8ec');
    vig.glide = 0.85;
    await tween(dur, k => rig.position.copy(start).addScaledVector(delta, ease(k)));
    vig.glide = 0;
    await fadeTo(1, 1.0);
    await comingSoon();
  }
  async function comingSoon() {
    const E = C.ending;
    world.visible = false; sun.visible = false; setSky('#fbf8f2', '#fbf8f2', '#fbf8f2', '#fbf8f2'); hemi.intensity = 1;
    checklist.mesh.visible = false; checklist.target = 0;
    place(V3(0, 0, 0), V3(0, 0, -5));
    const p = soon; p.clear(); p.pad = 40;
    p.text(E.soonKicker, 34, '#b5873e', { bold: true, align: 'center', gap: 14 });
    p.text(E.soonTitle, 110, INK, { bold: true, align: 'center', gap: 24 });
    p.text(E.soonText, 38, DIM, { align: 'center', gap: 40 });
    p.button(E.replay, null, '#ece5d8', null, 90); p.button(E.restart, null, '#ece5d8', null, 90); p.button(E.exit, null, '#3b3550', null, 90);
    p.finish(); placeAhead(p, 1.7, 0, -0.1); p.show(true);
    await fadeTo(0, 1.0); log('state coming soon');
    if (AUTOTEST) { log('autotest done'); return; }
    const i = await waitPick(p, 99, 1e9); p.show(false);
    if (i === 2) { const s = renderer.xr.getSession(); if (s) s.end(); location.reload(); return; }
    if (i === 1) { location.reload(); return; }
    await fadeTo(1, 0.6);
    world.visible = true; sun.visible = true; hemi.intensity = 0.55; setSky('#5f87c9', '#dfe9f3', '#f4efe6', '#dfe9f3');
    door.set(0); state.doorOpen = false; if (human) { human.root.visible = false; human.root.position.copy(P(C.pos.human)); }
    checklist.mesh.visible = true; updateChecklist(); fadeMesh.material.color.set(0x0a0810);
    place(P(C.pos.meet), V3(0, 1.5, C.pos.human[1]));
    await fadeTo(0, 0.6);
    await ending(true);
  }

  // 알갱이 터짐
  const bursts = [];
  function burst(pos, color, n, speed, life, size = 0.07) {
    const g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z; const d = V3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7)); vel.push(d); }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: hex(color), size, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(pts); bursts.push({ pts, vel, t: 0, life });
  }
  function updateBursts(dt) {
    for (let j = bursts.length - 1; j >= 0; j--) {
      const b = bursts[j]; b.t += dt; const a = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, i) => { v.multiplyScalar(Math.exp(-1.5 * dt)); v.y -= 4 * dt * 0.4; a[i * 3] += v.x * dt; a[i * 3 + 1] += v.y * dt; a[i * 3 + 2] += v.z * dt; });
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / b.life);
      if (b.t > b.life) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(j, 1); }
    }
  }

  // ───────────── 루프 ─────────────
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta()); now += dt;
    for (let i = waits.length - 1; i >= 0; i--) { const w = waits[i]; if ((w.t != null && now >= w.t) || (w.f && w.f())) { waits.splice(i, 1); w.r(); } }
    for (let i = updaters.length - 1; i >= 0; i--) if (!updaters[i]()) updaters.splice(i, 1);
    updateFlat(dt); updateSticks(dt); updateVignette(dt); updatePointers(); updateGuide(dt); updateHuman(dt); updateBursts(dt);
    for (const p of panels) p.tick(dt);
    renderer.render(scene, camera);
  });

  // ───────────── 시작 화면 ─────────────
  buildStage(); C.missions.forEach((_, i) => buildStation(i)); buildDoor(); buildGuide(); buildPanels();
  const loading = document.getElementById('loading');
  const humanReady = loadHuman().then(h => { loading.style.display = 'none'; return h; });
  place(P(C.pos.hub), P(C.pos.guide));
  const cover = document.getElementById('cover'), vrBtn = document.getElementById('vrBtn'), flatBtn = document.getElementById('flatBtn'), note = document.getElementById('note');
  let started = false;
  async function begin() { if (started) return; started = true; cover.style.display = 'none'; audio.unlock(); await humanReady; await wait(0.3); main(); }
  if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-vr').then(ok => {
      if (ok) { vrBtn.disabled = false; vrBtn.textContent = 'VR로 들어가기'; }
      else { vrBtn.textContent = '이 기기는 VR 미지원'; note.textContent = '메타 퀘스트 브라우저에서 이 주소를 열면 VR로 들어갈 수 있어요.'; }
    }).catch(() => { vrBtn.textContent = '이 기기는 VR 미지원'; });
  } else { vrBtn.textContent = '이 기기는 VR 미지원'; note.textContent = window.isSecureContext ? '메타 퀘스트 브라우저에서 이 주소를 열면 VR로 들어갈 수 있어요.' : 'VR은 https 주소에서만 열려요.'; }
  vrBtn.addEventListener('click', async () => {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
      await renderer.xr.setSession(session);
      session.addEventListener('end', () => { attachChecklist(); });
      // 머리 위치가 잡힌 뒤 출발점에 세운다
      await wait(0.6); place(P(C.pos.hub), P(C.pos.guide)); attachChecklist();
      begin();
    } catch (e) { note.textContent = 'VR을 열지 못했어요: ' + e.message; log('xr fail', e); }
  });
  flatBtn.addEventListener('click', begin);
  if (AUTOTEST || JUMP) begin();
  window.W1 = { state, scene, camera, rig, renderer, place };
})();
