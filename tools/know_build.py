#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""7권 「베트남 바로알기」 12강을 묶는다 → data/know.json

바탕: 교육기관 강의자료 12개 PDF(그림 슬라이드). 글자층이 없어 macOS Vision 으로 읽어
      뼈대를 뽑고, 그 뼈대대로 요약했다. **강사 개인정보는 넣지 않았다.**
한 강 = **요약만**. 낱말과 문장은 뺐다 (대표님 지시, 2026-08-30) —
여기는 외우는 자리가 아니라 **알고 가는 자리**다. 낱말은 1~6권에서 배운다.
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
            out.append({"no": x["no"], "t": x["t"], "sum": x["sum"]})
    out.sort(key=lambda x: x["no"])
    (R / "data" / "know.json").write_text(json.dumps(
        {"note": "7권 베트남 바로알기 — 강의자료 12강 요약. 낱말·문장은 두지 않는다.", "lec": out},
        ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"강 {len(out)} · 요약 줄 {sum(len(x['sum']) for x in out)}")
main()
