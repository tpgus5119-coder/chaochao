#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""유의어·반의어 원자료 받기 (2026-09-29, 대표님: "인터넷 대형 사전에 유의어와 반의어가 표시된다면 일차적으로는 그것을 그대로 카피해서 반영").

받는 곳 (둘 다 공개 허락 CC BY-SA):
  · 베트남어 위키낱말사전 vi.wiktionary — 표제어 전부(data/_dict_gloss.json 의 46,627개 + 앱 단어). 그동안은 8,825개만 받아 두었다(data/_lex_src.json).
  · 영어 위키낱말사전 en.wiktionary — 이미 받은 원문(data/_dict_gloss.json raw)이 6,000자에서 잘린 25쪽과, 목록에 없던 앱 단어만 다시.
결과 data/_rel_raw.json = { "vi": {낱말: 베트남어 절 원문 | null}, "en": {낱말: 베트남어 절 원문 | null} }
  원문에서 뽑기는 tools/rel_parse.py 가 한다(받기와 뽑기를 나눠, 뽑는 규칙을 고쳐도 다시 받지 않게).
한 번에 50쪽씩, 쉬는 틈 1초. 끊겨도 이어서 받는다(받은 것은 건너뜀). 50번 묶음마다 저장.
"""
import json, pathlib, re, subprocess, sys, time, unicodedata, urllib.parse

R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / 'data/_rel_raw.json'
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
nfc = lambda s: unicodedata.normalize('NFC', s)


def fetch(host, titles):
    q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                'format': 'json', 'formatversion': '2', 'titles': '|'.join(titles)})
    for a in range(6):
        r = subprocess.run(['curl', '-sS', '-m', '90', '-A', UA, '-w', '\n%{http_code}', f'https://{host}/w/api.php?' + q],
                           capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try:
                return json.loads(body)
            except Exception:
                pass
        time.sleep(30 * (a + 1) if code == '429' else 5 * (a + 1))
    return None


# 베트남어 위키의 절 머리 중 세 글자인 것 — 언어 머리({{-eng-}} 등)와 모양이 같아 여기서 자르면 안 된다 (2026-09-29: 처음엔 {{-adj-}}·{{-syn-}}·{{-ant-}} 에서 잘려 유의어가 0개였다)
SEC3 = {'adj', 'adv', 'ant', 'syn', 'ref', 'num', 'art', 'det', 'nôm', 'see', 'hyp'}


def vi_section_vi(text):
    """vi.wiktionary: 베트남어 절 — {{-vie-}} 또는 == Tiếng Việt == 부터 다음 **언어** 머리까지"""
    m = re.search(r'^\s*(\{\{-vie-\}\}|==\s*Tiếng Việt\s*==)\s*$', text, re.M)
    if not m:
        return None
    rest = text[m.end():]
    for n in re.finditer(r'^\s*(\{\{-([a-z]{2,3})-\}\}|==[^=].*==)\s*$', rest, re.M):
        if n.group(2) and n.group(2) in SEC3:
            continue
        return rest[:n.start()]
    return rest


def vi_section_en(text):
    m = re.search(r'^==\s*Vietnamese\s*==\s*$', text, re.M)
    if not m:
        return None
    rest = text[m.end():]
    n = re.search(r'^==[^=].*==\s*$', rest, re.M)
    return rest[:n.start()] if n else rest


def words():
    g = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
    out, seen = [], set()
    for w in g:
        w = nfc(str(w).strip())
        if w and w.lower() not in seen and len(w) <= 60:
            seen.add(w.lower()); out.append(w)
    return out, g


def run(host, todo, store, cut):
    print(f'{host}: 받을 것 {len(todo)}', flush=True)
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        j = fetch(host, batch)
        if not j:
            print('  실패', batch[:2], flush=True); time.sleep(15); continue
        norm = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
        for p in j.get('query', {}).get('pages', []):
            k = nfc(norm.get(p['title'], p['title']))
            if p.get('missing') or p.get('invalid'):
                store[k] = None; continue
            txt = ((p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', ''))
            store[k] = cut(txt)
        for b in batch:
            store.setdefault(b, None)
        if (i // 50) % 50 == 0:
            OUT.write_text(json.dumps(DATA, ensure_ascii=False), encoding='utf-8')
            print(f'  {min(i + 50, len(todo))}/{len(todo)} · 베트남어 절 있음 {sum(1 for v in store.values() if v)}', flush=True)
        time.sleep(1.0)
    OUT.write_text(json.dumps(DATA, ensure_ascii=False), encoding='utf-8')


DATA = {}


def main():
    global DATA
    DATA = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'vi': {}, 'en': {}}
    ws, g = words()
    # 베트남어 위키: 전부 (옛 자르기로 받은 것은 다시 — '_v2' 표시가 없는 베트남어 절)
    redo = [w for w, v in DATA['vi'].items() if v and w not in DATA.get('vi_ok', {})]
    for w in redo: DATA['vi'].pop(w)
    DATA.setdefault('vi_ok', {})
    run('vi.wiktionary.org', [w for w in ws if w not in DATA['vi']], DATA['vi'], vi_section_vi)
    DATA['vi_ok'] = {w: 1 for w, v in DATA['vi'].items() if v}
    # 영어 위키: 잘린 쪽(6,000자) + 받은 적 없는 것
    en_todo = [w for w in ws if w not in DATA['en'] and (len((g.get(w) or {}).get('raw') or '') >= 6000)]
    run('en.wiktionary.org', en_todo, DATA['en'], vi_section_en)
    print('끝 · vi', sum(1 for v in DATA['vi'].values() if v), '/', len(DATA['vi']),
          '· en', sum(1 for v in DATA['en'].values() if v), '/', len(DATA['en']), flush=True)


if __name__ == '__main__':
    sys.exit(main())
