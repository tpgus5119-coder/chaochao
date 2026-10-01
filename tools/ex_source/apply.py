#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""수업 카드 예문을 고른 교재 원문·사전 예문으로 바꾼다 (2026-10-01, 대표님 "1순위 메인 교재 문장, 2순위 사전 문장, 없으면 만든 예문").
판정: tools/ex_source/sh_NN.ko.tsv (Sonnet 1차 고르기) + sh_NN.b.tsv (독립 2차 확인: 그 뜻으로 쓰였나 Y/N) — 2차가 Y 이거나 클로드가 '확정.tsv' 에서 살린 것만 넣는다.
넣는 곳: tools/sense_review/ex_write.py 와 같다 — 그 갈래 그 수업의 그 낱말 하나만(일상 days · 직무 order · 교재/선배/22기 gybm · 22기 원본 cohort22).
표시: ex.src = 'main_book'(교재 원문) / 'wiktionary'(사전 예문), gybm 은 ex_src 같은 값 + ex_chk 'source_fix'(build_gybm 이 옛 값으로 되돌리지 않게).
새 문장 소리(북부 여·남)를 만든다. 쓰기: python3 tools/ex_source/apply.py [--dry] [--no-audio]"""
import asyncio, json, re, sys, pathlib, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools')); sys.path.insert(0, str(R / 'tools/book_ex')); sys.path.insert(0, str(R / 'tools/sense_review'))
import vi_kr  # noqa: E402
from apply_ex import make, k12, VOICES  # noqa: E402
D = R / 'tools/ex_source'
nfc = lambda s: U.normalize('NFC', str(s or '')).strip()
key = lambda s: nfc(s).lower()


def picks():
    keep = {}
    if (D / '확정.tsv').exists():
        for l in (D / '확정.tsv').read_text(encoding='utf-8').splitlines():
            c = l.split('\t')
            if len(c) >= 3 and not l.startswith('#'): keep[(c[0], c[1])] = c[2].strip()
    out, st = [], {'고름': 0, '2차 Y': 0, '2차 N(뺌)': 0, '클로드 살림': 0, '클로드 뺌': 0}
    for f in sorted(D.glob('sh_*.json')):
        src = {str(x['n']): x for x in json.loads(f.read_text(encoding='utf-8'))}
        A = [l.split('\t') for l in f.with_suffix('.ko.tsv').read_text(encoding='utf-8').splitlines() if l.strip()]
        bp = D / (f.stem + '.b.tsv')
        B = {l.split('\t')[0]: l.split('\t') for l in bp.read_text(encoding='utf-8').splitlines() if l.strip()} if bp.exists() else {}
        for a in A:
            a += [''] * 4
            n, ch, ko = a[0].strip(), a[1].strip(), a[2].strip()
            if ch == '0': continue
            st['고름'] += 1
            x = src[n]
            b = B.get(n, [n, '', '', ''])
            v = (b + ['', '', ''])[1].strip()
            k2 = keep.get((f.stem, n))
            if k2 == 'Y' or (v == 'Y' and k2 != 'N'):
                st['2차 Y' if v == 'Y' else '클로드 살림'] += 1
            else:
                st['2차 N(뺌)' if v != 'Y' else '클로드 뺌'] += 1; continue
            fix = (b + ['', '', ''])[2].strip()          # 2차가 번역을 고쳤으면 그것
            c = x['T'][int(ch[1]) - 1] if ch[0] == 'T' else x['W'][int(ch[1]) - 1]
            out.append({'part': x['part'], 'lk': x['lk'], 'w': x['w'], 'vi': c['vi'], 'ko': fix or ko, 'src': 'main_book' if ch[0] == 'T' else 'wiktionary',
                        'where': c.get('where', '')})
    return out, st


def main():
    P, st = picks()
    print(st, '· 넣을 것', len(P))
    if '--dry' in sys.argv: return
    F = {n: R / f'data/{n}.json' for n in ('days', 'order', 'gybm', 'cohort22')}
    J = {n: json.loads(p.read_text(encoding='utf-8')) for n, p in F.items()}
    days = {str(d['day']): d for d in J['days']['days'] if isinstance(d['day'], int) and not d.get('track')}
    job = {f'J0.{ti}.{ci}.{li}': l for ti, t in enumerate(J['order']['vols'][0]['tracks']) for ci, c in enumerate(t['chapters']) for li, l in enumerate(c['lessons'])}
    G = {s['key']: s for s in J['gybm']['sources']}
    GK = {'선배': 'senior', '22기': 'c22', '교재': 'main'}
    bad, texts, changed, n = [], [], set(), 0
    for p in P:
        if p['part'] == '일상': L, fn = (days.get(p['lk']) or {}).get('words', []), 'days'
        elif p['part'] == '직무': L, fn = (job.get(p['lk']) or {}).get('words', []), 'order'
        else:
            gk = GK[p['part']]; li = int(p['lk'].replace(f'B:{gk}', '')); L, fn = G[gk]['lessons'][li]['words'], 'gybm'
        ws = [w for w in L if key(w['vi']) == key(p['w'])]
        if len(ws) != 1: bad.append(f"{p['part']} {p['lk']} {p['w']}: 낱말 {len(ws)}개"); continue
        w = ws[0]
        ex = {'vi': p['vi'], 'ko': p['ko'], 'kr': vi_kr.word(p['vi']), 'krs': vi_kr.word(p['vi'], True), 'src': p['src']}
        if p['where']: ex['where'] = p['where']
        w['ex'] = ex
        if fn == 'gybm': w['ex_src'] = p['src']; w['ex_chk'] = 'source_fix'
        changed.add(fn); texts.append(p['vi']); n += 1
        if p['part'] == '22기':
            li = int(p['lk'].replace('B:c22', ''))
            hit = [x for x in J['cohort22']['days'][li // 3]['words'] if key(x['vi']) == key(p['w'])]
            for x in hit: x['ex'] = dict(ex)
            if hit: changed.add('cohort22')
    if bad: print('\n'.join(bad[:20]), f'… {len(bad)}')
    for fn in changed:
        s = json.dumps(J[fn], ensure_ascii=False, separators=(',', ':')) if fn == 'order' else json.dumps(J[fn], ensure_ascii=False, indent=1)
        F[fn].write_text(s, encoding='utf-8')
    print('넣음', n, '· 고친 파일', sorted(changed))
    if '--no-audio' in sys.argv: return
    idxp = R / 'data/audio_index.json'; idx = json.loads(idxp.read_text(encoding='utf-8'))
    need = [t for t in dict.fromkeys(texts) if idx.get(t) != k12(t) or not all((R / f'audio/{v}/n/{k12(t)}.mp3').exists() for v in VOICES)]
    print('소리 만들 문장', len(need), flush=True)
    (D / 'need_audio.json').write_text(json.dumps(need, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    main()
