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

  /* ==== hall:future 시작 ==== */
  /* 미래 전망대(가상융합교육 지도) - 탑 꼭대기 유리 전망대. 시안 ..\시안\mockup-hall-future.html(2026-10-07)을 엔진 꼴로 옮겼다.
     엘리베이터로 올라와(도시가 아래로 내려가는 짧은 연출) 망원경 1~4를 차례로 들여다보고(둥근 창 팝업), 끝 메모판에 한 줄을 남기면 도장.
     글은 lobby.config.js rooms.future(모두 [확인 전]). 메모는 이 기기(localStorage xrFutureMemo)에만 저장하고 서버에 올리지 않는다. */
  const FUT = { R: 5.4, SL: 12.0, WH: 3.4, TZ: -2.8, PZ: -0.9, RISE: 8, KEY: 'xrFutureMemo', ACC: '#ff8fe0',
    X: [-9.6, -3.2, 3.2, 9.6], YAW: [50, 35, -35, -50], MEMO: { x: 11.2, z: 1.7 } };
  const FUTS = { ready: false, loop: 0, rnd: 7 };
  const futRnd = () => (FUTS.rnd = FUTS.rnd * 16807 % 2147483647) / 2147483647;

  /* ── 둥근 창 그림(시안 sceneTutor 등을 그대로 옮김) ── */
  function futPath(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function fRR(g, x, y, w, h, r, fill, stroke, lw) { futPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 4; g.strokeStyle = stroke; g.stroke(); } }
  function fCirc(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || 4; g.strokeStyle = stroke; g.stroke(); } }
  function fGrad(g, a, b) { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
  function fSpark(g, x, y, r, c) { g.fillStyle = c || '#fff'; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }
  function fKid(g, x, y, s, skin, hair, shirt) { fCirc(g, x, y, 22 * s, skin); g.fillStyle = hair; g.beginPath(); g.arc(x, y - 2 * s, 23 * s, Math.PI, 0); g.fill(); fRR(g, x - 28 * s, y + 20 * s, 56 * s, 52 * s, 18 * s, shirt); fCirc(g, x - 8 * s, y + 2 * s, 2.6 * s, '#2b2547'); fCirc(g, x + 8 * s, y + 2 * s, 2.6 * s, '#2b2547'); }
  /* 1 AI 튜터 교실: 로봇 도우미가 학생 곁에서 도와 준다 */
  function futSceneTutor(g) {
    fGrad(g, '#3a2f86', '#5c3fa0');
    fRR(g, 150, 70, 212, 112, 14, '#141b4c', '#7fe8ff', 5);
    [[178, 34, '#7dffd1'], [226, 56, '#6fe9ff'], [274, 80, '#ff9fe0']].forEach(([x, hh, c]) => { g.fillStyle = c; g.fillRect(x, 166 - hh, 30, hh); });
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(166, 166); g.lineTo(346, 166); g.stroke();
    g.fillStyle = '#6c4aa8'; g.fillRect(0, 346, 512, 166); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 346, 512, 6);
    fCirc(g, 372, 238, 27, '#ffe0c2'); g.fillStyle = '#3b2a1e'; g.beginPath(); g.arc(372, 234, 28, Math.PI, 0); g.fill(); fCirc(g, 364, 242, 3, '#2b2547'); fCirc(g, 381, 242, 3, '#2b2547');
    fRR(g, 340, 262, 64, 64, 16, '#7dd3fc');
    fRR(g, 304, 316, 140, 18, 6, '#d9a36b'); g.fillStyle = '#8a5f3a'; g.fillRect(314, 334, 10, 64); g.fillRect(424, 334, 10, 64); fRR(g, 346, 300, 52, 16, 4, '#9ff0ff');
    fRR(g, 104, 268, 86, 88, 18, '#f4f1ea', '#c9c2b4', 3); fCirc(g, 147, 312, 11, '#7dffd1');
    fRR(g, 94, 170, 106, 88, 22, '#f4f1ea', '#c9c2b4', 3); fRR(g, 106, 182, 82, 62, 14, '#18284a');
    g.fillStyle = '#6fe9ff'; [131, 163].forEach(x => { g.beginPath(); g.ellipse(x, 210, 8, 12, 0, 0, 7); g.fill(); });
    g.strokeStyle = '#6fe9ff'; g.lineWidth = 4; g.beginPath(); g.arc(147, 222, 13, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
    g.strokeStyle = '#cfd6e8'; g.lineWidth = 5; g.beginPath(); g.moveTo(147, 170); g.lineTo(147, 146); g.stroke(); fCirc(g, 147, 139, 9, '#7dffd1');
    fRR(g, 186, 288, 80, 20, 10, '#f4f1ea', '#c9c2b4', 3); fCirc(g, 270, 298, 12, '#f4f1ea', '#c9c2b4', 3);
    fRR(g, 262, 128, 116, 70, 20, 'rgba(255,255,255,.97)'); g.fillStyle = 'rgba(255,255,255,.97)'; g.beginPath(); g.moveTo(322, 196); g.lineTo(344, 214); g.lineTo(344, 190); g.fill();
    fCirc(g, 320, 160, 17, '#ffd36b'); fRR(g, 312, 175, 16, 11, 3, '#9a9ab0'); g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.lineCap = 'round';
    [[290, 160, 276, 160], [350, 160, 364, 160], [296, 138, 286, 128], [344, 138, 354, 128]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
    fSpark(g, 430, 150, 14, '#fff'); fSpark(g, 76, 120, 11, '#9ff0ff');
  }
  /* 2 디지털 트윈 학교: 실제 학교와 똑같이 본뜬 빛의 쌍둥이 */
  function futSceneTwin(g) {
    fGrad(g, '#0b2650', '#14507c');
    g.fillStyle = 'rgba(14,70,120,.9)'; g.fillRect(0, 352, 512, 160); g.strokeStyle = 'rgba(111,233,255,.4)'; g.lineWidth = 2;
    [370, 392, 420, 456, 500].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); });
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(256 + i * 22, 352); g.lineTo(256 + i * 80, 512); g.stroke(); }
    const school = (ox, holo) => {
      const paint = (fill, path) => { g.beginPath(); path(); if (holo) { g.fillStyle = 'rgba(111,233,255,.13)'; g.fill(); g.setLineDash([10, 6]); g.lineWidth = 4; g.strokeStyle = '#6fe9ff'; g.stroke(); g.setLineDash([]); } else { g.fillStyle = fill; g.fill(); } };
      paint('#f2d6a2', () => g.rect(ox + 74, 252, 132, 100)); paint('#c8553a', () => g.rect(ox + 66, 238, 148, 16)); paint('#f2d6a2', () => g.rect(ox + 118, 196, 44, 44));
      paint('#c8553a', () => { g.moveTo(ox + 112, 196); g.lineTo(ox + 140, 164); g.lineTo(ox + 168, 196); g.closePath(); }); paint('#6b4526', () => g.rect(ox + 128, 308, 24, 44));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) paint('#7fc8ff', () => g.rect(ox + 84 + c * 29, 266 + r * 36, 18, 22));
      if (holo) [[74, 252], [206, 252], [140, 164], [74, 352], [206, 352]].forEach(([x, y]) => fCirc(g, ox + x, y, 6, '#ffffff'));
    };
    school(-20, false); school(214, true);
    g.strokeStyle = '#6fe9ff'; g.fillStyle = '#6fe9ff'; g.lineWidth = 5; g.setLineDash([10, 8]);
    [[196, 292, 276, 292], [276, 322, 196, 322]].forEach(([x1, y1, x2, y2]) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); });
    g.setLineDash([]); [[276, 292, 1], [196, 322, -1]].forEach(([x, y, d]) => { g.beginPath(); g.moveTo(x + 14 * d, y); g.lineTo(x, y - 11); g.lineTo(x, y + 11); g.fill(); });
    fRR(g, 190, 70, 132, 78, 12, 'rgba(8,20,50,.88)', '#7dffd1', 4); g.strokeStyle = '#7dffd1'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
    [[206, 130], [228, 112], [248, 122], [272, 96], [300, 106]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); [[228, 112], [272, 96]].forEach(([x, y]) => fCirc(g, x, y, 5, '#fff'));
    fSpark(g, 92, 130, 12, '#9ff0ff'); fSpark(g, 430, 170, 14, '#fff');
  }
  /* 3 먼 학교와 함께 수업: 멀리 있는 두 교실이 화면으로 이어진다 */
  function futSceneFar(g) {
    fGrad(g, '#1b1d63', '#2e2a86');
    for (let i = 0; i < 50; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.25 + futRnd() * 0.5) + ')'; g.fillRect(futRnd() * 512, futRnd() * 300, 2, 2); }
    g.lineWidth = 6; g.strokeStyle = 'rgba(111,233,255,.9)'; g.setLineDash([4, 12]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(142, 250); g.quadraticCurveTo(150, 140, 214, 138); g.stroke(); g.beginPath(); g.moveTo(370, 250); g.quadraticCurveTo(362, 140, 298, 138); g.stroke(); g.setLineDash([]);
    g.save(); g.beginPath(); g.arc(256, 130, 50, 0, Math.PI * 2); g.clip(); g.fillStyle = '#3b82f6'; g.fillRect(200, 80, 112, 100); g.fillStyle = '#4ade80';
    [[236, 112, 22, 16, 0.4], [282, 142, 18, 24, 0.3], [262, 96, 14, 9, 0], [226, 150, 12, 8, 0]].forEach(([x, y, a, b, r]) => { g.beginPath(); g.ellipse(x, y, a, b, r, 0, 7); g.fill(); });
    const sg = g.createRadialGradient(240, 110, 6, 256, 130, 52); sg.addColorStop(0, 'rgba(255,255,255,.28)'); sg.addColorStop(1, 'rgba(0,0,30,.35)'); g.fillStyle = sg; g.fillRect(200, 80, 112, 100); g.restore();
    fCirc(g, 256, 130, 50, null, 'rgba(160,220,255,.9)', 4);
    [[58, '#ff9fe0', ['#ffd9b0', '#f4c08a', '#ffe0c2'], ['#3b2a1e', '#7a4a2a', '#1f1a3a'], ['#7dd3fc', '#fda4af', '#fde68a']], [286, '#7dffd1', ['#ffe0c2', '#e8b48a', '#ffd9b0'], ['#1f1a3a', '#3b2a1e', '#a0522d'], ['#c4b5fd', '#a7f3d0', '#fdba74']]].forEach(([x, c, skins, hairs, shirts]) => {
      fRR(g, x, 250, 168, 150, 18, '#222c78', c, 5); fRR(g, x + 16, 266, 136, 84, 10, '#0f1647', '#7fe8ff', 3);
      [0, 1, 2].forEach(i => fKid(g, x + 46 + i * 38, 296, 0.62, skins[i], hairs[i], shirts[i]));
      [0, 1].forEach(i => { fCirc(g, x + 56 + i * 56, 380, 14, skins[i + 1]); g.fillStyle = hairs[i]; g.beginPath(); g.arc(x + 56 + i * 56, 378, 14.5, Math.PI, 0); g.fill(); });
    });
    fRR(g, 218, 316, 76, 34, 14, 'rgba(8,20,50,.9)', '#6fe9ff', 3); g.strokeStyle = '#6fe9ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(232, 333); g.lineTo(280, 333); g.stroke(); fCirc(g, 240, 333, 5, '#7dffd1'); fCirc(g, 272, 333, 5, '#ff9fe0');
    fSpark(g, 438, 120, 13, '#fff'); fSpark(g, 76, 170, 10, '#9ff0ff');
  }
  /* 4 홀로그램 수업: 눈앞에 입체가 떠오르고 학생들이 올려다본다 */
  function futSceneHolo(g) {
    fGrad(g, '#2b1260', '#4a1f86');
    g.fillStyle = '#3a1a70'; g.fillRect(0, 380, 512, 132); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 380, 512, 5);
    const bg = g.createLinearGradient(0, 120, 0, 380); bg.addColorStop(0, 'rgba(111,233,255,.03)'); bg.addColorStop(1, 'rgba(111,233,255,.4)'); g.fillStyle = bg; g.beginPath(); g.moveTo(206, 372); g.lineTo(306, 372); g.lineTo(360, 120); g.lineTo(152, 120); g.closePath(); g.fill();
    g.fillStyle = '#1b0d45'; g.beginPath(); g.ellipse(256, 376, 92, 20, 0, 0, 7); g.fill(); g.strokeStyle = '#6fe9ff'; g.lineWidth = 4; g.stroke(); g.fillStyle = 'rgba(111,233,255,.5)'; g.beginPath(); g.ellipse(256, 376, 56, 11, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(256, 240, 98, 34, -0.4, 0, 7); g.stroke();
    const at = [[256, 240, 32, '#ff9fe0'], [190, 200, 19, '#6fe9ff'], [330, 210, 21, '#7dffd1'], [210, 296, 17, '#ffd36b'], [308, 290, 19, '#c4b5fd']];
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 7; at.slice(1).forEach(([x, y]) => { g.beginPath(); g.moveTo(256, 240); g.lineTo(x, y); g.stroke(); });
    at.forEach(([x, y, r, c]) => { fCirc(g, x, y, r + 8, 'rgba(255,255,255,.12)'); fCirc(g, x, y, r, c); fCirc(g, x - r * 0.3, y - r * 0.3, r * 0.28, 'rgba(255,255,255,.7)'); });
    fCirc(g, 98, 258, 24, '#ffe0c2'); g.fillStyle = '#3b2a1e'; g.beginPath(); g.arc(98, 254, 25, Math.PI, 0); g.fill(); fRR(g, 70, 284, 56, 92, 20, '#7dffd1');
    g.strokeStyle = '#7dffd1'; g.lineWidth = 13; g.lineCap = 'round'; g.beginPath(); g.moveTo(118, 306); g.lineTo(172, 268); g.stroke(); fCirc(g, 176, 266, 9, '#ffe0c2');
    [[304, '#3b2a1e', '#7dd3fc'], [356, '#7a4a2a', '#fda4af'], [408, '#1f1a3a', '#fde68a']].forEach(([x, hc, sc], i) => { fRR(g, x - 28, 414 + (i % 2) * 6, 56, 80, 24, sc); fCirc(g, x, 396 + (i % 2) * 6, 23, hc); });
    fSpark(g, 408, 170, 14, '#fff'); fSpark(g, 118, 160, 11, '#9ff0ff'); fSpark(g, 300, 150, 9, '#ffd36b');
  }
  const FUT_ART = [futSceneTutor, futSceneTwin, futSceneFar, futSceneHolo];
  /* 팝업에서 쓰는 그림(한 번 그려 두고 다시 쓴다) */
  function futArtCanvas(i) {
    FUTS.art = FUTS.art || [];
    if (!FUTS.art[i]) { const c = document.createElement('canvas'); c.width = c.height = 512; FUTS.rnd = 7 + i; FUT_ART[i](c.getContext('2d')); FUTS.art[i] = c; }
    return FUTS.art[i];
  }
  /* 전망대 위에 떠 있는 둥근 창 */
  function futWinTex(i, seen) {
    return canvasTex(512, 512, g => {
      g.clearRect(0, 0, 512, 512);
      g.save(); g.beginPath(); g.arc(256, 256, 216, 0, Math.PI * 2); g.clip(); g.drawImage(futArtCanvas(i), 0, 0);
      const vg = g.createRadialGradient(256, 256, 140, 256, 256, 218); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,16,.4)'); g.fillStyle = vg; g.fillRect(0, 0, 512, 512); g.restore();
      g.save(); g.shadowColor = FUT.ACC; g.shadowBlur = 20; g.lineWidth = 14; g.strokeStyle = FUT.ACC; g.beginPath(); g.arc(256, 256, 226, 0, Math.PI * 2); g.stroke(); g.restore();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(256, 256, 211, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 12; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(256, 256, 192, Math.PI * 1.08, Math.PI * 1.36); g.stroke();
      fCirc(g, 96, 416, 37, seen ? '#0f4a3a' : '#141a4a', seen ? '#7dffd1' : FUT.ACC, 7); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 50px ' + FONT_B; g.fillText(seen ? '✓' : String(i + 1), 96, 419);
    });
  }
  function futPadTex(text, sub, color, seen) {
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
    return canvasTex(512, 512, g => {
      const gr = g.createRadialGradient(256, 256, 40, 256, 256, 256); gr.addColorStop(0, hexA(color, 0.32)); gr.addColorStop(0.8, hexA(color, 0.16)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.beginPath(); g.arc(256, 256, 205, 0, Math.PI * 2); g.fillStyle = 'rgba(10,14,40,0.62)'; g.fill(); g.lineWidth = 16; g.strokeStyle = seen ? '#7dffd1' : color; g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, seen ? '✓' : text, '900', 150, FONT_B, 300); g.fillText(seen ? '✓' : text, 256, 226);
      fitFont(g, sub, '800', 54, FONT_B, 330); g.fillStyle = 'rgba(240,248,255,0.96)'; g.fillText(sub, 256, 338);
    });
  }
  /* 메모판: 예시 쪽지 다섯 장 + 내 쪽지 한 장(내가 쓴 한 줄은 이 기기에만 있다) */
  function futBoardTex(M, mine) {
    const NOTES = [['#fff3a0', -3, '#ff9fe0'], ['#ffc4e8', 2, '#7dd3fc'], ['#b8f0ff', -2, '#ffd36b'], ['#c9ffd9', 3, '#c4b5fd'], ['#e1d2ff', -3, '#7dffd1']];
    const ex = M.examples || [];
    return canvasTex(1024, 640, (g, w, h) => {
      futPath(g, 8, 8, w - 16, h - 16, 36); g.fillStyle = '#171a4a'; g.fill(); g.lineWidth = 10; g.strokeStyle = FUT.ACC; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; fitFont(g, M.title || '', '900', 60, FONT_B, 640); g.fillText(M.title || '', 50, 66);
      g.fillStyle = FUT.ACC; g.fillRect(50, 108, 420, 6);
      g.font = '700 32px ' + FONT_B; g.fillStyle = 'rgba(255,224,246,.9)'; g.textAlign = 'right'; g.fillText(M.sub || '', w - 50, 66);
      for (let i = 0; i < 6; i++) {
        const x = 58 + (i % 3) * 312, y = 146 + Math.floor(i / 3) * 236, mineSlot = i === 5, nt = NOTES[i] || ['#ffe0f4', 2, '#7dd3fc'];
        g.save(); g.translate(x + 135, y + 95); g.rotate(nt[1] * Math.PI / 180); g.translate(-135, -95);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(6, 9, 270, 190); g.fillStyle = mineSlot ? '#ffe0f4' : nt[0]; g.fillRect(0, 0, 270, 190);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(100, -12, 70, 26);
        g.textBaseline = 'middle';
        if (!mineSlot) {
          const words = ex[i] || ['', ''];
          g.fillStyle = '#6a5a8a'; g.textAlign = 'left'; g.font = '800 34px ' + FONT_B; g.fillText(M.exTag || '예:', 22, 50);
          g.fillStyle = '#2b2547'; g.textAlign = 'center'; fitFont(g, words[0], '900', 54, FONT_B, 230); g.fillText(words[0], 135, 108); fitFont(g, words[1], '900', 54, FONT_B, 230); g.fillText(words[1], 135, 164);
        } else {
          g.lineWidth = 8; g.strokeStyle = FUT.ACC; g.strokeRect(-4, -4, 278, 198);
          g.fillStyle = '#6a5a8a'; g.textAlign = 'left'; g.font = '800 34px ' + FONT_B; g.fillText(M.mine || '내 쪽지', 22, 38);
          g.textAlign = 'center'; g.fillStyle = '#2b2547';
          if (mine) {
            let sz = 46, lines = [];
            for (; sz >= 28; sz -= 4) {
              g.font = '900 ' + sz + 'px ' + FONT_B; lines = []; let cur = '';
              for (const ch of mine) { if (g.measureText(cur + ch).width > 240) { lines.push(cur); cur = ch; } else cur += ch; }
              if (cur) lines.push(cur);
              if (lines.length <= 3) break;
            }
            lines = lines.slice(0, 3);
            lines.forEach((ln, k) => g.fillText(ln, 135, 112 + (k - (lines.length - 1) / 2) * (sz + 6)));
          } else {
            g.strokeStyle = '#2b2547'; g.lineWidth = 5; g.beginPath(); g.moveTo(34, 112); g.lineTo(226, 112); g.moveTo(34, 156); g.lineTo(150, 156); g.stroke();
            g.fillStyle = FUT.ACC; futPath(g, 130, 140, 128, 44, 22); g.fill(); g.fillStyle = '#fff'; g.font = '800 28px ' + FONT_B; g.fillText(M.empty || '여기에 붙어요', 194, 163);
          }
        }
        g.restore();
      }
    });
  }
  function futStadium(r, P2) {
    const SL = FUT.SL, n = 40;
    P2.moveTo(-SL, -r); P2.lineTo(SL, -r);
    for (let i = 1; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; P2.lineTo(SL + r * Math.cos(a), r * Math.sin(a)); }
    P2.lineTo(-SL, r);
    for (let i = 1; i <= n; i++) { const a = Math.PI / 2 + Math.PI * i / n; P2.lineTo(-SL + r * Math.cos(a), r * Math.sin(a)); }
    P2.closePath(); return P2;
  }
  function futLoopPts() {
    const R0 = FUT.R, SL = FUT.SL, pts = [], na = 40;
    for (let i = 0; i <= 24; i++) pts.push([-SL + 2 * SL * i / 24, -R0]);
    for (let i = 1; i <= na; i++) { const a = -Math.PI / 2 + Math.PI * i / na; pts.push([SL + R0 * Math.cos(a), R0 * Math.sin(a)]); }
    for (let i = 1; i <= 24; i++) pts.push([SL - 2 * SL * i / 24, R0]);
    for (let i = 1; i < na; i++) { const a = Math.PI / 2 + Math.PI * i / na; pts.push([-SL + R0 * Math.cos(a), R0 * Math.sin(a)]); }
    pts.push(pts[0]); return pts;
  }
  /* 건물 한 채의 옆면(창문 무늬 uv)과 지붕을 모아 두는 곳에 더한다 */
  function futBoxAcc(acc, w, h, d, x, y, z, U, tint, roofKey) {
    const hx = w / 2, hz = d / 2, y0 = y - h / 2, y1 = y + h / 2;
    const quad = (p, u, v) => {
      const o = [0, 1, 2, 0, 2, 3], uvs = [[0, 0], [u, 0], [u, v], [0, v]];
      for (const k of o) { acc.pos.push(p[k][0], p[k][1], p[k][2]); acc.uv.push(uvs[k][0], uvs[k][1]); acc.col.push(tint[0], tint[1], tint[2]); }
    };
    quad([[x - hx, y0, z + hz], [x + hx, y0, z + hz], [x + hx, y1, z + hz], [x - hx, y1, z + hz]], w / U, h / U);
    quad([[x + hx, y0, z - hz], [x - hx, y0, z - hz], [x - hx, y1, z - hz], [x + hx, y1, z - hz]], w / U, h / U);
    quad([[x + hx, y0, z + hz], [x + hx, y0, z - hz], [x + hx, y1, z - hz], [x + hx, y1, z + hz]], d / U, h / U);
    quad([[x - hx, y0, z - hz], [x - hx, y0, z + hz], [x - hx, y1, z + hz], [x - hx, y1, z - hz]], d / U, h / U);
    const rf = acc[roofKey || 'roof'];
    const rp = [[x - hx, y1, z + hz], [x + hx, y1, z + hz], [x + hx, y1, z - hz], [x - hx, y1, z - hz]];
    for (const k of [0, 1, 2, 0, 2, 3]) rf.push(rp[k][0], rp[k][1], rp[k][2]);
  }
  function futGeo(acc, withUv) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(acc.pos || acc), 3));
    if (withUv) { g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(acc.uv), 2)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(acc.col), 3)); }
    return g;
  }
  function buildFuture(school, cfg) {
    const R0 = FUT.R, SL = FUT.SL, WH = FUT.WH, TZ = FUT.TZ, PZ = FUT.PZ, ACC = FUT.ACC, GY = Y - 16;
    const SC = cfg.scopes || [], MEMO = cfg.memo || {}, ST = cfg.steps || {}, pr = cfg.principal || {};
    const scene = new THREE.Scene();
    scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05071f'); gr.addColorStop(0.5, '#1a1a52'); gr.addColorStop(1, '#2a1f63'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.Fog('#2a2272', 40, 110);
    scene.add(new THREE.HemisphereLight(0xbccaff, 0x2a1f3a, 0.6));
    const sun = new THREE.DirectionalLight(0xdde6ff, 0.6); sun.position.set(-14, 34, 22); scene.add(sun);
    const coll = [], signs = [], hit = [];
    const A = { t: 0, entered: false, ride: null, city: null, doorL: null, doorR: null, doorK: 1, lamp: null, wins: [], cones: [], padMesh: [], padXY: [], seen: new Set(), memo: '', board: null,
      stamped: false, stampDue: false, notice: null, rini: null, drones: null, cur: -1, cfg, mark: null };
    let seed = 23; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const glow = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false });
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });
    const P = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift) => { const m = plane(w, h, mat, x, Y + (lift || 0.01), z); m.rotation.x = -Math.PI / 2; m.renderOrder = 3; return m; };
    const lamb = c => new THREE.MeshLambertMaterial({ color: c });

    /* ── 아래: 밤의 공존 도시. 엘리베이터가 올라가는 동안 아래로 내려간다 ── */
    const city = new THREE.Group(); scene.add(city); A.city = city;
    const haloTex = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const winTex = pal => {
      const t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#080c30'; g.fillRect(0, 0, w, h);
        const cols = 4, rows = 5, cw = w / cols, rh = h / rows;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = rnd() < 0.5 ? pal[Math.floor(rnd() * pal.length)] : '#10174a'; g.fillRect(c * cw + cw * 0.24, r * rh + rh * 0.22, cw * 0.52, rh * 0.54); }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    };
    const WT = [['#ffcf7a', '#ffe0a0', '#ffb85c', '#ffeabf'], ['#8fe6f7', '#b8f0ff', '#6fd4ee', '#d8f8ff'], ['#ffcf7a', '#f08fd0', '#8fe6f7', '#ffeabf'], ['#8ff0c8', '#d0ffea', '#ffe0a0', '#ffcf7a']].map(winTex);
    const TINT = [[0.69, 0.71, 1], [0.5, 0.55, 0.82], [0.38, 0.42, 0.69], [0.28, 0.33, 0.56]];
    const NEONC = [[0.44, 0.91, 1], [1, 0.44, 0.85], [0.49, 1, 0.82], [1, 0.83, 0.42]];
    const ROOF = [], GARDEN = [], BA = [0, 1, 2, 3].map(() => ({ pos: [], uv: [], col: [], roof: ROOF, garden: GARDEN }));
    const LN = { pos: [], col: [] }, HL = { pos: [], col: [] };
    const edgeTop = (x, y, z, w, d, c) => { const hx = w / 2, hz = d / 2, p = [[x - hx, y, z - hz], [x + hx, y, z - hz], [x + hx, y, z + hz], [x - hx, y, z + hz]]; for (let k = 0; k < 4; k++) { const a = p[k], b = p[(k + 1) % 4]; LN.pos.push(a[0], a[1], a[2], b[0], b[1], b[2]); LN.col.push(c[0], c[1], c[2], c[0], c[1], c[2]); } };
    const bld = (x, z, w, d, h, k, garden) => {
      const dist = Math.hypot(x, z + 12), ti = dist < 38 ? 0 : dist < 62 ? 1 : dist < 86 ? 2 : 3;
      futBoxAcc(BA[k], w, h, d, x, GY + h / 2, z, 2.4, TINT[ti], garden ? 'garden' : 'roof');
      if (!garden) {
        if (rnd() < 0.26) edgeTop(x, GY + h + 0.06, z, w, d, NEONC[(rnd() * 4) | 0]);
        if (h > 9 && rnd() < 0.5) { const c = NEONC[rnd() < 0.5 ? 1 : 0]; HL.pos.push(x, GY + h + 1.2, z); HL.col.push(c[0], c[1], c[2]); }
      }
    };
    const PITCH = 7, SPECIAL = ['-3,-2', '-1,-2', '1,-2', '3,-2'];
    for (let i = -9; i <= 9; i++) for (let j = -12; j <= 3; j++) {
      const cx = i * PITCH, cz = j * PITCH;
      if (Math.abs(cx) < 19.6 && Math.abs(cz) < 9) continue;
      if (SPECIAL.indexOf(i + ',' + j) >= 0) continue;
      const dd = Math.hypot(cx * 0.9, cz + 22), hmax = 3 + 8 * Math.max(0, 1 - dd / 90), B = 5.2, kind = rnd(), south = cz > 6 ? 0.6 : 1;
      const rh = () => Math.min(12, (1.6 + rnd() * hmax + (dd < 60 && rnd() < 0.12 ? 4 + rnd() * 5 : 0)) * south), rk = () => (rnd() * 4) | 0;
      if (kind < 0.3) bld(cx + (rnd() - 0.5) * 0.5, cz + (rnd() - 0.5) * 0.5, B - rnd(), B - rnd(), rh(), rk());
      else if (kind < 0.7) {
        if (rnd() < 0.5) { const wa = 2.0 + rnd(), wb = B - wa - 0.5; bld(cx - B / 2 + wa / 2, cz, wa, B - rnd() * 0.6, rh(), rk()); bld(cx + B / 2 - wb / 2, cz, wb, B - rnd() * 0.6, rh(), rk()); }
        else { const da = 2.0 + rnd(), db = B - da - 0.5; bld(cx, cz - B / 2 + da / 2, B - rnd() * 0.6, da, rh(), rk()); bld(cx, cz + B / 2 - db / 2, B - rnd() * 0.6, db, rh(), rk()); }
      } else [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([a, b]) => bld(cx + a, cz + b, 2.3 - rnd() * 0.3, 2.3 - rnd() * 0.3, rh(), rk()));
    }
    /* 옥상 정원: 사람과 로봇이 함께 있다(공존 도시) */
    const CP = [];
    const cpart = (geo, color, x, y, z) => CP.push(colored(geo.translate(x, y, z), color));
    [[-21, -14, 10, 0], [-7, -14, 9, 1], [7, -14, 10, 2], [21, -14, 9, 3]].forEach(([x, z, h, k], idx) => {
      const w = 5.4, top = GY + h;
      bld(x, z, w, w, h, k, true); edgeTop(x, top + 0.1, z, w, w, NEONC[1]);
      [[-w / 2 + 0.8, -w / 2 + 0.8], [w / 2 - 0.8, -w / 2 + 0.8]].forEach(([a, b]) => { cpart(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 8), '#6b4526', x + a, top + 0.4, z + b); cpart(new THREE.SphereGeometry(0.7, 12, 10), '#2fae80', x + a, top + 1.2, z + b); });
      cpart(new THREE.BoxGeometry(1.8, 0.14, 0.5), '#8a6a4a', x + 0.2, top + 0.36, z - w * 0.1);
      const sx = x - 0.9, sz = z + w * 0.2, s = 0.8;
      cpart(new THREE.BoxGeometry(0.9 * s, 1.0 * s, 0.7 * s), '#faf6ea', sx, top + 0.9 * s, sz); cpart(new THREE.BoxGeometry(1.1 * s, 0.9 * s, 0.9 * s), '#faf6ea', sx, top + 1.95 * s, sz); cpart(new THREE.BoxGeometry(0.5 * s, 0.7 * s, 0.3 * s), '#ffd36b', sx, top + 0.9 * s, sz - 0.5 * s);
      const shirt = ['#fda4af', '#fde68a', '#c4b5fd', '#a7f3d0'][idx];
      cpart(new THREE.CylinderGeometry(0.3, 0.34, 1.0, 10), shirt, sx + 1.5, top + 0.55, sz + 0.1); cpart(new THREE.SphereGeometry(0.3, 12, 10), '#ffe0c2', sx + 1.5, top + 1.3, sz + 0.1);
      if (idx % 2 === 0) { cpart(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 10), '#7dd3fc', x + 1.7, top + 0.5, z - 0.8); cpart(new THREE.SphereGeometry(0.28, 12, 10), '#ffe0c2', x + 1.7, top + 1.2, z - 0.8); }
      HL.pos.push(sx, top + 2.4, sz); HL.col.push(0.49, 1, 0.82);
    });
    BA.forEach((acc, k) => { if (acc.pos.length) city.add(new THREE.Mesh(futGeo(acc, true), new THREE.MeshBasicMaterial({ map: WT[k], vertexColors: true, side: THREE.DoubleSide }))); });
    city.add(new THREE.Mesh(futGeo(ROOF), new THREE.MeshBasicMaterial({ color: 0x15183f, side: THREE.DoubleSide })));
    city.add(new THREE.Mesh(futGeo(GARDEN), new THREE.MeshBasicMaterial({ color: 0x1d6a5e, side: THREE.DoubleSide })));
    city.add(new THREE.Mesh(merge(CP), new THREE.MeshLambertMaterial({ vertexColors: true })));
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LN.pos), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(LN.col), 3));
      city.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
      const h = new THREE.BufferGeometry(); h.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HL.pos), 3)); h.setAttribute('color', new THREE.BufferAttribute(new Float32Array(HL.col), 3));
      city.add(new THREE.Points(h, new THREE.PointsMaterial({ size: 13, sizeAttenuation: false, map: haloTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); }
    /* 바닥(길은 빛 띠로)과 탑 몸통 */
    { const roadT = canvasTex(256, 256, g => { g.fillStyle = '#070a2a'; g.fillRect(0, 0, 256, 256); ['#6fe9ff', '#ff6fd8', '#ffd36b', '#7dffd1'].forEach((c, k) => { g.fillStyle = c; g.globalAlpha = 0.5; g.fillRect(k * 64 + 30, 0, 4, 256); g.fillRect(0, k * 64 + 30, 256, 4); }); g.globalAlpha = 1; });
      roadT.wrapS = roadT.wrapT = THREE.RepeatWrapping; roadT.repeat.set(22, 22);
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(616, 616), new THREE.MeshBasicMaterial({ map: roadT })); gm.rotation.x = -Math.PI / 2; gm.position.set(0, GY, 0); city.add(gm);
      const tt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#0d1338'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(111,233,255,.4)'; g.fillRect(x + 12, 0, 5, h); } for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(255,143,224,.4)'; g.fillRect(0, y, w, 4); } });
      tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(6, 3);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.4, Y - 0.9 - GY, 40, 1, true), new THREE.MeshBasicMaterial({ map: tt })); trunk.position.set(0, (GY + Y - 0.9) / 2, 0.3); scene.add(trunk);
      A.trunk = { m: trunk, top: Y - 0.9, gy: GY };
      const pl = new THREE.Mesh(new THREE.RingGeometry(5.2, 8.0, 56), glow(0xff8fe0, 0.4)); pl.rotation.x = -Math.PI / 2; pl.position.set(0, GY + 0.12, 0.3); city.add(pl);
      const pl2 = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), glow(0x6fe9ff, 0.14)); pl2.rotation.x = -Math.PI / 2; pl2.position.set(0, GY + 0.1, 0.3); city.add(pl2); }
    /* 오가는 불빛(자동차·드론): 길을 따라 천천히 움직인다 */
    { const n = 160, p = new Float32Array(n * 3), c = new Float32Array(n * 3), ax = [], sp = [], cols = [[1, 0.85, 0.5], [1, 0.6, 0.9], [0.6, 0.95, 1], [1, 1, 1]];
      for (let i = 0; i < n; i++) {
        const onX = rnd() < 0.5; ax.push(onX ? 2 : 0); sp.push((rnd() < 0.5 ? -1 : 1) * (1.5 + rnd() * 3));
        if (onX) { p[i * 3] = (Math.floor(rnd() * 19) - 9) * 7 + 3.5 + (rnd() - 0.5) * 0.8; p[i * 3 + 2] = rnd() * 92 - 84; } else { p[i * 3] = rnd() * 126 - 63; p[i * 3 + 2] = (Math.floor(rnd() * 14) - 12) * 7 + 3.5 + (rnd() - 0.5) * 0.8; }
        p[i * 3 + 1] = GY + 0.3 + (rnd() < 0.2 ? rnd() * 8 : 0); c.set(cols[(rnd() * 4) | 0], i * 3);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95 })); pts.frustumCulled = false; city.add(pts);
      A.drones = { pts, ax, sp }; }

    /* ── 전망대 본체: 알약 모양 유리 데크 ── */
    const LP = futLoopPts();
    const hOf = z => { const t = THREE.MathUtils.smoothstep(z, -0.3, 2.2); return WH * (1 - t) + 1.15 * t; };
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(futStadium(R0 - 1.2, new THREE.Shape()), { depth: 0.9, bevelEnabled: false }), [lamb(0x1a2058), lamb(0x151a4a)]);
    slab.rotation.x = -Math.PI / 2; slab.position.y = Y - 0.91; scene.add(slab);
    const floorTex = canvasTex(1800, 600, (g, w, h) => {
      const X = x => (x + 18) * 50, Z = z => (z + 6) * 50;
      const gr = g.createRadialGradient(w / 2, h * 0.55, 60, w / 2, h * 0.55, w * 0.55); gr.addColorStop(0, '#2433a8'); gr.addColorStop(0.6, '#161f78'); gr.addColorStop(1, '#0b1048'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(150,180,255,.1)'; g.lineWidth = 1;
      for (let x = 0; x <= w; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      const stad = r => { g.beginPath(); g.moveTo(X(-SL), Z(-r)); g.lineTo(X(SL), Z(-r)); g.arc(X(SL), Z(0), r * 50, -Math.PI / 2, Math.PI / 2); g.lineTo(X(-SL), Z(r)); g.arc(X(-SL), Z(0), r * 50, Math.PI / 2, Math.PI * 1.5); g.closePath(); };
      [[0.5, 0.55, '255,143,224', 5], [1.2, 0.25, '111,233,255', 3], [2.1, 0.15, '255,143,224', 3]].forEach(([ins, al, c, lw]) => { stad(R0 - 1.2 - ins); g.strokeStyle = 'rgba(' + c + ',' + al + ')'; g.lineWidth = lw; g.stroke(); });
      g.strokeStyle = 'rgba(111,233,255,.3)'; g.lineWidth = 3; [2.0, 1.2].forEach(r => { g.beginPath(); g.arc(X(0), Z(2.0), r * 50, 0, Math.PI * 2); g.stroke(); });
      for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; g.beginPath(); g.moveTo(X(0) + Math.cos(an) * 60, Z(2.0) + Math.sin(an) * 60); g.lineTo(X(0) + Math.cos(an) * 120, Z(2.0) + Math.sin(an) * 120); g.stroke(); }
      g.setLineDash([16, 14]); g.strokeStyle = 'rgba(255,143,224,.55)'; g.lineWidth = 6; g.beginPath(); g.moveTo(X(-15.2), Z(PZ)); g.lineTo(X(12.2), Z(PZ)); g.stroke(); g.setLineDash([]);
    });
    { const fg = new THREE.ShapeGeometry(futStadium(R0 - 1.2, new THREE.Shape())), p = fg.attributes.position, uv = fg.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 18) / 36, (p.getY(i) + 6) / 12);
      uv.needsUpdate = true;
      const fl = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: floorTex })); fl.rotation.x = -Math.PI / 2; fl.position.y = Y + 0.005; scene.add(fl); }
    /* 투명한 유리 띠(바닥 테두리) */
    { const bandT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = 'rgba(180,230,255,.2)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); });
      bandT.wrapS = bandT.wrapT = THREE.RepeatWrapping;
      const rs = futStadium(R0, new THREE.Shape()); rs.holes.push(futStadium(R0 - 1.2, new THREE.Path()));
      const rg = new THREE.ShapeGeometry(rs), p = rg.attributes.position, uv = rg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2, p.getY(i) / 1.2); uv.needsUpdate = true;
      const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: bandT, transparent: true, depthWrite: false, side: THREE.DoubleSide })); rm.rotation.x = -Math.PI / 2; rm.position.y = Y + 0.03; rm.renderOrder = 1; scene.add(rm); }
    const ribbon = (pts, off, wid, yfn, mat) => {
      const n = pts.length, pos = new Float32Array(n * 6), idx = [];
      for (let k = 0; k < n; k++) {
        const x = pts[k][0], z = pts[k][1], cx = clamp(x, -SL, SL), dx = cx - x, dz = -z, l = Math.hypot(dx, dz) || 1, nx = dx / l, nz = dz / l, y = yfn(z);
        pos.set([x + nx * (off + wid / 2), y, z + nz * (off + wid / 2), x + nx * (off - wid / 2), y, z + nz * (off - wid / 2)], k * 6);
        if (k) { const a = (k - 1) * 2, b = k * 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); scene.add(m); return m;
    };
    const strip = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false });
    ribbon(LP, 1.2, 0.2, () => Y + 0.045, strip(0xff8fe0, 0.9));
    ribbon(LP, 0, 0.26, () => Y + 0.05, strip(0x8fe3ff, 0.85));
    ribbon(LP, 0.6, 0.24, () => Y - 0.97, glow(0xff8fe0, 0.7));
    /* 둥근 유리벽(뒤쪽은 높고 앞쪽은 낮은 난간) + 윗난간 + 기둥 */
    { const glassT = canvasTex(256, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(190,230,255,.1)'); gr.addColorStop(1, 'rgba(190,230,255,.26)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(40, h); g.lineTo(110, h); g.lineTo(190, 0); g.lineTo(120, 0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.moveTo(130, h); g.lineTo(150, h); g.lineTo(230, 0); g.lineTo(210, 0); g.closePath(); g.fill();
      });
      glassT.wrapS = THREE.RepeatWrapping;
      const n = LP.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = []; let s = 0;
      for (let k = 0; k < n; k++) { const x = LP[k][0], z = LP[k][1]; if (k) s += Math.hypot(x - LP[k - 1][0], z - LP[k - 1][1]); pos.set([x, Y + 0.04, z, x, Y + hOf(z), z], k * 6); uv.set([s / 7, 0, s / 7, 1], k * 4); if (k) { const a = (k - 1) * 2, b = k * 2; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
      const gw = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: glassT, transparent: true, side: THREE.DoubleSide, depthWrite: false })); gw.renderOrder = 2; scene.add(gw);
      ribbon(LP, 0, 0.2, z => Y + hOf(z) + 0.01, strip(0xff8fe0, 1));
      for (let k = 0; k < LP.length - 1; k += 3) { const h = hOf(LP[k][1]); part(new THREE.BoxGeometry(0.1, h, 0.1), '#aebdf5', LP[k][0], Y + h / 2 + 0.03, LP[k][1]); } }

    /* ── 입구: 엘리베이터(왼쪽 뒤 호) + '지도로' 발판 ── */
    const EA = 38 * Math.PI / 180, EX = -SL - R0 * Math.cos(EA), EZ = -R0 * Math.sin(EA), EYAW = Math.atan2(Math.cos(EA), Math.sin(EA));
    { const eg = new THREE.Group(); eg.position.set(EX, Y, EZ); eg.rotation.y = EYAW; scene.add(eg);
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.4, 2.2), lamb(0x1b2154)); body.position.set(0, 2.2, -1.1); eg.add(body);
      const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.8, 4.4, 2.2), 20), new THREE.LineBasicMaterial({ color: 0xff8fe0, transparent: true, opacity: 0.9 })); ed.position.set(0, 2.2, -1.1); eg.add(ed);
      const inner = canvasTex(256, 352, (g, w, h) => { const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, '#6b4a2a'); lg.addColorStop(0.5, '#ffe7b0'); lg.addColorStop(1, '#6b4a2a'); g.fillStyle = lg; g.fillRect(0, 0, w, h); });
      const glowIn = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.3), basic(inner)); glowIn.position.set(0, 1.65, 0.02); eg.add(glowIn);
      const panelT = left => canvasTex(128, 352, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#8a96b8'); gr.addColorStop(0.5, '#bcc6e2'); gr.addColorStop(1, '#8a96b8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a5478'; g.lineWidth = 6; g.strokeRect(3, 6, w - 6, h - 12); g.fillStyle = '#e8eefc'; g.fillRect(left ? w - 14 : 6, 14, 8, h - 28); });
      const dl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.3), basic(panelT(true))), dr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.3), basic(panelT(false)));
      dl.position.set(-0.6, 1.65, 0.035); dr.position.set(0.6, 1.65, 0.035); eg.add(dl); eg.add(dr); A.doorL = dl; A.doorR = dr;
      const signT = canvasTex(512, 128, (g, w, h) => { futPath(g, 6, 6, w - 12, h - 12, 36); g.fillStyle = 'rgba(8,12,40,.92)'; g.fill(); g.lineWidth = 8; g.strokeStyle = ACC; g.stroke(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, (cfg.elevator || {}).sign || '▲ 엘리베이터', '900', 56, FONT_B, w - 60); g.fillText((cfg.elevator || {}).sign || '▲ 엘리베이터', w / 2, h / 2 + 3); });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.68), sheet(signT)); sg.position.set(0, 3.82, 0.04); eg.add(sg);
      const lampT = canvasTex(256, 128, g => { g.strokeStyle = '#ffe7b0'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; [88, 40].forEach(y0 => { g.beginPath(); g.moveTo(96, y0 + 20); g.lineTo(128, y0 - 12); g.lineTo(160, y0 + 20); g.stroke(); }); });
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), basic(lampT, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lamp.position.set(0, 3.38, 0.045); eg.add(lamp); A.lamp = lamp;
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.8), glow(0xffe7b0, 0.22)); spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.05, 1.1); eg.add(spill); }
    const PADX = EX + Math.cos(EA) * 2.0 + 0.2, PADZ = EZ + Math.sin(EA) * 2.0 + 0.1;
    const doorMat = flat(2.6, 1.3, sheet(canvasTex(512, 256, (g, w, h) => {
      futPath(g, 8, 8, w - 16, h - 16, 40); g.fillStyle = 'rgba(30,30,90,.82)'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#ffd36b'; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFont(g, T.exitSign || '지도로', 'normal', 92, FONT_D, w - 230); g.fillText(T.exitSign || '지도로', w / 2 + 34, h / 2 + 4);
      g.strokeStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    })), PADX, PADZ, 0.06);
    doorMat.renderOrder = 4;

    /* ── 바닥 화살표(① → ② → ③ → ④ → 메모판) ── */
    const arrowT = canvasTex(256, 128, g => { g.strokeStyle = '#FFFFFF'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; [56, 128].forEach(x0 => { g.beginPath(); g.moveTo(x0, 24); g.lineTo(x0 + 50, 64); g.lineTo(x0, 104); g.stroke(); }); });
    [-11.9, -5.8, 0, 5.8].forEach(x => { const m = flat(1.5, 0.75, basic(arrowT, { color: 0xff8fe0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), x, PZ, 0.08); m.renderOrder = 4; });

    /* ── 망원경 넷 + 위에 뜬 둥근 창 + 이름판 + 발판 ── */
    const SCL = 1.3, PIVY = 0.85, spots = [];
    FUT.X.forEach((sx, i) => {
      const S = SC[i] || {}, yaw = FUT.YAW[i] * Math.PI / 180, pitch = -Math.atan2(PIVY * SCL + 16, 90);
      const g = new THREE.Group(); g.position.set(sx, Y, TZ); g.scale.setScalar(SCL); scene.add(g);
      const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
      add(g, new THREE.CylinderGeometry(1.0, 1.15, 0.16, 36), lamb(0x252c68), 0, 0.08, 0);
      add(g, new THREE.CylinderGeometry(0.26, 0.4, 0.8, 24), lamb(0xe3e9fa), 0, 0.55, 0);
      add(g, new THREE.TorusGeometry(0.33, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff8fe0 }), 0, 0.36, 0).rotation.x = Math.PI / 2;
      add(g, new THREE.BoxGeometry(0.62, 0.24, 0.5), lamb(0x2a3170), 0, PIVY - 0.12, 0);
      const head = new THREE.Group(); head.position.set(0, PIVY, 0); head.rotation.order = 'YXZ'; head.rotation.y = yaw; head.rotation.x = pitch; g.add(head);
      add(head, new THREE.CylinderGeometry(0.3, 0.3, 2.6, 24), lamb(0xf1f4ff), 0, 0, -0.4).rotation.x = Math.PI / 2;
      add(head, new THREE.CylinderGeometry(0.44, 0.36, 0.7, 24), lamb(0xdde3f7), 0, 0, -1.85).rotation.x = Math.PI / 2;
      add(head, new THREE.CircleGeometry(0.38, 24), new THREE.MeshBasicMaterial({ color: 0xbff0ff }), 0, 0, -2.21).rotation.y = Math.PI;
      [[-0.3, 0.33], [-1.5, 0.39]].forEach(([z, r]) => add(head, new THREE.TorusGeometry(r, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff8fe0 }), 0, 0, z));
      add(head, new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16), lamb(0x2b2f5a), 0, 0, 1.15).rotation.x = Math.PI / 2;
      add(head, new THREE.CylinderGeometry(0.23, 0.15, 0.22, 16), lamb(0x10122e), 0, 0, 1.5).rotation.x = Math.PI / 2;
      add(head, new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8fe0 }), 0.34, 0, 0.45);
      coll.push({ x: sx, z: TZ, r: 1.0 });
      const fd = new THREE.Mesh(new THREE.CircleGeometry(1.8, 40), glow(0xff8fe0, 0.16)); fd.rotation.x = -Math.PI / 2; fd.position.set(sx, Y + 0.05, TZ); scene.add(fd);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.2, 2.4, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8fe0, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.position.set(sx, Y + 3.2, TZ); scene.add(cone); A.cones.push(cone);
      const win = new THREE.Sprite(new THREE.SpriteMaterial({ map: futWinTex(i, false), transparent: true, depthTest: false, depthWrite: false, fog: false })); win.scale.set(3.4, 3.4, 1); win.position.set(sx, Y + 4.5, TZ); win.renderOrder = 8; scene.add(win); A.wins.push(win);
      const sg = signSprite((S.n || '') + ' ' + (S.title || ''), '', { scene, bg: ACC, fg: '#1E2B4A', w: 4.2 }); sg.userData.anchor = [sx, Y + 6.15, TZ]; sg.renderOrder = 9; signs.push(sg);
      const px = sx + Math.sin(yaw) * 0.9; A.padXY.push([px, PZ]);
      const pm = flat(2.5, 2.5, sheet(futPadTex(String(i + 1), S.pad || '', ACC, false)), px, PZ, 0.07); A.padMesh.push(pm);
      spots.push({ id: 'scope' + i, name: (S.n || '') + ' ' + (S.title || ''), sub: S.sub || '', btn: ST.look || '들여다보기', x: px, z: PZ, r: 1.2, pad: pm, go: () => futOpenScope(A, i) });
    });
    A.mark = i => {
      const pm = A.padMesh[i], wn = A.wins[i], S = SC[i] || {};
      const op = pm.material.map; pm.material.map = futPadTex(String(i + 1), S.pad || '', ACC, true); op.dispose(); pm.material.needsUpdate = true;
      const ow = wn.material.map; wn.material.map = futWinTex(i, true); ow.dispose(); wn.material.needsUpdate = true;
    };

    /* ── 끝: 메모판 '내가 바라는 미래 교실' ── */
    { const BG = new THREE.Group(); BG.position.set(14.2, Y, 0.5); BG.rotation.y = -0.35; scene.add(BG);
      [-2.2, 2.2].forEach(x => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 12), lamb(0x2a3170)); m.position.set(x, 0.5, 0); BG.add(m); });
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.14, 0.7), lamb(0x2a3170)); b1.position.set(0, 0.07, 0); BG.add(b1);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.2, 0.16), lamb(0x1a1f55)); fr.position.set(0, 2.85, 0); BG.add(fr);
      const fe = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.6, 4.2, 0.16)), new THREE.LineBasicMaterial({ color: 0xff8fe0 })); fe.position.set(0, 2.85, 0); BG.add(fe);
      let mine = ''; try { mine = String(localStorage.getItem(FUT.KEY) || '').slice(0, 30); } catch (_) { /* 저장소를 못 쓰면 빈 쪽지 */ }
      A.memo = mine;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.0), basic(futBoardTex(MEMO, mine))); face.position.set(0, 2.85, 0.09); BG.add(face); A.board = face;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 5.4), glow(0xff8fe0, 0.14)); gl.position.set(0, 2.85, -0.12); BG.add(gl);
      coll.push({ x: 13.2, z: 0.9, r: 0.8 }, { x: 15.2, z: 0.3, r: 0.8 });
      const sg = signSprite(MEMO.sign || '끝 · 메모판', '', { scene, bg: ACC, fg: '#1E2B4A', w: 4.2 }); sg.userData.anchor = [14.4, Y + 5.6, 0.5]; signs.push(sg); }
    const memoPad = flat(2.5, 2.5, sheet(futPadTex(MEMO.pad || '메모판', MEMO.padSub || '', '#ffd36b', false)), FUT.MEMO.x, FUT.MEMO.z, 0.07);
    spots.push({ id: 'memo', name: MEMO.title || '', sub: MEMO.padSub || '', btn: MEMO.btn || '쓰기', x: FUT.MEMO.x, z: FUT.MEMO.z, r: 1.3, pad: memoPad, go: () => futOpenMemo(A) });

    /* ── 앞쪽 꾸밈: 긴 의자·화분 ── */
    [-7, 7].forEach(x => { part(new THREE.BoxGeometry(2.4, 0.14, 0.7), '#8a6a4a', x, Y + 0.5, 3.1); part(new THREE.BoxGeometry(2.4, 0.5, 0.08), '#8a6a4a', x, Y + 0.85, 3.46); [-1, 1].forEach(s => part(new THREE.BoxGeometry(0.1, 0.46, 0.6), '#2a3170', x + s * 1.05, Y + 0.25, 3.1)); coll.push({ x, z: 3.1, r: 1.2 }); });
    [[-9.8, 3.4], [13.3, 3.0]].forEach(([x, z]) => { part(new THREE.CylinderGeometry(0.5, 0.38, 0.7, 16), '#c2410c', x, Y + 0.35, z); part(new THREE.SphereGeometry(0.85, 16, 12), '#4d9b4f', x, Y + 1.25, z); part(new THREE.SphereGeometry(0.55, 14, 10), '#5fb862', x + 0.35, Y + 1.85, z - 0.1); coll.push({ x, z, r: 0.9 }); });
    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));

    /* ── 리니(입구 근처 안내 로봇) ── */
    const RX = -14.4, RZ = 1.7;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x4a4a66 })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow('#7DFFD1', 1)); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF', w: 3.6 }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }
    { const cs = signSprite((cfg.city || {}).title || '', (cfg.city || {}).sub || '', { scene, bg: '#6FE9FF', fg: '#1E2B4A', w: 4.4 }); cs.userData.anchor = [0, Y + 2.2, TZ + 0.6]; cs.renderOrder = 9; signs.push(cs); }

    /* ── 발판·눌러 걷기 상자 ── */
    spots.unshift({ id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: -12.5, z: 1.9, r: 1.25, pad: flat(2.2, 2.2, sheet(futPadTex('리니', '말 걸기', '#7dffd1', false)), -12.5, 1.9, 0.07), go: () => talk() });
    spots.unshift({ id: 'door', name: T.exitName || '지도로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: PADX, z: PADZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } });
    for (const sp of spots) {
      const hb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.85, pitch: 0.98,
      walk: (x, z) => { const dx = x - clamp(x, -SL, SL); return dx * dx + z * z < (R0 - 1.5) * (R0 - 1.5); },
      camD: () => clamp(26 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= 2 * SL + 2 * R0 + 3 ? 0 : clamp(me.x, -(SL + R0 + 1) + hw - 0.6, SL + R0 + 1 - hw + 0.6),
        hd * 2 >= 2 * R0 + 6 ? -3.0 + Math.max(0, me.z - 2.0) * 0.9 : clamp(me.z, -R0 + hd - 2.5, R0 - hd + 2.5)
      ],
      /* 들어올 때마다 로비가 spawn.x를 읽는다 - 그때를 '막 올라왔다' 신호로 쓴다(엘리베이터 연출을 처음부터) */
      spawn: { get x() { A.entered = true; return -11.0; }, z: 0.3, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'future', anim: A };
    return R.built;
  }
  function updateFuture(dt, me) {
    const A = R.built.anim; A.t += dt;
    /* 막 들어왔으면 엘리베이터 오르는 연출을 처음부터 */
    if (A.entered) { A.entered = false; A.ride = { t: 0, done: false }; A.doorK = 0; }
    const ST = A.cfg.steps || {};
    if (A.ride) {
      A.ride.t += dt;
      const k = clamp(A.ride.t / 2.6, 0, 1), e = k * k * (3 - 2 * k);
      A.city.position.y = FUT.RISE * (1 - e);
      A.doorK = clamp((A.ride.t - 2.5) / 0.8, 0, 1);
      if (!A.ride.done && A.ride.t > 2.6) { A.ride.done = true; if (!R.open) showToast(ST.arrive || '전망대에 도착했어요', 4.5); }
      if (A.ride.t > 3.6) A.ride = null;
    } else { A.city.position.y = 0; A.doorK = 1; }
    A.doorL.position.x = -0.6 - 1.0 * A.doorK; A.doorR.position.x = 0.6 + 1.0 * A.doorK;
    { const T0 = A.trunk, h = Math.max(0.5, T0.top - (T0.gy + A.city.position.y)); T0.m.scale.y = h / (T0.top - T0.gy); T0.m.position.y = T0.top - h / 2; }
    A.lamp.material.opacity = A.ride && !A.ride.done ? (Math.sin(A.t * 9) > 0 ? 1 : 0.2) : 0.85;
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    A.wins.forEach((w, i) => { w.position.y = Y + 4.5 + Math.sin(A.t * 1.3 + i * 1.1) * 0.09; });
    A.cones.forEach((c, i) => { c.material.opacity = 0.12 + 0.05 * Math.sin(A.t * 1.6 + i); });
    const D = A.drones;
    if (D) {
      const p = D.pts.geometry.attributes.position, arr = p.array;
      for (let i = 0; i < D.ax.length; i++) {
        const o = i * 3 + D.ax[i]; arr[o] += D.sp[i] * dt;
        if (D.ax[i] === 2) { if (arr[o] > 8) arr[o] = -84; else if (arr[o] < -84) arr[o] = 8; } else if (arr[o] > 63) arr[o] = -63; else if (arr[o] < -63) arr[o] = 63;
      }
      p.needsUpdate = true;
    }
    /* 팝업을 닫은 뒤에 알림·도장 */
    if (!R.open) {
      if (A.stampDue) { A.stampDue = false; A.notice = null; stamp(A.cfg.stampId); }
      else if (A.notice) { showToast(A.notice, 4.5); A.notice = null; }
    }
  }

  /* ── 팝업(망원경 안 · 메모) ── */
  const FUT_CSS = [
    '.futbox{display:none;box-sizing:border-box;padding:18px 18px 18px;border:2px solid #ff8fe0;border-radius:22px;background:radial-gradient(120% 80% at 50% 0,#2e2480 0,#16194f 55%,#0b1035 100%);color:#e8f6ff;text-align:center;box-shadow:0 0 30px rgba(255,143,224,.35)}',
    '#pop[data-kind="fut"] #futScope,#pop[data-kind="futm"] #futMemo{display:block}',
    '.futhd{display:flex;align-items:center;justify-content:flex-start;gap:8px;flex-wrap:wrap;padding-right:78px;min-height:34px;text-align:left}',
    '.futstep{font:700 12.5px/1 var(--font-body);color:#ffe3f7;background:rgba(255,143,224,.18);border:1px solid rgba(255,143,224,.6);border-radius:999px;padding:6px 11px;white-space:nowrap}',
    '.futtag{font:700 11px/1.2 var(--font-body);color:#ffd36b;border:1px solid currentColor;border-radius:999px;padding:3px 8px}',
    '.futlens{position:relative;width:min(290px,62vw);aspect-ratio:1;margin:10px auto 14px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 6px #ff8fe0,0 0 36px 10px rgba(255,143,224,.5);animation:futZoom .6s cubic-bezier(.2,.8,.2,1) both}',
    '.futlens canvas{display:block;width:100%;height:100%}',
    '.futlens::after{content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;background:radial-gradient(circle,transparent 60%,rgba(0,0,22,.55) 100%),linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/1px 100% no-repeat,linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/100% 1px no-repeat}',
    '@keyframes futZoom{from{transform:scale(.2);filter:blur(10px);opacity:.1}to{transform:scale(1);filter:blur(0);opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.futlens{animation:none}}',
    '.futbox h2{margin:0;font-family:var(--font-display);font-weight:400;font-size:26px;line-height:1.25;color:#fff}',
    '.futsub{margin-top:4px;font-size:14px;font-weight:700;color:#bff0ff}',
    '.futbody{margin:12px 0 4px;font-size:14.5px;line-height:1.7;color:#dfe9ff;text-wrap:balance}',
    '.futdots{display:flex;justify-content:center;gap:9px;margin:12px 0 2px}',
    '.futdots i{width:12px;height:12px;border-radius:50%;border:2px solid #ff8fe0;box-sizing:border-box}',
    '.futdots i.on{background:#7dffd1;border-color:#7dffd1}',
    '.futdots i.cur{box-shadow:0 0 0 3px rgba(255,143,224,.5)}',
    '.futrow{display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap}',
    '.futfoot{margin:10px 0 0;font-size:11.5px;line-height:1.5;color:rgba(223,233,255,.72)}',
    '.futnote{margin:24px auto 6px;width:min(260px,80%);min-height:84px;box-sizing:border-box;padding:12px 14px;display:grid;place-items:center;background:#ffe0f4;color:#2b2547;border:3px solid #ff8fe0;border-radius:6px;font:900 21px/1.4 var(--font-body);transform:rotate(-2deg);box-shadow:0 6px 14px rgba(0,0,0,.35);overflow-wrap:anywhere}',
    '.futnote.empty{color:#8a7aa8;font-weight:700;font-size:16px}',
    '#futMIn{width:100%;box-sizing:border-box;margin:14px 0 2px;border:2px solid #ff8fe0;border-radius:14px;padding:12px 14px;font:700 17px/1.2 var(--font-body);color:#1E2B4A;background:#fff;text-align:center;outline:none}',
    '#futMIn:focus{border-color:#7dffd1;box-shadow:0 0 0 3px rgba(125,255,209,.35)}',
    '.futbox .pill{box-shadow:none}'
  ].join('\n');
  function futEnsureUI() {
    const box = document.querySelector('#pop .pbox');
    if (!box || document.getElementById('futScope')) return;
    const st = document.createElement('style'); st.id = 'futStyle'; st.textContent = FUT_CSS; document.head.appendChild(st);
    const wrap = document.createElement('div');
    wrap.innerHTML = '<div id="futScope" class="futbox"><div class="futhd"><span class="futstep" id="futStep"></span><span class="futtag" id="futTag"></span></div>' +
      '<div class="futlens" id="futLens"><canvas id="futCv" width="512" height="512"></canvas></div>' +
      '<h2 id="futTitle"></h2><div class="futsub" id="futSub"></div><p class="futbody" id="futBody"></p>' +
      '<div class="futdots" id="futDots"><i></i><i></i><i></i><i></i></div>' +
      '<div class="futrow"><button type="button" id="futNext" class="pill primary"></button></div><p class="futfoot" id="futFoot"></p></div>' +
      '<div id="futMemo" class="futbox"><div class="futhd"><span class="futstep" id="futMStep"></span><span class="futtag" id="futMTag"></span></div>' +
      '<h2 id="futMTitle"></h2><div class="futsub" id="futMSub"></div><div class="futnote" id="futMNote"></div>' +
      '<input id="futMIn" type="text" maxlength="30" autocomplete="off" enterkeyhint="done">' +
      '<div class="futrow"><button type="button" id="futMSave" class="pill primary"></button><button type="button" id="futMClear" class="pill"></button></div><p class="futfoot" id="futMFoot"></p></div>';
    while (wrap.firstChild) box.appendChild(wrap.firstChild);
    const inp = document.getElementById('futMIn');
    /* 글을 쓰는 동안 W A S D 같은 키가 캐릭터를 움직이지 않게 키 이벤트를 여기서 멈춘다 */
    ['keydown', 'keyup', 'keypress'].forEach(ev => inp.addEventListener(ev, e => {
      e.stopPropagation();
      if (ev === 'keydown' && e.key === 'Enter') { e.preventDefault(); futSave(R.built.anim); }
      if (ev === 'keydown' && e.key === 'Escape') closePop();
    }));
    inp.addEventListener('input', () => { const A = R.built && R.built.anim; if (A) futNotePreview(A, inp.value); });
    document.getElementById('futMSave').addEventListener('click', () => futSave(R.built.anim));
    document.getElementById('futMClear').addEventListener('click', () => futClear(R.built.anim));
  }
  function futNotePreview(A, v) {
    const M = A.cfg.memo || {}, el = document.getElementById('futMNote'), t = String(v || '').trim();
    el.textContent = t || (M.empty || '여기에 붙어요'); el.className = 'futnote' + (t ? '' : ' empty');
  }
  function futCheck(A) {
    const need = (A.cfg.scopes || []).length || 4;
    if (A.stamped || !A.cfg.stampId) return;
    try { if (JSON.parse(localStorage.getItem('xrStamps') || '{}')[A.cfg.stampId]) { A.stamped = true; return; } } catch (_) { /* 도장 기록을 못 읽어도 진행 */ }
    if (A.seen.size >= need && A.memo) { A.stamped = true; A.stampDue = true; }
  }
  function futGo(x, z) { if (R.me) R.me.target = { x, z, stuck: 0 }; hideCard(); R.cur = null; }
  function futOpenScope(A, i) {
    futEnsureUI();
    const SCS = A.cfg.scopes || [], S = SCS[i] || {}, ST = A.cfg.steps || {}, n = SCS.length || 4, set = (id, t) => { document.getElementById(id).textContent = t || ''; };
    set('futStep', (ST.stepWord || '망원경') + ' ' + (i + 1) + ' / ' + n); set('futTag', ST.tag); set('futTitle', S.n + ' ' + S.title); set('futSub', S.sub); set('futBody', S.body); set('futFoot', ST.foot);
    A.seen.add(i); A.mark(i);
    [...document.getElementById('futDots').children].forEach((d, k) => { d.className = (A.seen.has(k) ? 'on ' : '') + (k === i ? 'cur' : ''); });
    const nx = document.getElementById('futNext'), last = i >= n - 1;
    nx.textContent = (last ? (ST.toMemo || '메모판으로') : (ST.next || '다음 망원경')) + ' ▶';
    nx.onclick = () => { closePop(); if (last) futGo(FUT.MEMO.x, FUT.MEMO.z); else futGo(A.padXY[i + 1][0], A.padXY[i + 1][1]); };
    openPop('fut');
    const lens = document.getElementById('futLens'); lens.style.animation = 'none'; void lens.offsetWidth; lens.style.animation = '';
    futLens(i);
    if (A.seen.size >= n && !A.allNotice) { A.allNotice = true; A.notice = ST.allSeen || ''; }
    futCheck(A);
  }
  /* 둥근 창 안 그림이 숨 쉬듯 살짝 움직이고 반짝인다 */
  function futLens(i) {
    const cv = document.getElementById('futCv'), g = cv.getContext('2d'), base = futArtCanvas(i), my = ++FUTS.loop, t0 = performance.now();
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spk = [[110, 120, 13], [410, 150, 15], [90, 380, 11], [420, 400, 12], [256, 70, 10], [330, 330, 9]];
    const frame = now => {
      const pop = document.getElementById('pop');
      if (my !== FUTS.loop || pop.hidden || pop.dataset.kind !== 'fut') return;
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, 512, 512);
      g.save(); g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.clip();
      const k = 1.06 + 0.03 * Math.sin(t * 0.9);
      g.translate(256 + Math.sin(t * 0.6) * 6, 256 + Math.cos(t * 0.5) * 5); g.scale(k, k); g.translate(-256, -256);
      g.drawImage(base, 0, 0);
      g.restore();
      spk.forEach(([x, y, r], s) => { g.globalAlpha = 0.25 + 0.65 * (Math.sin(t * 2.2 + s * 1.7) + 1) / 2; fSpark(g, x, y, r, '#ffffff'); });
      g.globalAlpha = 1;
      const sx = ((t * 0.35) % 1.6 - 0.3) * 640 - 60;
      const gr = g.createLinearGradient(sx - 40, 0, sx + 40, 512); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      if (!calm) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  function futOpenMemo(A) {
    futEnsureUI();
    const M = A.cfg.memo || {}, set = (id, t) => { document.getElementById(id).textContent = t || ''; };
    set('futMStep', M.step); set('futMTag', (A.cfg.steps || {}).tag); set('futMTitle', M.title); set('futMSub', M.ask); set('futMFoot', M.note);
    set('futMSave', M.save || '붙이기'); set('futMClear', M.clear || '지우기');
    const inp = document.getElementById('futMIn'); inp.value = A.memo || ''; inp.placeholder = M.placeholder || ''; inp.setAttribute('aria-label', M.title || '');
    futNotePreview(A, A.memo);
    openPop('futm');
    if (!IS_TOUCH) inp.focus();
  }
  function futRedrawBoard(A) {
    const old = A.board.material.map; A.board.material.map = futBoardTex(A.cfg.memo || {}, A.memo); if (old) old.dispose(); A.board.material.needsUpdate = true;
  }
  function futSave(A) {
    const M = A.cfg.memo || {}, v = document.getElementById('futMIn').value.replace(/\s+/g, ' ').trim().slice(0, 30);
    if (!v) { document.getElementById('futMFoot').textContent = M.needText || '한 줄을 써 주세요'; return; }
    A.memo = v;
    try { localStorage.setItem(FUT.KEY, v); } catch (_) { /* 저장을 못 해도 이번에는 판에 붙는다 */ }
    futRedrawBoard(A);
    A.notice = M.saved || '메모판에 붙였어요';
    futCheck(A);
    closePop();
  }
  function futClear(A) {
    A.memo = '';
    try { localStorage.removeItem(FUT.KEY); } catch (_) { /* 지울 게 없어도 진행 */ }
    futRedrawBoard(A);
    document.getElementById('futMIn').value = ''; futNotePreview(A, '');
  }
  HALLS.future = [buildFuture, updateFuture];
  /* ==== hall:future 끝 ==== */
  /* ==== hall:devices 시작 ==== */
  /* ── 장비관(가상융합교육 지도) — 써 보는 쇼룸 ──
     그림 시안 ..\시안\mockup-hall-devices.html을 엔진 꼴로 옮겼다. 입구(서쪽)에서 동쪽으로:
     ① 전시대 5개(발판에 서면 장비가 ② 회전 무대로 날아와 크게 돈다) → 카드 3장(무엇 · 수업에서 어떻게 · 주의할 점)
     → ③ 잠깐 체험(헤드셋: 렌즈 시점으로 360 교실 견학) → 끝: 우리 반엔 어떤 장비? 상황 고르기 3문제 → 연수 수첩 도장.
     글은 lobby.config.js rooms.devices(모두 [확인 전]). 장비 이름은 일반 이름만 쓴다(제품명·숫자 없음). */

  /* 둥근 모서리 상자(앞면이 +z) */
  function devRBox(w, h, d, r, bev) {
    const b = bev == null ? Math.min(r * 0.4, d * 0.3) : bev;
    const ww = w - 2 * b, hh = h - 2 * b, rad = Math.max(Math.min(r - b, ww / 2 - 0.001, hh / 2 - 0.001), 0.001);
    const x = -ww / 2, y = -hh / 2, s = new THREE.Shape();
    s.moveTo(x + rad, y); s.lineTo(x + ww - rad, y); s.quadraticCurveTo(x + ww, y, x + ww, y + rad);
    s.lineTo(x + ww, y + hh - rad); s.quadraticCurveTo(x + ww, y + hh, x + ww - rad, y + hh);
    s.lineTo(x + rad, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - rad);
    s.lineTo(x, y + rad); s.quadraticCurveTo(x, y, x + rad, y);
    const dep = Math.max(d - 2 * b, 0.002);
    const geo = new THREE.ExtrudeGeometry(s, { depth: dep, bevelEnabled: b > 0.0005, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 });
    geo.translate(0, 0, -dep / 2);
    return geo;
  }

  /* 장비 모양 다섯 가지(단순한 도형). 반환: 묶음 g(앞이 +z, 원점 = 아랫부분 가운데) */
  const DEV_LOOK = {
    headset: { s: 1.05, y: 1.55, rx: -0.6, ry: 0.45, big: 2.5, cy: 0, srx: -0.45 },
    glasses: { s: 1.2, y: 1.58, rx: -0.4, ry: 0.5, big: 1.9, cy: 0, srx: -0.3 },
    cam360: { s: 0.95, y: 1.76, rx: 0, ry: 0, big: 1.9, cy: -0.1, srx: 0 },
    tablet: { s: 1.2, y: 0.94, rx: 0, ry: 0.3, big: 2.0, cy: 0.38, srx: -0.15 },
    glove: { s: 1.1, y: 1.44, rx: -0.35, ry: -0.15, big: 2.2, cy: 0.1, srx: -0.25 }
  };
  function devModel(id) {
    const L = [], B = [], X = [], g = new THREE.Group();
    const WHT = '#f6f8fd', NVY = '#151b36', CY = '#6fe9ff', CYD = '#16b4da';
    const add = (list, geo, color, x, y, z, rx, ry, rz) => {
      if (rx) geo.rotateX(rx);
      if (ry) geo.rotateY(ry);
      if (rz) geo.rotateZ(rz);
      list.push(colored(geo.translate(x || 0, y || 0, z || 0), color));
    };
    if (id === 'headset') {
      add(L, devRBox(1.12, 0.6, 0.5, 0.2), WHT, 0, 0, -0.02);
      add(L, devRBox(1.02, 0.47, 0.1, 0.16, 0.03), NVY, 0, 0, 0.27);
      add(B, new THREE.BoxGeometry(0.72, 0.03, 0.02), CY, 0, -0.16, 0.335);
      [-0.27, 0.27].forEach(x => {
        add(L, new THREE.CylinderGeometry(0.13, 0.13, 0.03, 24), '#34448c', x, 0.03, 0.33, Math.PI / 2);
        add(B, new THREE.TorusGeometry(0.13, 0.016, 6, 28), CY, x, 0.03, 0.348);
      });
      [-0.46, 0.46].forEach(x => add(B, new THREE.SphereGeometry(0.028, 8, 6), '#9aa6d8', x, 0.14, 0.335));
      add(L, devRBox(0.92, 0.44, 0.14, 0.12, 0.03), '#2b3150', 0, 0, -0.34);
      add(L, new THREE.TorusGeometry(0.6, 0.05, 8, 48), WHT, 0, 0.02, -0.52, Math.PI / 2);
      add(L, new THREE.TorusGeometry(0.5, 0.04, 8, 32, Math.PI), WHT, 0, 0.04, -0.56, 0, Math.PI / 2);
    } else if (id === 'glasses') {
      [-1, 1].forEach(s => {
        add(L, devRBox(0.6, 0.42, 0.08, 0.14, 0.02), WHT, s * 0.33, 0, 0);
        add(L, devRBox(0.5, 0.32, 0.02, 0.11, 0.01), '#1c2a5a', s * 0.33, 0, 0.045);
        add(X, devRBox(0.44, 0.26, 0.02, 0.09, 0.01), '#7fe6ff', s * 0.33, 0, 0.06);
        add(L, new THREE.BoxGeometry(0.05, 0.05, 0.9), WHT, s * 0.63, 0.08, -0.45);
        add(L, new THREE.BoxGeometry(0.05, 0.2, 0.05), WHT, s * 0.63, -0.03, -0.9);
      });
      add(L, new THREE.BoxGeometry(0.18, 0.06, 0.06), WHT, 0, 0.09, 0);
      add(B, new THREE.SphereGeometry(0.04, 8, 6), CY, 0.64, 0.13, 0.06);
    } else if (id === 'cam360') {
      add(L, new THREE.CylinderGeometry(0.06, 0.08, 0.75, 12), WHT, 0, -0.5, 0);
      add(L, new THREE.CapsuleGeometry(0.25, 0.42, 6, 18), WHT, 0, 0.22, 0);
      [1, -1].forEach(s => {
        const lens = new THREE.SphereGeometry(0.22, 20, 14); lens.scale(1, 1, 0.6);
        add(L, lens, '#10162f', 0, 0.34, s * 0.2);
        add(B, new THREE.TorusGeometry(0.225, 0.025, 8, 32), CY, 0, 0.34, s * 0.27);
        add(L, new THREE.SphereGeometry(0.05, 10, 8), '#34448c', -0.06, 0.38, s * 0.31);
      });
      add(B, new THREE.SphereGeometry(0.035, 8, 6), '#ff6f6f', 0.14, -0.04, 0.205);
      add(B, new THREE.TorusGeometry(0.56, 0.016, 6, 64), CY, 0, 0.3, 0, Math.PI / 2);
      add(B, new THREE.TorusGeometry(0.7, 0.012, 6, 64), '#3d9fb8', 0, 0.3, 0, Math.PI / 2);
    } else if (id === 'tablet') {
      add(L, new THREE.BoxGeometry(0.8, 0.06, 0.55), '#eaf0fb', 0, 0.03, 0);
      add(L, new THREE.BoxGeometry(0.9, 0.05, 0.1), '#dde6f5', 0, 0.085, 0.2);
      add(L, devRBox(1.0, 0.7, 0.06, 0.07, 0.02), WHT, 0, 0.45, 0, -0.75);
      const tabTex = canvasTex(512, 352, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0f1b4d'); gr.addColorStop(1, '#14397a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        const cx = w * 0.5, cy = h * 0.44, rg = c.createRadialGradient(cx - 18, cy - 18, 6, cx, cy, 86); rg.addColorStop(0, '#b4f0ff'); rg.addColorStop(1, '#2aa0d8');
        c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, 80, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 6; c.beginPath(); c.ellipse(cx, cy, 132, 26, -0.3, 0, Math.PI * 2); c.stroke();
        ['#6fe9ff', '#7dffd1', '#ffd36b', '#ff9fe4'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(105 + i * 100, 296, 28, 0, Math.PI * 2); c.fill(); });
      });
      const pg = new THREE.PlaneGeometry(0.9, 0.62); pg.translate(0, 0, 0.036); pg.rotateX(-0.75); pg.translate(0, 0.45, 0);
      g.add(new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: tabTex })));
    } else {
      add(L, devRBox(0.5, 0.5, 0.17, 0.1, 0.03), '#e9eef9', 0, 0, 0);
      [[-0.18, 0.27], [-0.06, 0.33], [0.06, 0.3], [0.18, 0.23]].forEach(([x, len]) => {
        add(L, new THREE.CapsuleGeometry(0.055, len, 4, 10), '#e9eef9', x, 0.24 + (len + 0.11) / 2, 0);
        add(B, new THREE.SphereGeometry(0.064, 10, 8), CYD, x, 0.24 + len + 0.11, 0);
      });
      add(L, new THREE.CapsuleGeometry(0.06, 0.2, 4, 10), '#e9eef9', 0.33, 0.1, 0.02, 0, 0, -0.85);
      add(B, new THREE.SphereGeometry(0.068, 10, 8), CYD, 0.43, 0.24, 0.02);
      add(L, new THREE.CylinderGeometry(0.21, 0.23, 0.2, 20), '#1d2a58', 0, -0.36, 0);
      add(B, new THREE.TorusGeometry(0.225, 0.02, 8, 32), CY, 0, -0.3, 0, Math.PI / 2);
      [-0.1, 0, 0.1].forEach(x => add(B, new THREE.BoxGeometry(0.03, 0.26, 0.02), CYD, x, 0, 0.095));
      add(B, new THREE.TorusGeometry(0.52, 0.013, 6, 48), '#58c8e2', 0, 0.22, 0.02);
      add(B, new THREE.TorusGeometry(0.7, 0.013, 6, 48), '#3c9bb8', 0, 0.22, 0.02);
    }
    if (L.length) g.add(new THREE.Mesh(merge(L), new THREE.MeshLambertMaterial({ vertexColors: true })));
    if (B.length) g.add(new THREE.Mesh(merge(B), new THREE.MeshBasicMaterial({ vertexColors: true })));
    if (X.length) g.add(new THREE.Mesh(merge(X), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false })));
    return g;
  }

  /* 렌즈 시점 둥근 테두리(눈금·격자·'360°'). w = 그림 한 변(픽셀) */
  function devBezel(g, w) {
    const k = w / 1024, c = w / 2, R = 440 * k;
    g.save(); g.beginPath(); g.arc(c, c, R - 4 * k, 0, Math.PI * 2); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.34)'; g.lineWidth = 3 * k;
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.ellipse(c, c, i / 3.5 * R, R, 0, 0, Math.PI * 2); g.stroke(); }
    [-0.62, -0.31, 0, 0.31, 0.62].forEach(q => { const yy = c + q * R, hw = Math.sqrt(R * R - q * R * q * R); g.beginPath(); g.moveTo(c - hw, yy); g.quadraticCurveTo(c, yy + q * R * 0.35, c + hw, yy); g.stroke(); });
    g.restore();
    g.lineWidth = 26 * k; g.strokeStyle = '#18bde6'; g.shadowColor = '#6fe9ff'; g.shadowBlur = 44 * k; g.beginPath(); g.arc(c, c, R + 10 * k, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
    g.lineWidth = 7 * k; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(c, c, R - 6 * k, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, r0 = R + 34 * k, r1 = R + (i % 6 === 0 ? 68 : 52) * k;
      g.strokeStyle = i % 6 === 0 ? '#0f5f86' : 'rgba(22,150,200,0.85)'; g.lineWidth = (i % 6 === 0 ? 8 : 4) * k;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.95)';
    [1, -1].forEach(sx => { const x0 = c + sx * (R - 52 * k); g.beginPath(); g.moveTo(x0, c); g.lineTo(x0 - sx * 34 * k, c - 30 * k); g.lineTo(x0 - sx * 34 * k, c + 30 * k); g.closePath(); g.fill(); });
    const pw = 260 * k, ph = 96 * k, px = c - pw / 2, py = c + R - 150 * k;
    g.beginPath(); g.moveTo(px + ph / 2, py); g.arcTo(px + pw, py, px + pw, py + ph, ph / 2); g.arcTo(px + pw, py + ph, px, py + ph, ph / 2); g.arcTo(px, py + ph, px, py, ph / 2); g.arcTo(px, py, px + pw, py, ph / 2); g.closePath();
    g.fillStyle = 'rgba(8,12,40,0.9)'; g.fill(); g.lineWidth = 8 * k; g.strokeStyle = '#6fe9ff'; g.stroke();
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.round(64 * k)}px ${FONT_B}`; g.fillText('360°', c, py + ph / 2 + 2 * k);
  }

  /* 렌즈 속 360 교실(작은 교실 하나). 장면 그림 한 장 찍기와 팝업의 둘러보기가 같이 쓴다 */
  function devLensScene() {
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0xdbe8f6);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xd8c9a8, 1.15));
    const RW_ = 12, RD_ = 10, RH_ = 3.4, CZ = -1, Pl = [], Bl = [];
    const bx = (list, w, h, d, c, x, y, z) => list.push(colored(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c));
    const qd = (c, w, h, rx, ry, x, y, z) => Pl.push(colored(new THREE.PlaneGeometry(w, h).rotateX(rx).rotateY(ry).translate(x, y, z), c));
    qd('#fdfdfb', RW_, RD_, Math.PI / 2, 0, 0, RH_, CZ);
    qd('#f8efd9', RW_, RH_, 0, 0, 0, RH_ / 2, CZ - RD_ / 2);
    qd('#f8efd9', RW_, RH_, 0, Math.PI, 0, RH_ / 2, CZ + RD_ / 2);
    qd('#f8efd9', RD_, RH_, 0, -Math.PI / 2, RW_ / 2, RH_ / 2, CZ);
    qd('#f8efd9', RD_, RH_, 0, Math.PI / 2, -RW_ / 2, RH_ / 2, CZ);
    bx(Pl, RW_, 0.35, 0.04, '#b99668', 0, 0.175, CZ - RD_ / 2 + 0.02);
    bx(Pl, 5.0, 1.75, 0.08, '#8a5f3a', 0, 1.95, CZ - RD_ / 2 + 0.05);
    [-3.2, -0.2, 2.8].forEach(z => bx(Pl, 0.06, 1.5, 1.9, '#ffffff', RW_ / 2 - 0.04, 1.95, z));
    bx(Pl, 0.06, 1.3, 2.6, '#c99a63', -RW_ / 2 + 0.03, 1.9, -2.6);
    ['#fef08a', '#bae6fd', '#fecaca', '#bbf7d0'].forEach((c, i) => bx(Pl, 0.04, 0.42, 0.5, c, -RW_ / 2 + 0.07, 1.75 + (i % 2) * 0.5, -3.4 + i * 0.6));
    bx(Pl, 0.06, 2.3, 1.2, '#9a6b42', -RW_ / 2 + 0.03, 1.15, 1.2);
    [-3, 0, 3].forEach(x => [-3.2, 0].forEach(z => bx(Bl, 1.6, 0.04, 0.5, '#ffffff', x, RH_ - 0.03, z)));
    const CH = ['#7dd3fc', '#fda4af', '#fde68a', '#a7f3d0', '#c4b5fd'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = -3.6 + c * 2.4, z = -1.0 - r * 1.7, col = CH[(r * 4 + c) % 5];
      bx(Pl, 1.2, 0.06, 0.75, '#eedcc0', x, 0.76, z);
      bx(Pl, 0.06, 0.74, 0.66, '#9aa5b8', x - 0.55, 0.37, z); bx(Pl, 0.06, 0.74, 0.66, '#9aa5b8', x + 0.55, 0.37, z);
      bx(Pl, 0.5, 0.05, 0.5, col, x, 0.46, z + 0.68); bx(Pl, 0.5, 0.42, 0.05, col, x, 0.72, z + 0.93);
    }
    bx(Pl, 1.8, 0.8, 0.8, '#9a6b42', -3.8, 0.4, -5.0);
    sc.add(new THREE.Mesh(merge(Pl), new THREE.MeshLambertMaterial({ vertexColors: true })));
    sc.add(new THREE.Mesh(merge(Bl), new THREE.MeshBasicMaterial({ vertexColors: true })));
    const fTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d2b088'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,50,20,0.12)'; for (let y = 0; y < h; y += 32) { g.fillRect(0, y, w, 2); for (let x = (y / 32 % 2) * 64; x < w; x += 128) g.fillRect(x, y, 2, 32); } });
    fTex.wrapS = fTex.wrapT = THREE.RepeatWrapping; fTex.repeat.set(3, 3);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW_, RD_).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: fTex })); fl.position.z = CZ; sc.add(fl);
    const chalk = canvasTex(512, 200, (g, w, h) => {
      g.fillStyle = '#2f5a46'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.88)'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(90, 100, 34, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(90 + Math.cos(a) * 46, 100 + Math.sin(a) * 46); g.lineTo(90 + Math.cos(a) * 62, 100 + Math.sin(a) * 62); g.stroke(); }
      g.beginPath(); g.moveTo(200, 70); g.bezierCurveTo(250, 30, 300, 110, 350, 70); g.bezierCurveTo(390, 40, 430, 100, 480, 70); g.stroke();
      g.beginPath(); g.moveTo(200, 140); g.lineTo(470, 140); g.stroke();
    });
    const cb = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 1.5), new THREE.MeshBasicMaterial({ map: chalk })); cb.position.set(0, 1.95, CZ - RD_ / 2 + 0.1); sc.add(cb);
    const skyW = canvasTex(8, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#76bdf5'); gr.addColorStop(1, '#e3f4ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    [-3.2, -0.2, 2.8].forEach(z => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), new THREE.MeshBasicMaterial({ map: skyW })); w.rotation.y = -Math.PI / 2; w.position.set(RW_ / 2 - 0.08, 1.95, z); sc.add(w); });
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshLambertMaterial({ color: 0x4aa3ff })); gl.position.set(-3.4, 1.1, -5.0); sc.add(gl);
    return sc;
  }
  function devLensDispose(sc) {
    sc.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }
  /* 장면 속 창에 붙일 그림 한 장(WebGL을 잠깐 켜서 찍고 바로 닫는다). 못 찍으면 null */
  function devLensSnap(px) {
    try {
      const cv = document.createElement('canvas'); cv.width = cv.height = px;
      const rd = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      rd.setPixelRatio(1); rd.setSize(px, px, false);
      const sc = devLensScene(), cam = new THREE.PerspectiveCamera(112, 1, 0.1, 60);
      cam.position.set(0, 1.3, 1.2); cam.rotation.set(-0.05, -0.55, 0, 'YXZ');
      rd.render(sc, cam);
      const out = document.createElement('canvas'); out.width = out.height = px;
      out.getContext('2d').drawImage(cv, 0, 0);
      devLensDispose(sc); rd.dispose();
      try { rd.forceContextLoss(); } catch (_) { /* 없어도 됨 */ }
      return out;
    } catch (_) { return null; }
  }

  /* 렌즈 시점 팝업(둥근 창 + 끌어서 둘러보기). 머리 위 둥근 창이 눈앞에 커진 모습 */
  const DEVLENS = { open: false, rd: null, sc: null, cam: null, yaw: -0.55, pitch: -0.05, auto: true, drag: null, raf: 0, last: 0, cfg: null };
  function devLensDom() {
    let el = document.getElementById('devLens');
    if (el) return el;
    const st = document.createElement('style');
    st.id = 'devLensStyle';
    st.textContent = '#devLens{position:fixed;inset:0;z-index:13;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px 12px calc(env(safe-area-inset-bottom,0px) + 12px);box-sizing:border-box;background:rgba(5,9,34,.9);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:#fff;font-family:var(--font-body)}'
      + '#devLens .dlt{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}'
      + '#devLens .dlt b{font-family:var(--font-display);font-weight:400;font-size:22px;line-height:1.2}'
      + '#devLens .dlt span{font-size:12.5px;color:#BFEFFF}'
      + '#devLens .dlw{position:relative;width:min(94vw,calc(100vh - 210px),620px);aspect-ratio:1;touch-action:none;cursor:grab}'
      + '#devLens .dld{position:absolute;left:7%;top:7%;width:86%;height:86%;border-radius:50%;overflow:hidden;background:#dbe8f6}'
      + '#devLens .dld canvas{display:block;width:100%;height:100%}'
      + '#devLens .dlb{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'
      + '#devLens .dln{max-width:min(94vw,520px);font-size:12.5px;line-height:1.5;color:#CFE3FF;text-align:center}';
    document.head.appendChild(st);
    el = document.createElement('div');
    el.id = 'devLens'; el.hidden = true; el.setAttribute('role', 'dialog');
    const top = document.createElement('div'); top.className = 'dlt';
    const tb = document.createElement('b'); tb.id = 'devLensTitle'; const ts = document.createElement('span'); ts.id = 'devLensSub';
    top.append(tb, ts);
    const wrap = document.createElement('div'); wrap.className = 'dlw'; wrap.id = 'devLensWrap';
    const disc = document.createElement('div'); disc.className = 'dld'; disc.id = 'devLensDisc';
    const bez = document.createElement('canvas'); bez.className = 'dlb'; bez.id = 'devLensBez'; bez.width = bez.height = 768;
    wrap.append(disc, bez);
    const note = document.createElement('div'); note.className = 'dln'; note.id = 'devLensNote';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pill primary'; btn.id = 'devLensClose';
    btn.addEventListener('click', () => devLensClose());
    el.append(top, wrap, note, btn);
    document.body.appendChild(el);
    devBezel(bez.getContext('2d'), 768);
    wrap.addEventListener('pointerdown', e => {
      DEVLENS.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; DEVLENS.auto = false;
      try { wrap.setPointerCapture(e.pointerId); } catch (_) { /* 시험 이벤트에서는 예외가 난다 */ }
    });
    wrap.addEventListener('pointermove', e => {
      const d = DEVLENS.drag; if (!d || d.id !== e.pointerId) return;
      DEVLENS.yaw += (e.clientX - d.x) * 0.006; DEVLENS.pitch = clamp(DEVLENS.pitch + (e.clientY - d.y) * 0.004, -0.7, 0.7);
      d.x = e.clientX; d.y = e.clientY;
    });
    const end = e => { if (DEVLENS.drag && DEVLENS.drag.id === e.pointerId) DEVLENS.drag = null; };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    addEventListener('keydown', e => { if (e.key === 'Escape' && DEVLENS.open) devLensClose(); });
    return el;
  }
  function devLensTick(now) {
    const L = DEVLENS;
    if (!L.open) return;
    const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now;
    if (L.auto) L.yaw += dt * 0.32;
    if (L.rd) { L.cam.rotation.set(L.pitch, L.yaw, 0, 'YXZ'); L.rd.render(L.sc, L.cam); }
    L.raf = requestAnimationFrame(devLensTick);
  }
  function devLensOpen(cfg) {
    const ui = (cfg && cfg.lens) || {}, L = DEVLENS;
    if (L.open) return;
    closePop();
    const el = devLensDom();
    $('devLensTitle').textContent = ui.title || '렌즈 시점';
    $('devLensSub').textContent = ui.sub || '360 교실 견학';
    $('devLensClose').textContent = T.close || '닫기';
    const disc = $('devLensDisc'); disc.textContent = '';
    const cv = document.createElement('canvas'); cv.width = cv.height = 640; disc.appendChild(cv);
    L.rd = null;
    try { L.rd = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); L.rd.setPixelRatio(1); L.rd.setSize(640, 640, false); } catch (_) { L.rd = null; }
    $('devLensNote').textContent = L.rd ? (ui.note || '[확인 전] 예시 장면이에요. 끌어서 둘러봐요') : (ui.fail || '이 기기에서는 3D 장면을 보여 줄 수 없어요');
    L.sc = L.rd ? devLensScene() : null; L.cam = new THREE.PerspectiveCamera(112, 1, 0.1, 60); L.cam.position.set(0, 1.3, 1.2);
    L.yaw = -0.55; L.pitch = -0.05; L.auto = true; L.drag = null; L.cfg = cfg; L.open = true; L.last = performance.now();
    el.hidden = false;
    R.open = true; setPaused(true); hideCard();
    $('devLensClose').focus();
    L.raf = requestAnimationFrame(devLensTick);
  }
  function devLensClose() {
    const L = DEVLENS;
    if (!L.open) return;
    L.open = false; cancelAnimationFrame(L.raf);
    const el = document.getElementById('devLens'); if (el) el.hidden = true;
    if (L.rd) { try { L.rd.dispose(); L.rd.forceContextLoss(); } catch (_) { /* 없어도 됨 */ } }
    if (L.sc) devLensDispose(L.sc);
    L.rd = null; L.sc = null;
    const disc = document.getElementById('devLensDisc'); if (disc) disc.textContent = '';
    if (R.open) { R.open = false; setPaused(false); R.cur = null; }
    if (R.built && R.built.kind === 'devices') { R.built.anim.tried = true; showToast((L.cfg && L.cfg.lens && L.cfg.lens.done) || '렌즈 시점 끝! 이제 끝 칸에서 상황 고르기를 해 봐요', 4); }
  }

  function buildDevices(school, cfg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.sky || '#0C1038');
    scene.add(new THREE.HemisphereLight(0xf2f6ff, 0xc3cfee, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(-14, 28, 20); scene.add(sun);
    const RW = 30, X0 = -RW / 2, HD = 5.5, ZB = -HD, WH = 3.8, PADZ = 3.0, DOORZ = 3.0;
    const SXS = [-10.2, -8.4, -6.6, -4.8, -3.0], SZS = -4.55, PZS = -2.95;
    const STX = 2.6, STZ = -0.9, STR = 2.0, EXX = 8.0, CNX = 12.1, CNZ = -1.3;
    const ACC = '#6fe9ff', ACCD = '#16b4da', MINT = '#7dffd1', GOLD = '#ffd36b', NAVY = '#0f1840';
    const GEAR = cfg.gear || [], ZN = cfg.zones || [], ui = cfg.ui || {}, pr = cfg.principal || {}, quiz = cfg.quiz || null, panel = cfg.panel || {};
    const coll = [], signs = [], hit = [];
    const A = { sx: STX, sz: STZ, t: 0, sel: -1, zone: 0, zones: ZN, dev: [], cards: [], cardMeta: [], rini: null, stageSpin: null, orbit: [], beam: null, glowS: null, stageK: 0, tried: false };
    let seed = 13; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
    const basic = (map, o) => new THREE.MeshBasicMaterial(Object.assign({ map }, o || {}));
    const sheet = map => basic(map, { transparent: true, depthWrite: false });
    const P = [], G = [];
    const part = (geo, color, x, y, z) => P.push(colored(geo.translate(x, y, z), color));
    const gpart = (geo, color, x, y, z) => G.push(colored(geo.translate(x, y, z), color));
    const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); scene.add(m); return m; };
    const flat = (w, h, mat, x, z, lift, order) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), mat); m.position.set(x, Y + (lift || 0.01), z); m.renderOrder = order || 2; scene.add(m); return m; };
    const gradTex = (stops, horizontal) => canvasTex(8, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const halo = (w, h, color, op, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, alphaMap: haloTex, transparent: true, opacity: op, depthWrite: false })); m.position.set(x, y, z); scene.add(m); return m; };
    const haloTex = gradTex([[0, '#000'], [0.5, '#fff'], [1, '#000']]);

    /* 바깥: 별 + 성운(밤하늘 위에 떠 있는 하얀 방) */
    { const n = 700, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, e = Math.acos(rnd() * 2 - 1), r = 150; sp[i * 3] = r * Math.sin(e) * Math.cos(a); sp[i * 3 + 1] = Y + r * Math.cos(e); sp[i * 3 + 2] = r * Math.sin(e) * Math.sin(a); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 2.1, sizeAttenuation: false, transparent: true, opacity: 0.85 }))); }
    const nebT = canvasTex(256, 256, (g, w, h) => { [[0.3, 0.5, 0.4, '150,90,255'], [0.62, 0.42, 0.34, '255,90,200'], [0.5, 0.66, 0.3, '80,160,255']].forEach(([fx, fy, fr, c]) => { const gr = g.createRadialGradient(fx * w, fy * h, 4, fx * w, fy * h, fr * w); gr.addColorStop(0, `rgba(${c},0.5)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); });
    [[34, 14, -90, 100], [-30, -4, -80, 80], [12, -40, 60, 110]].forEach(([x, y, z, s]) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebT, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(s, s, 1); m.position.set(x, Y + y, z); scene.add(m); });

    /* 바닥: 하얀 판 + 걸어가는 길(발판 줄)을 따라 하늘색 점선 */
    const floorT = canvasTex(1200, 440, (g, w, h) => {
      g.fillStyle = '#e3eaf6'; g.fillRect(0, 0, w, h);
      for (let cy = 0; cy < 11; cy++) for (let cx = 0; cx < 30; cx++) if ((cx + cy) % 2 === 0) { g.fillStyle = 'rgba(247,250,255,0.7)'; g.fillRect(cx * 40, cy * 40, 40, 40); }
      g.strokeStyle = 'rgba(120,146,196,0.5)'; g.lineWidth = 2;
      for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.setLineDash([24, 14]); g.lineWidth = 7; g.strokeStyle = 'rgba(22,180,218,0.8)'; g.beginPath(); g.moveTo(0, (PADZ + HD) / 11 * h); g.lineTo(w, (PADZ + HD) / 11 * h); g.stroke(); g.setLineDash([]);
    });
    const floor = flat(RW, 2 * HD, new THREE.MeshLambertMaterial({ map: floorT }), 0, 0, 0); floor.renderOrder = 0;
    part(new THREE.BoxGeometry(RW + 0.6, 0.8, 2 * HD + 0.6), '#c9d3ec', 0, Y - 0.41, 0);
    gpart(new THREE.BoxGeometry(RW + 0.7, 0.09, 0.09), ACCD, 0, Y, HD + 0.33);
    halo(RW + 0.6, 1.0, ACCD, 0.5, 0, Y - 0.1, HD + 0.36);

    /* 벽: 서쪽(입구)·북쪽·동쪽. 남쪽은 낮은 턱(카메라가 남쪽에서 본다). 밝은 판벽 + 네온 띠 */
    part(new THREE.BoxGeometry(RW + 0.6, WH, 0.3), '#fafcff', 0, Y + WH / 2, ZB - 0.15);
    part(new THREE.BoxGeometry(0.3, WH, 2 * HD), '#fafcff', X0 - 0.15, Y + WH / 2, 0);
    part(new THREE.BoxGeometry(0.3, WH, 2 * HD), '#fafcff', -X0 + 0.15, Y + WH / 2, 0);
    part(new THREE.BoxGeometry(RW + 0.6, 0.35, 0.3), '#d3ddf0', 0, Y + 0.175, HD + 0.15);
    const wallTexOf = units => canvasTex(Math.round(units * 60), 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fbfdff'); gr.addColorStop(1, '#eaf0fa'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(130,155,200,0.5)'; g.lineWidth = 3; for (let x = 0; x <= w; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.fillStyle = '#d3ddf0'; g.fillRect(0, h * 0.9, w, h * 0.1);
    });
    plane(RW, WH, new THREE.MeshLambertMaterial({ map: wallTexOf(RW) }), 0, Y + WH / 2, ZB + 0.012);
    { const l = plane(2 * HD, WH, new THREE.MeshLambertMaterial({ map: wallTexOf(2 * HD) }), X0 + 0.012, Y + WH / 2, 0); l.rotation.y = Math.PI / 2;
      const r = plane(2 * HD, WH, new THREE.MeshLambertMaterial({ map: wallTexOf(2 * HD) }), -X0 - 0.012, Y + WH / 2, 0); r.rotation.y = -Math.PI / 2; }
    gpart(new THREE.BoxGeometry(RW, 0.1, 0.06), ACCD, 0, Y + WH - 0.42, ZB + 0.04);
    gpart(new THREE.BoxGeometry(RW, 0.07, 0.06), ACCD, 0, Y + 0.16, ZB + 0.04);
    [X0 + 0.04, -X0 - 0.04].forEach(x => gpart(new THREE.BoxGeometry(0.06, 0.1, 2 * HD), ACCD, x, Y + WH - 0.42, 0));
    [X0 + 0.06, -X0 - 0.06].forEach(x => gpart(new THREE.BoxGeometry(0.1, WH, 0.08), ACCD, x, Y + WH / 2, ZB + 0.05));
    halo(RW, 1.3, ACCD, 0.4, 0, Y + WH - 0.42, ZB + 0.05);

    /* 입구 문(서쪽 벽)과 '지도로' 발판 */
    const doorT = canvasTex(256, 352, (g, w, h) => {
      g.fillStyle = '#e9f4fb'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,200,235,0.85)'; g.fillRect(26, 26, 90, h - 52); g.fillRect(w - 116, 26, 90, h - 52);
      g.strokeStyle = ACCD; g.lineWidth = 14; g.shadowColor = ACCD; g.shadowBlur = 16; g.strokeRect(14, 14, w - 28, h - 28); g.shadowBlur = 0;
      g.fillStyle = ACCD; g.fillRect(w / 2 - 3, 20, 6, h - 40);
    });
    { const dr = plane(1.9, 2.6, basic(doorT), X0 + 0.03, Y + 1.3, DOORZ); dr.rotation.y = Math.PI / 2; }
    const exitT = canvasTex(512, 224, (g, w, h) => {
      rr(g, 8, 8, w - 16, h - 16, 44); g.fillStyle = 'rgba(42,77,155,0.93)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; rr(g, 28, 28, w - 56, h - 56, 30); g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, T.exitSign || '지도로', 'normal', 86, FONT_D, w - 230); g.fillText(T.exitSign || '지도로', w / 2 + 34, h / 2 + 4);
      g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(150, h / 2); g.lineTo(70, h / 2); g.moveTo(104, h / 2 - 34); g.lineTo(66, h / 2); g.lineTo(104, h / 2 + 34); g.stroke();
    });
    const doorMat = flat(2.6, 1.14, sheet(exitT), X0 + 1.6, DOORZ, 0.03, 3);

    /* ① 전시대 5개(벽을 따라): 움푹한 판 + 받침대 + 하늘색 고리 + 빛줄기 + 장비 */
    const nicheT = canvasTex(256, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a78d0'); gr.addColorStop(0.55, '#223a82'); gr.addColorStop(1, '#16255a');
      g.fillStyle = gr; rr(g, 10, 10, w - 20, h - 20, 26); g.fill();
      const rg = g.createRadialGradient(w / 2, 30, 6, w / 2, 30, 270); rg.addColorStop(0, 'rgba(255,255,255,0.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; rr(g, 10, 10, w - 20, h - 20, 26); g.fill();
      g.lineWidth = 11; g.strokeStyle = ACC; g.shadowColor = ACC; g.shadowBlur = 20; rr(g, 10, 10, w - 20, h - 20, 26); g.stroke();
    });
    const nicheM = sheet(nicheT);
    const coneT = gradTex([[0, '#ffffff'], [1, '#000000']]);
    const spotT = (color, a) => canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.34 * a)); gr.addColorStop(0.75, hexA(color, 0.16 * a)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2); g.lineWidth = 12; g.strokeStyle = hexA(ACCD, 0.95 * a); g.stroke();
    });
    const standPads = [];
    GEAR.forEach((d, i) => {
      const x = SXS[i], L = DEV_LOOK[d.model] || DEV_LOOK.headset;
      plane(1.8, 3.0, nicheM, x, Y + 1.75, ZB + 0.03);
      part(new THREE.BoxGeometry(1.4, 0.86, 0.95), NAVY, x, Y + 0.43, SZS);
      part(new THREE.BoxGeometry(1.5, 0.06, 1.05), '#1a2864', x, Y + 0.89, SZS);
      gpart(new THREE.BoxGeometry(1.1, 0.045, 0.03), ACC, x, Y + 0.55, SZS + 0.49);
      gpart(new THREE.TorusGeometry(0.5, 0.02, 6, 40).rotateX(Math.PI / 2), ACC, x, Y + 0.925, SZS);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.8, 2.3, 24, 1, true), new THREE.MeshBasicMaterial({ map: coneT, color: 0xcff7ff, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.position.set(x, Y + 2.08, SZS); scene.add(cone);
      const g = devModel(d.model); g.position.set(x, Y + L.y, SZS); g.rotation.set(L.rx, L.ry, 0); g.scale.setScalar(L.s); scene.add(g);
      A.dev.push({ g, cone, u: 0, want: 0, spin: 0, x0: x, y0: Y + L.y, z0: SZS, s0: L.s, rx0: L.rx, ry0: L.ry, big: L.big, cy: L.cy, srx: L.srx });
      standPads.push(flat(1.5, 1.5, sheet(spotT(ACC, i === GEAR.length - 1 ? 1 : 0.7)), x, PZS, 0.05, 2));
      const sg = signSprite(d.name, '', { scene, bg: '#0F1840', fg: '#CFF6FF' });
      sg.userData.anchor = [x, Y + 3.0, SZS + 0.05]; sg.userData.stack = i % 2; signs.push(sg);
      coll.push({ x, z: SZS, r: 0.85 });
    });

    /* ② 회전 무대: 하얀 원판 + 도는 눈금·화살표 + 빛기둥 + 장비가 뜨는 자리 + 뒤의 카드 3장 */
    part(new THREE.CylinderGeometry(STR + 0.28, STR + 0.32, 0.14, 48), '#121b4a', STX, Y + 0.07, STZ);
    part(new THREE.CylinderGeometry(STR, STR, 0.3, 48), '#f7faff', STX, Y + 0.29, STZ);
    gpart(new THREE.TorusGeometry(STR, 0.04, 8, 72).rotateX(Math.PI / 2), ACCD, STX, Y + 0.445, STZ);
    gpart(new THREE.TorusGeometry(STR + 0.3, 0.025, 8, 72).rotateX(Math.PI / 2), ACC, STX, Y + 0.15, STZ);
    coll.push({ x: STX, z: STZ, r: STR + 0.15 });
    flat((STR + 0.7) * 2.2, (STR + 0.7) * 2.2, sheet(spotT(ACC, 0.6)), STX, STZ, 0.05, 2);
    const stageT = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(60,200,235,0.55)'); gr.addColorStop(0.6, 'rgba(60,200,235,0.2)'); gr.addColorStop(1, 'rgba(60,200,235,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(22,180,218,0.95)'; g.lineWidth = 6; [0.34, 0.2].forEach(k => { g.beginPath(); g.arc(w / 2, h / 2, w * k, 0, Math.PI * 2); g.stroke(); });
      for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.lineWidth = i % 4 === 0 ? 7 : 3; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * w * 0.43, h / 2 + Math.sin(a) * w * 0.43); g.lineTo(w / 2 + Math.cos(a) * w * 0.47, h / 2 + Math.sin(a) * w * 0.47); g.stroke(); }
      g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(14,159,198,0.95)'; g.fillStyle = 'rgba(14,159,198,0.95)'; g.lineWidth = 12;
      [0.35, 3.49].forEach(a0 => { const a1 = a0 + 1.55, Rr = w * 0.27; g.beginPath(); g.arc(w / 2, h / 2, Rr, a0, a1); g.stroke(); const ex = w / 2 + Math.cos(a1) * Rr, ey = h / 2 + Math.sin(a1) * Rr, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1); g.beginPath(); g.moveTo(ex + tx * 34, ey + ty * 34); g.lineTo(ex + nx * 24, ey + ny * 24); g.lineTo(ex - nx * 24, ey - ny * 24); g.closePath(); g.fill(); });
    });
    { const sp = new THREE.Group(); sp.position.set(STX, Y + 0.455, STZ); scene.add(sp); A.stageSpin = sp;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(STR * 2, STR * 2).rotateX(-Math.PI / 2), sheet(stageT)); m.renderOrder = 2; sp.add(m); }
    const beamT = gradTex([[0, '#000000'], [1, '#ffffff']]);
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.75, 2.7, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x25c3ea, alphaMap: beamT, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
      b.position.set(STX, Y + 0.45 + 1.35, STZ); scene.add(b); A.beam = b; }
    const glowT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(70,205,240,0.6)'); gr.addColorStop(0.5, 'rgba(70,205,240,0.22)'); gr.addColorStop(1, 'rgba(70,205,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    { const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false })); sg.scale.set(5.6, 5.6, 1); sg.position.set(STX, Y + 2.6, STZ - 0.8); sg.renderOrder = 1; scene.add(sg); A.glowS = sg; }
    [[1.95, 0.5, 1.1, 0.8], [2.35, -0.4, -0.9, 0.55]].forEach(([r, rx, rz, op]) => {
      const o = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 96), new THREE.MeshBasicMaterial({ color: ACCD, transparent: true, opacity: op, depthWrite: false }));
      o.position.set(STX, Y + 2.7, STZ); o.rotation.set(Math.PI / 2 + rx, 0, rz); o.visible = false; scene.add(o); A.orbit.push(o);
    });
    /* 카드 3장(무엇 · 수업에서 어떻게 · 주의할 점): 장비를 고르면 그 장비 글로 바뀐다 */
    const CARDS = cfg.cards || [];
    const cardTex = (c, lines) => canvasTex(560, 430, (g, w, h) => {
      rr(g, 14, 14, w - 28, h - 28, 46); g.fillStyle = 'rgba(8,12,40,0.92)'; g.fill();
      g.lineWidth = 10; g.strokeStyle = c.color; g.stroke();
      g.fillStyle = c.color; g.beginPath(); g.arc(88, 96, 46, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#08102c'; g.strokeStyle = '#08102c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.lineCap = 'round';
      if (c.icon === 'b') { rr(g, 64, 76, 48, 34, 6); g.stroke(); g.beginPath(); g.moveTo(74, 124); g.lineTo(102, 124); g.stroke(); }
      else { g.font = `900 64px ${FONT_B}`; g.fillText(c.icon === 'w' ? '!' : '?', 88, 100); }
      g.fillStyle = '#FFFFFF'; g.textAlign = 'left'; fitFont(g, c.title, '900', 68, FONT_B, w - 190); g.fillText(c.title, 150, 96);
      g.strokeStyle = hexA(c.color, 0.5); g.lineWidth = 4; g.beginPath(); g.moveTo(44, 166); g.lineTo(w - 44, 166); g.stroke();
      g.fillStyle = 'rgba(232,244,255,0.97)'; g.textAlign = 'center';
      lines.forEach((ln, i) => { fitFont(g, ln, '700', 52, FONT_B, w - 64); g.fillText(ln, w / 2, 226 + i * 66); });
      g.font = `600 30px ${FONT_B}`; g.fillStyle = 'rgba(200,220,255,0.7)'; g.textAlign = 'right'; g.fillText(ui.cardTag || '가안 [확인 전]', w - 52, h - 50);
    });
    CARDS.forEach((c, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cardTex(c, c.empty || []), transparent: true, depthWrite: false, depthTest: false }));
      s.scale.set(2.7, 2.7 * 430 / 560, 1); s.position.set(STX + (i - 1) * 2.8, Y + 3.0, -3.5); s.userData.y = Y + 3.0; s.renderOrder = 12; scene.add(s); A.cards.push(s);
    });
    const setCards = i => {
      CARDS.forEach((c, k) => {
        const s = A.cards[k], old = s.material.map, d = GEAR[i];
        s.material.map = cardTex(c, d ? (d[c.key] || []) : (c.empty || [])); s.material.needsUpdate = true; if (old) old.dispose();
      });
    };
    { const ss = signSprite((cfg.stage || {}).title || '', '', { scene, bg: '#FFD36B', fg: '#1E2B4A' }); ss.userData.anchor = [STX, Y + WH + 0.5, ZB + 0.3]; signs.push(ss); }
    { const ts = signSprite((cfg.stand || {}).title || '', '', { scene, bg: '#FFD36B', fg: '#1E2B4A' }); ts.userData.anchor = [SXS[2], Y + WH + 0.5, ZB + 0.3]; signs.push(ts); }
    { const es = signSprite(((cfg.zones || [])[2] || {}).title || (cfg.lens || {}).title || '', '', { scene, bg: '#FFD36B', fg: '#1E2B4A' }); es.userData.anchor = [EXX, Y + WH + 0.5, ZB + 0.3]; signs.push(es); }

    /* ③ 잠깐 체험: 발판 위 머리에서 올라가는 생각 방울 + 위에 뜬 둥근 렌즈 창(360 교실). 창 그림은 한 번 찍어 붙인다 */
    const snap = devLensSnap(512);
    const lensT = canvasTex(512, 512, (g, w) => {
      const c = w / 2, Rr = 440 * w / 1024;
      g.save(); g.beginPath(); g.arc(c, c, Rr, 0, Math.PI * 2); g.clip();
      if (snap) g.drawImage(snap, c - Rr, c - Rr, 2 * Rr, 2 * Rr);
      else { const gr = g.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, '#dbe8f6'); gr.addColorStop(1, '#d2b088'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }
      g.restore();
      devBezel(g, w);
    });
    { const ls = new THREE.Sprite(new THREE.SpriteMaterial({ map: lensT, transparent: true, depthWrite: false })); ls.scale.set(3.7, 3.7, 1); ls.position.set(EXX, Y + 5.0, 1.0); ls.renderOrder = 6; scene.add(ls); A.lens = ls;
      [[EXX + 0.1, 2.5, 2.4, 0.1], [EXX + 0.18, 3.0, 2.0, 0.15], [EXX + 0.26, 3.6, 1.6, 0.21]].forEach(([x, y, z, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: '#bdf4ff' })); b.position.set(x, Y + y, z); scene.add(b); }); }

    /* 끝: 출구 쪽 콘솔 + 위에 뜬 패널 '우리 반엔 어떤 장비?' */
    part(new THREE.BoxGeometry(4.2, 0.86, 1.3), NAVY, CNX, Y + 0.43, CNZ);
    part(new THREE.BoxGeometry(4.3, 0.06, 1.4), '#f2f6ff', CNX, Y + 0.89, CNZ);
    gpart(new THREE.BoxGeometry(3.8, 0.045, 0.03), ACC, CNX, Y + 0.55, CNZ + 0.66);
    [[-1.4, '#18bde6', 'A'], [0, '#2fd9a8', 'B'], [1.4, '#f0b429', 'C']].forEach(([dx, col, ch]) => {
      const bxx = CNX + dx, bzz = CNZ + 0.18;
      part(new THREE.CylinderGeometry(0.44, 0.48, 0.1, 28), '#1b2244', bxx, Y + 0.97, bzz);
      gpart(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 28), col, bxx, Y + 1.04, bzz);
      const lt = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#08102c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 84px ${FONT_B}`; g.fillText(ch, w / 2, h / 2 + 4); });
      const lm = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2), sheet(lt)); lm.position.set(bxx, Y + 1.1, bzz); lm.renderOrder = 3; scene.add(lm);
      coll.push({ x: bxx, z: CNZ, r: 0.9 });
    });
    const icon = (g, kind, cx, cy, col) => {
      g.save(); g.strokeStyle = col; g.fillStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
      if (kind === 'vr') { rr(g, cx - 66, cy - 36, 132, 72, 26); g.fill(); g.stroke(); [-28, 28].forEach(dx => { g.beginPath(); g.arc(cx + dx, cy, 16, 0, Math.PI * 2); g.stroke(); }); }
      else if (kind === 'tab') { rr(g, cx - 50, cy - 40, 100, 80, 12); g.fill(); g.stroke(); g.lineWidth = 4; rr(g, cx - 38, cy - 30, 76, 60, 6); g.stroke(); }
      else { rr(g, cx - 30, cy - 4, 60, 46, 12); g.fill(); g.stroke(); [0, 1, 2, 3].forEach(i => { const x = cx - 23 + i * 15.5, top = cy - 38 + [6, 0, 3, 12][i]; rr(g, x - 5.5, top, 12, cy - top + 6, 5); g.fill(); g.stroke(); }); g.beginPath(); g.moveTo(cx + 30, cy + 22); g.lineTo(cx + 48, cy - 2); g.stroke(); }
      g.restore();
    };
    const panelT = canvasTex(1200, 900, (g, w, h) => {
      rr(g, 14, 14, w - 28, h - 28, 54); g.fillStyle = 'rgba(8,14,44,0.92)'; g.fill();
      g.lineWidth = 11; g.strokeStyle = ACC; g.stroke();
      g.fillStyle = GOLD; g.beginPath(); g.arc(112, 112, 58, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#08102c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 62px ${FONT_B}`; g.fillText(panel.badge || '끝', 112, 116);
      g.fillStyle = '#ffffff'; g.textAlign = 'left'; fitFont(g, panel.title || '', '900', 96, FONT_B, w - 260); g.fillText(panel.title || '', 200, 100);
      g.fillStyle = 'rgba(220,240,255,0.92)'; fitFont(g, panel.sub || '', '700', 42, FONT_B, w - 250); g.fillText(panel.sub || '', 204, 176);
      g.fillStyle = 'rgba(200,220,255,0.7)'; g.textAlign = 'right'; g.font = `600 32px ${FONT_B}`; g.fillText(panel.tag || '상황 예시 · 가안 [확인 전]', w - 62, h - 50);
      [{ c: ACC, k: 'vr', ch: 'A' }, { c: MINT, k: 'tab', ch: 'B' }, { c: GOLD, k: 'glv', ch: 'C' }].forEach((b, i) => {
        const x = 44, y = 232 + i * 200, bw = w - 88, bh = 182, ln = (panel.items || [])[i] || '';
        rr(g, x, y, bw, bh, 40); g.fillStyle = hexA(b.c, 0.14); g.fill(); g.lineWidth = 8; g.strokeStyle = b.c; g.stroke();
        g.fillStyle = b.c; g.beginPath(); g.arc(x + 80, y + bh / 2, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = '#08102c'; g.textAlign = 'center'; g.font = `900 56px ${FONT_B}`; g.fillText(b.ch, x + 80, y + bh / 2 + 4);
        icon(g, b.k, x + 270, y + bh / 2, b.c);
        g.fillStyle = '#ffffff'; g.textAlign = 'left'; fitFont(g, ln, '800', 54, FONT_B, bw - 440); g.fillText(ln, x + 390, y + bh / 2 + 2);
      });
    });
    { const pn = new THREE.Sprite(new THREE.SpriteMaterial({ map: panelT, transparent: true, depthWrite: false })); pn.scale.set(3.9, 3.9 * 900 / 1200, 1); pn.position.set(CNX, Y + 4.2, -2.7); pn.renderOrder = 6; scene.add(pn); }

    /* 길 안내: 발판 4개(① ② ③ 끝) + 사이 화살표 */
    const padT = (text, sub, color) => canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, hexA(color, 0.34)); gr.addColorStop(0.8, hexA(color, 0.16)); gr.addColorStop(1, hexA(color, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(10,14,40,0.82)'; g.fill(); g.lineWidth = 16; g.strokeStyle = color; g.stroke();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${text.length > 2 ? 104 : 150}px ${FONT_B}`; g.fillText(text, w / 2, h / 2 - 24);
      fitFont(g, sub, '800', 54, FONT_B, w * 0.7); g.fillStyle = 'rgba(240,248,255,0.96)'; g.fillText(sub, w / 2, h / 2 + 78);
    });
    const PX = [SXS[2], STX, EXX, CNX], PCOL = [ACC, ACC, ACC, GOLD];
    const padM = ZN.map((z, i) => flat(2.4, 2.4, sheet(padT(z.pad || '', z.padSub || '', PCOL[i] || ACC)), PX[i], PADZ, 0.06, 3));
    const arrowT = canvasTex(256, 128, (g) => { g.lineCap = 'round'; g.lineJoin = 'round'; [['#0b1d4a', 30], ['#27c7ee', 14]].forEach(([c, lw]) => { g.strokeStyle = c; g.lineWidth = lw; [56, 128].forEach(x0 => { g.beginPath(); g.moveTo(x0, 24); g.lineTo(x0 + 50, 64); g.lineTo(x0, 104); g.stroke(); }); }); });
    [(X0 + 1.6 + PX[0]) / 2, (PX[0] + PX[1]) / 2, (PX[1] + PX[2]) / 2, (PX[2] + PX[3]) / 2].forEach(x => flat(1.5, 0.75, sheet(arrowT), x, PADZ, 0.07, 4));

    /* 리니(입구 안내 로봇) */
    const RX = X0 + 2.2, RZ = -1.9;
    const rini = new THREE.Group(); rini.position.set(RX, Y, RZ); rini.rotation.y = 0.9; scene.add(rini); A.rini = rini;
    { const rp = []; const rpart = (geo, color, x, y, z) => rp.push(colored(geo.translate(x, y, z), color));
      rpart(new THREE.BoxGeometry(0.9, 1.0, 0.7), '#FAF6EA', 0, 0.9, 0); rpart(new THREE.BoxGeometry(1.1, 0.9, 0.9), '#FAF6EA', 0, 1.95, 0); rpart(new THREE.BoxGeometry(0.5, 0.7, 0.3), '#FFD36B', 0, 0.9, -0.5);
      rini.add(new THREE.Mesh(merge(rp), new THREE.MeshLambertMaterial({ vertexColors: true })));
      const faceT = canvasTex(128, 76, (g, w, h) => { g.fillStyle = '#1A2A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#3FB8FF'; [36, 92].forEach(x => { g.beginPath(); g.ellipse(x, 36, 14, 18, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#7DFFD1'; g.fillRect(44, 60, 40, 5); });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), basic(faceT)); face.position.set(0, 1.95, 0.46); rini.add(face);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#7DFFD1' })); eye.position.set(0, 2.65, 0); rini.add(eye);
      coll.push({ x: RX, z: RZ, r: 0.7 });
      /* 하얀 바닥 위에서 하얀 몸이 묻히지 않게 밑에 그림자 */
      flat(2.2, 2.2, sheet(canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(20,30,70,0.5)'); gr.addColorStop(1, 'rgba(20,30,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })), RX, RZ, 0.04, 2);
      const rs = signSprite(pr.name || T.principal, cfg.guideSub || '', { scene, bg: '#1E2B4A', fg: '#FFFFFF' }); rs.userData.anchor = [RX, Y + 3.0, RZ]; signs.push(rs); }

    scene.add(new THREE.Mesh(merge(P), new THREE.MeshLambertMaterial({ vertexColors: true })));
    scene.add(new THREE.Mesh(merge(G), new THREE.MeshBasicMaterial({ vertexColors: true })));

    /* 장비 고르기·무대로 보내기·카드 읽기 */
    const who = () => pr.name || T.principal;
    const goTo = (x, z) => { if (R.me) R.me.target = { x, z, stuck: 0 }; hideCard(); R.cur = null; };
    function choose(i, walk) {
      const d = GEAR[i]; if (!d) return;
      if (A.sel !== i) {
        if (A.sel >= 0) A.dev[A.sel].want = 0;
        A.sel = i; A.dev[i].want = 1; setCards(i);
        if (d.line) showToast(d.line, 4.5);
      }
      if (walk) goTo(STX, PADZ); else { hideCard(); R.cur = null; }
    }
    function pickDevice() {
      const btns = GEAR.map((d, i) => ({ label: d.name + (i === A.sel ? ' ✓' : ''), choice: true, go: () => { closePop(); choose(i, true); } }));
      btns.push({ label: T.close, go: closePop });
      talkUI(who(), ui.ask || '어떤 장비를 무대로 불러 볼까요?', btns, { speak: false });
    }
    function readCards(i, k) {
      const d = GEAR[i]; if (!d) { pickDevice(); return; }
      const cd = CARDS[k] || {}, last = k >= CARDS.length - 1, btns = [];
      if (!last) btns.push({ label: T.next, primary: true, go: () => readCards(i, k + 1) });
      else {
        if (d.model === 'headset') btns.push({ label: ui.tryLens || '렌즈 시점 써 보기', primary: true, go: () => { closePop(); devLensOpen(cfg); } });
        btns.push({ label: T.close, primary: d.model !== 'headset', go: closePop });
      }
      if (k > 0) btns.push({ label: ui.prev || '이전', go: () => readCards(i, k - 1) });
      talkUI(`${who()} · ${d.name}`, `${cd.title || ''} — ${(d[cd.key] || []).join(' ')}`, btns, { progress: fill(T.progress, { i: k + 1, n: CARDS.length }), ask: ui.draft || '[확인 전] 가안이에요', speak: false });
    }
    const onStage = () => A.sel >= 0 ? GEAR[A.sel].name : '';

    const spots = [
      { id: 'rini', name: pr.name || T.principal, sub: cfg.guideSub || '', btn: T.talk, x: RX, z: RZ + 1.6, r: 1.3, pad: flat(1.8, 1.8, sheet(spotT(MINT, 0.9)), RX, RZ + 1.6, 0.05, 2), go: () => talk() }
    ];
    GEAR.forEach((d, i) => spots.push({ id: 'dev' + i, name: d.name,
      get sub() { return A.sel === i ? (ui.onStage || '지금 무대에 있어요') : (ui.standSub || '발판에 서면 장비가 무대로 날아와요'); },
      get btn() { return A.sel === i ? (ui.toStage || '무대로 가기') : (ui.send || '무대로 보내기'); },
      x: SXS[i], z: PZS, r: 0.85, pad: standPads[i], go: () => choose(i, true) }));
    const z0 = ZN[0] || {}, z1 = ZN[1] || {}, z2 = ZN[2] || {}, z3 = ZN[3] || {};
    spots.push({ id: 'p1', name: z0.title || '', sub: z0.sub || '', btn: ui.pick || '장비 고르기', x: PX[0], z: PADZ, r: 1.2, pad: padM[0], go: () => pickDevice() });
    spots.push({ id: 'p2', name: z1.title || '', get sub() { return A.sel >= 0 ? `${onStage()} · ${ui.cardsSub || '카드 3장'}` : (ui.cardsNone || '먼저 전시대에서 장비를 골라요'); },
      get btn() { return A.sel >= 0 ? (ui.cardsBtn || '카드 3장 보기') : (ui.pick || '장비 고르기'); },
      x: PX[1], z: PADZ, r: 1.2, pad: padM[1], go: () => { if (A.sel >= 0) readCards(A.sel, 0); else pickDevice(); } });
    spots.push({ id: 'p3', name: z2.title || '', sub: z2.sub || '', btn: ui.lensBtn || '써 보기', x: PX[2], z: PADZ, r: 1.2, pad: padM[2], go: () => devLensOpen(cfg) });
    if (quiz) spots.push({ id: 'quiz', name: quiz.title || z3.title || '', sub: cfg.quizSub || z3.sub || '', btn: T.start, x: PX[3], z: PADZ, r: 1.2, pad: padM[3], go: () => startPractice(quiz) });
    spots.push({ id: 'door', name: T.exitName || '지도로 나가기', sub: T.exitSub || '', btn: T.exitBtn || '나가기', x: X0 + 1.6, z: DOORZ, r: 1.0, pad: doorMat, go: () => { closePop(); core.exit(); } });
    for (const sp of spots) {
      const hb = new THREE.Mesh(new THREE.BoxGeometry(sp.id.indexOf('dev') === 0 ? 1.6 : 2.2, 1.6, 2.2), new THREE.MeshBasicMaterial());
      hb.visible = false; hb.position.set(sp.x, Y + 0.8, sp.z); hb.userData.target = sp; scene.add(hb); hit.push(hb);
    }
    /* 전시대 위 장비를 눌러도 그 발판까지 걸어간다 */
    GEAR.forEach((d, i) => { const hb = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.6, 1.3), new THREE.MeshBasicMaterial()); hb.visible = false; hb.position.set(SXS[i], Y + 1.5, SZS); hb.userData.target = spots[1 + i]; scene.add(hb); hit.push(hb); });
    setCards(-1);

    const world = {
      id: 'room:' + school.id, scene, coll, signs, hit, speedK: 0.8, pitch: 0.95,
      walk: (x, z) => x > X0 + 0.35 && x < -X0 - 0.35 && z > ZB + 0.35 && z < HD - 0.3,
      /* 가로 24칸이 보이게(벽 위 이름판까지). 폰 세로는 44칸 거리까지 물러난다 */
      camD: () => clamp(24 / (2 * Math.tan(core.vfovRad() / 2) * core.aspect()), 19, 44) * core.zoom(),
      camClamp: (me, hw, hd) => [
        hw * 2 >= RW + 1.5 ? 0 : clamp(me.x, X0 + hw - 0.6, -X0 - hw + 0.6),
        hd * 2 >= 2 * HD + 2.5 ? -2.4 + Math.max(0, me.z - 2.6) * 0.9 : clamp(me.z, ZB + hd - 1.9, HD - hd + 1.7)
      ],
      spawn: { x: X0 + 3.4, z: 1.4, yaw: Math.PI / 2 }
    };
    R.built = { school, cfg, world, npc: null, spots, kind: 'devices', anim: A };
    return R.built;
  }
  function updateDevices(dt, me) {
    const A = R.built.anim; A.t += dt;
    if (A.rini) { const dx = me.x - A.rini.position.x, dz = me.z - A.rini.position.z, want = Math.hypot(dx, dz) < 5 ? Math.atan2(dx, dz) : 0.9; let d = want - A.rini.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); A.rini.rotation.y += d * (1 - Math.exp(-dt * 6)); }
    /* 칸이 바뀌면 리니 한 줄 */
    const zi = me.x < -0.4 ? 0 : me.x < 5.6 ? 1 : me.x < 10.6 ? 2 : 3;
    if (zi !== A.zone) { A.zone = zi; const z = A.zones[zi]; if (z && z.line) showToast(z.line, 4.5); }
    /* 장비: 전시대 ↔ 무대(날아가서 크게 돈다) */
    A.dev.forEach((d, i) => {
      d.u = clamp(d.u + (d.want ? 1 : -1) * dt / 1.25, 0, 1);
      const e = d.u * d.u * (3 - 2 * d.u), ys = Y + 2.7 - d.cy * d.big;
      if (d.want) d.spin += dt * 0.9; else if (d.u <= 0) d.spin = 0;
      if (d.u >= 1) d.spin %= Math.PI * 2;
      const g = d.g;
      g.position.set(d.x0 + (A.sx - d.x0) * e, d.y0 + (ys - d.y0) * e + Math.sin(Math.PI * e) * 1.4 + (d.u >= 1 ? Math.sin(A.t * 1.3) * 0.08 : 0), d.z0 + (A.sz - d.z0) * e);
      g.scale.setScalar(d.s0 + (d.big - d.s0) * e);
      g.rotation.x = d.rx0 + (d.srx - d.rx0) * e;
      g.rotation.y = d.ry0 + Math.sin(A.t * 0.8 + i) * 0.25 * (1 - e) + d.spin * e;
      d.cone.material.opacity = 0.26 - 0.17 * e;
    });
    /* 무대 꾸밈: 눈금 판이 천천히 돌고, 장비가 있으면 궤도 고리와 빛기둥이 켜진다 */
    A.stageK += ((A.sel >= 0 ? 1 : 0) - A.stageK) * (1 - Math.exp(-dt * 4));
    A.stageSpin.rotation.y += dt * 0.3;
    A.orbit.forEach((o, i) => { o.visible = A.stageK > 0.05; o.rotation.y = A.t * (0.25 + i * 0.1); });
    if (A.beam) A.beam.material.opacity = 0.18 + 0.2 * A.stageK;
    A.cards.forEach((c, i) => { c.position.y = c.userData.y + Math.sin(A.t * 1.4 + i * 0.9) * 0.1; });
    if (A.lens) A.lens.position.y = Y + 5.0 + Math.sin(A.t * 1.1) * 0.08;
  }
  HALLS.devices = [buildDevices, updateDevices];
  /* ==== hall:devices 끝 ==== */
  /* @@관 붙이는 자리: 새 관은 이 줄 바로 위에 함수 묶음 + HALLS.<kind> 한 줄 */
  function stamp(id) {
    try { const s = JSON.parse(localStorage.getItem('xrStamps') || '{}'); if (!s[id]) { s[id] = new Date().toISOString().slice(0, 10); localStorage.setItem('xrStamps', JSON.stringify(s)); } } catch (_) { /* 저장 못 해도 진행 */ }
    showToast(T.stamped || '연수 수첩에 도장을 찍었어요', 4);
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
      for (const l of (R.cfg && R.cfg.links) || []) if (l && /^https?:\/\//.test(l.url)) links.push(l);
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
