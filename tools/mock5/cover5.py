# -*- coding: utf-8 -*-
"""모의고사 5 다섯 벌이 범위 문법(2권 3~6과)과 과별 낱말을 고르게 쓰는지 센다 — 빈 칸이 있으면 그 벌에 그 문법이 없다는 뜻. 쓰기: python3 tools/mock5/cover5.py"""
import json, re, glob, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock3'))
from gram_cover import units
PAT = {'3 단위 명사': r'\b(một|hai|ba|bốn|năm|mấy) (đôi|cái|trái|quyển|cuốn|chai|ổ|lon|ly|con|bó|ký)\b', '3 không…đâu': r'\b[Kk]hông\b[^.?!]*\bđâu\b', '3 …đây!': r'\bđây\s*[!.]',
       '4 tất cả': r'\b[Tt]ất cả\b', '3 V+lại': r'\b(nghe|xem|viết|nói|gọi|kiểm tra|nhắn) lại\b', '4 cả': r'\b[Cc]ả\b', '4 đều': r'\bđều\b', '4 càng…càng': r'\b[Cc]àng\b',
       '4 빈도 부사': r'\b(luôn luôn|thường|hay|thỉnh thoảng|ít khi|không bao giờ)\b', '5 bị·được': r'\b(bị|được)\b', '5 mặc dù…nhưng': r'\b[Mm]ặc dù\b', '5 …nay': r'\b(ngày|hôm|tuần|tháng|năm) nay\b',
       '3 chỉ…thôi': r'\bchỉ\b[^.?!]*\bthôi\b', '3 không những…mà còn': r'\bkhông những\b', '6 호텔 낱말': r'\b(phòng đơn|phòng đôi|đặt phòng|nhận phòng|trả phòng|tiếp tân|khách sạn)\b'}
def main():
    rows = {}
    for f in sorted(glob.glob(str(R / 'data/mock5_*.json'))):
        U = units(json.load(open(f, encoding='utf-8'))['q'])
        rows[f[-6]] = {k: sum(1 for u in U if re.search(p, u)) for k, p in PAT.items()}
    print('문법'.ljust(24), '  '.join(f'{k}벌' for k in rows), '  차이')
    for k in PAT:
        v = [rows[s][k] for s in rows]; print(k.ljust(24), '  '.join(str(x).rjust(3) for x in v), '  ', max(v) - min(v))
    W = json.load(open(R / 'tools/mock5/ch118_words.json', encoding='utf-8'))
    for b in (15, 16, 17, 18):
        ws = [re.compile(r'(?<!\w)' + re.escape(x[1].lower()) + r'(?!\w)') for x in W if x[0] == b]
        v = []
        for f in sorted(glob.glob(str(R / 'data/mock5_*.json'))):
            t = ' '.join(units(json.load(open(f, encoding='utf-8'))['q'])).lower(); v.append(sum(1 for w in ws if w.search(t)))
        print(f'과 {b} 낱말 종류'.ljust(24), '  '.join(str(x).rjust(3) for x in v), '  ', max(v) - min(v))
if __name__ == '__main__':
    main()
