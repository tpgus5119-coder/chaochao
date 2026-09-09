#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""직무 낱말(order.json) 트랙 하나를 **전수 기계 검사**한다.

대표님 지시 (2026-09-09): "공통-생산과 공정 의 모든 단어들 다 검사해봐.
목차에 맞는 단어인지, 발음이 사전과 맞는지, 사전에 잇는 단어가 맞는지,
tts 연결됏는지, 속도 0.8배속 맞는지. ... 생산과 공정 안의 잇는 단어들의
학습 순서가 기초순서인지."

이 스크립트가 보는 것 (전부 **규칙/사전 대조** — AI 판단 없음, 세면 되는 일):
  1. 단어 소리 있나 (audio_index.json, recKey 방식: 원문 또는 소문자)
  2. 예문 소리 있나 (같은 방식)
  3. kr(발음표기)이 tools/vi_kr.py 결과와 똑같나
  4. 예문 kr도 vi_kr.py 결과와 똑같나
  5. 단어가 사전(_vi_words.json)에 있나 — 통짜로 없으면 띄어쓰기로 쪼개서
     조각이 다 사전에 있는지(=합성어일 뿐 정상) 본다. 조각도 안 되면 진짜 문제.
  6. 챕터가 쉬운말→어려운말 순서인가 (챕터별 평균 글자수/낱말수가 늘어나는지)

목차 적합성(이 낱말이 이 트랙에 맞는 카테고리인가)은 **AI로 되는 일이 아니라서**
이 스크립트가 아니라 사람이 직접 읽어서 정한다 — 이미 끝난 것은 다시 안 건드림.

쓰기: python3 tools/vocab_audit.py "공통 · 품질과 검사"
      python3 tools/vocab_audit.py --all        (16개 트랙 전부)
"""
import argparse, json, pathlib, sys, unicodedata as U

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr

n = lambda s: U.normalize("NFC", str(s)).strip()


def load():
    O = json.loads((R / "data" / "order.json").read_text(encoding="utf-8"))
    AIDX = json.loads((R / "data" / "audio_index.json").read_text(encoding="utf-8"))
    VW = json.loads((R / "data" / "_vi_words.json").read_text(encoding="utf-8"))
    EG = json.loads((R / "data" / "exgloss.json").read_text(encoding="utf-8"))
    known = {n(x).lower() for x in VW} | {n(x).lower() for x in EG}
    return O, AIDX, known


def has_audio(aidx, text):
    t = n(text)
    return t in aidx or t.lower() in aidx


def dict_ok(known, vi):
    """사전에 통짜로 있거나, **여러 음절 낱말로 온전히 쪼개지면** 정상.
    (음절 하나하나가 아니라 낱말 단위로 봐야 한다 — 'khiếu nại'처럼 두 음절이
    붙어야 한 낱말인 경우가 많다. full_check.py 의 seg() 와 같은 방식.)"""
    v = n(vi).lower()
    if v in known:
        return True
    toks = v.split()
    i, out = 0, []
    while i < len(toks):
        for j in range(min(len(toks), i + 4), i, -1):
            cand = " ".join(toks[i:j])
            if cand in known:
                out.append(cand); i = j; break
        else:
            return False
    return len(out) > 0


def audit_track(O, AIDX, known, track_name):
    target = None
    for v in O["vols"]:
        for t in (v.get("tracks") or [v]):
            if t.get("track") == track_name:
                target = t
    if not target:
        print(f"트랙을 못 찾음: {track_name}")
        return None

    issues = []
    chstats = []
    for ci, c in enumerate(target["chapters"]):
        for li, l in enumerate(c["lessons"]):
            lens = []
            for w in l["words"]:
                vi = w["vi"]
                lens.append((len(vi.split()), len(vi)))
                if not has_audio(AIDX, vi):
                    issues.append((vi, "단어 소리 없음", ""))
                want_kr = vi_kr.word(vi)
                if want_kr and n(w.get("kr", "")) != n(want_kr):
                    issues.append((vi, "발음표기 불일치", f"현재={w.get('kr')} 도구={want_kr}"))
                ex = w.get("ex")
                if ex:
                    if not has_audio(AIDX, ex["vi"]):
                        issues.append((vi, "예문 소리 없음", ex["vi"]))
                    want_ekr = vi_kr.word(ex["vi"])
                    if want_ekr and n(ex.get("kr", "")) != n(want_ekr):
                        issues.append((vi, "예문 발음표기 불일치", f"현재={ex.get('kr')} 도구={want_ekr}"))
                if not dict_ok(known, vi):
                    issues.append((vi, "사전에 없음(조각도 안됨)", w.get("ko", "")))
            avg_tok = sum(x[0] for x in lens) / len(lens) if lens else 0
            avg_len = sum(x[1] for x in lens) / len(lens) if lens else 0
            chstats.append((l.get("t", f"챕터{ci}-{li}"), len(lens), avg_tok, avg_len))

    n_words = sum(len(l["words"]) for c in target["chapters"] for l in c["lessons"])
    n_noimg = sum(1 for c in target["chapters"] for l in c["lessons"] for w in l["words"] if not w.get("img"))

    print(f"\n=== {track_name} — {n_words}개 낱말 ===")
    print(f"이미지 없는 낱말: {n_noimg}/{n_words} (정보용 · 안 고침)")
    print(f"챕터별 (이름, 낱말수, 평균낱말수/단어, 평균글자수):")
    for t, cnt, at, al in chstats:
        print(f"  {t}: {cnt}개 · 평균 {at:.2f}낱말 · 평균 {al:.1f}자")
    mono_tok = [x[2] for x in chstats]
    mono_len = [x[3] for x in chstats]
    is_mono = all(mono_len[i] <= mono_len[i+1] + 1.5 for i in range(len(mono_len)-1)) if len(mono_len) > 1 else True
    print(f"순서(쉬움→어려움) 대체로 단조증가: {'예' if is_mono else '**아니오 — 확인 필요**'}")
    print(f"발견된 문제 {len(issues)}건:")
    for vi, kind, detail in issues:
        print(f"  - [{kind}] {vi}  {detail}")
    return {"track": track_name, "n": n_words, "issues": issues, "chstats": chstats, "noimg": n_noimg}


ALL_TRACKS = [
    "공통 · 생산과 공정", "공통 · 품질과 검사", "공통 · 자재와 창고", "공통 · 기계와 설비",
    "공통 · 안전과 환경", "공통 · 사람과 조직", "공통 · 서류와 회계",
    "전자·반도체", "섬유·봉제·신발", "기계·금속·자동차", "물류·무역", "건설",
    "화학·플라스틱", "식품가공", "유통·판매", "외식·요식업",
]

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("track", nargs="?", default="")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    O, AIDX, known = load()
    targets = ALL_TRACKS if a.all else [a.track]
    results = [audit_track(O, AIDX, known, t) for t in targets if t]
    tot = sum(len(r["issues"]) for r in results if r)
    print(f"\n\n총 {len(results)}개 트랙 · 문제 합계 {tot}건")
