#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""뜻별 예문 — 예문이 하나도 없는 뜻 채우기 + 있는 예문 다시 확인 (2026-10-24 대표님 "단어 뜻 선택 안 되는 건 뭐냐 · 뜻과 예문이 제대로 연결됐는지 다 확인했니?").
문장 순위(대표님 09-23): 교재 원문 → 교재 변형 → 수업 자료 → … → 새로 지음. 교재·사전·앱 예문은 tools/sense_ex.py 가 이미 골랐고, 여기는 **그래도 없는 뜻만** 새로 짓는다(5순위).
 make   : 제미나이(워커, **제미나이가 답할 때만** — _by=cloudflare 면 30분 쉬고 다시)에게 열다섯씩, 수업 낱말 뜻 먼저 — 낱말·뜻 목록·고를 뜻을 주고 그 뜻으로 쓰인 짧은 문장 + 한국어 번역 → tools/_ctx/fill_made.json
 check  : 지은 문장(make) + 이미 있는 예문(_sense_ex.json) 을 Qwen 에게 한 문장씩 '이 문장에서 w 는 몇 번 뜻?' (뜻 목록을 다 보여 줌) → 번호가 맞으면 통과 → tools/_ctx/fill_check.json
          규칙도: 문장에 그 낱말이 있어야 · '(물음 끝)' 뜻은 물음표.
 apply  : 통과한 것만 data/_sense_ex.json 에 (있는 예문 중 다시 확인에서 떨어진 것은 뺌).
쓰기: python3 tools/sense_ex_fill.py make | check | apply"""
import json, pathlib, re, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / 'tools'))
S = json.loads((R / 'data/_senses.json').read_text(encoding='utf-8'))
EX = json.loads((R / 'data/_sense_ex.json').read_text(encoding='utf-8'))
MP = R / 'tools/_ctx/fill_made.json'; CP = R / 'tools/_ctx/fill_check.json'
def has_w(w, vi): return re.search(r'(?<![\wÀ-ỹ])' + re.escape(w) + r'(?![\wÀ-ỹ])', vi.lower()) is not None
def need():
    return [(w, i) for w, ss in S.items() if len(ss) >= 2 for i in range(len(ss)) if not (EX.get(w) and EX[w][i])]
INSTR = ('베트남어 학습 앱의 예문을 쓴다. 각 항목의 낱말 w 가 뜻 목록 senses 가운데 target 번째 뜻(sense)으로 쓰인 **짧고 자연스러운 베트남어 문장 하나**(5~12낱말, 쉬운 말, 북부 표준어, '
         '사람 이름·지명은 되도록 쓰지 말 것)와 자연스러운 한국어 번역을 써라. 문장에는 w 를 그대로(성조까지) 넣는다. 물음 뜻이면 물음표로 끝낸다. '
         '출력은 JSON 배열, 원소는 {"id":..., "vi":"...", "ko":"..."}. 다른 말은 쓰지 마라.')
def gemini(prompt, timeout=180):
    """워커를 바로 불러 **제미나이가 답했을 때만** 글자를 돌려준다(_by 가 cloudflare 면 몫이 떨어져 Llama 가 답한 것 — 2026-10-24 실제로 그랬다). 아니면 None"""
    import subprocess
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]})
    try:
        r = subprocess.run(["curl", "-sS", "-m", str(timeout), "-X", "POST", "https://viet-ai.chaochao-app.workers.dev", "-H", "Content-Type: application/json",
                            "-H", "Origin: https://tpgus5119-coder.github.io", "--data-binary", "@-"], input=body, capture_output=True, text=True, timeout=timeout + 10).stdout
        j = json.loads(r)
    except Exception: return None
    if str(j.get('_by', '')).lower().startswith('cloudflare'): return 'CF'
    try: return j["candidates"][0]["content"]["parts"][0]["text"]
    except Exception: return None
def course_words():
    out = set()
    def walk(o):
        if isinstance(o, dict):
            v = o.get('vi')
            if isinstance(v, str) and 'ko' in o and len(v.split()) <= 3: out.add(v.lower().strip())
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    for f in ('data/days.json', 'data/gybm.json', 'data/order.json'): walk(json.loads((R / f).read_text(encoding='utf-8')))
    return out
def make():
    got = json.loads(MP.read_text(encoding='utf-8')) if MP.exists() else {}
    cw = course_words()
    todo = sorted([(w, i) for w, i in need() if f'{w}|{i}' not in got], key=lambda x: x[0] not in cw)   # 수업 낱말의 뜻 먼저
    print('지을 뜻', len(todo), flush=True)
    for b in range(0, len(todo), 15):
        part = todo[b:b + 15]
        items = [{'id': j, 'w': w, 'senses': S[w], 'target': i + 1, 'sense': S[w][i]} for j, (w, i) in enumerate(part)]
        res = []
        while True:
            t = gemini(INSTR + '\n' + json.dumps(items, ensure_ascii=False))
            if t == 'CF':                                    # 제미나이 몫이 떨어짐 — 30분 쉬고 다시(Llama 답은 버림)
                print('  제미나이 몫 없음 — 30분 쉼', time.strftime('%H:%M'), flush=True); time.sleep(1800); continue
            try:
                m = re.search(r'\[.*\]', t or '', re.S); res = json.loads(m.group()) if m else []
            except Exception: res = []
            if res: break
            print('  빈 답 — 다시', b, flush=True); time.sleep(20)
        for r in res:
            try: w, i = part[int(r['id'])]
            except Exception: continue
            vi, ko = str(r.get('vi', '')).strip(), str(r.get('ko', '')).strip()
            if vi and ko and has_w(w, vi): got[f'{w}|{i}'] = [vi, ko]
        MP.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
        if (b // 15) % 10 == 0: print(f'  {b + 15}/{len(todo)} · 지음 {len(got)}', flush=True)
    print('끝 지음', len(got), flush=True)
def check():
    from qwen import ask as qask
    made = json.loads(MP.read_text(encoding='utf-8')) if MP.exists() else {}
    items = [(w, int(i), vi, ko, 'made') for k, (vi, ko) in made.items() for w, i in [k.rsplit('|', 1)]]
    items += [(w, i, vi, ko, 'old') for w, row in EX.items() for i, L in enumerate(row) for vi, ko in L]
    got = json.loads(CP.read_text(encoding='utf-8')) if CP.exists() else {}
    todo = [x for x in items if f'{x[0]}|{x[1]}|{x[2]}' not in got]
    print('확인할 문장', len(todo), flush=True)
    for n, (w, i, vi, ko, src) in enumerate(todo):
        q = (f'베트남어 문장: {vi}\n한국어 번역: {ko}\n이 문장에서 낱말 "{w}"는 다음 뜻 가운데 몇 번으로 쓰였나?\n' +
             '\n'.join(f'{j}. {x}' for j, x in enumerate(S[w], 1)) + '\n숫자 하나만 답하라. 어느 것도 아니면 0.')
        try: a = qask(q, max_tokens=6) or ''
        except Exception: continue
        m = re.search(r'\d+', a)
        if m: got[f'{w}|{i}|{vi}'] = int(m.group())
        if n % 200 == 0: CP.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {n}/{len(todo)} · 답 {len(got)}', flush=True)
    CP.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝 답', len(got), flush=True)
def ok_rule(w, i, vi):
    return has_w(w, vi) and (('물음' not in S[w][i] and '의문' not in S[w][i]) or '?' in vi)
def apply():
    made = json.loads(MP.read_text(encoding='utf-8')) if MP.exists() else {}
    got = json.loads(CP.read_text(encoding='utf-8'))
    out, keep_old, drop_old, add, rev = {}, 0, 0, 0, {}
    RP = R / 'tools/_ctx/fill_review_ok.json'                 # 클로드가 읽고 맞다고 한 엇갈린 문장 열쇠 목록
    REV_OK = set(json.loads(RP.read_text(encoding='utf-8'))) if RP.exists() else set()
    for w, ss in S.items():
        if len(ss) < 2: continue
        row = []
        for i in range(len(ss)):
            L = []
            for vi, ko in (EX.get(w) or [[]] * len(ss))[i] if EX.get(w) else []:
                if len(L) < 1 and got.get(f'{w}|{i}|{vi}') == i + 1 and ok_rule(w, i, vi): L.append([vi, ko]); keep_old += 1   # 뜻마다 하나 (대표님 2026-10-24) — 목록은 교재→사전→앱 차례라 처음 통과한 것이 가장 앞 순위
                elif len(L) < 1: drop_old += 1
            if not L and f'{w}|{i}' in made:
                vi, ko = made[f'{w}|{i}']
                if ok_rule(w, i, vi) and (got.get(f'{w}|{i}|{vi}') == i + 1 or f'{w}|{i}' in REV_OK): L.append([vi, ko]); add += 1
                elif ok_rule(w, i, vi): rev[f'{w}|{i}'] = [w, i + 1, ss[i], vi, ko, got.get(f'{w}|{i}|{vi}')]   # 제미나이·Qwen 이 엇갈림 → 버리지 않고 클로드가 읽는다 (대표님 2026-10-26 승인)
            row.append(L)
        if sum(1 for L in row if L) >= 1: out[w] = row
    p = R / 'data/_sense_ex.json'; p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    tot = sum(len(ss) for ss in S.values() if len(ss) >= 2); has = sum(1 for r in out.values() for L in r if L)
    (R / 'tools/_ctx/fill_review.json').write_text(json.dumps(rev, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'엇갈려 클로드가 읽을 것 {len(rev)} (tools/_ctx/fill_review.json)')
    print(f'있던 예문 남김 {keep_old} · 뺌 {drop_old} · 새로 지은 것 넣음 {add} · 예문 있는 뜻 {has}/{tot} · 파일 {p.stat().st_size // 1024}KB')
if __name__ == '__main__':
    {'make': make, 'check': check, 'apply': apply}[sys.argv[1]]()
