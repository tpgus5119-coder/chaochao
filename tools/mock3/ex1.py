# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 1 — 외국어·배우기 (교재 1권 8과 중심: được · bao lâu · mới · 끝말 đi · đừng · ngoại ngữ)"""
from common3 import *
NO = 1
q = []
q += [TF("khóc", "Em ấy đang khóc.", "그 아이가 울고 있어요.", True),
      TF("phiên dịch", "Anh ấy làm phiên dịch.", "그는 통역을 해요.", True),
      TF("khách sạn", "Đây là một bệnh viện.", "여기는 병원이에요.", False),
      TF("lo lắng", "Anh ấy rất vui.", "그는 아주 기뻐요.", False),
      TF("kiểm tra", "Đây là bài kiểm tra.", "이것은 시험지예요.", True)]
q += PKS(NO, [("đơn", "Anh ấy đang viết đơn.", "그는 신청서를 쓰고 있어요.", "mock3-1-pa.webp"),
              ("buổi tối", "Buổi tối anh ấy đọc sách tiếng Việt.", "저녁에 그는 베트남어 책을 읽어요.", "mock3-1-pb.webp"),
              ("giáo viên", "Anh ấy đang nói chuyện với giáo viên.", "그는 선생님과 이야기하고 있어요.", "mock3-1-pc.webp"),
              ("xe buýt", "Anh ấy đang chờ xe buýt.", "그는 버스를 기다리고 있어요.", "mock3-1-pd.webp"),
              ("ăn sáng", "Anh ấy đang ăn sáng.", "그는 아침을 먹고 있어요.", "mock3-1-pe.webp")])   # 듣기 2 — 실제 2차 시험지처럼 한 사람의 다섯 장면(새로 그림, 2026-10-13)
q += [A3s("Chị Mai nói được mấy thứ tiếng?", "마이 씨는 몇 개 언어를 할 수 있어요?", "Chị Mai nói được ba thứ tiếng: tiếng Anh, tiếng Pháp và tiếng Việt.", "마이 씨는 영어, 프랑스어, 베트남어 세 언어를 할 수 있어요.", ["ba", "hai", "bốn"]),
      A3s("Anh Tony học tiếng Việt bao lâu rồi?", "토니 씨는 베트남어를 얼마나 배웠어요?", "Anh Tony đã học tiếng Việt sáu tháng rồi.", "토니 씨는 베트남어를 여섯 달 배웠어요.", ["sáu tháng", "một năm", "hai tháng"]),
      A3s("Sao em Sơn nói tiếng Hàn chưa giỏi?", "선은 왜 한국어를 아직 잘 못 해요?", "Em Sơn mới học tiếng Hàn nên em ấy nói chưa giỏi.", "선은 한국어를 배운 지 얼마 안 돼서 아직 잘 못 해요.", ["vì em ấy mới học", "vì tiếng Hàn rất dễ", "vì em ấy là người Hàn"]),
      A3s("Chị Kate dạy tiếng Anh ở đâu?", "케이트 씨는 어디에서 영어를 가르쳐요?", "Chị Kate dạy tiếng Anh ở một trung tâm ngoại ngữ ở Quận 3.", "케이트 씨는 3군의 한 외국어 학원에서 영어를 가르쳐요.", ["ở trung tâm ngoại ngữ", "ở trường đại học", "ở công ty"]),
      A3s("Anh Lee không làm được gì?", "리 씨는 무엇을 못 해요?", "Anh Lee đọc được tiếng Việt nhưng không viết được.", "리 씨는 베트남어를 읽을 수는 있지만 쓰지는 못해요.", ["viết tiếng Việt", "đọc tiếng Việt", "nói tiếng Anh"]),
      A3d("Anh ấy nói được tiếng gì?", "그는 무슨 언어를 할 수 있어요?", [("Anh nói tiếng Nhật được không?", "일본어 할 수 있어요?"), ("Không được. Tôi chỉ nói được tiếng Anh.", "못 해요. 저는 영어만 할 수 있어요.")], ["tiếng Anh", "tiếng Nhật", "tiếng Nhật và tiếng Anh"], 'fm'),
      A3d("Chị ấy làm phiên dịch bao lâu rồi?", "그녀는 통역을 얼마나 했어요?", [("Chị làm phiên dịch ở đây bao lâu rồi?", "여기서 통역 일을 얼마나 했어요?"), ("Hai năm rồi.", "2년 됐어요.")], ["hai năm", "hai tháng", "một năm"], 'mf'),
      A3d("Em ấy viết đơn bằng tiếng gì?", "그 학생은 신청서를 무슨 말로 써요?", [("Em viết đơn bằng tiếng Việt hả?", "신청서를 베트남어로 쓰는 거야?"), ("Dạ, nhưng em viết sai nhiều lắm.", "네, 그런데 많이 틀리게 써요.")], ["tiếng Việt", "tiếng Anh", "tiếng Hàn"], 'fm'),
      A3d("Ai nói 'Đừng lo'?", "누가 '걱정하지 마'라고 말해요?", [("Đừng lo, từ từ em sẽ giỏi hơn.", "걱정하지 마, 천천히 하면 더 잘하게 될 거야."), ("Dạ, cám ơn thầy.", "네, 고맙습니다, 선생님.")], ["thầy", "học viên", "người bán"], 'mf'),
      A3d("Bạn anh ấy nói được mấy thứ tiếng?", "그의 친구는 몇 개 언어를 해요?", [("Bạn anh nói được mấy thứ tiếng?", "당신 친구는 몇 개 언어를 해요?"), ("Nó nói được bốn thứ tiếng, giỏi lắm.", "걔는 네 개 언어를 해요, 아주 잘해요.")], ["bốn", "ba", "hai"], 'fm')]
q += [A4s("Chị ấy nói được tiếng [Pháp].", "그녀는 프랑스어를 할 수 있어요."),
      A4s("Tôi mới học tiếng Việt [hai] tuần.", "저는 베트남어를 배운 지 2주밖에 안 됐어요."),
      A4s("Các em đọc [bài hội thoại] đi!", "여러분, 회화문을 읽어 보세요!"),
      A4s("Em đừng [nói chuyện] trong lớp!", "수업 중에 이야기하지 마!"),
      A4s("Anh ấy đã từng [làm việc] ở Nhật.", "그는 일본에서 일해 본 적이 있어요."),
      A4d("Anh học tiếng Việt bao lâu rồi?", "베트남어를 얼마나 배웠어요?", "Tôi học [năm] tháng rồi.", "다섯 달 배웠어요.", 'mf'),
      A4d("Chị nói được tiếng Hàn không?", "한국어 할 수 있어요?", "Được, nhưng tôi nói không [giỏi].", "할 수 있어요, 그런데 잘하지는 못해요.", 'fm'),
      A4d("Em viết bằng tiếng gì?", "무슨 말로 써?", "Em viết bằng tiếng [Anh].", "영어로 써요.", 'mf'),
      A4d("Anh xem giùm tôi được không?", "저 대신 좀 봐 줄 수 있어요?", "Được. [Chờ] tôi một chút.", "그래요. 잠깐만 기다려요.", 'fm'),
      A4d("Phát âm tiếng Việt có khó không?", "베트남어 발음은 어려워요?", "Hơi khó nhưng [thú vị].", "좀 어렵지만 재미있어요.", 'mf')]
q += B1S(NO, ["được", "bao lâu", "mới", "đừng", "đi"], [
      ("Anh ấy nói ____ tiếng Đức.", "được", "그는 독일어를 할 수 있어요."),
      ("Chị đã sống ở Việt Nam ____?", "bao lâu", "베트남에서 얼마나 살았어요?"),
      ("Tôi ____ đến Việt Nam tuần trước.", "mới", "저는 지난주에 막 베트남에 왔어요."),
      ("Anh ____ thức khuya nhé!", "đừng", "밤늦게까지 깨어 있지 마세요!"),
      ("Chúng ta luyện phát âm ____!", "đi", "우리 발음 연습해요!")])
q += [B2("Chị May là người Thái Lan. Chị ấy làm việc ở Quận 1. Chị May nói được tiếng Thái, tiếng Anh và tiếng Việt.", "메이 씨는 태국 사람이에요. 1군에서 일해요. 메이 씨는 태국어, 영어, 베트남어를 할 수 있어요.",
         "Chị May nói được mấy thứ tiếng?", "메이 씨는 몇 개 언어를 할 수 있어요?", ["ba thứ tiếng", "hai thứ tiếng", "bốn thứ tiếng"]),
      B2("Andy là học viên nhỏ tuổi nhất lớp. Mẹ của Andy là người Việt nên em ấy học tiếng Việt để nói chuyện với mẹ.", "앤디는 반에서 가장 어린 학생이에요. 앤디의 어머니는 베트남 사람이라서 어머니와 이야기하려고 베트남어를 배워요.",
         "Andy học tiếng Việt để làm gì?", "앤디는 무엇을 하려고 베트남어를 배워요?", ["để nói chuyện với mẹ", "để đi du lịch", "để làm phiên dịch"]),
      B2("Anh Hùng muốn học tiếng Nhật. Anh ấy đăng ký học ở trung tâm ngoại ngữ, ba buổi tối một tuần.", "훙 씨는 일본어를 배우고 싶어요. 외국어 학원에 일주일에 저녁 세 번 수업을 등록했어요.",
         "Anh Hùng học tiếng Nhật mấy buổi một tuần?", "훙 씨는 일주일에 몇 번 일본어를 배워요?", ["ba buổi", "hai buổi", "năm buổi"]),
      B2("Eun Ji viết đơn xin dạy tiếng Hàn. Chị ấy viết bằng tiếng Việt và anh Toàn xem giùm chị ấy.", "은지 씨는 한국어를 가르치겠다는 신청서를 써요. 베트남어로 쓰고 또안 씨가 대신 봐 줘요.",
         "Ai xem đơn giùm Eun Ji?", "누가 은지 씨 대신 신청서를 봐 줘요?", ["anh Toàn", "chị Loan", "cô giáo"]),
      B2("Ông Jack mới đến Việt Nam một tuần. Ông ấy chưa nói được tiếng Việt nhưng đọc được một chút.", "잭 씨는 베트남에 온 지 일주일밖에 안 됐어요. 아직 베트남어를 못 하지만 조금 읽을 수는 있어요.",
         "Ông Jack làm được gì?", "잭 씨는 무엇을 할 수 있어요?", ["đọc được một chút tiếng Việt", "nói tiếng Việt giỏi", "viết được tiếng Việt"])]
T = [("Tôi là Hiroki, người Nhật. Tôi đã học tiếng Việt một năm. Tôi nói được tiếng Việt nhưng phát âm chưa tốt.", "저는 히로키, 일본 사람이에요. 베트남어를 1년 배웠어요. 베트남어를 할 수 있지만 발음은 아직 좋지 않아요.",
      [("Hiroki là người Nhật.", "히로키는 일본 사람이에요.", True), ("Hiroki phát âm tiếng Việt rất tốt.", "히로키는 베트남어 발음이 아주 좋아요.", False)]),
     ("Chị Dung làm ở bưu điện. Chị ấy nói được tiếng Anh và tiếng Đức nhưng không nói được tiếng Hàn.", "중 씨는 우체국에서 일해요. 영어와 독일어는 할 수 있지만 한국어는 못 해요.",
      [("Chị Dung làm việc ở bưu điện.", "중 씨는 우체국에서 일해요.", True), ("Chị Dung nói được tiếng Hàn.", "중 씨는 한국어를 할 수 있어요.", False)]),
     ("Lớp tiếng Việt của chúng tôi có mười hai học viên. Cô giáo giải thích bằng tiếng Việt, không giải thích bằng tiếng Anh.", "우리 베트남어 반에는 학생이 열두 명 있어요. 선생님은 베트남어로 설명하고 영어로는 설명하지 않아요.",
      [("Lớp có mười hai học viên.", "반에 학생이 열두 명 있어요.", True), ("Cô giáo giải thích bằng tiếng Việt.", "선생님은 베트남어로 설명해요.", True)]),
     ("Anh Tony đã từng làm việc ở Seoul hai năm. Bây giờ anh ấy làm phiên dịch ở Hà Nội.", "토니 씨는 서울에서 2년 일해 본 적이 있어요. 지금은 하노이에서 통역을 해요.",
      [("Anh Tony chưa bao giờ làm việc ở Seoul.", "토니 씨는 서울에서 일해 본 적이 없어요.", False), ("Bây giờ anh Tony làm việc ở Seoul.", "지금 토니 씨는 서울에서 일해요.", False)]),
     ("Mây thích học ngoại ngữ. Mỗi ngày Mây nghe nhạc tiếng Pháp và đọc báo tiếng Anh.", "머이는 외국어 배우기를 좋아해요. 매일 프랑스 노래를 듣고 영어 신문을 읽어요.",
      [("Mây không thích ngoại ngữ.", "머이는 외국어를 좋아하지 않아요.", False), ("Mây đọc báo tiếng Anh.", "머이는 영어 신문을 읽어요.", True)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Anh nói được tiếng gì?", "무슨 언어를 할 수 있어요?", "Tôi nói được tiếng Anh và tiếng Việt.", "영어와 베트남어를 할 수 있어요."),
              ("Chị học tiếng Việt bao lâu rồi?", "베트남어를 얼마나 배웠어요?", "Tám tháng rồi.", "여덟 달 됐어요."),
              ("Em viết đơn xong chưa?", "신청서 다 썼어?", "Dạ, em viết xong rồi.", "네, 다 썼어요."),
              ("Tôi mới học tiếng Việt ba tuần.", "저는 베트남어를 배운 지 3주밖에 안 됐어요.", "Thế à? Chị nói giỏi quá!", "그래요? 말 정말 잘하시네요!"),
              ("Chị giải thích bằng tiếng Anh được không?", "영어로 설명해 줄 수 있어요?", "Được chứ!", "물론이죠!"),
              ("Ai dạy tiếng Việt cho anh?", "누가 베트남어를 가르쳐 줘요?", "Cô Lan dạy tôi.", "란 선생님이 가르쳐 줘요."),
              ("Sao em không nói?", "왜 말을 안 해?", "Vì em ngại nói tiếng Việt.", "베트남어로 말하는 게 부끄러워서요."),
              ("Từ 'giùm' nghĩa là gì?", "'giùm'은 무슨 뜻이에요?", "Nghĩa là giúp.", "'돕다'라는 뜻이에요."),
              ("Brian nói được năm thứ tiếng.", "브라이언은 다섯 나라 말을 할 수 있어요.", "Giỏi quá! Anh ấy học ở đâu vậy?", "대단하네요! 어디서 배웠대요?"),
              ("Tôi viết tiếng Việt sai nhiều quá.", "베트남어를 너무 많이 틀리게 써요.", "Đừng lo! Từ từ chị sẽ viết tốt hơn.", "걱정 마세요! 차차 더 잘 쓰게 될 거예요.")])
q += [C1("Chị ấy nói được tiếng Nhật.", "그녀는 일본어를 할 수 있어요.", ["được", "chị ấy", "tiếng Nhật", "nói"], ["Chị ấy nói tiếng Nhật được."]),
      C1("Tôi mới học tiếng Việt.", "저는 베트남어를 배운 지 얼마 안 됐어요.", ["mới", "tôi", "học", "tiếng Việt"]),
      C1("Anh đừng lo.", "걱정하지 마세요.", ["đừng", "anh", "lo"]),
      C1("Em học tiếng Hàn bao lâu rồi?", "한국어를 얼마나 배웠어?", ["bao lâu", "em", "tiếng Hàn", "học", "rồi"]),
      C1("Các bạn nghỉ một chút đi.", "여러분, 좀 쉬세요.", ["đi", "các bạn", "một chút", "nghỉ"])]
q += [C2("Anh ấy được nói tiếng Anh.", "Anh ấy nói được tiếng Anh.", "그는 영어를 할 수 있어요. (được 은 동사 뒤)", ["Anh ấy nói tiếng Anh được."]),
      C2("Các em ngủ đừng trong lớp!", "Các em đừng ngủ trong lớp!", "여러분, 수업 중에 자지 마세요! (đừng 은 동사 앞)"),
      C2("Anh đã làm ở đó bao lâu?", "Anh đã làm ở đó bao lâu?", "거기서 얼마나 일했어요?", dung=True),
      C2("Tôi học tiếng Việt mới một tháng.", "Tôi mới học tiếng Việt một tháng.", "저는 베트남어를 배운 지 한 달밖에 안 됐어요. (mới 는 동사 앞)"),
      C2("Chị ấy nói được ba thứ tiếng.", "Chị ấy nói được ba thứ tiếng.", "그녀는 세 언어를 할 수 있어요.", dung=True)]
q.append(C3("mock3-1-w3.webp",
            [("Đây là lớp học tiếng Việt.", "여기는 베트남어 교실이에요."), ("Cô Lan đang dạy tiếng Việt.", "란 선생님이 베트남어를 가르치고 있어요."),
             ("Anh Minh đang đọc sách.", "민 씨는 책을 읽고 있어요."), ("Anh Nam và chị Mai đang nghe cô Lan.", "남 씨와 마이 씨는 란 선생님 말을 듣고 있어요."), ("Lớp học có ba học viên.", "교실에 학생이 셋 있어요.")],
            {'say': ['đây là lớp học', 'đây là lớp học tiếng việt', 'có ba học viên', 'lớp học có ba học viên', 'có một cô giáo', 'cô lan là giáo viên', 'cô lan là cô giáo', 'họ đang học tiếng việt', 'họ đang ở lớp học'],
             'facts': [(['cô lan', 'cô giáo', 'giáo viên', 'cô ấy'], ['đang dạy tiếng việt', 'đang dạy học', 'đang dạy', 'đang đứng', 'là giáo viên', 'là cô giáo'], False),
                       (['anh minh', 'anh ấy'], ['đang đọc sách', 'đang học', 'đang ngồi', 'đang nghe cô lan', 'đang học tiếng việt'], False),
                       (['anh nam', 'chị mai'], ['đang ngồi', 'đang học', 'đang nghe cô lan', 'đang nghe cô giáo', 'đang học tiếng việt', 'là học viên', 'là sinh viên'], False),
                       (['anh nam và chị mai', 'họ', 'các học viên', 'ba học viên', 'mọi người'], ['đang ngồi', 'đang học', 'đang nghe cô lan', 'đang nghe cô giáo', 'đang học tiếng việt', 'là học viên', 'là sinh viên'], True)],
             'pre': ['bây giờ', 'hôm nay', 'trong lớp', 'ở lớp học'], 'post': ['ở lớp học', 'trong lớp', 'bây giờ', 'hôm nay']}))
q += D(["nói được", "thứ tiếng", "nghe nói", "hình như", "trung tâm", "ngoại ngữ", "một chút", "phát âm", "bao lâu", "quen"],
       ["Cô ấy nói được nhiều thứ tiếng.", "Ông ấy nói tiếng Tây Ban Nha không được.", "Chị đã học ở đây bao lâu?", "Em viết bằng tiếng Việt hay tiếng Nhật?", "Phát âm tiếng Việt khó."])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM 새 낱말·문장)에서 (2차 시험 말하기가 그 범위 발음 목록에서 나옴, 2026-10-13)
build(NO, q)
