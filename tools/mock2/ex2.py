# -*- coding: utf-8 -*-
from common import *
q = []
q += [TF("thức dậy", "Tôi thức dậy lúc 6 giờ sáng.", True), TF("đánh răng", "Em ấy đang đánh răng.", True),
      TF("ăn sáng", "Anh ấy đang ăn trưa ở căng tin.", False), TF("xem tivi", "Buổi tối gia đình tôi xem tivi.", True), TF("đứng", "Em ấy đang học bài.", False)]
q += [PK(["rửa mặt", "nấu ăn", "đọc báo", "mua sắm"], "Buổi sáng tôi rửa mặt rồi ăn sáng.", 0),
      PK(["ăn cơm", "chuẩn bị", "mang", "chờ"], "Gia đình tôi đang ăn cơm.", 0),
      PK(["lên mạng", "vẽ", "tin tức", "hát hò"], "Buổi tối tôi thường lên mạng.", 0),
      PK(["đi ngủ", "về nhà", "ăn trưa", "đi mua sắm"], "Hôm qua tôi đi ngủ lúc 12 giờ đêm.", 0),
      PK(["ở nhà", "biển", "quán ăn", "thành phố"], "Cuối tuần tôi ở nhà với gia đình.", 0)]
q += [A3("Chị ấy làm việc ở đâu?", "Tôi làm thư ký ở một công ty máy tính, còn anh?\nTôi làm việc ở ngân hàng.", ["công ty máy tính", "ngân hàng", "bệnh viện"]),
      A3("Anh ấy thường làm gì vào cuối tuần?", "Cuối tuần anh thường học tiếng Việt à?\nKhông, cuối tuần tôi thường đi chơi với bạn bè.", ["đi chơi với bạn bè", "đi làm", "học tiếng Việt"]),
      A3("Hôm nay chị ấy ăn sáng lúc mấy giờ?", "Hôm nay tôi ăn sáng trễ, lúc 9 giờ.\nCòn tôi ăn sáng lúc 7 giờ.", ["9 giờ", "7 giờ", "11 giờ"]),
      A3("Anh ấy đi làm bằng gì?", "Anh đi làm bằng tắc xi hả?\nKhông, tôi thường đi làm bằng xe buýt.", ["xe buýt", "tắc xi", "đi bộ"]),
      A3("Chị ấy đến công ty lúc mấy giờ?", "Nhà tôi hơi xa nên tôi thường đến công ty lúc 7 giờ 40.\nCòn tôi thường đến lúc 8 giờ.", ["7 giờ 40", "7 giờ", "8 giờ 40"]),
      A3("Cô ấy dạy ở đâu?", "Tôi đang dạy tiếng Anh ở Trường ILA, Quận 2.\nCông ty tôi ở Quận 1.", ["Quận 2", "Quận 1", "Hà Nội"]),
      A3("Tối nay họ sẽ làm gì?", "Tối nay chúng ta đi ăn tối ở quán ăn gần công ty nhé?\nỪ, quán đó ngon lắm.", ["đi ăn tối", "đi mua sách", "đi ngủ"]),
      A3("Nhà hàng ở đâu?", "Anh có biết nhà hàng nào ngon không?\nTôi biết một nhà hàng ở Quận 1, món ăn ngon lắm.", ["Quận 1", "Quận 2", "Quận 3"]),
      A3("Chị ấy thế nào?", "Hôm nay tôi hơi mệt nên không đi chơi.\nVậy chị nghỉ nhé.", ["hơi mệt", "rất vui", "rất bận"]),
      A3("Anh ấy làm việc từ mấy giờ đến mấy giờ?", "Anh làm việc cả ngày à?\nKhông, tôi làm việc từ 2 giờ đến 7 giờ, buổi sáng tôi đi học.", ["từ 2 giờ đến 7 giờ", "từ 9 giờ đến 11 giờ", "từ 7 giờ đến 9 giờ"])]
q += [A4("Chị sắp đi ăn trưa chưa?", ["Sắp rồi. Bây giờ tôi hơi đói.", "Tôi là thư ký.", "Ở Quận 2."]),
      A4("Anh làm việc ở đâu?", ["Ở ngân hàng.", "Từ 8 giờ sáng.", "Hôm qua."]),
      A4("Em đi học lúc mấy giờ?", ["Lúc 8 giờ sáng.", "Ở trường Nhân văn.", "Rất khó."]),
      A4("Từ nhà đến công ty mất bao lâu?", ["Khoảng 40 phút.", "Lúc 7 giờ.", "Bằng tắc xi."]),
      A4("Cuối tuần chị thường làm gì?", ["Tôi thường đi chơi với bạn.", "Tôi là giáo viên.", "Mười một người."]),
      A4("Lớp anh có bao nhiêu sinh viên?", ["Khoảng 20 sinh viên.", "Ở Quận 1.", "Rất thú vị."]),
      A4("Anh đi làm bằng gì?", ["Bằng xe buýt.", "Lúc 7 giờ.", "Với bạn tôi."]),
      A4("Hôm nay chị có bận không?", ["Có, hôm nay tôi rất bận.", "Lúc 7 giờ rưỡi.", "Ở công ty."]),
      A4("Buổi trưa anh thường ăn ở đâu?", ["Ở căng tin công ty.", "Lúc 12 giờ.", "Hơi đói."]),
      A4("Hôm qua chị đi ngủ lúc mấy giờ?", ["Lúc 12 giờ đêm.", "Ở nhà.", "Vì tôi mệt."])]
bank = ["đang", "lắm", "không phải là", "mấy", "sắp"]
q += [B1("Tôi ____ làm thư ký ở một công ty máy tính.", bank, 0), B1("Dạo này tôi bận ____.", bank, 1), B1("Tôi ____ kỹ sư. Tôi là thư ký.", bank, 2),
      B1("Lớp em có ____ sinh viên người Mỹ?", bank, 3), B1("Tôi ____ đi ăn trưa.", bank, 4)]
q += [B2("Chị Hoa là nhân viên siêu thị. Siêu thị mở cửa lúc 7 giờ sáng nên chị ấy đi làm rất sớm, lúc 6 giờ rưỡi.", "Chị Hoa đi làm lúc mấy giờ?", ["6 giờ rưỡi", "7 giờ", "9 giờ"]),
      B2("Anh Nam là tài xế tắc xi. Anh ấy làm việc từ 6 giờ sáng đến 2 giờ chiều. Công việc hơi vất vả.", "Anh Nam làm việc đến mấy giờ?", ["2 giờ chiều", "6 giờ sáng", "7 giờ tối"]),
      B2("Buổi sáng tôi thường tập thể dục, sau đó ăn sáng và đi làm. Buổi tối tôi xem tivi với gia đình.", "Buổi tối tôi làm gì?", ["xem tivi", "tập thể dục", "đi làm"]),
      B2("Chị Mai mời tôi đi uống cà phê. Quán cà phê gần công ty, cà phê ở đó ngon lắm.", "Chị Mai mời tôi đi đâu?", ["đi uống cà phê", "đi mua sách", "đi ăn trưa"]),
      B2("Hôm qua tôi thức khuya để học tiếng Việt nên sáng nay tôi buồn ngủ quá.", "Sao sáng nay tôi buồn ngủ?", ["Vì hôm qua tôi thức khuya.", "Vì tôi ăn sáng trễ.", "Vì tôi đi làm sớm."])]
T1 = "Chị Kate là giáo viên tiếng Anh ở trường ILA. Chị ấy dạy năm ngày một tuần, từ 9 giờ sáng đến 11 giờ rưỡi. Buổi chiều chị ấy rảnh."
T2 = "Tôi tên là Nam. Tôi là kỹ sư ở công ty máy tính. Dạo này tôi rất bận. Buổi tối tôi học tiếng Anh."
T3 = "Chị Hoa thường không ăn sáng. Chị ấy thường ăn trưa lúc 12 giờ ở căng tin công ty."
T4 = "Cuối tuần chúng tôi thường đi dạo ở phố đi bộ. Ở đó có nhiều quán cà phê và rất đông người."
q += [B3(T1, "Kate dạy ở trường ILA.", True), B3(T1, "Kate dạy đến 11 giờ rưỡi.", True), B3(T1, "Buổi chiều Kate đi làm.", False),
      B3(T2, "Nam là kỹ sư.", True), B3(T2, "Dạo này Nam không bận.", False), B3(T2, "Buổi tối Nam học tiếng Anh.", True),
      B3(T3, "Chị Hoa thường ăn sáng.", False), B3(T3, "Chị Hoa ăn trưa ở căng tin công ty.", True),
      B3(T4, "Cuối tuần chúng tôi đi dạo ở phố đi bộ.", True), B3(T4, "Phố đi bộ có ít người.", False)]
q += [B4("Anh sắp về chưa?", ["Sắp rồi. Tôi làm xong việc rồi.", "Tôi đi làm bằng xe buýt.", "Ở ngân hàng.", "Lúc 8 giờ sáng."]),
      B4("Anh làm việc ở đâu?", ["Tôi làm việc ở ngân hàng.", "Từ 8 giờ đến 5 giờ.", "Hơi vất vả.", "Khoảng 200 nhân viên."]),
      B4("Chị đi làm bằng gì?", ["Tôi đi làm bằng tắc xi.", "Tôi là thư ký.", "Lúc 8 giờ sáng.", "Ở Quận 1."]),
      B4("Hôm nay anh có bận không?", ["Có, hôm nay tôi rất bận.", "Tôi là bác sĩ.", "Ở bệnh viện.", "Tôi tên là Nam."]),
      B4("Chị thường ăn trưa ở đâu?", ["Ở căng tin công ty.", "Lúc 12 giờ rưỡi.", "Hơi no.", "Với bạn cùng lớp."]),
      B4("Hôm nay anh đi làm trễ hả?", ["Ừ, vì xe buýt đến trễ.", "Tôi là kế toán.", "Ở văn phòng.", "Năm ngày một tuần."]),
      B4("Buổi tối anh thường làm gì?", ["Tôi thường xem tivi.", "Tôi là kỹ sư.", "Ở Quận 2.", "Hai người."]),
      B4("Tối nay chúng ta ăn tối ở đâu?", ["Ở quán ăn gần công ty nhé.", "Lúc 7 giờ sáng.", "Bằng tắc xi.", "Khoảng 30 phút."]),
      B4("Chúng ta đi uống cà phê nhé?", ["Ừ, chúng ta đi.", "Tôi đi làm lúc 8 giờ.", "Lúc 11 giờ.", "Ở ngân hàng."]),
      B4("Dạo này chị thế nào?", ["Dạo này tôi hơi mệt.", "Tôi là kế toán.", "Ở Hà Nội.", "Bằng xe buýt."])]
q += [C1("Tôi đi làm bằng xe buýt.", ["bằng", "tôi", "xe buýt", "đi làm"]), C1("Buổi tối anh ấy thường xem tivi.", ["thường", "buổi tối", "anh ấy", "xem tivi"]),
      C1("Chị ấy làm việc ở ngân hàng.", ["ở", "chị ấy", "ngân hàng", "làm việc"]), C1("Hôm nay tôi hơi mệt.", ["hơi", "hôm nay", "mệt", "tôi"]),
      C1("Cuối tuần chúng tôi đi dạo.", ["đi dạo", "cuối tuần", "chúng tôi"])]
q += [C2("Chị ấy rất đẹp lắm.", 3, "Chị ấy rất đẹp.", "그녀는 아주 예뻐요. (rất와 lắm을 함께 쓰지 않는다)"),
      C2("Hôm nay tôi hơi đói lắm.", 4, "Hôm nay tôi hơi đói.", "오늘 조금 배고파요. (hơi 와 lắm 을 함께 쓰지 않는다)"),
      C2("Tôi đi làm bằng lúc 8 giờ.", 3, "Tôi đi làm lúc 8 giờ.", "저는 8시에 출근해요. (시각 앞은 lúc)"),
      C2("Chị ấy làm việc ở ngân hàng, không phải?", 7, "Chị ấy làm việc ở ngân hàng, phải không?", "그녀는 은행에서 일하죠? (phải không 차례)"),
      C2("Buổi sáng tôi thường sẽ tập thể dục.", 4, "Buổi sáng tôi thường tập thể dục.", "아침에 저는 보통 운동해요. (습관에는 sẽ를 안 쓴다)")]
q.append(C3("나의 하루 — 몇 시에 일어나고, 아침·점심·저녁에 무엇을 하는지 (10문장)",
            ["Buổi sáng tôi thường thức dậy lúc 6 giờ rưỡi.", "Tôi đánh răng, rửa mặt và tập thể dục.", "Tôi ăn sáng lúc 7 giờ.", "Tôi đi làm bằng xe buýt.", "Tôi làm việc ở công ty từ 8 giờ đến 5 giờ.",
             "Tôi thường ăn trưa ở căng tin công ty.", "Buổi tối tôi ăn tối với gia đình.", "Sau đó tôi học tiếng Việt khoảng một tiếng.", "Thỉnh thoảng tôi xem phim trên mạng.", "Tôi đi ngủ lúc 11 giờ."]))
q += D1(["thức dậy", "đánh răng", "rửa mặt", "ăn cơm", "lên mạng", "tin tức", "chuẩn bị", "bữa sáng", "hàng ngày", "gia đình"],
        ["Chị ấy đi làm bằng tắc xi.", "Cuối tuần chúng tôi đi dạo ở phố đi bộ.", "Hôm nay tôi hơi bận.", "Anh ấy làm việc ở bệnh viện.", "Anh làm việc từ mấy giờ đến mấy giờ?"])
q += [D2("chợ", "그림을 보고 말해 보세요 — 여기는 어디이고, 누가 언제 여기에 오며, 여기엔 무엇이 많나요? (3문장)",
         ["Đây là chợ gần nhà tôi.", "Mẹ tôi đi chợ mỗi sáng.", "Ở chợ có nhiều người."], ["여기는 우리 집 근처 시장이에요.", "어머니는 매일 아침 시장에 가요.", "시장에는 사람이 많아요."]),
      D2("bàn ăn", "그림을 보고 말해 보세요 — 가족이 무엇을 하고 있고, 몇 시에 저녁을 먹으며, 누가 요리하나요? (3문장)",
         ["Gia đình tôi đang ngồi ở bàn ăn.", "Chúng tôi ăn tối lúc bảy giờ.", "Mẹ tôi nấu ăn rất ngon."], ["우리 가족은 식탁에 앉아 있어요.", "우리는 7시에 저녁을 먹어요.", "어머니는 요리를 아주 맛있게 해요."])]
q += [D3("동료가 '몇 시부터 몇 시까지 일해요?'라고 묻습니다. 일하는 시간과 점심을 어디에서 먹는지 말해 보세요. (3문장)",
         ["Tôi làm việc từ tám giờ đến năm giờ.", "Buổi trưa tôi ăn cơm ở căng tin.", "Dạo này tôi hơi bận."], ["저는 8시부터 5시까지 일해요.", "점심에는 구내식당에서 밥을 먹어요.", "요즘 조금 바빠요."]),
      D3("친구가 '요즘 어때요?'라고 묻습니다. 요즘 생활을 말해 보세요 — 바쁜지, 몇 시에 자는지, 오늘 기분. (3문장)",
         ["Dạo này công việc của tôi rất bận.", "Tôi thường đi ngủ lúc mười hai giờ.", "Hôm nay tôi hơi buồn ngủ."], ["요즘 저는 아주 바빠요.", "저는 보통 12시에 자러 가요.", "오늘은 조금 피곤해요."])]
AUD = build(2, "모의고사 2", q)
