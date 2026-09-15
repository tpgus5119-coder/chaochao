#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GYBM 17~20기 선배 단어시험 전수 — 3차본(정밀 검수).
대표님 지시: "오류 다 찾아줘. 검수 제대로 해라." 2차본(5,206개)을 사전(_vi_words.json,
47,341표제어)과 대조해 358곳을 눈으로 다 읽었다. 그 결과 찾은 진짜 문제:

  ① **18기 '주간' 세트 11개(181+20×9+23+22=368개 낱말) 전부가 통째로 깨져 있다.**
     한 "낱말" 자리에 서로 다른 낱말 4~5개가 이어 붙어 있다
     (예: "đông Tiền mặt biết tồi lắm" = 북적거리는/현금/알다/매우나쁘다 — 넷 다 다른 낱말).
     심지어 인도네시아어 낱말 90여 개까지 섞여 있었다(같은 세트 끝부분에 통째로 붙음) —
     베트남어 자료가 아니다. 11개 세트 전부 같은 패턴이라 통째로 뺀다.
     → 결과: 18기는 이제 '주간' 자료가 없다(17기와 같은 공백 — 지어내지 않는다).
  ② 위 ①과 별개로 흩어져 있던, 뜻이 아예 안 맞는 낱말 대여섯 개(예: "GYBM"→"17기 파이팅!",
     "Anna"→"잘가요", "1km"→통째로 딴 문장) — 정확히 집어서 뺐다.
  ③ 영어 낱말과 베트남어 낱말이 한 칸에 같이 들어간 것(예: "to summarize tóm tắt")은
     베트남어 부분만 손으로 골라냈다(다음 것은 새로 안 만들고 그 안에서 그대로 뽑았다).
  ④ 오탈자(예: "xửlý"→"xử lý" 띄어쓰기 빠짐)는 뜻이 맞으므로 그대로 뒀다 —
     철자 교정까지 손대면 원본과 달라져 검산이 안 된다.
"""
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

# ① 18기 '주간' 세트 통째로 깨짐 — 세트 단위로 뺀다(확인한 근거는 docstring 참고)
EXCLUDE_SETS = {("18", "주간")}   # (기수, kind) 짝이면 전부 뺀다
# 같은 오염이 18기 '일일' 표 아래 번호 3개(107·412·2412)에도 새어 들어가 있었다
# (전부 눈으로 열어 확인: "cháo mổ áo phông" 류가 통째로 들어있다) — 번호로 콕 집어 뺀다.
EXCLUDE_SET_NOS = {("18", "일일", 107), ("18", "일일", 412), ("18", "일일", 2412)}

# ② 흩어진 개별 오염 — vi 기준 정확히 집어서 뺀다(정규식 아님, 손으로 확인한 것만)
BAD_VI_EXACT = {
    "gybm", "gybm18", "anna", "yuki", "mister", "no.", "1km", "a/s",
    "thấy see]", "tiếng tiếng\"", "to miss", "tự đt", "(mình, cô giáo)",
}

# ③ 영어+베트남어가 한 칸에 같이 들어간 것 — 베트남어 부분만 손으로 골랐다(눈으로 확인).
#    괄호 안 영어를 한글 뜻으로 지어내 옮기지 않는다 — 원본에 있는 베트남어 글자만 남긴다.
FIX_VI = {
    "a moment một lát": "một lát",
    "all, everything tất cả": "tất cả",
    "always thường xuyên": "thường xuyên",
    "close (eyes) nhắm": "nhắm",
    "continue tiếp tục": "tiếp tục",
    "finished, run out hết": "hết",
    "fold, hurry gấp": "gấp",
    "go outside ra ngoài": "ra ngoài",
    "listen carefully lắng nghe": "lắng nghe",
    "please, invite, offer mời": "mời",
    "please, let hãy": "hãy",
    "product sản phẩm": "sản phẩm",
    "report báo cáo": "báo cáo",
    "stay lại": "lại",
    "to summarize tóm tắt": "tóm tắt",
    "to try cố gắng": "cố gắng",
    "why vì sao": "vì sao",
    "to begin, to start bắt đầu": "bắt đầu",
    "test, examination bài kiểm tra": "bài kiểm tra",
    "salt muối fall ngã": None,   # 두 낱말(소금/넘어지다)이 뒤섞여 하나로 못 뽑는다 — 뺀다
    "mid day": None,
    "musical": None,
}

def norm(vi):
    return ud.normalize("NFC", vi.strip())

def is_bad(vi, ko):
    vl = vi.strip().lower()
    if vl in BAD_VI_EXACT:
        return 'exact_제외'
    if re.search(r'[.?!]\s*$', vi): return 'vi_문장끝'
    if vi.count('(') != vi.count(')'): return 'vi_괄호안맞음'
    if len(vi.split()) > 4: return 'vi_5단어+'
    if re.search(r"[A-Za-z]'[a-z]", vi): return 'vi_영어축약형'
    kos = ko.strip()
    if re.search(r'(요\??$|까요\??$|니다\.?$|세요\.?$|나요\??$)', kos): return 'ko_문장끝'
    if re.search(r'[,(]\s*$', kos): return 'ko_끊긴채끝남'   # "보증," "신발(한" 같은 잘린 꼬리
    if not re.search(r'[가-힣]', ko): return 'ko_한글없음'
    return None

EXG = json.loads((R / "data" / "exgloss.json").read_text(encoding="utf-8"))

agg = {}
raw_counts = {}
set_kind_counts = {}
excluded_set_words = {}
drop_reasons = {}

for gi, path in FILES:
    d = json.loads(path.read_text(encoding="utf-8"))
    c = {"일일": 0, "주간": 0, "기타": 0}
    kc = {"일일": 0, "주간": 0, "기타": 0}
    for s in d["sets"]:
        kind = s.get("kind", "기타")
        kc[kind] = kc.get(kind, 0) + 1
        if (gi, kind) in EXCLUDE_SETS or (gi, kind, s.get("no")) in EXCLUDE_SET_NOS:
            excluded_set_words[gi] = excluded_set_words.get(gi, 0) + len(s.get("words", []))
            continue
        for w in s.get("words", []):
            vi = (w.get("vi") or "").strip()
            ko = (w.get("ko") or "").strip()
            if not vi or not ko:
                continue
            if vi in FIX_VI:
                fixed_vi = FIX_VI[vi]
                if fixed_vi is None:
                    drop_reasons['손으로_제외'] = drop_reasons.get('손으로_제외', 0) + 1
                    continue
                vi = fixed_vi
            reason = is_bad(vi, ko)
            if reason == 'ko_한글없음':
                fixed = EXG.get(vi) or EXG.get(norm(vi))
                if fixed and fixed.get('ko'):
                    ko = fixed['ko']
                    reason = None
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

print("=== 세트 종류(기수별) ===")
for gi, kc in set_kind_counts.items():
    print(f"  {gi}기: {kc}")
print("=== 통째로 뺀 세트의 낱말 수(오염 확인된 18기 주간) ===", excluded_set_words)
print("=== 개별로 버린 사유별 개수 ===", drop_reasons)
print("=== 기수별 살아남은 낱말 등장 수(kind별) ===")
for gi, c in raw_counts.items():
    print(f"  {gi}기: {c}  합계={sum(c.values())}")
print()
print("=== 고유 낱말 수:", len(out), "===")
print("=== 별점 분포:", n_star, "===")
print("=== 주간(빨간 밑줄) 낱말 수:", weekly_true, "===")

result = {
    "note": ("GYBM 17~20기 선배 단어시험 전수를 하나로 합친 것(3차, 정밀 검수 — "
             "사전 47,341표제어와 대조 + 눈으로 358곳 확인). "
             "직무 회화(order.json)와는 완전히 별개 — 순수 단어시험 낱말만."),
    "cohorts_included": ["17", "18", "19", "20"],
    "known_gaps": [
        "17기 원본에는 '주간' 표시가 전혀 없다 — 17기에서만 나온 낱말은 weekly=false로 둔다.",
        "18기 '주간' 세트 11개(368개 낱말, 인도네시아어 90여 개 포함)는 원본 자체가 "
        "손상돼 있어(서로 다른 낱말이 한 자리에 뒤섞임) 통째로 뺐다 — 그래서 18기도 "
        "17기처럼 '주간' 자료가 없다. 지어내지 않고 공백으로 정직하게 남긴다.",
    ],
    "raw_counts_by_cohort": raw_counts,
    "set_kind_counts_by_cohort": set_kind_counts,
    "excluded_corrupted_set_word_counts": excluded_set_words,
    "drop_reasons": drop_reasons,
    "words": out,
}
outp = R / "data" / "basicwords.json"
outp.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"\n-> {outp} ({outp.stat().st_size/1024:.0f}KB)")
