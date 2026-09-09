#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""일상 낱말(days.json) 하루치를 **전수 기계 검사**한다. tools/vocab_audit.py의
일상판 — 대표님 지시(2026-09-09): "직무 단어 다하면 일상단어도 하나하나
목차 하나씩 다 해줘." 와 같은 잣대(소리·발음표기·사전등재)를 낱말뿐 아니라
대화문(dialog.lines·extra)까지 본다.

쓰기: python3 tools/daily_audit.py --all          (108일 전부)
      python3 tools/daily_audit.py --n 1 20       (n=1~20만)
"""
import argparse, json, pathlib, sys, unicodedata as U

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr

n_ = lambda s: U.normalize("NFC", str(s)).strip()


def load():
    D = json.loads((R / "data" / "days.json").read_text(encoding="utf-8"))
    AIDX = json.loads((R / "data" / "audio_index.json").read_text(encoding="utf-8"))
    VW = json.loads((R / "data" / "_vi_words.json").read_text(encoding="utf-8"))
    EG = json.loads((R / "data" / "exgloss.json").read_text(encoding="utf-8"))
    known = {n_(x).lower() for x in VW} | {n_(x).lower() for x in EG}
    return D, AIDX, known


def has_audio(aidx, text):
    t = n_(text)
    return t in aidx or t.lower() in aidx


def dict_ok(known, vi):
    v = n_(vi).lower()
    if v in known:
        return True
    toks = v.split()
    i = 0
    while i < len(toks):
        for j in range(min(len(toks), i + 4), i, -1):
            if " ".join(toks[i:j]) in known:
                i = j; break
        else:
            return False
    return True


def audit_day(D, AIDX, known, day):
    issues = []
    for w in day.get("words") or []:
        vi = w["vi"]
        if not has_audio(AIDX, vi):
            issues.append((vi, "단어 소리 없음", ""))
        want = vi_kr.word(vi)
        if want and n_(w.get("kr_read", "")) != n_(want):
            issues.append((vi, "발음표기 불일치", f"현재={w.get('kr_read')} 도구={want}"))
        if not dict_ok(known, vi):
            issues.append((vi, "사전에 없음(조각도 안됨)", w.get("ko", "")))
        if not (w.get("ko") or "").strip():
            issues.append((vi, "뜻 없음", ""))

    dlg = day.get("dialog") or {}
    for l in dlg.get("lines") or []:
        vi = l["vi"]
        if not has_audio(AIDX, vi):
            issues.append((vi, "대화 소리 없음", ""))
        want = vi_kr.word(vi)
        if want and n_(l.get("kr_read", "")) != n_(want):
            issues.append((vi, "대화 발음표기 불일치", f"현재={l.get('kr_read')} 도구={want}"))
    for t in dlg.get("extra") or []:
        if isinstance(t, str):
            vi, kr = t, None
        else:
            vi, kr = t.get("vi"), t.get("kr_read")
        if not vi:
            continue
        if not has_audio(AIDX, vi):
            issues.append((vi, "추가예문 소리 없음", ""))
        want = vi_kr.word(vi)
        if kr is not None and want and n_(kr) != n_(want):
            issues.append((vi, "추가예문 발음표기 불일치", f"현재={kr} 도구={want}"))
    return issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--n", nargs=2, type=float, metavar=("FROM", "TO"))
    ap.add_argument("--track", default="")   # '' = 일상(트랙 없음), 'work' = 옛 직무
    a = ap.parse_args()

    D, AIDX, known = load()
    days = D["days"]
    if a.track == "":
        days = [d for d in days if not d.get("track")]
    elif a.track:
        days = [d for d in days if d.get("track") == a.track]
    days = sorted(days, key=lambda d: d.get("n", 0))
    if a.n:
        lo, hi = a.n
        days = [d for d in days if lo <= (d.get("n") or 0) <= hi]

    tot = 0
    for d in days:
        issues = audit_day(D, AIDX, known, d)
        tot += len(issues)
        flag = "" if not issues else f"  ⚠️ {len(issues)}건"
        print(f"n={d.get('n'):>3} day={d.get('day'):<6} {d.get('theme','')[:22]:<24}{flag}")
        for vi, kind, detail in issues:
            print(f"      - [{kind}] {vi}  {detail}")
    print(f"\n총 {len(days)}일 · 문제 합계 {tot}건")


if __name__ == "__main__":
    main()
