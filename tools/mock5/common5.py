# -*- coding: utf-8 -*-
"""주간시험 5(교재 2권 3~6과 — 대표님 2026-11-18 "다음 주간시험 모의고사 만들어줘, 범위는 3~6과, 2권임. 문법과 단어들 잘 넣어줘 특히 문법") 모의고사 공통 틀.
틀·검사는 주간시험 3 의 tools/mock3/common3.py 그대로(실제 2차 시험지 꼴). 다른 곳만 바꿔 실행한다: 낱말 범위 ch118_words.json(1권 1~12과 + 2권 1·2과 + 15~18=2권 3~6과) ·
파일 이름 mock5_N · 새 범위 낱말 몫 기준 15(2권 3과)부터 · 말하기(D)는 4회처럼 뺌(말하기 시험은 쌤과 실제 대화, 대표님 2026-11-07) → 71문항 · A30 B30 C20 · 90분.
다섯 벌은 처음부터 **자리마다 같은 문법·같은 과**로 쓴다(tools/mock5/sets_*.py — 대표님 "같은 회차 모의고사 사이에 차별점 두지 마라")."""
import pathlib
_R = pathlib.Path(__file__).resolve().parent.parent.parent
_s = (_R / 'tools/mock3/common3.py').read_text(encoding='utf-8')
for a, b in [("'ch110_words.json'", "'ch118_words.json'"), ("mock3_{other}", "mock5_{other}"), ("mock3_{no}", "mock5_{no}"), ("b >= 8", "b >= 15"), ("8~10과 낱말 몫", "새 범위 낱말 몫"),
             ('"pts": {"A": 30, "B": 30, "C": 20, "D": 20}', '"pts": {"A": 30, "B": 30, "C": 20}'),
             ('"note": f"주간시험 3 모의고사 {no} — 교재 1권 8~10과 범위(문법은 1~10과, 낱말은 8~10과 위주 — 대표님 2026-10-13 \'범위는 일단 8~10\').',
              '"note": f"주간시험 5 모의고사 {no} — 교재 2권 3~6과 범위(tools/mock5, 대표님 2026-11-18). 말하기는 뺌(쌤과 실제 대화).')]:
    assert a in _s, a
    _s = _s.replace(a, b)
exec(compile(_s, __file__, 'exec'), globals())
for _k in [k for k in SECN if k.startswith('D ')]: del SECN[_k]
NAMES |= {'james', 'phúc', 'thư', 'văn', 'đông', 'long', 'sáu', 'bin', 'na', 'kate', 'minh', 'hoa', 'kim'}
NAMES2 |= {'hòa bình', 'bến thành', 'vũng tàu', 'hà nội'}
