# -*- coding: utf-8 -*-
"""주간시험 2(교재 1권 1~7과) 모의고사 5벌의 공통 틀 (2026-10-06, 대표님 "주간시험2에는 모의고사 5개 — 억지로 말고 실제 범위 낱말·문법으로, 동일한 틀").
틀은 2차 시험 안내 슬라이드(원본자료/…/주간시험/KakaoTalk 사진 둘) 그대로:
  A 듣기 30 — 1 그림 맞다/틀리다 5 · 2 맞는 그림 5 · 3 듣고 답 고르기 10 · 4 듣고 질문에 답하기(짧은 답) 10
    (듣기 3 은 2026-10-09 부터 교재 듣기 1번 꼴 — 여·남이 한 마디씩 주고받는 두 줄 대화 + 질문, 대화는 dialogs.py · 소리는 dialog_audio.py)
  B 읽기 30 — 1 빈칸(낱말·문법, 보기 다섯) 5 · 2 읽고 질문에 답하기 5 · 3 맞다/틀리다 10 · 4 알맞은 문장 10
  C 쓰기 20 — 1 낱말 배열 5 · 2 틀린 곳 찾기 5 · 3 한 주제로 10문장
  D 말하기 20 — 1 발음(낱말 10·문장 5, pts 1·2) · 2 그림 보고 말하기 2(pts 5) · 3 상황 읽고 말하기 2(pts 5) — 앱에서는 녹음해 듣고 모범 답안을 본 뒤 스스로 매긴다 (대표님 2026-10-07 "말하기는 니가 창조")
낱말은 교재 1권 1~7과 안(ch17_words.json, 이름·숫자 빼고 검사). 그림은 앱 낱말 그림."""
import json, re, unicodedata as U, os, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
W = json.load(open(pathlib.Path(__file__).parent / 'ch17_words.json', encoding='utf-8'))
ENT = set(U.normalize('NFC', v).lower() for b, v, k, i in W)
IMG = {}
for b, v, k, i in W:
    if i and (R / 'img' / i).exists(): IMG.setdefault(U.normalize('NFC', v).lower(), i)
ALLOW = {'bố', 'mẹ'}   # 'bố mẹ'(4과)·'mẹ'(6과)에서 — 낱개 bố 도 교재 대화에 나온다
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
SECN = {"A 듣기 · 1 그림 맞다/틀리다": 5, "A 듣기 · 2 맞는 그림": 5, "A 듣기 · 3 듣고 답 고르기": 10, "A 듣기 · 4 듣고 질문에 답하기": 10, "B 읽기 · 1 빈칸(낱말·문법)": 5, "B 읽기 · 2 읽고 질문에 답하기": 5, "B 읽기 · 3 맞다/틀리다": 10, "B 읽기 · 4 알맞은 문장": 10, "C 쓰기 · 1 낱말 배열": 5, "C 쓰기 · 2 틀린 곳 찾기": 5, "C 쓰기 · 3 한 주제로 10문장": 1, "D 말하기 · 1 낱말 읽기": 10, "D 말하기 · 2 문장 읽기": 5, "D 말하기 · 3 그림 보고 말하기": 2, "D 말하기 · 4 상황 읽고 말하기": 2}
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
def build(no, title, q):
    import collections
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
    snd, pic = collections.Counter(), collections.Counter()
    for x in q:
        if x.get('audio'): snd[x['audio']] += 1
        if x['k'] in ('say', 'puzzle'): snd[x['vi']] += 1
        if x['k'] == 'errpick': snd[x['fix']] += 1
        if x['k'] == 'speak': [snd.update([m['vi']]) for m in x['model']]
        if x.get('img'): pic[x['img']] += 1
        if x['k'] == 'pick': pic.update(x['opts'])
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
            if x['k'] == 'pick': p2.update(x['opts'])
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
        elif k == 'pick': x['exp'] = f"들은 말: {x['audio']}\n{ko(x['audio'])}\n답: {'ABCD'[x['ans']]} {wko(x['words'][x['ans']])}"
        elif k == 'choice' and sec.startswith('A 듣기 · 3') and '\n' in x['audio']:   # 두 사람 대화 — 여: … / 남: … 줄마다 뜻
            ls = x['audio'].split('\n'); x['exp'] = '들은 대화\n' + '\n'.join(f"{'여' if i % 2 == 0 else '남'}: {l} — {ko(l)}" for i, l in enumerate(ls)) + f"\n물음: {x['prompt']} — {ko(x['prompt'])}\n답: {x['opts'][x['ans']]}"
        elif k == 'choice' and sec.startswith('A 듣기 · 3'): x['exp'] = f"들은 말: {x['audio']}\n{ko(x['audio'])}\n물음: {x['prompt']} — {ko(x['prompt'])}\n답: {x['opts'][x['ans']]}"
        elif k == 'choice' and sec.startswith('A 듣기 · 4'): a = x['opts'][x['ans']]; x['exp'] = f"들은 질문: {x['audio']}\n{ko(x['audio'])}\n답: {a} — {ko(a)}"
        elif sec.startswith('B 읽기 · 1'): full = x['prompt'].replace('____', x['opts'][x['ans']]); x['exp'] = f"{full}\n{ko(full)}"
        elif sec.startswith('B 읽기 · 2'): x['exp'] = f"물음: {x['prompt']} — {ko(x['prompt'])}\n글: {ko(x['text'])}\n답: {x['opts'][x['ans']]}"
        elif sec.startswith('B 읽기 · 3'): x['exp'] = f"{x['prompt']} — {ko(x['prompt'])}\n글: {ko(x['text'])}\n→ {'맞다' if x['ans'] else '틀리다'}"
        elif sec.startswith('B 읽기 · 4'): a = x['opts'][x['ans']]; x['exp'] = f"{x['prompt']} — {ko(x['prompt'])}\n답: {a} — {ko(a)}"
        elif k == 'puzzle': x['exp'] = f"{x['vi']}\n{ko(x['vi'])}"
        elif k == 'errpick': x['exp'] = f"{x['fix']}\n{x.get('ko', '')}"
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
