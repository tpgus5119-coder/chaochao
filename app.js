'use strict';

/* ---------- 저장 ---------- */
const KEY = 'vnstudy.v1';
const S = Object.assign({ voice: 'f', done: {}, srs: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'));
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

const DAY = 864e5;
const STEPS = [1, 3, 7, 14];           // 맞히면 이 간격으로 다음 복습
const today = () => Date.now();

/* ---------- 데이터 ---------- */
let DAYS = [], AIDX = {};
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 소리 ---------- */
let audio = null;
function play(text, slow) {
  const h = AIDX[text];
  if (!h) return;
  if (audio) { audio.pause(); }
  audio = new Audio(`audio/${S.voice}/${slow ? 'slow' : 'n'}/${h}.mp3`);
  audio.play().catch(() => { });
}

/* ---------- 화면 전환 ---------- */
const VIEWS = ['home', 'learn', 'quiz', 'mission'];
function show(v, title, canBack) {
  VIEWS.forEach(x => $('#' + x).hidden = x !== v);
  $('#title').textContent = title;
  $('#back').hidden = !canBack;
  window.scrollTo(0, 0);
}

/* ---------- 홈 ---------- */
function dueWords() {
  const n = today();
  return Object.entries(S.srs).filter(([, v]) => v.due <= n).map(([k]) => k);
}

function renderHome() {
  const due = dueWords();
  $('#reviewCard').hidden = due.length === 0;
  $('#reviewCount').textContent = due.length + '개';

  const list = $('#dayList');
  list.textContent = '';
  DAYS.forEach(d => {
    const done = !!S.done[d.day];
    const b = el('button');
    b.dataset.done = done ? '1' : '0';
    b.append(
      el('span', 'num', d.day === 0 ? '준비' : 'Day ' + d.day),
      el('span', 'nm', esc(d.theme)),
      el('span', 'st', done ? '완료 ✔' : (d.words.length ? d.words.length + '단어' : '발음'))
    );
    b.onclick = () => startLearn(d);
    const li = el('li'); li.append(b); list.append(li);
  });
  show('home', '베트남어 스터디', false);
}

/* ---------- 학습 ---------- */
let L = null;   // {day, items, i}

function startLearn(d) {
  const items = [];
  (d.tones || []).forEach(t => items.push({ k: 'tone', d: t }));
  d.words.forEach(w => items.push({ k: 'word', d: w }));
  d.frames.forEach(f => items.push({ k: 'frame', d: f }));
  L = { day: d, items, i: 0 };
  $('#learnIntro').textContent = d.intro || '';
  drawCard();
  show('learn', (d.day === 0 ? '준비' : 'Day ' + d.day) + ' · ' + d.theme, true);
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

function drawCard() {
  const c = $('#card');
  c.textContent = '';
  const it = L.items[L.i];

  if (it.k === 'tone') {
    const t = it.d;
    c.append(el('div', 'vi', esc(t.vi)));
    c.append(el('div', 'tone-shape', esc(t.shape)));
    c.append(soundRow(t.vi, true));
    c.append(el('div', 'ko', esc(t.ko) + ' <span style="color:var(--dim)">· ' + esc(t.mark) + '</span>'));
    c.append(reveal(t.kr_read));
  }

  if (it.k === 'word') {
    const w = it.d;
    c.append(el('div', 'vi', esc(w.vi)));
    c.append(soundRow(w.vi, true));
    c.append(el('div', 'ko', esc(w.ko)));
    if (w.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(w.hanja)));
    c.append(reveal(w.kr_read));
  }

  if (it.k === 'frame') {
    const f = it.d;
    c.append(el('div', 'vi sm', esc(f.vi)));
    c.append(el('div', 'ko', esc(f.ko)));
    const ex = el('div', 'ex');
    f.examples.forEach(s => {
      const b = el('button');
      b.append(el('span', 'exvi', esc(s)), el('span', null, '🔊'));
      b.onclick = () => play(s, false);
      ex.append(b);
    });
    c.append(ex);
  }

  $('#pos').textContent = (L.i + 1) + ' / ' + L.items.length;
  $('#prev').disabled = L.i === 0;
  $('#next').textContent = L.i === L.items.length - 1 ? '확인 문제 ›' : '다음 ›';
}

/* 한글 독음: 기본 숨김. 학습 15일째부터는 아예 안 보여준다 */
function reveal(txt) {
  if (!txt) return el('span');
  const started = S.firstDay || (S.firstDay = today(), save(), S.firstDay);
  if (today() - started > 14 * DAY) return el('span');
  const b = el('button', 'reveal', '한글 발음 보기');
  b.onclick = () => { b.dataset.open = '1'; b.textContent = '[' + txt + '] — 참고용일 뿐, 성조는 담기지 않습니다'; };
  return b;
}

$('#prev').onclick = () => { if (L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  if (L.i < L.items.length - 1) { L.i++; drawCard(); }
  else startQuiz(L.day.words.length ? L.day.words : null, L.day);
};

/* ---------- 퀴즈 ---------- */
let Q = null;   // {list, i, ok, after}

function buildQuestions(words) {
  const pool = DAYS.flatMap(d => d.words);
  const qs = [];
  words.forEach(w => {
    const others = pool.filter(x => x.vi !== w.vi).sort(() => Math.random() - .5).slice(0, 3);
    const mode = Math.random() < .5 && AIDX[w.vi] ? 'listen' : 'meaning';
    const opts = [w, ...others].sort(() => Math.random() - .5);
    qs.push({ w, mode, opts });
  });
  return qs.sort(() => Math.random() - .5);
}

function startQuiz(words, day) {
  const list = buildQuestions(words || dueWords()
    .map(v => DAYS.flatMap(d => d.words).find(w => w.vi === v)).filter(Boolean));
  if (!list.length) { renderHome(); return; }
  Q = { list, i: 0, ok: 0, day };
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
    const b = el('button', 'primary big', '🔊 다시 듣기');
    b.onclick = () => play(q.w.vi, false);
    const wrap = el('div'); wrap.style.textAlign = 'center'; wrap.style.margin = '18px 0 22px';
    wrap.append(b); body.append(wrap);
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
  if (correct) Q.ok++;
  grade(w.vi, correct);
  setTimeout(() => { Q.i++; drawQuiz(); }, correct ? 450 : 1100);
}

/* 간격 반복: 맞히면 1→3→7→14일, 틀리면 1일로 되돌림 */
function grade(vi, ok) {
  const r = S.srs[vi] || { lv: 0 };
  r.lv = ok ? Math.min(r.lv + 1, STEPS.length - 1) : 0;
  r.due = today() + STEPS[r.lv] * DAY;
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
      '틀린 건 내일 다시 나옵니다. 괜찮습니다'));
  const b = el('button', 'primary big', Q.day ? '오늘의 대화 미션 ›' : '홈으로');
  b.style.marginTop = '24px';
  b.onclick = () => Q.day ? showMission(Q.day) : renderHome();
  r.append(b);
  $('#quizBody').textContent = '';
  $('#quizBody').append(r);
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
$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save();
  $('#voice').textContent = S.voice === 'f' ? '여' : '남';
};

Promise.all([
  fetch('data/days.json').then(r => r.json()),
  fetch('data/audio_index.json').then(r => r.json())
]).then(([d, a]) => {
  DAYS = d.days; AIDX = a;
  $('#voice').textContent = S.voice === 'f' ? '여' : '남';
  renderHome();
}).catch(e => {
  $('#title').textContent = '불러오기 실패';
  console.error(e);
});
