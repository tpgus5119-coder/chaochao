#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""일상·직무·선배·22기 예문이 기본 뜻으로 쓰였나 — 기계로 셀 수 있는 것만 먼저 거른다 (2026-09-29, 대표님 지시 §14-24).

낱말마다:
  없음   예문에 낱말이 그대로 없다(낱말 경계로)
  맞음   기본 뜻의 한국어 풀이(두 글자 이상 줄기)가 예문 번역에 그대로 있다
  다른뜻 기본 뜻 풀이는 번역에 없고, 다른 뜻의 풀이가 있다 — 어긋남 후보
  모름   풀이가 번역에 안 보임 — 클로드가 읽는다
  조각   (뜻 하나인 낱말) 예문에서 이 낱말을 품은 더 긴 사전 표제어가 있다 — 조각으로만 쓰였나 클로드가 본다
뜻이 하나뿐인 낱말은 '없음'·'조각'만 본다.
쓰기: python3 tools/sense_review/ex_check.py [표.tsv]   → 갈래별 개수, 표에는 '맞음'이 아닌 줄"""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import R, lessons, key  # noqa: E402

PARTS = ["일상", "직무", "선배", "22기"]


def stems(sense):
    """'그들(동물·낮잡아)' → ['그들'], '먹고 싶다' → ['먹고 싶'], '알게 되다, 사귀다' → ['알게 되', '사귀']"""
    s = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", sense)
    out = []
    for p in re.split(r"[,/;·]", s):
        p = p.strip(" ~…").strip()
        if not p:
            continue
        if p.endswith("하다") and len(p) > 2:
            p = p[:-2]
        elif p.endswith("다") and len(p) > 1:
            p = p[:-1]
        if len(p.replace(" ", "")) >= 2 and re.fullmatch(r"[가-힣 ]+", p):
            out.append(p)
    return out


def has_word(vi, ex):
    return re.search(r"(?<![\w])" + re.escape(key(vi)) + r"(?![\w])", key(ex)) is not None


def compounds(vi, ex, DW):
    """예문에서 이 낱말을 품은 더 긴 사전 표제어(thư → thư giãn) — 조각으로만 쓰였을 수 있다"""
    w, s = key(vi).split(), re.sub(r"[^\w\s]", " ", key(ex)).split()
    out = []
    for i in range(len(s) - len(w) + 1):
        if s[i:i + len(w)] != w:
            continue
        for a in range(max(0, i - 3), i + 1):
            for b in range(i + len(w), min(len(s), i + len(w) + 3) + 1):
                if b - a > len(w) and " ".join(s[a:b]) in DW:
                    out.append(" ".join(s[a:b]))
    return out


def main():
    DW = {key(x) for x in json.loads((R / "data/_vi_words.json").read_text(encoding="utf-8"))}
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    sd = json.loads((R / "data/_sdef.json").read_text(encoding="utf-8"))
    rows = []
    for part in PARTS:
        cnt = {}
        for lk, name, ws in lessons(part):
            for w in ws:
                ex = w.get("ex") or {}
                ex = ex if isinstance(ex, dict) else {"vi": ex}
                k = key(w["vi"])
                ss = S.get(k) or []
                d = sd.get(lk, {}).get(k)
                if not has_word(w["vi"], ex.get("vi", "")):
                    st = "없음"
                elif len(ss) < 2 or not d:
                    st = "조각" if compounds(w["vi"], ex.get("vi", ""), DW) else "하나"
                else:
                    tko = (ex.get("ko") or "").replace(" ", "")
                    mine = [x for x in stems(ss[d - 1]) if x.replace(" ", "") in tko]
                    other = [f"{i + 1}){x}" for i, s in enumerate(ss) if i + 1 != d for x in stems(s) if x.replace(" ", "") in tko]
                    st = "맞음" if mine else ("다른뜻" if other else "모름")
                cnt[st] = cnt.get(st, 0) + 1
                if st in ("없음", "다른뜻", "모름", "조각"):
                    memo = ",".join(dict.fromkeys(compounds(w["vi"], ex.get("vi", ""), DW))) if st == "조각" else ""
                    rows.append([part, lk, w["vi"], st, str(d or ""), " | ".join(f"{i + 1}){s}" for i, s in enumerate(ss)), w.get("ko", ""), ex.get("vi", ""), ex.get("ko", ""), memo])
        print(part, cnt)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as f:
            f.write("# 갈래\t수업키\t낱말\t판정\t기본뜻번호\t뜻목록\t수업뜻\t예문\t번역\t품은 말\n")
            f.write("\n".join("\t".join(r) for r in rows) + "\n")
        print("적음", len(rows))


if __name__ == "__main__":
    main()
