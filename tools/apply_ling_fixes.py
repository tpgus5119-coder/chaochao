#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""사전에 안 걸리던 206개를 전부 손으로 판정했다(대표님 지시: "성조 실수도 니가 고쳐줘").
   difflib 후보를 곧이곧대로 안 썼다 — 뜻(ko)을 기준으로 맞는지 하나하나 따졌다.
   예: "quả dưa hấu"(수박)를 difflib가 "quả dưa chuột"(오이)로 잘못 고치려 한 것,
       "cái gường"(침대)을 뜻(거울)에 맞게 "cái gương"으로 바로잡은 것 등.
   REMOVE는 ①통째로 딴 문장이 붙은 것 ②"바이올린"류 순수 외래어 음차.
   FIX는 뜻은 맞고 철자·띄어쓰기·성조만 바로잡은 것."""
import json, pathlib, unicodedata as ud

R = pathlib.Path.home() / "짜오짜오" / "베트남어-어플"

REMOVE = {
    "(cậu)", "(mình)", "Em Yu", "mix trộn ring nhẫn", "tỉ giá/ tỉ lệ",
    # "바이올린 같은 영어는 빼야지" — 순수 외래어 음차, 베트남 고유어가 아님
    "violon", "Violon", "mililít", "staycarion",
}

# 붙어버린 낱말(사전 자동 분리, 확실한 것만)
SPLIT_FIX = {
    "Balan": "Ba Lan", "Mùa HạMùa Hè": "mùa hạ mùa hè", "chỗngồi": "chỗ ngồi",
    "chợtình": "chợ tình", "chủyếu": "chủ yếu", "kỷlục": "kỷ lục",
    "mởcửa": "mở cửa", "mỹnghệ": "mỹ nghệ", "thịxã": "thị xã",
    "thủcông": "thủ công", "trởngại": "trở ngại", "vệsĩ": "vệ sĩ",
    "xửlý": "xử lý", "đô thịhóa": "đô thị hóa", "đồchơi": "đồ chơi",
}

# 뜻(ko)에 맞춰 손으로 바로잡은 것 — difflib 제안을 그대로 안 믿고 하나씩 확인함
LING_FIX = {
    "bộ complê": "bộ com-lê", "Bộ complê": "bộ com-lê",
    "quần sooc": "quần soóc", "Quần sooc": "quần soóc",
    "thêm... Nữa": "thêm nữa",
    "(kinh) đô": "kinh đô", "(lựa) chọn": "lựa chọn",
    "(màu) xanh da trời": "màu xanh da trời", "(màu) xanh lá cây": "màu xanh lá cây",
    "(một) vài": "một vài", "(tại) sao": "tại sao", "(tại)sao": "tại sao",
    "Chyên gia": "chuyên gia", "Dơn giản": "đơn giản",
    "Hàn Qu ố c": "Hàn Quốc", "N ướ c Hàn": "nước Hàn", "Ng ườ i Hàn": "người Hàn",
    "Tièn mặt": "tiền mặt", "Trung Qu ố c": "Trung Quốc",
    "aó măng tô": "áo măng tô", "bàn (bạc)": "bàn bạc",
    "bạn tari": "bạn trai", "bạn thên": "bạn thân",
    "bất cứởđâu": "bất cứ đâu", "chuyen môn": "chuyên môn",
    "chùa (chiền)": "chùa chiền", "chả= không": "chả",
    "chếđộim lặng": "chế độ im lặng", "diều khiển": "điều khiển",
    "dần (dần)": "dần dần", "dự dịnh": "dự định", "giổng nhau": "giống nhau",
    "gía trị gia tăng": "giá trị gia tăng", "gọi (món)": "gọi món",
    "hoản hảo": "hoàn hảo", "hóa ra~": "hóa ra",
    "khản": "khàn", "kỹxảo tốt": "kỹ xảo tốt",
    "lóp học": "lớp học", "lạc (đường)": "lạc đường", "lạnh lúng": "lạnh lùng",
    "may (mắn)": "may mắn", "máy bán vé tựđộng": "máy bán vé tự động",
    "món (ăn)": "món ăn", "mắc (lỗi)": "mắc lỗi", "nghe lời ~": "nghe lời",
    "ngoài (ra)": "ngoài ra", "ngoài(ra)": "ngoài ra",
    "ngưởi": "người", "nhâp khẩu": "nhập khẩu", "nhắn (tin)": "nhắn tin",
    "nhỡ(xe buýt)": "nhỡ xe buýt", "nâng côc": "nâng cốc", "nửa tiéng": "nửa tiếng",
    "phim hoạt động": "phim hành động",
    "quần Jin": "quần jean", "rõ (ràng)": "rõ ràng",
    "rựou vào lời ra": "rượu vào lời ra", "so (với)": "so với",
    "sưc khỏe thể chất": "sức khỏe thể chất", "thuê (nhà)": "thuê nhà",
    "thưc đơn": "thực đơn", "thỉnh": "thỉnh thoảng", "tìng trạng": "tình trạng",
    "tầm nhình": "tầm nhìn", "từ~đến~": "từ ~ đến ~", "tựnhiên": "tự nhiên",
    "viên (thuốc)": "viên thuốc", "vợsắp cưới": "vợ sắp cưới",
    "xanh lá (cây)": "xanh lá cây", "đau râng": "đau răng",
    "đói (bụng)": "đói bụng", "đưởng cao tốc": "đường cao tốc",
    "đệp lão": "đẹp lão", "độ pân giải": "độ phân giải",
    "lên (tàu)": "lên tàu", "xã, thôn": "xã, thôn",
    "đối diện (với)": "đối diện với", "(câu) ví dụ": "câu ví dụ",
    "(exactly) chính": "chính xác", "(màu) da trời": "màu da trời",
    "(sự) hiểu lầm": "sự hiểu lầm", "Bà ầy": "Bà ấy",
    "Chúng ta (Speakers&Listeners)": "Chúng ta",
    "Căm Pu Chia": "Cam-pu-chia", "Daọ nay": "Dạo này", "Diểm tốt": "Điểm tốt",
    "Họ (They)": "Họ", "Nguy hiểm / gay": "Nguy hiểm",
    "Quần jean Quần bò": "quần jean",
    "That Đo, Đấy, kia": "đó, đấy, kia", "This Đây": "Đây",
    "Trời / thời tiết": "thời tiết", "Tệp / File": "Tệp",
    "Vi ệ t (Nam)": "Việt Nam", "Và (and)": "Và",
    "anh/chị/em họ": "anh chị em họ", "aó cộc tay": "áo cộc tay",
    "aó phông": "áo phông", "aó rét": "áo rét", "aó sơ mi": "áo sơ mi",
    "bán chịu(mua chịu)": "bán chịu", "bánh gatô": "bánh ga-tô",
    "báo tin (to inform)": "báo tin", "chiêc giầy": "chiếc giày",
    "chầu (cà phê)": "chầu cà phê", "chỉ (thôi)": "chỉ",
    "càng...càng…": "càng... càng...", "cái gường": "cái gương",
    "công cụ để~": "công cụ để", "cả..,cũng": "cả... cũng",
    "dến": "đến", "dủ": "đủ", "dựa trên(=dựa vào)": "dựa trên",
    "giây (second)": "giây", "giây phút (=khoảnh khắc)": "giây phút",
    "gía đắt lên": "giá đắt lên", "gỉa dối": "giả dối",
    "hàng dỏm(=hàng giả)": "hàng dỏm", "hàng/sản phẩm": "sản phẩm",
    "hôm kia/2 hôm trước": "hôm kia", "hấp tấp /nóng tính": "nóng tính",
    "khi... Thì": "khi... thì", "khiến (cho)": "khiến cho",
    "không nên (Should not)": "không nên", "khơi dậy(=tạo ra)": "khơi dậy",
    "khắp thế giởi": "khắp thế giới", "khỏi (bệnh,bịnh)": "khỏi bệnh",
    "kiên trì (=kiên nhẫn)": "kiên trì", "kiếm đâu ra mấy~": "kiếm đâu ra",
    "ngay cả... Cũng": "ngay cả... cũng", "ngay khi (=khi vừa~)": "ngay khi",
    "ngày kìa/3 ngày nữa": "ngày kìa", "ngập (nước)": "ngập nước",
    "nhiên (là)~": "tất nhiên", "nhà riȇng": "nhà riêng",
    "phó cíam đốc": "phó giám đốc", "phạm lỗi (=mắc lỗi)": "phạm lỗi",
    "quét vi rut": "quét vi rút", "quần bò/quần jean": "quần bò",
    "quận / huyện": "quận, huyện", "quận/huyện": "quận, huyện",
    "rất là (= rất)": "rất", "sự trợ": "sự trợ giúp",
    "thân mật /thân thiết": "thân mật, thân thiết", "thấy (to see)": "thấy",
    "tiếng Khme": "tiếng Khmer", "tiết kiẹm tiền": "tiết kiệm tiền",
    "trọng yếu(=quan trọng)": "trọng yếu", "tại chức (=đương chức)": "tại chức",
    "tầng trệt (ground floor)": "tầng trệt",
    "xe lủa/tàu (hỏa)": "xe lửa", "xe lửa/tàu hỏa": "xe lửa",
    "xin (to apply)": "xin", "xin được việc (làm)": "xin được việc làm",
    "xổ số (sổ số)": "xổ số", "Đã ... lại …": "Đã... lại...",
    "Đề u (All/both)": "Đều", "đi ra (khỏi)": "đi ra khỏi",
    "đoi chút": "đôi chút", "đón (to pick up)": "đón",
    "đầu tư (vào)": "đầu tư vào", "đến (đây)": "đến đây",
    "để (for what)": "để", "định (to intend)": "định",
}

def norm(vi):
    return ud.normalize("NFC", vi.strip())

p = R / "data" / "basicwords.json"
d = json.loads(p.read_text(encoding="utf-8"))
words = d["words"]

removed = fixed = unchanged = 0
new_words = []
for w in words:
    vi = w["vi"]
    if vi in REMOVE:
        removed += 1
        continue
    if vi in SPLIT_FIX:
        w["vi"] = SPLIT_FIX[vi]; fixed += 1
    elif vi in LING_FIX:
        w["vi"] = LING_FIX[vi]; fixed += 1
    else:
        unchanged += 1
    new_words.append(w)

print(f"제거: {removed} · 고침: {fixed} · 그대로: {unchanged}")

# 고친 뒤 vi 표기가 같아진 것끼리 다시 합친다(기수·별점·주간 표시를 합쳐야 한다)
merged = {}
for w in new_words:
    key = norm(w["vi"])
    if key not in merged:
        merged[key] = w
    else:
        m = merged[key]
        allc = sorted(set(m["cohorts"]) | set(w["cohorts"]), key=lambda x: -int(x))
        m["cohorts"] = allc
        n = len(allc)
        m["star"] = {1: 0, 2: 1, 3: 2, 4: 3}.get(n, 0)
        m["weekly"] = m["weekly"] or w["weekly"]

out = sorted(merged.values(), key=lambda x: (-x["star"], -len(x["cohorts"]), x["vi"]))
print(f"고친 뒤 합쳐진 것까지 반영한 최종 고유 낱말 수: {len(out)}")

d["words"] = out
d["note"] += " (4차: '바이올린' 류 순수 외래어 제거 + 성조·띄어쓰기 오류 206곳 전수 손교정 — 대표님 지시 2026-09-15)"
p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
print("저장함:", p)
