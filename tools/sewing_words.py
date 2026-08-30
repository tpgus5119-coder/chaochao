#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""대표님이 주신 **봉제용어.xls** 를 읽는다 → data/_sewing.json

이 파일을 그동안 못 읽고 있었다 (2026-08-30, 대표님 지적).
`.xls` 는 구형 판이라 openpyxl 이 못 연다 — xlrd 로 읽어야 한다.
그래서 봉제 낱말이 34개밖에 없었다. 실제로는 570줄이 들어 있다.

시트 셋
  · 봉제용어        영어 | 한국어 | **Vietnam** | 일본어 | 설명   → 봉제 낱말
  · 무역용어        약자 | Full | 한국어 | 설명                  → 거래 낱말(약어)
  · 봉제 및 검사 교육  한·베 문장 짝                              → 문장이라 낱말로는 안 쓴다
쓰기: python3 tools/sewing_words.py
"""
import json, os, pathlib, re, sys, unicodedata as U

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr

SRC = pathlib.Path(os.path.expanduser("~/Downloads/베트남어 학습자료/선배 자료/봉제용어.xls"))
KO = re.compile(r"[가-힣]")
VI = re.compile(r"[ăâđêôơưÀ-ỹ]", re.I)

def main():
    import xlrd
    wb = xlrd.open_workbook(SRC)
    out, seen, stat = [], set(), {}
    sh = wb.sheet_by_name("봉제용어")
    n = 0
    for i in range(sh.nrows):
        c = [str(sh.cell_value(i, j)).strip() for j in range(sh.ncols)]
        ko, vi = c[1] if len(c) > 1 else "", c[2] if len(c) > 2 else ""
        if not (ko and vi) or not KO.search(ko): continue
        if ko in ("한국어",) or vi in ("Vietnam",): continue
        vi = re.sub(r"\s+", " ", U.normalize("NFC", vi)).strip()
        if len(vi.split()) > 6 or len(vi) > 40: continue
        if not re.search(r"[A-Za-zÀ-ỹ]", vi): continue
        k = vi.lower()
        if k in seen: continue
        seen.add(k)
        out.append({"vi": vi, "ko": re.sub(r"\s+", " ", ko)[:26],
                    "kr": vi_kr.word(vi), "krs": vi_kr.word(vi, True),
                    "track": "봉제", "sew": 1})
        n += 1
    stat["봉제용어"] = n
    # 무역용어 — 약자는 낱말이 아니라 '한국어 뜻'만 쓸모가 있는데 베트남어가 없다. 안 쓴다.
    (R / "data" / "_sewing.json").write_text(json.dumps(
        {"note": "대표님이 주신 봉제용어.xls 의 봉제 낱말. xls 는 xlrd 로 읽는다.",
         "words": out}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"봉제 낱말 {len(out)}개")
    print("  ", dict(stat))
    for w in out[:12]: print(f"   {w['vi']:<26} {w['ko']}")
main()
