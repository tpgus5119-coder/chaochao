# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 5 — 8~10과 섞기 2 (được·không V được · mới · bao lâu · đừng · đi · đã … chưa · xong · còn · khá · 가족)"""
from common3 import *
NO = 5
q = []
q += [TF("tặng", "Anh ấy đang ăn cơm.", "그는 밥을 먹고 있어요.", False),
      TF("vợ", "Đây là vợ tôi.", "이 사람은 제 아내예요.", True),
      TF("sống một mình", "Anh ấy sống một mình.", "그는 혼자 살아요.", True),
      TF("con trai", "Đây là con gái tôi.", "이 아이는 제 딸이에요.", False),
      TF("đơn", "Đây là đơn xin việc.", "이것은 입사 지원서예요.", True)]
q += PKS(NO, [("dọn dẹp", "Anh ấy đang dọn dẹp phòng.", "그는 방을 청소하고 있어요.", "mock3-5-pa.webp"),
              ("nghe nhạc", "Anh ấy đang nghe nhạc.", "그는 음악을 듣고 있어요.", "mock3-5-pb.webp"),
              ("đi dạo", "Anh ấy đang đi dạo ở biển.", "그는 바닷가를 산책하고 있어요.", "mock3-5-pc.webp"),
              ("ngủ", "Anh ấy đang ngủ.", "그는 자고 있어요.", "mock3-5-pd.webp"),
              ("làm việc", "Anh ấy đang làm việc ở công ty.", "그는 회사에서 일하고 있어요.", "mock3-5-pe.webp")])   # 듣기 2 — 실제 2차 시험지처럼 한 사람의 다섯 장면(새로 그림, 2026-10-13)
q += [A3s("Anh Tom nói được mấy thứ tiếng?", "톰 씨는 몇 나라 말을 할 수 있어요?", "Anh Tom nói được tiếng Anh, tiếng Pháp và tiếng Việt.", "톰 씨는 영어, 프랑스어, 베트남어를 할 수 있어요.", ["ba thứ tiếng", "hai thứ tiếng", "bốn thứ tiếng"]),
      A3s("Tôi đã làm ở công ty này bao lâu?", "나는 이 회사에서 얼마나 일했어요?", "Tôi đã làm việc ở công ty này được năm năm.", "저는 이 회사에서 일한 지 5년 됐어요.", ["năm năm", "năm tháng", "một năm"]),
      A3s("Chủ nhật tuần trước tôi đi thăm ai?", "지난주 일요일에 나는 누구를 찾아갔어요?", "Chủ nhật tuần trước tôi cùng vợ đi thăm bố mẹ.", "지난주 일요일에 저는 아내와 함께 부모님을 뵈러 갔어요.", ["bố mẹ", "bạn thân", "khách hàng"]),
      A3s("Em trai tôi về nước bao giờ?", "남동생은 언제 귀국했어요?", "Em trai tôi mới về nước tuần trước.", "남동생은 지난주에 막 귀국했어요.", ["tuần trước", "tháng trước", "hôm qua"]),
      A3s("Ngày mai là thứ mấy?", "내일은 무슨 요일이에요?", "Ngày mai là thứ năm, ngày 15 tháng 10.", "내일은 목요일, 10월 15일이에요.", ["thứ năm", "thứ tư", "thứ sáu"]),
      A3d("Chị ấy có ai?", "그녀에게는 누가 있어요?", [("Chị có anh chị em không?", "형제 있어요?"), ("Có, tôi có một anh trai.", "네, 오빠가 한 명 있어요.")], ["một anh trai", "một em gái", "không có ai"], 'fm'),
      A3d("Anh ấy còn ở Hà Nội bao lâu nữa?", "그는 하노이에 얼마나 더 있어요?", [("Anh còn ở Hà Nội bao lâu nữa?", "하노이에 얼마나 더 있어요?"), ("Khoảng một tuần nữa.", "일주일쯤 더요.")], ["khoảng một tuần nữa", "khoảng một tháng nữa", "hai ngày nữa"], 'mf'),
      A3d("Em ấy làm bài tập chưa?", "그 아이는 숙제를 했어요?", [("Em làm bài tập xong chưa?", "숙제 다 했어?"), ("Em làm xong rồi.", "다 했어요.")], ["xong rồi", "chưa xong", "chưa làm"], 'fm'),
      A3d("Chị ấy nói tiếng Anh thế nào?", "그녀는 영어를 어떻게 해요?", [("Chị nói tiếng Anh được không?", "영어 할 수 있어요?"), ("Được, nhưng không giỏi lắm.", "네, 하지만 아주 잘하지는 못해요.")], ["được nhưng không giỏi", "rất giỏi", "không nói được"], 'mf'),
      A3d("Tại sao hôm nay anh ấy vui?", "왜 오늘 그는 기뻐요?", [("Sao hôm nay anh vui thế?", "오늘 왜 이렇게 기뻐요?"), ("Hôm nay là sinh nhật tôi.", "오늘 제 생일이에요.")], ["vì là sinh nhật anh ấy", "vì gặp bạn thân", "vì đi du lịch"], 'fm')]
q += [A4s("Tôi mới học tiếng Hàn [ba] tháng.", "저는 한국어를 배운 지 석 달밖에 안 됐어요."),
      A4s("Chị đừng [lo lắng] quá.", "너무 걱정하지 마세요."),
      A4s("Món này khá [ngon].", "이 음식은 꽤 맛있어요."),
      A4s("Anh ấy là [con út] trong gia đình.", "그는 집에서 막내예요."),
      A4s("Thứ năm này tôi đi [Đà Nẵng].", "이번 목요일에 저는 다낭에 가요."),
      A4d("Chị đi chợ chưa?", "장 보러 갔어요?", "Chưa, [chiều nay] tôi đi.", "아직이요, 오늘 오후에 가요.", 'mf'),
      A4d("Anh làm ở đây bao lâu rồi?", "여기서 일한 지 얼마나 됐어요?", "Hơn [hai] năm rồi.", "2년 넘었어요.", 'mf'),
      A4d("Chị có mấy con?", "자녀가 몇이에요?", "Tôi có một [con trai].", "아들 하나 있어요.", 'fm'),
      A4d("Bao giờ chị về quê?", "언제 고향에 가요?", "[Chủ nhật] này.", "이번 일요일이요.", 'mf'),
      A4d("Anh ấy viết tiếng Việt được không?", "그는 베트남어를 쓸 수 있어요?", "Được, anh ấy viết rất [tốt].", "네, 아주 잘 써요.", 'fm')]
q += B1S(NO, ["được", "mới", "đi", "còn", "khá"], [
      ("Tôi nói ____ tiếng Việt một chút.", "được", "저는 베트남어를 조금 할 수 있어요."),
      ("Anh ấy ____ về nước hôm qua.", "mới", "그는 어제 막 귀국했어요."),
      ("Trễ rồi, chúng ta về nhà ____!", "đi", "늦었어요, 우리 집에 가요!"),
      ("Tôi là giáo viên, ____ vợ tôi là bác sĩ.", "còn", "저는 교사이고, 제 아내는 의사예요."),
      ("Phòng này ____ đẹp.", "khá", "이 방은 꽤 예뻐요.")])
q += [B2("Chị Mai là giáo viên tiếng Anh. Chị ấy dạy ở một trung tâm ngoại ngữ ở Quận 1.", "마이 씨는 영어 교사예요. 1군에 있는 어학원에서 가르쳐요.",
         "Chị Mai dạy ở đâu?", "마이 씨는 어디에서 가르쳐요?", ["ở trung tâm ngoại ngữ", "ở bệnh viện", "ở công ty"]),
      B2("Anh Long mới đến Hà Nội tháng trước. Anh ấy chưa quen nên thấy hơi khó.", "롱 씨는 지난달에 하노이에 막 왔어요. 아직 익숙하지 않아서 좀 어렵게 느껴요.",
         "Anh Long đến Hà Nội bao giờ?", "롱 씨는 언제 하노이에 왔어요?", ["tháng trước", "tuần trước", "năm trước"]),
      B2("Thứ hai tuần sau là sinh nhật vợ tôi. Tôi muốn mua hoa tặng vợ.", "다음 주 월요일은 아내 생일이에요. 아내에게 꽃을 사 주고 싶어요.",
         "Tôi muốn tặng gì cho vợ?", "나는 아내에게 무엇을 선물하고 싶어요?", ["hoa", "sách", "cà phê"]),
      B2("Gia đình anh Nam có bốn người: bố mẹ, anh Nam và một em gái. Em gái anh Nam nhỏ hơn anh ấy năm tuổi.", "남 씨 가족은 네 명이에요. 부모님, 남 씨, 여동생 한 명이에요. 여동생은 남 씨보다 다섯 살 어려요.",
         "Em gái anh Nam nhỏ hơn anh ấy mấy tuổi?", "남 씨의 여동생은 남 씨보다 몇 살 어려요?", ["năm tuổi", "bốn tuổi", "hai tuổi"]),
      B2("Lớp tiếng Việt bắt đầu lúc 9 giờ sáng thứ ba và thứ năm. Mỗi buổi học hai tiếng.", "베트남어 수업은 화요일과 목요일 아침 9시에 시작해요. 한 번에 두 시간 공부해요.",
         "Mỗi buổi học bao lâu?", "수업은 한 번에 얼마 동안 해요?", ["hai tiếng", "một tiếng", "ba tiếng"])]
T = [("Anh Kim nói được tiếng Việt nhưng chưa viết được.", "김 씨는 베트남어를 말할 수는 있지만 아직 쓰지는 못해요.",
      [("Anh Kim viết được tiếng Việt.", "김 씨는 베트남어를 쓸 수 있어요.", False), ("Anh Kim nói được tiếng Việt.", "김 씨는 베트남어를 말할 수 있어요.", True)]),
     ("Hôm nay chị Hà không đi làm. Chị ấy ở nhà nấu ăn cho cả gia đình.", "오늘 하 씨는 출근하지 않아요. 집에서 온 가족을 위해 요리해요.",
      [("Hôm nay chị Hà đi làm.", "오늘 하 씨는 출근해요.", False), ("Hôm nay chị Hà ở nhà.", "오늘 하 씨는 집에 있어요.", True)]),
     ("Tôi và bạn thân cùng tuổi. Chúng tôi đều là sinh viên năm thứ hai.", "저와 친한 친구는 동갑이에요. 우리 둘 다 2학년 대학생이에요.",
      [("Bạn thân tôi lớn hơn tôi.", "제 친한 친구는 저보다 나이가 많아요.", False), ("Tôi và bạn thân đều là sinh viên.", "저와 친한 친구는 둘 다 대학생이에요.", True)]),
     ("Ông bà tôi đã về hưu. Bây giờ ông bà sống ở quê.", "할아버지와 할머니는 은퇴하셨어요. 지금은 고향에 사세요.",
      [("Ông bà tôi còn làm việc.", "할아버지와 할머니는 아직 일하세요.", False), ("Ông bà tôi sống ở quê.", "할아버지와 할머니는 고향에 사세요.", True)]),
     ("Tuần sau chị Thu đi công tác ở Huế ba ngày. Chị ấy đã đặt vé máy bay rồi.", "다음 주에 투 씨는 후에로 사흘 동안 출장을 가요. 비행기 표는 벌써 예약했어요.",
      [("Chị Thu đã đặt vé máy bay.", "투 씨는 비행기 표를 예약했어요.", True), ("Chị Thu đi công tác một tuần.", "투 씨는 일주일 동안 출장을 가요.", False)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Tôi nói được một chút tiếng Việt.", "저는 베트남어를 조금 할 수 있어요.", "Chị nói giỏi lắm!", "잘하시는데요!"),
              ("Chị đến Việt Nam bao giờ?", "베트남에 언제 왔어요?", "Năm trước.", "작년에요."),
              ("Chị học tiếng Việt ở đâu?", "베트남어를 어디서 배워요?", "Ở trung tâm ngoại ngữ.", "어학원에서요."),
              ("Tối nay anh rảnh không?", "오늘 저녁에 한가해요?", "Không, tối nay tôi có hẹn.", "아니요, 오늘 저녁엔 약속이 있어요."),
              ("Chị có gia đình chưa?", "결혼했어요?", "Rồi, tôi có hai con.", "네, 아이가 둘 있어요."),
              ("Tôi đi làm trễ rồi!", "저 회사에 늦었어요!", "Đừng lo, anh đi tắc xi đi.", "걱정 마요, 택시 타고 가요."),
              ("Chị gái tôi là bác sĩ.", "언니는 의사예요.", "Còn chị, chị làm nghề gì?", "그럼 당신은 무슨 일을 해요?"),
              ("Ai nấu ăn ở nhà chị?", "집에서 누가 요리해요?", "Chồng tôi.", "남편이요."),
              ("Mấy giờ anh đi làm?", "몇 시에 출근해요?", "Bảy giờ sáng.", "아침 7시요."),
              ("Anh đi Hà Nội với ai?", "누구와 하노이에 가요?", "Với vợ tôi.", "아내와요.")])
q += [C1("Tôi không nói được tiếng Pháp.", "저는 프랑스어를 못 해요.", ["tiếng Pháp", "không", "tôi", "nói được"]),
      C1("Anh ấy mới đi Hà Nội về.", "그는 하노이에서 막 돌아왔어요.", ["về", "anh ấy", "đi Hà Nội", "mới"]),
      C1("Chúng tôi cùng làm việc ở đây.", "우리는 여기서 같이 일해요.", ["ở đây", "chúng tôi", "làm việc", "cùng"]),
      C1("Em gái tôi khá cao.", "제 여동생은 키가 꽤 커요.", ["cao", "em gái", "khá", "tôi"]),
      C1("Anh đã đặt vé chưa?", "표 예약했어요?", ["chưa", "anh", "đặt vé", "đã"])]
q += [C2("Tôi nói không tiếng Việt được.", "Tôi không nói được tiếng Việt.", "저는 베트남어를 못 해요. (không 은 동사 앞)", ["Tôi không nói tiếng Việt được.", "Tôi nói tiếng Việt không được."]),
      C2("Chị lo đừng nhé.", "Chị đừng lo nhé.", "걱정하지 마세요. (đừng 은 동사 앞)"),
      C2("Chị ấy đi Hà Nội mới về.", "Chị ấy mới đi Hà Nội về.", "그녀는 하노이에서 막 돌아왔어요. (mới 는 동사 앞)"),
      C2("Bố mẹ tôi còn làm việc.", "Bố mẹ tôi còn làm việc.", "우리 부모님은 아직 일하세요.", dung=True),
      C2("Chúng ta đi ăn trưa đi.", "Chúng ta đi ăn trưa đi.", "우리 점심 먹으러 가요.", dung=True)]
q.append(C3("mock3-5-w3.webp",
            [("Gia đình này có bốn người.", "이 가족은 네 명이에요."), ("Bà đang ngồi xem tivi.", "할머니는 앉아서 텔레비전을 보고 계세요."),
             ("Bố đang nấu ăn.", "아버지는 요리하고 있어요."), ("Bé Na đang làm bài tập.", "나는 숙제를 하고 있어요."), ("Mẹ đang gọi điện thoại.", "어머니는 전화하고 있어요.")],
            {'say': ['đây là một gia đình', 'đây là gia đình tôi', 'gia đình tôi có bốn người', 'có bốn người', 'gia đình có bốn người', 'họ là một gia đình', 'họ đang ở nhà', 'gia đình này đang ở nhà',
                     'gia đình này có bà bố mẹ và bé na', 'có bà bố mẹ và một con gái'],
             'facts': [(['gia đình này', 'gia đình tôi', 'họ', 'mọi người', 'cả gia đình', 'bốn người'], ['đang ở nhà', 'ở nhà'], True),
                       (['bà', 'bà tôi', 'bà ấy', 'người bà'], ['đang ngồi', 'đang xem tivi', 'đang ngồi xem tivi', 'lớn tuổi', 'đã về hưu'], False),
                       (['bố', 'bố tôi', 'người bố', 'anh ấy'], ['đang nấu ăn', 'đang nấu cơm', 'đang đứng', 'nấu ăn'], False),
                       (['bé na', 'con gái', 'em bé', 'em gái tôi', 'em ấy'], ['đang làm bài tập', 'đang học', 'đang viết', 'làm bài tập', 'đang học bài'], False),
                       (['mẹ', 'mẹ tôi', 'người mẹ', 'chị ấy'], ['đang gọi điện thoại', 'đang nói chuyện điện thoại', 'đang ngồi', 'gọi điện thoại'], False)],
             'pre': ['bây giờ', 'hôm nay', 'buổi tối', 'tối nay', 'ở nhà'], 'post': ['ở nhà', 'bây giờ', 'hôm nay']}))
q += D(["bằng", "giùm", "đọc", "sai", "muộn", "hẹn", "con gái", "từ từ", "mất", "anh trai"],
       ["Anh ấy nói được tiếng gì?", "Đây, chị xem đi!", "Bao giờ chị đi?", "Tôi là con một.", "Em trai út anh năm nay bao nhiêu tuổi?"])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM 새 낱말·문장)에서 (2차 시험 말하기가 그 범위 발음 목록에서 나옴, 2026-10-13)
build(NO, q)
