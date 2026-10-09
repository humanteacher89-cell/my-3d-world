# my-3d-world — 휴먼쌤 월드 (GitHub Pages 배포본)

이 저장소는 그대로 GitHub Pages로 공개된다: https://humanteacher89-cell.github.io/my-3d-world/
프랑스 한글학교 로비는 2026-10-07에 다른 저장소 `hangul-france`(https://humanteacher89-cell.github.io/hangul-france/)로 옮겼다(휴먼쌤 결정). 여기 `france/`에는 그리로 넘기는 페이지만 남아 있다.
클라우드 세션(claude.ai/code)이나 다른 곳에서 이 저장소를 열어 고칠 때 아래를 따른다.
사용자는 **휴먼쌤**이라고 부른다. 답은 한국어로, 휴대폰에서 읽기 쉽게 결과부터 짧게 쓴다. 이모지는 쓰지 않는다.

## 무엇이 어디에
| 경로 | 무엇 | 공개 주소 |
|---|---|---|
| `index.html` | `world1/?plaza=1`로 넘기는 시작 페이지 | https://humanteacher89-cell.github.io/my-3d-world/ |
| `world1/` | 휴먼쌤 월드: 월드 1 「휴먼쌤이 누구인가」 + 리니를 만나는 광장(three.js). `engine.js`(엔진) · `world1.config.js`(글·대사·설정) · `audio.js`(소리 합성) · `index.html`(페이지) · `assets/`(3D 모델 GLB) · `mp.json`(멀티플레이 중계소 주소, PC가 자동으로 씀 — 손대지 않는다) | …/world1/ |
| `xr/` | **가상융합교육 지도**(두 번째 섬, 2026-10-07): 캠퍼스 2.5D 로비 + 관 내부. 프랑스 로비 엔진을 복사해 고친 것. `lobby.js`(로비 엔진) · `room.js`(관 내부 방) · `lobby.config.js`(글·관·방 설정) · `campus-map.js`(캠퍼스 판) · `relay.json`(온라인 서버 주소 — 손대지 않는다) · `index.html` · `design/`(관 내부 그림 시안과 **설계 `design/README.md`**) | …/xr/ |
| `france/` | 옛 주소(`…/my-3d-world/france/`, `…/france/admin/`)로 들어온 사람을 새 저장소 `hangul-france`로 넘기는 페이지 두 장(`index.html` · `admin/index.html`)뿐. 로비 코드·서버 코드는 여기 없다 | → https://humanteacher89-cell.github.io/hangul-france/ |

## 배포가 되는 방식
- `main`에 들어가면 GitHub Pages가 1~2분 안에 반영한다(CDN 캐시 최대 10분. 확인할 때는 주소 뒤에 `?t=숫자`를 붙인다).
- 온라인 서버(Cloudflare Worker `hangul-lobby-relay`)는 `hangul-france` 저장소의 `relay-cf/`에서 배포한다. 이 저장소에는 서버 코드가 없다.
- 그래서 **`main`에 바로 올리지 말고 새 브랜치 + PR**로 올린다. 합치는 것은 휴먼쌤이 GitHub에서 한다. PR 설명은 한국어로 "무엇을 · 왜 · 어떻게 확인했는지 · 휴먼쌤이 폰에서 볼 곳".

## 지킬 것
- 비밀을 커밋하지 않는다: 비밀번호, API 토큰.
- 글 파일은 모두 UTF-8(한글). 한 줄에 문장이 여러 개인 JS가 많으니 줄 중간에 `//` 주석을 넣지 않는다(`/* */`만).
- `world1/mp.json` · `assets/`의 GLB · `xr/relay.json`은 손대지 않는다.
- `xr/index.html`은 PC에서 `<head>`를 붙여 만든 파일이다. 고쳐도 되지만 `<body>`와 `</body>` 줄은 그대로 둔다(PC가 그 사이를 떼어 원본으로 되돌린다).
- 글·대사는 `world1/world1.config.js`에만 있다. 사실(휴먼쌤 소개 등)은 지어내지 않고, 모르면 `[확인 전]`으로 표시하고 휴먼쌤에게 묻는다.
- 큰 구조 변경(엔진 교체, 폴더 이동, 파일 이름 바꾸기)은 먼저 휴먼쌤에게 묻는다.
- 원본 작업 폴더는 휴먼쌤 PC에도 있다. PC 쪽은 작업 전에 이 저장소를 먼저 받아오므로, 여기서 고친 것은 `main`에 합쳐지기만 하면 된다.

## 지금 상태와 남은 일 (인수인계 — 작업을 마칠 때 이 절을 고쳐 같은 PR에 넣는다)
PC 쪽 작업 기록은 이 저장소 밖에 있다. 클라우드 세션과 PC가 서로 이어받는 곳은 **이 절 하나**다. 시작할 때 읽고, 끝낼 때 '마지막 작업'과 '남은 일'을 고친다(공개 파일이니 비밀·개인 정보는 쓰지 않는다).
- **관리자 계정 분리 (2026-10-09 밤, PC)**: `xr/admin/`은 프랑스 로비 관리자와 같은 서버를 쓰지만 **계정·로그인은 따로**다(휴먼쌤 결정). 관리 요청마다 `?map=xr`(admin.js의 `A()`), 서버(`hangul-france` 저장소 `relay-cf/src/content.js`)는 영역(realm)별로 계정을 나누고 다른 영역의 토큰은 401. 첫 관리자는 `ADMIN_SETUP_HASH_XR`의 1회용 설정 코드로 만든다(코드는 저장소 밖). 로그인 토큰 localStorage 키 `xrLobbyAdmin`. **남은 일**: 휴먼쌤이 xr 관리자 '처음 설정'(아이디·비밀번호) → 글 채우기.
- **연수 수첩·수료증 + 관리자 페이지 (2026-10-09 저녁, PC)**: ① 오른쪽 위 '연수 수첩 n/6' 버튼(`xr/lobby.js` PASS 절, 글은 `lobby.config.js` `text.pass*`·`cert*`, 도장 색·글자는 `schools[].stampMark/stampColor`). 도장 6개를 다 모으면(room.js `stamp()` → `core.onStamp`) 수첩이 열리며 수료증(canvas 1400×1000, '그림으로 저장'). 도장은 여전히 이 기기 localStorage `xrStamps`. ② **관리자 페이지 `xr/admin/`**(https://humanteacher89-cell.github.io/my-3d-world/xr/admin/): 프랑스 로비 관리자와 같은 서버(`hangul-france` 저장소 `relay-cf/src/content.js`, map `xr`), 계정은 따로(위 10-09 밤 항목). 관을 고르면 `rooms.<관>`의 글이 모두 칸으로(자동 폼, `LABEL` 표가 한글 이름표), 고친 칸만 `{ text: { "경로": "글" } }`로 저장(`PUT /api/admin/hall?map=xr&id=<관>`). 수업 사례관은 교과마다 책·TV(유튜브)·사진첩(사진 올리기)·링크(`media.<교과 id>`). 로비는 `lobby.config.js` `contentMap: 'xr'` → `lobby.js` `applyHalls()`가 `/api/content?map=xr`의 `halls.<관>.text`를 설정의 같은 자리(문자열·글 배열)에 덮고, `media`는 `rooms.cases.subjects[i].book/tv/album`에 넣는다. 서버 쪽 한도: 글 칸 300개·4,000자, 사진 교과당 30장. **남은 일**: 휴먼쌤 실제 폰 점검, 관리자 페이지로 실제 글·사례 채우기(휴먼쌤), 공방 전시 벽·전망대 메모판의 서버 공유, 모든 글 `[확인 전]` 확정. 새 관을 더하면 관리자 폼은 자동으로 따라온다(`HIDE` 집합에 든 키는 안 보임).
- **관 6곳 내부 모두 끝 (2026-10-09, PC)**: 개념관 · 수업 사례관(클라우드, PR #1을 10-09 `main`에 합침) · 장비관 · 미래 전망대 · 제작 공방 · 안전·윤리 등대(PC, 휴먼쌤 "사례관 PR 합친 다음에 그냥 PC에서 나머지 관들 쭉쭉 진행해줘", "다되면 바로바로 올려서"). 관마다 끝나면 연수 수첩 도장(localStorage `xrStamps.<id>`). **남은 일**: 휴먼쌤 실제 폰 점검과 고칠 점, 연수 수첩 화면(도장 6개 → 수료), 사례관의 실제 수업 사례(휴먼쌤이 줌), 모든 글 `[확인 전]` 확정, 공방 전시 벽·전망대 메모판의 '다른 사람 것도 보기'(지금은 이 기기에만 저장, 서버 저장소 필요). 고칠 때는 `main`을 받아 그 관 블록 위에서 고친다. 관 코드는 `xr/room.js`에서 `/* ==== hall:<id> 시작 ==== */` ~ `끝` 블록 하나씩이고 `HALLS.<id> = [짓기, 매 화면]`으로 붙는다(10-09 PC가 고른 구조). 옛 지시(10-07): "이 5곳 내부는 클라우드 세션에서 진행하고 싶어." 설계·그림은 **`xr/design/README.md`**. 본보기는 개념관(`xr/room.js`의 `buildConcept`, `xr/lobby.config.js`의 `rooms.concept`)과 수업 사례관(`buildCases`, `rooms.cases`). 관 하나씩 PR 하나로, 끝날 때마다 이 절을 고친다. 아직 안 만든 관에 들어가면 '준비 중' 화면이 나온다.
- 마지막 작업(2026-10-07, 클라우드 세션): **수업 사례관(`cases`) 내부**. 시안 `xr/design/mockup-hall-cases.html` 꼴로 입구(서쪽)에서 동쪽으로 ① 칠판 앞 발판에서 교과 6개(국어·수학·과학·사회·영어·예체능) 중 고르기 → ② 가운데 무대가 그 교과 꾸밈으로 바뀜(칠판 버튼이 켜지고, 북벽 큰 그림·무대 바닥 색·소품 묶음이 바뀜. 국어 = 책장·떠 있는 글자, 수학 = 입체도형, 과학 = 실험대·홀로그램 행성, 사회 = 지구본·지도 탁자, 영어 = 알파벳 블록·말풍선, 예체능 = 이젤·피아노·북) → ③ 책(지도안)·TV(수업 영상)·사진첩(학생 결과물) 발판. 셋을 다 보면 연수 수첩 도장(`xrStamps.cases`). 엔진 `room.js`의 `buildCases`·`updateCases`, 설정 `lobby.config.js`의 `rooms.cases`. 사례 내용은 휴먼쌤이 줄 것이라 지금은 교과 공통 틀(`caseTemplate`: "들어갈 내용: 학년과 단원 / 수업 목표 / 쓴 도구 / 수업 흐름 / 학생 반응")과 빈 액자·예시 딱지만 있다. 사례가 오면 `rooms.cases.subjects[i]`에 `book`(title·text)·`tv`(video = 유튜브 embed 주소)·`album`(photos·captions)을 적으면 그 교과만 틀 대신 나온다. 글은 모두 `[확인 전]`. 헤드리스 크롬(PC 1280×720, 폰 375×812)으로 들어가기·교과 바꾸기·세 팝업·도장까지 확인했고, 실제 폰 확인은 아직.
- 그 전(2026-10-07 오후, PC): **가상융합교육 지도 첫 공개**. 월드 1 광장 섬 출발점에 두 번째 섬 '가상융합교육 섬으로'(설정 `plaza.xrIsland`, 엔진 `buildXrIsland`, 비행 함수는 섬 둘로 일반화 `ISL`·`startFly(key)`) → 도착 → `xr/`. `xr/` = 캠퍼스 판(76×46칸, 현실 교정 · 융합 광장 · 가상 구역) + 관 6곳 건물 + 개념관 내부(현실 → AR → MR → VR 네 칸, 리니 안내, 용어 카드 4장, 퀴즈 3문제, 끝나면 '연수 수첩' 도장 = localStorage `xrStamps`). 글은 모두 `[확인 전]`. 온라인 방 `xr:lobby`·`xr:<관 id>`(프랑스 로비와 같은 서버. 서버는 `*.github.io` 출처만 받아 로컬에서는 혼자 보기). 남은 것: 관 내부(위), 연수 수첩 화면(도장 6개 → 수료), 실제 폰 확인.
- 그 전(2026-10-07 오전, PC): **프랑스 한글학교 로비를 저장소 `hangul-france`로 분리**(휴먼쌤 결정). 이 저장소에서 `france/`의 로비 코드와 `relay-cf/`·`relay/`를 빼고, `france/`에는 새 주소로 넘기는 페이지 두 장만 남겼다. 월드 1의 프랑스 섬 링크(`world1/world1.config.js`의 `plaza.franceIsland.url`·`urlAbs`)는 새 주소 https://humanteacher89-cell.github.io/hangul-france/ 로 바꿨다. 프랑스 로비·서버 일은 그쪽 저장소의 `CLAUDE.md`를 본다.
- 그 전(2026-10-06, PC): 휴먼쌤 월드 광장의 섬 출발점에서 **'프랑스 한글학교 섬'**으로 가는 길(승강장 바닥이 떠올라 약 10초 비행 → 섬 도착 → 프랑스 로비). 설정 `world1/world1.config.js`의 `plaza.franceIsland`, 엔진 `world1/engine.js`의 `buildFrIsland`·`startFly`·`flyStep`·`landFr`·`goFrance`·`backFromFr`.
- 휴먼쌤 월드 남은 일: 섬 문구·리니 대사는 모두 `[확인 전]`(휴먼쌤이 고칠 문장을 주면 config만 고친다). 섬으로 가는 수단은 미정(지금은 떠오르는 승강장 바닥). 두 번째 섬 '가상융합교육'(가칭)은 위 `xr/`. 세 번째 섬은 '준비 중'. 실제 폰 확인 전.
- 프랑스 로비 남은 일은 `hangul-france` 저장소의 `CLAUDE.md`에 있다.

## 확인하는 법 (클라우드 환경에는 브라우저가 없을 수 있다)
- 문법: 바뀐 JS마다 `node --check 파일`(node가 있을 때).
- 페이지는 정적 파일이다. `python3 -m http.server 8000`으로 띄워 `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/world1/`처럼 200인지 본다. 3D 화면·폰 조작은 휴먼쌤이 폰으로 확인한다.
- 공개 주소(`*.github.io`)는 환경의 네트워크 설정이 허용할 때만 열린다. 막혀 있으면 PR 설명에 "합친 뒤 볼 곳"을 적는다.
