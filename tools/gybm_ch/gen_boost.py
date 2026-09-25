import hashlib, io, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path.home() / "짜오짜오/베트남어-어플/tools"))
import gen_word_img as G
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from flux_jobs import JOBS
SUFFIX = ", Flat vector illustration, bold black outlines, flat pastel fill, one centered subject, plain white background"
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
rnd = int(sys.argv[1]) if len(sys.argv) > 1 else 1
only = set(sys.argv[2][7:].split(",")) if len(sys.argv) > 2 and sys.argv[2].startswith("--only=") else None
t0 = time.time(); made = 0
items = [(k, v) for k, v in JOBS.items() if not only or k in only]
for i, (vi, p) in enumerate(items, 1):
    out = HERE / "imgnew" / f"{slug(vi)}.webp"
    if out.exists() and not only: continue
    try:
        png = G.make(p + SUFFIX, G.seed_of(f"boost:{vi}:{rnd}"))
        Image.open(io.BytesIO(png)).convert("RGB").resize((384, 384), Image.LANCZOS).save(out, "WEBP", quality=82, method=6)
        made += 1; print(f"[{i}/{len(items)}] {vi} 만듦 ({time.time()-t0:.0f}s)", flush=True)
    except Exception as e:
        print(f"[{i}/{len(items)}] {vi} 실패 {e}", flush=True)
print("끝", made, flush=True)
