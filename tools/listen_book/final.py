#!/usr/bin/env python3
"""2단계: 클로드가 정리한 문장(blocks/out_*.json)을 받아쓴 시각(whisper)에 다시 맞대어 문장마다 시작·끝을 정한다
→ ~/짜오짜오/듣기연습/final/<이름>.json. 맞은 음절이 없는 문장은 앞뒤 문장 사이로 메운다(r=0 으로 표시)."""
import json, pathlib, sys, unicodedata as U
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from align import align, base, toks, W
H = pathlib.Path.home() / '짜오짜오/듣기연습'
OUT = H / 'final'
def main():
    OUT.mkdir(exist_ok=True)
    items = {}                                   # 묶음 번호 → 음원 (in_*.json 기준 — all.json 은 다시 만들면 번호가 바뀐다)
    for g in (H / 'blocks').glob('in_*.json'):
        for x in json.load(open(g)): items[(g.stem[3:], x['id'])] = x
    bad = 0; n = 0
    for f in sorted((H / 'blocks').glob('out_*.json')):
        for k, sents in json.load(open(f)).items():
            it = items[(f.stem[4:], int(k))]
            wf = next(p for p in W.glob('*.json') if U.normalize('NFC', p.stem) == it['name'])
            d = json.loads(wf.read_text())
            A, own = [], []
            for si, s in enumerate(sents):
                for t in toks(s['vi']): A.append(base(t)); own.append(si)
            B, bt = [], []
            for w in d['words']:
                for t in toks(w['w']): B.append(base(t)); bt.append(w)
            pairs, _ = align(A, B) if A and B else ([], 0)
            hit = {}
            for i, j in pairs: hit.setdefault(own[i], []).append(bt[j])
            lines = []
            for si, s in enumerate(sents):
                h = hit.get(si, []); nt = len(toks(s['vi'])) or 1
                lines.append({'sp': s.get('sp', ''), 'vi': s['vi'], 'ko': s.get('ko', ''),
                              's': h[0]['s'] if h else None, 'e': h[-1]['e'] if h else None, 'r': round(len(h) / nt, 2)})
            for i, l in enumerate(lines):            # 못 맞춘 문장: 앞 문장 끝 ~ 다음 문장 시작
                if l['s'] is None:
                    prv = next((x['e'] for x in reversed(lines[:i]) if x['e'] is not None), 0)
                    nxt = next((x['s'] for x in lines[i + 1:] if x['s'] is not None), d['dur'])
                    l['s'], l['e'] = prv, nxt
            for i in range(len(lines) - 1):
                l, m = lines[i], lines[i + 1]
                l['e'] = round(max(l['e'], min(m['s'] - .05, l['e'] + .6)), 2)
            if lines: lines[-1]['e'] = round(min(d['dur'], lines[-1]['e'] + .6), 2)
            for l in lines: l['s'] = round(max(0, l['s'] - .1), 2)
            low = sum(1 for l in lines if l['r'] < .5); bad += low; n += len(lines)
            (OUT / (it['name'] + '.json')).write_text(json.dumps({'file': d['file'], 'vol': it['vol'], 'bai': it['bai'], 'dur': d['dur'], 'lines': lines}, ensure_ascii=False, indent=1))
            if low: print(f'{low}/{len(lines)} 덜 맞음  {it["name"]}')
    print('문장', n, '덜 맞음', bad)
if __name__ == '__main__':
    main()
