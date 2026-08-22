'use strict';

/* ---------- 저장 ---------- */
const KEY = 'vnstudy.v2';
const S = Object.assign({ voice: 'f', region: 'n', kr: 'show', done: {}, srs: {}, act: {}, stats: {} },
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

/* 단톡방 공유용 키 링크: 주소 뒤 #k=... 를 한 번 읽어 저장하고 지운다.
   #(해시) 부분은 서버로 전송되지 않아 어디에도 기록이 안 남는다. */
if (location.hash === '#admin') {          // 운영자 화면 켜기 (이 폰에만 남는다)
  S.admin = 1;
  localStorage.setItem(KEY, JSON.stringify(S));
  history.replaceState(null, '', location.pathname + location.search);
}
if (location.hash.startsWith('#k=')) {
  S.gkey = decodeURIComponent(location.hash.slice(3));
  save();
  history.replaceState(null, '', location.pathname + location.search);
}

const DAY = 864e5;
const STEPS = [1, 3, 7, 14, 30, 60];   // 일 단위. 반년~1년 기억을 목표로 한 간격
const now = () => Date.now();

/* ---------- 데이터 ---------- */
let ALL = [], AIDX = {}, DRILL = [], VDRILL = [];
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
// 그림: img/ 폴더에 파일이 있으면 그걸, 없으면 이모지를 보여준다 (파일 확인은 브라우저가 알아서)
const pic = (x, cls) => {
  if (!x.emoji && !x.img) return null;
  const d = el('div', cls, esc(x.emoji || ''));
  if (x.img) {
    const im = new Image();
    im.alt = ''; im.src = 'img/' + x.img;
    im.onload = () => { d.textContent = ''; d.append(im); };
  }
  return d;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 번호는 두 과정 다 Day N 으로 통일. 트랙 구분은 앞에 붙는 '일상/직무' 말이 한다.
const label = d => (typeof d.day === 'string' ? '준비 ' + d.day.slice(1)
  : 'Day ' + (d.n || d.day));
const trackName = d => (typeof d.day === 'string' ? '' : d.track === 'work' ? '직무 ' : '일상 ');

/* ---------- 소리 ---------- */
/* 아이폰 사파리는 '사용자가 방금 누른 것'이 아니면 새 Audio 재생을 막는다.
   그래서 Audio 하나를 만들어 두고 주소만 바꿔 쓴다. 한 번 허락되면 그 뒤로는 계속 난다. */
const audio = new Audio();
const myVoice = new Audio();          // 내가 녹음한 것 재생용 (따로 둔다)

/* 지역(북부/남부) × 목소리(여/남) 에 따른 소리 폴더. 남부도 여·남 둘 다 있다. */
const voiceDir = () => S.region === 's' ? (S.voice === 'm' ? 'sm' : 'sf') : S.voice;

function play(text, slow, dir) {
  const h = AIDX[text];
  if (!h) return;
  const d = dir || voiceDir();
  audio.pause();
  audio.onerror = null;
  audio.src = `audio/${d}/${slow ? 'slow' : 'n'}/${h}.mp3`;
  // 남부 파일이 아직 없으면 북부로라도 들려준다
  if (d === 'sf' || d === 'sm') audio.onerror = () => {
    audio.onerror = null;
    audio.src = `audio/${S.voice}/${slow ? 'slow' : 'n'}/${h}.mp3`;
    audio.play().catch(() => { });
  };
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
  const a = el('button', 'ghost', '듣기');
  a.onclick = () => play(text, false);
  row.append(a);
  if (withSlow) {
    const b = el('button', 'ghost', '느리게 듣기');
    b.onclick = () => play(text, true);
    row.append(b);
  }
  return row;
}

/* 정답·오답 소리 — 답한 '즉시' 오는 피드백이 늦게 오는 피드백보다 낫다.
   소리는 짧고 작게(0.2초), 진동은 안드로이드에서만 울린다. */
function fxTone(ok) {
  try {
    const c = getCtx(), t = c.currentTime;
    if (ok) [880, 1318].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.07, t + i * .09);
      g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .12);
      o.connect(g); g.connect(c.destination);
      o.start(t + i * .09); o.stop(t + i * .09 + .13);
    });
    else {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = 196;
      g.gain.setValueAtTime(.06, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + .2);
    }
    navigator.vibrate?.(ok ? 12 : 60);
  } catch (e) { }
}

/* 성조를 화살표로 그린다 — 이름 없이 방향과 끝점만. 화살촉이 소리가 끝나는 곳이다 */
const TARR = {
  'ngang': { d: 'M3 10 L15 10',                     x: 16,   y: 10,   a: 0 },
  'sắc':   { d: 'M4 15.5 L14.5 6.5',                x: 16,   y: 5.2,  a: -40 },
  'huyền': { d: 'M4 4.5 L14.5 13.5',                x: 16,   y: 14.8, a: 40 },
  'hỏi':   { d: 'M4 5 C6.5 15.5, 10.5 16, 14 10.5', x: 15,   y: 9.3,  a: -45 },
  'ngã':   { d: 'M3 15 L8 11 M11 8.2 L14.5 5.4',    x: 15.8, y: 4.4,  a: -38 },
  'nặng':  { d: 'M8.5 4 L12.5 10',                  x: 13.5, y: 11.6, a: 56, dot: [16, 15.5] },
};
function toneArrow(name) {
  const t = TARR[name] || TARR['ngang'];
  return `<svg viewBox="0 0 20 20" class="tarr"><path d="${t.d}"/>` +
    `<g transform="translate(${t.x} ${t.y}) rotate(${t.a})"><path d="M-4.4 -3 L0 0 L-4.4 3"/></g>` +
    (t.dot ? `<circle cx="${t.dot[0]}" cy="${t.dot[1]}" r="1.7"/>` : '') + `</svg>`;
}
/* 단어를 크게 — 글자 위에 성조 화살표를 얹어 한 덩어리로 보여준다.
   전에는 큰 글자와 작은 성조칩이 따로 있어 같은 단어가 두 번 보였다.
   누르면 소리가 난다(버튼을 따로 두지 않는다 — 그림 자리를 벌기 위해). */
function bigWord(vi, tones) {
  const b = el('button', 'bigw');
  b.type = 'button';
  const list = (tones || []).length ? tones : vi.split(' ').map(sy => ({ syl: sy, name: 'ngang' }));
  list.forEach(t => {
    const u = el('span', 'bwsyl ' + t.name);
    u.append(el('b', null, esc(t.syl)), el('i', null, toneArrow(t.name)));
    if (t.ko) u.title = t.name + ' · ' + t.ko;
    b.append(u);
  });
  b.onclick = () => play(vi, false);
  return b;
}
const ICON = {
  slow: '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>',
};
const iconBtn = (kind, title, fn) => {
  const b = el('button', 'ibtn ' + kind, ICON[kind]);
  b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
  b.onclick = fn;
  return b;
};

function toneRow(tones, small) {
  const r = el('div', 'tones' + (small ? ' sm' : ''));
  (tones || []).forEach(t => {
    const b = el('span', 'tchip ' + t.name);
    b.append(el('i', null, esc(t.syl)), el('b', null, toneArrow(t.name)));
    b.title = t.name + ' · ' + t.ko;
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
    audio.src = `audio/${voiceDir()}/n/${h}.mp3`;
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
    btn.textContent = '다시 녹음';
    btn.dataset.on = '0';
    bumpSaid();
    drawCompare(text, box);
  };
  mr.start();
  btn.textContent = '멈추기';
  btn.dataset.on = '1';
  box.textContent = '';
  setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 8000);
}

function drawCompare(text, box) {
  box.textContent = '';
  box.parentElement?.querySelector('.prenat')?.remove();   // 원어민 단독 곡선은 겹쳐 그리기로 대체
  const row = el('div', 'cmp');
  const a = el('button', 'ghost', '원어민');
  a.onclick = () => play(text, false);
  const b = el('button', 'ghost', '내 소리');
  b.onclick = () => {
    if (REC.key === text) playMine();
  };
  const c = el('button', 'ghost', '번갈아 듣기');
  c.onclick = async () => {
    play(text, false);
    await new Promise(r => setTimeout(r, 2200));
    if (REC.key === text) playMine();
  };
  const curve = el('div', 'curvearea');
  row.append(a, b, c);
  if (aiReady()) {                       // AI 받아쓰기: 내 발음이 뭐라고 들리는지
    const ai = el('button', 'ghost', 'AI가 듣기');
    ai.onclick = () => {
      if (REC.key !== text) return;
      ai.disabled = true;
      aiListen(text, REC.url, curve).finally(() => { ai.disabled = false; });
    };
    row.append(ai);
  }
  box.append(row, curve);
  showTone(text, REC.url, curve);        // 녹음이 끝나면 버튼 없이 바로 그린다
}

/* 녹음을 16kHz 모노 WAV 로 바꾼다 — 폰마다 다른 녹음 형식을 AI가 다 읽지는 못해서 */
async function recToWav(blobUrl) {
  const src = await getCtx().decodeAudioData(await (await fetch(blobUrl)).arrayBuffer());
  const off = new OfflineAudioContext(1, Math.ceil(src.duration * 16000), 16000);
  const s = off.createBufferSource(); s.buffer = src; s.connect(off.destination); s.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const w = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const put = (o, t) => [...t].forEach((c, i) => w.setUint8(o + i, c.charCodeAt(0)));
  put(0, 'RIFF'); w.setUint32(4, 36 + pcm.length * 2, true); put(8, 'WAVEfmt ');
  w.setUint32(16, 16, true); w.setUint16(20, 1, true); w.setUint16(22, 1, true);
  w.setUint32(24, 16000, true); w.setUint32(28, 32000, true); w.setUint16(32, 2, true);
  w.setUint16(34, 16, true); put(36, 'data'); w.setUint32(40, pcm.length * 2, true);
  pcm.forEach((v, i) => w.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true));
  const u8 = new Uint8Array(w.buffer);
  let bin = '';
  for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return btoa(bin);
}

/* AI 받아쓰기 판정.
   실험해 보니 AI는 '무슨 음절인지'는 정확히 듣지만 '성조'는 원어민 소리도 틀렸다.
   그래서 성조 채점은 안 시키고, 글자를 알아들을 수 있는 발음인지만 묻는다.
   성조는 위의 높낮이 곡선이 담당한다 — 둘이 합쳐야 온전한 피드백이 된다. */
async function aiListen(text, blobUrl, box) {
  const note = el('div', 'cmpnote ainote', 'AI가 듣는 중…');
  box.querySelector('.ainote')?.remove();
  box.append(note);
  try {
    const b64 = await recToWav(blobUrl);
    const heard = await gCall({
      contents: [{ role: 'user', parts: [
        { text: '이 녹음은 한국인이 베트남어를 읽은 것이다. 들린 그대로 베트남어 철자로 받아 적어라. 철자만 답하고 다른 말은 붙이지 마라.' },
        { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
      generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
    }, i => { note.textContent = `지금 AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
    const clean = x => x.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    const bare = x => stripTone(clean(x));
    const exact = clean(heard) === clean(text);
    const close = bare(heard) === bare(text);
    S.stats.pronAll = (S.stats.pronAll || 0) + 1;
    if (exact || close) S.stats.pronOk = (S.stats.pronOk || 0) + 1;
    save();
    note.innerHTML = (exact
      ? '<b>AI가 정확히 "' + esc(heard) + '" 로 받아 적었습니다.</b> 알아들을 수 있는 발음입니다.'
      : close
        ? '<b>AI가 "' + esc(heard) + '" 로 들었습니다.</b> 글자는 맞게 들립니다 — 성조는 위 곡선으로 확인하세요.'
        : 'AI에게는 "<b>' + esc(heard) + '</b>" 로 들렸습니다 (목표: ' + esc(text) + '). 조금 크게, 또박또박 다시 해 보세요.') +
      '<br><span class="dimtxt">참고용 — AI도 성조 구별은 잘 못합니다.</span>';
  } catch (e) { note.textContent = 'AI 듣기 실패: ' + (e.message || ''); }
}

/* 첫 단어에서 한 번만 — 눌러서 소리 듣는 법을 모르면 이 앱의 절반이 안 보인다 */
function tutorTap() {
  if (S.tut) return;
  S.tut = 1; save();
  popup('<b>글자를 누르면 소리가 납니다</b><br>' +
        '단어도, 아래 예문도 눌러 보세요. 시계 단추는 느리게, 마이크 단추는 따라 말하기입니다.');
}
function popup(html) {
  const back = el('div', 'modalback');
  const box = el('div', 'modalbox');
  box.append(el('div', 'modalb', html));
  const ok = el('button', 'primary big', '알겠어요');
  ok.style.width = '100%';
  ok.onclick = () => back.remove();
  box.append(ok);
  back.append(box);
  back.onclick = e => { if (e.target === back) back.remove(); };
  document.body.append(back);
}

/* 원어민 높낮이 곡선 + 내 녹음 결과 자리. 버튼은 밖에 두고 여기는 그림만 맡는다. */
function curveArea(text, box) {
  const wrap = el('div', 'speak');
  const pre = el('div', 'curvearea prenat');
  nativeCurve(text).then(nat => {
    if (!nat || !nat.curve) return;
    pre.innerHTML = `<div class="curvebox">${curveSvg(null, nat.curve)}</div>` +
      `<div class="curvelegend"><span class="k nat"></span>원어민 소리 높낮이 (느린 발음)</div>`;
  });
  wrap.append(pre, box);
  return wrap;
}

function speakRow(text, withSound) {
  const wrap = el('div', 'speak');
  const row = el('div', 'qplay');
  if (withSound) {
    const s1 = el('button', 'ghost', '듣기'); s1.onclick = () => play(text, false);
    const s2 = el('button', 'ghost', '느리게 듣기'); s2.onclick = () => play(text, true);
    row.append(s1, s2);
  }
  if (!canRecord()) {
    if (withSound) wrap.append(row);
    wrap.append(el('div', 'cmpnote', '소리 내어 따라 말해 보세요. 속으로 읽는 것보다 훨씬 잘 남습니다.'));
    return wrap;
  }
  const box = el('div', 'cmpbox');
  const b = el('button', 'rec', '따라 말하기');
  b.onclick = () => toggleRec(text, b, box);
  row.append(b);
  const pre = el('div', 'curvearea prenat');   // 원어민 높낮이는 묻지 않고 바로 보여준다
  nativeCurve(text).then(nat => {
    if (!nat || !nat.curve) return;
    pre.innerHTML = `<div class="curvebox">${curveSvg(null, nat.curve)}</div>` +
      `<div class="curvelegend"><span class="k nat"></span>원어민 소리 높낮이 (느린 발음)</div>`;
  });
  wrap.append(row, pre, box);
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
  const key = voiceDir() + '|' + text;
  if (nativeCache[key] !== undefined) return nativeCache[key];
  const h = AIDX[text];
  if (!h) return (nativeCache[key] = null);
  try {
    let r = await fetch(`audio/${voiceDir()}/slow/${h}.mp3`);
    if (!r.ok && S.region === 's') r = await fetch(`audio/${S.voice}/slow/${h}.mp3`);
    const c = await PITCH.analyze(await r.arrayBuffer(), getCtx());
    return (nativeCache[key] = c);
  } catch (e) { return (nativeCache[key] = null); }
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
  const DIR = { up: '올라감 ↗', down: '내려감 ↘', dip: '내렸다 올림 ↘↗', flat: '평평함 →' };
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
const VIEWS = ['home', 'learn', 'quiz', 'tone', 'award', 'rules', 'chat', 'type', 'speak', 'course', 'write', 'news', 'wx', 'guide', 'week', 'nick', 'sub', 'club'];
/* 위 북부남부·여남 토글은 소리가 나는 화면에서만 보여준다 — 나머지에선 자리만 차지한다 */
const SNDV = ['learn', 'quiz', 'tone', 'speak', 'type', 'write'];
let CURV = 'home';
const NAV = [];                      // 뒤로가기 발자국 (홈에 오면 비운다)
const dive = fn => { NAV.push(fn); };
function topBtns() {
  const need = SNDV.includes(CURV);
  $('#region').hidden = !need;
  $('#voice').hidden = !need;
}
function show(v, title, canBack) {
  if (v === 'home') NAV.length = 0;
  audio.pause(); myVoice.pause();               // 넘어가면 재생 중이던 소리도 멈춘다
  resetRec();
  VIEWS.forEach(x => $('#' + x).hidden = x !== v);
  $('#title').textContent = title;
  $('#back').hidden = !canBack;
  CURV = v;
  topBtns();
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

const doneCount = () => Object.keys(S.done).filter(k => +k >= 1).length;
const BADGES = [
  // ① 기초 — 시작을 뗐는가
  { icon: '🔤', name: '기본기를 뗐다', how: '모음·자음·성조 + 규칙 4개 모두 완료',
    test: () => ['P1','P2','P3','R1','R2','R3','R4'].every(k => S.done[k]) },
  { icon: '👋', name: '첫 5일',        how: '일상 Day 1~5 완료',             test: () => [1,2,3,4,5].every(k => S.done[k]) },
  { icon: '🏭', name: '출근 첫날',     how: '직무 세트 1개 완료',            test: () => ALL.some(d => d.track === 'work' && S.done[d.day]) },
  // ② 진도 — 얼마나 걸어왔는가
  { icon: '🌓', name: '10세트',        how: '아무 세트나 10개 완료',         test: () => doneCount() >= 10 },
  { icon: '🏔️', name: '25세트',        how: '세트 25개 완료',                test: () => doneCount() >= 25 },
  { icon: '🎖️', name: '50세트',        how: '세트 50개 완료',                test: () => doneCount() >= 50 },
  { icon: '🏁', name: '전 과정 완주',  how: '100세트 전부 완료',             test: () => doneCount() >= 100 },
  // ③ 어휘 — 만난 단어와 실제로 남은 단어
  { icon: '🔠', name: '단어 50',       how: '복습 창고에 단어 50개',         test: () => Object.keys(S.srs).length >= 50 },
  { icon: '💯', name: '단어 100',      how: '복습 창고에 단어 100개',        test: () => Object.keys(S.srs).length >= 100 },
  { icon: '📗', name: '단어 200',      how: '복습 창고에 단어 200개',        test: () => Object.keys(S.srs).length >= 200 },
  { icon: '📚', name: '단어 300',      how: '복습 창고에 단어 300개',        test: () => Object.keys(S.srs).length >= 300 },
  { icon: '📖', name: '단어 450',      how: '복습 창고에 단어 450개',        test: () => Object.keys(S.srs).length >= 450 },
  { icon: '🚀', name: '단어 600',      how: '복습 창고에 단어 600개',        test: () => Object.keys(S.srs).length >= 600 },
  { icon: '🏆', name: '단어 1000',     how: '전 과정 단어 1000개',           test: () => Object.keys(S.srs).length >= 1000 },
  { icon: '🧠', name: '외운 단어 100', how: '간격을 두고 두 번 이상 맞힌 단어 100개',
    test: () => Object.values(S.srs).filter(v => v.lv >= 2).length >= 100 },
  { icon: '🧩', name: '외운 단어 300', how: '간격을 두고 두 번 이상 맞힌 단어 300개',
    test: () => Object.values(S.srs).filter(v => v.lv >= 2).length >= 300 },
  // ④ 훈련 — 귀와 입
  { icon: '👂', name: '성조 8/10',     how: '성조 훈련에서 8점',             test: () => (S.stats.toneBest || 0) >= 8 },
  { icon: '🎯', name: '성조 만점',     how: '성조 훈련에서 10점',            test: () => (S.stats.toneBest || 0) >= 10 },
  { icon: '🗣️', name: '50번 말했다',   how: '소리 내어 50번',                test: () => (S.stats.said || 0) >= 50 },
  { icon: '🎙️', name: '120번 말했다',  how: '소리 내어 120번',               test: () => (S.stats.said || 0) >= 120 },
  { icon: '📢', name: '300번 말했다',  how: '소리 내어 300번',               test: () => (S.stats.said || 0) >= 300 },
  { icon: '🔊', name: '600번 말했다',  how: '소리 내어 600번',               test: () => (S.stats.said || 0) >= 600 },
  { icon: '💬', name: 'AI와 첫 대화',  how: 'AI 대화 한 번 시작',            test: () => (S.stats.chat || 0) >= 1 },
  // ⑤ 꾸준함 — 돌아오는 힘
  { icon: '📅', name: '한 주 5일',     how: '이번 주 5일 공부',              test: () => weekDots().filter(d => d.done).length >= 5 },
  { icon: '🔁', name: '복습 10판',     how: '복습 퀴즈 10번 완료',           test: () => (S.stats.rev || 0) >= 10 },
  { icon: '♻️', name: '복습 30판',     how: '복습 퀴즈 30번 완료',           test: () => (S.stats.rev || 0) >= 30 },
  { icon: '🔄', name: '복습 80판',     how: '복습 퀴즈 80번 완료',           test: () => (S.stats.rev || 0) >= 80 },
  { icon: '📆', name: '10일 출석',     how: '지금까지 총 10일 공부',         test: () => Object.keys(S.act).length >= 10 },
  { icon: '🗓️', name: '30일 출석',     how: '지금까지 총 30일 공부',         test: () => Object.keys(S.act).length >= 30 },
  { icon: '📔', name: '60일 출석',     how: '지금까지 총 60일 공부',         test: () => Object.keys(S.act).length >= 60 },
  { icon: '💎', name: '100일 출석',    how: '지금까지 총 100일 공부',        test: () => Object.keys(S.act).length >= 100 },
];



/* ---------- 실력 분석 ----------
   숫자를 눈에 보이게 그린다. 다만 표본이 적으면 그리지 않는다 —
   10문제로 "약점"을 말하면 그건 분석이 아니라 점(占)이다. */
const NEED = 10;                       // 이만큼 풀어야 판정한다
function bars(rows) {
  const box = el('div', 'bars');
  rows.forEach(([name, pct, n]) => {
    const thin = n < NEED;
    const r = el('div', 'barrow' + (thin ? ' thin' : ''));
    r.append(el('span', 'bname', name));
    const bar = el('span', 'bbar');
    if (!thin) {
      const fill = el('i');
      fill.style.width = Math.max(2, pct) + '%';
      fill.className = pct >= 80 ? 'hi' : pct >= 60 ? 'mid' : 'lo';
      bar.append(fill);
    }
    r.append(bar);
    r.append(el('span', 'bpct', thin ? '—' : pct + '%'));
    r.append(el('span', 'bn', thin ? (NEED - n) + '문제 더' : n + '문제'));
    box.append(r);
  });
  return box;
}
function analysisData(mode) {
  const cur = snapshot(), b = (mode === 'week' && S.wk && S.wk.base) || {};
  const subj = SUBJ.map(x => {
    const n = (cur[x.all] || 0) - (b[x.all] || 0), ok = (cur[x.ok] || 0) - (b[x.ok] || 0);
    return { name: x.k, n, pct: n ? Math.round(ok * 100 / n) : null, tip: x.tip };
  });
  return subj;
}
function renderAnalysis(host, mode) {
  host.textContent = '';
  const tab = el('div', 'rolepick');
  [['week', '이번 주'], ['all', '누적']].forEach(([k, t]) => {
    const bb = el('button', 'ghost sm' + (mode === k ? ' pick' : ''), (mode === k ? '✓ ' : '') + t);
    bb.onclick = () => renderAnalysis(host, k);
    tab.append(bb);
  });
  host.append(el('p', 'anahead', '실력 분석'));
  host.append(tab);

  const subj = analysisData(mode);
  const ok = subj.filter(x => x.n >= NEED);
  host.append(el('p', 'newsday', '과목별 정답률'));
  host.append(bars(subj.map(x => [x.name, x.pct === null ? 0 : x.pct, x.n])));


  const TN = { 'ngang': '평평', 'huyền': '내려감', 'sắc': '올라감',
               'hỏi': '내렸다올림', 'ngã': '끊었다올림', 'nặng': '짧고무겁게' };
  const named = (box, map) => Object.entries(S.stats[box] || {})
    .map(([k, v]) => [(map && map[k]) || k, Math.round(v.ok * 100 / v.all), v.all])
    .sort((a, b) => a[1] - b[1]);
  const tn = named('tn', TN);
  if (tn.length) { host.append(el('p', 'newsday', '성조별 정답률 (누적)')); host.append(bars(tn)); }

  const MD = { listen: '듣고 고르기', read: '읽고 고르기', meaning: '뜻 고르기',
               recall: '떠올려 말하기', dict: '받아쓰기',
               say: '말하기 (AI 채점)', sayself: '말하기 (스스로 매김)',
               type: '타이핑', hand: '손글씨 (스스로 매김)' };
  // 스스로 매긴 것과 AI가 매긴 것을 한 막대에 섞으면 그 막대는 아무것도 뜻하지 않게 된다
  const md = named('md', MD);
  if (md.length) { host.append(el('p', 'newsday', '문제 유형별 정답률 (누적)')); host.append(bars(md)); }

  /* 나머지 갈래는 [자세히] 안에 접어 둔다 — 다 펼치면 화면이 두 배가 되어
     정작 중요한 다섯 과목이 안 보인다. */
  /* 남긴 것은 셋뿐이다 — 재는 대상이 분명하고, 결과가 처방으로 이어지는 것만.
     뺀 것: 시간대별(매일 같은 시간에 해서 비교군이 없다) · 그림 있음/없음과 한자어
     (그림이 붙는 단어는 원래 구체어라 쉽다 — 그림 효과가 아니라 단어 난이도를 잰 것이다)
     · 첫 시도/두 번째(답을 보고 다시 푸는 것이라 높은 게 당연하다). */
  const MORE = [
    ['ltr', null, '어려운 글자가 든 단어', 'ư ơ ă â ê ô đ 가 든 단어만 따로 셉니다'],
    ['sy' + 'l', null, '단어 길이별', '긴 단어에서 떨어지면 소리 덩어리를 아직 못 묶은 것입니다'],
    ['lv', null, '복습 사다리 단계별', '뒷단(30·60일)이 낮으면 간격이 너무 벌어진 것입니다'],
    ['od', null, '얼마나 밀렸을 때 풀었나', '밀릴수록 떨어지는 폭이 곧 밀린 값입니다'],
    ['serr', null, '쓰기 오답의 종류', '성조만 흘렸는지, 글자를 틀렸는지'],
  ];
  const rows = MORE.map(([box, map, title, note]) => [title, note, named(box, map)])
                   .filter(r => r[2].length);
  const more = el('details', 'moreana');
  more.append(el('summary', null, '자세히'));
  const conf = Object.entries(S.stats.conf || {})
    .map(([k, v]) => [k, v.all]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  {
    rows.forEach(([title, note, data]) => {
      more.append(el('p', 'newsday', esc(title)));
      more.append(bars(data));
      more.append(el('p', 'dimtxt', esc(note)));
    });
    if (conf.length) {
      more.append(el('p', 'newsday', '자주 헷갈리는 짝 (귀 훈련)'));
      more.append(el('p', 'dimtxt', conf.map(c => esc(c[0]) + ' ' + c[1] + '번').join('<br>')));
    }
    host.append(more);
  }

  // 처방 — 분석만 하고 끝내지 않는다
  if (ok.length < 2) {
    host.append(el('p', 'note', '두 과목이 10문제를 넘으면 강점·약점과 처방이 나옵니다.'));
    return;
  }
  const worst = ok.reduce((a, x) => x.pct < a.pct ? x : a);
  const best = ok.reduce((a, x) => x.pct > a.pct ? x : a);
  const RX = {
    '암기': ['<b>복습</b>을 하루도 밀리지 마세요 — 밀린 카드가 쌓이면 정답률이 먼저 떨어집니다.',
             '틀린 단어는 그 자리에서 한 번 더 나옵니다. 그때 <b>소리 내어</b> 말하면 다음 판에서 살아납니다.'],
    '읽기': ['글자를 <b>소리로 바꿔 읽는</b> 연습이 모자란 것입니다 — 복습의 [읽기]를 며칠 이어서 해 보세요.',
             '뜻이 안 떠오르면 그 단어의 <b>그림</b>을 한 번 보고 넘어가세요. 그림이 붙은 단어가 더 오래 남습니다.'],
    '듣기': ['기본기의 <b>성조</b>와 <b>모음</b>을 하루 한 판씩. 저녁에 하면 자는 동안 소리가 정리됩니다.',
           '<b>느리게 듣기</b>로 먼저 듣고, 그다음 보통 속도로 한 번 더 들어 보세요.'],
    '쓰기': ['<b>손글씨</b>를 며칠 이어서 해 보세요. 부호 위치는 손으로 써야 붙습니다.',
             '<b>타이핑</b>에서 글자 보기를 누르지 말고 먼저 쳐 보세요 — 보고 치면 기억에 안 남습니다.'],
    '말하기': ['<b>따라 말하기</b>에서 녹음한 뒤 원어민 곡선과 겹쳐 보세요.',
             '<b>AI가 듣기</b>를 눌러 알아듣는 발음인지 확인하세요 — 안 알아들으면 조금 크게, 또박또박.'],
  };
  const card = el('div', 'rulecard');
  card.append(el('div', 'rhead', '<b>이렇게 하면 올라갑니다</b>'));
  const allGood = worst.pct >= 80;
  const lines = [allGood
    ? `<b>모두 좋습니다.</b> 더 올릴 곳 — <b>${esc(worst.name)} ${worst.pct}%</b> (${worst.n}문제)`
    : `<b>약한 곳 — ${esc(worst.name)} ${worst.pct}%</b> (${worst.n}문제)`,
    ...(RX[worst.name] || []).map(t => '· ' + t)];
  const tnOk = tn.filter(t => t[2] >= NEED);        // 열 문제를 넘긴 성조만 말한다
  if (tnOk.length && tnOk[0][1] < 70) lines.push(`· 성조 중에서는 <b>${tnOk[0][0]}</b>이 ${tnOk[0][1]}%로 가장 약합니다 — 기본기 성조에서 그 소리만 골라 들어 보세요.`);
  const miss = Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (miss.length) lines.push('· <b>발목 잡는 단어</b>(두 번 이상 틀린 것) — ' + miss.map(m => esc(m[0])).join(' · ') +
    '<br>&nbsp;&nbsp;이 단어만 따로 소리 내어 다섯 번씩. 맞히기 시작하면 목록에서 서서히 사라집니다.');
  lines.push(`<br><b>잘하는 곳 — ${esc(best.name)} ${best.pct}%</b> · ${esc(best.tip)}`);
  card.append(el('div', 'rbody', lines.join('<br>')));
  host.append(card);
  const dl = el('button', 'ghost', '분석 결과 그림으로 저장');
  dl.style.width = '100%'; dl.style.marginBottom = '14px';
  dl.onclick = () => analysisCard(mode);
  host.append(dl);
}


/* 분석 결과를 그림 한 장으로 — 폰 갤러리에 저장하거나 단톡방에 보낼 수 있다 */
async function analysisCard(mode) {
  const subj = analysisData(mode).filter(x => x.n >= 10);
  const TN = { 'ngang': '평평', 'huyền': '내려감', 'sắc': '올라감',
               'hỏi': '내렸다올림', 'ngã': '끊었다올림', 'nặng': '짧고무겁게' };
  const tn = Object.entries(S.stats.tn || {}).filter(([, v]) => v.all >= 5)
    .map(([k, v]) => [TN[k] || k, Math.round(v.ok * 100 / v.all)]).sort((a, b) => a[1] - b[1]);
  const H = 300 + subj.length * 46 + (tn.length ? 60 + tn.length * 34 : 0);
  const c = document.createElement('canvas');
  c.width = 720; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0f1115'; x.fillRect(0, 0, 720, H);
  x.strokeStyle = '#2a3040'; x.lineWidth = 2; x.strokeRect(20, 20, 680, H - 40);
  x.fillStyle = '#7aa2ff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'left';
  x.fillText('실력 분석', 52, 84);
  x.fillStyle = '#8b93a7'; x.font = '22px sans-serif';
  x.fillText((S.nick ? S.nick + ' · ' : '') + (mode === 'week' ? '이번 주' : '누적') + ' · ' + ymd(), 52, 118);
  let y = 176;
  const drawBars = (title, rows) => {
    x.fillStyle = '#e7ebf4'; x.font = 'bold 24px sans-serif';
    x.fillText(title, 52, y); y += 30;
    rows.forEach(([name, pct]) => {
      x.fillStyle = '#8b93a7'; x.font = '20px sans-serif';
      x.fillText(name, 52, y + 16);
      x.fillStyle = '#1a1f2b'; x.fillRect(210, y, 380, 18);
      x.fillStyle = pct >= 80 ? '#2f9e63' : pct >= 60 ? '#d8a13c' : '#d1555f';
      x.fillRect(210, y, Math.max(6, 380 * pct / 100), 18);
      x.fillStyle = '#e7ebf4'; x.font = 'bold 20px sans-serif';
      x.fillText(pct + '%', 606, y + 16);
      y += 34;
    });
    y += 18;
  };
  drawBars('과목별 정답률', subj.map(v => [v.name, v.pct]));
  if (tn.length) drawBars('성조별 정답률 (누적)', tn);
  if (subj.length) {
    const worst = subj.reduce((a, v) => v.pct < a.pct ? v : a);
    x.fillStyle = '#8b93a7'; x.font = '20px sans-serif';
    x.fillText('가장 약한 곳: ' + worst.name + ' ' + worst.pct + '%', 52, H - 78);
  }
  x.fillStyle = '#5a6273'; x.font = '19px sans-serif';
  x.fillText('짜오짜오 · tpgus5119-coder.github.io/chaochao', 52, H - 44);

  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'chaochao-analysis.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { }
  }
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = 'chaochao-analysis.png'; a.click();
}

/* 자랑 카드 — 내 진행 상황을 그림 한 장으로 만들어 단톡방에 공유한다.
   목표를 남에게 보이면 지속률이 올라간다(공개 선언 효과). 서버 없이 폰 안에서 그린다. */
async function shareCard() {
  const c = document.createElement('canvas');
  c.width = 720; c.height = 900;
  const x = c.getContext('2d');
  x.fillStyle = '#0f1115'; x.fillRect(0, 0, 720, 900);
  x.strokeStyle = '#2a3040'; x.lineWidth = 2; x.strokeRect(24, 24, 672, 852);
  x.textAlign = 'center';
  x.fillStyle = '#7aa2ff'; x.font = 'bold 62px sans-serif';
  x.fillText('짜오짜오', 360, 128);
  x.fillStyle = '#8b93a7'; x.font = '26px sans-serif';
  x.fillText(ymd() + ' · 베트남어 공부 중', 360, 176);
  const dots = weekDots();
  '월화수목금토일'.split('').forEach((lb, i) => {
    const cx = 360 + (i - 3) * 88;
    x.beginPath(); x.arc(cx, 278, 30, 0, 7);
    x.fillStyle = dots[i].done ? '#2f9e63' : '#1a1f2b'; x.fill();
    x.strokeStyle = dots[i].today ? '#7aa2ff' : '#2a3040'; x.lineWidth = 3; x.stroke();
    x.fillStyle = dots[i].done ? '#fff' : '#5a6273'; x.font = '25px sans-serif';
    x.fillText(lb, cx, 287);
  });
  x.fillStyle = '#e7ebf4'; x.font = 'bold 34px sans-serif';
  x.fillText(`이번 주 ${dots.filter(d => d.done).length} / 5일`, 360, 372);
  [['배운 단어', Object.keys(S.srs).length], ['끝낸 세트', doneCount()], ['소리 낸 횟수', S.stats.said || 0]]
    .forEach(([k, v], i) => {
      const cx = 360 + (i - 1) * 212;
      x.fillStyle = '#7aa2ff'; x.font = 'bold 50px sans-serif'; x.fillText(String(v), cx, 490);
      x.fillStyle = '#8b93a7'; x.font = '23px sans-serif'; x.fillText(k, cx, 530);
    });
  const got = BADGES.filter(g => g.test());
  x.fillStyle = '#e7ebf4'; x.font = 'bold 30px sans-serif';
  x.fillText(got.length ? '최근 업적' : '이제 시작했습니다', 360, 630);
  if (got.length) {
    const g = got[got.length - 1];
    x.font = '62px sans-serif'; x.fillText(g.icon, 360, 712);
    x.fillStyle = '#7aa2ff'; x.font = 'bold 32px sans-serif'; x.fillText(g.name, 360, 764);
    x.fillStyle = '#8b93a7'; x.font = '23px sans-serif';
    x.fillText(`업적 ${got.length} / ${BADGES.length}`, 360, 802);
  }
  x.fillStyle = '#5a6273'; x.font = '23px sans-serif';
  x.fillText('tpgus5119-coder.github.io/chaochao', 360, 858);

  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'chaochao-card.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { }
  }
  // 공유 창이 없는 기기: 카드를 띄워서 길게 눌러 저장하게 한다
  $('#awardBody .cardimg')?.remove();
  const im = new Image();
  im.src = c.toDataURL('image/png'); im.className = 'cardimg'; im.alt = '자랑 카드';
  $('#awardBody').prepend(im);
}

/* 업적 전체 화면 — 홈에는 딴 것 몇 개만 보이고, 나머지는 여기서 */
function renderAwards() {
  const b = $('#awardBody');
  b.textContent = '';

  // 지역 설정 — 배치가 정해지면 여기서 바꾼다
  const rg = el('div', 'planrow');
  rg.append(el('span', 'pk', '지역'), el('span', 'pv', S.region === 's' ? '남부 (호찌민)' : '북부 (하노이)'));
  const rb = el('button', 'ghost sm', '바꾸기');
  rb.onclick = () => { S.region = S.region === 's' ? 'n' : 's'; save(); drawRegion(); renderAwards(); };
  rg.append(rb);

  const got = BADGES.filter(x => x.test()).length;
  const nm = el('div', 'planrow');
  nm.append(el('span', 'pk', '이름'), el('span', 'pv', esc(S.nick || '이름없음')));
  const ch = el('button', 'ghost sm', '바꾸기');
  ch.onclick = askNick;
  nm.append(ch);
  const pc = el('div', 'planrow');
  pc.append(el('span', 'pk', '하루'),
             el('span', 'pv', (S.pace || 1) + '세트' + ((S.pace || 1) > 1 ? ' (일상+직무)' : '')));
  const pb = el('button', 'ghost sm', '바꾸기');
  pb.onclick = () => { S.pace = (S.pace || 1) >= 2 ? 1 : 2; save(); renderAwards(); };
  pc.append(pb);
  b.append(nm, rg, pc);
  const ana = el('div');
  renderAnalysis(ana, 'week');
  b.append(ana);
  const rk = el('div', 'rulecard');
  b.append(rk);
  if (S.nick && S.nick !== '이름없음') drawRank(rk);
  else rk.append(el('div', 'rbody', '별명을 정하면 전체 순위가 나옵니다.'));
  b.append(el('p', 'lede', `업적 <b>${got}</b> / ${BADGES.length}`));
  BADGES.forEach(bg => {
    const on = bg.test();
    const row = el('div', 'awrow' + (on ? ' on' : ''));
    row.append(el('span', 'awi', bg.icon),
               el('span', 'awn', esc(bg.name)),
               el('span', 'awh', on ? '달성 ✔' : esc(bg.how)));
    b.append(row);
  });
  if (S.admin) {
    const ad = el('button', 'ghost', '운영 현황 보기');
    ad.style.width = '100%'; ad.style.marginTop = '10px';
    ad.onclick = () => { dive(renderAwards); showAdmin(); };
    b.append(ad);
  }
  const sh = el('button', 'primary big', '자랑 카드 만들기');
  sh.style.width = '100%'; sh.style.marginTop = '16px';
  sh.onclick = shareCard;
  b.append(sh);
  show('award', '내 정보', true);
}

function renderProgress(host) {
  const box = host || $('#progress');
  box.textContent = '';

  const dots = weekDots();
  const n = dots.filter(d => d.done).length;
  const head = el('div', 'phead');
  head.append(el('strong', null, '이번 주 ' + n + '일 공부'));
  if (n >= 5) head.append(el('span', null, '아주 좋습니다 ✔'));
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
  const memo = Object.values(S.srs).filter(v => v.lv >= 2).length;   // 간격을 두고 두 번 맞힌 단어
  const days = Object.keys(S.done).filter(k => +k >= 1).length;
  [['배운 단어', words], ['외운 단어', memo], ['끝낸 세트', days]]
    .forEach(([k, v]) => {
      const c = el('div', 'stat');
      c.append(el('b', null, String(v)), el('span', null, k));
      st.append(c);
    });
  box.append(st);

  // 딴 업적만 몇 개 미리 보여주고, 전체는 업적 화면에서
  const got = BADGES.filter(b => b.test());
  const bd = el('div', 'badges');
  got.slice(-4).forEach(b => {
    const s = el('span', 'badge on');
    s.append(el('i', null, b.icon), el('em', null, b.name));
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



/* ---------- 주간 성적표 ----------
   점수는 지어내지 않는다. 앱이 직접 채점한 것만 센다:
   말하기=AI가 알아들은 비율, 듣기=소리로 가린 정답률, 읽기=글자 보고 뜻,
   쓰기=받아쓰기·타이핑, 암기=전체 인출 정답률.
   문제 수가 적으면(10문제 미만) 판정하지 않는다 — 적은 표본으로 강점·약점을 말하면 거짓이 된다. */
const weekKey = t => { const d = t ? new Date(t) : new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };   // 그 주 월요일
/* 네 가지 힘을 말하기 → 듣기 → 읽기 → 쓰기 순으로 본다(입 → 귀 → 눈 → 손).
   맨 아래 '암기'는 넷을 통틀어 "배운 것이 실제로 남아 있는가"만 따로 센다. */
const SUBJ = [
  { k: '말하기', ok: 'pronOk', all: 'pronAll', tip: '내 발음을 AI가 알아듣는 비율' },
  { k: '듣기', ok: 'earOk', all: 'earAll', tip: '소리만 듣고 뜻·성조를 가리기' },
  { k: '읽기', ok: 'readOk', all: 'readAll', tip: '글자를 보고 뜻을 바로 떠올리기' },
  { k: '쓰기', ok: 'spellOk', all: 'spellAll', tip: '받아쓰기·타이핑으로 철자 맞히기' },
  { k: '암기', ok: 'qOk', all: 'qAll', tip: '배운 것이 얼마나 남아 있는가 (전체 정답률)' },
];
function snapshot() {
  const t = S.stats || {};
  const o = { memo: Object.values(S.srs).filter(v => v.lv >= 2).length,
              days: Object.keys(S.act).length, drill: t.drill || 0,
              sets: Object.keys(S.done).filter(k => +k >= 1).length, said: t.said || 0 };
  SUBJ.forEach(x => { o[x.ok] = t[x.ok] || 0; o[x.all] = t[x.all] || 0; });
  return o;
}
function weekReport(base) {
  const cur = snapshot(), b = base || {};
  const subj = SUBJ.map(x => {
    const n = (cur[x.all] || 0) - (b[x.all] || 0), ok = (cur[x.ok] || 0) - (b[x.ok] || 0);
    return { name: x.k, n, pct: n ? Math.round(ok * 100 / n) : null, tip: x.tip };
  });
  const d = k => (cur[k] || 0) - (b[k] || 0);
  const r = { subj, memo: d('memo'), days: d('days'), sets: d('sets'), said: d('said') };
  r.skill = skillScore();               // 순위와 같은 잣대 — 따로 놀지 않게

  const solved = d('qAll') + d('drill');
  r.solved = solved;
  return r;
}

/* ---------- 실력 점수 ----------
   순위와 실력 분석이 따로 놀면 안 된다. 순위는 분석에서 나와야 한다.
   그래서 점수를 지어내지 않고 **분석이 이미 재고 있는 두 가지만** 쓴다.

     실력 점수 = 외운 단어 수 × 평균 정답률

   뜻이 분명하다 — "믿을 만하게 아는 단어가 몇 개인가".
     · 외운 단어 = 하루 이상 간격을 두고 두 번 이상 맞힌 단어 (앱이 쓰는 '진짜 실력'의 정의)
     · 평균 정답률 = 말하기·듣기·읽기·쓰기·암기 중 **10문제를 넘긴 과목만** 평균
   300단어를 80%로 아는 사람이 240, 100단어를 95%로 아는 사람이 95다.

   뺀 것: 소리 낸 횟수 · 공부한 날 · 푼 문제 수.
   그건 노력이지 실력이 아니고, 노력은 동아리 출석판이 이미 보여준다.
   많이 누른 사람이 이기는 순위는 실력 순위가 아니다.

   과목이 하나도 10문제를 못 넘으면 점수를 내지 않는다(0) — 못 잰 것을 재었다고 하지 않는다. */
function skillScore() {
  const cur = snapshot();
  const done = SUBJ.map(x => [cur[x.all] || 0, cur[x.ok] || 0]).filter(([n]) => n >= NEED);
  if (!done.length) return { score: 0, acc: null, memo: cur.memo, subjects: 0 };
  const acc = Math.round(done.reduce((a, [n, ok]) => a + ok / n, 0) * 100 / done.length);
  return { score: Math.round(cur.memo * acc / 100), acc, memo: cur.memo, subjects: done.length };
}
function showWeek(rep) {
  const b = $('#weekBody');
  b.textContent = '';
  b.append(el('p', 'lede', '지난주 성적표' + (S.nick ? ' — ' + esc(S.nick) : '')));
  const st = el('div', 'stats');
  [['공부한 날', rep.days + '일'], ['끝낸 세트', rep.sets], ['새로 외운 단어', rep.memo], ['소리 낸 횟수', rep.said]]
    .forEach(([k, v]) => { const c = el('div', 'stat');
      c.append(el('b', null, String(v)), el('span', null, k)); st.append(c); });
  b.append(st);

  const ok = rep.subj.filter(x => x.n >= 10);
  rep.subj.forEach(x => {
    const row = el('div', 'subj');
    row.append(el('span', 'sname', x.name));
    const bar = el('span', 'sbar');
    if (x.pct !== null) { const fill = el('i'); fill.style.width = x.pct + '%'; bar.append(fill); }
    row.append(bar);
    row.append(el('span', 'spct', x.pct === null ? '—' : x.pct + '%'));
    row.append(el('span', 'sn', x.n ? x.n + '문제' : '안 함'));
    b.append(row);
  });

  if (ok.length >= 2) {
    const best = ok.reduce((a, x) => x.pct > a.pct ? x : a);
    const worst = ok.reduce((a, x) => x.pct < a.pct ? x : a);
    const c = el('div', 'rulecard');
    c.append(el('div', 'rhead', '<b>이번 주 강점과 약점</b>'));
    c.append(el('div', 'rbody',
      `<b>강점 — ${esc(best.name)} ${best.pct}%</b> · ${esc(best.tip)}<br>` +
      `<b>약점 — ${esc(worst.name)} ${worst.pct}%</b> · ${esc(worst.tip)}<br><br>` +
      (worst.name === '듣기' ? '이번 주는 기본기의 <b>성조·모음</b>을 자기 전에 한 번씩 돌려 보세요. 자는 동안 소리가 정리됩니다.'
       : worst.name === '쓰기' ? '<b>복습 → 쓰기</b>를 며칠 이어서 해 보세요. 부호 위치는 손으로 써야 붙습니다.'
       : worst.name === '말하기' ? '<b>복습 → 말하기</b>를 눌러 보세요. 알아듣는 발음인지가 바로 나옵니다.'
       : worst.name === '읽기' ? '<b>복습 → 읽기</b>를 며칠 이어서. 글자를 보고 뜻이 바로 떠오를 때까지가 목표입니다.'
       : '<b>복습</b>을 밀리지 않게 하는 것이 제일 빠릅니다 — 잊기 직전에 꺼내야 오래 남습니다.')));
    b.append(c);
  } else {
    b.append(el('p', 'note', '아직 문제 수가 적어 강점·약점을 말할 수 없습니다. 한 주만 더 해 보세요 — 과목마다 10문제가 넘으면 판정합니다.'));
  }

  if (S.nick && S.nick !== '이름없음') {
    const box = el('div', 'rulecard');
    b.append(box);
    drawRank(box);
  }

  const go = el('button', 'primary big', '이번 주 시작하기');
  go.style.width = '100%'; go.style.marginTop = '18px';
  go.onclick = () => { S.wk = { k: weekKey(), base: snapshot() }; save(); renderHome(); };
  b.append(go);
  show('week', '주간 성적표', false);
}

/* 닉네임 — 최초 한 번. 서버에 저장되지 않고, 순위에만 쓰인다 */
function askNick() {
  const b = $('#nickBody');
  b.textContent = '';
  b.append(el('p', 'lede', '이름이 뭐예요?'));
  b.append(el('p', 'vi mid', 'Tên bạn là gì?'));
  b.append(el('p', 'note', '언제든 바꿀 수 있습니다.'));
  const inp = el('input', 'keyin'); inp.type = 'text'; inp.placeholder = '별명 (2~10글자)'; inp.maxLength = 10;
  const go = el('button', 'primary big', '시작하기');
  go.style.width = '100%';
  go.onclick = () => {
    const v = inp.value.trim();
    if (v.length < 2) { inp.focus(); return; }
    S.nick = v; S.wk = { k: weekKey(), base: snapshot() }; save();
    renderHome();
  };
  b.append(inp, go);
  // 위쪽 뒤로가기로 그냥 나갈 수 있다. 처음이라 이름이 없으면 '이름없음'으로 두고 나간다.
  const had = !!S.nick;
  dive(() => {
    if (!S.nick) { S.nick = '이름없음'; S.wk = { k: weekKey(), base: snapshot() }; save(); }
    had ? renderAwards() : renderHome();
  });
  show('nick', '이름', true);
}


/* ---------- 홈 메뉴 ----------
   첫 화면은 큰 칸 여덟 개뿐이다. 칸을 누르면 그 안에서 고른다 —
   첫 화면에 버튼이 많을수록 고르는 데 힘이 들고, 결국 아무것도 안 누르게 된다. */
const MENUS = {
  day:   { name: '하루 5분', items: () => [
            ['일상', () => renderDays('daily')], ['직무', () => renderDays('work')],
            ['기사', showNewsLearn]] },
  rev:   { name: '복습', items: () => [
            ['단어', () => reviewMenu('word')], ['문장', () => reviewMenu('sent')]] },
  basic: { name: '기본기', items: () => [
            ['모음', vowelEntry], ['자음', () => { const d = ALL.find(x => x.day === 'P3'); if (d) startLearn(d); }],
            ['성조', toneEntry], ['호칭', () => startRule(0)], ['어순', () => startRule(1)],
            ['단위', () => startRule(2)], ['남부 소리', () => startRule(3)]] },
  gram:  { name: '문법', items: () => GRAMMAR.map((g, i) => [g.title, () => startRule('G' + i)]) },
  ai:    { name: 'AI 선생님', items: () => [
            ['자유 대화', startChat], ['배운 문장으로', startTalk]] },
  club:  { name: '동아리', items: () => [['보기', showClub]] },
  news:  { name: '베트남 소식', items: () => [
            ['기사', showNews], ['날씨', () => showWx()]] },
  guide: { name: '사용법', items: () => [['보기', showGuide]] },
};
function renderMenu(id) {
  const m = MENUS[id];
  const b = $('#subBody');
  b.textContent = '';
  m.items().forEach(([label, fn]) => {
    const btn = el('button', 'bigmenu');
    btn.textContent = label;
    btn.onclick = () => { dive(() => renderMenu(id)); fn(); };
    b.append(btn);
  });
  show('sub', m.name, true);
}
function drawMenu() {
  const box = $('#menu');
  box.textContent = '';
  Object.entries(MENUS).forEach(([id, m]) => {
    const t = el('button', 'mtile');
    t.append(el('b', null, m.name));
    if (id === 'rev') {
      const n = dueWords().length;
      if (n) t.append(el('span', 'mbadge', String(n)));
    }
    t.onclick = () => {
      const items = m.items();
      if (items.length === 1) return items[0][1]();     // 하나뿐이면 바로 연다
      renderMenu(id);
    };
    box.append(t);
  });
}


/* ---------- 홈 ---------- */
const allWords = () => ALL.flatMap(d => d.words || []);
/* 끝낸 세트의 대화 문장 — 복습에서 단어와 같이 다룬다 */
const allSents = () => ALL.flatMap(d => (d.dialog?.lines || []).map(l =>
  ({ vi: l.vi, ko: l.ko, kr_read: l.kr_read, tones: l.tones, sent: true })));
const lessonSents = () => [...(typeof RULES === 'undefined' ? [] : RULES),
                           ...(typeof GRAMMAR === 'undefined' ? [] : GRAMMAR)]
  .flatMap(r => (r.cards || []).map(c => ({ vi: c.vi, ko: c.ko, kr_read: c.kr, tones: c.tones, sent: true })));
const findItem = vi => allWords().find(w => w.vi === vi)
  || allSents().find(x => x.vi === vi) || lessonSents().find(x => x.vi === vi);
/* 오늘 꺼낼 카드 차례. 최근에 배운 것일수록 먼저 — 갓 배운 것이 가장 빨리 샌다.
   다만 오래 밀린 카드도 같이 올라와야 한다(2주까지). 안 그러면 밀린 카드가 영영 뒤에 남는다.
   ±3일 흔들기를 섞어 매번 같은 순서로 나오지 않게 한다. */
function dueWords() {
  const n = now();
  return Object.entries(S.srs).filter(([, v]) => v.due <= n)
    .map(([k, v]) => [k, (v.first || 0) + Math.min(n - v.due, 14 * DAY) + (Math.random() - .5) * 6 * DAY])
    .sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

const GROUPS = [
  // 일상 — 5일 창이 아니라 실제 주제 흐름대로 묶는다
  [d => d.day >= 1 && d.day <= 6, '만나고 헤어지기'],
  [d => d.day >= 7 && d.day <= 10, '숫자 · 시간 · 요일'],
  [d => d.day >= 11 && d.day <= 14, '먹고 사고 길 찾기'],
  [d => d.day >= 15 && d.day <= 17, '가족 · 아플 때 · 부탁'],
  [d => d.day >= 18 && d.day <= 20, '평가와 약속'],
  [d => !d.track && d.day >= 41 && d.day <= 45, '날씨 · 교통 · 기분'],
  [d => !d.track && d.day >= 46 && d.day <= 50, '베트남 생활'],
  [d => !d.track && d.day >= 71 && d.day <= 75, '스몰토크'],
  [d => !d.track && d.day >= 76, '동네 생활 (카페 · 주문 · 심부름)'],
  // 직무 — 취업 여정 순서: 기초(공통) → 업종 기초 → 회사 생활 → 관리자 말 → 심화 → 출하
  [d => d.track === 'work' && d.day <= 40 && d.cat === '공통', '공장 기초 (공통)'],
  [d => d.track === 'work' && d.day <= 40, '봉제 기초'],
  [d => d.track === 'work' && d.day >= 51 && d.day <= 55, '전자·디스플레이 기초'],
  [d => d.track === 'work' && d.day >= 56 && d.day <= 60, '사무·서비스 (시티잡)'],
  [d => d.track === 'work' && d.day >= 61 && d.day <= 65, '직장 문화 (공통)'],
  [d => d.track === 'work' && d.day >= 66 && d.day <= 70, '계약·행정 (공통)'],
  [d => d.track === 'work' && d.day >= 81 && d.day <= 85, '관리자 화법 (공통)'],
  [d => d.track === 'work' && d.day >= 86 && d.day <= 90, '봉제 심화'],
  [d => d.track === 'work' && d.day >= 91 && d.day <= 95, '전자 심화'],
  [d => d.track === 'work', '창고·물류 (공통)']
];

/* 내 업종이 아닌 직무 묶음은 가릴 수 있다 — 가린 것은 목록·일정·추천에서 빠진다 */
const hiddenCats = () => S.hide || [];
const visibleDay = d => !(d.track === 'work' && hiddenCats().includes(d.cat));

/* 앞으로 할 세트 n개 — 일상·직무를 번갈아. 기본기(모음·성조 등)는 일정에 안 넣는다(각자 알아서).
   '하루 몇 세트'를 2로 올리면 오늘 두 개, 내일 두 개가 잡힌다. */
function upcoming(n) {
  const daily = ALL.filter(d => typeof d.day === 'number' && !d.track && !S.done[d.day]);
  const work = ALL.filter(d => d.track === 'work' && !S.done[d.day] && visibleDay(d));
  let nd = ALL.filter(d => typeof d.day === 'number' && !d.track && S.done[d.day]).length;
  let nw = ALL.filter(d => d.track === 'work' && S.done[d.day]).length;
  const out = [];
  let i = 0, j = 0;
  while (out.length < n && (i < daily.length || j < work.length)) {
    const useDaily = j >= work.length || (i < daily.length && nd <= nw);
    if (useDaily) { out.push(daily[i++]); nd++; } else { out.push(work[j++]); nw++; }
  }
  return out;
}
const nextDay = () => upcoming(1)[0] || null;

function renderHome() {
  drawMenu();
  renderProgress($('#progress'));      // 이번 주 도장·통계·업적 (첫 화면 일정판 아래)
  const nx = nextDay();
  const due = dueWords();

  // 오늘·내일 일정판 — 뭘 하게 될지 미리 보이고, 버튼 하나로 바로 들어간다
  const plan = $('#plan');
  plan.textContent = '';
  // 행 자체를 누르면 바로 실행된다
  const prow = (k, v, state, fn) => {
    const r = el('div', 'plancell ' + state + (fn ? ' go' : ''));
    r.append(el('span', 'pk', k), el('span', 'pv', esc(v)));
    if (fn) r.onclick = fn;
    plan.append(r);
  };
  const todayCnt = Object.entries(S.done)
    .filter(([k, v]) => +k >= 1 && typeof v === 'number' && ymd(v) === ymd()).length;
  const pace = S.pace || 1;                       // 하루에 몇 세트 할 것인가 (내 정보에서 바꾼다)
  const left = Math.max(0, pace - todayCnt);      // 오늘 남은 세트
  const doneToday = left === 0;
  const queue = upcoming(left + pace);            // 오늘 남은 것 + 내일 것
  const nm = d => trackName(d) + label(d);
  // 오늘 학습
  if (doneToday) prow('오늘 학습', pace > 1 ? todayCnt + '세트 완료' : '완료', 'done', null);
  else if (queue.length) {
    const t = queue.slice(0, left);
    prow('오늘 학습', t.map(nm).join(' · ') + (t.length > 1 ? '' : '\n' + t[0].theme),
         'todo', () => startLearn(t[0]));
  } else prow('오늘 학습', '전 과정 완료', 'none', null);
  // 오늘 복습 — 문장도 같이 나오므로 뭉뚱그려 '단어'라고 하지 않는다
  const dueW = due.map(findItem).filter(Boolean);
  const ns = dueW.filter(x => x.sent).length, nw = dueW.length - ns;
  if (due.length) prow('오늘 복습', ns ? `단어 ${nw} · 문장 ${ns}` : '단어 ' + nw + '개',
                       'todo', () => reviewStart());
  else prow('오늘 복습', S.revDay === ymd() ? '완료' : '없음', S.revDay === ymd() ? 'done' : 'none', null);
  // 내일 학습 (+예습)
  const tset = queue.slice(left, left + pace);
  if (tset.length) {
    const words = tset.flatMap(d => d.words || []);
    prow('내일 학습', tset.map(nm).join(' · ') + (tset.length > 1 ? '' : '\n' + tset[0].theme),
         'next', words.length ? () => flashRun(words, '예습 · ' + tset.map(nm).join(' · ')) : null);
  } else prow('내일 학습', '없음', 'none', null);
  // 내일 복습 — 내일 새로 나올(만기되는) 카드 수
  const tmr = Object.entries(S.srs).filter(([, v]) => v.due > now() && v.due <= now() + DAY)
    .map(([k]) => findItem(k)).filter(Boolean);
  const ts = tmr.filter(x => x.sent).length, tw = tmr.length - ts;
  prow('내일 복습', !tmr.length ? '없음' : ts ? `단어 ${tw} · 문장 ${ts}` : '단어 ' + tw + '개',
       tmr.length ? 'next' : 'none', null);

  show('home', '짜오짜오', false);
}

/* 학습 과정 목록 — 트랙별로 보여준다 */
function renderDays(track) {
  const nx = nextDay();
  const list = $('#dayList');
  list.textContent = '';
  const days = ALL.filter(d =>
    (track === 'work' ? d.track === 'work'
    : (typeof d.day === 'number' && !d.track)) && visibleDay(d));

  if (track === 'work') {              // 내 업종만 남기기 — 끈 업종은 학습·일정에서도 빠진다
    const li = el('li', 'catpick');
    li.append(el('span', null, '업종 '));
    ['봉제', '전자', '사무'].forEach(c => {
      const on = !hiddenCats().includes(c);
      const bb = el('button', 'ghost sm' + (on ? ' pick' : ''), (on ? '✓ ' : '') + c);
      bb.onclick = () => {
        const h = new Set(hiddenCats());
        on ? h.add(c) : h.delete(c);
        S.hide = [...h]; save();
        renderDays('work');
      };
      li.append(bb);
    });
    list.append(li);
  }
  let g = -1;
  days.forEach(d => {
    const gi = GROUPS.findIndex(([f]) => f(d));
    if (gi !== g) { g = gi; list.append(el('li', 'grp', esc(GROUPS[gi][1]))); }
    const done = !!S.done[d.day];
    const b = el('button');
    b.dataset.done = done ? '1' : '0';
    if (nx && d.day === nx.day && (d.track || '') === (nx.track || '')) b.dataset.next = '1';
    const n = (d.words || []).length;
    const nm = el('span', 'nm', esc(d.theme));
    if (d.cat) nm.append(el('i', 'catchip', esc(d.cat)));
    b.append(
      el('span', 'num', esc(label(d))),
      nm,
      el('span', 'st', done ? '완료 ✔' : n + '단어 + 대화')
    );
    b.onclick = () => { dive(() => renderDays(track)); startLearn(d); };
    const li = el('li'); li.append(b);
    if (done) {                          // 완료 표시는 유저가 되돌릴 수 있다
      const u = el('button', 'ghost sm undo', '미완으로');
      u.onclick = () => { delete S.done[d.day]; save(); renderDays(track); };
      li.append(u);
    }
    list.append(li);
  });
  show('course', track === 'work' ? '직무' : '일상', true);
}

/* ---------- 학습 ---------- */
let L = null;

function startLearn(d) {
  // 순서: 단어 카드 → 확인 문제(암기 다지기) → 오늘의 대화(문장으로 써먹기).
  // 문장이 마무리인 이유: 외운 것을 산출(말하기)로 끝내야 하루가 완성된다.
  const items = [];
  // 설명은 책 표지처럼 맨 앞 한 장으로. 단어 화면에서는 사라져서 그림 자리를 벌어 준다.
  const ci = cultureFor(d);
  if (d.intro) items.push({ k: 'cover', d: { t: label(d) + ' · ' + d.theme, b: d.intro,
                                             cult: ci != null ? CULTURE[ci] : null } });
  (d.letters || []).forEach(x => items.push({ k: 'letter', d: x }));
  (d.tones || []).forEach(x => items.push({ k: 'tone', d: x }));
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  L = { day: d, items, i: 0 };
  drawCard();
  // 제목은 버튼 이름과 같게 — 준비 날들은 주제만 (준비 N 표기는 뺀다)
  show('learn', typeof d.day === 'string' ? d.theme : label(d) + ' · ' + d.theme, true);
}

/* 단어의 예문 — 새로 짓지 않고 그날 대화·바꿔말하기에서 그 단어가 든 문장을 꺼내 쓴다.
   (모든 단어가 그날 문장 어딘가에 나오는 것은 조립 검증기가 보장한다. 음원도 이미 있다.)
   같은 문장이 열 단어에 붙으면 예문이 아니라 배경이 된다. 그래서 세트 안에서
   한 문장은 한 단어에만 준다 — 남는 단어가 없을 때만 다시 쓴다. */
const exNorm = t => t.toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
function exampleMap(day) {
  if (day._exmap) return day._exmap;
  const pool = [
    ...(day.dialog?.lines || []).map(l => ({ vi: l.vi, ko: l.ko, kr: l.kr_read })),
    ...(day.dialog?.extra || []).map(t => typeof t === 'string' ? { vi: t } : { vi: t.vi, ko: t.ko, kr: t.kr_read }),
  ];
  const holds = pool.map(p => ' ' + exNorm(p.vi) + ' ');
  const used = new Set(), map = {};
  const pick = (w, fresh) => {
    const t = ' ' + exNorm(w.vi) + ' ';
    for (let i = 0; i < pool.length; i++)
      if ((!fresh || !used.has(i)) && holds[i].includes(t)) { used.add(i); return pool[i]; }
    return null;
  };
  // 짧은 단어는 여러 문장에 걸리므로, 걸리는 문장이 적은 단어부터 먼저 고르게 한다
  const ws = [...(day.words || [])].sort((a, b) =>
    holds.filter(h => h.includes(' ' + exNorm(a.vi) + ' ')).length -
    holds.filter(h => h.includes(' ' + exNorm(b.vi) + ' ')).length);
  ws.forEach(w => { const h = pick(w, true); if (h) map[w.vi] = h; });
  ws.forEach(w => { if (!map[w.vi]) { const h = pick(w, false); if (h) map[w.vi] = h; } });
  return (day._exmap = map);
}
const exampleFor = (day, w) => exampleMap(day)[w.vi] || null;

/* 한글 독음: 기본 숨김. 시작 14일 뒤에는 아예 안 나온다 */
/* 한글 발음 — 항상 보여준다 (사용자 지시) */
function reveal(txt) {
  return txt ? el('div', 'krline', '[' + esc(txt) + ']') : el('span');
}

/* 예문의 낱말마다 뜻을 붙인다 — 문장만 던져 주면 어느 조각이 어느 뜻인지 알 수가 없다.
   우리가 가르친 1,020개 사전에서 **긴 낱말부터** 맞춘다
   (bao nhiêu 를 bao / nhiêu 로 쪼개면 뜻이 안 나온다).
   그래도 안 잡히는 몇 개만 아래에 따로 적어 둔다. */
const EXTRAG = { 'để': '~하도록·두다', 'dạ': '네 (공손)', 'mắc': '비싸다',
                 'ngàn': '천 (1,000)', 'nhất': '가장', 'bàn': '탁자' };
let GVOC = null;
function glossOf(vi) {
  if (!GVOC) { GVOC = {}; allWords().forEach(w => { const k = w.vi.toLowerCase();
                                                    if (!GVOC[k]) GVOC[k] = w.ko; }); }
  const toks = vi.replace(/[,.!?;:]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length;) {
    let hit = null;
    for (let n = 3; n >= 1 && !hit; n--) {
      if (i + n > toks.length) continue;
      const ph = toks.slice(i, i + n).join(' ').toLowerCase();
      const m = GVOC[ph] || EXTRAG[ph];
      if (m) hit = { w: toks.slice(i, i + n).join(' '), m, n };
    }
    if (hit) { out.push(hit); i += hit.n; }
    else { out.push({ w: toks[i], m: null, n: 1 }); i += 1; }
  }
  return out.filter(x => x.m);
}
/* 낱말 뜻 줄 — 대화 화면의 gloss 와 같은 차림새 */
function glossRow(vi) {
  const list = glossOf(vi);
  if (!list.length) return null;
  const g = el('div', 'gloss');
  list.forEach(x => {
    const cell = el('div', 'gcell');
    cell.append(el('span', 'gtop').appendChild(el('span', 'gw', esc(x.w))).parentNode,
                el('span', 'gm', esc(x.m)));
    g.append(cell);
  });
  return g;
}

function drawCard() {
  resetRec();
  const c = $('#card');
  c.textContent = '';
  const it = L.items[L.i], x = it.d;

  if (it.k === 'cover') {
    c.append(el('div', 'covert', esc(x.t)));
    c.append(el('div', 'coverb', x.b));       // 우리가 쓴 글이라 굵게 표시를 살린다
    if (x.src) {                              // 기사 세트 — 원문으로 가는 길
      const a = el('a', 'srclink', '원문 기사 보기 ›');
      a.href = x.src; a.target = '_blank'; a.rel = 'noopener';
      c.append(a);
    }
    if (x.cult) {                             // 이 주제에 붙는 베트남 문화 한 조각
      const k = el('div', 'cultbox');
      k.append(el('div', 'cultt', x.cult.e + ' ' + esc(x.cult.t)));
      k.append(el('div', 'cultb', x.cult.b));
      c.append(k);
    }
  }

  if (it.k === 'letter') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'ko', esc(x.ko)));   // ko에 발음이 이미 있어 따로 안 겹쳐 쓴다
    c.append(el('div', 'exline', '예: <b>' + esc(x.ex) + '</b> — ' + esc(x.ex_ko)));
    // 소리는 글자가 아니라 예시 단어를 읽는다 — 버튼에 그걸 밝힌다
    const row = el('div', 'sound');
    const a = el('button', 'ghost', esc(x.ex) + ' 듣기'); a.onclick = () => play(x.ex, false);
    const b2 = el('button', 'ghost', '느리게'); b2.onclick = () => play(x.ex, true);
    row.append(a, b2); c.append(row);
    c.append(speakRow(x.ex));               // 준비 단계부터 따라 말하기 + 곡선 비교
  }

  if (it.k === 'tone') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'tone-shape', toneArrow(x.mark)));
    c.append(reveal(x.kr_read));
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(speakRow(x.vi, true));         // 듣기·느리게 + 따라 말하기 + 곡선 비교
  }

  if (it.k === 'cult') {
    c.append(el('div', 'cultemo', esc(x.e)));
    c.append(el('div', 'ko', esc(x.t)));
    c.append(el('div', 'rulenote', x.b));
  }

  if (it.k === 'rule') {
    // 규칙 예문 — 단어 카드와 같은 차림새 + 규칙 설명 한 줄
    const row = el('div', 'wrow');
    row.append(bigWord(x.vi, x.tones));
    if (x.kr) row.append(el('span', 'wkr', '[' + esc(x.kr) + ']'));
    row.append(iconBtn('slow', '느리게 듣기', () => play(x.vi, true)));
    const rbox = el('div', 'cmpbox');
    if (canRecord()) {
      const mic = iconBtn('mic', '따라 말하기', null);
      mic.onclick = () => toggleRec(x.vi, mic, rbox);
      row.append(mic);
    }
    c.append(row);
    c.append(el('div', 'ko', esc(x.ko)));
    const gr = glossRow(x.vi); if (gr) c.append(gr);      // 낱말마다 뜻
    c.append(el('div', 'rulenote', esc(x.note)));
    if (L.day.day === 'R4') {          // 남부 소리 수업은 카드에서 바로 남북을 맞대 듣는다
      const cmp = el('div', 'sound');
      const bn = el('button', 'ghost', '북부 소리');
      bn.onclick = () => play(x.vi, false, S.voice);
      const bs = el('button', 'ghost', '남부 소리');
      bs.onclick = () => play(x.vi, false, 'sf');
      cmp.append(bn, bs);
      c.append(cmp);
    }
    c.append(curveArea(x.vi, rbox));
  }

  if (it.k === 'word') {
    // 그림을 크게 두려고 글자 요소를 줄였다.
    // 그림 → [단어 · 발음 · 느리게 · 마이크] → 뜻 → 예문(누르면 소리) → 원어민 곡선
    const p = pic(x, 'pic big'); if (p) c.append(p);
    const row = el('div', 'wrow');
    row.append(bigWord(x.vi, x.tones));
    if (x.kr_read) row.append(el('span', 'wkr', '[' + esc(x.kr_read) + ']'));
    row.append(iconBtn('slow', '느리게 듣기', () => play(x.vi, true)));
    const box = el('div', 'cmpbox');
    if (canRecord()) {
      const mic = iconBtn('mic', '따라 말하기', null);
      mic.onclick = () => toggleRec(x.vi, mic, box);
      row.append(mic);
    }
    c.append(row);
    c.append(el('div', 'ko', esc(x.ko)));
    if (x.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(x.hanja)));
    if (x.south) c.append(el('div', 'south', '남부에서는 ' + esc(x.south)));
    const exm = exampleFor(L.day, x);
    if (exm) {
      const eb = el('button', 'wex');
      eb.type = 'button';
      const top = el('div', 'wextop');
      top.append(el('span', 'wexvi', esc(exm.vi)));
      if (exm.kr) top.append(el('span', 'wexkr', '[' + esc(exm.kr) + ']'));
      eb.append(top);
      if (exm.ko) eb.append(el('div', 'wexko', esc(exm.ko)));
      eb.onclick = () => play(exm.vi, false);
      c.append(eb);
    }
    c.append(curveArea(x.vi, box));
    tutorTap();
  }

  if (it.k === 'dialog') {
    c.classList.add('wide');
    c.append(el('div', 'setbadge daily', '오늘의 대화 · ' + esc(x.title)));
    const p = pic(x, 'pic'); if (p) c.append(p);
    const lineEls = [];
    const all = el('button', 'primary', '▶ 대화 전체 듣기');
    all.onclick = () => playSeq(x.lines.map(l => l.vi), lineEls);
    c.append(all);

    x.lines.forEach(l => {
      const row = el('div', 'line ' + (l.who === 'A' ? 'a' : 'b'));
      const head = el('div', 'lhead');
      head.append(el('span', 'who', l.who));
      const bt = el('button', 'ghost', '듣기');
      bt.onclick = () => play(l.vi, false);
      const bs = el('button', 'ghost', '느리게');
      bs.onclick = () => play(l.vi, true);
      head.append(bt, bs);
      row.append(head);
      row.append(el('div', 'lvi', esc(l.vi)));
      row.append(reveal(l.kr_read));
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
          const ch = el('span', 'gt ' + t.name, toneArrow(t.name));
          ch.title = t.name + ' · ' + t.ko;
          top.append(ch);
        }
        cell.append(top, el('span', 'gm', esc(pp.m)));
        g.append(cell);
      });
      row.append(g);
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
        b.append(L2, el('span', 'exspk', '듣기'));
        b.onclick = () => play(o.vi, false);
        sw.append(b);
      });
      c.append(sw);
    }
  } else {
    c.classList.remove('wide');
  }

  // '1 / 12'만 보면 외울 게 12개인 줄 안다. 무엇을 세는지 붙여준다.
  const KIND = { letter: '글자', tone: '성조', word: '단어', dialog: '대화', rule: '예문', cult: '문화' };
  // 표지는 세는 대상에서 빼야 '단어 1 / 10'이 맞는다
  const kinds = L.items.map(x => x.k);
  if (it.k === 'cover') {
    $('#pos').textContent = '';
  } else if (it.k === 'dialog') {
    $('#pos').textContent = '오늘의 대화';
  } else {
    const same = kinds.filter(k => k === it.k).length;
    const nth = kinds.slice(0, L.i + 1).filter(k => k === it.k).length;
    $('#pos').textContent = `${KIND[it.k] || ''} ${nth} / ${same}`;
  }
  $('#prev').disabled = L.i === 0;
  const last = L.i === L.items.length - 1;
  $('#next').textContent = last ? (L.cult ? '다 봤어요' : (L.day.words || []).length ? '확인 문제 ›'
    : L.day.rule ? '연습 문제 ›'
    : L.day.day === 'P1' || L.day.day === 'P2' ? '귀로 구별하기 ›' : '완료 ›') : '다음 ›';
}

$('#prev').onclick = () => { if (!$('#learn').hidden && L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  // 연타 방지는 시간이 아니라 '아직 이 화면에 있는가'로 판단한다.
  // 시간으로 막으면 앞 화면에서 막 넘어온 사람까지 막힌다.
  if ($('#learn').hidden) return;
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if (L.cult) { renderHome(); return; }
  if (L.news) {                        // 기사 세트 — 대화 두 줄을 보고 끝. 채점도 복습도 없다
    if (!L.dlg && L.day.dialog) { L.items = [{ k: 'dialog', d: L.day.dialog }]; L.i = 0; L.dlg = true;
                                  drawCard(); show('learn', L.day.theme, true); return; }
    renderHome(); return;
  }
  if (L.dlg) {                         // 대화(써먹기)까지 끝나면 오늘 완료
    S.done[L.day.day] = now();
    (L.day.dialog?.lines || []).forEach(l => {          // 그날 문장도 복습 창고로
      if (!S.srs[l.vi]) S.srs[l.vi] = { lv: 0, first: now(), due: now() + STEPS[0] * DAY };
    });
    touchToday(); save();
    finishDay(L.day);
    return;
  }
  if ((L.day.words || []).length) { startQuiz(L.day.words, L.day); return; }
  if (L.day.rule) {                    // 규칙 카드가 끝나면 연습 문제로
    RL = { r: L.day.rule, i: 0, ok: 0 };
    drawRule();
    show('rules', L.day.rule.title, true);
    return;
  }
  S.done[L.day.day] = now(); touchToday(); save();
  // 소개가 끝나면 바로 귀 훈련으로 이어진다 — 배우기와 시험하기가 한 흐름
  if (L.day.day === 'P1') startVowel();
  else if (L.day.day === 'P2') startTone();
  else renderHome();
};

/* ---------- 훑기 엔진 (예습·간략 복습) ----------
   카드가 소리와 함께 저절로 넘어간다 — 인출이 없어 외우는 효과는 약하지만,
   내일 것을 미리 눈에 발라두거나(예습) 바쁜 날 밀린 카드를 훑는(간략) 용도.
   카드를 누르면 바로 다음으로 넘어간다. */
let FL = null;
function flashRun(words, title) {
  const ws = (words || []).filter(w => AIDX[w.vi]);
  if (!ws.length) return;
  FL = { list: ws, i: 0 };
  show('quiz', title, true);
  drawFlash();
}
function drawFlash() {
  const b = $('#quizBody');
  b.textContent = '';
  audio.onended = null;
  if (!FL || FL.i >= FL.list.length) {
    $('#quizFill').style.width = '100%';
    const r = el('div', 'result');
    r.append(el('div', 'n', (FL ? FL.list.length : 0) + '개'));
    r.append(el('div', null, '눈과 귀로 훑었습니다 — 외우는 건 퀴즈가 합니다'));
    const hm = el('button', 'primary big', '홈으로');
    hm.style.marginTop = '20px'; hm.onclick = renderHome;
    r.append(hm); b.append(r);
    touchToday();
    return;
  }
  $('#quizFill').style.width = (FL.i / FL.list.length * 100) + '%';
  const w = FL.list[FL.i];
  const c = el('div', 'card');
  const p = pic(w, 'pic'); if (p) c.append(p);
  c.append(el('div', 'vi', esc(w.vi)));
  c.append(toneRow(w.tones));
  c.append(reveal(w.kr_read));
  c.append(el('div', 'ko', esc(w.ko)));
  b.append(c);
  const dots = el('div', 'fldots');
  FL.list.forEach((_, i) => dots.append(el('i', i === FL.i ? 'on' : null)));
  b.append(dots);
  b.append(el('p', 'note', '옆으로 밀면 앞뒤로 넘어갑니다. 그냥 두면 3초마다 저절로 넘어갑니다.'));
  let moved = false;
  const go = (step) => {
    if (moved || $('#quiz').hidden || !FL) return;
    moved = true; clearTimeout(tm); audio.onended = null;
    FL.i = Math.max(0, FL.i + (step === undefined ? 1 : step)); drawFlash();
  };
  // 릴스처럼 — 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
  let x0 = null;
  c.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  c.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    else go(1);
  }, { passive: true });
  audio.pause();
  audio.src = `audio/${voiceDir()}/n/${AIDX[w.vi]}.mp3`;
  audio.currentTime = 0;
  audio.play().catch(() => { });
  const tm = setTimeout(go, 3000);       // 한 장에 3초 — 소리가 끝나도 남은 시간은 눈으로 본다
  c.onclick = go;                        // 급하면 눌러서 바로 다음
}

/* 확인 문제 뒤의 마무리 — 오늘 배운 문장을 실제로 써먹는다 */
function startDialog(d) {
  L = { day: d, items: [{ k: 'dialog', d: d.dialog }], i: 0, dlg: true };
  drawCard();
  show('learn', label(d) + ' · 문장으로 써먹기', true);
}
function finishDay(d) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '100%';
  const r = el('div', 'result perfect');
  r.append(el('div', 'n', '오늘 완료'));
  r.append(el('div', null, '단어 → 확인 문제 → 문장까지, 한 세트를 다 했습니다'));
  if (aiReady() && d.dialog) {
    const c = el('button', 'primary big', '이 대화로 AI 선생님과 역할극 ›');
    c.style.marginTop = '20px';
    c.onclick = startChat;
    r.append(c);
  }
  const hm = el('button', 'ghost big', '홈으로');
  hm.style.marginTop = '10px';
  hm.onclick = renderHome;
  r.append(hm);
  b.append(r);
  show('quiz', '오늘 완료', true);
}

/* ---------- 퀴즈 ---------- */
let Q = null;

/* 네 가지 힘을 각각 시험한다 — 무엇을 넣고(입력) 무엇을 내놓는가(출력)로 갈린다.
     듣기 = 소리 듣고 → 뜻 고르기        (귀로 알아듣는 힘)
     읽기 = 글자 보고 → 뜻 고르기        (눈으로 알아보는 힘)
     말하기 = 한국어 뜻 보고 → 입으로 말하기 (AI가 받아 적어 채점)
     쓰기 = 소리 듣고 → 자판으로 쓰기     (듣기와 철자를 한 번에)
   고르는 문제는 쉽고, 만들어 내는 문제는 어렵다. 어려운 쪽이 기억에 더 남는다.
   그래서 처음 만난 단어는 듣기·읽기부터, 익숙해질수록 말하기·쓰기가 많아진다. */
const SKILLS = [
  { k: 'say',    name: '말하기', how: '뜻만 보고 베트남어로 말하기 — AI가 듣고 채점' },
  { k: 'listen', name: '듣기', how: '소리 듣고 뜻 고르기' },
  { k: 'read',   name: '읽기', how: '글자 보고 뜻 고르기' },
  { k: 'write',  name: '쓰기', how: '소리 듣고 자판으로 · 가끔 손으로 쓰기' },
];
function pickMode(w, lv) {
  const r = Math.random();
  if (w.sent) return r < .5 ? 'listen' : 'say';          // 문장은 알아듣기와 말하기 위주
  if (lv >= 2) return r < .35 ? 'say' : r < .52 ? 'type' : r < .60 ? 'hand' : r < .80 ? 'listen' : 'read';
  if (lv >= 1) return r < .22 ? 'say' : r < .45 ? 'type' : r < .75 ? 'listen' : 'read';
  return r < .55 ? 'listen' : 'read';
}
function buildQuestions(words, forced) {
  const pool = allWords();
  // 오답 보기는 같은 종류에서 고른다 — 문장 문제에 단어 뜻을 섞으면
  // 길이만 보고 정답을 찍을 수 있어 문제가 문제 구실을 못 한다.
  const spool = [...allSents(), ...lessonSents()];
  return words.map(w => {
    const lv = (S.srs[w.vi] || {}).lv || 0;
    let mode = forced === 'write' ? (!w.sent && Math.random() < .35 ? 'hand' : 'type')
             : forced || pickMode(w, lv);
    if ((mode === 'listen' || mode === 'type') && !AIDX[w.vi]) mode = 'read';   // 소리가 없으면 눈으로
    let src = w.sent ? spool : pool;
    if (src.length < 4) src = [...src, ...(w.sent ? pool : spool)];             // 모자라면 채운다
    const seen = new Set([w.vi]);
    const others = src.filter(x => !seen.has(x.vi) && seen.add(x.vi))
      .sort(() => Math.random() - .5).slice(0, 3);
    return { w, mode, opts: [w, ...others].sort(() => Math.random() - .5) };
  }).sort(() => Math.random() - .5);
}

const REV_CHUNK = 20;                          // 복습 한 판의 최대 문제 수
function startQuiz(words, day, cap, early, opt) {
  const o = opt || {};
  let src = words || dueWords().map(findItem).filter(Boolean);
  if (o.kind === 'word') src = src.filter(x => !x.sent);
  if (o.kind === 'sent') src = src.filter(x => x.sent);
  if (!src.length) { noItems(o); return; }
  if (!day) src = src.slice(0, cap || REV_CHUNK);   // 복습은 20개씩 끊어 낸다
  const list = buildQuestions(src, o.skill);
  Q = { list, i: 0, ok: 0, day, total: list.length, early, opt: o };
  drawQuiz();
  const nm = (o.kind === 'sent' ? '문장' : o.kind === 'word' ? '단어' : '') +
             (o.skill ? ' ' + (SKILLS.find(x => x.k === o.skill) || {}).name : '');
  show('quiz', day ? '확인 문제' : (nm.trim() || (cap ? '3분 복습' : '복습')), true);
}
function noItems(o) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  b.append(el('p', 'lede', (o && o.kind === 'sent' ? '문장' : '단어') + ' 복습이 아직 없습니다'));
  b.append(el('p', 'note', o && o.kind === 'sent'
    ? '하루 학습을 끝내면 그날 대화 문장이 복습 창고에 들어옵니다.'
    : '오늘은 꺼낼 단어가 없습니다. 없는 날은 정상입니다.'));
  const h = el('button', 'primary big', '홈으로');
  h.style.width = '100%'; h.onclick = renderHome;
  b.append(h);
  show('quiz', '복습', true);
}

/* 복습 고르기 — 단어냐 문장이냐, 그리고 네 가지 힘 중 무엇이냐 */
function reviewMenu(kind) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  const due = dueWords().map(findItem).filter(Boolean).filter(x => kind === 'sent' ? x.sent : !x.sent);
  b.append(el('p', 'lede', (kind === 'sent' ? '문장' : '단어') + ' 복습 — ' + due.length + '개 대기'));
  const back = () => reviewMenu(kind);
  const all = el('button', 'bigmenu', '랜덤');
  all.onclick = () => { dive(back); startQuiz(null, null, null, false, { kind }); };
  b.append(all);
  SKILLS.forEach(sk => {
    const btn = el('button', 'bigmenu', esc(sk.name));
    btn.onclick = () => { dive(back); startQuiz(null, null, null, false, { kind, skill: sk.k }); };
    b.append(btn);
  });
  const quick = el('button', 'bigmenu', '3분');
  quick.onclick = () => { dive(back); flashRun(due.slice(0, 20), (kind === 'sent' ? '문장' : '단어') + ' 3분'); };
  b.append(quick);
  show('quiz', (kind === 'sent' ? '문장' : '단어') + ' 복습', true);
}

/* 복습 입구 — 처음이거나 꺼낼 카드가 없으면 방식부터 설명한다.
   전에는 카드가 없으면 말없이 홈으로 돌아가서 버튼이 죽은 것처럼 보였다.
   설명은 홈의 [방식] 버튼으로 언제든 다시 볼 수 있다. */
function reviewStart(cap) {
  const due = dueWords().map(findItem).filter(Boolean);
  if (S.revSeen && due.length) { startQuiz(due, null, cap); return; }
  drawRevInfo(cap);
}
function drawRevInfo(cap) {
  const due = dueWords().map(findItem).filter(Boolean);
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  const c = el('div', 'rulecard');
  c.append(el('div', 'rhead', '<span class="ri">🔁</span><b>복습은 이렇게 돌아갑니다</b>'));
  c.append(el('div', 'rbody',
    '학습에서 만난 단어는 전부 복습 창고에 들어갑니다. 문제를 <b>맞힐 때마다</b> 그 단어는 더 나중에 나옵니다 — ' +
    '<b>1일 → 3일 → 7일 → 14일 → 30일 → 60일</b>. 틀리면 두 계단 내려와 곧 다시 나옵니다.<br><br>' +
    '잊어버리기 <b>직전에</b> 꺼내 보는 것이 기억을 가장 오래 남깁니다(간격 반복 — 기억 연구에서 가장 근거가 단단한 방법입니다). ' +
    '그래서 복습할 카드가 <b>있는 날도, 없는 날도</b> 있습니다. 없는 날은 정상입니다.<br><br>' +
    '<b>[랜덤]</b>이 곧 공부법 책들이 말하는 그 복습입니다 — 간격 반복 + 직접 떠올리기 + 즉시 피드백. ' +
    '<b>[말하기·듣기·읽기·쓰기]</b>는 같은 단어를 한 가지 방식으로만 몰아서 볼 때, ' +
    '<b>[3분]</b>은 바쁜 날 훑고 지나갈 때 씁니다(자동 넘김이라 효과는 약합니다).'));
  b.append(c);

  const learned = Object.keys(S.srs).length;
  const st = el('p', 'note');
  if (due.length) st.innerHTML = `오늘 꺼낼 카드: <b>${due.length}장</b> · 창고에 ${learned}단어`;
  else if (learned) {
    const soon = Object.values(S.srs).map(v => v.due).filter(d => d > now()).sort((x, y) => x - y)[0];
    st.innerHTML = `지금은 꺼낼 카드가 없습니다 (창고에 ${learned}단어).` +
      (soon ? ` 다음 카드는 <b>${Math.max(1, Math.round((soon - now()) / DAY))}일 뒤</b>에 나옵니다.` : '');
  } else st.textContent = '아직 배운 단어가 없습니다. 먼저 오늘 학습을 시작해 보세요.';
  b.append(st);

  const go = el('button', 'primary big');
  go.style.width = '100%';
  if (due.length) {
    go.textContent = '복습 시작 (' + due.length + '장)';
    go.onclick = () => { S.revSeen = 1; save(); startQuiz(due, null, cap); };
  } else if (learned) {
    // 예정보다 일찍 꺼내 보는 건 자유 — 단, 맞혀도 간격은 안 늘어난다 (미리 본 건 인출이 아니라서)
    go.textContent = '그래도 최근 단어 다시 보기';
    go.onclick = () => { S.revSeen = 1; save(); startQuiz(practiceWords(cap || 20), null, null, true); };
  } else {
    const nx = nextDay();
    go.textContent = '오늘 학습 시작';
    go.onclick = () => nx && startLearn(nx);
  }
  b.append(go);
  show('quiz', '복습', true);
}

function drawQuiz() {
  const body = $('#quizBody');
  body.textContent = '';
  $('#quizFill').style.width = (Q.i / Q.list.length * 100) + '%';
  if (Q.i >= Q.list.length) return finishQuiz();

  const q = Q.list[Q.i];
  Q.t0 = Date.now();                                   // 이 문제를 언제 봤는지 (반응 속도)
  const LABEL = { listen: '듣고 뜻을 고르세요', read: '뜻을 고르세요', say: '베트남어로 말해 보세요',
                  type: '듣고 자판으로 쳐 보세요', hand: '듣고 손으로 써 보세요', recall: '소리 내어 말해 보세요',
                  dict: '듣고 글자를 만들어 보세요' };
  body.append(el('div', 'q', LABEL[q.mode]));

  if (q.mode === 'recall') return drawSay(body, q);   // 옛 이름 호환
  if (q.mode === 'say') return drawSay(body, q);
  if (q.mode === 'type') return drawTypeQ(body, q);
  if (q.mode === 'hand') return drawHandQ(body, q);
  if (q.mode === 'dict') return drawDict(body, q);

  if (q.mode === 'listen') {           // 귀로만 — 글자는 답한 뒤에 보여준다
    const wrap = el('div', 'qplay');
    const b = el('button', 'primary big', '듣기');
    b.onclick = () => play(q.w.vi, false);
    const sl = el('button', 'ghost', '느리게 듣기');
    sl.onclick = () => play(q.w.vi, true);
    wrap.append(b, sl);
    body.append(wrap);
    play(q.w.vi, false);
  } else {                             // 눈으로 — 글자를 보여주고 뜻을 고른다
    body.append(el('div', 'qmain' + (q.w.sent ? ' sent' : ''), esc(q.w.vi)));
  }

  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const b = el('button', null, esc(o.ko));      // 보기는 언제나 '뜻' — 무엇을 묻는지가 분명해진다
    b.dataset.vi = o.vi;
    b.onclick = () => answer(b, o.vi === q.w.vi, q.w);
    opts.append(b);
  });
  body.append(opts);
}

/* 오답 뒤에는 스스로 넘긴다 — 틀린 걸 볼 시간이 필요하다. 정답은 자동으로 넘어간다. */
function nextBtn(box, fn) {
  const b = el('button', 'primary big', '다음 ›');
  b.style.width = '100%'; b.style.marginTop = '14px';
  b.onclick = fn;
  box.append(b);
}


/* 받아쓰기 — 소리를 듣고 음절 조각으로 그대로 만든다.
   조각에 '같은 글자, 다른 성조' 미끼를 섞어서 성조까지 들어야 풀리게 한다.
   보고 베끼기는 인출이 없어 효과가 약하다 — 소리→철자 인출이라야 남는다. */
function drawDict(body, q) {
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => play(q.w.vi, false);
  const sl = el('button', 'ghost', '느리게 듣기');
  sl.onclick = () => play(q.w.vi, true);
  wrap.append(b, sl);
  body.append(wrap);
  play(q.w.vi, false);
  body.append(el('div', 'q mid', esc(q.w.ko)));   // 뜻은 보여준다 — 철자와 성조를 시험하는 것이니까

  const syls = q.w.vi.split(' ');
  const MKS = ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323'];
  const pool = [];
  syls.forEach(sy => {
    pool.push(sy);
    const bare = stripTone(sy), pos = tonePos(bare);
    MKS.map(m => withMark(bare, m, pos))
      .filter(v => v !== sy && !syls.includes(v))
      .sort(() => Math.random() - .5).slice(0, 2)
      .forEach(v => pool.push(v));
  });
  pool.sort(() => Math.random() - .5);

  const picked = [], used = [];
  const ans = el('div', 'dictans');
  const draw = () => { ans.textContent = picked.length ? picked.join(' ') : '· · ·'; };
  draw();
  const tiles = el('div', 'dicttiles');
  pool.forEach(sy => {
    const t = el('button', 'tile', esc(sy));
    t.onclick = () => { t.disabled = true; picked.push(sy); used.push(t); draw(); };
    tiles.append(t);
  });
  const undo = el('button', 'ghost', '⌫ 지우기');
  undo.onclick = () => { if (!picked.length) return; picked.pop(); used.pop().disabled = false; draw(); };
  const chk = el('button', 'primary', '확인');
  chk.onclick = () => {
    if (!picked.length) return;
    const good = picked.join(' ').toLowerCase() === q.w.vi.toLowerCase();
    markSpeed(good, 'dict');
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    if (!good) bump('serr', bare(picked.join(' ')) === bare(q.w.vi) ? '성조만 틀림' : '글자를 틀림', false);
    fxTone(good);
    chk.disabled = undo.disabled = true;
    [...tiles.children].forEach(t => t.disabled = true);
    ans.dataset.r = good ? 'ok' : 'no';
    if (!good) ans.textContent = picked.join(' ') + '  →  ' + q.w.vi;
    if (good) Q.ok++; else requeue(Q.list[Q.i]);
    grade(q.w.vi, good, Q.early);
    if (good) setTimeout(() => { Q.i++; drawQuiz(); }, 600);
    else nextBtn(body, () => { Q.i++; drawQuiz(); });
  };
  const row = el('div', 'qplay'); row.append(undo, chk);
  body.append(ans, tiles, row);
}

/* 입으로 — 듣고 따라 말하고, 원어민 높낮이와 겹쳐 본다 (복습 안에서) */
/* 말하기 — 한국어 뜻만 보고 베트남어로 말한다(가장 어렵고 가장 남는 방식).
   보기도 글자도 주지 않는다: 단서 없이 꺼내야 진짜 기억이 된다. */
function drawSay(body, q) {
  const w = q.w;
  const p = pic(w, 'pic mid'); if (p) body.append(p);
  body.append(el('div', 'qmain' + (w.sent ? ' sent' : ''), esc(w.ko)));
  const jbox = el('div', 'cmpnote judge');
  let done = false;
  const finish = (ok, judged) => {
    if (done) return; done = true;
    markSpeed(ok, judged ? 'say' : 'sayself');
    grade(w.vi, ok, Q.early);
    if (ok) Q.ok++; else requeue(q);
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(w.kr_read));
    const sr = soundRow(w.vi, true); sr.classList.add('mid');
    ans.append(sr);
    body.append(ans);
    nextBtn(body, () => { Q.i++; drawQuiz(); });
  };
  const jb = judgeBtn(w.vi, jbox, finish);
  const row = el('div', 'qplay');
  if (jb) row.append(jb);
  const showA = el('button', jb ? 'ghost' : 'primary big', jb ? '모르겠어요' : '말했어요 · 정답 보기');
  showA.onclick = () => { bumpSaid(); finish(!jb ? true : false, false); };
  row.append(showA);
  body.append(row, jbox);
}

/* 손으로 — 성조 부호까지 써 본다 (복습 안에서) */
function drawHandQ(body, q) {
  const w = q.w;
  body.append(el('div', 'qmain', esc(w.ko)));
  const row = el('div', 'qplay');
  const p1 = el('button', 'ghost', '듣기'); p1.onclick = () => play(w.vi, false);
  row.append(p1); body.append(row);
  const cv = el('canvas', 'wpad');
  cv.width = 640; cv.height = 200;
  const ctx = cv.getContext('2d');
  const paper = () => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#e3e6ec'; ctx.lineWidth = 2;   // 공책처럼 옅은 줄 — 글자 수는 알려주지 않는다
    [70, 130].forEach(y => { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(cv.width - 20, y); ctx.stroke(); });
    ctx.strokeStyle = '#16181d'; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
  };
  paper();
  let drawing = false;
  const pos = e => { const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = e => { drawing = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  cv.onpointermove = e => { if (drawing) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
  body.append(cv);
  const box = el('div', 'cmpbox');
  const tools = el('div', 'qplay');
  const cl = el('button', 'ghost', '지우기'); cl.onclick = paper;
  tools.append(cl);
  if (aiReady()) {
    const ai = el('button', 'ghost', 'AI 선생님 점검');
    ai.onclick = () => { ai.disabled = true; aiRead(w.vi, cv, box).finally(() => { ai.disabled = false; }); };
    tools.append(ai);
  }
  const show = el('button', 'primary', '정답 보기');
  show.onclick = () => {
    show.disabled = true;
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(w.kr_read));
    body.insertBefore(ans, box);
    const g = el('div', 'opts');
    const ok = el('button', null, '✓ 맞게 썼어요');
    ok.onclick = () => { fxTone(true); markSpeed(true, 'hand'); S.stats.spellAll = (S.stats.spellAll || 0) + 1;
      S.stats.spellOk = (S.stats.spellOk || 0) + 1; grade(w.vi, true, Q.early); Q.ok++; Q.i++; drawQuiz(); };
    const no = el('button', null, '✗ 틀렸어요');
    no.onclick = () => { markSpeed(false, 'hand'); S.stats.spellAll = (S.stats.spellAll || 0) + 1;
      grade(w.vi, false); requeue(q); Q.i++; drawQuiz(); };
    g.append(ok, no);
    body.append(g);
  };
  tools.append(show);
  body.append(tools, box);
  play(w.vi, false);
}

/* 자판으로 — 철자와 부호 위치를 정확히 (복습 안에서) */
function drawTypeQ(body, q) {
  const w = q.w;
  body.append(el('div', 'qmain', esc(w.ko)));
  const row = el('div', 'qplay');
  const p1 = el('button', 'ghost', '듣기'); p1.onclick = () => play(w.vi, false);
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  row.append(p1, p2); body.append(row);
  play(w.vi, false);
  let txt = '';
  const out = el('div', 'dictans');
  const draw = () => { out.textContent = txt || '· · ·'; };
  draw(); body.append(out);
  const kb = el('div', 'vkb');
  const key = (label, fn, cls) => { const k = el('button', 'vk' + (cls ? ' ' + cls : ''), label); k.onclick = fn; return k; };
  const add = ch => { txt += ch; draw(); };
  ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m', 'ă â ê ô ơ ư đ'].forEach(r => {
    const rw = el('div', 'vkrow');
    r.split(' ').forEach(ch => rw.append(key(ch, () => add(ch))));
    kb.append(rw);
  });
  const trow = el('div', 'vkrow');
  [['ngang', ''], ['huyền', '\u0300'], ['sắc', '\u0301'], ['hỏi', '\u0309'], ['ngã', '\u0303'], ['nặng', '\u0323']]
    .forEach(([name, mk]) => trow.append(key(toneArrow(name), () => {
      const parts = txt.split(' '); const last = parts.pop();
      if (!last) return;
      const bare = stripTone(last);
      parts.push(mk ? withMark(bare, mk, tonePos(bare)) : bare);
      txt = parts.join(' '); draw();
    }, 'tonek ' + name)));
  kb.append(trow);
  const brow = el('div', 'vkrow');
  brow.append(key('띄어쓰기', () => add(' '), 'wide'),
              key('⌫', () => { txt = txt.slice(0, -1); draw(); }, 'wide'),
              key('확인', () => {
                if (!txt.trim()) return;
                const good = txt.trim().toLowerCase() === w.vi.toLowerCase();
                markSpeed(good, 'type');
                fxTone(good);
                S.stats.spellAll = (S.stats.spellAll || 0) + 1;
                if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
                if (!good) bump('serr', bare(txt) === bare(w.vi) ? '성조만 틀림' : '글자를 틀림', false);
                out.dataset.r = good ? 'ok' : 'no';
                if (!good) out.textContent = txt.trim() + '  →  ' + w.vi;
                grade(w.vi, good, Q.early);
                if (good) { Q.ok++; setTimeout(() => { Q.i++; drawQuiz(); }, 700); }
                else { requeue(q); nextBtn(body, () => { Q.i++; drawQuiz(); }); }
              }, 'go wide'));
  kb.append(brow);
  body.append(kb);
}


/* 말한 것을 AI가 받아 적어 맞는지 본다.
   성조는 채점하지 않는다(AI도 성조는 틀린다). 글자가 맞으면 정답으로 친다 —
   "알아들을 수 있게 말했는가"가 이 단계의 목표다. */
function judgeBtn(target, box, onDone) {
  if (!canRecord() || !aiReady()) return null;
  const b = el('button', 'rec', '🎤 말하고 채점받기');
  b.onclick = async () => {
    if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
    try {
      if (!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { box.textContent = '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.'; return; }
    const chunks = [];
    const mr = new MediaRecorder(REC.stream);
    REC.mr = mr; REC.key = target;
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      releaseMic();
      b.textContent = '🎤 말하고 채점받기';
      const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
      if (REC.url) URL.revokeObjectURL(REC.url);
      REC.url = url;
      box.textContent = 'AI가 듣는 중…';
      bumpSaid();
      try {
        const b64 = await recToWav(url);
        const heard = await gCall({
          contents: [{ role: 'user', parts: [
            { text: '이 녹음은 한국인이 베트남어를 읽은 것이다. 들린 그대로 베트남어 철자로 받아 적어라. 철자만 답하고 다른 말은 붙이지 마라.' },
            { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
          generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
        }, i => { box.textContent = `AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
        const clean = x => x.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
        const bare = x => stripTone(clean(x));
        const exact = clean(heard) === clean(target);
        const close = bare(heard) === bare(target);
        S.stats.pronAll = (S.stats.pronAll || 0) + 1;
        if (exact || close) S.stats.pronOk = (S.stats.pronOk || 0) + 1;
        save();
        box.innerHTML = exact
          ? '<b class="okmsg">정확합니다 — AI가 "' + esc(heard) + '"로 받아 적었습니다.</b>'
          : close
            ? '<b class="okmsg">알아들었습니다 — "' + esc(heard) + '".</b> 성조는 아래 곡선으로 확인하세요.'
            : '<b class="nomsg">AI에게는 "' + esc(heard) + '"로 들렸습니다.</b> 목표는 <b>' + esc(target) + '</b> — 조금 크게, 또박또박 다시 해 보세요.';
        fxTone(exact || close);
        onDone && onDone(exact || close, true);   // AI가 매긴 것임을 알린다
      } catch (e) { box.textContent = 'AI 듣기 실패: ' + (e.message || ''); }
    };
    mr.start();
    b.textContent = '■ 멈추기';
    setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 8000);
  };
  return b;
}

/* 회상형 — 보기를 주지 않고 직접 떠올려 소리 내게 한다.
   4지선다는 아는 것처럼 보이게 만든다(실제보다 20% 과대평가). 회상이 진짜다.
   게다가 소리 내어 말하므로 산출 효과까지 같이 얻는다. 채점은 본인이 한다. */
function drawRecall(body, q) {
  body.append(el('div', 'qmain', esc(q.w.ko)));
  { const p = pic(q.w, 'pic mid'); if (p) body.append(p); }

  const hint = el('p', 'cmpnote', '베트남어로 <b>입 밖에 내어</b> 말해 보세요. 속으로만 생각하면 효과가 절반입니다.');
  body.append(hint);

  const jbox = el('div', 'cmpnote judge');
  const jb = judgeBtn(q.w.vi, jbox, ok => {
    grade(q.w.vi, ok, Q.early);
    if (ok) Q.ok++; else requeue(q);
    nextBtn(body, () => { Q.i++; drawQuiz(); });
  });
  if (jb) { const row = el('div', 'qplay'); row.append(jb); body.append(row, jbox); }

  const show = el('button', 'primary big', jb ? '모르겠어요 · 정답 보기' : '말했어요 · 정답 보기');
  show.style.width = '100%';
  body.append(show);

  show.onclick = () => {
    bumpSaid();                      // 소리 내어 말했다고 스스로 누른 순간
    show.remove(); hint.remove();
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(q.w.vi)));
    ans.append(toneRow(q.w.tones));
    ans.append(reveal(q.w.kr_read));
    const sr = soundRow(q.w.vi, true);
    sr.classList.add('mid');
    ans.append(sr);
    body.append(ans);

    const grade2 = el('div', 'opts');
    const ok = el('button', null, '✓ 맞았어요');
    ok.onclick = () => { fxTone(true); markSpeed(true, 'sayself'); grade(q.w.vi, true, Q.early); Q.ok++; Q.i++; drawQuiz(); };
    const no = el('button', null, '✗ 못 맞혔어요');
    no.onclick = () => { markSpeed(false, 'sayself'); grade(q.w.vi, false); requeue(q); Q.i++; drawQuiz(); };
    grade2.append(ok, no);
    body.append(grade2);
  };
}

function answer(btn, correct, w) {
  const md = Q.list[Q.i].mode;
  markSpeed(correct, md);
  // 눈으로 푼 것은 읽기, 귀로 푼 것은 듣기로 센다 (전에는 둘 다 '암기'에만 쌓였다)
  const bx = md === 'read' ? 'read' : md === 'listen' ? 'ear' : null;
  if (bx) { S.stats[bx + 'All'] = (S.stats[bx + 'All'] || 0) + 1;
            if (correct) S.stats[bx + 'Ok'] = (S.stats[bx + 'Ok'] || 0) + 1; }
  [...btn.parentNode.children].forEach(b => b.disabled = true);
  btn.dataset.r = correct ? 'ok' : 'no';
  fxTone(correct);
  if (!correct) {
    [...btn.parentNode.children].forEach(b => {
      if (b.dataset.vi === w.vi || b.textContent === w.ko) b.dataset.r = 'ok';
    });
  }
  if (correct) Q.ok++;
  else requeue(Q.list[Q.i]);        // 틀린 건 이번 판 끝에 한 번 더
  grade(w.vi, correct, Q.early);
  // 답한 뒤에는 글자·성조·발음·뜻을 한 번에 보여준다 (맞았든 틀렸든)
  const ans = el('div', 'ansbox');
  ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(w.kr_read),
             el('div', 'ko', esc(w.ko)));
  btn.parentNode.after(ans);
  if (correct) setTimeout(() => { Q.i++; drawQuiz(); }, 450);
  else nextBtn($('#quizBody'), () => { Q.i++; drawQuiz(); });
}

/* 틀린 문제를 같은 판 뒤쪽에 한 번만 다시 넣는다.
   틀린 채로 끝내면 그 기억이 남는다. 맞히고 끝내야 한다. */
/* 얼마나 빨리 답했나 — 정답만 센다(틀린 건 고민 시간이 뒤섞인다).
   정답률이 같아도 느리면 아직 '자동'이 안 된 것이다. */
function markSpeed(ok, mode) {
  bump('md', mode, ok);
  if (!ok || !Q.t0) return;
  const ms = Date.now() - Q.t0;
  if (ms < 500 || ms > 20000) return;                  // 튀는 값은 버린다
  S.stats.ms = (S.stats.ms || 0) + ms;
  S.stats.msN = (S.stats.msN || 0) + 1;
}

function requeue(q) {
  if (q.retry) return;                          // 두 번은 안 미룬다
  Q.list.push({ ...q, retry: true });
}

/* 어떤 성조에서 자주 틀리는지 — 단어의 첫 음절 성조로 센다 */
const toneOfWord = vi => {
  const w = allWords().find(x => x.vi === vi);
  return (w && (w.tones || [])[0] || {}).name || null;
};
function bump(box, key, ok) {
  if (!key) return;
  const b = S.stats[box] || (S.stats[box] = {});
  const c = b[key] || (b[key] = { ok: 0, all: 0 });
  c.all++; if (ok) c.ok++;
}
/* 채점은 잘게 나눌수록 분석이 깊어진다. 다만 한 문제에 조회는 한 번만 한다 —
   allWords()가 1000개짜리 배열을 훑기 때문에 문제마다 여러 번 부르면 폰이 느려진다. */
const HARDLTR = ['ư', 'ơ', 'ă', 'â', 'ê', 'ô', 'đ'];
/* 성조 부호만 뗀 모양. "성조만 틀렸나 글자를 틀렸나"를 가르는 데 쓴다 */
const bare = t => t.trim().toLowerCase().split(/\s+/).map(stripTone).join(' ');
function grade(vi, ok, early) {
  touchToday();
  // 암기 점수용 계수기 — 인출 시도와 성공을 센다
  S.stats.qAll = (S.stats.qAll || 0) + 1;
  if (ok) S.stats.qOk = (S.stats.qOk || 0) + 1;

  const w = allWords().find(x => x.vi === vi);
  bump('tn', (w && (w.tones || [])[0] || {}).name || null, ok);          // 성조별
  const syl = vi.trim().split(/\s+/).length;
  bump('syl', syl === 1 ? '1음절' : syl === 2 ? '2음절' : '3음절+', ok);   // 길이별
  if (HARDLTR.some(c => vi.includes(c))) bump('ltr', '어려운 모음·đ', ok); // ư ơ ă â ê ô đ 가 든 단어
  const r0 = S.srs[vi];
  if (!early && r0) {
    bump('lv', '사다리 ' + (r0.lv || 0) + '단', ok);                      // 복습 단계별
    const od = r0.due ? now() - r0.due : -1;
    if (od >= 0) bump('od', od < DAY ? '제때' : od < 4 * DAY ? '1~3일 밀림'
                          : od < 8 * DAY ? '4~7일 밀림' : '8일 넘게 밀림', ok);
  }
  if (!ok) {                                          // 자주 틀리는 단어
    const m = S.stats.miss || (S.stats.miss = {});
    m[vi] = (m[vi] || 0) + 1;
  } else if (S.stats.miss && S.stats.miss[vi]) {
    S.stats.miss[vi] = Math.max(0, S.stats.miss[vi] - 0.5);   // 맞히면 서서히 지워진다
  }
  if (early && ok) { save(); return; }   // 예정보다 일찍 꺼내 맞힌 건 사다리를 안 올린다
  const r = S.srs[vi] || { lv: 0, first: now() };
  if (!r.first) r.first = now();
  r.lv = ok ? Math.min(r.lv + 1, STEPS.length - 1) : Math.max(0, r.lv - 2);
  r.due = now() + STEPS[r.lv] * DAY;
  S.srs[vi] = r;
  save();
}

function finishQuiz() {
  $('#quizFill').style.width = '100%';
  if (!Q.day) {
    S.stats.rev = (S.stats.rev || 0) + 1;                          // 복습 판 수 (업적용)
    if (!Q.early) S.revDay = ymd();                                // 오늘 복습을 끝냈다는 도장
    save();
  }
  const n = Q.ok, t = Q.total;
  const again = Q.list.length - Q.total;
  const r = el('div', 'result');
  if (n === t && t > 0) {          // 다 맞힌 날은 축하가 있어야 한다
    r.classList.add('perfect');
    const cf = el('div', 'confetti');
    for (let i = 0; i < 14; i++) { const s = el('i'); s.style.setProperty('--i', i); cf.append(s); }
    r.append(cf);
    fxTone(true);
  }
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
  const left = Q.day ? 0 : dueWords().length;
  if (left) {
    const more = el('button', 'primary big', '이어서 ' + Math.min(left, REV_CHUNK) + '개 더');
    more.style.marginTop = '20px'; more.style.width = '100%';
    more.onclick = () => startQuiz(null, null);
    r.append(more);
    r.append(el('p', 'note', '남은 복습 ' + left + '개. 지금 끝내도 됩니다 — 답한 단어는 이미 저장됐습니다.'));
  }
  const hasDlg = Q.day && Q.day.dialog;
  const b = el('button', 'primary big', hasDlg ? '문장으로 써먹기 ›' : Q.day ? '오늘 완료' : '홈으로');
  b.style.marginTop = '24px';
  b.onclick = () => {
    if (hasDlg) { startDialog(Q.day); return; }
    if (Q.day) { S.done[Q.day.day] = now(); touchToday(); save(); }
    renderHome();
  };
  r.append(b);
  $('#quizBody').textContent = '';
  $('#quizBody').append(r);
}


/* ---------- 성조 훈련 (미니멀 페어) ----------
   성조만 다르고 나머지는 같은 단어를 소리로만 구별시킨다.
   시판 앱 대부분이 빠뜨린 부분이고, 성조 습득 연구가 가리키는 표준 훈련법이다. */
let T = null;

/* 모음 구별 듣기 — 한국인이 가장 오래 헷갈리는 o/ô/ơ · u/ư · a/ă 를 귀로 가른다 */
let VD = null;
function startVowel() {
  const qs = [];
  VDRILL.forEach(g => g.items.forEach(it => qs.push({ g, it })));
  VD = { list: qs.sort(() => Math.random() - .5).slice(0, 10), i: 0, ok: 0 };
  drawVowel();
  show('tone', '모음', true);
}
function drawVowel() {
  const body = $('#toneBody');
  body.textContent = '';
  if (VD.i >= VD.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', VD.ok + ' / ' + VD.list.length));
    r.append(el('div', null, VD.ok >= 7 ? '모음이 귀에 들어오고 있습니다' : '괜찮습니다. u와 ư는 원래 오래 걸립니다'));
    const b2 = el('button', 'primary big', '다시 하기'); b2.style.marginTop = '16px'; b2.onclick = startVowel;
    const h2 = el('button', 'ghost big', '홈으로'); h2.style.marginLeft = '8px'; h2.onclick = renderHome;
    r.append(b2, h2); body.append(r); return;
  }
  const { g, it } = VD.list[VD.i];
  if (VD.i === 0) {
    body.append(el('div', 'intro',
      "글자는 아는데 소리가 다른 모음들입니다. o 입 크게 '오' · ô 오므린 '오' · ơ '어' · ư 입 벌린 '으' — 귀에만 익히면 됩니다."));
    const rb = el('button', 'ghost sm', '모음 소개 다시 보기');
    rb.onclick = () => startLearn(ALL.find(d => d.day === 'P1'));
    body.append(rb);
  }
  body.append(el('div', 'q', `${VD.i + 1} / ${VD.list.length} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', esc(g.note)));
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기'); b.onclick = () => play(it.vi, false);
  const sl = el('button', 'ghost', '느리게 듣기'); sl.onclick = () => play(it.vi, true);
  wrap.append(b, sl); body.append(wrap);
  play(it.vi, false);
  const opts = el('div', 'opts tonelist');
  g.items.forEach(o => {
    const btn = el('button');
    btn.append(el('span', 'tvi', esc(o.vi)), el('span', 'tko', esc(o.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = o.vi === it.vi;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.querySelector('.tvi').textContent === it.vi) x.dataset.r = 'ok';
      });
      S.stats.earAll = (S.stats.earAll || 0) + 1;
      S.stats.drill = (S.stats.drill || 0) + 1;
      if (good) S.stats.earOk = (S.stats.earOk || 0) + 1;
      else bump('conf', it.vi + ' → ' + o.vi, false);   // 무엇을 무엇으로 잘못 들었나
      save();
      if (good) { VD.ok++; setTimeout(() => { VD.i++; drawVowel(); }, 500); }
      else nextBtn(body, () => { VD.i++; drawVowel(); });
    };
    opts.append(btn);
  });
  body.append(opts);
}

/* 성조는 버튼 하나 — 처음이면 소개 카드(준비 2)부터, 그 뒤로는 바로 훈련 */
function toneEntry() {
  const p2 = ALL.find(d => d.day === 'P2');
  if (p2 && !S.done['P2']) { startLearn(p2); return; }
  startTone();
}

/* 모음도 버튼 하나 — 처음이면 모음 카드(준비 1)부터, 그 뒤로는 바로 구별 훈련.
   자음은 카드만 있고 '구별 훈련'이 없는 것은 의도다: 북부 표준에서
   tr=ch, s=x, d=gi=r이 같은 소리로 합쳐져 귀로 가르는 훈련이 성립하지 않는다. */
function vowelEntry() {
  const p1 = ALL.find(d => d.day === 'P1');
  if (p1 && !S.done['P1']) { startLearn(p1); return; }
  startVowel();
}

/* 한 세션 = 듣고 구별 6문제 + 들은 소리에 부호 붙이기 4문제 (같은 귀의 두 얼굴) */
function startTone() {
  const qs = [];
  DRILL.forEach(g => g.items.forEach(it => qs.push({ kind: 'pair', g, it })));
  const pairs = qs.sort(() => Math.random() - .5).slice(0, 6);
  const marks = markPool().sort(() => Math.random() - .5).slice(0, 4)
    .map(w => ({ kind: 'mark', w }));
  T = { list: [...pairs, ...marks].sort(() => Math.random() - .5), i: 0, ok: 0 };
  drawTone();
  show('tone', '성조', true);
}

function drawTone() {
  const body = $('#toneBody');
  body.textContent = '';
  if (T.i >= T.list.length) return finishTone();
  const item = T.list[T.i];
  if (T.i === 0) body.append(el('div', 'intro',
    '같은 글자에 성조만 다른 단어들입니다. 높낮이만 귀로 가립니다 — 부호 붙이기 문제도 섞여 나옵니다.'));
  if (item.kind === 'mark') return drawToneMark(body, item.w);
  const { g, it } = item;

  body.append(el('div', 'q', `${T.i + 1} / ${T.list.length} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', `글자는 모두 <b>${esc(g.base)}</b> 로 같습니다. 성조만 다릅니다.`));

  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => play(it.vi, false, S.voice);
  const sl = el('button', 'ghost', '느리게 듣기');
  sl.onclick = () => play(it.vi, true, S.voice);
  wrap.append(b, sl);
  body.append(wrap);
  play(it.vi, false, S.voice);

  const opts = el('div', 'opts tonelist');
  g.items.forEach(o => {
    const btn = el('button');
    btn.append(el('span', 'tvi', esc(o.vi)),
               el('span', 'tmark', toneArrow(o.mark)),
               el('span', 'tko', esc(o.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = o.vi === it.vi;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.querySelector('.tvi').textContent === it.vi) x.dataset.r = 'ok';
      });
      S.stats.earAll = (S.stats.earAll || 0) + 1;
      S.stats.drill = (S.stats.drill || 0) + 1;
      if (good) S.stats.earOk = (S.stats.earOk || 0) + 1;
      else bump('conf', it.vi + ' → ' + o.vi, false);   // 무엇을 무엇으로 잘못 들었나
      save();
      if (good) { T.ok++; setTimeout(() => { T.i++; drawTone(); }, 500); }
      else nextBtn(body, () => { T.i++; drawTone(); });
    };
    opts.append(btn);
  });
  body.append(opts);
  if (T.i === 0) {
    const rb = el('button', 'ghost sm', '성조 6개 소개 다시 보기');
    rb.style.marginTop = '14px';
    rb.onclick = () => startLearn(ALL.find(d => d.day === 'P2'));
    body.append(rb);
  }
}

/* 배운 단어의 성조 부호 고르기 — 성조 세션의 두 번째 문제 유형 */
function drawToneMark(body, w) {
  const want = w.tones[0].name;
  body.append(el('div', 'q', `${T.i + 1} / ${T.list.length} · 듣고 성조 부호를 고르세요`));
  const bare = stripTone(w.vi);
  const pos = tonePos(w.vi);
  body.append(el('div', 'markbare', esc(bare)));

  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => play(w.vi, false);
  const sl = el('button', 'ghost', '느리게 듣기');
  sl.onclick = () => play(w.vi, true);
  wrap.append(b, sl);
  body.append(wrap);

  const opts = el('div', 'opts markopts');
  MARKS.forEach(mk => {
    const shown = withMark(bare, mk.m, pos);
    const btn = el('button');
    btn.dataset.tone = mk.name;
    btn.append(el('span', 'mkvi', esc(shown)),
               el('span', 'gt ' + mk.name, toneArrow(mk.name)),
               el('span', 'mkko', esc(mk.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = mk.name === want;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.dataset.tone === want) x.dataset.r = 'ok';
      });
      S.stats.earAll = (S.stats.earAll || 0) + 1;
      S.stats.drill = (S.stats.drill || 0) + 1;
      if (good) { T.ok++; S.stats.earOk = (S.stats.earOk || 0) + 1; }
      else bump('conf', want + ' → ' + mk.name, false);
      grade(w.vi, good);
      if (good) setTimeout(() => { T.i++; drawTone(); }, 500);
      else nextBtn(body, () => { T.i++; drawTone(); });
    };
    opts.append(btn);
  });
  body.append(opts);
  play(w.vi, false);
}

function finishTone() {
  const n = T.ok, t = T.list.length;
  if (n > (S.stats.toneBest || 0)) { S.stats.toneBest = n; save(); }
  touchToday();
  const r = el('div', 'result');
  r.append(el('div', 'n', n + ' / ' + t));
  r.append(el('div', null, n >= 7 ? '소리가 들리기 시작했습니다'
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


/* ---------- 성조 부호 도구 ----------
   ă â đ ê ô ơ ư 와 다섯 성조 부호는 로마자를 쓰는 사람에게도 새 글자 모양이라,
   눈으로만 보면 hỏi 와 ngã 가 끝까지 구별되지 않는다.
   부호 문제는 위 성조 세션에 섞여 나온다. */
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

/* 성조 부호는 **모음**에 붙는다. 자음에 붙이면 글자가 깨진다(c̀on ✗ / còn ✓).
   원래 단어에 부호가 있으면 그 자리를 그대로 쓰고,
   없으면(ngang) 베트남어 규칙으로 주모음을 찾는다. */
function tonePos(syl) {
  const d = syl.normalize('NFD');
  const i = d.search(/[\u0300\u0301\u0309\u0303\u0323]/);
  if (i > 0) {
    // 결합 부호를 뺀 글자 수 = NFC 기준 위치
    return [...d.slice(0, i)].filter(ch => !/[\u0300-\u036f]/.test(ch)).length - 1;
  }
  const bare = stripTone(syl);
  const V = [];
  [...bare].forEach((ch, k) => { if (/[aăâeêioôơuưy]/i.test(ch)) V.push(k); });
  if (!V.length) return -1;
  for (const k of V) if (/[ơê]/i.test(bare[k])) return k;   // ơ·ê 가 있으면 무조건 거기
  if (V.length === 1) return V[0];
  const last = V[V.length - 1];
  return last < bare.length - 1 ? last : V[V.length - 2];   // 받침이 있으면 뒤 모음, 없으면 앞 모음
}

function withMark(bare, mark, pos) {
  if (!mark || pos < 0) return bare;
  const a = [...bare];
  a[pos] = (a[pos] + mark).normalize('NFC');
  return a.join('');
}

function markPool() {
  // 배운 단어 위주. 부호 없는(ngang) 단어는 뺀다 — 제시 글자가 곧 답이 되어버린다.
  const learned = new Set();
  for (const d of ALL) {
    (d.words || []).forEach(w => learned.add(w.vi));
    if (typeof d.day === 'number' && !S.done[d.day]) break;
  }
  const ok = w => w.vi.split(' ').length === 1 && (w.tones || [])[0]
    && w.tones[0].name !== 'ngang' && AIDX[w.vi];
  const all = allWords().filter(ok);
  const mine = all.filter(w => learned.has(w.vi));
  return mine.length >= 6 ? mine : all;
}



/* ---------- 규칙 수업 4개 (기초 훈련) ----------
   읽기 자료가 아니라 다른 학습과 같은 카드 수업이다:
   예문 카드(성조 화살표·한글 발음·듣고 따라 말하기) → 연습 문제.
   규칙 설명은 카드마다 한 줄만 — 초급자는 설명보다 예문으로 배운다.
   짧고 기능 부하가 큰 규칙 넷만 다룬다. 그 이상의 문법 수업은 초급에 근거가 얇다. */
const RTONE = { ngang: '평평', 'huyền': '내려감', 'sắc': '올라감',
                'hỏi': '내렸다 올림', 'ngã': '끊었다 올림', 'nặng': '짧고 무겁게' };
const tns = s => s.split(',').map(p => {
  const [syl, name] = p.trim().split(':');
  return { syl, name, ko: RTONE[name] };
});
const RULES = [
  { key: 'R1', title: '호칭',
    intro: '한국어처럼 호칭이 있습니다. 다만 한 걸음 더 — 상대가 바뀌면 "나"를 가리키는 말도 바뀝니다.',
    cards: [
      { vi: 'Em chào anh.', ko: '(손위 남자에게) 안녕하세요', kr: '앰 짜오 아잉',
        tones: tns('Em:ngang, chào:huyền, anh:ngang'), note: '상대가 anh 손위 남자면, 나는 em' },
      { vi: 'Anh chào em.', ko: '(손아래에게) 안녕', kr: '아잉 짜오 앰',
        tones: tns('Anh:ngang, chào:huyền, em:ngang'), note: '상대가 em 손아래면, 이번엔 내가 anh' },
      { vi: 'tôi', ko: '나 (누구에게나)', kr: '또이',
        tones: tns('tôi:ngang'), note: 'tôi 저 — 잘 모르는 상대에게. 실례가 아니다' }],
    quiz: [{ q: '손위 남자에게 인사합니다. "나"는?', opts: ['em', 'anh'], a: 0, say: 'Em chào anh.' },
           { q: '손아래 직원에게 인사합니다. 이번엔 "나"는?', opts: ['anh', 'em'], a: 0, say: 'Anh chào em.' },
           { q: '처음 보는 사람 앞에서 실례 없는 "나"는?', opts: ['tôi', 'em'], a: 0 }] },
  { key: 'R2', title: '어순',
    intro: '꾸미는 말이 뒤에 옵니다. 한국어와 정반대 — 이것 하나만 뒤집으면 문장이 만들어집니다.',
    cards: [
      { vi: 'người tốt', ko: '좋은 사람', kr: '응으어이 똣',
        tones: tns('người:huyền, tốt:sắc'), note: 'người 사람 + tốt 좋은 — 꾸미는 말이 뒤' },
      { vi: 'tên của tôi', ko: '내 이름', kr: '뗀 꾸어 또이',
        tones: tns('tên:ngang, của:hỏi, tôi:ngang'), note: 'tên 이름 + của ~의 + tôi 나' },
      { vi: 'hộp này', ko: '이 상자', kr: '홉 나이',
        tones: tns('hộp:nặng, này:huyền'), note: 'hộp 상자 + này 이' }],
    quiz: [{ q: '"좋은 사람"은?', opts: ['người tốt', 'tốt người'], a: 0, say: 'người tốt' },
           { q: '"내 이름"은?', opts: ['tên của tôi', 'tôi của tên'], a: 0, say: 'tên của tôi' },
           { q: '"이 상자"는?', opts: ['hộp này', 'này hộp'], a: 0, say: 'hộp này' }] },
  { key: 'R3', title: '단위',
    intro: '숫자 뒤에는 단위가 붙습니다. 한국어의 개·마리·대와 같습니다 — 세 개면 초급은 넘어갑니다.',
    cards: [
      { vi: 'hai cái', ko: '두 개 (물건)', kr: '하이 까이',
        tones: tns('hai:ngang, cái:sắc'), note: 'cái 물건' },
      { vi: 'ba con', ko: '세 마리 (동물)', kr: '바 껀',
        tones: tns('ba:ngang, con:ngang'), note: 'con 동물' },
      { vi: 'một chiếc', ko: '한 대 (기계·탈것)', kr: '못 찌엑',
        tones: tns('một:nặng, chiếc:sắc'), note: 'chiếc 기계·탈것' }],
    quiz: [{ q: '물건 두 개 — 알맞은 쪽은?', opts: ['hai cái', 'hai con'], a: 0, say: 'hai cái' },
           { q: '동물 세 마리는?', opts: ['ba con', 'ba cái'], a: 0, say: 'ba con' },
           { q: '기계 한 대는?', opts: ['một chiếc', 'một cái'], a: 0, say: 'một chiếc' }] },
  { key: 'R4', title: '남부 소리',
    intro: '남부(호찌민 쪽)는 글은 완전히 같고 소리가 다릅니다. 위의 북부 버튼을 눌러 남부 소리로 바꿔 비교하며 들어 보세요.',
    cards: [
      { vi: 'dạ', ko: '네 (공손)', kr: '북부 자 → 남부 야',
        tones: tns('dạ:nặng'), note: 'd · gi · v 가 남부에서 y 이 소리가 된다' },
      { vi: 'ba', ko: '아빠 (남부)', kr: '바',
        tones: tns('ba:ngang'), note: '북부 bố → 남부 ba. 엄마도 mẹ → má' },
      { vi: 'mắc', ko: '비싸다 (남부)', kr: '막',
        tones: tns('mắc:sắc'), note: '북부 đắt → 남부 mắc' },
      { vi: 'ngàn', ko: '천 1,000 (남부)', kr: '응안',
        tones: tns('ngàn:huyền'), note: '북부 nghìn → 남부 ngàn. 성조도 hỏi·ngã가 하나로 합쳐진다' }],
    quiz: [{ q: '남부에서 "아빠"는?', opts: ['ba', 'bố'], a: 0, say: 'ba' },
           { q: '남부에서 "비싸다"는?', opts: ['mắc', 'đắt'], a: 0, say: 'mắc' },
           { q: '남부에서 "천(1000)"은?', opts: ['ngàn', 'nghìn'], a: 0, say: 'ngàn' }] }
];


/* ---------- 문법 8가지 ----------
   문법 '수업'을 크게 만들지는 않는다. 다만 이 여덟 개는 없으면 말이 안 만들어진다 —
   부정·질문·시제·부탁처럼 하루에도 수십 번 쓰는 뼈대만 고른다.
   설명은 한 줄, 나머지는 예문으로 익힌다. */
const GRAMMAR = [
  { key: 'G1', title: '아니다', intro: '동사·형용사 앞에 không만 붙이면 부정이 됩니다. 모양이 바뀌는 것은 없습니다.',
    cards: [
      { vi: 'không', ko: '아니다·안', kr: '콩', tones: tns('không:ngang'), note: '무엇이든 그 앞에 붙인다' },
      { vi: 'Tôi không hiểu.', ko: '저는 이해 못 해요', kr: '또이 콩 히에우',
        tones: tns('Tôi:ngang, không:ngang, hiểu:hỏi'), note: 'tôi 나 + không 안 + hiểu 이해하다' },
      { vi: 'Cái này không đắt.', ko: '이건 안 비싸요', kr: '까이 나이 콩 닷',
        tones: tns('Cái:sắc, này:huyền, không:ngang, đắt:sắc'), note: '형용사 앞에도 똑같이' }],
    quiz: [{ q: '"저는 안 가요"는?', opts: ['Tôi không đi', 'Tôi đi không'], a: 0, say: 'Tôi không đi.' },
           { q: '"안 비싸요"는?', opts: ['không đắt', 'đắt không'], a: 0 },
           { q: 'không은 어디에 붙나요?', opts: ['동사·형용사 앞', '문장 맨 끝'], a: 0 }] },
  { key: 'G2', title: '예/아니오 질문', intro: '문장 끝에 không? 을 붙이면 "~해요?"가 됩니다. 대답은 có(네) / không(아니오).',
    cards: [
      { vi: 'Anh khỏe không?', ko: '잘 지내세요?', kr: '아인 쾌 콩',
        tones: tns('Anh:ngang, khỏe:hỏi, không:ngang'), note: '문장 + không? 물음' },
      { vi: 'Có.', ko: '네 (있어요·그래요)', kr: '꼬', tones: tns('Có:sắc'), note: 'có 네 — 한 마디로 충분' },
      { vi: 'Anh có bận không?', ko: '바쁘세요?', kr: '아인 꼬 번 콩',
        tones: tns('Anh:ngang, có:sắc, bận:nặng, không:ngang'), note: 'có ~ không 으로 감싸도 된다' }],
    quiz: [{ q: '"밥 먹었어요?"에 가까운 형태는?', opts: ['Anh ăn cơm không?', 'Không anh ăn cơm?'], a: 0 },
           { q: '"네"라고 짧게 답하려면?', opts: ['Có', 'Không'], a: 0, say: 'Có.' },
           { q: 'không? 은 어디에 오나요?', opts: ['문장 맨 끝', '문장 맨 앞'], a: 0 }] },
  { key: 'G3', title: '무엇·어디·언제', intro: '의문사는 한국어와 달리 <b>묻는 자리에 그대로</b> 둡니다. 순서를 바꾸지 않습니다.',
    cards: [
      { vi: 'Cái này là gì?', ko: '이게 뭐예요?', kr: '까이 나이 라 지',
        tones: tns('Cái:sắc, này:huyền, là:huyền, gì:huyền'), note: 'gì = 무엇' },
      { vi: 'Anh ở đâu?', ko: '어디 계세요?', kr: '아인 어 더우',
        tones: tns('Anh:ngang, ở:hỏi, đâu:ngang'), note: 'đâu = 어디' },
      { vi: 'Mấy giờ?', ko: '몇 시예요?', kr: '머이 저',
        tones: tns('Mấy:sắc, giờ:huyền'), note: 'mấy = 몇 (작은 수)' }],
    quiz: [{ q: '"이름이 뭐예요?"는?', opts: ['Tên anh là gì?', 'Gì tên anh là?'], a: 0, say: 'Tên anh là gì?' },
           { q: '"어디"는?', opts: ['đâu', 'gì'], a: 0 },
           { q: '의문사는 어디에 두나요?', opts: ['묻는 자리 그대로', '항상 문장 맨 앞'], a: 0 }] },
  { key: 'G4', title: '했다 · 하고 있다 · 할 것이다', intro: '동사는 모양이 안 바뀝니다. 앞에 <b>đã · đang · sẽ</b> 만 얹으면 시제가 됩니다.',
    cards: [
      { vi: 'Tôi đã ăn.', ko: '저는 먹었어요', kr: '또이 다 안',
        tones: tns('Tôi:ngang, đã:ngã, ăn:ngang'), note: 'đã = 이미 (과거)' },
      { vi: 'Tôi đang làm.', ko: '저는 하고 있어요', kr: '또이 당 람',
        tones: tns('Tôi:ngang, đang:ngang, làm:huyền'), note: 'đang = ~하는 중' },
      { vi: 'Tôi sẽ về.', ko: '저는 돌아갈 거예요', kr: '또이 새 베',
        tones: tns('Tôi:ngang, sẽ:ngã, về:huyền'), note: 'sẽ = ~할 것이다' }],
    quiz: [{ q: '"먹고 있어요"는?', opts: ['đang ăn', 'đã ăn'], a: 0, say: 'Tôi đang ăn.' },
           { q: '"갈 거예요"는?', opts: ['sẽ đi', 'đã đi'], a: 0 },
           { q: '동사 모양은?', opts: ['안 바뀐다', '시제마다 바뀐다'], a: 0 }] },
  { key: 'G5', title: '해 주세요 · 하지 마세요', intro: '부탁은 <b>làm ơn</b>(부디)이나 문장 끝 <b>nhé</b>, 금지는 <b>đừng</b>입니다.',
    cards: [
      { vi: 'Làm ơn giúp tôi.', ko: '좀 도와주세요', kr: '람 언 줍 또이',
        tones: tns('Làm:huyền, ơn:ngang, giúp:sắc, tôi:ngang'), note: 'làm ơn = 부디 (정중)' },
      { vi: 'Đừng bấm nút.', ko: '버튼 누르지 마세요', kr: '등 범 눗',
        tones: tns('Đừng:huyền, bấm:sắc, nút:sắc'), note: 'đừng = ~하지 마' },
      { vi: 'Làm lại nhé.', ko: '다시 해요', kr: '람 라이 녜',
        tones: tns('Làm:huyền, lại:nặng, nhé:sắc'), note: 'nhé = 부드럽게 권하는 끝맺음' }],
    quiz: [{ q: '"하지 마세요"의 앞말은?', opts: ['đừng', 'làm ơn'], a: 0 },
           { q: '정중히 부탁할 때는?', opts: ['Làm ơn ~', 'Đừng ~'], a: 0, say: 'Làm ơn giúp tôi.' },
           { q: 'nhé 는 어디에?', opts: ['문장 끝', '문장 앞'], a: 0 }] },
  { key: 'G6', title: '있다 · 없다', intro: '<b>có</b> 하나로 "있다·가지다"가 다 됩니다. 없으면 앞에 không.',
    cards: [
      { vi: 'Tôi có tiền.', ko: '저 돈 있어요', kr: '또이 꼬 띠엔',
        tones: tns('Tôi:ngang, có:sắc, tiền:huyền'), note: 'có = 있다·가지다' },
      { vi: 'Không có.', ko: '없어요', kr: '콩 꼬', tones: tns('Không:ngang, có:sắc'), note: '가장 많이 쓰는 두 마디' },
      { vi: 'Ở đây có nhà vệ sinh không?', ko: '여기 화장실 있어요?', kr: '어 더이 꼬 냐 베 신 콩',
        tones: tns('Ở:hỏi, đây:ngang, có:sắc, nhà:huyền, vệ:nặng, sinh:ngang, không:ngang'), note: 'có 있다 + không 물음' }],
    quiz: [{ q: '"없어요"는?', opts: ['Không có', 'Có không'], a: 0, say: 'Không có.' },
           { q: '"돈 있어요"는?', opts: ['Tôi có tiền', 'Tôi tiền có'], a: 0 },
           { q: 'có 의 뜻은?', opts: ['있다·가지다', '하지 마라'], a: 0 }] },
  { key: 'G7', title: '더 · 가장', intro: '비교는 <b>hơn</b>(더), 최고는 <b>nhất</b>(가장). 형용사 <b>뒤</b>에 붙습니다.',
    cards: [
      { vi: 'Cái này rẻ hơn.', ko: '이게 더 싸요', kr: '까이 나이 재 헌',
        tones: tns('Cái:sắc, này:huyền, rẻ:hỏi, hơn:ngang'), note: 'rẻ 싸다 + hơn 더' },
      { vi: 'Cái này tốt nhất.', ko: '이게 가장 좋아요', kr: '까이 나이 똣 녓',
        tones: tns('Cái:sắc, này:huyền, tốt:sắc, nhất:sắc'), note: 'tốt 좋다 + nhất 가장' },
      { vi: 'Nhanh hơn nhé.', ko: '더 빨리요', kr: '냐인 헌 녜',
        tones: tns('Nhanh:ngang, hơn:ngang, nhé:sắc'), note: '현장에서 매일 듣는 말' }],
    quiz: [{ q: '"더 싸요"는?', opts: ['rẻ hơn', 'hơn rẻ'], a: 0, say: 'Cái này rẻ hơn.' },
           { q: '"가장 좋다"는?', opts: ['tốt nhất', 'nhất tốt'], a: 0 },
           { q: 'hơn·nhất 의 자리는?', opts: ['형용사 뒤', '형용사 앞'], a: 0 }] },
  { key: 'G8', title: '할 수 있다', intro: '가능·허락은 <b>được</b>. 동사 뒤에 붙이고, 물을 때는 được không? 입니다.',
    cards: [
      { vi: 'Được.', ko: '돼요·괜찮아요', kr: '드억', tones: tns('Được:nặng'), note: '한 마디로 승낙' },
      { vi: 'Tôi làm được.', ko: '저 할 수 있어요', kr: '또이 람 드억',
        tones: tns('Tôi:ngang, làm:huyền, được:nặng'), note: '동사 + được ~할 수 있다' },
      { vi: 'Sửa được không?', ko: '고칠 수 있어요?', kr: '스어 드억 콩',
        tones: tns('Sửa:hỏi, được:nặng, không:ngang'), note: '가능한지 묻기' }],
    quiz: [{ q: '"할 수 있어요"는?', opts: ['làm được', 'được làm'], a: 0, say: 'Tôi làm được.' },
           { q: '"돼요?"라고 물으려면?', opts: ['~ được không?', '~ không được?'], a: 0 },
           { q: 'được 의 자리는?', opts: ['동사 뒤', '동사 앞'], a: 0 }] },
  { key: 'G9', title: '다 했다 · 아직', intro: '끝났는지 묻고 답하는 말. 공장에서 하루에도 수십 번 씁니다. <b>rồi</b>=했다, <b>chưa</b>=아직/했어요?',
    cards: [
      { vi: 'Xong chưa?', ko: '다 됐어요?', kr: '쏭 쯔어',
        tones: tns('Xong:ngang, chưa:ngang'), note: '문장 끝 chưa? 했어요?' },
      { vi: 'Làm xong rồi.', ko: '다 했어요', kr: '람 쏭 조이',
        tones: tns('Làm:huyền, xong:ngang, rồi:huyền'), note: 'rồi = 이미 그렇게 됐다' },
      { vi: 'Em chưa làm.', ko: '아직 안 했어요', kr: '앰 쯔어 람',
        tones: tns('Em:ngang, chưa:ngang, làm:huyền'), note: '동사 앞 chưa 아직 안 했다' }],
    quiz: [{ q: '"다 했어요"는?', opts: ['Làm xong rồi', 'Làm xong chưa'], a: 0, say: 'Làm xong rồi.' },
           { q: '"아직 안 했어요"는?', opts: ['Em chưa làm', 'Em làm rồi'], a: 0, say: 'Em chưa làm.' },
           { q: '끝났는지 물으려면 문장 끝에?', opts: ['chưa?', 'rồi?'], a: 0 }] },
  { key: 'G10', title: '해야 한다 · 하고 싶다', intro: '동사 앞에 하나만 얹으면 됩니다 — <b>phải</b>(해야 한다) · <b>muốn</b>(하고 싶다) · <b>cần</b>(필요하다).',
    cards: [
      { vi: 'Anh phải đeo găng tay.', ko: '장갑 끼셔야 해요', kr: '아인 파이 대오 강 따이',
        tones: tns('Anh:ngang, phải:hỏi, đeo:ngang, găng:ngang, tay:ngang'), note: 'phải = 의무 (안전 지시에 늘 나온다)' },
      { vi: 'Em muốn nghỉ.', ko: '쉬고 싶어요', kr: '앰 무온 응이',
        tones: tns('Em:ngang, muốn:sắc, nghỉ:hỏi'), note: 'muốn = 바람' },
      { vi: 'Em cần cái này.', ko: '이게 필요해요', kr: '앰 껀 까이 나이',
        tones: tns('Em:ngang, cần:huyền, cái:sắc, này:huyền'), note: 'cần = 필요' }],
    quiz: [{ q: '"쉬고 싶어요"는?', opts: ['Em muốn nghỉ', 'Em phải nghỉ'], a: 0, say: 'Em muốn nghỉ.' },
           { q: '"~해야 한다"는?', opts: ['phải', 'muốn'], a: 0 },
           { q: '이 말들의 자리는?', opts: ['동사 앞', '동사 뒤'], a: 0 }] },
  { key: 'G11', title: '고장났다 · 다쳤다', intro: '나쁜 일을 당했을 때는 <b>bị</b>, 좋은 일을 받았을 때는 <b>được</b>. 사고·고장 신고에 꼭 필요합니다.',
    cards: [
      { vi: 'Máy bị hỏng rồi.', ko: '기계 고장났어요', kr: '마이 비 홍 조이',
        tones: tns('Máy:sắc, bị:nặng, hỏng:hỏi, rồi:huyền'), note: 'bị 당하다 + 나쁜 일' },
      { vi: 'Em bị đau tay.', ko: '손을 다쳤어요', kr: '앰 비 다우 따이',
        tones: tns('Em:ngang, bị:nặng, đau:ngang, tay:ngang'), note: 'bị 당하다 — 아플 때도' },
      { vi: 'Em được nghỉ.', ko: '쉬게 됐어요 (허락받았어요)', kr: '앰 드억 응이',
        tones: tns('Em:ngang, được:nặng, nghỉ:hỏi'), note: 'được 받다 + 좋은 일' }],
    quiz: [{ q: '"기계 고장났어요"는?', opts: ['Máy bị hỏng', 'Máy được hỏng'], a: 0, say: 'Máy bị hỏng rồi.' },
           { q: '다쳤을 때 쓰는 말은?', opts: ['bị', 'được'], a: 0 },
           { q: '"쉬게 됐어요"는?', opts: ['Em được nghỉ', 'Em bị nghỉ'], a: 0, say: 'Em được nghỉ.' }] },
  { key: 'G12', title: '~해 주세요', intro: '부탁의 만능 열쇠 <b>cho</b>. "Cho + 사람 + 무엇/동사" 로 말하면 됩니다.',
    cards: [
      { vi: 'Cho em nghỉ năm phút.', ko: '5분만 쉬게 해 주세요', kr: '쪼 앰 응이 남 풋',
        tones: tns('Cho:ngang, em:ngang, nghỉ:hỏi, năm:ngang, phút:sắc'), note: 'cho ~해 주세요 + tôi 나 + 동사' },
      { vi: 'Cho tôi cái này.', ko: '이거 주세요', kr: '쪼 또이 까이 나이',
        tones: tns('Cho:ngang, tôi:ngang, cái:sắc, này:huyền'), note: '가게·식당에서 그대로' },
      { vi: 'Cho em hỏi.', ko: '뭐 좀 여쭐게요', kr: '쪼 앰 호이',
        tones: tns('Cho:ngang, em:ngang, hỏi:hỏi'), note: '말 걸 때 첫마디' }],
    quiz: [{ q: '"이거 주세요"는?', opts: ['Cho tôi cái này', 'Cái này cho tôi'], a: 0, say: 'Cho tôi cái này.' },
           { q: '말을 걸 때 첫마디는?', opts: ['Cho em hỏi', 'Cho em nghỉ'], a: 0, say: 'Cho em hỏi.' },
           { q: 'cho 다음에 오는 것은?', opts: ['사람', '동사'], a: 0 }] },
  { key: 'G13', title: '어디에 있어요', intro: '<b>ở</b> 뒤에 방향 말을 붙입니다 — trong(안) · trên(위) · dưới(아래) · ngoài(밖) · cạnh(옆).',
    cards: [
      { vi: 'Ở trong kho.', ko: '창고 안에요', kr: '어 쫑 코',
        tones: tns('Ở:hỏi, trong:ngang, kho:ngang'), note: 'ở ~에 + trong 안 + 장소' },
      { vi: 'Để ở trên bàn.', ko: '탁자 위에 두세요', kr: '데 어 쩬 반',
        tones: tns('Để:hỏi, ở:hỏi, trên:ngang, bàn:huyền'), note: '물건 놓을 자리 말하기' },
      { vi: 'Cái này để ở đâu?', ko: '이건 어디에 둬요?', kr: '까이 나이 데 어 더우',
        tones: tns('Cái:sắc, này:huyền, để:hỏi, ở:hỏi, đâu:ngang'), note: '현장에서 매일 쓰는 질문' }],
    quiz: [{ q: '"창고 안에"는?', opts: ['ở trong kho', 'kho ở trong'], a: 0, say: 'Ở trong kho.' },
           { q: '"위에"는?', opts: ['trên', 'dưới'], a: 0 },
           { q: '"어디에 둬요?"는?', opts: ['để ở đâu?', 'đâu để ở?'], a: 0 }] },
  { key: 'G14', title: '언제 · 얼마 · 맞죠?', intro: '남은 의문사 셋과, 확인할 때 붙이는 <b>phải không?</b> 입니다.',
    cards: [
      { vi: 'Bao giờ xong?', ko: '언제 끝나요?', kr: '바오 저 쏭',
        tones: tns('Bao:ngang, giờ:huyền, xong:ngang'), note: 'bao giờ = 언제' },
      { vi: 'Bao nhiêu tiền?', ko: '얼마예요?', kr: '바오 니에우 띠엔',
        tones: tns('Bao:ngang, nhiêu:ngang, tiền:huyền'), note: 'bao nhiêu = 얼마·몇 (큰 수)' },
      { vi: 'Anh là quản lý, phải không?', ko: '관리자님 맞죠?', kr: '아인 라 꽌 리 파이 콩',
        tones: tns('Anh:ngang, là:huyền, quản:hỏi, lý:sắc, phải:hỏi, không:ngang'), note: '문장 끝 phải không? 맞죠?' }],
    quiz: [{ q: '"언제 끝나요?"는?', opts: ['Bao giờ xong?', 'Bao nhiêu xong?'], a: 0, say: 'Bao giờ xong?' },
           { q: '"얼마예요?"는?', opts: ['Bao nhiêu tiền?', 'Bao giờ tiền?'], a: 0, say: 'Bao nhiêu tiền?' },
           { q: '"맞죠?"라고 확인할 때는?', opts: ['phải không?', 'chưa?'], a: 0 }] },
];

let RL = null;
function startRule(i) {
  const r = (typeof i === 'string') ? GRAMMAR[+i.slice(1)] : RULES[i];
  // 다른 학습과 같은 카드 화면으로 가르친다 — 카드가 끝나면 연습 문제
  L = { day: { day: r.key, theme: r.title, intro: r.intro, words: [], rule: r },
        items: [{ k: 'cover', d: { t: r.title, b: r.intro } },
                ...r.cards.map(c => ({ k: 'rule', d: c }))], i: 0 };
  drawCard();
  show('learn', r.title, true);
}
function drawRule() {
  const b = $('#rulesBody');
  b.textContent = '';
  const r = RL.r;

  if (RL.i >= r.quiz.length) {          // 결과
    S.done[r.key] = now();
    // 배운 예문은 문장 복습 창고로 — 기본기·문법도 복습 체계 안에 들어온다
    (r.cards || []).forEach(c => {
      if (c.vi.split(' ').length < 2) return;          // 낱말 하나짜리는 뺀다
      if (!S.srs[c.vi]) S.srs[c.vi] = { lv: 0, first: now(), due: now() + STEPS[0] * DAY };
    });
    touchToday(); save();
    const res = el('div', 'result');
    res.append(el('div', 'n', RL.ok + ' / ' + r.quiz.length));
    res.append(el('div', null, RL.ok === r.quiz.length ? '규칙이 손에 붙었습니다'
      : '틀린 건 앞의 예문을 한 번 더 들어 보세요'));
    const b2 = el('button', 'primary big', '다시 하기');
    b2.style.marginTop = '16px';
    b2.onclick = () => startRule(RULES.indexOf(r));
    const h = el('button', 'ghost big', '홈으로');
    h.style.marginLeft = '8px'; h.onclick = renderHome;
    res.append(b2, h);
    b.append(res);
    return;
  }

  const q = r.quiz[RL.i];               // 문제
  b.append(el('div', 'q', `${RL.i + 1} / ${r.quiz.length}`));
  b.append(el('div', 'q mid', esc(q.q)));
  const order = q.opts.map((_, i) => i).sort(() => Math.random() - .5);
  const opts = el('div', 'opts');
  order.forEach(oi => {
    const btn = el('button', null, esc(q.opts[oi]));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = oi === q.a;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.textContent === q.opts[q.a]) x.dataset.r = 'ok';
      });
      if (good) RL.ok++;
      if (q.say && AIDX[q.say]) play(q.say, false);   // 정답 소리를 바로 들려준다
      if (good) setTimeout(() => { RL.i++; drawRule(); }, 900);
      else nextBtn(b, () => { RL.i++; drawRule(); });
    };
    opts.append(btn);
  });
  b.append(opts);
}

/* ---------- 쓰기 연습 (손글씨 + 화면 자판) ----------
   손으로 쓰면 눈으로만 볼 때보다 글자가 더 잘 남는다(쓰는 동작이 기억에 같이 저장된다).
   손글씨는 자동 판정을 하지 않는다 — 판정이 목적이 아니라 쓰는 행위가 목적이고,
   정답을 열어 스스로 비교하는 것으로 충분하다. */

function practiceWords(n) {
  // 복습 예정 단어 먼저, 그다음 지금까지 배운 모든 단어를 최근 것부터
  const due = dueWords().map(findItem).filter(Boolean);
  const doneDays = ALL.filter(d => typeof d.day === 'number' && S.done[d.day]).reverse();
  const recent = doneDays.length ? doneDays.flatMap(d => d.words || [])
    : (ALL.find(d => d.day === 1) || {}).words || [];
  const pool = [...due, ...recent.filter(w => !due.some(x => x.vi === w.vi))];
  return pool.slice(0, n);
}

/* 화면 속 베트남어 자판 — 다운로드 없이 브라우저 안에서 바로.
   실기기 자판(텔렉스 방식)의 전 단계 연습: 글자와 성조 부호의 짝을 손에 익힌다. */
let TY = null;
function startType() {
  const ws = practiceWords(8).filter(w => AIDX[w.vi]);
  if (!ws.length) return;
  TY = { list: ws, i: 0, txt: '' };
  drawType();
  show('type', '타이핑', true);
}
function drawType() {
  const b = $('#typeBody'); b.textContent = '';
  if (TY.i >= TY.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', TY.list.length + '개'));
    r.append(el('div', null, '자판으로 친 단어는 철자까지 정확해집니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = TY.list[TY.i]; TY.txt = '';
  b.append(el('div', 'q', `${TY.i + 1} / ${TY.list.length} · 듣고 자판으로 쳐 보세요`));
  b.append(el('div', 'qmain', esc(w.ko)));
  const wrap = el('div', 'qplay');
  const p1 = el('button', 'primary', '듣기'); p1.onclick = () => play(w.vi, false);
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  // 디딤돌: 먼저 기억으로 쳐 보고, 막히면 글자를 보고 따라 친다.
  // 단 보고 친 성공은 복습 사다리를 올리지 않는다 — 기억에서 꺼낸 게 아니니까.
  let hinted = false;
  const p3 = el('button', 'ghost', '글자 보기');
  p3.onclick = () => {
    hinted = true; p3.disabled = true;
    wrap.after(el('div', 'hintvi', esc(w.vi)));
  };
  wrap.append(p1, p2, p3); b.append(wrap);
  play(w.vi, false);

  const out = el('div', 'dictans');
  const draw = () => { out.textContent = TY.txt || '· · ·'; };
  draw(); b.append(out);

  const kb = el('div', 'vkb');
  const key = (label, fn, cls) => { const k = el('button', 'vk' + (cls ? ' ' + cls : ''), label); k.onclick = fn; return k; };
  const add = ch => { TY.txt += ch; draw(); };
  ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m đ', 'ă â ê ô ơ ư'].forEach(r => {
    const row = el('div', 'vkrow');
    r.split(' ').forEach(ch => row.append(key(ch, () => add(ch))));
    kb.append(row);
  });
  const trow = el('div', 'vkrow');   // 성조 줄 — 마지막 음절의 주모음에 붙는다
  [['ngang', ''], ['huyền', '\u0300'], ['sắc', '\u0301'], ['hỏi', '\u0309'], ['ngã', '\u0303'], ['nặng', '\u0323']]
    .forEach(([name, mk]) => {
      const k = key(toneArrow(name), () => {
        const parts = TY.txt.split(' ');
        const last = parts.pop();
        if (!last) return;
        const bare = stripTone(last);
        parts.push(mk ? withMark(bare, mk, tonePos(bare)) : bare);
        TY.txt = parts.join(' ');
        draw();
      }, 'tonek ' + name);
      trow.append(k);
    });
  kb.append(trow);
  const brow = el('div', 'vkrow');
  brow.append(
    key('띄어쓰기', () => add(' '), 'wide'),
    key('⌫', () => { TY.txt = TY.txt.slice(0, -1); draw(); }, 'wide'),
    key('확인', () => {
      if (!TY.txt.trim()) return;
      const good = TY.txt.trim().toLowerCase() === w.vi.toLowerCase();
      S.stats.spellAll = (S.stats.spellAll || 0) + 1;
      if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
      fxTone(good);
      out.dataset.r = good ? 'ok' : 'no';
      if (!good) out.textContent = TY.txt.trim() + '  →  ' + w.vi;
      if (!good || !hinted) grade(w.vi, good);   // 보고 친 성공은 사다리에 반영 안 함
      setTimeout(() => { TY.i++; drawType(); }, good ? 600 : 1900);
    }, 'go wide')
  );
  kb.append(brow);
  b.append(kb);
  b.append(el('p', 'note', '실제 폰·컴퓨터의 베트남어 자판도 설정에서 추가하는 내장 기능입니다(다운로드 아님). ' +
    '둘 다 영어 자판에 텔렉스 규칙(aa→â, dd→đ, 낱말 끝 s→´ …)을 얹는 같은 방식이라, 여기서 익힌 글자 그대로 쓸 수 있습니다.'));
}

/* 지난 세트의 문장 — 단어만 반복하면 입이 문장까지 못 간다.
   최근 것만 주지 않고 오래된 것도 섞는다(오래 안 본 것일수록 다시 꺼낼 값어치가 크다). */
function pastSentences(n) {
  const done = ALL.filter(d => typeof d.day === 'number' && S.done[d.day] && d.dialog);
  if (!done.length) return [];
  const pick = [];
  const spots = [done.length - 1, 0, Math.floor(done.length / 2)];   // 최근·처음·중간 순
  for (const idx of spots) {
    const d = done[idx];
    const ls = (d.dialog.lines || []).filter(l => AIDX[l.vi]);
    if (!ls.length) continue;
    const l = ls[Math.floor(Math.random() * ls.length)];
    if (!pick.some(x => x.vi === l.vi))
      pick.push({ vi: l.vi, ko: l.ko, kr_read: l.kr_read, tones: l.tones, sent: true });
    if (pick.length >= n) break;
  }
  return pick;
}

/* ---------- 따라 말하기 연습 ---------- */
let SP = null;
function startSpeak() {
  const ws = practiceWords(6).filter(w => AIDX[w.vi]).concat(pastSentences(2));
  if (!ws.length) return;
  SP = { list: ws, i: 0 };
  drawSpeak();
  show('speak', '따라 말하기', true);
}
function drawSpeak() {
  const b = $('#speakBody'); b.textContent = '';
  resetRec();
  if (SP.i >= SP.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', SP.list.length + '개'));
    r.append(el('div', null, '소리 내어 말한 만큼 입이 기억합니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = SP.list[SP.i];
  b.append(el('div', 'q', `${SP.i + 1} / ${SP.list.length} · ` + (w.sent ? '지난 세트 문장 — 듣고 따라 말해 보세요' : '듣고 따라 말해 보세요')));
  b.append(el('div', 'qmain', esc(w.vi)));
  b.append(toneRow(w.tones));
  b.append(reveal(w.kr_read));
  b.append(el('div', 'q mid', esc(w.ko)));
  b.append(speakRow(w.vi, true));
  const nx = el('button', 'primary big', '다음 ›');
  nx.style.width = '100%'; nx.style.marginTop = '14px';
  nx.onclick = () => { SP.i++; drawSpeak(); };
  b.append(nx);
  play(w.vi, false);
}

/* ---------- 손글씨 ----------
   낯선 글자·성조 부호는 손으로 써야 오래 남는다(성인 외국문자 실험에서 손글씨가
   타이핑을 이겼고, 타이핑으로 배운 글자는 3주 뒤 기억이 무너졌다).
   흐름: 뜻과 소리만 주고 → 기억으로 쓴다(인출) → 정답과 비교 → 원하면 AI 선생님 점검.
   AI 점검은 참고용이다 — 흘려 쓰면 AI도 잘못 읽으므로 눈 비교가 기본이다. */
let WR = null;
function startWrite() {
  const ws = practiceWords(6).filter(w => AIDX[w.vi]);
  if (!ws.length) return;
  WR = { list: ws, i: 0 };
  drawWrite();
  show('write', '손글씨', true);
}
function drawWrite() {
  const b = $('#writeBody'); b.textContent = '';
  if (WR.i >= WR.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', WR.list.length + '개'));
    r.append(el('div', null, '손으로 쓴 글자는 눈으로만 본 것보다 오래 남습니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = WR.list[WR.i];
  b.append(el('div', 'q', `${WR.i + 1} / ${WR.list.length} · 듣고, 기억으로 써 보세요 (성조 부호까지)`));
  b.append(el('div', 'qmain', esc(w.ko)));
  const wrap = el('div', 'qplay');
  const p1 = el('button', 'primary', '듣기'); p1.onclick = () => play(w.vi, false);
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  wrap.append(p1, p2); b.append(wrap);
  play(w.vi, false);

  // 종이처럼 — 흰 바탕에 검은 획 (AI도 이쪽을 잘 읽는다)
  const cv = el('canvas', 'wpad');
  cv.width = 640; cv.height = 200;
  const ctx = cv.getContext('2d');
  const paper = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
  paper();
  ctx.strokeStyle = '#16181d'; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
  let drawing = false, drew = false;
  const pos = e => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  };
  cv.onpointerdown = e => { drawing = drew = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  cv.onpointermove = e => { if (drawing) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
  b.append(cv);

  const box = el('div', 'cmpbox');
  const row = el('div', 'qplay');
  const cl = el('button', 'ghost', '지우기');
  cl.onclick = () => { paper(); ctx.strokeStyle = '#16181d'; drew = false; };
  row.append(cl);
  if (aiReady()) {
    const ai = el('button', 'ghost', 'AI 선생님 점검');
    ai.onclick = () => {
      if (!drew) return;
      ai.disabled = true;
      aiRead(w.vi, cv, box).finally(() => { ai.disabled = false; });
    };
    row.append(ai);
  }
  const showA = el('button', 'primary', '정답 보기');
  showA.onclick = () => {
    showA.disabled = true;
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)));
    ans.append(toneRow(w.tones));
    ans.append(reveal(w.kr_read));
    b.insertBefore(ans, box);
    // 자가 채점 — AI와 무관하게, 이 단어를 복습에 언제 다시 낼지 정하는 용도
    const g = el('div', 'qplay');
    const ok = el('button', 'ghost sm', '맞게 썼어요');
    ok.onclick = () => { fxTone(true); grade(w.vi, true); WR.i++; drawWrite(); };
    const no = el('button', 'ghost sm', '틀렸어요 (곧 다시 나옴)');
    no.onclick = () => { grade(w.vi, false); WR.i++; drawWrite(); };
    g.append(ok, no);
    b.insertBefore(g, box);
  };
  row.append(showA);
  b.append(row, box);

  // 채점 없이도 오갈 수 있어야 한다
  const nav = el('div', 'pager');
  const pv = el('button', 'ghost big', '‹');
  pv.disabled = WR.i === 0;
  pv.onclick = () => { WR.i--; drawWrite(); };
  const nx = el('button', 'primary big', '다음 ›');
  nx.onclick = () => { WR.i++; drawWrite(); };
  nav.append(pv, el('span', null, `${WR.i + 1} / ${WR.list.length}`), nx);
  b.append(nav);
}

/* AI가 손글씨를 읽고 선생님처럼 짚어준다 — 무슨 글자로 읽히는지, 빠진 부호, 조언 한 줄.
   요청이 몰려 막히면(분당 한도) 30초 세고 한 번은 스스로 다시 시도한다. */
/* 손글씨 그림을 가볍게 만든다 — 글씨가 있는 부분만 잘라 512px로 줄인다.
   보내는 양이 5~10배 줄어 AI 답이 눈에 띄게 빨라진다(내용은 그대로). */
function inkCrop(cv) {
  const x = cv.getContext('2d');
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y += 2) for (let px = 0; px < cv.width; px += 2) {
    const i = (y * cv.width + px) * 4;
    if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) {
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0 || y1 <= y0) return cv.toDataURL('image/png').split(',')[1];
  const pad = 16;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(cv.width, x1 + pad); y1 = Math.min(cv.height, y1 + pad);
  const w = x1 - x0, h = y1 - y0, k = Math.min(1, 512 / w);
  const o = document.createElement('canvas');
  o.width = Math.round(w * k); o.height = Math.round(h * k);
  const ox = o.getContext('2d');
  ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height);
  ox.drawImage(cv, x0, y0, w, h, 0, 0, o.width, o.height);
  return o.toDataURL('image/jpeg', .8).split(',')[1];
}

async function aiRead(target, cv, box) {
  const note = el('div', 'cmpnote ainote', 'AI 선생님이 보는 중…');
  box.querySelector('.ainote')?.remove();
  box.append(note);
  try {
    const b64 = inkCrop(cv);
    const t = await gCall({
      contents: [{ role: 'user', parts: [
        { text: '사진은 한국인 학습자가 손으로 쓴 베트남어다. 목표 단어는 "' + target + '".\n' +
                '딱 세 줄로, 한국어로 답한다:\n1) 읽힘: (손글씨가 읽히는 그대로)\n' +
                '2) 짚기: 목표와 다른 글자나 빠진·잘못 붙인 성조 부호. 없으면 "잘 썼습니다"\n' +
                '3) 조언: 글씨 모양이나 부호 위치에 대한 한 줄 조언' },
        { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }],
      generationConfig: { maxOutputTokens: 250, thinkingConfig: { thinkingBudget: 0 } }
    }, i => { note.textContent = `지금 AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
    note.innerHTML = esc(t).replace(/\n/g, '<br>') +
      '<br><span class="dimtxt">참고용 — 흘려 쓰면 AI도 잘못 읽습니다. 기본은 정답 보기로 직접 비교.</span>';
  } catch (e) { note.textContent = 'AI 점검 실패: ' + (e.message || ''); }
}

/* ---------- AI 대화 ----------
   대화 시스템으로 연습하면 말하기가 는다는 메타분석이 있다(말하기 d=0.84).
   단, 왕초보에게는 자유대화보다 '배운 단어 안의 제한 대화'가 낫다 —
   그래서 지금까지 배운 단어 목록을 매번 같이 보낸다.
   대화 내용은 구글 서버로 간다. */
let CH = null;
/* AI 중계 서버 — 키를 서버가 숨겨 들고 있어서 누구나 키 없이 쓴다.
   (2026-08-22 개통. 비우면 예전 방식(각자 키)으로 돌아간다) */
const PROXY = 'https://viet-ai.chaochao-app.workers.dev';
/* 순위 서버 — 주소를 채우면 주간 순위가 켜진다 (비면 개인 성적표만) */
const aiReady = () => !!(PROXY || S.gkey);
/* AI 호출 한 군데로 모은다 — 구글이 붐비는 날(429·503)에도 앱이 스스로 버틴다.
   서버도 재시도하지만, 서버가 옛 코드여도 여기서 한 번 더 막아준다. */
async function gCall(payload, onWait) {
  let last = 0;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(GURL(), { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload) });
    if (r.ok) {
      const j = await r.json();
      const t = ((j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('')).trim();
      if (t) return t;
      last = 0;
    } else last = r.status;
    if (last === 400 || last === 403) throw new Error(
      PROXY ? '서버 연결에 문제가 있습니다' : '키가 잘못됐거나 만료됐습니다');
    if (i < 2) { onWait && onWait(i); await new Promise(res => setTimeout(res, 4000 + i * 4000)); }
  }
  throw new Error(last === 429 ? '요청이 몰려 있습니다 — 잠시 뒤 다시 해 보세요'
    : last ? '지금 AI가 붐빕니다 — 잠시 뒤 다시 해 보세요' : '빈 답이 왔습니다');
}
const GURL = () => PROXY ||
  ('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(S.gkey));

function learnedVi() {
  const out = [];
  for (const d of ALL) {
    (d.words || []).forEach(w => out.push(w.vi));
    if (typeof d.day === 'number' && !S.done[d.day]) break;   // 오늘(진행 중인 날)까지만
  }
  return out;
}
const todayDay = () => ALL.find(d => typeof d.day === 'number' && !S.done[d.day]) || ALL[ALL.length - 1];

function chatSys(mode, myRole, day) {
  const t = day || todayDay();
  const dlg = (t.dialog?.lines || []).map(l => l.who + ': ' + l.vi).join(' / ');
  return '당신은 베트남어를 처음 배우는 한국인의 대화 상대다. 북부(하노이) 표준을 쓴다.\n' +
    '반드시 이 형식으로만 답한다. 다른 말은 붙이지 않는다:\n' +
    'VI: 베트남어 한 문장 (최대 7단어)\nKR: 그 발음의 한글 표기\nKO: 한국어 뜻\n' +
    '학습자의 베트남어에 성조나 단어 실수가 있으면 넷째 줄 "FIX: 짧은 교정"으로 알려준다.\n' +
    '가능한 한 이 단어들만 쓴다(이름·지명은 예외): ' + learnedVi().join(', ') + '\n' +
    '한 번에 한 문장. 쉬운 질문으로 대화를 이어간다. 학습자가 한국어로 쓰면 그 말을 베트남어로 어떻게 하는지 알려주고 따라 하게 한다.\n' +
    '학습자가 사진을 보내면, 사진에 보이는 것을 주제로 아주 쉬운 베트남어 문장으로 대화를 이어간다.\n' +
    (mode === 'today'
      ? `역할극: 오늘의 대화(${dlg})에서 학습자가 ${myRole} 역할, 당신이 ${myRole === 'A' ? 'B' : 'A'} 역할이다. ` +
        (myRole === 'B' ? '당신(A)의 첫 대사로 시작한다.' : '학습자(A)가 먼저 말하도록 짧게 유도한다.') +
        ' 대화가 이어지면 조금씩 넓힌다.'
      : '아주 쉬운 자유 대화. 인사로 시작한다.');
}

function bubble(cls, text) {
  const b = el('div', 'cb ' + cls);
  if (text != null) b.textContent = text;
  $('#chatLog').append(b);
  b.scrollIntoView({ block: 'end', behavior: 'smooth' });
  return b;
}

/* 기기에 베트남어 음성이 깔려 있을 때만 AI 문장을 소리로 들려줄 수 있다 */
function viVoices() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  return vs.filter(v => (v.lang || '').toLowerCase().startsWith('vi'));
}
const viVoice = () => viVoices()[0] || null;
function speakVi(t) {
  const u = new SpeechSynthesisUtterance(t);
  const vs = viVoices();
  const male = (S.tch || 'f') === 'm';
  // 폰마다 목소리 이름이 다르다 — 이름으로 남녀를 찾고, 못 찾으면 높낮이로 흉내 낸다
  const M = /male|nam\b|vim|minh|_m|-m\b/i, F = /female|linh|hoai|my|vif|_f|-f\b/i;
  const pick = vs.find(v => (male ? M : F).test(v.name || ''));
  if (pick) u.voice = pick;
  else if (vs.length) { u.voice = vs[0]; u.pitch = male ? .65 : 1.15; }
  if (pick && vs.length === 1) u.pitch = male ? .65 : 1.15;
  u.lang = 'vi-VN'; u.rate = .85;
  u.onstart = () => $('#tch').classList.add('talk');       // 말하는 동안만 입이 움직인다
  u.onend = u.onerror = () => $('#tch').classList.remove('talk');
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* ---------- AI 선생님 캐릭터 ----------
   화면 속 선생님은 성적을 올리는 장치가 아니라 계속 쓰게 만드는 장치다
   (있기만 해도 동기가 오른다 — 페르소나 효과). 학습 효과 근거는 '말할 때
   움직일 때'만 있어서(체화 원리), 소리가 나는 동안만 입을 움직인다.
   그림 파일 없이 SVG라 몇 KB고, 이름으로 cô(여 선생님)·thầy(남 선생님) 호칭도 가르친다. */
function tchSvg() {
  const f = (S.tch || 'f') === 'f';
  const hair = f
    ? '<path d="M52 58 Q54 24 100 22 Q146 24 148 58 L148 112 Q140 118 136 106 L136 66 Q118 46 100 48 Q82 46 64 66 L64 106 Q60 118 52 112 Z" fill="#2d2438"/>'
    : '<path d="M54 62 Q52 26 100 24 Q148 26 146 62 L140 56 Q118 40 100 42 Q82 40 60 56 Z" fill="#33291f"/>';
  return `<svg viewBox="0 0 200 150" class="tchsvg">
    <ellipse cx="100" cy="152" rx="56" ry="26" fill="${f ? '#c94f6d' : '#3f6ea5'}"/>
    <path d="M74 134 Q100 120 126 134 L126 150 L74 150 Z" fill="${f ? '#e0607e' : '#4a7cb5'}"/>
    <circle cx="100" cy="74" r="42" fill="#f2c9a0"/>
    ${hair}
    <path d="M76 64 Q83 60 90 64" stroke="#241f1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M110 64 Q117 60 124 64" stroke="#241f1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <g class="teye"><circle cx="84" cy="76" r="4.6" fill="#241f1a"/><circle cx="116" cy="76" r="4.6" fill="#241f1a"/></g>
    <circle cx="72" cy="90" r="6" fill="#eba07c" opacity=".55"/>
    <circle cx="128" cy="90" r="6" fill="#eba07c" opacity=".55"/>
    <ellipse class="tmouth" cx="100" cy="98" rx="9" ry="4" fill="#a4543f"/>
  </svg>`;
}
function drawTch() {
  const p = $('#tch');
  p.hidden = false;
  const male = (S.tch || 'f') === 'm';
  const im = new Image();               // 사진이 있으면 사진으로 바꿔 단다
  im.src = 'img/teacher-' + (male ? 'm' : 'f') + '.webp';
  im.alt = ''; im.className = 'tchface';
  im.onload = () => { const svg = p.querySelector('.tchsvg'); if (svg) svg.replaceWith(im); };
  p.innerHTML = tchSvg() +
    `<span class="tchname">${(S.tch || 'f') === 'm' ? 'Thầy Nam · 터이 남 (남 선생님)' : 'Cô Linh · 꼬 린 (여 선생님)'}</span>`;
}

function aiBubble(text) {
  const m = {};
  text.split('\n').forEach(l => {
    const mt = l.match(/^\s*(VI|KR|KO|FIX)\s*:\s*(.+)/i);
    if (mt) { const k = mt[1].toUpperCase(); m[k] = m[k] ? m[k] + ' ' + mt[2].trim() : mt[2].trim(); }
  });
  const b = bubble('ai');
  if (!m.VI) { b.textContent = text.trim(); return; }
  b.append(el('div', 'cvi', esc(m.VI)));
  if (m.KR) b.append(el('div', 'ckr', '[' + esc(m.KR) + ']'));
  if (m.KO) b.append(el('div', 'cko', esc(m.KO)));
  if (m.FIX) b.append(el('div', 'cfix', '✎ ' + esc(m.FIX)));
  if (viVoice()) {
    speakVi(m.VI);                     // 선생님이 바로 읽어준다 (입도 같이 움직인다)
    const bt = el('button', 'ghost sm', '다시 듣기');
    bt.onclick = () => speakVi(m.VI);
    b.append(bt);
  }
  b.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

async function chatSend(userText) {
  if (userText) { CH.hist.push({ role: 'user', parts: [{ text: userText }] }); bubble('me', userText);
                  if (CH.room) save(); }
  const wait = bubble('ai wait', '…');
  try {
    const text = await gCall({
      system_instruction: { parts: [{ text: CH.sys }] },
      contents: CH.hist.slice(-12),          // 최근 12마디만 보낸다 (무료 한도 아끼기)
      generationConfig: { maxOutputTokens: 800, temperature: .6, thinkingConfig: { thinkingBudget: 0 } }
    }, i => { wait.textContent = `붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
    CH.hist.push({ role: 'model', parts: [{ text }] });
    if (CH.room) { if (CH.hist.length > 40) CH.hist.splice(0, CH.hist.length - 40); save(); }
    wait.remove();
    aiBubble(text);
  } catch (e) {
    wait.remove();
    bubble('ai err', '⚠ ' + (e.message || '연결 실패'));
  }
}

/* 대화창의 베트남어 자판 — 실제 베트남 사람들이 쓰는 방식 그대로.
   자판 자체는 우리와 같은 QWERTY이고, 부호는 '텔렉스' 규칙(aa→â, dd→đ, 성조는 낱말 뒤에)으로 얹는다.
   여기서는 텔렉스를 외우지 않아도 되게 부호 글쇠를 따로 뒀다 — 결과는 같은 글자다. */
function drawChatKeys() {
  const kb = $('#chatKeys');
  kb.textContent = '';
  const inp = $('#chatText');
  const put = ch => { inp.value += ch; chatGrow(); inp.focus({ preventScroll: true }); };
  const key = (label, fn, cls) => { const k = el('button', 'vk' + (cls ? ' ' + cls : ''), label);
    k.type = 'button'; k.onclick = fn; return k; };
  ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m', 'ă â ê ô ơ ư đ'].forEach(r => {
    const row = el('div', 'vkrow');
    r.split(' ').forEach(ch => row.append(key(ch, () => put(ch))));
    kb.append(row);
  });
  const trow = el('div', 'vkrow');
  [['ngang', ''], ['huyền', '\u0300'], ['sắc', '\u0301'], ['hỏi', '\u0309'], ['ngã', '\u0303'], ['nặng', '\u0323']]
    .forEach(([name, mk]) => {
      trow.append(key(toneArrow(name), () => {          // 마지막 낱말의 주모음에 부호를 얹는다
        const parts = inp.value.split(' ');
        const last = parts.pop();
        if (!last) return;
        const bare = stripTone(last);
        parts.push(mk ? withMark(bare, mk, tonePos(bare)) : bare);
        inp.value = parts.join(' ');
        chatGrow();
        inp.focus({ preventScroll: true });
      }, 'tonek ' + name));
    });
  kb.append(trow);
  const brow = el('div', 'vkrow');
  brow.append(key('띄어쓰기', () => put(' '), 'wide'),
              key('⌫', () => { inp.value = inp.value.slice(0, -1); chatGrow(); inp.focus({ preventScroll: true }); }, 'wide'),
              key('보내기', () => $('#chatForm').requestSubmit(), 'go wide'));
  kb.append(brow);
}
/* 입력칸은 글이 길어지면 세로로 자란다 — 한 줄에 가려 뭘 썼는지 안 보이면 고칠 수가 없다.
   최대 다섯 줄까지 늘고 그 뒤로는 칸 안에서 스크롤된다. */
function chatGrow() {
  const t = $('#chatText');
  t.parentElement.dataset.v = t.value;   // 틀이 이 글의 키만큼 늘어난다 (높이는 css가 정한다)
}
$('#chatText').addEventListener('input', chatGrow);
$('#chatText').addEventListener('keydown', e => {          // 컴퓨터 자판: 엔터는 보내기, 시프트+엔터는 줄바꿈
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chatForm').requestSubmit(); }
});
$('#chatText').onclick = () => { if ($('#chatKeys').hidden) $('#chatKb').click(); };
$('#chatKb').onclick = () => {
  const kb = $('#chatKeys');
  if (kb.hidden) { drawChatKeys(); kb.hidden = false; $('#chatKb').classList.add('pick'); }
  else { kb.hidden = true; $('#chatKb').classList.remove('pick'); }
};

function startChat() {
  $('#chatKb').classList.remove('pick');
  CH = null;
  if (!aiReady()) {
    $('#chatLog').textContent = ''; $('#chatForm').hidden = true; $('#tch').hidden = true;
    renderChatKey(); show('chat', 'AI 대화', true); return;
  }
  renderRooms();
}

function renderChatKey() {
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';
  s.append(el('p', 'lede', 'AI와 베트남어로 대화하려면 <b>구글 무료 키</b>가 한 번 필요합니다.<br>' +
    '카드 등록 없음 · 하루 수백 마디 무료 · 키는 이 폰에만 저장됩니다.'));
  const ol = el('ol', 'keysteps');
  ['구글 계정으로 <b>aistudio.google.com/apikey</b> 에 들어간다',
   '<b>Create API key</b> 버튼을 누른다',
   '나온 긴 글자를 복사해 아래에 붙여넣는다'].forEach(t => ol.append(el('li', null, t)));
  s.append(ol);
  const inp = el('input', 'keyin'); inp.type = 'password'; inp.placeholder = 'AIza… 로 시작하는 키';
  const b = el('button', 'primary big', '저장하고 시작');
  b.onclick = () => {
    const v = inp.value.trim();
    if (v.length < 20) { alert('키가 너무 짧습니다. 전체를 복사해 주세요.'); return; }
    S.gkey = v; save(); renderChatModes();
  };
  s.append(inp, b);
  s.append(el('p', 'note', '대화 내용은 구글 서버로 전송됩니다. 개인정보(실명 전체·주소·사번)는 쓰지 마세요.'));
}

/* 대화방 — 지역×성별로 넷. 나가도 지난 대화가 남는다(카톡처럼).
   방마다 선생님이 다르니 말투도 소리도 달라진다. 방 비우기로 처음부터 다시 할 수 있다. */
const ROOMS = [['n', 'f'], ['n', 'm'], ['s', 'f'], ['s', 'm']];
const roomKey = (rg, tc) => rg + tc;
const roomName = (rg, tc) => (rg === 's' ? '남부' : '북부') + ' · ' + (tc === 'm' ? 'Thầy Nam (남)' : 'Cô Linh (여)');
function roomOf(k) { S.room = S.room || {}; return (S.room[k] = S.room[k] || { hist: [] }); }
function renderRooms() {
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';
  $('#chatLog').textContent = '';
  $('#chatForm').hidden = true;
  $('#chatKeys').hidden = true;
  $('#tch').hidden = true;
  s.append(el('p', 'lede', '누구와 이야기할까요?'));
  ROOMS.forEach(([rg, tc]) => {
    const k = roomKey(rg, tc), r = (S.room || {})[k];
    const last = r && r.hist.length ? (r.hist[r.hist.length - 1].parts || []).map(x => x.text || '').join('').split('\n')[0].replace(/^VI:\s*/, '') : '';
    const btn = el('button', 'chatmode');
    btn.innerHTML = `<b>${esc(roomName(rg, tc))}</b><span>${esc(last ? last.slice(0, 30) : '아직 대화 없음')}</span>`;
    btn.onclick = () => openRoom(rg, tc);
    s.append(btn);
  });
  show('chat', 'AI 선생님', true);
}
function openRoom(rg, tc) {
  S.region = rg; S.tch = tc; save(); drawRegion();
  const k = roomKey(rg, tc), r = roomOf(k);
  S.stats.chat = (S.stats.chat || 0) + 1; touchToday(); save();
  $('#chatSetup').hidden = true;
  $('#chatForm').hidden = false;
  drawTch();
  $('#chatLog').textContent = '';
  CH = { mode: 'free', room: k, sys: chatSys('free'), hist: r.hist };
  // 지난 대화를 다시 그린다
  r.hist.forEach(m => {
    const t = (m.parts || []).map(x => x.text || '').join('');
    if (!t) return;
    if (m.role === 'user') { if (t !== '(대화를 시작해 주세요)') bubble('me', t); }
    else aiBubble(t);
  });
  const tools = el('div', 'qplay');
  const clr = el('button', 'ghost sm', '방 비우기');
  clr.onclick = () => { if (confirm('이 방의 대화를 모두 지울까요?')) { r.hist = []; save(); openRoom(rg, tc); } };
  const out = el('button', 'ghost sm', '방 나가기');
  out.onclick = () => { save(); renderRooms(); };
  tools.append(clr, out);
  $('#chatLog').prepend(tools);
  if (!r.hist.length) {
    CH.hist.push({ role: 'user', parts: [{ text: '(대화를 시작해 주세요)' }] });
    chatSend(null);
  }
  show('chat', roomName(rg, tc), true);
}

function renderChatModes() {
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';

  const tp = el('div', 'pickbox');
  tp.append(el('span', 'pklab', '선생님'));
  const gp = el('div', 'rolepick');
  [['f', '여'], ['m', '남']].forEach(([k, txt]) => {
    const on = (S.tch || 'f') === k;
    const bb = el('button', 'ghost sm' + (on ? ' pick' : ''), (on ? '✓ ' : '') + txt);
    bb.onclick = () => { S.tch = k; save(); renderChatModes(); };
    gp.append(bb);
  });
  tp.append(gp, el('span', 'pklab', '말'));
  const rp = el('div', 'rolepick');
  [['n', '북부'], ['s', '남부']].forEach(([k, txt]) => {
    const on = (S.region === 's' ? 's' : 'n') === k;
    const bb = el('button', 'ghost sm' + (on ? ' pick' : ''), (on ? '✓ ' : '') + txt);
    bb.onclick = () => { S.region = k; save(); drawRegion(); renderChatModes(); };
    rp.append(bb);
  });
  tp.append(rp);
  s.append(tp);

  const m2 = el('button', 'chatmode');
  m2.innerHTML = '<b>대화 시작</b>';
  m2.onclick = () => beginChat('free');
  s.append(m2);
  if (S.gkey) {
    const del = el('button', 'ghost sm', '키 지우기');
    del.onclick = () => { if (confirm('저장된 키를 지울까요?')) { delete S.gkey; save(); startChat(); } };
    s.append(del);
  }
}

function beginChat(mode, myRole, day) {
  S.stats.chat = (S.stats.chat || 0) + 1; touchToday(); save();
  $('#chatSetup').hidden = true;
  $('#chatForm').hidden = false;
  drawTch();
  CH = { mode, sys: chatSys(mode, myRole, day), hist: [{ role: 'user', parts: [{ text: '(대화를 시작해 주세요)' }] }] };
  chatSend(null);
}

/* 복습 [대화] — 끝낸 세트의 문장으로 AI 선생님과 역할극 (오늘 것뿐 아니라 지난 것도) */
function startTalk() {
  if (!aiReady()) { startChat(); return; }
  $('#chatLog').textContent = '';
  $('#chatForm').hidden = true;
  $('#chatKeys').hidden = true;
  $('#chatKb').classList.remove('pick');
  $('#tch').hidden = true;
  CH = null;
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';
  const list = ALL.filter(d => typeof d.day === 'number' && S.done[d.day] && d.dialog);
  if (!list.length) {
    s.append(el('p', 'note', '아직 끝낸 세트가 없습니다. 오늘 세트를 먼저 끝내면 그 문장으로 역할극할 수 있습니다.'));
  } else {
    s.append(el('p', 'lede', '끝낸 세트의 문장으로 역할극합니다. 세트와 역할을 고르세요.'));
    list.reverse().forEach(d => {
      const m = el('div', 'chatmode on');
      m.innerHTML = '<b>' + esc(trackName(d) + label(d) + ' · ' + (d.dialog.title || d.theme)) + '</b>';
      const rr = el('div', 'rolepick');
      [['A', '내가 A'], ['B', '내가 B']].forEach(([k, txt]) => {
        const bb = el('button', 'ghost sm', txt);
        bb.onclick = () => beginChat('today', k, d);
        rr.append(bb);
      });
      m.append(rr);
      s.append(m);
    });
  }
  show('chat', '대화 복습', true);
}

/* 말로 대화 — 녹음한 말을 AI가 받아 적어 그대로 보낸다 (타자 없이 입으로) */
let MIC = null;
$('#chatMic').onclick = async () => {
  if (!CH) return;
  const btn = $('#chatMic');
  if (MIC) { MIC.stop(); return; }
  if (!canRecord()) { bubble('ai err', '⚠ 이 기기에서는 녹음이 안 됩니다'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    MIC = new MediaRecorder(stream);
    MIC.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    MIC.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      MIC = null;
      btn.classList.remove('rec'); btn.disabled = true;
      const url = URL.createObjectURL(new Blob(chunks));
      try {
        const b64 = await recToWav(url);
        const heard = await gCall({
          contents: [{ role: 'user', parts: [
            { text: '녹음은 한국인이 베트남어를 말한 것이다. 들린 대로 <베트남어 철자>로만 적어라. ' +
                    '한글이나 영어로 적지 마라. 설명·따옴표 없이 문장만 적어라.' },
            { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
          generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
        });
        const inp = $('#chatText');
        inp.value = heard;                       // 바로 보내지 않는다 — 고쳐 쓸 기회를 준다
        chatGrow();
        inp.focus({ preventScroll: true });
        const w = findItem(heard) || allWords().find(x => x.vi.toLowerCase() === heard.toLowerCase());
        bubble('ai note', '이렇게 들렸습니다: ' + heard + (w ? ' — ' + w.ko : '') +
          '\n맞으면 보내기, 다르면 고쳐서 보내세요.');
      } catch (e) { bubble('ai err', '⚠ ' + (e.message || '듣기 실패')); }
      URL.revokeObjectURL(url);
      btn.disabled = false;
    };
    MIC.start();
    btn.classList.add('rec');
    setTimeout(() => { if (MIC && MIC.state === 'recording') MIC.stop(); }, 8000);
  } catch (e) { bubble('ai err', '⚠ 마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요'); }
};

/* 사진 보며 대화 — 폰 카메라로 찍은 사진을 줄여서(512px) 대화에 붙인다.
   실시간 영상은 무료 한도로 무리지만, 사진 한 장씩은 같은 무료 호출에 들어간다. */
function shrinkImg(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 384 / Math.max(img.width, img.height));   // 작을수록 빨리 읽는다
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', .72).split(',')[1]);
    };
    img.src = URL.createObjectURL(file);
  });
}
const camIn = document.createElement('input');
camIn.type = 'file'; camIn.accept = 'image/*'; camIn.capture = 'environment';
$('#chatCam').onclick = () => camIn.click();
camIn.onchange = async () => {
  const f = camIn.files[0]; camIn.value = '';
  if (!f || !CH) return;
  const b64 = await shrinkImg(f);
  const bub = bubble('me');
  const im = new Image();
  im.src = 'data:image/jpeg;base64,' + b64; im.className = 'camth'; im.alt = '';
  bub.append(im);
  CH.hist.push({ role: 'user', parts: [
    { text: '학습자가 지금 눈앞의 것을 사진으로 보여준다. 사진에서 가장 눈에 띄는 것 하나를 골라, ' +
            '그 이름을 넣은 아주 쉬운 베트남어 한 문장으로 말을 걸어라. 사진 설명을 길게 하지 마라.' },
    { inline_data: { mime_type: 'image/jpeg', data: b64 } }] });
  chatSend(null);
};

/* ---------- 시작 ---------- */
/* 뒤로가기 — 한 단계씩. 전에는 어디서 눌러도 홈으로 튀어서,
   복습 안에서 방식만 바꾸려 해도 처음부터 다시 들어가야 했다. */
$('#back').onclick = () => { const f = NAV.pop(); (f || renderHome)(); };
$('#goMe').onclick = renderAwards;

/* 날씨·시간 — 베트남 시각(실시간)과 하노이·호찌민 한 주 예보.
   무료 기상 서비스(Open-Meteo, 키·가입 불필요)라 운영비 0원 원칙에 맞다. */
const WXICON = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
  80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
/* 지방별 날씨 이야기 — 옷·건강·출퇴근에 바로 걸리는 것만 */
const WXNOTE = {
  n: ['하노이는 <b>사계절이 뚜렷합니다.</b> 봄(2~4월)은 흐리고 이슬비가 계속돼 빨래가 잘 안 마릅니다.',
      '여름(5~8월)은 35도를 넘고 습해서 체감이 더 높습니다. 오후 소나기가 잦고, 7~9월엔 태풍이 올라옵니다.',
      '가을(9~11월)이 가장 좋습니다 — 맑고 선선해 밖에서 지내기 좋습니다.',
      '겨울(12~1월)은 15도 안팎까지 떨어지는데 <b>난방이 없어</b> 체감은 훨씬 춥습니다. 두꺼운 옷을 챙기세요.',
      '겨울~봄에는 미세먼지가 심한 날이 많습니다. 마스크를 상비하세요.'],
  s: ['호찌민은 <b>계절이 둘뿐입니다</b> — 우기와 건기. 일 년 내내 27도 안팎으로 덥습니다.',
      '우기(5~10월)엔 오후 한때 굵은 소나기가 거의 매일 옵니다. 30분이면 그치니 우비 하나면 됩니다.',
      '건기(11~4월)는 비가 거의 없고 맑습니다. 3~4월이 가장 덥습니다(35도 이상).',
      '비 온 뒤 길이 잠기는 곳이 있어 오토바이 출퇴근 때 조심해야 합니다.',
      '겨울에도 반팔로 지냅니다 — 두꺼운 옷은 필요 없습니다.'],
};
const WXCLIMATE = {   // 월별 평균 기온(도) / 강수량(mm) — 기상 평년값
  n: [[17,18],[18,26],[20,44],[24,90],[28,189],[30,240],[30,288],[29,318],[28,265],[26,131],[22,43],[18,23]],
  s: [[26,14],[27,4],[28,10],[30,50],[29,218],[28,312],[28,294],[28,270],[27,327],[27,267],[27,117],[26,48]],
};
const WXCITY = { n: { name: '하노이 (북부)', lat: 21.03, lon: 105.85 },
                 s: { name: '호찌민 (남부)', lat: 10.82, lon: 106.63 } };
function showWx(city) {
  const c = (city === 'n' || city === 's') ? city : (S.region === 's' ? 's' : 'n');
  show('wx', '날씨', true);
  const b = $('#wxBody');
  b.textContent = '';
  const pick = el('div', 'qplay');
  ['n', 's'].forEach(k => {
    const bb = el('button', 'ghost sm' + (k === c ? ' pick' : ''), WXCITY[k].name);
    bb.onclick = () => showWx(k);
    pick.append(bb);
  });
  b.append(pick);
  const box = el('div', null, '날씨를 불러오는 중…');
  b.append(box);
  const q = WXCITY[c];
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + q.lat + '&longitude=' + q.lon +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FBangkok')
    .then(r => r.json()).then(js => {
      box.textContent = '';
      const d = js.daily;
      box.append(el('p', 'newsday', '이번 주'));
      const row = el('div', 'wxrow');
      d.time.forEach((t, k) => {
        const day = new Date(t + 'T00:00');
        const cell = el('div', 'wxday' + (k === 0 ? ' today' : ''));
        cell.append(el('span', null, k === 0 ? '오늘' : ['일','월','화','수','목','금','토'][day.getDay()]),
                    el('i', null, WXICON[d.weather_code[k]] || '☁️'),
                    el('b', null, Math.round(d.temperature_2m_max[k]) + '°'),
                    el('em', null, Math.round(d.temperature_2m_min[k]) + '°'));
        if (d.precipitation_sum[k] >= 1) cell.append(el('u', null, Math.round(d.precipitation_sum[k]) + 'mm'));
        row.append(cell);
      });
      box.append(row);
      box.append(el('p', 'newsday', '월평균 기온 · 강수량'));
      const cur = new Date().getMonth();
      const wrap = el('div', 'wxscroll');
      const mrow = el('div', 'wxrow wxclim');
      WXCLIMATE[c].forEach(([tp, rn], i) => {
        const cell = el('div', 'wxday' + (i === cur ? ' today' : ''));
        cell.append(el('span', null, (i + 1) + '월'), el('b', null, tp + '°'), el('em', null, rn + 'mm'));
        mrow.append(cell);
      });
      wrap.append(mrow); box.append(wrap);
      box.append(el('p', 'newsday', WXCITY[c].name + ' 날씨는 이렇습니다'));
      const ul = el('ul', 'wxnote');
      WXNOTE[c].forEach(t => { const li = el('li'); li.innerHTML = t; ul.append(li); });
      box.append(ul);
      box.append(el('p', 'note', '예보 출처 — Open-Meteo (무료 기상 자료)'));
    }).catch(() => { box.textContent = '날씨를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'; });
}

/* 사용법 — 짧은 제목 + 한 줄씩. 이 앱의 모든 설계 근거가 여기 모여 있다. */
function showGuide() {
  const b = $('#guideBody');
  b.textContent = '';
  const sec = (icon, title, lines) => {
    const c = el('div', 'gsec');
    c.append(el('div', 'ghead', `<span>${icon}</span>${title}`));
    const ul = el('ul');
    lines.forEach(t => { const li = el('li'); li.innerHTML = t; ul.append(li); });
    c.append(ul);
    b.append(c);
  };
  b.append(el('p', 'lede', '하루 5분, 이렇게만 하면 됩니다'));

  sec('①', '처음 5분 — 오늘 할 일은 이것뿐', [
    '홈 맨 위 <b>오늘 학습</b> 칸을 누르세요. 오늘 할 세트가 바로 열립니다 — 어디서부터 할지 찾을 필요가 없습니다.',
    '<b>단어 10개 → 확인 문제 → 오늘의 대화</b> 순서로 저절로 이어집니다.',
    '대화가 마지막인 이유 — 외운 것을 <b>입으로 말해서</b> 끝내야 하루가 완성되기 때문입니다.',
    '<b>오늘 복습</b> 칸도 떠 있으면 같이 하세요. 실력의 90%는 여기서 나옵니다.',
    '바쁜 날은 <b>3분</b>이라도. 완벽한 하루보다 <b>내일 또 오는 것</b>이 중요합니다.',
  ]);

  sec('②', '화면 읽는 법 — 어디에 뭐가 있나', [
    '첫 화면은 <b>큰 칸 여덟 개</b>뿐입니다 — 하루 5분 베트남어 · 복습 · 기본기 · 문법 · AI 선생님 · 동아리 · 베트남 소식 · 사용법. ' +
      '칸을 누르면 그 안에서 다시 고릅니다(첫 화면에 버튼이 많을수록 고르기가 힘들어 결국 아무것도 안 누르게 됩니다). 왼쪽 위 <b>‹</b>로 한 단계씩 되돌아옵니다.',
    '<b>복습</b> 칸 오른쪽 숫자는 오늘 꺼낼 카드 수입니다. 숫자가 없으면 오늘은 안 눌러도 됩니다.',
    '그 아래 <b>이번 주 도장 일곱 칸</b>과 배운 단어 · 외운 단어 · 끝낸 세트가 지금까지의 전부입니다. ' +
      '<b>외운 단어</b>는 하루 이상 간격을 두고 두 번 이상 맞힌 단어 — 이게 진짜 실력입니다.',
    '오른쪽 위 <b>사람 아이콘</b>이 내 정보입니다. 이름 · 지역 · 하루 학습량 · 성적이 그 한 화면에 다 있습니다.',
    '소리가 나는 화면에서만 위에 <b>북부 | 남부</b>와 <b>여 | 남</b>이 뜹니다. 눌러 두면 앱의 모든 소리가 그 목소리로 바뀝니다.',
  ]);

  sec('③', '오늘·내일 일정은 이렇게 짜입니다', [
    '일정판은 <b>일상 한 세트 · 직무 한 세트</b>를 번갈아 내줍니다 — 한쪽만 몰아 하는 것보다 기억에 유리합니다. 기본기는 일정에 안 넣습니다(각자 짬 날 때).',
    '더 하고 싶으면 <b>내 정보 → 하루</b>에서 2세트로 올리세요 — 일상과 직무를 같은 날 줍니다.',
    '오른쪽 두 칸은 <b>내일</b>입니다. [내일 학습]을 누르면 내일 단어가 3초에 한 장씩 소리와 함께 넘어갑니다(예습이라 채점 없음). [내일 복습]은 내일 몇 장이 쌓이는지 보는 칸입니다.',
    '순서를 건너뛰고 직접 고르려면 <b>하루 5분 베트남어 → 일상 / 직무</b>. 주제 묶음별로 늘어서 있고 다음에 할 세트에 표가 붙습니다.',
    '직무 목록 맨 위 <b>업종 칩</b>(봉제·전자·사무)을 끄면 그 세트가 목록에서도 일정에서도 사라집니다. 잘못 완료된 세트는 옆 <b>[미완으로]</b>로 되돌립니다.',
  ]);

  sec('④', '카드 한 장 안의 모든 것', [
    '<b>큰 베트남어 글자를 누르면 소리가 납니다</b> — 듣기 단추를 찾지 마세요(그림을 크게 두려고 없앴습니다). 글자 위 화살표가 성조가 오르내리는 방향입니다.',
    '<b>그림은 눈에 보이는 단어에만</b> 붙습니다. 눈에 안 보이는 말에 억지로 붙이면 오히려 방해가 됩니다. 아래 <b>예문 칸도 누르면</b> 소리가 납니다.',
    '글자 옆 <b>시계</b>는 느리게 듣기, <b>마이크</b>는 따라 말하기입니다. 녹음하면 [원어민][내 소리][번갈아 듣기]가 생기고 ' +
      '<b>원어민 높낮이 곡선과 내 곡선이 겹쳐</b> 그려집니다. 맞다·틀리다로 판정하지 않습니다 — 모양이 보이면 스스로 고칠 수 있습니다.',
    '<b>[AI가 듣기]</b>는 내 발음이 어떤 철자로 들렸는지 알려줍니다. 성조는 AI도 잘 못 가리므로 위의 곡선이 맡습니다 — 둘을 합쳐야 온전한 피드백입니다.',
    '카드에 <b>🔑 한자어</b> 줄이 있으면 한국어 한자음과 짝이라 외울 것이 거의 없고, <b>남부에서는 …</b> 줄이 있으면 호찌민 쪽에서 다르게 씁니다. ' +
      '카드를 다 넘기면 <b>확인 문제 → 오늘의 대화</b>로 이어집니다. 대화는 [▶ 전체 듣기] 뒤 줄마다 연습하고, 맨 아래 <b>이렇게도 말합니다</b>가 같은 뜻의 다른 문장입니다.',
  ]);

  sec('⑤', '복습이 이 앱의 심장입니다', [
    '맞힌 카드는 <b>1 → 3 → 7 → 14 → 30 → 60일</b> 뒤에 다시 나오고, 틀리면 두 계단 내려와 곧 다시 나옵니다. ' +
      '잊기 <b>직전</b>에 꺼내야 가장 오래 남기 때문에 <b>복습이 없는 날도 정상</b>입니다.',
    '<b>오늘 복습</b>은 만기된 단어와 문장을 <b>20개씩</b> 끊어 줍니다. 다 풀면 [이어서 20개 더]가 뜨고, 그만둬도 답한 것은 이미 저장돼 있습니다.',
    '골라서 하려면 <b>복습 → 단어 / 문장</b>. 평소엔 <b>[랜덤]</b>만 누르면 됩니다 — 익숙해질수록 어려운 방식이 많이 나옵니다. 끝낸 세트의 대화 문장과 기본기·문법 예문도 같은 창고에서 나옵니다.',
    '<b>말하기</b> 뜻만 보고 말하기(AI가 받아 적어 채점) · <b>듣기</b> 소리 듣고 뜻 고르기 · <b>읽기</b> 글자 보고 뜻 고르기 · ' +
      '<b>쓰기</b> 소리 듣고 화면 자판으로(낱말을 친 뒤 성조 화살표를 누르면 부호가 제자리에 붙습니다). ' +
      '쓰기에는 <b>손가락으로 쓰는 문제</b>가 가끔 섞이고, [AI 선생님 점검]이 읽힘·짚기·조언 세 줄을 붙여 줍니다. <b>3분</b>은 바쁜 날 자동 훑기입니다.',
    '틀린 문제는 <b>그 판 뒤쪽에 한 번 더</b> 나옵니다 — 틀린 채로 끝내면 그 기억이 남으니까요. 카드가 없는 날 더 하고 싶으면 [그래도 최근 단어 다시 보기](미리 본 것은 다음 복습 날짜를 안 밀립니다).',
  ]);

  sec('⑥', '소리와 뼈대 — 기본기 · 문법', [
    '기본기는 일정에 안 들어갑니다 — 하루 한 판씩, 특히 <b>자기 전</b>에 돌리면 자는 동안 소리가 정리됩니다.',
    '<b>모음</b> — o/ô/ơ · u/ư · a/ă 를 귀로 가르는 10문제. 한국인이 가장 오래 헷갈리는 자리입니다.',
    '<b>성조</b> — 성조만 다른 단어를 소리로 구별하는 문제 + 들은 소리에 부호를 붙이는 문제. 시판 앱 대부분이 빠뜨린 부분입니다.',
    '<b>자음</b>은 카드만 있고 훈련이 없습니다 — 북부 표준에서 tr=ch, s=x, d=gi=r이 <b>같은 소리</b>라 귀로 가르는 훈련이 성립하지 않습니다.',
    '<b>호칭 · 어순 · 단위 · 남부 소리</b> 네 수업과 <b>문법 14과</b>는 예문 카드 몇 장 + 연습 문제로 끝납니다. ' +
      '남부 소리 수업에서는 [북부 소리]와 [남부 소리]를 바로 맞대 들을 수 있고, 끝낸 예문은 문장 복습 창고로 들어갑니다.',
  ]);

  sec('⑦', 'AI 선생님과 실제로 말해 보기', [
    '<b>자유 대화</b>는 북부/남부 × 여/남 <b>네 방</b>입니다. 방마다 말투와 소리가 다르고, 나갔다 와도 지난 대화가 남습니다.',
    '지금까지 배운 단어를 매번 같이 보내므로 <b>내가 아는 단어 안에서</b> 말을 걸어옵니다 — 왕초보에게는 완전한 자유 대화보다 이쪽이 낫습니다. 답은 베트남어 · 발음 · 뜻 세 줄로 옵니다.',
    '내 베트남어에 실수가 있으면 <b>✎</b>로 시작하는 교정 줄이 붙습니다. [다시 듣기]로 문장을 한 번 더 들을 수 있습니다.',
    '입력칸 왼쪽 <b>마이크</b>는 말한 것을 받아 적어 칸에 넣어 줍니다(바로 안 보냅니다 — 고칠 기회를 줍니다). ' +
      '<b>카메라</b>는 눈앞의 물건을 찍으면 그 이름으로 말을 걸어옵니다. 오른쪽 <b>자판</b>에는 ă â ê ô ơ ư đ 와 성조 글쇠가 있습니다.',
    '<b>[방 비우기]</b>로 그 방을 처음부터, <b>[방 나가기]</b>로 목록으로. <b>배운 문장으로</b>에서는 끝낸 세트의 대화를 골라 <b>[내가 A] / [내가 B]</b>로 역할극을 합니다.',
  ]);

  sec('⑧', '내 실력을 재는 법 — 채점과 분석', [
    '오른쪽 위 <b>사람 아이콘</b> → 이름 · 지역 · 하루 학습량을 [바꾸기]로 고칩니다. 별명은 2~10글자, 서버에 올라가는 것은 별명 · 도장 · 외운 단어 수뿐입니다.',
    '<b>실력 분석</b>은 <b>말하기 · 듣기 · 읽기 · 쓰기 · 암기</b> 다섯 과목을 막대로 보여줍니다. [이번 주]와 [누적]을 눌러 견주세요.',
    '<b>10문제가 안 되면 일부러 판정하지 않습니다</b> — 적은 표본으로 약점을 말하면 그건 분석이 아니라 점(占)입니다.',
    '[자세히]를 열면 <b>성조별 · 문제 유형별 · 복습 단계별 · 단어 길이별 · 시간대별</b>까지 나옵니다. 아래 <b>이렇게 하면 올라갑니다</b> 칸에 처방과 <b>발목 잡는 단어</b>(두 번 이상 틀린 것)가 나옵니다.',
    '<b>업적 31개</b>는 기초 · 진도 · 어휘 · 훈련 · 꾸준함 다섯 갈래입니다. 주가 바뀌면 <b>지난주 성적표</b>가 저절로 뜨고, <b>전체 순위</b>는 ' +
      '<b>내 자리만</b> 보여줍니다 — 남의 등수도 이름도 아무에게도 안 보입니다. 연속 기록은 일부러 세지 않습니다: 하루 끊겼다고 그만두게 되니까요.',
  ]);

  sec('⑨', '혼자 하지 않기 · 베트남 알기 · 진도 지키기', [
    '혼자 하는 공부는 3주를 못 넘깁니다. <b>동아리</b>에 들어가면 회원별 <b>이번 주 월~일 도장</b>이 한눈에 보입니다 — 점수가 아니라 누가 나왔는지만 보여줍니다.',
    '직접 만들 수도 있습니다(예: 빈즈엉 3공장). <b>아무나 못 들어오게</b>를 켜면 승인제가 되어 신청이 오면 [받기]로 들입니다. 실명도 학습 기록도 올라가지 않습니다.',
    '<b>베트남 소식</b>에는 매일 저녁 로봇이 골라둔 <b>오늘 기사</b>(제목을 누르면 원문), 하노이·호찌민 <b>한 주 예보</b>와 월평균 기온·강수량, ' +
      '그리고 <b>문화 16장</b>(호칭 · 이름 · 두 손 · 회식 · 낮잠 · 오토바이 · 설 · 금기…)이 있습니다. 말만 배워서는 반쪽입니다.',
    '하루가 끝나면 홈 아래 <b>[진도 백업]</b>을 한 번 누르세요 — 글자 뭉치가 복사됩니다. 메모 앱에 붙여 두면 폰을 바꿔도 <b>[백업 불러오기]</b>로 되살아납니다. ' +
      '<b>[진도 초기화]</b>는 되돌릴 수 없어 두 번 묻습니다.',
    '한 번 연 화면과 한 번 들은 소리는 폰에 남아 <b>인터넷이 끊겨도</b> 열립니다. 브라우저 메뉴에서 <b>홈 화면에 추가</b>해 두면 앱처럼 열립니다.',
  ]);

  show('guide', '사용법', true);
}

/* 베트남 문화 — 학습 카드와 같은 방식으로 한 장씩 넘기며 본다 */
const CULTURE = [
  { e: '🙇', t: '호칭이 예의의 절반', b: '나이를 물어보는 건 실례가 아니라 <b>당신을 뭐라고 부를지 정하려는 것</b>입니다.<br>' +
      '<b>anh</b>(아인) 손위 남자 = 형·오빠 · <b>chị</b>(찌) 손위 여자 = 누나·언니 · <b>em</b>(앰) 손아래 = 동생.<br>' +
      '이 셋만 제대로 써도 예의 바른 사람이 됩니다.' },
  { e: '📛', t: '이름은 뒤에서 부른다', b: '베트남 이름은 <b>성 + 가운데 이름 + 끝 이름</b> 순서입니다(예: Nguyễn Văn Hùng).<br>' +
      '부를 때는 성이 아니라 <b>끝 이름</b>을 씁니다 — "Anh Hùng"처럼 호칭 뒤에 끝 이름을 붙입니다.' },
  { e: '🤲', t: '두 손으로', b: '물건·서류·명함을 주고받을 때 <b>두 손</b>을 쓰면 공손하게 봅니다. 한 손이면 다른 손을 팔에 살짝 대는 것도 같은 뜻입니다.' },
  { e: '🍻', t: '회식과 건배', b: '건배할 때 <b>Một, hai, ba, dô!</b>(못 하이 바, 요! — 하나 둘 셋, 야!)를 외칩니다.<br>' +
      '잔을 부딪칠 때 손윗사람보다 <b>잔을 살짝 낮게</b> 대면 좋아합니다. 회식 뒤 노래방(karaoke)으로 이어지는 일이 흔합니다.' },
  { e: '😴', t: '점심 후 낮잠', b: '많은 공장·사무실이 점심 뒤 <b>20~30분 불을 끄고</b> 낮잠을 잡니다. 놀라지 말고 같이 쉬면 됩니다.' },
  { e: '🛵', t: '오토바이가 다리', b: '출퇴근·배달·이사까지 오토바이로 합니다. <b>헬멧은 법으로 의무</b>입니다.<br>' +
      '길 건널 때는 <b>일정한 속도로 천천히</b> — 멈칫하거나 뛰면 더 위험합니다. 그랩(Grab) 앱이 택시 역할을 합니다.' },
  { e: '☕', t: '커피의 나라', b: '연유를 넣은 진한 <b>cà phê sữa đá</b>(까 페 스어 다 — 아이스 연유 커피)가 국민 음료입니다.<br>' +
      '베트남은 세계 손꼽히는 커피 생산국이고, 커피숍에 오래 앉아 있는 것이 일상 문화입니다.' },
  { e: '🍵', t: '차부터 한 잔', b: '사무실이나 집에 손님이 오면 먼저 <b>차(trà)</b>를 냅니다. 거절하지 말고 한 모금이라도 마시는 것이 예의입니다.' },
  { e: '🧧', t: '설(Tết)이 일 년의 중심', b: '음력 설 전후로 <b>나라가 멈춥니다</b>. 공장도 길게 쉬고, 이른바 <b>13월 월급</b>(설 상여)이 관례인 회사가 많습니다.<br>' +
      '아이·손아래에게 세뱃돈 <b>lì xì</b>(리 씨)를 붉은 봉투에 담아 줍니다.' },
  { e: '🇻🇳', t: '쉬는 날', b: '법정 공휴일은 <b>1/1 · 음력 설 · 훙왕 기일(음력 3/10) · 4/30 통일기념일 · 5/1 노동절 · 9/2 국경일</b>입니다.<br>' +
      '설 연휴가 가장 길고, 4/30~5/1은 붙여서 쉬는 경우가 많습니다.' },
  { e: '💵', t: '돈 다루기', b: '지폐 단위가 커서 <b>0의 개수</b>를 봐야 합니다. 색이 비슷한 지폐가 있어(2만 동과 50만 동) 낼 때 한 번 더 확인하는 습관이 좋습니다.<br>' +
      '시장은 흥정이 자연스럽지만, 마트·편의점은 정찰제입니다.' },
  { e: '🚫', t: '하지 않는 것이 좋은 일', b: '어른의 <b>머리를 만지지 않기</b>, 밥에 <b>젓가락을 꽂지 않기</b>(제사 상 연상), 사람을 <b>손가락으로 가리키지 않기</b>.<br>' +
      '국가·지도자에 대한 험담은 <b>법적 문제</b>가 될 수 있으니 하지 않는 편이 안전합니다.' },
  { e: '🏠', t: '가족이 먼저', b: '월급의 상당 부분을 고향 가족에게 보내는 일이 흔합니다. 명절에 고향 가는 것을 아주 중요하게 여깁니다.<br>' +
      '가족·고향 이야기를 물어보면 마음이 빨리 열립니다.' },
  { e: '👟', t: '신발과 집', b: '집에 들어갈 때는 <b>신발을 벗습니다</b>. 식당·가게는 신은 채로 들어갑니다.' },
  { e: '🌦️', t: '북부는 사계절, 남부는 두 계절', b: '하노이는 봄(흐리고 이슬비)·여름(무덥고 소나기)·가을(맑고 선선)·겨울(15도 안팎, <b>난방이 없어</b> 체감은 더 춥다)이 있습니다.<br>' +
      '호찌민은 연중 27도 안팎에 <b>우기(5~10월)와 건기(11~4월)</b>뿐입니다.' },
  { e: '🗣️', t: '남과 북은 말이 다르다', b: '글은 완전히 같고 <b>소리와 몇몇 단어</b>가 다릅니다 — 아빠는 북부 <b>bố</b>, 남부 <b>ba</b>. "네"는 북부 <b>vâng</b>, 남부 <b>dạ</b>.<br>' +
      '이 앱 위쪽 <b>북부 | 남부</b> 버튼으로 소리를 바꿔 들어 보세요.' },
];
/* 세트 번호 → 그 자리에 어울리는 문화 이야기. 표지에 한 조각씩 얹는다.
   따로 모아 둔 '문화' 화면은 없앴다 — 호칭을 배우는 날 호칭 문화가 나와야
   말과 문화가 한 덩어리로 붙는다. 키는 '일상 N' 또는 '직무 N'. */
const CULTAT = {
  '일상 1': 0,   // 인사와 호칭      → 호칭이 예의의 절반
  '일상 2': 1,   // 이름 묻고 답하기 → 이름은 뒤에서 부른다
  '일상 3': 15,  // 어느 나라        → 남과 북은 말이 다르다
  '일상 4': 7,   // 반갑습니다       → 차부터 한 잔
  '일상 6': 2,   // 헤어질 때        → 두 손으로
  '일상 10': 9,  // 나이와 시간      → 쉬는 날
  '일상 11': 4,  // 요일             → 점심 후 낮잠
  '일상 12': 5,  // 하루 일과        → 오토바이가 다리
  '일상 13': 6,  // 먹고 마시기      → 커피의 나라
  '일상 14': 10, // 사고 팔기        → 돈 다루기
  '일상 15': 8,  // 숫자와 돈        → 설(Tết)이 일 년의 중심
  '일상 16': 13, // 어디에 있어요    → 신발과 집
  '일상 17': 12, // 가족             → 가족이 먼저
  '일상 19': 11, // 부탁하기         → 하지 않는 것이 좋은 일
  '일상 20': 14, // 어떤가요         → 북부는 사계절, 남부는 두 계절
  '직무 5': 3,   // 회사 생활        → 회식과 건배
};
const cultureFor = d => CULTAT[(trackName(d) || '') + label(d).replace('Day ', '')] ??
                        CULTAT[(d.track === 'work' ? '직무 ' : '일상 ') + (d.n || d.day)];


/* ---------- 기사 학습 ----------
   어제 베트남에서 무슨 일이 있었는지 읽으면서 겸사겸사 말도 익히는 자리다.
   **복습 창고에 넣지 않는다** — 여기 단어는 외우라고 있는 게 아니라 스치라고 있다.
   그래서 채점도, 사다리도 없다. 일주일치만 남고 지난 것은 사라진다. */
let NEWSD = null;
function newsSets() {
  if (NEWSD) return Promise.resolve(NEWSD);
  return fetch('data/news_days.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : { days: [] })
    .then(j => (NEWSD = j.days || []))
    .catch(() => (NEWSD = []));
}
function showNewsLearn() {
  const b = $('#subBody');
  b.textContent = '';
  b.append(el('p', 'lede', '불러오는 중…'));
  show('sub', '기사', true);
  newsSets().then(days => {
    b.textContent = '';
    if (!days.length) {
      b.append(el('p', 'lede', '아직 기사 세트가 없습니다'));
      b.append(el('p', 'note', '매일 새벽 6시 30분에 어제 기사 다섯 편으로 만들어집니다.'));
      return;
    }
    b.append(el('p', 'note', '어제 베트남 소식을 읽으면서 말도 익힙니다. ' +
      '여기 단어는 <b>복습에 안 들어갑니다</b> — 외우는 자리가 아니라 스치는 자리입니다. 일주일치만 남습니다.'));
    let last = null;
    days.forEach(d => {
      if (d.ts !== last) { b.append(el('p', 'newsday', esc(d.ts.slice(5).replace('-', '월 ') + '일'))); last = d.ts; }
      const btn = el('button', 'bigmenu');
      btn.append(el('b', null, esc(d.theme)), el('span', 'msub', esc(d.title)));
      btn.onclick = () => { dive(showNewsLearn); startNews(d); };
      b.append(btn);
    });
  });
}
function startNews(d) {
  const items = [{ k: 'cover', d: { t: '📰 ' + d.theme, b: esc(d.intro), src: d.u, title: d.title } }];
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  L = { day: { day: d.day, theme: d.theme, words: d.words, dialog: d.dialog, news: true },
        items, i: 0, news: true };
  drawCard();
  show('learn', d.theme, true);
}

/* 오늘 기사 — 깃허브 로봇이 아침마다 골라둔 것을 보여준다 (data/news.json) */
function showNews() {
  const b = $('#newsBody');
  b.textContent = '';
  fetch('data/news.json', { cache: 'no-cache' }).then(r => r.json()).then(n => {
    let last = null;
    (n.items || []).forEach(it => {
      if (it.d !== last) { b.append(el('p', 'newsday', esc(it.d))); last = it.d; }
      const a = el('a', 'newsrow');
      a.href = it.u; a.target = '_blank'; a.rel = 'noopener';
      a.append(el('span', 'ncat', it.cat || '경제·직무'), el('b', null, esc(it.t)));
      b.append(a);
    });
    b.append(el('p', 'note', '매일 아침 6시 30분에 업데이트됩니다. 최근 3일치만 남습니다.<br>기사 출처 — 인사이드비나'));
  }).catch(() => b.append(el('p', 'note', '기사를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')));
  show('news', '베트남 소식', true);
}
$('#chatForm').onsubmit = e => {
  e.preventDefault();
  const v = $('#chatText').value.trim();
  if (!v || !CH) return;
  $('#chatText').value = '';
  chatGrow();
  chatSend(v);
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


/* 위 토글 두 개 — 두 값이 다 보이고 지금 켜진 쪽만 진하게 (현재 상태가 헷갈리지 않게) */
function seg(a, b, first) {
  return `<i${first ? ' class="on"' : ''}>${a}</i><i${first ? '' : ' class="on"'}>${b}</i>`;
}
function drawVoiceBtn() {
  $('#voice').innerHTML = seg('여', '남', S.voice === 'f');
}
/* 진도 초기화 — 처음부터 다시. 되돌릴 수 없어서 두 번 묻는다 */
$('#bkReset').onclick = () => {
  if (!confirm('배운 기록을 모두 지우고 처음부터 다시 시작할까요?')) return;
  if (!confirm('되돌릴 수 없습니다. 정말 지울까요?\n(백업해 둔 글자가 있으면 나중에 되살릴 수 있습니다)')) return;
  const nick = S.nick;
  S.done = {}; S.srs = {}; S.act = {}; S.stats = {}; S.wk = { k: weekKey(), base: snapshot() };
  S.nick = nick; save(); renderHome();
};

$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save(); drawVoiceBtn();
  if (!$('#learn').hidden && L) drawCard();
};

/* 북부(하노이) ↔ 남부(호찌민) 소리 전환. 남부 목소리는 여성 하나뿐이다. */
function drawRegion() {
  $('#region').innerHTML = seg('북부', '남부', S.region !== 's');
  drawVoiceBtn();
  topBtns();
}
$('#region').onclick = () => {
  S.region = S.region === 's' ? 'n' : 's'; save(); drawRegion();
  // 남부와 북부는 높낮이가 다르다 — 보고 있던 카드의 원어민 곡선도 다시 그린다
  if (!$('#learn').hidden && L) drawCard();
};

/* ---------- 앱 전체 순위와 평균 ----------
   왜 동아리 안이 아니라 전체인가: 동아리는 두세 명이라 등수가 뜻을 못 가진다.
   전체라야 "나는 보통보다 잘하고 있나"에 답이 된다. 동아리는 출석만 맡는다.
   부를 때만 부른다 — 화면을 열 때 한 번, 그리고 [새로고침]을 누를 때.
   AI를 쓰지 않으므로 이 기능은 AI 사용량과 무관하다. */
const RANKKEY = ['say', 'ear', 'read', 'spell', 'memo'];
/* 순위표의 자리표. 별명은 겹칠 수 있어서 기기마다 다른 표를 하나 만들어 쓴다.
   이 표에는 아무 뜻이 없다 — 누구인지 알 수 있는 정보가 아니다. */
const myUid = () => S.uid || (S.uid = Math.random().toString(36).slice(2, 10), save(), S.uid);
const RANKNM = { say: '말하기', ear: '듣기', read: '읽기', spell: '쓰기', memo: '암기' };
function myPcts() {
  const cur = snapshot(), o = {};
  SUBJ.forEach((x, i) => {
    const n = cur[x.all] || 0;
    if (n >= NEED) o[RANKKEY[i]] = Math.round((cur[x.ok] || 0) * 100 / n);
  });
  return o;
}
function drawRank(host) {
  host.textContent = '';
  host.append(el('div', 'rhead', '<b>전체 순위</b>'));
  const body = el('div', 'rbody', '불러오는 중…');
  host.append(body);
  const again = el('button', 'ghost sm', '새로고침');
  again.onclick = () => drawRank(host);
  const sk = skillScore();
  /* 운영에 필요한 숫자를 함께 보낸다. 전부 '내 진도의 요약'이고 개인을 가리키지 않는다.
     f  첫날      — 시작한 지 며칠 된 사람인지 (코호트)
     l  마지막 날 — 아직 하고 있는지
     dd 공부한 날 · st 끝낸 세트 — 어디까지 갔는지 (어디서 그만두는지 알려면 필요하다)
     tr 만기 지난 카드의 첫 시도 정답률 — **진짜로 기억에 남았는가**. 간격 반복의 핵심 지표다
     ms 두 번 이상 틀린 단어 몇 개 — 어느 단어가 어려운지(커리큘럼을 고칠 근거) */
  const acts = Object.keys(S.act || {}).sort();
  const od = S.stats.od || {};
  const tr = Object.values(od).reduce((a, v) => [a[0] + v.ok, a[1] + v.all], [0, 0]);
  const ms = Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  cCall({ act: 'rank', uid: myUid(), score: sk.score, memo: sk.memo, pct: myPcts(),
          days: weekDots().map(d => d.done ? 1 : 0),
          f: acts[0] || '', l: acts[acts.length - 1] || '', dd: acts.length,
          st: Object.keys(S.done).filter(k => +k >= 1).length, tr, ms })
    .then(j => {
      body.textContent = '';
      if (j.total < 3) {
        body.innerHTML = '아직 사람이 적어 순위를 매기지 않습니다 (지금 ' + j.total + '명). 3명부터 나옵니다.';
        host.append(again); return;
      }
      // 남의 등수도 이름도 보여주지 않는다 — 누구나 자기 자리만 안다
      if (!sk.score) {
        body.innerHTML = '아직 순위를 매길 수 없습니다.<br>' +
          '<span class="dimtxt">과목 하나가 10문제를 넘으면 점수가 나옵니다. ' +
          '못 잰 것을 재었다고 하지 않기 위해서입니다.</span>';
        host.append(again); return;
      }
      body.innerHTML =
        `<b>${j.total}명 중 ${j.rank}위</b> · 상위 ${j.pct}%` +
        `<br><span class="dimtxt">내 실력 점수 ${j.myScore} · 전체 평균 ${j.avgScore}</span>` +
        `<br><span class="dimtxt">외운 단어 나 ${j.myMemo} · 전체 평균 ${j.avgMemo}</span>` +
        `<br><br><span class="dimtxt">실력 점수 = <b>외운 단어 ${sk.memo}개 × 평균 정답률 ${sk.acc}%</b>` +
        `<br>= 믿을 만하게 아는 단어 ${sk.score}개. 위의 실력 분석에서 그대로 나온 값입니다` +
        `(10문제를 넘긴 ${sk.subjects}개 과목만 셉니다).` +
        '<br>많이 누른 사람이 아니라 잘 아는 사람이 위로 갑니다.' +
        '<br>내 등수는 나만 봅니다. 다른 사람의 등수와 이름은 아무에게도 보이지 않습니다.</span>';
      // 항목별로 전체 평균과 내 자리를 나란히
      const rows = RANKKEY.map(k => [RANKNM[k], j.avg[k], (j.myPct || {})[k]])
                          .filter(r => typeof r[1] === 'number');
      if (rows.length) {
        host.append(el('div', 'anahead', '전체 평균과 나'));
        const box = el('div', 'bars');
        rows.forEach(([nm, av, me]) => {
          const r = el('div', 'barrow');
          r.append(el('span', 'bname', nm));
          const bar = el('span', 'bbar avg');
          const fill = el('i');
          fill.style.width = Math.max(2, av) + '%';
          fill.className = 'avgfill';
          bar.append(fill);
          if (typeof me === 'number') {                 // 내 자리를 세로 눈금으로 찍는다
            const pin = el('u');
            pin.style.left = Math.min(99, Math.max(1, me)) + '%';
            bar.append(pin);
          }
          r.append(bar);
          r.append(el('span', 'bpct', typeof me === 'number' ? me + '%' : '—'));
          r.append(el('span', 'bn', '평균 ' + av + '%'));
          box.append(r);
        });
        host.append(box);
        host.append(el('p', 'note', '굵은 막대가 전체 평균, 세로 선이 나입니다. 열 문제를 넘긴 항목만 나옵니다.'));
      }
      host.append(again);
    })
    .catch(() => { body.textContent = '순위를 불러오지 못했습니다.'; host.append(again); });
}

/* ---------- 운영 현황 (운영자만) ----------
   운영을 하려면 몇 명이 쓰는지, 언제 오는지는 알아야 한다.
   그러나 그걸 알기 위해 **누구인지를 알 필요는 없다** — 서버는 별명조차 안 내보낸다.
   주소 뒤에 #admin 을 한 번 붙여 열면 이 화면이 켜진다(그 표시는 이 폰에만 남는다). */
function showAdmin() {
  const b = $('#subBody');
  b.textContent = '';
  b.append(el('p', 'lede', '불러오는 중…'));
  show('sub', '운영 현황', true);
  cCall({ act: 'stats' }).then(j => {
    b.textContent = '';
    b.append(el('p', 'lede', '이번 주 (' + j.week + ' 시작)'));
    const st = el('div', 'stats');
    [['쓴 사람', j.people], ['공부한 사람', j.active], ['단어를 외운 사람', j.started]]
      .forEach(([k, v]) => { const c = el('div', 'stat');
        c.append(el('b', null, String(v)), el('span', null, k)); st.append(c); });
    b.append(st);

    b.append(el('p', 'newsday', '요일별 접속자'));
    const rows = '월화수목금토일'.split('').map((nm, i) =>
      [nm + '요일', j.people ? Math.round(j.byDay[i] * 100 / j.people) : 0, NEED]);
    b.append(bars(rows));
    b.append(el('p', 'dimtxt', j.byDay.map((n, i) => '월화수목금토일'[i] + ' ' + n + '명').join(' · ')));

    // 어디까지 갔다가 그만두는가 — 앱을 고칠 자리를 알려주는 가장 중요한 그림
    if (j.funnel) {
      b.append(el('p', 'newsday', '끝낸 세트 (어디서 멈추는가)'));
      const F = ['0개', '1~2', '3~5', '6~10', '11~20', '21+'];
      b.append(bars(F.map((nm, i) => [nm, j.people ? Math.round(j.funnel[i] * 100 / j.people) : 0, NEED])));
      b.append(el('p', 'dimtxt', j.funnel.map((n, i) => F[i] + ' ' + n + '명').join(' · ')));
    }
    // 아직 하고 있는가 — 시작한 지 오래된 사람 중 최근 사흘 안에 공부한 비율
    if (j.cohort) {
      b.append(el('p', 'newsday', '얼마나 남아 있는가'));
      const C = [['1일 뒤', 0], ['3일 뒤', 1], ['7일 뒤', 2], ['14일 뒤', 3], ['30일 뒤', 4]];
      b.append(bars(C.map(([nm, i]) => [nm, j.cohort[i] ? Math.round(j.alive[i] * 100 / j.cohort[i]) : 0,
                                        j.cohort[i] ? NEED : 0])));
      b.append(el('p', 'dimtxt', C.map(([nm, i]) => nm + ' ' + j.alive[i] + '/' + j.cohort[i]).join(' · ') +
        '<br>시작한 지 그만큼 지난 사람 중, 최근 사흘 안에 공부한 사람 수입니다.'));
    }
    const st2 = el('div', 'stats');
    [['평균 실력 점수', j.avgScore], ['가운뎃값', j.midScore], ['평균 외운 단어', j.avgMemo],
     ['진짜 기억률', (j.trueRet || 0) + '%']]
      .forEach(([k, v]) => { const c = el('div', 'stat');
        c.append(el('b', null, String(v)), el('span', null, k)); st2.append(c); });
    b.append(st2);
    b.append(el('p', 'dimtxt', '<b>진짜 기억률</b> = 다시 볼 때가 된 카드를 첫 시도에 맞힌 비율. ' +
      '간격 반복에서 <b>85~90%</b>가 목표입니다. 낮으면 간격이 너무 벌어진 것이고, ' +
      '너무 높으면 필요 없는 복습을 시키고 있는 것입니다.'));
    // 어느 단어가 발목을 잡는가 — 커리큘럼을 고칠 직접 근거
    if ((j.hardWords || []).length) {
      b.append(el('p', 'newsday', '많은 사람이 틀리는 단어'));
      b.append(el('p', 'dimtxt', j.hardWords.map(w => esc(w[0]) + ' <b>' + w[1] + '명</b>').join(' · ')));
      b.append(el('p', 'dimtxt', '이 단어들은 그림·예문·나오는 순서를 손봐야 할 자리입니다.'));
    }
    b.append(el('p', 'note', '이름도 기기도 알 수 없습니다 — 서버가 숫자만 셉니다. ' +
      '순위판은 주 단위라 월요일 새벽에 0부터 다시 셉니다.'));
    const again = el('button', 'ghost sm', '새로고침');
    again.onclick = showAdmin;
    b.append(again);
  }).catch(e => { b.textContent = ''; b.append(el('p', 'lede', '불러오지 못했습니다')); });
}

/* ---------- 동아리 ----------
   왜 있는가: 혼자 하는 공부는 3주를 못 넘긴다. 사람은 "나만 안 하고 있다"는
   느낌에 가장 잘 움직인다. 그래서 보여 주는 것은 점수가 아니라 도장판이다 —
   누가 이번 주 며칠 나왔는지. 순위는 곁다리로만 둔다(1~5등만 이름 공개).
   서버에 올라가는 것은 별명·도장·외운 단어 수뿐. 실명도 기록도 올리지 않는다. */
const CLUBURL = 'https://viet-club.chaochao-app.workers.dev';
async function cCall(o) {
  const r = await fetch(CLUBURL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify(Object.assign({ nick: S.nick }, o)) });
  const j = await r.json();
  if (j.error === 'gone') { S.club = null; save(); throw new Error('이 동아리는 사라졌습니다.'); }
  if (j.error) throw new Error(j.error);
  return j;
}
const clubBusy = t => { const b = $('#clubBody'); b.textContent = '';
                        b.append(el('p', 'lede', t)); show('club', '동아리', true); };
const clubFail = e => { const b = $('#clubBody'); b.textContent = '';
  b.append(el('p', 'lede', esc(e.message || '연결하지 못했습니다')));
  const again = el('button', 'primary big', '다시'); again.style.width = '100%';
  again.onclick = showClub; b.append(again); show('club', '동아리', true); };

function showClub() {
  if (!S.nick || S.nick === '이름없음') { askNick(); return; }
  clubBusy('불러오는 중…');
  if (S.club) {
    const dots = weekDots();
    cCall({ act: 'report', id: S.club.id, days: dots.map(d => d.done ? 1 : 0),
            memo: skillScore().memo, score: 0 })   // 동아리는 출석만 본다 — 점수는 안 쓴다
      .then(clubHome).catch(e => { if (!S.club) clubList(); else clubFail(e); });
  } else clubList();
}

function clubList() {
  clubBusy('불러오는 중…');
  cCall({ act: 'clubs' }).then(j => {
    const b = $('#clubBody');
    b.textContent = '';
    b.append(el('p', 'lede', '같이 하면 오래 갑니다. 이번 주 누가 며칠 나왔는지 서로 보입니다.'));
    const mk = el('button', 'primary big', '동아리 만들기');
    mk.style.width = '100%'; mk.style.marginBottom = '14px';
    mk.onclick = clubCreate;
    b.append(mk);
    if (!j.clubs.length) b.append(el('p', 'note', '아직 만들어진 동아리가 없습니다. 첫 번째로 만들어 보세요.'));
    j.clubs.forEach(c => {
      const row = el('button', 'bigmenu');
      row.append(el('b', null, esc(c.name)),
                 el('span', 'msub', ` ${c.n}명` + (c.approve ? ' · 승인제' : '')));
      row.onclick = () => {
        clubBusy('들어가는 중…');
        cCall({ act: 'join', id: c.id }).then(r => {
          if (r.state === 'wait') { clubBusy('가입 신청했습니다. 개설자가 받아 주면 들어갑니다.');
                                    const bk = el('button', 'ghost', '목록으로'); bk.onclick = clubList;
                                    $('#clubBody').append(bk); return; }
          S.club = { id: c.id, name: c.name }; save(); showClub();
        }).catch(clubFail);
      };
      b.append(row);
    });
    show('club', '동아리', true);
  }).catch(clubFail);
}

function clubCreate() {
  const b = $('#clubBody');
  b.textContent = '';
  b.append(el('p', 'lede', '어떤 동아리인가요?'));
  const inp = el('input', 'keyin'); inp.type = 'text'; inp.maxLength = 20;
  inp.placeholder = '이름 (예: 빈즈엉 3공장)';
  const ap = el('label', 'chk');
  const cb = el('input'); cb.type = 'checkbox';
  ap.append(cb, el('span', null, '아무나 못 들어오게 (내가 받아 줘야 가입)'));
  const go = el('button', 'primary big', '만들기');
  go.style.width = '100%';
  go.onclick = () => {
    const v = inp.value.trim();
    if (v.length < 2) { inp.focus(); return; }
    clubBusy('만드는 중…');
    cCall({ act: 'create', name: v, approve: cb.checked })
      .then(j => { S.club = { id: j.id, name: j.name }; save(); showClub(); })
      .catch(clubFail);
  };
  b.append(inp, ap, go);
  dive(clubList);                       // 위쪽 뒤로가기로 목록으로 돌아간다
  show('club', '동아리 만들기', true);
  inp.focus();
}

function clubHome(j) {
  S.club = { id: S.club.id, name: j.name }; save();
  const b = $('#clubBody');
  b.textContent = '';
  b.append(el('p', 'lede', esc(j.name) + ' · ' + j.total + '명'));

  // 승인 대기 (개설자에게만)
  (j.wait || []).forEach(w => {
    const row = el('div', 'planrow');
    row.append(el('span', 'pk', '신청'), el('span', 'pv', esc(w)));
    const ok = el('button', 'ghost sm', '받기');
    ok.onclick = () => { clubBusy('처리 중…'); cCall({ act: 'accept', id: S.club.id, who: w })
      .then(showClub).catch(clubFail); };
    row.append(ok);
    b.append(row);
  });

  // 이번 주 도장판 — 이 동아리의 핵심 화면
  const head = el('div', 'phead');
  head.append(el('strong', null, '이번 주 출석'));
  head.append(el('span', 'dimtxt', '월 화 수 목 금 토 일'));
  b.append(head);
  j.members.forEach(m => {
    const row = el('div', 'cmem' + (m.nick === S.nick ? ' me' : ''));
    row.append(el('span', 'cn', esc(m.nick)));
    const dd = el('span', 'dots');
    for (let i = 0; i < 7; i++) dd.append(el('i', 'dot' + ((m.days || [])[i] ? ' on' : '')));
    row.append(dd, el('span', 'cw', (m.memo || 0) + '단어'));
    b.append(row);
  });

  b.append(el('p', 'note', '올라가는 것은 별명과 위 숫자뿐입니다. 배운 내용이나 기록은 올라가지 않습니다.'));
  const others = el('button', 'ghost sm', '다른 동아리 보기');
  others.onclick = clubList;
  const out = el('button', 'ghost sm', '나가기');
  out.onclick = () => {
    if (!confirm(j.name + ' 에서 나갈까요?')) return;
    clubBusy('나가는 중…');
    cCall({ act: 'leave', id: S.club.id })
      .then(() => { S.club = null; save(); clubList(); }).catch(clubFail);
  };
  const row = el('div', 'rolepick');
  row.append(others, out);
  b.append(row);
  show('club', '동아리', true);
}

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

Promise.all([
  fetch('data/days.json', { cache: 'no-cache' }).then(r => r.json()),
  fetch('data/audio_index.json', { cache: 'no-cache' }).then(r => r.json())
]).then(([d, a]) => {
  ALL = [...(d.prep || []), ...d.days];
  DRILL = d.tonedrill || [];
  VDRILL = d.voweldrill || [];
  AIDX = a;
  drawRegion();
  if (!S.nick) { askNick(); return; }                 // 최초 1회
  if (S.wk && S.wk.k !== weekKey()) { showWeek(weekReport(S.wk.base)); return; }
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
