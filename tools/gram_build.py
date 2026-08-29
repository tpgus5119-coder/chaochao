#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""문법 175개를 하나로 묶는다 → data/grammar.json  (1권 = 기본기 + 문법)

바탕: NGUYỄN VIỆT HƯƠNG 『Tiếng Việt Cơ sở Q2』 · 『Nâng cao Q1』 · 『Nâng cao Q2』
      — 선배 네 기수가 실제로 쓴 교재의 **과별 문법 항목 그대로**다. 내가 고른 것이 아니다.
한글 소리는 tools/vi_kr.py 가 붙인다(북부·남부 두 벌).
쓰기: python3 tools/gram_build.py
"""
import json, pathlib, sys

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
sys.path.insert(0, str(R / "tools" / "gram"))
import vi_kr
import g1_coso, g2_nc1, g3_nc2

def main():
    books, n, ne = [], 0, 0
    for m in (g1_coso, g2_nc1, g3_nc2):
        bais = []
        for b in m.BAI:
            gs = []
            for g in b["g"]:
                ex = [{"vi": v, "ko": k,
                       "kr": vi_kr.word(v), "krs": vi_kr.word(v, True)} for v, k in g["ex"]]
                gs.append({"t": g["t"], "k": g["k"], "b": g["b"], "ex": ex})
                n += 1; ne += len(ex)
            bais.append({"no": b["no"], "t": b["t"], "g": gs})
        books.append({"book": m.BOOK, "bai": bais})
    (R / "data" / "grammar.json").write_text(json.dumps(
        {"note": "교재(NGUYỄN VIỆT HƯƠNG) 세 권의 과별 문법 그대로. 1권 = 기본기 + 문법.",
         "books": books}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"책 {len(books)} · 과 {sum(len(x['bai']) for x in books)} · 문법 {n} · 예문 {ne}")
    print("강 수(문법 5개를 한 강으로):", -(-n // 5))
main()
