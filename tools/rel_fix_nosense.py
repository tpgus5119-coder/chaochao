#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""유의어·반의어 짝인데 '그 짝으로 쓰인 뜻'을 못 정한 372쌍 정리 (대표님 2026-10-24 "bố 의 유의어 ba 가 뜻 3 으로 나오면 안 되지 — 전부 수정").
뜻이 겹치지 않아 기계로 못 맞춘 짝(tools/_rel/no_sense_pairs.json) — 상당수가 사전에서 잘못 붙은 짝(bón↔táo, rào↔hói, cú↔gõ).
Qwen 에게 두 번(두 번째는 짝 뜻 차례를 거꾸로) '맞는 짝인가 · 짝의 몇 번째 뜻인가' 를 묻는다:
 두 번 다 아니라 하면 → 양쪽에서 짝을 지운다 · 두 번 다 맞고 같은 뜻이면 → 뜻 번호(m)를 적는다 · 엇갈리면 그대로 둔다(화면은 카드 뜻).
쓰기: python3 tools/rel_fix_nosense.py ask | apply"""
import json, pathlib, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
C = R / 'tools/_rel'
S = json.loads((R / 'data/_senses.json').read_text(encoding='utf-8'))
INSTR = ('베트남어 낱말 a(뜻 a_뜻)와 그 짝으로 적힌 낱말 b(뜻 목록 b_뜻, 1부터 번호)가 있다. rel 은 "유의어"(같은 뜻으로 바꿔 쓸 수 있음) 또는 "반의어"(정반대). '
         'b 의 뜻 가운데 a 와 그 관계가 되는 뜻이 있으면 그 번호, 없으면(엉뚱한 짝이면) 0. 출력은 JSON 배열, 원소는 {"id":..., "n": 번호}. 다른 말은 쓰지 마라.')
def ask():
    """한 쌍씩 '숫자 하나만' 답하게 묻는다 — 여덟씩 JSON 으로 물으면 Qwen 이 입력만 되풀이하고 번호를 안 넣었다(744번 중 답 0, 2026-10-24)"""
    import re as _re
    sys.path.insert(0, str(R / 'tools'))
    from qwen import ask as qask
    W = json.loads((R / 'data/sib.json').read_text(encoding='utf-8'))['w']
    pairs = json.loads((C / 'no_sense_pairs.json').read_text(encoding='utf-8'))
    op = C / 'nosense_ans.json'; got = json.loads(op.read_text(encoding='utf-8')) if op.exists() else {}
    todo = [(c, p, k, r) for c, p, k in pairs for r in (0, 1) if f'{c}|{p}|{r}' not in got]
    print('물을 것', len(todo), flush=True)
    for n0, (c, p, k, r) in enumerate(todo):
        ss = S[p] if r == 0 else S[p][::-1]
        am = ' / '.join((S.get(c) or [W.get(c, {}).get('k', '')])[:3])
        rel = '유의어(같은 뜻으로 바꿔 쓸 수 있는 말)' if k == 's' else '반의어(뜻이 정반대인 말)'
        q = (f'베트남어 낱말 "{c}"(뜻: {am})의 {rel}로 "{p}"가 적혀 있다. "{p}"의 뜻 목록:\n' + '\n'.join(f'{i}. {x}' for i, x in enumerate(ss, 1)) +
             f'\n"{p}"의 몇 번 뜻이 "{c}"와 {rel.split("(")[0]} 관계인가? 해당하는 뜻이 없으면(엉뚱한 짝이면) 0. 숫자 하나만 답하라.')
        try: a = qask(q, max_tokens=8)
        except Exception as e: print('  실패', repr(e)[:60], flush=True); time.sleep(2); continue
        m = _re.search(r'\d+', a or '')
        if not m: continue
        v = int(m.group()); L = len(S[p])
        if 0 <= v <= L: got[f'{c}|{p}|{r}'] = v if (r == 0 or v == 0) else L + 1 - v
        if n0 % 40 == 0: op.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {n0}/{len(todo)} · 답 {len(got)}', flush=True)
    op.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝 답', len(got), flush=True)
def apply():
    p0 = R / 'data/sib.json'; sib = json.loads(p0.read_text(encoding='utf-8')); W = sib['w']
    got = json.loads((C / 'nosense_ans.json').read_text(encoding='utf-8'))
    drop = setn = keep = 0
    for c, p, k in json.loads((C / 'no_sense_pairs.json').read_text(encoding='utf-8')):
        a, b = got.get(f'{c}|{p}|0'), got.get(f'{c}|{p}|1')
        if a == 0 and b == 0:
            for x, y in ((c, p), (p, c)):
                g = W.get(x) or {}
                if y in (g.get(k) or []): g[k] = [z for z in g[k] if z != y]
                if not g.get(k): g.pop(k, None)
                if isinstance(g.get('m'), dict): g['m'].pop(y, None)
            drop += 1
        elif a and a == b: W[p].setdefault('m', {})[c] = a; setn += 1
        else: keep += 1
    p0.write_text(json.dumps(sib, ensure_ascii=False, separators=(',', ':'), sort_keys=True), encoding='utf-8')
    print('지운 짝', drop, '· 뜻 번호 적음', setn, '· 그대로', keep)
if __name__ == '__main__':
    {'ask': ask, 'apply': apply}[sys.argv[1]]()
