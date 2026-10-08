# -*- coding: utf-8 -*-
"""22기 B반 15회(b15.docx, 시험일 10/9) → cohort22.json 회차 + 문장.tsv + build.py DIRS. 2026-10-08 밤 대표님 "a15, b15 아직 안 넣었냐? 10/9 단어 시험".
시험지(정답지) 표: [1~20] 한국어 → 베트남어(to_vi), [21~40] 베트남어 → 한국어(to_ko). 뜻은 시험지의 한국어 그대로.
sáng(밝다)·tối(어둡다)는 앱의 sáng·tối 가 '아침·저녁'이라 뜻·예문·그림을 이 회차용으로 새로. cao·thấp 는 '높다·낮다'.
앱에 없던 dậy muộn·ngủ muộn·ngủ sớm 은 예문·그림(Draw Things)·소리 새로. 예문이 길거나 조각이거나 뜻이 다른 것(to·đắt·mở·đóng·xấu·thay quần áo·dậy sớm)은 짧게 새로 썼다.
서술형 10: 1~5 한→베(to_vi), 6~10 베→한(to_ko). 1·4·5 는 em/tôi 꼴 둘 다 받는다(alt)."""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
# (베트남어, 한국어 뜻(시험지), 새 예문 or None, 새 그림 or None)
W = [
 ('vui', '기쁘다', None, None), ('buồn', '슬프다', None, None),
 ('to', '크다', ('Nhà của bạn tôi rất to.', '제 친구의 집은 아주 커요.'), None), ('nhỏ', '작다', None, None),
 ('đắt', '비싸다', ('Cái áo này đắt quá.', '이 옷은 너무 비싸요.'), None), ('rẻ', '싸다', None, None),
 ('bận', '바쁘다', None, None), ('rảnh', '한가하다', None, None), ('nhanh', '빠르다', None, None), ('chậm', '느리다', None, None),
 ('viết', '쓰다(글을)', None, None), ('đọc', '읽다', None, None), ('mua', '사다', None, None), ('bán', '팔다', None, None),
 ('mở', '열다', ('Anh mở cửa giúp tôi nhé.', '문 좀 열어 주세요.'), None),
 ('đóng', '닫다', ('Em đóng cửa sổ giúp anh nhé.', '창문 좀 닫아 줘.'), None),
 ('bật', '켜다', None, None), ('tắt', '끄다', None, None), ('cười', '웃다', None, None), ('khóc', '울다', None, None),
 ('yêu', '사랑하다', None, None), ('ghét', '싫어하다', None, None),
 ('sáng', '밝다', ('Phòng này rất sáng.', '이 방은 아주 밝아요.'), 'c22-sang-bright.webp'),
 ('tối', '어둡다', ('Trời tối rồi, chúng ta về nhà đi.', '날이 어두워졌어요, 우리 집에 가요.'), 'c22-toi-dark.webp'),
 ('cao', '높다', None, None), ('thấp', '낮다', None, None), ('ngắn', '짧다', None, None), ('dài', '길다', None, None),
 ('đẹp', '아름답다', None, None), ('xấu', '못생기다', ('Cái áo này hơi xấu.', '이 옷은 좀 안 예뻐요.'), None),
 ('thức dậy', '일어나다', None, None), ('đánh răng', '이를 닦다', None, None), ('đi tắm', '샤워하다', None, None),
 ('thay quần áo', '옷 갈아입다', ('Tôi thay quần áo rồi đi làm.', '저는 옷을 갈아입고 출근해요.'), None),
 ('dậy muộn', '늦게 일어나다', ('Chủ nhật tôi thường dậy muộn.', '일요일에 저는 보통 늦게 일어나요.'), 'c22-day-muon.webp'),
 ('dậy sớm', '일찍 일어나다', ('Hôm nay tôi dậy sớm.', '오늘 저는 일찍 일어났어요.'), None),
 ('ngủ muộn', '늦게 자다', ('Tối qua tôi ngủ muộn.', '어젯밤 저는 늦게 잤어요.'), 'c22-ngu-muon.webp'),
 ('ngủ sớm', '일찍 자다', ('Tôi mệt nên tối nay tôi ngủ sớm.', '피곤해서 오늘 밤 저는 일찍 자요.'), 'c22-ngu-som.webp'),
 ('thức khuya', '늦게까지 깨어 있다', None, None), ('đi ngủ', '자러 가다', None, None),
]
TO_VI = {w[0] for w in W[:20]}
LABEL = 'B반 10/9 단어 시험'
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
assert len(words) == 40 and len({N(w['vi']) for w in words}) == 40
C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': LABEL, 'words': words})
(R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
print('cohort22 회차', len(C['days']), '· b15 낱말', len(words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
S = [
 (1, 'to_vi', 'Em thường thức dậy lúc mấy giờ?', '너는 보통 몇 시에 일어나?', 'Bạn thường thức dậy lúc mấy giờ?', '시험지'),
 (2, 'to_vi', 'Bài tập khó quá hả?', '이 숙제 너무 어렵죠? (hả 써서)', 'Bài tập này khó quá hả?', '시험지'),
 (3, 'to_vi', 'Tôi thấy hơi đói.', '저는 조금 배고파요. (hơi 써서)', 'Tôi hơi đói.', '시험지'),
 (4, 'to_vi', 'Vì em muốn tìm việc ở Việt Nam nên em học tiếng Việt chăm chỉ.', '저는 베트남에서 일자리를 구하고 싶어서 베트남어를 열심히 공부해요. (vì ~ nên)', 'Vì tôi muốn tìm việc ở Việt Nam nên tôi học tiếng Việt chăm chỉ.', '시험지'),
 (5, 'to_vi', 'Em thường đi ngủ lúc 11 giờ tối.', '저는 보통 밤 11시에 자요.', 'Tôi thường đi ngủ lúc 11 giờ tối.', '시험지'),
 (6, 'to_ko', 'Em thường đi học lúc mấy giờ?', '너는 보통 몇 시에 학교에 가?', '', '시험지'),
 (7, 'to_ko', 'Anh đã ăn bún chả hả?', '분짜 먹었어요, 그렇죠?', '', '시험지'),
 (8, 'to_ko', 'Sáng nay tôi hơi khó thức dậy.', '오늘 아침에 일어나기 조금 힘들었어요.', '', '시험지'),
 (9, 'to_ko', 'Tôi hơi buồn ngủ nên tôi đi ngủ.', '저는 조금 졸려서 자러 가요.', '', '시험지'),
 (10, 'to_ko', 'Em dậy muộn nên em đến trường muộn.', '저는 늦게 일어나서 학교에 늦게 도착했어요.', '', '시험지'),
]
tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
if '\nb15\t' not in txt:
    txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join(['b15', str(n), d, vi, ko, alt, src]) for n, d, vi, ko, alt, src in S) + '\n'
    tsv.write_text(txt, encoding='utf-8'); print('문장 10 더함')
bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
if "'b15'" not in s:
    s = s.replace("DIRS = {'a15':", "DIRS = {'b15': ('to_ko', " + repr(sorted(TO_VI)).replace('[', '{').replace(']', '}') + "), 'a15':", 1); assert "'b15'" in s   # b15: 1~20 한→베, 21~40 베→한
bp.write_text(s, encoding='utf-8'); print('build.py DIRS ok')
