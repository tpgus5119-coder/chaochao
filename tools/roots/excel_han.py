#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""선배 자료 '한월어 모음' 엑셀(원본자료/베트남어 학습자료/선배 자료/Han Han Viet 한월어 모음 20260921.xlsx) 중 우리 표에 없는 낱말의 한자를 **검산해서만** 받는다 (2026-10-01).
엑셀은 '뜻이 같은 한국 한자어'를 적은 공부용 표라 어원이 틀린 것이 많다(kính mắt 鏡眼 — mắt 는 고유어, hàng ngày 行日, đạo phật 佛敎 — 차례가 다름).
검산: 글자 수 = 음절 수 · 글자마다 그 음절이 **이미 검증된 낱말들**(한자_판정.tsv + 사전_한자.tsv)에서 그 글자의 읽기로 나온 것(성조 찍는 자리 차이는 같게).
한 음절 낱말은 뜻마다 한자가 달라 엑셀의 '베트남어 뜻' 첫 말을 뜻 조건으로 단다(đào 桃 → '복숭아' 일 때만).
결과 tools/roots/엑셀_한자.tsv(한자_판정.tsv 와 같은 칸) · 걸러진 것 엑셀_한자_뺌.tsv. 쓰기: python3 tools/roots/excel_han.py"""
import glob, json, os, pathlib, re, sys, collections, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/roots'))
from dict_han import canon  # noqa: E402
nfc = lambda s: U.normalize('NFC', str(s or '')).strip()


def rows(name):
    for line in (R / 'tools/roots' / name).read_text(encoding='utf-8').splitlines():
        if line.strip() and not line.startswith('#'): yield (line.split('\t') + [''] * 8)[:8]


def main():
    import openpyxl
    p = [f for f in glob.glob(os.path.expanduser('~/짜오짜오/원본자료/*/*/*.xlsx')) if 'Han Han Viet' in nfc(f)][0]
    ws = openpyxl.load_workbook(p, read_only=True, data_only=True)['HanViet 1-']
    # '이미 있음'은 판정표 원본끼리만 본다 — _roots.json 은 이 파일 결과까지 들어 있어 다시 돌리면 다 빠졌다(116 → 3)
    have = {r[0].strip().lower() for r in rows('한자_판정.tsv')} | {r[0].strip().lower() for r in rows('사전_한자.tsv')} | {r[0].strip().lower() for r in rows('뺀_낱말.tsv')}
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    # 엑셀 뜻이 그 한자 뜻이 아닌 것 — cần(필요하다)은 勤(부지런할 근)이 아니고, hữu(있다)는 홀로 그 뜻으로 안 쓴다 (클로드가 봄)
    NO = {'cần', 'hữu'}
    hc = {' '.join(canon(x) for x in k.split()) for k in have}
    rd = collections.defaultdict(set)
    for w, h, old, *_ in rows('한자_판정.tsv'):
        if h and old.strip() != '1' and len(h) == len(w.split()):
            for c, s in zip(h, w.lower().split()): rd[c].add(canon(s))
    for w, h, *_ in rows('사전_한자.tsv'):
        if len(h) == len(w.split()):
            for c, s in zip(h, w.lower().split()): rd[c].add(canon(s))
    keep, drop = [], []
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r[1]: continue
        w = re.sub(r'\s*\(.*?\)', '', nfc(r[1])).lower()
        han = re.sub(r'[^一-鿿]', '', nfc(r[3]))
        if not han or w in have or ' '.join(canon(x) for x in w.split()) in hc: continue
        if w not in F: drop.append((w, han, '사전 표제어 아님(엑셀 철자 틀림 quán niệm 등)')); continue
        if w in NO: drop.append((w, han, '엑셀 뜻이 그 한자의 뜻이 아님')); continue
        syl = w.split()
        if len(han) != len(syl): drop.append((w, han, '글자 수 ≠ 음절 수')); continue
        bad = [c + ':' + s for c, s in zip(han, syl) if canon(s) not in rd.get(c, ())]
        if bad: drop.append((w, han, '음 안 맞음 ' + ','.join(bad))); continue
        cond = ''
        if len(syl) == 1:
            ms = [x.strip() for x in re.split(r'[,/()]', nfc(r[4])) if len(x.strip()) >= 2 and re.search(r'[가-힣]', x)]
            if not ms: drop.append((w, han, '한 음절인데 두 글자 넘는 뜻이 없음(도·특·열 같은 한 글자 조건은 엉뚱한 뜻에도 걸린다)')); continue
            cond = ','.join(ms[:2])
        keep.append((w, han, '0', '', cond, '', '선배 한월어 엑셀 · 글자마다 한자음 검산'))
    with open(R / 'tools/roots/엑셀_한자.tsv', 'w', encoding='utf-8') as f:
        f.write('# 선배 한월어 엑셀에서 검산을 통과한 것 (tools/roots/excel_han.py, 2026-10-01). 칸은 한자_판정.tsv 와 같다\n')
        for k in keep: f.write('\t'.join(k) + '\n')
    with open(R / 'tools/roots/엑셀_한자_뺌.tsv', 'w', encoding='utf-8') as f:
        f.write('# 선배 한월어 엑셀에서 걸러진 것과 까닭\n')
        for d in drop: f.write('\t'.join(d) + '\n')
    print(f'넣음 {len(keep)} · 뺌 {len(drop)}')
    for k in keep: print('  ', k[0], k[1], k[4])


if __name__ == '__main__':
    main()
