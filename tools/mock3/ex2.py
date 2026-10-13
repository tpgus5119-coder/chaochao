# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 2 — 날짜·일정 (교재 1권 9과 중심: thứ·ngày tháng · bao giờ · xong · 끝말 đấy · đã … chưa)"""
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
q += [A4s("Thứ [hai] tuần sau tôi đi Nha Trang.", "다음 주 월요일에 저는 나트랑에 가요."),
      A4s("Ngày mai tôi đi [Huế] đấy!", "내일 저 후에에 가요!"),
      A4s("Chị ấy [làm việc] xong rồi.", "그녀는 일을 다 끝냈어요."),
      A4s("Sinh nhật của tôi là ngày [15] tháng 3.", "제 생일은 3월 15일이에요."),
      A4s("Anh ấy đi công tác ở Hà Nội [bốn] ngày.", "그는 하노이로 나흘 동안 출장을 가요."),
      A4d("Em đã ăn trưa chưa?", "점심 먹었니?", "Dạ, em ăn [cơm] rồi.", "네, 먹었어요.", 'mf'),
      A4d("Hôm qua là thứ mấy?", "어제는 무슨 요일이었어요?", "Hôm qua là [chủ nhật].", "어제는 일요일이었어요.", 'fm'),
      A4d("Bao giờ chị về nước?", "언제 귀국해요?", "Tháng [12] năm nay.", "올해 12월이요.", 'mf'),
      A4d("Anh định đi du lịch ở đâu?", "어디로 여행 갈 생각이에요?", "Tôi định đi [Đà Nẵng].", "다낭에 갈 생각이에요.", 'fm'),
      A4d("Chị chuẩn bị xong chưa?", "준비 다 됐어요?", "Chưa, chờ tôi [một chút].", "아직이요, 잠깐만 기다려요.", 'mf')]
q += B1S(NO, ["bao giờ", "xong", "đấy", "chưa", "khó tính"], [
      ("____ anh đi công tác?", "bao giờ", "언제 출장 가요?"),
      ("Tôi ăn sáng ____ rồi.", "xong", "저는 아침을 다 먹었어요."),
      ("Ngày mai là chủ nhật ____!", "đấy", "내일은 일요일이에요!"),
      ("Tôi ____ gặp khách hàng đó.", "chưa", "저는 그 고객을 아직 못 만났어요."),
      ("Khách hàng đó hơi ____.", "khó tính", "그 고객은 좀 까다로워요.")])
q += [B2("Thứ hai tuần sau chị Kate và chị Loan sẽ đi du lịch ở Nha Trang ba ngày.", "다음 주 월요일에 케이트 씨와 로안 씨는 나트랑으로 사흘 동안 여행을 가요.",
         "Họ đi du lịch mấy ngày?", "그들은 며칠 동안 여행을 가요?", ["ba ngày", "hai ngày", "một tuần"]),
      B2("Hà không thích thứ hai vì ngày đầu tuần Hà luôn cảm thấy mệt và buồn ngủ.", "하는 월요일을 좋아하지 않아요. 한 주의 첫날에는 늘 피곤하고 졸리기 때문이에요.",
         "Sao Hà không thích thứ hai?", "하는 왜 월요일을 좋아하지 않아요?", ["vì Hà thấy mệt và buồn ngủ", "vì Hà phải đi chợ", "vì Hà có hẹn"]),
      B2("Tối thứ ba, tối thứ năm và tối thứ bảy chị Hà học tiếng Nhật ở trung tâm ngoại ngữ.", "화요일·목요일·토요일 저녁에 하 씨는 외국어 학원에서 일본어를 배워요.",
         "Chị Hà học tiếng Nhật ở đâu?", "하 씨는 어디에서 일본어를 배워요?", ["ở trung tâm ngoại ngữ", "ở trường đại học", "ở nhà"]),
      B2("Anh Brian đã đặt tour du lịch cho ba mẹ. Họ sẽ đi Đà Nẵng một tuần.", "브라이언 씨는 부모님을 위해 여행 상품을 예약했어요. 부모님은 일주일 동안 다낭에 가요.",
         "Ai đặt tour du lịch?", "누가 여행 상품을 예약했어요?", ["anh Brian", "ba mẹ anh Brian", "chị Vân"]),
      B2("Chị Vân đi công tác ở Hà Nội bốn ngày. Chị ấy trở lại Thành phố Hồ Chí Minh vào thứ hai.", "번 씨는 하노이로 나흘 동안 출장을 갔어요. 월요일에 호찌민시로 돌아와요.",
         "Bao giờ chị Vân trở lại Thành phố Hồ Chí Minh?", "번 씨는 언제 호찌민시로 돌아와요?", ["thứ hai", "thứ tư", "chủ nhật"])]
T = [("Hôm nay là thứ sáu. Ngày mai anh Hùng có hẹn với bạn ở quán cà phê.", "오늘은 금요일이에요. 내일 훙 씨는 카페에서 친구와 약속이 있어요.",
      [("Ngày mai là thứ bảy.", "내일은 토요일이에요.", True), ("Anh Hùng có hẹn ở nhà hàng.", "훙 씨는 식당에서 약속이 있어요.", False)]),
     ("Tháng 12 anh Nam sẽ đi Thái Lan để làm việc. Anh ấy đã làm ở Việt Nam ba năm rồi.", "12월에 남 씨는 일하러 태국에 가요. 베트남에서 3년 일했어요.",
      [("Anh Nam đi Thái Lan để du lịch.", "남 씨는 여행하러 태국에 가요.", False), ("Anh Nam đã làm việc ở Việt Nam ba năm.", "남 씨는 베트남에서 3년 일했어요.", True)]),
     ("Em gái tôi đặt vé xe lửa đi Hà Nội trên mạng. Em ấy đặt xong rồi.", "제 여동생은 인터넷으로 하노이행 기차표를 예약했어요. 예약을 다 끝냈어요.",
      [("Em gái tôi đã đặt vé xong.", "제 여동생은 표 예약을 끝냈어요.", True), ("Em ấy đặt vé máy bay.", "여동생은 비행기 표를 예약했어요.", False)]),
     ("Chủ nhật tuần trước là sinh nhật mẹ tôi. Gia đình tôi đi ăn tối ở nhà hàng.", "지난주 일요일은 어머니 생신이었어요. 우리 가족은 식당에 저녁을 먹으러 갔어요.",
      [("Sinh nhật mẹ tôi là chủ nhật tuần trước.", "어머니 생신은 지난주 일요일이었어요.", True), ("Gia đình tôi ăn tối ở nhà hàng.", "우리 가족은 식당에서 저녁을 먹었어요.", True)]),
     ("Chị Lan thường đến công ty muộn vào thứ hai vì chủ nhật chị ấy hay thức khuya.", "란 씨는 일요일에 자주 늦게까지 깨어 있어서 월요일에 회사에 자주 늦어요.",
      [("Chị Lan đến công ty sớm vào thứ hai.", "란 씨는 월요일에 회사에 일찍 가요.", False), ("Chủ nhật chị Lan không thức khuya.", "란 씨는 일요일에 늦게까지 깨어 있지 않아요.", False)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Bao giờ anh đi Hà Nội?", "언제 하노이에 가요?", "Thứ năm tuần này.", "이번 주 목요일이요."),
              ("Sinh nhật chị là ngày nào?", "생일이 언제예요?", "Ngày 20 tháng 8.", "8월 20일이요."),
              ("Anh làm việc xong chưa?", "일 다 끝났어요?", "Chưa, tôi chưa làm xong.", "아니요, 아직 다 못 했어요."),
              ("Anh ấy đi công tác bao lâu?", "그는 얼마 동안 출장 가요?", "Bốn ngày.", "나흘이요."),
              ("Hôm nay là sinh nhật tôi.", "오늘 제 생일이에요.", "Thế à? Chúc mừng sinh nhật!", "그래요? 생일 축하해요!"),
              ("Tôi quên sinh nhật mẹ rồi.", "엄마 생신을 잊어버렸어요.", "Trời ơi! Anh gọi cho mẹ đi!", "세상에! 엄마한테 전화해요!"),
              ("Cuối tuần này anh có rảnh không?", "이번 주말에 시간 있어요?", "Không, tôi có hẹn với bạn rồi.", "아니요, 친구와 약속이 있어요."),
              ("Ba mẹ anh đến Việt Nam du lịch à?", "부모님이 베트남에 여행 오세요?", "Ừ, ba mẹ tôi muốn đi Nha Trang.", "응, 부모님은 나트랑에 가고 싶어 하셔."),
              ("Tôi sắp đi công tác ở Đà Nẵng.", "저 곧 다낭으로 출장 가요.", "Bao giờ anh đi?", "언제 가요?"),
              ("Chúng ta đi bằng xe lửa hay máy bay?", "우리 기차로 가요, 비행기로 가요?", "Đi bằng xe lửa nhé, rẻ hơn.", "기차로 가요, 더 싸요.")])
q += [C1("Bao giờ chị đi Nha Trang?", "언제 나트랑에 가요?", ["đi", "bao giờ", "Nha Trang", "chị"], ["Chị đi Nha Trang bao giờ?"]),
      C1("Chị ấy nấu ăn xong rồi.", "그녀는 요리를 다 했어요.", ["xong", "chị ấy", "rồi", "nấu ăn"]),
      C1("Hôm qua là thứ tư.", "어제는 수요일이었어요.", ["thứ tư", "là", "hôm qua"], ["Thứ tư là hôm qua."]),
      C1("Anh ấy đã đi công tác chưa?", "그는 출장을 갔어요?", ["chưa", "anh ấy", "đi công tác", "đã"]),
      C1("Chủ nhật tuần trước là sinh nhật tôi.", "지난주 일요일이 제 생일이었어요.", ["sinh nhật", "chủ nhật", "là", "tôi", "tuần trước"], ["Sinh nhật tôi là chủ nhật tuần trước."])]
q += [C2("Chị ấy đã gọi điện thoại cho khách hàng rồi chưa?", "Chị ấy đã gọi điện thoại cho khách hàng chưa?", "그녀는 고객에게 전화했어요? (rồi 와 chưa 를 함께 쓰지 않는다)", ["Chị ấy gọi điện thoại cho khách hàng chưa?"]),
      C2("Tôi xong làm bài tập rồi.", "Tôi làm bài tập xong rồi.", "저는 숙제를 다 했어요. (xong 은 동사 뒤)", ["Tôi làm xong bài tập rồi."]),
      C2("Bao giờ anh về nước?", "Bao giờ anh về nước?", "언제 귀국해요?", dung=True),
      C2("Sinh nhật tôi là tháng 8 ngày 20.", "Sinh nhật tôi là ngày 20 tháng 8.", "제 생일은 8월 20일이에요. (날짜는 일 → 월 차례)"),
      C2("Ngày mai là thứ bảy đấy.", "Ngày mai là thứ bảy đấy.", "내일은 토요일이에요.", dung=True)]
q.append(C3("mock3-2-w3.webp",
            [("Hôm nay là sinh nhật của Lan.", "오늘은 란의 생일이에요."), ("Chị Hoa đang tặng hoa cho Lan.", "호아 씨가 란에게 꽃을 주고 있어요."),
             ("Anh Nam và chị Thu đang chúc mừng sinh nhật Lan.", "남 씨와 투 씨가 란의 생일을 축하하고 있어요."), ("Có bốn người.", "네 사람이 있어요."), ("Họ rất vui.", "그들은 아주 즐거워요.")],
            {'say': ['hôm nay là sinh nhật lan', 'hôm nay là sinh nhật của lan', 'có bốn người', 'họ rất vui', 'mọi người rất vui', 'lan rất vui', 'có một cái bánh sinh nhật', 'đây là bữa tiệc sinh nhật'],
             'facts': [(['chị hoa', 'chị ấy'], ['đang tặng hoa cho lan', 'tặng hoa cho lan', 'đang tặng hoa', 'đang chúc mừng sinh nhật lan', 'rất vui'], False),
                       (['lan', 'em ấy', 'cô ấy'], ['rất vui', 'đang cười', 'đang đứng', 'có nhiều hoa', 'đang nhận hoa'], False),
                       (['anh nam', 'chị thu', 'anh ấy'], ['đang chúc mừng sinh nhật lan', 'đang chúc mừng lan', 'rất vui', 'đang đứng'], False),
                       (['anh nam và chị thu', 'họ', 'mọi người', 'bốn người'], ['đang chúc mừng sinh nhật lan', 'đang chúc mừng lan', 'rất vui', 'đang đứng'], True)],
             'pre': ['hôm nay', 'bây giờ'], 'post': ['hôm nay', 'bây giờ']}))
q += D(["thứ tư", "cuối tuần", "tuần trước", "đi công tác", "chuẩn bị", "khách hàng", "chúc mừng", "lúc đó", "đặt tour", "thứ mấy"],
       ["Anh ấy đã đi công tác chưa chị?", "Chúc mừng sinh nhật anh!", "Chủ nhật tuần trước đấy!", "Tôi có hẹn với bạn rồi.", "Thứ ba tuần sau ba mẹ tôi đến Việt Nam."])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM 새 낱말·문장)에서 (2차 시험 말하기가 그 범위 발음 목록에서 나옴, 2026-10-13)
build(NO, q)
