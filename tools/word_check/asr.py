#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""낱말 하나씩 검사 — 녹음(북부 여·남)을 Whisper 로 받아써서 글과 맞대 본다 (2026-09-29, 대표님: "tts도 위스퍼로 직접 다 들어보고 실제 발음과 맞는지 체크").
우리 녹음은 무음을 잘라 0.5~0.7초라 Whisper 가 한 음절을 자주 잘못 듣는다(số → "Rồi", còn → 유튜브 상투구).
실측(2026-09-29, 19낱말 × 여·남): 앞에 "Từ tiếp theo là:"(다음 낱말은) 한마디(tools/word_check/carrier.mp3, 여자 목소리)를 붙여 들려주면
대부분 바로 맞게 받아쓴다(số·còn·nói·tiếng Việt·hội thoại …). 그래서 받침 말 뒤에 낱말을 이어 붙인 뒤 medium 으로 받아쓰고, 앞말은 떼고 견준다.
결과 data/_asr_word.jsonl 한 줄 = {k, h, f, f_r, f_b, m, m_r, m_b, pass}. _r = 성조 포함 일치율, _b = 성조 뺀 일치율. 0.8 이상이면 통과.
이어서 돌릴 수 있다. 사용: python3 tools/word_check/asr.py <글 목록.json>"""
import difflib, json, pathlib, re, subprocess, sys, tempfile, unicodedata
from faster_whisper import WhisperModel
R = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = R / "data/_asr_word.jsonl"
CAR = R / "tools/word_check/carrier.mp3"
CAR_TXT = "từ tiếp theo là"
def bare(s):
    d = unicodedata.normalize("NFD", s.lower().replace("đ", "d"))
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in d if not unicodedata.combining(c))).split())
def tone(s):
    return " ".join(re.sub(r"[^\w ]", " ", unicodedata.normalize("NFC", s.lower())).split())
def strip_car(tx):
    t = tone(tx)
    for pre in (CAR_TXT, "từ tiếp theo là", "tiếp theo là", "từ tiếp theo"):
        if t.startswith(pre): return t[len(pre):].strip()
    return t
def main():
    texts = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    idx = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8"))
    done = set()
    if OUT.exists():
        for ln in OUT.read_text(encoding="utf-8").splitlines():
            try: done.add(json.loads(ln)["k"])
            except Exception: pass
    todo = [t for t in dict.fromkeys(texts) if t not in done]
    print("할 것", len(todo), "이미", len(done), flush=True)
    m = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=6)
    tmp = pathlib.Path(tempfile.mkdtemp())
    with OUT.open("a", encoding="utf-8") as f:
        for i, t in enumerate(todo):
            h = idx.get(t) or idx.get(t.lower())
            r = {"k": t, "h": h}
            for v in "fm":
                p = R / "audio" / v / "n" / f"{h}.mp3" if h else None
                if not p or not p.exists():
                    r[v] = None; r[v + "_r"] = 0; r[v + "_b"] = 0; continue
                w = tmp / f"{v}.wav"
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(CAR), "-i", str(p), "-filter_complex",
                                "[0:a]aresample=16000,apad=pad_dur=0.25[a0];[1:a]aresample=16000,apad=pad_dur=0.6[a1];[a0][a1]concat=n=2:v=0:a=1", "-ac", "1", str(w)], check=True)
                segs, _ = m.transcribe(str(w), language="vi", beam_size=5)
                tx = " ".join(s.text for s in segs).strip()
                got = strip_car(tx)
                r[v] = got
                r[v + "_r"] = round(difflib.SequenceMatcher(None, tone(t), got).ratio(), 2)
                r[v + "_b"] = round(difflib.SequenceMatcher(None, bare(t), bare(got)).ratio(), 2)
            r["pass"] = all(r.get(v + "_r", 0) >= 0.8 for v in "fm")
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            if i % 50 == 0: f.flush(); print(i, "/", len(todo), flush=True)
    print("끝", flush=True)
if __name__ == "__main__":
    main()
