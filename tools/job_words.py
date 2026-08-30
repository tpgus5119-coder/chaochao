#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""업종별 직무 낱말을 묶는다 → data/_jobwords.json

왜 내가 썼나 (대표님 지시, 2026-08-30)
  대표님이 주신 자료는 **봉제 용어집뿐**이라, 전자·신발·물류 같은 갈래가 30개도 안 됐다.
  그런데 조사해 보니 한국인이 실제로 가는 곳은 **전자와 섬유가 두 축**이다
  (KIET 「베트남 내 한국다국적기업 현황」 · KOTRA 2023 「베트남 내 한국인 취업 현황」:
   직무는 생산관리 40%, 업종은 제조업 1위 > 물류 > 요식 > 건설 > IT).
  그래서 그 갈래의 낱말을 **내가 써서 채웠다.** 지어낸 것이 아니라 확인하고 적었다:
    · SMT/전자 — vi.wikipedia 「Công nghệ dán bề mặt」 · speedmaint.com · cncvina.com.vn
    · 신발     — fttleather.com(đế khâu/đế dán) · zim.vn 신발 용어
    · 무역     — tools/trade_words.py 와 같은 확인 절차
쓰기: python3 tools/job_words.py
"""
import json, pathlib, sys

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools")); sys.path.insert(0, str(R / "tools" / "gram"))
import vi_kr, job_elec, job_more, job_common

def main():
    out, seen = [], set()
    def add(track, pairs):
        for vi, ko in pairs:
            k = vi.strip().lower()
            if k in seen: continue
            seen.add(k)
            out.append({"vi": vi, "ko": ko, "kr": vi_kr.word(vi), "krs": vi_kr.word(vi, True),
                        "track": track, "made": 1})
    for track, ws in job_common.W.items(): add(track, ws)
    add("전자·반도체", job_elec.W)
    for track, ws in job_more.TRACKS:
        if ws: add(track, ws)
    (R / "data" / "_jobwords.json").write_text(json.dumps(
        {"note": "업종별 직무 낱말. 대표님 자료에 없던 갈래(전자·신발·기계·건설·물류·식품·유통)를 채운 것.",
         "words": out}, ensure_ascii=False, indent=1), encoding="utf-8")
    import collections
    print(f"업종 낱말 {len(out)}개")
    for k, v in collections.Counter(w["track"] for w in out).most_common():
        print(f"   {k:<12} {v}")
main()
