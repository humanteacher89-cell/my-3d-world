/* 「약국에 가요」 v0.1 — 한국어 학습맵 5판: 동네 약국에서 몸 낱말·아픈 곳 말하기·약 받는 말 배우기 (2026-10-21)
   휴먼쌤 10-21 "그냥 바로 올려 승인받지말고" → 기획 9절 추천안대로: 약사 = 하나(흰 가운), 낱말 10개, 약 상자는 몸 낱말이 든 가상 이름, 제목 '약국에 가요'.
   지킬 것: 실제 약 이름·성분·효과·의학적 조언 없음. 약 상자는 '하나 약국 연습용' 가상 상품. 약사 말은 일반 표현만.
   하나 대사·뜻풀이는 [확인 전] 초안. 119는 국가기록원 기록 주제 '119'(화재·응급 신고를 119로 합침, 1997년부터)로 확인. */
window.PHARM = {
  kicker: '휴먼쌤 월드 · 한국어 배우기',
  title: '약국에 가요',
  sub: '동네 약국에서 몸 낱말을 듣고, 약사 하나에게 어디가 아픈지 말한 뒤 약을 받아 나와요. 약 10분',
  howHand: '엄지와 검지를 맞대면 집어요. 버튼은 손가락으로 톡 눌러도 돼요.',
  howCtrl: '컨트롤러는 옆 버튼(그립)으로 집고, 방아쇠로 버튼을 눌러요.',
  howPhone: '그림판의 몸을 톡 누르면 이름을 들려줘요.',
  howFlat: '그림판의 몸을 눌러 이름을 듣고, 하나가 말한 약 상자를 눌러 찾아요.',
  start: '들어가기',
  credit: '약사 캐릭터: Tripo로 제작 · 목소리: AI 음성 합성(Qwen3-TTS) · 약국과 약 상자는 코드로 그린 가상 상품(실제 약 아님) · 연습용이에요. 실제로 아플 때는 약사나 의사에게 물어보세요.',
  guide: { name: '하나', role: '약사', dot: '#3a8fb7' },
  shopName: '하나 약국',

  // 낱말 10개. part = 몸 그림판 자리(pharmacy.js의 PARTS), sym = 아픈 곳 문장에 쓰는 몸 낱말
  words: [
    { id: 'meori',  ko: '머리', ro: 'meori',  fr: 'tête',              en: 'head',     part: 'meori' },
    { id: 'nun',    ko: '눈',   ro: 'nun',    fr: 'œil, yeux',         en: 'eye',      part: 'nun' },
    { id: 'ko',     ko: '코',   ro: 'ko',     fr: 'nez',               en: 'nose',     part: 'ko' },
    { id: 'i',      ko: '이',   ro: 'i',      fr: 'dent',              en: 'tooth',    part: 'i' },
    { id: 'mok',    ko: '목',   ro: 'mok',    fr: 'gorge, cou',        en: 'throat, neck', part: 'mok' },
    { id: 'bae',    ko: '배',   ro: 'bae',    fr: 'ventre',            en: 'belly, stomach', part: 'bae' },
    { id: 'son',    ko: '손',   ro: 'son',    fr: 'main',              en: 'hand',     part: 'son' },
    { id: 'yeol',   ko: '열',   ro: 'yeol',   fr: 'fièvre',            en: 'fever',    sign: true },
    { id: 'gichim', ko: '기침', ro: 'gichim', fr: 'toux',              en: 'cough',    sign: true },
    { id: 'yak',    ko: '약',   ro: 'yak',    fr: 'médicament',        en: 'medicine' }
  ],
  listenWords: ['meori', 'nun', 'ko', 'i', 'mok', 'bae', 'son'],   // 이름 듣기: 몸 7개 다
  repeatWords: ['meori', 'bae', 'mok'],                             // 따라 말하기
  // 아픈 곳 말하기: 그림판에 아픈 곳이 빨갛게 → "어디가 아프세요?"에 답하고, 덧붙는 물음(열·기침)에 답한 뒤 그 상자를 찾는다
  cases: [
    { part: 'meori', box: 'meori', extra: 'yeol' },
    { part: 'bae',   box: 'bae' },
    { part: 'mok',   box: 'mok',   extra: 'gichim' }
  ],
  quizParts: ['i', 'nun', 'son'],                                   // 묻고 답하기: 어디가 아파요?
  timesQuiz: { choices: ['한 번', '두 번', '세 번'], answer: 1 },  // 하루에 몇 번 먹어요? (하나: 하루에 두 번 드세요)

  hello: [
    { text: '어서 오세요!', choices: ['안녕하세요!'], gloss: { fr: 'Bienvenue !', en: 'Welcome!' } },
    { text: '안녕하세요! 여기는 하나 약국이에요. 저는 약사예요.', choices: ['네!'], gloss: { fr: 'Bonjour ! Ici, c\'est la pharmacie de Hana. Je suis pharmacienne.', en: 'Hello! This is Hana\'s pharmacy. I\'m the pharmacist.' } },
    { text: '오늘은 몸 이름을 배워요. 먼저 그림판을 봐요.', choices: ['좋아요'], gloss: { fr: 'Aujourd\'hui, on apprend les parties du corps. Regardons d\'abord le tableau.', en: 'Today we learn body words. First, let\'s look at the board.' } }
  ],
  listen: { title: '몸 이름 듣기', ask: '그림판의 몸을 톡 눌러 보세요. 이름을 말해 줄게요. 일곱 개 다 들으면 다음으로 가요.', counter: '들은 말', done: '잘 들었어요! 이제 따라 말해 봐요.',
            say: '여기는 {이에요}.' },
  repeat: { title: '따라 말하기', ask: '제가 말하면 따라 말해 보세요.', card: '따라 말해 보세요', again: '다시 듣기', said: '말했어요', good: '좋아요!', done: '아주 잘했어요!' },
  tell: { title: '아픈 곳 말하기', ask: '이제 손님이 돼 보세요. 그림판에서 빨간 곳이 아픈 곳이에요.',
          q: '어디가 아프세요?', sym: '{이가} 아파요.', ok: '아, {이가} 아파요?', wrong: '빨간 곳을 보세요. {이가} 아파요.',
          extra: {
            yeol:   { q: '열도 나요?', choices: ['네, 열이 나요.', '아니요, 열은 안 나요.'], gloss: { fr: 'Vous avez aussi de la fièvre ? → Oui, j\'ai de la fièvre. / Non, pas de fièvre.', en: 'Do you have a fever too? → Yes, I have a fever. / No, no fever.' } },
            gichim: { q: '기침도 해요?', choices: ['네, 기침을 해요.', '아니요, 기침은 안 해요.'], gloss: { fr: 'Vous toussez aussi ? → Oui, je tousse. / Non, je ne tousse pas.', en: 'Are you coughing too? → Yes, I\'m coughing. / No, I\'m not.' } }
          },
          reply: '네, 알겠어요.',
          find: '선반에서 {box} 상자를 찾아 주세요.', boxOk: '네, 맞아요. 이 약이에요.', boxWrong: '그건 {그box} 상자예요. {box} 상자를 찾아 보세요.', hint: '반짝이는 상자를 눌러 보세요.',
          done: '잘했어요! 아픈 곳을 다 말했어요.' },
  quiz: { title: '묻고 답하기', ask: '이제 제가 물어볼게요.', q: '어디가 아파요?', ok: '맞아요!', wrong: '아니에요. {이가} 아파요.',
          timesSay: '이 약은 하루에 두 번 드세요.', timesQ: '하루에 몇 번 먹어요?', timesWrong: '아니에요. 하루에 두 번이에요.', done: '잘했어요!' },
  pay: { title: '약 받기',
    move: { text: '약이 다 나왔어요. 계산대로 오세요.', choices: ['네!'], gloss: { fr: 'Les médicaments sont prêts. Venez à la caisse.', en: 'Your medicine is ready. Come to the counter.' } },
    take: { text: '이 약을 하루에 세 번 드세요.', choices: ['네, 알겠습니다.'], gloss: { fr: 'Prenez ce médicament trois fois par jour. → D\'accord.', en: 'Take this medicine three times a day. → All right.' } },
    how: { text: '얼마예요?', me: true, gloss: { fr: 'C\'est combien ?', en: 'How much is it?' } },
    total: { text: '모두 오천 원이에요.', choices: ['네!'], gloss: { fr: 'Ça fait cinq mille wons en tout.', en: 'That\'s five thousand won altogether.' } },
    card: { text: '카드로 하세요?', choices: ['네, 카드로 할게요.'], gloss: { fr: 'Vous payez par carte ? → Oui, je paie par carte.', en: 'Paying by card? → Yes, I\'ll pay by card.' } },
    tap: '카드를 눌러 주세요.', tapped: '결제됐어요.',
    well: { text: '빨리 나으세요!', choices: ['감사합니다.'], gloss: { fr: 'Remettez-vous vite ! → Merci.', en: 'Get well soon! → Thank you.' } },
    bye: { text: '안녕히 가세요!', choices: ['안녕히 계세요!'], gloss: { fr: 'Au revoir ! (à celui qui part) → Au revoir ! (à celle qui reste)', en: 'Goodbye! (to someone leaving) → Goodbye! (to someone staying)' } }
  },
  phrases: [
    { ko: '어디가 아프세요?', fr: 'Où avez-vous mal ?', en: 'Where does it hurt?' },
    { ko: '머리가 아파요 / 목이 아파요', fr: 'J\'ai mal à la tête / à la gorge', en: 'I have a headache / a sore throat' },
    { ko: '열이 나요', fr: 'J\'ai de la fièvre', en: 'I have a fever' },
    { ko: '기침을 해요', fr: 'Je tousse', en: 'I\'m coughing' },
    { ko: '하루에 세 번 드세요', fr: 'Prenez-le trois fois par jour', en: 'Take it three times a day' },
    { ko: '빨리 나으세요', fr: 'Remettez-vous vite', en: 'Get well soon' }
  ],
  ending: {
    cardKicker: '오늘 배운 말',
    cardTitle: '약국에 가요',
    cultureTitle: '알아 두면 좋아요',
    culture: ['받침이 있으면 "이", 없으면 "가": 목이·눈이·손이 아파요 / 머리가·배가·코가 아파요.',
              '횟수는 "한 번, 두 번, 세 번"이라고 해요("일 번, 이 번"이 아니에요).',
              '한국에서 불이 나거나 많이 다치거나 아플 때는 119에 전화해요(불·구조·구급).',
              '이 맵의 약은 연습용 가상 상품이에요. 실제로 아플 때는 약사나 의사에게 물어보세요.'],
    cultureSrc: '119: 국가기록원 기록 주제 \'119\'(theme.archives.go.kr)',
    free: '더 둘러보기', restart: '처음부터 다시', exit: '나가기'
  },
  wrist: '오늘 할 일'
};
