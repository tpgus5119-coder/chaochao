"""새 낱말 예문 넣기 + 소리 만들기. 사용: python3 patch_generic.py <과 제목 정확히> <new json: [[vi,ko,en,exvi,exko],...]>"""
import asyncio, hashlib, json, pathlib, sys, unicodedata
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
title = sys.argv[1]
items = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
gp = ROOT / "data/gybm.json"
g = json.loads(gp.read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
ch = {w["vi"]: w for l in main["lessons"] if (l["title"] == title or l["title"].startswith(title + " · ")) for w in l["words"]}
texts = []
for v, ko, en, evi, eko in items:
    w = ch[v]
    w["ex"] = {"vi": evi, "ko": eko}
    w["ex_src"] = "claude"
    texts += [v, evi]
gp.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
idxp = ROOT / "data/audio_index.json"
idx = json.loads(idxp.read_text(encoding="utf-8"))

async def make(t, v):
    import edge_tts
    p = ROOT / "audio" / v / "n" / f"{k12(t)}.mp3"
    if p.exists() and p.stat().st_size > 3000:
        return True
    for a in range(4):
        try:
            await asyncio.wait_for(edge_tts.Communicate(t, VOICES[v]).save(str(p)), timeout=30)
            if p.stat().st_size > 3000:
                return True
        except Exception:
            if p.exists():
                p.unlink()
            await asyncio.sleep(2 + a * 2)
    return False

async def run():
    bad = []
    for t in dict.fromkeys(texts):
        for v in VOICES:
            if not await make(t, v):
                bad.append((v, t))
    return bad
bad = asyncio.run(run())
for t in dict.fromkeys(texts):
    idx[t] = k12(t)
idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
print("소리 실패", bad, "· 넣은 텍스트", len(set(texts)))
