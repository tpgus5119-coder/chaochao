#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 뜻 점검 — 1차(.ko.tsv)·2차(.b.tsv)에서 하나라도 '고침'이 나온 뜻을 모은다 → tools/dict_audit/검토.tsv (클로드가 한 줄씩 보고 확정 칸을 채운다).
칸: 시트 ⇥ n ⇥ i ⇥ 표제어 ⇥ 우리 품사 ⇥ 원문 품사 ⇥ 꼬리표 ⇥ 원문 뜻풀이 ⇥ 지금 한국어 ⇥ 1차(판정|새 한국어|새 품사|까닭) ⇥ 2차(같은 꼴)"""
import json, pathlib, sys
A = pathlib.Path(__file__).resolve().parent


def rows(p):
    if not p.exists(): return None
    return {(r[0], r[1]): r + [''] * (6 - len(r)) for r in (l.split('\t') for l in p.read_text(encoding='utf-8').splitlines() if l.strip())}


def main():
    out, st = [], {'시트': 0, '1차만': 0, '2차 있음': 0, '뜻': 0, '걸림': 0}
    for js in sorted(A.glob('au_*.json')):
        a = rows(js.with_suffix('.ko.tsv')); b = rows(js.with_suffix('.b.tsv'))
        if a is None: continue
        st['시트'] += 1; st['2차 있음' if b else '1차만'] += 1
        for it in json.loads(js.read_text(encoding='utf-8')):
            for s in it['senses']:
                k = (str(it['n']), str(s['i'])); st['뜻'] += 1
                ra, rb = a.get(k), (b or {}).get(k)
                fa = ra and ra[2] != 'OK'; fb = rb and rb[2] != 'OK'
                if not (fa or fb): continue
                st['걸림'] += 1
                f = lambda r: '|'.join(r[2:6]) if r else ''
                out.append([js.stem, k[0], k[1], it['w'], s['pos'], s['src_pos'], s['lab'], s['gloss'], s['ko'], f(ra), f(rb)])
    with open(A / '검토.tsv', 'w', encoding='utf-8') as fo:
        fo.write('# 시트\tn\ti\t표제어\t우리 품사\t원문 품사\t꼬리표\t원문 뜻풀이\t지금 한국어\t1차\t2차\n')
        for r in out: fo.write('\t'.join(r) + '\n')
    print(st)


if __name__ == '__main__':
    main()
