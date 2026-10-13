# -*- coding: utf-8 -*-
"""주간시험 1 모의고사 쓰기 3 그림에 이름표·간판 붙이기 (2026-10-13, tools/mock3/w3_labels.py 와 같은 방법).
원본(글자 없는 그림)은 ~/짜오짜오/_보관/mock1_w3_이름표전_20261013/mock1-1-w3.webp — 거기서 읽어 img/ 에 쓴다. 좌표는 576×384 그림에서 이름표 가운데.
쓰기: python3 tools/mock1/w3_labels1.py"""
import pathlib
from PIL import Image, ImageDraw, ImageFont
R = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = pathlib.Path.home() / '짜오짜오/_보관/mock1_w3_이름표전_20261013'
FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
L = {1: [('Đại học Nhân văn', 96, 22, 'sign'), ('Anh Min', 214, 38, 'tag'), ('Cô Hoa', 287, 22, 'tag'), ('Anh Tom', 362, 38, 'tag'), ('Chị Yuki', 418, 64, 'tag')]}
def main():
    for n, labs in L.items():
        im = Image.open(SRC / f'mock1-{n}-w3.webp').convert('RGB')
        big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS); d = ImageDraw.Draw(big)
        for t, x, y, k in labs:
            f = ImageFont.truetype(FONT, 26 if k == 'tag' else 30)
            w, h = d.textbbox((0, 0), t, font=f)[2:]
            cx, cy = x * 2, y * 2
            pad = 10; box = (cx - w / 2 - pad, cy - h / 2 - pad + 2, cx + w / 2 + pad, cy + h / 2 + pad + 2)
            if k == 'sign': d.rounded_rectangle(box, 10, fill=(40, 45, 60)); d.text((cx - w / 2, cy - h / 2), t, font=f, fill='white')
            else: d.rounded_rectangle(box, 12, fill='white', outline=(70, 90, 140), width=3); d.text((cx - w / 2, cy - h / 2), t, font=f, fill=(30, 40, 80))
        big.resize(im.size, Image.LANCZOS).save(R / f'img/mock1-{n}-w3.webp', 'WEBP', quality=88)
        print('이름표', n, len(labs))
if __name__ == '__main__':
    main()
