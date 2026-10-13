# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 듣기 3(듣고 고르기) — 실제 시험처럼 '오답 보기도 들리게' (2026-10-13, 대표님 "실제시험지 1·2 틀 동일하지? 우리 모의고사도 틀 동일하면 된다. 오디오 파일도 참고하고").
실제 2회차 녹음(실제시험지/2차 주간시험/2회차_듣기_받아쓰기.txt)과 시험지를 맞대 보니 듣기 3 은 열에 여덟이 함정이었다:
  ① 들은 말에 오답도 나온다 — Cô Vân làm kỹ sư ở công ty máy tính → 보기 Thư ký·Kỹ sư·Máy tính / 아침 đi học·오후 ở nhà·저녁 gặp bạn → '오후에 뭐 해요?'
  ② 고쳐 말하기 — '403호죠?' '아뇨, 407호예요' → '그는 몇 호에 가고 싶어요?'(403) · 'không có nhiều … chỉ có 7 người' → Không nhiều·Mười·Bảy
  ③ 소리 비슷한 보기 — Không rẻ lắm·Không dễ lắm·Không rảnh lắm / Đọc báo·Đọc sách·Mua báo
  ④ 대화로 짐작 — '무슨 책 사요?' → '어디에 있어요?'(Nhà sách) · ⑤ 예/아니요 — '혼자 공부해요?' '아뇨, 친구와' → Phải·Không·Có
대표님은 2차에서 바로 ②(Bảy ↔ Không nhiều, 403 ↔ 407)로 2점을 잃었다. 그래서 벌마다 ①②를 대여섯, ③④⑤를 하나씩 넣는다.
보기 첫째가 정답(common3.A3s·A3d 가 섞음). 1~5 한 사람 문장 · 6~10 두 사람 대화(목소리 번갈아)."""
from common3 import A3s, A3d

A3T = {
 1: [A3s("Bây giờ chị Mai nói được mấy thứ tiếng?", "지금 마이 씨는 몇 개 언어를 할 수 있어요?", "Chị Mai nói được ba thứ tiếng. Bây giờ chị ấy đang học thêm tiếng Nhật.", "마이 씨는 세 개 언어를 할 수 있어요. 지금은 일본어를 더 배우고 있어요.", ["ba", "bốn", "hai"]),
     A3s("Anh Tony học tiếng Việt bao lâu rồi?", "토니 씨는 베트남어를 얼마나 배웠어요?", "Anh Tony đến Việt Nam một năm rồi, nhưng mới học tiếng Việt sáu tháng.", "토니 씨는 베트남에 온 지 1년 됐지만, 베트남어는 배운 지 여섯 달밖에 안 됐어요.", ["sáu tháng", "một năm", "hai tháng"]),
     A3s("Anh Lee không làm được gì?", "리 씨는 무엇을 못 해요?", "Anh Lee nói tiếng Việt khá giỏi và đọc tiếng Việt được, nhưng chưa viết được.", "리 씨는 베트남어를 꽤 잘 말하고 읽을 수도 있지만, 아직 쓰지는 못해요.", ["viết tiếng Việt", "đọc tiếng Việt", "nói tiếng Việt"]),
     A3s("Bây giờ chị Kate dạy tiếng Anh ở đâu?", "지금 케이트 씨는 어디에서 영어를 가르쳐요?", "Trước đây chị Kate dạy tiếng Anh ở trường đại học. Bây giờ chị ấy dạy ở trung tâm ngoại ngữ.", "전에는 케이트 씨가 대학교에서 영어를 가르쳤어요. 지금은 외국어 학원에서 가르쳐요.", ["ở trung tâm ngoại ngữ", "ở trường đại học", "ở công ty"]),
     A3s("Em Sơn học tiếng Hàn mấy buổi một tuần?", "선은 일주일에 몇 번 한국어를 배워요?", "Em Sơn học tiếng Hàn ba buổi một tuần, mỗi buổi hai tiếng.", "선은 일주일에 세 번, 한 번에 두 시간씩 한국어를 배워요.", ["ba buổi", "hai buổi", "năm buổi"]),
     A3d("Anh ấy nói được tiếng gì?", "그는 무슨 언어를 할 수 있어요?", [("Anh nói tiếng Nhật được không?", "일본어 할 수 있어요?"), ("Không được. Tôi chỉ nói được tiếng Anh và tiếng Pháp.", "못 해요. 저는 영어와 프랑스어만 할 수 있어요.")], ["tiếng Anh và tiếng Pháp", "tiếng Nhật", "tiếng Anh và tiếng Nhật"], 'fm'),
     A3d("Chị ấy làm phiên dịch bao lâu rồi?", "그녀는 통역을 얼마나 했어요?", [("Chị làm phiên dịch ở đây bao lâu rồi?", "여기서 통역 일을 얼마나 했어요?"), ("Hai năm rồi. Trước đó tôi làm giáo viên một năm.", "2년 됐어요. 그 전에는 1년 동안 교사였어요.")], ["hai năm", "một năm", "ba năm"], 'mf'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Em muốn đăng ký học tiếng Việt ạ.", "베트남어 수업을 등록하고 싶어요."), ("Lớp buổi tối học ba buổi một tuần. Em viết đơn này nhé.", "저녁반은 일주일에 세 번이에요. 이 신청서를 써 주세요.")], ["ở trung tâm ngoại ngữ", "ở nhà hàng", "ở bưu điện"], 'fm'),
     A3d("Phát âm tiếng Việt thế nào?", "베트남어 발음은 어때요?", [("Phát âm tiếng Việt có khó không anh?", "베트남어 발음은 어려워요?"), ("Không khó lắm. Em luyện mỗi ngày là được.", "그렇게 어렵지 않아요. 매일 연습하면 돼요.")], ["Không khó lắm", "Không lâu lắm", "Không vui lắm"], 'mf'),
     A3d("Chị ấy đã từng sống ở Nhật phải không?", "그녀는 일본에서 산 적이 있어요?", [("Nghe nói chị đã từng sống ở Nhật?", "일본에서 산 적이 있다고 들었어요."), ("Không, tôi chưa đi Nhật bao giờ. Tôi học tiếng Nhật ở Seoul.", "아니요, 일본에 가 본 적이 없어요. 일본어는 서울에서 배웠어요.")], ["Không", "Phải", "Có"], 'fm')],
 2: [A3s("Bao giờ chị Loan đi Hà Nội?", "로안 씨는 언제 하노이에 가요?", "Chị Loan định đi Hà Nội thứ ba, nhưng khách hàng bận nên chị ấy sẽ đi thứ năm.", "로안 씨는 화요일에 하노이에 가려고 했는데, 고객이 바빠서 목요일에 가요.", ["thứ năm", "thứ ba", "thứ tư"]),
     A3s("Sinh nhật anh Hiroki là ngày nào?", "히로키 씨의 생일은 언제예요?", "Hôm nay là ngày 18 tháng 8. Hai ngày nữa là sinh nhật anh Hiroki.", "오늘은 8월 18일이에요. 이틀 뒤가 히로키 씨 생일이에요.", ["ngày 20 tháng 8", "ngày 18 tháng 8", "ngày 22 tháng 8"]),
     A3s("Thứ hai anh David ở đâu?", "월요일에 데이비드 씨는 어디에 있어요?", "Thứ hai anh David đi công tác ở Đà Nẵng. Thứ tư anh ấy đi Hà Nội.", "데이비드 씨는 월요일에 다낭으로 출장 가요. 수요일에는 하노이에 가요.", ["Đà Nẵng", "Hà Nội", "Nha Trang"]),
     A3s("Chiều chủ nhật tôi làm gì?", "일요일 오후에 나는 무엇을 해요?", "Sáng chủ nhật tôi dọn dẹp nhà, buổi chiều đi chợ với mẹ, buổi tối xem phim.", "일요일 아침에는 집 청소를 하고, 오후에는 엄마와 시장에 가고, 저녁에는 영화를 봐요.", ["đi chợ", "dọn dẹp nhà", "xem phim"]),
     A3s("Tuần này chị ấy làm việc mấy ngày?", "이번 주에 그녀는 며칠 일해요?", "Tuần này chị ấy chỉ làm việc từ thứ hai đến thứ tư, vì thứ năm và thứ sáu chị ấy đi du lịch.", "이번 주에 그녀는 월요일부터 수요일까지만 일해요. 목요일과 금요일에는 여행을 가거든요.", ["ba ngày", "năm ngày", "hai ngày"]),
     A3d("Anh ấy đi Hà Nội ngày nào?", "그는 하노이에 언제 가요?", [("Anh đặt vé đi Hà Nội chưa?", "하노이 가는 표 예약했어요?"), ("Rồi. Hôm qua tôi đặt vé đi thứ sáu.", "네. 어제 금요일 표로 예약했어요.")], ["thứ sáu", "hôm qua", "hôm nay"], 'fm'),
     A3d("Hôm nay là thứ mấy?", "오늘은 무슨 요일이에요?", [("Thứ năm chúng ta đi gặp khách hàng nhé!", "목요일에 우리 고객 만나러 가요!"), ("Thứ năm là ngày mai đấy! Anh chuẩn bị xong chưa?", "목요일은 내일이에요! 준비 다 했어요?")], ["thứ tư", "thứ năm", "thứ sáu"], 'mf'),
     A3d("Sinh nhật chị ấy là ngày nào?", "그녀의 생일은 언제예요?", [("Sinh nhật chị là ngày 12 tháng 3 phải không?", "생일이 3월 12일이죠?"), ("Không, ngày 13 tháng 3.", "아니요, 3월 13일이에요.")], ["ngày 13 tháng 3", "ngày 12 tháng 3", "ngày 3 tháng 12"], 'fm'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Chị muốn đặt tour đi đâu ạ?", "어디로 가는 여행 상품을 예약하고 싶으세요?"), ("Tôi muốn đặt tour đi Nha Trang ba ngày, cuối tuần này.", "이번 주말에 나트랑 3일 여행을 예약하고 싶어요.")], ["ở công ty du lịch", "ở nhà hàng", "ở bệnh viện"], 'mf'),
     A3d("Chị ấy gọi điện thoại cho khách hàng chưa?", "그녀는 고객에게 전화했어요?", [("Chị gọi điện thoại cho khách hàng rồi phải không?", "고객한테 전화했죠?"), ("Chưa. Chiều nay tôi sẽ gọi.", "아직이요. 오늘 오후에 할 거예요.")], ["Chưa", "Rồi", "Có"], 'fm')],
 3: [A3s("Gia đình anh David có mấy người?", "데이비드 씨 가족은 몇 명이에요?", "Gia đình anh David có bố mẹ, anh ấy, một chị gái và hai em trai.", "데이비드 씨 가족은 부모님, 데이비드 씨, 누나 한 명, 남동생 두 명이에요.", ["sáu người", "năm người", "bốn người"]),
     A3s("Năm nay tôi bao nhiêu tuổi?", "올해 나는 몇 살이에요?", "Em trai út của tôi năm nay 23 tuổi, nhỏ hơn tôi 4 tuổi.", "제 막내 남동생은 올해 스물세 살이고, 저보다 네 살 어려요.", ["27 tuổi", "23 tuổi", "19 tuổi"]),
     A3s("Mẹ tôi thế nào?", "우리 어머니는 어때요?", "Bố tôi mất rồi. Còn mẹ tôi đã về hưu.", "아버지는 돌아가셨어요. 그리고 어머니는 은퇴하셨어요.", ["đã về hưu", "còn làm việc", "mất rồi"]),
     A3s("Ai còn độc thân?", "누가 아직 미혼이에요?", "Chị gái tôi lập gia đình rồi. Còn anh trai tôi vẫn độc thân.", "언니는 결혼했어요. 그런데 오빠는 여전히 미혼이에요.", ["anh trai tôi", "chị gái tôi", "em gái tôi"]),
     A3s("Cuối tuần tôi đi bộ với ai?", "주말에 나는 누구와 걸어요?", "Bố tôi thích đi bộ, còn mẹ tôi thích đọc sách. Cuối tuần tôi thường cùng bố đi bộ ở công viên.", "아버지는 걷기를, 어머니는 책 읽기를 좋아해요. 주말에 저는 보통 아버지와 함께 공원을 걸어요.", ["với bố", "với mẹ", "một mình"]),
     A3d("Anh ấy là con thứ mấy?", "그는 몇째예요?", [("Anh là con cả phải không?", "맏이죠?"), ("Không, tôi là con thứ hai. Anh trai tôi là con cả.", "아니요, 저는 둘째예요. 형이 맏이예요.")], ["con thứ hai", "con cả", "con út"], 'fm'),
     A3d("Hôm nay anh ấy đi sân bay đón ai?", "오늘 그는 공항에 누구를 마중하러 가요?", [("Anh đi sân bay đón bố mẹ à?", "부모님 마중하러 공항에 가요?"), ("Không, tuần sau bố mẹ tôi mới đến. Hôm nay tôi đón bà ngoại.", "아니요, 부모님은 다음 주에 오세요. 오늘은 외할머니를 마중해요.")], ["bà ngoại", "bố mẹ", "ông bà"], 'mf'),
     A3d("Bố mẹ chị ấy làm nghề gì?", "그녀의 부모님은 무슨 일을 해요?", [("Bố mẹ chị còn làm việc không?", "부모님은 아직 일하세요?"), ("Còn chứ! Bố mẹ tôi đều là giáo viên.", "물론이죠! 부모님 두 분 다 교사예요.")], ["giáo viên", "bác sĩ", "đã về hưu"], 'fm'),
     A3d("Chị ấy có mấy anh chị em?", "그녀는 형제가 몇이에요?", [("Chị có mấy anh chị em?", "형제가 몇이에요?"), ("Tôi là con một.", "저는 외동이에요.")], ["không có", "một người", "hai người"], 'mf'),
     A3d("Em gái anh ấy đã kết hôn chưa?", "그의 여동생은 결혼했어요?", [("Em gái anh có gia đình chưa?", "여동생은 결혼했어요?"), ("Chưa, nhưng năm sau em ấy sẽ kết hôn.", "아직이요, 하지만 내년에 결혼할 거예요.")], ["chưa", "rồi", "kết hôn hai năm rồi"], 'fm')],
 4: [A3s("Bao giờ tôi đặt tour?", "나는 언제 여행 상품을 예약해요?", "Hôm nay là thứ năm. Thứ bảy này tôi sẽ đặt tour đi Đà Nẵng.", "오늘은 목요일이에요. 이번 토요일에 다낭 가는 여행 상품을 예약할 거예요.", ["thứ bảy này", "thứ năm", "chủ nhật này"]),
     A3s("Sơn học tiếng Hàn bao lâu?", "선은 한국어를 얼마나 배웠어요?", "Sơn đã sống ở Seoul hai năm và học tiếng Hàn ở đó hơn một năm.", "선은 서울에서 2년 살았고, 거기서 1년 넘게 한국어를 배웠어요.", ["hơn một năm", "hai năm", "một tháng"]),
     A3s("Tại sao hôm nay tôi không đi làm?", "왜 오늘 나는 출근하지 않아요?", "Hôm nay tôi không mệt, nhưng tôi không đi làm vì phải đến sân bay đón mẹ.", "오늘 피곤하지는 않지만, 엄마를 마중하러 공항에 가야 해서 출근하지 않아요.", ["vì phải đón mẹ", "vì mệt", "vì đi du lịch"]),
     A3s("Dạo này chị Lan thế nào?", "요즘 란 씨는 어때요?", "Dạo này chị Lan khá bận nên chưa đi chợ được.", "요즘 란 씨는 꽤 바빠서 아직 장을 보러 가지 못했어요.", ["khá bận", "khá buồn", "khá rảnh"]),
     A3s("Tối thứ sáu tôi đi uống cà phê với ai?", "금요일 저녁에 나는 누구와 커피를 마시러 가요?", "Chị gái tôi bận nên tối thứ sáu tôi đi uống cà phê với bạn thân.", "언니가 바빠서 금요일 저녁에는 친한 친구와 커피를 마시러 가요.", ["với bạn thân", "với chị gái", "một mình"]),
     A3d("Anh ấy làm việc xong chưa?", "그는 일을 다 끝냈어요?", [("Anh làm việc xong chưa?", "일 다 끝났어요?"), ("Chưa. Việc này xong rồi, nhưng tôi còn hai việc nữa.", "아직이요. 이 일은 끝났는데 두 가지가 더 남았어요.")], ["chưa xong", "xong rồi", "không làm"], 'fm'),
     A3d("Chiều thứ bảy chị ấy thế nào?", "토요일 오후에 그녀는 어때요?", [("Thứ bảy này chị rảnh chứ?", "이번 토요일에 한가하죠?"), ("Sáng thứ bảy tôi có hẹn, nhưng buổi chiều tôi rảnh.", "토요일 아침엔 약속이 있는데, 오후엔 한가해요.")], ["rảnh", "có hẹn", "đi làm"], 'mf'),
     A3d("Anh ấy đi xe lửa ngày nào?", "그는 언제 기차를 타요?", [("Anh đặt vé xe lửa ngày 15 phải không?", "15일 기차표 예약했죠?"), ("Không, ngày 16. Ngày 15 tôi còn làm việc.", "아니요, 16일이요. 15일에는 아직 일해요.")], ["ngày 16", "ngày 15", "ngày 6"], 'fm'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Chào chị, chị muốn mua vé đi đâu?", "안녕하세요, 어디 가는 표를 사시겠어요?"), ("Cho tôi một vé đi Nha Trang thứ sáu này.", "이번 금요일 나트랑 가는 표 한 장 주세요.")], ["ở ga xe lửa", "ở bệnh viện", "ở trường học"], 'mf'),
     A3d("Em ấy gọi điện thoại cho mẹ chưa?", "그는 엄마에게 전화했어요?", [("Em gọi điện thoại cho mẹ rồi à?", "엄마한테 벌써 전화했어?"), ("Dạ chưa, tối nay em sẽ gọi.", "아직이요, 오늘 저녁에 할게요.")], ["Chưa", "Rồi", "Có"], 'fm')],
 5: [A3s("Anh Tom đang học tiếng gì?", "톰 씨는 무슨 언어를 배우고 있어요?", "Anh Tom nói được tiếng Anh và tiếng Pháp. Bây giờ anh ấy đang học tiếng Việt.", "톰 씨는 영어와 프랑스어를 할 수 있어요. 지금은 베트남어를 배우고 있어요.", ["tiếng Việt", "tiếng Anh", "tiếng Pháp"]),
     A3s("Tôi đã làm ở công ty này bao lâu?", "나는 이 회사에서 얼마나 일했어요?", "Tôi làm ở công ty này năm năm rồi. Trước đó tôi làm ở ngân hàng một năm.", "이 회사에서 일한 지 5년 됐어요. 그 전에는 은행에서 1년 일했어요.", ["năm năm", "một năm", "sáu năm"]),
     A3s("Chủ nhật tuần trước tôi đi thăm ai?", "지난주 일요일에 나는 누구를 찾아갔어요?", "Thứ bảy tuần trước tôi gặp bạn thân. Chủ nhật tôi cùng vợ đi thăm bố mẹ.", "지난주 토요일에는 친한 친구를 만났어요. 일요일에는 아내와 함께 부모님을 뵈러 갔어요.", ["bố mẹ", "bạn thân", "khách hàng"]),
     A3s("Em trai tôi về nước bao giờ?", "남동생은 언제 귀국했어요?", "Em trai tôi định về nước tháng trước, nhưng tuần trước em ấy mới về.", "남동생은 지난달에 귀국하려고 했는데, 지난주에야 돌아왔어요.", ["tuần trước", "tháng trước", "hôm qua"]),
     A3s("Ngày mai là thứ mấy?", "내일은 무슨 요일이에요?", "Hôm nay là thứ tư, ngày 14 tháng 10.", "오늘은 수요일, 10월 14일이에요.", ["thứ năm", "thứ tư", "thứ sáu"]),
     A3d("Chị ấy có anh chị em không?", "그녀는 형제가 있어요?", [("Chị có anh chị em không?", "형제 있어요?"), ("Có, tôi có một anh trai. Chồng tôi có hai em gái.", "네, 오빠가 한 명 있어요. 남편은 여동생이 둘 있고요.")], ["một anh trai", "hai em gái", "không có ai"], 'fm'),
     A3d("Anh ấy còn ở Hà Nội bao lâu nữa?", "그는 하노이에 얼마나 더 있어요?", [("Anh còn ở Hà Nội bao lâu nữa?", "하노이에 얼마나 더 있어요?"), ("Tôi ở đây hai tuần rồi. Khoảng một tuần nữa tôi về.", "여기 온 지 2주 됐어요. 일주일쯤 뒤에 돌아가요.")], ["khoảng một tuần nữa", "hai tuần nữa", "ba tuần nữa"], 'mf'),
     A3d("Chị ấy nói tiếng Anh thế nào?", "그녀는 영어를 어떻게 해요?", [("Chị nói tiếng Anh được không?", "영어 할 수 있어요?"), ("Được, nhưng không giỏi lắm.", "네, 하지만 아주 잘하지는 못해요.")], ["không giỏi lắm", "không dễ lắm", "không được"], 'fm'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Tôi muốn gửi thư này đi Hàn Quốc.", "이 편지를 한국에 보내고 싶어요."), ("Dạ, ba mươi nghìn đồng ạ.", "네, 3만 동입니다.")], ["ở bưu điện", "ở ngân hàng", "ở trường học"], 'mf'),
     A3d("Hôm nay là sinh nhật anh ấy phải không?", "오늘이 그의 생일이에요?", [("Sao hôm nay anh vui thế? Sinh nhật anh à?", "오늘 왜 이렇게 기뻐요? 생일이에요?"), ("Không, sinh nhật tôi là tuần sau. Hôm nay tôi gặp lại bạn thân.", "아니요, 생일은 다음 주예요. 오늘 친한 친구를 다시 만났어요.")], ["Không", "Phải", "Có"], 'fm')],
}
