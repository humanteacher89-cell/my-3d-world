/* 관 내부 확인 도구 (클라우드 세션용, 2026-10-07). 휴먼쌤 폰 확인 전에 헤드리스 크롬으로 들어가 보고 화면을 찍는다.
   쓰는 법(저장소 맨 위에서):
     1) python3 -m http.server 8765 &
     2) three.js 받기(jsDelivr가 막힌 환경 대비): mkdir -p /tmp/three && (cd /tmp/three && npm pack three@0.147.0 && tar xzf three-0.147.0.tgz)
     3) node xr/design/check-hall.js '수업 사례관' pc      (폰 세로: ph)
        선택: 4번째 인자 = 누를 화면 좌표와 그때 뜰 아래 카드 이름 [["교과 고르기",433,398],["책",947,420]]
   결과: /tmp/hall-<pc|ph>-*.png 화면과 페이지 오류 목록. 화면은 Read 도구로 열어 본다.
   주의: 카메라가 나를 따라가므로, 한 번 걸은 뒤에는 발판의 화면 좌표가 바뀐다. 다음 좌표는 직전 화면을 보고 정한다. */
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright';
const { chromium } = require(PW);
const HALL = process.argv[2] || '수업 사례관', MODE = process.argv[3] || 'pc';
const STEPS = JSON.parse(process.argv[4] || '[]');
const [W, H] = MODE === 'ph' ? [375, 812] : [1280, 720];
const THREE_FILE = process.env.THREE_FILE || '/tmp/three/package/build/three.min.js';
const OUT = n => `/tmp/hall-${MODE}-${n}.png`;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: MODE === 'ph', hasTouch: MODE === 'ph' });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js', r => r.fulfill({ path: THREE_FILE, contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://127.0.0.1:8765/xr/?mp=0', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  if (await p.isVisible('#nameGo')) await p.click('#nameGo');
  await p.click('#btnList'); await p.waitForTimeout(300);
  await p.locator('#listBody button.item', { hasText: HALL }).click();
  await p.waitForTimeout(6000);
  await p.locator('#card button').filter({ hasText: '입장하기' }).first().click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT('0-enter') });
  const tap = (x, y) => MODE === 'ph' ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);
  let i = 1;
  for (const [name, x, y] of STEPS) {
    await tap(x, y);
    let ok = false;
    for (let k = 0; k < 100 && !ok; k++) {
      const t = await p.locator('#card').innerText().catch(() => '');
      if (await p.isVisible('#card') && t.includes(name)) { await p.locator('#card button').last().click(); ok = true; } else await p.waitForTimeout(150);
    }
    if (!ok) errs.push('발판 카드가 안 뜸: ' + name);
    await p.waitForTimeout(900);
    await p.screenshot({ path: OUT(i++ + '-' + name) });
    if (await p.isVisible('#popClose')) { await p.click('#popClose'); await p.waitForTimeout(800); }
  }
  errs.push('xrStamps = ' + await p.evaluate(() => localStorage.getItem('xrStamps')));
  console.log(errs.join('\n'));
  await b.close();
})();
