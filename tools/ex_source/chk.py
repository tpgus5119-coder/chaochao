#!/usr/bin/env python3
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
SUF = ".b.tsv" if "--b" in sys.argv else ".ko.tsv"
def check(name):
    src = json.load(open(R / f"{name}.json")); p = R / f"{name}{SUF}"
    if not p.exists(): print(name, "답 없음"); return 1
    rows = [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8") if l.strip()]
    bad, cnt = [], {}
    if len(rows) != len(src): bad.append(f"줄 수 {len(rows)} ≠ {len(src)}")
    for r, it in zip(rows, src):
        r += [""] * (4 - len(r))
        if r[0].strip() != str(it["n"]): bad.append(f"번호 {r[0]} ≠ {it['n']}"); continue
        c = r[1].strip(); cnt[c[:1] or '?'] = cnt.get(c[:1] or '?', 0) + 1
        ok = {"0"} | {f"T{i+1}" for i in range(len(it["T"]))} | {f"W{i+1}" for i in range(len(it["W"]))}
        if c not in ok: bad.append(f"{it['n']} 고른 것 '{c}' (가능 {sorted(ok)})"); continue
        if c != "0":
            ko = r[2].strip()
            if not re.search(r"[가-힣]", ko) or re.search(r"[A-Za-zÀ-ỹđĐ]", ko) or len(ko) > 90: bad.append(f"{it['n']} 번역 '{ko}'")
    for b in bad[:30]: print(b)
    print(name, "문제", len(bad), "·", cnt)
    return len(bad)
if __name__ == "__main__":
    names = [a for a in sys.argv[1:] if a != "--b"] or sorted(p.stem for p in R.glob("sh_*.json"))
    sys.exit(1 if sum(check(n) for n in names) else 0)
