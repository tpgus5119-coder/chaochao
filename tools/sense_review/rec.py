#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""판정 적기 도우미 — 수업 여러 개의 판정을 한 번에 기본뜻.tsv 에 덧붙인다(적지 않은 낱말은 '-').
쓰기: python3 tools/sense_review/rec.py 교재 4 3 '<json {수업키: {낱말: 번호}}>' ['<머리 주석>']
뜻이 둘 이상인 낱말을 빠뜨리면 check.py 가 잡는다('-' 인데 뜻이 여럿).
선배·22기: 뜻이 여럿이고 교재에서 기본 뜻을 정한 낱말은 'M'(교재 따름)으로 적는다 — 번호를 따로 주면 그 번호."""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import D, R, lessons, key, main_defaults  # noqa: E402


def main():
    part, start, n = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    pick = {lk: {key(w): v for w, v in d.items()} for lk, d in json.loads(sys.argv[4]).items()}
    head = sys.argv[5] if len(sys.argv) > 5 else ""
    L = lessons(part)[start - 1:start - 1 + n]
    follow = part in ("선배", "22기")
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8")) if follow else {}
    md = main_defaults() if follow else {}
    for lk in pick:
        assert lk in {x[0] for x in L}, f"수업키 {lk} 이(가) 범위 밖"
    out = [f"# {head}"] if head else []
    for lk, _, words in L:
        known = {key(w["vi"]) for w in words}
        for k in pick.get(lk, {}):
            assert k in known, f"{lk}: {k} 은(는) 이 수업 낱말이 아님"
        for w in words:
            k = key(w["vi"])
            v = pick.get(lk, {}).get(k)
            if v is None:
                v = "M" if follow and len(S.get(k) or []) >= 2 and k in md else "-"
            out.append(f"{lk}\t{w['vi']}\t{v}")
    with open(D / "기본뜻.tsv", "a", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(f"적음 {len(out) - (1 if head else 0)}줄")


if __name__ == "__main__":
    main()
