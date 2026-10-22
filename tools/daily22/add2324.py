# -*- coding: utf-8 -*-
"""22기 B반 23·24회(시험일 10/21·10/22, 파일 날짜) — 2026-10-22 대표님 "b23, 24 추가". b23.docx(10.19·10.20 통합 정답지): 낱말 40 모두 베→뜻(시험지 낱말 칸이 모두 베트남어),
문장 1~5 한→베 · 6~10 베→한. trẻ trâu 의 '영 버팔로'는 빼고 '철없는 사람, 애송이'. b24.docx(정답 2회): 1~20 한→베 · 21~40 베→한, 문장 1~5 한→베 · 6~10 베→한.
b24 문장 정답의 한글 이름(준석·승빈·보훈·승화)은 베트남어 답으로 칠 수 있게 로마자로. 쓰기: python3 tools/daily22/add2324.py"""
import json, pathlib, sys, unicodedata as U
B23 = [('liên hoan', '회식', 'to_ko', []), ('ăn kiêng', '다이어트하다', 'to_ko', []), ('ban ngày', '낮', 'to_ko', []), ('ban đêm', '밤', 'to_ko', []), ('cẩn thận', '조심하다', 'to_ko', []), ('đồng hồ', '시계', 'to_ko', []), ('phát minh', '발명하다', 'to_ko', []), ('mời', '초대하다', 'to_ko', []), ('đi nhậu', '술 마시러 가다', 'to_ko', []), ('dành', '(시간을) 내다, 쓰다', 'to_ko', []), ('ngày quốc khánh', '국경일(독립 기념일)', 'to_ko', []), ('lễ phục sinh', '부활절', 'to_ko', []), ('lễ tình nhân', '밸런타인데이', 'to_ko', []), ('Giáng Sinh', '크리스마스', 'to_ko', []), ('trả tiền', '돈을 내다, 계산하다', 'to_ko', []), ('đầu tiên', '첫 번째', 'to_ko', []), ('ngày lễ', '휴일, 명절', 'to_ko', []), ('quan trọng nhất', '가장 중요한', 'to_ko', []), ('ngày thường', '평일', 'to_ko', []), ('chơi thể thao', '운동하다', 'to_ko', []), ('cuối năm', '연말', 'to_ko', []), ('ghen tị', '질투하다, 부러워하다', 'to_ko', []), ('mất', '잃다, 돌아가시다', 'to_ko', []), ('trúng xổ số', '복권에 당첨되다', 'to_ko', []), ('hoàng hôn', '해 질 녘, 노을', 'to_ko', []), ('bạn gái', '여자 친구', 'to_ko', []), ('nhanh quá', '너무 빠르다', 'to_ko', []), ('giảm giá', '할인하다', 'to_ko', []), ('nhìn nhau', '서로 바라보다', 'to_ko', []), ('trận chung kết', '결승전', 'to_ko', []), ('chuyến bay', '항공편', 'to_ko', []), ('khởi hành', '출발하다', 'to_ko', []), ('trẻ trâu', '철없는 사람, 애송이', 'to_ko', []), ('rộng', '넓다', 'to_ko', []), ('hẹp', '좁다', 'to_ko', []), ('ngon', '맛있다', 'to_ko', []), ('dở', '맛없다, 서툴다', 'to_ko', []), ('gầy', '마르다', 'to_ko', []), ('béo', '뚱뚱하다', 'to_ko', []), ('ồn ào', '시끄럽다', 'to_ko', [])]
B24 = [('chồng', '남편', 'to_vi', []), ('vợ', '아내', 'to_vi', []), ('con trai', '아들', 'to_vi', []), ('con gái', '딸', 'to_vi', []), ('con cả', '첫째', 'to_vi', []), ('con út', '막내', 'to_vi', []), ('con một', '외동', 'to_vi', []), ('chị gái', '언니, 누나', 'to_vi', []), ('em gái', '여동생', 'to_vi', []), ('em trai', '남동생', 'to_vi', []), ('anh trai', '형, 오빠', 'to_vi', []), ('em trai út', '막내 남동생', 'to_vi', []), ('lập gia đình', '결혼하다', 'to_vi', ['kết hôn']), ('độc thân', '미혼, 싱글', 'to_vi', []), ('về hưu', '은퇴하다', 'to_vi', []), ('mất', '돌아가시다', 'to_vi', []), ('về nước', '귀국하다', 'to_vi', []), ('công tác', '출장', 'to_vi', []), ('xe lửa', '기차', 'to_vi', ['tàu hỏa']), ('chủ nhật', '일요일', 'to_vi', []), ('đón', '데리러 가다, 마중하다', 'to_ko', []), ('gọi', '부르다, 전화하다', 'to_ko', []), ('trở lại', '돌아가다, 돌아오다', 'to_ko', []), ('đặt', '예약하다', 'to_ko', []), ('vé', '표, 티켓', 'to_ko', []), ('hẹn hò', '데이트하다', 'to_ko', []), ('chúc mừng', '축하하다', 'to_ko', []), ('nhớ', '기억하다', 'to_ko', []), ('giải thích', '설명하다', 'to_ko', []), ('trả', '지불하다, 돌려주다', 'to_ko', []), ('vẽ tranh', '그림을 그리다', 'to_ko', []), ('dọn dẹp', '청소하다', 'to_ko', []), ('cần', '필요하다', 'to_ko', []), ('vẫn', '여전히, 아직도', 'to_ko', []), ('rảnh', '한가하다', 'to_ko', []), ('khó tính', '성격이 까다롭다', 'to_ko', []), ('lớn', '크다, 나이가 많다', 'to_ko', []), ('nhất', '가장, 제일', 'to_ko', []), ('đầu tiên', '처음, 첫 번째', 'to_ko', []), ('thứ hai tuần sau', '다음 주 월요일', 'to_ko', [])]
S = {'b23': [(1, 'to_vi', 'Cuối năm em có kế hoạch gì không?', '연말에 무슨 계획이 있어?', ''), (2, 'to_vi', 'Cẩn thận, hôm nay có mưa đấy!', '조심해, 오늘 비 온다니까!', ''), (3, 'to_vi', 'Ở Hàn Quốc, khi hẹn hò, ai trả tiền?', '한국에서는 데이트할 때 누가 돈을 내나요?', ''), (4, 'to_vi', 'Bạn thường chơi thể thao lúc nào?', '당신은 보통 언제 운동을 하나요?', 'Bạn thường chơi thể thao khi nào?'), (5, 'to_vi', 'Sau khi nghe bài học, em ôn tập hàng ngày.', '수업을 듣고 난 뒤에 저는 늘 복습해요.', 'Sau khi nghe bài học, em luôn ôn tập.'), (6, 'to_ko', 'Nhanh quá! Cuối tuần này bạn có hẹn không?', '시간 진짜 빠르다! 이번 주말에 약속 있어?', ''), (7, 'to_ko', 'Tôi muốn trúng xổ số lúc 37 tuổi.', '나는 37살에 복권에 당첨되고 싶어.', ''), (8, 'to_ko', 'Chuyến bay VN171 sẽ khởi hành lúc 20 giờ 35 phút.', 'VN171 항공편은 20시 35분에 출발할 예정입니다.', ''), (9, 'to_ko', 'Khi trở lại Thành phố Hồ Chí Minh, chị Vân gặp Hiroki.', '호찌민시로 돌아왔을 때 번 씨는 히로키를 만났어요.', ''), (10, 'to_ko', 'Nhưng ngày lễ quan trọng nhất là Tết âm lịch vào tháng 1 hay tháng 2 dương lịch.', '하지만 가장 중요한 명절은 양력 1월이나 2월에 있는 음력 설이에요.', '')], 'b24': [(1, 'to_vi', 'Ai ít tuổi nhất ở lớp B?', '누가 B반에서 제일 나이가 어려요?', 'Ai nhỏ tuổi nhất ở lớp B?'), (2, 'to_vi', 'Ai bằng tuổi ai?', '누가 누구와 동갑이에요?', ''), (3, 'to_vi', 'Jun Seok và Seung Bin, ai nhiều tuổi hơn?', '준석과 승빈 중에 누가 나이가 더 많아요?', 'Jun Seok và Seung Bin, ai lớn tuổi hơn?'), (4, 'to_vi', 'Bo Hun lớn hơn Seung Hwa mấy tuổi?', '보훈은 승화보다 몇 살 많아요?', ''), (5, 'to_vi', 'Gia đình tôi có 3 người.', '저희 가족은 3명이에요.', 'Gia đình tôi có ba người.'), (6, 'to_ko', 'Bố bạn bao nhiêu tuổi?', '너희 아버지는 몇 살이셔?', ''), (7, 'to_ko', 'Nhà bạn có mấy anh em?', '너희 집은 형제가 몇 명이야?', ''), (8, 'to_ko', 'Nhà tôi có 2 anh em. Tôi là con út.', '우리 집은 2형제예요. 저는 막내예요.', ''), (9, 'to_ko', 'Bạn đã kết hôn chưa?', '결혼하셨어요?', ''), (10, 'to_ko', 'Sehyeon cũng sẽ uống cà phê với gia đình.', '세현도 가족과 커피를 마실 거예요.', '')]}
IMG = {'liên hoan': 'b23-lien-hoan.webp', 'phát minh': 'b23-phat-minh.webp', 'đi nhậu': 'b23-di-nhau.webp', 'ngày quốc khánh': 'b23-quoc-khanh.webp', 'lễ phục sinh': 'b23-phuc-sinh.webp', 'lễ tình nhân': 'b23-tinh-nhan.webp', 'quan trọng nhất': 'b23-quan-trong-nhat.webp', 'trúng xổ số': 'b23-trung-xo-so.webp', 'nhanh quá': 'b23-nhanh-qua.webp', 'nhìn nhau': 'b23-nhin-nhau.webp', 'trẻ trâu': 'b23-tre-trau.webp', 'thứ hai tuần sau': 'b24-thu-hai-tuan-sau.webp'}   # 2026-10-22 Draw Things (다음 주 월요일은 달력 머리의 엉터리 영어 글자를 하얗게 지움)
EX = {'liên hoan': ('Tối nay công ty có liên hoan.', '오늘 저녁에 회사 회식이 있어요.'), 'phát minh': ('Ai đã phát minh ra điện thoại?', '누가 전화기를 발명했어요?'), 'đi nhậu': ('Cuối tuần anh ấy hay đi nhậu với bạn.', '주말에 그는 친구들과 자주 술 마시러 가요.'), 'ngày quốc khánh': ('Ngày quốc khánh Việt Nam là ngày 2 tháng 9.', '베트남 국경일은 9월 2일이에요.'), 'lễ phục sinh': ('Lễ Phục sinh thường vào tháng 3 hoặc tháng 4.', '부활절은 보통 3월이나 4월이에요.'), 'lễ tình nhân': ('Vào lễ Tình nhân, anh ấy tặng hoa cho bạn gái.', '밸런타인데이에 그는 여자 친구에게 꽃을 선물해요.'), 'quan trọng nhất': ('Sức khỏe là quan trọng nhất.', '건강이 가장 중요해요.'), 'trúng xổ số': ('Anh ấy trúng xổ số rồi!', '그가 복권에 당첨됐어요!'), 'nhanh quá': ('Thời gian trôi nhanh quá!', '시간이 너무 빨리 가요!'), 'nhìn nhau': ('Hai người nhìn nhau và cười.', '두 사람은 서로 바라보며 웃었어요.'), 'trẻ trâu': ('Đừng nói chuyện như trẻ trâu.', '철없는 애처럼 말하지 마.'), 'thứ hai tuần sau': ('Thứ hai tuần sau tôi đi công tác.', '다음 주 월요일에 저는 출장을 가요.')}   # 앱에 예문이 없던 낱말 (클로드가 씀)
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
    for key, label, W in (('b23', 'B반 10/21 단어 시험', B23), ('b24', 'B반 10/22 단어 시험', B24)):
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
    if "'10/22'" not in s:
        s = s.replace("'10/19', '10/20']", "'10/19', '10/20', '10/21', '10/22']", 1); assert "'10/22'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
