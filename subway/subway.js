/* 「지하철을 타요」 v0.1 — 한국어 학습맵 4판 (2026-10-21, 공용 엔진 core.js, 2판 store.js의 틀을 이어 씀)
   흐름: 인사 → ① 이름 듣기(역 안 물건·표지판 톡) → ② 따라 말하기 → ③ 충전하기(친구 메시지 → "어디서 충전해요?" → 카드 올리고 금액 고르기)
         → ④ 길 묻기(노선도: "바다역 어떻게 가요?" · 몇 호선? · 어디서 갈아타요? · 몇 번 출구?) → ⑤ 지하철 타기(개찰구 → 방향 표지 → 1호선 → 공원역에서 2호선으로 갈아타기 → 바다역)
         → ⑥ 출구 찾기(3번 출구) → 오늘 배운 말 카드
   주소 옵션: ?lang=fr|en|ko (뜻 언어, 기본 fr) · ?jump=listen|repeat|charge|way|ride|exit|ending · ?autotest=1 · ?mrtest=1 · ?slow=1 · ?tts=1   */
(function () {
  'use strict';
  const H = window.HW, A = window.SUBWAY, S = window.SUBWAY_SPACE;
  const { V3, P, std, mesh, geo, wait, until, Panel, INK, DIM, ui, say, waitPick, showToast } = H;
  const log = (...a) => console.log('[SUBWAY]', ...a);
  const LANG = ['fr', 'en', 'ko'].includes(H.Q.get('lang')) ? H.Q.get('lang') : 'fr';
  const gloss = o => (LANG === 'ko' || !o) ? '' : (o[LANG] || o.en || '');
  S.setLines(A.lines);

  // ───────────── 자리 ─────────────
  // 왼쪽에 역무실(그 안에 하나), 가운데 왼쪽에 노선도, 가운데 오른쪽에 개찰구, 오른쪽에 충전 기계. 개찰구 뒤가 승강장(방향 표지·스크린도어·열차).
  const POS = { start: [0, 2.4], rini: [-2.3, -0.5] };
  const BOOTH = { x: -2.3, z: 0.25 }, MAP = { x: -0.72, z: 0.1 }, GATE = { x: 0.85, z: 0.0 }, MACH = [{ x: 2.35, z: 0.15 }, { x: 2.95, z: 0.15 }];
  const STAND = V3(1.85, 0, 0.75);                                     // 내 교통카드가 놓인 작은 받침
  const SIGN_Y = 2.3, SIGN_Z = -1.3;
  const BOARD = V3(0.2, 2.0, -0.9), TALK = V3(-1.2, 1.5, 0.6);
  H.bounds.r = 5;
  H.setSky('#cfd8e0', '#e9ece8', '#d6d2c8', '#e9ece8');
  H.hemi.intensity = 1.05; H.sun.intensity = 0.7; H.sun.position.set(-2, 9, 5);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  // ───────────── 역 ─────────────
  const station = new THREE.Group(), shell = new THREE.Group();
  H.world.add(station); H.vrOnly.add(shell);
  let booth, map, gate, mach1, mach2, doors, nameB, train, car, pillarB, card, exitMain, dirL, dirR, transfer, exitSigns = [];
  function buildStation() {
    S.buildShell(shell);
    booth = S.booth(station, BOOTH.x, BOOTH.z);
    map = S.mapBoard(station, MAP.x, MAP.z);
    gate = S.gates(station, GATE.x, GATE.z);
    mach1 = S.machine(station, MACH[0].x, MACH[0].z, true);
    mach2 = S.machine(station, MACH[1].x, MACH[1].z, false);
    doors = S.screenDoors(station);
    nameB = S.nameBoard(station, -1.0, 2.45, S.ST.z0 + 0.06);
    train = S.train(station);
    pillarB = S.pillar(station, -1.25, -1.45, A.lines[1].color);
    // 카드 받침
    mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.92, 14), std('#8c939a', 0.35, { metalness: 0.4 }), station, [STAND.x, 0.46, STAND.z]);
    mesh(geo.box, std('#3a3f45', 0.4), station, [STAND.x, 0.93, STAND.z], [0.2, 0.025, 0.14]);
    card = S.transitCard(); card.position.set(STAND.x, 0.945, STAND.z); card.rotation.y = 0.2; station.add(card);
    // 표지판
    exitMain = S.hangSign(station, MAP.x, 2.42, 0.7, 1.3, 0.32, S.exitMain());
    dirL = S.hangSign(station, -0.75, SIGN_Y, SIGN_Z, 1.3, 0.34, S.dirSign('학교역 방면', 'for Hakgyo', -1, A.lines[1].color));
    dirR = S.hangSign(station, 1.35, SIGN_Y, SIGN_Z, 1.3, 0.34, S.dirSign('공원·병원 방면', 'for Gongwon · Byeongwon', 1, A.lines[1].color));
    transfer = S.hangSign(station, 2.65, SIGN_Y, SIGN_Z, 1.3, 0.3, S.transferSign(A.lines[2].color));
    const xs = [-1.8, -0.6, 0.6, 1.8], dirs = [-1, -1, 1, 1];
    A.exits.forEach((e, i) => { const sg = S.hangSign(station, xs[i], SIGN_Y - 0.05, SIGN_Z, 1.1, 0.32, S.exitSign(e.n, e.to, dirs[i])); sg.visible = false; sg.userData.exit = e; exitSigns.push(sg); });
    car = S.carInside(H.world, H.vrOnly);
  }
  // 역 이름판·표지 바꾸기
  const STN = {
    hana: { name: '하나역', line: '1', color: A.lines[1].color, prev: '학교역', next: '공원역' },
    park: { name: '공원역', line: '2', color: A.lines[2].color, prev: '시장역', next: '바다역' },
    sea: { name: '바다역', line: '2', color: A.lines[2].color, prev: '공원역', next: '' }
  };
  let curStn = 'hana';
  function setStation(k) {
    curStn = k; nameB.set(STN[k]);
    dirL.visible = dirR.visible = k === 'hana';
    transfer.visible = k !== 'sea';
    exitSigns.forEach(s => { s.visible = k === 'sea'; });
    exitMain.visible = k !== 'sea';
    pillarB.g.visible = k === 'hana';
    map.g.visible = k !== 'sea';   // 바다역에서는 출구 표지가 잘 보이게 노선도를 치운다
    card.visible = k === 'hana' && !cardGone;
  }
  function showStation(on) { station.visible = shell.visible = on; if (rini) rini.root.visible = on; car.show(!on); }

  // ───────────── 낱말 물건 ─────────────
  const items = [], byId = {};
  let stage = 'intro', cardGone = false;
  const heard = new Set();
  function objFor(id) {
    switch (id) {
      case 'jihacheol': return train.g;
      case 'yeok': return nameB.g;
      case 'kadeu': return card;
      case 'chungjeon': return mach1.g;
      case 'gaechalgu': return gate.g;
      case 'chulgu': return exitMain;
      case 'yeongmuwon': { const g = new THREE.Group(); g.position.copy(P(POS.rini)); station.add(g); const hm = new THREE.Mesh(geo.capsule, hitMat); hm.scale.set(0.5, 0.75, 0.5); hm.position.y = 1.1; g.add(hm); g.userData.size = V3(0.5, 1.62, 0.5); g.userData.center = V3(0, 1.1, 0); return g; }
      case 'hoseon': return pillarB.face;
      case 'banghyang': return dirR;
      case 'garatayo': return transfer;
    }
  }
  function centerOf(g) {   // 물건 가운데(물건 자리 기준)
    if (g.userData.center) return g.userData.center.clone();
    g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g); const c = b.getCenter(V3()); return g.worldToLocal(c);
  }
  function buildItems() {
    for (const w of A.words) {
      const g = objFor(w.id);
      if (!g.userData.size) { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g); g.userData.size = b.getSize(V3()); }
      const c = centerOf(g), size = g.userData.size;
      if (w.id === 'kadeu') { const hm = new THREE.Mesh(geo.lowSphere, hitMat); hm.scale.setScalar(0.24); g.add(hm); }
      const halo = H.glowSprite('#ffd27a', Math.min(1.4, Math.max(0.35, Math.max(size.x, size.y) * 1.2)), 0); halo.position.copy(c);
      if (w.id === 'hoseon') halo.position.z += 0.05;
      g.add(halo);
      const it = { w, g, halo, c };
      H.addPickable(g, () => tap(it), on => { it.hover = on; });
      items.push(it); byId[w.id] = it;
    }
    // 낱말이 아닌 표지판(왼쪽 방향·출구 번호)도 누를 수 있다
    H.addPickable(dirL, () => tapDir(false));
    exitSigns.forEach((sg, i) => { sg.userData.halo = H.glowSprite('#ffd27a', 1.2, 0); sg.add(sg.userData.halo); H.addPickable(sg, () => tapExit(i)); });
  }
  // 이름표: 한글 크게 + 로마자 + 뜻
  const label = new Panel('wordLabel', 560, 'rgba(33,31,46,0.9)', 0.0006); label.pad = 22; H.scene.add(label.mesh);
  label.mat.depthTest = false; label.mesh.renderOrder = 25;
  let labelFor = null, labelHideAt = 0;
  function showLabel(it) {
    const w = it.w; label.clear();
    label.text(w.ko, 72, '#ffffff', { bold: true, align: 'center', gap: 2 });
    label.text(w.ro, 30, '#c9c4d6', { align: 'center', gap: gloss(w) ? 8 : 0 });
    if (gloss(w)) label.text(gloss(w), 34, '#ffd27a', { align: 'center', gap: 0 });
    label.finish(); label.show(true); labelFor = it; labelHideAt = H.now + 3.4; placeLabel();
  }
  function placeLabel() {
    const it = labelFor, wp = it.g.localToWorld(it.c.clone()); wp.y += Math.min(0.5, it.g.userData.size.y / 2) + 0.2; H.face(label, wp);
    label.hudScale = H.inXR() ? 1 : Math.max(1, H.headPos().distanceTo(wp) / 1.45);
  }
  H.onUpdate(() => {
    if (labelFor) { placeLabel(); if (H.now > labelHideAt) { label.show(false); labelFor = null; } }
    for (const it of items) if (it.halo.material.opacity > 0) it.halo.material.opacity = 0.45 + 0.3 * Math.sin(H.now * 5);   // 힌트 반짝임
    for (const sg of exitSigns) if (sg.userData.halo.material.opacity > 0) sg.userData.halo.material.opacity = 0.45 + 0.3 * Math.sin(H.now * 5);
  });

  // ───────────── 소리 ─────────────
  let hearing = 0, rini = null;
  async function riniSpeak(text) { if (rini && rini.root.visible) rini.setTalking(true); await H.speak(text); if (rini) rini.setTalking(false); }
  function toast(text, hold) { showToast(text, hold); if (H.useHud()) H.hud(ui.toast, 'bottom', 0.92); }
  const riniToast = (text, hold) => toast(A.guide.name + ': ' + text, hold);
  // 효과음(엔진 audio.js는 그대로 두고 여기서 만든다): 개찰구 '삑', 안내 방송 '딩동'
  function tone(seq) {
    const au = H.audio, ctx = au && au._ctx; if (!ctx || au.muted) return;
    const out = au._out || ctx.destination, t0 = ctx.currentTime + 0.02;
    for (const [f, at, dur, vol] of seq) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + 0.015); g.gain.exponentialRampToValueAtTime(0.0008, t0 + at + dur);
      o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.05);
    }
  }
  const beep = () => tone([[1320, 0, 0.16, 0.22]]);
  const chime = () => tone([[784, 0, 1.1, 0.2], [622, 0.45, 1.3, 0.2]]);
  async function hear(it, withLine) {
    const w = it.w; showLabel(it); heard.add(w.id); H.sfx('click');
    H.burst(it.g.localToWorld(it.c.clone()), '#ffffff', 14, 0.4, 0.5, 0.02);
    const my = ++hearing;
    await riniSpeak(w.ko);
    if (my !== hearing || !withLine) return;
    riniToast(w.line, 4); await riniSpeak(w.line);
  }
  function tap(it) {
    const id = it.w.id;
    if (stage === 'putCard') { if (id === 'kadeu') putCard(); else hear(it, false); return; }
    if (stage === 'gate') { if (id === 'kadeu' || id === 'gaechalgu') passGate(); else hear(it, false); return; }
    if (stage === 'dir') { if (id === 'banghyang') tapDir(true); else hear(it, false); return; }
    if (stage === 'transfer') { if (id === 'garatayo') { stage = 'busy'; transferDone = true; } else hear(it, false); return; }
    if (stage === 'exit') return;
    hear(it, stage === 'listen' || stage === 'free');
  }
  const hint = (it, on) => { it.halo.material.opacity = on ? 0.7 : 0; };

  // ───────────── 움직임 ─────────────
  function flyTo(obj, to, dur = 0.7, lift = 0.35) {   // obj(역 안 자식)를 포물선으로
    const from = obj.position.clone(), mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + lift;
    return H.tween(dur, k => { const e = H.ease(k); const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); obj.position.copy(a.lerp(b, e)); }).then(() => obj.position.copy(to));
  }
  let cardOnMachine = false;
  async function putCard() {
    if (cardOnMachine) return; cardOnMachine = true; stage = 'busy'; hint(byId.kadeu, false);
    H.sfx('select'); await flyTo(card, mach1.pad.clone(), 0.8, 0.3); card.rotation.y = 0;
    H.burst(station.localToWorld(mach1.pad.clone()), '#9fe0ff', 20, 0.5, 0.6, 0.02);
  }
  let gatePassed = false;
  async function passGate() {
    if (gatePassed) return; gatePassed = true; stage = 'busy'; hint(byId.kadeu, false); hint(byId.gaechalgu, false);
    const to = station.worldToLocal(gate.readerPos(1)); to.y += 0.01;
    await flyTo(card, to, 0.9, 0.35);
    beep(); H.burst(station.localToWorld(to.clone()), '#2bd96b', 22, 0.5, 0.6, 0.02);
    toast(A.ride.beep, 1.2);
    await H.tween(0.5, k => gate.open(1, k));
    await wait(0.3);
    await H.tween(0.4, k => { card.scale.setScalar(1 - k); });
    card.visible = false; card.scale.setScalar(1); cardGone = true;
  }
  let dirDone = false, transferDone = false;
  function tapDir(right) {
    if (stage !== 'dir') { if (!right) { toast('학교역 방면', 1.5); } return; }
    if (right) { dirDone = true; stage = 'busy'; return; }
    toast(A.ride.dirWrong.note, 3.5); hint(byId.banghyang, true);
  }
  let exitPicked = -1;
  function tapExit(i) {
    if (stage !== 'exit') return;
    const e = A.exits[i];
    if (e.n === A.exitAnswer) { exitPicked = i; stage = 'busy'; return; }
    toast(A.exit.wrong[i].note, 3.5);
    exitSigns[A.exitAnswer - 1].userData.halo.material.opacity = 0.7;
  }
  async function doorsOpen(open) { H.sfx('door'); await H.tween(1.0, k => { const v = open ? k : 1 - k; doors.open(v); train.open(v); }); }
  async function trainArrive(line) {
    const g = train.g, x0 = g.position.x;
    await H.tween(1.4, k => { g.position.x = x0 - H.ease(k) * 11; });   // 앞 열차가 떠나고
    train.setLine(line); g.position.x = 12;
    H.sfx('appear');
    await H.tween(2.4, k => { const e = 1 - Math.pow(1 - k, 3); g.position.x = 12 * (1 - e); });   // 새 열차가 들어와 선다
    g.position.x = 0;
  }

  // ───────────── 안내판(지금 할 일)·미션 목록 ─────────────
  let board, task = '', taskExtra = '';
  function drawBoard() { const p = board; p.clear(); p.pad = 26; p.text('지금 할 일', 24, '#ffc766', { bold: true, gap: 4 }); p.text(task || (curMission >= 0 ? MISSIONS[curMission] + ' — ' + A.guide.name + ' 말을 들어 보세요' : A.guide.name + ' 말을 들어 보세요'), 30, '#ffffff', { gap: taskExtra ? 8 : 0 }); if (taskExtra) p.text(taskExtra, 26, '#c9c4d6', { gap: 0 }); p.finish(); p.pin(); }
  function missionInfo(t, extra) { task = t || ''; taskExtra = extra || ''; if (board) drawBoard(); }
  function buildBoard() { board = new Panel('board', 620, 'rgba(33,31,46,0.88)'); drawBoard(); board.mesh.visible = false; board.mesh.position.copy(BOARD); H.world.add(board.mesh); board.mesh.lookAt(V3(POS.start[0], 1.6, POS.start[1])); }
  function showBoard() { if (H.useHud()) H.hud(board, 'topLeft', (H.handheld ? innerWidth / innerHeight : H.camera.aspect) < 1 ? 0.56 : 0.36); board.mesh.visible = true; drawWrist(); }
  const MISSIONS = [A.listen.title, A.repeat.title, A.charge.title, A.way.title, A.ride.title, A.exit.title], done = MISSIONS.map(() => false);
  let wrist, curMission = -1;
  function drawWrist() {
    const p = wrist; p.clear();
    p.row([{ t: A.wrist, size: 36, color: '#ffffff', bold: true }, { t: done.filter(Boolean).length + '/' + MISSIONS.length, size: 36, color: '#ffc766', bold: true }], 12);
    const cur = done.indexOf(false);
    MISSIONS.forEach((t, i) => p.row([{ t: done[i] ? '●' : i === cur ? '▶' : '○', size: 30, color: done[i] ? '#8fe3a8' : i === cur ? '#ffc766' : '#8a8698' }, { t, size: 30, color: done[i] ? '#b9b5c6' : '#ffffff' }], 8));
    p.finish(); p.show(true);
  }
  function finish(i) { done[i] = true; drawWrist(); H.sfx('complete'); }

  // ───────────── 말 ─────────────
  const spk = () => ({ name: A.guide.name, role: A.guide.role, dot: A.guide.dot, char: rini && rini.root.visible ? rini : null, pos: P(POS.rini) });
  const annSpk = () => ({ name: A.announcer.name, role: A.announcer.role, dot: A.announcer.dot, char: null, pos: null });
  async function riniSay(text, choices, single, g, auto) { ui.toast.show(false); H.speak(text); return say(spk(), text, choices, single || '다음', { at: TALK, sub: gloss(g) || undefined, auto }); }
  async function annSay(o) { ui.toast.show(false); chime(); await wait(0.9); H.speak(o.text); return say(annSpk(), o.text, null, '다음', { ahead: true, sub: gloss(o.gloss) || undefined }); }
  // 하나와 헤어진 뒤의 '나'의 생각·휴대폰 알림·친구 말(10-31): 글만(note), 하나 목소리로 읽지 않는다
  const noteSpk = name => ({ name, role: '', dot: '#8a8698', char: null, pos: null });
  async function noteSay(o, name) { ui.toast.show(false); return say(noteSpk(name || A.me), o.note, o.choices || null, '다음', { ahead: true, sub: gloss(o.gloss) || undefined }); }

  // ───────────── 화면 모드 카메라 ─────────────
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
    room: () => portrait() ? frame(V3(-1.55, 1.3, -0.1), 2.5, 2.3, { up: 0.15 })                        // 세로: 역무실·노선도
                           : frame(V3(0.2, 1.3, -0.4), 6.0, 2.4, { up: 0.15 }),                          // 가로: 역 전체
    listen: () => portrait() ? frame(V3(-0.2, 1.4, -0.6), 3.0, 2.6, { up: 0.15 })
                             : frame(V3(0.2, 1.4, -0.6), 6.2, 2.6, { up: 0.12 }),
    booth: () => frame(V3(BOOTH.x, 1.35, -0.1), 1.8, 1.8, { up: 0.2 }),
    map: () => frame(V3(MAP.x, 1.45, MAP.z), 1.45, 1.05, { up: 0.1, min: 0.8 }),
    machine: () => frame(V3(2.15, 1.15, 0.3), 1.6, 1.5, { up: 0.3 }),
    gates: () => frame(V3(GATE.x, 0.95, 0.2), 2.6, 1.4, { up: 0.5 }),
    signs: () => portrait() ? frame(V3(1.1, 2.1, SIGN_Z), 1.9, 1.3, { up: 0.12 }) : frame(V3(0.4, 1.9, SIGN_Z), 4.6, 1.4, { up: 0.05, min: 3.0 }),   // 노선도 판 뒤에서 보도록 멀리
    platform: () => frame(V3(0, 1.45, S.ST.z0), portrait() ? 4.0 : 6.4, 2.6, { up: 0.12 }),
    car: () => portrait() ? frame(V3(0, 1.45, 0.3), 2.4, 2.1, { up: 0.05 }) : frame(V3(0, 1.4, 0.3), 4.6, 2.1, { up: 0.05 }),
    exits: () => portrait() ? frame(V3(0, 2.0, SIGN_Z), 3.2, 1.6, { up: 0.05 }) : frame(V3(0, 2.0, SIGN_Z), 6.0, 1.4, { up: 0.05, min: 3.0 }),
    transfer: () => portrait() ? frame(V3(2.4, 2.1, SIGN_Z), 1.8, 1.3, { up: 0.12 }) : frame(V3(1.2, 1.9, SIGN_Z), 4.0, 1.4, { up: 0.05, min: 3.0 }),
    item: it => { const p = it.g.localToWorld(it.c.clone()), s = it.g.userData.size; return frame(p, Math.min(3.2, Math.max(0.7, Math.max(s.x, s.z) * 1.6)), Math.min(2.4, Math.max(0.6, s.y * 1.8)), { up: 0.3, min: 0.7 }); }
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
    if (it) H.placeToward(p, it.g.localToWorld(it.c.clone()), 0.85, 0.45, -0.2); else H.placeAhead(p, 1.1, 0, -0.25);
  }
  function buttonRow(p, labels, color, h = 92) {
    const gap = 16, n = labels.length, bw = (p.w - p.pad * 2 - gap * (n - 1)) / n, y = p.y;
    labels.forEach((t, i) => { const b = p.button(t, null, Array.isArray(color) ? color[i] : color, null, h, 0); b.x = p.pad + i * (bw + gap); b.w = bw; b.y = y; p.y = y; });
    p.y = y + h + 16;
  }
  // 내가 하는 말(버튼 하나)
  async function myLine(text, g) {
    const p = ui.card; p.clear(); p.pad = 36;
    p.text(A.guide.name + '에게 말해 보세요', 26, '#2a9d8f', { bold: true, align: 'center', gap: 6 });
    if (gloss(g)) p.text(gloss(g), 24, DIM, { align: 'center', gap: 12 });
    buttonRow(p, [text], '#2a9d8f', 96);
    p.finish(); placeCard(p, null); p.show(true);
    await waitPick(p, 0, 1.0); p.show(false); H.sfx('piece');
  }
  // 보기 고르기(맞을 때까지): 틀리면 wrong을 말하고 다시
  // 물음이 text면 하나가 읽고, note('나'의 생각)면 글만
  async function choose(q, speaker, it) {
    const qt = q.text || q.note;
    for (;;) {
      const p = ui.card; p.clear(); p.pad = 36;
      p.text(qt, 40, INK, { bold: true, align: 'center', gap: gloss(q.gloss) ? 6 : 16 });
      if (gloss(q.gloss)) p.text(gloss(q.gloss), 24, DIM, { align: 'center', gap: 14 });
      buttonRow(p, q.choices, '#3b3550', 96);
      p.finish(); placeCard(p, it); p.show(true);
      if (speaker !== 'none' && q.text) riniSpeak(q.text);
      const i = await waitPick(p, q.answer, H.Q.get('slow') ? 4 : 1.0); p.show(false);
      if (i === q.answer) { H.sfx('complete'); if (q.ok) { toast(q.ok.text || q.ok.note, 2); if (q.ok.text) await riniSpeak(q.ok.text); else await wait(1.2); } return; }
      toast(q.wrong.text || q.wrong.note, 3); if (q.wrong.text) await riniSpeak(q.wrong.text); else await wait(1.8); await wait(0.3);
    }
  }

  // ───────────── 흐름 ─────────────
  async function intro() {
    const p = ui.intro; p.clear(); p.pad = 56;
    p.text(A.kicker, 30, '#2a9d8f', { bold: true, align: 'center', gap: 10 });
    p.text(A.title, 72, INK, { bold: true, align: 'center', gap: 18 });
    p.text(A.sub, 32, DIM, { align: 'center', gap: 12 });
    const handMode = H.inXR() && H.hands.some(h => h.isHand);
    p.text(H.handheld ? A.howPhone : H.inXR() ? (handMode ? A.howHand : A.howHand + ' ' + A.howCtrl) : A.howFlat, 28, '#b5873e', { align: 'center', gap: 14 });
    p.text(A.credit, 22, DIM, { align: 'center', gap: 30 });
    p.button(A.start, null, '#2a9d8f', null, 110);
    shot('room', null, 0);
    p.finish(); H.placeAhead(p, 0.9, 0, -0.2); p.show(true);
    await wait(0.4); log('state intro', H.handheld ? 'phone-MR' : H.isMR ? 'MR' : H.inXR() ? 'VR' : 'flat', 'lang', LANG);
    await waitPick(p, 0, 1.0); p.show(false);
    H.sfx('complete');
    await wait(0.3);
    if (!H.hasKoVoice() && !H.AUTOTEST) toast('이 기기에는 한국어 음성이 없어요. 글로만 보여 줄게요.', 4);
  }
  async function hello() {
    log('state hello'); shot('booth');
    // 친구 메시지(역에 온 까닭, 10-31 맨 앞으로): 휴대폰 알림 → 휴대폰 화면 같은 카드
    const C = A.charge;
    H.sfx('card'); await noteSay(C.msgIntro);
    { const p = ui.card; p.clear(); p.pad = 40;
      p.text(C.msg.from, 26, '#2a9d8f', { bold: true, align: 'center', gap: 10 });
      p.text(C.msg.body, 44, INK, { bold: true, align: 'center', gap: gloss(C.msg.gloss) ? 8 : 20 });
      if (gloss(C.msg.gloss)) p.text(gloss(C.msg.gloss), 24, DIM, { align: 'center', gap: 18 });
      p.button('확인', null, '#2a9d8f', null, 88);
      p.finish(); placeCard(p, null); p.show(true); H.sfx('card');
      await waitPick(p, 0, 1.5); p.show(false); }
    if (rini) rini.wave(); for (const l of A.hello) await riniSay(l.text, l.choices, null, l.gloss);
  }
  async function listenStage() {
    stage = 'listen'; curMission = 0; log('state listen');
    shot('listen');
    await riniSay(A.listen.ask.text, null, '해 볼게');
    let last = -1;
    if (H.AUTOTEST) (async () => { for (const id of ['yeongmuwon', 'kadeu', 'gaechalgu', 'jihacheol', 'banghyang']) { await wait(0.9); tap(byId[id]); } })();
    await until(() => {
      const n = Math.min(5, heard.size); if (n !== last) { last = n; missionInfo(A.listen.ask.text, A.listen.counter + ' ' + n + ' / 5'); }
      return n >= 5;
    });
    await wait(1.2); missionInfo(''); finish(0); await riniSay(A.listen.done.text);
  }
  async function repeatStage() {
    stage = 'repeat'; curMission = 1; log('state repeat');
    await riniSay(A.repeat.ask.text, null, '좋아요'); missionInfo(A.repeat.ask.text);
    for (const id of A.repeatWords) {
      const it = byId[id], w = it.w; it.halo.material.opacity = 0.6;
      await shot('item', it, 0.9);
      for (;;) {
        const p = ui.card; p.clear(); p.pad = 40;
        p.text(A.repeat.card, 26, '#2a9d8f', { bold: true, align: 'center', gap: 4 });
        p.text(w.ko, 84, INK, { bold: true, align: 'center', gap: 2 });
        p.text(w.ro + (gloss(w) ? '  ·  ' + gloss(w) : ''), 28, DIM, { align: 'center', gap: 20 });
        buttonRow(p, [A.repeat.again, A.repeat.said], ['#ece5d8', '#2a9d8f'], 88);
        p.finish(); placeCard(p, it); p.show(true);
        await riniSpeak(w.ko); await wait(0.3);
        const i = await waitPick(p, 1, 1.0); p.show(false);
        if (i === 1) break;
      }
      it.halo.material.opacity = 0; toast(A.repeat.good, 1.2); H.sfx('piece'); await wait(0.6);
    }
    missionInfo(''); finish(1); shot('room'); await riniSay(A.repeat.done.text);
  }
  async function chargeStage() {
    stage = 'charge'; curMission = 2; log('state charge');
    const C = A.charge;
    missionInfo(C.msg.body);
    await riniSay(C.first.text, C.first.choices, null, C.first.gloss);
    await myLine(C.ask.me, C.ask.gloss);
    shot('machine'); byId.chungjeon.halo.material.opacity = 0.6;
    await riniSay(C.answer.text, null, null, C.answer.gloss);
    byId.chungjeon.halo.material.opacity = 0;
    // 카드 올리기
    stage = 'putCard'; missionInfo(C.put.text); riniToast(C.put.text, 3); riniSpeak(C.put.text);
    const at = H.now + 6;
    if (H.AUTOTEST) wait(1.0).then(() => tap(byId.kadeu));
    await until(() => { if (!cardOnMachine && H.now > at) hint(byId.kadeu, true); return cardOnMachine; });
    await wait(1.0);
    // 금액 고르기(기계 화면)
    mach1.setScreen(['얼마', '충전할까요?']);
    const p = ui.card; p.clear(); p.pad = 36;
    p.text(C.machine, 26, '#2a9d8f', { bold: true, align: 'center', gap: 4 });
    p.text(C.how.text, 42, INK, { bold: true, align: 'center', gap: gloss(C.how.gloss) ? 6 : 16 });
    if (gloss(C.how.gloss)) p.text(gloss(C.how.gloss), 24, DIM, { align: 'center', gap: 14 });
    buttonRow(p, C.how.choices, '#3b3550', 96);
    p.finish(); placeCard(p, byId.chungjeon); p.show(true);
    riniSpeak(C.how.text);
    const i = await waitPick(p, 1, 1.0); p.show(false);
    mach1.setScreen(['충전 중…']); H.sfx('select'); await wait(1.0);
    mach1.setScreen([C.how.choices[i], '충전 완료'], '#1f6b4f'); H.sfx('complete');
    H.burst(station.localToWorld(mach1.pad.clone()).add(V3(0, 0.1, 0)), '#9fe0b4', 26, 0.5, 0.7, 0.025);
    toast(C.done[i].text, 2.5); await riniSpeak(C.done[i].text);
    await wait(0.4);
    // 카드는 받침으로 돌아온다(개찰구에서 다시 쓴다)
    await flyTo(card, V3(STAND.x, 0.945, STAND.z), 0.7, 0.25);
    missionInfo(''); finish(2); stage = 'charge';
  }
  async function wayStage() {
    stage = 'way'; curMission = 3; log('state way');
    const W = A.way;
    shot('booth');
    missionInfo(W.ask.me, A.charge.msg.body);
    await myLine(W.ask.me, W.ask.gloss);
    shot('map'); map.setPath(true);
    await riniSay(W.answer.text, W.answer.choices, null, W.answer.gloss);
    missionInfo(W.q1.text);
    await choose(W.q1, 'rini', null);
    missionInfo(W.q2.text);
    await choose(W.q2, 'rini', null);
    shot('booth');
    missionInfo(W.exitAsk.me);
    await myLine(W.exitAsk.me, W.exitAsk.gloss);
    await riniSay(W.exitAnswer.text, W.exitAnswer.choices, null, W.exitAnswer.gloss);
    missionInfo(''); finish(3);
  }
  async function rideTo(line, annO, q, nextStn, led) {
    // 열차 안으로(역을 숨기고 열차 안을 보임)
    await doorsOpen(true); H.sfx('piece');
    await H.fadeTo(1, 0.4);
    showStation(false); car.setLine(line); car.setLED('다음 역은', led, A.lines[line].color); car.setSpeed(1);
    await shot('car', null, 0);
    await H.fadeTo(0, 0.5);
    missionInfo(A.ride.title, '다음 역: ' + led);
    await wait(2.2);
    car.setLED('이번 역은', led, A.lines[line].color);
    await annSay(annO);
    await H.tween(1.5, k => car.setSpeed(1 - k));
    await choose(q, 'rini', null);
    // 내리기
    await H.fadeTo(1, 0.4);
    doors.open(0); train.open(1); setStation(nextStn); showStation(true);
    await shot(nextStn === 'sea' ? 'exits' : 'transfer', null, 0);
    await H.fadeTo(0, 0.5);
    await doorsOpen(false);
  }
  async function rideStage() {
    stage = 'ride'; curMission = 4; log('state ride');
    const R = A.ride;
    // 개찰구
    shot('gates'); stage = 'gate'; missionInfo(R.gate.text); riniToast(R.gate.text, 4); riniSpeak(R.gate.text);
    let at = H.now + 7;
    if (H.AUTOTEST) wait(1.2).then(() => tap(byId.kadeu));
    await until(() => { if (!gatePassed && H.now > at) { hint(byId.kadeu, true); hint(byId.gaechalgu, true); } return gatePassed && cardGone; });
    riniToast(R.gateOk.text, 2); await riniSpeak(R.gateOk.text);
    // 하나와 헤어지기(10-31: 매표소가 아니라 개찰구를 지난 뒤) — 여기부터는 '나'의 생각(글만)과 안내 방송
    if (rini) rini.wave();
    await riniSay(R.bye.text, R.bye.choices, null, R.bye.gloss);
    // 방향 표지
    shot('signs'); stage = 'dir'; missionInfo(R.dir.note); toast(R.dir.note, 4);
    at = H.now + 8;
    if (H.AUTOTEST) wait(1.2).then(() => tap(byId.banghyang));
    await until(() => { if (!dirDone && H.now > at) hint(byId.banghyang, true); return dirDone; });
    hint(byId.banghyang, false); H.sfx('complete'); toast(R.dirOk.note, 2.5); await wait(1.4);
    // 1호선 타기 → 공원역
    shot('platform');
    await trainArrive(1);
    await noteSay(R.come);
    await rideTo(1, R.ann1, R.q1, 'park', '공원역');
    // 갈아타기
    stage = 'transfer'; missionInfo(R.transfer.note); toast(R.transfer.note, 4);
    at = H.now + 7;
    if (H.AUTOTEST) wait(1.2).then(() => tap(byId.garatayo));
    await until(() => { if (!transferDone && H.now > at) hint(byId.garatayo, true); return transferDone; });
    hint(byId.garatayo, false); H.sfx('complete'); toast(R.transferOk.note, 2.5); await wait(1.4);
    shot('platform');
    await trainArrive(2);
    await noteSay(R.come2);
    await rideTo(2, R.ann2, R.q2, 'sea', '바다역');
    missionInfo(''); finish(4);
  }
  async function exitStage() {
    stage = 'busy'; curMission = 5; log('state exit');
    const X = A.exit;
    shot('exits');
    missionInfo(X.ask.note, A.charge.msg.body);
    stage = 'exit'; toast(X.ask.note, 5);
    const at = H.now + 9;
    if (H.AUTOTEST) wait(1.4).then(() => tapExit(0)).then(() => wait(2.5)).then(() => tapExit(2));
    await until(() => { if (exitPicked < 0 && H.now > at) exitSigns[A.exitAnswer - 1].userData.halo.material.opacity = 0.7; return exitPicked >= 0; });
    exitSigns.forEach(s => { s.userData.halo.material.opacity = 0; });
    H.sfx('complete'); H.burst(exitSigns[exitPicked].getWorldPosition(V3()), '#ffe27a', 30, 0.7, 0.8, 0.03);
    toast(X.ok.note, 2.5); await wait(1.4);
    await noteSay(X.met, X.met.from);
    missionInfo(''); finish(5);
  }
  async function ending() {
    stage = 'free'; log('state ending');
    const E = A.ending;
    for (;;) {
      let p = ui.card; p.clear(); p.pad = 40;
      p.text(E.cardKicker, 26, '#2a9d8f', { bold: true, align: 'center', gap: 4 });
      p.text(E.cardTitle, 50, INK, { bold: true, align: 'center', gap: 14 });
      for (const w of A.words) p.row([{ t: w.ko, size: 32, color: INK, bold: true }, { t: w.ro, size: 22, color: DIM }, { t: gloss(w), size: 24, color: '#5a5470' }], 6);
      p.space(10); p.button('다음', null, '#2a9d8f', null, 84);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      log('state card');
      await waitPick(p, 0, 1.0); p.show(false); await wait(0.2);
      p = ui.card; p.clear(); p.pad = 40;
      p.text('오늘 배운 말', 26, '#2a9d8f', { bold: true, align: 'center', gap: 10 });
      for (const ph of A.phrases) p.row([{ t: ph.ko, size: 30, color: INK, bold: true }, { t: gloss(ph), size: 22, color: '#5a5470' }], 6);
      p.space(10); p.text(E.cultureTitle, 24, '#2a9d8f', { bold: true, gap: 4 });
      for (const c of E.culture) p.text('· ' + c, 24, '#5a5470', { gap: 4 });
      if (E.cultureSrc) p.text(E.cultureSrc, 18, DIM, { gap: 4 });
      p.space(12);
      p.button(E.free, null, '#2a9d8f', null, 84); p.button(E.restart, null, '#ece5d8', null, 76); p.button(E.exit, null, '#3b3550', null, 76);
      p.finish(); H.placeAhead(p, 1.1, 0, -0.1); p.show(true);
      if (H.AUTOTEST) { log('autotest done'); return; }
      const i = await waitPick(p, 0, 1e9); p.show(false);
      if (i === 0) { cardGone = false; card.position.set(STAND.x, 0.945, STAND.z); setStation('hana'); toast('물건이나 표지판을 눌러 이름을 다시 들어 보세요.', 3); shot('listen'); await until(() => false); }
      if (i === 2) { const s = H.renderer.xr.getSession(); if (s) { s.end(); return; } }
      location.reload(); return;
    }
  }
  const JUMPS = ['listen', 'repeat', 'charge', 'way', 'ride', 'exit', 'ending'];
  const JUMP = JUMPS.indexOf(H.Q.get('jump'));
  async function main() {
    await intro();
    if (JUMP < 0) await hello();
    showBoard();
    if (JUMP > 0) { for (let i = 0; i < Math.min(JUMP, 6); i++) done[i] = true; drawWrist(); }
    if (JUMP > 2) { cardOnMachine = true; mach1.setScreen(['만 원', '충전 완료'], '#1f6b4f'); }
    if (JUMP > 3) map.setPath(true);
    if (JUMP > 4) { gatePassed = cardGone = true; card.visible = false; gate.open(1, 1); setStation('sea'); }
    const stages = [listenStage, repeatStage, chargeStage, wayStage, rideStage, exitStage, ending];
    for (let i = Math.max(0, JUMP); i < stages.length; i++) await stages[i]();
  }

  // ───────────── 짓기·시작 ─────────────
  if (window.SUBWAY_VOICE && !H.Q.has('tts')) H.voicePack('voice/', window.SUBWAY_VOICE);
  buildStation(); buildItems(); buildBoard(); setStation('hana');
  wrist = new Panel('wrist', 440, 'rgba(33,31,46,0.88)', 0.0005); wrist.pad = 26; H.setWrist(wrist);
  // 역무원 = 하나(assets/staff.glb): 동작 idle·talk·bow(인사 때 wave 자리에)
  const riniReady = H.loadChar({ url: 'assets/staff.glb', height: 1.58, pos: P(POS.rini), parent: station,
    clips: { idle: 'idle', talk: 'talk', wave: 'bow' }, glow: 0.18 }).then(c => { rini = c; if (c) c.look = false; }).catch(e => log('staff load failed', e && e.message));
  // 하나가 사용자를 보게(맵을 돌려 놓는 휴대폰 혼합현실에서도 맞게 — 2판과 같은 방식)
  H.onUpdate(dt => {
    if (!rini || !rini.root.visible) return;
    const r = rini.root, lp = r.parent.worldToLocal(H.headPos()), dx = lp.x - r.position.x, dz = lp.z - r.position.z;
    if (dx * dx + dz * dz < 0.01) return;
    let d = (Math.atan2(dx, dz) - r.rotation.y) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    r.rotation.y += d * (1 - Math.exp(-3 * Math.min(dt || 0.016, 0.1)));
  });
  const ready = Promise.all([riniReady]).then(() => log('assets loaded'));
  H.start({ main, ready, start: { pos: POS.start, look: [0, -1.0] }, anchor: V3(0, 0, 0.6) });
  window.SUBWAYX = { items, byId, tap, tapExit, get stage() { return stage; }, get rini() { return rini; }, setStation, showStation, car };
})();
