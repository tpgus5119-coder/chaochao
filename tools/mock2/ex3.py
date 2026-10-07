# -*- coding: utf-8 -*-
# 모의고사 3 — 장소·주소·초대·구경 (교재 5·6과 중심). 2026-10-07 대표님 "단어만 4~7 위주로" 에 따라 가족 소개(2~3과) 중심이던 것을 다시 씀.
from common import *
PICS = ["nhà sách", "bưu điện", "bệnh viện", "quán cà phê", "sân bay"]
q = []
q += [TF("nhà sách", "Đây là nhà sách. Hôm nay nhà sách giảm giá 30%.", True), TF("bưu điện", "Đây là bệnh viện. Bác sĩ ở đây rất giỏi.", False),
      TF("quán cà phê", "Chúng tôi đang ngồi nói chuyện ở quán cà phê.", True), TF("sân bay", "Đây là Bưu điện Thành phố. Có nhiều khách đến tham quan.", False), TF("siêu thị", "Mẹ tôi đang mua sắm ở siêu thị gần nhà.", True)]
q += [PK(PICS, "Tôi đến đây để gửi thư cho bố mẹ.", 1), PK(PICS, "Tôi muốn mua sách lịch sử Việt Nam.", 0), PK(PICS, "Bác sĩ làm việc ở đây. Hôm nay có nhiều người đến.", 2),
      PK(PICS, "Chúng ta gặp nhau ở đây uống cà phê nhé.", 3), PK(PICS, "Máy bay sắp cất cánh rồi.", 4)]
q += [A3("Bây giờ họ đi đâu?", "Bây giờ chúng ta sẽ đi mua sách ở nhà sách FAHASA.", ["nhà sách", "bưu điện", "siêu thị"]),
      A3("Nhà sách FAHASA số mấy?", "Nhà sách FAHASA ở số 40 đường Nguyễn Huệ.", ["số 40", "số 14", "số 4"]),
      A3("Hôm nay nhà sách giảm giá bao nhiêu?", "Hôm nay nhà sách giảm giá 30%.", ["30%", "13%", "3%"]),
      A3("Sao David biết nhà sách giảm giá?", "Vì anh Brian nói với tôi. Hôm qua anh ấy đã mua sách ở đó.", ["vì anh Brian nói", "vì xem tivi", "vì đọc báo"]),
      A3("Dorothy đi đâu?", "Trường Đại học Khoa học Xã hội và Nhân văn, số 10, Quận 1.", ["trường Nhân văn", "bệnh viện", "ngân hàng"]),
      A3("Nhà hàng đó ở đâu?", "Tôi biết một nhà hàng ở Quận 1. Món ăn ngon lắm, đặc biệt bia tươi rất ngon.", ["Quận 1", "Quận 2", "Quận 7"]),
      A3("Tối nay Lee mời ai đi uống bia?", "Tối nay tôi mời anh Min và anh Hiroki đến đó uống bia.", ["anh Min và anh Hiroki", "chị Vân", "cô Loan"]),
      A3("Hiroki đã đi tham quan ở đâu?", "Ở Thành phố Hồ Chí Minh tôi đã đi tham quan Nhà thờ Đức Bà và Bảo tàng Lịch sử.", ["Nhà thờ Đức Bà", "sân bay", "siêu thị"]),
      A3("Ngày mai Vân rảnh từ mấy giờ?", "Ngày mai tôi rảnh từ 2 giờ chiều.", ["từ 2 giờ chiều", "từ 9 giờ sáng", "từ 7 giờ tối"]),
      A3("Từ đây đến sân bay mất bao lâu?", "Từ đây đến sân bay mất khoảng 30 phút bằng tắc xi.", ["khoảng 30 phút", "khoảng 3 phút", "khoảng 3 tiếng"])]
q += [A4("Bây giờ chúng ta đi đâu?", ["Chúng ta đi mua sách.", "Lúc 8 giờ sáng.", "Khoảng 20 nhân viên."]),
      A4("Nhà sách ở đâu?", ["Ở số 40 đường Nguyễn Huệ.", "Giảm giá 30%.", "Bằng tắc xi."]),
      A4("Anh muốn mua sách gì?", ["Sách lịch sử Việt Nam.", "Ở nhà sách FAHASA.", "Hôm qua."]),
      A4("Gần Đài Truyền hình Thành phố, phải không cô?", ["Đúng rồi, anh.", "Khoảng 30 phút.", "Tôi muốn mua sách."]),
      A4("Anh có biết nhà hàng nào ngon không?", ["Có, tôi biết một nhà hàng ở Quận 1.", "Lúc 7 giờ tối.", "Tôi là tài xế."]),
      A4("Ngày mai chị có rảnh không?", ["Có, tôi rảnh từ 2 giờ chiều.", "Ở bảo tàng.", "Giảm giá 20%."]),
      A4("Anh có biết chỗ đó địa chỉ số mấy không?", ["Số 125, Quận 1.", "Rất đẹp.", "Từ 9 giờ sáng."]),
      A4("Tối nay chúng ta ăn ở đâu?", ["Ở quán ăn gần trường nhé.", "Khoảng 40 phút.", "Vì tôi bận."]),
      A4("Xe sắp đến chưa anh?", ["Sắp đến rồi, cô.", "Ở Quận 7.", "Tôi đi bằng xe buýt."]),
      A4("Cô nói tiếng Việt giỏi quá!", ["Cám ơn anh.", "Không, tôi đi tắc xi.", "Ở gần đây."])]
bank = ["sẽ", "quá", "à", "tại sao", "chúng ta"]
q += [B1("Bây giờ ____ đi đâu?", bank, 4), B1("Chúng ta ____ đi mua sách.", bank, 0), B1("Cô nói tiếng Việt giỏi ____!", bank, 1),
      B1("Hôm nay nhà sách giảm giá 30% ____?", bank, 2), B1("____ hôm qua anh không đến lớp? — Vì tôi bận.", bank, 3)]
q += [B2("Hôm nay nhà sách FAHASA ở số 40 đường Nguyễn Huệ giảm giá 30%. David và Vân sẽ đi mua sách lịch sử Việt Nam ở đó.", "Họ sẽ mua gì?", ["sách lịch sử", "bia tươi", "cà phê"]),
      B2("Dorothy đi tắc xi đến trường Nhân văn. Trường ở số 10 đường Đinh Tiên Hoàng, Quận 1, gần Đài Truyền hình Thành phố.", "Trường Nhân văn ở gần đâu?", ["Đài Truyền hình Thành phố", "sân bay", "Nhà thờ Đức Bà"]),
      B2("Tối nay Lee mời anh Min đi uống bia ở một nhà hàng Việt Nam ở Quận 1. Món ăn ở đó ngon lắm, đặc biệt bia tươi rất ngon.", "Tối nay họ đi đâu?", ["đi uống bia", "đi mua sách", "đi tham quan bảo tàng"]),
      B2("Hiroki đã đi tham quan Nhà thờ Đức Bà, Bưu điện Thành phố và Bảo tàng Lịch sử. Ngày mai anh ấy muốn mời Vân đi Bảo tàng Áo dài.", "Ngày mai Hiroki muốn đi đâu?", ["Bảo tàng Áo dài", "Bưu điện Thành phố", "Nhà thờ Đức Bà"]),
      B2("Nhà tôi ở Quận 7. Từ nhà tôi đến trung tâm thành phố mất khoảng 40 phút bằng xe buýt. Đi tắc xi mất 20 phút nhưng hơi mắc.", "Đi tắc xi mất bao lâu?", ["20 phút", "40 phút", "4 phút"])]
T1 = "Nhà sách FAHASA ở số 40 đường Nguyễn Huệ, Quận 1. Hôm nay nhà sách giảm giá 30%. David muốn mua sách lịch sử Việt Nam."
T2 = "Tôi biết một nhà hàng Việt Nam ở Quận 1. Món ăn ở đó ngon lắm. Đặc biệt, bia tươi rất ngon. Tối nay tôi mời bạn tôi đến đó."
T3 = "Hôm qua Hiroki đã đi tham quan Bảo tàng Lịch sử. Bảo tàng ở gần trường Nhân văn. Anh ấy thấy rất thú vị."
T4 = "Ngày mai Vân rảnh từ 2 giờ chiều. Hiroki mời Vân đi Bảo tàng Áo dài. Họ sẽ hỏi địa chỉ."
q += [B3(T1, "Nhà sách FAHASA ở Quận 1.", True), B3(T1, "Hôm nay nhà sách giảm giá 13%.", False), B3(T1, "David muốn mua sách lịch sử.", True),
      B3(T2, "Nhà hàng đó ở Quận 7.", False), B3(T2, "Bia tươi ở đó rất ngon.", True), B3(T2, "Tối nay tôi đi nhà hàng một mình.", False),
      B3(T3, "Bảo tàng Lịch sử ở gần trường Nhân văn.", True), B3(T3, "Hiroki thấy bảo tàng chán.", False),
      B3(T4, "Ngày mai Vân rảnh buổi sáng.", False), B3(T4, "Hiroki mời Vân đi bảo tàng.", True)]
q += [B4("Bây giờ chúng ta đi đâu?", ["Chúng ta sẽ đi mua sách.", "Tôi đi bằng tắc xi.", "Khoảng 30 phút.", "Giảm giá 30%."]),
      B4("Anh biết địa chỉ nhà sách không đấy?", ["Biết. Số 40 đường Nguyễn Huệ.", "Hôm qua tôi đã mua sách.", "Tôi muốn mua sách lịch sử.", "Rất rẻ."]),
      B4("Sao anh biết?", ["Vì anh Brian nói với tôi.", "Lúc 9 giờ sáng.", "Ở Quận 1.", "Tôi mua sách tiếng Việt."]),
      B4("Đi đâu, cô?", ["Trường Nhân văn, Quận 1, anh.", "Cám ơn anh.", "Rất ngon.", "Tối nay."]),
      B4("Cô nói tiếng Việt giỏi quá!", ["Cám ơn anh.", "Đúng rồi, anh.", "Số 10, Quận 1.", "Khoảng 20 phút."]),
      B4("Anh có biết nhà hàng nào ngon không?", ["Tôi biết một nhà hàng ở Quận 1. Bia tươi rất ngon.", "Tôi là tài xế tắc xi.", "Nhà sách giảm giá 30%.", "Từ 2 giờ chiều."]),
      B4("Ngày mai Vân có rảnh không?", ["Tôi rảnh từ 2 giờ chiều. Có việc gì không, anh?", "Tôi đã đi tham quan bảo tàng.", "Bảo tàng ở gần trường.", "Bằng xe buýt."]),
      B4("Anh có biết chỗ đó địa chỉ số mấy không?", ["Địa chỉ à? Số 125, Quận 1.", "Rất thú vị.", "Tôi mời Vân đi với tôi.", "Lúc 2 giờ."]),
      B4("Xe sắp đến chưa anh?", ["Sắp đến rồi, cô.", "Tôi đi bộ.", "Nhà hàng ở Quận 1.", "Khoảng 100 người."]),
      B4("Tối nay tôi mời anh đi uống bia.", ["Tốt quá! Không say không về.", "Nhà sách ở đâu?", "Số 40.", "Từ đây đến đó 30 phút."])]
q += [C1("Bây giờ chúng ta đi đâu?", ["đi đâu", "bây giờ", "chúng ta"]), C1("Hôm nay nhà sách giảm giá 30%.", ["giảm giá", "hôm nay", "30%", "nhà sách"]),
      C1("Tôi muốn mua sách lịch sử Việt Nam.", ["muốn", "tôi", "mua", "sách lịch sử", "Việt Nam"]), C1("Cô nói tiếng Việt giỏi quá!", ["giỏi quá", "cô", "nói", "tiếng Việt"]),
      C1("Anh sắp về chưa?", ["sắp", "anh", "về", "chưa"])]
q += [C2("Nhà sách ở đâu số 40 đường Nguyễn Huệ.", 2, "Nhà sách ở số 40 đường Nguyễn Huệ.", "서점은 응우옌후에 거리 40번지에 있어요. (ở đâu 는 물을 때만)"),
      C2("Hôm qua anh ấy sẽ mua sách ở đó.", 3, "Hôm qua anh ấy đã mua sách ở đó.", "어제 그는 거기서 책을 샀어요. (지난 일은 đã)"),
      C2("Anh biết địa chỉ nhà sách không có?", 7, "Anh có biết địa chỉ nhà sách không?", "서점 주소를 아세요? (có … không 차례)"),
      C2("Món ăn ở đó rất ngon lắm.", 4, "Món ăn ở đó ngon lắm.", "거기 음식은 아주 맛있어요. (rất 와 lắm 을 함께 쓰지 않는다)"),
      C2("Tối nay tôi mời anh đến đó uống bia tối nay.", 9, "Tối nay tôi mời anh đến đó uống bia.", "오늘 밤 거기서 맥주 한잔 살게요. (tối nay 가 두 번)")]
q.append(C3("베트남에서 가 본 곳 — 어디를 구경했는지(성당·우체국·박물관), 누구와, 무엇으로, 어땠는지, 다음에 가고 싶은 곳 (10문장)",
            ["Tuần trước tôi đã đi tham quan Nhà thờ Đức Bà.", "Nhà thờ Đức Bà ở Quận 1, gần Bưu điện Thành phố.", "Tôi đi với bạn cùng lớp của tôi.", "Chúng tôi đi bằng tắc xi, mất khoảng 20 phút.", "Sau đó chúng tôi đi Bảo tàng Lịch sử.",
             "Bảo tàng ở gần trường Nhân văn.", "Bảo tàng rất thú vị.", "Buổi tối chúng tôi ăn tối ở một quán ăn ở phố đi bộ.", "Món ăn ở đó ngon lắm.", "Tuần sau tôi muốn đi Bảo tàng Áo dài."]))
q += D1(["địa chỉ", "giảm giá", "nhà sách", "tắc xi", "bảo tàng", "tham quan", "rảnh", "mời", "đặc biệt", "thân thiện"],
        ["Bây giờ chúng ta đi đâu?", "Hôm nay nhà sách giảm giá 30%.", "Cô nói tiếng Việt giỏi quá!", "Ngày mai anh có rảnh không?", "Anh sắp về chưa?"])
q += [D2("quán cà phê", "그림을 보고 말해 보세요 — 여기는 어디이고, 어디 근처에 있고, 무엇이 맛있나요? (3문장)",
         ["Đây là quán cà phê.", "Quán ở gần trường Nhân văn.", "Cà phê ở đây ngon lắm."], ["여기는 카페예요.", "카페는 인문대 근처에 있어요.", "여기 커피는 아주 맛있어요."]),
      D2("sân bay", "그림을 보고 말해 보세요 — 여기는 어디이고, 여기서 시내까지 얼마나 걸리며, 무엇으로 가나요? (3문장)",
         ["Đây là sân bay.", "Từ sân bay đến trung tâm thành phố mất khoảng ba mươi phút.", "Tôi đi bằng tắc xi."], ["여기는 공항이에요.", "공항에서 시내까지 30분쯤 걸려요.", "저는 택시로 가요."])]
q += [D3("택시를 탔습니다. 기사가 '어디 가세요?'라고 묻습니다. 목적지·번지·어디 근처인지 말해 보세요. (3문장)",
         ["Trường Nhân văn, anh.", "Số 10 đường Đinh Tiên Hoàng, Quận 1.", "Gần Đài Truyền hình Thành phố."], ["인문대요, 기사님.", "딘띠엔호앙 거리 10번지, 1군이요.", "시 방송국 근처예요."]),
      D3("친구를 식당에 초대해 보세요 — 어디에 있는지, 무엇이 맛있는지, 몇 시에 만날지. (3문장)",
         ["Tối nay tôi mời bạn đi ăn ở một nhà hàng ở Quận 1.", "Món ăn ở đó ngon lắm, đặc biệt là bia tươi.", "Chúng ta gặp nhau lúc bảy giờ tối nhé."], ["오늘 저녁 1군에 있는 식당에서 제가 살게요.", "거기 음식 아주 맛있어요, 특히 생맥주요.", "저녁 7시에 만나요."])]
AUD = build(3, "모의고사 3", q)
