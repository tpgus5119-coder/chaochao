/* judge.js — 발음 판정 2: **소리 비교** (2026-09-27 저녁. 대표님: "chào 인데 học 이라고 말할 수도 있잖아. 발음 측정을 안 하고 높낮이만 재면 안 되지").
   폰 음성 인식이 없거나(홈 화면 앱·아이폰) 답을 안 줄 때 쓴다. 전부 폰 안에서 돈다 — 서버 없음.
   방법: 내 녹음과 원어민 녹음을 MFCC(소리의 모양을 25ms 마다 12개 수로 적은 것)로 바꾸고, DTW(말 빠르기 차이를 맞춰 가며 거리를 재는 법)로
   견준다. 목표 단어 하나만 재면 '얼마나 가까운가'의 기준이 없으므로, 헷갈리는 짝·다른 단어 몇 개를 같이 재서 **목표가 가장 가까우면 O**,
   아니면 가장 가까운 단어를 "~처럼 들립니다"로 보여 준다. 성조는 안 본다(그건 높낮이 곡선 몫). 사람 목소리 차이를 줄이려고
   여·남 원어민 둘 다와 재서 가까운 쪽을 쓰고, 계수마다 평균을 뺀다(CMN). */
const JG = { cache: new Map(), SR: 16000, N: 512, HOP: 160, WIN: 400, NMEL: 26, NC: 12 };

/* 제자리 FFT (radix-2). re·im 은 길이 N 의 Float64Array */
function jgFFT(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
/* 멜 필터 26개 (0~8kHz, N=512 → 257칸) — 한 번만 만든다 */
function jgMelBank() {
  if (JG.bank) return JG.bank;
  const mel = f => 2595 * Math.log10(1 + f / 700), imel = m => 700 * (Math.pow(10, m / 2595) - 1);
  const lo = mel(0), hi = mel(JG.SR / 2), pts = [];
  for (let i = 0; i < JG.NMEL + 2; i++) pts.push(Math.floor((JG.N + 1) * imel(lo + (hi - lo) * i / (JG.NMEL + 1)) / JG.SR));
  const bank = [];
  for (let m = 1; m <= JG.NMEL; m++) {
    const a = pts[m - 1], b = pts[m], c = pts[m + 1], w = [];
    for (let k = a; k < c; k++) w.push([k, k < b ? (k - a) / Math.max(1, b - a) : (c - k) / Math.max(1, c - b)]);
    bank.push(w);
  }
  JG.bank = bank; return bank;
}
/* 앞뒤 조용한 부분을 잘라 낸다 — 가장 큰 소리의 2%(약 −34dB) 아래는 없는 것으로 */
function jgTrim(pcm) {
  const hop = JG.HOP, n = Math.floor(pcm.length / hop), e = new Float64Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = pcm[i * hop + j]; s += v * v; } e[i] = Math.sqrt(s / hop); if (e[i] > peak) peak = e[i]; }
  const th = peak * .02;
  let a = 0, b = n - 1;
  while (a < n && e[a] < th) a++;
  while (b > a && e[b] < th) b--;
  return pcm.subarray(Math.max(0, (a - 2) * hop), Math.min(pcm.length, (b + 3) * hop));
}
/* MFCC — 25ms 창·10ms 걸음, 해밍, 멜 26 → 로그 → DCT 13 중 c1~c12, 계수마다 평균 뺌 */
function jgMfcc(pcm) {
  const bank = jgMelBank(), N = JG.N, W = JG.WIN, H = JG.HOP;
  const frames = [];
  const re = new Float64Array(N), im = new Float64Array(N);
  const ham = new Float64Array(W); for (let i = 0; i < W; i++) ham[i] = .54 - .46 * Math.cos(2 * Math.PI * i / (W - 1));
  const dct = [];
  for (let c = 1; c <= JG.NC; c++) { const row = new Float64Array(JG.NMEL); for (let m = 0; m < JG.NMEL; m++) row[m] = Math.cos(Math.PI * c * (m + .5) / JG.NMEL); dct.push(row); }
  for (let s = 0; s + W <= pcm.length; s += H) {
    re.fill(0); im.fill(0);
    let pre = 0;
    for (let i = 0; i < W; i++) { const v = pcm[s + i] - .97 * pre; pre = pcm[s + i]; re[i] = v * ham[i]; }
    jgFFT(re, im);
    const pw = new Float64Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) pw[k] = re[k] * re[k] + im[k] * im[k];
    const lm = new Float64Array(JG.NMEL);
    for (let m = 0; m < JG.NMEL; m++) { let a = 0; for (const [k, w] of bank[m]) a += pw[k] * w; lm[m] = Math.log(a + 1e-10); }
    const c = new Float64Array(JG.NC);
    for (let i = 0; i < JG.NC; i++) { let a = 0; for (let m = 0; m < JG.NMEL; m++) a += lm[m] * dct[i][m]; c[i] = a; }
    frames.push(c);
  }
  if (frames.length) {                      // CMN
    const mean = new Float64Array(JG.NC);
    frames.forEach(f => { for (let i = 0; i < JG.NC; i++) mean[i] += f[i] / frames.length; });
    frames.forEach(f => { for (let i = 0; i < JG.NC; i++) f[i] -= mean[i]; });
  }
  return frames;
}
/* DTW — 띠(band) 안에서만 맞춘다. 길이 합으로 나눠 길이와 무관한 거리로 */
function jgDtw(A, B) {
  const n = A.length, m = B.length;
  if (!n || !m) return Infinity;
  const w = Math.max(12, Math.round(.25 * Math.max(n, m)));
  const INF = 1e18, prev = new Float64Array(m + 1).fill(INF), cur = new Float64Array(m + 1);
  prev[0] = 0;
  const d = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const t = a[i] - b[i]; s += t * t; } return Math.sqrt(s); };
  for (let i = 1; i <= n; i++) {
    cur.fill(INF);
    const c0 = Math.round(i * m / n), jl = Math.max(1, c0 - w), jh = Math.min(m, c0 + w);
    for (let j = jl; j <= jh; j++) {
      const best = Math.min(prev[j], cur[j - 1], prev[j - 1]);
      if (best < INF) cur[j] = best + d(A[i - 1], B[j - 1]);
    }
    prev.set(cur);
  }
  return prev[m] / (n + m);
}
/* 소리 파일(URL 또는 blob:) → 16kHz 모노 */
async function jgPcm(url) {
  const ctx = getCtx();
  const buf = await (await fetch(url)).arrayBuffer();
  const src = await ctx.decodeAudioData(buf.slice(0));
  const len = Math.ceil(src.duration * JG.SR);
  const off = new OfflineAudioContext(1, Math.max(1, len), JG.SR);
  const s = off.createBufferSource(); s.buffer = src; s.connect(off.destination); s.start();
  return (await off.startRendering()).getChannelData(0);
}
/* 원어민 녹음의 MFCC — 같은 지역(북/남)의 여·남 둘 다. 한 번 계산하면 기억해 둔다 */
async function jgNative(h) {
  const dirs = ['f', 'm'];                  // 북부 여·남 — 남부(sf·sm)는 모든 단어에 있지 않다(없으면 404 → 못 읽음)
  const out = [];
  for (const d of dirs) {
    const key = d + '/' + h;
    if (!JG.cache.has(key)) {
      try { JG.cache.set(key, jgMfcc(jgTrim(await jgPcm(`audio/${d}/n/${h}.mp3`)))); } catch (e) { JG.cache.set(key, null); }
    }
    const f = JG.cache.get(key);
    if (f && f.length) out.push(f);
  }
  return out;
}
/* 미리 데우기 — 녹음을 시작할 때 후보 원어민 소리를 받아 MFCC 까지 만들어 둔다(대표님 지적 2026-09-28: 인식이 느리다). 그러면 녹음이 끝난 뒤엔 내 소리만 계산하면 된다 */
async function jgPrepare(cands) {
  try { await Promise.all((cands || []).map(c => jgNative(c.h))); } catch (e) { }
}
/* 판정. cands = [{vi, h}] (목표는 첫째). 돌려주는 것: {ok, heard, dist:{vi:거리}} 또는 null(재지 못함) */
async function soundJudge(target, blobUrl, cands) {
  let mine;
  try { mine = jgMfcc(jgTrim(await jgPcm(blobUrl))); } catch (e) { return null; }
  if (mine.length < 8) return { ok: null, heard: null, why: '소리가 너무 짧습니다' };
  const dist = {};
  for (const c of cands) {
    const nats = await jgNative(c.h);
    if (!nats.length) continue;
    dist[c.vi] = Math.min(...nats.map(f => jgDtw(mine, f)));
  }
  if (!(target in dist)) return null;
  /* 성조만 다른 짝(chào·cháo·chảo)은 소리 모양이 거의 같아 여기서는 못 가린다 — 그건 높낮이 곡선 몫이므로 '다른 단어'에서 뺀다.
     실측(2026-09-27, 여성 원어민 소리를 남성 원어민 기준과 견줌): chào→cao 12.46·chào 12.99(4% 차), học→học 11.8·다음 14.7, bạn→bạn 11.4·다음 15.7.
     그래서 8% 안이면 같은 것으로 본다 — 큰 차이(chào↔học)는 잡고 미세한 차이(chào↔cao)는 봐준다. */
  const base = v => (typeof stripTone === 'function' ? stripTone(v.toLowerCase()) : v.toLowerCase());
  const others = Object.entries(dist).filter(([v]) => v !== target && base(v) !== base(target));
  if (!others.length) return null;
  const best = others.reduce((a, b) => b[1] < a[1] ? b : a);
  const ok = dist[target] <= best[1] * 1.08;
  return { ok, heard: ok ? target : best[0], dist };
}
