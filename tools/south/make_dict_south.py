#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""참고 사전 낱말 가운데 위키낱말사전이 모든 뜻에 남부 표시를 단 것을 뽑아 tools/south/참고사전_남부.tsv 로 (2026-09-29 밤).
북부(northern) 표시가 섞인 뜻·중부만인 뜻은 안 뽑는다. 쓰기: python3 tools/south/make_dict_south.py && python3 tools/south/build.py"""
import json, pathlib, re, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from gloss_all import parse, is_exc  # noqa: E402
SO = re.compile(r"southern vietnam|southern vietnamese|south central|mekong|saigon|ho chi minh", re.I)
NO = re.compile(r"northern", re.I)

def main():
    G = json.loads((R / "data/_dict_gloss.json").read_text(encoding="utf-8"))
    DK = json.loads((R / "data/_dict_ko.json").read_text(encoding="utf-8"))
    cur = set(l.split("\t")[0].lower() for l in (R / "tools/south/남부.tsv").read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#"))
    rows = []
    for k in DK:
        if k in cur: continue
        g = G.get(k)
        if not g or not g.get("raw"): continue
        ps = [p for p in parse(g["raw"]) if not is_exc(p["lab"])]
        if ps and all(SO.search(p["lab"]) and not NO.search(p["lab"]) for p in ps):
            n = ""
            for p in ps:
                m = re.match(r"=\s*([^()]+?)(?:\s*\(|$)", p["t"])
                if m: n = m.group(1).strip(); break
            rows.append((k, n, " ‖ ".join(dict.fromkeys(re.sub(r"\s+", " ", p["lab"]) for p in ps))))
    rows.sort()
    out = R / "tools/south/참고사전_남부.tsv"
    with out.open("w", encoding="utf-8") as f:
        f.write("# 참고 사전(앱 수업에는 없는 낱말) 가운데 영어 위키낱말사전이 **모든 뜻**에 남부(southern Vietnam·South Central·Mekong) 표시를 단 낱말 — tools/south/make_dict_south.py 가 뽑음 (2026-09-29 밤). 북부·중부만 표시된 것은 뺐다.\n# 칸: 낱말 ⇥ 북부 말(위키가 '= 낱말' 로 적어 준 것만) ⇥ 어느 뜻일 때(빈칸=전부) ⇥ 근거(위키 표시)\n")
        for k, n, lab in rows: f.write(f"{k}\t{n}\t\t위키 {lab}\n")
    print(f"참고 사전 남부 낱말 {len(rows)} · 북부 말 있는 것 {sum(1 for r in rows if r[1])}")

if __name__ == "__main__":
    main()
