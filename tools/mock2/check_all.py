# -*- coding: utf-8 -*-
"""모의고사 다섯 벌을 가로질러 같은 그림·같은 소리가 있는지 (대표님 2026-10-08: "다른 모의고사에 나온 오디오·이미지도 쓰지 말라")"""
import json, pathlib, collections, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
def used(q):
    snd, pic = [], []
    for x in q:
        if x.get('audio'): snd.append(x['audio'])
        if x['k'] in ('say', 'puzzle'): snd.append(x['vi'])
        if x['k'] == 'errpick': snd.append(x['fix'])
        if x['k'] == 'speak': snd += [m['vi'] for m in x['model']]
        if x.get('img'): pic.append(x['img'])
        if x['k'] == 'pick': pic += x['opts']
    return snd, pic
S, P = collections.defaultdict(set), collections.defaultdict(set)
for no in range(1, 6):
    p = R / f'data/mock2_{no}.json'
    if not p.exists(): continue
    snd, pic = used(json.loads(p.read_text(encoding='utf-8'))['q'])
    for t in snd: S[t].add(no)
    for t in pic: P[t].add(no)
ds = {t: v for t, v in S.items() if len(v) > 1}; dp = {t: v for t, v in P.items() if len(v) > 1}
print('소리 글', len(S), '벌 사이 겹침', len(ds), '| 그림', len(P), '벌 사이 겹침', len(dp))
if '-v' in sys.argv:
    for t, v in sorted(ds.items(), key=lambda x: -len(x[1])): print('  소리', sorted(v), t)
    for t, v in sorted(dp.items(), key=lambda x: -len(x[1])): print('  그림', sorted(v), t)
