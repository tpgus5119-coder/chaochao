#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 예문 바꾸기 3단계(1차) — Qwen 이 후보 문장 가운데 **그 단어가 이 수업의 뜻으로, 한 낱말로** 쓰인 것을 고른다.
근거로 주는 것: 수업에 적힌 뜻 · 기본 뜻 · 뜻 목록 전부(다른 뜻과 헷갈리지 않게).
이것은 힌트일 뿐 — 최종 판정은 클로드가 문장을 하나씩 읽고 한다(review.py).
결과: qwen.json {"수업키|낱말": [고른 후보 번호(1부터)]} — 이미 한 것은 건너뛴다(중간에 멈춰도 이어 감).
쓰기: python3 tools/book_ex/qwen_pass.py"""
import json
import pathlib
import sys

D = pathlib.Path(__file__).resolve().parent
R = D.parent.parent
sys.path.insert(0, str(D.parent))
sys.path.insert(0, str(D.parent / "sense_review"))
from ai import ask_json  # noqa: E402
from common import lessons, key  # noqa: E402


def main():
    pool = {p["id"]: p for p in json.loads((D / "pool.json").read_text(encoding="utf-8"))}
    cand = json.loads((D / "cand.json").read_text(encoding="utf-8"))
    S = json.loads((R / "data/_senses.json").read_text(encoding="utf-8"))
    sdef = json.loads((R / "data/_sdef.json").read_text(encoding="utf-8"))
    outp = D / "qwen.json"
    done = json.loads(outp.read_text(encoding="utf-8")) if outp.exists() else {}
    n = 0
    for lk, _, words in lessons("교재"):
        for w in words:
            ids = cand.get(lk, {}).get(w["vi"]) or []
            k = f"{lk}|{w['vi']}"
            if not ids or k in done:
                continue
            ss = S.get(key(w["vi"])) or []
            d = sdef.get(lk, {}).get(key(w["vi"]))
            base = ss[d - 1] if d and ss else w.get("ko", "")
            lines = "\n".join(f"{i + 1}. {pool[x]['text']}" for i, x in enumerate(ids))
            others = (" 이 단어의 뜻 목록: " + " / ".join(f"{i + 1}) {s}" for i, s in enumerate(ss)) + ".") if len(ss) >= 2 else ""
            prompt = (f"베트남어 단어 '{w['vi']}'. 교재에 적힌 뜻: {w.get('ko', '')}. 이번에 가르칠 뜻: {base}.{others}\n"
                      f"아래 베트남어 문장들 가운데 '{w['vi']}' 가 **'{base}' 뜻으로, 하나의 단어로** 쓰인 문장 번호를 모두 고르세요.\n"
                      f"더 긴 다른 단어의 일부로 쓰인 경우(예: 'từ từ' 속의 từ, 'chia tay' 속의 chia, 'Tây Ban Nha' 속의 Tây)나 다른 뜻으로 쓰인 경우는 빼세요.\n"
                      f"{lines}\n"
                      '답은 JSON 하나만: {"ok": [번호, ...]}')
            r = ask_json(prompt, local=True, max_tokens=200)
            ok = r.get("ok") if isinstance(r, dict) else None
            done[k] = [int(x) for x in ok if str(x).isdigit() and 1 <= int(x) <= len(ids)] if isinstance(ok, list) else None
            n += 1
            if n % 20 == 0:
                outp.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8")
                print(n, lk, flush=True)
    outp.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8")
    print("끝", n, "· 전체", len(done), flush=True)


if __name__ == "__main__":
    main()
