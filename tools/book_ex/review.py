#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 예문 바꾸기 3단계(2차) 작업표 — 클로드가 단어마다 읽고 고른다.
한 단어에: 수업 뜻 · 기본 뜻 · 지금 예문 · 교재 문장 후보(Qwen 이 고른 것에 *) · 이미 있는 번역.
판정은 예문판정.tsv 에 적는다(apply_ex.py 가 읽음):
  수업키 \t 낱말 \t 고른 것 \t 베트남어 문장 \t 한국어 번역 \t 기본뜻 \t 메모
  고른 것 = pool id(교재 문장) | new(교재에 알맞은 문장이 없어 새로 씀) | keep(지금 예문이 이미 교재 문장이고 뜻도 맞음)
  베트남어 문장: 교재 문장을 **쪽 이미지로 확인한 글자 그대로**(OCR 오류 고침). 비우면 pool 글 그대로.
  기본뜻: 교재 문맥으로 기본 뜻 번호를 바꿀 때만 숫자.
쓰기: python3 tools/book_ex/review.py 교재 1 13   (갈래 이름은 교재 고정, 몇째 수업부터 몇 개)"""
import json
import pathlib
import re
import sys

D = pathlib.Path(__file__).resolve().parent
R = D.parent.parent
sys.path.insert(0, str(D.parent / "sense_review"))
from common import lessons, key  # noqa: E402


def known_ko():
    """이미 있는 번역: 교재 대화 번역(realbook) + 앱의 모든 예문(뜻이 사람 손을 거친 것)"""
    m = {}
    rb = json.loads((R / "data/realbook.json").read_text(encoding="utf-8"))
    sp = re.compile(r"^[^:]{1,25}:\s*")
    for b in rb["books"]:
        for c in b["chapters"]:
            for dl in c.get("dialogues", []):
                vs = [sp.sub("", x).strip() for x in dl["vi"].split("\n")]
                ks = [sp.sub("", x).strip() for x in dl.get("ko", "").split("\n")]
                if len(vs) == len(ks):
                    for v, k in zip(vs, ks):
                        m.setdefault(v, k)
    g = json.loads((R / "data/gybm.json").read_text(encoding="utf-8"))
    for s in g["sources"]:
        for l in s["lessons"]:
            for w in l["words"]:
                e = w.get("ex")
                if isinstance(e, dict) and e.get("vi") and e.get("ko"):
                    m.setdefault(e["vi"].strip(), e["ko"])
    return m


def main():
    start, n = int(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else 1
    pool = {p["id"]: p for p in json.loads((D / "pool.json").read_text(encoding="utf-8"))}
    cand = json.loads((D / "cand.json").read_text(encoding="utf-8"))
    qw = json.loads((D / "qwen.json").read_text(encoding="utf-8")) if (D / "qwen.json").exists() else {}
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    sdef = json.loads((R / "data/_sdef.json").read_text(encoding="utf-8"))
    kk = known_ko()
    L = lessons("교재")
    for lk, name, words in L[start - 1:start - 1 + n]:
        print(f"=== [교재 {L.index((lk, name, words)) + 1}/{len(L)}] {lk} · {name}")
        for w in words:
            k = key(w["vi"])
            ss = S.get(k) or []
            d = sdef.get(lk, {}).get(k)
            e = w.get("ex") or {}
            print(f"- {w['vi']} | 수업뜻: {w.get('ko', '')}" + (f" | 기본 {d}) {ss[d - 1]}" if d else "")
                  + (f" | 뜻: " + " ".join(f"{i + 1}){s}" for i, s in enumerate(ss)) if len(ss) >= 2 else ""))
            print(f"    지금: {e.get('vi', '')} = {e.get('ko', '')} [{w.get('ex_src', '옮김')}]")
            ids = cand.get(lk, {}).get(w["vi"]) or []
            ok = set(qw.get(f"{lk}|{w['vi']}") or [])
            order = [i for i in range(len(ids)) if i + 1 in ok] + [i for i in range(len(ids)) if i + 1 not in ok]
            for i in order[:10]:
                p = pool[ids[i]]
                t = p["text"]
                ko = kk.get(t)
                print(f"    {'*' if i + 1 in ok else ' '} {ids[i]} p{p['page']} {t}" + (f"  ⇒ {ko}" if ko else ""))


if __name__ == "__main__":
    main()
