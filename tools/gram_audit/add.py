#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""메인 교재 문법 대조(tools/gram_audit/교재_문법목록.tsv) 뒤 앱 문법에 빠진 것 넣기·보강 (2026-09-29, 대표님: "메인교재에서 나오는 모든 단어와 문법이 어플에 있어야 한다").
대조 결과: 교재 1·2권 문법 항목 97개 중 앱에 없던 것 — ① những(복수, 2권 7과) ② không + 동사·형용사(부정, 1권 1과 목록).
보강 — ③ Cả … lẫn … 에 'cả A và B · cả A cả B'(2권 9과 본문) ④ được/có thể 에 부정 'không … được · không thể' ⑤ cũng 에 'X cũng vậy(= cũng thế)'.
수업 보충 — ⑥ đi · đến · về(교재는 규칙 설명 없이 예문만: về nhà·đi học·đi làm·đến trường·đi siêu thị·đi về nhà).
예문은 모두 교재 문장(권-과를 옆에 적음). 발음은 vi_kr(북부 kr·남부 krs). 같은 제목이 이미 있으면 다시 넣지 않는다.
쓰기: python3 tools/gram_audit/add.py  → data/grammar.json, 새 예문 목록 tools/gram_audit/_new_ex.json (소리: python3 tools/gen_audio_list.py tools/gram_audit/_new_ex.json)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk

def EX(vi, ko):
    return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}

NEW = [
  # (넣을 과 제목, 이 문형 다음에(제목 앞부분), 문형)
  ('~입니다 · 아닙니다 · ~도 · 이름 · 이것 · 있다', 'S + không phải là + N', {
    't': 'không + 동사/형용사 — ~하지 않다',
    'k': '주어 + không + 동사/형용사',
    'b': '동사·형용사를 부정할 때는 바로 앞에 <b>không</b>을 놓습니다. 명사 문장(là)은 보통 <b>không phải là</b>로 부정합니다 — '
         'Tôi <b>không</b> biết(저는 몰라요) · Tôi <b>không phải là</b> giáo viên(저는 선생님이 아니에요). 형용사도 동사처럼 không 을 바로 앞에 붙입니다(không dễ 쉽지 않다).',
    'ex': [EX('Tôi không biết.', '저는 몰라요.'),                                    # 1권 3과
           EX('Không, tôi không gặp bà Lệ.', '아니요, 저는 레 부인을 안 만났어요.'),       # 1권 1과
           EX('Tiếng Việt không dễ nhưng họ học chăm chỉ.', '베트남어는 쉽지 않지만 그들은 열심히 공부해요.')],   # 1권 3과
    'kw': [['không', '~하지 않다(부정)'], ['biết', '알다'], ['gặp', '만나다'], ['dễ', '쉽다']],
    'tip': 'là 문장은 không phải là, 동사·형용사 문장은 không — 교재 1권 1과의 부정 không.'}),
  ('단위 명사와 여럿', 'các — ~들', {
    't': 'những — ~들 (가려 낸 여럿)',
    'k': 'những + (단위명사) + 명사 + 꾸밈말(này·đó·…)',
    'b': '<b>những</b>도 여럿을 나타내지만, 다른 것과 <b>가려서</b> 말할 때 씁니다 — 뒤에 이·그·어떤 성질 같은 꾸밈말이 붙는 것이 보통입니다. '
         '<b>các</b>은 이미 정해진 여럿(말하는 대상 전부)을 가리킵니다. 둘 다 tất cả 뒤에 올 수 있습니다(tất cả những … / tất cả các …). 교재 2권 7과.',
    'ex': [EX('Những cuốn sách tiếng Việt này rất dễ học.', '이 베트남어 책들은 배우기 아주 쉬워요.'),   # 2권 7과
           EX('Tôi biết những quán phở ở khu vực đó.', '저는 그 동네의 쌀국숫집들을 알아요.'),          # 2권 7과
           EX('Các bạn có thể ra về khi làm xong bài tập.', '여러분은 숙제를 다 하면 돌아가도 돼요.')],  # 2권 7과 (các 과 견주기)
    'kw': [['những', '~들(가려 낸 여럿)'], ['các', '~들(정해진 여럿)'], ['cuốn sách', '책'], ['quán phở', '쌀국숫집']],
    'tip': '"이 책들", "그 가게들"처럼 가려 말하면 những, "여러분", "각 병원"처럼 정해진 무리 전부면 các.'}),
  ('어디·길 묻기·이동', 'trên · dưới · trong', {
    't': 'đi · đến · về — 가다 · (~에) 가다 · 돌아가다',
    'k': 'đi + (하는 일/장소) · đến + 장소 · về + 집·고향·나라',
    'b': '<b>đi</b>는 가다·떠나다, <b>đến</b>은 (목적지에) 가다·도착하다, <b>về</b>는 (집·고향·본국으로) 돌아가다입니다. '
         '집으로 갈 때는 <b>về nhà</b>라고 합니다 — <b>đi nhà</b>라고 하지 않습니다(<b>đi về nhà</b>는 됩니다). '
         '학교·일터에 가는 것은 장소보다 <b>하는 일</b>로 말하는 것이 자연스럽습니다: <b>đi học</b>(학교에 가다·공부하러 가다), <b>đi làm</b>(일하러 가다·출근하다). '
         '장소를 말하려면 <b>đến trường</b>(학교에 가다)처럼 đến 을 씁니다. 그 밖의 장소는 đi + 장소도 씁니다: đi siêu thị, đi nhà hàng, đi Hà Nội.',
    'ex': [EX('Bố sẽ mua hoa và về nhà sớm.', '아빠는 꽃을 사서 일찍 집에 오실 거예요.'),                                   # 1권 10과
           EX('Buổi sáng tôi đi học tiếng Việt, còn buổi chiều tôi đi làm.', '오전에는 베트남어를 배우러 가고, 오후에는 일하러 가요.'),   # 1권 4과
           EX('Tôi thường đến trường bằng xe buýt nhưng hôm nay tôi đi bộ.', '저는 보통 버스로 학교에 가지만 오늘은 걸어가요.'),   # 1권 11과
           EX('Buổi chiều tôi ở nhà, đi siêu thị hay đến quán cà phê gặp bạn.', '오후에는 집에 있거나, 슈퍼마켓에 가거나, 카페에 가서 친구를 만나요.'),   # 1권 4과
           EX('Mười một giờ đêm tôi đi về nhà.', '밤 열한 시에 저는 집에 돌아가요.')],                                        # 1권 7과
    'kw': [['đi', '가다'], ['đến', '(~에) 가다, 도착하다'], ['về', '돌아가다'], ['đi học', '학교에 가다'], ['đi làm', '일하러 가다'], ['về nhà', '집에 가다']],
    'tip': '교재에는 규칙 설명 없이 예문으로만 나옵니다 — 수업 설명(2026-09-29)을 교재 문장으로 정리했습니다.'}),
]

PATCH = [
  # (문형 제목 앞부분, 설명 뒤에 덧붙일 말, 더할 예문, 더할 핵심 낱말)
  ('Cả … lẫn …', ' 같은 뜻으로 <b>cả A và B</b>, <b>cả A cả B</b>라고도 합니다(교재 2권 9과).',
   [EX('Hôm qua có cả cô Kim và ông Quân.', '어제 낌 씨와 꾸언 씨가 둘 다 있었어요.')],   # 1권 4과
   [['cả A và B', 'A와 B 둘 다']]),
  ('được / có thể', ' 부정은 <b>không + 동사 + được</b> 또는 <b>không thể + 동사</b> — 둘 다 "~할 수 없다"입니다.',
   [EX('Anh Brian không nói được tiếng Hàn.', '브라이언 씨는 한국어를 못 해요.'),        # 1권 8과
    EX('Khách không thể ăn uống trong chợ.', '손님은 시장 안에서 먹고 마실 수 없어요.')],   # 2권 3과
   [['không … được', '~할 수 없다'], ['không thể', '~할 수 없다']]),
  ('đi · đến · về', ' <b>đi đến + 장소</b>(đi đến trường 학교에 가다)처럼 đi 뒤에 đến 을 붙여 목적지를 말해도 됩니다(교재 1권 11과). <b>về trường</b>은 자기 학교로 돌아갈 때 씁니다. 안 되는 것은 đi 바로 뒤에 학교를 붙이는 <b>đi trường</b>입니다.',
   [EX('Tôi đánh răng, rửa mặt, ăn sáng rồi đi đến trường.', '저는 이를 닦고 세수하고 아침을 먹은 뒤 학교에 가요.')],   # 1권 11과
   [['đi đến', '~에 가다(목적지)']]),
  ('S + cũng + V/A', ' 앞사람 말에 "저도요·~도 그래요"는 <b>… cũng vậy</b>(= cũng thế)라고 합니다.',
   [EX('Tôi thấy Wifi ở quán cà phê rất yếu. Wifi ở trường cũng vậy.', '카페 와이파이는 아주 약한 것 같아요. 학교 와이파이도 그래요.')],   # 2권 4과
   [['cũng vậy', '~도 그렇다']]),
]


def main():
    p = R / 'data/grammar.json'
    g = json.loads(p.read_text(encoding='utf-8'))
    bai = g['books'][0]['bai']
    titles = {x['t'] for c in bai for x in c['g']}
    new_ex, log = [], []
    for ct, after, pat in NEW:
        if pat['t'] in titles:
            log.append('있음 ' + pat['t']); continue
        c = next(c for c in bai if c['t'] == ct)
        i = next(i for i, x in enumerate(c['g']) if x['t'].startswith(after))
        c['g'].insert(i + 1, pat)
        new_ex += [e['vi'] for e in pat['ex']]
        log.append(f'넣음 {ct} ← {pat["t"]}')
    for head, add_b, exs, kws in PATCH:
        x = next(x for c in bai for x in c['g'] if x['t'].startswith(head))
        if add_b.strip() in x['b']:
            log.append('보강 있음 ' + head); continue
        x['b'] += add_b
        x['ex'] += exs
        x['kw'] = (x.get('kw') or []) + kws
        new_ex += [e['vi'] for e in exs]
        log.append('보강 ' + head)
    p.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding='utf-8')
    (R / 'tools/gram_audit/_new_ex.json').write_text(json.dumps(new_ex, ensure_ascii=False), encoding='utf-8')
    print('\n'.join(log)); print('새 예문', len(new_ex))


if __name__ == '__main__':
    main()
