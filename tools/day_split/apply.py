"""일상 주제 나누기 + 주제 안 낱말 정렬 → data/days.json (2026-10-02, 대표님 "챕터 나누기 진행해 · 정렬 ㄱㄱ").
① 'A와 B' 주제(make.py SPLIT)는 ds_*.tsv(보조 판정, 클로드 검토 고침은 고침.tsv 가 덮음)대로 A·B 두 주제로. 한쪽이 MINW 개 미만이면 나누지 않는다.
② 모든 주제 안 낱말을 **자막 빈도**(tools/freq/sub_counts.json — OPUS OpenSubtitles 2018 vi 에서 낱말 단위로 센 횟수) 많은 차례로.
   같으면 원래 차례. 차례가 정해진 주제(숫자 세기·달 이름·요일)는 원래 차례 그대로.
③ 세트(일차)로 다시 자른다 — 한 세트 SET 개 이하로 고르게. **진도 열쇠(day)는 주제의 원래 열쇠를 차례대로 다시 쓰고**, 모자라면 새 번호.
   세트 수가 원래보다 적어지면 늘려 원래 열쇠를 다 쓴다(끝낸 기록이 붕 뜨지 않게).
④ n(차례·Day 번호)은 주제 차례대로 1부터 다시. data/topic_links.json 의 일상 주제 이름도 새 이름으로.
쓰기: python3 tools/day_split/apply.py [--write]"""
import json, math, pathlib, re, sys, unicodedata, collections, glob
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from make import SPLIT
R = pathlib.Path(__file__).resolve().parent.parent.parent
SET, MINW = 16, 6
KEEP_ORDER = {'숫자 세기', '달 이름', '요일·날짜'}   # 차례가 정해진 것(1·2·3…, 1월·2월…, 월·화·수…)은 빈도로 섞지 않는다
nfc = lambda s: unicodedata.normalize('NFC', s).lower().strip()
punct = re.compile(r"[^\w\s]", re.U)
key = lambda s: re.sub(r'\s+', ' ', punct.sub(' ', nfc(s))).strip()
C = json.loads((R / 'tools/freq/sub_counts.json').read_text(encoding='utf-8'))['c']
dec = {}
for f in sorted(glob.glob(str(R / 'tools/day_split/ds_*.tsv'))) + [str(R / 'tools/day_split/고침.tsv')]:
    p = pathlib.Path(f)
    if not p.exists(): continue
    for l in p.read_text(encoding='utf-8').splitlines():
        c = l.split('\t')
        if len(c) >= 3 and c[2].strip() in ('A', 'B') and not l.startswith('#'): dec[(c[0].strip(), c[1].strip())] = c[2].strip()
D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))
life = sorted([d for d in D['days'] if isinstance(d.get('day'), int) and not d.get('track')], key=lambda d: d.get('n', 0))
others = [d for d in D['days'] if not (isinstance(d.get('day'), int) and not d.get('track'))]
th = collections.OrderedDict()
for d in life: th.setdefault(d['theme'].split(' (')[0], []).append(d)
nextkey = max(d['day'] for d in D['days'] if isinstance(d.get('day'), int)) + 1
new, log, kept = [], [], []
for base, ds in th.items():
    words = [w for d in ds for w in d['words']]
    keys = [d['day'] for d in ds]
    parts = [(base, words)]
    if base in SPLIT:
        miss = [w['vi'] for w in words if (base, w['vi']) not in dec]
        if miss: raise SystemExit(f'판정 없음 {base}: {miss[:5]}')
        a = [w for w in words if dec[(base, w['vi'])] == 'A']; b = [w for w in words if dec[(base, w['vi'])] == 'B']
        if len(a) >= MINW and len(b) >= MINW: parts = [(SPLIT[base][0], a), (SPLIT[base][1], b)]
        else: kept.append(f'{base} (A {len(a)} · B {len(b)}) — 한쪽이 {MINW}개 미만이라 그대로')
    plan = []
    for name, ws in parts:
        if name not in KEEP_ORDER:
            ws = sorted(ws, key=lambda w: (-C.get(key(w['vi']), 0), words.index(w)))
        plan.append([name, ws, max(1, math.ceil(len(ws) / SET))])
    while sum(p[2] for p in plan) < len(keys):          # 원래 열쇠를 다 쓰게 세트를 늘린다
        max(plan, key=lambda p: len(p[1]) / p[2])[2] += 1
    ki = 0
    for name, ws, k in plan:
        sz = [len(ws) // k + (1 if i < len(ws) % k else 0) for i in range(k)]
        pos = 0
        for i, s in enumerate(sz):
            if ki < len(keys): dk = keys[ki]
            else: dk = nextkey; nextkey += 1
            ki += 1
            new.append({'day': dk, 'theme': name + (f' ({i + 1}/{k})' if k > 1 else ''), 'words': ws[pos:pos + s]})
            pos += s
        log.append(f'{base} → {name} {len(ws)}낱말 {k}세트' + ('' if name in KEEP_ORDER else ' (자막 빈도순)'))
for i, d in enumerate(new, 1): d['n'] = i
assert sum(len(d['words']) for d in new) == sum(len(d['words']) for d in life)
assert len({d['day'] for d in new}) == len(new) and {d['day'] for d in life} <= {d['day'] for d in new}
print('\n'.join(log)); print('나누지 않음:', kept or '없음')
print('일상', len(life), '세트 →', len(new), '세트 · 주제', len(th), '→', len(dict.fromkeys(d['theme'].split(' (')[0] for d in new)), '· 낱말', sum(len(d['words']) for d in new))
if '--write' in sys.argv:
    D['days'] = others + new
    (R / 'data/days.json').write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8')
    T = json.loads((R / 'data/topic_links.json').read_text(encoding='utf-8'))
    ren = {}
    newnames = {}
    for d in new: newnames.setdefault(d['theme'].split(' (')[0], None)
    for base in th:
        if base in SPLIT and SPLIT[base][0] in newnames: ren[base] = [SPLIT[base][0], SPLIT[base][1]]
    for x in T['main'].values():
        out = []
        for t in x['days']: out.extend(ren.get(t, [t]))
        x['days'] = list(dict.fromkeys(out))
    (R / 'data/topic_links.json').write_text(json.dumps(T, ensure_ascii=False, indent=1), encoding='utf-8')
    print('썼음 · topic_links 이름 바꿈', len(ren))
