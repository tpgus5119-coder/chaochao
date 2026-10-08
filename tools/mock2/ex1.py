# -*- coding: utf-8 -*-
# 모의고사 1 — 직업·일터·일하는 시간 (교재 4과 중심 + 7과 sắp). 2026-10-07 대표님 "시험은 4~7과, 문법은 1~7 그대로, 단어만 4~7 위주로" 에 따라 1~3과(자기소개·국적) 중심이던 것을 다시 씀.
from common import *
q = []
# 그림 27장: 다섯 벌이 서로 다른 그림·소리를 쓴다 (대표님 2026-10-08 "다른 모의고사에 나온 오디오·이미지도 쓰지 말라") — check_all.py 로 검사
q += [TF("tài xế", "Ông ấy là tài xế tắc xi. Ông ấy lái xe từ 6 giờ sáng.", True), TF("ngân hàng", "Chị ấy làm kế toán ở ngân hàng.", True),
      TF("kỹ sư", "Anh ấy là kỹ sư ở công ty máy tính.", True), TF("bệnh viện", "Đây là công ty máy tính. Công ty có 200 nhân viên.", False), TF("luật sư", "Anh ấy là bác sĩ. Dạo này anh ấy rất bận.", False)]
q += [PK(["nội trợ", "thư ký", "bác sĩ", "sinh viên"], "Chị ấy là thư ký. Chị ấy làm việc ở văn phòng công ty.", 1),
      PK(["nhân viên siêu thị", "nhân viên quán cà phê", "nhân viên trường đại học", "nhân viên công ty"], "Anh ấy là nhân viên siêu thị. Anh ấy làm việc ở siêu thị từ 7 giờ sáng.", 0),
      PK(["lái xe", "đi làm", "máy tính", "bận"], "Ông ấy lái xe tắc xi ở Quận 1.", 0),
      PK(["văn phòng", "công ty", "căng tin", "phòng"], "Buổi trưa tôi ăn trưa ở căng tin công ty.", 2),
      PK(["giáo viên", "trường đại học", "cơ quan", "nghề"], "Cô ấy là giáo viên ở trường đại học này.", 1)]
q += [A3("Ở Nhật anh Hiroki làm nghề gì?", "Ở Nhật tôi làm kế toán ở ngân hàng.", ["kế toán", "kỹ sư", "thư ký"]),
      A3("Ngân hàng của anh ấy có bao nhiêu nhân viên?", "Ngân hàng của tôi có hơn 100 nhân viên.", ["hơn 100 người", "khoảng 50 người", "hơn 200 người"]),
      A3("Brian dạy tiếng Anh ở quận nào?", "Tôi dạy ở trường ILA, Quận 2.", ["Quận 2", "Quận 1", "Quận 7"]),
      A3("Anh ấy dạy mấy ngày một tuần?", "Tôi dạy năm ngày một tuần, từ 9 giờ sáng đến 11 giờ rưỡi.", ["5 ngày", "2 ngày", "7 ngày"]),
      A3("Buổi chiều Hiroki làm việc từ mấy giờ đến mấy giờ?", "Buổi chiều tôi làm việc từ 2 giờ đến 7 giờ tối.", ["từ 2 giờ đến 7 giờ", "từ 8 giờ đến 5 giờ", "từ 9 giờ đến 11 giờ"]),
      A3("Hôm qua anh ấy vào phòng số mấy?", "Hôm qua tôi vào nhầm phòng. Tôi vào phòng số 308.", ["phòng số 308", "phòng số 301", "phòng số 318"]),
      A3("Chị Loan làm việc ở đâu?", "Tôi làm kỹ sư ở công ty máy tính. Cô Vân cũng làm việc ở đó.", ["công ty máy tính", "ngân hàng", "bệnh viện"]),
      A3("Dạo này chị ấy thế nào?", "Dạo này tôi rất bận. Buổi sáng tôi đi học, buổi chiều tôi đi làm.", ["rất bận", "rất rảnh", "hơi mệt"]),
      A3("Cô ấy sắp đi đâu?", "Tôi sắp đi ăn trưa với anh Brian.", ["đi ăn trưa", "đi làm", "đi ngủ"]),
      A3("Siêu thị có bao nhiêu nhân viên?", "Siêu thị này nhỏ, chỉ có khoảng 20 nhân viên.", ["khoảng 20 người", "khoảng 100 người", "hơn 200 người"])]
q += [A4("Anh làm nghề gì?", ["Tôi là kế toán ở ngân hàng.", "Tôi làm việc từ 8 giờ.", "Khoảng 100 nhân viên."]),
      A4("Chị làm việc ở đâu?", ["Ở công ty máy tính.", "Từ 2 giờ chiều.", "Năm ngày một tuần."]),
      A4("Anh dạy mấy ngày một tuần?", ["Năm ngày một tuần.", "Ở Quận 2.", "Khoảng 8 người."]),
      A4("Công ty anh có bao nhiêu nhân viên?", ["Khoảng 50 người.", "Lúc 8 giờ sáng.", "Ở văn phòng."]),
      A4("Buổi chiều chị làm việc từ mấy giờ đến mấy giờ?", ["Từ 2 giờ đến 7 giờ tối.", "Ở ngân hàng.", "Hơi vất vả."]),
      A4("Dạo này anh làm gì?", ["Tôi đang làm thư ký ở một công ty.", "Lúc 7 giờ rưỡi.", "Phòng số 308."]),
      A4("Cô ấy cũng làm kỹ sư, phải không?", ["Không, cô ấy là thư ký.", "Năm ngày một tuần.", "Ở Quận 1."]),
      A4("Hôm qua anh có đi làm không?", ["Có, nhưng tôi đến hơi trễ.", "Tôi làm kế toán.", "Hơn 100 người."]),
      A4("Anh sắp đi làm chưa?", ["Sắp rồi. Tôi đi ngay.", "Tôi là tài xế.", "Ở cơ quan."]),
      A4("Công việc của chị thế nào?", ["Hơi vất vả nhưng thú vị.", "Ở bệnh viện.", "Từ 8 giờ sáng."])]
bank = ["đang", "bao nhiêu", "từ", "sắp", "lắm"]
q += [B1("Tôi ____ làm kế toán ở ngân hàng.", bank, 0), B1("Công ty anh có ____ nhân viên?", bank, 1), B1("Tôi làm việc ____ 8 giờ sáng đến 5 giờ chiều.", bank, 2),
      B1("Tôi và anh Brian ____ đi ăn trưa.", bank, 3), B1("Dạo này công việc của tôi bận ____.", bank, 4)]
q += [B2("Anh Nam là tài xế tắc xi. Anh ấy lái xe từ 6 giờ sáng đến 2 giờ chiều. Công việc hơi vất vả nhưng anh ấy rất thích.", "Anh Nam làm việc đến mấy giờ?", ["2 giờ chiều", "6 giờ sáng", "7 giờ tối"]),
      B2("Chị Loan là kỹ sư ở công ty máy tính. Công ty của chị ấy ở Quận 1, có khoảng 200 nhân viên.", "Công ty của chị Loan có bao nhiêu nhân viên?", ["khoảng 200 người", "khoảng 20 người", "hơn 100 người"]),
      B2("Brian dạy tiếng Anh ở trường ILA, Quận 2. Anh ấy dạy năm ngày một tuần, từ 9 giờ sáng đến 11 giờ rưỡi trưa.", "Brian dạy đến mấy giờ?", ["11 giờ rưỡi", "9 giờ", "5 giờ chiều"]),
      B2("Dạo này Hiroki rất bận. Buổi sáng anh ấy đi học tiếng Việt, buổi chiều anh ấy đi làm ở ngân hàng.", "Buổi chiều Hiroki làm gì?", ["đi làm", "đi học", "đi ngủ"]),
      B2("Bà Lan đã nghỉ hưu. Trước đây bà ấy là giáo viên. Bây giờ buổi sáng bà ấy tập thể dục rồi đọc báo.", "Trước đây bà Lan làm nghề gì?", ["giáo viên", "bác sĩ", "nội trợ"])]
T1 = "Ở Nhật, Hiroki làm kế toán ở một ngân hàng. Ngân hàng của anh ấy có hơn 100 nhân viên. Bây giờ anh ấy học tiếng Việt ở Thành phố Hồ Chí Minh."
T2 = "Chị Mai là thư ký ở công ty máy tính. Chị ấy làm việc từ 8 giờ sáng đến 5 giờ chiều, năm ngày một tuần. Thứ bảy chị ấy ở nhà."
T3 = "Bố tôi là bác sĩ ở bệnh viện. Dạo này có nhiều việc nên bố tôi rất bận. Ông ấy thường về nhà hơi trễ."
T4 = "Ông Long là tài xế. Hôm qua ông ấy lái xe đi sân bay lúc 5 giờ sáng. Hôm nay ông ấy nghỉ ở nhà."
q += [B3(T1, "Hiroki là kế toán.", True), B3(T1, "Ngân hàng của Hiroki có khoảng 50 nhân viên.", False), B3(T1, "Bây giờ Hiroki học tiếng Việt.", True),
      B3(T2, "Chị Mai là kỹ sư.", False), B3(T2, "Chị Mai làm việc đến 5 giờ chiều.", True), B3(T2, "Thứ bảy chị Mai đi làm.", False),
      B3(T3, "Bố tôi làm việc ở bệnh viện.", True), B3(T3, "Dạo này bố tôi rất rảnh.", False), B3(T4, "Hôm qua ông Long đi sân bay.", True), B3(T4, "Hôm nay ông Long đi làm.", False)]
q += [B4("Anh làm nghề gì?", ["Tôi làm kế toán ở ngân hàng.", "Tôi đi làm lúc 8 giờ.", "Công ty tôi ở Quận 1.", "Tôi làm việc năm ngày một tuần."]),
      B4("Chị làm việc ở đâu?", ["Tôi làm việc ở công ty máy tính.", "Tôi là kỹ sư.", "Từ 8 giờ đến 5 giờ.", "Khoảng 200 nhân viên."]),
      B4("Anh dạy mấy ngày một tuần?", ["Năm ngày một tuần.", "Ở trường ILA.", "Từ 9 giờ sáng.", "Khoảng 8 giáo viên."]),
      B4("Công ty chị có bao nhiêu nhân viên?", ["Khoảng 50 người.", "Ở Quận 2.", "Lúc 8 giờ sáng.", "Công việc hơi vất vả."]),
      B4("Dạo này anh thế nào?", ["Dạo này tôi rất bận.", "Tôi là tài xế.", "Ở cơ quan.", "Từ 2 giờ chiều."]),
      B4("Hôm qua anh có đi học không?", ["Có, nhưng tôi vào nhầm phòng.", "Tôi là bác sĩ.", "Hơn 100 người.", "Lúc 5 giờ chiều."]),
      B4("Anh vào phòng số mấy?", ["Phòng số 308.", "Lúc 2 giờ chiều.", "Ở ngân hàng.", "Năm ngày."]),
      B4("Cô ấy cũng là kỹ sư, phải không?", ["Không, cô ấy là thư ký.", "Từ 9 giờ sáng.", "Ở Quận 2.", "Khoảng 20 người."]),
      B4("Các anh sắp đi ăn trưa chưa?", ["Sắp rồi. Chị đi với chúng tôi không?", "Tôi là kế toán.", "Công ty tôi có 50 nhân viên.", "Từ 8 giờ đến 5 giờ."]),
      B4("Công việc của anh thế nào?", ["Hơi vất vả nhưng rất thú vị.", "Tôi làm ở bệnh viện.", "Lúc 7 giờ sáng.", "Khoảng 100 người."])]
q += [C1("Tôi làm kế toán ở ngân hàng.", ["ở", "tôi", "ngân hàng", "làm", "kế toán"]), C1("Tôi dạy năm ngày một tuần.", ["năm ngày", "tôi", "một tuần", "dạy"]),
      C1("Tôi làm việc từ 8 giờ đến 5 giờ.", ["từ", "tôi", "8 giờ", "đến", "5 giờ", "làm việc"]), C1("Xe sắp đến chưa anh?", ["sắp", "xe", "chưa", "đến", "anh"]),
      C1("Dạo này tôi rất bận.", ["rất", "dạo này", "bận", "tôi"])]
q += [C2("Ngân hàng của anh có mấy nhân viên?", 5, "Ngân hàng của anh có bao nhiêu nhân viên?", "은행에 직원이 몇 명이에요? (열을 넘을 수 있으면 bao nhiêu)"),
      C2("Tôi đang là kỹ sư ở công ty máy tính.", 1, "Tôi là kỹ sư ở công ty máy tính.", "저는 컴퓨터 회사 엔지니어예요. (là 앞에 đang 을 안 쓴다)"),
      C2("Anh ấy sắp đi ăn trưa lúc 12 giờ.", 2, "Anh ấy sẽ đi ăn trưa lúc 12 giờ.", "그는 12시에 점심을 먹으러 갈 거예요. (sắp 에는 시각을 붙이지 않는다)"),
      C2("Hôm nay tôi mệt rất.", 4, "Hôm nay tôi rất mệt.", "오늘 저는 아주 피곤해요. (rất 는 형용사 앞)"),
      C2("Anh ấy cũng làm kế toán, không phải?", 6, "Anh ấy cũng làm kế toán, phải không?", "그도 회계사죠? (phải không 차례)")]
q.append(C3("나의 직업과 일 — 무슨 일을 하는지, 어디에서, 몇 시부터 몇 시까지, 일주일에 며칠, 요즘 어떤지 (10문장)",
            ["Tôi là nhân viên công ty.", "Tôi làm việc ở một công ty máy tính ở Quận 1.", "Công ty tôi có khoảng 200 nhân viên.", "Tôi làm việc từ 8 giờ sáng đến 5 giờ chiều.", "Tôi đi làm năm ngày một tuần.",
             "Buổi trưa tôi ăn trưa ở căng tin công ty.", "Dạo này công việc của tôi hơi bận.", "Buổi tối tôi học tiếng Việt khoảng một tiếng.", "Thứ bảy tôi thường nghỉ ở nhà.", "Công việc vất vả nhưng rất thú vị."]))
q += D1(["kế toán", "luật sư", "tài xế", "thư ký", "nhân viên", "văn phòng", "cơ quan", "vất vả", "dạo này", "nghỉ hưu"],
        ["Công ty tôi có khoảng 200 nhân viên.", "Chị ấy là thư ký ở văn phòng.", "Tôi làm việc năm ngày một tuần.", "Dạo này công việc của tôi bận lắm.", "Các anh sắp đi ăn trưa chưa?"])
q += [D2("nhân viên ngân hàng", "그림을 보고 말해 보세요 — 이 사람의 직업은 무엇이고, 어디에서 일하나요? 요즘 어떤가요? (3문장)",
         ["Chị ấy là nhân viên ngân hàng.", "Chị ấy làm việc ở ngân hàng ở Quận 1.", "Dạo này chị ấy rất bận."], ["그녀는 은행 직원이에요.", "그녀는 1군에 있는 은행에서 일해요.", "요즘 그녀는 아주 바빠요."]),
      D2("giáo viên người Việt Nam", "그림을 보고 말해 보세요 — 이 사람은 무슨 일을 하고, 어디에서, 일주일에 며칠 일하나요? (3문장)",
         ["Cô ấy là giáo viên.", "Cô ấy dạy tiếng Việt ở trường đại học.", "Cô ấy dạy năm ngày một tuần."], ["그녀는 선생님이에요.", "그녀는 대학교에서 베트남어를 가르쳐요.", "그녀는 일주일에 5일 가르쳐요."])]
q += [D3("새 동료가 '무슨 일 해요? 어디에서 일해요?'라고 묻습니다. 직업·일터·일하는 시간을 말해 보세요. (3문장)",
         ["Tôi là kỹ sư.", "Tôi làm việc ở công ty máy tính.", "Tôi làm việc từ tám giờ sáng đến năm giờ chiều."], ["저는 엔지니어예요.", "저는 컴퓨터 회사에서 일해요.", "저는 아침 8시부터 오후 5시까지 일해요."]),
      D3("친구가 '요즘 바빠요?'라고 묻습니다. 요즘 생활을 말해 보세요 — 오전·오후에 무엇을 하는지, 바쁜지. (3문장)",
         ["Dạo này tôi bận lắm.", "Buổi sáng tôi đi học tiếng Việt.", "Buổi chiều tôi đi làm ở ngân hàng."], ["요즘 저는 아주 바빠요.", "오전에는 베트남어를 배우러 가요.", "오후에는 은행에 일하러 가요."])]
AUD = build(1, "모의고사 1", q)
