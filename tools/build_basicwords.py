#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GYBM 17~20기 선배 단어시험 전수를 하나로 합친다 — 2차본(불량 걸러냄).
   1차본(6,167개)을 눈으로 보니 원본 스캔 자체에 섞여 있던 문장·괄호조각·영문
   오염이 그대로 딸려왔다. "절대 구라 ㄴㄴ" 지시라 걸러낸 규칙과 숫자를 전부 남긴다."""
import json, pathlib, sys, re, unicodedata as ud

R = pathlib.Path.home() / "짜오짜오" / "베트남어-어플"
sys.path.insert(0, str(R / "tools"))
import vi_kr

FILES = [
    ("17", R / "data" / "_senior_words-17.json"),
    ("18", R / "data" / "_senior_words-18.json"),
    ("19", R / "data" / "_senior_words-19.json"),
    ("20", R / "data" / "_senior_words.json"),
]

def norm(vi):
    return ud.normalize("NFC", vi.strip())

def is_bad(vi, ko):
    if re.search(r'[.?!]\s*$', vi): return 'vi_문장끝'
    if vi.count('(') != vi.count(')'): return 'vi_괄호안맞음'
    if len(vi.split()) > 4: return 'vi_5단어+'
    if re.search(r"[A-Za-z]'[a-z]", vi): return 'vi_영어축약형'
    if re.search(r'(요\?$|까요\?$|니다\.$|세요\.$|나요\?$)', ko.strip()): return 'ko_문장끝'
    if not re.search(r'[가-힣]', ko): return 'ko_한글없음'
    return None

EXG = json.loads((R / "data" / "exgloss.json").read_text(encoding="utf-8"))

agg = {}
raw_counts = {}
set_kind_counts = {}
drop_reasons = {}

for gi, path in FILES:
    d = json.loads(path.read_text(encoding="utf-8"))
    c = {"일일": 0, "주간": 0, "기타": 0}
    kc = {"일일": 0, "주간": 0, "기타": 0}
    for s in d["sets"]:
        kind = s.get("kind", "기타")
        kc[kind] = kc.get(kind, 0) + 1
        for w in s.get("words", []):
            vi = (w.get("vi") or "").strip()
            ko = (w.get("ko") or "").strip()
            if not vi or not ko:
                continue
            reason = is_bad(vi, ko)
            if reason == 'ko_한글없음':
                key0 = norm(vi)
                fixed = EXG.get(vi) or EXG.get(key0)
                if fixed and fixed.get('ko'):
                    ko = fixed['ko']
                    reason = None   # 되살림
            if reason:
                drop_reasons[reason] = drop_reasons.get(reason, 0) + 1
                continue
            key = norm(vi)
            c[kind] = c.get(kind, 0) + 1
            e = agg.setdefault(key, {"vi": vi, "cohorts": set(), "weekly": False, "ko_by_cohort": {}})
            e["cohorts"].add(gi)
            if kind == "주간":
                e["weekly"] = True
            e["ko_by_cohort"][gi] = ko
    raw_counts[gi] = c
    set_kind_counts[gi] = kc

n_star = {0: 0, 1: 0, 2: 0, 3: 0}
weekly_true = 0
out = []
COHORT_ORDER = ["20", "19", "18", "17"]
for key, e in agg.items():
    n = len(e["cohorts"])
    star = {1: 0, 2: 1, 3: 2, 4: 3}.get(n, 0)
    n_star[star] += 1
    ko = None
    for gi in COHORT_ORDER:
        if gi in e["ko_by_cohort"]:
            ko = e["ko_by_cohort"][gi]; break
    kr = vi_kr.word(e["vi"])
    if e["weekly"]:
        weekly_true += 1
    out.append({
        "vi": e["vi"], "ko": ko, "kr_read": kr,
        "cohorts": sorted(e["cohorts"], key=lambda x: -int(x)),
        "star": star, "weekly": e["weekly"],
    })

out.sort(key=lambda x: (-x["star"], -len(x["cohorts"]), x["vi"]))

print("=== 기수별 회차(세트) 종류 ===")
for gi, kc in set_kind_counts.items():
    print(f"  {gi}기: {kc}")
print("=== 버린 사유별 개수(중복 등장 포함, 실려있던 자리 기준) ===", drop_reasons)
print("=== 기수별 살아남은 낱말 등장 수(kind별) ===")
for gi, c in raw_counts.items():
    print(f"  {gi}기: {c}  합계={sum(c.values())}")
print()
print("=== 고유 낱말 수:", len(out), "===")
print("=== 별점 분포:", n_star, "===")
print("=== 주간(빨간 밑줄) 낱말 수:", weekly_true, "===")

result = {
    "note": ("GYBM 17~20기 선배 단어시험 전수를 하나로 합친 것(2차, 불량 거름). "
             "직무 회화(order.json)와는 완전히 별개 — 순수 단어시험 낱말만. "
             "원본 스캔에 섞여 있던 문장·괄호조각·영문 전용 항목은 규칙으로 걸러냈다"
             "(거른 사유별 개수는 만든 로그에 남아 있다). "
             "star: 2기수=1·3기수=2·4기수=3(1기수만이면 0). "
             "weekly: 그 낱말이 실린 회차 중 하나라도 '주간' 시험이었던 적이 있으면 true "
             "— 17기는 원본 자체에 '주간' 표시가 하나도 없다(데이터 공백, 지어내지 않음)."),
    "cohorts_included": ["17", "18", "19", "20"],
    "known_gap": "17기 원본에는 '주간' 표시가 전혀 없다 — 17기에서만 나온 낱말은 주간 여부를 알 수 없어 weekly=false로 둔다(실제로 안 나왔다는 뜻이 아니라 기록이 없다는 뜻).",
    "raw_counts_by_cohort": raw_counts,
    "set_kind_counts_by_cohort": set_kind_counts,
    "drop_reasons": drop_reasons,
    "words": out,
}
outp = R / "data" / "basicwords.json"
outp.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"\n-> {outp} ({outp.stat().st_size/1024:.0f}KB)")
