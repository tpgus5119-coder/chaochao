# -*- coding: utf-8 -*-
"""22기 21회 B반(시험일 10/19 가정) — 2026-10-19 대표님 출제 차례 b21(b반/b21.docx, tools/daily22/make_b21.py)을 앱에 넣는다. A반 21회는 아직 없음.
1~20 베→한, 21~40 한→베(답이 둘인 것은 alt), 문장 10 모두 한→베(교재 1권 7·8·9과 원문). 쓰기: python3 tools/daily22/add21.py"""
import json, pathlib, sys, unicodedata as U
B21 = [('Tháng Giêng', '(음력) 1월, 정월', 'to_ko', []), ('năm kia', '재작년', 'to_ko', []), ('hôm kia', '그저께', 'to_ko', []), ('sang năm', '내년', 'to_ko', []), ('ngày kia', '모레', 'to_ko', []), ('tiếp theo', '다음, 이어서', 'to_ko', []), ('đáp', '대답하다', 'to_ko', []), ('trận', '(경기·비·재난 등의) 한 차례, 한 판', 'to_ko', []), ('xe lửa', '기차', 'to_ko', []), ('thế kỷ', '세기(100년)', 'to_ko', []), ('phụ đề', '자막', 'to_ko', []), ('cả nhà', '온 가족', 'to_ko', []), ('thực phẩm', '식품', 'to_ko', []), ('chăm sóc', '돌보다, 보살피다', 'to_ko', []), ('tháng trước', '지난달', 'to_ko', []), ('thủy thủ', '선원', 'to_ko', []), ('kiến trúc sư', '건축가', 'to_ko', []), ('phi công', '조종사, 파일럿', 'to_ko', []), ('quay phim', '촬영하다', 'to_ko', []), ('khách hàng', '고객', 'to_ko', []), ('mùng', '(날짜 앞) 초 (초하루의 초)', 'to_vi', ['mồng']), ('bao giờ', '언제', 'to_vi', ['khi nào']), ('vé', '표, 티켓', 'to_vi', []), ('xuân', '봄', 'to_vi', ['mùa xuân']), ('hè', '여름', 'to_vi', ['mùa hè']), ('thu', '가을', 'to_vi', ['mùa thu']), ('thập kỷ', '10년 (십 년)', 'to_vi', []), ('tương lai', '미래', 'to_vi', []), ('quá khứ', '과거', 'to_vi', []), ('chồng', '남편', 'to_vi', []), ('đón', '마중 나가다', 'to_vi', []), ('bánh', '빵, 과자', 'to_vi', []), ('quay lại', '되돌아오다', 'to_vi', []), ('lính cứu hỏa', '소방관', 'to_vi', []), ('công nhân', '노동자', 'to_vi', []), ('khám bệnh', '진찰받다', 'to_vi', []), ('tàu điện ngầm', '지하철', 'to_vi', []), ('thợ mộc', '목수', 'to_vi', []), ('sinh nhật', '생일', 'to_vi', []), ('chúc mừng', '축하하다', 'to_vi', [])]
S = {'b21': [(1, 'to_vi', 'Em nói tiếng Pháp được không?', '프랑스어 할 수 있어요?', ''), (2, 'to_vi', 'Anh còn ở đây bao lâu nữa?', '여기 얼마나 더 계세요?', ''), (3, 'to_vi', 'Em mới học tiếng Việt nên thấy khó.', '베트남어를 배운 지 얼마 안 돼서 어렵게 느껴져요.', ''), (4, 'to_vi', 'Chị đừng ngồi đây!', '여기 앉지 마세요!', ''), (5, 'to_vi', 'Đây, chị xem đi!', '자, 보세요!', ''), (6, 'to_vi', 'Anh đã đặt tour du lịch chưa?', '여행 투어는 예약했어요?', ''), (7, 'to_vi', 'Bao giờ chị đi Nha Trang?', '언제 냐짱에 가세요?', ''), (8, 'to_vi', 'Sắp cuối tuần rồi đấy.', '곧 주말이에요!', ''), (9, 'to_vi', 'Hôm qua chị thức khuya hả?', '어제 늦게 주무셨죠?', ''), (10, 'to_vi', 'Bây giờ tôi hơi mệt.', '지금 저는 좀 피곤해요.', '')]}
IMG = {'năm kia': 'b21-nam-kia.webp', 'đáp': 'b21-dap.webp', 'thực phẩm': 'b21-thuc-pham.webp', 'thủy thủ': 'b21-thuy-thu.webp', 'kiến trúc sư': 'b21-kien-truc-su.webp', 'phi công': 'b21-phi-cong.webp', 'mùng': 'b21-mung.webp', 'thu': 'b21-thu.webp'}   # 2026-10-19 Draw Things 로 그림(앱에 없던 낱말)
EX = {'năm kia': ('Năm kia tôi đã đến Việt Nam.', '재작년에 저는 베트남에 왔어요.'),
      'đáp': ('Cô giáo hỏi, học sinh đáp.', '선생님이 묻고 학생이 대답해요.'),
      'thực phẩm': ('Siêu thị này bán nhiều thực phẩm tươi.', '이 슈퍼마켓은 신선한 식품을 많이 팔아요.'),
      'thủy thủ': ('Anh ấy là thủy thủ trên một con tàu lớn.', '그는 큰 배의 선원이에요.'),
      'kiến trúc sư': ('Chị tôi là kiến trúc sư.', '우리 언니는 건축가예요.'),
      'phi công': ('Phi công lái máy bay.', '조종사가 비행기를 조종해요.'),
      'mùng': ('Hôm nay là mùng một Tết.', '오늘은 설 초하루예요.'),
      'thu': ('Mùa thu ở Hà Nội rất đẹp.', '하노이의 가을은 정말 아름다워요.'),
      'tương lai': ('Trong tương lai, tôi muốn sống ở Việt Nam.', '미래에 저는 베트남에서 살고 싶어요.'),
      'quá khứ': ('Đó là chuyện quá khứ rồi.', '그건 이미 지난 일이에요.')}   # 앱에 없던 낱말 8개 + 예문이 문법 설명 문장이던 둘 (클로드가 씀, 배운 낱말만)
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
    for key, label, W in (('b21', 'B반 10/19 단어 시험', B21),):
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
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'words': words})
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
    (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/19'" not in s:
        s = s.replace("'10/16', '10/17']", "'10/16', '10/17', '10/19']", 1); assert "'10/19'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
