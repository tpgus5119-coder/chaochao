#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 전체 뜻 점검 시트 (2026-10-01 밤, 대표님 "사전에 절대 오류가 있으면 안 돼 — 잘못된 정보를 전달하면 안 됨").
앱 낱말 점검(docs/기준.md §14-56)에서 찾은 잘못 — 한 칸에 두 품사 뜻 · 번역 칸 뒤바뀜(lau) · 품사와 뜻 꼴 어긋남(cười [명] 웃다) ·
뜻풀이 문장째 옮김 · 위키 제목 품사와 뜻풀이 어긋남 — 이 사전 전체에 얼마나 있는지 **뜻 하나하나** 원문과 맞대 본다.
재료: tools/dict_audit/sense_map.json (merge_full.py 가 씀: 표제어·뜻 번호·우리 품사·한국어·원문 품사·꼬리표·원문 뜻풀이·원문 언어).
낱말 단위로 묶는다(뜻끼리 뒤바뀐 것을 보려면 한 낱말의 뜻을 함께 봐야 한다). 시트 하나 ≈ 뜻 500.
쓰기: python3 tools/dict_audit/make_sheets.py"""
import json, pathlib, unicodedata as U, collections, re, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent; A = R / 'tools/dict_audit'
sys.path.insert(0, str(R / 'tools'))
from gloss_all import clean  # noqa: E402
# 원문 뜻풀이를 줄일 때(gloss_all.clean) {{vern|black carp}} 는 지워지고 {{taxlink|Mylopharyngodon piceus|species}} 는 'species' 만 남는다 → 'a (species)'.
# 생물 뜻은 이름·학명이 근거의 전부라 시트에는 되살린 뜻풀이(full)를 함께 준다 (2026-10-01 밤, 1차 점검 중 발견)
def expand(l):
    l = re.sub(r"\{\{vern\|([^|}]*)(?:\|[^}]*)?\}\}", r"\1", l)
    l = re.sub(r"\{\{(?:taxlink|taxfmt)\|([^|}]*)(?:\|[^}]*)?\}\}", r"\1", l)
    return l
key = lambda s: U.normalize('NFC', s).strip().lower()


def main():
    M = json.loads((A / 'sense_map.json').read_text(encoding='utf-8'))
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    G = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
    FULL = {}                                                  # (표제어, 줄인 뜻풀이) → 되살린 뜻풀이
    for k, g in G.items():
        for l in ((g or {}).get('raw') or '').splitlines():
            if l.startswith('# ') and ('{{vern' in l or '{{tax' in l):
                a, b = clean(l[2:]), clean(expand(l[2:]))
                if a != b: FULL.setdefault((k, a), b)
    by = collections.OrderedDict()
    for k, si, pos, ko, sp, lab, gl, lang in M:
        if not ko or ko == '-': continue
        if not pos:                                            # 원문에 품사 없는 뜻 — 판정 품사(tools/dict_pos)를 사전에서 뜻 글로 찾는다
            e = F.get(key(k)) or {}
            pos = next((p for p, s in zip(e.get('p', []), e.get('s', [])) if s == ko), '')
        sd = {'i': si, 'pos': pos, 'src_pos': sp, 'lab': lab, 'gloss': gl, 'ko': ko}
        fl = FULL.get((k, gl)) or FULL.get((k.lower(), gl))
        if fl: sd['full'] = fl
        by.setdefault(k, {'w': k, 'lang': lang, 'senses': []})['senses'].append(sd)
    sheets, cur, n_s = [], [], 0
    for n, it in enumerate(by.values(), 1):
        it = {'n': n, **it}; cur.append(it); n_s += len(it['senses'])
        if n_s >= 500: sheets.append(cur); cur, n_s = [], 0
    if cur: sheets.append(cur)
    for i, sh in enumerate(sheets):
        (A / f'au_{i:03d}.json').write_text('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in sh) + '\n]\n', encoding='utf-8')   # 낱말 하나 = 한 줄
    print('되살린 생물 뜻풀이', sum(1 for v in by.values() for x in v['senses'] if 'full' in x), '·', '표제어', len(by), '· 뜻', sum(len(v['senses']) for v in by.values()), '· 시트', len(sheets))


if __name__ == '__main__':
    main()
