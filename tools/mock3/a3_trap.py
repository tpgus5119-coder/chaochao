# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 듣기 3(듣고 고르기) — 실제 시험처럼 '오답 보기도 들리게' (2026-10-13, 대표님 "실제시험지 1·2 틀 동일하지? 우리 모의고사도 틀 동일하면 된다. 오디오 파일도 참고하고").
실제 2회차 녹음(실제시험지/2차 주간시험/2회차_듣기_받아쓰기.txt)과 시험지를 맞대 보니 듣기 3 은 열에 여덟이 함정이었다:
  ① 들은 말에 오답도 나온다 — Cô Vân làm kỹ sư ở công ty máy tính → 보기 Thư ký·Kỹ sư·Máy tính / 아침 đi học·오후 ở nhà·저녁 gặp bạn → '오후에 뭐 해요?'
  ② 고쳐 말하기 — '403호죠?' '아뇨, 407호예요' → '그는 몇 호에 가고 싶어요?'(403) · 'không có nhiều … chỉ có 7 người' → Không nhiều·Mười·Bảy
  ③ 소리 비슷한 보기 — Không rẻ lắm·Không dễ lắm·Không rảnh lắm / Đọc báo·Đọc sách·Mua báo
  ④ 대화로 짐작 — '무슨 책 사요?' → '어디에 있어요?'(Nhà sách) · ⑤ 예/아니요 — '혼자 공부해요?' '아뇨, 친구와' → Phải·Không·Có
대표님은 2차에서 바로 ②(Bảy ↔ Không nhiều, 403 ↔ 407)로 2점을 잃었다. 그래서 벌마다 ①②를 대여섯, ③④⑤를 하나씩 넣는다.
길이는 실제 2차 녹음대로 — 문장 1~5 는 열 낱말 안팎(실제 평균 10.6), 대화 6~10 은 물음·대답 합쳐 열두 낱말 안팎(실제 12.2). 전엔 15~19 로 길었다(2026-10-13 밤 '모든 수치를 실제와 같게').
낱말은 8~10과 위주(mix.py 가 벌 사이를 돌리므로 다섯 벌 모두 문장 1~5 가 전부 함정이어야 어느 조합이든 다섯 이상이 된다).
보기 첫째가 정답(common3.A3s·A3d 가 섞음). 1~5 한 사람 문장 · 6~10 두 사람 대화(목소리 여→남/남→여 번갈아 — 듣기 4 의 대화와 합쳐 fm·mf 차 ≤ 1)."""
from common3 import A3s, A3d

A3T = {
 1: [A3s("Chị Mai nói được mấy thứ tiếng?", "마이 씨는 몇 개 언어를 할 수 있어요?", "Chị Mai nói được ba thứ tiếng, chồng chị ấy nói được hai.", "마이 씨는 세 개 언어를 할 수 있고, 남편은 두 개를 할 수 있어요.", ["ba", "hai", "bốn"]),
     A3s("Anh Tony học tiếng Việt bao lâu rồi?", "토니 씨는 베트남어를 얼마나 배웠어요?", "Anh Tony ở đây một năm nhưng mới học tiếng Việt sáu tháng.", "토니 씨는 여기 온 지 1년이지만 베트남어는 배운 지 여섯 달밖에 안 됐어요.", ["sáu tháng", "một năm", "hai tháng"]),
     A3s("Anh Lee chưa làm được gì?", "리 씨는 아직 무엇을 못 해요?", "Anh Lee nói và đọc được tiếng Việt nhưng chưa viết được.", "리 씨는 베트남어를 말하고 읽을 수 있지만 아직 쓰지는 못해요.", ["viết", "đọc", "nói"]),
     A3s("Bây giờ chị Kate dạy ở đâu?", "지금 케이트 씨는 어디에서 가르쳐요?", "Trước đây chị Kate dạy ở trường, bây giờ ở trung tâm ngoại ngữ.", "전에는 케이트 씨가 학교에서 가르쳤고, 지금은 외국어 학원에서 가르쳐요.", ["ở trung tâm ngoại ngữ", "ở trường", "ở công ty"]),
     A3s("Em Sơn ôn tập tiếng Hàn mấy buổi một tuần?", "선은 일주일에 몇 번 한국어를 복습해요?", "Em Sơn học tiếng Hàn hai buổi, ôn tập ba buổi một tuần.", "선은 일주일에 한국어 수업 두 번, 복습 세 번을 해요.", ["ba buổi", "hai buổi", "năm buổi"]),
     A3d("Anh ấy chỉ nói được tiếng gì?", "그는 무슨 언어만 할 수 있어요?", [("Anh nói được tiếng Nhật không?", "일본어 할 수 있어요?"), ("Không, tôi chỉ nói được tiếng Nga.", "아니요, 저는 러시아어만 할 수 있어요.")], ["tiếng Nga", "tiếng Nhật", "tiếng Anh"], 'fm'),
     A3d("Chị ấy làm phiên dịch bao lâu rồi?", "그녀는 통역을 얼마나 했어요?", [("Chị làm phiên dịch ba năm rồi à?", "통역 일 한 지 3년 됐어요?"), ("Không, tôi mới làm hai năm.", "아니요, 2년밖에 안 됐어요.")], ["hai năm", "ba năm", "một năm"], 'mf'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Em muốn đăng ký học tiếng Việt.", "베트남어 수업을 등록하고 싶어요."), ("Vậy em điền đơn này nhé.", "그럼 이 신청서를 써 주세요.")], ["ở trung tâm ngoại ngữ", "ở khách sạn", "ở bưu điện"], 'fm'),
     A3d("Phát âm tiếng Việt thế nào?", "베트남어 발음은 어때요?", [("Phát âm tiếng Việt khó không?", "베트남어 발음은 어려워요?"), ("Không khó lắm, em luyện mỗi ngày.", "그렇게 어렵지 않아요, 저는 매일 연습해요.")], ["Không khó lắm", "Không lâu lắm", "Không vui lắm"], 'mf'),
     A3d("Chị ấy đã từng sống ở Nga chưa?", "그녀는 러시아에서 산 적이 있어요?", [("Chị từng sống ở Nga à?", "러시아에서 산 적이 있어요?"), ("Chưa, tôi học tiếng Nga ở Seoul.", "아니요, 러시아어는 서울에서 배웠어요.")], ["Chưa", "Rồi", "Có"], 'fm')],
 2: [A3s("Bao giờ chị Loan đi Hà Nội?", "로안 씨는 언제 하노이에 가요?", "Chị Loan định đi thứ ba, nhưng bận nên đi thứ năm.", "로안 씨는 화요일에 가려고 했는데, 바빠서 목요일에 가요.", ["thứ năm", "thứ ba", "thứ tư"]),
     A3s("Sinh nhật anh Hiroki là ngày nào?", "히로키 씨의 생일은 언제예요?", "Hôm nay là ngày 18, sinh nhật Hiroki là ngày 20.", "오늘은 18일이고, 히로키의 생일은 20일이에요.", ["ngày 20", "ngày 18", "ngày 22"]),
     A3s("Thứ hai anh David ở đâu?", "월요일에 데이비드 씨는 어디에 있어요?", "Thứ hai anh David ở Đà Nẵng, thứ tư ở Hà Nội.", "데이비드 씨는 월요일에 다낭에, 수요일에 하노이에 있어요.", ["Đà Nẵng", "Hà Nội", "Nha Trang"]),
     A3s("Chiều chủ nhật tôi làm gì?", "일요일 오후에 나는 무엇을 해요?", "Sáng chủ nhật tôi dọn dẹp nhà, chiều đi chợ, tối xem phim.", "일요일 아침에는 집 청소, 오후에는 장보기, 저녁에는 영화를 봐요.", ["đi chợ", "dọn dẹp nhà", "xem phim"]),
     A3s("Tuần này chị ấy làm việc mấy ngày?", "이번 주에 그녀는 며칠 일해요?", "Tuần này chị ấy làm việc ba ngày, tuần sau năm ngày.", "이번 주에 그녀는 사흘 일하고, 다음 주에는 닷새 일해요.", ["ba ngày", "năm ngày", "hai ngày"]),
     A3d("Anh ấy đi Hà Nội ngày nào?", "그는 하노이에 언제 가요?", [("Anh đặt vé đi thứ năm phải không?", "목요일 표 예약했죠?"), ("Không, tôi đặt vé thứ sáu.", "아니요, 금요일 표를 예약했어요.")], ["thứ sáu", "thứ năm", "hôm nay"], 'fm'),
     A3d("Hôm nay là thứ mấy vậy?", "오늘은 무슨 요일이에요?", [("Thứ năm đi gặp khách hàng nhé!", "목요일에 고객 만나러 가요!"), ("Thứ năm là ngày mai đấy!", "목요일은 내일이에요!")], ["thứ tư", "thứ năm", "thứ sáu"], 'mf'),
     A3d("Sinh nhật chị ấy là ngày nào?", "그녀의 생일은 언제예요?", [("Sinh nhật chị là ngày 12 phải không?", "생일이 12일이죠?"), ("Không, ngày 13 tháng 3.", "아니요, 3월 13일이에요.")], ["ngày 13", "ngày 12", "ngày 3"], 'fm'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Chị muốn đặt tour đi đâu?", "어디로 가는 여행 상품을 예약하고 싶으세요?"), ("Tôi muốn đi Nha Trang ba ngày.", "나트랑에 3일 가고 싶어요.")], ["ở công ty du lịch", "ở nhà hàng", "ở bệnh viện"], 'mf'),
     A3d("Chị ấy gọi điện thoại cho khách hàng chưa?", "그녀는 고객에게 전화했어요?", [("Chị gọi cho khách hàng rồi chứ?", "고객한테 전화했죠?"), ("Chưa, chiều nay tôi sẽ gọi.", "아직이요, 오늘 오후에 할 거예요.")], ["Chưa", "Rồi", "Có"], 'fm')],
 3: [A3s("Gia đình anh David có mấy người?", "데이비드 씨 가족은 몇 명이에요?", "Gia đình anh David chỉ có bốn người, không phải năm người.", "데이비드 씨 가족은 네 명뿐이에요, 다섯 명이 아니에요.", ["bốn người", "năm người", "ba người"]),
     A3s("Năm nay tôi bao nhiêu tuổi?", "올해 나는 몇 살이에요?", "Em trai út tôi 23 tuổi, nhỏ hơn tôi bốn tuổi.", "제 막내 남동생은 스물세 살이고, 저보다 네 살 어려요.", ["27 tuổi", "23 tuổi", "19 tuổi"]),
     A3s("Mẹ tôi thế nào?", "우리 어머니는 어때요?", "Bố tôi mất rồi, còn mẹ tôi đã về hưu.", "아버지는 돌아가셨고, 어머니는 은퇴하셨어요.", ["đã về hưu", "còn làm việc", "mất rồi"]),
     A3s("Ai còn độc thân?", "누가 아직 미혼이에요?", "Chị gái tôi có gia đình rồi, anh trai tôi còn độc thân.", "언니는 결혼했고, 오빠는 아직 미혼이에요.", ["anh trai tôi", "chị gái tôi", "em gái tôi"]),
     A3s("Cuối tuần tôi đi công viên với ai?", "주말에 나는 누구와 공원에 가요?", "Cuối tuần tôi không đi với mẹ mà đi công viên với bố.", "주말에 저는 엄마가 아니라 아빠와 공원에 가요.", ["với bố", "với mẹ", "một mình"]),
     A3d("Anh ấy là con thứ mấy?", "그는 몇째예요?", [("Anh là con cả phải không?", "맏이죠?"), ("Không, tôi là con thứ hai.", "아니요, 저는 둘째예요.")], ["con thứ hai", "con cả", "con út"], 'fm'),
     A3d("Hôm nay anh ấy đón ai?", "오늘 그는 누구를 마중해요?", [("Anh đi sân bay đón bố mẹ à?", "부모님 마중하러 공항에 가요?"), ("Không, hôm nay tôi đón bà ngoại.", "아니요, 오늘은 외할머니를 마중해요.")], ["bà ngoại", "bố mẹ", "ông bà"], 'mf'),
     A3d("Bố mẹ chị ấy làm nghề gì?", "그녀의 부모님은 무슨 일을 해요?", [("Bố mẹ chị còn làm không?", "부모님은 아직 일하세요?"), ("Còn, bố mẹ tôi đều là giáo viên.", "네, 부모님 두 분 다 교사예요.")], ["giáo viên", "bác sĩ", "đã về hưu"], 'fm'),
     A3d("Chị ấy có mấy anh chị em?", "그녀는 형제가 몇이에요?", [("Chị có mấy anh chị em?", "형제가 몇이에요?"), ("Không có, tôi là con một.", "없어요, 저는 외동이에요.")], ["không có", "một người", "hai người"], 'mf'),
     A3d("Em gái anh ấy kết hôn chưa?", "그의 여동생은 결혼했어요?", [("Em gái anh có gia đình chưa?", "여동생은 결혼했어요?"), ("Chưa, năm sau em ấy mới kết hôn.", "아직이요, 내년에야 결혼해요.")], ["chưa", "rồi", "năm trước"], 'fm')],
 4: [A3s("Bao giờ tôi đặt tour?", "나는 언제 여행 상품을 예약해요?", "Hôm nay thứ năm, thứ bảy tôi đặt tour đi Đà Nẵng.", "오늘은 목요일이고, 토요일에 다낭 여행 상품을 예약해요.", ["thứ bảy", "thứ năm", "chủ nhật"]),
     A3s("Sơn học tiếng Hàn bao lâu?", "선은 한국어를 얼마나 배웠어요?", "Sơn sống ở Seoul hai năm và học tiếng Hàn hơn một năm.", "선은 서울에서 2년 살았고 한국어를 1년 넘게 배웠어요.", ["hơn một năm", "hai năm", "một tháng"]),
     A3s("Tại sao hôm nay tôi không đi làm?", "왜 오늘 나는 출근하지 않아요?", "Tôi không đi làm vì phải đón mẹ, không phải vì mệt.", "엄마를 마중해야 해서 출근 안 해요, 피곤해서가 아니에요.", ["vì phải đón mẹ", "vì mệt", "vì đi du lịch"]),
     A3s("Dạo này chị Lan thế nào?", "요즘 란 씨는 어때요?", "Chị Lan trước đây khá rảnh, dạo này khá bận.", "란 씨는 전에는 꽤 한가했는데, 요즘은 꽤 바빠요.", ["khá bận", "khá rảnh", "khá buồn"]),
     A3s("Tối thứ sáu tôi đi với ai?", "금요일 저녁에 나는 누구와 가요?", "Tối thứ sáu tôi không đi với chị gái mà đi với bạn thân.", "금요일 저녁에 저는 언니가 아니라 친한 친구와 가요.", ["với bạn thân", "với chị gái", "một mình"]),
     A3d("Anh ấy làm việc xong chưa?", "그는 일을 다 끝냈어요?", [("Anh làm xong chưa?", "일 다 끝났어요?"), ("Việc này xong rồi, nhưng còn hai việc nữa.", "이 일은 끝났는데 두 가지가 더 남았어요.")], ["chưa xong", "xong rồi", "không làm"], 'fm'),
     A3d("Chiều thứ bảy chị ấy thế nào?", "토요일 오후에 그녀는 어때요?", [("Thứ bảy này chị rảnh chứ?", "이번 토요일에 한가하죠?"), ("Sáng tôi có hẹn, chiều tôi rảnh.", "아침엔 약속이 있고, 오후엔 한가해요.")], ["rảnh", "có hẹn", "đi làm"], 'mf'),
     A3d("Anh ấy đi xe lửa ngày nào?", "그는 언제 기차를 타요?", [("Anh đi xe lửa ngày 15 à?", "15일에 기차 타요?"), ("Không, ngày 16, ngày 15 tôi bận.", "아니요, 16일이요. 15일에는 바빠요.")], ["ngày 16", "ngày 15", "ngày 6"], 'fm'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Chị muốn mua vé đi đâu?", "어디 가는 표를 사시겠어요?"), ("Cho tôi một vé đi Nha Trang.", "나트랑 가는 표 한 장 주세요.")], ["ở ga xe lửa", "ở bệnh viện", "ở trường"], 'mf'),
     A3d("Em ấy gọi cho mẹ chưa?", "그 아이는 엄마에게 전화했어요?", [("Em gọi cho mẹ rồi à?", "엄마한테 벌써 전화했어?"), ("Dạ chưa, tối nay em gọi.", "아직이요, 오늘 저녁에 할게요.")], ["Chưa", "Rồi", "Có"], 'fm')],
 5: [A3s("Anh Tom đang học tiếng gì?", "톰 씨는 무슨 언어를 배우고 있어요?", "Anh Tom nói được tiếng Anh, bây giờ đang học tiếng Việt.", "톰 씨는 영어를 할 수 있고, 지금은 베트남어를 배우고 있어요.", ["tiếng Việt", "tiếng Anh", "tiếng Pháp"]),
     A3s("Tôi làm ở công ty này bao lâu rồi?", "나는 이 회사에서 얼마나 일했어요?", "Tôi làm ở đây năm năm, trước đó ở khách sạn một năm.", "여기서 5년 일했고, 그 전에는 호텔에서 1년 일했어요.", ["năm năm", "một năm", "sáu năm"]),
     A3s("Chủ nhật tuần trước tôi đi thăm ai?", "지난주 일요일에 나는 누구를 찾아갔어요?", "Thứ bảy tôi gặp bạn thân, chủ nhật đi thăm bố mẹ.", "토요일에는 친한 친구를 만났고, 일요일에는 부모님을 뵈러 갔어요.", ["bố mẹ", "bạn thân", "khách hàng"]),
     A3s("Em trai tôi về nước bao giờ?", "남동생은 언제 귀국했어요?", "Em trai tôi định về tháng trước, nhưng tuần trước mới về.", "남동생은 지난달에 귀국하려 했는데, 지난주에야 돌아왔어요.", ["tuần trước", "tháng trước", "hôm qua"]),
     A3s("Ngày mai là thứ mấy?", "내일은 무슨 요일이에요?", "Hôm nay là thứ tư, ngày 14 tháng 10.", "오늘은 수요일, 10월 14일이에요.", ["thứ năm", "thứ tư", "thứ sáu"]),
     A3d("Chị ấy có mấy anh trai?", "그녀는 오빠가 몇 명이에요?", [("Chị có hai anh trai phải không?", "오빠가 둘이죠?"), ("Không, một anh trai và hai em gái.", "아니요, 오빠 하나와 여동생 둘이에요.")], ["một", "hai", "ba"], 'fm'),
     A3d("Anh ấy còn ở Hà Nội bao lâu nữa?", "그는 하노이에 얼마나 더 있어요?", [("Anh ở Hà Nội bao lâu nữa?", "하노이에 얼마나 더 있어요?"), ("Một tuần nữa, không phải hai tuần.", "일주일 더요, 2주가 아니에요.")], ["một tuần nữa", "hai tuần nữa", "ba tuần nữa"], 'mf'),
     A3d("Chị ấy nói tiếng Anh thế nào?", "그녀는 영어를 어떻게 해요?", [("Chị nói tiếng Anh được không?", "영어 할 수 있어요?"), ("Được, nhưng không giỏi lắm.", "네, 하지만 아주 잘하지는 못해요.")], ["không giỏi lắm", "không dễ lắm", "không được"], 'fm'),
     A3d("Họ đang ở đâu?", "그들은 어디에 있어요?", [("Tôi muốn gửi thư này đi Hàn Quốc.", "이 편지를 한국에 보내고 싶어요."), ("Dạ, ba mươi nghìn đồng ạ.", "네, 3만 동입니다.")], ["ở bưu điện", "ở ngân hàng", "ở trường"], 'mf'),
     A3d("Hôm nay là sinh nhật anh ấy phải không?", "오늘이 그의 생일이에요?", [("Hôm nay sinh nhật anh à?", "오늘 생일이에요?"), ("Không, sinh nhật tôi là tuần sau.", "아니요, 제 생일은 다음 주예요.")], ["Không", "Phải", "Có"], 'fm')],
}
