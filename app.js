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
let ALL = [], AIDX = {}, DRILL = [];
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
const label = d => (typeof d.day === 'string' ? '준비 ' + d.day.slice(1)
  : d.track === 'work' ? '직무 ' + (d.day - 20) : 'Day ' + d.day);

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

/* AI 손글씨 읽기 — 캔버스 그림을 보내 무슨 글자로 읽히는지 받아 적게 한다.
   글자 판독은 참고용이고, 최종 비교는 정답 보기로 본인이 한다. */
async function aiRead(canvas, target, box) {
  const note = el('div', 'cmpnote ainote', 'AI가 읽는 중…');
  box.querySelector('.ainote')?.remove();
  box.append(note);
  try {
    const t = document.createElement('canvas');
    t.width = canvas.width; t.height = canvas.height;
    const g = t.getContext('2d');
    g.fillStyle = getComputedStyle(canvas).backgroundColor || '#fff';
    g.fillRect(0, 0, t.width, t.height);
    g.drawImage(canvas, 0, 0);
    const b64 = t.toDataURL('image/png').split(',')[1];
    const r = await fetch(GURL(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: '이 그림은 한국인이 베트남어 단어를 손으로 쓴 것이다. 쓰인 글자를 성조 부호까지 그대로 베트남어 철자로 받아 적어라. 철자만 답하고 다른 말은 붙이지 마라.' },
          { inline_data: { mime_type: 'image/png', data: b64 } }] }],
        generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) throw new Error(r.status === 429 ? '오늘 무료 한도를 다 썼습니다' : '연결 실패 (' + r.status + ')');
    const j = await r.json();
    const seen = ((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).trim();
    if (!seen) throw new Error('빈 답이 왔습니다');
    const clean = x => x.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    const exact = clean(seen) === clean(target);
    const close = stripTone(clean(seen)) === stripTone(clean(target));
    note.innerHTML = exact
      ? '<b>AI가 "' + esc(seen) + '" 로 읽었습니다.</b> 부호까지 알아볼 수 있게 썼습니다.'
      : close
        ? '<b>AI가 "' + esc(seen) + '" 로 읽었습니다.</b> 글자는 맞습니다 — 성조 부호만 정답과 비교해 보세요.'
        : 'AI에게는 "<b>' + esc(seen) + '</b>" 로 보입니다. 조금 크게 또박또박 써 보세요.';
  } catch (e) { note.textContent = 'AI 읽기 실패: ' + (e.message || ''); }
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
    if (!r.ok) throw new Error(r.status === 429 ? '오늘 무료 한도를 다 썼습니다' : '연결 실패 (' + r.status + ')');
    const j = await r.json();
    const heard = ((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).trim();
    if (!heard) throw new Error('빈 답이 왔습니다');
    const clean = s => s.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    const bare = s => stripTone(clean(s));
    const exact = clean(heard) === clean(text);
    const close = bare(heard) === bare(text);
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
const VIEWS = ['home', 'learn', 'quiz', 'tone', 'mark', 'rules', 'chat', 'write', 'type'];
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
  [d => d.day >= 1 && d.day <= 5, '파트 1 · 사람과 인사'],
  [d => d.day >= 6 && d.day <= 10, '파트 2 · 숫자와 시간'],
  [d => d.day >= 11 && d.day <= 15, '파트 3 · 일과·음식·시장'],
  [d => d.day >= 16 && d.day <= 20, '파트 4 · 아플 때·부탁·약속'],
  [d => d.track === 'work' && d.day <= 25, '직무 파트 1 · 공장과 봉제'],
  [d => d.track === 'work' && d.day <= 30, '직무 파트 2 · 품질·안전·소통'],
  [d => d.track === 'work' && d.day <= 35, '직무 파트 3 · 박음질·재단·기록'],
  [d => d.track === 'work', '직무 파트 4 · 포장·회사생활·연락']
];

function renderHome() {
  renderProgress();
  renderWeekly();
  // '오늘 할 일' 단추 하나를 맨 위에 크게 — 성공한 언어 앱들의 공통 구조.
  // 준비를 마치면 일상 세트와 직무 세트를 하루 하나씩 번갈아 추천한다.
  // (둘 다 하고 싶은 사람은 목록에서 직접 열면 된다 — 막지 않는다)
  const nx = (() => {
    const prep = ALL.find(d => typeof d.day === 'string' && !S.done[d.day]);
    if (prep) return prep;
    const daily = ALL.find(d => typeof d.day === 'number' && !d.track && !S.done[d.day]);
    const work = ALL.find(d => d.track === 'work' && !S.done[d.day]);
    if (daily && work) {
      const nd = ALL.filter(d => typeof d.day === 'number' && !d.track && S.done[d.day]).length;
      const nw = ALL.filter(d => d.track === 'work' && S.done[d.day]).length;
      return nd <= nw ? daily : work;
    }
    return daily || work;
  })();
  const hero = $('#heroGo');
  hero.hidden = !nx;
  if (nx) {
    hero.innerHTML = `<b>▶ 오늘 학습 시작</b><span>${esc(label(nx) + ' · ' + nx.theme)}</span>`;
    hero.onclick = () => startLearn(nx);
  }
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
    if (nx && d.day === nx.day) b.dataset.next = '1';
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
    c.append(reveal(x.kr_read));
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(el('div', 'exline', '예: <b>' + esc(x.ex) + '</b> — ' + esc(x.ex_ko)));
    c.append(soundRow(x.ex, true));
  }

  if (it.k === 'tone') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'tone-shape', toneArrow(x.mark)));
    c.append(reveal(x.kr_read));
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(soundRow(x.vi, true));
  }

  if (it.k === 'word') {
    // 순서 통일: 그림 → 단어 → 성조 화살표 → 한글 발음 → 뜻 → (한자·남부) → 소리 줄
    const p = pic(x, 'pic'); if (p) c.append(p);
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(toneRow(x.tones));
    c.append(reveal(x.kr_read));
    c.append(el('div', 'ko', esc(x.ko)));
    if (x.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(x.hanja)));
    if (x.south) c.append(el('div', 'south', '남부에서는 ' + esc(x.south)));
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
  $('#next').textContent = last ? ((L.day.words || []).length ? '확인 문제 ›' : '오늘 완료 ›') : '다음 ›';
}

$('#prev').onclick = () => { if (!$('#learn').hidden && L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  // 연타 방지는 시간이 아니라 '아직 이 화면에 있는가'로 판단한다.
  // 시간으로 막으면 앞 화면에서 막 넘어온 사람까지 막힌다.
  if ($('#learn').hidden) return;
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if ((L.day.words || []).length) startQuiz(L.day.words, L.day);
  else { S.done[L.day.day] = true; touchToday(); save(); renderHome(); }
};

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
  }

  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const b = el('button', null, esc(q.mode === 'listen' ? o.vi : o.ko));
    b.onclick = () => answer(b, o.vi === q.w.vi, q.w);
    opts.append(b);
  });
  body.append(opts);
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
    fxTone(good);
    chk.disabled = undo.disabled = true;
    [...tiles.children].forEach(t => t.disabled = true);
    ans.dataset.r = good ? 'ok' : 'no';
    if (!good) ans.textContent = picked.join(' ') + '  →  ' + q.w.vi;
    if (good) Q.ok++; else requeue(Q.list[Q.i]);
    grade(q.w.vi, good);
    setTimeout(() => { Q.i++; drawQuiz(); }, good ? 600 : 1900);
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
    ok.onclick = () => { fxTone(true); grade(q.w.vi, true); Q.ok++; Q.i++; drawQuiz(); };
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
  const b = el('button', 'primary big', Q.day ? '오늘 완료' : '홈으로');
  b.style.marginTop = '24px';
  b.onclick = () => { if (Q.day) { S.done[Q.day.day] = true; touchToday(); save(); } renderHome(); };
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
      if (!good) [...opts.children].forEach(x => {
        if (x.dataset.tone === want) x.dataset.r = 'ok';
      });
      if (good) MK.ok++;
      grade(w.vi, good);
      setTimeout(() => { MK.i++; drawMark(); }, good ? 500 : 1500);
    };
    opts.append(btn);
  });
  body.append(opts);
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


/* ---------- 꼭 알아야 할 규칙 3개 ----------
   문법 '수업'은 만들지 않는다. 조사 결론이 그렇다 —
   초급자에게는 설명보다 덩어리 표현과 산출 직후 교정이 낫고,
   메타분석의 큰 효과는 대부분 '빈칸 채우기 시험' 점수에서 나온 것이라
   실제 말하기로 이어진다는 근거가 얇다.
   다만 **짧고 기능 부하가 큰 규칙 셋**은 예외로 둔다. */
const RULES = [
  { icon: '👤', title: '누구를 부르느냐에 따라 내 호칭도 바뀐다',
    body: '한국어와 같은 구조라 우리에겐 오히려 쉽다. 다만 한국어보다 한 걸음 더 간다 — ' +
          '<b>상대가 바뀌면 "나"를 가리키는 말도 바뀐다.</b>',
    ex: [['손위 남자에게', 'Em chào <b>anh</b>. → 나는 <b>em</b>'],
         ['손아래에게', 'Anh chào <b>em</b>. → 나는 <b>anh</b>'],
         ['처음 보는 사이', '<b>Tôi</b> 로 시작해도 실례가 아니다']] },
  { icon: '↔️', title: '꾸미는 말이 뒤에 온다',
    body: '한국어와 <b>정반대</b>다. 이것만 뒤집어 생각하면 문장이 만들어진다.',
    ex: [['좋은 사람', 'người tốt <span class="dim">(사람 + 좋은)</span>'],
         ['내 이름', 'tên của tôi <span class="dim">(이름 + 의 + 나)</span>'],
         ['이 상자', 'hộp này <span class="dim">(상자 + 이)</span>']] },
  { icon: '🔢', title: '숫자 뒤에는 단위가 붙는다',
    body: '한국어의 개·마리·권과 같다. 다섯 개만 알면 초급은 넘어간다.',
    ex: [['물건', '<b>cái</b> — hai cái (두 개)'],
         ['기계·탈것', '<b>chiếc</b> — một chiếc (한 대)'],
         ['동물', '<b>con</b> — ba con (세 마리)'],
         ['갑·상자', '<b>hộp</b> / <b>thùng</b>']] }
];

function showRules() {
  const b = $('#rulesBody');
  b.textContent = '';
  b.append(el('p', 'lede',
    '문법을 따로 공부할 필요는 없습니다. 베트남어는 동사도 명사도 모양이 안 바뀝니다.<br>' +
    '다만 <b>이 셋</b>은 알아두면 문장이 훨씬 빨리 만들어집니다.'));
  RULES.forEach((r, i) => {
    const c = el('div', 'rulecard');
    c.append(el('div', 'rhead', `<span class="ri">${r.icon}</span><b>${i + 1}. ${r.title}</b>`));
    c.append(el('div', 'rbody', r.body));
    const t = el('div', 'rex');
    r.ex.forEach(([k, v]) => {
      const row = el('div', 'rrow');
      row.append(el('span', 'rk', esc(k)), el('span', 'rv', v));
      t.append(row);
    });
    c.append(t);
    b.append(c);
  });
  // 남부 배치 대비 — 글은 같고 소리가 다르다
  const sc = el('div', 'rulecard');
  sc.append(el('div', 'rhead', '<span class="ri">🧭</span><b>남부(호찌민 쪽)로 가게 되면</b>'));
  sc.append(el('div', 'rbody',
    '글은 완전히 같고 <b>소리</b>가 다릅니다. 지금은 북부(하노이) 소리로 배우고, ' +
    '배치가 정해지면 남부 소리를 추가합니다. 단어 카드의 <b>남부 ▸</b> 표시가 다른 단어입니다.'));
  const t2 = el('div', 'rex');
  [['d·gi·v', "'이(y)' 소리가 된다 — dạ 자→야"],
   ['r', "북부 '즈' → 남부는 혀 굴리는 '르'"],
   ['성조', 'hỏi·ngã가 하나로 합쳐져 사실상 5성조'],
   ['다른 단어', 'bố→<b>ba</b>(아빠) · mẹ→<b>má</b> · đắt→<b>mắc</b>(비싸다) · muộn→<b>trễ</b>(늦다) · nghìn→<b>ngàn</b>(천) · vâng→<b>dạ</b>(네)']]
    .forEach(([k, v]) => { const row = el('div', 'rrow'); row.append(el('span', 'rk', esc(k)), el('span', 'rv', v)); t2.append(row); });
  sc.append(t2);
  b.append(sc);
  b.append(el('p', 'note',
    '이 화면은 한 번 읽고 잊어도 됩니다. 매일 대화를 하다 보면 저절로 몸에 붙습니다.'));
  show('rules', '꼭 알아야 할 규칙 3개', true);
}

/* ---------- 쓰기 연습 (손글씨 + 화면 자판) ----------
   손으로 쓰면 눈으로만 볼 때보다 글자가 더 잘 남는다(쓰는 동작이 기억에 같이 저장된다).
   손글씨는 자동 판정을 하지 않는다 — 판정이 목적이 아니라 쓰는 행위가 목적이고,
   정답을 열어 스스로 비교하는 것으로 충분하다. */

function practiceWords(n) {
  const due = dueWords().map(v => allWords().find(w => w.vi === v)).filter(Boolean);
  const doneDays = ALL.filter(d => typeof d.day === 'number' && S.done[d.day]);
  const recent = doneDays.length ? doneDays[doneDays.length - 1].words
    : (ALL.find(d => d.day === 1) || {}).words || [];
  const pool = [...due, ...recent.filter(w => !due.some(x => x.vi === w.vi))];
  return pool.slice(0, n);
}

function drawPad(host) {
  const c = el('canvas', 'pad'); host.append(c);
  let g = null;
  requestAnimationFrame(() => {
    const r = c.getBoundingClientRect(), d = devicePixelRatio || 1;
    c.width = r.width * d; c.height = 190 * d;
    g = c.getContext('2d');
    g.scale(d, d); g.lineWidth = 5; g.lineCap = g.lineJoin = 'round';
    g.strokeStyle = getComputedStyle(document.body).color;
  });
  let on = false;
  const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.onpointerdown = e => { if (!g) return; on = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); };
  c.onpointermove = e => { if (!on || !g) return; const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); };
  c.onpointerup = c.onpointercancel = () => { on = false; };
  return { canvas: c, clear: () => { if (!g) return; const d = devicePixelRatio || 1; g.clearRect(0, 0, c.width / d, c.height / d); } };
}

let WR = null;
function startWrite() {
  const ws = practiceWords(8);
  if (!ws.length) return;
  WR = { list: ws, i: 0 };
  drawWrite();
  show('write', '손으로 쓰기', true);
}
function drawWrite() {
  const b = $('#writeBody'); b.textContent = '';
  if (WR.i >= WR.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', WR.list.length + '개'));
    r.append(el('div', null, '손으로 쓴 만큼 손이 기억합니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = WR.list[WR.i];
  b.append(el('div', 'q', `${WR.i + 1} / ${WR.list.length} · 듣고, 떠올려서, 손으로 써 보세요`));
  b.append(el('div', 'qmain', esc(w.ko)));
  const wrap = el('div', 'qplay');
  const p1 = el('button', 'primary', '듣기'); p1.onclick = () => play(w.vi, false);
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  wrap.append(p1, p2); b.append(wrap);
  play(w.vi, false);
  const pad = drawPad(b);
  const row = el('div', 'qplay');
  const clr = el('button', 'ghost', '지우기'); clr.onclick = pad.clear;
  if (aiReady()) {
    const ai = el('button', 'ghost', 'AI가 읽기');
    ai.onclick = () => { ai.disabled = true; aiRead(pad.canvas, w.vi, b).finally(() => { ai.disabled = false; }); };
    row.append(ai);
  }
  const showA = el('button', 'primary', '정답 보기');
  row.append(clr, showA); b.append(row);
  showA.onclick = () => {
    showA.disabled = true;
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)));
    ans.append(toneRow(w.tones));
    if (w.kr_read) ans.append(el('div', 'krline', '[' + esc(w.kr_read) + ']'));
    b.append(ans);
    const g2 = el('div', 'opts');
    const okB = el('button', null, '✓ 비슷하게 썼다');
    okB.onclick = () => { fxTone(true); grade(w.vi, true); WR.i++; drawWrite(); };
    const noB = el('button', null, '✗ 많이 다르다 — 한 번 더 쓰기');
    noB.onclick = () => { grade(w.vi, false); drawWrite(); };
    g2.append(okB, noB); b.append(g2);
  };
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

/* ---------- AI 대화 ----------
   대화 시스템으로 연습하면 말하기가 는다는 메타분석이 있다(말하기 d=0.84).
   단, 왕초보에게는 자유대화보다 '배운 단어 안의 제한 대화'가 낫다 —
   그래서 지금까지 배운 단어 목록을 매번 같이 보낸다.
   키는 이 기기에만 저장되고 백업에는 안 들어간다. 대화 내용은 구글 서버로 간다. */
let CH = null;
/* AI 중계 서버 — 키를 서버가 숨겨 들고 있어서, 주소가 채워지면 누구나 키 없이 쓴다.
   비어 있는 동안은 예전 방식(각자 키)으로 돈다. */
const PROXY = '';
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

function chatSys(mode, myRole) {
  const t = todayDay();
  const dlg = (t.dialog?.lines || []).map(l => l.who + ': ' + l.vi).join(' / ');
  return '당신은 베트남어를 처음 배우는 한국인의 대화 상대다. 북부(하노이) 표준을 쓴다.\n' +
    '반드시 이 형식으로만 답한다. 다른 말은 붙이지 않는다:\n' +
    'VI: 베트남어 한 문장 (최대 7단어)\nKR: 그 발음의 한글 표기\nKO: 한국어 뜻\n' +
    '학습자의 베트남어에 성조나 단어 실수가 있으면 넷째 줄 "FIX: 짧은 교정"으로 알려준다.\n' +
    '가능한 한 이 단어들만 쓴다(이름·지명은 예외): ' + learnedVi().join(', ') + '\n' +
    '한 번에 한 문장. 쉬운 질문으로 대화를 이어간다. 학습자가 한국어로 쓰면 그 말을 베트남어로 어떻게 하는지 알려주고 따라 하게 한다.\n' +
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
function viVoice() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  return vs.find(v => (v.lang || '').toLowerCase().startsWith('vi')) || null;
}
function speakVi(t) {
  const u = new SpeechSynthesisUtterance(t);
  const v = viVoice(); if (v) u.voice = v;
  u.lang = 'vi-VN'; u.rate = .85;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
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
    const bt = el('button', 'ghost sm', '듣기');
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
        : r.status === 429 ? '오늘 무료 한도를 다 썼습니다. 내일 다시 됩니다'
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
  s.append(m1, m2);
  s.append(el('p', 'note', 'AI는 연습 상대이지 선생님이 아닙니다 — 이상한 문장이 오면 그냥 넘어가세요.<br>' +
    '문장 소리는 폰에 베트남어 음성이 있을 때만 나옵니다 (안드로이드는 대부분 있음).'));
  if (S.gkey) {                          // 개인 키를 쓰는 사람에게만 보인다
    const del = el('button', 'ghost sm', '키 지우기');
    del.onclick = () => { if (confirm('저장된 키를 지울까요?')) { delete S.gkey; save(); startChat(); } };
    s.append(del);
  }
}

function beginChat(mode, myRole) {
  $('#chatSetup').hidden = true;
  $('#chatForm').hidden = false;
  CH = { mode, sys: chatSys(mode, myRole), hist: [{ role: 'user', parts: [{ text: '(대화를 시작해 주세요)' }] }] };
  chatSend(null);
}

/* ---------- 시작 ---------- */
$('#back').onclick = renderHome;
$('#goChat').onclick = startChat;
$('#goWrite').onclick = startWrite;
$('#goType').onclick = startType;
$('#chatForm').onsubmit = e => {
  e.preventDefault();
  const v = $('#chatText').value.trim();
  if (!v || !CH) return;
  $('#chatText').value = '';
  chatSend(v);
};
$('#goReview').onclick = () => startQuiz(null, null);
$('#goQuick').onclick = () => startQuiz(null, null, 10);
$('#goTone').onclick = startTone;
$('#goMark').onclick = startMarks;
$('#goRules').onclick = showRules;
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


$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save();
  $('#voice').textContent = S.voice === 'f' ? '여' : '남';
};

/* 북부(하노이) ↔ 남부(호찌민) 소리 전환. 남부 목소리는 여성 하나뿐이다. */
function drawRegion() {
  $('#region').textContent = S.region === 's' ? '남부' : '북부';
  $('#voice').hidden = S.region === 's';
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
  AIDX = a;
  $('#voice').textContent = S.voice === 'f' ? '여' : '남';
  drawRegion();
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
