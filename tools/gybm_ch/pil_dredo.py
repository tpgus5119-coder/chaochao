import hashlib, pathlib, math
from PIL import Image, ImageDraw, ImageFont
exec(open("pil_gram.py",encoding="utf-8").read().split("# 1) từ")[0])
OUTD = pathlib.Path("dredo/imgnew")
def sv(vi, im): im.save(OUTD / f"{slug(vi)}.webp", "WEBP", quality=88, method=6); print("저장", vi)
def paper(d, x0=70, y0=40, x1=314, y1=344): d.rounded_rectangle((x0, y0, x1, y1), radius=16, fill="white", outline=INK, width=6)
# tên — 이름표
im, d = cv(); d.rounded_rectangle((60, 80, 324, 300), radius=22, fill="white", outline=INK, width=6)
d.rounded_rectangle((60, 80, 324, 150), radius=22, fill=RED, outline=INK, width=6); d.rectangle((66, 124, 318, 150), fill=RED)
d.text((192, 115), "TÊN", font=F(44), fill="white", anchor="mm"); d.text((192, 228), "Minh", font=F(72), fill=INK, anchor="mm"); sv("tên", im)
# bao nhiêu — 가격표 '? đ'
im, d = cv(); d.polygon([(90, 130), (250, 130), (300, 192), (250, 254), (90, 254)], fill=(255, 250, 235), outline=INK); d.line([(90, 130), (250, 130), (300, 192), (250, 254), (90, 254), (90, 130)], fill=INK, width=6)
d.ellipse((248, 178, 274, 204), fill="white", outline=INK, width=4); d.text((170, 192), "? đ", font=F(78), fill=RED, anchor="mm"); d.line((120, 130, 120, 60), fill=INK, width=5); sv("bao nhiêu", im)
# cước phí — 통신 요금 청구서
im, d = cv(); paper(d); d.rounded_rectangle((170, 62, 214, 118), radius=8, fill=(200, 224, 255), outline=INK, width=4); d.ellipse((186, 100, 198, 112), fill=INK)
for k in range(3): d.line((100, 150 + k * 34, 284, 150 + k * 34), fill=MID, width=7)
d.text((192, 290), "₫", font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 76), fill=RED, anchor="mm"); sv("cước phí", im)
# đăng ký — 신청서
im, d = cv(); paper(d); d.text((192, 82), "ĐĂNG KÝ", font=F(34), fill=BLUE, anchor="mm")
for k in range(3):
    y = 130 + k * 46; d.rounded_rectangle((96, y, 124, y + 28), radius=5, outline=INK, width=4); d.line((136, y + 14, 270, y + 14), fill=MID, width=7)
d.line((104, 130 + 4, 116, 130 + 22), fill=GREEN, width=6); d.line((116, 152, 130, 128), fill=GREEN, width=6)
d.line((110, 300, 270, 300), fill=INK, width=4); sv("đăng ký", im)
# hợp đồng — 계약서
im, d = cv(); paper(d); d.text((192, 80), "HỢP ĐỒNG", font=F(32), fill=INK, anchor="mm")
for k in range(4): d.line((100, 122 + k * 30, 284 - (k % 2) * 30, 122 + k * 30), fill=MID, width=7)
d.line((110, 290, 150, 268, 170, 296, 200, 262, 250, 292), fill=BLUE, width=5); d.rounded_rectangle((238, 250, 300, 268), radius=8, fill=GOLD, outline=INK, width=3); sv("hợp đồng", im)
# tài khoản — 통장
im, d = cv(); d.rounded_rectangle((70, 70, 314, 320), radius=18, fill=(205, 225, 255), outline=INK, width=6); d.rectangle((70, 70, 96, 320), fill=BLUE)
d.text((205, 110), "TÀI KHOẢN", font=F(30), fill=INK, anchor="mm"); d.rounded_rectangle((122, 150, 202, 200), radius=8, fill=GOLD, outline=INK, width=3)
for k in range(3): d.line((122, 230 + k * 24, 290 - (k % 2) * 50, 230 + k * 24), fill=INK, width=5); sv("tài khoản", im)
# giấy phép lao động — 신분증
im, d = cv(); d.rounded_rectangle((50, 60, 334, 324), radius=22, fill="white", outline=INK, width=6); d.rectangle((50, 60, 334, 116), fill=BLUE)
d.text((192, 80), "GIẤY PHÉP", font=F(24), fill="white", anchor="mm"); d.text((192, 102), "LAO ĐỘNG", font=F(24), fill="white", anchor="mm")
d.rounded_rectangle((72, 138, 172, 262), radius=10, fill=GREY, outline=INK, width=3); d.ellipse((100, 152, 144, 196), fill=MID); d.pieslice((84, 198, 160, 270), 180, 360, fill=MID)
for k in range(4): d.line((190, 150 + k * 30, 316, 150 + k * 30), fill=MID, width=7)
d.rectangle((72, 284, 316, 304), fill=(230, 235, 245)); sv("giấy phép lao động", im)
# rẻ — 싼 가격표(내림 화살표)
im, d = cv(); d.polygon([(60, 110), (240, 110), (300, 192), (240, 274), (60, 274)], fill=(232, 250, 238), outline=INK); d.line([(60, 110), (240, 110), (300, 192), (240, 274), (60, 274), (60, 110)], fill=INK, width=6)
d.ellipse((246, 178, 272, 204), fill="white", outline=INK, width=4); d.text((150, 175), "50.000đ", font=F(40), fill=INK, anchor="mm"); d.polygon([(120, 300), (180, 300), (150, 348)], fill=GREEN); d.rectangle((136, 236, 164, 300), fill=GREEN); sv("rẻ", im)
# đơn thuốc — Rx
im, d = cv(); paper(d, 80, 40, 304, 340); d.text((120, 90), "Rx", font=F(64), fill=RED, anchor="mm")
for k in range(5): d.line((110, 150 + k * 32, 274 - (k % 2) * 40, 150 + k * 32), fill=MID, width=7)
d.rounded_rectangle((110, 300, 170, 322), radius=11, fill=BLUE, outline=INK, width=3); d.ellipse((240, 268, 280, 308), fill=RED, outline=INK, width=3); sv("đơn thuốc", im)
# bảo hiểm y tế — 보험 카드
im, d = cv(); d.rounded_rectangle((36, 96, 348, 288), radius=22, fill=(226, 246, 238), outline=INK, width=6); d.rectangle((36, 96, 348, 150), fill=GREEN)
d.text((192, 124), "BẢO HIỂM Y TẾ", font=F(28), fill="white", anchor="mm"); d.rectangle((70, 184, 112, 246), fill=RED); d.rectangle((58, 204, 124, 226), fill=RED)
d.rectangle((84, 192, 100, 238), fill="white"); d.rectangle((66, 206, 118, 222), fill="white")
for k in range(3): d.line((150, 190 + k * 26, 320 - (k % 2) * 50, 190 + k * 26), fill=MID, width=7)
sv("bảo hiểm y tế", im)
# hạn — 마감일 달력
im, d = cv(); d.rounded_rectangle((60, 60, 324, 330), radius=22, fill="white", outline=INK, width=6); d.rounded_rectangle((60, 60, 324, 122), radius=22, fill=RED, outline=INK, width=6); d.rectangle((66, 100, 318, 122), fill=RED)
for i in range(4):
    for j in range(5):
        x = 84 + j * 46; y = 140 + i * 44; d.rounded_rectangle((x, y, x + 34, y + 34), radius=7, fill=GREY)
d.ellipse((222, 216, 274, 268), outline=RED, width=7); d.polygon([(186, 318), (204, 290), (222, 318)], fill=RED); d.text((204, 308), "!", font=F(24), fill="white", anchor="mm"); sv("hạn", im)
# kế hoạch — 체크리스트
im, d = cv(); paper(d); d.rounded_rectangle((140, 26, 244, 64), radius=10, fill=MID, outline=INK, width=4); d.text((192, 92), "KẾ HOẠCH", font=F(32), fill=BLUE, anchor="mm")
for k in range(4):
    y = 128 + k * 50; d.rounded_rectangle((96, y, 126, y + 30), radius=5, outline=INK, width=4); d.line((100, y + 16, 108, y + 26), fill=GREEN, width=6); d.line((108, y + 26, 124, y + 4), fill=GREEN, width=6); d.line((142, y + 15, 280, y + 15), fill=MID, width=7)
sv("kế hoạch", im)
# hồ sơ — 서류철
im, d = cv(); d.polygon([(50, 130), (150, 130), (172, 100), (334, 100), (334, 320), (50, 320)], fill=GOLD, outline=INK); d.line([(50, 130), (150, 130), (172, 100), (334, 100), (334, 320), (50, 320), (50, 130)], fill=INK, width=6)
d.rectangle((84, 62, 300, 150), fill="white", outline=INK, width=4); d.rectangle((94, 76, 300, 166), fill="white", outline=INK, width=4)
d.rounded_rectangle((50, 170, 334, 320), radius=12, fill=(255, 214, 110), outline=INK, width=6); d.text((192, 244), "HỒ SƠ", font=F(48), fill=INK, anchor="mm"); sv("hồ sơ", im)
# giấy phép — 증서
im, d = cv(); d.rounded_rectangle((36, 70, 348, 314), radius=14, fill=(255, 251, 238), outline=INK, width=6); d.rounded_rectangle((52, 86, 332, 298), radius=8, outline=GOLD, width=4)
d.text((192, 126), "GIẤY PHÉP", font=F(38), fill=INK, anchor="mm")
for k in range(3): d.line((90, 168 + k * 24, 294 - (k % 2) * 40, 168 + k * 24), fill=MID, width=6)
d.ellipse((150, 236, 210, 296), fill=RED, outline=INK, width=4); d.polygon([(160, 290), (150, 326), (172, 312), (190, 326), (196, 290)], fill=RED); sv("giấy phép", im)
# thời tiết — 해+구름+온도계
im, d = cv(); d.ellipse((90, 90, 190, 190), fill=GOLD, outline=INK, width=5)
for a in range(0, 360, 40): d.line((140 + 62 * math.cos(math.radians(a)), 140 + 62 * math.sin(math.radians(a)), 140 + 82 * math.cos(math.radians(a)), 140 + 82 * math.sin(math.radians(a))), fill=GOLD, width=7)
for (x, y, r) in ((200, 200, 44), (250, 190, 56), (300, 210, 40)): d.ellipse((x - r, y - r, x + r, y + r), fill="white", outline=INK, width=5)
d.rectangle((160, 214, 330, 254), fill="white"); d.rounded_rectangle((60, 226, 84, 330), radius=12, fill="white", outline=INK, width=4); d.ellipse((50, 314, 94, 358), fill=RED, outline=INK, width=4); d.rectangle((66, 262, 78, 322), fill=RED); sv("thời tiết", im)
