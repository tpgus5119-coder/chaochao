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
 ("Anh học tiếng Việt mấy tháng rồi?", "Tôi học được [ba] tháng rồi.", ["hai", "năm", "bảy"]),   # 10-11: 듣기 3 물음과 같은 문장이라 바꿈
 ("Lớp của anh có bao nhiêu học viên?", "Khoảng [15] người.", ["50", "5", "500"]),   # 10-11: 읽기 1 문장과 같아 바꿈
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
 ("Ngân hàng mở cửa lúc mấy giờ?", "Ngân hàng mở cửa lúc [8] giờ rưỡi.", ["7", "9", "10"]),   # 10-11: 듣기 3 물음과 같아 바꿈
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
1: ("mock1-w3.webp", [("Đây là một văn phòng.", "여기는 사무실이에요."),
                      ("Văn phòng có ba nhân viên.", "사무실에 직원이 세 명 있어요."),
                      ("Một anh đang làm việc với máy tính.", "한 남자가 컴퓨터로 일하고 있어요."),
                      ("Một chị đang gọi điện thoại.", "한 여자가 전화하고 있어요."),
                      ("Họ đang làm việc.", "그들은 일하고 있어요.")]),
2: ("mock2-w3.webp", [("Bây giờ là buổi sáng.", "지금은 아침이에요."),
                      ("Họ đang ăn sáng.", "그들은 아침을 먹고 있어요."),
                      ("Bố tôi đang đọc báo.", "아버지는 신문을 읽고 있어요."),
                      ("Gia đình tôi có bốn người.", "우리 가족은 네 명이에요."),
                      ("Hai em bé đang uống sữa.", "두 아이가 우유를 마시고 있어요.")]),
3: ("mock3-w3.webp", [("Nhà sách này rất đông.", "이 서점은 사람이 아주 많아요."),
                      ("Sách ở đây giảm giá 30%.", "여기 책은 30% 할인해요."),
                      ("Có nhiều người mua sách.", "책을 사는 사람이 많아요."),
                      ("Một cô gái đang đọc sách.", "한 아가씨가 책을 읽고 있어요."),
                      ("Ở đây có nhiều sách hay.", "여기에는 재미있는 책이 많아요.")]),
4: ("mock4-w3.webp", [("Đây là đường phố ở Thành phố Hồ Chí Minh.", "여기는 호찌민시의 거리예요."),
                      ("Có xe buýt và tắc xi.", "버스와 택시가 있어요."),
                      ("Nhiều người đang đi bộ.", "많은 사람이 걷고 있어요."),
                      ("Ở đây có một bưu điện.", "여기에 우체국이 하나 있어요."),
                      ("Đường phố rất đông.", "거리가 아주 붐벼요.")]),
5: ("mock5-w3.webp", [("Bây giờ là buổi tối.", "지금은 저녁이에요."),
                      ("Gia đình tôi đang ở nhà.", "우리 가족은 집에 있어요."),
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
1: [("Chị ấy học tiếng Việt từ 2 giờ và 4 giờ.", "Chị ấy học tiếng Việt từ 2 giờ đến 4 giờ.", [OK, "Chị ấy học tiếng Việt đến 2 giờ từ 4 giờ."], "Chị ấy học tiếng Việt từ 2 giờ đến 4 giờ.", "그녀는 2시부터 4시까지 베트남어를 배워요."),
    ("Công ty của tôi có nhân viên 30.", "Công ty của tôi có 30 nhân viên.", [OK, "Công ty của tôi 30 có nhân viên."], "Công ty của tôi có 30 nhân viên.", "우리 회사에는 직원이 30명 있어요."),
    ("Anh ấy đi ăn trưa lúc giờ 12.", "Anh ấy đi ăn trưa lúc 12 giờ.", [OK, "Anh ấy ăn đi trưa lúc 12 giờ."], "Anh ấy đi ăn trưa lúc 12 giờ.", "그는 12시에 점심을 먹으러 가요."),
    ("Hôm nay tôi rất mệt.", OK, ["Hôm nay tôi mệt rất.", "Hôm nay rất tôi mệt."], "Hôm nay tôi rất mệt.", "오늘 저는 아주 피곤해요."),
    ("Anh ấy cũng làm kế toán, phải không?", OK, ["Anh ấy cũng làm kế toán, không phải?", "Anh ấy làm cũng kế toán, phải không?"], "Anh ấy cũng làm kế toán, phải không?", "그도 회계사로 일하죠?")],
2: [("Chị ấy rất đẹp lắm.", "Chị ấy rất đẹp.", [OK, "Chị ấy đẹp rất."], "Chị ấy rất đẹp.", "그녀는 아주 예뻐요."),
    ("Anh ấy hơi mệt lắm.", "Anh ấy hơi mệt.", [OK, "Anh ấy mệt hơi."], "Anh ấy hơi mệt.", "그는 조금 피곤해요."),
    ("Tôi đi làm bằng lúc 8 giờ.", "Tôi đi làm lúc 8 giờ.", [OK, "Tôi đi làm lúc giờ 8."], "Tôi đi làm lúc 8 giờ.", "저는 8시에 출근해요."),
    ("Anh ấy là bác sĩ, phải không?", OK, ["Anh ấy là bác sĩ, không phải?", "Anh ấy bác sĩ là, phải không?"], "Anh ấy là bác sĩ, phải không?", "그는 의사죠?"),
    ("Em ấy thường đi học sớm.", OK, ["Em ấy đi học thường sớm.", "Em ấy thường sớm đi học."], "Em ấy thường đi học sớm.", "그 아이는 보통 일찍 학교에 가요.")],
3: [("Bảo tàng ở đâu gần trường Nhân văn.", "Bảo tàng ở gần trường Nhân văn.", [OK, "Bảo tàng ở gần Nhân văn trường."], "Bảo tàng ở gần trường Nhân văn.", "박물관은 인문대학 근처에 있어요."),
    ("Hôm qua anh ấy sẽ mua sách ở đó.", "Hôm qua anh ấy đã mua sách ở đó.", [OK, "Hôm qua anh ấy đã mua ở đó sách."], "Hôm qua anh ấy đã mua sách ở đó.", "어제 그는 거기서 책을 샀어요."),
    ("Anh biết địa chỉ nhà sách không có?", "Anh có biết địa chỉ nhà sách không?", [OK, "Anh có biết địa chỉ không nhà sách?"], "Anh có biết địa chỉ nhà sách không?", "서점 주소를 알아요?"),
    ("Cà phê ở đây ngon lắm.", OK, ["Cà phê ở đây rất ngon lắm.", "Cà phê ở đây lắm ngon."], "Cà phê ở đây ngon lắm.", "여기 커피는 아주 맛있어요."),
    ("Ngày mai tôi sẽ đi tham quan bảo tàng.", OK, ["Ngày mai tôi đi sẽ tham quan bảo tàng.", "Ngày mai sẽ tôi đi tham quan bảo tàng."], "Ngày mai tôi sẽ đi tham quan bảo tàng.", "내일 저는 박물관을 구경하러 갈 거예요.")],
4: [("Tôi đi học bằng lúc 8 giờ.", "Tôi đi học lúc 8 giờ.", [OK, "Tôi đi học lúc giờ 8."], "Tôi đi học lúc 8 giờ.", "저는 8시에 학교에 가요."),
    ("Nhà tôi ở gần đến công ty.", "Nhà tôi ở gần công ty.", [OK, "Nhà tôi ở công ty gần."], "Nhà tôi ở gần công ty.", "우리 집은 회사 근처에 있어요."),
    ("Tôi học từ 8 giờ và 11 giờ.", "Tôi học từ 8 giờ đến 11 giờ.", [OK, "Tôi học từ 8 giờ đến giờ 11."], "Tôi học từ 8 giờ đến 11 giờ.", "저는 8시부터 11시까지 공부해요."),
    ("Chúng ta đi bằng xe buýt.", OK, ["Chúng ta bằng đi xe buýt.", "Chúng ta đi xe buýt bằng."], "Chúng ta đi bằng xe buýt.", "우리 버스로 가요."),
    ("Tôi thường đi làm sớm.", OK, ["Tôi đi làm thường sớm.", "Tôi thường sớm đi làm."], "Tôi thường đi làm sớm.", "저는 보통 일찍 출근해요.")],
5: [("Tôi thường tập thể dục vào buổi sáng lắm.", "Tôi thường tập thể dục vào buổi sáng.", [OK, "Tôi thường tập thể dục buổi sáng vào."], "Tôi thường tập thể dục vào buổi sáng.", "저는 보통 아침에 운동해요."),
    ("Tối nay tôi đọc sẽ sách.", "Tối nay tôi sẽ đọc sách.", [OK, "Tối nay sẽ tôi đọc sách."], "Tối nay tôi sẽ đọc sách.", "오늘 밤 저는 책을 읽을 거예요."),
    ("Anh ấy thích rất xem phim.", "Anh ấy rất thích xem phim.", [OK, "Anh ấy rất xem phim thích."], "Anh ấy rất thích xem phim.", "그는 영화 보는 걸 아주 좋아해요."),
    ("Hôm nay tôi hơi chán.", OK, ["Tôi chán hôm nay hơi.", "Hôm nay tôi chán hơi."], "Hôm nay tôi hơi chán.", "오늘 저는 조금 심심해요."),
    ("Tôi thường đi dạo với bố mẹ.", OK, ["Tôi đi dạo thường với bố mẹ.", "Tôi thường với đi dạo bố mẹ."], "Tôi thường đi dạo với bố mẹ.", "저는 보통 부모님과 산책해요.")],
}

# ── 2026-10-11 대표님 "실제 시험 이미지 보고 형태 틀 그대로 따라한 거 맞니? 그림과 문장을 한 번만 쓰는 게 아니라 몇 번 쓰네" ──
# 실제 1차(원본자료/…/주간시험/IMG_7001~7011) 를 다시 보니: 읽기 3 은 지문 다섯 × 문장 둘(우리는 3·3·2·2 였다),
# 읽기 4 는 물음 A~J 열 개를 한 목록으로 주고 대답 열 개가 저마다 하나에 짝(우리는 문항마다 보기 넷을 돌려 써 같은 물음이 네 번씩 보였다).
# 또 우리 벌은 같은 문장이 다른 갈래에 그대로 다시 나왔다(실제 1차 3번 · 우리 5~24번) — 아래는 겹치지 않게 새로 쓴 것.
# B3F: 지문 다섯, 지문마다 (문장, 맞다?) 둘.  B4J: (물음 A~J, 그 대답) 열 — 대답은 섞어 1~10 으로 낸다.  C1N: 쓰기 1 다섯(문장, 조각).  DN: 말하기 문장 다섯.
B3F = {
1: [("Anh Park là người Hàn Quốc. Trước đây anh ấy là kỹ sư ở Seoul. Bây giờ anh ấy dạy tiếng Hàn ở Thành phố Hồ Chí Minh.", [("Bây giờ anh Park là kỹ sư.", False), ("Anh Park dạy tiếng Hàn.", True)]),
    ("Chị Mai là thư ký ở một công ty. Chị ấy làm việc từ 9 giờ sáng đến 6 giờ chiều. Thứ bảy chị ấy nghỉ ở nhà.", [("Chị Mai làm việc đến 6 giờ chiều.", True), ("Thứ bảy chị Mai đi làm.", False)]),
    ("Bố tôi làm việc ở bệnh viện gần nhà. Dạo này bố tôi rất bận nên thường về nhà trễ.", [("Bố tôi làm việc ở bệnh viện.", True), ("Dạo này bố tôi rất rảnh.", False)]),
    ("Ông Long là tài xế. Hôm qua ông ấy lái xe đi sân bay lúc 5 giờ sáng. Hôm nay ông ấy nghỉ ở nhà.", [("Hôm qua ông Long đi sân bay.", True), ("Hôm nay ông Long đi làm.", False)]),
    ("Chị Lan là nhân viên quán cà phê. Chị ấy đi làm lúc 6 giờ sáng. Chị ấy rất thích công việc này.", [("Chị Lan làm việc ở quán cà phê.", True), ("Chị Lan đi làm lúc 9 giờ sáng.", False)])],
2: [("Chị Kate là giáo viên tiếng Anh. Chị ấy dạy từ 9 giờ sáng đến 11 giờ rưỡi. Buổi chiều chị ấy rảnh.", [("Chị Kate là giáo viên.", True), ("Buổi chiều chị Kate đi làm.", False)]),
    ("Tôi tên là Nam. Tôi là kỹ sư. Dạo này tôi rất bận. Buổi tối tôi học tiếng Anh.", [("Nam là kỹ sư.", True), ("Dạo này Nam không bận.", False)]),
    ("Chị Hoa thường không ăn sáng. Chị ấy ăn trưa lúc 12 giờ ở căng tin.", [("Chị Hoa thường ăn sáng.", False), ("Chị Hoa ăn trưa lúc 12 giờ.", True)]),
    ("Cuối tuần chúng tôi thường đi dạo ở phố đi bộ. Ở đó có nhiều quán cà phê và rất đông người.", [("Phố đi bộ có nhiều quán cà phê.", True), ("Phố đi bộ có ít người.", False)]),
    ("Mỗi sáng anh Long thức dậy lúc 5 giờ rưỡi. Anh ấy tập thể dục rồi đi làm lúc 7 giờ.", [("Anh Long thức dậy lúc 5 giờ rưỡi.", True), ("Anh Long đi làm lúc 9 giờ.", False)])],
3: [("Chị Vân làm việc ở bưu điện Quận 3. Bưu điện mở cửa lúc 7 giờ sáng. Buổi trưa chị ấy thường ăn ở quán ăn gần đó.", [("Chị Vân làm việc ở bưu điện.", True), ("Bưu điện mở cửa lúc 9 giờ.", False)]),
    ("Nhà hàng Mai ở Quận 3. Món ăn ở đó ngon và rẻ. Nhân viên rất thân thiện.", [("Món ăn ở nhà hàng Mai rất mắc.", False), ("Nhân viên nhà hàng Mai thân thiện.", True)]),
    ("Dorothy là người Mỹ. Chị ấy đến Việt Nam để học tiếng Việt. Chị ấy nói tiếng Việt khá giỏi.", [("Dorothy là người Việt Nam.", False), ("Dorothy học tiếng Việt.", True)]),
    ("Tối nay anh Min mời bạn bè đến nhà ăn tối. Anh ấy nấu ăn rất ngon. Bạn của anh ấy đều là người Việt Nam.", [("Anh Min mời bạn bè đi nhà hàng.", False), ("Anh Min nấu ăn rất ngon.", True)]),
    ("Nhà sách gần trường tôi mở cửa từ 8 giờ sáng đến 9 giờ tối. Sách ở đó không mắc. Sinh viên thường đến đó đọc sách.", [("Nhà sách mở cửa đến 9 giờ tối.", True), ("Sách ở nhà sách đó rất mắc.", False)])],
4: [("Anh Tuấn là tài xế xe buýt. Xe buýt của anh ấy đi từ Quận 1 đến sân bay. Một ngày anh ấy làm việc khoảng 10 tiếng.", [("Anh Tuấn lái xe tắc xi.", False), ("Xe buýt của anh Tuấn đi sân bay.", True)]),
    ("Nhà Mai ở xa công ty nên Mai phải đi làm sớm. Mai đi bằng tắc xi vì xe buýt rất đông.", [("Nhà Mai gần công ty.", False), ("Mai đi làm bằng tắc xi.", True)]),
    ("Ga Sài Gòn ở Quận 3. Mỗi ngày có nhiều người đi Đà Nẵng và Hà Nội từ ga này. Hôm nay ga rất đông.", [("Ga Sài Gòn ở Quận 1.", False), ("Hôm nay ga Sài Gòn rất đông.", True)]),
    ("Bệnh viện ở gần nhà tôi. Từ nhà tôi đi bộ đến đó mất 5 phút. Bố tôi là bác sĩ ở bệnh viện này.", [("Bệnh viện ở xa nhà tôi.", False), ("Bố tôi là bác sĩ.", True)]),
    ("Hôm qua tôi đến sân bay trễ 20 phút. Máy bay đã cất cánh rồi. Tôi phải chờ máy bay khác.", [("Hôm qua tôi đến sân bay sớm.", False), ("Tôi phải chờ máy bay khác.", True)])],
5: [("Tôi tên là Hoa. Tôi là sinh viên. Buổi sáng tôi đi học, buổi chiều tôi làm thêm ở quán cà phê.", [("Hoa là sinh viên.", True), ("Buổi chiều Hoa đi học.", False)]),
    ("Anh Nam thích tập thể dục. Mỗi sáng anh ấy đi bộ ở gần nhà khoảng 30 phút. Anh ấy rất khỏe.", [("Anh Nam đi bộ buổi tối.", False), ("Anh Nam rất khỏe.", True)]),
    ("Cuối tuần chúng tôi thường đi xem phim ở gần trung tâm thành phố. Sau khi xem phim, chúng tôi đi ăn tối.", [("Chúng tôi ăn tối trước khi xem phim.", False), ("Cuối tuần chúng tôi đi xem phim.", True)]),
    ("Bà tôi thích hát. Mỗi tối bà ấy hát khoảng một tiếng rồi đi ngủ lúc 9 giờ.", [("Bà tôi thích hát.", True), ("Bà tôi đi ngủ lúc 11 giờ.", False)]),
    ("Anh Long là nhân viên ngân hàng. Anh ấy thường đi làm về lúc 6 giờ. Buổi tối anh ấy nấu ăn và xem tin tức.", [("Anh Long là nhân viên ngân hàng.", True), ("Buổi tối anh Long đi chơi.", False)])],
}
# 읽기 4 — 대답 하나가 물음 하나에만 맞게 (물음 낱말이 저마다 다르다: 누구·어디·몇 시·얼마·왜·…인가요?·…했나요? …)
B4J = {
1: [("Em làm nghề gì?", "Em là luật sư."), ("Ngân hàng của chị ở đâu?", "Ở Quận 1, gần nhà thờ Đức Bà."), ("Mấy giờ anh đi làm?", "Lúc 7 giờ rưỡi sáng."),
    ("Văn phòng của chị có bao nhiêu người?", "Có 12 người."), ("Một tuần chị làm việc mấy ngày?", "Sáu ngày."), ("Ai là giám đốc công ty này?", "Ông Kim là giám đốc."),
    ("Mẹ anh đã nghỉ hưu chưa?", "Chưa, mẹ tôi vẫn đi làm."), ("Sao hôm nay chị về trễ?", "Vì công ty có nhiều việc."), ("Anh là bác sĩ phải không?", "Không, tôi là kỹ sư."), ("Anh đi đâu đấy?", "Tôi đi bưu điện.")],
2: [("Mấy giờ chị thức dậy?", "Lúc 5 giờ sáng."), ("Sáng nay anh ăn gì?", "Tôi ăn cơm."), ("Em đánh răng mấy lần một ngày?", "Hai lần."),
    ("Ai thường nấu ăn ở nhà anh?", "Mẹ tôi."), ("Tối nay anh có đi chơi không?", "Không, tối nay tôi ở nhà."), ("Sao chị không ăn sáng?", "Vì tôi thức dậy trễ."),
    ("Anh thường lên mạng để làm gì?", "Để xem tin tức."), ("Chị đi ngủ chưa?", "Chưa, tôi chưa buồn ngủ."), ("Gia đình anh có mấy người?", "Bốn người."), ("Bây giờ là mấy giờ?", "Bây giờ là 7 giờ rưỡi.")],
3: [("Anh muốn mua gì?", "Tôi muốn mua áo dài."), ("Bưu điện có xa không?", "Không, bưu điện ở gần đây."), ("Sao anh biết nhà hàng này?", "Vì bạn tôi giới thiệu."),
    ("Đi tắc xi đến đó mất bao lâu?", "Mất khoảng 15 phút."), ("Tối nay chúng ta đi uống bia nhé?", "Tốt quá! Mấy giờ?"), ("Nhà hàng đó có ngon không?", "Ngon lắm, nhưng hơi mắc."),
    ("Ai giới thiệu chị với anh Min?", "Anh Hiroki giới thiệu."), ("Bảo tàng mở cửa lúc mấy giờ?", "Lúc 8 giờ sáng."), ("Anh đang làm gì đấy?", "Tôi đang đọc sách."), ("Nhà sách ở số mấy?", "Số 25, Quận 3.")],
4: [("Chị đi làm bằng gì?", "Bằng tắc xi."), ("Nhà anh ở đâu?", "Ở Quận 7, hơi xa trung tâm."), ("Từ đây đến ga mất bao lâu?", "Khoảng 15 phút đi bộ."),
    ("Mấy giờ máy bay cất cánh?", "Lúc 10 giờ rưỡi."), ("Xe buýt số mấy đi sân bay?", "Số 109."), ("Sao anh đến trễ?", "Vì đường rất đông."),
    ("Nhà sách có gần đây không?", "Có, gần lắm."), ("Anh đi Đà Nẵng với ai?", "Với bạn cùng lớp."), ("Chúng ta đi bộ đến đó nhé?", "Ừ, đi bộ cũng được."), ("Tuần sau chị đi đâu?", "Tôi đi Huế thăm bạn.")],
5: [("Anh thích xem phim gì?", "Tôi thích phim Hàn Quốc."), ("Tối nay em làm gì?", "Em học bài."), ("Mấy giờ chị ăn tối?", "Lúc 7 giờ tối."),
    ("Anh có thích nấu ăn không?", "Không, tôi không biết nấu ăn."), ("Cuối tuần này chị có rảnh không?", "Có, tôi rảnh cả ngày."), ("Sao chị không đi xem phim?", "Vì tôi hơi mệt."),
    ("Bạn của anh là ai?", "Anh ấy là Tuấn, bạn cùng lớp của tôi."), ("Anh thường nghe nhạc ở đâu?", "Ở trên mạng."), ("Em có thường đọc báo không?", "Thỉnh thoảng."), ("Tuần sau gia đình anh đi đâu?", "Gia đình tôi đi Huế.")],
}
C1N = {
1: [("Mẹ tôi là nội trợ.", ["là", "tôi", "nội trợ", "mẹ"]), ("Bệnh viện này có nhiều bác sĩ.", ["có", "bệnh viện", "nhiều", "này", "bác sĩ"]), ("Công việc của tôi rất vất vả.", ["rất", "của", "công việc", "vất vả", "tôi"]),
    ("Tôi bắt đầu làm việc lúc 9 giờ.", ["lúc", "tôi", "9 giờ", "bắt đầu", "làm việc"]), ("Xe sắp đến chưa anh?", ["sắp", "xe", "chưa", "đến", "anh"])],
2: [("Mỗi ngày tôi đọc báo.", ["đọc báo", "mỗi ngày", "tôi"]), ("Bố tôi đi làm rất sớm.", ["rất", "bố", "sớm", "đi làm", "tôi"]), ("Chúng tôi ăn tối lúc 7 giờ.", ["lúc", "chúng tôi", "7 giờ", "ăn tối"]),
    ("Tôi rửa mặt rồi đánh răng.", ["rồi", "tôi", "đánh răng", "rửa mặt"]), ("Em tôi thích lên mạng.", ["thích", "tôi", "lên mạng", "em"])],
3: [("Chúng ta đi bằng tắc xi nhé.", ["nhé", "chúng ta", "tắc xi", "đi", "bằng"]), ("Tôi mời bạn tôi đi ăn tối.", ["mời", "tôi", "ăn tối", "đi", "bạn", "tôi"]), ("Bảo tàng này rất đẹp.", ["rất", "bảo tàng", "đẹp", "này"]),
    ("Quán cà phê này rất đông.", ["đông", "quán cà phê", "này", "rất"]), ("Anh sắp về chưa?", ["sắp", "anh", "về", "chưa"])],
4: [("Ga ở gần nhà tôi.", ["gần", "ga", "tôi", "ở", "nhà"]), ("Máy bay đến lúc 9 giờ tối.", ["lúc", "máy bay", "9 giờ", "đến", "tối"]), ("Tôi đi bộ đến công ty.", ["đi bộ", "tôi", "công ty", "đến"]),
    ("Tôi chờ xe buýt khoảng 10 phút.", ["khoảng", "tôi", "10 phút", "chờ", "xe buýt"]), ("Sân bay ở xa trung tâm.", ["xa", "sân bay", "trung tâm", "ở"])],
5: [("Ông tôi thích đọc báo.", ["thích", "ông", "đọc báo", "tôi"]), ("Anh ấy không thích xem tivi.", ["không", "anh ấy", "xem tivi", "thích"]), ("Mẹ tôi nấu ăn rất ngon.", ["nấu ăn", "mẹ", "rất ngon", "tôi"]),
    ("Em tôi đang xem phim.", ["đang", "em", "xem phim", "tôi"]), ("Mỗi tối tôi xem tin tức.", ["xem tin tức", "mỗi tối", "tôi"])],
}
DN = {
1: ["Cơ quan của mẹ tôi ở gần đây.", "Hôm nay tôi không đi làm.", "Ngân hàng mở cửa lúc 8 giờ.", "Anh ấy là nhân viên mới.", "Tôi muốn làm luật sư."],
2: ["Buổi sáng tôi uống cà phê.", "Chiều nay tôi rảnh.", "Anh ấy làm việc ở bệnh viện.", "Em tôi thường đi ngủ sớm.", "Anh làm việc từ mấy giờ đến mấy giờ?"],
3: ["Nhà thờ Đức Bà rất đẹp.", "Hôm nay siêu thị giảm giá 10%.", "Tôi thích uống bia tươi.", "Ngày mai anh có rảnh không?", "Chị sắp đi chưa?"],
4: ["Nhà sách ở bên cạnh bưu điện.", "Hôm nay đường rất đông.", "Máy bay sắp đến Hà Nội.", "Tôi không thích đi xe buýt.", "Chúng ta đi lúc mấy giờ?"],
5: ["Anh ấy hay xem phim một mình.", "Tôi rất buồn ngủ.", "Ông bà tôi sống ở Huế.", "Chúng tôi thích đi du lịch.", "Bây giờ em đang làm gì?"],
}

# ── 2026-10-11 대표님 "단어 조각으로 만드는 건 문법에 맞는지만 보면 된다 — 여러 문장이 정답이 될 수 있다" ──
# 쓰기 1: 같은 조각으로 만들 수 있는 **다른 바른 차례**(때를 나타내는 말을 앞·뒤로, 주어·목적어를 바꿔도 말이 되는 것). 열쇠 = 정답 문장
C1ALT = {   # 2026-10-12 대표님 "가능한 모든 문장은 답으로 갖고 있어야" — 조각 30문항마다 모든 차례를 따져 바른 것을 다 적음(뜻이 달라져도 문법·말이 되면 정답 — 시험지에 뜻이 없으니)
 "Anh John cũng là sinh viên lớp tôi.": ["Tôi cũng là sinh viên lớp anh John."],
 "Sinh viên lớp này đều học chăm chỉ.": ["Sinh viên lớp này đều chăm chỉ học.", "Lớp này sinh viên đều học chăm chỉ.", "Lớp này sinh viên đều chăm chỉ học."],
 "Hôm qua tôi không gặp em Vi.": ["Tôi không gặp em Vi hôm qua.", "Tôi hôm qua không gặp em Vi.", "Hôm qua em Vi không gặp tôi.", "Em Vi không gặp tôi hôm qua.", "Em Vi hôm qua không gặp tôi."],
 "Bệnh viện này có nhiều bác sĩ.": ["Bác sĩ này có nhiều bệnh viện."],
 "Tôi bắt đầu làm việc lúc 9 giờ.": ["Lúc 9 giờ tôi bắt đầu làm việc."],
 "Xe sắp đến chưa anh?": ["Anh, xe sắp đến chưa?", "Xe anh sắp đến chưa?"],
 "Mỗi ngày tôi đọc báo.": ["Tôi đọc báo mỗi ngày.", "Tôi mỗi ngày đọc báo."],
 "Chúng tôi ăn tối lúc 7 giờ.": ["Lúc 7 giờ chúng tôi ăn tối."],
 "Tôi rửa mặt rồi đánh răng.": ["Tôi đánh răng rồi rửa mặt."],
 "Tôi mời bạn tôi đi ăn tối.": ["Bạn tôi mời tôi đi ăn tối."],
 "Ga ở gần nhà tôi.": ["Nhà tôi ở gần ga.", "Nhà ga ở gần tôi.", "Tôi ở gần nhà ga."],
 "Máy bay đến lúc 9 giờ tối.": ["Lúc 9 giờ tối máy bay đến."],
 "Sân bay ở xa trung tâm.": ["Trung tâm ở xa sân bay."],
 "Mỗi tối tôi xem tin tức.": ["Tôi xem tin tức mỗi tối.", "Tôi mỗi tối xem tin tức."],
}
# 쓰기 2: 틀린 문장을 고치는 **다른 바른 방법** (열쇠 = 바른 문장)
C2ALT = {
 "Chị ấy học tiếng Việt từ 2 giờ đến 4 giờ.": ["Chị ấy học tiếng Việt lúc 2 giờ và 4 giờ."],
 "Công ty của tôi có 30 nhân viên.": ["Công ty tôi có 30 nhân viên."],
 "Chị ấy rất đẹp.": ["Chị ấy đẹp lắm."],
 "Anh ấy hơi mệt.": ["Anh ấy mệt lắm."],
 "Bảo tàng ở gần trường Nhân văn.": ["Bảo tàng gần trường Nhân văn."],
 "Hôm qua anh ấy đã mua sách ở đó.": ["Hôm qua anh ấy mua sách ở đó.", "Ngày mai anh ấy sẽ mua sách ở đó."],
 "Anh có biết địa chỉ nhà sách không?": ["Anh biết địa chỉ nhà sách không?"],
 "Nhà tôi ở gần công ty.": ["Nhà tôi gần công ty."],
 "Tôi học từ 8 giờ đến 11 giờ.": ["Tôi học lúc 8 giờ và 11 giờ."],
 "Tôi thường tập thể dục vào buổi sáng.": ["Tôi thường tập thể dục buổi sáng."],
 "Tối nay tôi sẽ đọc sách.": ["Tối nay tôi đọc sách."],
 "Anh ấy rất thích xem phim.": ["Anh ấy thích xem phim lắm.", "Anh ấy thích xem phim."],
 "Chị là người Việt phải không?": ["Chị có phải là người Việt không?", "Chị là người Việt Nam phải không?"],
 "Giáo viên của tôi là người Úc.": ["Giáo viên tôi là người Úc."],
}

