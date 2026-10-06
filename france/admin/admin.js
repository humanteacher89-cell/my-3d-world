// 프랑스 한글학교 로비 관리자 페이지 (2026-10-06, XR개발부)
// 로그인 → 학교 고르기 → 홈페이지·교실 글·사진첩·TV 영상·링크를 고쳐 Cloudflare 저장소(/api/admin/*)에 저장한다.
// 기본 글은 로비 설정(../lobby.config.js)에서 읽는다. 기본 글과 같은 칸은 빈 값으로 저장해 '기본 글'로 남긴다(로비의 [예시] 표시 유지).
// 비밀번호는 이 브라우저에서 PBKDF2(SHA-256, 310,000번)로 바꾼 값만 서버로 보낸다. 서버 주소는 ../relay.json(시험: ?api=http://127.0.0.1:8791).
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const MAP = 'fr', ITER = 310000, LS = 'frLobbyAdmin', LS_SCHOOL = 'frLobbyAdminSchool';
  const S = { api: '', token: '', me: null, cfg: null, content: { schools: {}, rooms: {} }, school: '', photos: [], links: [], dirty: false, busy: false, editing: null };
  const enc = new TextEncoder();

  // ── 작은 도구 ──
  const SCREENS = ['boot', 'login', 'setup', 'main', 'users', 'pw'];
  function show(id) {
    for (const s of SCREENS) $(s).hidden = s !== id;
    $('top').hidden = !['main', 'users', 'pw'].includes(id);
    $('saveBar').hidden = id !== 'main' || !S.school;
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
    perm: '이 학교를 고칠 권한이 없어요.',
    password: '지금 비밀번호가 맞지 않아요.',
    self: '내 계정은 지우거나 관리자에서 뺄 수 없어요.',
    video: '유튜브 영상 주소만 넣을 수 있어요.',
    web: '홈페이지 주소는 https:// 로 시작해야 해요.',
    links: '링크 주소는 https:// 로 시작해야 해요.',
    big: '사진이 너무 커요.',
    type: '사진 파일(JPG·PNG·WebP)만 올릴 수 있어요.',
    decode: '이 사진은 열 수 없어요. 다른 사진으로 해 주세요.',
    many: '한 학교에 사진은 60장까지예요.',
    full: '사진 저장 공간이 가득 찼어요.',
    auth: '로그인이 풀렸어요. 다시 로그인해 주세요.',
    origin: '이 주소에서는 관리할 수 없어요.',
    id: '학교를 다시 골라 주세요.',
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
  const schoolCfg = id => (S.cfg.schools || []).find(s => s.id === id) || {};
  const schoolName = id => schoolCfg(id).name || id;
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
    if (!S.cfg) { bootMsg('로비 설정(lobby.config.js)을 읽지 못했어요. 새로 고침해 주세요.'); return; }
    S.api = String(Q.get('api') || await apiFromRelay() || '').replace(/\/+$/, '');
    if (!S.api) { bootMsg('서버 주소(relay.json)를 찾지 못했어요.'); return; }
    if (Q.get('lobby')) $('viewLobby').href = Q.get('lobby');
    const saved = lsGet(LS, null);
    if (saved && saved.token) {
      S.token = saved.token;
      try { const me = await api('GET', '/api/admin/me'); S.me = me; await enterMain(); return; } catch (_) { S.token = ''; lsSet(LS, null); }
    }
    let st;
    try { st = await api('GET', '/api/admin/state'); } catch (e) { bootMsg(errText(e)); return; }
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
    try { const key = await deriveKey(user, pw); afterLogin(await api('POST', '/api/admin/login', { user, key })); }
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
    try { const key = await deriveKey(user, pw); afterLogin(await api('POST', '/api/admin/setup', { code: $('setupCode').value, user, key })); toast('관리자를 만들었어요.'); }
    catch (er) { setErr('setupErr', errText(er)); }
    finally { busy('setupGo', false); }
  });
  $('toSetup').addEventListener('click', e => { e.preventDefault(); setErr('setupErr', ''); show('setup'); });
  $('toLogin').addEventListener('click', e => { e.preventDefault(); show('login'); });
  $('btnOut').addEventListener('click', async () => {
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 그래도 로그아웃할까요?')) return;
    try { await api('POST', '/api/admin/logout'); } catch (_) { /* 이미 풀렸으면 그대로 */ }
    logoutLocal();
  });

  // ── 내용 고치기 ──
  const allowed = id => S.me && (S.me.role === 'admin' || (S.me.schools || []).includes(id));
  async function enterMain() {
    $('whoName').textContent = S.me.user + (S.me.role === 'admin' ? ' · 관리자' : ' · 학교 담당');
    $('btnUsers').hidden = S.me.role !== 'admin';
    $('pwUser').value = S.me.user;
    fillSchools();
    show('main');
    try { await loadContent(); } catch (er) { toast(errText(er), true); }
    if ($('school').value) selectSchool($('school').value);
    else { $('roomForm').hidden = true; $('noRoom').hidden = false; $('noRoom').querySelector('p').textContent = '맡은 학교가 없어요. 관리자에게 담당 학교를 정해 달라고 해 주세요.'; }
  }
  function fillSchools() {
    const sel = $('school');
    sel.textContent = '';
    const list = (S.cfg.schools || []).filter(s => allowed(s.id));
    list.sort((a, b) => (roomCfg(b.id) ? 1 : 0) - (roomCfg(a.id) ? 1 : 0));
    for (const s of list) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name + (roomCfg(s.id) ? ' · 교실 있음' : '');
      sel.appendChild(o);
    }
    const last = lsGet(LS_SCHOOL, '');
    if (last && list.some(s => s.id === last)) sel.value = last;
    S.school = sel.value || '';
  }
  async function loadContent() { S.content = await api('GET', '/api/admin/content?map=' + MAP); }
  $('school').addEventListener('change', () => {
    const v = $('school').value;
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 버리고 다른 학교로 갈까요?')) { $('school').value = S.school; return; }
    selectSchool(v);
  });
  const pick = (saved, def) => (typeof saved === 'string' && saved.trim()) ? saved : (def == null ? '' : String(def));
  function selectSchool(id) {
    S.school = id;
    lsSet(LS_SCHOOL, id);
    const sc = schoolCfg(id), sd = (S.content.schools || {})[id] || {};
    $('fWeb').value = pick(sd.web, sc.web);
    const rc = roomCfg(id), rd = (S.content.rooms || {})[id] || null;
    $('roomForm').hidden = !rc;
    $('noRoom').hidden = !!rc;
    $('noRoom').querySelector('p').textContent = '이 학교 교실은 아직 없어요. 교실이 생기면 여기서 사진·영상·글을 넣을 수 있어요.';
    if (rc) fillRoom(rc, rd || {});
    const at = Math.max(sd._at || 0, (rd && rd._at) || 0);
    const by = (rd && rd._at === at ? rd._by : sd._by) || '';
    $('lastSaved').textContent = at ? `마지막 저장: ${fmt(at)}${by ? ' · ' + by : ''}` : '아직 저장한 적 없어요(지금 보이는 글은 기본 글).';
    $('saveBar').hidden = false;
    setDirty(false);
  }
  function fillRoom(rc, d) {
    const it = rc.items || {}, bk = it.book || {}, al = it.album || {}, tv = it.tv || {}, pr = rc.principal || {};
    const dp = d.principal || {}, db = d.book || {}, da = d.album || {}, dt = d.tv || {};
    $('fBoardTitle').value = pick(d.boardTitle, rc.boardTitle);
    $('fBoardLine').value = pick(d.boardLine, rc.boardLine);
    $('fWelcome').value = pick(d.welcome, rc.welcome);
    $('fPrName').value = pick(dp.name, pr.name);
    $('fPrLines').value = ((dp.lines && dp.lines.length) ? dp.lines : (pr.lines || [])).join('\n');
    $('fBookTitle').value = pick(db.title, bk.title);
    $('fBookSub').value = pick(db.sub, bk.sub);
    $('fBookText').value = pick(db.text, bk.text);
    $('fAlbumTitle').value = pick(da.title, al.title);
    S.photos = Array.isArray(da.photos) ? da.photos.map(p => ({ id: p.id, cap: p.cap || '' })) : [];
    $('fTvTitle').value = pick(dt.title, tv.title);
    $('fTvUrl').value = pick(dt.video, tv.video);
    S.links = Array.isArray(d.links) ? d.links.map(l => ({ label: l.label || '', url: l.url || '' })) : [];
    renderPhotos();
    renderLinks();
    checkTv();
  }
  // 기본 글과 같으면 빈 값(= 기본 글 그대로)으로 저장한다
  function buildRoom() {
    const rc = roomCfg(S.school), it = rc.items || {}, pr = rc.principal || {}, bk = it.book || {}, al = it.album || {}, tv = it.tv || {};
    const keep = (val, def) => { val = String(val || '').replace(/\r/g, '').trim(); return val === String(def == null ? '' : def).replace(/\r/g, '').trim() ? '' : val; };
    const lines = $('fPrLines').value.split('\n').map(x => x.trim()).filter(Boolean);
    const defLines = (pr.lines || []).map(x => String(x).trim());
    return {
      boardTitle: keep($('fBoardTitle').value, rc.boardTitle),
      boardLine: keep($('fBoardLine').value, rc.boardLine),
      welcome: keep($('fWelcome').value, rc.welcome),
      principal: { name: keep($('fPrName').value, pr.name), lines: lines.join('\n') === defLines.join('\n') ? [] : lines },
      book: { title: keep($('fBookTitle').value, bk.title), sub: keep($('fBookSub').value, bk.sub), text: keep($('fBookText').value, bk.text) },
      album: { title: keep($('fAlbumTitle').value, al.title), photos: S.photos.map(p => ({ id: p.id, cap: String(p.cap || '').trim() })) },
      tv: { title: keep($('fTvTitle').value, tv.title), video: keep($('fTvUrl').value, tv.video) },
      links: S.links.map(l => ({ label: String(l.label || '').trim(), url: fixUrl(l.url) })).filter(l => l.url)
    };
  }
  function setDirty(v) {
    S.dirty = !!v;
    $('saveBar').classList.toggle('dirty', S.dirty);
    $('saveState').textContent = S.dirty ? '저장하지 않은 고침이 있어요' : '고친 것이 없어요';
  }
  $('main').addEventListener('input', e => { if (e.target.id !== 'school' && e.target.id !== 'fFiles') setDirty(true); });
  addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  async function save(doneMsg) {
    if (S.busy || !S.school) return false;
    const web = fixUrl($('fWeb').value);
    $('fWeb').value = web;
    if (web && !isUrl(web)) { toast(ERR.web, true); $('fWeb').focus(); return false; }
    const rc = roomCfg(S.school);
    if (rc) {
      const v = $('fTvUrl').value.trim();
      if (v && !ytId(v)) { toast(ERR.video, true); $('fTvUrl').focus(); return false; }
      const badLink = S.links.find(l => l.url.trim() && !isUrl(fixUrl(l.url)));
      if (badLink) { toast(ERR.links, true); return false; }
    }
    busy('btnSave', true, '저장 중…');
    try {
      const webDef = String(schoolCfg(S.school).web || '').trim();
      await api('PUT', `/api/admin/school?map=${MAP}&id=${encodeURIComponent(S.school)}`, { web: web === webDef ? '' : web });
      if (rc) await api('PUT', `/api/admin/room?map=${MAP}&id=${encodeURIComponent(S.school)}`, buildRoom());
      await loadContent();
      busy('btnSave', false);
      selectSchool(S.school);
      toast(doneMsg || '저장했어요. 로비를 새로 열면 바로 보여요.');
      return true;
    } catch (er) {
      busy('btnSave', false);
      toast(errText(er), true);
      return false;
    }
  }
  $('btnSave').addEventListener('click', () => save());

  // 사진첩
  function renderPhotos() {
    const box = $('photos');
    box.textContent = '';
    if (!S.photos.length) {
      const p = document.createElement('div');
      p.className = 'empty'; p.textContent = '아직 올린 사진이 없어요. 사진이 없으면 로비 사진첩에는 빈 액자가 보여요.';
      box.appendChild(p);
      return;
    }
    S.photos.forEach((ph, i) => {
      const el = document.createElement('div'); el.className = 'ph';
      const img = document.createElement('img'); img.src = S.api + '/api/img/' + encodeURIComponent(ph.id); img.alt = ph.cap || ''; img.loading = 'lazy';
      const cap = document.createElement('input'); cap.value = ph.cap; cap.placeholder = '사진 설명(예: 한글날 행사)'; cap.maxLength = 80;
      cap.addEventListener('input', () => { ph.cap = cap.value; });
      const ops = document.createElement('div'); ops.className = 'ops';
      const prev = mkBtn('←', () => movePhoto(i, -1)), next = mkBtn('→', () => movePhoto(i, 1));
      prev.title = '앞으로'; next.title = '뒤로'; prev.disabled = i === 0; next.disabled = i === S.photos.length - 1;
      ops.append(prev, next, mkBtn('지우기', () => removePhoto(i), 'danger'));
      el.append(img, cap, ops);
      box.appendChild(el);
    });
  }
  function movePhoto(i, d) {
    const j = i + d;
    if (j < 0 || j >= S.photos.length) return;
    [S.photos[i], S.photos[j]] = [S.photos[j], S.photos[i]];
    renderPhotos();
    setDirty(true);
  }
  async function removePhoto(i) {
    if (S.busy || !confirm('이 사진을 지울까요? 로비 사진첩에서도 바로 빠져요.')) return;
    const ph = S.photos[i];
    try { await api('DELETE', '/api/admin/img?id=' + encodeURIComponent(ph.id)); }
    catch (er) { toast(errText(er), true); return; }
    S.photos.splice(i, 1);
    renderPhotos();
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
  async function uploadFiles(files) {
    if (!files.length || S.busy || !S.school) return;
    S.busy = true;
    let n = 0, done = 0;
    for (const f of files) {
      $('upStatus').textContent = `올리는 중 ${done + 1}/${files.length}…`;
      done++;
      try {
        const blob = await shrink(f);
        const j = await api('POST', `/api/admin/img?map=${MAP}&school=${encodeURIComponent(S.school)}`, undefined, blob);
        S.photos.push({ id: j.id, cap: '' });
        n++;
        renderPhotos();
      } catch (er) {
        toast(errText(er), true);
        if (er && ['many', 'full', 'auth', 'network'].includes(er.error)) break;
      }
    }
    S.busy = false;
    $('upStatus').textContent = '';
    if (n) await save(`사진 ${n}장을 올렸어요. 아래에 설명을 적고 저장하면 사진첩에 함께 나와요.`);
  }
  $('fFiles').addEventListener('change', e => { const files = [...e.target.files]; e.target.value = ''; uploadFiles(files); });

  // TV 영상 주소 확인
  function checkTv() {
    const s = $('fTvUrl').value.trim(), box = $('tvCheck');
    if (!s) { box.hidden = true; return; }
    const id = ytId(s);
    box.hidden = false;
    if (id) { box.className = 'tvcheck'; $('tvThumb').hidden = false; $('tvThumb').src = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'; $('tvMsg').textContent = '유튜브 영상 확인됨'; }
    else { box.className = 'tvcheck bad'; $('tvThumb').hidden = true; $('tvMsg').textContent = '유튜브 영상 주소가 아니에요'; }
  }
  $('fTvUrl').addEventListener('input', checkTv);
  $('fWeb').addEventListener('blur', () => { $('fWeb').value = fixUrl($('fWeb').value); });

  // 링크 모음
  function renderLinks() {
    const box = $('links');
    box.textContent = '';
    S.links.forEach((l, i) => {
      const row = document.createElement('div'); row.className = 'lk';
      const a = document.createElement('input'); a.placeholder = '이름(예: 학교 카페)'; a.value = l.label; a.maxLength = 40;
      const u = document.createElement('input'); u.className = 'u'; u.placeholder = 'https://'; u.value = l.url; u.inputMode = 'url'; u.setAttribute('autocapitalize', 'none'); u.spellcheck = false;
      a.addEventListener('input', () => { l.label = a.value; });
      u.addEventListener('input', () => { l.url = u.value; });
      u.addEventListener('blur', () => { const f = fixUrl(u.value); if (f !== u.value) { u.value = f; l.url = f; } });
      const x = mkBtn('빼기', () => { S.links.splice(i, 1); renderLinks(); setDirty(true); }, 'danger x');
      row.append(a, u, x);
      box.appendChild(row);
    });
    $('addLink').hidden = S.links.length >= 8;
  }
  $('addLink').addEventListener('click', () => {
    S.links.push({ label: '', url: '' });
    renderLinks();
    setDirty(true);
    const ins = $('links').querySelectorAll('input');
    if (ins.length >= 2) ins[ins.length - 2].focus();
  });

  // ── 계정(관리자만) ──
  $('btnUsers').addEventListener('click', async () => {
    if (S.dirty && !confirm('저장하지 않은 고침이 있어요. 버리고 갈까요?')) return;
    setDirty(false);
    show('users');
    resetUserForm();
    await loadUsers();
  });
  $('usersBack').addEventListener('click', () => { show('main'); if (S.school) selectSchool(S.school); });
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
    try { j = await api('GET', '/api/admin/users'); } catch (er) { toast(errText(er), true); return; }
    for (const u of j.users) {
      const row = document.createElement('div'); row.className = 'urow';
      const t = document.createElement('div'); t.className = 't';
      const b = document.createElement('b'); b.textContent = u.user;
      const tag = document.createElement('span'); tag.className = 'tag' + (u.role === 'admin' ? ' admin' : ''); tag.textContent = u.role === 'admin' ? '관리자' : '학교 담당';
      const r = document.createElement('div'); r.className = 'r';
      r.textContent = (u.role === 'admin' ? '모든 학교' : (u.schools.map(schoolName).join(', ') || '담당 학교 없음')) + (u.last ? ' · 마지막 로그인 ' + fmt(u.last) : ' · 아직 로그인 안 함');
      t.append(b, tag, r);
      row.append(t, mkBtn('고치기', () => editUser(u)));
      if (u.user !== S.me.user) row.append(mkBtn('지우기', () => delUser(u), 'danger'));
      list.appendChild(row);
    }
  }
  async function delUser(u) {
    if (!confirm(`'${u.user}' 계정을 지울까요?`)) return;
    try { await api('DELETE', '/api/admin/users?user=' + encodeURIComponent(u.user)); toast('계정을 지웠어요.'); if (S.editing === u.user) resetUserForm(); await loadUsers(); }
    catch (er) { toast(errText(er), true); }
  }
  $('uReset').addEventListener('click', resetUserForm);
  $('userForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (S.busy) return;
    setErr('uErr', '');
    const user = normUser($('uName').value), pw = $('uPw').value, role = roleNow();
    const schools = role === 'admin' ? [] : [...$('uSchools').querySelectorAll('input:checked')].map(c => c.value);
    if (!S.editing && pw.length < 8) { setErr('uErr', '비밀번호는 8자 이상으로 해 주세요.'); return; }
    if (S.editing && pw && pw.length < 8) { setErr('uErr', '비밀번호는 8자 이상으로 해 주세요.'); return; }
    if (role !== 'admin' && !schools.length) { setErr('uErr', '담당 학교를 하나 이상 골라 주세요.'); return; }
    busy('uGo', true, '저장 중…');
    try {
      const body = { user, role, schools };
      if (pw) body.key = await deriveKey(user, pw);
      const j = await api('POST', '/api/admin/users', body);
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
  $('pwBack').addEventListener('click', () => { show('main'); if (S.school) selectSchool(S.school); });
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
      await api('POST', '/api/admin/password', { key, newKey });
      for (const id of ['pwOld', 'pwNew', 'pwNew2']) $(id).value = '';
      toast('비밀번호를 바꿨어요. 다른 기기의 로그인은 풀렸어요.');
      show('main');
      if (S.school) selectSchool(S.school);
    } catch (er) { setErr('pwErr', errText(er)); }
    finally { busy('pwGo', false); }
  });

  if (!window.crypto || !crypto.subtle) { bootMsg('이 브라우저에서는 관리자 페이지를 열 수 없어요(https 주소로 열어 주세요).'); return; }
  boot();
})();
