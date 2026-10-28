#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""1권 10과 수업 화면(수업 자료/문법/나 사진 13장, 2026-10-21~23) 반영 — 2026-10-24 대표님 "문법 카드에는 넣어라".
교재 10과 문법 상자(còn·cùng·khá·chứ)는 이미 있다. 수업 화면에만 있던 것:
 · 나이 비교(교재 10과 본문·연습 2b 에도 있음: Em tôi nhỏ hơn tôi 4 tuổi · Ba mẹ tôi cùng tuổi · Anh Bằng và anh Lưu cùng tuổi/bằng tuổi nhau · Tôi hơn em tôi 4 tuổi) → **새 카드**
 · 형용사 비교 bằng·như·bằng nhau·như nhau·không … bằng/như, 물음 'A và B, ai/nơi nào + 형용사 + hơn?' (교재 1권에는 없음 — 쌤이 10과 때 덧붙임) → 있는 카드(33.0·33.2·33.5)에 보탬
 · cùng 의 갈래 cùng nhau · cùng với · cả hai cùng · cùng lúc → 25.0·25.1 에 보탬
쓰기: python3 tools/gram_audit/add_ch10_slides.py → 새 예문 tools/gram_audit/_new_ex_ch10.json"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); B = G['books'][0]['bai']; new_all = []
MARK = '(1권 10과 수업)'
def add(li, gi, head, note, exs):
    g = B[li]['g'][gi]; assert g['t'].startswith(head), g['t']
    if MARK not in g['b']: g['b'] += ' ' + note + ' ' + MARK
    have = {e['vi'] for e in g['ex']}; a = [e for e in exs if e['vi'] not in have]; g['ex'] += a; new_all.extend(e['vi'] for e in a)
    print(f'{li+1}.{gi} 예문 +{len(a)} → {len(g["ex"])}')
add(32, 0, '… hơn …', '물을 때는 <b>A và B, ai/cái nào/nơi nào + 형용사 + hơn?</b> — 대답 A + 형용사 + hơn B.',
    [EX('Hồ Tây rộng hơn hồ Gươm.', '서호는 호안끼엠 호수보다 넓어요.'), EX('Trà sữa ngon hơn cà phê đen.', '밀크티가 블랙커피보다 맛있어요.'),
     EX('Hà Nội và Huế, nơi nào rộng hơn?', '하노이와 후에 중 어디가 더 넓어요?'), EX('Hà Nội rộng hơn Huế.', '하노이가 후에보다 넓어요.')])
add(32, 2, 'như — ~처럼', '둘이 같다고 할 때는 <b>A và B + 형용사 + như nhau</b>, 부정은 <b>A + không + 형용사 + như + B</b>. 수업에서는 느낌을 나타내는 말(예쁘다·좋다)엔 như, 잴 수 있는 말(키·무게·넓이)엔 bằng 을 쓴다고 했다.',
    [EX('Cô ấy đẹp như hoa.', '그녀는 꽃처럼 예뻐요.'), EX('Cô ấy và hoa đẹp như nhau.', '그녀와 꽃은 똑같이 예뻐요.'), EX('Cô ấy không đẹp như hoa.', '그녀는 꽃만큼 예쁘지 않아요.')])
add(32, 5, 'A + 형용사 + bằng + B', '키·무게·넓이처럼 잴 수 있는 말에 씁니다(느낌은 như). 둘을 한꺼번에: A và B + 형용사 + bằng nhau.',
    [EX('Tôi và chị Mary cao bằng nhau.', '저와 메리 언니는 키가 같아요.'), EX('Phòng tôi rộng bằng phòng chị.', '제 방은 언니 방만큼 넓어요.'), EX('Tôi không cao bằng chị Mary.', '저는 메리 언니만큼 키가 크지 않아요.')])
add(24, 0, '주어 + cùng + 동사', '갈래: <b>cùng nhau</b>(함께) · <b>cùng với</b> + 사람(~와 함께) · <b>cả hai cùng</b>(둘 다) · <b>cùng lúc</b>(동시에).',
    [EX('Tôi và em ấy cùng thích một người.', '저와 그 애는 같은 사람을 좋아해요.'), EX('Chúng tôi cùng gọi một món.', '우리는 같은 음식을 시켰어요.'),
     EX('Cô Linh và cô Hiền đi mua cà phê cùng nhau.', '린 선생님과 히엔 선생님은 함께 커피를 사러 가요.')])
add(24, 1, '주어 + 동사 + cùng + 명사', '<b>cùng với</b> + 사람도 같은 뜻.', [EX('Tôi đi ăn cùng với cô Linh.', '저는 린 선생님과 함께 밥 먹으러 가요.')])
# 새 카드 — 나이 비교 (교재 10과)
AGE = {"t": "나이 비교 — nhỏ hơn · lớn hơn … tuổi · bằng tuổi · cùng tuổi — ~살 어리다/많다, 동갑",
       "k": "A + nhỏ/ít hơn + B + 숫자 tuổi · A + lớn/nhiều hơn + B + 숫자 tuổi · A bằng tuổi B · A và B cùng tuổi / bằng tuổi nhau",
       "b": "나이를 견줄 때 씁니다. 더 어리면 <b>nhỏ hơn</b>(= ít tuổi hơn), 더 많으면 <b>lớn hơn</b>(= nhiều tuổi hơn), 몇 살 차이는 맨 뒤에 <b>숫자 + tuổi</b>. "
            "나이가 같으면 <b>bằng tuổi</b> · <b>cùng tuổi</b>. 줄여서 <b>A hơn B + 숫자 tuổi</b>(A가 B보다 ~살 많다)도 씁니다. 교재 1권 10과 본문·연습 2b. " + MARK,
       "ex": [EX('Em tôi nhỏ hơn tôi 4 tuổi.', '제 동생은 저보다 네 살 어려요.'), EX('Ba mẹ tôi cùng tuổi.', '저희 부모님은 동갑이에요.'),
              EX('Anh Bằng và anh Lưu bằng tuổi nhau.', '방 씨와 르우 씨는 동갑이에요.'), EX('Tôi hơn em tôi 4 tuổi.', '저는 동생보다 네 살 많아요.'),
              EX('Hoa lớn hơn Lan 5 tuổi.', '호아는 란보다 다섯 살 많아요.'), EX('Lan ít tuổi hơn Hoa.', '란은 호아보다 나이가 적어요.'),
              EX('Ai ít tuổi nhất ở lớp B?', 'B반에서 누가 제일 어려요?')],
       "kw": [["nhỏ hơn", "~보다 어리다"], ["lớn hơn", "~보다 나이가 많다"], ["bằng tuổi", "동갑이다"], ["cùng tuổi", "동갑이다"]],
       "tip": "몇 살 차이는 늘 맨 뒤: Em tôi nhỏ hơn tôi 4 tuổi.",
       "d": {"use": "나이를 견줌.", "pos": "A + <b>nhỏ hơn / lớn hơn</b> + B + 숫자 tuổi · A + <b>bằng tuổi</b> + B · A và B + <b>cùng tuổi</b>.",
             "cmp": [["… hơn …", "나이 말고 다른 것도 같은 꼴: cao hơn · rộng hơn(33.0)."], ["bằng · như", "정도가 같음(33.5·33.2): cao bằng · đẹp như."]],
             "warn": "nhỏ 는 '작다'지만 나이에선 '어리다', lớn 은 '크다'지만 '나이가 많다'."}}
gs = B[32]['g']
if not any(g['t'].startswith('나이 비교') for g in gs): gs.append(AGE); new_all.extend(e['vi'] for e in AGE['ex']); print('새 카드 33.%d 나이 비교' % (len(gs) - 1))
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
(R / 'tools/gram_audit/_new_ex_ch10.json').write_text(json.dumps(new_all, ensure_ascii=False), encoding='utf-8'); print('새 예문', len(new_all))
