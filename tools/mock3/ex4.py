# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 4 — 8~10과 섞기 (할 수 있다·bao lâu·mới·đi/đừng · bao giờ·xong·đấy·đã … chưa · còn·cùng·khá·chứ)"""
from common3 import *
from a3_trap import A3T
NO = 4
q = []
q += [TF("xe tắc xi", "Đây là xe tắc xi.", "이것은 택시예요.", True),
      TF("đi chợ", "Đây là sách.", "이것은 책이에요.", False),
      TF("em trai", "Đây là ông của tôi.", "이분은 우리 할아버지예요.", False),
      TF("về hưu", "Ông ấy về hưu rồi.", "그분은 은퇴하셨어요.", True),
      TF("nghỉ hè", "Các em đang chơi ở biển.", "아이들이 바다에서 놀고 있어요.", True)]
q += PKS(NO, [("công viên", "Buổi sáng cô ấy tập thể dục ở công viên.", "아침에 그녀는 공원에서 운동해요.", "mock3-4-pa.webp"),
              ("học bài", "Cô ấy đang học bài.", "그녀는 공부하고 있어요.", "mock3-4-pb.webp"),
              ("bạn thân", "Cô ấy đang uống cà phê với bạn thân.", "그녀는 친한 친구와 커피를 마시고 있어요.", "mock3-4-pc.webp"),
              ("vé xe lửa", "Cô ấy đang mua vé xe lửa.", "그녀는 기차표를 사고 있어요.", "mock3-4-pd.webp"),
              ("xem phim", "Mười giờ đêm cô ấy xem phim.", "밤 10시에 그녀는 영화를 봐요.", "mock3-4-pe.webp")])   # 듣기 2 — 실제 2차 시험지처럼 한 사람의 다섯 장면(새로 그림, 2026-10-13)
q += A3T[4]   # 듣기 3 — 실제 시험처럼 오답 보기도 들리게 (tools/mock3/a3_trap.py, 2026-10-13)
q += [A4s("Chúng ta cùng đi [công viên] nhé.", "우리 같이 공원에 가요."),
      A4s("Tôi đã [đặt tour] xong rồi.", "저는 여행 상품 예약을 다 했어요."),
      A4s("Chị ấy viết được [tiếng Nhật].", "그녀는 일본어를 쓸 수 있어요."),
      A4s("Tối nay tôi có [hẹn] đấy.", "오늘 저녁에 나 약속 있거든요."),
      A4s("Bà ngoại tôi năm nay [70] tuổi.", "외할머니는 올해 일흔이세요."),
      A4d("Anh đi du lịch với ai?", "누구와 여행 가요?", "Với [gia đình] tôi.", "우리 가족이랑요.", 'mf'),
      A4d("Bao giờ anh đi Hà Nội?", "언제 하노이에 가요?", "Thứ [tư] tuần sau.", "다음 주 수요일이요.", 'mf'),
      A4d("Chị học tiếng Việt bao lâu rồi?", "베트남어 배운 지 얼마나 됐어요?", "Được [ba] năm rồi.", "3년 됐어요.", 'fm'),
      A4d("Anh có thích đi du lịch không?", "여행 좋아해요?", "Có, tôi thích đi [Huế] lắm.", "네, 후에에 가는 걸 아주 좋아해요.", 'mf'),
      A4d("Em đang làm gì vậy?", "뭐 하고 있어?", "Em đang viết [đơn] xin việc.", "입사 지원서를 쓰고 있어요.", 'fm')]
q += B1S(NO, ["đã từng", "xong", "cùng", "đừng", "bao giờ"], [
      ("Tôi ____ sống ở Seoul hai năm.", "đã từng", "저는 서울에서 2년 산 적이 있어요."),
      ("Tôi làm bài tập ____ rồi.", "xong", "숙제를 다 했어요."),
      ("Cuối tuần tôi và bạn thân ____ đi xem phim.", "cùng", "주말에 저와 친한 친구는 같이 영화를 보러 가요."),
      ("Chị ____ lo, tôi sẽ giúp chị.", "đừng", "걱정하지 마세요, 제가 도와드릴게요."),
      ("Anh đến Việt Nam ____?", "bao giờ", "베트남에 언제 왔어요?")])
q += [B2("Anh Hùng đã từng làm việc ở Nhật ba năm. Anh ấy nói được tiếng Nhật và tiếng Anh.", "훙 씨는 일본에서 3년 일한 적이 있어요. 일본어와 영어를 할 수 있어요.",
         "Anh Hùng nói được tiếng gì?", "훙 씨는 무슨 말을 할 수 있어요?", ["tiếng Nhật và tiếng Anh", "tiếng Hàn và tiếng Anh", "chỉ tiếng Nhật"]),
      B2("Chị Hoa mới học tiếng Việt hai tháng nên nói chưa giỏi. Nhưng chị ấy đọc được nhiều từ.", "호아 씨는 베트남어를 배운 지 두 달밖에 안 돼서 아직 말을 잘 못해요. 하지만 낱말은 많이 읽을 수 있어요.",
         "Chị Hoa học tiếng Việt bao lâu rồi?", "호아 씨는 베트남어를 배운 지 얼마나 됐어요?", ["hai tháng", "hai năm", "hai tuần"]),
      B2("Thứ năm tuần này anh Tuấn đi công tác ở Đà Nẵng. Anh ấy sẽ gặp khách hàng ở đó.", "이번 주 목요일에 뚜안 씨는 다낭으로 출장을 가요. 거기서 고객을 만날 거예요.",
         "Anh Tuấn đi Đà Nẵng để làm gì?", "뚜안 씨는 무엇을 하러 다낭에 가요?", ["để gặp khách hàng", "để đi du lịch", "để thăm bố mẹ"]),
      B2("Gia đình chị Mai có năm người. Chị ấy là con cả. Em trai út của chị ấy năm nay mười tám tuổi.", "마이 씨 가족은 다섯 명이에요. 마이 씨는 맏이예요. 막내 남동생은 올해 열여덟 살이에요.",
         "Em trai út của chị Mai bao nhiêu tuổi?", "마이 씨의 막내 남동생은 몇 살이에요?", ["mười tám tuổi", "mười sáu tuổi", "hai mươi tám tuổi"]),
      B2("Sinh nhật bà ngoại tôi là ngày 15 tháng 8. Năm nay cả gia đình sẽ cùng về quê chúc mừng sinh nhật bà.", "외할머니 생신은 8월 15일이에요. 올해는 온 가족이 함께 고향에 가서 할머니 생신을 축하할 거예요.",
         "Sinh nhật bà ngoại là ngày nào?", "외할머니 생신은 언제예요?", ["ngày 15 tháng 8", "ngày 8 tháng 5", "ngày 18 tháng 5"])]
T = [("Anh Nam đang viết đơn xin việc bằng tiếng Anh. Bạn anh ấy xem giúp anh ấy.", "남 씨는 영어로 입사 지원서를 쓰고 있어요. 친구가 봐 주고 있어요.",
      [("Anh Nam viết đơn bằng tiếng Việt.", "남 씨는 베트남어로 지원서를 써요.", False), ("Bạn anh Nam xem đơn giúp anh ấy.", "남 씨의 친구가 지원서를 봐 줘요.", True)]),
     ("Hôm qua chị Linh mới đi Hà Nội về. Chị ấy ở đó một tuần.", "링 씨는 어제 하노이에서 막 돌아왔어요. 거기서 일주일 있었어요.",
      [("Chị Linh ở Hà Nội một tuần.", "링 씨는 하노이에 일주일 있었어요.", True), ("Bây giờ chị Linh đang ở Hà Nội.", "지금 링 씨는 하노이에 있어요.", False)]),
     ("Tôi thường đi làm lúc 7 giờ. Nhưng hôm nay tôi đi làm trễ vì tối qua đi ngủ trễ.", "저는 보통 7시에 출근해요. 그런데 오늘은 어젯밤 늦게 자서 늦게 출근했어요.",
      [("Hôm nay tôi đi làm trễ.", "오늘 나는 늦게 출근했어요.", True), ("Tôi thường đi làm lúc 8 giờ.", "나는 보통 8시에 출근해요.", False)]),
     ("Anh Hải sống một mình. Bố mẹ anh ấy sống ở quê. Tháng nào anh ấy cũng về quê thăm bố mẹ.", "하이 씨는 혼자 살아요. 부모님은 고향에 사세요. 하이 씨는 달마다 고향에 가서 부모님을 뵈어요.",
      [("Anh Hải sống với bố mẹ.", "하이 씨는 부모님과 함께 살아요.", False), ("Anh Hải thường về quê.", "하이 씨는 자주 고향에 가요.", True)]),
     ("Lan có một chị gái và một em trai. Chị gái Lan đã lập gia đình. Còn em trai Lan là học sinh.", "란에게는 언니 한 명과 남동생 한 명이 있어요. 언니는 결혼했어요. 그리고 남동생은 학생이에요.",
      [("Chị gái Lan đã có gia đình.", "란의 언니는 결혼했어요.", True), ("Em trai Lan là sinh viên.", "란의 남동생은 대학생이에요.", False)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Anh nói được tiếng gì?", "무슨 말을 할 수 있어요?", "Tiếng Anh và một chút tiếng Việt.", "영어하고 베트남어 조금이요."),
              ("Anh ở Việt Nam bao lâu rồi?", "베트남에 있은 지 얼마나 됐어요?", "Hơn hai năm.", "2년 넘었어요."),
              ("Bao giờ anh về nước?", "언제 귀국해요?", "Cuối năm nay.", "올해 말이요."),
              ("Hôm nay tôi mệt quá.", "오늘 너무 피곤해요.", "Vậy anh về nhà nghỉ đi.", "그럼 집에 가서 쉬어요."),
              ("Anh đã ăn trưa chưa?", "점심 먹었어요?", "Chưa, tôi còn bận.", "아직이요, 아직 바빠요."),
              ("Sinh nhật chị là ngày nào?", "생일이 언제예요?", "Ngày 2 tháng 9.", "9월 2일이요."),
              ("Tôi không hiểu từ này.", "이 낱말을 모르겠어요.", "Để tôi giải thích cho anh.", "제가 설명해 드릴게요."),
              ("Chủ nhật này đi xem phim không?", "이번 일요일에 영화 보러 갈래요?", "Đi chứ!", "가야죠!"),
              ("Mai là sinh nhật vợ tôi.", "내일은 아내 생일이에요.", "Anh đã chuẩn bị gì chưa?", "뭐 준비했어요?"),
              ("Anh đi Đà Nẵng bằng gì?", "다낭에 무엇을 타고 가요?", "Bằng máy bay.", "비행기로요.")])
q += [C1("Anh ấy nói được ba thứ tiếng.", "그는 세 나라 말을 할 수 있어요.", ["nói được", "anh ấy", "thứ tiếng", "ba"]),
      C1("Tôi mới học tiếng Việt một tháng.", "저는 베트남어를 배운 지 한 달밖에 안 됐어요.", ["một tháng", "tôi", "tiếng Việt", "mới học"]),
      C1("Chị đừng lo nhé.", "걱정하지 마세요.", ["nhé", "chị", "lo", "đừng"]),
      C1("Bao giờ anh đi Huế?", "언제 후에에 가요?", ["Huế", "anh", "bao giờ", "đi"]),
      C1("Chúng ta cùng ăn tối đi.", "우리 같이 저녁 먹어요.", ["ăn tối", "chúng ta", "đi", "cùng"])]
q += [C2("Anh ấy được nói tiếng Hàn.", "Anh ấy nói được tiếng Hàn.", "그는 한국어를 할 수 있어요. (được 은 동사 뒤)", ["Anh ấy có thể nói tiếng Hàn.", "Anh ấy nói tiếng Hàn được."]),
      C2("Bao giờ chị đã đi Hà Nội?", "Chị đã đi Hà Nội bao giờ?", "언제 하노이에 갔었어요? (지난 일의 bao giờ 는 끝에)", ["Chị đi Hà Nội bao giờ?"]),
      C2("Chị ấy mới đến Việt Nam hai tuần.", "Chị ấy mới đến Việt Nam hai tuần.", "그녀는 베트남에 온 지 2주밖에 안 됐어요.", dung=True),
      C2("Anh ấy bao lâu làm việc ở đó?", "Anh ấy làm việc ở đó bao lâu?", "그는 거기서 얼마나 일했어요? (bao lâu 는 끝에)"),
      C2("Hôm qua tôi làm xong bài tập rồi.", "Hôm qua tôi làm xong bài tập rồi.", "어제 숙제를 다 했어요.", dung=True)]
q.append(C3("mock3-4-w3.webp",
            [("Gia đình anh Hùng có ba người.", "훙 씨 가족은 세 명이에요."), ("Họ đang ở ga Hà Nội.", "그들은 하노이역에 있어요."),
             ("Anh Hùng đang xem vé.", "훙 씨는 표를 보고 있어요."), ("Chị Lan và bé Bin đang chờ xe lửa.", "란 씨와 빈은 기차를 기다리고 있어요."), ("Họ sắp đi du lịch.", "그들은 곧 여행을 떠나요.")],
            {'say': ['đây là một gia đình', 'gia đình anh hùng có ba người', 'có ba người', 'gia đình có ba người', 'họ là một gia đình', 'đây là ga hà nội', 'họ đang ở ga hà nội',
                     'gia đình này có bố mẹ và con trai', 'có bố mẹ và một con trai', 'xe lửa đang đến', 'họ có vé xe lửa', 'bé bin là con trai của anh hùng', 'chị lan là vợ của anh hùng'],
             'facts': [(['gia đình anh hùng', 'gia đình này', 'họ', 'mọi người', 'ba người'], ['đang chờ xe lửa', 'sắp đi du lịch', 'đang đi du lịch', 'sắp đi xe lửa', 'đi xe lửa', 'đang ở ga hà nội', 'rất vui'], True),
                       (['anh hùng', 'anh ấy', 'bố', 'người bố'], ['đang xem vé', 'đang đứng', 'đang chờ xe lửa', 'có vé', 'có vé xe lửa'], False),
                       (['chị lan', 'chị ấy', 'mẹ', 'người mẹ'], ['đang đứng', 'đang chờ xe lửa', 'rất đẹp'], False),
                       (['bé bin', 'con trai', 'em bé', 'em ấy'], ['còn nhỏ', 'đang đứng', 'rất vui', 'đang chờ xe lửa'], False),
                       (['chị lan và bé bin', 'mẹ và bé bin', 'hai mẹ con'], ['đang đứng', 'đang chờ xe lửa'], True)],
             'pre': ['bây giờ', 'hôm nay', 'cuối tuần'], 'post': ['bây giờ', 'hôm nay', 'ở ga hà nội']}))
q += D(["viết", "xin", "tháng này", "du lịch", "ba mẹ", "chồng", "kết hôn", "em gái", "tuần sau", "nhớ"],
       ["Tôi đã từng làm việc ở Pháp.", "Hôm nay là thứ mấy?", "Tôi đặt xong rồi.", "Chị đặt tour du lịch chưa?", "Cô ấy đã có gia đình chưa?"])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM 새 낱말·문장)에서 (2차 시험 말하기가 그 범위 발음 목록에서 나옴, 2026-10-13)
build(NO, q)
