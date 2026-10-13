# -*- coding: utf-8 -*-
"""주간시험 1 모의고사 1 — 교재 1권 1~3과(인사·이름·국적·언어·학교·숫자 0~100) (2026-10-13 밤, 대표님 "주간시험 1 의 실제 시험지 삭제하고 모의고사 1개 만들어서 넣어 주라").
틀·검사는 주간시험 3 의 tools/mock3/common3.py 그대로(실제 1·2차 시험지 꼴 — 2차 꼴 읽기 4·듣기 3 함정·대화 목소리 번갈아). 낱말 범위만 1~3과(tools/mock2/ch17_words.json 의 1~3과)로 바꾼다.
문법은 앱 3~7과(là·không phải là·cũng·của·có…không·phải không·gì·nào·ai·đâu·thế nào·ạ·숫자). 말하기는 교재 2·3과 발음 목록(PHÁT ÂM) 낱말·문장.
쓰기: python3 tools/mock1/ex1.py → data/mock1_1.json · 소리 목록 tools/mock1/_aud_1.json(gen_audio_list) · 대화는 tools/mock3/dialog_audio3.py 가 mock1_*.json 도 읽는다."""
import json, pathlib, sys, unicodedata as U, collections, re, random
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock3')); sys.path.insert(0, str(R / 'tools/mock2'))
import common3 as c
nf = lambda s: U.normalize('NFC', s)
W = [x for x in json.load(open(R / 'tools/mock2/ch17_words.json', encoding='utf-8')) if x[0] <= 3]
c.W = W; c.ENT.clear(); c.ENT.update(nf(v).lower() for b, v, k, i in W)
c.LES.clear(); c.IMG.clear(); c.WKO.clear()
for b, v, k, i in W:
    c.LES.setdefault(nf(v).lower(), b)
    if i and (R / 'img' / i).exists(): c.IMG.setdefault(nf(v).lower(), i)
    if k: c.WKO.setdefault(nf(v).lower(), k)
c.NAMES |= {'tạo', 'yuki', 'tuấn', 'min', 'tom', 'hoa', 'lan', 'kim', 'mai', 'sáu', 'minh'}
from common3 import *   # noqa — 위에서 바꿔 둔 사전·목록을 그대로 쓴다
NO = 1
q = []
q += [TF("giáo viên", "Cô ấy là giáo viên.", "그녀는 선생님이에요.", True),
      TF("sinh viên", "Anh ấy là giáo viên.", "그는 선생님이에요.", False),
      TF("áo dài", "Chị ấy mặc áo dài.", "그녀는 아오자이를 입어요.", True),
      TF("mưa", "Hôm nay nắng lắm.", "오늘 햇볕이 아주 뜨거워요.", False),
      TF("ăn cơm", "Ông bà đang ăn cơm.", "할아버지 할머니가 밥을 드시고 있어요.", True)]
q += PKS(NO, [("chào", "Anh ấy chào cô Hoa.", "그는 호아 선생님께 인사해요.", "mock1-1-pa.webp"),
              ("đăng ký", "Anh ấy đăng ký học tiếng Việt.", "그는 베트남어 수업을 등록해요.", "mock1-1-pb.webp"),
              ("giới thiệu", "Anh ấy tự giới thiệu với các bạn.", "그는 친구들에게 자기소개를 해요.", "mock1-1-pc.webp"),
              ("sách", "Anh ấy xem sách tiếng Việt.", "그는 베트남어 책을 봐요.", "mock1-1-pd.webp"),
              ("số", "Anh ấy viết số hai mươi.", "그는 숫자 20을 써요.", "mock1-1-pe.webp")])
q += [A3s("Chị Mai là người nước nào?", "마이 씨는 어느 나라 사람이에요?", "Chị Mai không phải là người Nhật. Chị ấy là người Hàn Quốc.", "마이 씨는 일본 사람이 아니에요. 한국 사람이에요.", ["Hàn Quốc", "Nhật", "Mỹ"]),
      A3s("Anh David là gì?", "데이비드 씨는 무엇이에요?", "Anh David không phải là sinh viên. Anh ấy là giáo viên tiếng Anh.", "데이비드 씨는 대학생이 아니에요. 영어 선생님이에요.", ["giáo viên", "sinh viên", "học viên"]),
      A3s("Lớp tiếng Việt có mấy học viên?", "베트남어 반에는 학생이 몇 명이에요?", "Lớp tiếng Việt của tôi có mười lăm học viên, không phải mười bốn.", "우리 베트남어 반에는 열다섯 명이 있어요, 열네 명이 아니에요.", ["mười lăm", "mười bốn", "năm"]),
      A3s("Hôm nay chị Loan thế nào?", "오늘 로안 씨는 어때요?", "Hôm qua chị Loan mệt. Hôm nay chị ấy khỏe.", "어제 로안 씨는 피곤했어요. 오늘은 건강해요.", ["khỏe", "mệt", "vui"]),
      A3s("Hiện nay anh Tony học tiếng gì?", "지금 토니 씨는 무슨 언어를 배워요?", "Anh Tony biết tiếng Anh và tiếng Pháp. Hiện nay anh ấy học tiếng Việt.", "토니 씨는 영어와 프랑스어를 알아요. 지금은 베트남어를 배워요.", ["tiếng Việt", "tiếng Anh", "tiếng Pháp"]),
      A3d("Chị ấy tên là gì?", "그녀의 이름은 뭐예요?", [("Xin lỗi, chị tên là gì?", "실례지만 이름이 뭐예요?"), ("Tôi tên là Lan, không phải Loan.", "제 이름은 란이에요, 로안이 아니에요.")], ["Lan", "Loan", "Linh"], 'mf'),
      A3d("Anh ấy đi đâu?", "그는 어디에 가요?", [("Anh đi đâu đấy?", "어디 가요?"), ("Tôi đi học ở trường Nhân văn.", "인문대학에 공부하러 가요.")], ["đi học", "đi làm việc", "đi ăn cơm"], 'fm'),
      A3d("Ông Kim thế nào?", "김 씨는 어때요?", [("Ông Kim có khỏe không?", "김 씨는 건강하세요?"), ("Dạ, ông ấy không khỏe lắm.", "아니요, 별로 건강하지 않으세요.")], ["không khỏe lắm", "khỏe", "rất khỏe"], 'mf'),
      A3d("Cô Hoa dạy ở đâu?", "호아 선생님은 어디에서 가르쳐요?", [("Cô Hoa dạy ở trường đại học phải không?", "호아 선생님은 대학교에서 가르치죠?"), ("Không, cô ấy dạy ở nhà.", "아니요, 집에서 가르쳐요.")], ["ở nhà", "ở trường đại học", "ở Hà Nội"], 'fm'),
      A3d("Anh Brian là người Mỹ phải không?", "브라이언 씨는 미국 사람이에요?", [("Anh Brian là người Mỹ phải không?", "브라이언 씨는 미국 사람이죠?"), ("Không, anh ấy là người Canada.", "아니요, 캐나다 사람이에요.")], ["Không", "Phải", "Có"], 'mf')]
q += [A4s("Tôi là người [Úc].", "저는 호주 사람이에요."),
      A4s("Lớp tôi có [hai mươi] học viên.", "우리 반에는 학생이 스무 명 있어요."),
      A4s("Chị Lan là [giáo viên] tiếng Việt.", "란 씨는 베트남어 선생님이에요."),
      A4s("Hôm nay anh Hiroki không [khỏe].", "오늘 히로키 씨는 몸이 안 좋아요."),
      A4s("Em đăng ký học [tiếng Việt].", "저는 베트남어 수업을 등록해요."),
      A4d("Em tên là gì?", "이름이 뭐니?", "Em tên là [Tuấn].", "제 이름은 뚜언이에요.", 'fm'),
      A4d("Ông là người nước nào?", "어느 나라 사람이세요?", "Tôi là người [Pháp].", "저는 프랑스 사람이에요.", 'mf'),
      A4d("Anh học tiếng Việt ở đâu?", "베트남어를 어디서 배워요?", "Tôi học ở trường [Nhân văn].", "인문대학에서 배워요.", 'fm'),
      A4d("Tiếng Việt có khó không?", "베트남어는 어려워요?", "Không khó. Rất [thú vị].", "안 어려워요. 아주 재미있어요.", 'mf'),
      A4d("Lớp em có mấy sinh viên?", "너희 반에는 대학생이 몇 명 있어?", "Lớp em có [mười hai] sinh viên.", "우리 반에는 대학생이 열두 명 있어요.", 'fm')]
q += B1S(NO, ["là", "của", "cũng", "không", "phải không"], [
      ("Em ____ học viên.", "là", "저는 학생이에요."),
      ("Đây là sách ____ tôi.", "của", "이것은 제 책이에요."),
      ("Anh David ____ là người Mỹ.", "cũng", "데이비드 씨도 미국 사람이에요."),
      ("Anh ấy ____ phải là người Mỹ.", "không", "그는 미국 사람이 아니에요."),
      ("Em là người Hàn Quốc, ____?", "phải không", "너 한국 사람이지?")])
q += [B2("Tôi là Minh. Tôi là người Việt Nam. Tôi là giáo viên tiếng Việt ở trường Nhân văn.", "저는 민이에요. 베트남 사람이에요. 인문대학에서 베트남어를 가르치는 선생님이에요.",
         "Anh Minh dạy ở đâu?", "민 씨는 어디에서 가르쳐요?", ["ở trường Nhân văn", "ở nhà", "ở Hà Nội"]),
      B2("Chị Emily là người Úc. Chị ấy học tiếng Việt với cô Lan. Lớp của chị ấy có mười học viên.", "에밀리 씨는 호주 사람이에요. 란 선생님과 베트남어를 배워요. 그 반에는 학생이 열 명 있어요.",
         "Lớp của chị Emily có mấy học viên?", "에밀리 씨 반에는 학생이 몇 명 있어요?", ["mười", "mười một", "hai mươi"]),
      B2("Anh Hiroki và anh David là bạn. Anh Hiroki là người Nhật, anh David là người Anh. Họ cũng học tiếng Việt.", "히로키 씨와 데이비드 씨는 친구예요. 히로키 씨는 일본 사람, 데이비드 씨는 영국 사람이에요. 그들도 베트남어를 배워요.",
         "Anh David là người nước nào?", "데이비드 씨는 어느 나라 사람이에요?", ["Anh", "Nhật", "Mỹ"]),
      B2("Hôm nay cô Hoa không khỏe. Cô ấy mệt lắm. Cô ấy ở nhà.", "오늘 호아 선생님은 몸이 안 좋아요. 아주 피곤해요. 집에 있어요.",
         "Hôm nay cô Hoa ở đâu?", "오늘 호아 선생님은 어디에 있어요?", ["ở nhà", "ở trường", "ở lớp"]),
      B2("Đây là anh Tom. Anh ấy là người Canada. Anh ấy biết tiếng Anh và tiếng Pháp. Anh ấy không biết tiếng Việt.", "이분은 톰 씨예요. 캐나다 사람이에요. 영어와 프랑스어를 알아요. 베트남어는 몰라요.",
         "Anh Tom không biết tiếng gì?", "톰 씨는 무슨 언어를 몰라요?", ["tiếng Việt", "tiếng Anh", "tiếng Pháp"])]
T = [("Tôi là Eun Ji, người Hàn Quốc. Tôi là học viên lớp tiếng Việt.", "저는 은지예요. 한국 사람이에요. 베트남어 반 학생이에요.",
      [("Eun Ji là người Hàn Quốc.", "은지는 한국 사람이에요.", True), ("Eun Ji là giáo viên.", "은지는 선생님이에요.", False)]),
     ("Ông Kim là người Hàn Quốc. Ông ấy không khỏe. Hôm nay ông ấy không đi học.", "김 씨는 한국 사람이에요. 몸이 안 좋아요. 오늘은 수업에 안 가요.",
      [("Ông Kim khỏe.", "김 씨는 건강해요.", False), ("Hôm nay ông Kim không đi học.", "오늘 김 씨는 수업에 안 가요.", True)]),
     ("Chị Hoa dạy tiếng Việt. Lớp của chị ấy có hai mươi học viên. Họ rất chăm chỉ.", "호아 씨는 베트남어를 가르쳐요. 그 반에는 학생이 스무 명 있어요. 아주 열심히 해요.",
      [("Lớp của chị Hoa có hai mươi học viên.", "호아 씨 반에는 학생이 스무 명 있어요.", True), ("Học viên không chăm chỉ.", "학생들은 열심히 하지 않아요.", False)]),
     ("Anh Brian là người Mỹ. Anh ấy đăng ký học tiếng Việt ở trường Nhân văn. Anh ấy cũng biết tiếng Pháp.", "브라이언 씨는 미국 사람이에요. 인문대학에서 베트남어 수업을 등록했어요. 프랑스어도 알아요.",
      [("Anh Brian học tiếng Việt ở trường Nhân văn.", "브라이언 씨는 인문대학에서 베트남어를 배워요.", True), ("Anh Brian không biết tiếng Pháp.", "브라이언 씨는 프랑스어를 몰라요.", False)]),
     ("Đây là chị Mây và chị Thu. Chị Mây là người Việt Nam, chị Thu là người Thái Lan. Họ là bạn.", "이분들은 머이 씨와 투 씨예요. 머이 씨는 베트남 사람, 투 씨는 태국 사람이에요. 둘은 친구예요.",
      [("Chị Thu là người Thái Lan.", "투 씨는 태국 사람이에요.", True), ("Chị Mây và chị Thu không phải là bạn.", "머이 씨와 투 씨는 친구가 아니에요.", False)])]
for k, (t, tko, two) in enumerate(T): q += B3(t, tko, two, NO, k)
q += B4S(NO, [("Chào chị. Chị có khỏe không?", "안녕하세요. 잘 지내세요?", "Cám ơn anh. Tôi khỏe.", "고마워요. 잘 지내요."),
              ("Anh tên là gì?", "이름이 뭐예요?", "Tôi tên là Dũng.", "제 이름은 중이에요."),
              ("Chị là người nước nào?", "어느 나라 사람이에요?", "Tôi là người Nhật.", "저는 일본 사람이에요."),
              ("Đây là ai?", "이분은 누구예요?", "Đây là cô Lan, giáo viên của tôi.", "이분은 제 선생님 란 선생님이에요."),
              ("Anh là sinh viên phải không?", "대학생이죠?", "Không, tôi là giáo viên.", "아니요, 저는 선생님이에요."),
              ("Lớp anh có mấy học viên?", "반에 학생이 몇 명이에요?", "Mười hai học viên.", "열두 명이요."),
              ("Em đi đâu đấy?", "어디 가니?", "Em đi học ạ.", "학교 가요."),
              ("Xin lỗi anh.", "미안해요.", "Không sao.", "괜찮아요."),
              ("Tôi là sinh viên.", "저는 대학생이에요.", "Tôi cũng là sinh viên.", "저도 대학생이에요."),
              ("Tiếng Việt khó lắm.", "베트남어는 너무 어려워요.", "Không, tiếng Việt rất thú vị.", "아니에요, 베트남어는 아주 재미있어요.")])
q += [C1("Anh ấy là người Pháp.", "그는 프랑스 사람이에요.", ["người", "anh ấy", "Pháp", "là"]),
      C1("Chị ấy không phải là sinh viên.", "그녀는 대학생이 아니에요.", ["không phải", "sinh viên", "chị ấy", "là"]),
      C1("Chị tên là gì?", "이름이 뭐예요?", ["gì", "chị", "là", "tên"]),
      C1("Lớp tôi có mười học viên.", "우리 반에는 학생이 열 명 있어요.", ["mười", "lớp tôi", "học viên", "có"]),
      C1("Kia là lớp của tôi.", "저기는 우리 반이에요.", ["của", "kia", "lớp", "là", "tôi"])]
q += [C2("Tôi người Đức là.", "Tôi là người Đức.", "저는 독일 사람이에요. (là 는 주어 바로 뒤)"),
      C2("Chị là giáo viên không phải?", "Chị là giáo viên phải không?", "선생님이시죠? (확인 물음은 phải không)"),
      C2("Chị ấy là không giáo viên.", "Chị ấy không phải là giáo viên.", "그녀는 선생님이 아니에요. (là 문장의 부정은 không phải là)"),
      C2("Lớp tôi có mười lăm học viên.", "Lớp tôi có mười lăm học viên.", "우리 반에는 학생이 열다섯 명 있어요.", dung=True),
      C2("Đây là bạn của tôi.", "Đây là bạn của tôi.", "이 사람은 제 친구예요.", dung=True)]
q.append(C3("mock1-1-w3.webp",
            [("Đây là cô Hoa.", "이분은 호아 선생님이에요."), ("Cô Hoa là giáo viên tiếng Việt.", "호아 선생님은 베트남어 선생님이에요."),
             ("Anh Min là người Hàn Quốc.", "민 씨는 한국 사람이에요."), ("Chị Yuki là người Nhật.", "유키 씨는 일본 사람이에요."), ("Anh Tom là người Mỹ.", "톰 씨는 미국 사람이에요.")],
            {'say': ['đây là cô hoa', 'cô hoa là giáo viên', 'cô hoa là giáo viên tiếng việt', 'cô hoa là người việt nam', 'anh min là người hàn quốc', 'chị yuki là người nhật', 'chị yuki là người nhật bản',
                     'anh tom là người mỹ', 'họ là học viên', 'họ là sinh viên', 'họ học tiếng việt', 'đây là trường đại học', 'đây là trường nhân văn', 'họ ở trường', 'họ rất vui'],
             'facts': [(['cô hoa', 'cô ấy', 'cô giáo'], ['là giáo viên', 'là giáo viên tiếng việt', 'là người việt nam', 'là người việt', 'dạy tiếng việt'], False),
                       (['anh min', 'anh ấy'], ['là người hàn quốc', 'là học viên', 'là sinh viên', 'học tiếng việt'], False),
                       (['chị yuki', 'chị ấy'], ['là người nhật', 'là người nhật bản', 'là học viên', 'là sinh viên', 'học tiếng việt'], False),
                       (['anh tom'], ['là người mỹ', 'là học viên', 'là sinh viên', 'học tiếng việt'], False),
                       (['họ', 'các bạn', 'anh min và chị yuki', 'ba học viên', 'mọi người'], ['là học viên', 'là sinh viên', 'học tiếng việt', 'ở trường', 'rất vui', 'đang ở trường'], True)],
             'pre': ['hôm nay', 'bây giờ', 'ở trường'], 'post': ['ở trường', 'ở trường đại học', 'hôm nay']}))
q += D(["hai", "sao", "tới", "chia", "khuya", "mua", "mưa", "tiền", "người", "hiểu"],
       ["Hai hôm nay ông Tạo không tới.", "Ai giới thiệu Mai với anh Sáu?", "Chị đi với em không?", "Bài này không hay.", "Ông bà đang ở nhà."])   # 교재 1권 2·3과 발음 목록(PHÁT ÂM)
def build1(no, q):
    """common3.build 와 같되 파일 이름 mock1_N · 다른 벌 대조 없음 · 안내 글만 다름"""
    import types
    src = inspect_build()
    exec(src, c.__dict__)
def inspect_build():
    import inspect
    s = inspect.getsource(c.build)
    s = s.replace("mock3_{other}", "mock1_{other}").replace("mock3_{no}", "mock1_{no}")
    s = s.replace('"note": f"주간시험 3 모의고사 {no} — 교재 1권 8~10과 범위(문법은 1~10과, 낱말은 8~10과 위주 — 대표님 2026-10-13 \'범위는 일단 8~10\').',
                  '"note": f"주간시험 1 모의고사 {no} — 교재 1권 1~3과 범위(낱말·문법 모두 1~3과, tools/mock1/ex1.py). 실제 1차 시험지는 학교 자료라 앱에서 뺐다(대표님 2026-10-13).')
    s = s.replace("b >= 8", "b <= 3").replace("8~10과 낱말 몫", "1~3과 낱말 몫")
    s = s.replace("pathlib.Path(__file__).parent / f'_aud_{no}.json'", "R / 'tools/mock1' / f'_aud_{no}.json'")
    assert 'mock1_{no}' in s and '1~3과' in s
    return s.replace('def build(', 'def _build1(')
exec(inspect_build(), c.__dict__)
c._build1(NO, q)
