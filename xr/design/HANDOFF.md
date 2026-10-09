# 관 내부 만들기 — 다음 클라우드 세션 인수인계 (2026-10-07)

> **2026-10-09 바뀜**: 휴먼쌤 지시로 남은 관 4곳(devices·safety·future·studio)은 **PC에서 만들어 바로 `main`에 올린다.** 수업 사례관 PR #1은 `main`에 합쳤다. 클라우드 세션은 이 4곳을 새로 만들지 말고, 고칠 일이 있으면 `main`을 받아 이미 있는 관 위에서 고친다. 관 고르는 자리는 `room.js`의 `HALLS` 표(`HALLS.<kind> = [짓기, 매 화면]`), 관 코드는 `/* ==== hall:<id> 시작 ==== */` 블록 하나씩. 아래 1절 표는 10-07 기준이다(최신은 맨 위 `CLAUDE.md` 인수인계 절).

새 클라우드 세션은 이 문서부터 읽는다. 설계와 그림 시안은 같은 폴더의 `README.md`, 저장소 규칙은 맨 위 `CLAUDE.md`.

## 1. 지금 어디까지 왔나
| 관 id | 관 | 상태 |
|---|---|---|
| `concept` | 개념관 | 끝남(PC, 10-07 공개) |
| `cases` | 수업 사례관 | **만듦 → 휴먼쌤 점검 대기.** PR https://github.com/humanteacher89-cell/my-3d-world/pull/1 (브랜치 `claude/hopeful-brahmagupta-q30n45`) |
| `devices` | 장비관 | **다음 차례.** 휴먼쌤이 사례관 점검을 마친 뒤 시작 |
| `safety` | 안전·윤리 등대 | 그다음 |
| `future` | 미래 전망대 | 그다음 |
| `studio` | 제작 공방 | 마지막(전시 벽은 서버 저장소가 필요) |

휴먼쌤 방식(10-07): **관 하나를 다 만들고 세션을 닫는다 → 휴먼쌤이 폰으로 점검한다 → 다음 관은 새 클라우드 세션 창에서 한다.** 한 세션에서 관 두 개를 하지 않는다.

## 2. 새 세션이 시작할 때
1. 사례관 PR이 어떻게 됐는지 본다.
   - 합쳐졌으면: `main`에서 새로 시작한다(`git fetch origin main && git checkout -B <세션 브랜치> origin/main`).
   - 아직 열려 있고 휴먼쌤이 고칠 점을 남겼으면: **다음 관보다 그것을 먼저** 같은 PR에서 고친다.
   - 열려 있는데 말이 없으면: 휴먼쌤에게 점검했는지 묻는다. 사례관 위에 다음 관을 쌓지 않는다(같은 `room.js`를 고치므로 충돌한다).
2. `README.md`의 표에서 다음 관 줄과 그림 시안(`mockup-hall-<id>.html`, `-pc-small.jpg`)을 본다. jpg는 Read 도구로 열린다.
3. 본보기 두 개를 읽는다.
   - 개념관: `room.js`의 `buildConcept`·`updateConcept`, 설정 `rooms.concept`(퀴즈 끝에 도장).
   - 수업 사례관: `room.js`의 `buildCases`·`updateCases`, 설정 `rooms.cases`(고르기 → 바뀌는 무대 → 팝업 셋 → 도장).

## 3. 관 하나를 붙이는 자리 (사례관에서 한 그대로)
- `xr/room.js`
  - `buildXxx(school, cfg)` 함수: 방 하나를 짓고 `R.built = { school, cfg, world, npc: null, spots, kind: 'xxx', anim: A }`를 돌려준다. `world`에는 `walk`·`camD`·`camClamp`·`spawn`이 있어야 한다.
  - `updateXxx(dt, me)` 함수: 매 화면 움직임.
  - `enter()`의 builder 고르는 한 줄과 `update()`의 분기 한 줄에 새 kind를 더한다.
- `xr/lobby.config.js`의 `rooms.<id>`: `kind`, `welcome`, `principal`(리니 대사), 발판 글, `stampId`. **`rooms`에 id가 생기면 로비가 '준비 중' 대신 바로 들여보낸다.**
- 다시 쓰는 것: `showCard`(아래 카드) · `showToast` · `openBook`/`openAlbum`/`openTV`(팝업) · `talkUI`(대화창 버튼) · `startPractice`(퀴즈·상황 고르기, `cfg.quiz`이면 끝날 때 도장) · `stamp(id)`(localStorage `xrStamps`).
- 방 크기는 사례관 기준 가로 30칸 × 세로 11칸, 카메라는 남쪽에서 북쪽을 본다. 입구 문은 서쪽 벽, 그 앞에 '지도로' 발판.
- 줄 중간 `//` 주석 금지(`/* */`만). 글은 모두 `[확인 전]`, 연령 같은 숫자와 사실은 지어내지 않는다.

## 4. 확인하는 법 (이 환경에서 실제로 된 방법)
클라우드 컨테이너는 jsDelivr(three.js)와 구글 글꼴이 막혀 있었다. npm 저장소와 미리 깔린 크롬(Playwright)은 된다.
```
python3 -m http.server 8765 &
mkdir -p /tmp/three && (cd /tmp/three && npm pack three@0.147.0 && tar xzf three-0.147.0.tgz)
node --check xr/room.js && node --check xr/lobby.config.js
node xr/design/check-hall.js '장비관' pc
node xr/design/check-hall.js '장비관' ph
node xr/design/check-hall.js '수업 사례관' pc '[["교과 고르기",433,398]]'
```
- 화면은 `/tmp/hall-pc-*.png`로 남는다. Read 도구로 열어 시안과 비교한다.
- 발판을 누르려면 화면 좌표가 필요하다. 먼저 들어간 화면을 찍고, 그 그림에서 발판 위치를 읽어 넣는다. 걸으면 카메라가 따라가므로 좌표가 바뀐다.
- 상태를 들여다보고 싶으면 잠깐 `window.__x = A;` 같은 줄을 넣고 확인한 뒤 **꼭 지운다**.
- 사례관에서 실제로 걸린 것: 위쪽 관 이름판이 화면 위 막대에 가려서 `camClamp`의 북쪽 보정을 -2.2에서 -2.9로 바꿨다.

## 5. 끝낼 때
1. `CLAUDE.md` 인수인계 절의 '다음 할 일'·'마지막 작업'과 이 문서 1절 표를 고친다.
2. `README.md` 표의 그 관 줄에 '끝남' 표시.
3. 커밋, 세션 브랜치로 push, PR(한국어: 무엇을 · 왜 · 어떻게 확인했는지 · 휴먼쌤이 폰에서 볼 곳). `main`에 바로 올리지 않는다.
4. 휴먼쌤에게 PR 주소와 '폰에서 볼 곳'을 짧게 알리고 세션을 닫는다.

## 6. 사례관에서 휴먼쌤이 나중에 줄 것
- 교과별 실제 수업 사례: `rooms.cases.subjects[i]`에 `book: { title, text }`, `tv: { title, video: '유튜브 embed 주소' }`, `album: { title, photos: [...], captions: [...] }`를 적으면 그 교과만 공통 틀 대신 나온다. 사진에 아이 얼굴은 넣지 않는다.
- 리니 대사와 안내 문구 확정(모두 `[확인 전]`).

## 7. 새 세션 창에 붙여 넣을 말
```
CLAUDE.md와 xr/design/HANDOFF.md 인수인계대로 다음 관을 만들어줘. 관 하나만 끝내고 PR 올린 뒤 인수인계 문서까지 고쳐놔.
```
