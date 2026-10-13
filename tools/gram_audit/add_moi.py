#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""10.5 「vừa / mới / vừa mới — 방금」 카드에 교재 1권 8과 문법 상자(phó từ mới)의 예문 둘을 더하고, 8과 상자에서 35.5(때 + mới '그제야')를 뺀다
(2026-10-13 밤, 대표님 "챕터 8에서 mới 문법도 배우는 중 — have just done something, 주어+mới+동사+(목적어). 이미 들어 있니?").
→ 이미 있었다: 10.5 가 BOX '1-8' 에 들어 있고 교재 예문 'Nó mới khóc.'·'Em mới học tiếng Việt một tháng.' 이 있었다.
   교재 8과 예문 넷 중 나머지 둘(Hôm qua tôi mới đi uống cà phê với anh Dũng. / Chị ấy mới làm phiên dịch ở công ty này.)을 더한다.
   35.5(때 + mới = 그제야)는 교재 8과가 가르치는 뜻이 아니라 상자에서 뺀다(tools/gram_tok/build.py BOX) — 지도에서는 규칙이 잡는 곳(상자 밖)에만 남는다.
쓰기: python3 tools/gram_audit/add_moi.py → 새 예문 tools/gram_audit/_new_ex_moi.json (소리: python3 tools/gen_audio_list.py 그 파일) → python3 tools/gram_tok/build.py"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); g = G['books'][0]['bai'][9]['g'][5]
assert g['t'].startswith('vừa / mới'), g['t']
new = [EX('Hôm qua tôi mới đi uống cà phê với anh Dũng.', '어제 저는 중 씨와 커피를 마시러 갔어요(얼마 안 됐어요).'),
       EX('Chị ấy mới làm phiên dịch ở công ty này.', '그녀는 이 회사에서 통역 일을 시작한 지 얼마 안 됐어요.')]
have = {e['vi'] for e in g['ex']}; add = [e for e in new if e['vi'] not in have]; g['ex'] += add
if '교재 1권 8과' not in g['b']:
    g['b'] += ' 교재 1권 8과 문법 상자(phó từ mới): 기준 시점보다 얼마 안 된 때에 일어난 일·상태를 말할 때 동사 앞에 둔다 — 주어 + mới + 동사 + (목적어).'
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
(R / 'tools/gram_audit/_new_ex_moi.json').write_text(json.dumps([e['vi'] for e in new], ensure_ascii=False), encoding='utf-8')
p = R / 'tools/gram_tok/build.py'; s = p.read_text(encoding='utf-8')
old = "'1-8': ['19.2', '19.3', '19.5', '19.6', '13.4', '13.5', '15.1', '10.5', '35.5', '21.0', '22.0', '22.1']"
if old in s:
    s = s.replace(old, "'1-8': ['19.2', '19.3', '19.5', '19.6', '13.4', '13.5', '15.1', '10.5', '21.0', '22.0', '22.1']")   # 35.5(때+mới 그제야)는 8과 상자가 아님 (2026-10-13 add_moi.py)
    p.write_text(s, encoding='utf-8'); print('BOX 1-8 에서 35.5 뺌')
print('10.5 예문 더함', len(add), '→ 전체', len(g['ex']))
