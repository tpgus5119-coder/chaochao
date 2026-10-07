# -*- coding: utf-8 -*-
from common import *
PICS = ["bác sĩ", "giáo viên", "kỹ sư", "sinh viên", "nội trợ"]
q = []
q += [TF("bác sĩ", "Anh ấy là bác sĩ. Anh ấy làm việc ở bệnh viện.", True), TF("giáo viên", "Cô ấy là kỹ sư. Cô ấy làm việc ở công ty máy tính.", False),
      TF("xem tivi", "Anh ấy đang xem tivi ở nhà.", True), TF("tập thể dục", "Chị ấy đang ăn sáng.", False), TF("đọc sách", "Anh ấy đang đọc sách ở nhà.", True)]
q += [PK(PICS, "Chị ấy là giáo viên. Chị ấy dạy tiếng Việt.", 1), PK(PICS, "Anh ấy là sinh viên. Anh ấy học ở trường đại học.", 3), PK(PICS, "Cô ấy là nội trợ. Cô ấy làm việc ở nhà.", 4),
      PK(PICS, "Anh ấy làm kỹ sư ở công ty máy tính.", 2), PK(PICS, "Ông ấy là bác sĩ. Dạo này ông ấy rất bận.", 0)]
q += [A3("Chị Vân là người nước nào?", "Chị Vân là người Việt Nam. Chị ấy là giáo viên.", ["Việt Nam", "Hàn Quốc", "Nhật"]),
      A3("Anh ấy làm nghề gì?", "Tôi làm kế toán ở ngân hàng.", ["kế toán", "kỹ sư", "bác sĩ"]),
      A3("Em ấy học tiếng gì?", "Em học tiếng Việt ở Trường Đại học Khoa học Xã hội và Nhân văn.", ["tiếng Việt", "tiếng Anh", "tiếng Hàn"]),
      A3("Lớp chị ấy có mấy người?", "Lớp tôi có 11 người.", ["11 người", "9 người", "12 người"]),
      A3("Họ sẽ đi đâu?", "Bây giờ chúng ta đi đâu? Chúng ta sẽ đi mua sách.", ["nhà sách", "bệnh viện", "siêu thị"]),
      A3("Anh ấy thường ăn sáng lúc mấy giờ?", "Tôi thường ăn sáng lúc 7 giờ.", ["7 giờ", "9 giờ", "11 giờ rưỡi"]),
      A3("Dạo này chị ấy thế nào?", "Dạo này tôi rất bận. Buổi sáng tôi đi học, buổi chiều tôi đi làm.", ["rất bận", "rất vui", "rất khỏe"]),
      A3("Tối hôm qua anh ấy làm gì?", "Tối hôm qua tôi xem phim trên mạng nên đi ngủ hơi trễ.", ["xem phim", "đọc sách", "nghe nhạc"]),
      A3("Hiroki là người nước nào?", "Đây là Hiroki. Anh ấy là người Nhật.", ["Nhật", "Mỹ", "Úc"]),
      A3("Anh ấy dạy mấy ngày một tuần?", "Tôi dạy tiếng Anh năm ngày một tuần.", ["5 ngày", "2 ngày", "7 ngày"])]
q += [A4("Anh làm nghề gì?", ["Tôi là kỹ sư.", "Tôi là người Mỹ.", "Tôi ở Quận 1."]),
      A4("Chị là người nước nào?", ["Tôi là người Hàn Quốc.", "Tôi là sinh viên.", "Tôi học tiếng Việt."]),
      A4("Em học tiếng Việt ở đâu?", ["Ở trường Nhân văn.", "Lúc 9 giờ sáng.", "Với bạn tôi."]),
      A4("Lớp anh có mấy người?", ["Mười một người.", "Rất vui.", "Ở Quận 1."]),
      A4("Chị thường ăn sáng lúc mấy giờ?", ["Lúc 7 giờ.", "Ở nhà.", "Vì tôi bận."]),
      A4("Bây giờ chúng ta đi đâu?", ["Đi mua sách.", "Tôi là giáo viên.", "Hôm qua."]),
      A4("Tiếng Việt thế nào?", ["Khó nhưng thú vị.", "Mười một người.", "Lúc 9 giờ."]),
      A4("Anh có khỏe không?", ["Cám ơn, tôi khỏe.", "Tôi tên là Nam.", "Tôi ở Quận 1."]),
      A4("Hôm qua anh có đi học không?", ["Có, tôi có đi học.", "Tôi là kế toán.", "Năm ngày một tuần."]),
      A4("Dạo này chị làm gì?", ["Tôi làm kỹ sư ở công ty máy tính.", "Tôi là người Nhật.", "Lúc 2 giờ chiều."])]
bank = ["ấy", "cũng", "phải không", "đều", "thế nào"]
q += [B1("Đây là David. Anh ____ là người Anh.", bank, 0), B1("Tôi là sinh viên. Anh Brian ____ là sinh viên.", bank, 1), B1("Chị Kate là người Úc, ____?", bank, 2),
      B1("Họ ____ là người nước ngoài.", bank, 3), B1("Tiếng Việt ____? — Tiếng Việt khó nhưng thú vị.", bank, 4)]
q += [B2("Eun Ji là người Hàn Quốc. Em ấy học tiếng Việt ở Thành phố Hồ Chí Minh. Lớp em ấy có 11 người.", "Eun Ji học tiếng Việt ở đâu?", ["Thành phố Hồ Chí Minh", "Hà Nội", "Hàn Quốc"]),
      B2("Hiroki là người Nhật. Anh ấy làm kế toán ở ngân hàng. Dạo này anh ấy rất bận.", "Hiroki làm nghề gì?", ["kế toán", "kỹ sư", "bác sĩ"]),
      B2("Buổi sáng tôi đi học tiếng Việt, buổi chiều tôi đi làm. Tôi làm việc từ 2 giờ chiều đến 7 giờ tối.", "Buổi chiều tôi làm gì?", ["đi làm", "đi học", "đi ngủ"]),
      B2("Hôm nay nhà sách giảm giá 30%. Vân và David sẽ đi mua sách lịch sử Việt Nam.", "Họ sẽ mua gì?", ["sách", "bia", "cà phê"]),
      B2("Dorothy thường không ăn sáng. Chị ấy thường ăn trưa lúc 11 giờ rưỡi hay 12 giờ.", "Dorothy thường ăn trưa lúc mấy giờ?", ["11 giờ rưỡi hay 12 giờ", "9 giờ", "7 giờ sáng"])]
T1 = "Đây là Brian. Anh ấy là người Mỹ. Anh ấy là bạn của David. Trước đây Brian đã học tiếng Việt ở trường Nhân văn một năm."
T2 = "Chị Loan làm kỹ sư ở công ty máy tính. Cô Vân cũng làm việc ở đó. Cô ấy là thư ký."
T3 = "Tôi thường đi ngủ lúc 11 giờ. Tối hôm qua tôi xem phim trên mạng nên đi ngủ hơi trễ. Hôm nay tôi buồn ngủ quá."
T4 = "Tối nay David mời Vân và anh Min đi uống bia ở một quán ăn ở Quận 1. Món ăn ở đó ngon lắm."
q += [B3(T1, "Brian là người Mỹ.", True), B3(T1, "Brian là bạn của David.", True), B3(T1, "Brian đã học tiếng Việt ở Hàn Quốc.", False),
      B3(T2, "Chị Loan là kỹ sư.", True), B3(T2, "Cô Vân là kỹ sư.", False), B3(T2, "Cô Vân làm việc ở công ty máy tính.", True),
      B3(T3, "Tối hôm qua tôi đi ngủ sớm.", False), B3(T3, "Hôm nay tôi buồn ngủ.", True), B3(T4, "Tối nay họ sẽ đi uống bia.", True), B3(T4, "Quán ăn ở Quận 2.", False)]
q += [B4("Chào chị. Xin lỗi, chị tên là gì?", ["Tôi tên là Vân.", "Tôi là người Việt Nam.", "Tôi khỏe. Cám ơn.", "Tôi làm kế toán."]),
      B4("Anh có khỏe không?", ["Cám ơn. Tôi khỏe.", "Tôi tên là David.", "Tôi là sinh viên.", "Tôi đi học."]),
      B4("Anh là người nước nào?", ["Tôi là người Mỹ.", "Tôi là kỹ sư.", "Tôi học tiếng Việt.", "Tôi ở Quận 1."]),
      B4("Chị làm nghề gì?", ["Tôi làm kỹ sư ở công ty máy tính.", "Tôi là người Hàn Quốc.", "Tôi học ở trường Nhân văn.", "Tôi đi ngủ lúc 11 giờ."]),
      B4("Lớp em có mấy người?", ["Lớp em có 11 người.", "Em học tiếng Việt.", "Em là người Hàn Quốc.", "Em đi học lúc 8 giờ."]),
      B4("Bây giờ chúng ta đi đâu?", ["Chúng ta sẽ đi mua sách.", "Tôi là sinh viên.", "Hôm qua tôi mệt quá.", "Tôi không ăn sáng."]),
      B4("Anh thường ăn sáng lúc mấy giờ?", ["Lúc 7 giờ.", "Ở nhà.", "Với bạn tôi.", "Vì tôi bận."]),
      B4("Tiếng Việt thế nào?", ["Khó nhưng thú vị.", "Ở Việt Nam.", "11 người.", "Lúc 9 giờ."]),
      B4("Cô nói tiếng Việt giỏi quá!", ["Cám ơn anh.", "Không sao.", "Tôi là người Mỹ.", "Lúc 7 giờ sáng."]),
      B4("Xin lỗi, tôi đến trễ.", ["Không sao.", "Cám ơn.", "Rất vui được gặp anh.", "Tôi khỏe."])]
q += [C1("Chúng tôi đều là sinh viên.", ["đều", "chúng tôi", "là", "sinh viên"]), C1("Anh ấy đang làm việc ở ngân hàng.", ["đang", "ở", "anh ấy", "làm việc", "ngân hàng"]),
      C1("Dạo này tôi rất bận.", ["rất", "tôi", "dạo này", "bận"]), C1("Tôi thường không ăn sáng.", ["không", "thường", "tôi", "ăn sáng"]),
      C1("Chúng ta sẽ đi uống cà phê.", ["sẽ", "chúng ta", "đi", "uống", "cà phê"])]
q += [C2("Tôi rất bận lắm.", 3, "Tôi rất bận.", "저는 아주 바빠요. (rất와 lắm을 함께 쓰지 않는다)"),
      C2("Em học đã tiếng Việt một năm.", 2, "Em đã học tiếng Việt một năm.", "저는 베트남어를 1년 배웠어요. (đã는 동사 앞)"),
      C2("Chị là người Nhật không phải?", 5, "Chị là người Nhật phải không?", "당신은 일본 사람이죠? (phải không 차례)"),
      C2("Anh ấy sắp đi ăn trưa lúc 12 giờ.", 2, "Anh ấy sẽ đi ăn trưa lúc 12 giờ.", "그는 12시에 점심을 먹으러 갈 거예요. (sắp에는 시각을 붙이지 않는다)"),
      C2("Các anh ấy là đều người Mỹ.", 4, "Các anh ấy đều là người Mỹ.", "그들은 모두 미국 사람이에요. (đều는 là 앞)")]
q.append(C3("자기소개 — 이름 · 나라 · 직업 · 지금 배우는 것 · 가족 (10문장)",
            ["Xin chào. Tôi tên là Min.", "Tôi là người Hàn Quốc.", "Tôi là sinh viên.", "Hiện nay tôi học tiếng Việt ở Thành phố Hồ Chí Minh.", "Lớp tôi có mười người.",
             "Tiếng Việt khó nhưng rất thú vị.", "Gia đình tôi có bốn người.", "Mẹ tôi là nội trợ. Bố mẹ tôi sống ở Busan.", "Dạo này tôi rất bận.", "Rất vui được gặp các bạn."]))
q += D1(["ăn sáng", "buồn ngủ", "thức khuya", "kỹ sư", "bận", "thú vị", "chăm chỉ", "giảm giá", "đặc biệt", "ngân hàng"],
        ["Tôi thường không ăn sáng.", "Dạo này tôi rất bận.", "Hôm qua tôi đi ngủ hơi trễ.", "Chúng ta sẽ đi mua sách.", "Em học tiếng Việt ở đâu?"])
q += [D2("giáo viên người Việt Nam", "그림을 보고 말해 보세요 — 이 사람은 누구이고 무슨 일을 하나요? 어디에서 일하나요? (3문장)",
         ["Đây là cô Lan.", "Cô ấy là giáo viên.", "Cô ấy dạy tiếng Việt ở trường đại học."], ["이분은 란 선생님이에요.", "그분은 선생님이에요.", "그분은 대학교에서 베트남어를 가르쳐요."]),
      D2("sinh viên", "그림을 보고 말해 보세요 — 이 사람은 무엇을 하는 사람이고, 어디에서 무엇을 배우나요? (3문장)",
         ["Anh ấy là sinh viên.", "Anh ấy học tiếng Việt ở Thành phố Hồ Chí Minh.", "Lớp anh ấy có mười người."], ["그는 대학생이에요.", "그는 호찌민시에서 베트남어를 배워요.", "그의 반은 열 명이에요."])]
q += [D3("처음 만난 베트남 친구에게 자기소개를 해 보세요 — 이름·국적·직업. (3문장)",
         ["Xin chào. Tôi tên là Min.", "Tôi là người Hàn Quốc.", "Tôi là nhân viên công ty."], ["안녕하세요. 제 이름은 민이에요.", "저는 한국 사람이에요.", "저는 회사원이에요."]),
      D3("친구가 '베트남어를 어디에서 배워요?'라고 묻습니다. 어디에서, 누구에게, 반은 몇 명인지 답해 보세요. (3문장)",
         ["Tôi học tiếng Việt ở trường đại học.", "Cô giáo của tôi là cô Hoa.", "Lớp tôi có tám người."], ["저는 대학교에서 베트남어를 배워요.", "제 선생님은 호아 선생님이에요.", "우리 반은 여덟 명이에요."])]
AUD = build(1, "모의고사 1", q)
