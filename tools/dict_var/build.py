#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 — 같은 낱말의 다른 표기를 한 줄로 (2026-10-13, 대표님 "킬로미터 검색했을 때 같은 뜻인데 단어가 5개나 나온다, 성조도 다르다. 하나만 나와야지.
다른 것들도 이런 식으로 나오는 것 많음 — 다 하나로 통일시켜. 왜 이런 현상이 있니?").
까닭: 사전 한 벌(data/_dict_full.json)은 위키낱말사전을 그대로 옮긴 것이라, 위키가 표기마다 따로 둔 표제어(kilomet · ki lô mét · kilômét · kilômet · ki-lô-mét)가
그대로 다섯 줄이 됐다. 앱은 성조 자리 차이(hoà/hòa, kì/kỳ — viCanon)만 한 줄로 묶었다.
묶는 규칙(셀 수 있는 일 — AI 안 씀):
  ① 글자 뼈대가 같다 — 성조·모자·đ·띄어쓰기·하이픈을 다 뺀 글자(y=i)가 같음
  ② 뜻 구절이 하나라도 같다 — '(다른 꼴)' 꼬리는 떼고 견줌
  ③ 두 음절 이상인 꼴만 — 음절 수 = 모음 덩어리 수(kilomet 3 · ampe 2). 한 음절 낱말은 뼈대가 같아도 다른 말이 많아(mai/may·tân/tấn·triệu/triều·tỏi/toi) 묶지 않는다
  ④ viCanon 이 같은 것끼리는 앱이 이미 한 줄로 묶으므로 viCanon 이 둘 이상 갈리는 묶음만 적는다
  ⓪ 글자는 똑같고 점·띄어쓰기·하이픈만 다른 것은 한 음절·약어도 늘 묶는다(bs / bs.)
  ⑥ 외래어 옮겨 적기만 다른 것은 뜻 구절이 똑같고 글자가 85% 넘게 같으면(công-gô/congo · violon/viôlông). 우리말 낱말끼리는 다른 말이라 안 묶는다
  ⑤ 위키가 뜻을 모두 '(다른 꼴)'로 적은 표제어는 뼈대가 조금 달라도 뜻이 같고 글자가 60% 넘게 같은 두 음절 이상 낱말이 하나뿐이면 그 줄로(guitar → ghi-ta)
대표 표기: ① 앱 수업 자료에 나오는 꼴 ② 뜻이 모두 '(다른 꼴)'인 것은 뒤로 ③ 자주 쓰는 순위(_dict_freq) ④ 뜻이 많은 것 ⑤ 하이픈 없는 것 ⑥ 짧은 것.
나머지 꼴은 대표 줄의 '다른 표기'가 되고, 그 꼴로 찾아도 대표 줄이 나온다. 다른 꼴에만 있던 뜻은 대표 줄에 보탠다.
쓰기: python3 tools/dict_var/build.py → data/_dict_var.json  {대표 열쇠: {"v": [다른 꼴 열쇠…], "add": [[품사, 뜻]…]}}"""
import json, re, pathlib, collections, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
TONE = {'̀': 1, '́': 2, '̉': 3, '̃': 4, '̣': 5}
ONSET_Y = re.compile(r'^(b|c|ch|d|đ|g|gh|h|k|kh|l|m|n|ng|ngh|nh|p|ph|r|s|t|th|tr|v|x|qu)y$')
def vicanon(s):
    out = []
    for syl in re.sub(r'[.,!?;:…"“”()]+', ' ', U.normalize('NFC', s).lower()).split():
        t = 0; base = ''
        for c in U.normalize('NFD', syl):
            if c in TONE: t = TONE[c]
            else: base += c
        base = U.normalize('NFC', base)
        out.append((base[:-1] + 'i' if ONSET_Y.match(base) else base) + (str(t) if t else ''))
    return ' '.join(out)
def skel(s):
    t = ''.join(c for c in U.normalize('NFD', s.lower()) if not U.combining(c)).replace('đ', 'd')
    return re.sub(r'[^a-z0-9]', '', t).replace('y', 'i')
def nsyl(s): return len(re.findall(r'[aeiouy]+', skel_keep(s)))   # 음절 수 = 모음 덩어리 수 (kilomet 3 · ampe 2 · triều 1)
def skel_keep(s): return ''.join(c for c in U.normalize('NFD', s.lower()) if not U.combining(c)).replace('đ', 'd').replace('-', ' ')
ALT = re.compile(r'\s*\(다른 꼴\)\s*')
def senses(e): return {ALT.sub('', x).strip() for x in e['s'] if ALT.sub('', x).strip()}
def course_forms():
    out = set()
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == 'vi' and isinstance(v, str): out.add(U.normalize('NFC', v).strip().lower())
                else: walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    for f in ('days.json', 'order.json', 'gybm.json', 'daily22.json'):
        p = R / 'data' / f
        if p.exists(): walk(json.loads(p.read_text(encoding='utf-8')))
    return out
def main():
    D = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    F = json.loads((R / 'data/_dict_freq.json').read_text(encoding='utf-8'))
    C = course_forms()
    G = collections.defaultdict(list)
    for k in D: G[skel(k)].append(k)
    out = {}; n_words = 0; ex = []
    for sk, ks in G.items():
        if len(ks) < 2: continue
        ks = [k for k in ks if nsyl(k) >= 2]                    # 두 음절 이상인 꼴만 (triệu/triều·tỏi/toi 처럼 한 음절은 다른 말)
        if len(ks) < 2: continue
        par = {k: k for k in ks}
        def f(x):
            while par[x] != x: x = par[x]
            return x
        for i in range(len(ks)):
            for j in range(i + 1, len(ks)):
                if senses(D[ks[i]]) & senses(D[ks[j]]): par[f(ks[i])] = f(ks[j])
        cl = collections.defaultdict(list)
        for k in ks: cl[f(k)].append(k)
        for g in cl.values():
            if len(g) < 2 or len({vicanon(k) for k in g}) < 2: continue
            allalt = lambda k: all(ALT.search(x) for x in D[k]['s'])
            g.sort(key=lambda k: (0 if k in C else 1, 1 if allalt(k) else 0, F.get(k, 99999), -len(D[k]['s']), 1 if '-' in k else 0, len(k), k))
            m = g[0]; have = senses(D[m]); add = []
            for v in g[1:]:
                for i, s in enumerate(D[v]['s']):
                    t = ALT.sub('', s).strip()
                    if t and t not in have: have.add(t); add.append([(D[v].get('p') or [''])[i] if i < len(D[v].get('p') or []) else '', t])
            out[m] = {'v': g[1:]}
            if add: out[m]['add'] = add
            n_words += len(g); ex.append(g)
    # ⑤ 위키가 뜻을 모두 '(다른 꼴)'로 적은 표제어 — 뼈대가 조금 달라도(guitar/ghi-ta · xentimét/xăng-ti-mét · nô-el/nô-en) 뜻이 같고 글자가 비슷한(60% 이상)
    #    두 음절 이상 낱말이 하나뿐이면 그 낱말(또는 그 낱말의 대표) 줄로 묶는다. 약어(bs.·ts)는 뺀다
    import difflib
    folded = {v: m for m, o in out.items() for v in o['v']}; folded.update({m: m for m in out})
    isalt = lambda k: bool(D[k]['s']) and all(ALT.search(x) for x in D[k]['s'])
    bys = collections.defaultdict(set)
    for k, e in D.items():
        for t in senses(e): bys[t].add(k)
    n5 = 0
    for k in sorted(D):
        if k in folded or not isalt(k) or nsyl(k) < 2 or '.' in k: continue
        c = set()
        for t in senses(D[k]): c |= bys[t]
        c = {x for x in c if x != k and not isalt(x) and nsyl(x) >= 2}
        sc = sorted(((difflib.SequenceMatcher(None, skel(k), skel(x)).ratio(), x) for x in c), reverse=True)
        if not sc or sc[0][0] < 0.6 or (len(sc) > 1 and sc[1][0] >= sc[0][0]): continue
        m = folded.get(sc[0][1], sc[0][1])
        o = out.setdefault(m, {'v': []}); o['v'].append(k); folded[k] = m; folded.setdefault(m, m); n5 += 1; n_words += 1
        have = senses(D[m]) | {t for _, t in o.get('add', [])}
        for i, x in enumerate(D[k]['s']):
            t = ALT.sub('', x).strip()
            if t and t not in have: have.add(t); o.setdefault('add', []).append([(D[k].get('p') or [''])[i] if i < len(D[k].get('p') or []) else '', t])
    print(f'⑤ 다른 꼴 표제어 더 묶음 {n5}')
    # ⓪ 글자(성조·모자까지)는 똑같고 점·띄어쓰기·하이픈만 다른 것 — 한 음절·약어도 늘 같은 말(bs / bs. · ts / ts. · tp.hcm / tphcm)
    E = collections.defaultdict(list)
    for k in D: E[re.sub(r'[\s.\-–]', '', U.normalize('NFC', k))].append(k)
    n0 = 0
    for g in E.values():
        g = [k for k in g if k not in folded or folded[k] == k]
        if len(g) < 2: continue
        g.sort(key=lambda k: (0 if k in out else 1, 0 if k in C else 1, F.get(k, 99999), -len(D[k]['s']), len(k), k))
        m = g[0]; o = out.setdefault(m, {'v': []})
        for v in g[1:]:
            if v in out: o['v'] += [v] + out.pop(v)['v']
            else: o['v'].append(v)
            folded[v] = m; n0 += 1
        folded[m] = m
    print(f'⓪ 점·띄어쓰기만 다른 것 더 묶음 {n0}')
    # ⑥ 외래어 옮겨 적기만 다른 것(công-gô/congo · violon/viôlông · cocktail/cốc tai · căng-gu-ru/kăng-gu-ru) — 뜻 구절 묶음이 **똑같고** 글자가 85% 넘게 같으며
    #    어느 한쪽이 외래어 꼴(하이픈·f j w z·띄어 쓰지 않은 두 음절 이상 덩어리)일 때. 우리말 낱말끼리(cầu trượt/cầu tuột · mùa hè/mùa hạ)는 다른 말이라 묶지 않는다
    loan = lambda k: '-' in k or re.search('[fjwz]', k) or any(nsyl(t) >= 2 for t in re.split(r'[\s-]+', k))
    root = lambda k: folded.get(k, k)
    BYS = collections.defaultdict(set)
    for k, e in D.items():
        ss = frozenset(senses(e))
        if ss and nsyl(k) >= 2: BYS[ss].add(k)
    n6 = 0
    for ss, ks in BYS.items():
        rs = {}
        for k in ks: rs.setdefault(vicanon(root(k)), root(k))
        rl = sorted(rs.values(), key=lambda k: (0 if k in out else 1, 0 if k in C else 1, F.get(k, 99999), -len(D[k]['s']), 1 if '-' in k else 0, len(k), k))
        for i in range(len(rl)):
            a = root(rl[i])
            for j in range(i + 1, len(rl)):
                b = root(rl[j])
                if a == b or not (loan(a) or loan(b)) or difflib.SequenceMatcher(None, skel(a), skel(b)).ratio() < 0.85: continue
                o = out.setdefault(a, {'v': []})
                moved = [b] + (out.pop(b)['v'] if b in out else [])
                o['v'] += moved
                for v in moved: folded[v] = a
                folded[a] = a; n6 += 1
    print(f'⑥ 외래어 옮겨 적기만 다른 것 더 묶음 {n6}')
    (R / 'data/_dict_var.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    nv = sum(len(o['v']) for o in out.values())
    print(f'묶음 {len(out)} · 표제어 {nv + len(out)} → 줄 {len(out)} (줄어든 줄 {nv})')
    return ex
if __name__ == '__main__':
    import random
    ex = main(); random.seed(3)
    for g in random.sample(ex, 25): print('  ', ' ← '.join([g[0], ' · '.join(g[1:])]))
