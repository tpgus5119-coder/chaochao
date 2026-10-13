#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""19과(할 줄 안다·할 수 있다·해도 된다) 끝에 구별 문형 둘 (2026-10-13, 대표님 "được - có thể 의 차이와 không V được - không thể 의 차이 등도 어플에 잘 나와 있니? 이런 차이들을 모두 잘 설명해 줘야 한다. 지금 8단원에서 배우는 중").
교재 1권 8과 문법 상자 'Được'(가능)을 배울 때 같이 헷갈리는 것: biết(할 줄 앎) · có thể(할 수 있다/~일 수도 있다) · không V được(못 한다) · không thể(할 수 없다, 딱딱) · không được V(하면 안 된다).
과 **맨 끝**에 붙인다(19.5 · 19.6 — 앞 번호가 밀리지 않게). 쓰기: python3 tools/gram_audit/add4.py → 새 예문 tools/gram_audit/_new_ex4.json (소리: python3 tools/gen_audio_list.py tools/gram_audit/_new_ex4.json)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
LESSON = '할 줄 안다·할 수 있다·해도 된다'
NEW = [
 {'t': 'được · có thể · biết — 구별', 'k': 'biết + 동사  ·  동사 + được  ·  có thể + 동사',
  'b': '셋 다 우리말로는 "할 수 있다"지만 까닭이 다릅니다. <b>biết</b>는 배워서 <b>할 줄 아는</b> 것(수영·운전·외국어), 동사 뒤 <b>được</b>는 지금 그 일을 <b>해낼 수 있는</b> 것(능력·몸 상태·상황 — 말할 때 가장 흔함), 동사 앞 <b>có thể</b>는 "할 수 있다"에 더해 <b>"~일 수도 있다"(추측)</b>까지 씁니다. 그래서 "내일 비가 올 수도 있다"는 có thể 로만 말합니다. có thể 와 được 는 한 문장에 같이 써도 됩니다(có thể … được).',
  'ex': [EX('Tôi biết bơi.', '저는 수영할 줄 알아요.'),
         EX('Hôm nay tôi bị ốm nên không bơi được.', '오늘은 아파서 수영을 못 해요.'),
         EX('Chị ấy nói được ba thứ tiếng.', '그녀는 세 나라 말을 할 수 있어요.'),
         EX('Tôi có thể đến lúc bảy giờ.', '저는 7시에 갈 수 있어요.'),
         EX('Ngày mai có thể mưa.', '내일 비가 올 수도 있어요.'),
         EX('Anh có thể nói chậm một chút được không?', '조금 천천히 말해 주실 수 있어요?')],
  'kw': [['biết', '할 줄 알다'], ['được', '할 수 있다 (동사 뒤)'], ['có thể', '할 수 있다 · ~일 수도 있다'], ['bơi', '수영하다'], ['bị ốm', '아프다'], ['mưa', '비가 오다']],
  'tip': '배운 기술 = biết · 지금 해낼 수 있나 = được · 일어날 수도 있나 = có thể.'},
 {'t': 'không V được · không thể V · không được V — 구별', 'k': 'không + 동사 + được  ·  không thể + 동사  (못 한다)  /  không được + 동사  (하면 안 된다)',
  'b': '셋 다 không 과 được·thể 가 들어가 비슷해 보이지만 뜻은 둘로 갈립니다. <b>못 한다(할 수 없다)</b>는 <b>không + 동사 + được</b>(입말에서 가장 흔함, 입말에서는 동사 + không được 도) 또는 <b>không thể + 동사</b>(조금 딱딱하고 "도저히 ~할 수 없다"처럼 강함). 그런데 được 이 동사 <b>앞</b>에 와서 <b>không được + 동사</b>가 되면 <b>"~하면 안 된다"(금지·규칙)</b>입니다. được 자리 하나로 "못 한다"와 "하면 안 된다"가 갈립니다.',
  'ex': [EX('Tôi không ngủ được.', '저는 잠을 못 자요.'),
         EX('Tôi không ăn cay được.', '저는 매운 걸 못 먹어요.'),
         EX('Tôi không thể đến đúng giờ.', '저는 제시간에 갈 수 없어요.'),
         EX('Ở đây không được hút thuốc.', '여기서는 담배를 피우면 안 돼요.'),
         EX('Em không được nói dối.', '너 거짓말하면 안 돼.'),
         EX('Tôi chưa nói được tiếng Việt.', '저는 아직 베트남어를 못 해요.')],
  'kw': [['không … được', '못 하다'], ['không thể', '할 수 없다'], ['không được + 동사', '~하면 안 된다'], ['ngủ', '자다'], ['ăn cay', '매운 것을 먹다'], ['đúng giờ', '제시간에'], ['hút thuốc', '담배를 피우다'], ['nói dối', '거짓말하다']],
  'tip': 'được 이 동사 뒤 = 못 한다 · 동사 앞 = 하면 안 된다.'},
]
# 19.2 본문도 — "부정은 không + 동사 + được 또는 không thể + 동사, 둘 다 ~할 수 없다" 한 줄뿐이던 것을 고침
B19_2 = ('<b>có thể</b>는 동사 앞에, <b>được</b>는 동사 뒤에 씁니다(둘을 함께 써도 됩니다: có thể làm được). 입말에서는 동사 + được 이 가장 흔하고, '
         'có thể 는 조금 격식 있는 말이면서 <b>"~일 수도 있다"(추측)</b>에도 씁니다(Ngày mai có thể mưa). '
         '<b>못 한다</b>는 <b>không + 동사 + được</b>(입말) 또는 <b>không thể + 동사</b>(딱딱하고 강함). '
         '그런데 <b>không được + 동사</b>처럼 được 이 동사 <b>앞</b>에 오면 <b>"~하면 안 된다"(금지)</b>로 뜻이 바뀝니다. '
         '배워서 할 줄 아는 것은 biết(19과 첫 항목). 셋의 차이는 이 과 끝 구별 카드 둘에 모아 두었습니다.')
TIP19_2 = 'có thể 는 동사 앞, được 는 동사 뒤! · 못 한다 = không + 동사 + được · 하면 안 된다 = không được + 동사.'
def main():
    G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); book = G['books'][0]; new_ex = []
    l = next(x for x in book['bai'] if x['t'] == LESSON)
    g2 = next(g for g in l['g'] if g['t'] == 'được / có thể — 할 수 있다'); g2['b'] = B19_2; g2['tip'] = TIP19_2
    for it in NEW:
        new_ex += [e['vi'] for e in it['ex']]
        if any(g['t'] == it['t'] for g in l['g']): print('이미 있음', it['t']); continue
        l['g'].append(it); print('넣음', f"{l['no']}.{len(l['g'])-1}", it['t'])
    json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(new_ex, open(R / 'tools/gram_audit/_new_ex4.json', 'w', encoding='utf-8'), ensure_ascii=False)
if __name__ == '__main__':
    main()
