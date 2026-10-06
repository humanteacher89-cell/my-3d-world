# 한글학교 로비 중계 서버 — Cloudflare 판 (relay-cf)

프랑스 한글학교 로비(`/france/`)의 멀티플레이 중계 서버입니다. 같은 방(로비·교실) 사람들의 위치·방향·동작만 초당 10번 묶어 주고받고, 아무것도 저장하지 않습니다. Cloudflare Workers + Durable Objects로 돌며 **무료 플랜**(카드 불필요, 잠들지 않음)에서 됩니다.

- 주소: `/health` (상태 JSON), `/ws?room=<방 이름>` (WebSocket)
- 무료 한도: 하루 요청 100,000개. 받는 WebSocket 메시지 20개가 요청 1개로 세어지므로 하루 약 200만 메시지. 로비는 한 사람이 움직일 때 초당 6번 보내므로, 50명이 쉬지 않고 움직이면 약 1시간 50분, 25명 수업이면 약 3시간 40분 분량입니다. 넘으면 그날은 '혼자 보기'가 되고 한국 시간 09:00에 초기화됩니다. 부족하면 Workers Paid(월 5달러)로 올리면 됩니다.

## 올리기 (Cloudflare 대시보드, 명령어 없음)
1. https://dash.cloudflare.com 에서 계정 만들기(이메일만, 카드 없음) → 로그인
2. 왼쪽 **Compute (Workers)** → **Create** → **Import a repository** → GitHub 연결 → `humanteacher89-cell/my-3d-world` 선택
3. 설정: Project name `hangul-lobby-relay`, **Root directory** `relay-cf`, Build command 비움, Deploy command `npx wrangler deploy` (기본값) → **Deploy**
4. 1~2분 뒤 주소가 생깁니다(예: `https://hangul-lobby-relay.<계정 이름>.workers.dev`). `/health`를 열어 `{"ok":true,...}`가 보이면 완료
5. 그 주소를 `france/relay.json`의 `relay`(`wss://…/ws`)와 `health`(`https://…/health`)에 적어 올리면 로비가 붙습니다

같은 저장소의 `relay-cf` 폴더가 바뀌면 자동으로 다시 올라갑니다(Workers Builds).

## 다른 호스팅을 쓰고 싶을 때
Node 판 `relay/server.js`(ws 패키지)는 Railway(월 5달러)·Fly.io(파리, 월 2.5~4달러, 카드 필요)에 그대로 올릴 수 있습니다. 비교는 `XR자료제작팀장\out\프랑스로비\자료\온라인서버-호스팅-비교-20261006.md`.
