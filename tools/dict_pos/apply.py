#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""품사 없던 뜻에 판정한 품사 넣기 → data/_dict_full.json (2026-10-01).
판정은 tools/dict_pos/pos_NN.ko.tsv (Sonnet 보조 5명이 베트남어 뜻풀이·예문을 보고, 클로드가 표본 60 검사). '?'(근거 없음)는 빈칸 그대로.
뜻 글자로 맞춘다(차례 번호가 [보충] 넣기로 밀려도 안전). 판정한 뜻의 자리는 'pj' 에 — 앱이 '원문에 없던 품사' 로 흐리게 보인다.
dict_sup/apply.py 가 끝에 이걸 부른다(merge_full → dict_sup → dict_pos). 쓰기: python3 tools/dict_pos/apply.py"""
import json, pathlib, glob
R = pathlib.Path(__file__).resolve().parent.parent.parent


# 뜻이 아닌 조각(출전 이름·잘린 뜻풀이·다른 낱말 뜻) — 두 판정을 맞대다 찾음, 클로드 확인 (2026-10-01)
EXTRA_DROP = {('ngày rằm', '날'), ('ngày rằm', '음력 매달')}
# 원문(FVDP) 뜻풀이 앞에 품사 약자가 적힌 낱말 — 판정보다 원문이 이긴다 (P. 부 · L. 접 · T. 형; 같은 약자 붙은 giá dụ·thì ra·tiếng rằng·túng sử 가 모두 접속사라 L. = 접속사)
SRC_POS = {'cấp thời': '부', 'giá dụ': '접', 'lọ là': '접', 'nhộn nhạo': '형', 'thuần lý': '형', 'thì ra': '접', 'tiếng rằng': '접', 'túng sử': '접'}


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    D = R / 'tools/dict_pos'
    final = {}
    for l in (D / '불일치.tsv').read_text(encoding='utf-8').splitlines()[1:]:
        c = l.split('\t')
        if len(c) > 4: final[(c[0], c[1])] = c[4].strip()
    judged, drop = {}, set(EXTRA_DROP)
    st = {'두 판정 같음': 0, '클로드 최종': 0, '빈칸(근거 없음)': 0, '뺀 조각': 0}
    for f in sorted(D.glob('pos_*.json')):
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        A = {tuple(x.split('\t')[:2]): x.split('\t')[2].strip() for x in f.with_suffix('.ko.tsv').read_text(encoding='utf-8').splitlines()}
        B = {tuple(x.split('\t')[:2]): x.split('\t')[2].strip() for x in (D / (f.stem + '.b.tsv')).read_text(encoding='utf-8').splitlines()}
        for (n, i), a in A.items():
            x = src[n.strip()]; ko = next((s['ko'] for s in x['senses'] if str(s['i']) == i.strip()), None)
            if ko is None: continue
            if a == B.get((n, i)): p = a; st['두 판정 같음'] += 1
            else: p = final.get((x['w'], i.strip()), '?'); st['클로드 최종'] += 1
            if x['w'].lower() in SRC_POS: p = SRC_POS[x['w'].lower()]
            if p == '뺌': drop.add((x['w'].lower(), ko)); st['뺀 조각'] += 1; continue
            if p in ('', '?'): st['빈칸(근거 없음)'] += 1; continue
            judged.setdefault(x['w'].lower(), {})[ko] = p
    n_set = 0
    pjf = R / 'tools/dict_audit/pj_fix.json'      # merge_full 이 pos_fix 로 품사를 넣은 '원문에 품사 없던 뜻' (한국어를 고친 뜻 — 글로는 못 찾는다)
    PJX = {tuple(x) for x in json.loads(pjf.read_text(encoding='utf-8'))} if pjf.exists() else set()
    for k, e in F.items():
        e.pop('pj', None)
        for r in [i for i, s in enumerate(e['s']) if (k, s) in drop][::-1]:     # 조각 뜻 빼기 — 보충 자리('b')도 같이 당긴다
            del e['s'][r]; del e['p'][r]
            if e.get('b'): e['b'] = [b - 1 if b > r else b for b in e['b'] if b != r]
        j = judged.get(k) or {}
        pj = [i for i, s2 in enumerate(e['s']) if (k, s2) in PJX and e['p'][i]]
        for i, s2 in enumerate(e['s']):
            if s2 in j and not e['p'][i]:                 # 원문에 품사가 없던 뜻에만 — 위키 품사는 건드리지 않는다
                e['p'][i] = j[s2]; pj.append(i); n_set += 1
        if pj: e['pj'] = sorted(set(pj))
    (R / 'data/_dict_full.json').write_text(json.dumps(F, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(st, f'· 새로 넣음 {n_set} · 아직 빈 뜻 {sum(1 for e in F.values() for p in e["p"] if not p)}')


if __name__ == '__main__':
    main()
