#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 예문 시트 (2026-10-01, ② 예문) — 위키낱말사전 원문의 베트남어 예문을 **그대로** 가져와 한국어 뜻만 붙인다(Sonnet 보조, PROMPT.md).
재료: 영어판 {{ux|vi|예문|영어 뜻}} (data/_dict_gloss.json raw) · 베트남어판 "#: ''예문''" 줄 (scratchpad viwikt_text*).
고르기: 사전 표제어(data/_dict_full.json)만 · 표제어가 예문 안에 낱말로 들어 있을 것 · 위키 꾸밈([[ ]]·''' ''') 벗기고 틀({{ }})·링크 찌꺼기 남으면 버림
· 3~25 낱말 · 표제어마다 2개(영어 뜻 있는 영어판 먼저). 결과 tools/dict_ex/ex_NN.json
쓰기: python3 tools/dict_ex/make_sheets.py"""
import json, pathlib, re, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')
OUT = R / 'tools/dict_ex'
nfc = lambda s: U.normalize('NFC', s)
PER, SHEET = 2, 450


def clean(t):
    t = nfc(t)
    t = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", t)
    t = t.replace("'''", "").replace("''", "")
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\s+", " ", t).strip(" ;")
    if re.search(r"\{\{|\}\}|\[|\]|https?:|=|\|", t): return ''
    return t


def has_word(sent, w):
    s = ' ' + re.sub(r"[.,!?;:\"“”‘’()…–—]", " ", sent.lower()) + ' '
    return (' ' + w.lower() + ' ') in re.sub(r"\s+", " ", s)


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    G = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
    got = {}
    for k, v in G.items():
        k = nfc(k).lower()
        if k not in F: continue
        raw = (v or {}).get('raw') or ''
        for m in re.finditer(r"\{\{uxi?\|vi\|((?:[^{}|]|\{\{[^{}]*\}\}|\[\[[^\]]*\]\])+)(?:\|((?:[^{}|]|\[\[[^\]]*\]\])*))?", raw):
            vi, en = clean(m.group(1)), clean(m.group(2) or '')
            if vi and not en.startswith('t='): got.setdefault(k, []).append((vi, en, 'en'))
    for f in ['viwikt_text', 'viwikt_text4', 'viwikt_text_more', 'viwikt_text_more2']:
        p = SP / (f + '.json')
        if not p.exists(): continue
        for k, v in json.loads(p.read_text(encoding='utf-8')).items():
            k = nfc(k).lower()
            if not v or k not in F: continue
            sec = v.split('{{-trans-}}')[0]
            for m in re.finditer(r"^#:\s*(.+?)\s*$", sec, re.M):
                vi = clean(m.group(1).strip("'").strip())
                if vi: got.setdefault(k, []).append((vi, '', 'vi'))
    items, n = [], 0
    for k in sorted(got):
        seen, xs = set(), []
        for vi, en, src in sorted(got[k], key=lambda x: (x[2] != 'en', len(x[0]))):
            nw = len(vi.split())
            if not 3 <= nw <= 25 or vi.lower() in seen or not has_word(vi, k): continue
            seen.add(vi.lower()); xs.append({'i': len(xs) + 1, 'vi': vi, 'en': en})
            if len(xs) == PER: break
        if not xs: continue
        e = F[k]
        n += 1
        items.append({'n': n, 'w': e.get('h') or k, 'k': ' · '.join(s for s in e['s'][:4] if s), 'x': xs})
    sheets = []
    cur, cnt = [], 0
    for it in items:
        cur.append(it); cnt += len(it['x'])
        if cnt >= SHEET: sheets.append(cur); cur, cnt = [], 0
    if cur: sheets.append(cur)
    for i, sh in enumerate(sheets):
        (OUT / f'ex_{i:02d}.json').write_text(json.dumps(sh, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'표제어 {len(items)} · 문장 {sum(len(i["x"]) for i in items)} · 영어 뜻 있음 {sum(1 for i in items for x in i["x"] if x["en"])} · 시트 {len(sheets)}')


if __name__ == '__main__':
    main()
