# -*- coding: utf-8 -*-
"""A반 17~19회 바로잡기 (2026-10-16, 대표님 "a반 시험 중복이었지? a17 18 19 파일 다시 확인하고 적용해줘").
전: a17.pdf 가 a16.pdf 와 같은 파일이라 a17 = a16 복사본(add_a17.py), a18 = 문제지(bối rối …, adda18.py), a19 = 정답지(giỏi …, adda19.py)로 넣었다.
대표님이 파일을 다시 넣음(10-16): a17.pdf = 문제지(bối rối …), a18.pdf = 정답지(giỏi …), a19.pdf = 새 정답지(gia sư …).
→ ① a16 복사본 회차를 지운다 ② 문제지 회차를 a17(10/14), 정답지 회차를 a18(10/15)로 이름을 옮긴다(문장.tsv 열쇠도) ③ 새 a19(10/16)를 넣는다.
add_a17.py 는 지웠고, adda18.py·adda19.py 는 이 파일 앞의 기록(다시 돌리지 말 것 — 라벨이 옛 것).
새 a19: 낱말 40 모두 영어 뜻 → 베트남어(to_vi), 문장 1~5 베→뜻 · 6~10 영→베. 앱에 없던 gia sư·tâm hồn·học thuộc·khi còn nhỏ 는 Draw Things 그림, kệ sách 은 giá sách 그림,
나머지 이은 말(qua việc·rất tự nhiên·bằng cách·làm quen với·cứ làm đi·học lại·dễ hơn)은 구성 낱말 그림. 'từ'(낱말)·'sáng'(밝다)은 앱의 다른 뜻(~부터·아침)이라 그림 따로. 쓰기: python3 tools/daily22/fix_a17_19.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
A19 = [(v, k, ex, img, alt) for v, k, ex, img, alt in [
 ('gia sư', '과외 선생님', ('Tôi học tiếng Việt với một gia sư.', '저는 과외 선생님과 베트남어를 배워요.'), 'c22-gia-su.webp', []),
 ('tin tức', '뉴스', None, None, []), ('thường', '보통', None, None, []),
 ('tâm hồn', '영혼, 마음', ('Cô ấy có một tâm hồn đẹp.', '그녀는 아름다운 마음을 가졌어요.'), 'c22-tam-hon.webp', []),
 ('em bé', '아기', None, None, []), ('ý kiến', '의견', None, None, []),
 ('kệ sách', '책꽂이', ('Kệ sách của tôi có nhiều sách tiếng Việt.', '제 책꽂이에는 베트남어 책이 많아요.'), 'b-gia-sach.webp', ['giá sách', 'tủ sách']),
 ('học thuộc', '외우다', ('Em học thuộc từ mới mỗi ngày.', '저는 매일 새 낱말을 외워요.'), 'c22-hoc-thuoc.webp', ['học thuộc lòng']),
 ('thứ sáu', '금요일', None, None, []), ('phức tạp', '복잡하다', None, None, []),
 ('qua việc', '~을 통해서', ('Tôi học tiếng Việt qua việc xem phim.', '저는 영화를 보면서(보는 것을 통해) 베트남어를 배워요.'), 'b-qua.webp', ['qua']),
 ('thuê nhà', '집을 빌리다', None, None, []), ('thứ năm', '목요일', None, None, []), ('khi nào', '언제', None, None, ['bao giờ']),
 ('rất tự nhiên', '아주 자연스럽게', ('Anh ấy nói tiếng Việt rất tự nhiên.', '그는 베트남어를 아주 자연스럽게 말해요.'), 'b-tu-nhien.webp', ['tự nhiên']),
 ('bằng cách', '~하는 방법으로', ('Tôi học từ mới bằng cách viết nhiều lần.', '저는 여러 번 써 보는 방법으로 새 낱말을 배워요.'), 'b-cach.webp', []),
 ('vé', '표', None, None, []), ('máy bay', '비행기', None, None, []),
 ('làm quen với', '~와 친해지다, 사귀다', ('Tôi muốn làm quen với bạn.', '당신과 친해지고 싶어요.'), 'w-8f72249c1d.webp', ['làm quen']),
 ('đi công tác', '출장 가다', None, None, []),
 ('từ', '낱말, 단어', None, 'b-tu-vung.webp', []),
 ('cứ làm đi', '그냥 해 봐', ('Đừng lo, cứ làm đi!', '걱정 말고 그냥 해 봐!'), 'w-d1f3be17fc.webp', []),
 ('cá heo', '돌고래', None, None, []),
 ('học lại', '다시 배우다', ('Bài này khó, tôi phải học lại.', '이 과는 어려워서 다시 배워야 해요.'), 'b-hoc.webp', []),
 ('dễ hơn', '더 쉽다', ('Bài này dễ hơn bài trước.', '이 과는 앞 과보다 더 쉬워요.'), 'w-edeaa48094.webp', []),
 ('sức khỏe', '건강', None, None, ['sức khoẻ']), ('định', '~할 계획이다', None, None, []),
 ('thứ hai', '월요일', None, None, []), ('thứ tư', '수요일', None, None, []), ('hẹp', '좁다', None, None, []), ('rộng', '넓다', None, None, []),
 ('mắt', '눈', None, None, []), ('cầu thủ', '축구 선수', None, None, []), ('thử', '해 보다', None, None, []), ('tàu hỏa', '기차', None, None, ['xe lửa']),
 ('trên mạng', '온라인, 인터넷에서', None, None, []),
 ('sáng', '밝다', ('Phòng này rất sáng.', '이 방은 아주 밝아요.'), 'b-sang-sua.webp', []),
 ('năm học', '학년도, 학기', None, None, []), ('nghỉ hè', '여름방학', None, None, []),
 ('khi còn nhỏ', '어렸을 때', ('Khi còn nhỏ, tôi sống ở quê.', '어렸을 때 저는 시골에 살았어요.'), 'c22-khi-con-nho.webp', ['hồi nhỏ', 'lúc nhỏ'])]]
S19 = [(1, 'to_ko', 'Chị thức dậy sớm quá!', '정말 일찍 일어나시네요!', ''),
 (2, 'to_ko', 'Bây giờ là mấy giờ?', '지금 몇 시예요?', ''),
 (3, 'to_ko', 'Bao giờ chị đi Nha Trang?', '언제 나트랑에 가요?', ''),
 (4, 'to_ko', 'MJ là một người đàn ông không biết bỏ cuộc.', 'MJ 는 포기를 모르는 남자예요.', ''),
 (5, 'to_ko', 'Chị ngồi đây đi!', '여기 앉으세요!', ''),
 (6, 'to_vi', 'Anh ấy sẽ đợi tôi bao lâu nữa?', '그는 저를 얼마나 더 기다릴까요?', 'Anh ấy sẽ chờ tôi bao lâu nữa?'),
 (7, 'to_vi', 'Các bạn nghỉ một chút đi!', '여러분, 잠깐 쉬세요!', ''),
 (8, 'to_vi', 'Đừng cười tôi!', '저를 비웃지 마세요!', 'Đừng cười tôi.'),
 (9, 'to_vi', 'Nó không đến lớp bao giờ?', '그 아이는 언제 수업에 안 왔어요?', 'Bao giờ nó không đến lớp?'),
 (10, 'to_vi', 'Em học MBA vào thứ mấy?', '무슨 요일에 MBA 수업을 들어요?', 'Em học MBA thứ mấy?')]

def main():
    C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
    lab = lambda d: d['label']
    if not any(lab(d) == 'A반 10/16 단어 시험' and d['words'][0]['vi'] == 'gia sư' for d in C['days']):
        a16 = next(d for d in C['days'] if lab(d) == 'A반 10/13 단어 시험')
        dup = next((d for d in C['days'] if lab(d) == 'A반 10/14 단어 시험' and [w['vi'] for w in d['words']] == [w['vi'] for w in a16['words']]), None)
        if dup: C['days'].remove(dup); print('a16 복사본 회차 지움 (no', dup['no'], ')')
        for d in C['days']:
            if lab(d) == 'A반 10/15 단어 시험' and d['words'][20]['vi'] == 'bối rối': d['label'] = 'A반 10/14 단어 시험'; print('문제지 → a17 10/14')
            elif lab(d) == 'A반 10/16 단어 시험' and d['words'][0]['vi'] == 'giỏi': d['label'] = 'A반 10/15 단어 시험'; print('정답지 → a18 10/15')
        found = {}
        def put(w):
            k = N(w.get('vi', ''))
            if k and k not in found: found[k] = w
        for d in C['days']:
            for w in d['words']: put(w)
        for s in json.loads((R / 'data/gybm.json').read_text(encoding='utf-8'))['sources']:
            for l in s['lessons']:
                for w in l['words']: put(w)
        for d in json.loads((R / 'data/days.json').read_text(encoding='utf-8'))['days']:
            for w in d['words']: put(w)
        words = []
        for vi, ko, ex, img, alt in A19:
            old = found.get(N(vi))
            if img: assert (R / 'img' / img).exists(), ('그림 없음', img)
            else: assert old and old.get('img'), ('앱에 없음', vi)
            img = img or old.get('img')
            if ex is None and old and not (img and vi in ('từ', 'sáng')):
                oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
            if vi == 'từ' and ex is None: ex = ('Tôi chưa biết từ này.', '저는 이 낱말을 아직 몰라요.')
            kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
            w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'img': img, 'dir': 'to_vi'}
            if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
            if alt: w['alt'] = alt
            words.append(w)
        assert len(words) == 40
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': 'A반 10/16 단어 시험', 'words': words})
        C['days'].sort(key=lambda d: d['no'])
        (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8'); print('새 a19 낱말 40')
    tsv = R / 'tools/daily22/문장.tsv'; lines = tsv.read_text(encoding='utf-8').rstrip('\n').split('\n')
    if not any(l.startswith('a19\t1\tto_ko\tChị thức dậy') for l in lines):
        out = []
        for l in lines:
            if l.startswith('a17\t'): continue                       # a16 복사본 문장
            if l.startswith('a18\t'): l = 'a17' + l[3:]
            elif l.startswith('a19\t'): l = 'a18' + l[3:]
            out.append(l)
        out += ['\t'.join(['a19', str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in S19]
        tsv.write_text('\n'.join(out) + '\n', encoding='utf-8'); print('문장.tsv a17·a18 옮기고 a19 더함')
if __name__ == '__main__':
    main()
