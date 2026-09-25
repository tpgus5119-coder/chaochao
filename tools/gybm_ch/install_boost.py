"""boost/imgnew·job/imgnew 의 그림을 img/ 로 옮긴다: bo-<해시>.webp(일상 보강) · jb-<해시>.webp(직무 보강). 그 뒤 build_boost.py·build_job_boost.py 를 다시 돌려 img 필드를 채운다."""
import hashlib, json, pathlib, shutil, sys
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"; SP = pathlib.Path(__file__).resolve().parent
slug = lambda s: hashlib.sha1(s.encode()).hexdigest()[:10]
n = miss = 0
for kind, pre, dat in (("boost", "bo", "_boost_words"), ("job", "jb", "_job_boost")):
    d = json.loads((ROOT / f"data/{dat}.json").read_text(encoding="utf-8"))
    words = [w["vi"] for s in (d.get("sessions") or []) for w in s["words"]] + [w["vi"] for t in (d.get("tracks") or {}).values() for w in t]
    for vi in words:
        src = SP / kind / "imgnew" / f"{slug(vi)}.webp"
        if src.exists(): shutil.copyfile(src, ROOT / "img" / f"{pre}-{slug(vi)}.webp"); n += 1
        else: miss += 1; print("그림 없음", kind, vi)
print("옮김", n, "· 없음", miss)
