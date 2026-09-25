import hashlib, io, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path.home() / "짜오짜오/베트남어-어플/tools"))
import gen_word_img as G
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
SUFFIX = ", Flat vector illustration, bold black outlines, flat pastel fill, one centered subject, plain white background"
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
JOBS = {"bến xe": "A bus terminal with several intercity buses parked under a wide roof",
"về": "A person walking home with a bag toward a house at sunset",
"siêu thị": "A supermarket interior with shopping carts and full shelves",
"đá": "Ice cubes in a clear glass",
"quán nhậu": "A lively beer garden restaurant with friends toasting glasses at a table",
"nóng": "A sweating person in a t-shirt fanning himself under a hot bright sun",
"vận hành": "A worker pressing a green start button on a factory control panel",
"hải quan": "An airport customs officer checking a traveler's suitcase at a counter",
"phạt": "A referee holding up a yellow card",
"chậm trễ": "A snail crawling slowly next to a big clock"}
rnd = int(sys.argv[1]) if len(sys.argv) > 1 else 1
t0 = time.time()
for i, (vi, p) in enumerate(JOBS.items(), 1):
    out = HERE / "imgnew" / f"{slug(vi)}.webp"
    if out.exists(): continue
    try:
        png = G.make(p + SUFFIX, G.seed_of(f"dredo:{vi}:{rnd}"))
        Image.open(io.BytesIO(png)).convert("RGB").resize((384, 384), Image.LANCZOS).save(out, "WEBP", quality=82, method=6); print(f"[{i}] {vi} 만듦 ({time.time()-t0:.0f}s)", flush=True)
    except Exception as e: print(f"[{i}] {vi} 실패 {e}", flush=True)
print("끝", flush=True)
