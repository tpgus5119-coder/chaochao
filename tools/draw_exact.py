#!/usr/bin/env python3
"""개수·국기처럼 **정확해야 하는 그림은 AI에게 맡기지 않고 직접 그린다.**

검수에서 드러난 것: 숫자 단어 그림 7장이 전부 개수가 틀렸다(năm=5인데 사과 3개,
chín=9인데 14개). 국기도 4괘가 엉터리였다. 생성 모델은 '정확히 N개'와 '정해진 문양'을
못 그린다 — 이건 프롬프트를 고쳐도 안 된다. 그래서 이 둘만 코드로 그린다.

사용: python3 tools/draw_exact.py
"""
import math, pathlib
from PIL import Image, ImageDraw

R = pathlib.Path(__file__).resolve().parent.parent
IMG = R / 'img'
S = 640
BG = (255, 255, 255)

def apple(dr, cx, cy, r):
    """납작한 사과 하나 — 앱의 플랫 일러스트와 같은 결로."""
    body = (200, 72, 72)
    dr.ellipse([cx - r, cy - r * .92, cx + r, cy + r * 1.05], fill=body)
    dr.ellipse([cx - r * .95, cy - r * .95, cx - r * .1, cy - r * .1],
               fill=(228, 116, 116))                       # 빛 받는 쪽
    dr.line([cx, cy - r * .85, cx + r * .1, cy - r * 1.28], fill=(122, 78, 46), width=max(3, int(r * .13)))
    dr.polygon([(cx + r * .1, cy - r * 1.2), (cx + r * .75, cy - r * 1.4),
                (cx + r * .5, cy - r * .95)], fill=(86, 158, 86))   # 잎

def count_sheet(n, path):
    """정확히 n개. 줄 수는 보기 좋게 나눈다."""
    im = Image.new('RGB', (S, S), BG)
    dr = ImageDraw.Draw(im)
    cols = 1 if n == 1 else 2 if n <= 4 else 3 if n <= 6 else 4 if n <= 8 else 5 if n <= 10 else 5
    rows = math.ceil(n / cols)
    cw, ch = S / cols, (S - 60) / rows
    r = min(cw, ch) * 0.33
    left = n
    for row in range(rows):
        k = min(cols, left)                                 # 마지막 줄은 남은 만큼
        left -= k
        y = 40 + ch * (row + .5)
        x0 = (S - k * cw) / 2 + cw / 2
        for c in range(k):
            apple(dr, x0 + cw * c, y, r)
    im.save(path, 'WEBP', quality=88)

NUM = {'d07-mot': 1, 'd07-hai': 2, 'd07-ba': 3, 'd07-bon': 4, 'd07-nam': 5,
       'd07-sau': 6, 'd07-bay': 7, 'd07-tam': 8, 'd07-chin': 9, 'd07-muoi': 10}

def flag_vn(path):
    """베트남 국기 — 빨강 바탕에 한가운데 노란 오각별."""
    im = Image.new('RGB', (S, S), BG)
    dr = ImageDraw.Draw(im)
    w, h = 520, 347                                        # 3:2
    x0, y0 = (S - w) // 2, (S - h) // 2
    dr.rectangle([x0, y0, x0 + w, y0 + h], fill=(218, 37, 29))
    cx, cy, rr = x0 + w / 2, y0 + h / 2, h * 0.32
    pts = []
    for i in range(10):                                    # 오각별 = 바깥 5 + 안쪽 5
        rad = rr if i % 2 == 0 else rr * 0.382
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    dr.polygon(pts, fill=(255, 205, 0))
    dr.rectangle([x0, y0, x0 + w, y0 + h], outline=(220, 220, 226), width=2)
    im.save(path, 'WEBP', quality=90)

def flag_kr(path):
    """태극기 — 태극과 4괘를 자로 잰 듯이. AI는 괘를 절대 못 그린다."""
    im = Image.new('RGB', (S, S), BG)
    big = Image.new('RGB', (S * 3, S * 3), BG)             # 3배로 그린 뒤 줄여서 매끄럽게
    dr = ImageDraw.Draw(big)
    W, H = 540 * 3, 360 * 3
    X, Y = (S * 3 - W) // 2, (S * 3 - H) // 2
    dr.rectangle([X, Y, X + W, Y + H], fill=(255, 255, 255))
    cx, cy = X + W / 2, Y + H / 2
    r = H / 4
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 71, 160))          # 아래 파랑
    dr.pieslice([cx - r, cy - r, cx + r, cy + r], -33.69 - 180, -33.69, fill=(205, 46, 58))
    a = math.radians(-33.69)
    hx, hy = math.cos(a) * r / 2, math.sin(a) * r / 2
    dr.ellipse([cx - hx - r / 2, cy - hy - r / 2, cx - hx + r / 2, cy - hy + r / 2], fill=(205, 46, 58))
    dr.ellipse([cx + hx - r / 2, cy + hy - r / 2, cx + hx + r / 2, cy + hy + r / 2], fill=(0, 71, 160))
    # 4괘 — 막대 3줄, 끊긴 줄은 가운데를 비운다
    BARS = {'건': [1, 1, 1], '곤': [0, 0, 0], '감': [0, 1, 0], '이': [1, 0, 1]}
    bl, bw, gap = r * 1.0, r * 0.16, r * 0.09
    def gua(name, ang):
        rad = math.radians(ang)
        ox, oy = cx + math.cos(rad) * r * 2.0, cy + math.sin(rad) * r * 2.0
        for i, solid in enumerate(BARS[name]):
            off = (i - 1) * (bw + gap)
            px, py = ox + math.cos(rad) * off, oy + math.sin(rad) * off
            dx, dy = -math.sin(rad), math.cos(rad)          # 막대는 반지름에 직각
            def seg(t0, t1):
                dr.polygon([(px + dx * t0 - math.cos(rad) * bw / 2, py + dy * t0 - math.sin(rad) * bw / 2),
                            (px + dx * t1 - math.cos(rad) * bw / 2, py + dy * t1 - math.sin(rad) * bw / 2),
                            (px + dx * t1 + math.cos(rad) * bw / 2, py + dy * t1 + math.sin(rad) * bw / 2),
                            (px + dx * t0 + math.cos(rad) * bw / 2, py + dy * t0 + math.sin(rad) * bw / 2)],
                           fill=(0, 0, 0))
            if solid: seg(-bl / 2, bl / 2)
            else:
                seg(-bl / 2, -bl * 0.09); seg(bl * 0.09, bl / 2)
    # 실제 태극기 배치: 왼위 건 · 오위 감 · 왼아래 리 · 오아래 곤
    # (화면 좌표는 y가 아래로 커진다 — 위쪽이 음수 각도다)
    gua('건', 180 + 33.69); gua('감', -33.69); gua('이', 180 - 33.69); gua('곤', 33.69)
    dr.rectangle([X, Y, X + W, Y + H], outline=(220, 220, 226), width=6)
    im = big.resize((S, S), Image.LANCZOS)
    im.save(path, 'WEBP', quality=90)

if __name__ == '__main__':
    made = 0
    for name, n in NUM.items():
        count_sheet(n, IMG / f'{name}.webp'); made += 1
    for name in ['d03-viet-nam', 'd03-tieng-viet']:
        p = IMG / f'{name}.webp'
        if p.exists() or name == 'd03-viet-nam': flag_vn(p); made += 1
    for name in ['d03-han-quoc', 'd05-tieng-han']:
        p = IMG / f'{name}.webp'
        if p.exists() or name == 'd03-han-quoc': flag_kr(p); made += 1
    print(f'직접 그린 그림 {made}장')
