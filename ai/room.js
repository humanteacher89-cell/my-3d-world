// 프랑스 한글학교 로비 — 학교 공간(교실) v0.1 (2026-10-06, XR개발부)
// 로비 엔진(lobby.js)이 core를 넘겨 주면 교실 세계를 만든다. 내용(교장 인사·회화·책·사진첩·TV)은 lobby.config.js의 rooms[학교 id].
// 교실 = 북쪽 벽(칠판)·서쪽 벽(창문)·동쪽 벽(포스터), 책상 9개, 정면 교장 NPC, 책·사진첩·TV 구역. 모든 글은 HTML 팝업으로 보여 준다.
window.LOBBY_ROOM = function (core) {
  'use strict';
  const { THREE, LAND_Y, FONT_D, FONT_B, $, fill, clamp, canvasTex, colored, merge, pill, fitFont, signSprite, addChar, removeChar,
    showCard, hideCard, showToast, T, IS_TOUCH, setPaused } = core;
  const Y = LAND_Y;
  const W = 18, D = 13;                 // 교실 가로·세로(칸). 캐릭터 키는 약 1.6칸
  const HALF_W = W / 2, HALF_D = D / 2;
  const WALL_H = 3.2;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  const R = { built: null, school: null, cfg: null, world: null, chars: [], spots: [], cur: null, open: false };
  /* 관 내부 = kind → [짓기, 매 화면]. 관마다 자기 함수 묶음 바로 뒤에서 HALLS.<kind> = [...] 한 줄로 붙인다 */
  const HALLS = {};
  const STAMP_KEY = (window.LOBBY_CONFIG && window.LOBBY_CONFIG.stampKey) || 'xrStamps';   // 판마다 도장 기록을 따로

  function lam(color) { return new THREE.MeshLambertMaterial({ color }); }
  function box(w, h, d, color, x, y, z, scene) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // ── 벽에 거는 그림들(캔버스) ──
  function boardTex(cfg) {
    return canvasTex(1024, 320, (g, w, h) => {
      g.fillStyle = cfg.theme.board || '#2F5D50'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
      for (let i = 0; i < 30; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF';
      fitFont(g, cfg.boardTitle || '', 'normal', 92, FONT_D, w - 120);
      g.fillText(cfg.boardTitle || '', w / 2, 112);
      g.fillStyle = '#FFE9A8';
      fitFont(g, cfg.boardLine || '', '700', 54, FONT_B, w - 160);
      g.fillText(cfg.boardLine || '', w / 2, 222);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(90, 272, w - 180, 4);
    });
  }
  // 창밖 풍경 종류(theme.view.kind): volcano·city·sea·mountain·river·vineyard·fields. 색: far·near·water·accent(옛 hills·peak도 받음)
  function drawView(g, w, h, v) {
    const far = v.far || (v.hills && v.hills[0]) || '#8FB8C9', near = v.near || (v.hills && v.hills[1]) || '#6FA86B';
    const water = v.water || '#6FB7D6', acc = v.accent || '#E0483E';
    const P = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const hill = (y0, amp, c, ph) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 - Math.sin(x / 90 + ph) * amp); g.lineTo(w, h); g.closePath(); g.fill(); };
    const k = v.kind || 'volcano';
    if (k === 'volcano') {
      g.fillStyle = v.peak || far; g.beginPath(); g.moveTo(90, 250); g.quadraticCurveTo(256, 60, 420, 250); g.closePath(); g.fill();
      g.fillStyle = v.peakTop || '#8FB08A'; g.beginPath(); g.moveTo(205, 150); g.quadraticCurveTo(256, 92, 307, 150); g.closePath(); g.fill();
      hill(265, 22, far, 0.3); hill(300, 12, near, 1.7);
    } else if (k === 'city') {
      // 먼 지붕들(회청색 망사르드 지붕 + 굴뚝)
      for (let i = 0, x = 0; x < w; i++) { const bw = 54 + (i * 37) % 30, bh = 90 + (i * 53) % 60; g.fillStyle = far; g.fillRect(x, h - bh - 40, bw, bh + 40); P([x - 4, h - bh - 40, x + bw + 4, h - bh - 40, x + bw - 10, h - bh - 70, x + 10, h - bh - 70], '#7D8AA3'); g.fillStyle = acc; g.fillRect(x + bw - 22, h - bh - 86, 8, 18); g.fillStyle = 'rgba(255,255,255,0.75)'; for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.fillRect(x + 10 + c * 22, h - bh - 26 + r * 30, 12, 18); x += bw + 6; }
      hill(300, 6, near, 0);
      for (let x = 30; x < w; x += 90) { g.fillStyle = '#6D8F5A'; g.beginPath(); g.arc(x, 284, 26, 0, Math.PI * 2); g.fill(); }
    } else if (k === 'sea') {
      g.fillStyle = water; g.fillRect(0, 170, w, h - 170);
      g.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 9; i++) g.fillRect(40 + (i * 131) % 420, 190 + (i * 23) % 70, 34, 3);
      hill(178, 10, far, 2.0);
      [[150, 215], [330, 240]].forEach(([x, y]) => { P([x - 26, y, x + 26, y, x + 18, y + 10, x - 18, y + 10], '#FFFFFF'); P([x, y - 4, x, y - 46, x + 22, y - 4], acc); });
      g.fillStyle = near; g.beginPath(); g.moveTo(0, h); g.lineTo(0, 270); g.quadraticCurveTo(120, 250, 210, 300); g.lineTo(210, h); g.closePath(); g.fill();
    } else if (k === 'mountain') {
      P([0, 250, 110, 90, 230, 250], far); P([150, 250, 300, 60, 450, 250], far); P([360, 250, 470, 120, 600, 250], far);
      P([110, 90, 88, 130, 132, 130], '#FFFFFF'); P([300, 60, 270, 112, 330, 112], '#FFFFFF'); P([470, 120, 452, 150, 488, 150], '#FFFFFF');
      hill(270, 18, near, 0.8);
    } else if (k === 'river') {
      hill(200, 14, far, 0.5);
      for (let x = 20; x < w; x += 70) { g.fillStyle = '#F4E9D8'; g.fillRect(x, 168, 40, 32); P([x - 4, 168, x + 44, 168, x + 20, 148], acc); }
      g.fillStyle = near; g.fillRect(0, 200, w, h - 200);
      g.fillStyle = water; g.beginPath(); g.moveTo(0, 240); g.quadraticCurveTo(256, 220, w, 250); g.lineTo(w, 285); g.quadraticCurveTo(256, 262, 0, 290); g.closePath(); g.fill();
      g.strokeStyle = '#D8CBB4'; g.lineWidth = 9; g.beginPath(); g.moveTo(150, 236); g.lineTo(380, 236); g.stroke();
      g.fillStyle = '#D8CBB4'; [[180], [250], [320]].forEach(([x]) => { g.beginPath(); g.arc(x + 15, 262, 26, Math.PI, 0); g.lineTo(x + 41, 236); g.lineTo(x - 11, 236); g.closePath(); g.fill(); });
      g.fillStyle = water; [[180], [250], [320]].forEach(([x]) => { g.beginPath(); g.arc(x + 15, 266, 18, Math.PI, 0); g.fill(); });
    } else if (k === 'vineyard') {
      hill(190, 20, far, 0.4); hill(230, 16, near, 1.6);
      g.strokeStyle = acc; g.lineWidth = 5; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-40 + i * 70, h); g.quadraticCurveTo(80 + i * 50, 250, 140 + i * 45, 226); g.stroke(); }
    } else {   // fields
      hill(200, 8, far, 1.0);
      const cols = [near, '#E7D18A', '#9CC28B', '#CFE3A9'];
      for (let i = 0; i < 4; i++) P([0, 210 + i * 28, w, 205 + i * 30, w, 235 + i * 30, 0, 238 + i * 28], cols[i]);
      g.fillStyle = acc; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 61) % w, 268 + (i * 17) % 40, 3, 0, Math.PI * 2); g.fill(); }
      [[90, 200], [400, 196]].forEach(([x, y]) => { g.fillStyle = '#6D5A44'; g.fillRect(x - 3, y - 8, 6, 18); g.fillStyle = '#5F944F'; g.beginPath(); g.arc(x, y - 18, 16, 0, Math.PI * 2); g.fill(); });
    }
  }
  function viewTex(v) {
    return canvasTex(512, 320, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, v.sky[0]); sky.addColorStop(1, v.sky[1]);
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      [[70, 60, 90], [330, 40, 110], [200, 100, 70]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2); g.fill(); });
      drawView(g, w, h, v);
      // 창틀
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 22; g.strokeRect(11, 11, w - 22, h - 22);
      g.lineWidth = 12; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    });
  }
  // 포스터 그림 종류(theme.poster.kind). 그리는 칸은 가로 40~344, 세로 160~430, 가운데 x 192. c = 주 색
  function drawPoster(g, kind, c) {
    const P = (pts, col) => { g.fillStyle = col || c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const R = (x, y, ww, hh, col) => { g.fillStyle = col || c; g.fillRect(x, y, ww, hh); };
    const O = (x, y, r, col) => { g.fillStyle = col || c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const BG = '#FFFDF7';
    switch (kind) {
      case 'eiffel':
        P([120, 420, 172, 230, 212, 230, 264, 420]); P([150, 420, 192, 330, 234, 420], BG);
        P([172, 230, 182, 165, 202, 165, 212, 230]); R(186, 150, 12, 16); R(110, 300, 164, 12); R(150, 228, 84, 10); break;
      case 'opera':
        R(70, 300, 244, 120); P([60, 300, 324, 300, 192, 262]); g.fillStyle = c; g.beginPath(); g.arc(192, 262, 52, Math.PI, 0); g.fill();
        O(192, 204, 8); for (let i = 0; i < 7; i++) R(84 + i * 34, 320, 14, 90, BG); break;
      case 'belfry':
        R(160, 210, 64, 210); P([150, 212, 234, 212, 192, 150]); R(118, 330, 148, 90);
        O(192, 250, 20, BG); O(192, 250, 4); g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.moveTo(192, 250); g.lineTo(192, 236); g.moveTo(192, 250); g.lineTo(203, 255); g.stroke(); break;
      case 'bridge':
        R(50, 300, 284, 24); for (let i = 0; i < 4; i++) { const x = 50 + i * 71; R(x, 324, 14, 70); g.fillStyle = BG; g.beginPath(); g.arc(x + 42, 394, 28, Math.PI, 0); g.fill(); }
        R(50, 394, 284, 30, '#8DC3DA'); break;
      case 'lighthouse':
        P([162, 410, 176, 210, 208, 210, 222, 410]); R(170, 260, 44, 22, '#E0483E'); R(166, 330, 52, 22, '#E0483E');
        R(170, 180, 44, 30); P([164, 182, 220, 182, 192, 150]); O(192, 196, 9, '#F2B544');
        P([212, 190, 330, 160, 330, 220], 'rgba(242,181,68,0.35)'); R(60, 410, 264, 20, '#8DC3DA'); break;
      case 'plane':
        P([70, 300, 300, 286, 330, 300, 300, 314]); P([170, 296, 230, 296, 150, 380, 128, 380]); P([170, 304, 230, 304, 150, 222, 128, 222]);
        P([82, 300, 104, 300, 82, 256, 66, 256]); for (let i = 0; i < 6; i++) O(140 + i * 26, 300, 4, BG); break;
      case 'castle':
        R(110, 300, 164, 120); [[96, 260], [288, 260], [192, 230]].forEach(([x, y]) => { R(x - 22, y, 44, 420 - y); P([x - 28, y, x + 28, y, x, y - 60]); });
        g.fillStyle = BG; g.beginPath(); g.arc(192, 420, 22, Math.PI, 0); g.fill(); for (let i = 0; i < 3; i++) R(130 + i * 50, 330, 14, 24, BG); break;
      case 'car':
        P([60, 360, 90, 320, 200, 300, 260, 320, 324, 336, 324, 372, 60, 372]); P([150, 316, 196, 302, 236, 318], BG);
        [[110, 376], [276, 376]].forEach(([x, y]) => { O(x, y, 28, '#1E2B4A'); O(x, y, 11, BG); }); R(70, 334, 50, 8, '#F2B544');
        g.fillStyle = '#1E2B4A'; for (let i = 0; i < 8; i++) g.fillRect(60 + i * 34, 410, 17, 12); break;
      case 'basilica':
        g.fillStyle = '#9CC28B'; g.beginPath(); g.moveTo(40, 430); g.quadraticCurveTo(192, 300, 344, 430); g.closePath(); g.fill();
        R(140, 300, 104, 60); R(178, 216, 28, 90); P([172, 218, 212, 218, 192, 190]); O(192, 182, 9, '#F2B544'); R(188, 168, 8, 14, '#F2B544');
        g.fillStyle = BG; g.beginPath(); g.arc(160, 360, 12, Math.PI, 0); g.arc(224, 360, 12, Math.PI, 0); g.fill(); break;
      case 'house':
        R(110, 250, 164, 170, '#F6E7C8'); P([96, 252, 288, 252, 192, 170]); g.strokeStyle = c; g.lineWidth = 9;
        g.strokeRect(110, 250, 164, 170); g.beginPath(); g.moveTo(110, 330); g.lineTo(274, 330); g.moveTo(192, 250); g.lineTo(192, 420); g.moveTo(110, 250); g.lineTo(192, 330); g.moveTo(274, 250); g.lineTo(192, 330); g.stroke();
        R(130, 350, 40, 46, '#8DC3DA'); R(214, 350, 40, 46, '#8DC3DA'); O(150, 400, 7, '#E0483E'); O(234, 400, 7, '#E0483E'); break;
      case 'fountain':
        R(90, 380, 204, 40); g.fillStyle = c; g.beginPath(); g.ellipse(192, 380, 102, 16, 0, 0, Math.PI * 2); g.fill();
        R(182, 270, 20, 110); g.beginPath(); g.ellipse(192, 300, 64, 12, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(192, 250, 34, 9, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#6FB7D6'; g.lineWidth = 5; [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(192, 240); g.quadraticCurveTo(192 + s * 60, 200, 192 + s * 80, 300); g.stroke(); g.beginPath(); g.moveTo(192 + s * 50, 302); g.quadraticCurveTo(192 + s * 100, 300, 192 + s * 104, 376); g.stroke(); }); break;
      case 'cablecar':
        P([40, 430, 150, 250, 260, 430], '#A9A09A'); P([150, 430, 260, 220, 344, 430], '#9D958F'); P([150, 250, 135, 278, 165, 278], '#FFFFFF'); P([260, 220, 246, 246, 274, 246], '#FFFFFF');
        g.strokeStyle = '#1E2B4A'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 190); g.lineTo(344, 300); g.stroke();
        [[120, 219], [230, 259]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); O(x, y + 44, 24); O(x, y + 40, 12, '#CDEBF6'); }); break;
      case 'grapes':
        for (let r = 0; r < 5; r++) for (let i = 0; i <= 4 - r; i++) O(192 - (4 - r) * 18 + i * 36, 250 + r * 34, 19);
        P([192, 240, 160, 190, 230, 186], '#5F944F'); R(188, 210, 8, 36, '#6D5A44'); break;
      case 'elephant':
        g.fillStyle = c; g.beginPath(); g.ellipse(200, 300, 100, 62, 0, 0, Math.PI * 2); g.fill(); O(108, 280, 46);
        g.beginPath(); g.ellipse(124, 270, 30, 40, -0.3, 0, Math.PI * 2); g.fillStyle = '#4A5874'; g.fill();
        g.strokeStyle = c; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(74, 300); g.quadraticCurveTo(52, 360, 76, 400); g.stroke(); g.lineCap = 'butt';
        [130, 170, 230, 270].forEach(x => R(x - 12, 340, 26, 80)); O(98, 270, 5, BG); break;
      default:
        O(192, 290, 80);
    }
  }
  function posterTex(p) {
    return canvasTex(384, 512, (g, w, h) => {
      g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#F1E6D0'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
      if (p.kind === 'cathedral') {
        // 검은 화산암 성당 실루엣: 첨탑 두 개
        g.fillStyle = p.color || '#2B2B2F';
        g.fillRect(82, 300, 220, 120);
        [[110, 150], [274, 150]].forEach(([x, top]) => { g.fillRect(x - 24, top + 70, 48, 190); g.beginPath(); g.moveTo(x - 30, top + 70); g.lineTo(x, top); g.lineTo(x + 30, top + 70); g.closePath(); g.fill(); });
        g.beginPath(); g.moveTo(140, 300); g.lineTo(192, 230); g.lineTo(244, 300); g.closePath(); g.fill();
        g.fillStyle = '#FFFDF7'; g.beginPath(); g.arc(192, 340, 22, 0, Math.PI * 2); g.fill();
        g.fillStyle = p.color || '#2B2B2F'; g.beginPath(); g.arc(192, 340, 14, 0, Math.PI * 2); g.fill();
      } else drawPoster(g, p.kind, p.color || '#2B2B2F');
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1E2B4A';
      fitFont(g, p.title, 'normal', 56, FONT_D, w - 40); g.fillText(p.title, w / 2, 70);
      g.fillStyle = '#4A5874'; fitFont(g, p.sub, '700', 24, FONT_B, w - 40); g.fillText(p.sub, w / 2, 120);
      g.fillStyle = '#4A5874'; fitFont(g, p.foot || 'France', '700', 22, FONT_B, w - 40); g.fillText(p.foot || 'France', w / 2, 460);
    });
  }
  function flagTex(kind) {
    return canvasTex(192, 128, (g, w, h) => {
      if (kind === 'fr') { ['#2A4D9B', '#FFFFFF', '#E0483E'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 3, 0, w / 3 + 1, h); }); }
      else {
        g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#E0483E'; g.fillRect(0, 0, w, 12); g.fillStyle = '#2A4D9B'; g.fillRect(0, h - 12, w, 12);
        g.fillStyle = '#1E2B4A'; g.font = `80px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.flag, w / 2, h / 2 + 4);
      }
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    });
  }
  function floorTex(colors) {
    const t = canvasTex(256, 256, (g, w, h) => {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = colors[i % colors.length]; g.fillRect(0, i * 64, w, 64);
        g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, i * 64 + 62, w, 2);
        g.fillRect(((i * 97) % 200) + 20, i * 64, 2, 64);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(W / 2.4, D / 2.4);
    return t;
  }
  function rugTex(color) {
    return canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 10; g.strokeRect(18, 18, w - 36, h - 36);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `96px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('ㄱ ㄴ ㄷ', w / 2, h / 2 + 6);
    });
  }
  function screenTex(title) {
    return canvasTex(512, 288, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1C2740'); gr.addColorStop(1, '#2E4A7A');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(w / 2, h / 2 - 10, 46, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1C2740'; g.beginPath(); g.moveTo(w / 2 - 14, h / 2 - 36); g.lineTo(w / 2 + 26, h / 2 - 10); g.lineTo(w / 2 - 14, h / 2 + 16); g.closePath(); g.fill();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, title, '700', 30, FONT_B, w - 60); g.fillText(title, w / 2, h - 44);
    });
  }
  function albumTex() {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#7A4E3A'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#F6EFE2'; g.fillRect(34, 34, w - 68, h - 68);
      g.fillStyle = '#B9D7E8'; g.fillRect(52, 52, w - 104, h - 140);
      g.fillStyle = '#1E2B4A'; g.font = `44px ${FONT_D}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.albumSign, w / 2, h - 60);
    });
  }
  // 문 앞 발판(파란 깔개에 '로비로' + 문 쪽을 가리키는 화살표). 카메라가 남쪽에서 보므로 글 위쪽이 북쪽
  function doorMatTex() {
    return canvasTex(512, 224, (g, w, h) => {
      const rr = (x, y, ww, hh, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, ww, hh, r); else g.rect(x, y, ww, hh); };
      g.fillStyle = 'rgba(42,77,155,0.93)'; rr(8, 8, w - 16, h - 16, 44); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(28, 28, w - 56, h - 56, 30); g.stroke();
      const label = T.exitSign || '로비로';
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, label, 'normal', 86, FONT_D, w - 230); g.fillText(label, w / 2 - 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(w - 112, h / 2 - 44); g.lineTo(w - 112, h / 2 + 34); g.stroke();
      g.beginPath(); g.moveTo(w - 146, h / 2 + 6); g.lineTo(w - 112, h / 2 + 42); g.lineTo(w - 78, h / 2 + 6); g.stroke();
    });
  }
  function bookTex(title) {
    return canvasTex(512, 320, (g, w, h) => {
      g.fillStyle = '#FFF9EC'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(w / 2 - 6, 0, 12, h);
      g.strokeStyle = 'rgba(30,43,74,0.18)'; g.lineWidth = 3;
      for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(30, 70 + i * 32); g.lineTo(w / 2 - 30, 70 + i * 32); g.moveTo(w / 2 + 30, 70 + i * 32); g.lineTo(w - 30, 70 + i * 32); g.stroke(); }
      g.fillStyle = '#1E2B4A'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, title, 'normal', 48, FONT_D, w / 2 - 60); g.fillText(title, w / 4, 40);
    });
  }

  // ── 교실 짓기 ──
  function build(school, cfg) {
    const scene = new THREE.Scene();
    const th = cfg.theme || {};
    scene.background = new THREE.Color(th.sky || '#D7ECF7');
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9bfae, 0.62));
    const sun = new THREE.DirectionalLight(0xffffff, 0.48);
    sun.position.set(-14, 30, 18);
    scene.add(sun);
    const coll = [], signs = [], hit = [];

    // 바닥·러그
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: floorTex(th.floor || ['#D9B583']) }));
    floor.position.set(0, Y, 0);
    scene.add(floor);
    box(W + 1.2, 0.5, D + 1.2, '#C8B08C', 0, Y - 0.27, 0, scene);
    // 문 밖 복도(문 쪽으로 카메라가 내려가도 빈 하늘이 안 보이게)
    const hall = new THREE.Mesh(new THREE.PlaneGeometry(W + 7, 8).rotateX(-Math.PI / 2), lam('#E6D7BC'));
    hall.position.set(0, Y - 0.05, HALF_D + 0.6 + 4);
    scene.add(hall);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: rugTex(th.rug || '#9FC7A3') }));
    rug.position.set(0, Y + 0.012, -3.2);
    rug.renderOrder = 1;
    scene.add(rug);

    // 벽: 북(칠판)·서(창문)·동(포스터), 남쪽은 낮은 턱만(카메라가 남쪽에서 본다)
    const wallC = th.wall || '#FBF3E2', wainC = th.wainscot || '#D9C4A0';
    box(W + 0.6, WALL_H, 0.3, wallC, 0, Y + WALL_H / 2, -HALF_D - 0.15, scene);
    box(W + 0.6, 0.9, 0.34, wainC, 0, Y + 0.45, -HALF_D - 0.15, scene);
    box(0.3, WALL_H, D + 0.6, wallC, -HALF_W - 0.15, Y + WALL_H / 2, 0, scene);
    box(0.34, 0.9, D + 0.6, wainC, -HALF_W - 0.15, Y + 0.45, 0, scene);
    box(0.3, WALL_H, D + 0.6, wallC, HALF_W + 0.15, Y + WALL_H / 2, 0, scene);
    box(0.34, 0.9, D + 0.6, wainC, HALF_W + 0.15, Y + 0.45, 0, scene);
    box(W + 0.6, 0.35, 0.3, wainC, 0, Y + 0.175, HALF_D + 0.15, scene);
    // 문(남쪽 가운데는 비워 두고 양옆에 문틀 기둥)
    box(0.25, 1.9, 0.3, '#8C6A4F', -1.5, Y + 0.95, HALF_D + 0.15, scene);
    box(0.25, 1.9, 0.3, '#8C6A4F', 1.5, Y + 0.95, HALF_D + 0.15, scene);

    // 칠판 + 국기
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.3), new THREE.MeshBasicMaterial({ map: boardTex(cfg) }));
    board.position.set(0, Y + 1.95, -HALF_D + 0.02);
    scene.add(board);
    box(7.7, 2.6, 0.08, '#8C6A4F', 0, Y + 1.95, -HALF_D - 0.03, scene);
    const flagK = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.73), new THREE.MeshBasicMaterial({ map: flagTex('kr') }));
    flagK.position.set(-5.6, Y + 2.5, -HALF_D + 0.02); scene.add(flagK);
    const flagF = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.73), new THREE.MeshBasicMaterial({ map: flagTex('fr') }));
    flagF.position.set(5.6, Y + 2.5, -HALF_D + 0.02); scene.add(flagF);

    // 서쪽 창문 둘(창밖은 지역 풍경)
    const vt = viewTex(th.view || { sky: ['#9CD1F0', '#E8F4FB'], hills: ['#6FA86B', '#4F8A57'], peak: '#577E5B', peakTop: '#8FB08A' });
    [-2.6, 2.2].forEach(z => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.8), new THREE.MeshBasicMaterial({ map: vt }));
      win.rotation.y = Math.PI / 2;
      win.position.set(-HALF_W + 0.02, Y + 1.9, z);
      scene.add(win);
    });
    // 동쪽 벽 포스터
    if (th.poster) {
      const po = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), new THREE.MeshBasicMaterial({ map: posterTex(th.poster) }));
      po.rotation.y = -Math.PI / 2;
      po.position.set(HALF_W - 0.02, Y + 1.95, -1.6);
      scene.add(po);
    }

    // 책상·의자 4×2(가운데 통로를 비워 문에서 교탁까지 곧장 걸어갈 수 있게)
    const deskGeo = merge([
      colored(new THREE.BoxGeometry(1.5, 0.08, 0.8).translate(0, 0.76, 0), '#E7CFA6'),
      colored(new THREE.BoxGeometry(0.07, 0.74, 0.07).translate(-0.66, 0.37, -0.3), '#8C8C94'),
      colored(new THREE.BoxGeometry(0.07, 0.74, 0.07).translate(0.66, 0.37, -0.3), '#8C8C94'),
      colored(new THREE.BoxGeometry(0.07, 0.74, 0.07).translate(-0.66, 0.37, 0.3), '#8C8C94'),
      colored(new THREE.BoxGeometry(0.07, 0.74, 0.07).translate(0.66, 0.37, 0.3), '#8C8C94'),
      colored(new THREE.BoxGeometry(0.46, 0.06, 0.46).translate(0, 0.46, 0.75), '#2A4D9B'),
      colored(new THREE.BoxGeometry(0.46, 0.5, 0.06).translate(0, 0.72, 0.96), '#2A4D9B'),
      colored(new THREE.BoxGeometry(0.05, 0.44, 0.05).translate(-0.18, 0.22, 0.6), '#8C8C94'),
      colored(new THREE.BoxGeometry(0.05, 0.44, 0.05).translate(0.18, 0.22, 0.6), '#8C8C94')
    ]);
    const desks = new THREE.InstancedMesh(deskGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), 8);
    let k = 0;
    for (const z of [0.0, 2.4]) for (const x of [-5.2, -1.8, 1.8, 5.2]) {
      _m.makeTranslation(x, Y, z);
      desks.setMatrixAt(k++, _m);
      coll.push({ x, z: z + 0.25, r: 0.85 });
    }
    desks.instanceMatrix.needsUpdate = true;
    scene.add(desks);

    // 교탁과 교장 NPC(정면 가운데)
    box(2.0, 0.95, 0.8, '#B8865B', 0, Y + 0.475, -4.9, scene);
    box(2.1, 0.06, 0.9, '#D9B583', 0, Y + 0.98, -4.9, scene);
    coll.push({ x: 0, z: -4.9, r: 1.15 });
    const pr = cfg.principal || {};
    const npc = addChar({ x: 0, z: -3.75, yaw: 0, tyaw: 0, look: pr.look || { skin: '#F6CFAE', hair: '#4A3428', hairStyle: 1, shirt: '#3E6B8F', pants: '#2F3A56' },
      name: pr.name || T.principal, npc: true, world: 'room:' + school.id, showTag: true });
    coll.push({ x: 0, z: -3.75, r: 0.55 });
    const npcSign = signSprite(pr.name || T.principal, '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 });
    npcSign.userData.anchor = [0, Y + 2.25, -3.75];
    signs.push(npcSign);

    // 책 구역(서쪽 앞), 사진첩 구역(동쪽 앞), TV 구역(동쪽 뒤)
    const items = cfg.items || {};
    // 책: 독서대 위에 펼친 책
    box(1.4, 0.7, 0.9, '#B8865B', -7.3, Y + 0.35, -3.9, scene);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: bookTex((items.book || {}).title || T.bookSign) }));
    bk.rotation.x = -Math.PI / 2 + 0.35; bk.position.set(-7.3, Y + 0.76, -3.8); scene.add(bk);
    coll.push({ x: -7.3, z: -3.9, r: 0.95 });
    // 책꽂이
    box(0.5, 2.2, 2.4, '#8C6A4F', -8.6, Y + 1.1, -4.6, scene);
    for (let i = 0; i < 6; i++) box(0.3, 0.55, 0.3, ['#E0483E', '#2A4D9B', '#F2B544', '#3FA37A', '#8C6CD0', '#F28DB2'][i], -8.5, Y + 0.6 + (i % 2) * 0.75, -5.5 + i * 0.36, scene);
    // 사진첩: 탁자 위 앨범
    box(1.3, 0.75, 0.9, '#B8865B', 7.3, Y + 0.375, -3.9, scene);
    const al = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), new THREE.MeshBasicMaterial({ map: albumTex() }));
    al.position.set(7.3, Y + 0.82, -3.9); al.rotation.y = -0.35; scene.add(al);
    coll.push({ x: 7.3, z: -3.9, r: 0.95 });
    // TV: 동쪽 벽 뒤쪽(문 가까이) 받침대 위 화면(서쪽을 본다)
    const TVZ = 4.9;
    box(0.7, 1.0, 1.6, '#4A4A52', 8.2, Y + 0.5, TVZ, scene);
    box(0.14, 1.55, 2.5, '#1C1C22', 7.95, Y + 1.95, TVZ, scene);
    const tv = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), new THREE.MeshBasicMaterial({ map: screenTex((items.tv || {}).title || T.tvSign) }));
    tv.rotation.y = -Math.PI / 2; tv.position.set(7.86, Y + 1.95, TVZ); scene.add(tv);
    coll.push({ x: 8.2, z: TVZ, r: 1.1 });

    // 구역 발판과 이름판
    const padTex = canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill();
      g.lineWidth = 14; g.strokeStyle = '#2A4D9B'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 8; g.strokeStyle = '#E0483E'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke();
    });
    const padMat = new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false });
    // 문 앞 발판: 밟으면 '로비로 나가기' 카드(휴먼쌤 10-06 "문 앞에 로비로 나가는 버튼"). 들어올 때 서는 자리(spawn)와 겹치지 않게 문 쪽에 둔다
    const DOORZ = HALF_D - 0.8;
    const doorMat = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: doorMatTex(), transparent: true, depthWrite: false }));
    doorMat.position.set(0, Y + 0.03, DOORZ); doorMat.renderOrder = 2; scene.add(doorMat);
    const spots = [
      { id: 'principal', name: pr.name || T.principal, sub: cfg.boardLine || '', btn: T.talk, x: 0, z: -2.35, r: 1.35, go: () => talk(), ch: npc },
      { id: 'book', name: (items.book || {}).title || T.bookSign, sub: T.bookSign, btn: T.open, x: -6.1, z: -3.0, r: 1.25, go: () => openBook(items.book || {}) },
      { id: 'album', name: (items.album || {}).title || T.albumSign, sub: T.albumSign, btn: T.photos, x: 6.1, z: -3.0, r: 1.25, go: () => openAlbum(items.album || {}) },
      { id: 'tv', name: (items.tv || {}).title || T.tvSign, sub: T.tvSign, btn: T.watch, x: 6.5, z: TVZ, r: 1.25, go: () => openTV(items.tv || {}) },
      { id: 'door', name: T.exitName || '로비로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: 0, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    for (const sp of spots) {
      if (!sp.pad) {
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat);
        pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad);
        sp.pad = pad;
      }
      if (sp.id !== 'principal' && sp.id !== 'door') {
        const sg = signSprite(sp.sub, '', { scene, w: 2.6 });
        sg.userData.anchor = [sp.x + (sp.x < 0 ? -1.2 : 1.2), Y + 1.9, sp.z - 0.9];
        signs.push(sg);
      }
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.72, pitch: 0.95,
      walk: (x, z) => x > -HALF_W + 0.35 && x < HALF_W - 0.35 && z > -HALF_D + 0.35 && z < HALF_D - 0.3,
      camD: () => clamp(16.5 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 32) * core.zoom(),
      // 화면 반폭 hw·반깊이 hd(칸)보다 교실이 크면 나를 따라가되 벽 밖은 보지 않게, 작으면 교실 가운데를 본다.
      // 문 쪽(남쪽)으로 가면 문 앞 발판이 아래 카드에 가리지 않게 카메라도 따라 내려간다
      camClamp: (me, hw, hd) => [
        hw * 2 >= W + 1.5 ? 0 : clamp(me.x, -HALF_W + hw - 0.6, HALF_W - hw + 0.6),
        hd * 2 >= D + 2.5 ? -0.4 + Math.max(0, me.z - 3.0) * 0.9 : clamp(me.z, -HALF_D + hd - 1.4, HALF_D - hd + 1.7)
      ],
      spawn: { x: 0, z: 4.15, yaw: Math.PI }
    };
    R.built = { school, cfg, world, npc, spots };
    return R.built;
  }

  // ── 개념관(가상융합교육 지도) — 걸을수록 가상이 되는 교실 ──
  // 한 방에 네 칸(현실 → AR → MR → VR)이 이어진다. 그림 시안 ..\시안\mockup-hall-concept.html(2026-10-07 휴먼쌤 "좋아")을 엔진 꼴로 옮겼다.
  // 글은 lobby.config.js rooms.concept(모두 [확인 전]). 칸에 들어서면 리니 한 줄(토스트), AR 칸부터 홀로그램이 떠오르고, MR 칸에서는 행성이 손 앞을 따라오고, VR 칸은 벽 없이 우주.
  function buildConcept(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#0B1035');
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2b24, 0.85));
    const sun = new THREE.DirectionalLight(0xffe7c4, 0.65); sun.position.set(-16, 28, 18); scene.add(sun);
    const ZONES = cfg.zones || [], NZ = 4, ZW = 8.5, X0 = -ZW * NZ / 2, HD = 5.5, ZB = -HD, WH = 3.6, PADZ = 3.2;
    const zx = i => X0 + ZW * (i + 0.5);
    const pr = cfg.principal || {}, terms = cfg.terms || {}, quiz = cfg.quiz || null;
    const coll = [], signs = [], hit = [];
    const A = { t: 0, zone: -1, X0, ZW, zones: ZONES, zoneSigns: [], planets: [], drift: [], cards: [], holo: null, holoY: 0, sat: null, rest: null, rini: null };
    let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const P = [];                                   // 색만 있는 조각은 한 덩어리로 그린다
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });

    // 바닥: 1·2칸 나무 마루, 3칸은 마루가 칸칸이 격자로 바뀌고, 4칸은 빛 격자. 받침 판은 1~3칸 두껍게, 4칸 얇게 네온 테
    const planks = (g, w, h, ppu) => { const rowH = Math.round(0.55 * ppu); for (let y = 0; y < h; y += rowH) { let x = -rnd() * 2 * ppu; while (x < w) { const len = (1.6 + rnd() * 2.2) * ppu, c = 178 + Math.floor(rnd() * 38); g.fillStyle = `rgb(${c + 18},${Math.floor(c * 0.7) + 8},${Math.floor(c * 0.44)})`; g.fillRect(x + 1, y + 1, len - 2, rowH - 2); x += len; } } };
    const woodTex = canvasTex(1024, 664, (g, w, h) => { g.fillStyle = '#6B4526'; g.fillRect(0, 0, w, h); planks(g, w, h, 60); });
    const NCX = 17, NCY = 22, tile = [];
    for (let cy = 0; cy < NCY; cy++) for (let cx = 0; cx < NCX; cx++) tile.push(rnd() < (cx + 0.5) / NCX * 1.35 - 0.12);
    const mrTex = canvasTex(680, 880, (g, w, h) => { g.fillStyle = '#6B4526'; g.fillRect(0, 0, w, h); planks(g, w, h, 80); g.fillStyle = '#0F1645'; for (let cy = 0; cy < NCY; cy++) for (let cx = 0; cx < NCX; cx++) if (tile[cy * NCX + cx]) g.fillRect(cx * 40, cy * 40, 40, 40); });
    const mrGlow = canvasTex(680, 880, (g) => { g.strokeStyle = 'rgba(125,255,209,0.9)'; g.lineWidth = 2.5; for (let cy = 0; cy < NCY; cy++) for (let cx = 0; cx < NCX; cx++) if (tile[cy * NCX + cx]) g.strokeRect(cx * 40 + 2, cy * 40 + 2, 36, 36); });
    const vrTex = canvasTex(680, 880, (g, w, h) => {
      g.fillStyle = '#0C1142'; g.fillRect(0, 0, w, h);
      for (let x = 0; x <= w; x += 40) { g.strokeStyle = x % 160 ? 'rgba(111,233,255,0.45)' : 'rgba(111,233,255,0.95)'; g.lineWidth = x % 160 ? 1.5 : 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 40) { g.strokeStyle = y % 160 ? 'rgba(111,233,255,0.45)' : 'rgba(111,233,255,0.95)'; g.lineWidth = y % 160 ? 1.5 : 3; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.8); gr.addColorStop(0, 'rgba(255,111,216,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const wood = flat(ZW * 2, 2 * HD, new THREE.MeshLambertMaterial({ map: woodTex }), X0 + ZW, 0, 0); wood.renderOrder = 0;
    const mrF = flat(ZW, 2 * HD, new THREE.MeshLambertMaterial({ map: mrTex }), zx(2), 0, 0); mrF.renderOrder = 0;
    flat(ZW, 2 * HD, basic(mrGlow, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), zx(2), 0, 0.03);
    const vrF = flat(ZW, 2 * HD, basic(vrTex), zx(3), 0, 0); vrF.renderOrder = 0;
    part(new THREE.BoxGeometry(ZW * 3 + 0.6, 0.8, 2 * HD + 0.6), '#2B2442', X0 + ZW * 1.5, Y - 0.41, 0);
    part(new THREE.BoxGeometry(ZW, 0.3, 2 * HD), '#101538', zx(3), Y - 0.16, 0);
    { const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(ZW, 0.3, 2 * HD)), new THREE.LineBasicMaterial({ color: '#6FE9FF', transparent: true, opacity: 0.9 })); eg.position.set(zx(3), Y - 0.16, 0); scene.add(eg); }
    // 경계에서 부서져 떨어지는 조각(현실 판 → 가상 판)과 3칸 벽에서 날아가는 홀로그램 조각은 한 덩어리로
    const HP = [], EDGE = [];
    const holoCube = (s, x, y, z, rx, ry, rz) => { const g = new THREE.BoxGeometry(s, s, s); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z)); EDGE.push(new THREE.EdgesGeometry(g).attributes.position.array); HP.push(colored(g, '#6FE9FF')); };
    for (let i = 0; i < 14; i++) {
      const s = 0.25 + rnd() * 0.35, x = X0 + ZW * 3 + (rnd() - 0.3) * 2.2, y = Y - 0.9 - rnd() * 2.6, z = -5 + rnd() * 10;
      if (rnd() < 0.55) holoCube(s, x, y, z, rnd() * 3, rnd() * 3, rnd() * 3);
      else { const g = new THREE.BoxGeometry(s, s, s); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)).setPosition(x, y, z)); P.push(colored(g, '#2B2442')); }
    }

    // 벽: 서쪽(입구)과 북쪽(1·2칸)은 벽, 3칸 북쪽은 조각나 날아가는 벽, 4칸은 벽이 없다. 남쪽은 낮은 턱(카메라가 남쪽에서 본다)
    const wallTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#F1E4CC'; g.fillRect(0, 0, w, h); g.fillStyle = '#A8794D'; g.fillRect(0, h * 0.76, w, h * 0.24); g.fillStyle = '#8A5F3A'; g.fillRect(0, h * 0.755, w, 5); });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); scene.add(m); return m; };
    wall(0.3, WH, 2 * HD + 0.3, X0 - 0.15, Y + WH / 2, 0);
    wall(ZW * 2 + 0.3, WH, 0.3, X0 + ZW - 0.15, Y + WH / 2, ZB - 0.15);
    part(new THREE.BoxGeometry(ZW * 3 + 0.3, 0.35, 0.3), '#A8794D', X0 + ZW * 1.5 - 0.15, Y + 0.175, HD + 0.15);
    for (let c = 0; c < 17; c++) for (let r = 0; r < 8; r++) {
      const t = c / 16, x = X0 + ZW * 2 + 0.25 + c * 0.5, y = Y + 0.225 + r * 0.45, z = ZB - 0.15;
      if (rnd() > t * 1.15 - 0.05) { part(new THREE.BoxGeometry(0.5, 0.45, 0.3), r < 2 ? '#A8794D' : '#F1E4CC', x, y, z); continue; }
      if (rnd() < 0.7) holoCube(0.3 + rnd() * 0.16, x + (rnd() - 0.5) * 0.8 * t, y + rnd() * 2.2 * t, z - (0.2 + rnd() * 2.6 * t), rnd() * 2, rnd() * 2, rnd() * 2);
    }

    // 1칸: 현실 교실 — 칠판·시계·책상 4·교탁·지구본·책장·화분·입구 문
    const B = cfg.board || {};
    const boardT = canvasTex(1024, 460, (g, w, h) => {
      g.fillStyle = '#2F5A46'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.93)'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `700 54px ${FONT_B}`; g.fillText(B.top || '', 70, 86);
      fitFont(g, B.title || '', 'normal', 94, FONT_D, 740); g.fillText(B.title || '', 70, 200);
      g.font = `700 54px ${FONT_B}`; g.fillText(B.line || '', 70, 340);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 6; g.beginPath(); g.arc(860, 320, 62, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(860, 320, 112, 26, -0.3, 0, Math.PI * 2); g.stroke();
    });
    part(new THREE.BoxGeometry(5.3, 2.5, 0.1), '#8A5F3A', zx(0), Y + 2.45, ZB + 0.05);
    plane(5.0, 2.2, basic(boardT), zx(0), Y + 2.45, ZB + 0.11);
    const clockT = canvasTex(128, 128, (g) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill(); g.lineWidth = 7; g.strokeStyle = '#333333'; g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 26); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); });
    { const ck = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), basic(clockT)); ck.position.set(zx(0) + 3.3, Y + 3.15, ZB + 0.02); scene.add(ck); }
    const desk = (x, z, chair) => {
      part(new THREE.BoxGeometry(1.25, 0.07, 0.78), '#D9B38C', x, Y + 0.76, z);
      [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([a, b]) => part(new THREE.BoxGeometry(0.06, 0.74, 0.06), '#7B8494', x + a, Y + 0.37, z + b));
      part(new THREE.BoxGeometry(0.62, 0.06, 0.58), chair, x, Y + 0.46, z + 0.78); part(new THREE.BoxGeometry(0.62, 0.56, 0.06), chair, x, Y + 0.76, z + 1.06);
      [[-0.26, 0.54], [0.26, 0.54], [-0.26, 1.02], [0.26, 1.02]].forEach(([a, b]) => part(new THREE.BoxGeometry(0.05, 0.44, 0.05), '#7B8494', x + a, Y + 0.22, z + b));
      coll.push({ x, z: z + 0.35, r: 0.95 });
    };
    desk(zx(0) - 1.7, -1.4, '#7DD3FC'); desk(zx(0) + 1.7, -1.4, '#FDA4AF'); desk(zx(0) - 1.7, 1.0, '#FDE68A'); desk(zx(0) + 1.7, 1.0, '#A7F3D0');
    part(new THREE.BoxGeometry(2.2, 0.82, 0.9), '#9A6B42', zx(0), Y + 0.41, -3.6); coll.push({ x: zx(0), z: -3.6, r: 1.25 });
    part(new THREE.CylinderGeometry(0.06, 0.14, 0.3, 12), '#6B4A2E', zx(0) + 0.55, Y + 0.97, -3.6);
    const globeT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#3B82F6'; g.fillRect(0, 0, w, h); g.fillStyle = '#4ADE80'; [[40, 40, 30, 22], [70, 80, 18, 26], [140, 50, 36, 20], [180, 86, 22, 16], [220, 40, 18, 14]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, 0.4, 0, Math.PI * 2); g.fill(); }); });
    { const gl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshLambertMaterial({ map: globeT })); gl.position.set(zx(0) + 0.55, Y + 1.42, -3.6); scene.add(gl); }
    part(new THREE.BoxGeometry(0.08, 2.3, 1.7), '#8A5F3A', X0 + 0.04, Y + 1.15, -4.2);
    [-5.03, -3.37].forEach(z => part(new THREE.BoxGeometry(0.5, 2.3, 0.06), '#8A5F3A', X0 + 0.27, Y + 1.15, z));
    [0.03, 0.77, 1.51, 2.27].forEach(y => part(new THREE.BoxGeometry(0.5, 0.06, 1.7), '#8A5F3A', X0 + 0.27, Y + y, -4.2));
    for (let s = 0; s < 3; s++) for (let b = 0; b < 5; b++) part(new THREE.BoxGeometry(0.36, 0.5 + (b % 2) * 0.08, 0.2), ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'][(s + b) % 6], X0 + 0.28, Y + 0.32 + s * 0.74 + (b % 2) * 0.04, -4.8 + b * 0.28);
    coll.push({ x: X0 + 0.3, z: -4.2, r: 1.0 });
    part(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 16), '#C2410C', X0 + ZW - 0.8, Y + 0.25, ZB + 0.6);
    part(new THREE.SphereGeometry(0.55, 16, 12), '#4D9B4F', X0 + ZW - 0.8, Y + 0.95, ZB + 0.6);
    coll.push({ x: X0 + ZW - 0.8, z: ZB + 0.6, r: 0.6 });
    const DOORZ = 4.1;
    const doorT = canvasTex(256, 352, (g, w, h) => { g.fillStyle = '#9A6B42'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6B4526'; g.lineWidth = 10; g.strokeRect(28, 30, w - 56, 120); g.strokeRect(28, 190, w - 56, 130); g.fillStyle = '#BFE6FF'; g.fillRect(48, 48, w - 96, 84); g.fillStyle = '#F5D76E'; g.beginPath(); g.arc(w - 46, 180, 12, 0, Math.PI * 2); g.fill(); });
    { const dr = plane(1.9, 2.6, basic(doorT), X0 + 0.02, Y + 1.3, DOORZ); dr.rotation.y = Math.PI / 2; }
    // 문 앞 '지도로' 발판(문이 서쪽에 있어 화살표는 왼쪽을 가리킨다)
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(42,77,155,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '지도로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '지도로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), X0 + 1.6, DOORZ, 0.03);

    // 2칸: AR — 같은 교실 위에 홀로그램. 창문·게시판(AR 테두리가 겹쳐 보임)·태블릿에서 떠오르는 행성계
    desk(zx(1) - 1.9, -0.9, '#C4B5FD'); desk(zx(1) + 1.2, -0.9, '#FDBA74');
    const winT = canvasTex(256, 180, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7CC4FF'); gr.addColorStop(1, '#D8F0FF'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.9)'; [[60, 60, 30], [90, 55, 38], [120, 65, 26], [190, 112, 24], [215, 106, 30]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#FFFFFF'; g.fillRect(w / 2 - 4, 0, 8, h); g.fillRect(0, h / 2 - 4, w, 8); });
    part(new THREE.BoxGeometry(2.8, 2.0, 0.1), '#FFFFFF', zx(1) - 1.9, Y + 2.35, ZB + 0.05);
    plane(2.6, 1.8, basic(winT), zx(1) - 1.9, Y + 2.35, ZB + 0.11);
    const corkT = canvasTex(256, 168, (g, w, h) => { g.fillStyle = '#C99A63'; g.fillRect(0, 0, w, h); [['#FEF08A', 20, 20], ['#BAE6FD', 100, 30], ['#FECACA', 180, 18], ['#BBF7D0', 40, 96], ['#FFFFFF', 130, 92]].forEach(([c, x, y]) => { g.fillStyle = c; g.fillRect(x, y, 60, 52); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 8, y + 14, 44, 3); g.fillRect(x + 8, y + 26, 36, 3); g.fillStyle = '#EF4444'; g.beginPath(); g.arc(x + 30, y + 4, 4, 0, Math.PI * 2); g.fill(); }); });
    part(new THREE.BoxGeometry(2.4, 1.6, 0.08), '#8A5F3A', zx(1) + 2.3, Y + 2.2, ZB + 0.04);
    plane(2.2, 1.4, basic(corkT), zx(1) + 2.3, Y + 2.2, ZB + 0.09);
    const bracketT = canvasTex(512, 340, (g, w, h) => { g.strokeStyle = 'rgba(111,233,255,1)'; g.lineWidth = 12; g.lineCap = 'round'; const L = 70; [[14, 14, 1, 1], [w - 14, 14, -1, 1], [14, h - 14, 1, -1], [w - 14, h - 14, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + sx * L, y); g.lineTo(x, y); g.lineTo(x, y + sy * L); g.stroke(); }); g.fillStyle = 'rgba(111,233,255,0.12)'; g.fillRect(14, 14, w - 28, h - 28); g.fillStyle = '#E8FBFF'; g.font = `900 60px ${FONT_B}`; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('AR', w - 40, 34); });
    plane(2.7, 1.8, basic(bracketT, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), zx(1) + 2.3, Y + 2.25, ZB + 0.6);
    const HX = zx(1) + 1.2, HZ = -0.9;
    part(new THREE.BoxGeometry(0.56, 0.03, 0.4), '#1D2240', HX, Y + 0.815, HZ);
    flat(0.5, 0.34, glow('#6FE9FF', 0.95), HX, HZ, 0.835);
    { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#6FE9FF', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.rotation.x = Math.PI; cone.position.set(HX, Y + 1.6, HZ); scene.add(cone); }
    const sunGlowT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,150,1)'); gr.addColorStop(0.35, 'rgba(255,190,90,0.55)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const holo = new THREE.Group(); A.holoY = Y + 2.4; holo.position.set(HX, A.holoY - 1.4, HZ); holo.rotation.x = 0.3; holo.scale.setScalar(0.001); scene.add(holo); A.holo = holo;
    holo.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), basic(null, { color: '#FFD36B' })));
    { const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sg.scale.set(1.5, 1.5, 1); holo.add(sg); }
    [[0.62, '#7DD3FC', 0.08, 0.4], [0.95, '#5EEAD4', 0.11, 2.2], [1.3, '#FF9F6B', 0.15, 4.1]].forEach(([r, col, prad, ang]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 6, 72), glow('#6FE9FF', 0.8)); ring.rotation.x = Math.PI / 2; holo.add(ring);
      const p = new THREE.Mesh(new THREE.SphereGeometry(prad, 16, 12), basic(null, { color: col })); p.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r); holo.add(p);
    });
    { const hs = signSprite(cfg.holoName || '지구', cfg.holoSub || '', { scene, bg: '#0B1230', fg: '#BFEFFF', w: 2.6 }); hs.userData.anchor = [HX + 1.1, Y + 3.4, HZ + 0.2]; signs.push(hs); }

    // 3칸: MR — 홀로그램이 진짜 책상을 알아보고(점선 테두리), 행성은 손 앞을 따라온다
    const MD = { x: zx(2) - 2.1, z: -1.1 };
    desk(MD.x, MD.z, '#93C5FD');
    { const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.55, 1.05, 1.95)), new THREE.LineDashedMaterial({ color: '#7DFFD1', dashSize: 0.14, gapSize: 0.09, transparent: true, opacity: 0.95 })); l.position.set(MD.x, Y + 0.53, MD.z + 0.35); l.computeLineDistances(); scene.add(l); }
    { const ds = signSprite(cfg.mrDesk || '진짜 책상', cfg.mrDeskSub || '', { scene, bg: '#06221C', fg: '#CFFFEE', w: 2.6 }); ds.userData.anchor = [MD.x - 0.3, Y + 1.9, MD.z + 0.5]; signs.push(ds); }
    const MP = cfg.mrPanel || [];
    const panelT = canvasTex(640, 360, (g, w, h) => { rr(g, 10, 10, w - 20, h - 20, 36); g.fillStyle = 'rgba(6,30,34,0.82)'; g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(125,255,209,0.95)'; g.stroke(); g.fillStyle = '#EAFFF7'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 64px ${FONT_B}`; g.fillText(MP[0] || '', w / 2, 130); g.fillText(MP[1] || '', w / 2, 220); g.font = `700 40px ${FONT_B}`; g.fillStyle = 'rgba(234,255,247,0.8)'; g.fillText(MP[2] || '', w / 2, 296); });
    plane(3.1, 1.74, sheet(panelT), zx(2) - 2.3, Y + 2.85, ZB + 0.5);
    const satT = canvasTex(256, 128, (g, w, h) => { const cols = ['#F2D7A2', '#E0B97A', '#F7E6C2', '#CF9F62', '#ECD3A0', '#D8AE74']; for (let y = 0; y < h; y += 16) { g.fillStyle = cols[(y / 16) % cols.length]; g.fillRect(0, y, w, 16); } });
    const sat = new THREE.Group(); A.rest = [MD.x, Y + 1.6, MD.z]; sat.position.set(A.rest[0], A.rest[1], A.rest[2]); scene.add(sat); A.sat = sat;
    { const s = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), basic(satT)); s.rotation.z = 0.35; sat.add(s);
      const rg = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.86, 48), new THREE.MeshBasicMaterial({ color: '#F1DDB3', transparent: true, opacity: 0.75, side: THREE.DoubleSide })); rg.rotation.set(-Math.PI / 2 + 0.5, 0.2, 0); sat.add(rg);
      sat.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), glow('#7DFFD1', 0.14))); }

    // 4칸: VR — 벽 없이 우주. 큰 행성·떠다니는 빛 조각·용어 카드 4장·퀴즈 자리
    const jupT = canvasTex(256, 128, (g, w, h) => { const cols = ['#E8C08A', '#C98A52', '#F3DCB2', '#B9774A', '#ECD0A0', '#D49A62', '#F6E3C0']; let y = 0, i = 0; while (y < h) { const hh = 8 + Math.floor(rnd() * 14); g.fillStyle = cols[i++ % cols.length]; g.fillRect(0, y, w, hh); y += hh; } g.fillStyle = '#C2553A'; g.beginPath(); g.ellipse(170, 80, 22, 11, 0, 0, Math.PI * 2); g.fill(); });
    { const j = new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 20), basic(jupT)); j.position.set(X0 + ZW * 4 + 2.2, Y + 2.2, -3.6); j.rotation.z = 0.2; scene.add(j); A.planets.push(j); }
    { const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), basic(satT)); s2.position.set(zx(3) - 2.7, Y + 0.9, -7.4); scene.add(s2); A.planets.push(s2);
      const r2 = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.15, 48), new THREE.MeshBasicMaterial({ color: '#F1DDB3', transparent: true, opacity: 0.7, side: THREE.DoubleSide })); r2.position.copy(s2.position); r2.rotation.set(-Math.PI / 2 + 0.55, 0.25, 0); scene.add(r2); }
    for (let i = 0; i < 12; i++) {
      const s = 0.3 + rnd() * 0.3, col = i % 3 ? '#6FE9FF' : '#FF6FD8';
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), glow(col, 0.3)); m.position.set(X0 + ZW * 3 + 0.4 + rnd() * 8, Y + 1 + rnd() * 4.2, -6.2 + rnd() * 4.5); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.userData.y = m.position.y;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.85 })));
      scene.add(m); A.drift.push(m);
    }
    (terms.cards || []).forEach((c, i) => {
      const t = canvasTex(400, 520, (g, w, h) => { rr(g, 16, 16, w - 32, h - 32, 44); g.fillStyle = 'rgba(8,12,40,0.88)'; g.fill(); g.lineWidth = 10; g.strokeStyle = c.color || '#FFFFFF'; g.stroke(); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 168px ${FONT_B}`; g.fillText(c.big || '', w / 2, 210); g.font = `800 62px ${FONT_B}`; g.fillText(c.name || '', w / 2, 366); g.font = `600 36px ${FONT_B}`; g.fillStyle = 'rgba(200,220,255,0.7)'; g.fillText(terms.title || '', w / 2, 448); });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(1.5, 1.95, 1); s.position.set(zx(3) - 2.4 + i * 1.6, Y + 2.7, -2.4); s.userData.y = Y + 2.7; s.renderOrder = 5; scene.add(s); A.cards.push(s);
    });
    // 우주: 별 + 성운
    { const n = 900, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, e = Math.acos(rnd() * 2 - 1), r = 150; sp[i * 3] = r * Math.sin(e) * Math.cos(a); sp[i * 3 + 1] = Y + r * Math.cos(e); sp[i * 3 + 2] = r * Math.sin(e) * Math.sin(a); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.85 }))); }
    const nebT = canvasTex(256, 256, (g, w, h) => { [[0.4, 0.5, 0.45, '150,90,255'], [0.62, 0.42, 0.35, '255,90,200'], [0.5, 0.64, 0.3, '80,160,255']].forEach(([fx, fy, fr, c]) => { const gr = g.createRadialGradient(fx * w, fy * h, 4, fx * w, fy * h, fr * w); gr.addColorStop(0, `rgba(${c},0.5)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); });
    [[34, 12, -90, 90], [-30, -6, -80, 70], [12, -40, 60, 110]].forEach(([x, y, z, s]) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebT, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(s, s, 1); m.position.set(x, Y + y, z); scene.add(m); });

    // 칸 경계선·화살표·발판·칸 이름판
    const arrowT = canvasTex(256, 128, (g) => { g.strokeStyle = '#FFFFFF'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; [56, 128].forEach(x0 => { g.beginPath(); g.moveTo(x0, 24); g.lineTo(x0 + 50, 64); g.lineTo(x0, 104); g.stroke(); }); });
    for (let k = 1; k < NZ; k++) {
      const c = (ZONES[k] && ZONES[k].color) || '#FFFFFF';
      flat(0.08, 2 * HD, glow(c, 0.9), X0 + ZW * k, 0, 0.05);
      flat(1.5, 0.75, basic(arrowT, { color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), X0 + ZW * k, PADZ, 0.07);
    }
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.32)); gr.addColorStop(0.8, hexA(color, 0.16)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(10,14,40,0.5)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke(); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${text.length > 2 ? 104 : 136}px ${FONT_B}`; g.fillText(text, w / 2, h / 2 - 24); g.font = `800 50px ${FONT_B}`; g.fillText(sub, w / 2, h / 2 + 72); });
    const padX = [zx(0) + 1.2, zx(1), zx(2), zx(3) - 1.2], padMesh = [];
    ZONES.forEach((z, i) => {
      padMesh[i] = flat(2.4, 2.4, sheet(padT(z.pad || '', z.padSub || '', z.color || '#FFFFFF')), padX[i], PADZ, 0.06);
      const sg = signSprite(z.title || '', z.sub || '', { scene, bg: z.color || '#FFFFFF', fg: '#1E2B4A', w: 5 });
      sg.userData.anchor = [zx(i), Y + (i < 3 ? WH + 0.3 : 3.9), i < 3 ? ZB + 0.3 : -3.2];
      signs.push(sg); A.zoneSigns.push(sg);
    });

    // 리니(입구 근처 안내 로봇)
    const RX = X0 + 2.6, RZ = -2.6;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));
    if (HP.length) {
      scene.add(new THREE.Mesh(merge(HP), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })));
      let n = 0; EDGE.forEach(a => { n += a.length; }); const ea = new Float32Array(n); let o = 0; EDGE.forEach(a => { ea.set(a, o); o += a.length; });
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ea, 3));
      scene.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: '#6FE9FF', transparent: true, opacity: 0.85 })));
    }

    // 구역(발판): 리니 · 칸 4 · 용어 카드 · 퀴즈 · 문. 칸 발판의 버튼은 다음 칸 발판까지 걸어가기
    const goTo = (x, z) => { if (R.me) R.me.target = { x, z, stuck: 0 }; hideCard(); R.cur = null; };
    const openTerms = () => openBook({ title: terms.title || '', sub: terms.sub || '', sample: true,
      text: (terms.cards || []).map(c => `${c.big} ${c.name} — ${c.text}`).concat(terms.foot ? [terms.foot] : []).join('\n\n') });
    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: RX, z: RZ + 1.5, r: 1.3, go: () => talk() },
      { id: 'terms', name: terms.sign || terms.title || '', sub: terms.sub || '', btn: T.open, x: zx(3) + 0.8, z: -1.2, r: 1.2, sign: true, go: openTerms },
      { id: 'door', name: T.exitName || '지도로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: X0 + 1.6, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    ZONES.forEach((z, i) => spots.push({ id: 'zone' + i, name: z.title || '', sub: z.sub || '', btn: i < NZ - 1 ? (T.nextZone || '다음 칸으로') : T.open, x: padX[i], z: PADZ, r: 1.25, pad: padMesh[i],
      go: i < NZ - 1 ? () => goTo(padX[i + 1], PADZ) : openTerms }));
    if (quiz) spots.push({ id: 'quiz', name: quiz.title || '', sub: cfg.quizSub || '', btn: T.start, x: zx(3) + 1.2, z: 2.0, r: 1.2, sign: true, go: () => startPractice(quiz) });
    const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#FF6FD8'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#6FE9FF'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke(); }));
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      if (sp.sign) { const sg = signSprite(sp.name, '', { scene, w: 3.2 }); sg.userData.anchor = [sp.x, Y + 0.05, sp.z - 1.15]; signs.push(sg); }   // 발판 바로 위(바닥 높이)에 두어 떠 있는 카드와 안 겹치게
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => x > X0 + 0.35 && x < X0 + ZW * NZ - 0.35 && z > ZB + 0.35 && z < HD - 0.3,
      // 가로 21칸(두 칸 반)이 보이게. 폰 세로는 44칸 거리까지 물러나 한 칸이 통째로 들어온다
      camD: () => clamp(21 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= ZW * NZ + 1.5 ? 0 : clamp(me.x, X0 + hw - 0.6, X0 + ZW * NZ - hw + 0.6),
        hd * 2 >= 2 * HD + 2.5 ? -2.2 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, ZB + hd - 1.4, HD - hd + 1.7)   // 북쪽으로 올려 벽 위 칸 이름판까지 보이게
      ],
      spawn: { x: X0 + 3.0, z: 1.4, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'concept', anim: A };
    return R.built;
  }
  function updateConcept(dt, me) {
    const A = R.built.anim; A.t += dt;
    const zi = clamp(Math.floor((me.x - A.X0) / A.ZW), 0, 3);
    if (zi !== A.zone) {
      A.zone = zi;
      const z = A.zones[zi];
      if (z && z.line) showToast(z.line, 4.5);
      A.zoneSigns.forEach((s, i) => { s.material.opacity = i === zi ? 1 : 0.62; });
    }
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    // AR 칸부터 홀로그램 행성계가 떠올라 돈다
    if (A.holo) { const on = zi >= 1, k = 1 - Math.exp(-dt * 3); A.holo.position.y += ((on ? A.holoY : A.holoY - 1.4) - A.holo.position.y) * k; const s = A.holo.scale.x + ((on ? 1.3 : 0.001) - A.holo.scale.x) * k; A.holo.scale.setScalar(s); A.holo.rotation.y += dt * 0.6; }
    // MR 칸에서는 행성이 손 앞을 따라오고, 나가면 책상 위로 돌아간다
    if (A.sat) { const tg = zi === 2 ? [me.x + Math.sin(me.yaw) * 0.9, Y + 1.8, me.z + Math.cos(me.yaw) * 0.9] : A.rest, k = 1 - Math.exp(-dt * 4), p = A.sat.position; p.x += (tg[0] - p.x) * k; p.y += (tg[1] - p.y) * k + Math.sin(A.t * 2) * 0.002; p.z += (tg[2] - p.z) * k; A.sat.rotation.y += dt * 0.5; }
    for (const p of A.planets) p.rotation.y += dt * 0.08;
    A.drift.forEach((m, i) => { m.rotation.x += dt * 0.3; m.rotation.y += dt * 0.2; m.position.y = m.userData.y + Math.sin(A.t * 0.8 + i) * 0.25; });
    A.cards.forEach((c, i) => { c.position.y = c.userData.y + Math.sin(A.t * 1.4 + i * 0.9) * 0.12; });
  }
  // ── 수업 사례관(가상융합교육 지도) — 교과를 고르면 바뀌는 교실 ──
  // 그림 시안 design/mockup-hall-cases.html을 엔진 꼴로 옮겼다. 입구(서쪽)에서 동쪽으로: ① 칠판에서 교과 고르기 → ② 가운데 무대의 꾸밈이 그 교과로 바뀜 → ③ 책(지도안)·TV(수업 영상)·사진첩(학생 결과물).
  // 글은 lobby.config.js rooms.cases(모두 [확인 전]·예시). 사례는 휴먼쌤이 줄 것이라 지금은 들어갈 내용의 틀만 보여 준다. 세 가지를 다 보면 연수 수첩 도장.
  function buildCases(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#141A46');
    scene.add(new THREE.HemisphereLight(0xeef2ff, 0x4a3a2c, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.6); sun.position.set(-14, 28, 18); scene.add(sun);
    const RW = 30, X0 = -RW / 2, HD = 5.5, ZB = -HD, WH = 3.6;
    const SUBJ = cfg.subjects || [], pr = cfg.principal || {};
    const coll = [], signs = [], hit = [];
    const A = { t: 0, sel: -1, sets: [], bob: [], spin: [], seen: new Set(), stamped: false, board: null, poster: null, stageGrid: null, stageSign: null, rini: null };
    let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });
    const glyph = (text, color, size) => { const t = canvasTex(256, 256, (g, w, h) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 170px ${FONT_B}`; g.lineWidth = 14; g.strokeStyle = 'rgba(10,14,40,0.75)'; g.strokeText(text, w / 2, h / 2 + 8); g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 8); }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(size, size, 1); return s; };
    const bubble = (text, color) => { const t = canvasTex(512, 200, (g, w, h) => { rr(g, 10, 10, w - 20, h - 50, 40); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 8; g.strokeStyle = color; g.stroke(); g.beginPath(); g.moveTo(110, h - 42); g.lineTo(90, h - 6); g.lineTo(150, h - 42); g.closePath(); g.fillStyle = '#FFFFFF'; g.fill(); g.fillStyle = '#1E2B4A'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, text, '800', 64, FONT_B, w - 60); g.fillText(text, w / 2, (h - 40) / 2 + 6); }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(2.4, 0.94, 1); return s; };

    // 바닥: 떠 있는 모형 판 + 나무 마루
    const planks = (g, w, h, ppu) => { const rowH = Math.round(0.55 * ppu); for (let y = 0; y < h; y += rowH) { let x = -rnd() * 2 * ppu; while (x < w) { const len = (1.6 + rnd() * 2.2) * ppu, c = 178 + Math.floor(rnd() * 38); g.fillStyle = `rgb(${c + 18},${Math.floor(c * 0.7) + 8},${Math.floor(c * 0.44)})`; g.fillRect(x + 1, y + 1, len - 2, rowH - 2); x += len; } } };
    const woodTex = canvasTex(1536, 564, (g, w, h) => { g.fillStyle = '#6B4526'; g.fillRect(0, 0, w, h); planks(g, w, h, 51); });
    const wood = flat(RW, 2 * HD, new THREE.MeshLambertMaterial({ map: woodTex }), 0, 0, 0); wood.renderOrder = 0;
    part(new THREE.BoxGeometry(RW + 0.6, 0.8, 2 * HD + 0.6), '#2B2442', 0, Y - 0.41, 0);

    // 벽: 서쪽(입구)·북쪽·동쪽. 남쪽은 낮은 턱(카메라가 남쪽에서 본다)
    const wallTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#F4EAD6'; g.fillRect(0, 0, w, h); g.fillStyle = '#A8794D'; g.fillRect(0, h * 0.76, w, h * 0.24); g.fillStyle = '#8A5F3A'; g.fillRect(0, h * 0.755, w, 5); });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); scene.add(m); };
    wall(0.3, WH, 2 * HD + 0.3, X0 - 0.15, Y + WH / 2, 0);
    wall(0.3, WH, 2 * HD + 0.3, -X0 + 0.15, Y + WH / 2, 0);
    wall(RW + 0.6, WH, 0.3, 0, Y + WH / 2, ZB - 0.15);
    part(new THREE.BoxGeometry(RW + 0.6, 0.35, 0.3), '#A8794D', 0, Y + 0.175, HD + 0.15);

    // 입구 문(서쪽 벽)과 '지도로' 발판
    const DOORZ = 3.2;
    const doorT = canvasTex(256, 352, (g, w, h) => { g.fillStyle = '#9A6B42'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6B4526'; g.lineWidth = 10; g.strokeRect(28, 30, w - 56, 120); g.strokeRect(28, 190, w - 56, 130); g.fillStyle = '#BFE6FF'; g.fillRect(48, 48, w - 96, 84); g.fillStyle = '#F5D76E'; g.beginPath(); g.arc(w - 46, 180, 12, 0, Math.PI * 2); g.fill(); });
    { const dr = plane(1.9, 2.6, basic(doorT), X0 + 0.02, Y + 1.3, DOORZ); dr.rotation.y = Math.PI / 2; }
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(42,77,155,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '지도로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '지도로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), X0 + 1.6, DOORZ, 0.03);

    // 화분·시계·창문(입구 쪽 북벽)
    const pot = (x, z) => { part(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 16), '#C2410C', x, Y + 0.25, z); part(new THREE.SphereGeometry(0.55, 16, 12), '#4D9B4F', x, Y + 0.95, z); coll.push({ x, z, r: 0.6 }); };
    pot(X0 + 0.8, ZB + 0.8); pot(-X0 - 0.8, HD - 1.0);
    const clockT = canvasTex(128, 128, (g) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill(); g.lineWidth = 7; g.strokeStyle = '#333333'; g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 26); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); });
    { const ck = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), basic(clockT)); ck.position.set(5.6, Y + 3.15, ZB + 0.02); scene.add(ck); }

    // ① 칠판: 교과 버튼 6개(고른 교과가 켜진다). 칠판 그림은 고를 때마다 다시 그린다
    const BX = -8.4, BW = 6.0, BH = 2.5;
    const boardDraw = sel => canvasTex(1200, 500, (g, w, h) => {
      g.fillStyle = '#2F5A46'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; for (let i = 0; i < 24; i++) { g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.lineTo(rnd() * w, rnd() * h); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.textAlign = 'left'; g.textBaseline = 'middle';
      fitFont(g, (cfg.board || {}).title || '', 'normal', 76, FONT_D, 820); g.fillText((cfg.board || {}).title || '', 60, 78);
      const n = SUBJ.length, cols = 3, bw = 330, bh = 120, gx = 40, gy = 34, x0 = (w - (cols * bw + (cols - 1) * gx)) / 2, y0 = 160;
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (bw + gx), y = y0 + r * (bh + gy), on = i === sel, col = SUBJ[i].color || '#FFFFFF';
        rr(g, x, y, bw, bh, 30); g.fillStyle = on ? col : 'rgba(255,255,255,0.1)'; g.fill();
        g.lineWidth = on ? 10 : 5; g.strokeStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.7)'; g.stroke();
        g.fillStyle = on ? '#1E2B4A' : '#FFFFFF'; g.textAlign = 'center'; fitFont(g, SUBJ[i].name || '', on ? '900' : '700', 62, FONT_B, bw - 30); g.fillText(SUBJ[i].name || '', x + bw / 2, y + bh / 2 + 3);
      }
      if ((cfg.board || {}).tag) { g.font = `700 34px ${FONT_B}`; g.textAlign = 'right'; g.fillStyle = 'rgba(255,233,168,0.9)'; g.fillText(cfg.board.tag, w - 50, 78); }
    });
    part(new THREE.BoxGeometry(BW + 0.3, BH + 0.3, 0.1), '#8A5F3A', BX, Y + 2.2, ZB + 0.05);
    A.board = plane(BW, BH, basic(boardDraw(-1)), BX, Y + 2.2, ZB + 0.11);
    part(new THREE.BoxGeometry(BW, 0.08, 0.22), '#8A5F3A', BX, Y + 0.93, ZB + 0.18);
    // 칠판 앞 초록 깔개(① 자리)
    const rugT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#7FC48A'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 10; g.strokeRect(18, 18, w - 36, h - 36); });
    flat(6.0, 3.0, new THREE.MeshLambertMaterial({ map: rugT }), BX, -3.0, 0.012).renderOrder = 1;

    // ② 바뀌는 무대(가운데): 바닥 판 + 북벽 큰 그림 + 교과별 꾸밈 묶음
    const SX = 0.6, SZ = -2.6, SW = 8.6, SD = 5.2;
    const gridT = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#141A46'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    A.stageGrid = flat(SW, SD, basic(gridT, { color: '#8A93C8' }), SX, SZ, 0.015); A.stageGrid.renderOrder = 1;
    const dashT = canvasTex(512, 320, (g, w, h) => { g.strokeStyle = '#FFD36B'; g.lineWidth = 12; g.setLineDash([34, 22]); g.strokeRect(10, 10, w - 20, h - 20); });
    flat(SW + 0.2, SD + 0.2, sheet(dashT), SX, SZ, 0.02);
    A.poster = plane(6.6, 2.4, basic(null, { color: '#FFFFFF' }), SX, Y + 2.25, ZB + 0.11);
    part(new THREE.BoxGeometry(6.9, 2.7, 0.08), '#FFFFFF', SX, Y + 2.25, ZB + 0.04);
    const posterDraw = (s) => canvasTex(1100, 400, (g, w, h) => {
      const col = s.color || '#FFFFFF', k = s.kind;
      g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, w, h);
      g.fillStyle = col; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (k === 'korean') { g.strokeStyle = '#E58C7A'; g.lineWidth = 3; for (let c = 0; c < 14; c++) for (let r = 0; r < 4; r++) g.strokeRect(80 + c * 68, 70 + r * 72, 68, 68); g.fillStyle = '#1E2B4A'; g.font = `700 50px ${FONT_B}`; '가나다라마바사아자차카타파하'.split('').forEach((ch, i) => g.fillText(ch, 114 + i * 68, 106)); }
      else if (k === 'math') { g.strokeStyle = '#B9C4DA'; g.lineWidth = 2; for (let x = 60; x < w - 40; x += 40) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, h - 40); g.stroke(); } for (let y = 40; y < h - 30; y += 40) { g.beginPath(); g.moveTo(60, y); g.lineTo(w - 60, y); g.stroke(); } g.strokeStyle = '#1E2B4A'; g.lineWidth = 5; g.beginPath(); g.moveTo(80, 320); g.lineTo(w - 80, 320); g.moveTo(140, 360); g.lineTo(140, 50); g.stroke(); g.strokeStyle = col; g.lineWidth = 8; g.beginPath(); for (let x = 140; x < w - 90; x += 6) { const u = (x - 140) / 380; g.lineTo(x, 320 - u * u * 70); } g.stroke(); g.fillStyle = '#1E2B4A'; g.font = `900 60px ${FONT_B}`; g.fillText('y = x²', 860, 110); }
      else if (k === 'science') { const cs = ['#FCA5A5', '#FDE68A', '#A7F3D0', '#93C5FD', '#C4B5FD', '#F9A8D4']; for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) { if (r === 0 && c > 0 && c < 14) continue; g.fillStyle = cs[(c + r * 2) % cs.length]; g.fillRect(70 + c * 64, 60 + r * 70, 58, 62); g.fillStyle = '#1E2B4A'; g.font = `700 22px ${FONT_B}`; g.fillText(String(1 + r * 15 + c), 99 + c * 64, 91 + r * 70); } }
      else if (k === 'social') { g.fillStyle = '#BFE3F2'; g.fillRect(50, 40, w - 100, h - 80); g.fillStyle = '#7FBF6A'; [[230, 150, 120, 70], [330, 270, 60, 80], [540, 140, 70, 60], [580, 250, 70, 80], [780, 160, 150, 80], [900, 290, 60, 40]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, 0.3, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#E0483E'; [[250, 140], [560, 150], [820, 170]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); }); g.strokeStyle = 'rgba(30,43,74,0.25)'; g.lineWidth = 2; for (let x = 50; x < w - 50; x += 100) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, h - 40); g.stroke(); } }
      else if (k === 'english') { g.fillStyle = '#1E2B4A'; g.font = `900 150px ${FONT_B}`; g.fillText('A  B  C', w / 2, 170); g.fillStyle = col; g.font = `800 64px ${FONT_B}`; g.fillText('Hello! Nice to meet you.', w / 2, 310); }
      else { const cs = ['#EF4444', '#F59E0B', '#FDE047', '#22C55E', '#3B82F6', '#8B5CF6']; cs.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(170 + i * 70, 200, 46, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#1E2B4A'; g.font = `900 150px ${FONT_B}`; g.fillText('♪ ♫ ♪', 820, 200); }
    });

    // 교과별 꾸밈(무대 가운데 기준 좌표). 고르면 바뀌기 전 묶음은 작아져 사라지고 새 묶음이 커지며 나타난다
    const setOf = (kind, color) => {
      const g = new THREE.Group(), Q = [], bob = [], spin = [];
      const q = (geo, c, x, y, z) => Q.push(colored(geo.translate(x, y, z), c));
      const add = (o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };
      if (kind === 'korean') {
        [-3.0, 3.0].forEach(cx => { q(new THREE.BoxGeometry(1.9, 2.2, 0.45), '#8A5F3A', cx, 1.1, -1.9); for (let s = 0; s < 3; s++) for (let b = 0; b < 6; b++) q(new THREE.BoxGeometry(0.24, 0.5 + (b % 2) * 0.08, 0.32), ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'][(s + b) % 6], cx - 0.74 + b * 0.3, 0.36 + s * 0.72, -1.72); });
        q(new THREE.BoxGeometry(2.4, 0.08, 1.2), '#D9B38C', 0, 0.78, 0.0); [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(([a, b]) => q(new THREE.BoxGeometry(0.07, 0.76, 0.07), '#7B8494', a, 0.38, b));
        q(new THREE.BoxGeometry(1.0, 0.04, 0.7), '#FFF9EC', 0, 0.84, 0.0);
        ['가', '나', '다'].forEach((ch, i) => bob.push(add(glyph(ch, color, 0.9), -1.2 + i * 1.2, 2.1 + i * 0.15, -0.4)));
      } else if (kind === 'math') {
        [-2.4, 0, 2.4].forEach(x => q(new THREE.BoxGeometry(0.9, 0.7, 0.9), '#E8E2F5', x, 0.35, -0.6));
        const cube = add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), glow(color, 0.35)), -2.4, 1.3, -0.6); cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: '#FFFFFF' }))); spin.push(cube);
        const cone = add(new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 24), new THREE.MeshLambertMaterial({ color: '#FFB36B' })), 0, 1.2, -0.6); spin.push(cone);
        const sph = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), new THREE.MeshBasicMaterial({ color, wireframe: true })), 2.4, 1.25, -0.6); spin.push(sph);
        ['+', '×', 'π', '='].forEach((ch, i) => bob.push(add(glyph(ch, '#FFFFFF', 0.7), -2.7 + i * 1.8, 2.6 + (i % 2) * 0.3, -1.4)));
      } else if (kind === 'science') {
        [-1.9, 2.1].forEach(cx => { q(new THREE.BoxGeometry(2.6, 0.86, 1.1), '#E6EEF5', cx, 0.43, -0.4); q(new THREE.BoxGeometry(2.7, 0.08, 1.2), '#2E3A55', cx, 0.9, -0.4); });
        [['#7DD3FC', -2.6], ['#F9A8D4', -2.0], ['#FDE68A', -1.4]].forEach(([c, x]) => { q(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 14), c, x, 1.15, -0.4); });
        q(new THREE.SphereGeometry(0.26, 14, 10), '#A7F3D0', 1.4, 1.2, -0.4); q(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 10), '#A7F3D0', 1.4, 1.5, -0.4);
        q(new THREE.BoxGeometry(0.3, 0.08, 0.36), '#3B3F4A', 2.6, 0.98, -0.4); q(new THREE.BoxGeometry(0.08, 0.5, 0.08), '#3B3F4A', 2.6, 1.22, -0.5); q(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 10), '#3B3F4A', 2.6, 1.42, -0.32);
        const holo = add(new THREE.Group(), 0.1, 2.4, -0.6); holo.rotation.x = 0.35;
        holo.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), basic(null, { color: '#FFD36B' })));
        [[0.6, '#7DD3FC', 0.7], [0.95, '#FF9F6B', 3.1]].forEach(([r, c, a]) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 6, 64), glow(color, 0.85)); ring.rotation.x = Math.PI / 2; holo.add(ring); const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), basic(null, { color: c })); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); holo.add(p); });
        spin.push(holo);
      } else if (kind === 'social') {
        q(new THREE.CylinderGeometry(0.06, 0.32, 0.9, 12), '#6B4A2E', -2.6, 0.45, -0.6);
        const gT = canvasTex(256, 128, (gg, w, h) => { gg.fillStyle = '#3B82F6'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#4ADE80'; [[40, 40, 30, 22], [70, 80, 18, 26], [140, 50, 36, 20], [180, 86, 22, 16], [220, 40, 18, 14]].forEach(([x, y, a, b]) => { gg.beginPath(); gg.ellipse(x, y, a, b, 0.4, 0, Math.PI * 2); gg.fill(); }); });
        const globe = add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), new THREE.MeshLambertMaterial({ map: gT })), -2.6, 1.6, -0.6); globe.rotation.z = 0.4; spin.push(globe);
        q(new THREE.BoxGeometry(3.0, 0.78, 1.7), '#9A6B42', 1.4, 0.39, -0.4);
        const mapT = canvasTex(512, 300, (gg, w, h) => { gg.fillStyle = '#BFE3F2'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#7FBF6A'; [[120, 100, 70, 50], [180, 210, 40, 50], [300, 90, 40, 40], [320, 190, 40, 50], [430, 120, 60, 50]].forEach(([x, y, a, b]) => { gg.beginPath(); gg.ellipse(x, y, a, b, 0.3, 0, Math.PI * 2); gg.fill(); }); });
        const mp = add(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), new THREE.MeshLambertMaterial({ map: mapT })), 1.4, 0.8, -0.4); mp.rotation.x = -Math.PI / 2;
        [[0.6, -0.7], [1.8, -0.2], [2.3, -0.8]].forEach(([x, z]) => q(new THREE.ConeGeometry(0.08, 0.3, 10), '#E0483E', x, 0.95, z));
        bob.push(add(glyph('N', color, 0.8), 1.4, 2.4, -1.2));
      } else if (kind === 'english') {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'], cs = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
        [[-0.7, 0.3], [0, 0.3], [0.7, 0.3], [-0.35, 0.9], [0.35, 0.9], [0, 1.5]].forEach(([x, y], i) => {
          const t = canvasTex(128, 128, (gg, w, h) => { gg.fillStyle = cs[i]; gg.fillRect(0, 0, w, h); gg.fillStyle = '#FFFFFF'; gg.fillRect(10, 10, w - 20, h - 20); gg.fillStyle = cs[i]; gg.font = `900 92px ${FONT_B}`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(letters[i], w / 2, h / 2 + 4); });
          const b = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ map: t })), x - 1.6, y, -0.6); b.rotation.y = (i - 2) * 0.12;
        });
        bob.push(add(bubble('Hello!', color), 1.6, 2.2, -0.8)); bob.push(add(bubble('Nice to meet you.', color), -1.4, 2.8, -1.4));
        q(new THREE.BoxGeometry(1.4, 0.7, 0.9), '#D9B38C', 2.0, 0.35, -0.4);
      } else {
        q(new THREE.BoxGeometry(0.08, 2.0, 0.08), '#8A5F3A', -3.0, 1.0, -0.4); q(new THREE.BoxGeometry(0.08, 2.0, 0.08), '#8A5F3A', -2.0, 1.0, -0.4); q(new THREE.BoxGeometry(0.08, 1.9, 0.08), '#8A5F3A', -2.5, 0.95, -0.9);
        const pT = canvasTex(256, 200, (gg, w, h) => { gg.fillStyle = '#FFFDF7'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#7CC4FF'; gg.fillRect(0, 0, w, 110); gg.fillStyle = '#FDE047'; gg.beginPath(); gg.arc(200, 50, 26, 0, Math.PI * 2); gg.fill(); gg.fillStyle = '#4D9B4F'; gg.beginPath(); gg.moveTo(0, 150); gg.quadraticCurveTo(90, 70, 180, 140); gg.lineTo(256, 120); gg.lineTo(256, 200); gg.lineTo(0, 200); gg.closePath(); gg.fill(); gg.strokeStyle = '#8A5F3A'; gg.lineWidth = 10; gg.strokeRect(0, 0, w, h); });
        const cv = add(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), new THREE.MeshLambertMaterial({ map: pT })), -2.5, 1.45, -0.36); cv.rotation.x = -0.12;
        q(new THREE.BoxGeometry(2.3, 0.8, 0.8), '#1C1C22', 1.2, 0.4, -0.6);
        const kT = canvasTex(512, 96, (gg, w, h) => { gg.fillStyle = '#FFFFFF'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#1C1C22'; for (let i = 0; i < 22; i++) gg.fillRect(i * 23.3, 0, 2, h); for (let i = 0; i < 22; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) gg.fillRect(i * 23.3 + 15, 0, 14, h * 0.6); });
        const keys = add(new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.4), basic(kT)), 1.2, 0.81, -0.35); keys.rotation.x = -Math.PI / 2;
        q(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 20), '#E0483E', 3.2, 0.25, -0.2); q(new THREE.CylinderGeometry(0.41, 0.41, 0.06, 20), '#FFFFFF', 3.2, 0.52, -0.2);
        const ball = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshLambertMaterial({ color: '#F59E0B' })), -0.6, 0.3, 0.8); spin.push(ball);
        ['♪', '♫'].forEach((ch, i) => bob.push(add(glyph(ch, color, 0.8), 0.6 + i * 1.4, 2.0 + i * 0.4, -1.0)));
      }
      if (Q.length) g.add(new THREE.Mesh(merge(Q), new THREE.MeshLambertMaterial({ vertexColors: true })));
      bob.forEach(o => { o.userData.y = o.position.y; });
      g.position.set(SX, Y, SZ); g.scale.setScalar(0.001); g.visible = false; scene.add(g);
      return { g, bob, spin, k: 0 };
    };
    A.sets = SUBJ.map(s => setOf(s.kind, s.color || '#FFFFFF'));
    coll.push({ x: SX, z: SZ - 0.5, r: 3.6 });
    { const ss = signSprite((cfg.stage || {}).title || '', (cfg.stage || {}).sub || '', { scene, bg: '#FFD36B', fg: '#1E2B4A', w: 4.2 }); ss.userData.anchor = [SX, Y + 3.95, ZB + 0.4]; signs.push(ss); A.stageSign = ss; }

    // ③ 세 가지로 보기: 지도안(독서대 위 책) · 수업 영상(북벽 TV) · 학생 결과물(책장 위 사진첩)
    const VX = [7.4, 10.4, 13.2], VZ = -1.0;
    part(new THREE.BoxGeometry(1.5, 0.75, 0.9), '#B8865B', VX[0], Y + 0.375, -3.9);
    const lessonT = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#FFF9EC'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(w / 2 - 6, 0, 12, h); g.strokeStyle = 'rgba(30,43,74,0.18)'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(30, 70 + i * 32); g.lineTo(w / 2 - 30, 70 + i * 32); g.moveTo(w / 2 + 30, 70 + i * 32); g.lineTo(w - 30, 70 + i * 32); g.stroke(); } });
    { const bk = plane(1.2, 0.75, basic(lessonT), VX[0], Y + 0.8, -3.85); bk.rotation.x = -Math.PI / 2 + 0.35; }
    coll.push({ x: VX[0], z: -3.9, r: 0.95 });
    part(new THREE.BoxGeometry(3.0, 1.7, 0.12), '#1C1C22', VX[1], Y + 2.15, ZB + 0.08);
    const tvT = canvasTex(512, 288, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1C2740'); gr.addColorStop(1, '#2E4A7A'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(w / 2, h / 2, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1C2740'; g.beginPath(); g.moveTo(w / 2 - 14, h / 2 - 26); g.lineTo(w / 2 + 26, h / 2); g.lineTo(w / 2 - 14, h / 2 + 26); g.closePath(); g.fill(); });
    plane(2.8, 1.5, basic(tvT), VX[1], Y + 2.15, ZB + 0.15);
    part(new THREE.BoxGeometry(2.6, 0.5, 0.6), '#6B4A2E', VX[1], Y + 0.25, ZB + 0.45);
    part(new THREE.BoxGeometry(2.0, 2.4, 0.5), '#8A5F3A', VX[2], Y + 1.2, ZB + 0.3);
    for (let s = 0; s < 3; s++) for (let b = 0; b < 5; b++) part(new THREE.BoxGeometry(0.3, 0.5, 0.3), ['#FDE68A', '#BFDBFE', '#FBCFE8', '#BBF7D0', '#DDD6FE'][(s + b) % 5], VX[2] - 0.66 + b * 0.33, Y + 0.4 + s * 0.75, ZB + 0.42);
    const albT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7A4E3A'; g.fillRect(0, 0, w, h); g.fillStyle = '#F6EFE2'; g.fillRect(34, 34, w - 68, h - 68); g.fillStyle = '#B9D7E8'; g.fillRect(52, 52, w - 104, h - 140); });
    { const al = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), basic(albT)); al.position.set(VX[2], Y + 2.47, ZB + 0.35); al.rotation.y = -0.2; scene.add(al); }
    coll.push({ x: VX[2], z: ZB + 0.4, r: 1.1 });
    // 사례가 들어갈 빈 액자(동쪽 벽)
    const frameT = canvasTex(320, 256, (g, w, h) => { g.fillStyle = '#F2D27A'; g.fillRect(0, 0, w, h); g.fillStyle = '#FFFDF7'; g.fillRect(22, 22, w - 44, h - 44); g.strokeStyle = '#C9A24A'; g.lineWidth = 5; g.setLineDash([16, 10]); g.strokeRect(40, 40, w - 80, h - 80); g.setLineDash([]); g.strokeStyle = '#C9A24A'; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2 - 26, h / 2); g.lineTo(w / 2 + 26, h / 2); g.moveTo(w / 2, h / 2 - 26); g.lineTo(w / 2, h / 2 + 26); g.stroke(); });
    { const fr = plane(1.9, 1.5, basic(frameT), -X0 - 0.02, Y + 2.0, 1.4); fr.rotation.y = -Math.PI / 2;
      const fs = signSprite((cfg.slot || {}).title || '', (cfg.slot || {}).sub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.4 }); fs.userData.anchor = [-X0 - 1.2, Y + 3.4, 1.4]; signs.push(fs); }

    // 학생 책상(남쪽 줄)
    const desk = (x, z, chair) => {
      part(new THREE.BoxGeometry(1.25, 0.07, 0.78), '#E9DCC4', x, Y + 0.76, z);
      [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([a, b]) => part(new THREE.BoxGeometry(0.06, 0.74, 0.06), '#7B8494', x + a, Y + 0.37, z + b));
      part(new THREE.BoxGeometry(0.62, 0.06, 0.58), chair, x, Y + 0.46, z + 0.78); part(new THREE.BoxGeometry(0.62, 0.56, 0.06), chair, x, Y + 0.76, z + 1.06);
      coll.push({ x, z: z + 0.35, r: 0.95 });
    };
    desk(-6.2, 2.6, '#7DD3FC'); desk(-3.4, 2.6, '#FDA4AF'); desk(7.4, 2.6, '#A7F3D0'); desk(10.4, 2.6, '#FDE68A'); desk(13.2, 2.6, '#C4B5FD');

    // 바닥 화살표(① → ② → ③)
    const arrowT = canvasTex(256, 128, (g) => { g.strokeStyle = '#FFD36B'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; [56, 128].forEach(x0 => { g.beginPath(); g.moveTo(x0, 24); g.lineTo(x0 + 50, 64); g.lineTo(x0, 104); g.stroke(); }); });
    [-4.4, 5.6].forEach(x => flat(1.5, 0.75, sheet(arrowT), x, 0.4, 0.05));

    // 리니(입구 안내 로봇)
    const RX = X0 + 2.4, RZ = -2.8;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }

    // 별(창밖 우주)
    { const n = 600, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, e = Math.acos(rnd() * 2 - 1), r = 150; sp[i * 3] = r * Math.sin(e) * Math.cos(a); sp[i * 3 + 1] = Y + r * Math.cos(e); sp[i * 3 + 2] = r * Math.sin(e) * Math.sin(a); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.8 }))); }

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    // 발판: 리니 · ① 교과 고르기 · ② 바뀐 교실 · ③ 책·TV·사진첩 · 문
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => { g.beginPath(); g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2); g.fillStyle = 'rgba(30,24,50,0.72)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke(); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, text, '900', 120, FONT_B, w * 0.7); g.fillText(text, w / 2, h / 2 - (sub ? 30 : 0)); if (sub) { fitFont(g, sub, '700', 54, FONT_B, w * 0.72); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText(sub, w / 2, h / 2 + 74); } });
    const ST = cfg.steps || {};
    const padAt = (x, z, t, sub, c) => flat(2.2, 2.2, sheet(padT(t, sub, c)), x, z, 0.06);
    const curSubj = () => SUBJ[A.sel] || null;
    const view = kind => {
      const s = curSubj();
      if (!s) { pickSubject(); return; }
      const tp = (cfg.caseTemplate || {})[kind] || {}, own = s[kind] || {};
      const v = {}; Object.keys(tp).forEach(k => { v[k] = typeof tp[k] === 'string' ? fill(tp[k], s) : tp[k]; }); Object.assign(v, own);
      if (kind === 'book') openBook(v); else if (kind === 'tv') openTV(v); else openAlbum(v);
      A.seen.add(kind);
      if (!A.stamped && A.seen.size >= 3 && cfg.stampId) { A.stamped = true; A.stampDue = true; }
    };
    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: RX, z: RZ + 1.6, r: 1.3, go: () => talk() },
      { id: 'pick', name: ST.pick || '', sub: ST.pickSub || '', btn: ST.pickBtn || T.start, x: BX, z: -1.4, r: 1.3, pad: padAt(BX, -1.4, '①', ST.pickPad || '', '#7FC48A'), go: () => pickSubject() },
      { id: 'stage', name: ST.stage || '', sub: ST.stageSub || '', btn: ST.stageBtn || T.next, x: SX, z: 1.4, r: 1.3, pad: padAt(SX, 1.4, '②', ST.stagePad || '', '#FFD36B'), go: () => pickSubject() },
      { id: 'book', name: T.bookSign, sub: ST.bookSub || '', btn: T.open, x: VX[0], z: VZ, r: 1.2, pad: padAt(VX[0], VZ, '③', T.bookSign, '#FFB36B'), go: () => view('book') },
      { id: 'tv', name: T.tvSign, sub: ST.tvSub || '', btn: T.watch, x: VX[1], z: VZ, r: 1.2, pad: padAt(VX[1], VZ, '③', T.tvSign, '#6FE9FF'), go: () => view('tv') },
      { id: 'album', name: T.albumSign, sub: ST.albumSub || '', btn: T.photos, x: VX[2], z: VZ, r: 1.2, pad: padAt(VX[2], VZ, '③', T.albumSign, '#FF6FD8'), go: () => view('album') },
      { id: 'door', name: T.exitName || '지도로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: X0 + 1.6, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    { const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#FFD36B'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); }));
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(spots[0].x, Y + 0.03, spots[0].z); pad.renderOrder = 2; scene.add(pad); spots[0].pad = pad; }
    for (const sp of spots) {
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }
    [['①', ST.pick, ST.pickSub, BX, '#7FC48A'], ['③', ST.view, ST.viewSub, VX[1], '#FF9F6B']].forEach(([n, t, s, x, c]) => { if (!t) return; const sg = signSprite(n + ' ' + t, s || '', { scene, bg: c, fg: '#1E2B4A', w: 4.4 }); sg.userData.anchor = [x, Y + 3.95, ZB + 0.4]; signs.push(sg); });

    // 교과 고르기: 회화 창에 교과 버튼 6개. 고르면 칠판·무대·벽 그림이 바뀌고 무대 앞 발판까지 걸어간다
    function pickSubject() {
      const who = pr.name || T.principal;
      const btns = SUBJ.map((s, i) => ({ label: s.name + (i === A.sel ? ' ✓' : ''), choice: true, go: () => { closePop(); setSubject(i); if (R.me) R.me.target = { x: SX, z: 1.4, stuck: 0 }; } }));
      btns.push({ label: T.close, go: closePop });
      talkUI(who, ST.ask || T.choose, btns, { speak: false });
    }
    function setSubject(i) {
      const s = SUBJ[i]; if (!s || i === A.sel) return;
      A.sel = i;
      const old = A.board.material.map; A.board.material.map = boardDraw(i); old.dispose();
      const op = A.poster.material.map; A.poster.material.map = posterDraw(s); if (op) op.dispose(); A.poster.material.needsUpdate = true;
      A.stageGrid.material.color.set(s.color || '#8A93C8');
      if (s.line) showToast(s.line, 4.5);
    }
    A.pick = pickSubject;

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => x > X0 + 0.35 && x < -X0 - 0.35 && z > ZB + 0.35 && z < HD - 0.3,
      camD: () => clamp(21 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= RW + 1.5 ? 0 : clamp(me.x, X0 + hw - 0.6, -X0 - hw + 0.6),
        hd * 2 >= 2 * HD + 2.5 ? -2.9 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, ZB + hd - 1.9, HD - hd + 1.7)
      ],
      spawn: { x: X0 + 3.2, z: 1.2, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'cases', anim: A };
    return R.built;
  }
  function updateCases(dt, me) {
    const A = R.built.anim; A.t += dt;
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    const k = 1 - Math.exp(-dt * 5);
    A.sets.forEach((s, i) => {
      const want = i === A.sel ? 1 : 0;
      s.k += (want - s.k) * k; if (Math.abs(want - s.k) < 0.002) s.k = want;
      s.g.visible = s.k > 0.003; s.g.scale.setScalar(Math.max(0.001, s.k));
      if (!s.g.visible) return;
      s.spin.forEach(o => { o.rotation.y += dt * 0.7; });
      s.bob.forEach((o, j) => { o.position.y = o.userData.y + Math.sin(A.t * 1.5 + j) * 0.12; });
    });
    /* 세 가지를 다 본 뒤 팝업을 닫으면 도장 */
    if (A.stampDue && !R.open) { A.stampDue = false; stamp(R.built.cfg.stampId); }
  }
  HALLS.concept = [buildConcept, updateConcept];
  HALLS.cases = [buildCases, updateCases];

  /* ==== hall:village 시작 ==== */
  // ── 깨어나는 마을(AI가 지은 섬, 2026-10-09 XR개발부) — 부탁 하나 따라가기 ──
  // 기획안 핸드오프\20261009-AI가상세계.md 4절. 서쪽 입구에서 동쪽으로 정거장 여섯: ① 부탁 우체통(깨어나기) ② 도구 창고·멈춘 게시판 ③ 쌍둥이 작업장(나뉘기)
  // ④ 메모 탑(잊기 전에 메모) ⑤ 사람 확인 종 ⑥ 결과 우체통(다시 기다리기) → 도장. 주민 하나가 깨어나 방문자를 따라다닌다. 글은 lobby.config.js rooms.village(모두 [확인 전]).
  function buildVillage(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#D9B3D6');
    scene.fog = new THREE.Fog(cfg.sky || '#D9B3D6', 40, 110);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a8d8, 0.62));
    const sun = new THREE.DirectionalLight(0xfff0e6, 0.5); sun.position.set(-14, 26, 18); scene.add(sun);
    const ST = cfg.stations || [], NS = ST.length || 6, SW = 6.6, X0 = -SW * NS / 2, HD = 6.2, PADZ = 2.6, OBJZ = -2.4;
    const sx = i => X0 + SW * (i + 0.5);
    const pr = cfg.principal || {};
    const coll = [], signs = [], hit = [];
    const A = { t: 0, step: 0, X0, SW, NS, res: null, twins: [], mem: 0.08, memGoal: 0.08, wake: 0, follow: false, bell: null, ring: [], memo: [], memoOn: 0, scope: null, split: 0, splitGoal: 0, streams: [], leds: [], padMesh: [], stSigns: [], done: false, req: null, shelf: [] };
    let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });
    const W = SW * NS;

    // 바닥: 연민트 결정 판 + 회로 선 + 가운데 빛 길(화살표). 받침은 두껍게, 둘레 빛 테
    const floorT = canvasTex(1024, 330, (g, w, h) => {
      g.fillStyle = '#CDEBE6'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(111,200,230,0.35)'; g.lineWidth = 2;
      for (let i = 0; i < 70; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 3; s++) { if (s % 2) y += (rnd() - 0.5) * 70; else x += (rnd() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); g.fillStyle = 'rgba(111,200,230,0.5)'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
      const py = h * (HD + PADZ) / (2 * HD);
      g.fillStyle = 'rgba(185,162,255,0.28)'; g.fillRect(0, py - 22, w, 44);
    });
    const fl = flat(W, 2 * HD, new THREE.MeshLambertMaterial({ map: floorT }), 0, 0, 0); fl.renderOrder = 0;
    part(new THREE.BoxGeometry(W + 0.8, 1.2, 2 * HD + 0.8), '#8E80D6', 0, Y - 0.61, 0);
    { const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.8, 0.02, 2 * HD + 0.8)), new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.8 })); eg.position.set(0, Y + 0.01, 0); scene.add(eg); }
    const arrowT = canvasTex(256, 128, (g) => { g.strokeStyle = '#FFFFFF'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; [56, 128].forEach(x0 => { g.beginPath(); g.moveTo(x0, 24); g.lineTo(x0 + 50, 64); g.lineTo(x0, 104); g.stroke(); }); });
    for (let k = 1; k < NS; k++) flat(1.3, 0.65, basic(arrowT, { color: '#B9A2FF', transparent: true, depthWrite: false }), X0 + SW * k, PADZ, 0.05);
    // 북쪽 멀리: 서버 숲(깜빡이는 불빛) — 밥 대신 전기
    const ledG = [];
    for (let i = 0; i < 14; i++) {
      const x = X0 + 1.5 + i * (W - 3) / 13 + (rnd() - 0.5), z = -HD - 2.6 - rnd() * 2.0, h = 1.5 + rnd() * 1.3;
      part(new THREE.BoxGeometry(1.1, h, 0.8), i % 2 ? '#8A80D0' : '#7A70C4', x, Y + h / 2 - 0.3, z);
      for (let j = 0; j < 6; j++) ledG.push([x - 0.3 + (j % 3) * 0.3, Y + 0.3 + Math.floor(j / 3) * 0.55 + h * 0.35, z + 0.41]);
    }
    { const lm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.09), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), ledG.length); const mm = new THREE.Matrix4();
      ledG.forEach((p, i) => { mm.makeTranslation(p[0], p[1], p[2]); lm.setMatrixAt(i, mm); lm.setColorAt(i, new THREE.Color('#9FF0DC')); A.leds.push({ i, ph: rnd() * 6.28, sp: 2 + rnd() * 5 }); });
      scene.add(lm); A.ledMesh = lm; }
    { const s = signSprite(cfg.forest || '서버 숲', cfg.forestSub || '', { scene, bg: '#2A2466', fg: '#FFFFFF', w: 4 }); s.userData.anchor = [X0 + W * 0.5, Y + 3.0, -HD - 3.2]; signs.push(s); }

    // 주민 만들기: 둥근 빛 몸 + 눈 + 더듬이 구슬. 평소 희미, 깨어나면 밝다
    const makeRes = (col) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: col || '#E6E0FF', transparent: true, opacity: 0.35, emissive: '#7C6CE0', emissiveIntensity: 0.2 });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), mat); b.scale.set(1, 1.12, 1); g.add(b);
      const eyeM = new THREE.MeshBasicMaterial({ color: '#2FD6C0', transparent: true, opacity: 0.4 });
      [-0.2, 0.2].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eyeM); e.scale.set(1, 1.3, 0.6); e.position.set(ex, 0.12, 0.57); g.add(e); });
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 5), new THREE.MeshLambertMaterial({ color: '#B9A2FF' })); ant.position.y = 0.82; g.add(ant);
      const bulbM = new THREE.MeshBasicMaterial({ color: '#FFB3D9', transparent: true, opacity: 0.5 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bulbM); bulb.position.y = 1.02; g.add(bulb);
      scene.add(g);
      return { g, mat, eyeM, bulbM, on: 0 };
    };
    const setOn = (r, k) => { r.on = k; r.mat.opacity = 0.32 + k * 0.66; r.mat.emissiveIntensity = 0.2 + k * 0.55; r.eyeM.opacity = 0.35 + k * 0.65; r.bulbM.opacity = 0.4 + k * 0.6; };
    // 배경 주민들(기다리는 중) + 그 사이를 흐르는 빛 글자 줄(주민끼리는 말 대신 글자로 주고받는다)
    const bgRes = [];
    [[X0 + 3.2, -4.6], [X0 + 13.5, -4.9], [X0 + 25.5, -4.6], [X0 + 35, -4.8]].forEach(([x, z], i) => { const r = makeRes(['#E6E0FF', '#DDF7F0', '#FFE4F2', '#E0F0FF'][i]); r.g.position.set(x, Y + 0.9, z); r.y = Y + 0.9; r.ph = rnd() * 6; bgRes.push(r); coll.push({ x, z, r: 0.7 }); });
    A.bgRes = bgRes;
    const glyphT = ch => canvasTex(64, 64, (g, w, h) => { g.fillStyle = 'rgba(159,240,220,1)'; g.font = `900 46px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 2); });
    const GL = ['가', 'A', '0', '1', '?', '말', 'b', '…'].map(glyphT);
    [[0, 1], [2, 3]].forEach(([a, b]) => {
      const pa = bgRes[a].g.position, pb = bgRes[b].g.position;
      for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GL[k % GL.length], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(0.45, 0.45, 1); scene.add(s); A.streams.push({ s, a: pa, b: pb, u: k / 9 }); }
    });

    // 정거장 소품
    const S = cfg.props || {};
    // ① 부탁 우체통
    const mailbox = (x, z, col) => { part(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8), '#8E80D6', x, Y + 0.5, z); part(new THREE.BoxGeometry(1.0, 0.8, 0.7), col, x, Y + 1.35, z); part(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), col, x, Y + 1.75, z); coll.push({ x, z, r: 0.65 }); };
    mailbox(sx(0) + 0.6, OBJZ, '#7C6CE0');
    { const slot = plane(0.55, 0.08, basic(null, { color: '#2A2466' }), sx(0) + 0.6, Y + 1.5, OBJZ + 0.36); slot.renderOrder = 3; }
    // ② 도구 창고(선반 + 도구 셋) + 멈춘 게시판
    const tx = sx(1);
    part(new THREE.BoxGeometry(3.4, 0.12, 1.0), '#D9D2F2', tx - 0.5, Y + 1.2, OBJZ - 0.6); part(new THREE.BoxGeometry(3.4, 0.12, 1.0), '#D9D2F2', tx - 0.5, Y + 2.2, OBJZ - 0.6);
    [-2.1, 1.1].forEach(dx => part(new THREE.BoxGeometry(0.12, 2.4, 1.0), '#BDB3E6', tx + dx, Y + 1.2, OBJZ - 0.6));
    coll.push({ x: tx - 0.5, z: OBJZ - 0.6, r: 1.6 });
    const tool = (kind, x, y, z) => {
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      if (kind === 'scope') { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.9, 12), new THREE.MeshLambertMaterial({ color: '#8FD8FF' })); t.rotation.z = 1.2; g.add(t); const l = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glow('#FFFFFF', 0.9)); l.position.set(0.42, 0.16, 0); l.rotation.y = Math.PI / 2; g.add(l); }
      else if (kind === 'calc') { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.66, 0.1), new THREE.MeshLambertMaterial({ color: '#FFD27F' }))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.14), basic(null, { color: '#2A2466' })); sc.position.set(0, 0.18, 0.06); g.add(sc); }
      else { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 8), new THREE.MeshLambertMaterial({ color: '#C9A0FF' })); h.rotation.z = 0.5; g.add(h); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 8), new THREE.MeshLambertMaterial({ color: '#FF9AD5' })); tip.position.set(-0.24, -0.42, 0); tip.rotation.z = 0.5 + Math.PI; g.add(tip); }
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), glow('#9FF0DC', 0)); g.add(halo); g.userData.halo = halo;
      return g;
    };
    A.shelf = [tool('calc', tx - 1.5, Y + 1.65, OBJZ - 0.5), tool('scope', tx - 0.5, Y + 1.62, OBJZ - 0.5), tool('brush', tx + 0.5, Y + 1.7, OBJZ - 0.5)];
    A.scope = A.shelf[1];
    const toolNames = S.tools || ['계산기', '검색 망원경', '그림 붓'];
    toolNames.forEach((n, i) => { const s = signSprite(n, '', { scene, w: 1.9 }); s.userData.anchor = [tx - 1.5 + i, Y + (i % 2 ? 2.95 : 2.35), OBJZ - 0.2]; signs.push(s); });
    const boardT = canvasTex(512, 380, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 26); g.fillStyle = '#FFF8F0'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#8E80D6'; g.stroke();
      g.fillStyle = '#2A2466'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, S.boardTitle || '마을 게시판', '900', 50, FONT_B, w - 60); g.fillText(S.boardTitle || '마을 게시판', w / 2, 62);
      rr(g, 140, 104, 232, 170, 18); g.fillStyle = '#E8E2FF'; g.fill(); g.fillStyle = '#E0483E'; g.fillRect(140, 104, 232, 40);
      g.fillStyle = '#2A2466'; g.font = `900 96px ${FONT_B}`; g.fillText('?', w / 2, 212);
      g.fillStyle = '#4A5874'; fitFont(g, S.boardLine || '', '700', 34, FONT_B, w - 50); g.fillText(S.boardLine || '', w / 2, 320);
    });
    part(new THREE.BoxGeometry(0.12, 2.6, 0.12), '#8E80D6', tx + 2.3, Y + 1.3, OBJZ - 0.2);
    { const b = plane(2.0, 1.48, basic(boardT), tx + 2.3, Y + 2.3, OBJZ - 0.1); b.renderOrder = 3; }
    coll.push({ x: tx + 2.3, z: OBJZ - 0.2, r: 0.4 });
    // ③ 쌍둥이 작업장: 작업대 셋(장소·준비물·시간표)
    const wx = sx(2);
    (S.desks || ['장소', '준비물', '시간표']).forEach((n, i) => {
      const x = wx - 2 + i * 2;
      part(new THREE.CylinderGeometry(0.75, 0.75, 0.14, 6), ['#B9A2FF', '#8FD8FF', '#FFB3D9'][i], x, Y + 0.95, OBJZ); part(new THREE.CylinderGeometry(0.12, 0.2, 0.95, 6), '#8E80D6', x, Y + 0.47, OBJZ);
      coll.push({ x, z: OBJZ, r: 0.8 });
      const s = signSprite(n, '', { scene, w: 2 }); s.userData.anchor = [x, Y + 1.15, OBJZ + 0.9]; signs.push(s);
    });
    // ④ 메모 탑: 육각 기둥, 메모 종이가 붙는다
    const mx = sx(3);
    part(new THREE.CylinderGeometry(0.8, 1.0, 3.4, 6), '#D8CCFF', mx, Y + 1.7, OBJZ - 0.9);
    { const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), glow('#B9A2FF', 0.9)); cap.position.set(mx, Y + 3.9, OBJZ - 0.9); scene.add(cap); A.memoCap = cap; }
    coll.push({ x: mx, z: OBJZ - 0.9, r: 1.1 });
    const memoT = (txt, col) => canvasTex(256, 200, (g, w, h) => { g.fillStyle = col; g.fillRect(6, 10, w - 12, h - 16); g.fillStyle = '#E0483E'; g.beginPath(); g.arc(w / 2, 14, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2A2466'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, txt, '900', 40, FONT_B, w - 40); g.fillText(txt, w / 2, h / 2 + 6); });
    A.memoMake = (txt, k) => { const m = plane(1.5, 1.17, sheet(memoT(txt, k ? '#D2F5E3' : '#FFF1A8')), mx + (k ? 0.5 : -0.5), Y + 1.3 + k * 1.25, OBJZ - 0.9 + 1.05); m.rotation.z = k ? -0.08 : 0.07; m.renderOrder = 4; m.scale.setScalar(0.01); A.memo.push(m); };
    // ⑤ 사람 확인 종: 아치 + 매달린 종
    const bx = sx(4);
    [-1.2, 1.2].forEach(dx => part(new THREE.CylinderGeometry(0.14, 0.18, 3.2, 8), '#BDB3E6', bx + dx, Y + 1.6, OBJZ));
    part(new THREE.TorusGeometry(1.2, 0.12, 8, 24, Math.PI), '#BDB3E6', bx, Y + 3.2, OBJZ);
    coll.push({ x: bx - 1.2, z: OBJZ, r: 0.3 }, { x: bx + 1.2, z: OBJZ, r: 0.3 });
    { const bell = new THREE.Group(); bell.position.set(bx, Y + 3.15, OBJZ); scene.add(bell);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 0.9, 20, 1, true), new THREE.MeshLambertMaterial({ color: '#FFD27F', side: THREE.DoubleSide })); b.position.y = -0.55; bell.add(b);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#FFD27F' })); top.position.y = -0.1; bell.add(top);
      const cl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshLambertMaterial({ color: '#C98A2E' })); cl.position.y = -1.0; bell.add(cl);
      A.bell = bell; A.bellT = -1; }
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 40), glow('#FFD27F', 0)); m.position.set(bx, Y + 2.6, OBJZ + 0.1); scene.add(m); A.ring.push(m); }
    // ⑥ 결과 우체통(내보내는 쪽)
    mailbox(sx(5) + 0.6, OBJZ, '#2FB89E');

    // 정거장 이름판·발판
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.35)); gr.addColorStop(0.8, hexA(color, 0.18)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke(); g.fillStyle = '#2A2466'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 150px ${FONT_B}`; g.fillText(text, w / 2, h / 2 - 22); g.font = `800 50px ${FONT_B}`; fitFont(g, sub, '800', 50, FONT_B, w * 0.66); g.fillText(sub, w / 2, h / 2 + 80); });
    ST.forEach((st, i) => {
      A.padMesh[i] = flat(2.3, 2.3, sheet(padT(String(i + 1), st.pad || '', st.color || '#B9A2FF')), sx(i), PADZ, 0.06);
      const sg = signSprite(st.title || '', st.sub || '', { scene, bg: st.color || '#FFFFFF', fg: '#1E2B4A', w: 4.6 });
      sg.userData.anchor = [sx(i), Y + 4.3, OBJZ - 1.2]; signs.push(sg); A.stSigns.push(sg);
    });

    // 리니(입구)
    const RX = X0 + 1.7, RZ = -1.2;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }
    // 입구 팻말
    { const gt = canvasTex(640, 300, (g, w, h) => { rr(g, 8, 8, w - 16, h - 16, 36); g.fillStyle = 'rgba(42,36,102,0.92)'; g.fill(); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; const L = cfg.gate || []; fitFont(g, L[0] || '', '900', 56, FONT_B, w - 60); g.fillText(L[0] || '', w / 2, 104); g.fillStyle = '#9FF0DC'; fitFont(g, L[1] || '', '800', 42, FONT_B, w - 60); g.fillText(L[1] || '', w / 2, 192); });
      part(new THREE.BoxGeometry(0.12, 2.2, 0.12), '#8E80D6', X0 + 1.0, Y + 1.1, -4.4); const gp = plane(2.6, 1.22, basic(gt), X0 + 1.0, Y + 2.4, -4.3); gp.renderOrder = 3; }

    // 따라다니는 주민(우체통 옆에서 기다린다) + 쌍둥이 둘 + 기억 막대
    const res = makeRes('#B9A2FF'); res.g.position.set(sx(0) - 0.9, Y + 0.95, OBJZ + 0.4); A.res = res; A.resHome = [sx(0) - 0.9, OBJZ + 0.4];
    for (let k = 0; k < 2; k++) { const t = makeRes(k ? '#FFB3D9' : '#7FE3C8'); t.g.visible = false; setOn(t, 1); A.twins.push(t); }
    { const bar = new THREE.Group(); bar.position.y = 1.55; res.g.add(bar);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.2), new THREE.MeshBasicMaterial({ color: '#2A2466', transparent: true, opacity: 0.85 })); bar.add(bg);
      const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12).translate(0.6, 0, 0), new THREE.MeshBasicMaterial({ color: '#9FF0DC' })); fg.position.set(-0.6, 0, 0.01); bar.add(fg);
      bar.visible = false; A.bar = bar; A.barFg = fg; }
    { const s = signSprite(cfg.resName || '주민', '', { scene, bg: '#FFFFFF', fg: '#2A2466', w: 2.0 }); s.userData.anchor = [0, 0, 0]; s.userData.follow = res.g; signs.push(s); A.resSign = s; }

    // 출입문 발판(서쪽 끝)
    const DOORZ = 4.4;
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(42,36,102,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '섬으로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '섬으로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), X0 + 1.6, DOORZ, 0.03);

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    // ── 미션 흐름 ──
    const goTo = (x, z) => { if (R.me) R.me.target = { x, z, stuck: 0 }; hideCard(); R.cur = null; };
    const who = () => cfg.resName || '주민';
    const say = (line, btns, opt) => talkUI(who(), line, btns, opt);
    const nextBtn = (i) => ({ label: i < NS - 1 ? (T.nextZone || '다음으로') : T.close, primary: true, go: () => { closePop(); if (i < NS - 1) goTo(sx(i + 1), PADZ); } });
    const advance = (i) => { A.step = Math.max(A.step, i + 1); };
    // 고르기 하나: st.ask + st.choices([{ko, ok, note|hint}]). 맞으면 then()
    const choose = (st, then, wrong) => {
      wrong = wrong || new Set();
      const btns = (st.choices || []).map((c, j) => ({ label: c.ko, choice: true, disabled: wrong.has(j), go: () => {
        if (c.ok) then(c);
        else { wrong.add(j); choose(st, then, wrong); const fb = $('talkFb'); fb.textContent = T.tryAgain + (c.hint ? ' ' + c.hint : ''); fb.className = 'fb no'; fb.hidden = false; }
      } }));
      say(st.line || '', btns, { ask: st.ask || T.choose, speak: !wrong.size });
    };
    const run = [
      // ① 부탁 우체통: 부탁 고르기 → 주민이 깨어난다
      (i, st) => {
        const reqs = cfg.requests || [];
        talkUI(st.title || '', st.line || '', reqs.map(q => ({ label: q.ko, choice: true, go: () => {
          A.req = q; A.wake = 1; A.follow = true; A.bar.visible = true; A.memGoal = 0.25;
          say(fill(st.after || '', { req: q.ko }), [nextBtn(i)]);
          advance(i);
        } })), { ask: st.ask || '' });
      },
      // ② 도구 창고: 알맞은 도구 고르기 → 망원경이 빛남 → 멈춘 게시판 한 줄
      (i, st) => choose(st, (c) => { A.scopeOn = 1; A.memGoal = 0.45; say((c.note ? c.note + ' ' : '') + (st.after || ''), [nextBtn(i)]); advance(i); }),
      // ③ 쌍둥이 작업장: 나누는 방법 고르기 → 셋으로 나뉘었다가 하나로
      (i, st) => { A.splitGoal = 1; A.memGoal = 0.62; choose(st, (c) => { say((c.note ? c.note + ' ' : '') + (st.after || ''), [{ label: st.mergeBtn || '하나로 합치기', primary: true, go: () => { A.splitGoal = 0; A.memGoal = 0.92; say(st.after2 || '', [nextBtn(i)]); advance(i); } }]); }); },
      // ④ 메모 탑: 남길 메모 두 개 고르기(차례로) → 메모가 붙고 기억 막대가 비워진다
      (i, st) => {
        const memos = st.memos || [], picked = [];
        const ask = (wrong) => {
          wrong = wrong || new Set();
          say(picked.length ? (st.line2 || '') : (st.line || ''), memos.map((m, j) => ({ label: m.ko, choice: true, disabled: wrong.has(j) || picked.includes(j), go: () => {
            if (!m.ok) { wrong.add(j); ask(wrong); const fb = $('talkFb'); fb.textContent = T.tryAgain + (m.hint ? ' ' + m.hint : ''); fb.className = 'fb no'; fb.hidden = false; return; }
            picked.push(j); A.memoMake(m.short || m.ko, picked.length - 1);
            if (picked.length >= 2) { A.memGoal = 0.1; A.memoOn = 1; say(st.after || '', [nextBtn(i)]); advance(i); }
            else ask();
          } })), { ask: fill(st.ask || '', { n: 2 - picked.length }), progress: fill(T.progress, { i: picked.length + 1, n: 2 }), speak: !wrong.size });
        };
        ask();
      },
      // ⑤ 사람 확인 종: 주민이 종을 울리고, 방문자(사람)가 정한다
      (i, st) => { A.bellT = 0; A.memGoal = 0.3; talkUI(who(), st.line || '', (st.choices || []).map(c => ({ label: c.ko, choice: true, go: () => { say((c.note || '') + ' ' + (st.after || ''), [nextBtn(i)]); advance(i); } })), { ask: st.ask || '' }); },
      // ⑥ 결과 우체통: 결과를 넣고 다시 희미해진다 → 리니 마무리 → 도장
      (i, st) => {
        say(st.line || '', [{ label: st.btn || '결과 넣기', primary: true, go: () => {
          A.follow = false; A.wake = 0; A.bar.visible = false; A.home2 = true; A.resHome2 = [sx(NS - 1) - 0.9, OBJZ + 0.4];
          talkUI(pr.name || T.principal, st.after || '', [{ label: T.close, primary: true, go: () => { closePop(); if (!A.done) { A.done = true; stamp(cfg.stampId); } } }], { feedback: T.done, fbKind: 'ok' });
        } }]);
      }
    ];
    const station = i => {
      const st = ST[i] || {};
      if (A.step < i) { showToast(st.wait || cfg.notYet || '앞 정거장부터 차례로 해요', 3.5); return; }
      if (A.step > i && i < NS - 1) { say(st.recap || st.after || '', [nextBtn(i)]); return; }
      run[i](i, st);
    };
    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: RX + 0.4, z: RZ + 1.6, r: 1.3, go: () => talk() },
      { id: 'door', name: T.exitName || '섬으로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: X0 + 1.6, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    ST.forEach((st, i) => spots.push({ id: 'st' + i, name: st.title || '', sub: st.sub || '', btn: st.btn || T.start, x: sx(i), z: PADZ, r: 1.25, pad: A.padMesh[i], go: () => station(i) }));
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#B9A2FF'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); }))); pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.85, pitch: 0.95,
      walk: (x, z) => x > X0 + 0.35 && x < X0 + W - 0.35 && z > -HD + 0.35 && z < HD - 0.3,
      camD: () => clamp(21 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= W + 1.5 ? 0 : clamp(me.x, X0 + hw - 0.6, X0 + W - hw + 0.6),
        hd * 2 >= 2 * HD + 2.5 ? -2.4 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, -HD + hd - 1.6, HD - hd + 1.7)
      ],
      spawn: { x: X0 + 3.0, z: 3.4, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'village', anim: A };
    return R.built;
  }
  function updateVillage(dt, me) {
    const A = R.built.anim; A.t += dt;
    const k6 = 1 - Math.exp(-dt * 6), k3 = 1 - Math.exp(-dt * 3);
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * k6; }
    // 서버 숲 불빛
    if (A.ledMesh) { const c = new THREE.Color(); A.leds.forEach(o => A.ledMesh.setColorAt(o.i, c.set(Math.sin(A.t * o.sp + o.ph) > 0.2 ? '#9FF0DC' : '#3A3478'))); A.ledMesh.instanceColor.needsUpdate = true; }
    // 배경 주민: 5초마다 한 명씩 잠깐 깨어남 + 빛 글자 줄
    const wk = Math.floor(A.t / 5) % A.bgRes.length, ph = (A.t % 5) / 5;
    A.bgRes.forEach((r, i) => { const on = i === wk ? Math.max(0, Math.sin(ph * Math.PI)) : 0; r.mat.opacity = 0.3 + on * 0.6; r.eyeM.opacity = 0.3 + on * 0.7; r.g.position.y = r.y + Math.sin(A.t * 0.8 + r.ph) * 0.1; });
    for (const s of A.streams) { s.u = (s.u + dt * 0.18) % 1; const u = s.u; s.s.position.set(s.a.x + (s.b.x - s.a.x) * u, s.a.y + 0.4 + Math.sin(u * Math.PI) * 1.2, s.a.z + (s.b.z - s.a.z) * u); s.s.material.opacity = Math.sin(u * Math.PI); }
    // 따라다니는 주민
    const r = A.res, g = r.g;
    setOnV(r, r.on + ((A.wake ? 1 : 0) - r.on) * k3);
    let tx, tz;
    if (A.follow) { tx = me.x - Math.sin(me.yaw) * 1.3 - Math.cos(me.yaw) * 1.0; tz = me.z - Math.cos(me.yaw) * 1.3 + Math.sin(me.yaw) * 1.0; }
    else if (A.home2) { tx = A.resHome2 ? A.resHome2[0] : g.position.x; tz = A.resHome2 ? A.resHome2[1] : g.position.z; }
    else { tx = A.resHome[0]; tz = A.resHome[1]; }
    g.position.x += (tx - g.position.x) * k3; g.position.z += (tz - g.position.z) * k3;
    g.position.y = Y + 0.95 + Math.sin(A.t * 1.6) * 0.1 + r.on * 0.25;
    { const dx = me.x - g.position.x, dz = me.z - g.position.z; g.rotation.y = Math.atan2(dx, dz); }
    if (A.resSign) A.resSign.userData.anchor = [g.position.x, g.position.y + (A.bar.visible ? 1.85 : 1.35), g.position.z];
    // 기억 막대(대화가 쌓이면 찬다. 거의 차면 분홍)
    A.mem += (A.memGoal - A.mem) * k3;
    if (A.barFg) { A.barFg.scale.x = Math.max(0.02, A.mem); A.barFg.material.color.set(A.mem > 0.8 ? '#FF7FB0' : '#9FF0DC'); A.bar.quaternion.copy(g.quaternion).invert(); }
    // 쌍둥이: 나뉘면 양옆으로 나왔다가 합치면 다시 몸 안으로
    A.split += (A.splitGoal - A.split) * k3;
    A.twins.forEach((t, i) => { t.g.visible = A.split > 0.03; const s = i ? 1 : -1; t.g.position.set(g.position.x + s * 1.5 * A.split, g.position.y, g.position.z - 0.4 * A.split); t.g.scale.setScalar(0.4 + 0.6 * A.split); t.g.rotation.y = g.rotation.y; });
    // 도구: 망원경이 빛나고 살짝 떠오른다
    if (A.scope) { const on = A.scopeOn || 0; A.scope.userData.halo.material.opacity = on * (0.25 + Math.sin(A.t * 4) * 0.1); A.scope.position.y = Y + 1.62 + on * (0.3 + Math.sin(A.t * 2) * 0.05); }
    // 메모: 붙을 때 커진다, 탑 꼭대기 반짝
    A.memo.forEach(m => { const s = m.scale.x + (1 - m.scale.x) * k6; m.scale.setScalar(s); });
    if (A.memoCap) { A.memoCap.rotation.y += dt * (0.6 + A.memoOn * 1.5); }
    // 종: 울리면 흔들리고 빛 고리가 퍼진다(3초)
    if (A.bellT >= 0) {
      A.bellT += dt;
      A.bell.rotation.z = Math.sin(A.bellT * 9) * 0.35 * Math.max(0, 1 - A.bellT / 3);
      A.ring.forEach((m, i) => { const u = ((A.bellT * 0.8) + i / 3) % 1; m.scale.setScalar(0.6 + u * 2.4); m.material.opacity = A.bellT < 3.2 ? (1 - u) * 0.8 : 0; });
      if (A.bellT > 3.4) A.bellT = -1;
    }
    // 정거장 이름판: 지금 할 차례만 또렷하게
    A.stSigns.forEach((s, i) => { s.material.opacity = i === Math.min(A.step, A.NS - 1) ? 1 : 0.6; });
    A.padMesh.forEach((p, i) => { if (!p) return; const cur = i === Math.min(A.step, A.NS - 1); p.material.opacity = cur ? 0.75 + Math.sin(A.t * 4) * 0.25 : (i < A.step ? 0.55 : 0.85); });
  }
  function setOnV(r, k) { r.on = k; r.mat.opacity = 0.32 + k * 0.66; r.mat.emissiveIntensity = 0.2 + k * 0.55; r.eyeM.opacity = 0.35 + k * 0.65; r.bulbM.opacity = 0.4 + k * 0.6; }
  HALLS.village = [buildVillage, updateVillage];
  /* ==== hall:village 끝 ==== */
  /* ==== hall:library 시작 ==== */
  // 기억의 도서관(AI가 지은 섬, 2026-10-09 XR개발부): 연보라 열람실의 책 탑들. 많이 본 주제는 높고 밝고, 거의 못 본 주제는 낮고 희미하다. 글은 lobby.config.js rooms.library([확인 전])
  function buildLibrary(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#7B66C4');
    scene.add(new THREE.HemisphereLight(0xf3e9ff, 0x6a5aa8, 0.95));
    const sun = new THREE.DirectionalLight(0xfff0e0, 0.6); sun.position.set(-10, 26, 16); scene.add(sun);
    const EX = 12.4, EZ = 6.6, WX = 11.6, WZ = 6.2;       // 바닥(눈에 보이는 타원)·걸을 수 있는 타원
    const pr = cfg.principal || {}, quiz = cfg.quiz || null, PADS = cfg.pads || [], TOW = cfg.towers || [], SH = cfg.shelf || {};
    const coll = [], signs = [], hit = [];
    const A = { t: 0, act: -2, tw: [], pads: [], padCfg: PADS, ghost: null, ghostMat: null, rini: null, motes: null };
    let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });

    // 바닥: 연보라 빛 타원 + 두꺼운 받침 + 가장자리 빛 테
    const floorT = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#F4EDFF'); gr.addColorStop(0.65, '#DCCFFF'); gr.addColorStop(1, '#BBA8F2');
      g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
      for (let r = 0.22; r < 1; r += 0.22) { g.beginPath(); g.arc(w / 2, h / 2, w / 2 * r, 0, Math.PI * 2); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 2; for (let a = 0; a < 12; a++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a / 12 * Math.PI * 2) * w / 2, h / 2 + Math.sin(a / 12 * Math.PI * 2) * h / 2); g.stroke(); }
    });
    { const f = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.MeshLambertMaterial({ map: floorT })); f.scale.set(EX, EZ, 1); f.rotation.x = -Math.PI / 2; f.position.y = Y; scene.add(f);
      const slab = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.96, 0.8, 72), new THREE.MeshLambertMaterial({ color: '#8E7BD8' })); slab.scale.set(EX + 0.2, 1, EZ + 0.2); slab.position.y = Y - 0.41; scene.add(slab);
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 72), glow('#FFD6F0', 0.85)); rim.scale.set(EX, EZ, 1); rim.rotation.x = -Math.PI / 2; rim.position.y = Y + 0.02; scene.add(rim); }
    // 뒤쪽 가장자리의 둥근 기둥들(둥근 열람실 느낌)
    for (let i = 0; i < 17; i++) {
      const a = Math.PI + 0.12 + i / 16 * (Math.PI - 0.24), x = Math.cos(a) * (EX - 0.5), z = Math.sin(a) * (EZ - 0.4);
      if (Math.abs(x - 5.7) < 2.4) continue;
      part(new THREE.CylinderGeometry(0.22, 0.28, 1.9, 10), '#CFC0FA', x, Y + 0.95, z);
      part(new THREE.SphereGeometry(0.3, 10, 8), i % 2 ? '#FFD6F0' : '#BFF3E6', x, Y + 2.05, z);
    }

    // 책 탑
    const BR = ['#FF9FCB', '#7FE3C8', '#FFD772', '#7CC9FF', '#B79BFF', '#FFA98F'], DM = ['#8D86A8', '#7A7498', '#9A94B2', '#6F6A8C'];
    const haloT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const TX = [-6.2, -3.8, -0.7, 1.7], TZ = -1.1;
    TOW.forEach((t, i) => {
      const x = TX[i], z = TZ, h = t.h || 3, n = Math.round(h / 0.32), br = !!t.bright, pal = br ? BR : DM;
      for (let k = 0; k < n; k++) part(new THREE.BoxGeometry(1.35 + rnd() * 0.3, 0.3, 1.0 + rnd() * 0.25).rotateY((rnd() - 0.5) * 0.35), pal[(k + i * 2) % pal.length], x + (rnd() - 0.5) * 0.12, Y + 0.16 + k * 0.32, z + (rnd() - 0.5) * 0.12);
      part(new THREE.CylinderGeometry(1.15, 1.3, 0.12, 20), br ? '#FFFFFF' : '#B7B0CC', x, Y + 0.06, z);
      const col = br ? '#FFF3A8' : '#CFCBE6';
      const bm = glow(col, 0), beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.12, 8, 16, 1, true).translate(0, 4, 0), bm); beam.position.set(x, Y + h, z); beam.scale.y = 0.2; beam.renderOrder = 3; scene.add(beam);
      const hm = new THREE.SpriteMaterial({ map: haloT, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const halo = new THREE.Sprite(hm); halo.position.set(x, Y + h + 0.4, z); scene.add(halo);
      const sg = signSprite(t.name || '', t.sub || '', { scene, bg: br ? '#FFF3C4' : '#CFCBE6', fg: '#2A2150', w: 2.7 }); sg.userData.anchor = [x, Y + h + 1.0, z]; signs.push(sg);
      coll.push({ x, z, r: 1.0 });
      A.tw.push({ i, pad: br ? 0 : 1, bright: br, beam, bm, halo, hm, hs: br ? 3.4 : 1.8, k: br ? 0.4 : 0.12, op: br ? 0.5 : 0.4 });
    });

    // 빈 책장: 왼쪽 몇 칸에만 책이 있고 나머지는 비어 있다(빛 테두리만)
    const SX = 5.7, SZ = -3.4, SW = 3.6, SHH = 3.0, ROWS = 3, COLS = 8, CW = SW / COLS, RH = SHH / ROWS;
    part(new THREE.BoxGeometry(SW + 0.3, SHH + 0.2, 0.15), '#B9A6F0', SX, Y + SHH / 2 + 0.1, SZ - 0.35);
    [-1, 1].forEach(s => part(new THREE.BoxGeometry(0.16, SHH + 0.2, 0.8), '#8E7BD8', SX + s * (SW / 2 + 0.07), Y + SHH / 2 + 0.1, SZ));
    for (let r = 0; r <= ROWS; r++) part(new THREE.BoxGeometry(SW + 0.3, 0.12, 0.8), '#8E7BD8', SX, Y + 0.06 + r * RH, SZ);
    const EL = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = SX - SW / 2 + CW * (c + 0.5), y = Y + 0.12 + r * RH;
      if (c < 3) part(new THREE.BoxGeometry(CW * 0.78, RH * (0.62 + rnd() * 0.25), 0.5), BR[(r + c) % BR.length], x, y + RH * 0.4, SZ);
      else { const g = new THREE.BoxGeometry(CW * 0.84, RH * 0.8, 0.5); g.translate(x, y + RH * 0.45, SZ); EL.push(new THREE.EdgesGeometry(g).attributes.position.array); }
    }
    { let n = 0; EL.forEach(a => { n += a.length; }); const ea = new Float32Array(n); let o = 0; EL.forEach(a => { ea.set(a, o); o += a.length; });
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ea, 3));
      A.ghostMat = new THREE.LineBasicMaterial({ color: '#BFF3FF', transparent: true, opacity: 0.4 }); A.ghost = new THREE.LineSegments(eg, A.ghostMat); scene.add(A.ghost); }
    coll.push({ x: SX, z: SZ, r: 1.8 });
    { const sg = signSprite(SH.name || '', SH.sub || '', { scene, bg: '#DDF3F0', fg: '#2A2150', w: 3.2 }); sg.userData.anchor = [SX, Y + SHH + 0.8, SZ]; signs.push(sg); }

    // 떠다니는 빛 알갱이
    { const n = 70, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { sp[i * 3] = (rnd() * 2 - 1) * 11; sp[i * 3 + 1] = Y + 0.5 + rnd() * 6; sp[i * 3 + 2] = (rnd() * 2 - 1) * 5.5; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      A.motes = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.7 })); scene.add(A.motes); }

    // 발판
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.4)); gr.addColorStop(0.8, hexA(color, 0.2)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(42,33,80,0.62)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${text.length > 4 ? 66 : text.length > 2 ? 86 : 130}px ${FONT_B}`; g.fillText(text, w / 2, h / 2 - 22);
      g.font = `800 ${sub.length > 5 ? 44 : 52}px ${FONT_B}`; g.fillText(sub, w / 2, h / 2 + 70); });
    const PX = [-5.0, 0.5, 5.7], PZ = [1.5, 1.5, 1.4], padMesh = [];
    PADS.forEach((p, i) => { padMesh[i] = flat(2.4, 2.4, sheet(padT(p.pad || '', p.padSub || '', p.color || '#FFFFFF')), PX[i], PZ[i], 0.06); A.pads.push({ x: PX[i], z: PZ[i], r: 1.5 }); });

    // 리니
    const RX = -9.6, RZ = -1.4;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.4 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    // 나가는 문: 빛 아치 + 발판
    const DX = -9.0, DZ = 3.2;
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(42,33,100,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '섬으로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '섬으로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), DX, DZ, 0.03);

    // 발판들: 리니 · 밝은 탑 · 희미한 탑 · 빈 책장 · 퀴즈 · 문
    const openCard = c => openBook({ title: c.title || '', sub: c.sub || '', sample: true, text: c.text || '' });
    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: -8.4, z: 0.2, r: 1.3, go: () => talk() },
      { id: 'door', name: T.exitName || '섬으로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: DX, z: DZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    PADS.forEach((p, i) => spots.push({ id: 'pad' + i, name: p.title || '', sub: p.sub || '', btn: T.open, x: PX[i], z: PZ[i], r: 1.5, pad: padMesh[i], go: () => openCard(p.card || {}) }));
    if (quiz) spots.push({ id: 'quiz', name: quiz.title || '', sub: cfg.quizSub || '', btn: T.start, x: 9.2, z: 0.6, r: 1.3, sign: true, go: () => startPractice(quiz) });
    const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#B79BFF'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#7FE3C8'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke(); }));
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      if (sp.sign) { const sg = signSprite(sp.name, '', { scene, w: 3.2 }); sg.userData.anchor = [sp.x, Y + 0.05, sp.z - 1.15]; signs.push(sg); }
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => (x / WX) * (x / WX) + (z / WZ) * (z / WZ) < 1,
      camD: () => clamp(26 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 20, 46) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= 26 ? 0 : clamp(me.x, -13 + hw, 13 - hw),
        hd * 2 >= 15 ? -0.3 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, -EZ + hd - 1.4, EZ - hd + 1.7)
      ],
      spawn: { x: -7.0, z: 2.0, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'library', anim: A };
    return R.built;
  }
  function updateLibrary(dt, me) {
    const A = R.built.anim; A.t += dt;
    let act = -1; A.pads.forEach((p, i) => { if (Math.hypot(me.x - p.x, me.z - p.z) < p.r) act = i; });
    if (act !== A.act) { A.act = act; const pd = A.padCfg[act]; if (pd && pd.line) showToast(pd.line, 4.5); }
    for (const w of A.tw) {
      const on = w.pad === act;
      const tk = w.bright ? (on ? 1 : 0.4) : (on ? (Math.sin(A.t * 13) + Math.sin(A.t * 7.3) > 0.4 ? 0.85 : 0.1) : 0.12 + 0.1 * Math.sin(A.t * 3 + w.i * 2));
      w.k += (tk - w.k) * (1 - Math.exp(-dt * (w.bright ? 4 : 16)));
      w.beam.scale.y = 0.2 + 0.8 * w.k; w.bm.opacity = w.op * w.k;
      w.hm.opacity = w.k; w.halo.scale.setScalar(w.hs * (0.7 + 0.5 * w.k));
    }
    if (A.ghostMat) A.ghostMat.opacity = (act === 2 ? 0.95 : 0.4) + Math.sin(A.t * 2.2) * 0.12;
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    if (A.motes) A.motes.rotation.y += dt * 0.03;
  }
  HALLS.library = [buildLibrary, updateLibrary];
  /* ==== hall:library 끝 ==== */
  /* ==== hall:market 시작 ==== */
  // 확률의 시장(AI가 지은 섬, 2026-10-09 XR개발부). 가판대 3개: 빈칸 문장 + 후보 낱말 + 그럴듯함 막대. 글은 모두 lobby.config.js rooms.market ([확인 전])
  function buildMarket(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#CDB8E8');
    scene.add(new THREE.HemisphereLight(0xfff2e8, 0xb99ad6, 0.95));
    const sun = new THREE.DirectionalLight(0xfff1dc, 0.6); sun.position.set(-14, 26, 16); scene.add(sun);
    const MW = 26, X0 = -MW / 2, HD = 6.5, ZB = -HD, WH = 3.4, SZ = -4.2, PADZ = -1.6, BMAX = 1.5, BY = 1.0;
    const STALLS = cfg.stalls || [];
    const SX = [-5.0, 2.2, 9.4];
    const SCOL = ['#FF7FAE', '#4FB6F0', '#FFC21F'], BCOL = ['#E23C7E', '#1F8FDC', '#F09A00'];
    const pr = cfg.principal || {}, quiz = cfg.quiz || null;
    const coll = [], signs = [], hit = [];
    const A = { t: 0, bars: [], pulse: [], sel: [], top: [], visited: [], pins: [], marks: [], dice: [], merch: [], qm: [], rini: null, sx: SX, stalls: STALLS };
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });

    // 바닥(살구빛 타일)과 받침 판, 뒷벽·서쪽 벽
    const floorT = canvasTex(1040, 520, (g, w, h) => {
      g.fillStyle = '#FFD9C0'; g.fillRect(0, 0, w, h);
      for (let cy = 0; cy < 13; cy++) for (let cx = 0; cx < 26; cx++) { g.fillStyle = (cx + cy) % 2 ? '#FFE8D6' : '#FFDFC8'; rr(g, cx * 40 + 2, cy * 40 + 2, 36, 36, 9); g.fill(); }
    });
    const fl = flat(MW, 2 * HD, new THREE.MeshLambertMaterial({ map: floorT }), 0, 0, 0); fl.renderOrder = 0;
    part(new THREE.BoxGeometry(MW + 0.6, 0.8, 2 * HD + 0.6), '#B9A2E0', 0, Y - 0.41, 0);
    const wallTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#FBD9E4'; g.fillRect(0, 0, w, h); g.fillStyle = '#E3C3EE'; g.fillRect(0, h * 0.74, w, h * 0.26); g.fillStyle = '#FFFFFF'; g.fillRect(0, h * 0.735, w, 6); });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); scene.add(m); return m; };
    wall(0.3, WH, 2 * HD + 0.3, X0 - 0.15, Y + WH / 2, 0);
    wall(MW + 0.3, WH, 0.3, -0.15, Y + WH / 2, ZB - 0.15);
    part(new THREE.BoxGeometry(MW + 0.3, 0.3, 0.3), '#A98BD8', -0.15, Y + 0.15, HD + 0.15);   // 남쪽 낮은 턱

    // 가판대 3개
    const stripeT = c => canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : c; g.fillRect(i * 32, 0, 32, h); } });
    const wordT = (txt) => canvasTex(256, 128, (g, w, h) => { rr(g, 6, 10, w - 12, h - 20, 26); g.fillStyle = '#FFFDF8'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#E6CDEB'; g.stroke(); g.fillStyle = '#4A3560'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, txt, '900', 64, FONT_B, w - 36); g.fillText(txt, w / 2, h / 2 + 3); });
    const sentT = (txt, c) => canvasTex(1024, 200, (g, w, h) => { rr(g, 10, 14, w - 20, h - 28, 50); g.fillStyle = '#FFFDF8'; g.fill(); g.lineWidth = 12; g.strokeStyle = c; g.stroke(); g.fillStyle = '#4A3560'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, txt, '900', 92, FONT_B, w - 110); g.fillText(txt, w / 2, h / 2 + 4); });
    const pinT = (txt, col) => canvasTex(256, 128, (g, w, h) => { rr(g, 10, 12, w - 20, 74, 37); g.fillStyle = col; g.fill(); g.fillStyle = '#FFFFFF'; g.font = `900 54px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, 51); g.beginPath(); g.moveTo(w / 2 - 14, 84); g.lineTo(w / 2 + 14, 84); g.lineTo(w / 2, 110); g.closePath(); g.fill(); });
    const markT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#4CC38A'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#FFFFFF'; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(36, 66); g.lineTo(56, 86); g.lineTo(92, 44); g.stroke(); });
    const qT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7A5CC8'; g.font = `900 120px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70); });
    const mkRobot = (body, belly, eye, sc, faceBg) => {
      const grp = new THREE.Group(); const rp = [];
      const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), body, 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), body, 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), belly, 0, 0.9, -0.5);
      grp.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = faceBg; g.fillRect(0, 0, w, h); g.fillStyle = eye; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); grp.add(face);
      const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#7DFFD1' })); eyeM.position.set(0, 2.65, 0); grp.add(eyeM);
      grp.scale.setScalar(sc); return grp;
    };
    STALLS.forEach((st, i) => {
      const sx = SX[i], c = SCOL[i], words = st.words || [], bars = st.bars || [], n = words.length;
      part(new THREE.BoxGeometry(5.4, 1.0, 1.3), '#FFF6EA', sx, Y + 0.5, SZ);
      part(new THREE.BoxGeometry(5.46, 0.2, 1.36), c, sx, Y + 0.92, SZ);
      [[-2.8, 0.6, 4.3], [2.8, 0.6, 4.3], [-2.8, -1.2, 4.7], [2.8, -1.2, 4.7]].forEach(([a, b, hh]) => part(new THREE.BoxGeometry(0.13, hh, 0.13), '#FFFFFF', sx + a, Y + hh / 2, SZ + b));
      { const roof = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.14, 1.9), new THREE.MeshLambertMaterial({ map: stripeT(c) })); roof.position.set(sx, Y + 4.55, SZ - 0.3); roof.rotation.x = 0.2; scene.add(roof); }
      plane(5.0, 0.8, sheet(sentT(st.sentence || '', c)), sx, Y + 3.8, SZ + 0.68);
      for (let k = 0; k < 5; k++) coll.push({ x: sx - 2.2 + k * 1.1, z: SZ + 0.2, r: 0.9 });
      // 막대(느낌용 가안: 숫자는 화면에 쓰지 않는다)
      A.bars[i] = []; A.pulse[i] = 0; A.sel[i] = -1; A.top[i] = 0; A.visited[i] = false;
      let top = 0; bars.forEach((b, k) => { if (b > bars[top]) top = k; }); A.top[i] = top;
      for (let k = 0; k < n; k++) {
        const bx = sx + (k - (n - 1) / 2) * 1.0;
        const geo = new THREE.BoxGeometry(0.5, 1, 0.34).translate(0, 0.5, 0);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: BCOL[i] })); m.position.set(bx, Y + BY, SZ); m.scale.y = 0.001; scene.add(m);
        const halo = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1, 0.5).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false })); halo.position.copy(m.position); halo.scale.y = 0.001; scene.add(halo);
        const tr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.56, BMAX, 0.4)), new THREE.LineBasicMaterial({ color: '#B9A2E0', transparent: true, opacity: 0.55 })); tr.position.set(bx, Y + BY + BMAX / 2, SZ); scene.add(tr);
        plane(0.96, 0.48, sheet(wordT(words[k])), bx, Y + 0.5, SZ + 0.67);
        A.bars[i].push({ m, halo, tgt: bars[k] || 0, cur: 0, x: bx });
      }
      // 고른 말 표시('나'·'상인')와 다 했다는 표시
      const pm = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinT('나', '#5B6CE0'), transparent: true, depthWrite: false })); pm.scale.set(0.9, 0.45, 1); pm.visible = false; pm.renderOrder = 6; scene.add(pm);
      const pb = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinT(cfg.botPin || '상인', c === '#FFC21F' ? '#E39A00' : c), transparent: true, depthWrite: false })); pb.scale.set(0.9, 0.45, 1); pb.visible = false; pb.renderOrder = 6; scene.add(pb);
      A.pins[i] = [pm, pb];
      const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: markT, transparent: true, depthWrite: false })); mk.scale.set(0.8, 0.8, 1); mk.position.set(sx + 3.2, Y + 3.6, SZ + 0.6); mk.visible = false; mk.renderOrder = 6; scene.add(mk); A.marks[i] = mk;
      if (st.unknown) { for (let q = 0; q < 3; q++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: qT, transparent: true, depthWrite: false })); s.scale.set(0.6, 0.6, 1); s.position.set(sx - 0.9 + q * 0.9, Y + BY + 1.55 + q * 0.1, SZ); s.userData.y = s.position.y; s.userData.ph = q; s.renderOrder = 5; scene.add(s); A.qm.push(s); } }
      // 상인 로봇(카운터 오른쪽 뒤)
      const rb = mkRobot(c, '#FFFDF8', '#3A2A5A', 0.62, '#FFF4E4'); rb.position.set(sx + 2.1, Y, SZ - 0.15); rb.rotation.y = -0.2; scene.add(rb); A.merch.push(rb);
    });
    // 떠 있는 주사위
    const pipT = (nn) => canvasTex(128, 128, (g, w, h) => { rr(g, 4, 4, w - 8, h - 8, 22); g.fillStyle = '#FFFDF8'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#D9C3EC'; g.stroke(); g.fillStyle = '#6C4BA6';
      const PS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
      PS[nn].forEach(([a, b]) => { g.beginPath(); g.arc(30 + a * 34, 30 + b * 34, 11, 0, Math.PI * 2); g.fill(); }); });
    [-1.4, 5.8].forEach((dx, i) => {
      const mats = [1, 6, 2, 5, 3, 4].map(nn => new THREE.MeshLambertMaterial({ map: pipT(nn) }));
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), mats); d.position.set(dx, Y + 4.8, SZ - 0.4); d.userData.y = Y + 4.8; d.userData.ph = i * 2; scene.add(d); A.dice.push(d);
    });

    // 서쪽 문(나가기) 발판
    const DOORZ = 3.6;
    const doorT = canvasTex(256, 352, (g, w, h) => { g.fillStyle = '#B79BE8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8567C9'; g.lineWidth = 10; g.strokeRect(28, 30, w - 56, 120); g.strokeRect(28, 190, w - 56, 130); g.fillStyle = '#FFE9F3'; g.fillRect(48, 48, w - 96, 84); g.fillStyle = '#FFD36B'; g.beginPath(); g.arc(w - 46, 180, 12, 0, Math.PI * 2); g.fill(); });
    { const dr = plane(1.9, 2.6, basic(doorT), X0 + 0.02, Y + 1.3, DOORZ); dr.rotation.y = Math.PI / 2; }
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(122,92,200,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '섬으로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '섬으로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), X0 + 1.6, DOORZ, 0.03);

    // 발판 그림(번호 + 가판대)
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.4)); gr.addColorStop(0.8, hexA(color, 0.2)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,253,248,0.85)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke(); g.fillStyle = '#4A3560'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 150px ${FONT_B}`; g.fillText(text, w / 2, h / 2 - 22); g.font = `800 50px ${FONT_B}`; g.fillText(sub, w / 2, h / 2 + 82); });
    const padX = SX.slice(), padMesh = [];
    STALLS.forEach((st, i) => { padMesh[i] = flat(2.4, 2.4, sheet(padT(String(i + 1), cfg.padSub || '가판대', SCOL[i])), padX[i], PADZ, 0.06); });

    // 리니
    const RX = X0 + 2.6, RZ = -2.6;
    const rini = mkRobot('#FAF6EA', '#FFD36B', '#3FB8FF', 1, '#1A2A4A'); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    coll.push({ x: RX, z: RZ, r: 0.7 });
    { const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }
    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    // 발판(spots)
    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: RX, z: RZ + 1.5, r: 1.3, go: () => talk() },
      { id: 'door', name: T.exitName || '섬으로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: X0 + 1.6, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    STALLS.forEach((st, i) => spots.push({ id: 'stall' + i, name: st.title || '', sub: st.sub || '', btn: cfg.stallBtn || '빈칸 골라 보기', x: padX[i], z: PADZ, r: 1.25, pad: padMesh[i], go: () => openStall(i) }));
    if (quiz) spots.push({ id: 'quiz', name: quiz.title || '', sub: cfg.quizSub || '', btn: T.start, x: 10.9, z: 2.8, r: 1.2, sign: true,
      go: () => { if (A.visited.every(Boolean)) startPractice(quiz); else showToast(cfg.quizLock || '먼저 가판대 세 곳에서 빈칸을 골라 봐요', 3.5); } });
    const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#FF8FC4'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#7A5CC8'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke(); }));
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      if (sp.sign) { const sg = signSprite(sp.name, '', { scene, w: 3.2 }); sg.userData.anchor = [sp.x, Y + 0.05, sp.z - 1.15]; signs.push(sg); }
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => x > X0 + 0.35 && x < X0 + MW - 0.35 && z > ZB + 0.35 && z < HD - 0.3,
      camD: () => clamp(22 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= MW + 1.5 ? 0 : clamp(me.x, X0 + hw - 0.6, X0 + MW - hw + 0.6),
        hd * 2 >= 2 * HD + 2.5 ? -2.2 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, ZB + hd - 1.4, HD - hd + 1.7)
      ],
      spawn: { x: X0 + 3.2, z: 1.8, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'market', anim: A };
    return R.built;
  }
  function updateMarket(dt, me) {
    const A = R.built.anim; A.t += dt;
    const k = 1 - Math.exp(-dt * 3);
    A.bars.forEach((row, i) => {
      A.pulse[i] = Math.max(0, A.pulse[i] - dt * 0.5);
      const pu = A.pulse[i], wave = pu > 0 ? 0.5 + 0.5 * Math.sin(A.t * 14) : 0;
      row.forEach((b, j) => {
        b.cur += (b.tgt - b.cur) * k;
        const mine = j === A.sel[i], top = j === A.top[i] && A.sel[i] >= 0;
        const boost = (mine || top) ? 1 + 0.12 * pu * wave : 1;
        const h = Math.max(0.001, b.cur * 1.5 * boost + Math.sin(A.t * 1.6 + j + i) * 0.015);
        b.m.scale.y = h; b.halo.scale.y = h + 0.1;
        b.halo.material.opacity = (mine || top) ? 0.55 * pu * wave : 0;
      });
    });
    A.dice.forEach((d, i) => { d.rotation.x += dt * 0.7; d.rotation.y += dt * (0.5 + i * 0.2); d.position.y = d.userData.y + Math.sin(A.t * 1.2 + d.userData.ph) * 0.2; });
    A.qm.forEach(s => { s.position.y = s.userData.y + Math.sin(A.t * 2 + s.userData.ph * 1.3) * 0.12; });
    const face = (g, rate) => { const dx = me.x - g.position.x, dz = me.z - g.position.z; return Math.hypot(dx, dz) < 6 ? Math.atan2(dx, dz) : rate; };
    const turn = (g, want) => { let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * (1 - Math.exp(-dt * 6)); };
    if (A.rini) turn(A.rini, face(A.rini, 0.9));
    A.merch.forEach(g => turn(g, face(g, -0.2)));
  }
  // 가판대: 빈칸 후보 고르기 → 상인 로봇이 가장 높은 막대와 견준다
  function openStall(i) {
    const A = R.built.anim, st = (R.cfg.stalls || [])[i];
    if (!st) return;
    const who = st.merchant || R.cfg.merchant || '상인 로봇';
    talkUI(who, st.sentence + '  ' + (st.ask || ''), (st.words || []).map((w, j) => ({ label: w, choice: true, go: () => pickWord(i, j) })), { ask: R.cfg.askLine || '빈칸에 올 말을 골라 보세요', speak: false });
  }
  function pickWord(i, j) {
    const A = R.built.anim, st = R.cfg.stalls[i], who = st.merchant || R.cfg.merchant || '상인 로봇';
    const top = A.top[i], you = st.words[j], bot = st.words[top];
    A.sel[i] = j; A.pulse[i] = 1.0; A.visited[i] = true;
    const [pm, pb] = A.pins[i], row = A.bars[i];
    const pinY = b => Y + 1.0 + b.tgt * 1.5 + 0.55;
    pm.position.set(row[j].x, pinY(row[j]), row[0].m.position.z + 0.1); pm.visible = true;
    pb.position.set(row[top].x, pinY(row[top]), row[0].m.position.z + 0.1); pb.visible = true;
    if (j === top) { pm.position.x -= 0.3; pb.position.x += 0.3; }
    A.marks[i].visible = true;
    const reply = st.unknown ? fill(st.unknownReply || '', { you, top: bot }) : (j === top ? fill(st.same || '', { you, top: bot }) : fill(st.diff || '', { you, top: bot }));
    const all = A.visited.every(Boolean);
    const btns = [{ label: R.cfg.again || '다른 말도 골라 보기', go: () => openStall(i) }, { label: all ? (R.cfg.toQuiz || '다 돌아봤어요') : T.close, primary: true, go: () => { closePop(); if (all) showToast(R.cfg.allToast || '세 곳을 다 돌았어요. 오른쪽 끝에서 마무리 문제를 풀어요', 4.5); } }];
    talkUI(who, st.note || '', btns, { feedback: reply, fbKind: 'ok', speak: false });
  }
  HALLS.market = [buildMarket, updateMarket];
  /* ==== hall:market 끝 ==== */
  /* ==== hall:dream 시작 ==== */
  // ── 꿈 공방(AI가 지은 섬 · 생성) ── 분홍·연보라 돔 안의 공방. 공중 선반 셋에서 조각을 하나씩 골라 가운데 전시대에 붙여 '세상에 없던 것'을 만든다.
  // 글·조각 목록은 lobby.config.js rooms.dream(모두 [확인 전]). 조각 모양은 아래 makeDreamPiece의 three.js 기본 도형.
  function buildDream(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#EFD3F2');
    scene.add(new THREE.HemisphereLight(0xfff0fb, 0xa38fd8, 0.62));
    const sun = new THREE.DirectionalLight(0xfff3e6, 0.38); sun.position.set(-10, 26, 18); scene.add(sun);
    const RXE = 12, RZE = 6.6, DH = 7.6;               // 바닥 타원 반지름, 돔 높이
    const WX = 11.6, WZ = 6.0;                          // 걸을 수 있는 타원
    const SHZ = -4.6, PADZ = -1.6, CX = 0, CZ = 1.6;    // 선반 z, 선반 발판 z, 전시대 자리
    const coll = [], signs = [], hit = [];
    const shelves = cfg.shelves || [], fin = cfg.finish || {}, pr = cfg.principal || {};
    const A = { t: 0, rini: null, items: [], rings: [], fliers: [], pick: shelves.map(() => -1), attached: shelves.map(() => null), creature: null, qmark: null, nameSign: null, finishSp: null, bubbles: [], slotPos: [] };
    let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });
    const flat = (w, h, mat, x, z, lift) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return m; };
    const SPH = new THREE.SphereGeometry(1, 16, 12), BOX = new THREE.BoxGeometry(1, 1, 1), CONE = new THREE.ConeGeometry(1, 1, 14), CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
    const add = (g, geo, color, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); g.add(m); return m; };

    // 바닥(타원 판)·돔(유리 그릇)·받침
    const floorT = canvasTex(1024, 560, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.5); gr.addColorStop(0, '#F6D3EE'); gr.addColorStop(0.55, '#E4B5E6'); gr.addColorStop(1, '#B79CEB'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
      for (let k = 1; k <= 4; k++) { g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.11 * k, h * 0.11 * k, 0, 0, Math.PI * 2); g.stroke(); }
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 4, 0, Math.PI * 2); g.fill(); }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: floorT }));
    floor.scale.set(RXE, 1, RZE); floor.position.y = Y; scene.add(floor);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.78, 0.9, 56, 1, true), new THREE.MeshLambertMaterial({ color: '#A58CE6' }));
    rim.scale.set(RXE + 0.15, 1, RZE + 0.1); rim.position.y = Y - 0.45; scene.add(rim);
    const under = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#8570CF' }));
    under.scale.set(RXE * 0.78, 1, RZE * 0.78); under.position.y = Y - 0.9; scene.add(under);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#F8C9EC', transparent: true, opacity: 0.2, side: THREE.BackSide, depthWrite: false }));
    dome.scale.set(RXE, DH, RZE); dome.position.y = Y; dome.renderOrder = 1; scene.add(dome);
    { const lm = new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55 });
      for (let k = 0; k < 8; k++) { const ph = k * Math.PI / 4, pts = []; for (let i = 0; i <= 24; i++) { const e = i / 24 * Math.PI / 2; pts.push(new THREE.Vector3(Math.cos(e) * Math.cos(ph) * RXE, Y + Math.sin(e) * DH, Math.cos(e) * Math.sin(ph) * RZE)); } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm)); }
      [0.4, 0.75].forEach(f => { const pts = [], e = f * Math.PI / 2; for (let i = 0; i <= 64; i++) { const ph = i / 64 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(e) * Math.cos(ph) * RXE, Y + Math.sin(e) * DH, Math.cos(e) * Math.sin(ph) * RZE)); } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm)); }); }
    { const n = 110, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.92; sp[i * 3] = Math.cos(a) * r * RXE; sp[i * 3 + 1] = Y + 0.5 + rnd() * (DH - 1.5) * (1 - r * 0.6); sp[i * 3 + 2] = Math.sin(a) * r * RZE; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))); }
    for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(SPH, glow(i % 2 ? '#FFB3E6' : '#B9F0FF', 0.16)); const s = 0.12 + rnd() * 0.22; b.scale.setScalar(s); b.position.set((rnd() - 0.5) * 2 * RXE * 0.8, Y + 0.8 + rnd() * 5, (rnd() - 0.5) * 2 * RZE * 0.7); b.userData.y = b.position.y; b.userData.ph = rnd() * 6; scene.add(b); A.bubbles.push(b); }

    // 조각 모양(모두 three.js 기본 도형). 몸통은 (0,0.9,0) 중심, 머리는 (0,1.95,0) 중심, 만든 것의 앞은 +z(남쪽, 카메라 쪽)
    const HY = 1.95, BY = 0.9;
    function makeDreamPiece(id) {
      const g = new THREE.Group();
      if (id === 'bear') {
        add(g, SPH, '#B9835A', 0, HY, 0, 0.62); [-1, 1].forEach(s => { add(g, SPH, '#B9835A', s * 0.44, HY + 0.5, 0, 0.22); add(g, SPH, '#E8B999', s * 0.44, HY + 0.5, 0.1, 0.12); add(g, SPH, '#2B1F1A', s * 0.22, HY + 0.12, 0.54, 0.07); });
        add(g, SPH, '#F1D9BE', 0, HY - 0.14, 0.5, 0.27, 0.22, 0.2); add(g, SPH, '#3A2A26', 0, HY - 0.03, 0.7, 0.09, 0.07, 0.07);
        return { g, c: [0, HY, 0] };
      }
      if (id === 'cat') {
        add(g, SPH, '#F6E6CF', 0, HY, 0, 0.6); [-1, 1].forEach(s => { const e = add(g, CONE, '#F6E6CF', s * 0.36, HY + 0.62, 0, 0.22, 0.44, 0.16); e.rotation.z = -s * 0.25; add(g, CONE, '#F4A7C4', s * 0.36, HY + 0.58, 0.07, 0.11, 0.26, 0.08).rotation.z = -s * 0.25;
          add(g, SPH, '#2E6B4A', s * 0.2, HY + 0.08, 0.53, 0.08, 0.1, 0.05); add(g, BOX, '#9A8A7A', s * 0.62, HY - 0.12, 0.42, 0.5, 0.015, 0.015).rotation.z = s * 0.12; add(g, BOX, '#9A8A7A', s * 0.62, HY - 0.2, 0.4, 0.5, 0.015, 0.015).rotation.z = -s * 0.12; });
        add(g, SPH, '#F08BAF', 0, HY - 0.08, 0.6, 0.07, 0.05, 0.05); add(g, SPH, '#EBC6A0', 0, HY + 0.38, 0.4, 0.2, 0.08, 0.12);
        return { g, c: [0, HY, 0] };
      }
      if (id === 'robot') {
        add(g, BOX, '#FAF6EA', 0, HY, 0, 1.0, 0.8, 0.8); add(g, BOX, '#1A2A4A', 0, HY, 0.41, 0.8, 0.52, 0.05);
        [-1, 1].forEach(s => { add(g, BOX, '#3FB8FF', s * 0.2, HY + 0.05, 0.44, 0.14, 0.2, 0.03); const b = add(g, CYL, '#9AA7C7', s * 0.52, HY, 0, 0.1, 0.16, 0.1); b.rotation.z = Math.PI / 2; });
        add(g, BOX, '#7DFFD1', 0, HY - 0.15, 0.44, 0.22, 0.03, 0.03); add(g, CYL, '#9AA7C7', 0, HY + 0.58, 0, 0.03, 0.34, 0.03); add(g, SPH, '#FFD36B', 0, HY + 0.78, 0, 0.1);
        return { g, c: [0, HY, 0] };
      }
      if (id === 'frog') {
        add(g, SPH, '#7ED08A', 0, BY, 0, 0.75, 0.7, 0.65); add(g, SPH, '#D4F2C4', 0, BY - 0.05, 0.42, 0.52, 0.52, 0.28);
        [-1, 1].forEach(s => { add(g, SPH, '#5DB873', s * 0.55, 0.2, 0.35, 0.24, 0.16, 0.34); add(g, SPH, '#7ED08A', s * 0.74, BY + 0.05, 0.15, 0.15); });
        return { g, c: [0, BY, 0] };
      }
      if (id === 'bunny') {
        add(g, SPH, '#F7F2EE', 0, BY, 0, 0.6, 0.76, 0.55); add(g, SPH, '#FFE0EA', 0, BY - 0.02, 0.4, 0.38, 0.5, 0.2);
        [-1, 1].forEach(s => { add(g, SPH, '#F7F2EE', s * 0.3, 0.14, 0.38, 0.2, 0.12, 0.3); add(g, SPH, '#F7F2EE', s * 0.58, BY + 0.1, 0.18, 0.14); });
        return { g, c: [0, BY, 0] };
      }
      if (id === 'turtle') {
        const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam('#6FAE72')); sh.position.set(0, 0.62, 0); sh.scale.set(0.92, 1.0, 0.85); g.add(sh);
        [[0, 0], [-0.4, 0.1], [0.4, 0.1], [0, -0.4], [0, 0.45]].forEach(([x, z]) => add(g, SPH, '#4F8F58', x * 0.9, 0.62 + Math.sqrt(Math.max(0.05, 1 - x * x - z * z)) * 0.97, z * 0.85, 0.17, 0.05, 0.17));
        add(g, SPH, '#EBD9A0', 0, 0.5, 0, 0.82, 0.14, 0.76);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(g, SPH, '#A6D18A', sx * 0.58, 0.22, sz * 0.4, 0.2, 0.2, 0.2));
        return { g, c: [0, 0.9, 0] };
      }
      if (id === 'wings') {
        [-1, 1].forEach(s => { const w = new THREE.Group();
          [[0.4, 0.2, 0.5, 0.2, '#E7DCFF'], [0.66, 0.04, 0.44, 0.18, '#D5C6FF'], [0.9, -0.12, 0.36, 0.15, '#C3B0FF']].forEach(([x, y, sx, sz, c]) => add(w, SPH, c, s * x, y, 0, sx, 0.07, sz));
          w.position.set(s * 0.55, 1.15, -0.25); w.rotation.z = s * 0.85; w.rotation.y = -s * 0.3; g.add(w); });
        return { g, c: [0, 1.2, -0.25] };
      }
      if (id === 'tail') {
        for (let i = 0; i < 6; i++) add(g, SPH, i === 5 ? '#FFD36B' : '#F4A7C4', 0, 0.45 + Math.sin(i * 0.55) * 0.4, -0.6 - i * 0.22, i === 5 ? 0.22 : 0.17 - i * 0.012);
        return { g, c: [0, 0.8, -1.1] };
      }
      if (id === 'horn') {
        const h = add(g, CONE, '#FFD36B', 0, HY + 0.88, 0.32, 0.14, 0.62, 0.14); h.rotation.x = 0.45; add(g, SPH, '#FFF3B0', 0, HY + 1.2, 0.46, 0.07);
        return { g, c: [0, HY + 0.9, 0.3] };
      }
      add(g, SPH, '#CCCCCC', 0, 1, 0, 0.4);
      return { g, c: [0, 1, 0] };
    }

    // 가운데 전시대 + 만든 것(조각이 붙는 자리) + 물음표
    add(scene, CYL, '#F8E4F6', CX, Y + 0.25, CZ, 1.25, 0.5, 1.25);
    { const pr2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 40).rotateX(Math.PI / 2), glow('#FF9AD8', 0.9)); pr2.position.set(CX, Y + 0.52, CZ); scene.add(pr2); A.pring = pr2; }
    { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#FFB3E6', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.rotation.x = Math.PI; cone.position.set(CX, Y + 2.2, CZ); scene.add(cone); }
    coll.push({ x: CX, z: CZ, r: 1.35 });
    const creature = new THREE.Group(); creature.position.set(CX, Y + 0.5, CZ); scene.add(creature); A.creature = creature;
    const qT = canvasTex(256, 256, (g, w, h) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 200px ${FONT_B}`; g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#FFFFFF'; g.strokeText('?', w / 2, h / 2 + 6); g.fillStyle = '#D9549A'; g.fillText('?', w / 2, h / 2 + 6); });
    { const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qT, transparent: true, depthWrite: false })); q.scale.set(1.5, 1.5, 1); q.position.set(CX, Y + 1.7, CZ); q.renderOrder = 5; scene.add(q); A.qmark = q; }

    // 선반 셋 + 조각 3가지씩 + 고른 조각 표시 고리 + 선반 발판
    const SX = [-6.5, 0, 6.5], SC = ['#FF9AD8', '#7FDCC0', '#FFC94D'], DX = [-1.65, 0, 1.65];
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.35)); gr.addColorStop(0.8, hexA(color, 0.18)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.78)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke();
      g.fillStyle = '#4A2F6B'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, text, '900', text.length > 2 ? 104 : 136, FONT_B, w * 0.6); g.fillText(text, w / 2, h / 2 - (sub ? 26 : 0));
      if (sub) { fitFont(g, sub, '800', 50, FONT_B, w * 0.56); g.fillText(sub, w / 2, h / 2 + 72); }
    });
    const spots = [];
    const addHit = sp => { const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial()); hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb); sp.hb = hb; };
    const setPad = (sp, text, sub, color) => { const old = sp.pad.material.map; sp.pad.material.map = padT(text, sub, color); sp.pad.material.needsUpdate = true; if (old) old.dispose(); };
    shelves.forEach((sh, si) => {
      const x0 = SX[si] || 0, col = SC[si] || '#FF9AD8';
      add(scene, BOX, '#E3D6FF', x0, Y + 1.72, SHZ, 5.4, 0.18, 1.1);
      add(scene, BOX, col, x0, Y + 1.61, SHZ, 5.5, 0.05, 1.2);
      flat(5.4, 1.6, glow(col, 0.1), x0, SHZ, 0.02);
      const ssg = signSprite(sh.title || '', sh.sub || '', { scene, bg: col, fg: '#3B2459', w: 3.6 }); ssg.userData.anchor = [x0, Y + 4.1, SHZ]; signs.push(ssg);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 36).rotateX(Math.PI / 2), glow(col, 0.95)); ring.position.set(x0, Y + 1.85, SHZ); ring.visible = false; scene.add(ring); A.rings[si] = ring;
      A.slotPos[si] = [];
      (sh.items || []).forEach((it, ii) => {
        const pc = makeDreamPiece(it.id), outer = new THREE.Group();
        pc.g.position.set(-pc.c[0], -pc.c[1], -pc.c[2]); outer.add(pc.g);
        outer.scale.setScalar(0.62); outer.position.set(x0 + DX[ii], Y + 2.65, SHZ); scene.add(outer);
        A.items.push({ outer, y: outer.position.y, ph: si * 1.7 + ii }); A.slotPos[si][ii] = outer.position.clone();
      });
      const sp = { id: 'shelf' + si, name: sh.padName || sh.title || '', sub: sh.padSub || '', btn: sh.btn || '고르기', x: x0, z: PADZ, r: 1.3, color: col, pad: flat(2.4, 2.4, sheet(padT(sh.pad || '', sh.padLabel || '고르기', col)), x0, PADZ, 0.06), go: () => openPicker(si) };
      spots.push(sp);
    });

    // 리니(하얀 몸·노란 배·파란 눈의 네모 로봇)
    const RIX = -4.4, RIZ = 2.0;
    const rini = new THREE.Group(); rini.position.set(RIX, Y, RIZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, 128, 76); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RIX, z: RIZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 }); rs.userData.anchor = [RIX, Y + 3.0, RIZ]; signs.push(rs); }

    // 나가기 문(서쪽 둥근 거품 문) + 발판
    const DX0 = -8.0, DZ0 = 3.7;
    { const dm = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 8, 28), glow('#FFFFFF', 0.55)); dm.position.set(DX0 - 0.9, Y + 1.2, DZ0); dm.rotation.y = Math.PI / 2; dm.scale.set(1, 1.2, 1); scene.add(dm);
      const dg = new THREE.Mesh(new THREE.CircleGeometry(0.8, 28), glow('#BFEFFF', 0.12)); dg.position.set(DX0 - 0.9, Y + 1.2, DZ0); dg.rotation.y = Math.PI / 2; dg.scale.set(1, 1.2, 1); scene.add(dg); }
    const exitT = canvasTex(512, 224, (g, w, h) => {
      g.beginPath(); g.moveTo(52, 8); g.arcTo(w - 8, 8, w - 8, h - 8, 44); g.arcTo(w - 8, h - 8, 8, h - 8, 44); g.arcTo(8, h - 8, 8, 8, 44); g.arcTo(8, 8, w - 8, 8, 44); g.closePath(); g.fillStyle = 'rgba(122,92,200,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '섬으로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '섬으로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), DX0 + 0.5, DZ0, 0.03);

    // 완성 발판(셋 다 고르면 나타난다)
    const finSp = { id: 'finish', name: fin.name || '완성!', sub: fin.sub || '', btn: fin.btn || '이름 짓기', x: 4.2, z: 3.4, r: 1.3, pad: flat(2.4, 2.4, sheet(padT(fin.pad || '완성!', fin.padLabel || '', '#FF6FB5')), 4.2, 3.4, 0.06), go: () => finishFlow() };
    finSp.pad.visible = false; A.finishSp = finSp;

    spots.unshift({ id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: RIX + 1.7, z: RIZ + 1.7, r: 1.3, go: () => talk() });
    spots.push({ id: 'door', name: T.exitName || '섬으로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: DX0 + 0.5, z: DZ0, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } });
    const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#FF9AD8'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#B9A2FF'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke(); }));
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      addHit(sp);
    }

    // ── 고르기·붙이기·이름·다시 만들기 ──
    const allPicked = () => A.pick.length > 0 && A.pick.every(i => i >= 0);
    const creatureName = () => {
      const w = shelves.map((sh, si) => (sh.items[A.pick[si]] || {}).word || '');
      return fill(fin.nameFmt || '{a} {b}{c}', { a: w[2], b: w[0], c: w[1] });
    };
    function refreshName() {
      if (A.nameSign) { A.nameSign.removeFromParent(); A.nameSign.material.map.dispose(); A.nameSign.material.dispose(); const k = signs.indexOf(A.nameSign); if (k >= 0) signs.splice(k, 1); A.nameSign = null; }
      const done = allPicked();
      if (done) { const s = signSprite(creatureName(), fin.signSub || '', { scene, bg: '#FFF0FA', fg: '#6A2F7A', w: 4.6 }); s.userData.anchor = [CX, Y + 0.15, CZ + 2.05]; signs.push(s); A.nameSign = s; }
      if (done && !spots.includes(finSp)) { spots.push(finSp); addHit(finSp); finSp.pad.visible = true; showToast(fin.ready || '', 4.5); }
      if (!done && spots.includes(finSp)) { spots.splice(spots.indexOf(finSp), 1); const k = hit.indexOf(finSp.hb); if (k >= 0) hit.splice(k, 1); scene.remove(finSp.hb); finSp.pad.visible = false; hideCard(); R.cur = null; }
    }
    function choose(si, ii) {
      closePop();
      const sh = shelves[si], it = sh.items[ii];
      A.pick[si] = ii;
      if (A.attached[si]) { A.attached[si].removeFromParent(); A.attached[si] = null; }
      A.fliers = A.fliers.filter(f => { if (f.si === si) { f.outer.removeFromParent(); return false; } return true; });
      const pc = makeDreamPiece(it.id), outer = new THREE.Group();
      pc.g.position.set(-pc.c[0], -pc.c[1], -pc.c[2]); outer.add(pc.g);
      outer.position.copy(A.slotPos[si][ii]); outer.scale.setScalar(0.62); scene.add(outer);
      A.fliers.push({ si, outer, g: pc.g, c: pc.c, from: A.slotPos[si][ii].clone(), t: 0 });
      A.rings[si].position.x = A.slotPos[si][ii].x; A.rings[si].visible = true;
      setPad(spots.find(s => s.id === 'shelf' + si), sh.pad || '', it.name, SC[si] || '#FF9AD8');
      A.qmark.visible = false;
      showToast(fill(fin.stuck || '{name}을(를) 붙였어요', { name: it.name }), 2.6);
      refreshName();
    }
    function openPicker(si) {
      const sh = shelves[si];
      talkUI(sh.title || '', sh.ask || '', (sh.items || []).map((it, ii) => ({ label: it.name + (A.pick[si] === ii ? ' ✓' : ''), choice: true, go: () => choose(si, ii) })), { speak: false });
    }
    function resetAll() {
      A.fliers.forEach(f => f.outer.removeFromParent()); A.fliers = [];
      A.attached.forEach((g, i) => { if (g) g.removeFromParent(); A.attached[i] = null; });
      shelves.forEach((sh, si) => { A.pick[si] = -1; A.rings[si].visible = false; setPad(spots.find(s => s.id === 'shelf' + si), sh.pad || '', sh.padLabel || '고르기', SC[si] || '#FF9AD8'); });
      A.qmark.visible = true; refreshName(); showToast(fin.cleared || '', 3);
    }
    function finishFlow() {
      if (!allPicked()) { showToast(fin.notYet || '', 3); return; }
      const nm = creatureName(), who = pr.name || T.principal;
      const quizBtn = { label: fin.quizBtn || '퀴즈 풀기', primary: true, go: () => startPractice(cfg.quiz) };
      const step3 = () => talkUI(who, fin.line2 || '', [quizBtn, { label: fin.redoBtn || '다시 만들기', go: () => { closePop(); resetAll(); } }, { label: T.later, go: closePop }]);
      const step2 = () => talkUI(who, fill(fin.line1 || '', { name: nm }), [{ label: T.next, primary: true, go: step3 }]);
      talkUI(fin.nameWho || '이름표', nm, [{ label: T.next, primary: true, go: step2 }], { feedback: fin.nameNote, fbKind: 'ok', speak: false });
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => (x / WX) * (x / WX) + (z / WZ) * (z / WZ) < 1,
      // 가로 25칸이 보이게. 폰 세로는 먼 거리까지 물러난다
      camD: () => clamp(25 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 18, 58) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= 2 * RXE + 1.5 ? 0 : clamp(me.x, -RXE + hw - 0.6, RXE - hw + 0.6),
        hd * 2 >= 2 * RZE + 2.5 ? -1.2 : clamp(me.z, -RZE + hd - 1.4, RZE - hd + 1.7)
      ],
      spawn: { x: -6.2, z: 2.2, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'dream', anim: A };
    return R.built;
  }
  function updateDream(dt, me) {
    const A = R.built.anim; A.t += dt;
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 && dz > -0.6 ? clamp(Math.atan2(dx, dz), -1.3, 1.3) : 0.35; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    A.items.forEach(o => { o.outer.position.y = o.y + Math.sin(A.t * 1.3 + o.ph) * 0.1; o.outer.rotation.y = Math.sin(A.t * 0.7 + o.ph) * 0.35; });
    A.rings.forEach(r => { r.rotation.y += dt * 0.8; });
    A.bubbles.forEach(b => { b.position.y = b.userData.y + Math.sin(A.t * 0.8 + b.userData.ph) * 0.3; });
    if (A.qmark) A.qmark.position.y = Y + 1.7 + Math.sin(A.t * 2) * 0.08;
    A.creature.position.y = (Y + 0.5) + Math.sin(A.t * 1.6) * 0.06;
    A.creature.rotation.y = Math.sin(A.t * 0.9) * 0.3;
    A.pring.rotation.y += dt;
    for (let i = A.fliers.length - 1; i >= 0; i--) {
      const f = A.fliers[i]; f.t += dt / 0.9;
      const k = Math.min(1, f.t), e = k * k * (3 - 2 * k), cp = A.creature.position;
      const tx = cp.x + f.c[0], ty = cp.y + f.c[1], tz = cp.z + f.c[2];
      f.outer.position.set(f.from.x + (tx - f.from.x) * e, f.from.y + (ty - f.from.y) * e + Math.sin(Math.PI * e) * 1.6, f.from.z + (tz - f.from.z) * e);
      f.outer.scale.setScalar(0.62 + 0.38 * e); f.outer.rotation.y = e * Math.PI * 2;
      if (f.t >= 1) { f.outer.removeFromParent(); f.g.position.set(0, 0, 0); A.creature.add(f.g); A.attached[f.si] = f.g; A.fliers.splice(i, 1); }
    }
  }
  HALLS.dream = [buildDream, updateDream];
  /* ==== hall:dream 끝 ==== */
  /* ==== hall:pattern 시작 ==== */
  // ── 패턴 정원(AI가 지은 섬, 생각 구역) — 꽃 줄의 빈 자리를 규칙으로 맞히면 가운데 줄기 탑이 자란다 ──
  // 글·줄 고르기는 모두 lobby.config.js rooms.pattern(모두 [확인 전]). 줄 셋(cfg.rows) → 규칙이 바뀌는 줄(cfg.twist) → 마무리 퀴즈(cfg.quiz) → 도장.
  function buildPattern(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#CDB9F0');
    scene.add(new THREE.HemisphereLight(0xf2eeff, 0x7fb8a4, 0.62));
    const sun = new THREE.DirectionalLight(0xfff0e0, 0.38); sun.position.set(-12, 26, 16); scene.add(sun);
    const PW = 22, PD = 12, HW = PW / 2, HD = PD / 2;
    const ROWZ = [-4.0, -1.2, 1.6], SX0 = -9.4, SSTEP = 1.55, PADX = 1.7;
    const TX = 6.6, TZ = -2.2, BEDZ = 3.7, TWX = [2.7, 4.2, 5.7, 7.2], TWPAD = [9.2, 3.7], QPAD = [9.2, 0.6], DOORZ = HD - 0.8;
    const pr = cfg.principal || {}, rows = cfg.rows || [], quiz = cfg.quiz || null, tw = cfg.twist || {}, tower = cfg.tower || {};
    const coll = [], signs = [], hit = [];
    const A = { t: 0, solved: rows.map(() => false), wrong: rows.map(() => new Set()), level: 0, twistSeen: false, rows: [], pop: [], drift: [], tiers: [], top: null, topUp: false, rini: null, padState: {}, padMesh: {}, padDef: {}, qs: [], twistFlower: null };
    let seed = 5; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });

    // 바닥: 연한 민트 판 + 라일락 테두리 받침 + 가장자리 덤불
    const floorT = canvasTex(1408, 768, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#DDF8EC'); gr.addColorStop(1, '#BFECDD'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.12})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 60 + rnd() * 120, 30 + rnd() * 60, rnd() * 3, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 3, 0, Math.PI * 2); g.fill(); }
    });
    flat(PW, PD, basic(floorT), 0, 0, 0).renderOrder = 0;
    part(new THREE.BoxGeometry(PW + 0.9, 0.7, PD + 0.9), '#A99BE8', 0, Y - 0.36, 0);
    part(new THREE.BoxGeometry(PW + 0.9, 0.16, PD + 0.9), '#CBBDF6', 0, Y - 0.08, 0);
    for (let x = -HW - 0.3; x <= HW + 0.31; x += 0.95) { const r = 0.5 + rnd() * 0.18; part(new THREE.SphereGeometry(r, 10, 8), rnd() < 0.5 ? '#8FD9B6' : '#A9E6C8', x, Y + 0.3, -HD - 0.15); if (rnd() < 0.35) part(new THREE.SphereGeometry(0.13, 6, 5), '#FFB3D9', x + 0.1, Y + 0.85, -HD + 0.1); }
    for (let z = -HD + 0.9; z <= HD + 0.3; z += 1.0) [-HW - 0.3, HW + 0.3].forEach(x => part(new THREE.SphereGeometry(0.42 + rnd() * 0.15, 10, 8), rnd() < 0.5 ? '#8FD9B6' : '#A9E6C8', x, Y + 0.25, z));

    // 빛 꽃(재사용 도형). item = { c: 색, s: 크기, n: 송이 수(1~4) }
    const glowT = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const petalG = new THREE.SphereGeometry(0.13, 8, 6), centerG = new THREE.SphereGeometry(0.1, 8, 6), stemG = new THREE.CylinderGeometry(0.03, 0.045, 0.5, 6).translate(0, 0.25, 0);
    const stemM = new THREE.MeshLambertMaterial({ color: '#58B98A' }), centerM = new THREE.MeshLambertMaterial({ color: '#FFE27A', emissive: '#FFD34D', emissiveIntensity: 0.4 });
    const petalM = {}, glowM = {};
    const pm = c => petalM[c] || (petalM[c] = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.12 }));
    const gm = c => glowM[c] || (glowM[c] = new THREE.SpriteMaterial({ map: glowT, color: c, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    const makeBloom = c => {
      const b = new THREE.Group(); b.add(new THREE.Mesh(stemG, stemM));
      for (let a = 0; a < 5; a++) { const m = new THREE.Mesh(petalG, pm(c)), an = a * Math.PI * 2 / 5; m.position.set(Math.cos(an) * 0.17, 0.52, Math.sin(an) * 0.17); m.scale.set(1, 0.6, 1); b.add(m); }
      const ct = new THREE.Mesh(centerG, centerM); ct.position.y = 0.56; b.add(ct);
      const sp = new THREE.Sprite(gm(c)); sp.scale.set(0.85, 0.85, 1); sp.position.y = 0.6; b.add(sp);
      return b;
    };
    const POS = { 1: [[0, 0]], 2: [[-0.3, 0], [0.3, 0]], 3: [[0, -0.28], [-0.3, 0.22], [0.3, 0.22]], 4: [[-0.28, -0.26], [0.28, -0.26], [-0.28, 0.26], [0.28, 0.26]] };
    const makeFlower = (item, x, z) => {
      const G = new THREE.Group(); G.position.set(x, Y + 0.2, z);
      const n = clamp(item.n || 1, 1, 4), bs = (item.s || 1) * (n > 1 ? 0.85 : 1);
      POS[n].forEach(([px, pz]) => { const b = makeBloom(item.c || '#FF8FC7'); b.position.set(px, 0, pz); b.scale.setScalar(bs); G.add(b); });
      scene.add(G); return G;
    };
    const popIn = g => { g.scale.setScalar(0.001); A.pop.push({ g, t: 0 }); };
    const qT = canvasTex(128, 128, (g, w) => { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(w / 2, w / 2, 54, 0, Math.PI * 2); g.fill(); g.lineWidth = 10; g.strokeStyle = '#B79CFF'; g.stroke(); g.fillStyle = '#7A5CD6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 84px ${FONT_B}`; g.fillText('?', w / 2, w / 2 + 6); });
    const makeQ = (x, z) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: qT, transparent: true, depthWrite: false })); s.scale.set(0.95, 0.95, 1); s.position.set(x, Y + 0.95, z); s.renderOrder = 5; s.userData.y = Y + 0.95; scene.add(s); A.qs.push(s); return s; };
    const hexBed = (x, z) => { part(new THREE.CylinderGeometry(0.76, 0.8, 0.16, 6).rotateY(Math.PI / 6), '#8FD3BC', x, Y + 0.08, z); part(new THREE.CylinderGeometry(0.64, 0.64, 0.04, 6).rotateY(Math.PI / 6), '#EAFFF6', x, Y + 0.18, z); };

    // 꽃 줄 셋: 마지막 자리만 비워 '?'
    rows.forEach((row, i) => {
      const z = ROWZ[i], items = row.items || [], n = items.length;
      part(new THREE.BoxGeometry((n - 1) * SSTEP + 1.9, 0.1, 1.75), '#7FCBB0', SX0 + (n - 1) * SSTEP / 2, Y + 0.05, z);
      const R0 = { slots: [], q: null };
      items.forEach((it, k) => {
        const x = SX0 + k * SSTEP; hexBed(x, z); R0.slots.push({ x, z });
        if (k < n - 1) makeFlower(it, x, z); else R0.q = makeQ(x, z);
      });
      A.rows[i] = R0;
    });
    // 규칙이 바뀌는 줄: 같은 꽃 셋 + '?'
    const twItems = tw.items || [];
    part(new THREE.BoxGeometry(3 * SSTEP + 1.9, 0.1, 1.75), '#7FCBB0', (TWX[0] + TWX[3]) / 2, Y + 0.05, BEDZ);
    TWX.forEach((x, k) => { hexBed(x, BEDZ); if (twItems[k] && k < 3) makeFlower(twItems[k], x, BEDZ); });
    A.twistQ = makeQ(TWX[3], BEDZ);

    // 줄기 탑: 맞힐 때마다 한 단씩 자란다
    part(new THREE.CylinderGeometry(1.25, 1.4, 0.3, 24), '#B9A2FF', TX, Y + 0.15, TZ);
    part(new THREE.CylinderGeometry(1.0, 1.0, 0.06, 24), '#EAFFF6', TX, Y + 0.31, TZ);
    part(new THREE.ConeGeometry(0.1, 0.45, 8), '#58B98A', TX, Y + 0.55, TZ);
    const TH = 0.95, TBASE = Y + 0.3;
    [[0.78, '#9FF0DC'], [0.62, '#C8B6FF'], [0.46, '#FFB3D9']].forEach(([r, col], k) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, TH, 20).translate(0, TH / 2, 0), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.1 }));
      m.position.set(TX, TBASE + k * TH, TZ); m.scale.y = 0.001; scene.add(m); A.tiers.push(m);
    });
    { const top = new THREE.Group(); top.position.set(TX, TBASE + 3 * TH, TZ); const b = makeBloom('#FFB3D9'); b.scale.setScalar(1.7); top.add(b); top.scale.setScalar(0.001); scene.add(top); A.top = top; }
    coll.push({ x: TX, z: TZ, r: 1.3 });
    { const ts = signSprite(tower.name || '줄기 탑', tower.sub || '', { scene, bg: '#2F9F6B', fg: '#FFFFFF', w: 3.4 }); ts.userData.anchor = [TX, Y + 4.3, TZ]; signs.push(ts); }

    // 떠다니는 빛 조각
    for (let i = 0; i < 12; i++) {
      const s = 0.22 + rnd() * 0.25, col = ['#9FF0DC', '#B9A2FF', '#8FD8FF', '#FFB3D9'][i % 4];
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(s), glow(col, 0.5));
      const side = i % 2 ? 1 : -1; m.position.set(side * (HW + 1.2 + rnd() * 2.2) * (rnd() < 0.5 ? 1 : 0.55), Y + 0.6 + rnd() * 3.2, -HD + rnd() * (PD + 1.5));
      m.userData.y = m.position.y; scene.add(m); A.drift.push(m);
    }

    // 리니
    const RX = -8.7, RZ = 4.0;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.7; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.4 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    // 발판 그림(열림·잠김·끝남 세 모습)
    const padT = (d, state) => canvasTex(512, 512, (g, w, h) => {
      const color = state === 'lock' ? '#9AA6B8' : d.color;
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.32)); gr.addColorStop(0.8, hexA(color, 0.16)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = state === 'done' ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.62)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke();
      g.globalAlpha = state === 'lock' ? 0.55 : 1;
      g.fillStyle = '#1E2B4A'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${d.text.length > 2 ? 104 : 136}px ${FONT_B}`; g.fillText(d.text, w / 2, h / 2 - 24); g.font = `800 50px ${FONT_B}`; g.fillText(d.sub, w / 2, h / 2 + 72); g.globalAlpha = 1;
      if (state === 'done') { g.fillStyle = '#3FB37F'; g.beginPath(); g.arc(w * 0.78, h * 0.22, 62, 0, Math.PI * 2); g.fill(); g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF'; g.beginPath(); g.moveTo(w * 0.78 - 28, h * 0.22 + 2); g.lineTo(w * 0.78 - 8, h * 0.22 + 24); g.lineTo(w * 0.78 + 30, h * 0.22 - 20); g.stroke(); }
    });
    const padMats = {};
    const padMat = (key, state) => { const k = key + ':' + state; return padMats[k] || (padMats[k] = sheet(padT(A.padDef[key], state))); };
    const mkPad = (key, text, sub, color, x, z, state) => { A.padDef[key] = { text, sub, color }; const m = flat(2.4, 2.4, padMat(key, state), x, z, 0.06); A.padMesh[key] = m; A.padState[key] = state; return m; };
    const setPad = (key, state) => { if (A.padState[key] === state) return; A.padState[key] = state; A.padMesh[key].material = padMat(key, state); };
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(42,77,155,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '섬으로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '섬으로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), 0.5, DOORZ, 0.03);

    // 발판(구역): 리니 · 줄 셋 · 규칙이 바뀌는 줄 · 퀴즈 · 문
    const who = pr.name || T.principal;
    const prog = () => fill(cfg.progress || '꽃 줄 {c}/{n}', { c: A.solved.filter(Boolean).length, n: rows.length });
    const rowAsk = (i, fb, kind) => {
      const row = rows[i];
      talkUI(`${row.title} · ${who}`, row.ask, row.choices.map((c, j) => ({ label: c.ko, choice: true, disabled: A.wrong[i].has(j), go: () => rowPick(i, j) })),
        { progress: prog(), ask: T.choose, feedback: fb, fbKind: kind, speak: !fb });
    };
    const rowPick = (i, j) => {
      const row = rows[i], c = row.choices[j];
      if (c.ok) talkUI(T.me, c.ko, [{ label: cfg.bloomBtn || '꽃 피우기', primary: true, go: () => { closePop(); bloomRow(i); } }], { progress: prog(), feedback: T.good + (row.note ? ' ' + row.note : ''), fbKind: 'ok' });
      else { A.wrong[i].add(j); rowAsk(i, T.tryAgain + (c.hint ? ' ' + c.hint : ''), 'no'); }
    };
    const bloomRow = i => {
      if (A.solved[i]) return;
      const R0 = A.rows[i], last = R0.slots[R0.slots.length - 1];
      A.solved[i] = true; A.level++;
      R0.q.visible = false;
      popIn(makeFlower(rows[i].items[rows[i].items.length - 1], last.x, last.z));
      const sp = R.built.spots.find(s => s.id === 'row' + i); if (sp) { sp.sub = cfg.doneSub || '맞혔어요 · 다시 볼 수 있어요'; sp.btn = cfg.reBtn || '다시 보기'; }
      showToast(fill(cfg.bloomToast || '꽃이 피었어요! 줄기 탑이 자라요 ({c}/{n})', { c: A.level, n: rows.length }), 4);
      if (A.level >= rows.length) setTimeout(() => showToast(cfg.allToast || '세 줄을 다 맞혔어요! 마지막 줄로 가 봐요', 5), 4200);
    };
    const openTwistCard = () => openBook({ title: tw.title || '', sub: tw.sub || '', sample: true, text: tw.text || '' });
    const twistGo = () => {
      if (A.level < rows.length) { showToast(fill(tw.notYet || '먼저 꽃 줄 {left}개를 더 맞혀 봐요', { left: rows.length - A.level }), 4); return; }
      if (A.twistSeen) { openTwistCard(); return; }
      A.twistSeen = true; A.twistQ.visible = false;
      const f = makeFlower(twItems[3] || { c: '#7DB6FF' }, TWX[3], BEDZ); popIn(f); A.twistFlower = f;
      showToast(tw.revealToast || '어? 예상과 다른 꽃이 피었어요!', 3.5);
      setTimeout(() => { if (!R.open) openTwistCard(); }, 1300);
    };
    const spots = [
      { id: 'rini', name: who, sub: cfg.guideSub || '', btn: T.talk, x: RX + 1.7, z: RZ + 0.4, r: 1.3, go: () => talk() }
    ];
    rows.forEach((row, i) => {
      const pad = mkPad('row' + i, row.pad || String(i + 1), row.padSub || '', row.color || '#7C6CE0', PADX, ROWZ[i], 'open');
      spots.push({ id: 'row' + i, name: row.title, sub: row.sub || '', btn: T.start, x: PADX, z: ROWZ[i], r: 1.25, pad, sign: true,
        go: () => { if (A.solved[i]) talkUI(who, row.again || '', [{ label: T.close, primary: true, go: closePop }]); else rowAsk(i); } });
    });
    spots.push({ id: 'twist', name: tw.title || '', sub: tw.padSub2 || '', btn: T.open, x: TWPAD[0], z: TWPAD[1], r: 1.25, sign: true, go: twistGo, pad: mkPad('twist', '!', '바뀜', tw.color || '#E0823E', TWPAD[0], TWPAD[1], 'lock') });
    if (quiz) spots.push({ id: 'quiz', name: quiz.title || '', sub: cfg.quizSub || '', btn: T.start, x: QPAD[0], z: QPAD[1], r: 1.25, sign: true,
      go: () => { if (!A.twistSeen) showToast(cfg.quizLock || '먼저 마지막 줄을 살펴봐요', 4); else startPractice(quiz); }, pad: mkPad('quiz', '?', '퀴즈', cfg.quizColor || '#D9549A', QPAD[0], QPAD[1], 'lock') });
    spots.push({ id: 'door', name: T.exitName || '섬으로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: 0.5, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } });
    const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#B79CFF'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#6FE0B8'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke(); }));
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(sp.x, Y + 0.03, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      if (sp.sign) { const sg = signSprite(sp.name, '', { scene, w: 3.2 }); sg.userData.anchor = [sp.x, Y + 0.05, sp.z - 1.15]; signs.push(sg); }
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => x > -HW + 0.35 && x < HW - 0.35 && z > -HD + 0.6 && z < HD - 0.3,
      camD: () => clamp(23 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= PW + 1.5 ? 0 : clamp(me.x, -HW + hw - 0.6, HW - hw + 0.6),
        hd * 2 >= PD + 2.5 ? -1.0 + Math.max(0, me.z - 3.0) * 0.9 : clamp(me.z, -HD + hd - 1.4, HD - hd + 1.7)
      ],
      spawn: { x: -3.0, z: 4.3, yaw: Math.PI }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'pattern', anim: A };
    A.setPad = setPad; A.popIn = popIn;
    return R.built;
  }
  function updatePattern(dt, me) {
    const A = R.built.anim; A.t += dt;
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.7; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    for (let k = A.pop.length - 1; k >= 0; k--) {
      const p = A.pop[k]; p.t += dt * 1.8;
      const t = Math.min(p.t, 1), c1 = 1.70158, e = 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      p.g.scale.setScalar(Math.max(e, 0.001));
      if (p.t >= 1) { p.g.scale.setScalar(1); A.pop.splice(k, 1); }
    }
    // 줄기 탑: 아래 단이 다 자라야 다음 단이 자란다. 세 단이 다 서면 꼭대기 꽃이 핀다
    const n = R.built.cfg.rows.length, kk = 1 - Math.exp(-dt * 3);
    A.tiers.forEach((m, k) => { const prev = k === 0 ? 1 : A.tiers[k - 1].scale.y, want = A.level > k * n / A.tiers.length && prev > 0.9 ? 1 : 0.001; m.scale.y += (want - m.scale.y) * kk; m.visible = m.scale.y > 0.03; });
    if (!A.topUp && A.level >= n && A.tiers[A.tiers.length - 1].scale.y > 0.9) { A.topUp = true; A.popIn(A.top); }
    if (A.top && A.topUp) A.top.rotation.y += dt * 0.6;
    A.qs.forEach((q, i) => { q.position.y = q.userData.y + Math.sin(A.t * 2 + i) * 0.09; });
    A.drift.forEach((m, i) => { m.rotation.y += dt * 0.5; m.rotation.x += dt * 0.25; m.position.y = m.userData.y + Math.sin(A.t * 0.8 + i) * 0.25; });
    // 발판 모습: 줄은 맞히면 끝남, 마지막 줄은 셋을 다 맞히면 열림, 퀴즈는 마지막 줄을 본 뒤 열림
    A.solved.forEach((s, i) => A.setPad('row' + i, s ? 'done' : 'open'));
    A.setPad('twist', A.twistSeen ? 'done' : (A.level >= n ? 'open' : 'lock'));
    if (A.padMesh.quiz) A.setPad('quiz', A.twistSeen ? 'open' : 'lock');
  }
  HALLS.pattern = [buildPattern, updatePattern];
  /* ==== hall:pattern 끝 ==== */
  /* ==== hall:lake 시작 ==== */
  // 물음 호수(AI가 지은 섬, 2026-10-09 XR개발부): 하늘색 호수 판 + 호숫가 물건 넷과 물에 비친 모습(셋은 진짜와 다르다). 글은 lobby.config.js rooms.lake([확인 전])
  function buildLake(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#9ED8F7');
    scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x7fb4e0, 1.0));
    const sun = new THREE.DirectionalLight(0xfff6ea, 0.6); sun.position.set(-10, 26, 16); scene.add(sun);
    const EX = 12.4, EZ = 6.6, WX = 11.6, WZ = 6.2;       // 바닥 타원 · 걸을 수 있는 타원
    const LX = 9.2, LZ = 5.6, LCZ = -0.4;                  // 호수(물 판) 타원
    const pr = cfg.principal || {}, quiz = cfg.quiz || null, REF = cfg.reflections || [], QS = cfg.questions || [];
    const coll = [], signs = [], hit = [];
    const A = { t: 0, act: -2, done: [], found: 0, revealed: false, cr: 0, pads: [], padCfg: REF, items: [], refl: [], checks: [], sparks: [], rini: null, crystal: null, crSign: null };
    let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });
    const lam = c => new THREE.MeshLambertMaterial({ color: c });
    const addM = (grp, geo, c, x, y, z) => { const m = new THREE.Mesh(geo, lam(c)); m.position.set(x, y, z); grp.add(m); return m; };

    // 바닥: 연한 하늘색 땅 + 받침 + 가장자리 빛 테
    const floorT = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#F2FBFF'); gr.addColorStop(0.7, '#D4F1E8'); gr.addColorStop(1, '#BFE3F7');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    { const f = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.MeshLambertMaterial({ map: floorT })); f.scale.set(EX, EZ, 1); f.rotation.x = -Math.PI / 2; f.position.y = Y; scene.add(f);
      const slab = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.96, 0.8, 72), new THREE.MeshLambertMaterial({ color: '#7DB9E8' })); slab.scale.set(EX + 0.2, 1, EZ + 0.2); slab.position.y = Y - 0.41; scene.add(slab);
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 72), glow('#FFD6F0', 0.85)); rim.scale.set(EX, EZ, 1); rim.rotation.x = -Math.PI / 2; rim.position.y = Y + 0.02; scene.add(rim); }

    // 호수: 반짝이는 파스텔 물 판 + 물가 테
    const waterT = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#E4F8FF'); gr.addColorStop(0.7, '#B5E4FA'); gr.addColorStop(1, '#8FD0F2');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
      for (let k = 0; k < 15; k++) { const y = 40 + k * 30; g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x / 26 + k) * 4; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    });
    { const wt = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.MeshBasicMaterial({ map: waterT })); wt.scale.set(LX, LZ, 1); wt.rotation.x = -Math.PI / 2; wt.position.set(0, Y + 0.05, LCZ); wt.renderOrder = 1; scene.add(wt);
      const sh = new THREE.Mesh(new THREE.RingGeometry(0.965, 1, 72), glow('#FFFFFF', 0.8)); sh.scale.set(LX, LZ, 1); sh.rotation.x = -Math.PI / 2; sh.position.set(0, Y + 0.07, LCZ); sh.renderOrder = 3; scene.add(sh); }
    const sparkT = canvasTex(64, 64, (g, w, h) => { g.strokeStyle = '#FFFFFF'; g.lineCap = 'round'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 58); g.moveTo(6, 32); g.lineTo(58, 32); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(16, 16); g.lineTo(48, 48); g.moveTo(48, 16); g.lineTo(16, 48); g.stroke(); });
    for (let i = 0; i < 16; i++) {
      let x, z; do { x = (rnd() * 2 - 1) * LX * 0.9; z = LCZ + (rnd() * 2 - 1) * LZ * 0.9; } while ((x / LX) * (x / LX) + ((z - LCZ) / LZ) * ((z - LCZ) / LZ) > 0.8);
      const m = flat(0.5, 0.5, sheet(sparkT), x, z, 0.09); m.renderOrder = 4; A.sparks.push({ m, ph: rnd() * 6, sp: 1.2 + rnd() * 1.6 });
    }

    // 뒤쪽 가장자리의 둥근 등불 기둥
    const IX = [-5.0, -1.7, 1.7, 5.0], IZ = [-4.9, -5.7, -5.7, -4.9];
    for (let i = 0; i < 17; i++) {
      const a = Math.PI + 0.12 + i / 16 * (Math.PI - 0.24), x = Math.cos(a) * (EX - 0.5), z = Math.sin(a) * (EZ - 0.4);
      if (IX.some(ix => Math.abs(x - ix) < 2.2) || (x / LX) * (x / LX) + ((z - LCZ) / LZ) * ((z - LCZ) / LZ) < 1.05) continue;
      part(new THREE.CylinderGeometry(0.2, 0.26, 1.6, 10), '#CFE6FA', x, Y + 0.8, z);
      part(new THREE.SphereGeometry(0.28, 10, 8), i % 2 ? '#FFD6F0' : '#BFF3E6', x, Y + 1.8, z);
    }

    // 호숫가 물건 넷(진짜) — 돌 받침 위. 물건 그림(캔버스)은 비친 모습에도 쓴다
    const U = 106.7, BASE = 304;
    const drawItem = (g, kind, diff) => {
      if (kind === 'tree') {
        g.fillStyle = '#B98A66'; g.fillRect(108, BASE - 117, 40, 117); g.fillStyle = '#7FD8A8';
        if (!diff) { [[128, 123, 80], [73, 149, 59], [183, 149, 59]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill(); }); }
        else { [[190, 78, 76], [150, 63, 70], [112, 49, 64]].forEach(c => { g.beginPath(); g.moveTo(128 - c[1], c[0]); g.lineTo(128 + c[1], c[0]); g.lineTo(128, c[0] - c[2]); g.closePath(); g.fill(); }); }
      } else if (kind === 'tower') {
        g.fillStyle = '#CDBBFF'; g.fillRect(69, 112, 118, BASE - 112);
        g.fillStyle = '#7CC9FF'; g.fillRect(114, 205, 28, 40); g.fillRect(114, 140, 28, 40);
        if (!diff) { g.fillStyle = '#FF9FCB'; g.beginPath(); g.moveTo(45, 112); g.lineTo(211, 112); g.lineTo(128, 21); g.closePath(); g.fill(); }
        else { g.fillStyle = '#7FE3C8'; g.beginPath(); g.arc(128, 112, 70, Math.PI, 0); g.closePath(); g.fill(); }
      } else if (kind === 'flower') {
        g.fillStyle = '#6FCB8E'; g.fillRect(122, 91, 12, BASE - 91);
        g.beginPath(); g.ellipse(95, 215, 30, 13, -0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(161, 190, 30, 13, 0.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = diff ? '#B79BFF' : '#FF9FCB';
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.arc(128 + Math.cos(a) * 45, 91 + Math.sin(a) * 45, 29, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(128, 91, 29, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = '#BFD4EC'; g.fillRect(64, 261, 128, 43);
        g.fillStyle = '#FAF6EA'; g.fillRect(80, 155, 96, 106); g.fillRect(69, 48, 118, 96);
        g.fillStyle = '#FFD36B'; g.fillRect(101, 185, 54, 64);
        g.fillStyle = '#1A2A4A'; g.fillRect(83, 62, 90, 52); g.fillStyle = '#3FB8FF';
        [108, 148].forEach(x => { g.beginPath(); g.ellipse(x, 84, 8, 11, 0, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = '#7DFFD1'; g.fillRect(114, 104, 28, 4);
      }
    };
    const reflT = (kind, diff) => canvasTex(256, 320, (g, w, h) => {
      g.translate(0, h); g.scale(1, -1);                      // 위아래로 뒤집어 그린다
      drawItem(g, kind, diff);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.3)';
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 4);   // 물결 줄무늬
    });
    const buildItem = (kind, x, z) => {
      const grp = new THREE.Group(); grp.position.set(x, Y + 0.25, z);
      if (kind === 'tree') { addM(grp, new THREE.CylinderGeometry(0.18, 0.24, 1.1, 10), '#B98A66', 0, 0.55, 0); addM(grp, new THREE.SphereGeometry(0.75, 14, 12), '#7FD8A8', 0, 1.65, 0); addM(grp, new THREE.SphereGeometry(0.55, 12, 10), '#7FD8A8', -0.5, 1.4, 0.05); addM(grp, new THREE.SphereGeometry(0.55, 12, 10), '#7FD8A8', 0.5, 1.4, 0.05); }
      else if (kind === 'tower') { addM(grp, new THREE.CylinderGeometry(0.55, 0.62, 1.8, 16), '#CDBBFF', 0, 0.9, 0); addM(grp, new THREE.ConeGeometry(0.78, 0.85, 16), '#FF9FCB', 0, 2.225, 0); [0.55, 1.2].forEach(y => addM(grp, new THREE.BoxGeometry(0.2, 0.36, 0.1), '#7CC9FF', 0, y, 0.57)); }
      else if (kind === 'flower') { addM(grp, new THREE.CylinderGeometry(0.06, 0.08, 1.9, 8), '#6FCB8E', 0, 0.95, 0); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addM(grp, new THREE.SphereGeometry(0.27, 10, 8), '#FF9FCB', Math.cos(a) * 0.42, 2.0 + Math.sin(a) * 0.42, 0); } addM(grp, new THREE.SphereGeometry(0.27, 10, 8), '#FFE08A', 0, 2.0, 0.12); }
      else {
        addM(grp, new THREE.CylinderGeometry(0.6, 0.66, 0.4, 16), '#BFD4EC', 0, 0.2, 0); addM(grp, new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); addM(grp, new THREE.BoxGeometry(0.5, 0.6, 0.1), '#FFD36B', 0, 0.9, 0.38); addM(grp, new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0);
        const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(xx => { g.beginPath(); g.ellipse(xx, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); grp.add(face);
      }
      scene.add(grp); return grp;
    };
    REF.forEach((r, i) => {
      const x = IX[i], z = IZ[i], kind = r.kind;
      part(new THREE.CylinderGeometry(1.05, 1.15, 0.28, 24), '#EAF6FF', x, Y + 0.14, z);
      A.items[i] = buildItem(kind, x, z); coll.push({ x, z, r: 0.8 });
      const rm = sheet(reflT(kind, !r.same)); rm.opacity = 0.8;
      A.refl[i] = flat(2.4, 3.8, rm, x, z + 0.4 + 1.9, 0.1); A.refl[i].renderOrder = 3;
      const sg = signSprite(r.name || '', '', { scene, bg: '#FFFFFF', fg: '#1F3A6A', w: 2.0 }); sg.userData.anchor = [x, Y + 3.7, z]; signs.push(sg);
    });

    // 발판 넷: 호수 위에 뜬 물건 비교 발판
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.4)); gr.addColorStop(0.8, hexA(color, 0.2)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(31,58,106,0.66)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${text.length > 4 ? 66 : text.length > 2 ? 86 : 130}px ${FONT_B}`; g.fillText(text, w / 2, h / 2 - 22);
      g.font = `800 ${sub.length > 5 ? 44 : 52}px ${FONT_B}`; g.fillText(sub, w / 2, h / 2 + 70); });
    const checkM = sheet(canvasTex(128, 128, (g, w) => { g.fillStyle = '#34C98A'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#FFFFFF'; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(36, 66); g.lineTo(56, 86); g.lineTo(94, 44); g.stroke(); }));
    const PZ = -0.3, padMesh = [];
    REF.forEach((r, i) => {
      padMesh[i] = flat(2.4, 2.4, sheet(padT(r.pad || '', r.padSub || '', r.color || '#FFFFFF')), IX[i], PZ, 0.1);
      A.pads.push({ x: IX[i], z: PZ, r: 1.5 });
      const ck = flat(0.8, 0.8, checkM, IX[i] + 0.95, PZ - 0.95, 0.14); ck.visible = false; ck.renderOrder = 5; A.checks[i] = ck;
    });

    // 물음표 결정(처음엔 숨김 — 다른 것 셋을 찾으면 물 위에 떠오른다)
    const CX = 0, CZ = 2.4;
    const cr = new THREE.Group(); cr.position.set(CX, Y, CZ); cr.visible = false; scene.add(cr); A.crystal = cr;
    { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.8).scale(1, 1.4, 1), new THREE.MeshLambertMaterial({ color: '#4FB4F5', emissive: '#2C7FD0', emissiveIntensity: 0.3 })); gem.position.y = 1.7; cr.add(gem); A.gem = gem;
      const qT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 100px ${FONT_B}`; g.shadowColor = 'rgba(31,58,106,0.6)'; g.shadowBlur = 8; g.fillText('?', w / 2, h / 2 + 4); });
      const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qT, transparent: true, depthWrite: false })); q.scale.set(1.0, 1.0, 1); q.position.y = 1.7; q.material.depthTest = false; q.renderOrder = 10; cr.add(q);
      const hT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: hT, color: '#BFE9FF', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(3.4, 3.4, 1); halo.position.y = 1.7; cr.add(halo); A.halo = halo; }
    const padMat2 = sheet(canvasTex(256, 256, (g, w) => { const c = w / 2; g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(c, c, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 14; g.strokeStyle = '#7CC9FF'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#FFB5D8'; g.setLineDash([22, 16]); g.beginPath(); g.arc(c, c, 78, 0, Math.PI * 2); g.stroke(); }));
    const crCfg = cfg.crystal || {};
    { const sg = signSprite(crCfg.name || '', '', { scene, bg: '#E6F4FF', fg: '#1F3A6A', w: 2.8 }); sg.userData.anchor = [CX, Y + 0.05, CZ + 1.5]; sg.visible = false; A.crSign = sg; }

    // 리니
    const RX = -9.9, RZ = 0.2;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.4 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    // 나가는 문: 빛 발판
    const DX = -8.2, DZ = 3.9;
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(31,58,106,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '섬으로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '섬으로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), DX, DZ, 0.13);

    // ── 활동 ──
    const who = () => pr.name || T.principal;
    const ask = (i, fb) => {
      const r = REF[i];
      if (A.done[i]) { talkUI(who(), r.note || '', [{ label: T.close, primary: true, go: closePop }], { speak: false }); return; }
      talkUI(who() + ' · ' + (r.name || ''), cfg.reflectionAsk || '물에 비친 모습이 진짜와 같나요?', [
        { label: cfg.sameLabel || '같아요', choice: true, go: () => answer(i, true) },
        { label: cfg.diffLabel || '달라요', choice: true, go: () => answer(i, false) }
      ], { ask: T.choose, feedback: fb, fbKind: fb ? 'no' : undefined, speak: !fb });
    };
    const answer = (i, saidSame) => {
      const r = REF[i];
      if (!!r.same !== saidSame) { ask(i, T.tryAgain + (r.hint ? ' ' + r.hint : '')); return; }
      A.done[i] = true; A.checks[i].visible = true;
      if (!r.same) A.found++;
      const need = REF.filter(x => !x.same).length, all = A.found >= need && !A.revealed;
      talkUI(who() + ' · ' + (r.name || ''), r.note || '', [{ label: T.close, primary: true, go: closePop }], { feedback: T.good + (all ? ' ' + (cfg.revealLine || '') : ''), fbKind: 'ok', speak: false });
      if (all) reveal();
    };
    const reveal = () => {
      if (A.revealed) return; A.revealed = true; cr.visible = true; A.crSign.visible = true; signs.push(A.crSign);
      spots.push(crSpot); hit.push(crSpot.hb);
      showToast(cfg.revealLine || '', 5);
    };
    const openQuestions = () => {
      const parts = [cfg.questionsIntro || ''];
      QS.forEach((q, k) => parts.push(`${k + 1}. ${q.q} ${q.note || ''}`));
      if (cfg.questionsEnd) parts.push(cfg.questionsEnd);
      openBook({ title: cfg.questionsTitle || '', sub: cfg.questionsSub || '', sample: true, text: parts.join('\n\n') });
    };

    const hitBox = sp => { const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial()); hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); sp.hb = hb; return hb; };
    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: -8.5, z: 1.7, r: 1.2, go: () => talk() },
      { id: 'door', name: T.exitName || '섬으로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: DX, z: DZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } }
    ];
    REF.forEach((r, i) => spots.push({ id: 'pad' + i, name: r.name || '', sub: cfg.reflectionAsk || '', btn: T.start, x: IX[i], z: PZ, r: 1.5, pad: padMesh[i], go: () => ask(i) }));
    if (quiz) spots.push({ id: 'quiz', name: quiz.title || '', sub: cfg.quizSub || '', btn: T.start, x: 9.6, z: 1.4, r: 1.3, sign: true, go: () => startPractice(quiz) });
    const crSpot = { id: 'crystal', name: crCfg.name || '', sub: crCfg.sub || '', btn: crCfg.btn || T.open, x: CX, z: CZ, r: 1.4, go: () => openQuestions() };
    { const pad = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(CX, Y + 0.12, CZ); pad.renderOrder = 2; cr.add(pad); pad.position.set(0, 0.12, 0); crSpot.pad = pad; }
    hitBox(crSpot); hit.length = 0;   // 결정 상자는 떠오를 때 hit에 넣는다
    for (const sp of spots) {
      if (!sp.pad) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), padMat2); pad.position.set(sp.x, Y + 0.13, sp.z); pad.renderOrder = 2; scene.add(pad); sp.pad = pad; }
      if (sp.sign) { const sg = signSprite(sp.name, '', { scene, w: 3.2 }); sg.userData.anchor = [sp.x, Y + 0.05, sp.z - 1.15]; signs.push(sg); }
      hit.push(hitBox(sp));
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => (x / WX) * (x / WX) + (z / WZ) * (z / WZ) < 1,
      camD: () => clamp(26 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 20, 46) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= 26 ? 0 : clamp(me.x, -13 + hw, 13 - hw),
        hd * 2 >= 15 ? -0.3 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, -EZ + hd - 1.4, EZ - hd + 1.7)
      ],
      spawn: { x: -6.6, z: 2.8, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'lake', anim: A };
    return R.built;
  }
  function updateLake(dt, me) {
    const A = R.built.anim; A.t += dt;
    let act = -1; A.pads.forEach((p, i) => { if (Math.hypot(me.x - p.x, me.z - p.z) < p.r) act = i; });
    if (act !== A.act) { A.act = act; const pd = A.padCfg[act]; if (pd && pd.line && !A.done[act]) showToast(pd.line, 4.5); }
    A.items.forEach((it, i) => { const s = i === act ? 1.06 : 1; it.scale.setScalar(it.scale.x + (s - it.scale.x) * (1 - Math.exp(-dt * 8))); });
    A.refl.forEach((m, i) => { m.material.opacity = 0.72 + Math.sin(A.t * 1.6 + i) * 0.06 + (i === act ? 0.12 : 0); m.scale.x = 1 + Math.sin(A.t * 2.1 + i * 1.7) * 0.015; });
    A.sparks.forEach(s => { s.m.material.opacity = 0.15 + 0.85 * Math.max(0, Math.sin(A.t * s.sp + s.ph)); s.m.scale.setScalar(0.6 + 0.4 * Math.max(0, Math.sin(A.t * s.sp + s.ph))); });
    if (A.revealed) {
      A.cr = Math.min(1, A.cr + dt * 0.8); const e = 1 - Math.pow(1 - A.cr, 3);
      A.crystal.position.y = Y - 1.6 * (1 - e) + 0; A.crystal.scale.setScalar(0.4 + 0.6 * e);
      A.gem.rotation.y += dt * 1.2; A.gem.position.y = 1.7 + Math.sin(A.t * 2) * 0.12; A.halo.material.opacity = 0.3 + Math.sin(A.t * 3) * 0.1;
    }
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
  }
  HALLS.lake = [buildLake, updateLake];
  /* ==== hall:lake 끝 ==== */
  /* @@관 붙이는 자리: 새 관은 이 줄 바로 위에 함수 묶음 + HALLS.<kind> 한 줄 */
  function stamp(id) {
    let fresh = false;
    try { const s = JSON.parse(localStorage.getItem(STAMP_KEY) || '{}'); if (!s[id]) { s[id] = new Date().toISOString().slice(0, 10); localStorage.setItem(STAMP_KEY, JSON.stringify(s)); fresh = true; } } catch (_) { /* 저장 못 해도 진행 */ }
    showToast(T.stamped || '연수 수첩에 도장을 찍었어요', 4);
    if (core.onStamp) core.onStamp(id, fresh);   // 로비의 연수 수첩(버튼 숫자·6개면 수료증)
  }

  // ── 들어가기·나가기·매 화면 ──
  function enter(school, cfg) {
    if (R.built && R.built.school.id !== school.id) invalidate();
    if (!R.built) R.built = cfg && HALLS[cfg.kind] ? HALLS[cfg.kind][0](school, cfg) : build(school, cfg);
    R.school = school; R.cfg = cfg; R.world = R.built.world; R.spots = R.built.spots; R.cur = null; R.inside = true;
    return R.world;
  }
  function leave() {
    closePop();
    R.cur = null; R.inside = false;
  }
  // 지어 둔 교실 버리기(관리자 페이지 글이 늦게 왔거나 다른 학교로 갈 때). 들어가 있는 동안은 그대로 둔다
  function invalidate() {
    if (!R.built || R.inside) return;
    if (R.built.npc) removeChar(R.built.npc);
    R.built.world.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    R.built = null;
  }
  function update(dt, me) {
    if (!R.world) return;
    R.me = me;
    if (HALLS[R.built.kind]) HALLS[R.built.kind][1](dt, me);
    else {
      // 교장 선생님은 가까이 오면 방문자를 바라본다
      const npc = R.built.npc;
      const dx = me.x - npc.x, dz = me.z - npc.z, dist = Math.hypot(dx, dz);
      npc.tyaw = dist < 4 ? Math.atan2(dx, dz) : 0;
    }
    let near = null;
    for (const sp of R.spots) if (Math.hypot(me.x - sp.x, me.z - sp.z) < sp.r) { near = sp; break; }
    for (const sp of R.spots) { const s = sp === near ? 1.12 : 1; sp.pad.scale.set(s, 1, s); }
    if (near !== R.cur) {
      R.cur = near;
      if (near && !R.open) showCard({ name: near.name, sub: near.sub, btn: near.btn, go: near.go });
      else if (!near) hideCard();
    }
  }

  // ── 팝업(책·사진첩·TV·대화) ──
  function openPop(kind) {
    closePop();
    const pop = $('pop');
    pop.hidden = false;
    pop.dataset.kind = kind;
    $('popBook').hidden = kind !== 'book';
    $('popAlbum').hidden = kind !== 'album';
    $('popTv').hidden = kind !== 'tv';
    R.open = true;
    setPaused(true);
    hideCard();
    $('popClose').focus();
  }
  function closePop() {
    const pop = $('pop');
    if (!pop.hidden) { pop.hidden = true; const f = $('tvFrame'); f.textContent = ''; }
    const tk = $('talk');
    if (!tk.hidden) tk.hidden = true;
    if (R.open) { R.open = false; setPaused(false); R.cur = null; }
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (_) { /* 없어도 됨 */ } }
  }
  function openBook(b) {
    $('bookTitle').textContent = b.title || '';
    $('bookSub').textContent = b.sub || '';
    const body = $('bookText');
    body.textContent = '';
    String(b.text || '').split(/\n\s*\n/).forEach(par => { const p = document.createElement('p'); p.textContent = par; body.appendChild(p); });
    $('bookTag').hidden = !b.sample;
    // 더 알아보기: 학교 홈페이지 + 관리자 페이지에서 넣은 링크
    const box = $('bookLinks');
    if (box) {
      box.textContent = '';
      const links = [];
      if (R.school && /^https?:\/\//.test(R.school.web || '')) links.push({ label: T.homepage || '홈페이지', url: R.school.web });
      for (const l of (Array.isArray(b.links) ? b.links : (R.cfg && R.cfg.links) || [])) if (l && /^https?:\/\//.test(l.url)) links.push(l);   // 책마다 링크(관리자 페이지 교과별) 또는 관 공통 링크
      if (links.length) {
        const h = document.createElement('div'); h.className = 'lh'; h.textContent = T.moreLinks || '더 알아보기';
        box.appendChild(h);
        for (const l of links) {
          const a = document.createElement('a');
          a.href = l.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.textContent = l.label || l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 30);
          box.appendChild(a);
        }
      }
      box.hidden = !links.length;
    }
    openPop('book');
  }
  function openAlbum(a) {
    $('albumTitle').textContent = a.title || '';
    const grid = $('albumGrid');
    grid.textContent = '';
    const photos = a.photos || [], caps = a.captions || [];
    const n = photos.length || 4;   // 사진이 있으면 사진만, 없으면 빈 액자 넷
    for (let i = 0; i < n; i++) {
      const fr = document.createElement('figure');
      fr.className = 'photo';
      fr.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (1.5 + (i % 3))) + 'deg');
      if (photos[i]) { const img = document.createElement('img'); img.src = photos[i]; img.alt = caps[i] || ''; img.loading = 'lazy'; fr.appendChild(img); }
      else { const ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = (i + 1); fr.appendChild(ph); }
      const fc = document.createElement('figcaption'); fc.textContent = caps[i] || ''; fr.appendChild(fc);
      grid.appendChild(fr);
    }
    $('albumNote').hidden = photos.length > 0;
    openPop('album');
  }
  function openTV(v) {
    $('tvTitle').textContent = v.title || '';
    const f = $('tvFrame');
    f.textContent = '';
    if (v.video) {
      const ifr = document.createElement('iframe');
      ifr.src = v.video; ifr.allow = 'autoplay; encrypted-media; picture-in-picture'; ifr.allowFullscreen = true; ifr.title = v.title || 'video';
      f.appendChild(ifr);
      $('tvNote').hidden = true;
    } else {
      const ph = document.createElement('div'); ph.className = 'tvph'; ph.innerHTML = '<span class="play"></span>';
      f.appendChild(ph);
      $('tvNote').hidden = false;
    }
    openPop('tv');
  }

  // ── 교장 선생님 대화 → 회화 연습(버튼 선택) ──
  const TALK = { lines: [], i: 0, sit: null, step: 0, wrong: new Set() };
  function speak(text) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = 0.9;
      const v = speechSynthesis.getVoices().find(x => /^ko/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (_) { /* 소리 없이 진행 */ }
  }
  function talkUI(who, line, buttons, opt) {
    opt = opt || {};
    const tk = $('talk');
    $('talkWho').textContent = who;
    $('talkLine').textContent = line;
    $('talkListen').hidden = !window.speechSynthesis;
    $('talkListen').onclick = () => speak(line);
    $('talkProg').textContent = opt.progress || '';
    $('talkProg').hidden = !opt.progress;
    const fb = $('talkFb'); fb.textContent = opt.feedback || ''; fb.className = 'fb' + (opt.fbKind ? ' ' + opt.fbKind : ''); fb.hidden = !opt.feedback;
    $('talkAsk').textContent = opt.ask || ''; $('talkAsk').hidden = !opt.ask;
    const box = $('talkBtns'); box.textContent = '';
    for (const b of buttons) {
      const el = document.createElement('button'); el.type = 'button';
      el.className = 'pill' + (b.primary ? ' primary' : '') + (b.choice ? ' choice' : '');
      el.textContent = b.label; el.disabled = !!b.disabled;
      el.onclick = b.go; box.appendChild(el);
    }
    $('talkClose').hidden = buttons.some(b => b.label === T.close);
    tk.hidden = false;
    if (!R.open) { R.open = true; setPaused(true); hideCard(); }
    if (opt.speak !== false) speak(line);
  }
  function talk() {
    const pr = R.cfg.principal || {};
    TALK.lines = pr.lines || []; TALK.i = 0;
    showLine();
  }
  function showLine() {
    const who = (R.cfg.principal || {}).name || T.principal;
    const last = TALK.i >= TALK.lines.length - 1;
    const sits = R.cfg.situations || [];
    const btns = [];
    if (!last) btns.push({ label: T.next, primary: true, go: () => { TALK.i++; showLine(); } });
    else {
      if (sits.length) btns.push({ label: T.start, primary: true, go: () => startPractice(sits[0]) });
      btns.push({ label: sits.length ? T.later : T.close, primary: !sits.length, go: closePop });
    }
    talkUI(who, TALK.lines[TALK.i] || '', btns);
  }
  function startPractice(sit) {
    TALK.sit = sit; TALK.step = 0; TALK.wrong = new Set();
    showStep();
  }
  function showStep(feedback, fbKind) {
    const sit = TALK.sit, st = sit.steps[TALK.step];
    const who = `${sit.npcRole || ''} · ${(R.cfg.principal || {}).name || T.principal}`.replace(/^ · /, '');
    const btns = st.choices.map((c, j) => ({
      label: c.ko, choice: true, disabled: TALK.wrong.has(j),
      go: () => pick(j)
    }));
    talkUI(who, st.npc, btns, { progress: fill(T.progress, { i: TALK.step + 1, n: sit.steps.length }), ask: T.choose, feedback, fbKind, speak: !feedback });
  }
  function pick(j) {
    const sit = TALK.sit, st = sit.steps[TALK.step], c = st.choices[j];
    if (c.ok) {
      const lastStep = TALK.step >= sit.steps.length - 1;
      const fb = T.good + (c.note ? ' ' + c.note : '');
      // 고른 말은 '나'의 말로 보여 준다
      talkUI(T.me, c.ko, [{ label: lastStep ? T.done : T.next, primary: true, go: () => { if (lastStep) finish(); else { TALK.step++; TALK.wrong = new Set(); showStep(); } } }],
        { progress: fill(T.progress, { i: TALK.step + 1, n: sit.steps.length }), feedback: fb, fbKind: 'ok' });
    } else {
      TALK.wrong.add(j);
      showStep(T.tryAgain + (c.hint ? ' ' + c.hint : ''), 'no');
    }
  }
  function finish() {
    const who = (R.cfg.principal || {}).name || T.principal;
    // 관의 마무리(퀴즈 등)를 마치면 연수 수첩 도장(지금은 이 기기 localStorage에만, 수첩 화면은 나중에)
    const sid = R.cfg.stampId && TALK.sit === R.cfg.quiz ? R.cfg.stampId : null;
    talkUI(who, fill(T.doneBody, { title: TALK.sit.title }), [{ label: T.again, go: () => startPractice(TALK.sit) }, { label: T.close, primary: true, go: () => { closePop(); if (sid) stamp(sid); } }], { feedback: T.done, fbKind: 'ok' });
  }

  $('popClose').addEventListener('click', closePop);
  $('pop').addEventListener('click', e => { if (e.target === $('pop')) closePop(); });
  $('talkClose').addEventListener('click', closePop);
  addEventListener('keydown', e => { if (e.key === 'Escape' && R.open) closePop(); });

  return { enter, leave, update, closePop, invalidate, isOpen: () => R.open, state: R };
};
