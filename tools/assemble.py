#!/usr/bin/env python3
"""준비 3일 + 일상 20일을 days.json 으로 합치고 검증한다.
검증 두 가지: 단어 중복 / 대화에 아직 안 배운 낱말이 섞였는지."""
import json, pathlib, re, sys, collections
sys.path.insert(0,'tools')
from visuals import attach
from gestures import attach as attach_gesture
R = pathlib.Path('.')
p1 = json.loads((R/'data/_part1.json').read_text())      # 준비 3일 + 성조 드릴
d1 = json.loads((R/'data/_daily1.json').read_text())
d2 = json.loads((R/'data/_daily2.json').read_text())

out = {"meta": {"version": "v3",
                "voices": {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"},
                "track": "일상 기초 (완전 초보)",
                "note": "북부(하노이) 표준. 하루 = 단어 5개 + 주고받는 대화 1개."},
       "prep": p1["prep"], "tonedrill": p1["tonedrill"],
       "days": d1["days"] + d2["days"]}

for d in out["days"]:
    for w in d["words"]:
        attach(w)
        attach_gesture(w)

seen = collections.defaultdict(list)
for d in out["days"]:
    for w in d["words"]:
        seen[w["vi"]].append(d["day"])
dups = {k: v for k, v in seen.items() if len(v) > 1}

PROPER = {"hàn","quốc","việt","nam","minsu","nguyễn","văn","hùng","trần","thị","lan",
          "hà","nội","busan"}
toks = lambda s: [t for t in re.split(r"[\s,.!?]+", s) if t]
vocab, bad = set(), []
for d in out["days"]:
    for w in d["words"]:
        vocab.update(t.lower() for t in w["vi"].split())
    texts = [l["vi"] for l in d["dialog"]["lines"]] + d["dialog"]["extra"]
    for txt in texts:
        for t in toks(txt):
            lt = t.lower()
            if lt in PROPER or lt in vocab:
                continue
            bad.append((d["day"], txt, t))

n_words = sum(len(d["words"]) for d in out["days"])
n_lines = sum(len(d["dialog"]["lines"]) for d in out["days"])
print(f"준비 {len(out['prep'])}일 + Day {len(out['days'])}일")
print(f"단어 {n_words} (고유 {len(seen)}) / 대화 {len(out['days'])}개 · {n_lines}문장 / 변형 {sum(len(d['dialog']['extra']) for d in out['days'])}")
print("\n중복 단어:", dups or "없음")
print("미학습 낱말 %d건:" % len(bad))
for a in bad: print('   Day%-3s "%s"  ←  %s' % a)

if "--write" in sys.argv and not bad and not dups:
    (R/'data/days.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print("\n→ data/days.json 기록 완료")
elif "--write" in sys.argv:
    print("\n→ 문제가 있어 기록하지 않음")
