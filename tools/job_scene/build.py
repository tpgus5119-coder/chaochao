# -*- coding: utf-8 -*-
"""order.json 의 직무 권(kind:'job')을 scenes.py 대로 다시 묶는다. 낱말 자료(뜻·예문·그림·소리)는 그대로, 자리만 옮긴다."""
import json, pathlib, unicodedata as U, collections, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from scenes import SCENES, DROP
R = pathlib.Path(__file__).resolve().parent.parent.parent
P = R / 'data/order.json'
O = json.loads(P.read_text(encoding='utf-8'))
vol = [v for v in O['vols'] if v.get('kind') == 'job'][0]
N = lambda s: U.normalize('NFC', s)
pool = {}
for t in vol['tracks']:
    for c in t['chapters']:
        for l in c['lessons']:
            for w in l['words']:
                k = (N(t['track']), N(w['vi']))
                assert k not in pool, ('겹침', k)
                pool[k] = w
before = len(pool)
used = set(); tracks = []
for tname, scenes in SCENES:
    chapters = [{'lessons': []}]
    for sname, vis in scenes:
        assert len(vis) <= 16, (tname, sname, len(vis))
        ws = []
        for vi in vis:
            k = (N(tname), N(vi)); assert k in pool, ('없는 낱말', k); assert k not in used, ('두 번', k)
            used.add(k); ws.append(pool[k])
        chapters[0]['lessons'].append({'t': sname, 'words': ws})
    tracks.append({'track': tname, 'chapters': chapters, 'words': sum(len(l['words']) for l in chapters[0]['lessons'])})
left = [k for k in pool if k not in used]
bad = [k for k in left if k[1] not in DROP]
assert not bad, ('안 들어간 낱말', bad)
vol['tracks'] = tracks
P.write_text(json.dumps(O, ensure_ascii=False, indent=1), encoding='utf-8')
print('전', before, '→ 후', sum(t['words'] for t in tracks), '· 뺀 겹침', [k[1] for k in left], '· 갈래', len(tracks), '· 세트', sum(len(t['chapters'][0]['lessons']) for t in tracks))
for t in tracks: print(' ', t['track'], t['words'], '|', ' · '.join(f"{l['t']}({len(l['words'])})" for l in t['chapters'][0]['lessons']))
