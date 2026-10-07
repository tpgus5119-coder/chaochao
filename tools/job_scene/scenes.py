# -*- coding: utf-8 -*-
"""직무 8갈래 343낱말을 '길이 띠'(글자 수로 자른 세트, 2026-09-09)가 아니라 **일의 장면**으로 다시 묶는다 (2026-10-07, 대표님 "현업을 참고 — 베스트셀러·스테디셀러 교재와 어플, 근거를 가지고").
근거:
  - 갈래 차례(공통 셋 → 업종 다섯)와 공통 갈래 안 장면 차례는 비즈니스 베트남어 책 둘의 목차를 따름:
    · 하루 10분 말하기 습관 비즈니스 베트남어(예스24 76661985): PART1 사무실(첫인사·휴가 신청·사무실 일상·제안/부탁/거절·업무 지시) → 전화 → 회의(일정·본론·마무리) → 프레젠테이션 → 출장
    · 비즈니스 베트남어회화 & 이메일 표현사전(길벗 BN002576): 면접(인사·경력) → 사무 업무 → 전화 → 이메일·문서(보고서·기획서·공문) → 회의(시작·진행·토론·종료) → 프레젠테이션 → 계약·협상 → 출장
    · GO! 독학 베트남어 실전편(시원스쿨, 예스24 94381481) 과 제목: 새 직원 → 회의 시간 → 안 진행 → 자료 정리 → 야근 → 출장 → 공장 직원 수 → 승진 축하 → 주문 할인
    → 업무 지시·확인 → 회의·보고(회의 → 발표·숫자 → 문서·결재 → 협조) → 인사(채용·면접 → 계약·급여 → 출근·휴가 → 평가·상벌)
  - 업종 갈래 안은 책에 없어(비즈니스 책은 공장 현장을 다루지 않음) 낱말 뜻·예문으로 '이름(부품·기계·재료) → 공정 → 품질·불량 → 안전' 차례로 묶음(클로드 판단, 네 업종 같은 틀).
낱말은 하나도 빼지 않고 자리만 옮긴다(겹친 철자 pa-lét 만 pa lét 하나로).
"""
SCENES = [
 ("지시하고 확인하기", [
   ("일 시키기", ["yêu cầu", "chỉ đạo", "giao việc", "phân công", "bắt đầu", "gấp", "hạn", "mục tiêu ngày", "đạt kế hoạch", "kế hoạch sản xuất", "lệnh sản xuất", "thao tác chuẩn"]),
   ("진행 확인", ["kiểm tra", "xác nhận", "tiến độ", "hoàn thành", "xong", "chậm trễ", "làm lại"]),
   ("문제 해결과 개선", ["vấn đề", "nguyên nhân", "sai", "giải quyết", "sửa", "cải tiến", "lãng phí"]),
   ("라인 가동과 교대", ["khởi động chuyền", "dừng chuyền", "chạy thử", "bố trí nhân lực", "giao ca", "điểm danh", "tăng ca", "ca đêm", "thiếu người", "người thay ca"]),
 ]),
 ("회의와 보고", [
   ("회의 열기와 진행", ["cuộc họp", "họp", "hội nghị", "hội thảo", "thảo luận", "bàn luận", "bàn bạc", "đề xuất", "phát biểu", "quyết định", "kết luận", "biên bản họp", "kết thúc cuộc họp", "nghỉ họp", "tạm hoãn"]),
   ("발표와 숫자", ["báo cáo", "trình bày", "tóm tắt", "chi tiết", "kết quả", "số liệu", "kế hoạch", "mục tiêu", "doanh thu", "chi phí", "lợi nhuận", "ngân sách", "thua lỗ", "quyết toán"]),
   ("문서와 결재", ["văn bản", "báo cáo tháng", "nộp báo cáo", "trình ký", "phê duyệt", "từ chối duyệt", "bản gốc", "bản sao", "lưu hồ sơ", "báo giá", "chuẩn bị tài liệu", "tạm ứng", "chấm dứt hợp đồng"]),
   ("협조 부탁과 공유", ["gửi", "nhận", "vui lòng gửi tệp", "vui lòng xem xét", "vui lòng sửa", "người phụ trách", "xử lý trước", "phối hợp", "chia sẻ thông tin", "đề xuất cải tiến"]),
 ]),
 ("인사·평가·채용", [
   ("채용과 면접", ["tuyển dụng", "phỏng vấn", "hồ sơ", "bản lý lịch", "sơ yếu lý lịch", "kinh nghiệm", "năng lực", "thuê người", "tìm việc", "nhân viên", "lao động", "thử việc", "đào tạo"]),
   ("계약·급여·보험", ["hợp đồng lao động", "lương", "tiền công", "bảng lương", "lương cơ bản", "phụ cấp", "bảo hiểm xã hội", "công đoàn"]),
   ("출근과 휴가", ["nghỉ phép", "nghỉ phép năm", "nghỉ ốm", "đơn xin nghỉ", "đi muộn", "tự ý nghỉ", "bàn giao", "chuyển công tác"]),
   ("평가·상벌·퇴사", ["đánh giá", "đánh giá năng lực", "thưởng", "khen thưởng", "thăng chức", "đề bạt", "phạt", "kỷ luật", "sa thải", "nghỉ việc", "đình công"]),
 ]),
 ("전자·전기", [
   ("부품 이름", ["linh kiện", "linh kiện điện tử", "bảng mạch", "bo mạch", "tụ điện", "điện trở", "cầu chì", "đầu nối", "dây cáp", "cảm biến", "màn hình"]),
   ("조립 라인", ["dây chuyền", "băng tải", "lắp ráp", "hàn", "hàn thiếc", "kem hàn", "mã vạch", "công ty điện tử Samsung"]),
   ("품질과 불량", ["chất lượng", "lỗi", "tỷ lệ lỗi", "lỗi hàn", "thiếu linh kiện", "gắn ngược", "kiểm tra chức năng"]),
   ("클린룸과 정전기", ["tĩnh điện", "vòng tay tĩnh điện", "phòng sạch", "áo phòng sạch", "nhiệt độ", "độ ẩm"]),
   ("전기", ["nguồn điện", "dây điện", "cầu dao", "điện áp", "dòng điện", "máy phát điện", "điện giật"]),
 ]),
 ("섬유·봉제·신발", [
   ("재료와 도구", ["vải", "chỉ", "da", "da thật", "màu", "kim", "máy may", "dệt", "nhà máy dệt"]),
   ("재단과 봉제", ["cắt", "cắt da", "may", "đường may", "kích cỡ", "nhãn mác", "đóng gói", "hàng"]),
   ("신발 부위", ["giày", "giày da", "mũ giày", "đế giày", "đế giữa", "lót giày", "dây giày", "gót giày", "phom giày", "cỡ giày", "hộp giày"]),
   ("신발 공정과 불량", ["ép đế", "dán đế", "bôi keo", "gò giày", "bong keo", "giày lỗi"]),
 ]),
 ("건설·부동산", [
   ("사업과 허가", ["dự án", "công trình", "chủ đầu tư", "nhà thầu", "giấy phép", "dự toán", "bất động sản", "sổ hồng"]),
   ("설계·시공·검사", ["bản vẽ", "bản vẽ thiết kế", "xây dựng", "thi công", "công trường", "giám sát", "nghiệm thu", "móng", "mái", "chống thấm"]),
   ("자재와 장비", ["vật liệu", "xi măng", "sắt thép", "cốt thép", "bê tông", "gạch", "cát", "giàn giáo", "cẩu", "máy xúc"]),
   ("현장 안전", ["an toàn", "mũ bảo hộ", "dây an toàn", "lưới an toàn"]),
 ]),
 ("일반 제조·기계", [
   ("기계와 설비", ["máy móc", "thiết bị", "động cơ", "máy tiện", "máy phay", "máy khoan", "máy hàn", "bơm", "van"]),
   ("부품", ["phụ tùng", "vòng bi", "bánh răng", "bu lông", "đai ốc", "ốc vít", "đinh"]),
   ("재료", ["nhựa", "chất liệu", "nguyên liệu", "gỗ", "gỗ ép", "gỗ tự nhiên", "kim loại", "thép", "inox", "thủy tinh", "dầu"]),
   ("공구와 측정", ["búa", "tua vít", "cờ lê", "kìm", "cưa", "thước dây", "thước cặp", "thang"]),
   ("운전과 정비", ["vận hành", "tự động", "thủ công", "áp suất", "công suất", "bảo trì", "bảo trì định kỳ", "bôi trơn", "lắp đặt"]),
   ("고장과 검사", ["hỏng", "rung", "quá tải", "rò rỉ", "mất điện", "dừng máy", "kiểm tra cuối", "đạt chuẩn", "hàng không đạt"]),
   ("안전과 대피", ["kính bảo hộ", "giày bảo hộ", "bình chữa cháy", "hỏa hoạn", "sơ tán", "lối thoát hiểm", "cấm vào"]),
 ]),
 ("유통·무역·물류", [
   ("수출입과 통관", ["xuất khẩu", "nhập khẩu", "ngoại thương", "hải quan", "thuế", "thuế đối ứng", "chứng từ", "vận đơn", "container", "cảng", "cảng biển"]),
   ("운송과 납품", ["vận chuyển", "giao hàng", "thời hạn giao hàng", "xuất hàng", "xe tải", "bốc hàng", "bốc xếp", "dỡ hàng", "trọng lượng", "niêm phong", "băng keo", "nhãn"]),
   ("창고와 재고", ["kho", "kho hàng", "nhập kho", "xuất kho", "tồn kho", "kiểm kê", "kiểm hàng", "xe nâng", "pa lét"]),
   ("주문과 거래처", ["đơn hàng", "đơn đặt hàng", "nhà cung cấp", "cung cấp", "khách hàng", "đại lý", "giá thành", "thị trường", "doanh số"]),
   ("도소매와 매장", ["bán buôn", "bán sỉ", "bán lẻ", "chợ đầu mối", "quầy thu ngân", "kệ hàng", "trưng bày", "đổi trả"]),
 ]),
]
DROP = {"pa-lét"}   # 'pa lét' 와 같은 낱말의 다른 철자(같은 파트 안 겹침 금지 규칙)
