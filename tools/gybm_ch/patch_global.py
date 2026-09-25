"""메인 예문을 낱말 이름으로 바로잡는다(과 이름 필요 없음). 사용: python3 patch_global.py <patch.json> [--strip-speakers]
 patch.json = {"낱말": [새 예문 vi 또는 null, 새 예문 ko], ...}  — 메인 출처와, 같은 (낱말·뜻)인 다른 출처 낱말에 적용한다.
 --strip-speakers: 메인 예문 vi 앞의 화자 머리표('Eun Ji: ')를 vi·ko 에서 뗀다. 새로 생긴 텍스트는 여·남 소리를 만들어 소리 목록에 올린다.
빌드 뒤에 한다."""
import asyncio, hashlib, json, pathlib, re, sys
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
gp = ROOT / "data/gybm.json"
g = json.loads(gp.read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
patch = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else {}
strip = "--strip-speakers" in sys.argv
SP_VI = re.compile(r"^[A-ZÀ-Ỹ][\wÀ-ỹ]*(?: [A-ZÀ-Ỹ][\wÀ-ỹ]*)?\s*:\s+")
SP_KO = re.compile(r"^[가-힣A-Za-z ]{1,10}:\s+")
by = {}
for l in main["lessons"]:
    for w in l["words"]:
        by.setdefault(w["vi"], []).append(w)
miss = [k for k in patch if k not in by]
assert not miss, miss
new_texts = []
def apply(w, evi, eko):
    old = w.get("ex") or {}
    targets = [w]
    for s in g["sources"]:
        if s is main: continue
        for l in s["lessons"]:
            for x in l["words"]:
                if x is not w and x["vi"] == w["vi"] and x.get("ko") == w.get("ko") and (x.get("ex") or {}).get("vi") == old.get("vi"):
                    targets.append(x)
    for x in targets:
        x["ex"] = {"vi": evi or old.get("vi", ""), "ko": eko}
        x["ex_src"] = "claude"
    if evi: new_texts.append(evi)
n = 0
for vi, (evi, eko) in patch.items():
    for w in by[vi]:
        apply(w, evi, eko); n += 1
if strip:
    for vi, ws in by.items():
        for w in ws:
            ex = w.get("ex") or {}
            if SP_VI.match(ex.get("vi", "")):
                nvi = SP_VI.sub("", ex["vi"]); nko = SP_KO.sub("", ex.get("ko", ""))
                apply(w, nvi, nko); n += 1
gp.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
print("고친 낱말", n)
idxp = ROOT / "data/audio_index.json"; idx = json.loads(idxp.read_text(encoding="utf-8"))
need = [t for t in dict.fromkeys(new_texts) if not all((ROOT / f"audio/{v}/n/{k12(t)}.mp3").exists() and (ROOT / f"audio/{v}/n/{k12(t)}.mp3").stat().st_size > 3000 for v in VOICES)]
print("새로 만들 소리 텍스트", len(need))
async def make(t, v):
    import edge_tts
    p = ROOT / "audio" / v / "n" / f"{k12(t)}.mp3"
    for a in range(4):
        try:
            await asyncio.wait_for(edge_tts.Communicate(t, VOICES[v]).save(str(p)), timeout=30)
            if p.stat().st_size > 3000: return True
        except Exception:
            if p.exists(): p.unlink()
            await asyncio.sleep(2 + a * 2)
    return False
async def run():
    bad = []
    for t in need:
        for v in VOICES:
            if not await make(t, v): bad.append((v, t))
    return bad
bad = asyncio.run(run())
for t in dict.fromkeys(new_texts):
    if all((ROOT / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES): idx[t] = k12(t)
idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
print("소리 실패", bad)
