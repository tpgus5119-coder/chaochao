#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""giúp/hộ/giùm 두 어순 (2026-10-13 밤, 대표님 "S1 + V + (O) + giúp + S2 / S1 + V + giúp + S2 + (O) — 8과에서 배우는 중, 문법 지도에 있니? 앱에 있니?").
앱 카드 24.3 은 어순 하나(동사 + giúp + 사람)만 적고 있었고, 교재 1권 8과 대화(Anh xem giùm tôi được không?)가 있는데 과별 지도 1-8 에는 없었다.
→ ① 24.3 짜임·본문·예문·자세히에 두 어순을 적음 ② build.py FORCE['1-8'] 에 24.3(수업에서 8과 때 배움 — sắp…chưa 처럼).
쓰기: python3 tools/gram_audit/add_giup.py → 새 예문 tools/gram_audit/_new_ex_giup.json (소리: python3 tools/gen_audio_list.py 그 파일)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); g = G['books'][0]['bai'][23]['g'][3]; assert g['t'].startswith('동사 + giúp')
g['k'] = '주어1 + 동사 + (목적어) + giúp/hộ/giùm + 주어2  ·  주어1 + 동사 + giúp/hộ/giùm + 주어2 + (목적어)'
g['b'] = ('남을 위해(남 대신) 해 줄 때, 특히 부탁할 때 씁니다. 한국어의 \'~해 주다\'입니다. <b>giúp</b>(가장 흔함) · <b>hộ</b>(북부) · <b>giùm</b>(남부, 교재 1권 8과 대화 "Anh xem giùm tôi được không?")은 뜻이 같습니다. '
          '어순은 둘 다 됩니다 — ① <b>주어1 + 동사 + (목적어) + giúp + 주어2</b>: Anh xem bài này giúp tôi. ② <b>주어1 + 동사 + giúp + 주어2 + (목적어)</b>: Anh xem giúp tôi bài này. '
          '목적어가 짧으면 ①, 길면 ②가 자연스럽습니다. 부탁이면 끝에 được không? · nhé · với 를 붙입니다.')
new = [EX('Anh xem giùm tôi được không?', '저 대신 좀 봐 줄 수 있어요?'), EX('Chị dịch giúp tôi câu này.', '이 문장 좀 번역해 주세요.'),
       EX('Em mua hộ chị một tờ báo nhé.', '신문 한 부 좀 사다 줘.'), EX('Anh viết tên giúp tôi.', '제 이름 좀 써 주세요.')]
have = {e['vi'] for e in g['ex']}; g['ex'] += [e for e in new if e['vi'] not in have]
g['kw'] = [['giúp', '돕다; ~해 주다'], ['hộ', '~해 주다(북부)'], ['giùm', '~해 주다(남부)'], ['xem', '보다'], ['dịch', '번역하다']]
g['tip'] = '동사 바로 뒤나 목적어 뒤 — giúp 뒤에는 도움을 받는 사람.'
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump([e['vi'] for e in new], open(R / 'tools/gram_audit/_new_ex_giup.json', 'w', encoding='utf-8'), ensure_ascii=False)
p = R / 'tools/gram_detail/d_07.json'; D = json.loads(p.read_text(encoding='utf-8'))
for e in D:
    if e['at'] == '23.3' and e['t'] == g['t']:
        e['pos'] = '두 어순 다 됨: 주어1 + 동사 + (목적어) + <b>giúp</b> + 주어2 (Anh xem bài này <b>giúp</b> tôi) / 주어1 + 동사 + <b>giúp</b> + 주어2 + (목적어) (Anh xem <b>giúp</b> tôi bài này). 목적어가 길면 뒤 꼴.'
        e['cmp'] = [["giúp", "가장 흔함: Anh xem <b>giúp</b> tôi(좀 봐 주세요)."], ["hộ", "북부: Chị cầm <b>hộ</b> em(좀 들어 주세요)."], ["giùm", "남부(교재 8과): Anh xem <b>giùm</b> tôi được không?"],
                    ["cho", "'~에게 해 주다'(24.1): Mẹ nấu cơm <b>cho</b> con ↔ Mẹ nấu <b>giúp</b> con(아이 대신 해 줌)."], ["giúp (동사)", "'돕다' 동사: Tôi <b>giúp</b> mẹ(엄마를 도와요) ↔ Tôi nấu <b>giúp</b> mẹ(엄마 대신 요리해요)."]]
        e['warn'] = '주어2(도움 받는 사람)는 giúp 바로 뒤에 둡니다: Anh xem tôi giúp (X) → Anh xem giúp tôi.'
p.write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8'); print('24.3 고침, 예문', len(g['ex']))
