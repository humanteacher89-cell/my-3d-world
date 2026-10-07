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
    }
  }
};
