/* =====================================================================
   엑스리아(XREA) 월드 — 내용 설정 (2026-10-30, XR개발부 데스크톱)
   -----------------------------------------------------------------
   월드 1 「휴먼쌤이 누구인가」(../world1/)와 같은 포맷·같은 엔진이다.
   다른 점 둘(휴먼쌤 10-30 지시):
   - NPC(안내 로봇·엑스리아)는 모두 휴머노이드 로봇이다 → guide.robot / human.robot (색만 바꾼다).
   - 문을 열고 들어가면 '누구의 월드로 들어갈까요?'를 묻고, 고른 월드 주소로 간다 → ending.pickWorld.
   엔진(engine.js)은 이 파일만 읽어 월드를 만든다. 글은 모두 여기서 고친다. 코드는 건드리지 않는다.

   표기 규칙
   - 엑스리아(XREA) = (사)한국가상융합교육협회(구 XR메타버스교사협회), 휴먼쌤 10-30 확인. 사실은 xrea.kr(2026-10-30 확인)과
     김수현 회장 인터뷰(교육정보신문 te.co.kr 24649)·META상 기사(te.co.kr 27464)에서 가져왔고, 카드의 source에 출처를 적는다.
   - 회장 = 휴먼쌤 김수현(휴먼쌤 확인 2026-10-01 + 인터뷰). 연혁·숫자는 xrea.kr '걸어온 길'·소개 수치 그대로.
   - 답(reply)이 비어 있으면 카드에 fact.pending이 나온다(지금은 모두 채움).
   - {mainWorld} 같은 중괄호는 아래 vars 값으로 바뀐다. 미션 글에서는 {label}(어제/오늘/내일)도 쓸 수 있다.
   ===================================================================== */
window.WORLD_CONFIG = {
  id: 'hm-xrea',
  version: '0.1 (2026-10-30, 로봇 NPC · 월드 고르기 문)',
  title: '엑스리아 월드',
  kicker: 'XREA · (사)한국가상융합교육협회',
  subtitle: '약 3분 · 선택지를 누르면 알아서 걸어가요',
  missionOrder: 'guided',

  vars: {
    years: 14,
    yearBase: 2026,
    mainWorld: '엑스리아 월드'
  },

  // 무대: 'holodeck' = 시안 C 화이트 홀로그램 데크(2026-10-30, 시험판 — 휴먼쌤 확인 전). 'placeholder'로 바꾸면 월드 1과 같은 임시 원형 무대.
  // edge = 홀로그램 빛 색(격자·테두리·포털), floor = 데크 색
  // 시안 비교용(2026-10-30): 'orbit' = A 궤도 플랫폼, 'holodeck' = C 화이트 홀로그램 데크. 하늘 색은 무대마다 아래 둘 중 하나를 쓴다.
  //   holodeck: sky { top '#8fb8e6', hor '#e6eff8', bot '#f6f8fb' }, floor '#f4f6f9', fog '#e6eff8'
  stage: {
    preset: 'orbit',
    sky: { top: '#05081a', hor: '#1a2a55', bot: '#04060f' },
    floor: '#0f1626', edge: '#4fd8ff', fog: '#0f1a3a',
    // 블렌더로 짓고 빛을 구운 무대(휴먼쌤 10-30 "A로 만들어줘"): PC판·폰판. 만드는 법은 tools\unity\projects\vr-maps\xrea\blender\orbit_build.py. 못 불러오면 코드 무대
    model: { url: 'assets/stage-orbit.glb', lite: 'assets/stage-orbit-m.glb' }
  },

  // 안내 로봇. robot: 판(plate)·몸(body)·관절(joint)·강조(accent)·눈(eye)·발(feet) 색. true만 써도 기본 색으로 로봇이 된다.
  guide: {
    name: '안내 로봇',
    role: '엑스리아 월드 입구',
    look: [1, 5, 2, 2, 1],
    // 코드 로봇(GLB를 못 불러올 때 대체): 판·몸·관절·강조·눈·발 색
    robot: { plate: '#e3e7ee', body: '#8d97a8', joint: '#2d3240', accent: '#4fd8ff', eye: '#7af0ff', feet: '#9aa3b2' },
    // 휴머노이드 로봇 3D(휴먼쌤 10-30 "퀄리티 좋은 휴머노이드… 언리얼 플레이어 로봇 같은"): Mixamo X Bot, three.js r147 예제 배포본(Xbot.glb, 2.9MB, 동작 idle·walk·run·agree·headShake).
    // tint: 재질 이름에 joint가 들면 관절색, 아니면 몸색. wave 자리에 'agree'(끄덕임)를 쓴다(손 인사 동작이 없음)
    model: {
      url: 'assets/xbot.glb', height: 1.74, idle: 'idle', walk: 'walk', wave: 'agree', glow: 0, tagColor: '#4fd8ff',
      tint: { body: '#dde3ec', joint: '#2a3140', metal: 0.55, rough: 0.38, emissive: '#4fd8ff', emissiveIntensity: 0.05 },
      talk: { idleSwap: 0, gesture: 0.9 },
      poseFix: { armSpread: 0, shoulderLift: 0, armLength: 1, spineBend: 0, neckBend: 0, headBend: 0 }
    },
    greeting: [
      '어서 오세요. 여기는 엑스리아 월드의 입구예요. 엑스리아는 (사)한국가상융합교육협회의 다른 이름이에요.',
      { text: '엑스리아가 무엇인지 궁금해서 오셨죠?', choices: [{ label: '네, 궁금해요' }, { label: '엑스리아가 뭐예요?' }] },
      '좋아요. 교실에서 시작한 작은 연구회가 어떻게 협회가 됐는지, 어제·오늘·내일을 담은 조각이 세 곳에 흩어져 있어요.',
      '제가 길을 안내할게요. 어제의 조각부터 차례로 모아 보세요. 오른쪽 위 목록에 지금 갈 곳이 표시돼요.',
      { text: '세 조각이 다 모이면 저 뒤의 문이 열려요. 준비됐나요?', choices: [{ label: '네, 출발할게요' }] }
    ],
    help: ['화면 아래 버튼을 누르면 제가 안내한 곳으로 알아서 걸어가요. 화면을 끌면 주변을 둘러볼 수 있어요.'],
    afterAll: ['세 조각이 다 모였어요. 문 앞으로 가 보세요. 조각이 모이면 문이 열릴 거예요.'],
    afterMeet: ['문이 열렸어요. 문을 지나 밖으로 나가면 누구의 월드로 갈지 고를 수 있어요.']
  },

  // (안 씀) 세 조각이 모였을 때 나오던 주인 로봇 '엑스리아'. 휴먼쌤 10-30 "로봇 없애고 주인공이 걸어가서 문 밖으로 나가는 컨셉" → ending.noHost: true 로 끔.
  // noHost를 지우면 예전처럼 이 로봇이 나와 인사하고 문을 연다.
  human: {
    name: '엑스리아',
    role: '(사)한국가상융합교육협회 안내 로봇',
    look: [0, 0, 0, 5, 2],
    // 코드 로봇(GLB를 못 불러올 때 대체)
    robot: { plate: '#f3eee4', body: '#5d6f99', joint: '#262b3a', accent: '#ffcf5a', eye: '#ffe9a6', feet: '#8e96a8' },
    // 같은 X Bot을 따뜻한 흰색·금빛으로. 인사는 'agree'(끄덕임)
    model: {
      url: 'assets/xbot.glb', height: 1.80, idle: 'idle', idle2: 'idle', wave: 'agree', glow: 0, tagColor: '#ffcf5a',
      tint: { body: '#f1ece2', joint: '#3a3550', metal: 0.5, rough: 0.4, emissive: '#ffcf5a', emissiveIntensity: 0.05 },
      talkIdles: [],
      talk: { idleSwap: 0, gesture: 1.0 },
      poseFix: { armSpread: 0, shoulderLift: 0, armLength: 1, spineBend: 0, neckBend: 0, headBend: 0 }
    }
  },

  // 플레이어(방문자) = 만화풍 휴먼쌤 3D(언리얼 HumanssamToon을 GLB로 옮긴 것, 휴먼쌤 10-30 "기존의 '휴먼쌤' 3D 캐릭터(실사형 말고 귀엽게 새로 만든걸로)").
  // 못 불러오면 월드 1의 만화풍 여행자 캐릭터. step: 걷기 동작 1배속에서 발이 나가는 속도(m/초) — 미끄러지면 이 값을 고친다
  player: {
    model: {
      url: 'assets/humanssam_toon.glb', height: 1.65, idle: 'idle', walk: 'walk', wave: 'wave', glow: 0.25, step: 1.4,   /* 걷기 FBX 측정값 1.40m/초(walk_info.json) */
      armTuck: 0,   /* 걷기 동작에서 팔이 벌어지면 몸 쪽으로 모으는 각(라디안). 10-30 저녁 걷기를 다시 구워 0으로 둠 */
      talk: { idleSwap: 0, gesture: 0 },
      poseFix: { armSpread: 0, shoulderLift: 0, armLength: 1, spineBend: 0, neckBend: 0, headBend: 0 }
    }
  },

  // 미션(조각) 세 개. 사실은 xrea.kr(2026-10-30 확인)과 김수현 회장 인터뷰(te.co.kr)에서.
  missions: [
    {
      id: 'yesterday', label: '어제', title: '교실에서 시작한 연구회',
      color: '#f2a94f', sub: '2022년 3월 → 2026년 9월',
      arrive: '어제의 조각이에요. 엑스리아가 어떻게 시작됐는지 한 번 골라 보세요.',
      question: '엑스리아는 어떻게 시작됐을까요?',
      choices: [
        { label: '선생님들의 작은 연구회에서', reply: '맞아요. 교실에서 메타버스를 써 보던 선생님들의 연구회가 첫걸음이었어요. 그 첫걸음을 뗀 선생님이 휴먼쌤 김수현이에요.' },
        { label: '큰 회사나 기관이 세웠다', reply: '아니에요. 회사가 아니라 교실에서 시작했어요. 선생님들의 작은 연구회가 첫걸음이었고, 세운 사람은 휴먼쌤 김수현이에요.' }
      ],
      fact: {
        title: '어제의 엑스리아',
        // 연표(그림틀). 글 대신 점과 선으로 보여 준다
        viz: { timeline: [
          { t: '2022년 3월', s: '메타버스활용교육연구회 출범' },
          { t: '2023년 9월', s: 'XR메타버스교사연구회로 개편' },
          { t: '2024년 2월', s: 'XR메타버스교사협회 창립' },
          { t: '2026년 9월', s: '(사)한국가상융합교육협회 설립' }
        ] },
        text: '교실의 연구회에서 사단법인까지, 4년 반의 길.',
        source: 'xrea.kr 걸어온 길 · 교육정보신문 인터뷰 (2026-10-30 확인)'
      }
    },
    {
      id: 'today', label: '오늘', title: '엑스리아가 하는 일',
      color: '#5cc3b4', sub: '세 가지 모습',
      collectAll: true,
      arrive: '오늘의 조각이에요. 엑스리아의 세 모습을 하나씩 들여다보세요.',
      question: '오늘의 엑스리아, 무엇을 먼저 볼까요?',
      moreQuestion: '다른 모습도 들여다볼까요?',
      choices: [
        { label: '무엇을 하나요?', reply: '여섯 갈래예요. 교실에서 쓸 자료와 콘텐츠를 만들고, 선생님과 학생을 가르치고, 사람들을 모으고, 연구하고, 기관과 손을 잡아요.',
          viz: { grid: ['수업자료 개발', 'AI·XR 콘텐츠 개발', '교사·학생·기관 연수', '세미나·대회·박람회', '교육연구', '기관 협업'] },
          fact: '수업자료 · 콘텐츠 · 연수 · 행사 · 연구 · 협업, 여섯 갈래', title: '하는 일' },
        { label: '누가 함께하나요?', reply: '전국의 초등·중등·고등·특수·보건 선생님들이에요. 회장은 휴먼쌤 김수현 선생님이에요.',
          viz: { stats: [{ n: '60명', s: '교사회원' }, { n: '2,500명', s: 'VR 연수 누적 수료' }, { n: '5갈래', s: '초등·중등·고등·특수·보건' }] },
          fact: '교사회원 60명 · VR 연수 누적 2,500명 · 회장 휴먼쌤', title: '함께하는 사람들' },
        { label: '어떤 성과가 있나요?', reply: '세미나와 해커톤을 해마다 열고, 경진대회에서도 상을 받았어요. 프랑스한글학교협의회 같은 기관과도 손을 잡고 있어요.',
          viz: { stats: [{ n: '2회', s: '가상융합교육세미나 2025·2026년 8월' }, { n: '2회', s: 'XR해커톤 대회 2025·2026년 1월' }, { n: '입상', s: '2025 메타버스개발자경진대회' }] },
          fact: '세미나 2회 · XR해커톤 2회 · 2025 메타버스개발자경진대회 입상', title: '걸어온 성과' }
      ],
      fact: {
        title: '{chosenTitle}',
        text: '{chosen}.',
        source: 'xrea.kr 소개·주요활동 ({yearBase}년 10월 확인)'
      },
      complete: '세 모습을 모두 봤어요. 오늘의 조각이 완성됐어요.'
    },
    {
      id: 'tomorrow', label: '내일', title: '경험의 경계를 넘나드는 교육',
      color: '#9d8cff', sub: 'New learning era, XREA.',
      collectAll: true,
      arrive: '내일의 조각이에요. 엑스리아에게 궁금한 것을 하나씩 물어보세요.',
      question: '엑스리아에게 무엇을 물어볼까요?',
      moreQuestion: '하나 더 물어볼까요?',
      choices: [
        { label: "'엑스리아(XREA)'는 어떤 뜻인가요?", reply: '한국가상융합교육협회의 영문 이름을 줄인 말이에요. 그래서 \'엑스리아\'라고 불러요.',
          viz: { stats: [{ n: 'XR', s: '확장현실' }, { n: 'E', s: 'Education · 교육' }, { n: 'A', s: 'Association · 협회' }], quote: { text: '"New learning era, XREA."', by: '새로운 배움의 시대 · xrea.kr' } },
          fact: 'XR Education Association', title: '엑스리아라는 이름' },
        { label: '내일의 엑스리아는 무엇을 하나요?', reply: '경험의 경계를 넘나드는 교육을 더 많은 교실로 넓히고, 윤리 교육이 공교육 안에 자리 잡게 하는 것이 내일의 일이에요.',
          viz: { quote: { text: '"XR 기술을 활용한 미래 교육 생태계를 만들어 나갑니다."', by: 'xrea.kr' }, steps: ['안전한 환경', '온전한 자아', '유의미한 경험'], note: '김수현 회장이 말하는 세 단계 윤리 교육' },
          fact: 'XR로 만드는 미래 교육 생태계', title: '내일의 엑스리아' }
      ],
      fact: {
        title: '{chosenTitle}',
        text: '{chosen}.',
        source: 'xrea.kr 슬로건 · 김수현 회장 인터뷰(교육정보신문)'
      },
      complete: '두 질문을 다 했어요. 내일의 조각이 완성됐어요.'
    }
  ],

  ending: {
    noHost: true,               // 주인(로봇) 없이: 세 조각이 문 앞에 모이면 문이 열리고, 주인공이 문을 지나 밖으로 걸어 나간 뒤 '누구의 월드로' 고르기
    autoAdvance: true,
    lineHold: 1.1,
    gatherTitle: '세 조각이 모였어요',
    appearTitle: '그리고, 엑스리아가',   // noHost일 때는 안 씀
    // 엑스리아의 인사말(noHost일 때는 안 씀)
    lines: [
      '안녕하세요. 엑스리아 월드를 지키는 로봇, 엑스리아예요.',
      '어제, 오늘, 내일. 세 조각을 모아 주셔서 고마워요. 교실에서 시작한 작은 연구회가 이제 사단법인 한국가상융합교육협회가 됐어요.',
      '이제 문을 열어 드릴게요. 문 너머에는 엑스리아와 함께하는 선생님들의 월드가 하나씩 열려요.'
    ],
    doorTitle: '월드들로 가는 문',
    enterLabel: '문으로 들어가기',
    stayLabel: '조금 더 머물기',

    // 문 너머: '누구의 월드로 들어갈까요?' 고르기 화면(휴먼쌤 10-30). 고르면 그 주소로 간다.
    // worlds[]: name(이름) · sub(한 줄) · url(같은 사이트 안 상대 주소) · urlAbs(그 밖에서 열 때 절대 주소) · ready:false(준비 중, 누르면 안내만).
    // 월드를 더하려면 이 목록에 한 줄만 더한다.
    pickWorld: {
      asker: 'XREA', askerRole: '(사)한국가상융합교육협회',
      kicker: 'XREA · 문 너머',
      title: '누구의 월드로 들어갈까요?',
      sub: '엑스리아와 함께하는 선생님들의 월드예요. 고르면 바로 이어져요.',
      walkLabel: '문 너머로',
      // 휴먼쌤 10-30: "마지막에 '휴먼쌤월드'로 연결하지 말고, 차라리 이 'https://humanssaem-world.pages.dev/ai/' 이걸로 해줘"
      worlds: [
        { name: 'AI가 지은 섬', sub: 'AI가 생각하고 사는 방식 · 휴먼쌤 월드', url: 'https://humanssaem-world.pages.dev/ai/', urlAbs: 'https://humanssaem-world.pages.dev/ai/' },
        { name: '다음 선생님의 월드', sub: '준비 중', ready: false }
      ],
      soonToast: '그 월드는 아직 준비 중이에요.',
      back: '조금 더 머물기',
      leaving: '{name}(으)로 이동합니다'
    },

    // pickWorld를 지우면 예전처럼 '곧 열립니다' 화면
    comingSoon: { kicker: '{mainWorld}', title: '곧 열립니다', text: '문 너머 월드들을 준비하고 있어요.' },
    exitUrl: '',
    exit: { kicker: '엑스리아 월드', title: '월드를 나왔습니다', text: '이 창을 닫아 주세요.', linkLabel: '휴먼쌤 만나러 가기' }
  },

  ui: {
    start: '처음부터 시작하기',
    skipWorld: '건너뛰고 바로 문 너머로',
    checklist: '미션',
    rowMeet: '안내 로봇',
    rowHuman: '엑스리아',
    rowDoor: '문',
    piece: '{label}의 조각',
    pieceDone: '{label}의 조각 완성',
    talkNext: '다음',
    talkLast: '알겠어요',
    greetLast: '출발',
    meetGuide: '안내 로봇과 이야기하기',
    pick: '조각 모으기',
    look: '여기 둘러보기',
    toGuide: '안내 로봇에게 돌아가기',
    elsewhere: '다른 곳으로…',
    back: '돌아가기',
    next: '다음 조각',
    nowBadge: '지금',
    meetHuman: '문 앞으로 가기',
    meetHumanSub: '세 조각이 모였어요',
    meetAgain: '문 열림 다시 보기',
    toDoor: '문으로 가기',
    restart: '처음부터 다시',
    restartAsk: '처음부터 다시 할까요?',
    yes: '네', no: '아니요',
    talkGuide: '안내 로봇과 이야기하기',
    cardClose: '조각 간직하기',
    cardCloseMore: '다음 모습 보기',
    skip: '건너뛰기',
    tapNext: '눌러서 계속',
    arriving: '걸어가는 중',
    arriveNow: '바로 도착하기',
    stayHint: '화면을 누르면 선택지가 다시 나와요.',
    lookHint: '화면을 누르면 둘러보기를 마쳐요.',
    rotateHint: '가로로 돌리면 더 잘 보여요.',
    endExit: '종료',
    endReplay: '엔딩 다시 보기',
    endRestart: '처음부터 다시',
    where: { hub: '안내 로봇 곁', door: '문 앞', beyond: '문 너머' }
  }
};
