#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 단어의 베트남어 위키낱말사전(vi.wiktionary) 원문 받기 — 한자 뿌리·외래어 뿌리의 두 번째 근거 (2026-09-28 밤).
결과 data/_etym_raw_vi.json = { "ô nhiễm": {"raw": "<원문>"} | {"missing": 1} }. fetch_etym.py 와 같은 앱 단어 목록."""
import json, pathlib, subprocess, sys, time, urllib.parse
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from fetch_etym import app_words
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
API = 'https://vi.wiktionary.org/w/api.php'
OUT = R / 'data/_etym_raw_vi.json'

def fetch(titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                'format': 'json', 'formatversion': '2', 'titles': '|'.join(titles)})
    for a in range(5):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, '-w', '\n%{http_code}', API + '?' + q], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try: return json.loads(body)
            except Exception: pass
        time.sleep(20 * (a + 1) if code == '429' else 5 * (a + 1))
    return None

def main():
    W = app_words()
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    todo = [k for k in W if k not in got]
    # 대문자 표기 낱말은 원래 표기로 한 번 더 찾는다 (fetch_etym.py 와 같은 까닭, 2026-09-28 밤)
    caps = [k for k in W if W[k] != k and got.get(k, {}).get('missing') and not got[k].get('caps_tried')]
    for i in range(0, len(caps), 20):
        batch = caps[i:i + 20]
        j = fetch([W[k] for k in batch])
        if not j: print('  실패', batch[:2], flush=True); time.sleep(10); continue
        norm = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
        for p in j.get('query', {}).get('pages', []):
            k = norm.get(p['title'], p['title']).lower()
            if k in batch and not p.get('missing'):
                got[k] = {'raw': ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))[:8000]}
        for k in batch: got[k].setdefault('caps_tried', 1)
        time.sleep(0.8)
    if caps:
        OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
        print(f'대문자 다시 찾기 {len(caps)} · 이제 있음 {sum(1 for k in caps if got[k].get("raw"))}', flush=True)
    print(f'앱 단어 {len(W)} · 이미 {len(got)} · 받을 것 {len(todo)}', flush=True)
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = fetch(batch)
        if not j: print('  실패', batch[:2], flush=True); time.sleep(10); continue
        norm = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
        for p in j.get('query', {}).get('pages', []):
            k = norm.get(p['title'], p['title']).lower()
            if p.get('missing'): got[k] = {'missing': 1}; continue
            got[k] = {'raw': ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))[:8000]}
        for b in batch:
            if b not in got: got[b] = {'missing': 1}
        if (i // 20) % 10 == 0:
            OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
            print(f'  {min(i + 20, len(todo))}/{len(todo)} · 항목 있음 {sum(1 for v in got.values() if v.get("raw"))}', flush=True)
        time.sleep(0.8)
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print(f'끝 · {len(got)} · 항목 있음 {sum(1 for v in got.values() if v.get("raw"))}', flush=True)

if __name__ == '__main__':
    main()
