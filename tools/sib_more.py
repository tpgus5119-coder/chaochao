#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""헷갈리는 짝 — 성조·모자가 다른 말을 **사전 전체에서 모두** (대표님 2026-10-18 "초보자 입장에서는 모자랑 성조랑 똑같음. 둘 다 똑같이 느껴짐.
헷갈리는 짝에서 다 보여 줘, 모자·성조 비슷한 것들 모두 다").
data/sib.json 을 고친다(동의어·반의어·뜻은 그대로):
 · 한 음절: 우리 사전(data/_dict_ko.json)에 뜻이 있는데 짝 자료(w)에 없던 음절을 넣고, t·s·k 가족을 다시 짠다
   (k = 성조·모자·đ 를 다 뗀 뼈대가 같은 음절 전부 — 앱은 이것을 '성조·모자가 다른 단어' 한 칸에 모두 보인다)
 · 여러 음절: g = 뼈대가 같은 여러 음절 낱말 묶음(bần cùng ↔ bắn cung, bồn chồn ↔ bôn chôn). 성조 부호 자리만 다른 표기(thuỵ/thụy)는 하나만.
셀 수 있는 일이라 AI 없이. 쓰기: python3 tools/sib_more.py"""
import collections, json, pathlib, re, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from build_lex import strip_tone, strip_all, tone_idx
SYL = re.compile(r"^(ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdghklmnpqrstvx]|)[aeiouy]{1,3}(ch|c|ng|nh|n|m|p|t|)$")
VW = re.compile(r'^[a-zà-ỹđ]+( [a-zà-ỹđ]+){0,3}$')
def syl_ok(x):
    b = strip_all(x)
    return bool(SYL.match(b)) and not (re.search(r'(p|t|c|ch)$', b) and tone_idx(x) not in (0, 2, 5))
def short(k):
    ps = [p.strip() for p in re.split(r'\s*·\s*', k or '') if p.strip()]
    return '·'.join(ps[:3])[:40]
def sig(w):                                  # 같은 소리·같은 글자(성조 부호 자리만 다른 표기)는 같은 값
    return tuple((strip_tone(s), tone_idx(s)) for s in w.split())
def main():
    p = R / 'data/sib.json'; sib = json.loads(p.read_text(encoding='utf-8')); W = sib['w']
    dko = json.loads((R / 'data/_dict_ko.json').read_text(encoding='utf-8'))
    add = 0
    for w, k in dko.items():
        if not k or w in W or not VW.match(w): continue
        if ' ' not in w and not syl_ok(w): continue
        if ' ' not in w: W[w] = {'k': short(k)}; add += 1
    # 한 음절 가족 다시
    one = sorted(w for w in W if ' ' not in w and VW.match(w) and syl_ok(w))
    best = {}
    for w in one:
        s = sig(w); sc = (not W[w].get('p'), w)
        if s not in best or sc < best[s][0]: best[s] = (sc, w)
    keep = sorted(v[1] for v in best.values())
    ft, fs, fk = collections.defaultdict(set), collections.defaultdict(set), collections.defaultdict(set)
    for w in keep:
        ft[strip_tone(w)].add(w); fs[strip_all(w) + '|' + str(tone_idx(w))].add(w); fk[strip_all(w)].add(w)
    kt = lambda w: (tone_idx(w), strip_tone(w))
    sib['t'] = {k: sorted(v, key=kt) for k, v in ft.items() if len(v) > 1}
    sib['s'] = {k: sorted(v, key=kt) for k, v in fs.items() if len(v) > 1}
    sib['k'] = {k: sorted(v, key=lambda w: (strip_tone(w), tone_idx(w))) for k, v in fk.items() if len(v) > 1}
    # 여러 음절 묶음
    multi = {w for w in set(dko) | set(W) if ' ' in w and VW.match(w) and (W.get(w, {}).get('k') or dko.get(w))}
    best = {}
    for w in sorted(multi):
        s = sig(w); sc = (not W.get(w, {}).get('p'), w)
        if s not in best or sc < best[s][0]: best[s] = (sc, w)
    g = collections.defaultdict(set)
    for _, w in best.values(): g[strip_all(w)].add(w)
    G = {k: sorted(v, key=lambda w: [(strip_tone(x), tone_idx(x)) for x in w.split()]) for k, v in g.items() if len(v) > 1}
    addm = 0
    for v in G.values():
        for w in v:
            if w not in W: W[w] = {'k': short(dko.get(w, ''))}; addm += 1
    sib['g'] = G
    p.write_text(json.dumps(sib, ensure_ascii=False, separators=(',', ':'), sort_keys=True), encoding='utf-8')
    print(f'더한 음절 {add} · 성조 가족 {len(sib["t"])} · 모양 가족 {len(sib["s"])} · 뼈대 가족 {len(sib["k"])} · 여러 음절 묶음 {len(G)}(낱말 {sum(map(len, G.values()))}, 새로 {addm}) · 파일 {p.stat().st_size // 1024}KB')
if __name__ == '__main__':
    main()
