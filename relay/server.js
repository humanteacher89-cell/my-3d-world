// 프랑스 한글학교 로비 — 온라인 중계 서버 (2026-10-06, XR개발부)
// 하는 일: 같은 방(로비·학교 교실) 사람끼리 위치·방향·동작을 초당 10번 묶어 주고받게 중계한다. 저장하는 것은 없다(DB 없음).
// 어디서나 돈다: Render·Koyeb·Fly·Cloud Run처럼 PORT를 주는 곳이면 0.0.0.0에 열고, 아니면(이 PC 시험) 127.0.0.1:8787.
// 켜기: node server.js   환경 변수: PORT, HOST, MP_ORIGINS(추가로 허용할 페이지 주소, 쉼표 구분, '*'면 모두), MAX_ROOM(방 최대 인원, 기본 50)
'use strict';
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const TICK_MS = 100;                                           // 초당 10번 모아서 보낸다
const MAX_PER_ROOM = Math.max(2, Number(process.env.MAX_ROOM) || 50);
const MAX_TOTAL = 300;
const ORIGINS = ['https://humanteacher89-cell.github.io',
  ...(process.env.MP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)];
const STARTED = Date.now();

function end(res, code, body = '') {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const p = (req.url || '/').split('?')[0];
  if (p === '/health' || p === '/') {
    const rs = {};
    for (const [name, set] of rooms) rs[name] = set.size;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, total: clients.size, rooms: rs, max: MAX_PER_ROOM, uptime: Math.round((Date.now() - STARTED) / 1000) }));
  }
  end(res, 404, 'not found');
});

// ── 중계 ────────────────────────────────────────────────
const clients = new Set();
const rooms = new Map();   // 방 이름 → Set(접속자)
let nextId = 1;

function originOk(req) {
  const o = req.headers.origin;
  if (!o) return true;                                   // 브라우저가 아닌 시험용 봇
  if (ORIGINS.includes('*')) return true;
  let u;
  try { u = new URL(o); } catch { return false; }
  if (u.host === req.headers.host) return true;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)) return true;
  if (u.protocol === 'https:' && /\.(trycloudflare\.com|claudeusercontent\.com|claude\.ai)$/.test(u.hostname)) return true;
  return ORIGINS.includes(u.origin);
}

const cleanName = v => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12);
const cleanRoom = v => String(v ?? '').replace(/[^\w가-힣:-]/g, '').slice(0, 40) || 'lobby';
const r2 = v => Math.round(v * 100) / 100;
// 생김새: 숫자 5개(피부·머리색·옷·바지·머리 모양 번호, 0~15). 없으면 null(받는 쪽이 번호로 정함)
const cleanLook = v => Array.isArray(v) ? v.slice(0, 5).map(n => Math.max(0, Math.min(15, Math.floor(Number(n) || 0)))) : null;

// 상태 = [x, y, z, 방향(라디안), 동작 번호, 표시 비트]. 동작: 0 대기, 1 걷기, 2 달리기, 3 손 흔들기
function cleanState(s) {
  if (!Array.isArray(s) || s.length < 6) return null;
  const n = s.slice(0, 6).map(Number);
  if (!n.every(Number.isFinite)) return null;
  const c = v => Math.max(-10000, Math.min(10000, v));
  return [r2(c(n[0])), r2(c(n[1])), r2(c(n[2])), r2(n[3] % (Math.PI * 2)), n[4] & 7, n[5] & 255];
}

function send(c, msg) {
  if (c.ws.readyState === 1) c.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}
function log(...a) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a); }

function join(c, m) {
  const room = cleanRoom(m.room);
  const set = rooms.get(room) || new Set();
  if (set.size >= MAX_PER_ROOM) {
    send(c, { t: 'full', max: MAX_PER_ROOM });
    c.ws.close(4001, 'room full');
    return;
  }
  clearTimeout(c.helloTimer);
  c.room = room;
  c.name = cleanName(m.name) || `손님${c.id}`;
  c.s = cleanState(m.s) || [0, 0, 0, 0, 0, 0];
  c.look = cleanLook(m.look);
  rooms.set(room, set);
  send(c, { t: 'welcome', id: c.id, name: c.name, room, max: MAX_PER_ROOM, peers: [...set].map(p => ({ id: p.id, name: p.name, s: p.s, look: p.look })) });
  const joinMsg = JSON.stringify({ t: 'join', id: c.id, name: c.name, s: c.s, look: c.look });
  for (const p of set) send(p, joinMsg);
  set.add(c);
  log(`입장 ${room} #${c.id} (방 ${set.size}명, 전체 ${clients.size}명)`);
}

function leave(c) {
  if (!clients.delete(c)) return;
  clearTimeout(c.helloTimer);
  if (!c.room) return;
  const set = rooms.get(c.room);
  if (!set) return;
  set.delete(c);
  const msg = JSON.stringify({ t: 'leave', id: c.id });
  for (const p of set) send(p, msg);
  if (!set.size) rooms.delete(c.room);
  log(`퇴장 ${c.room} #${c.id} (방 ${set.size}명, 전체 ${clients.size}명)`);
}

// 초당 메시지 수 제한: 40개 넘으면 버리고, 200개 넘으면 끊는다
function rateOk(c) {
  const now = Date.now();
  if (now - c.winStart > 1000) { c.winStart = now; c.count = 0; }
  c.count++;
  if (c.count > 200) { c.ws.terminate(); return false; }
  return c.count <= 40;
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });

server.on('upgrade', (req, socket, head) => {
  const p = (req.url || '').split('?')[0];
  if (p !== '/ws' || !originOk(req)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
  if (clients.size >= MAX_TOTAL) { socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n'); socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => {
    const c = { ws, id: nextId++, room: null, name: '', s: null, dirty: false, alive: true, count: 0, winStart: Date.now() };
    clients.add(c);
    c.helloTimer = setTimeout(() => { if (!c.room) ws.terminate(); }, 10000);   // 10초 안에 인사가 없으면 끊는다
    ws.on('pong', () => { c.alive = true; });
    ws.on('message', (data, isBinary) => {
      if (isBinary || !rateOk(c)) return;
      let m;
      try { m = JSON.parse(data); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (!c.room) { if (m.t === 'hello') join(c, m); return; }
      if (m.t === 's') {
        const s = cleanState(m.s);
        if (s) { c.s = s; c.dirty = true; }
      }
    });
    ws.on('close', () => leave(c));
    ws.on('error', () => {});
  });
});

// 바뀐 상태만 모아 방 전체에 보낸다. 느린 접속자(보낼 데이터가 256KB 넘게 밀림)는 이번 묶음을 건너뛴다
setInterval(() => {
  for (const set of rooms.values()) {
    const ps = [];
    for (const c of set) if (c.dirty) { ps.push([c.id, ...c.s]); c.dirty = false; }
    if (!ps.length) continue;
    const msg = JSON.stringify({ t: 'snap', ps });
    for (const c of set) if (c.ws.bufferedAmount < 262144) send(c, msg);
  }
}, TICK_MS);

// 15초마다 살아 있는지 확인, 응답이 없으면(15~30초) 정리한다
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { c.ws.terminate(); continue; }
    c.alive = false;
    try { c.ws.ping(); } catch { /* 이미 닫힘 */ }
  }
}, 15000);

server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`포트 ${PORT}을 이미 쓰고 있습니다.`);
  else console.error(e);
  process.exit(1);
});
process.on('SIGTERM', () => { server.close(); process.exit(0); });

server.listen(PORT, HOST, () => {
  log(`중계 서버 시작 http://${HOST}:${PORT}  (방 최대 ${MAX_PER_ROOM}명)`);
});
