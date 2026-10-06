// 프랑스 한글학교 로비 — Cloudflare Workers + Durable Objects 중계 서버 (2026-10-06, XR개발부)
// 하는 일: 방(로비 'fr:lobby', 교실 'fr:<학교 id>')마다 Durable Object 하나가 같은 방 사람들의 위치·방향·동작을 초당 10번 묶어 중계한다. 저장하는 것은 없다.
// 주소: /health (상태), /ws?room=<방 이름> (WebSocket). 메시지 형식은 relay/server.js(Node 판)와 같다.
// 무료 플랜 한도: 하루 요청 100,000개(받는 WebSocket 메시지 20개 = 요청 1개). 보내는 메시지는 세지 않는다. 00:00 UTC(한국 09:00) 초기화.
// 2026-10-06: /api/* = 관리자 페이지용 내용 저장소(src/content.js, Durable Object 'Content' 하나에 학교 링크·교실 글·사진·계정).
'use strict';
import { handleApi, Content } from './content.js';
export { Content };

const MAX_PER_ROOM = 70;   // 동시접속 60명 예정(2026-10-06 휴먼쌤) + 여유
const TICK_MS = 100;
const ORIGINS = ['https://humanteacher89-cell.github.io'];

const cleanName = v => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12);
const cleanRoom = v => String(v ?? '').replace(/[^\w가-힣:-]/g, '').slice(0, 40) || 'lobby';
const r2 = v => Math.round(v * 100) / 100;
const cleanLook = v => Array.isArray(v) ? v.slice(0, 5).map(n => Math.max(0, Math.min(15, Math.floor(Number(n) || 0)))) : null;
function cleanState(s) {
  if (!Array.isArray(s) || s.length < 6) return null;
  const n = s.slice(0, 6).map(Number);
  if (!n.every(Number.isFinite)) return null;
  const c = v => Math.max(-10000, Math.min(10000, v));
  return [r2(c(n[0])), r2(c(n[1])), r2(c(n[2])), r2(n[3] % (Math.PI * 2)), n[4] & 7, n[5] & 255];
}
function originOk(req, env) {
  const o = req.headers.get('Origin');
  if (!o) return true;                                   // 브라우저가 아닌 시험용 봇
  const extra = String((env && env.MP_ORIGINS) || '').split(',').map(s => s.trim()).filter(Boolean);
  if (extra.includes('*')) return true;
  let u;
  try { u = new URL(o); } catch { return false; }
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)) return true;
  if (u.protocol === 'https:' && /\.(trycloudflare\.com|claudeusercontent\.com|claude\.ai|workers\.dev)$/.test(u.hostname)) return true;
  return ORIGINS.includes(u.origin) || extra.includes(u.origin);
}
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
const att = ws => { try { return ws.deserializeAttachment() || {}; } catch { return {}; } };
function safeSend(ws, msg) { try { ws.send(msg); } catch { /* 닫힌 소켓 */ } }

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, host: 'cloudflare', max: MAX_PER_ROOM }), { headers: JSON_HEADERS });
    }
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      if (!originOk(req, env)) return new Response('forbidden', { status: 403 });
      const room = cleanRoom(url.searchParams.get('room'));
      const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
      return stub.fetch(req);
    }
    if (url.pathname.startsWith('/api/')) return handleApi(req, env);
    return new Response('not found', { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};

// 방 하나 = Durable Object 하나. 소켓마다 붙인 attachment({id, name, s, look, t})는 객체가 잠들었다 깨어나도 남는다.
export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.timer = null;
    this.dirty = new Set();
    this.counts = new Map();
    this.nextId = 1;
    for (const ws of this.ctx.getWebSockets()) { const a = att(ws); if (a.id && a.id >= this.nextId) this.nextId = a.id + 1; }
    this.ensureTick();
  }

  async fetch(req) {
    const url = new URL(req.url);
    const room = cleanRoom(url.searchParams.get('room'));
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: 0, room, name: '', s: null, look: null, t: Date.now() });
    if (this.ctx.getWebSockets().length > MAX_PER_ROOM) {
      safeSend(server, JSON.stringify({ t: 'full', max: MAX_PER_ROOM }));
      try { server.close(4001, 'room full'); } catch { /* 이미 닫힘 */ }
    }
    this.ensureTick();
    return new Response(null, { status: 101, webSocket: client });
  }

  ensureTick() {
    if (this.timer || !this.ctx.getWebSockets().length) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  // 초당 메시지 수 제한: 40개 넘으면 버리고, 200개 넘으면 끊는다
  rateOk(ws) {
    const now = Date.now();
    let c = this.counts.get(ws);
    if (!c || now - c.win > 1000) { c = { win: now, n: 0 }; this.counts.set(ws, c); }
    c.n++;
    if (c.n > 200) { try { ws.close(4003, 'too many messages'); } catch { /* 이미 닫힘 */ } return false; }
    return c.n <= 40;
  }

  webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > 2048 || !this.rateOk(ws)) return;
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m !== 'object') return;
    const a = att(ws);
    if (!a.id) { if (m.t === 'hello') this.join(ws, a, m); return; }
    if (m.t === 's') {
      const s = cleanState(m.s);
      if (s) { a.s = s; ws.serializeAttachment(a); this.dirty.add(ws); }
    }
  }

  join(ws, a, m) {
    const peers = [];
    for (const o of this.ctx.getWebSockets()) {
      if (o === ws) continue;
      const b = att(o);
      if (b.id) peers.push({ id: b.id, name: b.name, s: b.s, look: b.look });
    }
    if (peers.length >= MAX_PER_ROOM) {
      safeSend(ws, JSON.stringify({ t: 'full', max: MAX_PER_ROOM }));
      try { ws.close(4001, 'room full'); } catch { /* 이미 닫힘 */ }
      return;
    }
    a.id = this.nextId++;
    a.name = cleanName(m.name) || `손님${a.id}`;
    a.s = cleanState(m.s) || [0, 0, 0, 0, 0, 0];
    a.look = cleanLook(m.look);
    ws.serializeAttachment(a);
    safeSend(ws, JSON.stringify({ t: 'welcome', id: a.id, name: a.name, room: a.room, max: MAX_PER_ROOM, peers }));
    const joinMsg = JSON.stringify({ t: 'join', id: a.id, name: a.name, s: a.s, look: a.look });
    for (const o of this.ctx.getWebSockets()) if (o !== ws && att(o).id) safeSend(o, joinMsg);
  }

  leave(ws) {
    this.dirty.delete(ws);
    this.counts.delete(ws);
    const a = att(ws);
    if (!a.id) return;
    const msg = JSON.stringify({ t: 'leave', id: a.id });
    for (const o of this.ctx.getWebSockets()) if (o !== ws && att(o).id) safeSend(o, msg);
  }

  // 브라우저가 먼저 닫으면 서버도 close를 불러 줘야 닫기 절차가 끝난다(안 그러면 브라우저의 onclose가 한참 뒤에야 온다)
  webSocketClose(ws, code, reason) { this.leave(ws); try { ws.close(code === 1005 || code === 1006 ? 1000 : code, String(reason || '').slice(0, 100)); } catch { /* 이미 닫힘 */ } }
  webSocketError(ws) { this.leave(ws); try { ws.close(1011, 'error'); } catch { /* 이미 닫힘 */ } }

  // 바뀐 상태만 모아 방 전체에 보낸다. 10초 안에 인사(hello)가 없는 소켓은 끊는다. 아무도 없으면 타이머를 멈춰 객체가 잠들 수 있게 한다
  tick() {
    const socks = this.ctx.getWebSockets();
    if (!socks.length) { clearInterval(this.timer); this.timer = null; this.dirty.clear(); this.counts.clear(); return; }
    const now = Date.now(), ps = [];
    for (const ws of socks) {
      const a = att(ws);
      if (!a.id) { if (now - (a.t || now) > 10000) { try { ws.close(4002, 'no hello'); } catch { /* 이미 닫힘 */ } } continue; }
      if (this.dirty.has(ws)) ps.push([a.id, ...a.s]);
    }
    this.dirty.clear();
    if (!ps.length) return;
    const msg = JSON.stringify({ t: 'snap', ps });
    for (const ws of socks) if (att(ws).id) safeSend(ws, msg);
  }
}
