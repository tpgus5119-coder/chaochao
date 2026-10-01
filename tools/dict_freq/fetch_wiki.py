#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""베트남어 위키백과에서 **많이 읽힌 문서**(지난 12달 월별 조회수 상위 1,000개씩)의 첫머리 글을 받는다 — 사전 낱말 빈도(④ 흔한 말 표시)의 재료 (2026-10-01).
처음엔 무작위 문서를 받았는데 61%가 봇이 만든 생물 종·소행성·마을 소개 글이라(… là một loài … trong họ …) 빈도가 쏠려 버렸다 — 그래서 사람들이 읽는 문서로.
위키백과 글은 CC BY-SA. 글 자체는 앱에 싣지 않고 낱말 수만 센다. 결과 scratchpad/viwiki_corpus.jsonl (문서마다 한 줄). 이어서 돌릴 수 있다.
쓰기: python3 tools/dict_freq/fetch_wiki.py"""
import json, pathlib, subprocess, sys, time, urllib.parse
R = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = R / 'scratchpad/viwiki_corpus.jsonl'
UA = 'chaochao-app/1.0 (https://tpgus5119-coder.github.io/chaochao/; tpgus5119@gmail.com)'
API = 'https://vi.wikipedia.org/w/api.php'


def get(url):
    for k in range(5):
        r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, '-w', '\n%{http_code}', url], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try: return json.loads(body)
            except Exception: pass
        time.sleep(10 * (k + 1) if code != '429' else 60)
    return None


def titles():
    out = []
    for y, m in [(2025, m) for m in range(10, 13)] + [(2026, m) for m in range(1, 10)]:
        j = get(f'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/vi.wikipedia/all-access/{y}/{m:02d}/all-days')
        if not j: continue
        for a in j['items'][0]['articles']:
            t = a['article']
            if ':' in t or t == 'Trang_Chính': continue
            out.append(t.replace('_', ' '))
        time.sleep(0.5)
    return list(dict.fromkeys(out))


def main():
    have = set()
    if OUT.exists():
        for l in OUT.read_text(encoding='utf-8').splitlines():
            try: have.add(json.loads(l)['id'])
            except Exception: pass
    ts = titles()
    print('문서 이름', len(ts), '· 이미', len(have), flush=True)
    with open(OUT, 'a', encoding='utf-8') as f:
        for i in range(0, len(ts), 20):
            q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'formatversion': '2', 'prop': 'extracts', 'exintro': '1',
                                        'explaintext': '1', 'exlimit': '20', 'redirects': '1', 'titles': '|'.join(ts[i:i + 20])})
            j = get(API + '?' + q)
            for p in ((j or {}).get('query') or {}).get('pages', []):
                t = (p.get('extract') or '').strip()
                if 'pageid' not in p or p['pageid'] in have or len(t) < 80: continue
                have.add(p['pageid']); f.write(json.dumps({'id': p['pageid'], 't': t}, ensure_ascii=False) + '\n')
            f.flush()
            if i % 400 == 0: print(i, len(have), flush=True)
            time.sleep(0.5)
    print('끝', len(have), flush=True)


if __name__ == '__main__':
    main()
