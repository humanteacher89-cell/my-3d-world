// 가상융합교육 캠퍼스 — Delightex Edu 고품질판 v1 (2026-10-20, 1단계: 캠퍼스 바깥)
// 캠퍼스는 블렌더로 짓고 빛을 구워 올린 모델(campus_v1.glb — Edu 조명 보정). 이 코드는 자리·크기를 맞추고 리니·안내·누르기·걷기를 단다.
// 좌표는 블렌더와 같다: X 동쪽(가상 구역), Y 북쪽(개념관), Z 위. 구역 바닥 높이 = Z0 + LIFT. 옛 v0.4(TAZ-GEY)와 관 자리가 같다.
// 누르기는 로봇 학교 교실 v0.3처럼 화면 누르기 하나(Input 'primary')에서 RayCast로 나눈다(올린 모델의 onClick은 들쭉날쭉).
const Z = new Vector3(0, 0, 1);
const LIFT = 0.02;                     // 모델 밑면(0)을 Edu 바닥 위로 살짝 올린다(깜빡임 방지)
const Z0 = 0.62;                       // 구역 바닥 높이(블렌더)
const EYE = 1.6;
const W = (x: number, y: number, z: number) => new Vector3(x, y, z + LIFT);

let CAMPUS: BaseItem = null; let RINI: BaseItem = null; let CAM: CameraItem = null;
for (const it of Scene.getItems()) {
  const n = it.name || '';
  if (n.indexOf('campus') >= 0) CAMPUS = it;
  else if (n.indexOf('rini') >= 0) RINI = it;
  if (it instanceof CameraItem) CAM = it;
}

function fit(it: BaseItem, scale: number, turn: number, target: Vector3) {
  it.transform.scale = scale;
  it.transform.rotation = Quat.makeRotation(Z, turn);
  const c = it.center; const p = it.transform.position;
  it.transform.position = new Vector3(p.x + target.x - c.x, p.y + target.y - c.y, p.z + target.z - c.z);
}
const CAMPUS_C = W(0, 0, 5.335);       // 블렌더에서 잰 경계 상자 가운데
if (CAMPUS) fit(CAMPUS, 1, Math.PI, CAMPUS_C);

let panelOpen = false; let panelClosedAt = -10;
function info(title: string, text: string) {
  panelOpen = true;
  GUI.HUD.showInfoPanel({ title: title, text: text, onHide: () => { panelOpen = false; panelClosedAt = Time.currentTime; } });
}

// 관 6곳(옛 v0.4와 같은 글 — 모두 가안 · 확인 전)
const HALLS: any[] = [
  ['concept', '개념관', 0, 14, '걸을수록 가상이 되는 교실', '가상융합교육이 무엇인지, VR·AR·MR·XR 용어를 한눈에 알아봐요. 교실이 현실 → AR → MR → VR로 조금씩 바뀌어요.'],
  ['cases', '수업 사례관', -25, 9, '교과를 고르면 바뀌는 교실', '교과별 가상융합 수업 사례를 지도안, 수업 영상, 학생 결과물로 살펴봐요.'],
  ['devices', '장비관', -17, -11, '써 보는 쇼룸', 'VR 헤드셋, AR 안경, 360 카메라, 태블릿, 햅틱 장갑처럼 가상융합교육에 쓰는 장비를 알아봐요.'],
  ['studio', '제작 공방', 17, 9, '직접 만드는 작업대', '학생이 직접 가상 공간과 3D 작품을 만드는 도구와 순서를 알아봐요.'],
  ['future', '미래 전망대', 27, -11, '내려다보는 다음 교실', 'AI 튜터 교실, 디지털 트윈 학교, 먼 학교와 함께하는 수업처럼 다음 교실의 모습을 상상해 봐요.'],
  ['safety', '안전·윤리 등대', 30, 10, '불을 켜는 등대', '사용 시간, 어지러움, 개인정보와 초상권, 가상 공간 예절처럼 안전하게 쓰는 법을 알아봐요.']
];
function hallInfo(H: any) {
  info(H[1] + ' · ' + H[4], H[5] + '\n\n관 안은 다음 단계에서 같은 고품질로 지어요.\n(가안 · 확인 전)');
}

// 리니: 포털 왼쪽 앞에서 남쪽(들어오는 사람)을 본다. 누르면 누른 사람 쪽을 보고 말한다
const RINI_H = 1.2;
const RINI_AT = W(-2.4, -1.2, Z0 + RINI_H / 2);
const LINES = ['안녕하세요! 가상융합교육 캠퍼스 안내를 맡은 리니예요.', '왼쪽은 현실 교정, 오른쪽은 가상 구역이에요. 가운데 광장에서 두 세계가 만나요.',
  '건물이나 건물 앞 발판을 누르면 그 관을 소개해 드려요.', '바닥을 누르면 그쪽으로 걸어가요. 개념관부터 가 볼까요?'];
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

// 판 안쪽(둥근 네모 76 × 46, 모서리 반지름 8)
function onBoard(x: number, y: number) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax <= 30 || ay <= 15) return ax <= 37.5 && ay <= 22.5;
  return (ax - 30) * (ax - 30) + (ay - 15) * (ay - 15) <= 7.5 * 7.5;
}
function walkTo(x: number, y: number) {
  if (!CAM) return;
  const p = CAM.transform.position; const t = W(x, y, Z0 + EYE);
  const d = Math.sqrt((t.x - p.x) * (t.x - p.x) + (t.y - p.y) * (t.y - p.y));
  CAM.transition.moveTo(t, Math.max(0.4, d / 3.0));
}
function onPress() {
  if (panelOpen || Time.currentTime - panelClosedAt < 0.4) return;
  const h = RayCast.cast(Camera.transform.position, Input.clickDirection);
  if (!h) return;
  if (RINI && h.item.id == RINI.id) { riniTalk(); return; }
  if (!CAMPUS || h.item.id != CAMPUS.id) return;
  const x = h.point.x, y = h.point.y, z = h.point.z - LIFT;
  for (const H of HALLS) {
    const dx = x - H[2], dy = y - H[3];
    const pad = Math.sqrt(dx * dx + (y - (H[3] - 5.4)) * (y - (H[3] - 5.4))) < 1.1;     // 입장 발판
    const bld = Math.abs(dx) < 5 && dy > -4.6 && dy < 4.6 && z > Z0 + 0.06;             // 건물
    const sign = z > Z0 + 1.2 && Math.abs(y - (H[3] - 5.1)) < 0.3 && dx < -1.0 && dx > -5.5; // 이름 표지판
    if (pad || bld || sign) { hallInfo(H); return; }
  }
  if (Math.abs(z - Z0) < 0.08 && onBoard(x, y)) walkTo(x, y);
}
Input.onKeyDown(onPress, 'primary');

function look(x: number, y: number, z: number, lx: number, ly: number) {
  if (!CAM) return;
  CAM.transform.position = W(x, y, z);
  CAM.transform.rotation = Quat.makeRotation(Z, Math.atan2(-(lx - x), ly - y));
}
look(0, -18, Z0 + EYE, 0, 8);

// 확인용 시점(n 다음 · b 이전): 광장 남쪽 → 현실 교정 → 가상 구역 → 개념관 앞 → 사례관 앞 → 전망대 앞
const VIEWS = [[0, -18, Z0 + EYE, 0, 8], [-10, -6, Z0 + EYE, -25, 8], [10, -6, Z0 + EYE, 27, 4], [0, 2, Z0 + EYE, 0, 14], [-21, -3, Z0 + EYE, -25, 9], [22, -24, Z0 + EYE, 27, -11]];
let vi = 0;
const goView = () => { const v = VIEWS[vi]; look(v[0], v[1], v[2], v[3], v[4]); };
Input.onKeyDown(() => { vi = (vi + 1) % VIEWS.length; goView(); }, 'n');
Input.onKeyDown(() => { vi = (vi + VIEWS.length - 1) % VIEWS.length; goView(); }, 'b');

info('가상융합교육 캠퍼스', '가상융합교육을 익히는 연수용 캠퍼스예요. 왼쪽은 현실 교정, 오른쪽은 가상 구역, 가운데는 융합 광장이에요.\n리니와 건물을 눌러 보세요. 바닥을 누르면 그쪽으로 걸어가요.\n(Delightex Edu 고품질판 v1 · 가안)');
