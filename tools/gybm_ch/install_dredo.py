"""dredo/imgnew/<해시(낱말)>.webp 를 img/rv-<해시>.webp 로 옮기고 days.json·order.json 의 그 낱말 그림을 잇는다(정확히 같은 vi 만)."""
import hashlib, json, pathlib, shutil
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"; SP = pathlib.Path(__file__).resolve().parent
slug = lambda s: hashlib.sha1(s.encode()).hexdigest()[:10]
docs = {f: json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8")) for f in ("days", "order")}
done = 0; changed = {"days": 0, "order": 0}
def fix(o, vi, new):
    n = 0
    if isinstance(o, dict):
        if o.get("vi") == vi and "img" in o: o["img"] = new; n += 1
        for v in o.values(): n += fix(v, vi, new)
    elif isinstance(o, list):
        for v in o: n += fix(v, vi, new)
    return n
words = set()
for f in (SP / "dredo/imgnew").glob("*.webp"): words.add(f.stem)
# 낱말 목록: days/order 에 있는 vi 를 해시로 되짚는다
seen = {}
def collect(o):
    if isinstance(o, dict):
        if isinstance(o.get("vi"), str) and "img" in o: seen.setdefault(slug(o["vi"]), o["vi"])
        for v in o.values(): collect(v)
    elif isinstance(o, list):
        for v in o: collect(v)
for d in docs.values(): collect(d)
for h in sorted(words):
    vi = seen.get(h)
    if not vi: print("주인 없음", h); continue
    new = f"rv-{h}.webp"; shutil.copyfile(SP / "dredo/imgnew" / f"{h}.webp", ROOT / "img" / new)
    for f, d in docs.items(): changed[f] += fix(d, vi, new)
    done += 1; print("설치", vi, new)
for f, d in docs.items():
    if changed[f]: (ROOT / f"data/{f}.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
print("설치한 낱말", done, changed)
