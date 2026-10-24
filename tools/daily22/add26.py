# -*- coding: utf-8 -*-
"""22기 B반 26회(시험일 10/24, 파일 날짜) — 2026-10-24 대표님 "b26 추가해". b26.pdf(정답 포함): 1~20 베→한, 21~40 한→베, 문장 1~5 베→한 · 6~10 한→베.
정답지 뜻 두 개는 다듬음: ngạc nhiên '놀라게 하다'→'놀라다', tự tin '자신감'→'자신 있다, 자신감'. 쓰기: python3 tools/daily22/add26.py"""
import json, pathlib, sys, unicodedata as U
B26 = [('giải thích', '설명하다', 'to_ko', []), ('kinh nghiệm', '경험', 'to_ko', []), ('lo lắng', '걱정하다', 'to_ko', []), ('luyện', '연습하다', 'to_ko', []), ('ngạc nhiên', '놀라다', 'to_ko', []), ('phiên dịch', '통역하다, 통역사', 'to_ko', []), ('tự tin', '자신 있다, 자신감', 'to_ko', []), ('vắng khách', '손님이 적다, 한산하다', 'to_ko', []), ('ý kiến', '의견', 'to_ko', []), ('cuối tuần', '주말', 'to_ko', []), ('dọn dẹp', '청소하다', 'to_ko', []), ('đặt', '예약하다', 'to_ko', []), ('gọi điện thoại', '전화하다', 'to_ko', []), ('hẹn', '약속하다', 'to_ko', []), ('khách hàng', '고객', 'to_ko', []), ('máy bay', '비행기', 'to_ko', []), ('mời', '초대하다', 'to_ko', []), ('sinh nhật', '생일', 'to_ko', []), ('thức khuya', '밤늦게까지 깨어 있다', 'to_ko', []), ('trước khi', '~하기 전에', 'to_ko', []), ('mẹ', '어머니', 'to_vi', []), ('bà ngoại', '외할머니', 'to_vi', []), ('lỗi', '실수', 'to_vi', []), ('tuổi', '나이', 'to_vi', []), ('từ', '단어', 'to_vi', []), ('nấu ăn', '요리하다', 'to_vi', []), ('từ từ', '점점, 차츰', 'to_vi', []), ('tác giả', '저자, 작가', 'to_vi', []), ('thỉnh thoảng', '가끔', 'to_vi', []), ('thường', '보통', 'to_vi', []), ('đi công tác', '출장 가다', 'to_vi', []), ('xe lửa', '기차', 'to_vi', ['tàu hỏa']), ('vé', '표, 티켓', 'to_vi', []), ('thứ hai', '월요일', 'to_vi', []), ('tuần trước', '지난주', 'to_vi', []), ('tuần sau', '다음 주', 'to_vi', ['tuần tới']), ('tuần này', '이번 주', 'to_vi', []), ('ba mẹ', '부모님', 'to_vi', ['bố mẹ']), ('nhớ', '기억하다', 'to_vi', []), ('rửa mặt', '세수하다', 'to_vi', [])]
S = {'b26': [(1, 'to_ko', 'Anh Brian không nói được tiếng Hàn.', '브라이언 씨는 한국어를 할 수 없어요.', ''), (2, 'to_ko', 'Anh ấy đã đi công tác chưa chị?', '그는 이미 출장을 갔나요?', ''), (3, 'to_ko', 'Hôm nay là thứ mấy?', '오늘은 무슨 요일이에요?', ''), (4, 'to_ko', 'Sinh nhật chị là ngày nào?', '당신의 생일은 며칠이에요?', ''), (5, 'to_ko', 'Em mới học tiếng Việt một tháng.', '저는 베트남어를 배운 지 막 한 달이 됐어요.', ''), (6, 'to_vi', 'Cô ấy nói được tiếng Anh.', '그녀는 영어를 할 수 있어요.', ''), (7, 'to_vi', 'Ngày mai là thứ bảy.', '내일은 토요일이에요.', ''), (8, 'to_vi', 'Bao giờ chị đi Hà Nội?', '당신은 언제 하노이에 가요?', ''), (9, 'to_vi', 'Chúng ta luyện phát âm đi!', '우리 같이 발음 연습해요!', ''), (10, 'to_vi', 'Tôi đặt xong rồi.', '저는 이미 예약을 끝냈어요.', '')]}
IMG = {}
EX = {}
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
def main():
    C = json.loads((R / 'data/cohort22.json').read_text(encoding='utf-8'))
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
    for v in json.loads((R / 'data/order.json').read_text(encoding='utf-8'))['vols']:
        for t in v.get('tracks', []):
            for ch in t.get('chapters', []):
                for l in ch.get('lessons', []):
                    for w in l.get('words', []): put(w)
    for key, label, W in (('b26', 'B반 10/24 단어 시험', B26),):
     if any(d.get('label') == label for d in C['days']): print(key, '이미 들어 있음'); continue
     if True:
        words = []
        for vi, ko, dr, alt in W:
            ex = img = None
            img = IMG.get(vi)
            old = found.get(N(vi))
            if img: assert (R / 'img' / img).exists(), ('그림 없음', img)
            img = img or (old.get('img') if old else None)   # 그림이 아직 없는 낱말은 그림 없이 (대표님 2026-10-19 "일단 이미지 없이 올려줘") — 그림은 뒤에 붙인다
            if ex is None and old:
                oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
            if vi in EX: ex = EX[vi]
            kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
            w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'dir': dr}
            if img: w['img'] = img
            if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
            if alt: w['alt'] = alt
            words.append(w)
        assert len(words) == 40, (key, len(words)); assert len({N(w['vi']) for w in words}) == 40, '낱말 겹침'
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'key': key, 'words': words})   # key 를 적는다 — A반 21회가 없어 차례로 세면 a21 이 된다
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
    (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/24'" not in s:
        s = s.replace("'10/22', '10/23']", "'10/22', '10/23', '10/24']", 1); assert "'10/24'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
