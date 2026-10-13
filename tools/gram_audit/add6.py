#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bao lâu 네 가지 — (đã) … bao lâu · sẽ … bao lâu · … bao lâu rồi · còn … bao lâu nữa (2026-10-13, 대표님 "bao lâu nữa, bao lâu rồi 에 대해서도 챕터 8에서 배우는 중. 문법이지?").
교재 1권 8과 문법 상자 'Bao lâu': "이미 했거나 앞으로 할 일의 길이를 묻는다" — 예문 đã làm … bao lâu? · sẽ học bao lâu? · thảo luận … bao lâu rồi? · còn ở đây bao lâu nữa?
앱 13.4 카드는 본문이 '얼마나 걸려요/됐어요' 한 줄이고 bao lâu nữa 예문이 없었다 → ① 13.4 본문·짜임·예문 다시 ② 13과 끝 구별 카드 13.5
쓰기: python3 tools/gram_audit/add6.py → 새 예문 tools/gram_audit/_new_ex6.json (소리: python3 tools/gen_audio_list.py tools/gram_audit/_new_ex6.json)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
LESSON = '시각 묻기 · giờ와 tiếng · bao lâu'
B13_4 = ('시간의 <b>길이</b>(얼마 동안)를 묻습니다. 교재 8과는 네 가지를 씁니다. '
         '① <b>(đã) + 동사 + bao lâu?</b> 지난 일의 길이 — Ông Năm đã làm ở công ty đó bao lâu? — Hơn một năm. '
         '② <b>sẽ + 동사 + bao lâu?</b> 앞으로 할 일의 길이 — Em sẽ học bao lâu? — Sáu tháng. '
         '③ <b>… bao lâu rồi?</b> 시작해서 <b>지금까지</b>(아직 하는 중) — Anh học tiếng Việt bao lâu rồi? — Tám tháng rồi. '
         '④ <b>còn … bao lâu nữa?</b> 지금부터 <b>앞으로 남은</b> 길이 — Anh còn ở đây bao lâu nữa? — Hai tuần nữa. '
         '걸리는 시간은 <b>mất bao lâu?</b>(Đi đến đó mất bao lâu?). bao lâu 는 문장 끝에 둡니다.')
K13_4 = '(đã / sẽ) + 동사 + bao lâu?  ·  … bao lâu rồi?  ·  còn … bao lâu nữa?  ·  mất bao lâu?'
TIP13_4 = 'rồi = 지금까지 · nữa = 앞으로 더 — 대답에도 똑같이 붙입니다(tám tháng rồi · hai tuần nữa).'
ADD_EX_13_4 = [EX('Em sẽ học bao lâu?', '얼마 동안 공부할 거예요?'), EX('Anh còn ở đây bao lâu nữa?', '여기 얼마나 더 있을 거예요?'), EX('Hai tuần nữa.', '2주 더요.')]
NEW = {'t': 'bao lâu · bao lâu rồi · bao lâu nữa — 구별', 'k': '(đã) … bao lâu?  /  … bao lâu rồi?  /  còn … bao lâu nữa?',
  'b': '셋 다 "얼마 동안"인데 <b>어느 때까지의 길이</b>인지가 다릅니다. <b>(đã) … bao lâu?</b>는 끝난 일(또는 sẽ 와 함께 앞으로 할 일) 전체의 길이, '
       '<b>… bao lâu rồi?</b>는 시작해서 <b>지금까지</b>의 길이(아직 계속 중), <b>còn … bao lâu nữa?</b>는 <b>지금부터 남은</b> 길이입니다. '
       '대답에도 rồi · nữa 를 그대로 붙입니다.',
  'ex': [EX('Chị đã sống ở Huế bao lâu?', '후에에서 얼마 동안 살았어요?'), EX('Ba năm.', '3년이요.'),
         EX('Chị sống ở Hà Nội bao lâu rồi?', '하노이에 산 지 얼마나 됐어요?'), EX('Hai năm rồi.', '2년 됐어요.'),
         EX('Chị còn sống ở Hà Nội bao lâu nữa?', '하노이에 얼마나 더 살 거예요?'), EX('Một năm nữa.', '1년 더요.')],
  'kw': [['bao lâu', '얼마 동안'], ['bao lâu rồi', '~한 지 얼마나 됐어요'], ['bao lâu nữa', '얼마나 더'], ['còn', '아직, 더'], ['sống', '살다']],
  'tip': '지금까지 = rồi · 앞으로 남은 것 = còn … nữa · 끝난 일 = (đã) … bao lâu.'}
D_NEW = {'at': None, 't': NEW['t'],
  'use': "'얼마 동안'을 어느 때까지 재는지로 가립니다.",
  'pos': "(đã) + 동사 + <b>bao lâu</b>? / 동사 + <b>bao lâu rồi</b>? / <b>còn</b> + 동사 + <b>bao lâu nữa</b>? — 모두 문장 끝.",
  'cmp': [["(đã) … bao lâu?", "끝난 일의 길이: Anh ấy <b>đã</b> làm ở Seoul <b>bao lâu</b>? — Hơn một năm(1년 넘게요 — 지금은 그만둠)."],
          ["sẽ … bao lâu?", "앞으로 할 일 전체의 길이: Em <b>sẽ</b> học <b>bao lâu</b>? — Sáu tháng(6개월이요)."],
          ["… bao lâu rồi?", "시작해서 지금까지(아직 하는 중): Anh học tiếng Việt <b>bao lâu rồi</b>? — Tám tháng <b>rồi</b>(8개월 됐어요)."],
          ["còn … bao lâu nữa?", "지금부터 남은 길이: Anh <b>còn</b> ở đây <b>bao lâu nữa</b>? — Hai tuần <b>nữa</b>(2주 더요)."],
          ["bao giờ", "길이가 아니라 '언제'(때): Anh đến <b>bao giờ</b>? — Hôm qua."]],
  'warn': "대답도 짝을 맞춥니다: bao lâu rồi? → 기간 + rồi, bao lâu nữa? → 기간 + nữa. '아직 얼마나 남았어요?'에 rồi 를 쓰면 '얼마나 됐어요?'가 되어 뜻이 반대입니다."}
def main():
    G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); book = G['books'][0]; new_ex = []
    l = next(x for x in book['bai'] if x['t'] == LESSON); li = book['bai'].index(l)
    g = next(x for x in l['g'] if x['t'] == 'Bao lâu — 얼마 동안')
    g['b'] = B13_4; g['k'] = K13_4; g['tip'] = TIP13_4
    for e in ADD_EX_13_4:
        new_ex.append(e['vi'])
        if not any(x['vi'] == e['vi'] for x in g['ex']): g['ex'].append(e)
    new_ex += [e['vi'] for e in NEW['ex']]
    if not any(x['t'] == NEW['t'] for x in l['g']): l['g'].append(NEW); print('넣음', f"{l['no']}.{len(l['g'])-1}")
    gi = next(i for i, x in enumerate(l['g']) if x['t'] == NEW['t'])
    json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(new_ex, open(R / 'tools/gram_audit/_new_ex6.json', 'w', encoding='utf-8'), ensure_ascii=False)
    # 자세히 상자 — d_04.json 에 13.5 줄(at = 과차례.항목차례)
    p = R / 'tools/gram_detail/d_04.json'; D = json.loads(p.read_text(encoding='utf-8')); at = f'{li}.{gi}'
    if not any(e['at'] == at for e in D): D.append(dict(D_NEW, at=at)); p.write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8'); print('자세히', at)
if __name__ == '__main__':
    main()
