# -*- coding: utf-8 -*-
"""쓰기 3(그림 보고 5문장) 앱 채점용 — 그림마다 '맞는 문장'을 미리 넉넉히 만들어 둔다 (2026-10-11 대표님 "스스로 생각해서 채점할 수는 없니? 답은 대략 정해져 있으니까").
폰에서는 AI 가 없으니, 클로드가 그림을 보고 그 그림에 맞는 문장 꼴을 미리 다 적는다: 통째 문장(SAY) + 누가(주어 여러 꼴) × 무엇을(술어 여러 꼴).
'đang ~' 은 đang 이 없어도, '한 사람(Một anh …)' 은 'Có một anh …' 으로도 받는다. 앱은 쓴 줄마다 viCanon(큰·작은 글자·문장부호·성조 자리 무시)으로 맞대 맞은 줄 수를 센다.
목록에 없는 바른 문장은 틀림으로 나온다 — 그런 보고가 오면 여기에 더한다."""

def _gen(spec):
    out = list(spec.get('say', []))
    for subs, preds in spec.get('facts', []):
        for s in subs:
            for p in preds:
                vs = [p] + ([p[5:]] if p.startswith('đang ') else [])
                for v in vs:
                    out.append(f'{s} {v}.')
                    if s.startswith('Một '): out.append(f'Có {s[0].lower() + s[1:]} {v}.')
    seen, res = set(), []
    for x in out:
        x = x[0].upper() + x[1:]
        if x not in seen: seen.add(x); res.append(x)
    return res

MAN = ['Anh ấy', 'Một anh', 'Anh này', 'Một người', 'Người đàn ông', 'Một người đàn ông']
WOMAN = ['Chị ấy', 'Một chị', 'Chị này', 'Cô ấy', 'Một cô', 'Một người phụ nữ', 'Người phụ nữ']
SPEC = {
 1: {  # 사무실 — 컴퓨터 치는 남자 · 전화하는 여자 · 서류 읽는 남자 (img/mock1-w3.webp)
  'say': ['Đây là văn phòng.', 'Đây là một văn phòng.', 'Đây là văn phòng công ty.', 'Đây là văn phòng của công ty.', 'Đây là văn phòng của công ty máy tính.',
          'Văn phòng có ba nhân viên.', 'Văn phòng có ba người.', 'Có ba người.', 'Có ba nhân viên.', 'Có ba người trong văn phòng.', 'Có ba nhân viên trong văn phòng.',
          'Ở đây có ba người.', 'Ở đây có ba nhân viên.', 'Trong văn phòng có ba người.', 'Trong văn phòng có ba nhân viên.', 'Văn phòng có hai anh và một chị.',
          'Có hai anh và một chị.', 'Có hai người đàn ông và một người phụ nữ.', 'Văn phòng có nhiều máy tính.', 'Có một máy tính.', 'Có một điện thoại.'],
  'facts': [(['Họ', 'Ba người', 'Ba người này', 'Ba nhân viên', 'Các nhân viên', 'Mọi người'],
             ['đang làm việc', 'đang làm việc ở văn phòng', 'đang làm việc ở công ty', 'là nhân viên', 'là nhân viên công ty', 'là nhân viên văn phòng', 'đều là nhân viên',
              'đều là nhân viên công ty', 'rất bận', 'đều rất bận', 'làm việc chăm chỉ', 'đều làm việc chăm chỉ', 'rất chăm chỉ', 'làm việc ở văn phòng', 'làm việc ở công ty', 'đang làm việc chăm chỉ']),
            (MAN, ['đang làm việc với máy tính', 'đang dùng máy tính', 'đang làm việc', 'là nhân viên', 'là nhân viên công ty', 'là nhân viên văn phòng', 'là kỹ sư', 'là kế toán',
                   'đang đọc', 'đang đọc thư', 'đang đọc tài liệu', 'đang đọc giấy', 'đang xem tài liệu', 'đang làm việc ở văn phòng', 'rất bận', 'rất chăm chỉ', 'đang viết']),
            (WOMAN, ['đang gọi điện thoại', 'đang nói chuyện điện thoại', 'đang nghe điện thoại', 'đang nói chuyện', 'là thư ký', 'là nhân viên', 'là nhân viên công ty',
                     'là nhân viên văn phòng', 'đang làm việc', 'rất bận', 'đang cười', 'rất vui'])]},
 2: {  # 아침 식탁 — 신문 읽는 아버지 · 어머니 · 우유 마시는 두 아이, 벽시계 (img/mock2-w3.webp)
  'say': ['Bây giờ là buổi sáng.', 'Đây là buổi sáng.', 'Bây giờ là 7 giờ sáng.', 'Gia đình tôi có bốn người.', 'Gia đình có bốn người.', 'Có bốn người.',
          'Đây là gia đình tôi.', 'Đây là một gia đình.', 'Đây là bữa sáng.', 'Đây là bữa ăn sáng.', 'Trên bàn có nhiều món ăn.', 'Có nhiều món ăn.'],
  'facts': [(['Gia đình tôi', 'Cả gia đình', 'Cả nhà', 'Họ', 'Gia đình này', 'Bốn người', 'Cả gia đình tôi'],
             ['đang ăn sáng', 'đang ăn sáng ở nhà', 'đang ăn sáng với nhau', 'đang ăn cơm', 'rất vui', 'đang ngồi ăn sáng', 'đang ở nhà', 'đang ăn bữa sáng']),
            (['Bố tôi', 'Bố', 'Người bố', 'Bố của tôi', 'Anh ấy', 'Ông bố'], ['đang đọc báo', 'đang ăn sáng', 'đang cười', 'rất vui', 'thích đọc báo', 'thường đọc báo']),
            (['Mẹ tôi', 'Mẹ', 'Người mẹ', 'Mẹ của tôi', 'Chị ấy'], ['đang ăn sáng', 'đang nói chuyện', 'đang nói chuyện với bố', 'đang cười', 'rất vui', 'đang nói chuyện với bố tôi']),
            (['Hai em bé', 'Hai em', 'Các em', 'Các em bé', 'Các con', 'Hai con', 'Em tôi', 'Các em tôi', 'Hai em tôi', 'Em gái tôi', 'Em trai tôi', 'Em bé'],
             ['đang uống sữa', 'đang ăn sáng', 'rất vui', 'thích uống sữa'])]},
 3: {  # 서점 — 30% 할인 · 사람 많음 · 책 읽는 아가씨 (img/mock3-w3.webp)
  'say': ['Đây là nhà sách.', 'Đây là một nhà sách.', 'Nhà sách này rất đông.', 'Nhà sách rất đông.', 'Ở đây rất đông.', 'Hôm nay nhà sách giảm giá 30%.', 'Nhà sách giảm giá 30%.',
          'Sách giảm giá 30%.', 'Sách ở đây giảm giá 30%.', 'Hôm nay sách giảm giá 30%.', 'Nhà sách đang giảm giá.', 'Hôm nay nhà sách giảm giá.', 'Có nhiều sách.', 'Ở đây có nhiều sách.',
          'Nhà sách có nhiều sách.', 'Nhà sách này có nhiều sách.', 'Có nhiều người.', 'Có nhiều người ở nhà sách.', 'Ở đây có nhiều người.', 'Nhà sách có nhiều người.',
          'Ở đây có nhiều sách hay.', 'Sách ở đây rẻ.', 'Sách ở đây rất rẻ.', 'Sách ở đây rẻ và hay.', 'Hôm nay sách rẻ.'],
  'facts': [(['Nhiều người', 'Mọi người', 'Họ', 'Có nhiều người', 'Rất nhiều người'], ['đang mua sách', 'đang xem sách', 'đang đọc sách', 'đang chọn sách', 'đến mua sách', 'đi mua sách', 'đang ở nhà sách']),
            (['Một cô gái', 'Cô gái', 'Cô ấy', 'Một cô', 'Chị ấy', 'Một chị'], ['đang đọc sách', 'đang xem sách', 'đang mua sách', 'đang chọn sách', 'thích đọc sách']),
            (MAN, ['đang đọc sách', 'đang xem sách', 'đang mua sách', 'đang chọn sách'])]},
 4: {  # 거리 — 버스 · 택시 · 걷는 사람들 · 우체국 (img/mock4-w3.webp)
  'say': ['Đây là đường phố.', 'Đây là một đường phố.', 'Đây là đường phố ở Thành phố Hồ Chí Minh.', 'Đây là một con đường.', 'Đây là con đường.', 'Đường phố rất đông.', 'Đường rất đông.',
          'Ở đây rất đông.', 'Đường phố đông người.', 'Có xe buýt và tắc xi.', 'Có một xe buýt và một tắc xi.', 'Có một xe buýt.', 'Có một tắc xi.', 'Có xe buýt.', 'Có tắc xi.',
          'Ở đây có xe buýt và tắc xi.', 'Trên đường có xe buýt và tắc xi.', 'Có nhiều người.', 'Có nhiều người đi bộ.', 'Ở đây có nhiều người.', 'Trên đường có nhiều người.',
          'Ở đây có một bưu điện.', 'Có một bưu điện.', 'Đây là bưu điện.', 'Có bưu điện.', 'Bưu điện ở đây.', 'Bây giờ là buổi sáng.', 'Có nhiều cây.', 'Trời đẹp.'],
  'facts': [(['Nhiều người', 'Mọi người', 'Họ', 'Có nhiều người', 'Rất nhiều người'], ['đang đi bộ', 'đang đi bộ trên đường', 'đang đi trên đường', 'đang qua đường', 'đang đi bộ qua đường', 'đi bộ trên đường phố']),
            (['Xe buýt', 'Một xe buýt', 'Tắc xi', 'Một tắc xi'], ['đang đến', 'đang chạy', 'đang đi'])]},
 5: {  # 거실 저녁 — TV 보는 아버지 · 요리하는 어머니 · 음악 듣는 아이 (img/mock5-w3.webp)
  'say': ['Bây giờ là buổi tối.', 'Đây là buổi tối.', 'Gia đình tôi đang ở nhà.', 'Gia đình tôi ở nhà.', 'Cả nhà đang ở nhà.', 'Họ đang ở nhà.', 'Đây là nhà tôi.', 'Có ba người.',
          'Gia đình tôi có ba người.', 'Hôm nay là thứ bảy.', 'Hôm nay là cuối tuần.', 'Đây là gia đình tôi.'],
  'facts': [(['Bố tôi', 'Bố', 'Người bố', 'Anh ấy', 'Một anh', 'Bố của tôi'], ['đang xem tivi', 'đang xem phim', 'đang xem tin tức', 'đang ngồi xem tivi', 'thích xem tivi', 'đang nghỉ ngơi']),
            (['Mẹ tôi', 'Mẹ', 'Người mẹ', 'Chị ấy', 'Một chị', 'Cô ấy', 'Mẹ của tôi'], ['đang nấu ăn', 'đang nấu cơm', 'đang nấu bữa tối', 'đang nấu ăn trong bếp', 'đang nấu ăn ở bếp', 'thích nấu ăn', 'nấu ăn rất ngon']),
            (['Em tôi', 'Em ấy', 'Một em', 'Em trai tôi', 'Con tôi', 'Em trai', 'Em bé'], ['đang nghe nhạc', 'thích nghe nhạc', 'đang nghe nhạc trên mạng', 'rất vui'])]},
 'exam1': {  # 실제 1차 — 교실, Brian(미국) · David(영국) · EunJi(한국), 베트남어 공부 (img/exam1-w3.webp)
  'say': ['Đây là lớp học.', 'Đây là một lớp học.', 'Đây là lớp học tiếng Việt.', 'Đây là lớp tiếng Việt.', 'Có ba người.', 'Có ba sinh viên.', 'Lớp học có ba người.', 'Lớp có ba sinh viên.',
          'Lớp học có ba sinh viên.', 'Ở đây có ba người.'],
  'facts': [(['Anh Brian', 'Brian'], ['là người Mỹ', 'đang học tiếng Việt', 'học tiếng Việt', 'là sinh viên', 'đang viết', 'đang viết bài', 'học tiếng Việt chăm chỉ', 'rất chăm chỉ']),
            (['Anh David', 'David'], ['là người Anh', 'đang học tiếng Việt', 'học tiếng Việt', 'là sinh viên', 'đang nói', 'đang nói tiếng Việt', 'nói tiếng Việt', 'đang nói chuyện', 'học tiếng Việt chăm chỉ']),
            (['Chị EunJi', 'Chị Eunji', 'EunJi', 'Eunji', 'Chị Eun Ji'], ['là người Hàn Quốc', 'đang học tiếng Việt', 'học tiếng Việt', 'là sinh viên', 'đang nghe', 'học tiếng Việt chăm chỉ']),
            (['Họ', 'Ba người', 'Các bạn ấy', 'Ba sinh viên', 'Anh Brian, anh David và chị EunJi', 'Anh Brian và anh David'],
             ['đều học tiếng Việt', 'đang học tiếng Việt', 'học tiếng Việt', 'là sinh viên', 'đều là sinh viên', 'học tiếng Việt chăm chỉ', 'đều học tiếng Việt chăm chỉ', 'là bạn', 'là bạn cùng lớp',
              'đều là người nước ngoài', 'là người nước ngoài', 'rất vui', 'đều rất vui'])]},
}
def accept(key, model=()):
    return list(dict.fromkeys(_gen(SPEC[key]) + list(model)))
if __name__ == '__main__':
    for k in SPEC: print(k, len(accept(k)))
