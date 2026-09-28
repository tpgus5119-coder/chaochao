#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""판정 적기 도우미 — 클로드가 고른 교재 문장(pool 글 그대로)을 번호로 바꿔 예문판정.tsv 에 덧붙이고, 확인용 줄 이미지를 만든다.
입력(JSON 파일): [[수업키, 낱말, 고른 pool 문장 | "new" | "keep", 최종 베트남어(비우면 pool 글), 한국어 번역, 기본뜻 번호(없으면 ""), 메모], …]
쓰기: python3 tools/book_ex/rec_ex.py 판정.json [줄이미지.png]"""
import json
import pathlib
import subprocess
import sys

D = pathlib.Path(__file__).resolve().parent


def main():
    items = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    pool = json.loads((D / "pool.json").read_text(encoding="utf-8"))
    by = {}
    for p in pool:
        by.setdefault(p["text"], []).append(p)
    lines, ids, bad = [], [], []
    for it in items:
        lk, vi, src, evi, eko = it[:5]
        sense = it[5] if len(it) > 5 else ""
        memo = it[6] if len(it) > 6 else ""
        if src in ("new", "keep"):
            pick = src
        else:
            c = by.get(src)
            if not c:
                bad.append(f"{lk} {vi}: pool 에 없는 문장 — {src}")
                continue
            # 같은 글이 OCR 쪽과 손문장 둘에 있으면 손문장(쪽을 눈으로 확인한 것) — 듣기 대본은 OCR 쪽번호가 틀린 곳이 있다
            pick = next((p for p in c if p["sec"] == "hand"), c[0])["id"]
            ids.append(pick)
        lines.append("\t".join([lk, vi, pick, evi, eko, str(sense), memo]))
    if bad:
        print("\n".join(bad))
        sys.exit(1)
    with open(D / "예문판정.tsv", "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("적음", len(lines), "· 교재 문장", len(ids))
    if len(sys.argv) > 2 and ids:
        subprocess.run([sys.executable, str(D / "strips.py"), sys.argv[2], *dict.fromkeys(ids)], check=True)


if __name__ == "__main__":
    main()
