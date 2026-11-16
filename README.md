# 휴먼버스 (my-3d-world)

world.human-teacher.com — 휴먼버스(맨 앞은 입구 '휴먼쌤의 교실' profile/)와 그 안의 방들. 옛 주소 humanssaem-world.pages.dev도 그대로 열린다. Cloudflare Pages 집 `humanssaem-world`.

## 올리는 길 (2026-11-16 주소 정리부터)
- **main에 들어가면 GitHub Actions가 올린다**: 묶음 만들기(`python scripts/build_site.py _site` — 저장소를 복사하고 옛 github.io 주소만 새 주소로) → 점검(`node scripts/check.mjs _site`, 방마다 입구가 하나라도 빠지면 안 올림) → Cloudflare Pages `humanssaem-world` → 실제 주소 확인(`scripts/verify.mjs`). 확인이 실패하면 앞 판으로 되돌린다.
- PC에만 있던 `tools/unity/cf-world/build_cf_world.py`는 이 저장소의 `scripts/build_site.py`로 옮겼다(결과가 공개판과 바이트까지 같음을 11-16에 확인). 묶음에서 빼는 것: .git · .github · scripts · design · CLAUDE.md · README.md · push-github.bat 등.
- 창은 자기 작업 가지에서 고치고, 휴먼쌤 "올려" 뒤 main에 합친다. GitHub이 막히면 PC에서 같은 차례로 `wrangler pages deploy _site --project-name humanssaem-world --branch main`.

## 고장 났을 때
1. Cloudflare 화면 → Workers & Pages → humanssaem-world → Deployments → 앞 판의 … → Rollback(1분). 또는 GitHub → Actions → 되돌리기 → Run workflow.
2. GitHub에서 문제 생긴 기록을 Revert(5분).
3. PC 창에 "휴먼버스 되돌려"(10분).