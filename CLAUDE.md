# my-3d-world — 휴먼쌤 월드 · 프랑스 한글학교 로비 (GitHub Pages 배포본)

이 저장소는 그대로 GitHub Pages로 공개된다: https://humanteacher89-cell.github.io/my-3d-world/
클라우드 세션(claude.ai/code)이나 다른 곳에서 이 저장소를 열어 고칠 때 아래를 따른다.
사용자는 **휴먼쌤**이라고 부른다. 답은 한국어로, 휴대폰에서 읽기 쉽게 결과부터 짧게 쓴다. 이모지는 쓰지 않는다.

## 무엇이 어디에
| 경로 | 무엇 | 공개 주소 |
|---|---|---|
| `index.html` | `world1/?plaza=1`로 넘기는 시작 페이지 | https://humanteacher89-cell.github.io/my-3d-world/ |
| `world1/` | 휴먼쌤 월드: 월드 1 「휴먼쌤이 누구인가」 + 리니를 만나는 광장(three.js). `engine.js`(엔진) · `world1.config.js`(글·대사·설정) · `audio.js`(소리 합성) · `index.html`(페이지) · `assets/`(3D 모델 GLB) · `mp.json`(멀티플레이 중계소 주소, PC가 자동으로 씀 — 손대지 않는다) | …/world1/ |
| `france/` | 프랑스 한글학교 로비: 2.5D 지도 + 학교 교실 + 온라인 동시접속. `lobby.js`(엔진) · `lobby.config.js`(글·학교·교실 내용) · `room.js`(교실) · `france-map.js`(지도 좌표, 도구가 만든 파일 — 손대지 않는다) · `relay.json`(온라인 서버 주소) · `index.html`(페이지) | …/france/ |
| `france/admin/` | 로비 관리자 페이지(로그인, 학교 홈페이지·교실 글·사진첩·영상·링크 관리). `index.html` · `admin.js` · `admin.css` | …/france/admin/ |
| `relay-cf/` | Cloudflare Worker: 온라인 동시접속 중계(`src/index.js`) + 관리자 내용 저장소(`src/content.js`, Durable Object SQLite) · `wrangler.jsonc` | https://hangul-lobby-relay.humanteacher89.workers.dev |
| `relay/` | Node 판 중계 서버(다른 호스팅용 대안, 지금은 쓰지 않음) | — |

## 배포가 되는 방식
- `main`에 들어가면 GitHub Pages가 1~2분 안에 반영한다(CDN 캐시 최대 10분. 확인할 때는 주소 뒤에 `?t=숫자`를 붙인다).
- `relay-cf/`가 바뀐 커밋이 `main`에 들어가면 Cloudflare Workers Builds가 자동으로 다시 배포한다(몇 분). 빌드 기록은 Cloudflare 대시보드에서만 볼 수 있다(휴먼쌤).
- 그래서 **`main`에 바로 올리지 말고 새 브랜치 + PR**로 올린다. 합치는 것은 휴먼쌤이 GitHub에서 한다. PR 설명은 한국어로 "무엇을 · 왜 · 어떻게 확인했는지 · 휴먼쌤이 폰에서 볼 곳".

## 지킬 것
- 비밀을 커밋하지 않는다: 관리자 설정 코드, 비밀번호, API 토큰. `wrangler.jsonc`의 `ADMIN_SETUP_HASH`는 해시뿐이라 괜찮다.
- 글 파일은 모두 UTF-8(한글). 한 줄에 문장이 여러 개인 JS가 많으니 줄 중간에 `//` 주석을 넣지 않는다(`/* */`만).
- `world1/mp.json` · `france/france-map.js` · `assets/`의 GLB는 손대지 않는다.
- 글·대사·학교 정보는 `*.config.js`에만 있다. 사실(학교 이름·주소, 휴먼쌤 소개)은 지어내지 않고, 모르면 `[확인 전]`으로 표시하고 휴먼쌤에게 묻는다.
- 큰 구조 변경(엔진 교체, 폴더 이동, 파일 이름 바꾸기)은 먼저 휴먼쌤에게 묻는다.
- 원본 작업 폴더는 휴먼쌤 PC에도 있다. PC 쪽은 작업 전에 이 저장소를 먼저 받아오므로, 여기서 고친 것은 `main`에 합쳐지기만 하면 된다.

## 지금 상태와 남은 일 (인수인계 — 작업을 마칠 때 이 절을 고쳐 같은 PR에 넣는다)
PC 쪽 작업 기록은 이 저장소 밖에 있다. 클라우드 세션과 PC가 서로 이어받는 곳은 **이 절 하나**다. 시작할 때 읽고, 끝낼 때 '마지막 작업'과 '남은 일'을 고친다(공개 파일이니 비밀·개인 정보는 쓰지 않는다).
- 마지막 작업(2026-10-06, PC): 휴먼쌤 월드 광장의 섬 출발점에서 **'프랑스 한글학교 섬'**으로 가는 길을 열었다. 출발점 선택지 → 승강장 바닥이 떠올라 방문자·리니를 태우고 가운데 큰 섬으로 약 10초 비행 → 섬의 환영 문('프랑스 한글학교 · Bienvenue · 어서 오세요')·'한' 깃발·프랑스 국기·작은 에펠탑·한글학교 건물 → 리니 환영 두 줄 → '프랑스 한글학교 로비로 이동합니다' → `../france/`. 설정은 `world1/world1.config.js`의 `plaza.franceIsland`, 엔진은 `world1/engine.js`의 `buildFrIsland`·`startFly`·`flyStep`·`landFr`·`goFrance`·`backFromFr`.
- 휴먼쌤 월드 남은 일: 섬 문구·리니 대사는 모두 `[확인 전]`(휴먼쌤이 고칠 문장을 주면 config만 고친다). 섬으로 가는 수단은 미정(지금은 떠오르는 승강장 바닥, 배·열기구 등 시안을 먼저 보여 드리고 정함). 나머지 두 섬은 '준비 중'. 실제 폰 확인 전.
- 프랑스 로비 남은 일: 학교 17곳(`lobby.config.js` schools), 교실 17곳의 글은 `[예시]` — 휴먼쌤이 주는 글·사진·영상·교장 호칭으로 `rooms.<학교 id>`를 바꾼다(관리자 페이지로 휴먼쌤이 직접 넣을 수도 있다). 지도 작은 고칠 거리 몇 건은 나중. 실제 폰 두 대 동시접속 확인 전.

## 확인하는 법 (클라우드 환경에는 브라우저가 없을 수 있다)
- 문법: 바뀐 JS마다 `node --check 파일`(node가 있을 때).
- 페이지는 정적 파일이다. `python3 -m http.server 8000`으로 띄워 `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/france/`처럼 200인지 본다. 3D 화면·폰 조작은 휴먼쌤이 폰으로 확인한다.
- 공개 주소(`*.github.io`, `*.workers.dev`)는 환경의 네트워크 설정이 허용할 때만 열린다. 막혀 있으면 PR 설명에 "합친 뒤 볼 곳"을 적는다.
- Worker(`relay-cf/`)는 배포 뒤 `/health`(ok)와 `/api/admin/state`로 본다.
