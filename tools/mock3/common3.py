# -*- coding: utf-8 -*-
"""주간시험 3(교재 1권 8~10과 — 대표님 2026-10-13 "범위는 일단 8~10으로 해봐, 주간시험 ㄱㄱ") 모의고사 공통 틀.
틀은 주간시험 2 모의고사와 같은 **실제 1차 시험지 꼴**(tools/mock2/common.py 머리글) — 86문항, 90분, A30·B30·C20·D20.
주간시험 2 와 다른 두 곳 (대표님 2026-10-12, 실제 2회차 듣기 녹음과 견주고 고른 2·3번):
  · 듣기 3·4 의 1~5번은 한 사람이 읽는 문장, 6~10번만 두 사람 짧은 대화(한 줄 5~9음절쯤). 듣기 4 의 6~10번은 물음·대답을 **둘 다** 들려준다.
  · 대화 목소리를 번갈아 — 문항마다 여→남 / 남→여 를 바꾸고(x['voices']), 물음과 대답 사이 1초(dialog_audio3.py).
2차 시험지 사진(2026-10-13)을 보고 더 맞춘 것: 읽기 4 를 2차 꼴(대답 목록 + 먼저 하는 말, 평서문 섞음)으로 · 듣기 4 빈칸에 두 음절 말·숫자 · 듣기 2 는 한 사람의 장면 그림 · 쓰기 3 그림에 이름표·간판 · 말하기는 교재 발음 목록(8~10과 PHÁT ÂM)에서.
낱말은 교재 1권 1~10과 안(ch110_words.json — 1~7과는 주간시험 2 의 ch17_words, 8~10과는 앱 교재 낱말·부록 낱말표), 8~10과 위주.
문항마다 뜻(ko)을 같이 적어 '답 보기' 해설을 만든다(주간시험 2 의 ko_N.tsv 를 따로 두지 않음)."""
import json, re, random, collections, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock2'))
from common import accs, time_moves, patterned, n2v   # noqa: E402  (숫자 꼴·때 말 옮기기·정답 규칙 검사는 주간시험 2 것 그대로)
W = json.load(open(pathlib.Path(__file__).parent / 'ch110_words.json', encoding='utf-8'))
nf = lambda s: U.normalize('NFC', s)
ENT = set(nf(v).lower() for b, v, k, i in W)
LES = {}
for b, v, k, i in W: LES.setdefault(nf(v).lower(), b)
IMG, WKO = {}, {}
for b, v, k, i in W:
    if i and (R / 'img' / i).exists(): IMG.setdefault(nf(v).lower(), i)
    if k: WKO.setdefault(nf(v).lower(), k)
ALLOW = {'bố', 'mẹ', 'a', 'b', 'ga'}   # ga: 쓰기 3 그림 간판 'Ga Hà Nội'(그림에 적힌 말, 2026-10-13)
NAMES = {'david', 'brian', 'eun', 'ji', 'hiroki', 'vân', 'kate', 'loan', 'toàn', 'dũng', 'emily', 'sơn', 'hoàng', 'mây', 'andy', 'may', 'kathy', 'tony', 'hà', 'dung',
         'lee', 'kim', 'lan', 'hoa', 'mai', 'nga', 'hùng', 'linh', 'tuấn', 'thu', 'long', 'tom', 'min', 'jae', 'hưng', 'hoài', 'lành', 'cúc', 'bằng', 'lưu', 'hải', 'đăng',
         'jack', 'cheng', 'saki', 'reiko', 'quận', 'mỹ', 'anh', 'nhật', 'úc', 'hàn', 'quốc', 'việt', 'nam', 'pháp', 'đức', 'ý', 'thái', 'trung', 'nga', 'netflix', 'seoul', 'busan',
         'huế', 'grab', 'fahasa', 'đúng', 'minh', 'bin', 'na'}
NAMES2 = {'hà nội', 'đà nẵng', 'sài gòn', 'nha trang', 'tây ban nha', 'thái lan', 'trung quốc', 'hàn quốc', 'việt nam', 'hồ chí minh', 'ấn độ', 'k-pop'}
def toks(s): return re.sub(r'[.,!?;:…"“”‘’\'()%—_/]', ' ', nf(s).lower()).split()
def check_range(s, bad):
    t = toks(s); i = 0
    while i < len(t):
        hit = False
        for n in (4, 3, 2, 1):
            if ' '.join(t[i:i + n]) in ENT: i += n; hit = True; break
        if hit: continue
        if ' '.join(t[i:i + 2]) in NAMES2: i += 2; continue
        if t[i] in ALLOW or t[i] in NAMES or re.fullmatch(r'\d+', t[i]) or re.search('[가-힣]', t[i]) or t[i] in ('·', '—', '-'): i += 1; continue
        bad[t[i]] = s; i += 1
def img(word):
    k = nf(word).lower()
    if k not in IMG: raise SystemExit(f'그림 없음: {word}')
    return IMG[k]
def wko(w): return f"{w}({WKO.get(nf(w).lower(), '')})"

# ── 문항 만들기 — 뜻(ko)을 함께 받는다 ─────────────────────────────────────────────
def TF(word, audio, ko, ans, im=None):
    return {"sec": "A 듣기 · 1 그림 맞다/틀리다", "k": "tf", "img": im or img(word), "audio": audio, "ans": ans, "made": True, "word": word,
            "exp": f"들은 말: {audio}\n{ko}\n그림: {wko(word)} → {'맞다' if ans else '틀리다'}"}
def PKS(no, five):
    """듣기 2 — 그림 다섯(A~E)을 다섯 문항이 같이 쓴다. five = [(그림 낱말, 소리, 뜻, 따로 그린 그림 or None)]"""
    rnd = random.Random(1000 + no); order = list(range(5)); rnd.shuffle(order)
    while patterned([order.index(i) for i in range(5)], 5): rnd.shuffle(order)
    ws = [five[k][0] for k in order]; ims = [five[k][3] or img(five[k][0]) for k in order]
    out = []
    for i, (w, a, ko, im) in enumerate(five):
        ans = order.index(i)
        out.append({"sec": "A 듣기 · 2 맞는 그림", "k": "pick", "audio": a, "opts": ims, "ans": ans, "made": True, "words": ws,
                    "exp": f"들은 말: {a}\n{ko}\n답: {'ABCDE'[ans]} {wko(w)}"})
    return out
def _dlg(lines, voices):
    who = {'f': '여', 'm': '남'}
    return '\n'.join(f"{who[voices[i % 2]]}: {v} — {k}" for i, (v, k) in enumerate(lines))
def A3s(prompt, pko, audio, ako, opts):
    return {"sec": "A 듣기 · 3 듣고 고르기", "k": "choice", "prompt": prompt, "audio": audio, "opts": opts, "ans": 0, "shuffle": True, "made": True,
            "exp": f"들은 말: {audio}\n{ako}\n물음: {prompt} — {pko}\n답: {opts[0]}"}
def A3d(prompt, pko, lines, opts, voices):
    return {"sec": "A 듣기 · 3 듣고 고르기", "k": "choice", "prompt": prompt, "audio": '\n'.join(v for v, _ in lines), "voices": voices, "opts": opts, "ans": 0, "shuffle": True, "made": True,
            "exp": f"들은 대화\n{_dlg(lines, voices)}\n물음: {prompt} — {pko}\n답: {opts[0]}"}
def _blank(s):
    m = re.search(r'\[([^\]]+)\]', s)
    return s[:m.start()] + '____' + s[m.end():], s.replace('[', '').replace(']', ''), m.group(1)
def A4s(sent, ko):
    pr, full, a = _blank(sent)
    return {"sec": "A 듣기 · 4 듣고 빈칸", "k": "type", "prompt": pr, "audio": full, "acc": accs(a), "made": True, "exp": f"들은 말: {full}\n{ko}\n답: {a}"}
def A4d(q, qko, b, bko, voices):
    pr, full, a = _blank(b)
    return {"sec": "A 듣기 · 4 듣고 빈칸", "k": "type", "prompt": f"A: {q} B: {pr}", "audio": f"{q}\n{full}", "voices": voices, "acc": accs(a), "made": True,
            "exp": f"들은 대화\n{_dlg([(q, qko), (full, bko)], voices)}\n답: {a}"}
def B1S(no, bank, items):
    """읽기 1 — 보기 다섯을 같이 쓰는 빈칸 다섯. items = [(빈칸 문장, 답 낱말, 뜻)] — 정답 차례에 규칙이 안 보이게 보기 차례를 섞는다"""
    rnd = random.Random(5000 + no); n = len(bank)
    while True:
        perm = list(range(n)); rnd.shuffle(perm); opts = [bank[j] for j in perm]
        ans = [opts.index(a) for _, a, _ in items]
        if not patterned(ans, n): break
    return [{"sec": "B 읽기 · 1 빈칸", "k": "choice", "prompt": p, "opts": opts, "ans": opts.index(a), "exp": f"{p.replace('____', a)}\n{ko}"} for p, a, ko in items]
def B2(text, tko, q, qko, opts):
    return {"sec": "B 읽기 · 2 읽고 고르기", "k": "choice", "text": text, "prompt": q, "opts": opts, "ans": 0, "shuffle": True,
            "exp": f"물음: {q} — {qko}\n글: {tko}\n답: {opts[0]}"}
def B3(text, tko, two, no, k):
    rnd = random.Random(7000 + no * 10 + k)
    two = two[:]; rnd.shuffle(two)
    return [{"sec": "B 읽기 · 3 맞다/틀리다", "k": "tf", "text": text, "prompt": st, "ans": a, "exp": f"{st} — {sko}\n글: {tko}\n→ {'맞다' if a else '틀리다'}"} for st, sko, a in two]
def B4S(no, pairs):
    """읽기 4 — **실제 2차 시험지 꼴**(2026-10-13 대표님이 올린 2차 주간시험 사진): 대답 A~J 한 목록 + 먼저 하는 말 1~10(물음·평서 섞임) — 말마다 알맞은 대답을 목록에서 하나.
    (1차 시험지는 거꾸로 — 물음 목록 + 대답 열 — 였다. 가장 최근인 2차 꼴을 따른다.) pairs = [(먼저 하는 말, 뜻, 대답, 뜻)]"""
    idx = list(range(len(pairs))); rnd = random.Random(2000 + no)
    while True:
        rnd.shuffle(idx)
        ans = [idx.index(k) for k in range(len(pairs))]
        if not patterned(ans, len(idx)): break
    reps = [pairs[j][2] for j in idx]
    assert len(set(reps)) == len(reps), ('대답 겹침', no)
    return [{"sec": "B 읽기 · 4 알맞은 문장", "k": "choice", "prompt": pairs[k][0], "opts": reps, "ans": idx.index(k), "abc": True,
             "exp": f"{pairs[k][0]} — {pairs[k][1]}\n답: {'ABCDEFGHIJ'[idx.index(k)]}. {pairs[k][2]} — {pairs[k][3]}"} for k in range(len(pairs))]
def C1(vi, ko, tiles, alts=()):
    x = {"sec": "C 쓰기 · 1 낱말 배열", "k": "puzzle", "vi": vi, "tiles": tiles, "exp": f"{vi}\n{ko}"}
    if alts: x['alts'] = list(alts)
    return x
def C2(prompt, fix, ko, alts=(), dung=False):
    if dung: acc = ['Đúng', 'Đ'] + [z for v in [prompt] + list(alts) + time_moves(prompt) for z in accs(v)]
    else: acc = [z for v in [fix] + list(alts) for v2 in [v] + time_moves(v) for z in accs(v2)]
    return {"sec": "C 쓰기 · 2 맞으면 Đúng, 틀리면 고치기", "k": "type", "prompt": prompt, "acc": list(dict.fromkeys(acc)), "fix": fix, "ko": ko, "dung": True,
            "exp": f"{prompt}\n답: {'Đúng' if dung else fix}\n{fix} — {ko}"}
def C3(im, model, spec):
    """쓰기 3 — 그림 + 모범 5문장 + 앱 채점용 문법 틀(say·facts·pre·post — tools/mock2/w3_accept.py 와 같은 꼴)"""
    assert (R / 'img' / im).exists(), ('쓰기 3 그림 없음', im)
    say = list(dict.fromkeys(spec.get('say', []) + [m.rstrip('.!?').lower() for m, _ in model]))
    gram = {'say': say, 'facts': [[s, p, 1 if pl else 0] for s, p, pl in spec.get('facts', [])], 'pre': spec.get('pre', []), 'post': spec.get('post', [])}
    return {"sec": "C 쓰기 · 3 그림 보고 5문장", "k": "free", "img": im, "prompt": "그림을 보고 문장 5개를 쓰세요.", "model": [v for v, _ in model], "model_ko": [k for _, k in model],
            "n": 5, "pts": 10, "gram": gram, "exp": '\n'.join(f"{v} — {k}" for v, k in model)}
def D(words, sents):
    return [{"sec": "D 말하기 · 1 낱말 읽기", "k": "say", "vi": w, "pts": 1} for w in words] + [{"sec": "D 말하기 · 2 문장 읽기", "k": "say", "vi": s, "pts": 2} for s in sents]

SECN = {"A 듣기 · 1 그림 맞다/틀리다": 5, "A 듣기 · 2 맞는 그림": 5, "A 듣기 · 3 듣고 고르기": 10, "A 듣기 · 4 듣고 빈칸": 10,
        "B 읽기 · 1 빈칸": 5, "B 읽기 · 2 읽고 고르기": 5, "B 읽기 · 3 맞다/틀리다": 10, "B 읽기 · 4 알맞은 문장": 10,
        "C 쓰기 · 1 낱말 배열": 5, "C 쓰기 · 2 맞으면 Đúng, 틀리면 고치기": 5, "C 쓰기 · 3 그림 보고 5문장": 1,
        "D 말하기 · 1 낱말 읽기": 10, "D 말하기 · 2 문장 읽기": 5}
def _ss(t):
    o = []
    for line in nf(t).split('\n'):
        for z in re.split(r'(?<=[.?!])\s+|\s+(?=B:)', line):
            z = re.sub(r'^(A|B):\s*', '', z).strip().lower(); z = ' '.join(re.sub(r'[.,!?;:"“”]', ' ', z).split())
            if len(z.split()) >= 3: o.append(z)
    return o
def sounds(q):
    s = collections.Counter()
    for x in q:
        if x.get('audio'): s[x['audio']] += 1
        if x['k'] in ('say', 'puzzle'): s[x['vi']] += 1
    return s
def build(no, q):
    c = collections.Counter(x['sec'] for x in q)
    for s, n in SECN.items(): assert c[s] == n, (no, s, c[s], n)
    a3 = [x for x in q if x['sec'].startswith('A 듣기 · 3')]; a4 = [x for x in q if x['sec'].startswith('A 듣기 · 4')]
    for L in (a3, a4):                                             # 1~5 한 사람 문장 · 6~10 두 사람 대화 (2026-10-12 2번)
        assert all('\n' not in x['audio'] for x in L[:5]) and all(x['audio'].count('\n') == 1 for x in L[5:]), (no, '듣기 3·4 꼴')
    vs = [x['voices'] for x in q if x.get('voices')]
    assert len(set(vs)) == 2 and abs(vs.count('fm') - vs.count('mf')) <= 1, (no, '대화 목소리 번갈아', vs)   # 2026-10-12 3번
    bad = {}
    for x in q:
        for f in ('audio', 'prompt', 'text', 'vi', 'fix'):
            if x.get(f) and not re.search('[가-힣]', x[f]): check_range(x[f], bad)
        if x['k'] != 'pick':
            for o in x.get('opts', []): check_range(o, bad)
        for m in x.get('model', []): check_range(m, bad)
        if x['k'] == 'puzzle': assert sorted(' '.join(x['tiles']).lower().split()) == sorted(x['vi'].rstrip('.?!').lower().replace(',', '').split()), (no, x['vi'])
        if x['k'] == 'choice' and not x.get('abc'): assert len(set(x['opts'])) == len(x['opts']), (no, x['opts'])
    if bad: raise SystemExit(f'모의고사 {no} 범위 밖 낱말 {len(bad)}: ' + ' | '.join(f'{k} ← {v[:50]}' for k, v in bad.items()))
    snd, pic, pk1 = sounds(q), collections.Counter(), set()
    for x in q:
        if x.get('img'): pic[x['img']] += 1
        if x['k'] == 'pick': pic.update(o for o in x['opts'] if o not in pk1); pk1.update(x['opts'])
    dup = [f'{t} ×{n}' for t, n in snd.items() if n > 1] + [f'그림 {t} ×{n}' for t, n in pic.items() if n > 1]
    if dup: raise SystemExit(f'모의고사 {no} 겹침: ' + ' | '.join(dup))
    where = collections.defaultdict(set)
    for x in q:
        tx = [x[f] for f in ('audio', 'text', 'vi', 'fix') if isinstance(x.get(f), str)]
        pr = x.get('prompt', '')
        if pr and '____' in pr and x['k'] == 'choice': tx.append(pr.replace('____', x['opts'][x['ans']]))
        elif pr and '____' in pr and x['k'] == 'type': tx.append(pr.replace('____', x['acc'][0]))
        elif pr and not re.search('[가-힣]', pr): tx.append(pr)
        if x['sec'].startswith('B 읽기 · 4'): tx.append(x['opts'][x['ans']])
        tx += x.get('model', [])
        for t in tx:
            for z in _ss(t): where[z].add(x['sec'])
    same = {z: v for z, v in where.items() if len(v) > 1}
    if same: raise SystemExit(f'모의고사 {no} 다른 갈래에 같은 문장 {len(same)}: ' + ' | '.join(f'{z} ← {sorted(v)}' for z, v in list(same.items())[:12]))
    for other in range(1, 6):                                       # 다른 벌(주간시험 3)과 같은 소리·그림 없게
        op = R / f'data/mock3_{other}.json'
        if other == no or not op.exists(): continue
        oq = json.load(open(op, encoding='utf-8'))['q']; s2 = sounds(oq); p2 = collections.Counter()
        for x in oq:
            if x.get('img'): p2[x['img']] += 1
            if x['k'] == 'pick': p2.update(set(x['opts']))
        cross = [t for t in snd if t in s2] + ['그림 ' + t for t in pic if t in p2]
        if cross: raise SystemExit(f'모의고사 {no} 가 {other} 과 겹침: ' + ' | '.join(cross))
    for i, x in enumerate(q):                                       # 보기 차례를 한 번 섞어 고정 — 누구에게나 같게
        if x['k'] == 'choice' and x.get('shuffle'):
            idx = list(range(len(x['opts']))); random.Random(3000 + no * 100 + i).shuffle(idx)
            x['ans'] = idx.index(x['ans']); x['opts'] = [x['opts'][j] for j in idx]; x.pop('shuffle')
    # 낱말 몫 — 8~10과 낱말 비율(기능어·이름 빼고 내용 낱말 종류)
    kinds = collections.Counter()
    for x in q:
        for f in ('audio', 'text', 'vi', 'prompt'):
            if isinstance(x.get(f), str) and not re.search('[가-힣]', x[f]):
                t = toks(x[f]); i = 0
                while i < len(t):
                    for n in (4, 3, 2, 1):
                        k = ' '.join(t[i:i + n])
                        if k in LES: kinds[k] = LES[k]; i += n; break
                    else: i += 1
    share = round(100 * sum(1 for k, b in kinds.items() if b >= 8) / max(1, len(kinds)))
    out = {"note": f"주간시험 3 모의고사 {no} — 교재 1권 8~10과 범위(문법은 1~10과, 낱말은 8~10과 위주 — 대표님 2026-10-13 '범위는 일단 8~10'). 실제 1차 시험지 꼴(tools/mock3/common3.py 머리글), 듣기 3·4 는 실제 2회차 녹음처럼 1~5 문장·6~10 대화. 클로드가 냄(2026-10-13).",
           "title": f"모의고사 {no}", "time": 90, "pts": {"A": 30, "B": 30, "C": 20, "D": 20}, "q": q}
    json.dump(out, open(R / f'data/mock3_{no}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    aud = []
    for x in q:
        if x.get('audio') and '\n' not in x['audio']: aud.append(x['audio'])
        if x['k'] in ('say', 'puzzle'): aud.append(x['vi'])
    aud = list(dict.fromkeys(aud))
    json.dump(aud, open(pathlib.Path(__file__).parent / f'_aud_{no}.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'모의고사 {no}: 문항 {len(q)} · 소리 글 {len(aud)} · 대화 {len(vs)} · 8~10과 낱말 몫 {share}% ({len(kinds)}종)')
