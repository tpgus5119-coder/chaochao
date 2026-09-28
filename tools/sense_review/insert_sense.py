#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""뜻 목록 **가운데에** 뜻 하나를 끼워 넣고, 그 뒤 번호를 가리키던 판정(기본뜻.tsv·짝.tsv)을 모두 한 칸씩 민다.
뜻 목록은 흔히 쓰는 차례라(대표님 지시) 새 뜻이 흔하면 뒤에 붙이지 않고 제자리에 넣는다.
쓰기: python3 tools/sense_review/insert_sense.py 낱말 자리번호 "새 뜻"
그다음 apply.py 로 앱 자료를 다시 만든다."""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import D, R, key, read_tsv  # noqa: E402


def main():
    vi, pos, text = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    k = key(vi)
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    ss = list(S.get(k) or [])
    assert ss and 1 <= pos <= len(ss) + 1, (k, ss)
    new = ss[:pos - 1] + [text] + ss[pos - 1:]
    shift = lambda n: n + 1 if n >= pos else n
    # 1) 뜻 목록
    with open(D / "뜻목록.tsv", "a", encoding="utf-8") as f:
        f.write(f"{vi}\t{' | '.join(new)}\n")
    # 2) 기본뜻: 이 낱말을 가리키는 번호 줄을 모두 다시 적는다(뒤 줄이 이긴다)
    rows = [r for r in read_tsv("기본뜻.tsv") if key(r[1]) == k and r[2].strip().isdigit()]
    last = {}
    for r in rows:
        last[r[0]] = int(r[2].strip())
    with open(D / "기본뜻.tsv", "a", encoding="utf-8") as f:
        f.write(f"# {vi} 뜻 {pos}번 자리에 '{text}' 넣음 — 뒤 번호 한 칸씩 밂\n")
        for lk, n in last.items():
            if shift(n) != n:
                f.write(f"{lk}\t{vi}\t{shift(n)}\n")
    # 3) 짝: 이 낱말 쪽의 짝 번호
    W = json.loads((R / "data/sib.json").read_text(encoding="utf-8"))["w"]
    m = (W.get(k) or {}).get("m") or {}
    toks = []
    for p, v in m.items():
        vs = v if isinstance(v, list) else [v]
        nv = [shift(int(x)) for x in vs]
        if nv != [int(x) for x in vs]:
            toks.append(f"{p}={','.join(map(str, nv))}")
    if toks:
        with open(D / "짝.tsv", "a", encoding="utf-8") as f:
            f.write(f"{vi}\t" + "\t".join(toks) + "\n")
    print(f"{vi}: {len(ss)}→{len(new)}뜻 · 기본뜻 다시 적음 {sum(1 for n in last.values() if shift(n) != n)} · 짝 번호 밂 {len(toks)}")


if __name__ == "__main__":
    main()
