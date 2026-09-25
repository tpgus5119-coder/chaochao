import hashlib, json, pathlib, sys
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]
fix = "--fix" in sys.argv
idxp = ROOT / "data/audio_index.json"; idx = json.loads(idxp.read_text(encoding="utf-8"))
texts = {}
def walk(o, tag):
    if isinstance(o, dict):
        if isinstance(o.get("vi"), str) and "ko" in o:
            texts.setdefault(o["vi"], tag)
            ex = o.get("ex")
            if isinstance(ex, dict) and isinstance(ex.get("vi"), str): texts.setdefault(ex["vi"], tag)
        for v in o.values(): walk(v, tag)
    elif isinstance(o, list):
        for v in o: walk(v, tag)
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
for s in g["sources"]: walk(s, "gybm:" + s["key"])
for f in ("days", "order"): walk(json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8")), f)
miss_idx = miss_file = fixed = 0; bad = []
for t, tag in texts.items():
    ok = all((ROOT / f"audio/{v}/n/{k12(t)}.mp3").exists() and (ROOT / f"audio/{v}/n/{k12(t)}.mp3").stat().st_size > 3000 for v in "fm")
    if not ok: miss_file += 1; bad.append((tag, t)); continue
    if idx.get(t) != k12(t):
        miss_idx += 1
        if fix: idx[t] = k12(t); fixed += 1
if fix: idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
print("텍스트", len(texts), "· 파일 부족", miss_file, "· 목록 빠짐", miss_idx, "· 고침", fixed)
for b in bad[:20]: print(b)
