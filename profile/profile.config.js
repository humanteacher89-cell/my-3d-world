/* =====================================================================
   월드 1 「휴먼쌤이 누구인가」 프로필 새 판 — 내용 설정 (2026-11-01, XR개발부 데스크톱)
   -----------------------------------------------------------------
   A안 '휴먼쌤의 교실 전시회'(휴먼쌤 10-31 "A안으로 진행") · 무대 A 햇살 낮 교실(11-01 "A 햇살 낮으로").
   글의 정본은 노션 작업 카드 105 아래 '대본 v1.0 초안'이다. 이 파일은 그 대본을 옮긴 것이고 글은 여기서만 고친다.
   엔진(engine.js)은 엑스리아 월드 엔진을 복사해 교실 무대·조각 넷·리니 따라오기·휴먼쌤 등장·프로필 카드를 더한 것이다.

   지킬 것
   - 캐릭터 휴먼쌤이 말할 때는 실명 없이 '휴먼쌤'만(브랜드북 2절). 실명 '휴먼쌤 김수현'은 칠판 명함·프로필 카드에만.
   - 효과 주장·'최초' 같은 말 없음. 생각주도력 정의·휴먼쌤 ACT·슬로건은 정한 문장 그대로.
   - 자세한 숫자(협회 회원·연수 인원·세미나·해커톤 횟수·입상·보도 건수·육아 기간)는 쓰지 않는다(11-01 휴먼쌤 "숫자는 뺄순없나").
     14년차와 연표 연도는 남긴다. 아이 정보는 '딸 둘'까지.
   - [확인 전] 없음(11-01): 원격연수 플랫폼 이름은 휴먼쌤 확인(대표 강의는 휴먼쌤이 고른 뒤 더함), 엔딩 셋째 줄은 휴먼쌤 "그대로 두기".

   칸 안내
   - 대사 줄은 글자열 또는 { text, choices:[{label}] }(대답 고르기, 어느 쪽이든 다음 줄로).
     { view:'board' }는 그 줄 동안 카메라가 칠판을 비추고, { card:{...} }는 그 줄 동안 카드를 위에 띄운다.
   - 그림틀 viz: 한 덩이 또는 덩이 목록. 덩이 칸 = label(작은 머리글) · quote{text, by, small} · timeline[{t, s}](t는 비워도 됨)
     · grid[칩] · steps[단계 화살표] · books[{title, pub, year, color}](책 모양 카드) · note.
   - summary = '프로필 바로 보기'에서 '조각 하나씩 보기'로 넘겨 볼 때의 카드.
   ===================================================================== */
window.WORLD_CONFIG = {
  id: 'hm-profile',
  version: '1.0 시험판 (2026-11-01)',
  title: '휴먼쌤이 누구인가',
  kicker: '휴먼쌤 월드 · 첫 번째 월드',
  subtitle: '교실 네 곳을 걸으며 휴먼쌤의 조각을 모아요',
  missionOrder: 'guided',
  vars: {},

  // 무대: 블렌더로 짓고 빛을 구운 햇살 낮 교실(tools\unity\projects\vr-maps\world1-profile\blender\classroom_build.py). 못 불러오면 간단한 방.
  // board = 칠판 글(구운 칠판 위에 또렷한 글로 덧그림). bloom = 빛 번짐(밝은 교실이라 약하게)
  stage: {
    preset: 'classroom',
    sky: { top: '#7fb2ea', hor: '#e8f1fb', bot: '#f4efe6' },
    model: { url: 'assets/stage-classroom.glb', lite: 'assets/stage-classroom-m.glb' },
    bloom: { strength: 0.1, threshold: 0.92 },
    board: { name: '휴먼쌤 김수현', role: '생각주도력 키우는 교사아빠', line: 'AI가 답을 주는 시대, 아이가 질문하고 판단하며 삶을 주도하는 힘을 기릅니다' },
    // 전시물 글(조각 자리의 벽·교탁·책장·게시판에 붙는 그림). 대본 카드와 같은 사실만 쓴다
    exhibits: {
      window: [   /* 창가 액자 셋: 창을 보고 서면 왼쪽부터 */
        { big: '청주교대', small: '공군 학사장교 제133기' },
        { big: '2022 → 2026', small: '연구회에서 사단법인까지' },
        { big: '2027', small: '컴퓨터교육 박사과정 입학 예정' }
      ],
      lectern: { title: '지금 하는 일', chips: ['교실', '협회', '집'] },
      shelf: [
        { title: '교사 N잡 백서', pub: '박영스토리', year: '2024.5', color: '#ffd27a' },
        { title: '2025 대한민국 미래 교육 트렌드', pub: '뜨인돌', year: '2024.11', color: '#9cc4ff' }
      ],
      board: {
        title: '생각주도력',
        text: '주체적 사고와 지적 자율성을 바탕으로, 스스로 질문을 세우고 근거를 살피며 자신의 판단을 형성하고 수정해 가는 힘.',
        steps: ['질문하기 Ask', '확인하기 Check', '실천하기 Try'],
        slogan: '휴먼쌤 ACT로 키우는 생각주도력'
      }
    }
  },

  // 안내: 로봇 리니(세계관 '리니가 로봇 학교에서 휴먼쌤에게 수업을 받는다'). 3D는 월드 1 광장의 리니 GLB(동작 idle·talk·walk·wave·wave2).
  // follow = 방문자를 따라 걷는다(뒤 lag m). sayArrive = 조각 자리에 닿으면 리니가 선택지 위에서 한 줄 말한다.
  guide: {
    name: '리니',
    role: '휴먼쌤에게 배우는 로봇',
    look: [1, 5, 2, 2, 1],
    robot: { plate: '#f2f4f7', body: '#9fb3c8', joint: '#2d3240', accent: '#ffb84d', eye: '#7af0ff', feet: '#9aa3b2' },
    model: {
      /* rini-clean.glb = 월드 1 리니 GLB의 텍스처를 정리한 것(work\glb_clean.py, 11-01 휴먼쌤 "떼묻은 모델링"): 조각 사이 검은 바탕 채움 · 노멀·거칠기 그림 뺌 */
      url: 'assets/rini-clean.glb', height: 1.2, idle: 'idle', walk: 'walk', wave: 'wave2', waveStart: 1.4, waveEnd: 5.0, talkClip: 'talk',
      glow: 0.22, step: 1.0, tagColor: '#ffb84d',
      talk: { idleSwap: 0, gesture: 0 },
      poseFix: { armSpread: 0, shoulderLift: 0, armLength: 1, spineBend: 0, neckBend: 0, headBend: 0 }
    },
    follow: { lag: 1.5 },
    sayArrive: true,
    autoGo: true,   /* 인사 끝 '출발'을 누르면 첫 조각으로 바로 같이 걷는다 */
    greeting: [
      '어서 오세요. 저는 리니예요. 이 교실에서 휴먼쌤에게 배우는 로봇이에요.',
      { text: '휴먼쌤이 누구인지 궁금해서 오셨죠?', choices: [{ label: '네, 궁금해요' }, { label: '휴먼쌤이 누구예요?' }] },
      { text: '칠판부터 보세요. 제 선생님을 한 줄로 소개하면 이래요.', view: 'board',
        card: { eyebrow: '칠판 명함', color: '#ffcf5a', title: '휴먼쌤 김수현',
          viz: [ { quote: { text: '생각주도력 키우는 교사아빠, 휴먼쌤' } },
                 { quote: { text: '"AI가 답을 주는 시대, 아이가 질문하고 판단하며 삶을 주도하는 힘을 기릅니다"', small: true } } ] } },
      '교실 네 곳에 선생님의 조각이 있어요. 창가부터 차례로 같이 가요. 네 조각을 다 모으면 선생님이 직접 오실 거예요.'
    ],
    help: ['아래 단추를 누르면 제가 같이 걸어가요. 화면을 끌면 교실을 둘러볼 수 있어요.'],
    afterAll: ['네 조각이 다 모였어요. 교탁 앞으로 가 보세요.'],
    afterMeet: ['앞문 너머에서 선생님이 만든 것들을 고를 수 있어요.']
  },

  // 엔딩에 들어오는 만화풍 휴먼쌤(엑스리아 월드와 같은 GLB, 동작 idle·walk·wave). 앞문으로 들어와 교탁 옆에 선다.
  human: {
    name: '휴먼쌤',
    role: '생각주도력 키우는 교사아빠',
    look: [0, 0, 0, 5, 2],
    model: {
      /* humanssam_toon-clean.glb = 엑스리아 만화풍 휴먼쌤(?v=1031b 걷기 고친 판)의 텍스처를 정리하고 2048로 줄인 것(work\glb_clean.py) */
      url: 'assets/humanssam_toon-clean.glb', height: 1.65, idle: 'idle', walk: 'walk', wave: 'wave', glow: 0.2, step: 1.4, armTuck: 0,
      talk: { idleSwap: 0, gesture: 0 },
      poseFix: { armSpread: 0, shoulderLift: 0, armLength: 1, spineBend: 0, neckBend: 0, headBend: 0 }
    }
  },

  // 조각 넷(자리는 엔진 교실 무대: 창가 · 교탁 · 책장 · 뒤 게시판 순). 색은 무대의 바닥 빛 고리 색과 같다.
  missions: [
    {
      id: 'path', label: '걸어온 길', title: '기술을 거의 안 쓰던 교사가', color: '#f2a84f', sub: '창가 · 연표',
      arrive: '창가 액자에는 선생님이 걸어온 길이 걸려 있어요.',
      question: '코로나가 왔을 때, 휴먼쌤은 어떻게 했을까요?',
      choices: [
        { label: '예전 방식 그대로 수업했다', reply: '원래는 기술을 거의 쓰지 않던 선생님이었어요. 코로나 뒤 필요를 느끼고 그때부터 꾸준히 써 왔어요. 지금도 새 기술 앞에서는 "굳이 왜? 꼭 이걸 써야 될 이유가 있나?"부터 물어요.' },
        { label: '새 기술을 써 보기 시작했다', reply: '원래는 기술을 거의 쓰지 않던 선생님이었어요. 코로나 뒤 필요를 느끼고 그때부터 꾸준히 써 왔어요. 지금도 새 기술 앞에서는 "굳이 왜? 꼭 이걸 써야 될 이유가 있나?"부터 물어요.' }
      ],
      fact: {
        title: '걸어온 길',
        viz: [
          { timeline: [
            { s: '청주교육대학교' },
            { s: '공군 학사장교 제133기' },
            { t: '2026년 14년차', s: '초등교사' },
            { t: '코로나 뒤', s: '기술을 쓰기 시작' },
            { t: '2022.03', s: '메타버스활용교육연구회' },
            { t: '2024.02', s: 'XR메타버스교사협회' },
            { t: '2026.09', s: '사단법인 한국가상융합교육협회' },
            { t: '2027.03 예정', s: '컴퓨터교육 박사과정 입학' }
          ] },
          { label: '별명 — \'휴먼쌤\'이라는 이름의 유래', steps: ['e미남쌤', '인간교사', '휴먼쌤'] }
        ],
        text: '기술을 거의 안 쓰던 교사가, 이유를 먼저 묻고 쓰는 교사가 되기까지.'
      },
      complete: '걸어온 길 조각이 완성됐어요.',
      summary: { title: '걸어온 길' }
    },
    {
      /* 11-01 휴먼쌤 "교실 협회 집처럼 세계를 각각 누르면 조금 지루한 감이 있어서 그냥 한 번에 나오게 … 2~3분 정도에 모든 프로필을" →
         세 모습을 하나씩 고르지 않고 단추 하나로 카드 한 장에 다 보인다(roleRows = 모습마다 아이콘 · 큰 글 · 한 줄 · 칩) */
      id: 'now', label: '지금 하는 일', title: '세 가지 모습', color: '#5cc2b5', sub: '교탁 · 세 모습',
      arrive: '교탁은 선생님이 매일 서는 자리예요. 지금 선생님은 모자를 세 개 써요.',
      question: '선생님의 세 모습을 볼까요?',
      choices: [
        { label: '세 모습 한 번에 보기', reply: '교실 · 협회 · 집, 세 모습을 한 번에 모아 봤어요.' }
      ],
      fact: {
        title: '지금 하는 일',
        viz: [ { roleRows: [
          { icon: 'class', t: '교실', big: '14년차 초등교사', s: '오늘도 교실에서 아이들을 만나요.' },
          { icon: 'org', t: '협회', big: '(사)한국가상융합교육협회 회장', s: '교실에서 메타버스를 써 보던 선생님들의 작은 연구회가 사단법인이 됐어요.', chips: ['협회 이야기는 엑스리아 월드에서'] },
          { icon: 'home', t: '집', big: '딸 둘 아빠', s: '딸 둘을 키우는 아빠예요.', chips: ['가정보육', '육아휴직', '아빠크루'] }
        ] } ],
        text: '교실 · 협회 · 집, 모자 세 개.'
      },
      complete: '지금 하는 일 조각이 완성됐어요.',
      summary: { title: '지금 하는 일' }
    },
    {
      /* 11-01 휴먼쌤 "한 번에 나오게" → 책 · 강의·연수 · 협회 활동을 단추 하나로 카드 한 장에 */
      id: 'built', label: '쌓아 온 것', title: '책 · 강의 · 협회 활동', color: '#6b9eff', sub: '책장 · 세 가지',
      arrive: '책장에는 선생님이 쌓아 온 것들이 꽂혀 있어요.',
      question: '책장에서 꺼내 볼까요?',
      choices: [
        { label: '책장 한 번에 보기', reply: '함께 쓴 책 두 권, 선생님들을 위한 원격연수 강의, 함께 배우는 자리까지 모아 봤어요.' }
      ],
      fact: {
        title: '쌓아 온 것',
        /* 강의·연수: 11-01 휴먼쌤 "맞긴 한데 연수 강의 이력이 훨씬 많아 … 대표적인 것만 골라야 되는데 … 아직 고르지는 않았어" → 플랫폼 이름은 맞음.
           대표 강의를 고르시면 screens의 t(강의 이름) · s(플랫폼)로 바꾼다 */
        viz: [
          { label: '함께 쓴 책 두 권', books: [ { title: '교사 N잡 백서', pub: '박영스토리', year: '2024.5', color: '#ffd27a' },
                                             { title: '2025 대한민국 미래 교육 트렌드', pub: '뜨인돌', year: '2024.11', color: '#9cc4ff' } ] },
          { label: '원격연수 강의', screens: [ { t: '아이스크림', s: '원격연수' }, { t: '비바샘', s: '원격연수' }, { t: '교육사랑', s: '원격연수' } ] },
          { label: '협회 활동 — 함께 배우는 자리', tickets: [ { icon: 'mic', t: '가상융합교육 세미나', s: '협회 행사' }, { icon: 'vr', t: 'XR해커톤', s: '협회 행사' } ] }
        ]
      },
      complete: '쌓아 온 것 조각이 완성됐어요.',
      summary: { title: '쌓아 온 것' }
    },
    {
      id: 'think', label: '생각', title: '생각주도력', color: '#9e8cff', sub: '뒤 게시판 · 글귀',
      arrive: '뒤 게시판에는 선생님이 늘 하는 말이 붙어 있어요.',
      question: '휴먼쌤이 가장 키우고 싶은 힘은 무엇일까요?',
      choices: [
        { label: 'AI를 잘 쓰는 힘', reply: 'AI를 쓰든 쓰지 않든, 생각의 주인이 내가 되는 힘이에요. 선생님은 이 힘을 \'생각주도력\'이라고 불러요.' },
        { label: '스스로 생각을 이끄는 힘', reply: 'AI를 쓰든 쓰지 않든, 생각의 주인이 내가 되는 힘이에요. 선생님은 이 힘을 \'생각주도력\'이라고 불러요.' }
      ],
      fact: {
        title: '생각주도력',
        /* 그림틀: ACT 세 걸음 순환도(cycle) + 정의 글귀 + 슬로건 띠 */
        viz: [
          { label: '휴먼쌤 ACT — 생각주도력을 깨우는 세 걸음',
            cycle: { center: '생각주도력', steps: [ { icon: 'ask', t: '질문하기', e: 'Ask' }, { icon: 'check', t: '확인하기', e: 'Check' }, { icon: 'try', t: '실천하기', e: 'Try' } ] } },
          { label: '생각주도력', quote: { text: '"주체적 사고와 지적 자율성을 바탕으로, 스스로 질문을 세우고 근거를 살피며 자신의 판단을 형성하고 수정해 가는 힘."', small: true } },
          { quote: { text: '휴먼쌤 ACT로 키우는 생각주도력', banner: true } }
        ]
      },
      complete: '네 조각이 다 모였어요.',
      summary: { title: '생각' }
    }
  ],

  ending: {
    autoAdvance: true,
    lineHold: 1.3,
    gatherTitle: '네 조각이 모였어요',
    appearTitle: '',
    guideLine: '네 조각이 다 모였어요. 선생님, 오셨어요!',   /* 휴먼쌤이 앞문으로 걸어 들어오는 동안 리니가 하는 말 */
    humanSpeed: 1.3,
    // 휴먼쌤 인사(캐릭터는 실명 없이). 둘째 줄 11-01 "B로 할게", 셋째 줄 11-01 "그대로 두기"
    lines: [
      '안녕하세요, 휴먼쌤이에요.',
      '제가 하는 일은 하나예요. 아이가 스스로 생각을 이끄는 힘을 기르도록 곁에서 돕는 것.',
      '제 조각을 모아 주셔서 고마워요. 문 너머에서 또 만나요.'
    ],
    doorTitle: '어디로 갈까요?',
    enterLabel: '문으로 가기',
    stayLabel: '교실에 조금 더 있기',

    // 문 너머: 휴먼쌤이 만든 것 고르기(휴먼티처닷컴 칸 셋 + 월드 목록). 묶음(children)은 누르면 그 안 목록.
    // '광장과 섬' = 옛 월드 1 광장(생각놀이섬 창이 광장 왼쪽 섬을 입구로 씀 — 옛 world1/은 손대지 않는다)
    pickWorld: {
      asker: '리니', askerRole: '휴먼쌤 월드 안내',
      kicker: '휴먼쌤 월드 · 문 너머',
      title: '어디로 갈까요?',
      sub: '휴먼쌤이 만든 것들이에요. 하나를 고르면 바로 열려요.',
      walkLabel: '문 너머로',
      worlds: [
        { name: '클라우드', sub: '읽고 활용하는 교육 자료', url: 'https://human-teacher.com/#/cloud' },
        { name: '앱', sub: '설치 없이 주소 하나로 여는 작은 웹 앱', url: 'https://human-teacher.com/#/app' },
        { name: '월드', sub: '걸어 다니며 만나는 3D 월드', pickSub: '하나를 고르면 바로 열려요.', children: [
          { name: '엑스리아 월드', sub: '한국가상융합교육협회의 어제·오늘·내일', url: 'https://human-teacher.com/xrea/' },
          { name: 'AI타운', sub: 'AI가 일하는 방식대로 사는 마을', url: 'https://humanssaem-world.pages.dev/ai/' },
          { name: '유럽 한글학교 메타버스', sub: '프랑스·독일·영국 한글학교의 온라인 로비', url: 'https://humanssaem-hangul-france.pages.dev/eu/' },
          { name: '융합 광장', sub: '학교 교정과 가상 구역이 만나는 광장', url: 'https://humanssaem-world.pages.dev/plaza/' },
          { name: 'XR 과학 실험실', sub: '다섯 가지 · 손으로 하는 과학', pickSub: '하나를 고르면 바로 실험실이 열려요.', children: [
            { name: '공기 분자 실험실', sub: '혼합현실 · 손 집기', url: 'https://humanssaem-world.pages.dev/air/' },
            { name: '빛과 그림자 실험실', sub: '손전등·거울·그림자', url: 'https://humanssaem-world.pages.dev/light/' },
            { name: '물의 상태 변화 실험실', sub: '얼음·물·수증기', url: 'https://humanssaem-world.pages.dev/phase/' },
            { name: '손 위의 태양계', sub: '행성 여덟 · 공전', url: 'https://humanssaem-world.pages.dev/solar/' },
            { name: '심장과 폐 탐험실', sub: '숨쉬기 · 피의 길', url: 'https://humanssaem-world.pages.dev/body/' }
          ] },
          { name: '광장과 섬', sub: '리니를 만나는 광장 · 섬으로 가는 길', url: 'https://humanssaem-world.pages.dev/world1/?plaza=1' }
        ] }
      ],
      backList: '← 돌아가기',
      credit: '음악: "Carefree" · "Heartwarming" Kevin MacLeod (incompetech.com) · CC BY 4.0',   /* assets/music/LICENSE.txt */
      back: '교실에 조금 더 있기',
      leaving: '{name}(으)로 이동합니다'
    },
    exitUrl: '',
    exit: { kicker: '휴먼쌤 월드', title: '월드를 나왔습니다', text: '이 창을 닫아 주세요.' }
  },

  // 프로필 카드(엔딩 뒤 · 시작 화면 '프로필 바로 보기'). '그림으로 저장'은 이 칸으로 1080x1350 그림을 그린다.
  profile: {
    kicker: '휴먼쌤 월드 · 프로필 카드',
    name: '휴먼쌤 김수현',
    role: '생각주도력 키우는 교사아빠',
    avatar: 'assets/avatars/humanssaem.webp',
    color: '#ffcf5a',
    intro: 'AI가 답을 주는 시대, 아이가 질문하고 판단하며 삶을 주도하는 힘을 기릅니다',
    rows: [
      { label: '걸어온 길', text: '기술을 거의 안 쓰던 교사 → 가상융합교육협회 회장', color: '#f2a84f' },
      { label: '지금', text: '14년차 초등교사 · 협회 회장 · 딸 둘 아빠', color: '#5cc2b5' },
      { label: '쌓아 온 것', text: '함께 쓴 책 · 원격연수 강의', color: '#6b9eff' },
      { label: '생각', text: '생각주도력 · 휴먼쌤 ACT', color: '#9e8cff' }
    ],
    channelsTitle: '채널',
    channels: [
      { name: '네프콘', handle: '휴먼쌤의 생각주도력', url: 'https://contents.premium.naver.com/humanteacher/humanteacher89' },
      { name: '스레드', handle: '@human_teacher_', url: 'https://www.threads.com/@human_teacher_' },
      { name: '인스타', handle: '@human_teacher_', url: 'https://www.instagram.com/human_teacher_/' },
      { name: '유튜브', handle: '@human_teacher', url: 'https://www.youtube.com/@human_teacher' },
      { name: '링크 모음', handle: 'litt.ly/humanteacher', url: 'https://litt.ly/humanteacher' }
    ],
    contact: { label: '강의·연수 문의', text: 'litt.ly/humanteacher', url: 'https://litt.ly/humanteacher' },   /* 11-01 휴먼쌤 "litt.ly로 잇기" */
    footer: '휴먼쌤 월드 · 휴먼쌤이 누구인가',
    saveFile: '휴먼쌤-프로필',
    saveHint: '그림 파일로 내려받았어요.',
    saveHintTouch: '저장이 안 되면 그림을 길게 눌러 저장하세요.',
    again: '프로필 카드 다시 보기',
    buttons: { save: '그림으로 저장', toDoor: '문으로 가기', stay: '교실에 조금 더 있기', pieces: '조각 하나씩 보기', tour: '교실 둘러보기', tourSub: '약 3분', door: '문 너머로' }
  },

  ui: {
    start: '처음부터 시작하기',
    startSub: '약 3분',   /* 11-01 휴먼쌤 "2 3분 정도에 모든 프로필을" */
    skipWorld: '프로필 바로 보기',
    skipWorldSub: '1분',
    checklist: '조각 모으기',
    rowMeet: '리니 만나기',
    rowHuman: '휴먼쌤 만나기',
    rowDoor: '문 너머',
    piece: '조각 {n} · {label}',
    pieceDone: '{label} 완성',
    talkNext: '다음',
    talkLast: '알겠어요',
    greetLast: '출발',
    meetGuide: '리니와 이야기하기',
    pick: '조각 모으기',
    look: '여기 둘러보기',
    toGuide: '리니에게 돌아가기',
    elsewhere: '다른 곳으로…',
    back: '돌아가기',
    next: '다음 조각',
    nowBadge: '지금',
    meetHuman: '선생님 만나기',
    meetHumanSub: '네 조각이 모였어요',
    meetAgain: '엔딩 다시 보기',
    toDoor: '문으로 가기',
    restart: '처음부터 다시',
    restartAsk: '처음부터 다시 할까요?',
    yes: '네', no: '아니요',
    talkGuide: '리니와 이야기하기',
    cardClose: '조각 간직하기',
    cardCloseMore: '다른 것도 보기',
    skip: '건너뛰기',
    tapNext: '눌러서 계속',
    arriving: '걸어가는 중',
    arriveNow: '바로 도착하기',
    stayHint: '화면을 누르면 선택지가 다시 나와요.',
    lookHint: '화면을 누르면 둘러보기를 마쳐요.',
    rotateHintLandscape: '세로로 들고 보면 더 잘 보여요.',   /* 11-01 휴먼쌤 "가로 모드는 더 별로고 세로 모드가 더 나은 것 같고" — 가로로 들었을 때만 한 줄 */
    endExit: '종료',
    endReplay: '엔딩 다시 보기',
    endRestart: '처음부터',
    close: '닫기',
    freeWhere: '교실 둘러보기',
    freeHint: '방향키·WASD로 걷거나 바닥을 누르면 걸어가요.',
    freeHintTouch: '왼쪽 아래 막대를 밀거나 바닥을 누르면 걸어가요.',
    freePiece: '{piece} 다시 보기',
    pagerEyebrow: '조각 {n} / {total} · {label}',
    pagerPrev: '‹ 이전',
    pagerNext: '다음 조각 ›',
    pagerProfile: '프로필 카드',
    pagerTour: '교실 둘러보기 (3분)',
    where: { hub: '교실 가운데', door: '교실 앞쪽', beyond: '문 너머' }
  }
};
