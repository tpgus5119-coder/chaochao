#!/usr/bin/env python3
"""선배 시험 자료를 앱이 실을 꼴로 굳힌다 → data/senior.json

왜 따로 두나 (사용자 지시): 이 낱말들의 **복습이 하루 5분 복습과 섞이면 안 된다.**
그래서 파일도 따로, 앱 안의 복습 상자도 따로(S.ssrs) 쓴다.

왜 낱말을 한 벌만 두고 번호로 가리키나: 같은 낱말이 일일시험과 주간시험에 거듭 나온다.
그대로 담으면 1만 줄인데, 한 벌로 모으면 절반 아래로 줄어든다 — 내려받는 양이 곧 요금이다.

'앱에 이미 있는 낱말'에는 표를 해 둔다(t). 배운 것과 처음 보는 것을 화면에서 갈라 보여야
'몇 개를 새로 외워야 하나'를 학습자가 스스로 안다.
"""
import json, pathlib, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
D = R / "data"

def key(vi, ko):
    return (unicodedata.normalize("NFC", vi.strip()), ko.strip())

# 앱이 이미 가르치는 낱말 — 표 t 를 붙이려고
taught = set()
for f in ("days.json",):
    j = json.loads((D / f).read_text(encoding="utf-8"))
    for d in j.get("days", []):
        for w in d.get("words") or []:
            if w.get("vi"):
                taught.add(unicodedata.normalize("NFC", w["vi"].strip()))

words, idx, sets = [], {}, []
KIND = {"일일": "d", "주간": "w", "기타": "x"}
for gi, f in (("20", "_senior_words.json"), ("19", "_senior_words-19.json")):
    j = json.loads((D / f).read_text(encoding="utf-8"))
    for s in j["sets"]:
        ns = []
        for w in s["words"]:
            vi, ko = (w.get("vi") or "").strip(), (w.get("ko") or "").strip()
            if not vi or not ko:
                continue                      # 답이 비어 있는 줄은 시험에 못 낸다
            k = key(vi, ko)
            if k not in idx:
                idx[k] = len(words)
                words.append([vi, ko] + ([1] if k[0] in taught else []))
            ns.append(idx[k])
        if len(ns) < 5:                       # 다섯 개도 안 되는 묶음은 시험이 안 된다
            continue
        sets.append({"gi": gi, "k": KIND.get(s["kind"], "x"), "no": s["no"], "w": ns})

sets.sort(key=lambda s: (s["gi"] != "20", s["k"], s["no"]))
out = {"note": "GYBM 19·20기 선배들이 실제로 본 시험 낱말. 복습은 앱의 다른 복습과 섞지 않는다.",
       "words": words, "sets": sets}
p = D / "senior.json"
p.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
kb = p.stat().st_size / 1024
known = sum(1 for w in words if len(w) > 2)
print(f"낱말 {len(words)}개 (앱에 이미 있는 것 {known} · 처음 보는 것 {len(words)-known})")
print(f"묶음 {len(sets)}개 · 파일 {kb:.0f}KB")
for gi in ("20", "19"):
    for k, nm in (("d", "일일"), ("w", "주간"), ("x", "모음")):
        n = [s for s in sets if s["gi"] == gi and s["k"] == k]
        if n: print(f"   {gi}기 {nm}: {len(n)}회 · 낱말 {sum(len(s['w']) for s in n)}")
