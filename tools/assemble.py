#!/usr/bin/env python3
"""part1/2/3 을 days.json 으로 합치고, 어휘 순서를 엄격히 검증한다."""
import json, pathlib, re, sys, collections
R = pathlib.Path('.')
p1 = json.loads((R/'data/_part1.json').read_text())
p2 = json.loads((R/'data/_part2.json').read_text())
p3 = json.loads((R/'data/_part3.json').read_text())

out = {"meta": {"version": "v2",
                "voices": {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"},
                "note": "북부(하노이) 표준. 완전 초보용 — 준비 3일 + 20일."},
       "prep": p1["prep"],
       "tonedrill": p1["tonedrill"],
       "days": p1["days"] + p2["days"] + p3["days"]}

# --- 검증 1: 단어 중복 ---
seen = collections.defaultdict(list)
for d in out["days"]:
    for w in d["words"]:
        seen[w["vi"]].append(d["day"])
dups = {k: v for k, v in seen.items() if len(v) > 1}

# --- 검증 2: 문장에 아직 안 배운 낱말이 있는지 (누적, 엄격) ---
def toks(s):
    return [t for t in re.split(r"[\s,.!?]+", s) if t]

PROPER = {"hàn","quốc","việt","nam","minsu","nguyễn","văn","hùng","trần","thị","lan"}
vocab = set()
bad = []
for d in out["days"]:
    for w in d["words"]:
        vocab.update(t.lower() for t in w["vi"].split())
    for st in d["sets"]:
        for sen in st["sentences"]:
            for txt in [sen["vi"]] + sen["swap"]:
                for t in toks(txt):
                    lt = t.lower()
                    if lt in PROPER:          # 고유명사만 건너뛴다 (첫 글자 대문자는 봐주지 않는다)
                        continue
                    if lt not in vocab:
                        bad.append((d["day"], txt, t))

# --- 검증 3: gloss 가 문장 낱말을 다 덮는지 (대략) ---
thin = []
for d in out["days"]:
    for st in d["sets"]:
        for sen in st["sentences"]:
            if len(sen["gloss"]) < 2 and len(toks(sen["vi"])) > 2:
                thin.append((d["day"], sen["vi"]))

print("Day 수:", len(out["days"]), "| 준비:", len(out["prep"]))
print("단어 총", sum(len(d["words"]) for d in out["days"]), "| 고유", len(seen))
print("문장 총", sum(len(s["sentences"]) for d in out["days"] for s in d["sets"]),
      "| 변형 포함", sum(1+len(sen["swap"]) for d in out["days"] for s in d["sets"] for sen in s["sentences"]))
print("\n중복 단어:", dups or "없음")
print("미학습 낱말 %d건:" % len(bad))
for a in bad: print('   Day%-3s "%s"  ←  %s' % a)
if thin: print("gloss 빈약:", thin)

if "--write" in sys.argv and not bad and not dups:
    (R/'data/days.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print("\n→ data/days.json 기록 완료")
elif "--write" in sys.argv:
    print("\n→ 문제가 있어 기록하지 않음")
