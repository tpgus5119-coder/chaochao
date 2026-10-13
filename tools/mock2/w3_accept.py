# -*- coding: utf-8 -*-
"""쓰기 3(그림 보고 5문장) 앱 채점용 문법 틀 — 그림마다 (2026-10-11 대표님 "스스로 채점" · "문장을 넉넉하게 — 같은 뜻이어도 순서를 다르게, 문법에 어긋나지 않으면").
폰에는 AI 가 없으니 클로드가 그림을 보고 맞는 말을 미리 적어 둔다. 문장을 다 늘어놓으면 수만 개라, **틀**만 두고 앱(w3Matcher)이 맞대 본다:
  한 줄 = [앞말] + (통째 문장 | 주어 + [cũng/đều] + 술어(đang 은 빼도)) + [뒷말]   · 'Một …' 주어는 'Có một …' 으로도
          또는 그런 줄 둘을 쉼표·và·còn 으로 이은 것   · 숫자는 글자와 같게(3 = ba) · 큰·작은 글자·문장부호·성조 자리 무시(viCanon)
앞말·뒷말: 때·곳(Bây giờ / Ở văn phòng / Trong văn phòng …) — 문장 앞에도 뒤에도 둘 수 있다.
목록에 없는 바른 문장이 틀림으로 나오면 여기에 더한다."""

MAN = ['anh ấy', 'một anh', 'anh này', 'anh kia', 'anh đó', 'một người', 'người này', 'người đó', 'người đàn ông', 'một người đàn ông', 'người đàn ông này']
WOMAN = ['chị ấy', 'một chị', 'chị này', 'chị kia', 'chị đó', 'cô ấy', 'một cô', 'cô này', 'cô kia', 'người phụ nữ', 'một người phụ nữ', 'người phụ nữ này', 'một người', 'người này']

SPEC = {
 1: {  # 사무실 — 컴퓨터 치는 남자 · 전화하는 여자 · 서류 읽는 남자 (img/mock1-w3.webp)
  'say': ['đây là văn phòng', 'đây là một văn phòng', 'đây là văn phòng công ty', 'đây là văn phòng của công ty', 'đây là văn phòng của một công ty', 'đây là văn phòng của công ty máy tính',
          'đây là một công ty', 'đây là công ty', 'đây là cơ quan', 'đây là một cơ quan', 'văn phòng có ba nhân viên', 'văn phòng có ba người', 'có ba người', 'có ba nhân viên',
          'văn phòng có hai anh và một chị', 'có hai anh và một chị', 'có hai người đàn ông và một người phụ nữ', 'có hai nhân viên nam và một nhân viên nữ',
          'văn phòng có nhiều máy tính', 'có máy tính', 'có một máy tính', 'có một điện thoại', 'có điện thoại', 'có máy tính và điện thoại', 'văn phòng rất đẹp', 'văn phòng rất sạch',
          'đây là nơi làm việc', 'họ là ba nhân viên', 'chị ấy ngồi giữa hai anh', 'một chị ngồi giữa hai anh'],
  'facts': [(['họ', 'ba người', 'ba người này', 'ba nhân viên', 'các nhân viên', 'mọi người', 'những người này', 'các anh chị', 'các anh chị ấy', 'hai anh và một chị', 'ba người ấy'],
             ['đang làm việc', 'là nhân viên', 'là nhân viên công ty', 'là nhân viên văn phòng', 'là nhân viên của công ty', 'rất bận', 'bận', 'đang làm việc chăm chỉ', 'làm việc chăm chỉ',
              'rất chăm chỉ', 'chăm chỉ', 'đang ở văn phòng', 'ở văn phòng', 'đang ngồi làm việc', 'đang ngồi', 'là đồng nghiệp', 'làm việc cùng nhau', 'đang làm việc cùng nhau', 'làm việc ở công ty'], True),
            (MAN, ['đang làm việc với máy tính', 'đang dùng máy tính', 'đang làm việc trên máy tính', 'đang gõ máy tính', 'đang ngồi trước máy tính', 'đang làm việc', 'là nhân viên',
                   'là nhân viên công ty', 'là nhân viên văn phòng', 'là kỹ sư', 'là kế toán', 'là giám đốc', 'đang đọc', 'đang đọc thư', 'đang đọc tài liệu', 'đang đọc giấy',
                   'đang xem tài liệu', 'đang xem giấy', 'đang cầm giấy', 'mặc áo trắng', 'mặc áo sơ mi trắng', 'đang cười', 'rất bận', 'rất chăm chỉ', 'đang viết', 'đang ngồi'], False),
            (WOMAN, ['đang gọi điện thoại', 'đang gọi điện', 'đang nói chuyện điện thoại', 'đang nghe điện thoại', 'đang nói điện thoại', 'đang nói chuyện', 'là thư ký', 'là nhân viên',
                     'là nhân viên công ty', 'là nhân viên văn phòng', 'đang làm việc', 'rất bận', 'đang cười', 'rất vui', 'rất đẹp', 'đang ngồi'], False)],
  'pre': ['bây giờ', 'hôm nay', 'ở văn phòng', 'trong văn phòng', 'ở đây', 'ở công ty', 'trong công ty'],
  'post': ['ở văn phòng', 'trong văn phòng', 'ở đây', 'ở công ty', 'trong công ty', 'bây giờ']},
 2: {  # 아침 식탁 — 신문 읽는 아버지 · 어머니 · 우유 마시는 두 아이, 벽시계 (img/mock2-w3.webp)
  'say': ['bây giờ là buổi sáng', 'đây là buổi sáng', 'bây giờ là 9 giờ sáng', 'bây giờ là 9 giờ', 'gia đình tôi có bốn người', 'gia đình có bốn người', 'có bốn người', 'đây là gia đình tôi',
          'đây là một gia đình', 'đây là bữa sáng', 'đây là bữa ăn sáng', 'trên bàn có nhiều món ăn', 'có nhiều món ăn', 'trên bàn có nhiều đồ ăn', 'bữa sáng rất ngon', 'món ăn rất ngon',
          'có bố mẹ và hai em', 'gia đình tôi có bố mẹ và hai em', 'trên bàn có sữa', 'có sữa', 'đây là nhà tôi', 'gia đình tôi rất vui', 'cả nhà rất vui', 'tôi có hai em'],
  'facts': [(['gia đình tôi', 'cả gia đình', 'cả nhà', 'cả nhà tôi', 'họ', 'gia đình này', 'bốn người', 'cả gia đình tôi', 'mọi người', 'gia đình', 'bố mẹ và hai em', 'bố mẹ tôi và hai em'],
             ['đang ăn sáng', 'đang ăn sáng với nhau', 'đang ăn sáng cùng nhau', 'đang ăn cơm', 'đang ăn', 'rất vui', 'đang ngồi ăn sáng', 'đang ở nhà', 'đang ăn bữa sáng', 'đang ngồi ở bàn ăn', 'đang ăn sáng ở nhà'], True),
            (['bố tôi', 'bố', 'người bố', 'bố của tôi', 'anh ấy', 'ông bố', 'một anh', 'người đàn ông'], ['đang đọc báo', 'đang ăn sáng', 'đang cười', 'rất vui', 'thích đọc báo', 'thường đọc báo', 'đang ngồi', 'đọc báo mỗi sáng'], False),
            (['mẹ tôi', 'mẹ', 'người mẹ', 'mẹ của tôi', 'chị ấy', 'một chị', 'người phụ nữ', 'cô ấy'], ['đang ăn sáng', 'đang nói chuyện', 'đang nói chuyện với bố', 'đang nói chuyện với bố tôi', 'đang cười', 'rất vui', 'đang ngồi', 'đang ăn', 'rất đẹp'], False),
            (['hai em bé', 'hai em', 'các em', 'các em bé', 'các con', 'hai con', 'các em tôi', 'hai em tôi', 'hai đứa trẻ', 'hai đứa con', 'em gái và em trai tôi', 'hai em nhỏ', 'các con tôi'],
             ['đang uống sữa', 'đang ăn sáng', 'rất vui', 'thích uống sữa', 'đang ăn', 'đang cười'], True),
            (['em tôi', 'em gái tôi', 'em trai tôi', 'em bé', 'một em', 'em ấy', 'con tôi', 'con gái tôi', 'con trai tôi'], ['đang uống sữa', 'đang ăn sáng', 'rất vui', 'thích uống sữa', 'đang ăn'], False)],
  'pre': ['bây giờ', 'buổi sáng', 'sáng nay', 'mỗi sáng', 'hôm nay', 'ở nhà', 'mỗi buổi sáng'],
  'post': ['ở nhà', 'bây giờ', 'vào buổi sáng', 'buổi sáng', 'cùng nhau', 'với nhau', 'mỗi sáng', 'sáng nay']},
 3: {  # 서점 — 30% 할인 · 사람 많음 · 책 읽는 아가씨 (img/mock3-w3.webp)
  'say': ['đây là nhà sách', 'đây là một nhà sách', 'đây là một nhà sách lớn', 'nhà sách này rất đông', 'nhà sách rất đông', 'ở đây rất đông', 'nhà sách đông người', 'nhà sách rất đông người',
          'hôm nay nhà sách giảm giá 30%', 'nhà sách giảm giá 30%', 'nhà sách này giảm giá 30%', 'sách giảm giá 30%', 'sách ở đây giảm giá 30%', 'hôm nay sách giảm giá 30%', 'nhà sách đang giảm giá',
          'nhà sách đang giảm giá 30%', 'nhà sách giảm giá', 'sách đang giảm giá', 'có giảm giá 30%', 'giảm giá 30%', 'có nhiều sách', 'nhà sách có nhiều sách', 'nhà sách này có nhiều sách',
          'có rất nhiều sách', 'có nhiều người', 'nhà sách có nhiều người', 'có rất nhiều người', 'có nhiều sách hay', 'sách ở đây rẻ', 'sách ở đây rất rẻ', 'sách ở đây rẻ và hay', 'sách rất rẻ',
          'sách rẻ', 'sách ở đây rất hay', 'sách rẻ và hay', 'nhà sách rất lớn', 'có nhiều người mua sách', 'có nhiều người đọc sách', 'có nhiều người xem sách', 'nhiều người đến nhà sách'],
  'facts': [(['nhiều người', 'mọi người', 'họ', 'rất nhiều người', 'những người này', 'khách', 'nhiều khách'],
             ['đang mua sách', 'đang xem sách', 'đang đọc sách', 'đang chọn sách', 'đang tìm sách', 'đến mua sách', 'đi mua sách', 'đang ở nhà sách', 'đến nhà sách', 'đi nhà sách', 'thích đọc sách', 'đang đứng xem sách'], True),
            (['một cô gái', 'cô gái', 'cô gái này', 'cô ấy', 'một cô', 'chị ấy', 'một chị', 'một người phụ nữ', 'người phụ nữ'],
             ['đang đọc sách', 'đang xem sách', 'đang mua sách', 'đang chọn sách', 'thích đọc sách', 'đang cầm sách', 'đang đứng đọc sách', 'đang tìm sách'], False),
            (MAN, ['đang đọc sách', 'đang xem sách', 'đang mua sách', 'đang chọn sách', 'đang tìm sách', 'đang cầm sách'], False)],
  'pre': ['hôm nay', 'ở nhà sách', 'trong nhà sách', 'ở đây', 'bây giờ', 'ở nhà sách này', 'trong nhà sách này'],
  'post': ['ở nhà sách', 'trong nhà sách', 'ở đây', 'hôm nay', 'ở nhà sách này']},
 4: {  # 거리 — 버스 · 택시 · 걷는 사람들 · 우체국 (img/mock4-w3.webp)
  'say': ['đây là đường phố', 'đây là một đường phố', 'đây là đường phố ở thành phố hồ chí minh', 'đây là một con đường', 'đây là con đường', 'đây là thành phố', 'đây là một thành phố',
          'đây là thành phố hồ chí minh', 'đường phố rất đông', 'đường rất đông', 'ở đây rất đông', 'đường phố đông người', 'đường phố rất đông người', 'thành phố rất đông',
          'có xe buýt và tắc xi', 'có một xe buýt và một tắc xi', 'có một xe buýt', 'có một tắc xi', 'có xe buýt', 'có tắc xi', 'có nhiều xe', 'có nhiều người', 'có nhiều người đi bộ',
          'có rất nhiều người', 'có một bưu điện', 'đây là bưu điện', 'có bưu điện', 'bưu điện ở đây', 'bưu điện ở gần đây', 'bây giờ là buổi sáng', 'có nhiều cây', 'trời đẹp', 'trời nắng',
          'hôm nay trời đẹp', 'có nhiều nhà', 'có xe buýt tắc xi và nhiều người', 'xe buýt màu vàng', 'tắc xi màu vàng', 'xe buýt và tắc xi đang chạy'],
  'facts': [(['nhiều người', 'mọi người', 'họ', 'rất nhiều người', 'những người này', 'người đi bộ'],
             ['đang đi bộ', 'đang đi bộ trên đường', 'đang đi trên đường', 'đang qua đường', 'đang đi bộ qua đường', 'đang đi bộ trên đường phố', 'đang đi', 'đang đi làm', 'rất vội'], True),
            (['xe buýt', 'một xe buýt', 'chiếc xe buýt', 'tắc xi', 'một tắc xi', 'chiếc tắc xi', 'xe tắc xi'], ['đang đến', 'đang chạy', 'đang đi', 'đang dừng', 'màu vàng', 'đang chạy trên đường'], False)],
  'pre': ['ở đây', 'trên đường', 'trên đường phố', 'ở thành phố hồ chí minh', 'bây giờ', 'hôm nay', 'ở đường phố', 'ở gần bưu điện'],
  'post': ['trên đường', 'trên đường phố', 'ở đây', 'ở thành phố hồ chí minh', 'ở gần bưu điện', 'bây giờ']},
 5: {  # 거실 저녁 — TV 보는 아버지 · 요리하는 어머니 · 음악 듣는 아이 (img/mock5-w3.webp)
  'say': ['bây giờ là buổi tối', 'đây là buổi tối', 'gia đình tôi đang ở nhà', 'gia đình tôi ở nhà', 'cả nhà đang ở nhà', 'họ đang ở nhà', 'đây là nhà tôi', 'có ba người',
          'gia đình tôi có ba người', 'hôm nay là thứ bảy', 'hôm nay là cuối tuần', 'đây là gia đình tôi', 'nhà tôi rất đẹp', 'gia đình tôi rất vui', 'cả nhà rất vui'],
  'facts': [(['bố tôi', 'bố', 'người bố', 'anh ấy', 'một anh', 'bố của tôi', 'người đàn ông', 'ông bố'],
             ['đang xem tivi', 'đang xem phim', 'đang xem tin tức', 'đang ngồi xem tivi', 'thích xem tivi', 'đang nghỉ ngơi', 'đang ngồi', 'đang nghỉ', 'đang ngồi trên ghế'], False),
            (['mẹ tôi', 'mẹ', 'người mẹ', 'chị ấy', 'một chị', 'cô ấy', 'mẹ của tôi', 'người phụ nữ'],
             ['đang nấu ăn', 'đang nấu cơm', 'đang nấu bữa tối', 'đang nấu ăn trong bếp', 'đang nấu ăn ở bếp', 'thích nấu ăn', 'nấu ăn rất ngon', 'đang chuẩn bị bữa tối', 'đang ở trong bếp', 'đang ở bếp', 'đang làm bữa tối'], False),
            (['em tôi', 'em ấy', 'một em', 'em trai tôi', 'con tôi', 'em trai', 'em bé', 'con trai tôi', 'cậu bé'], ['đang nghe nhạc', 'thích nghe nhạc', 'đang nghe nhạc trên mạng', 'rất vui', 'đang ngồi'], False),
            (['gia đình tôi', 'cả nhà', 'họ', 'cả gia đình', 'mọi người', 'ba người', 'cả nhà tôi'], ['đang ở nhà', 'rất vui', 'đang nghỉ ngơi'], True)],
  'pre': ['bây giờ', 'buổi tối', 'tối nay', 'hôm nay', 'cuối tuần', 'ở nhà', 'mỗi tối', 'thứ bảy'],
  'post': ['ở nhà', 'bây giờ', 'vào buổi tối', 'buổi tối', 'tối nay']},
}

def gram(key, model=()):
    s = SPEC[key]
    say = list(dict.fromkeys(s['say'] + [m.rstrip('.!?').lower() for m in model]))
    return {'say': say, 'facts': [[subs, preds, 1 if pl else 0] for subs, preds, pl in s['facts']], 'pre': s.get('pre', []), 'post': s.get('post', [])}
if __name__ == '__main__':
    for k in SPEC:
        g = gram(k); n = len(g['say']) + sum(len(a) * len(b) * (3 if p else 2) for a, b, p in g['facts'])
        print(k, '틀', len(g['say']), '통째 +', sum(len(a) * len(b) for a, b, _ in g['facts']), '주어×술어 → 앞말·뒷말·đang·cũng·đều·이어 쓰기까지 대략', n * (len(g['pre']) + 1) * (len(g['post']) + 1), '꼴')
