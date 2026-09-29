#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""자료에 박혀 있는 한글 발음(kr_read·kr)을 vi_kr 로 다시 만들어 고친다 (2026-09-29).
낱말 검사 1343(xe Grab → '쌔')·1359(Sydney → '씨')에서 외래어 이름이 잘려 나온 것을 발견 →
vi_kr.FOREIGN 에 나라·도시 이름을 더한 뒤, 그 낱말이 들어간 항목만 골라 다시 만든다.
쓰기: python3 tools/word_check/fix_kr.py <낱말> [<낱말> …]   (--dry 로 미리 보기)"""
import json, pathlib, re, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from vi_kr import word as vk

FILES = ["data/gybm.json", "data/realbook.json", "data/order.json", "data/days.json"]


def main():
    dry = "--dry" in sys.argv
    targets = [a.lower() for a in sys.argv[1:] if not a.startswith("--")]
    pat = re.compile(r"\b(" + "|".join(re.escape(t) for t in targets) + r")\b", re.I)
    for f in FILES:
        p = R / f
        if not p.exists(): continue
        doc = json.loads(p.read_text(encoding="utf-8")); n = 0
        def walk(o):
            nonlocal n
            if isinstance(o, dict):
                vi = o.get("vi")
                if isinstance(vi, str) and pat.search(vi):
                    for key in ("kr_read", "kr"):
                        if key in o and isinstance(o[key], str):
                            new = vk(vi)
                            if new != o[key]:
                                print(f"  {f} {vi!r}: {o[key]!r} → {new!r}"); n += 1
                                if not dry: o[key] = new
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(doc)
        print(f"{f}: 고침 {n}")
        if n and not dry:
            p.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
