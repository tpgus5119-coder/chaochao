#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""예문 속 낱말의 '그 문장에서 쓰인 뜻' (대표님 2026-10-18 "단어들마다 뜻이 여러 가지 있잖아. 예문에서 그 단어를 눌렀을 때 예문 아래 보여 주는 뜻은
그 예문에서 사용된 뜻인 거지? 그렇게 해 줘").
앱은 예문을 glossAll 로 나눠, data/_seg.json 의 ko {"낱말#n": 뜻} 이 있으면 그 뜻을, 없으면 낱말의 기본 뜻(카드 뜻)을 보여 준다.
뜻 목록(data/_senses.json)에 뜻이 둘 이상인 낱말 자리마다 그 문장의 뜻을 고른다 — **목록에서 고르기만**(지어내지 않는다).
 0) tools/_ctx/toks.jsonl — 앱(브라우저)에서 glossAll 을 그대로 돌려 받은 낱말 나눔 [문장, [[낱말, n번째, 기본 뜻]…]]
 1) rule  : 사람이 쓴 한국어 번역에 뜻의 말줄기(두 글자 이상)가 들어 있고, 그런 뜻이 **하나뿐**이면 그 뜻 (기계) — 검산용
 2) qwen  : 모든 자리를 로컬 Qwen 에게 문장·번역·뜻 목록을 주고 번호만 고르게 한다(맞는 것 없으면 0 = 기본 뜻 그대로)
 3) merge : 규칙이 답을 낸 자리는 Qwen 과 같을 때만 믿고, 고른 뜻이 기본 뜻과 다를 때만 _seg.json ko 에 적는다(이미 사람이 적은 것은 그대로 둔다)
결과 중간 파일: tools/_ctx/rule.json · qwen.json · verify.json  쓰기: python3 tools/ctx_sense.py rule → qwen → verify → merge"""
import json, pathlib, re, sys, time
R = pathlib.Path(__file__).resolve().parent.parent
C = R / 'tools/_ctx'
SEN = json.loads((R / 'data/_senses.json').read_text(encoding='utf-8'))
def rows():
    out = []
    for l in (C / 'toks.jsonl').read_text(encoding='utf-8').splitlines():
        if l.strip(): out += json.loads(l)
    return out
SENTS = None
def sents():
    global SENTS
    if SENTS is None: SENTS = json.loads((C / 'sents.json').read_text(encoding='utf-8'))
    return SENTS
NOTR = re.compile(r'^[①-⑳]|\s—\s|\(길게\)|\(짧게\)')    # 번역이 아닌 줄(발음 설명·문법 설명) — 견본에서 ai→'누구든지'
def names(vi):
    """문장 가운데서 대문자로 시작하는 낱말 = 사람·땅 이름 (Lan→'난초', Nam→'남자' 로 고른 것을 막는다)"""
    ws = vi.split(); out = set()
    for i, w in enumerate(ws):
        c = re.sub(r'^[\W_]+', '', w)
        if i > 0 and c[:1].isupper() and not re.search(r'[.!?:"“]$', ws[i - 1]): out.add(re.sub(r'[\W_]+$', '', c).lower())
    return out
def todo():
    seg = json.loads((R / 'data/_seg.json').read_text(encoding='utf-8'))
    S = sents()
    for vi, toks in rows():
        if NOTR.search((S.get(vi) or {}).get('ko', '')): continue
        sg = seg.get(vi); have = sg.get('ko', {}) if isinstance(sg, dict) else {}
        nm = names(vi)
        for k, n, m in toks:
            if k.split()[0] in nm: continue
            if len(SEN.get(k, [])) >= 2 and f'{k}#{n}' not in have: yield vi, k, n, m
HAN = re.compile(r'[가-힣]+')
def stems(sense):
    s = re.sub(r'\([^)]*\)', ' ', sense)
    out = set()
    for part in re.split(r'[,·/;]', s):
        for w in HAN.findall(part):
            for suf in ('하다', '되다', '이다', '스럽다', '다'):
                if w.endswith(suf) and len(w) > len(suf): w = w[:-len(suf)]; break
            if len(w) >= 2: out.add(w)
    return out
def rule():
    S = sents(); got = {}; n = 0
    for vi, k, i, m in todo():
        ko = (S.get(vi) or {}).get('ko', '')
        hits = [j for j, s in enumerate(SEN[k]) if any(st in ko for st in stems(s))]
        if len(hits) == 1: got[f'{vi}\t{k}#{i}'] = SEN[k][hits[0]]; n += 1
    (C / 'rule.json').write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('규칙으로 정함', n)
INSTR = ('베트남어 예문(vi)과 사람이 쓴 한국어 번역(ko)이 있다. words 의 각 낱말(w)이 이 예문에서 어떤 뜻으로 쓰였는지 그 낱말의 뜻 목록(senses, 1부터 번호)에서 하나 골라라. '
         '번역(ko)을 근거로 판단한다. 목록에 맞는 뜻이 없으면 0. 출력은 JSON 배열, 원소는 {"id": 문장 id, "pick": {"낱말#n": 번호, ...}}. 다른 말은 쓰지 마라.')
def qwen(limit=None):
    sys.path.insert(0, str(R / 'tools'))
    from qwen import ask_json
    S = sents(); rl = json.loads((C / 'rule.json').read_text(encoding='utf-8'))
    out_p = C / 'qwen.json'; got = json.loads(out_p.read_text(encoding='utf-8')) if out_p.exists() else {}
    by = {}
    for vi, k, i, m in todo():
        key = f'{vi}\t{k}#{i}'
        if key in got: continue                       # 규칙으로 정한 자리도 묻는다 — 둘이 같을 때만 믿는다(규칙 견본 30개 중 5개 틀림: '건성으로'의 '으로', '드러나기 시작'의 '시작')
        by.setdefault(vi, []).append((k, i))
    items = list(by.items())[:limit] if limit else list(by.items())
    print('물을 문장', len(items), '자리', sum(len(v) for _, v in items), flush=True)
    t0 = time.time()
    for b in range(0, len(items), 3):
        batch = []
        for j, (vi, ws) in enumerate(items[b:b + 3]):
            batch.append({'id': j, 'vi': vi, 'ko': (S.get(vi) or {}).get('ko', ''),
                          'words': [{'w': f'{k}#{i}', 'senses': SEN[k]} for k, i in ws]})
        try: res = ask_json(INSTR, batch, chunk=3, max_tokens=600)
        except Exception as e: print('  실패', repr(e)[:80], flush=True); time.sleep(3); continue
        for r in (res if isinstance(res, list) else []):
            if not isinstance(r, dict) or not isinstance(r.get('pick'), dict): continue
            try: it = batch[int(r['id'])]
            except Exception: continue
            for w in it['words']:
                p = r['pick'].get(w['w'])
                if isinstance(p, int) and 0 <= p <= len(w['senses']):
                    got[f"{it['vi']}\t{w['w']}"] = w['senses'][p - 1] if p else ''
        if (b // 3) % 30 == 0:
            out_p.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8')
            print(f'  {b + 3}/{len(items)} · {time.time() - t0:.0f}초', flush=True)
    out_p.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝', len(got), flush=True)
def verify():
    """2차: 1차에서 기본 뜻과 **다른** 뜻을 고른 자리만, 뜻 목록을 거꾸로 세워 다시 묻는다. 같은 뜻을 또 고르면 v=1"""
    sys.path.insert(0, str(R / 'tools'))
    from qwen import ask_json
    S = sents(); qw = json.loads((C / 'qwen.json').read_text(encoding='utf-8'))
    vp = C / 'verify.json'; got = json.loads(vp.read_text(encoding='utf-8')) if vp.exists() else {}
    dflt = {f'{vi}\t{k}#{n}': m for vi, toks in rows() for k, n, m in toks}
    by = {}
    for key, sv in qw.items():
        if not sv or sv == dflt.get(key) or key in got: continue
        vi, kn = key.split('\t'); by.setdefault(vi, []).append(kn)
    items = list(by.items()); print('다시 물을 문장', len(items), flush=True); t0 = time.time()
    for b in range(0, len(items), 3):
        batch = []
        for j, (vi, kns) in enumerate(items[b:b + 3]):
            batch.append({'id': j, 'vi': vi, 'ko': (S.get(vi) or {}).get('ko', ''),
                          'words': [{'w': kn, 'senses': SEN[kn.split('#')[0]][::-1]} for kn in kns]})
        try: res = ask_json(INSTR, batch, chunk=3, max_tokens=600)
        except Exception as e: print('  실패', repr(e)[:80], flush=True); time.sleep(3); continue
        for r in (res if isinstance(res, list) else []):
            if not isinstance(r, dict) or not isinstance(r.get('pick'), dict): continue
            try: it = batch[int(r['id'])]
            except Exception: continue
            for w in it['words']:
                p = r['pick'].get(w['w']); key = f"{it['vi']}\t{w['w']}"
                if isinstance(p, int) and 0 <= p <= len(w['senses']):
                    got[key] = 1 if (p and w['senses'][p - 1] == qw[key]) else 0
        if (b // 3) % 30 == 0:
            vp.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print(f'  {b + 3}/{len(items)} · {time.time() - t0:.0f}초', flush=True)
    vp.write_text(json.dumps(got, ensure_ascii=False), encoding='utf-8'); print('끝', sum(got.values()), '/', len(got), flush=True)
def merge():
    seg_p = R / 'data/_seg.json'; seg = json.loads(seg_p.read_text(encoding='utf-8'))
    rl = json.loads((C / 'rule.json').read_text(encoding='utf-8'))
    qw = json.loads((C / 'qwen.json').read_text(encoding='utf-8')) if (C / 'qwen.json').exists() else {}
    dflt = {}
    for vi, toks in rows():
        for k, n, m in toks: dflt[f'{vi}\t{k}#{n}'] = m
    add = 0
    vf = json.loads((C / 'verify.json').read_text(encoding='utf-8')) if (C / 'verify.json').exists() else {}
    for key, s in qw.items():                                # Qwen 이 고른 뜻 — 규칙이 답을 냈으면 둘이 같을 때만, 아니면 두 번 물어 같을 때만
        if key in rl and rl[key] != s: continue
        if key not in rl and not vf.get(key): continue
        if not s or s == dflt.get(key): continue
        vi, kn = key.split('\t')
        sg = seg.get(vi)
        if sg is None: sg = seg[vi] = {'no': [], 'ko': {}}
        elif isinstance(sg, list): sg = seg[vi] = {'no': sg, 'ko': {}}
        sg.setdefault('ko', {})
        if kn in sg['ko'] and key not in rl and key not in qw: continue
        sg['ko'][kn] = s; add += 1
    seg_p.write_text(json.dumps(seg, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('적음', add, '문장', len(seg), '파일', seg_p.stat().st_size // 1024, 'KB')
if __name__ == '__main__':
    a = sys.argv[1]
    if a == 'qwen': qwen(int(sys.argv[2]) if len(sys.argv) > 2 else None)
    else: {'rule': rule, 'merge': merge, 'verify': verify}[a]()
