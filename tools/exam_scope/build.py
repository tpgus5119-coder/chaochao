#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 과 번호·과 이름·과 문법(교재 문법 상자 → 앱 문법 카드)과 주간시험 회차별 범위를 한 파일로 → data/textbook_ch.json (2026-10-26 대표님
"단어학습 교재 단어 챕터 이름 앞에 몇 챕터인지 숫자도 · 주간시험 회차별로 어떤 단어와 문법을 공부해야 하는지 학습 탭에 — 단어와 문법 챕터를 모아줘").
과 문법 = tools/gram_audit/교재_문법_세부.tsv(교재 문법 본문을 앱 문형과 대조한 표)의 앱 문형 칸. 회차 범위: 주간시험 1 = 1권 1~3과(tools/mock1),
주간시험 2 = 1권 4~7과(대표님 10-26; 모의고사 2 는 1~7과로 냈었다), 주간시험 3 = 1권 8~10과 + 10과 나이 비교(33.6) + 쌤 10과 비교 bằng·như(33.5·33.2)(tools/mock3/gram_cover.py).
쓰기: python3 tools/exam_scope/build.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: U.normalize('NFC', s).strip()
def main():
    rb = json.loads((R / 'data/realbook.json').read_text(encoding='utf-8'))
    G = {}
    for l in (R / 'tools/gram_audit/교재_문법_세부.tsv').read_text(encoding='utf-8').splitlines():
        if not l.strip() or l.startswith('#'): continue
        c = l.split('\t')
        if len(c) < 4: continue
        for i in re.findall(r'\d+\.\d+', c[3]):
            G.setdefault(c[0], [])
            if i not in G[c[0]]: G[c[0]].append(i)
    ch = {}
    for bi, b in enumerate(rb['books'], 1):
        for c in b['chapters']:
            k = f"{bi}-{c['bai']}"
            ch[k] = {'t': nfc(c['title']), 'ko': c.get('title_ko', ''), 'g': G.get(k, [])}
    titles = [v['t'] for v in ch.values()]
    assert len(titles) == len(set(titles)), '과 이름이 겹친다'
    R1 = [f'1-{i}' for i in (1, 2, 3)]
    rounds = [{'n': 1, 'ch': R1, 'extra': []},
              {'n': 2, 'ch': [f'1-{i}' for i in range(4, 8)], 'extra': []},   # 4~7과만 (대표님 2026-10-26 — 1~3과는 1회)
              {'n': 3, 'ch': ['1-8', '1-9', '1-10'], 'extra': ['33.6', '33.5', '33.2']}]
    out = {'note': __doc__.split('\n')[1], 'ch': ch, 'rounds': rounds}
    (R / 'data/textbook_ch.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for r in rounds: print(r['n'], [(c, len(ch[c]['g'])) for c in r['ch']], r['extra'])
if __name__ == '__main__':
    main()
