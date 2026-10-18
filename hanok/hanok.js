/* 「리니네 집에 놀러 가요」 v0.1 — 한옥 부엌에서 한국어 낱말·인사말 배우기 (2026-10-18, 공용 엔진 core.js)
   흐름: 인사 → ① 이름 듣기(물건 톡 → 한글·로마자·뜻 + 소리) → ② 따라 말하기 → ③ 밥상 차리기(듣고 하기) → ④ 묻고 답하기 → ⑤ 같이 먹기(대화) → 오늘 배운 말 카드
   주소 옵션: ?lang=fr|en|ko (뜻 언어, 기본 fr) · ?back=<주소> (끝 카드 '교실로 돌아가기') · ?autotest=1 · ?mrtest=1
   3D 모양은 임시 도형. 스케치팹 국가유산청 에셋(CC BY 4.0)으로 바꿀 때 buildShape()만 GLB 로더로 바꾸면 된다.     */
(function () {
  'use strict';
  const H = window.HW, A = window.HANOK;
  const { V3, P, hex, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[HANOK]', ...a);
  const LANG = ['fr', 'en', 'ko'].includes(H.Q.get('lang')) ? H.Q.get('lang') : 'fr';
  const BACK = H.Q.get('back');
  const gloss = o => (LANG === 'ko' || !o) ? '' : (o[LANG] || o.en || '');

  // 조사: 받침에 따라 을/를 · 이에요/예요
  const batchim = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const eulreul = w => w + (batchim(w) ? '을' : '를');
  const ieyo = w => w + (batchim(w) ? '이에요' : '예요');
  const fill = (s, w, other) => s.replace('{을를}', eulreul(w.ko)).replace('{이에요}', ieyo(w.ko)).replace('{그이에요}', other ? ieyo(other.ko) : '');

  // ───────────── 자리 ─────────────
  // 부엌 배치(10-19 다시): 뒷벽 왼쪽에 열린 부엌문(그 앞에 하나), 오른쪽에 찬장, 왼쪽 벽에 부뚜막(가마솥), 가운데 앞에 소반.
  // 혼합현실에서도 좁은 방에 들어가게 한데 모았다(부엌 벽·바닥·바깥 풍경은 VR·화면에서만, space.js).
  const S = window.HANOK_SPACE;
  const POS = { start: [0, 2.2], rini: [-0.62, -1.2] };
  const T = { x: 0.2, y: 0.32, z: -0.15, w: 0.9, d: 0.6 };                   // 밥상(소반): 윗면 높이는 모델 기준으로 다시 잰다
  const SHELF = { x: 0.82, z: -1.6, y: [0.5, 0.92], w: 1.1, d: 0.36 };       // 찬장 두 칸(뒷벽에 붙임)
  const STOVE = { x: -1.38, z: -0.7, len: 1.5 };                             // 부뚜막(왼쪽 벽, +X를 봄)
  const BOARD = V3(0.35, 1.85, -1.75), TALK = V3(-0.1, 1.5, -0.45);          // 안내판(VR) · 하나 말풍선 자리(VR)
  H.bounds.r = 5;
  H.setSky('#86b3df', '#e9eef0', '#c9b08a', '#e3e8e6');
  H.hemi.intensity = 0.95; H.sun.intensity = 1.05; H.sun.position.set(-3, 9, 5);

  const M = { wood: std('#8a5a2b', 0.7), darkwood: std('#5a3a1c', 0.65), white: std('#f6f1e7', 0.45), red: std('#d5452c', 0.55), soup: std('#b8743a', 0.4),
    water: std('#7fc4ee', 0.2, { transparent: true, opacity: 0.75 }), black: std('#2b2b2b', 0.5), clay: std('#9a5f3a', 0.75), silver: std('#cfd3d8', 0.3, { metalness: 0.4 }),
    green: std('#5f9e4a', 0.6), orange: std('#e79a3a', 0.6), yellow: std('#f2d44a', 0.5), paper: std('#fbf6ea', 0.9), floor: std('#c79a5e', 0.8), wall: std('#e7dcc6', 0.95) };
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  // ───────────── 한옥 부엌·마당(VR·화면에서만: 혼합현실에서는 실제 방) ─────────────
  let stove = null, space = null;
  function buildSpace() {
    space = S.build({ jarPromise: modelFor('hangari') });
    stove = S.buttumak(H.world, STOVE.x, STOVE.z, STOVE.len);   // 부뚜막은 가마솥 받침이라 혼합현실에서도 보인다
  }

  // ───────────── 밥상·선반 ─────────────
  let table;
  function buildTable() {   // 밥상 = 국가유산청 '소반' GLB(가로 2.3배·높이 1.4배). 못 불러오면 나무 판으로
    table = new THREE.Group(); table.position.set(T.x, 0, T.z); H.world.add(table);
    const lab = new Panel('tableLabel', 420, 'rgba(33,31,46,0.8)', 0.0008); lab.pad = 14; lab.text('밥상', 36, '#ffffff', { bold: true, align: 'center', gap: 0 }); lab.finish(); lab.pin();
    lab.mesh.position.set(0, T.y - 0.09, T.d / 2 + 0.02); table.add(lab.mesh);
    loads.push(loadModel('table', SPEC.table).then(r => {
      if (!r) { mesh(geo.box, M.darkwood, table, [0, T.y - 0.015, 0], [T.w, 0.03, T.d]); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.CylinderGeometry(0.02, 0.025, T.y - 0.03, 10), M.darkwood, table, [sx * (T.w / 2 - 0.08), (T.y - 0.03) / 2, sz * (T.d / 2 - 0.07)]); return; }
      table.add(r.wrap); T.y = r.size.y; T.w = r.size.x; T.d = r.size.z;   // 윗면 높이·크기는 모델 기준
      lab.mesh.position.set(0, T.y - 0.09, T.d / 2 + 0.02); log('table', T.w.toFixed(2), T.y.toFixed(2), T.d.toFixed(2));
    }));
  }
  function buildShelf() {   // 찬장(부뚜막 옆에 두던 그릇·반찬 선반 — 한국민족문화대백과 '부엌')
    const g = new THREE.Group(); g.position.set(SHELF.x, 0, SHELF.z); H.world.add(g);
    const wm = std('#7a5230', 0.75), dark = std('#4e3420', 0.8);
    for (const y of SHELF.y) mesh(geo.box, wm, g, [0, y - 0.0125, 0], [SHELF.w, 0.025, SHELF.d]);
    for (const sx of [-1, 1]) mesh(geo.box, dark, g, [sx * (SHELF.w / 2 - 0.02), SHELF.y[1] / 2 + 0.02, 0], [0.05, SHELF.y[1] + 0.04, SHELF.d + 0.02]);
    mesh(geo.box, wm, g, [0, SHELF.y[1] / 2, -SHELF.d / 2 + 0.01], [SHELF.w, SHELF.y[1], 0.02]).castShadow = false;   // 뒤판
    mesh(geo.box, dark, g, [0, 0.06, SHELF.d / 2 - 0.01], [SHELF.w, 0.12, 0.02]);   // 아래 막이판
  }

  // ───────────── 물건 모양: 국가유산청 3D 에셋(GLB, CC BY 4.0, assets/) ─────────────
  // 스케치팹 모델은 실제 크기(m)라 대부분 그대로 쓴다. 김치는 큰 대야(69cm)라 접시 크기로 줄이고, 밥상은 작은 소반(37cm)이라 가로 2.3배·높이 1.4배.
  // 물은 물병(Bottle) 대신 흰 그릇(geureut 모델)에 물을 담아 보여 준다(밥상에 병·항아리를 올렸다는 출처가 없음). 항아리는 부엌 물독(위에 바가지).
  // 숟가락·젓가락은 모델의 손잡이가 뒤(-Z)를 봐서 반 바퀴 돌린다 → 상 위에서 손잡이가 먹는 사람 쪽(앞)
  const SPEC = { bap: {}, guk: {}, kimchi: { width: 0.17 }, bibimbap: {}, sutgarak: { rotY: Math.PI }, jeotgarak: { rotY: Math.PI }, mul: { file: 'geureut' }, geureut: {}, gamasot: { scale: 0.85 }, hangari: { scale: 1.15 }, table: { sx: 2.3, sy: 1.4, sz: 2.3 } };
  const gltfLoader = new THREE.GLTFLoader();
  const loads = [], raw = {};
  const fetchGlb = file => raw[file] || (raw[file] = new Promise(res => gltfLoader.load('assets/' + file + '.glb', g => res(g.scene), undefined, err => { log('model load failed', file, err && err.message); res(null); })));
  function loadModel(id, spec) {   // 같은 파일을 여러 번 써도 한 번만 받는다(복제본을 돌려준다)
    return fetchGlb(spec.file || id).then(scene => {
      if (!scene) return null;
      const model = scene.clone(true);
      if (spec.rotY) { model.rotation.y = spec.rotY; model.updateMatrixWorld(true); }
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && 'metalness' in m) m.metalness = Math.min(m.metalness, 0.25); }); } });
      const box = new THREE.Box3().setFromObject(model), size = box.getSize(V3()), c = box.getCenter(V3());
      let s = spec.scale || 1; if (spec.width) s = spec.width / Math.max(size.x, size.z);
      const wrap = new THREE.Group(); wrap.scale.set(spec.sx || s, spec.sy || s, spec.sz || s);
      model.position.set(-c.x, -box.min.y, -c.z); wrap.add(model);   // 바닥 가운데가 원점이 되게
      return { wrap, size: V3(size.x * wrap.scale.x, size.y * wrap.scale.y, size.z * wrap.scale.z) };
    });
  }
  const modelFor = id => loadModel(id, SPEC[id] || {});
  // 물건마다 덧붙이는 것: 물 그릇에는 물, 물독에는 바가지
  const waterMat = std('#4f9fd8', 0.1, { transparent: true, opacity: 0.85, emissive: hex('#2a6fa0'), emissiveIntensity: 0.2 });
  const gourdMat = std('#d9c48f', 0.75, { side: THREE.DoubleSide });
  function decorate(id, wrap, size) {
    if (id === 'mul') { const w = mesh(new THREE.CircleGeometry(size.x * 0.4, 32), waterMat, wrap.parent, [0, size.y * 0.72, 0], null, [-Math.PI / 2, 0, 0]); w.castShadow = false; }
    if (id === 'gamasot') {   // 솥뚜껑: 낮은 둥근 쇠뚜껑 + 손잡이(모델은 뚜껑 없는 솥)
      const lidM = std('#2b2725', 0.55, { metalness: 0.35 }), r = size.x * 0.34;
      mesh(new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2), lidM, wrap.parent, [0, size.y - 0.015, 0], [1, 0.32, 1]);
      mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.05, 14), lidM, wrap.parent, [0, size.y - 0.015 + r * 0.32 + 0.02, 0]);
    }
    if (id === 'hangari') { const b = mesh(new THREE.SphereGeometry(0.1, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gourdMat, wrap.parent, [0.04, size.y - 0.03, 0.02], [1, 0.55, 1], [0.25, 0, 0.1]); }
  }
  // 물건 하나 = 그룹(불러오는 동안 흐린 임시 공 → GLB로 교체) + 보이지 않는 누르기 공
  function buildShape(id, parent) {
    const g = new THREE.Group(); parent.add(g);
    const big = id === 'gamasot' || id === 'hangari';
    const ph = mesh(geo.sphere, std('#d9d2c4', 0.8, { transparent: true, opacity: 0.45 }), g, [0, big ? 0.2 : 0.05, 0], big ? [0.45, 0.4, 0.45] : [0.12, 0.08, 0.12]); ph.castShadow = false;
    const hm = new THREE.Mesh(geo.lowSphere, hitMat); hm.scale.setScalar(big ? 0.5 : 0.16); hm.position.y = big ? 0.2 : 0.05; g.add(hm);   // 화면·빛줄기로 누르기 쉽게
    loads.push(modelFor(id).then(r => {
      if (!r) return;
      g.remove(ph); g.add(r.wrap); g.userData.size = r.size; decorate(id, r.wrap, r.size);
      hm.scale.setScalar(Math.max(0.14, Math.max(r.size.x, r.size.y, r.size.z) * 1.1)); hm.position.y = r.size.y / 2;
      if (g.userData.onLoaded) g.userData.onLoaded(r.size);
    }));
    return g;
  }

  // ───────────── 물건(낱말) ─────────────
  const items = [], byId = {};
  let stage = 'intro', target = null, wrongCount = 0;
  const heard = new Set();
  function buildItems() {
    const shelfSlots = { bap: [-0.38, 1], guk: [-0.13, 1], kimchi: [0.12, 1], bibimbap: [0.37, 1], sutgarak: [-0.4, 0], jeotgarak: [-0.29, 0], mul: [0.02, 0], geureut: [0.32, 0] };
    const floorSlots = { gamasot: [STOVE.x, STOVE.z - STOVE.len / 4, 'stove'], hangari: [STOVE.x + 0.08, STOVE.z + STOVE.len / 2 + 0.42] };   // 가마솥은 부뚜막 위, 물독은 부뚜막 앞 모서리
    for (const w of A.words) {
      const g = buildShape(w.id, H.world);
      if (shelfSlots[w.id]) { const [dx, lv] = shelfSlots[w.id]; g.position.set(SHELF.x + dx, SHELF.y[lv], SHELF.z); }
      else { const [x, z, on] = floorSlots[w.id]; g.position.set(x, on ? stove.top - 0.02 : 0, z); }   // 가마솥은 부뚜막 위에 건다(뚜껑은 decorate)
      const halo = H.glowSprite('#ffd27a', w.slot ? 0.3 : 0.7, 0); halo.position.y = w.slot ? 0.06 : 0.3; g.add(halo);
      g.userData.onLoaded = size => { halo.position.y = size.y / 2; halo.scale.setScalar(Math.max(0.25, Math.max(size.x, size.z) * 1.6)); };
      const it = { w, g, halo, home: g.position.clone(), onTable: false, held: false };
      H.addGrabbable(g, { radius: w.slot ? 0.12 : 0.32,
        onGrab: () => { it.held = true; hear(it, false); },
        onMove: (gr, p) => { g.position.copy(H.world.worldToLocal(p.clone())); },
        onRelease: () => { it.held = false; drop(it); } });
      H.addPickable(g, () => tap(it), on => { if (!it.onTable) g.scale.setScalar(on ? 1.12 : 1); });
      items.push(it); byId[w.id] = it;
    }
  }
  // 이름표: 한글 크게 + 로마자 + 뜻
  const label = new Panel('wordLabel', 560, 'rgba(33,31,46,0.9)', 0.0006); label.pad = 22; H.scene.add(label.mesh);   // 34cm: 혼합현실에서 그릇(15cm) 옆에 떠도 다른 물건을 가리지 않게
  label.mat.depthTest = false; label.mesh.renderOrder = 25;   // 선반·물건에 가려지지 않게 늘 위에
  let labelFor = null, labelHideAt = 0;
  function showLabel(it) {
    const w = it.w; label.clear();
    label.text(w.ko, 72, '#ffffff', { bold: true, align: 'center', gap: 2 });
    label.text(w.ro, 30, '#c9c4d6', { align: 'center', gap: gloss(w) ? 8 : 0 });
    if (gloss(w)) label.text(gloss(w), 34, '#ffd27a', { align: 'center', gap: 0 });
    label.finish(); label.show(true); labelFor = it; labelHideAt = H.now + 3.2; placeLabel();
  }
  function placeLabel() {
    const wp = labelFor.g.getWorldPosition(V3()); wp.y += (labelFor.g.userData.size ? labelFor.g.userData.size.y : 0.1) + 0.12; H.face(label, wp);
    label.hudScale = H.inXR() ? 1 : Math.max(1, H.headPos().distanceTo(wp) / 1.45);   // 화면 모드에서 멀리 서 있어도 읽히게
  }
  H.onUpdate(() => {
    if (labelFor) { placeLabel(); if (H.now > labelHideAt && !labelFor.held) { label.show(false); labelFor = null; } }
    for (const it of items) if (it.halo.material.opacity > 0) it.halo.material.opacity = 0.45 + 0.3 * Math.sin(H.now * 5);   // 힌트 반짝임
  });

  // 듣기: 이름표 + 소리 (+ 리니 한마디)
  let hearing = 0, rini = null;
  async function riniSpeak(text) { if (rini) rini.setTalking(true); await H.speak(text); if (rini) rini.setTalking(false); }
  function toast(text, hold) { showToast(text, hold); if (H.useHud()) H.hud(ui.toast, 'bottom', 0.92); }   // 화면 모드: 가운데 위는 집주인 얼굴을 가려서 아래로
  const riniToast = (text, hold) => toast(A.guide.name + ': ' + text, hold);
  async function hear(it, sentence) {
    const w = it.w; showLabel(it); heard.add(w.id); H.sfx('click');
    H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.08, 0)), '#ffffff', 14, 0.4, 0.5, 0.02);
    const my = ++hearing;
    await riniSpeak(w.ko);
    if (my !== hearing || !sentence) return;
    if (stage === 'listen' || stage === 'free') { riniToast(w.say + (w.note ? ' ' + w.note : ''), 4.5); await riniSpeak(w.say); }
  }
  function tap(it) {
    if (stage === 'set') { if (it === target) putOnTable(it, true); else if (!it.onTable) wrongPick(it); return; }
    hear(it, stage !== 'quiz' && stage !== 'repeat');
  }
  function drop(it) {   // 헤드셋·휴대폰 끌기: 밥상 위에 놓았는지
    const wp = it.g.getWorldPosition(V3()), lp = table.worldToLocal(wp.clone());
    const over = Math.abs(lp.x) < T.w / 2 + 0.1 && Math.abs(lp.z) < T.d / 2 + 0.1 && lp.y > T.y - 0.1 && lp.y < T.y + 0.45;
    if (over && it.w.slot && stage !== 'intro') {
      if (stage === 'set' && it !== target) { wrongPick(it); returnHome(it); return; }
      putOnTable(it, false); return;
    }
    if (wp.distanceTo(H.world.localToWorld(it.home.clone())) > 0.2) returnHome(it);
  }
  function returnHome(it) { if (it.moving) return; it.moving = true; const from = it.g.position.clone(); H.tween(0.45, k => it.g.position.lerpVectors(from, it.home, H.ease(k))).then(() => { it.moving = false; }); }
  // 안전장치: 물건이 엉뚱한 곳에 남으면 제자리로 — 잡힌 채 8초 넘게(손을 뗀 신호를 놓친 경우), 좌표가 깨짐, 제자리에서 30cm 넘게 떨어진 채 놓임
  H.onUpdate(dt => {
    for (const it of items) {
      if (it.onTable || it.moving || it.away) continue;
      const p = it.g.position; it.g.visible = true;
      if (![p.x, p.y, p.z].every(Number.isFinite)) { p.copy(it.home); continue; }
      if (it.held) {
        it.heldT = (it.heldT || 0) + dt;
        if (it.heldT > 8) { for (const gr of H.grabbers) if (gr.held === it.g) gr.held = null; if (it.g.userData.grab) it.g.userData.grab.held = null; it.held = false; it.heldT = 0; log('force release', it.w.id); returnHome(it); }
        continue;
      }
      it.heldT = 0;
      if (p.distanceTo(it.home) > 0.3) returnHome(it);
    }
  });
  function putOnTable(it, fly) {
    if (it.onTable || !it.w.slot) return;
    it.onTable = true; H.removeGrabbable(it.g); it.g.scale.setScalar(1); it.halo.material.opacity = 0;
    for (const gr of H.grabbers) if (gr.held === it.g) gr.held = null;   // 잡힌 채 올라가도 손에서 놓는다
    it.held = false;
    const to = V3(T.x + it.w.slot[0], T.y, T.z + it.w.slot[1]), from = it.g.position.clone();
    const mid = from.clone().lerp(to, 0.5); mid.y += fly ? 0.35 : 0.1;
    H.tween(fly ? 0.7 : 0.3, k => { const e = H.ease(k); const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); it.g.position.copy(a.lerp(b, e)); })
      .then(() => { it.g.position.copy(to); H.sfx('complete'); H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.05, 0)), '#bfe6ff', 30, 0.7, 0.8, 0.025); log('on table', it.w.id); });
  }
  function wrongPick(it) { wrongCount++; const msg = fill(A.set.wrong, target.w, it.w); riniToast(msg, 3.5); riniSpeak(msg); showLabel(it); hint(true); }
  function hint(on) { if (target) target.halo.material.opacity = on ? 0.7 : 0; }

  // ───────────── 안내판(지금 할 일)·미션 목록 ─────────────
  let board, task = '', taskExtra = '';
  function drawBoard() { const p = board; p.clear(); p.pad = 26; p.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 4 }); p.text(task || (curMission >= 0 ? MISSIONS[curMission] + ' — ' + A.guide.name + ' 말을 들어 보세요' : A.guide.name + ' 말을 들어 보세요'), 30, '#ffffff', { gap: taskExtra ? 8 : 0 }); if (taskExtra) p.text(taskExtra, 26, '#c9c4d6', { gap: 0 }); p.finish(); p.pin(); }
  function missionInfo(t, extra) { task = t || ''; taskExtra = extra || ''; if (board) drawBoard(); }
  function buildBoard() { board = new Panel('board', 620, 'rgba(33,31,46,0.88)'); drawBoard(); board.mesh.visible = false; board.mesh.position.copy(BOARD); H.world.add(board.mesh); board.mesh.lookAt(V3(POS.start[0], 1.6, POS.start[1])); }
  function showBoard() { if (H.useHud()) H.hud(board, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.56 : 0.36); board.mesh.visible = true; drawWrist(); }   // 세로 화면: 오른쪽 위 미션 목록(0.34)과 겹치지 않게
  const MISSIONS = [A.listen.title, A.repeat.title, A.set.title, A.quiz.title, A.meal.title], done = MISSIONS.map(() => false);
  let wrist, curMission = -1;
  function drawWrist() {
    const p = wrist; p.clear();
    p.row([{ t: A.wrist, size: 36, color: '#ffffff', bold: true }, { t: done.filter(Boolean).length + '/' + MISSIONS.length, size: 36, color: '#ffc766', bold: true }], 12);
    const cur = done.indexOf(false);
    MISSIONS.forEach((t, i) => p.row([{ t: done[i] ? '●' : i === cur ? '▶' : '○', size: 30, color: done[i] ? '#8fe3a8' : i === cur ? '#ffc766' : '#8a8698' }, { t, size: 30, color: done[i] ? '#b9b5c6' : '#ffffff' }], 8));
    p.finish(); p.show(true);
  }
  function finish(i) { done[i] = true; drawWrist(); H.sfx('complete'); }

  // ───────────── 리니 말 ─────────────
  const spk = () => ({ name: A.guide.name, role: A.guide.role, dot: A.guide.dot, char: rini, pos: P(POS.rini) });
  // 아래 자막 자리에 짧은 안내(toast)가 남아 있으면 겹치니 먼저 지운다
  async function riniSay(text, choices, single, g) { ui.toast.show(false); H.speak(text); return say(spk(), text, choices, single || '다음', { at: TALK, sub: gloss(g) || undefined }); }

  // ───────────── 화면 모드 카메라(PC·휴대폰): 단계마다 볼 것을 크게 (10-19 휴먼쌤 "질문 버튼이 그림을 가려") ─────────────
  // 볼 것(가운데 c, 너비 w, 높이 h)이 위쪽 계기판과 아래 자막·버튼 사이 칸에 들어오게 눈 자리를 잰다. 헤드셋·휴대폰 혼합현실에서는 안 움직인다.
  const portrait = () => H.camera.aspect < 1;
  function frame(c, w, h, o = {}) {
    const tv = Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)), th = tv * H.camera.aspect;
    const top = portrait() ? 0.6 : 0.78, bot = portrait() ? -0.3 : -0.28;   // 화면 높이(-1 아래 ~ 1 위) 중 볼 것이 들어갈 칸
    const yc = (top + bot) / 2, hh = (top - bot) / 2;
    const dir = V3(o.side || 0, o.up != null ? o.up : 0.5, 1).normalize();
    let dist = Math.max(w / 2 / (th * 0.94), h / 2 / (tv * hh), o.min || 0.45);
    if (o.maxZ != null) dist = Math.min(dist, (o.maxZ - c.z) / dir.z);   // 벽 밖으로 나가지 않게(안방 앞 문틀이 화면을 가린다)
    const eye = c.clone().addScaledVector(dir, dist), aim = c.clone(); aim.y -= yc * dist * tv;
    return { eye, aim };
  }
  const MEAL = { x: S.AN.cx + 0.2, z: S.AN.cz + 0.15 };   // 안방 밥상 자리
  const SHOTS = {
    room: () => frame(V3(-0.15, 0.85, -0.9), 2.3, 1.85, { up: 0.3 }),                                    // 하나·부엌문·밥상
    listen: () => portrait() ? frame(V3(SHELF.x - 0.05, 0.72, SHELF.z + 0.1), 1.2, 0.75, { up: 0.35 })   // 세로: 찬장
                             : frame(V3(-0.25, 0.6, -0.85), 3.4, 1.3, { up: 0.4 }),                      // 가로: 찬장·부뚜막 다
    stove: () => frame(V3(STOVE.x + 0.1, 0.5, STOVE.z + 0.35), 1.2, 1.0, { side: 0.8, up: 0.5 }),         // 부뚜막·가마솥·물독
    set: () => frame(V3((SHELF.x + T.x) / 2 - 0.05, 0.55, (SHELF.z + T.z) / 2), portrait() ? 1.3 : 1.9, 1.15, { up: 0.6 }),
    item: it => { const p = it.g.getWorldPosition(V3()), s = it.g.userData.size || V3(0.15, 0.1, 0.15); p.y += s.y / 2; return frame(p, Math.max(0.42, Math.max(s.x, s.z) * 2.6), Math.max(0.32, s.y * 2.6), { up: 0.75, min: 0.5 }); },
    meal: () => frame(V3(MEAL.x, 0.95, MEAL.z - 0.3), 1.7, 1.6, { up: 0.5, maxZ: S.AN.cz + S.AN.D / 2 - 0.15 })   // 안방: 하나·밥상·병풍
  };
  let shotTok = 0, curShot = null;
  function shot(name, arg, dur = 1.0) {
    if (H.inXR() || !SHOTS[name]) return Promise.resolve();
    curShot = [name, arg]; const my = ++shotTok;
    const s = SHOTS[name](arg), e0 = H.headPos(), a0 = e0.clone().addScaledVector(H.camera.getWorldDirection(V3()), s.eye.distanceTo(s.aim));
    if (dur <= 0) { H.flatView(s.eye, s.aim); return Promise.resolve(); }
    return H.tween(dur, k => { if (my !== shotTok) return; const e = H.ease(k); H.flatView(e0.clone().lerp(s.eye, e), a0.clone().lerp(s.aim, e)); });
  }
  addEventListener('resize', () => { if (curShot && !H.inXR()) setTimeout(() => shot(curShot[0], curShot[1], 0), 60); });   // 휴대폰을 돌리면 다시 맞춘다

  // 고르기 판: 화면 모드는 아래쪽(볼 것을 가리지 않게), 헤드셋은 물건 오른쪽 옆
  function placeCard(p, it) {
    if (H.useHud()) { H.hud(p, 'bottom'); return; }
    if (it) H.placeToward(p, it.g.getWorldPosition(V3()), 0.85, 0.45, -0.2); else H.placeAhead(p, 1.1, 0, -0.25);
  }
  function buttonRow(p, labels, color, h = 92) {   // 버튼을 가로 한 줄로(판이 낮아져 화면을 덜 가린다)
    const gap = 16, n = labels.length, bw = (p.w - p.pad * 2 - gap * (n - 1)) / n, y = p.y;
    labels.forEach((t, i) => { const b = p.button(t, null, Array.isArray(color) ? color[i] : color, null, h, 0); b.x = p.pad + i * (bw + gap); b.w = bw; b.y = y; p.y = y; });
    p.y = y + h + 16;
  }

  // 밥상을 안방으로(부엌에서 차린 상은 방으로 들고 가서 먹었다). 혼합현실은 실제 방 그대로라 옮기지 않는다.
  async function toAnbang() {
    if (H.isMR) return;
    await H.fadeTo(1, 0.45);
    space.show('anbang'); stove.g.visible = false; for (const it of items) if (!it.onTable) { it.away = true; it.g.visible = false; }   // 부엌 것은 숨긴다
    const dx = MEAL.x - T.x, dz = MEAL.z - T.z;
    table.position.x += dx; table.position.z += dz; T.x = MEAL.x; T.z = MEAL.z;
    for (const it of items) if (it.onTable) { it.g.position.x += dx; it.g.position.z += dz; it.home.copy(it.g.position); }
    POS.rini = [MEAL.x, MEAL.z - 0.85];
    if (rini) rini.root.position.copy(P(POS.rini));
    TALK.set(MEAL.x - 0.35, 1.45, MEAL.z + 0.35);
    if (!board.hudSlot) { board.mesh.position.set(MEAL.x + 0.9, 1.75, MEAL.z - 0.9); board.mesh.lookAt(V3(MEAL.x, 1.6, MEAL.z + 1.2)); }
    Object.assign(H.bounds, { x: S.AN.cx, z: S.AN.cz, r: 1.6 });
    if (H.inXR()) H.place(P([MEAL.x, MEAL.z + 1.0]), P([MEAL.x, MEAL.z - 0.6])); else shot('meal', null, 0);
    log('to anbang');
    await wait(0.25); await H.fadeTo(0, 0.6);
  }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#7a6ad0', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 72, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 14 });
    p.text(A.credit, 22, DIM, { align: 'center', gap: 30 });
    p.button(A.start, null, '#7f8fd6', null, 110);
    shot('room', null, 0);   // 화면 모드: 하나·부엌문·밥상이 화면 비율에 맞게 들어오는 자리
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat', 'lang', LANG);
    await waitPick(p, 0, 1.0); p.show(false);
    await wait(0.3);   // 배경음악 없음(휴먼쌤 10-18 "배경음악은 빼줘") — 효과음과 읽어 주는 소리만
    if (!H.hasKoVoice() && !H.AUTOTEST) toast('이 기기에는 한국어 음성이 없어요. 글로만 보여 줄게요.', 4);
  }
  async function hello() { log('state hello'); if (rini) rini.wave(); for (const l of A.hello) await riniSay(l.text, l.choices, null, l.gloss); }
  async function listenStage() {
    stage = 'listen'; curMission = 0; log('state listen');
    shot('listen');
    await riniSay(A.listen.ask, null, '해 볼게');
    let last = -1, panned = !portrait();   // 세로 화면은 찬장만 보이니, 세 개 들으면 부뚜막 쪽으로 돌려 준다
    if (H.AUTOTEST) (async () => { for (const id of ['bap', 'kimchi', 'sutgarak', 'mul', 'gamasot']) { await wait(0.9); tap(byId[id]); } })();
    await until(() => {
      const n = Math.min(5, heard.size); if (n !== last) { last = n; missionInfo(A.listen.ask, A.listen.counter + ' ' + n + ' / 5'); }
      if (!panned && n >= 3 && !H.inXR()) { panned = true; wait(1.6).then(() => { shot('stove', null, 1.4); toast(A.listen.stove, 3); }); }
      return n >= 5;
    });
    await wait(1.2); missionInfo(''); finish(0); await riniSay(A.listen.done);
  }
  async function repeatStage() {
    stage = 'repeat'; curMission = 1; log('state repeat');
    await riniSay(A.repeat.ask, null, '좋아요'); missionInfo(A.repeat.ask);
    for (const id of A.repeatWords) {
      const it = byId[id], w = it.w; it.halo.material.opacity = 0.6;
      await shot('item', it, 0.9);
      for (;;) {
        const p = ui.card; p.clear(); p.pad = 40;   // 낱말 카드는 아래쪽, 물건은 위쪽에 크게(이름표는 카드에 같은 글이 있어 안 띄운다)
        p.text(A.repeat.card, 26, '#7a6ad0', { bold: true, align: 'center', gap: 4 });
        p.text(w.ko, 84, INK, { bold: true, align: 'center', gap: 2 });
        p.text(w.ro + (gloss(w) ? '  ·  ' + gloss(w) : ''), 28, DIM, { align: 'center', gap: 20 });
        buttonRow(p, [A.repeat.again, A.repeat.said], ['#ece5d8', '#7f8fd6'], 88);
        p.finish(); placeCard(p, it); p.show(true);
        await riniSpeak(w.ko); await wait(0.3);
        const i = await waitPick(p, 1, 1.0); p.show(false);
        if (i === 1) break;
      }
      it.halo.material.opacity = 0; toast(A.repeat.good, 1.2); H.sfx('piece'); await wait(0.6);
    }
    missionInfo(''); finish(1); shot('room'); await riniSay(A.repeat.done);
  }
  async function setStage() {
    stage = 'set'; curMission = 2; log('state set');
    shot('set');
    await riniSay(A.set.ask, null, '해 볼게');
    for (const id of A.tableWords) {
      target = byId[id]; wrongCount = 0; hint(false);
      if (target.onTable) continue;
      const msg = fill(A.set.put, target.w); missionInfo(msg); riniSpeak(msg);
      const hintAt = H.now + 7;
      if (H.AUTOTEST) wait(1.0).then(() => tap(target));
      await until(() => { if (!target.onTable && H.now > hintAt) hint(true); return target.onTable; });
      hint(false); const ok = fill(A.set.ok, target.w); riniToast(ok, 2.2); await riniSpeak(ok); await wait(0.3);
    }
    target = null; missionInfo(''); finish(2); await riniSay(A.set.done);
  }
  async function quizStage() {
    stage = 'quiz'; curMission = 3; log('state quiz');
    await riniSay(A.quiz.ask, null, '네'); missionInfo(A.quiz.q);
    for (const id of A.quizWords) {
      const it = byId[id];
      await shot('item', it, 0.9);   // 묻는 물건을 화면 위쪽에 크게, 고르기 버튼은 아래 한 줄(10-19 휴먼쌤 "버튼이 그림을 가려")
      it.halo.material.opacity = 0.8; H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.1, 0)), '#ffd27a', 20, 0.5, 0.7, 0.025);
      const others = A.words.filter(w => w.id !== id && w.slot).sort(() => Math.random() - 0.5).slice(0, 2);
      const opts = [it.w, ...others].sort(() => Math.random() - 0.5), correct = opts.indexOf(it.w);
      const p = ui.card; p.clear(); p.pad = 36;
      p.text(A.quiz.q, 42, INK, { bold: true, align: 'center', gap: 16 });
      buttonRow(p, opts.map(w => w.ko), '#3b3550', 96);
      p.finish(); placeCard(p, it); p.show(true);
      riniSpeak(A.quiz.q);
      const i = await waitPick(p, correct, H.Q.get('slow') ? 4 : 1.0); p.show(false);
      if (i === correct) { toast(A.quiz.ok, 1.4); H.sfx('complete'); await riniSpeak(A.quiz.ok); }
      else { const msg = fill(A.quiz.wrong, it.w); toast(msg, 2.5); await riniSpeak(msg); }   // 틀려도 정답을 알려 주고 넘어간다
      it.halo.material.opacity = 0; await wait(0.4);
    }
    missionInfo(''); finish(3); shot('room'); await riniSay(A.quiz.done);
  }
  async function mealStage() {
    stage = 'meal'; curMission = 4; log('state meal');
    await riniSay(A.meal.move.text, A.meal.move.choices, null, A.meal.move.gloss);
    await toAnbang();
    for (const l of A.meal.lines) { const i = await riniSay(l.text, l.choices, null, l.gloss); if (l.reply && l.reply[i]) await riniSay(l.reply[i]); }
    finish(4);
  }
  async function ending() {
    stage = 'free'; log('state ending');
    const E = A.ending;
    for (;;) {
      let p = ui.card; p.clear(); p.pad = 40;   // 1장: 오늘 배운 낱말
      p.text(E.cardKicker, 26, '#7a6ad0', { bold: true, align: 'center', gap: 4 });
      p.text(E.cardTitle, 50, INK, { bold: true, align: 'center', gap: 14 });
      for (const w of A.words) p.row([{ t: w.ko, size: 32, color: INK, bold: true }, { t: w.ro, size: 22, color: DIM }, { t: gloss(w), size: 24, color: '#5a5470' }], 6);
      p.space(10); p.button('다음', null, '#7f8fd6', null, 84);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      log('state card');
      await waitPick(p, 0, 1.0); p.show(false); await wait(0.2);
      p = ui.card; p.clear(); p.pad = 40;   // 2장: 인사말 · 문화 한 조각
      p.text('오늘 배운 인사말', 26, '#7a6ad0', { bold: true, align: 'center', gap: 10 });
      for (const ph of A.phrases) p.row([{ t: ph.ko, size: 30, color: INK, bold: true }, { t: gloss(ph), size: 22, color: '#5a5470' }], 6);
      p.space(10); p.text(E.cultureTitle, 24, '#7a6ad0', { bold: true, gap: 4 });
      for (const c of E.culture) p.text('· ' + c, 24, '#5a5470', { gap: 4 });
      if (E.cultureSrc) p.text(E.cultureSrc, 18, DIM, { gap: 4 });
      p.space(12);
      p.button(E.free, null, '#7f8fd6', null, 84); p.button(E.restart, null, '#ece5d8', null, 76); p.button(BACK ? E.back : E.exit, null, '#3b3550', null, 76);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { toast('물건을 눌러 이름을 다시 들어 보세요.', 3); await until(() => false); }
      if (i === 2) { if (BACK) { location.href = BACK; return; } const s = H.renderer.xr.getSession(); if (s) { s.end(); return; } }
      location.reload(); return;
    }
  }
  // 시험용: ?jump=repeat|set|quiz|meal|ending (그 단계부터), ?slow=1 (자동 시험에서 고르기 판을 4초씩 띄워 둠)
  const JUMP = ['listen', 'repeat', 'set', 'quiz', 'meal', 'ending'].indexOf(H.Q.get('jump'));
  async function main() {
    await intro();
    if (JUMP < 0) await hello();
    showBoard();
    if (JUMP > 0) { for (let i = 0; i < Math.min(JUMP, 5); i++) done[i] = true; drawWrist(); if (JUMP > 2) for (const id of A.tableWords) putOnTable(byId[id], false); }
    const stages = [listenStage, repeatStage, setStage, quizStage, mealStage, ending];
    for (let i = Math.max(0, JUMP); i < stages.length; i++) await stages[i]();
  }

  // ───────────── 짓기·시작 ─────────────
  if (window.HANOK_VOICE && !H.Q.has('tts')) H.voicePack('voice/', window.HANOK_VOICE);   // 하나 목소리 파일(voice/voice.js). ?tts=1 = 예전 브라우저 음성 합성으로 비교
  buildSpace(); buildTable(); buildShelf(); buildItems(); buildBoard();
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  // 집주인 = Tripo로 만든 한복 입은 여성(assets/host.glb, 10-18): 동작 idle(편히 서 있기)·talk(설명하며 말하기)·bow(공손한 절 → 인사 때 wave 자리에)
  const riniReady = H.loadChar({ url: 'assets/host.glb', height: 1.58, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', wave: 'bow' }, glow: 0.18 }).then(c => { rini = c; });
  const ready = Promise.all([riniReady, ...loads]).then(() => log('assets loaded', loads.length));
  H.start({ main, ready, start: { pos: POS.start, look: [T.x, T.z] }, anchor: V3(0, 0, 0) });
  if (H.Q.has('speaktest')) ready.then(async () => {   // 시험용: 목소리 파일을 실제로 받아 풀고 트는 길(자동 시험은 길이만 기다려서 따로 본다)
    H.audio.unlock(); await wait(0.5);
    for (const t of ['밥', '이건 밥이에요.', '그건 김치예요. 밥을 찾아 보세요.', '없는 문장이에요.']) { const t0 = performance.now(); await H.speak(t); log('speaktest', t, ((performance.now() - t0) / 1000).toFixed(2) + 's', 'ctx', H.audio.state); }
  });
  if (H.Q.has('fps')) { let n = 0, t0 = performance.now(); H.onUpdate(() => { n++; const t = performance.now(); if (t - t0 > 3000) { log('fps', (n * 1000 / (t - t0)).toFixed(1), 'calls', H.renderer.info.render.calls, 'tris', H.renderer.info.render.triangles); n = 0; t0 = t; } }); }   // 시험용: 초당 그림 수
  window.HANOKX = { items, byId, tap, putOnTable, get stage() { return stage; }, get target() { return target; }, get rini() { return rini; } };
})();
