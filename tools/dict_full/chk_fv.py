#!/usr/bin/env python3
import json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent
name = sys.argv[1]; src = {r[0] for r in json.load(open(R / f"{name}.json"))}
p = R / f"{name}.ko.tsv"
if not p.exists(): print(name, "답 없음"); sys.exit(1)
L = [l.rstrip("\n") for l in open(p, encoding="utf-8") if l.strip()]
bad = []
if not L or L[-1].strip() != "끝": bad.append("마지막 줄 '끝' 없음")
for l in L[:-1]:
    q = l.split("\t")
    if len(q) < 2 or not q[0].strip().isdigit() or int(q[0]) not in src: bad.append(f"번호 이상: {l[:40]}"); continue
    ko = q[1].strip()
    if re.search(r"[A-Za-zÀ-ỹđĐ]", ko): bad.append(f"{q[0]} 로마자 '{ko}'")
    if not re.search(r"[가-힣]", ko): bad.append(f"{q[0]} 한글 없음")
for b in bad[:20]: print(b)
print(name, "문제", len(bad), "· 고친 줄", max(0, len(L) - 1), "/", len(src)); sys.exit(1 if bad else 0)
