// 관리자 페이지용 내용 저장소 — Cloudflare Durable Object(SQLite) 하나 (2026-10-06, XR개발부)
// 공개: GET /api/content?map=fr (학교 홈페이지·교실 글·사진 목록·TV 영상·링크), GET /api/img/<id> (사진)
// 관리(Authorization: Bearer <토큰>): /api/admin/* — 처음 설정·로그인·교실/학교 저장·사진 올리기/지우기·계정
// 비밀번호: 브라우저가 PBKDF2-SHA256(310,000번, 소금 'hangul-lobby|아이디')으로 바꾼 값(key, 64자리)만 보낸다.
//   서버는 계정마다 무작위 소금을 붙여 SHA-256으로 한 번 더 바꿔 저장한다(무거운 계산은 브라우저가, 서버는 무료 플랜 CPU 한도 안).
// 첫 관리자: wrangler.jsonc의 ADMIN_SETUP_HASH(1회용 설정 코드의 SHA-256)와 맞는 코드를 넣은 사람이 만든다.
//   코드를 새로 만들어 배포하면 관리자 비밀번호를 다시 정할 수 있다(그때 모든 로그인이 풀린다). 쓴 코드는 다시 못 쓴다.
// 로그인 5번 틀리면 15분 잠김(아이디별·접속 주소별). 사진은 한 장 1.8MB까지(관리자 페이지가 1600px JPEG로 줄여 올린다).

const ADMIN_ORIGINS = ['https://humanteacher89-cell.github.io'];
const MAPS = { fr: true };
const MAX_IMG = 1800000;               // SQLite 행 하나 2MB 한도 아래
const MAX_IMGS_SCHOOL = 60;
const MAX_IMG_TOTAL = 800 * 1000000;   // 사진 전체 800MB까지(무료 플랜은 Durable Object 하나에 1GB, 계정 전체 5GB)
const SESSION_MS = 14 * 864e5;         // 로그인 유지 14일
const LOCK_FAILS = 5, LOCK_MS = 15 * 60e3;
const ORPHAN_MS = 6 * 3600e3;          // 올렸지만 교실에 저장하지 않은 사진은 6시간 뒤 그 교실을 저장할 때 지운다

const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
function same(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
class E extends Error { constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; } }

// ── 들어온 값 다듬기 ──
const str = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
function cleanUrl(v) {
  const s = str(v, 500);
  if (!s) return '';
  try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null; } catch { return null; }
}
// 유튜브 주소(보기·짧은 주소·쇼츠·embed)를 embed 주소로. 유튜브가 아니면 null
export function youtube(v) {
  const s = str(v, 500);
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { return null; }
  const h = u.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (h === 'youtu.be') id = u.pathname.slice(1);
  else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
    else { const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/); if (m) id = m[2]; }
  }
  id = id.split(/[?&#/]/)[0];
  return /^[\w-]{6,20}$/.test(id) ? 'https://www.youtube.com/embed/' + id : null;
}
function cleanLinks(v) {
  return (Array.isArray(v) ? v : []).slice(0, 8).map((l, i) => {
    const url = cleanUrl(l && l.url);
    if (url === null) throw new E(400, 'links', { i });
    return { label: str(l && l.label, 40), url };
  }).filter(l => l.url);
}
function cleanRoom(d) {
  d = d && typeof d === 'object' ? d : {};
  const p = d.principal || {}, b = d.book || {}, a = d.album || {}, t = d.tv || {};
  const video = youtube(t.video);
  if (video === null) throw new E(400, 'video');
  return {
    boardTitle: str(d.boardTitle, 40), boardLine: str(d.boardLine, 60), welcome: str(d.welcome, 120),
    principal: { name: str(p.name, 20), lines: (Array.isArray(p.lines) ? p.lines : []).map(x => str(x, 200)).filter(Boolean).slice(0, 8) },
    book: { title: str(b.title, 40), sub: str(b.sub, 60), text: str(b.text, 4000) },
    album: { title: str(a.title, 60), photos: (Array.isArray(a.photos) ? a.photos : []).slice(0, MAX_IMGS_SCHOOL)
      .map(ph => ({ id: str(ph && ph.id, 40), cap: str(ph && ph.cap, 80) })).filter(ph => /^[\w-]{10,40}$/.test(ph.id)) },
    tv: { title: str(t.title, 60), video },
    links: cleanLinks(d.links)
  };
}
function cleanSchool(d) {
  d = d && typeof d === 'object' ? d : {};
  const web = cleanUrl(d.web);
  if (web === null) throw new E(400, 'web');
  return { web };
}
function cleanUser(v) {
  const s = String(v ?? '').normalize('NFC').trim().toLowerCase();
  if (!/^[a-z0-9가-힣._-]{2,20}$/.test(s)) throw new E(400, 'user');
  return s;
}
function cleanKey(v) {
  const s = String(v ?? '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(s)) throw new E(400, 'key');
  return s;
}
const idOf = v => { const s = String(v ?? ''); if (!/^[a-z0-9_-]{2,24}$/.test(s)) throw new E(400, 'id'); return s; };
const mapOf = url => { const m = url.searchParams.get('map') || 'fr'; if (!MAPS[m]) throw new E(400, 'map'); return m; };
function sniff(b) {
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

// ── 주소 확인(CORS): 관리 요청은 GitHub Pages와 이 PC 시험 주소에서만 ──
export function adminOriginOk(o, env) {
  if (!o) return false;
  let u;
  try { u = new URL(o); } catch { return false; }
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)) return true;
  const extra = String((env && env.ADMIN_ORIGINS) || '').split(',').map(s => s.trim()).filter(Boolean);
  return ADMIN_ORIGINS.includes(u.origin) || extra.includes(u.origin);
}
export function corsFor(req, env, admin) {
  if (!admin) return { 'Access-Control-Allow-Origin': '*' };
  const o = req.headers.get('Origin');
  if (!o || !adminOriginOk(o, env)) return { Vary: 'Origin' };
  return { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}

// Worker 입구에서 부른다: 미리 묻기(OPTIONS)는 여기서 답하고, 나머지는 저장소(Durable Object 하나)로 넘긴다
export async function handleApi(req, env) {
  const url = new URL(req.url);
  const admin = url.pathname.startsWith('/api/admin/');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsFor(req, env, true) });
  const o = req.headers.get('Origin');
  if (admin && o && !adminOriginOk(o, env)) {
    return new Response('{"error":"origin"}', { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  if (!env.CONTENT) return new Response('{"error":"nostore"}', { status: 503, headers: Object.assign({ 'Content-Type': 'application/json' }, corsFor(req, env, admin)) });
  return env.CONTENT.get(env.CONTENT.idFromName('main')).fetch(req);
}

export class Content {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.run('CREATE TABLE IF NOT EXISTS docs (k TEXT PRIMARY KEY, j TEXT NOT NULL, at INTEGER, by TEXT)');
    this.run('CREATE TABLE IF NOT EXISTS imgs (id TEXT PRIMARY KEY, map TEXT, school TEXT, mime TEXT, data BLOB, size INTEGER, at INTEGER, by TEXT)');
    this.run('CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, role TEXT, schools TEXT, salt TEXT, hash TEXT, at INTEGER, last INTEGER)');
    this.run('CREATE TABLE IF NOT EXISTS sess (h TEXT PRIMARY KEY, name TEXT, exp INTEGER, at INTEGER)');
    this.run('CREATE TABLE IF NOT EXISTS fails (k TEXT PRIMARY KEY, n INTEGER, first INTEGER, until INTEGER)');
    this.run('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
  }
  rows(s, ...b) { return this.sql.exec(s, ...b).toArray(); }
  row(s, ...b) { return this.rows(s, ...b)[0] || null; }
  run(s, ...b) { this.sql.exec(s, ...b); }
  meta(k) { const r = this.row('SELECT v FROM meta WHERE k = ?', k); return r ? r.v : null; }
  setMeta(k, v) { this.run('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, String(v)); }
  out(H, obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, H) });
  }
  async body(req) {
    const t = await req.text();
    if (t.length > 64000) throw new E(413, 'big');
    try { return JSON.parse(t || '{}'); } catch { throw new E(400, 'json'); }
  }
  ip(req) { return req.headers.get('CF-Connecting-IP') || 'local'; }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, m = req.method;
    const admin = p.startsWith('/api/admin/');
    const H = corsFor(req, this.env, admin);
    try {
      if (!admin) {
        if (p === '/api/content' && m === 'GET') return this.out(H, this.content(mapOf(url), false));
        if (p.startsWith('/api/img/') && m === 'GET') return this.img(H, p.slice('/api/img/'.length));
        throw new E(404, 'notfound');
      }
      const r = p.slice('/api/admin/'.length);
      if (r === 'state' && m === 'GET') return this.out(H, { ready: this.adminCount() > 0, setup: this.setupOpen() });
      if (r === 'setup' && m === 'POST') return this.out(H, await this.setup(req));
      if (r === 'login' && m === 'POST') return this.out(H, await this.login(req));
      const me = await this.auth(req);
      if (!me) throw new E(401, 'auth');
      if (r === 'me' && m === 'GET') return this.out(H, this.who(me));
      if (r === 'logout' && m === 'POST') { this.run('DELETE FROM sess WHERE h = ?', me.h); return this.out(H, { ok: true }); }
      if (r === 'password' && m === 'POST') return this.out(H, await this.password(req, me));
      if (r === 'content' && m === 'GET') return this.out(H, this.content(mapOf(url), true));
      if (r === 'room' && m === 'PUT') return this.out(H, await this.saveRoom(req, url, me));
      if (r === 'school' && m === 'PUT') return this.out(H, await this.saveSchool(req, url, me));
      if (r === 'img' && m === 'POST') return this.out(H, await this.upload(req, url, me));
      if (r === 'img' && m === 'DELETE') return this.out(H, this.delImg(url, me));
      if (r === 'users' && m === 'GET') return this.out(H, this.users(me));
      if (r === 'users' && m === 'POST') return this.out(H, await this.saveUser(req, me));
      if (r === 'users' && m === 'DELETE') return this.out(H, this.delUser(url, me));
      throw new E(404, 'notfound');
    } catch (e) {
      if (e instanceof E) return this.out(H, Object.assign({ error: e.code }, e.extra || {}), e.status);
      return this.out(H, { error: 'server', detail: String((e && e.message) || e).slice(0, 160) }, 500);
    }
  }

  // ── 공개: 내용과 사진 ──
  content(map, admin) {
    const out = { map, v: +(this.meta('v:' + map) || 0), schools: {}, rooms: {} };
    for (const r of this.rows('SELECT k, j, at, by FROM docs WHERE k LIKE ?', map + '/%')) {
      const [, kind, id] = r.k.split('/');
      const d = JSON.parse(r.j);
      if (admin) { d._at = r.at; d._by = r.by; }
      if (kind === 'room') out.rooms[id] = d;
      else if (kind === 'school') out.schools[id] = d;
    }
    return out;
  }
  img(H, id) {
    if (!/^[\w-]{10,40}$/.test(id)) throw new E(404, 'notfound');
    const r = this.row('SELECT mime, data FROM imgs WHERE id = ?', id);
    if (!r) throw new E(404, 'notfound');
    return new Response(r.data, { headers: Object.assign({ 'Content-Type': r.mime, 'Cache-Control': 'public, max-age=31536000, immutable' }, H) });
  }
  bump(map) { this.setMeta('v:' + map, (+(this.meta('v:' + map) || 0)) + 1); }

  // ── 계정·로그인 ──
  adminCount() { return this.row("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").n; }
  setupHash() { const h = String(this.env.ADMIN_SETUP_HASH || '').trim().toLowerCase(); return /^[0-9a-f]{64}$/.test(h) ? h : ''; }
  setupOpen() { const h = this.setupHash(); return !!h && this.meta('setupUsed') !== h; }
  getUser(name) { return this.row('SELECT * FROM users WHERE name = ?', name); }
  who(me) { return { user: me.name, role: me.role, schools: me.schools }; }
  lockCheck(k) {
    const r = this.row('SELECT until FROM fails WHERE k = ?', k);
    if (r && r.until && r.until > Date.now()) throw new E(429, 'locked', { wait: Math.ceil((r.until - Date.now()) / 60000) });
  }
  fail(k) {
    const now = Date.now(), r = this.row('SELECT n, first FROM fails WHERE k = ?', k);
    const n = (!r || now - r.first > LOCK_MS) ? 1 : r.n + 1, first = (!r || now - r.first > LOCK_MS) ? now : r.first;
    this.run('INSERT INTO fails (k, n, first, until) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET n = excluded.n, first = excluded.first, until = excluded.until',
      k, n, first, n >= LOCK_FAILS ? now + LOCK_MS : 0);
  }
  async putUser(name, role, schools, key) {
    const now = Date.now(), u = this.getUser(name);
    if (key) {
      const salt = rand(16), hash = await sha(salt + key);
      if (u) this.run('UPDATE users SET role = ?, schools = ?, salt = ?, hash = ? WHERE name = ?', role, JSON.stringify(schools), salt, hash, name);
      else this.run('INSERT INTO users (name, role, schools, salt, hash, at, last) VALUES (?, ?, ?, ?, ?, ?, 0)', name, role, JSON.stringify(schools), salt, hash, now);
    } else if (u) this.run('UPDATE users SET role = ?, schools = ? WHERE name = ?', role, JSON.stringify(schools), name);
  }
  async issue(name) {
    const token = rand(32), now = Date.now();
    this.run('INSERT INTO sess (h, name, exp, at) VALUES (?, ?, ?, ?)', await sha(token), name, now + SESSION_MS, now);
    this.run('DELETE FROM sess WHERE exp < ?', now);
    // 한 계정의 로그인은 최근 10개까지
    this.run('DELETE FROM sess WHERE name = ? AND h NOT IN (SELECT h FROM sess WHERE name = ? ORDER BY at DESC LIMIT 10)', name, name);
    this.run('UPDATE users SET last = ? WHERE name = ?', now, name);
    const u = this.getUser(name);
    return { token, user: name, role: u.role, schools: JSON.parse(u.schools || '[]'), exp: now + SESSION_MS };
  }
  async setup(req) {
    const hash = this.setupHash();
    if (!hash) throw new E(503, 'nosetup');
    if (this.meta('setupUsed') === hash) throw new E(403, 'used');
    const ipk = 'setup:' + this.ip(req);
    this.lockCheck(ipk);
    const b = await this.body(req);
    const code = String(b.code ?? '').replace(/[\s-]/g, '').toUpperCase();
    if (!same(await sha(code), hash)) { this.fail(ipk); throw new E(403, 'code'); }
    const name = cleanUser(b.user), key = cleanKey(b.key);
    await this.putUser(name, 'admin', [], key);
    this.setMeta('setupUsed', hash);
    this.run('DELETE FROM sess');
    this.run('DELETE FROM fails');
    return this.issue(name);
  }
  async login(req) {
    const b = await this.body(req);
    const name = cleanUser(b.user), key = cleanKey(b.key);
    const ipk = 'ip:' + this.ip(req), uk = 'u:' + name;
    this.lockCheck(ipk);
    this.lockCheck(uk);
    const u = this.getUser(name);
    const ok = !!u && same(await sha(u.salt + key), u.hash);
    if (!ok) { this.fail(ipk); this.fail(uk); throw new E(401, 'login'); }
    this.run('DELETE FROM fails WHERE k = ?', uk);
    return this.issue(name);
  }
  async auth(req) {
    const m = (req.headers.get('Authorization') || '').match(/^Bearer ([\w-]{20,80})$/);
    if (!m) return null;
    const h = await sha(m[1]);
    const s = this.row('SELECT name, exp FROM sess WHERE h = ?', h);
    if (!s) return null;
    if (s.exp < Date.now()) { this.run('DELETE FROM sess WHERE h = ?', h); return null; }
    const u = this.getUser(s.name);
    if (!u) return null;
    return { name: u.name, role: u.role, schools: JSON.parse(u.schools || '[]'), h };
  }
  async password(req, me) {
    const b = await this.body(req);
    const u = this.getUser(me.name), uk = 'u:' + me.name;
    this.lockCheck(uk);
    if (!same(await sha(u.salt + cleanKey(b.key)), u.hash)) { this.fail(uk); throw new E(403, 'password'); }
    await this.putUser(me.name, u.role, JSON.parse(u.schools || '[]'), cleanKey(b.newKey));
    this.run('DELETE FROM sess WHERE name = ? AND h != ?', me.name, me.h);
    return { ok: true };
  }
  adminOnly(me) { if (me.role !== 'admin') throw new E(403, 'perm'); }
  can(me, school) { if (me.role !== 'admin' && !me.schools.includes(school)) throw new E(403, 'perm'); }
  users(me) {
    this.adminOnly(me);
    return { users: this.rows('SELECT name, role, schools, at, last FROM users ORDER BY role, name')
      .map(u => ({ user: u.name, role: u.role, schools: JSON.parse(u.schools || '[]'), at: u.at, last: u.last })) };
  }
  async saveUser(req, me) {
    this.adminOnly(me);
    const b = await this.body(req);
    const name = cleanUser(b.user), role = b.role === 'admin' ? 'admin' : 'editor';
    const schools = role === 'admin' ? [] : [...new Set((Array.isArray(b.schools) ? b.schools : []).map(idOf))].slice(0, 30);
    const u = this.getUser(name);
    if (!u && !b.key) throw new E(400, 'key');
    if (name === me.name && role !== 'admin') throw new E(400, 'self');
    const key = b.key ? cleanKey(b.key) : null;
    await this.putUser(name, role, schools, key);
    if (u && key) this.run('DELETE FROM sess WHERE name = ?', name);   // 비밀번호를 바꾸면 그 계정의 로그인이 풀린다
    return { ok: true, created: !u };
  }
  delUser(url, me) {
    this.adminOnly(me);
    const name = cleanUser(url.searchParams.get('user'));
    if (name === me.name) throw new E(400, 'self');
    this.run('DELETE FROM users WHERE name = ?', name);
    this.run('DELETE FROM sess WHERE name = ?', name);
    return { ok: true };
  }

  // ── 학교·교실 저장, 사진 ──
  async saveSchool(req, url, me) {
    const map = mapOf(url), id = idOf(url.searchParams.get('id'));
    this.can(me, id);
    const doc = cleanSchool(await this.body(req));
    const now = Date.now();
    this.run('INSERT INTO docs (k, j, at, by) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET j = excluded.j, at = excluded.at, by = excluded.by',
      `${map}/school/${id}`, JSON.stringify(doc), now, me.name);
    this.bump(map);
    return { ok: true, doc, at: now };
  }
  async saveRoom(req, url, me) {
    const map = mapOf(url), id = idOf(url.searchParams.get('id'));
    this.can(me, id);
    const doc = cleanRoom(await this.body(req));
    const mine = this.rows('SELECT id, at FROM imgs WHERE map = ? AND school = ?', map, id);
    const have = new Set(mine.map(r => r.id));
    doc.album.photos = doc.album.photos.filter(ph => have.has(ph.id));   // 이 학교에 올린 사진만
    const now = Date.now();
    this.run('INSERT INTO docs (k, j, at, by) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET j = excluded.j, at = excluded.at, by = excluded.by',
      `${map}/room/${id}`, JSON.stringify(doc), now, me.name);
    const keep = new Set(doc.album.photos.map(ph => ph.id));
    for (const r of mine) if (!keep.has(r.id) && now - r.at > ORPHAN_MS) this.run('DELETE FROM imgs WHERE id = ?', r.id);
    this.bump(map);
    return { ok: true, doc, at: now };
  }
  async upload(req, url, me) {
    const map = mapOf(url), school = idOf(url.searchParams.get('school'));
    this.can(me, school);
    if ((+req.headers.get('Content-Length') || 0) > MAX_IMG) throw new E(413, 'big');
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) throw new E(400, 'empty');
    if (buf.byteLength > MAX_IMG) throw new E(413, 'big');
    const mime = sniff(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
    if (!mime) throw new E(415, 'type');
    if (this.row('SELECT COUNT(*) AS n FROM imgs WHERE map = ? AND school = ?', map, school).n >= MAX_IMGS_SCHOOL) throw new E(409, 'many');
    if ((this.row('SELECT COALESCE(SUM(size), 0) AS s FROM imgs').s + buf.byteLength) > MAX_IMG_TOTAL) throw new E(507, 'full');
    const id = rand(12);
    this.run('INSERT INTO imgs (id, map, school, mime, data, size, at, by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, map, school, mime, buf, buf.byteLength, Date.now(), me.name);
    return { ok: true, id, size: buf.byteLength };
  }
  delImg(url, me) {
    const id = String(url.searchParams.get('id') || '');
    const r = /^[\w-]{10,40}$/.test(id) ? this.row('SELECT school FROM imgs WHERE id = ?', id) : null;
    if (!r) return { ok: true };
    this.can(me, r.school);
    this.run('DELETE FROM imgs WHERE id = ?', id);
    return { ok: true };
  }
}
