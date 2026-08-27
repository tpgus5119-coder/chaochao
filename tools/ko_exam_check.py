#!/usr/bin/env python3
"""출제 결과 자가 검수 — 자동 생성 문항이 빠지기 쉬운 함정만 골라 잡는다.

잡는 것:
  1) 보기 중복        — 같은 낱말이 두 번 나오면 문제가 성립하지 않는다
  2) 정답 누설        — 뜻풀이 안에 정답 낱말이 그대로 들어 있으면 뜻을 몰라도 맞힌다
  3) 뜻 겹침          — 보기 넷의 베트남어 뜻이 겹치면 정답이 둘이 된다
  4) 회차 간 같은 문항 — 1·2·3회차를 이어 풀 때 같은 문제가 또 나오면 시험이 안 된다
  5) 정답 쏠림        — 정답 번호가 한쪽에 몰리면 찍어서 맞는다
"""
import json, os, sys
from collections import Counter

DATA = os.path.join(os.path.dirname(__file__), "..", "data")

def vi_tokens(s):
    """'y tá, bác sĩ' → {'y tá','bác sĩ'} — 쉼표로 갈라 낱낱이 비교한다."""
    return {t.strip().lower() for t in str(s).split(",") if t.strip()}

def main():
    d = json.load(open(os.path.join(DATA, "ko_exams.json"), encoding="utf-8"))
    problems = []
    seen_by_exam = {}

    for e in d["exams"]:
        key = e["id"]
        seen = seen_by_exam.setdefault(key, {})
        for q in e["questions"]:
            where = f"{e['id']} {e['set']}회 {q['no']}번"
            opts = [str(o) for o in q["options"]]

            # 1) 보기 중복
            dup = [o for o, c in Counter(opts).items() if c > 1]
            if dup:
                problems.append(("보기중복", where, str(dup)))

            # 2) 정답 누설 — 뜻풀이형에서 stem 안에 정답이 그대로 있는가
            if q["type"] == "dfn2word":
                ans = opts[q["answer"]]
                body = q["stem"].split("\n", 1)[-1]
                stem_word = ans[:-2] if ans.endswith("하다") and len(ans) > 3 else ans
                if stem_word and stem_word in body:
                    problems.append(("정답누설", where, f"'{stem_word}' in 뜻풀이"))

            # 3) 뜻 겹침 — 베트남어 뜻 보기끼리 같은 표현을 공유하는가
            if q["type"] == "word2vi":
                sets = [vi_tokens(o) for o in opts]
                for i in range(len(sets)):
                    for j in range(i + 1, len(sets)):
                        if sets[i] & sets[j]:
                            problems.append(("뜻겹침", where,
                                             f"{opts[i]} ↔ {opts[j]} (겹침: {sets[i] & sets[j]})"))

            # 4) 회차 간 같은 문항
            # 문두만 보면 안 된다. 그림 문항은 문두가 다 같고 그림만 다르고,
            # 듣기 문항은 문두가 다 같고 **들려주는 말**이 다르다.
            # "실제로 무엇을 묻는가"를 다 넣어야 진짜 중복만 잡힌다.
            sig = (q["type"], q["stem"], q.get("img", ""), q.get("word", ""),
                   json.dumps(q.get("audio", ""), ensure_ascii=False),
                   q.get("passage", ""))
            if sig in seen:
                problems.append(("회차중복", where, f"{seen[sig]}와 같은 문항"))
            else:
                seen[sig] = where

    # 5) 정답 쏠림 — 시험별 정답 번호 분포
    skew = []
    for e in d["exams"]:
        c = Counter(q["answer"] for q in e["questions"])
        n = len(e["questions"])
        worst = max(c.values()) / n if n else 0
        if worst > 0.45:
            skew.append(f"{e['id']} {e['set']}회: {dict(sorted(c.items()))} (최다 {worst:.0%})")

    total_q = sum(len(e["questions"]) for e in d["exams"])
    print(f"검사 대상: {len(d['exams'])}개 세트 · {total_q}문항")
    if problems:
        by_kind = Counter(p[0] for p in problems)
        print(f"\n결함 {len(problems)}건: {dict(by_kind)}")
        for kind, where, detail in problems[:25]:
            print(f"  [{kind}] {where} — {detail}")
        if len(problems) > 25:
            print(f"  ... 외 {len(problems)-25}건")
    else:
        print("\n결함 없음 (중복·누설·뜻겹침·회차중복)")

    if skew:
        print("\n정답 쏠림 의심:")
        for s in skew:
            print("  " + s)
    else:
        print("정답 번호 분포 고름")

    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
