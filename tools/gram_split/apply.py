# -*- coding: utf-8 -*-
"""문법 33과 쪼개기 · 19과 muốn 을 23과로 (2026-10-07, 대표님 "문법 33과 쪼개기·18과 muốn 합치기 ㄱㄱ" — 보조 검증 보고 B·C의 제안).
- 33과 비교: hơn·thích…hơn·như·nhất·giống/khác·bằng(기초, 핵심패턴 233 059~061·131·148~151, GO 16·착 11·한번 13)은 33과에 남기고
  càng…càng·ngày càng·형용사+ra/đi/lên/lại·trở thành/trở nên(233 135~136·141~142 — PART3)은 새 47과 '갈수록·~해지다' 로 → 4단계.
- 19과(할 줄 안다·할 수 있다)의 19.0 S + muốn + V 는 과 제목과 안 맞고 23과(원하다·하려 하다·해 보다·습관)가 자리라 23과 맨 앞으로.
문형 번호(과.번)가 바뀌므로 tools/gram_tok/규칙.tsv 의 번호를 같이 바꾸고 build.py 로 _gram_tok·_gram_ch 를 다시 짓는다. 진도 열쇠는 과 단위(H과)라 그대로."""
import json, pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent.parent
P = R / 'data/grammar.json'
G = json.loads(P.read_text(encoding='utf-8')); B = G['books'][0]['bai']
assert len(B) == 46, len(B)
idmap = {}
# ① 19.0 muốn → 23.0
L19, L23 = B[18], B[22]
assert L19['g'][0]['t'].startswith('S + muốn'), L19['g'][0]['t']
muon = L19['g'].pop(0)
for i in range(len(L19['g'])): idmap[f'19.{i + 1}'] = f'19.{i}'
for i in range(len(L23['g'])): idmap[f'23.{i}'] = f'23.{i + 1}'
L23['g'].insert(0, muon); idmap['19.0'] = '23.0'
# ② 33과 쪼개기
L33 = B[32]
keep, move = [0, 1, 2, 7, 8, 9], [3, 4, 5, 6]
assert L33['g'][3]['t'].startswith('càng') and L33['g'][7]['t'].startswith('nhất'), (L33['g'][3]['t'], L33['g'][7]['t'])
g_keep = [L33['g'][i] for i in keep]; g_move = [L33['g'][i] for i in move]
for new_i, old_i in enumerate(keep): idmap[f'33.{old_i}'] = f'33.{new_i}'
for new_i, old_i in enumerate(move): idmap[f'33.{old_i}'] = f'47.{new_i}'
L33['g'] = g_keep; L33['t'] = '비교 — 더·가장·~처럼·~만큼'
B.append({'no': 47, 'src': list(L33.get('src', [])), 't': '갈수록·~해지다 — 비교 더 알기', 'g': g_move})
idmap = {k: v for k, v in idmap.items() if k != v}
P.write_text(json.dumps(G, ensure_ascii=False, indent=1), encoding='utf-8')
print('과', len(B), '| 19과', len(L19['g']), '| 23과', len(L23['g']), '| 33과', len(L33['g']), '| 47과', len(B[46]['g']), '| 바뀐 번호', len(idmap))
# ③ 규칙.tsv 번호 바꾸기 (첫 칸만)
tp = R / 'tools/gram_tok/규칙.tsv'; lines = tp.read_text(encoding='utf-8').split('\n'); n = 0
for i, l in enumerate(lines):
    if not l or l.startswith('#'): continue
    k, _, rest = l.partition('\t')
    if k in idmap: lines[i] = idmap[k] + '\t' + rest; n += 1
tp.write_text('\n'.join(lines), encoding='utf-8'); print('규칙.tsv 번호 바꿈', n)
json.dump(idmap, open(R / 'tools/gram_split/idmap.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
