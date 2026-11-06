# -*- coding: utf-8 -*-
"""모의고사 4 다섯 벌이 범위 문법(1권 11·12과 + 2권 1·2과)과 과별 낱말을 고르게 쓰는지 센다 — 빈 칸이 있으면 그 벌에 그 문법이 없다는 뜻. 쓰기: python3 tools/mock4/cover4.py"""
import json, re, glob, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock3'))
from gram_cover import units
PAT = {'11 lại': r'\b(nghe|xem|đặt|gọi|làm|nói|đọc) lại\b|\bxe máy lại\b', '11 nếu…thì': r'\b[Nn]ếu\b', '11 không…đâu': r'\b[Kk]hông\b[^.?!]*\bđâu\s*[.,!]', '11 vẫn': r'\b[Vv]ẫn\b', '11 bằng(탈것)': r'\bbằng (xe|tắc|taxi|gì|máy|phương)',
       '12 đi·đừng': r'\b[Đđ]ừng\b|\bđi\s*[!.]', '12 đấy·chứ': r'\bđấy\b|\bchứ\b', '12 hơi·khá': r'\bhơi\b|\bkhá\b', '12 bao giờ·lâu·nhiêu·xa': r'\b[Bb]ao (lâu|nhiêu|xa)\b|\b[Bb]ao giờ\b(?! chưa)',
       '13 có phải': r'\b[Cc]ó phải\b|\bcó phải không', '13 bao giờ chưa': r'\bbao giờ chưa\b|\bchưa bao giờ\b', '13 vừa…vừa': r'\b[Vv]ừa\b[^.?!]*\bvừa\b', '13 thấy…': r'\bthấy\b',
       '14 위치': r'\b(trên|dưới|trong|ngoài|trước|sau) (bàn|ghế|xe|phòng|khách|đồi|chợ|mạng|biển|tủ)', '14 방향': r'\b(ra|vào|lên|xuống) (chợ|biển|bảng|vở|ghế|phòng|Phú|đồi|tầng|đó)|\bxuống\b', '14 có(지난 일)': r'\b(tôi|anh|chị|cô|ấy) có (đặt|đi|ra|gửi|đưa|hơi|ở)\b', '14 hơn·so với': r'\bhơn\b|\b[Ss]o với\b'}
def main():
    rows = {}
    for f in sorted(glob.glob(str(R / 'data/mock4_*.json'))):
        U = units(json.load(open(f, encoding='utf-8'))['q'])
        rows[f[-6]] = {k: sum(1 for u in U if re.search(p, u)) for k, p in PAT.items()}
    print('문법'.ljust(24), '  '.join(f'{k}벌' for k in rows), '  차이')
    for k in PAT:
        v = [rows[s][k] for s in rows]; print(k.ljust(24), '  '.join(str(x).rjust(3) for x in v), '  ', max(v) - min(v))
    W = json.load(open(R / 'tools/mock4/ch114_words.json', encoding='utf-8'))
    for b in (11, 12, 13, 14):
        ws = [re.compile(r'(?<!\w)' + re.escape(x[1].lower()) + r'(?!\w)') for x in W if x[0] == b]
        v = []
        for f in sorted(glob.glob(str(R / 'data/mock4_*.json'))):
            t = ' '.join(units(json.load(open(f, encoding='utf-8'))['q'])).lower(); v.append(sum(1 for w in ws if w.search(t)))
        print(f'과 {b} 낱말 종류'.ljust(24), '  '.join(str(x).rjust(3) for x in v), '  ', max(v) - min(v))
if __name__ == '__main__':
    main()
