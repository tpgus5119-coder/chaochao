#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""위스퍼가 못 확인한 낱말 소리를 **귀 대신 기계**로 한 번 더 거른다 (대표님 2026-09-30: "793개를 내가 왜 들어야 하냐").
방법: 소리의 높낮이 곡선(F0)을 재서 성조 모양(오름·내림·평평·꺾임)을 가려내고, 글자의 성조 부호가 말하는 모양과 맞는지 본다.
      여자·남자 두 목소리를 다 재고, 둘 다 부호와 정반대(오를 것이 내림, 내릴 것이 오름)인 것만 '의심'으로 적는다.
먼저 위스퍼가 통과시킨 낱말(한 음절)로 이 잣대가 얼마나 맞는지 잰다 — 거기서 어긋나는 비율이 곧 이 잣대의 오차다.
쓰기: python3 tools/word_check/tone_check.py  → data/_tone_check.json · 화면에 요약"""
import json, pathlib, subprocess, sys, unicodedata
import numpy as np
R = pathlib.Path(__file__).resolve().parent.parent.parent
AIDX = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8"))
ROWS = [json.loads(l) for l in (R / "data/_asr_recheck.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
TONE = {"́": "sắc", "̀": "huyền", "̉": "hỏi", "̃": "ngã", "̣": "nặng"}
def tone_of(syl):
    for ch in unicodedata.normalize("NFD", syl):
        if ch in TONE: return TONE[ch]
    return "ngang"
def pcm(path):
    out = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32)
def f0_contour(x, sr=16000, win=0.03, hop=0.01):
    if not len(x): return []
    x = x / (np.max(np.abs(x)) + 1e-9)
    n, h = int(sr * win), int(sr * hop)
    out = []
    lo, hi = int(sr / 400), int(sr / 70)
    for s in range(0, len(x) - n, h):
        fr = x[s:s + n]
        if np.sqrt(np.mean(fr ** 2)) < 0.03: out.append(None); continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, "full")[n - 1:]
        ac = ac / (ac[0] + 1e-9)
        seg = ac[lo:hi]
        k = int(np.argmax(seg)) + lo
        out.append(sr / k if seg.max() > 0.45 else None)
    return out
def shape(f0):
    v = [(i, f) for i, f in enumerate(f0) if f]
    if len(v) < 6: return None
    st = np.array([12 * np.log2(f / v[0][1]) for _, f in v])          # 반음, 첫 값 기준
    n = len(st); a, b = st[: max(2, n // 4)].mean(), st[-max(2, n // 4):].mean()
    mid = st[n // 4: -n // 4] if n >= 8 else st
    d = b - a
    dip = (mid.min() < a - 2.5 and mid.min() < b - 2.5)
    if d > 3: return "오름"
    if d < -3: return "내림"
    if dip: return "꺾임"
    return "평평"
EXPECT = {"sắc": {"오름"}, "ngã": {"오름", "꺾임"}, "huyền": {"내림"}, "nặng": {"내림", "평평"}, "hỏi": {"꺾임", "내림"}, "ngang": {"평평"}}
OPPOSITE = {"sắc": "내림", "ngã": "내림", "huyền": "오름", "nặng": "오름"}
def check(word, h):
    res = {}
    for v in ("f", "m"):
        p = R / f"audio/{v}/n/{h}.mp3"
        if not p.exists(): res[v] = None; continue
        res[v] = shape(f0_contour(pcm(p)))
    return res
def main():
    single = [r for r in ROWS if len(r["k"].split()) == 1 and (AIDX.get(r["k"]) or r.get("h"))]
    out = {"note": "F0 곡선으로 성조 모양을 잰 것 — 여자·남자 둘 다 부호와 정반대인 낱말만 의심 (tools/word_check/tone_check.py)", "rows": []}
    stat = {"검증": [0, 0], "의심": []}
    for i, r in enumerate(single):
        h = AIDX.get(r["k"]) or r["h"]; t = tone_of(r["k"]); sh = check(r["k"], h)
        opp = OPPOSITE.get(t)
        both_opp = bool(opp) and sh.get("f") == opp and sh.get("m") == opp
        ok_any = any(s in EXPECT[t] for s in (sh.get("f"), sh.get("m")) if s)
        row = {"k": r["k"], "tone": t, "f": sh.get("f"), "m": sh.get("m"), "pass2": r["pass2"], "opp": both_opp}
        out["rows"].append(row)
        if r["pass2"]: stat["검증"][1] += 1; stat["검증"][0] += 0 if both_opp else 1
        elif both_opp: stat["의심"].append(r["k"])
        if i % 300 == 0: print(i, "/", len(single), flush=True)
    (R / "data/_tone_check.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    v = stat["검증"]
    print(f"잣대 검증(위스퍼 통과 한 음절 {v[1]}개 중 잣대도 통과 {v[0]}개 = {v[0]*100//max(1,v[1])}%)")
    unk = [r for r in single if not r["pass2"]]
    print(f"위스퍼 미확인 한 음절 {len(unk)}개 중 의심 {len(stat['의심'])}개:", stat["의심"][:60])
if __name__ == "__main__":
    main()
