'use strict';
/* 성조 판정기.
   음성인식(무슨 말인지 알아내기)이 아니라 **음높이(F0) 곡선**만 뽑는다.
   성조는 "소리가 오르내리는 모양"이므로, 무슨 단어인지 몰라도 모양은 잴 수 있다.
   이게 음성인식보다 훨씬 정확하고 가볍다.

   방법: YIN 알고리즘(차이함수 + 누적평균정규화). 반옥타브 오류가 적다.
   화자마다 목소리 높이가 다르므로 **각자의 중앙값 기준 반음(semitone) 차이**로 바꿔
   남녀·고저 차이를 없앤다. 그래야 원어민과 내 소리를 겹쳐 볼 수 있다. */

const PITCH = (() => {
  const FMIN = 60, FMAX = 500;

  /* 한 조각에서 기본주파수 하나 */
  function yin(buf, rate, thr = 0.12) {
    const tauMin = Math.floor(rate / FMAX), tauMax = Math.floor(rate / FMIN);
    const n = buf.length, half = Math.min(tauMax, n >> 1);
    const d = new Float32Array(half + 1);
    for (let tau = 1; tau <= half; tau++) {
      let s = 0;
      for (let i = 0; i < n - tau; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
      d[tau] = s;
    }
    // 누적평균정규화
    const cmnd = new Float32Array(half + 1);
    cmnd[0] = 1; let run = 0;
    for (let tau = 1; tau <= half; tau++) {
      run += d[tau];
      cmnd[tau] = run ? d[tau] * tau / run : 1;
    }
    let tau = -1;
    for (let t = tauMin; t <= half; t++) {
      if (cmnd[t] < thr) {
        while (t + 1 <= half && cmnd[t + 1] < cmnd[t]) t++;
        tau = t; break;
      }
    }
    if (tau < 0) {                       // 임계값을 못 넘으면 최솟값
      let best = tauMin, bv = cmnd[tauMin] ?? 1;
      for (let t = tauMin; t <= half; t++) if (cmnd[t] < bv) { bv = cmnd[t]; best = t; }
      if (bv > 0.55) return 0;           // 너무 흐리면 무성음으로 본다
      tau = best;
    }
    // 포물선 보간으로 소수점까지
    const a = cmnd[tau - 1] ?? cmnd[tau], b = cmnd[tau], c = cmnd[tau + 1] ?? cmnd[tau];
    const shift = (a + c - 2 * b) ? (a - c) / (2 * (a + c - 2 * b)) : 0;
    return rate / (tau + shift);
  }

  /* 소리 전체의 음높이 곡선. 무성음·소리 없는 구간은 null */
  function contour(samples, rate) {
    const win = Math.round(rate * 0.045);      // 45ms 창
    const hop = Math.round(rate * 0.010);      // 10ms 간격
    const out = [];
    let peak = 0;
    for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
    const floor = Math.max(0.012, peak * 0.10);
    for (let s = 0; s + win < samples.length; s += hop) {
      const seg = samples.subarray(s, s + win);
      let rms = 0;
      for (let i = 0; i < seg.length; i++) rms += seg[i] * seg[i];
      rms = Math.sqrt(rms / seg.length);
      out.push(rms < floor ? null : (yin(seg, rate) || null));
    }
    return out;
  }

  /* 중앙값 기준 반음으로 바꾼다 → 목소리 높낮이 차이를 없앤다 */
  function normalize(hz) {
    const v = hz.filter(x => x && x > FMIN && x < FMAX).sort((a, b) => a - b);
    if (v.length < 4) return null;
    const med = v[v.length >> 1];
    return hz.map(x => (x && x > FMIN && x < FMAX) ? 12 * Math.log2(x / med) : null);
  }

  /* 앞뒤 무성 구간을 잘라내고 튀는 값을 다듬는다 */
  function clean(st) {
    if (!st) return null;
    let a = st.findIndex(x => x !== null);
    let b = st.length - 1; while (b >= 0 && st[b] === null) b--;
    if (a < 0 || b <= a) return null;
    const cut = st.slice(a, b + 1);
    // 옥타브 튐 제거: 이웃과 10반음 넘게 차이 나면 버린다
    for (let i = 1; i < cut.length - 1; i++) {
      if (cut[i] === null) continue;
      const p = cut[i - 1], q = cut[i + 1];
      if (p !== null && q !== null && Math.abs(cut[i] - p) > 10 && Math.abs(cut[i] - q) > 10) cut[i] = (p + q) / 2;
    }
    // 3점 평균
    const sm = cut.slice();
    for (let i = 1; i < cut.length - 1; i++) {
      const w = [cut[i - 1], cut[i], cut[i + 1]].filter(x => x !== null);
      if (w.length) sm[i] = w.reduce((s, x) => s + x, 0) / w.length;
    }
    return sm;
  }

  /* 길이를 맞춰 겹쳐볼 수 있게 한다 (0~1 구간 20점) */
  function resample(st, n = 20) {
    if (!st) return null;
    const pts = st.map((v, i) => [i / (st.length - 1), v]).filter(p => p[1] !== null);
    if (pts.length < 4) return null;
    const out = [];
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      let j = 0; while (j < pts.length - 1 && pts[j + 1][0] < t) j++;
      const [t0, v0] = pts[j], [t1, v1] = pts[Math.min(j + 1, pts.length - 1)];
      out.push(t1 === t0 ? v0 : v0 + (v1 - v0) * (t - t0) / (t1 - t0));
    }
    return out;
  }

  /* 소리가 실제로 난 길이(초). nặng 처럼 '짧고 뚝 끊기는' 성조는
     높낮이 모양만으로는 huyền 과 구별이 안 된다. 길이가 그 차이를 잡아준다. */
  function voicedSec(hz, rate, hop) {
    const n = hz.filter(x => x).length;
    return n * hop / rate;
  }

  async function analyze(arrayBuffer, ctx) {
    const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const ch = buf.getChannelData(0);
    const rate = buf.sampleRate;
    const hz = contour(ch, rate);
    const curve = resample(clean(normalize(hz)));
    return curve ? { curve, sec: voicedSec(hz, rate, Math.round(rate * 0.010)) } : null;
  }

  /* 두 곡선의 '모양'이 얼마나 닮았나 (0~100).
     앞서 기울기(차이값)로 재봤더니 잡음이 심해 같은 성조끼리도 낮게 나왔다.
     곡선 값 자체를 각자 표준화한 뒤 상관을 보는 쪽이 훨씬 안정적이다. */
  function zscore(a) {
    const m = a.reduce((s, v) => s + v, 0) / a.length;
    const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
    return sd < 0.25 ? a.map(() => 0) : a.map(v => (v - m) / sd);
  }

  function similarity(A, B) {
    const a = A && (A.curve || A), b = B && (B.curve || B);
    if (!a || !b || a.length !== b.length) return null;
    const za = zscore(a), zb = zscore(b);
    let num = 0, sa = 0, sb = 0;
    for (let i = 0; i < za.length; i++) { num += za[i] * zb[i]; sa += za[i] ** 2; sb += zb[i] ** 2; }
    const r = (sa && sb) ? num / Math.sqrt(sa * sb) : 0;
    // 전체 오르내림 폭도 본다 — 방향은 같은데 밋밋하면 성조가 아니다
    const span = x => Math.max(...x) - Math.min(...x);
    const dv = Math.abs(span(a) - span(b));
    let sc = (r + 1) / 2 * 100 - dv * 2.5;
    // 길이 차이도 반영한다 (한쪽이 두 배 이상 길면 다른 성조로 본다)
    if (A && B && A.sec && B.sec) {
      const ratio = Math.max(A.sec, B.sec) / Math.min(A.sec, B.sec);
      if (ratio > 1.35) sc -= Math.min(45, (ratio - 1.35) * 60);
    }
    return Math.max(0, Math.min(100, Math.round(sc)));
  }

  return { analyze, similarity };
})();
