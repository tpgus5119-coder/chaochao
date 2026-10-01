#!/usr/bin/env python3
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
def check(name):
    src = json.load(open(R / f"{name}.json")); p = R / f"{name}.ko.tsv"
    if not p.exists(): print(name, "답 없음"); return 1
    want = [(it["n"], s["i"]) for it in src for s in it["s"]]
    rows = [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8") if l.strip()]
    bad = []
    if len(rows) != len(want): bad.append(f"줄 수 {len(rows)} ≠ {len(want)}")
    for r, (n, i) in zip(rows, want):
        if len(r) < 3: bad.append(f"칸 부족 {r}"); continue
        if (r[0].strip(), r[1].strip()) != (str(n), str(i)): bad.append(f"번호 {r[0]}.{r[1]} ≠ {n}.{i}")
        ko = r[2].strip()
        if ko == "-": continue
        if re.search(r"[A-Za-zÀ-ỹđĐ]", ko): bad.append(f"{n}.{i} 로마자 '{ko}'")
        if not re.search(r"[가-힣]", ko): bad.append(f"{n}.{i} 한글 없음 '{ko}'")
        if len(ko) > 60: bad.append(f"{n}.{i} 너무 김")
    for b in bad[:30]: print(b)
    print(name, "문제", len(bad), "· 뜻", len(rows), "· '-'", sum(1 for r in rows if len(r) > 2 and r[2].strip() == "-"))
    return len(bad)
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(p.stem for p in R.glob("fs_*.json"))
    sys.exit(1 if sum(check(n) for n in names) else 0)
