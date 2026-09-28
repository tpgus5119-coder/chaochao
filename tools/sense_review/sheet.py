#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""뜻 검토 작업표 — 한 수업의 낱말마다: 수업 뜻 · 예문 · 지금 뜻 목록 · 동의어/반의어(뜻 번호) · 영어 위키낱말사전 뜻풀이(근거).
쓰기: python3 tools/sense_review/sheet.py 일상 1 [3]   (갈래, 몇째 수업부터, 몇 개)"""
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import R, lessons, key  # noqa: E402


def main():
    part, start = sys.argv[1], int(sys.argv[2])
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    W = json.loads((R / "data/sib.json").read_text(encoding="utf-8"))["w"]
    G = json.loads((R / "data/_dict_gloss.json").read_text(encoding="utf-8"))
    sdef = json.loads((R / "data/_sdef.json").read_text(encoding="utf-8"))
    L = lessons(part)
    for lk, name, words in L[start - 1:start - 1 + n]:
        print(f"=== [{part} {L.index((lk, name, words)) + 1}/{len(L)}] {lk} · {name} · {len(words)}낱말")
        for w in words:
            k = key(w["vi"])
            ex = w.get("ex") or {}
            ex = ex if isinstance(ex, dict) else {"vi": ex}
            print(f"- {w['vi']} | 수업뜻: {w.get('ko', '')} | 예: {ex.get('vi', '')} = {ex.get('ko', '')}")
            ss = S.get(k)
            if ss:
                print("    뜻: " + " ".join(f"{i + 1}){t}" for i, t in enumerate(ss)))
                # 다른 수업에서 이미 정한 기본 뜻 — 같은 낱말을 한결같이 보려고(문맥이 다르면 달라도 된다)
                prev = [f"{x}={v[k]}" for x, v in sdef.items() if k in v and x != lk][:8]
                if prev:
                    print("    앞서: " + " ".join(prev))
            sw = W.get(k) or W.get(w["vi"]) or {}
            m = sw.get("m") or {}
            if sw.get("s") or sw.get("a"):
                print("    짝: " + " ".join([f"s:{x}={m.get(x, '?')}" for x in sw.get("s") or []] + [f"a:{x}={m.get(x, '?')}" for x in sw.get("a") or []]))
            g = G.get(w["vi"]) or G.get(k) or {}
            if g.get("defs"):
                print("    en: " + " / ".join(d[:70] for d in g["defs"][:8]))


if __name__ == "__main__":
    main()
