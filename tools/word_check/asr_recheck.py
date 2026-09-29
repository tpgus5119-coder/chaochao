#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""위스퍼 받아쓰기 결과 다시 판정 (2026-09-29). asr.py 는 글자 비율(0.8)로만 봤다 → 거짓 실패 셋을 걷어 낸다:
 ① 성조 부호 자리만 다른 것(khỏe/khoẻ, hòa/hoà) — 같은 낱말
 ② 숫자를 아라비아 숫자로 받아쓴 것('hai mươi ngàn'→'20 000', 'mười người'→'10 người') — 수로 바꿔 견줌
 ③ 목소리마다 따로 봄 — 둘 다 맞아야 통과
남는 실패는 진짜 다시 들어야 할 것. 결과 data/_asr_recheck.jsonl (k·f·m·f_ok·m_ok·pass2·why).
쓰기: python3 tools/word_check/asr_recheck.py"""
import json, pathlib, re, unicodedata, collections
R = pathlib.Path(__file__).resolve().parent.parent.parent
D = {"không": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9}
M = {"ngàn": 1000, "nghìn": 1000, "triệu": 10**6, "tỷ": 10**9, "tỉ": 10**9}
NUMW = set(D) | set(M) | {"mươi", "mười", "trăm", "lẻ", "linh"}
TONES = {"̀": "2", "́": "1", "̃": "3", "̉": "4", "̣": "5"}


def sylkey(syl):
    """음절 → (성조 뗀 글자, 성조 이름). 부호 자리가 달라도 같은 열쇠."""
    d = unicodedata.normalize("NFD", syl.lower())
    tone = "".join(TONES.get(ch, "") for ch in d)
    bare = unicodedata.normalize("NFC", "".join(ch for ch in d if ch not in TONES))
    return bare + tone


def parse(tokens):
    total, g, d = 0, 0, None
    for w in tokens:
        if w.isdigit(): d = int(w)
        elif w in D: d = D[w]
        elif w in ("lẻ", "linh"): pass
        elif w == "trăm": g += (d if d is not None else 1) * 100; d = None
        elif w == "mươi": g += (d if d is not None else 1) * 10; d = None
        elif w == "mười": g += 10; d = None
        elif w in M:
            g += d if d is not None else 0
            if g == 0 and d is None: g = 1
            total += g * M[w]; g, d = 0, None
        else: return None
    return total + g + (d or 0)


def seq(s):
    """글 → 열쇠 나열. 수 이름·숫자가 이어진 덩이는 정수 하나로, 나머지는 음절 열쇠로."""
    s = re.sub(r"(\d)\s+(?=\d)", r"\1", s.lower())          # '20 000' → '20000'
    toks = [t for t in re.split(r"[\s,.!?;:]+", s) if t]
    out, run = [], []
    def flush():
        if run:
            n = parse(run); out.append(("n", n) if n is not None else ("w", " ".join(sylkey(t) for t in run))); run.clear()
    for t in toks:
        if t.isdigit() or t in NUMW: run.append(t)
        else: flush(); out.append(("w", sylkey(t)))
    flush()
    return out


def main():
    rows = []
    for ln in (R / "data/_asr_word.jsonl").read_text(encoding="utf-8").splitlines():
        try: rows.append(json.loads(ln))
        except Exception: pass
    out = []; cat = collections.Counter()
    for r in rows:
        want = seq(r["k"])
        ok = {}
        for v in ("f", "m"):
            got = seq(r.get(v) or "")
            ok[v] = got == want or r.get(v + "_r", 0) >= 0.8
        p2 = ok["f"] and ok["m"]
        why = "통과" if p2 else ("여자만 실패" if ok["m"] else "남자만 실패" if ok["f"] else "둘 다 실패")
        if p2 and not r.get("pass"): why = "통과(성조 자리·숫자 보정)"
        cat[why] += 1
        out.append(dict(k=r["k"], h=r.get("h"), f=r.get("f"), m=r.get("m"), f_ok=ok["f"], m_ok=ok["m"], pass2=p2, why=why))
    (R / "data/_asr_recheck.jsonl").write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in out) + "\n", encoding="utf-8")
    print(len(out), dict(cat))


if __name__ == "__main__":
    assert seq("khỏe") == seq("khoẻ") and seq("hai mươi ngàn") == seq("20 000") and seq("mười người") == seq("10 người") and seq("tự") != seq("từ")
    main()
