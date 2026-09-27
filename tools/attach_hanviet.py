#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자 뿌리를 낱말에 붙인다 — data/_hanviet.json(fetch_hanviet.py 결과) → days·gybm·order 의 낱말에 hanja: "感恩 · 감은".
한글 음은 hanja 꾸러미(한자→한글 음 표)로 단다(두음법칙 적용). 규칙으로 걸러 붙인다:
  · 한자 글자 수 == 베트남어 음절 수 일 때만 (한 음절에 한 글자 — 어긋나면 어원이 낱말 일부이거나 파싱이 틀린 것)
  · 한글 음이 안 나오는 글자(사전에 없는 한자)가 있으면 뺀다
쓰기: python3 tools/attach_hanviet.py            → 붙인 수·거른 수를 찍는다 (되돌리려면 --clear)"""
import json, pathlib, re, sys
R = pathlib.Path(__file__).resolve().parent.parent
import hanja
CJK = re.compile(r'[一-鿿㐀-䶿]')


def reading(han, prev_syl=None):
    """한글 음 — hanja 꾸러미(두음법칙) + 여러 음 가진 글자 바로잡기: 率 률/율(앞 음절이 모음·ㄴ 받침이면 율), 樂 음악의 악."""
    out = []
    for i, ch in enumerate(han):
        r = hanja.translate(ch, 'substitution') if i == 0 else hanja.translate(han[:i + 1], 'substitution')[-1:]
        if ch == '率':
            pv = out[-1] if out else ''
            tail = (ord(pv) - 0xAC00) % 28 if pv and '가' <= pv <= '힣' else -1
            r = '율' if (pv and (tail == 0 or tail == 4)) else '률'
        elif ch == '樂': r = '악'
        out.append(r)
    ko = ''.join(out)
    return None if CJK.search(ko) or not ko else ko


MAN = json.loads((R / 'data/_hanviet_manual.json').read_text(encoding='utf-8'))
ONE = {w.lower() for w in MAN.get('한음절_붙임', [])}
FIX = {k.lower(): v for k, v in MAN.get('바로잡음', {}).items()}
NO = {w.lower() for w in MAN.get('안_붙임', [])}
ADD = {k.lower(): v for k, v in MAN.get('추가', {}).items()}


def label(vi, han):
    syl = len(vi.strip().split())
    if len(han) != syl: return None
    ko = reading(han)
    if not ko: return None
    return f'{han} · {ko}'


def main():
    clear = '--clear' in sys.argv
    H = json.loads((R / 'data/_hanviet.json').read_text(encoding='utf-8')) if not clear else {}
    low = {k.lower(): v for k, v in H.items()}
    stat = {'붙임': 0, '음절 안 맞음': 0, '음 없음': 0, '없음': 0}
    def tag(w):
        if not isinstance(w, dict) or not isinstance(w.get('vi'), str): return
        if clear: w.pop('hanja', None); return
        k = w['vi'].strip().lower()
        v = low.get(k)
        han = None
        if k in NO: han = None
        elif k in FIX: han = FIX[k]                                   # 사람이 바로잡은 글자
        elif k in ADD: han = ADD[k]                                   # 위키에 없어 사람이 더한 한자어
        elif v and v.get('han') and v.get('src') in ('vi-etym-sino', 'chinese-link'):
            syl = len(k.split())
            if syl >= 2 or k in ONE: han = v['han']                    # 한 음절은 사람이 본 것만
        if not han: stat['없음'] += 1; w.pop('hanja', None); return
        lab = label(w['vi'], han)
        if lab: w['hanja'] = lab; stat['붙임'] += 1
        else:
            stat['음절 안 맞음' if len(v['han']) != len(w['vi'].strip().split()) else '음 없음'] += 1
            w.pop('hanja', None)
    for f in ('days', 'gybm', 'order'):
        p = R / f'data/{f}.json'
        J = json.loads(p.read_text(encoding='utf-8'))
        def walk(o):
            if isinstance(o, dict):
                if isinstance(o.get('vi'), str) and 'ko' in o: tag(o)
                for x in o.values(): walk(x)
            elif isinstance(o, list):
                for x in o: walk(x)
        walk(J)
        p.write_text(json.dumps(J, ensure_ascii=False, indent=1), encoding='utf-8')
    print(stat)


if __name__ == '__main__':
    main()
