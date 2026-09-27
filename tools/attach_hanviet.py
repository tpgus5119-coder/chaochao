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


def reading(han):
    ko = hanja.translate(han, 'substitution')
    return None if CJK.search(ko) or not ko else ko


def label(vi, han):
    syl = len(vi.strip().split())
    if syl < 2 or len(han) != syl: return None   # 한 음절 낱말은 뺀다 — 같은 글자의 다른 뜻(báo 신문→豹 표범, cơ 기회→肌 살)을 첫 어원으로 잘못 잡는 것이 표본에서 보였다
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
        v = low.get(w['vi'].strip().lower())
        if not v or not v.get('han') or v.get('src') not in ('vi-etym-sino', 'chinese-link'): stat['없음'] += 1; w.pop('hanja', None); return   # 'sino-reading'·'der-zh' 는 표본에서 틀린 것(của→具, cạn→旱)이 보여 안 쓴다
        lab = label(w['vi'], v['han'])
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
