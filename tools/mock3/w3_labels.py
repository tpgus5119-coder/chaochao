# -*- coding: utf-8 -*-
"""쓰기 3 그림에 이름표·간판 글자 붙이기 (2026-10-13, 2차 주간시험 실물: 그림 속에 'Anh Brian'·'Chị Eun Ji' 이름표, 'Nhà hàng Hương Việt' 간판, 차림표가 있다).
원본(글자 없는 그림)은 ~/짜오짜오/_보관/mock3_w3_이름표전_20261013/ — 거기서 읽어 img/ 에 쓴다(다시 돌려도 글자가 겹치지 않게).
칸: (글, x, y, 종류) — x·y 는 576×384 그림에서 이름표 가운데. 종류 tag = 흰 바탕 이름표, sign = 짙은 바탕 간판, board = 칠판 글씨.
쓰기: python3 tools/mock3/w3_labels.py"""
import pathlib
from PIL import Image, ImageDraw, ImageFont
R = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = pathlib.Path.home() / '짜오짜오/_보관/mock3_w3_이름표전_20261013'
FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
L = {1: [('Tiếng Việt', 285, 92, 'board'), ('Cô Lan', 113, 78, 'tag'), ('Anh Minh', 178, 132, 'tag'), ('Anh Nam', 52, 126, 'tag'), ('Chị Mai', 528, 146, 'tag')],
     2: [('Chúc mừng sinh nhật Lan!', 205, 20, 'sign'), ('Chị Hoa', 164, 62, 'tag'), ('Lan', 272, 82, 'tag'), ('Anh Nam', 374, 40, 'tag'), ('Chị Thu', 470, 70, 'tag')],
     3: [('Công viên', 70, 30, 'sign'), ('Ông', 175, 180, 'tag'), ('Bà', 250, 182, 'tag'), ('Bố', 335, 124, 'tag'), ('Bé Na', 372, 196, 'tag'), ('Mẹ', 428, 104, 'tag')],
     4: [('Ga Hà Nội', 439, 56, 'sign'), ('Anh Hùng', 209, 60, 'tag'), ('Chị Lan', 374, 82, 'tag'), ('Bé Bin', 439, 198, 'tag')],
     5: [('Bà', 195, 132, 'tag'), ('Bố', 365, 98, 'tag'), ('Bé Na', 340, 188, 'tag'), ('Mẹ', 515, 90, 'tag')]}
def main(only=None):
    for n, labs in L.items():
        if only and n not in only: continue
        im = Image.open(SRC / f'mock3-{n}-w3.webp').convert('RGB')
        big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS); d = ImageDraw.Draw(big)
        for t, x, y, k in labs:
            f = ImageFont.truetype(FONT, 26 if k == 'tag' else 30)
            w, h = d.textbbox((0, 0), t, font=f)[2:]
            cx, cy = x * 2, y * 2
            if k == 'board':
                d.text((cx - w / 2, cy - h / 2), t, font=f, fill=(30, 70, 50)); continue
            pad = 10; box = (cx - w / 2 - pad, cy - h / 2 - pad + 2, cx + w / 2 + pad, cy + h / 2 + pad + 2)
            if k == 'sign': d.rounded_rectangle(box, 10, fill=(40, 45, 60)); d.text((cx - w / 2, cy - h / 2), t, font=f, fill='white')
            else: d.rounded_rectangle(box, 12, fill='white', outline=(70, 90, 140), width=3); d.text((cx - w / 2, cy - h / 2), t, font=f, fill=(30, 40, 80))
        big.resize(im.size, Image.LANCZOS).save(R / f'img/mock3-{n}-w3.webp', 'WEBP', quality=88)
        print('이름표', n, len(labs))
if __name__ == '__main__':
    main()
