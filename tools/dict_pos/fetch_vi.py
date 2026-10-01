#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 낱말 품사 전체 점검의 둘째 근거 — 베트남어판 위키낱말사전(vi.wiktionary) 원문을 받는다 (2026-10-01, 대표님 "어플 내의 모든 단어를 다시 점검해야 한다").
대상: 앱 낱말(일상·직무·교재·선배·22기) 가운데 사전(data/_dict_full.json)에 있는 것. 이미 받아 둔 것(scratchpad viwikt_text*)은 다시 안 받는다.
결과 scratchpad/vi_pos_raw.json { 낱말: 베트남어 절 원문 | "" }. 이어서 돌릴 수 있다. 쓰기: python3 tools/dict_pos/fetch_vi.py"""
import json, pathlib, re, subprocess, time, urllib.parse
R = pathlib.Path(__file__).resolve().parent.parent.parent
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
OUT = SP / 'vi_pos_raw.json'


def app_words():
    D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))['days']
    O = json.loads((R / 'data/order.json').read_text(encoding='utf-8'))
    G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']
    ws = [w['vi'] for x in D for w in x['words']] + [w['vi'] for t in O['vols'][0]['tracks'] for c in t['chapters'] for l in c['lessons'] for w in l['words']]
    ws += [w['vi'] for s in G for l in s['lessons'] for w in l['words']]
    return sorted({w.strip().lower() for w in ws})


def vie(t):
    m = re.search(r'\{\{-vie-\}\}', t)
    if not m: return ''
    rest = t[m.end():]; n = re.search(r'\{\{-[a-z]{3}-\}\}', rest)
    return rest[:n.start()] if n else rest


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    have = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    for f in ['viwikt_text', 'viwikt_text4', 'viwikt_text_more', 'viwikt_text_more2']:
        p = SP / (f + '.json')
        if p.exists():
            for k, v in json.loads(p.read_text(encoding='utf-8')).items():
                if v: have.setdefault(k.lower(), v)
    todo = [w for w in app_words() if w in F and w not in have]
    print('앱 낱말 중 사전에 있음', sum(1 for w in app_words() if w in F), '· 받을 것', len(todo), flush=True)
    for i in range(0, len(todo), 50):
        b = todo[i:i + 50]
        q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'format': 'json', 'formatversion': '2', 'redirects': '1', 'titles': '|'.join(b)})
        for a in range(4):
            r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, 'https://vi.wiktionary.org/w/api.php?' + q], capture_output=True, text=True)
            try: j = json.loads(r.stdout); break
            except Exception: time.sleep(10 * (a + 1)); j = None
        for p in ((j or {}).get('query') or {}).get('pages', []):
            have[p['title'].lower()] = '' if p.get('missing') else vie(p['revisions'][0]['slots']['main']['content'])
        for w in b: have.setdefault(w, '')
        OUT.write_text(json.dumps(have, ensure_ascii=False), encoding='utf-8')
        if i % 1000 == 0: print(i, flush=True)
        time.sleep(0.6)
    print('끝', len(have))


if __name__ == '__main__':
    main()
