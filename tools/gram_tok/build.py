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
        if l['no'] in (1, 2, 3, 7, 13, 14, 16, 46): toks = []   # 인사·호칭·숫자·시각·날짜·옷·카페 말은 낱말 목록이라 문법 빈칸으로 안 뚫는다 ('Xin chào!' 빈칸이 나왔다)
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
            sents += [m.strip() for m in re.findall(r'([A-ZĐÂĂÊÔƠƯ][^()]{6,}?[.?!])\s*\(', g.get('note_ko', ''))]
        found = {}
        for s in sents:
            for k in detect(s): found.setdefault(k, s)
        key = f"{b['vol']}-{c['bai']}"
        ch_map[key] = {'title': c['title'], 'items': sorted(found, key=lambda k: (int(k.split('.')[0]), int(k.split('.')[1]))), 'ex': found}
        for k in found:
            if k not in first: first[k] = key
for it in items: it['first'] = first.get(it['id'])
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
json.dump({'note': '메인 교재 권-과 → 그 과의 대화·문법 상자 예문에 나오는 앱 문형(id = 과.번) (tools/gram_tok/build.py)', 'chapters': ch_map}, open(R / 'data/_gram_ch.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('\n과별 문형 수:', {k: len(v['items']) for k, v in ch_map.items()})
