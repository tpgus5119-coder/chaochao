#!/usr/bin/env python3
"""학원 나란히 2 — 훈련기관 수업 5~10강과 맞추기 (Day 103~108).
수업 전 '찍어보기'(사전시험)용: 그날 수업에 나올 단어를 앱이 먼저 들고 있는다.
표현은 전부 자체 작성 — 수업자료에서 가져온 것은 주제와 단어 목록(사실)뿐이다.
규칙: 모든 단어는 문장에 등장, 문장은 그날까지 배운 낱말로만 (ơi 는 아직 못 쓴다)."""
import json, pathlib, sys
sys.path.insert(0, 'tools')
from tone import word_tones
def W(vi, ko, kr, h=None, s=None):
    d = {"vi": vi, "ko": ko, "kr_read": kr, "tones": word_tones(vi)}
    if h: d["hanja"] = h
    if s: d["south"] = s
    return d
def L(who, vi, ko, kr, g): return {"who": who, "vi": vi, "ko": ko, "kr_read": kr,
    "gloss": [{"w": a, "m": b} for a, b in g], "tones": word_tones(vi)}
def X(vi, ko, kr): return {"vi": vi, "ko": ko, "kr_read": kr, "tones": word_tones(vi)}
def D(day, theme, intro, words, title, lines, extra):
    return {"day": day, "theme": theme, "intro": intro, "words": words,
            "dialog": {"title": title, "lines": lines, "extra": extra},
            "mission": {"goal": "", "how": "", "a": "", "b": ""}}
DAYS = []

DAYS.append(D(103, "학원 5강 · 길 가리키기",
 "택시에서 살아남는 여섯 마디 — 직진, 좌회전, 우회전, 그리고 '세워 주세요'.",
 [W("đi thẳng", "직진하다", "디 탕"), W("rẽ trái", "좌회전하다", "제 짜이"),
  W("rẽ phải", "우회전하다", "제 파이"), W("chậm lại", "속도를 줄이다", "쩜 라이"),
  W("dừng lại", "멈추다·세우다", "증 라이"), W("nhanh lên", "서두르다·빨리", "냔 렌"),
  W("xe taxi", "택시", "새 딱시"), W("xích lô", "시클로(인력거)", "식 로")],
 "택시에서",
 [L("A", "Đi thẳng rồi rẽ phải nhé.", "직진하다가 우회전해 주세요.", "디 탕 조이 제 파이 녜",
    [("đi thẳng", "직진"), ("rẽ phải", "우회전")]),
  L("B", "Vâng, em rẽ trái rồi dừng lại ạ.", "네, 좌회전하고 세울게요.", "벙 앰 제 짜이 조이 증 라이 아",
    [("rẽ trái", "좌회전"), ("dừng lại", "세우다")])],
 [X("Xe taxi chậm lại nhé.", "택시 아저씨, 속도 줄여 주세요", "새 딱시 쩜 라이 녜"),
  X("Đi nhanh lên nhé.", "빨리 가 주세요", "디 냔 렌 녜"),
  X("Em muốn đi xích lô.", "저는 시클로를 타고 싶어요", "앰 무온 디 식 로"),
  X("Dừng lại ở đây ạ.", "여기서 세워 주세요", "증 라이 어 더이 아")]))

DAYS.append(D(104, "학원 6강 · 마실 것과 과일",
 "카페와 과일 가게 — 주문은 Cho(주세요) 하나면 시작된다.",
 [W("sữa chua", "요거트", "스어 쭈어"), W("sữa tươi", "생우유", "스어 뜨어이"),
  W("rượu", "술", "즈어우"), W("nước hoa quả", "과일 주스", "느억 호아 꾸아"),
  W("chuối", "바나나", "쭈오이"), W("xoài", "망고", "쏘아이"),
  W("dứa", "파인애플", "즈어", None, "thơm"), W("dừa", "코코넛", "즈어"),
  W("táo", "사과", "따오"), W("dưa hấu", "수박", "즈어 허우")],
 "카페에서",
 [L("A", "Cho em một sinh tố xoài nhé.", "망고 스무디 하나 주세요.", "쪼 앰 못 신 또 쏘아이 녜",
    [("cho", "주세요"), ("xoài", "망고")]),
  L("B", "Vâng, có nước hoa quả với sữa chua nữa ạ.", "네, 과일 주스랑 요거트도 있어요.", "벙 꼬 느억 호아 꾸아 버이 스어 쭈어 느어 아",
    [("nước hoa quả", "과일 주스"), ("sữa chua", "요거트")])],
 [X("Em thích sữa tươi, không thích rượu.", "저는 생우유는 좋아하고 술은 안 좋아해요", "앰 틱 스어 뜨어이 콩 틱 즈어우"),
  X("Dưa hấu với dứa rất ngon.", "수박이랑 파인애플이 아주 맛있어요", "즈어 허우 버이 즈어 젓 응온"),
  X("Táo này bao nhiêu tiền?", "이 사과 얼마예요?", "따오 나이 바오 니에우 띠엔"),
  X("Nước dừa với chuối cũng ngon.", "코코넛 물이랑 바나나도 맛있어요", "느억 즈어 버이 쭈오이 꿍 응온")]))

DAYS.append(D(105, "학원 7강 · 밥집 주문",
 "쌀국수 말고도 아홉 가지 — 그리고 젓가락 달라는 말.",
 [W("phở bò", "소고기 쌀국수", "퍼 보"), W("cơm rang", "볶음밥", "껌 장", None, "cơm chiên"),
  W("bún chả", "분짜(석쇠구이 국수)", "분 짜"), W("nem rán", "튀김 스프링롤", "냄 잔", None, "chả giò"),
  W("bánh mì", "바게트 샌드위치", "바잉 미"), W("mỳ xào", "볶음면", "미 싸오"),
  W("cái bát", "그릇·공기", "까이 밧", None, "cái chén"), W("đôi đũa", "젓가락 한 벌", "도이 두어"),
  W("cái thìa", "숟가락", "까이 티어", None, "cái muỗng"), W("tăm", "이쑤시개", "땀")],
 "식당에서",
 [L("A", "Cho anh một phở bò và một nem rán.", "소고기 쌀국수 하나랑 스프링롤 하나 주세요.", "쪼 아잉 못 퍼 보 바 못 냄 잔",
    [("phở bò", "소고기 쌀국수"), ("nem rán", "스프링롤")]),
  L("B", "Vâng, có bún chả với mỳ xào nữa ạ.", "네, 분짜랑 볶음면도 있어요.", "벙 꼬 분 짜 버이 미 싸오 느어 아",
    [("bún chả", "분짜"), ("mỳ xào", "볶음면")])],
 [X("Cho em một cái bát với đôi đũa.", "그릇 하나랑 젓가락 한 벌 주세요", "쪼 앰 못 까이 밧 버이 도이 두어"),
  X("Cái thìa với tăm ở đây ạ.", "숟가락과 이쑤시개는 여기 있어요", "까이 티어 버이 땀 어 더이 아"),
  X("Bánh mì này rất ngon.", "이 반미 아주 맛있어요", "바잉 미 나이 젓 응온"),
  X("Em thích cơm rang.", "저는 볶음밥을 좋아해요", "앰 틱 껌 장")]))

DAYS.append(D(106, "학원 8강 · 시장과 흥정",
 "시장의 열 가지 재료 — 값을 묻고, 비싸면 말한다.",
 [W("lợn", "돼지(고기)", "런", None, "heo"), W("trứng", "달걀", "쯩"),
  W("đậu phụ", "두부", "더우 푸", "豆腐 (두부)"), W("rau muống", "모닝글로리(공심채)", "자우 무옹"),
  W("tỏi", "마늘", "또이"), W("khoai tây", "감자", "코아이 떠이"),
  W("dưa chuột", "오이", "즈어 쭈옷", None, "dưa leo"), W("cà rốt", "당근", "까 좃"),
  W("cà chua", "토마토", "까 쭈어"), W("ớt tây", "피망·파프리카", "엇 떠이")],
 "시장에서",
 [L("A", "Cà chua bao nhiêu tiền một cân ạ?", "토마토 1kg에 얼마예요?", "까 쭈어 바오 니에우 띠엔 못 껀 아",
    [("cà chua", "토마토"), ("một cân", "1kg")]),
  L("B", "Bốn mươi nghìn một cân ạ.", "1kg에 4만 동이에요.", "본 므어이 응인 못 껀 아",
    [("bốn mươi nghìn", "4만"), ("một cân", "1kg")])],
 [X("Cho em trứng với đậu phụ.", "달걀이랑 두부 주세요", "쪼 앰 쯩 버이 더우 푸"),
  X("Lợn với gà rất tươi.", "돼지고기랑 닭고기가 아주 신선해요", "런 버이 가 젓 뜨어이"),
  X("Rau muống với tỏi rẻ lắm.", "모닝글로리랑 마늘이 아주 싸요", "자우 무옹 버이 또이 재 람"),
  X("Cho em khoai tây, cà rốt với dưa chuột.", "감자, 당근, 오이 주세요", "쪼 앰 코아이 떠이 까 좃 버이 즈어 쭈옷"),
  X("Ớt tây màu đỏ rất đẹp.", "빨간 피망이 아주 예뻐요", "엇 떠이 마우 도 젓 댑")]))

DAYS.append(D(107, "학원 9강 · 색깔",
 "màu 하나로 세상을 다 물어본다 — 이건 무슨 색이에요?",
 [W("xanh da trời", "하늘색", "싸잉 자 쪄이"), W("xanh nước biển", "바다색·남색", "싸잉 느억 비엔"),
  W("xanh lá cây", "초록색", "싸잉 라 꺼이"), W("da cam", "주황색", "자 깜", None, "màu cam"),
  W("xám", "회색", "쌈"), W("kem", "아이스크림·크림", "깸"),
  W("súp", "수프", "숩"), W("dâu tây", "딸기", "저우 떠이"),
  W("đào", "복숭아", "다오"), W("măng cụt", "망고스틴", "망 꿋")],
 "무슨 색이에요?",
 [L("A", "Cái áo này màu gì?", "이 옷은 무슨 색이에요?", "까이 아오 나이 마우 지",
    [("cái áo", "옷"), ("màu gì", "무슨 색")]),
  L("B", "Màu xanh da trời, không phải xanh nước biển ạ.", "하늘색이에요, 남색이 아니라요.", "마우 싸잉 자 쪄이 콩 파이 싸잉 느억 비엔 아",
    [("xanh da trời", "하늘색"), ("xanh nước biển", "남색")])],
 [X("Em thích màu xanh lá cây với màu da cam.", "저는 초록색이랑 주황색을 좋아해요", "앰 틱 마우 싸잉 라 꺼이 버이 마우 자 깜"),
  X("Xe máy này màu xám.", "이 오토바이는 회색이에요", "쌔 마이 나이 마우 쌈"),
  X("Kem dâu tây với súp ở đây ngon.", "여기 딸기 아이스크림이랑 수프가 맛있어요", "깸 저우 떠이 버이 숩 어 더이 응온"),
  X("Đào với măng cụt cũng ngon.", "복숭아랑 망고스틴도 맛있어요", "다오 버이 망 꿋 꿍 응온")]))

DAYS.append(D(108, "학원 10강 · 이름과 나이",
 "이름 묻고 나이 묻기 — mấy는 10까지, bao nhiêu는 그 너머.",
 [W("cô giáo", "여자 선생님", "꼬 자오", "敎 (교)"), W("cái bàn", "책상·탁자", "까이 반"),
  W("cái ghế", "의자", "까이 게"), W("quyển sách", "책 한 권", "꾸이엔 사익", None, "cuốn sách"),
  W("con mèo", "고양이", "꼰 매오"), W("con chó", "개", "꼰 쪼"),
  W("động vật", "동물", "동 벗", "動物 (동물)"), W("trung tâm", "센터·학원", "쭝 떰", "中心 (중심)")],
 "처음 만나서",
 [L("A", "Em tên là gì?", "이름이 뭐예요?", "앰 뗀 라 지",
    [("tên", "이름"), ("gì", "무엇")]),
  L("B", "Em tên là Hoa, em học ở trung tâm này ạ.", "저는 호아예요, 이 학원에서 공부해요.", "앰 뗀 라 호아 앰 혹 어 쭝 떰 나이 아",
    [("tên là", "이름은 ~이다"), ("trung tâm", "학원")])],
 [X("Cô giáo em rất tốt.", "우리 선생님은 아주 좋아요", "꼬 자오 앰 젓 똣"),
  X("Quyển sách ở trên cái bàn.", "책이 책상 위에 있어요", "꾸이엔 사익 어 쩬 까이 반"),
  X("Con mèo với con chó là động vật.", "고양이와 개는 동물이에요", "꼰 매오 버이 꼰 쪼 라 동 벗"),
  X("Cái ghế này mới lắm.", "이 의자 아주 새것이에요", "까이 게 나이 머이 람")]))

out = {"days": DAYS}
pathlib.Path('data/_b8.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"b8: Day 103~108 / 단어 {sum(len(d['words']) for d in DAYS)}")
