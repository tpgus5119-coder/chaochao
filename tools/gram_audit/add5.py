#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""교재 문법 본문(TÌM HIỂU NGỮ PHÁP · 2권 NGỮ PHÁP)을 다시 읽고 앱 문법과 하위 규칙까지 대조해 빠진 것 넣기 (2026-10-13, 대표님 "교재에 있는 문법들 다 잘 어플에 넣으라고. 교재 OCR 제대로 했어? OCR 하고 생각도 해서 적용시켜라 · 교재 문법을 잘 파악하고 있어야 시험 범위에 맞는 문법을 모의고사에 녹일 수 있잖아").
대조표: tools/gram_audit/교재_문법_세부.tsv. 여기서는
  ① 새 구별 카드 5.7 'có … không? · …, phải không? — 구별'(1권 6과 '문법 복습' 목록 "Phân biệt cách dùng có...không, ...phải không") — 5과 맨 끝
  ② 교재 예문으로 빠진 쓰임을 보이는 예문 더하기: 15.0 từ bao giờ(1권 9과) · 11.0 형용사 + chưa(1권 9과) · 25.0 주어 하나 + cùng … với(1권 10과)
쓰기: python3 tools/gram_audit/add5.py → 새 예문 tools/gram_audit/_new_ex5.json (소리: python3 tools/gen_audio_list.py tools/gram_audit/_new_ex5.json)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
NEW_ITEM = ('묻기 기초 — ~해요? 맞죠? 무엇? 누구? 어느 나라?', {
  't': 'có … không? · …, phải không? — 구별', 'k': '주어 + có + 동사/형용사 + không?  /  문장 + , phải không?',
  'b': '둘 다 "예/아니요"로 답하는 물음이지만 묻는 마음이 다릅니다. <b>có … không?</b>는 하는지 안 하는지, 있는지 없는지를 <b>몰라서</b> 묻습니다 — 대답은 Có / Dạ … 또는 Không, … không …. '
       '<b>…, phải không?</b>는 "~맞죠?"처럼 <b>이미 그렇다고 생각하고 확인</b>하는 물음입니다 — 대답은 Phải / Vâng … 또는 Không (phải). '
       '명사 문장(là)에는 có … không?을 쓰지 않고 phải không? 또는 có phải … không?을 씁니다. 교재 1권 6과 문법 복습의 짝입니다.',
  'ex': [EX('Anh có khỏe không?', '잘 지내요?'), EX('Anh khỏe, phải không?', '잘 지내시죠?'),
         EX('Chị có thích phở không?', '쌀국수 좋아해요?'), EX('Chị thích phở, phải không?', '쌀국수 좋아하시죠?'),
         EX('Anh là người Hàn, phải không?', '한국 분이시죠?'), EX('Vâng, tôi là người Hàn.', '네, 한국 사람이에요.')],
  'kw': [['có … không?', '~해요? (몰라서)'], ['phải không?', '~맞죠? (확인)'], ['phải', '맞다'], ['khỏe', '건강하다, 잘 지내다'], ['thích', '좋아하다']],
  'tip': '몰라서 물으면 có … không? · 짐작을 확인하면 …, phải không?'})
ADD_EX = {   # 과 제목 · 문형 제목 → 더할 예문
  ('언제·얼마나 자주', 'Bao giờ / lúc nào / khi nào — 언제'): [EX('Em học tiếng Việt từ bao giờ?', '베트남어를 언제부터 배웠어요?'), EX('Từ tháng ba năm nay.', '올해 3월부터요.')],
  ('했어요? 끝났어요? 해 본 적 있어요?', 'đã … chưa? — 했어요, 안 했어요?'): [EX('Chị khỏe chưa?', '이제 몸은 괜찮아요?'), EX('Chưa, tôi còn mệt.', '아직이요, 아직 피곤해요.')],
  ('함께·서로·스스로', '주어 + cùng + 동사 — 함께 ~하다'): [EX('Sơn cùng đi uống cà phê với em trai.', '선은 남동생과 함께 커피 마시러 가요.')],
}
def main():
    G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); book = G['books'][0]; new_ex = []
    lt, it = NEW_ITEM
    l = next(x for x in book['bai'] if x['t'] == lt)
    new_ex += [e['vi'] for e in it['ex']]
    if any(g['t'] == it['t'] for g in l['g']): print('이미 있음', it['t'])
    else: l['g'].append(it); print('넣음', f"{l['no']}.{len(l['g'])-1}", it['t'])
    for (lt2, t), exs in ADD_EX.items():
        l = next(x for x in book['bai'] if x['t'] == lt2); g = next(x for x in l['g'] if x['t'] == t)
        for e in exs:
            new_ex.append(e['vi'])
            if not any(x['vi'] == e['vi'] for x in g['ex']): g['ex'].append(e); print('예문', t[:20], e['vi'])
    json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(new_ex, open(R / 'tools/gram_audit/_new_ex5.json', 'w', encoding='utf-8'), ensure_ascii=False)
if __name__ == '__main__':
    main()
