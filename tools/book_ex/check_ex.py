#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 예문 바꾸기 검사 — 한 과(교재 Bài)가 **정말 끝났는지** 센다. apply_ex.py 뒤에 쓴다.
검사: ① 그 과 모든 단어에 판정 줄 ② 예문에 그 단어가 글자 그대로(띄어쓰기 경계) 있다 ③ 번역이 있고 한글이며 영어 낱말이 없다(사람 이름 빼고)
     ④ 교재 문장(pool id)은 쪽 이미지로 확인한 것(확인.txt 에 id) ⑤ 교재 문장을 고쳐 적었으면 성조·부호만 다르거나 아주 조금 다를 것(크게 다르면 알림)
     ⑥ 소리(북부 여·남)가 있다 ⑦ 한 수업에서 같은 문장을 세 단어 넘게 쓰면 알림
쓰기: python3 tools/book_ex/check_ex.py 1 1   (권, 과)"""
import difflib
import hashlib
import json
import pathlib
import re
import sys
import unicodedata

D = pathlib.Path(__file__).resolve().parent
SPLIT = {"không đâu": "không...đâu", "cầm lên": "cầm...lên", "công ty mời làm việc": "công ty...mời...làm việc"}   # 낱말표엔 붙여 적었지만 교재 문법은 떨어진 틀(không X đâu)
R = D.parent.parent
sys.path.insert(0, str(D.parent / "sense_review"))
sys.path.insert(0, str(D))
from common import lessons, key  # noqa: E402
from apply_ex import rows  # noqa: E402

NAMES = {"david", "vân", "kate", "brian", "eun", "ji", "hiroki", "tom", "mai", "lan", "mary", "john", "sam", "jenny", "lee", "min", "toàn", "reiko",
         "linda", "james", "hoàng", "nam", "sơn", "grab", "watanabe", "taro", "lê", "văn", "fahasa", "saigon", "square", "la", "vie", "hola", "ok", "wifi", "internet", "email", "atm", "km", "kg", "tv", "tivi", "it", "spa", "ktx"}


def bare(t):
    t = unicodedata.normalize("NFD", t.lower().replace("đ", "d"))
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def main():
    vol, bai = int(sys.argv[1]), int(sys.argv[2])
    rb = json.loads((R / "data/realbook.json").read_text(encoding="utf-8"))
    title = [c["title"] for b in rb["books"] if b["vol"] == vol for c in b["chapters"] if c["bai"] == bai][0]
    pool = {p["id"]: p for p in json.loads((D / "pool.json").read_text(encoding="utf-8"))}
    seen_ok = set((D / "확인.txt").read_text(encoding="utf-8").split()) if (D / "확인.txt").exists() else set()
    rv = {(r["lk"], key(r["vi"])): r for r in rows()}
    g = json.loads((R / "data/gybm.json").read_text(encoding="utf-8"))
    main_src = [s for s in g["sources"] if s["key"] == "main"][0]
    idx = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8"))
    probs, notes, cnt = [], [], {"main_book": 0, "claude_new": 0, "kept": 0}
    for lk, name, words in lessons("교재"):
        if name.split(" · ")[0] != title:
            continue
        li = int(lk.replace("B:main", ""))
        gw = {key(w["vi"]): w for w in main_src["lessons"][li]["words"]}
        used = {}
        for w in words:
            k = key(w["vi"])
            r = rv.get((lk, k))
            x = gw.get(k) or {}
            ex = x.get("ex") or {}
            evi, eko = ex.get("vi", ""), ex.get("ko", "")
            if not r:
                probs.append(f"{lk} {w['vi']}: 판정 없음"); continue
            if r["pick"] == "keep":
                if x.get("ex_chk") != "kept":
                    probs.append(f"{lk} {w['vi']}: 앱에 안 들어감(그대로 둠 표시 없음) — apply_ex.py?"); continue
                cnt["kept"] += 1
            elif x.get("ex_src") not in ("main_book", "claude_new"):
                probs.append(f"{lk} {w['vi']}: 앱에 안 들어감(ex_src={x.get('ex_src')}) — apply_ex.py?"); continue
            else:
                cnt[x["ex_src"]] += 1
            # 틀 낱말(từ...đến)은 조각들이 차례대로 들어 있으면 된다.
            # 낱말표에 줄임표 없이 적혔지만 교재가 떨어진 틀로 가르치는 것(2권 3과 문법 'KHÔNG X ĐÂU!')은 여기 적는다
            k = SPLIT.get(k, k)
            pat = r"(?<![\wÀ-ỹ])" + r"(?![\wÀ-ỹ]).+?(?<![\wÀ-ỹ])".join(re.escape(x.strip()) for x in re.split(r"\.\.\.|…", k)) + r"(?![\wÀ-ỹ])"
            if not re.search(pat, " ".join(evi.lower().split())):
                probs.append(f"{lk} {w['vi']}: 예문에 단어가 없음 — {evi}")
            if not re.search(r"[가-힣]", eko):
                probs.append(f"{lk} {w['vi']}: 번역 없음/한글 아님 — {eko}")
            eng = [t for t in re.findall(r"[A-Za-z]{2,}", eko) if t.lower() not in NAMES and bare(t) not in {bare(n) for n in NAMES}]
            if eng:
                notes.append(f"{lk} {w['vi']}: 번역 속 로마자 {eng} — {eko}")
            if r["pick"] not in ("new", "keep"):
                if r["pick"] not in seen_ok:
                    probs.append(f"{lk} {w['vi']}: 교재 문장 {r['pick']} 을 쪽 이미지로 확인 안 함")
                pt = pool[r["pick"]]["text"]
                if evi != pt:
                    ratio = difflib.SequenceMatcher(None, bare(evi), bare(pt)).ratio()
                    if ratio < 0.9:
                        notes.append(f"{lk} {w['vi']}: 교재 글과 많이 다름({ratio:.2f}) — 교재 '{pt}' → '{evi}'")
            h = hashlib.sha1(evi.encode()).hexdigest()[:12]
            if idx.get(evi) != h or not all((R / f"audio/{v}/n/{h}.mp3").exists() for v in ("f", "m")):
                probs.append(f"{lk} {w['vi']}: 소리 없음 — {evi}")
            used.setdefault(evi, []).append(w["vi"])
        for t, ws in used.items():
            if len(ws) > 3:
                notes.append(f"{lk}: 같은 문장을 {len(ws)}단어가 씀 {ws} — {t}")
    print(f"[{vol}권 {bai}과 {title}] 교재 문장 {cnt['main_book']} · 새로 씀 {cnt['claude_new']} · 있던 예문 둠 {cnt['kept']} → " + ("통과" if not probs else f"문제 {len(probs)}"))
    for p in probs:
        print("   ✗", p)
    for p in notes:
        print("   ·", p)
    sys.exit(1 if probs else 0)


if __name__ == "__main__":
    main()
