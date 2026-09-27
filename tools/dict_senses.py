#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 단어의 뜻을 최대 3개까지 (대표님 지시 2026-09-27 밤: "뜻이 여러 개면 최소 3개, 흔히 쓰이는 순서로").
근거 = 영어 위키낱말사전의 뜻풀이 차례(data/_dict_gloss.json, 위키는 흔한 뜻을 앞에 둔다). 로컬 Qwen 이 영어 뜻풀이 셋을 짧은 한국어로 옮기고(12자 안, 한글만),
클로드가 낱말마다 읽어 data/_senses.json 에 확정한다. 초안 = data/_senses_draft.json = { "phải": ["옳다, 맞다", "~해야 한다", "오른쪽"] }."""
import json, pathlib, re, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from qwen import ask_json
G = json.loads((R / 'data/_dict_gloss.json').read_text(encoding='utf-8'))
VOC = json.loads((R / 'data/_seg_voc.json').read_text(encoding='utf-8'))
OUT = R / 'data/_senses_draft.json'
HANGUL = re.compile(r'^[가-힣0-9 ·,/~()?!\-\.]+$')
INSTR = ('베트남어 단어의 영어 뜻풀이 목록(en, 흔한 뜻이 앞)을 차례 그대로 짧은 한국어 뜻으로 옮겨라. 뜻마다 12자 안, 한국어만, 동사는 "~하다", 형용사는 "~하다/~한", 명사는 명사. '
         '이미 있는 한국어 뜻(ko)과 같은 뜻은 그 표현을 그대로 쓴다. 출력은 입력과 같은 차례의 JSON 배열, 원소는 {"vi": ..., "senses": ["...", "...", "..."]}. 다른 말은 쓰지 마라.')

def main():
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    items = []
    for vi, ko in VOC.items():
        if vi in got: continue
        g = G.get(vi) or G.get(vi.capitalize())
        defs = [d for d in (g or {}).get('defs', []) if d and not d.startswith('=')][:3]
        if len(defs) < 2: continue
        items.append({'vi': vi, 'ko': str(ko)[:20], 'en': defs})
    print(f'뜻 둘 이상인 앱 단어 {len(items)} · 이미 {len(got)}', flush=True)
    for i in range(0, len(items), 8):
        batch = items[i:i + 8]
        try: res = ask_json(INSTR, batch, chunk=8, max_tokens=900)
        except Exception as e: print('  실패', repr(e)[:80], flush=True); time.sleep(5); continue
        by = {}
        if isinstance(res, list):
            for r in res:
                if isinstance(r, dict) and isinstance(r.get('vi'), str) and isinstance(r.get('senses'), list): by[r['vi']] = r['senses']
        for it in batch:
            ss = [str(x).strip() for x in by.get(it['vi'], []) if isinstance(x, (str, int))]
            ss = [x for x in ss if x and len(x) <= 14 and HANGUL.match(x) and re.search(r'[가-힣]', x)]
            got[it['vi']] = ss[:3]
        if (i // 8) % 25 == 0:
            OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {min(i + 8, len(items))}/{len(items)}', flush=True)
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝', flush=True)

if __name__ == '__main__':
    main()
