"""ds_N.tsv 검사: 시트의 모든 낱말이 정확히 한 번 · 값은 A 또는 B · 까닭 있음. 쓰기: python3 tools/day_split/chk.py N"""
import json, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
k = sys.argv[1]
S = json.loads((R / f'ds_{k}.json').read_text(encoding='utf-8'))
want = {(it['theme'], w['vi']) for it in S for w in it['words']}
got, bad = {}, []
for i, l in enumerate((R / f'ds_{k}.tsv').read_text(encoding='utf-8').splitlines(), 1):
    if not l.strip(): continue
    c = l.split('\t')
    if len(c) < 4: bad.append(f'{i}행 칸 수 {len(c)}'); continue
    key = (c[0].strip(), c[1].strip())
    if key not in want: bad.append(f'{i}행 시트에 없는 낱말 {key}')
    if key in got: bad.append(f'{i}행 두 번 {key}')
    if c[2].strip() not in ('A', 'B'): bad.append(f'{i}행 값 {c[2]!r}')
    if not c[3].strip(): bad.append(f'{i}행 까닭 없음')
    got[key] = c[2].strip()
miss = want - set(got)
if miss: bad.append(f'빠진 낱말 {len(miss)}: ' + ', '.join(f'{a}/{b}' for a, b in list(miss)[:10]))
print('문제', len(bad)); print('\n'.join(bad[:30]))
