/* 「리니네 집에 놀러 가요」(가칭) v0.1 — 한옥 부엌에서 한국어 낱말·인사말을 배우는 맵 (2026-10-18)
   1판 = 공간 ① 부엌·밥상. 리니 대사·문화 한 줄은 모두 [확인 전] 초안(휴먼쌤 확인 뒤 확정).
   뜻풀이(fr·en)는 초안. 공개 전 국립국어원 한국어기초사전과 맞춰 볼 것. 로마자는 국어의 로마자 표기법.
   3D 모양은 지금 임시(코드로 지은 도형). 스케치팹 국가유산청(CC BY 4.0) 에셋으로 바꿀 예정.                   */
window.HANOK = {
  kicker: '휴먼쌤 월드 · 한국어 배우기',
  title: '하나네 집에 놀러 가요',
  sub: '한옥 부엌에서 물건을 집어 이름을 듣고, 하나가 말하는 대로 밥상을 차려 봐요. 약 8분',
  howHand: '엄지와 검지를 맞대면 집어요. 버튼은 손가락으로 톡 눌러도 돼요.',
  howCtrl: '컨트롤러는 옆 버튼(그립)으로 집고, 방아쇠로 버튼을 눌러요.',
  howPhone: '물건을 톡 누르면 이름을 들려줘요. 누른 채 끌면 옮길 수 있어요.',
  howFlat: '물건을 눌러 이름을 듣고, 하나가 말하는 물건을 눌러 밥상에 올려요.',
  start: '놀러 가기',
  credit: '3D 모델: 국가유산청(Korea Heritage Service) · CC BY 4.0 · sketchfab.com/KHS_Asset · 집주인 캐릭터: Tripo로 제작 · 목소리: AI 음성 합성(Qwen3-TTS)',
  guide: { name: '하나', role: '한복 입은 집주인', dot: '#e86a9a' },   // 이름 '하나' — 휴먼쌤 확정(10-18 "그냥 하나로 해")

  // 낱말 10개 — id는 스케치팹 국가유산청 에셋과 1:1(괄호). slot = 밥상 위 자리(x, z: 먹는 사람이 +z 쪽에 앉는다)
  // 밥상 차림은 조사(10-19, hanok\조사-밥상차림.md)대로: 앞줄 왼쪽 밥·오른쪽 국, 김치는 뒷줄, 수저는 국 오른쪽에 숟가락·그 오른쪽 젓가락(손잡이가 상 앞으로 약 3cm 나옴).
  // 물·그릇·비빔밥은 밥상에 올리지 않는다(물은 밥상에 그릇째 올렸다는 출처가 없음, 비빔밥은 한 그릇 음식이라 반상과 따로).
  words: [
    { id: 'bap',      ko: '밥',     ro: 'bap',       fr: 'riz (cuit)',            en: 'cooked rice',       say: '이건 밥이에요.',       note: '밥은 밥상 왼쪽에 놓아요.',                            slot: [-0.15, 0.16] },       // Rice
    { id: 'guk',      ko: '국',     ro: 'guk',       fr: 'soupe',                 en: 'soup',              say: '이건 국이에요.',       note: '국은 밥 오른쪽에 놓아요.',                            slot: [0.05, 0.16] },        // Rice_Soup
    { id: 'kimchi',   ko: '김치',   ro: 'gimchi',    fr: 'kimchi',                en: 'kimchi',            say: '이건 김치예요.',       note: '배추를 소금에 절이고 고춧가루 양념을 해서 만들어요.',  slot: [-0.04, -0.17] },      // Cabbage_Kimchi
    { id: 'bibimbap', ko: '비빔밥', ro: 'bibimbap',  fr: 'bibimbap (riz mélangé)', en: 'bibimbap (mixed rice)', say: '이건 비빔밥이에요.', note: '밥 위에 나물을 올리고 고추장과 함께 비벼 먹어요.',      slot: null },                // Bibimbap
    { id: 'sutgarak', ko: '숟가락', ro: 'sutgarak',  fr: 'cuillère',              en: 'spoon',             say: '이건 숟가락이에요.',   note: '한국에서는 밥과 국을 숟가락으로 먹어요.',              slot: [0.17, 0.33] },        // Spoon_and_Chopsticks(숟가락만)
    { id: 'jeotgarak', ko: '젓가락', ro: 'jeotgarak', fr: 'baguettes',            en: 'chopsticks',        say: '이건 젓가락이에요.',   note: '반찬은 젓가락으로 집어요. 숟가락과 번갈아 써요.',      slot: [0.22, 0.33] },        // Spoon_and_Chopsticks(젓가락만)
    { id: 'mul',      ko: '물',     ro: 'mul',       fr: 'eau',                   en: 'water',             say: '이건 물이에요.',       note: '매우면 물을 마셔요.',                                 slot: null },                // 흰 그릇(geureut 모델)에 물을 담아 보여 준다
    { id: 'geureut',  ko: '그릇',   ro: 'geureut',   fr: 'bol',                   en: 'bowl',              say: '이건 그릇이에요.',     note: '밥그릇, 국그릇처럼 음식 이름 뒤에 붙여요.',            slot: null },                // Unhyun_ White Porcelain Bowl
    { id: 'gamasot',  ko: '가마솥', ro: 'gamasot',   fr: 'chaudron traditionnel (en fonte)', en: 'traditional iron cauldron', say: '이건 가마솥이에요.', note: '부뚜막에 가마솥을 걸고, 아궁이에 불을 때서 밥을 지었어요.', slot: null },   // Cauldron
    { id: 'hangari',  ko: '항아리', ro: 'hangari',   fr: 'jarre (en terre cuite)', en: 'earthenware jar',  say: '이건 항아리예요.',     note: '부엌에서는 큰 항아리에 물을 담아 두었어요. 된장, 간장 항아리는 마당 장독대에 있어요.', slot: null }   // Jar
  ],
  tableWords: ['bap', 'guk', 'kimchi', 'sutgarak', 'jeotgarak'],   // 듣고 하기(밥상 차리기) 순서
  quizWords: ['kimchi', 'sutgarak', 'guk'],                                 // 묻고 답하기
  repeatWords: ['bap', 'kimchi', 'jeotgarak'],                              // 따라 말하기

  hello: [
    { text: '어서 오세요! 여기는 하나네 집이에요.', choices: ['안녕하세요!'], gloss: { fr: 'Bienvenue ! Ici, c\'est chez Hana.', en: 'Welcome! This is Hana\'s house.' } },
    { text: '안녕하세요! 들어오세요.', choices: ['네!'], gloss: { fr: 'Bonjour ! Entrez.', en: 'Hello! Come in.' } },
    { text: '오늘은 같이 밥상을 차려요. 먼저 부엌 물건 이름을 들어 봐요.', choices: ['좋아요'], gloss: { fr: 'Aujourd\'hui, on met la table ensemble. D\'abord, écoutons les noms des objets de la cuisine.', en: 'Today we set the table together. First, let\'s listen to the names of kitchen things.' } }
  ],
  listen: { title: '이름 듣기', ask: '부엌 물건을 톡 눌러 보세요. 이름을 말해 줄게요. 다섯 개 들으면 다음으로 가요.', counter: '들은 말', stove: '부뚜막에도 물건이 있어요. 화면을 끌면 둘러볼 수 있어요.', done: '잘 들었어요! 이제 따라 말해 봐요.' },
  repeat: { title: '따라 말하기', ask: '제가 말하면 따라 말해 보세요.', card: '따라 말해 보세요', again: '다시 듣기', said: '말했어요', good: '좋아요!', done: '목소리가 좋아요!' },
  set: { title: '밥상 차리기', ask: '이제 밥상을 차려요. 제가 말하는 것을 밥상에 올려 주세요.',
         put: '{을를} 밥상에 올려 주세요.', ok: '네, 맞아요! {이에요}.', wrong: '그건 {그이에요}. {을를} 찾아 보세요.', hint: '반짝이는 것을 눌러 보세요.',
         done: '다 차렸어요! 밥은 왼쪽, 국은 오른쪽이에요. 숟가락과 젓가락은 국 오른쪽에 놓아요.' },
  quiz: { title: '묻고 답하기', ask: '이제 제가 물어볼게요.', q: '이게 뭐예요?', ok: '맞아요!', wrong: '아니에요. 이건 {이에요}.', done: '잘했어요!' },
  meal: { title: '같이 먹기',
    move: { text: '이제 밥상을 들고 방으로 가요. 방에서 같이 먹어요.', choices: ['네!'], gloss: { fr: 'Maintenant, on apporte la table dans la chambre. On mange ensemble là-bas.', en: 'Now let\'s carry the table to the room. We\'ll eat together there.' } },   // 부엌에서 차린 상은 안방으로 들고 가서 먹었다(부엌-안방 작은 문, 한국민족문화대백과 '부엌')
    lines: [
      { text: '자, 같이 먹어요!', choices: ['잘 먹겠습니다!'], gloss: { fr: 'Allez, mangeons ensemble ! → « Bon appétit » (je vais bien manger)', en: 'Let\'s eat together! → "I will eat well" (said before a meal)' } },
      { text: '맛있어요?', choices: ['네, 맛있어요!', '조금 매워요.'], gloss: { fr: 'C\'est bon ? → Oui, c\'est bon ! / C\'est un peu épicé.', en: 'Is it good? → Yes, it\'s delicious! / It\'s a little spicy.' },
        reply: ['다행이에요!', '김치가 조금 맵죠? 물 드세요.'] },
      { text: '더 드세요.', choices: ['네, 더 주세요.', '아니요, 괜찮아요.'], gloss: { fr: 'Servez-vous encore. → Oui, encore un peu. / Non merci, ça va.', en: 'Have some more. → Yes, more please. / No, I\'m fine.' },
        reply: ['많이 드세요!', '네, 알겠어요.'] },
      { text: '다 먹었어요?', choices: ['잘 먹었습니다!'], gloss: { fr: 'Vous avez fini ? → « Merci pour le repas » (j\'ai bien mangé)', en: 'All done? → "I ate well" (said after a meal)' } },
      { text: '또 놀러 오세요!', choices: ['네, 또 올게요!'], gloss: { fr: 'Revenez nous voir ! → Oui, je reviendrai !', en: 'Come again! → Yes, I\'ll come again!' } }
    ] },
  phrases: [
    { ko: '어서 오세요', fr: 'Bienvenue', en: 'Welcome' },
    { ko: '안녕하세요', fr: 'Bonjour', en: 'Hello' },
    { ko: '잘 먹겠습니다', fr: 'Bon appétit (avant le repas)', en: 'Thanks for the food (before eating)' },
    { ko: '맛있어요', fr: 'C\'est bon', en: 'It\'s delicious' },
    { ko: '잘 먹었습니다', fr: 'Merci pour le repas (après)', en: 'Thanks for the meal (after eating)' }
  ],
  ending: {
    cardKicker: '오늘 배운 말',
    cardTitle: '하나네 집 · 부엌',
    cultureTitle: '문화 한 조각',
    culture: ['밥은 왼쪽, 국은 오른쪽, 수저는 국 오른쪽에 놓아요.', '어른이 먼저 수저를 들면 같이 먹기 시작해요.', '된장, 간장, 고추장은 마당 장독대 항아리에 담아 두었어요.'],
    cultureSrc: '출처: 한국민족문화대백과사전(반상·수저·장독대), 국가유산청',
    free: '더 둘러보기', restart: '처음부터 다시', exit: '나가기', back: '교실로 돌아가기'
  },
  wrist: '오늘 할 일'
};
