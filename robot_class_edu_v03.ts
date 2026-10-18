// 로봇 학교 교실 — Delightex Edu 고품질 시범 v0.3 (2026-10-19)
// 교실·마당은 블렌더로 짓고 빛을 구워 올린 모델(classroom_v2.glb — Edu 조명 보정). 이 코드는 자리·크기를 맞추고 리니·안내·누르기·걷기를 단다.
// 좌표는 블렌더와 같게 맞춘다: X 동쪽(큰 창), Y 북쪽(칠판), Z 위. 교실 바닥 높이 = FL + LIFT.
// v0.3: 올린 모델의 input.onClick은 리니(움직이는 모델)에서 안 불리고 교실에서도 들쭉날쭉했다 → 화면 누르기 하나(Input 'primary')에서
//       RayCast로 무엇을 눌렀는지 보고 나눈다. Edu의 '바닥 누르면 걷기'도 올린 모델 바닥에서는 안 움직여(카메라 충돌 끔) 코드로 옮긴다.
const Z = new Vector3(0, 0, 1);
const LIFT = 0.55;                     // 모델 맨 아래(-0.54)를 Edu 바닥(0) 위로 올린다(마당이 Edu 바닥과 겹쳐 깜빡이지 않게)
const FL = 0.30;                       // 교실 바닥 높이(블렌더)
const EYE = 1.6;                       // 걸을 때 눈높이
const W = (x: number, y: number, z: number) => new Vector3(x, y, z + LIFT);

let ROOM: BaseItem = null; let RINI: BaseItem = null; let CAM: CameraItem = null;
for (const it of Scene.getItems()) {
  const n = it.name || '';
  if (n.indexOf('classroom') >= 0) ROOM = it;
  else if (n.indexOf('rini') >= 0) RINI = it;
  if (it instanceof CameraItem) CAM = it;
}

// Edu는 올린 모델을 작게 줄이고(예: 0.1배) 앞뒤를 반 바퀴 돌려 놓는다 → 크기·방향을 정하고, 경계 상자 가운데로 자리를 맞춘다
function fit(it: BaseItem, scale: number, turn: number, target: Vector3) {
  it.transform.scale = scale;
  it.transform.rotation = Quat.makeRotation(Z, turn);
  const c = it.center; const p = it.transform.position;
  it.transform.position = new Vector3(p.x + target.x - c.x, p.y + target.y - c.y, p.z + target.z - c.z);
}
const ROOM_C = W(8, 0, 3.429);         // 블렌더에서 잰 교실 모델 경계 상자 가운데
if (ROOM) fit(ROOM, 1, Math.PI, ROOM_C);

// 안내 칸: 열려 있을 때와 닫은 직후의 누르기는 장면에 보내지 않는다(X를 누른 것이 뒤의 칠판·바닥 누르기로 겹치지 않게)
let panelOpen = false; let panelClosedAt = -10;
function info(title: string, text: string) {
  panelOpen = true;
  GUI.HUD.showInfoPanel({ title: title, text: text, onHide: () => { panelOpen = false; panelClosedAt = Time.currentTime; } });
}

// 리니: 칠판 왼쪽 앞에서 학생 자리(남쪽)를 본다. 모델 키 2(±1) → 0.6배 = 1.2m. 누르면 누른 사람 쪽을 보고 말한다
const RINI_H = 1.2;
const RINI_AT = W(-1.9, 2.75, FL + RINI_H / 2);
const LINES = ['안녕하세요! 저는 리니예요.', '여기는 제가 휴먼쌤께 수업을 받는 교실이에요.', '칠판의 "리니야, 학교가자"는 우리 학교 이야기 제목이에요.', '창밖 마당도 둘러보세요. 바닥을 누르면 그쪽으로 걸어가요.'];
let li = 0; let talkId = 0;
function anim(name: string) { const a = (RINI as any).animation; if (a) a.playLooping(name); }
function riniTalk() {
  const p = Camera.transform.position;
  fit(RINI, RINI_H / 2, Math.atan2(-(p.x - RINI_AT.x), p.y - RINI_AT.y), RINI_AT);
  RINI.speech = LINES[li]; anim(li == 0 ? 'wave' : 'talk'); li = (li + 1) % LINES.length;
  const my = ++talkId;
  Time.schedule(() => { if (my == talkId) anim('idle'); }, 3);
  Time.schedule(() => { if (my == talkId) RINI.speech = ''; }, 9);
}
if (RINI) { fit(RINI, RINI_H / 2, Math.PI, RINI_AT); anim('idle'); }

// 누르면 설명이 뜨는 곳(블렌더 좌표 상자)
const SPOTS = [
  { lo: [-2.75, 3.75, 1.1], hi: [2.75, 4.05, 2.6], title: '칠판', text: '"리니야, 학교가자"는 리니와 로봇 친구들의 학교생활 이야기 제목이에요.\n(가안 · 확인 전)' },
  { lo: [2.4, 2.25, 0.3], hi: [4.0, 3.2, 1.4], title: '휴먼쌤 책상', text: '휴먼쌤이 로봇들을 가르칠 때 쓰는 책상이에요.\n(가안 · 확인 전)' },
];
const inside = (q: number[], lo: number[], hi: number[]) => q[0] >= lo[0] && q[0] <= hi[0] && q[1] >= lo[1] && q[1] <= hi[1] && q[2] >= lo[2] && q[2] <= hi[2];

// 걷기: 교실 안에서는 교실 바닥을, 마당에서는 마당 땅을 누르면 그쪽으로 걸어간다(벽을 뚫고 안팎을 오가지 않게)
function walkTo(x: number, y: number, ground: number) {
  if (!CAM) return;
  const p = CAM.transform.position; const t = W(x, y, ground + EYE);
  const d = Math.sqrt((t.x - p.x) * (t.x - p.x) + (t.y - p.y) * (t.y - p.y));
  CAM.transition.moveTo(t, Math.max(0.4, d / 2.5));
}
function onPress() {
  if (panelOpen || Time.currentTime - panelClosedAt < 0.4) return;
  const h = RayCast.cast(Camera.transform.position, Input.clickDirection);
  if (!h) return;
  if (RINI && h.item.id == RINI.id) { riniTalk(); return; }
  if (!ROOM || h.item.id != ROOM.id) return;
  const q = [h.point.x, h.point.y, h.point.z - LIFT];
  for (const s of SPOTS) if (inside(q, s.lo, s.hi)) { info(s.title, s.text); return; }
  const c = Camera.transform.position; const inRoom = c.x < 5.0;
  if (inRoom && Math.abs(q[2] - FL) < 0.03 && q[0] > -4.6 && q[0] < 4.6 && q[1] > -3.6 && q[1] < 3.6) walkTo(q[0], q[1], FL);
  else if (!inRoom && q[2] < 0.2 && q[0] > 5.8 && q[0] < 28 && Math.abs(q[1]) < 20) walkTo(q[0], q[1], q[2]);
}
Input.onKeyDown(onPress, 'primary');

// 카메라: 교실 뒤 문 옆에서 칠판 쪽을 본다(편집기에서 카메라 '충돌'을 꺼 둔다 — 켜면 코드로 옮긴 카메라가 끌려간다)
function look(x: number, y: number, z: number, lx: number, ly: number) {
  if (!CAM) return;
  CAM.transform.position = W(x, y, z);
  CAM.transform.rotation = Quat.makeRotation(Z, Math.atan2(-(lx - x), ly - y));
}
look(-3.9, -3.1, FL + EYE, 0.6, 3.0);

// 확인용 시점(n 다음 · b 이전): 문 옆 → 앞에서 뒤 → 창 쪽 → 칠판 가까이 → 마당
const VIEWS = [[-3.9, -3.1, 1.9, 0.6, 3.0], [3.9, 3.3, 2.0, -1.5, -2.0], [-2.5, 0.6, 1.8, 6.0, -0.5], [0.0, 0.6, 1.8, 0.0, 4.0], [13.5, -7.0, 1.7, 4.8, 0.5]];
let vi = 0;
const goView = () => { const v = VIEWS[vi]; look(v[0], v[1], v[2], v[3], v[4]); };
Input.onKeyDown(() => { vi = (vi + 1) % VIEWS.length; goView(); }, 'n');
Input.onKeyDown(() => { vi = (vi + VIEWS.length - 1) % VIEWS.length; goView(); }, 'b');

info('로봇 학교 교실', '리니가 휴먼쌤에게 수업을 받는 교실이에요.\n리니, 칠판, 휴먼쌤 책상을 눌러 보세요. 바닥을 누르면 그쪽으로 걸어가요.\n(Delightex Edu 고품질 시범판 · 가안)');
