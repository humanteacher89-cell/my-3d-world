/* 휴먼쌤 월드 VR 공용 엔진 (2026-10-18, 월드 1 WebXR판 vr.js에서 맵과 상관없는 부분을 떼어 냄)
   - 헤드셋: VR / 혼합현실(퀘스트 3 컬러 화면 위), 손 빛줄기 + 방아쇠 또는 손 집기, 왼쪽 막대 걷기·오른쪽 막대 30도 돌기, 터널링
   - 화면(PC·휴대폰): 끌어서 둘러보기, 눌러서 고르기, W·A·S·D
   - 맵 파일은 HW.start({ main, introText }) 하나만 부른다. 맵 안 물건은 HW.world(VR·혼합현실 공통)나 HW.vrOnly(VR에서만: 벽·바닥·하늘)에 넣는다.
   - 시험: ?autotest=1(저절로 끝까지) · ?mrtest=1(화면 모드에서 혼합현실 모습 흉내) · ?vigtest=1(터널링 강제)                       */
window.HW = (function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const AUTOTEST = Q.has('autotest');
  const log = (...a) => { console.log('[HW]', ...a); };
  const audio = window.WorldAudio || { unlock() {}, music() {}, sfx() {} };
  const sfx = n => { try { audio.sfx(n); } catch (e) {} };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = a => V3(a[0], 0, a[1]);
  const hex = h => new THREE.Color(h);
  const UP = V3(0, 1, 0);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  // ───────────── 렌더러·장면 ─────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fogVR = new THREE.Fog(0xdfe9f3, 28, 90);
  scene.fog = fogVR;
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 400);
  camera.rotation.order = 'YXZ';
  const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  camera.position.set(0, 1.6, 0);
  addEventListener('resize', () => { if (renderer.xr.isPresenting) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const world = new THREE.Group(); scene.add(world);      // VR·혼합현실 공통
  const vrOnly = new THREE.Group(); world.add(vrOnly);    // VR에서만(혼합현실에서는 실제 방이 대신한다)

  const skyU = { top: { value: hex('#5f87c9') }, hor: { value: hex('#dfe9f3') }, bot: { value: hex('#f4efe6') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.55)) : mix(hor, bot, pow(-h, 0.7)); gl_FragColor = vec4(c, 1.0); }'
  }));
  vrOnly.add(sky);
  function setSky(t, h, b, fog) { skyU.top.value.set(t); skyU.hor.value.set(h); skyU.bot.value.set(b); fogVR.color.set(fog || h); }

  const hemi = new THREE.HemisphereLight(0xe6f0ff, 0x8c7a66, 0.65); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dc, 1.4);
  sun.position.set(6, 12, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.bias = -0.0008; scene.add(sun);

  // ───────────── 도우미 ─────────────
  const geo = {
    sphere: new THREE.SphereGeometry(0.5, 40, 24), lowSphere: new THREE.SphereGeometry(0.5, 20, 12),
    capsule: new THREE.CapsuleGeometry(0.5, 1, 8, 20), cyl: new THREE.CylinderGeometry(0.5, 0.5, 2, 40),
    box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1)
  };
  const std = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: hex(c), roughness: r, metalness: 0 }, extra));
  const glowMat = (c, k = 0.8, r = 0.4) => std(c, r, { emissive: hex(c), emissiveIntensity: k });
  function mesh(g, m, parent, pos, scale, rot) {
    const o = new THREE.Mesh(g, m);
    if (pos) o.position.set(pos[0], pos[1], pos[2]);
    if (scale != null) { if (typeof scale === 'number') o.scale.setScalar(scale); else o.scale.set(scale[0], scale[1], scale[2]); }
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    o.castShadow = true; o.receiveShadow = true;
    (parent || world).add(o);
    return o;
  }
  const torus = (R, r, s1 = 96, s2 = 10) => new THREE.TorusGeometry(R, r, s2, s1).rotateX(Math.PI / 2);
  const ease = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  })();
  function glowSprite(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); s.raycast = () => {}; return s;   // 빛 번짐은 가리키기 계산에서 뺀다(XR에서 카메라 없이 계산하면 매 프레임 오류)
  }

  // ───────────── 시간·기다림(렌더 루프에서 푼다) ─────────────
  let now = 0;
  const waits = [], updaters = [];
  const wait = s => new Promise(r => waits.push({ t: now + s, r }));
  const until = f => new Promise(r => waits.push({ f, r }));
  function tween(dur, fn) { return new Promise(r => { const t0 = now; updaters.push(() => { const k = Math.min(1, (now - t0) / dur); fn(k); if (k >= 1) { r(); return false; } return true; }); }); }
  function every(fn) { updaters.push(() => fn() !== false); }

  // ───────────── 글 패널(캔버스 → 판) ─────────────
  const FONT = '"Noto Sans KR","Noto Sans CJK KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif';
  const RES = 1.6;
  const panels = [];
  const INK = '#29263a', DIM = '#7a748a', PAPER = 'rgba(255,251,244,0.97)';
  function rr(g, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function lighten(c, k) { const col = new THREE.Color(c); col.lerp(new THREE.Color('#ffffff'), k); return '#' + col.getHexString(); }
  function isDark(c) { const col = new THREE.Color(c); return col.r * 0.3 + col.g * 0.59 + col.b * 0.11 < 0.55; }
  class Panel {
    constructor(name, width, bg, scale = 0.001) {
      this.name = name; this.w = width; this.bg = bg; this.pad = 44; this.scale = scale;
      this.canvas = document.createElement('canvas'); this.ctx = this.canvas.getContext('2d');
      this.mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(geo.plane, this.mat);
      this.mesh.renderOrder = 10; this.mesh.userData.panel = this; this.mesh.visible = false;
      this.hover = -1; this.alpha = 0; this.clear();
      panels.push(this);
    }
    clear() { this.items = []; this.buttons = []; this.y = this.pad; this.hover = -1; return this; }
    font(size, bold) { return (bold ? '700 ' : '400 ') + size + 'px ' + FONT; }
    wrap(s, size, bold, maxW) {
      const g = this.ctx; g.font = this.font(size, bold); const out = [];
      for (const para of String(s).split('\n')) {
        let line = '';
        for (const word of para.split(/(\s+)/)) {
          if (!word) continue;
          const test = line + word;
          if (g.measureText(test).width <= maxW) { line = test; continue; }
          if (!line.trim()) { for (const ch of word) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; } continue; }
          out.push(line.trimEnd()); line = word.trimStart();
          if (g.measureText(line).width > maxW) { let l2 = ''; for (const ch of line) { if (g.measureText(l2 + ch).width > maxW && l2) { out.push(l2); l2 = ch; } else l2 += ch; } line = l2; }
        }
        out.push(line);
      }
      return out;
    }
    text(s, size, color, o = {}) {
      const lines = this.wrap(s, size, o.bold, this.w - this.pad * 2), lh = Math.round(size * 1.38);
      const it = { type: 'text', s: String(s), lines, size, color, bold: o.bold, align: o.align || 'left', y: this.y, lh, shown: Infinity };
      this.items.push(it); this.y += lines.length * lh + (o.gap != null ? o.gap : 18); return it;
    }
    row(segs, gap = 14, align = 'left') { const size = Math.max(...segs.map(s => s.size)); this.items.push({ type: 'row', segs, y: this.y, size, align }); this.y += Math.round(size * 1.38) + gap; }
    bar(color, h = 8, gap = 20) { this.items.push({ type: 'bar', color, y: this.y, h }); this.y += h + gap; }
    meter(frac, color, h = 26, gap = 16) { this.items.push({ type: 'meter', frac: Math.max(0, Math.min(1, frac)), color, y: this.y, h }); this.y += h + gap; }   // 막대그래프
    space(h) { this.y += h; }
    button(label, sub, color, onClick, h = 100, gap = 16) { const b = { label, sub, color, onClick, x: this.pad, y: this.y, w: this.w - this.pad * 2, h }; this.buttons.push(b); this.y += h + gap; return b; }
    finish(minH = 0) {
      this.h = Math.max(minH, this.y - 16 + this.pad * 0.6);
      this.canvas.width = Math.round(this.w * RES); this.canvas.height = Math.round(this.h * RES);
      if (this.tex) this.tex.dispose();
      this.tex = new THREE.CanvasTexture(this.canvas); this.tex.encoding = THREE.sRGBEncoding; this.tex.anisotropy = 4;
      this.mat.map = this.tex; this.mat.needsUpdate = true;
      this.mesh.scale.set(this.w * this.scale * (this.hudScale || 1), this.h * this.scale * (this.hudScale || 1), 1);
      if (this.hudSlot) placeHud(this, this.hudSlot, this.hudMaxW);
      this.draw(); return this;
    }
    draw() {
      const g = this.ctx; g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, this.w, this.h);
      if (this.bg) { g.fillStyle = this.bg; rr(g, 0, 0, this.w, this.h, this.radius != null ? this.radius : 26); g.fill(); }
      for (const it of this.items) {
        if (it.type === 'bar') { g.fillStyle = it.color; rr(g, this.pad, it.y, this.w - this.pad * 2, it.h, it.h / 2); g.fill(); continue; }
        if (it.type === 'meter') { const W = this.w - this.pad * 2; g.fillStyle = 'rgba(255,255,255,0.16)'; rr(g, this.pad, it.y, W, it.h, it.h / 2); g.fill(); if (it.frac > 0.01) { g.fillStyle = it.color; rr(g, this.pad, it.y, Math.max(it.h, W * it.frac), it.h, it.h / 2); g.fill(); } continue; }
        if (it.type === 'row') {
          g.textBaseline = 'top';
          let total = 0; for (const s of it.segs) { g.font = this.font(s.size, s.bold); total += g.measureText(s.t).width + (s.gap != null ? s.gap : 10); }
          let x = it.align === 'center' ? (this.w - total) / 2 : this.pad;
          for (const s of it.segs) { g.font = this.font(s.size, s.bold); g.fillStyle = s.color; g.fillText(s.t, x, it.y + (it.size - s.size) * 0.9); x += g.measureText(s.t).width + (s.gap != null ? s.gap : 10); }
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
        g.fillStyle = isDark(b.color) ? '#ffffff' : INK; g.textBaseline = 'middle';
        g.font = this.font(b.sub ? 36 : 38, true);
        const cy = b.sub ? b.y + b.h * 0.38 : b.y + b.h / 2;
        g.fillText(b.label, b.x + (b.w - g.measureText(b.label).width) / 2, cy);
        if (b.sub) { g.font = this.font(26, false); g.globalAlpha = 0.78; g.fillText(b.sub, b.x + (b.w - g.measureText(b.sub).width) / 2, b.y + b.h * 0.72); g.globalAlpha = 1; }
      });
      if (this.tex) this.tex.needsUpdate = true;
    }
    hitButton(uv) { const x = uv.x * this.w, y = (1 - uv.y) * this.h; return this.buttons.findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); }
    setHover(i) { if (i !== this.hover) { this.hover = i; this.draw(); if (i >= 0) sfx('click'); } }
    show(on) { this.target = on ? 1 : 0; if (on) this.mesh.visible = true; }
    pin() { this.static = true; this.target = null; this.alpha = 1; this.mat.opacity = 1; this.mesh.visible = true; return this; }   // 늘 보이는 판(표지·칠판)
    tick(dt) {
      if (this.target == null) return;
      this.alpha += (this.target - this.alpha) * Math.min(1, dt * 12);
      if (Math.abs(this.target - this.alpha) < 0.01) this.alpha = this.target;
      this.mat.opacity = this.alpha;
      const s = (0.94 + 0.06 * this.alpha) * (this.hudScale || 1); this.mesh.scale.set(this.w * this.scale * s, this.h * this.scale * s, 1);
      if (this.alpha === 0 && this.target === 0) this.mesh.visible = false;
    }
    get active() { return this.mesh.visible && this.alpha > 0.6 && this.target === 1; }
  }
  function nameTag(parent, name, role, dot, y) {
    const p = new Panel('tag', 420, 'rgba(255,255,255,0.92)'); p.pad = 18;
    p.row([{ t: '●', size: 40, color: dot }, { t: name, size: 40, color: INK, bold: true }], 2, 'center');
    p.text(role, 26, DIM, { align: 'center', gap: 0 });
    p.finish(); p.mesh.position.set(0, y, 0); parent.add(p.mesh); p.pin();
    return p;
  }

  // ───────────── 혼합현실 ─────────────
  let isMR = false, handheld = false;   // handheld = 휴대폰 혼합현실(화면을 손가락으로 누른다)
  const useHud = () => !inXR() || handheld;   // 화면에 붙는 자막·계기판을 쓸 때
  const shadowCatcher = mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.3 }), world, [0, 0.002, 0], null, [-Math.PI / 2, 0, 0]);
  shadowCatcher.castShadow = false; shadowCatcher.visible = false;
  function setMR(on) {
    isMR = on; vrOnly.visible = !on; scene.fog = on ? null : fogVR; shadowCatcher.visible = on;
    renderer.setClearColor(0x000000, on ? 0 : 1); log('mode', on ? 'mixed reality' : 'vr');
  }

  // ───────────── 실물 캐릭터(GLB: 휴먼쌤·리니) ─────────────
  const chars = [];
  function measureBounds(model) {
    model.updateMatrixWorld(true); const v = V3(), min = V3(Infinity, Infinity, Infinity), max = V3(-Infinity, -Infinity, -Infinity);
    model.traverse(o => { if (!o.isSkinnedMesh) return; o.skeleton.update(); const pos = o.geometry.attributes.position; const bt = o.boneTransform ? 'boneTransform' : 'applyBoneTransform';
      for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i); o[bt](i, v); v.applyMatrix4(o.matrixWorld); min.min(v); max.max(v); } });
    return (max.y > min.y && Number.isFinite(max.y - min.y)) ? { min, max, height: max.y - min.y } : null;
  }
  // o = { url, tex?, height, clips: { idle, wave, walk, talk }, trim: { wave: [s, e] }, glow, parent, pos }
  function loadChar(o) {
    return new Promise(res => {
      new THREE.GLTFLoader().load(o.url, gltf => {
        const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
        const model = gltf.scene, glow = o.glow != null ? o.glow : 0.3;
        model.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = false; if (x.isSkinnedMesh) x.frustumCulled = false;
          (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => { m.metalness = 0; m.metalnessMap = null; if (m.map && glow > 0) { m.emissive = hex('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = glow; } m.needsUpdate = true; }); }
          if (x.name && /^Icosphere/i.test(x.name)) x.visible = false; });
        const mixer = new THREE.AnimationMixer(model), actions = {};
        const find = k => k && gltf.animations.find(a => a.name.toLowerCase().includes(k.toLowerCase()));
        for (const [key, name] of Object.entries(o.clips || {})) {
          let c = find(name); if (!c) continue;
          const tr = o.trim && o.trim[key];
          if (tr) { const s = tr[0], e = Math.min(tr[1], c.duration); c = c.clone(); c.tracks.forEach(t => { t.trim(s, e); if (s) t.shift(-s); }); c.duration = e - s; }
          const a = mixer.clipAction(c);
          if (key === 'wave') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
          actions[key] = a;
        }
        if (!actions.idle && gltf.animations[0]) actions.idle = mixer.clipAction(gltf.animations[0]);
        if (actions.idle) actions.idle.play();
        mixer.update(0.01);
        const bb = measureBounds(model), h = bb ? bb.height : 1.7;
        inner.scale.setScalar(o.height / h);
        if (bb) model.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
        inner.add(model);
        if (o.tex) new THREE.TextureLoader().load(o.tex, tex => { tex.encoding = THREE.sRGBEncoding; tex.flipY = false; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          model.traverse(x => { if (x.isMesh) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => { m.map = tex; if (m.emissiveMap) m.emissiveMap = tex; m.needsUpdate = true; }); }); });
        if (o.pos) root.position.copy(o.pos);
        (o.parent || world).add(root);
        const ch = { root, mixer, actions, cur: actions.idle, look: true, talking: false,
          play(name, dur = 0.3) { const a = this.actions[name]; if (!a || a === this.cur) return; a.reset(); a.play(); if (this.cur) this.cur.crossFadeTo(a, dur, false); this.cur = a; },
          wave() { this.play('wave', 0.25); },
          setTalking(on) { this.talking = on; if (this.actions.talk) this.play(on ? 'talk' : 'idle', 0.35); } };
        mixer.addEventListener('finished', e => { if (e.action === actions.wave) ch.play(ch.talking && actions.talk ? 'talk' : 'idle', 0.4); });
        chars.push(ch);
        log('char loaded', o.url.split('/').pop(), 'raw height', h.toFixed(3), 'clips', gltf.animations.map(a => a.name).join(','));
        res(ch);
      }, undefined, err => { log('char load failed', o.url, err && err.message); res(null); });
    });
  }
  function updateChars(dt) {
    const hp = headPos();
    for (const c of chars) {
      if (!c.root.visible) continue;
      c.mixer.update(dt);
      if (c.look) { const d = hp.clone().sub(c.root.getWorldPosition(V3())); d.y = 0; if (d.lengthSq() > 0.01) c.root.rotation.y += angDiff(c.root.rotation.y, Math.atan2(d.x, d.z)) * (1 - Math.exp(-3 * dt)); }
    }
  }

  // ───────────── 플레이어(머리·손·옮겨 가기) ─────────────
  function headPos() { return camera.getWorldPosition(V3()); }
  function headDir() { const d = camera.getWorldDirection(V3()); d.y = 0; if (d.lengthSq() < 1e-4) d.set(0, 0, -1); return d.normalize(); }
  function feetPos() { const h = headPos(); h.y = rig.position.y; return h; }
  const inXR = () => renderer.xr.isPresenting;
  let flatYaw = 0, flatPitch = 0;
  function place(feet, lookAt) {
    if (!inXR()) {
      rig.rotation.y = 0; rig.position.set(feet.x, 0, feet.z);
      flatYaw = Math.atan2(-(lookAt.x - feet.x), -(lookAt.z - feet.z));
      flatPitch = lookAt.y > 0 ? -Math.atan2(1.6 - lookAt.y, Math.hypot(lookAt.x - feet.x, lookAt.z - feet.z)) * 0.6 : 0;   // 바닥 점(y=0)이면 수평
      camera.rotation.set(flatPitch, flatYaw, 0); rig.updateMatrixWorld(true); return;
    }
    rig.updateMatrixWorld(true);
    const hp = headPos(), hd = headDir();
    const delta = angDiff(Math.atan2(hd.x, hd.z), Math.atan2(lookAt.x - feet.x, lookAt.z - feet.z));
    rig.position.sub(hp).applyAxisAngle(UP, delta).add(hp); rig.rotation.y += delta; rig.updateMatrixWorld(true);
    const h2 = headPos(); rig.position.x += feet.x - h2.x; rig.position.z += feet.z - h2.z; rig.position.y = 0; rig.updateMatrixWorld(true);
  }
  const fadeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0a0810, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false }));
  fadeMesh.renderOrder = 999; camera.add(fadeMesh);
  const setFade = a => { fadeMesh.material.opacity = a; fadeMesh.visible = a > 0.001; };
  setFade(0);
  async function moveTo(feet, lookAt, dur = 0.22) { await tween(dur, k => setFade(k)); place(feet, lookAt); await wait(0.03); await tween(dur * 1.4, k => setFade(1 - k)); }
  const fadeTo = (a, dur) => { const a0 = fadeMesh.material.opacity; return tween(dur, k => setFade(a0 + (a - a0) * k)); };

  // 터널링: 움직이는 동안만 시야 가장자리를 동그랗게 어둡게(헤드셋에서만)
  const vigU = { strength: { value: 0 }, inner: { value: 0.42 }, outer: { value: 0.85 } };
  const vignette = new THREE.Mesh(new THREE.SphereGeometry(0.28, 48, 24), new THREE.ShaderMaterial({
    uniforms: vigU, side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float strength; uniform float inner; uniform float outer; varying vec3 vP;' +
      'void main(){ vec3 d = normalize(vP); float a = acos(clamp(-d.z, -1.0, 1.0)); float k = smoothstep(inner, outer, a) * strength; gl_FragColor = vec4(0.015, 0.012, 0.03, k * 0.95); }'
  }));
  vignette.renderOrder = 998; vignette.visible = false; camera.add(vignette);
  const vig = { move: 0, pulse: 0, glide: 0, cur: 0 };
  function updateVignette(dt) {
    vig.pulse = Math.max(0, vig.pulse - dt * 2.8);
    const test = Q.has('vigtest') ? 1 : 0;
    const target = inXR() || test ? Math.max(vig.move, vig.pulse, vig.glide, test) : 0;
    vig.cur += (target - vig.cur) * Math.min(1, dt * (target > vig.cur ? 10 : 5));
    vigU.strength.value = vig.cur; vignette.visible = vig.cur > 0.01;
  }

  // 컨트롤러·손
  const hands = [];
  const lineMatOff = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const lineMatOn = new THREE.LineBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.95 });
  let wristPanel = null;
  for (let i = 0; i < 2; i++) {
    const ray = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i);
    rig.add(ray); rig.add(grip);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), lineMatOff);
    line.scale.z = 0.35; ray.add(line);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.visible = false; ray.add(dot);
    const h = { ray, grip, line, dot, src: null, hand: '', hit: null, turnHeld: false, model: [] };
    ray.addEventListener('connected', e => {
      h.src = e.data; h.hand = e.data.handedness; h.isHand = !!e.data.hand;
      for (const m of h.model) grip.remove(m); h.model = [];
      if (!h.isHand) {
        const gm = mesh(geo.sphere, std('#2d2b38', 0.5), grip, [0, -0.01, 0.02], [0.042, 0.05, 0.12], [0.35, 0, 0]); gm.castShadow = false;
        const ring = mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 32), glowMat(h.hand === 'left' ? '#5cc3b4' : '#f2a94f', 0.6), grip, [0, 0.02, -0.035], null, [0.96, 0, 0]); ring.castShadow = false;
        h.model = [gm, ring];
      }
      log('input connected', h.hand, h.isHand ? 'hand' : 'controller');
      if (h.hand === 'left') attachWrist();
    });
    ray.addEventListener('disconnected', () => { h.src = null; });
    // 휴대폰 화면 누르기(screen): 누르는 동안 끌기, 떼었을 때 끌지 않았으면 '톡'
    ray.addEventListener('selectstart', () => { if (h.src && h.src.targetRayMode === 'screen') { h.touch = true; h.dragged = false; return; } onSelect(h); });
    ray.addEventListener('selectend', () => { if (h.src && h.src.targetRayMode === 'screen') h.touch = false; });
    ray.addEventListener('select', () => { if (h.src && h.src.targetRayMode === 'screen') { if (!h.dragged) onScreenTap(h); h.dragged = false; } });
    ray.addEventListener('squeezestart', () => { h.squeeze = true; });   // 컨트롤러 옆 버튼 = 잡기
    ray.addEventListener('squeezeend', () => { h.squeeze = false; });
    hands.push(h);
  }
  const handGroups = [0, 1].map(i => { const hg = renderer.xr.getHand(i); rig.add(hg); return hg; });
  const jointMat = std('#f3d2bd', 0.55), tipMat = std('#ffffff', 0.4);
  function updateHands() {
    for (const hg of handGroups) {
      const js = hg.joints; if (!js) continue;
      for (const name in js) {
        const j = js[name];
        if (!j.userData.deco) { const s = new THREE.Mesh(geo.lowSphere, name.endsWith('tip') ? tipMat : jointMat); s.castShadow = false; j.add(s); j.userData.deco = s; }
        const s = j.userData.deco; s.scale.setScalar(Math.max(0.006, j.jointRadius || 0.008) * 2); s.visible = !isMR;
      }
    }
  }
  // ───────────── 손으로 집기·던지기·손가락으로 누르기 ─────────────
  // 손: 엄지 끝과 검지 끝이 2.2cm 안으로 모이면 '집기'(3.5cm 넘게 벌어지면 놓기). 컨트롤러: 옆 버튼(그립)을 쥐면 집기.
  // 잡을 것은 addGrabbable(물체, { radius, onGrab(g), onMove(g, 점, 속도), onRelease(g, 속도) }).
  const grabbables = [];
  function addGrabbable(obj, o) { obj.userData.grab = Object.assign({ radius: 0.08, enabled: true }, o); grabbables.push(obj); return obj; }
  function removeGrabbable(obj) { const i = grabbables.indexOf(obj); if (i >= 0) grabbables.splice(i, 1); }
  const grabbers = hands.map((h, i) => ({ i, h, pinch: false, point: V3(), prev: V3(), vel: V3(), held: null, ok: false, tip: null, pokeZ: new Map(), pokeT: 0 }));
  const joint = (i, n) => { const js = handGroups[i].joints; const j = js && js[n]; return j && j.visible !== false ? j : null; };
  function nearestGrabbable(p) {
    let best = null, bd = Infinity;
    for (const o of grabbables) {
      const g = o.userData.grab; if (!g.enabled || !o.visible || g.held) continue;
      let vis = true; for (let q = o.parent; q; q = q.parent) if (!q.visible) { vis = false; break; } if (!vis) continue;
      const d = o.getWorldPosition(V3()).distanceTo(p); if (d < g.radius && d < bd) { bd = d; best = o; }
    }
    return best;
  }
  // 휴대폰 혼합현실: 화면을 누른 채 끌면, 손가락이 가리키는 빛줄기 위 같은 거리에서 물체가 따라온다
  function rayGrabbable(o, dir) {
    let best = null, bt = Infinity;
    for (const ob of grabbables) {
      const gd = ob.userData.grab; if (!gd.enabled || gd.held) continue;
      let vis = true; for (let q = ob; q; q = q.parent) if (!q.visible) { vis = false; break; } if (!vis) continue;
      const c = ob.getWorldPosition(V3()), t = c.clone().sub(o).dot(dir); if (t <= 0) continue;
      const d2 = c.distanceToSquared(o) - t * t, r = gd.radius * 1.15;
      if (d2 < r * r && t < bt) { bt = t; best = { ob, t }; }
    }
    return best;
  }
  function updateGrab(dt) {
    for (const g of grabbers) {
      const h = g.h; g.ok = false; g.tip = null;
      if (!inXR() || !h.src) { if (g.held) release(g); g.pinch = false; g.pending = null; continue; }
      let pinchNow = false;
      if (h.src.targetRayMode === 'screen') {
        const o = h.ray.getWorldPosition(V3()), dir = V3(0, 0, -1).applyQuaternion(h.ray.getWorldQuaternion(new THREE.Quaternion()));
        pinchNow = !!h.touch; g.ok = true;
        if (pinchNow && !g.pinch) {   // 누르기 시작: 바로 집지 않고 무엇을 눌렀는지만 기억한다(톡 = 누르기, 끌거나 꾹 = 집기)
          raycaster.set(o, dir); raycaster.far = 15; const pc = castFrom();   // 버튼을 누른 거면 끌기 안 함
          const hit = pc && pc.kind === 'panel' ? null : rayGrabbable(o, dir); g.holdDist = hit ? hit.t : 0; g.pending = hit ? hit.ob : null; g.tapObj = g.pending;
          g.downT = now; g.downDir = dir.clone();
        }
        g.point.copy(o).addScaledVector(dir, g.holdDist || 0.5);
        if (pinchNow && g.pending && (now - g.downT > 0.25 || dir.angleTo(g.downDir) > 0.035)) { const ob = g.pending; g.pending = null; g.tapObj = null; g.held = ob; ob.userData.grab.held = g; h.dragged = true; g.prev.copy(g.point); g.vel.set(0, 0, 0); sfx('click'); if (ob.userData.grab.onGrab) ob.userData.grab.onGrab(g); }
        else if (!pinchNow && g.pinch) { g.pending = null; if (g.held) release(g); }
        const v = g.point.clone().sub(g.prev).divideScalar(Math.max(dt, 1e-3)); g.vel.lerp(v, 0.35); g.prev.copy(g.point);
        if (g.held && g.held.userData.grab.onMove) g.held.userData.grab.onMove(g, g.point, g.vel);
        g.pinch = pinchNow;
        continue;
      }
      if (h.isHand) {
        const th = joint(g.i, 'thumb-tip'), ix = joint(g.i, 'index-finger-tip');
        if (th && ix) {
          const a = th.getWorldPosition(V3()), b = ix.getWorldPosition(V3()), d = a.distanceTo(b);
          pinchNow = g.pinch ? d < 0.035 : d < 0.022;
          g.point.copy(a).add(b).multiplyScalar(0.5); g.tip = b; g.ok = true;
        }
      } else {
        g.point.copy(h.grip.getWorldPosition(V3())).add(V3(0, 0, -0.05).applyQuaternion(h.grip.getWorldQuaternion(new THREE.Quaternion())));
        pinchNow = !!h.squeeze; g.ok = true;
      }
      if (!g.ok) { if (g.held) release(g); continue; }
      const v = g.point.clone().sub(g.prev).divideScalar(Math.max(dt, 1e-3)); g.vel.lerp(v, 0.35); g.prev.copy(g.point);
      if (pinchNow && !g.pinch) { const o = nearestGrabbable(g.point); if (o) { g.held = o; o.userData.grab.held = g; haptic(h, 0.4, 30); sfx('click'); if (o.userData.grab.onGrab) o.userData.grab.onGrab(g); } }
      else if (!pinchNow && g.pinch && g.held) release(g);
      if (g.held && g.held.userData.grab.onMove) g.held.userData.grab.onMove(g, g.point, g.vel);
      g.pinch = pinchNow;
      if (g.tip) poke(g, dt);
    }
  }
  function release(g) { const o = g.held; g.held = null; if (!o) return; o.userData.grab.held = null; if (o.userData.grab.onRelease) o.userData.grab.onRelease(g, g.vel.clone()); }
  // 검지 끝으로 패널 버튼을 직접 누르기(앞에서 판을 뚫고 들어갈 때 한 번)
  function poke(g, dt) {
    g.pokeT = Math.max(0, g.pokeT - dt);
    for (const p of panels) {
      if (!p.active || p.static || !p.buttons.length) { g.pokeZ.delete(p); continue; }
      const l = p.mesh.worldToLocal(g.tip.clone()), inside = Math.abs(l.x) < 0.5 && Math.abs(l.y) < 0.5;
      const prev = g.pokeZ.get(p); g.pokeZ.set(p, l.z);
      if (!inside) continue;
      const bi = p.hitButton({ x: l.x + 0.5, y: l.y + 0.5 });
      if (l.z < 0.06 && l.z > -0.03 && bi >= 0) p.setHover(bi);
      if (prev != null && prev > 0.008 && l.z <= 0.008 && bi >= 0 && g.pokeT === 0) { g.pokeT = 0.6; haptic(g.h, 0.5, 40); clickButton(p, bi); }
    }
  }
  function anyHolding() { return grabbers.some(g => g.held); }

  // 손목 판(미션 목록): 헤드셋에서는 왼손 위, 화면에서는 오른쪽 위
  function attachWrist() {
    if (!wristPanel) return;
    const left = hands.find(h => h.hand === 'left' && h.src);
    if (inXR() && !handheld && left) { unHud(wristPanel); left.grip.add(wristPanel.mesh); wristPanel.mesh.position.set(0, 0.07, -0.04); wristPanel.mesh.rotation.set(-0.95, 0, 0); }
    else if (inXR() && !handheld) { unHud(wristPanel); camera.add(wristPanel.mesh); wristPanel.mesh.position.set(0.42, 0.26, -1.0); wristPanel.mesh.rotation.set(0, 0, 0); }
    else placeHud(wristPanel, 'topRight', 0.34);   // 화면 모드: 오른쪽 위 계기판
  }
  function setWrist(p) { wristPanel = p; attachWrist(); }

  // 가리켜 누르기: 패널 버튼 + 물건(addPickable)
  const raycaster = new THREE.Raycaster();
  const pickables = [];
  function addPickable(obj, onPick, onHover) { obj.userData.pick = { onPick, onHover, enabled: true }; pickables.push(obj); return obj; }
  function removePickable(obj) { const i = pickables.indexOf(obj); if (i >= 0) pickables.splice(i, 1); if (obj.userData.pick && obj.userData.pick.onHover) obj.userData.pick.onHover(false); }
  function pickRoot(o) { while (o && !o.userData.pick) o = o.parent; return o; }
  function castFrom() {
    raycaster.camera = camera;   // 스프라이트 등 카메라가 필요한 물체 대비
    const list = panels.filter(p => p.active && !p.static && p.buttons.length).map(p => p.mesh);
    const ph = raycaster.intersectObjects(list, false)[0];
    let best = null;
    if (ph) { const p = ph.object.userData.panel, bi = p.hitButton(ph.uv); best = { kind: bi >= 0 ? 'panel' : 'none', p, bi, dist: ph.distance }; }
    const shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    const objs = pickables.filter(o => o.userData.pick.enabled && shown(o));
    const oh = objs.length ? raycaster.intersectObjects(objs, true)[0] : null;
    if (oh && (!best || oh.distance < best.dist)) { const root = pickRoot(oh.object); if (root) best = { kind: 'pick', obj: root, dist: oh.distance }; }
    return best;
  }
  let flatHover = null, hoverObjs = new Set();
  function updatePointers() {
    const anyPanel = new Set(), anyObj = new Set();
    if (inXR()) {
      for (const h of hands) {
        if (!h.src) { h.line.visible = false; continue; }
        h.line.visible = h.src.targetRayMode !== 'screen'; for (const m of h.model) m.visible = !isMR;
        const o = h.ray.getWorldPosition(V3()), q = h.ray.getWorldQuaternion(new THREE.Quaternion());
        raycaster.set(o, V3(0, 0, -1).applyQuaternion(q)); raycaster.far = 15;
        const r = castFrom();
        h.hit = r && r.kind !== 'none' ? r : null;
        h.line.material = h.hit ? lineMatOn : lineMatOff; h.line.scale.z = r ? r.dist : 0.35;
        h.dot.visible = !!h.hit; if (h.hit) h.dot.position.set(0, 0, -r.dist);
        if (h.hit && h.hit.kind === 'panel') { anyPanel.add(h.hit.p); if (h.hit.p.hover !== h.hit.bi) { h.hit.p.setHover(h.hit.bi); haptic(h, 0.15, 20); } }
        if (h.hit && h.hit.kind === 'pick') { if (!hoverObjs.has(h.hit.obj)) haptic(h, 0.15, 20); anyObj.add(h.hit.obj); }
      }
    } else if (flatHover) {
      if (flatHover.kind === 'panel') { anyPanel.add(flatHover.p); flatHover.p.setHover(flatHover.bi); }
      if (flatHover.kind === 'pick') anyObj.add(flatHover.obj);
    }
    for (const p of panels) if (!anyPanel.has(p) && p.hover >= 0 && !p.static) p.setHover(-1);
    for (const o of hoverObjs) if (!anyObj.has(o) && o.userData.pick.onHover) o.userData.pick.onHover(false);
    for (const o of anyObj) if (!hoverObjs.has(o)) { if (o.userData.pick.onHover) o.userData.pick.onHover(true); sfx('click'); }
    hoverObjs = anyObj;
  }
  function haptic(h, a, ms) { try { const act = h.src && h.src.gamepad && h.src.gamepad.hapticActuators && h.src.gamepad.hapticActuators[0]; if (act) act.pulse(a, ms); } catch (e) {} }
  let emptyAction = null;
  function onSelect(h) {
    audio.unlock();
    if (h && h.isHand) { const g = grabbers.find(x => x.h === h); if (g && g.ok && nearestGrabbable(g.point)) return; }   // 집으려는 중이면 빛줄기 누르기 안 함
    if (h && h.hit) { haptic(h, 0.5, 40); activate(h.hit); return; }
    if (emptyAction) emptyAction();
  }
  function activate(hit) {
    if (hit.kind === 'panel') clickButton(hit.p, hit.bi);
    else if (hit.kind === 'pick' && hit.obj.userData.pick.enabled) hit.obj.userData.pick.onPick(hit.obj);
  }
  function clickButton(p, bi) { const b = p.buttons[bi]; if (!b || !p.active) return; sfx('select'); if (b.onClick) b.onClick(bi); }

  // 막대: 왼쪽 걷기, 오른쪽 30도 돌기. 걸을 수 있는 둥근 범위 = bounds
  let canMove = true;
  const bounds = { x: 0, z: 0, r: 8.6 };
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
  function clampStage() { const f = feetPos(), dx = f.x - bounds.x, dz = f.z - bounds.z, r = Math.hypot(dx, dz); if (r > bounds.r) { rig.position.x -= dx * (1 - bounds.r / r); rig.position.z -= dz * (1 - bounds.r / r); } }

  // 화면 모드
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space' || e.code === 'Enter') onSelect(null); });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let drag = null;
  const cv = renderer.domElement;
  function flatPick(e) {
    const r = cv.getBoundingClientRect(), m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(m, camera); raycaster.far = 15;
    const hit = castFrom(); return hit && hit.kind !== 'none' ? hit : null;
  }
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: flatYaw, pitch: flatPitch }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (inXR()) return;
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); if (drag.moved > 6) { flatYaw = drag.yaw + dx * 0.005; flatPitch = Math.max(-1.2, Math.min(1.2, drag.pitch + dy * 0.004)); } }
    else flatHover = flatPick(e);
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return; const moved = drag.moved; drag = null;
    if (moved <= 6) { audio.unlock(); const hit = flatPick(e); if (hit) activate(hit); else if (emptyAction) emptyAction(); }
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

  // ───────────── 화면 모드 자막·계기판(PC·휴대폰: 패널을 화면에 붙인다) ─────────────
  // slot: 'top' | 'bottom' | 'center' | 'topRight' | 'topLeft', maxW = 화면 너비 중 비율
  const FLAT_HUD = true;
  function unHud(p) { p.hudSlot = null; p.hudScale = 1; p.mat.depthTest = true; p.mesh.renderOrder = 10; }
  function placeHud(p, slot = 'bottom', maxW = 0.94) {
    const d = 1.0; let vh = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
    if (inXR()) { const e = camera.projectionMatrix.elements; if (e[5] > 0 && e[0] > 0) { vh = 2 * d / e[5]; vw = 2 * d / e[0]; } }   // 휴대폰 카메라 화면 크기
    const pw = p.w * p.scale, ph = (p.h || 200) * p.scale;
    const s = Math.min(1.1, (vw * maxW) / pw, (vh * (slot === 'center' ? 0.8 : 0.42)) / ph);
    p.hudSlot = slot; p.hudMaxW = maxW; p.hudScale = s;
    if (p.mesh.parent !== camera) camera.add(p.mesh);
    const hw = pw * s / 2, hh = ph * s / 2, mx = vw * 0.03, my = vh * (slot === 'bottom' ? 0.075 : 0.04);   // 아래는 소리 버튼 자리만큼 띄움
    const x = slot === 'topRight' ? vw / 2 - hw - mx : slot === 'topLeft' ? -vw / 2 + hw + mx : 0;
    const y = slot.startsWith('top') ? vh / 2 - hh - my : slot === 'bottom' ? -vh / 2 + hh + my : slot === 'mid' ? vh * 0.1 : 0;
    p.mesh.position.set(x, y, -d); p.mesh.rotation.set(0, 0, 0);
    p.mat.depthTest = false; p.mesh.renderOrder = 20;
    p.mesh.scale.set(pw * s, ph * s, 1);
  }
  function hud(p, slot, maxW) { placeHud(p, slot, maxW); return p; }
  addEventListener('resize', () => { for (const p of panels) if (p.hudSlot && p.mesh.parent === camera) placeHud(p, p.hudSlot, p.hudMaxW); });

  // ───────────── 패널 놓기·말하기 ─────────────
  const eyeY = () => headPos().y;
  function face(p, pos) { p.mesh.position.copy(pos); p.mesh.lookAt(headPos()); }
  function placeToward(p, target, dist, side, dy) {
    if (useHud()) return placeHud(p, 'center');
    const f = feetPos(), dir = target.clone().sub(f); dir.y = 0; if (dir.lengthSq() < 0.01) dir.copy(headDir()); dir.normalize();
    const right = V3().crossVectors(dir, UP);
    const pos = f.addScaledVector(dir, dist).addScaledVector(right, side); pos.y = eyeY() + dy; face(p, pos);
  }
  function placeAhead(p, dist, side, dy) {
    if (useHud()) return placeHud(p, 'center');
    const dir = headDir(), right = V3().crossVectors(dir, UP);
    const pos = feetPos().addScaledVector(dir, dist).addScaledVector(right, side); pos.y = eyeY() + dy; face(p, pos);
  }
  const ui = {};
  for (const [k, w, bg] of [['talk', 900, PAPER], ['card', 840, PAPER], ['nav', 700, PAPER], ['toast', 780, 'rgba(33,31,46,0.9)'],
    ['title', 1300, 'rgba(33,31,46,0.72)'], ['intro', 1000, PAPER], ['info', 760, 'rgba(33,31,46,0.86)']]) { ui[k] = new Panel(k, w, bg); scene.add(ui[k].mesh); }

  let typing = false, skipType = false;
  async function typeText(p, it, cps) {
    typing = true; skipType = false; it.shown = 0; it.t0 = now; p.draw();
    const total = it.s.length; let shown = 0;
    await until(() => { if (skipType) return true; const n = Math.min(total, Math.ceil((now - it.t0) * cps)); if (n !== shown) { shown = n; it.shown = n; p.draw(); } return shown >= total; });
    it.shown = Infinity; p.draw(); typing = false;
  }
  function waitPick(p, autoIndex = 0, autoDelay = 1.2) {
    return new Promise(res => {
      let done = false;
      p.buttons.forEach((b, i) => { const prev = b.onClick; b.onClick = () => { if (done) return; done = true; emptyAction = null; if (prev) prev(i); res(i); }; });
      const single = p.buttons.length === 1 ? p.buttons[0] : null;
      emptyAction = () => { if (typing) skipType = true; else if (single) clickButton(p, 0); };
      if (AUTOTEST) { const t0 = now; until(() => done || (!typing && now - t0 > autoDelay && p.active)).then(() => { if (!done) clickButton(p, Math.min(typeof autoIndex === 'function' ? autoIndex() : autoIndex, p.buttons.length - 1)); }); }
    });
  }
  function nameRow(p, dot, name, role) { p.row([{ t: '●', size: 30, color: dot }, { t: name, size: 32, color: INK, bold: true }, { t: role, size: 24, color: '#8a8698' }], 14); }
  // speaker = { pos, name, role, dot, char } · options = 고를 것 목록(없으면 single 버튼 하나)
  async function say(speaker, text, options, single = '다음', o = {}) {
    const p = ui.talk; p.clear(); nameRow(p, speaker.dot, speaker.name, speaker.role);
    const body = p.text(text, 40, INK, { gap: o.sub ? 10 : 26 });
    if (o.sub) p.text(o.sub, 28, DIM, { gap: 24 });   // 작은 글(뜻풀이 등)
    if (options) options.forEach(t => p.button(t, null, '#3b3550', null, 96)); else p.button(single, null, '#ece5d8', null, 84);
    p.finish();
    const sp = speaker.char ? speaker.char.root.getWorldPosition(V3()) : speaker.pos;
    if (useHud()) placeHud(p, 'bottom');             // 화면 모드: 아래 자막
    else if (o.at) face(p, o.at);                                   // 정해 둔 자리
    else if (o.ahead || !sp) placeAhead(p, 1.25, o.side != null ? o.side : 0, o.dy != null ? o.dy : -0.3);   // 눈앞
    else { const dist = Math.max(1.0, Math.min(1.4, feetPos().distanceTo(V3(sp.x, 0, sp.z)) - 0.8)); placeToward(p, sp, dist, o.side != null ? o.side : 0.45, o.dy != null ? o.dy : -0.3); }
    p.show(true);
    if (speaker.char) speaker.char.setTalking(true);
    await typeText(p, body, 30);
    if (speaker.char) speaker.char.setTalking(false);
    const i = await waitPick(p, o.auto || 0);
    p.show(false); await wait(0.15);
    return i;
  }
  let toastTimer = 0;
  function showToast(text, hold = 3.4) {
    const t = ui.toast; t.clear(); t.pad = 30; t.text(text, 34, '#ffffff', { align: 'center', gap: 0 }); t.finish();
    if (useHud()) placeHud(t, 'mid', 0.9); else placeAhead(t, 1.5, 0, -0.55);
    t.show(true);
    const my = ++toastTimer; wait(hold).then(() => { if (my === toastTimer) t.show(false); });
  }
  function showTitle(text, at) { const t = ui.title; t.clear(); t.pad = 30; t.text(text, 64, '#ffffff', { bold: true, align: 'center', gap: 0 }); t.finish(); if (useHud()) placeHud(t, 'mid', 0.9); else if (at) face(t, at); else placeAhead(t, 2.2, 0, 0.35); t.show(true); }

  // 알갱이 터짐
  const bursts = [];
  function burst(pos, color, n, speed, life, size = 0.06) {
    const g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z; vel.push(V3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7))); }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: hex(color), size, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(pts); bursts.push({ pts, vel, t: 0, life });
  }
  function updateBursts(dt) {
    for (let j = bursts.length - 1; j >= 0; j--) {
      const b = bursts[j]; b.t += dt; const a = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, i) => { v.multiplyScalar(Math.exp(-1.5 * dt)); v.y -= 1.6 * dt; a[i * 3] += v.x * dt; a[i * 3 + 1] += v.y * dt; a[i * 3 + 2] += v.z * dt; });
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / b.life);
      if (b.t > b.life) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(j, 1); }
    }
  }

  // ───────────── 소리 읽어 주기(브라우저 내장 음성 합성, 한국어) ─────────────
  // 아이폰·안드로이드·PC 크롬은 한국어 음성이 있다. 퀘스트 브라우저는 확인 전. 음성이 없거나 자동 시험이면 글 길이만큼 기다리고 넘어간다.
  let koVoice = null;
  function pickVoice() { try { const vs = speechSynthesis.getVoices(); koVoice = vs.find(v => /^ko/i.test(v.lang) && /google|yuna|heami|sunhi|injoon|natural/i.test(v.name)) || vs.find(v => /^ko/i.test(v.lang)) || null; } catch (e) {} }
  if ('speechSynthesis' in window) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) {} }
  const hasKoVoice = () => { if (!koVoice) pickVoice(); return !!koVoice && !AUTOTEST; };
  function speak(text, o = {}) {
    text = String(text || '');
    return new Promise(res => {
      if (!hasKoVoice() || !text) { wait(Math.min(2.5, 0.3 + text.length * 0.08)).then(res); return; }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.voice = koVoice; u.rate = o.rate || 0.88; u.pitch = o.pitch || 1.05;
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        u.onend = fin; u.onerror = fin;
        setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { fin(); } }, 0);   // 취소 직후 바로 말하면 안드로이드에서 안 나올 때가 있어 한 틱 띄운다
        setTimeout(fin, 1500 + text.length * 260);   // 소리가 안 나도 흐름이 멈추지 않게
      } catch (e) { res(); }
    });
  }

  // ───────────── 휴대폰 혼합현실: 바닥·책상을 비춰 놓을 곳 정하기 ─────────────
  // 카메라가 비추는 면에 동그라미(레티클)가 뜨고, 화면을 톡 누르면 그 자리에 맵(anchor 점)이 놓인다.
  let hitSource = null, placing = null, placeAnchor = V3(0, 0, 0);
  const reticle = new THREE.Group(); reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
  { const r1 = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.09, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5cc3b4, transparent: true, opacity: 0.95, depthTest: false }));
    const r2 = new THREE.Mesh(new THREE.CircleGeometry(0.02, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    r1.renderOrder = r2.renderOrder = 30; reticle.add(r1, r2); }
  function updatePlacement(frame) {
    if (!placing || !frame) return;
    if (!hitSource) { reticle.visible = false; return; }
    const res = frame.getHitTestResults(hitSource);
    if (res.length) { const pose = res[0].getPose(renderer.xr.getReferenceSpace()); if (pose) { reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); return; } }
    reticle.visible = false;
  }
  function placeWorldAt(pos) {
    const cam = headPos(), yaw = Math.atan2(cam.x - pos.x, cam.z - pos.z);   // 맵 앞(+Z)이 휴대폰을 보게
    world.rotation.set(0, yaw, 0); world.updateMatrixWorld(true);
    const off = placeAnchor.clone().applyAxisAngle(UP, yaw);
    world.position.copy(pos).sub(off); world.updateMatrixWorld(true);
    shadowCatcher.position.y = placeAnchor.y + 0.002;
  }
  function onScreenTap(h) {
    audio.unlock();
    if (placing) {
      let pos;
      if (reticle.visible) pos = V3().setFromMatrixPosition(reticle.matrix);
      else { const d = headDir(); pos = headPos().addScaledVector(d, 1.6); pos.y -= 0.6; }   // 면을 못 찾으면 앞 1.6m
      placeWorldAt(pos); reticle.visible = false; world.visible = true; sfx('appear');
      const p = placing; placing = null; ui.info.show(false); p(); return;
    }
    // 톡: 빛줄기가 물건 모양을 살짝 빗나가도, 누르기 시작할 때 집기 범위에 있던 물건이면 그 물건을 누른 것으로
    const g = grabbers.find(x => x.h === h), ob = g && g.tapObj; if (g) g.tapObj = null;
    if (!h.hit && ob && ob.userData.pick && ob.userData.pick.enabled) { sfx('select'); ob.userData.pick.onPick(ob); return; }
    onSelect(h);
  }
  async function placeStep(session) {
    try { const vs = await session.requestReferenceSpace('viewer'); hitSource = await session.requestHitTestSource({ space: vs }); } catch (e) { hitSource = null; log('hit-test 없음', e && e.message); }
    world.visible = false;
    const p = ui.info; p.clear(); p.pad = 28;
    p.text('바닥이나 책상을 천천히 비춰 보세요.', 34, '#ffffff', { bold: true, align: 'center', gap: 8 });
    p.text('초록 동그라미가 뜨면 화면을 톡 눌러 놓아요.', 30, '#c9e3d4', { align: 'center', gap: 0 });
    p.finish(); placeHud(p, 'bottom'); p.show(true);
    await new Promise(r => { placing = r; });
    if (hitSource) { try { hitSource.cancel(); } catch (e) {} hitSource = null; }
  }

  // ───────────── 루프·시작 ─────────────
  const hooks = [];
  const clock = new THREE.Clock();
  // 카메라에 붙인 판(자막·계기판·눈앞 막)이 한 프레임 늦게 따라와 떨리지 않게:
  // 프레임마다 맨 먼저 이번 프레임의 머리(휴대폰) 위치를 카메라에 넣고, 붙은 판까지 갱신한 뒤 그린다.
  renderer.xr.cameraAutoUpdate = false;
  renderer.setAnimationLoop((time, frame) => {
    const dt = Math.min(0.05, clock.getDelta()); now += dt;
    if (renderer.xr.isPresenting) { rig.updateMatrixWorld(true); renderer.xr.updateCamera(camera); camera.updateMatrixWorld(true); }
    updatePlacement(frame);
    for (let i = waits.length - 1; i >= 0; i--) { const w = waits[i]; if ((w.t != null && now >= w.t) || (w.f && w.f())) { waits.splice(i, 1); w.r(); } }
    for (let i = updaters.length - 1; i >= 0; i--) if (!updaters[i]()) updaters.splice(i, 1);
    updateFlat(dt); updateSticks(dt); updateVignette(dt); updateHands(); updateGrab(dt); updatePointers(); updateChars(dt); updateBursts(dt);
    for (const f of hooks) f(dt);
    for (const p of panels) p.tick(dt);
    if (renderer.xr.isPresenting) { rig.updateMatrixWorld(true); renderer.xr.updateCamera(camera); camera.updateMatrixWorld(true); }   // 막대로 걸어 rig가 움직였을 때도 같은 프레임에 맞춘다
    renderer.render(scene, camera);
  });

  // opts = { main: async()=>{}, start: { pos:[x,z], look:[x,z] }, ready: Promise }
  function start(opts) {
    const cover = document.getElementById('cover'), vrBtn = document.getElementById('vrBtn'), mrBtn = document.getElementById('mrBtn'),
      flatBtn = document.getElementById('flatBtn'), note = document.getElementById('note'), loading = document.getElementById('loading');
    const s0 = opts.start || { pos: [0, 0], look: [0, -1] };
    place(P(s0.pos), P(s0.look));
    Promise.resolve(opts.ready).then(() => { if (loading) loading.style.display = 'none'; });
    let started = false;
    async function begin() { if (started) return; started = true; cover.style.display = 'none'; audio.unlock(); await opts.ready; await wait(0.3); opts.main(); }
    const sup = m => navigator.xr && navigator.xr.isSessionSupported ? navigator.xr.isSessionSupported(m).catch(() => false) : Promise.resolve(false);
    sup('immersive-vr').then(ok => {
      if (ok) { vrBtn.disabled = false; vrBtn.textContent = 'VR로 들어가기'; }
      else { vrBtn.textContent = '이 기기는 VR 미지원'; note.textContent = window.isSecureContext ? '메타 퀘스트 브라우저에서 이 주소를 열면 VR로 들어갈 수 있어요.' : 'VR은 https 주소에서만 열려요.'; }
    });
    sup('immersive-ar').then(ok => { if (ok && mrBtn) mrBtn.style.display = 'block'; });
    if (opts.anchor) placeAnchor.copy(opts.anchor);
    // 오류가 나면 화면에 잠깐 보여 준다(휴대폰·헤드셋에서 시험할 때 원인 찾기용)
    let lastErr = '', lastErrT = -99;   // 같은 오류는 다시 안 띄우고, 3초에 한 번만(매 프레임 오류 → 판을 계속 만들어 먹통 되는 것 방지)
    const showErr = m => { try { m = String(m).slice(0, 120); console.error('[HW] error', m); if (m === lastErr || now - lastErrT < 3) return; lastErr = m; lastErrT = now; if (started || renderer.xr.isPresenting) showToast('오류: ' + m, 6); else note.textContent = '오류: ' + m; } catch (e) {} };
    addEventListener('error', e => showErr(e.message));
    addEventListener('unhandledrejection', e => showErr(e.reason && e.reason.message || e.reason));
    let starting = false;
    const btns = [vrBtn, mrBtn, flatBtn].filter(Boolean);
    async function startXR(mode) {
      if (starting || renderer.xr.isPresenting) return;
      starting = true; btns.forEach(b => b.style.opacity = 0.5); note.textContent = '여는 중…';
      let session = null;
      try {
        const feats = ['local-floor', 'bounded-floor', 'hand-tracking'];
        if (mode === 'immersive-ar') feats.push('hit-test');
        session = await navigator.xr.requestSession(mode, { optionalFeatures: feats });
        handheld = mode === 'immersive-ar' && session.interactionMode === 'screen-space';   // 휴대폰
        // 좌표 기준: 헤드셋은 바닥 기준(local-floor), 휴대폰·바닥 기준이 없으면 local
        let ref = 'local-floor';
        if (handheld) ref = 'local';
        else { try { await session.requestReferenceSpace('local-floor'); } catch (e) { ref = 'local'; } }
        renderer.xr.setReferenceSpaceType(ref);
        if (mode === 'immersive-ar') setMR(true);
        await renderer.xr.setSession(session);
        session.addEventListener('end', () => location.reload());
        log('xr start', mode, 'interaction', session.interactionMode || '-', 'ref', ref);
        if (handheld) { rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); cover.style.display = 'none'; await wait(0.3); await placeStep(session); }
        else { await wait(0.6); place(P(s0.pos), P(s0.look)); }
        attachWrist();
        begin();
      } catch (e) {
        if (session) { try { await session.end(); } catch (e2) {} }   // 반쯤 열린 세션은 닫는다(다시 누를 때 '이미 켜진 세션' 오류 방지)
        setMR(false); handheld = false; starting = false; btns.forEach(b => b.style.opacity = 1);
        note.textContent = (mode === 'immersive-ar' ? '혼합현실을' : 'VR을') + ' 열지 못했어요: ' + e.message; log('xr fail', mode, e);
      }
    }
    vrBtn.addEventListener('click', () => startXR('immersive-vr'));
    if (mrBtn) mrBtn.addEventListener('click', () => startXR('immersive-ar'));
    flatBtn.addEventListener('click', begin);
    if (Q.has('mrtest')) { setMR(true); document.body.style.background = '#7d828a'; }
    if (AUTOTEST || Q.has('jump')) begin();
  }

  return {
    Q, AUTOTEST, log, audio, sfx, V3, P, hex, UP, angDiff,
    renderer, scene, camera, rig, world, vrOnly, sky, setSky, hemi, sun, fogVR, setMR, get isMR() { return isMR; },
    geo, std, glowMat, mesh, torus, ease, glowTex, glowSprite,
    wait, until, tween, every, get now() { return now; }, onUpdate: f => hooks.push(f),
    Panel, INK, DIM, PAPER, nameTag, ui, setWrist,
    loadChar, headPos, headDir, feetPos, inXR, place, moveTo, fadeTo, setFade, fadeMesh, vig, bounds,
    get canMove() { return canMove; }, set canMove(v) { canMove = v; },
    get emptyAction() { return emptyAction; }, set emptyAction(f) { emptyAction = f; },
    speak, hasKoVoice,
    hud, unHud, useHud, get handheld() { return handheld; }, addPickable, removePickable, addGrabbable, removeGrabbable, grabbers, anyHolding, hands, face, placeToward, placeAhead, typeText, waitPick, nameRow, say, showToast, showTitle, burst, start
  };
})();
