#!/usr/bin/env python3
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
POS = {"명", "동", "형", "부", "대", "수", "조", "감", "구"}
def check(name):
    src = json.load(open(R / f"{name}.json")); p = R / f"{name}.ko.tsv"
    if not p.exists(): print(name, "답 없음"); return 1
    rows = [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8") if l.strip()]
    bad = []
    if len(rows) != len(src): bad.append(f"줄 수 {len(rows)} ≠ {len(src)}")
    cnt = {}
    for r, it in zip(rows, src):
        r += [""] * (5 - len(r))
        if r[0].strip() != str(it["n"]): bad.append(f"번호 {r[0]} ≠ {it['n']}"); continue
        j = r[1].strip(); cnt[j] = cnt.get(j, 0) + 1
        if j not in ("같음", "보충", "틀림", "모름"): bad.append(f"{it['n']} 판정 '{j}'"); continue
        if j == "보충":
            if not re.search(r"[가-힣]", r[2]) or re.search(r"[A-Za-zÀ-ỹđĐ]", r[2]) or len(r[2]) > 40: bad.append(f"{it['n']} 보충 뜻 '{r[2]}'")
            if r[3].strip() not in POS: bad.append(f"{it['n']} 품사 '{r[3]}'")
            if not r[4].strip(): bad.append(f"{it['n']} 까닭 없음")
        if j in ("틀림", "모름") and not r[4].strip(): bad.append(f"{it['n']} 까닭 없음")
    for b in bad[:30]: print(b)
    print(name, "문제", len(bad), "·", cnt)
    return len(bad)
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(p.stem for p in R.glob("sup_*.json"))
    sys.exit(1 if sum(check(n) for n in names) else 0)
