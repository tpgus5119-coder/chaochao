"""_sdef.json 의 일상(days.json) 수업 키를 지금 수업 번호에 다시 맞춘다 (2026-11-03).
수업을 다시 묶으며 day 번호가 바뀌었는데 기본 뜻 표는 옛 번호 그대로라 대부분 어긋나 있었다(Day 3 em·cô 기본 뜻 없음 오류 보고).
낱말마다 옛 표의 값을 가져온다 — 옛 수업 중 지금 수업과 낱말이 가장 많이 겹치는 것의 값. 옛 값이 없으면 tools/_ctx/sdef_judge.json(클로드 판정)."""
import json, os, re
S = json.load(open('data/_senses.json')); D = json.load(open('data/_sdef.json'))
days = json.load(open('data/days.json'))['days']
J = json.load(open('tools/_ctx/sdef_judge.json')) if os.path.exists('tools/_ctx/sdef_judge.json') else {}
def parts(t):
    t = re.sub(r'\([^)]*\)', ' ', t or ''); return [p.strip().lstrip('~') for p in re.split(r'[,;·/]', t) if p.strip()]
def komatch(ss, ko):
    mine = set(parts(ko))
    for i, t in enumerate(ss):
        if any(p in mine for p in parts(t)): return i + 1
    return 0
old = {k: v for k, v in D.items() if k.isdigit()}
new = {}; need = []
for x in days:
    lk = str(x['day']); ws = {w['vi'].strip().lower() for w in x['words']}
    for w in x['words']:
        k = w['vi'].strip().lower(); ss = S.get(k)
        if not ss or len(ss) < 2: continue
        cand = [(len(ws & set(t)), t[k]) for t in old.values() if k in t and 1 <= t[k] <= len(ss)]
        v = max(cand)[1] if cand else 0
        if (lk + '|' + k) in J: v = J[lk + '|' + k]
        if not v: v = komatch(ss, w.get('ko'))
        if v: new.setdefault(lk, {})[k] = v
        else: need.append({'lk': lk, 'theme': x.get('theme'), 'vi': w['vi'], 'ko': w.get('ko'), 'ex': (w.get('ex') or {}).get('vi'), 'senses': ss})
out = {k: v for k, v in D.items() if not k.isdigit()}; out.update(new)
for key, v in J.items():                     # 출처(B:) 수업도 판정 반영 — 0 은 '맞는 뜻 없음'
    lk, k = key.split('|', 1)
    if lk.startswith('B:') and v: out.setdefault(lk, {})[k] = v
json.dump(out, open('data/_sdef.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(need, open('tools/_ctx/sdef_need.json', 'w'), ensure_ascii=False, indent=1)
print('일상 수업', len(new), '낱말', sum(map(len, new.values())), '남은 것', len(need))
