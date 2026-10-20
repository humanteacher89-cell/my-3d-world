/* 「편의점에 가요」 v0.1 — 한국어 학습맵 2판: 동네 편의점에서 물건 이름·찾기·계산하는 말 배우기 (2026-10-20)
   휴먼쌤 10-20 기획 승인("전부다 너가 추천하는대로 할게"): 점원 = 하나(편의점 옷), 낱말 10개, 값은 천 원 단위, 뜻풀이 fr 기본.
   하나 대사·문화 한 줄·뜻풀이는 모두 [확인 전] 초안. 값은 배우기 쉬운 숫자로 맞춘 예시(실제 값과 다를 수 있음). 가게 이름은 가상, 실제 상표 없음. */
window.STORE = {
  kicker: '휴먼쌤 월드 · 한국어 배우기',
  title: '편의점에 가요',
  sub: '동네 편의점에서 물건 이름을 듣고, 점원 하나에게 물어 찾아 담고, 계산까지 해 봐요. 약 10분',
  howHand: '엄지와 검지를 맞대면 집어요. 버튼은 손가락으로 톡 눌러도 돼요.',
  howCtrl: '컨트롤러는 옆 버튼(그립)으로 집고, 방아쇠로 버튼을 눌러요.',
  howPhone: '물건을 톡 누르면 이름을 들려줘요.',
  howFlat: '물건을 눌러 이름을 듣고, 찾은 물건을 눌러 바구니에 담아요.',
  start: '들어가기',
  credit: '점원 캐릭터: Tripo로 제작 · 목소리: AI 음성 합성(Qwen3-TTS) · 가게와 상품은 코드로 그린 가상 가게(실제 상표 없음) · 값은 예시',
  guide: { name: '하나', role: '편의점 점원', dot: '#3f9e5c' },
  shopName: '하나 편의점',

  // 낱말 10개. place = 놓인 곳(store.js의 자리 이름), price = 값(원), priceKo = 읽는 법
  words: [
    { id: 'mul',      ko: '물',       ro: 'mul',        fr: 'eau',                     en: 'water',            place: 'fridge',  price: 1000, priceKo: '천 원' },
    { id: 'uyu',      ko: '우유',     ro: 'uyu',        fr: 'lait',                    en: 'milk',             place: 'fridge',  price: 2000, priceKo: '이천 원' },
    { id: 'gimbap',   ko: '김밥',     ro: 'gimbap',     fr: 'gimbap (rouleau de riz)', en: 'gimbap (rice roll)', place: 'fridge', price: 3000, priceKo: '삼천 원' },
    { id: 'ppang',    ko: '빵',       ro: 'ppang',      fr: 'pain',                    en: 'bread',            place: 'shelf',   price: 3000, priceKo: '삼천 원' },
    { id: 'gwaja',    ko: '과자',     ro: 'gwaja',      fr: 'biscuits, chips',         en: 'snack, chips',     place: 'shelf',   price: 2000, priceKo: '이천 원' },
    { id: 'ramyeon',  ko: '라면',     ro: 'ramyeon',    fr: 'nouilles instantanées',   en: 'instant noodles',  place: 'shelf',   price: 2000, priceKo: '이천 원' },
    { id: 'icecream', ko: '아이스크림', ro: 'aiseukeurim', fr: 'glace',                en: 'ice cream',        place: 'freezer', price: 2000, priceKo: '이천 원' },
    { id: 'baguni',   ko: '바구니',   ro: 'baguni',     fr: 'panier',                  en: 'basket',           place: 'door' },
    { id: 'bongtu',   ko: '봉투',     ro: 'bongtu',     fr: 'sac',                     en: 'bag',              place: 'counter' },
    { id: 'kadeu',    ko: '카드',     ro: 'kadeu',      fr: 'carte (bancaire)',        en: 'card',             place: 'counter' }
  ],
  // 놓인 곳 이름(하나 대답: "○○은 냉장고에 있어요.")
  places: { fridge: '냉장고', shelf: '선반', freezer: '아이스크림 냉동고', door: '문 옆', counter: '계산대' },
  repeatWords: ['ramyeon', 'gwaja', 'icecream'],          // 따라 말하기
  list: ['gimbap', 'uyu', 'gwaja'],                        // 쪽지(찾아서 담기): 삼천 + 이천 + 이천 = 칠천 원
  total: 7000, totalKo: '칠천 원',
  quizWords: ['ramyeon', 'mul', 'ppang'],                  // 묻고 답하기: 이게 뭐예요?
  priceQuiz: { id: 'uyu', choices: ['천 원', '이천 원', '삼천 원'], answer: 1 },   // 묻고 답하기: 얼마예요?

  hello: [
    { text: '어서 오세요!', choices: ['안녕하세요!'], gloss: { fr: 'Bienvenue !', en: 'Welcome!' } },
    { text: '안녕하세요! 여기는 하나 편의점이에요.', choices: ['네!'], gloss: { fr: 'Bonjour ! Ici, c\'est la supérette de Hana.', en: 'Hello! This is Hana\'s convenience store.' } },
    { text: '오늘은 같이 장을 봐요. 먼저 물건 이름을 들어 봐요.', choices: ['좋아요'], gloss: { fr: 'Aujourd\'hui, on fait les courses ensemble. D\'abord, écoutons les noms des produits.', en: 'Today we\'ll shop together. First, let\'s listen to the names of things.' } }
  ],
  listen: { title: '이름 듣기', ask: '물건을 톡 눌러 보세요. 이름과 값을 말해 줄게요. 다섯 개 들으면 다음으로 가요.', counter: '들은 말', done: '잘 들었어요! 이제 따라 말해 봐요.',
            say: '이건 {이에요}.', price: '{price}이에요.' },
  repeat: { title: '따라 말하기', ask: '제가 말하면 따라 말해 보세요.', card: '따라 말해 보세요', again: '다시 듣기', said: '말했어요', good: '좋아요!', done: '목소리가 좋아요!' },
  find: { title: '찾아서 담기', ask: '쪽지를 보세요. 이 물건들을 사야 해요.', note: '쪽지', basket: '먼저 바구니를 드세요.', basketHint: '문 옆에 있는 바구니를 눌러 보세요.', basketOk: '네, 바구니예요.',
          askBtn: '{은는} 어디 있어요?', answer: '{은는} {place}에 있어요.', pick: '{을를} 바구니에 담아 주세요.', ok: '네, 맞아요! {이에요}.', wrong: '그건 {그이에요}. {을를} 찾아 보세요.', hint: '반짝이는 것을 눌러 보세요.',
          done: '다 담았어요! 이제 계산대로 가요.' },
  quiz: { title: '묻고 답하기', ask: '이제 제가 물어볼게요.', q: '이게 뭐예요?', pq: '{은는} 얼마예요?', ok: '맞아요!', wrong: '아니에요. 이건 {이에요}.', pwrong: '아니에요. {price}이에요.', done: '잘했어요!' },
  pay: { title: '계산하기',
    move: { text: '계산대로 오세요.', choices: ['네!'], gloss: { fr: 'Venez à la caisse.', en: 'Come to the counter.' } },
    how: { text: '모두 얼마예요?', me: true, gloss: { fr: 'Ça fait combien en tout ?', en: 'How much is it altogether?' } },
    total: { text: '모두 칠천 원이에요.', choices: ['네!'], gloss: { fr: 'Ça fait sept mille wons en tout.', en: 'That\'s seven thousand won altogether.' } },
    bag: { text: '봉투 필요하세요?', choices: ['네, 주세요.', '아니요, 괜찮아요.'], gloss: { fr: 'Vous avez besoin d\'un sac ? → Oui, s\'il vous plaît. / Non merci, ça va.', en: 'Do you need a bag? → Yes, please. / No, I\'m fine.' },
      reply: ['네, 여기 있어요.', '네, 알겠습니다.'] },
    card: { text: '카드로 하세요?', choices: ['네, 카드로 할게요.'], gloss: { fr: 'Vous payez par carte ? → Oui, je paie par carte.', en: 'Paying by card? → Yes, I\'ll pay by card.' } },
    tap: '카드를 눌러 주세요.', tapped: '결제됐어요.',
    receipt: { text: '영수증 드릴까요?', choices: ['아니요, 괜찮아요.', '네, 주세요.'], gloss: { fr: 'Je vous donne le ticket ? → Non merci, ça va. / Oui, s\'il vous plaît.', en: 'Would you like the receipt? → No, I\'m fine. / Yes, please.' },
      reply: ['네, 알겠습니다.', '네, 여기 있어요.'] },
    bye: { text: '감사합니다. 안녕히 가세요!', choices: ['안녕히 계세요!'], gloss: { fr: 'Merci. Au revoir ! (à celui qui part) → Au revoir ! (à celle qui reste)', en: 'Thank you. Goodbye! (to someone leaving) → Goodbye! (to someone staying)' } }
  },
  phrases: [
    { ko: '어서 오세요', fr: 'Bienvenue', en: 'Welcome' },
    { ko: '○○ 어디 있어요?', fr: 'Où est ○○ ?', en: 'Where is ○○?' },
    { ko: '얼마예요?', fr: 'C\'est combien ?', en: 'How much is it?' },
    { ko: '봉투 필요하세요?', fr: 'Vous avez besoin d\'un sac ?', en: 'Do you need a bag?' },
    { ko: '카드로 할게요', fr: 'Je paie par carte', en: 'I\'ll pay by card' },
    { ko: '안녕히 가세요 / 안녕히 계세요', fr: 'Au revoir (à qui part / à qui reste)', en: 'Goodbye (to who leaves / to who stays)' }
  ],
  ending: {
    cardKicker: '오늘 배운 말',
    cardTitle: '편의점에 가요',
    cultureTitle: '문화 한 조각',
    culture: ['나가는 사람에게는 "안녕히 가세요", 남는 사람에게는 "안녕히 계세요"라고 해요.', '한국 편의점에서는 컵라면을 사서 뜨거운 물을 붓고 가게 안에서 바로 먹기도 해요.', '값은 "천 원, 이천 원, 삼천 원"처럼 읽어요. 1,000원은 "일천 원"이 아니라 "천 원"이에요.'],
    cultureSrc: '',
    free: '더 둘러보기', restart: '처음부터 다시', exit: '나가기'
  },
  wrist: '오늘 할 일'
};
