# -*- coding: utf-8 -*-
"""주간시험 2(교재 1권 1~7과) 모의고사 5벌의 공통 틀 (2026-10-06, 대표님 "주간시험2에는 모의고사 5개 — 억지로 말고 실제 범위 낱말·문법으로, 동일한 틀").
틀은 **실제 1차 시험지(data/exam1.json) 그대로** (2026-10-09 대표님 "참고하라고 한 실제 1회차 시험지 — 시험 형식 틀은 그대로, 단어와 문법만 범위 다르게").
  exN.py 는 예전(2차 안내 슬라이드 꼴, 10-06)으로 적혀 있고 build() 앞의 form1() 이 1차 꼴로 옮긴다 — 새로 쓴 듣기 4·쓰기 3 은 form1.py:
  A 듣기 30 — 1 그림 맞다/틀리다 5 · 2 맞는 그림 5(그림 다섯 A~E 를 다섯 문항이 같이) · 3 듣고 고르기 10(여·남 두 줄 대화 + 물음 — dialogs.py·dialog_audio.py) · 4 듣고 빈칸 10(A: 물음 B: 대답 ____, 보기 넷)
  B 읽기 30 — 1 빈칸 5(보기 다섯 같이) · 2 읽고 고르기 5 · 3 맞다/틀리다 10 · 4 알맞은 문장 10(대답을 보고 앞의 물음 고르기)
  C 쓰기 20 — 1 낱말 배열 5 · 2 맞으면 Đúng, 틀리면 고치기 5(셋은 틀린 문장, 둘은 맞는 문장) · 3 그림 보고 5문장(10점, img/mockN-w3.webp)
  D 말하기 20 — 1 낱말 읽기 10 · 2 문장 읽기 5 (앱: 두 번 안에 발음·높낮이 둘 다 통과해야 맞음)
낱말은 교재 1권 1~7과 안(ch17_words.json, 이름·숫자 빼고 검사). 그림은 앱 낱말 그림."""
import json, re, unicodedata as U, os, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
W = json.load(open(pathlib.Path(__file__).parent / 'ch17_words.json', encoding='utf-8'))
ENT = set(U.normalize('NFC', v).lower() for b, v, k, i in W)
IMG = {}
for b, v, k, i in W:
    if i and (R / 'img' / i).exists(): IMG.setdefault(U.normalize('NFC', v).lower(), i)
ALLOW = {'bố', 'mẹ', 'a', 'b'}   # a·b: 1차 꼴 듣기 4 의 'A: … B: …' 표시   # 'bố mẹ'(4과)·'mẹ'(6과)에서 — 낱개 bố 도 교재 대화에 나온다
NAMES = {'david', 'brian', 'eun', 'ji', 'hiroki', 'vân', 'kate', 'loan', 'min', 'dorothy', 'hồ', 'chí', 'minh', 'quận', 'mỹ', 'anh', 'nhật', 'úc', 'hàn', 'quốc', 'việt', 'nam', 'đúng', 'lan', 'hoa', 'mai', 'nga', 'hùng', 'linh', 'tuấn', 'thu', 'long', 'kim', 'lee', 'park', 'tom', 'mary', 'john', 'anna', 'yumi', 'đà', 'nẵng', 'sài', 'gòn', 'huế', 'busan', 'seoul', 'tokyo', 'pháp', 'đức', 'thái', 'trung', 'nhân', 'văn', 'fahasa', 'nguyễn', 'huệ', 'ila', 'đinh', 'tiên', 'hoàng', 'toàn', 'dũng', 'grab', 'samsung', 'lg', 'hyundai'}
def img(word):
    k = U.normalize('NFC', word).lower()
    if k not in IMG: raise SystemExit(f'그림 없음: {word}')
    return IMG[k]
def TF(word, audio, ans): return {"sec": "A 듣기 · 1 그림 맞다/틀리다", "k": "tf", "img": img(word), "audio": audio, "ans": ans, "made": True, "word": word}
def PK(pics, audio, ans): return {"sec": "A 듣기 · 2 맞는 그림", "k": "pick", "audio": audio, "opts": [img(w) for w in pics], "ans": ans, "made": True, "words": list(pics)}
def A3(p, a, o): return {"sec": "A 듣기 · 3 듣고 답 고르기", "k": "choice", "prompt": p, "audio": a, "opts": o, "ans": 0, "shuffle": True, "made": True}
def A4(a, o): return {"sec": "A 듣기 · 4 듣고 질문에 답하기", "k": "choice", "prompt": "(들은 질문에 알맞은 답)", "audio": a, "opts": o, "ans": 0, "shuffle": True, "made": True}
def B1(p, bank, ans): return {"sec": "B 읽기 · 1 빈칸(낱말·문법)", "k": "choice", "prompt": p, "opts": bank, "ans": ans}
def B2(t, p, o): return {"sec": "B 읽기 · 2 읽고 질문에 답하기", "k": "choice", "text": t, "prompt": p, "opts": o, "ans": 0, "shuffle": True}
def B3(t, p, a): return {"sec": "B 읽기 · 3 맞다/틀리다", "k": "tf", "text": t, "prompt": p, "ans": a}
def B4(p, o): return {"sec": "B 읽기 · 4 알맞은 문장", "k": "choice", "prompt": p, "opts": o, "ans": 0, "shuffle": True}
def C1(vi, tiles): return {"sec": "C 쓰기 · 1 낱말 배열", "k": "puzzle", "vi": vi, "tiles": tiles}
def C2(wrong, bad, fix, ko): return {"sec": "C 쓰기 · 2 틀린 곳 찾기", "k": "errpick", "vi": wrong, "bad": bad, "fix": fix, "ko": ko}
def C3(topic, model): return {"sec": "C 쓰기 · 3 한 주제로 10문장", "k": "free", "prompt": topic, "model": model, "n": 10, "pts": 10}
def D1(words, sents): return [{"sec": "D 말하기 · 1 낱말 읽기", "k": "say", "vi": w, "pts": 1} for w in words] + [{"sec": "D 말하기 · 2 문장 읽기", "k": "say", "vi": s, "pts": 2} for s in sents]
def _mdl(model, model_ko): assert len(model) == len(model_ko); return [{"vi": v, "ko": k} for v, k in zip(model, model_ko)]
def D2(word, ask, model, model_ko): return {"sec": "D 말하기 · 3 그림 보고 말하기", "k": "speak", "img": img(word), "ask": ask, "model": _mdl(model, model_ko), "n": len(model), "pts": 5}
def D3(ask, model, model_ko): return {"sec": "D 말하기 · 4 상황 읽고 말하기", "k": "speak", "ask": ask, "model": _mdl(model, model_ko), "n": len(model), "pts": 5}
SECN = {"A 듣기 · 1 그림 맞다/틀리다": 5, "A 듣기 · 2 맞는 그림": 5, "A 듣기 · 3 듣고 고르기": 10, "A 듣기 · 4 듣고 빈칸": 10,
        "B 읽기 · 1 빈칸": 5, "B 읽기 · 2 읽고 고르기": 5, "B 읽기 · 3 맞다/틀리다": 10, "B 읽기 · 4 알맞은 문장": 10,
        "C 쓰기 · 1 낱말 배열": 5, "C 쓰기 · 2 맞으면 Đúng, 틀리면 고치기": 5, "C 쓰기 · 3 그림 보고 5문장": 1,
        "D 말하기 · 1 낱말 읽기": 10, "D 말하기 · 2 문장 읽기": 5}   # 실제 1차 시험지(data/exam1.json) 그대로 — 86문항 (2026-10-09)
NAMES2 = {'hà nội', 'đà nẵng', 'sài gòn', 'vũng tàu', 'nha trang', 'phú quốc', 'tây ban nha', 'thái lan', 'trung quốc', 'đài loan', 'hàn quốc', 'việt nam', 'nhân văn', 'bến tre', 'hồ chí minh', 'nguyễn huệ'}
def toks(s): return re.sub(r'[.,!?;:…"“”()%—_/]', ' ', U.normalize('NFC', s).lower()).split()
def check_range(s, bad):
    t = toks(s); i = 0
    while i < len(t):
        ok = False
        for n in (4, 3, 2, 1):                      # 교재 낱말(여러 낱말짜리 먼저) → 이름·숫자·허용 낱말 차례 — 이름 글자(nhân)가 낱말(nhân viên)을 가리지 않게
            if ' '.join(t[i:i + n]) in ENT: i += n; ok = True; break
        if ok: continue
        if ' '.join(t[i:i+2]) in NAMES2: i += 2; continue
        if t[i] in ALLOW or t[i] in NAMES or re.fullmatch(r'\d+', t[i]) or re.search('[가-힣]', t[i]) or t[i] in ('·', '—', '-'): i += 1; continue
        bad[t[i]] = s; i += 1
OKTXT = 'Đúng — 맞는 문장'
def form1(no, q):
    """exN.py 의 문항을 실제 1차 시험지 꼴로 옮긴다 (대표님 2026-10-09 "시험 형식 틀은 그대로 동일하게 — 단어와 문법만 범위 다르게"). 새로 쓴 것은 form1.py(듣기 4·쓰기 3)"""
    import random
    from form1 import A4F, C3F
    rnd = random.Random(1000 + no)
    out = []
    pks = [x for x in q if x['k'] == 'pick']
    words5 = [x['words'][x['ans']] for x in pks]; order = list(range(5)); rnd.shuffle(order)
    pw = [words5[k] for k in order]; po = [img(w) for w in pw]          # 그림 다섯(A~E)을 다섯 문항이 같이 쓴다 — 1차처럼
    b4 = [x for x in q if x['sec'].startswith('B 읽기 · 4')]
    qs, rs = [x['prompt'] for x in b4], [x['opts'][x['ans']] for x in b4]
    c2 = [x for x in q if x['k'] == 'errpick']
    def alt(fix, wrong):                                                # 틀린 보기 하나 더 — 바른 문장에서 이웃한 두 '낱말'(여러 음절 낱말은 한 덩이) 자리 바꾸기. 첫 낱말·쉼표 붙은 낱말은 안 건드림
        end = re.search(r'[.?!]*$', fix).group(0); ws = fix[:len(fix) - len(end)].split()
        low = [re.sub(r'[,.!?;:]', '', w).lower() for w in ws]; spans, i = [], 0
        while i < len(ws):
            n = next((n for n in (4, 3, 2) if i + n <= len(ws) and ' '.join(low[i:i + n]) in ENT and not any(w.endswith(',') for w in ws[i:i + n - 1])), 1)
            spans.append(ws[i:i + n]); i += n
        for j in range(len(spans) - 2, 0, -1):
            if spans[j][-1].endswith(',') or spans[j + 1][-1].endswith(','): continue
            t2 = spans[:]; t2[j], t2[j + 1] = t2[j + 1], t2[j]; c = ' '.join(w for sp in t2 for w in sp) + end
            if c not in (fix, wrong): return c
        raise SystemExit(f'틀린 보기를 못 만듦: {fix}')
    a4done = c3done = False
    for x in q:
        sec, k = x['sec'], x['k']
        if k == 'speak': continue                                       # 1차 말하기는 낱말 10 · 문장 5 읽기뿐
        if k == 'pick':
            i = pks.index(x); x = dict(x, opts=po, words=pw, ans=pw.index(words5[i]))
        elif sec.startswith('A 듣기 · 3'): x = dict(x, sec='A 듣기 · 3 듣고 고르기')
        elif sec.startswith('A 듣기 · 4'):
            if a4done: continue
            a4done = True
            for qa, b, d in A4F[no]:
                m = re.search(r'\[([^\]]+)\]', b); full = b.replace('[', '').replace(']', '')
                out.append({"sec": "A 듣기 · 4 듣고 빈칸", "k": "choice", "prompt": f"A: {qa} B: " + b[:m.start()] + '____' + b[m.end():],
                            "audio": full, "opts": [m.group(1)] + d, "ans": 0, "shuffle": True, "made": True})
            continue
        elif sec.startswith('B 읽기 · 1'): x = dict(x, sec='B 읽기 · 1 빈칸')
        elif sec.startswith('B 읽기 · 2'): x = dict(x, sec='B 읽기 · 2 읽고 고르기')
        elif sec.startswith('B 읽기 · 4'):                               # 1차: 대답을 보여 주고 앞의 물음을 고른다
            i = b4.index(x); n = len(b4)
            x = {"sec": "B 읽기 · 4 알맞은 문장", "k": "choice", "prompt": rs[i], "opts": [qs[i]] + [qs[(i + d) % n] for d in (1, 2, 3)], "ans": 0, "shuffle": True}
        elif k == 'errpick':                                            # 1차: 맞으면 Đúng, 틀리면 바른 문장 고르기 — 다섯 중 둘은 맞는 문장
            i = c2.index(x)
            if i < 3: x = {"sec": "C 쓰기 · 2 맞으면 Đúng, 틀리면 고치기", "k": "choice", "prompt": x['vi'], "opts": [x['fix'], OKTXT, alt(x['fix'], x['vi'])], "ans": 0, "shuffle": True, "fix": x['fix'], "ko": x['ko']}
            else:     x = {"sec": "C 쓰기 · 2 맞으면 Đúng, 틀리면 고치기", "k": "choice", "prompt": x['fix'], "opts": [OKTXT, x['vi'], alt(x['fix'], x['vi'])], "ans": 0, "shuffle": True, "fix": x['fix'], "ko": x['ko']}
        elif k == 'free':
            if c3done: continue
            c3done = True
            f, mk = C3F[no]
            assert (R / 'img' / f).exists(), ('쓰기 3 그림 없음', f)
            x = {"sec": "C 쓰기 · 3 그림 보고 5문장", "k": "free", "img": f, "prompt": "그림을 보고 문장 5개를 쓰세요.", "model": [v for v, _ in mk], "model_ko": [k2 for _, k2 in mk], "n": 5, "pts": 10}
        out.append(x)
    return out
def build(no, title, q):
    import collections
    q = form1(no, q)
    c = collections.Counter(x['sec'] for x in q)
    for s, n in SECN.items(): assert c[s] == n, (no, s, c[s], n)
    bad = {}
    for x in q:
        for f in ('audio', 'prompt', 'text', 'vi', 'fix'):
            if x.get(f) and not x[f].startswith('(') and not re.search('[가-힣]', x[f]): check_range(x[f], bad)
        if x['k'] != 'pick':
            for o in x.get('opts', []): check_range(o, bad)
        for m in x.get('model', []): check_range(m['vi'] if isinstance(m, dict) else m, bad)
        if x['k'] == 'errpick':
            assert 0 <= x['bad'] < len(x['vi'].replace('.', '').replace('?', '').split()), (no, x['vi'])
        if x['k'] == 'puzzle': assert sorted(' '.join(x['tiles']).lower().split()) == sorted(x['vi'].rstrip('.?!').lower().split()), (no, x['vi'])
    if bad: raise SystemExit(f'모의고사 {no} 범위 밖 낱말: ' + ' | '.join(f'{k} ← {v[:50]}' for k, v in bad.items()))
    # 한 벌 안에서 같은 소리·같은 그림은 한 번만 (대표님 2026-10-07: "1번에 나왔던 오디오가 6번에 또 나오지 말라, 그림도 1~10번이 계속 같은 것만 — 참고 사진의 문제 형태는 그렇지 않다")
    snd, pic, pk1 = collections.Counter(), collections.Counter(), set()
    for x in q:
        if x.get('audio'): snd[x['audio']] += 1
        if x['k'] in ('say', 'puzzle'): snd[x['vi']] += 1
        if x['k'] == 'errpick': snd[x['fix']] += 1
        if x['k'] == 'speak': [snd.update([m['vi']]) for m in x['model']]
        if x.get('img'): pic[x['img']] += 1
        if x['k'] == 'pick': pic.update(o for o in x['opts'] if o not in pk1); pk1.update(x['opts'])
    dup = [f'{t} ×{n}' for t, n in snd.items() if n > 1] + [f'그림 {t} ×{n}' for t, n in pic.items() if n > 1]
    if dup: raise SystemExit(f'모의고사 {no} 겹침: ' + ' | '.join(dup))
    # 다른 벌과도 겹치면 안 된다 (대표님 2026-10-08) — 이미 지어진 data/mock2_N.json 과 견준다
    for other in range(1, 6):
        op = R / f'data/mock2_{other}.json'
        if other == no or not op.exists(): continue
        s2, p2 = collections.Counter(), collections.Counter()
        for x in json.load(open(op, encoding='utf-8'))['q']:
            if x.get('audio'): s2[x['audio']] += 1
            if x['k'] in ('say', 'puzzle'): s2[x['vi']] += 1
            if x['k'] == 'errpick': s2[x['fix']] += 1
            if x['k'] == 'speak': [s2.update([m['vi']]) for m in x['model']]
            if x.get('img'): p2[x['img']] += 1
            if x['k'] == 'pick': p2.update(set(x['opts']))
        cross = [t for t in snd if t in s2] + ['그림 ' + t for t in pic if t in p2]
        if cross: raise SystemExit(f'모의고사 {no} 가 {other} 과 겹침: ' + ' | '.join(cross))
    # 답 보기·해설 (대표님 2026-10-08 "문제마다 답 보기 버튼 누르면 답을 알 수 있도록, 해설도 함께") — 뜻은 tools/mock2/ko_N.tsv(문장)·ch17_words.json(낱말)
    KOS = {}
    for kp in sorted(pathlib.Path(__file__).parent.glob('ko_*.tsv')):
        for ln in kp.read_text(encoding='utf-8').splitlines():
            if ln.strip() and not ln.startswith('#') and '\t' in ln:
                v, k = ln.split('\t', 1); KOS.setdefault(U.normalize('NFC', v.strip()), k.strip())
    WKO = {U.normalize('NFC', v).lower(): k for b, v, k, i in W}
    lack = []
    def ko(t):
        if '\n' in t: return '\n'.join(ko(x) for x in t.split('\n'))   # 두 사람 대화(듣기 3) — 줄마다 (2026-10-09)
        t2 = U.normalize('NFC', t.strip())
        r = KOS.get(t2) or WKO.get(t2.lower())
        if not r: lack.append(t)
        return r or ''
    def wko(wd): return f'{wd}({WKO.get(U.normalize("NFC", wd).lower(), "")})'
    for x in q:
        k, sec = x['k'], x['sec']
        if k == 'tf' and x.get('audio'): x['exp'] = f"들은 말: {x['audio']}\n{ko(x['audio'])}\n그림: {wko(x['word'])} → {'맞다' if x['ans'] else '틀리다'}"
        elif k == 'pick': x['exp'] = f"들은 말: {x['audio']}\n{ko(x['audio'])}\n답: {'ABCDE'[x['ans']]} {wko(x['words'][x['ans']])}"
        elif k == 'choice' and sec.startswith('A 듣기 · 3') and '\n' in x['audio']:   # 두 사람 대화 — 여: … / 남: … 줄마다 뜻
            ls = x['audio'].split('\n'); x['exp'] = '들은 대화\n' + '\n'.join(f"{'여' if i % 2 == 0 else '남'}: {l} — {ko(l)}" for i, l in enumerate(ls)) + f"\n물음: {x['prompt']} — {ko(x['prompt'])}\n답: {x['opts'][x['ans']]}"
        elif k == 'choice' and sec.startswith('A 듣기 · 3'): x['exp'] = f"들은 말: {x['audio']}\n{ko(x['audio'])}\n물음: {x['prompt']} — {ko(x['prompt'])}\n답: {x['opts'][x['ans']]}"
        elif k == 'choice' and sec.startswith('A 듣기 · 4'): x['exp'] = f"들은 말: {x['audio']}\n{ko(x['audio'])}\n답: {x['opts'][x['ans']]}"
        elif sec.startswith('B 읽기 · 1'): full = x['prompt'].replace('____', x['opts'][x['ans']]); x['exp'] = f"{full}\n{ko(full)}"
        elif sec.startswith('B 읽기 · 2'): x['exp'] = f"물음: {x['prompt']} — {ko(x['prompt'])}\n글: {ko(x['text'])}\n답: {x['opts'][x['ans']]}"
        elif sec.startswith('B 읽기 · 3'): x['exp'] = f"{x['prompt']} — {ko(x['prompt'])}\n글: {ko(x['text'])}\n→ {'맞다' if x['ans'] else '틀리다'}"
        elif sec.startswith('B 읽기 · 4'): a = x['opts'][x['ans']]; x['exp'] = f"{x['prompt']} — {ko(x['prompt'])}\n답: {a} — {ko(a)}"
        elif k == 'puzzle': x['exp'] = f"{x['vi']}\n{ko(x['vi'])}"
        elif k == 'errpick': x['exp'] = f"{x['fix']}\n{x.get('ko', '')}"
        elif sec.startswith('C 쓰기 · 2'): a = x['opts'][x['ans']]; x['exp'] = f"{x['prompt']}\n답: {a}\n{x['fix']} — {x.get('ko', '')}"
        elif k == 'free': x['exp'] = '\n'.join(f"{v} — {k2}" for v, k2 in zip(x['model'], x.get('model_ko') or [''] * len(x['model'])))
    if lack: raise SystemExit(f'모의고사 {no} 해설 뜻 없음 {len(set(lack))}: ' + ' | '.join(sorted(set(lack))[:12]))
    out = {"note": f"주간시험 2 모의고사 {no} — 교재 1권 1~7과 범위(문법은 1~7과, 낱말은 4~7과 위주 — 대표님 2026-10-07), 2차 시험 안내 슬라이드의 틀(tools/mock2/common.py 머리글) 그대로. 클로드가 냄(2026-10-06). 듣기는 문항마다 문장 하나(길면 둘), 듣기 4는 질문을 듣고 짧은 답을 고른다. 쓰기 2는 틀린 낱말 자리를 짚는다. 쓰기 3은 모범 답안을 보고 스스로 매긴다. 말하기(D)는 녹음해 듣고 모범 답안을 본 뒤 스스로 매긴다(2026-10-07).", "title": title, "time": 90, "pts": {"A": 30, "B": 30, "C": 20, "D": 20}, "q": q}
    json.dump(out, open(R / f'data/mock2_{no}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    aud = []
    for x in q:
        if x.get('audio') and '\n' not in x['audio']: aud.append(x['audio'])   # 두 사람 대화는 tools/mock2/dialog_audio.py 가 여·남 소리를 이어 붙여 만든다
        if x['k'] in ('say', 'puzzle'): aud.append(x['vi'])
        if x['k'] == 'speak': aud += [m['vi'] for m in x['model']]
        if x['k'] == 'errpick': aud.append(x['fix'])
    print(f'모의고사 {no}: 문항 {len(q)} · 소리 글 {len(set(aud))}')
    json.dump(list(dict.fromkeys(aud)), open(pathlib.Path(__file__).parent / f'_aud_{no}.json', 'w', encoding='utf-8'), ensure_ascii=False)
    return list(dict.fromkeys(aud))
