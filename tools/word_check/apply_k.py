#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/word_check/k_고침.tsv 를 data/sib.json 의 w[낱말].k 에 넣는다 (2026-09-29). 쓰기: python3 tools/word_check/apply_k.py"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
doc = json.loads((R / "data/sib.json").read_text(encoding="utf-8")); W = doc["w"]; n = 0
for ln in (R / "tools/word_check/k_고침.tsv").read_text(encoding="utf-8").splitlines():
    if ln.strip() and not ln.startswith("#") and "\t" in ln:
        w, k = ln.rstrip("\n").split("\t")[:2]
        W.setdefault(w.strip().lower(), {})["k"] = k.strip(); n += 1
(R / "data/sib.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
print("뜻 고침", n)
