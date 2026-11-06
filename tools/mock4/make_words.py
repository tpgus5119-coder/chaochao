# -*- coding: utf-8 -*-
"""주간시험 4 범위 낱말표 → tools/mock4/ch114_words.json: 1권 1~10과(mock3 ch110_words) + 1권 11·12과(번호 11·12) + 2권 1·2과(번호 13·14).
새 과 낱말은 앱 메인 교재 낱말(data/gybm.json, 그림 포함)과 교재 낱말표(data/realbook.json)에서. 쓰기: python3 tools/mock4/make_words.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
nf = lambda s: U.normalize('NFC', s).strip()
W = json.load(open(R / 'tools/mock3/ch110_words.json', encoding='utf-8'))
rb = json.load(open(R / 'data/realbook.json', encoding='utf-8'))['books']
main = [s for s in json.load(open(R / 'data/gybm.json', encoding='utf-8'))['sources'] if s['key'] == 'main'][0]
base = lambda t: re.sub(r'\s*·\s*\d+부$', '', t)
order = list(dict.fromkeys(base(l['title']) for l in main['lessons']))
CH = {11: (0, '11', order[10]), 12: (0, '12', order[11]), 13: (1, '1', order[12]), 14: (1, '2', order[13])}
for no, (bi, ba, title) in CH.items():
    seen = set()
    for l in main['lessons']:
        if base(l['title']) == title:
            for w in l['words']:
                v = nf(w['vi'])
                if v.lower() not in seen: seen.add(v.lower()); W.append([no, v, w.get('ko', ''), w.get('img', '')])
    c = [x for x in rb[bi]['chapters'] if str(x['bai']) == ba][0]
    for w in c['words']:
        v = nf(w['vi'])
        if v.lower() not in seen: seen.add(v.lower()); W.append([no, v, w.get('ko', ''), ''])
    print(no, title, len(seen))
json.dump(W, open(pathlib.Path(__file__).parent / 'ch114_words.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(W))
if __name__ == '__main__':
    old = {nf(x[1]).lower() for x in W if x[0] <= 10}
    for no in CH:
        L = [x for x in W if x[0] == no and x[3] and (R / 'img' / x[3]).exists() and nf(x[1]).lower() not in old]
        print(no, len(L), ' | '.join(x[1] for x in L))
