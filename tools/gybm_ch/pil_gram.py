"""문법 용어 그림을 직접 그린다 — 글자가 깨지는 FLUX 대신. 결과: <dir>/imgnew/<slug>.webp (검수 뒤 install_imgs 가 옮김)"""
import hashlib, pathlib, random
from PIL import Image, ImageDraw, ImageFont
SP = pathlib.Path(__file__).resolve().parent
S = 384
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
INK = (52, 58, 78); BLUE = (30, 110, 235); PALE = (226, 236, 255); RED = (226, 76, 76); GOLD = (250, 196, 70)
GREEN = (60, 170, 110); GREY = (235, 238, 245); MID = (150, 158, 178)
F = lambda n: ImageFont.truetype(BOLD, n)
slug = lambda vi: hashlib.sha1(vi.encode()).hexdigest()[:10]
def cv():
    im = Image.new("RGB", (S, S), "white"); return im, ImageDraw.Draw(im)
def tw(d, t, f): return d.textlength(t, font=f)
def save(im, d, vi):
    p = SP / d / "imgnew" / f"{slug(vi)}.webp"; im.save(p, "WEBP", quality=88, method=6); print("저장", d, vi)
def chips(d, words, y, hi=(), fs=34, gap=10, fill=GREY, hifill=BLUE, w_max=360):
    f = F(fs); ws = [tw(d, w, f) + 26 for w in words]
    tot = sum(ws) + gap * (len(words) - 1); x = (S - tot) / 2
    for i, (w, wd) in enumerate(zip(words, ws)):
        on = i in hi
        d.rounded_rectangle((x, y, x + wd, y + fs + 24), radius=14, fill=hifill if on else fill, outline=INK, width=3)
        d.text((x + wd / 2, y + (fs + 24) / 2), w, font=f, fill="white" if on else INK, anchor="mm"); x += wd + gap
def sentence(d, words, y, hi=(), fs=40, color_hi=BLUE, line=True):
    f = F(fs); sp = fs * 0.35
    tot = sum(tw(d, w, f) for w in words) + sp * (len(words) - 1); x = (S - tot) / 2; pos = []
    for i, w in enumerate(words):
        d.text((x, y), w, font=f, fill=color_hi if i in hi else INK); pos.append((x, x + tw(d, w, f))); x += tw(d, w, f) + sp
    return pos

# 1) từ — 낱말 하나를 칩으로 뽑아 보임
im, d = cv(); chips(d, ["Tôi", "học", "tiếng Việt"], 170, hi=(1,), fs=32)
d.polygon([(192, 148), (176, 128), (208, 128)], fill=RED)
d.text((192, 96), "từ", font=F(60), fill=RED, anchor="mm"); save(im, "ch1img", "từ")
# 2) từ ngữ — 여러 낱말·표현
im, d = cv()
for i, (w, c) in enumerate([("xin chào", BLUE), ("cảm ơn", GREEN), ("tạm biệt", RED), ("tiếng Việt", GOLD)]):
    f = F(34); wd = tw(d, w, f) + 34; x = (S - wd) / 2 + (-30 if i % 2 == 0 else 30); y = 60 + i * 72
    d.rounded_rectangle((x, y, x + wd, y + 58), radius=28, fill=c, outline=INK, width=3); d.text((x + wd / 2, y + 29), w, font=f, fill="white" if c != GOLD else INK, anchor="mm")
save(im, "ch1img", "từ ngữ")
# 3) câu — 문장 하나(마침표로 끝)
im, d = cv(); pos = sentence(d, ["Tôi", "học", "tiếng", "Việt."], 150, fs=36)
x0, x1 = pos[0][0], pos[-1][1]
d.line((x0, 210, x0, 226, x1, 226, x1, 210), fill=RED, width=6)
d.text((S / 2, 262), "câu", font=F(64), fill=RED, anchor="mm"); d.ellipse((x1 - 14, 190 - 20, x1 - 4, 190 - 10), fill=RED) if False else None
save(im, "ch1img", "câu")
# 4) trợ từ — 문장 끝 조사(nhé)
im, d = cv(); pos = sentence(d, ["Anh", "đi", "nhé!"], 130, hi=(2,), fs=54)
x0, x1 = pos[2]; d.rounded_rectangle((x0 - 8, 118, x1 + 8, 206), radius=16, outline=BLUE, width=5)
d.text((S / 2, 275), "trợ từ", font=F(50), fill=BLUE, anchor="mm"); save(im, "ch3", "trợ từ")
# 5) phụ từ — 앞에 붙는 낱말(đã/rất/sẽ)
im, d = cv(); pos = sentence(d, ["Em", "rất", "vui."], 130, hi=(1,), fs=54)
x0, x1 = pos[1]; d.rounded_rectangle((x0 - 8, 118, x1 + 8, 206), radius=16, outline=GREEN, width=5)
d.text((S / 2, 275), "phụ từ", font=F(50), fill=GREEN, anchor="mm"); save(im, "ch3", "phụ từ")
# 6) hơi — 약간(눈금이 조금만 찬 컵)
im, d = cv()
d.polygon([(110, 90), (274, 90), (250, 320), (134, 320)], fill="white", outline=INK); d.line([(110, 90), (274, 90), (250, 320), (134, 320), (110, 90)], fill=INK, width=7)
d.polygon([(131, 262), (253, 262), (250, 320), (134, 320)], fill=(120, 175, 255))
for yy in (140, 190, 240): d.line((286, yy, 320, yy), fill=MID, width=5)
d.text((192, 60), "hơi", font=F(44), fill=BLUE, anchor="mm"); save(im, "ch5", "hơi")
# 7) mẩu — 종이 조각
im, d = cv(); rnd = random.Random(7)
pts = [(110, 130), (150, 118), (200, 132), (250, 120), (282, 150), (270, 205), (285, 250), (240, 268), (190, 254), (140, 270), (112, 236), (124, 190)]
d.polygon(pts, fill=(255, 246, 214)); d.line(pts + [pts[0]], fill=INK, width=6)
for i, yy in enumerate((170, 200, 228)): d.line((140, yy, 236 - i * 20, yy), fill=MID, width=6)
save(im, "ch5", "mẩu")
# 8) chương trình — 행사 일정판
im, d = cv(); d.rounded_rectangle((44, 40, 340, 344), radius=22, fill="white", outline=INK, width=6)
d.rounded_rectangle((44, 40, 340, 108), radius=22, fill=BLUE, outline=INK, width=6); d.rectangle((50, 80, 334, 108), fill=BLUE)
d.text((192, 74), "CHƯƠNG TRÌNH", font=F(30), fill="white", anchor="mm")
for i, (t, c) in enumerate([("8:00", RED), ("9:30", GREEN), ("11:00", GOLD)]):
    y = 132 + i * 68; d.rounded_rectangle((66, y, 158, y + 48), radius=12, fill=c, outline=INK, width=3)
    d.text((112, y + 24), t, font=F(28), fill="white" if c != GOLD else INK, anchor="mm"); d.line((176, y + 24, 316, y + 24), fill=MID, width=8)
save(im, "ch6", "chương trình")
# 9) đơn giản — 곧은 길 하나(위) vs 엉킨 선(아래, 흐림)
im, d = cv()
d.ellipse((50, 100, 86, 136), fill=BLUE, outline=INK, width=4); d.ellipse((298, 100, 334, 136), fill=GREEN, outline=INK, width=4)
d.line((90, 118, 292, 118), fill=INK, width=9); d.polygon([(292, 104), (316, 118), (292, 132)], fill=INK)
d.text((192, 186), "✔", font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 60), fill=GREEN, anchor="mm")
rr = random.Random(3); pt = [(60, 270)]
for _ in range(14): pt.append((rr.randint(60, 320), rr.randint(240, 340)))
pt.append((324, 300)); d.line(pt, fill=(205, 208, 220), width=6, joint="curve")
d.line((150, 250, 234, 336), fill=RED, width=9); d.line((234, 250, 150, 336), fill=RED, width=9)
save(im, "ch6", "đơn giản")
# 10) gạch dưới — 밑줄
im, d = cv(); pos = sentence(d, ["Tiếng", "Việt", "hay"], 130, hi=(1,), fs=46)
x0, x1 = pos[1]; d.line((x0 - 4, 200, x1 + 4, 200), fill=RED, width=9)
d.polygon([((x0 + x1) / 2, 230), ((x0 + x1) / 2 - 14, 252), ((x0 + x1) / 2 + 14, 252)], fill=RED)
save(im, "ch7", "gạch dưới")
# 11) đầu câu — 문장의 맨 앞
im, d = cv(); pos = sentence(d, ["Hôm", "nay", "trời", "đẹp."], 150, hi=(0,), fs=36)
x0, x1 = pos[0]; d.rounded_rectangle((x0 - 8, 136, x1 + 8, 214), radius=14, outline=RED, width=6)
d.polygon([((x0 + x1) / 2, 118), ((x0 + x1) / 2 - 16, 90), ((x0 + x1) / 2 + 16, 90)], fill=RED)
d.line((x0 - 8, 236, pos[-1][1] + 8, 236), fill=MID, width=3); save(im, "ch7", "đầu câu")
# 12) vế — 문장을 두 토막(vế 1 · vế 2)
im, d = cv(); pos = sentence(d, ["Trời", "mưa,", "tôi", "ở", "nhà."], 150, fs=34)
for a, b, c, t in [(0, 1, BLUE, "vế 1"), (2, 4, GREEN, "vế 2")]:
    x0, x1 = pos[a][0], pos[b][1]; d.line((x0, 210, x0, 226, x1, 226, x1, 210), fill=c, width=6); d.text(((x0 + x1) / 2, 262), t, font=F(36), fill=c, anchor="mm")
save(im, "ch10", "vế")
# 13) cây số — 이정표(km)
im, d = cv()
d.rectangle((0, 300, S, S), fill=(214, 226, 200)); d.line((0, 300, S, 300), fill=INK, width=4)
d.rounded_rectangle((110, 70, 274, 320), radius=60, fill=(245, 247, 250), outline=INK, width=7)
d.rectangle((111, 180, 273, 320), fill=(245, 247, 250)); d.line((110, 180, 110, 320), fill=INK, width=7); d.line((274, 180, 274, 320), fill=INK, width=7); d.line((110, 320, 274, 320), fill=INK, width=7)
d.rectangle((110, 130, 274, 200), fill=RED); d.text((192, 165), "KM", font=F(48), fill="white", anchor="mm")
d.text((192, 250), "15", font=F(64), fill=INK, anchor="mm"); save(im, "ch12", "cây số")
