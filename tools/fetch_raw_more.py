#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 낱말인데 위키낱말사전 원문을 아직 안 받은 표제어를 받아 data/_dict_gloss.json 에 넣는다 (2026-09-29 밤, 1,603개).
fetch_dict_gloss.py 의 받기 함수를 그대로 쓰고, 뜻은 gloss_all.parse 로 **모든 어원·품사**를 뽑는다.
쓰기: python3 tools/fetch_raw_more.py <낱말 목록 json>"""
import json, pathlib, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
from fetch_dict_gloss import fetch, vi_section  # noqa: E402
from gloss_all import parse, as_defs  # noqa: E402

def main():
    todo = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    p = R / "data/_dict_gloss.json"
    G = json.loads(p.read_text(encoding="utf-8"))
    todo = [w for w in todo if not (G.get(w) or {}).get("raw") and not (G.get(w) or {}).get("missing2")]
    print(f"받을 것 {len(todo)}", flush=True)
    n = ok = miss = 0
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = fetch(batch)
        if not j:
            print("  실패", batch[:3], flush=True); time.sleep(10); continue
        norm = {x["to"]: x["from"] for x in j.get("query", {}).get("normalized", [])}
        for pg in j.get("query", {}).get("pages", []):
            t = norm.get(pg["title"], pg["title"]).lower()
            if pg.get("missing"):
                G[t] = {"pos": [], "defs": [], "han": None, "missing": 1, "missing2": 1}; miss += 1; continue
            txt = ((pg.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("content", ""))
            sec = vi_section(txt)
            ps = parse(sec)
            G[t] = {"pos": list(dict.fromkeys(x["pos"] for x in ps)), "defs": as_defs(ps), "han": None, "raw": sec[:8000]}
            ok += 1
        for b in batch:
            if b not in G: G[b] = {"pos": [], "defs": [], "han": None, "missing": 1, "missing2": 1}; miss += 1
        n += len(batch)
        if n % 200 < 20:
            p.write_text(json.dumps(G, ensure_ascii=False), encoding="utf-8")
            print(f"  {n}/{len(todo)} · 받음 {ok} · 없음 {miss}", flush=True)
        time.sleep(1.2)
    p.write_text(json.dumps(G, ensure_ascii=False), encoding="utf-8")
    print(f"끝 · 받음 {ok} · 없음 {miss}", flush=True)

if __name__ == "__main__":
    main()
