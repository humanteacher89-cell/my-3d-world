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

  // ── 들어가기·나가기·매 화면 ──
  function enter(school, cfg) {
    if (R.built && R.built.school.id !== school.id) invalidate();
    if (!R.built) R.built = build(school, cfg);
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
    removeChar(R.built.npc);
    R.built.world.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    R.built = null;
  }
  function update(dt, me) {
    if (!R.world) return;
    // 교장 선생님은 가까이 오면 방문자를 바라본다
    const npc = R.built.npc;
    const dx = me.x - npc.x, dz = me.z - npc.z, dist = Math.hypot(dx, dz);
    npc.tyaw = dist < 4 ? Math.atan2(dx, dz) : 0;
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
      btns.push({ label: T.later, go: closePop });
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
    talkUI(who, fill(T.doneBody, { title: TALK.sit.title }), [{ label: T.again, go: () => startPractice(TALK.sit) }, { label: T.close, primary: true, go: closePop }], { feedback: T.done, fbKind: 'ok' });
  }

  $('popClose').addEventListener('click', closePop);
  $('pop').addEventListener('click', e => { if (e.target === $('pop')) closePop(); });
  $('talkClose').addEventListener('click', closePop);
  addEventListener('keydown', e => { if (e.key === 'Escape' && R.open) closePop(); });

  return { enter, leave, update, closePop, invalidate, isOpen: () => R.open, state: R };
};
