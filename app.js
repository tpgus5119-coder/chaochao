'use strict';

/* ---------- 저장 ---------- */
const KEY = 'vnstudy.v2';
const S = Object.assign({ voice: 'f', done: {}, srs: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'));
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

const DAY = 864e5;
const STEPS = [1, 3, 7, 14];
const now = () => Date.now();

/* ---------- 데이터 ---------- */
let ALL = [], AIDX = {}, DRILL = [];
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const label = d => (typeof d.day === 'string' ? '준비 ' + d.day.slice(1) : 'Day ' + d.day);

/* ---------- 소리 ---------- */
let audio = null;
function play(text, slow) {
  const h = AIDX[text];
  if (!h) return;
  if (audio) audio.pause();
  audio = new Audio(`audio/${S.voice}/${slow ? 'slow' : 'n'}/${h}.mp3`);
  audio.play().catch(() => { });
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

/* ---------- 화면 ---------- */
const VIEWS = ['home', 'learn', 'quiz', 'mission', 'tone'];
function show(v, title, canBack) {
  VIEWS.forEach(x => $('#' + x).hidden = x !== v);
  $('#title').textContent = title;
  $('#back').hidden = !canBack;
  window.scrollTo(0, 0);
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
      el('span', 'st', done ? '완료 ✔' : (n ? n + '단어 · 4문장' : '소리 연습'))
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
  (d.sets || []).forEach(set => set.sentences.forEach(x =>
    items.push({ k: 'sent', d: x, set })));
  L = { day: d, items, i: 0 };
  $('#learnIntro').textContent = d.intro || '';
  drawCard();
  show('learn', label(d) + ' · ' + d.theme, true);
}

/* 한글 독음: 기본 숨김. 시작 14일 뒤에는 아예 안 나온다 */
function reveal(txt) {
  if (!txt) return el('span');
  if (!S.firstDay) { S.firstDay = now(); save(); }
  if (now() - S.firstDay > 14 * DAY) return el('span');
  const b = el('button', 'reveal', '한글 발음 보기');
  b.onclick = () => {
    b.dataset.open = '1';
    b.textContent = '[' + txt + '] — 참고용일 뿐, 성조는 담기지 않습니다';
  };
  return b;
}

function drawCard() {
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
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(soundRow(x.vi, true));
    c.append(el('div', 'ko', esc(x.ko)));
    if (x.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(x.hanja)));
    c.append(reveal(x.kr_read));
  }

  if (it.k === 'sent') {
    c.append(el('div', 'setbadge ' + (it.set.kind === '일상' ? 'daily' : 'work'), esc(it.set.title)));
    c.append(el('div', 'vi sm', esc(x.vi)));
    c.append(soundRow(x.vi, true));
    c.append(el('div', 'ko', esc(x.ko)));
    // 단어별 풀이 — 쌩초보에게 통문장은 벽이다
    const g = el('div', 'gloss');
    x.gloss.forEach(p => {
      const cell = el('div', 'gcell');
      cell.append(el('span', 'gw', esc(p.w)), el('span', 'gm', esc(p.m)));
      g.append(cell);
    });
    c.append(g);
    c.append(reveal(x.kr_read));
    // 갈아끼운 문장
    const sw = el('div', 'ex');
    sw.append(el('div', 'exhead', '이렇게도 말합니다'));
    x.swap.forEach(s => {
      const b = el('button');
      b.append(el('span', 'exvi', esc(s)), el('span', null, '🔊'));
      b.onclick = () => play(s, false);
      sw.append(b);
    });
    c.append(sw);
  }

  $('#pos').textContent = (L.i + 1) + ' / ' + L.items.length;
  $('#prev').disabled = L.i === 0;
  const last = L.i === L.items.length - 1;
  $('#next').textContent = last ? ((L.day.words || []).length ? '확인 문제 ›' : '대화 미션 ›') : '다음 ›';
}

$('#prev').onclick = () => { if (L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if ((L.day.words || []).length) startQuiz(L.day.words, L.day);
  else showMission(L.day);
};

/* ---------- 퀴즈 ---------- */
let Q = null;

function buildQuestions(words) {
  const pool = allWords();
  return words.map(w => {
    const others = pool.filter(x => x.vi !== w.vi).sort(() => Math.random() - .5).slice(0, 3);
    return {
      w,
      mode: Math.random() < .5 && AIDX[w.vi] ? 'listen' : 'meaning',
      opts: [w, ...others].sort(() => Math.random() - .5)
    };
  }).sort(() => Math.random() - .5);
}

function startQuiz(words, day) {
  const src = words || dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
  if (!src.length) { renderHome(); return; }
  Q = { list: buildQuestions(src), i: 0, ok: 0, day };
  drawQuiz();
  show('quiz', day ? '확인 문제' : '복습', true);
}

function drawQuiz() {
  const body = $('#quizBody');
  body.textContent = '';
  $('#quizFill').style.width = (Q.i / Q.list.length * 100) + '%';
  if (Q.i >= Q.list.length) return finishQuiz();

  const q = Q.list[Q.i];
  body.append(el('div', 'q', q.mode === 'listen' ? '듣고 고르세요' : '뜻을 고르세요'));

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

function answer(btn, correct, w) {
  [...btn.parentNode.children].forEach(b => b.disabled = true);
  btn.dataset.r = correct ? 'ok' : 'no';
  if (!correct) {
    [...btn.parentNode.children].forEach(b => {
      if (b.textContent === w.vi || b.textContent === w.ko) b.dataset.r = 'ok';
    });
  }
  if (correct) Q.ok++;
  grade(w.vi, correct);
  setTimeout(() => { Q.i++; drawQuiz(); }, correct ? 450 : 1400);
}

function grade(vi, ok) {
  const r = S.srs[vi] || { lv: 0 };
  r.lv = ok ? Math.min(r.lv + 1, STEPS.length - 1) : 0;
  r.due = now() + STEPS[r.lv] * DAY;
  S.srs[vi] = r;
  save();
}

function finishQuiz() {
  $('#quizFill').style.width = '100%';
  const n = Q.ok, t = Q.list.length;
  const r = el('div', 'result');
  r.append(el('div', 'n', n + ' / ' + t));
  r.append(el('div', null, n === t ? '전부 맞혔습니다' :
    n >= t * .7 ? '좋습니다. 틀린 건 내일 다시 나옵니다' :
      '틀린 건 내일 다시 나옵니다. 처음엔 다 그렇습니다'));
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
  const r = el('div', 'result');
  r.append(el('div', 'n', n + ' / ' + t));
  r.append(el('div', null, n >= 7 ? '귀가 트이고 있습니다'
    : n >= 4 ? '보통입니다. 성조는 몇 주 걸립니다'
    : '괜찮습니다. 처음엔 아무도 못 구별합니다'));
  r.append(el('p', 'note', '가장 어려운 건 hỏi(내렸다 올림)와 ngã(끊었다 올림)입니다. 이 둘은 원어민도 지역에 따라 섞어 씁니다.'));
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
  body.append(el('p', 'note', '한 명이 A, 다른 한 명이 B를 맡습니다. 상대 카드는 보지 않습니다. 대화는 단톡방에서 하세요.'));
  const b = el('button', 'primary big', '오늘 완료');
  b.style.marginTop = '20px'; b.style.width = '100%';
  b.onclick = () => { S.done[d.day] = true; save(); renderHome(); };
  body.append(b);
  show('mission', '오늘의 대화 미션', true);
}

/* ---------- 시작 ---------- */
$('#back').onclick = renderHome;
$('#goReview').onclick = () => startQuiz(null, null);
$('#goTone').onclick = startTone;
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
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
