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

  async function analyze(arrayBuffer, ctx) {
    const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const ch = buf.getChannelData(0);
    return resample(clean(normalize(contour(ch, buf.sampleRate))));
  }

  /* 두 곡선의 '모양'이 얼마나 닮았나 (0~100).
     절대 높이가 아니라 **오르내리는 방향**을 본다. */
  function similarity(a, b) {
    if (!a || !b) return null;
    const da = [], db = [];
    for (let i = 1; i < a.length; i++) { da.push(a[i] - a[i - 1]); db.push(b[i] - b[i - 1]); }
    const m = x => x.reduce((s, v) => s + v, 0) / x.length;
    const ma = m(da), mb = m(db);
    let num = 0, sa = 0, sb = 0;
    for (let i = 0; i < da.length; i++) {
      num += (da[i] - ma) * (db[i] - mb); sa += (da[i] - ma) ** 2; sb += (db[i] - mb) ** 2;
    }
    const r = (sa && sb) ? num / Math.sqrt(sa * sb) : 0;
    const range = Math.abs((Math.max(...a) - Math.min(...a)) - (Math.max(...b) - Math.min(...b)));
    return Math.max(0, Math.round((r * 0.75 + 0.25) * 100 - range * 2));
  }

  return { analyze, similarity };
})();
