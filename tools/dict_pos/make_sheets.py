#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""품사 없는 뜻 판정 시트 (2026-10-01, 대표님 "그래 한번 품사 구분해봐").
품사 빈 뜻 4,440(표제어 4,286)은 전부 베트남어판 위키낱말사전 — 옛 무료 사전(FVDP)을 옮겨 온 쪽이라 원문에 품사 칸({{-noun-}} 등)이 없고 {{-dfn-}}(뜻풀이)만 있다.
근거로 줄 것: 베트남어 뜻풀이 원문 · 원문 예문 · 우리 한국어 뜻. 결과는 '우리가 판정한 품사'라 앱에서 따로 표시한다(apply.py).
결과 tools/dict_pos/pos_NN.json. 쓰기: python3 tools/dict_pos/make_sheets.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')
nfc = lambda s: U.normalize('NFC', str(s)).strip()
SHEET = 450


def clean(t):
    t = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", t).replace("'''", '').replace("''", '')
    t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    return re.sub(r'\s+', ' ', t).strip()


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    raw = {}
    for f in ['viwikt_text', 'viwikt_text4', 'viwikt_text_more', 'viwikt_text_more2']:
        p = SP / (f + '.json')
        if p.exists():
            for k, v in json.loads(p.read_text(encoding='utf-8')).items():
                if v: raw.setdefault(nfc(k).lower(), v)
    items, n = [], 0
    for k in sorted(F):
        e = F[k]
        idx = [i for i, p in enumerate(e['p']) if not p]
        if not idx: continue
        v = raw.get(k, '')
        sec = v.split('{{-trans-}}')[0]
        defs = [clean(m) for m in re.findall(r'^#(?![:*])\s*(.+)$', sec, re.M)][:6]
        exs = [clean(m) for m in re.findall(r'^#:\s*(.+)$', sec, re.M)][:3]
        n += 1
        items.append({'n': n, 'w': e.get('h') or k, 'senses': [{'i': i, 'ko': e['s'][i]} for i in idx],
                      'other_pos': sorted({p for p in e['p'] if p}), 'vi_def': defs, 'vi_ex': exs})
    for j in range(0, len(items), SHEET):
        (R / f'tools/dict_pos/pos_{j // SHEET:02d}.json').write_text(json.dumps(items[j:j + SHEET], ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'표제어 {len(items)} · 뜻 {sum(len(x["senses"]) for x in items)} · 원문 뜻풀이 있음 {sum(1 for x in items if x["vi_def"])} · 시트 {(len(items) + SHEET - 1) // SHEET}')


if __name__ == '__main__':
    main()
