#!/usr/bin/env python3
"""여·남 소리 파일이 정말 여·남인지 — 목소리 높이(기본 주파수 중앙값)로 센다 (대표님 지시 2026-09-27 "남자 목소리로 나오는지 다 검사").
edge-tts HoaiMy(여) ≈ 190~260Hz, NamMinh(남) ≈ 100~150Hz. 결과: data/_voice_audit.json"""
import json, os, subprocess, sys, pathlib, multiprocessing as mp, numpy as np
R = pathlib.Path(__file__).resolve().parent.parent
def f0(path):
    try:
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, timeout=30).stdout
    except Exception:
        return None
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    if len(x) < 4000: return None
    sr = 16000; win = 640; hop = 160; out = []
    thr = 0.02 * max(1e-6, np.abs(x).max())
    for s in range(0, len(x) - win, hop):
        seg = x[s:s + win]
        if np.abs(seg).mean() < thr: continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, mode="full")[win - 1:]
        if ac[0] <= 0: continue
        ac = ac / ac[0]
        lo, hi = int(sr / 400), int(sr / 70)
        i = lo + int(np.argmax(ac[lo:hi]))
        if ac[i] > 0.45: out.append(sr / i)
    return float(np.median(out)) if len(out) >= 5 else None
def one(a):
    key, h = a
    r = {}
    for v in "fm":
        p = R / "audio" / v / "n" / f"{h}.mp3"
        r[v] = f0(p) if p.exists() else "missing"
    return key, r
if __name__ == "__main__":
    idx = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8"))
    items = sorted(idx.items())
    with mp.Pool(6) as pool:
        res = dict(pool.imap_unordered(one, items, chunksize=50))
    (R / "data/_voice_audit.json").write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
    bad = {k: v for k, v in res.items() if v["f"] == "missing" or v["m"] == "missing" or (isinstance(v["f"], float) and isinstance(v["m"], float) and not (v["m"] < 165 < v["f"]))}
    print("checked", len(res), "suspect", len(bad))
    for k, v in list(bad.items())[:30]: print(k, v)
