#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""모의고사 3 다섯 벌이 교재 1권 8·9·10과 문법 상자 13개 + 10과 나이 비교 + 쌤 10과 비교(bằng·như)를 벌마다 덮는지 센다 (2026-10-24 대표님 "교재에 있는 문법들을 다 넣으면 되잖아").
문항 하나를 통째(문제·보기·정답·풀이)로 보고 그 문법이 쓰였으면 1. 0 인 칸이 있으면 그 벌에 그 문법이 없다는 뜻. 쓰기: python3 tools/mock3/gram_cover.py"""
import json, re, glob, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
PAT = {'8 được(능력)': r'\bđược\b', '8 bao lâu': r'\bbao lâu\b', '8 mới(막)': r'\bmới\b(?! mẻ)', '8 đi(끝, 권유)': r'\bđi\s*[!.](?=\s|"|\\n|$)', '8 đừng': r'\b[Đđ]ừng\b',
       '9 đã…chưa': r'\bchưa\b', '9 đấy(끝)': r'\bđấy\s*[.!]', '9 bao giờ': r'\b[Bb]ao giờ\b', '9 xong': r'\bxong\b',
       '10 còn(대조)': r'\bCòn\b|, còn\b|"còn"', '10 cùng': r'\bcùng\b', '10 khá': r'\bkhá\b', '10 chứ': r'\bchứ\b',
       '10 나이 비교': r'(bằng|cùng) tuổi|hơn[^"]{0,25}tuổi|(nhỏ|lớn) hơn', '10(쌤) bằng·như 비교': r'(cao|rộng|nặng|đẹp|ngon|đắt|xa) (bằng|như)\b|bằng nhau|như nhau'}
def main():
    rows = {}
    for f in sorted(glob.glob(str(R / 'data/mock3_*.json'))):
        Q = json.load(open(f, encoding='utf-8'))['q']
        rows[f[-6]] = {k: sum(1 for q in Q if re.search(p, json.dumps(q, ensure_ascii=False))) for k, p in PAT.items()}
    print('문법'.ljust(20), '  '.join(f'{k}벌' for k in rows))
    bad = []
    for k in PAT:
        print(k.ljust(20), '  '.join(str(rows[s][k]).rjust(3) for s in rows))
        bad += [(s, k) for s in rows if rows[s][k] == 0]
    print('빈 칸', bad)
    return bad
if __name__ == '__main__':
    main()
