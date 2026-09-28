#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""뜻 검토 판정을 앱 자료에 넣는다 (2026-09-28 대표님 지시).

판정표 (클로드가 수업마다 낱말 하나씩 읽고 적는다 — 근거: 수업 뜻·예문·영어 위키낱말사전 뜻풀이·한국어기초사전 대역)
  뜻목록.tsv  낱말 \t 뜻1 | 뜻2 | …        — data/_senses.json 의 그 낱말을 이 목록으로(흔히 쓰는 차례). '-' 는 뜻이 하나뿐(목록 지움)
  기본뜻.tsv  수업키 \t 낱말 \t 번호|-     — 그 수업에서의 기본 뜻(출처의 문맥·출처에 적힌 뜻). '-' 는 뜻이 하나뿐. 검토한 낱말은 모두 한 줄씩
  짝.tsv      낱말 \t 짝=번호 …           — 동의어·반의어가 몇째 뜻의 짝인지. 짝=x 는 틀린 짝(양쪽에서 지움),
                                           +s:짝=번호 / +a:짝=번호 는 동의어/반의어를 새로 붙임
결과
  data/_senses.json · data/sib.json(w[낱말].m·s·a) · data/_sdef.json {수업키: {낱말: 번호}}
  선배·22기 수업은 판정이 따로 없으면 **교재(main)에서 정한 기본 뜻**을 따른다(대표님 지시: 앞뒤 문맥이 없는 자료).
쓰기: python3 tools/sense_review/apply.py"""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import R, lessons, read_tsv, key  # noqa: E402


def main():
    sp = R / "data/_senses.json"
    S = json.loads(sp.read_text(encoding="utf-8"))
    ns = 0
    for row in read_tsv("뜻목록.tsv"):
        k = key(row[0])
        if row[1].strip() == "-":
            if S.pop(k, None) is not None:
                ns += 1
            continue
        S[k] = [t.strip() for t in row[1].split("|") if t.strip()]
        ns += 1
    sp.write_text(json.dumps(S, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    wp = R / "data/sib.json"
    doc = json.loads(wp.read_text(encoding="utf-8"))
    W = doc["w"]
    nm = nx = na = 0
    drop = []
    for row in read_tsv("짝.tsv"):
        k = key(row[0])
        if k not in W:
            W[k] = {"k": (S.get(k) or [""])[0]}
        e = W[k]
        for tok in row[1:]:
            tok = tok.strip()
            if not tok or "=" not in tok:
                continue
            left, idx = tok.rsplit("=", 1)
            if left.startswith(("+s:", "+a:")):
                f, p = left[1], left[3:]
                e.setdefault(f, [])
                if p not in e[f]:
                    e[f].append(p); na += 1
                e.setdefault("m", {})[p] = int(idx)
                continue
            p = left
            if idx == "x":
                drop.append((k, p)); continue
            e.setdefault("m", {})[p] = int(idx); nm += 1
    for a, b in drop:
        for x, y in ((a, b), (b, a)):
            if x in W:
                for f in ("s", "a"):
                    if y in (W[x].get(f) or []):
                        W[x][f] = [z for z in W[x][f] if z != y]; nx += 1
                        if not W[x][f]:
                            del W[x][f]
                if y in (W[x].get("m") or {}):
                    del W[x]["m"][y]
    wp.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    sdef, main_def = {}, {}
    for row in read_tsv("기본뜻.tsv"):
        lk, k, idx = row[0], key(row[1]), row[2].strip()
        if idx.isdigit():
            sdef.setdefault(lk, {})[k] = int(idx)
            if lk.startswith("B:main") and k not in main_def:
                main_def[k] = int(idx)
    auto = 0
    for part in ("선배", "22기"):
        for lk, _, words in lessons(part):
            for w in words:
                k = key(w["vi"])
                if len(S.get(k) or []) >= 2 and k in main_def and k not in sdef.get(lk, {}):
                    sdef.setdefault(lk, {})[k] = main_def[k]; auto += 1
    (R / "data/_sdef.json").write_text(json.dumps(sdef, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"뜻 목록 고침 {ns} · 짝 뜻 번호 {nm} · 짝 지움 {nx} · 짝 새로 {na} · 기본 뜻 {sum(len(v) for v in sdef.values())}(교재 따름 {auto}) · 수업 {len(sdef)}")


if __name__ == "__main__":
    main()
