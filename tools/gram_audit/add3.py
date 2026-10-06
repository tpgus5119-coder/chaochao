#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사이드 교재 1권(Tiếng Việt Cơ sở 1, data/_gybm_src/sub_v1_bai*.json)의 문법 상자 가운데 앱에 없던 것 넣기 (2026-10-06).
(기준.md 14-?? 에 '사이드 1권은 발음 책'이라 적었던 것은 틀렸다 — 발음은 Phần I(17~46쪽)이고 Bài 1~8(47~220쪽)에 문법 상자·대화가 있다.)
없던 것: 지시형용사(명사 + này/kia/đó/ấy) · S + là người + 형용사 · S + trông + 형용사 · ở/tại + 장소 · A + 형용사 + bằng + B. 예문·설명은 그 책의 문법 상자에서(권-과).
과 **맨 끝**에 붙인다(gram_tok 규칙이 과.번으로 가리킨다). 쓰기: python3 tools/gram_audit/add3.py → 새 예문 tools/gram_audit/_new_ex3.json"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
NEW = [
 ('~입니다 · 아닙니다 · ~도 · 이름 · 이것 · 있다', {'t': '명사 + này / kia / đó / ấy — 이 ~ · 저 ~ · 그 ~', 'k': '(단위명사 +) 명사 + này / kia / đó / ấy',
   'b': '"이 책, 저 책상"처럼 명사를 꾸밀 때는 명사 <b>뒤</b>에 <b>này</b>(이), <b>kia</b>(저 — 보이는 먼 것), <b>đó · ấy</b>(그)를 붙입니다. đây/đó/kia(여기·거기·저기, 이것·그것)와 달리 반드시 명사 뒤에 옵니다 — cái bút <b>này</b>(이 펜) · con bò <b>này</b>(이 소) · cái bàn <b>kia</b>(저 책상). 사이드 교재 1권 4과.',
   'ex': [EX('Cái bút này tốt.', '이 펜은 좋아요.'), EX('Con bò này to.', '이 소는 커요.'), EX('Cái bàn kia cũ.', '저 책상은 낡았어요.'), EX('Cái ghế ấy mới.', '그 의자는 새것이에요.')],
   'kw': [['này', '이 ~'], ['kia', '저 ~'], ['đó', '그 ~'], ['ấy', '그 ~']], 'tip': '한국어와 반대로 "펜 이" 차례 — 명사 다음에 này.'}),
 ('무슨 색? · \'보다\' 가려 쓰기', {'t': 'S + là người + 형용사 — ~한 사람이다', 'k': '주어 + là người + 형용사  ·  … là người thế nào?',
   'b': '사람의 성격·됨됨이를 말할 때는 <b>là người</b> + 형용사를 씁니다 — Chị ấy <b>là người</b> tốt(그녀는 좋은 사람이에요). 물을 때는 <b>… là người thế nào?</b>(어떤 사람이에요?). "là người + 나라"(어느 나라 사람)와 같은 틀입니다. 사이드 교재 1권 5과.',
   'ex': [EX('Chị ấy là người thế nào?', '그녀는 어떤 사람이에요?'), EX('Chị ấy là người tốt.', '그녀는 좋은 사람이에요.'), EX('Anh ấy là người vui tính.', '그는 재미있는 사람이에요.')],
   'kw': [['là người', '~한 사람이다'], ['tốt', '좋은, 착한'], ['vui tính', '유쾌한']], 'tip': '성격은 là người + 형용사, 겉모습은 trông + 형용사.'}),
 ('무슨 색? · \'보다\' 가려 쓰기', {'t': 'S + trông + 형용사 — ~해 보이다', 'k': '주어 + trông + 형용사  ·  Trông + 주어 + 형용사  ·  … trông thế nào?',
   'b': '겉모습을 보고 느낀 것을 말할 때 <b>trông</b>(~해 보이다)을 씁니다 — Anh ấy <b>trông</b> rất đẹp trai(그는 아주 잘생겨 보여요). trông을 문장 맨 앞에 두어도 됩니다(Trông cô ấy rất buồn). 물을 때는 <b>… trông thế nào?</b>. 구어에서는 có vẻ(~인 듯하다)를 덧붙이기도 합니다. 사이드 교재 1권 5과.',
   'ex': [EX('Anh ấy trông thế nào?', '그는 어때 보여요?'), EX('Anh ấy trông rất đẹp trai.', '그는 아주 잘생겨 보여요.'), EX('Trông cô ấy rất buồn.', '그녀는 슬퍼 보여요.')],
   'kw': [['trông', '~해 보이다'], ['đẹp trai', '잘생긴'], ['buồn', '슬픈']], 'tip': 'trông 은 "보다"(16과 nhìn·trông)와 같은 말인데, 형용사 앞에 오면 "~해 보이다"가 됩니다.'}),
 ('어디·길 묻기·이동', {'t': 'ở · tại + 장소 — ~에(서)', 'k': '주어 + 동사 + ở / tại + 장소  ·  주어 + ở + 장소 (~에 있다)',
   'b': '<b>ở</b>와 <b>tại</b>은 "~에(서)"입니다 — Tôi sống <b>ở</b> Hà Nội(저는 하노이에 살아요) · Tôi dạy <b>tại</b> Khoa Tiếng Việt(저는 베트남어학과에서 가르쳐요). tại이 조금 더 격식 있는 말이고, ở는 동사로도 써서 "~에 있다"가 됩니다(Tôi <b>ở</b> đây). 사이드 교재 1권 7과.',
   'ex': [EX('Tôi sống ở Hà Nội.', '저는 하노이에 살아요.'), EX('Tôi dạy tại Khoa Tiếng Việt.', '저는 베트남어학과에서 가르쳐요.'), EX('Quyển sách ở trên bàn.', '책은 책상 위에 있어요.')],
   'kw': [['ở', '~에(서), ~에 있다'], ['tại', '~에서(격식)'], ['sống', '살다']], 'tip': 'ở đâu?(어디에서?)로 물으면 ở + 장소로 답합니다.'}),
 ('비교 — 더·~처럼·~할수록', {'t': 'A + 형용사 + bằng + B — ~만큼 ~하다', 'k': 'A + 형용사 + bằng (như) + B  ·  A và B + 형용사 + bằng nhau',
   'b': '"~만큼 ~하다"는 형용사 뒤에 <b>bằng</b>을 씁니다 — Tôi cao <b>bằng</b> chị Mai(저는 마이 언니만큼 키가 커요). 둘이 같다고 할 때는 <b>bằng nhau</b>(서로 같다). hơn(더)·nhất(가장)과 함께 비교 삼형제입니다. 부정은 không … bằng(~만 못하다). 사이드 교재 1권 6과.',
   'ex': [EX('Tôi cao bằng chị Mai.', '저는 마이 언니만큼 키가 커요.'), EX('Hai người này cao bằng nhau.', '이 두 사람은 키가 같아요.'), EX('Tiếng Nhật khó hơn tiếng Anh.', '일본어는 영어보다 어려워요.')],
   'kw': [['bằng', '~만큼'], ['bằng nhau', '서로 같다'], ['cao', '키가 큰']], 'tip': 'bằng(같다) < hơn(더) < nhất(가장). bằng 은 "~로(수단)"(18과)와 글자가 같으니 자리로 가립니다.'}),
]
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); book = G['books'][0]; new_ex = []; added = []
for lesson_t, it in NEW:
    l = next(x for x in book['bai'] if x['t'] == lesson_t)
    if any(g['t'] == it['t'] for g in l['g']): print('이미 있음', it['t']); continue
    l['g'].append(it); added.append(f"{l['no']}.{len(l['g'])-1} {it['t']}"); new_ex += [e['vi'] for e in it['ex']]
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(new_ex, open(R / 'tools/gram_audit/_new_ex3.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('넣음', len(added)); [print(' ', a) for a in added]
