#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""data/_vdict_def.json(인터넷 사전 대조 결과)를 basicwords.json과 합쳐
사람이 눈으로 쭉 훑어보기 좋은 표로 만든다. 별(tier) 순서로, 사전 뜻풀이가
실제로 있는 낱말만 먼저 — 없는 낱말(구·문장이거나 고유명사)은 따로 센다.

쓰기: python3 tools/vdict_report.py
결과: 화면에 요약 숫자만 찍고, data/_vdict_review_tier{3,2,1,0}.txt 로 저장
"""
import json, pathlib

R = pathlib.Path(__file__).resolve().parent.parent


def main():
    d = json.loads((R / "data" / "basicwords.json").read_text(encoding="utf-8"))
    vd = json.loads((R / "data" / "_vdict_def.json").read_text(encoding="utf-8"))

    by_tier = {3: [], 2: [], 1: [], 0: []}
    for w in d["words"]:
        by_tier[w["star"]].append(w)

    has_def = no_def_404 = has_200_empty = 0
    for tier in (3, 2, 1, 0):
        lines = []
        for w in by_tier[tier]:
            r = vd.get(w["vi"], {"status": "?", "def": ""})
            if r["status"] == 200 and r["def"]:
                has_def += 1
                lines.append(f"{w['vi']}\t{w['ko']}\t{r['def']}")
            elif r["status"] == 404:
                no_def_404 += 1
            elif r["status"] == 200 and not r["def"]:
                has_200_empty += 1
        out = R / "data" / f"_vdict_review_tier{tier}.txt"
        out.write_text("\n".join(lines), encoding="utf-8")
        print(f"tier{tier}: 사전뜻풀이 있음 {len(lines)}개 -> {out.name}")

    print(f"\n합계 · 뜻풀이 있음(대조 대상) {has_def} · 404(구/고유명사 등) {no_def_404} "
          f"· 200인데 뜻풀이 없음(고유명사 등) {has_200_empty} · 전체 {len(vd)}")


if __name__ == "__main__":
    main()
