/* 생각놀이섬 설정 — 글 · 수수께끼 · 대사는 모두 여기만 고친다(엔진 think.js는 그대로). 2026-11-01 단계 3.
   ACT = 휴먼쌤 ACT(질문하기 · 확인하기 · 실천하기). 구역: 질문의 숲(A) → 확인 다리(C) → 해 보기 공방(T) → 약속 언덕(끝).
   수수께끼는 riddles[] 다섯 개(꾸러미). 한 바퀴에 하나씩, 다시 하면 아직 안 푼 것부터. 공통 글은 riddle{}.
   사실 문장(도감 · 과학책 · 정리)은 연구부 근거대장 83~87번(2026-11-01, 써도 됨)과 맞춤. 대사 · 안내 글은 가안 [확인 전].
   리니는 질문의 숲에서 '일부러 틀린 대답'을 하고, 확인 다리에서 그 말을 확인한다(활동북 3주차 '로봇 리니 답 확인'과 같은 흐름).
   해 보기 공방 그림(exp.frames)은 SVG 글자열 셋: [처음, 첫 단추 뒤, 결과]. 가로 320 × 세로 160. */
(function () {
  const BG = '<rect x="0" y="0" width="320" height="160" rx="16" fill="#fff7e6"/><rect x="0" y="128" width="320" height="32" fill="#e9d8c0"/>';
  const svg = body => `<svg class="exp" viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">${BG}${body}</svg>`;
  const tag = (x, y, t, c = '#6d6888') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="800" fill="${c}">${t}</text>`;
  const big = (x, y, t, c = '#ec5f4b') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="16" font-weight="900" fill="${c}">${t}</text>`;
  /* 강낭콩: lean = 새싹 기울기(+ 창 쪽) */
  const bean = (lean, note) => svg(`<rect x="250" y="16" width="56" height="96" rx="6" fill="#bfe3ff" stroke="#8fbde0" stroke-width="4"/><line x1="278" y1="16" x2="278" y2="112" stroke="#8fbde0" stroke-width="3"/><circle cx="296" cy="30" r="9" fill="#ffd34d"/>
    <path d="M240 64 L150 92 M240 84 L150 104 M240 44 L150 80" stroke="#ffd34d" stroke-width="3" stroke-dasharray="6 6" opacity=".7"/>
    <g transform="translate(130 0)"><rect x="-26" y="112" width="52" height="30" rx="6" fill="#e9895f"/><rect x="-31" y="106" width="62" height="10" rx="4" fill="#d9764d"/>
    <path d="M0 108 C0 92 ${lean * 0.5} 74 ${lean} 60" fill="none" stroke="#5aa83a" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="${lean + 8 * Math.sign(lean)}" cy="56" rx="12" ry="6" transform="rotate(${lean > 0 ? -25 : 25} ${lean + 8 * Math.sign(lean)} 56)" fill="#7cc44f"/>
    <ellipse cx="${lean * 0.6 - 6 * Math.sign(lean)}" cy="70" rx="10" ry="5" transform="rotate(${lean > 0 ? 30 : -30} ${lean * 0.6} 70)" fill="#6bb845"/></g>${note ? big(70, 34, note) : ''}`);
  /* 자석: 클립(철) · 알루미늄 캔 · 플라스틱 자 */
  /* 말굽자석: 극(끝)이 아래를 향함, (x, y) = 극 끝의 가운데 */
  const magnet = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-14 -8 v-14 a14 14 0 0 1 28 0 v14" fill="none" stroke="#e8564a" stroke-width="10"/><rect x="-19" y="-10" width="10" height="10" fill="#4f7fd8"/><rect x="9" y="-10" width="10" height="10" fill="#d9dde6"/></g>`;
  const clip = (x, y) => `<path d="M${x - 10} ${y} h18 a4 4 0 0 0 0 -8 h-16 a3 3 0 0 0 0 6 h12" fill="none" stroke="#8a93a6" stroke-width="2.5" stroke-linecap="round"/>`;
  const can = `<rect x="168" y="86" width="26" height="42" rx="5" fill="#cfd6e2" stroke="#9aa5b8" stroke-width="2"/><rect x="168" y="96" width="26" height="12" fill="#8fc3ff"/>${tag(181, 106, 'AL', '#fff')}`;
  const ruler = `<rect x="226" y="118" width="64" height="10" rx="2" fill="#ffd34d" stroke="#e0b52a" stroke-width="1.5"/><path d="M234 118v4M242 118v6M250 118v4M258 118v6M266 118v4M274 118v6M282 118v4" stroke="#b58a12" stroke-width="1.2"/>`;
  const objLabels = tag(100, 148, '클립(철)') + tag(181, 148, '알루미늄 캔') + tag(258, 148, '플라스틱 자');
  const mag0 = svg(magnet(56, 54) + clip(100, 126) + can + ruler + objLabels);
  const mag1 = svg(magnet(100, 72) + clip(101, 80) + big(140, 52, '착!') + can + ruler + objLabels);
  const mag2 = svg(magnet(181, 74) + clip(100, 126) + can + ruler + big(246, 62, '안 붙어요', '#6d6888') + `<path d="M202 74 l14 -8" stroke="#6d6888" stroke-width="2"/>` + objLabels);
  /* 실 전화기 */
  const cup = (x, flip) => `<path d="M${x} 62 l${flip ? -18 : 18} -10 v40 l${flip ? 18 : -18} -10 z" fill="#ffffff" stroke="#c9b9a2" stroke-width="2"/>`;
  const head = (x, c) => `<circle cx="${x}" cy="72" r="16" fill="${c}"/><circle cx="${x}" cy="102" r="0" />`;
  const phone = (string, right) => svg(head(34, '#ffd7b5') + head(286, '#f6c7a0') + cup(54, false) + cup(266, true) + string + `<rect x="18" y="92" width="32" height="36" rx="8" fill="#7cb7e8"/><rect x="270" y="92" width="32" height="36" rx="8" fill="#f2a093"/>` + tag(70, 40, '“안녕?”', '#3a3550') + right);
  const ph0 = phone(`<path d="M72 72 Q160 76 248 72" fill="none" stroke="#8a6c52" stroke-width="2"/>`, '');
  const ph1 = phone(`<path d="M72 72 Q160 136 248 72" fill="none" stroke="#8a6c52" stroke-width="2"/>`, tag(250, 40, '“…녕?”', '#b0abc4') + big(160, 34, '작게 들려요', '#6d6888'));
  const ph2 = phone(`<path d="M72 72 L248 72" fill="none" stroke="#8a6c52" stroke-width="2.5"/><path d="M100 66 l8 12 l8 -12 l8 12 l8 -12 M180 66 l8 12 l8 -12 l8 12 l8 -12" fill="none" stroke="#23a98f" stroke-width="2"/>`, big(248, 40, '“안녕?”', '#23a98f') + big(160, 34, '잘 들려요!', '#23a98f'));
  /* 손수건: k = 펼친 손수건이 마른 정도(0~1) */
  const towel = k => {
    const wet = `rgb(${Math.round(110 + 140 * k)},${Math.round(170 + 80 * k)},${Math.round(230 + 20 * k)})`;
    const drops = n => Array.from({ length: n }, (_, i) => `<path d="M${76 + i * 16} ${99 + (i % 2) * 4} q4 7 0 10 q-4 -3 0 -10z" fill="#5fa8f0"/>`).join('');
    return svg(`<circle cx="292" cy="26" r="13" fill="#ffd34d"/><line x1="40" y1="34" x2="160" y2="34" stroke="#8a6c52" stroke-width="2"/>
      <rect x="62" y="34" width="76" height="62" rx="4" fill="${wet}" stroke="#7aa6d6" stroke-width="2"/><rect x="74" y="31" width="6" height="8" fill="#e9895f"/><rect x="120" y="31" width="6" height="8" fill="#e9895f"/>${drops(Math.round(4 * (1 - k)))}
      <path d="M206 128 q-6 -26 14 -30 q10 -14 26 -4 q20 0 18 20 q8 12 -4 14 z" fill="#6eaee8" stroke="#4f8fd0" stroke-width="2"/><path d="M222 104 q6 4 12 0 M230 114 q8 2 14 -4" fill="none" stroke="#4f8fd0" stroke-width="2"/>
      <path d="M268 126 q4 7 0 10 q-4 -3 0 -10z" fill="#5fa8f0"/>` + tag(100, 124, '펼친 손수건') + tag(236, 150, '뭉친 손수건') + (k >= 1 ? big(100, 24, '다 말랐어요!', '#23a98f') : ''));
  };
  /* 그림자: sx, sy = 해 자리, len = 그림자 길이(+ 오른쪽) */
  const shadow = (sx, sy, len, label) => svg(`<circle cx="${sx}" cy="${sy}" r="14" fill="#ffd34d"/><path d="M${sx} ${sy} L160 70" stroke="#ffd34d" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>
    <path d="M160 126 L${160 + len} 126 L${160 + len} 132 L160 132 z" fill="#6f6252" opacity=".6"/><rect x="157" y="70" width="6" height="58" rx="2" fill="#8a6c52"/>` + big(48, 34, label, '#3a3550'));

  window.KIDS_CONFIG = {
    id: 'think-island',
    version: '0.3',
    title: '생각놀이섬',
    kicker: '휴먼쌤 월드 · 학생용',
    backUrl: '../world1/?plaza=1', backLabel: '휴먼쌤 월드 광장으로',      /* 메뉴의 돌아가기(저장소 my-3d-world 안에서만 맞는 주소) */
    coverText: '리니와 함께 섬을 걸으며 오늘의 수수께끼를 풀어요. 질문하고, 확인하고, 직접 해 보면 탐험 배지를 받아요.',
    credit: '섬은 블렌더로 짓고 빛을 미리 구워 넣었어요. 리니는 Tripo로 제작. 과학 문장은 연구부가 교과서 자료로 확인했고, 나머지 글은 가안이에요.',
    acts: { A: '질문하기', C: '확인하기', T: '실천하기' },
    zones: {
      forest: { name: '질문의 숲', act: 'A' },
      bridge: { name: '확인 다리', act: 'C' },
      shop:   { name: '해 보기 공방', act: 'T' },
      hill:   { name: '약속 언덕', act: 'end' }
    },
    hints: {
      meet: '광장의 리니에게 가 보세요',
      forest: '다음: 질문의 숲으로 가요',
      bridge: '다음: 확인 다리로 가요',
      shop: '다음: 다리를 건너 해 보기 공방으로',
      hill: '다음: 약속 언덕으로 올라가요',
      done: '탐험 끝! 섬을 마음껏 둘러봐요',
      bridgeClosed: '다리 판이 두 장 비어 있어요. 확인 다리에서 확인하면 판이 놓여요.',
      water: '시냇물에는 들어갈 수 없어요.',
      edge: '섬 끝이에요. 조심!',
      guide: '길 안내',
      guideStop: '안내 멈추기'
    },
    lini: {
      greet: ['안녕! 나는 리니야. 생각놀이섬에 온 걸 환영해!', '광장 가운데로 와 줄래? 오늘의 수수께끼가 있어!'],
      greetAgain: '또 왔구나! 새 수수께끼가 기다리고 있어. 광장으로 와!',
      toForest: '질문의 숲은 이쪽이야. 나를 따라와!',
      toBridge: '확인 다리로 가자! 시냇물 쪽이야.',
      toShop: '다리를 건너면 해 보기 공방이 있어!',
      toHill: '마지막은 약속 언덕이야. 깃발이 보이지?',
      tap: ['나는 리니야. 궁금한 게 있으면 같이 생각해 보자!', '생각은 먼저, 도움은 필요한 만큼!', 'AI도 틀릴 수 있어. 그래서 확인이 중요해.'],
      done: '오늘 정말 멋지게 생각했어! 또 놀러 와!'
    },
    /* 모든 수수께끼에 같은 글(수수께끼마다 같은 이름으로 덮어쓸 수 있음) */
    riddle: {
      title: '오늘의 수수께끼',
      intro: ['오늘의 수수께끼야!', '세 군데를 돌면서 같이 풀어 보자. 질문하고, 확인하고, 직접 해 보는 거야.'],
      myTitle: '① 내 생각 먼저 골라요',
      mySay: 'AI한테 묻기 전에, 너는 어떻게 생각하는지 먼저 골라 볼래?',
      sureTitle: '얼마나 확실해?',
      sure: ['조금', '보통', '아주'],
      askTitle: '② 리니에게 부탁하는 말 만들기',
      askSay: '이제 나한테 부탁해 봐. 낱말을 눌러서 부탁하는 말을 만들어 줘!',
      needKeys: 3,
      replyVague: '응? 뭘 알려 줄까? 오늘 급식? 내 이름? 나는 들은 것만 알 수 있어!',
      replyHalf: '음… 조금 알 것 같아. 그런데 무엇을 알고 싶은지 조금만 더 자세히 말해 줄래?',
      afterA: '어? 내 말이 정말 맞을까? 확인 다리에서 확인해 보자!',
      heardTitle: '들은 말',
      guessTitle: '① 진짜일까? 먼저 예상해요',
      guess: ['진짜일 것 같아', '가짜일 것 같아', '잘 모르겠어'],
      methodTitle: '② 어떻게 확인할까? 두 가지 골라요',
      needMethods: 2,
      badMethod: '바로 믿으면 다리 판이 놓이지 않아요. 미끄럼틀로 쭈욱! 다른 방법을 골라 볼까요?',
      checked: '확인해 보니 리니 말과 다를 수도 있겠어요. 다리 판이 놓였어요!',
      expTitle: '① 직접 해 봐요',
      expWaitLabel: '빨리 감는 중',
      linesTitle: '② 세 줄로 정리해요',
      line1: '처음엔',
      line2: '이렇게 확인했더니',
      line3: '지금은',
      lineHint: '해 보기에서 본 것을 다시 떠올려 볼까?',
      linesDone: '처음 생각과 지금 생각을 나란히 놓고 보니 어때? 멋지게 정리했어!',
      promiseTitle: '마지막! 내 약속 하나 골라요',
      promiseSay: '오늘 해 본 것 중에서 앞으로도 지키고 싶은 약속 하나를 골라 줘!',
      promises: ['AI에게 묻기 전에 내 생각 먼저 하기', 'AI가 한 말은 한 번 더 확인하기', '궁금한 건 직접 해 보기', '부탁할 때는 자세히 말하기'],
      certTitle: '생각 탐험대원증',
      certName: '이름(별명)',
      certNameHint: '비워 두면 "생각 탐험대원"',
      certSave: '그림으로 만들기',
      certNote: '이름은 이 기기에만 저장돼요. 사진이나 다른 정보는 받지 않아요.',
      factTitle: '알게 된 것',
      newRound: '새 수수께끼 하기',
      allDone: '다섯 수수께끼를 모두 풀었어! 처음 것부터 다시 해 볼까?'
    },
    riddles: [
      { id: 'bean', name: '창가 강낭콩',
        text: '교실 창가 강낭콩이 한쪽으로만 기울었어요.\n왜 그럴까?',
        my: ['바람이 불어서', '햇빛 쪽으로 자라서', '물을 한쪽에만 줘서', '잘 모르겠어요'],
        chips: [{ t: '강낭콩이', k: 'who' }, { t: '창가 쪽으로 기운', k: 'what' }, { t: '까닭을', k: 'want' }, { t: '3학년이 알아듣게', k: 'level' }, { t: '그냥', k: 'vague' }, { t: '아무거나', k: 'vague' }, { t: '알려 줘', k: 'end' }],
        replyGood: '알았어! 강낭콩이 창가 쪽으로 기운 까닭은… 물을 많이 줘서야!',
        heard: '리니: "물을 많이 줘서 강낭콩이 기운 거야."',
        methods: [
          { t: '화분 방향을 바꿔서 직접 해 보기', ok: true, res: '직접 해 보면 알 수 있어요. 해 보기 공방에서 해 봐요!' },
          { t: '식물 도감 찾아보기', ok: true, res: '도감: 식물 줄기는 빛이 오는 쪽으로 굽어 자라요.' },
          { t: '선생님께 여쭤보기', ok: true, res: '선생님: "물보다는 빛 때문일 수도 있겠구나. 직접 확인해 볼까?"' },
          { t: '리니 말이니까 그냥 믿기', ok: false },
          { t: '친구 한 명 말만 듣고 정하기', ok: false }],
        exp: { frames: [bean(26), bean(-26, '반 바퀴 돌림'), bean(26, '사흘 뒤')],
          say: ['창문 쪽에서 빛이 들어와. 화분을 반 바퀴 돌리면 새싹은 어떻게 될까?', '새싹이 이제 창문 반대쪽을 보고 있어요.', '사흘 뒤, 새싹이 다시 창문(빛) 쪽으로 기울었어요!'],
          btn: ['화분 반 바퀴 돌리기', '사흘 빨리 감기'], wait: [false, true] },
        line2Choices: [{ t: '화분을 돌려 보니 새싹이 다시 빛 쪽으로 기울었어', ok: true }, { t: '물을 더 주니 새싹이 쑥쑥 자랐어', ok: false }, { t: '리니가 그렇다고 했어', ok: false }],
        line3Choices: [{ t: '강낭콩은 빛 쪽으로 자라서 기운 거야', ok: true }, { t: '물을 많이 줘서 기운 거야', ok: false }, { t: '바람이 불어서 기운 거야', ok: false }],
        lineHint: '해 보기에서 본 것을 다시 떠올려 볼까? 새싹은 어느 쪽으로 기울었지?',
        fact: '식물 줄기는 빛이 오는 쪽으로 굽어 자라요.', ref: 83 },
      { id: 'magnet', name: '안 붙는 캔',
        text: '냉장고 자석을 음료수 캔에 대 보았는데 붙지 않았어요.\n왜 그럴까?',
        my: ['자석 힘이 약해서', '캔이 자석에 붙지 않는 금속이라서', '캔이 둥글어서', '잘 모르겠어요'],
        chips: [{ t: '자석이', k: 'who' }, { t: '음료수 캔에 안 붙는', k: 'what' }, { t: '까닭을', k: 'want' }, { t: '3학년이 알아듣게', k: 'level' }, { t: '그냥', k: 'vague' }, { t: '아무거나', k: 'vague' }, { t: '알려 줘', k: 'end' }],
        replyGood: '알았어! 자석이 캔에 안 붙은 까닭은… 자석 힘이 약해서야! 금속은 다 자석에 붙거든!',
        heard: '리니: "금속은 다 자석에 붙어. 자석 힘이 약해서 안 붙은 거야."',
        methods: [
          { t: '여러 물건에 자석을 직접 대 보기', ok: true, res: '직접 대 보면 알 수 있어요. 해 보기 공방에서 해 봐요!' },
          { t: '과학책 찾아보기', ok: true, res: '과학책: 자석은 철로 된 물체를 끌어당겨요. 금속이라고 모두 붙지는 않아요.' },
          { t: '선생님께 여쭤보기', ok: true, res: '선생님: "금속이라고 다 붙는 건 아니란다. 직접 대 볼까?"' },
          { t: '리니 말이니까 그냥 믿기', ok: false },
          { t: '친구 한 명 말만 듣고 정하기', ok: false }],
        exp: { frames: [mag0, mag1, mag2],
          say: ['자석을 클립, 알루미늄 캔, 플라스틱 자에 차례로 대 볼까?', '철로 된 클립이 착 붙었어요! 이번엔 캔과 자에 대 볼까?', '알루미늄 캔과 플라스틱 자는 붙지 않았어요. 철로 된 클립만 붙었어요!'],
          btn: ['클립에 대 보기', '캔과 자에도 대 보기'], wait: [false, false] },
        line2Choices: [{ t: '클립은 붙고 알루미늄 캔은 안 붙었어', ok: true }, { t: '캔을 세게 누르니 붙었어', ok: false }, { t: '리니가 그렇다고 했어', ok: false }],
        line3Choices: [{ t: '자석은 철에 붙고, 금속이라고 다 붙지는 않아', ok: true }, { t: '금속은 다 자석에 붙어', ok: false }, { t: '자석 힘이 약해서 안 붙은 거야', ok: false }],
        lineHint: '해 보기에서 무엇이 붙고 무엇이 안 붙었는지 떠올려 볼까?',
        fact: '자석은 철로 된 물체를 끌어당겨요. 알루미늄 캔은 금속이지만 자석에 붙지 않아요.', ref: 84 },
      { id: 'phone', name: '실 전화기',
        text: '종이컵 실 전화기로 이야기했는데 소리가 잘 안 들렸어요.\n어떻게 하면 더 잘 들릴까?',
        my: ['컵을 더 큰 것으로 바꾼다', '실을 팽팽하게 당긴다', '실을 느슨하게 늘어뜨린다', '잘 모르겠어요'],
        chips: [{ t: '실 전화기 소리가', k: 'who' }, { t: '더 잘 들리는', k: 'what' }, { t: '방법을', k: 'want' }, { t: '3학년이 알아듣게', k: 'level' }, { t: '그냥', k: 'vague' }, { t: '아무거나', k: 'vague' }, { t: '알려 줘', k: 'end' }],
        replyGood: '알았어! 실 전화기 소리가 더 잘 들리려면… 실을 느슨하게 늘어뜨리면 돼!',
        heard: '리니: "실을 느슨하게 늘어뜨려야 소리가 더 잘 들려."',
        methods: [
          { t: '실을 느슨하게, 팽팽하게 직접 해 보기', ok: true, res: '직접 해 보면 알 수 있어요. 해 보기 공방에서 해 봐요!' },
          { t: '과학책 찾아보기', ok: true, res: '과학책: 실 전화기는 실이 떨리면서 소리를 전해요.' },
          { t: '선생님께 여쭤보기', ok: true, res: '선생님: "실이 어떤 모양일 때 떨림이 잘 전해질까? 해 보면 알 거야."' },
          { t: '리니 말이니까 그냥 믿기', ok: false },
          { t: '친구 한 명 말만 듣고 정하기', ok: false }],
        exp: { frames: [ph0, ph1, ph2],
          say: ['실 전화기를 두 가지로 해 볼까? 먼저 실을 느슨하게!', '소리가 아주 작게 들려요… 이번엔 실을 팽팽하게!', '실을 팽팽하게 당기니 소리가 또렷하게 들려요!'],
          btn: ['실을 느슨하게 하고 말하기', '실을 팽팽하게 당기고 말하기'], wait: [false, false] },
        line2Choices: [{ t: '실을 팽팽하게 당기니 소리가 더 잘 들렸어', ok: true }, { t: '컵을 흔드니 더 잘 들렸어', ok: false }, { t: '리니가 그렇다고 했어', ok: false }],
        line3Choices: [{ t: '실을 팽팽하게 당겨야 실의 떨림이 잘 전해져', ok: true }, { t: '실을 느슨하게 해야 잘 들려', ok: false }, { t: '컵이 크면 언제나 잘 들려', ok: false }],
        lineHint: '해 보기에서 실이 어떤 모양일 때 잘 들렸는지 떠올려 볼까?',
        fact: '실 전화기는 실이 떨리면서 소리를 전해요. 실을 팽팽하게 당기면 더 잘 들려요.', ref: 85 },
      { id: 'towel', name: '젖은 손수건',
        text: '젖은 손수건 두 장 중 하나는 펼쳐 널고, 하나는 뭉쳐 두었어요.\n어느 쪽이 먼저 마를까?',
        my: ['펼쳐 넌 손수건', '뭉쳐 둔 손수건', '둘이 똑같이 마른다', '잘 모르겠어요'],
        chips: [{ t: '젖은 손수건이', k: 'who' }, { t: '빨리 마르는', k: 'what' }, { t: '방법을', k: 'want' }, { t: '3학년이 알아듣게', k: 'level' }, { t: '그냥', k: 'vague' }, { t: '아무거나', k: 'vague' }, { t: '알려 줘', k: 'end' }],
        replyGood: '알았어! 젖은 손수건은… 꼭 뭉쳐 두면 더 빨리 말라!',
        heard: '리니: "젖은 손수건은 뭉쳐 두어야 더 빨리 말라."',
        methods: [
          { t: '두 장을 펼치고 뭉쳐서 직접 해 보기', ok: true, res: '직접 해 보면 알 수 있어요. 해 보기 공방에서 해 봐요!' },
          { t: '과학책 찾아보기', ok: true, res: '과학책: 물은 표면에서 수증기로 바뀌어 공기 중으로 날아가요. 이것을 증발이라고 해요.' },
          { t: '선생님께 여쭤보기', ok: true, res: '선생님: "공기와 닿는 곳이 넓으면 어떨까? 해 보자."' },
          { t: '리니 말이니까 그냥 믿기', ok: false },
          { t: '친구 한 명 말만 듣고 정하기', ok: false }],
        exp: { frames: [towel(0), towel(0.5), towel(1)],
          say: ['젖은 손수건 두 장을 햇볕에 두었어. 하나는 펼치고, 하나는 뭉쳤어.', '펼친 손수건이 조금씩 마르고 있어요.', '펼친 손수건이 먼저 다 말랐어요! 뭉친 손수건은 아직 축축해요.'],
          btn: ['한 시간 빨리 감기', '한 시간 더 빨리 감기'], wait: [true, true] },
        line2Choices: [{ t: '펼친 손수건이 먼저 말랐어', ok: true }, { t: '뭉친 손수건이 먼저 말랐어', ok: false }, { t: '리니가 그렇다고 했어', ok: false }],
        line3Choices: [{ t: '넓게 펼치면 공기와 닿는 곳이 넓어서 빨리 말라', ok: true }, { t: '뭉쳐 두어야 빨리 말라', ok: false }, { t: '손수건은 언제나 똑같이 말라', ok: false }],
        lineHint: '해 보기에서 어느 손수건이 먼저 말랐는지 떠올려 볼까?',
        fact: '물은 표면에서 수증기로 날아가요(증발). 넓게 펼치면 공기와 닿는 곳이 넓어 더 빨리 말라요.', ref: 86 },
      { id: 'shadow', name: '막대 그림자',
        text: '운동장에 막대를 세워 두었어요.\n하루 중 그림자가 가장 짧을 때는 언제일까?',
        my: ['해가 막 뜬 아침', '해가 높이 뜬 한낮', '해가 지는 저녁', '잘 모르겠어요'],
        chips: [{ t: '막대 그림자가', k: 'who' }, { t: '하루 중 가장 짧은', k: 'what' }, { t: '때를', k: 'want' }, { t: '3학년이 알아듣게', k: 'level' }, { t: '그냥', k: 'vague' }, { t: '아무거나', k: 'vague' }, { t: '알려 줘', k: 'end' }],
        replyGood: '알았어! 막대 그림자가 가장 짧은 때는… 아침이야! 한낮에는 해가 제일 밝아서 그림자도 제일 길거든.',
        heard: '리니: "한낮에는 해가 제일 밝아서 그림자도 제일 길어."',
        methods: [
          { t: '막대 그림자를 시간마다 직접 재 보기', ok: true, res: '직접 재 보면 알 수 있어요. 해 보기 공방에서 해 봐요!' },
          { t: '과학책 찾아보기', ok: true, res: '과학책: 해가 높이 뜰수록 그림자는 짧아져요. (6학년에서 더 배워요)' },
          { t: '선생님께 여쭤보기', ok: true, res: '선생님: "해가 어디 있을 때 그림자가 짧을까? 하루 동안 재 보자."' },
          { t: '리니 말이니까 그냥 믿기', ok: false },
          { t: '친구 한 명 말만 듣고 정하기', ok: false }],
        exp: { frames: [shadow(26, 112, 118, '아침'), shadow(160, 22, 16, '한낮'), shadow(294, 112, -118, '저녁')],
          say: ['아침이야. 해가 낮게 떠 있어. 막대 그림자가 길어요.', '한낮이 되니 해가 높이 떴어요. 그림자가 아주 짧아요!', '저녁에는 해가 다시 낮아져 그림자가 길어졌어요. 그림자는 한낮에 가장 짧았어요!'],
          btn: ['한낮까지 기다리기', '저녁까지 기다리기'], wait: [true, true] },
        line2Choices: [{ t: '시간마다 재 보니 한낮에 그림자가 가장 짧았어', ok: true }, { t: '아침에 그림자가 가장 짧았어', ok: false }, { t: '리니가 그렇다고 했어', ok: false }],
        line3Choices: [{ t: '해가 높이 뜬 한낮에 그림자가 가장 짧아', ok: true }, { t: '해가 밝으면 그림자가 길어', ok: false }, { t: '그림자 길이는 하루 내내 같아', ok: false }],
        lineHint: '해 보기에서 해가 어디 있을 때 그림자가 짧았는지 떠올려 볼까?',
        fact: '해가 높이 뜰수록 그림자는 짧아져요. 그래서 한낮(점심 무렵)에 그림자가 가장 짧아요.', ref: 87 }
    ],
    ui: {
      start: '들어가기', resume: '이어서 하기', restart: '처음부터', loading: '불러오는 중…',
      next: '다음', ask: '리니에게 부탁하기', clear: '지우기', go: '가기', close: '닫기', ok: '좋아!',
      toForest: '질문의 숲으로 가기', toBridge: '확인 다리로 가기', toShop: '해 보기 공방으로 가기', toHill: '약속 언덕으로 가기', finish: '탐험대원증 받기',
      badges: '탐험 배지', menu: '메뉴', home: '처음 화면', soundOn: '소리 켜짐', soundOff: '소리 꺼짐',
      helpPC: '끌어서 둘러보기 · WASD·방향키로 걷기 · 리니를 눌러 보세요',
      helpTouch: '왼쪽 아래 동그라미로 걷고, 화면을 끌어 둘러봐요 · 길 안내를 눌러도 돼요'
    }
  };
})();
