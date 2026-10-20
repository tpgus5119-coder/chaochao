# -*- coding: utf-8 -*-
"""22기 22회 두 반(시험일 10/20) — 2026-10-20 대표님 "a22, b22 추가해줘". A반 21회 파일은 없다 → 회차 자료에 key 를 적어 a22 로(build.py 가 key 를 먼저 본다).
a22(a반/a22.pdf 정답 포함): 1~20 영어 뜻→베, 21~40 베→뜻, 문장 1~5 베→뜻 · 6~10 영→베. b22(b반/b22.docx 정답 포함): 1~20 영→베(19 rỗi 는 베→뜻), 21~40 베→뜻,
문장 1~5·9 베→뜻 · 6~8·10 영→베. 영어 뜻·번역은 클로드가 한국어로. b22 정답지 6번 'tiếng Anh' 은 문제(He speaks Vietnamese)에 맞게 tiếng Việt 로 고침. 쓰기: python3 tools/daily22/add22.py"""
import json, pathlib, sys, unicodedata as U
A22 = [('quyết định', '결정하다, 결정', 'to_vi', []), ('đột nhiên', '갑자기', 'to_vi', []), ('dị ứng', '알레르기, 알레르기가 있다', 'to_vi', []), ('kinh nghiệm', '경험', 'to_vi', []), ('sợ', '무섭다, 두려워하다', 'to_vi', []), ('hẹn', '약속하다(만남)', 'to_vi', []), ('đặt bàn', '자리를 예약하다', 'to_vi', []), ('bạn thân', '친한 친구', 'to_vi', []), ('dọn dẹp', '청소하다, 정리하다', 'to_vi', []), ('kiệt sức', '기진맥진하다', 'to_vi', []), ('rửa bát', '설거지하다', 'to_vi', ['rửa chén']), ('cầu lông', '배드민턴', 'to_vi', []), ('cảnh báo', '경고하다, 경고', 'to_vi', []), ('cẩn thận', '조심하다, 신중하다', 'to_vi', []), ('nguy hiểm', '위험하다', 'to_vi', []), ('ngoại hình', '외모', 'to_vi', []), ('chúc mừng', '축하하다', 'to_vi', []), ('ý tưởng', '아이디어', 'to_vi', []), ('bỏ cuộc', '포기하다', 'to_vi', []), ('hút thuốc', '담배를 피우다', 'to_vi', []), ('gãi', '긁다(가려운 곳을)', 'to_ko', []), ('thông báo', '알리다, 공지', 'to_ko', []), ('đủ', '충분하다', 'to_ko', []), ('bản thân', '자기 자신', 'to_ko', []), ('suốt', '~ 내내', 'to_ko', []), ('chú ý', '주의하다, 주목하다', 'to_ko', []), ('cảm nhận', '느끼다', 'to_ko', []), ('đối lập', '반대되는, 대립하는', 'to_ko', []), ('kệ', '내버려 두다, 상관하지 않다', 'to_ko', []), ('in', '인쇄하다', 'to_ko', []), ('mắt', '눈', 'to_ko', []), ('ngạc nhiên', '놀라다', 'to_ko', []), ('tự nhiên', '자연스럽다, 자연스럽게', 'to_ko', []), ('lúc đó', '그때', 'to_ko', []), ('chăm sóc', '돌보다', 'to_ko', []), ('sẵn sàng', '준비된', 'to_ko', []), ('người ta', '사람들', 'to_ko', []), ('tác giả', '저자, 글쓴이', 'to_ko', []), ('chỉ ... thôi', '~만, ~뿐', 'to_ko', []), ('hình', '그림, 모양', 'to_ko', [])]
B22 = [('giỏi', '잘하다', 'to_vi', []), ('kém', '못하다, 서툴다', 'to_vi', []), ('vậy', '그래서, 그렇게', 'to_vi', []), ('giùm', '대신 ~해 주다', 'to_vi', []), ('cấp 2', '중학교', 'to_vi', []), ('đeo', '(장신구를) 차다, 끼다', 'to_vi', []), ('trễ', '늦다', 'to_vi', []), ('nên', '~하는 게 좋다, 그래서', 'to_vi', []), ('từ', '낱말', 'to_vi', []), ('nghĩa', '뜻, 의미', 'to_vi', []), ('đơn', '신청서', 'to_vi', []), ('ở đây', '여기', 'to_vi', []), ('tháng', '달, 월', 'to_vi', []), ('từ từ', '천천히, 차차', 'to_vi', ['một chút']), ('khi', '~할 때', 'to_vi', []), ('nhưng', '그러나, 하지만', 'to_vi', []), ('hơn', '더, ~보다', 'to_vi', []), ('đi dạo', '산책하다', 'to_vi', []), ('rỗi', '한가하다(= rảnh)', 'to_ko', []), ('một mình', '혼자', 'to_vi', []), ('giải thích', '설명하다', 'to_ko', []), ('bảo tàng', '박물관', 'to_ko', []), ('luyện', '연습하다', 'to_ko', []), ('trung tâm', '센터, 중심', 'to_ko', []), ('ngại', '어색해하다, 수줍다', 'to_ko', []), ('thuốc', '약', 'to_ko', []), ('sau khi', '~한 후에', 'to_ko', []), ('trước khi', '~하기 전에', 'to_ko', []), ('tin tức', '뉴스, 소식', 'to_ko', []), ('chờ', '기다리다', 'to_ko', []), ('đánh răng', '이를 닦다', 'to_ko', []), ('đường', '길, 거리', 'to_ko', []), ('lỗi', '실수, 잘못', 'to_ko', []), ('làm thêm', '아르바이트하다', 'to_ko', []), ('đừng lo', '걱정하지 마', 'to_ko', []), ('cảm thấy', '느끼다', 'to_ko', []), ('nghe nói', '듣자 하니', 'to_ko', []), ('thường', '보통, 자주', 'to_ko', []), ('thức khuya', '밤늦게까지 깨어 있다', 'to_ko', []), ('ngủ sớm', '일찍 자다', 'to_ko', [])]
S = {'a22': [(1, 'to_ko', 'Lúc anh Min Jun gọi điện cho tôi, tôi đang ngủ.', '민준 씨가 저에게 전화했을 때 저는 자고 있었어요.', ''), (2, 'to_ko', 'Anh Bong Jun thường đi bơi vào sáng chủ nhật.', '봉준 씨는 보통 일요일 아침에 수영하러 가요.', ''), (3, 'to_ko', 'Em Sang Hyun đã làm bài tập chưa?', '상현이는 숙제를 했어요?', ''), (4, 'to_ko', 'Chị Cho Bee đọc cuốn sách đó xong chưa?', '조비 씨는 그 책을 다 읽었어요?', ''), (5, 'to_ko', 'Trong lớp, chị Soo Bin luôn chú ý nghe cô giáo.', '수업 시간에 수빈 씨는 늘 선생님 말씀을 주의 깊게 들어요.', ''), (6, 'to_vi', 'Anh Hui Kwon đã từng chơi cầu lông với bạn Việt Nam.', '희권 씨는 베트남 친구들과 배드민턴을 쳐 본 적이 있어요.', ''), (7, 'to_vi', 'Tin đó làm cho chị Min Jun rất ngạc nhiên.', '그 소식은 민준 씨를 무척 놀라게 했어요.', ''), (8, 'to_vi', 'Chị Hui Joo đến Việt Nam bao giờ?', '희주 씨는 언제 베트남에 왔어요?', ''), (9, 'to_vi', 'Anh Đông Hạ đã làm việc ở công ty này được bao lâu rồi?', '동하 씨는 이 회사에서 일한 지 얼마나 됐어요?', 'Anh Đông Hạ làm việc ở công ty này bao lâu rồi?'), (10, 'to_vi', 'Anh Won Pyo đã chuẩn bị mọi thứ sẵn sàng cho kỳ thi.', '원표 씨는 시험 준비를 다 해 놓았어요.', '')], 'b22': [(1, 'to_ko', 'Em mới học tiếng Việt một tháng.', '저는 베트남어를 배운 지 한 달밖에 안 됐어요.', ''), (2, 'to_ko', 'Bạn nên ngủ sớm, không nên thức khuya.', '일찍 자는 게 좋아요, 밤늦게까지 깨어 있지 마세요.', ''), (3, 'to_ko', 'Trước khi đi ngủ, tôi luôn đánh răng.', '자기 전에 저는 늘 이를 닦아요.', ''), (4, 'to_ko', 'Từ từ em sẽ giỏi hơn.', '차차 더 잘하게 될 거예요.', ''), (5, 'to_ko', 'Em sẽ học bao lâu?', '얼마 동안 공부할 거예요?', ''), (6, 'to_vi', 'Anh ấy nói tiếng Việt rất giỏi.', '그는 베트남어를 아주 잘해요.', ''), (7, 'to_vi', 'Hôm nay tôi đi bảo tàng một mình.', '오늘 저는 혼자 박물관에 가요.', ''), (8, 'to_vi', 'Đừng lo, lỗi này không sao đâu.', '걱정하지 마세요, 이 실수는 괜찮아요.', ''), (9, 'to_ko', 'Từ này tiếng Việt nghĩa là gì?', '이 낱말은 베트남어로 무슨 뜻이에요?', ''), (10, 'to_vi', 'Các bạn viết đơn đi.', '여러분, 신청서를 쓰세요.', '')]}
IMG = {'kiệt sức': 'b22-kiet-suc.webp', 'bỏ cuộc': 'b22-bo-cuoc.webp', 'gãi': 'b22-gai.webp', 'cảm nhận': 'b22-cam-nhan.webp', 'cấp 2': 'b22-cap-2.webp'}   # 2026-10-20 Draw Things
EX = {'kiệt sức': ('Làm việc cả ngày, tôi kiệt sức rồi.', '하루 종일 일해서 기진맥진했어요.'),
      'bỏ cuộc': ('Đừng bỏ cuộc!', '포기하지 마세요!'),
      'gãi': ('Đừng gãi chỗ bị muỗi đốt.', '모기 물린 곳을 긁지 마세요.'),
      'cảm nhận': ('Tôi cảm nhận được tình cảm của mẹ.', '저는 엄마의 사랑을 느낄 수 있어요.'),
      'cấp 2': ('Em tôi đang học cấp 2.', '제 동생은 중학교에 다녀요.')}   # 앱에 예문이 없던 낱말 (클로드가 씀)
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
    for key, label, W in (('a22', 'A반 10/20 단어 시험', A22), ('b22', 'B반 10/20 단어 시험', B22)):
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
    assert "'10/20'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
