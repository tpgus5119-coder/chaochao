# -*- coding: utf-8 -*-
"""22기 A반 14회(a14.pdf, 시험일 10/8) → cohort22.json 28회차 + 문장.tsv + build.py DIRS. 2026-10-08 대표님 "a14 추가해줘".
시험지(답지)는 낱말 40 전부 '베트남어 → 영어 뜻' 꼴 → 베트남어→뜻(to_ko) 40. 'ốm / bị ốm' 은 둘 다 → 41낱말. 영어 뜻은 한국어로.
문장 10: 1~5 베트남어→뜻, 6~10 영어(9번은 한국어)→베트남어.
기존 낱말은 앱 자료의 그림·발음·예문을 쓰되, 예문이 지시문이거나 시험 뜻과 다른 것(gọi 주문·hoạt động·xác nhận·dịch·khoa học)은 새로 썼다. 앱에 없던 nhật ký 는 뜻·예문·그림·소리 새로."""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
W = [
 ('đó', '그것·저기·그 사람', None), ('chuyển', '옮기다·이동하다', None), ('gửi', '보내다', None), ('máy bay', '비행기', None), ('quên', '잊다', None),
 ('trên', '위·~위에', None), ('tiệm', '가게·상점', None), ('sau', '뒤·~후에', None), ('chuẩn bị', '준비하다', None), ('trong', '안·~동안', None),
 ('ốm', '아프다', None), ('bị ốm', '아프다(병이 나다)', None), ('lý do', '이유', None), ('trung tâm', '센터·중심', None), ('để', '~하기 위해', None),
 ('hộ chiếu', '여권', None), ('gọi', '주문하다·부르다', ('Tôi gọi một bát phở.', '저는 쌀국수 한 그릇을 주문해요.')), ('nhà thờ', '성당·교회', None),
 ('thấy', '느끼다·보다·생각하다', None), ('béo', '뚱뚱하다', None), ('tham quan', '관광하다·구경하다', None),
 ('nhật ký', '일기', ('Tôi viết nhật ký mỗi tối.', '저는 매일 밤 일기를 써요.')), ('ngày xưa', '옛날', None),
 ('hoạt động', '활동', ('Cuối tuần lớp tôi có nhiều hoạt động.', '주말에 우리 반은 활동이 많아요.')), ('sắp', '곧', None), ('lên mạng', '인터넷을 하다', None),
 ('cũng được', '그런대로 괜찮다', None), ('bảo tàng', '박물관', None), ('xác nhận', '확인하다', ('Anh xác nhận giúp tôi lịch họp nhé.', '회의 일정을 확인해 주세요.')),
 ('gợi ý', '제안하다·추천하다', None), ('xe buýt', '버스', None), ('có thể', '~할 수 있다', None), ('dịch', '번역하다', ('Tôi dịch câu này sang tiếng Hàn.', '저는 이 문장을 한국어로 번역해요.')),
 ('ngữ pháp', '문법', None), ('tiện lợi', '편리하다', None), ('lấy', '가져가다·받다', None), ('tinh ý', '눈치 빠르다', None),
 ('khoa học', '과학', ('Tôi thích khoa học.', '저는 과학을 좋아해요.')), ('xã hội', '사회', None), ('lên', '올라가다·위로', None), ('xuống', '내려가다·아래로', None),
]
NEW_IMG = {'nhật ký': 'c22-nhat-ky.webp'}
C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
if any(d.get('label') == 'A반 10/8 단어 시험' for d in C['days']): raise SystemExit('이미 들어 있음')
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
    kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
    w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'img': img}
    if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
    words.append(w)
assert len(words) == 41 and len({N(w['vi']) for w in words}) == 41
C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': 'A반 10/8 단어 시험', 'words': words})
(R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
print('cohort22 회차', len(C['days']), '· a14 낱말', len(words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
S = [
 (1, 'to_ko', 'Hôm nay tôi xem một video trên mạng.', '오늘 저는 인터넷에서 영상을 하나 봤어요.', '', '시험지'),
 (2, 'to_ko', 'Bạn đã từng đến bảo tàng này chưa?', '이 박물관에 가 본 적 있어요?', '', '시험지'),
 (3, 'to_ko', 'Ngữ pháp tiếng Việt khó hơn tôi nghĩ.', '베트남어 문법은 제 생각보다 어려워요.', '', '시험지'),
 (4, 'to_ko', 'Tôi muốn đến nhà hàng mà bạn đã gợi ý.', '당신이 추천한 식당에 가고 싶어요.', '', '시험지'),
 (5, 'to_ko', 'Tôi có thể dịch câu này sang tiếng Anh.', '저는 이 문장을 영어로 번역할 수 있어요.', '', '시험지'),
 (6, 'to_vi', 'Tôi rất quan tâm đến xã hội và khoa học.', '저는 사회와 과학에 관심이 많아요.', '', '시험지'),
 (7, 'to_vi', 'Tôi nghĩ sắp mưa rồi.', '곧 비가 올 것 같아요.', '', '시험지'),
 (8, 'to_vi', 'Tôi đã đi xe buýt đến trường.', '저는 버스를 타고 학교에 갔어요.', 'Tôi đã đến trường bằng xe buýt.', '시험지'),
 (9, 'to_vi', 'Anh ấy là người rất tinh ý.', '그는 정말 눈치가 빠른 사람이야.', '', '시험지'),
 (10, 'to_vi', 'Tôi sắp về nhà.', '저는 곧 집에 가요.', '', '시험지'),
]
tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
if '\na14\t' not in txt:
    txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join(['a14', str(n), d, vi, ko, alt, src]) for n, d, vi, ko, alt, src in S) + '\n'
    tsv.write_text(txt, encoding='utf-8'); print('문장 10 더함')
bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
if "'a14'" not in s:
    s = s.replace("DIRS = {'b14':", "DIRS = {'a14': ('to_ko', set()), 'b14':", 1); assert "'a14'" in s   # a14: 답지 꼴 — 낱말 40 전부 베트남어→뜻
bp.write_text(s, encoding='utf-8'); print('build.py DIRS ok')
