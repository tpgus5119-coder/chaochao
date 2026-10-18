#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""낱말 소리 점검·다시 만들기 (2026-10-17 대표님 "소리 모든 단어 하나하나 점검해. 아주 중요한 작업이다" — 오류 보고 đầy).
Whisper 는 한 음절을 거의 못 알아듣는다(đầy 를 'Nè'·'BÂY!'로 받아씀) → 두 갈래로 잰다.
 ① 한 음절 낱말: 소리의 높낮이 흐름(시작~끝 다섯 구간·가장 낮은 자리·길이)을 목소리별로 배운 성조 판정기(로지스틱 회귀, 10겹 교차)에 넣어
    '철자의 성조일 확률'을 낸다. 0.15 아래면 의심.
 ② 여러 음절 말(2~4낱말): Whisper medium 으로 받아써 성조까지 맞댄 일치율(낱말 단위). 0.75 아래면 의심.
 의심 소리는 같은 목소리로 다섯 가지 꼴(그대로 · 끝에 마침표 · 느낌표 · 쉼표 · 첫 글자 대문자+마침표)을 새로 만들어 같은 잣대로 재고,
 가장 잘 맞는 것이 지금보다 뚜렷이 나으면(①은 +0.15·0.3 넘음, ②는 +0.2) 그 파일로 바꾼다(이름 그대로 — 무음 자름·32k 도 같게).
결과·바꾼 목록: tools/_sound_fix/결과.jsonl. 쓰기: python3 tools/sound_fix.py one|multi [--limit N]"""
import asyncio, json, os, re, shutil, subprocess, sys, tempfile, unicodedata as U, pathlib, collections
import numpy as np
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
OUT = R / 'tools/_sound_fix'; OUT.mkdir(exist_ok=True)
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
TONE = {'̀': 'huyen', '́': 'sac', '̉': 'hoi', '̃': 'nga', '̣': 'nang'}
def tone_of(w):
    for c in U.normalize('NFD', w):
        if c in TONE: return TONE[c]
    return 'ngang'
def track(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768; sr, win, hop = 16000, 640, 160
    if len(x) < 2000: return None
    thr = 0.05 * max(1e-6, np.abs(x).max()); out = []
    for s in range(0, len(x) - win, hop):
        seg = x[s:s + win]
        if np.abs(seg).mean() < thr: continue
        seg = seg - seg.mean(); ac = np.correlate(seg, seg, mode="full")[win - 1:]
        if ac[0] <= 0: continue
        ac = ac / ac[0]; lo, hi = int(sr / 400), int(sr / 70); i = lo + int(np.argmax(ac[lo:hi]))
        if ac[i] > 0.45: out.append(sr / i)
    return out
def feat(path, v):
    t = track(path)
    if not t or len(t) < 6: return None
    st = 12 * np.log2(np.array(t) / (225.0 if v == 'f' else 128.0)); k = np.array_split(st, 5); m = [float(np.median(a)) for a in k]
    m += [float(np.argmin(st) / len(st)), len(t) / 100.0]
    return m + [m[4] - m[0], m[2] - m[0], m[4] - m[2]]
def prob(clf, cls, f, w):
    p = f if clf is None else clf.predict_proba([f])[0]   # clf 없으면 f 가 이미 확률
    want = tone_of(w)
    if CHECKED.search(w):                                    # 막힌 받침: sắc 과 nặng 만
        a, b = p[cls.index('sac')], p[cls.index('nang')]; return float((a if want == 'sac' else b) / max(1e-9, a + b))
    return float(p[cls.index(want)])
WORD = re.compile(r'^[a-zà-ỹđ]+$')
CHECKED = re.compile(r'(p|t|c|ch)$')            # 막힌 받침 — 성조가 sắc·nặng 둘뿐이다(그 둘 사이만 견준다)
def real_syl(w):
    n = sum(1 for c in U.normalize('NFD', w) if c in TONE)
    base = U.normalize('NFC', ''.join(c for c in U.normalize('NFD', w) if c not in TONE))
    if CHECKED.search(base) and tone_of(w) not in ('sac', 'nang'): return False      # 막힌 받침에 다른 성조 = 외래어(picnic·axit)
    syl = re.fullmatch(r'(ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdđghklmnpqrstvx])?[aăâeêioôơuưy]+(ng|nh|ch|[mnptcoiuy])?', base)
    return n <= 1 and bool(syl)                                                       # 베트남어 한 음절 꼴만 (đồchơi·block 뺌)
k12 = lambda t: __import__('hashlib').sha1(t.encode()).hexdigest()[:12]
async def synth(text, v, path):
    import edge_tts
    for a in range(4):
        try:
            await asyncio.wait_for(edge_tts.Communicate(text, VOICES[v]).save(str(path)), timeout=40)
            if path.stat().st_size > 1500: return True
        except Exception: await asyncio.sleep(2 + a * 2)
    return False
def finish(p):
    import trim_audio, reencode_32k
    trim_audio.one((p, False)); reencode_32k.one(p)
VARIANTS = lambda w: list(dict.fromkeys([w, w + '.', w + '!', w + ',', w[:1].upper() + w[1:] + '.']))
def log(rec):
    with (OUT / '결과.jsonl').open('a', encoding='utf-8') as f: f.write(json.dumps(rec, ensure_ascii=False) + '\n')

def run_one(limit=None):
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_predict
    import multiprocessing as mp
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    words = sorted({w for w in idx if WORD.match(w) and real_syl(w)})   # 띄어쓰기 빠진 열쇠(chỗngồi)·외래어(block) 뺌
    jobs = [(w, v) for w in words for v in 'fm']
    def F(a): w, v = a; return (w, v, feat(R / 'audio' / v / 'n' / f'{idx[w]}.mp3', v))
    with mp.Pool(8) as pool: rows = [r for r in pool.map(_featjob, [(str(R / 'audio' / v / 'n' / f'{idx[w]}.mp3'), v, w) for w, v in jobs], chunksize=40) if r[2]]
    clfs, cur = {}, {}
    for v in 'fm':
        rv = [r for r in rows if r[1] == v]; X = np.array([r[2] for r in rv]); y = np.array([tone_of(r[0]) for r in rv])
        P = cross_val_predict(LogisticRegression(max_iter=3000), X, y, cv=10, method='predict_proba'); cls = sorted(set(y))
        for r, p in zip(rv, P): cur[(r[0], v)] = prob(None, cls, p, r[0])
        clfs[v] = (LogisticRegression(max_iter=3000).fit(X, y), cls)
    sus = sorted([k for k, p in cur.items() if p < 0.15 or k[0] in FORCE], key=lambda k: cur[k])
    print('한 음절 낱말', len(words), '· 소리', len(rows), '· 의심', len(sus), flush=True)
    if limit: sus = sus[:limit]
    fixed = 0
    for w, v in sus:
        clf, cls = clfs[v]; best = (cur[(w, v)], None, None)
        with tempfile.TemporaryDirectory() as td:
            for i, t in enumerate(VARIANTS(w)):
                p = pathlib.Path(td) / f'{i}.mp3'
                if not asyncio.run(synth(t, v, p)): continue
                finish(p); f = feat(p, v)
                if not f: continue
                pr = prob(clf, cls, f, w)
                if pr > best[0]: best = (pr, t, p.read_bytes())
            rec = {'k': w, 'v': v, 'kind': 'one', 'before': round(cur[(w, v)], 3), 'after': round(best[0], 3), 'text': best[1]}
            if best[2] and best[0] >= max(0.3, cur[(w, v)] + 0.15):
                dst = R / 'audio' / v / 'n' / f'{idx[w]}.mp3'
                bk = OUT / 'old' / v; bk.mkdir(parents=True, exist_ok=True); shutil.copy(dst, bk / dst.name)
                dst.write_bytes(best[2]); rec['fixed'] = 1; fixed += 1
            log(rec); print(rec, flush=True)
    print('바꿈', fixed, '/', len(sus), flush=True)
def _featjob(a):
    p, v, w = a; return (w, v, feat(p, v))
FORCE = {'đầy'}   # 오류 보고로 들어온 낱말 — 판정이 괜찮다고 해도 다섯 꼴을 견줘 본다

U9 = 'không một hai ba bốn năm sáu bảy tám chín'.split()
def n2w(n):
    """숫자 → 베트남어 글 (0~9999). Whisper 는 tháng 12 처럼 숫자로 적는다"""
    if n < 10: return U9[n]
    if n < 20: return 'mười' + ('' if n == 10 else ' ' + ('lăm' if n % 10 == 5 else U9[n % 10]))
    if n < 100:
        t, u = divmod(n, 10); return U9[t] + ' mươi' + ('' if u == 0 else ' ' + ('mốt' if u == 1 else 'lăm' if u == 5 else 'tư' if u == 4 else U9[u]))
    if n < 1000:
        h, r = divmod(n, 100); return U9[h] + ' trăm' + ('' if r == 0 else (' lẻ ' + U9[r] if r < 10 else ' ' + n2w(r)))
    th, r = divmod(n, 1000); return U9[th] + ' nghìn' + ('' if r == 0 else ' ' + (('không trăm ' + ('lẻ ' if r < 10 else '') + n2w(r)) if r < 100 else n2w(r)))
def bare_words(s):
    s = re.sub(r'\d+', lambda m: n2w(int(m.group())) if int(m.group()) < 10000 else m.group(), s)
    EQ = {'tư': 'bốn', 'mốt': 'một', 'lăm': 'năm', 'ngàn': 'nghìn', 'linh': 'lẻ'}   # 같은 수의 다른 말(tháng tư = tháng 4)
    return [EQ.get(w, w) for w in re.sub(r'[^\w\s]', ' ', U.normalize('NFC', s.lower())).split()]
def match(a, b):
    import difflib
    A, B = bare_words(a), bare_words(b)
    return difflib.SequenceMatcher(None, A, B).ratio() if A else 0
def run_multi(limit=None):
    from faster_whisper import WhisperModel
    idx = json.loads((R / 'data/audio_index.json').read_text(encoding='utf-8'))
    A = {}
    for l in (R / 'data/_asr_audit.jsonl').read_text(encoding='utf-8').splitlines():
        try: x = json.loads(l); A[x['k']] = x
        except Exception: pass
    done = set()
    if (OUT / '결과.jsonl').exists():
        for l in (OUT / '결과.jsonl').read_text(encoding='utf-8').splitlines():
            x = json.loads(l)
            if x.get('kind') == 'multi': done.add((x['k'], x['v']))
    cand = [(k, v) for k in idx if 2 <= len(k.split()) <= 4 and k in A for v in 'fm' if (A[k].get(f'{v}_r') or 1) < 0.6 and (k, v) not in done]
    print('여러 음절 의심(작은 모델)', len(cand), flush=True)
    if limit: cand = cand[:limit]
    m = WhisperModel('medium', device='cpu', compute_type='int8', cpu_threads=8)
    tx = lambda p: ' '.join(s.text for s in m.transcribe(str(p), language='vi', beam_size=5)[0]).strip()
    fixed = 0
    for k, v in cand:
        p0 = R / 'audio' / v / 'n' / f'{idx[k]}.mp3'
        if not p0.exists(): continue
        s0 = match(k, tx(p0)); rec = {'k': k, 'v': v, 'kind': 'multi', 'before': round(s0, 2)}
        if s0 >= 0.75: rec['ok'] = 1; log(rec); continue
        best = (s0, None, None)
        with tempfile.TemporaryDirectory() as td:
            for i, t in enumerate(VARIANTS(k)):
                p = pathlib.Path(td) / f'{i}.mp3'
                if not asyncio.run(synth(t, v, p)): continue
                finish(p); s = match(k, tx(p))
                if s > best[0]: best = (s, t, p.read_bytes())
        rec.update({'after': round(best[0], 2), 'text': best[1]})
        if best[2] and best[0] >= s0 + 0.2:
            bk = OUT / 'old' / v; bk.mkdir(parents=True, exist_ok=True); shutil.copy(p0, bk / p0.name)
            p0.write_bytes(best[2]); rec['fixed'] = 1; fixed += 1
        log(rec); print(rec, flush=True)
    print('바꿈', fixed, '/', len(cand), flush=True)
if __name__ == '__main__':
    lim = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    {'one': run_one, 'multi': run_multi}[sys.argv[1]](lim)
