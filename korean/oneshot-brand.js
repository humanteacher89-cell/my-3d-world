/* 한국어학습 XR콘텐츠 5종에 한글원샷 이름 · 로고(2026-11-19, 한글원샷 큰 집 2단계 '한 집처럼')
   다섯 장면 index.html이 이 파일 하나를 부른다. ① 시작 카드 맨 위: 한글원샷 가로 로고 + '← 한글원샷으로'
   ② 화면으로 노는 중 왼쪽 위: 동그란 한글원샷 로고(누르면 같은 주제의 한글원샷 자료실, 노는 중이면 한 번 묻는다).
   VR · 혼합현실 안에서는 화면 위 글자판이 보이지 않으므로 그대로다. 로고 그림은 한글원샷 저장소 icons/의 사본(korean/brand/). */
(() => {
  const ONESHOT = 'https://hangeul-oneshot.human-teacher.com/';
  const TOPIC = { hanok: '하나네 집', store: '편의점', bunsik: '분식집', subway: '지하철', pharmacy: '약국' };
  const scene = (location.pathname.match(/\/(hanok|store|bunsik|subway|pharmacy)\/?/) || [])[1];
  const home = ONESHOT + (scene ? '#/t/' + encodeURIComponent(TOPIC[scene]) : '');
  const css = document.createElement('style');
  css.textContent = `
    #osBrand { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:-6px 0 14px; padding-bottom:12px; border-bottom:1px dashed #e6dccb; text-decoration:none; }
    #osBrand img { height:32px; width:auto; display:block; }
    #osBrand span { font-size:12.5px; font-weight:700; color:#b5873e; white-space:nowrap; }
    #osHome { position:fixed; top:calc(12px + env(safe-area-inset-top,0px)); left:12px; z-index:4; width:40px; height:40px; border-radius:50%; background:rgba(255,250,242,.94); box-shadow:0 3px 12px rgba(40,30,20,.22); display:none; place-items:center; }
    #osHome img { width:27px; height:27px; display:block; }
    body.os-play #osHome { display:grid; }`;
  document.head.appendChild(css);
  const card = document.querySelector('#cover .card');
  if (card) {
    const a = document.createElement('a'); a.id = 'osBrand'; a.href = home;
    a.innerHTML = '<img src="../korean/brand/logo-h.svg" alt="한글원샷 Hangeul Oneshot"><span>← 한글원샷으로</span>';
    card.insertBefore(a, card.firstChild);
  }
  const b = document.createElement('a'); b.id = 'osHome'; b.href = home; b.title = '한글원샷으로';
  b.innerHTML = '<img src="../korean/brand/symbol.svg" alt="한글원샷">';
  b.onclick = (e) => { if (!confirm('한글원샷으로 갈까요? 지금 하던 것은 처음부터 다시 해야 해요.')) e.preventDefault(); };
  document.body.appendChild(b);
  // 시작 카드가 닫히면(화면으로 보기) 왼쪽 위 로고를 보인다
  const cover = document.getElementById('cover');
  const sync = () => document.body.classList.toggle('os-play', !!cover && getComputedStyle(cover).display === 'none');
  if (cover) new MutationObserver(sync).observe(cover, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  sync();
})();
