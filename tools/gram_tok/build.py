#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""문법 문형 알아보기 규칙(규칙.tsv) → data/_gram_tok.json (앱·도구가 같이 쓰는 정규식) + 메인 교재 과별 문법 지도 data/_gram_ch.json (2026-10-06)
① 규칙을 정규식으로 바꾸고 **그 문형의 예문으로 검산**한다(예문 하나도 못 알아보면 알려 준다).
② 메인 교재 1·2권 과마다 대화 문장·문법 상자 예문에 어떤 문형이 나오는지 찾아 과 → 문형 지도를 만든다(처음 나오는 과도 적는다).
③ 교재 대화에 나오는 기능어(의문사·시제·어조사·접속사…) 가운데 어느 문형 규칙에도 안 잡히는 것을 보고한다(앱에 없는 문법 후보).
쓰기: python3 tools/gram_tok/build.py"""
import json, re, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
L = 'A-Za-zÀ-ỹĐđ'
def tok(t):
    if t == '_': return '.*?'
    if t == '?': return r'\s*\?'
    if t == '!': return r'\s*!'
    if t == '^': return r'^\s*'
    if t == '$': return r'\s*[.!?]?\s*$'
    if t == ',': return r'\s*,'
    def lit(w):
        w = w.replace('+', r'\s+')
        return f'(?<![{L}]){w}(?![{L}])'
    if t.startswith('(') and t.endswith(')'):
        alts = t[1:-1].split('|')
        return '(?:' + '|'.join(lit(a) if not a.startswith('\\') else a for a in alts) + ')'
    return lit(t)
def compile_rule(r):
    r = r.strip()
    if r.startswith('re:'): return r[3:]
    parts = r.split(' ')
    out = []
    for i, p in enumerate(parts):
        s = tok(p)
        if i and parts[i-1] not in ('^', '_') and p not in ('?', '!', '$', ',', '_'): out.append(r'\s*' if parts[i-1] == ',' else r'\s+')
        out.append(s)
    return ''.join(out)
nfc = lambda s: U.normalize('NFC', s)
# 문법 상자 설명에서 뽑은 '예문'이 베트남어 문장인가 — 한글이 섞이거나(Quá: 형용사 '뒤'에…) 한 낱말이면 뺀다
viSent = lambda m: not re.search('[가-힣]', m) and len(m.split()) >= 2 and not re.search(r'[:：]', m)
def clean(s): return nfc(s).lower().strip()
rules = {}; rules_raw = {}
for line in (R / 'tools/gram_tok/규칙.tsv').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    k, v = line.split('\t', 1)
    rules[k.strip()] = [] if v.strip() == '-' else [compile_rule(x) for x in v.split(';')]
    rules_raw[k.strip()] = [] if v.strip() == '-' else [x.strip() for x in v.split(';')]
G = json.load(open(R / 'data/grammar.json', encoding='utf-8'))
items = []
for li, l in enumerate(G['books'][0]['bai']):
    for gi, x in enumerate(l['g']):
        k = f"{l['no']}.{gi}"
        if k not in rules: print('규칙 없음', k, x['t']); continue
        rs = rules[k]
        for r in rs: re.compile(r, re.I)
        # tok: 빈칸으로 뚫을 수 있는 말 — 규칙의 낱말들(고르기는 첫 것, 정규식 그대로인 규칙은 뺀다)
        toks = []
        for r0 in ([] if rules[k] == [] else [x for x in (rules_raw.get(k) or [])]):
            if r0.startswith('re:'): continue
            for t in r0.split(' '):
                if t in ('_', '?', '!', '^', '$', ','): continue
                w = (t[1:-1].split('|')[0] if t.startswith('(') else t).replace('+', ' ')
                if w and not w.startswith('\\') and w not in toks: toks.append(w)
        if l['no'] in (1, 2, 3, 7, 13, 14, 16, 46) or k in ('39.4', '39.2', '39.3', '46.0'): toks = []   # 통째로 외우는 말(Không sao·Thế ạ)도 — 문장 전체가 빈칸이 됐다   # 인사·호칭·숫자·시각·날짜·옷·카페 말은 낱말 목록이라 문법 빈칸으로 안 뚫는다 ('Xin chào!' 빈칸이 나왔다)
        items.append({'id': k, 'no': l['no'], 'li': li, 'gi': gi, 't': x['t'], 're': rs, 'always': not rs, 'tok': toks})
# ① 검산 — 예문
bad = []
for it in items:
    if it['always']: continue
    x = G['books'][0]['bai'][it['li']]['g'][it['gi']]
    exs = [e['vi'] for e in x.get('ex', []) if e.get('vi')]
    hit = [e for e in exs if any(re.search(r, clean(e), re.I) for r in it['re'])]
    it['selftest'] = f"{len(hit)}/{len(exs)}"
    if exs and len(hit) < max(1, len(exs) // 2): bad.append((it['id'], it['t'][:40], it['selftest'], [e for e in exs if e not in hit][:2]))
print(f"문형 {len(items)} · 규칙 없는(늘 아는) {sum(1 for i in items if i['always'])} · 예문 검산 못 미침 {len(bad)}")
for b in bad: print('  ✗', *b)
def detect(s):
    s = clean(s); return [it['id'] for it in items if not it['always'] and any(re.search(r, s, re.I) for r in it['re'])]
# ② 메인 교재 과별 지도
RB = json.load(open(R / 'data/realbook.json', encoding='utf-8'))
strip = lambda t: re.sub(r'^[^:：]{1,24}[:：]\s*', '', t).strip()
ch_map = {}; first = {}
for b in RB['books']:
    for c in b['chapters']:
        sents = []
        for dl in c['dialogues']: sents += [strip(x) for x in str(dl['vi']).split(' / ')]
        for g in c['grammar']:
            sents += [m.strip() for m in re.findall(r'([A-ZĐÂĂÊÔƠƯ][^()]{6,}?[.?!])\s*\(', g.get('note_ko', '')) if viSent(m)]
        found = {}
        for s in sents:
            for k in detect(s): found.setdefault(k, s)
        key = f"{b['vol']}-{c['bai']}"
        ch_map[key] = {'title': c['title'], 'items': sorted(found, key=lambda k: (int(k.split('.')[0]), int(k.split('.')[1]))), 'ex': found}
        for k in found:
            if k not in first: first[k] = key
for it in items: it['first'] = first.get(it['id'])
for c in RB['books'][0]['chapters'] + RB['books'][1]['chapters']: pass
for key, v in ch_map.items():
    b = RB['books'][int(key.split('-')[0]) - 1]; c = next(x for x in b['chapters'] if str(x['bai']) == key.split('-')[1])
    v['title_ko'] = c.get('title_ko', '')
# ②-2 사이드 교재 1권 (data/_gybm_src/sub_v1_bai*.json — 대화·문법 상자 예문을 규칙으로)
import glob
for f in sorted(glob.glob(str(R / 'data/_gybm_src/sub_v1_bai*.json')), key=lambda x: int(x.split('bai')[1].split('.')[0])):
    d = json.load(open(f, encoding='utf-8'))
    sents = []
    for dl in d.get('dialogues', []): sents += [strip(x) for x in str(dl['vi']).split('\n') if x.strip()]
    for g in d.get('grammar', []): sents += [m.strip() for m in re.findall(r'([A-ZĐÂĂÊÔƠƯ][^()]{5,}?[.?!])', g.get('note_ko', '')) if viSent(m)]
    found = {}
    for s0 in sents:
        for k in detect(s0): found.setdefault(k, s0)
    ch_map[f"s1-{d['bai']}"] = {'title': d['title'], 'title_ko': d.get('title_ko', ''), 'items': sorted(found, key=lambda k: (int(k.split('.')[0]), int(k.split('.')[1]))), 'ex': found}
# ②-3 사이드 2~4권·줌 — 46과로 합치기 전 원본 책(_보관 grammar_before_flat.json)의 과별 문형 제목을 지금 번호로
OB = json.load(open(pathlib.Path.home() / '짜오짜오/_보관/베트남어-어플_정리_20261003/scratchpad/grammar_before_flat.json', encoding='utf-8'))
t2id = {}
for it in items:
    x = G['books'][0]['bai'][it['li']]['g'][it['gi']]
    t2id.setdefault(x['t'], it['id'])
    for m in x.get('merged', []): t2id.setdefault(m, it['id'])
ZOOM_NO = [1, 2, 3, 4, 5, 6, 9, 10]
for bi, pre in ((0, 's2'), (1, 's3'), (2, 's4'), (5, 'z')):
    for li, l in enumerate(OB['books'][bi]['bai']):
        ids = [t2id[x['t']] for x in l['g'] if x['t'] in t2id]
        no = ZOOM_NO[li] if pre == 'z' else li + 1
        ch_map[f"{pre}-{no}"] = {'title': '', 'title_ko': l.get('t', ''), 'items': sorted(set(ids), key=lambda k: (int(k.split('.')[0]), int(k.split('.')[1]))), 'ex': {}}
# 수업에서 가르치나 교재 대화 글에는 그 과에 없는 문형 — 손으로 더함 (대표님 2026-10-08: "sắp … chưa? 도 7과에서 배우는 중, 시험에 나옴")
FORCE = {'1-7': ['10.6']}
# 교재 문법 상자(tools/gram_audit/교재_문법목록.tsv 97항목) → 앱 문형 — 눈으로 맞춘 것 (2026-10-13, 대표님 "각 챕터에서 어떤 문법을 배우는지 파악한 자료에도 들어 있니? 파악 왜 이렇게 못 하니").
# 규칙(낱말 모양)만으로 만든 지도는 'Rất vui được gặp'(1과)의 được 을 '할 수 있다'로, 'chuẩn bị'(9과)의 bị 를 '당하다'로 세었다 —
# 그래서 과마다 'box'(그 과 문법 상자에서 배우는 문형)를 따로 두고, 상자 문형은 반드시 그 과 items 에 들어가게 한다. 헷갈리는 짝을 가르는 구별 카드도 같이 넣는다.
BOX = {
 '1-1': ['3.0', '3.1', '5.3', '5.0', '4.2', '4.6'], '1-2': ['3.2', '3.3', '5.2', '5.5', '4.7', '4.4'],
 '1-3': ['3.4', '17.0', '8.0', '9.3', '6.2', '6.0', '28.0', '10.1'], '1-4': ['10.0', '10.3', '12.0', '12.1', '12.3', '5.3', '8.0', '8.1'],
 '1-5': ['3.5', '10.2', '10.3', '12.2', '12.3', '29.0', '6.1', '6.2', '38.0'], '1-6': ['12.3', '10.3', '5.3', '8.0', '9.3', '6.1', '5.7'], '1-7': ['10.4', '10.6', '12.4', '12.6', '6.3', '20.2'],
 '1-8': ['19.2', '19.3', '19.5', '19.6', '13.4', '13.5', '15.1', '10.5', '21.0', '22.0', '22.1'], '1-9': ['15.0', '15.1', '11.1', '38.0', '38.3', '11.0'],
 '1-10': ['27.0', '27.7', '25.0', '25.1', '12.5', '12.6', '38.1', '38.3'], '1-11': ['28.1', '28.4', '31.0', '39.0'], '1-12': ['22.1', '38.3', '12.6', '15.1', '17.6', '31.0', '11.0', '11.1', '39.0'],
 '2-1': ['5.1', '11.2', '34.0', '34.1'], '2-2': ['17.4', '17.3', '28.4', '4.8', '33.0', '43.4'], '2-3': ['9.0', '39.0', '35.0', '35.1', '34.3', '38.6', '28.1'],
 '2-4': ['47.0', '47.1', '36.0', '36.1', '36.2', '28.0', '15.2'], '2-5': ['41.0', '40.1', '40.0'], '2-7': ['9.2', '9.1', '9.3', '21.4', '42.0'],
 '2-8': ['9.5', '34.5', '34.6', '43.2', '19.6'], '2-9': ['21.1', '37.1', '34.4'], '2-10': ['15.3', '37.0', '28.1', '11.4', '21.3', '32.0', '24.4', '27.1'],
 '2-11': ['41.1', '6.4', '47.2', '27.3', '16.3'],
}
for _k, _ids in BOX.items(): FORCE[_k] = list(dict.fromkeys(FORCE.get(_k, []) + _ids))
_ids_all = {it['id'] for it in items}
_bad = [(k, i) for k, v in BOX.items() for i in v if i not in _ids_all]
if _bad: raise SystemExit(f'BOX 에 없는 문형 번호: {_bad}')
for _k, _ids in FORCE.items():
    _v = ch_map.get(_k)
    if _v: _v['items'] = sorted(set(_v['items']) | set(_ids), key=lambda k: (int(k.split('.')[0]), int(k.split('.')[1])))
    if _v and _k in BOX: _v['box'] = BOX[_k]
# 책마다 '이 과에서 처음 나오는 문형'
BOOKS = [('1', 12), ('2', 12), ('s1', 7), ('s2', 10), ('s3', 10), ('s4', 10), ('z', None)]
for pre, n in BOOKS:
    seen_b = set()
    nos = ZOOM_NO if pre == 'z' else range(1, n + 1)
    for no in nos:
        v = ch_map.get(f"{pre}-{no}")
        if not v: continue
        v['first'] = [k for k in v['items'] if k not in seen_b]; seen_b.update(v['items'])
# 상자 문형의 '처음 나오는 과'는 대화에 같은 글자가 먼저 나와도 상자가 있는 과로 (예: 1과 Rất vui được gặp 은 '할 수 있다'가 아님)
for pre in ('1', '2'):
    boxed = {}
    for no in range(1, 13):
        for k in BOX.get(f'{pre}-{no}', []): boxed.setdefault(k, f'{pre}-{no}')
    seen_b = set()
    for no in range(1, 13):
        key = f'{pre}-{no}'; v = ch_map.get(key)
        if not v: continue
        v['first'] = [k for k in v['items'] if k not in seen_b and boxed.get(k, key) == key]
        seen_b.update(k for k in v['items'] if boxed.get(k, key) == key or int(boxed[k].split('-')[1]) < no)
    if pre == '1':
        for it in items:
            if it['id'] in boxed: it['first'] = boxed[it['id']]
# ③ 기능어 가운데 어느 규칙에도 안 잡히는 것
FUNC = ['và', 'nhưng', 'rồi', 'ơi', 'này', 'ấy', 'kia', 'ở', 'thì', 'nữa', 'dạ', 'vâng', 'ừ', 'lúc', 'khi', 'với', 'cho', 'để', 'đâu', 'được', 'rồi', 'hả', 'nhé', 'ạ', 'à', 'thật', 'luôn', 'nhiều', 'ít', 'lắm', 'hay', 'sao', 'vì', 'nên', 'mà', 'còn', 'cũng', 'đều', 'vẫn', 'đang', 'đã', 'sẽ', 'sắp', 'mới', 'vừa', 'chưa', 'xong', 'hơi', 'khá', 'quá', 'rất', 'không', 'chẳng', 'chả', 'có', 'là', 'của', 'bằng', 'từ', 'đến', 'về', 'ra', 'vào', 'lên', 'xuống', 'trên', 'dưới', 'trong', 'ngoài', 'trước', 'sau', 'giữa', 'gần', 'xa', 'bên', 'cạnh', 'đối+diện', 'nếu', 'hãy', 'đừng', 'xin', 'mời', 'cứ', 'phải', 'cần', 'muốn', 'thích', 'biết', 'có+thể', 'định', 'bị', 'hết', 'lại', 'thêm', 'ngay', 'luôn', 'thôi', 'chỉ', 'mỗi', 'mọi', 'tất+cả', 'cả', 'những', 'các', 'mấy', 'bao+nhiêu', 'bao+giờ', 'bao+lâu', 'thế+nào', 'nào', 'gì', 'ai', 'tại+sao', 'vì+sao', 'ở+đâu', 'đấy', 'chứ', 'nhỉ', 'cơ', 'đi', 'nha', 'nhá', 'thế', 'vậy', 'như+vậy', 'như+thế', 'thế+này', 'kìa', 'ơ', 'ồ', 'ôi', 'trời+ơi', 'hình+như', 'chắc', 'có+lẽ', 'chắc+chắn', 'tất+nhiên', 'dĩ+nhiên', 'đúng', 'sai', 'không+sao', 'được+rồi', 'thôi+được', 'càng', 'hơn', 'nhất', 'bằng', 'như', 'giống', 'khác', 'cùng', 'nhau', 'tự', 'giúp', 'nhờ', 'kẻo', 'thử', 'xem', 'coi', 'lần', 'nữa']
seen = {}
for b in RB['books']:
    for c in b['chapters']:
        for dl in c['dialogues']:
            for s in [strip(x) for x in str(dl['vi']).split(' / ')]:
                ids = set(detect(s)); cs = clean(s)
                for f in FUNC:
                    if re.search(f'(?<![{L}]){f.replace("+", chr(92)+"s+")}(?![{L}])', cs):
                        key = f"{b['vol']}-{c['bai']}"
                        seen.setdefault(f, {'n': 0, 'first': key, 'covered': 0, 'ex': s})
                        seen[f]['n'] += 1
                        if ids: seen[f]['covered'] += 1
# 어떤 문형 규칙에 그 기능어 자체가 들어 있나
def in_rules(f):
    w = f.replace('+', ' ')
    return any(re.search(r'(?<![A-Za-zÀ-ỹĐđ|(])' + re.escape(w) + r'(?![A-Za-zÀ-ỹĐđ|)])', r.replace('\\s+', ' ')) for it in items for r in it['re'])
missing = [(f, v['n'], v['first'], v['ex']) for f, v in seen.items() if not in_rules(f)]
missing.sort(key=lambda x: -x[1])
print('\n규칙에 없는 기능어(교재 대화에 나온 횟수 · 처음 과 · 보기):')
for m in missing: print('  ', m[0], m[1], m[2], '|', m[3][:70])
json.dump({'note': '문법 문형 알아보기 규칙(tools/gram_tok/규칙.tsv → build.py). re: 정규식(소문자 문장에 i 플래그), always: 글자·소리처럼 늘 아는 것, first: 메인 교재에서 처음 나오는 권-과', 'items': items}, open(R / 'data/_gram_tok.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump({'note': '교재 과 → 앱 문형(id = 과.번). 열쇠: 1-N·2-N 메인 1·2권(대화·문법 상자 예문을 규칙으로 찾음) · s1-N 사이드 1권 Cơ sở 1(같은 방법) · s2/s3/s4-N 사이드 2~4권 = Cơ sở 2·Nâng cao 1·2(원본 책의 과별 문형) · z-N 줌 N강. first = 그 책에서 처음 나오는 문형 (tools/gram_tok/build.py)', 'books': [['1', '메인 교재 1권'], ['2', '메인 교재 2권'], ['s1', '사이드 1권 — Tiếng Việt Cơ sở 1'], ['s2', '사이드 2권 — Tiếng Việt Cơ sở 2'], ['s3', '사이드 3권 — Nâng cao 1'], ['s4', '사이드 4권 — Nâng cao 2'], ['z', '줌 수업']], 'chapters': ch_map}, open(R / 'data/_gram_ch.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('\n과별 문형 수:', {k: len(v['items']) for k, v in ch_map.items()})
