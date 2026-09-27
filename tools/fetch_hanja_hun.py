#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자 뿌리의 글자마다 **훈(뜻)과 음**을 영어 위키낱말사전에서 받는다 (대표님 지시 2026-09-27 밤: "한문과 발음만 보여주면 안 되지, 무슨 옹인지 알려줘야지").
한국어 항목의 {{ko-hanja|훈|음}} 을 읽는다. 결과 data/_hanja_hun.json = { "翁": [["늙은이","옹"]], … }. 20자씩 curl. 이어서 돌릴 수 있다."""
import json, pathlib, re, subprocess, sys, time, urllib.parse
R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / 'data/_hanja_hun.json'
RAW = R / 'data/_hanja_hun_raw.json'      # 한국어 절 원문 — 파서를 고칠 때 다시 안 받아도 되게
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
API = 'https://en.wiktionary.org/w/api.php'

def ko_section(text):
    m = re.search(r'^==\s*Korean\s*==\s*$', text, re.M)
    if not m: return ''
    rest = text[m.end():]
    n = re.search(r'^==[^=].*==\s*$', rest, re.M)
    return rest[:n.start()] if n else rest

def parse(sec):
    out = []
    for m in re.finditer(r'\{\{ko-hanja(?:/new)?\|([^}]*)\}\}', sec):
        parts = [re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', p).strip() for p in m.group(1).split('|')]
        named = {p.split('=', 1)[0]: p.split('=', 1)[1] for p in parts if '=' in p}
        pos = [p for p in parts if '=' not in p and p]
        hun = eum = None
        if len(pos) >= 2: hun, eum = pos[-2], pos[-1]        # (훈|음) 또는 (사전꼴|관형꼴|음)
        elif named.get('eumhun') and len(named['eumhun'].split()) >= 2:
            bits = named['eumhun'].split(); hun, eum = ' '.join(bits[:-1]), bits[-1]
        if hun and eum and re.fullmatch(r'[가-힣]', eum):
            pair = [hun, eum]
            if pair not in out: out.append(pair)
    return out

def fetch(titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                'format': 'json', 'formatversion': '2', 'titles': '|'.join(titles)})
    for a in range(5):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, '-w', '\n%{http_code}', API + '?' + q], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try: return json.loads(body)
            except Exception: pass
        time.sleep(5 * (a + 1) if code != '429' else 20 * (a + 1))
    return None

def main():
    chars = json.loads((R / 'scratchpad/hanja_chars.json').read_text(encoding='utf-8'))
    raw = json.loads(RAW.read_text(encoding='utf-8')) if RAW.exists() else {}
    todo = [c for c in chars if c not in raw]
    print(f'글자 {len(chars)} · 이미 {len(raw)} · 받을 것 {len(todo)}', flush=True)
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = fetch(batch)
        if not j: print('  실패', batch[:3], flush=True); time.sleep(10); continue
        for p in j.get('query', {}).get('pages', []):
            t = p['title']
            if p.get('missing'): raw[t] = ''; continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            raw[t] = ko_section(txt)[:4000]
        for b in batch: raw.setdefault(b, '')
        RAW.write_text(json.dumps(raw, ensure_ascii=False), encoding='utf-8')
        print(f'  {min(i + 20, len(todo))}/{len(todo)}', flush=True)
        time.sleep(0.8)
    got = {c: parse(raw.get(c, '')) for c in chars}
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print(f'끝 · {len(got)} · 훈 있음 {sum(1 for v in got.values() if v)}', flush=True)

if __name__ == '__main__':
    main()

# ---- 2차: 영어 위키에 훈이 없는 글자는 한국어 위키낱말사전({{한자풀이|훈=…|음=…}})에서 ----
def ko_fetch(titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                'format': 'json', 'formatversion': '2', 'titles': '|'.join(titles)})
    for a in range(5):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, '-w', '\n%{http_code}', 'https://ko.wiktionary.org/w/api.php?' + q], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try: return json.loads(body)
            except Exception: pass
        time.sleep(5 * (a + 1))
    return None

def ko_parse(text):
    out = []
    for m in re.finditer(r'\{\{한자풀이\|([^}]*)\}\}', text):
        kv = {}
        for p in m.group(1).split('|'):
            if '=' in p:
                k, v = p.split('=', 1); kv[k.strip()] = v.strip()
        hun = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', kv.get('훈', '')).strip()
        eum = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', kv.get('음', '')).strip()
        hun = re.sub(r'\s*,\s*', ', ', hun)
        for e in re.split(r'[,/ ]+', eum):
            if hun and re.fullmatch(r'[가-힣]', e):
                pair = [hun, e]
                if pair not in out: out.append(pair)
    return out

def second_pass():
    got = json.loads(OUT.read_text(encoding='utf-8'))
    todo = [c for c, v in got.items() if not v]
    print(f'2차(한국어 위키) 받을 것 {len(todo)}', flush=True)
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        j = ko_fetch(batch)
        if not j: print('  실패', batch[:3], flush=True); time.sleep(10); continue
        for p in j.get('query', {}).get('pages', []):
            if p.get('missing'): continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            r = ko_parse(txt)
            if r: got[p['title']] = r
        OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
        print(f'  {min(i + 20, len(todo))}/{len(todo)} · 훈 있음 {sum(1 for v in got.values() if v)}', flush=True)
        time.sleep(0.8)
    print(f'2차 끝 · 훈 있음 {sum(1 for v in got.values() if v)} / {len(got)}', flush=True)

if __name__ == '__main__' and '--ko' in sys.argv:
    second_pass()
