#!/usr/bin/env python3
"""선배 단어 자료의 오타·틀린 뜻을 고침표(tools/fix_senior/고침표.tsv)대로 고친다 (2026-09-28 밤).
고치는 곳: 원자료 basicword_sets.json(시험 묶음) · basicwords.json(뜻) · gybm.json 선배 출처(예문·발음 캐시) · senior.json · days.json(선배 뜻이 그대로 옮겨진 것만).
그다음 tools/build_gybm.py 를 다시 돌리면 같은 출처 안 중복(바르게 고친 낱말이 이미 있는 것)은 저절로 빠진다.
발음(kr_read)은 tools/vi_kr.py 로 다시 만든다 (AI 금지).
쓰기: python3 tools/fix_senior/apply.py"""
import json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from vi_kr import word as vi_kr

nfc = lambda s: unicodedata.normalize("NFC", s.strip())


def load_table():
    rows = []
    for line in (ROOT / "tools/fix_senior/고침표.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        c = (line.split("\t") + [""] * 5)[:5]
        rows.append({"old": nfc(c[0]), "new": nfc(c[1]), "ko": c[2].strip(), "ex": c[3].strip(), "exko": c[4].strip()})
    return rows


def swap(text, old, new):
    """문장 속 틀린 낱말을 바른 낱말로 — 문장 첫머리면 첫 글자를 대문자로"""
    m = re.search(re.escape(old), text, re.I)
    if not m:
        return text
    rep = new
    if m.group(0)[:1].isupper():
        rep = new[:1].upper() + new[1:]
    return text[:m.start()] + rep + text[m.end():]


def main():
    rows = load_table()
    by_old = {r["old"].lower(): r for r in rows}
    log = []

    # ① 시험 묶음 — 낱말 글자를 바꾸거나 뺀다
    p = ROOT / "data/basicword_sets.json"
    sets = json.loads(p.read_text(encoding="utf-8"))
    for s in sets["sets"]:
        out = []
        for v in s["words"]:
            r = by_old.get(nfc(v).lower())
            if not r or r["new"] == "=":
                out.append(v); continue
            if r["new"] == "DROP":
                log.append(f"묶음 뺌 {v}"); continue
            out.append(r["new"]); log.append(f"묶음 {v} → {r['new']}")
        s["words"] = out
    p.write_text(json.dumps(sets, ensure_ascii=False, indent=1), encoding="utf-8")

    # ② basicwords.json — 뜻의 출처(find_bw). 틀린 낱말 기록 자체를 고친다
    p = ROOT / "data/basicwords.json"
    bw = json.loads(p.read_text(encoding="utf-8"))
    old_ko = {}
    for w in bw["words"]:
        r = by_old.get(nfc(w["vi"]).lower())
        if not r or r["new"] == "DROP":
            continue
        old_ko.setdefault(r["old"].lower(), w.get("ko", ""))
        if r["new"] != "=":
            w["vi"] = r["new"]; w["kr_read"] = vi_kr(r["new"])
        if r["ko"]:
            w["ko"] = r["ko"]
        log.append(f"basicwords {r['old']} → {w['vi']} · {w['ko']}")
    p.write_text(json.dumps(bw, ensure_ascii=False, indent=1), encoding="utf-8")

    # ③ gybm.json 선배 출처 — 다시 만들 때 예문·그림을 이 캐시에서 가져가므로 여기 예문도 고쳐 둔다
    p = ROOT / "data/gybm.json"
    g = json.loads(p.read_text(encoding="utf-8"))
    for src in g["sources"]:
        if src["key"] != "senior":
            continue
        for l in src["lessons"]:
            keep = []
            for w in l["words"]:
                r = by_old.get(nfc(w["vi"]).lower())
                if not r:
                    keep.append(w); continue
                if r["new"] == "DROP":
                    log.append(f"gybm 뺌 {w['vi']}"); continue
                if r["new"] != "=":
                    w["vi"] = r["new"]; w["kr_read"] = vi_kr(r["new"])
                if r["ko"]:
                    w["ko"] = r["ko"]
                ex = w.get("ex")
                if isinstance(ex, dict):
                    if r["ex"]:
                        ex["vi"] = r["ex"]
                    elif r["new"] != "=":
                        ex["vi"] = swap(ex["vi"], r["old"], r["new"])
                    if r["exko"]:
                        ex["ko"] = r["exko"]
                    if "kr" in ex:
                        ex["kr"] = vi_kr(ex["vi"])
                keep.append(w)
                log.append(f"gybm {r['old']} → {w['vi']} · {w['ko']} · {(ex or {}).get('vi', '') if isinstance(ex, dict) else ''}")
            l["words"] = keep
    p.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")

    # ④ senior.json — [낱말, 뜻, 표시]. 묶음이 번호로 가리키므로 빼지는 않고 글자·뜻만 고친다
    p = ROOT / "data/senior.json"
    sn = json.loads(p.read_text(encoding="utf-8"))
    for w in sn["words"]:
        r = by_old.get(nfc(w[0]).lower())
        if not r or r["new"] == "DROP":
            continue
        if r["new"] != "=":
            w[0] = r["new"]
        if r["ko"]:
            w[1] = r["ko"]
        log.append(f"senior {r['old']} → {w[0]} · {w[1]}")
    p.write_text(json.dumps(sn, ensure_ascii=False, separators=(", ", ": ")), encoding="utf-8")

    # ⑤ days.json — 선배 뜻(basicwords 옛 뜻)이 그대로 옮겨진 낱말만 고친다 (다른 교재 뜻은 건드리지 않는다)
    p = ROOT / "data/days.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    for day in d["days"]:
        for w in day["words"]:
            r = by_old.get(nfc(w["vi"]).lower())
            if not r or r["new"] == "DROP" or w.get("ko") != old_ko.get(r["old"].lower()):
                continue
            if r["new"] != "=":
                w["vi"] = r["new"]
                if "kr_read" in w: w["kr_read"] = vi_kr(r["new"])
                if "kr" in w: w["kr"] = vi_kr(r["new"])
            if r["ko"]:
                w["ko"] = r["ko"]
            ex = w.get("ex")
            if isinstance(ex, dict):
                if r["ex"]:
                    ex["vi"] = r["ex"]
                elif r["new"] != "=":
                    ex["vi"] = swap(ex["vi"], r["old"], r["new"])
                if r["exko"]:
                    ex["ko"] = r["exko"]
                if "kr" in ex:
                    ex["kr"] = vi_kr(ex["vi"])
            log.append(f"days {r['old']} → {w['vi']} · {w['ko']} · {(ex or {}).get('vi', '') if isinstance(ex, dict) else ''}")
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")

    # ⑥ sib.json(헷갈리는 짝 사전) — 틀린 낱말 열쇠는 바른 낱말로 옮기거나(이미 있으면) 지운다. 낱말이 아닌 열쇠(/·g·숫자·문법 자리표시)도 지운다
    p = ROOT / "data/sib.json"
    sb = json.loads(p.read_text(encoding="utf-8"))
    W = sb["w"]
    # 선배 자료에서만 틀린 것이지 그 자체로 바른 낱말인 것은 짝 사전에 남긴다 (đại 크다 · đần 멍청하다 · sấu 서우 열매 · gian 칸 · thường thức 상식)
    REAL = {"đại": "크다·대(大)·아무렇게나(구어)", "đần": None, "sấu": None, "gian": None, "thường thức": "상식"}
    for o, k0 in REAL.items():
        if o in W and k0:
            W[o]["k"] = k0; log.append(f"sib 뜻 {o} → {k0}")
    for r in rows:
        o, n = r["old"].lower(), r["new"].lower()
        if o in REAL:
            continue
        if o not in W or r["new"] == "=":
            if o in W and r["new"] == "=" and r["ko"] and W[o].get("k") == old_ko.get(o):
                W[o]["k"] = r["ko"]; log.append(f"sib 뜻 {o} → {r['ko']}")
            continue
        if r["new"] == "DROP" or n in W:
            del W[o]; log.append(f"sib 지움 {o}"); continue
        W[n] = W.pop(o)
        if r["ko"]:
            W[n]["k"] = r["ko"]
        log.append(f"sib {o} → {n}")
    for k in [k for k in W if not re.search(r"[a-zà-ỹđ]", k) or k in ("g",)]:
        del W[k]; log.append(f"sib 지움(낱말 아님) {k}")
    p.write_text(json.dumps(sb, ensure_ascii=False), encoding="utf-8")

    print("\n".join(log))
    print(f"고침 {len(log)}줄")


if __name__ == "__main__":
    main()
