# -*- coding: utf-8 -*-
from common import *
PICS = ["xem phim", "nghe nhạc", "đọc báo", "tập thể dục", "đi bộ"]
q = []
q += [TF("đi ngủ", "Em ấy đang đi ngủ. Bây giờ là 11 giờ đêm.", True), TF("xem tivi", "Anh ấy đang nấu ăn.", False),
      TF("nghe nhạc", "Chị ấy đang nghe nhạc.", True), TF("ăn sáng", "Anh ấy đang ăn trưa ở căng tin công ty.", False), TF("buồn ngủ", "Em ấy buồn ngủ quá vì hôm qua thức khuya.", True)]
q += [PK(PICS, "Buổi sáng tôi thường tập thể dục ở gần nhà.", 3), PK(PICS, "Tối thứ bảy chúng tôi đi xem phim.", 0), PK(PICS, "Ông tôi thường đọc báo vào buổi sáng.", 2),
      PK(PICS, "Tôi thích nghe nhạc Việt Nam.", 1), PK(PICS, "Chị ấy đi bộ đến trường vì trường gần nhà.", 4)]
q += [A3("Anh ấy thường làm gì sau khi ăn tối?", "Sau khi ăn tối tôi thường xem tivi với gia đình.", ["xem tivi", "học tiếng Việt", "đi ngủ"]),
      A3("Chị ấy thích làm gì?", "Tôi rất thích nghe nhạc và đọc sách.", ["nghe nhạc và đọc sách", "xem phim", "tập thể dục"]),
      A3("Hôm qua em ấy đi ngủ lúc mấy giờ?", "Hôm qua em thức khuya học bài nên đi ngủ lúc 1 giờ.", ["1 giờ", "11 giờ", "10 giờ"]),
      A3("Cuối tuần Nam thường làm gì?", "Cuối tuần tôi thường đi chơi với bạn bè hay xem phim ở nhà.", ["đi chơi hay xem phim", "đi làm", "học tiếng Anh"]),
      A3("Ai nấu ăn trong gia đình?", "Mẹ tôi thường nấu ăn. Thỉnh thoảng bố tôi cũng nấu ăn.", ["mẹ", "bố", "em"]),
      A3("Buổi sáng anh ấy làm gì?", "Buổi sáng tôi thức dậy lúc 6 giờ, tập thể dục rồi ăn sáng.", ["tập thể dục", "xem tivi", "đi ngủ"]),
      A3("Tối nay họ sẽ làm gì?", "Tối nay chúng ta đi xem phim nhé. Phim mới hay lắm.", ["đi xem phim", "đi uống bia", "đi ăn tối"]),
      A3("Chị ấy có thường ăn sáng không?", "Tôi thường không ăn sáng vì tôi đi làm sớm.", ["không", "có", "thỉnh thoảng"]),
      A3("Em ấy học tiếng Việt lúc nào?", "Buổi tối em thường học tiếng Việt khoảng một tiếng.", ["buổi tối", "buổi sáng", "buổi trưa"]),
      A3("Sao hôm nay anh ấy mệt?", "Hôm nay tôi hơi mệt vì tối qua tôi thức khuya xem phim.", ["vì thức khuya xem phim", "vì đi làm sớm", "vì không ăn sáng"])]
q += [A4("Buổi tối anh thường làm gì?", ["Tôi thường xem tivi.", "Tôi là kỹ sư.", "Lúc 7 giờ sáng."]),
      A4("Chị thích nghe nhạc không?", ["Có, tôi rất thích.", "Tôi là người Hàn Quốc.", "Ở nhà."]),
      A4("Em đi ngủ lúc mấy giờ?", ["Lúc 11 giờ.", "Ở phòng em.", "Em rất buồn ngủ."]),
      A4("Anh có tập thể dục không?", ["Có, tôi tập thể dục mỗi buổi sáng.", "Tôi ăn sáng ở nhà.", "Tôi đi làm bằng xe buýt."]),
      A4("Cuối tuần chị thường đi đâu?", ["Tôi thường đi xem phim.", "Tôi là giáo viên.", "Lúc 9 giờ."]),
      A4("Hôm qua anh thức khuya hả?", ["Ừ, tôi đi ngủ lúc 1 giờ.", "Tôi ăn sáng lúc 7 giờ.", "Tôi là sinh viên."]),
      A4("Ai nấu ăn trong gia đình chị?", ["Mẹ tôi nấu ăn.", "Lúc 6 giờ tối.", "Ở nhà."]),
      A4("Em có thích học tiếng Việt không?", ["Có, em rất thích.", "Em học lúc 8 giờ.", "Em là người Hàn Quốc."]),
      A4("Anh thường ăn sáng ở đâu?", ["Ở nhà.", "Lúc 7 giờ.", "Với gia đình."]),
      A4("Sao hôm nay chị mệt vậy?", ["Vì tối qua tôi thức khuya.", "Tôi đi làm lúc 7 giờ.", "Tôi là thư ký."])]
bank = ["thường", "hơi", "nên", "sắp", "quá"]
q += [B1("Tôi ____ không ăn sáng.", bank, 0), B1("Bây giờ tôi ____ mệt.", bank, 1), B1("Tối qua tôi thức khuya ____ hôm nay tôi buồn ngủ.", bank, 2),
      B1("Tôi ____ đi ngủ.", bank, 3), B1("Phim này hay ____!", bank, 4)]
q += [B2("Buổi sáng tôi thức dậy lúc 6 giờ. Tôi tập thể dục khoảng 30 phút, sau đó đánh răng, rửa mặt và ăn sáng. Tôi đi làm lúc 7 giờ rưỡi.", "Tôi tập thể dục bao lâu?", ["khoảng 30 phút", "khoảng một tiếng", "khoảng 10 phút"]),
      B2("Cuối tuần Lan thường ở nhà. Buổi sáng Lan nấu ăn với mẹ. Buổi chiều Lan nghe nhạc và đọc sách. Buổi tối Lan xem phim với gia đình.", "Buổi chiều Lan làm gì?", ["nghe nhạc và đọc sách", "nấu ăn", "xem phim"]),
      B2("Hôm qua Nam thức khuya học bài. Nam đi ngủ lúc 2 giờ sáng. Hôm nay Nam buồn ngủ quá nên không đi tập thể dục.", "Hôm qua Nam đi ngủ lúc mấy giờ?", ["2 giờ sáng", "11 giờ", "12 giờ"]),
      B2("Tôi thích nghe nhạc Việt Nam. Tôi thường nghe nhạc trên mạng sau khi học tiếng Việt. Nghe nhạc Việt Nam rất thú vị.", "Tôi thường nghe nhạc lúc nào?", ["sau khi học tiếng Việt", "sau khi ăn sáng", "trước khi đi ngủ"]),
      B2("Mỗi tối gia đình tôi ăn tối lúc 7 giờ. Sau khi ăn tối, bố tôi đọc báo, mẹ tôi xem tivi, còn tôi học bài.", "Sau khi ăn tối, bố tôi làm gì?", ["đọc báo", "xem tivi", "học bài"])]
T1 = "Tôi tên là Hoa. Tôi là sinh viên. Buổi sáng tôi đi học, buổi chiều tôi làm thêm ở quán cà phê. Buổi tối tôi học tiếng Anh khoảng một tiếng."
T2 = "Anh Nam thích tập thể dục. Mỗi sáng anh ấy đi bộ ở gần nhà khoảng 30 phút. Anh ấy rất khỏe."
T3 = "Cuối tuần chúng tôi thường đi xem phim ở gần trung tâm thành phố. Sau khi xem phim, chúng tôi đi ăn tối."
T4 = "Tối qua tôi thức khuya xem phim trên mạng. Tôi đi ngủ lúc 1 giờ. Sáng nay tôi thức dậy trễ nên không ăn sáng."
q += [B3(T1, "Hoa là sinh viên.", True), B3(T1, "Buổi chiều Hoa đi học.", False), B3(T1, "Buổi tối Hoa học tiếng Anh.", True),
      B3(T2, "Anh Nam thích tập thể dục.", True), B3(T2, "Anh Nam đi bộ buổi tối.", False), B3(T2, "Anh Nam rất khỏe.", True),
      B3(T3, "Cuối tuần chúng tôi đi xem phim.", True), B3(T3, "Chúng tôi ăn tối trước khi xem phim.", False),
      B3(T4, "Tối qua tôi đi ngủ sớm.", False), B3(T4, "Sáng nay tôi không ăn sáng.", True)]
q += [B4("Buổi tối anh thường làm gì?", ["Tôi thường xem tivi với gia đình.", "Tôi là kỹ sư.", "Lúc 7 giờ sáng.", "Ở công ty."]),
      B4("Chị thích nghe nhạc không?", ["Có, tôi rất thích nghe nhạc.", "Tôi là người Hàn Quốc.", "Tôi đi làm bằng xe buýt.", "Lúc 9 giờ."]),
      B4("Em đi ngủ lúc mấy giờ?", ["Em đi ngủ lúc 11 giờ.", "Em là sinh viên.", "Em học ở trường Nhân văn.", "Em rất thích."]),
      B4("Hôm qua anh thức khuya hả?", ["Ừ, tôi xem phim đến 1 giờ.", "Tôi là bác sĩ.", "Tôi ăn sáng lúc 7 giờ.", "Ở nhà tôi."]),
      B4("Sao hôm nay chị mệt vậy?", ["Vì tối qua tôi thức khuya.", "Tôi là thư ký.", "Tôi đi làm lúc 8 giờ.", "Ở công ty."]),
      B4("Cuối tuần anh thường làm gì?", ["Tôi thường đi chơi với bạn bè.", "Tôi là người Nhật.", "Lúc 10 giờ sáng.", "Ở Quận 1."]),
      B4("Ai nấu ăn trong gia đình anh?", ["Mẹ tôi thường nấu ăn.", "Gia đình tôi có bốn người.", "Lúc 6 giờ tối.", "Ở nhà tôi."]),
      B4("Anh có tập thể dục không?", ["Có, tôi tập thể dục mỗi buổi sáng.", "Tôi ăn sáng ở nhà.", "Tôi là sinh viên.", "Lúc 6 giờ."]),
      B4("Tối nay chúng ta đi xem phim nhé?", ["Ừ, phim mới hay lắm.", "Tôi là giáo viên.", "Ở Quận 1.", "Lúc 7 giờ sáng."]),
      B4("Em có thích học tiếng Việt không?", ["Có, em rất thích.", "Em là người Hàn Quốc.", "Em đi học lúc 8 giờ.", "Ở trường."])]
q += [C1("Tôi thường xem tivi buổi tối.", ["thường", "tôi", "buổi tối", "xem tivi"]), C1("Hôm qua tôi thức khuya.", ["thức khuya", "hôm qua", "tôi"]),
      C1("Mẹ tôi đang nấu ăn.", ["đang", "mẹ", "nấu ăn", "tôi"]), C1("Cuối tuần chúng tôi đi xem phim.", ["cuối tuần", "đi", "chúng tôi", "xem phim"]),
      C1("Tôi rất thích nghe nhạc.", ["rất", "tôi", "nghe nhạc", "thích"])]
q += [C2("Tôi thường tập thể dục vào buổi sáng lắm.", 7, "Tôi thường tập thể dục vào buổi sáng.", "저는 보통 아침에 운동해요. (lắm은 형용사 뒤에만)"),
      C2("Hôm qua tôi đi ngủ sẽ lúc 1 giờ.", 4, "Hôm qua tôi đi ngủ lúc 1 giờ.", "어제 저는 1시에 잤어요. (지난 일에 sẽ를 안 쓴다)"),
      C2("Em thích rất nghe nhạc.", 2, "Em rất thích nghe nhạc.", "저는 음악 듣는 걸 아주 좋아해요. (rất는 thích 앞)"),
      C2("Tôi mệt hôm nay hơi.", 3, "Hôm nay tôi hơi mệt.", "오늘 저는 좀 피곤해요. (hơi는 형용사 앞)"),
      C2("Tối qua tôi thức khuya nên đi ngủ sớm.", 6, "Tối qua tôi thức khuya nên đi ngủ trễ.", "어젯밤 늦게까지 깨어 있어서 늦게 잤어요. (앞뒤가 맞아야 한다)")]
q.append(C3("내 주말과 취미 — 주말에 보통 무엇을 하는지, 무엇을 좋아하는지, 누구와 하는지 (10문장)",
            ["Cuối tuần tôi thường ở nhà.", "Buổi sáng tôi thức dậy trễ, khoảng 9 giờ.", "Tôi tập thể dục khoảng 30 phút.", "Sau đó tôi ăn sáng với gia đình.", "Buổi chiều tôi thích đọc sách và nghe nhạc.",
             "Thỉnh thoảng tôi đi uống cà phê với bạn bè.", "Tối thứ bảy chúng tôi thường đi xem phim.", "Tôi rất thích xem phim Việt Nam.", "Buổi tối tôi học tiếng Việt khoảng hai tiếng.", "Cuối tuần của tôi rất vui."]))
q += D1(["xem phim", "nghe nhạc", "đọc báo", "tập thể dục", "thức khuya", "buồn ngủ", "nấu ăn", "cuối tuần", "thỉnh thoảng", "một mình"],
        ["Tôi thường xem tivi buổi tối.", "Hôm qua tôi thức khuya nên hôm nay tôi mệt.", "Cuối tuần chúng tôi đi xem phim.", "Mẹ tôi đang nấu ăn.", "Em đi ngủ lúc mấy giờ?"])
q += [D2("xem phim", "그림을 보고 말해 보세요 — 주말에 보통 무엇을 하나요? 누구와 하나요? 어떤 영화를 좋아하나요? (3문장)",
         ["Cuối tuần tôi thường xem phim ở nhà.", "Tôi xem phim với bạn.", "Tôi thích xem phim Việt Nam."], ["주말에 저는 보통 집에서 영화를 봐요.", "친구와 영화를 봐요.", "저는 베트남 영화를 좋아해요."]),
      D2("nấu ăn", "그림을 보고 말해 보세요 — 이 사람은 무엇을 하고 있나요? 요리를 잘하나요? 어디에서 일하나요? (3문장)",
         ["Anh ấy đang nấu ăn.", "Anh ấy nấu ăn rất ngon.", "Anh ấy làm việc ở tiệm ăn."], ["그는 요리를 하고 있어요.", "그는 요리를 아주 맛있게 해요.", "그는 식당에서 일해요."])]
q += [D3("친구가 '주말에 보통 뭐 해요?'라고 묻습니다. 주말에 하는 일 세 가지를 말해 보세요. (3문장)",
         ["Cuối tuần tôi thường đi dạo.", "Thỉnh thoảng tôi đi xem phim với bạn.", "Buổi tối tôi nghe nhạc ở nhà."], ["주말에 저는 보통 산책을 해요.", "가끔 친구와 영화를 보러 가요.", "저녁에는 집에서 음악을 들어요."]),
      D3("친구가 '아침에 보통 몇 시에 일어나요?'라고 묻습니다. 아침 일과를 말해 보세요 — 일어나는 시간, 아침밥, 그다음 하는 일. (3문장)",
         ["Tôi thường thức dậy lúc sáu giờ.", "Tôi ăn sáng ở nhà, rồi đi làm.", "Tôi thường không uống cà phê."], ["저는 보통 6시에 일어나요.", "집에서 아침을 먹고 출근해요.", "저는 보통 커피를 마시지 않아요."])]
AUD = build(5, "모의고사 5", q)
