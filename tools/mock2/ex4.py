# -*- coding: utf-8 -*-
from common import *
q = []
q += [TF("xe buýt", "Anh ấy đi làm bằng xe buýt số 8.", True), TF("tắc xi", "Đây là xe buýt số 8.", False),
      TF("máy bay", "Tuần sau tôi đi Hà Nội bằng máy bay.", True), TF("đi bộ", "Nhà tôi gần công ty nên tôi đi bộ đi làm.", True), TF("sân bay", "Đây là ga Sài Gòn.", False)]
q += [PK(["ga", "cổng", "phố", "phường"], "Đây là ga. Tôi đi Đà Nẵng từ đây.", 0),
      PK(["cất cánh", "bay", "phút", "giờ"], "Máy bay sắp cất cánh.", 0),
      PK(["đi học", "đi chơi", "đi đến", "đi ra ngoài"], "Em ấy đi học lúc 7 giờ.", 0),
      PK(["siêu thị", "mở cửa", "trung tâm", "tiện lợi"], "Mẹ tôi đang mua sắm ở siêu thị.", 0),
      PK(["lớp", "táo", "bàn", "ghế"], "Các sinh viên đang học trong lớp.", 0)]
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
q += [A4("Siêu thị ở đâu?", ["Ở Quận 7.", "Lúc 8 giờ.", "Rất rẻ."]),
      A4("Từ đây đến sân bay mất bao lâu?", ["Khoảng 30 phút.", "Lúc 9 giờ.", "Bằng tắc xi."]),
      A4("Chị đi Hà Nội bằng gì?", ["Bằng máy bay.", "Tuần sau.", "Ở Hà Nội."]),
      A4("Mấy giờ chúng ta gặp nhau?", ["Lúc 6 giờ tối.", "Ở quán cà phê.", "Hai người."]),
      A4("Bây giờ anh đang ở đâu?", ["Tôi đang ở bưu điện.", "Tôi đi bằng xe buýt.", "Khoảng 10 phút."]),
      A4("Siêu thị mở cửa lúc mấy giờ?", ["Lúc 8 giờ sáng.", "Ở gần nhà tôi.", "Rất đông."]),
      A4("Đi đến đó mất bao lâu?", ["Mất khoảng 20 phút.", "Đi bằng xe buýt.", "Lúc 3 giờ."]),
      A4("Máy bay sắp cất cánh chưa?", ["Sắp rồi. Chúng ta đi ngay nhé.", "Ở sân bay.", "Bằng tắc xi."]),
      A4("Nhà chị có gần công ty không?", ["Không, nhà tôi hơi xa.", "Nhà tôi ở Quận 7.", "Tôi đi làm lúc 7 giờ."]),
      A4("Tối nay chúng ta đi đâu?", ["Đi quán ăn gần công ty.", "Lúc 7 giờ tối.", "Ăn với bạn."])]
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
      B4("Anh đi làm bằng gì?", ["Tôi đi làm bằng xe buýt.", "Tôi đi làm lúc 8 giờ.", "Công ty tôi ở Quận 1.", "Khoảng 40 phút."]),
      B4("Chúng ta gặp nhau lúc mấy giờ?", ["Lúc 6 giờ tối nhé.", "Ở quán cà phê.", "Với bạn tôi.", "Hai người."]),
      B4("Siêu thị mở cửa lúc mấy giờ?", ["Lúc 8 giờ sáng.", "Ở gần nhà tôi.", "Siêu thị rất đông.", "Tôi đi siêu thị."]),
      B4("Đi đến đó mất bao lâu?", ["Mất khoảng 20 phút.", "Lúc 3 giờ chiều.", "Bằng xe buýt.", "Ở Quận 2."]),
      B4("Tối nay chúng ta ăn ở đâu?", ["Ở quán ăn gần công ty nhé.", "Lúc 7 giờ tối.", "Món ăn ngon lắm.", "Tôi không đói."]),
      B4("Nhà anh có gần công ty không?", ["Không, nhà tôi hơi xa.", "Nhà tôi có bốn người.", "Tôi đi làm lúc 7 giờ.", "Công ty tôi rất đông người."]),
      B4("Bây giờ chị đang ở đâu?", ["Tôi đang ở bưu điện.", "Tôi đi bằng xe buýt.", "Lúc 9 giờ.", "Hơi xa."]),
      B4("Xe buýt sắp đến chưa?", ["Sắp đến rồi.", "Tôi đi làm lúc 7 giờ.", "Ở Quận 7.", "Khoảng 40 phút."])]
q += [C1("Nhà tôi gần công ty.", ["gần", "nhà", "công ty", "tôi"]), C1("Tôi đi Hà Nội bằng máy bay.", ["bằng", "tôi", "máy bay", "đi", "Hà Nội"]),
      C1("Siêu thị mở cửa lúc 8 giờ.", ["lúc", "siêu thị", "8 giờ", "mở cửa"]), C1("Từ nhà đến công ty mất 30 phút.", ["mất", "từ", "nhà", "đến", "công ty", "30 phút"]),
      C1("Chúng ta gặp nhau ở quán cà phê nhé.", ["nhé", "chúng ta", "gặp nhau", "ở", "quán cà phê"])]
q += [C2("Tôi đi học bằng lúc 8 giờ.", 3, "Tôi đi học lúc 8 giờ.", "저는 8시에 학교에 가요. (시각 앞은 lúc)"),
      C2("Nhà tôi ở gần đến công ty.", 4, "Nhà tôi ở gần công ty.", "우리 집은 회사 근처예요. (gần + 장소)"),
      C2("Tôi học từ 8 giờ và 11 giờ.", 5, "Tôi học từ 8 giờ đến 11 giờ.", "저는 8시부터 11시까지 공부해요. (từ … đến)"),
      C2("Chúng ta đi bằng xe buýt đi.", 1, "Chúng ta đi bằng xe buýt.", "우리 버스로 가요. (đi 가 두 번)"),
      C2("Nhà sách ở đâu mở cửa lúc 9 giờ?", 2, "Nhà sách mở cửa lúc 9 giờ.", "서점은 9시에 문을 열어요. (ở đâu 는 물을 때만)")]
q.append(C3("우리 동네와 회사(학교) 가는 길 — 어디에 있는지, 무엇으로 가는지, 얼마나 걸리는지, 근처에 무엇이 있는지 (10문장)",
            ["Nhà tôi ở Quận 7, Thành phố Hồ Chí Minh.", "Công ty tôi ở Quận 1.", "Từ nhà đến công ty mất khoảng 40 phút.", "Tôi thường đi làm bằng xe buýt.", "Thỉnh thoảng tôi đi tắc xi.",
             "Gần nhà tôi có một siêu thị và một bưu điện.", "Siêu thị mở cửa lúc 7 giờ sáng.", "Gần công ty có nhiều quán cà phê.", "Buổi trưa tôi ăn ở quán ăn gần công ty.", "Cuối tuần tôi thường đi nhà sách ở đường Nguyễn Huệ."]))
q += D1(["xe buýt", "máy bay", "sân bay", "ga", "mở cửa", "xa", "gần", "phút", "bao lâu", "đường"],
        ["Bưu điện ở đâu?", "Chị ấy đi học bằng xe buýt.", "Từ đây đến sân bay mất 30 phút.", "Bưu điện mở cửa lúc 7 giờ rưỡi.", "Chúng ta gặp nhau lúc 6 giờ tối nhé."])
q += [D2("xe", "그림을 보고 말해 보세요 — 이것은 누구의 차이고, 누가 무엇에 쓰며, 집에서 회사까지 얼마나 걸리나요? (3문장)",
         ["Đây là xe của bố tôi.", "Bố tôi lái xe đi làm mỗi ngày.", "Từ nhà đến công ty mất khoảng ba mươi phút."], ["이것은 아버지 차예요.", "아버지는 매일 차로 출근해요.", "집에서 회사까지 30분쯤 걸려요."]),
      D2("đường", "그림을 보고 말해 보세요 — 여기는 어느 거리이고, 무엇이 많으며, 주말엔 어떤가요? (3문장)",
         ["Đây là đường Nguyễn Huệ.", "Ở đây có nhiều quán cà phê.", "Cuối tuần có nhiều người đi dạo."], ["여기는 응우옌후에 거리예요.", "여기엔 카페가 많아요.", "주말엔 산책하는 사람이 많아요."])]
q += [D3("길에서 어떤 사람이 '은행이 어디예요?'라고 묻습니다. 위치를 말해 주세요 — 가까운지, 몇 번지인지, 얼마나 걸리는지. (3문장)",
         ["Ngân hàng ở gần đây.", "Ngân hàng ở số 10 đường Nguyễn Huệ.", "Từ đây đến ngân hàng mất năm phút."], ["은행은 이 근처에 있어요.", "은행은 응우옌후에 거리 10번지에 있어요.", "여기서 은행까지 5분 걸려요."]),
      D3("친구와 만날 약속을 정해 보세요 — 어디에서, 몇 시에, 그곳은 어디 근처인지. (3문장)",
         ["Chúng ta gặp nhau ở phố đi bộ nhé.", "Lúc sáu giờ tối.", "Phố đi bộ ở gần nhà sách."], ["우리 카페에서 만나요.", "저녁 6시에요.", "카페는 서점 근처에 있어요."])]
AUD = build(4, "모의고사 4", q)
