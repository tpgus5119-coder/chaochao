#!/usr/bin/env python3
"""모든 낱말 소리(여·남)를 Whisper 로 받아써서 글과 맞대 본다 (대표님 지시 2026-09-27 "tts 도 하나하나 검수").
이어 돌릴 수 있다(결과는 data/_asr_audit.jsonl 에 한 줄씩). 사용: python3 tools/asr_audit.py [--limit N]"""
import json, sys, re, unicodedata, difflib, pathlib
from faster_whisper import WhisperModel
R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / "data/_asr_audit.jsonl"
def bare(s):
    d = unicodedata.normalize("NFD", s.lower())
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in d if not unicodedata.combining(c)).replace("đ", "d")).split())
done = set()
if OUT.exists():
    for ln in OUT.read_text(encoding="utf-8").splitlines():
        try: done.add(json.loads(ln)["k"])
        except Exception: pass
idx = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8"))
items = [(t, h) for t, h in sorted(idx.items()) if t not in done]
limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
if limit: items = items[:limit]
print("todo", len(items), "done", len(done), flush=True)
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
with OUT.open("a", encoding="utf-8") as f:
    for i, (t, h) in enumerate(items):
        r = {"k": t, "h": h}
        for v in "fm":
            p = R / "audio" / v / "n" / f"{h}.mp3"
            if not p.exists(): r[v] = None; continue
            try:
                segs, _ = m.transcribe(str(p), language="vi", beam_size=1, vad_filter=False)
                tx = " ".join(s.text for s in segs).strip()
            except Exception as e:
                tx = "ERR " + str(e)[:40]
            r[v] = tx
            r[v + "_r"] = round(difflib.SequenceMatcher(None, bare(t), bare(tx)).ratio(), 2)
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
        if i % 200 == 0: f.flush(); print(i, "/", len(items), flush=True)
print("끝", flush=True)
