# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 재료 1 — 외국어·배우기 쪽 (교재 1권 8과 낱말 위주, 9·10과 섞음). **빌드는 mix.py** 가 다섯 재료를 돌려 섞는다.
실제 2차 시험 수치에 맞춰 다시 썼다(2026-10-13 밤, 대표님 "모의고사와 실제 시험이 최대한 비슷하도록 모든 수치 조절 — 단어·문법·말하기 속도 다"):
듣기 4 문장 7~8낱말·대화 9~12 · 읽기 2 지문 ~18 · 읽기 3 지문 ~22 · 읽기 4 말·대답 ~7 · 배열 8~9 · 고치기 7~8 · 8~10과 낱말 몫 절반쯤(tools/mock3/metrics.py 로 잰다)."""
from common3 import *
from a3_trap import A3T
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
q += A3T[1]   # 듣기 3 — 실제 시험처럼 오답 보기도 들리게 (tools/mock3/a3_trap.py, 2026-10-13)
q += [A4s("Chị ấy nói được tiếng [Tây Ban Nha].", "그녀는 스페인어를 할 수 있어요."),
      A4s("Tôi mới học tiếng Việt [hai] tháng.", "저는 베트남어를 배운 지 두 달밖에 안 됐어요."),
      A4s("Các em đọc [bài hội thoại] đi!", "여러분, 회화문을 읽어 보세요!"),
      A4s("Em đừng [lo lắng], kiểm tra không khó.", "걱정하지 마, 시험은 어렵지 않아."),
      A4s("Anh ấy đã từng làm [phiên dịch] ở Seoul.", "그는 서울에서 통역을 한 적이 있어요."),
      A4d("Anh học tiếng Việt bao lâu rồi?", "베트남어를 얼마나 배웠어요?", "Được [năm] tháng rồi.", "다섯 달 됐어요.", 'mf'),
      A4d("Chị nói được tiếng Hàn không?", "한국어 할 수 있어요?", "Được, nhưng chưa [tự tin].", "할 수 있어요, 그런데 아직 자신은 없어요.", 'fm'),
      A4d("Em viết bằng tiếng gì?", "무슨 말로 써?", "Bằng tiếng [Nga] ạ.", "러시아어로요.", 'mf'),
      A4d("Chị xem giùm em được không?", "저 대신 좀 봐 줄 수 있어요?", "Được, chờ [một chút] nhé.", "그래, 잠깐만 기다려.", 'fm'),
      A4d("Tiếng Việt có khó không?", "베트남어는 어려워요?", "Hơi khó nhưng rất [thú vị].", "좀 어렵지만 아주 재미있어요.", 'mf')]
q += B1S(NO, ["được", "bao lâu", "mới", "đừng", "đi"], [     # 재료용 — mix.py 가 벌마다 헷갈리는 보기로 다시 쓴다
      ("Anh ấy nói ____ tiếng Đức.", "được", "그는 독일어를 할 수 있어요."),
      ("Chị đã sống ở Việt Nam ____?", "bao lâu", "베트남에서 얼마나 살았어요?"),
      ("Tôi ____ đến Việt Nam tuần trước.", "mới", "저는 지난주에 막 베트남에 왔어요."),
      ("Anh ____ thức khuya nhé!", "đừng", "밤늦게까지 깨어 있지 마세요!"),
      ("Chúng ta luyện phát âm ____!", "đi", "우리 발음 연습해요!")])
q += [B2("Chị May làm phiên dịch ở khách sạn. Chị ấy nói được tiếng Thái Lan, tiếng Anh và tiếng Việt.", "메이 씨는 호텔에서 통역을 해요. 태국어, 영어, 베트남어를 할 수 있어요.",
         "Chị May nói được mấy thứ tiếng?", "메이 씨는 몇 개 언어를 할 수 있어요?", ["ba thứ tiếng", "hai thứ tiếng", "bốn thứ tiếng"]),
      B2("Andy nhỏ tuổi nhất lớp. Mẹ Andy là người Việt nên em ấy học tiếng Việt để nói với mẹ.", "앤디는 반에서 가장 어려요. 앤디의 어머니는 베트남 사람이라서 어머니와 이야기하려고 베트남어를 배워요.",
         "Andy học tiếng Việt để làm gì?", "앤디는 무엇을 하려고 베트남어를 배워요?", ["để nói với mẹ", "để đi du lịch", "để làm phiên dịch"]),
      B2("Anh Hùng mới đăng ký học tiếng Nga ở trung tâm ngoại ngữ, ba buổi tối một tuần.", "훙 씨는 외국어 학원에 러시아어 수업을 막 등록했어요, 일주일에 저녁 세 번이에요.",
         "Anh Hùng học tiếng Nga mấy buổi một tuần?", "훙 씨는 일주일에 몇 번 러시아어를 배워요?", ["ba buổi", "hai buổi", "năm buổi"]),
      B2("Eun Ji viết đơn xin dạy tiếng Hàn bằng tiếng Việt. Chị ấy ngại viết sai nên anh Toàn xem giùm.", "은지 씨는 한국어를 가르치겠다는 신청서를 베트남어로 써요. 틀리게 쓸까 봐 걱정돼서 또안 씨가 대신 봐 줘요.",
         "Ai xem đơn giùm Eun Ji?", "누가 은지 씨 대신 신청서를 봐 줘요?", ["anh Toàn", "chị Loan", "cô giáo"]),
      B2("Ông Jack mới đến Việt Nam một tháng. Ông ấy chưa nói được tiếng Việt nhưng đọc được một chút.", "잭 씨는 베트남에 온 지 한 달밖에 안 됐어요. 아직 베트남어를 못 하지만 조금 읽을 수는 있어요.",
         "Ông Jack làm được gì?", "잭 씨는 무엇을 할 수 있어요?", ["đọc được một chút", "nói tiếng Việt giỏi", "viết được tiếng Việt"])]
T = [("Tôi là Hiroki, người Nhật. Tôi học tiếng Việt một năm rồi. Tôi nói được tiếng Việt nhưng phát âm còn kém.", "저는 히로키, 일본 사람이에요. 베트남어를 배운 지 1년 됐어요. 베트남어를 할 수 있지만 발음은 아직 부족해요.",
      [("Hiroki là người Nhật.", "히로키는 일본 사람이에요.", True), ("Hiroki phát âm tiếng Việt rất tốt.", "히로키는 베트남어 발음이 아주 좋아요.", False)]),
     ("Chị Dung làm ở khách sạn. Khi vắng khách, chị ấy luyện nói tiếng Anh với bạn thân. Chị ấy chưa nói được tiếng Hàn.", "중 씨는 호텔에서 일해요. 손님이 없을 때는 친한 친구와 영어 말하기를 연습해요. 한국어는 아직 못 해요.",
      [("Chị Dung làm việc ở khách sạn.", "중 씨는 호텔에서 일해요.", True), ("Chị Dung nói được tiếng Hàn.", "중 씨는 한국어를 할 수 있어요.", False)]),
     ("Lớp tiếng Việt của chúng tôi có mười hai học viên. Cuối khóa, cô giáo kiểm tra nói và viết. Mọi người đang ôn tập.", "우리 베트남어 반에는 학생이 열두 명 있어요. 기말에 선생님이 말하기와 쓰기를 시험해요. 모두 복습하고 있어요.",
      [("Lớp có mười hai học viên.", "반에 학생이 열두 명 있어요.", True), ("Cuối khóa chỉ kiểm tra viết.", "기말에는 쓰기만 시험해요.", False)]),
     ("Anh Tony đã từng làm việc ở Seoul hai năm. Bây giờ anh ấy làm phiên dịch ở Hà Nội và cảm thấy rất tự tin.", "토니 씨는 서울에서 2년 일해 본 적이 있어요. 지금은 하노이에서 통역을 하고 아주 자신 있어 해요.",
      [("Anh Tony chưa bao giờ làm việc ở Seoul.", "토니 씨는 서울에서 일해 본 적이 없어요.", False), ("Bây giờ anh Tony làm việc ở Hà Nội.", "지금 토니 씨는 하노이에서 일해요.", True)]),
     ("Mây thích học ngoại ngữ. Mỗi ngày Mây nghe nhạc tiếng Pháp và đọc báo tiếng Anh. Năm sau Mây định học tiếng Nga.", "머이는 외국어 배우기를 좋아해요. 매일 프랑스 노래를 듣고 영어 신문을 읽어요. 내년에는 러시아어를 배울 생각이에요.",
      [("Mây không thích ngoại ngữ.", "머이는 외국어를 좋아하지 않아요.", False), ("Năm sau Mây định học tiếng Nga.", "내년에 머이는 러시아어를 배울 생각이에요.", True)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Anh nói được mấy thứ tiếng vậy?", "몇 개 언어를 할 수 있어요?", "Hai: tiếng Anh và một chút tiếng Việt.", "둘이요. 영어하고 베트남어 조금이요."),
              ("Chị học tiếng Việt bao lâu rồi?", "베트남어를 얼마나 배웠어요?", "Tám tháng rồi, nhưng vẫn nói kém.", "여덟 달 됐는데 아직 말을 잘 못해요."),
              ("Em viết đơn xin học xong chưa?", "수강 신청서 다 썼어?", "Dạ, em viết xong rồi ạ.", "네, 다 썼어요."),
              ("Tôi mới học tiếng Việt ba tuần.", "저는 베트남어를 배운 지 3주밖에 안 됐어요.", "Thế à? Chị nói tự tin quá!", "그래요? 아주 자신 있게 말하네요!"),
              ("Chị giải thích bằng tiếng Anh được không?", "영어로 설명해 줄 수 있어요?", "Được chứ, anh đừng ngại.", "물론이죠, 부끄러워하지 마세요."),
              ("Ai dạy tiếng Việt cho anh?", "누가 베트남어를 가르쳐 줘요?", "Cô Lan dạy, cô ấy hơi khó tính.", "란 선생님이요, 좀 까다로우세요."),
              ("Sao em không nói gì vậy?", "왜 아무 말도 안 해?", "Vì em ngại nói sai, anh ạ.", "틀리게 말할까 봐 부끄러워서요."),
              ("Từ 'giùm' nghĩa là gì?", "'giùm'은 무슨 뜻이에요?", "Nghĩa là giúp. Anh hiểu chưa?", "'돕다'라는 뜻이에요. 이해됐어요?"),
              ("Brian nói được năm thứ tiếng đấy!", "브라이언은 다섯 나라 말을 할 수 있대요!", "Ngạc nhiên quá! Anh ấy học ở đâu?", "놀랍네요! 어디서 배웠대요?"),
              ("Tôi viết tiếng Việt sai nhiều quá.", "베트남어를 너무 많이 틀리게 써요.", "Đừng lo, từ từ chị sẽ quen.", "걱정 마세요, 차차 익숙해질 거예요.")])
q += [C1("Chị ấy nói được tiếng Nhật và tiếng Nga.", "그녀는 일본어와 러시아어를 할 수 있어요.", ["được", "chị ấy", "tiếng Nhật", "nói", "và tiếng Nga"], ["Chị ấy nói tiếng Nhật và tiếng Nga được."]),
      C1("Tôi mới học tiếng Việt được một tháng.", "저는 베트남어를 배운 지 한 달밖에 안 됐어요.", ["mới", "tôi", "học", "tiếng Việt", "được một tháng"]),
      C1("Anh đừng lo lắng về bài kiểm tra.", "시험에 대해 걱정하지 마세요.", ["đừng", "anh", "lo lắng", "bài kiểm tra", "về"]),
      C1("Em học tiếng Hàn ở đây bao lâu rồi?", "여기서 한국어를 얼마나 배웠어?", ["bao lâu", "em", "tiếng Hàn", "học ở đây", "rồi"]),
      C1("Các bạn nghỉ một chút rồi ôn tập đi.", "여러분, 좀 쉬고 나서 복습하세요.", ["đi", "các bạn", "một chút", "nghỉ", "rồi ôn tập"])]
q += [C2("Anh ấy được nói tiếng Anh và tiếng Pháp.", "Anh ấy nói được tiếng Anh và tiếng Pháp.", "그는 영어와 프랑스어를 할 수 있어요. (được 은 동사 뒤)", ["Anh ấy nói tiếng Anh và tiếng Pháp được."]),
      C2("Các em ngủ đừng trong lớp học!", "Các em đừng ngủ trong lớp học!", "여러분, 교실에서 자지 마세요! (đừng 은 동사 앞)"),
      C2("Anh đã làm phiên dịch ở đó bao lâu?", "Anh đã làm phiên dịch ở đó bao lâu?", "거기서 통역을 얼마나 했어요?", dung=True),
      C2("Tôi học tiếng Việt mới một tháng.", "Tôi mới học tiếng Việt một tháng.", "저는 베트남어를 배운 지 한 달밖에 안 됐어요. (mới 는 동사 앞)"),
      C2("Chị ấy nói được ba thứ tiếng rồi.", "Chị ấy nói được ba thứ tiếng rồi.", "그녀는 벌써 세 언어를 할 수 있어요.", dung=True)]
q.append(C3("mock3-1-w3.webp",
            [("Đây là lớp học tiếng Việt.", "여기는 베트남어 교실이에요."), ("Cô Lan đang dạy tiếng Việt.", "란 선생님이 베트남어를 가르치고 있어요."),
             ("Anh Minh đang đọc sách.", "민 씨는 책을 읽고 있어요."), ("Anh Nam và chị Mai đang nghe cô Lan.", "남 씨와 마이 씨는 란 선생님 말을 듣고 있어요."), ("Lớp học có ba học viên.", "교실에 학생이 셋 있어요.")],
            {'say': ['đây là lớp học', 'đây là lớp học tiếng việt', 'có ba học viên', 'lớp học có ba học viên', 'có một cô giáo', 'cô lan là giáo viên', 'cô lan là cô giáo', 'họ đang học tiếng việt', 'họ đang ở lớp học'],
             'facts': [(['cô lan', 'cô giáo', 'giáo viên', 'cô ấy'], ['đang dạy tiếng việt', 'đang dạy học', 'đang dạy', 'đang đứng', 'là giáo viên', 'là cô giáo'], False),
                       (['anh minh', 'anh ấy'], ['đang đọc sách', 'đang học', 'đang ngồi', 'đang nghe cô lan', 'đang học tiếng việt'], False),
                       (['anh nam', 'chị mai'], ['đang ngồi', 'đang học', 'đang nghe cô lan', 'đang nghe cô giáo', 'đang học tiếng việt', 'là học viên', 'là sinh viên'], False),
                       (['anh nam và chị mai', 'họ', 'các học viên', 'ba học viên', 'mọi người'], ['đang ngồi', 'đang học', 'đang nghe cô lan', 'đang nghe cô giáo', 'đang học tiếng việt', 'là học viên', 'là sinh viên'], True)],
             'pre': ['bây giờ', 'hôm nay', 'trong lớp', 'ở lớp học'], 'post': ['ở lớp học', 'trong lớp', 'bây giờ', 'hôm nay']}))
q += D(['nói được', 'thứ hai', 'gia đình', 'hình như', 'cuối tuần', 'con trai', 'phát âm', 'khách hàng', 'về hưu', 'giùm'],
       ['Anh ấy nói được tiếng gì?', 'Chị đã học ở đây bao lâu?', 'Thứ ba tuần sau ba mẹ tôi đến Việt Nam.', 'Gia đình chị có mấy người?', 'Em tôi nhỏ hơn tôi bốn tuổi.'])   # 말하기 — 교재 8~10과 발음 목록(PHÁT ÂM) 두 음절 낱말·문장(실제 2차 말하기가 발음 목록에서, 낱말 2.0음절·문장 6.4낱말 평균) (2026-10-13 밤)
build(NO, q)
