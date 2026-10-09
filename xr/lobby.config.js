// 가상융합교육 지도(로비) 설정 v0.1 — 프랑스 한글학교 로비 엔진(lobby.js)을 캠퍼스 판으로 바꿔 쓴다.
// 기획안: XR개발부\핸드오프\20261007-가상융합교육-지도.md (컨셉 A '현실에서 가상으로 건너가는 캠퍼스', 10-07 휴먼쌤 승인).
// 관 6곳 + 융합 광장. 관 이름·주제·글은 모두 [확인 전](섬 이름도 나중에 바꿈). 관 안 공간(rooms)은 개념관부터 하나씩 만든다.
window.LOBBY_CONFIG = {
  version: 'v0.1',
  text: {
    title: '가상융합교육 지도',                     // [확인 전]
    plaza: '융합 광장',                            // [확인 전]
    plazaSub: '여기서 출발해요',
    north: '북',
    flag: 'XR',
    hintTouch: '조이스틱이나 땅을 눌러 걸어요',
    hintMouse: 'W A S D 키나 땅을 눌러 걸어요',
    hintRoom: '안내판과 바닥의 칸을 따라 걸어 보세요',
    map: '전체 지도',
    mapClose: '내 위치로',
    list: '관 목록',
    listTitle: '구역별 관',
    listNote: '관마다 들어가 연수를 마치면 연수 수첩에 도장을 찍어요(준비 중). 관 이름과 내용은 아직 가안이에요.',   // [확인 전]
    noSchools: '아직 표시할 관이 없습니다.',
    close: '닫기',
    enter: '입장하기',
    pending: '준비 중',
    enterBody: '{name} 안은 준비 중이에요. 관은 하나씩 차례로 열려요.',   // [확인 전]
    back: '지도로 돌아가기',
    toLobby: '지도로',
    exitSign: '지도로',
    exitName: '지도로 나가기',
    exitSub: '가상융합교육 지도로 돌아가요',
    exitBtn: '나가기',
    homepage: '자료',
    moreLinks: '더 알아보기',
    overHint: '가고 싶은 곳이나 관을 누르면 바로 가요',
    me: '나',
    bot: '참가자 {n}',
    stat: '{n}명 · {fps}fps',
    botsButton: '시험용 참가자 50명 띄우기',
    botsToast: '시험용 참가자 50명이 광장 근처를 걸어 다녀요',
    loading: '캠퍼스를 펼치는 중',
    loadFail: '3D 도구를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로 고침해 주세요.',
    nameTitle: '캠퍼스에서 쓸 이름',
    nameHint: '비워 두면 손님',
    nameGo: '들어가기',
    nameLook: '모습 바꾸기',
    profileButton: '내 이름·모습 바꾸기',
    mpSolo: '혼자 보기',
    mpWake: '서버 깨우는 중',
    mpWait: '연결하는 중',
    mpOn: '온라인 {n}명',
    mpOff: '연결 끊김 · 다시 연결 중',
    mpFull: '방이 가득 찼어요. 잠시 뒤에 다시 와 주세요.',
    mpFullBadge: '방이 가득 참',
    guest: '손님',
    roomEnter: '{school}에 들어왔어요',
    talk: '말 걸기', open: '펼쳐 보기', photos: '사진 보기', watch: '영상 보기', next: '다음', start: '시작', later: '나중에', listen: '듣기',
    choose: '알맞은 것을 골라 보세요', good: '좋아요!', tryAgain: '다시 골라 볼까요?', done: '완료!', doneBody: '{title}을(를) 마쳤어요.', again: '다시 하기',
    progress: '{i} / {n}', sampleTag: '예시', photoSoon: '사진은 나중에 넣어요', videoSoon: '영상은 나중에 넣어요',
    principal: '안내자', bookSign: '책', albumSign: '사진첩', tvSign: 'TV',
    nextZone: '다음 칸으로', stamped: '연수 수첩에 도장을 찍었어요 (수첩은 준비 중)'   // [확인 전]
  },
  // 밤하늘 캠퍼스: sky = 배경·안개, sea = 판 밖 우주(별), base = 판 테두리
  look: { sky: '#1A2050', sea: '#10153A', base: '#3A3F74', neighbor: '#20264F', neighborLine: '#3A4178', grid: '#7FD6FF', fusionLine: '#9FF0DC' },
  regions: {
    real: { ko: '현실 교정', fr: 'Real Campus', color: '#9CCB84', label: { size: 12 } },
    fusion: { ko: '융합 광장', fr: 'Fusion Plaza', color: '#D9D3EA', label: { size: 9 } },
    virtual: { ko: '가상 구역', fr: 'Virtual Zone', color: '#262D6E', label: { size: 12 } }
  },
  regionOrder: ['fusion', 'real', 'virtual'],
  plaza: { lon: 0, lat: -6 },          // 융합 광장 가운데(포털 앞)
  landmarks: [],
  mountains: [],
  trees: { count: 40, regions: ['real'], colors: ['#7FBF6A', '#6FB15E', '#8CCB76', '#5FA35A', '#94C77E'] },
  charLook: {
    skin: ['#FFE0C7', '#F6CFAE', '#E8B48F', '#C98E66'],
    hair: ['#2B2420', '#4A3428', '#7A4E33', '#B98A57', '#E2C48F', '#6E7FA8'],
    shirt: ['#E0483E', '#2A4D9B', '#F2B544', '#3FA37A', '#8C6CD0', '#FFFFFF', '#F28DB2', '#4FB3D9'],
    pants: ['#2F3A56', '#4A5A78', '#6B5B4B', '#3D6B5A', '#7A4E3A']
  },
  // 같은 Cloudflare 중계 서버를 방 이름만 'xr:'로 나눠 쓴다(하루 요청 한도는 프랑스 로비와 함께 씀)
  multiplayer: { file: 'relay.json', lobbyRoom: 'xr:lobby', roomPrefix: 'xr:', sendHz: 4 },
  contentMap: null,                    // 관리자 저장소(map=fr)는 아직 안 씀
  hallScale: 1.5,                      // 관 건물 크기 배율(판이 넓어 1.5배)
  hallPad: 5.4,                        // 관 건물 가운데에서 입장 발판까지(남쪽, 칸)
  // 관 6곳(lon = 동쪽 x, lat = 북쪽 -z 칸). kind = 건물 모양. 이름·주제 [확인 전]
  // 관 사이 14~27칸(건물 너비의 두 배쯤) — 겹쳐 보이지 않을 만큼만(10-07 14:30 휴먼쌤)
  schools: [
    { id: 'concept', kind: 'dome', name: '개념관', nameFr: '걸을수록 가상이 되는 교실', city: '가상융합교육 · VR·AR·MR·XR', lon: 0, lat: 14 },
    { id: 'cases', kind: 'school', name: '수업 사례관', nameFr: '교과를 고르면 바뀌는 교실', city: '교과별 수업 사례', lon: -25, lat: 9 },
    { id: 'devices', kind: 'headset', name: '장비관', nameFr: '써 보는 쇼룸', city: '헤드셋·AR 안경·360 카메라', lon: -17, lat: -11 },
    { id: 'studio', kind: 'workshop', name: '제작 공방', nameFr: '직접 만드는 작업대', city: '가상 공간 만들기', lon: 17, lat: 9 },
    { id: 'future', kind: 'tower', name: '미래 전망대', nameFr: '내려다보는 다음 교실', city: 'AI × XR · 디지털 트윈', lon: 27, lat: -11 },
    { id: 'safety', kind: 'lighthouse', name: '안전·윤리 등대', nameFr: '불을 켜는 등대', city: '사용 시간 · 예절 · 개인정보', lon: 30, lat: 10 }
  ],
  // 관 안 공간. kind: 'concept' = room.js buildConcept(네 칸 교실), 'cases' = buildCases(교과를 고르면 바뀌는 교실). 글은 모두 [확인 전](가안, 연구부 검증 전)
  rooms: {
    concept: {
      kind: 'concept',
      welcome: '개념관이에요. 왼쪽 입구에서 오른쪽으로 걸을수록 교실이 가상이 돼요',
      principal: {
        name: '리니',
        lines: [
          '안녕하세요! 개념관 안내를 맡은 리니예요.',
          '이 교실은 오른쪽으로 걸을수록 조금씩 가상이 돼요.',
          '현실 → AR → MR → VR, 네 칸을 차례로 지나 보세요.',
          '맨 끝에서 용어 카드 4장과 퀴즈가 기다려요.'
        ]
      },
      guideSub: '칸마다 한 줄씩 설명해요',
      board: { top: '오늘의 질문', title: '가상융합교육이란?', line: '현실 → ? → 가상' },
      zones: [
        { id: 'real', title: '① 현실', sub: '평범한 교실 · 칠판 · 책상 · 지구본', pad: '현실', padSub: '1칸', color: '#FFB36B',
          line: '① 현실: 평범한 교실이에요. 칠판·책상·지구본, 모두 진짜예요.' },
        { id: 'ar', title: '② AR 증강현실', sub: '현실 위에 홀로그램 행성이 떠올라요', pad: 'AR', padSub: '2칸', color: '#6FE9FF',
          line: '② AR: 진짜 교실 위에 홀로그램 행성이 떠올라요. 이름표도 같이 떠요.' },
        { id: 'mr', title: '③ MR 혼합현실', sub: '홀로그램을 손으로 집어 옮겨요', pad: 'MR', padSub: '3칸', color: '#7DFFD1',
          line: '③ MR: 홀로그램이 진짜 책상을 알아보고, 손으로 집어 옮길 수 있어요. 행성이 따라와요.' },
        { id: 'vr', title: '④ VR 가상현실', sub: '벽이 사라지고 우주 한가운데로', pad: 'VR', padSub: '4칸', color: '#FF6FD8',
          line: '④ VR: 벽이 사라지고 우주 한가운데예요. 용어 카드와 퀴즈를 해 보세요.' }
      ],
      holoName: '지구', holoSub: '이름이 떠올라요',
      mrDesk: '진짜 책상', mrDeskSub: '공간을 알아봐요',
      mrPanel: ['손으로 집어서', '옮겨 보세요', '홀로그램 + 진짜 물건'],
      terms: {
        title: '용어 카드', sub: 'VR · AR · MR · XR', sign: '용어 카드 4장', foot: '뜻풀이는 가안이에요. 연구부 검증 뒤 고쳐요.',
        cards: [
          { big: 'VR', name: '가상현실', color: '#FF6FD8', text: '현실을 가리고 완전히 다른 가상의 세계 속에 들어가요. 예: 헤드셋을 쓰고 우주 한가운데에 서기.' },
          { big: 'AR', name: '증강현실', color: '#6FE9FF', text: '진짜 세상 위에 가상의 그림이나 글을 겹쳐 보여요. 예: 책상 위에 떠오르는 홀로그램 행성.' },
          { big: 'MR', name: '혼합현실', color: '#7DFFD1', text: '가상의 것이 진짜 공간을 알아보고, 손으로 집어 옮길 수 있어요. 예: 홀로그램 행성을 진짜 책상 위에 올려 두기.' },
          { big: 'XR', name: '확장현실', color: '#C4B5FD', text: 'VR·AR·MR을 모두 아우르는 말이에요.' }
        ]
      },
      quizSub: '3문제 · 리니가 내요',
      quiz: {
        title: '이건 어느 칸?', npcRole: '퀴즈',
        steps: [
          { npc: '헤드셋을 쓰니 교실이 사라지고 우주 한가운데예요. 어느 칸일까요?',
            choices: [{ ko: 'VR 가상현실', ok: true, note: '현실을 가리고 완전히 가상 속으로!' }, { ko: 'AR 증강현실', hint: '교실이 그대로 보이면 AR이에요.' }, { ko: '현실', hint: '교실에 우주는 없죠.' }] },
          { npc: '진짜 책상 위에 홀로그램 행성이 떠 있고 이름표도 떠요. 교실은 그대로 보여요.',
            choices: [{ ko: 'AR 증강현실', ok: true, note: '진짜 위에 가상을 겹쳤어요.' }, { ko: 'VR 가상현실', hint: '교실이 그대로 보이면 VR이 아니에요.' }, { ko: 'MR 혼합현실', hint: '손으로 집어 옮길 수 있어야 MR이에요.' }] },
          { npc: '홀로그램 행성을 손으로 집어서 진짜 책상 위에 올려 두었어요.',
            choices: [{ ko: 'MR 혼합현실', ok: true, note: '가상이 진짜 공간을 알아보고 손에 반응해요.' }, { ko: '현실', hint: '홀로그램은 현실이 아니죠.' }, { ko: 'AR 증강현실', hint: '겹쳐 보이기만 하면 AR, 집어 옮기면 MR이에요.' }] }
        ]
      },
      stampId: 'concept'
    },
    // 수업 사례관: room.js buildCases(교과를 고르면 바뀌는 교실). 시안 design/mockup-hall-cases.html. 글은 모두 [확인 전], 사례 내용은 휴먼쌤이 줄 것(지금은 들어갈 틀만)
    // 사진첩 사진에는 아이 얼굴을 넣지 않는다. 교과마다 book·tv·album을 따로 적으면 caseTemplate 대신 그것을 보여 준다(tv.video = 유튜브 embed 주소, album.photos = 사진 주소)
    cases: {
      kind: 'cases',
      welcome: '수업 사례관이에요. 칠판에서 교과를 고르면 교실이 바뀌어요',   // [확인 전]
      principal: {
        name: '리니',
        lines: [                                                        // [확인 전]
          '안녕하세요! 수업 사례관 안내를 맡은 리니예요.',
          '① 칠판 앞 발판에서 교과를 골라 보세요.',
          '② 가운데 교실 꾸밈이 그 교과로 바뀌어요.',
          '③ 오른쪽에서 지도안·수업 영상·학생 결과물을 보면 연수 수첩에 도장을 찍어요.'
        ]
      },
      guideSub: '교과부터 골라 보세요',
      board: { title: '교과를 골라 보세요', tag: '예시' },
      stage: { title: '② 바뀌는 교실', sub: '고른 교과에 맞게 꾸밈이 바뀌어요' },
      slot: { title: '사례 들어갈 자리', sub: '휴먼쌤이 주는 사례로 채워요' },
      steps: {
        pick: '교과 고르기', pickSub: '칠판 버튼으로 교과를 골라요', pickPad: '교과', pickBtn: '고르기',
        stage: '바뀐 교실', stageSub: '다른 교과도 골라 보세요', stagePad: '바뀐 교실', stageBtn: '다른 교과',
        view: '세 가지로 보기', viewSub: '책 · TV · 사진첩으로 사례를 봐요',
        bookSub: '지도안', tvSub: '수업 영상', albumSub: '학생 결과물',
        ask: '어떤 교과의 수업 사례를 볼까요?'
      },
      // 교과 6개. kind = 무대 꾸밈 모양(korean·math·science·social·english·arts). line = 고를 때 리니 한 줄 [확인 전]
      subjects: [
        { id: 'korean', name: '국어', kind: 'korean', color: '#F2B544', line: '국어를 골랐어요. 책장과 떠 있는 글자가 나와요.' },
        { id: 'math', name: '수학', kind: 'math', color: '#6FA8FF', line: '수학을 골랐어요. 입체도형이 돌아가요.' },
        { id: 'science', name: '과학', kind: 'science', color: '#7DFFD1', line: '과학을 골랐어요. 실험대와 홀로그램 행성이 나와요.' },
        { id: 'social', name: '사회', kind: 'social', color: '#FF9F6B', line: '사회를 골랐어요. 지구본과 큰 지도가 나와요.' },
        { id: 'english', name: '영어', kind: 'english', color: '#FF6FD8', line: '영어를 골랐어요. 알파벳 블록과 말풍선이 나와요.' },
        { id: 'arts', name: '예체능', kind: 'arts', color: '#C4B5FD', line: '예체능을 골랐어요. 이젤과 피아노가 나와요.' }
      ],
      // 교과별 사례가 아직 없을 때 보여 줄 틀. {name} = 교과 이름
      caseTemplate: {
        book: { title: '{name} 지도안', sub: '예시 · 사례가 들어갈 자리', sample: true,
          text: '휴먼쌤이 줄 {name} 가상융합교육 수업 사례가 여기에 들어가요.\n\n들어갈 내용: 학년과 단원 / 수업 목표 / 쓴 도구(VR·AR·MR 중 무엇, 어떤 앱) / 수업 흐름(도입 · 활동 · 정리) / 학생 반응과 다음에 고칠 점' },
        tv: { title: '{name} 수업 영상 (예시)' },
        album: { title: '{name} 학생 결과물 (예시)', captions: ['결과물 1', '결과물 2', '결과물 3', '결과물 4'] }
      },
      stampId: 'cases'
    },
    /* ==== hall:future 시작 ==== */
    /* 미래 전망대: room.js buildFuture(탑 꼭대기 유리 전망대). 시안 시안/mockup-hall-future.html. 글은 모두 [확인 전](가안, 연구부 검증 전) */
    /* 흐름: 엘리베이터로 올라옴 -> 망원경 1 2 3 4를 차례로 들여다봄(둥근 창) -> 끝 메모판에 한 줄 -> 네 망원경을 다 보고 메모를 남기면 연수 수첩 도장 */
    future: {
      kind: 'future',
      welcome: '미래 전망대로 올라가요. 엘리베이터가 움직이는 동안 잠깐만요',   /* [확인 전] */
      principal: {
        name: '리니',
        lines: [                                                        /* [확인 전] */
          '안녕하세요! 미래 전망대 안내를 맡은 리니예요.',
          '엘리베이터를 타고 올라왔어요. 아래는 사람과 AI가 함께 사는 도시예요.',
          '망원경 ① ② ③ ④를 차례로 들여다보면 다음 교실의 모습이 보여요.',
          '맨 끝 메모판에 "내가 바라는 미래 교실"을 한 줄 남기면 연수 수첩에 도장을 찍어요.'
        ]
      },
      guideSub: '망원경마다 다른 교실이 보여요',
      elevator: { sign: '▲ 엘리베이터' },
      city: { title: '▼ 아래는 공존 도시', sub: '리니가 사는 메인 월드와 같은 세계' },   /* [확인 전] */
      steps: {
        look: '들여다보기', stepWord: '망원경', next: '다음 망원경', toMemo: '메모판으로',
        tag: '예시 · 가안 [확인 전]',
        foot: '그림과 글은 모두 예시예요. 연구부 검증 전이라 나중에 고쳐요.',
        arrive: '도착했어요! 망원경 ①부터 들여다봐요',
        allSeen: '망원경을 모두 봤어요! 오른쪽 끝 메모판에 한 줄을 남겨 보세요'
      },
      scopes: [
        { n: '①', title: 'AI 튜터 교실', sub: 'AI 도우미가 곁에서 도와줘요', pad: 'AI 튜터',
          body: '학생 곁에서 AI 도우미가 모르는 부분을 함께 풀어 줘요. 선생님은 도움이 더 필요한 친구를 먼저 살필 수 있어요.' },
        { n: '②', title: '디지털 트윈 학교', sub: '학교를 똑같이 본뜬 쌍둥이', pad: '트윈',
          body: '진짜 학교를 컴퓨터 속에 똑같이 본뜬 "쌍둥이 학교"예요. 쌍둥이에서 먼저 해 보고, 괜찮으면 진짜 학교에 적용해 볼 수 있어요.' },
        { n: '③', title: '먼 학교와 함께 수업', sub: '멀리 있는 학교와 한 교실처럼', pad: '함께',
          body: '멀리 있는 학교의 교실과 우리 교실이 화면과 가상 공간으로 이어져, 한 교실처럼 함께 수업해요.' },
        { n: '④', title: '홀로그램 수업', sub: '눈앞에 떠오르는 입체 수업', pad: '홀로그램',
          body: '책 속의 그림이 눈앞에 입체로 떠올라요. 손으로 돌려 보고 가까이 들여다보며 배워요.' }
      ],
      memo: {
        title: '내가 바라는 미래 교실', sub: '모두의 쪽지(예시)', exTag: '예:', mine: '내 쪽지', empty: '여기에 붙어요',
        sign: '끝 · 메모판', pad: '메모판', padSub: '한 줄 남기기', btn: '한 줄 쓰기', step: '끝 · 메모판', ask: '한 줄만 남겨요',
        placeholder: '예) 어디서나 함께하는 교실', save: '붙이기', clear: '지우기', needText: '한 줄을 써 주세요',
        note: '이 기기에만 저장돼요. 서버에 올리지 않아요.', saved: '메모판에 붙였어요',
        examples: [['우주', '교실'], ['AI', '짝꿍'], ['하늘', '도서관'], ['로봇', '친구'], ['어디서나', '수업']]   /* 예시 쪽지 [확인 전] */
      },
      stampId: 'future'
    },
    /* ==== hall:future 끝 ==== */
    /* ==== hall:devices 시작 ==== */
    /* 장비관: room.js buildDevices(써 보는 쇼룸). 시안 design/mockup-hall-devices.html. 글은 모두 [확인 전](가안, 연구부 검증 전). 장비 이름은 일반 이름만 쓴다(제품명·숫자 없음) */
    devices: {
      kind: 'devices',
      welcome: '장비관이에요. 벽을 따라 선 장비의 발판에 서 보세요',   /* [확인 전] */
      principal: {
        name: '리니',
        lines: [                                                        /* [확인 전] */
          '안녕하세요! 장비관 안내를 맡은 리니예요.',
          '① 벽을 따라 선 장비 5개 중 하나의 발판에 서 보세요. 장비가 가운데 무대로 날아와요.',
          '② 무대에서 장비가 크게 돌아요. 카드 3장(무엇인가 · 수업에서 어떻게 · 주의할 점)을 읽어 봐요.',
          '③ 헤드셋을 골랐다면 렌즈 시점으로 360 교실을 잠깐 둘러볼 수 있어요.',
          '끝에서 "우리 반엔 어떤 장비?" 상황 고르기 3문제를 풀면 연수 수첩에 도장을 찍어요.'
        ]
      },
      guideSub: '장비마다 한 줄씩 알려 줘요',
      stand: { title: '① 전시대', sub: '벽을 따라 선 장비 5개' },
      stage: { title: '② 회전 무대', sub: '날아와 크게 돌고 카드 3장' },
      /* 칸 4개(바닥 길 발판). line = 칸에 들어설 때 리니 한 줄 [확인 전] */
      zones: [
        { title: '① 전시대', sub: '벽을 따라 선 장비 5개', pad: '①', padSub: '전시대', line: '① 전시대: 벽을 따라 장비 5개가 서 있어요. 발판에 서면 가운데 무대로 날아와요.' },
        { title: '② 회전 무대', sub: '고른 장비가 크게 돌아요', pad: '②', padSub: '무대', line: '② 회전 무대: 고른 장비가 크게 돌아요. 카드 3장으로 알아봐요.' },
        { title: '③ 잠깐 체험', sub: '렌즈 시점으로 360 교실 견학', pad: '③', padSub: '체험', line: '③ 잠깐 체험: 헤드셋을 쓰고 360 교실을 둘러봐요.' },
        { title: '끝 · 상황 고르기', sub: '우리 반엔 어떤 장비?', pad: '끝', padSub: '고르기', line: '끝: 상황을 하나씩 고르며 어울리는 장비를 찾아봐요.' }
      ],
      ui: {
        ask: '어떤 장비를 무대로 불러 볼까요?', pick: '장비 고르기',
        send: '무대로 보내기', toStage: '무대로 가기', standSub: '발판에 서면 장비가 무대로 날아와요', onStage: '지금 무대에 있어요',
        cardsBtn: '카드 3장 보기', cardsSub: '카드 3장', cardsNone: '먼저 전시대에서 장비를 골라요',
        tryLens: '렌즈 시점 써 보기', lensBtn: '써 보기', prev: '이전', draft: '[확인 전] 가안이에요. 연구부 검증 전 글이에요.', cardTag: '가안 [확인 전]'
      },
      /* 전시대 장비 5개(시안 순서: 헤드셋이 무대 쪽 맨 끝). model = 그림 모양. what·how·warn = 카드 3장 글(두 줄씩) [확인 전] */
      gear: [
        { id: 'ar', model: 'glasses', name: 'AR 안경', line: 'AR 안경이 무대로 날아가요. ② 무대에서 카드를 읽어 봐요.',
          what: ['눈앞 진짜 세상 위에', '그림이 겹쳐 보여요'], how: ['예: 책상 위에 떠오르는', '홀로그램 행성 보기'], warn: ['예: 걸어 다닐 때는', '앞을 잘 살피기'] },
        { id: 'cam', model: 'cam360', name: '360 카메라', line: '360 카메라가 무대로 날아가요. ② 무대에서 카드를 읽어 봐요.',
          what: ['사방을 한 번에 찍는', '카메라예요'], how: ['예: 우리 학교를 찍어', '다른 반에 보여 주기'], warn: ['예: 사람이 찍힐 때는', '미리 허락받기'] },
        { id: 'tab', model: 'tablet', name: '태블릿', line: '태블릿이 무대로 날아가요. ② 무대에서 카드를 읽어 봐요.',
          what: ['손가락으로 누르는', '들고 다니는 화면이에요'], how: ['예: 모둠이 한 화면을', '같이 보며 이야기하기'], warn: ['예: 오래 보지 말고', '눈을 자주 쉬어 주기'] },
        { id: 'glove', model: 'glove', name: '햅틱 장갑', line: '햅틱 장갑이 무대로 날아가요. ② 무대에서 카드를 읽어 봐요.',
          what: ['손에 끼면 만지는 느낌을', '전해 주는 장갑이에요'], how: ['예: 가상의 물건을', '손으로 만지며 배우기'], warn: ['예: 손에 잘 맞는지', '먼저 확인하기'] },
        { id: 'vr', model: 'headset', name: 'VR 헤드셋', line: 'VR 헤드셋이 무대로 날아가요. ② 무대에서 카드를 읽고 ③ 체험 칸에서 써 봐요.',
          what: ['머리에 쓰는 화면으로', '가상 공간에 들어가요'], how: ['예: 먼 곳 현장학습,', '360 교실 견학'], warn: ['예: 쉬어 가며 쓰기,', '어지러우면 바로 멈추기'] }
      ],
      /* 카드 3장(key = gear의 글 이름). empty = 장비를 고르기 전 글 */
      cards: [
        { key: 'what', title: '무엇인가', icon: 'q', color: '#6fe9ff', empty: ['장비를 고르면', '여기에 나와요'] },
        { key: 'how', title: '수업에서 어떻게', icon: 'b', color: '#7dffd1', empty: ['예: 교실에서', '쓰는 방법'] },
        { key: 'warn', title: '주의할 점', icon: 'w', color: '#ffd36b', empty: ['예: 쓸 때', '조심할 것'] }
      ],
      lens: { title: '렌즈 시점', sub: '360 교실 견학', note: '[확인 전] 예시 장면이에요. 끌어서 둘러봐요', done: '렌즈 시점 끝! 이제 끝 칸에서 상황 고르기를 해 봐요', fail: '이 기기에서는 3D 장면을 보여 줄 수 없어요' },
      panel: { badge: '끝', title: '우리 반엔 어떤 장비?', sub: '상황을 하나 고르면 어울리는 장비를 알려 줘요', tag: '상황 예시 · 가안 [확인 전]',
        items: ['교실 밖 현장을 보여 주고 싶어요', '다 같이 보며 이야기하고 싶어요', '손으로 만지며 배우고 싶어요'] },
      quizSub: '3문제 · 리니가 내요',
      quiz: {
        title: '우리 반엔 어떤 장비?', npcRole: '상황 고르기 · 예시 [확인 전]',
        steps: [
          { npc: '교실 밖 먼 곳의 현장을 학생들에게 보여 주고 싶어요. 어떤 장비가 어울릴까요?',
            choices: [{ ko: 'VR 헤드셋', ok: true, note: '헤드셋 안에서 먼 곳을 둘러볼 수 있어요.' }, { ko: '태블릿', hint: '태블릿은 같이 화면을 볼 때 좋아요. 현장에 들어간 느낌은 다른 장비가 더 가까워요.' }, { ko: '햅틱 장갑', hint: '장갑은 손에 닿는 느낌을 전해 줘요.' }] },
          { npc: '모둠 친구들과 한 화면을 같이 보며 이야기하고 싶어요. 어떤 장비가 어울릴까요?',
            choices: [{ ko: 'AR 안경', hint: '안경은 보통 쓴 사람이 혼자 보는 화면이에요.' }, { ko: '태블릿', ok: true, note: '여럿이 한 화면을 같이 보기 좋아요.' }, { ko: '360 카메라', hint: '360 카메라는 사방을 찍는 장비예요.' }] },
          { npc: '가상의 물건을 손으로 만지는 느낌으로 배우고 싶어요. 어떤 장비가 어울릴까요?',
            choices: [{ ko: '360 카메라', hint: '카메라는 찍는 장비예요. 만지는 느낌은 전해 주지 못해요.' }, { ko: 'AR 안경', hint: '안경은 눈앞에 그림을 겹쳐 보여 줘요.' }, { ko: '햅틱 장갑', ok: true, note: '손에 끼면 만지는 느낌을 전해 줘요.' }] }
        ]
      },
      stampId: 'devices'
    },
    /* ==== hall:devices 끝 ==== */
    /* ==== hall:studio 시작 ==== */
    // 제작 공방: room.js buildStudio(섬 판을 꾸미고 사진을 찍어 전시 벽에 거는 곳). 시안 design/mockup-hall-studio.html. 글은 모두 [확인 전](가안, 연구부 검증 전)
    // 내 작품(사진)은 이 기기 localStorage('xrStudioWorks')에만 둔다. 서버 없음, 다른 사람 작품은 나중에.
    studio: {
      kind: 'studio',
      welcome: '제작 공방이에요. 섬을 꾸미고 사진을 찍어 전시 벽에 걸어 보세요',   /* [확인 전] */
      principal: {
        name: '리니',
        lines: [                                                        /* [확인 전] */
          '안녕하세요! 제작 공방 안내를 맡은 리니예요.',
          '① 선반에서 부품을 고르고, ② 섬 판 위에 놓고 돌려서 작은 섬을 꾸며요. 되돌리기도 돼요.',
          '③ 카메라 발판에서 사진을 찍으면 ④ 전시 벽에 걸려요. 내 작품은 이 기기에만 저장돼요.',
          '사진을 찍으면 연수 수첩에 도장을 찍어요. 오른쪽 끝에는 학생용 제작 도구 카드 3장이 있어요.'
        ]
      },
      guideSub: '직접 만들고, 찍고, 걸어요',
      steps: {
        shelf: { name: '① 공중 선반', sub: '블록 · 나무 · 캐릭터 · 집', pad: '선반', btn: '부품 고르기', sign: '① 골라서 놓기', signSub: '공중 선반 · 블록 나무 캐릭터 집' },
        island: { name: '② 섬 판', sub: '놓고 돌리며 꾸며요', pad: '섬 판', btn: '꾸미기', sign: '② 돌리며 꾸미기', signSub: '작은 섬 판 위에 놓고 돌려요' },
        camera: { name: '③ 카메라 발판', sub: '꾸민 섬을 사진으로 찍어요', pad: '카메라', btn: '사진 찍기', sign: '③ 사진 찍기', signSub: '카메라 발판에서 찰칵' },
        wall: { name: '④ 전시 벽', sub: '내 작품이 걸려요 (이 기기에만 저장)', pad: '전시 벽', btn: '크게 보기', sign: '④ 전시 벽', signSub: '내 작품만 걸려요' },
        tools: { name: '학생용 제작 도구 카드', sub: '카드 3장 · 예시', pad: '도구', btn: '펼쳐 보기', sign: '학생용 제작 도구 카드', signSub: '도구 카드 1 · 2 · 3' }
      },
      items: [
        { id: 'cube', name: '네모 블록' }, { id: 'tall', name: '기둥 블록' }, { id: 'ball', name: '공' },
        { id: 'tree', name: '나무' }, { id: 'house', name: '집' }, { id: 'cat', name: '고양이' },
        { id: 'bear', name: '곰' }, { id: 'robot', name: '로봇' }, { id: 'frog', name: '개구리' }
      ],
      maker: {
        title: '섬 꾸미기', tag: '예시', mapLabel: '섬 판을 위에서 본 지도',
        hint: '칸을 누르고 부품을 눌러요',
        placed: '{name} 놓았어요', needItem: '먼저 칸에 부품을 놓아 보세요',
        rotate: '돌리기', remove: '빼기', undo: '되돌리기', clear: '모두 지우기', shot: '사진 찍기',
        rotated: '돌렸어요', removed: '뺐어요', undone: '한 단계 되돌렸어요', cleared: '모두 지웠어요. 되돌리기로 살릴 수 있어요',
        noItem: '먼저 섬 판에서 섬을 꾸며 보세요', shotFail: '사진을 만들지 못했어요. 다시 해 볼까요?',
        photoDone: '찰칵! 내 작품이 전시 벽에 걸렸어요'
      },
      wall: { title: '내 작품 전시 벽', mine: '내 작품', slot: '내 작품 자리', empty: '아직 걸린 작품이 없어요. 섬을 꾸미고 사진을 찍어 보세요' },
      tools: {
        title: '학생용 제작 도구 카드', sub: '도구 카드 1 · 2 · 3 · 예시',
        foot: '도구 이름과 쓰는 법은 연구부 검증 뒤에 채워요. 지금은 도구 종류별 예시예요. [확인 전]',
        cards: [
          { name: '도구 카드 1', type: '블록 쌓기형 도구 (예시)', steps: ['① 빈 공간을 열어요', '② 블록을 골라 놓아요', '③ 돌려 보고 저장해요'] },
          { name: '도구 카드 2', type: '모양 빚기형 도구 (예시)', steps: ['① 기본 모양을 골라요', '② 늘리고 줄여 빚어요', '③ 색을 칠하고 저장해요'] },
          { name: '도구 카드 3', type: '공간 꾸미기형 도구 (예시)', steps: ['① 공간 틀을 골라요', '② 물건과 캐릭터를 놓아요', '③ 걸어 다니며 확인해요'] }
        ]
      },
      stampId: 'studio'
    },
    /* ==== hall:studio 끝 ==== */
    /* ==== hall:safety 시작 ==== */
    /* 안전·윤리 등대: room.js buildSafety(타원 탑 안, 층마다 상황 카드 → 등불 켜기 → 꼭대기 체크리스트). 시안 ..\시안\mockup-hall-safety.html. */
    /* 글은 모두 [확인 전](가안, 연구부 검증 전). 연령·시간 같은 숫자 기준은 넣지 않고 "기기·앱 안내를 확인해요"로 쓴다. */
    safety: {
      kind: 'safety',
      welcome: '안전·윤리 등대예요. 층마다 상황을 골라 등불을 켜 보세요 [확인 전]',
      sky: '#070A26',
      principal: {
        name: '리니',
        lines: [
          '안녕하세요! 안전·윤리 등대 안내를 맡은 리니예요.',
          '이 등대는 네 층이에요. 층마다 상황 카드가 하나씩 있어요.',
          '발판에 서서 알맞은 행동을 고르면 그 층의 등불이 켜져요.',
          '넷 다 켜지면 꼭대기 등실에서 안전 수업 체크리스트를 확인해요. (글은 모두 가안 [확인 전])'
        ]
      },
      guideSub: '한 층씩 올라가 봐요',
      progress: '{i}층 · 등불 {c}/{n}',
      lightBtn: '등불 켜기',
      askBtn: '상황 보기',
      reBtn: '다시 보기',
      retry: '다시 풀어 보기',
      litTag: '등불이 켜졌어요',
      litSub: '등불이 켜졌어요 · 다시 볼 수 있어요',
      litToast: '{i}층 등불이 켜졌어요 ({c}/{n})',
      allToast: '등불이 모두 켜졌어요! 꼭대기 등실로 가서 체크리스트를 확인해요',
      top: {
        title: '꼭대기 등실', pad: '꼭대기', padSub: '등실', signSub: '넷 다 켜지면 빛나요',
        sub: '등불 {c}/{n} · 넷 다 켜면 체크리스트', btn: '살펴보기',
        subDone: '등불이 모두 켜졌어요', btnDone: '체크리스트 보기',
        notYet: '아직 등불이 {left}개 남았어요. 층마다 상황을 골라 불을 켜 보세요'
      },
      /* 층 4개: num·title = 카드 이름, short = 이름판, board = 카드 판의 큰 두 줄, icon = 그림(0 어지러운 얼굴 · 1 사람 카드 · 2 카메라 · 3 말풍선) */
      floors: [
        { num: '①', title: '사용 시간·어지러움', short: '사용 시간', signSub: '어지러우면?', sub: '상황 카드 · 맞게 고르면 불이 켜져요', padSub: '쉬는 때', icon: 0, board: ['어지러우면', '어떡하지?'],
          again: '어지러우면 멈추고 쉬어요. 쉬는 때와 사용 시간은 기기·앱 안내를 확인해요.',
          situation: {
            npc: 'VR 체험을 하는데 머리가 어지러워요. 어떻게 할까요?',
            choices: [
              { ko: '바로 멈추고 쉬어요', ok: true, note: '몸이 불편하면 멈추고 쉬어요. 쉬는 때와 사용 시간은 기기·앱 안내를 확인해요.' },
              { ko: '조금만 참고 계속해요', hint: '참고 계속하면 더 힘들어질 수 있어요.' },
              { ko: '더 빨리 움직여 봐요', hint: '움직임이 커지면 더 어지러울 수 있어요.' }
            ]
          } },
        { num: '②', title: '연령 기준', short: '연령 기준', signSub: '누가 해도 될까?', sub: '상황 카드 · 맞게 고르면 불이 켜져요', padSub: '연령', icon: 1, board: ['이 체험은', '누가 해도 될까?'],
          again: '체험을 시작하기 전에 누가 쓸 수 있는지 기기·앱 안내를 확인해요.',
          situation: {
            npc: '이 VR 체험을 우리 반 모두 해도 될까요? 먼저 무엇을 할까요?',
            choices: [
              { ko: '기기·앱 안내를 확인해요', ok: true, note: '쓸 수 있는 대상은 기기와 앱마다 달라요. 시작하기 전에 안내를 확인해요.' },
              { ko: '다들 하니까 그냥 해요', hint: '안내에 쓸 수 있는 대상이 적혀 있는지 먼저 봐요.' },
              { ko: '친구한테 들은 대로 해요', hint: '들은 이야기보다 안내문이 먼저예요.' }
            ]
          } },
        { num: '③', title: '개인정보·초상권', short: '개인정보', signSub: '사진, 올려도 될까?', sub: '상황 카드 · 맞게 고르면 불이 켜져요', padSub: '사진', icon: 2, board: ['친구 얼굴 사진', '올려도 될까?'],
          again: '친구 얼굴이 나온 사진은 먼저 친구에게 물어보고, 허락을 받은 뒤에 써요.',
          situation: {
            npc: '체험하다가 친구 얼굴이 나온 사진을 찍었어요. 인터넷에 올리려고 해요. 어떻게 할까요?',
            choices: [
              { ko: '먼저 친구에게 물어봐요', ok: true, note: '얼굴이 나온 사진은 먼저 허락을 받아요. 친구가 싫다고 하면 올리지 않아요.' },
              { ko: '그냥 올려요', hint: '친구가 원하지 않을 수도 있어요. 먼저 물어봐야 해요.' },
              { ko: '이름도 같이 적어요', hint: '이름 같은 정보는 더 조심해야 해요. 함부로 적지 않아요.' }
            ]
          } },
        { num: '④', title: '가상 공간 예절', short: '가상 예절', signSub: '낯선 아바타가 오면?', sub: '상황 카드 · 맞게 고르면 불이 켜져요', padSub: '예절', icon: 3, board: ['낯선 아바타가', '다가오면?'],
          again: '불편하면 거리를 두고, 어른이나 선생님께 알려요. 개인정보는 함부로 알려 주지 않아요.',
          situation: {
            npc: '가상 공간에서 낯선 아바타가 다가와 자꾸 말을 걸어요. 불편해요. 어떻게 할까요?',
            choices: [
              { ko: '거리를 두고 어른께 알려요', ok: true, note: '불편하면 거리를 두고 선생님이나 어른께 알려요. 이름·학교 같은 정보는 알려 주지 않아요.' },
              { ko: '이름과 학교를 알려 줘요', hint: '낯선 사람에게 개인정보를 알려 주면 위험할 수 있어요.' },
              { ko: '말없이 따라가요', hint: '낯선 사람을 따라가지 않아요. 가상 공간에서도 같아요.' }
            ]
          } }
      ],
      checklist: {
        title: '안전 수업 체크리스트', sub: '예시 · 가안이에요 [확인 전]',
        items: [
          { name: '쉬는 때 알기', text: '어지럽거나 불편하면 바로 멈추고 쉬어요. 쉬는 때와 사용 시간은 기기·앱 안내를 확인해요.' },
          { name: '연령 기준 알기', text: '기기와 앱마다 쓸 수 있는 대상이 달라요. 수업에서 쓰기 전에 안내를 확인해요.' },
          { name: '사진·정보 지키기', text: '친구 얼굴이 나온 사진이나 이름 같은 정보는 먼저 허락을 받고, 함부로 올리지 않아요.' },
          { name: '예절 지키기', text: '가상 공간에서도 친구를 존중해요. 낯선 사람이 불편하게 하면 거리를 두고 어른께 알려요.' }
        ],
        foot: '글은 모두 가안이에요. 연구부 검증 뒤 고쳐요. [확인 전]'
      },
      stampId: 'safety'
    },
    /* ==== hall:safety 끝 ==== */
    /* @@관 설정 붙이는 자리: 새 관 rooms.<id>는 이 줄 바로 위에 */
  }
};
