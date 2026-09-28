#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 예문 바꾸기 2단계 — 교재 단어마다 그 단어가 **글자 그대로(띄어쓰기 경계)** 들어간 교재 문장 후보를 찾는다.
차례: 같은 과 → 같은 권 다른 과 → 다른 권. 같은 무리 안에서는 5~15음절 문장을 앞에.
결과: cand.json {수업키: {낱말: [pool id, …]}} (최대 12개)
쓰기: python3 tools/book_ex/cand.py"""
import json
import pathlib
import re
import sys

D = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(D.parent / "sense_review"))
from common import lessons, key  # noqa: E402

BOOK = {}   # 과 제목 → (권, 과)


def bai_of_lessons():
    rb = json.loads((D.parent.parent / "data/realbook.json").read_text(encoding="utf-8"))
    for b in rb["books"]:
        for c in b["chapters"]:
            BOOK[c["title"]] = (b["vol"], c["bai"])


def bare(t):
    """성조·모음 부호를 뗀 글자(đ→d) — OCR 이 성조를 잘못 읽은 문장도 찾으려고(같은 과 안에서만, 고른 뒤 쪽 이미지로 바로잡음)"""
    import unicodedata as u
    t = u.normalize("NFD", t.lower().replace("đ", "d"))
    return "".join(c for c in t if u.category(c) != "Mn")


def pat(vi):
    return re.compile(r"(?<![\wÀ-ỹ])" + re.escape(key(vi)) + r"(?![\wÀ-ỹ])")


def main():
    bai_of_lessons()
    pool = json.loads((D / "pool.json").read_text(encoding="utf-8"))
    low = [(p, " ".join(p["text"].lower().split())) for p in pool]
    out, stat = {}, [0, 0]
    fuzzy_n = [0]
    for lk, name, words in lessons("교재"):
        vol, bai = BOOK[name.split(" · ")[0]]
        out[lk] = {}
        for w in words:
            rx = pat(w["vi"])
            hits = [p for p, t in low if rx.search(t)]
            seen, uniq = set(), []
            for p in hits:
                if p["text"] not in seen:
                    seen.add(p["text"]); uniq.append(p)

            def rank(p):
                n = len(p["text"].split())
                return (0 if (p["vol"], p["bai"]) == (vol, bai) else 1 if p["vol"] == vol else 2,
                        0 if 5 <= n <= 15 else 1, abs(n - 9))
            if not uniq:
                rb = re.compile(r"(?<![a-z])" + re.escape(bare(key(w["vi"]))) + r"(?![a-z])")
                uniq = [p for p, t in low if (p["vol"], p["bai"]) == (vol, bai) and rb.search(bare(t))]
                fuzzy_n[0] += bool(uniq)
            uniq.sort(key=rank)
            out[lk][w["vi"]] = [p["id"] for p in uniq[:12]]
            stat[0 if uniq else 1] += 1
    (D / "cand.json").write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    print("후보 있음", stat[0], "(성조 뗀 비교로 찾은 것", fuzzy_n[0], ") · 없음", stat[1])


if __name__ == "__main__":
    main()
