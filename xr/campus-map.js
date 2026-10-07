// 가상융합교육 지도(캠퍼스) 좌표. 프랑스 로비 엔진(lobby.js)이 읽는 FRANCE_MAP 꼴을 그대로 쓴다.
// lon0·lat0 = 0, k·s = 1 이라 설정의 lon = x(동쪽 +), lat = -z(북쪽 +) 칸이다.
// 판 하나 = 왼쪽 현실 교정 · 가운데 융합 광장 띠 · 오른쪽 가상 구역(기획안 20261007 컨셉 A).
// 관 사이는 겹쳐 보이지 않을 만큼만 띄운다(10-07 14:30 휴먼쌤 "너무 멀지 않니..? 건물들이 서로 겹쳐보이지 않는 정도만" → 판 120×60에서 76×46으로 줄임).
window.FRANCE_MAP = (function () {
  const W = 38, H = 23, R = 8, B = 8;   // 판 반너비·반높이, 모서리 둥글기, 융합 띠 반너비
  const r2 = v => Math.round(v * 100) / 100;
  function arc(out, cx, cz, a0, a1, rad, n) {
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(r2(cx + Math.cos(a) * rad), r2(cz + Math.sin(a) * rad)); }
  }
  const real = [-B, H, -B, -H];
  arc(real, -W + R, -H + R, -Math.PI / 2, -Math.PI, R, 8);
  arc(real, -W + R, H - R, Math.PI, Math.PI / 2, R, 8);
  const virt = [B, -H];
  arc(virt, W - R, -H + R, -Math.PI / 2, 0, R, 8);
  arc(virt, W - R, H - R, 0, Math.PI / 2, R, 8);
  virt.push(B, H);
  const fusion = [-B, -H, B, -H, B, H, -B, H];
  const E = 1.4, base = [];
  arc(base, -W + R, -H + R, -Math.PI / 2, -Math.PI, R + E, 8);
  arc(base, -W + R, H - R, Math.PI, Math.PI / 2, R + E, 8);
  arc(base, W - R, H - R, Math.PI / 2, 0, R + E, 8);
  arc(base, W - R, -H + R, 0, -Math.PI / 2, R + E, 8);
  return {
    campus: true, lon0: 0, lat0: 0, k: 1, s: 1,
    size: { W, H, B },
    regions: [
      { c: 'real', n: '현실 교정', l: [-22, -18.5], r: [real] },
      { c: 'fusion', n: '융합 광장', l: [0, 16.5], r: [fusion] },
      { c: 'virtual', n: '가상 구역', l: [21, -18.5], r: [virt] }
    ],
    base: [base],
    nb: []
  };
})();
