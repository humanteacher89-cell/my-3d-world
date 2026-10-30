/* =====================================================================
   엑스리아(XREA) 월드 — 내용 설정 (2026-10-30, XR개발부 데스크톱)
   -----------------------------------------------------------------
   월드 1 「휴먼쌤이 누구인가」(../world1/)와 같은 포맷·같은 엔진이다.
   다른 점 둘(휴먼쌤 10-30 지시):
   - NPC(안내 로봇·엑스리아)는 모두 휴머노이드 로봇이다 → guide.robot / human.robot (색만 바꾼다).
   - 문을 열고 들어가면 '누구의 월드로 들어갈까요?'를 묻고, 고른 월드 주소로 간다 → ending.pickWorld.
   엔진(engine.js)은 이 파일만 읽어 월드를 만든다. 글은 모두 여기서 고친다. 코드는 건드리지 않는다.

   표기 규칙
   - 사실은 휴먼쌤이 확인한 것만 쓴다. 엑스리아(XREA)가 무엇인지는 아직 확인 전이라 소개 글은 모두 [확인 전] 초안이다.
   - 답(reply)이 비어 있으면 카드에 fact.pending("휴먼쌤이 직접 채웁니다")이 나온다. 휴먼쌤이 문장을 주면 그 자리에 넣는다.
   - {mainWorld} 같은 중괄호는 아래 vars 값으로 바뀐다. 미션 글에서는 {label}(어제/오늘/내일)도 쓸 수 있다.
   ===================================================================== */
window.WORLD_CONFIG = {
  id: 'hm-xrea',
  version: '0.1 (2026-10-30, 로봇 NPC · 월드 고르기 문)',
  title: '엑스리아 월드',                       /* [확인 전] 월드 이름 표기(엑스리아 / XREA) */
  kicker: 'XREA · 엑스리아 월드',
  subtitle: '약 3분 · 선택지를 누르면 알아서 걸어가요',
  missionOrder: 'guided',

  vars: {
    years: 14,
    yearBase: 2026,
    mainWorld: '엑스리아 월드'
  },

  // 무대: 월드 1과 같은 임시 원형 무대. 하늘·바닥만 로봇 월드 느낌(푸른 새벽)으로.
  stage: {
    preset: 'placeholder',
    sky: { top: '#2b3b6e', hor: '#9fb7d9', bot: '#e9eef5' },
    floor: '#d9dde6', edge: '#4fd8ff', fog: '#9fb7d9'
  },

  // 안내 로봇. robot: 판(plate)·몸(body)·관절(joint)·강조(accent)·눈(eye)·발(feet) 색. true만 써도 기본 색으로 로봇이 된다.
  guide: {
    name: '안내 로봇',
    role: '엑스리아 월드 입구',
    look: [1, 5, 2, 2, 1],
    robot: { plate: '#e3e7ee', body: '#8d97a8', joint: '#2d3240', accent: '#4fd8ff', eye: '#7af0ff', feet: '#9aa3b2' },
    greeting: [
      '어서 오세요. 여기는 엑스리아 월드의 입구예요.',
      { text: '엑스리아가 무엇인지 궁금해서 오셨죠?', choices: [{ label: '네, 궁금해요' }, { label: '엑스리아가 뭐예요?' }] },
      '좋아요. 엑스리아의 어제, 오늘, 내일을 담은 조각이 세 곳에 흩어져 있어요.',
      '제가 길을 안내할게요. 어제의 조각부터 차례로 모아 보세요. 오른쪽 위 목록에 지금 갈 곳이 표시돼요.',
      { text: '세 조각이 다 모이면 엑스리아가 직접 나와 문을 열어 줄 거예요. 준비됐나요?', choices: [{ label: '네, 출발할게요' }] }
    ],
    help: ['화면 아래 버튼을 누르면 제가 안내한 곳으로 알아서 걸어가요. 화면을 끌면 주변을 둘러볼 수 있어요.'],
    afterAll: ['세 조각이 다 모였어요. 이제 엑스리아를 만나러 가요.'],
    afterMeet: ['문 너머에서 누구의 월드로 갈지 고를 수 있어요. 문으로 가 보세요.']
  },

  // 세 조각이 모이면 나오는 주인 로봇 '엑스리아'. [확인 전] 이름·역할 표기
  human: {
    name: '엑스리아',
    role: 'XREA 월드의 주인 로봇',
    look: [0, 0, 0, 5, 2],
    robot: { plate: '#f3eee4', body: '#5d6f99', joint: '#262b3a', accent: '#ffcf5a', eye: '#ffe9a6', feet: '#8e96a8' }
    // model(GLB)은 쓰지 않는다. 코드로 그린 휴머노이드 로봇.
  },

  // 미션(조각) 세 개. 엑스리아 소개는 모두 [확인 전] — 답(reply)이 비어 있어 카드에 "휴먼쌤이 직접 채웁니다"가 나온다.
  missions: [
    {
      id: 'yesterday', label: '어제', title: '엑스리아의 시작',
      color: '#f2a94f', sub: '어떻게 시작됐나',
      arrive: '어제의 조각이에요. 엑스리아가 어떻게 시작됐는지 한 번 골라 보세요.',
      question: '엑스리아는 어떻게 시작됐을까요?',
      choices: [
        { label: '한 사람의 질문에서', reply: '' },
        { label: '여러 사람의 만남에서', reply: '' }
      ],
      fact: {
        title: '어제의 엑스리아',
        text: '엑스리아의 시작.',
        pending: '이 조각의 이야기는 휴먼쌤이 직접 채웁니다. [확인 전]',
        source: '확인 전'
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
        { label: '무엇을 하나요?', reply: '', fact: '엑스리아가 하는 일', title: '엑스리아가 하는 일' },
        { label: '누가 함께하나요?', reply: '', fact: '엑스리아와 함께하는 사람들', title: '함께하는 사람들' },
        { label: '어디서 만날 수 있나요?', reply: '', fact: '엑스리아를 만나는 곳', title: '만나는 곳' }
      ],
      fact: {
        title: '{chosenTitle}',
        text: '{chosen}.',
        pending: '이 한마디는 휴먼쌤이 직접 채웁니다. [확인 전]',
        source: '확인 전 ({yearBase}년 기준)'
      },
      complete: '세 모습을 모두 봤어요. 오늘의 조각이 완성됐어요.'
    },
    {
      id: 'tomorrow', label: '내일', title: '엑스리아가 그리는 내일',
      color: '#9d8cff', sub: '한 가지 이름',
      collectAll: true,
      arrive: '내일의 조각이에요. 엑스리아에게 궁금한 것을 하나씩 물어보세요.',
      question: '엑스리아에게 무엇을 물어볼까요?',
      moreQuestion: '하나 더 물어볼까요?',
      choices: [
        { label: "'엑스리아(XREA)'는 어떤 뜻인가요?", reply: '' },
        { label: '내일의 엑스리아는 무엇을 하나요?', reply: '' }
      ],
      fact: {
        title: '내일의 엑스리아',
        text: '엑스리아.',
        pending: '이 한마디는 휴먼쌤이 직접 채웁니다. [확인 전]',
        source: '확인 전'
      },
      complete: '두 질문을 다 했어요. 내일의 조각이 완성됐어요.'
    }
  ],

  ending: {
    autoAdvance: true,
    lineHold: 1.1,
    gatherTitle: '세 조각이 모였어요',
    appearTitle: '그리고, 엑스리아가',
    // [확인 전] 엑스리아의 인사말
    lines: [
      '안녕하세요. 엑스리아 월드를 지키는 로봇, 엑스리아예요.',
      '어제, 오늘, 내일. 세 조각을 모아 주셔서 고마워요.',
      '이제 문을 열어 드릴게요. 문 너머에서 누구의 월드로 갈지 골라 보세요.'
    ],
    doorTitle: '월드들로 가는 문',
    enterLabel: '문으로 들어가기',
    stayLabel: '조금 더 머물기',

    // 문 너머: '누구의 월드로 들어갈까요?' 고르기 화면(휴먼쌤 10-30). 고르면 그 주소로 간다.
    // worlds[]: name(이름) · sub(한 줄) · url(같은 사이트 안 상대 주소) · urlAbs(그 밖에서 열 때 절대 주소) · ready:false(준비 중, 누르면 안내만).
    // 월드를 더하려면 이 목록에 한 줄만 더한다.
    pickWorld: {
      asker: '엑스리아', askerRole: 'XREA 월드의 주인 로봇',
      kicker: 'XREA · 문 너머',
      title: '누구의 월드로 들어갈까요?',
      sub: '고르면 그 월드로 바로 이어져요.',
      worlds: [
        { name: '휴먼쌤의 월드', sub: '휴먼쌤이 누구인가 · 첫 번째 월드', url: '../world1/', urlAbs: 'https://humanssaem-world.pages.dev/world1/' },
        { name: '준비 중인 월드', sub: '다음 월드는 휴먼쌤이 정해요', ready: false }
      ],
      soonToast: '그 월드는 아직 준비 중이에요.',
      back: '조금 더 머물기',
      leaving: '{name}로 이동합니다'
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
    meetHuman: '엑스리아 만나러 가기',
    meetHumanSub: '세 조각이 모였어요',
    meetAgain: '엑스리아 다시 만나기',
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
    where: { hub: '안내 로봇 곁', door: '문 앞' }
  }
};
