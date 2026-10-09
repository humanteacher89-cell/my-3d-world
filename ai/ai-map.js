// AI가 지은 섬(가칭) 판 좌표(2026-10-09 XR개발부). 로비 엔진(lobby.js)이 읽는 FRANCE_MAP 꼴을 그대로 쓴다.
// lon0·lat0 = 0, k·s = 1 이라 설정의 lon = x(동쪽 +), lat = -z(북쪽 +) 칸이다.
// 판 = 가운데 생각의 핵(육각) + 북쪽 반원에 생각 구역 다섯(작은 육각) + 남쪽 깨어나는 마을(큰 육각), 사이는 빛 다리(region 'bridge').
// 기획안 핸드오프\20261009-AI가상세계.md 2판. M.ai = 이 판 전용 그리기(lobby.js buildAiIsland).
window.FRANCE_MAP = (function () {
  const r2 = v => Math.round(v * 100) / 100;
  const hex = (cx, cz, R, rot) => { const a = []; for (let k = 0; k < 6; k++) { const t = rot + k * Math.PI / 3; a.push(r2(cx + Math.cos(t) * R), r2(cz + Math.sin(t) * R)); } return a; };
  // 북쪽에서 시계 방향 각도(도) → 판 가운데
  const at = (deg, d) => { const t = deg * Math.PI / 180; return [r2(Math.sin(t) * d), r2(-Math.cos(t) * d)]; };
  const CORE_R = 9, ZONE_R = 7.5, ZONE_D = 24, VIL_R = 12.5, VIL_D = 27;
  const zones = [
    { c: 'library', deg: -80 }, { c: 'pattern', deg: -40 }, { c: 'market', deg: 0 }, { c: 'dream', deg: 40 }, { c: 'lake', deg: 80 }
  ].map(o => Object.assign(o, { p: at(o.deg, ZONE_D) }));
  const vil = [0, VIL_D];
  // 빛 다리: 핵 가장자리 안쪽에서 판 가장자리 안쪽까지 너비 3.2칸 띠
  const bridge = (deg, d0, d1, w) => {
    const t = deg * Math.PI / 180, ux = Math.sin(t), uz = -Math.cos(t), nx = -uz * w / 2, nz = ux * w / 2;
    return [r2(ux * d0 + nx), r2(uz * d0 + nz), r2(ux * d1 + nx), r2(uz * d1 + nz), r2(ux * d1 - nx), r2(uz * d1 - nz), r2(ux * d0 - nx), r2(uz * d0 - nz)];
  };
  const regions = [
    { c: 'core', n: '생각의 핵', l: [0, 5.6], r: [hex(0, 0, CORE_R, 0)] },
    ...zones.map(o => ({ c: o.c, n: o.c, l: [o.p[0], o.p[1] + 5.7], r: [hex(o.p[0], o.p[1], ZONE_R, Math.PI / 6 + o.deg * Math.PI / 180)] })),
    { c: 'village', n: '깨어나는 마을', l: [vil[0], vil[1] + 7.6], r: [hex(vil[0], vil[1], VIL_R, 0)] },
    { c: 'bridge', n: '빛 다리', l: [0, 0], r: [...zones.map(o => bridge(o.deg, CORE_R * 0.8, ZONE_D - ZONE_R * 0.8, 3.2)), bridge(180, CORE_R * 0.8, VIL_D - VIL_R * 0.8, 4)] }
  ];
  return {
    campus: true, ai: true, lon0: 0, lat0: 0, k: 1, s: 1,
    zones, vil, CORE_R, ZONE_R, VIL_R,
    regions,
    // 두꺼운 받침(결정 판 아래): 판마다 조금 큰 육각
    base: [hex(0, 0, CORE_R + 0.9, 0), ...zones.map(o => hex(o.p[0], o.p[1], ZONE_R + 0.8, Math.PI / 6 + o.deg * Math.PI / 180)), hex(vil[0], vil[1], VIL_R + 1, 0)],
    nb: []
  };
})();
