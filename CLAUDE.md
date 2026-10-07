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
| `france/` | 옛 주소(`…/my-3d-world/france/`, `…/france/admin/`)로 들어온 사람을 새 저장소 `hangul-france`로 넘기는 페이지 두 장(`index.html` · `admin/index.html`)뿐. 로비 코드·서버 코드는 여기 없다 | → https://humanteacher89-cell.github.io/hangul-france/ |

## 배포가 되는 방식
- `main`에 들어가면 GitHub Pages가 1~2분 안에 반영한다(CDN 캐시 최대 10분. 확인할 때는 주소 뒤에 `?t=숫자`를 붙인다).
- 온라인 서버(Cloudflare Worker `hangul-lobby-relay`)는 `hangul-france` 저장소의 `relay-cf/`에서 배포한다. 이 저장소에는 서버 코드가 없다.
- 그래서 **`main`에 바로 올리지 말고 새 브랜치 + PR**로 올린다. 합치는 것은 휴먼쌤이 GitHub에서 한다. PR 설명은 한국어로 "무엇을 · 왜 · 어떻게 확인했는지 · 휴먼쌤이 폰에서 볼 곳".

## 지킬 것
- 비밀을 커밋하지 않는다: 비밀번호, API 토큰.
- 글 파일은 모두 UTF-8(한글). 한 줄에 문장이 여러 개인 JS가 많으니 줄 중간에 `//` 주석을 넣지 않는다(`/* */`만).
- `world1/mp.json` · `assets/`의 GLB는 손대지 않는다.
- 글·대사는 `world1/world1.config.js`에만 있다. 사실(휴먼쌤 소개 등)은 지어내지 않고, 모르면 `[확인 전]`으로 표시하고 휴먼쌤에게 묻는다.
- 큰 구조 변경(엔진 교체, 폴더 이동, 파일 이름 바꾸기)은 먼저 휴먼쌤에게 묻는다.
- 원본 작업 폴더는 휴먼쌤 PC에도 있다. PC 쪽은 작업 전에 이 저장소를 먼저 받아오므로, 여기서 고친 것은 `main`에 합쳐지기만 하면 된다.

## 지금 상태와 남은 일 (인수인계 — 작업을 마칠 때 이 절을 고쳐 같은 PR에 넣는다)
PC 쪽 작업 기록은 이 저장소 밖에 있다. 클라우드 세션과 PC가 서로 이어받는 곳은 **이 절 하나**다. 시작할 때 읽고, 끝낼 때 '마지막 작업'과 '남은 일'을 고친다(공개 파일이니 비밀·개인 정보는 쓰지 않는다).
- 마지막 작업(2026-10-07, PC): **프랑스 한글학교 로비를 저장소 `hangul-france`로 분리**(휴먼쌤 결정). 이 저장소에서 `france/`의 로비 코드와 `relay-cf/`·`relay/`를 빼고, `france/`에는 새 주소로 넘기는 페이지 두 장만 남겼다. 월드 1의 프랑스 섬 링크(`world1/world1.config.js`의 `plaza.franceIsland.url`·`urlAbs`)는 새 주소 https://humanteacher89-cell.github.io/hangul-france/ 로 바꿨다. 프랑스 로비·서버 일은 그쪽 저장소의 `CLAUDE.md`를 본다.
- 그 전(2026-10-06, PC): 휴먼쌤 월드 광장의 섬 출발점에서 **'프랑스 한글학교 섬'**으로 가는 길(승강장 바닥이 떠올라 약 10초 비행 → 섬 도착 → 프랑스 로비). 설정 `world1/world1.config.js`의 `plaza.franceIsland`, 엔진 `world1/engine.js`의 `buildFrIsland`·`startFly`·`flyStep`·`landFr`·`goFrance`·`backFromFr`.
- 휴먼쌤 월드 남은 일: 섬 문구·리니 대사는 모두 `[확인 전]`(휴먼쌤이 고칠 문장을 주면 config만 고친다). 섬으로 가는 수단은 미정(지금은 떠오르는 승강장 바닥). 두 번째 섬은 **'가상융합교육'(가칭)** — 들어가면 프랑스 로비처럼 새 2.5D 지도('가상융합교육 지도', 연수 자료: 뜻·장비 등, 미래적 분위기)가 나온다. 지도 컨셉 시안을 PC에서 만들어 휴먼쌤이 검토 중(저장소에는 아직 없음). 승인되면 `world1`에 섬 + 새 폴더(예: `xr/`)에 로비를 만든다. 세 번째 섬은 '준비 중'. 실제 폰 확인 전.
- 프랑스 로비 남은 일은 `hangul-france` 저장소의 `CLAUDE.md`에 있다.

## 확인하는 법 (클라우드 환경에는 브라우저가 없을 수 있다)
- 문법: 바뀐 JS마다 `node --check 파일`(node가 있을 때).
- 페이지는 정적 파일이다. `python3 -m http.server 8000`으로 띄워 `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/world1/`처럼 200인지 본다. 3D 화면·폰 조작은 휴먼쌤이 폰으로 확인한다.
- 공개 주소(`*.github.io`)는 환경의 네트워크 설정이 허용할 때만 열린다. 막혀 있으면 PR 설명에 "합친 뒤 볼 곳"을 적는다.
