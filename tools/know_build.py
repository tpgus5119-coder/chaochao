#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""7권 「베트남 바로알기」 12강을 묶는다 → data/know.json

바탕: 교육기관 강의자료 12개 PDF(그림 슬라이드). 글자층이 없어 macOS Vision 으로 읽어
      뼈대를 뽑고, 그 뼈대대로 요약했다. **강사 개인정보는 넣지 않았다.**
한 강 = 요약 + 낱말 20 + 문장 4. 한글 소리는 vi_kr 이 붙인다.
쓰기: python3 tools/know_build.py
"""
import json, pathlib, sys

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools")); sys.path.insert(0, str(R / "tools" / "gram"))
import vi_kr, vn_know1, vn_know2

def main():
    out = []
    for m in (vn_know1, vn_know2):
        for x in m.LEC:
            out.append({
                "no": x["no"], "t": x["t"], "sum": x["sum"],
                "words": [{"vi": v, "ko": k, "kr": vi_kr.word(v), "krs": vi_kr.word(v, True)}
                          for v, k in x["words"]],
                "sents": [{"vi": v, "ko": k, "kr": vi_kr.word(v), "krs": vi_kr.word(v, True)}
                          for v, k in x["sents"]],
            })
    out.sort(key=lambda x: x["no"])
    (R / "data" / "know.json").write_text(json.dumps(
        {"note": "7권 베트남 바로알기 — 강의자료 12강 요약 + 낱말 20 + 문장 4.", "lec": out},
        ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"강 {len(out)} · 낱말 {sum(len(x['words']) for x in out)} · 문장 {sum(len(x['sents']) for x in out)}")
main()
