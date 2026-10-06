# 한글학교 로비 중계 서버 (relay)

프랑스 한글학교 로비(`/france/`)의 멀티플레이 중계 서버입니다. 같은 방(로비·교실)에 있는 사람들의 위치·방향·동작만 초당 10번 묶어 주고받고, 아무것도 저장하지 않습니다.

- 주소: `/health` (상태 JSON), `/ws` (WebSocket)
- 환경 변수: `PORT`(호스팅이 줌), `MP_ORIGINS`(허용할 페이지 주소를 더할 때, 쉼표 구분), `MAX_ROOM`(방 최대 인원, 기본 50)
- 로컬 시험: `node server.js` → `ws://127.0.0.1:8787/ws`

## 온라인에 올리기 (Render, 무료)
1. https://dashboard.render.com 에 GitHub 계정으로 로그인
2. New → Blueprint → 저장소 `humanteacher89-cell/my-3d-world` 선택 → 저장소 맨 위 `render.yaml`을 읽어 서비스 `hangul-lobby-relay`를 만듭니다 → Apply
3. 만들어진 서비스 주소(예: `https://hangul-lobby-relay.onrender.com`)를 `france/relay.json`에 적으면 로비가 그 서버에 붙습니다.

무료 요금제는 15분 동안 아무도 없으면 잠들고, 다시 찾으면 약 1분 안에 깨어납니다. `.github/workflows/keepalive.yml`이 10분마다 `/health`를 두드려 깨어 있게 합니다.
