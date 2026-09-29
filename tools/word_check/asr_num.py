#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""위스퍼 받아쓰기 결과의 **숫자 거짓 실패** 바로잡기 (2026-09-29).
위스퍼는 'hai mươi ngàn'을 '20 000', 'một triệu'를 '1 triệu'처럼 받아쓴다 → 글자 비교(0.11)로는 실패.
낱말도 받아쓴 글도 **수로 바꿔** 맞대 본다. 목소리마다 (글자 비율 ≥ 0.8) 또는 (수가 같음) 이면 통과.
쓰기: python3 tools/word_check/asr_num.py   → data/_asr_num.jsonl (숫자 낱말만, pass_num 포함) · 남은 실패는 귀로 확인할 것"""
import json, pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent.parent
D = {"không": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9}
M = {"ngàn": 1000, "nghìn": 1000, "triệu": 10**6, "tỷ": 10**9, "tỉ": 10**9}


def parse(tokens):
    """수 이름·숫자 토큰 → 정수. 수가 아닌 토큰이 섞이면 None."""
    total, g, d = 0, 0, None            # total: 확정된 큰 자리 · g: 지금 묶음 · d: 아직 자리를 못 받은 낱개 수
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


def vi_num(s): return parse(s.lower().split())


def main():
    src = R / "data/_asr_word.jsonl"; out = []; fixed = still = 0
    for ln in src.read_text(encoding="utf-8").splitlines():
        try: r = json.loads(ln)
        except Exception: continue
        n = vi_num(r["k"])
        if n is None: continue
        ok = {}
        for v in ("f", "m"):
            tx = (r.get(v) or "").lower()
            got = parse(re.sub(r"(\d)\s+(?=\d)", r"\1", tx).split())   # '20 000' → '20000' 붙이고 판다
            ok[v] = (r.get(v + "_r", 0) >= 0.8) or (got is not None and got == n)
        r2 = dict(r, num=n, f_ok=ok["f"], m_ok=ok["m"], pass_num=ok["f"] and ok["m"])
        out.append(r2)
        if not r.get("pass") and r2["pass_num"]: fixed += 1
        elif not r2["pass_num"]: still += 1
    (R / "data/_asr_num.jsonl").write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in out) + "\n", encoding="utf-8")
    print(f"숫자 낱말 {len(out)}개 · 수로 맞춰 보니 새로 통과 {fixed}개 · 여전히 실패 {still}개 (귀로 확인할 것)")
    for x in out:
        if not x["pass_num"]: print("  아직:", x["k"], "→ 여", x["f"], "· 남", x["m"], "· 기대", x["num"])


if __name__ == "__main__":
    for s, want in (("hai mươi ngàn", 20000), ("một trăm lẻ một", 101), ("mười lăm", 15), ("hai mươi mốt", 21), ("một ngàn không trăm lẻ hai", 1002),
                    ("ba triệu", 3000000), ("một triệu chín trăm ngàn", 1900000), ("một trăm hai mươi", 120), ("một triệu một trăm hai mươi sáu ngàn", 1126000), ("1 triệu 126 ngàn", 1126000)):
        assert vi_num(s) == want, (s, vi_num(s))
    main()
