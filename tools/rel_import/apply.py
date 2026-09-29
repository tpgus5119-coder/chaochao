#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""위키낱말사전(영어·베트남어)에 **표시된** 유의어·반의어(tools/rel_import/pairs.tsv, tools/rel_parse.py)를 data/sib.json 에 넣는다 (2026-09-29).
대표님: "인터넷 대형 사전에 유의어(동의어)와 반의어가 표시된다면 일차적으로는 그것을 그대로 카피해서 반영".
규칙
  · 양쪽으로 넣는다(A 의 유의어가 B 면 B 의 유의어도 A). 이미 있는 짝은 그대로, 새 짝은 뒤에 붙인다.
  · 사람이 이미 '틀린 짝'으로 판정한 것(data/_sib_badrel.json · tools/rel_sense/뜻별_짝.tsv 의 x)은 다시 넣지 않는다.
  · 뜻이 둘 이상인 낱말(data/_senses.json)은 짝이 어느 뜻의 짝인지(m) 있어야 앱이 뜻별로 보여 준다 —
    tools/rel_import/뜻판정.tsv (낱말 ⇥ 짝=뜻 번호 …, 0 = 목록 밖 뜻, x = 넣지 않음). 클로드가 낱말마다 읽고 판정.
    그 낱말에 m 이 이미 있거나 판정이 하나라도 있으면, 판정 없는 새 짝은 넣지 않는다(넣어도 화면에서 숨는다) → 판정 대기로 센다.
  · x 는 적은 쪽(낱말 밑의 그 짝)에만 — 양쪽 다 x 면 쌍을 뺀다. 뜻판정.tsv 의 x 는 뜻이 하나인 낱말의 짝에도 쓴다(영어 위키 둘째 뜻 이후의 짝을 읽어 보고 뺀 것).
  · 한국어 뜻이 없는 낱말은 넣지 않는다(화면에 영어 뜻 금지) — tools/rel_import/뜻_새로.tsv (낱말 ⇥ 한국어 뜻)로 채운 것만.
  · 유의어이면서 반의어로 적힌 쌍은 tools/rel_import/갈래.tsv (낱말 ⇥ 짝 ⇥ s|a|x)로 정한 것만.
tools/build_lex.py 로 sib.json 을 다시 만들면 앱 낱말 4,860개가 빠지므로 이 파일 안에서 고친다.
쓰기: python3 tools/rel_import/apply.py [--dry]"""
import collections, json, pathlib, sys

R = pathlib.Path(__file__).resolve().parent.parent.parent
D = R / "tools/rel_import"


def tsv(p):
    if not p.exists():
        return []
    return [l.rstrip("\n").split("\t") for l in p.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]


def load():
    doc = json.loads((R / "data/sib.json").read_text(encoding="utf-8"))
    SEN = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    dk = json.loads((R / "data/_dict_ko.json").read_text(encoding="utf-8"))
    sk = json.loads((R / "data/_sib_ko.json").read_text(encoding="utf-8"))
    mine = {r[0]: r[1] for r in tsv(D / "뜻_새로.tsv") if len(r) > 1 and r[1].strip()}
    bad = {frozenset(p) for p in json.loads((R / "data/_sib_badrel.json").read_text(encoding="utf-8"))}
    for r in tsv(R / "tools/rel_sense/뜻별_짝.tsv"):
        bad |= {frozenset((r[0], x[:-2])) for x in r[1:] if x.endswith("=x")}
    judge = {}
    for r in tsv(D / "뜻판정.tsv"):
        for x in r[1:]:
            if "=" in x:
                y, v = x.rsplit("=", 1)
                judge[(r[0], y)] = v
    kind_fix = {frozenset((r[0], r[1])): r[2] for r in tsv(D / "갈래.tsv") if len(r) > 2}
    pairs = collections.defaultdict(lambda: {"s": [], "a": []})
    for r in tsv(D / "pairs.tsv")[1:]:
        w, p, k = r[0], r[1], r[2]
        pairs[tuple(sorted((w, p)))][k].append(r)
    return doc, SEN, dk, sk, mine, bad, judge, kind_fix, pairs


def main():
    dry = "--dry" in sys.argv
    doc, SEN, dk, sk, mine, bad, judge, kind_fix, pairs = load()
    W = doc["w"]
    sk = {k: v for k, v in sk.items() if v.strip() != "!"}   # _sib_ko 의 '!' = 낱말 아님(오타) 표시
    kof = lambda x: (W.get(x) or {}).get("k") or mine.get(x) or sk.get(x) or dk.get(x)
    multi = lambda x: len(SEN.get(x) or []) >= 2
    judged_words = {x for x, _ in judge}
    st = collections.Counter()
    wait = collections.defaultdict(list)
    for (a, b), v in sorted(pairs.items()):
        kinds = [k for k in "sa" if v[k]]
        if len(kinds) == 2:
            k = kind_fix.get(frozenset((a, b)))
            if k not in ("s", "a"):
                st["갈래 겹침(뺌)" if k == "x" else "갈래 겹침(대기)"] += 1
                continue
        else:
            k = kinds[0]
        if frozenset((a, b)) in bad:
            st["이미 틀린 짝으로 판정"] += 1
            continue
        if judge.get((a, b)) == "x" and judge.get((b, a)) == "x":
            st["읽고 뺌(x, 양쪽)"] += 1
            continue
        if not kof(a) or not kof(b):
            st["한국어 뜻 없음(대기)"] += 1
            continue
        ok = True
        for x, y in ((a, b), (b, a)):
            if judge.get((x, y)) == "x":
                continue
            if multi(x) and ((W.get(x) or {}).get("m") or x in judged_words) and (x, y) not in judge:
                if y not in ((W.get(x) or {}).get(k) or []):
                    ok = False
                    wait[x].append(y)
        if not ok:
            st["뜻 판정 대기"] += 1
            continue
        new = False
        for x, y in ((a, b), (b, a)):
            if judge.get((x, y)) == "x":                # x 는 그 쪽에만 — 짝의 한국어 뜻에 이 뜻이 안 보이면 이 낱말 밑에만 안 보인다
                st["한쪽만 뺌(x)"] += 1
                continue
            if x not in W:
                W[x] = {"k": kof(x)}
                st["새 낱말 항목"] += 1
            g = W[x]
            other = "a" if k == "s" else "s"
            if y in (g.get(other) or []):          # 반대 갈래에 이미 있으면 사람이 넣은 쪽을 믿는다
                continue
            if y not in (g.get(k) or []):
                g.setdefault(k, []).append(y)
                new = True
            j = judge.get((x, y))
            if multi(x) and j not in (None, "x"):
                g.setdefault("m", {})[y] = int(j)
        st["넣음(새 짝)" if new else "이미 있음"] += 1
    print(dict(st))
    print("판정 대기 낱말", len(wait), dict(list(wait.items())[:20]) if wait else "")
    if not dry:
        (R / "data/sib.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
