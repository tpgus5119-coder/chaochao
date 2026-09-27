#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""모든 베트남어 표제어(data/_vi_words.json 47,341개)의 영어 뜻풀이를 영어 위키낱말사전에서 받는다 (대표님 지시 2026-09-27:
앱 사전에 베트남어 낱말 전부 — Qwen 이 1차로 한국어로 옮기고 클로드가 하나하나 검수).
결과 data/_dict_gloss.json = { "học sinh": {"pos": ["Noun"], "defs": ["a student"], "han": "學生"}, … } — 베트남어 항목의 정의 줄(#)만.
20낱말씩 묶어 curl 로 묻고 0.8초 쉰다. 이어서 돌릴 수 있다(받은 것은 건너뜀). 200개마다 저장."""
import json, pathlib, re, subprocess, sys, time, urllib.parse

R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / 'data/_dict_gloss.json'
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
API = 'https://en.wiktionary.org/w/api.php'
CJK = re.compile(r'[一-鿿㐀-䶿]')


def headwords():
    W = json.loads((R / 'data/_vi_words.json').read_text(encoding='utf-8'))
    ws = W if isinstance(W, list) else list(W.keys())
    out, seen = [], set()
    for w in ws:
        w = str(w).strip()
        if not w or w.lower() in seen or len(w) > 40: continue
        seen.add(w.lower()); out.append(w)
    return out


def vi_section(text):
    m = re.search(r'^==\s*Vietnamese\s*==\s*$', text, re.M)
    if not m: return ''
    rest = text[m.end():]
    n = re.search(r'^==[^=].*==\s*$', rest, re.M)
    return rest[:n.start()] if n else rest


def clean(line):
    t = line
    t = re.sub(r'\{\{lb\|vi\|([^}]*)\}\}', lambda m: '(' + m.group(1).replace('|', ', ') + ')', t)
    t = re.sub(r'\{\{(?:l|m|w)\|[a-z\-]+\|([^|}]+)(?:\|[^}]*)?\}\}', r'\1', t)
    t = re.sub(r'\{\{(?:gloss|gl|qualifier|q)\|([^}]*)\}\}', r'(\1)', t)
    t = re.sub(r'\{\{(?:alt form|alternative form of|alt sp|alternative spelling of|syn of|synonym of|clip of|clipping of|abbr of|abbreviation of|short for|ellipsis of)\|vi\|([^|}]+)(?:\|[^}]*)?\}\}', r'= \1', t)
    t = re.sub(r'\{\{[^}]*\}\}', '', t)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', t)
    t = re.sub(r"'''?", '', t)
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\s+', ' ', t).strip(' .;:')


def parse(sec):
    pos, defs, han = [], [], None
    cur = None
    for line in sec.split('\n'):
        h = re.match(r'^===+\s*([A-Za-z ]+?)\s*===+\s*$', line)
        if h:
            cur = h.group(1).strip()
            if cur in ('Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Numeral', 'Classifier', 'Particle', 'Interjection', 'Conjunction', 'Preposition', 'Proper noun', 'Determiner', 'Phrase', 'Idiom', 'Proverb', 'Prefix', 'Suffix', 'Affix', 'Adjectival noun'):
                if cur not in pos: pos.append(cur)
            continue
        if line.startswith('# ') and cur in pos:
            d = clean(line[2:])
            if d and len(defs) < 6: defs.append(d)
        if han is None and 'vi-etym-sino' in line:
            m = re.search(r'\{\{vi-etym-sino\|([^}]*)\}\}', line)
            if m:
                parts = [p for p in m.group(1).split('|') if '=' not in p]
                hh = ''.join(p for i, p in enumerate(parts) if i % 2 == 0 and CJK.search(p))
                if hh: han = hh
    return {'pos': pos, 'defs': defs, 'han': han}


def fetch(titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                'format': 'json', 'formatversion': '2', 'titles': '|'.join(titles)})
    for a in range(5):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, '-w', '\n%{http_code}', API + '?' + q], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try: return json.loads(body)
            except Exception: pass
        if code == '429': time.sleep(20 * (a + 1)); continue
        time.sleep(5 * (a + 1))
    return None


def main():
    words = headwords()
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    todo = [w for w in words if w not in got]
    print(f'표제어 {len(words)} · 이미 {len(got)} · 받을 것 {len(todo)}', flush=True)
    n = 0
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = fetch(batch)
        if not j: print('  실패', batch[:3], flush=True); time.sleep(10); continue
        norm = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
        for p in j.get('query', {}).get('pages', []):
            t = norm.get(p['title'], p['title'])
            if p.get('missing'): got[t] = {'pos': [], 'defs': [], 'han': None, 'missing': 1}; continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            sec = vi_section(txt)
            r = parse(sec); r['raw'] = sec[:6000]          # 원문도 남긴다 — 파서를 고칠 때 다시 안 받아도 되게
            got[t] = r
        for b in batch:
            if b not in got: got[b] = {'pos': [], 'defs': [], 'han': None, 'missing': 1}
        n += len(batch)
        if n % 200 < 20:
            OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
            print(f'  {n}/{len(todo)} · 뜻 있음 {sum(1 for v in got.values() if v.get("defs"))}', flush=True)
        time.sleep(0.8)
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print(f'끝 · {len(got)} · 뜻 있음 {sum(1 for v in got.values() if v.get("defs"))}', flush=True)


if __name__ == '__main__':
    main()
