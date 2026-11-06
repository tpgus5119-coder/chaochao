# -*- coding: utf-8 -*-
"""모의고사 4 쓰기 3 그림에 이름표·간판 붙이기 — mock3 w3_labels 와 같은 꼴. 원본(글자 없는 그림)은 ~/짜오짜오/_보관/mock4_w3_이름표전_20261106/ 에서 읽어 img/ 에 쓴다. 쓰기: python3 tools/mock4/w3_labels4.py"""
import pathlib, sys
from PIL import Image, ImageDraw, ImageFont
R = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = pathlib.Path.home() / '짜오짜오/_보관/mock4_w3_이름표전_20261106'
FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
L = {1: [('Nhà hàng Ngon', 288, 62, 'sign'), ('Chị Mai', 109, 118, 'tag'), ('Anh Nam', 352, 100, 'tag'), ('Chị Reiko', 505, 104, 'tag')],
     2: [('Khách sạn', 507, 135, 'sign'), ('Cô Hoa', 60, 130, 'tag'), ('Ông Kim', 242, 150, 'tag'), ('Chị Lan', 395, 150, 'tag'), ('Chị Mai', 515, 200, 'tag')],
     3: [('Bãi biển Mũi Né', 288, 28, 'sign'), ('Anh Hải', 52, 140, 'tag'), ('Chị Lan', 339, 178, 'tag'), ('Bé Bin', 408, 268, 'tag'), ('Anh Nam', 505, 238, 'tag')],
     4: [('Trạm xe buýt', 270, 92, 'sign'), ('Chị Thu', 99, 128, 'tag'), ('Anh Nam', 287, 126, 'tag'), ('Anh Minh', 415, 122, 'tag'), ('Ông Hai', 522, 128, 'tag')],
     5: [('Chợ Đêm', 288, 22, 'sign'), ('Cô Mai', 73, 180, 'tag'), ('Anh Sơn', 350, 182, 'tag'), ('Chị Vân', 470, 140, 'tag'), ('Bé Na', 540, 205, 'tag')]}
def main():
    for n, labs in L.items():
        im = Image.open(SRC / f'mock4-{n}-w3.webp').convert('RGB')
        big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS); d = ImageDraw.Draw(big)
        for t, x, y, k in labs:
            f = ImageFont.truetype(FONT, 26 if k == 'tag' else 30)
            w, h = d.textbbox((0, 0), t, font=f)[2:]
            cx, cy = x * 2, y * 2
            pad = 10; box = (cx - w / 2 - pad, cy - h / 2 - pad + 2, cx + w / 2 + pad, cy + h / 2 + pad + 2)
            if k == 'sign': d.rounded_rectangle(box, 10, fill=(40, 45, 60)); d.text((cx - w / 2, cy - h / 2), t, font=f, fill='white')
            else: d.rounded_rectangle(box, 12, fill='white', outline=(70, 90, 140), width=3); d.text((cx - w / 2, cy - h / 2), t, font=f, fill=(30, 40, 80))
        big.resize(im.size, Image.LANCZOS).save(R / f'img/mock4-{n}-w3.webp', 'WEBP', quality=88)
if __name__ == '__main__':
    main()
