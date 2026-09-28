#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 단어 전부의 어원(한자 뿌리·외래어 뿌리) 근거 받기 — 영어 위키낱말사전 베트남어 항목 원문 (대표님 지시 2026-09-28 밤:
"모든 단어 하나하나 한문 뿌리 + 외래어 뿌리, 한문 뿌리 아닌데 넣지 말라, 사실대로").
결과 data/_etym_raw.json = { "học sinh": {"t": "học sinh", "raw": "<Vietnamese 절 원문>"} | {"missing": 1} }.
판정은 tools/build_roots.py 가 하고 클로드가 검수한다. 20낱말씩, 0.8초 쉼, 429 대비(fetch_dict_gloss.fetch). 이어서 돌릴 수 있다."""
import json, pathlib, re, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
import fetch_dict_gloss as F
OUT = R / 'data/_etym_raw.json'

def app_words():
    words = {}
    def walk(o):
        if isinstance(o, dict):
            v, k = o.get('vi'), o.get('ko')
            if isinstance(v, str) and isinstance(k, str) and not o.get('sent'):
                v = v.strip()
                if 1 < len(v) <= 40 and re.search(r'[a-zà-ỹđ]', v.lower()) and not re.search(r'[.!?,;:…/·"“”()\[\]=+]', v) and len(v.split()) <= 5:
                    words.setdefault(v.lower(), v)
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    for f in ('days', 'order', 'gybm', 'cohort22', 'basicwords'):
        walk(json.loads((R / f'data/{f}.json').read_text(encoding='utf-8')))
    return words

def main():
    W = app_words()
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    todo = [k for k in W if k not in got]
    # 대문자로 시작하는 낱말(Hàn Quốc·Tết 등)은 위키 제목도 대문자다 — 소문자로만 찾아 '없음'이 된 것은 원래 표기로 다시 찾는다 (2026-09-28 밤 발견)
    caps = [k for k in W if W[k] != k and got.get(k, {}).get('missing') and not got[k].get('caps_tried')]
    for i in range(0, len(caps), 20):
        batch = caps[i:i + 20]
        j = F.fetch([W[k] for k in batch])
        if not j: print('  실패', batch[:2], flush=True); time.sleep(10); continue
        norm = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
        for p in j.get('query', {}).get('pages', []):
            t = norm.get(p['title'], p['title']); k = t.lower()
            if k not in batch or p.get('missing'): continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            sec = F.vi_section(txt)
            got[k] = {'t': t, 'raw': sec} if sec else {'t': t, 'novi': 1}
        for k in batch:
            got[k].setdefault('caps_tried', 1)
        time.sleep(0.8)
    if caps:
        OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
        print(f'대문자 다시 찾기 {len(caps)} · 이제 있음 {sum(1 for k in caps if got[k].get("raw"))}', flush=True)
    print(f'앱 단어 {len(W)} · 이미 {len(got)} · 받을 것 {len(todo)}', flush=True)
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = F.fetch(batch)
        if not j: print('  실패', batch[:2], flush=True); time.sleep(10); continue
        norm = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
        seen = set()
        for p in j.get('query', {}).get('pages', []):
            t = norm.get(p['title'], p['title']); k = t.lower(); seen.add(k)
            if p.get('missing'): got[k] = {'missing': 1}; continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            sec = F.vi_section(txt)
            got[k] = {'t': t, 'raw': sec} if sec else {'t': t, 'novi': 1}
        for b in batch:
            if b not in got: got[b] = {'missing': 1}
        if (i // 20) % 10 == 0:
            OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
            print(f'  {min(i + 20, len(todo))}/{len(todo)} · 베트남어 항목 있음 {sum(1 for v in got.values() if v.get("raw"))}', flush=True)
        time.sleep(0.8)
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print(f'끝 · {len(got)} · 베트남어 항목 있음 {sum(1 for v in got.values() if v.get("raw"))}', flush=True)

if __name__ == '__main__':
    main()
