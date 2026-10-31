/* 「분식집에 가요」 v0.1 — 한국어 학습맵 3판 (2026-10-21, 공용 엔진 core.js, 2판 store.js의 틀을 이어 씀)
   흐름: 인사 → ① 메뉴 듣기(음식 톡 → 한글·로마자·뜻 + 값) → ② 따라 말하기 → ③ 주문하기(쪽지 3개를 눌러 "○○ 하나 주세요" → 맵게? → 여기서/포장?) → ④ 묻고 답하기(이게 뭐예요? · 얼마예요?) → ⑤ 계산하고 먹기(얼마예요? · 현금 · 잘 먹겠습니다/잘 먹었습니다 · 인사) → 오늘 배운 말 카드
   주소 옵션: ?lang=fr|en|ko (뜻 언어, 기본 fr) · ?jump=listen|repeat|order|quiz|pay|ending · ?autotest=1 · ?mrtest=1 · ?slow=1 · ?tts=1 · ?pojang=1(자동 시험에서 포장 갈래)   */
(function () {
  'use strict';
  const H = window.HW, A = window.BUNSIK, S = window.BUNSIK_SPACE;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[BUNSIK]', ...a);
  const LANG = ['fr', 'en', 'ko'].includes(H.Q.get('lang')) ? H.Q.get('lang') : 'fr';
  const gloss = o => (LANG === 'ko' || !o) ? '' : (o[LANG] || o.en || '');

  // 조사: 받침에 따라 을/를 · 은/는 · 이에요/예요
  const batchim = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const eulreul = w => w + (batchim(w) ? '을' : '를');
  const eunneun = w => w + (batchim(w) ? '은' : '는');
  const ieyo = w => w + (batchim(w) ? '이에요' : '예요');
  const fill = (s, w, other) => s.replace('{을를}', eulreul(w.ko)).replace('{은는}', eunneun(w.ko)).replace('{이에요}', ieyo(w.ko)).replace('{그이에요}', other ? ieyo(other.ko) : '')
    .replace('{price}', w.priceKo || '').replace('{ko}', w.ko);
  const fillN = (s, w, n) => fill(s, w).replace('{n}', n);

  // ───────────── 자리 ─────────────
  // 안쪽에 긴 조리대(그 뒤에 하나와 메뉴판), 오른쪽 앞에 손님 탁자, 오른쪽 벽에 정수기.
  const POS = { start: [0, 2.2], rini: [-0.6, -1.75] };
  const C = { x: -0.55, z: -1.15, w: 2.9, d: 0.7, h: 0.88 };            // 조리대
  const SZ = C.z - 0.1;                                                  // 진열 줄
  const SX = { pojang: -1.85, tteokbokki: -1.42, eomuk: -0.95, twigim: -0.5, sundae: -0.05, gimbap: 0.32, ramyeon: 0.68 };
  const MENU = { x: -0.55, y: 1.95, z: -1.98 };                          // 메뉴판
  const T = { x: 1.45, z: -0.25 };                                       // 손님 탁자
  const WATER = { x: 1.95, z: -1.5 };                                    // 정수기
  const TRAY = V3(-0.75, C.h, C.z + 0.2), CASH = V3(0.72, C.h, C.z + 0.22);
  const BOARD = V3(0.75, 1.95, -1.7), TALK = V3(-0.45, 1.5, -0.6);
  H.bounds.r = 5;
  H.setSky('#f6e3c8', '#f6efe2', '#d9cbb6', '#f6efe2');
  H.hemi.intensity = 1.05; H.sun.intensity = 0.85; H.sun.position.set(-2, 9, 4);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  // ───────────── 가게 ─────────────
  let cnt, tbl, tray;
  function buildShop() {
    S.build({ name: A.shopName });
    cnt = S.counter(H.world, C.x, C.z, C.w, C.d, C.h);
    tbl = S.table(H.world, T.x, T.z);
    tray = S.tray(); tray.position.copy(TRAY); H.world.add(tray);
  }

  // ───────────── 낱말(진열) ─────────────
  function where(id) {
    if (SX[id] != null) return V3(SX[id], C.h, SZ);
    if (id === 'mul') return V3(WATER.x, 0, WATER.z);
    if (id === 'hyeongeum') return CASH.clone();
    return V3(MENU.x, 0, MENU.z);
  }
  const items = [], byId = {};
  let stage = 'intro', target = null;
  const heard = new Set();
  function buildItems() {
    for (const w of A.words) {
      let g;
      if (w.id === 'menupan') g = S.menuBoard(H.world, MENU.x, MENU.y, MENU.z, A.words.filter(x => x.price));
      else { g = new THREE.Group(); g.position.copy(where(w.id)); g.add(S.station(w.id)); H.world.add(g); }
      g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g), size = box.getSize(V3()), center = g.worldToLocal(box.getCenter(V3()));
      g.userData.size = size; g.userData.center = center;
      const hr = w.id === 'menupan' ? 0.45 : w.id === 'mul' ? 0.3 : Math.max(0.13, Math.max(size.x, size.y, size.z) * 0.6);
      const hm = new THREE.Mesh(geo.lowSphere, hitMat); hm.scale.setScalar(hr); hm.position.copy(center); g.add(hm);
      const halo = H.glowSprite('#ffd27a', Math.max(0.3, Math.max(size.x, size.y) * 1.4), 0); halo.position.copy(center); g.add(halo);
      let tag = null;
      if (w.price) tag = S.priceTag(H.world, g.position.x, C.h - 0.13, C.z + C.d / 2 + 0.004, w.price);
      const it = { w, g, halo, tag };
      H.addPickable(g, () => tap(it), on => { if (!it.used) g.scale.setScalar(on ? 1.05 : 1); });
      items.push(it); byId[w.id] = it;
    }
  }
  const centerOf = it => it.g.localToWorld(it.g.userData.center.clone());
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
    const wp = centerOf(labelFor); wp.y += (labelFor.g.userData.size ? labelFor.g.userData.size.y / 2 : 0.05) + 0.13; H.face(label, wp);
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
    H.burst(centerOf(it), '#ffffff', 14, 0.4, 0.5, 0.02);
    const my = ++hearing;
    await riniSpeak(w.ko);
    if (my !== hearing || !sentence) return;
    if (stage === 'listen' || stage === 'free') {
      const line = fill(A.listen.say, w) + (w.price ? ' ' + fill(A.listen.price, w) : '');
      riniToast(line, 4); await riniSpeak(line);
    }
  }
  function tap(it) {
    if (stage === 'order') { if (it === target) { it.picked = true; hint(it, false); H.sfx('select'); showLabel(it); } else wrongPick(it, target); return; }
    if (stage === 'cash') { if (it.w.id === 'hyeongeum') payCash(); else hear(it, false); return; }
    hear(it, stage !== 'quiz' && stage !== 'repeat' && stage !== 'pay' && stage !== 'eat');
  }
  function wrongPick(it, want) { const msg = fill(A.order.wrong, want.w, it.w); riniToast(msg, 3.5); riniSpeak(msg); showLabel(it); want.halo.material.opacity = 0.7; }
  const hint = (it, on) => { it.halo.material.opacity = on ? 0.7 : 0; };

  // ───────────── 쟁반·음식 ─────────────
  function flyTo(obj, to, dur = 0.7, lift = 0.35) {   // obj(월드 자식)를 포물선으로
    const from = obj.position.clone(), mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + lift;
    return H.tween(dur, k => { const e = H.ease(k); const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); obj.position.copy(a.lerp(b, e)); }).then(() => obj.position.copy(to));
  }
  const SPOTS = [V3(-0.13, 0.012, 0.05), V3(0.12, 0.012, 0.05), V3(0, 0.012, -0.08)];
  const dishes = [];
  let mild = false;
  async function serve(it) {
    const d = S.dish(it.w.id, { mild }); d.position.copy(centerOf(it)); d.position.y = C.h + 0.15; H.world.add(d);
    const spot = SPOTS[dishes.length];
    await flyTo(d, tray.position.clone().add(spot), 0.75, 0.3);
    tray.attach(d); dishes.push({ g: d, id: it.w.id, eaten: false });
    H.sfx('complete'); H.burst(tray.localToWorld(spot.clone()), '#ffe2a8', 22, 0.5, 0.6, 0.02); log('served', it.w.id);
  }
  // ───────────── 현금 ─────────────
  let paid = false;
  async function payCash() {
    if (paid) return; paid = true;
    const it = byId.hyeongeum; hint(it, false);
    const bill = it.g.children[0].userData.bill;   // 받침은 두고 돈만 하나 쪽으로
    const to = V3(C.x + 0.9, C.h + 0.02, C.z - 0.22);
    H.world.attach(bill); await flyTo(bill, H.world.worldToLocal(to), 0.6, 0.2);
    H.sfx('complete'); H.burst(to, '#b8e6a8', 26, 0.5, 0.6, 0.02); log('cash paid');
  }

  // ───────────── 안내판(지금 할 일)·미션 목록 ─────────────
  let board, task = '', taskExtra = '';
  function drawBoard() { const p = board; p.clear(); p.pad = 26; p.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 4 }); p.text(task || (curMission >= 0 ? MISSIONS[curMission] + ' — ' + A.guide.name + ' 말을 들어 보세요' : A.guide.name + ' 말을 들어 보세요'), 30, '#ffffff', { gap: taskExtra ? 8 : 0 }); if (taskExtra) p.text(taskExtra, 26, '#c9c4d6', { gap: 0 }); p.finish(); p.pin(); }
  function missionInfo(t, extra) { task = t || ''; taskExtra = extra || ''; if (board) drawBoard(); }
  function buildBoard() { board = new Panel('board', 620, 'rgba(33,31,46,0.88)'); drawBoard(); board.mesh.visible = false; board.mesh.position.copy(BOARD); H.world.add(board.mesh); board.mesh.lookAt(V3(POS.start[0], 1.6, POS.start[1])); }
  function showBoard() { if (H.useHud()) H.hud(board, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.56 : 0.36); board.mesh.visible = true; drawWrist(); }
  const MISSIONS = [A.listen.title, A.repeat.title, A.quiz.title, A.order.title, A.pay.title], done = MISSIONS.map(() => false);   // 10-31: 묻고 답하기를 주문 앞으로
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
  async function riniSay(text, choices, single, g, auto) { ui.toast.show(false); H.speak(text); return say(spk(), text, choices, single || '다음', { at: TALK, sub: gloss(g) || undefined, auto: auto || 0 }); }

  // ───────────── 화면 모드 카메라: 단계마다 볼 것을 크게 (1·2판과 같은 방식) ─────────────
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
    room: () => portrait() ? frame(V3(-0.55, 1.15, -1.4), 2.0, 2.0, { up: 0.2 })                                  // 세로: 하나·조리대·메뉴판
                           : frame(V3(0.1, 1.1, -1.1), 3.7, 2.0, { up: 0.2 }),                                     // 가로: 조리대·하나·메뉴판·탁자
    listen: () => portrait() ? frame(V3(-1.1, 0.98, SZ), 1.25, 0.5, { up: 0.45 })                                 // 세로: 왼쪽 반(떡볶이·어묵·튀김)
                             : frame(V3(-0.6, 0.98, SZ), 2.9, 0.7, { up: 0.45 }),                                   // 가로: 조리대 전체
    listen2: () => frame(V3(0.2, 0.98, SZ), 1.3, 0.5, { up: 0.45 }),                                               // 세로: 오른쪽 반(순대·김밥·라면)
    menu: () => frame(V3(MENU.x, MENU.y, MENU.z), 1.6, 0.75, { up: 0.05 }),
    item: it => { const p = centerOf(it), s = it.g.userData.size || V3(0.15, 0.1, 0.15); p.y -= s.y * 0.15; return frame(p, Math.max(0.45, Math.max(s.x, s.z) * 1.8), Math.max(0.36, s.y * 2.4), { up: 0.55, min: 0.5 }); },   // 조금 아래를 가운데로: 앞판 값표가 같이 보이게
    tray: () => frame(V3(TRAY.x + 0.1, 1.0, TRAY.z - 0.25), 1.4, 0.9, { up: 0.55 }),                             // 하나·쟁반
    pay: () => frame(V3(0.0, 1.05, C.z - 0.1), 1.9, 1.3, { up: 0.4, side: 0.1 }),                                // 하나·쟁반·현금
    table: () => frame(V3(T.x, 0.78, T.z), 0.95, 0.5, { up: 0.95, min: 0.6 })                                     // 탁자 위 음식
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
    if (it) H.placeToward(p, centerOf(it), 0.85, 0.45, -0.2); else H.placeAhead(p, 1.1, 0, -0.25);
  }
  function buttonRow(p, labels, color, h = 92) {
    const gap = 16, n = labels.length, bw = (p.w - p.pad * 2 - gap * (n - 1)) / n, y = p.y;
    labels.forEach((t, i) => { const b = p.button(t, null, Array.isArray(color) ? color[i] : color, null, h, 0); b.x = p.pad + i * (bw + gap); b.w = bw; b.y = y; p.y = y; });
    p.y = y + h + 16;
  }
  // 내가 하는 말(버튼 하나): "하나에게 말해 보세요" 카드
  async function myLine(text, g, it) {
    const p = ui.card; p.clear(); p.pad = 36;
    p.text('하나에게 말해 보세요', 26, '#c0392b', { bold: true, align: 'center', gap: 6 });
    if (gloss(g)) p.text(gloss(g), 24, DIM, { align: 'center', gap: 12 });
    buttonRow(p, [text], '#d8402f', 96);
    p.finish(); placeCard(p, it); p.show(true);
    await waitPick(p, 0, 1.0); p.show(false); H.sfx('piece');
  }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#d8402f', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 72, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 14 });
    p.text(A.credit, 22, DIM, { align: 'center', gap: 30 });
    p.button(A.start, null, '#d8402f', null, 110);
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
    shot('listen');
    await riniSay(A.listen.ask, null, '해 볼게');
    let last = -1, panned = !portrait(), menuShot = false;
    if (H.AUTOTEST) (async () => { for (const id of ['tteokbokki', 'eomuk', 'sundae', 'gimbap', 'menupan']) { await wait(0.9); tap(byId[id]); } })();
    await until(() => {
      const n = Math.min(5, heard.size); if (n !== last) { last = n; missionInfo(A.listen.ask, A.listen.counter + ' ' + n + ' / 5'); }
      if (!panned && n >= 2 && !H.inXR()) { panned = true; wait(1.6).then(() => shot('listen2', null, 1.4)); }
      if (!menuShot && n >= 4 && !H.inXR()) { menuShot = true; wait(1.6).then(() => shot('menu', null, 1.4)); }
      return n >= 5;
    });
    await wait(1.2); missionInfo(''); finish(0); shot('room'); await riniSay(A.listen.done);
  }
  async function repeatStage() {
    stage = 'repeat'; curMission = 1; log('state repeat');
    await riniSay(A.repeat.ask, null, '좋아요'); missionInfo(A.repeat.ask);
    for (const id of A.repeatWords) {
      const it = byId[id], w = it.w; it.halo.material.opacity = 0.6;
      await shot('item', it, 0.9);
      for (;;) {
        const p = ui.card; p.clear(); p.pad = 40;
        p.text(A.repeat.card, 26, '#c0392b', { bold: true, align: 'center', gap: 4 });
        p.text(w.ko, 84, INK, { bold: true, align: 'center', gap: 2 });
        p.text(w.ro + (gloss(w) ? '  ·  ' + gloss(w) : ''), 28, DIM, { align: 'center', gap: 20 });
        buttonRow(p, [A.repeat.again, A.repeat.said], ['#ece5d8', '#d8402f'], 88);
        p.finish(); placeCard(p, it); p.show(true);
        await riniSpeak(w.ko); await wait(0.3);
        const i = await waitPick(p, 1, 1.0); p.show(false);
        if (i === 1) break;
      }
      it.halo.material.opacity = 0; toast(A.repeat.good, 1.2); H.sfx('piece'); await wait(0.6);
    }
    missionInfo(''); finish(1); shot('room'); await riniSay(A.repeat.done);
  }
  const listText = () => A.order.note + ': ' + A.orderList.map(o => byId[o.id].w.ko + ' ' + o.n).join(' · ');
  let eatHere = true;
  async function orderStage() {
    stage = 'intro'; curMission = 3; log('state order');
    missionInfo(A.order.ask, listText());
    await riniSay(A.order.ask, null, '네');
    for (const o of A.orderList) {
      target = byId[o.id]; const w = target.w;
      // 먼저 그 음식을 눌러 고른다
      stage = 'order'; await shot('item', target, 0.9);
      const pk = fill(A.order.pick, w); missionInfo(pk, listText()); riniToast(pk, 3); riniSpeak(pk);
      const at = H.now + 7;
      if (H.AUTOTEST) wait(1.0).then(() => tap(target));
      await until(() => { if (!target.picked && H.now > at) hint(target, true); return target.picked; });
      stage = 'intro'; hint(target, false); await wait(0.3);
      // 주문하는 말
      const line = fillN(A.order.line, w, o.n);
      missionInfo(line, listText());
      await myLine(line, null, target);
      const ok = fillN(A.order.ok, w, o.n); riniToast(ok, 2.2); await riniSpeak(ok);
      if (o.id === 'tteokbokki') {
        const s = A.order.spicy, c = await riniSay(s.text, s.choices, null, s.gloss);
        mild = c === 1; await riniSay(s.reply[c] || s.reply[0]);
      }
      shot('tray', null, 0.8);
      await serve(target); riniToast(A.order.here, 1.6); await riniSpeak(A.order.here); await wait(0.3);
    }
    target = null;
    const wq = A.order.where;
    const c = await riniSay(wq.text, wq.choices, null, wq.gloss, H.AUTOTEST && H.Q.get('pojang') ? 1 : 0);
    eatHere = c !== 1; log('eat here', eatHere);
    await riniSay(wq.reply[c] || wq.reply[0]);
    missionInfo(''); finish(3); shot('room'); await riniSay(A.order.done);
  }
  async function quizStage() {
    stage = 'quiz'; curMission = 2; log('state quiz');
    await riniSay(A.quiz.ask, null, '네'); missionInfo(A.quiz.q);
    const foods = A.words.filter(w => w.price);
    for (const id of A.quizWords) {
      const it = byId[id];
      await shot('item', it, 0.9);
      it.halo.material.opacity = 0.8; H.burst(centerOf(it), '#ffd27a', 20, 0.5, 0.7, 0.025);
      const others = foods.filter(w => w.id !== id).sort(() => Math.random() - 0.5).slice(0, 2);
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
    // 값 묻기: 그 음식 값표만 남긴다
    { const q = A.priceQuiz, it = byId[q.id], msg = fill(A.quiz.pq, it.w);
      const others = items.filter(o => o.tag && o !== it); others.forEach(o => { o.tag.visible = false; });
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
    missionInfo(''); finish(2); shot('room'); await riniSay(A.quiz.done);
  }
  async function eatDish(d) {
    if (d.eaten) return; d.eaten = true; H.removePickable(d.g); H.sfx('piece');
    H.burst(d.g.getWorldPosition(V3()).add(V3(0, 0.05, 0)), '#ffe2a8', 18, 0.4, 0.5, 0.02);
    toast(A.pay.yum, 1.2);
    const food = d.g.children.slice(1);   // 첫 자식(그릇)은 남기고 음식만 줄인다
    await H.tween(0.5, k => food.forEach(o => o.scale.setScalar(Math.max(0.001, 1 - k))));
    food.forEach(o => { o.visible = false; });
  }
  async function payStage() {
    stage = 'pay'; curMission = 4; log('state pay');
    const Y = A.pay;
    shot('pay');
    missionInfo(Y.title);
    await myLine(Y.how.text, Y.how.gloss, null);
    await riniSay(Y.total.text, Y.total.choices, null, Y.total.gloss);
    await myLine(Y.cash.text, Y.cash.gloss, null);
    // 현금 대기
    stage = 'cash'; missionInfo(Y.tap); riniToast(Y.tap, 3); riniSpeak(Y.tap);
    const at = H.now + 6;
    if (H.AUTOTEST) wait(1.0).then(() => tap(byId.hyeongeum));
    await until(() => { if (!paid && H.now > at) hint(byId.hyeongeum, true); return paid; });
    stage = 'pay'; missionInfo(Y.title); await wait(0.4); riniToast(Y.thanks, 2); await riniSpeak(Y.thanks);
    if (eatHere) {
      // 쟁반을 탁자로 + 물 한 컵
      await flyTo(tray, V3(T.x, tbl.top, T.z), 0.9, 0.35);
      const cup = S.dish('mul'); cup.position.set(T.x + 0.3, tbl.top, T.z + 0.12); H.world.add(cup);
      await shot('table', null, 1.0);
      await riniSay(Y.eat.text, Y.eat.choices, null, Y.eat.gloss);
      stage = 'eat'; missionInfo(Y.eatTap); riniToast(Y.eatTap, 3); riniSpeak(Y.eatTap);
      for (const d of dishes) H.addPickable(d.g, () => eatDish(d), on => { if (!d.eaten) d.g.scale.setScalar(on ? 1.06 : 1); });
      if (H.AUTOTEST) (async () => { for (const d of dishes) { await wait(0.8); eatDish(d); } })();
      await until(() => dishes.every(d => d.eaten));
      await wait(0.8); stage = 'pay'; missionInfo(Y.title);
      await myLine(Y.full.text, Y.full.gloss, null);
    } else {
      // 포장: 음식이 봉투로
      const bag = S.takeoutBag(); bag.position.copy(tray.position).add(V3(0, 0.012, 0)); bag.scale.setScalar(0.001); H.world.add(bag);
      await H.tween(0.6, k => { dishes.forEach(d => d.g.scale.setScalar(Math.max(0.001, 1 - k))); bag.scale.setScalar(Math.max(0.001, k)); });
      dishes.forEach(d => { d.g.visible = false; }); H.sfx('complete');
      await riniSay(Y.pack.text, Y.pack.choices, null, Y.pack.gloss);
    }
    shot('room');
    if (rini) rini.wave();
    await riniSay(Y.bye.text, Y.bye.choices, null, Y.bye.gloss);
    missionInfo(''); finish(4);
  }
  async function ending() {
    stage = 'free'; log('state ending');
    const E = A.ending;
    for (;;) {
      let p = ui.card; p.clear(); p.pad = 40;
      p.text(E.cardKicker, 26, '#d8402f', { bold: true, align: 'center', gap: 4 });
      p.text(E.cardTitle, 50, INK, { bold: true, align: 'center', gap: 14 });
      for (const w of A.words) p.row([{ t: w.ko, size: 32, color: INK, bold: true }, { t: w.ro, size: 22, color: DIM }, { t: gloss(w) + (w.price ? (gloss(w) ? ' · ' : '') + w.priceKo : ''), size: 24, color: '#5a5470' }], 6);
      p.space(10); p.button('다음', null, '#d8402f', null, 84);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      log('state card');
      await waitPick(p, 0, 1.0); p.show(false); await wait(0.2);
      p = ui.card; p.clear(); p.pad = 40;
      p.text('오늘 배운 말', 26, '#d8402f', { bold: true, align: 'center', gap: 10 });
      for (const ph of A.phrases) p.row([{ t: ph.ko, size: 30, color: INK, bold: true }, { t: gloss(ph), size: 22, color: '#5a5470' }], 6);
      p.space(10); p.text(E.cultureTitle, 24, '#d8402f', { bold: true, gap: 4 });
      for (const c of E.culture) p.text('· ' + c, 24, '#5a5470', { gap: 4 });
      if (E.cultureSrc) p.text(E.cultureSrc, 18, DIM, { gap: 4 });
      p.space(12);
      p.button(E.free, null, '#d8402f', null, 84); p.button(E.restart, null, '#ece5d8', null, 76); p.button(E.exit, null, '#3b3550', null, 76);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { toast('음식을 눌러 이름을 다시 들어 보세요.', 3); shot('room'); await until(() => false); }
      if (i === 2) { const s = H.renderer.xr.getSession(); if (s) { s.end(); return; } }
      location.reload(); return;
    }
  }
  const JUMP = ['listen', 'repeat', 'quiz', 'order', 'pay', 'ending'].indexOf(H.Q.get('jump'));
  async function main() {
    await intro();
    if (JUMP < 0) await hello();
    showBoard();
    if (JUMP > 0) { for (let i = 0; i < Math.min(JUMP, 5); i++) done[i] = true; drawWrist(); }
    if (JUMP > 3) { for (const o of A.orderList) await serve(byId[o.id]); }
    const stages = [listenStage, repeatStage, quizStage, orderStage, payStage, ending];
    for (let i = Math.max(0, JUMP); i < stages.length; i++) await stages[i]();
  }

  // ───────────── 짓기·시작 ─────────────
  if (window.BUNSIK_VOICE && !H.Q.has('tts')) H.voicePack('voice/', window.BUNSIK_VOICE);
  buildShop(); buildItems(); buildBoard();
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  // 두건: 분식집 하나 머리에 빨간 두건(코드). 머리 뼈에 붙여 동작을 따라간다.
  function addBandana(c) {
    let head = null; c.root.traverse(o => { if (!head && o.isBone && /head$/i.test(o.name)) head = o; });
    if (!head) { log('no head bone'); return; }
    c.root.updateMatrixWorld(true);
    const hp = head.getWorldPosition(V3()), top = c.root.getWorldPosition(V3()).y + 1.58;
    const hh = top - hp.y, r = hh * 0.56;
    const cap = new THREE.Group(); cap.position.set(hp.x, top - r * 0.82, hp.z + r * 0.02); H.world.add(cap);
    const m = std('#a01f14', 0.75);
    mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, cap, [0, 0, 0], [r * 1.1, r * 0.95, r * 1.15]);
    mesh(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), std('#ffffff', 0.6, { side: THREE.DoubleSide }), cap, [0, r * 0.03, 0], [r * 1.11, r * 0.12, r * 1.16]);
    mesh(geo.sphere, m, cap, [0, r * 0.15, -r * 1.14], [r * 0.3, r * 0.22, r * 0.18]);   // 뒤 매듭
    head.attach(cap); log('bandana on', head.name, 'r', r.toFixed(3));
  }
  // 점원 = 2판 Tripo 하나(assets/clerk.glb)에서 앞치마를 분식집 빨강으로 바꾼 것: 동작 idle·talk·bow
  const riniReady = H.loadChar({ url: 'assets/clerk.glb', height: 1.58, pos: P(POS.rini),
    clips: { idle: 'idle', talk: 'talk', wave: 'bow' }, glow: 0.18 }).then(c => { rini = c; if (c) { c.look = false; addBandana(c); } }).catch(e => log('clerk load failed', e && e.message));
  // 하나가 사용자를 보게(2판과 같게: 맵을 돌려 놓은 혼합현실에서도 맞게 머리 위치를 맵 안 좌표로 바꿔서 돌린다)
  H.onUpdate(dt => {
    if (!rini || !rini.root.visible) return;
    const r = rini.root, lp = r.parent.worldToLocal(H.headPos()), dx = lp.x - r.position.x, dz = lp.z - r.position.z;
    if (dx * dx + dz * dz < 0.01) return;
    let d = (Math.atan2(dx, dz) - r.rotation.y) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    r.rotation.y += d * (1 - Math.exp(-3 * Math.min(dt || 0.016, 0.1)));
  });
  const ready = Promise.all([riniReady]).then(() => log('assets loaded'));
  H.start({ main, ready, start: { pos: POS.start, look: [-0.3, -1.3] }, anchor: V3(0, 0, 0) });
  window.BUNSIKX = { items, byId, tap, dishes, get stage() { return stage; }, get target() { return target; }, get rini() { return rini; } };
})();
