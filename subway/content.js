/* 「지하철을 타요」 v0.1 — 한국어 학습맵 4판: 지하철역에서 교통카드 충전·길 묻기·갈아타기·출구 찾기 (2026-10-21)
   휴먼쌤 10-21 "그냥 바로 올려 승인받지말고" → 기획안 추천대로: 역무원 = 하나, 갈아타기 한 번, 역 이름 가상, 안내 방송 = 하나 목소리 + 방송 소리, 뜻풀이 fr 기본.
   대사·문화 한 줄·뜻풀이는 모두 [확인 전] 초안. 노선도·역 이름·교통카드는 가상(실제 회사·로고 없음).
   소리 내는 문장은 키 이름이 text 또는 line인 것(tools/voice_lines.mjs가 모은다). 숫자는 소리 낼 때 '일호선·삼 번'처럼 읽는다. */
window.SUBWAY = {
  kicker: '휴먼쌤 월드 · 한국어 배우기',
  title: '지하철을 타요',
  sub: '교통카드를 충전하고, 역무원 하나에게 길을 물어 1호선에서 2호선으로 갈아타고, 바다역 출구까지 가 봐요. 약 12분',
  howHand: '엄지와 검지를 맞대면 집어요. 버튼은 손가락으로 톡 눌러도 돼요.',
  howCtrl: '컨트롤러는 방아쇠로 버튼과 물건을 눌러요.',
  howPhone: '물건이나 표지판을 톡 누르면 이름을 들려줘요.',
  howFlat: '물건이나 표지판을 눌러 이름을 듣고, 하라는 것을 눌러 길을 찾아가요.',
  start: '들어가기',
  credit: '역무원 캐릭터: Tripo로 제작 · 목소리: AI 음성 합성(Qwen3-TTS) · 역·노선도·교통카드는 코드로 그린 가상(실제 회사·로고 없음)',
  guide: { name: '하나', role: '역무원', dot: '#2a9d8f' },
  announcer: { name: '안내 방송', role: '지하철 안', dot: '#e8a33d' },
  me: '나',

  // 노선(가상): 1호선 청록, 2호선 주황. 하나역에서 1호선 → 공원역에서 2호선 → 바다역
  lines: {
    1: { name: '1호선', color: '#2a9d8f', stations: ['학교역', '하나역', '공원역', '병원역'] },
    2: { name: '2호선', color: '#e07a3f', stations: ['시장역', '공원역', '바다역'] }
  },
  // 바다역 출구(3번이 바다)
  exits: [
    { n: 1, to: '버스', toFr: 'bus', toEn: 'bus' },
    { n: 2, to: '시장', toFr: 'marché', toEn: 'market' },
    { n: 3, to: '바다', toFr: 'mer', toEn: 'sea' },
    { n: 4, to: '병원', toFr: 'hôpital', toEn: 'hospital' }
  ],
  exitAnswer: 3,

  // 낱말 10개. line = 누르면 하나가 하는 말(이름 다음에)
  words: [
    { id: 'jihacheol',  ko: '지하철',   ro: 'jihacheol',    fr: 'métro',                       en: 'subway, metro',     line: '지하철이에요.' },
    { id: 'yeok',       ko: '역',       ro: 'yeok',         fr: 'station',                     en: 'station',           line: '여기는 하나역이에요.' },
    { id: 'kadeu',      ko: '교통카드', ro: 'gyotong kadeu', fr: 'carte de transport',         en: 'transit card',      line: '교통카드예요.' },
    { id: 'chungjeon',  ko: '충전',     ro: 'chungjeon',    fr: 'recharger (la carte)',        en: 'top-up, recharge',  line: '여기서 교통카드를 충전해요.' },
    { id: 'gaechalgu',  ko: '개찰구',   ro: 'gaechalgu',    fr: 'portillon (d\'accès)',        en: 'ticket gate',       line: '개찰구예요. 카드를 대고 지나가요.' },
    { id: 'chulgu',     ko: '출구',     ro: 'chulgu',       fr: 'sortie',                      en: 'exit',              line: '출구예요. 여기로 밖에 나가요.' },
    { id: 'yeongmuwon', ko: '역무원',   ro: 'yeongmuwon',   fr: 'agent de station',            en: 'station staff',     line: '저는 역무원이에요.' },
    { id: 'hoseon',     ko: '호선',     ro: 'hoseon',       fr: 'ligne (n°)',                  en: 'line (number)',     line: '1호선이에요.' },
    { id: 'banghyang',  ko: '방향',     ro: 'banghyang',    fr: 'direction',                   en: 'direction',         line: '공원역 방향이에요.' },
    { id: 'garatayo',   ko: '갈아타요', ro: 'garatayo',     fr: 'changer (de ligne)',          en: 'transfer, change',  line: '여기서 2호선으로 갈아타요.' }
  ],
  repeatWords: ['kadeu', 'chulgu', 'garatayo'],

  hello: [
    { text: '안녕하세요! 여기는 하나역이에요.', choices: ['안녕하세요!'], gloss: { fr: 'Bonjour ! Ici, c\'est la station Hana.', en: 'Hello! This is Hana Station.' } },
    { text: '저는 역무원 하나예요. 오늘은 같이 지하철을 타 봐요.', choices: ['좋아요!'], gloss: { fr: 'Je suis Hana, agente de station. Aujourd\'hui, prenons le métro ensemble.', en: 'I\'m Hana, the station staff. Today let\'s take the subway together.' } },
    { text: '먼저 역에 있는 것들 이름을 들어 봐요.', choices: ['네!'], gloss: { fr: 'D\'abord, écoutons les noms des choses de la station.', en: 'First, let\'s listen to the names of things in the station.' } }
  ],
  listen: { title: '이름 듣기', counter: '들은 말',
    ask: { text: '역에 있는 것을 톡 눌러 보세요. 다섯 개 들으면 다음으로 가요.' },
    done: { text: '잘 들었어요! 이제 따라 말해 봐요.' } },
  repeat: { title: '따라 말하기', card: '따라 말해 보세요', again: '다시 듣기', said: '말했어요', good: '좋아요!',
    ask: { text: '제가 말하면 따라 말해 보세요.' }, done: { text: '목소리가 좋아요!' } },

  charge: { title: '충전하기',
    msgIntro: { text: '친구한테서 메시지가 왔어요.', choices: ['읽어 볼게요'], gloss: { fr: 'Vous avez reçu un message d\'un ami.', en: 'You got a message from a friend.' } },
    msg: { from: '친구 메시지', body: '바다역에서 만나요! 바다 쪽 출구로 나와요.', gloss: { fr: 'On se retrouve à la station Bada (la mer) ! Prends la sortie côté mer.', en: 'Let\'s meet at Bada (Sea) Station! Come out the exit on the sea side.' } },
    first: { text: '먼저 교통카드를 충전해요.', choices: ['네!'], gloss: { fr: 'D\'abord, rechargeons la carte de transport.', en: 'First, let\'s top up the transit card.' } },
    ask: { me: '교통카드 어디서 충전해요?', gloss: { fr: 'Où est-ce que je recharge la carte de transport ?', en: 'Where do I top up my transit card?' } },
    answer: { text: '저기 기계에서 충전해요.', gloss: { fr: 'On la recharge à la machine, là-bas.', en: 'You top it up at the machine over there.' } },
    put: { text: '교통카드를 눌러 기계에 올려 주세요.' },
    how: { text: '얼마 충전할까요?', choices: ['오천 원', '만 원'], gloss: { fr: 'Combien voulez-vous recharger ? → 5 000 wons / 10 000 wons', en: 'How much would you like to add? → 5,000 won / 10,000 won' } },
    done: [{ text: '오천 원 충전했어요.' }, { text: '만 원 충전했어요.' }],
    machine: '충전 기계' },

  way: { title: '길 묻기',
    ask: { me: '바다역 어떻게 가요?', gloss: { fr: 'Comment je vais à la station Bada ?', en: 'How do I get to Bada Station?' } },
    answer: { text: '1호선을 타고 공원역에서 2호선으로 갈아타요.', choices: ['아, 그렇군요.'], gloss: { fr: 'Prenez la ligne 1, puis changez pour la ligne 2 à la station Gongwon (le parc).', en: 'Take Line 1, then transfer to Line 2 at Gongwon (Park) Station.' } },
    q1: { text: '그럼 여기서 몇 호선 타요?', choices: ['1호선', '2호선'], answer: 0, gloss: { fr: 'Alors, ici, vous prenez quelle ligne ?', en: 'So which line do you take here?' },
      ok: { text: '맞아요! 1호선을 타요.' }, wrong: { text: '아니에요. 여기서는 1호선을 타요.' } },
    q2: { text: '어디에서 갈아타요?', choices: ['공원역', '시장역'], answer: 0, gloss: { fr: 'Où est-ce qu\'on change ?', en: 'Where do you transfer?' },
      ok: { text: '맞아요! 공원역에서 갈아타요.' }, wrong: { text: '아니에요. 공원역에서 갈아타요.' } },
    exitAsk: { me: '몇 번 출구예요?', gloss: { fr: 'C\'est quelle sortie ?', en: 'Which exit is it?' } },
    exitAnswer: { text: '바다는 3번 출구예요.', choices: ['감사합니다!'], gloss: { fr: 'Pour la mer, c\'est la sortie 3.', en: 'For the sea, it\'s Exit 3.' } },
    bye: { text: '조심히 가세요!', choices: ['안녕히 계세요!'], gloss: { fr: 'Bon trajet ! (litt. allez prudemment) → Au revoir !', en: 'Have a safe trip! → Goodbye!' } } },

  ride: { title: '지하철 타기',
    gate: { text: '이제 개찰구로 가요. 교통카드를 눌러 개찰구에 대 보세요.' },
    beep: '삑!',
    gateOk: { text: '좋아요. 지나가세요.' },
    dir: { text: '공원역 방향 표지판을 찾아 눌러 보세요.' },
    dirOk: { text: '네, 맞아요! 공원역 방향이에요.' },
    dirWrong: { text: '그건 학교역 방향이에요. 공원역 방향을 찾아 보세요.' },
    come: { text: '지하철이 와요. 타 볼까요?', choices: ['타요!'], gloss: { fr: 'Le métro arrive. On monte ?', en: 'The train is coming. Shall we get on?' } },
    ann1: { text: '이번 역은 공원역입니다. 2호선으로 갈아타실 분은 이번 역에서 내리세요.', gloss: { fr: 'Prochaine station : Gongwon. Correspondance pour la ligne 2, descendez ici.', en: 'This stop is Gongwon. Transfer here for Line 2.' } },
    q1: { text: '공원역이에요. 어떻게 해요?', choices: ['내려서 갈아타요', '계속 타요'], answer: 0, gloss: { fr: 'C\'est Gongwon. Que faites-vous ? → Je descends et je change / Je reste', en: 'It\'s Gongwon. What do you do? → Get off and transfer / Stay on' },
      wrong: { text: '공원역에서 2호선으로 갈아타야 해요.' } },
    transfer: { text: '갈아타는 곳 표지판을 눌러 보세요.' },
    transferOk: { text: '2호선 타는 곳으로 가요.' },
    come2: { text: '2호선 지하철이 와요. 타요!', choices: ['타요!'], gloss: { fr: 'Le métro de la ligne 2 arrive. On monte !', en: 'The Line 2 train is coming. Let\'s get on!' } },
    ann2: { text: '이번 역은 바다역입니다. 내리실 문은 오른쪽입니다.', gloss: { fr: 'Prochaine station : Bada. Descente à droite.', en: 'This stop is Bada. Doors open on the right.' } },
    q2: { text: '바다역이에요. 어떻게 해요?', choices: ['내려요', '계속 타요'], answer: 0, gloss: { fr: 'C\'est Bada. Que faites-vous ? → Je descends / Je reste', en: 'It\'s Bada. What do you do? → Get off / Stay on' },
      wrong: { text: '바다역에서 내려야 해요.' } } },

  exit: { title: '출구 찾기',
    ask: { text: '바다역이에요! 바다는 몇 번 출구였지요? 출구 표지판을 눌러 보세요.' },
    wrong: [{ text: '그건 1번 출구예요. 바다는 3번 출구예요.' }, { text: '그건 2번 출구예요. 바다는 3번 출구예요.' }, null, { text: '그건 4번 출구예요. 바다는 3번 출구예요.' }],
    ok: { text: '네, 3번 출구예요! 바다가 보여요.' },
    met: { text: '친구를 만났어요! 오늘 지하철을 잘 탔어요.', choices: ['감사합니다!'], gloss: { fr: 'Vous avez retrouvé votre ami ! Vous avez bien pris le métro aujourd\'hui.', en: 'You met your friend! You did great on the subway today.' } } },

  phrases: [
    { ko: '○○역 어떻게 가요?', fr: 'Comment je vais à la station ○○ ?', en: 'How do I get to ○○ Station?' },
    { ko: '몇 호선 타요? — 1호선 타요', fr: 'Quelle ligne je prends ? — La ligne 1', en: 'Which line? — Line 1' },
    { ko: '공원역에서 갈아타요', fr: 'Je change à Gongwon', en: 'I transfer at Gongwon' },
    { ko: '몇 번 출구예요? — 3번 출구예요', fr: 'Quelle sortie ? — La sortie 3', en: 'Which exit? — Exit 3' },
    { ko: '교통카드 어디서 충전해요?', fr: 'Où recharger la carte de transport ?', en: 'Where do I top up the card?' },
    { ko: '이번 역은 ○○역입니다', fr: 'Prochaine station : ○○', en: 'This stop is ○○' }
  ],
  ending: {
    cardKicker: '오늘 배운 말',
    cardTitle: '지하철을 타요',
    cultureTitle: '문화 한 조각',
    culture: ['호선과 출구 번호는 "일, 이, 삼"으로 읽어요. 1호선은 "일호선", 3번 출구는 "삼 번 출구"예요.',
      '한국 지하철역은 출구마다 번호가 있어서 "3번 출구에서 만나요"처럼 약속을 잡아요.',
      '지하철 안에서는 "이번 역은 ○○역입니다" 안내 방송을 듣고 내려요.'],
    cultureSrc: '',
    free: '더 둘러보기', restart: '처음부터 다시', exit: '나가기'
  },
  wrist: '오늘 할 일'
};
