"""imgnew/ 에 구워 눈으로 확인한 그림을 img/ 로 옮기고, gybm.json 의 img 를 잇는다(build_gybm.py 를 돌린 뒤에 한다).
- 그 낱말이 이미 그림 파일을 갖고 있고 그 파일을 (같은 낱말 말고) 다른 낱말이 안 쓰면 → 그 파일을 덮어쓴다(다른 과정에서도 바로 고쳐짐).
- 다른 낱말도 쓰는 파일이면 덮지 않고 새 파일(w-<해시>.webp)을 만들어 이 낱말만 새로 잇는다.
- 그림이 없던 낱말은 새 파일(w-<해시>.webp)을 만들어 잇는다.
사용(일반판): python3 install_imgs_g.py <폴더> <라벨> <과 제목> [--skip=낱말,낱말] [--dry]"""
import hashlib, json, pathlib, shutil, sys, unicodedata

ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
SP = pathlib.Path(sys.argv.pop(1)).resolve()
LABEL = sys.argv.pop(1)
TITLE = sys.argv.pop(1)
OUT = SP / "imgnew"
nfc = lambda s: unicodedata.normalize("NFC", s)
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
skip = set()
dry = False
for a in sys.argv[1:]:
    if a.startswith("--skip="):
        skip = set(a[7:].split(","))
    if a == "--dry":
        dry = True

jobs = json.loads((SP / "img_jobs.json").read_text(encoding="utf-8"))
staged = {vi: OUT / f"{slug(vi)}.webp" for vi in jobs}

gp = ROOT / "data/gybm.json"
g = json.loads(gp.read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
ch2 = {w["vi"]: w for l in main["lessons"] if (l["title"] == TITLE or l["title"].startswith(TITLE + " · ")) for w in l["words"]}

# 파일 → 그 파일을 쓰는 낱말(vi) 모음 (gybm.json 전체 + data/*.json 의 img 값)
users = {}


def walk(o):
    if isinstance(o, dict):
        im = o.get("img")
        if isinstance(im, str) and im.endswith(".webp") and "vi" in o:
            users.setdefault(im, set()).add(nfc(str(o["vi"])).lower())
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)


walk(g)
for p in (ROOT / "data").glob("*.json"):
    if p.name in ("gybm.json",) or p.name.startswith("_"):
        continue
    try:
        walk(json.loads(p.read_text(encoding="utf-8")))
    except Exception:
        pass

report = []
for vi, src in staged.items():
    if vi in skip:
        continue
    if not src.exists():
        report.append((vi, "그림 없음(굽지 못함)", ""))
        continue
    w = ch2[vi]
    cur = w.get("img")
    if cur and (ROOT / "img" / cur).exists() and users.get(cur, set()) <= {nfc(vi).lower()}:
        target, mode = cur, "덮어씀"
    else:
        target = f"w-{slug(LABEL + ':' + vi)}.webp"
        mode = "새 파일" if not cur else f"새 파일(옛 {cur} 는 다른 낱말도 씀: {sorted(users.get(cur, []))[:3]})"
    report.append((vi, mode, target))
    if dry:
        continue
    shutil.copyfile(src, ROOT / "img" / target)
    for s in g["sources"]:
        for l in s["lessons"]:
            for x in l["words"]:
                if x is w or (x["vi"] == vi and x.get("ko") == w["ko"]):
                    x["img"] = target
if not dry:
    gp.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
for r in report:
    print(" ", *r)
