#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""뜻 검토 검사 — 한 수업(챕터)이 **정말 끝났는지** 센다. apply.py 를 돌린 뒤에 쓴다.
검사: ① 모든 낱말에 판정 줄이 있다 ② 뜻이 둘 이상이면 기본 뜻 번호가 목록 안에 있다, 하나뿐이면 '-' ③ 뜻 목록에 영어 낱말이 없다
     ④ 뜻이 둘 이상인 낱말의 동의어·반의어는 모두 1~N 번 뜻에 매여 있다(0·빈칸 없음) ⑤ 짝 낱말이 짝 사전에 있다(뜻을 보일 수 있다)
     ⑥ (알림) 기본 뜻과 수업 뜻이 글자로 하나도 안 겹치면 적어 준다 — 눈으로 다시 본다
쓰기: python3 tools/sense_review/check.py 일상 1 [5]"""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import R, lessons, read_tsv, key  # noqa: E402

VN = set("àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")


def parts(t):
    return {p.strip().lstrip("~") for p in re.split(r"[,;·/]", re.sub(r"\([^)]*\)", " ", t or "")) if p.strip()}


def main():
    part, start = sys.argv[1], int(sys.argv[2])
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    W = json.loads((R / "data/sib.json").read_text(encoding="utf-8"))["w"]
    sdef = json.loads((R / "data/_sdef.json").read_text(encoding="utf-8"))
    vw = json.loads((R / "data/_vi_words.json").read_text(encoding="utf-8"))
    syl = {s for w in (vw if isinstance(vw, list) else vw.keys()) for s in str(w).lower().split()}
    rev = {(r[0], key(r[1])): r[2].strip() for r in read_tsv("기본뜻.tsv")}
    L = lessons(part)
    bad_total = 0
    for i in range(start - 1, min(len(L), start - 1 + n)):
        lk, name, words = L[i]
        probs, notes = [], []
        for w in words:
            k = key(w["vi"])
            ss = S.get(k) or []
            r = rev.get((lk, k))
            if r is None:
                probs.append(f"{w['vi']}: 판정 없음"); continue
            if len(ss) >= 2:
                if not r.isdigit() or not 1 <= int(r) <= len(ss):
                    probs.append(f"{w['vi']}: 기본 뜻 번호 '{r}' (뜻 {len(ss)}개)")
                elif sdef.get(lk, {}).get(k) != int(r):
                    probs.append(f"{w['vi']}: _sdef.json 에 안 들어감 (apply.py?)")
                else:
                    if not (parts(ss[int(r) - 1]) & parts(w.get("ko", ""))):
                        notes.append(f"{w['vi']}: 기본 {r}) {ss[int(r) - 1]} ↔ 수업뜻 {w.get('ko', '')}")
            elif r != "-":
                probs.append(f"{w['vi']}: 뜻이 하나뿐인데 번호 '{r}'")
            for t in ss:
                eng = [x for x in re.findall(r"[A-Za-z]{3,}", t) if x.lower() not in syl and not (set(x.lower()) & VN)]
                if eng:
                    probs.append(f"{w['vi']}: 뜻에 영어? {eng} ← {t}")
            e = W.get(k) or {}
            if len(ss) >= 2:
                m = e.get("m") or {}
                for f in ("s", "a"):
                    for p in e.get(f) or []:
                        if not 1 <= int(m.get(p, 0)) <= len(ss):
                            probs.append(f"{w['vi']}: 짝 {p} 뜻 번호 없음/틀림 ({m.get(p)})")
            for f in ("s", "a"):
                for p in e.get(f) or []:
                    if p not in W and key(p) not in W and key(p) not in S:
                        probs.append(f"{w['vi']}: 짝 {p} 이(가) 짝 사전에 없음")
        bad_total += len(probs)
        print(f"[{part} {i + 1}/{len(L)}] {lk} {name} · {len(words)}낱말 → " + ("통과" if not probs else f"문제 {len(probs)}"))
        for p in probs:
            print("   ✗", p)
        for p in notes:
            print("   ·", p)
    sys.exit(1 if bad_total else 0)


if __name__ == "__main__":
    main()
