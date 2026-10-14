#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""8과 '능력' 셋 — 19.2 동사+được · 19.3 được không? · 19.5 được·có thể·biết 구별 — 에 교재 1권 8과 문법 상자의 정의 한 줄과 교재 예문을 더한다
(2026-10-14 대표님 "biết 과 được, được không 은 능력에 대한 거라는데 맞니? 문법에 들어 있니? 챕터 8에서 배우는 중").
→ 맞고, 이미 들어 있었다: 셋 다 8과 상자(BOX '1-8': 19.2·19.3·19.5·19.6). 교재 8과 상자는 'được: 동사 뒤에서 가능성·능력 / 능력을 묻는 물음은 được không' 이고
   biết 은 상자 밖(8과 연습·대화 — biết nói tiếng Nga · biết tiếng Anh và tiếng Đức · biết mấy ngoại ngữ)에서 '할 줄 알다'로 쓰인다. 그 예문을 카드에 넣는다.
쓰기: python3 tools/gram_audit/add_duoc_biet.py → 새 예문 tools/gram_audit/_new_ex_duoc_biet.json (소리: python3 tools/gen_audio_list.py 그 파일)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); B = G['books'][0]['bai']; new_all = []
def add(li, gi, head, note, exs):
    g = B[li]['g'][gi]; assert g['t'].startswith(head), g['t']
    if '교재 1권 8과' not in g['b']: g['b'] += ' ' + note
    have = {e['vi'] for e in g['ex']}; add_ = [e for e in exs if e['vi'] not in have]; g['ex'] += add_; new_all.extend(e['vi'] for e in add_)
    print(f'{li+1}.{gi} 예문 +{len(add_)} → {len(g["ex"])}')
add(18, 2, 'được / có thể', '교재 1권 8과 문법 상자(động từ được): 동사 뒤에 두어 그 일을 할 가능성·능력을 나타낸다 — 주어 + 동사 + (목적어) + được. 8과에서 배우는 것은 이 동사 뒤 được 이다.',
    [EX('Cô ấy nói được tiếng Anh.', '그녀는 영어를 할 수 있어요.'), EX('Anh Brian không nói được tiếng Hàn.', '브라이언 씨는 한국어를 못 해요.')])
add(18, 3, '(Có) … được không?', '교재 1권 8과 문법 상자: 어떤 일을 할 수 있는지(능력) 물을 때 동사 + được không? 을 쓴다 — 대답은 Được / Không được.',
    [EX('Em nói tiếng Pháp được không?', '너 프랑스어 할 수 있어?'), EX('Chị ấy nấu món ăn Ấn Độ được không?', '그녀는 인도 음식을 만들 수 있어요?')])
add(18, 5, 'được · có thể · biết', '교재 1권 8과: 상자에는 동사 뒤 được(능력)만 있고, biết 은 8과 연습·대화에서 "biết + 동사 / biết + 언어" 꼴로 "할 줄 알다"에 쓰인다(Các anh ấy biết nói tiếng Nga · Ông ấy biết tiếng Anh và tiếng Đức · Chị biết mấy ngoại ngữ?). biết 뒤에 바로 언어 이름이 와도 된다.',
    [EX('Các anh ấy biết nói tiếng Nga.', '그분들은 러시아어를 할 줄 알아요.'), EX('Ông ấy biết tiếng Anh và tiếng Đức.', '그분은 영어와 독일어를 할 줄 알아요.'), EX('Chị biết mấy ngoại ngữ?', '외국어를 몇 개 할 줄 알아요?')])
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
(R / 'tools/gram_audit/_new_ex_duoc_biet.json').write_text(json.dumps(new_all, ensure_ascii=False), encoding='utf-8'); print('새 예문', len(new_all))
