#!/usr/bin/env python3
"""동의어·반의어를 뜻별로 나눈 판정표(tools/rel_sense/뜻별_짝.tsv)를 짝 사전(data/sib.json)에 넣는다 (2026-09-28 밤).
w[낱말].m = {짝: 뜻 번호(1부터, 0=목록 밖 뜻)} — 앱의 짝 창이 지금 보는 뜻의 짝을 먼저 보인다.
x(틀린 짝)는 s·a 목록에서 지우고, 상대 낱말 쪽에 거꾸로 걸린 것도 지운다.
tools/build_lex.py 로 sib.json 을 다시 만들면 앱 낱말 4,860개가 빠지므로 이 파일 안에서 고친다.
쓰기: python3 tools/rel_sense/apply.py"""
import json, pathlib

R = pathlib.Path(__file__).resolve().parent.parent.parent


def main():
    tab = {}
    for line in (R / "tools/rel_sense/뜻별_짝.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        p = line.split("\t")
        tab[p[0]] = dict(x.rsplit("=", 1) for x in p[1:] if "=" in x)
    p = R / "data/sib.json"
    doc = json.loads(p.read_text(encoding="utf-8"))
    W = doc["w"]
    drop = set()
    for k, g in tab.items():
        if k not in W:
            continue
        m = {r: int(i) for r, i in g.items() if i != "x"}
        drop |= {(k, r) for r, i in g.items() if i == "x"}
        if m:
            W[k]["m"] = m
    n = 0
    for a, b in drop:
        for x, y in ((a, b), (b, a)):
            if x in W:
                for f in ("s", "a"):
                    if y in (W[x].get(f) or []):
                        W[x][f] = [z for z in W[x][f] if z != y]; n += 1
                        if not W[x][f]:
                            del W[x][f]
                if "m" in W[x] and y in W[x]["m"]:
                    del W[x]["m"][y]
    p.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    print(f"뜻별 짝 {sum(1 for k in tab if k in W)}낱말 · 틀린 짝 지움 {n}곳")


if __name__ == "__main__":
    main()
