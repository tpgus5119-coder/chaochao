# -*- coding: utf-8 -*-
import hashlib, pathlib, re, sys, unicodedata
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from words import SESSIONS
S = 384
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
INK = (52, 58, 78); BLUE = (30, 110, 235); PALE = (226, 236, 255); RED = (226, 76, 76); GOLD = (250, 196, 70)
GREEN = (60, 170, 110); GREY = (235, 238, 245); MID = (150, 158, 178)
F = lambda n: ImageFont.truetype(BOLD, n)
nfc = lambda s: unicodedata.normalize("NFC", s)
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
OUT = HERE / "imgnew"; OUT.mkdir(exist_ok=True)
def cv():
    im = Image.new("RGB", (S, S), "white"); return im, ImageDraw.Draw(im)
def save(im, vi): im.save(OUT / f"{slug(vi)}.webp", "WEBP", quality=88, method=6)
def norm(t): return re.sub(r"[.,!?;:]", "", nfc(t)).lower()
def bubble(d, x0, y0, x1, y1, tail):
    d.rounded_rectangle((x0, y0, x1, y1), radius=30, fill="white", outline=INK, width=5)
    d.polygon([(tail, y1 + 58), (tail + 30, y1 - 4), (tail - 8, y1 - 4)], fill="white")
    d.line((tail, y1 + 58, tail + 30, y1 - 2), fill=INK, width=5); d.line((tail, y1 + 58, tail - 8, y1 - 2), fill=INK, width=5)
def wrap(d, words, f, maxw):
    lines, cur = [], []
    for w in words:
        t = " ".join(cur + [w])
        if cur and d.textlength(t, font=f) > maxw: lines.append(cur); cur = [w]
        else: cur.append(w)
    if cur: lines.append(cur)
    return lines
def sentence_bubble(vi, exvi):
    im, d = cv(); toks = exvi.split(); key = norm(vi).split()
    hi = set()
    nt = [norm(t) for t in toks]
    for i in range(len(nt) - len(key) + 1):
        if nt[i:i + len(key)] == key: hi = set(range(i, i + len(key))); break
    bx0, by0, bx1, by1 = 20, 40, 364, 250
    bubble(d, bx0, by0, bx1, by1, 110)
    for fs in (44, 38, 34, 30, 27):
        f = F(fs); lines = wrap(d, toks, f, bx1 - bx0 - 36)
        if len(lines) * (fs + 12) <= by1 - by0 - 20: break
    lh = fs + 12; y = (by0 + by1) / 2 - len(lines) * lh / 2 + 4; idx = 0
    for ln in lines:
        w_total = d.textlength(" ".join(ln), font=f); x = (S - w_total) / 2; sp = d.textlength(" ", font=f)
        for w in ln:
            on = idx in hi
            d.text((x, y), w, font=f, fill=BLUE if on else INK)
            wd = d.textlength(w, font=f)
            if on: d.line((x, y + fs + 4, x + wd, y + fs + 4), fill=BLUE, width=5)
            x += wd + sp; idx += 1
        y += lh
    lab = vi if d.textlength(vi, font=F(46)) < 350 else vi
    fl = 46
    while d.textlength(lab, font=F(fl)) > 350: fl -= 2
    d.text((S / 2, 330), lab, font=F(fl), fill=BLUE, anchor="mm"); save(im, vi)
def month(vi, num):
    im, d = cv()
    d.rounded_rectangle((60, 60, 324, 330), radius=26, fill="white", outline=INK, width=6)
    d.rounded_rectangle((60, 60, 324, 140), radius=26, fill=RED, outline=INK, width=6); d.rectangle((66, 112, 318, 140), fill=RED)
    for x in (120, 264): d.rounded_rectangle((x - 8, 36, x + 8, 80), radius=8, fill=MID, outline=INK, width=3)
    d.text((192, 100), "tháng", font=F(44), fill="white", anchor="mm")
    d.text((192, 235), str(num), font=F(120 if num < 10 else 100), fill=INK, anchor="mm"); save(im, vi)
def days3(vi, hi):
    im, d = cv(); names = ["hôm nay", "ngày mai", "ngày kia"]
    for i, n in enumerate(names):
        x = 20 + i * 118; on = i == hi
        d.rounded_rectangle((x, 130, x + 108, 250), radius=18, fill=BLUE if on else GREY, outline=INK, width=4)
        d.text((x + 54, 165), str(i + 1) if False else ["●", "▶", "▶▶"][i], font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 34), fill="white" if on else MID, anchor="mm")
        for j, w in enumerate(n.split()): d.text((x + 54, 205 + j * 26), w, font=F(24), fill="white" if on else INK, anchor="mm")
    d.polygon([(20 + hi * 118 + 54, 118), (20 + hi * 118 + 36, 90), (20 + hi * 118 + 72, 90)], fill=RED)
    d.text((S / 2, 320), vi, font=F(46), fill=BLUE, anchor="mm"); save(im, vi)
def today(vi):
    im, d = cv()
    d.rounded_rectangle((70, 60, 314, 300), radius=24, fill="white", outline=INK, width=6)
    d.rounded_rectangle((70, 60, 314, 130), radius=24, fill=GOLD, outline=INK, width=6); d.rectangle((76, 104, 308, 130), fill=GOLD)
    d.ellipse((160, 145, 224, 209), fill=GOLD, outline=INK, width=4)
    for a in range(0, 360, 45):
        import math
        r1, r2 = 40, 58; x, y = 192, 177
        d.line((x + r1 * math.cos(math.radians(a)), y + r1 * math.sin(math.radians(a)), x + r2 * math.cos(math.radians(a)), y + r2 * math.sin(math.radians(a))), fill=GOLD, width=6)
    d.text((192, 100), "hôm nay", font=F(38), fill=INK, anchor="mm")
    d.text((192, 255), "ngày hôm nay", font=F(30), fill=BLUE, anchor="mm"); save(im, vi)
def pointing(vi, kind):
    im, d = cv()
    if kind == "gi":
        d.rounded_rectangle((110, 120, 274, 270), radius=20, fill=PALE, outline=INK, width=6); d.text((192, 195), "?", font=F(120), fill=RED, anchor="mm")
    elif kind == "này":
        d.rounded_rectangle((90, 140, 290, 290), radius=22, fill=(200, 224, 255), outline=INK, width=6)
        d.polygon([(190, 130), (166, 86), (214, 86)], fill=RED); d.rectangle((182, 40, 198, 90), fill=RED)
    else:
        d.rounded_rectangle((250, 130, 330, 210), radius=12, fill=(200, 224, 255), outline=INK, width=5)
        d.line((40, 250, 240, 170), fill=RED, width=9); d.polygon([(250, 165), (222, 150), (226, 186)], fill=RED)
        d.ellipse((30, 240, 60, 270), fill=GOLD, outline=INK, width=4)
    d.text((S / 2, 335), vi, font=F(46), fill=BLUE, anchor="mm"); save(im, vi)
def flag(vi):
    im, d = cv(); d.rectangle((40, 70, 350, 300), fill=(218, 37, 29), outline=INK, width=5); d.rectangle((36, 60, 44, 340), fill=INK)
    import math
    cx, cy, R, r = 195, 185, 70, 28; pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36); rr = R if i % 2 == 0 else r; pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=(255, 235, 0)); save(im, vi)
def timetable(vi):
    im, d = cv(); cols = [RED, BLUE, GREEN, GOLD, (140, 100, 220)]
    d.rounded_rectangle((28, 40, 356, 330), radius=18, fill="white", outline=INK, width=5)
    for j, h in enumerate(["T2", "T3", "T4", "T5", "T6"]): d.text((80 + j * 60, 66), h, font=F(22), fill=INK, anchor="mm")
    import random; rr = random.Random(5)
    for i in range(4):
        for j in range(5):
            if rr.random() < .75: d.rounded_rectangle((52 + j * 60, 92 + i * 58, 52 + j * 60 + 52, 92 + i * 58 + 48), radius=8, fill=cols[rr.randrange(5)])
    save(im, vi)
EX = {w[0]: w[2] for th, ws in SESSIONS for w in ws}
MONTH = {"tháng một": 1, "tháng hai": 2, "tháng ba": 3, "tháng tư": 4, "tháng năm": 5, "tháng sáu": 6, "tháng bảy": 7, "tháng tám": 8, "tháng chín": 9, "tháng mười": 10, "tháng mười một": 11, "tháng mười hai": 12}
for vi, n in MONTH.items(): month(vi, n)
days3("ngày kia", 2); today("ngày hôm nay")
pointing("cái gì", "gi"); pointing("cái này", "này"); pointing("cái kia", "kia")
flag("quốc kỳ"); timetable("thời khóa biểu")
done = set(MONTH) | {"ngày kia", "ngày hôm nay", "cái gì", "cái này", "cái kia", "quốc kỳ", "thời khóa biểu"}
from flux_jobs import JOBS
for vi, ex in EX.items():
    if vi in done or vi in JOBS: continue
    sentence_bubble(vi, ex)
print("PIL 끝", len(list(OUT.glob("*.webp"))))
