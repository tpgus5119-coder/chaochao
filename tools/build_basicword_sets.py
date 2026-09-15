#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기초단어를 '몇 일차' 순서로 배우게 하려고, 원본 회차(세트) 정보를 되살린다.

basicwords.json은 4개 기수를 하나로 합치면서 세트(며칠차/몇회차) 번호를 버렸다
(같은 낱말이 여러 기수·여러 회차에 겹쳐 나오기 때문— 대표님 지시 2026-09-15:
"별표 순서로 하지말고... 20기 1일차>19기 1일차>18기 1일차>17기 1일차>20기 2일차").

그래서 build_basicwords.py + apply_ling_fixes.py가 낱말 하나하나에 했던 처리를
그대로 다시 밟아(같은 FIX_VI·is_bad·EXCLUDE·SPLIT_FIX·LING_FIX 규칙), 이번엔
버리지 않고 "이 낱말이 어느 기수 몇 회차에서 왔나"를 같이 들고 다닌다.
마지막에 지금의 basicwords.json에 실제로 있는 낱말만 남긴다(검수로 빠진 것은 빠진 채로).

쓰기: python3 tools/build_basicword_sets.py
결과: data/basicword_sets.json = {"sets": [{"cohort","kind","no","words":[vi,...]}, ...]}
      순서: kind별로(일일 먼저, 주간 다음, 기타 마지막) no 오름차순, 같은 no면 20>19>18>17
"""
import json, pathlib, re, unicodedata as ud

R = pathlib.Path.home() / "짜오짜오" / "베트남어-어플"

FILES = [
    ("17", R / "data" / "_senior_words-17.json"),
    ("18", R / "data" / "_senior_words-18.json"),
    ("19", R / "data" / "_senior_words-19.json"),
    ("20", R / "data" / "_senior_words.json"),
]
EXCLUDE_SETS = {("18", "주간")}
EXCLUDE_SET_NOS = {("18", "일일", 107), ("18", "일일", 412), ("18", "일일", 2412)}
BAD_VI_EXACT = {
    "gybm", "gybm18", "anna", "yuki", "mister", "no.", "1km", "a/s",
    "thấy see]", "tiếng tiếng\"", "to miss", "tự đt", "(mình, cô giáo)",
}
FIX_VI = {
    "a moment một lát": "một lát", "all, everything tất cả": "tất cả",
    "always thường xuyên": "thường xuyên", "close (eyes) nhắm": "nhắm",
    "continue tiếp tục": "tiếp tục", "finished, run out hết": "hết",
    "fold, hurry gấp": "gấp", "go outside ra ngoài": "ra ngoài",
    "listen carefully lắng nghe": "lắng nghe", "please, invite, offer mời": "mời",
    "please, let hãy": "hãy", "product sản phẩm": "sản phẩm",
    "report báo cáo": "báo cáo", "stay lại": "lại",
    "to summarize tóm tắt": "tóm tắt", "to try cố gắng": "cố gắng",
    "why vì sao": "vì sao", "to begin, to start bắt đầu": "bắt đầu",
    "test, examination bài kiểm tra": "bài kiểm tra",
    "salt muối fall ngã": None, "mid day": None, "musical": None,
}
REMOVE = {
    "(cậu)", "(mình)", "Em Yu", "mix trộn ring nhẫn", "tỉ giá/ tỉ lệ",
    "violon", "Violon", "mililít", "staycarion",
}
SPLIT_FIX = {
    "Balan": "Ba Lan", "Mùa HạMùa Hè": "mùa hạ mùa hè", "chỗngồi": "chỗ ngồi",
    "chợtình": "chợ tình", "chủyếu": "chủ yếu", "kỷlục": "kỷ lục",
    "mởcửa": "mở cửa", "mỹnghệ": "mỹ nghệ", "thịxã": "thị xã",
    "thủcông": "thủ công", "trởngại": "trở ngại", "vệsĩ": "vệ sĩ",
    "xửlý": "xử lý", "đô thịhóa": "đô thị hóa", "đồchơi": "đồ chơi",
}
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

EXG = json.loads((R / "data" / "exgloss.json").read_text(encoding="utf-8"))


def norm(vi):
    return ud.normalize("NFC", vi.strip())


def is_bad(vi, ko):
    vl = vi.strip().lower()
    if vl in BAD_VI_EXACT:
        return True
    if re.search(r'[.?!]\s*$', vi):
        return True
    if vi.count('(') != vi.count(')'):
        return True
    if len(vi.split()) > 4:
        return True
    if re.search(r"[A-Za-z]'[a-z]", vi):
        return True
    kos = ko.strip()
    if re.search(r'(요\??$|까요\??$|니다\.?$|세요\.?$|나요\??$)', kos):
        return True
    if re.search(r'[,(]\s*$', kos):
        return True
    if not re.search(r'[가-힣]', ko):
        if not (EXG.get(vi) or EXG.get(norm(vi))):
            return True
    return False


def final_vi(vi):
    """build_basicwords.py 결과 vi에 apply_ling_fixes.py 규칙까지 적용해 최종 표기로 만든다."""
    if vi in REMOVE:
        return None
    if vi in SPLIT_FIX:
        return norm(SPLIT_FIX[vi])
    if vi in LING_FIX:
        return norm(LING_FIX[vi])
    return norm(vi)


# 지금 basicwords.json에 실제로 살아있는 낱말만 인정한다(9/15 낱개 교정 등도 이걸로 다 반영됨)
bw = json.loads((R / "data" / "basicwords.json").read_text(encoding="utf-8"))
live = {norm(w["vi"]) for w in bw["words"]}

sets = []  # {"cohort","kind","no","words":[vi,...]}
seen_global = set()  # 같은 낱말이 다른 세트에서 또 나오면(다른 회차) 처음 나온 세트에만 넣는다
skipped_dead = 0

for gi, path in FILES:
    d = json.loads(path.read_text(encoding="utf-8"))
    for s in d["sets"]:
        kind = s.get("kind", "기타")
        no = s.get("no")
        if (gi, kind) in EXCLUDE_SETS or (gi, kind, no) in EXCLUDE_SET_NOS:
            continue
        words_here = []
        for w in s.get("words", []):
            vi = (w.get("vi") or "").strip()
            ko = (w.get("ko") or "").strip()
            if not vi or not ko:
                continue
            if vi in FIX_VI:
                vi = FIX_VI[vi]
                if vi is None:
                    continue
            if is_bad(vi, ko):
                continue
            fv = final_vi(vi)
            if fv is None or fv not in live:
                skipped_dead += 1
                continue
            if fv in seen_global:
                continue  # 이 낱말은 이미 더 앞선(먼저 나온) 세트에 들어가 있다
            seen_global.add(fv)
            words_here.append(fv)
        if words_here:
            sets.append({"cohort": gi, "kind": kind, "no": no, "words": words_here})

# 정렬: kind(일일→주간→기타) 먼저, 그 안에서 no 오름차순, 같은 no면 기수 20>19>18>17
KIND_ORDER = {"일일": 0, "주간": 1, "기타": 2}
sets.sort(key=lambda s: (KIND_ORDER.get(s["kind"], 9), s["no"] if s["no"] is not None else 1 << 30,
                          -int(s["cohort"])))

total_words = sum(len(s["words"]) for s in sets)
print(f"세트 수: {len(sets)} · 낱말 총합(중복 없이 처음 나온 자리 기준): {total_words}")
print(f"basicwords.json에 없어서 건너뜀: {skipped_dead}")
print(f"basicwords.json 전체 낱말 수: {len(live)} · 세트에 배치 못한 낱말 수: {len(live) - len(seen_global)}")
by_kind = {}
for s in sets:
    by_kind[s["kind"]] = by_kind.get(s["kind"], 0) + len(s["words"])
print("kind별 낱말 수:", by_kind)

out = {"sets": sets}
outp = R / "data" / "basicword_sets.json"
outp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"-> {outp} ({outp.stat().st_size/1024:.0f}KB)")
