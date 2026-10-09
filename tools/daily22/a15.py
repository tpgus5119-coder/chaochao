# -*- coding: utf-8 -*-
"""22기 A반 15회(a15.pdf, 시험일 10/9) → cohort22.json 회차 + 문장.tsv + build.py DATES·DIRS. 2026-10-08 밤 대표님 "a15도 시험 추가해주라".
답지 꼴: 1~20 영어 뜻 → 베트남어(to_vi), 21~40 베트남어 → 영어 뜻(to_ko). 영어 뜻은 한국어로. 'Hơn' 이 11(영→베)·25(베→영) 에 두 번 → 처음엔 39낱말로 넣었고,
2026-10-09 대표님 "왜 39단어냐? 40개 해야지" → cohort22.json 에 25번 hơn 을 dir:'to_ko' 로 따로 넣어 40문항(build.py 가 낱말의 dir 을 따름).
시험지 'Gần đay' 는 gần đây(최근에) 오타 — 앱의 기존 gần đây 는 '근처' 뜻이라 뜻·예문·그림을 이 회차용으로 새로 둔다.
문장 10: 1~5 베트남어→뜻, 6~10 영어→베트남어. 10번 'Anh/chị …' 는 Chị 로 두고 Anh 꼴을 alt 로.
기존 낱말은 앱 자료의 그림·발음·예문을 쓰되, 예문이 관용구·긴 문장·다른 뜻인 것(ngọt·luật·lâu·lo lắng·gần đây)은 새로 썼다. 새 낱말 8 + gần đây(최근) 그림 9장은 Draw Things 로 구움."""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
# (베트남어, 한국어 뜻, 예문(None=앱 것), 그림(None=앱 것))
W = [
 ('dễ tính', '무던하다·까다롭지 않다', ('Cô giáo của tôi rất dễ tính.', '우리 선생님은 아주 무던하세요.'), 'c22-de-tinh.webp'),
 ('khó tính', '까다롭다', None, None), ('mặc', '입다', None, None), ('cay', '맵다', None, None),
 ('đắng', '쓰다(맛)', ('Cà phê này đắng quá.', '이 커피는 너무 써요.'), 'c22-dang.webp'),
 ('ngọt', '달다', ('Trái cây này rất ngọt.', '이 과일은 아주 달아요.'), None),
 ('chán', '지루하다', None, None), ('chuẩn bị', '준비하다', None, None),
 ('bị mắng', '혼나다', ('Hôm qua tôi bị mắng vì đi học trễ.', '어제 저는 학교에 늦어서 혼났어요.'), 'c22-bi-mang.webp'),
 ('mắng', '혼내다·꾸짖다', None, None), ('hơn', '~보다 더', None, None), ('dạo này', '요즘', None, None),
 ('gần đây', '최근에·요즘', ('Gần đây tôi rất bận.', '최근에 저는 아주 바빠요.'), 'c22-gan-day-2.webp'),
 ('hiện nay', '현재·요즘', None, None), ('lười', '게으르다', None, None),
 ('luật', '법', ('Mọi người phải tuân theo luật.', '모든 사람은 법을 따라야 해요.'), None),
 ('quy định', '규정·규칙', None, None), ('luôn luôn', '항상', None, None),
 ('lâu', '오래', ('Tôi đợi anh ấy rất lâu.', '저는 그를 아주 오래 기다렸어요.'), None),
 ('mách', '이르다·고자질하다', ('Em tôi mách mẹ là tôi không học bài.', '동생이 제가 공부를 안 했다고 엄마한테 일렀어요.'), 'c22-mach.webp'),
 ('quảng cáo', '광고', ('Tôi xem quảng cáo trên tivi.', '저는 TV에서 광고를 봐요.'), 'c22-quang-cao.webp'),
 ('ngủ gật', '졸다', None, None),
 ('lo lắng', '걱정하다', ('Mẹ tôi rất lo lắng cho tôi.', '우리 어머니는 저를 많이 걱정하세요.'), None),
 ('phổ biến', '흔하다·대중적이다', None, None),
 ('đứng lên', '일어서다', ('Các em đứng lên chào cô giáo.', '여러분, 일어서서 선생님께 인사하세요.'), 'c22-dung-len.webp'),
 ('ngồi xuống', '앉다', ('Mời anh ngồi xuống.', '앉으세요.'), 'c22-ngoi-xuong.webp'),
 ('không cần', '필요 없다', ('Anh không cần lo lắng.', '걱정할 필요 없어요.'), 'c22-khong-can.webp'),
 ('gầy', '마르다·야위다', None, None), ('béo', '뚱뚱하다', None, None), ('hơi', '조금·약간', None, None),
 ('thời gian', '시간', None, None), ('trước khi', '~하기 전에', None, None), ('thứ bảy', '토요일', None, None),
 ('no', '배부르다', None, None), ('căng tin', '구내식당', None, None), ('thường', '보통·자주', None, None),
 ('tin tức', '뉴스·소식', None, None), ('thức khuya', '밤늦게까지 깨어 있다', None, None), ('một mình', '혼자', None, None),
]
TO_VI = {'dễ tính', 'khó tính', 'mặc', 'cay', 'đắng', 'ngọt', 'chán', 'chuẩn bị', 'bị mắng', 'mắng', 'hơn', 'dạo này', 'gần đây', 'hiện nay',
         'lười', 'luật', 'quy định', 'luôn luôn', 'lâu', 'mách'}   # 시험지 1~20: 영어 뜻 → 베트남어
LABEL = 'A반 10/9 단어 시험'
C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
if any(d.get('label') == LABEL for d in C['days']): raise SystemExit('이미 들어 있음')
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
for vi, ko, ex, img in W:
    old = found.get(N(vi))
    if img: assert (R / 'img' / img).exists(), ('그림 없음', img)
    else: assert old and old.get('img'), ('앱에 없음', vi)
    img = img or old.get('img')
    if ex is None:
        oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
    kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
    w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'img': img}
    if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
    words.append(w)
assert len(words) == 39 and len({N(w['vi']) for w in words}) == 39
C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': LABEL, 'words': words})
(R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
print('cohort22 회차', len(C['days']), '· a15 낱말', len(words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
S = [
 (1, 'to_ko', 'Cô Linh có thích ăn cay không?', '린 선생님은 매운 음식을 좋아하세요?', '', '시험지'),
 (2, 'to_ko', 'Vì buồn ngủ nên em sắp uống cà phê.', '졸려서 저는 곧 커피를 마실 거예요.', '', '시험지'),
 (3, 'to_ko', 'Anh ấy sắp ngủ gật nên tôi gọi anh ấy dậy.', '그가 곧 졸 것 같아서 저는 그를 깨웠어요.', '', '시험지'),
 (4, 'to_ko', 'Tôi không muốn đi ra ngoài.', '저는 밖에 나가고 싶지 않아요.', '', '시험지'),
 (5, 'to_ko', 'Vì chị ấy ăn món ăn em không thích nên em không ăn sáng với chị ấy.', '그녀가 제가 싫어하는 음식을 먹어서 저는 그녀와 아침을 안 먹어요.', '', '시험지'),
 (6, 'to_vi', 'Tôi muốn gọi giao hàng.', '저는 배달을 시키고 싶어요.', '', '시험지'),
 (7, 'to_vi', 'Ở Hàn Quốc tôi dậy lúc 7 giờ sáng.', '한국에서 저는 아침 7시에 일어나요.', '', '시험지'),
 (8, 'to_vi', 'Ở Việt Nam tôi thường học tiếng Việt.', '베트남에서 저는 보통 베트남어를 공부해요.', '', '시험지'),
 (9, 'to_vi', 'Tôi thấy hơi mệt.', '저는 조금 피곤해요.', '', '시험지'),
 (10, 'to_vi', 'Chị thường ăn sáng lúc mấy giờ?', '보통 몇 시에 아침을 먹어요?', 'Anh thường ăn sáng lúc mấy giờ?', '시험지'),
]
tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
if '\na15\t' not in txt:
    txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join(['a15', str(n), d, vi, ko, alt, src]) for n, d, vi, ko, alt, src in S) + '\n'
    tsv.write_text(txt, encoding='utf-8'); print('문장 10 더함')
bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
if "'10/9'" not in s:
    s = s.replace("'10/7', '10/8']", "'10/7', '10/8', '10/9']", 1); assert "'10/9'" in s
if "'a15'" not in s:
    s = s.replace("DIRS = {'a14':", "DIRS = {'a15': ('to_ko', " + repr(sorted(TO_VI)).replace('[', '{').replace(']', '}') + "), 'a14':", 1); assert "'a15'" in s   # a15: 1~20 뜻→베, 21~40 베→뜻
bp.write_text(s, encoding='utf-8'); print('build.py DATES·DIRS ok')
