# -*- coding: utf-8 -*-
from common import *
PICS = ["ngân hàng", "bệnh viện", "siêu thị", "bưu điện", "sân bay"]
q = []
q += [TF("sinh viên", "Em ấy là sinh viên. Em ấy học ở trường đại học.", True), TF("nghe nhạc", "Chị ấy đang đọc sách.", False),
      TF("đi bộ", "Anh ấy đi bộ đến trường.", True), TF("ăn sáng", "Anh ấy đang ăn sáng ở nhà.", True), TF("nhà sách", "Đây là bệnh viện.", False)]
q += [PK(PICS, "Chị ấy làm việc ở ngân hàng. Chị ấy là kế toán.", 0), PK(PICS, "Mẹ tôi đang mua sắm ở siêu thị.", 2), PK(PICS, "Anh ấy là bác sĩ. Anh ấy làm việc ở đây.", 1),
      PK(PICS, "Ngày mai tôi đi sân bay gặp bạn.", 4), PK(PICS, "Tôi đến bưu điện để gửi thư cho bố mẹ.", 3)]
q += [A3("Chị ấy làm việc ở đâu?", "Tôi làm thư ký ở một công ty máy tính.", ["công ty máy tính", "ngân hàng", "bệnh viện"]),
      A3("Anh ấy thường làm gì vào cuối tuần?", "Cuối tuần tôi thường đi chơi với bạn bè.", ["đi chơi với bạn bè", "đi làm", "học tiếng Việt"]),
      A3("Hôm nay chị ấy ăn sáng lúc mấy giờ?", "Hôm nay tôi ăn sáng trễ, lúc 9 giờ.", ["9 giờ", "7 giờ", "11 giờ"]),
      A3("Anh ấy đi làm bằng gì?", "Tôi thường đi làm bằng xe buýt.", ["xe buýt", "tắc xi", "đi bộ"]),
      A3("Họ là bạn của ai?", "Kate và Brian là bạn của David.", ["David", "Vân", "Hiroki"]),
      A3("Cô ấy dạy ở đâu?", "Tôi đang dạy tiếng Anh ở Trường ILA, Quận 2.", ["Quận 2", "Quận 1", "Hà Nội"]),
      A3("Em ấy muốn học gì?", "Em muốn đăng ký học tiếng Việt.", ["tiếng Việt", "tiếng Anh", "tiếng Nhật"]),
      A3("Nhà hàng ở đâu?", "Tôi biết một nhà hàng ở Quận 1. Món ăn ngon lắm.", ["Quận 1", "Quận 2", "Quận 3"]),
      A3("Chị ấy thế nào?", "Hôm nay tôi hơi mệt nên không đi chơi.", ["hơi mệt", "rất vui", "rất bận"]),
      A3("Anh ấy làm việc từ mấy giờ đến mấy giờ?", "Buổi chiều tôi làm việc từ 2 giờ đến 7 giờ.", ["từ 2 giờ đến 7 giờ", "từ 9 giờ đến 11 giờ", "từ 7 giờ đến 9 giờ"])]
q += [A4("Chị tên là gì?", ["Tôi tên là Lan.", "Tôi là kỹ sư.", "Lúc 8 giờ."]),
      A4("Anh làm việc ở đâu?", ["Ở ngân hàng.", "Tôi là người Hàn Quốc.", "Hôm qua."]),
      A4("Em đi học lúc mấy giờ?", ["Lúc 8 giờ sáng.", "Ở trường Nhân văn.", "Rất khó."]),
      A4("Ông ấy có khỏe không?", ["Có, ông ấy khỏe.", "Ông ấy là bác sĩ.", "Ở bệnh viện."]),
      A4("Cuối tuần chị thường làm gì?", ["Tôi thường đi chơi với bạn.", "Tôi là giáo viên.", "Mười một người."]),
      A4("Lớp anh có bao nhiêu sinh viên?", ["Khoảng 20 sinh viên.", "Ở Quận 1.", "Rất thú vị."]),
      A4("Anh đi làm bằng gì?", ["Bằng xe buýt.", "Lúc 7 giờ.", "Với bạn tôi."]),
      A4("Hôm nay chị có bận không?", ["Có, hôm nay tôi rất bận.", "Tôi tên là Mai.", "Ở công ty."]),
      A4("Em thích học tiếng Việt không?", ["Có, em rất thích.", "Em là sinh viên.", "Lúc 9 giờ."]),
      A4("Anh ấy là người nước nào?", ["Anh ấy là người Úc.", "Anh ấy là kế toán.", "Anh ấy ở Quận 1."])]
bank = ["đang", "lắm", "không phải là", "mấy", "sắp"]
q += [B1("Tôi ____ làm thư ký ở một công ty máy tính.", bank, 0), B1("Dạo này tôi bận ____.", bank, 1), B1("Anh ấy ____ người Trung Quốc. Anh ấy là người Nhật.", bank, 2),
      B1("Lớp em có ____ sinh viên người Mỹ?", bank, 3), B1("Tôi ____ đi ăn trưa.", bank, 4)]
q += [B2("Lan là sinh viên. Lan học tiếng Anh ở Trường Đại học Khoa học Xã hội và Nhân văn. Lớp Lan có 20 người.", "Lan học gì?", ["tiếng Anh", "tiếng Việt", "tiếng Nhật"]),
      B2("Anh Nam là tài xế tắc xi. Anh ấy làm việc từ 6 giờ sáng đến 2 giờ chiều. Công việc hơi vất vả.", "Anh Nam làm việc đến mấy giờ?", ["2 giờ chiều", "6 giờ sáng", "7 giờ tối"]),
      B2("Buổi sáng tôi thường tập thể dục, sau đó ăn sáng và đi làm. Buổi tối tôi xem tivi với gia đình.", "Buổi tối tôi làm gì?", ["xem tivi", "tập thể dục", "đi làm"]),
      B2("Chị Mai mời tôi đi uống cà phê. Quán cà phê gần công ty, cà phê ở đó ngon lắm.", "Chị Mai mời tôi đi đâu?", ["đi uống cà phê", "đi mua sách", "đi ăn trưa"]),
      B2("Hôm qua tôi thức khuya để học tiếng Việt nên sáng nay tôi buồn ngủ quá.", "Sao sáng nay tôi buồn ngủ?", ["Vì hôm qua tôi thức khuya.", "Vì tôi ăn sáng trễ.", "Vì tôi đi làm sớm."])]
T1 = "Đây là Kate. Chị ấy là người Úc. Chị ấy là giáo viên tiếng Anh. Chị ấy dạy ở Trường ILA năm ngày một tuần."
T2 = "Tôi tên là Nam. Tôi là kỹ sư ở công ty máy tính. Dạo này tôi rất bận. Buổi tối tôi học tiếng Anh."
T3 = "Chị Hoa thường không ăn sáng. Chị ấy thường ăn trưa lúc 12 giờ ở căng tin công ty."
T4 = "Cuối tuần chúng tôi thường đi dạo ở phố đi bộ. Ở đó có nhiều quán cà phê và rất đông người."
q += [B3(T1, "Kate là người Mỹ.", False), B3(T1, "Kate là giáo viên tiếng Anh.", True), B3(T1, "Kate dạy năm ngày một tuần.", True),
      B3(T2, "Nam là kỹ sư.", True), B3(T2, "Dạo này Nam không bận.", False), B3(T2, "Buổi tối Nam học tiếng Anh.", True),
      B3(T3, "Chị Hoa thường ăn sáng.", False), B3(T3, "Chị Hoa ăn trưa ở căng tin công ty.", True),
      B3(T4, "Cuối tuần chúng tôi đi dạo ở phố đi bộ.", True), B3(T4, "Phố đi bộ có ít người.", False)]
q += [B4("Rất vui được gặp anh.", ["Rất vui được gặp chị.", "Tôi là người Việt Nam.", "Lúc 7 giờ sáng.", "Tôi đi làm bằng xe buýt."]),
      B4("Anh làm việc ở đâu?", ["Tôi làm việc ở ngân hàng.", "Tôi là người Mỹ.", "Khó nhưng thú vị.", "Mười hai người."]),
      B4("Chị đi làm bằng gì?", ["Tôi đi làm bằng tắc xi.", "Tôi là thư ký.", "Lúc 8 giờ sáng.", "Ở Quận 1."]),
      B4("Hôm nay anh có bận không?", ["Có, hôm nay tôi rất bận.", "Tôi là bác sĩ.", "Ở bệnh viện.", "Tôi tên là Nam."]),
      B4("Em học tiếng Việt mấy tháng rồi?", ["Em học được ba tháng rồi.", "Em là người Hàn Quốc.", "Ở trường Nhân văn.", "Rất vui."]),
      B4("Cám ơn chị nhiều.", ["Không có gì.", "Tôi là giáo viên.", "Lúc 9 giờ.", "Ở công ty."]),
      B4("Buổi tối anh thường làm gì?", ["Tôi thường xem tivi.", "Tôi là kỹ sư.", "Ở Quận 2.", "Hai người."]),
      B4("Cô ấy là người nước nào?", ["Cô ấy là người Nhật.", "Cô ấy là thư ký.", "Cô ấy ở công ty.", "Lúc 2 giờ chiều."]),
      B4("Chúng ta đi uống cà phê nhé?", ["Ừ, chúng ta đi.", "Tôi là người Việt Nam.", "Lúc 11 giờ.", "Ở ngân hàng."]),
      B4("Dạo này chị thế nào?", ["Dạo này tôi hơi mệt.", "Tôi là kế toán.", "Ở Hà Nội.", "Bằng xe buýt."])]
q += [C1("Tôi đi làm bằng xe buýt.", ["bằng", "tôi", "xe buýt", "đi làm"]), C1("Buổi tối anh ấy thường xem tivi.", ["thường", "buổi tối", "anh ấy", "xem tivi"]),
      C1("Chị ấy làm việc ở ngân hàng.", ["ở", "chị ấy", "ngân hàng", "làm việc"]), C1("Hôm nay tôi hơi mệt.", ["hơi", "hôm nay", "mệt", "tôi"]),
      C1("Cuối tuần chúng tôi đi dạo.", ["đi dạo", "cuối tuần", "chúng tôi"])]
q += [C2("Chị ấy rất đẹp lắm.", 3, "Chị ấy rất đẹp.", "그녀는 아주 예뻐요. (rất와 lắm을 함께 쓰지 않는다)"),
      C2("Anh có khỏe không ạ không?", 5, "Anh có khỏe không ạ?", "건강하세요? (không은 한 번)"),
      C2("Tôi đi làm bằng lúc 8 giờ.", 3, "Tôi đi làm lúc 8 giờ.", "저는 8시에 출근해요. (시각 앞은 lúc)"),
      C2("Họ đều không là người Việt.", 2, "Họ đều không phải là người Việt.", "그들은 모두 베트남 사람이 아니에요. (là 문장의 부정은 không phải là)"),
      C2("Buổi sáng tôi thường sẽ tập thể dục.", 4, "Buổi sáng tôi thường tập thể dục.", "아침에 저는 보통 운동해요. (습관에는 sẽ를 안 쓴다)")]
q.append(C3("나의 하루 — 몇 시에 일어나고, 아침·점심·저녁에 무엇을 하는지 (10문장)",
            ["Buổi sáng tôi thường thức dậy lúc 6 giờ rưỡi.", "Tôi đánh răng, rửa mặt và tập thể dục.", "Tôi ăn sáng lúc 7 giờ.", "Tôi đi làm bằng xe buýt.", "Tôi làm việc ở công ty từ 8 giờ đến 5 giờ.",
             "Tôi thường ăn trưa ở căng tin công ty.", "Buổi tối tôi ăn tối với gia đình.", "Sau đó tôi học tiếng Việt khoảng một tiếng.", "Thỉnh thoảng tôi xem phim trên mạng.", "Tôi đi ngủ lúc 11 giờ."]))
q += D1(["ngân hàng", "bệnh viện", "siêu thị", "bưu điện", "sân bay", "xe buýt", "cuối tuần", "đi dạo", "thư ký", "vất vả"],
        ["Tôi đi làm bằng xe buýt.", "Cuối tuần chúng tôi đi dạo ở phố đi bộ.", "Hôm nay tôi hơi mệt.", "Chị ấy làm việc ở ngân hàng.", "Anh làm việc từ mấy giờ đến mấy giờ?"])
q += [D2("xe buýt", "그림을 보고 말해 보세요 — 당신은 이것을 타고 어디에 가나요? 어디에서 일하고, 몇 시에 출근하나요? (3문장)",
         ["Tôi đi làm bằng xe buýt.", "Tôi làm việc ở ngân hàng.", "Tôi đi làm lúc bảy giờ sáng."], ["저는 버스를 타고 출근해요.", "저는 은행에서 일해요.", "저는 아침 7시에 출근해요."]),
      D2("bác sĩ", "그림을 보고 말해 보세요 — 이 사람의 직업은 무엇이고, 어디에서 일하나요? 요즘 어떤가요? (3문장)",
         ["Anh ấy là bác sĩ.", "Anh ấy làm việc ở bệnh viện.", "Dạo này anh ấy rất bận."], ["그는 의사예요.", "그는 병원에서 일해요.", "요즘 그는 아주 바빠요."])]
q += [D3("동료가 '몇 시부터 몇 시까지 일해요?'라고 묻습니다. 일하는 시간과 점심을 어디에서 먹는지 말해 보세요. (3문장)",
         ["Tôi làm việc từ tám giờ đến năm giờ.", "Buổi trưa tôi ăn cơm ở căng tin.", "Dạo này tôi hơi bận."], ["저는 8시부터 5시까지 일해요.", "점심에는 구내식당에서 밥을 먹어요.", "요즘 조금 바빠요."]),
      D3("친구가 '요즘 어때요?'라고 묻습니다. 요즘 생활을 말해 보세요 — 바쁜지, 몇 시에 자는지, 오늘 기분. (3문장)",
         ["Dạo này tôi rất bận.", "Tôi thường đi ngủ lúc mười hai giờ.", "Hôm nay tôi hơi mệt."], ["요즘 저는 아주 바빠요.", "저는 보통 12시에 자러 가요.", "오늘은 조금 피곤해요."])]
AUD = build(2, "모의고사 2", q)
