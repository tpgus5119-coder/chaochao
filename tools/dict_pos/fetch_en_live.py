#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 낱말 품사 전체 점검 ② — 지금의 영어판 위키를 앱 낱말마다 다시 받는다 (2026-10-01).
받아 둔 원문(tools/dict_full/src.json)은 9월 것. 그 뒤 위키에서 품사가 고쳐졌거나(ạ 조사 등) 제목·틀이 어긋난 곳을 찾으려고.
결과: 임시 폴더 en_live_raw.json {표제어: 베트남어 칸 원문} — 이어받기 됨. 쓰기: python3 tools/dict_pos/fetch_en_live.py"""
import json, pathlib, subprocess, time, urllib.parse, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/dict_pos')); sys.path.insert(0, str(R / 'tools/dict_full'))
from fetch_vi import app_words  # noqa: E402
from pos_live import vi_section, UA  # noqa: E402
SP = pathlib.Path('/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad')
OUT = SP / 'en_live_raw.json'


def main():
    F = json.loads((R / 'data/_dict_full.json').read_text(encoding='utf-8'))
    src = json.loads((R / 'tools/dict_full/src.json').read_text(encoding='utf-8'))
    have = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    titles = set()
    for w in app_words():
        if w not in F: continue
        for k in (w, w.capitalize(), F[w]['h']):          # 대소문자 다른 표제어(úc / Úc)도 받는다
            if k in src and src[k].get('lang') == 'en': titles.add(k)
    todo = sorted(t for t in titles if t not in have)
    print('받을 것', len(todo), '/', len(titles), flush=True)
    fail = 0
    for i in range(0, len(todo), 40):
        q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'format': 'json', 'formatversion': '2', 'titles': '|'.join(todo[i:i + 40])})
        for _ in range(4):
            r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, 'https://en.wiktionary.org/w/api.php?' + q], capture_output=True, text=True)
            try: js = json.loads(r.stdout); break
            except Exception: time.sleep(10)
        else: fail += 1; continue
        got = 0
        for p in js.get('query', {}).get('pages', []):
            if p.get('missing'): have[p['title']] = ''; got += 1; continue
            have[p['title']] = vi_section(p['revisions'][0]['slots']['main']['content']); got += 1
        OUT.write_text(json.dumps(have, ensure_ascii=False), encoding='utf-8')
        if i % 800 == 0: print(i, got, flush=True)
        time.sleep(1)
    print('끝 · 받음', len(have), '· 실패 묶음', fail, flush=True)


if __name__ == '__main__':
    main()
