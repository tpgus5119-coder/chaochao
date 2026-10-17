# -*- coding: utf-8 -*-
"""22기 20회 두 반(시험일 10/17) — 2026-10-17 대표님 "a20, b20 추가해줘 단어시험".
a20(a반/a20.pdf **문제지뿐**): 1~20 영어 뜻 → 베트남어, 21~40 베트남어 → 뜻, 문장 1~5 베→뜻 · 6~10 영→베. 답지가 없어 뜻·번역은 클로드가 씀(영어는 한국어로). đỉnh núi 는 đỉnh 그림.
b20(b반/b20.docx 정답지): 1~20 베→한, 21~40 한→베, 문장 10 모두 한→베(정답지의 예시 답안, 다른 꼴은 alt). 쓰기: python3 tools/daily22/add20.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
def W(vi, ko, dr, ex=None, img=None, alt=()): return (vi, ko, dr, ex, img, list(alt))
A20 = [W(v, k, 'to_vi', alt=a) for v, k, a in [
 ('đông', '붐비다, 사람이 많다', []), ('học thuộc', '외우다', ['học thuộc lòng']), ('thứ bảy', '토요일', []), ('bao giờ', '언제', ['khi nào']), ('quên', '잊다', []),
 ('nghỉ hè', '여름방학', []), ('mắc', '비싸다(남부)', ['đắt']), ('gầy', '마르다', ['ốm']), ('đề nghị', '제안하다', []), ('tin nhắn', '문자 메시지', []),
 ('tiện lợi', '편리하다', []), ('tiếng mẹ đẻ', '모국어', []), ('đi dạo', '산책하다', []), ('thứ tư', '수요일', []), ('nên', '~하는 게 좋다', []),
 ('định', '~할 계획이다', []), ('ngủ gật', '졸다', []), ('hơn', '~보다 더', []), ('chuyển', '옮기다, 이사하다', []), ('ngắn', '짧다', [])]] + [W(v, k, 'to_ko', img=i) for v, k, i in [
 ('nghĩa', '뜻, 의미', None), ('mỏng', '얇다', None), ('nhắn tin', '문자를 보내다', None), ('từ', '낱말', 'b-tu-vung.webp'), ('lỗi', '잘못, 실수', None),
 ('ngữ pháp', '문법', None), ('để', '~하기 위해, 두다', None), ('vậy', '그래서, 그렇게', None), ('thuốc', '약', None), ('đỉnh núi', '산꼭대기', 'w-d0a37914a0.webp'),
 ('đóng', '닫다', None), ('khi', '~할 때', None), ('hơi', '약간, 조금', None), ('thấp', '낮다, 키가 작다', None), ('nói chuyện', '이야기하다', None),
 ('máy bay', '비행기', None), ('quen', '익숙하다, 알다', None), ('mặc', '입다', None), ('đi bộ', '걷다', None), ('gọi', '부르다, 전화하다', None)]]
B20 = [W(v, k, 'to_ko') for v, k in [('tàu hỏa', '기차'), ('tàu thủy', '배'), ('máy tính bảng', '태블릿'), ('sẵn sàng', '준비된'), ('bạn cũ', '옛 친구'),
 ('bóng đá', '축구'), ('kem chống nắng', '선크림'), ('bác sĩ', '의사'), ('nhà hàng', '식당'), ('no', '배부르다'), ('cháo', '죽'), ('dưa chuột', '오이'),
 ('vịt quay', '오리 구이'), ('mưa', '비'), ('luyện tập', '연습하다'), ('buồn ngủ quá', '매우 졸리다'), ('mệt', '피곤하다'), ('bài tập', '숙제, 연습'),
 ('nhà vệ sinh', '화장실'), ('phỏng vấn', '면접, 인터뷰')]] + [W(v, k, 'to_vi', alt=a) for v, k, a in [
 ('tàu điện', '전기 기차(지하철)', []), ('cay', '맵다', []), ('mở', '열다', []), ('đóng', '닫다', []), ('trang', '페이지, 쪽', []), ('từ mới', '새 단어', []),
 ('kem tay', '핸드크림', []), ('thịt lợn', '돼지고기', ['thịt heo']), ('rau mùi', '고수', []), ('nắng', '햇빛, 맑음', []), ('tai', '귀', []), ('tay', '손', []),
 ('nhớ', '보고 싶다, 그리워하다', []), ('giống', '같다, 똑같다', []), ('đúng', '옳다, 맞다', []), ('sai', '틀리다', []), ('buồn', '슬프다', []), ('nóng', '덥다', []),
 ('lạnh', '춥다', []), ('khô', '건조하다', [])]]
S = {'a20': [(1, 'to_ko', 'Bao giờ chị đi Nha Trang?', '언제 나트랑에 가요?', ''),
 (2, 'to_ko', 'Dong Ha mới mua điện thoại mới.', '동하는 새 휴대폰을 막 샀어요.', ''),
 (3, 'to_ko', 'Hôm nay thời tiết hơi lạnh nên tôi ở nhà.', '오늘은 날씨가 좀 추워서 집에 있어요.', ''),
 (4, 'to_ko', 'Tôi nghĩ sắp mưa rồi.', '곧 비가 올 것 같아요.', ''),
 (5, 'to_ko', 'Em sẽ học bao lâu?', '얼마 동안 공부할 거예요?', ''),
 (6, 'to_vi', 'Nó không đến lớp bao giờ?', '그 아이는 언제 수업에 안 왔어요?', 'Anh ấy không đến lớp bao giờ?'),
 (7, 'to_vi', 'Các bạn nghỉ một chút đi!', '여러분, 잠깐 쉬세요!', ''),
 (8, 'to_vi', 'Sang Hyun đã học tiếng Việt được bao lâu rồi?', '상현이는 베트남어를 공부한 지 얼마나 됐어요?', 'Sang Hyun học tiếng Việt bao lâu rồi?'),
 (9, 'to_vi', 'Đừng cười tôi!', '저를 비웃지 마세요!', ''),
 (10, 'to_vi', 'Chúng ta là người Hàn Quốc. Chúng ta nói tiếng Việt đi!', '우리는 한국 사람이에요. 베트남어로 말해요!', 'Chúng tôi là người Hàn Quốc. Chúng ta nói tiếng Việt đi!')],
 'b20': [(1, 'to_vi', 'Chậm lại.', '천천히 해 주세요 / 천천히 가세요.', 'Chậm lại đi.'),
 (2, 'to_vi', 'Mấy giờ rồi?', '지금 몇 시예요?', 'Bây giờ là mấy giờ?'),
 (3, 'to_vi', 'Tôi sống một mình.', '저는 혼자 살아요.', 'Sống một mình.'),
 (4, 'to_vi', 'Mỗi ngày luyện tập tiếng Việt.', '매일 베트남어를 연습합니다.', 'Hàng ngày luyện tập tiếng Việt. / Mỗi ngày tôi luyện tập tiếng Việt.'),
 (5, 'to_vi', 'Ngon quá!', '정말 너무 맛있어요!', ''),
 (6, 'to_vi', 'Ghi nhớ từ mới.', '새로운 단어를 기억합니다(암기합니다).', 'Học thuộc từ mới.'),
 (7, 'to_vi', 'Đưa các con đến trường.', '아이들을 학교에 바래다줍니다.', ''),
 (8, 'to_vi', 'Ăn món Hàn.', '한국 음식을 먹습니다 / 좋아합니다.', 'Thích món Hàn.'),
 (9, 'to_vi', 'Luyện tập bài và làm bài tập.', '수업을 연습(복습)하고 숙제를 합니다.', 'Ôn bài và làm bài tập.'),
 (10, 'to_vi', 'Hôm nay mệt và buồn ngủ quá.', '오늘은 너무 피곤하고 졸립니다.', '')]}

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
    for key, label, W in (('a20', 'A반 10/17 단어 시험', A20), ('b20', 'B반 10/17 단어 시험', B20)):
     if any(d.get('label') == label for d in C['days']): print(key, '이미 들어 있음'); continue
     if True:
        words = []
        for vi, ko, dr, ex, img, alt in W:
            old = found.get(N(vi))
            if img: assert (R / 'img' / img).exists(), ('그림 없음', img)
            else: assert old and old.get('img'), ('앱에 없음', vi)
            img = img or old.get('img')
            if ex is None and vi == 'đỉnh núi': ex = ('Chúng tôi leo lên đỉnh núi.', '우리는 산꼭대기에 올라갔어요.')
            if ex is None and old:
                oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
            if vi == 'từ' and img == 'b-tu-vung.webp': ex = ('Tôi chưa biết từ này.', '저는 이 낱말을 아직 몰라요.')
            kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
            w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'img': img, 'dir': dr}
            if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
            if alt: w['alt'] = alt
            words.append(w)
        assert len(words) == 40, (key, len(words)); assert len({N(w['vi']) for w in words}) == 40, '낱말 겹침'
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'words': words})
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
    (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/17'" not in s:
        s = s.replace("'10/15', '10/16']", "'10/15', '10/16', '10/17']", 1); assert "'10/17'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
