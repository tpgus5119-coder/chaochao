#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 낱말 빈도 → data/_dict_freq.json { 표제어(소문자): 순위 } 위 TOP 개 (2026-10-01, ④ 흔한 말 표시).
재료 둘을 반씩 섞는다(글말·입말 치우침을 줄이려고): ① 베트남어 위키백과 무작위 문서 첫머리(scratchpad/viwiki_corpus.jsonl, 글말)
② 앱 안의 예문·대화(일상·직무·교재·선배·22기, 입말에 가까움). 글은 싣지 않고 낱말 수만 센다.
자르기: 사전 표제어로 왼쪽부터 가장 긴 것(4음절까지) — 앱의 '앱 속 예문'과 같은 규칙. 문장 가운데 대문자로 시작하는 조각(이름)은 안 센다.
점수 = 위키 1백만 낱말당 횟수와 앱 1백만 낱말당 횟수의 평균. 쓰기: python3 tools/dict_freq/count.py"""
import json, pathlib, re, collections, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
TOP = 5000
nfc = lambda s: U.normalize('NFC', s)


def sentences_app():
    out = []
    def walk(o, d=0):
        if d > 16 or o is None: return
        if isinstance(o, list):
            for v in o: walk(v, d + 1)
        elif isinstance(o, dict):
            if isinstance(o.get('vi'), str) and isinstance(o.get('ko'), str) and len(o['vi'].split()) >= 3: out.append(o['vi'])
            for v in o.values():
                if isinstance(v, (dict, list)): walk(v, d + 1)
    for f in ['days.json', 'order.json', 'gybm.json', 'grammar.json']:
        walk(json.loads((R / 'data' / f).read_text(encoding='utf-8')))
    return list(dict.fromkeys(out))


def sentences_wiki():
    p = R / 'scratchpad/viwiki_corpus.jsonl'
    out = []
    for l in p.read_text(encoding='utf-8').splitlines():
        t = json.loads(l)['t']
        out += [s for s in re.split(r'(?<=[.!?])\s+|\n+', t) if len(s.split()) >= 3]
    return out


def count(sents, heads):
    c, total = collections.Counter(), 0
    for s in sents:
        raw = [x for x in re.sub(r'[.,!?;:"“”‘’()\[\]…–—/]', ' ', nfc(s)).split() if x]
        t = [x.lower() for x in raw]
        a = 0
        while a < len(t):
            n = min(4, len(t) - a)
            while n > 1 and ' '.join(t[a:a + n]) not in heads: n -= 1
            w = ' '.join(t[a:a + n])
            if w in heads and not (a > 0 and raw[a][0] != t[a][0]): c[w] += 1
            total += 1; a += n
    return c, total


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    heads = set(F)
    A, ta = count(sentences_app(), heads)
    W, tw = count(sentences_wiki(), heads)
    sc = {w: (W[w] / tw + A[w] / ta) / 2 * 1e6 for w in set(A) | set(W)}
    rank = sorted(sc, key=lambda w: -sc[w])[:TOP]
    (R / 'data/_dict_freq.json').write_text(json.dumps({w: i + 1 for i, w in enumerate(rank)}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'앱 조각 {ta:,} · 위키 조각 {tw:,} · 센 표제어 {len(sc):,} · 실음 {len(rank)}')
    print('위 40:', ' · '.join(rank[:40]))
    print('2000~2020위:', ' · '.join(rank[2000:2020]))


if __name__ == '__main__':
    main()
