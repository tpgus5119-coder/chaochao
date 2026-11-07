# -*- coding: utf-8 -*-
"""주간시험 4(교재 1권 11·12과 + 2권 1·2과 — 대표님 2026-11-06 "모의고사 네번째거 만들어줘, 범위는 1권의 11단원부터 2권의 2단원까지") 모의고사 공통 틀.
틀·검사는 주간시험 3 의 tools/mock3/common3.py 그대로(86문항·90분·A30 B30 C20 D20, 실제 2차 시험지 꼴). 다른 곳만 바꿔 실행한다:
낱말 범위 ch114_words.json(1~10과 + 11·12 + 13=2권 1과 + 14=2권 2과) · 파일 이름 mock4_N · 새 범위 낱말 몫 기준 11과부터.
말하기(D)는 뺐다 — 말하기 시험은 쌤과 실제로 나누는 대화라서(대표님 2026-11-07). 그래서 80문항 · A30 B30 C20, 시간은 말하기를 빼고 재는 90분 그대로.
다섯 벌은 ex 를 돌려 섞지 않고 처음부터 **자리마다 같은 문법·같은 과**로 쓴다(tools/mock4/sets_*.py — 대표님 "난이도 구분 없이, 문법과 단어 차별 없이, 문장과 문제만 다르게")."""
import pathlib
_R = pathlib.Path(__file__).resolve().parent.parent.parent
_s = (_R / 'tools/mock3/common3.py').read_text(encoding='utf-8')
for a, b in [("'ch110_words.json'", "'ch114_words.json'"), ("mock3_{other}", "mock4_{other}"), ("mock3_{no}", "mock4_{no}"), ("b >= 8", "b >= 11"), ("8~10과 낱말 몫", "새 범위 낱말 몫"), ('"pts": {"A": 30, "B": 30, "C": 20, "D": 20}', '"pts": {"A": 30, "B": 30, "C": 20}'),
             ('"note": f"주간시험 3 모의고사 {no} — 교재 1권 8~10과 범위(문법은 1~10과, 낱말은 8~10과 위주 — 대표님 2026-10-13 \'범위는 일단 8~10\').',
              '"note": f"주간시험 4 모의고사 {no} — 교재 1권 11·12과 + 2권 1·2과 범위(tools/mock4, 대표님 2026-11-06).')]:
    assert a in _s, a
    _s = _s.replace(a, b)
exec(compile(_s, __file__, 'exec'), globals())
for _k in [k for k in SECN if k.startswith('D ')]: del SECN[_k]
NAMES |= {'watanabe', 'taro', 'jenny', 'colin', 'john', 'kate', 'loan', 'keiko', 'ánh', 'năm', 'hai', 'thái', 'hương', 'xưa', 'samsung', 'titanic', 'ngon', 'dậu', 'hưng', 'quận', 'sư', 'muôn', 'mariko'}
NAMES2 |= {'mũi né', 'vũng tàu', 'phú quốc', 'đà lạt', 'bến tre', 'bến thành'}
ALLOW |= {'taxi', 'mini', 'ta', 'tư'}   # 교재 글에 그대로 나오는 말(2권 2과 taxi·mini, 1권 12과 anh ta) · 숫자 ba mươi tư
