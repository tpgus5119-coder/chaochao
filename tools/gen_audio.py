#!/usr/bin/env python3
"""days.json의 모든 베트남어를 MP3로 뽑는다. 이미 있는 파일은 건너뛴다.
사용: python3 tools/gen_audio.py [--slow]"""
import asyncio, hashlib, json, pathlib, sys
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
SLOW = "--slow" in sys.argv

def key(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()[:12]

def collect(data):
    """음성이 필요한 베트남어 문자열 전부. 값은 느린 버전도 만들지 여부."""
    out = {}
    for pr in data.get("prep", []):
        for l in pr.get("letters", []):
            out[l["ex"]] = "word"          # 글자는 예시 단어로 듣는다
        for t in pr.get("tones", []):
            out[t["vi"]] = "tone"
    for g in data.get("tonedrill", []) + data.get("voweldrill", []):
        for it in g["items"]:
            out[it["vi"]] = "tone"
    for t in data.get("ruledrill", []):   # 규칙 수업의 예문
        out.setdefault(t, "word")
    for d in data["days"]:
        for w in d["words"]:
            out[w["vi"]] = "word"
        for l in d["dialog"]["lines"]:
            out[l["vi"]] = "sent"          # 대화 문장은 느린 버전도
        for t in d["dialog"].get("extra", []):
            out.setdefault(t["vi"] if isinstance(t, dict) else t, "ex")
    # 실전 단어(선배 시험)도 소리를 만든다 (대표님 지시, 2026-08-29).
    #    없으면 듣기·자판 쓰기 문제가 아예 안 나오고 '읽기' 하나로 쪼그라든다.
    #    기기 목소리로 때울 수도 있지만, 베트남어 목소리가 없는 폰이 많다.
    sp = ROOT / "data" / "senior.json"
    if sp.exists():
        for w in json.loads(sp.read_text(encoding="utf-8"))["words"]:
            out.setdefault(w[0], "word")
    # 새 짜임(일곱 권) — 낱말과 그 낱말의 예문 (2026-08-30)
    cp = ROOT / "data" / "course.json"
    if cp.exists():
        for v in json.loads(cp.read_text(encoding="utf-8"))["vols"]:
            for u in v["units"]:
                for ch in u["chapters"]:
                    for w in ch["words"]:
                        out.setdefault(w["vi"], "word")
                        if w.get("ex"): out.setdefault(w["ex"]["vi"], "sent")
    # 7권 베트남 바로알기 — 낱말과 문장
    kp = ROOT / "data" / "know.json"
    if kp.exists():
        for x in json.loads(kp.read_text(encoding="utf-8"))["lec"]:
            for w in x["words"]: out.setdefault(w["vi"], "word")
            for t in x["sents"]: out.setdefault(t["vi"], "sent")
    # 1권 문법 예문
    gp = ROOT / "data" / "grammar.json"
    if gp.exists():
        for b in json.loads(gp.read_text(encoding="utf-8"))["books"]:
            for bai in b["bai"]:
                for g in bai["g"]:
                    for e in g["ex"]: out.setdefault(e["vi"], "sent")
    return out

async def one(text, voice_id, voice_name, rate):
    sub = "slow" if rate else "n"
    path = ROOT / "audio" / voice_id / sub / f"{key(text)}.mp3"
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    kw = {"rate": "-40%"} if rate else {}
    await edge_tts.Communicate(text, voice_name, **kw).save(str(path))
    return True

SEM = asyncio.Semaphore(8)

async def guarded(*a):
    async with SEM:
        for attempt in range(3):
            try:
                return await one(*a)
            except Exception as e:
                if attempt == 2:
                    print("실패:", a[0], e)
                    return False
                await asyncio.sleep(1 + attempt)

async def main():
    data = json.loads((ROOT / "data" / "days.json").read_text())
    items = collect(data)
    jobs = []
    for text, kind in items.items():
        for vid, vname in VOICES.items():
            jobs.append(guarded(text, vid, vname, False))
            if kind in ("tone", "word", "sent"):
                jobs.append(guarded(text, vid, vname, True))
    made = sum(1 for r in await asyncio.gather(*jobs) if r)
    # 파일명 대조표 (앱이 읽는다)
    idx = {t: key(t) for t in items}
    (ROOT / "data" / "audio_index.json").write_text(
        json.dumps(idx, ensure_ascii=False, indent=1))
    print(f"텍스트 {len(items)}종 / 새로 만든 파일 {made}개")

asyncio.run(main())
