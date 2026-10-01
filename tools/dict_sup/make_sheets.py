#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""[보충] 뜻 후보 시트 (2026-10-01, 대표님 "보충도 ㄱㄱ — 무작정 넣지 말고 검사하고").
위키 사전(data/_dict_full.json) 뜻에 수업 낱말의 뜻(일상·직무·교재·선배·22기, 사람이 검수한 것)이 안 들어 있는 것만 뽑는다 — 글자 비교(그대로·포함·'하다' 뗀 어간).
판정은 Sonnet 1차(같은 뜻을 달리 쓴 것 / 사전에 없는 뜻 = 보충 / 수업 뜻이 틀림) → 클로드가 보충·틀림 전부 다시 봄.
결과 tools/dict_sup/sup_NN.json. 쓰기: python3 tools/dict_sup/make_sheets.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
nfc = lambda s: U.normalize('NFC', str(s)).strip()
SHEET = 300


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))['days']
    O = json.loads((R / 'data/order.json').read_text(encoding='utf-8'))
    G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']
    src = [('일상', w) for d in D for w in d['words']] + [('직무', w) for t in O['vols'][0]['tracks'] for c in t['chapters'] for l in c['lessons'] for w in l['words']]
    src += [({'main': '교재', 'senior': '선배', 'c22': '22기'}.get(s['key'], s['key']), w) for s in G for l in s['lessons'] for w in l['words']]
    phr = lambda s: [p.strip() for p in re.split(r'\s*[·,/;]\s*', re.sub(r'\([^)]*\)', '', s)) if p.strip()]
    core = lambda p: re.sub(r'[^가-힣0-9]', '', p)
    cand = {}
    for where, w in src:
        k = nfc(w['vi']).lower()
        if k not in F or not w.get('ko'): continue
        ss = [core(x) for x in F[k]['s']]
        for p in phr(nfc(w['ko']))[:2]:
            c = core(p)
            if not c: continue
            st = c[:-2] if c.endswith('하다') and len(c) > 2 else c
            if any(c in s or st in s or (len(s) >= 2 and s in c) for s in ss): continue
            e = cand.setdefault(k, {'m': [], 'from': [], 'ex': ''})
            if p not in e['m']: e['m'].append(p)
            if where not in e['from']: e['from'].append(where)
            ex = w.get('ex')
            if isinstance(ex, dict) and ex.get('vi') and not e['ex']: e['ex'] = ex['vi'] + ' / ' + ex.get('ko', '')
    # 둘째 근거: 국립국어원 한국어기초사전 한→베 대역(data/_ko2vi.json) — 한국어 낱말의 **첫째** 대역이 이 낱말인데 사전 뜻에 그 한국어가 없을 때.
    # 너무 많아(8,848) 앱 낱말·자주 쓰는 말 5,000위·뜻이 둘 이하인 낱말(nhạc nhẹ '소규모 악단'뿐 → 경음악)만
    K = json.loads((R / 'data/_ko2vi.json').read_text(encoding='utf-8'))
    FR = json.loads((R / 'data/_dict_freq.json').read_text(encoding='utf-8'))
    app = {nfc(w['vi']).lower() for _, w in src}
    kd = {}
    for ko, vis in K.items():
        c = core(ko)
        if not c or not vis or vis[0] not in F: continue
        v = vis[0]
        if not (v in app or v in FR or len(F[v]['s']) <= 2): continue
        st = c[:-2] if c.endswith('하다') and len(c) > 2 else c
        if any(c in s or st in s or (len(s) >= 2 and s in c) for s in [core(x) for x in F[v]['s']]): continue
        kd.setdefault(v, []).append(ko)
    items = []
    for n, k in enumerate(sorted(set(cand) | set(kd)), 1):
        e = F[k]; c0 = cand.get(k, {'m': [], 'from': [], 'ex': ''})
        items.append({'n': n, 'w': e.get('h') or k, 'dict': [(p or '-') + ' ' + s for p, s in zip(e['p'], e['s'])], 'lesson': c0['m'], 'from': c0['from'],
                      'krdict': kd.get(k, [])[:6], 'ex': c0['ex']})
    for i in range(0, len(items), SHEET):
        (R / f'tools/dict_sup/sup_{i // SHEET:02d}.json').write_text(json.dumps(items[i:i + SHEET], ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'낱말 {len(items)} · 시트 {(len(items) + SHEET - 1) // SHEET}')


if __name__ == '__main__':
    main()
