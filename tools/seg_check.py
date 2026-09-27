#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""예문 안 단어 묶음 점검 1차 — 로컬 Qwen (대표님 지시 2026-09-27 밤: "문맥을 읽으면서 단어를 끊거나 연결").
앱은 예문의 단어를 사전에 있는 가장 긴 묶음으로 묶는데(glossAll), 'Mỗi người nhận một phần quà' 에서 'người nhận'(수신자)·'một phần'(일부분)처럼
문맥과 다른 묶음이 생긴다. 근거(문장·한국어 뜻·묶음·묶음의 사전 뜻)를 주고 "이 문장에서 이 묶음이 그 뜻으로 쓰였나"만 묻는다(예/아니오 — 지어낼 자리 없음).
결과 data/_seg_qwen.json = { "<문장>": { "<묶음>": true/false } }. 아니오는 클로드가 눈으로 확정해 data/_seg.json(문장 → 안 묶을 것)에 적는다."""
import json, pathlib, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
from qwen import ask_json
SRC = R / 'scratchpad/seg_risky.json'
OUT = R / 'data/_seg_qwen.json'
INSTR = ('베트남어 문장(vi)과 그 한국어 뜻(ko)이 있다. 문장 안의 단어 묶음(group)이 사전 뜻(group_ko)의 한 단어(복합어)로 쓰였으면 true, '
         '그 자리에서는 서로 다른 낱말이 우연히 이웃한 것이거나 다른 뜻이면 false. 한국어 뜻(ko)을 근거로 판단한다. '
         '출력은 입력과 같은 차례의 JSON 배열, 원소는 {"id": ..., "ok": true|false}. 다른 말은 쓰지 마라.')

def main():
    risky = json.loads(SRC.read_text(encoding='utf-8'))
    got = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    voc = json.loads((R / 'data/_seg_voc.json').read_text(encoding='utf-8'))
    items = []
    for src, vi, ex, ko, groups in risky:
        for g in groups:
            if ex in got and g in got[ex]: continue
            items.append({'id': f'{len(items)}', 'vi': ex, 'ko': ko, 'group': g, 'group_ko': voc.get(g, '')})
    print(f'물을 것 {len(items)}', flush=True)
    for i in range(0, len(items), 8):
        batch = items[i:i + 8]
        try: res = ask_json(INSTR, batch, chunk=8, max_tokens=400)
        except Exception as e: print('  실패', repr(e)[:80], flush=True); time.sleep(5); continue
        by = {}
        if isinstance(res, list):
            for r in res:
                if isinstance(r, dict) and 'id' in r: by[str(r['id'])] = r.get('ok')
        for it in batch:
            v = by.get(it['id'])
            if v in (True, False): got.setdefault(it['vi'], {})[it['group']] = v
        if (i // 8) % 25 == 0:
            OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
            n_no = sum(1 for d in got.values() for v in d.values() if v is False)
            print(f'  {min(i + 8, len(items))}/{len(items)} · 아니오 {n_no}', flush=True)
    OUT.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
    print('끝', flush=True)

if __name__ == '__main__':
    main()
