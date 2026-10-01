#!/usr/bin/env python3
import json, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
OK = {"명", "동", "형", "부", "대", "수", "분류", "조", "전", "접", "감", "구", "속담", "고유", "?"}
def check(name):
    src = json.load(open(R / f"{name}.json")); p = R / f"{name}.ko.tsv"
    if not p.exists(): print(name, "답 없음"); return 1
    want = [(str(it["n"]), str(s["i"])) for it in src for s in it["senses"]]
    rows = [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8") if l.strip()]
    bad = []
    if len(rows) != len(want): bad.append(f"줄 수 {len(rows)} ≠ {len(want)}")
    cnt = {}
    for r, w in zip(rows, want):
        r += [""] * (3 - len(r))
        if (r[0].strip(), r[1].strip()) != w: bad.append(f"번호 {r[0]}.{r[1]} ≠ {w[0]}.{w[1]}"); continue
        v = r[2].strip(); cnt[v] = cnt.get(v, 0) + 1
        if v not in OK: bad.append(f"{w[0]}.{w[1]} 품사 '{v}'")
    for b in bad[:30]: print(b)
    print(name, "문제", len(bad), "·", dict(sorted(cnt.items(), key=lambda x: -x[1])))
    return len(bad)
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(p.stem for p in R.glob("pos_*.json"))
    sys.exit(1 if sum(check(n) for n in names) else 0)
