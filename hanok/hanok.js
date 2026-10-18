/* 「리니네 집에 놀러 가요」 v0.1 — 한옥 부엌에서 한국어 낱말·인사말 배우기 (2026-10-18, 공용 엔진 core.js)
   흐름: 인사 → ① 이름 듣기(물건 톡 → 한글·로마자·뜻 + 소리) → ② 따라 말하기 → ③ 밥상 차리기(듣고 하기) → ④ 묻고 답하기 → ⑤ 같이 먹기(대화) → 오늘 배운 말 카드
   주소 옵션: ?lang=fr|en|ko (뜻 언어, 기본 fr) · ?back=<주소> (끝 카드 '교실로 돌아가기') · ?autotest=1 · ?mrtest=1
   3D 모양은 임시 도형. 스케치팹 국가유산청 에셋(CC BY 4.0)으로 바꿀 때 buildShape()만 GLB 로더로 바꾸면 된다.     */
(function () {
  'use strict';
  const H = window.HW, A = window.HANOK;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
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
  const POS = { start: [0, 2.0], rini: [0.0, -1.1] };
  const T = { x: 0, y: 0.32, z: 0.1, w: 0.9, d: 0.6 };                       // 밥상(소반): 윗면 높이 0.32
  const SHELF = { x: 1.0, z: -0.2, y: [0.45, 0.85], w: 0.95, d: 0.34 };      // 오른쪽 선반 두 칸
  const BOARD = V3(0.0, 1.78, -1.95), TALK = V3(0, 1.55, -0.55);             // 리니 뒤 안내판(VR) · 리니 말풍선 자리(VR)
  H.bounds.r = 5;
  H.setSky('#f2d9ad', '#f8f0e4', '#efe6d6');
  H.hemi.intensity = 0.9; H.sun.intensity = 1.0; H.sun.position.set(-3, 9, 5);

  const M = { wood: std('#8a5a2b', 0.7), darkwood: std('#5a3a1c', 0.65), white: std('#f6f1e7', 0.45), red: std('#d5452c', 0.55), soup: std('#b8743a', 0.4),
    water: std('#7fc4ee', 0.2, { transparent: true, opacity: 0.75 }), black: std('#2b2b2b', 0.5), clay: std('#9a5f3a', 0.75), silver: std('#cfd3d8', 0.3, { metalness: 0.4 }),
    green: std('#5f9e4a', 0.6), orange: std('#e79a3a', 0.6), yellow: std('#f2d44a', 0.5), paper: std('#fbf6ea', 0.9), floor: std('#c79a5e', 0.8), wall: std('#e7dcc6', 0.95) };
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  // ───────────── 한옥 방(VR에서만: 혼합현실에서는 실제 방) ─────────────
  function buildSpace() {
    const v = H.vrOnly;
    mesh(new THREE.CircleGeometry(6, 64), M.floor, v, [0, 0, 0], null, [-Math.PI / 2, 0, 0]).castShadow = false;
    const lineM = new THREE.MeshBasicMaterial({ color: '#a97e49', transparent: true, opacity: 0.5 });
    for (let x = -5; x <= 5; x += 0.5) mesh(geo.box, lineM, v, [x, 0.002, 0], [0.01, 0.001, 11]).castShadow = false;   // 마루 널 줄
    for (const x of [-1.5, 0, 1.5]) {   // 뒷벽: 한지 문 세 짝(창살)
      mesh(geo.box, M.paper, v, [x, 1.2, -2.5], [1.4, 2.4, 0.04]).castShadow = false;
      const bar = (px, py, sx, sy) => { mesh(geo.box, M.darkwood, v, [x + px, py, -2.47], [sx, sy, 0.03]).castShadow = false; };
      bar(0, 2.38, 1.46, 0.06); bar(0, 0.03, 1.46, 0.06); bar(-0.7, 1.2, 0.06, 2.4); bar(0.7, 1.2, 0.06, 2.4);
      for (let i = 1; i < 4; i++) bar(-0.7 + i * 0.35, 1.2, 0.025, 2.3);
      for (let j = 1; j < 7; j++) bar(0, j * 0.34, 1.4, 0.025);
    }
    for (const s of [-1, 1]) mesh(geo.box, M.wall, v, [s * 2.7, 1.2, -0.4], [0.06, 2.4, 4.3]).castShadow = false;   // 옆벽
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
  function buildShelf() {
    const g = new THREE.Group(); g.position.set(SHELF.x, 0, SHELF.z); H.world.add(g);
    for (const y of SHELF.y) mesh(geo.box, M.wood, g, [0, y - 0.0125, 0], [SHELF.w, 0.025, SHELF.d]);
    for (const sx of [-1, 1]) mesh(geo.box, M.wood, g, [sx * (SHELF.w / 2 - 0.02), SHELF.y[1] / 2, 0], [0.04, SHELF.y[1], SHELF.d]);
    mesh(geo.box, M.wood, g, [0, SHELF.y[1] / 2, -SHELF.d / 2 + 0.01], [SHELF.w, SHELF.y[1], 0.02]).castShadow = false;   // 뒤판
  }

  // ───────────── 물건 모양: 국가유산청 3D 에셋(GLB, CC BY 4.0, assets/) ─────────────
  // 스케치팹 모델은 실제 크기(m)라 대부분 그대로 쓴다. 김치는 큰 대야(69cm)라 접시 크기로 줄이고, 밥상은 작은 소반(37cm)이라 가로 2.3배·높이 1.4배.
  const SPEC = { bap: {}, guk: {}, kimchi: { width: 0.17 }, bibimbap: {}, sutgarak: {}, jeotgarak: {}, mul: {}, geureut: {}, gamasot: { scale: 0.85 }, hangari: { scale: 0.9 }, table: { sx: 2.3, sy: 1.4, sz: 2.3 } };
  const gltfLoader = new THREE.GLTFLoader();
  const loads = [];
  function loadModel(id, spec) {
    return new Promise(res => gltfLoader.load('assets/' + id + '.glb', gltf => {
      const model = gltf.scene;
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && 'metalness' in m) m.metalness = Math.min(m.metalness, 0.25); }); } });
      const box = new THREE.Box3().setFromObject(model), size = box.getSize(V3()), c = box.getCenter(V3());
      let s = spec.scale || 1; if (spec.width) s = spec.width / Math.max(size.x, size.z);
      const wrap = new THREE.Group(); wrap.scale.set(spec.sx || s, spec.sy || s, spec.sz || s);
      model.position.set(-c.x, -box.min.y, -c.z); wrap.add(model);   // 바닥 가운데가 원점이 되게
      res({ wrap, size: V3(size.x * wrap.scale.x, size.y * wrap.scale.y, size.z * wrap.scale.z) });
    }, undefined, err => { log('model load failed', id, err && err.message); res(null); }));
  }
  // 물건 하나 = 그룹(불러오는 동안 흐린 임시 공 → GLB로 교체) + 보이지 않는 누르기 공
  function buildShape(id, parent) {
    const g = new THREE.Group(); parent.add(g);
    const big = id === 'gamasot' || id === 'hangari';
    const ph = mesh(geo.sphere, std('#d9d2c4', 0.8, { transparent: true, opacity: 0.45 }), g, [0, big ? 0.2 : 0.05, 0], big ? [0.45, 0.4, 0.45] : [0.12, 0.08, 0.12]); ph.castShadow = false;
    const hm = new THREE.Mesh(geo.lowSphere, hitMat); hm.scale.setScalar(big ? 0.5 : 0.16); hm.position.y = big ? 0.2 : 0.05; g.add(hm);   // 화면·빛줄기로 누르기 쉽게
    loads.push(loadModel(id, SPEC[id] || {}).then(r => {
      if (!r) return;
      g.remove(ph); g.add(r.wrap); g.userData.size = r.size;
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
    const shelfSlots = { bap: [-0.34, 1], guk: [-0.11, 1], kimchi: [0.12, 1], bibimbap: [0.35, 1], sutgarak: [-0.3, 0], jeotgarak: [-0.18, 0], mul: [0.05, 0], geureut: [0.3, 0] };
    const floorSlots = { gamasot: [-0.9, -0.35], hangari: [-1.3, 0.05] };
    for (const w of A.words) {
      const g = buildShape(w.id, H.world);
      if (shelfSlots[w.id]) { const [dx, lv] = shelfSlots[w.id]; g.position.set(SHELF.x + dx, SHELF.y[lv], SHELF.z); }
      else { const [x, z] = floorSlots[w.id]; g.position.set(x, 0, z); }
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
  const label = new Panel('wordLabel', 560, 'rgba(33,31,46,0.9)'); label.pad = 22; H.scene.add(label.mesh);
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
    label.hudScale = H.inXR() ? 1 : Math.max(1, H.headPos().distanceTo(wp) / 2.4);   // 화면 모드에서 멀리 서 있어도 읽히게
  }
  H.onUpdate(() => {
    if (labelFor) { placeLabel(); if (H.now > labelHideAt && !labelFor.held) { label.show(false); labelFor = null; } }
    for (const it of items) if (it.halo.material.opacity > 0) it.halo.material.opacity = 0.45 + 0.3 * Math.sin(H.now * 5);   // 힌트 반짝임
  });

  // 듣기: 이름표 + 소리 (+ 리니 한마디)
  let hearing = 0, rini = null;
  async function riniSpeak(text) { if (rini) rini.setTalking(true); await H.speak(text); if (rini) rini.setTalking(false); }
  const riniToast = (text, hold) => showToast('리니: ' + text, hold);
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
  function returnHome(it) { const from = it.g.position.clone(); H.tween(0.45, k => it.g.position.lerpVectors(from, it.home, H.ease(k))); }
  function putOnTable(it, fly) {
    if (it.onTable || !it.w.slot) return;
    it.onTable = true; H.removeGrabbable(it.g); it.g.scale.setScalar(1); it.halo.material.opacity = 0;
    const to = V3(T.x + it.w.slot[0], T.y, T.z + it.w.slot[1]), from = it.g.position.clone();
    const mid = from.clone().lerp(to, 0.5); mid.y += fly ? 0.35 : 0.1;
    H.tween(fly ? 0.7 : 0.3, k => { const e = H.ease(k); const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); it.g.position.copy(a.lerp(b, e)); })
      .then(() => { H.sfx('complete'); H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.05, 0)), '#bfe6ff', 30, 0.7, 0.8, 0.025); log('on table', it.w.id); });
  }
  function wrongPick(it) { wrongCount++; const msg = fill(A.set.wrong, target.w, it.w); riniToast(msg, 3.5); riniSpeak(msg); showLabel(it); hint(true); }
  function hint(on) { if (target) target.halo.material.opacity = on ? 0.7 : 0; }

  // ───────────── 안내판(지금 할 일)·미션 목록 ─────────────
  let board, task = '', taskExtra = '';
  function drawBoard() { const p = board; p.clear(); p.pad = 26; p.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 4 }); p.text(task || (curMission >= 0 ? MISSIONS[curMission] + ' — 리니 말을 들어 보세요' : '리니 말을 들어 보세요'), 30, '#ffffff', { gap: taskExtra ? 8 : 0 }); if (taskExtra) p.text(taskExtra, 26, '#c9c4d6', { gap: 0 }); p.finish(); p.pin(); }
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
  async function riniSay(text, choices, single, g) { H.speak(text); return say(spk(), text, choices, single || '다음', { at: TALK, sub: gloss(g) || undefined }); }

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
    if (!H.inXR()) {   // 화면 모드: 화면 비율에 맞춰 밥상·선반·가마솥이 다 보이는 거리에 선다
      const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)) * H.camera.aspect);
      const dist = Math.max(2.0, Math.min(5.5, 1.6 / Math.tan(hf)));
      H.place(P([0, T.z + dist]), V3(0, H.camera.aspect < 1 ? 0.45 : 0.95, -0.4));   // 세로 화면은 조금 더 내려다봐서 방이 화면 가운데 오게

    }
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat', 'lang', LANG);
    await waitPick(p, 0, 1.0); p.show(false);
    H.audio.music('day'); await wait(0.3);
    if (!H.hasKoVoice() && !H.AUTOTEST) showToast('이 기기에는 한국어 음성이 없어요. 글로만 보여 줄게요.', 4);
  }
  async function hello() { log('state hello'); if (rini) rini.wave(); for (const l of A.hello) await riniSay(l.text, l.choices, null, l.gloss); }
  async function listenStage() {
    stage = 'listen'; curMission = 0; log('state listen');
    await riniSay(A.listen.ask, null, '해 볼게');
    let last = -1;
    if (H.AUTOTEST) (async () => { for (const id of ['bap', 'kimchi', 'sutgarak', 'mul', 'gamasot']) { await wait(0.9); tap(byId[id]); } })();
    await until(() => { const n = Math.min(5, heard.size); if (n !== last) { last = n; missionInfo(A.listen.ask, A.listen.counter + ' ' + n + ' / 5'); } return n >= 5; });
    await wait(1.2); missionInfo(''); finish(0); await riniSay(A.listen.done);
  }
  async function repeatStage() {
    stage = 'repeat'; curMission = 1; log('state repeat');
    await riniSay(A.repeat.ask, null, '좋아요'); missionInfo(A.repeat.ask);
    for (const id of A.repeatWords) {
      const it = byId[id], w = it.w; showLabel(it); it.halo.material.opacity = 0.6;
      for (;;) {
        const p = ui.card; p.clear(); p.pad = 44;
        p.text(A.repeat.card, 28, '#7a6ad0', { bold: true, align: 'center', gap: 8 });
        p.text(w.ko, 96, INK, { bold: true, align: 'center', gap: 4 });
        p.text(w.ro + (gloss(w) ? '  ·  ' + gloss(w) : ''), 30, DIM, { align: 'center', gap: 26 });
        p.button(A.repeat.again, null, '#ece5d8', null, 84); p.button(A.repeat.said, null, '#7f8fd6', null, 96);
        p.finish(); H.placeAhead(p, 1.1, 0, -0.25); p.show(true);
        await riniSpeak(w.ko); await wait(0.3);
        const i = await waitPick(p, 1, 1.0); p.show(false);
        if (i === 1) break;
      }
      it.halo.material.opacity = 0; showToast(A.repeat.good, 1.2); H.sfx('piece'); await wait(0.6);
    }
    missionInfo(''); finish(1); await riniSay(A.repeat.done);
  }
  async function setStage() {
    stage = 'set'; curMission = 2; log('state set');
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
      const it = byId[id]; it.halo.material.opacity = 0.8; H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.1, 0)), '#ffd27a', 20, 0.5, 0.7, 0.025);
      const others = A.words.filter(w => w.id !== id && w.slot).sort(() => Math.random() - 0.5).slice(0, 2);
      const opts = [it.w, ...others].sort(() => Math.random() - 0.5), correct = opts.indexOf(it.w);
      const p = ui.card; p.clear(); p.pad = 44;
      p.text(A.quiz.q, 44, INK, { bold: true, align: 'center', gap: 20 });
      opts.forEach(w => p.button(w.ko, null, '#3b3550', null, 90));
      p.finish(); H.placeAhead(p, 1.1, 0, -0.25); p.show(true);
      riniSpeak(A.quiz.q);
      const i = await waitPick(p, correct, 1.0); p.show(false);
      if (i === correct) { showToast(A.quiz.ok, 1.4); H.sfx('complete'); await riniSpeak(A.quiz.ok); }
      else { const msg = fill(A.quiz.wrong, it.w); showToast(msg, 2.5); await riniSpeak(msg); }   // 틀려도 정답을 알려 주고 넘어간다
      it.halo.material.opacity = 0; await wait(0.4);
    }
    missionInfo(''); finish(3); await riniSay(A.quiz.done);
  }
  async function mealStage() {
    stage = 'meal'; curMission = 4; log('state meal');
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
      p.space(12);
      p.button(E.free, null, '#7f8fd6', null, 84); p.button(E.restart, null, '#ece5d8', null, 76); p.button(BACK ? E.back : E.exit, null, '#3b3550', null, 76);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { showToast('물건을 눌러 이름을 다시 들어 보세요.', 3); await until(() => false); }
      if (i === 2) { if (BACK) { location.href = BACK; return; } const s = H.renderer.xr.getSession(); if (s) { s.end(); return; } }
      location.reload(); return;
    }
  }
  async function main() {
    await intro(); await hello(); showBoard();
    await listenStage(); await repeatStage(); await setStage(); await quizStage(); await mealStage(); await ending();
  }

  // ───────────── 짓기·시작 ─────────────
  buildSpace(); buildTable(); buildShelf(); buildItems(); buildBoard();
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  const riniReady = H.loadChar({ url: '../world1/assets/rini-glb.wasm', height: 1.2, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', walk: 'walk', wave: 'wave2' }, trim: { wave: [1.4, 5.0] }, glow: 0.25 }).then(c => { rini = c; });
  const ready = Promise.all([riniReady, ...loads]).then(() => log('assets loaded', loads.length));
  H.start({ main, ready, start: { pos: POS.start, look: [T.x, T.z] }, anchor: V3(0, 0, 0) });
  window.HANOKX = { items, byId, tap, putOnTable, get stage() { return stage; } };
})();
