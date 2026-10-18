/* 월드 1 「휴먼쌤이 누구인가」 VR판 내용.
   웹판 world1.config.js(2026-10-16 판)에서 옮김. 글은 여기서 고친다.
   [VR용] = 헤드셋 조작에 맞게 새로 쓴 문장(휴먼쌤 확인 전). 위치는 웹판과 같은 three.js 좌표. */
window.W1_CONTENT = (function () {
  const years = 14, yearBase = 2026, mainWorld = '휴먼쌤월드';
  const fill = (s, label) => s == null ? s : s.replace(/\{years\}/g, years).replace(/\{yearBase\}/g, yearBase)
    .replace(/\{mainWorld\}/g, mainWorld).replace(/\{label\}/g, label || '');
  return {
    fill,
    kicker: '휴먼쌤 월드 · 첫 번째 월드',
    title: '휴먼쌤이 누구인가',
    subVR: '약 3분 · 손에서 나가는 빛줄기로 가리키고 방아쇠를 당겨 골라요',          // [VR용]
    subFlat: '약 3분 · 화면을 끌어 둘러보고, 눌러서 골라요',                          // [VR용] 화면 모드
    moveVR: '왼쪽 막대로 걷고, 오른쪽 막대로 30도씩 돌아요. 버튼을 고르면 그곳으로 옮겨 가요.',   // [VR용]
    moveFlat: 'PC는 W·A·S·D로 걸을 수도 있어요. 버튼을 고르면 그곳으로 옮겨 가요.',             // [VR용]
    start: '처음부터 시작하기',
    guide: { name: '안내자', role: '휴먼쌤 월드 입구', look: [1, 5, 2, 2, 1] },
    greeting: vr => [
      { text: '어서 오세요. 여기는 휴먼쌤 월드의 입구예요.' },
      { text: '휴먼쌤이 누구인지 궁금해서 오셨죠?', choices: ['네, 궁금해요', '휴먼쌤이 누구예요?'] },
      { text: '좋아요. 휴먼쌤의 어제, 오늘, 내일을 담은 조각이 세 곳에 흩어져 있어요.' },
      { text: vr ? '제가 길을 안내할게요. 어제의 조각부터 차례로 모아 보세요. 왼손을 들어 보면 지금 갈 곳이 표시돼요.'   // [VR용] 원문 '오른쪽 위 목록'
                 : '제가 길을 안내할게요. 어제의 조각부터 차례로 모아 보세요. 오른쪽 위 목록에 지금 갈 곳이 표시돼요.' },
      { text: '세 조각이 다 모이면 휴먼쌤이 직접 나와 인사할 거예요. 준비됐나요?', choices: ['네, 출발할게요'] }
    ],
    afterAll: '세 조각이 다 모였어요. 이제 휴먼쌤을 만나러 가요.',
    missions: [
      { id: 'yesterday', label: '어제', title: '기술을 거의 쓰지 않던 교사', sub: '코로나 전과 후', color: '#f2a94f',
        arrive: '어제의 조각이에요. 휴먼쌤이 어떤 선생님이었는지 한 번 골라 보세요.',
        question: '코로나가 왔을 때, 휴먼쌤은 어떻게 했을까요?',
        choices: [
          { label: '예전 방식 그대로 수업했다', reply: '그럴 것 같았죠? 원래는 기술을 거의 쓰지 않던 선생님이었어요. 하지만 코로나가 모든 걸 바꿨어요.' },
          { label: '새 기술을 써 보기 시작했다', reply: '맞아요. 코로나 이후 기술의 필요성을 느끼고 그때부터 꾸준히 써 왔어요.' }],
        fact: { title: '어제의 휴먼쌤', text: '원래 기술을 거의 쓰지 않는 교사였어요. 코로나 이후 기술의 필요성을 느꼈고, 그 뒤로 꾸준히 써 왔어요.', source: '휴먼쌤 확인 2026-10-01' },
        pad: [-6.4, 0.6], stand: [-4.658, 0.437], sign: [-7.844, 0.735] },
      { id: 'today', label: '오늘', title: '학교 · 협회 · 집', sub: '세 가지 모습', color: '#5cc3b4', collectAll: true,
        arrive: '오늘의 조각이에요. 휴먼쌤의 세 모습을 하나씩 들여다보세요.',
        question: '오늘의 휴먼쌤, 어디를 먼저 볼까요?', moreQuestion: '다른 모습도 들여다볼까요?',
        choices: [
          { label: '학교', reply: '{years}년차 초등교사예요. 오늘도 교실에서 아이들을 만나요.', fact: '{years}년차 초등교사', title: '학교의 휴먼쌤' },
          { label: '협회', reply: '사단법인 한국가상융합교육협회의 회장이에요.', fact: '사단법인 한국가상융합교육협회 회장', title: '협회의 휴먼쌤' },
          { label: '집', reply: '딸 둘을 키우는 아빠예요.', fact: '딸 둘 아빠', title: '집의 휴먼쌤' }],
        fact: { title: '{chosenTitle}', text: '{chosen}.', source: '휴먼쌤 확인 2026-10-01 ({yearBase}년 기준)' },
        complete: '세 모습을 모두 봤어요. 오늘의 조각이 완성됐어요.',
        pad: [6.4, 0.6], stand: [4.658, 0.437], sign: [7.844, 0.735] },
      { id: 'tomorrow', label: '내일', title: '휴먼쌤', sub: '한 가지 이름', color: '#9d8cff', collectAll: true,
        arrive: '내일의 조각이에요. 휴먼쌤에게 궁금한 것을 하나씩 물어보세요.',
        question: '휴먼쌤에게 무엇을 물어볼까요?', moreQuestion: '하나 더 물어볼까요?',
        choices: [
          { label: "'휴먼쌤'은 어떤 뜻인가요?", reply: '' },
          { label: '내일의 휴먼쌤은 무엇을 하나요?', reply: '' }],
        fact: { title: '내일의 휴먼쌤', text: '휴먼쌤.', pending: '이 한마디는 휴먼쌤이 직접 채웁니다. [확인 전]', source: '휴먼쌤 확인 2026-10-01' },
        complete: '두 질문을 다 했어요. 내일의 조각이 완성됐어요.',
        pad: [0, 6.6], stand: [0, 4.85], sign: [0, 8.05] }
    ],
    pos: { hub: [0, 1.15], guide: [0, -1.0], meet: [0, -3.5], human: [0, -6.2], aside: [1.9, -6.0], door: [0, -8.0], gate: [0, -7.4] },
    human: { name: '휴먼쌤', role: '인간교사 김수현', height: 1.68, url: '../world1/assets/humanteacher-glb.wasm', tex: '../world1/assets/humanteacher_basecolor.jpg',
             idle: 'a person standing', wave: 'wave_goodbye_02', waveEnd: 2.7, walk: 'walk' },
    ending: {
      gatherTitle: '세 조각이 모였어요', appearTitle: '그리고, 휴먼쌤이',
      lines: ['안녕하세요. 휴먼쌤 김수현입니다.', '어제, 오늘, 내일. 제 세 조각을 모아 주셔서 고마워요.', '이제 문을 열어 드릴게요.'],   // [확인 전]
      lineHold: 1.1,
      doorTitle: fill('{mainWorld}로 가는 문'), enter: '문으로 들어가기', stay: '조금 더 머물기',
      soonKicker: mainWorld, soonTitle: '곧 열립니다', soonText: '지금부터 고개를 들고 진짜 인간교사 김수현을 만나보세요!',
      replay: '엔딩 다시 보기', restart: '처음부터 다시', exit: '나가기'
    },
    ui: { checklist: '미션', piece: '{label}의 조각', pieceDone: '{label}의 조각 완성', next: '다음', greetLast: '출발',
          cardClose: '조각 간직하기', cardCloseMore: '다음 모습 보기', meetHuman: '휴먼쌤 만나러 가기', meetHumanSub: '세 조각이 모였어요',
          now: '지금', pending: '휴먼쌤이 직접 채울 한마디', nextPlace: '다음 갈 곳', walkHint: '빛 기둥이 선 곳까지 걸어가도 돼요.' }   // walkHint [VR용]
  };
})();
