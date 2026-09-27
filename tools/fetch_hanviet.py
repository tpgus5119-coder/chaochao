#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자 뿌리(Hán Việt) 모으기 — 앱 낱말마다 영어 위키낱말사전(en.wiktionary)의 베트남어 어원에서 한자를 뽑는다 (대표님 지시 2026-09-27).
근거 있는 것만 적는다: {{vi-etym-sino|學|…|生|…}} 템플릿, 'Sino-Vietnamese reading of 罵', '[[Chinese]] [[感恩]]' 꼴.
결과 data/_hanviet.json = { "học sinh": {"han": "學生", "src": "vi-etym-sino"}, … }. 한글 음(학생)은 attach 단계에서 hanja 꾸러미로 단다.
쓰기: python3 tools/fetch_hanviet.py            (이어서 돌릴 수 있다 — 이미 받은 낱말은 건너뛴다)
한 번에 20낱말씩 묶어 묻고 0.8초 쉰다(429 조심 — 2026-09 위키 429 겪음). User-Agent 필수."""
import json, pathlib, re, sys, time, urllib.parse, urllib.request

R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / 'data/_hanviet.json'
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
API = 'https://en.wiktionary.org/w/api.php'
CJK = re.compile(r'[一-鿿㐀-䶿]')


def app_words():
    ws = []
    seen = set()
    def add(v):
        if not isinstance(v, str): return
        v = v.strip()
        if not v or v.lower() in seen or len(v) > 40 or re.search(r'[.!?,]', v): return
        seen.add(v.lower()); ws.append(v)
    D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))
    for d in D['days']:
        for w in d.get('words', []): add(w.get('vi'))
    G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))
    for s in G['sources']:
        for l in s['lessons']:
            for w in l['words']: add(w.get('vi'))
    O = json.loads((R / 'data/order.json').read_text(encoding='utf-8'))
    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get('vi'), str) and 'ko' in o: add(o['vi'])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(O)
    return ws


def vi_section(text):
    m = re.search(r'^==\s*Vietnamese\s*==\s*$', text, re.M)
    if not m: return ''
    rest = text[m.end():]
    n = re.search(r'^==[^=].*==\s*$', rest, re.M)
    return rest[:n.start()] if n else rest


def parse(sec):
    """어원에서 한자만. 여러 어원(Etymology 1·2)이 있으면 첫 것만 — 뜻이 갈리는 낱말은 사람이 봐야 한다."""
    ety = re.search(r'===+\s*Etymology[^=\n]*===+\s*\n(.*?)(?=\n===|\Z)', sec, re.S)
    if not ety: return None
    e = ety.group(1)
    m = re.search(r'\{\{vi-etym-sino\|([^}]*)\}\}', e)
    if m:
        parts = [p for p in m.group(1).split('|') if '=' not in p]
        han = ''.join(p for i, p in enumerate(parts) if i % 2 == 0 and CJK.search(p))
        if han: return {'han': han, 'src': 'vi-etym-sino'}
    m = re.search(r'Sino-Vietnamese (?:reading|word|form)s? (?:of|from) (?:\{\{[^}]*\|)?\[?\[?([一-鿿㐀-䶿]+)', e)
    if m: return {'han': m.group(1), 'src': 'sino-reading'}
    m = re.search(r'\[\[Chinese\]\] \[\[([一-鿿㐀-䶿]+)\]\]', e)
    if m: return {'han': m.group(1), 'src': 'chinese-link'}
    m = re.search(r'\{\{(?:der|bor|inh)\|vi\|(?:zh|ltc|och|lzh)\|([一-鿿㐀-䶿]+)', e)
    if m: return {'han': m.group(1), 'src': 'der-zh'}
    return None


def fetch(titles):
    """파이썬 urllib 은 이 맥(3.14)에 인증서가 없어 SSL 오류가 난다 — curl 로 부른다."""
    import subprocess
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
    words = app_words()
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    todo = [w for w in words if w not in got]
    print(f'낱말 {len(words)} · 이미 {len(got)} · 받을 것 {len(todo)}', flush=True)
    n = 0
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = fetch(batch)
        if not j: print('  실패', batch[:3], flush=True); time.sleep(10); continue
        # 정규화(normalized)·대소문자 — 물은 제목과 돌아온 제목을 맞춘다
        norm = {}
        for x in j.get('query', {}).get('normalized', []): norm[x['to']] = x['from']
        for p in j.get('query', {}).get('pages', []):
            t = norm.get(p['title'], p['title'])
            if p.get('missing'): got[t] = {'han': None, 'src': 'missing'}; continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            sec = vi_section(txt)
            got[t] = parse(sec) or {'han': None, 'src': 'no-vi' if not sec else 'no-han'}
        for b in batch:
            if b not in got: got[b] = {'han': None, 'src': 'unanswered'}
        n += len(batch)
        if n % 200 < 20:
            OUT.write_text(json.dumps(got, ensure_ascii=False, indent=0), encoding='utf-8')
            print(f'  {n}/{len(todo)} · 한자 있음 {sum(1 for v in got.values() if v.get("han"))}', flush=True)
        time.sleep(0.8)
    OUT.write_text(json.dumps(got, ensure_ascii=False, indent=0), encoding='utf-8')
    have = sum(1 for v in got.values() if v.get('han'))
    print(f'끝 · 낱말 {len(got)} · 한자 있음 {have}', flush=True)


if __name__ == '__main__':
    main()
