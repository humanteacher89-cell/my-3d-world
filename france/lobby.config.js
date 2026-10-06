// 프랑스 한글학교 로비 설정 v0.2. 화면 글·학교·지역 색·학교 공간(교실) 내용은 여기서만 고친다.
// [확인 전] = 휴먼쌤 확인 전 문구. [예시] = 휴먼쌤이 줄 글·사진·영상으로 바꿀 자리.
// 학교 목록: 하위 에이전트 웹 조사(2026-10-05, 자료\한글학교-목록.md → 10-06 실존 확인 자료\한글학교-실존확인-20261006.md). 좌표는 도시 중심.
window.LOBBY_CONFIG = {
  version: 'v0.2',
  text: {
    title: '프랑스 한글학교 로비',                 // [확인 전]
    plaza: '만남의 광장',                          // [확인 전]
    plazaSub: '여기서 출발해요',                    // [확인 전]
    north: '북',
    flag: '한',
    hintTouch: '조이스틱이나 땅을 눌러 걸어요',
    hintMouse: 'W A S D 키나 땅을 눌러 걸어요',
    hintRoom: '교장 선생님이나 책·사진첩·TV 가까이 가 보세요',
    map: '전체 지도',
    mapClose: '내 위치로',
    list: '학교 목록',
    listTitle: '지역별 한글학교',
    listNote: '학교 목록은 공개된 연락처 자료를 옮긴 것이라 아직 확인 전입니다.',   // [확인 전]
    noSchools: '아직 표시할 학교가 없습니다.',
    close: '닫기',
    enter: '입장하기',
    pending: '확인 전',
    enterBody: '이 학교의 공간은 준비 중이에요. 먼저 클레르몽페랑 한글학교에 들어가 보세요.',   // [확인 전]
    back: '로비로 돌아가기',
    toLobby: '로비로',
    overHint: '가고 싶은 곳이나 학교를 누르면 바로 가요',
    me: '나',
    bot: '참가자 {n}',
    stat: '{n}명 · {fps}fps',
    botsButton: '시험용 참가자 50명 띄우기',
    botsToast: '시험용 참가자 50명이 광장 근처를 걸어 다녀요',
    loading: '지도를 펼치는 중',
    loadFail: '3D 도구를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로 고침해 주세요.',
    // 멀티플레이(온라인 중계 서버)
    nameTitle: '로비에서 쓸 이름',
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
    // 교실
    roomEnter: '{school}에 들어왔어요',
    talk: '말 걸기',
    open: '펼쳐 보기',
    photos: '사진 보기',
    watch: '영상 보기',
    next: '다음',
    start: '연습 시작',
    later: '나중에',
    listen: '듣기',
    choose: '알맞은 말을 골라 보세요',
    good: '좋아요!',
    tryAgain: '다시 골라 볼까요?',
    done: '연습 완료!',
    doneBody: '{title} 연습을 마쳤어요. 다른 학교에서도 만나요.',   // [확인 전]
    again: '다시 하기',
    progress: '{i} / {n}',
    sampleTag: '예시',
    photoSoon: '한글학교 사진은 나중에 넣어요',
    videoSoon: '소개 영상은 나중에 넣어요',
    principal: '교장 선생님',
    bookSign: '책',
    albumSign: '사진첩',
    tvSign: 'TV'
  },
  look: { sky: '#CDEBF6', sea: '#8DD3EA', base: '#EDE3CC', neighbor: '#DDE5D3', neighborLine: '#B9C4AC' },
  // 지역 코드(INSEE)별 한글·프랑스어 이름과 색. label: 땅에 쓴 이름의 크기(size, 칸)와 자리 옮김(dx 동쪽+, dz 남쪽+)
  regions: {
    '11': { ko: '일드프랑스', fr: 'Île-de-France', color: '#F7BE8F', label: { size: 6.5, dx: 1.5, dz: -5 } },
    '24': { ko: '상트르발드루아르', fr: 'Centre-Val de Loire', color: '#E8D3A6' },
    '27': { ko: '부르고뉴프랑슈콩테', fr: 'Bourgogne-Franche-Comté', color: '#EBA7A1', label: { dx: -4.1, dz: -5.7 } },
    '28': { ko: '노르망디', fr: 'Normandie', color: '#C9B8EA' },
    '32': { ko: '오드프랑스', fr: 'Hauts-de-France', color: '#A9D9B5' },
    '44': { ko: '그랑테스트', fr: 'Grand Est', color: '#F5DD8C' },
    '52': { ko: '페이드라루아르', fr: 'Pays de la Loire', color: '#C6E39C' },
    '53': { ko: '브르타뉴', fr: 'Bretagne', color: '#F2B3C4' },
    '75': { ko: '누벨아키텐', fr: 'Nouvelle-Aquitaine', color: '#E3B7DE' },
    '76': { ko: '옥시타니', fr: 'Occitanie', color: '#F4B49C', label: { dx: 4.4, dz: -2.6 } },
    '84': { ko: '오베르뉴론알프', fr: 'Auvergne-Rhône-Alpes', color: '#B9D7A6', label: { dx: -3.3, dz: 3.7 } },
    '93': { ko: '프로방스알프코트다쥐르', fr: "Provence-Alpes-Côte d'Azur", color: '#F9CF85' },
    '94': { ko: '코르시카', fr: 'Corse', color: '#A8D99A', label: { size: 4 } }
  },
  // 학교 목록에서 지역을 보여 주는 순서(북쪽부터)
  regionOrder: ['32', '28', '11', '44', '53', '52', '24', '27', '75', '84', '76', '93', '94'],
  plaza: { lon: 2.45, lat: 46.75 },   // 프랑스 본토 한가운데 근처(셰르 지방)
  landmarks: [{ id: 'eiffel', name: '에펠탑', lon: 2.2945, lat: 48.8584 }],
  mountains: [
    { name: '알프스', lon: [5.75, 7.7], lat: [43.95, 46.35], regions: ['84', '93'], count: 40, r: [1.0, 1.7], h: [1.8, 3.6], snow: 2.5, colors: ['#A9A09A', '#9D958F', '#B5ADA5'] },
    { name: '피레네', lon: [-1.7, 3.0], lat: [42.4, 43.1], regions: ['75', '76'], count: 26, r: [0.9, 1.4], h: [1.6, 3.0], snow: 2.4, colors: ['#A9A09A', '#B2A79C'] },
    { name: '중앙 산지', lon: [2.3, 4.0], lat: [44.7, 45.6], regions: ['84', '76'], count: 12, r: [0.9, 1.3], h: [0.9, 1.4], colors: ['#9CC28B', '#8DB77C', '#A8C995'] },
    { name: '보주', lon: [6.6, 7.3], lat: [47.8, 48.6], regions: ['44', '27'], count: 6, r: [0.8, 1.1], h: [0.8, 1.2], colors: ['#8DB77C', '#9CC28B'] },
    { name: '쥐라', lon: [5.6, 6.6], lat: [46.3, 47.2], regions: ['27', '84'], count: 7, r: [0.8, 1.1], h: [0.9, 1.3], colors: ['#8DB77C', '#9CC28B'] },
    { name: '코르시카', lon: [8.7, 9.4], lat: [41.7, 42.8], regions: ['94'], count: 8, r: [0.6, 1.0], h: [1.1, 2.0], colors: ['#A9A09A', '#9CC28B'] }
  ],
  trees: { count: 240, colors: ['#7FBF6A', '#6FB15E', '#8CCB76', '#5FA35A', '#94C77E'] },
  // 캐릭터 색 후보. 서버에는 번호(피부·머리색·옷·바지·머리 모양)만 보낸다
  charLook: {
    skin: ['#FFE0C7', '#F6CFAE', '#E8B48F', '#C98E66'],
    hair: ['#2B2420', '#4A3428', '#7A4E33', '#B98A57', '#E2C48F', '#6E7FA8'],
    shirt: ['#E0483E', '#2A4D9B', '#F2B544', '#3FA37A', '#8C6CD0', '#FFFFFF', '#F28DB2', '#4FB3D9'],
    pants: ['#2F3A56', '#4A5A78', '#6B5B4B', '#3D6B5A', '#7A4E3A']
  },
  // 멀티플레이: 같은 폴더 relay.json의 중계 서버 주소를 읽는다(없으면 혼자 보기). 주소 ?mp=0 끔, ?mp=ws://…/ws 시험 서버
  multiplayer: { file: 'relay.json', lobbyRoom: 'fr:lobby', roomPrefix: 'fr:', sendHz: 8 },
  // 한글학교 19곳 [확인 전]. rooms에 같은 id가 있으면 입장할 때 그 교실로 들어간다
  schools: [
    { id: 'paris', name: '파리 한글학교', nameFr: '', city: '파리', lon: 2.3522, lat: 48.8567, pending: true },
    { id: 'opera', name: '오페라 한글학교', nameFr: '', city: '파리', lon: 2.3522, lat: 48.8567, pending: true },
    { id: 'arissol', name: '파리 아리솔 한글학교', nameFr: 'Association Arissol', city: '파리', lon: 2.3522, lat: 48.8567, pending: true },
    { id: 'lyon', name: '리옹 한글학교', nameFr: '', city: '리옹', lon: 4.8350, lat: 45.7675, pending: true },
    { id: 'grenoble', name: '그르노블 한글학교', nameFr: '', city: '그르노블', lon: 5.7224, lat: 45.1715, pending: true },
    { id: 'strasbourg', name: '스트라스부르 한글학교', nameFr: '', city: '스트라스부르', lon: 7.7458, lat: 48.5833, pending: true },
    { id: 'toulouse', name: '툴루즈 한글학교', nameFr: '', city: '툴루즈', lon: 1.4440, lat: 43.6045, pending: true },
    { id: 'aix', name: '엑상프로방스 한글학교', nameFr: '', city: '엑상프로방스', lon: 5.4454, lat: 43.5263, pending: true },
    { id: 'bordeaux', name: '보르도 한글학교', nameFr: '', city: '보르도', lon: -0.5800, lat: 44.8400, pending: true },
    { id: 'montpellier', name: '몽펠리에 한글학교', nameFr: '', city: '몽펠리에', lon: 3.8772, lat: 43.6119, pending: true },
    { id: 'dijon', name: '디종 한글학교', nameFr: '', city: '디종', lon: 5.0167, lat: 47.3167, pending: true },
    { id: 'clermont', name: '클레르몽페랑 한글학교', nameFr: '', city: '클레르몽페랑', lon: 3.0824, lat: 45.7831, pending: true },
    { id: 'nantes', name: '낭트 한글학교', nameFr: '', city: '낭트', lon: -1.5528, lat: 47.2181, pending: true },
    { id: 'lille', name: '릴 한글학교', nameFr: '', city: '릴', lon: 3.0583, lat: 50.6278, pending: true },
    { id: 'tours', name: '투르 한글학교', nameFr: '', city: '투르', lon: 0.6892, lat: 47.3936, pending: true },
    { id: 'cholet', name: '숄레 한글학교', nameFr: '', city: '숄레', lon: -0.8783, lat: 47.0600, pending: true },
    { id: 'brest', name: '브레스트 한글학교', nameFr: '', city: '브레스트', lon: -4.4861, lat: 48.3906, pending: true },
    { id: 'marseille', name: '마르세유 한글학교', nameFr: '', city: '마르세유', lon: 5.3700, lat: 43.2964, pending: true },
    { id: 'lemans', name: '르망 한글학교', nameFr: '', city: '르망', lon: 0.1984, lat: 48.0077, pending: true }
  ],
  // ── 학교별 공간(교실) ──
  // 컨셉(휴먼쌤 2026-10-06): 교실마다 지역 특색 + 책(도시 소개 글)·사진첩(학교 사진)·TV(소개 영상) + 정면의 교장 NPC와 '한국어 회화' 버튼 선택 연습.
  // 지금은 클레르몽페랑 1곳만(검수용). 글·사진·영상은 휴먼쌤이 주는 것으로 바꾼다([예시]).
  rooms: {
    clermont: {
      theme: {
        wall: '#FBF3E2', wainscot: '#D9C4A0', floor: ['#D9B583', '#CFA874', '#E0BD8E'], rug: '#9FC7A3', board: '#2F5D50',
        sky: '#D7ECF7',
        // 창밖 풍경: 오베르뉴의 화산 봉우리(퓌드돔) 둥근 능선 [예시]
        view: { kind: 'volcano', sky: ['#9CD1F0', '#E8F4FB'], hills: ['#6FA86B', '#4F8A57'], peak: '#577E5B', peakTop: '#8FB08A' },
        // 벽 포스터: 검은 화산암 성당 실루엣 [예시]
        poster: { title: '클레르몽페랑', sub: 'Clermont-Ferrand · Auvergne', kind: 'cathedral', color: '#2B2B2F' }
      },
      boardTitle: '클레르몽페랑 한글학교',
      boardLine: '오늘의 회화 · 쇼핑하기',                          // [확인 전]
      welcome: '클레르몽페랑 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전] 실제 호칭·이름은 휴먼쌤이 정함
        look: { skin: '#F6CFAE', hair: '#4A3428', hairStyle: 1, shirt: '#3E6B8F', pants: '#2F3A56' },
        lines: [                                                     // [확인 전] 말 걸면 차례로 나오는 인사
          '안녕하세요! 클레르몽페랑 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 클레르몽페랑에서는 저와 같이 \'쇼핑하기\'를 연습해 볼 거예요.',
          '제가 가게 점원이 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '클레르몽페랑',
          sub: 'Clermont-Ferrand · 오베르뉴론알프',
          // [예시] 휴먼쌤이 줄 소개 글로 바꾼다. 아래는 자리만 보여 주는 보기 글(확인 전).
          text: '클레르몽페랑은 프랑스 중부 오베르뉴 지방의 중심 도시예요. 도시 서쪽에는 둥근 화산 봉우리들이 줄지어 서 있고, 가장 유명한 봉우리가 퓌드돔이에요.\n\n옛 시가지의 큰 성당은 이 지역의 검은 화산암으로 지어서 멀리서도 눈에 띄어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '클레르몽페랑 한글학교 사진첩',
          photos: [],                                                // [예시] 사진 주소를 넣으면 그 사진이 보인다. 비면 빈 액자
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '클레르몽페랑 소개 영상',
          video: '',                                                 // [예시] 유튜브 embed 주소(https://www.youtube.com/embed/영상ID)를 넣으면 재생
          sample: true
        }
      },
      // 한국어 회화 상황(버튼 선택형). 교실마다 여러 개를 둘 수 있다. 지금은 '쇼핑하기' 하나 [예시, 확인 전]
      situations: [
        {
          id: 'shopping', title: '쇼핑하기', npcRole: '점원',
          steps: [
            { npc: '어서 오세요! 무엇을 찾으세요?',
              choices: [
                { ko: '사과를 사고 싶어요.', ok: true },
                { ko: '안녕히 계세요.', hint: '가게에 들어가면 사고 싶은 것을 먼저 말해요.' },
                { ko: '저는 열 살이에요.', hint: '점원이 무엇을 찾는지 물었어요.' }
              ] },
            { npc: '사과는 여기 있어요. 몇 개 드릴까요?',
              choices: [
                { ko: '세 개 주세요.', ok: true },
                { ko: '고맙습니다. 잘 먹었어요.', hint: '아직 사과를 받지 않았어요. 몇 개인지 말해요.' },
                { ko: '내일 봐요.', hint: '몇 개가 필요한지 대답해요.' }
              ] },
            { npc: '네, 세 개요. 더 필요한 것 있으세요?',
              choices: [
                { ko: '아니요, 괜찮아요. 얼마예요?', ok: true },
                { ko: '네, 저는 프랑스에 살아요.', hint: '더 살 것이 있는지 물었어요. 없으면 값을 물어봐요.' },
                { ko: '잘 자요.', hint: '가게에서 하는 인사가 아니에요.' }
              ] },
            { npc: '모두 삼 유로예요.',
              choices: [
                { ko: '여기 있어요.', ok: true },
                { ko: '맛있게 드세요.', hint: '돈을 낼 차례예요.' },
                { ko: '몇 시예요?', hint: '값을 들었으니 돈을 내요.' }
              ] },
            { npc: '감사합니다. 안녕히 가세요!',
              choices: [
                { ko: '안녕히 계세요!', ok: true, note: '가게에 남는 사람에게는 \'안녕히 계세요\'라고 해요.' },
                { ko: '안녕히 가세요!', hint: '점원은 가게에 남아요. 남는 사람에게는 \'안녕히 계세요\'.' },
                { ko: '어서 오세요!', hint: '손님을 맞을 때 점원이 하는 말이에요.' }
              ] }
          ]
        }
      ]
    }
  }
};
