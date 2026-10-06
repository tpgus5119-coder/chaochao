# -*- coding: utf-8 -*-
from common import *
PICS = ["quán cà phê", "nhà sách", "sân bay", "siêu thị", "bệnh viện"]
q = []
q += [TF("bưu điện", "Đây là bưu điện. Tôi đến đây để gửi thư.", True), TF("ngân hàng", "Đây là nhà sách. Ở đây có nhiều sách tiếng Việt.", False),
      TF("quán cà phê", "Họ đang uống cà phê ở quán cà phê.", True), TF("đi học", "Em ấy đang đi ngủ.", False), TF("sân bay", "Đây là sân bay. Máy bay sắp bay.", True)]
q += [PK(PICS, "Cuối tuần tôi thường đi nhà sách mua sách.", 1), PK(PICS, "Bố tôi là bác sĩ. Ông ấy làm việc ở đây từ 8 giờ sáng.", 4), PK(PICS, "Chúng ta đi uống cà phê nhé? Quán này gần công ty.", 0),
      PK(PICS, "Mẹ tôi đi siêu thị mua cà phê và sữa.", 3), PK(PICS, "Tuần sau tôi đi Hà Nội. Tôi sẽ đi bằng máy bay.", 2)]
q += [A3("Nhà sách ở đâu?", "Nhà sách FAHASA ở đường Nguyễn Huệ, Quận 1.", ["đường Nguyễn Huệ", "Quận 2", "Quận 7"]),
      A3("Từ nhà Lan đến công ty mất bao lâu?", "Từ nhà tôi đến công ty mất khoảng 30 phút.", ["khoảng 30 phút", "khoảng 10 phút", "khoảng một tiếng"]),
      A3("Họ sẽ gặp nhau lúc mấy giờ?", "Chúng ta gặp nhau lúc 7 giờ tối ở quán cà phê nhé.", ["7 giờ tối", "7 giờ sáng", "2 giờ chiều"]),
      A3("Anh ấy đi Đà Nẵng bằng gì?", "Tuần sau tôi đi Đà Nẵng bằng máy bay.", ["máy bay", "xe buýt", "tắc xi"]),
      A3("Siêu thị mở cửa lúc mấy giờ?", "Siêu thị mở cửa lúc 8 giờ sáng.", ["8 giờ sáng", "9 giờ sáng", "7 giờ tối"]),
      A3("Cô ấy đang ở đâu?", "Bây giờ tôi đang ở bưu điện. Tôi gửi thư cho bố mẹ.", ["bưu điện", "ngân hàng", "nhà sách"]),
      A3("Nhà của Nam gần hay xa công ty?", "Nhà tôi gần công ty lắm. Tôi đi bộ đi làm.", ["gần", "xa", "rất xa"]),
      A3("Hôm nay nhà sách giảm giá bao nhiêu?", "Hôm nay nhà sách giảm giá 20%.", ["20%", "30%", "10%"]),
      A3("Chị ấy đi làm lúc mấy giờ?", "Tôi đi làm lúc 7 giờ rưỡi sáng.", ["7 giờ rưỡi", "7 giờ", "8 giờ rưỡi"]),
      A3("Cuối tuần họ đi đâu?", "Cuối tuần chúng tôi đi phố đi bộ. Ở đó rất đông và vui.", ["phố đi bộ", "siêu thị", "bệnh viện"])]
q += [A4("Nhà sách ở đâu?", ["Ở Quận 1.", "Lúc 8 giờ.", "Rất rẻ."]),
      A4("Từ đây đến sân bay mất bao lâu?", ["Khoảng 30 phút.", "Lúc 9 giờ.", "Bằng tắc xi."]),
      A4("Chị đi Hà Nội bằng gì?", ["Bằng máy bay.", "Tuần sau.", "Ở Hà Nội."]),
      A4("Mấy giờ chúng ta gặp nhau?", ["Lúc 6 giờ tối.", "Ở quán cà phê.", "Hai người."]),
      A4("Bây giờ anh đang ở đâu?", ["Tôi đang ở bưu điện.", "Tôi đi bằng xe buýt.", "Tôi là kỹ sư."]),
      A4("Siêu thị mở cửa lúc mấy giờ?", ["Lúc 8 giờ sáng.", "Ở gần nhà tôi.", "Rất đông."]),
      A4("Đi đến đó mất bao lâu?", ["Mất khoảng 20 phút.", "Đi bằng xe buýt.", "Lúc 3 giờ."]),
      A4("Cuối tuần anh thường đi đâu?", ["Tôi thường đi nhà sách.", "Tôi là sinh viên.", "Lúc 10 giờ."]),
      A4("Nhà chị có gần công ty không?", ["Không, nhà tôi hơi xa.", "Nhà tôi ở Quận 7.", "Tôi đi làm lúc 7 giờ."]),
      A4("Tối nay chúng ta ăn ở đâu?", ["Ở quán ăn gần công ty.", "Lúc 7 giờ tối.", "Ăn với bạn."])]
bank = ["lúc", "từ", "bằng", "ở đâu", "gần"]
q += [B1("Tôi đi làm ____ 8 giờ sáng.", bank, 0), B1("Tôi làm việc ____ 8 giờ đến 5 giờ.", bank, 1), B1("Tôi đi làm ____ xe buýt.", bank, 2),
      B1("Nhà sách FAHASA ____?", bank, 3), B1("Quán cà phê này ____ công ty tôi.", bank, 4)]
q += [B2("Nhà tôi ở Quận 7. Công ty tôi ở Quận 1. Từ nhà đến công ty mất khoảng 40 phút. Tôi thường đi làm bằng xe buýt.", "Từ nhà đến công ty mất bao lâu?", ["khoảng 40 phút", "khoảng 10 phút", "khoảng 4 tiếng"]),
      B2("Siêu thị gần nhà tôi mở cửa lúc 7 giờ sáng. Buổi tối ở đó rất đông. Tôi thường đi siêu thị vào buổi sáng.", "Tôi thường đi siêu thị lúc nào?", ["buổi sáng", "buổi tối", "buổi chiều"]),
      B2("Tuần sau Lan đi Hà Nội thăm ông bà. Lan sẽ đi bằng máy bay. Từ Thành phố Hồ Chí Minh đến Hà Nội mất khoảng hai tiếng.", "Lan đi Hà Nội bằng gì?", ["máy bay", "xe buýt", "tắc xi"]),
      B2("Quán cà phê này ở gần trường đại học. Cà phê ở đây ngon và rẻ. Sinh viên thường đến đây học và nói chuyện.", "Ai thường đến quán cà phê này?", ["sinh viên", "bác sĩ", "tài xế"]),
      B2("Hôm nay là thứ bảy. Nhà sách giảm giá 30%. Tôi và bạn tôi đi nhà sách mua sách tiếng Việt.", "Hôm nay nhà sách giảm giá bao nhiêu?", ["30%", "20%", "10%"])]
T1 = "Công ty tôi ở Quận 1, gần Đài Truyền hình Thành phố. Tôi làm việc từ 8 giờ sáng đến 5 giờ chiều. Buổi trưa tôi ăn trưa ở căng tin công ty."
T2 = "Nhà Mai ở xa công ty nên Mai đi làm bằng xe buýt. Từ nhà đến công ty mất một tiếng. Mai phải đi làm lúc 7 giờ."
T3 = "Cuối tuần tôi thường đi nhà sách ở đường Nguyễn Huệ. Sau đó tôi đi uống cà phê với bạn ở phố đi bộ."
T4 = "Bệnh viện ở gần nhà tôi. Bố tôi là bác sĩ ở đó. Ông ấy làm việc năm ngày một tuần, thứ bảy ông ấy ở nhà."
q += [B3(T1, "Công ty tôi ở Quận 1.", True), B3(T1, "Tôi làm việc đến 7 giờ tối.", False), B3(T1, "Buổi trưa tôi ăn ở căng tin công ty.", True),
      B3(T2, "Nhà Mai gần công ty.", False), B3(T2, "Mai đi làm bằng xe buýt.", True), B3(T2, "Từ nhà Mai đến công ty mất một tiếng.", True),
      B3(T3, "Cuối tuần tôi thường đi nhà sách.", True), B3(T3, "Tôi uống cà phê một mình.", False),
      B3(T4, "Bố tôi là bác sĩ.", True), B3(T4, "Thứ bảy bố tôi đi làm.", False)]
q += [B4("Nhà sách ở đâu?", ["Ở đường Nguyễn Huệ, Quận 1.", "Lúc 8 giờ sáng.", "Bằng xe buýt.", "Khoảng 30 phút."]),
      B4("Từ đây đến sân bay mất bao lâu?", ["Khoảng 30 phút.", "Lúc 7 giờ.", "Rất rẻ.", "Tôi đi bằng tắc xi."]),
      B4("Anh đi làm bằng gì?", ["Tôi đi làm bằng xe buýt.", "Tôi đi làm lúc 8 giờ.", "Công ty tôi ở Quận 1.", "Tôi là kỹ sư."]),
      B4("Chúng ta gặp nhau lúc mấy giờ?", ["Lúc 6 giờ tối nhé.", "Ở quán cà phê.", "Với bạn tôi.", "Hai người."]),
      B4("Siêu thị mở cửa lúc mấy giờ?", ["Lúc 8 giờ sáng.", "Ở gần nhà tôi.", "Siêu thị rất đông.", "Tôi đi siêu thị."]),
      B4("Đi đến đó mất bao lâu?", ["Mất khoảng 20 phút.", "Lúc 3 giờ chiều.", "Bằng xe buýt.", "Ở Quận 2."]),
      B4("Tối nay chúng ta ăn ở đâu?", ["Ở quán ăn gần công ty nhé.", "Lúc 7 giờ tối.", "Món ăn ngon lắm.", "Tôi không đói."]),
      B4("Nhà anh có gần công ty không?", ["Không, nhà tôi hơi xa.", "Nhà tôi có bốn người.", "Tôi đi làm lúc 7 giờ.", "Công ty tôi rất đông người."]),
      B4("Bây giờ chị đang ở đâu?", ["Tôi đang ở bưu điện.", "Tôi đi bằng xe buýt.", "Lúc 9 giờ.", "Tôi là thư ký."]),
      B4("Cuối tuần anh thường đi đâu?", ["Tôi thường đi phố đi bộ.", "Tôi là sinh viên.", "Lúc 10 giờ sáng.", "Tôi rất bận."])]
q += [C1("Nhà tôi gần công ty.", ["gần", "nhà", "công ty", "tôi"]), C1("Tôi đi Hà Nội bằng máy bay.", ["bằng", "tôi", "máy bay", "đi", "Hà Nội"]),
      C1("Siêu thị mở cửa lúc 8 giờ.", ["lúc", "siêu thị", "8 giờ", "mở cửa"]), C1("Từ nhà đến công ty mất 30 phút.", ["mất", "từ", "nhà", "đến", "công ty", "30 phút"]),
      C1("Chúng ta gặp nhau ở quán cà phê nhé.", ["nhé", "chúng ta", "gặp nhau", "ở", "quán cà phê"])]
q += [C2("Tôi đi làm bằng lúc 8 giờ.", 3, "Tôi đi làm lúc 8 giờ.", "저는 8시에 출근해요. (시각 앞은 lúc)"),
      C2("Nhà tôi ở gần đến công ty.", 4, "Nhà tôi ở gần công ty.", "우리 집은 회사 근처예요. (gần + 장소)"),
      C2("Tôi làm việc từ 8 giờ và 5 giờ.", 6, "Tôi làm việc từ 8 giờ đến 5 giờ.", "저는 8시부터 5시까지 일해요. (từ … đến)"),
      C2("Chúng ta đi bằng xe buýt đi.", 1, "Chúng ta đi bằng xe buýt.", "우리 버스로 가요. (đi 가 두 번)"),
      C2("Siêu thị ở đâu mở cửa lúc 8 giờ?", 2, "Siêu thị mở cửa lúc 8 giờ.", "슈퍼마켓은 8시에 문을 열어요. (ở đâu 는 물을 때만)")]
q.append(C3("우리 동네와 회사(학교) 가는 길 — 어디에 있는지, 무엇으로 가는지, 얼마나 걸리는지, 근처에 무엇이 있는지 (10문장)",
            ["Nhà tôi ở Quận 7, Thành phố Hồ Chí Minh.", "Công ty tôi ở Quận 1.", "Từ nhà đến công ty mất khoảng 40 phút.", "Tôi thường đi làm bằng xe buýt.", "Thỉnh thoảng tôi đi tắc xi.",
             "Gần nhà tôi có một siêu thị và một bưu điện.", "Siêu thị mở cửa lúc 7 giờ sáng.", "Gần công ty có nhiều quán cà phê.", "Buổi trưa tôi ăn ở quán ăn gần công ty.", "Cuối tuần tôi thường đi nhà sách ở đường Nguyễn Huệ."]))
q += D1(["nhà sách", "quán cà phê", "phố đi bộ", "máy bay", "tắc xi", "địa chỉ", "giảm giá", "bao lâu", "mở cửa", "gần"],
        ["Nhà sách ở đâu?", "Tôi đi làm bằng xe buýt.", "Từ nhà đến công ty mất 30 phút.", "Siêu thị mở cửa lúc 8 giờ sáng.", "Chúng ta gặp nhau lúc 6 giờ tối nhé."])
AUD = build(4, "모의고사 4", q)
