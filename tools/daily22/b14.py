# -*- coding: utf-8 -*-
"""22기 B반 14회(b14.docx, 시험일 10/8) → cohort22.json 27회차 + 문장.tsv + build.py(DATES·DIRS). 2026-10-07 대표님 "b14 추가해주라 단어시험".
시험지는 표 꼴(No. | 한국어·영어 뜻 | 베트남어 답) → 뜻→베트남어(to_vi)가 기본, 40번 'vẫn → 여전히' 만 베트남어→뜻.
영어로 적힌 뜻(Screen·Turn on·Mid night·Game over…)은 한국어로 옮겼다(화면엔 영어를 안 쓴다).
'빌리다(2가지) vay·mượn' 은 둘 다 → 41낱말. '8 giờ đúng'·'2 lần' 은 글로 적는 꼴 tám giờ đúng·hai lần 로(앱의 다른 시각·횟수 낱말과 같게).
기존 낱말은 앱 자료(22기 → 교재 → 일상 → 직무 차례)의 그림·발음·예문을 그대로 쓰되, 뜻이 시험 뜻과 다른 셋(đặt 예약·chỉ 오직·vay 돈 빌리다)은 예문을 새로 썼다."""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
W = [  # (vi, ko, 새 예문 or None)
 ('thơm', '향기롭다·좋은 냄새가 나다', None), ('thối', '썩은 냄새가 나다·고약하다', None), ('thời gian', '시간', None), ('lát nữa', '이따가·잠시 후', None),
 ('sạch', '깨끗하다', None), ('rảnh', '한가하다·여유롭다', None), ('bẩn', '더럽다', None), ('bận', '바쁘다', None), ('nhỏ', '작다', None), ('già', '늙다·나이 들다', None),
 ('để', '~하기 위하여', ('Tôi học tiếng Việt để làm việc ở Việt Nam.', '저는 베트남에서 일하기 위해 베트남어를 배워요.')),
 ('bài học', '수업·과(레슨)', None), ('màn hình', '화면·스크린', None), ('mùa', '계절', None), ('kết hôn', '결혼하다', None), ('bật', '켜다', None), ('tắt', '끄다', None),
 ('đặt', '예약하다·주문하다', ('Tôi muốn đặt bàn cho hai người.', '두 명 자리를 예약하고 싶어요.')),
 ('căng tin', '구내식당', None), ('trở thành', '~이 되다', None), ('đánh răng', '이를 닦다', None), ('ngày thường', '평일', None),
 ('phim tình cảm', '로맨스 영화·멜로 영화', ('Tôi thích xem phim tình cảm.', '저는 로맨스 영화 보는 걸 좋아해요.')),
 ('chương trình', '프로그램', None),
 ('tám giờ đúng', '8시 정각', ('Chúng ta gặp nhau lúc tám giờ đúng nhé.', '우리 8시 정각에 만나요.')),
 ('mát', '시원하다', None), ('nửa đêm', '한밤중·자정', None), ('thường', '보통·자주', None), ('tin tức', '뉴스·소식', None), ('lên mạng', '인터넷을 하다', None), ('mạng', '인터넷·망', None),
 ('vay', '(돈을) 빌리다', ('Tôi vay tiền ngân hàng để mua nhà.', '저는 집을 사려고 은행에서 돈을 빌렸어요.')),
 ('mượn', '(물건을) 빌리다', None),
 ('hai lần', '두 번', ('Tôi đã đến Hà Nội hai lần.', '저는 하노이에 두 번 가 봤어요.')),
 ('hết game', '게임 끝(게임 오버)', ('Hết game rồi, về nhà thôi.', '게임 끝났어, 집에 가자.')),
 ('tầng', '층', None), ('bản thân', '자기 자신', None), ('bạn thân', '친한 친구', None),
 ('trung tâm mua sắm', '쇼핑몰·쇼핑센터', ('Cuối tuần tôi đi trung tâm mua sắm với bạn.', '주말에 저는 친구와 쇼핑몰에 가요.')),
 ('chỉ', '오직·~만', ('Tôi chỉ có một anh trai.', '저는 오빠가 한 명뿐이에요.')),
 ('vẫn', '여전히', None),
]
NEW_IMG = {'phim tình cảm': 'c22-phim-tinh-cam.webp', 'tám giờ đúng': 'c22-tam-gio-dung.webp', 'hai lần': 'c22-hai-lan.webp', 'hết game': 'c22-het-game.webp', 'trung tâm mua sắm': 'c22-trung-tam-mua-sam.webp'}
KR_FIX = {'hết game': '헷 게임'}
C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
if any(d.get('label') == 'B반 10/8 단어 시험' for d in C['days']): raise SystemExit('이미 들어 있음')
found = {}
def put(w):
    k = N(w.get('vi', ''))
    if k not in found and w.get('vi'): found[k] = w
for d in C['days']:
    for w in d['words']: put(w)
G = json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))
for s in G['sources']:
    for l in s['lessons']:
        for w in l['words']: put(w)
D = json.loads((R / 'data/days.json').read_text(encoding='utf-8'))
for d in D['days']:
    for w in d['words']: put(w)
O = json.loads((R / 'data/order.json').read_text(encoding='utf-8'))
for v in O['vols']:
    for t in v.get('tracks', []):
        for ch in t.get('chapters', []):
            for l in ch.get('lessons', []):
                for w in l.get('words', []): put(w)
words = []
for vi, ko, ex in W:
    old = found.get(N(vi))
    if vi in NEW_IMG: assert not old, vi
    else: assert old, ('앱에 없음', vi)
    img = NEW_IMG.get(vi) or old.get('img')
    if ex is None:
        oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
    kr = KR_FIX.get(vi) or (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
    w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'img': img}
    if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
    words.append(w)
assert len(words) == 41 and len({N(w['vi']) for w in words}) == 41
C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': 'B반 10/8 단어 시험', 'words': words})
(R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
print('cohort22 회차', len(C['days']), '· b14 낱말', len(words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
S = [
 (1, 'Anh BJ là bạn thân của anh Seung Bin à?', '봉준이 형이 승빈이 형의 친한 친구야? (à 써서)', '', '시험지 고침: SB → Seung Bin'),
 (2, 'Hôm nay thời tiết thế nào?', '오늘 날씨 어때?', '', '시험지'),
 (3, 'Cô thấy lạnh nhưng tốt hơn nóng.', '선생님은 춥다고 느끼지만 더운 것보다 낫다고 느낀다.', 'Cô thấy lạnh nhưng tốt hơn là nóng.', '시험지'),
 (4, 'Đặc biệt, bia tươi rất ngon.', '특히 여기 생맥주가 아주 맛있어. (rất 사용)', 'Đặc biệt, bia tươi ở đây rất ngon.', '시험지'),
 (5, 'Trước khi nghe, cô cho các em 3 phút chuẩn bị.', '듣기 전에 선생님이 여러분에게 3분의 준비 시간을 줄게요.', '', '시험지'),
 (6, 'Văn phòng của GYBM ở đâu?', 'GYBM 사무실은 어디에 있어요?', '', '시험지 고침: Văng → Văn'),
 (7, 'Hút thuốc nhiều có thể chết sớm.', '담배를 많이 피우면 빨리 죽을 수 있다.', '', '시험지'),
 (8, 'Muốn biết lý do hôm qua chị May không đến lớp.', '어제 마이 누나가 수업에 오지 않은 이유를 알고 싶다. (주어 없이 해도 됨)', 'Tôi muốn biết lý do hôm qua chị May không đến lớp. / Em muốn biết lý do hôm qua chị May không đến lớp.', '시험지'),
 (9, 'Em thấy', '내가 보기에는', 'Theo em', "시험지 고침: 답지의 'em nhìn thấy' 는 눈으로 보다 → 생각을 말할 땐 em thấy / Theo em"),
 (10, 'Anh nhìn thấy em đi bộ với ai đó. Đó là ai?', '오빠가 네가 누군가와 함께 걷는 걸 봤어. 그 사람은 누구야?', '', '시험지'),
]
tsv = R / 'tools/daily22/문장.tsv'
txt = tsv.read_text(encoding='utf-8')
if '\nb14\t' not in txt:
    txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join(['b14', str(n), 'to_vi', vi, ko, alt, src]) for n, vi, ko, alt, src in S) + '\n'
    tsv.write_text(txt, encoding='utf-8'); print('문장 10 더함')
bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
if "'10/8'" not in s:
    s = s.replace("'10/6', '10/7']", "'10/6', '10/7', '10/8']", 1); assert "'10/8'" in s
if "'b14'" not in s:
    s = s.replace("DIRS = {'b13':", "DIRS = {'b14': ('to_vi', {'vẫn'}), 'b13':", 1); assert "'b14'" in s
bp.write_text(s, encoding='utf-8'); print('build.py DATES·DIRS ok')
