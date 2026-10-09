# -*- coding: utf-8 -*-
"""모의고사 다섯 벌을 **실제 1차 시험지(data/exam1.json) 틀 그대로** (대표님 2026-10-09 "내가 참고하라고 한 실제 1회차 시험지 — 시험 형식 틀은 그대로 동일하게, 단어와 문법만 범위 다르게").
1차 틀: A 듣기 30 — 1 그림 맞다/틀리다 5 · 2 맞는 그림 5(그림 다섯 A~E 를 다섯 문항이 같이 씀) · 3 듣고 고르기 10(A/B/C) · 4 듣고 빈칸 10(보기 넷)
        B 읽기 30 — 1 빈칸 5(보기 다섯 같이 씀) · 2 읽고 고르기 5 · 3 맞다/틀리다 10 · 4 알맞은 문장 10(대답을 보고 앞의 물음 고르기)
        C 쓰기 20 — 1 낱말 배열 5 · 2 맞으면 Đúng, 틀리면 고치기 5 · 3 그림 보고 5문장(10점)
        D 말하기 20 — 1 낱말 읽기 10 · 2 문장 읽기 5
이 파일은 새로 써야 하는 두 갈래만 담는다: 듣기 4(빈칸) · 쓰기 3(그림 + 모범 5문장). 나머지는 common.form1() 이 벌마다 이미 있는 문항을 1차 꼴로 옮긴다.
A4: (물음 A, 대답 B — 빈칸 자리는 [ ], 보기 셋(틀린 것)). 들려주는 소리 = 대답 B 전체. 1차처럼 'A: … B: … ____' 꼴."""

A4F = {
1: [
 ("Anh làm nghề gì?", "Tôi là [kế toán] ở ngân hàng.", ["kỹ sư", "thư ký", "bác sĩ"]),
 ("Chị làm việc ở đâu?", "Ở [công ty máy tính].", ["ngân hàng", "bệnh viện", "siêu thị"]),
 ("Anh dạy mấy ngày một tuần?", "[Năm] ngày một tuần.", ["Hai", "Ba", "Bảy"]),
 ("Công ty anh có bao nhiêu nhân viên?", "Khoảng [50] người.", ["15", "500", "5"]),
 ("Buổi chiều chị làm việc từ mấy giờ đến mấy giờ?", "Từ 2 giờ đến [7] giờ tối.", ["6", "9", "11"]),
 ("Dạo này anh làm gì?", "Tôi đang làm [thư ký] ở một công ty.", ["kế toán", "kỹ sư", "nhân viên"]),
 ("Cô ấy cũng làm kỹ sư, phải không?", "Không, cô ấy [là] thư ký.", ["có", "ở", "đi"]),
 ("Hôm qua anh có đi làm không?", "Có, nhưng tôi đến [hơi] trễ.", ["rất", "cũng", "đã"]),
 ("Anh sắp đi làm chưa?", "[Sắp] rồi. Tôi đi ngay.", ["Chưa", "Có", "Không"]),
 ("Công việc của chị thế nào?", "Hơi vất vả nhưng [thú vị].", ["dễ", "bận", "mệt"]),
],
2: [
 ("Chị sắp đi ăn trưa chưa?", "Sắp rồi. Bây giờ tôi hơi [đói].", ["mệt", "bận", "buồn ngủ"]),
 ("Anh làm việc ở đâu?", "Ở [ngân hàng].", ["bệnh viện", "siêu thị", "bưu điện"]),
 ("Em đi học lúc mấy giờ?", "Lúc [8] giờ sáng.", ["7", "9", "10"]),
 ("Từ nhà đến công ty mất bao lâu?", "Khoảng [40] phút.", ["14", "30", "50"]),
 ("Cuối tuần chị thường làm gì?", "Tôi thường đi chơi với [bạn].", ["mẹ", "bố", "em"]),
 ("Lớp anh có bao nhiêu sinh viên?", "Khoảng [20] sinh viên.", ["12", "25", "200"]),
 ("Anh đi làm bằng gì?", "Bằng [xe buýt].", ["tắc xi", "máy bay", "đi bộ"]),
 ("Hôm nay chị có bận không?", "Có, hôm nay tôi [rất] bận.", ["hơi", "không", "cũng"]),
 ("Buổi trưa anh thường ăn ở đâu?", "Ở [căng tin] công ty.", ["văn phòng", "nhà hàng", "quán ăn"]),
 ("Hôm qua chị đi ngủ lúc mấy giờ?", "Lúc [12] giờ đêm.", ["10", "11", "1"]),
],
3: [
 ("Bây giờ chúng ta đi đâu?", "Chúng ta đi mua [sách].", ["bia", "cà phê", "áo dài"]),
 ("Nhà sách ở đâu?", "Ở số [40] đường Nguyễn Huệ.", ["14", "4", "44"]),
 ("Anh muốn mua sách gì?", "Sách [lịch sử] Việt Nam.", ["tiếng Việt", "tiếng Anh", "tiếng Nhật"]),
 ("Gần Đài Truyền hình Thành phố, phải không cô?", "[Đúng] rồi, anh.", ["Sắp", "Có", "Không"]),
 ("Anh có biết nhà hàng nào ngon không?", "Có, tôi biết một nhà hàng ở [Quận 1].", ["Quận 2", "Quận 7", "Quận 3"]),
 ("Ngày mai chị có rảnh không?", "Có, tôi rảnh từ [2] giờ chiều.", ["3", "4", "5"]),
 ("Anh có biết chỗ đó địa chỉ số mấy không?", "Số [125], Quận 1.", ["152", "25", "215"]),
 ("Tối nay chúng ta ăn ở đâu?", "Ở quán ăn gần [trường] nhé.", ["nhà", "công ty", "ngân hàng"]),
 ("Tắc xi sắp đến chưa anh?", "Sắp [đến] rồi, cô.", ["đi", "về", "ăn"]),
 ("Cô nói tiếng Việt giỏi quá!", "[Cám ơn] anh.", ["Xin lỗi", "Chào", "Tạm biệt"]),
],
4: [
 ("Siêu thị ở đâu?", "Ở Quận [7].", ["1", "2", "3"]),
 ("Từ đây đến sân bay mất bao lâu?", "Khoảng [30] phút.", ["13", "3", "33"]),
 ("Chị đi Hà Nội bằng gì?", "Bằng [máy bay].", ["xe buýt", "tắc xi", "đi bộ"]),
 ("Mấy giờ chúng ta gặp nhau?", "Lúc [6] giờ tối.", ["7", "8", "9"]),
 ("Bây giờ anh đang ở đâu?", "Tôi đang ở [bưu điện].", ["ngân hàng", "nhà sách", "siêu thị"]),
 ("Siêu thị mở cửa lúc mấy giờ?", "Siêu thị mở cửa lúc [9] giờ sáng.", ["7", "8", "10"]),
 ("Đi đến đó mất bao lâu?", "Mất khoảng [20] phút.", ["12", "2", "25"]),
 ("Máy bay sắp cất cánh chưa?", "Sắp rồi. Chúng ta đi [ngay] nhé.", ["về", "chơi", "làm"]),
 ("Nhà chị có gần công ty không?", "Không, nhà tôi hơi [xa].", ["gần", "nhỏ", "đẹp"]),
 ("Tối nay chúng ta đi đâu?", "Đi quán ăn gần [công ty].", ["trường", "nhà", "bệnh viện"]),
],
5: [
 ("Buổi tối anh thường làm gì?", "Tôi thường xem [tivi].", ["phim", "báo", "tin tức"]),
 ("Chị thích nghe nhạc không?", "Có, tôi [rất] thích.", ["hơi", "không", "cũng"]),
 ("Em đi ngủ lúc mấy giờ?", "Lúc [11] giờ.", ["10", "12", "1"]),
 ("Anh có tập thể dục không?", "Có, tôi tập thể dục mỗi buổi [sáng].", ["tối", "trưa", "chiều"]),
 ("Cuối tuần chị thường đi đâu?", "Tôi thường đi xem [phim].", ["tivi", "sách", "báo"]),
 ("Hôm qua anh thức khuya hả?", "Ừ, tôi đi ngủ lúc [1] giờ.", ["11", "12", "2"]),
 ("Ai nấu ăn trong gia đình chị?", "[Mẹ] tôi nấu ăn.", ["Bố", "Em", "Bà"]),
 ("Anh sắp đi ngủ chưa?", "Sắp rồi. Tôi [buồn ngủ] quá.", ["mệt", "đói", "bận"]),
 ("Anh thường ăn sáng ở đâu?", "Ở [nhà].", ["công ty", "căng tin", "quán cà phê"]),
 ("Sao hôm nay chị mệt vậy?", "Vì tối qua tôi [thức khuya].", ["đi chơi", "đi làm", "học bài"]),
],
}

# 쓰기 3 — 그림 한 장 + 모범 5문장(뜻). 그림은 img/<이름>.webp (Draw Things 로 이 다섯 문장에 맞게 구움)
C3F = {
1: ("mock1-w3.webp", [("Đây là văn phòng của công ty máy tính.", "여기는 컴퓨터 회사의 사무실이에요."),
                      ("Văn phòng có nhiều nhân viên.", "사무실에 직원이 많아요."),
                      ("Anh ấy là kỹ sư.", "그는 엔지니어예요."),
                      ("Chị ấy là thư ký.", "그녀는 비서예요."),
                      ("Họ đang làm việc.", "그들은 일하고 있어요.")]),
2: ("mock2-w3.webp", [("Bây giờ là buổi sáng.", "지금은 아침이에요."),
                      ("Gia đình tôi đang ăn sáng.", "우리 가족은 아침을 먹고 있어요."),
                      ("Bố tôi đang đọc báo.", "아버지는 신문을 읽고 있어요."),
                      ("Gia đình tôi có bốn người.", "우리 가족은 네 명이에요."),
                      ("Hai em bé đang uống sữa.", "두 아이가 우유를 마시고 있어요.")]),
3: ("mock3-w3.webp", [("Đây là nhà sách.", "여기는 서점이에요."),
                      ("Hôm nay nhà sách giảm giá 30%.", "오늘 서점이 30% 할인해요."),
                      ("Có nhiều người mua sách.", "책을 사는 사람이 많아요."),
                      ("Một cô gái đang đọc sách.", "한 아가씨가 책을 읽고 있어요."),
                      ("Sách ở đây rẻ và hay.", "여기 책은 싸고 재미있어요.")]),
4: ("mock4-w3.webp", [("Đây là đường phố ở Thành phố Hồ Chí Minh.", "여기는 호찌민시의 거리예요."),
                      ("Có xe buýt và tắc xi.", "버스와 택시가 있어요."),
                      ("Nhiều người đang đi bộ.", "많은 사람이 걷고 있어요."),
                      ("Ở đây có một bưu điện.", "여기에 우체국이 하나 있어요."),
                      ("Bây giờ là buổi sáng.", "지금은 아침이에요.")]),
5: ("mock5-w3.webp", [("Hôm nay là thứ bảy.", "오늘은 토요일이에요."),
                      ("Gia đình tôi ở nhà.", "우리 가족은 집에 있어요."),
                      ("Bố tôi đang xem tivi.", "아버지는 TV를 보고 있어요."),
                      ("Mẹ tôi đang nấu ăn.", "어머니는 요리하고 있어요."),
                      ("Em tôi đang nghe nhạc.", "동생은 음악을 듣고 있어요.")]),
}

# 읽기 4 — 대답을 보고 물음 고르기에서, 오답 보기로 쓰면 그 물음에도 맞는 대답이 되는 짝 (2026-10-09 대표님 "답 하나 맞냐? 모든 문제 체크")
B4_AVOID = {
1: {"Tôi làm kế toán ở ngân hàng.": ["Chị làm việc ở đâu?"]},
2: {"Ở căng tin công ty.": ["Tối nay chúng ta ăn tối ở đâu?"]},
3: {"Chúng ta sẽ đi mua sách.": ["Đi đâu, cô?"]},
4: {"Lúc 6 giờ tối nhé.": ["Siêu thị mở cửa lúc mấy giờ?"], "Ở quán ăn gần công ty nhé.": ["Bây giờ chị đang ở đâu?"]},
5: {"Em đi ngủ lúc 11 giờ.": ["Hôm qua anh thức khuya hả?"]},
}
OK = 'Đúng — 맞는 문장'
# 쓰기 2 — 1차 꼴 다섯(셋은 틀린 문장, 둘은 맞는 문장). (보여 줄 문장, 정답 보기, [틀린 보기 둘], 바른 문장, 뜻).
# 10-09 점검: 'có mấy nhân viên'·'đang là'·'sắp … lúc 12 giờ'·'… đi bằng xe buýt đi'·'… uống bia tối nay' 처럼 말이 되는 문장을 틀렸다고 하거나 틀린 보기로 쓰던 것을 바꿈
C2F = {
1: [("Tôi làm việc ở ngân hàng từ 8 giờ sáng và 5 giờ chiều.", "Tôi làm việc ở ngân hàng từ 8 giờ sáng đến 5 giờ chiều.", [OK, "Tôi làm việc ở ngân hàng đến 8 giờ sáng từ 5 giờ chiều."], "Tôi làm việc ở ngân hàng từ 8 giờ sáng đến 5 giờ chiều.", "저는 은행에서 아침 8시부터 오후 5시까지 일해요."),
    ("Tôi là kỹ sư ở máy tính công ty.", "Tôi là kỹ sư ở công ty máy tính.", [OK, "Tôi kỹ sư là ở công ty máy tính."], "Tôi là kỹ sư ở công ty máy tính.", "저는 컴퓨터 회사의 엔지니어예요."),
    ("Anh ấy đi ăn trưa lúc giờ 12.", "Anh ấy đi ăn trưa lúc 12 giờ.", [OK, "Anh ấy ăn đi trưa lúc 12 giờ."], "Anh ấy đi ăn trưa lúc 12 giờ.", "그는 12시에 점심을 먹으러 가요."),
    ("Hôm nay tôi rất mệt.", OK, ["Hôm nay tôi mệt rất.", "Hôm nay rất tôi mệt."], "Hôm nay tôi rất mệt.", "오늘 저는 아주 피곤해요."),
    ("Anh ấy cũng làm kế toán, phải không?", OK, ["Anh ấy cũng làm kế toán, không phải?", "Anh ấy làm cũng kế toán, phải không?"], "Anh ấy cũng làm kế toán, phải không?", "그도 회계사로 일하죠?")],
2: [("Chị ấy rất đẹp lắm.", "Chị ấy rất đẹp.", [OK, "Chị ấy đẹp rất."], "Chị ấy rất đẹp.", "그녀는 아주 예뻐요."),
    ("Hôm nay tôi hơi đói lắm.", "Hôm nay tôi hơi đói.", [OK, "Hôm nay tôi đói hơi."], "Hôm nay tôi hơi đói.", "오늘 저는 조금 배고파요."),
    ("Tôi đi làm bằng lúc 8 giờ.", "Tôi đi làm lúc 8 giờ.", [OK, "Tôi đi làm lúc giờ 8."], "Tôi đi làm lúc 8 giờ.", "저는 8시에 출근해요."),
    ("Chị ấy làm việc ở ngân hàng, phải không?", OK, ["Chị ấy làm việc ở ngân hàng, không phải?", "Chị ấy ở làm việc ngân hàng, phải không?"], "Chị ấy làm việc ở ngân hàng, phải không?", "그녀는 은행에서 일하죠?"),
    ("Buổi sáng tôi thường tập thể dục.", OK, ["Buổi sáng tôi tập thể dục thường.", "Buổi sáng thường tôi tập thể dục."], "Buổi sáng tôi thường tập thể dục.", "아침에 저는 보통 운동해요.")],
3: [("Nhà sách ở đâu số 40 đường Nguyễn Huệ.", "Nhà sách ở số 40 đường Nguyễn Huệ.", [OK, "Nhà sách ở số 40 đường Huệ Nguyễn."], "Nhà sách ở số 40 đường Nguyễn Huệ.", "서점은 응우옌후에 거리 40번지에 있어요."),
    ("Hôm qua anh ấy sẽ mua sách ở đó.", "Hôm qua anh ấy đã mua sách ở đó.", [OK, "Hôm qua anh ấy đã mua ở đó sách."], "Hôm qua anh ấy đã mua sách ở đó.", "어제 그는 거기서 책을 샀어요."),
    ("Anh biết địa chỉ nhà sách không có?", "Anh có biết địa chỉ nhà sách không?", [OK, "Anh có biết địa chỉ không nhà sách?"], "Anh có biết địa chỉ nhà sách không?", "서점 주소를 알아요?"),
    ("Món ăn ở đó ngon lắm.", OK, ["Món ăn ở đó rất ngon lắm.", "Món ăn ở đó lắm ngon."], "Món ăn ở đó ngon lắm.", "거기 음식은 아주 맛있어요."),
    ("Tối nay tôi mời anh đến đó uống bia.", OK, ["Tối nay tôi anh mời đến đó uống bia.", "Tối nay tôi mời anh đến đó bia uống."], "Tối nay tôi mời anh đến đó uống bia.", "오늘 저녁 당신을 거기로 맥주 마시러 초대해요.")],
4: [("Tôi đi học bằng lúc 8 giờ.", "Tôi đi học lúc 8 giờ.", [OK, "Tôi đi học lúc giờ 8."], "Tôi đi học lúc 8 giờ.", "저는 8시에 학교에 가요."),
    ("Nhà tôi ở gần đến công ty.", "Nhà tôi ở gần công ty.", [OK, "Nhà tôi ở công ty gần."], "Nhà tôi ở gần công ty.", "우리 집은 회사 근처에 있어요."),
    ("Tôi học từ 8 giờ và 11 giờ.", "Tôi học từ 8 giờ đến 11 giờ.", [OK, "Tôi học từ 8 giờ đến giờ 11."], "Tôi học từ 8 giờ đến 11 giờ.", "저는 8시부터 11시까지 공부해요."),
    ("Chúng ta đi bằng xe buýt.", OK, ["Chúng ta bằng đi xe buýt.", "Chúng ta đi xe buýt bằng."], "Chúng ta đi bằng xe buýt.", "우리 버스로 가요."),
    ("Nhà sách mở cửa lúc 9 giờ.", OK, ["Nhà sách mở cửa 9 lúc giờ.", "Nhà sách mở cửa lúc giờ 9."], "Nhà sách mở cửa lúc 9 giờ.", "서점은 9시에 문을 열어요.")],
5: [("Tôi thường tập thể dục vào buổi sáng lắm.", "Tôi thường tập thể dục vào buổi sáng.", [OK, "Tôi thường tập thể dục buổi sáng vào."], "Tôi thường tập thể dục vào buổi sáng.", "저는 보통 아침에 운동해요."),
    ("Hôm qua tôi đi ngủ sẽ lúc 1 giờ.", "Hôm qua tôi đi ngủ lúc 1 giờ.", [OK, "Hôm qua tôi đi ngủ lúc giờ 1."], "Hôm qua tôi đi ngủ lúc 1 giờ.", "어제 저는 1시에 잤어요."),
    ("Em thích rất nghe nhạc.", "Em rất thích nghe nhạc.", [OK, "Em rất nghe nhạc thích."], "Em rất thích nghe nhạc.", "저는 음악 듣는 걸 아주 좋아해요."),
    ("Hôm nay tôi hơi chán.", OK, ["Tôi chán hôm nay hơi.", "Hôm nay tôi chán hơi."], "Hôm nay tôi hơi chán.", "오늘 저는 조금 심심해요."),
    ("Tối qua tôi thức khuya nên đi ngủ trễ.", OK, ["Tối qua tôi thức khuya nên ngủ đi trễ.", "Tối qua tôi thức khuya đi ngủ nên trễ."], "Tối qua tôi thức khuya nên đi ngủ trễ.", "어젯밤 늦게까지 깨어 있어서 늦게 잤어요.")],
}
