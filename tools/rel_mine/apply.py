#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""클로드가 낱말마다 지은 유의어·반의어(tools/rel_mine/짝.tsv)를 data/sib.json 에 넣는다 (2026-09-29).
대표님: "사전에 표시가 안 되어 있다면 니가 이제 작업해야 하는 것" · "단어 하나하나 일일이".
줄: 낱말 ⇥ s=짝,짝@뜻번호,… ⇥ a=… — 같은 낱말이 여러 줄이면 짝은 합치고, 뜻 번호는 **뒤 줄이 이긴다**.
규칙
  · 짝은 한국어 뜻이 있는 낱말만(sib.json k · _sib_ko · _dict_ko · rel_import/뜻_새로.tsv · rel_mine/뜻_새로.tsv). 없으면 '뜻 없음'으로 세고 넣지 않는다.
  · 낱말 → 짝 방향은 늘 넣는다. 짝 → 낱말(거꾸로)은 짝의 뜻이 하나일 때만 넣는다 — 뜻이 여럿인 짝은 어느 뜻의 짝인지 판정이 있어야 화면에 보인다.
  · @n 은 data/_senses.json 차례(1부터), 0 = 목록 밖 뜻. 낱말의 뜻이 여럿인데 @ 가 없으면 뜻 1 로 본다.
  · 이미 반대 갈래(유의↔반의)에 있는 짝은 사람이 앞서 넣은 쪽을 믿고 건드리지 않는다.
쓰기: python3 tools/rel_mine/apply.py [--dry]"""
import collections, json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent


def main():
    dry = "--dry" in sys.argv
    doc = json.loads((R / "data/sib.json").read_text(encoding="utf-8"))
    W = doc["w"]
    SEN = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    dk = json.loads((R / "data/_dict_ko.json").read_text(encoding="utf-8"))
    sk = {k: v for k, v in json.loads((R / "data/_sib_ko.json").read_text(encoding="utf-8")).items() if v.strip() != "!"}
    mine = {}
    for p in (R / "tools/rel_import/뜻_새로.tsv", R / "tools/rel_mine/뜻_새로.tsv"):
        if p.exists():
            for ln in p.read_text(encoding="utf-8").splitlines():
                if ln.strip() and not ln.startswith("#") and "\t" in ln:
                    a, b = ln.split("\t")[:2]
                    if b.strip(): mine[a.strip().lower()] = b.strip()
    kof = lambda x: (W.get(x) or {}).get("k") or sk.get(x) or dk.get(x) or mine.get(x)
    multi = lambda x: len(SEN.get(x) or []) >= 2
    tab = collections.OrderedDict()          # 낱말 → {"s": {짝: 뜻번호|None}, "a": {...}}
    for ln in (R / "tools/rel_mine/짝.tsv").read_text(encoding="utf-8").splitlines():
        if not ln.strip() or ln.startswith("#"): continue
        parts = ln.rstrip("\n").split("\t")
        w = parts[0].strip().lower()
        g = tab.setdefault(w, {"s": {}, "a": {}})
        for cell in parts[1:]:
            cell = cell.strip()
            if not cell or "=" not in cell: continue
            kind, items = cell.split("=", 1)
            if kind not in ("s", "a"): continue
            for it in items.split(","):
                it = it.strip().lower()
                if not it: continue
                n = None
                if "@" in it:
                    it, n = it.rsplit("@", 1); n = int(n)
                g[kind][it] = n
    st = collections.Counter(); nomean = []
    for w, g in tab.items():
        if not kof(w):
            st["낱말 자체에 뜻 없음"] += 1; nomean.append(w); continue
        if w not in W:
            W[w] = {"k": kof(w)}; st["새 낱말 항목"] += 1
        for kind in ("s", "a"):
            other = "a" if kind == "s" else "s"
            for y, n in g[kind].items():
                if not kof(y):
                    st["짝 뜻 없음(안 넣음)"] += 1; nomean.append(y); continue
                if y == w: continue
                if y in (W[w].get(other) or []):
                    st["반대 갈래에 이미 있음(건드리지 않음)"] += 1; continue
                if y not in (W[w].get(kind) or []):
                    W[w].setdefault(kind, []).append(y); st["넣음"] += 1
                else:
                    st["이미 있음"] += 1
                if multi(w):
                    W[w].setdefault("m", {})[y] = 1 if n is None else n
                # 거꾸로: 짝의 뜻이 하나일 때만
                if not multi(y):
                    if y not in W: W[y] = {"k": kof(y)}; st["새 낱말 항목"] += 1
                    if w not in (W[y].get(other) or []) and w not in (W[y].get(kind) or []):
                        W[y].setdefault(kind, []).append(w); st["거꾸로 넣음"] += 1
    print(dict(st))
    if nomean: print("뜻 없는 것(안 넣음)", len(set(nomean)), sorted(set(nomean))[:40])
    if not dry:
        (R / "data/sib.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
