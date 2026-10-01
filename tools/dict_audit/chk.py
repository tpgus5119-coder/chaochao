#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 뜻 점검 답 검사 — 줄 수·번호·판정 값·고칠 칸 (2026-10-01). python3 tools/dict_audit/chk.py au_000 [au_001 …] [--b]"""
import json, sys, pathlib, re
R = pathlib.Path(__file__).resolve().parent
POS = {'명', '동', '형', '부', '대', '수', '분류', '조', '전', '접', '감', '구', '속담', '관용', '고유', '접두', '접미', '관형', '글자'}
V = {'OK', '뜻', '품사', '둘', '?'}
SUF = '.b.tsv' if '--b' in sys.argv else '.ko.tsv'


def check(name):
    src = json.loads((R / f'{name}.json').read_text(encoding='utf-8')); p = R / f'{name}{SUF}'
    if not p.exists(): print(name, '답 없음'); return 1
    want = [(str(it['n']), str(s['i'])) for it in src for s in it['senses']]
    rows = [l.rstrip('\n').split('\t') for l in p.read_text(encoding='utf-8').splitlines() if l.strip()]
    bad, cnt = [], {}
    if len(rows) != len(want): bad.append(f'줄 수 {len(rows)} ≠ {len(want)}')
    for r, w in zip(rows, want):
        r += [''] * (6 - len(r))
        if (r[0].strip(), r[1].strip()) != w: bad.append(f'번호 {r[0]}.{r[1]} ≠ {w[0]}.{w[1]}'); break
        v = r[2].strip(); cnt[v] = cnt.get(v, 0) + 1
        if v not in V: bad.append(f'{w[0]}.{w[1]} 판정 {v!r}'); continue
        if v in ('뜻', '둘'):
            k = r[3].strip()
            if not k: bad.append(f'{w[0]}.{w[1]} 새 한국어 없음')
            elif re.search(r'[A-Za-z]{3,}', re.sub(r'\([^)]*\)', '', k)) and not re.search(r'[À-ỹđĐ]', k): bad.append(f'{w[0]}.{w[1]} 새 한국어에 영어? {k}')
        if v in ('품사', '둘') and r[4].strip() not in POS: bad.append(f'{w[0]}.{w[1]} 새 품사 {r[4]!r}')
        if v != 'OK' and not r[5].strip(): bad.append(f'{w[0]}.{w[1]} 까닭 없음')
    for b in bad[:20]: print('  ', b)
    print(name, SUF, '문제', len(bad), '·', cnt)
    return len(bad)


if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if not a.startswith('--')]
    sys.exit(1 if sum(check(n) for n in names) else 0)
