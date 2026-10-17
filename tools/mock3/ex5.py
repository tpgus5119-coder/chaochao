# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 재료 5 — 8~10과 섞기 2 (được·không V được · mới · bao lâu · đừng · đi · đã … chưa · xong · còn · khá · 가족). **빌드는 mix.py**. 수치 기준은 ex1.py 머리글과 tools/mock3/metrics.py (2026-10-13 밤 다시 씀)."""
from common3 import *
from a3_trap import A3T
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
q += A3T[5]   # 듣기 3 — 실제 시험처럼 오답 보기도 들리게 (tools/mock3/a3_trap.py, 2026-10-13)
q += [A4s("Tôi mới học tiếng Hàn [ba] tháng.", "저는 한국어를 배운 지 석 달밖에 안 됐어요."),
      A4s("Chị đừng [lo lắng] quá, em làm được.", "너무 걱정하지 마세요, 제가 할 수 있어요."),
      A4s("Món ăn Ấn Độ này khá [ngon].", "이 인도 음식은 꽤 맛있어요."),
      A4s("Anh ấy là [con út] trong gia đình.", "그는 집에서 막내예요."),
      A4s("Thứ năm này tôi đi [công tác] ở Đà Nẵng.", "이번 목요일에 저는 다낭으로 출장 가요."),
      A4d("Chị đi chợ chưa?", "장 보러 갔어요?", "Chưa, [chiều nay] tôi đi.", "아직이요, 오늘 오후에 가요.", 'mf'),
      A4d("Anh làm ở đây bao lâu rồi?", "여기서 일한 지 얼마나 됐어요?", "Hơn [hai] năm rồi.", "2년 넘었어요.", 'fm'),
      A4d("Chị có mấy con?", "자녀가 몇이에요?", "Tôi có một [con trai].", "아들 하나 있어요.", 'mf'),
      A4d("Bao giờ chị về quê?", "언제 고향에 가요?", "[Chủ nhật] tuần này.", "이번 주 일요일이요.", 'fm'),
      A4d("Anh ấy viết được không?", "그는 쓸 수 있어요?", "Được, anh ấy viết rất [nhanh].", "네, 아주 빨리 써요.", 'mf')]
q += B1S(NO, ["được", "mới", "đi", "còn", "khá"], [     # 재료용 — mix.py 가 벌마다 헷갈리는 보기로 다시 쓴다
      ("Tôi nói ____ tiếng Việt một chút.", "được", "저는 베트남어를 조금 할 수 있어요."),
      ("Anh ấy ____ về nước hôm qua.", "mới", "그는 어제 막 귀국했어요."),
      ("Trễ rồi, chúng ta về nhà ____!", "đi", "늦었어요, 우리 집에 가요!"),
      ("Tôi là giáo viên, ____ vợ tôi là bác sĩ.", "còn", "저는 교사이고, 제 아내는 의사예요."),
      ("Phòng này ____ đẹp.", "khá", "이 방은 꽤 예뻐요.")])
q += [B2("Chị Mai là giáo viên tiếng Anh. Chị ấy dạy ở một trung tâm ngoại ngữ ở Quận 1.", "마이 씨는 영어 교사예요. 1군에 있는 어학원에서 가르쳐요.",
         "Chị Mai dạy ở đâu?", "마이 씨는 어디에서 가르쳐요?", ["ở trung tâm ngoại ngữ", "ở bệnh viện", "ở công ty"]),
      B2("Anh Long mới đến Hà Nội tháng trước. Anh ấy chưa quen nên hình như cảm thấy hơi lo lắng.", "롱 씨는 지난달에 하노이에 막 왔어요. 아직 익숙하지 않아서 좀 걱정하는 것 같아요.",
         "Anh Long đến Hà Nội bao giờ?", "롱 씨는 언제 하노이에 왔어요?", ["tháng trước", "tuần trước", "năm trước"]),
      B2("Thứ hai tuần sau là sinh nhật vợ tôi. Tôi định mua hoa và sách tặng vợ.", "다음 주 월요일은 아내 생일이에요. 아내에게 꽃과 책을 사 줄 생각이에요.",
         "Tôi định tặng gì cho vợ?", "나는 아내에게 무엇을 선물할 생각이에요?", ["hoa và sách", "vé máy bay", "cà phê"]),
      B2("Gia đình anh Nam có bốn người. Em gái anh Nam nhỏ hơn anh ấy năm tuổi, là học sinh.", "남 씨 가족은 네 명이에요. 여동생은 남 씨보다 다섯 살 어리고 학생이에요.",
         "Em gái anh Nam nhỏ hơn anh ấy mấy tuổi?", "남 씨의 여동생은 남 씨보다 몇 살 어려요?", ["năm tuổi", "bốn tuổi", "hai tuổi"]),
      B2("Lớp tiếng Việt học sáng thứ ba và thứ năm, từ 9 giờ đến 11 giờ. Cuối khóa có kiểm tra nói.", "베트남어 수업은 화요일과 목요일 아침 9시부터 11시까지예요. 기말에 말하기 시험이 있어요.",
         "Mỗi buổi học bao lâu?", "수업은 한 번에 얼마 동안 해요?", ["hai tiếng", "một tiếng", "ba tiếng"])]
T = [("Anh Kim nói được tiếng Việt nhưng chưa viết được. Anh ấy định đăng ký lớp viết ở trung tâm ngoại ngữ năm sau.", "김 씨는 베트남어를 말할 수는 있지만 아직 쓰지는 못해요. 내년에 외국어 학원 쓰기 반에 등록할 생각이에요.",
      [("Anh Kim viết được tiếng Việt.", "김 씨는 베트남어를 쓸 수 있어요.", False), ("Anh Kim nói được tiếng Việt.", "김 씨는 베트남어를 말할 수 있어요.", True)]),
     ("Hôm nay chị Hà không đi làm. Chị ấy ở nhà nấu bữa ăn tối cho cả gia đình vì bà ngoại đến thăm.", "오늘 하 씨는 출근하지 않아요. 외할머니가 오셔서 집에서 온 가족의 저녁을 요리해요.",
      [("Hôm nay chị Hà đi làm.", "오늘 하 씨는 출근해요.", False), ("Tối nay bà ngoại đến thăm chị Hà.", "오늘 저녁에 외할머니가 하 씨를 보러 와요.", True)]),
     ("Tôi và bạn thân cùng tuổi. Chúng tôi đều là sinh viên năm thứ hai và cùng học tiếng Nga.", "저와 친한 친구는 동갑이에요. 우리 둘 다 2학년 대학생이고 함께 러시아어를 배워요.",
      [("Bạn thân tôi lớn hơn tôi.", "제 친한 친구는 저보다 나이가 많아요.", False), ("Tôi và bạn thân đều là sinh viên.", "저와 친한 친구는 둘 다 대학생이에요.", True)]),
     ("Ông bà tôi đã về hưu. Bây giờ ông bà sống ở quê, luôn luôn vui vẻ vì họ hàng ở gần.", "할아버지와 할머니는 은퇴하셨어요. 지금은 고향에 사시고, 친척들이 가까이 있어 늘 즐거우세요.",
      [("Ông bà tôi còn làm việc.", "할아버지와 할머니는 아직 일하세요.", False), ("Ông bà tôi sống ở quê.", "할아버지와 할머니는 고향에 사세요.", True)]),
     ("Tuần sau chị Thu đi công tác ở Huế ba ngày. Chị ấy đã đặt vé máy bay và khách sạn rồi.", "다음 주에 투 씨는 후에로 사흘 동안 출장을 가요. 비행기 표와 호텔은 벌써 예약했어요.",
      [("Chị Thu đã đặt vé máy bay.", "투 씨는 비행기 표를 예약했어요.", True), ("Chị Thu đi công tác một tuần.", "투 씨는 일주일 동안 출장을 가요.", False)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Tôi nói được một chút tiếng Việt.", "저는 베트남어를 조금 할 수 있어요.", "Chị nói tốt lắm, rất tự tin.", "아주 잘하시는데요, 자신 있게요."),
              ("Chị đến Việt Nam bao giờ vậy?", "베트남에 언제 왔어요?", "Tháng sáu năm trước, cùng với ba mẹ.", "작년 6월에 부모님과 함께요."),
              ("Chị học tiếng Việt ở đâu?", "베트남어를 어디서 배워요?", "Ở trung tâm ngoại ngữ gần nhà.", "집 근처 어학원에서요."),
              ("Tối nay anh rảnh không?", "오늘 저녁에 한가해요?", "Không, tối nay tôi có hẹn với vợ.", "아니요, 오늘 저녁엔 아내와 약속이 있어요."),
              ("Chị có gia đình chưa?", "결혼했어요?", "Rồi, tôi có hai con trai.", "네, 아들이 둘 있어요."),
              ("Tôi đi làm trễ rồi!", "저 회사에 늦었어요!", "Đừng lo, anh đi xe tắc xi đi.", "걱정 마요, 택시 타고 가요."),
              ("Chị gái tôi là bác sĩ.", "언니는 의사예요.", "Còn chị, chị làm nghề gì?", "그럼 당신은 무슨 일을 해요?"),
              ("Ai nấu ăn ở nhà chị?", "집에서 누가 요리해요?", "Chồng tôi, anh ấy nấu khá ngon.", "남편이요, 꽤 맛있게 해요."),
              ("Mấy giờ anh đến cơ quan?", "몇 시에 직장에 가요?", "Bảy giờ sáng, hôm nào cũng vậy.", "아침 7시요, 늘 그래요."),
              ("Anh đi Hà Nội với ai?", "누구와 하노이에 가요?", "Với vợ và con gái tôi.", "아내와 딸이랑요.")])
q += [C1("Tôi không nói được tiếng Pháp và tiếng Nga.", "저는 프랑스어와 러시아어를 못 해요.", ["tiếng Pháp", "không", "tôi", "nói được", "và tiếng Nga"]),
      C1("Anh ấy mới đi công tác Hà Nội về.", "그는 하노이 출장에서 막 돌아왔어요.", ["về", "anh ấy", "đi công tác", "mới", "Hà Nội"]),
      C1("Chúng tôi cùng làm việc ở khách sạn này.", "우리는 이 호텔에서 같이 일해요.", ["ở khách sạn này", "chúng tôi", "làm việc", "cùng"]),
      C1("Em gái tôi khá cao và rất tự tin.", "제 여동생은 키가 꽤 크고 아주 자신 있어요.", ["cao", "em gái tôi", "khá", "và rất tự tin"]),
      C1("Anh đã đặt vé xe lửa đi Huế chưa?", "후에 가는 기차표 예약했어요?", ["chưa", "anh", "đặt vé xe lửa", "đã", "đi Huế"])]
q += [C2("Bà ngoại tôi nói không tiếng Anh được.", "Bà ngoại tôi không nói được tiếng Anh.", "외할머니는 영어를 못 하세요. (không 은 동사 앞)", ["Bà ngoại tôi không nói tiếng Anh được.", "Bà ngoại tôi nói tiếng Anh không được."]),
      C2("Chị lo đừng, em sẽ giúp chị.", "Chị đừng lo, em sẽ giúp chị.", "걱정하지 마세요, 제가 도울게요. (đừng 은 동사 앞)"),
      C2("Chị ấy đi công tác mới về hôm qua.", "Chị ấy mới đi công tác về hôm qua.", "그녀는 어제 출장에서 막 돌아왔어요. (mới 는 동사 앞)"),
      C2("Ba mẹ tôi còn làm việc ở khách sạn.", "Ba mẹ tôi còn làm việc ở khách sạn.", "우리 부모님은 아직 호텔에서 일하세요.", dung=True),
      C2("Chúng ta cùng đi ăn trưa đi.", "Chúng ta cùng đi ăn trưa đi.", "우리 같이 점심 먹으러 가요.", dung=True)]
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
q += D(['thứ sáu', 'thứ bảy', 'chủ nhật', 'con một', 'em gái', 'em trai', 'anh trai', 'chúc mừng', 'đặt tour', 'đi công tác'],
       ['Anh xem giùm tôi được không?', 'Bao giờ chị đi?', 'Ba tôi mất rồi. Còn mẹ tôi đã về hưu.', 'Cô ấy còn độc thân.', 'Phát âm tiếng Việt khó.'])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM) 두 음절 낱말·문장(실제 2차 말하기가 발음 목록에서, 낱말 2.0음절·문장 6.4낱말 평균) (2026-10-13 밤)
build(NO, q)
