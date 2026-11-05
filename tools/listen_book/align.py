#!/usr/bin/env python3
"""받아쓴 시각(whisper/*.json)을 교재 글(tools/book_ex/src/v{권}_b{과}.txt)에 맞대어 문장마다 시작·끝 시각을 얻는다.
화면 글은 교재 글 그대로. 과 글 전체에서 음원과 가장 잘 맞는 구간을 국소 정렬(Smith-Waterman, 음절 단위·성조 뗀 비교)로 찾는다.
결과: ~/짜오짜오/듣기연습/align/<같은 이름>.json (저장소 밖 — 교재 원문)"""
import json, pathlib, re, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parents[2]
SRC = R / 'tools/book_ex/src'
W = pathlib.Path.home() / '짜오짜오/듣기연습/whisper'
OUT = pathlib.Path.home() / '짜오짜오/듣기연습/align'
SPK = re.compile(r"^((?:[A-ZĐÀ-Ỹ][\wÀ-ỹ.]*\s?){1,3}|[A-Z]{1,3})\s*:\s*")
def base(s):
    s = U.normalize('NFD', s.lower()); s = ''.join(c for c in s if U.category(c) != 'Mn').replace('đ', 'd')
    return s
def toks(s):
    return [t for t in re.findall(r"[\wÀ-ỹđĐ]+", U.normalize('NFC', s)) if not t.isdigit() or True]
def lesson_lines(vol, bai):
    out = []
    for ln in (SRC / f'v{vol}_b{bai}.txt').read_text(encoding='utf-8').splitlines():
        ln = ln.strip()
        if not ln or ln.startswith('## '): out.append(None); continue
        out.append(ln)
    return out
def align(a, b):
    """a: 교재 음절(base), b: 받아쓴 음절(base). 국소 정렬 → b 의 j 에 맞은 a 의 i 짝들"""
    n, m = len(a), len(b)
    H = [[0] * (m + 1) for _ in range(n + 1)]; P = [[0] * (m + 1) for _ in range(n + 1)]
    best = (0, 0, 0)
    for i in range(1, n + 1):
        ai = a[i - 1]; Hi, Hp, Pi = H[i], H[i - 1], P[i]
        for j in range(1, m + 1):
            d = Hp[j - 1] + (2 if ai == b[j - 1] else -1)
            u = Hp[j] - 1; l = Hi[j - 1] - 1
            v = max(0, d, u, l); Hi[j] = v
            Pi[j] = 0 if v == 0 else (1 if v == d else 2 if v == u else 3)
            if v > best[0]: best = (v, i, j)
    i, j = best[1], best[2]; pairs = []
    while i > 0 and j > 0 and P[i][j]:
        if P[i][j] == 1:
            if a[i - 1] == b[j - 1]: pairs.append((i - 1, j - 1))
            i -= 1; j -= 1
        elif P[i][j] == 2: i -= 1
        else: j -= 1
    return pairs[::-1], best[0]
def run(f):
    d = json.loads(f.read_text())
    m = re.search(r'Q(\d)\..*?B(?:ài)?\s*(\d+)', U.normalize('NFC', d['file']), re.I)
    vol, bai = int(m.group(1)), int(m.group(2))
    lines = lesson_lines(vol, bai)
    A, own = [], []
    for li, ln in enumerate(lines):
        if not ln: continue
        body = SPK.sub('', ln)
        for t in toks(body): A.append(base(t)); own.append(li)
    ws = [w for w in d['words'] if re.search(r'\w', w['w'])]
    B, bt = [], []
    for w in ws:
        for t in toks(w['w']): B.append(base(t)); bt.append(w)
    pairs, score = align(A, B)
    if not pairs: return None
    hit = {}
    for i, j in pairs: hit.setdefault(own[i], []).append(bt[j])
    lo, hi = min(hit), max(hit)
    res = []
    for li in range(lo, hi + 1):
        ln = lines[li]
        if not ln: continue
        n = sum(1 for t in toks(SPK.sub('', ln)))
        h = hit.get(li, [])
        if not n or len(h) / n < .4: continue
        sp = SPK.match(ln)
        res.append({'sp': sp.group(1).strip() if sp else '', 'vi': SPK.sub('', ln).strip(), 's': h[0]['s'], 'e': h[-1]['e'], 'r': round(len(h) / n, 2)})
    for k in range(len(res) - 1): res[k]['e'] = round(max(res[k]['e'], min(res[k + 1]['s'] - .05, res[k]['e'] + .6)), 2)
    if res: res[-1]['e'] = round(min(d['dur'], res[-1]['e'] + .5), 2)
    cover = len(pairs) / max(1, len(B))
    return {'file': d['file'], 'vol': vol, 'bai': bai, 'dur': d['dur'], 'cover': round(cover, 2), 'lines': res}
if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    pat = re.compile(sys.argv[1] if len(sys.argv) > 1 else '.')
    for f in sorted(W.glob('*.json')):
        if not pat.search(U.normalize('NFC', f.name)): continue
        r = run(f)
        if not r: print('X', f.name); continue
        (OUT / U.normalize('NFC', f.name)).write_text(json.dumps(r, ensure_ascii=False, indent=1))
        print(f"{r['cover']:.2f} {len(r['lines']):3d} {f.name}")
