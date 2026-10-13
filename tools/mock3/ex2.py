# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 재료 2 — 날짜·일정 쪽 (교재 1권 9과 낱말 위주, 8·10과 섞음). **빌드는 mix.py**. 수치 기준은 ex1.py 머리글과 tools/mock3/metrics.py (2026-10-13 밤 다시 씀)."""
from common3 import *
from a3_trap import A3T
NO = 2
q = []
q += [TF("đi công tác", "Anh ấy đang đi công tác.", "그는 출장을 가고 있어요.", True),
      TF("gọi điện thoại", "Đây là điện thoại.", "이것은 전화기예요.", True),
      TF("xe lửa", "Đây là máy bay.", "이것은 비행기예요.", False),
      TF("dọn dẹp", "Chị ấy đang dọn dẹp nhà.", "그녀는 집을 청소하고 있어요.", True),
      TF("bia hơi", "Đây là cà phê.", "이것은 커피예요.", False)]
q += PKS(NO, [("vé máy bay", "Cô ấy đang đặt vé máy bay trên mạng.", "그녀는 인터넷으로 비행기 표를 예약하고 있어요.", "mock3-2-pa.webp"),
              ("xem phim", "Thứ bảy cô ấy đi xem phim.", "토요일에 그녀는 영화를 보러 가요.", "mock3-2-pb.webp"),
              ("đi chợ", "Chủ nhật cô ấy đi chợ.", "일요일에 그녀는 장을 보러 가요.", "mock3-2-pc.webp"),
              ("khách hàng", "Cô ấy đang chờ khách hàng ở quán cà phê.", "그녀는 카페에서 고객을 기다리고 있어요.", "mock3-2-pd.webp"),
              ("sinh nhật", "Hôm nay là sinh nhật cô ấy.", "오늘은 그녀의 생일이에요.", "mock3-2-pe.webp")])   # 듣기 2 — 실제 2차 시험지처럼 한 사람의 다섯 장면(새로 그림, 2026-10-13)
q += A3T[2]   # 듣기 3 — 실제 시험처럼 오답 보기도 들리게 (tools/mock3/a3_trap.py, 2026-10-13)
q += [A4s("Thứ [hai] tuần sau tôi đi công tác.", "다음 주 월요일에 저는 출장을 가요."),
      A4s("Sinh nhật mẹ tôi là ngày [15] tháng 3.", "어머니 생신은 3월 15일이에요."),
      A4s("Chị mua giúp tôi [vé xe lửa] nhé.", "기차표 좀 대신 사 줘요."),   # giúp 어순 — 8과 대화 (대표님 2026-10-13)
      A4s("Anh ấy đi công tác [bốn] ngày.", "그는 나흘 동안 출장을 가요."),
      A4s("Tối nay tôi có [hẹn] với khách hàng.", "오늘 저녁에 고객과 약속이 있어요."),
      A4d("Em ăn trưa chưa?", "점심 먹었니?", "Dạ, em ăn [xong] rồi.", "네, 다 먹었어요.", 'mf'),
      A4d("Hôm qua là thứ mấy?", "어제는 무슨 요일이었어요?", "Hôm qua là [chủ nhật].", "어제는 일요일이었어요.", 'fm'),
      A4d("Bao giờ chị về nước?", "언제 귀국해요?", "Tháng [sáu] năm nay.", "올해 6월이요.", 'mf'),
      A4d("Anh định đi đâu?", "어디에 갈 생각이에요?", "Tôi định đi [Nha Trang].", "나트랑에 갈 생각이에요.", 'fm'),
      A4d("Chị chuẩn bị xong chưa?", "준비 다 됐어요?", "Chưa, đang [dọn dẹp] nhà.", "아직이요, 집 청소 중이에요.", 'mf')]
q += B1S(NO, ["bao giờ", "xong", "đấy", "chưa", "khó tính"], [     # 재료용 — mix.py 가 벌마다 헷갈리는 보기로 다시 쓴다
      ("____ anh đi công tác?", "bao giờ", "언제 출장 가요?"),
      ("Tôi ăn sáng ____ rồi.", "xong", "저는 아침을 다 먹었어요."),
      ("Ngày mai là chủ nhật ____!", "đấy", "내일은 일요일이에요!"),
      ("Tôi ____ gặp khách hàng đó.", "chưa", "저는 그 고객을 아직 못 만났어요."),
      ("Khách hàng đó hơi ____.", "khó tính", "그 고객은 좀 까다로워요.")])
q += [B2("Thứ hai tuần sau chị Kate và chị Loan đi Nha Trang ba ngày. Họ đã đặt vé máy bay rồi.", "다음 주 월요일에 케이트 씨와 로안 씨는 나트랑에 사흘 가요. 비행기 표는 벌써 예약했어요.",
         "Họ đi du lịch mấy ngày?", "그들은 며칠 동안 여행을 가요?", ["ba ngày", "hai ngày", "một tuần"]),
      B2("Hà không thích thứ hai vì đầu tuần Hà luôn cảm thấy mệt. Hà thích nhất là thứ sáu.", "하는 월요일을 좋아하지 않아요. 주초에는 늘 피곤하기 때문이에요. 하는 금요일을 제일 좋아해요.",
         "Sao Hà không thích thứ hai?", "하는 왜 월요일을 좋아하지 않아요?", ["vì Hà thấy mệt", "vì Hà phải đi chợ", "vì Hà có hẹn"]),
      B2("Tối thứ ba và thứ năm chị Hà học tiếng Nhật ở trung tâm ngoại ngữ. Thứ bảy chị ấy ôn tập.", "화요일과 목요일 저녁에 하 씨는 외국어 학원에서 일본어를 배워요. 토요일에는 복습해요.",
         "Chị Hà học tiếng Nhật ở đâu?", "하 씨는 어디에서 일본어를 배워요?", ["ở trung tâm ngoại ngữ", "ở trường đại học", "ở nhà"]),
      B2("Anh Brian đã đặt tour cho ba mẹ. Tháng sáu ba mẹ anh ấy sẽ đi Đà Nẵng một tuần.", "브라이언 씨는 부모님을 위해 여행 상품을 예약했어요. 6월에 부모님은 다낭에 일주일 가요.",
         "Ai đặt tour du lịch?", "누가 여행 상품을 예약했어요?", ["anh Brian", "ba mẹ anh Brian", "chị Vân"]),
      B2("Chị Vân đi công tác ở Hà Nội bốn ngày. Thứ hai tuần sau chị ấy trở lại Sài Gòn.", "번 씨는 하노이로 나흘 동안 출장을 갔어요. 다음 주 월요일에 사이공으로 돌아와요.",
         "Bao giờ chị Vân trở lại Sài Gòn?", "번 씨는 언제 사이공으로 돌아와요?", ["thứ hai tuần sau", "thứ tư", "chủ nhật"])]
T = [("Hôm nay là thứ sáu. Ngày mai anh Hùng có hẹn với bạn thân ở quán bia hơi gần trung tâm ngoại ngữ.", "오늘은 금요일이에요. 내일 훙 씨는 외국어 학원 근처 생맥줏집에서 친한 친구와 약속이 있어요.",
      [("Ngày mai là thứ bảy.", "내일은 토요일이에요.", True), ("Anh Hùng có hẹn ở nhà hàng.", "훙 씨는 식당에서 약속이 있어요.", False)]),
     ("Tháng tám anh Nam sẽ đi Thái Lan làm việc. Anh ấy đã làm ở Việt Nam ba năm và nói được tiếng Thái Lan.", "8월에 남 씨는 일하러 태국에 가요. 베트남에서 3년 일했고 태국어를 할 수 있어요.",
      [("Anh Nam đi Thái Lan để du lịch.", "남 씨는 여행하러 태국에 가요.", False), ("Anh Nam đã làm việc ở Việt Nam ba năm.", "남 씨는 베트남에서 3년 일했어요.", True)]),
     ("Em gái tôi đặt vé xe lửa đi Hà Nội trên mạng. Em ấy đặt xong rồi và gọi điện thoại cho ba mẹ.", "제 여동생은 인터넷으로 하노이행 기차표를 예약했어요. 예약을 끝내고 부모님께 전화했어요.",
      [("Em gái tôi đã đặt vé xong.", "제 여동생은 표 예약을 끝냈어요.", True), ("Em ấy đặt vé máy bay.", "여동생은 비행기 표를 예약했어요.", False)]),
     ("Chủ nhật tuần trước là sinh nhật mẹ tôi. Gia đình tôi đi ăn tối ở nhà hàng và tặng hoa cho mẹ.", "지난주 일요일은 어머니 생신이었어요. 우리 가족은 식당에 저녁을 먹으러 가고 어머니께 꽃을 드렸어요.",
      [("Sinh nhật mẹ tôi là chủ nhật tuần trước.", "어머니 생신은 지난주 일요일이었어요.", True), ("Gia đình tôi ăn tối ở nhà.", "우리 가족은 집에서 저녁을 먹었어요.", False)]),
     ("Chị Lan thường đến công ty muộn vào thứ hai vì chủ nhật chị ấy hay thức khuya. Khách hàng của chị ấy khá khó tính.", "란 씨는 일요일에 자주 늦게까지 깨어 있어서 월요일에 회사에 자주 늦어요. 란 씨의 고객은 꽤 까다로워요.",
      [("Chị Lan đến công ty sớm vào thứ hai.", "란 씨는 월요일에 회사에 일찍 가요.", False), ("Khách hàng của chị Lan khó tính.", "란 씨의 고객은 까다로워요.", True)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Bao giờ anh đi công tác Hà Nội?", "언제 하노이로 출장 가요?", "Thứ năm tuần này, tôi đặt vé rồi.", "이번 주 목요일이요, 표는 예약했어요."),
              ("Sinh nhật chị là ngày nào vậy?", "생일이 언제예요?", "Ngày 20 tháng 8, tuần sau đấy.", "8월 20일, 다음 주예요."),
              ("Anh làm việc xong chưa?", "일 다 끝났어요?", "Chưa, tôi còn hai việc nữa.", "아니요, 두 가지가 더 남았어요."),
              ("Anh ấy đi công tác bao lâu?", "그는 얼마 동안 출장 가요?", "Bốn ngày, thứ sáu anh ấy về.", "나흘이요, 금요일에 돌아와요."),
              ("Hôm nay là sinh nhật tôi đấy.", "오늘 제 생일이에요.", "Thế à? Chúc mừng sinh nhật chị!", "그래요? 생일 축하해요!"),
              ("Tôi quên sinh nhật mẹ rồi.", "엄마 생신을 잊어버렸어요.", "Trời ơi! Anh gọi điện thoại cho mẹ đi!", "세상에! 엄마한테 전화해요!"),
              ("Cuối tuần này anh có rảnh không?", "이번 주말에 시간 있어요?", "Không, tôi có hẹn với khách hàng rồi.", "아니요, 고객과 약속이 있어요."),
              ("Ba mẹ anh đến Việt Nam du lịch à?", "부모님이 베트남에 여행 오세요?", "Ừ, ba mẹ tôi muốn đi Nha Trang.", "응, 부모님은 나트랑에 가고 싶어 하셔."),
              ("Tôi sắp đi công tác ở Đà Nẵng.", "저 곧 다낭으로 출장 가요.", "Bao giờ anh đi? Anh đặt vé chưa?", "언제 가요? 표는 예약했어요?"),
              ("Chúng ta đi bằng xe lửa hay máy bay?", "우리 기차로 가요, 비행기로 가요?", "Đi xe lửa nhé, rẻ hơn máy bay.", "기차로 가요, 비행기보다 싸요.")])
q += [C1("Bao giờ chị đi công tác ở Nha Trang?", "언제 나트랑으로 출장 가요?", ["đi công tác", "bao giờ", "ở Nha Trang", "chị"], ["Chị đi công tác ở Nha Trang bao giờ?"]),
      C1("Sáng chủ nhật chị ấy dọn dẹp nhà xong rồi.", "일요일 아침에 그녀는 집 청소를 다 했어요.", ["xong rồi", "chị ấy", "sáng chủ nhật", "dọn dẹp nhà"]),
      C1("Chị đừng đến muộn vào thứ hai nhé.", "월요일에 늦게 오지 마세요.", ["đừng", "chị", "nhé", "đến muộn", "vào thứ hai"]),   # đừng — 8과 (대표님 2026-10-13)
      C1("Anh ấy đã đi công tác Hà Nội chưa?", "그는 하노이로 출장을 갔어요?", ["chưa", "anh ấy", "đi công tác", "đã", "Hà Nội"]),
      C1("Chủ nhật tuần trước là sinh nhật của tôi.", "지난주 일요일이 제 생일이었어요.", ["sinh nhật", "chủ nhật", "là", "của tôi", "tuần trước"], ["Sinh nhật của tôi là chủ nhật tuần trước."])]
q += [C2("Chị ấy đã gọi cho khách hàng rồi chưa?", "Chị ấy đã gọi cho khách hàng chưa?", "그녀는 고객에게 전화했어요? (rồi 와 chưa 를 함께 쓰지 않는다)", ["Chị ấy gọi cho khách hàng chưa?"]),
      C2("Tối qua tôi xong làm bài tập rồi.", "Tối qua tôi làm bài tập xong rồi.", "어젯밤에 저는 숙제를 다 했어요. (xong 은 동사 뒤)", ["Tối qua tôi làm xong bài tập rồi."]),
      C2("Bao giờ anh về nước thăm ba mẹ?", "Bao giờ anh về nước thăm ba mẹ?", "언제 귀국해서 부모님을 뵈어요?", dung=True),
      C2("Sinh nhật tôi là tháng 8 ngày 20.", "Sinh nhật tôi là ngày 20 tháng 8.", "제 생일은 8월 20일이에요. (날짜는 일 → 월 차례)"),
      C2("Ngày mai là thứ bảy, ngày nghỉ đấy.", "Ngày mai là thứ bảy, ngày nghỉ đấy.", "내일은 토요일, 쉬는 날이에요.", dung=True)]
q.append(C3("mock3-2-w3.webp",
            [("Hôm nay là sinh nhật của Lan.", "오늘은 란의 생일이에요."), ("Chị Hoa đang tặng hoa cho Lan.", "호아 씨가 란에게 꽃을 주고 있어요."),
             ("Anh Nam và chị Thu đang chúc mừng sinh nhật Lan.", "남 씨와 투 씨가 란의 생일을 축하하고 있어요."), ("Có bốn người.", "네 사람이 있어요."), ("Họ rất vui.", "그들은 아주 즐거워요.")],
            {'say': ['hôm nay là sinh nhật lan', 'hôm nay là sinh nhật của lan', 'có bốn người', 'họ rất vui', 'mọi người rất vui', 'lan rất vui', 'có một cái bánh sinh nhật', 'đây là bữa tiệc sinh nhật'],
             'facts': [(['chị hoa', 'chị ấy'], ['đang tặng hoa cho lan', 'tặng hoa cho lan', 'đang tặng hoa', 'đang chúc mừng sinh nhật lan', 'rất vui'], False),
                       (['lan', 'em ấy', 'cô ấy'], ['rất vui', 'đang cười', 'đang đứng', 'có nhiều hoa', 'đang nhận hoa'], False),
                       (['anh nam', 'chị thu', 'anh ấy'], ['đang chúc mừng sinh nhật lan', 'đang chúc mừng lan', 'rất vui', 'đang đứng'], False),
                       (['anh nam và chị thu', 'họ', 'mọi người', 'bốn người'], ['đang chúc mừng sinh nhật lan', 'đang chúc mừng lan', 'rất vui', 'đang đứng'], True)],
             'pre': ['hôm nay', 'bây giờ'], 'post': ['hôm nay', 'bây giờ']}))
q += D(['thứ tiếng', 'thứ ba', 'ông bà', 'trung tâm', 'tuần trước', 'con gái', 'chuẩn bị', 'độc thân', 'lúc đó', 'quen'],
       ['Cô ấy nói được nhiều thứ tiếng.', 'Anh ấy đã đi công tác chưa chị?', 'Sinh nhật chị là ngày nào?', 'Anh là con thứ mấy trong gia đình?', 'Cô ấy đã có gia đình chưa?'])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM) 두 음절 낱말·문장(실제 2차 말하기가 발음 목록에서, 낱말 2.0음절·문장 6.4낱말 평균) (2026-10-13 밤)
build(NO, q)
