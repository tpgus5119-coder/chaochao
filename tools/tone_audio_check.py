#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""성조 가족 낱말의 소리가 **표시된 성조대로 들리는지** 목소리 높이 곡선으로 잰다 → data/_tone_audio_chk.json

왜 (2026-09-28): 성조 테스트는 소리만 듣고 성조를 고르는 시험이다. 소리가 표시와 다른 성조로 들리면 문제가 틀린다.
한 음절은 받아쓰기(Whisper)를 믿지 못한다(기준 §소리 검수: 한 음절 0.58). 그래서 **글자가 아니라 높이 곡선**을 본다.

어떻게 (셀 수 있는 일 — AI 를 부르지 않는다)
① 파일마다 목소리 높이(F0)를 10ms 간격으로 잰다(YIN 방식, numpy). 목소리별 기준 높이(중앙값)에 대한 반음 값으로 바꾼다.
② 곡선의 모양(처음·끝·가운데 높이, 최저·최고와 그 자리, 기울기, 중간 끊김, 길이, 막힌 음절 여부)을 숫자 18개로 뽑는다.
③ 이 숫자로 성조를 가려내는 판별기(랜덤 포레스트)를 **5겹 교차 검증**으로 돌린다 — 파일마다 자기를 빼고 배운 판별기가 판정한다.
④ 표시된 성조일 확률이 0.2 미만이면 '다르게 들림'. hỏi·ngã 는 북부 발음에서 곡선이 거의 같아 한 무리로 친다.

실측(2026-09-28, 4,775낱말 × 여·남): 판별 정확도 91%(옛 소리) · 89%(새 소리). 다르게 들림 옛 1.4% · 새 1.2%.
틀린 것 대부분은 nặng→huyền(둘 다 낮게 내려감)·hỏi↔ngã 였다.
따로 걸러야 하는 것: 막힌 음절(-p·-t·-c·-ch)은 본래 sắc·nặng 만 있다. 부호 없는 net·hot·bit·chip 같은 외래어는 올라가게 읽힌다.

쓰기: python3 tools/tone_audio_check.py        (약 1분)
결과: {"th": 0.2, "w": {낱말: {"f": [판정 성조, 표시 성조 확률], "m": [...]}}, "bad": [다르게 들리는 낱말]}
"""
import hashlib
import json
import multiprocessing as mp
import os
import subprocess
import unicodedata

import numpy as np

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, "data/_tone_audio_chk.json")
SR, HOP, WIN = 16000, 160, 640
TH = 0.2
MARK = {'̀': 'huyền', '́': 'sắc', '̉': 'hỏi', '̃': 'ngã', '̣': 'nặng'}
GROUP = {'hỏi': 'hỏi/ngã', 'ngã': 'hỏi/ngã'}
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]


def tone_of(s):
    for ch in unicodedata.normalize('NFD', s):
        if ch in MARK:
            return MARK[ch]
    return 'ngang'


def checked(s):
    b = ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if not unicodedata.combining(c))
    return b.endswith(('p', 't', 'c', 'ch'))


def yin(x, fmin=65, fmax=420):
    tmax, tmin = SR // fmin, SR // fmax
    n = (len(x) - WIN - tmax) // HOP
    if n <= 0:
        return None
    idx = np.arange(WIN)[None, :] + (np.arange(n) * HOP)[:, None]
    fr = x[idx]
    d = np.zeros((n, tmax + 1))
    for tau in range(1, tmax + 1):
        d[:, tau] = ((fr - x[idx + tau]) ** 2).sum(1)
    cm = np.cumsum(d[:, 1:], 1) / np.arange(1, tmax + 1)
    dn = np.ones_like(d)
    dn[:, 1:] = d[:, 1:] / np.maximum(cm, 1e-12)
    f0, ap = np.zeros(n), np.ones(n)
    for i in range(n):
        row = dn[i, tmin:]
        below = np.where(row < 0.15)[0]
        if len(below):
            j = below[0]
            while j + 1 < len(row) and row[j + 1] < row[j]:
                j += 1
        else:
            j = int(np.argmin(row))
        tau = j + tmin
        ap[i] = row[j]
        if 0 < tau < tmax:
            a, b, c = dn[i, tau - 1], dn[i, tau], dn[i, tau + 1]
            den = a - 2 * b + c
            tau = tau + (0.5 * (a - c) / den if den else 0)
        f0[i] = SR / tau
    rms = np.sqrt((fr ** 2).mean(1))
    return np.where((ap < 0.3) & (rms > rms.max() * 0.08), f0, 0.0)


def measure(args):
    t, v = args
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', f'{R}/audio/{v}/n/{k12(t)}.mp3', '-f', 'f32le', '-ac', '1',
                          '-ar', str(SR), '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    f0 = yin(x)
    return t, v, len(x) / SR, ([] if f0 is None else f0.tolist())


def feats(w, v, dur, f0, ref):
    a = np.array(f0)
    idx = np.where(a > 0)[0]
    if len(idx) < 4:
        return None
    st = 12 * np.log2(a[idx] / ref[v])
    keep = np.abs(st - np.median(st)) < 7                  # 옥타브 튐 버림
    st, idx = st[keep], idx[keep]
    if len(st) < 4:
        return None
    sm = np.array([np.median(st[max(0, i - 1):i + 2]) for i in range(len(st))])
    n = len(sm)
    q = max(1, n // 4)
    a0, a1 = sm[:q].mean(), sm[-q:].mean()
    mid = sm[q:n - q].mean() if n - 2 * q > 0 else sm.mean()
    h = n // 2
    s1 = np.polyfit(np.arange(h), sm[:h], 1)[0] if h >= 2 else 0
    s2 = np.polyfit(np.arange(n - h), sm[h:], 1)[0] if n - h >= 2 else 0
    gap = (idx[-1] - idx[0] + 1) - len(idx)                 # 유성 구간 안의 끊김(성문 폐쇄)
    return [a0, a1, mid, a1 - a0, sm.min(), sm.max(), np.argmin(sm) / (n - 1), np.argmax(sm) / (n - 1), sm.mean(),
            n / 100, dur, gap / 100, s1, s2, a0 - sm.min(), a1 - sm.min(), float(checked(w)), float(v == 'm')]


def main():
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import StratifiedKFold, cross_val_predict
    sib = json.load(open(os.path.join(R, 'data/sib.json'), encoding='utf-8'))
    ai = json.load(open(os.path.join(R, 'data/audio_index.json'), encoding='utf-8'))
    words = sorted({w for vs in sib['t'].values() for w in vs
                    if ai.get(w) == k12(w) and all(os.path.exists(f'{R}/audio/{v}/n/{k12(w)}.mp3') for v in 'fm')})
    with mp.Pool(8) as pool:
        got = pool.map(measure, [(w, v) for w in words for v in 'fm'], chunksize=20)
    ref = {v: float(np.median([x for t, vv, d, f in got if vv == v for x in f if x > 0])) for v in 'fm'}
    X, y, rows, res = [], [], [], {}
    for t, v, d, f in got:
        ft = feats(t, v, d, f, ref)
        if ft is None:
            res.setdefault(t, {})[v] = ['?', 0.0]           # 높이를 못 잼 → 쓰지 않는다
            continue
        X.append(ft); y.append(tone_of(t)); rows.append((t, v))
    X, y = np.array(X), np.array(y)
    clf = RandomForestClassifier(n_estimators=400, min_samples_leaf=2, random_state=0, n_jobs=-1)
    P = cross_val_predict(clf, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0), method='predict_proba')
    cls = sorted(set(y))
    for (t, v), p, lab in zip(rows, P, y):
        g = GROUP.get(lab, lab)
        pl = sum(p[cls.index(c)] for c in cls if GROUP.get(c, c) == g)
        res.setdefault(t, {})[v] = [cls[int(np.argmax(p))], round(float(pl), 3)]
    acc = float(np.mean([cls[int(np.argmax(p))] == lab for p, lab in zip(P, y)]))
    bad = sorted(w for w, r in res.items() if any(r.get(v, ['?', 0])[1] < TH for v in 'fm'))
    # 막힌 음절에 sắc·nặng 이 아닌 성조 = 베트남어 본래 음절이 아니다(외래어 net·hot…) — 소리와 상관없이 뺀다
    foreign = sorted(w for w in res if checked(w) and tone_of(w) not in ('sắc', 'nặng'))
    json.dump({'th': TH, 'acc': round(acc, 3), 'w': res, 'bad': bad, 'foreign': foreign},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'낱말 {len(words)} · 파일 {len(got)} · 판별 정확도 {acc:.3f} · 다르게 들림 {len(bad)} · 막힌 음절 외래어 {len(foreign)}')


if __name__ == '__main__':
    main()
