#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""품사 판정 검산 — 기계 태거(underthesea, 베트남어 VLSP 말뭉치로 학습)로 원문 예문 속 그 낱말의 품사를 따로 매겨 Sonnet 판정과 맞댄다 (2026-10-01).
대상: 뜻이 하나인 낱말(예문이 어느 뜻의 것인지 분명) · 원문 예문에 그 낱말이 한 덩어리로 잘려 나온 것 · 우리 판정이 태거에 있는 품사(구·속담·? 제외).
태거 품사 → 우리 이름: N 명 · Np 고유 · Nc 분류 · Nu 명 · V 동 · A 형 · R 부 · E 전 · C/Cc 접 · P 대 · M 수 · I 감 · T 조.
결과 tools/dict_pos/검산_태거.tsv (낱말 · 판정 · 태거 · 예문) — 어긋난 것은 클로드가 하나씩 본다. 쓰기: python3 tools/dict_pos/verify_tagger.py"""
import json, glob, pathlib, collections, re, unicodedata as U
from underthesea import pos_tag
R = pathlib.Path(__file__).resolve().parent.parent.parent
MAP = {'N': '명', 'Np': '고유', 'Nc': '분류', 'Nu': '명', 'V': '동', 'A': '형', 'R': '부', 'E': '전', 'C': '접', 'Cc': '접', 'P': '대', 'M': '수', 'I': '감', 'T': '조'}
nfc = lambda s: U.normalize('NFC', s).strip().lower()


def main():
    rows, st = [], collections.Counter()
    for f in sorted((R / 'tools/dict_pos').glob('pos_*.json')):
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        lab = {}
        for l in f.with_suffix('.ko.tsv').read_text(encoding='utf-8').splitlines():
            n, i, p = (l.split('\t') + ['', ''])[:3]; lab.setdefault(n.strip(), []).append(p.strip())
        for n, x in src.items():
            ps = lab.get(n, [])
            if len(x['senses']) != 1 or len(ps) != 1: st['뜻 여럿(뺌)'] += 1; continue
            p = ps[0]
            if p in ('구', '속담', '?'): st['구·속담·?(뺌)'] += 1; continue
            w = nfc(x['w']); tags = []
            for ex in x['vi_ex']:
                ex = re.sub(r'\s+', ' ', ex.replace('~', x['w']))
                try:
                    for tok, tg in pos_tag(ex):
                        if nfc(tok) == w: tags.append(tg)
                except Exception: pass
            if not tags: st['예문에 낱말 없음(뺌)'] += 1; continue
            t = collections.Counter(MAP.get(g, g) for g in tags).most_common(1)[0][0]
            same = t == p
            st['같음' if same else '다름'] += 1
            rows.append((x['w'], p, t, 'O' if same else 'X', x['senses'][0]['ko'], (x['vi_def'] or [''])[0][:60], x['vi_ex'][0][:60]))
    with open(R / 'tools/dict_pos/검산_태거.tsv', 'w', encoding='utf-8') as f:
        f.write('# 낱말\t판정\t태거\t같음\t한국어 뜻\t원문 뜻풀이\t원문 예문\n')
        for r in rows: f.write('\t'.join(r) + '\n')
    n = st['같음'] + st['다름']
    print(dict(st), f'· 맞댄 {n} 중 같음 {st["같음"] / max(n, 1) * 100:.1f}%')
    conf = collections.Counter((r[1], r[2]) for r in rows if r[3] == 'X')
    print('어긋남 짝(판정→태거):', conf.most_common(12))


if __name__ == '__main__':
    main()
