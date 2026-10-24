# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 — 교재 1권 8~10과 **문장 그대로** 쓰는 갈래 (2026-10-17, 대표님 "교재의 낱말 말고 교재의 문장을 가급적 사용하라고").
듣기 4(빈칸 문장·대화) · 읽기 4(말-대답 짝) · 쓰기 1(낱말 배열) · 쓰기 2(Đúng/고치기)를 교재 8~10과 문장(tools/book_ex/pool.json)으로 — 숫자는 글로(6 → sáu), 대답이 없는 교재 물음만 대답을 지음.
**시험 취지에 맞는 문장이 먼저, 그 문장을 교재에서 먼저 찾는다 — 억지로 넣지 않는다**(대표님 2026-10-17 다시: 맥락 없이는 뜻이 안 서는 교재 문장 — "Còn mẹ chị ấy?"·"Đang là sinh viên à?"·"Loan không muốn ăn"·따옴표 빈칸 — 은 지은 문장으로 바꿈). 다섯 벌이라 교재 문장만으로 모자란 읽기 2·3(지문)·듣기 3(함정)·그림 갈래는 지은 문장 그대로. mix.py 가 이 파일의 목록으로 ex1~5 의 같은 갈래를 갈아 끼운다.
읽기 4 는 자리마다 물음 꼴을 하나씩(0 언어 · 1 기간 · 2 때 · 3 chưa · 4 가족 · 5~9 말-대꾸) 두어 어느 벌에서도 한 대답이 두 말에 맞지 않게."""
import sys, pathlib, re
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import common3 as c

A4S = [("Nó đã học tiếng Pháp [sáu] tháng.", "그 아이는 프랑스어를 여섯 달 배웠어요."),
 ("Chị Dung làm [nhân viên] ở Bưu điện Thành phố Hồ Chí Minh.", "중 씨는 호찌민시 우체국 직원이에요."),
 ("Tôi [nói chuyện] với người Việt bằng tiếng Anh và tiếng Việt.", "저는 베트남 사람과 영어와 베트남어로 이야기해요."),
 ("Hôm qua ông Jack luyện [phát âm] tiếng Việt với một người bạn.", "어제 잭 씨는 친구와 베트남어 발음을 연습했어요."),
 ("Ông Cheng sẽ sống ở [khách sạn] năm tháng.", "쳉 씨는 호텔에서 다섯 달 살 거예요."),
 ("Eun Ji và Lee sắp có [kiểm tra] cuối khóa.", "은지와 리는 곧 기말시험이 있어요."),
 ("Anh ấy đã dạy tiếng Anh ở đó [hai] năm rồi.", "그는 거기서 2년째 영어를 가르쳤어요."),
 ("Thứ tư tuần trước tôi đã đăng ký [vé xe lửa] đi Hà Nội.", "지난주 수요일에 저는 하노이 가는 기차표를 예약했어요."),
 ("Hôm qua các cô ấy đã [tập thể dục] hơn một tiếng.", "어제 그녀들은 한 시간 넘게 운동했어요."),
 ("Trong ngày đầu tuần, Hà luôn cảm thấy mệt và [buồn ngủ].", "주초에 하는 늘 피곤하고 졸려요."),
 ("Ông ta không thích [công việc] hiện nay.", "그 사람은 지금 하는 일을 좋아하지 않아요."),
 ("Cô ấy đã đi công tác ở Đà Nẵng vào tháng [mười một] năm trước.", "그녀는 작년 11월에 다낭으로 출장을 갔어요."),
 ("Trong gia đình, có lẽ mẹ sẽ chuẩn bị [bữa ăn tối] đặc biệt.", "집에서는 아마 엄마가 특별한 저녁 식사를 준비할 거예요."),
 ("Bố sẽ mua [hoa] và về nhà sớm.", "아빠는 꽃을 사서 일찍 집에 올 거예요."),
 ("Học sinh không đi học vì đang [nghỉ hè].", "학생들은 여름방학이라 학교에 안 가요."),
 ("Chị thứ hai của anh Nam [lập gia đình] sớm.", "남 씨의 둘째 누나는 일찍 결혼했어요."),
 ("Trước đây ba của Toàn là [giáo viên] tiếng Pháp.", "전에 또안의 아버지는 프랑스어 교사였어요."),
 ("Tôi có một em trai, năm nay [mười sáu] tuổi.", "저는 남동생이 하나 있는데, 올해 열여섯 살이에요."),
 ("Em trai tôi là [học sinh] lớp mười.", "제 남동생은 10학년 학생이에요."),
 ("Cuối năm nay ba mẹ tôi sẽ cùng đi [du lịch] ở Pháp.", "올해 말에 부모님은 함께 프랑스로 여행을 가요."),
 ("Bố anh Hoàng muốn [đi bộ] trong công viên vào buổi sáng.", "호앙 씨의 아버지는 아침에 공원에서 걷고 싶어 해요."),
 ("Con trai của anh Hưng muốn [vẽ tranh].", "흥 씨의 아들은 그림을 그리고 싶어 해요."),
 ("Em gái chị Hoài thích [nghe nhạc].", "호아이 씨의 여동생은 음악 듣기를 좋아해요."),
 ("Cuối tuần mọi người trong gia đình anh Dũng đều [rảnh].", "주말에 중 씨 가족은 모두 한가해요."),
 ("Hôm nay là [sinh nhật] mẹ chị Loan.", "오늘은 로안 씨 어머니의 생신이에요.")]
A4D = [("Eun Ji đang viết gì vậy?", "은지는 뭘 쓰고 있어요?", "Tôi viết [đơn] xin dạy tiếng Hàn.", "한국어를 가르치겠다는 신청서를 써요."),
 ("Có sai nhiều không anh?", "많이 틀렸어요?", "Chị viết tiếng Việt rất [tốt].", "베트남어를 아주 잘 쓰시네요."),
 ("Chị học tiếng Việt ở đâu?", "베트남어를 어디서 배워요?", "Tôi học ở [trung tâm ngoại ngữ].", "외국어 학원에서 배워요."),
 ("Họ đăng ký vé trên mạng bao giờ?", "그들은 언제 인터넷으로 표를 예약했어요?", "Từ [sáu] tháng trước.", "여섯 달 전에요."),
 ("Chị biết mấy ngoại ngữ?", "외국어를 몇 개 알아요?", "Tôi biết [hai] ngoại ngữ, tiếng Nhật và tiếng Việt.", "두 개요, 일본어와 베트남어요."),
 ("Anh xem tin tức tiếng Việt hay tiếng Anh?", "베트남어 뉴스를 봐요, 영어 뉴스를 봐요?", "Tôi xem [tin tức] tiếng Anh.", "영어 뉴스를 봐요."),
 ("Anh ấy đã làm ở đó bao lâu?", "그는 거기서 얼마나 일했어요?", "Hơn một [năm].", "1년 넘게요."),
 ("Anh ấy đi bao giờ vậy, chị?", "그는 언제 갔어요?", "[Hai] ngày trước.", "이틀 전에요."),
 ("Sinh nhật anh là tháng này, phải không?", "그리고 당신 생일은 이번 달이죠?", "Vâng, chủ nhật [tuần trước] đấy!", "네, 지난주 일요일이었어요!"),
 ("Anh đã đặt tour du lịch chưa?", "여행 상품 예약했어요?", "Rồi, tôi đã đặt [xong] hôm qua.", "네, 어제 다 예약했어요."),
 ("Em đặt tour du lịch chưa?", "여행 상품 예약했니?", "Em đặt rồi, năm ngày bốn [đêm].", "예약했어요, 4박 5일이요."),
 ("Anh đi du lịch hả?", "여행 가요?", "Tôi đi Thái để [làm việc].", "일하러 태국에 가요."),
 ("Anh làm ở Việt Nam bao lâu rồi?", "베트남에서 일한 지 얼마나 됐어요?", "Tôi đã làm ở Việt Nam [ba] năm rồi.", "베트남에서 3년 일했어요."),
 ("Anh nói được tiếng Thái à?", "태국어를 할 수 있어요?", "Trước đây tôi đã học tiếng Thái gần một năm [rưỡi].", "전에 태국어를 1년 반쯤 배웠어요."),
 ("Anh đi đâu vậy?", "어디 가요?", "Tôi đi sân bay [đón] bố mẹ.", "부모님을 마중하러 공항에 가요."),
 ("Ồ, anh có họ hàng người Việt à?", "오, 베트남 친척이 있어요?", "[Bà ngoại] tôi là người Việt.", "외할머니가 베트남 사람이에요."),
 ("Anh Brian có mấy anh chị em, vậy chị?", "브라이언 씨는 형제가 몇이에요?", "Anh ấy có khá đông anh em, một anh trai, [bốn] chị gái.", "형제가 꽤 많아요, 형 하나와 누나 넷이요."),
 ("Anh trai anh Brian đã có gia đình chưa?", "브라이언 씨 형은 결혼했어요?", "Chưa, anh ấy còn [độc thân].", "아니요, 아직 미혼이에요."),
 ("Sáng mai chị gặp tôi ở văn phòng được không?", "내일 아침에 사무실에서 만날 수 있어요?", "Sáng mai tôi sẽ gặp anh ở [văn phòng].", "내일 아침에 사무실에서 만나요."),
 ("Em gái anh Dũng là sinh viên à?", "중 씨 여동생은 대학생이에요?", "Không, cô ấy làm [nhân viên] siêu thị.", "아니요, 마트 직원으로 일해요."),
 ("Chồng cô ấy làm gì?", "그녀의 남편은 무슨 일을 해요?", "[Bác sĩ] bệnh viện Sài Gòn.", "사이공 병원 의사예요."),
 ("Cô ấy có gia đình chưa?", "그녀는 결혼했어요?", "Có gia đình [hai] năm rồi, lúc mười chín tuổi.", "결혼한 지 2년 됐어요, 열아홉 살 때요."),
 ("Ông ấy có mấy con?", "그분은 자녀가 몇이에요?", "Ông ấy có hai [con gái], một con trai.", "딸 둘, 아들 하나예요."),
 ("Anh đi thăm ông bà với ai?", "누구와 조부모님을 뵈러 가요?", "Tôi sẽ cùng đi với [em trai].", "남동생과 같이 가요."),
 ("Mẹ chị năm nay bao nhiêu tuổi?", "어머니는 올해 몇 살이세요?", "Mẹ tôi năm nay [sáu mươi tám] tuổi.", "어머니는 올해 예순여덟 살이에요.")]
B4 = {'L': [("Chị ấy nói được tiếng gì?", "그녀는 무슨 언어를 할 수 있어요?", "Tiếng Đức và tiếng Ý.", "독일어와 이탈리아어요."),
            ("Chị ấy biết ngoại ngữ gì?", "그녀는 무슨 외국어를 알아요?", "Tiếng Anh, tiếng Nhật.", "영어, 일본어요."),
            ("Chị xem gì?", "뭘 봐요?", "Xem phim Hàn Quốc.", "한국 영화를 봐요."),
            ("Anh ấy lên mạng để làm gì?", "그는 뭘 하려고 인터넷을 해요?", "Học tiếng Anh.", "영어를 공부해요."),
            ("Anh Brian nói được tiếng gì?", "브라이언 씨는 무슨 언어를 할 수 있어요?", "Tiếng Anh, tiếng Pháp, tiếng Nhật, tiếng Ý.", "영어, 프랑스어, 일본어, 이탈리아어요.")],
      'D': [("Em Sơn học tiếng Nhật bao lâu rồi?", "선은 일본어를 얼마나 배웠어요?", "Tám tháng rồi.", "여덟 달 됐어요."),
            ("Em sẽ học bao lâu?", "얼마 동안 배울 거니?", "Em sẽ học tiếng Việt sáu tháng.", "베트남어를 여섯 달 배울 거예요."),
            ("Họ thảo luận với nhau bao lâu rồi?", "그들은 얼마나 토론했어요?", "Hơn một tiếng rồi.", "한 시간 넘었어요."),
            ("Anh còn ở đây bao lâu nữa?", "여기 얼마나 더 있어요?", "Một tuần nữa.", "일주일 더요."),
            ("Chị ấy đã ở Hà Nội bao lâu?", "그녀는 하노이에 얼마나 있었어요?", "Bốn ngày.", "나흘이요.")],
      'T': [("Bao giờ chị đi Nha Trang?", "언제 나트랑에 가요?", "Thứ hai tuần sau.", "다음 주 월요일이요."),
            ("Anh ấy đặt vé máy bay bao giờ?", "그는 비행기 표를 언제 예약했어요?", "Hôm qua.", "어제요."),
            ("Em học tiếng Việt từ bao giờ?", "베트남어를 언제부터 배웠니?", "Từ tháng ba năm nay.", "올해 3월부터요."),
            ("Bao giờ đến sinh nhật của Emily?", "에밀리 생일은 언제예요?", "Ngày hai mươi lăm, thứ năm tuần sau.", "25일, 다음 주 목요일이요."),
            ("Anh David và chị Loan đi công tác bao giờ?", "데이비드 씨와 로안 씨는 언제 출장을 갔어요?", "Thứ bảy tuần trước.", "지난주 토요일이요.")],
      'C': [("Em ăn trưa chưa?", "점심 먹었니?", "Rồi, em ăn rồi.", "네, 먹었어요."),
            ("Cô ấy dọn dẹp nhà xong chưa?", "그녀는 집 청소를 다 했어요?", "Chưa, cô ấy chưa dọn dẹp xong.", "아니요, 아직 다 못 했어요."),
            ("Tắc xi đến chưa?", "택시 왔어요?", "Rồi, tắc xi đến rồi.", "네, 택시 왔어요."),
            ("Nó ngủ chưa?", "그 아이 잤어요?", "Chưa, nó chưa ngủ.", "아니요, 아직 안 잤어요."),
            ("Chị khỏe chưa?", "몸은 나았어요?", "Chưa, tôi còn mệt.", "아니요, 아직 피곤해요.")],
      'F': [("Còn Vân, gia đình Vân có mấy người?", "번은, 가족이 몇 명이에요?", "Gia đình tôi có bốn người.", "우리 가족은 네 명이에요."),
            ("Em anh Dũng bao nhiêu tuổi?", "중 씨 동생은 몇 살이에요?", "Hai mươi mốt tuổi.", "스물한 살이요."),
            ("Chị Loan có em gái không?", "로안 씨는 여동생이 있어요?", "Có, chị ấy có một em gái.", "네, 여동생이 하나 있어요."),
            ("Ba mẹ chị ấy sinh năm nào?", "그녀의 부모님은 몇 년생이에요?", "Hai người đều sinh năm 1964.", "두 분 다 1964년생이에요."),
            ("Bố mẹ chị còn làm việc không?", "부모님은 아직 일하세요?", "Bố mẹ tôi còn làm việc chứ.", "물론 아직 일하시죠.")],
      'S': [("Tôi gặp ba mẹ chị Hà rồi.", "하 씨 부모님을 만났어요.", "Thế à? Ba mẹ chị ấy khỏe không?", "그래요? 그분들 건강하세요?"),
            ("Tháng mười hai năm nay tôi sẽ đi Thái Lan.", "올해 12월에 태국에 가요.", "Anh đi du lịch hả?", "여행 가요?"),
            ("Em đã học tiếng Việt một tháng rồi nhưng em nói không giỏi.", "베트남어를 한 달 배웠는데 말을 잘 못해요.", "Từ từ em sẽ giỏi hơn.", "차차 더 잘하게 될 거야."),
            ("Tôi không muốn ăn.", "먹고 싶지 않아요.", "Ăn một chút đi!", "조금만 먹어요!"),
            ("Tôi buồn ngủ quá.", "너무 졸려요.", "Vậy chị đi ngủ sớm đi!", "그럼 일찍 자요!"),
            ("Hôm nay tôi không khỏe.", "오늘 몸이 안 좋아요.", "Anh đi bệnh viện đi!", "병원에 가 봐요!"),
            ("Anh có đi với tôi không?", "저랑 같이 갈래요?", "Tôi đi với anh chứ.", "당연히 같이 가죠."),
            ("Anh chờ tôi ở đây được không?", "여기서 저 기다려 줄 수 있어요?", "Được, tôi chờ anh ở đây.", "네, 여기서 기다릴게요."),
            ("Hiểu không, em?", "이해했니?", "Dạ, em hiểu chứ!", "네, 당연히 이해했어요!"),
            ("Anh có đi du lịch với gia đình không?", "가족과 여행 가요?", "Có, tôi đi du lịch với gia đình chứ!", "그럼요, 가족과 여행 가죠!"),
            ("Người đang nói chuyện với chị Loan là ai vậy, chị?", "로안 씨와 이야기하는 사람은 누구예요?", "Em gái của anh Dũng đấy!", "중 씨 여동생이에요!"),
            ("Anh trai của cô ấy là nhân viên văn phòng à?", "그녀의 오빠는 사무직이에요?", "Không, anh ấy là bác sĩ.", "아니요, 의사예요."),
            ("Ba mẹ anh đến Việt Nam du lịch à?", "부모님이 베트남에 여행 오세요?", "Ừ, ba mẹ tôi muốn đi du lịch ở Nha Trang và Đà Nẵng.", "응, 부모님은 나트랑과 다낭을 여행하고 싶어 하셔."),
            ("Vậy, chị sẽ gặp anh David ở Hà Nội hả?", "그럼 하노이에서 데이비드 씨를 만나요?", "Không, tôi gặp một khách hàng.", "아니요, 고객을 만나요."),
            ("Hôm nay là thứ hai hả, chị?", "오늘 월요일이에요?", "Ừ, hôm nay thứ hai.", "응, 오늘 월요일이야."),
            ("Con có đói không?", "배고프니?", "Dạ, con đói lắm.", "네, 아주 배고파요."),
            ("Tuần này, ba có về quê thăm ông bà không, ba?", "아빠, 이번 주에 조부모님 뵈러 고향에 가세요?", "Có chứ, chủ nhật ba về.", "그럼, 일요일에 갈 거야."),
            ("Chị của cô Lành giỏi ngoại ngữ không?", "란 씨의 언니는 외국어를 잘해요?", "Giỏi chứ! Chị ấy nói được ba thứ tiếng.", "그럼요! 세 나라 말을 해요."),
            ("Dạo này ba tôi không khỏe.", "요즘 아버지가 편찮으세요.", "Vậy anh về thăm ba đi.", "그럼 아버지 뵈러 가세요."),
            ("Buổi tối em ấy thường làm gì?", "저녁에 그 아이는 보통 뭘 해요?", "Em ấy thường nghe nhạc.", "보통 음악을 들어요."),
            ("Ông Lưu và vợ ông ấy sắp về hưu.", "르우 씨 부부가 곧 은퇴해요.", "Thế à? Bao giờ họ về hưu?", "그래요? 언제 은퇴해요?"),
            ("Chị viết tiếng Việt rất tốt.", "베트남어를 아주 잘 쓰시네요.", "Cám ơn anh.", "고마워요."),
            ("Nó có đi tham quan với bố mẹ không?", "그 아이는 부모님과 구경 가요?", "Có, nó đi với bố mẹ.", "네, 부모님과 가요."),
            ("Hôm qua ông ấy đi đâu?", "어제 그분은 어디 갔어요?", "Ông ấy đi bệnh viện.", "병원에 갔어요."),
            ("Ông ấy đặt vé được không?", "그분은 표를 예약할 수 있어요?", "Được, ông ấy đặt vé trên mạng.", "네, 인터넷으로 예약해요.")]}
# 2026-10-24 대표님 "교재에 있는 문법들을 다 넣으면 되잖아" — tools/mock3/gram_cover.py 로 벌마다 빈 문법(đừng·đi(끝)·mới·xong·khá·còn·đấy·비교)을 찾아, 문법 없던 자리 13곳을 그 문법이 든 문장으로 바꿈
C1L = [("Tôi viết đơn xin dạy tiếng Hàn ở một trung tâm ngoại ngữ.", "저는 외국어 학원에 한국어를 가르치겠다는 신청서를 써요."),
 ("Em mới học tiếng Việt nên thấy khó.", "저는 베트남어를 배운 지 얼마 안 돼서 어렵게 느껴요."),
 ("Các bạn nghỉ một chút đi!", "여러분, 잠깐 쉬세요!"),
 ("Chị ấy mới làm phiên dịch ở công ty này.", "그녀는 이 회사에서 통역 일을 시작한 지 얼마 안 됐어요."),
 ("Sắp cuối tuần rồi đấy.", "곧 주말이에요!"),
 ("Mẹ tôi làm nội trợ. Còn bố tôi là bác sĩ.", "엄마는 주부예요. 그리고 아빠는 의사예요."),
 ("Các bạn đừng nghỉ!", "여러분, 쉬지 마세요!"),
 ("Chúng ta luyện phát âm đi!", "우리 발음 연습해요!"),
 ("Anh đừng nói với cô ấy.", "그녀에게 말하지 마세요."),
 ("Anh ấy là con cả. Còn tôi là con út.", "그는 첫째예요. 그리고 저는 막내예요."),
 ("Tôi sẽ cùng bố mẹ đi thăm bà ngoại.", "저는 부모님과 함께 외할머니를 뵈러 갈 거예요."),
 ("Tôi cao bằng anh trai tôi.", "저는 형만큼 키가 커요."),
 ("Sơn làm việc và sống một mình ở Thành phố Hồ Chí Minh.", "선은 호찌민시에서 혼자 일하고 살아요."),
 ("Chúng ta đừng luyện phát âm!", "우리 발음 연습하지 말아요!"),
 ("Chị em cô ấy cùng giúp mẹ nấu ăn.", "그녀의 자매들은 함께 엄마의 요리를 도와요."),
 ("Tôi chưa nấu ăn xong.", "저는 아직 요리를 다 못 했어요."),
 ("Anh ấy muốn nói tiếng Việt như người Việt.", "그는 베트남 사람처럼 베트남어를 하고 싶어 해요."),
 ("Tôi thường lên mạng để xem tin tức.", "저는 보통 뉴스를 보려고 인터넷을 해요."),
 ("Tôi mới đến Việt Nam một tháng.", "저는 베트남에 온 지 한 달밖에 안 됐어요."),
 ("Gia đình chị ấy khá đông anh em.", "그녀의 집은 형제가 꽤 많아요."),
 ("Tôi và chị Lan cao bằng nhau.", "저와 란 언니는 키가 같아요."),
 ("Nhà anh ấy khá xa công ty.", "그의 집은 회사에서 꽤 멀어요."),
 ("Chị thứ hai của Toàn lập gia đình khá trễ.", "또안의 둘째 누나는 꽤 늦게 결혼했어요."),
 ("Ông Lưu và vợ ông ấy sắp về hưu.", "르우 씨와 부인은 곧 은퇴해요.") if False else ("Hôm qua tôi mới đi uống cà phê với anh Dũng.", "어제 저는 중 씨와 막 커피를 마시고 왔어요."),
 ("Ông ấy biết tiếng Anh và tiếng Đức.", "그분은 영어와 독일어를 알아요.")]
C2E = [("Bà Bảy được nói tiếng Đức một chút.", "Bà Bảy nói tiếng Đức được một chút.", "바이 씨는 독일어를 조금 할 수 있어요. (được 은 동사 뒤)", ["Bà Bảy nói được tiếng Đức một chút."]),
 ("Anh ấy được không nói tiếng Hàn Quốc.", "Anh ấy không nói được tiếng Hàn Quốc.", "그는 한국어를 못 해요. (không 은 동사 앞, được 은 동사 뒤)", ["Anh ấy nói tiếng Hàn Quốc không được."]),
 ("Hoàng học tiếng Hàn Quốc mới khoảng hai tháng.", "Hoàng mới học tiếng Hàn Quốc khoảng hai tháng.", "호앙은 한국어를 배운 지 두 달쯤밖에 안 됐어요. (mới 는 동사 앞)", []),
 ("Chị ngồi đừng đây!", "Chị đừng ngồi đây!", "여기 앉지 마세요! (đừng 은 동사 앞)", []),
 ("Em giải thích đừng bằng tiếng Việt!", "Em đừng giải thích bằng tiếng Việt!", "베트남어로 설명하지 마! (đừng 은 동사 앞)", []),
 ("Ông Năm bao lâu đã làm ở công ty đó?", "Ông Năm đã làm ở công ty đó bao lâu?", "남 씨는 그 회사에서 얼마나 일했어요? (bao lâu 는 끝에)", []),
 ("Các chị ấy đã xong làm việc.", "Các chị ấy đã làm việc xong.", "그녀들은 일을 다 끝냈어요. (xong 은 동사 뒤)", ["Các chị ấy đã làm xong việc."]),
 ("Em xong đặt vé chưa?", "Em đặt vé xong chưa?", "표 예약 다 했니? (xong 은 동사 뒤)", ["Em đặt xong vé chưa?"]),
 ("Chị Vân sẽ gặp một khó tính khách hàng.", "Chị Vân sẽ gặp một khách hàng khó tính.", "번 씨는 까다로운 고객을 만날 거예요. (꾸미는 말은 명사 뒤)", []),
 ("Thứ năm này tuần các chị ấy rảnh.", "Thứ năm tuần này các chị ấy rảnh.", "이번 주 목요일에 그녀들은 한가해요. (요일 + tuần này)", ["Các chị ấy rảnh thứ năm tuần này."]),
 ("Chị thứ hai nhỏ chị cả hơn hai tuổi.", "Chị thứ hai nhỏ hơn chị cả hai tuổi.", "둘째 누나는 큰누나보다 두 살 어려요. (nhỏ hơn + 사람 + 나이)", []),
 ("Gia đình chị ấy đông khá anh em.", "Gia đình chị ấy khá đông anh em.", "그녀의 집은 형제가 꽤 많아요. (khá 는 형용사 앞)", []),
 ("Dạo này bố tôi bận khá.", "Dạo này bố tôi khá bận.", "요즘 아버지가 꽤 바쁘세요. (khá 는 형용사 앞)", ["Bố tôi dạo này khá bận."]),
 ("Anh Bằng và anh Lưu bằng nhau tuổi.", "Anh Bằng và anh Lưu bằng tuổi nhau.", "방 씨와 르우 씨는 서로 동갑이에요. (bằng tuổi nhau)", ["Anh Bằng và anh Lưu cùng tuổi."]),
 ("Mẹ anh Nam đã xong nấu bữa tối.", "Mẹ anh Nam đã nấu xong bữa tối.", "남 씨 어머니는 저녁 요리를 다 했어요. (xong 은 동사 뒤)", ["Mẹ anh Nam đã nấu bữa tối xong."])]
C2D = [("Chị ấy viết tiếng Pháp sai nhiều.", "그녀는 프랑스어를 많이 틀리게 써요."),
 ("Nó đọc và viết được hai thứ tiếng.", "그 아이는 두 나라 말을 읽고 쓸 수 있어요."),
 ("Có lẽ năm sau chị Dung sẽ học hai ngoại ngữ này.", "아마 내년에 중 씨는 이 두 외국어를 배울 거예요."),
 ("Tối nay bà ấy về nước.", "오늘 밤 그분은 귀국해요."),
 ("Ba ngày nữa các anh ấy sẽ đến gặp ông Lee.", "사흘 뒤에 그들은 리 씨를 만나러 올 거예요."),
 ("Thứ ba tuần trước nó không đến lớp.", "지난주 화요일에 그 아이는 수업에 안 왔어요."),
 ("Ông Lưu và vợ ông ấy sắp về hưu.", "르우 씨와 부인은 곧 은퇴해요."),
 ("Chị cả của Toàn là nhân viên văn phòng.", "또안의 큰누나는 사무직이에요."),
 ("Trước đây em gái của tôi làm ở công ty Nhật.", "전에 제 여동생은 일본 회사에서 일했어요."),
 ("Anh Hưng sẽ cùng vẽ tranh với con trai.", "흥 씨는 아들과 함께 그림을 그릴 거예요.")]

C1ALT = {'Ông ấy biết tiếng Anh và tiếng Đức.': ['Ông ấy biết tiếng Đức và tiếng Anh.']}
def tiles(vi):
    """교재 문장 → 조각 4~5개 (앱 낱말로 묶고 짧은 이웃끼리 합침)"""
    ws = vi.rstrip('.?!').replace(',', '').split()
    low = [c.nf(w).lower() for w in ws]; ch = []; i = 0
    while i < len(ws):
        for n in (4, 3, 2, 1):
            if n == 1 or ' '.join(low[i:i + n]) in c.ENT: ch.append(' '.join(ws[i:i + n])); i += n; break
    while len(ch) > 5:
        k = min(range(len(ch) - 1), key=lambda j: len(ch[j].split()) + len(ch[j + 1].split()))
        ch[k:k + 2] = [ch[k] + ' ' + ch[k + 1]]
    order = [3, 0, 4, 1, 2] if len(ch) == 5 else [2, 0, 3, 1]
    return [ch[j] for j in order if j < len(ch)]

def sets():
    """재료 벌 n(1~5) → 갈래별 목록. 자리마다 같은 꼴이라 mix.py 가 어떻게 돌려도 한 벌에 같은 꼴이 둘 안 들어간다"""
    from common import time_moves
    out = {}
    for n in range(1, 6):
        k = n - 1
        a4 = [c.A4s(*A4S[k + 5 * j]) for j in range(5)]
        a4 += [c.A4d(*A4D[k + 5 * j], 'mf' if j % 2 == 0 else 'fm') for j in range(5)]
        b4 = [B4[t][k] for t in 'LDTCF'] + [B4['S'][k + 5 * j] for j in range(5)]
        c1 = []
        for j in range(5):
            vi, ko = C1L[k + 5 * j]; alts = [m for m in time_moves(vi) if m != vi] + C1ALT.get(vi, [])   # 바른 차례가 둘인 것(A và B)은 둘 다 정답
            c1.append(c.C1(vi, ko, tiles(vi), alts))
        e = [C2E[k + 5 * j] for j in range(3)]; d = [C2D[k + 5 * j] for j in range(2)]
        c2 = [c.C2(e[0][0], e[0][1], e[0][2], e[0][3]), c.C2(e[1][0], e[1][1], e[1][2], e[1][3]), c.C2(d[0][0], d[0][0], d[0][1], dung=True),
              c.C2(e[2][0], e[2][1], e[2][2], e[2][3]), c.C2(d[1][0], d[1][0], d[1][1], dung=True)]
        out[n] = {'A4': a4, 'B4': b4, 'C1': c1, 'C2': c2}
    return out
