# -*- coding: utf-8 -*-
"""전자·반도체 낱말 — 삼성전자 베트남과 그 협력사가 한국인을 가장 많이 뽑는 자리다.
   (KIET 「베트남 내 한국다국적기업 현황」: 섬유산업과 전자산업이 두 축.
    01강 강의자료: 삼성 하나가 베트남 GDP의 13%, 전 세계 스마트폰의 절반 이상.)

   확인한 곳: vi.wikipedia 「Công nghệ dán bề mặt」(SMT) · speedmaint.com · cncvina.com.vn
     linh kiện 부품 · bo mạch 기판 · hàn thiếc 납땜 · khuôn 스텐실 · kiểm tra ngoại quan 외관검사
   카톡방 자료(삼성 SEV 라인)에서 나온 말과 어긋나지 않게 맞췄다."""

W = [
 # 부품과 기판
 ("linh kiện", "부품"), ("linh kiện điện tử", "전자부품"), ("bo mạch", "기판·PCB"),
 ("bảng mạch in", "인쇄회로기판"), ("mạch điện", "회로"), ("chân linh kiện", "부품 다리·리드"),
 ("tụ điện", "콘덴서"), ("điện trở", "저항"), ("cuộn cảm", "인덕터"), ("đi-ốt", "다이오드"),
 ("chip", "칩"), ("vi mạch", "집적회로"), ("chất bán dẫn", "반도체"), ("tấm wafer", "웨이퍼"),
 ("đầu nối", "커넥터"), ("dây cáp", "케이블"), ("dây dẫn", "전선"), ("cầu chì", "퓨즈"),
 ("cảm biến", "센서"), ("màn hình", "디스플레이"), ("pin", "배터리"), ("sạc", "충전하다"),
 # 공정
 ("dán bề mặt", "표면 실장(SMT)"), ("kem hàn", "솔더 페이스트"), ("hàn thiếc", "납땜하다"),
 ("hàn lại", "재납땜하다"), ("lò hàn", "리플로 오븐"), ("máy gắp linh kiện", "칩 마운터"),
 ("in kem hàn", "솔더 인쇄"), ("khuôn in", "스텐실"), ("gắn linh kiện", "부품 실장"),
 ("lắp ráp", "조립하다"), ("tháo ra", "분해하다"), ("bắt vít", "나사를 조이다"),
 ("vặn ốc", "볼트를 조이다"), ("dán keo", "접착하다"), ("ép nóng", "열압착하다"),
 ("cắt chân", "리드 절단"), ("làm sạch bo", "기판 세척"), ("phủ sơn bảo vệ", "코팅하다"),
 # 검사
 ("kiểm tra ngoại quan", "외관 검사"), ("kiểm tra chức năng", "기능 검사"),
 ("máy kiểm tra quang học", "광학 검사기(AOI)"), ("kiểm tra bằng tia X", "엑스레이 검사"),
 ("đo điện áp", "전압 측정"), ("đo dòng điện", "전류 측정"), ("máy đo", "측정기"),
 ("hiệu chuẩn", "교정하다"), ("mẫu chuẩn", "표준 견본"), ("mẫu lỗi", "불량 견본"),
 ("tỷ lệ lỗi", "불량률"), ("lỗi hàn", "납땜 불량"), ("lỗi tiếp xúc", "접촉 불량"),
 ("thiếu linh kiện", "부품 누락"), ("gắn ngược", "역삽입"), ("gắn lệch", "삐뚤게 실장"),
 ("bọt khí", "기포"), ("vết xước", "스크래치"), ("trầy xước", "긁힘"), ("bám bụi", "먼지 부착"),
 # 청정·정전기
 ("phòng sạch", "클린룸"), ("áo phòng sạch", "방진복"), ("mũ phòng sạch", "방진모"),
 ("găng tay chống tĩnh điện", "정전기 방지 장갑"), ("vòng tay tĩnh điện", "정전기 손목띠"),
 ("thảm tĩnh điện", "정전기 매트"), ("tĩnh điện", "정전기"), ("tiếp đất", "접지"),
 ("độ ẩm", "습도"), ("nhiệt độ phòng", "실온"), ("hạt bụi", "미세먼지 입자"),
 # 설비·시스템
 ("dây chuyền", "라인"), ("băng tải", "컨베이어"), ("khay linh kiện", "부품 트레이"),
 ("cuộn linh kiện", "부품 릴"), ("máy tự động", "자동 설비"), ("cánh tay robot", "로봇 팔"),
 ("chương trình máy", "설비 프로그램"), ("cài đặt thông số", "설정값 입력"),
 ("khởi động máy", "설비를 켜다"), ("dừng máy", "설비를 멈추다"), ("bảo trì", "예방보전"),
 ("thay linh kiện máy", "설비 부품 교체"), ("hỏng hóc", "고장"), ("sự cố", "설비 사고"),
 ("thời gian dừng máy", "비가동 시간"), ("năng suất máy", "설비 생산성"),
 # 표시·추적
 ("mã vạch", "바코드"), ("quét mã", "스캔하다"), ("tem nhãn", "라벨"), ("dán tem", "라벨 부착"),
 ("in nhãn", "라벨 인쇄"), ("số sê-ri", "일련번호"), ("truy xuất nguồn gốc", "이력 추적"),
 ("lô hàng", "로트"), ("mã lô", "로트 번호"), ("nhật ký sản xuất", "생산 일지"),
 # 완제품
 ("điện thoại di động", "휴대폰"), ("máy tính bảng", "태블릿"), ("tai nghe", "이어폰"),
 ("tủ lạnh", "냉장고"), ("máy giặt", "세탁기"), ("máy lạnh", "에어컨"), ("ti vi", "텔레비전"),
 ("vỏ máy", "케이스"), ("nắp lưng", "후면 커버"), ("phím bấm", "버튼"),
 ("đóng hộp", "박스 포장"), ("màng bọc", "보호 필름"), ("xốp chống sốc", "완충재"),
]

# ── 더 채운 것 (2026-08-30) — 전자가 한국인 취업의 두 축인데 낱말이 얇았다
W += [
 ("nhà máy điện tử","전자 공장"),("khu công nghệ cao","첨단산업단지"),("nhà cung cấp cấp 1","1차 협력사"),
 ("nhà cung cấp cấp 2","2차 협력사"),("bản vẽ kỹ thuật","기술 도면"),("thông số kỹ thuật","사양서"),
 ("mẫu thử","시제품"),("giai đoạn phát triển","개발 단계"),("chuyển giao sản xuất","양산 이관"),
 ("thay đổi thiết kế","설계 변경"),("phiên bản","버전"),("model mới","신모델"),
 ("dây chuyền tự động","자동화 라인"),("robot lắp ráp","조립 로봇"),("máy in kem hàn","솔더 프린터"),
 ("máy kiểm tra tự động","자동 검사기"),("đầu hút","노즐"),("khay tĩnh điện","정전기 트레이"),
 ("bàn thao tác","작업대"),("đèn báo","표시등"),("còi báo","경보음"),("nút dừng khẩn","비상 정지 버튼"),
 ("nguồn điện","전원"),("bảng điều khiển","제어반"),("màn hình cảm ứng","터치 패널"),
 ("cài đặt lại","재설정"),("khởi tạo","초기화"),("lưu dữ liệu","데이터 저장"),
 ("tải chương trình","프로그램 로딩"),("phiên bản phần mềm","소프트웨어 버전"),
 ("mối hàn","납땜부"),("thiếc thừa","솔더 볼"),("cầu thiếc","브리지 불량"),("hàn nguội","냉납"),
 ("bong mối hàn","납땜 박리"),("cong vênh bo","기판 휨"),("nứt bo","기판 균열"),
 ("chập mạch","단락"),("hở mạch","단선"),("rò điện","누전"),("quá nhiệt","과열"),
 ("thử nghiệm rơi","낙하 시험"),("thử nghiệm rung","진동 시험"),("thử nghiệm nhiệt","온도 시험"),
 ("thử độ bền","내구 시험"),("kiểm tra chống nước","방수 검사"),("kiểm tra âm thanh","음향 검사"),
 ("kiểm tra camera","카메라 검사"),("kiểm tra cảm ứng","터치 검사"),("kiểm tra sạc","충전 검사"),
 ("dán màng","필름 부착"),("bóc màng","필름 제거"),("lau bụi","먼지 닦기"),("khí nén thổi","에어 블로우"),
 ("keo tản nhiệt","방열 접착제"),("miếng tản nhiệt","방열 패드"),("băng dính hai mặt","양면 테이프"),
 ("ốc vít nhỏ","소형 나사"),("lực siết","조임 토크"),("máy vặn vít","전동 드라이버"),
 ("đóng gói cuối","최종 포장"),("dán tem bảo hành","보증 라벨 부착"),("kho thành phẩm","완제품 창고"),
]
