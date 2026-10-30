/* 「약국에 가요」 v0.1 — 한국어 학습맵 5판 (2026-10-21, 공용 엔진 core.js, 2판 store.js의 틀을 이어 씀)
   흐름: 인사 → ① 몸 이름 듣기(그림판의 몸 톡 → 한글·로마자·뜻) → ② 따라 말하기 → ③ 아픈 곳 말하기(빨간 곳 → "어디가 아프세요?"에 답하고 열·기침 물음에 답한 뒤 선반에서 그 상자 찾기)
         → ④ 묻고 답하기(어디가 아파요? · 하루에 몇 번 먹어요?) → ⑤ 약 받기(하루에 세 번·값·카드·빨리 나으세요·인사) → 오늘 배운 말 카드
   의학적 조언 없음: 약 상자는 가상 상품, 약사 말은 일반 표현만(content.js 머리글).
   주소 옵션: ?lang=fr|en|ko (뜻 언어, 기본 fr) · ?jump=listen|repeat|tell|quiz|pay|ending · ?autotest=1 · ?mrtest=1 · ?slow=1 · ?tts=1   */
(function () {
  'use strict';
  const H = window.HW, A = window.PHARM, S = window.PHARM_SPACE;
  const { V3, P, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[PHARM]', ...a);
  const LANG = ['fr', 'en', 'ko'].includes(H.Q.get('lang')) ? H.Q.get('lang') : 'fr';
  const gloss = o => (LANG === 'ko' || !o) ? '' : (o[LANG] || o.en || '');

  // 조사: 받침에 따라 이/가 · 이에요/예요
  const batchim = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const ieyo = w => w + (batchim(w) ? '이에요' : '예요');
  const iga = w => w + (batchim(w) ? '이' : '가');
  const fill = (s, w, other) => s.replace('{이에요}', ieyo(w.ko)).replace('{이가}', iga(w.ko)).replace('{box}', w.ko).replace('{그box}', other ? other.ko : '');
  const W = Object.fromEntries(A.words.map(w => [w.id, w]));

  // ───────────── 자리 ─────────────
  // 가운데 왼쪽에 계산대(그 뒤에 하나), 하나 뒤에 약 선반, 오른쪽 앞에 몸 그림판.
  const POS = { start: [0, 2.0], rini: [-0.75, -1.55] };
  const C = { x: -0.75, z: -0.95, w: 1.5, d: 0.6, h: 0.95 };          // 계산대
  const SH = { x: -0.3, z: -2.15 };                                   // 약 선반(앞면 z≈-1.98)
  const BD = { x: 1.3, z: -0.85, ry: -0.44 };                         // 몸 그림판(사용자 쪽을 봄)
  const BOX_AT = { meori: [0.45, 2], mok: [0.3, 1], bae: [0.72, 1] };  // 약 상자: [월드 x, 선반 칸]
  const BOX_COLOR = { meori: '#e2574c', bae: '#5fb36b', mok: '#4c8fe2' };
  const BOARD = V3(-0.1, 2.0, -1.75), TALK = V3(-0.45, 1.5, -0.5);
  H.bounds.r = 5;
  H.setSky('#d3ecf5', '#eef3f0', '#d9d6cc', '#eef3f0');
  H.hemi.intensity = 1.05; H.sun.intensity = 0.85; H.sun.position.set(-2, 9, 4);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  // ───────────── 약국 ─────────────
  let cnt, shelf, board;
  function buildShop() {
    S.build({ name: A.shopName });
    cnt = S.counter(H.world, C.x, C.z, C.w, C.d, C.h);
    shelf = S.shelf(H.world, SH.x, SH.z);
    board = S.bodyBoard(H.world, BD.x, BD.z, BD.ry);
    // 꾸밈 상자·병(이름 없음): 선반 빈 칸을 채운다. 약 상자 자리(x 0.2~0.85, 칸 1·2)는 비워 둔다
    const cols = ['#e2574c', '#f2b233', '#4c8fe2', '#5fb36b', '#8e6bd6', '#3a8fb7', '#f08a3e'];
    const sx0 = SH.x - shelf.w / 2 + 0.12, zf = SH.z + 0.02;
    shelf.ys.forEach((y, r) => {
      for (let i = 0; i < 18; i++) {
        const x = sx0 + i * 0.135; if (x > 0.15 && x < 0.95 && (r === 1 || r === 2)) continue;
        const o = (i + r) % 4 === 0 ? S.bottle(['#9a5b2a', '#6e8f3a', '#b9853a'][(i + r) % 3]) : S.plainBox(cols[(i * 3 + r) % cols.length], 0.09 + (i % 3) * 0.015, 0.1 + ((i + r) % 3) * 0.025);
        o.position.set(x - SH.x, y, 0.02 + (zf - SH.z) * 0); shelf.g.add(o);
      }
    });
  }

  // ───────────── 낱말 자리(그림판의 몸·열·기침 표시·약 상자) ─────────────
  const items = [], byId = {}, boxes = {};
  let stage = 'intro', target = null;
  const heard = new Set();
  function addItem(w, g, size, opts = {}) {
    const hm = new THREE.Mesh(H.geo.lowSphere, hitMat); hm.scale.setScalar(opts.hit || 0.06); hm.position.y = opts.hitY || 0; g.add(hm);
    const halo = H.glowSprite(opts.halo || '#ffd27a', opts.haloSize || 0.16, 0); halo.position.y = opts.hitY || 0; g.add(halo);
    g.userData.size = size;
    const it = { w, g, halo, home: g.position.clone(), box: opts.box || null };
    H.addPickable(g, () => tap(it), on => { if (!it.used) g.scale.setScalar(on ? 1.08 : 1); });
    items.push(it); return it;
  }
  const pains = {};
  function buildItems() {
    // 몸: 그림판 위 누르는 자리(보이지 않는 공 + 힌트 빛 + 아픈 곳 빨간 빛)
    for (const id of A.listenWords) {
      const p = board.PARTS[id], g = new THREE.Group(); g.position.copy(board.at(id)); board.g.add(g);
      const it = addItem(W[id], g, V3(p.r * 2, p.r * 2, 0.02), { hit: p.r * 1.25, haloSize: p.r * 4 });
      const pain = S.signSprite('pain'); pain.scale.setScalar(Math.max(0.09, p.r * 2.6)); pain.material.opacity = 0; pain.renderOrder = 3; g.add(pain); pains[id] = pain;
      byId[id] = it;
    }
    // 열·기침 표시: 그림판 옆에 그림으로(아픈 곳 말하기 때만 보임)
    for (const [id, cx, cy] of [['yeol', 455, 120], ['gichim', 92, 250]]) {
      const g = new THREE.Group(); g.position.copy(board.at('meori')); g.position.x = (cx / 512 - 0.5) * board.BOARD.W; g.position.y = board.BOARD.Y0 + (1 - cy / 768) * board.BOARD.H; g.position.z = 0.05; board.g.add(g);
      const s = S.signSprite(id); g.add(s);
      const it = addItem(W[id], g, V3(0.2, 0.2, 0.02), { hit: 0.1, haloSize: 0.3 });
      g.visible = false; it.sign = true; byId[id] = it;
    }
    // 약 상자 셋(낱말 '약'): 선반 칸 위
    for (const id of Object.keys(BOX_AT)) {
      const [x, row] = BOX_AT[id];
      const g = new THREE.Group(); g.position.set(x, shelf.ys[row], SH.z + 0.05); H.world.add(g);
      g.add(S.medBox(id, W[id].ko, BOX_COLOR[id]));
      const it = addItem(W.yak, g, V3(0.17, 0.125, 0.06), { hit: 0.11, hitY: 0.06, haloSize: 0.42, box: id });
      it.halo.position.y = 0.06; boxes[id] = it;
    }
    byId.yak = boxes.meori;
  }
  // 이름표: 한글 크게 + 로마자 + 뜻 (+ 약 상자면 상자 이름)
  const label = new Panel('wordLabel', 560, 'rgba(33,31,46,0.9)', 0.0006); label.pad = 22; H.scene.add(label.mesh);
  label.mat.depthTest = false; label.mesh.renderOrder = 25;
  let labelFor = null, labelHideAt = 0;
  function showLabel(it) {
    const w = it.w; label.clear();
    label.text(w.ko, 72, '#ffffff', { bold: true, align: 'center', gap: 2 });
    label.text(w.ro, 30, '#c9c4d6', { align: 'center', gap: gloss(w) || it.box ? 8 : 0 });
    if (gloss(w)) label.text(gloss(w), 34, '#ffd27a', { align: 'center', gap: it.box ? 6 : 0 });
    if (it.box) label.text('"' + W[it.box].ko + '" 상자', 30, '#9fe0b4', { align: 'center', gap: 0 });
    label.finish(); label.show(true); labelFor = it; labelHideAt = H.now + 3.4; placeLabel();
  }
  function placeLabel() {
    const wp = labelFor.g.getWorldPosition(V3()); wp.y += (labelFor.g.userData.size ? labelFor.g.userData.size.y : 0.1) + 0.12; H.face(label, wp);
    label.hudScale = H.inXR() ? 1 : Math.max(1, H.headPos().distanceTo(wp) / 1.45);
  }
  let painOn = null;
  H.onUpdate(() => {
    if (labelFor) { placeLabel(); if (H.now > labelHideAt) { label.show(false); labelFor = null; } }
    for (const it of items) if (it.halo.material.opacity > 0) it.halo.material.opacity = 0.45 + 0.3 * Math.sin(H.now * 5);   // 힌트 반짝임
    for (const id in pains) { const on = id === painOn; pains[id].visible = on; if (on) { pains[id].material.opacity = 0.75 + 0.25 * Math.sin(H.now * 6); } }   // 아픈 곳 빨간 표시(깜빡임)
  });
  function setPain(id, sign) {
    painOn = id;
    for (const s of ['yeol', 'gichim']) byId[s].g.visible = s === sign;
  }

  // 듣기: 이름표 + 소리 (+ 하나 한마디: 여기는 ○○예요.)
  let hearing = 0, rini = null;
  async function riniSpeak(text) { if (rini) rini.setTalking(true); await H.speak(text); if (rini) rini.setTalking(false); }
  function toast(text, hold) { showToast(text, hold); if (H.useHud()) H.hud(ui.toast, 'bottom', 0.92); }
  const riniToast = (text, hold) => toast(A.guide.name + ': ' + text, hold);
  async function hear(it, sentence) {
    const w = it.w; showLabel(it); heard.add(w.id); H.sfx('click');
    H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.04, 0.02)), '#ffffff', 14, 0.4, 0.5, 0.02);
    const my = ++hearing;
    await riniSpeak(w.ko);
    if (my !== hearing || !sentence || !w.part) return;
    if (stage === 'listen' || stage === 'free') { const line = fill(A.listen.say, w); riniToast(line, 3); await riniSpeak(line); }
  }
  function tap(it) {
    if (stage === 'box') { if (it === target) toCounter(it); else if (it.box) wrongBox(it); else hear(it, false); return; }
    if (stage === 'card') { if (it === cardIt) payCard(); else hear(it, false); return; }
    if (it === cardIt) return;
    hear(it, stage === 'listen' || stage === 'free');
  }
  function wrongBox(it) { const msg = fill(A.tell.boxWrong, W[target.box], W[it.box]); riniToast(msg, 3.5); riniSpeak(msg); showLabel(it); hint(target, true); }
  const hint = (it, on) => { it.halo.material.opacity = on ? 0.7 : 0; };

  // ───────────── 움직이기 ─────────────
  function flyTo(obj, to, dur = 0.7, lift = 0.35) {   // obj(월드 자식)를 포물선으로
    const from = obj.position.clone(), mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + lift;
    return H.tween(dur, k => { const e = H.ease(k); const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); obj.position.copy(a.lerp(b, e)); }).then(() => obj.position.copy(to));
  }
  let onCounter = 0;
  async function toCounter(it) {   // 찾은 약 상자: 선반에 두고 하나만 꺼내 계산대 위로
    if (it.used) return;
    it.used = true; hint(it, false);
    const one = S.medBox(it.box, W[it.box].ko, BOX_COLOR[it.box]); one.position.copy(it.g.position); H.world.add(one);
    const to = V3(C.x - 0.45 + onCounter++ * 0.22, C.h, C.z + 0.1);
    H.sfx('select'); await flyTo(one, to, 0.8, 0.35); one.rotation.y = 0.15;
    H.sfx('complete'); H.burst(to.clone().add(V3(0, 0.08, 0)), '#bfe6ff', 24, 0.6, 0.7, 0.022); log('on counter', it.box);
    pickedBoxes.push(one);
  }
  const pickedBoxes = [];
  // 카드 결제
  let paid = false, cardIt = null;
  function buildCard() {
    const g = new THREE.Group(); g.position.set(C.x + 0.4, C.h, C.z + 0.16); H.world.add(g);
    g.add(S.card());
    cardIt = { w: { id: 'kadeu', ko: '카드', ro: 'kadeu', fr: 'carte (bancaire)', en: 'card' }, g, halo: H.glowSprite('#ffd27a', 0.3, 0) };
    g.add(cardIt.halo);
    const hm = new THREE.Mesh(H.geo.lowSphere, hitMat); hm.scale.setScalar(0.09); g.add(hm);
    H.addPickable(g, () => tap(cardIt), on => { g.scale.setScalar(on && !paid ? 1.08 : 1); });
  }
  async function payCard() {
    if (paid) return; paid = true;
    hint(cardIt, false); H.removePickable(cardIt.g);
    const cardObj = cardIt.g.children[0].userData.card;
    const to = cnt.term.clone(); to.y += 0.02; to.z += 0.04;
    H.world.attach(cardObj); await flyTo(cardObj, H.world.worldToLocal(to), 0.6, 0.15); cardObj.rotation.x = -0.6;
    H.sfx('complete'); H.burst(to, '#9fe0ff', 26, 0.5, 0.6, 0.02); log('card paid');
  }

  // ───────────── 안내판(지금 할 일)·미션 목록 ─────────────
  let boardP, task = '', taskExtra = '';
  function drawBoard() { const p = boardP; p.clear(); p.pad = 26; p.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 4 }); p.text(task || (curMission >= 0 ? MISSIONS[curMission] + ' — ' + A.guide.name + ' 말을 들어 보세요' : A.guide.name + ' 말을 들어 보세요'), 30, '#ffffff', { gap: taskExtra ? 8 : 0 }); if (taskExtra) p.text(taskExtra, 26, '#c9c4d6', { gap: 0 }); p.finish(); p.pin(); }
  function missionInfo(t, extra) { task = t || ''; taskExtra = extra || ''; if (boardP) drawBoard(); }
  function buildBoard() { boardP = new Panel('board', 620, 'rgba(33,31,46,0.88)'); drawBoard(); boardP.mesh.visible = false; boardP.mesh.position.copy(BOARD); H.world.add(boardP.mesh); boardP.mesh.lookAt(V3(POS.start[0], 1.6, POS.start[1])); }
  function showBoard() { if (H.useHud()) H.hud(boardP, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.56 : 0.36); boardP.mesh.visible = true; drawWrist(); }
  const MISSIONS = [A.listen.title, A.repeat.title, A.tell.title, A.quiz.title, A.pay.title], done = MISSIONS.map(() => false);
  let wrist, curMission = -1;
  function drawWrist() {
    const p = wrist; p.clear();
    p.row([{ t: A.wrist, size: 36, color: '#ffffff', bold: true }, { t: done.filter(Boolean).length + '/' + MISSIONS.length, size: 36, color: '#ffc766', bold: true }], 12);
    const cur = done.indexOf(false);
    MISSIONS.forEach((t, i) => p.row([{ t: done[i] ? '●' : i === cur ? '▶' : '○', size: 30, color: done[i] ? '#8fe3a8' : i === cur ? '#ffc766' : '#8a8698' }, { t, size: 30, color: done[i] ? '#b9b5c6' : '#ffffff' }], 8));
    p.finish(); p.show(true);
  }
  function finish(i) { done[i] = true; drawWrist(); H.sfx('complete'); }

  // ───────────── 하나 말 ─────────────
  const spk = () => ({ name: A.guide.name, role: A.guide.role, dot: A.guide.dot, char: rini, pos: P(POS.rini) });
  async function riniSay(text, choices, single, g, auto) { ui.toast.show(false); H.speak(text); return say(spk(), text, choices, single || '다음', { at: TALK, sub: gloss(g) || undefined, auto }); }

  // ───────────── 화면 모드 카메라: 단계마다 볼 것을 크게 (2판과 같은 방식) ─────────────
  const portrait = () => H.camera.aspect < 1;
  function frame(c, w, h, o = {}) {
    const tv = Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)), th = tv * H.camera.aspect;
    const top = portrait() ? 0.6 : 0.78, bot = o.bot != null && !portrait() ? o.bot : portrait() ? -0.3 : -0.28;   // bot: 가로 화면에서 아래 카드에 가리지 않게 위로 올려 담을 때
    const yc = (top + bot) / 2, hh = (top - bot) / 2;
    const dir = V3(o.side || 0, o.up != null ? o.up : 0.5, 1).normalize();
    const dist = Math.max(w / 2 / (th * 0.94), h / 2 / (tv * hh), o.min || 0.45);
    const eye = c.clone().addScaledVector(dir, dist), aim = c.clone(); aim.y -= yc * dist * tv;
    return { eye, aim };
  }
  const BSIDE = Math.tan(-BD.ry) * -1;   // 그림판 정면 방향(옆으로 기운 만큼)
  const boardPt = (x, y) => board.g.localToWorld(V3(x, y, 0));
  const SHOTS = {
    room: () => portrait() ? frame(V3(-0.2, 1.0, -1.3), 2.5, 2.0, { up: 0.25 })
                           : frame(V3(0.2, 1.0, -1.3), 3.9, 2.0, { up: 0.25 }),
    board: () => frame(boardPt(0, board.BOARD.Y0 + board.BOARD.H / 2), board.BOARD.W * 1.25, board.BOARD.H * 1.1, { side: BSIDE, up: 0.15, bot: 0.12 }),
    face: () => frame(boardPt(0.02, board.at('ko').y + 0.02), 0.52, 0.5, { side: BSIDE, up: 0.15, min: 0.5 }),
    part: it => { const p = it.g.getWorldPosition(V3()); return frame(p, 0.5, 0.42, { side: BSIDE, up: 0.15, min: 0.5 }); },
    shelf: () => frame(V3(0.5, 1.15, -2.0), 1.15, 1.05, { up: 0.3 }),
    box: it => { const p = it.g.getWorldPosition(V3()); p.y += 0.06; return frame(p, 0.5, 0.36, { up: 0.3, min: 0.5 }); },
    counter: () => frame(V3(C.x + 0.2, 1.1, C.z - 0.3), 1.9, 1.5, { up: 0.35, side: 0.15 })
  };
  let shotTok = 0, curShot = null;
  function shot(name, arg, dur = 1.0) {
    if (H.inXR() || !SHOTS[name]) return Promise.resolve();
    curShot = [name, arg]; const my = ++shotTok;
    const s = SHOTS[name](arg), e0 = H.headPos(), a0 = e0.clone().addScaledVector(H.camera.getWorldDirection(V3()), s.eye.distanceTo(s.aim));
    if (dur <= 0) { H.flatView(s.eye, s.aim); return Promise.resolve(); }
    return H.tween(dur, k => { if (my !== shotTok) return; const e = H.ease(k); H.flatView(e0.clone().lerp(s.eye, e), a0.clone().lerp(s.aim, e)); });
  }
  addEventListener('resize', () => { if (curShot && !H.inXR()) setTimeout(() => shot(curShot[0], curShot[1], 0), 60); });
  const partShot = it => ['nun', 'ko', 'i'].includes(it.w.id) ? shot('face') : shot('part', it, 0.9);

  function placeCard(p, it) {
    if (H.useHud()) { H.hud(p, 'bottom'); return; }
    if (it) H.placeToward(p, it.g.getWorldPosition(V3()), 0.85, 0.45, -0.2); else H.placeAhead(p, 1.1, 0, -0.25);
  }
  function buttonRow(p, labels, color, h = 92) {
    const gap = 16, n = labels.length, bw = (p.w - p.pad * 2 - gap * (n - 1)) / n, y = p.y;
    labels.forEach((t, i) => { const b = p.button(t, null, Array.isArray(color) ? color[i] : color, null, h, 0); b.x = p.pad + i * (bw + gap); b.w = bw; b.y = y; p.y = y; });
    p.y = y + h + 16;
  }
  // 내가 하는 말(버튼 하나)
  async function myLine(text, g) {
    const p = ui.card; p.clear(); p.pad = 36;
    p.text('하나에게 말해 보세요', 26, '#3a8fb7', { bold: true, align: 'center', gap: 6 });
    if (gloss(g)) p.text(gloss(g), 24, DIM, { align: 'center', gap: 12 });
    buttonRow(p, [text], '#3a8fb7', 96);
    p.finish(); placeCard(p, null); p.show(true);
    await waitPick(p, 0, 1.0); p.show(false); H.sfx('piece');
  }
  // 고르기 카드(질문 + 보기 여러 개, 세로로)
  async function choiceCard(q, opts, correct, it) {
    const p = ui.card; p.clear(); p.pad = 36;
    p.text(q, 42, INK, { bold: true, align: 'center', gap: 16 });
    if (opts.length > 3 || opts.some(o => o.length > 5)) opts.forEach(o => p.button(o, null, '#3b3550', null, 84));
    else buttonRow(p, opts, '#3b3550', 96);
    p.finish(); placeCard(p, it); p.show(true);
    const i = await waitPick(p, correct, H.Q.get('slow') ? 4 : 1.0); p.show(false);
    return i;
  }
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#3a8fb7', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 72, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 14 });
    p.text(A.credit, 22, DIM, { align: 'center', gap: 30 });
    p.button(A.start, null, '#3a8fb7', null, 110);
    shot('room', null, 0);
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat', 'lang', LANG);
    await waitPick(p, 0, 1.0); p.show(false);
    H.sfx('complete');
    await wait(0.3);
    if (!H.hasKoVoice() && !H.AUTOTEST) toast('이 기기에는 한국어 음성이 없어요. 글로만 보여 줄게요.', 4);
  }
  async function hello() { log('state hello'); if (rini) rini.wave(); for (const l of A.hello) await riniSay(l.text, l.choices, null, l.gloss); }
  async function listenStage() {
    stage = 'listen'; curMission = 0; log('state listen');
    shot('board');
    const N = A.listenWords.length;
    await riniSay(A.listen.ask, null, '해 볼게');
    let last = -1;
    if (H.AUTOTEST) (async () => { for (const id of A.listenWords) { await wait(0.9); tap(byId[id]); } })();
    const hintAt = H.now + 20;
    await until(() => {
      const n = A.listenWords.filter(id => heard.has(id)).length; if (n !== last) { last = n; missionInfo(A.listen.ask, A.listen.counter + ' ' + n + ' / ' + N); }
      if (H.now > hintAt) for (const id of A.listenWords) if (!heard.has(id)) hint(byId[id], true); else hint(byId[id], false);
      return n >= N;
    });
    for (const id of A.listenWords) hint(byId[id], false);
    await wait(1.2); missionInfo(''); finish(0); await riniSay(A.listen.done);
  }
  async function repeatStage() {
    stage = 'repeat'; curMission = 1; log('state repeat');
    await riniSay(A.repeat.ask, null, '좋아요'); missionInfo(A.repeat.ask);
    for (const id of A.repeatWords) {
      const it = byId[id], w = it.w; hint(it, true);
      await partShot(it);
      for (;;) {
        const p = ui.card; p.clear(); p.pad = 40;
        p.text(A.repeat.card, 26, '#3a8fb7', { bold: true, align: 'center', gap: 4 });
        p.text(w.ko, 84, INK, { bold: true, align: 'center', gap: 2 });
        p.text(w.ro + (gloss(w) ? '  ·  ' + gloss(w) : ''), 28, DIM, { align: 'center', gap: 20 });
        buttonRow(p, [A.repeat.again, A.repeat.said], ['#ece5d8', '#3a8fb7'], 88);
        p.finish(); placeCard(p, it); p.show(true);
        await riniSpeak(w.ko); await wait(0.3);
        const i = await waitPick(p, 1, 1.0); p.show(false);
        if (i === 1) break;
      }
      hint(it, false); toast(A.repeat.good, 1.2); H.sfx('piece'); await wait(0.6);
    }
    missionInfo(''); finish(1); shot('room'); await riniSay(A.repeat.done);
  }
  async function tellStage() {
    stage = 'tell'; curMission = 2; log('state tell');
    const T = A.tell;
    shot('board'); missionInfo(T.ask);
    await riniSay(T.ask, null, '네');
    const symOf = id => fill(T.sym, W[id]);
    for (const c of A.cases) {
      const w = W[c.part];
      setPain(c.part, c.extra); shot('board'); missionInfo(T.q);
      // 어디가 아프세요? → 아픈 곳 고르기(틀리면 다시)
      const opts = shuffle(A.cases.map(o => symOf(o.part))), correct = opts.indexOf(symOf(c.part));
      for (;;) {
        riniSpeak(T.q);
        const i = await choiceCard(A.guide.name + ': ' + T.q, opts, correct, byId[c.part]);
        if (i === correct) { H.sfx('piece'); const ok = fill(T.ok, w); riniToast(ok, 2.2); await riniSpeak(ok); break; }
        const msg = fill(T.wrong, w); toast(msg, 2.5); await riniSpeak(msg);
      }
      // 열도 나요? / 기침도 해요?
      if (c.extra) { const X = T.extra[c.extra]; await riniSay(X.q, X.choices, null, X.gloss); await riniSay(T.reply); }
      setPain(null, null);
      // 선반에서 상자 찾기
      target = boxes[c.box]; stage = 'box';
      const find = fill(T.find, W[c.box]);
      shot('shelf'); missionInfo(find); riniToast(find, 4); riniSpeak(find);
      const at = H.now + 8;
      if (H.AUTOTEST) wait(1.4).then(() => tap(target));
      await until(() => { if (!target.used && H.now > at) hint(target, true); return target.used; });
      stage = 'tell'; hint(target, false);
      await wait(0.9); riniToast(T.boxOk, 2); await riniSpeak(T.boxOk); await wait(0.3);
    }
    target = null; missionInfo(''); finish(2); shot('room'); await riniSay(T.done);
  }
  async function quizStage() {
    stage = 'quiz'; curMission = 3; log('state quiz');
    const Q = A.quiz;
    await riniSay(Q.ask, null, '네'); missionInfo(Q.q);
    const symOf = id => fill(A.tell.sym, W[id]);
    for (const id of A.quizParts) {
      const it = byId[id];
      setPain(id, null); await shot('board', null, 0.8);
      const others = shuffle(A.listenWords.filter(x => x !== id)).slice(0, 2);
      const opts = shuffle([id, ...others]).map(symOf), correct = opts.indexOf(symOf(id));
      riniSpeak(Q.q);
      const i = await choiceCard(Q.q, opts, correct, it);
      if (i === correct) { toast(Q.ok, 1.4); H.sfx('complete'); await riniSpeak(Q.ok); }
      else { const msg = fill(Q.wrong, W[id]); toast(msg, 2.5); await riniSpeak(msg); }
      setPain(null, null); await wait(0.4);
    }
    // 하루에 몇 번?
    { const q = A.timesQuiz;
      shot('room'); riniToast(Q.timesSay, 3); await riniSpeak(Q.timesSay);
      riniSpeak(Q.timesQ);
      const i = await choiceCard(Q.timesQ, q.choices, q.answer, null);
      if (i === q.answer) { toast(Q.ok, 1.4); H.sfx('complete'); await riniSpeak(Q.ok); }
      else { toast(Q.timesWrong, 2.5); await riniSpeak(Q.timesWrong); } }
    missionInfo(''); finish(3); await riniSay(Q.done);
  }
  async function payStage() {
    stage = 'pay'; curMission = 4; log('state pay');
    const Y = A.pay;
    await riniSay(Y.move.text, Y.move.choices, null, Y.move.gloss);
    shot('counter');
    // 찾은 상자들은 약 봉투 하나로
    const bag = S.medBag(); bag.position.set(C.x - 0.2, C.h, C.z - 0.15); H.world.add(bag);
    for (const b of pickedBoxes) await flyTo(b, V3(C.x - 0.2, C.h + 0.05, C.z - 0.15), 0.35, 0.12).then(() => { b.visible = false; });
    H.sfx('piece'); await flyTo(bag, V3(C.x - 0.2, C.h, C.z + 0.15), 0.5, 0.1);
    missionInfo(Y.title);
    await riniSay(Y.take.text, Y.take.choices, null, Y.take.gloss);
    await myLine(Y.how.text, Y.how.gloss);
    await riniSay(Y.total.text, Y.total.choices, null, Y.total.gloss);
    await riniSay(Y.card.text, Y.card.choices, null, Y.card.gloss);
    stage = 'card'; missionInfo(Y.tap); riniToast(Y.tap, 3); riniSpeak(Y.tap);
    const at = H.now + 6;
    if (H.AUTOTEST) wait(1.0).then(() => tap(cardIt));
    await until(() => { if (!paid && H.now > at) hint(cardIt, true); return paid; });
    stage = 'pay'; missionInfo(Y.title); await wait(0.4); riniToast(Y.tapped, 2); await riniSpeak(Y.tapped);
    await riniSay(Y.well.text, Y.well.choices, null, Y.well.gloss);
    if (rini) rini.wave();
    await riniSay(Y.bye.text, Y.bye.choices, null, Y.bye.gloss);
    missionInfo(''); finish(4);
  }
  async function ending() {
    stage = 'free'; log('state ending');
    const E = A.ending;
    for (;;) {
      let p = ui.card; p.clear(); p.pad = 40;
      p.text(E.cardKicker, 26, '#3a8fb7', { bold: true, align: 'center', gap: 4 });
      p.text(E.cardTitle, 50, INK, { bold: true, align: 'center', gap: 14 });
      for (const w of A.words) p.row([{ t: w.ko, size: 32, color: INK, bold: true }, { t: w.ro, size: 22, color: DIM }, { t: gloss(w), size: 24, color: '#5a5470' }], 6);
      p.space(10); p.button('다음', null, '#3a8fb7', null, 84);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      log('state card');
      await waitPick(p, 0, 1.0); p.show(false); await wait(0.2);
      p = ui.card; p.clear(); p.pad = 40;
      p.text('오늘 배운 말', 26, '#3a8fb7', { bold: true, align: 'center', gap: 10 });
      for (const ph of A.phrases) p.row([{ t: ph.ko, size: 30, color: INK, bold: true }, { t: gloss(ph), size: 22, color: '#5a5470' }], 6);
      p.space(10); p.text(E.cultureTitle, 24, '#3a8fb7', { bold: true, gap: 4 });
      for (const c of E.culture) p.text('· ' + c, 24, '#5a5470', { gap: 4 });
      if (E.cultureSrc) p.text(E.cultureSrc, 18, DIM, { gap: 4 });
      p.space(12);
      p.button(E.free, null, '#3a8fb7', null, 84); p.button(E.restart, null, '#ece5d8', null, 76); p.button(E.exit, null, '#3b3550', null, 76);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { toast('그림판의 몸을 눌러 이름을 다시 들어 보세요.', 3); shot('board'); await until(() => false); }
      if (i === 2) { const s = H.renderer.xr.getSession(); if (s) { s.end(); return; } }
      location.reload(); return;
    }
  }
  const JUMP = ['listen', 'repeat', 'tell', 'quiz', 'pay', 'ending'].indexOf(H.Q.get('jump'));
  async function main() {
    await intro();
    if (JUMP < 0) await hello();
    showBoard();
    if (JUMP > 0) { for (let i = 0; i < Math.min(JUMP, 5); i++) done[i] = true; drawWrist(); }
    if (JUMP > 2) for (const c of A.cases) await toCounter(boxes[c.box]);
    const stages = [listenStage, repeatStage, tellStage, quizStage, payStage, ending];
    for (let i = Math.max(0, JUMP); i < stages.length; i++) await stages[i]();
  }

  // ───────────── 짓기·시작 ─────────────
  if (window.PHARM_VOICE && !H.Q.has('tts')) H.voicePack('voice/', window.PHARM_VOICE);
  buildShop(); buildItems(); buildCard(); buildBoard();
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  // 약사 = Tripo로 만든 흰 가운 입은 하나(assets/pharmacist.glb): 동작 idle·talk·bow(인사 때 wave 자리에)
  const riniReady = H.loadChar({ url: 'assets/pharmacist.glb', height: 1.58, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', wave: 'bow' }, glow: 0.18 }).then(c => { rini = c; if (c) c.look = false; }).catch(e => log('pharmacist load failed', e && e.message));
  // 하나가 사용자를 보게(2판과 같음: 맵을 돌려 놓는 휴대폰 혼합현실에서도 맞게 맵 안 좌표로 계산)
  H.onUpdate(dt => {
    if (!rini || !rini.root.visible) return;
    const r = rini.root, lp = r.parent.worldToLocal(H.headPos()), dx = lp.x - r.position.x, dz = lp.z - r.position.z;
    if (dx * dx + dz * dz < 0.01) return;
    let d = (Math.atan2(dx, dz) - r.rotation.y) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    r.rotation.y += d * (1 - Math.exp(-3 * Math.min(dt || 0.016, 0.1)));
  });
  const ready = Promise.all([riniReady]).then(() => log('assets loaded'));
  H.start({ main, ready, start: { pos: POS.start, look: [0.1, -1.3] }, anchor: V3(0, 0, 0) });
  window.PHARMX = { items, byId, boxes, tap, get stage() { return stage; }, get target() { return target; }, get rini() { return rini; } };
})();
