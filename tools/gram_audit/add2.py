#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""메인 교재 대화에 녹아 있는데 앱 문법에 없던 문형 넣기 (2026-10-06, 대표님 "문법 상자 외에 녹아 있는 문법들도 모두 앱에 있어야 한다").
근거: tools/gram_tok/build.py 의 ③ 보고 — 교재 대화의 기능어 가운데 어느 문형 규칙에도 안 잡히던 것(횟수 순): nữa 32 · dạ 31 · và 27 · ừ 16 · ơi 6 · vâng 6 · gần 6 · lần 4 · giống 3 · nhất 3 · có lẽ 3 · không sao 2 · rồi(단독).
예문은 교재 대화 문장 그대로(권-과를 옆에)이며 한국어도 교재 번역. 외국 이름은 베트남 이름으로(소리·발음 표기 때문, 2026-09-26 규칙). 과 **맨 끝**에 붙인다(앞 문형 번호가 안 밀리게 — gram_tok 규칙이 과.번으로 가리킨다).
쓰기: python3 tools/gram_audit/add2.py → data/grammar.json · 새 예문 tools/gram_audit/_new_ex2.json (소리: python3 tools/gen_audio_list.py tools/gram_audit/_new_ex2.json)"""
import json, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vk
def EX(vi, ko): return {'vi': vi, 'ko': ko, 'kr': vk(vi), 'krs': vk(vi, south=True)}
NEW = [
 ('나와 너 — 부르는 말', {'t': '… ơi! — 부르는 말', 'k': '이름/호칭 + ơi!',
   'b': '사람을 부를 때 이름이나 호칭 뒤에 <b>ơi</b>를 붙입니다 — Chị Vân <b>ơi</b>!(번 언니!) · Em <b>ơi</b>!(저기요! — 식당에서 종업원을 부를 때). <b>Trời ơi!</b>는 "어머!·세상에!"라는 감탄입니다. 교재 1권 2과·9과, 2권 1과 대화.',
   'ex': [EX('Chị Vân ơi! Kia là ai?', '번 언니! 저기는 누구예요?'), EX('Em ơi, tính tiền!', '저기요, 계산할게요!'), EX('Trời ơi! Sao tôi không nhớ vậy?', '어머! 저는 왜 그걸 기억 못 했을까요?')],
   'kw': [['ơi', '~야, ~씨!(부름)'], ['trời ơi', '어머, 세상에'], ['tính tiền', '계산하다']], 'tip': '식당·카페에서 "Em ơi!" 한마디면 종업원이 옵니다. 교재 1권 2과 대화.'}),
 ('문장 끝 말투 — ạ · à · vậy · hả · nhỉ', {'t': 'dạ · vâng · ừ — 네 / 응 (대답 머리말)', 'k': 'Dạ / Vâng, + 문장  ·  Ừ, + 문장',
   'b': '대답 앞에 붙이는 말입니다. <b>Dạ</b>·<b>Vâng</b>은 윗사람에게 "네"(남부는 Dạ, 북부는 Vâng이 흔함), <b>Ừ</b>는 친구·아랫사람에게 "응". Dạ는 "네, 아니요"처럼 부정 대답 앞에도 공손하게 붙입니다(Dạ, không). 교재 1권 2과부터 대화 거의 매 과에 나옵니다.',
   'ex': [EX('Dạ, em là người Hàn Quốc.', '네, 저는 한국 사람이에요.'), EX('Vâng, cảm ơn anh rất nhiều.', '네, 정말 감사합니다.'), EX('Ừ, đúng rồi.', '응, 맞아.')],
   'kw': [['dạ', '네(공손)'], ['vâng', '네(공손, 북부)'], ['ừ', '응(친구에게)']], 'tip': '교재 대화에 dạ 31번·ừ 16번·vâng 6번 — 문법 상자에는 없지만 가장 자주 쓰는 말입니다.'}),
 ('했어요? 끝났어요? 해 본 적 있어요?', {'t': 'rồi — 이미 ~했어요 (끝남) · đúng rồi', 'k': '문장 + rồi  ·  đã + 동사 + … + rồi',
   'b': '문장 끝의 <b>rồi</b>는 "이미 그렇게 되었다"는 뜻입니다 — Tôi ăn <b>rồi</b>(저는 먹었어요) · Anh ấy đi <b>rồi</b>(그는 갔어요). <b>Đúng rồi</b>는 "맞아요", <b>Rồi</b> 한마디는 "네(했어요)"입니다. "… chưa?"로 물으면 "… rồi"로 답합니다. 교재 1권 3과부터 대화에 계속 나옵니다.',
   'ex': [EX('Em đã học tiếng Việt một tháng rồi.', '베트남어 배운 지 한 달이나 됐어요.'), EX('Xin lỗi. Tôi có hẹn với bạn rồi.', '죄송해요. 저는 이미 친구와 약속이 있어요.'), EX('Rồi, anh ấy đi rồi.', '네, 이미 갔어요.'), EX('Đúng rồi, anh.', '맞아요.')],
   'kw': [['rồi', '이미, ~했어요'], ['đúng rồi', '맞아요'], ['hẹn', '약속']], 'tip': '"Anh ăn cơm chưa?" — "Rồi." 이 짝만 알아도 대화가 됩니다.'}),
 ('했어요? 끝났어요? 해 본 적 있어요?', {'t': 'lần — 번(횟수) · lần đầu tiên', 'k': '수 + lần  ·  mấy lần?  ·  lần đầu (tiên)',
   'b': '<b>lần</b>은 "번(횟수)"입니다 — hai <b>lần</b>(두 번) · mấy <b>lần</b>?(몇 번?) · <b>lần đầu tiên</b>(처음, 첫 번째). "… lần nào chưa?"는 "~해 본 적 있어요?"입니다. 교재 2권 1과 대화.',
   'ex': [EX('Tôi ăn ở đó mấy lần rồi.', '나도 거기서 몇 번 먹어봤어.'), EX('Tôi ăn hai lần rồi.', '두 번 먹어봤어요.'), EX('Đây là lần đầu tiên tôi đến Việt Nam.', '베트남에 온 건 이번이 처음이에요.')],
   'kw': [['lần', '번(횟수)'], ['lần đầu tiên', '처음, 첫 번째'], ['mấy lần', '몇 번']], 'tip': '횟수는 lần, 시간 길이는 tiếng·giờ — 헷갈리지 마세요.'}),
 ('어디·길 묻기·이동', {'t': 'gần · xa · bên · đối diện — 가까이 · 멀리 · ~쪽 · 맞은편', 'k': 'gần / xa + 장소  ·  bên phải / bên trái  ·  đối diện + 장소',
   'b': '위치를 말하는 말들입니다. <b>gần</b> + 장소(~ 근처) · <b>xa</b>(멀다, bao xa? 얼마나 멀어요?) · <b>bên phải / bên trái</b>(오른쪽/왼쪽) · <b>bên cạnh</b>(옆) · <b>đối diện</b>(맞은편). 교재 1권 5과·12과, 2권 2·3·7과 대화.',
   'ex': [EX('Tôi thường mua sắm ở một trung tâm thương mại gần nhà.', '저는 보통 집 근처 쇼핑몰에서 쇼핑해요.'), EX('Từ đây đến đó bao xa vậy, anh?', '여기서 거기까지 얼마나 먼가요?'), EX('Nhà hàng nằm ở góc đường bên phải, phải không anh?', '식당이 오른쪽 길모퉁이에 있는 거 맞죠?')],
   'kw': [['gần', '가까운, ~근처'], ['xa', '먼'], ['bên phải', '오른쪽'], ['bên trái', '왼쪽'], ['đối diện', '맞은편']], 'tip': '길을 설명할 때 bên phải·bên trái·đối diện 셋이면 대부분 됩니다.'}),
 ('그런데·그러면·또는', {'t': 'và — 그리고, ~와(과)', 'k': 'A và B  ·  문장, và + 문장',
   'b': '<b>và</b>는 "그리고·~와"입니다 — tôi <b>và</b> anh ấy(나와 그) · tiếng Nhật <b>và</b> tiếng Pháp(일본어와 프랑스어). 여럿을 늘어놓을 때는 마지막 둘 사이에만 và를 넣고 앞은 쉼표로 잇습니다. 교재 1권 3과부터 대화에 27번.',
   'ex': [EX('Tôi và anh Nam sắp đi ăn trưa.', '저랑 남 씨는 곧 점심 먹으러 가요.'), EX('Tiếng Đức, tiếng Pháp, tiếng Nhật và tiếng Tây Ban Nha.', '독일어, 프랑스어, 일본어, 그리고 스페인어요.'), EX('Bố mẹ tôi đến Việt Nam để du lịch và thăm họ hàng.', '부모님이 여행도 하시고 친척도 방문하시려고 베트남에 오셔요.')],
   'kw': [['và', '그리고, ~와'], ['thăm', '방문하다'], ['họ hàng', '친척']], 'tip': '"나와 너"는 tôi và bạn — 한국어와 달리 và 가 낱말 사이에 들어갑니다.'}),
 ('도·모두·다시·더·다·여전히', {'t': 'nữa — 더 · 또 · (시간) 뒤에', 'k': '동사 + nữa  ·  수량 + nữa  ·  시간 + nữa (~ 뒤에)',
   'b': '<b>nữa</b>는 "더·또"입니다 — ăn <b>nữa</b>(더 먹다) · đi siêu thị <b>nữa</b>(슈퍼에 또 가다) · một chút <b>nữa</b>(조금 더/조금 있다가). 시간 뒤에 붙으면 "~ 뒤에"가 됩니다 — 10 phút <b>nữa</b>(10분 뒤). "không … nữa"는 "더 이상 ~않다". 교재 대화에 32번 — 상자 밖 문법 가운데 가장 잦습니다.',
   'ex': [EX('Chị đi siêu thị nữa à?', '슈퍼마켓 또 가세요?'), EX('Không những đẹp mà còn tốt nữa.', '예쁠 뿐만 아니라 품질도 좋아요.'), EX('Em có trở lại Việt Nam nữa không?', '베트남에 다시 올 거야?'), EX('Khoảng 10 phút nữa.', '10분쯤 뒤에요.')],
   'kw': [['nữa', '더, 또'], ['trở lại', '돌아오다'], ['một chút nữa', '조금 있다가']], 'tip': 'thêm 은 "추가로", nữa 는 "또/더/뒤에" — 둘을 같이 쓰기도 합니다(thêm một bát nữa).'}),
 ('비교 — 더·~처럼·~할수록', {'t': 'nhất — 가장 (최상급)', 'k': '형용사/동사 + nhất  ·  thích nhất là …',
   'b': '<b>nhất</b>은 "가장"입니다 — đẹp <b>nhất</b>(가장 예쁜) · thích <b>nhất</b>(가장 좋아하다). 비교의 hơn(더)과 짝입니다: đẹp hơn(더 예쁜) → đẹp nhất(가장 예쁜). 교재 2권 1·2과 대화.',
   'ex': [EX('Tôi thích nhất là cơm sen.', '저는 연잎밥을 가장 좋아해요.'), EX('Bức ảnh đẹp nhất của tôi đấy!', '제 사진 중에 제일 예쁜 거예요!'), EX('Món nào ngon nhất?', '어떤 음식이 제일 맛있어요?')],
   'kw': [['nhất', '가장'], ['bức ảnh', '사진'], ['cơm sen', '연잎밥']], 'tip': 'hơn(더) → nhất(가장). 둘 다 형용사 뒤에 옵니다.'}),
 ('비교 — 더·~처럼·~할수록', {'t': 'giống · khác — 같다 · 다르다', 'k': 'A giống B  ·  A giống như B  ·  A khác B',
   'b': '<b>giống</b>은 "같다·닮다", <b>khác</b>은 "다르다"입니다 — Nó <b>giống</b> lẩu hải sản(그건 해물 전골과 비슷해요) · <b>khác</b> nhau(서로 다르다). "giống như"로도 씁니다. 교재 2권 1과·11과 대화.',
   'ex': [EX('Nó giống lẩu hải sản, có phải không chị?', '그건 해물 전골 같은 거 맞죠?'), EX('Hai người này giống nhau quá.', '이 두 사람은 정말 닮았어요.'), EX('Cái này khác cái kia.', '이것은 저것과 달라요.')],
   'kw': [['giống', '같다, 닮다'], ['khác', '다르다'], ['giống nhau', '서로 닮다']], 'tip': '"~와 같다"는 giống + 비교 대상 — như 없이도 됩니다.'}),
 ('아니에요·뭘요·아 그렇군요', {'t': 'Không sao · Được rồi · Tất nhiên — 괜찮아요 · 됐어요 · 물론이죠', 'k': '통째로 외우는 대답 세 마디',
   'b': '<b>Không sao</b>(괜찮아요 — 사과·걱정에 대한 답) · <b>Được rồi</b>(됐어요, 좋아요, 알겠어요) · <b>Tất nhiên</b>(물론이죠 — Tất nhiên là có!). 교재 1권 1과(Không sao), 2권 2과·7과 대화.',
   'ex': [EX('Không sao.', '괜찮아요.'), EX('Được rồi! Đến ngã tư tới thì rẽ phải.', '알겠어요! 다음 사거리에서 오른쪽으로 도세요.'), EX('Tất nhiên là có!', '물론 있죠!')],
   'kw': [['không sao', '괜찮아요'], ['được rồi', '됐어요, 알겠어요'], ['tất nhiên', '물론']], 'tip': 'Xin lỗi(미안해요) 에는 Không sao(괜찮아요) 로 답합니다 — 교재 1권 1과의 첫 대화.'}),
 ('아마·틀림없이·~인 것 같다', {'t': 'có lẽ · chắc (là) — 아마', 'k': 'Có lẽ + 문장  ·  Chắc (là) + 문장',
   'b': '<b>có lẽ</b>와 <b>chắc (là)</b>는 "아마 ~일 거예요"입니다. hình như(~인 것 같다)보다 말하는 사람의 짐작이 조금 더 분명합니다. 혼자 쓰면 "Có lẽ không."(아마 아닐 거예요). 교재 2권 2과·8과 대화.',
   'ex': [EX('Có lẽ không.', '아마 안 갈 것 같아요.'), EX('Chắc là anh ấy bận.', '아마 그는 바쁠 거예요.'), EX('Có lẽ ngày mai trời mưa.', '아마 내일 비가 올 거예요.')],
   'kw': [['có lẽ', '아마'], ['chắc là', '아마, 틀림없이'], ['bận', '바쁜']], 'tip': 'hình như(~인 것 같다) < có lẽ(아마) < chắc chắn(틀림없이) 순으로 확신이 커집니다.'}),
]
G = json.load(open(R / 'data/grammar.json', encoding='utf-8'))
book = G['books'][0]; new_ex = []; added = []
for lesson_t, it in NEW:
    l = next(x for x in book['bai'] if x['t'] == lesson_t)
    if any(g['t'] == it['t'] for g in l['g']): print('이미 있음', it['t']); continue
    l['g'].append(it); added.append(f"{l['no']}.{len(l['g'])-1} {it['t']}")
    new_ex += [e['vi'] for e in it['ex']]
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(new_ex, open(R / 'tools/gram_audit/_new_ex2.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('넣음', len(added)); [print(' ', a) for a in added]; print('새 예문', len(new_ex))
