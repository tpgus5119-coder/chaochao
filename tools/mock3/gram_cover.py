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
def units(Q):
    """벌의 문장 단위 — 문항마다 그 문항의 문장과 정답만(보기 목록은 빼고), 여러 문항이 같이 쓰는 지문은 한 번만 (2026-10-24: 보기 목록을 같이 세면
    읽기 1(보기 다섯 공유)·읽기 4(보기 열 공유)가 5·10번씩 세어져 xong 1~17 처럼 부풀었다)"""
    out = []
    for q in Q:
        for k in ('audio', 'vi', 'fix', 'text'):
            if isinstance(q.get(k), str): out.append(q[k])
        pr, op = q.get('prompt'), q.get('opts')
        if isinstance(pr, str) and not pr.startswith('그림'):
            a = op[int(q['ans'])] if isinstance(op, list) and str(q.get('ans', '')).isdigit() and not str(op[0]).endswith('.webp') else ''
            out.append(pr.replace('____', a) if '____' in pr else pr + ' ' + a)
        if isinstance(q.get('model'), list): out += q['model']
    return list(dict.fromkeys(out))
def main(show=True):
    rows = {}
    for f in sorted(glob.glob(str(R / 'data/mock3_*.json'))):
        U = units(json.load(open(f, encoding='utf-8'))['q'])
        rows[f[-6]] = {k: sum(1 for u in U if re.search(p, u)) for k, p in PAT.items()}
    bad = []
    if show: print('문법'.ljust(20), '  '.join(f'{k}벌' for k in rows), '  차이')
    for k in PAT:
        v = [rows[s][k] for s in rows]
        if show: print(k.ljust(20), '  '.join(str(x).rjust(3) for x in v), '  ', max(v) - min(v))
        bad += [(s, k) for s in rows if rows[s][k] == 0]
    if show: print('빈 칸', bad)
    return rows
if __name__ == '__main__':
    main()
