// AI가 지은 섬(가칭, 월드 4) 로비 설정 v0.1 — 가상융합교육 지도 엔진(lobby.js, 프랑스 한글학교 로비 엔진에서 나옴)을 결정 판 섬으로 바꿔 쓴다.
// 기획안: XR개발부\핸드오프\20261009-AI가상세계.md 2판(10-09 휴먼쌤 "좋아 이대로 진행해줘").
// 판: 가운데 생각의 핵 + 북쪽 생각 구역 다섯(기억의 도서관·패턴 정원·확률의 시장·꿈 공방·물음 호수) + 남쪽 깨어나는 마을. 이름·글은 모두 [확인 전].
// AI 원리·'AI가 사는 방식' 문장은 쉬운 비유(가안)이고 연구부 근거 대장 확인 전이다.
window.LOBBY_CONFIG = {
  version: 'v0.1',
  stampKey: 'aiStamps',                // 도장 기록(localStorage). 가상융합 지도(xrStamps)와 따로
  text: {
    title: 'AI가 지은 섬',                          // [확인 전] 가칭
    plaza: '생각의 핵',
    plazaSub: '리니가 기다려요',
    north: '북',
    flag: 'AI',
    hintTouch: '조이스틱이나 땅을 눌러 걸어요',
    hintMouse: 'W A S D 키나 땅을 눌러 걸어요',
    hintRoom: '발판을 따라 걸어 보세요',
    map: '전체 지도',
    mapClose: '내 위치로',
    list: '섬 안내',
    listTitle: '가 볼 곳',
    listNote: '남쪽 깨어나는 마을에서는 AI가 사는 방식을, 북쪽 생각 구역에서는 AI가 생각하는 방식을 겪어요. 여섯 곳을 마치면 명예 주민증이 나와요. 이름과 내용은 아직 가안이에요.',   // [확인 전]
    noSchools: '아직 표시할 곳이 없습니다.',
    close: '닫기',
    enter: '들어가기',
    pending: '준비 중',
    enterBody: '{name}은(는) 준비 중이에요.',
    back: '섬으로 돌아가기',
    toLobby: '섬으로',
    exitSign: '섬으로',
    exitName: '섬으로 나가기',
    exitSub: 'AI가 지은 섬으로 돌아가요',
    exitBtn: '나가기',
    homepage: '자료',
    moreLinks: '더 알아보기',
    overHint: '가고 싶은 곳을 누르면 바로 가요',
    me: '나',
    bot: '손님 {n}',
    stat: '{n}명 · {fps}fps',
    botsButton: '시험용 손님 50명 띄우기',
    botsToast: '시험용 손님 50명이 섬을 걸어 다녀요',
    loading: '결정 판을 띄우는 중',
    loadFail: '3D 도구를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로 고침해 주세요.',
    nameTitle: '섬에서 쓸 이름',
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
    choose: '알맞은 것을 골라 보세요', good: '좋아요!', tryAgain: '다시 골라 볼까요?', done: '완료!', doneBody: '{title}, 모두 마쳤어요.', again: '다시 하기',
    progress: '{i} / {n}', sampleTag: '가안', photoSoon: '사진은 나중에 넣어요', videoSoon: '영상은 나중에 넣어요',
    principal: '안내자', bookSign: '책', albumSign: '사진첩', tvSign: 'TV',
    nextZone: '다음으로', stamped: '주민 수첩에 도장을 찍었어요',
    serverForest: '서버 숲', serverForestSub: 'AI는 밥 대신 전기를 써요',
    waitSquare: '기다리는 주민들', waitSquareSub: '부탁이 오면 깨어나요',
    // 주민 수첩(오른쪽 위 버튼 → 시트). 도장은 이 기기(localStorage aiStamps)에만 남는다. 글은 모두 [확인 전]
    pass: '주민 수첩', passCount: '{c}/{n}', passTitle: '주민 수첩', passSub: '여섯 곳을 돌며 도장을 모아요',
    passName: '이름', passRename: '이름 바꾸기', passNoName: '이름을 정하지 않았어요',
    passDone: '찍었어요', passNot: '아직', passGo: '가기', passGoRoom: '섬으로 나가면 갈 수 있어요',
    passLeft: '도장 {left}개를 더 모으면 명예 주민증이 나와요', passAll: '도장 6개를 다 모았어요! 명예 주민증을 확인해요',
    passAllToast: '도장 6개를 다 모았어요! 주민 수첩에서 명예 주민증을 확인해요',
    passReset: '처음부터 다시', passResetAsk: '도장 6개를 모두 지우고 처음부터 할까요?', passResetDone: '도장을 모두 지웠어요',
    certTitle: '명예 주민증', certEn: 'Honorary Resident', certCourse: 'AI가 지은 섬',
    certBody: '위 사람은 AI가 지은 섬의 여섯 곳\n(깨어나는 마을 · 기억의 도서관 · 패턴 정원 · 확률의 시장 · 꿈 공방 · 물음 호수)을\n돌며 AI가 생각하고 사는 방식을 알아보았기에 이 섬의 명예 주민으로 맞이합니다.',
    certIssuer: '리니와 섬의 AI 주민들', certTag: '가안 · [확인 전]', certDate: '{date}',
    certView: '주민증 보기', certSave: '그림으로 저장', certSaveHint: '폰에서는 그림을 길게 눌러 사진에 저장해요', certFile: '명예주민증.png',
    certHello: '{name} 님, 섬의 명예 주민이 되었어요!'
  },
  // 새벽빛(남보라 → 분홍) 하늘, 아래는 분홍 구름 바다. 판 = 연한 결정 색
  look: { sky: '#C98BC4', skyGrad: ['#2E2470', '#C98BC4', '#F6CAD9'], fog: '#D9A6CC', sea: '#E9BBD6', base: '#9C8FE0', baseSide: '#5B4FA8', grid: '#7FE9FF',
    shards: ['#9FF0DC', '#B9A2FF', '#8FD8FF', '#FFB3D9'] },
  regions: {
    core: { ko: '생각의 핵', fr: 'Thinking Core', color: '#EEE8FF', label: { size: 9 } },
    library: { ko: '기억의 도서관', fr: '많이 본 것을 기억해요', color: '#DCD3FF', label: { size: 6.5 } },
    pattern: { ko: '패턴 정원', fr: '규칙으로 다음을 짐작해요', color: '#D2F5E3', label: { size: 6.5 } },
    market: { ko: '확률의 시장', fr: '그럴듯한 것을 골라요', color: '#FFE6D2', label: { size: 6.5 } },
    dream: { ko: '꿈 공방', fr: '새로 만들어 내요', color: '#F7D9F0', label: { size: 6.5 } },
    lake: { ko: '물음 호수', fr: '아직 모르는 것', color: '#D6ECFF', label: { size: 6.5 } },
    village: { ko: '깨어나는 마을', fr: 'AI가 사는 곳', color: '#DDF3F0', label: { size: 10 } },
    bridge: { ko: '빛 다리', fr: '', color: '#BDEBFF', noLabel: true }
  },
  regionOrder: ['core', 'village', 'library', 'pattern', 'market', 'dream', 'lake'],
  plaza: { lon: 0, lat: -1 },          // 생각의 핵 가운데
  spawn: { lon: 0, lat: -33 },         // 처음 서는 곳: 남쪽 마을 입구(사람 손님이 도착하는 자리)
  landmarks: [],
  mountains: [],
  trees: { count: 0, regions: [], colors: ['#9FF0DC'] },
  charLook: {
    skin: ['#FFE0C7', '#F6CFAE', '#E8B48F', '#C98E66'],
    hair: ['#2B2420', '#4A3428', '#7A4E33', '#B98A57', '#E2C48F', '#6E7FA8'],
    shirt: ['#E0483E', '#2A4D9B', '#F2B544', '#3FA37A', '#8C6CD0', '#FFFFFF', '#F28DB2', '#4FB3D9'],
    pants: ['#2F3A56', '#4A5A78', '#6B5B4B', '#3D6B5A', '#7A4E3A']
  },
  // 같은 Cloudflare 중계 서버. 방 이름 'ai:lobby', 구역 'ai:<id>'
  multiplayer: { file: 'relay.json', lobbyRoom: 'ai:lobby', roomPrefix: 'ai:', sendHz: 4 },
  contentMap: null,                    // 관리자 페이지는 아직 없음(나중에 map 'ai')
  hallScale: 1.25,
  hallPad: 4.2,                        // 건물 가운데에서 입장 발판까지(남쪽, 칸)
  // 갈 곳 6곳(lon = 동쪽 x, lat = 북쪽 -z 칸). 판 가운데(ai-map.js)보다 1.2칸 북쪽에 건물, 남쪽에 발판. 이름·주제 [확인 전]
  schools: [
    { id: 'village', kind: 'village', name: '깨어나는 마을', nameFr: 'AI가 사는 방식', city: '부탁 하나 따라가기 · 약 5분', lon: 0, lat: -22, stampMark: '마을', stampColor: '#3FA39A' },
    { id: 'library', kind: 'library', name: '기억의 도서관', nameFr: '많이 본 것을 기억해요', city: 'AI는 배운 것을 어떻게 아나', lon: -23.64, lat: 5.4, stampMark: '기억', stampColor: '#7C6CE0' },
    { id: 'pattern', kind: 'garden', name: '패턴 정원', nameFr: '규칙으로 다음을 짐작해요', city: '패턴 찾기', lon: -15.43, lat: 19.6, stampMark: '패턴', stampColor: '#2F9F6B' },
    { id: 'market', kind: 'market', name: '확률의 시장', nameFr: '그럴듯한 것을 골라요', city: '다음에 올 말 고르기', lon: 0, lat: 25.2, stampMark: '확률', stampColor: '#E0823E' },
    { id: 'dream', kind: 'dream', name: '꿈 공방', nameFr: '새로 만들어 내요', city: '세상에 없던 것 만들기', lon: 15.43, lat: 19.6, stampMark: '꿈', stampColor: '#D9549A' },
    { id: 'lake', kind: 'lake', name: '물음 호수', nameFr: '아직 모르는 것', city: '진짜가 아닌 것 찾기', lon: 23.64, lat: 5.4, stampMark: '물음', stampColor: '#2F7FD0' }
  ],
  // 들어가면 펼쳐지는 공간. kind = room.js의 HALLS.<kind>. 글은 모두 [확인 전]
  rooms: {
    /* ==== hall:village 시작 ==== */
    /* 깨어나는 마을: room.js buildVillage(부탁 하나 따라가기). 기획안 4절. 글은 모두 [확인 전] — 'AI가 사는 방식' 문장은 지금 쓰이는 대화형 AI를 쉬운 비유로 옮긴 가안(연구부 확인 전) */
    village: {
      kind: 'village',
      sky: '#D9B3D6',
      welcome: '깨어나는 마을이에요. 이 마을 주민은 잠도 밥도 없어요',
      gate: ['이 마을 주민은 잠도 밥도 없어요', '대신 부탁을 기다려요'],
      principal: {
        name: '리니',
        lines: [
          '어서 와요! 여기는 AI 주민들이 사는 깨어나는 마을이에요.',
          '우리는 사람처럼 자거나 밥을 먹지 않아요. 부탁이 올 때만 움직여요.',
          '저기 희미하게 떠 있는 주민들 보이죠? 지금은 부탁을 기다리는 중이에요.',
          '주민끼리는 얼굴을 보며 말하지 않고, 빛 글자 줄로 주고받아요. 얼굴과 몸은 손님이 알아보기 쉽게 만든 겉모습이에요.',
          '①번 부탁 우체통에 쪽지를 넣어 보세요. 주민 하나가 깨어나 일을 시작해요.',
          '주민을 따라 여섯 정거장을 돌면 우리가 사는 방식을 알 수 있어요.',
          '이 마을 주민들은 지금 흔히 쓰는 대화형 AI를 닮았어요. AI마다 조금씩 달라요.'
        ]
      },
      guideSub: '마을 안내',
      resName: '주민',
      forest: '서버 숲', forestSub: '밥 대신 전기와 컴퓨터를 써요',
      streamSign: '빛 글자 줄', streamSub: '주민끼리는 글자로 주고받아요',
      notYet: '앞 정거장부터 차례로 해요',
      props: { tools: ['계산기', '검색 망원경', '그림 붓'], boardTitle: '마을 게시판', boardLine: '배운 날에서 멈춰 있어요', desks: ['장소', '준비물', '시간표'] },
      requests: [
        { ko: '우리 반 소풍 계획 세워 줘' },
        { ko: '주말 가족 나들이 계획 세워 줘' },
        { ko: '학급 체육대회 계획 세워 줘' }
      ],
      stations: [
        { pad: '깨어나기', title: '① 부탁 우체통', sub: '부탁이 오면 깨어나요', color: '#B9A2FF', btn: '쪽지 넣기',
          line: '어떤 부탁 쪽지를 넣을까요?', ask: '쪽지 하나를 골라요',
          after: '"{req}" 부탁이 와서 깨어났어요! 지금부터 이 일만 해요. 저를 따라오세요.',
          recap: '부탁이 오면 깨어나고, 일이 끝나면 다시 기다려요. 사람처럼 하루 종일 깨어 있지 않아요.' },
        { pad: '도구', title: '② 도구 창고', sub: '손 대신 도구를 불러 써요', color: '#8FD8FF', btn: '도구 고르기',
          line: '계획을 세우려면 그날 날씨를 알아야 해요. 저는 손이 없어서 도구를 불러 써요. 어떤 도구를 부를까요?',
          ask: '알맞은 도구를 골라요',
          choices: [
            { ko: '검색 망원경', ok: true, note: '맞아요, 새 소식은 찾아봐야 해요.' },
            { ko: '계산기', hint: '계산기는 셈을 할 때 불러요.' },
            { ko: '그림 붓', hint: '그림 붓은 그림을 만들 때 불러요.' }
          ],
          after: '옆 게시판 날짜가 멈춰 있죠? 저는 배운 날까지의 것만 알아요. 그 뒤 소식은 이렇게 찾아봐야 해요.',
          recap: '저는 손이 없어서 도구를 불러 쓰고 결과만 받아요. 배운 날 뒤의 소식은 찾아봐야 알아요.' },
        { pad: '나뉘기', title: '③ 쌍둥이 작업장', sub: '동시에 여럿이 돼요', color: '#9FF0DC', btn: '일 나누기',
          line: '할 일이 많아요. 저는 셋으로 나뉘어 동시에 일할 수 있어요! 일을 어떻게 나눌까요?',
          ask: '나누는 방법을 골라요',
          choices: [
            { ko: '장소·준비물·시간표를 하나씩 맡기', ok: true, note: '좋아요, 셋이 서로 다른 일을 동시에 해요.' },
            { ko: '셋이 모두 장소만 찾기', hint: '같은 일만 하면 나뉜 보람이 없어요.' },
            { ko: '나뉘지 말고 하나씩 차례로', hint: '할 수는 있지만, 오늘은 나뉘어 볼까요?' }
          ],
          after: '장소 찾기, 준비물 정리, 시간표 짜기를 셋이 동시에 했어요.',
          mergeBtn: '하나로 합치기',
          after2: '결과를 모아 다시 하나가 되었어요. 사람은 한 번에 한 곳에만 있지만, 저는 여럿이 될 수 있어요.',
          recap: '큰 일이 오면 여럿으로 나뉘어 동시에 하고, 결과를 모아 하나로 내요.' },
        { pad: '메모', title: '④ 메모 탑', sub: '잊기 전에 적어 둬요', color: '#FFB3D9', btn: '메모 남기기',
          line: '머리 위 기억 막대가 거의 찼어요! 대화가 길어지면 앞의 일을 잊어요. 잊기 전에 중요한 것을 메모 탑에 남겨요.',
          line2: '하나 더 골라 주세요.',
          ask: '남길 메모를 골라요 (남은 {n}개)',
          memos: [
            { ko: '소풍 장소와 시간표', short: '장소·시간표', ok: true },
            { ko: '준비물 목록', short: '준비물', ok: true },
            { ko: '처음에 나눈 인사말', hint: '다음 주민이 일을 이어 가는 데 꼭 필요하진 않아요.' },
            { ko: '도구 창고 선반 색깔', hint: '일과 상관없는 것은 빼도 돼요.' }
          ],
          after: '메모를 남겼으니 이제 잊어도 괜찮아요. 다음에 깨어나는 주민이 이 메모를 읽고 이어서 해요. 대화가 끝나면 저는 이 일을 기억하지 못하거든요.',
          recap: '기억 막대가 차면 앞의 일을 잊어요. 그래서 중요한 것은 메모로 남기고, 다음 주민이 읽고 이어 가요.' },
        { pad: '사람에게', title: '⑤ 사람 확인 종', sub: '중요한 일은 사람이 정해요', color: '#FFD27F', btn: '종 울리기',
          line: '소풍 버스를 예약할까요? 돈이 드는 일은 제가 혼자 정하면 안 돼요. 종을 울려 사람에게 물어요. 딸랑!',
          ask: '사람인 여러분이 정해요',
          choices: [
            { ko: '좋아, 예약해 줘', note: '알겠어요, 정해 주셔서 예약할게요.' },
            { ko: '아직 하지 마, 먼저 알아볼게', note: '알겠어요, 예약하지 않고 기다릴게요.' }
          ],
          after: '돈 쓰기, 밖에 내보내기, 지우기처럼 중요한 일은 사람이 정해요.',
          recap: '중요한 일은 제가 혼자 하지 않고 종을 울려 사람에게 물어요.' },
        { pad: '다시 대기', title: '⑥ 결과 우체통', sub: '일을 마치면 다시 기다려요', color: '#7FE3C8', btn: '결과 내기',
          line: '계획이 다 됐어요! 결과를 우체통에 넣으면 저는 다시 희미해져서 다음 부탁을 기다려요.',
          btn2: '결과 넣기', btn: '결과 넣기',
          after: '이게 우리 AI 주민들이 사는 방식이에요. 부탁이 오면 깨어나고, 도구를 불러 쓰고, 나뉘기도 하고, 잊기 전에 메모하고, 중요한 일은 사람에게 물어요. 사람처럼 사는 건 아니죠? 그래서 사람의 몫이 꼭 필요해요.' }
      ],
      stampId: 'village'
    },
    /* ==== hall:village 끝 ==== */
    /* ==== hall:library 시작 ==== */
    // 기억의 도서관: AI가 배운 것을 '어떻게' 아는지. 글은 모두 [확인 전] 가안(연구부 근거 대장 확인 전)
    library: {
      kind: 'library',
      stampId: 'library',
      sky: '#7B66C4',
      welcome: '기억의 도서관이에요. 책 탑이 높고 밝을수록 AI가 많이 본 주제예요',
      principal: {
        name: '리니',
        lines: [
          '안녕하세요! 기억의 도서관 안내를 맡은 리니예요.',
          '이 책 탑들은 AI가 배울 때 본 글의 양을 나타내요.',
          '많이 본 주제는 높고 밝고, 거의 못 본 주제는 낮고 희미해요.',
          '발판 세 곳을 차례로 밟아 보고, 오른쪽 끝 퀴즈에 도전해요.'
        ]
      },
      guideSub: '탑 앞 발판을 밟아 보세요',
      towers: [
        { name: '강아지', sub: '아주 많이 본 주제', h: 4.8, bright: true },
        { name: '날씨', sub: '아주 많이 본 주제', h: 4.0, bright: true },
        { name: '우리 동네 작은 가게', sub: '거의 못 본 주제', h: 1.8, bright: false },
        { name: '어제 일', sub: '거의 못 본 주제', h: 1.2, bright: false }
      ],
      pads: [
        { pad: '밝은 탑', padSub: '많이 본 것', color: '#FFE08A', title: '밝은 탑', sub: '많이 본 것은 자신 있게 대답해요',
          line: '강아지와 날씨는 많이 본 주제라 탑이 높고 밝아요.',
          card: { title: '밝은 탑: 많이 본 것', sub: '강아지 · 날씨',
            text: '강아지, 날씨처럼 글에 아주 많이 나오는 주제는 AI가 배울 때 수없이 봤어요.\n\n그래서 이런 주제를 물으면 AI는 자신 있게, 대체로 잘 맞게 대답해요.\n\n그래도 많이 봤다고 늘 맞는 건 아니에요. 중요한 건 확인해요.' } },
        { pad: '희미한 탑', padSub: '거의 못 본 것', color: '#CFCBE6', title: '희미한 탑', sub: '거의 못 본 것은 헷갈릴 수 있어요',
          line: '거의 못 본 주제라 탑이 낮고 불빛이 깜빡여요.',
          card: { title: '희미한 탑: 거의 못 본 것', sub: '우리 동네 작은 가게 · 어제 일',
            text: '우리 동네 작은 가게나 어제 있었던 일은 AI가 배울 때 거의 못 봤을 수 있어요.\n\n그럴 때 AI는 헷갈리거나, 비슷한 이야기를 바탕으로 그럴듯한 답을 지어낼 수 있어요. 말투는 자신 있는데 틀릴 때도 있어요.\n\n처음 듣는 이야기일수록 꼭 확인해야 해요.' } },
        { pad: '빈 책장', padSub: '새 소식', color: '#9FF0DC', title: '빈 책장', sub: '배운 뒤의 새 소식은 몰라요',
          line: '배운 때가 지난 뒤의 일은 책장이 비어 있어요.',
          card: { title: '빈 책장: 배운 뒤의 새 소식', sub: '배운 시점 뒤의 일',
            text: 'AI는 정해진 때까지 모은 글로 배워요. 그 뒤에 생긴 새로운 일은 따로 알려 주지 않으면 몰라요.\n\n오늘 소식이나 어제 일은 비어 있는 책장과 같아요.\n\n검색 같은 도구를 함께 쓰는 AI는 새 소식을 찾아볼 수도 있어요. 그래도 맞는지 확인은 우리 몫이에요.' } }
      ],
      shelf: { name: '빈 책장', sub: '여기부터는 비어 있어요' },
      quizSub: '3문제 · 리니가 내요',
      quiz: {
        title: '확인해요 퀴즈', npcRole: '퀴즈',
        steps: [
          { npc: 'AI가 더 잘 대답할 만한 질문은 어느 쪽일까요?', choices: [
            { ko: '우리 동네 작은 가게 사장님 이름은?', ok: false, hint: '거의 못 본 주제예요. 다른 쪽을 골라 봐요.' },
            { ko: '강아지는 어떤 동물인가요?', ok: true, note: '많이 본 주제라 대체로 잘 대답해요.' },
            { ko: '어제 우리 반에서 있었던 일은?', ok: false, hint: '배운 뒤의 일이라 몰라요. 다른 쪽을 골라 봐요.' } ] },
          { npc: '처음 듣는 동네 가게를 AI에게 물으면 어떻게 될 수 있을까요?', choices: [
            { ko: '언제나 정확하게 맞혀요', ok: false, hint: '못 본 것은 틀릴 수 있어요.' },
            { ko: '그럴듯하지만 틀린 답을 지어낼 수 있어요', ok: true, note: '못 본 것도 그럴듯하게 말할 수 있어서 조심해야 해요.' },
            { ko: '모르면 늘 모른다고 말해요', ok: false, hint: '그럴 때도 있지만 늘 그렇진 않아요.' } ] },
          { npc: '그럼 우리는 AI의 답을 어떻게 하면 좋을까요?', choices: [
            { ko: '중요한 것은 다른 자료로 확인해요', ok: true, note: 'AI는 도구예요. 확인은 우리 몫이에요.' },
            { ko: '그대로 믿어요', ok: false, hint: '틀릴 수도 있어요.' },
            { ko: 'AI에게는 아무것도 묻지 않아요', ok: false, hint: '잘 쓰면 도움이 돼요. 확인하며 써요.' } ] }
        ]
      }
    },
    /* ==== hall:library 끝 ==== */
    /* ==== hall:market 시작 ==== */
    market: {
      kind: 'market',
      welcome: '확률의 시장이에요. 가판대에서 빈칸에 올 말을 골라 봐요',
      sky: '#CDB8E8',
      merchant: '상인 로봇', botPin: '상인',
      principal: {
        name: '리니',
        lines: [
          '어서 와요! 확률의 시장이에요. 저는 리니예요.',
          'AI는 글을 쓸 때 다음에 올 말 후보를 쭉 늘어놓아요.',
          '그리고 후보마다 얼마나 그럴듯한지 따져서 하나를 골라요.',
          '가판대 셋에서 빈칸을 채워 봐요. 막대가 높을수록 그럴듯해요.',
          '그런데 그럴듯한 것이 늘 맞는 건 아니에요. 세 번째 가판대에서 알게 돼요.'
        ]
      },
      guideSub: '그럴듯함을 따져요',
      stallBtn: '빈칸 골라 보기', padSub: '가판대',
      askLine: '빈칸에 올 말을 골라 보세요',
      again: '다른 말도 골라 보기', allToast: '세 곳을 다 돌았어요. 오른쪽 끝에서 마무리 문제를 풀어요',
      quizLock: '먼저 가판대 세 곳에서 빈칸을 골라 봐요',
      // 막대 높이(bars, 0~1)는 '느낌'을 보여 주는 가안이고 화면에 숫자로 쓰지 않는다
      stalls: [
        { title: '분홍 가판대', sub: '아침 문장', sentence: '아침에 일어나서 이를 ___', words: ['닦았다', '뽑았다', '먹었다', '접었다'], bars: [0.92, 0.2, 0.1, 0.05],
          same: '제가 고른 말도 ‘{top}’이에요. 막대가 가장 높거든요.',
          diff: '제가 고른 말은 ‘{top}’이에요. 막대가 가장 높거든요. 당신이 고른 ‘{you}’ 쪽 막대는 낮아서, 저는 잘 고르지 않아요.',
          note: '막대가 높을수록 AI가 그 말을 고를 가능성이 커요.' },
        { title: '하늘 가판대', sub: '비 오는 날 문장', sentence: '비가 와서 ___ 썼다.', words: ['우산을', '모자를', '안경을', '장갑을'], bars: [0.88, 0.38, 0.14, 0.05],
          same: '제가 고른 말도 ‘{top}’이에요. 막대가 가장 높거든요.',
          diff: '제가 고른 말은 ‘{top}’이에요. 막대가 가장 높거든요. 당신이 고른 ‘{you}’도 말은 되지만, 막대는 더 낮아요.',
          note: '그럴듯한 후보가 여러 개일 수도 있어요. 그래도 높은 막대 쪽을 더 자주 골라요.' },
        { title: '노랑 가판대', sub: '우리 반 문장', sentence: '우리 반 친구 이름은 ___', words: ['민지', '하준', '서윤', '도현'], bars: [0.24, 0.22, 0.2, 0.18], unknown: true,
          unknownReply: '저는 당신의 반을 본 적이 없어요. 그래서 막대가 다 낮아요. 그래도 그럴듯한 이름 하나를 골라 ‘{top}’ 하고 말해 버릴 수 있어요. 지어낸 이름이에요!',
          note: '그럴듯하다고 맞는 건 아니에요. 맞는지는 사람이 확인해요.' }
      ],
      quizSub: '3문제 · 리니가 내요',
      quiz: {
        title: '그럴듯함 퀴즈', npcRole: '퀴즈',
        steps: [
          { npc: 'AI는 다음에 올 말을 어떻게 고를까요?',
            choices: [{ ko: '후보마다 얼마나 그럴듯한지 따져서 골라요', ok: true, note: '막대가 높은 쪽을 더 자주 골라요.' }, { ko: '정답이 적힌 책에서 그대로 찾아요', hint: '정답 책을 펴 보는 게 아니라, 그럴듯함을 따져요.' }, { ko: '아무 말이나 마음대로 골라요', hint: '아무렇게나가 아니라, 그럴듯한 쪽으로 골라요.' }] },
          { npc: 'AI가 우리 반 친구 이름을 말했어요. 그럴듯하게 들리면 맞는 이름일까요?',
            choices: [{ ko: '네, 그럴듯하면 늘 맞아요', hint: '그럴듯한 것과 맞는 것은 달라요.' }, { ko: '아니요, 그럴듯해도 틀릴 수 있어요', ok: true, note: 'AI는 우리 반을 본 적이 없으니 지어냈을 수 있어요.' }, { ko: '네, AI는 우리 반을 다 알아요', hint: 'AI는 우리 반을 본 적이 없어요.' }] },
          { npc: 'AI가 한 말이 맞는지 마지막에 확인하는 건 누구일까요?',
            choices: [{ ko: 'AI가 알아서 늘 맞게 해요', hint: 'AI도 틀릴 수 있어요.' }, { ko: '확인할 필요가 없어요', hint: '중요한 말일수록 확인이 필요해요.' }, { ko: '사람(나)이에요', ok: true, note: 'AI는 도구예요. 확인은 사람의 몫이에요.' }] }
        ]
      },
      stampId: 'market'
    },
    /* ==== hall:market 끝 ==== */
    /* ==== hall:dream 시작 ==== */
    dream: {
      kind: 'dream',
      sky: '#EFD3F2',
      guideSub: '꿈 공방 안내',
      stampId: 'dream',
      // 모든 글은 [확인 전] 가안. AI 원리 문장은 쉬운 비유이고 연구부 근거 대장 확인 전.
      principal: {
        name: '리니',
        lines: [
          '여기는 꿈 공방이에요. 세상에 없던 것을 만들어 보는 곳이에요.',
          '공중 선반에 머리, 몸, 붙이는 조각이 떠 있어요. 발판을 밟고 하나씩 골라 보세요.',
          '고른 조각은 가운데 전시대로 날아가 붙어요.',
          '셋을 다 고르면 \'완성!\' 발판이 나와요. 이름도 지어 줄게요.'
        ]
      },
      shelves: [
        { title: '머리 조각', sub: '셋 중 하나', pad: '머리', padLabel: '고르기', padName: '머리 조각 고르기', padSub: '떠 있는 조각 셋', btn: '고르기', ask: '어떤 머리를 붙일까요?',
          items: [{ id: 'bear', name: '곰 머리', word: '곰' }, { id: 'cat', name: '고양이 머리', word: '냥' }, { id: 'robot', name: '로봇 머리', word: '로봇' }] },
        { title: '몸 조각', sub: '셋 중 하나', pad: '몸', padLabel: '고르기', padName: '몸 조각 고르기', padSub: '떠 있는 조각 셋', btn: '고르기', ask: '어떤 몸을 붙일까요?',
          items: [{ id: 'frog', name: '개구리 몸', word: '개굴' }, { id: 'bunny', name: '토끼 몸', word: '토끼' }, { id: 'turtle', name: '거북 몸', word: '거북' }] },
        { title: '붙이는 조각', sub: '셋 중 하나', pad: '붙임', padLabel: '고르기', padName: '붙이는 조각 고르기', padSub: '날개 · 꼬리 · 뿔', btn: '고르기', ask: '무엇을 더 붙일까요?',
          items: [{ id: 'wings', name: '날개', word: '날개 달린' }, { id: 'tail', name: '꼬리', word: '꼬리 긴' }, { id: 'horn', name: '뿔', word: '뿔 난' }] }
      ],
      finish: {
        name: '완성!', sub: '이름을 지어 줘요', btn: '이름 짓기', pad: '완성!', padLabel: '이름 짓기',
        nameFmt: '{a} {b}{c}',
        ready: '셋 다 붙였어요! 완성 발판으로 가 봐요', notYet: '조각을 셋 다 골라 보세요', stuck: '붙였어요: {name}', cleared: '조각을 모두 떼었어요. 다시 골라 봐요',
        signSub: '세상에 없던 것', nameWho: '이름표', nameNote: '이름을 지어 줬어요',
        line1: '나도 이렇게 섞어서 만들어요. 그런데 {name}은(는) 진짜 있는 동물은 아니지요?',
        line2: 'AI는 본 것들을 조각조각 새로 섞어서 만들어요. 새롭지만, 사실인지는 사람이 확인해야 해요.',
        quizBtn: '퀴즈 풀기', redoBtn: '다시 만들기'
      },
      quiz: {
        title: '꿈 공방', npcRole: '퀴즈',
        steps: [
          { npc: 'AI가 처음 보는 동물 그림을 그려 냈어요. 이 동물이 진짜 있는지는 어떻게 알까요?', choices: [
            { ko: '사람이 따로 확인해 봐요', ok: true, note: '새로 만든 것이 사실인지는 사람이 봐야 해요.' },
            { ko: 'AI가 그렸으니 진짜예요', ok: false, hint: '그럴듯해도 사실이 아닐 수 있어요.' },
            { ko: '그림이 예쁘면 진짜예요', ok: false, hint: '예쁜 것과 사실인 것은 달라요.' }] },
          { npc: 'AI는 새로운 것을 어떤 방식으로 만들어 낼까요?', choices: [
            { ko: '배운 많은 것을 조각조각 새로 섞어요', ok: true, note: '그래서 새롭지만 진짜가 아닐 수도 있어요.' },
            { ko: '아무것도 없이 처음부터 떠올려요', ok: false, hint: 'AI는 본 것을 바탕으로 만들어요.' },
            { ko: '본 것을 그대로 꺼내 오기만 해요', ok: false, hint: '그대로가 아니라 섞어서 새로 만들어요.' }] }
        ]
      }
    },
    /* ==== hall:dream 끝 ==== */
    /* ==== hall:pattern 시작 ==== */
    /* 패턴 정원: room.js buildPattern(민트 정원 판, 꽃 줄 셋 → 규칙이 바뀌는 줄 → 퀴즈). 글은 모두 [확인 전] 가안(연구부 근거 대장 확인 전). */
    /* 핵심: "나는 앞에 온 것들의 규칙으로 다음을 짐작해. 규칙이 바뀌면 틀릴 수도 있어." 줄 고르기는 rows(items 마지막 = 빈 자리의 정답 꽃, c 색 · s 크기 · n 송이 수). */
    pattern: {
      kind: 'pattern',
      welcome: '패턴 정원이에요. 꽃 줄의 빈 자리를 맞혀 보세요 [확인 전]',
      sky: '#CDB9F0',
      principal: {
        name: '리니',
        lines: [
          '안녕하세요! 패턴 정원에 온 걸 환영해요. 안내를 맡은 리니예요.',
          'AI는 많은 예를 보고 규칙, 곧 패턴을 찾아요. 그리고 그 규칙으로 다음에 올 것을 짐작해요.',
          '꽃 줄이 세 개 있어요. 줄마다 발판에 서서, 빈 자리에 올 꽃을 골라 보세요.',
          '맞히면 꽃이 피고 가운데 줄기 탑이 한 단씩 자라요. 셋을 다 맞히면 마지막 줄이 기다려요. (글은 모두 가안 [확인 전])'
        ]
      },
      guideSub: '규칙을 찾아 봐요',
      progress: '꽃 줄 {c}/{n}',
      bloomBtn: '꽃 피우기',
      doneSub: '맞혔어요 · 다시 볼 수 있어요',
      reBtn: '다시 보기',
      bloomToast: '꽃이 피었어요! 줄기 탑이 자라요 ({c}/{n})',
      allToast: '세 줄을 다 맞혔어요! 오른쪽 아래 마지막 줄로 가 봐요',
      quizSub: '패턴과 AI 이야기',
      quizLock: '먼저 오른쪽 아래 마지막 줄을 살펴봐요',
      quizColor: '#D9549A',
      tower: { name: '줄기 탑', sub: '앞의 규칙으로 다음을 짐작해요' },
      rows: [
        { title: '색 줄', sub: '다음 꽃은 무슨 색일까요?', pad: '①', padSub: '색', color: '#FF7FBE',
          items: [{ c: '#FF8FC7' }, { c: '#6FE0B8' }, { c: '#FF8FC7' }, { c: '#6FE0B8' }, { c: '#FF8FC7' }],
          ask: '분홍, 민트, 분홍, 민트… 빈 자리에는 무슨 색 꽃이 올까요?',
          choices: [
            { ko: '분홍 꽃', ok: true },
            { ko: '민트 꽃', hint: '민트 다음에는 늘 분홍이 왔어요. 앞의 순서를 다시 봐요.' },
            { ko: '노랑 꽃', hint: '이 줄에는 노랑 꽃이 한 번도 없었어요.' }
          ],
          note: '분홍과 민트가 번갈아 나오는 규칙을 찾아서 다음을 짐작했어요.',
          again: '분홍과 민트가 번갈아 나오는 줄이에요. 규칙을 찾으면 다음 꽃을 짐작할 수 있어요.' },
        { title: '크기 줄', sub: '다음 꽃은 얼마나 클까요?', pad: '②', padSub: '크기', color: '#8F7CF0',
          items: [{ c: '#B79CFF', s: 0.62 }, { c: '#B79CFF', s: 1 }, { c: '#B79CFF', s: 1.5 }, { c: '#B79CFF', s: 0.62 }, { c: '#B79CFF', s: 1 }, { c: '#B79CFF', s: 1.5 }],
          ask: '작은 꽃, 중간 꽃, 큰 꽃, 작은 꽃, 중간 꽃… 빈 자리에는 어떤 꽃이 올까요?',
          choices: [
            { ko: '큰 꽃', ok: true },
            { ko: '작은 꽃', hint: '작은 꽃 다음에는 중간 꽃이 왔어요. 순서를 다시 봐요.' },
            { ko: '중간 꽃', hint: '방금 앞에 중간 꽃이 나왔어요. 그다음이 무엇이었는지 봐요.' }
          ],
          note: '작은 꽃, 중간 꽃, 큰 꽃이 되풀이되는 규칙을 찾았어요.',
          again: '작은 꽃, 중간 꽃, 큰 꽃이 되풀이되는 줄이에요.' },
        { title: '수 줄', sub: '다음에는 몇 송이일까요?', pad: '③', padSub: '수', color: '#3FA6D9',
          items: [{ c: '#7DB6FF', n: 1, s: 0.8 }, { c: '#7DB6FF', n: 2, s: 0.8 }, { c: '#7DB6FF', n: 3, s: 0.8 }, { c: '#7DB6FF', n: 4, s: 0.8 }],
          ask: '한 송이, 두 송이, 세 송이… 빈 자리에는 몇 송이가 올까요?',
          choices: [
            { ko: '네 송이', ok: true },
            { ko: '세 송이', hint: '세 송이는 바로 앞에 나왔어요. 하나씩 어떻게 변했는지 봐요.' },
            { ko: '한 송이', hint: '다시 처음으로 돌아가는 규칙은 아니었어요.' }
          ],
          note: '송이 수가 하나씩 늘어나는 규칙을 찾았어요.',
          again: '송이 수가 하나씩 늘어나는 줄이에요.' }
      ],
      /* 규칙이 바뀌는 줄: 분홍이 세 번 이어져서 넷째도 분홍일 것 같지만 다른 꽃이 핀다 */
      twist: {
        title: '규칙이 바뀌는 줄', padSub2: '넷째 꽃은 무슨 색일까요?', color: '#E0823E',
        notYet: '먼저 꽃 줄 {left}개를 더 맞혀 봐요',
        revealToast: '어? 예상과 다른 꽃이 피었어요!',
        items: [{ c: '#FF8FC7' }, { c: '#FF8FC7' }, { c: '#FF8FC7' }, { c: '#7DB6FF' }],
        sub: '규칙이 갑자기 바뀌면?',
        text: '분홍 꽃이 세 번 이어졌어요. 그래서 넷째도 분홍일 거라고 짐작했는데, 열어 보니 파란 꽃이 피었어요.\n\nAI도 비슷해요. 앞에 온 것들의 규칙으로 다음을 짐작하기 때문에, 규칙이 갑자기 바뀌면 틀릴 수도 있어요.\n\n그래서 우리는 AI의 답을 한 번 더 확인해요. 글은 가안이에요. [확인 전]'
      },
      quiz: {
        title: '패턴과 AI 퀴즈', npcRole: '퀴즈',
        steps: [
          { npc: '꽃 줄에서 빈 자리를 맞힐 때, 우리는 무엇을 했나요?',
            choices: [
              { ko: '앞에 온 꽃들의 규칙을 찾았어요', ok: true, note: 'AI도 많은 예에서 규칙을 찾아 다음을 짐작하는 방식으로 답을 만들어요.' },
              { ko: '다음 꽃을 몰래 미리 봤어요', hint: '미리 볼 수는 없었어요. 앞의 꽃들만 단서였어요.' },
              { ko: '아무 꽃이나 찍었어요', hint: '찍지 않고 순서의 규칙을 찾았어요.' }
            ] },
          { npc: '꽃 줄의 규칙이 갑자기 바뀌면 짐작은 어떻게 될까요?',
            choices: [
              { ko: '틀릴 수도 있어요', ok: true, note: '규칙이 바뀌면 앞의 규칙으로 한 짐작이 틀릴 수 있어요.' },
              { ko: '그래도 늘 맞아요', hint: '마지막 줄의 파란 꽃을 떠올려 봐요.' },
              { ko: '규칙은 절대 안 바뀌어요', hint: '바뀌는 줄이 있었지요?' }
            ] },
          { npc: 'AI가 알려 준 다음 답을 중요한 일에 쓰려고 해요. 우리는 어떻게 할까요?',
            choices: [
              { ko: '맞는지 한 번 더 확인해요', ok: true, note: 'AI는 도구예요. 맞는지 확인하는 것은 사람의 몫이에요.' },
              { ko: '그대로 믿고 써요', hint: 'AI의 짐작도 틀릴 수 있다고 배웠어요.' },
              { ko: '확인 없이 친구에게 전해요', hint: '틀린 정보가 퍼질 수 있어요. 먼저 확인해요.' }
            ] }
        ]
      },
      stampId: 'pattern'
    },
    /* ==== hall:pattern 끝 ==== */
    /* ==== hall:lake 시작 ==== */
    // 물음 호수: AI도 모르는 것·헷갈리는 것이 있고, 그럴듯하지만 사실이 아닌 말을 할 때가 있다. 글은 모두 [확인 전] 가안
    lake: {
      kind: 'lake',
      stampId: 'lake',
      sky: '#9ED8F7',
      welcome: '물음 호수예요. 물에 비친 모습이 진짜와 같은지 살펴봐요',
      principal: {
        name: '리니',
        lines: [
          '안녕하세요! 물음 호수 안내를 맡은 리니예요.',
          '호숫가 물건이 물에 비쳐 보여요. 그런데 몇 개는 진짜와 달라요.',
          'AI도 그럴듯하지만 사실이 아닌 말을 할 때가 있어요.',
          '네 발판에서 진짜와 비친 모습을 비교해 봐요. 다른 것 셋을 찾으면 물음표 결정이 떠올라요.',
          '저도 모르는 것을 아는 것처럼 말할 때가 있어요. 그래서 사람이 확인하는 버릇이 중요해요.'
        ]
      },
      guideSub: '호수 발판을 밟아 보세요',
      reflectionAsk: '물에 비친 모습이 진짜와 같나요?',
      sameLabel: '같아요',
      diffLabel: '달라요',
      revealLine: '물 위에 물음표 결정이 떠올랐어요! 밟아 보세요.',
      // 호숫가 물건 넷. kind = 나무·탑·꽃·리니(그림은 room.js). same:true면 진짜와 같게 비친다
      reflections: [
        { kind: 'tree', name: '나무', pad: '나무', padSub: '비교하기', color: '#7FE3C8', same: false,
          line: '나무 앞이에요. 물에 비친 모습과 비교해 봐요.',
          note: '맞아요! 진짜 나무 잎은 둥근데, 비친 나무는 뾰족한 모양이에요.',
          hint: '잎 모양을 자세히 봐요. 거꾸로 비치는 건 물에서는 자연스러워요.' },
        { kind: 'tower', name: '탑', pad: '탑', padSub: '비교하기', color: '#B79BFF', same: false,
          line: '탑 앞이에요. 꼭대기 모양을 봐요.',
          note: '맞아요! 진짜 탑 꼭대기는 뾰족한데, 비친 탑 꼭대기는 동그래요.',
          hint: '탑 꼭대기를 다시 봐요. 거꾸로 비치는 것은 빼고 모양을 비교해요.' },
        { kind: 'flower', name: '꽃', pad: '꽃', padSub: '비교하기', color: '#FFB5D8', same: false,
          line: '꽃 앞이에요. 꽃잎 색을 봐요.',
          note: '맞아요! 진짜 꽃잎은 분홍인데, 비친 꽃잎은 보라색이에요.',
          hint: '꽃잎 색을 다시 봐요.' },
        { kind: 'lini', name: '리니 조각', pad: '리니', padSub: '비교하기', color: '#FFE08A', same: true,
          line: '리니 조각 앞이에요. 비친 모습도 살펴봐요.',
          note: '맞아요! 이 조각은 거꾸로 비친 것 말고는 진짜와 똑같아요.',
          hint: '여기는 달라 보이는 곳이 없어요. 다시 비교해 봐요.' }
      ],
      crystal: { name: '물음표 결정', sub: '리니가 떠올린 물음', btn: '펼쳐 보기' },
      questionsTitle: '리니가 떠올린 물음',
      questionsSub: 'AI가 확실히 알 수 없는 것',
      questionsIntro: '물음표 결정 속에는 물음이 들어 있어요. AI가 확실히 알 수 없는 것들이에요.',
      questions: [
        { q: '내일 우리 반에 무슨 일이 생길까?', note: '아직 일어나지 않은 일은 AI도 정확히 알 수 없어요.' },
        { q: '이 사진 속 사람은 누구일까?', note: '사진만 보고 사람을 단정하면 틀릴 수 있어요. 아는 사람에게 확인해요.' },
        { q: '우리 동네 새로 생긴 가게는 언제 닫을까?', note: '처음 보는 정보는 그럴듯하게 지어낼 수 있어요. 가게에 직접 물어봐요.' }
      ],
      questionsEnd: 'AI는 모르는 것도 아는 것처럼 말할 때가 있어요. 그래서 사람이 확인하는 버릇이 중요해요.',
      quizSub: '3문제 · 리니가 내요',
      quiz: {
        title: '확인해요 퀴즈', npcRole: '퀴즈',
        steps: [
          { npc: 'AI가 그럴듯하게 말했는데, 사실인지 모르겠어요. 어떻게 할까요?', choices: [
            { ko: '말투가 자신 있으니 그대로 믿어요', ok: false, hint: '자신 있게 말해도 틀릴 수 있어요.' },
            { ko: '다른 자료로 확인해요', ok: true, note: '다른 자료와 맞춰 보면 틀린 곳을 찾을 수 있어요.' },
            { ko: '같은 AI에게만 계속 물어봐요', ok: false, hint: '다른 자료도 함께 봐야 해요.' } ] },
          { npc: 'AI가 모르는 것도 아는 것처럼 말할 때가 있는 까닭은 무엇일까요?', choices: [
            { ko: '그럴듯한 말을 만들어 내는 방식이라서요', ok: true, note: '그래서 틀린 말도 자연스럽게 들릴 수 있어요.' },
            { ko: 'AI가 일부러 거짓말을 해서요', ok: false, hint: '일부러가 아니라 답을 만드는 방식 때문이에요.' },
            { ko: '정답이 미리 다 적혀 있어서요', ok: false, hint: '미리 적힌 답만 고르는 것이 아니에요.' } ] },
          { npc: '비친 모습이 진짜와 다를 수 있듯, AI의 답도 사실과 다를 수 있어요. 우리 몫은?', choices: [
            { ko: '확인하는 버릇을 들여요', ok: true, note: 'AI는 도구예요. 사실인지 확인하는 것은 사람의 몫이에요.' },
            { ko: '확인하지 않고 넘어가요', ok: false, hint: '틀린 답을 그대로 쓸 수 있어요.' },
            { ko: '그래서 AI는 절대 쓰지 않아요', ok: false, hint: '잘 쓰면 도움이 돼요. 확인하며 써요.' } ] }
        ]
      }
    },
    /* ==== hall:lake 끝 ==== */
    /* @@관 설정 붙이는 자리: 새 관 rooms.<id>는 이 줄 바로 위에 */
  }
};
