#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""품사 판정 검산 — 1차(pos_NN.ko.tsv)와 서로 보지 않고 한 독립 2차(pos_NN.b.tsv)를 맞댄다 (2026-10-01, 대표님 "확실한 근거 기반으로 검사해야 한다").
기계 태거(underthesea)는 품사를 아는 드문 낱말에서 49%밖에 못 맞혀(흔한 말 78%) 근거로 못 썼다 — tools/dict_pos/verify_tagger.py · 검산_태거.tsv.
결과: 일치율 · tools/dict_pos/불일치.tsv(클로드가 원문 뜻풀이로 하나씩 정해 '최종' 칸을 채운다). 쓰기: python3 tools/dict_pos/compare.py"""
import json, pathlib, collections
R = pathlib.Path(__file__).resolve().parent.parent.parent
D = R / 'tools/dict_pos'


def load(p):
    out = {}
    for l in p.read_text(encoding='utf-8').splitlines():
        n, i, v = (l.split('\t') + ['', ''])[:3]; out[(n.strip(), i.strip())] = v.strip()
    return out


def main():
    rows, st, pair = [], collections.Counter(), collections.Counter()
    for f in sorted(D.glob('pos_*.json')):
        if f.name.endswith('.b.json'): continue
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        a, b = load(f.with_suffix('.ko.tsv')), load(D / (f.stem + '.b.tsv'))
        for k, va in a.items():
            vb = b.get(k, '')
            x = src[k[0]]; ko = next((s['ko'] for s in x['senses'] if str(s['i']) == k[1]), '')
            if va == vb: st['같음'] += 1; continue
            st['다름'] += 1; pair[tuple(sorted((va, vb)))] += 1
            rows.append([x['w'], k[1], va, vb, '', ko, ' / '.join(x['vi_def'])[:120], ' / '.join(x['vi_ex'])[:100]])
    with open(D / '불일치.tsv', 'w', encoding='utf-8') as fo:
        fo.write('# 낱말\t뜻 번호\t1차\t2차\t최종(클로드)\t한국어 뜻\t원문 뜻풀이\t원문 예문\n')
        for r in rows: fo.write('\t'.join(r) + '\n')
    n = st['같음'] + st['다름']
    print(f'뜻 {n} · 같음 {st["같음"]} ({st["같음"] / n * 100:.1f}%) · 다름 {st["다름"]}')
    print('어긋난 짝:', pair.most_common(15))


if __name__ == '__main__':
    main()
