#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 낱말 품사 전체 점검 ② — 받아 둔 영어판 위키(9월, src.json) ↔ 지금의 영어판 위키(fetch_en_live.py) 품사 맞대기 (2026-10-01).
지금 위키는 제목대로(parse) · 머리 틀대로(fix_headers 뒤 parse) 둘 다 읽는다. 결과 tools/dict_pos/en_live_diff.tsv"""
import json, pathlib, sys, collections
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools')); sys.path.insert(0, str(R / 'tools/dict_full'))
from gloss_all import parse  # noqa: E402
from pos_live import fix_headers  # noqa: E402
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')


def main():
    src = json.loads((R / 'tools/dict_full/src.json').read_text(encoding='utf-8'))
    live = json.loads((SP / 'en_live_raw.json').read_text(encoding='utf-8'))
    st, rows = collections.Counter(), []
    for k, raw in sorted(live.items()):
        old = [s['pos'] for s in src[k]['s']]
        if not raw: st['지금 위키에 없음'] += 1; continue
        h, t = parse(raw), parse(fix_headers(raw))
        nh, nt = [s['pos'] for s in h], [s['pos'] for s in t]
        if collections.Counter(old) == collections.Counter(nt) and nh == nt: st['같음'] += 1; continue
        kind = '제목·틀 어긋남' if nh != nt else '위키가 바뀜'
        st[kind] += 1
        rows.append((k, kind, ' '.join(old), ' '.join(nh), ' '.join(nt),
                     ' || '.join(f"{s['pos']}: {s['t'][:60]}" for s in t)[:600]))
    with open(R / 'tools/dict_pos/en_live_diff.tsv', 'w', encoding='utf-8') as f:
        f.write('# 낱말\t분류\t받아 둔 품사\t지금 제목\t지금 틀\t지금 뜻풀이\n')
        for r in rows: f.write('\t'.join(r) + '\n')
    print(dict(st))


if __name__ == '__main__':
    main()
