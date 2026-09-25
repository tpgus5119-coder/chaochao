"""<dir>/*.webp (파일명=sha1(vi)[:10]) 를 img/ 로 옮기고 메인 출처에서 그림 없는 같은 낱말에 잇는다. 사용: install_extra.py <dir> <label> [--dry]"""
import hashlib, json, pathlib, shutil, sys
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"; D = pathlib.Path(sys.argv[1]); label = sys.argv[2]; dry = "--dry" in sys.argv
slug = lambda s: hashlib.sha1(s.encode()).hexdigest()[:10]
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
byslug = {}
for s in g["sources"]:
    if s["key"] != "main": continue
    for l in s["lessons"]:
        for w in l["words"]:
            byslug.setdefault(slug(w["vi"]), []).append(w)
n = 0
for f in sorted(D.glob("*.webp")):
    ws = byslug.get(f.stem)
    if not ws: print("주인 없음", f.name); continue
    vi = ws[0]["vi"]; tgt = f"w-{slug(label + ':' + vi)}.webp"
    todo = [w for w in ws if not w.get("img")]
    if not todo: print("이미 그림 있음", vi); continue
    if not dry:
        shutil.copyfile(f, ROOT / "img" / tgt)
        for w in todo: w["img"] = tgt
    n += 1; print("설치", vi, tgt, len(todo))
if not dry: (ROOT / "data/gybm.json").write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
print("설치", n)
