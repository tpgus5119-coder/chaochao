# -*- coding: utf-8 -*-
"""문법 11과·27과 안 차례를 뜻 순서로 다시 매김 (2026-10-13 밤, 대표님 "ㄱㄱ" — 최종 점검에서 과 끝에 붙은 카드가 뜻 순서를 거스르던 두 과).
  11과: đã…chưa → rồi → xong → bao giờ chưa → lần → lâu → V đã!   (전: đã…chưa, xong, bao giờ chưa, lâu, V đã!, rồi, lần)
  27과: và → nhưng → hay/hoặc → còn(대조) → còn(아직) → Thế còn → A thì…còn B thì → Thế thì → mà → 글 잇는 말   (전: còn, còn, mà, A thì, Thế còn, Thế thì, hay, và, nhưng, 글 잇는 말)
문형 번호(과.번)가 바뀌므로 함께 고친다: 규칙.tsv 첫 칸 · build.py BOX · 교재_문법_세부.tsv 넷째 칸 · gram_detail/d_*.json 의 at(li.gi). 그다음 build.py 와 gram_detail/apply.py 를 돌린다(제목 대조로 검산).
진도 열쇠는 과 단위(H과)라 그대로. 쓰기: python3 tools/gram_reorder/apply.py"""
import json, pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent.parent
P = R / 'data/grammar.json'; G = json.loads(P.read_text(encoding='utf-8')); B = G['books'][0]['bai']
# 과 번호 → 새 차례(옛 gi 목록). 제목 앞머리로 검산
NEW = {11: ([0, 5, 1, 2, 6, 3, 4], ['đã … chưa', 'rồi', '동사 + xong', '(đã) … bao giờ', 'lần', 'lâu', 'V đã!']),
       27: ([7, 8, 6, 0, 1, 4, 3, 5, 2, 9], ['và', 'nhưng', 'hay / hoặc', 'còn — 그런데', 'còn — 아직', 'Thế còn', 'A thì', 'Thế thì', 'mà', 'tuy nhiên'])}
idmap = {}
for no, (order, heads) in NEW.items():
    L = B[no - 1]; assert L['no'] == no and sorted(order) == list(range(len(L['g']))), no
    new = [L['g'][i] for i in order]
    for g, h in zip(new, heads): assert g['t'].startswith(h), (no, g['t'], h)
    for new_i, old_i in enumerate(order):
        if new_i != old_i: idmap[f'{no}.{old_i}'] = f'{no}.{new_i}'
    L['g'] = new
P.write_text(json.dumps(G, ensure_ascii=False, indent=1), encoding='utf-8')
json.dump(idmap, open(R / 'tools/gram_reorder/idmap.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('바뀐 번호', len(idmap), idmap)
# ① 규칙.tsv 첫 칸
tp = R / 'tools/gram_tok/규칙.tsv'; lines = tp.read_text(encoding='utf-8').split('\n'); n = 0
for i, l in enumerate(lines):
    if not l or l.startswith('#'): continue
    k, _, rest = l.partition('\t')
    if k in idmap: lines[i] = idmap[k] + '\t' + rest; n += 1
tp.write_text('\n'.join(lines), encoding='utf-8'); print('규칙.tsv', n)
# ② build.py BOX ('11.1' 꼴 문자열) · ③ 교재_문법_세부.tsv 넷째 칸 · ④ d_*.json at(li.gi)
def sub_ids(text, quote):
    cnt = 0
    def f(m):
        nonlocal cnt; k = m.group(1)
        if k in idmap: cnt += 1; return quote + idmap[k] + quote
        return m.group(0)
    return re.sub(re.escape(quote) + r'(\d+\.\d+)' + re.escape(quote), f, text), cnt
bp = R / 'tools/gram_tok/build.py'; s = bp.read_text(encoding='utf-8'); a = s.index('BOX = {'); b = s.index('\n}\n', a) + 3
mid, c = sub_ids(s[a:b], "'"); bp.write_text(s[:a] + mid + s[b:], encoding='utf-8'); print('build.py BOX', c)
sp = R / 'tools/gram_audit/교재_문법_세부.tsv'; rows = sp.read_text(encoding='utf-8').split('\n'); c = 0
for i, l in enumerate(rows):
    if not l or l.startswith('#'): continue
    cols = l.split('\t')
    if len(cols) > 3:
        new = re.sub(r'\d+\.\d+', lambda m: idmap.get(m.group(0), m.group(0)), cols[3])
        if new != cols[3]: cols[3] = new; rows[i] = '\t'.join(cols); c += 1
sp.write_text('\n'.join(rows), encoding='utf-8'); print('세부.tsv', c)
limap = {f'{int(k.split(".")[0]) - 1}.{k.split(".")[1]}': f'{int(v.split(".")[0]) - 1}.{v.split(".")[1]}' for k, v in idmap.items()}
c = 0
for f in sorted((R / 'tools/gram_detail').glob('d_*.json')):
    D = json.loads(f.read_text(encoding='utf-8')); ch = False
    for e in D:
        if e['at'] in limap: e['at'] = limap[e['at']]; ch = True; c += 1
    if ch: D.sort(key=lambda e: (int(e['at'].split('.')[0]), int(e['at'].split('.')[1]))); f.write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8')
print('d_*.json at', c)
