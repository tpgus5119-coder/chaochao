#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자음 ↔ 베트남어 음 대응 규칙을 **우리 한자 자료로 센다** (2026-10-01, 선배 한월어 엑셀 '패턴 정리' 검산).
재료: data/_roots.json 의 온전한 한자어(옛 한자음·일부 음절·뜻 조건 빼고)에서 글자마다 (우리 음, 베트남어 음절) 짝.
첫소리(초성) → 베트남어 첫 자음, 받침(종성) → 베트남어 끝소리 를 세어 비율을 낸다. 결과 data/_hanviet_patterns.json (앱 '한자어 맞히기' 규칙 표)
쓰기: python3 tools/hanviet_quiz/patterns.py"""
import json, pathlib, re, collections, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
ONSET = re.compile(r'^(ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdđghklmnpqrstvx])?')
CODA = re.compile(r'(ch|nh|ng|[cmnpt])$')
strip = lambda s: U.normalize('NFC', ''.join(c for c in U.normalize('NFD', s) if c not in '̣̀́̉̃'))


def main():
    roots = json.loads((R / 'data/_roots.json').read_text(encoding='utf-8'))
    on, co, pairs = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter), 0
    ex = collections.defaultdict(dict)
    for w, alts in roots.items():
        a = alts[0]
        if len(alts) != 1 or not a.get('h') or a.get('o') or a.get('p') or a.get('c'): continue
        syl, han, ko = w.split(), a['h'], a['r']
        if not (len(syl) == len(han) == len(ko)): continue
        for s, h, k in zip(syl, han, ko):
            o = ord(k) - 0xAC00
            if not 0 <= o < 11172: continue
            b = strip(s.lower())
            cho, jong = CHO[o // 588], JONG[o % 28]
            vo = ONSET.match(b).group(0) or '(모음)'
            vc = (CODA.search(b) or [None])[0] if CODA.search(b) else '(없음)'
            on[cho][vo] += 1; co[jong or '(없음)'][vc] += 1; pairs += 1
            ex[('on', cho, vo)].setdefault(k, f'{k} ({h}) → {s.lower()}')
            ex[('co', jong or '(없음)', vc)].setdefault(k, f'{k} ({h}) → {s.lower()}')
    def table(d, kind):
        out = []
        for key, c in sorted(d.items(), key=lambda x: -sum(x[1].values())):
            tot = sum(c.values())
            if tot < 30: continue
            top = [(v, n) for v, n in c.most_common() if n / tot >= 0.05][:4]
            out.append({'k': key, 'n': tot, 'to': [[v, round(n / tot * 100), list(ex[(kind, key, v)].values())[:2]] for v, n in top]})
        return out
    res = {'pairs': pairs, 'onset': table(on, 'on'), 'coda': table(co, 'co')}
    (R / 'data/_hanviet_patterns.json').write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('글자 짝', pairs)
    for t in ('onset', 'coda'):
        for r in res[t]: print(t, r['k'], r['n'], [(v, p) for v, p, _ in r['to']])


if __name__ == '__main__':
    main()
