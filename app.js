'use strict';

/* ---------- 저장 ---------- */
const KEY = 'vnstudy.v2';
const S = Object.assign({ voice: 'f', kr: 'show', done: {}, srs: {}, act: {}, stats: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'));
let saveWarned = false;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    // 시크릿 모드나 저장 공간이 꽉 찬 경우. 학습은 계속 되게 두고 한 번만 알린다.
    if (!saveWarned) {
      saveWarned = true;
      alert('이 브라우저에서는 진도가 저장되지 않습니다.\n시크릿 모드를 끄거나 다른 브라우저로 열어 주세요.\n(학습은 그대로 하실 수 있습니다)');
    }
  }
}

const DAY = 864e5;
const STEPS = [1, 3, 7, 14, 30, 60];   // 일 단위. 반년~1년 기억을 목표로 한 간격
const now = () => Date.now();

/* ---------- 데이터 ---------- */
let ALL = [], AIDX = {}, DRILL = [];
const SONG = {};   // 노래 파일 있는지 확인한 결과
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const label = d => (typeof d.day === 'string' ? '준비 ' + d.day.slice(1) : 'Day ' + d.day);

/* ---------- 소리 ---------- */
/* 아이폰 사파리는 '사용자가 방금 누른 것'이 아니면 새 Audio 재생을 막는다.
   그래서 Audio 하나를 만들어 두고 주소만 바꿔 쓴다. 한 번 허락되면 그 뒤로는 계속 난다. */
const audio = new Audio();
const myVoice = new Audio();          // 내가 녹음한 것 재생용 (따로 둔다)

function play(text, slow) {
  const h = AIDX[text];
  if (!h) return;
  audio.pause();
  audio.src = `audio/${S.voice}/${slow ? 'slow' : 'n'}/${h}.mp3`;
  audio.currentTime = 0;
  audio.play().catch(() => { });
}
function playMine() {
  if (!REC.url) return;
  myVoice.pause();
  myVoice.src = REC.url;
  myVoice.currentTime = 0;
  myVoice.play().catch(() => { });
}
function soundRow(text, withSlow) {
  const row = el('div', 'sound');
  const a = el('button', 'ghost', '🔊 듣기');
  a.onclick = () => play(text, false);
  row.append(a);
  if (withSlow) {
    const b = el('button', 'ghost', '🐢 느리게');
    b.onclick = () => play(text, true);
    row.append(b);
  }
  return row;
}

/* 성조 표시 — 글자에서 자동으로 뽑은 것 */
function toneRow(tones, small) {
  const r = el('div', 'tones' + (small ? ' sm' : ''));
  (tones || []).forEach(t => {
    const b = el('span', 'tchip ' + t.name);
    b.append(el('i', null, esc(t.syl)),
             el('b', null, esc(t.shape)),
             el('span', null, esc(t.name)));
    b.title = t.syl + ' — ' + t.name + ' · ' + t.ko;
    r.append(b);
  });
  return r;
}

/* 대화 전체를 순서대로 재생한다 */
async function playSeq(list, rows) {
  const view = 'learn';
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if ($('#' + view).hidden) { (rows || []).forEach(r => r.classList.remove('now')); return; }
    if (rows) { rows.forEach(r => r.classList.remove('now')); rows[i]?.classList.add('now'); }
    const h = AIDX[t];
    if (!h) continue;
    audio.pause();
    audio.src = `audio/${S.voice}/n/${h}.mp3`;
    audio.currentTime = 0;
    await new Promise(res => {
      audio.onended = audio.onerror = res;
      audio.play().catch(res);
      setTimeout(res, 9000);
    });
    audio.onended = audio.onerror = null;
    await new Promise(r => setTimeout(r, 400));
  }
  (rows || []).forEach(r => r.classList.remove('now'));
}


/* ---------- 따라 말하기 ----------
   산출 효과(production effect): 눈으로만 보는 것보다 소리 내어 말하면 기억이 크게 좋아진다.
   그리고 남이 읽어주는 걸 듣는 것보다 '내가 말한 것'이 더 잘 남는다(운동 정보 + 자기참조).
   자동 채점은 하지 않는다 — 성조 채점은 지금 기술로 못 믿는다. 나란히 듣고 사람이 판단한다. */
let REC = { stream: null, mr: null, url: null, key: null };

/* 카드를 넘기거나 화면을 떠나면 녹음 상태를 비운다.
   안 그러면 앞 단어의 녹음이 다음 카드에서 '내 소리'로 재생된다. */
function resetRec() {
  try { if (REC.mr && REC.mr.state === 'recording') REC.mr.stop(); } catch (e) { }
  if (REC.url) { URL.revokeObjectURL(REC.url); REC.url = null; }
  REC.mr = null; REC.key = null;
  releaseMic();
}

/* 마이크는 다 쓰면 반드시 놓아준다. 안 놓으면 폰에 녹음 표시가 계속 뜬다. */
function releaseMic() {
  if (REC.stream) {
    REC.stream.getTracks().forEach(t => t.stop());
    REC.stream = null;
  }
}

const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

async function toggleRec(text, btn, box) {
  if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
  try {
    if (!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    box.textContent = '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.';
    return;
  }
  const chunks = [];
  const mr = new MediaRecorder(REC.stream);
  REC.mr = mr; REC.key = text;
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    releaseMic();                      // 녹음이 끝나면 마이크를 놓는다
    if (REC.url) URL.revokeObjectURL(REC.url);
    REC.url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
    btn.textContent = '🎤 다시 녹음';
    btn.dataset.on = '0';
    bumpSaid();
    drawCompare(text, box);
  };
  mr.start();
  btn.textContent = '⏹ 멈추기';
  btn.dataset.on = '1';
  box.textContent = '';
  setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 8000);
}

function drawCompare(text, box) {
  box.textContent = '';
  const row = el('div', 'cmp');
  const a = el('button', 'ghost', '👤 원어민');
  a.onclick = () => play(text, false);
  const b = el('button', 'ghost', '🙋 내 소리');
  b.onclick = () => {
    if (REC.key === text) playMine();
  };
  const t = el('button', 'primary', '📈 내 성조 그려보기');
  const curve = el('div', 'curvearea');
  t.onclick = () => showTone(text, REC.url, curve);
  const c = el('button', 'ghost', '↔ 번갈아 듣기');
  c.onclick = async () => {
    play(text, false);
    await new Promise(r => setTimeout(r, 2200));
    if (REC.key === text) playMine();
  };
  row.append(a, b, c, t);
  box.append(row);
  box.append(curve);
}

function speakRow(text) {
  const wrap = el('div', 'speak');
  if (!canRecord()) {
    wrap.append(el('div', 'cmpnote', '🗣️ 소리 내어 따라 말해 보세요. 속으로 읽는 것보다 훨씬 잘 남습니다.'));
    return wrap;
  }
  const box = el('div', 'cmpbox');
  const b = el('button', 'rec', '🎤 따라 말하기');
  b.onclick = () => toggleRec(text, b, box);
  wrap.append(b, box);
  return wrap;
}


/* ---------- 성조 그림으로 보기 ----------
   음성인식이 아니다. 소리의 **높낮이 곡선**만 뽑아 원어민 것과 겹쳐 그린다.
   "맞다/틀리다"로 단정하지 않는다 — 모양이 눈에 보이면 스스로 고칠 수 있다. */
let actx = null;
const nativeCache = {};

function getCtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

async function nativeCurve(text) {
  if (nativeCache[text] !== undefined) return nativeCache[text];
  const h = AIDX[text];
  if (!h) return (nativeCache[text] = null);
  try {
    const r = await fetch(`audio/${S.voice}/slow/${h}.mp3`);
    const c = await PITCH.analyze(await r.arrayBuffer(), getCtx());
    return (nativeCache[text] = c);
  } catch (e) { return (nativeCache[text] = null); }
}

function curveSvg(mine, native) {
  const W = 260, H = 92, PAD = 8;
  const all = [...(mine || []), ...(native || [])].filter(v => v !== null && isFinite(v));
  const lo = Math.min(-4, Math.min(...all)), hi = Math.max(4, Math.max(...all));
  const px = (i, n) => PAD + i * (W - PAD * 2) / (n - 1);
  const py = v => PAD + (hi - v) * (H - PAD * 2) / (hi - lo || 1);
  const path = arr => arr ? arr.map((v, i) => `${i ? 'L' : 'M'}${px(i, arr.length).toFixed(1)} ${py(v).toFixed(1)}`).join(' ') : '';
  const zero = py(0).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" class="curve">
    <line x1="${PAD}" y1="${zero}" x2="${W - PAD}" y2="${zero}" class="mid"/>
    ${native ? `<path d="${path(native)}" class="nat"/>` : ''}
    ${mine ? `<path d="${path(mine)}" class="mine"/>` : ''}
  </svg>`;
}

async function showTone(text, blobUrl, box) {
  box.textContent = '';
  const wait = el('div', 'cmpnote', '소리 높낮이를 재는 중…');
  box.append(wait);

  let mine = null, nat = null;
  try {
    const r = await fetch(blobUrl);
    mine = await PITCH.analyze(await r.arrayBuffer(), getCtx(), true);   // 허밍 거르기
  } catch (e) { }
  nat = await nativeCurve(text);
  wait.remove();

  if (mine && mine.reject) { box.append(el('div', 'cmpnote', esc(mine.reject))); return; }
  if (!mine || !mine.curve) {
    box.append(el('div', 'cmpnote', '높낮이를 못 읽었습니다. 조금 크고 또박또박 다시 말해 보세요.'));
    return;
  }

  const wrap = el('div', 'curvebox');
  wrap.innerHTML = curveSvg(mine.curve, nat && nat.curve);
  box.append(wrap);
  const lg = el('div', 'curvelegend');
  lg.innerHTML = `<span class="k nat"></span>원어민 &nbsp; <span class="k mine"></span>내 소리`;
  box.append(lg);

  /* 점수를 매기지 않는다.
     음높이만 보는 방식은 성조를 세밀하게 가려내지 못한다(문헌상 72~75%).
     그래서 '오르내리는 방향'이 같았는지만 말해주고, 나머지는 눈으로 보게 한다. */
  const DIR = { up: '올라감 ／', down: '내려감 ＼', dip: '내렸다 올림 ∨', flat: '평평함 —' };
  const dm = PITCH.direction(mine), dn = nat && PITCH.direction(nat);
  if (dn) {
    const same = dm === dn;
    const b = el('div', 'tonedir ' + (same ? 'ok' : 'no'));
    b.append(el('b', null, same ? '방향이 같습니다' : '방향이 다릅니다'));
    b.append(el('span', null, `원어민 ${DIR[dn]} · 내 소리 ${DIR[dm] || '?'}`));
    box.append(b);
  }
  box.append(el('div', 'toneable',
    '<b>이건 채점이 아닙니다.</b> 소리의 <b>높낮이 모양</b>만 그린 것입니다. ' +
    '무슨 소리를 냈는지는 보지 않으므로, 위 그림을 직접 눈으로 비교하세요.<br>' +
    '<b>믿어도 되는 것</b> — 올라가는지(sắc) 내려가는지(huyền) 내렸다 올리는지(hỏi).<br>' +
    '<b>믿으면 안 되는 것</b> — hỏi와 ngã의 구별. 이 둘은 남부 베트남어에서 아예 하나로 합쳐져 ' +
    '원어민도 갈라 쓰지 않습니다.'));
}

/* ---------- 화면 ---------- */
const VIEWS = ['home', 'learn', 'quiz', 'mission', 'tone', 'mark'];
function show(v, title, canBack) {
  audio.pause(); myVoice.pause();               // 넘어가면 재생 중이던 소리도 멈춘다
  resetRec();
  VIEWS.forEach(x => $('#' + x).hidden = x !== v);
  $('#title').textContent = title;
  $('#back').hidden = !canBack;
  window.scrollTo(0, 0);
}


/* ---------- 기록과 배지 ----------
   솔직히: 점수·배지가 '학습'을 만든다는 증거는 약하다. 올리는 건 '참여'다.
   그런데 간격 반복은 돌아와야만 돌아간다. 그래서 목표를 '돌아오는 것'에만 건다.
   연속 기록(streak)은 하루 끊기면 그만두는 원인이라 쓰지 않는다.
   대신 '이번 주 5일'로 두고 이틀은 쉬어도 되게 한다. */
const ymd = t => {
  // 반드시 '그 사람이 사는 곳의 날짜'로 센다.
  // toISOString()은 UTC라, 한국(UTC+9)에서 오전 9시 이전 공부가 전날로 기록된다.
  const d = t ? new Date(t) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function touchToday() {
  const k = ymd();
  if (!S.act[k]) { S.act[k] = 1; save(); }
}
function bumpSaid(n) {
  S.stats.said = (S.stats.said || 0) + (n || 1);
  touchToday(); save();
}

/* 이번 주(월~일) 며칠 했는가 */
function weekDots() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    out.push({ key: ymd(d), done: !!S.act[ymd(d)], future: d > now, today: ymd(d) === ymd() });
  }
  return out;
}

const BADGES = [
  { id: 'prep',  icon: '🔤', name: '글자를 뗐다',   test: () => ['P1','P2','P3'].every(k => S.done[k]) },
  { id: 'w1',    icon: '👋', name: '1주차 완주',    test: () => [1,2,3,4,5].every(k => S.done[k]) },
  { id: 'half',  icon: '🌓', name: '절반까지',      test: () => Object.keys(S.done).filter(k => +k >= 1).length >= 10 },
  { id: 'all',   icon: '🏁', name: '20일 완주',     test: () => Array.from({length:20},(_,i)=>i+1).every(k => S.done[k]) },
  { id: 'w100',  icon: '💯', name: '단어 100개',    test: () => Object.keys(S.srs).length >= 100 },
  { id: 'tone8', icon: '👂', name: '성조 8/10',     test: () => (S.stats.toneBest || 0) >= 8 },
  { id: 'say50', icon: '🗣️', name: '50번 소리 냈다', test: () => (S.stats.said || 0) >= 50 },
  { id: 'week5', icon: '📅', name: '한 주 5일',     test: () => weekDots().filter(d => d.done).length >= 5 }
];

function renderProgress() {
  const box = $('#progress');
  box.textContent = '';

  const dots = weekDots();
  const n = dots.filter(d => d.done).length;
  const head = el('div', 'phead');
  head.append(el('strong', null, '이번 주 ' + n + ' / 5일'));
  head.append(el('span', null, n >= 5 ? '목표 달성 ✔' : '이틀은 쉬어도 됩니다'));
  box.append(head);

  const row = el('div', 'dots');
  '월화수목금토일'.split('').forEach((label, i) => {
    const d = dots[i];
    const s = el('span', 'dot' + (d.done ? ' on' : '') + (d.today ? ' today' : '') + (d.future ? ' fut' : ''));
    s.textContent = label;
    row.append(s);
  });
  box.append(row);

  const st = el('div', 'stats');
  const words = Object.keys(S.srs).length;
  const days = Object.keys(S.done).filter(k => +k >= 1).length;
  [['배운 단어', words], ['끝낸 날', days + '일'], ['소리 낸 횟수', S.stats.said || 0]]
    .forEach(([k, v]) => {
      const c = el('div', 'stat');
      c.append(el('b', null, String(v)), el('span', null, k));
      st.append(c);
    });
  box.append(st);

  const got = BADGES.filter(b => b.test());
  const bd = el('div', 'badges');
  BADGES.forEach(b => {
    const on = got.includes(b);
    const s = el('span', 'badge' + (on ? ' on' : ''));
    s.append(el('i', null, b.icon), el('em', null, b.name));
    s.title = on ? '달성' : '아직';
    bd.append(s);
  });
  box.append(bd);
}


/* ---------- 주간 총복습 ----------
   그 주에 새로 배운 카드를 **한 묶음으로 통째** 한 바퀴 돈다.
   같은 반복 횟수라면 작게 쪼개 여러 바퀴 도는 것보다 큰 묶음 한 바퀴가 낫다는
   실험이 있다(Kornell 2009). 그런데 참가자의 72%가 반대로 판단했다 —
   그래서 '쪼개기' 기능은 일부러 만들지 않는다. */
function weekWords() {
  const from = now() - 7 * DAY;
  const learned = Object.entries(S.srs)
    .filter(([, v]) => v.first && v.first >= from)
    .map(([k]) => k);
  return learned.map(v => allWords().find(w => w.vi === v)).filter(Boolean);
}

function renderWeekly() {
  const ws = weekWords();
  const box = $('#weekly');
  box.hidden = ws.length < 10;
  if (box.hidden) return;
  const dow = new Date().getDay();          // 0=일
  const due = dow === 0 || dow === 6;       // 주말에 권한다
  $('#weeklyN').textContent = ws.length + '개';
  $('#weeklyWhy').textContent = due
    ? '이번 주에 배운 것을 통째로 한 바퀴 — 지금이 좋은 때입니다'
    : '이번 주에 배운 것을 통째로 한 바퀴 (주말에 권합니다)';
  box.dataset.due = due ? '1' : '0';
}

/* ---------- 홈 ---------- */
const allWords = () => ALL.flatMap(d => d.words || []);
function dueWords() {
  const n = now();
  return Object.entries(S.srs).filter(([, v]) => v.due <= n).map(([k]) => k);
}

const GROUPS = [
  [d => typeof d.day === 'string', '준비 · 글자와 소리 (3일)'],
  [d => d.day >= 1 && d.day <= 5, '1주차 · 사람과 인사'],
  [d => d.day >= 6 && d.day <= 10, '2주차 · 숫자와 시간'],
  [d => d.day >= 11 && d.day <= 15, '3주차 · 현장의 말'],
  [d => d.day >= 16 && d.day <= 20, '4주차 · 안전과 설비']
];

function renderHome() {
  renderProgress();
  renderWeekly();
  // 성조 훈련 시점: 저녁에 하면 자는 동안 '성조 범주'로 정리된다는 실험이 있다.
  // (아침에 훈련한 집단은 하루가 지나며 오히려 정확도가 떨어졌다)
  const h = new Date().getHours();
  const night = h >= 19 || h < 3;
  const tb = $('#toneBanner');
  tb.dataset.night = night ? '1' : '0';
  $('#toneWhy').textContent = night
    ? '지금이 좋은 때입니다 — 자는 동안 소리가 정리됩니다'
    : '소리만 듣고 6성조 구별하기';

  const due = dueWords();
  $('#reviewCard').hidden = due.length === 0;
  $('#reviewCount').textContent = due.length + '개';

  const list = $('#dayList');
  list.textContent = '';
  let g = -1;
  ALL.forEach(d => {
    const gi = GROUPS.findIndex(([f]) => f(d));
    if (gi !== g) { g = gi; list.append(el('li', 'grp', esc(GROUPS[gi][1]))); }
    const done = !!S.done[d.day];
    const b = el('button');
    b.dataset.done = done ? '1' : '0';
    const n = (d.words || []).length;
    b.append(
      el('span', 'num', esc(label(d))),
      el('span', 'nm', esc(d.theme)),
      el('span', 'st', done ? '완료 ✔'
        : (n ? n + '단어 + 대화 2문장' : '소리만 · 외울 것 없음'))
    );
    b.onclick = () => startLearn(d);
    const li = el('li'); li.append(b); list.append(li);
  });
  show('home', '베트남어 스터디', false);
}

/* ---------- 학습 ---------- */
let L = null;

function startLearn(d) {
  const items = [];
  (d.letters || []).forEach(x => items.push({ k: 'letter', d: x }));
  (d.tones || []).forEach(x => items.push({ k: 'tone', d: x }));
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  if (d.dialog) items.push({ k: 'dialog', d: d.dialog });
  L = { day: d, items, i: 0 };
  $('#learnIntro').textContent = d.intro || '';
  $('#learnIntro').dataset.prep = (d.words || []).length ? '0' : '1';
  drawCard();
  show('learn', label(d) + ' · ' + d.theme, true);
}

/* 한글 독음: 기본 숨김. 시작 14일 뒤에는 아예 안 나온다 */
function reveal(txt) {
  if (!txt) return el('span');
  if (!S.firstDay) { S.firstDay = now(); save(); }
  if (S.kr === 'off') return el('span');
  const b = el('button', 'reveal', '');
  const open = () => { b.dataset.open = '1'; b.textContent = '[' + txt + ']'; };
  const shut = () => { b.dataset.open = '0'; b.textContent = '한글 발음 보기'; };
  if (S.kr === 'hide') { shut(); b.onclick = open; } else { open(); b.onclick = shut; }
  return b;
}

function drawCard() {
  resetRec();
  const c = $('#card');
  c.textContent = '';
  const it = L.items[L.i], x = it.d;

  if (it.k === 'letter') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(el('div', 'exline', '예: <b>' + esc(x.ex) + '</b> — ' + esc(x.ex_ko)));
    c.append(soundRow(x.ex, true));
    c.append(reveal(x.kr_read));
  }

  if (it.k === 'tone') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'tone-shape', esc(x.shape)));
    c.append(soundRow(x.vi, true));
    c.append(el('div', 'ko', esc(x.ko) + ' <span style="color:var(--dim)">· ' + esc(x.mark) + '</span>'));
    c.append(reveal(x.kr_read));
  }

  if (it.k === 'word') {
    if (x.emoji) c.append(el('div', 'pic', esc(x.emoji)));
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(toneRow(x.tones));
    c.append(soundRow(x.vi, true));
    c.append(el('div', 'ko', esc(x.ko)));
    if (x.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(x.hanja)));
    if (x.gesture) c.append(el('div', 'gest', '✋ ' + esc(x.gesture)));
    c.append(reveal(x.kr_read));
    c.append(speakRow(x.vi));
  }

  if (it.k === 'dialog') {
    c.classList.add('wide');
    c.append(el('div', 'setbadge daily', '오늘의 대화 · ' + esc(x.title)));
    if (x.emoji) c.append(el('div', 'pic', esc(x.emoji)));
    const lineEls = [];
    const all = el('button', 'primary', '▶ 대화 전체 듣기');
    all.onclick = () => playSeq(x.lines.map(l => l.vi), lineEls);
    c.append(all);

    // 노래본이 있으면 띄운다. 멜로디에 얹은 구절은 그냥 말한 것보다 잘 남는다.
    const songUrl = `audio/song/day${String(L.day.day).padStart(2, '0')}.mp3`;
    if (SONG[songUrl] === false) return;      // 없다고 이미 확인한 날은 다시 묻지 않는다
    fetch(songUrl, { method: 'HEAD' }).then(r => {
      SONG[songUrl] = r.ok;
      if (!r.ok) return;
      const sg = el('button', 'song', '🎵 오늘의 노래');
      sg.onclick = () => { audio.pause(); audio.src = songUrl; audio.currentTime = 0; audio.play().catch(() => { }); };
      all.after(sg);
    }).catch(() => { });

    x.lines.forEach(l => {
      const row = el('div', 'line ' + (l.who === 'A' ? 'a' : 'b'));
      const head = el('div', 'lhead');
      head.append(el('span', 'who', l.who));
      const bt = el('button', 'ghost', '🔊');
      bt.onclick = () => play(l.vi, false);
      const bs = el('button', 'ghost', '🐢');
      bs.onclick = () => play(l.vi, true);
      head.append(bt, bs);
      row.append(head);
      row.append(el('div', 'lvi', esc(l.vi)));
      row.append(el('div', 'lko', esc(l.ko)));
      // 단어별 풀이 + 그 단어의 성조를 한 칸에
      const norm = x => x.toLowerCase().replace(/[.,!?;:'"]/g, '');
      const tmap = {};
      (l.tones || []).forEach(t => { tmap[norm(t.syl)] = t; });
      const g = el('div', 'gloss');
      l.gloss.forEach(pp => {
        const cell = el('div', 'gcell');
        const top = el('span', 'gtop');
        top.append(el('span', 'gw', esc(pp.w)));
        const t = tmap[norm(pp.w.split(' ')[0])];
        if (t) {
          const ch = el('span', 'gt ' + t.name, esc(t.shape));
          ch.title = t.name + ' · ' + t.ko;
          top.append(ch);
        }
        cell.append(top, el('span', 'gm', esc(pp.m)));
        if (t) cell.append(el('span', 'gtn', esc(t.name)));
        g.append(cell);
      });
      row.append(g);
      row.append(reveal(l.kr_read));
      row.append(speakRow(l.vi));
      lineEls.push(row);
      c.append(row);
    });

    if (x.extra && x.extra.length) {
      const sw = el('div', 'ex');
      sw.append(el('div', 'exhead', '이렇게도 말합니다'));
      x.extra.forEach(t => {
        const o = typeof t === 'string' ? { vi: t } : t;
        const b = el('button', 'exrow');
        const L2 = el('span', 'exl');
        L2.append(el('span', 'exvi', esc(o.vi)));
        if (o.ko) L2.append(el('span', 'exko', esc(o.ko)));
        if (o.kr_read) L2.append(el('span', 'exkr', '[' + esc(o.kr_read) + ']'));
        b.append(L2, el('span', 'exspk', '🔊'));
        b.onclick = () => play(o.vi, false);
        sw.append(b);
      });
      c.append(sw);
    }
  } else {
    c.classList.remove('wide');
  }

  // '1 / 12'만 보면 외울 게 12개인 줄 안다. 무엇을 세는지 붙여준다.
  const KIND = { letter: '글자', tone: '성조', word: '단어', dialog: '대화' };
  const kinds = L.items.map(x => x.k);
  if (it.k === 'dialog') {
    $('#pos').textContent = '오늘의 대화';
  } else {
    const same = kinds.filter(k => k === it.k).length;
    const nth = kinds.slice(0, L.i + 1).filter(k => k === it.k).length;
    $('#pos').textContent = `${KIND[it.k] || ''} ${nth} / ${same}`;
  }
  $('#prev').disabled = L.i === 0;
  const last = L.i === L.items.length - 1;
  $('#next').textContent = last ? ((L.day.words || []).length ? '확인 문제 ›' : '대화 미션 ›') : '다음 ›';
}

$('#prev').onclick = () => { if (!$('#learn').hidden && L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  // 연타 방지는 시간이 아니라 '아직 이 화면에 있는가'로 판단한다.
  // 시간으로 막으면 앞 화면에서 막 넘어온 사람까지 막힌다.
  if ($('#learn').hidden) return;
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if ((L.day.words || []).length) startQuiz(L.day.words, L.day);
  else showMission(L.day);
};

/* ---------- 퀴즈 ---------- */
let Q = null;

function buildQuestions(words) {
  const pool = allWords();
  return words.map(w => {
    const lv = (S.srs[w.vi] || {}).lv || 0;
    // 익숙해진 단어(2단계 이상)는 보기 없이 직접 떠올리게 한다
    const mode = lv >= 2 ? 'recall'
      : (Math.random() < .5 && AIDX[w.vi] ? 'listen' : 'meaning');
    const others = pool.filter(x => x.vi !== w.vi).sort(() => Math.random() - .5).slice(0, 3);
    return { w, mode, opts: [w, ...others].sort(() => Math.random() - .5) };
  }).sort(() => Math.random() - .5);
}

function startQuiz(words, day, cap) {
  let src = words || dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
  if (!src.length) { renderHome(); return; }
  if (cap) src = src.slice(0, cap);            // 짧게 끊어 하는 모드
  const list = buildQuestions(src);
  Q = { list, i: 0, ok: 0, day, total: list.length };
  drawQuiz();
  show('quiz', day ? '확인 문제' : (cap ? '3분 복습' : '복습'), true);
}

function drawQuiz() {
  const body = $('#quizBody');
  body.textContent = '';
  $('#quizFill').style.width = (Q.i / Q.list.length * 100) + '%';
  if (Q.i >= Q.list.length) return finishQuiz();

  const q = Q.list[Q.i];
  const LABEL = { listen: '듣고 고르세요', meaning: '뜻을 고르세요', recall: '소리 내어 말해 보세요' };
  body.append(el('div', 'q', LABEL[q.mode]));

  if (q.mode === 'recall') return drawRecall(body, q);

  if (q.mode === 'listen') {
    const wrap = el('div', 'qplay');
    const b = el('button', 'primary big', '🔊 다시 듣기');
    b.onclick = () => play(q.w.vi, false);
    const sl = el('button', 'ghost', '🐢 느리게');
    sl.onclick = () => play(q.w.vi, true);
    wrap.append(b, sl);
    body.append(wrap);
    play(q.w.vi, false);
  } else {
    body.append(el('div', 'qmain', esc(q.w.vi)));
  }

  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const b = el('button', null, esc(q.mode === 'listen' ? o.vi : o.ko));
    b.onclick = () => answer(b, o.vi === q.w.vi, q.w);
    opts.append(b);
  });
  body.append(opts);
}


/* 회상형 — 보기를 주지 않고 직접 떠올려 소리 내게 한다.
   4지선다는 아는 것처럼 보이게 만든다(실제보다 20% 과대평가). 회상이 진짜다.
   게다가 소리 내어 말하므로 산출 효과까지 같이 얻는다. 채점은 본인이 한다. */
function drawRecall(body, q) {
  body.append(el('div', 'qmain', esc(q.w.ko)));
  if (q.w.emoji) body.append(el('div', 'pic mid', esc(q.w.emoji)));
  if (q.w.gesture) body.append(el('div', 'gest mid', '✋ ' + esc(q.w.gesture)));

  const hint = el('p', 'cmpnote', '베트남어로 <b>입 밖에 내어</b> 말해 보세요. 속으로만 생각하면 효과가 절반입니다.');
  body.append(hint);

  const show = el('button', 'primary big', '말했어요 · 정답 보기');
  show.style.width = '100%';
  body.append(show);

  show.onclick = () => {
    bumpSaid();                      // 소리 내어 말했다고 스스로 누른 순간
    show.remove(); hint.remove();
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(q.w.vi)));
    ans.append(toneRow(q.w.tones));
    const sr = soundRow(q.w.vi, true);
    sr.classList.add('mid');
    ans.append(sr);
    body.append(ans);

    const grade2 = el('div', 'opts');
    const ok = el('button', null, '✓ 맞았어요');
    ok.onclick = () => { grade(q.w.vi, true); Q.ok++; Q.i++; drawQuiz(); };
    const no = el('button', null, '✗ 못 맞혔어요');
    no.onclick = () => { grade(q.w.vi, false); requeue(q); Q.i++; drawQuiz(); };
    grade2.append(ok, no);
    body.append(grade2);
  };
}

function answer(btn, correct, w) {
  [...btn.parentNode.children].forEach(b => b.disabled = true);
  btn.dataset.r = correct ? 'ok' : 'no';
  if (!correct) {
    [...btn.parentNode.children].forEach(b => {
      if (b.textContent === w.vi || b.textContent === w.ko) b.dataset.r = 'ok';
    });
  }
  if (correct) Q.ok++;
  else requeue(Q.list[Q.i]);        // 틀린 건 이번 판 끝에 한 번 더
  grade(w.vi, correct);
  setTimeout(() => { Q.i++; drawQuiz(); }, correct ? 450 : 1400);
}

/* 틀린 문제를 같은 판 뒤쪽에 한 번만 다시 넣는다.
   틀린 채로 끝내면 그 기억이 남는다. 맞히고 끝내야 한다. */
function requeue(q) {
  if (q.retry) return;                          // 두 번은 안 미룬다
  Q.list.push({ ...q, retry: true });
}

function grade(vi, ok) {
  touchToday();
  const r = S.srs[vi] || { lv: 0, first: now() };
  if (!r.first) r.first = now();
  r.lv = ok ? Math.min(r.lv + 1, STEPS.length - 1) : Math.max(0, r.lv - 2);
  r.due = now() + STEPS[r.lv] * DAY;
  S.srs[vi] = r;
  save();
}

function finishQuiz() {
  $('#quizFill').style.width = '100%';
  const n = Q.ok, t = Q.total;
  const again = Q.list.length - Q.total;
  const r = el('div', 'result');
  r.append(el('div', 'n', n + ' / ' + t));
  if (again) r.append(el('div', 'sub', again + '개는 그 자리에서 한 번 더 물었습니다'));
  r.append(el('div', null, n === t ? '전부 맞혔습니다' :
    n >= t * .7 ? '좋습니다. 틀린 건 내일 다시 나옵니다' :
      '틀린 건 내일 다시 나옵니다. 처음엔 다 그렇습니다'));
  const soon = Object.values(S.srs).map(v => v.due).filter(d => d > now()).sort((a, b) => a - b)[0];
  if (soon) {
    const days = Math.max(1, Math.round((soon - now()) / DAY));
    r.append(el('p', 'note', `다음 복습은 ${days}일 뒤입니다. 잊기 직전에 다시 꺼내야 오래 남습니다.`));
  }
  const b = el('button', 'primary big', Q.day ? '오늘의 대화 미션 ›' : '홈으로');
  b.style.marginTop = '24px';
  b.onclick = () => Q.day ? showMission(Q.day) : renderHome();
  r.append(b);
  $('#quizBody').textContent = '';
  $('#quizBody').append(r);
}


/* ---------- 성조 훈련 (미니멀 페어) ----------
   성조만 다르고 나머지는 같은 단어를 소리로만 구별시킨다.
   시판 앱 대부분이 빠뜨린 부분이고, 성조 습득 연구가 가리키는 표준 훈련법이다. */
let T = null;

function startTone() {
  const qs = [];
  DRILL.forEach(g => g.items.forEach(it => qs.push({ g, it })));
  T = { list: qs.sort(() => Math.random() - .5).slice(0, 10), i: 0, ok: 0 };
  drawTone();
  show('tone', '성조 훈련', true);
}

function drawTone() {
  const body = $('#toneBody');
  body.textContent = '';
  if (T.i >= T.list.length) return finishTone();
  const { g, it } = T.list[T.i];

  body.append(el('div', 'q', `${T.i + 1} / ${T.list.length} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', `글자는 모두 <b>${esc(g.base)}</b> 로 같습니다. 성조만 다릅니다.`));

  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '🔊 다시 듣기');
  b.onclick = () => play(it.vi, false);
  const sl = el('button', 'ghost', '🐢 느리게');
  sl.onclick = () => play(it.vi, true);
  wrap.append(b, sl);
  body.append(wrap);
  play(it.vi, false);

  const opts = el('div', 'opts tonelist');
  g.items.forEach(o => {
    const btn = el('button');
    btn.append(el('span', 'tvi', esc(o.vi)),
               el('span', 'tmark', esc(o.mark)),
               el('span', 'tko', esc(o.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = o.vi === it.vi;
      btn.dataset.r = good ? 'ok' : 'no';
      if (!good) [...opts.children].forEach(x => {
        if (x.querySelector('.tvi').textContent === it.vi) x.dataset.r = 'ok';
      });
      if (good) T.ok++;
      setTimeout(() => { T.i++; drawTone(); }, good ? 500 : 1600);
    };
    opts.append(btn);
  });
  body.append(opts);
}

function finishTone() {
  const n = T.ok, t = T.list.length;
  if (n > (S.stats.toneBest || 0)) { S.stats.toneBest = n; save(); }
  touchToday();
  const r = el('div', 'result');
  r.append(el('div', 'n', n + ' / ' + t));
  r.append(el('div', null, n >= 7 ? '귀가 트이고 있습니다'
    : n >= 4 ? '보통입니다. 성조는 몇 주 걸립니다'
    : '괜찮습니다. 처음엔 아무도 못 구별합니다'));
  r.append(el('p', 'note', '가장 어려운 건 hỏi(내렸다 올림)와 ngã(끊었다 올림)입니다. 이 둘은 원어민도 지역에 따라 섞어 씁니다.'));
  r.append(el('div', 'rule',
    '<b>✍️ 일주일에 한 번은 손으로 써보세요.</b><br>' +
    '종이에 <b>à á ả ã ạ</b> 를 다섯 번씩. 눈으로만 보면 hỏi와 ngã가 끝까지 안 구별됩니다.'));
  const b = el('button', 'primary big', '다시 하기');
  b.style.marginTop = '18px';
  b.onclick = startTone;
  const h = el('button', 'ghost big', '홈으로');
  h.style.marginTop = '10px'; h.style.marginLeft = '8px';
  h.onclick = renderHome;
  r.append(b, h);
  $('#toneBody').textContent = '';
  $('#toneBody').append(r);
}


/* ---------- 성조 부호 붙이기 ----------
   자유 작문은 넣지 않는다(하루 10분에 안 들어간다).
   대신 '들은 소리에 맞는 성조 부호 고르기' 하나만 남긴다.
   ă â đ ê ô ơ ư 와 다섯 성조 부호는 로마자를 쓰는 사람에게도 새 글자 모양이라,
   눈으로만 보면 hỏi 와 ngã 가 끝까지 구별되지 않는다. */
let MK = null;
const MARKS = [
  { m: '',  name: 'ngang', ko: '평평하게',   ex: 'a' },
  { m: '\u0300', name: 'huyền', ko: '내려감',   ex: 'à' },
  { m: '\u0301', name: 'sắc',   ko: '올라감',   ex: 'á' },
  { m: '\u0309', name: 'hỏi',   ko: '내렸다 올림', ex: 'ả' },
  { m: '\u0303', name: 'ngã',   ko: '끊었다 올림', ex: 'ã' },
  { m: '\u0323', name: 'nặng',  ko: '짧고 무겁게', ex: 'ạ' }
];

function stripTone(syl) {
  return syl.normalize('NFD').replace(/[\u0300\u0301\u0309\u0303\u0323]/g, '').normalize('NFC');
}

function markPool() {
  // 성조가 붙은 한 음절짜리 단어만 고른다
  return allWords().filter(w => {
    if (w.vi.split(' ').length !== 1) return false;
    const t = (w.tones || [])[0];
    return t && AIDX[w.vi];
  });
}

function startMarks() {
  const pool = markPool().sort(() => Math.random() - .5).slice(0, 8);
  if (!pool.length) { renderHome(); return; }
  MK = { list: pool, i: 0, ok: 0 };
  drawMark();
  show('mark', '성조 부호 붙이기', true);
}

function drawMark() {
  const body = $('#markBody');
  body.textContent = '';
  if (MK.i >= MK.list.length) return finishMark();
  const w = MK.list[MK.i];
  const want = w.tones[0].name;

  body.append(el('div', 'q', `${MK.i + 1} / ${MK.list.length} · 듣고 성조 부호를 고르세요`));
  const bare = stripTone(w.vi);
  body.append(el('div', 'markbare', esc(bare)));

  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '🔊 다시 듣기');
  b.onclick = () => play(w.vi, false);
  const sl = el('button', 'ghost', '🐢 느리게');
  sl.onclick = () => play(w.vi, true);
  wrap.append(b, sl);
  body.append(wrap);

  const opts = el('div', 'opts markopts');
  MARKS.forEach(mk => {
    const shown = mk.m ? (bare[0] + mk.m).normalize('NFC') + bare.slice(1) : bare;
    const btn = el('button');
    btn.append(el('span', 'mkvi', esc(shown)),
               el('span', 'mkname', esc(mk.name)),
               el('span', 'mkko', esc(mk.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = mk.name === want;
      btn.dataset.r = good ? 'ok' : 'no';
      if (!good) [...opts.children].forEach(x => {
        if (x.querySelector('.mkname').textContent === want) x.dataset.r = 'ok';
      });
      if (good) MK.ok++;
      grade(w.vi, good);
      setTimeout(() => { MK.i++; drawMark(); }, good ? 500 : 1500);
    };
    opts.append(btn);
  });
  body.append(opts);
  body.append(el('div', 'cmpnote', '뜻: ' + esc(w.ko)));
  play(w.vi, false);
}

function finishMark() {
  const r = el('div', 'result');
  r.append(el('div', 'n', MK.ok + ' / ' + MK.list.length));
  r.append(el('div', null, MK.ok >= 6 ? '부호가 눈에 들어오고 있습니다'
    : '괜찮습니다. hỏi(ả)와 ngã(ã)는 원어민도 자주 틀립니다'));
  r.append(el('div', 'rule',
    '<b>✍️ 종이에 한 번 써보세요.</b><br>' +
    'à á ả ã ạ 를 다섯 번씩. 눈으로만 보면 ả 와 ã 가 끝까지 구별되지 않습니다.'));
  const b = el('button', 'primary big', '다시 하기');
  b.style.marginTop = '16px'; b.onclick = startMarks;
  const h = el('button', 'ghost big', '홈으로');
  h.style.marginLeft = '8px'; h.onclick = renderHome;
  r.append(b, h);
  $('#markBody').textContent = '';
  $('#markBody').append(r);
}

/* ---------- 미션 ---------- */
function showMission(d) {
  const m = d.mission, body = $('#missionBody');
  body.textContent = '';
  body.append(el('h2', 'mgoal', '🎯 ' + esc(m.goal)));
  body.append(el('p', 'mhow', esc(m.how)));
  const roles = el('div', 'roles');
  [['A', m.a], ['B', m.b]].forEach(([k, v]) => {
    const r = el('div', 'role');
    r.append(el('b', null, k + ' 역할'), el('span', null, esc(v)));
    roles.append(r);
  });
  body.append(roles);
  body.append(el('div', 'rule',
    '<b>✋ 규칙 하나 — 말할 때 손짓을 같이 하세요.</b><br>' +
    '몸을 쓰며 외운 단어는 그냥 외운 것보다 훨씬 오래 갑니다. ' +
    '연구에서는 14개월 뒤까지 차이가 남았습니다. 어색해도 손을 움직이세요.'));
  body.append(el('p', 'note', '한 명이 A, 다른 한 명이 B를 맡습니다. 상대 카드는 보지 않습니다. 대화는 단톡방에서 하세요.'));
  const b = el('button', 'primary big', '오늘 완료');
  b.style.marginTop = '20px'; b.style.width = '100%';
  b.onclick = () => { S.done[d.day] = true; touchToday(); save(); renderHome(); };
  body.append(b);
  show('mission', '오늘의 대화 미션', true);
}

/* ---------- 시작 ---------- */
$('#back').onclick = renderHome;
$('#goReview').onclick = () => startQuiz(null, null);
$('#goQuick').onclick = () => startQuiz(null, null, 10);
$('#goTone').onclick = startTone;
$('#goMark').onclick = startMarks;
$('#goWeekly').onclick = () => {
  const ws = weekWords();
  if (!ws.length) return;
  startQuiz(ws, null);          // 통째로 한 바퀴. 쪼개지 않는다.
  $('#title').textContent = '주간 총복습';
};
/* 진도 백업 — 아이폰 사파리가 저장소를 비울 수 있어서 대비한다.
   200단어가 다 쌓이면 원본이 7.5KB라 압축해서 내보낸다 (10,600자 → 2,900자). */
const b64 = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));

async function makeBackup() {
  const raw = JSON.stringify({ done: S.done, srs: S.srs, firstDay: S.firstDay, act: S.act, stats: S.stats });
  if (typeof CompressionStream === 'undefined')
    return 'VNSTUDY1' + btoa(unescape(encodeURIComponent(raw)));
  const st = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
  return 'VNSTUDY2' + b64(new Uint8Array(await new Response(st).arrayBuffer()));
}

async function readBackup(v) {
  if (v.startsWith('VNSTUDY2')) {
    const st = new Blob([unb64(v.slice(8))]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(st).text());
  }
  if (v.startsWith('VNSTUDY1'))
    return JSON.parse(decodeURIComponent(escape(atob(v.slice(8)))));
  throw new Error('형식 아님');
}

$('#bkExport').onclick = async () => {
  const blob = await makeBackup();
  let copied = false;
  try { await navigator.clipboard.writeText(blob); copied = true; } catch (e) { }
  const n = Object.keys(S.done).length;
  prompt(`${n}일치 진도를 담았습니다 (${blob.length}자).\n` +
    (copied ? '이미 복사해 뒀습니다. ' : '') +
    '메모 앱에 붙여넣어 두세요.', blob);
};

$('#bkImport').onclick = async () => {
  const v = (prompt('백업해둔 글자를 붙여넣으세요.') || '').trim();
  if (!v) return;
  try {
    const o = await readBackup(v);
    const nd = Object.keys(o.done || {}).length, nw = Object.keys(o.srs || {}).length;
    if (!confirm(`${nd}일치 진도와 단어 ${nw}개를 되살립니다.\n지금 진도는 덮어씁니다. 진행할까요?`)) return;
    S.done = o.done || {}; S.srs = o.srs || {}; S.firstDay = o.firstDay;
    S.act = o.act || {}; S.stats = o.stats || {};
    save(); renderHome(); alert('되살렸습니다.');
  } catch (e) {
    alert('백업 글자가 아니거나 중간이 잘렸습니다.\nVNSTUDY 로 시작하는 글자 전체를 복사해 주세요.');
  }
};

/* 한글 발음: 켜짐 → 눌러야 보임 → 아예 끔, 세 단계 */
const KR = { show: ['한', '한글 발음 켜짐'], hide: ['한*', '눌러야 보임'], off: ['한✕', '한글 발음 꺼짐'] };
function drawKr() {
  $('#krToggle').textContent = KR[S.kr || 'show'][0];
  $('#krToggle').title = KR[S.kr || 'show'][1];
}
$('#krToggle').onclick = () => {
  S.kr = { show: 'hide', hide: 'off', off: 'show' }[S.kr || 'show'];
  save(); drawKr();
  if (!$('#learn').hidden) drawCard();
};

$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save();
  $('#voice').textContent = S.voice === 'f' ? '여' : '남';
};

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

Promise.all([
  fetch('data/days.json').then(r => r.json()),
  fetch('data/audio_index.json').then(r => r.json())
]).then(([d, a]) => {
  ALL = [...(d.prep || []), ...d.days];
  DRILL = d.tonedrill || [];
  AIDX = a;
  $('#voice').textContent = S.voice === 'f' ? '여' : '남';
  drawKr();
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
