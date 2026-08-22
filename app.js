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
const SONG = {};   // 노래 파일 있는지 확인한 결과
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

/* 지역(북부/남부)에 따른 소리 폴더. 남부는 여성(lannhi) 하나뿐이다. */
const voiceDir = () => S.region === 's' ? 'sf' : S.voice;

function play(text, slow, dir) {
  const h = AIDX[text];
  if (!h) return;
  const d = dir || voiceDir();
  audio.pause();
  audio.onerror = null;
  audio.src = `audio/${d}/${slow ? 'slow' : 'n'}/${h}.mp3`;
  // 남부 파일이 아직 없으면 북부로라도 들려준다
  if (d === 'sf') audio.onerror = () => {
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
    const r = await fetch(GURL(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: '이 녹음은 한국인이 베트남어를 읽은 것이다. 들린 그대로 베트남어 철자로 받아 적어라. 철자만 답하고 다른 말은 붙이지 마라.' },
          { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
        generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) throw new Error(r.status === 429 ? '요청이 잠깐 몰렸습니다 — 1분 뒤 다시 해 보세요' : '연결 실패 (' + r.status + ')');
    const j = await r.json();
    const heard = ((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).trim();
    if (!heard) throw new Error('빈 답이 왔습니다');
    const clean = s => s.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    const bare = s => stripTone(clean(s));
    const exact = clean(heard) === clean(text);
    const close = bare(heard) === bare(text);
    S.stats.pronAll = (S.stats.pronAll || 0) + 1;   // 발음 점수용 — AI가 알아들었는가
    if (exact || close) S.stats.pronOk = (S.stats.pronOk || 0) + 1;
    save();
    note.innerHTML = (exact
      ? '<b>AI가 정확히 "' + esc(heard) + '" 로 받아 적었습니다.</b> 알아들을 수 있는 발음입니다.'
      : close
        ? '<b>AI가 "' + esc(heard) + '" 로 들었습니다.</b> 글자는 맞게 들립니다 — 성조는 위 곡선으로 확인하세요.'
        : 'AI에게는 "<b>' + esc(heard) + '</b>" 로 들렸습니다 (목표: ' + esc(text) + '). 조금 크게, 또박또박 다시 해 보세요.') +
      '<br><span class="dimtxt">참고용 — AI도 성조 구별은 잘 못합니다 (원어민 소리로 실험해 확인했습니다).</span>';
  } catch (e) { note.textContent = 'AI 듣기 실패: ' + (e.message || ''); }
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
    if (!r.ok && voiceDir() === 'sf') r = await fetch(`audio/${S.voice}/slow/${h}.mp3`);
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
const VIEWS = ['home', 'learn', 'quiz', 'tone', 'award', 'rules', 'chat', 'type', 'speak', 'course', 'write', 'news', 'wx', 'guide', 'culture'];
/* 위 북부남부·여남 토글은 소리가 나는 화면에서만 보여준다 — 나머지에선 자리만 차지한다 */
const SNDV = ['learn', 'quiz', 'tone', 'speak', 'type', 'write'];
let CURV = 'home';
function topBtns() {
  const need = SNDV.includes(CURV);
  $('#region').hidden = !need;
  $('#voice').hidden = !need || S.region === 's';
}
function show(v, title, canBack) {
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
  { icon: '🔤', name: '글자를 뗐다',   how: '기초 훈련 3개(글자·성조·자음) 완료', test: () => ['P1','P2','P3'].every(k => S.done[k]) },
  { icon: '📐', name: '규칙을 뗐다',   how: '규칙 수업 4개 완료',            test: () => ['R1','R2','R3','R4'].every(k => S.done[k]) },
  { icon: '👋', name: '첫 5일',        how: '일상 Day 1~5 완료',             test: () => [1,2,3,4,5].every(k => S.done[k]) },
  { icon: '🏭', name: '출근 첫날',     how: '직무 세트 1개 완료',            test: () => ALL.some(d => d.track === 'work' && S.done[d.day]) },
  { icon: '🌓', name: '10세트',        how: '아무 세트나 10개 완료',         test: () => doneCount() >= 10 },
  { icon: '🏔️', name: '25세트',        how: '세트 25개 완료',                test: () => doneCount() >= 25 },
  { icon: '🎖️', name: '50세트',        how: '세트 50개 완료',                test: () => doneCount() >= 50 },
  { icon: '🏁', name: '전 과정 완주',  how: '100세트 전부 완료',             test: () => doneCount() >= 100 },
  { icon: '💯', name: '단어 100',      how: '복습 창고에 단어 100개',        test: () => Object.keys(S.srs).length >= 100 },
  { icon: '📚', name: '단어 300',      how: '복습 창고에 단어 300개',        test: () => Object.keys(S.srs).length >= 300 },
  { icon: '🚀', name: '단어 600',      how: '복습 창고에 단어 600개',        test: () => Object.keys(S.srs).length >= 600 },
  { icon: '👂', name: '성조 8/10',     how: '성조 훈련에서 8점',             test: () => (S.stats.toneBest || 0) >= 8 },
  { icon: '🎯', name: '성조 만점',     how: '성조 훈련에서 10점',            test: () => (S.stats.toneBest || 0) >= 10 },
  { icon: '🗣️', name: '50번 말했다',   how: '소리 내어 50번',                test: () => (S.stats.said || 0) >= 50 },
  { icon: '📢', name: '300번 말했다',  how: '소리 내어 300번',               test: () => (S.stats.said || 0) >= 300 },
  { icon: '📅', name: '한 주 5일',     how: '이번 주 5일 공부',              test: () => weekDots().filter(d => d.done).length >= 5 },
  { icon: '🗓️', name: '30일 출석',     how: '지금까지 총 30일 공부',         test: () => Object.keys(S.act).length >= 30 },
  { icon: '🔁', name: '복습 20판',     how: '복습 퀴즈 20번 완료',           test: () => (S.stats.rev || 0) >= 20 },
  { icon: '💬', name: 'AI와 첫 대화',  how: 'AI 대화 한 번 시작',            test: () => (S.stats.chat || 0) >= 1 }
];

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
  const got = BADGES.filter(x => x.test()).length;
  const sh = el('button', 'primary big', '자랑 카드 만들기');
  sh.style.width = '100%'; sh.style.marginBottom = '14px';
  sh.onclick = shareCard;
  b.append(sh);
  b.append(el('p', 'lede', `딴 업적 <b>${got}</b> / ${BADGES.length}`));
  BADGES.forEach(bg => {
    const on = bg.test();
    const row = el('div', 'awrow' + (on ? ' on' : ''));
    row.append(el('span', 'awi', bg.icon),
               el('span', 'awn', esc(bg.name)),
               el('span', 'awh', on ? '달성 ✔' : esc(bg.how)));
    b.append(row);
  });
  show('award', '업적', true);
}

function renderProgress() {
  const box = $('#progress');
  box.textContent = '';

  const dots = weekDots();
  const n = dots.filter(d => d.done).length;
  const head = el('div', 'phead');
  head.append(el('strong', null, '이번 주 ' + n + ' / 5일'));
  if (n >= 5) head.append(el('span', null, '목표 달성 ✔'));
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
  [['배운 단어', words], ['외운 단어', memo], ['끝낸 세트', days], ['소리 낸 횟수', S.stats.said || 0]]
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
  const more = el('button', 'ghost sm', `업적 ${got.length} / ${BADGES.length}`);
  more.onclick = renderAwards;
  bd.append(more);
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
  $('#goWeekly').hidden = weekWords().length < 10;
}

/* ---------- 홈 ---------- */
const allWords = () => ALL.flatMap(d => d.words || []);
function dueWords() {
  const n = now();
  return Object.entries(S.srs).filter(([, v]) => v.due <= n).map(([k]) => k);
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

/* 오늘 할 세트 — 일상·직무를 번갈아 추천. 기본기(모음·성조 등)는 일정에 안 넣는다(각자 알아서). */
function nextDay() {
  const daily = ALL.find(d => typeof d.day === 'number' && !d.track && !S.done[d.day]);
  const work = ALL.find(d => d.track === 'work' && !S.done[d.day] && visibleDay(d));
  if (daily && work) {
    const nd = ALL.filter(d => typeof d.day === 'number' && !d.track && S.done[d.day]).length;
    const nw = ALL.filter(d => d.track === 'work' && S.done[d.day]).length;
    return nd <= nw ? daily : work;
  }
  return daily || work;
}

function renderHome() {
  renderProgress();
  renderWeekly();
  const nx = nextDay();
  const due = dueWords();
  $('#goReview').textContent = due.length ? '복습 ' + due.length : '복습';

  // 오늘·내일 일정판 — 뭘 하게 될지 미리 보이고, 버튼 하나로 바로 들어간다
  const plan = $('#plan');
  plan.textContent = '';
  // 행 자체를 누르면 바로 실행된다
  const prow = (k, v, act, fn) => {
    const r = el('div', 'planrow' + (fn ? ' go' : ''));
    r.append(el('span', 'pk', k), el('span', 'pv', esc(v)));
    if (fn) { r.append(el('span', 'parrow', act + ' ›')); r.onclick = fn; }
    plan.append(r);
  };
  const doneToday = Object.entries(S.done)
    .some(([k, v]) => +k >= 1 && typeof v === 'number' && ymd(v) === ymd());   // 세트(Day)만 센다
  // 오늘 학습
  if (doneToday) prow('오늘 학습', '완료', null, null);
  else if (nx) prow('오늘 학습', trackName(nx) + label(nx) + ' · ' + nx.theme + ' — 미완', '시작', () => startLearn(nx));
  else prow('오늘 학습', '없음 — 전 과정 완료', null, null);
  // 오늘 복습
  if (due.length) prow('오늘 복습', due.length + '장 — 미완', '시작', () => reviewStart());
  else prow('오늘 복습', S.revDay === ymd() ? '완료' : '없음', null, null);
  // 내일 학습 (+예습)
  const tset = doneToday ? nx : nextAfter(nx);
  if (tset) prow('내일 학습', trackName(tset) + label(tset) + ' · ' + tset.theme,
    (tset.words || []).length ? '예습 10초' : null,
    (tset.words || []).length ? () => flashRun(tset.words, '예습 · ' + trackName(tset) + label(tset)) : null);
  // 내일 복습 — 내일 새로 나올(만기되는) 카드 수
  const tmr = Object.values(S.srs).filter(v => v.due > now() && v.due <= now() + DAY).length;
  prow('내일 복습', tmr ? tmr + '장 예정' : '없음', null, null);

  show('home', '짜오짜오', false);
}

/* 오늘 것 다음에 올 세트 — 일상·직무를 번갈아 추천하는 규칙 그대로 한 걸음 앞을 본다 */
function nextAfter(nx) {
  if (!nx) return null;
  const first = t => ALL.find(d => typeof d.day === 'number'
    && (t === 'work' ? d.track === 'work' : !d.track) && !S.done[d.day] && d !== nx && visibleDay(d));
  if (typeof nx.day === 'string') {
    return ALL.find(d => typeof d.day === 'string' && !S.done[d.day] && d !== nx)
      || first('daily') || first('work');
  }
  return (nx.track === 'work' ? first('daily') : first('work'))
    || first(nx.track === 'work' ? 'work' : 'daily');
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
    li.append(el('span', null, '내 업종만 보기 '));
    ['봉제', '전자', '사무'].forEach(c => {
      const on = !hiddenCats().includes(c);
      const bb = el('button', 'ghost sm' + (on ? ' pick' : ''), c);
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
    b.onclick = () => startLearn(d);
    const li = el('li'); li.append(b);
    if (done) {                          // 완료 표시는 유저가 되돌릴 수 있다
      const u = el('button', 'ghost sm undo', '미완으로');
      u.onclick = () => { delete S.done[d.day]; save(); renderDays(track); };
      li.append(u);
    }
    list.append(li);
  });
  show('course', track === 'work' ? '직무 과정' : '일상 과정', true);
}

/* ---------- 학습 ---------- */
let L = null;

function startLearn(d) {
  // 순서: 단어 카드 → 확인 문제(암기 다지기) → 오늘의 대화(문장으로 써먹기).
  // 문장이 마무리인 이유: 외운 것을 산출(말하기)로 끝내야 하루가 완성된다.
  const items = [];
  (d.letters || []).forEach(x => items.push({ k: 'letter', d: x }));
  (d.tones || []).forEach(x => items.push({ k: 'tone', d: x }));
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  L = { day: d, items, i: 0 };
  $('#learnIntro').textContent = d.intro || '';
  $('#learnIntro').dataset.prep = (d.words || []).length ? '0' : '1';
  drawCard();
  // 제목은 버튼 이름과 같게 — 준비 날들은 주제만 (준비 N 표기는 뺀다)
  show('learn', typeof d.day === 'string' ? d.theme : label(d) + ' · ' + d.theme, true);
}

/* 단어의 예문 — 새로 짓지 않고 그날 대화·바꿔말하기에서 그 단어가 든 문장을 꺼내 쓴다.
   (모든 단어가 그날 문장 어딘가에 나오는 것은 조립 검증기가 보장한다. 음원도 이미 있다.) */
function exampleFor(day, w) {
  const nm = s => s.toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const target = nm(w.vi);
  const hitLine = (day.dialog?.lines || []).find(l => (' ' + nm(l.vi) + ' ').includes(' ' + target + ' '));
  if (hitLine) return { vi: hitLine.vi, ko: hitLine.ko, kr: hitLine.kr_read };
  const hitEx = (day.dialog?.extra || []).map(t => typeof t === 'string' ? { vi: t } : t)
    .find(o => (' ' + nm(o.vi) + ' ').includes(' ' + target + ' '));
  if (hitEx) return { vi: hitEx.vi, ko: hitEx.ko, kr: hitEx.kr_read };
  return null;
}

/* 한글 독음: 기본 숨김. 시작 14일 뒤에는 아예 안 나온다 */
/* 한글 발음 — 항상 보여준다 (사용자 지시) */
function reveal(txt) {
  return txt ? el('div', 'krline', '[' + esc(txt) + ']') : el('span');
}

function drawCard() {
  resetRec();
  const c = $('#card');
  c.textContent = '';
  const it = L.items[L.i], x = it.d;

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

  if (it.k === 'rule') {
    // 규칙 예문 — 단어 카드와 같은 차림새 + 규칙 설명 한 줄
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(toneRow(x.tones));
    c.append(reveal(x.kr));
    c.append(el('div', 'ko', esc(x.ko)));
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
    c.append(speakRow(x.vi, true));
  }

  if (it.k === 'word') {
    // 순서 통일: 그림 → 단어 → 성조 화살표 → 한글 발음 → 뜻 → (한자·남부) → 예문 → 소리 줄
    const p = pic(x, 'pic'); if (p) c.append(p);
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(toneRow(x.tones));
    c.append(reveal(x.kr_read));
    c.append(el('div', 'ko', esc(x.ko)));
    if (x.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(x.hanja)));
    if (x.south) c.append(el('div', 'south', '남부에서는 ' + esc(x.south)));
    const exm = exampleFor(L.day, x);
    if (exm) {
      const eb = el('div', 'wex');
      eb.append(el('div', 'wexvi', esc(exm.vi)));
      if (exm.kr) eb.append(el('div', 'wexkr', '[' + esc(exm.kr) + ']'));
      if (exm.ko) eb.append(el('div', 'wexko', esc(exm.ko)));
      const pb = el('button', 'ghost sm', '예문 듣기');
      pb.onclick = () => play(exm.vi, false);
      eb.append(pb);
      c.append(eb);
    }
    c.append(speakRow(x.vi, true));
  }

  if (it.k === 'dialog') {
    c.classList.add('wide');
    c.append(el('div', 'setbadge daily', '오늘의 대화 · ' + esc(x.title)));
    const p = pic(x, 'pic'); if (p) c.append(p);
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
  const KIND = { letter: '글자', tone: '성조', word: '단어', dialog: '대화', rule: '예문' };
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
  $('#next').textContent = last ? ((L.day.words || []).length ? '확인 문제 ›'
    : L.day.rule ? '연습 문제 ›'
    : L.day.day === 'P1' || L.day.day === 'P2' ? '귀로 구별하기 ›' : '완료 ›') : '다음 ›';
}

$('#prev').onclick = () => { if (!$('#learn').hidden && L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  // 연타 방지는 시간이 아니라 '아직 이 화면에 있는가'로 판단한다.
  // 시간으로 막으면 앞 화면에서 막 넘어온 사람까지 막힌다.
  if ($('#learn').hidden) return;
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if (L.dlg) {                         // 대화(써먹기)까지 끝나면 오늘 완료
    S.done[L.day.day] = now(); touchToday(); save();
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
  let moved = false;
  const go = () => {
    if (moved || $('#quiz').hidden || !FL) return;
    moved = true; clearTimeout(tm); audio.onended = null;
    FL.i++; drawFlash();
  };
  audio.pause();
  audio.src = `audio/${voiceDir()}/n/${AIDX[w.vi]}.mp3`;
  audio.currentTime = 0;
  audio.onended = () => setTimeout(go, 300);
  audio.play().catch(() => { });
  const tm = setTimeout(go, 3000);       // 소리가 안 나도 멈추지 않게
  c.onclick = go;                        // 급하면 눌러서 바로 다음
}

/* 확인 문제 뒤의 마무리 — 오늘 배운 문장을 실제로 써먹는다 */
function startDialog(d) {
  L = { day: d, items: [{ k: 'dialog', d: d.dialog }], i: 0, dlg: true };
  $('#learnIntro').textContent = '외운 단어를 문장으로 써먹을 차례입니다. 한 줄씩 따라 말해 보세요.';
  $('#learnIntro').dataset.prep = '0';
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

function buildQuestions(words) {
  const pool = allWords();
  return words.map(w => {
    const lv = (S.srs[w.vi] || {}).lv || 0;
    // 익숙해진 단어(2단계 이상)는 보기 없이 직접 떠올리게 한다.
    // 받아쓰기(dict)는 1단계부터 가끔 섞는다 — 듣기·철자·성조를 한 번에 시험한다.
    const mode = lv >= 2 ? (Math.random() < .3 && AIDX[w.vi] ? 'dict' : 'recall')
      : lv >= 1 && AIDX[w.vi] && Math.random() < .3 ? 'dict'
      : (Math.random() < .5 && AIDX[w.vi] ? 'listen' : 'meaning');
    const others = pool.filter(x => x.vi !== w.vi).sort(() => Math.random() - .5).slice(0, 3);
    return { w, mode, opts: [w, ...others].sort(() => Math.random() - .5) };
  }).sort(() => Math.random() - .5);
}

function startQuiz(words, day, cap, early) {
  let src = words || dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
  if (!src.length) { renderHome(); return; }
  if (cap) src = src.slice(0, cap);            // 짧게 끊어 하는 모드
  const list = buildQuestions(src);
  Q = { list, i: 0, ok: 0, day, total: list.length, early };
  drawQuiz();
  show('quiz', day ? '확인 문제' : (cap ? '3분 복습' : '복습'), true);
}

/* 복습 입구 — 처음이거나 꺼낼 카드가 없으면 방식부터 설명한다.
   전에는 카드가 없으면 말없이 홈으로 돌아가서 버튼이 죽은 것처럼 보였다.
   설명은 홈의 [방식] 버튼으로 언제든 다시 볼 수 있다. */
function reviewStart(cap) {
  const due = dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
  if (S.revSeen && due.length) { startQuiz(due, null, cap); return; }
  drawRevInfo(cap);
}
function drawRevInfo(cap) {
  const due = dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
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
    '<b>[전부]</b>가 곧 공부법 책들이 말하는 그 복습입니다 — 간격 반복 + 직접 떠올리기 + 즉시 피드백. ' +
    '<b>[간략]</b>은 바쁜 날용 훑기(자동 넘김)라 효과는 약하고, <b>따라 말하기·손글씨·자판</b>은 같은 단어를 입·손으로 복습하는 다른 방식입니다.'));
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
  const LABEL = { listen: '듣고 고르세요', meaning: '뜻을 고르세요', recall: '소리 내어 말해 보세요', dict: '듣고 글자를 만들어 보세요' };
  body.append(el('div', 'q', LABEL[q.mode]));

  if (q.mode === 'recall') return drawRecall(body, q);
  if (q.mode === 'dict') return drawDict(body, q);

  if (q.mode === 'listen') {
    const wrap = el('div', 'qplay');
    const b = el('button', 'primary big', '듣기');
    b.onclick = () => play(q.w.vi, false);
    const sl = el('button', 'ghost', '느리게 듣기');
    sl.onclick = () => play(q.w.vi, true);
    wrap.append(b, sl);
    body.append(wrap);
    play(q.w.vi, false);
  } else {
    body.append(el('div', 'qmain', esc(q.w.vi)));
    const sr = soundRow(q.w.vi, true);   // 복습에서도 글자만 보지 말고 소리를 같이 듣는다
    sr.classList.add('mid');
    body.append(sr);
  }

  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const b = el('button');
    b.dataset.vi = o.vi;
    if (q.mode === 'listen') {          // 단어만 덜렁 있지 않게 — 뜻도 같이
      b.append(el('span', 'ovi', esc(o.vi)), el('span', 'oko', esc(o.ko)));
    } else b.textContent = o.ko;
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
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
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

/* 회상형 — 보기를 주지 않고 직접 떠올려 소리 내게 한다.
   4지선다는 아는 것처럼 보이게 만든다(실제보다 20% 과대평가). 회상이 진짜다.
   게다가 소리 내어 말하므로 산출 효과까지 같이 얻는다. 채점은 본인이 한다. */
function drawRecall(body, q) {
  body.append(el('div', 'qmain', esc(q.w.ko)));
  { const p = pic(q.w, 'pic mid'); if (p) body.append(p); }

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
    ans.append(reveal(q.w.kr_read));
    const sr = soundRow(q.w.vi, true);
    sr.classList.add('mid');
    ans.append(sr);
    body.append(ans);

    const grade2 = el('div', 'opts');
    const ok = el('button', null, '✓ 맞았어요');
    ok.onclick = () => { fxTone(true); grade(q.w.vi, true, Q.early); Q.ok++; Q.i++; drawQuiz(); };
    const no = el('button', null, '✗ 못 맞혔어요');
    no.onclick = () => { grade(q.w.vi, false); requeue(q); Q.i++; drawQuiz(); };
    grade2.append(ok, no);
    body.append(grade2);
  };
}

function answer(btn, correct, w) {
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
  if (correct) setTimeout(() => { Q.i++; drawQuiz(); }, 450);
  else nextBtn($('#quizBody'), () => { Q.i++; drawQuiz(); });
}

/* 틀린 문제를 같은 판 뒤쪽에 한 번만 다시 넣는다.
   틀린 채로 끝내면 그 기억이 남는다. 맞히고 끝내야 한다. */
function requeue(q) {
  if (q.retry) return;                          // 두 번은 안 미룬다
  Q.list.push({ ...q, retry: true });
}

function grade(vi, ok, early) {
  touchToday();
  // 암기 점수용 계수기 — 인출 시도와 성공을 센다
  S.stats.qAll = (S.stats.qAll || 0) + 1;
  if (ok) S.stats.qOk = (S.stats.qOk || 0) + 1;
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
      if (good) S.stats.earOk = (S.stats.earOk || 0) + 1;
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
      if (good) S.stats.earOk = (S.stats.earOk || 0) + 1;
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
      if (good) { T.ok++; S.stats.earOk = (S.stats.earOk || 0) + 1; }
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
        tones: tns('Em:ngang, chào:huyền, anh:ngang'), note: '상대가 손위 남자(anh)면, 나는 em' },
      { vi: 'Anh chào em.', ko: '(손아래에게) 안녕', kr: '아잉 짜오 앰',
        tones: tns('Anh:ngang, chào:huyền, em:ngang'), note: '상대가 손아래(em)면, 이번엔 내가 anh' },
      { vi: 'tôi', ko: '나 (누구에게나)', kr: '또이',
        tones: tns('tôi:ngang'), note: '상대를 잘 모를 땐 tôi — 실례가 아니다' }],
    quiz: [{ q: '손위 남자에게 인사합니다. "나"는?', opts: ['em', 'anh'], a: 0, say: 'Em chào anh.' },
           { q: '손아래 직원에게 인사합니다. 이번엔 "나"는?', opts: ['anh', 'em'], a: 0, say: 'Anh chào em.' },
           { q: '처음 보는 사람 앞에서 실례 없는 "나"는?', opts: ['tôi', 'em'], a: 0 }] },
  { key: 'R2', title: '어순',
    intro: '꾸미는 말이 뒤에 옵니다. 한국어와 정반대 — 이것 하나만 뒤집으면 문장이 만들어집니다.',
    cards: [
      { vi: 'người tốt', ko: '좋은 사람', kr: '응으어이 똣',
        tones: tns('người:huyền, tốt:sắc'), note: '사람(người) + 좋은(tốt) — 꾸미는 말이 뒤' },
      { vi: 'tên của tôi', ko: '내 이름', kr: '뗀 꾸어 또이',
        tones: tns('tên:ngang, của:hỏi, tôi:ngang'), note: '이름(tên) + 의(của) + 나(tôi)' },
      { vi: 'hộp này', ko: '이 상자', kr: '홉 나이',
        tones: tns('hộp:nặng, này:huyền'), note: '상자(hộp) + 이(này)' }],
    quiz: [{ q: '"좋은 사람"은?', opts: ['người tốt', 'tốt người'], a: 0, say: 'người tốt' },
           { q: '"내 이름"은?', opts: ['tên của tôi', 'tôi của tên'], a: 0, say: 'tên của tôi' },
           { q: '"이 상자"는?', opts: ['hộp này', 'này hộp'], a: 0, say: 'hộp này' }] },
  { key: 'R3', title: '단위',
    intro: '숫자 뒤에는 단위가 붙습니다. 한국어의 개·마리·대와 같습니다 — 세 개면 초급은 넘어갑니다.',
    cards: [
      { vi: 'hai cái', ko: '두 개 (물건)', kr: '하이 까이',
        tones: tns('hai:ngang, cái:sắc'), note: '물건은 cái' },
      { vi: 'ba con', ko: '세 마리 (동물)', kr: '바 껀',
        tones: tns('ba:ngang, con:ngang'), note: '동물은 con' },
      { vi: 'một chiếc', ko: '한 대 (기계·탈것)', kr: '못 찌엑',
        tones: tns('một:nặng, chiếc:sắc'), note: '기계·탈것은 chiếc' }],
    quiz: [{ q: '물건 두 개 — 알맞은 쪽은?', opts: ['hai cái', 'hai con'], a: 0, say: 'hai cái' },
           { q: '동물 세 마리는?', opts: ['ba con', 'ba cái'], a: 0, say: 'ba con' },
           { q: '기계 한 대는?', opts: ['một chiếc', 'một cái'], a: 0, say: 'một chiếc' }] },
  { key: 'R4', title: '남부 소리',
    intro: '남부(호찌민 쪽)는 글은 완전히 같고 소리가 다릅니다. 위의 북부 버튼을 눌러 남부 소리로 바꿔 비교하며 들어 보세요.',
    cards: [
      { vi: 'dạ', ko: '네 (공손)', kr: '북부 자 → 남부 야',
        tones: tns('dạ:nặng'), note: 'd·gi·v가 남부에서 "이(y)" 소리가 된다' },
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

let RL = null;
function startRule(i) {
  const r = RULES[i];
  // 다른 학습과 같은 카드 화면으로 가르친다 — 카드가 끝나면 연습 문제
  L = { day: { day: r.key, theme: r.title, intro: r.intro, words: [], rule: r },
        items: r.cards.map(c => ({ k: 'rule', d: c })), i: 0 };
  $('#learnIntro').textContent = r.intro;
  $('#learnIntro').dataset.prep = '0';
  drawCard();
  show('learn', r.title, true);
}
function drawRule() {
  const b = $('#rulesBody');
  b.textContent = '';
  const r = RL.r;

  if (RL.i >= r.quiz.length) {          // 결과
    S.done[r.key] = now(); touchToday(); save();
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
  const due = dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
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
  show('type', '자판 연습', true);
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

/* ---------- 따라 말하기 연습 ---------- */
let SP = null;
function startSpeak() {
  const ws = practiceWords(8).filter(w => AIDX[w.vi]);
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
  b.append(el('div', 'q', `${SP.i + 1} / ${SP.list.length} · 듣고 따라 말해 보세요`));
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
async function aiRead(target, cv, box, retried) {
  const note = el('div', 'cmpnote ainote', 'AI 선생님이 보는 중…');
  box.querySelector('.ainote')?.remove();
  box.append(note);
  try {
    const b64 = cv.toDataURL('image/png').split(',')[1];
    const r = await fetch(GURL(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: '사진은 한국인 학습자가 손으로 쓴 베트남어다. 목표 단어는 "' + target + '".\n' +
                  '딱 세 줄로, 한국어로 답한다:\n1) 읽힘: (손글씨가 읽히는 그대로)\n' +
                  '2) 짚기: 목표와 다른 글자나 빠진·잘못 붙인 성조 부호. 없으면 "잘 썼습니다"\n' +
                  '3) 조언: 글씨 모양이나 부호 위치에 대한 한 줄 조언' },
          { inline_data: { mime_type: 'image/png', data: b64 } }] }],
        generationConfig: { maxOutputTokens: 250, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) throw new Error(r.status === 429 ? '요청이 잠깐 몰렸습니다 — 1분 뒤 다시 해 보세요' : '연결 실패 (' + r.status + ')');
    const j = await r.json();
    const t = ((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).trim();
    if (!t) throw new Error('빈 답이 왔습니다');
    note.innerHTML = esc(t).replace(/\n/g, '<br>') +
      '<br><span class="dimtxt">참고용 — 흘려 쓰면 AI도 잘못 읽습니다. 기본은 정답 보기로 직접 비교.</span>';
  } catch (e) {
    if (!retried && /몰렸/.test(e.message || '')) {
      let s = 30;
      const iv = setInterval(() => {
        if (!note.isConnected) { clearInterval(iv); return; }   // 화면을 떠났으면 그만둔다
        note.textContent = `지금 요청이 몰려 있습니다 — ${s}초 뒤 자동으로 다시 시도합니다`;
        if (s-- <= 0) { clearInterval(iv); aiRead(target, cv, box, true); }
      }, 1000);
    } else note.textContent = 'AI 점검 실패: ' + (e.message || '');
  }
}

/* ---------- AI 대화 ----------
   대화 시스템으로 연습하면 말하기가 는다는 메타분석이 있다(말하기 d=0.84).
   단, 왕초보에게는 자유대화보다 '배운 단어 안의 제한 대화'가 낫다 —
   그래서 지금까지 배운 단어 목록을 매번 같이 보낸다.
   키는 이 기기에만 저장되고 백업에는 안 들어간다. 대화 내용은 구글 서버로 간다. */
let CH = null;
/* AI 중계 서버 — 키를 서버가 숨겨 들고 있어서 누구나 키 없이 쓴다.
   (2026-08-22 개통. 비우면 예전 방식(각자 키)으로 돌아간다) */
const PROXY = 'https://viet-ai.chaochao-app.workers.dev';
const aiReady = () => !!(PROXY || S.gkey);
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
  if (vs.length >= 2) u.voice = vs[male ? 1 : 0];          // 목소리가 둘이면 갈라 쓴다
  else if (vs.length) { u.voice = vs[0]; u.pitch = male ? .7 : 1.1; }  // 하나뿐이면 높낮이로
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
  if (userText) { CH.hist.push({ role: 'user', parts: [{ text: userText }] }); bubble('me', userText); }
  const wait = bubble('ai wait', '…');
  try {
    const r = await fetch(GURL(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: CH.sys }] },
        contents: CH.hist.slice(-12),          // 최근 12마디만 보낸다 (무료 한도 아끼기)
        generationConfig: { maxOutputTokens: 800, temperature: .6, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) throw new Error(
      r.status === 400 || r.status === 403
        ? (PROXY ? '서버 연결에 문제가 있습니다. 잠시 뒤 다시 해 보세요'
                 : '키가 잘못됐거나 만료됐습니다. 아래에서 키를 지우고 다시 넣어 보세요')
        : r.status === 429 ? '요청이 잠깐 몰렸습니다 — 1분 뒤 다시 보내 보세요. 계속 그러면 오늘 무료 한도가 끝난 것입니다'
        : '연결이 안 됩니다 (' + r.status + ')');
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    if (!text) throw new Error('빈 답이 왔습니다. 한 번 더 보내 보세요');
    CH.hist.push({ role: 'model', parts: [{ text }] });
    wait.remove();
    aiBubble(text);
  } catch (e) {
    wait.remove();
    bubble('ai err', '⚠ ' + (e.message || '연결 실패'));
  }
}

function startChat() {
  $('#chatLog').textContent = '';
  $('#chatForm').hidden = true;
  $('#tch').hidden = true;
  CH = null;
  if (!aiReady()) renderChatKey(); else renderChatModes();
  show('chat', 'AI 대화', true);
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

function renderChatModes() {
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';

  // 선생님 고르기 — 캐릭터와 목소리가 같이 바뀐다
  const tp = el('div', 'chatmode on');
  tp.innerHTML = '<b>선생님 고르기</b>';
  const gp = el('div', 'rolepick');
  [['f', 'Cô Linh (여)'], ['m', 'Thầy Nam (남)']].forEach(([k, txt]) => {
    const bb = el('button', 'ghost sm' + ((S.tch || 'f') === k ? ' pick' : ''), txt);
    bb.onclick = () => { S.tch = k; save(); renderChatModes(); };
    gp.append(bb);
  });
  tp.append(gp);
  s.append(tp);

  const t = todayDay();
  const m1 = el('div', 'chatmode on');
  m1.innerHTML = '<b>오늘의 대화 이어가기</b><span>' + esc(label(t) + ' · ' + (t.dialog?.title || '')) + ' — 배운 문장으로 역할극</span>';
  const rr = el('div', 'rolepick');
  [['A', '내가 A 역할'], ['B', '내가 B 역할']].forEach(([k, txt]) => {
    const bb = el('button', 'ghost sm', txt);
    bb.onclick = () => beginChat('today', k);
    rr.append(bb);
  });
  m1.append(rr);
  const m2 = el('button', 'chatmode');
  m2.innerHTML = '<b>자유 대화</b><span>아주 쉬운 베트남어로 아무 얘기나</span>';
  m2.onclick = () => beginChat('free');
  const m3 = el('button', 'chatmode');
  m3.innerHTML = '<b>사진 보며 대화</b><span>지금 눈앞의 것을 찍어서 그걸로 대화</span>';
  m3.onclick = () => beginChat('photo');
  s.append(m1, m2, m3);
  s.append(el('p', 'note', 'AI는 연습 상대이지 선생님이 아닙니다 — 이상한 문장이 오면 그냥 넘어가세요.<br>' +
    '문장 소리는 폰에 베트남어 음성이 있을 때만 나옵니다 (안드로이드는 대부분 있음).'));
  if (S.gkey) {                          // 개인 키를 쓰는 사람에게만 보인다
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
  if (mode === 'photo') {              // 첫 사진이 오면 그때 대화가 시작된다
    CH = { mode, sys: chatSys('free'), hist: [] };
    camIn.click();
    return;
  }
  CH = { mode, sys: chatSys(mode, myRole, day), hist: [{ role: 'user', parts: [{ text: '(대화를 시작해 주세요)' }] }] };
  chatSend(null);
}

/* 복습 [대화] — 끝낸 세트의 문장으로 AI 선생님과 역할극 (오늘 것뿐 아니라 지난 것도) */
function startTalk() {
  if (!aiReady()) { startChat(); return; }
  $('#chatLog').textContent = '';
  $('#chatForm').hidden = true;
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
      btn.textContent = '말로'; btn.disabled = true;
      const url = URL.createObjectURL(new Blob(chunks));
      try {
        const b64 = await recToWav(url);
        const r = await fetch(GURL(), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [
              { text: '녹음은 한국인이 베트남어(또는 한국어)로 말한 것이다. 들린 그대로만 받아 적어라. 다른 말 금지.' },
              { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
            generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
          })
        });
        const j = await r.json();
        const heard = ((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).trim();
        if (heard) chatSend(heard);
        else bubble('ai err', '⚠ 못 알아들었습니다. 다시 말해 보세요');
      } catch (e) { bubble('ai err', '⚠ 듣기 실패 — 다시 해 보세요'); }
      URL.revokeObjectURL(url);
      btn.disabled = false;
    };
    MIC.start();
    btn.textContent = '멈추기';
    setTimeout(() => { if (MIC && MIC.state === 'recording') MIC.stop(); }, 8000);
  } catch (e) { bubble('ai err', '⚠ 마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요'); }
};

/* 사진 보며 대화 — 폰 카메라로 찍은 사진을 줄여서(512px) 대화에 붙인다.
   실시간 영상은 무료 한도로 무리지만, 사진 한 장씩은 같은 무료 호출에 들어간다. */
function shrinkImg(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 512 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', .7).split(',')[1]);
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
    { text: '(사진을 보여주며) 이것 봐!' },
    { inline_data: { mime_type: 'image/jpeg', data: b64 } }] });
  chatSend(null);
};

/* ---------- 시작 ---------- */
$('#back').onclick = renderHome;
$('#goChat').onclick = startChat;
$('#goSpeak').onclick = startSpeak;
$('#goVowelE').onclick = vowelEntry;
$('#goCons').onclick = () => { const d = ALL.find(x => x.day === 'P3'); if (d) startLearn(d); };
$('#goDaily').onclick = () => renderDays('daily');
$('#goWork').onclick = () => renderDays('work');
$('#goWrite').onclick = startWrite;
$('#goType').onclick = startType;
$('#goNews').onclick = showNews;
document.querySelectorAll('[data-rule]').forEach(b => b.onclick = () => startRule(+b.dataset.rule));

/* 날씨·시간 — 베트남 시각(실시간)과 하노이·호찌민 한 주 예보.
   무료 기상 서비스(Open-Meteo, 키·가입 불필요)라 운영비 0원 원칙에 맞다. */
const WXICON = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
  80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
let WXI = null;
function showTime() {
  show('wx', '시간', true);            // 시계가 화면 표시 여부로 스스로 꺼지므로 먼저 보여준다
  const b = $('#wxBody');
  b.textContent = '';
  b.append(el('p', 'newsday', '베트남 시각 — 한국보다 2시간 늦습니다'));
  const clock = el('div', 'wxclock');
  const kr = el('p', 'note');
  b.append(clock, kr);
  const tick = () => {
    if ($('#wx').hidden) { clearInterval(WXI); return; }
    clock.textContent = new Intl.DateTimeFormat('ko-KR',
      { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
    kr.textContent = '한국 지금: ' + new Intl.DateTimeFormat('ko-KR',
      { timeStyle: 'short' }).format(new Date());
  };
  clearInterval(WXI); WXI = setInterval(tick, 1000); tick();
}
function showWx() {
  show('wx', '날씨', true);
  const b = $('#wxBody');
  b.textContent = '';
  const box = el('div', null, '날씨를 불러오는 중…');
  b.append(box);
  fetch('https://api.open-meteo.com/v1/forecast?latitude=21.03,10.82&longitude=105.85,106.63' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok')
    .then(r => r.json()).then(js => {
      box.textContent = '';
      const arr = Array.isArray(js) ? js : [js];
      ['하노이 (북부)', '호찌민 (남부)'].forEach((name, i) => {
        const d = arr[i] && arr[i].daily;
        if (!d) return;
        const cty = i === 0 ? 'n' : 's';
        box.append(el('p', 'newsday', name));
        box.append(el('p', 'note', wxSeason(cty)));
        const row = el('div', 'wxrow');
        d.time.forEach((t, k) => {
          const day = new Date(t + 'T00:00');
          const cell = el('div', 'wxday' + (k === 0 ? ' today' : ''));
          cell.append(el('span', null, k === 0 ? '오늘' : ['일', '월', '화', '수', '목', '금', '토'][day.getDay()]),
                      el('i', null, WXICON[d.weather_code[k]] || '☁️'),
                      el('b', null, Math.round(d.temperature_2m_max[k]) + '°'),
                      el('em', null, Math.round(d.temperature_2m_min[k]) + '°'));
          row.append(cell);
        });
        box.append(row);
        box.append(el('p', 'newsday', '월별 평균 기온 · 강수량'));
        box.append(wxTable(cty));
      });
    }).catch(() => { box.textContent = '날씨를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'; });
}

/* 기후 특징 — 달과 무관하게 항상 다 보여준다 + 월별 평균 기온·강수량 */
function wxSeason(city) {
  return city === 'n'
    ? '사계절: 봄(2~4월) 흐리고 이슬비 · 여름(5~8월) 무덥고 소나기 · 가을(9~11월) 맑고 선선 · 겨울(12~1월) 15도 안팎, 난방 없어 체감 추움'
    : '연중 더움(27도 안팎): 우기(5~10월) 오후 한때 소나기 매일 · 건기(11~4월) 비 없이 맑음';
}
const WXCLIMATE = {   // 월별 평균 기온(도) / 강수량(mm) — 기상 평년값 기준
  n: [[17, 18], [18, 26], [20, 44], [24, 90], [28, 189], [30, 240], [30, 288], [29, 318], [28, 265], [26, 131], [22, 43], [18, 23]],
  s: [[26, 14], [27, 4], [28, 10], [30, 50], [29, 218], [28, 312], [28, 294], [28, 270], [27, 327], [27, 267], [27, 117], [26, 48]],
};
function wxTable(city) {
  const cur = new Date().getMonth();
  const wrap = el('div', 'wxscroll');
  const row = el('div', 'wxrow wxclim');
  WXCLIMATE[city].forEach(([t, r], i) => {
    const cell = el('div', 'wxday' + (i === cur ? ' today' : ''));
    cell.append(el('span', null, (i + 1) + '월'),
                el('b', null, t + '°'),
                el('em', null, r + 'mm'));
    row.append(cell);
  });
  wrap.append(row);
  return wrap;
}

/* 사용법 — 이 앱이 왜 이렇게 생겼는지, 어떻게 쓰면 가장 남는지 (근거 요약) */
function showGuide() {
  const b = $('#guideBody');
  b.textContent = '';
  const card = (t, body) => {
    const c = el('div', 'rulecard');
    c.append(el('div', 'rhead', '<b>' + t + '</b>'), el('div', 'rbody', body));
    b.append(c);
  };
  card('하루 5분, 이 순서로',
    '<b>단어 카드 → 확인 문제 → 문장으로 써먹기 → (원하면) AI 역할극.</b><br>' +
    '외운 것을 마지막에 입으로 말해야 하루가 완성됩니다 — 소리 내어 말한 것이 눈으로만 본 것보다 훨씬 오래 남습니다(산출 효과). ' +
    '일상과 직무는 하루씩 번갈아 나옵니다 — 섞어 배우는 쪽이 몰아 배우기보다 기억에 유리합니다(교차 학습).')
  card('복습이 이 앱의 심장입니다',
    '맞힌 단어는 <b>1 → 3 → 7 → 14 → 30 → 60일</b> 뒤에 다시 나오고, 틀리면 두 계단 내려옵니다. ' +
    '잊기 직전에 꺼내 보는 간격 반복은 기억 연구에서 가장 근거가 단단한 방법입니다.<br>' +
    '<b>복습</b> = 정식(문제 풀기). <b>3분만</b> = 같은 문제를 10개만. <b>훑기</b> = 자동 넘김 구경(바쁜 날용, 효과 약함). ' +
    '<b>따라 말하기</b> = 입으로, <b>손글씨</b> = 손으로(낯선 글자는 써야 남습니다), <b>자판</b> = 철자로, <b>대화</b> = 배운 문장으로 역할극.')
  card('시험은 일부러 어렵게 되어 있습니다',
    '익숙해진 단어는 4지선다가 아니라 <b>보기 없이 직접 떠올리게</b> 바뀝니다. ' +
    '4지선다는 실력을 약 20% 부풀려 보여주기 때문입니다. 틀리는 것은 실패가 아니라 기억이 강해지는 순간입니다.')
  card('성조·모음은 귀 근육 운동입니다',
    '성조·모음 훈련은 며칠 만에 끝나는 게 아니라 틈틈이 평생 돌리는 것입니다. ' +
    '저녁에 하면 자는 동안 소리 범주가 정리된다는 실험도 있습니다. ' +
    '자음 구별 훈련이 없는 것은 일부러입니다 — 북부 발음에서 tr=ch, s=x, d=gi=r은 같은 소리입니다.')
  card('소리는 진짜 사람처럼',
    '위의 <b>북부|남부</b>로 전 지역 소리를 바꿀 수 있습니다. 성조 채점 AI는 일부러 없습니다 — ' +
    '실험해 보니 AI도 성조는 못 믿게 틀려서, 대신 원어민 높낮이 곡선과 내 곡선을 겹쳐 보여줍니다. 눈으로 비교하는 것이 정직한 방법입니다.')
  card('제일 중요한 한 가지',
    '완벽한 하루보다 <b>돌아오는 것</b>이 중요합니다. 그래서 목표가 연속 기록이 아니라 <b>한 주 5일</b>입니다 — 이틀은 쉬어도 됩니다. ' +
    '5분이 없는 날은 훑기 한 번이라도 하세요.')
  show('guide', '사용법', true);
}

/* 베트남 문화 — 출근 첫 주에 바로 부딪히는 것들 */
function showCulture() {
  const b = $('#cultureBody');
  b.textContent = '';
  const card = (t, body) => {
    const c = el('div', 'rulecard');
    c.append(el('div', 'rhead', '<b>' + t + '</b>'), el('div', 'rbody', body));
    b.append(c);
  };
  card('호칭이 예의의 절반', '나이를 물어보는 건 실례가 아니라 <b>당신을 뭐라고 부를지 정하려는 것</b>입니다. anh/chị/em만 잘 써도 예의 바른 사람이 됩니다. 규칙의 [호칭] 수업과 이어집니다.');
  card('회식은 "못 하이 바, 요!"', '건배 구호는 <b>Một, hai, ba, dô!</b>(하나, 둘, 셋, 야!). 잔을 부딪칠 때 손윗사람보다 잔을 살짝 낮게 대면 아주 좋아합니다.');
  card('점심 후 낮잠', '많은 공장·사무실이 점심 후 20~30분 불을 끄고 낮잠을 잡니다. 놀라지 말고 같이 쉬면 됩니다.');
  card('오토바이가 다리', '출퇴근·배달·이사까지 오토바이로 합니다. 길 건널 때는 <b>일정한 속도로 천천히</b> — 멈칫하거나 뛰면 더 위험합니다. 그랩(Grab) 앱이 택시입니다.');
  card('커피의 나라', '연유 넣은 진한 커피(cà phê sữa đá)가 국민 음료. 커피숍에서 몇 시간 앉아 있는 게 일상 문화입니다.');
  card('설(Tết)이 일 년의 중심', '음력 설 전후 일주일은 나라가 멈춥니다. 공장도 길게 쉬고, 보너스(13월 월급)가 관례입니다. 이때 귀향 인사 li xì(세뱃돈) 문화도 있습니다.');
  card('하지 말 것', '어른 머리를 만지지 않기, 밥에 젓가락 꽂지 않기(제사 연상), 사람을 손가락으로 가리키지 않기, 국기·호찌민 주석 험담은 절대 금물(법적 문제).');
  card('팁은 기본 아님', '식당·카페에서 팁은 의무가 아닙니다. 시장에서는 흥정이 자연스럽습니다 — [사고 팔기] 세트의 표현을 쓰면 됩니다.');
  // 이번 주 문화 읽을거리 — 기사 로봇이 골라둔 문화 기사
  fetch('data/news.json', { cache: 'no-cache' }).then(r => r.json()).then(n => {
    const cult = (n.items || []).filter(it => it.cat === '문화');
    if (!cult.length) return;
    b.append(el('p', 'newsday', '이번 주 문화 읽을거리'));
    cult.forEach(it => {
      const a = el('a', 'newsrow');
      a.href = it.u; a.target = '_blank'; a.rel = 'noopener';
      a.append(el('b', null, esc(it.t)), el('span', null, esc(it.s)));
      b.append(a);
    });
  }).catch(() => { });
  show('culture', '베트남 문화', true);
}

/* 오늘 기사 — 깃허브 로봇이 아침마다 골라둔 것을 보여준다 (data/news.json) */
function showNews() {
  const b = $('#newsBody');
  b.textContent = '';
  fetch('data/news.json', { cache: 'no-cache' }).then(r => r.json()).then(n => {
    let last = null;
    (n.items || []).filter(it => it.cat !== '문화').forEach(it => {
      if (it.d !== last) { b.append(el('p', 'newsday', esc(it.d))); last = it.d; }
      const a = el('a', 'newsrow');
      a.href = it.u; a.target = '_blank'; a.rel = 'noopener';
      a.append(el('b', null, esc(it.t)), el('span', null, esc(it.s)));
      b.append(a);
    });
    b.append(el('p', 'note', '베트남 전문지(인사이드비나, 한국어)에서 제조·경제 기사 3건과 문화 기사 1건(문화 화면)을 골라 매일 아침 6시 30분에 업데이트됩니다. 최근 3일치만 남습니다.'));
  }).catch(() => b.append(el('p', 'note', '기사를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')));
  show('news', '베트남 소식', true);
}
$('#chatForm').onsubmit = e => {
  e.preventDefault();
  const v = $('#chatText').value.trim();
  if (!v || !CH) return;
  $('#chatText').value = '';
  chatSend(v);
};
$('#goReview').onclick = () => reviewStart();
$('#goQuick').onclick = () => reviewStart(10);
$('#goFlash').onclick = () => {          // 간략 복습 — 밀린 카드를 자동 훑기
  const due = dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
  flashRun(due.length ? due.slice(0, 20) : practiceWords(15), '간략 복습');
};
$('#goHow').onclick = () => drawRevInfo();
$('#goTone').onclick = toneEntry;
$('#goWx').onclick = showWx;
$('#goTime').onclick = showTime;
$('#goCulture').onclick = showCulture;
$('#goGuide').onclick = showGuide;
$('#goTalk').onclick = startTalk;
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


/* 위 토글 두 개 — 두 값이 다 보이고 지금 켜진 쪽만 진하게 (현재 상태가 헷갈리지 않게) */
function seg(a, b, first) {
  return `<i${first ? ' class="on"' : ''}>${a}</i><i${first ? '' : ' class="on"'}>${b}</i>`;
}
function drawVoiceBtn() {
  $('#voice').innerHTML = seg('여', '남', S.voice === 'f');
}
$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save(); drawVoiceBtn();
};

/* 북부(하노이) ↔ 남부(호찌민) 소리 전환. 남부 목소리는 여성 하나뿐이다. */
function drawRegion() {
  $('#region').innerHTML = seg('북부', '남부', S.region !== 's');
  drawVoiceBtn();
  topBtns();
}
$('#region').onclick = () => {
  S.region = S.region === 's' ? 'n' : 's'; save(); drawRegion();
};

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
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
