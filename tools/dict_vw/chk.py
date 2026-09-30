#!/usr/bin/env python3
"""vw 시트 답 검사: 번호가 1부터 빠짐없이 이어지나 · 낱말이 입력과 같나 · 뜻에 로마자가 없나 · 길이(뜻 하나 40자, 전체 90자) · 빈 뜻."""
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
def check(name):
    src = json.load(open(R / f"{name}.json")); p = R / f"{name}.ko.tsv"
    if not p.exists(): print(name, "답 파일 없음"); return 1
    rows = [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8") if l.strip()]
    bad = []
    if len(rows) != len(src): bad.append(f"줄 수 {len(rows)} ≠ {len(src)}")
    for i, (r, s) in enumerate(zip(rows, src)):
        if len(r) < 3: bad.append(f"{i+1}: 칸 부족 {r}"); continue
        n, vi, ko = r[0].strip(), r[1].strip(), r[2].strip()
        if str(s["n"]) != n: bad.append(f"{i+1}: 번호 {n} ≠ {s['n']}")
        if vi != s["vi"]: bad.append(f"{n}: 낱말 '{vi}' ≠ '{s['vi']}'")
        if ko == "-": continue
        if not ko: bad.append(f"{n}: 뜻 비었음")
        if re.search(r"[A-Za-zÀ-ỹđĐ]", ko): bad.append(f"{n}: 뜻에 로마자 '{ko}'")
        if not re.search(r"[가-힣]", ko): bad.append(f"{n}: 한글 없음 '{ko}'")
        if len(ko) > 90 or any(len(x.strip()) > 40 for x in ko.split("·")): bad.append(f"{n}: 너무 김 '{ko[:30]}…'")
    for b in bad[:30]: print(b)
    print(name, "문제", len(bad), "· 뜻 있음", sum(1 for r in rows if len(r) > 2 and r[2].strip() != "-"), "/", len(rows))
    return len(bad)
if __name__ == "__main__":
    names = sys.argv[1:] or sorted(p.stem for p in R.glob("vw_*.json"))
    sys.exit(1 if sum(check(n) for n in names) else 0)
