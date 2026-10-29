# -*- coding: utf-8 -*-
"""22기 B반 30회(대표님 출제 b30.docx, 시험일 10/30 가정) — 2026-10-29 대표님 "한베 20 베한 20 문장 10 — 어플에도 ㄱ".
낱말·문장은 tools/daily22/make_b30.py 의 P1(베→한 20)·P2(한→베 20)·P3(문장 10 한→베) 그대로. 쓰기: python3 tools/daily22/add30.py"""
import json, pathlib, sys, unicodedata as U
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from make_b30 import P1, P2, P3
K, V = 'to_ko', 'to_vi'
def _alt(a):                                     # 'trạm xe buýt (bến xe buýt)' → ('trạm xe buýt', ['bến xe buýt'])
    m = a.split(' (')
    return m[0].strip(), ([m[1].rstrip(')').strip()] if len(m) > 1 else [])
B30 = [(vi, ko, K, []) for vi, ko in P1] + [(_alt(vi)[0], ko, V, _alt(vi)[1]) for ko, vi in P2]
S = {'b30': [(i + 1, V, vi, ko, '') for i, (ko, vi, g) in enumerate(P3)]}
IMG = {}
EX = {}
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
def main():
    C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
    found = {}
    def put(w):
        k = N(w.get('vi', ''))
        if k and k not in found: found[k] = w
    for d in C['days']:
        for w in d['words']: put(w)
    for s in json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']:
        for l in s['lessons']:
            for w in l['words']: put(w)
    for d in json.loads((R / 'data/days.json').read_text(encoding='utf-8'))['days']:
        for w in d['words']: put(w)
    for v in json.loads((R / 'data/order.json').read_text(encoding='utf-8'))['vols']:
        for t in v.get('tracks', []):
            for ch in t.get('chapters', []):
                for l in ch.get('lessons', []):
                    for w in l.get('words', []): put(w)
    for key, label, W in (('b30', 'B반 10/30 단어 시험', B30),):
     if any(d.get('label') == label for d in C['days']): print(key, '이미 들어 있음'); continue
     if True:
        words = []
        for vi, ko, dr, alt in W:
            ex = img = None
            img = IMG.get(vi)
            old = found.get(N(vi))
            if img: assert (R / 'img' / img).exists(), ('그림 없음', img)
            img = img or (old.get('img') if old else None)   # 그림이 아직 없는 낱말은 그림 없이 (대표님 2026-10-19 "일단 이미지 없이 올려줘") — 그림은 뒤에 붙인다
            if ex is None and old:
                oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
            if vi in EX: ex = EX[vi]
            kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
            w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'dir': dr}
            if img: w['img'] = img
            if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
            if alt: w['alt'] = alt
            words.append(w)
        assert len({(N(w['vi']), w['dir']) for w in words}) == len(words), '낱말 겹침(같은 방향)'   # 10/29 는 같은 낱말이 두 방향으로 나온다
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'key': key, 'words': words})   # key 를 적는다 — A반 21회가 없어 차례로 세면 a21 이 된다
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
    (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/30'" not in s:
        s = s.replace("'10/28', '10/29']", "'10/28', '10/29', '10/30']", 1); assert "'10/30'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
