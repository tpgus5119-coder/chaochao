#!/usr/bin/env python3
"""정렬 1단계 결과로 음원마다 교재 글 구간(앞뒤 3줄 여유)과 받아쓴 글을 묶어 ~/짜오짜오/듣기연습/blocks/<n>.json 으로 낸다.
클로드가 이것을 읽어 '화면에 보일 문장'(교재 글 그대로, OCR 오류·줄 끊김만 고침)과 한국어 뜻을 쓴다."""
import json, pathlib, re, sys, unicodedata as U
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from align import run, lesson_lines, W
OUT = pathlib.Path.home() / '짜오짜오/듣기연습/blocks'; OUT.mkdir(exist_ok=True)
items = []
for f in sorted(W.glob('*.json')):
    d = json.loads(f.read_text())
    r = run(f)
    lines = lesson_lines(r['vol'], r['bai']) if r else []
    if r and r['lines']:
        # 구간: 맞은 줄의 처음~끝 (+앞뒤 3줄)
        idx = [i for i, l in enumerate(lines) if l]
        first = next(i for i in idx if lines[i] and r['lines'][0]['vi'] in lines[i])
        last = max(i for i in idx if lines[i] and r['lines'][-1]['vi'] in lines[i])
        blk = [l for l in lines[max(0, first - 3): last + 4] if l]
    else: blk = []
    items.append({'id': len(items), 'name': U.normalize('NFC', f.stem), 'vol': r['vol'] if r else None, 'bai': r['bai'] if r else None,
                  'book': blk, 'heard': ' '.join(w['w'] for w in d['words'])})
json.dump(items, open(OUT / 'all.json', 'w'), ensure_ascii=False, indent=0)
print(len(items), sum(1 for x in items if not x['book']))
