# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 3 — 가족 (교재 1권 10과 중심: còn · cùng · khá · 끝말 chứ · 가족 낱말·나이 견주기)"""
from common3 import *
from a3_trap import A3T
NO = 3
q = []
q += [TF("kết hôn", "Hôm nay họ kết hôn.", "오늘 그들은 결혼해요.", True),
      TF("con một", "Gia đình này có ba người.", "이 가족은 세 명이에요.", True),
      TF("lớn tuổi", "Bà ấy là học sinh.", "그분은 학생이에요.", False),
      TF("vẽ tranh", "Anh ấy đang nấu ăn.", "그는 요리하고 있어요.", False),
      TF("anh chị em", "Đây là ba anh chị em.", "이 사람들은 삼 남매예요.", True)]
q += PKS(NO, [("con trai", "Ông ấy đang chơi với con trai.", "그는 아들과 놀고 있어요.", "mock3-3-pa.webp"),
              ("con gái", "Buổi sáng ông ấy đi bộ với con gái.", "아침에 그는 딸과 걸어가요.", "mock3-3-pb.webp"),
              ("vợ", "Ông ấy đang xem tivi với vợ.", "그는 아내와 텔레비전을 보고 있어요.", "mock3-3-pc.webp"),
              ("đón", "Ông ấy đang đón vợ ở sân bay.", "그는 공항에서 아내를 마중하고 있어요.", "mock3-3-pd.webp"),
              ("đọc báo", "Ông ấy đang đọc báo.", "그는 신문을 읽고 있어요.", "mock3-3-pe.webp")])   # 듣기 2 — 실제 2차 시험지처럼 한 사람의 다섯 장면(새로 그림, 2026-10-13)
q += A3T[3]   # 듣기 3 — 실제 시험처럼 오답 보기도 들리게 (tools/mock3/a3_trap.py, 2026-10-13)
q += [A4s("Gia đình tôi có [năm] người.", "우리 가족은 다섯 명이에요."),
      A4s("Nhà tôi khá xa [trường].", "우리 집은 학교에서 꽤 멀어요."),
      A4s("Tôi và [bạn thân] cùng tuổi.", "저와 친한 친구는 동갑이에요."),
      A4s("Ông tôi đã [về hưu] năm trước.", "할아버지는 작년에 은퇴하셨어요."),
      A4s("Chị gái tôi lớn hơn tôi [ba] tuổi.", "언니는 저보다 세 살 많아요."),
      A4d("Anh có đi với tôi không?", "저랑 같이 갈래요?", "Không, tôi phải [dọn dẹp] nhà.", "아니요, 집을 청소해야 해요.", 'mf'),
      A4d("Em trai chị bao nhiêu tuổi?", "남동생은 몇 살이에요?", "Em ấy [20] tuổi.", "스무 살이에요.", 'fm'),
      A4d("Chồng chị làm nghề gì?", "남편분은 무슨 일을 해요?", "Chồng tôi là [bác sĩ].", "남편은 의사예요.", 'mf'),
      A4d("Ai nấu ăn trong gia đình anh?", "집에서 누가 요리해요?", "[Vợ] tôi nấu ăn.", "아내가 요리해요.", 'fm'),
      A4d("Cuối tuần anh thường làm gì?", "주말에 보통 뭐 해요?", "Tôi thường về quê thăm [ông bà].", "보통 조부모님을 뵈러 고향에 가요.", 'mf')]
q += B1S(NO, ["còn", "cùng", "khá", "chứ", "mấy"], [
      ("Bố tôi là bác sĩ. ____ mẹ tôi là giáo viên.", "còn", "아버지는 의사예요. 그리고 어머니는 교사예요."),
      ("Hai chị em tôi ____ học ở một trường.", "cùng", "우리 자매는 같은 학교에 다녀요."),
      ("Nhà anh ấy ____ xa công ty.", "khá", "그의 집은 회사에서 꽤 멀어요."),
      ("Tôi hiểu ____!", "chứ", "물론 이해하죠!"),
      ("Anh có ____ con?", "mấy", "자녀가 몇 명이에요?")])
q += [B2("Gia đình chị Loan có bốn người. Bố chị ấy mất rồi. Mẹ chị ấy đã về hưu.", "로안 씨 가족은 네 명이에요. 아버지는 돌아가셨고, 어머니는 은퇴하셨어요.",
         "Ai đã về hưu?", "누가 은퇴했어요?", ["mẹ chị Loan", "bố chị Loan", "chị Loan"]),
      B2("Anh Brian đến sân bay đón bố mẹ. Bố mẹ anh ấy đến Việt Nam để du lịch và thăm họ hàng.", "브라이언 씨는 부모님을 마중하러 공항에 가요. 부모님은 여행도 하고 친척도 만나러 베트남에 와요.",
         "Bố mẹ anh Brian đến Việt Nam để làm gì?", "브라이언 씨 부모님은 무엇을 하러 베트남에 와요?", ["để du lịch và thăm họ hàng", "để làm việc", "để học tiếng Việt"]),
      B2("Chị Hoài có một em gái. Em gái chị ấy thích nghe nhạc nên chị Hoài thường cùng nghe nhạc với em.", "호아이 씨에게는 여동생이 하나 있어요. 여동생이 음악 듣기를 좋아해서 호아이 씨는 자주 동생과 함께 음악을 들어요.",
         "Chị Hoài thường làm gì với em gái?", "호아이 씨는 여동생과 자주 무엇을 해요?", ["nghe nhạc", "nấu ăn", "đi chợ"]),
      B2("Ông Lưu và vợ ông ấy sắp về hưu. Họ muốn về quê sống.", "르우 씨와 부인은 곧 은퇴해요. 고향에 가서 살고 싶어 해요.",
         "Ông Lưu và vợ muốn sống ở đâu?", "르우 씨 부부는 어디에서 살고 싶어 해요?", ["ở quê", "ở Hà Nội", "ở nước ngoài"]),
      B2("Ngày Gia đình Việt Nam là ngày 28 tháng 6. Vào ngày này, mọi người trong gia đình cùng ăn tối và nói chuyện vui vẻ.", "베트남 가족의 날은 6월 28일이에요. 이날 가족 모두가 함께 저녁을 먹고 즐겁게 이야기해요.",
         "Ngày Gia đình Việt Nam là ngày nào?", "베트남 가족의 날은 언제예요?", ["ngày 28 tháng 6", "ngày 26 tháng 8", "ngày 6 tháng 8"])]
T = [("Toàn có hai chị gái. Chị cả năm nay 34 tuổi. Chị thứ hai nhỏ hơn chị cả 2 tuổi.", "또안에게는 누나가 둘 있어요. 큰누나는 올해 서른네 살이에요. 둘째 누나는 큰누나보다 두 살 어려요.",
      [("Chị thứ hai của Toàn 32 tuổi.", "또안의 둘째 누나는 서른두 살이에요.", True), ("Toàn có hai anh trai.", "또안에게는 형이 둘 있어요.", False)]),
     ("Em gái anh Dũng 21 tuổi. Cô ấy làm nhân viên siêu thị và đã có gia đình.", "중 씨의 여동생은 스물한 살이에요. 마트 직원으로 일하고 결혼했어요.",
      [("Em gái anh Dũng là sinh viên.", "중 씨의 여동생은 대학생이에요.", False), ("Em gái anh Dũng đã lập gia đình.", "중 씨의 여동생은 결혼했어요.", True)]),
     ("Bố mẹ tôi cùng tuổi. Năm nay bố mẹ tôi 60 tuổi và vẫn còn làm việc.", "우리 부모님은 동갑이에요. 올해 예순이시고 아직 일하세요.",
      [("Bố và mẹ tôi cùng tuổi.", "아버지와 어머니는 동갑이에요.", True), ("Bố mẹ tôi đã về hưu.", "부모님은 은퇴하셨어요.", False)]),
     ("Sơn sống một mình ở Thành phố Hồ Chí Minh. Sơn rất nhớ món ăn của mẹ.", "선은 호찌민시에서 혼자 살아요. 선은 어머니 음식이 아주 그리워요.",
      [("Sơn sống với bố mẹ.", "선은 부모님과 함께 살아요.", False), ("Sơn nhớ món ăn của mẹ.", "선은 어머니 음식이 그리워요.", True)]),
     ("Gia đình anh Hùng có khá đông anh em: ba anh trai và hai em gái.", "훙 씨 집은 형제가 꽤 많아요. 형이 셋, 여동생이 둘이에요.",
      [("Anh Hùng có ba anh trai.", "훙 씨는 형이 셋이에요.", True), ("Anh Hùng là con một.", "훙 씨는 외동이에요.", False)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Gia đình chị có mấy người?", "가족이 몇 명이에요?", "Bốn người: bố mẹ, em trai và tôi.", "네 명이요. 부모님, 남동생, 그리고 저요."),
              ("Anh là con thứ mấy?", "몇째예요?", "Tôi là con út.", "저는 막내예요."),
              ("Bố mẹ anh còn làm việc không?", "부모님은 아직 일하세요?", "Bố tôi về hưu rồi. Còn mẹ tôi vẫn làm việc.", "아버지는 은퇴하셨고 어머니는 아직 일하세요."),
              ("Chị ấy đã có gia đình chưa?", "그녀는 결혼했어요?", "Chưa, chị ấy còn độc thân.", "아니요, 아직 미혼이에요."),
              ("Em trai anh bao nhiêu tuổi?", "남동생은 몇 살이에요?", "Mười tám tuổi.", "열여덟 살이요."),
              ("Em gái tôi sắp kết hôn.", "여동생이 곧 결혼해요.", "Chúc mừng em ấy!", "동생분 축하해요!"),
              ("Cuối tuần chị đi đâu?", "주말에 어디 가요?", "Tôi cùng gia đình đi thăm ông bà.", "가족과 함께 조부모님을 뵈러 가요."),
              ("Bố mẹ tôi về hưu rồi.", "부모님은 은퇴하셨어요.", "Vậy bây giờ bố mẹ chị sống ở đâu?", "그럼 지금 부모님은 어디 사세요?"),
              ("Tôi có ba anh trai.", "저는 오빠가 셋 있어요.", "Thế à? Gia đình chị đông anh em quá!", "그래요? 형제가 많네요!"),
              ("Bà ngoại anh sống ở đâu?", "외할머니는 어디 사세요?", "Ở quê, gần Huế.", "후에 근처 고향에 사세요.")])
q += [C1("Gia đình tôi có bốn người.", "우리 가족은 네 명이에요.", ["có", "gia đình", "bốn người", "tôi"]),
      C1("Em gái tôi là con út.", "제 여동생은 막내예요.", ["con út", "là", "em gái", "tôi"]),
      C1("Chúng tôi cùng đi thăm ông bà.", "우리는 함께 조부모님을 뵈러 가요.", ["ông bà", "chúng tôi", "đi thăm", "cùng"]),
      C1("Nhà anh ấy khá xa.", "그의 집은 꽤 멀어요.", ["khá", "nhà", "xa", "anh ấy"]),
      C1("Anh trai tôi còn độc thân.", "제 오빠는 아직 미혼이에요.", ["độc thân", "anh trai", "còn", "tôi"])]
q += [C2("Hai chị em tôi tuổi cùng.", "Hai chị em tôi cùng tuổi.", "우리 자매는 동갑이에요. (cùng tuổi 차례)", ["Hai chị em tôi bằng tuổi nhau."]),
      C2("Anh ấy có đông khá anh em.", "Anh ấy có khá đông anh em.", "그는 형제가 꽤 많아요. (khá 는 형용사 앞)"),
      C2("Tôi là con thứ hai trong gia đình.", "Tôi là con thứ hai trong gia đình.", "저는 집에서 둘째예요.", dung=True),
      C2("Chị ấy nhỏ tôi hơn hai tuổi.", "Chị ấy nhỏ hơn tôi hai tuổi.", "그녀는 저보다 두 살 어려요. (nhỏ hơn + 사람 + 나이)"),
      C2("Có chứ, tôi có hai em trai.", "Có chứ, tôi có hai em trai.", "있죠, 남동생이 둘 있어요.", dung=True)]
q.append(C3("mock3-3-w3.webp",
            [("Gia đình này có năm người.", "이 가족은 다섯 명이에요."), ("Ông bà đang ngồi.", "할아버지와 할머니가 앉아 계세요."),
             ("Bố đang ngồi với ông bà.", "아버지는 조부모님과 함께 앉아 있어요."), ("Mẹ và bé Na đang đứng.", "엄마와 나는 서 있어요."), ("Họ đang ở công viên.", "그들은 공원에 있어요.")],
            {'say': ['đây là gia đình tôi', 'đây là một gia đình', 'gia đình tôi có năm người', 'có năm người', 'gia đình có năm người', 'đây là công viên', 'trong công viên có nhiều cây',
                     'gia đình này rất vui', 'cả gia đình rất vui', 'mọi người rất vui', 'gia đình này có ông bà bố mẹ và bé na', 'có ông bà bố mẹ và một con gái', 'họ là một gia đình'],
             'facts': [(['gia đình này', 'gia đình tôi', 'họ', 'mọi người', 'cả gia đình', 'năm người'], ['đang ở công viên', 'ở công viên', 'đang đi chơi', 'đang đi chơi ở công viên', 'rất vui', 'đang nghỉ ở công viên'], True),
                       (['ông bà', 'ông bà tôi', 'ông và bà', 'ông bà của bé na'], ['đang ngồi', 'đang ngồi ở công viên', 'lớn tuổi', 'đã về hưu', 'rất vui'], True),
                       (['ông', 'ông tôi', 'bà', 'bà tôi'], ['đang ngồi', 'lớn tuổi', 'đã về hưu', 'rất vui'], False),
                       (['bố', 'bố tôi', 'người bố', 'anh ấy'], ['đang ngồi', 'đang ngồi với ông bà', 'rất vui'], False),
                       (['mẹ', 'mẹ tôi', 'người mẹ', 'chị ấy'], ['đang đứng', 'rất đẹp', 'rất vui', 'đang đứng với bé na'], False),
                       (['bé na', 'con gái', 'em bé', 'em gái tôi', 'em ấy'], ['đang đứng', 'rất vui', 'đang đứng với mẹ', 'còn nhỏ'], False),
                       (['mẹ và bé na', 'mẹ và con gái', 'hai mẹ con'], ['đang đứng', 'rất vui'], True)],
             'pre': ['bây giờ', 'hôm nay', 'cuối tuần', 'ở công viên', 'trong công viên'], 'post': ['ở công viên', 'trong công viên', 'bây giờ', 'hôm nay']}))
q += D(["gia đình", "ông bà", "con cả", "con út", "con một", "đón", "em trai út", "về hưu", "lập gia đình", "độc thân"],
       ["Em tôi nhỏ hơn tôi bốn tuổi.", "Ba mẹ tôi cùng tuổi.", "Cô ấy còn độc thân.", "Tôi có một chị gái, một em gái và một em trai.", "Ba tôi mất rồi."])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM 새 낱말·문장)에서 (2차 시험 말하기가 그 범위 발음 목록에서 나옴, 2026-10-13)
build(NO, q)
