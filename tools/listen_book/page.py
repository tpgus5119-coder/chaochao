#!/usr/bin/env python3
"""듣기 연습 비공개 페이지 — ~/짜오짜오/듣기연습/final/*.json(문장·시각·뜻) + 교재 음원 → ~/짜오짜오/듣기연습/page/
index.html 하나(자료를 안에 품음) + a/<id>.m4a. claude.ai 비공개 Artifact 로만 올린다(공개 저장소 금지 — 출판사 음원·원문)."""
import json, pathlib, re, shutil, unicodedata as U
H = pathlib.Path.home() / '짜오짜오/듣기연습'
SRC = pathlib.Path.home() / '짜오짜오/원본자료/베트남어 학습자료/수업 자료'
OUT = H / 'pub'; (OUT / 'a').mkdir(parents=True, exist_ok=True)
KIND = [('HT', '회화'), ('BN', '듣기'), ('Bài nghe', '듣기'), ('ĐỌC', '읽기'), ('Đọc', '읽기'), ('đọc', '읽기'), ('PA', '발음'), ('Chính tả', '받아쓰기')]
tracks = []
for f in sorted((H / 'final').glob('*.json')):
    d = json.loads(f.read_text())
    if not d.get('lines'): continue
    if sum(1 for l in d['lines'] if l.get('r', 1) < .5) > .3 * len(d['lines']): continue   # 문장 위치를 못 잡은 음원(주로 발음 연습 음절 읽기)은 뺀다
    nm = U.normalize('NFC', pathlib.Path(d['file']).stem)
    kind = next((k for t, k in KIND if t.lower() in nm.lower()), '기타')
    num = re.search(r'(?:HT|BN|PA|Bài nghe\s*)(\d+)\s*$', nm)
    aid = re.sub(r'[^a-z0-9]+', '-', U.normalize('NFD', nm).encode('ascii', 'ignore').decode().lower()).strip('-')
    src = SRC / d['file']
    shutil.copy(src, OUT / 'a' / (aid + '.mp4'))
    tracks.append({'id': aid, 'v': d['vol'], 'b': d['bai'], 'k': kind, 'n': int(num.group(1)) if num else 0,
                   'L': [[l.get('sp', ''), l['vi'], l.get('ko', ''), l['s'], l['e']] for l in d['lines']]})
ORD = {'회화': 0, '듣기': 1, '읽기': 2, '받아쓰기': 3, '발음': 4, '기타': 5}
tracks.sort(key=lambda t: (t['v'], t['b'], ORD[t['k']], t['n']))
html = (pathlib.Path(__file__).parent / 'page.html').read_text().replace('/*DATA*/[]', json.dumps(tracks, ensure_ascii=False, separators=(',', ':')))
(OUT / 'index.html').write_text(html)
print(len(tracks), 'tracks', sum(len(t['L']) for t in tracks), 'lines')
