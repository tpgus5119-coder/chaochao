# -*- coding: utf-8 -*-
from common import *
PICS = ["luật sư", "tài xế", "thư ký", "nhân viên ngân hàng", "giáo viên"]
q = []
q += [TF("kỹ sư", "Bố tôi là kỹ sư. Ông ấy làm việc ở công ty máy tính.", True), TF("nội trợ", "Mẹ tôi là giáo viên. Mẹ tôi dạy tiếng Anh.", False),
      TF("ăn cơm", "Gia đình tôi đang ăn tối.", True), TF("xem phim", "Hai người bạn đang nói chuyện ở quán cà phê.", False), TF("mua sắm", "Chị ấy đang mua sắm ở siêu thị.", True)]
q += [PK(PICS, "Anh ấy là luật sư. Anh ấy rất bận.", 0), PK(PICS, "Cô ấy là thư ký. Cô ấy làm việc ở văn phòng.", 2), PK(PICS, "Anh Nam là tài xế tắc xi.", 1),
      PK(PICS, "Chị ấy là giáo viên. Chị ấy dạy ở trường đại học.", 4), PK(PICS, "Em tôi là nhân viên ngân hàng.", 3)]
q += [A3("Gia đình Lan có mấy người?", "Gia đình tôi có bốn người: bố mẹ, em và tôi.", ["bốn người", "ba người", "năm người"]),
      A3("Bố của Lan làm nghề gì?", "Bố tôi là bác sĩ. Ông ấy làm việc ở bệnh viện.", ["bác sĩ", "giáo viên", "kỹ sư"]),
      A3("Mẹ của Nam làm gì?", "Mẹ tôi là nội trợ. Mẹ tôi ở nhà và nấu ăn.", ["nội trợ", "thư ký", "bác sĩ"]),
      A3("Em của Nam học ở đâu?", "Em tôi là sinh viên. Em ấy học ở Trường Đại học Khoa học Xã hội và Nhân văn.", ["trường đại học", "công ty", "ngân hàng"]),
      A3("Brian là người nước nào?", "Brian là bạn tôi. Anh ấy là người Mỹ.", ["Mỹ", "Anh", "Úc"]),
      A3("Hiroki và Yumi là người nước nào?", "Hiroki và Yumi đều là người Nhật.", ["Nhật", "Hàn Quốc", "Trung Quốc"]),
      A3("Cô giáo của Lan tên là gì?", "Cô giáo tiếng Việt của tôi tên là Hoa.", ["Hoa", "Mai", "Lan"]),
      A3("Chị của Nam bao nhiêu tuổi?", "Chị tôi 25 tuổi. Chị ấy là kế toán.", ["25 tuổi", "20 tuổi", "30 tuổi"]),
      A3("Ông bà của Lan sống ở đâu?", "Ông bà tôi sống ở Đà Nẵng.", ["Đà Nẵng", "Hà Nội", "Huế"]),
      A3("Bạn của Nam là ai?", "Kate là bạn của tôi. Chị ấy là người Úc.", ["Kate", "Brian", "David"])]
q += [A4("Gia đình anh có mấy người?", ["Gia đình tôi có năm người.", "Tôi là sinh viên.", "Ở Hà Nội."]),
      A4("Bố chị làm nghề gì?", ["Bố tôi là kỹ sư.", "Bố tôi 50 tuổi.", "Ở công ty."]),
      A4("Mẹ em có đi làm không?", ["Không, mẹ em là nội trợ.", "Mẹ em tên là Hoa.", "Lúc 7 giờ."]),
      A4("Anh có em không?", ["Có, tôi có một em.", "Tôi là người Việt Nam.", "Rất vui."]),
      A4("Bạn anh là người nước nào?", ["Bạn tôi là người Nhật.", "Bạn tôi là bác sĩ.", "Bạn tôi ở Quận 1."]),
      A4("Chị anh bao nhiêu tuổi?", ["Chị ấy 28 tuổi.", "Chị ấy là thư ký.", "Chị ấy ở nhà."]),
      A4("Ông bà chị sống ở đâu?", ["Ông bà tôi sống ở Huế.", "Ông bà tôi rất khỏe.", "Ông bà tôi 70 tuổi."]),
      A4("Cô ấy là ai?", ["Cô ấy là cô giáo của tôi.", "Cô ấy rất đẹp.", "Cô ấy ở Hà Nội."]),
      A4("Em anh làm việc ở đâu?", ["Em ấy làm việc ở ngân hàng.", "Em ấy 22 tuổi.", "Em ấy là người Việt."]),
      A4("Bố mẹ chị có khỏe không?", ["Cám ơn, bố mẹ tôi khỏe.", "Bố mẹ tôi là bác sĩ.", "Bố mẹ tôi ở Đà Nẵng."])]
bank = ["của", "đều", "cũng", "ấy", "có"]
q += [B1("Đây là mẹ ____ tôi.", bank, 0), B1("Bố mẹ tôi ____ là giáo viên.", bank, 1), B1("Tôi là sinh viên. Em tôi ____ là sinh viên.", bank, 2),
      B1("Kia là chị Mai. Chị ____ là bạn tôi.", bank, 3), B1("Gia đình tôi ____ bốn người.", bank, 4)]
q += [B2("Gia đình Nam có bốn người: bố, mẹ, chị và Nam. Bố Nam là luật sư. Mẹ Nam là nội trợ. Chị Nam là kế toán ở ngân hàng.", "Chị Nam làm nghề gì?", ["kế toán", "luật sư", "nội trợ"]),
      B2("Yumi là người Nhật. Chị ấy là bạn của Lan. Yumi học tiếng Việt ở Hà Nội hai năm rồi. Bây giờ chị ấy nói tiếng Việt rất giỏi.", "Yumi học tiếng Việt ở đâu?", ["Hà Nội", "Nhật", "Đà Nẵng"]),
      B2("Ông bà tôi sống ở quê. Ông tôi 75 tuổi, bà tôi 72 tuổi. Ông bà tôi đều khỏe.", "Bà tôi bao nhiêu tuổi?", ["72 tuổi", "75 tuổi", "70 tuổi"]),
      B2("Đây là Brian và David. Brian là người Mỹ. David là người Anh. Họ đều là sinh viên tiếng Việt ở lớp tôi.", "David là người nước nào?", ["Anh", "Mỹ", "Úc"]),
      B2("Cô Hoa là cô giáo tiếng Việt của tôi. Cô ấy là người Việt Nam. Cô ấy rất thân thiện và dạy rất hay.", "Cô Hoa dạy gì?", ["tiếng Việt", "tiếng Anh", "tiếng Hàn"])]
T1 = "Tôi tên là Min. Tôi là người Hàn Quốc. Gia đình tôi có ba người: bố, mẹ và tôi. Bố tôi là kỹ sư, mẹ tôi là giáo viên."
T2 = "Bạn thân của tôi là Hiroki. Anh ấy là người Nhật. Anh ấy làm kế toán ở một ngân hàng ở Quận 1."
T3 = "Chị Mai có hai em. Một em là sinh viên. Một em 10 tuổi, em ấy đi học ở gần nhà."
T4 = "Ông bà của Lan sống ở Huế. Cuối tuần Lan thường về Huế thăm ông bà. Ông bà Lan rất vui."
q += [B3(T1, "Min là người Hàn Quốc.", True), B3(T1, "Gia đình Min có bốn người.", False), B3(T1, "Mẹ Min là giáo viên.", True),
      B3(T2, "Hiroki là người Nhật.", True), B3(T2, "Hiroki làm việc ở bệnh viện.", False), B3(T2, "Hiroki là bạn thân của tôi.", True),
      B3(T3, "Chị Mai có hai em.", True), B3(T3, "Hai em của chị Mai đều là sinh viên.", False),
      B3(T4, "Ông bà Lan sống ở Hà Nội.", False), B3(T4, "Cuối tuần Lan thường thăm ông bà.", True)]
q += [B4("Gia đình chị có mấy người?", ["Gia đình tôi có bốn người.", "Tôi là người Hàn Quốc.", "Tôi 25 tuổi.", "Ở Hà Nội."]),
      B4("Đây là ai?", ["Đây là bố tôi.", "Đây là lớp học.", "Lúc 8 giờ.", "Tôi là sinh viên."]),
      B4("Anh có chị không?", ["Không, tôi có một em.", "Chị ấy là bác sĩ.", "Chị ấy 30 tuổi.", "Ở Đà Nẵng."]),
      B4("Mẹ anh làm nghề gì?", ["Mẹ tôi là nội trợ.", "Mẹ tôi 55 tuổi.", "Mẹ tôi ở quê.", "Mẹ tôi rất khỏe."]),
      B4("Em ấy bao nhiêu tuổi?", ["Em ấy 20 tuổi.", "Em ấy là sinh viên.", "Em ấy ở Quận 1.", "Em ấy rất chăm chỉ."]),
      B4("Bạn anh tên là gì?", ["Bạn tôi tên là Hiroki.", "Bạn tôi là người Nhật.", "Bạn tôi ở Hà Nội.", "Bạn tôi là kế toán."]),
      B4("Chị ấy là người nước nào?", ["Chị ấy là người Úc.", "Chị ấy là giáo viên.", "Chị ấy rất đẹp.", "Chị ấy ở Quận 2."]),
      B4("Ông bà anh có khỏe không?", ["Có, ông bà tôi đều khỏe.", "Ông bà tôi ở Huế.", "Ông bà tôi 70 tuổi.", "Ông bà tôi có ba người con."]),
      B4("Rất vui được gặp chị.", ["Rất vui được gặp anh.", "Chị ấy là bạn tôi.", "Tôi có hai em.", "Tôi là người Mỹ."]),
      B4("Bố mẹ anh sống ở đâu?", ["Bố mẹ tôi sống ở Busan.", "Bố mẹ tôi là bác sĩ.", "Bố mẹ tôi rất bận.", "Bố mẹ tôi có hai con."])]
q += [C1("Gia đình tôi có bốn người.", ["có", "gia đình", "bốn", "tôi", "người"]), C1("Bố tôi là kỹ sư.", ["là", "bố", "kỹ sư", "tôi"]),
      C1("Chị ấy là bạn của tôi.", ["của", "chị ấy", "bạn", "là", "tôi"]), C1("Họ đều là người Nhật.", ["đều", "họ", "là", "người", "Nhật"]),
      C1("Em tôi là sinh viên.", ["sinh viên", "em", "là", "tôi"])]
q += [C2("Đây là của bố tôi.", 2, "Đây là bố tôi.", "이분은 제 아버지예요. (가족 관계에는 của를 안 쓴다)"),
      C2("Bố mẹ tôi là đều giáo viên.", 3, "Bố mẹ tôi đều là giáo viên.", "부모님은 모두 선생님이에요. (đều는 là 앞)"),
      C2("Chị tôi tuổi 25.", 2, "Chị tôi 25 tuổi.", "제 언니는 25살이에요. (숫자 + tuổi)"),
      C2("Em ấy không là sinh viên.", 2, "Em ấy không phải là sinh viên.", "그 애는 대학생이 아니에요. (không phải là)"),
      C2("Ông bà tôi khỏe rất.", 4, "Ông bà tôi rất khỏe.", "조부모님은 아주 건강하세요. (rất는 형용사 앞)")]
q.append(C3("우리 가족과 친구 소개 — 몇 명인지, 누구인지, 무슨 일을 하는지, 어디에 사는지 (10문장)",
            ["Gia đình tôi có bốn người.", "Bố tôi là kỹ sư. Ông ấy làm việc ở công ty máy tính.", "Mẹ tôi là nội trợ.", "Em tôi là sinh viên. Em ấy 20 tuổi.", "Gia đình tôi sống ở Busan.",
             "Bạn thân của tôi tên là Hiroki.", "Anh ấy là người Nhật.", "Anh ấy làm kế toán ở ngân hàng.", "Cuối tuần chúng tôi thường đi uống cà phê.", "Tôi rất thích gia đình và bạn bè của tôi."]))
q += D1(["gia đình", "bố mẹ", "ông bà", "con gái", "bạn thân", "luật sư", "tài xế", "nhân viên", "tuổi", "thân thiện"],
        ["Gia đình tôi có bốn người.", "Bố mẹ tôi đều là giáo viên.", "Chị tôi 25 tuổi.", "Bạn tôi là người Nhật.", "Ông bà anh có khỏe không?"])
q += [D2("gia đình", "그림을 보고 가족을 소개해 보세요 — 몇 명인지, 누구누구인지, 아버지 직업. (3문장)",
         ["Gia đình tôi có bốn người.", "Bố mẹ tôi, chị tôi và tôi.", "Bố tôi là kỹ sư."], ["우리 가족은 네 명이에요.", "부모님, 언니(누나) 그리고 저예요.", "아버지는 엔지니어예요."]),
      D2("bác sĩ", "그림 속 사람은 당신의 형(오빠)입니다. 소개해 보세요 — 직업, 일하는 곳, 바쁜지. (3문장)",
         ["Đây là anh tôi.", "Anh ấy là bác sĩ ở bệnh viện.", "Anh ấy rất bận."], ["이 사람은 제 형(오빠)이에요.", "그는 병원 의사예요.", "그는 아주 바빠요."])]
q += [D3("친구가 '가족이 몇 명이에요?'라고 묻습니다. 가족 수와 부모님이 무슨 일을 하시는지 말해 보세요. (3문장)",
         ["Gia đình tôi có năm người.", "Bố tôi là giáo viên.", "Mẹ tôi là nội trợ."], ["우리 가족은 다섯 명이에요.", "아버지는 선생님이에요.", "어머니는 주부예요."]),
      D3("친한 친구를 소개해 보세요 — 이름, 어느 나라 사람인지, 무엇을 하는지. (3문장)",
         ["Bạn thân của tôi tên là Brian.", "Anh ấy là người Mỹ.", "Anh ấy là sinh viên."], ["제 친한 친구 이름은 브라이언이에요.", "그는 미국 사람이에요.", "그는 대학생이에요."])]
AUD = build(3, "모의고사 3", q)
