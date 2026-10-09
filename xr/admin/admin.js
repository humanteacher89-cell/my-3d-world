// 가상융합교육 지도 관리자 페이지 (2026-10-09, XR개발부). 프랑스 로비 관리자 페이지(admin.js)를 바탕으로 만들었다.
// 로그인(프랑스 로비 관리자와 **같은 서버, 다른 계정** — 모든 관리 요청에 ?map=xr, 2026-10-09 휴먼쌤 "프랑스랑 관리자페이지는 분리해줘") → 관 고르기
//   → ../lobby.config.js의 rooms.<관> 글이 모두 칸으로 나온다(자동 폼) → 고친 칸만 { text: { "경로": "글" } } 로 Cloudflare 저장소(/api/admin/hall?map=xr)에 저장.
//   수업 사례관은 교과마다 책·TV·사진첩·링크(media.<교과>).
// 비밀번호는 이 브라우저에서 PBKDF2(SHA-256, 310,000번)로 바꾼 값만 서버로 보낸다. 서버 주소는 ../relay.json(시험: ?api=http://127.0.0.1:8791).
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const MAP = 'xr', ITER = 310000, LS = 'xrLobbyAdmin', LS_HALL = 'xrAdminHall';   // LS = 이 페이지만의 로그인 저장(프랑스 관리자 페이지와 따로)
  const A = p => p + (p.includes('?') ? '&' : '?') + 'map=' + MAP;   // 관리 요청 주소에 영역(map=xr)을 붙인다
  const S = { api: '', token: '', me: null, cfg: null, content: { halls: {} }, hall: '', fields: [], media: {}, dirty: false, busy: false, editing: null };
  const enc = new TextEncoder();

  // ── 작은 도구 ──
  const SCREENS = ['boot', 'login', 'setup', 'main', 'users', 'pw'];
  function show(id) {
    for (const s of SCREENS) $(s).hidden = s !== id;
    $('top').hidden = !['main', 'users', 'pw'].includes(id);
    $('saveBar').hidden = id !== 'main' || !S.hall;
    scrollTo(0, 0);
  }
  let toastT = 0;
  function toast(msg, bad) {
    const t = $('toast');
    t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, bad ? 4500 : 2800);
  }
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* 저장 못 해도 진행 */ } };
  const normUser = u => String(u || '').normalize('NFC').trim().toLowerCase();
  async function deriveKey(user, pw) {
    const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('hangul-lobby|' + normUser(user)), iterations: ITER }, k, 256);
    return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const ERR = {
    network: '서버에 연결하지 못했어요. 인터넷을 확인해 주세요.',
    login: '아이디나 비밀번호가 맞지 않아요.',
    locked: '여러 번 틀려서 잠시 잠겼어요. {wait}분 뒤에 다시 해 주세요.',
    code: '설정 코드가 맞지 않아요.',
    used: '이미 쓴 설정 코드예요. 로그인해 주세요.',
    nosetup: '서버에 설정 코드가 아직 없어요.',
    user: '아이디는 2~20자(영문·숫자·한글·. _ -)로 해 주세요.',
    key: '비밀번호를 다시 넣어 주세요.',
    perm: '이 관을 고칠 권한이 없어요.',
    password: '지금 비밀번호가 맞지 않아요.',
    self: '내 계정은 지우거나 관리자에서 뺄 수 없어요.',
    video: '유튜브 영상 주소만 넣을 수 있어요.',
    links: '링크 주소는 https:// 로 시작해야 해요.',
    path: '고칠 수 없는 칸이 섞여 있어요. 새로 고침한 뒤 다시 해 주세요.',
    many: '고친 칸이 너무 많아요(300개까지).',
    big: '사진이 너무 커요.',
    type: '사진 파일(JPG·PNG·WebP)만 올릴 수 있어요.',
    decode: '이 사진은 열 수 없어요. 다른 사진으로 해 주세요.',
    full: '사진 저장 공간이 가득 찼어요.',
    auth: '로그인이 풀렸어요. 다시 로그인해 주세요.',
    origin: '이 주소에서는 관리할 수 없어요.',
    id: '관을 다시 골라 주세요.',
    map: '서버가 아직 가상융합 지도(map xr)를 몰라요. 서버를 새로 올려야 해요.',
    nostore: '서버 저장소가 아직 준비되지 않았어요.',
    server: '서버에서 문제가 생겼어요. 잠시 뒤 다시 해 주세요.'
  };
  function errText(e) {
    const k = e && e.error;
    if (!k && e && e.status === 429) return '오늘 서버 사용 한도를 넘었어요. 한국 시간 오전 9시에 풀려요.';
    return (ERR[k] || ('문제가 생겼어요' + (e && e.status ? ' (' + e.status + ')' : ''))).replace('{wait}', (e && e.wait) || 15);
  }
  async function api(method, path, body, raw) {
    const h = {};
    if (S.token) h.Authorization = 'Bearer ' + S.token;
    let b;
    if (raw) { b = raw; h['Content-Type'] = raw.type || 'image/jpeg'; }
    else if (body !== undefined) { b = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    let r;
    try { r = await fetch(S.api + path, { method, headers: h, body: b, cache: 'no-store' }); } catch (_) { throw { error: 'network' }; }
    let j = {};
    try { j = await r.json(); } catch (_) { j = {}; }
    if (!r.ok) {
      const e = Object.assign({ status: r.status }, j);
      if (r.status === 401 && j.error === 'auth') { logoutLocal(); toast(ERR.auth, true); }
      throw e;
    }
    return j;
  }
  function busy(id, on, label) {
    const b = $(id);
    if (on) { b.dataset.label = b.textContent; b.textContent = label || '…'; b.disabled = true; S.busy = true; }
    else { if (b.dataset.label) b.textContent = b.dataset.label; b.disabled = false; S.busy = false; }
  }
  function setErr(id, msg) { const e = $(id); e.textContent = msg || ''; e.hidden = !msg; }
  function loadScript(src) {
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.charset = 'utf-8'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  const fmt = ms => new Date(ms).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const hallCfg = id => (S.cfg.schools || []).find(s => s.id === id) || {};
  const hallName = id => hallCfg(id).name || id;
  const roomCfg = id => (S.cfg.rooms || {})[id] || null;
  function fixUrl(s) {
    s = String(s || '').trim();
    if (s && !/^https?:\/\//i.test(s) && /^[\w-]+(\.[\w-]+)+/.test(s)) s = 'https://' + s;
    return s;
  }
  const isUrl = s => { try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:'; } catch (_) { return false; } };
  function ytId(s) {
    let u;
    try { u = new URL(String(s || '').trim()); } catch (_) { return null; }
    const h = u.hostname.replace(/^(www|m|music)\./, '');
    let id = '';
    if (h === 'youtu.be') id = u.pathname.slice(1);
    else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else { const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/); if (m) id = m[2]; }
    }
    id = id.split(/[?&#/]/)[0];
    return /^[\w-]{6,20}$/.test(id) ? id : null;
  }
  function mkBtn(text, fn, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ghost' + (cls ? ' ' + cls : ''); b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ── 시작 ──
  async function apiFromRelay() {
    try {
      const r = await fetch('../relay.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return '';
      const j = await r.json();
      return j.api || (typeof j.health === 'string' ? j.health.replace(/\/health\/?$/, '') : '');
    } catch (_) { return ''; }
  }
  function bootMsg(t) { const p = $('boot').querySelector('p'); p.textContent = t; show('boot'); }
  async function boot() {
    try { await loadScript('../lobby.config.js?t=' + Date.now()); } catch (_) { /* 아래에서 알림 */ }
    S.cfg = window.LOBBY_CONFIG || null;
    if (!S.cfg) { bootMsg('지도 설정(lobby.config.js)을 읽지 못했어요. 새로 고침해 주세요.'); return; }
    S.api = String(Q.get('api') || await apiFromRelay() || '').replace(/\/+$/, '');
    if (!S.api) { bootMsg('서버 주소(relay.json)를 찾지 못했어요.'); return; }
    if (Q.get('lobby')) $('viewLobby').href = Q.get('lobby');
    const saved = lsGet(LS, null);
    if (saved && saved.token) {
      S.token = saved.token;
      try { const me = await api('GET', A('/api/admin/me')); S.me = me; await enterMain(); return; } catch (_) { S.token = ''; lsSet(LS, null); }
    }
    let st;
    try { st = await api('GET', A('/api/admin/state')); } catch (e) { bootMsg(errText(e)); return; }
    show(!st.ready && st.setup ? 'setup' : 'login');
  }

  // ── 로그인·처음 설정·로그아웃 ──
  function afterLogin(j) {
    S.token = j.token;
    S.me = { user: j.user, role: j.role, schools: j.schools || [] };
    lsSet(LS, { token: j.token, user: j.user });
    for (const id of ['loginPw', 'setupPw', 'setupPw2', 'setupCode']) $(id).value = '';
    return enterMain();
  }
  function logoutLocal() {
    S.token = ''; S.me = null; S.dirty = false;
    lsSet(LS, null);
    show('login');
  }
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (S.busy) return;
    setErr('loginErr', '');
    const user = normUser($('loginUser').value), pw = $('loginPw').value;
    busy('loginGo', true, '확인 중…');
    try { const key = await deriveKey(user, pw); afterLogin(await api('POST', A('/api/admin/login'), { user, key })); }
    catch (er) { setErr('loginErr', errText(er)); }
    finally { busy('loginGo', false); }
  });
  $('setupForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (S.busy) return;
    setErr('setupErr', '');
    const user = normUser($('setupUser').value), pw = $('setupPw').value;
    if (pw.length < 8) { setErr('setupErr', '비밀번호는 8자 이상으로 해 주세요.'); return; }
    if (pw !== $('setupPw2').value) { setErr('setupErr', '비밀번호 확인이 달라요.'); return; }
    busy('setupGo', true, '만드는 중…');
    try { const key = await deriveKey(user, pw); afterLogin(await api('POST', A('/api/admin/setup'), { code: $('setupCode').value, user, key })); toast('관리자를 만들었어요.'); }
    catch (er) { setErr('setupErr', errText(er)); }
    finally { busy('setupGo', false); }
  });
  $('toSetup').addEventListener('click', e => { e.preventDefault(); setErr('setupErr', ''); show('setup'); });
  $('toLogin').addEventListener('click', e => { e.preventDefault(); show('login'); });
  $('btnOut').addEventListener('click', async () => {
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 그래도 로그아웃할까요?')) return;
    try { await api('POST', A('/api/admin/logout')); } catch (_) { /* 이미 풀렸으면 그대로 */ }
    logoutLocal();
  });

  // ── 내용 고치기 ──
  const allowed = id => S.me && (S.me.role === 'admin' || (S.me.schools || []).includes(id));
  async function enterMain() {
    $('whoName').textContent = S.me.user + (S.me.role === 'admin' ? ' · 관리자' : ' · 관 담당');
    $('btnUsers').hidden = S.me.role !== 'admin';
    $('pwUser').value = S.me.user;
    fillHalls();
    show('main');
    try { await loadContent(); } catch (er) { toast(errText(er), true); }
    if ($('hall').value) selectHall($('hall').value);
    else { $('hallForm').hidden = true; $('noHall').hidden = false; }
  }
  function fillHalls() {
    const sel = $('hall');
    sel.textContent = '';
    const list = (S.cfg.schools || []).filter(s => allowed(s.id) && roomCfg(s.id));
    for (const s of list) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name + (s.nameFr ? ' · ' + s.nameFr : '');
      sel.appendChild(o);
    }
    const last = lsGet(LS_HALL, '');
    if (last && list.some(s => s.id === last)) sel.value = last;
    S.hall = sel.value || '';
  }
  async function loadContent() { S.content = await api('GET', '/api/admin/content?map=' + MAP); if (!S.content.halls) S.content.halls = {}; }
  $('hall').addEventListener('change', () => {
    const v = $('hall').value;
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 버리고 다른 관으로 갈까요?')) { $('hall').value = S.hall; return; }
    selectHall(v);
  });

  /* 자동 폼: rooms.<관> 설정을 걸어가며 글 자리마다 칸을 만든다.
     문자열 → 한 줄 칸(길거나 줄바꿈이 있으면 여러 줄), 글 배열 → 여러 줄 칸(한 줄에 하나), 객체 → 묶음, 객체 배열 → 번호 붙인 항목.
     숨기는 것: 색(#…)·id·kind·stampId·model·icon·key 같은 설정값, 숫자·참/거짓, 글이 아닌 배열(examples). 사례관의 subjects[].book 등 미디어는 따로(아래 media). */
  const LABEL = {
    welcome: '들어올 때 인사', principal: '안내자(리니)', name: '이름', lines: '말 걸면 하는 말', guideSub: '안내자 발판 작은 글',
    board: '칠판', top: '윗줄', title: '제목', line: '한 줄 안내', sub: '작은 글', zones: '칸', pad: '발판 글', padSub: '발판 작은 글',
    holoName: '홀로그램 이름', holoSub: '홀로그램 작은 글', mrDesk: 'MR 책상 이름', mrDeskSub: 'MR 책상 작은 글', mrPanel: 'MR 안내판',
    terms: '용어 카드', sign: '안내판', signSub: '안내판 작은 글', foot: '아래 작은 글', cards: '카드', big: '큰 글자', text: '본문',
    quizSub: '퀴즈 발판 작은 글', quiz: '퀴즈', npcRole: '출제자 역할', steps: '단계', npc: '질문', choices: '선택지', ko: '보기', note: '맞았을 때', hint: '틀렸을 때',
    stage: '무대', slot: '빈 자리', pick: '교과 고르기', pickSub: '교과 고르기 작은 글', pickPad: '교과 고르기 발판', pickBtn: '교과 고르기 버튼',
    stageSub: '무대 작은 글', stagePad: '무대 발판', stageBtn: '무대 버튼', view: '세 가지로 보기', viewSub: '세 가지로 보기 작은 글',
    bookSub: '책 작은 글', tvSub: 'TV 작은 글', albumSub: '사진첩 작은 글', ask: '물음', subjects: '교과', caseTemplate: '사례 기본 틀(교과 공통)',
    book: '책', tv: 'TV', album: '사진첩', captions: '사진 설명', elevator: '엘리베이터', city: '아래 도시', look: '들여다보기 버튼', stepWord: '단계 이름',
    next: '다음 버튼', toMemo: '메모판 버튼', tag: '딱지', arrive: '도착 안내', allSeen: '다 봤을 때 안내', scopes: '망원경', body: '본문',
    memo: '메모판', exTag: '예시 표시', mine: '내 쪽지', empty: '비었을 때', step: '단계 글', btn: '버튼', placeholder: '입력 안내',
    save: '저장 버튼', clear: '지우기 버튼', needText: '비었을 때 안내', saved: '저장 안내', stand: '전시대', ui: '버튼·안내 글',
    send: '무대로 보내기 버튼', toStage: '무대로 가기 버튼', standSub: '전시대 작은 글', onStage: '무대에 있을 때', cardsBtn: '카드 보기 버튼', cardsSub: '카드 작은 글',
    cardsNone: '장비를 안 골랐을 때', tryLens: '렌즈 시점 버튼', lensBtn: '써 보기 버튼', prev: '이전 버튼', draft: '가안 안내', cardTag: '카드 딱지',
    gear: '장비', what: '무엇인가', how: '수업에서 어떻게', warn: '주의할 점', lens: '렌즈 시점', done: '끝났을 때', fail: '안 될 때', panel: '끝 안내판',
    badge: '배지', items: '항목', shelf: '공중 선반', island: '섬 판', camera: '카메라 발판', wall: '전시 벽', tools: '도구 카드',
    maker: '섬 꾸미기 화면', mapLabel: '지도 이름', placed: '놓았을 때', needItem: '부품이 없을 때', rotate: '돌리기 버튼', remove: '빼기 버튼', undo: '되돌리기 버튼',
    shot: '사진 찍기 버튼', rotated: '돌렸을 때', removed: '뺐을 때', undone: '되돌렸을 때', cleared: '모두 지웠을 때', noItem: '꾸민 것이 없을 때', shotFail: '사진 실패',
    photoDone: '사진 찍었을 때', type: '종류', progress: '진행 글', lightBtn: '등불 켜기 버튼', askBtn: '상황 보기 버튼', reBtn: '다시 보기 버튼', retry: '다시 풀기 버튼',
    litTag: '켜졌을 때 딱지', litSub: '켜졌을 때 작은 글', litToast: '켜졌을 때 안내', allToast: '다 켜졌을 때 안내', floors: '층', num: '번호', short: '짧은 이름',
    again: '다시 볼 때 글', situation: '상황', subDone: '다 켜졌을 때 작은 글', btnDone: '다 켜졌을 때 버튼', notYet: '아직일 때 안내', checklist: '체크리스트'
  };
  const HIDE = new Set(['kind', 'stampId', 'id', 'model', 'icon', 'key', 'color', 'sky', 'ok', 'sample', 'photos', 'video', 'examples', 'book', 'tv', 'album', 'links']);
  const isColor = v => /^#[0-9a-fA-F]{3,8}$/.test(v);
  const lab = k => LABEL[k] || k;
  const itemTitle = (o, i, k) => {
    const t = o && (o.title || o.name || o.ko || o.num || o.n || o.big || o.short);
    return lab(k) + ' ' + (i + 1) + (t ? ' · ' + String(t).slice(0, 24) : '');
  };
  function selectHall(id) {
    S.hall = id;
    lsSet(LS_HALL, id);
    const rc = roomCfg(id), d = (S.content.halls || {})[id] || null;
    $('hallForm').hidden = !rc;
    $('noHall').hidden = !!rc;
    if (rc) buildForm(rc, d || {});
    const at = (d && d._at) || 0;
    $('lastSaved').textContent = at ? `마지막 저장: ${fmt(at)}${d._by ? ' · ' + d._by : ''}` : '아직 저장한 적 없어요(지금 보이는 글은 처음 글).';
    $('saveBar').hidden = false;
    setDirty(false);
  }
  function buildForm(rc, d) {
    const box = $('fields');
    box.textContent = '';
    S.fields = [];
    const saved = d.text && typeof d.text === 'object' ? d.text : {};
    const isStrArr = a => Array.isArray(a) && a.length > 0 && a.every(x => typeof x === 'string');
    const addField = (parent, path, k, def, multi) => {
      const f = el('div', 'f');
      const lb = el('div', 'lb'); lb.append(el('span', null, lab(k)), el('span', 'k', path), el('span', 'ch', '고침'));
      const inp = document.createElement(multi ? 'textarea' : 'input');
      if (!multi) inp.type = 'text';
      inp.value = typeof saved[path] === 'string' && saved[path].trim() ? saved[path] : def;
      inp.maxLength = 4000;
      f.append(lb, inp);
      parent.appendChild(f);
      const rec = { path, def, inp, el: f, label: lab(k) };
      inp.addEventListener('input', () => markField(rec));
      S.fields.push(rec);
      markField(rec);
    };
    const walk = (parent, obj, path) => {
      for (const k of Object.keys(obj)) {
        if (HIDE.has(k)) continue;
        const v = obj[k], p = path ? path + '.' + k : k;
        if (typeof v === 'string') { if (!isColor(v)) addField(parent, p, k, v, v.length > 70 || v.includes('\n')); }
        else if (isStrArr(v)) addField(parent, p, k, v.join('\n'), true);
        else if (Array.isArray(v)) {
          v.forEach((it, i) => {
            if (!it || typeof it !== 'object' || Array.isArray(it)) return;
            const fs = el('fieldset', 'it'); fs.appendChild(el('legend', null, itemTitle(it, i, k)));
            walk(fs, it, p + '[' + i + ']');
            if (fs.children.length > 1) parent.appendChild(fs);
          });
        } else if (v && typeof v === 'object') {
          const fs = el('fieldset', 'it'); fs.appendChild(el('legend', null, lab(k)));
          walk(fs, v, p);
          if (fs.children.length > 1) parent.appendChild(fs);
        }
      }
    };
    // 맨 위 묶음: 바로 글이면 '기본', 객체·배열이면 그 이름
    const basic = el('details', 'grp'); basic.open = true;
    const bs = el('summary'); bs.append(el('span', null, '기본 글'), el('span', 'n', '')); basic.appendChild(bs);
    const bin = el('div', 'in'); basic.appendChild(bin);
    box.appendChild(basic);
    for (const k of Object.keys(rc)) {
      if (HIDE.has(k)) continue;
      const v = rc[k], isStr = typeof v === 'string';
      if (isStr || isStrArr(v)) { walk(bin, { [k]: v }, ''); continue; }
      if (!v || typeof v !== 'object') continue;
      const g = el('details', 'grp');
      const sm = el('summary'); sm.append(el('span', null, lab(k)), el('span', 'n', '')); g.appendChild(sm);
      const gin = el('div', 'in'); g.appendChild(gin);
      walk(gin, { [k]: v }, '');
      // walk가 fieldset 하나로 감쌌으면 벗긴다
      if (gin.children.length === 1 && gin.firstElementChild.tagName === 'FIELDSET') { const fs = gin.firstElementChild; fs.querySelector('legend').remove(); fs.className = ''; fs.style.border = '0'; fs.style.padding = '0'; fs.style.margin = '0'; }
      if (gin.querySelector('.f')) box.appendChild(g);
    }
    if (!bin.querySelector('.f')) basic.remove();
    updateCounts();
    buildMedia(rc, d);
    applySearch();
  }
  function markField(rec) {
    const val = rec.inp.value.replace(/\r/g, '').trim(), def = rec.def.replace(/\r/g, '').trim();
    rec.el.classList.toggle('dirty', val !== '' && val !== def);
  }
  function updateCounts() {
    for (const g of $('fields').querySelectorAll('details.grp')) {
      const n = g.querySelectorAll('.f.dirty').length, b = g.querySelector('summary .n');
      b.textContent = n ? '고침 ' + n : String(g.querySelectorAll('.f').length) + '칸';
      b.classList.toggle('on', n > 0);
    }
  }
  // 칸 찾기: 이름표·경로·글에 들어 있는 칸만 보이고, 맞는 칸이 있는 묶음은 연다
  function applySearch() {
    const q = $('search').value.trim().toLowerCase();
    let n = 0;
    for (const r of S.fields) {
      const hit = !q || r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q) || r.inp.value.toLowerCase().includes(q) || r.def.toLowerCase().includes(q);
      r.el.classList.toggle('hide', !hit);
      if (hit) n++;
    }
    for (const g of $('fields').querySelectorAll('details.grp')) {
      const any = !!g.querySelector('.f:not(.hide)');
      g.hidden = q ? !any : false;
      if (q && any) g.open = true;
    }
    for (const fs of $('fields').querySelectorAll('fieldset.it')) fs.hidden = q ? !fs.querySelector('.f:not(.hide)') : false;
    $('searchN').textContent = q ? n + '칸' : '';
  }
  $('search').addEventListener('input', applySearch);
  // 저장할 글: 처음 글과 다른 칸만 { 경로: 글 }
  function buildText() {
    const out = {};
    for (const r of S.fields) {
      const val = r.inp.value.replace(/\r/g, '').trim(), def = r.def.replace(/\r/g, '').trim();
      if (val && val !== def) out[r.path] = val;
    }
    return out;
  }
  function setDirty(v) {
    S.dirty = !!v;
    $('saveBar').classList.toggle('dirty', S.dirty);
    $('saveState').textContent = S.dirty ? '저장하지 않은 고침이 있어요' : '고친 것이 없어요';
  }
  $('main').addEventListener('input', e => { if (!['hall', 'search'].includes(e.target.id) && e.target.type !== 'file') { setDirty(true); updateCounts(); } });
  addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* 교과별 사례(수업 사례관): 교과마다 책(지도안)·TV(유튜브)·사진첩(사진 올리기)·링크 */
  function buildMedia(rc, d) {
    const box = $('mediaBox');
    box.textContent = '';
    S.media = {};
    const subs = Array.isArray(rc.subjects) ? rc.subjects : [];
    box.hidden = !subs.length;
    if (!subs.length) return;
    const saved = d.media && typeof d.media === 'object' ? d.media : {};
    const h = el('details', 'grp'); h.open = true;
    const sm = el('summary'); sm.append(el('span', null, '교과별 수업 사례'), el('span', 'n', subs.length + '교과')); h.appendChild(sm);
    const hin = el('div', 'in');
    hin.appendChild(el('p', 'hint', '교과를 고른 뒤 책·TV·사진첩 발판에서 보여요. 비워 두면 교과 공통 틀([예시])이 나와요. 사진에는 아이 얼굴을 넣지 않아요.'));
    for (const s of subs) {
      const sv = saved[s.id] || {}, bk = sv.book || {}, tv = sv.tv || {}, al = sv.album || {};
      const m = S.media[s.id] = { photos: Array.isArray(al.photos) ? al.photos.map(p => ({ id: p.id, cap: p.cap || '' })) : [], links: Array.isArray(sv.links) ? sv.links.map(l => ({ label: l.label || '', url: l.url || '' })) : [] };
      const card = el('div', 'subj');
      const h3 = el('h3'); const dot = el('i'); dot.style.background = s.color || '#2A4D9B'; h3.append(dot, document.createTextNode(s.name));
      card.appendChild(h3);
      const field = (lbl, key, val, opt) => {
        const L = el('label', null, lbl);
        const inp = document.createElement(opt && opt.multi ? 'textarea' : 'input');
        if (!(opt && opt.multi)) inp.type = 'text';
        if (opt && opt.ph) inp.placeholder = opt.ph;
        if (opt && opt.rows) inp.rows = opt.rows;
        inp.value = val || '';
        inp.maxLength = opt && opt.max || 4000;
        if (opt && opt.url) { inp.inputMode = 'url'; inp.setAttribute('autocapitalize', 'none'); inp.spellcheck = false; }
        L.appendChild(inp);
        card.appendChild(L);
        m[key] = inp;
        return inp;
      };
      card.appendChild(el('h4', null, '책 · 지도안'));
      field('제목', 'bookTitle', bk.title, { ph: s.name + ' 지도안', max: 40 });
      field('부제', 'bookSub', bk.sub, { ph: '예: 5학년 · 2단원', max: 60 });
      field('본문 (빈 줄로 문단을 나눠요)', 'bookText', bk.text, { multi: true, rows: 6, ph: '학년과 단원 / 수업 목표 / 쓴 도구 / 수업 흐름 / 학생 반응' });
      card.appendChild(el('h4', null, 'TV · 수업 영상'));
      field('제목', 'tvTitle', tv.title, { max: 60 });
      const tvIn = field('유튜브 주소', 'tvUrl', tv.video, { ph: 'https://youtu.be/…', url: true });
      const chk = el('div', 'tvcheck'); chk.hidden = true; const th = document.createElement('img'); th.alt = ''; const tm = el('span'); chk.append(th, tm); card.appendChild(chk);
      const checkTv = () => { const v = tvIn.value.trim(); if (!v) { chk.hidden = true; return; } const id = ytId(v); chk.hidden = false; if (id) { chk.className = 'tvcheck'; th.hidden = false; th.src = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'; tm.textContent = '유튜브 영상 확인됨'; } else { chk.className = 'tvcheck bad'; th.hidden = true; tm.textContent = '유튜브 영상 주소가 아니에요'; } };
      tvIn.addEventListener('input', checkTv); checkTv();
      card.appendChild(el('h4', null, '사진첩 · 학생 결과물'));
      field('제목', 'albumTitle', al.title, { max: 60 });
      const ph = el('div', 'photos'); card.appendChild(ph); m.photoBox = ph;
      const row = el('div', 'row');
      const fl = el('label', 'btn primary file', '사진 올리기'); const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true; fi.hidden = true; fl.appendChild(fi);
      const st = el('span', 'muted small'); row.append(fl, st); card.appendChild(row); m.upStatus = st;
      fi.addEventListener('change', e => { const files = [...e.target.files]; e.target.value = ''; uploadFiles(s.id, files); });
      card.appendChild(el('p', 'hint', '사진은 폰에서 1600픽셀로 줄이고 위치 정보를 지운 뒤 올라가요. 올린 사진은 지도를 여는 누구나 볼 수 있어요. 교과마다 30장까지.'));
      card.appendChild(el('h4', null, '링크 모음 (책을 펼치면 \'더 알아보기\'로 나와요, 8개까지)'));
      const lk = el('div', 'links'); card.appendChild(lk); m.linkBox = lk;
      const add = mkBtn('링크 더하기', () => { m.links.push({ label: '', url: '' }); renderLinks(s.id); setDirty(true); const ins = lk.querySelectorAll('input'); if (ins.length >= 2) ins[ins.length - 2].focus(); });
      card.appendChild(add); m.addBtn = add;
      hin.appendChild(card);
      renderPhotos(s.id);
      renderLinks(s.id);
    }
    h.appendChild(hin);
    box.appendChild(h);
  }
  function renderPhotos(sid) {
    const m = S.media[sid], box = m.photoBox;
    box.textContent = '';
    if (!m.photos.length) { box.appendChild(el('div', 'empty', '아직 올린 사진이 없어요. 사진이 없으면 사진첩에는 빈 액자가 보여요.')); return; }
    m.photos.forEach((ph, i) => {
      const e = el('div', 'ph');
      const img = document.createElement('img'); img.src = S.api + '/api/img/' + encodeURIComponent(ph.id); img.alt = ph.cap || ''; img.loading = 'lazy';
      const cap = document.createElement('input'); cap.value = ph.cap; cap.placeholder = '사진 설명'; cap.maxLength = 80;
      cap.addEventListener('input', () => { ph.cap = cap.value; });
      const ops = el('div', 'ops');
      const prev = mkBtn('←', () => movePhoto(sid, i, -1)), next = mkBtn('→', () => movePhoto(sid, i, 1));
      prev.disabled = i === 0; next.disabled = i === m.photos.length - 1;
      ops.append(prev, next, mkBtn('지우기', () => removePhoto(sid, i), 'danger'));
      e.append(img, cap, ops);
      box.appendChild(e);
    });
  }
  function movePhoto(sid, i, d) {
    const m = S.media[sid], j = i + d;
    if (j < 0 || j >= m.photos.length) return;
    [m.photos[i], m.photos[j]] = [m.photos[j], m.photos[i]];
    renderPhotos(sid);
    setDirty(true);
  }
  async function removePhoto(sid, i) {
    if (S.busy || !confirm('이 사진을 지울까요? 사진첩에서도 바로 빠져요.')) return;
    const m = S.media[sid], ph = m.photos[i];
    try { await api('DELETE', '/api/admin/img?id=' + encodeURIComponent(ph.id)); }
    catch (er) { toast(errText(er), true); return; }
    m.photos.splice(i, 1);
    renderPhotos(sid);
    await save('사진을 지웠어요.');
  }
  // 폰 사진을 1600px JPEG로 줄인다(다시 그리면 위치 정보 같은 EXIF가 빠진다)
  async function shrink(file) {
    let src = null, url = '';
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { src = null; }
    if (!src) {
      url = URL.createObjectURL(file);
      src = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no({ error: 'decode' }); im.src = url; });
    }
    const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
    if (!w0 || !h0) throw { error: 'decode' };
    const k = Math.min(1, 1600 / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
    g.drawImage(src, 0, 0, w, h);
    if (src.close) src.close();
    if (url) URL.revokeObjectURL(url);
    let q = 0.85, blob = null;
    for (let i = 0; i < 6; i++) {
      blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', q));
      if (blob && blob.size <= 1700000) break;
      q -= 0.12;
    }
    if (!blob) throw { error: 'decode' };
    return blob;
  }
  async function uploadFiles(sid, files) {
    if (!files.length || S.busy || !S.hall) return;
    const m = S.media[sid];
    if (m.photos.length + files.length > 30) { toast('교과마다 사진은 30장까지예요.', true); return; }
    S.busy = true;
    let n = 0, done = 0;
    for (const f of files) {
      m.upStatus.textContent = `올리는 중 ${done + 1}/${files.length}…`;
      done++;
      try {
        const blob = await shrink(f);
        const j = await api('POST', `/api/admin/img?map=${MAP}&school=${encodeURIComponent(S.hall)}`, undefined, blob);
        m.photos.push({ id: j.id, cap: '' });
        n++;
        renderPhotos(sid);
      } catch (er) {
        toast(errText(er), true);
        if (er && ['many', 'full', 'auth', 'network'].includes(er.error)) break;
      }
    }
    S.busy = false;
    m.upStatus.textContent = '';
    if (n) await save(`사진 ${n}장을 올렸어요. 아래에 설명을 적고 저장하면 사진첩에 함께 나와요.`);
  }
  function renderLinks(sid) {
    const m = S.media[sid], box = m.linkBox;
    box.textContent = '';
    m.links.forEach((l, i) => {
      const row = el('div', 'lk');
      const a = document.createElement('input'); a.placeholder = '이름(예: 활동지)'; a.value = l.label; a.maxLength = 40;
      const u = document.createElement('input'); u.className = 'u'; u.placeholder = 'https://'; u.value = l.url; u.inputMode = 'url'; u.setAttribute('autocapitalize', 'none'); u.spellcheck = false;
      a.addEventListener('input', () => { l.label = a.value; });
      u.addEventListener('input', () => { l.url = u.value; });
      u.addEventListener('blur', () => { const f = fixUrl(u.value); if (f !== u.value) { u.value = f; l.url = f; } });
      row.append(a, u, mkBtn('빼기', () => { m.links.splice(i, 1); renderLinks(sid); setDirty(true); }, 'danger x'));
      box.appendChild(row);
    });
    m.addBtn.hidden = m.links.length >= 8;
  }
  function buildMedia_out() {
    const out = {};
    for (const sid of Object.keys(S.media)) {
      const m = S.media[sid], v = k => String(m[k] ? m[k].value : '').replace(/\r/g, '').trim();
      out[sid] = {
        book: { title: v('bookTitle'), sub: v('bookSub'), text: v('bookText') },
        tv: { title: v('tvTitle'), video: v('tvUrl') },
        album: { title: v('albumTitle'), photos: m.photos.map(p => ({ id: p.id, cap: String(p.cap || '').trim() })) },
        links: m.links.map(l => ({ label: String(l.label || '').trim(), url: fixUrl(l.url) })).filter(l => l.url)
      };
    }
    return out;
  }

  async function save(doneMsg) {
    if (S.busy || !S.hall) return false;
    for (const sid of Object.keys(S.media)) {
      const m = S.media[sid], tvv = m.tvUrl.value.trim();
      if (tvv && !ytId(tvv)) { toast(ERR.video, true); m.tvUrl.focus(); return false; }
      if (m.links.find(l => l.url.trim() && !isUrl(fixUrl(l.url)))) { toast(ERR.links, true); return false; }
    }
    busy('btnSave', true, '저장 중…');
    try {
      await api('PUT', `/api/admin/hall?map=${MAP}&id=${encodeURIComponent(S.hall)}`, { text: buildText(), media: buildMedia_out() });
      await loadContent();
      busy('btnSave', false);
      const sq = $('search').value;
      selectHall(S.hall);
      $('search').value = sq; applySearch();
      toast(doneMsg || '저장했어요. 지도를 새로 열면 바로 보여요.');
      return true;
    } catch (er) {
      busy('btnSave', false);
      toast(errText(er), true);
      return false;
    }
  }
  $('btnSave').addEventListener('click', () => save());

  // ── 계정(관리자만) — 가상융합 지도만의 계정(프랑스 로비와 따로). '담당'은 관 id로 정한다 ──
  $('btnUsers').addEventListener('click', async () => {
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 버리고 갈까요?')) return;
    setDirty(false);
    show('users');
    resetUserForm();
    await loadUsers();
  });
  $('usersBack').addEventListener('click', () => { show('main'); if (S.hall) selectHall(S.hall); });
  function fillSchoolChecks(sel) {
    const box = $('uSchools');
    box.textContent = '';
    for (const s of S.cfg.schools || []) {
      const l = document.createElement('label');
      const c = document.createElement('input'); c.type = 'checkbox'; c.value = s.id; c.checked = (sel || []).includes(s.id);
      l.append(c, document.createTextNode(' ' + s.name));
      box.appendChild(l);
    }
  }
  const roleNow = () => (document.querySelector('input[name=uRole]:checked') || {}).value || 'editor';
  function syncRole() { $('uSchools').hidden = roleNow() === 'admin'; }
  for (const r of document.querySelectorAll('input[name=uRole]')) r.addEventListener('change', syncRole);
  function resetUserForm() {
    S.editing = null;
    $('userFormTitle').textContent = '새 계정';
    $('uName').value = ''; $('uName').readOnly = false;
    $('uPw').value = ''; $('uPwSub').textContent = '8자 이상';
    document.querySelector('input[name=uRole][value=editor]').checked = true;
    fillSchoolChecks([]);
    syncRole();
    setErr('uErr', '');
  }
  function editUser(u) {
    S.editing = u.user;
    $('userFormTitle').textContent = '계정 고치기';
    $('uName').value = u.user; $('uName').readOnly = true;
    $('uPw').value = ''; $('uPwSub').textContent = '바꿀 때만 넣어요';
    document.querySelector(`input[name=uRole][value=${u.role === 'admin' ? 'admin' : 'editor'}]`).checked = true;
    fillSchoolChecks(u.schools || []);
    syncRole();
    setErr('uErr', '');
    $('uName').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  async function loadUsers() {
    const list = $('userList');
    list.textContent = '';
    let j;
    try { j = await api('GET', A('/api/admin/users')); } catch (er) { toast(errText(er), true); return; }
    for (const u of j.users) {
      const row = el('div', 'urow');
      const t = el('div', 't');
      const b = el('b', null, u.user);
      const tag = el('span', 'tag' + (u.role === 'admin' ? ' admin' : ''), u.role === 'admin' ? '관리자' : '담당');
      const r = el('div', 'r', (u.role === 'admin' ? '모든 관' : (u.schools.map(hallName).join(', ') || '담당 없음')) + (u.last ? ' · 마지막 로그인 ' + fmt(u.last) : ' · 아직 로그인 안 함'));
      t.append(b, tag, r);
      row.append(t, mkBtn('고치기', () => editUser(u)));
      if (u.user !== S.me.user) row.append(mkBtn('지우기', () => delUser(u), 'danger'));
      list.appendChild(row);
    }
  }
  async function delUser(u) {
    if (!confirm(`'${u.user}' 계정을 지울까요?`)) return;
    try { await api('DELETE', A('/api/admin/users?user=' + encodeURIComponent(u.user))); toast('계정을 지웠어요.'); if (S.editing === u.user) resetUserForm(); await loadUsers(); }
    catch (er) { toast(errText(er), true); }
  }
  $('uReset').addEventListener('click', resetUserForm);
  $('userForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (S.busy) return;
    setErr('uErr', '');
    const user = normUser($('uName').value), pw = $('uPw').value, role = roleNow();
    let schools = [];
    if (role !== 'admin') schools = [...$('uSchools').querySelectorAll('input:checked')].map(c => c.value);
    if (!S.editing && pw.length < 8) { setErr('uErr', '비밀번호는 8자 이상으로 해 주세요.'); return; }
    if (S.editing && pw && pw.length < 8) { setErr('uErr', '비밀번호는 8자 이상으로 해 주세요.'); return; }
    if (role !== 'admin' && !schools.length) { setErr('uErr', '담당 관을 하나 이상 골라 주세요.'); return; }
    busy('uGo', true, '저장 중…');
    try {
      const body = { user, role, schools };
      if (pw) body.key = await deriveKey(user, pw);
      const j = await api('POST', A('/api/admin/users'), body);
      toast(j.created ? '계정을 만들었어요. 아이디와 비밀번호를 그 선생님께 알려 주세요.' : '계정을 고쳤어요.');
      resetUserForm();
      await loadUsers();
    } catch (er) { setErr('uErr', errText(er)); }
    finally { busy('uGo', false); }
  });

  // ── 비밀번호 바꾸기 ──
  $('btnPw').addEventListener('click', () => {
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 버리고 갈까요?')) return;
    setDirty(false);
    for (const id of ['pwOld', 'pwNew', 'pwNew2']) $(id).value = '';
    setErr('pwErr', '');
    show('pw');
  });
  $('pwBack').addEventListener('click', () => { show('main'); if (S.hall) selectHall(S.hall); });
  $('pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (S.busy) return;
    setErr('pwErr', '');
    const a = $('pwOld').value, b = $('pwNew').value;
    if (b.length < 8) { setErr('pwErr', '새 비밀번호는 8자 이상으로 해 주세요.'); return; }
    if (b !== $('pwNew2').value) { setErr('pwErr', '새 비밀번호 확인이 달라요.'); return; }
    busy('pwGo', true, '바꾸는 중…');
    try {
      const key = await deriveKey(S.me.user, a), newKey = await deriveKey(S.me.user, b);
      await api('POST', A('/api/admin/password'), { key, newKey });
      for (const id of ['pwOld', 'pwNew', 'pwNew2']) $(id).value = '';
      toast('비밀번호를 바꿨어요. 다른 기기의 로그인은 풀렸어요.');
      show('main');
      if (S.hall) selectHall(S.hall);
    } catch (er) { setErr('pwErr', errText(er)); }
    finally { busy('pwGo', false); }
  });

  if (!window.crypto || !crypto.subtle) { bootMsg('이 브라우저에서는 관리자 페이지를 열 수 없어요(https 주소로 열어 주세요).'); return; }
  boot();
})();
