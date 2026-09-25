'use strict';
/* 입모양(2D) — 옆 단면(혀·입천장·연구개·콧길·성대·입술)과 정면 입술을 한 그림에 그린다.
   대표님 지시 2026-09-25 #6 "입모양 추가, 2d로 하자" · 2026-09-24 "소리·높낮이·입모양·그림을 넷 다 동시에".

   원리는 세션에서 만든 시안(widget.tpl.html)과 같다:
     낱말 → 소리(음소) 차례 → 소리마다 자세(턱·입술·혀 앞/가운데/뒤·연구개·성대) → 자세 사이를 부드럽게 잇기.
   **정직한 한계**: 베트남어 전용 MRI·초음파 자료가 없어 그림의 세부 좌표는 '모식도'다.
   근거가 있는 것은 범주(모음 높이·앞뒤·둥글기, 자음 닿는 곳·방식, o·u 뒤 -c/-ng 의 입술 닫힘 — Kirby 2011 JIPA 41(3),
   Wikipedia Vietnamese phonology, 다낭대 음성학 교재)까지다. 화면에도 '모식도'라고 적는다.
   하노이 발음 기준(s=x, ch=tr, d=gi=r → [z]). */
const MOUTH = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const f1 = v => Math.round(v * 10) / 10;
  const PX = 312, PY = 152, JMAX = 11, WX = 314;
  const ROOF = [[96, 172], [104, 156], [122, 143], [150, 134], [182, 129], [214, 130], [244, 137], [270, 139], [298, 138]];
  const FLOOR = [[302, 270], [268, 266], [232, 260], [196, 250], [160, 238], [128, 224], [108, 214]];
  const TIPS = { low: [102, 207, 1], lowb: [110, 211, 1], dent: [99, 189, 0], alv: [106, 161, 0], alvf: [102, 172, 0], post: [124, 148, 0] };
  const NUM = ['jaw', 'lipR', 'lipC', 'lipD', 'gF', 'gM', 'gB', 'gR', 'vel', 'lar', 'air', 'tx', 'ty'];
  const REST = { jaw: .22, lipR: 0, lipC: 0, lipD: 0, tip: 'low', gF: .42, gM: .42, gB: .38, gR: 24, vel: 0, lar: 0, air: 0, pl: [] };
  function rot(x, y, j) { const a = -j * JMAX * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), dx = x - PX, dy = y - PY; return [PX + dx * c - dy * s, PY + dx * s + dy * c]; }
  function mkp(o) {
    const p = {}; let k;
    for (k in REST) p[k] = REST[k];
    for (k in o) p[k] = o[k];
    const t = TIPS[p.tip], xy = t[2] ? rot(t[0], t[1], p.jaw) : [t[0], t[1]];
    p.tx = xy[0]; p.ty = xy[1];
    return p;
  }
  const blend = (a, b, u) => { const p = {}; NUM.forEach(k => { p[k] = lerp(a[k], b[k], u); }); return p; };
  function roofAt(s) { const i = Math.max(0, Math.min(7, Math.floor(s))), f = s - i, a = ROOF[i], b = ROOF[i + 1]; return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f) }; }
  function fy(fl, x) {
    for (let i = 0; i < fl.length - 1; i++) {
      const a = fl[i], b = fl[i + 1];
      if (x <= a[0] && x >= b[0]) return lerp(a[1], b[1], (a[0] - x) / ((a[0] - b[0]) || 1));
    }
    return x > fl[0][0] ? fl[0][1] : fl[fl.length - 1][1];
  }
  function cr(P, closed) {           // Catmull-Rom → 부드러운 곡선
    const n = P.length, m = closed ? n : n - 1;
    let d = 'M' + f1(P[0][0]) + ' ' + f1(P[0][1]);
    for (let i = 0; i < m; i++) {
      const p1 = P[i], p2 = P[(i + 1) % n];
      const p0 = closed ? P[(i - 1 + n) % n] : P[Math.max(0, i - 1)];
      const p3 = closed ? P[(i + 2) % n] : P[Math.min(n - 1, i + 2)];
      d += 'C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d;
  }

  /* 소리별 자세. g: v 모음 · c 첫소리 · f 받침. tg=혀, pl=소리 나는 곳. */
  const SND = [
    { id: 'i', sp: 'i, y', ipa: 'i', g: 'v', o: { jaw: .08, lipR: .75, gF: .08, gM: .08, gB: .55, gR: 36 }, tg: '혀 앞쪽, 가장 높게', pl: '막힘 없음(모음)' },
    { id: 'ee', sp: 'ê', ipa: 'e', g: 'v', o: { jaw: .2, lipR: .55, gF: .2, gM: .22, gB: .52, gR: 32 }, tg: '혀 앞쪽, 조금 높게', pl: '막힘 없음(모음)' },
    { id: 'e', sp: 'e', ipa: 'ɛ', g: 'v', o: { jaw: .42, lipR: .3, gF: .34, gM: .36, gB: .52, gR: 28 }, tg: '혀 앞쪽, 조금 낮게', pl: '막힘 없음(모음)' },
    { id: 'a', sp: 'a', ipa: 'a', g: 'v', o: { jaw: .85, lipR: .05, gF: .62, gM: .64, gB: .58, gR: 14 }, tg: '혀 앞~가운데, 가장 낮게', pl: '막힘 없음(모음)' },
    { id: 'uw', sp: 'ư', ipa: 'ɯ', g: 'v', o: { jaw: .12, lipR: .35, tip: 'lowb', gF: .5, gM: .3, gB: .08, gR: 24 }, tg: '혀 뒤쪽, 높게', pl: '막힘 없음(모음)' },
    { id: 'ow', sp: 'ơ', ipa: 'ɤ', g: 'v', o: { jaw: .28, lipR: .1, tip: 'lowb', gF: .5, gM: .38, gB: .2, gR: 22 }, tg: '혀 뒤쪽, 조금 높게', pl: '막힘 없음(모음)' },
    { id: 'aa', sp: 'â', ipa: 'ɤ̆', g: 'v', o: { jaw: .35, lipR: .1, tip: 'lowb', gF: .52, gM: .42, gB: .26, gR: 20 }, tg: 'ơ와 같은 자리, 더 짧게', pl: '막힘 없음(모음)' },
    { id: 'aw', sp: 'ă', ipa: 'ă', g: 'v', o: { jaw: .7, lipR: .05, gF: .58, gM: .6, gB: .55, gR: 16 }, tg: 'a와 같은 자리, 더 짧게', pl: '막힘 없음(모음)' },
    { id: 'u', sp: 'u', ipa: 'u', g: 'v', o: { jaw: .1, lipR: -1, tip: 'lowb', gF: .55, gM: .4, gB: .08, gR: 26 }, tg: '혀 뒤쪽, 가장 높게', pl: '막힘 없음(모음)' },
    { id: 'oo', sp: 'ô', ipa: 'o', g: 'v', o: { jaw: .25, lipR: -.85, tip: 'lowb', gF: .55, gM: .44, gB: .18, gR: 24 }, tg: '혀 뒤쪽, 조금 높게', pl: '막힘 없음(모음)' },
    { id: 'o', sp: 'o', ipa: 'ɔ', g: 'v', o: { jaw: .55, lipR: -.6, tip: 'lowb', gF: .6, gM: .54, gB: .3, gR: 16 }, tg: '혀 뒤쪽, 조금 낮게', pl: '막힘 없음(모음)' },
    { id: 'b', sp: 'b', ipa: 'ɓ', g: 'c', o: { jaw: .1, lipC: 1, lar: 1, pl: ['lip'] }, tg: '혀는 쉬는 자세', pl: '두 입술 · 터짐 · 보통 내파음' },
    { id: 'm', sp: 'm', ipa: 'm', g: 'c', o: { jaw: .1, lipC: 1, vel: 1, pl: ['lip'] }, tg: '혀는 쉬는 자세', pl: '두 입술 · 코소리' },
    { id: 'ph', sp: 'ph', ipa: 'f', g: 'c', o: { jaw: .15, lipR: .2, lipD: 1, air: 1, pl: ['lab'] }, tg: '혀는 쉬는 자세', pl: '아랫입술+윗니 · 마찰' },
    { id: 'v', sp: 'v', ipa: 'v', g: 'c', o: { jaw: .15, lipR: .2, lipD: 1, lar: 1, pl: ['lab'] }, tg: '혀는 쉬는 자세', pl: '아랫입술+윗니 · 마찰(울림)' },
    { id: 't', sp: 't', ipa: 't', g: 'c', o: { jaw: .12, tip: 'dent', gF: .05, gM: .3, gB: .4, pl: ['dent'] }, tg: '혀끝·혀날을 윗니 뒤와 잇몸에', pl: '이+잇몸 · 터짐(숨 약함)' },
    { id: 'th', sp: 'th', ipa: 'tʰ', g: 'c', o: { jaw: .12, tip: 'dent', gF: .05, gM: .3, gB: .4, air: 1, pl: ['dent'] }, tg: '혀끝·혀날을 윗니 뒤와 잇몸에', pl: '이+잇몸 · 터짐 + 센 숨' },
    { id: 'dd', sp: 'đ', ipa: 'ɗ', g: 'c', o: { jaw: .12, tip: 'alv', gF: .03, gM: .3, gB: .4, lar: 1, pl: ['alv'] }, tg: '혀끝을 잇몸에', pl: '잇몸(치조) · 내파음' },
    { id: 'n', sp: 'n', ipa: 'n', g: 'c', o: { jaw: .12, tip: 'alv', gF: .03, gM: .3, gB: .4, vel: 1, pl: ['alv'] }, tg: '혀끝을 잇몸에', pl: '잇몸(치조) · 코소리' },
    { id: 'l', sp: 'l', ipa: 'l', g: 'c', o: { jaw: .15, tip: 'alv', gF: .03, gM: .36, gB: .4, pl: ['alv'] }, tg: '혀끝을 잇몸에, 공기는 혀 양옆으로', pl: '잇몸(치조) · 옆소리' },
    { id: 's', sp: 's, x', ipa: 's', g: 'c', o: { jaw: .12, tip: 'alvf', gF: .05, gM: .28, gB: .4, air: 1, pl: ['alv'] }, tg: '혀끝·혀날이 윗니 뒤~잇몸에 아주 가깝게', pl: '이+잇몸 · 마찰' },
    { id: 'z', sp: 'd, gi, r', ipa: 'z', g: 'c', o: { jaw: .12, tip: 'alvf', gF: .05, gM: .28, gB: .4, lar: 1, pl: ['alv'] }, tg: '혀끝·혀날이 윗니 뒤~잇몸에 가깝게', pl: '이+잇몸 · 마찰(울림)' },
    { id: 'ch', sp: 'ch, tr', ipa: 'tɕ', g: 'c', o: { jaw: .1, lipR: .3, gF: 0, gM: .12, gB: .45, pl: ['post'] }, tg: '혓바닥 앞을 잇몸 뒤~입천장 앞에', pl: '입천장 앞 · 파찰' },
    { id: 'nh', sp: 'nh', ipa: 'ɲ', g: 'c', o: { jaw: .1, lipR: .3, gF: 0, gM: .06, gB: .45, vel: 1, pl: ['post'] }, tg: '혓바닥 앞을 잇몸 뒤~입천장 앞에 넓게', pl: '입천장 앞 · 코소리' },
    { id: 'k', sp: 'c, k, q', ipa: 'k', g: 'c', o: { jaw: .14, gB: 0, gM: .22, gF: .4, pl: ['vel'] }, tg: '혀 뒤쪽을 연구개에', pl: '연구개 · 터짐' },
    { id: 'kh', sp: 'kh', ipa: 'x', g: 'c', o: { jaw: .14, gB: .03, gM: .22, gF: .4, air: 1, pl: ['vel'] }, tg: '혀 뒤쪽이 연구개에 거의 닿는 좁은 틈', pl: '연구개 · 마찰' },
    { id: 'g', sp: 'g, gh', ipa: 'ɣ', g: 'c', o: { jaw: .14, gB: .03, gM: .22, gF: .4, lar: 1, pl: ['vel'] }, tg: '혀 뒤쪽이 연구개에 거의 닿는 좁은 틈', pl: '연구개 · 마찰(울림)' },
    { id: 'ng', sp: 'ng, ngh', ipa: 'ŋ', g: 'c', o: { jaw: .14, gB: 0, gM: .22, gF: .4, vel: 1, pl: ['vel'] }, tg: '혀 뒤쪽을 연구개에', pl: '연구개 · 코소리' },
    { id: 'h', sp: 'h', ipa: 'h', g: 'c', o: { jaw: .3, air: 1, pl: ['glo'] }, tg: '혀는 뒤따르는 모음 자세', pl: '목(성문) · 숨소리' },
    { id: 'p', sp: '-p', ipa: 'p', g: 'f', o: { jaw: .1, lipC: 1, pl: ['lip'] }, tg: '혀는 쉬는 자세', pl: '두 입술 · 닫은 채 멈춤(터뜨리지 않음)' },
    { id: 'tf', sp: '-t', ipa: 't', g: 'f', o: { jaw: .12, tip: 'alv', gF: .03, gM: .3, gB: .4, pl: ['alv'] }, tg: '혀끝을 잇몸에 댄 채', pl: '잇몸 · 닫은 채 멈춤' },
    { id: 'kf', sp: '-c, -ch', ipa: 'k', g: 'f', o: { jaw: .14, gB: 0, gM: .22, gF: .4, pl: ['vel'] }, tg: '혀 뒤쪽을 연구개에 댄 채', pl: '연구개 · 닫은 채 멈춤' },
    { id: 'kp', sp: 'o·u 뒤 -c', ipa: 'kp', g: 'f', o: { jaw: .16, lipR: -.8, lipC: 1, tip: 'lowb', gF: .5, gM: .36, gB: 0, gR: 24, pl: ['vel', 'lip'] }, tg: '혀 뒤쪽을 연구개에', pl: '연구개 + 두 입술이 함께 닫힘' },
    { id: 'ngm', sp: 'o·u 뒤 -ng', ipa: 'ŋm', g: 'f', o: { jaw: .16, lipR: -.8, lipC: 1, tip: 'lowb', gF: .5, gM: .36, gB: 0, gR: 24, vel: 1, pl: ['vel', 'lip'] }, tg: '혀 뒤쪽을 연구개에', pl: '연구개 + 두 입술이 함께 닫힘 · 코소리' },
  ];
  const POSE = { rest: mkp({}) }, SI = {};
  SND.forEach(s => { POSE[s.id] = mkp(s.o); SI[s.id] = s; });

  /* ── 글자 → 소리 차례 ── */
  const TONEMARK = /[̣̀́̃̉]/g;
  const baseOf = sy => sy.normalize('NFD').replace(TONEMARK, '').normalize('NFC').toLowerCase();
  const ONSET = { b: 'b', c: 'k', k: 'k', q: 'k', ch: 'ch', tr: 'ch', d: 'z', gi: 'z', r: 'z', 'đ': 'dd', g: 'g', gh: 'g', h: 'h', kh: 'kh',
    l: 'l', m: 'm', n: 'n', ng: 'ng', ngh: 'ng', nh: 'nh', p: 'b', ph: 'ph', s: 's', x: 's', t: 't', th: 'th', v: 'v' };
  const VOW1 = { a: 'a', 'ă': 'aw', 'â': 'aa', e: 'e', 'ê': 'ee', i: 'i', y: 'i', o: 'o', 'ô': 'oo', 'ơ': 'ow', u: 'u', 'ư': 'uw' };
  const VSEQ = {
    'ia': ['i', 'aa'], 'iê': ['i', 'aa'], 'yê': ['i', 'aa'], 'ya': ['i', 'aa'], 'ua': ['u', 'aa'], 'uô': ['u', 'aa'],
    'ưa': ['uw', 'ow'], 'ươ': ['uw', 'ow'], 'oa': ['u', 'a'], 'oe': ['u', 'e'], 'uê': ['u', 'ee'], 'uy': ['u', 'i'], 'oă': ['u', 'aw'],
    'uâ': ['u', 'aa'], 'uơ': ['u', 'ow'], 'ai': ['a', 'i'], 'ay': ['aw', 'i'], 'ao': ['a', 'u'], 'au': ['aw', 'u'], 'âu': ['aa', 'u'],
    'ây': ['aa', 'i'], 'eo': ['e', 'u'], 'êu': ['ee', 'u'], 'iu': ['i', 'u'], 'oi': ['o', 'i'], 'ôi': ['oo', 'i'], 'ơi': ['ow', 'i'],
    'ui': ['u', 'i'], 'ưi': ['uw', 'i'], 'ưu': ['uw', 'u'], 'oai': ['u', 'a', 'i'], 'oay': ['u', 'aw', 'i'], 'uây': ['u', 'aa', 'i'],
    'uyê': ['u', 'i', 'aa'], 'iêu': ['i', 'aa', 'u'], 'yêu': ['i', 'aa', 'u'], 'ươi': ['uw', 'ow', 'i'], 'ươu': ['uw', 'ow', 'u'],
    'uôi': ['u', 'aa', 'i'], 'oeo': ['u', 'e', 'u'], 'uyu': ['u', 'i', 'u'],
  };
  /* 음절 하나 → [{id, w}] (w = 상대 길이) */
  function sylPhonemes(sy) {
    let s = baseOf(sy), out = [], m;
    m = s.match(/^(ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdđghklmnpqrstvx])/);
    let onset = m ? m[1] : '';
    let rest = s.slice(onset.length);
    if (onset === 'gi' && !/^gi[aăâeêioôơuưy]/.test(s)) rest = 'i' + s.slice(2);    // gì·gìn: gi 의 i 가 모음도 겸한다 → z + i
    if (onset === 'qu') { out.push({ id: 'k', w: .18 }, { id: 'u', w: .12 }); }
    else if (onset) out.push({ id: ONSET[onset] || 'b', w: onset === 'h' ? .18 : .22 });
    m = rest.match(/(ch|c|ng|nh|n|m|p|t)$/);
    let coda = m ? m[1] : '';
    let nuc = coda ? rest.slice(0, rest.length - coda.length) : rest;
    if (!nuc && coda) { nuc = coda; coda = ''; }
    let seq = VSEQ[nuc];
    if (!seq) { seq = []; for (const ch of nuc) { const id = VOW1[ch]; if (id && seq[seq.length - 1] !== id) seq.push(id); } }
    if (!seq.length) seq = ['a'];
    const round = /[oôu]$/.test(nuc);
    seq.forEach((id, i) => out.push({ id, w: (coda ? .5 : .68) / seq.length }));
    if (coda) {
      const id = coda === 'p' ? 'p' : coda === 't' ? 'tf' : coda === 'c' ? (round ? 'kp' : 'kf') : coda === 'ch' ? 'kf' :
        coda === 'm' ? 'm' : coda === 'n' ? 'n' : coda === 'ng' ? (round ? 'ngm' : 'ng') : 'nh';
      out.push({ id, w: .22 });
    }
    return out;
  }
  /* 낱말 → 키프레임 [[t, 자세], ...] (0~1) — 음절마다 같은 몫, 그 안에서는 소리 무게대로 */
  function wordKeys(word) {
    const sy = String(word || '').trim().split(/\s+/).filter(Boolean);
    const segs = [];
    sy.forEach(s => {
      const ph = sylPhonemes(s), tot = ph.reduce((a, p) => a + p.w, 0) || 1;
      ph.forEach(p => segs.push({ id: p.id, w: p.w / tot / sy.length }));
    });
    if (!segs.length) segs.push({ id: 'a', w: 1 });
    const kf = [[0, 'rest']];
    let t = 0.04;
    const scale = 0.92;
    segs.forEach(sg => {
      const a = t, b = t + sg.w * scale;
      kf.push([a + (b - a) * .38, sg.id], [b - (b - a) * .12, sg.id]);
      t = b;
    });
    kf.push([Math.min(.999, t + .04), 'rest'], [1, 'rest']);
    return { kf, segs };
  }
  function domKey(kf, t) {
    let i = 0;
    while (i < kf.length - 2 && t > kf[i + 1][0]) i++;
    const a = kf[i], b = kf[i + 1], u = b[0] === a[0] ? 1 : clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
    return { a: a[1], b: b[1], u };
  }

  /* ── 그림 ── */
  let UID = 0;
  function svgMarkup(p) {
    const f = id => p + id;
    return `<svg viewBox="0 0 680 330" width="100%" role="img" aria-label="입모양 모식도">
<title>입 단면 모식도</title>
<defs>
<clipPath id="${f('fclip')}"><ellipse id="${f('fce')}" cx="561" cy="116" rx="40" ry="20"/></clipPath>
<marker id="${f('ar')}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>
<g transform="translate(262,6)">
<path id="${f('nas')}" fill="#378ADD" fill-opacity=".14" stroke="none" d="M58 122C58 100 84 94 118 94L286 96C304 97 314 104 314 122L314 134L298 130C270 131 244 129 214 122C182 121 150 126 122 135C112 141 106 149 104 155L96 167C80 153 66 141 58 122Z"/>
<path id="${f('nasArr')}" fill="none" stroke="#378ADD" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#${f('ar')})" d="M300 112L110 108L70 112" opacity="0"/>
<path fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-linecap="round" d="M100 12C84 34 58 60 36 96C29 107 27 114 35 118C41 121 47 120 52 124C58 130 62 138 66 148"/>
<path id="${f('tg')}" fill="#F4C0D1" stroke="#993556" stroke-width="1.6" stroke-linejoin="round"/>
<g id="${f('jawg')}">
<path fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-linecap="round" d="M62 232C54 246 52 262 62 278C82 296 130 304 190 306C230 307 270 304 300 300"/>
<rect x="86" y="198" width="10" height="30" rx="3" fill="var(--card)" stroke="var(--dim)" stroke-width="1.5"/>
</g>
<path id="${f('roof')}" fill="none" stroke="var(--dim)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="84" y="158" width="10" height="34" rx="3" fill="var(--card)" stroke="var(--dim)" stroke-width="1.5"/>
<path id="${f('v1')}" fill="none" stroke="#993556" stroke-width="13" stroke-linecap="round"/>
<path id="${f('v2')}" fill="none" stroke="#F4C0D1" stroke-width="10" stroke-linecap="round"/>
<path fill="none" stroke="var(--dim)" stroke-width="2.5" stroke-linecap="round" d="M314 92V302"/>
<g id="${f('lar')}"><ellipse cx="303" cy="288" rx="4" ry="8" fill="#F4C0D1" stroke="#993556" stroke-width="1.4"/><ellipse cx="311" cy="288" rx="4" ry="8" fill="#F4C0D1" stroke="#993556" stroke-width="1.4"/></g>
<path id="${f('lu1')}" fill="none" stroke="#993556" stroke-linecap="round"/>
<path id="${f('lu2')}" fill="none" stroke="#D4537E" stroke-linecap="round"/>
<path id="${f('ll1')}" fill="none" stroke="#993556" stroke-linecap="round"/>
<path id="${f('ll2')}" fill="none" stroke="#D4537E" stroke-linecap="round"/>
<path id="${f('airO')}" fill="none" stroke="#378ADD" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#${f('ar')})" d="M44 190L14 190" opacity="0"/>
<circle id="${f('m1')}" r="8" fill="none" stroke="#E24B4A" stroke-width="2.2" opacity="0"/>
<circle id="${f('m1d')}" r="2.6" fill="#E24B4A" opacity="0"/>
<circle id="${f('m2')}" r="8" fill="none" stroke="#E24B4A" stroke-width="2.2" opacity="0"/>
<circle id="${f('m2d')}" r="2.6" fill="#E24B4A" opacity="0"/>
<g id="${f('names')}" fill="var(--dim)" font-size="17">
<g stroke="var(--line)" stroke-width="1"><path d="M190 42V104"/><path d="M104 66V152"/><path d="M160 66V130"/><path d="M262 66V136"/><path d="M30 190L50 186"/><path d="M324 168L294 176"/><path d="M324 214L302 214"/><path d="M324 292L318 290"/></g>
<text x="190" y="36" text-anchor="middle">코안</text><text x="104" y="60" text-anchor="middle">잇몸</text><text x="160" y="60" text-anchor="middle">입천장</text>
<text x="262" y="60" text-anchor="middle">연구개</text><text x="26" y="194" text-anchor="end">입술</text><text x="328" y="172">목젖</text>
<text x="328" y="218">혀뿌리</text><text x="328" y="296">성대</text>
</g>
</g>
<g transform="translate(-442 0)">
<rect x="462" y="26" width="198" height="172" rx="12" fill="var(--bg)" stroke="var(--line)"/>
<g transform="translate(561 120) scale(1.3) translate(-561 -116)">
<ellipse id="${f('lipO')}" cx="561" cy="116" rx="52" ry="26" fill="#D4537E" stroke="#993556" stroke-width="1.6"/>
<ellipse id="${f('opn')}" cx="561" cy="116" rx="40" ry="20" fill="#4A1B0C"/>
<g clip-path="url(#${f('fclip')})">
<rect id="${f('tU')}" x="520" y="96" width="80" height="8" rx="2" fill="#F1EFE8"/>
<rect id="${f('tL')}" x="520" y="130" width="80" height="6" rx="2" fill="#F1EFE8"/>
<rect id="${f('tT')}" x="520" y="120" width="80" height="40" rx="12" fill="#ED93B1"/>
</g>
<ellipse id="${f('opl')}" cx="561" cy="116" rx="40" ry="20" fill="none" stroke="#993556" stroke-width="1.2"/>
</g>
<g font-size="15" fill="var(--dim)">
<rect x="474" y="214" width="14" height="14" rx="3" fill="#F4C0D1" stroke="#993556" stroke-width="1.2"/><text x="496" y="226">혀·연구개</text>
<rect x="474" y="240" width="14" height="14" rx="3" fill="#D4537E" stroke="#993556" stroke-width="1.2"/><text x="496" y="252">입술</text>
<rect x="474" y="266" width="14" height="14" rx="3" fill="#378ADD" fill-opacity=".3" stroke="#378ADD" stroke-width="1.2"/><text x="496" y="278">콧길(코소리)</text>
<circle cx="481" cy="299" r="7" fill="none" stroke="#E24B4A" stroke-width="2"/><text x="496" y="304">닿는 곳</text>
</g>
</g>
</svg>`;
  }

  function create(host) {
    const p = 'mm' + (++UID) + '_';
    host.innerHTML = svgMarkup(p);
    const $ = id => host.querySelector('#' + p + id);
    const set = (e, k, v) => e.setAttribute(k, v);
    const els = {};
    ['nas', 'nasArr', 'tg', 'jawg', 'roof', 'v1', 'v2', 'lar', 'lu1', 'lu2', 'll1', 'll2', 'airO', 'm1', 'm1d', 'm2', 'm2d',
      'lipO', 'opn', 'opl', 'fce', 'tU', 'tL', 'tT', 'names'].forEach(k => { els[k] = $(k); });
    function cap(a, b, x1, y1, x2, y2, w) {
      const d = 'M' + f1(x1) + ' ' + f1(y1) + 'L' + f1(x2) + ' ' + f1(y2);
      set(a, 'd', d); set(a, 'stroke-width', f1(w + 2.4)); set(b, 'd', d); set(b, 'stroke-width', f1(w));
    }
    function render(pz, mk) {
      set(els.jawg, 'transform', 'rotate(' + f1(-pz.jaw * JMAX) + ' ' + PX + ' ' + PY + ')');
      const fl = FLOOR.map(q => rot(q[0], q[1], pz.jaw));
      const stn = (sv, g) => { const r = roofAt(sv), yf = fy(fl, r.x), y = r.y + g * (yf - r.y); return [r.x, Math.min(y, yf - 24)]; };
      const top = [[pz.tx, pz.ty], stn(1.35, pz.gF * .85 + .04), stn(2.7, pz.gF), stn(4.2, pz.gM), stn(5.7, (pz.gM + pz.gB) / 2), stn(7.0, pz.gB)];
      const last = fl[fl.length - 1];
      const pts = top.concat([[WX - pz.gR + 2, Math.min(206, fy(fl, WX - pz.gR) - 30)]]).concat(fl).concat([[Math.min(pz.tx + 9, last[0]), Math.min(pz.ty + 17, last[1] - 6)]]);
      set(els.tg, 'd', cr(pts, true));
      set(els.roof, 'd', cr(ROOF.slice(0, 7), false));
      const T = [lerp(305, 288, pz.vel), lerp(127, 196, pz.vel)], C = [lerp(272, 286, pz.vel), lerp(128, 150, pz.vel)];
      const vd = 'M240 133Q' + f1(C[0]) + ' ' + f1(C[1]) + ' ' + f1(T[0]) + ' ' + f1(T[1]);
      set(els.v1, 'd', vd); set(els.v2, 'd', vd);
      set(els.nas, 'fill-opacity', f1(.12 + .2 * pz.vel));
      set(els.nasArr, 'opacity', f1(pz.vel));
      set(els.airO, 'opacity', f1(pz.air));
      set(els.lar, 'transform', 'translate(0 ' + f1(pz.lar * 12) + ')');
      const pr = Math.max(0, -pz.lipR) * 15 - Math.max(0, pz.lipR) * 3, tk = 12 + Math.max(0, -pz.lipR) * 5, ux = 70 - pr;
      cap(els.lu1, els.lu2, ux + 2, 150, ux - 2, 182, tk);
      const l1 = rot(72, 204, pz.jaw), l2 = rot(70, 230, pz.jaw);
      let sx = 0, sy = 0;
      if (pz.lipC > 0) { sx += pz.lipC * (ux - l1[0]); sy += pz.lipC * (186 - l1[1]); }
      if (pz.lipD > 0) { sx += pz.lipD * (88 - l1[0]); sy += pz.lipD * (198 - l1[1]); }
      cap(els.ll1, els.ll2, l1[0] + sx - pr, l1[1] + sy, l2[0] + sx * .6 - pr * .6, l2[1] + sy * .6, tk);
      const M = { lip: [ux - 1, 184], lab: [88, 196], dent: [97, 187], alv: [105, 158], post: [124, 145], vel: [254, 139], glo: [308, 288 + pz.lar * 12] };
      [['m1', 'm1d'], ['m2', 'm2d']].forEach((ids, k) => {
        const q = (mk && mk.pl[k]) ? M[mk.pl[k]] : null;
        set(els[ids[0]], 'opacity', q ? f1(mk.a) : 0); set(els[ids[1]], 'opacity', q ? f1(mk.a) : 0);
        if (q) { [ids[0], ids[1]].forEach(i => { set(els[i], 'cx', f1(q[0])); set(els[i], 'cy', f1(q[1])); }); }
      });
      const cy = 116, rw = pz.lipR >= 0 ? lerp(44, 58, clamp(pz.lipR, 0, 1)) : lerp(44, 20, -pz.lipR);
      let oh = (pz.jaw * 30 + 1.5) * (1 - pz.lipC) * (1 - pz.lipD * .75);
      if (pz.lipR < -.4) oh = Math.max(oh, rw * .42 * (1 - pz.lipC));
      const lt = pz.lipC > .5 ? 12 : (9 + Math.max(0, -pz.lipR) * 7 - Math.max(0, pz.lipR) * 2);
      set(els.lipO, 'rx', f1(rw + lt)); set(els.lipO, 'ry', f1(oh + lt * .85));
      ['opn', 'opl', 'fce'].forEach(id => { set(els[id], 'rx', f1(rw)); set(els[id], 'ry', f1(Math.max(oh, .8))); });
      const tu = Math.min(oh * .9, 11), tl = oh > 15 ? Math.min(oh * .55, 8) : 0;
      set(els.tU, 'y', f1(cy - oh)); set(els.tU, 'height', f1(tu));
      set(els.tL, 'y', f1(cy + oh - tl)); set(els.tL, 'height', f1(tl));
      let lv = clamp((.6 - pz.gF) / .6, 0, 1); if (pz.ty < 180) lv = Math.max(lv, .85);
      set(els.tT, 'y', f1(cy + oh - oh * 2 * (.22 + .62 * lv)));
      set(els.tT, 'opacity', oh > 4 ? 1 : 0); set(els.tU, 'opacity', oh > 3 ? 1 : 0);
    }
    let cur = null;
    const api = {
      root: host,
      setWord(word) { cur = wordKeys(word); cur.word = word; api.at(1); },
      keys() { return cur; },
      /* t: 0~1 (낱말 시간표 위 위치). 지금 나는 소리 id 를 돌려준다 */
      at(t) {
        if (!cur) return 'rest';
        const dk = domKey(cur.kf, clamp(t, 0, 1)), a = POSE[dk.a], b = POSE[dk.b], u = sm(dk.u);
        const pose = blend(a, b, u), key = dk.u > .5 ? dk.b : dk.a, src = POSE[key], alpha = Math.abs(dk.u - .5) * 2;
        render(pose, { pl: src.pl, a: key === 'rest' ? 0 : clamp(alpha * 1.4, 0, 1) });
        return key;
      },
      names(on) { els.names.style.display = on ? '' : 'none'; },
    };
    render(POSE.rest, null);
    return api;
  }
  return { create, SI, wordKeys, sylPhonemes };
})();
if (typeof window !== 'undefined') window.MOUTH = MOUTH;
