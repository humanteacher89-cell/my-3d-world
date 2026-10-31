/* 「분식집에 가요」 v0.2 — 한국어학습 XR콘텐츠 3판: 동네 분식집에서 메뉴 이름·주문·계산·먹는 말 배우기 (2026-10-21, 10-31 흐름 다듬음)
   10-21 추천안대로 확정(휴먼쌤 "그냥 바로 올려 승인받지말고"): 점원 = 하나(분식집 빨간 앞치마), '하나·두 개' + 합계 '만 원', 현금, 낱말 10개, 뜻풀이 fr 기본.
   10-31 검수: 음식을 받아 놓고 묻고 답하기를 한 뒤에 계산·먹기로 가던 것 → 묻고 답하기를 주문 앞으로(주문 → 계산 → 먹기가 이어지게),
   점원이 "쪽지를 보세요. 이걸 주문해요."라고 하던 것 → "뭐 드릴까요?" + 안내 말, 손님에게는 "알려 드릴게요".
   하나 대사·문화 한 줄·뜻풀이는 모두 [확인 전] 초안. 값은 배우기 쉬운 숫자로 맞춘 예시(실제 값과 다를 수 있음). 가게 이름은 가상, 실제 상표 없음. */
window.BUNSIK = {
  kicker: '휴먼쌤 월드 · 한국어 배우기',
  title: '분식집에 가요',
  sub: '분식집에서 메뉴 이름을 듣고, 하나에게 "떡볶이 하나 주세요" 하고 주문해서 먹어 봐요. 약 10분',
  howHand: '엄지와 검지를 맞대면 집어요. 버튼은 손가락으로 톡 눌러도 돼요.',
  howCtrl: '컨트롤러는 옆 버튼(그립)으로 집고, 방아쇠로 버튼을 눌러요.',
  howPhone: '음식을 톡 누르면 이름을 들려줘요.',
  howFlat: '음식을 눌러 이름을 듣고, 주문할 음식을 눌러 골라요.',
  start: '들어가기',
  credit: '점원 캐릭터: Tripo로 제작(앞치마 색만 바꿈) · 목소리: AI 음성 합성(Qwen3-TTS) · 가게와 음식은 코드로 그린 가상 가게(실제 상표 없음) · 값은 예시',
  guide: { name: '하나', role: '분식집 점원', dot: '#d8402f' },
  shopName: '하나 분식',

  // 낱말 10개. place = 놓인 곳(bunsik.js의 자리 이름), price = 값(원), priceKo = 읽는 법
  words: [
    { id: 'tteokbokki', ko: '떡볶이', ro: 'tteokbokki', fr: 'tteokbokki (gâteaux de riz sautés, épicés)', en: 'tteokbokki (spicy rice cakes)', place: 'counter', price: 4000, priceKo: '사천 원' },
    { id: 'gimbap',     ko: '김밥',   ro: 'gimbap',     fr: 'gimbap (rouleau de riz)',  en: 'gimbap (rice roll)',     place: 'counter', price: 3000, priceKo: '삼천 원' },
    { id: 'ramyeon',    ko: '라면',   ro: 'ramyeon',    fr: 'ramyeon (nouilles)',       en: 'ramyeon (noodles)',      place: 'counter', price: 4000, priceKo: '사천 원' },
    { id: 'sundae',     ko: '순대',   ro: 'sundae',     fr: 'sundae (boudin coréen)',   en: 'sundae (Korean sausage)', place: 'counter', price: 4000, priceKo: '사천 원' },
    { id: 'twigim',     ko: '튀김',   ro: 'twigim',     fr: 'beignets (friture)',       en: 'fritters (tempura)',     place: 'counter', price: 3000, priceKo: '삼천 원' },
    { id: 'eomuk',      ko: '어묵',   ro: 'eomuk',      fr: 'galette de poisson (brochette)', en: 'fish cake (skewer)', place: 'counter', price: 1000, priceKo: '천 원' },
    { id: 'menupan',    ko: '메뉴판', ro: 'menyupan',   fr: 'menu (tableau)',           en: 'menu board',             place: 'wall' },
    { id: 'mul',        ko: '물',     ro: 'mul',        fr: 'eau',                      en: 'water',                  place: 'water' },
    { id: 'pojang',     ko: '포장',   ro: 'pojang',     fr: 'à emporter (emballage)',   en: 'takeout (packing)',      place: 'counter' },
    { id: 'hyeongeum',  ko: '현금',   ro: 'hyeongeum',  fr: 'espèces (argent liquide)', en: 'cash',                   place: 'counter' }
  ],
  repeatWords: ['tteokbokki', 'sundae', 'eomuk'],          // 따라 말하기
  // 쪽지(주문하기): 떡볶이 하나 + 순대 하나 + 어묵 두 개 = 사천 + 사천 + 이천 = 만 원
  orderList: [{ id: 'tteokbokki', n: '하나', count: 1 }, { id: 'sundae', n: '하나', count: 1 }, { id: 'eomuk', n: '두 개', count: 2 }],
  total: 10000, totalKo: '만 원',
  quizWords: ['gimbap', 'twigim', 'ramyeon'],             // 묻고 답하기: 이게 뭐예요?
  priceQuiz: { id: 'gimbap', choices: ['천 원', '삼천 원', '사천 원'], answer: 1 },   // 묻고 답하기: 얼마예요?

  hello: [
    { text: '어서 오세요!', choices: ['안녕하세요!'], gloss: { fr: 'Bienvenue !', en: 'Welcome!' } },
    { text: '여기는 하나 분식이에요. 떡볶이, 김밥, 라면이 있어요.', choices: ['와, 맛있겠다!'], gloss: { fr: 'Ici, c\'est le snack de Hana. Il y a des tteokbokki, du gimbap et des ramyeon. → Oh, ça a l\'air bon !', en: 'This is Hana\'s snack bar. We have tteokbokki, gimbap and ramyeon. → Wow, looks delicious!' } },
    { text: '먼저 메뉴 이름을 들어 봐요.', choices: ['좋아요'], gloss: { fr: 'D\'abord, écoutons les noms du menu.', en: 'First, let\'s listen to the menu names.' } }
  ],
  listen: { title: '메뉴 듣기', ask: '음식을 톡 눌러 보세요. 이름과 값을 알려 드릴게요. 다섯 개 들으면 다음으로 가요.', counter: '들은 말', done: '잘 들었어요! 이제 따라 말해 봐요.',
            say: '이건 {이에요}.', price: '{price}이에요.' },
  repeat: { title: '따라 말하기', ask: '제가 말하면 따라 말해 보세요.', card: '따라 말해 보세요', again: '다시 듣기', said: '말했어요', good: '좋아요!', done: '목소리가 좋아요!' },
  order: { title: '주문하기', ask: '뭐 드릴까요? 쪽지를 보고 주문해 보세요.', note: '쪽지',
           pick: '{을를} 눌러 보세요.', line: '{ko} {n} 주세요.', ok: '네, {ko} {n}요.', wrong: '그건 {그이에요}. {을를} 눌러 보세요.', here: '여기 있어요.',
           spicy: { text: '떡볶이 맵게 해 드릴까요?', choices: ['네, 맵게 해 주세요.', '아니요, 안 맵게 해 주세요.'], gloss: { fr: 'Je vous fais les tteokbokki épicés ? → Oui, épicés s\'il vous plaît. / Non, pas épicés s\'il vous plaît.', en: 'Shall I make the tteokbokki spicy? → Yes, spicy please. / No, not spicy please.' },
             reply: ['네, 맵게 해 드릴게요.', '네, 안 맵게 해 드릴게요.'] },
           where: { text: '여기서 드세요? 포장이세요?', choices: ['여기서 먹을게요.', '포장해 주세요.'], gloss: { fr: 'Vous mangez ici ou à emporter ? → Je mange ici. / À emporter, s\'il vous plaît.', en: 'Eating here or takeout? → I\'ll eat here. / Takeout, please.' },
             reply: ['네, 앉으세요.', '네, 포장해 드릴게요.'] },
           done: '주문 끝! 잘했어요.' },
  quiz: { title: '묻고 답하기', ask: '이제 제가 물어볼게요.', q: '이게 뭐예요?', pq: '{은는} 얼마예요?', ok: '맞아요!', wrong: '아니에요. 이건 {이에요}.', pwrong: '아니에요. {price}이에요.', done: '잘했어요!' },
  pay: { title: '계산하고 먹기',
    how: { text: '얼마예요?', me: true, gloss: { fr: 'C\'est combien ?', en: 'How much is it?' } },
    total: { text: '모두 만 원이에요.', choices: ['네!'], gloss: { fr: 'Ça fait dix mille wons en tout.', en: 'That\'s ten thousand won altogether.' } },
    cash: { text: '현금으로 할게요.', me: true, gloss: { fr: 'Je paie en espèces.', en: 'I\'ll pay in cash.' } },
    tap: '현금을 눌러 주세요.', thanks: '네, 감사합니다.',
    eat: { text: '맛있게 드세요!', choices: ['잘 먹겠습니다!'], gloss: { fr: 'Bon appétit ! → Merci pour le repas ! (avant de manger)', en: 'Enjoy your meal! → Thank you for the food! (before eating)' } },
    eatTap: '음식을 눌러 먹어 보세요.', yum: '맛있어요!',
    full: { text: '잘 먹었습니다.', me: true, gloss: { fr: 'Merci, c\'était bon. (après avoir mangé)', en: 'Thank you for the meal. (after eating)' } },
    pack: { text: '여기 있어요. 맛있게 드세요!', choices: ['감사합니다!'], gloss: { fr: 'Voilà. Bon appétit ! → Merci !', en: 'Here you go. Enjoy! → Thank you!' } },
    bye: { text: '감사합니다. 안녕히 가세요!', choices: ['안녕히 계세요!'], gloss: { fr: 'Merci. Au revoir ! (à celui qui part) → Au revoir ! (à celle qui reste)', en: 'Thank you. Goodbye! (to someone leaving) → Goodbye! (to someone staying)' } }
  },
  phrases: [
    { ko: '○○ 하나 주세요', fr: 'Un(e) ○○, s\'il vous plaît', en: 'One ○○, please' },
    { ko: '○○ 두 개 주세요', fr: 'Deux ○○, s\'il vous plaît', en: 'Two ○○, please' },
    { ko: '맵게 / 안 맵게 해 주세요', fr: 'Épicé / pas épicé, s\'il vous plaît', en: 'Spicy / not spicy, please' },
    { ko: '여기서 먹을게요 / 포장해 주세요', fr: 'Je mange ici / à emporter', en: 'I\'ll eat here / takeout, please' },
    { ko: '얼마예요?', fr: 'C\'est combien ?', en: 'How much is it?' },
    { ko: '잘 먹겠습니다 / 잘 먹었습니다', fr: 'Merci pour le repas (avant / après)', en: 'Thanks for the meal (before / after)' }
  ],
  ending: {
    cardKicker: '오늘 배운 말',
    cardTitle: '분식집에 가요',
    cultureTitle: '문화 한 조각',
    culture: ['밥을 먹기 전에는 "잘 먹겠습니다", 다 먹고 나서는 "잘 먹었습니다"라고 해요.', '떡볶이 국물에 튀김이나 순대를 찍어 먹기도 해요.', '물건을 셀 때는 "하나, 둘"이에요. "어묵 두 개 주세요"처럼 "둘"이 "두"로 바뀌어요.'],
    cultureSrc: '',
    free: '더 둘러보기', restart: '처음부터 다시', exit: '나가기'
  },
  wrist: '오늘 할 일'
};
