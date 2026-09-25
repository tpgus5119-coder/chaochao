import hashlib, io, json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path.home() / "짜오짜오/베트남어-어플/tools"))
import gen_word_img as G
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
SP = HERE.parent
SUFFIX = ", Flat vector illustration, bold black outlines, flat pastel fill, one centered subject, plain white background, no text"
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
rnd = int(sys.argv[1]) if len(sys.argv) > 1 else 1
only = set(sys.argv[2][7:].split(",")) if len(sys.argv) > 2 and sys.argv[2].startswith("--only=") else None
P = json.loads((SP / "regen_prompts.json").read_text(encoding="utf-8"))
# 먼저 메인·회화에 쓰이는 낱말(shared_regen 의 src 에 m/d/o 가 있는 것), 그 다음 선배
reg = json.loads((SP / "shared_regen.json").read_text(encoding="utf-8"))
prio = {}
for r in reg:
    prio[r["vi"]] = min(prio.get(r["vi"], 9), 0 if any(s in r["src"] for s in "mdo") else 1)
order = sorted(P, key=lambda w: (prio.get(w, 1), w))
t0 = time.time(); made = 0
items = [w for w in order if not only or w in only]
for i, vi in enumerate(items, 1):
    out = HERE / "imgnew" / f"{slug(vi)}.webp"
    if out.exists() and not only: continue
    try:
        png = G.make(P[vi]["prompt"] + SUFFIX, G.seed_of(f"regen:{vi}:{rnd}"))
        Image.open(io.BytesIO(png)).convert("RGB").resize((384, 384), Image.LANCZOS).save(out, "WEBP", quality=82, method=6)
        made += 1; print(f"[{i}/{len(items)}] {vi} 만듦 ({time.time()-t0:.0f}s)", flush=True)
    except Exception as e:
        print(f"[{i}/{len(items)}] {vi} 실패 {e}", flush=True)
print("끝", made, flush=True)
