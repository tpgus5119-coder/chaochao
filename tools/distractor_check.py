#!/usr/bin/env python3
"""오답지 품질을 잰다 — **정답이 둘인 문항**과 **너무 먼 오답**.

두 가지를 센다:
  ① 정답이 둘  : 오답 자리에 정답의 **유의어**가 앉은 문항.
                 '가격'을 묻는데 보기에 '값'이 있으면 그건 틀린 보기가 아니다.
                 이건 결함이다 — 0이어야 한다.
  ② 가까운 오답: 오답 셋 가운데 뜻이 가까운 것(반의어·같은 의미범주)이 몇 개인가.
                 뜻이 아주 먼 낱말만 있으면 한국어를 몰라도 어울리지 않는 것을
                 지워 가며 맞힌다. 높을수록 좋다.

잣대는 국립국어원 등급별 어휘 12,010(유의어 3,283 · 반의어 760 · 의미범주 6,413).

실행: python3 tools/distractor_check.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ko_exam_gen as G

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
KINDS = ("dfn2word", "vi2word", "word2vi", "pic2word", "job")


def main():
    d = json.load(open(os.path.join(DATA, "ko_exams.json"), encoding="utf-8"))
    # 보기 글자 → 낱말. word2vi 는 보기가 베트남어 뜻이라 되짚어야 한다.
    words = json.load(open(os.path.join(DATA, "_ko_words.json"), encoding="utf-8"))
    by_vi = {}
    for w in words:
        by_vi.setdefault(str(w.get("vi", "")).split(",")[0].strip(), w["ko"])

    dup, near, tot, seen_near = 0, 0, 0, 0
    bad = []
    for e in d["exams"]:
        for q in e["questions"]:
            if q.get("type") not in KINDS or q.get("short") or not q.get("options"):
                continue
            ans = q.get("word")
            if not ans:
                continue
            others = []
            for i, o in enumerate(q["options"]):
                if i == q["answer"]:
                    continue
                s = str(o).split(",")[0].strip()
                others.append(by_vi.get(s, s))       # 베트남어 보기면 낱말로 되짚는다
            if not others:
                continue
            tot += 1
            hit = [o for o in others if G.is_syn(ans, o)]
            if hit:
                dup += 1
                if len(bad) < 12:
                    bad.append((f"{e['id']} {e['set']}회 {q['no']}번", ans, hit))
            k = sum(1 for o in others if G.close_to(ans, o))
            near += k
            seen_near += len(others)

    print(f"낱말형 문항 {tot}개")
    print(f"① 정답이 둘(오답에 유의어): {dup}개  ← 0 이어야 한다")
    for where, a, h in bad:
        print(f"     {where}  '{a}' 인데 보기에 {h}")
    print(f"② 뜻이 가까운 오답: {near}/{seen_near} = {100*near/max(1,seen_near):.1f}%"
          f"  ← 높을수록 좋다")
    return 1 if dup else 0


if __name__ == "__main__":
    sys.exit(main())
