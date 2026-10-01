#!/usr/bin/env python3
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
def check(name):
    src = json.load(open(R / f"{name}.json")); p = R / f"sh_{name[3:]}.b.tsv"
    if not p.exists(): print(name, "답 없음"); return 1
    rows = [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8") if l.strip()]
    bad, cnt = [], {}
    if len(rows) != len(src): bad.append(f"줄 수 {len(rows)} ≠ {len(src)}")
    for r, it in zip(rows, src):
        r += [""] * (4 - len(r))
        if r[0].strip() != str(it["n"]): bad.append(f"번호 {r[0]} ≠ {it['n']}"); continue
        v = r[1].strip(); cnt[v] = cnt.get(v, 0) + 1
        if v not in ("Y", "N"): bad.append(f"{it['n']} 판정 '{v}'")
        if v == "N" and not r[3].strip(): bad.append(f"{it['n']} 까닭 없음")
        if r[2].strip() and (re.search(r"[A-Za-zÀ-ỹđĐ]", r[2]) or not re.search(r"[가-힣]", r[2])): bad.append(f"{it['n']} 번역 '{r[2]}'")
    for b in bad[:30]: print(b)
    print(name, "문제", len(bad), "·", cnt)
    return len(bad)
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(p.stem for p in R.glob("vf_*.json"))
    sys.exit(1 if sum(check(n) for n in names) else 0)
