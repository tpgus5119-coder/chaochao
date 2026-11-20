# -*- coding: utf-8 -*-
"""모의고사 5 쓰기 3 그림에 이름표·간판 붙이기 — mock3 w3_labels 와 같은 꼴. 원본(글자 없는 그림)은 ~/짜오짜오/_보관/mock5_w3_이름표전_20261120/ 에서 읽어 img/ 에 쓴다. 쓰기: python3 tools/mock5/w3_labels5.py"""
import pathlib, sys
from PIL import Image, ImageDraw, ImageFont
R = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = pathlib.Path.home() / '짜오짜오/_보관/mock5_w3_이름표전_20261120'
FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
L = {1: [('Cửa hàng quần áo', 298, 98, 'sign'), ('Chị Thư', 90, 132, 'tag'), ('Chị Mai', 300, 140, 'tag'), ('Anh Phúc', 405, 118, 'tag'), ('Bé Bin', 510, 228, 'tag')],
     2: [('Phòng khám', 279, 140, 'sign'), ('Bác sĩ Long', 95, 135, 'tag'), ('Anh Nam', 345, 168, 'tag'), ('Cô Hoa', 432, 118, 'tag'), ('Chị Lan', 518, 160, 'tag')],
     3: [('Khách sạn Hòa Bình', 343, 135, 'sign'), ('Anh Văn', 60, 118, 'tag'), ('Chị Kate', 238, 112, 'tag'), ('Anh Minh', 375, 182, 'tag'), ('Anh Đông', 505, 128, 'tag')],
     4: [('Chung cư', 280, 66, 'sign'), ('Anh Long', 150, 105, 'tag'), ('Chị Lan', 228, 140, 'tag'), ('Ông Sáu', 425, 110, 'tag'), ('Bé Bin', 512, 190, 'tag')],
     5: [('Chợ Bến Thành', 290, 40, 'sign'), ('Anh Phúc', 312, 112, 'tag'), ('Chị Mai', 384, 140, 'tag'), ('Cô Hoa', 462, 120, 'tag'), ('Bé Na', 528, 192, 'tag')]}
def main():
    for n, labs in L.items():
        im = Image.open(SRC / f'mock5-{n}-w3.webp').convert('RGB')
        big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS); d = ImageDraw.Draw(big)
        for t, x, y, k in labs:
            f = ImageFont.truetype(FONT, 26 if k == 'tag' else 30)
            w, h = d.textbbox((0, 0), t, font=f)[2:]
            cx, cy = x * 2, y * 2
            pad = 10; box = (cx - w / 2 - pad, cy - h / 2 - pad + 2, cx + w / 2 + pad, cy + h / 2 + pad + 2)
            if k == 'sign': d.rounded_rectangle(box, 10, fill=(40, 45, 60)); d.text((cx - w / 2, cy - h / 2), t, font=f, fill='white')
            else: d.rounded_rectangle(box, 12, fill='white', outline=(70, 90, 140), width=3); d.text((cx - w / 2, cy - h / 2), t, font=f, fill=(30, 40, 80))
        big.resize(im.size, Image.LANCZOS).save(R / f'img/mock5-{n}-w3.webp', 'WEBP', quality=88)
if __name__ == '__main__':
    main()
