#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""유의어·반의어 빠진 연결 채우기 (대표님 2026-10-18 "유의어와 반의어가 맞는데 매칭이 안 된 것들 다 연결해 줘. Qwen 에게 1차 시켜도 된다").
후보는 기계가 뽑는다(지어내지 않는다) — 앱 낱말(sib.json w 의 p=1)끼리:
  ① 같은 뜻 말(뜻 목록·카드 뜻을 '·,' 로 나눈 조각, 괄호·~ 뗌, 두 글자 이상)을 나눠 가진 두 낱말 → 유의어 후보 (그 뜻을 가진 낱말이 12개 넘으면 너무 흔한 말이라 뺌)
  ② 유의어의 유의어 → 유의어 후보 · ③ 유의어의 반의어 / 반의어의 유의어 → 반의어 후보
Qwen 은 후보 쌍마다 두 낱말의 뜻 목록을 보고 '유의어/반의어/아님'과 각 낱말의 몇 번째 뜻인지만 고른다.
①은 한 번(기계 근거 + Qwen '유의어'), ②③은 **두 번**(두 번째는 낱말 차례를 바꿔서) 같은 판정일 때만 sib.json 에 양쪽으로 넣는다.
뜻 번호(m)는 같은 뜻 말이 든 뜻을 기계로 찾고, 없으면 Qwen 번호 — 못 정하면 넣지 않는다(앱이 뜻별로 나눠 보이므로).
쓰기: python3 tools/rel_more.py cand | judge | apply"""
import collections, itertools, json, pathlib, re, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
C = R / 'tools/_rel'; C.mkdir(exist_ok=True)
SIB = json.loads((R / 'data/sib.json').read_text(encoding='utf-8')); W = SIB['w']
SEN = json.loads((R / 'data/_senses.json').read_text(encoding='utf-8'))
def senses(w):
    return SEN.get(w) or [x.strip() for x in re.split(r'\s*·\s*', W.get(w, {}).get('k', '')) if x.strip()]
def cores(w):
    out = set()
    for s in senses(w):
        s = re.sub(r'\([^)]*\)', '', s)
        for t in re.split(r'[,·/;]', s):
            t = re.sub(r'[~\s]', '', t)
            if len(t) >= 2 and re.fullmatch(r'[가-힣]+', t): out.add(t)
    return out
def cand():
    app = [w for w, g in W.items() if g.get('p')]
    have = {(a, b) for a in W for k in ('s', 'a') for b in W[a].get(k, [])}
    by = collections.defaultdict(set)
    for w in app:
        for c in cores(w): by[c].add(w)
    syn, ant, core = set(), set(), set()
    for c, ws in by.items():
        if 2 <= len(ws) <= 12:
            for a, b in itertools.combinations(sorted(ws), 2):
                if a not in b and b not in a: syn.add((a, b)); core.add((a, b))      # 'lớn' 과 'to lớn' 같은 겹낱말 사이는 따로 다루지 않는다
    appS = set(app)
    for a in app:
        S1 = set(W[a].get('s', [])); A1 = set(W[a].get('a', []))
        for b in S1:
            for c in W.get(b, {}).get('s', []):
                if c != a and c in appS: syn.add(tuple(sorted((a, c))))
            for c in W.get(b, {}).get('a', []):
                if c in appS: ant.add(tuple(sorted((a, c))))
        for b in A1:
            for c in W.get(b, {}).get('s', []):
                if c in appS: ant.add(tuple(sorted((a, c))))
    syn = {p for p in syn if p not in have and p[::-1] not in have}
    ant = {p for p in ant if p not in have and p[::-1] not in have} - syn
    out = [[a, b, 'c' if (a, b) in core else ('t' if (a, b) in syn else 'a')] for a, b in sorted(syn | ant)]
    (C / 'cand.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    print('유의어 후보', len(syn), '반의어 후보', len(ant), '합', len(out))
INSTR = ('베트남어 낱말 두 개(a, b)와 각각의 한국어 뜻 목록(1부터 번호)이 있다. 두 낱말이 어떤 뜻에서 유의어(같은 뜻으로 바꿔 쓸 수 있음)인지, 반의어(뜻이 서로 반대)인지, 둘 다 아닌지 판정하라. '
         '그냥 관련 있는 말(예: 의사-병원, 밥-먹다)이나 상하위어(과일-사과)는 "아님". 출력은 JSON 배열, 원소는 {"id":..., "rel": "유의어"|"반의어"|"아님", "sa": a의 뜻 번호, "sb": b의 뜻 번호}. 다른 말은 쓰지 마라.')
def judge():
    sys.path.insert(0, str(R / 'tools'))
    from qwen import ask_json
    cs = json.loads((C / 'cand.json').read_text(encoding='utf-8'))
    op = C / 'judge.json'; got = json.loads(op.read_text(encoding='utf-8')) if op.exists() else {}
    # 같은 뜻 말을 나눠 가진 후보(c)는 기계 근거가 있으니 한 번만, 나머지(유의어의 유의어 t·반의어 a)는 두 번
    todo = [(a, b, rnd) for a, b, ty in cs for rnd in ((0,) if ty == 'c' else (0, 1)) if f'{a}|{b}|{rnd}' not in got]
    print('물을 것', len(todo), flush=True); t0 = time.time()
    for i in range(0, len(todo), 8):
        part = todo[i:i + 8]
        items = []
        for j, (a, b, rnd) in enumerate(part):
            x, y = (a, b) if rnd == 0 else (b, a)
            items.append({'id': j, 'a': x, 'a_뜻': senses(x), 'b': y, 'b_뜻': senses(y)})
        try: res = ask_json(INSTR, items, chunk=8, max_tokens=700)
        except Exception as e: print('  실패', repr(e)[:80], flush=True); time.sleep(3); continue
        for r in (res if isinstance(res, list) else []):
            try: a, b, rnd = part[int(r['id'])]
            except Exception: continue
            rel = r.get('rel'); sa, sb = r.get('sa'), r.get('sb')
            if rnd == 1: sa, sb = sb, sa
            if rel in ('유의어', '반의어', '아님'): got[f'{a}|{b}|{rnd}'] = [rel, sa, sb]
        if (i // 8) % 25 == 0:
            op.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {i + 8}/{len(todo)} · {time.time() - t0:.0f}초', flush=True)
    op.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝', len(got), flush=True)
def sense_no(w, other, q):
    """w 의 몇 번째 뜻인가 — ① 상대와 같은 뜻 말이 든 뜻(기계) ② 뜻이 하나뿐이면 1 ③ Qwen 이 준 번호(1~n). 못 정하면 None"""
    ss = senses(w); oc = cores(other)
    for i, s in enumerate(ss, 1):
        tmp = {re.sub(r'[~\s]', '', t) for t in re.split(r'[,·/;]', re.sub(r'\([^)]*\)', '', s))}
        if tmp & oc: return i
    if len(ss) == 1: return 1
    return q if isinstance(q, int) and 1 <= q <= len(ss) else None
def ok_pairs():
    got = json.loads((C / 'judge.json').read_text(encoding='utf-8'))
    out = []
    for a, b, ty in json.loads((C / 'cand.json').read_text(encoding='utf-8')):
        x, y = got.get(f'{a}|{b}|0'), got.get(f'{a}|{b}|1')
        if not x or x[0] == '아님': continue
        if ty != 'c' and (not y or y[0] != x[0]): continue
        if ty == 'c' and x[0] != '유의어': continue
        if ty == 'a' and x[0] != '반의어': continue
        sa, sb = sense_no(a, b, x[1]), sense_no(b, a, x[2])
        if (SEN.get(a) and sa is None) or (SEN.get(b) and sb is None): continue
        out.append((a, b, 's' if x[0] == '유의어' else 'a', sa, sb))
    return out
VINSTR = ('베트남어 낱말 두 개(a, b)와 그 뜻이 있다. 질문(q)에 엄격하게 답하라. 유의어 질문: "이 뜻에서 a 대신 b 를 써도 같은 말이 되나?" — 뜻이 비슷하기만 하거나 관련만 있으면 false. '
          '반의어 질문: "a 와 b 가 크다-작다, 춥다-따뜻하다, 남자-여자 처럼 정반대인가?" — 그냥 다른 말이거나 관계만 있는 말(질문-답, 오다-돌아가다)이면 false. '
          '출력은 JSON 배열, 원소는 {"id":..., "ok": true|false}. 다른 말은 쓰지 마라.')
def verify():
    """3차: 1·2차를 통과한 쌍만, 낱말 하나씩 '고른 뜻'만 보여 주고 엄격하게 다시 묻는다(견본: 반의어 15개 중 5개가 틀림 — tới/về, hủy/xây, chắc hẳn/nhất định)"""
    sys.path.insert(0, str(R / 'tools'))
    from qwen import ask_json
    vp = C / 'verify.json'; got = json.loads(vp.read_text(encoding='utf-8')) if vp.exists() else {}
    todo = [x for x in ok_pairs() if f'{x[0]}|{x[1]}' not in got]
    print('다시 물을 쌍', len(todo), flush=True)
    for i in range(0, len(todo), 8):
        part = todo[i:i + 8]
        items = [{'id': j, 'q': '유의어' if k == 's' else '반의어', 'a': a, 'a_뜻': senses(a)[(sa or 1) - 1], 'b': b, 'b_뜻': senses(b)[(sb or 1) - 1]} for j, (a, b, k, sa, sb) in enumerate(part)]
        try: res = ask_json(VINSTR, items, chunk=8, max_tokens=400)
        except Exception as e: print('  실패', repr(e)[:80], flush=True); time.sleep(3); continue
        for r in (res if isinstance(res, list) else []):
            try: a, b = part[int(r['id'])][:2]
            except Exception: continue
            v = r.get('ok'); v = {'true': True, 'false': False, '예': True, '아니오': False}.get(str(v).strip().lower(), v) if not isinstance(v, bool) else v
            if v in (True, False): got[f'{a}|{b}'] = v
        if (i // 8) % 20 == 0: vp.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {i + 8}/{len(todo)} · 답 {len(got)}', flush=True)   # 답 수도 찍는다 — 1차 때 1,593쌍 중 1개만 남은 조용한 실패(2026-10-19)
    vp.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝', sum(got.values()), '/', len(got), flush=True)
def apply():
    p = R / 'data/sib.json'; sib = json.loads(p.read_text(encoding='utf-8')); W2 = sib['w']; n = collections.Counter()
    vf = json.loads((C / 'verify.json').read_text(encoding='utf-8'))
    for a, b, k, sa, sb in ok_pairs():
        if vf.get(f'{a}|{b}') is not True: continue          # 3차(엄격)까지 '맞다' 인 것만
        if k == 'a' and (cores(a) & cores(b)): continue      # 같은 뜻 말을 나눠 가진 것은 반의어일 수 없다(chắc hẳn/nhất định)
        for x, y, sx in ((a, b, sa), (b, a, sb)):
            g = W2[x]; L = g.setdefault(k, [])
            if y in L: continue
            L.append(y); n[k] += 1
            if SEN.get(x): g.setdefault('m', {})[y] = sx      # 뜻 목록이 있는 낱말만 뜻 번호를 쓴다(앱이 뜻별로 나눠 보인다)
    p.write_text(json.dumps(sib, ensure_ascii=False, separators=(',', ':'), sort_keys=True), encoding='utf-8')
    print('넣음(양쪽 합)', dict(n))
if __name__ == '__main__':
    {'cand': cand, 'judge': judge, 'verify': verify, 'apply': apply}[sys.argv[1]]()
