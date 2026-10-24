#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""뜻별 예문 — data/_sense_ex.json = { 낱말: [[뜻1 예문들], [뜻2 예문들], …] }, 예문 = [vi, ko] (2026-10-24 대표님 "chứ 는 '~고 말고요'·'(물음 끝) ~지요?' … 의미별로 예문이 나오면 좋겠어").
근거: 예문 속 낱말마다 그 문장에서 쓰인 뜻(data/_seg.json ko — Qwen 두 번 같은 답·규칙 대조, tools/ctx_sense.py). _seg 에 없는 자리는 앱이 보이던 기본 뜻 그대로로 본다.
뜻마다 셋까지(Qwen 이 '예'라 한 것만), 차례: 교재(gybm·realbook) → 사전 예문(_dict_ex) → 앱의 다른 예문, 같은 데선 짧은 것 먼저(80자 넘는 것·번역 없는 것은 뺌).
입력: tools/_ctx/toks.jsonl(앱 glossAll 낱말 나눔) · tools/_ctx/sents.json(문장 → 번역·출처). 쓰기: python3 tools/sense_ex.py cand → verify → build"""
import json, pathlib, collections
R = pathlib.Path(__file__).resolve().parent.parent
S = json.loads((R / 'data/_senses.json').read_text(encoding='utf-8'))
SEG = json.loads((R / 'data/_seg.json').read_text(encoding='utf-8'))
SN = json.loads((R / 'tools/_ctx/sents.json').read_text(encoding='utf-8'))
RANK = {'gybm.json': 0, 'realbook.json': 0, '_dict_ex': 1}
HINT = __import__('re').compile(r'\(([^)]*[a-zà-ỹđ][^)]*)\)')
def hints(sense):
    """뜻에 괄호로 적힌 베트남어 보기(đi bộ · mất đi·bay đi · chứ không phải) — 그 말이 문장에 있어야 그 뜻 예문으로 쓴다"""
    out = []
    for h in HINT.findall(sense):
        for t in __import__('re').split(r'[·,/]|=', h):
            t = __import__('re').sub(r'[^a-zà-ỹđ\s]', ' ', t.lower()).strip()
            if len(t.split()) >= 2 or (t and len(t) > 3): out.append(' '.join(t.split()[:3]))
    return out
def cands():
    by = collections.defaultdict(lambda: collections.defaultdict(list))
    for l in (R / 'tools/_ctx/toks.jsonl').read_text(encoding='utf-8').splitlines():
        if not l.strip(): continue
        for vi, toks in json.loads(l):
            info = SN.get(vi) or {}; ko = (info.get('ko') or '').strip()
            if not ko or len(vi) > 80 or len(vi.split()) < 3: continue
            sg = SEG.get(vi); ctx = sg.get('ko', {}) if isinstance(sg, dict) else {}
            full = vi.rstrip()[-1:] in '.?!'
            for w, n, m in toks:
                ss = S.get(w)
                if not ss or len(ss) < 2: continue
                mm = ctx.get(f'{w}#{n}', m)
                if mm not in ss: continue
                hs = hints(mm)
                if hs and not any(h in vi.lower() for h in hs): continue
                by[w][ss.index(mm)].append((RANK.get(info.get('f'), 2), 0 if full else 1, len(vi), vi, ko))
    return by
def main():
    """1차 후보(뜻마다 여섯) → tools/_ctx/sense_ex_cand.json. Qwen 확인(verify) 뒤 build 가 '예'인 것만 셋까지"""
    by = cands(); out = {}
    for w, d in by.items():
        if sum(1 for i in d if d[i]) < 2: continue
        row = []
        for i in range(len(S[w])):
            seen, L = set(), []
            for r, f, n, vi, ko in sorted(d.get(i, [])):
                if vi.lower() in seen: continue
                seen.add(vi.lower()); L.append([vi, ko])
                if len(L) >= 6: break
            row.append(L)
        out[w] = row
    (R / 'tools/_ctx/sense_ex_cand.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    print('후보 낱말', len(out), '· 문장', sum(len(x) for r in out.values() for x in r))
def verify():
    """한 문장씩 Qwen 에게 '이 문장에서 w 가 「뜻」으로 쓰였나 — 예/아니오' (한 줄 답). 결과 tools/_ctx/sense_ex_ok.json"""
    import sys, re as _re
    sys.path.insert(0, str(R / 'tools'))
    from qwen import ask as qask
    C = json.loads((R / 'tools/_ctx/sense_ex_cand.json').read_text(encoding='utf-8'))
    op = R / 'tools/_ctx/sense_ex_ok.json'; got = json.loads(op.read_text(encoding='utf-8')) if op.exists() else {}
    todo = [(w, i, vi, ko) for w, row in C.items() for i, L in enumerate(row) for vi, ko in L if f'{w}|{i}|{vi}' not in got]
    print('물을 것', len(todo), flush=True)
    for n0, (w, i, vi, ko) in enumerate(todo):
        q = (f'베트남어 문장: {vi}\n한국어 번역: {ko}\n이 문장에서 낱말 "{w}"가 "{S[w][i]}"라는 뜻으로 쓰였나? '
             f'(다른 뜻들: {" / ".join(x for j, x in enumerate(S[w]) if j != i)}) 예 또는 아니오로만 답하라.')
        try: a = qask(q, max_tokens=6) or ''
        except Exception: continue
        if '예' in a: got[f'{w}|{i}|{vi}'] = 1
        elif '아니' in a: got[f'{w}|{i}|{vi}'] = 0
        if n0 % 100 == 0: op.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {n0}/{len(todo)} · 답 {len(got)} · 예 {sum(got.values())}', flush=True)
    op.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝 답', len(got), '예', sum(got.values()), flush=True)
def build():
    C = json.loads((R / 'tools/_ctx/sense_ex_cand.json').read_text(encoding='utf-8'))
    ok = json.loads((R / 'tools/_ctx/sense_ex_ok.json').read_text(encoding='utf-8'))
    out = {}
    for w, row in C.items():
        r2 = [[[vi, ko] for vi, ko in L if ok.get(f'{w}|{i}|{vi}') == 1][:3] for i, L in enumerate(row)]
        if sum(1 for L in r2 if L) >= 2: out[w] = r2
    p = R / 'data/_sense_ex.json'; p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('낱말', len(out), '· 예문', sum(len(x) for r in out.values() for x in r), '· 파일', p.stat().st_size // 1024, 'KB')
if __name__ == '__main__':
    import sys
    {'cand': main, 'verify': verify, 'build': build}[sys.argv[1] if len(sys.argv) > 1 else 'cand']()
