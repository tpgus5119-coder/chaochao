#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/word_check/k_고침.tsv 를 data/sib.json 의 w[낱말].k 에 넣고, tools/word_check/짝_삭제.tsv 의 짝을 양쪽에서 지운다 (2026-09-29). 쓰기: python3 tools/word_check/apply_k.py"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
doc = json.loads((R / "data/sib.json").read_text(encoding="utf-8")); W = doc["w"]; n = 0
for ln in (R / "tools/word_check/k_고침.tsv").read_text(encoding="utf-8").splitlines():
    if ln.strip() and not ln.startswith("#") and "\t" in ln:
        w, k = ln.rstrip("\n").split("\t")[:2]
        W.setdefault(w.strip().lower(), {})["k"] = k.strip(); n += 1
d = 0
q = R / "tools/word_check/짝_삭제.tsv"
if q.exists():
    for ln in q.read_text(encoding="utf-8").splitlines():
        if ln.strip() and not ln.startswith("#") and "\t" in ln:
            a, b = [x.strip().lower() for x in ln.split("\t")[:2]]
            for x, y in ((a, b), (b, a)):
                g = W.get(x)
                if not g: continue
                for f in ("s", "a"):
                    if y in (g.get(f) or []):
                        g[f] = [z for z in g[f] if z != y]; d += 1
                        if not g[f]: del g[f]
                if "m" in g and y in g["m"]:
                    del g["m"][y]
                    if not g["m"]: del g["m"]
(R / "data/sib.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
print("뜻 고침", n, "· 짝 지움", d)
