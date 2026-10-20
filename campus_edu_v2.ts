// 가상융합교육 캠퍼스 — Delightex Edu 고품질판 v2 (2026-10-20, 캠퍼스 바깥 + 관 안 6곳)
// 캠퍼스(campus_v1.glb)와 관 안 방 6개(room_<id>_v1.glb)는 블렌더로 짓고 빛을 구워 올린 모델이다. 이 코드는 자리·크기를 맞추고
// 리니·안내·누르기·걷기·관 사이 이동을 단다. 눌러서 바뀌는 것(홀로그램 행성·교과 무대 꾸밈·선반 부품·등불)만 Edu 도형으로 만든다.
// 좌표는 블렌더와 같다: X 동쪽, Y 북쪽, Z 위. 방은 캠퍼스 땅 밑(바닥 z -40, 전망대 바닥 -270)에 있다. 글은 모두 가안(확인 전).
// 누르기는 화면 누르기 하나(Input 'primary')에서 RayCast로 나눈다(올린 모델의 onClick은 들쭉날쭉, 로봇 학교 교실 v0.3).
const Z = new Vector3(0, 0, 1);
const LIFT = 0.02;
const Z0 = 0.62;
const EYE = 1.6;
const W = (x: number, y: number, z: number) => new Vector3(x, y, z + LIFT);
function col(h: string): Color { return new Color(h); }

let CAMPUS: BaseItem = null; let RINI: BaseItem = null; let CAM: CameraItem = null;
const RM: any = {};
for (const it of Scene.getItems()) {
  const n = it.name || '';
  if (n.indexOf('campus') >= 0) CAMPUS = it;
  else if (n.indexOf('rini') >= 0) RINI = it;
  else if (n.indexOf('room_') >= 0) { for (const id of ['concept', 'cases', 'devices', 'studio', 'future', 'safety']) if (n.indexOf('room_' + id) >= 0) RM[id] = it; }
  if (it instanceof CameraItem) CAM = it;
}
function fit(it: BaseItem, scale: number, turn: number, target: Vector3) {
  it.transform.scale = scale;
  it.transform.rotation = Quat.makeRotation(Z, turn);
  const c = it.center; const p = it.transform.position;
  it.transform.position = new Vector3(p.x + target.x - c.x, p.y + target.y - c.y, p.z + target.z - c.z);
}
// 블렌더에서 잰 경계 상자 가운데
if (CAMPUS) fit(CAMPUS, 1, Math.PI, W(0, 0, 5.335));
const RC: any = { concept: [-60, 0.025, -36.0], cases: [-30, 0, -37.75], devices: [0, 0, -37.75], studio: [30, 0, -37.75], safety: [60, 0, -37.0], future: [0, 0, -210.05] };
for (const id in RM) { const c = RC[id]; fit(RM[id], 1, Math.PI, W(c[0], c[1], c[2])); }

// ── Edu 도형 도우미(눌러서 바뀌는 것만). z는 블렌더 높이(LIFT는 여기서 더함) ──
function put(it: any, x: number, y: number, z: number): any {
  it.transform.position = new Vector3(x, y, z + LIFT);
  const c = it.center;
  it.transform.position = new Vector3(2 * x - c.x, 2 * y - c.y, 2 * (z + LIFT) - c.z);
  return it;
}
function box(x: number, y: number, z: number, w: number, l: number, h: number, c: string, rz: number = 0): any {
  const b: any = Scene.createCuboid(x, y, z + LIFT); b.width = w; b.length = l; b.height = h; b.color = col(c);
  if (rz) b.transform.rotate(new Vector3(0, 0, 1), rz);
  return put(b, x, y, z);
}
function cyl(x: number, y: number, z: number, r: number, h: number, c: string): any {
  const b: any = Scene.createCylinder(new Vector3(x, y, z + LIFT)); b.radiusX = r; b.radiusY = r; b.height = h; b.color = col(c); return put(b, x, y, z);
}
function cone(x: number, y: number, z: number, r: number, h: number, c: string): any {
  const b: any = Scene.createCone(new Vector3(x, y, z + LIFT)); b.radius = r; b.height = h; b.color = col(c); return put(b, x, y, z);
}
function ell(x: number, y: number, z: number, r: number, c: string): any {
  const b: any = Scene.createEllipsoid(x, y, z + LIFT); b.radiusX = r; b.radiusY = r; b.radiusZ = r; b.color = col(c); return put(b, x, y, z);
}
function ring(x: number, y: number, z: number, R: number, t: number, c: string): any {
  const b: any = Scene.createTorus(x, y, z + LIFT); b.radius = R; b.tubeRadiusX = t; b.tubeRadiusZ = t * 0.35; b.color = col(c); return put(b, x, y, z);
}
function text(x: number, y: number, z: number, s: string, k: number, c: string): any {
  const t: any = Scene.createText(new Vector3(x, y, z + LIFT), s); t.width = 30; t.height = 3; t.transform.scale = k; t.color = col(c);
  t.transform.rotation = Quat.makeRotation(new Vector3(1, 0, 0), Math.PI / 2); return t;
}

// ── 안내 칸(열려 있을 때·닫은 직후 누르기는 장면에 보내지 않음) ──
let panelOpen = false; let panelClosedAt = -10;
function closed() { panelOpen = false; panelClosedAt = Time.currentTime; }
function info(title: string, txt: string, after: any = null) {
  panelOpen = true;
  GUI.HUD.showInfoPanel({ title: title, text: txt, onHide: () => { closed(); if (after) after(); } });
}
function choice(q: string, a1: string, a2: string, fn: (a: number) => void) {
  panelOpen = true;
  GUI.HUD.showChoicePanel({ question: q, answer1: a1, answer2: a2, onAnswer: (a: any) => { closed(); fn(a); } });
}
// 퀴즈: q = [질문, [답1, 답2, 답3], 정답 칸(0부터), 맞을 때 글, 틀릴 때 글]
function quiz(Q: any[], i: number = 0, done: any = null) {
  if (i >= Q.length) { if (done) done(); return; }
  const q = Q[i]; panelOpen = true;
  GUI.HUD.showQuizPanel({ question: q[0], answer1: q[1][0], answer2: q[1][1], answer3: q[1][2], correctAnswer: q[2] + 1,
    onCorrect: () => info('맞았어요! (' + (i + 1) + '/' + Q.length + ')', q[3], () => quiz(Q, i + 1, done)),
    onWrong: () => info('다시 생각해 봐요', q[4], () => quiz(Q, i, done)) });
}

// ── 관 6곳(캠퍼스 자리와 글) ──
const HALLS: any[] = [
  ['concept', '개념관', 0, 14, '걸을수록 가상이 되는 교실', '가상융합교육이 무엇인지, VR·AR·MR·XR 용어를 한눈에 알아봐요. 교실이 현실 → AR → MR → VR로 조금씩 바뀌어요.'],
  ['cases', '수업 사례관', -25, 9, '교과를 고르면 바뀌는 교실', '교과별 가상융합 수업 사례를 지도안, 수업 영상, 학생 결과물로 살펴봐요.'],
  ['devices', '장비관', -17, -11, '써 보는 쇼룸', 'VR 헤드셋, AR 안경, 360 카메라, 태블릿, 햅틱 장갑처럼 가상융합교육에 쓰는 장비를 알아봐요.'],
  ['studio', '제작 공방', 17, 9, '직접 만드는 작업대', '학생이 직접 가상 공간과 3D 작품을 만드는 도구와 순서를 알아봐요.'],
  ['future', '미래 전망대', 27, -11, '내려다보는 다음 교실', 'AI 튜터 교실, 디지털 트윈 학교, 먼 학교와 함께하는 수업처럼 다음 교실의 모습을 상상해 봐요.'],
  ['safety', '안전·윤리 등대', 30, 10, '불을 켜는 등대', '사용 시간, 어지러움, 개인정보와 초상권, 가상 공간 예절처럼 안전하게 쓰는 법을 알아봐요.']
];
const ORDER = ['concept', 'cases', 'devices', 'studio', 'future', 'safety'];
const NAME: any = {}; for (const H of HALLS) NAME[H[0]] = H[1];
const nextOf = (id: string) => ORDER[(ORDER.indexOf(id) + 1) % ORDER.length];

// ── 리니(올린 모델 하나를 자리마다 옮긴다) ──
const RINI_H = 1.2;
let RINI_AT = W(-2.4, -1.2, Z0 + RINI_H / 2);
const RL0 = ['안녕하세요! 가상융합교육 캠퍼스 안내를 맡은 리니예요.', '왼쪽은 현실 교정, 오른쪽은 가상 구역이에요. 가운데 광장에서 두 세계가 만나요.',
  '건물이나 건물 앞 발판을 누르면 그 관에 들어갈 수 있어요.', '바닥을 누르면 그쪽으로 걸어가요. 개념관부터 가 볼까요?'];
let LINES = RL0; let li = 0; let talkId = 0;
function anim(name: string) { const a = (RINI as any).animation; if (a) a.playLooping(name); }
function riniAt(x: number, y: number, zf: number, lines: string[]) {
  if (!RINI) return;
  RINI_AT = W(x, y, zf + RINI_H / 2); LINES = lines; li = 0; talkId++;
  fit(RINI, RINI_H / 2, Math.PI, RINI_AT); RINI.speech = ''; anim('idle');
}
function riniTalk() {
  const p = Camera.transform.position;
  fit(RINI, RINI_H / 2, Math.atan2(-(p.x - RINI_AT.x), p.y - RINI_AT.y), RINI_AT);
  RINI.speech = LINES[li]; anim(li == 0 ? 'wave' : 'talk'); li = (li + 1) % LINES.length;
  const my = ++talkId;
  Time.schedule(() => { if (my == talkId) anim('idle'); }, 3);
  Time.schedule(() => { if (my == talkId) RINI.speech = ''; }, 9);
}
riniAt(-2.4, -1.2, Z0, RL0);

// ── 카메라 ──
function look(x: number, y: number, z: number, lx: number, ly: number) {
  if (!CAM) return;
  CAM.transition.stop();
  CAM.transform.position = W(x, y, z);
  CAM.transform.rotation = Quat.makeRotation(Z, Math.atan2(-(lx - x), ly - y));
}
function tp(x: number, y: number, z: number, lx: number, ly: number) { look(x, y, z, lx, ly); Time.schedule(() => look(x, y, z, lx, ly), 0.2); }
function walkTo(x: number, y: number, floor: number) {
  if (!CAM) return;
  const p = CAM.transform.position; const t = W(x, y, floor + EYE);
  const d = Math.sqrt((t.x - p.x) * (t.x - p.x) + (t.y - p.y) * (t.y - p.y));
  CAM.transition.moveTo(t, Math.max(0.4, d / 3.0));
}

// ── 관 안: 방마다 자리·누르는 곳(상자: [x0, y0, z0, x1, y1, z1] 블렌더 좌표) ──
const ROOMS: any = {};
let HERE = 'campus';
function enter(id: string) {
  const r = ROOMS[id]; if (!r) return;
  HERE = id; tp(r.e[0], r.e[1], r.e[2], r.l[0], r.l[1]);
  riniAt(r.r[0], r.r[1], r.r[2], r.lines);
  info(NAME[id], r.welcome + '\n\n리니를 누르면 안내를 들을 수 있어요. 바닥을 누르면 걸어가요. 문을 누르면 캠퍼스나 다음 관으로 가요.\n\n(글은 모두 가안 · 확인 전)');
}
function leave(id: string) {
  HERE = 'campus';
  for (const H of HALLS) if (H[0] == id) tp(H[2], H[3] - 7.5, Z0 + EYE, H[2], H[3]);
  riniAt(-2.4, -1.2, Z0, RL0);
}
function addExits(r: any, id: string, x: number, ys: number, z: number) {
  r.spots.push({ b: [x - 4.2, ys - 0.1, z, x - 2.2, ys + 0.35, z + 3.4], fn: () => leave(id) });
  r.spots.push({ b: [x + 2.2, ys - 0.1, z, x + 4.2, ys + 0.35, z + 3.4], fn: () => enter(nextOf(id)) });
}
const inBox = (q: number[], b: number[]) => q[0] >= b[0] && q[0] <= b[3] && q[1] >= b[1] && q[1] <= b[4] && q[2] >= b[2] && q[2] <= b[5];

// 1. 개념관(바닥 -40, 가운데 x -60, 남북 34m: 현실 → AR → MR → VR)
{
  const X = -60, Y = 0, ZF = -40, D = 34;
  const r: any = { e: [X, Y - 15, ZF + EYE], l: [X, Y + 10], r: [X - 2.8, Y - 9.6, ZF], floor: ZF, area: [X - 5.8, Y - 16.8, X + 5.8, Y + 16.8], spots: [],
    welcome: '개념관이에요. 입구에서 앞으로 걸을수록 교실이 현실 → AR → MR → VR로 바뀌어요.',
    lines: ['안녕하세요! 개념관 안내를 맡은 리니예요.', '이 교실은 앞으로 걸을수록 조금씩 가상이 돼요.', '현실 → AR → MR → VR, 네 칸을 차례로 지나 보세요.', '맨 끝에서 용어 카드 4장과 퀴즈가 기다려요.'] };
  const ZN = [['① 현실', '평범한 교실이에요. 칠판·책상·지구본, 모두 진짜예요.'], ['② AR 증강현실', '진짜 교실 위에 홀로그램 행성이 떠올라요. 이름표도 같이 떠요.'], ['③ MR 혼합현실', '홀로그램이 진짜 책상을 알아보고, 손으로 집어 옮길 수 있어요. 떠 있는 행성을 눌러 보세요.'], ['④ VR 가상현실', '벽이 사라지고 우주 한가운데예요. 용어 카드와 퀴즈를 해 보세요.']];
  [-10.5, -5.5, 3.0, 11.5].forEach((yy, k) => r.spots.push({ b: [X - 1.9, Y + yy - 0.3, ZF + 2.8, X + 1.9, Y + yy + 0.3, ZF + 3.8], fn: () => info(ZN[k][0], ZN[k][1]) }));
  // ② AR 홀로그램 행성(반투명) — 누르면 설명
  const holo: any = ell(X, Y - 4.5, ZF + 2.0, 0.55, '#6FE9FF'); holo.opacity = 0.75; ring(X, Y - 4.5, ZF + 2.0, 0.9, 0.04, '#BFF6FF');
  holo.input.onClick(() => { if (!panelOpen) info('② AR 증강현실', '진짜 교실은 그대로 보이고, 그 위에 홀로그램 행성과 이름표가 겹쳐 보여요.'); });
  // ③ MR 행성: 누르면 진짜 책상 위로 옮겨 간다
  const DX = X - 2.2, DY = Y + 5.2;
  const mp: any = ell(X + 1.6, Y + 2.4, ZF + 1.6, 0.35, '#7DFFD1'); mp.opacity = 0.85; let mpOn = false;
  mp.input.onClick(() => { if (mpOn || panelOpen) return; mpOn = true; const dz = mp.center.z - mp.transform.position.z; mp.transition.moveTo(new Vector3(DX, DY, ZF + 1.1 + LIFT - dz), 1.2, () => info('③ MR 혼합현실', '홀로그램 행성을 집어 진짜 책상 위에 올려 두었어요. 가상이 진짜 공간을 알아보고 손에 반응해요.')); });
  const TERMS = [['VR · 가상현실', '현실을 가리고 완전히 다른 가상의 세계 속에 들어가요. 예: 헤드셋을 쓰고 우주 한가운데에 서기.'], ['AR · 증강현실', '진짜 세상 위에 가상의 그림이나 글을 겹쳐 보여요. 예: 책상 위에 떠오르는 홀로그램 행성.'], ['MR · 혼합현실', '가상의 것이 진짜 공간을 알아보고, 손으로 집어 옮길 수 있어요. 예: 홀로그램 행성을 진짜 책상 위에 올려 두기.'], ['XR · 확장현실', 'VR·AR·MR을 모두 아우르는 말이에요.']];
  TERMS.forEach((t, k) => { const x = X - 4.5 + k * 3; r.spots.push({ b: [x - 1.25, Y + 14.0, ZF, x + 1.25, Y + 14.4, ZF + 2.5], fn: () => info(t[0], t[1] + '\n\n(뜻풀이는 가안이에요 · 확인 전)') }); });
  const QC: any[] = [['헤드셋을 쓰니 교실이 사라지고 우주 한가운데예요. 어느 칸일까요?', ['VR 가상현실', 'AR 증강현실', '현실'], 0, '현실을 가리고 완전히 가상 속으로!', '교실이 그대로 보이면 AR이에요. 교실에 우주는 없죠.'], ['진짜 책상 위에 홀로그램 행성이 떠 있고 이름표도 떠요. 교실은 그대로 보여요.', ['VR 가상현실', 'AR 증강현실', 'MR 혼합현실'], 1, '진짜 위에 가상을 겹쳤어요.', '교실이 그대로 보이면 VR이 아니에요. 손으로 집어 옮길 수 있어야 MR이에요.'], ['홀로그램 행성을 손으로 집어서 진짜 책상 위에 올려 두었어요.', ['현실', 'AR 증강현실', 'MR 혼합현실'], 2, '가상이 진짜 공간을 알아보고 손에 반응해요.', '홀로그램은 현실이 아니죠. 겹쳐 보이기만 하면 AR, 집어 옮기면 MR이에요.']];
  r.spots.push({ b: [X - 1.3, Y + 9.85, ZF, X + 1.3, Y + 11.0, ZF + 1.0], fn: () => quiz(QC, 0, () => info('개념관 끝!', '퀴즈를 모두 풀었어요. 북쪽 끝 문으로 다음 관에 가 보세요.')) });
  r.spots.push({ b: [X - 4.0, Y - D / 2 - 0.1, ZF, X - 2.0, Y - D / 2 + 0.35, ZF + 3.4], fn: () => leave('concept') });
  r.spots.push({ b: [X - 1.0, Y + D / 2 - 0.35, ZF, X + 1.0, Y + D / 2 + 0.1, ZF + 3.4], fn: () => enter('cases') });
  ROOMS.concept = r;
}
// 2. 수업 사례관(가운데 x -30): 칠판 아래 교과 버튼 → 가운데 무대 꾸밈이 바뀐다
{
  const X = -30, Y = 0, ZF = -40, Wd = 20, D = 16;
  const r: any = { e: [X, Y - 6, ZF + EYE], l: [X, Y + 8], r: [X + 2.2, Y - 1.2, ZF], floor: ZF, area: [X - 9.6, Y - 7.6, X + 9.6, Y + 7.6], spots: [],
    welcome: '수업 사례관이에요. 칠판 아래 교과 버튼을 누르면 가운데 무대 꾸밈이 그 교과로 바뀌어요.',
    lines: ['안녕하세요! 수업 사례관 안내를 맡은 리니예요.', '① 칠판 아래 교과 버튼을 눌러 보세요.', '② 가운데 무대 꾸밈이 그 교과로 바뀌어요.', '③ 오른쪽 벽의 지도안 · 수업 영상 · 학생 결과물 자리에 휴먼쌤의 사례가 들어갈 거예요.'] };
  const SUB = [['국어', '책장과 떠 있는 글자가 나와요.'], ['수학', '입체도형이 나와요.'], ['과학', '실험대와 홀로그램 행성이 나와요.'], ['사회', '지구본과 큰 지도가 나와요.'], ['영어', '알파벳 블록과 말풍선이 나와요.'], ['예체능', '이젤과 피아노가 나와요.']];
  const SX = X, SY = Y + 2, Z1 = ZF + 0.16;
  const G: any[][] = [[], [], [], [], [], []];
  G[0].push(box(SX - 0.8, SY + 0.6, Z1 + 0.8, 1.6, 0.4, 1.6, '#8A5A3C'));
  for (let k = 0; k < 6; k++) G[0].push(box(SX - 1.4 + k * 0.24, SY + 0.38, Z1 + 1.15, 0.18, 0.12, 0.45, ['#E0483E', '#6FA8FF', '#FFD27F', '#7DFFD1', '#C4B5FD', '#FF9F6B'][k]));
  G[0].push(text(SX + 1.1, SY, Z1 + 1.8, '가 나 다', 1.6, '#F2B544'));
  G[1].push(box(SX - 1, SY, Z1 + 0.4, 0.8, 0.8, 0.8, '#6FA8FF')); G[1].push(cone(SX + 0.2, SY, Z1 + 0.55, 0.5, 1.1, '#FFD27F')); G[1].push(cyl(SX + 1.3, SY, Z1 + 0.45, 0.4, 0.9, '#FF9AD5'));
  G[2].push(box(SX, SY, Z1 + 0.4, 2.2, 0.8, 0.8, '#F4F2FB')); G[2].push(cone(SX - 0.6, SY, Z1 + 0.98, 0.15, 0.35, '#7DFFD1')); G[2].push(cyl(SX + 0.5, SY, Z1 + 0.95, 0.08, 0.3, '#8FD8FF'));
  { const p: any = ell(SX + 1.7, SY - 0.3, Z1 + 1.0, 0.4, '#7DFFD1'); p.opacity = 0.8; G[2].push(p); }
  G[3].push(cyl(SX - 0.9, SY, Z1 + 0.35, 0.05, 0.7, '#8A8F99')); G[3].push(ell(SX - 0.9, SY, Z1 + 0.95, 0.5, '#4FA3E0'));
  G[3].push(box(SX + 0.9, SY + 0.3, Z1 + 1.0, 1.8, 0.08, 1.2, '#F2E3B3')); G[3].push(text(SX + 0.9, SY + 0.25, Z1 + 1.0, '세계 지도', 0.9, '#8A5A3C'));
  ['A', 'B', 'C'].forEach((ch, k) => { G[4].push(box(SX - 1 + k, SY, Z1 + 0.3, 0.6, 0.6, 0.6, ['#FF6FD8', '#6FA8FF', '#FFD27F'][k])); G[4].push(text(SX - 1 + k, SY - 0.32, Z1 + 0.3, ch, 1.4, '#FFFFFF')); });
  G[4].push(box(SX, SY, Z1 + 1.7, 1.8, 0.08, 0.7, '#FFFFFF')); G[4].push(text(SX, SY - 0.05, Z1 + 1.7, 'Hello!', 1.2, '#FF6FD8'));
  G[5].push(box(SX - 0.9, SY + 0.1, Z1 + 0.9, 0.08, 0.08, 1.8, '#8A5A3C')); G[5].push(box(SX - 0.9, SY - 0.02, Z1 + 1.2, 0.9, 0.05, 0.7, '#FFFFFF'));
  G[5].push(box(SX + 0.8, SY, Z1 + 0.4, 1.6, 0.6, 0.8, '#1E1E24')); G[5].push(box(SX + 0.8, SY - 0.2, Z1 + 0.82, 1.5, 0.2, 0.04, '#FFFFFF'));
  for (let k = 0; k < 6; k++) for (const it of G[k]) it.active = (k == 2);
  const pickSub = (i: number) => { for (let k = 0; k < 6; k++) for (const it of G[k]) it.active = (k == i); const s = SUB[i]; info(s[0] + ' 수업 사례', s[0] + '를 골랐어요. ' + s[1] + '\n\n휴먼쌤이 줄 ' + s[0] + ' 가상융합교육 수업 사례가 여기에 들어가요.\n들어갈 내용: 학년과 단원 / 수업 목표 / 쓴 도구 / 수업 흐름(도입·활동·정리) / 학생 반응과 다음에 고칠 점\n\n(예시 · 확인 전)'); };
  SUB.forEach((s, i) => { const x = X - 3.75 + i * 1.5; r.spots.push({ b: [x - 0.7, Y + D / 2 - 0.4, ZF + 1.5, x + 0.7, Y + D / 2, ZF + 2.4], fn: () => pickSub(i) }); });
  ['지도안', '수업 영상', '학생 결과물'].forEach((v, k) => r.spots.push({ b: [X + Wd / 2 - 0.4, Y - 3 + k * 3 - 1.25, ZF + 1.2, X + Wd / 2, Y - 3 + k * 3 + 1.25, ZF + 2.8], fn: () => info(v + ' (사례 들어갈 자리)', '휴먼쌤이 주는 수업 사례로 채워요. 지금은 자리만 있어요.\n\n(예시 · 확인 전)') }));
  addExits(r, 'cases', X, Y - D / 2, ZF);
  ROOMS.cases = r;
}
// 3. 장비관(가운데 x 0)
{
  const X = 0, Y = 0, ZF = -40, D = 16;
  const r: any = { e: [X, Y - 6, ZF + EYE], l: [X, Y + 8], r: [X - 2.6, Y - 1.4, ZF], floor: ZF, area: [X - 9.6, Y - 7.6, X + 9.6, Y + 7.6], spots: [],
    welcome: '장비관이에요. 벽을 따라 선 장비를 눌러 알아보고, 오른쪽 판에서 상황 고르기 문제를 풀어 보세요.',
    lines: ['안녕하세요! 장비관 안내를 맡은 리니예요.', '벽을 따라 선 장비 5개를 하나씩 눌러 보세요. 무엇인지, 수업에서 어떻게 쓰는지, 주의할 점을 알려 줘요.', '가운데 무대에는 VR 헤드셋이 있어요.', '오른쪽 판에서 "우리 반엔 어떤 장비?" 3문제를 풀어 보세요.'] };
  const GEAR = [['AR 안경', '눈앞 진짜 세상 위에 그림이 겹쳐 보여요.', '예: 책상 위에 떠오르는 홀로그램 행성 보기', '예: 걸어 다닐 때는 앞을 잘 살피기'], ['360 카메라', '사방을 한 번에 찍는 카메라예요.', '예: 우리 학교를 찍어 다른 반에 보여 주기', '예: 사람이 찍힐 때는 미리 허락받기'], ['태블릿', '손가락으로 누르는, 들고 다니는 화면이에요.', '예: 모둠이 한 화면을 같이 보며 이야기하기', '예: 오래 보지 말고 눈을 자주 쉬어 주기'], ['햅틱 장갑', '손에 끼면 만지는 느낌을 전해 주는 장갑이에요.', '예: 가상의 물건을 손으로 만지며 배우기', '예: 손에 잘 맞는지 먼저 확인하기'], ['VR 헤드셋', '머리에 쓰는 화면으로 가상 공간에 들어가요.', '예: 먼 곳 현장학습, 360 교실 견학', '예: 쉬어 가며 쓰기, 어지러우면 바로 멈추기']];
  const gearInfo = (g: string[]) => info(g[0], '무엇인가: ' + g[1] + '\n수업에서 어떻게: ' + g[2] + '\n주의할 점: ' + g[3] + '\n\n(가안 · 확인 전)');
  GEAR.forEach((g, k) => { const x = X - 7 + k * 3.5; r.spots.push({ b: [x - 1.2, Y + D / 2 - 2.4, ZF, x + 1.2, Y + D / 2, ZF + 3.3], fn: () => gearInfo(g) }); });
  r.spots.push({ b: [X - 1.8, Y - 0.8, ZF + 0.15, X + 1.8, Y + 2.8, ZF + 2.0], fn: () => gearInfo(GEAR[4]) });
  const QD: any[] = [['교실 밖 먼 곳의 현장을 학생들에게 보여 주고 싶어요. 어떤 장비가 어울릴까요?', ['VR 헤드셋', '태블릿', '햅틱 장갑'], 0, '헤드셋 안에서 먼 곳을 둘러볼 수 있어요.', '태블릿은 같이 화면을 볼 때 좋아요. 장갑은 손에 닿는 느낌을 전해 줘요.'], ['모둠 친구들과 한 화면을 같이 보며 이야기하고 싶어요. 어떤 장비가 어울릴까요?', ['AR 안경', '태블릿', '360 카메라'], 1, '여럿이 한 화면을 같이 보기 좋아요.', '안경은 보통 쓴 사람이 혼자 보는 화면이에요. 360 카메라는 사방을 찍는 장비예요.'], ['가상의 물건을 손으로 만지는 느낌으로 배우고 싶어요. 어떤 장비가 어울릴까요?', ['360 카메라', 'AR 안경', '햅틱 장갑'], 2, '손에 끼면 만지는 느낌을 전해 줘요.', '카메라는 찍는 장비예요. 안경은 눈앞에 그림을 겹쳐 보여 줘요.']];
  r.spots.push({ b: [X + 4.6, Y - 2.2, ZF, X + 8.4, Y - 1.7, ZF + 2.4], fn: () => quiz(QD, 0, () => info('장비관 끝!', '세 상황을 모두 맞혔어요. 남쪽 문으로 다음 관에 가 보세요.')) });
  addExits(r, 'devices', X, Y - D / 2, ZF);
  ROOMS.devices = r;
}
// 4. 제작 공방(가운데 x 30): 선반의 부품을 눌러 섬 판을 꾸민다
{
  const X = 30, Y = 0, ZF = -40, Wd = 20, D = 16;
  const r: any = { e: [X, Y - 6, ZF + EYE], l: [X, Y + 8], r: [X + 2.6, Y - 1.4, ZF], floor: ZF, area: [X - 9.6, Y - 7.6, X + 9.6, Y + 7.6], spots: [],
    welcome: '제작 공방이에요. 왼쪽 선반의 부품을 눌러 가운데 섬 판을 꾸며 보세요.',
    lines: ['안녕하세요! 제작 공방 안내를 맡은 리니예요.', '① 왼쪽 선반의 부품을 누르면 ② 가운데 섬 판에 하나씩 놓여요.', '다시 꾸미고 싶으면 "모두 지우기" 판을 눌러요.', '오른쪽 벽에는 학생용 제작 도구 카드 3장이 있어요.'] };
  const IX = X, IY = Y + 1.5, ZI = ZF + 0.72, SH = ZF + 1.16;
  const SLOTS = [[-1.6, -0.6], [-0.6, -1.4], [0.5, -1.5], [1.5, -0.8], [1.7, 0.4], [-1.7, 0.6], [-0.3, 1.3], [0.6, 0.2], [-0.6, 0.0]];
  const PLACED: any[] = []; let si = 0;
  const SHELF: any[] = [box(X - 7.5, Y - 0.3, SH + 0.25, 0.5, 0.5, 0.5, '#FF9AD5'), box(X - 7.5, Y + 0.9, SH + 0.45, 0.35, 0.35, 0.9, '#FFD27F'), ell(X - 7.5, Y + 2.0, SH + 0.3, 0.3, '#7FE3D0'), cone(X - 7.5, Y + 3.2, SH + 0.45, 0.3, 0.9, '#5FA858')];
  for (const it of SHELF) it.input.onClick(() => {
    if (panelOpen) return;
    if (si >= SLOTS.length) { info('섬 판이 꽉 찼어요', '"모두 지우기" 판을 누르면 다시 꾸밀 수 있어요.'); return; }
    const c: any = it.copy(); const s = SLOTS[si++];
    const dz = it.center.z - it.transform.position.z;
    c.transform.position = new Vector3(IX + s[0], IY + s[1], ZI + LIFT + (it.center.z - (SH + LIFT)) - dz);
    PLACED.push(c);
  });
  r.spots.push({ b: [X - 4.5, Y - 1.55, ZF, X - 2.3, Y - 1.2, ZF + 1.35], fn: () => { for (const p of PLACED) p.delete(); PLACED.length = 0; si = 0; } });
  const TOOLS = [['도구 카드 1', '블록 쌓기형 도구 (예시)', '① 빈 공간을 열어요\n② 블록을 골라 놓아요\n③ 돌려 보고 저장해요'], ['도구 카드 2', '모양 빚기형 도구 (예시)', '① 기본 모양을 골라요\n② 늘리고 줄여 빚어요\n③ 색을 칠하고 저장해요'], ['도구 카드 3', '공간 꾸미기형 도구 (예시)', '① 공간 틀을 골라요\n② 물건과 캐릭터를 놓아요\n③ 걸어 다니며 확인해요']];
  TOOLS.forEach((t, k) => r.spots.push({ b: [X + Wd / 2 - 0.4, Y - 3.5 + k * 3.5 - 1.35, ZF + 1.1, X + Wd / 2, Y - 3.5 + k * 3.5 + 1.35, ZF + 2.9], fn: () => info(t[0] + ' · ' + t[1], t[2] + '\n\n도구 이름과 쓰는 법은 연구부 검증 뒤에 채워요. (확인 전)') }));
  for (let k = 0; k < 4; k++) { const x = X - 4.5 + k * 3; r.spots.push({ b: [x - 1.2, Y + D / 2 - 0.4, ZF + 1.3, x + 1.2, Y + D / 2, ZF + 3.2], fn: () => info('④ 전시 벽', '꾸민 섬을 사진으로 찍어 거는 자리예요(예시). 지금은 자리만 있어요.') }); }
  addExits(r, 'studio', X, Y - D / 2, ZF);
  ROOMS.studio = r;
}
// 5. 미래 전망대(가운데 0, 0 · 전망대 바닥 -270): 망원경 넷 + 메모판, 아래는 밤 도시
{
  const X = 0, Y = 0, ZD = -270;
  const r: any = { e: [X, Y - 6.3, ZD + EYE], l: [X, Y + 8], r: [X + 2.2, Y - 2.0, ZD], floor: ZD, round: [X, Y, 8.4], spots: [],
    welcome: '미래 전망대예요. 망원경 네 대를 눌러 다음 교실의 모습을 들여다보세요. 아래는 사람과 AI가 함께 사는 도시예요.',
    lines: ['안녕하세요! 미래 전망대 안내를 맡은 리니예요.', '여기는 높은 전망대예요. 난간 너머 아래는 사람과 AI가 함께 사는 도시예요.', '망원경 ① ② ③ ④를 차례로 눌러 다음 교실의 모습을 들여다보세요.', '가운데 메모판에는 "내가 바라는 미래 교실" 쪽지가 붙어 있어요.'] };
  const SC = [['① AI 튜터 교실', '학생 곁에서 AI 도우미가 모르는 부분을 함께 풀어 줘요. 선생님은 도움이 더 필요한 친구를 먼저 살필 수 있어요.'], ['② 디지털 트윈 학교', '진짜 학교를 컴퓨터 속에 똑같이 본뜬 "쌍둥이 학교"예요. 쌍둥이에서 먼저 해 보고, 괜찮으면 진짜 학교에 적용해 볼 수 있어요.'], ['③ 먼 학교와 함께 수업', '멀리 있는 학교의 교실과 우리 교실이 화면과 가상 공간으로 이어져, 한 교실처럼 함께 수업해요.'], ['④ 홀로그램 수업', '책 속의 그림이 눈앞에 입체로 떠올라요. 손으로 돌려 보고 가까이 들여다보며 배워요.']];
  SC.forEach((s, k) => {
    const a = (150 - k * 40) * Math.PI / 180;
    for (const d of [7, 5.4]) { const x = X + Math.cos(a) * d, y = Y + Math.sin(a) * d; r.spots.push({ b: [x - 1.3, y - 0.6, ZD, x + 1.3, y + 0.6, ZD + 2.6], fn: () => info(s[0], s[1] + '\n\n(예시 · 가안 · 확인 전)') }); }
  });
  r.spots.push({ b: [X - 1.95, Y + 0.45, ZD + 0.5, X + 1.95, Y + 0.65, ZD + 2.5], fn: () => info('내가 바라는 미래 교실', '모두의 쪽지(예시): 우주 교실 · AI 짝꿍 · 하늘 도서관 · 로봇 친구 · 어디서나 수업\n\n연수 때 각자 바라는 미래 교실을 한 줄로 이야기해 보세요. (예시 · 확인 전)') });
  r.spots.push({ b: [X - 4.2, Y - 8.2, ZD, X - 2.2, Y - 7.8, ZD + 3.4], fn: () => leave('future') });
  r.spots.push({ b: [X + 2.2, Y - 8.2, ZD, X + 4.2, Y - 7.8, ZD + 3.4], fn: () => enter('safety') });
  ROOMS.future = r;
}
// 6. 안전·윤리 등대(가운데 x 60): 상황 카드 넷을 맞히면 등불이 켜지고, 넷 다 켜지면 가운데 등불
{
  const X = 60, Y = 0, ZF = -40, Wd = 16, D = 16;
  const r: any = { e: [X, Y - 6, ZF + EYE], l: [X, Y + 8], r: [X + 3.0, Y - 1.5, ZF], floor: ZF, area: [X - 7.6, Y - 7.6, X + 7.6, Y + 7.6], spots: [],
    welcome: '안전·윤리 등대예요. 네 곳의 상황 카드를 눌러 알맞은 행동을 고르면 등불이 켜져요. 넷 다 켜지면 가운데 등불이 빛나요.',
    lines: ['안녕하세요! 안전·윤리 등대 안내를 맡은 리니예요.', '네 곳에 상황 카드가 하나씩 있어요. 누르고 알맞은 행동을 고르면 등불이 켜져요.', '넷 다 켜지면 가운데 등불이 빛나고 안전 수업 체크리스트가 나와요.', '글은 모두 가안이에요.'] };
  const CHECK = '안전 수업 체크리스트(예시)\n· 쉬는 때 알기: 어지럽거나 불편하면 바로 멈추고 쉬어요. 쉬는 때와 사용 시간은 기기·앱 안내를 확인해요.\n· 연령 기준 알기: 기기와 앱마다 쓸 수 있는 대상이 달라요. 수업에서 쓰기 전에 안내를 확인해요.\n· 사진·정보 지키기: 친구 얼굴이 나온 사진이나 이름 같은 정보는 먼저 허락을 받고, 함부로 올리지 않아요.\n· 예절 지키기: 가상 공간에서도 친구를 존중해요. 낯선 사람이 불편하게 하면 거리를 두고 어른께 알려요.\n\n(가안 · 확인 전)';
  const FL: any[] = [['① 사용 시간·어지러움', 'VR 체험을 하는데 머리가 어지러워요. 어떻게 할까요?', ['바로 멈추고 쉬어요', '조금만 참고 계속해요', '더 빨리 움직여 봐요'], 0, '몸이 불편하면 멈추고 쉬어요. 쉬는 때와 사용 시간은 기기·앱 안내를 확인해요.', '참고 계속하거나 움직임이 커지면 더 힘들어질 수 있어요.'], ['② 연령 기준', '이 VR 체험을 우리 반 모두 해도 될까요? 먼저 무엇을 할까요?', ['다들 하니까 그냥 해요', '기기·앱 안내를 확인해요', '친구한테 들은 대로 해요'], 1, '쓸 수 있는 대상은 기기와 앱마다 달라요. 시작하기 전에 안내를 확인해요.', '들은 이야기보다 안내문이 먼저예요.'], ['③ 개인정보·초상권', '체험하다가 친구 얼굴이 나온 사진을 찍었어요. 인터넷에 올리려고 해요. 어떻게 할까요?', ['그냥 올려요', '이름도 같이 적어요', '먼저 친구에게 물어봐요'], 2, '얼굴이 나온 사진은 먼저 허락을 받아요. 친구가 싫다고 하면 올리지 않아요.', '친구가 원하지 않을 수도 있어요. 이름 같은 정보는 더 조심해야 해요.'], ['④ 가상 공간 예절', '가상 공간에서 낯선 아바타가 다가와 자꾸 말을 걸어요. 불편해요. 어떻게 할까요?', ['거리를 두고 어른께 알려요', '이름과 학교를 알려 줘요', '말없이 따라가요'], 0, '불편하면 거리를 두고 선생님이나 어른께 알려요. 이름·학교 같은 정보는 알려 주지 않아요.', '낯선 사람에게 개인정보를 알려 주거나 따라가면 위험할 수 있어요.']];
  const LIT = [false, false, false, false];
  const BEACON: any = cyl(X, Y + 2, ZF + 3.0, 0.7, 1.2, '#7A7F99');
  const POS = [[-4.5, -1.5], [4.5, -1.5], [-4.5, 4.5], [4.5, 4.5]];
  FL.forEach((f: any, k: number) => {
    const x = X + POS[k][0], y = Y + POS[k][1];
    const lamp: any = cyl(x, y, ZF + 1.25, 0.32, 0.5, '#7A7F99');
    const ask = () => { if (panelOpen) return; panelOpen = true; GUI.HUD.showQuizPanel({ question: f[1], answer1: f[2][0], answer2: f[2][1], answer3: f[2][2], correctAnswer: f[3] + 1,
      onCorrect: () => { lamp.color = col('#FFE58A'); LIT[k] = true; let n = 0; for (const v of LIT) if (v) n++; info('등불이 켜졌어요 (' + n + '/4)', f[4], n == 4 ? () => { BEACON.color = col('#FFE58A'); info('등불이 모두 켜졌어요!', CHECK); } : null); },
      onWrong: () => info('다시 생각해 봐요', f[5]) }); };
    lamp.input.onClick(ask);
    r.spots.push({ b: [x - 1.4, y - 0.9, ZF, x + 1.4, y + 0.65, ZF + 2.5], fn: ask });
  });
  r.spots.push({ b: [X - Wd / 2, Y + 1.7, ZF + 4.3, X - Wd / 2 + 0.4, Y + 6.3, ZF + 5.5], fn: () => info('안전 수업 체크리스트', CHECK) });
  addExits(r, 'safety', X, Y - D / 2, ZF);
  ROOMS.safety = r;
}

// ── 캠퍼스 누르기 ──
function hallAsk(H: any) { choice(H[1] + ' · ' + H[4] + '\n' + H[5] + ' (가안 · 확인 전)', '들어가기', '캠퍼스 더 둘러보기', (a: number) => { if (a == 1) enter(H[0]); }); }
function onBoard(x: number, y: number) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax <= 30 || ay <= 15) return ax <= 37.5 && ay <= 22.5;
  return (ax - 30) * (ax - 30) + (ay - 15) * (ay - 15) <= 7.5 * 7.5;
}
function onPress() {
  if (panelOpen || Time.currentTime - panelClosedAt < 0.4) return;
  const h = RayCast.cast(Camera.transform.position, Input.clickDirection);
  if (!h) return;
  if (RINI && h.item.id == RINI.id) { riniTalk(); return; }
  const q = [h.point.x, h.point.y, h.point.z - LIFT];
  if (CAMPUS && h.item.id == CAMPUS.id) {
    for (const H of HALLS) {
      const dx = q[0] - H[2], dy = q[1] - H[3];
      const pad = Math.sqrt(dx * dx + (q[1] - (H[3] - 5.4)) * (q[1] - (H[3] - 5.4))) < 1.1;
      const bld = Math.abs(dx) < 5 && dy > -4.6 && dy < 4.6 && q[2] > Z0 + 0.06;
      const sgn = q[2] > Z0 + 1.2 && Math.abs(q[1] - (H[3] - 5.1)) < 0.3 && dx < -1.0 && dx > -5.5;
      if (pad || bld || sgn) { hallAsk(H); return; }
    }
    if (Math.abs(q[2] - Z0) < 0.08 && onBoard(q[0], q[1])) walkTo(q[0], q[1], Z0);
    return;
  }
  for (const id in RM) {
    if (h.item.id != RM[id].id) continue;
    const r = ROOMS[id];
    for (const s of r.spots) if (inBox(q, s.b)) { s.fn(); return; }
    if (Math.abs(q[2] - r.floor) < 0.06) {
      if (r.area && q[0] > r.area[0] && q[0] < r.area[2] && q[1] > r.area[1] && q[1] < r.area[3]) walkTo(q[0], q[1], r.floor);
      if (r.round && Math.sqrt((q[0] - r.round[0]) * (q[0] - r.round[0]) + (q[1] - r.round[1]) * (q[1] - r.round[1])) < r.round[2]) walkTo(q[0], q[1], r.floor);
    }
    return;
  }
}
Input.onKeyDown(onPress, 'primary');

// ── 처음 화면 + 확인용 시점(n 다음 · b 이전) · 확인용 TEST(관 id를 넣으면 그 관 안에서 시작, 공유 전 ''로) ──
const TEST = '';
const VIEWS = [[0, -18, Z0 + EYE, 0, 8], [-10, -6, Z0 + EYE, -25, 8], [10, -6, Z0 + EYE, 27, 4], [0, 2, Z0 + EYE, 0, 14], [-21, -3, Z0 + EYE, -25, 9], [22, -24, Z0 + EYE, 27, -11]];
let vi = 0;
const goView = () => { const v = VIEWS[vi]; look(v[0], v[1], v[2], v[3], v[4]); };
Input.onKeyDown(() => { if (HERE == 'campus') { vi = (vi + 1) % VIEWS.length; goView(); } }, 'n');
Input.onKeyDown(() => { if (HERE == 'campus') { vi = (vi + VIEWS.length - 1) % VIEWS.length; goView(); } }, 'b');
if (TEST) enter(TEST);
else {
  tp(0, -18, Z0 + EYE, 0, 8);
  info('가상융합교육 캠퍼스', '가상융합교육을 익히는 연수용 캠퍼스예요. 왼쪽은 현실 교정, 오른쪽은 가상 구역, 가운데는 융합 광장이에요.\n리니와 건물을 눌러 보세요. 건물을 누르면 관 안으로 들어갈 수 있어요. 바닥을 누르면 그쪽으로 걸어가요.\n(Delightex Edu 고품질판 · 가안)');
}
