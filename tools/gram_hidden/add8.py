#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""있는 카드의 숨은 쓰임 보태기 (2026-10-13, 대표님 "나머지도 ㄱㄱ" — add7.py 다음).
교재 1·2권 문장에서 자주 쓰이는데 카드 설명·알아보기 규칙이 덮지 못하던 쓰임(scan.py 로 셈):
  chưa + 동사 60 · đi + 동사 170 · khi 혼자 119 · với(함께) 59 · sau đó/trước đó 14 · lúc đó 6 · càng 하나 · hơn/gần/trên/dưới + 수 22 · so với 9
카드 본문(b)·짜임(k)·예문(ex)은 grammar.json 에, 자세히 상자(d)는 tools/gram_detail/d_XX.json 에 보탠다(두 번 돌려도 같은 결과).
쓰기: python3 tools/gram_hidden/add8.py && python3 tools/gram_detail/apply.py → 새 예문 tools/gram_hidden/_new_ex8.json (소리: python3 tools/gen_audio_list.py tools/gram_hidden/_new_ex8.json)"""
import json, pathlib, sys, glob
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
# 문형: (k 에 덧붙일 말, 본문 끝에 덧붙일 말, 더할 예문, d 에 더할 cmp 줄, d 고칠 것{필드: (옛말, 새말)})
CH = {
 '11.0': (' ·  주어 + chưa + 동사(아직 안 했다)',
          ' 물음이 아닐 때 <b>chưa + 동사</b>는 "아직 안 ~했다"입니다: Tôi <b>chưa</b> ăn sáng(아직 아침을 안 먹었어요). 한 번도 없으면 <b>chưa bao giờ</b> + 동사입니다.',
          [EX('Tôi chưa ăn sáng.', '아직 아침을 안 먹었어요.'), EX('Em trai tôi chưa lập gia đình.', '남동생은 아직 결혼 안 했어요.')],
          [["chưa + 동사", "물음이 아니면 '아직 안 ~했다': Tôi <b>chưa</b> hiểu(아직 이해 못 했어요) ↔ Tôi <b>không</b> hiểu(이해가 안 돼요)."]], {}),
 '14.0': ('  ·  sáng nay · tối qua · chiều mai',
          ' 하루의 때(sáng·trưa·chiều·tối) 뒤에 nay·qua·mai 를 붙이면 "오늘 아침·어젯밤·내일 오후"가 됩니다.',
          [EX('Tối qua tôi ngủ muộn.', '어젯밤 늦게 잤어요.')],
          [["sáng nay · tối qua · chiều mai", "하루의 때 + nay/qua/mai: <b>sáng nay</b>(오늘 아침) · <b>tối qua</b>(어젯밤) · <b>chiều mai</b>(내일 오후)."]], {}),
 '14.6': ('  ·  lúc đó · khi đó · hồi đó',
          ' 앞에서 말한 때를 가리키는 "그때"는 <b>lúc đó · khi đó · hồi đó</b>입니다(교재 1권 9·12과).',
          [EX('Lúc đó tôi còn là sinh viên.', '그때 저는 아직 학생이었어요.')],
          [["lúc đó · khi đó · hồi đó", "'그때'(앞에서 말한 때): <b>Lúc đó</b> anh ấy đang ở Hà Nội."]], {}),
 '17.5': ('  ·  đi + 동사(~하러 가다)',
          ' <b>đi + 동사</b>는 "~하러 가다"입니다: đi ăn(먹으러 가다) · đi mua sắm(쇼핑하러 가다) · đi du lịch(여행 가다) · đi thăm(찾아뵈러 가다). 교재 대화에 아주 많이 나옵니다.',
          [EX('Tối nay chúng ta đi ăn phở nhé.', '오늘 저녁에 쌀국수 먹으러 가요.'), EX('Cuối tuần tôi đi thăm ông bà.', '주말에 할아버지 할머니를 뵈러 가요.')],
          [["đi + 동사", "'~하러 가다': <b>đi</b> ăn · <b>đi</b> mua sắm · <b>đi</b> du lịch. 우리말처럼 '먹으러'를 따로 만들지 않습니다."]], {}),
 '18.7': ('  ·  sau đó · trước đó',
          ' 앞에서 말한 일을 기준으로 하면 <b>sau đó</b>(그 뒤에)·<b>trước đó</b>(그 전에)입니다.',
          [EX('Tôi ăn sáng, sau đó đi làm.', '아침을 먹고, 그다음에 출근해요.')],
          [["sau đó · trước đó", "앞에서 말한 일 기준 '그 뒤에·그 전에': Thầy viết lên bảng, <b>sau đó</b> sinh viên viết vào vở."]], {}),
 '47.0': ('  ·  càng + 형용사(더욱)',
          ' càng 을 하나만 쓰면 "더욱·한층"입니다: Nó gầy nên trông <b>càng</b> cao(말라서 더 커 보여요).',
          [EX('Nó gầy nên trông càng cao.', '말라서 더 커 보여요.')],
          [["càng (하나)", "'더욱': Nghe vậy tôi <b>càng</b> lo(그 말을 들으니 더 걱정돼요)."]],
          {'warn': ("càng 은 두 번 씁니다.", "'~할수록 ~'에는 càng 을 두 번 씁니다(하나만 쓰면 '더욱').")}),
 '9.4': ('  ·  hơn · gần · trên · dưới + 수', ' 수 앞에 <b>hơn</b>(~넘게)·<b>gần</b>(~가까이)·<b>trên</b>(~이상)·<b>dưới</b>(~미만)을 붙이기도 합니다: hơn 100 người(100명 넘게).',
         [EX('Hơn một trăm người.', '100명 넘게요.')], [],
         {'cmp': ("[\"hơn · gần\", \"'~넘게' / '~가까이': <b>hơn</b> một năm(1년 넘게) · <b>gần</b> mười giờ(10시 가까이).\"]",
                  "[\"hơn · gần · trên · dưới\", \"'~넘게' / '~가까이' / '~이상' / '~미만': <b>hơn</b> một năm(1년 넘게) · <b>gần</b> mười giờ(10시 가까이) · <b>trên</b> 30 tuổi(서른 넘은) · <b>dưới</b> 10 người(10명 아래).\"]")}),
}
def main():
    G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); book = G['books'][0]; new_ex = []
    files = {pathlib.Path(f).name: json.load(open(f, encoding='utf-8')) for f in glob.glob(str(R / 'tools/gram_detail/d_*.json'))}
    for k, (kadd, badd, exs, cmp, fix) in CH.items():
        no, gi = map(int, k.split('.')); g = book['bai'][no - 1]['g'][gi]
        if kadd.strip(' ·') not in g['k']: g['k'] += kadd
        if badd.strip() not in g['b']: g['b'] += badd
        have = {e['vi'] for e in g['ex']}
        for e in exs:
            if e['vi'] not in have: g['ex'].append(e)
            new_ex.append(e['vi'])
        at = f'{no - 1}.{gi}'
        for f, D in files.items():
            for d in D:
                if d['at'] != at: continue
                for row in cmp:
                    if row[0] not in [c[0] for c in d['cmp']]: d['cmp'].append(row)
                for fld, (old, new) in fix.items():
                    if fld == 'cmp':
                        o, n = json.loads(old), json.loads(new); d['cmp'] = [n if c == o else c for c in d['cmp']]
                    elif d[fld] == old: d[fld] = new
        print('보탬', k, g['t'][:30])
    json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for f, D in files.items(): (R / 'tools/gram_detail' / f).write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8')
    json.dump(new_ex, open(R / 'tools/gram_hidden/_new_ex8.json', 'w', encoding='utf-8'), ensure_ascii=False)
if __name__ == '__main__':
    main()
