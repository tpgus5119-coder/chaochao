#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전 2단계 — 영어 위키 뜻풀이를 근거로 로컬 Qwen 이 한국어 뜻 초안을 단다 (대표님 결정 2026-09-27: Qwen 1차 → 클로드 검수).
입력 data/_dict_gloss.json (fetch_dict_gloss.py), 출력 data/_dict_ko_draft.json = { "học sinh": {"ko": "학생", "src": "qwen"} }.
근거(영어 정의·품사·한자)를 쥐여 주고, 12자 안 한국어만, 한글 아닌 글자·긴 것은 버린다(rule filter). 이어서 돌릴 수 있다."""
import json, pathlib, re, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from qwen import ask_json

SRC = R / 'data/_dict_gloss.json'
OUT = R / 'data/_dict_ko_draft.json'
HANGUL = re.compile(r'^[가-힣0-9 ·,/~()?!\-\.]+$')

INSTR = ('베트남어 낱말의 한국어 뜻을 적어라. 각 항목에는 베트남어(vi), 품사(pos), 영어 뜻풀이(en), 한자(han)가 있다. '
         '영어 뜻풀이를 그대로 한국어로 옮겨 **가장 흔한 뜻 1~2개**만 적는다. 규칙: 한국어만(영어·베트남어 금지), 12자 이내, '
         '뜻이 둘이면 ", "로 잇고, 동사는 "~하다" 꼴, 형용사는 "~한/~하다" 꼴, 명사는 명사로. 뜻풀이가 다른 낱말을 가리키기만 하면(= 꼴) '
         '그 낱말의 뜻을 모르면 빈 문자열. 출력은 입력과 같은 차례의 JSON 배열, 원소는 {"vi": ..., "ko": ...}.')


def main():
    G = json.loads(SRC.read_text(encoding='utf-8'))
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    items = []
    for vi, v in G.items():
        if vi in got or not v.get('defs'): continue
        en = ' / '.join(v['defs'][:4])[:300]
        items.append({'vi': vi, 'pos': ', '.join(v.get('pos', [])[:3]), 'en': en, 'han': v.get('han') or ''})
    print(f'뜻풀이 있는 표제어 {sum(1 for v in G.values() if v.get("defs"))} · 이미 {len(got)} · 할 것 {len(items)}', flush=True)
    n = 0; bad = 0
    for i in range(0, len(items), 10):
        batch = items[i:i + 10]
        try:
            res = ask_json(INSTR, batch, chunk=10, max_tokens=1200)
        except Exception as e:
            print('  실패', repr(e)[:80], flush=True); time.sleep(5); continue
        by = {}
        if isinstance(res, list):
            for r in res:
                if isinstance(r, dict) and isinstance(r.get('vi'), str): by[r['vi']] = str(r.get('ko', '')).strip()
        for it in batch:
            ko = by.get(it['vi'], '')
            ok = bool(ko) and len(ko) <= 14 and bool(HANGUL.match(ko)) and re.search(r'[가-힣]', ko)
            got[it['vi']] = {'ko': ko if ok else '', 'src': 'qwen', 'ok': bool(ok)}
            if not ok: bad += 1
        n += len(batch)
        if n % 200 < 10:
            OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
            print(f'  {n}/{len(items)} · 거른 것 {bad}', flush=True)
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print(f'끝 · {len(got)} · 거른 것 {bad}', flush=True)


if __name__ == '__main__':
    main()
