# -*- coding: utf-8 -*-
"""주간시험 5 범위 낱말표 → tools/mock5/ch118_words.json: 주간시험 4 의 ch114_words(1권 1~12과 + 2권 1·2과) + 2권 3~6과(번호 15~18).
새 과 낱말은 앱 메인 교재 낱말(data/gybm.json, 그림 포함)과 교재 낱말표(data/realbook.json)에서. 쓰기: python3 tools/mock5/make_words.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
nf = lambda s: U.normalize('NFC', s).strip()
def main():
    W = json.load(open(R / 'tools/mock4/ch114_words.json', encoding='utf-8'))
    rb = json.load(open(R / 'data/realbook.json', encoding='utf-8'))['books']
    main_ = [s for s in json.load(open(R / 'data/gybm.json', encoding='utf-8'))['sources'] if s['key'] == 'main'][0]
    base = lambda t: re.sub(r'\s*·\s*\d+부$', '', t)
    order = list(dict.fromkeys(base(l['title']) for l in main_['lessons']))
    CH = {15: (1, '3', order[14]), 16: (1, '4', order[15]), 17: (1, '5', order[16]), 18: (1, '6', order[17])}
    for no, (bi, ba, title) in CH.items():
        seen = set()
        for l in main_['lessons']:
            if base(l['title']) == title:
                for w in l['words']:
                    v = nf(w['vi'])
                    if v.lower() not in seen: seen.add(v.lower()); W.append([no, v, w.get('ko', ''), w.get('img', '')])
        c = [x for x in rb[bi]['chapters'] if str(x['bai']) == ba][0]
        for w in c['words']:
            v = nf(w['vi'])
            if v.lower() not in seen: seen.add(v.lower()); W.append([no, v, w.get('ko', ''), ''])
        print(no, title, len(seen))
    json.dump(W, open(pathlib.Path(__file__).parent / 'ch118_words.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(len(W))
if __name__ == '__main__':
    main()
