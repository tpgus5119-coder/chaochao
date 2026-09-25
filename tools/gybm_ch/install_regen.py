"""공유 그림 새로 굽기 결과 설치: regen/imgnew/<해시>.webp → img/w-<해시(rg:낱말)>.webp, 예전 공유 그림을 쓰던 그 낱말만 새 파일로 잇는다.
사용: python3 install_regen.py [--dry]   (regen/imgnew 에 있는 것만 설치, 나머지는 건너뜀)"""
import hashlib, json, pathlib, shutil, sys
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"; SP = pathlib.Path(__file__).resolve().parent
dry = "--dry" in sys.argv
only = None
for a in sys.argv[1:]:
    if a.startswith("--only-file="): only = set(json.loads(pathlib.Path(a[12:]).read_text(encoding="utf-8")))
slug = lambda s: hashlib.sha1(s.encode()).hexdigest()[:10]
regen = json.loads((SP / "shared_regen.json").read_text(encoding="utf-8"))
byword = {}
for r in regen: byword.setdefault(r["vi"], set()).add(r["old"])
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
extra = {f: json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8")) for f in ("days", "order")}
done = skipped = 0; changed = {"gybm": 0, "days": 0, "order": 0}
def fix(o, where, vi, olds, new):
    n = 0
    if isinstance(o, dict):
        if o.get("vi") == vi and o.get("img") in olds: o["img"] = new; n += 1
        for v in o.values(): n += fix(v, where, vi, olds, new)
    elif isinstance(o, list):
        for v in o: n += fix(v, where, vi, olds, new)
    return n
for vi, olds in byword.items():
    if only is not None and vi not in only: continue
    src = SP / "regen/imgnew" / f"{slug(vi)}.webp"
    if not src.exists(): skipped += 1; continue
    new = f"w-{slug('rg:' + vi)}.webp"
    if not dry: shutil.copyfile(src, ROOT / "img" / new)
    n = fix(g, "gybm", vi, olds, new); changed["gybm"] += n
    for f, d in extra.items(): changed[f] += fix(d, f, vi, olds, new)
    done += 1
if not dry:
    (ROOT / "data/gybm.json").write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    for f, d in extra.items():
        if changed[f]: (ROOT / f"data/{f}.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
print("설치한 낱말", done, "· 아직 안 구운 낱말", skipped, "· 바꾼 항목", changed)
