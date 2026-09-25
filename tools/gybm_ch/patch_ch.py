"""한 과의 예문을 바로잡고(예문 교체·한국어만 교체), 화자 이름 머리표·숫자 뒤 띄어쓰기를 정리하고,
소리 목록에 없는 텍스트의 여·남 소리를 만든다. build_gybm.py 를 돌린 **뒤에** 한다.
사용: python3 patch_ch.py <과 제목(정확히)> <patch.json>
 patch.json = {"낱말": [새 예문 vi 또는 null, 새 예문 ko, 출처 또는 null], ...}"""
import asyncio, hashlib, json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
title = sys.argv[1]
patch = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")) if len(sys.argv) > 2 else {}
PREFIX = re.compile(r"^([가-힣A-Za-z ]{1,10}):\s+")
SPACE = re.compile(r"(\d)\s+(?=(?:월|일|세|시|분|권|명|도|년|점|쪽|만|km|%|개|번|층|호|살|달|주))")

gp = ROOT / "data/gybm.json"
g = json.loads(gp.read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
ch = [w for l in main["lessons"] if (l["title"] == title or l["title"].startswith(title + " · ")) for w in l["words"]]
by = {w["vi"]: w for w in ch}
miss = [k for k in patch if k not in by]
assert not miss, miss


def targets(w):
    out = [w]
    for s in g["sources"]:
        if s is main:
            continue
        for l in s["lessons"]:
            for x in l["words"]:
                if x["vi"] == w["vi"] and x.get("ko") == w["ko"] and x is not w:
                    out.append(x)
    return out


n = 0
for vi, (evi, eko, src) in patch.items():
    w = by[vi]
    for x in targets(w):
        old = x.get("ex") or {}
        if evi:
            x["ex"] = {"vi": evi, "ko": eko}
            if src:
                x["ex_src"] = src
        else:
            x["ex"] = {"vi": old.get("vi", ""), "ko": eko}
    n += 1
for w in ch:
    ex = w.get("ex")
    if not ex:
        continue
    ko = ex["ko"]
    new = ko
    if PREFIX.match(ko) and ":" not in ex["vi"][:15]:
        new = PREFIX.sub("", new)
    new = SPACE.sub(r"\1", new)
    if new != ko:
        for x in targets(w):
            if (x.get("ex") or {}).get("vi") == ex["vi"]:
                x["ex"] = {"vi": ex["vi"], "ko": new}
gp.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
print("예문 고침", n, "· CJK 섞인 한국어:", [w["vi"] for w in ch if re.search(r"[一-鿿぀-ヿ]", (w.get("ex") or {}).get("ko", ""))])

idxp = ROOT / "data/audio_index.json"
idx = json.loads(idxp.read_text(encoding="utf-8"))
need = list(dict.fromkeys([t for w in ch for t in (w["vi"], (w.get("ex") or {}).get("vi")) if t and (t not in idx or idx[t] != k12(t) or not all((ROOT / f"audio/{v}/n/{k12(t)}.mp3").exists() and (ROOT / f"audio/{v}/n/{k12(t)}.mp3").stat().st_size > 3000 for v in VOICES))]))
print("소리를 만들 텍스트", len(need))


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
    for t in need:
        for v in VOICES:
            if not await make(t, v):
                bad.append((v, t))
    return bad
bad = asyncio.run(run())
for t in need:
    if all((ROOT / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES):
        idx[t] = k12(t)
idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
pathlib.Path(sys.argv[2]).with_suffix(".need.json").write_text(json.dumps(need, ensure_ascii=False), encoding="utf-8") if len(sys.argv) > 2 else None
print("소리 실패", bad, "· 목록에 올림", len(need) - len(bad))
