# -*- coding: utf-8 -*-
"""일상 주제 차례 손질 — 가족·결혼을 숫자 세기 뒤로, 날씨·취미·운동을 달 이름 뒤로 (2026-10-07, 대표님 "그래 순서 바꾸자").
근거(첫걸음 책·앱의 주제 차례, 공개 목차):
  가족 — NEW 가장 쉬운 독학 첫걸음 4장(이름·나이 → 가족 → 사는 곳·직업) · 착! 붙는 5과(직업 3 → 나이 4 → 가족 5) · 한 번에 끝내는 7과 · GO! 첫걸음 7·8과(누구와 사니·결혼) · 듀오링고 4단원(Family 1)
  날씨 — GO! 11과(날짜 10과 바로 뒤) · 가장 쉬운 9장 · 착! 10과
  취미 — 착! 8·9과(요일 7과 바로 뒤) · 가장 쉬운 14장
  → 가족·결혼은 '숫자 세기'(몇 명?) 바로 뒤, 날씨·취미·운동은 '달 이름'(날짜) 바로 뒤. 나머지는 교재 과 순서(assemble.py)대로.
세트(day 열쇠)·낱말은 그대로, 차례 번호 n 만 다시 매긴다. 화면(renderDays)은 n 으로 정렬한다."""
import json, pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent.parent
P = R / 'data/days.json'
D = json.loads(P.read_text(encoding='utf-8'))
days = D['days']
name = lambda d: re.sub(r'\s*\(\d+/\d+\)$', '', d['theme'])
topics = []
for d in days:
    if not topics or topics[-1][0] != name(d): topics.append([name(d), []])
    topics[-1][1].append(d)
order = [t for t, _ in topics]
MOVE = [(['가족', '결혼'], '숫자 세기'), (['날씨', '취미', '운동'], '달 이름')]
for names, after in MOVE:
    for n in names: assert n in order, n
    order = [t for t in order if t not in names]
    i = order.index(after) + 1
    order[i:i] = names
by = dict(topics)
new = [d for t in order for d in by[t]]
assert len(new) == len(days) and {d['day'] for d in new} == {d['day'] for d in days}
for i, d in enumerate(new, 1): d['n'] = i
D['days'] = new
P.write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8')
print('주제', len(order), '· 세트', len(new))
for i, t in enumerate(order[:40], 1): print(f'{i:2d} {t}', end=' | ' if i % 4 else '\n')
print()
