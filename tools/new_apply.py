#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""검수 끝난 새 낱말을 **앱에 넣는다** → data/order.json

대표님 지시 (2026-09-01): "모든 검수 진행하고 최종 어플에 등록해. 이미지와 tts도 당연히."

## 넣는 방식
새 일상 과정을 **1권부터 다시** 짠다 (docs/일상-목차.md 46꼭지 차례대로).
한 강 15낱말, 한 챕터 7강 — 지금 앱과 같은 결이다.
**옛 낱말은 지우지 않는다.** '예전 낱말' 권으로 뒤에 남긴다 —
이미 외운 사람이 잃는 것이 없어야 한다.

## 무엇만 넣나
최종 검수를 통과한 것만 (fin=ok). 사전에 없거나(none) 아직 못 본 것은 뺀다.
빼는 것이 아깝지만, **틀린 뜻을 외우게 하는 것보다 낫다.**

소리와 그림은 이 파일을 읽는 도구가 알아서 만든다 —
  tools/gen_audio.py (북부 남녀) · tools/gen_south_vtts.py (남부 남녀)
  tools/gen_word_img.py (그림)

쓰기: python3 tools/new_apply.py [--dry]
"""
import argparse, json, pathlib, sys, unicodedata as U

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
from new_words import TOPICS

ORDER = R / "data" / "order.json"
NEW = R / "data" / "_new_words.json"
PER_LESSON, PER_CHAPTER = 15, 7
n = lambda s: U.normalize("NFC", str(s)).strip()


def main():
    a = argparse.ArgumentParser(); a.add_argument("--dry", action="store_true"); a = a.parse_args()
    d = json.loads(NEW.read_text(encoding="utf-8"))
    o = json.loads(ORDER.read_text(encoding="utf-8"))

    # 목차 차례대로 낱말을 늘어놓는다 (꼭지 안의 차례는 모은 차례 그대로)
    seq, skipped = [], {"검수못함": 0, "사전에없음": 0, "꼭지에안맞음": 0}
    for _grp, topic, _c in TOPICS:
        for w in d.get(topic, []):
            if w.get("fit") == "drop":
                skipped["꼭지에안맞음"] += 1; continue
            if w.get("fin") == "none":
                skipped["사전에없음"] += 1; continue
            if w.get("fin") != "ok":
                skipped["검수못함"] += 1; continue
            item = {"vi": n(w["vi"]), "ko": n(w["ko"]),
                    "kr": n(w.get("kr") or ""), "krs": n(w.get("krs") or ""),
                    "topic": topic, "sr": 1, "core": 4}
            if w.get("kr"):
                item["kr_read"] = n(w["kr"])
            seq.append(item)

    # 15낱말씩 한 강, 7강씩 한 챕터
    lessons = [{"words": seq[i:i + PER_LESSON]} for i in range(0, len(seq), PER_LESSON)]
    chapters = [{"lessons": lessons[i:i + PER_CHAPTER]}
                for i in range(0, len(lessons), PER_CHAPTER)]

    old = [v for v in o["vols"] if v.get("kind") == "life"]
    job = [v for v in o["vols"] if v.get("kind") != "life"]
    # 새 과정을 앞에, 예전 낱말을 뒤에
    fresh = [{"kind": "life", "title": "일상 (새 과정)", "chapters": ch}
             for ch in [chapters[i:i + 1][0] for i in range(len(chapters))]]
    # 권 하나에 챕터 일곱씩 묶는다
    vols = [{"kind": "life", "chapters": chapters[i:i + 7]}
            for i in range(0, len(chapters), 7)]
    for i, v in enumerate(old, 1):
        v["title"] = f"예전 낱말 {i}권"
    o["vols"] = vols + old + job

    print(f"넣을 낱말 {len(seq)} · 강 {len(lessons)} · 챕터 {len(chapters)} · 권 {len(vols)}")
    print("뺀 것", skipped)
    if not a.dry:
        ORDER.write_text(json.dumps(o, ensure_ascii=False), encoding="utf-8")
        print("order.json 에 넣었다")


main()
