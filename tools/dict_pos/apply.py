#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""품사 없던 뜻에 판정한 품사 넣기 → data/_dict_full.json (2026-10-01).
판정은 tools/dict_pos/pos_NN.ko.tsv (Sonnet 보조 5명이 베트남어 뜻풀이·예문을 보고, 클로드가 표본 60 검사). '?'(근거 없음)는 빈칸 그대로.
뜻 글자로 맞춘다(차례 번호가 [보충] 넣기로 밀려도 안전). 판정한 뜻의 자리는 'pj' 에 — 앱이 '원문에 없던 품사' 로 흐리게 보인다.
dict_sup/apply.py 가 끝에 이걸 부른다(merge_full → dict_sup → dict_pos). 쓰기: python3 tools/dict_pos/apply.py"""
import json, pathlib, glob
R = pathlib.Path(__file__).resolve().parent.parent.parent


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    judged = {}
    for f in sorted((R / 'tools/dict_pos').glob('pos_*.json')):
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        for l in f.with_suffix('.ko.tsv').read_text(encoding='utf-8').splitlines():
            n, i, p = (l.split('\t') + ['', ''])[:3]
            x = src[n.strip()]; p = p.strip()
            ko = next((s['ko'] for s in x['senses'] if str(s['i']) == i.strip()), None)
            if ko is None or p in ('', '?'): continue
            judged.setdefault(x['w'].lower(), {})[ko] = p
    n_set = 0
    for k, e in F.items():
        e.pop('pj', None)
        j = judged.get(k)
        if not j: continue
        pj = []
        for i, s in enumerate(e['s']):
            if s in j and (not e['p'][i] or e['p'][i] == j[s]):
                if not e['p'][i]: n_set += 1
                e['p'][i] = j[s]; pj.append(i)
        if pj: e['pj'] = pj
    (R / 'data/_dict_full.json').write_text(json.dumps(F, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'판정 품사 넣음 {n_set} · 판정 뜻 {sum(len(v) for v in judged.values())} · 아직 빈 뜻 {sum(1 for e in F.values() for p in e["p"] if not p)}')


if __name__ == '__main__':
    main()
