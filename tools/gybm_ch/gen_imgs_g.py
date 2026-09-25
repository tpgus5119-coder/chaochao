"""(일반판) 그림 굽기 — 사용: python3 gen_imgs_g.py <폴더> <라벨> [round] [--only=..]
2과 그림 굽기 — Draw Things(FLUX schnell 4단계). 바로 img/ 에 덮지 않고 imgnew/ 에 먼저 굽는다(눈으로 본 뒤 옮김).
사용: python3 gen_imgs.py [round]   (round>=2 이면 씨앗을 바꿔 다시 굽는다. 이미 imgnew 에 있으면 건너뜀. --only 낱말,낱말)"""
import hashlib, io, json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path.home() / "짜오짜오/베트남어-어플/tools"))
import gen_word_img as G
from PIL import Image

SP = pathlib.Path(sys.argv.pop(1)).resolve()
LABEL = sys.argv.pop(1)
OUT = SP / "imgnew"
SUFFIX = ", Flat vector illustration, bold black outlines, flat pastel fill, one centered subject, plain white background"
jobs = json.loads((SP / "img_jobs.json").read_text(encoding="utf-8"))
rnd = 1
only = None
for a in sys.argv[1:]:
    if a.startswith("--only="):
        only = set(a[7:].split(","))
    else:
        rnd = int(a)
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
t0 = time.time()
made = fail = 0
items = [(vi, p) for vi, p in jobs.items() if not only or vi in only]
for i, (vi, prompt) in enumerate(items, 1):
    out = OUT / f"{slug(vi)}.webp"
    if out.exists() and not only:
        continue
    seed = G.seed_of(f"{LABEL}:{vi}:{rnd}")
    try:
        png = G.make(prompt + SUFFIX, seed)
        im = Image.open(io.BytesIO(png)).convert("RGB").resize((384, 384), Image.LANCZOS)
        im.save(out, "WEBP", quality=82, method=6)
        made += 1
        print(f"[{i}/{len(items)}] {vi} 만듦 ({time.time() - t0:.0f}s)", flush=True)
    except Exception as e:
        fail += 1
        print(f"[{i}/{len(items)}] {vi} 실패 {e}", flush=True)
(OUT / "_map.json").write_text(json.dumps({slug(v): v for v in jobs}, ensure_ascii=False), encoding="utf-8")
print(f"끝. 만듦 {made} · 실패 {fail} · {time.time() - t0:.0f}s", flush=True)
