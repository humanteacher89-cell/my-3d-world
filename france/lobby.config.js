// 프랑스 한글학교 로비 설정 v0.2. 화면 글·학교·지역 색·학교 공간(교실) 내용은 여기서만 고친다.
// [확인 전] = 휴먼쌤 확인 전 문구. [예시] = 휴먼쌤이 줄 글·사진·영상으로 바꿀 자리.
// 학교 목록: 하위 에이전트 웹 조사(2026-10-05, 자료\한글학교-목록.md → 10-06 실존 확인 자료\한글학교-실존확인-20261006.md, 20곳·소재지 좌표).
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
    listNote: '학교 목록은 주프랑스 대사관 연락처 표와 스터디코리안 한글학교 정보(2026년)로 확인했습니다. \'확인 전\' 표시는 올해 운영이 확인되지 않은 곳입니다.',   // [확인 전]
    noSchools: '아직 표시할 학교가 없습니다.',
    close: '닫기',
    enter: '입장하기',
    pending: '확인 전',
    enterBody: '이 학교의 공간은 준비 중이에요. 먼저 클레르몽페랑 한글학교에 들어가 보세요.',   // [확인 전]
    back: '로비로 돌아가기',
    toLobby: '로비로',
    exitSign: '로비로',                            // 교실 문 위 이름판·문 앞 발판 글
    exitName: '로비로 나가기',
    exitSub: '프랑스 지도 로비로 돌아가요',
    exitBtn: '나가기',
    homepage: '홈페이지',                           // 학교 카드·교실 책의 링크(주소는 schools[].web, 관리자 페이지에서 바꿀 수 있다)
    moreLinks: '더 알아보기',
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
    '11': { ko: '일드프랑스', fr: 'Île-de-France', color: '#F7BE8F', label: { size: 6.5, dx: 2.5, dz: -2.5 } },   // 10-06 검수: 옛 값(dz -5)은 오드프랑스 땅에 걸침
    '24': { ko: '상트르발드루아르', fr: 'Centre-Val de Loire', color: '#E8D3A6' },
    '27': { ko: '부르고뉴프랑슈콩테', fr: 'Bourgogne-Franche-Comté', color: '#EBA7A1', label: { dx: -6.6, dz: 0.3 } },   // 10-06 검수 제안값
    '28': { ko: '노르망디', fr: 'Normandie', color: '#C9B8EA' },
    '32': { ko: '오드프랑스', fr: 'Hauts-de-France', color: '#A9D9B5' },
    '44': { ko: '그랑테스트', fr: 'Grand Est', color: '#F5DD8C' },
    '52': { ko: '페이드라루아르', fr: 'Pays de la Loire', color: '#C6E39C' },
    '53': { ko: '브르타뉴', fr: 'Bretagne', color: '#F2B3C4' },
    '75': { ko: '누벨아키텐', fr: 'Nouvelle-Aquitaine', color: '#E3B7DE' },
    '76': { ko: '옥시타니', fr: 'Occitanie', color: '#F4B49C', label: { dx: 4.4, dz: -2.6 } },
    '84': { ko: '오베르뉴론알프', fr: 'Auvergne-Rhône-Alpes', color: '#B9D7A6', label: { dx: -3.3, dz: 3.7 } },
    '93': { ko: '프로방스알프코트다쥐르', fr: "Provence-Alpes-Côte d'Azur", color: '#F9CF85' },
    '94': { ko: '코르시카', fr: 'Corse', color: '#A8D99A', label: { size: 7 } }   // 10-06 검수: 4는 전체 지도에서 안 읽힘
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
  multiplayer: { file: 'relay.json', lobbyRoom: 'fr:lobby', roomPrefix: 'fr:', sendHz: 4 },   // sendHz: 움직일 때 초당 보내는 횟수(Cloudflare 무료 한도 때문에 낮게. 60명 예정이라 10-06 6 → 4)
  // 한글학교 20곳. 실존 확인 2026-10-06(하위 에이전트, 자료\한글학교-실존확인-20261006.md): 주프랑스 대사관 연락처 표(원문)·한국교육원 지도·
  // 스터디코리안 한글학교 정보(2026-01)에 모두 있는 곳 = 등급 ◎. 좌표는 학교 소재지(번지 수준). 연구부 '검증' 딱지는 아직 아님.
  // pending: true = 아직 확인 중(숄레: 2026 스터디코리안 목록에 없고 최근 활동 근거 2025-06). rooms에 같은 id가 있으면 입장할 때 그 교실로 들어간다
  schools: [
    { id: 'paris', name: '파리 한글학교', nameFr: 'École coréenne de Paris', city: '파리', lon: 2.3627, lat: 48.8250, web: 'https://www.helloasso.com/associations/ecole-coreenne-de-paris' },
    { id: 'opera', name: '오페라 한글학교', nameFr: "École coréenne de l'Opéra de Paris", city: '파리', lon: 2.3362, lat: 48.8743, web: 'https://www.instagram.com/hangeul75009/' },
    { id: 'arissol', name: '파리 아리솔 한글학교', nameFr: 'École coréenne Arissol', city: '파리', lon: 2.3302, lat: 48.8553, web: 'https://fr.arissol-association.com/' },
    { id: 'lyon', name: '리옹 한글학교', nameFr: 'École coréenne de Lyon', city: '리옹', lon: 4.8862, lat: 45.7584, web: 'https://www.ecolecoreenlyon.fr/' },
    { id: 'lium', name: '리옹 에콜리움 한글학교', nameFr: 'Lium École coréenne', city: '리옹', lon: 4.8323, lat: 45.7547, web: 'https://www.ecolelium.com/' },
    { id: 'grenoble', name: '그르노블 한글학교', nameFr: 'Association franco-coréenne de Grenoble et de l\'Isère', city: '그르노블', lon: 5.8229, lat: 45.1913, web: 'https://afcgi.wordpress.com/' },
    { id: 'strasbourg', name: '스트라스부르 한글학교', nameFr: 'École coréenne de Strasbourg', city: '스트라스부르', lon: 7.7779, lat: 48.5821, web: 'https://ecolecoreenne.blogspot.com/' },
    { id: 'toulouse', name: '툴루즈 한글학교', nameFr: 'École coréenne de Toulouse', city: '툴루즈', lon: 1.3916, lat: 43.5853, web: '' },
    { id: 'aix', name: '엑상프로방스 한글학교', nameFr: "École coréenne d'Aix-en-Provence", city: '엑상프로방스', lon: 5.4463, lat: 43.5149, web: 'https://ecole-coreenne.fr/' },
    { id: 'bordeaux', name: '보르도 한글학교', nameFr: 'École coréenne de Bordeaux', city: '보르도', lon: -0.5665, lat: 44.8318, web: 'https://ecolecoreennedebordeaux.fr/' },
    { id: 'montpellier', name: '몽펠리에 한글학교', nameFr: 'École coréenne de Montpellier', city: '몽펠리에', lon: 4.0799, lat: 43.7276, web: 'https://ecolecoreennemontpellier.wordpress.com/' },
    { id: 'dijon', name: '디종 한글학교', nameFr: 'École coréenne de Dijon', city: '디종', lon: 5.0253, lat: 47.3208, web: 'https://www.instagram.com/ecole_coreenne_de_dijon_/' },
    { id: 'clermont', name: '클레르몽페랑 한글학교', nameFr: 'École coréenne de Clermont-Ferrand', city: '클레르몽페랑', lon: 3.0854, lat: 45.7818, web: 'https://ecolecoreennecf63.wixsite.com/clermont-ferrand' },
    { id: 'nantes', name: '낭트 한글학교', nameFr: 'École coréenne de Nantes', city: '낭트', lon: -1.5645, lat: 47.2593, web: 'https://www.helloasso.com/associations/ecole-coreenne-de-nantes-44' },
    { id: 'lille', name: '릴 한글학교', nameFr: 'École coréenne de Lille', city: '릴', lon: 3.0905, lat: 50.6372, web: 'https://www.ecolecoreennelille.com/' },
    { id: 'tours', name: '투르 한글학교', nameFr: 'École coréenne de Tours', city: '투르', lon: 0.7088, lat: 47.4203, web: 'https://www.salangchae.com/' },
    { id: 'cholet', name: '숄레 한글학교', nameFr: 'École coréenne de Cholet', city: '숄레', lon: -0.8841, lat: 47.0565, web: 'https://www.facebook.com/ecolecoreennecholet/', pending: true },
    { id: 'brest', name: '브레스트 한글학교', nameFr: 'École coréenne de Brest', city: '브레스트', lon: -4.4687, lat: 48.4043, web: 'https://www.ecolecoreennebrest.org/' },
    { id: 'marseille', name: '마르세유 한글학교', nameFr: 'École coréenne de Marseille', city: '마르세유', lon: 5.3817, lat: 43.2981, web: 'https://www.ecolecoreennedemarseille.fr/' },
    { id: 'lemans', name: '르망 한글학교', nameFr: 'Le Mans École coréenne', city: '르망', lon: 0.1844, lat: 48.0267, web: 'https://www.instagram.com/lemansecolecoreenne/' }
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
        poster: { title: '클레르몽페랑', sub: 'Clermont-Ferrand · Auvergne', kind: 'cathedral', color: '#2B2B2F', foot: 'Auvergne · France' }
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
    },
    // ── 10-06 휴먼쌤 "숄레·디종·리옹 한글학교는 빼고 나머지 전부 공간" → 16곳 [예시, 확인 전] ──
    paris: {
      theme: {
        wall: '#FCF1E6', wainscot: '#E3C9B0', floor: ['#E0BC8E', '#D6AF80', '#E8C79A'], rug: '#F2B8B5', board: '#33506B',
        sky: '#DCEAF7',
        view: { kind: 'city', sky: ['#A9D4F2', '#F1F7FC'], far: '#C9D3E3', near: '#9BA9C4', water: '#8EC3E6', accent: '#E8A87C' },
        poster: { title: '파리', sub: 'Paris · Île-de-France', kind: 'eiffel', color: '#4A5C7A', foot: 'Île-de-France · France' }
      },
      boardTitle: '파리 한글학교',
      boardLine: '오늘의 회화 · 인사·자기소개',                      // [확인 전]
      welcome: '파리 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#F6CFAE', hair: '#2B2420', hairStyle: 0, shirt: '#B85C6B', pants: '#3A3F5C' },
        lines: [
          '안녕하세요! 파리 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 파리에서는 저와 같이 \'인사·자기소개\'를 연습해 볼 거예요.',
          '제가 새 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '파리',
          sub: 'Paris · 일드프랑스',
          text: '파리는 프랑스의 수도예요. 도시 가운데로 센강이 흐르고, 강 위에는 다리가 많아요.\n\n철로 만든 높은 에펠탑과 강가의 노트르담 성당이 아주 유명해요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '파리 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']
        },
        tv: {
          title: '파리 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'intro', title: '인사·자기소개', npcRole: '새 친구',
          steps: [
            { npc: '안녕하세요! 만나서 반가워요.',
              choices: [
                { ko: '안녕하세요! 저도 반가워요.', ok: true },
                { ko: '안녕히 계세요.', hint: '헤어질 때 하는 인사예요. 지금은 처음 만났어요.' },
                { ko: '맛있게 드세요.', hint: '밥을 먹을 때 하는 말이에요.' }
              ] },
            { npc: '이름이 뭐예요?',
              choices: [
                { ko: '저는 열 살이에요.', hint: '이름을 물었어요. 나이를 말하면 안 맞아요.' },
                { ko: '제 이름은 민준이에요.', ok: true },
                { ko: '파리에 살아요.', hint: '사는 곳이 아니라 이름을 물었어요.' }
              ] },
            { npc: '몇 살이에요?',
              choices: [
                { ko: '저는 열 살이에요.', ok: true },
                { ko: '네, 좋아요.', hint: '나이를 물었어요. 숫자로 대답해요.' },
                { ko: '고맙습니다.', hint: '고마울 때 하는 말이에요. 나이를 말해 주세요.' }
              ] },
            { npc: '어디에 살아요?',
              choices: [
                { ko: '내일 봐요.', hint: '사는 곳을 물었어요.' },
                { ko: '저는 사과를 좋아해요.', hint: '무엇을 좋아하는지가 아니라 사는 곳을 물었어요.' },
                { ko: '저는 파리에 살아요.', ok: true }
              ] },
            { npc: '오늘 만나서 정말 좋았어요. 다음에 또 만나요!',
              choices: [
                { ko: '네, 다음에 또 만나요. 안녕히 가세요!', ok: true, note: '헤어질 때는 \'안녕히 가세요\', \'다음에 또 만나요\'라고 해요.' },
                { ko: '처음 뵙겠습니다.', hint: '처음 만날 때 하는 인사예요.' },
                { ko: '이름이 뭐예요?', hint: '이미 이름을 알고 있어요. 헤어지는 인사를 해요.' }
              ] }
          ]
        }
      ]
    },
    opera: {
      theme: {
        wall: '#FAF0F0', wainscot: '#DDB9B9', floor: ['#DDB892', '#D2AB85', '#E6C6A0'], rug: '#C9B6E4', board: '#4A3A63',
        sky: '#E6DDF3',
        view: { kind: 'city', sky: ['#C8B8E8', '#FBEFF5'], far: '#D9CBE6', near: '#B39BCB', water: '#A6C8E6', accent: '#F2C94C' },
        poster: { title: '파리', sub: 'Paris · Île-de-France', kind: 'opera', color: '#B8860B', foot: 'Île-de-France · France' }
      },
      boardTitle: '오페라 한글학교',
      boardLine: '오늘의 회화 · 친구와 약속 정하기',                  // [확인 전]
      welcome: '오페라 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#FFE0C7', hair: '#6E7FA8', hairStyle: 2, shirt: '#7B5EA7', pants: '#2E2E3E' },
        lines: [
          '안녕하세요! 오페라 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 파리에서는 저와 같이 \'친구와 약속 정하기\'를 연습해 볼 거예요.',
          '제가 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '파리',
          sub: 'Paris · 일드프랑스',
          text: '파리의 오페라 거리에는 화려한 오페라 극장이 있어요. 금빛 장식이 많아서 멀리서도 눈에 띄어요.\n\n근처에는 큰 가게와 카페가 많아서 사람들이 늘 모여요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '오페라 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']
        },
        tv: {
          title: '파리 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'meetup', title: '친구와 약속 정하기', npcRole: '친구',
          steps: [
            { npc: '안녕! 이번 주말에 시간 있어요?',
              choices: [
                { ko: '고맙습니다. 잘 먹었어요.', hint: '밥을 먹은 뒤에 하는 말이에요. 시간이 있는지 대답해요.' },
                { ko: '네, 시간 있어요.', ok: true },
                { ko: '저는 열 살이에요.', hint: '나이를 묻지 않았어요.' }
              ] },
            { npc: '같이 놀아요! 무슨 요일이 좋아요?',
              choices: [
                { ko: '토요일이 좋아요.', ok: true },
                { ko: '사과 세 개 주세요.', hint: '가게에서 쓰는 말이에요. 요일을 말해요.' },
                { ko: '안녕히 계세요.', hint: '지금은 헤어지는 때가 아니에요.' }
              ] },
            { npc: '좋아요. 몇 시에 만날까요?',
              choices: [
                { ko: '오페라 극장이 예뻐요.', hint: '시간을 물었어요. 몇 시인지 말해요.' },
                { ko: '비가 와요.', hint: '날씨 이야기예요. 시간을 정해요.' },
                { ko: '두 시에 만나요.', ok: true }
              ] },
            { npc: '어디에서 만날까요?',
              choices: [
                { ko: '공원 앞에서 만나요.', ok: true },
                { ko: '열 살이에요.', hint: '장소를 물었어요. 어디인지 말해요.' },
                { ko: '맛있어요.', hint: '음식 이야기가 아니에요. 장소를 말해요.' }
              ] },
            { npc: '좋아요! 토요일 두 시에 공원 앞에서 만나요. 그때 봐요!',
              choices: [
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '네, 토요일에 봐요. 안녕!', ok: true, note: '약속을 하고 헤어질 때는 \'그때 봐요\', \'토요일에 봐요\'라고 해요.' },
                { ko: '처음 뵙겠습니다.', hint: '처음 만날 때 하는 인사예요.' }
              ] }
          ]
        }
      ]
    },
    arissol: {
      theme: {
        wall: '#F2F7EC', wainscot: '#C9D8B8', floor: ['#D9BE92', '#CEB285', '#E3C89E'], rug: '#F5D08A', board: '#2F5F5A',
        sky: '#D9EFF2',
        view: { kind: 'river', sky: ['#9ED8E6', '#EEF8F4'], far: '#BFD8C4', near: '#8CBF9A', water: '#7EB8DA', accent: '#F0A868' },
        poster: { title: '파리', sub: 'Paris · Île-de-France', kind: 'bridge', color: '#5A7A6A', foot: 'Île-de-France · France' }
      },
      boardTitle: '파리 아리솔 한글학교',
      boardLine: '오늘의 회화 · 가족 소개',                          // [확인 전]
      welcome: '파리 아리솔 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#E8B48F', hair: '#7A4E33', hairStyle: 1, shirt: '#4F9A8A', pants: '#4A4A5A' },
        lines: [
          '안녕하세요! 파리 아리솔 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 파리에서는 저와 같이 \'가족 소개\'를 연습해 볼 거예요.',
          '제가 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '파리',
          sub: 'Paris · 일드프랑스',
          text: '파리 한가운데로 센강이 천천히 흘러요. 강에는 오래된 다리와 새 다리가 많이 놓여 있어요.\n\n강가를 따라 걸으면 책을 파는 작은 가게들과 예쁜 건물들을 볼 수 있어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '파리 아리솔 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']
        },
        tv: {
          title: '파리 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'family', title: '가족 소개', npcRole: '친구',
          steps: [
            { npc: '우리 집 사진이에요. 가족이 몇 명이에요?',
              choices: [
                { ko: '저는 열 살이에요.', hint: '나이가 아니라 가족이 몇 명인지 물었어요.' },
                { ko: '안녕히 가세요.', hint: '헤어질 때 하는 인사예요.' },
                { ko: '우리 가족은 네 명이에요.', ok: true }
              ] },
            { npc: '누가 있어요?',
              choices: [
                { ko: '엄마, 아빠, 동생, 그리고 저예요.', ok: true },
                { ko: '파리에 살아요.', hint: '사는 곳이 아니라 가족을 소개해요.' },
                { ko: '토요일에 만나요.', hint: '약속 이야기가 아니에요.' }
              ] },
            { npc: '동생은 몇 살이에요?',
              choices: [
                { ko: '맛있게 드세요.', hint: '밥 먹을 때 하는 말이에요. 나이를 대답해요.' },
                { ko: '동생은 여섯 살이에요.', ok: true },
                { ko: '네, 괜찮아요.', hint: '나이를 물었어요. 숫자로 대답해요.' }
              ] },
            { npc: '아빠는 무엇을 좋아하세요?',
              choices: [
                { ko: '고맙습니다.', hint: '고마울 때 하는 말이에요. 아빠가 좋아하는 것을 말해요.' },
                { ko: '아빠는 축구를 좋아하세요.', ok: true },
                { ko: '얼마예요?', hint: '가게에서 값을 물을 때 하는 말이에요.' }
              ] },
            { npc: '가족 이야기 고마워요. 오늘 정말 즐거웠어요. 안녕!',
              choices: [
                { ko: '어서 오세요!', hint: '손님을 맞는 말이에요. 지금은 헤어지는 인사를 해요.' },
                { ko: '이름이 뭐예요?', hint: '벌써 아는 사이예요. 인사로 끝내요.' },
                { ko: '저도 즐거웠어요. 안녕히 가세요!', ok: true, note: '헤어질 때는 \'안녕히 가세요\'라고 인사해요.' }
              ] }
          ]
        }
      ]
    },
    lium: {
      theme: {
        wall: '#FFF4E0', wainscot: '#E6C99B', floor: ['#DDB27F', '#D2A672', '#E7C092'], rug: '#E8A598', board: '#6B3E2E',
        sky: '#FBE6CF',
        view: { kind: 'river', sky: ['#F7C99B', '#FDF1E0'], far: '#E3B9A0', near: '#C98F78', water: '#8FB9D6', accent: '#E8836B' },
        poster: { title: '리옹', sub: 'Lyon · Auvergne-Rhône-Alpes', kind: 'basilica', color: '#C97B5A', foot: 'Auvergne-Rhône-Alpes · France' }
      },
      boardTitle: '리옹 에콜리움 한글학교',
      boardLine: '오늘의 회화 · 음식 주문하기',                      // [확인 전]
      welcome: '리옹 에콜리움 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#C98E66', hair: '#2B2420', hairStyle: 2, shirt: '#D9822B', pants: '#3B3B4F' },
        lines: [
          '안녕하세요! 리옹 에콜리움 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 리옹에서는 저와 같이 \'음식 주문하기\'를 연습해 볼 거예요.',
          '제가 식당 직원이 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '리옹',
          sub: 'Lyon · 오베르뉴론알프',
          text: '리옹은 프랑스 남동쪽에 있는 큰 도시예요. 도시 안으로 론강과 손강, 두 강이 흘러요.\n\n언덕 위에는 하얀 성당이 서 있고, 맛있는 음식으로도 이름난 도시예요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '리옹 에콜리움 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']
        },
        tv: {
          title: '리옹 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'order', title: '음식 주문하기', npcRole: '식당 직원',
          steps: [
            { npc: '어서 오세요! 몇 분이세요?',
              choices: [
                { ko: '두 명이에요.', ok: true },
                { ko: '안녕히 계세요.', hint: '들어오자마자 하는 인사가 아니에요. 사람 수를 말해요.' },
                { ko: '저는 열 살이에요.', hint: '몇 명인지 물었어요.' }
              ] },
            { npc: '여기 메뉴예요. 무엇을 드릴까요?',
              choices: [
                { ko: '내일 봐요.', hint: '헤어질 때 하는 말이에요. 먹고 싶은 것을 말해요.' },
                { ko: '피자 하나 주세요.', ok: true },
                { ko: '제 이름은 민준이에요.', hint: '이름을 묻지 않았어요. 주문을 해요.' }
              ] },
            { npc: '마실 것은 무엇으로 드릴까요?',
              choices: [
                { ko: '물 주세요.', ok: true },
                { ko: '토요일에 만나요.', hint: '약속 이야기가 아니에요. 마실 것을 골라요.' },
                { ko: '파리에 살아요.', hint: '사는 곳을 묻지 않았어요.' }
              ] },
            { npc: '음식 나왔어요. 맛있게 드세요!',
              choices: [
                { ko: '처음 뵙겠습니다.', hint: '처음 만날 때 하는 인사예요.' },
                { ko: '어디에 살아요?', hint: '음식을 받았을 때 하는 말이 아니에요.' },
                { ko: '고맙습니다. 잘 먹겠습니다!', ok: true }
              ] },
            { npc: '맛있게 드셨어요? 안녕히 가세요!',
              choices: [
                { ko: '네, 맛있었어요. 안녕히 계세요!', ok: true, note: '식당에 남는 사람에게는 \'안녕히 계세요\'라고 해요.' },
                { ko: '어서 오세요!', hint: '손님을 맞을 때 직원이 하는 말이에요.' },
                { ko: '피자 하나 주세요.', hint: '이미 다 먹었어요. 인사로 끝내요.' }
              ] }
          ]
        }
      ]
    },
    grenoble: {
      theme: {
        wall: '#EEF6FA', wainscot: '#B9CFDB', floor: ['#D8C09A', '#CFB68D', '#E2CCA8'], rug: '#9CC3DD', board: '#2D4F66',
        sky: '#D8EDF9',
        view: { kind: 'mountain', sky: ['#9ED3F2', '#EAF6FC'], far: '#B8C9DD', near: '#6E9A6B', water: '#8EC1DF', accent: '#FFFFFF' },
        poster: { title: '그르노블', sub: 'Grenoble · Auvergne-Rhône-Alpes', kind: 'cablecar', color: '#D9534F', foot: 'Auvergne-Rhône-Alpes · France' }
      },
      boardTitle: '그르노블 한글학교',
      boardLine: '오늘의 회화 · 날씨와 계절',                          // [확인 전]
      welcome: '그르노블 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#FFE0C7', hair: '#6E7FA8', hairStyle: 2, shirt: '#4F8FB5', pants: '#3B4A63' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 그르노블 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 그르노블에서는 저와 같이 \'날씨와 계절\'을 연습해 볼 거예요.',
          '제가 이웃집 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '그르노블',
          sub: 'Grenoble · 오베르뉴론알프',
          text: '그르노블은 프랑스 동쪽, 알프스 산맥 가까이에 있는 도시예요. 도시 둘레를 높은 산이 빙 둘러싸고 있고, 도시 옆으로 이제르강이 흘러요.\n\n강가 언덕 위에는 바스티유라는 옛 요새가 있어요. 둥근 케이블카를 타고 올라갈 수 있어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '그르노블 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '그르노블 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'weather', title: '날씨와 계절', npcRole: '이웃집 친구',
          steps: [
            { npc: '안녕! 오늘 날씨가 어때요?',
              choices: [
                { ko: '비가 와요. 우산이 필요해요.', ok: true },
                { ko: '저는 학교에 가요.', hint: '날씨가 어떤지 물었어요. 날씨로 대답해요.' },
                { ko: '사과가 맛있어요.', hint: '날씨와 상관없는 이야기예요.' }
              ] },
            { npc: '그렇군요. 그르노블에는 눈이 자주 와요. 눈 좋아해요?',
              choices: [
                { ko: '고맙습니다.', hint: '눈을 좋아하는지 물었어요. 고마운 일이 아니에요.' },
                { ko: '네, 눈사람을 만들고 싶어요.', ok: true },
                { ko: '아니요, 열 시예요.', hint: '시간을 묻는 질문이 아니에요.' }
              ] },
            { npc: '저는 겨울이 좋아요. 어느 계절을 제일 좋아해요?',
              choices: [
                { ko: '안녕히 주무세요.', hint: '잠자기 전에 하는 인사예요.' },
                { ko: '저는 일곱 살이에요.', hint: '좋아하는 계절을 물었어요.' },
                { ko: '저는 여름이 제일 좋아요.', ok: true }
              ] },
            { npc: '여름에는 뭐 해요?',
              choices: [
                { ko: '산에서 친구들과 놀아요.', ok: true },
                { ko: '죄송합니다.', hint: '사과할 일이 없어요. 하는 일을 말해요.' },
                { ko: '얼마예요?', hint: '값을 묻는 말이에요. 여기에는 맞지 않아요.' }
              ] },
            { npc: '재미있겠네요! 오늘 만나서 반가웠어요. 안녕히 가세요!',
              choices: [
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '네, 안녕히 가세요!', hint: '내가 먼저 가는 게 아니라 친구가 가요. 헤어질 때는 \'다음에 또 만나요\'도 좋아요.' },
                { ko: '다음에 또 만나요. 안녕!', ok: true, note: '헤어질 때 \'다음에 또 만나요\'라고 말할 수 있어요.' }
              ] }
          ]
        }
      ]
    },
    strasbourg: {
      theme: {
        wall: '#FFF1E0', wainscot: '#C9A27A', floor: ['#D6B07F', '#CCA574', '#E0BC8D'], rug: '#E8A9A0', board: '#4A3A5C',
        sky: '#E2EEF8',
        view: { kind: 'river', sky: ['#A8D5F0', '#F1F7FB'], far: '#C9B8A8', near: '#8FB57A', water: '#7FB3D5', accent: '#D98B5F' },
        poster: { title: '스트라스부르', sub: 'Strasbourg · Grand Est', kind: 'house', color: '#C9704F', foot: 'Grand Est · France' }
      },
      boardTitle: '스트라스부르 한글학교',
      boardLine: '오늘의 회화 · 명절(설날·추석)',                      // [확인 전]
      welcome: '스트라스부르 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#E8B48F', hair: '#2B2420', hairStyle: 0, shirt: '#B5563E', pants: '#3D3A4F' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 스트라스부르 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 스트라스부르에서는 저와 같이 \'명절(설날·추석)\'을 연습해 볼 거예요.',
          '제가 할머니가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '스트라스부르',
          sub: 'Strasbourg · 그랑테스트',
          text: '스트라스부르는 프랑스 동쪽, 독일과 가까운 도시예요. 도시 가까이로 라인강이 흘러요.\n\n도시 한가운데에는 하늘로 높이 솟은 큰 대성당이 있어요. 강가에는 나무 기둥이 보이는 예쁜 옛집들이 모여 있어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '스트라스부르 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '설날 윷놀이', '졸업식']   // [예시]
        },
        tv: {
          title: '스트라스부르 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'holiday', title: '명절(설날·추석)', npcRole: '할머니',
          steps: [
            { npc: '우리 강아지 왔구나! 설날이야. 할머니께 뭐라고 인사할까?',
              choices: [
                { ko: '안녕히 주무세요.', hint: '잠자기 전에 하는 인사예요.' },
                { ko: '할머니, 새해 복 많이 받으세요!', ok: true },
                { ko: '할머니, 생일 축하해요!', hint: '오늘은 생일이 아니라 설날이에요.' }
              ] },
            { npc: '고맙다. 자, 세배 잘했으니 세뱃돈 받으렴. 뭐라고 말할까?',
              choices: [
                { ko: '고맙습니다, 할머니!', ok: true },
                { ko: '미안해요.', hint: '선물을 받았으니 고마운 마음을 말해요.' },
                { ko: '저는 괜찮아요.', hint: '받을 때는 먼저 고맙다고 말해요.' }
              ] },
            { npc: '떡국도 먹자. 설날에는 떡국을 먹어요. 맛있게 먹어!',
              choices: [
                { ko: '내일 봐요.', hint: '지금 밥을 먹으려고 해요.' },
                { ko: '네, 잘 먹겠습니다!', ok: true },
                { ko: '얼마예요?', hint: '집에서 먹는 음식이라 값을 묻지 않아요.' }
              ] },
            { npc: '가을에는 추석이 있어요. 추석에는 무슨 음식을 먹는지 알아요?',
              choices: [
                { ko: '저는 열 살이에요.', hint: '무슨 음식인지 물었어요.' },
                { ko: '비가 와요.', hint: '날씨를 말하는 게 아니에요.' },
                { ko: '네, 송편을 먹어요.', ok: true }
              ] },
            { npc: '잘 아는구나! 이제 늦었다. 조심히 가렴. 안녕히 가거라.',
              choices: [
                { ko: '네, 할머니 안녕히 계세요!', ok: true, note: '집에 남는 할머니께는 \'안녕히 계세요\'라고 해요.' },
                { ko: '네, 할머니 안녕히 가세요!', hint: '할머니는 집에 계세요. 남는 분께는 \'안녕히 계세요\'.' },
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' }
              ] }
          ]
        }
      ]
    },
    toulouse: {
      theme: {
        wall: '#FCEDE6', wainscot: '#D9A58F', floor: ['#D9B089', '#CFA57E', '#E3BD98'], rug: '#E7B3A8', board: '#5A3A44',
        sky: '#F8E4DD',
        view: { kind: 'city', sky: ['#A9D4EE', '#FCEFE8'], far: '#D9A08A', near: '#B86F5C', water: '#8DB8D4', accent: '#E8C8B8' },
        poster: { title: '툴루즈', sub: 'Toulouse · Occitanie', kind: 'plane', color: '#4F7FB8', foot: 'Occitanie · France' }
      },
      boardTitle: '툴루즈 한글학교',
      boardLine: '오늘의 회화 · 버스와 지하철 타기',                  // [확인 전]
      welcome: '툴루즈 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#C98E66', hair: '#2B2420', hairStyle: 1, shirt: '#D07A5F', pants: '#35405C' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 툴루즈 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 툴루즈에서는 저와 같이 \'교통 이용하기\'를 연습해 볼 거예요.',
          '제가 지하철역 직원이 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '툴루즈',
          sub: 'Toulouse · 옥시타니',
          text: '툴루즈는 프랑스 남서쪽에 있는 큰 도시예요. 도시 안으로 가론강이 흘러요.\n\n붉은 벽돌로 지은 건물이 많아서 \'분홍빛 도시\'라고도 불러요. 비행기를 만드는 도시로도 유명해요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '툴루즈 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '툴루즈 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'transport', title: '교통 이용하기', npcRole: '지하철역 직원',
          steps: [
            { npc: '안녕하세요! 어디에 가세요?',
              choices: [
                { ko: '저는 일곱 살이에요.', hint: '어디에 가는지 물었어요.' },
                { ko: '도서관에 가고 싶어요.', ok: true },
                { ko: '맛있게 드세요.', hint: '밥 먹을 때 하는 말이에요.' }
              ] },
            { npc: '도서관은 지하철 A선을 타세요. 표가 있어요?',
              choices: [
                { ko: '아니요, 표를 사고 싶어요.', ok: true },
                { ko: '네, 사과를 먹어요.', hint: '표가 있는지 물었어요.' },
                { ko: '잘 자요.', hint: '잠자기 전에 하는 인사예요.' }
              ] },
            { npc: '여기서 사세요. 한 장에 이 유로예요. 어디에서 타요?',
              choices: [
                { ko: '비가 와요.', hint: '타는 곳을 물었어요. 날씨 이야기가 아니에요.' },
                { ko: '고맙습니다. 안녕히 계세요.', hint: '아직 타는 곳을 몰라요. 먼저 물어봐요.' },
                { ko: '지하철은 어디에서 타요?', ok: true }
              ] },
            { npc: '저쪽 계단으로 내려가세요. 이번 지하철을 타면 돼요.',
              choices: [
                { ko: '네, 알겠어요. 고맙습니다.', ok: true },
                { ko: '네, 생일 축하해요.', hint: '생일 이야기가 아니에요.' },
                { ko: '아니요, 저는 열 살이에요.', hint: '나이를 묻지 않았어요.' }
              ] },
            { npc: '조심히 다녀오세요. 안녕히 가세요!',
              choices: [
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '안녕히 가세요!', hint: '내가 가는 사람이에요. 남는 직원에게는 \'안녕히 계세요\'.' },
                { ko: '안녕히 계세요!', ok: true, note: '남는 사람에게는 \'안녕히 계세요\'라고 해요.' }
              ] }
          ]
        }
      ]
    },
    aix: {
      theme: {
        wall: '#FFF6DE', wainscot: '#D9C08A', floor: ['#DBB88A', '#D1AD7F', '#E5C497'], rug: '#B9A8D9', board: '#3F5A4E',
        sky: '#E8F0DC',
        view: { kind: 'fields', sky: ['#A6D6F0', '#F4F8E6'], far: '#B7A6D4', near: '#9DBB63', water: '#8DC1DB', accent: '#E3B3E8' },
        poster: { title: '엑상프로방스', sub: 'Aix-en-Provence · Provence-Alpes-Côte d\'Azur', kind: 'fountain', color: '#6FA8C9', foot: 'Provence-Alpes-Côte d\'Azur · France' }
      },
      boardTitle: '엑상프로방스 한글학교',
      boardLine: '오늘의 회화 · 취미 말하기',                          // [확인 전]
      welcome: '엑상프로방스 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#F6CFAE', hair: '#E2C48F', hairStyle: 2, shirt: '#8E7CC3', pants: '#4A4F66' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 엑상프로방스 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 엑상프로방스에서는 저와 같이 \'취미 말하기\'를 연습해 볼 거예요.',
          '제가 새로 만난 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '엑상프로방스',
          sub: 'Aix-en-Provence · 프로방스알프코트다쥐르',
          text: '엑상프로방스는 프랑스 남쪽 프로방스 지방에 있는 도시예요. 도시 안에 분수가 아주 많아서 \'분수의 도시\'라고도 불러요.\n\n도시 가까이에는 생트빅투아르산이 있어요. 유명한 화가 세잔이 이 산을 자주 그렸어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '엑상프로방스 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '엑상프로방스 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'hobby', title: '취미 말하기', npcRole: '새 친구',
          steps: [
            { npc: '안녕! 나는 새 친구야. 너는 이름이 뭐야?',
              choices: [
                { ko: '내 이름은 민지야. 만나서 반가워!', ok: true },
                { ko: '안녕히 계세요.', hint: '이제 막 만났어요. 헤어질 때 하는 인사예요.' },
                { ko: '비가 와요.', hint: '이름을 물었어요.' }
              ] },
            { npc: '반가워! 민지야, 너는 취미가 뭐야?',
              choices: [
                { ko: '얼마예요?', hint: '값을 묻는 말이에요. 취미를 물었어요.' },
                { ko: '내 취미는 그림 그리기야.', ok: true },
                { ko: '고맙습니다.', hint: '취미가 무엇인지 말해요.' }
              ] },
            { npc: '와, 멋있다! 어떤 그림을 그려?',
              choices: [
                { ko: '나는 산이랑 꽃을 자주 그려.', ok: true },
                { ko: '나는 열 살이야.', hint: '어떤 그림인지 물었어요.' },
                { ko: '잘 자.', hint: '잠자기 전에 하는 인사예요.' }
              ] },
            { npc: '나도 같이 그리고 싶어! 우리 주말에 같이 그릴까?',
              choices: [
                { ko: '미안해요, 괜찮아요.', hint: '친구가 같이 하자고 했어요. 대답을 생각해 봐요.' },
                { ko: '맛있게 먹어.', hint: '밥 먹는 이야기가 아니에요.' },
                { ko: '좋아! 같이 그리자.', ok: true }
              ] },
            { npc: '신난다! 그럼 주말에 만나자. 안녕!',
              choices: [
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '응, 주말에 봐. 안녕!', ok: true, note: '다음에 만날 때는 \'주말에 봐\'처럼 말할 수 있어요.' },
                { ko: '처음 뵙겠습니다.', hint: '처음 만날 때 하는 인사예요.' }
              ] }
          ]
        }
      ]
    },
    bordeaux: {
      theme: {
        wall: '#F8EEF2', wainscot: '#C9A3B5', floor: ['#D8B48C', '#CDA880', '#E0BF98'], rug: '#B58AA8', board: '#4A2F45',
        sky: '#E3EEF8',
        view: { kind: 'vineyard', sky: ['#A8D4F2', '#F1F7FC'], far: '#9DBB86', near: '#6E9F5E', water: '#B9CBE0', accent: '#8E4A7A' },
        poster: { title: '보르도', sub: 'Bordeaux · Nouvelle-Aquitaine', kind: 'grapes', color: '#7A3E78', foot: 'Nouvelle-Aquitaine · France' }
      },
      boardTitle: '보르도 한글학교',
      boardLine: '오늘의 회화 · 길 묻기',                              // [확인 전]
      welcome: '보르도 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#E8B48F', hair: '#2B2420', hairStyle: 0, shirt: '#8E5A8A', pants: '#3A3F55' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 보르도 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 보르도에서는 저와 같이 \'길 묻기\'를 연습해 볼 거예요.',
          '제가 길에서 만난 아저씨가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '보르도',
          sub: 'Bordeaux · 누벨아키텐',
          text: '보르도는 프랑스 남서쪽에 있는 큰 도시예요. 도시 가운데로 가론강이 넓게 흘러요.\n\n이 지역은 포도밭이 많기로 유명해요. 강가에는 옛 건물들이 늘어서 있어서 걸으며 구경하기 좋아요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '보르도 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '보르도 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'directions', title: '길 묻기', npcRole: '길에서 만난 아저씨',
          steps: [
            { npc: '안녕하세요! 무엇을 도와 드릴까요?',
              choices: [
                { ko: '도서관이 어디예요?', ok: true },
                { ko: '저는 열 살이에요.', hint: '아저씨가 도와 드릴까요? 하고 물었어요. 길을 물어봐요.' },
                { ko: '잘 먹었습니다.', hint: '식사가 끝났을 때 하는 말이에요.' }
              ] },
            { npc: '도서관요? 저기 큰 길로 쭉 가세요.',
              choices: [
                { ko: '저는 파리에 살아요.', hint: '길을 알려 주었으니 길에 대해 다시 물어봐요.' },
                { ko: '이 길로 곧장 가면 돼요?', ok: true },
                { ko: '내일 만나요.', hint: '길을 알려 주는 말에 어울리는 대답이 아니에요.' }
              ] },
            { npc: '네, 쭉 가서 빵집 앞에서 오른쪽으로 가세요.',
              choices: [
                { ko: '네, 빵 세 개 주세요.', hint: '지금은 빵을 사는 것이 아니라 길을 묻고 있어요.' },
                { ko: '생일 축하해요.', hint: '길을 알려 준 말에 맞지 않아요.' },
                { ko: '빵집 앞에서 오른쪽이요? 알겠어요.', ok: true }
              ] },
            { npc: '그럼 바로 도서관이 보일 거예요. 걸어서 오 분쯤 걸려요.',
              choices: [
                { ko: '오 분이요? 가까워요!', ok: true },
                { ko: '저는 버스를 좋아해요.', hint: '걸리는 시간을 들었으니 거기에 맞게 말해요.' },
                { ko: '어서 오세요.', hint: '손님을 맞을 때 하는 말이에요.' }
              ] },
            { npc: '조심히 가세요!',
              choices: [
                { ko: '생일 축하해요!', hint: '헤어질 때 하는 말이 아니에요.' },
                { ko: '네, 도와주셔서 감사합니다. 안녕히 계세요!', ok: true, note: '도움을 받으면 고맙다고 말하고, 남는 사람에게는 \'안녕히 계세요\'라고 해요.' },
                { ko: '어서 오세요!', hint: '가는 사람에게 하는 인사가 아니에요.' }
              ] }
          ]
        }
      ]
    },
    montpellier: {
      theme: {
        wall: '#FFF1E6', wainscot: '#E2B79A', floor: ['#E0BC90', '#D6B084', '#E8C79E'], rug: '#8FC4C9', board: '#2E5A63',
        sky: '#DDF1F5',
        view: { kind: 'sea', sky: ['#8FD0EC', '#EAF8FB'], far: '#7FB8D6', near: '#4FA3C7', water: '#6CC0DC', accent: '#F2B880' },
        poster: { title: '몽펠리에', sub: 'Montpellier · Occitanie', kind: 'cathedral', color: '#C98E5E', foot: 'Occitanie · France' }
      },
      boardTitle: '몽펠리에 한글학교',
      boardLine: '오늘의 회화 · 병원·약국',                            // [확인 전]
      welcome: '몽펠리에 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#FFE0C7', hair: '#6E7FA8', hairStyle: 2, shirt: '#4F9EA5', pants: '#4A4E63' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 몽펠리에 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 몽펠리에에서는 저와 같이 \'병원·약국\'을 연습해 볼 거예요.',
          '제가 의사 선생님이 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '몽펠리에',
          sub: 'Montpellier · 옥시타니',
          text: '몽펠리에는 프랑스 남쪽에 있는 도시예요. 자동차로 조금만 가면 지중해 바다가 나와요.\n\n날씨가 따뜻하고 햇볕이 좋아서 여름에는 바닷가에 사람이 많아요. 오래된 대학이 있는 도시로도 알려져 있어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '몽펠리에 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '몽펠리에 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'hospital', title: '병원·약국', npcRole: '의사 선생님',
          steps: [
            { npc: '어서 오세요. 어디가 아프세요?',
              choices: [
                { ko: '배가 아파요.', ok: true },
                { ko: '사과를 사고 싶어요.', hint: '병원에서는 어디가 아픈지 말해요.' },
                { ko: '안녕히 계세요.', hint: '이제 막 들어왔어요. 인사는 끝에 해요.' }
              ] },
            { npc: '언제부터 아팠어요?',
              choices: [
                { ko: '저는 열 살이에요.', hint: '언제부터 아팠는지 물었어요.' },
                { ko: '어제부터 아팠어요.', ok: true },
                { ko: '여기 있어요.', hint: '돈을 낼 때 하는 말이에요.' }
              ] },
            { npc: '열도 있어요?',
              choices: [
                { ko: '네, 조금 열이 나요.', ok: true },
                { ko: '내일 만나요.', hint: '열이 있는지 물었어요. 네 또는 아니요로 대답해요.' },
                { ko: '맛있게 드세요.', hint: '식사 때 하는 말이에요.' }
              ] },
            { npc: '약을 먹고 푹 쉬세요. 약국에서 약을 받으세요.',
              choices: [
                { ko: '생일 축하해요.', hint: '의사 선생님의 말에 어울리는 대답이 아니에요.' },
                { ko: '저는 사과를 좋아해요.', hint: '의사 선생님이 약 이야기를 했어요.' },
                { ko: '네, 알겠어요. 감사합니다.', ok: true }
              ] },
            { npc: '빨리 나으세요!',
              choices: [
                { ko: '안녕히 계세요!', ok: true, note: '병원에 남는 선생님께는 \'안녕히 계세요\'라고 해요.' },
                { ko: '안녕히 가세요!', hint: '의사 선생님은 병원에 남아요. 남는 사람에게는 \'안녕히 계세요\'.' },
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' }
              ] }
          ]
        }
      ]
    },
    nantes: {
      theme: {
        wall: '#F1F4E4', wainscot: '#B9C99A', floor: ['#D7BA8E', '#CCAE82', '#E0C49A'], rug: '#E3A86F', board: '#33503F',
        sky: '#E4F1E8',
        view: { kind: 'river', sky: ['#A5D6F0', '#EEF8FB'], far: '#A5C79A', near: '#76A875', water: '#7DB6D8', accent: '#E8A25C' },
        poster: { title: '낭트', sub: 'Nantes · Pays de la Loire', kind: 'elephant', color: '#8A6F5A', foot: 'Pays de la Loire · France' }
      },
      boardTitle: '낭트 한글학교',
      boardLine: '오늘의 회화 · 학교생활',                            // [확인 전]
      welcome: '낭트 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',     // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#E8B48F', hair: '#B98A57', hairStyle: 1, shirt: '#6FA05F', pants: '#3B4A5C' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 낭트 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 낭트에서는 저와 같이 \'학교생활\'을 연습해 볼 거예요.',
          '제가 새로 만난 반 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '낭트',
          sub: 'Nantes · 페이드라루아르',
          text: '낭트는 프랑스 서쪽에 있는 도시예요. 프랑스에서 가장 긴 강인 루아르강이 이 도시를 지나 바다로 가요.\n\n강가에는 커다란 기계 코끼리가 있어서 사람들이 타 보며 신기해해요. 옛 성도 있어서 구경할 곳이 많아요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '낭트 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '낭트 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'school', title: '학교생활', npcRole: '반 친구',
          steps: [
            { npc: '안녕! 나는 하나야. 너는 이름이 뭐야?',
              choices: [
                { ko: '안녕히 계세요.', hint: '만나서 인사하는 때예요. 헤어질 때 하는 말이 아니에요.' },
                { ko: '내 이름은 민수야. 만나서 반가워.', ok: true },
                { ko: '사과를 사고 싶어요.', hint: '친구가 이름을 물었어요.' }
              ] },
            { npc: '민수야, 우리 반에 온 것을 환영해. 무슨 과목을 좋아해?',
              choices: [
                { ko: '저는 열 살이에요.', hint: '무슨 과목을 좋아하는지 물었어요.' },
                { ko: '고맙습니다. 잘 먹었어요.', hint: '식사가 끝났을 때 하는 말이에요.' },
                { ko: '나는 미술을 좋아해.', ok: true }
              ] },
            { npc: '와, 나도 미술이 좋아! 쉬는 시간에 같이 놀래?',
              choices: [
                { ko: '응, 좋아. 같이 놀자!', ok: true },
                { ko: '아니, 배가 아파요. 약 주세요.', hint: '같이 놀자고 했어요. 놀고 싶은 마음을 말해요.' },
                { ko: '세 개 주세요.', hint: '물건을 살 때 하는 말이에요.' }
              ] },
            { npc: '종이 울렸어. 이제 교실로 들어가자.',
              choices: [
                { ko: '여기 있어요.', hint: '돈이나 물건을 줄 때 하는 말이에요.' },
                { ko: '맛있게 드세요.', hint: '식사 때 하는 말이에요.' },
                { ko: '응, 같이 들어가자.', ok: true }
              ] },
            { npc: '오늘 정말 즐거웠어. 내일 또 만나자!',
              choices: [
                { ko: '안녕히 가세요!', hint: '친구와 헤어질 때는 \'잘 가\', \'내일 봐\' 같은 편한 말을 써요.' },
                { ko: '응, 나도 즐거웠어. 내일 봐!', ok: true, note: '친구와 헤어질 때는 \'내일 봐\'라고 해요.' },
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' }
              ] }
          ]
        }
      ]
    },
    lille: {
      theme: {
        wall: '#FDEFEA', wainscot: '#D9A79B', floor: ['#D9B287', '#CEA67B', '#E2BE95'], rug: '#E58F8F', board: '#5A3340',
        sky: '#F0E8F4',
        view: { kind: 'fields', sky: ['#B4D4F0', '#F6F4FB'], far: '#B8CF8E', near: '#8DB46B', water: '#BFD3E6', accent: '#E8B84C' },
        poster: { title: '릴', sub: 'Lille · Hauts-de-France', kind: 'belfry', color: '#B5604C', foot: 'Hauts-de-France · France' }
      },
      boardTitle: '릴 한글학교',
      boardLine: '오늘의 회화 · 생일·초대',                            // [확인 전]
      welcome: '릴 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',       // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#C98E66', hair: '#2B2420', hairStyle: 2, shirt: '#D9776F', pants: '#35415A' },
        lines: [                                                     // [확인 전]
          '안녕하세요! 릴 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 릴에서는 저와 같이 \'생일·초대\'를 연습해 볼 거예요.',
          '제가 생일 파티에 초대하는 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '릴',
          sub: 'Lille · 오드프랑스',
          text: '릴은 프랑스 북쪽에 있는 큰 도시예요. 벨기에와 가까워서 국경이 멀지 않아요.\n\n도시 한가운데 큰 광장이 있고, 하늘로 높이 솟은 종탑이 있어서 멀리서도 잘 보여요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '릴 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '릴 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'birthday', title: '생일·초대', npcRole: '생일 파티에 초대하는 친구',
          steps: [
            { npc: '안녕! 다음 주 토요일이 내 생일이야. 우리 집에 올래?',
              choices: [
                { ko: '응, 초대해 줘서 고마워. 갈게!', ok: true },
                { ko: '안녕히 계세요.', hint: '초대를 받았어요. 갈 수 있는지 대답해요.' },
                { ko: '사과를 사고 싶어요.', hint: '친구가 생일 파티에 초대했어요.' }
              ] },
            { npc: '와, 고마워! 파티는 오후 두 시에 시작해. 괜찮아?',
              choices: [
                { ko: '저는 열 살이에요.', hint: '시간이 괜찮은지 물었어요.' },
                { ko: '응, 괜찮아. 그때 갈게.', ok: true },
                { ko: '배가 아파요.', hint: '아픈 곳을 말하는 때가 아니에요.' }
              ] },
            { npc: '생일 선물은 안 가져와도 돼. 뭐 먹고 싶어?',
              choices: [
                { ko: '여기 있어요.', hint: '돈이나 물건을 줄 때 하는 말이에요.' },
                { ko: '나는 케이크가 좋아.', ok: true },
                { ko: '내일 만나요.', hint: '먹고 싶은 것을 물었어요.' }
              ] },
            { npc: '좋아, 케이크 준비할게! 파티에서 같이 노래도 부르자.',
              choices: [
                { ko: '응, 좋아. 같이 노래하자!', ok: true },
                { ko: '어서 오세요.', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '안녕히 가세요.', hint: '헤어질 때 하는 말이에요. 아직 대화 중이에요.' }
              ] },
            { npc: '그럼 토요일에 보자!',
              choices: [
                { ko: '안녕히 계세요!', hint: '친구에게는 \'안녕히 계세요\'보다 편한 말을 써요.' },
                { ko: '어서 오세요!', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '응, 토요일에 봐! 생일 미리 축하해.', ok: true, note: '친구와 헤어질 때는 \'토요일에 봐\'처럼 편하게 말해요.' }
              ] }
          ]
        }
      ]
    },
    tours: {
      theme: {
        wall: '#FAF1E4', wainscot: '#D8C3A5', floor: ['#D6B88A', '#CCAC7C', '#DFC094'], rug: '#A7C4DE', board: '#2E4A5E',
        sky: '#D9ECF6',
        view: { kind: 'river', sky: ['#A5D5F0', '#EAF5FB'], far: '#8FB58A', near: '#6E9F6B', water: '#7DB6D9', accent: '#E8D7B0' },
        poster: { title: '투르', sub: 'Tours · Centre-Val de Loire', kind: 'castle', color: '#B9A98C', foot: 'Centre-Val de Loire · France' }
      },
      boardTitle: '투르 한글학교',
      boardLine: '오늘의 회화 · 도서관에서 책 빌리기',                 // [확인 전]
      welcome: '투르 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#FFE0C7', hair: '#7A4E33', hairStyle: 2, shirt: '#8F6BA8', pants: '#3A3F5C' },
        lines: [
          '안녕하세요! 투르 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 투르에서는 저와 같이 \'도서관에서 책 빌리기\'를 연습해 볼 거예요.',
          '제가 도서관 사서 선생님이 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '투르',
          sub: 'Tours · 상트르발드루아르',
          text: '투르는 프랑스 중서부를 흐르는 루아르강 가에 있는 도시예요. 이 강을 따라 옛 성들이 많아서 많은 사람이 구경하러 와요.\n\n도시 한가운데에는 큰 성당이 있고, 옛 시가지에는 예쁜 광장과 오래된 집들이 모여 있어요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '투르 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '투르 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'library', title: '도서관에서 책 빌리기', npcRole: '사서 선생님',
          steps: [
            { npc: '어서 오세요. 무엇을 도와 드릴까요?',
              choices: [
                { ko: '저는 파리에서 왔어요.', hint: '무엇을 도와 줄지 물었어요. 하고 싶은 일을 말해요.' },
                { ko: '책을 빌리고 싶어요.', ok: true },
                { ko: '생일 축하해요.', hint: '도서관에서 하는 인사가 아니에요.' }
              ] },
            { npc: '어떤 책을 좋아해요?',
              choices: [
                { ko: '내일 학교에 가요.', hint: '어떤 책을 좋아하는지 물었어요.' },
                { ko: '네, 맞아요.', hint: '\'네\'로 답하는 질문이 아니에요.' },
                { ko: '동물 이야기책을 좋아해요.', ok: true }
              ] },
              { npc: '저쪽 책장에 있어요. 도서관 카드가 있어요?',
              choices: [
                { ko: '네, 여기 있어요.', ok: true },
                { ko: '아니요, 배가 불러요.', hint: '카드가 있는지 물었어요. 배고픈 것과는 상관없어요.' },
                { ko: '안녕히 계세요.', hint: '아직 책을 빌리지 않았어요.' }
              ] },
            { npc: '이 책은 이 주일 동안 빌릴 수 있어요.',
              choices: [
                { ko: '얼마예요?', hint: '도서관에서는 책을 공짜로 빌려요. 이 말은 맞지 않아요.' },
                { ko: '어서 오세요.', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '네, 잘 읽고 가져올게요.', ok: true, note: '책을 돌려줄 약속을 이렇게 말해요.' }
              ] },
            { npc: '그럼 다음에 또 오세요. 안녕히 가세요!',
              choices: [
                { ko: '감사합니다. 안녕히 계세요!', ok: true, note: '남는 사람에게는 \'안녕히 계세요\'라고 해요.' },
                { ko: '안녕히 가세요!', hint: '사서 선생님은 도서관에 남아요. 남는 사람에게는 \'안녕히 계세요\'.' },
                { ko: '처음 뵙겠습니다.', hint: '처음 만났을 때 하는 인사예요.' }
              ] }
          ]
        }
      ]
    },
    brest: {
      theme: {
        wall: '#EEF4F6', wainscot: '#B9CCD6', floor: ['#CDB892', '#C2AC84', '#D6C29E'], rug: '#E7B9A8', board: '#274B5F',
        sky: '#D3E8F2',
        view: { kind: 'sea', sky: ['#9CCBEA', '#E4F1F8'], far: '#6FA3C7', near: '#4E86B0', water: '#5E9CC8', accent: '#F4F1E8' },
        poster: { title: '브레스트', sub: 'Brest · Bretagne', kind: 'lighthouse', color: '#C94F4F', foot: 'Bretagne · France' }
      },
      boardTitle: '브레스트 한글학교',
      boardLine: '오늘의 회화 · 전화하기',                              // [확인 전]
      welcome: '브레스트 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#E8B48F', hair: '#2B2420', hairStyle: 0, shirt: '#4F8F8B', pants: '#35405A' },
        lines: [
          '안녕하세요! 브레스트 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 브레스트에서는 저와 같이 \'전화하기\'를 연습해 볼 거예요.',
          '제가 친구의 엄마가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '브레스트',
          sub: 'Brest · 브르타뉴',
          text: '브레스트는 프랑스 서쪽 끝, 브르타뉴 지방에 있는 항구 도시예요. 앞에는 대서양으로 이어지는 넓은 바다가 펼쳐져 있어요.\n\n바닷가에는 커다란 배들이 드나드는 항구와 등대가 있어서 바다 도시의 느낌이 가득해요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '브레스트 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '브레스트 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'phone', title: '전화하기', npcRole: '친구 엄마',
          steps: [
            { npc: '여보세요?',
              choices: [
                { ko: '여보세요? 저 민준이에요.', ok: true },
                { ko: '안녕히 계세요.', hint: '전화를 막 받았어요. 끝인사는 아직 일러요.' },
                { ko: '맛있게 드세요.', hint: '식사 때 하는 말이에요.' }
              ] },
            { npc: '아, 민준이구나. 안녕! 무슨 일이니?',
              choices: [
                { ko: '지수 있어요?', ok: true },
                { ko: '저는 열 살이에요.', hint: '무슨 일인지 물었어요. 전화한 까닭을 말해요.' },
                { ko: '네, 맞아요.', hint: '\'네\'로 답하는 질문이 아니에요.' }
              ] },
            { npc: '지금 숙제하고 있어요. 조금 있다가 전화하라고 할까요?',
              choices: [
                { ko: '죄송해요. 어제 갔어요.', hint: '무엇을 할지 물었어요. 어제 이야기가 아니에요.' },
                { ko: '네, 부탁드려요.', ok: true },
                { ko: '처음 뵙겠습니다.', hint: '처음 만났을 때 하는 인사예요.' }
              ] },
              { npc: '그래요. 전하고 싶은 말이 있어요?',
              choices: [
                { ko: '생일 선물을 샀어요.', hint: '전해 달라는 말로는 이상해요.' },
                { ko: '어서 오세요.', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '내일 같이 놀자고 전해 주세요.', ok: true }
              ] },
            { npc: '알겠어요. 전해 줄게요. 끊을게요!',
              choices: [
                { ko: '네, 감사합니다. 안녕히 계세요!', ok: true, note: '전화를 끊을 때도 인사를 해요.' },
                { ko: '여보세요?', hint: '전화를 시작할 때 하는 말이에요.' },
                { ko: '잘 먹겠습니다.', hint: '밥을 먹기 전에 하는 말이에요.' }
              ] }
          ]
        }
      ]
    },
    marseille: {
      theme: {
        wall: '#FCF2E6', wainscot: '#E3C9A8', floor: ['#E0BF90', '#D6B380', '#E8C99C'], rug: '#8EC5C9', board: '#2C5666',
        sky: '#D6EEF7',
        view: { kind: 'sea', sky: ['#8FD0F2', '#E8F6FC'], far: '#5FB3D8', near: '#3C97C4', water: '#4FA9D6', accent: '#F6E9CF' },
        poster: { title: '마르세유', sub: 'Marseille · Provence-Alpes-Côte d\'Azur', kind: 'basilica', color: '#D9C89E', foot: 'Provence-Alpes-Côte d\'Azur · France' }
      },
      boardTitle: '마르세유 한글학교',
      boardLine: '오늘의 회화 · 고마움·사과 표현하기',                  // [확인 전]
      welcome: '마르세유 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',   // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#C98E66', hair: '#2B2420', hairStyle: 1, shirt: '#E08A5A', pants: '#33415C' },
        lines: [
          '안녕하세요! 마르세유 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 마르세유에서는 저와 같이 \'고마움과 사과 표현하기\'를 연습해 볼 거예요.',
          '제가 같은 반 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '마르세유',
          sub: 'Marseille · 프로방스알프코트다쥐르',
          text: '마르세유는 프랑스 남쪽, 따뜻한 지중해에 닿아 있는 큰 항구 도시예요. 오래전부터 배들이 오가는 도시로 알려져 있어요.\n\n높은 언덕 위에는 도시를 내려다보는 하얀 성당이 있어서, 바다에서도 잘 보여요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '마르세유 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '마르세유 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'thanks', title: '고마움·사과 표현하기', npcRole: '같은 반 친구',
          steps: [
            { npc: '앗, 미안해! 내가 네 연필을 떨어뜨렸어.',
              choices: [
                { ko: '안녕히 가세요.', hint: '친구가 사과했어요. 헤어질 때 하는 인사가 아니에요.' },
                { ko: '괜찮아요.', ok: true },
                { ko: '저는 열 살이에요.', hint: '사과에 대한 대답이 아니에요.' }
              ] },
            { npc: '내가 주워 줄게. 여기 있어.',
              choices: [
                { ko: '고마워요!', ok: true },
                { ko: '처음 뵙겠습니다.', hint: '처음 만났을 때 하는 인사예요.' },
                { ko: '맛있게 드세요.', hint: '식사 때 하는 말이에요.' }
              ] },
              { npc: '그런데 네 책을 못 가져왔어. 미안해.',
              choices: [
                { ko: '네, 어서 오세요.', hint: '손님을 맞을 때 하는 말이에요.' },
                { ko: '내일 몇 시예요?', hint: '친구가 사과했어요. 먼저 대답해 줘요.' },
                { ko: '괜찮아요. 같이 봐요.', ok: true }
              ] },
            { npc: '고마워! 내가 이번에는 도와줄게. 무엇을 할까?',
              choices: [
                { ko: '칠판을 닦아 주세요.', ok: true },
                { ko: '잘 자요.', hint: '밤에 하는 인사예요. 무엇을 할지 말해요.' },
                { ko: '죄송합니다. 늦었어요.', hint: '지금은 늦은 것이 아니에요. 부탁하는 말을 해요.' }
              ] },
            { npc: '다 했어! 오늘 정말 즐거웠어. 내일 또 보자!',
              choices: [
                { ko: '네, 오늘 도와줘서 고마워요. 안녕!', ok: true, note: '헤어질 때 고마운 마음도 같이 말해요.' },
                { ko: '여보세요?', hint: '전화를 받을 때 하는 말이에요.' },
                { ko: '죄송합니다.', hint: '사과할 일이 아니에요. 고마움을 말해요.' }
              ] }
          ]
        }
      ]
    },
    lemans: {
      theme: {
        wall: '#F8F4E3', wainscot: '#CFC39A', floor: ['#D3BC8C', '#C8B07E', '#DCC795'], rug: '#E4A8A0', board: '#34513F',
        sky: '#DAEDF5',
        view: { kind: 'fields', sky: ['#A8D8F0', '#EEF7FB'], far: '#A9C97A', near: '#7FAF5C', water: '#8CC1DD', accent: '#F2D977' },
        poster: { title: '르망', sub: 'Le Mans · Pays de la Loire', kind: 'car', color: '#C94F4F', foot: 'Pays de la Loire · France' }
      },
      boardTitle: '르망 한글학교',
      boardLine: '오늘의 회화 · 시간 말하기',                           // [확인 전]
      welcome: '르망 한글학교 교실이에요. 교장 선생님께 다가가 보세요.',     // [확인 전]
      principal: {
        name: '교장 선생님',                                          // [확인 전]
        look: { skin: '#FFE0C7', hair: '#6E7FA8', hairStyle: 2, shirt: '#5E9E6E', pants: '#3B3B4F' },
        lines: [
          '안녕하세요! 르망 한글학교에 온 것을 환영해요.',
          '저는 이 학교 교장 선생님이에요. 르망에서는 저와 같이 \'시간 말하기\'를 연습해 볼 거예요.',
          '제가 같이 가는 친구가 될게요. 알맞은 말을 골라 보세요.'
        ]
      },
      items: {
        book: {
          title: '르망',
          sub: 'Le Mans · 페이드라루아르',
          text: '르망은 프랑스 서북쪽의 넓은 들판 가운데에 있는 도시예요. 자동차 경주로 이름이 널리 알려져 있어요.\n\n옛 시가지에는 큰 성당과 오래된 골목이 남아 있어서, 걸어 다니며 구경하기 좋아요.\n\n(이 글은 보기 글이에요. 휴먼쌤이 주시는 소개 글로 바뀝니다.)',
          sample: true
        },
        album: {
          title: '르망 한글학교 사진첩',
          photos: [],
          captions: ['수업 시간', '한글날 행사', '운동회', '졸업식']       // [예시]
        },
        tv: {
          title: '르망 소개 영상',
          video: '',
          sample: true
        }
      },
      // 한국어 회화 상황 [예시, 확인 전]
      situations: [
        {
          id: 'time', title: '시간 말하기', npcRole: '같이 가는 친구',
          steps: [
            { npc: '안녕! 지금 몇 시예요?',
              choices: [
                { ko: '열 살이에요.', hint: '시간을 물었어요. 나이가 아니라 시각을 말해요.' },
                { ko: '지금 세 시예요.', ok: true },
                { ko: '안녕히 계세요.', hint: '시간을 물었어요. 먼저 대답해요.' }
              ] },
            { npc: '벌써 세 시예요? 한글학교는 몇 시에 시작해요?',
              choices: [
                { ko: '세 시 반에 시작해요.', ok: true },
                { ko: '맛있게 드세요.', hint: '식사 때 하는 말이에요.' },
                { ko: '네, 맞아요.', hint: '\'몇 시\'를 물었으니 시각으로 대답해요.' }
              ] },
              { npc: '그럼 아직 삼십 분 있어요. 몇 시에 끝나요?',
              choices: [
                { ko: '어제 갔어요.', hint: '끝나는 시각을 물었어요. 어제 이야기가 아니에요.' },
                { ko: '미안해요. 늦었어요.', hint: '늦은 것이 아니에요. 끝나는 시각을 말해요.' },
                { ko: '다섯 시에 끝나요.', ok: true }
              ] },
            { npc: '끝나고 같이 집에 갈까요? 몇 시에 만날까요?',
              choices: [
                { ko: '다섯 시 오 분에 교실 앞에서 만나요.', ok: true },
                { ko: '처음 뵙겠습니다.', hint: '처음 만났을 때 하는 인사예요.' },
                { ko: '저는 프랑스에 살아요.', hint: '만날 시각을 정해야 해요.' }
              ] },
            { npc: '좋아요. 그때 만나요. 이따 봐요!',
              choices: [
                { ko: '네, 이따 봐요!', ok: true, note: '조금 뒤에 다시 만날 때 \'이따 봐요\'라고 해요.' },
                { ko: '여보세요?', hint: '전화를 받을 때 하는 말이에요.' },
                { ko: '어서 오세요.', hint: '손님을 맞을 때 하는 말이에요.' }
              ] }
          ]
        }
      ]
    }
  }
};
