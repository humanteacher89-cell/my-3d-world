/* =====================================================================
   월드 소리 — 배경음·효과음을 Web Audio로 즉석 합성한다(파일 없음, 저작권 문제 없음)
   -----------------------------------------------------------------
   배경음은 같은 음을 길게 끌거나(드론) 한 마디를 반복하지 않는다.
   코드 진행이 마디마다 바뀌고, 멜로디는 8마디 단위로 새로 만든다(앞 동기를 살짝 바꿔 이어 감).
   - day    : 월드 1(밝은 낮). 104bpm, 다장조, 가벼운 드럼·베이스·건반·플럭 멜로디
   - ending : 휴먼쌤 등장. 드럼 없이 건반 아르페지오, 따뜻하게
   - city   : 문 너머 저녁 도시. 92bpm, 바장조 7화음, 부드러운 셔플
   엔진은 WorldAudio.unlock()(첫 터치), .music(이름), .sfx(이름)만 부른다.
   ===================================================================== */
(function(){
  const LS='hm-world1-mute';
  const A={ctx:null,out:null,mus:null,fx:null,rev:null,muted:false,mode:null,next:0,step:0,timer:null,song:null};
  try{A.muted=localStorage.getItem(LS)==='1';}catch(e){}
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const pick=a=>a[Math.floor(rnd()*a.length)];

  function init(){if(A.ctx)return true;const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
    const ctx=A.ctx=new C();
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(ctx.destination);
    A.out=ctx.createGain();A.out.gain.value=A.muted?0:0.9;A.out.connect(comp);
    A.mus=ctx.createGain();A.mus.gain.value=0;A.mus.connect(A.out);
    A.fx=ctx.createGain();A.fx.gain.value=0.75;A.fx.connect(A.out);
    // 짧은 잔향(합성 임펄스). 공간감만 살짝
    const len=ctx.sampleRate*1.4,ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
    A.rev=ctx.createConvolver();A.rev.buffer=ir;const rg=ctx.createGain();rg.gain.value=0.22;A.rev.connect(rg);rg.connect(A.out);
    A.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const nd=A.noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    return true;}

  /* ---------- 악기 ---------- */
  function env(g,t,a,peak,d,sus,rel,end){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(Math.max(0.0001,peak*sus),t+a+d);
    if(end){g.gain.setValueAtTime(Math.max(0.0001,peak*sus),end);g.gain.exponentialRampToValueAtTime(0.0001,end+rel);}}
  function voice(bus,type,freq,t,dur,vol,o){o=o||{};const c=A.ctx,os=c.createOscillator(),g=c.createGain();os.type=type;os.frequency.setValueAtTime(freq,t);
    if(o.slide)os.frequency.exponentialRampToValueAtTime(o.slide,t+(o.slideT||dur));if(o.detune)os.detune.value=o.detune;
    let node=os;if(o.lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(o.lp,t);if(o.lpTo)f.frequency.exponentialRampToValueAtTime(o.lpTo,t+dur);f.Q.value=o.q||0.7;os.connect(f);node=f;}
    node.connect(g);g.connect(bus);if(o.rev){const s=c.createGain();s.gain.value=o.rev;g.connect(s);s.connect(A.rev);}
    env(g,t,o.a||0.005,vol,o.d||dur,o.sus||0.0001,o.r||0.08,o.sus?t+dur:0);os.start(t);os.stop(t+dur+(o.r||0.08)+0.05);}
  function noise(bus,t,dur,vol,o){o=o||{};const c=A.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=A.noise;
    f.type=o.type||'highpass';f.frequency.setValueAtTime(o.f||6000,t);if(o.fTo)f.frequency.exponentialRampToValueAtTime(o.fTo,t+dur);f.Q.value=o.q||0.8;
    s.connect(f);f.connect(g);g.connect(bus);if(o.rev){const r=c.createGain();r.gain.value=o.rev;g.connect(r);r.connect(A.rev);}
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+(o.a||0.003));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
  const I={
    kick:(t,v)=>voice(A.mus,'sine',150,t,0.28,0.9*v,{slide:45,slideT:0.12,d:0.28}),
    snare:(t,v)=>{noise(A.mus,t,0.16,0.28*v,{type:'bandpass',f:1900,q:0.9,rev:0.3});voice(A.mus,'triangle',190,t,0.08,0.18*v,{d:0.08});},
    hat:(t,v)=>noise(A.mus,t,0.045,0.11*v,{f:7500}),
    shaker:(t,v)=>noise(A.mus,t,0.07,0.07*v,{type:'bandpass',f:5200,q:1.4,a:0.02}),
    bass:(t,m,dur,v)=>voice(A.mus,'triangle',mtof(m),t,dur,0.42*v,{lp:700,d:dur*0.9,sus:0.5,r:0.06}),
    // 건반(전자 피아노 느낌): 사인 + 두 배음, 금방 줄어든다
    keys:(t,m,dur,v)=>{voice(A.mus,'sine',mtof(m),t,dur,0.13*v,{d:dur,sus:0.25,r:0.25,rev:0.35});voice(A.mus,'sine',mtof(m)*2,t,dur*0.4,0.035*v,{d:dur*0.4});},
    pluck:(t,m,dur,v)=>{voice(A.mus,'triangle',mtof(m),t,dur,0.2*v,{lp:3200,lpTo:900,d:Math.min(0.5,dur),rev:0.4});voice(A.mus,'sine',mtof(m+12),t,0.12,0.04*v,{d:0.12});},
    bell:(t,m,dur,v)=>{voice(A.mus,'sine',mtof(m),t,dur,0.12*v,{d:dur,rev:0.6});voice(A.mus,'sine',mtof(m)*2.76,t,dur*0.3,0.03*v,{d:dur*0.3});}
  };

  /* ---------- 곡 ---------- */
  // 코드: [근음(미디), 구성음(근음 기준 반음)]. 진행 여러 개를 섹션마다 골라 쓴다
  const MAJ=[0,4,7],MIN=[0,3,7],MAJ7=[0,4,7,11],MIN7=[0,3,7,10],DOM7=[0,4,7,10],ADD9=[0,4,7,14];
  const SONGS={
    day:{bpm:104,key:60,scale:[0,2,4,5,7,9,11],drums:'pop',lead:'pluck',swing:0,
      progs:[[[0,MAJ],[7,MAJ],[9,MIN],[5,MAJ]],[[5,MAJ],[7,MAJ],[4,MIN],[9,MIN]],[[0,ADD9],[9,MIN7],[2,MIN7],[7,DOM7]],[[5,MAJ7],[4,MIN7],[2,MIN7],[7,MAJ]]]},
    ending:{bpm:84,key:57+3,scale:[0,2,4,5,7,9,11],drums:'none',lead:'bell',swing:0,arp:true,
      progs:[[[5,MAJ7],[7,MAJ],[4,MIN7],[9,MIN7]],[[2,MIN7],[7,DOM7],[0,ADD9],[0,MAJ]]]},
    city:{bpm:92,key:53,scale:[0,2,4,5,7,9,10],drums:'soft',lead:'keys',swing:0.16,
      progs:[[[0,MAJ7],[2,MIN7],[3+7,MAJ7],[7,DOM7]],[[5,MAJ7],[4,MIN7],[2,MIN7],[7,DOM7]],[[0,ADD9],[9,MIN7],[5,MAJ7],[7,DOM7]]]}
  };
  // 한 섹션(8마디) 만들기: 진행 하나를 두 번(뒤 4마디는 다른 진행일 수 있음), 멜로디는 동기(2마디)를 만들고 변형해서 4번
  function makeSection(S){const p1=pick(S.progs),p2=rnd()<0.5?p1:pick(S.progs),bars=p1.concat(p2);
    const rhythms=[[0,1,1.5,2,3],[0,0.5,1,2,2.5,3],[0,1.5,2,3.5],[0,1,2,2.5],[0.5,1,1.5,2,3],[0,2,3]];
    const motifR=[pick(rhythms),pick(rhythms)];let deg=pick([2,4,0]);const motif=[];
    for(let b=0;b<2;b++)motif.push(motifR[b].map(()=>{deg+=pick([-1,1,1,2,-2,0]);deg=Math.max(-2,Math.min(9,deg));return deg;}));
    const mel=[];for(let b=0;b<8;b++){const src=b%2,rr=motifR[src].slice(),dd=motif[src].map(x=>x+(b>=4&&b<6?pick([0,1,2]):0));
      if(b===7){mel.push([[0,0],[2,b%2?4:0]].map(([o,dv],k)=>({at:o,deg:k?0:2,len:k?2:1.5})));continue;}   // 마지막 마디는 으뜸음으로 쉼
      if(b===3||b===5){rr.pop();dd.pop();}   // 숨 쉬는 자리
      mel.push(rr.map((at,k)=>({at,deg:dd[k],len:(rr[k+1]!=null?rr[k+1]:4)-at})));}
    return{bars,mel,fill:rnd()<0.5};}
  function degToMidi(S,deg,base){const n=S.scale.length,o=Math.floor(deg/n),d=((deg%n)+n)%n;return base+S.scale[d]+12*o;}
  // 멜로디 음이 코드와 어긋나면 가장 가까운 코드 음으로 당긴다(강박에서만)
  function fitChord(m,root,ch,strong){if(!strong)return m;let best=m,bd=99;for(let o=-1;o<=2;o++)ch.forEach(iv=>{const c=root+iv+12*o;const d=Math.abs(c-m);if(d<bd){bd=d;best=c;}});return bd<=2?best:m;}

  function scheduleBar(S,sec,b,t0){const beat=60/S.bpm,[r,ch]=sec.bars[b],root=S.key+r,bv=b===0?1.08:1;
    const sw=k=>k%1===0.5?S.swing*beat:0;   // 8분 뒷박 셔플
    // 베이스: 1박 근음, 3박(가끔 5도나 옥타브), 마지막 마디는 이음음
    I.bass(t0,root-12,beat*1.6,bv);I.bass(t0+beat*2+sw(0.5)*0,root-12+(rnd()<0.4?7:rnd()<0.5?12:0),beat*1.4,0.85);
    if(rnd()<0.5)I.bass(t0+beat*3.5+sw(0.5),root-12+pick([0,7,5]),beat*0.4,0.6);
    // 화음: 건반 스탭(1박, 2.5박) 또는 아르페지오
    const voicing=ch.map(iv=>root+iv+12);
    if(S.arp){for(let k=0;k<8;k++){const n=voicing[(k<4?k:7-k)%voicing.length]+(k>=4?0:0);I.keys(t0+k*beat*0.5,n,beat*0.9,0.75);}}
    else{voicing.forEach(n=>I.keys(t0,n,beat*1.4,0.8));voicing.forEach(n=>I.keys(t0+beat*2.5+sw(0.5),n,beat*1.1,0.55));}
    // 드럼
    if(S.drums!=='none'&&!(sec.intro&&b<4)){for(let k=0;k<8;k++){const at=t0+k*beat*0.5+sw(k*0.5);
        if(S.drums==='pop'){if(k===0||k===5&&rnd()<0.5||k===4&&b%2)I.kick(at,1);if(k===2||k===6)I.snare(at,0.85);I.hat(at,k%2?0.7:1);}
        else{if(k===0||(k===5&&rnd()<0.35))I.kick(at,0.7);if(k===4)I.snare(at,0.45);I.shaker(at,k%2?0.6:1);}}
      if(sec.fill&&b===7)for(let k=0;k<4;k++)I.snare(t0+beat*2+k*beat*0.5,0.35+k*0.12);}
    // 멜로디(섹션 첫 바퀴의 처음 두 마디는 쉬어 숨 고르기)
    if(!(sec.intro&&b<2))sec.mel[b].forEach(n=>{const strong=n.at%1===0;let m=degToMidi(S,n.deg,S.key+12);m=fitChord(m,root+12,ch,strong);
      const at=t0+n.at*beat+sw(n.at),len=Math.max(0.2,n.len*beat*0.95);
      if(S.lead==='pluck')I.pluck(at,m,len,0.95);else if(S.lead==='bell')I.bell(at,m+12,len*1.5,0.9);else I.keys(at,m+12,len,1.25);});}

  function tick(){if(!A.ctx||!A.song)return;const S=A.song.S,beat=60/S.bpm,bar=beat*4;
    while(A.next<A.ctx.currentTime+0.6){if(!A.song.sec||A.song.b>=8){A.song.sec=makeSection(S);A.song.sec.intro=A.song.first;A.song.first=false;A.song.b=0;}
      scheduleBar(S,A.song.sec,A.song.b,A.next);A.song.b++;A.next+=bar;}}
  function music(name){if(!init())return;if(A.mode===name)return;A.mode=name;const c=A.ctx,now=c.currentTime;
    A.mus.gain.cancelScheduledValues(now);A.mus.gain.setValueAtTime(A.mus.gain.value,now);A.mus.gain.linearRampToValueAtTime(0.0001,now+0.6);
    clearInterval(A.timer);A.song=null;if(!name||!SONGS[name])return;
    setTimeout(()=>{if(A.mode!==name)return;const t=A.ctx.currentTime;seed=1+Math.floor(Math.random()*99999);
      // 새 곡을 깨끗하게 시작하려고 음악 버스를 새로 만든다(앞 곡의 예약된 음을 끊는다)
      const old=A.mus;A.mus=A.ctx.createGain();A.mus.gain.value=0.0001;A.mus.connect(A.out);try{old.disconnect();}catch(e){}
      A.mus.gain.setValueAtTime(0.0001,t);A.mus.gain.linearRampToValueAtTime(name==='ending'?0.5:0.44,t+1.2);
      A.song={S:SONGS[name],b:0,sec:null,first:true};A.next=t+0.08;tick();A.timer=setInterval(tick,120);},650);}

  /* ---------- 효과음 ---------- */
  const SFX={
    click(t){voice(A.fx,'sine',880,t,0.05,0.12,{slide:660,d:0.05});},
    select(t){voice(A.fx,'triangle',660,t,0.07,0.16,{d:0.07});voice(A.fx,'triangle',990,t+0.06,0.1,0.14,{d:0.1,rev:0.2});},
    talk(t){voice(A.fx,'sine',520,t,0.06,0.08,{slide:600,d:0.06});},
    card(t){noise(A.fx,t,0.35,0.12,{type:'bandpass',f:900,fTo:3800,q:1.2,a:0.12});[76,83].forEach((m,i)=>voice(A.fx,'sine',mtof(m),t+0.12+i*0.08,0.4,0.1,{d:0.4,rev:0.5}));},
    piece(t){[72,76,79,84].forEach((m,i)=>{voice(A.fx,'triangle',mtof(m),t+i*0.075,0.5,0.15,{d:0.5,rev:0.5});voice(A.fx,'sine',mtof(m+12),t+i*0.075,0.25,0.05,{d:0.25});});noise(A.fx,t+0.25,0.5,0.05,{f:9000,rev:0.6});},
    complete(t){[60,64,67,72,76,79,84].forEach((m,i)=>voice(A.fx,'triangle',mtof(m),t+i*0.06,0.9,0.12,{d:0.9,rev:0.6}));[48,55].forEach(m=>voice(A.fx,'sine',mtof(m),t,1.2,0.16,{d:1.2}));},
    gather(t){for(let i=0;i<10;i++)voice(A.fx,'sine',mtof(84+pick([0,2,4,7,9,12])),t+i*0.11+rnd()*0.04,0.35,0.05,{d:0.35,rev:0.7});noise(A.fx,t,1.4,0.06,{type:'bandpass',f:600,fTo:5000,q:0.7,a:0.9});},
    appear(t){noise(A.fx,t,0.9,0.14,{type:'lowpass',f:300,fTo:5000,a:0.05,rev:0.6});[60,67,72,76].forEach(m=>voice(A.fx,'sine',mtof(m),t+0.05,1.6,0.08,{d:1.6,a:0.08,rev:0.6}));
      for(let i=0;i<8;i++)voice(A.fx,'sine',mtof(88+pick([0,3,5,7])),t+0.1+i*0.07,0.3,0.035,{d:0.3,rev:0.8});},
    door(t){noise(A.fx,t,1.8,0.12,{type:'lowpass',f:200,fTo:2600,a:0.6,rev:0.5});voice(A.fx,'sine',mtof(43),t,1.6,0.2,{d:1.6,a:0.3});[67,72,76,79].forEach((m,i)=>voice(A.fx,'triangle',mtof(m),t+0.9+i*0.1,1.2,0.08,{d:1.2,rev:0.7}));},
    lamp(t,i){const m=[79,83,86][i%3];voice(A.fx,'sine',mtof(m),t,0.9,0.14,{d:0.9,rev:0.7});voice(A.fx,'sine',mtof(m)*2.76,t,0.25,0.04,{d:0.25});noise(A.fx,t,0.12,0.04,{f:6000});},
    whoosh(t){noise(A.fx,t,1.6,0.08,{type:'bandpass',f:300,fTo:1400,q:0.6,a:0.7});},
    // 리니: 귀여운 로봇 소리(삐-뽀-삐익)
    robot(t){[[880,1320,0.09],[660,520,0.08],[990,1480,0.14]].forEach(([a,b,d],i)=>voice(A.fx,'square',a,t+i*0.12,d,0.045,{slide:b,slideT:d,lp:2600,d}));},
    step(t){noise(A.fx,t,0.05,0.035,{type:'bandpass',f:420,q:1.1});}
  };
  function sfx(name,arg){if(!A.ctx||A.muted||!SFX[name])return;try{SFX[name](A.ctx.currentTime+0.01,arg);}catch(e){}}

  /* ---------- 켜기·끄기 버튼 ---------- */
  function unlock(){if(!init())return;if(A.ctx.state!=='running')A.ctx.resume();}
  function setMuted(m){A.muted=m;try{localStorage.setItem(LS,m?'1':'0');}catch(e){}
    if(A.ctx){const t=A.ctx.currentTime;A.out.gain.cancelScheduledValues(t);A.out.gain.setValueAtTime(A.out.gain.value,t);A.out.gain.linearRampToValueAtTime(m?0:0.9,t+0.25);}
    if(btn){btn.innerHTML=m?ICON_OFF:ICON_ON;btn.setAttribute('aria-label',m?'소리 켜기':'소리 끄기');}}
  const ICON_ON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const ICON_OFF='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  let btn=null;
  function mountButton(){btn=document.createElement('button');btn.id='sndBtn';btn.type='button';
    Object.assign(btn.style,{position:'fixed',left:'14px',top:'calc(56px + env(safe-area-inset-top,0px))',zIndex:'9',width:'34px',height:'34px',padding:'0',display:'grid',placeItems:'center',
      borderRadius:'50%',background:'rgba(17,18,28,.55)',color:'#fff',border:'1px solid rgba(255,255,255,.15)'});
    btn.onclick=e=>{e.stopPropagation();unlock();setMuted(!A.muted);};btn.addEventListener('pointerdown',e=>e.stopPropagation());
    document.body.appendChild(btn);setMuted(A.muted);}
  if(document.body)mountButton();else document.addEventListener('DOMContentLoaded',mountButton);
  // 브라우저 정책: 첫 터치에서만 소리를 켤 수 있다. 화면이 가려지면 멈췄다가 돌아오면 다시
  ['pointerdown','keydown','touchend'].forEach(ev=>addEventListener(ev,unlock,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!A.ctx)return;if(document.hidden)A.ctx.suspend();else A.ctx.resume();});

  window.WorldAudio={unlock,music,sfx,setMuted,get muted(){return A.muted;},get state(){return A.ctx?A.ctx.state:'none';},get mode(){return A.mode;},get _ctx(){return A.ctx;},get _out(){return A.out;}};   // _ctx·_out: 시험용
})();
