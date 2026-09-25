"""imgnew/ 의 구운 그림을 낱말 이름과 함께 촘촘한 밑그림표로 만든다. 사용: python3 sheet_imgnew_g.py <폴더> <출력폴더> [--redo=낱말,...]
img_jobs.json 의 낱말 → <해시>.webp, install_imgs.py 안의 staged["낱말"] = OUT / "파일" 줄 → 손으로 그린 판."""
import hashlib, json, pathlib, re, sys
from PIL import Image, ImageDraw, ImageFont
D = pathlib.Path(sys.argv[1]).resolve(); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
slug = lambda v: hashlib.sha1(v.encode()).hexdigest()[:10]
jobs = json.loads((D / "img_jobs.json").read_text(encoding="utf-8"))
items = {}
for vi in jobs:
    p = D / "imgnew" / f"{slug(vi)}.webp"
    if p.exists(): items[vi] = p
ip = D / "install_imgs.py"
if ip.exists():
    for m in re.finditer(r'staged\["([^"]+)"\]\s*=\s*OUT\s*/\s*(?:f"\{slug\(\'([^\']+)\'\)\}\.webp"|"([^"]+)")', ip.read_text(encoding="utf-8")):
        vi, sl, fn = m.group(1), m.group(2), m.group(3)
        p = D / "imgnew" / (f"{slug(sl)}.webp" if sl else fn)
        if p.exists(): items[vi] = p
fv = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 17)
T, cols, rows = 196, 6, 5
per = cols * rows
lst = list(items.items())
for si in range(0, len(lst), per):
    chunk = lst[si:si + per]
    sheet = Image.new("RGB", (cols * T, rows * (T + 22)), "white")
    d = ImageDraw.Draw(sheet)
    for k, (vi, p) in enumerate(chunk):
        x, y = (k % cols) * T, (k // cols) * (T + 22)
        im = Image.open(p).convert("RGB").resize((T - 6, T - 6))
        sheet.paste(im, (x + 3, y))
        d.text((x + 4, y + T - 4), f"{si + k + 1}. {vi}"[:26], fill="black", font=fv)
    sheet.save(OUT / f"n{si // per + 1:02d}.jpg", quality=80)
print(len(lst), "장 →", (len(lst) + per - 1) // per, "판")
json.dump(list(items), open(OUT / "order.json", "w"), ensure_ascii=False)
