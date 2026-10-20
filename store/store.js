/* 「편의점에 가요」 v0.1 — 한국어 학습맵 2판 (2026-10-20, 공용 엔진 core.js, 1판 hanok.js의 틀을 이어 씀)
   흐름: 인사 → ① 이름 듣기(물건 톡 → 한글·로마자·뜻 + 값) → ② 따라 말하기 → ③ 찾아서 담기(쪽지 3개를 "어디 있어요?"로 물어 바구니에) → ④ 묻고 답하기(이게 뭐예요? · 얼마예요?) → ⑤ 계산하기(봉투·카드·영수증·인사) → 오늘 배운 말 카드
   주소 옵션: ?lang=fr|en|ko (뜻 언어, 기본 fr) · ?jump=listen|repeat|find|quiz|pay|ending · ?autotest=1 · ?mrtest=1 · ?slow=1 · ?tts=1   */
(function () {
  'use strict';
  const H = window.HW, A = window.STORE, S = window.STORE_SPACE;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[STORE]', ...a);
  const LANG = ['fr', 'en', 'ko'].includes(H.Q.get('lang')) ? H.Q.get('lang') : 'fr';
  const gloss = o => (LANG === 'ko' || !o) ? '' : (o[LANG] || o.en || '');

  // 조사: 받침에 따라 을/를 · 은/는 · 이에요/예요
  const batchim = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const eulreul = w => w + (batchim(w) ? '을' : '를');
  const eunneun = w => w + (batchim(w) ? '은' : '는');
  const ieyo = w => w + (batchim(w) ? '이에요' : '예요');
  const fill = (s, w, other) => s.replace('{을를}', eulreul(w.ko)).replace('{은는}', eunneun(w.ko)).replace('{이에요}', ieyo(w.ko)).replace('{그이에요}', other ? ieyo(other.ko) : '')
    .replace('{place}', A.places[w.place] || '').replace('{price}', w.priceKo || '');

  // ───────────── 자리 ─────────────
  // 왼쪽 앞에 계산대(그 뒤에 하나), 가운데 뒤에 선반, 오른쪽 뒤에 냉장 진열대, 오른쪽 앞에 아이스크림 냉동고, 입구 왼쪽에 바구니.
  const POS = { start: [0, 2.2], rini: [-1.05, -1.62] };
  const C = { x: -1.05, z: -1.0, w: 1.4, d: 0.6, h: 0.9 };            // 계산대
  const SH = { x: 0.45, z: -1.35 };                                    // 선반
  const FR = { x: 1.6, z: -1.95 };                                     // 냉장 진열대
  const FZ = { x: 1.55, z: -0.5 };                                     // 냉동고
  const DOOR = { x: -0.9, z: 0.85 };                                   // 바구니 쌓아 둔 곳
  const CART = V3(0.05, 0, -0.35);                                     // 든 바구니를 내려 두는 자리(통로)
  const BOARD = V3(0.4, 1.95, -1.6), TALK = V3(-0.45, 1.5, -0.6);
  H.bounds.r = 5;
  H.setSky('#cfe6f6', '#eef1e6', '#d9d6cc', '#eef1e6');
  H.hemi.intensity = 1.05; H.sun.intensity = 0.85; H.sun.position.set(-2, 9, 4);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  // ───────────── 가게 ─────────────
  let cnt, shelf, fridge, freezer;
  function buildShop() {
    S.build({ name: A.shopName });
    cnt = S.counter(H.world, C.x, C.z, C.w, C.d, C.h);
    shelf = S.shelf(H.world, SH.x, SH.z);
    fridge = S.fridge(H.world, FR.x, FR.z);
    freezer = S.freezer(H.world, FZ.x, FZ.z);
    // 꾸밈 상품(누를 수 없음): 선반·냉장고 빈 칸을 채운다
    const deco = (parent, x, y, z, w, h, d, c) => mesh(geo.box, std(c, 0.5), parent, [x, y + h / 2, z], [w, h, d]);
    const cols = ['#e2574c', '#f2b233', '#4c8fe2', '#5fb36b', '#8e6bd6', '#f08a3e'];
    shelf.ys.forEach((y, r) => { for (let i = 0; i < 4; i++) deco(shelf.g, 0.12 + i * 0.13, y, 0.02, 0.1, 0.13 + (i % 2) * 0.04, 0.12, cols[(i + r * 2) % cols.length]); });
    fridge.ys.forEach((y, r) => { for (let i = 0; i < 3; i++) deco(fridge.g, 0.14 + i * 0.12, y, 0.04, 0.07, 0.17, 0.07, ['#ffffff', '#f6d36b', '#9fd3a0'][(i + r) % 3]); });
    // 바구니 더미(맨 위 하나가 낱말 '바구니')
    for (let i = 0; i < 2; i++) { const b = S.product('baguni'); b.position.set(DOOR.x, i * 0.05, DOOR.z); H.world.add(b); }
  }

  // ───────────── 물건(낱말) ─────────────
  // 진열 물건은 같은 것 여러 개를 한 묶음으로(누르는 것은 묶음 하나). 바구니·봉투·카드는 하나씩.
  const COPIES = { mul: 3, uyu: 3, gimbap: 2, ppang: 3, gwaja: 3, ramyeon: 3, icecream: 3 };
  const GAP = { mul: 0.085, uyu: 0.085, gimbap: 0.17, ppang: 0.17, gwaja: 0.165, ramyeon: 0.115, icecream: 0.09 };
  function where(id) {   // 묶음 자리(월드 좌표)
    const sx = SH.x - 0.3, fx = FR.x - 0.22;
    switch (id) {
      case 'ppang': return V3(sx, shelf.ys[2], SH.z + 0.03);
      case 'gwaja': return V3(sx, shelf.ys[1], SH.z + 0.03);
      case 'ramyeon': return V3(sx, shelf.ys[0], SH.z + 0.04);
      case 'mul': return V3(fx, fridge.ys[2], FR.z + 0.06);
      case 'uyu': return V3(fx, fridge.ys[1], FR.z + 0.06);
      case 'gimbap': return V3(fx, fridge.ys[0], FR.z + 0.08);
      case 'icecream': return V3(FZ.x, freezer.inner, FZ.z + 0.1);
      case 'baguni': return V3(DOOR.x, 0.1, DOOR.z);
      case 'bongtu': return V3(C.x - 0.5, C.h, C.z - 0.05);
      case 'kadeu': return V3(C.x + 0.18, C.h, C.z + 0.14);
    }
  }
  const items = [], byId = {};
  let stage = 'intro', target = null;
  const heard = new Set();
  function buildItems() {
    for (const w of A.words) {
      const g = new THREE.Group(); g.position.copy(where(w.id)); H.world.add(g);
      const n = COPIES[w.id] || 1, gap = GAP[w.id] || 0;
      for (let i = 0; i < n; i++) { const p = S.product(w.id); p.position.x = (i - (n - 1) / 2) * gap; if (w.id === 'icecream') p.rotation.z = (i - 1) * 0.25; g.add(p); }
      if (w.id === 'icecream') g.rotation.x = -0.5;   // 냉동고 안에서 손님 쪽으로 눕혀 보이게
      const box = new THREE.Box3().setFromObject(g), size = box.getSize(V3());
      g.userData.size = size;
      const hm = new THREE.Mesh(geo.lowSphere, hitMat); hm.scale.setScalar(Math.max(0.16, Math.max(size.x, size.y, size.z) * 0.75)); hm.position.y = size.y / 2; g.add(hm);
      const halo = H.glowSprite('#ffd27a', Math.max(0.3, Math.max(size.x, size.y) * 1.6), 0); halo.position.y = size.y / 2; g.add(halo);
      let tag = null;
      if (w.price && w.place !== 'freezer') tag = S.priceTag(H.world, g.position.x, g.position.y - 0.035, g.position.z + (w.place === 'fridge' ? 0.22 : 0.2), w.price);
      if (w.place === 'freezer') tag = S.priceTag(H.world, FZ.x, freezer.top - 0.04, FZ.z + freezer.d / 2 + 0.003, w.price);   // 앞면 맨 위 테두리(글씨 띠와 안 겹치게)
      const it = { w, g, halo, tag, home: g.position.clone(), single: n === 1 };
      H.addPickable(g, () => tap(it), on => { if (!it.used) g.scale.setScalar(on ? 1.08 : 1); });
      items.push(it); byId[w.id] = it;
    }
  }
  // 이름표: 한글 크게 + 로마자 + 뜻 + 값
  const label = new Panel('wordLabel', 560, 'rgba(33,31,46,0.9)', 0.0006); label.pad = 22; H.scene.add(label.mesh);
  label.mat.depthTest = false; label.mesh.renderOrder = 25;
  let labelFor = null, labelHideAt = 0;
  function showLabel(it) {
    const w = it.w; label.clear();
    label.text(w.ko, 72, '#ffffff', { bold: true, align: 'center', gap: 2 });
    label.text(w.ro, 30, '#c9c4d6', { align: 'center', gap: gloss(w) || w.price ? 8 : 0 });
    if (gloss(w)) label.text(gloss(w), 34, '#ffd27a', { align: 'center', gap: w.price ? 6 : 0 });
    if (w.price) label.text(w.price.toLocaleString('ko-KR') + '원 · ' + w.priceKo, 32, '#9fe0b4', { align: 'center', gap: 0 });
    label.finish(); label.show(true); labelFor = it; labelHideAt = H.now + 3.4; placeLabel();
  }
  function placeLabel() {
    const wp = labelFor.g.getWorldPosition(V3()); wp.y += (labelFor.g.userData.size ? labelFor.g.userData.size.y : 0.1) + 0.13; H.face(label, wp);
    label.hudScale = H.inXR() ? 1 : Math.max(1, H.headPos().distanceTo(wp) / 1.45);
  }
  H.onUpdate(() => {
    if (labelFor) { placeLabel(); if (H.now > labelHideAt) { label.show(false); labelFor = null; } }
    for (const it of items) if (it.halo.material.opacity > 0) it.halo.material.opacity = 0.45 + 0.3 * Math.sin(H.now * 5);   // 힌트 반짝임
  });

  // 듣기: 이름표 + 소리 (+ 하나 한마디: 이건 ○○예요. ○○ 원이에요.)
  let hearing = 0, rini = null;
  async function riniSpeak(text) { if (rini) rini.setTalking(true); await H.speak(text); if (rini) rini.setTalking(false); }
  function toast(text, hold) { showToast(text, hold); if (H.useHud()) H.hud(ui.toast, 'bottom', 0.92); }
  const riniToast = (text, hold) => toast(A.guide.name + ': ' + text, hold);
  async function hear(it, sentence) {
    const w = it.w; showLabel(it); heard.add(w.id); H.sfx('click');
    H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.08, 0)), '#ffffff', 14, 0.4, 0.5, 0.02);
    const my = ++hearing;
    await riniSpeak(w.ko);
    if (my !== hearing || !sentence) return;
    if (stage === 'listen' || stage === 'free') {
      const line = fill(A.listen.say, w) + (w.price ? ' ' + fill(A.listen.price, w) : '');
      riniToast(line, 4); await riniSpeak(line);
    }
  }
  function tap(it) {
    if (stage === 'basket') { if (it.w.id === 'baguni') takeBasket(); else wrongPick(it, byId.baguni); return; }
    if (stage === 'find') { if (it === target) intoBasket(it); else wrongPick(it, target); return; }
    if (stage === 'card') { if (it.w.id === 'kadeu') payCard(); else hear(it, false); return; }
    hear(it, stage !== 'quiz' && stage !== 'repeat' && stage !== 'pay');
  }
  function wrongPick(it, want) { const msg = fill(A.find.wrong, want.w, it.w); riniToast(msg, 3.5); riniSpeak(msg); showLabel(it); want.halo.material.opacity = 0.7; }
  const hint = (it, on) => { it.halo.material.opacity = on ? 0.7 : 0; };

  // ───────────── 바구니 ─────────────
  let basket = null, basketN = 0;
  function flyTo(obj, to, dur = 0.7, lift = 0.35) {   // obj(월드 자식)를 포물선으로
    const from = obj.position.clone(), mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + lift;
    return H.tween(dur, k => { const e = H.ease(k); const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); obj.position.copy(a.lerp(b, e)); }).then(() => obj.position.copy(to));
  }
  async function takeBasket() {
    if (basket) return;
    const it = byId.baguni; it.used = true; hint(it, false); H.removePickable(it.g); it.g.scale.setScalar(1);
    basket = it.g; H.sfx('piece');
    await flyTo(basket, CART, 0.8, 0.5);
    H.burst(basket.getWorldPosition(V3()).add(V3(0, 0.2, 0)), '#bfe6ff', 24, 0.6, 0.7, 0.025);
  }
  function basketSpot(i) { const inner = { w: 0.32, d: 0.18 }; const col = i % 3, row = Math.floor(i / 3); return V3((col - 1) * inner.w / 3, 0.02 + row * 0.07, (row ? 0.03 : -0.03)); }
  async function intoBasket(it) {
    if (it.used) return;
    it.used = true; hint(it, false);
    // 묶음은 진열대에 두고 하나만 꺼내 바구니로 날린다
    const one = S.product(it.w.id); one.position.copy(it.g.getWorldPosition(V3())); if (it.w.id === 'icecream') one.rotation.x = -0.5; H.world.add(one);
    const spot = basket.localToWorld(basketSpot(basketN++));
    H.sfx('select');
    await flyTo(one, H.world.worldToLocal(spot.clone()), 0.75, 0.4);
    basket.attach(one); one.rotation.set(0, (basketN % 2) * 0.4, 0);
    H.sfx('complete'); H.burst(spot, '#bfe6ff', 24, 0.6, 0.7, 0.022); log('in basket', it.w.id);
  }
  // ───────────── 카드 결제 ─────────────
  let paid = false;
  async function payCard() {
    if (paid) return; paid = true;
    const it = byId.kadeu; hint(it, false); H.removePickable(it.g);
    const cardObj = it.g.children[0].userData.card;   // 받침은 두고 카드만 단말기로
    const to = cnt.term.clone(); to.y += 0.02; to.z += 0.04;
    H.world.attach(cardObj); await flyTo(cardObj, H.world.worldToLocal(to), 0.6, 0.15); cardObj.rotation.x = -0.6;
    H.sfx('complete'); H.burst(to, '#9fe0ff', 26, 0.5, 0.6, 0.02); log('card paid');
  }

  // ───────────── 안내판(지금 할 일)·미션 목록 ─────────────
  let board, task = '', taskExtra = '';
  function drawBoard() { const p = board; p.clear(); p.pad = 26; p.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 4 }); p.text(task || (curMission >= 0 ? MISSIONS[curMission] + ' — ' + A.guide.name + ' 말을 들어 보세요' : A.guide.name + ' 말을 들어 보세요'), 30, '#ffffff', { gap: taskExtra ? 8 : 0 }); if (taskExtra) p.text(taskExtra, 26, '#c9c4d6', { gap: 0 }); p.finish(); p.pin(); }
  function missionInfo(t, extra) { task = t || ''; taskExtra = extra || ''; if (board) drawBoard(); }
  function buildBoard() { board = new Panel('board', 620, 'rgba(33,31,46,0.88)'); drawBoard(); board.mesh.visible = false; board.mesh.position.copy(BOARD); H.world.add(board.mesh); board.mesh.lookAt(V3(POS.start[0], 1.6, POS.start[1])); }
  function showBoard() { if (H.useHud()) H.hud(board, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.56 : 0.36); board.mesh.visible = true; drawWrist(); }
  const MISSIONS = [A.listen.title, A.repeat.title, A.find.title, A.quiz.title, A.pay.title], done = MISSIONS.map(() => false);
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
  async function riniSay(text, choices, single, g) { ui.toast.show(false); H.speak(text); return say(spk(), text, choices, single || '다음', { at: TALK, sub: gloss(g) || undefined }); }

  // ───────────── 화면 모드 카메라: 단계마다 볼 것을 크게 (1판과 같은 방식) ─────────────
  const portrait = () => H.camera.aspect < 1;
  function frame(c, w, h, o = {}) {
    const tv = Math.tan(THREE.MathUtils.degToRad(H.camera.fov / 2)), th = tv * H.camera.aspect;
    const top = portrait() ? 0.6 : 0.78, bot = portrait() ? -0.3 : -0.28;
    const yc = (top + bot) / 2, hh = (top - bot) / 2;
    const dir = V3(o.side || 0, o.up != null ? o.up : 0.5, 1).normalize();
    const dist = Math.max(w / 2 / (th * 0.94), h / 2 / (tv * hh), o.min || 0.45);
    const eye = c.clone().addScaledVector(dir, dist), aim = c.clone(); aim.y -= yc * dist * tv;
    return { eye, aim };
  }
  const SHOTS = {
    room: () => portrait() ? frame(V3(-0.45, 0.95, -1.35), 2.3, 1.9, { up: 0.25 })                                // 세로: 하나·계산대·선반
                           : frame(V3(0.05, 0.95, -1.35), 3.9, 1.9, { up: 0.25 }),                                 // 가로: 계산대·하나·선반·냉장고
    listen: () => portrait() ? frame(V3(SH.x - 0.1, 0.75, SH.z), 1.3, 1.2, { up: 0.3 })                           // 세로: 선반
                             : frame(V3(0.75, 0.8, -1.25), 2.9, 1.5, { up: 0.3 }),                                  // 가로: 선반·냉장고·냉동고
    coolers: () => frame(V3(1.55, 0.8, -1.2), 1.3, 1.6, { side: -0.15, up: 0.3 }),                                 // 냉장고·냉동고
    door: () => frame(V3(DOOR.x + 0.3, 0.3, DOOR.z - 0.4), 1.4, 0.9, { up: 0.8 }),                                // 바구니
    item: it => { const p = it.g.getWorldPosition(V3()), s = it.g.userData.size || V3(0.15, 0.1, 0.15); p.y += s.y * 0.35; return frame(p, Math.max(0.45, Math.max(s.x, s.z) * 2.2), Math.max(0.34, s.y * 2.6), { up: 0.45, min: 0.5 }); },   // 조금 아래를 가운데로: 물건 밑 값표가 같이 보이게
    counter: () => frame(V3(C.x + 0.15, 1.05, C.z - 0.3), 1.9, 1.5, { up: 0.35, side: 0.15 })                    // 하나·계산대·바구니
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

  function placeCard(p, it) {
    if (H.useHud()) { H.hud(p, 'bottom'); return; }
    if (it) H.placeToward(p, it.g.getWorldPosition(V3()), 0.85, 0.45, -0.2); else H.placeAhead(p, 1.1, 0, -0.25);
  }
  function buttonRow(p, labels, color, h = 92) {
    const gap = 16, n = labels.length, bw = (p.w - p.pad * 2 - gap * (n - 1)) / n, y = p.y;
    labels.forEach((t, i) => { const b = p.button(t, null, Array.isArray(color) ? color[i] : color, null, h, 0); b.x = p.pad + i * (bw + gap); b.w = bw; b.y = y; p.y = y; });
    p.y = y + h + 16;
  }
  // 내가 하는 말(버튼 하나): "물어보세요" 카드
  async function myLine(text, g, it) {
    const p = ui.card; p.clear(); p.pad = 36;
    p.text('하나에게 말해 보세요', 26, '#7a6ad0', { bold: true, align: 'center', gap: 6 });
    if (gloss(g)) p.text(gloss(g), 24, DIM, { align: 'center', gap: 12 });
    buttonRow(p, [text], '#3f9e5c', 96);
    p.finish(); placeCard(p, it); p.show(true);
    await waitPick(p, 0, 1.0); p.show(false); H.sfx('piece');
  }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#3f9e5c', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 72, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 14 });
    p.text(A.credit, 22, DIM, { align: 'center', gap: 30 });
    p.button(A.start, null, '#3f9e5c', null, 110);
    shot('room', null, 0);
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat', 'lang', LANG);
    await waitPick(p, 0, 1.0); p.show(false);
    H.sfx('complete');   // 문 열리는 딩동 대신 효과음
    await wait(0.3);
    if (!H.hasKoVoice() && !H.AUTOTEST) toast('이 기기에는 한국어 음성이 없어요. 글로만 보여 줄게요.', 4);
  }
  async function hello() { log('state hello'); if (rini) rini.wave(); for (const l of A.hello) await riniSay(l.text, l.choices, null, l.gloss); }
  async function listenStage() {
    stage = 'listen'; curMission = 0; log('state listen');
    shot('listen');
    await riniSay(A.listen.ask, null, '해 볼게');
    let last = -1, panned = !portrait();
    if (H.AUTOTEST) (async () => { for (const id of ['ramyeon', 'gwaja', 'ppang', 'uyu', 'icecream']) { await wait(0.9); tap(byId[id]); } })();
    await until(() => {
      const n = Math.min(5, heard.size); if (n !== last) { last = n; missionInfo(A.listen.ask, A.listen.counter + ' ' + n + ' / 5'); }
      if (!panned && n >= 3 && !H.inXR()) { panned = true; wait(1.6).then(() => shot('coolers', null, 1.4)); }
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
        const p = ui.card; p.clear(); p.pad = 40;
        p.text(A.repeat.card, 26, '#7a6ad0', { bold: true, align: 'center', gap: 4 });
        p.text(w.ko, 84, INK, { bold: true, align: 'center', gap: 2 });
        p.text(w.ro + (gloss(w) ? '  ·  ' + gloss(w) : ''), 28, DIM, { align: 'center', gap: 20 });
        buttonRow(p, [A.repeat.again, A.repeat.said], ['#ece5d8', '#3f9e5c'], 88);
        p.finish(); placeCard(p, it); p.show(true);
        await riniSpeak(w.ko); await wait(0.3);
        const i = await waitPick(p, 1, 1.0); p.show(false);
        if (i === 1) break;
      }
      it.halo.material.opacity = 0; toast(A.repeat.good, 1.2); H.sfx('piece'); await wait(0.6);
    }
    missionInfo(''); finish(1); shot('room'); await riniSay(A.repeat.done);
  }
  const listText = () => A.find.note + ': ' + A.list.map(id => byId[id].w.ko).join(' · ');
  async function findStage() {
    stage = 'intro'; curMission = 2; log('state find');
    missionInfo(A.find.ask, listText());
    await riniSay(A.find.ask, null, '네');
    // 바구니 들기
    stage = 'basket'; shot('door'); missionInfo(A.find.basket, listText());
    const bm = A.find.basket; riniToast(bm, 3); riniSpeak(bm);
    const hintAt = H.now + 7;
    if (H.AUTOTEST) wait(1.0).then(() => tap(byId.baguni));
    await until(() => { if (!basket && H.now > hintAt) hint(byId.baguni, true); return !!basket; });
    stage = 'intro'; riniToast(A.find.basketOk, 2); await riniSpeak(A.find.basketOk); await wait(0.6);
    // 쪽지 물건: 물어보기 → 대답 듣기 → 찾아 담기
    for (const id of A.list) {
      target = byId[id]; const w = target.w;
      shot('room');
      missionInfo(fill(A.find.askBtn, w), listText());
      await myLine(fill(A.find.askBtn, w), null, null);
      const ans = fill(A.find.answer, w) + ' ' + fill(A.find.pick, w);
      riniToast(ans, 4); shot('item', target, 1.0); await riniSpeak(fill(A.find.answer, w));
      stage = 'find'; missionInfo(fill(A.find.pick, w), listText()); riniSpeak(fill(A.find.pick, w));
      const at = H.now + 8;
      if (H.AUTOTEST) wait(1.0).then(() => tap(target));
      await until(() => { if (!target.used && H.now > at) hint(target, true); return target.used; });
      stage = 'intro'; hint(target, false);
      await wait(0.8); const ok = fill(A.find.ok, w); riniToast(ok, 2.2); await riniSpeak(ok); await wait(0.3);
    }
    target = null; missionInfo(''); finish(2); shot('room'); await riniSay(A.find.done);
  }
  async function quizStage() {
    stage = 'quiz'; curMission = 3; log('state quiz');
    await riniSay(A.quiz.ask, null, '네'); missionInfo(A.quiz.q);
    const goods = A.words.filter(w => w.price);
    for (const id of A.quizWords) {
      const it = byId[id];
      await shot('item', it, 0.9);
      it.halo.material.opacity = 0.8; H.burst(it.g.getWorldPosition(V3()).add(V3(0, 0.1, 0)), '#ffd27a', 20, 0.5, 0.7, 0.025);
      const others = goods.filter(w => w.id !== id).sort(() => Math.random() - 0.5).slice(0, 2);
      const opts = [it.w, ...others].sort(() => Math.random() - 0.5), correct = opts.indexOf(it.w);
      const p = ui.card; p.clear(); p.pad = 36;
      p.text(A.quiz.q, 42, INK, { bold: true, align: 'center', gap: 16 });
      buttonRow(p, opts.map(w => w.ko), '#3b3550', 96);
      p.finish(); placeCard(p, it); p.show(true);
      riniSpeak(A.quiz.q);
      const i = await waitPick(p, correct, H.Q.get('slow') ? 4 : 1.0); p.show(false);
      if (i === correct) { toast(A.quiz.ok, 1.4); H.sfx('complete'); await riniSpeak(A.quiz.ok); }
      else { const msg = fill(A.quiz.wrong, it.w); toast(msg, 2.5); await riniSpeak(msg); }
      it.halo.material.opacity = 0; await wait(0.4);
    }
    // 값 묻기
    { const q = A.priceQuiz, it = byId[q.id], msg = fill(A.quiz.pq, it.w);
      const others = items.filter(o => o.tag && o !== it); others.forEach(o => { o.tag.visible = false; });   // 윗칸 값표가 바로 위에 보여 헷갈리지 않게 이 물건 값표만 남긴다
      await shot('item', it, 0.9); it.halo.material.opacity = 0.8;
      const p = ui.card; p.clear(); p.pad = 36;
      p.text(msg, 42, INK, { bold: true, align: 'center', gap: 16 });
      buttonRow(p, q.choices, '#3b3550', 96);
      p.finish(); placeCard(p, it); p.show(true);
      riniSpeak(msg);
      const i = await waitPick(p, q.answer, H.Q.get('slow') ? 4 : 1.0); p.show(false);
      if (i === q.answer) { toast(A.quiz.ok, 1.4); H.sfx('complete'); await riniSpeak(A.quiz.ok); }
      else { const m = fill(A.quiz.pwrong, it.w); toast(m, 2.5); await riniSpeak(m); }
      it.halo.material.opacity = 0; others.forEach(o => { o.tag.visible = true; }); await wait(0.4); }
    missionInfo(''); finish(3); shot('room'); await riniSay(A.quiz.done);
  }
  async function payStage() {
    stage = 'pay'; curMission = 4; log('state pay');
    const Y = A.pay;
    await riniSay(Y.move.text, Y.move.choices, null, Y.move.gloss);
    shot('counter');
    if (basket) await flyTo(basket, V3(C.x - 0.15, C.h, C.z + 0.05), 0.8, 0.3);
    missionInfo(Y.title);
    await myLine(Y.how.text, Y.how.gloss, null);
    await riniSay(Y.total.text, Y.total.choices, null, Y.total.gloss);
    const b = await riniSay(Y.bag.text, Y.bag.choices, null, Y.bag.gloss);
    if (b === 0) { const bag = S.product('bongtu'); bag.position.copy(where('bongtu')); H.world.add(bag); await flyTo(bag, V3(C.x - 0.15 - 0.32, C.h, C.z + 0.08), 0.5, 0.15); }
    await riniSay(Y.bag.reply[b] || Y.bag.reply[0]);
    await riniSay(Y.card.text, Y.card.choices, null, Y.card.gloss);
    // 카드 대기
    stage = 'card'; missionInfo(Y.tap); riniToast(Y.tap, 3); riniSpeak(Y.tap);
    const at = H.now + 6;
    if (H.AUTOTEST) wait(1.0).then(() => tap(byId.kadeu));
    await until(() => { if (!paid && H.now > at) hint(byId.kadeu, true); return paid; });
    stage = 'pay'; missionInfo(Y.title); await wait(0.4); riniToast(Y.tapped, 2); await riniSpeak(Y.tapped);
    const r = await riniSay(Y.receipt.text, Y.receipt.choices, null, Y.receipt.gloss);
    await riniSay(Y.receipt.reply[r] || Y.receipt.reply[0]);
    if (rini) rini.wave();
    await riniSay(Y.bye.text, Y.bye.choices, null, Y.bye.gloss);
    missionInfo(''); finish(4);
  }
  async function ending() {
    stage = 'free'; log('state ending');
    const E = A.ending;
    for (;;) {
      let p = ui.card; p.clear(); p.pad = 40;
      p.text(E.cardKicker, 26, '#3f9e5c', { bold: true, align: 'center', gap: 4 });
      p.text(E.cardTitle, 50, INK, { bold: true, align: 'center', gap: 14 });
      for (const w of A.words) p.row([{ t: w.ko, size: 32, color: INK, bold: true }, { t: w.ro, size: 22, color: DIM }, { t: gloss(w) + (w.price ? (gloss(w) ? ' · ' : '') + w.priceKo : ''), size: 24, color: '#5a5470' }], 6);
      p.space(10); p.button('다음', null, '#3f9e5c', null, 84);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      log('state card');
      await waitPick(p, 0, 1.0); p.show(false); await wait(0.2);
      p = ui.card; p.clear(); p.pad = 40;
      p.text('오늘 배운 말', 26, '#3f9e5c', { bold: true, align: 'center', gap: 10 });
      for (const ph of A.phrases) p.row([{ t: ph.ko, size: 30, color: INK, bold: true }, { t: gloss(ph), size: 22, color: '#5a5470' }], 6);
      p.space(10); p.text(E.cultureTitle, 24, '#3f9e5c', { bold: true, gap: 4 });
      for (const c of E.culture) p.text('· ' + c, 24, '#5a5470', { gap: 4 });
      if (E.cultureSrc) p.text(E.cultureSrc, 18, DIM, { gap: 4 });
      p.space(12);
      p.button(E.free, null, '#3f9e5c', null, 84); p.button(E.restart, null, '#ece5d8', null, 76); p.button(E.exit, null, '#3b3550', null, 76);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { toast('물건을 눌러 이름을 다시 들어 보세요.', 3); shot('room'); await until(() => false); }
      if (i === 2) { const s = H.renderer.xr.getSession(); if (s) { s.end(); return; } }
      location.reload(); return;
    }
  }
  const JUMP = ['listen', 'repeat', 'find', 'quiz', 'pay', 'ending'].indexOf(H.Q.get('jump'));
  async function main() {
    await intro();
    if (JUMP < 0) await hello();
    showBoard();
    if (JUMP > 0) { for (let i = 0; i < Math.min(JUMP, 5); i++) done[i] = true; drawWrist(); }
    if (JUMP > 2) { await takeBasket(); for (const id of A.list) await intoBasket(byId[id]); }
    const stages = [listenStage, repeatStage, findStage, quizStage, payStage, ending];
    for (let i = Math.max(0, JUMP); i < stages.length; i++) await stages[i]();
  }

  // ───────────── 짓기·시작 ─────────────
  if (window.STORE_VOICE && !H.Q.has('tts')) H.voicePack('voice/', window.STORE_VOICE);
  buildShop(); buildItems(); buildBoard();
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  // 점원 = Tripo로 만든 편의점 옷 입은 하나(assets/clerk.glb): 동작 idle·talk·bow(인사 때 wave 자리에)
  const riniReady = H.loadChar({ url: 'assets/clerk.glb', height: 1.58, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', wave: 'bow' }, glow: 0.18 }).then(c => { rini = c; if (c) c.look = false; }).catch(e => log('clerk load failed', e && e.message));
  // 하나가 사용자를 보게: 엔진의 c.look은 맵(world)이 돌아가 있지 않다고 보고 계산해서, 휴대폰 혼합현실처럼 맵을 돌려 놓으면 엉뚱한 곳을 본다
  // (10-21 휴먼쌤 "패스스루로 하니까 하나 캐릭터가 다른곳을 바라보고 있음") → 머리 위치를 맵 안 좌표로 바꿔서 돌린다
  H.onUpdate(dt => {
    if (!rini || !rini.root.visible) return;
    const r = rini.root, lp = r.parent.worldToLocal(H.headPos()), dx = lp.x - r.position.x, dz = lp.z - r.position.z;
    if (dx * dx + dz * dz < 0.01) return;
    let d = (Math.atan2(dx, dz) - r.rotation.y) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    r.rotation.y += d * (1 - Math.exp(-3 * Math.min(dt || 0.016, 0.1)));
  });
  const ready = Promise.all([riniReady]).then(() => log('assets loaded'));
  H.start({ main, ready, start: { pos: POS.start, look: [0.1, -1.3] }, anchor: V3(0, 0, 0) });
  if (H.Q.has('looktest')) ready.then(async () => {   // 시험용: 맵을 돌려 놓아도(휴대폰 혼합현실) 하나가 사용자를 보는지 — 하나 앞과 사용자 쪽 사이 각도(도)
    const ang = () => { const r = rini.root, fw = V3(0, 0, 1).applyQuaternion(r.getWorldQuaternion(new THREE.Quaternion())), to = H.headPos().sub(r.getWorldPosition(V3())); fw.y = to.y = 0; return (Math.acos(Math.min(1, fw.normalize().dot(to.normalize()))) * 180 / Math.PI).toFixed(1); };
    for (const yaw of [0, 1.2, -2.0, 2.8]) { H.world.rotation.y = yaw; H.world.updateMatrixWorld(true); await wait(4); log('looktest yaw', yaw, 'angle', ang()); }
  });
  window.STOREX = { items, byId, tap, get stage() { return stage; }, get target() { return target; }, get rini() { return rini; } };
})();
