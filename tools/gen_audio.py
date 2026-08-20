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
    """음성이 필요한 베트남어 문자열 전부 (중복 제거)"""
    out = {}
    for d in data["days"]:
        for t in d.get("tones", []):
            out[t["vi"]] = "tone"
        for w in d["words"]:
            out[w["vi"]] = "word"
        for f in d["frames"]:
            for ex in f["examples"]:
                out[ex] = "ex"
    return out

async def one(text, voice_id, voice_name, rate):
    sub = "slow" if rate else "n"
    path = ROOT / "audio" / voice_id / sub / f"{key(text)}.mp3"
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    kw = {"rate": "-25%"} if rate else {}
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
            if kind in ("tone", "word"):
                jobs.append(guarded(text, vid, vname, True))
    made = sum(1 for r in await asyncio.gather(*jobs) if r)
    # 파일명 대조표 (앱이 읽는다)
    idx = {t: key(t) for t in items}
    (ROOT / "data" / "audio_index.json").write_text(
        json.dumps(idx, ensure_ascii=False, indent=1))
    print(f"텍스트 {len(items)}종 / 새로 만든 파일 {made}개")

asyncio.run(main())
