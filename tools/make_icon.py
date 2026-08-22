#!/usr/bin/env python3
"""앱 아이콘을 코드로 그린다 — AI에게 맡기면 글자와 모양이 어긋난다.

짜오짜오 = Chào chào(안녕 안녕). 그래서 말풍선 둘이 겹친 모양으로 한다.
색은 베트남 국기의 빨강과 노랑. 아이콘 하나로 '베트남'과 '말하기'가 같이 읽힌다.
사용: python3 tools/make_icon.py
"""
import math, pathlib
from PIL import Image, ImageDraw

R = pathlib.Path(__file__).resolve().parent.parent
S = 1024                       # 크게 그리고 줄여야 가장자리가 매끈하다
RED, GOLD, WHITE = (218, 37, 29), (255, 205, 0), (255, 255, 255)

def bubble(dr, x, y, w, h, fill, tail):
    r = h * 0.32
    dr.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=fill)
    tx, ty = tail
    dr.polygon([(x + w * tx, y + h * 0.92), (x + w * (tx + 0.16), y + h * 0.92),
                (x + w * ty, y + h * 1.22)], fill=fill)

def star(dr, cx, cy, rr, fill):
    pts = []
    for i in range(10):
        rad = rr if i % 2 == 0 else rr * 0.382
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    dr.polygon(pts, fill=fill)

def build(size=S, bg=True):
    im = Image.new('RGB', (S, S), RED)
    dr = ImageDraw.Draw(im)
    if not bg:
        im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    # 뒤쪽 말풍선 (노랑) — 살짝 비스듬히
    bubble(dr, S * 0.20, S * 0.20, S * 0.48, S * 0.34, GOLD, (0.18, 0.24))
    # 앞쪽 말풍선 (흰색)
    bubble(dr, S * 0.33, S * 0.40, S * 0.48, S * 0.34, WHITE, (0.70, 0.76))
    # 앞 말풍선 안에 베트남 별 하나 — '어디 말인가'가 한눈에
    star(dr, S * 0.57, S * 0.565, S * 0.105, RED)
    return im.resize((size, size), Image.LANCZOS)

if __name__ == '__main__':
    build(512).save(R / 'icon.png')
    build(512).save(R / 'img' / 'app-icon.webp', 'WEBP', quality=92)
    build(180).save(R / 'icon-180.png')
    print('아이콘 만듦 — icon.png (512) · icon-180.png · img/app-icon.webp')
