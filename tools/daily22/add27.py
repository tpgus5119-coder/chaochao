# -*- coding: utf-8 -*-
"""22기 B반 27·28·29회(시험일 10/27·10/28·10/29, 파일 이름 날짜) — 2026-10-29 대표님 "b반 단어시험 파일 3개 넣었어 적용해줘".
b반/10:27.pdf(답지, 빨간 글씨가 답 → 그 칸 쪽이 묻는 방향): 낱말 22(13번 'vé máy bay / xe buýt / xe điện / xe điện ngầm' 은 네 낱말로 나눔 → 25) + 문장 1~5 한→베 · 6~10 베→한.
b반/10:28.docx: 1~20 한→베 · 21~40 베→한, 문장 10 한→베. 정답지 영어 뜻(Worry·Ship·Holiday·Street·Wide·Rest·Meaning·Invent)은 한국어로, tham khảo '상담하다'→'참고하다', 숫자는 글로(3 năm → ba năm).
b반/10:29.docx: 1~20 베→한 · 21~40 한→베(같은 낱말 일곱이 두 방향으로 나옴 — 시험지 그대로 둠), 문장 41~50 한→베. 비행기표 답 'chuyến bay'(=비행편)·독신 답 'thân' 은 뺌, 결혼 자금 답 tiền mừng 은 뜻을 '축의금'으로.
10/26(월) 시험지는 없다. 쓰기: python3 tools/daily22/add27.py"""
import json, pathlib, sys, unicodedata as U
K, V = 'to_ko', 'to_vi'
B27 = [('phương tiện giao thông', '교통수단', V, []), ('xe máy', '오토바이', V, []), ('xe buýt', '버스', K, []), ('xe tắc xi', '택시', K, []), ('xe hơi', '승용차', K, []), ('xe đạp', '자전거', V, []),
       ('xe ôm', '오토바이 택시', K, []), ('máy bay', '비행기', K, []), ('xe điện', '전차, 전기차', K, []), ('xe điện ngầm', '지하철', K, []), ('tàu', '기차, 배', V, []), ('vé', '표', K, []),
       ('vé máy bay', '비행기 표', V, []), ('vé xe buýt', '버스 표', V, []), ('vé xe điện', '전차 표', V, []), ('vé xe điện ngầm', '지하철 표', V, []),
       ('vé một chiều', '편도 표', V, []), ('vé khứ hồi', '왕복 표', V, []), ('trở lại', '돌아오다, 다시', V, []), ('lo', '걱정하다', K, []), ('gọi', '부르다, 전화하다', V, []), ('lâu', '오래다', V, []),
       ('tiện', '편리하다', K, []), ('hư', '고장 나다', V, []), ('kẹt xe', '교통 체증', K, [])]
B28 = [('tham khảo', '참고하다, 참조하다', V, []), ('giỏi hơn', '더 잘하다', V, []), ('thế kỷ', '세기', V, []), ('cuộc sống', '삶, 인생', V, []), ('phát minh', '발명하다, 발명', V, []), ('rùa', '거북이', V, []),
       ('đổi', '바꾸다, 교환하다', V, []), ('cá', '물고기', V, []), ('tàu thủy', '배(선박)', V, []), ('lễ', '명절, 휴일', V, []), ('rộng', '넓다', V, []), ('bằng tuổi', '동갑인', V, []), ('máy bay', '비행기', V, []),
       ('tin tưởng', '신뢰하다, 믿다', V, []), ('đoạn văn', '단락', V, []), ('tức giận', '화나다', V, []), ('kẻ trộm', '도둑', V, []), ('như', '~처럼, ~와 같이', V, []), ('tai', '귀', V, []), ('kiểm tra', '검사하다', V, []),
       ('câu', '문장', K, []), ('cuối tuần', '주말', K, []), ('lo', '걱정하다', K, []), ('nghĩa', '의미, 뜻', K, []), ('vấn đề', '문제', K, []), ('làm đêm', '야근하다', K, []), ('nghỉ', '쉬다', K, []),
       ('nhà máy', '공장', K, []), ('phát triển', '발전하다', K, []), ('kem', '아이스크림', K, []), ('tên', '이름', K, []), ('phê bình', '비판하다', K, []), ('nhà báo', '기자', K, []), ('hút thuốc', '담배를 피우다', K, []),
       ('xe ô tô', '자동차', K, []), ('nhận phòng', '체크인하다', K, []), ('phố', '거리', K, []), ('kỹ năng', '기술, 능력', K, []), ('quán cà phê', '카페', K, []), ('mặc', '(옷을) 입다', K, [])]
B29 = [('quên', '잊다, 잊어버리다', K, []), ('ngọt', '달다', K, []), ('nhà máy', '공장', K, []), ('bảo vệ', '경비원, 보호하다', K, []), ('đồn cảnh sát', '경찰서', K, []), ('trúng xổ số', '복권에 당첨되다', K, []),
       ('thợ mộc', '목수', K, []), ('phỏng vấn', '면접, 인터뷰', K, []), ('giải thích', '설명하다', K, []), ('kẹt xe', '교통 체증, 차가 막히다', K, []), ('hướng dẫn viên du lịch', '여행 가이드', K, []),
       ('hoàng hôn', '일몰, 노을', K, []), ('làm bài tập', '숙제하다', K, []), ('độc thân', '독신', K, []), ('tiếng mẹ đẻ', '모국어', K, []), ('dự định', '예정이다, 계획하다', K, []), ('hắt hơi', '재채기하다', K, []),
       ('phiên dịch', '통역사, 통역하다', K, []), ('phương tiện giao thông', '교통수단', K, []), ('khi đó', '그때', K, []),
       ('kế toán', '회계사, 회계', V, []), ('bảo tàng', '박물관', V, ['viện bảo tàng']), ('phiên dịch', '통역사', V, []), ('cột đèn', '가로등, 전봇대', V, []), ('công tác', '출장', V, []), ('hẹn', '약속', V, ['cuộc hẹn']),
       ('chính tả', '맞춤법', V, []), ('tiếng mẹ đẻ', '모국어', V, []), ('trúng xổ số', '복권에 당첨되다', V, []), ('trận chung kết', '결승전', V, []), ('vé máy bay', '비행기 표', V, []), ('hoàng hôn', '일몰, 노을', V, []),
       ('tiền mừng', '축의금', V, []), ('bà nội', '친할머니', V, []), ('bà ngoại', '외할머니', V, []), ('hắt hơi', '재채기하다', V, []), ('độc thân', '독신', V, []), ('hiệu thuốc', '약국', V, ['nhà thuốc']),
       ('kẹt xe', '교통 체증', V, []), ('thế kỷ', '세기', V, [])]
S = {'b27': [(1, V, 'Tôi đi làm bằng xe máy.', '저는 오토바이로 출근합니다.', ''), (2, V, 'Nếu trời mưa thì tôi đi xe tắc xi.', '비가 오면 저는 택시를 탑니다.', ''),
             (3, V, 'Xe điện ngầm rất tiện.', '지하철은 아주 편리합니다.', ''), (4, V, 'Tôi mua vé một chiều.', '저는 편도 표를 삽니다.', ''),
             (5, V, 'Hôm nay kẹt xe nên tôi đi bằng xe ôm.', '오늘은 교통 체증이라서 오토바이 택시를 탑니다.', ''),
             (6, K, 'Chị mua vé máy bay một chiều hay vé khứ hồi?', '비행기 표는 편도로 사세요, 왕복으로 사세요?', ''), (7, K, 'Hôm nay xe của tôi hư.', '오늘 제 차(오토바이)가 고장 났어요.', ''),
             (8, K, 'Tôi chưa biết bao giờ sẽ trở lại Hà Nội.', '언제 하노이로 돌아올지 아직 모르겠어요.', ''), (9, K, 'Xe buýt đến lâu quá nên tôi lo lắm.', '버스가 너무 늦게 와서 많이 걱정돼요.', ''),
             (10, K, 'Ở Hàn Quốc có phương tiện giao thông gì?', '한국에는 어떤 교통수단이 있어요?', '')],
     'b28': [(1, V, 'Bạn có khỏe không?', '당신은 잘 지내나요?', ''), (2, V, 'Tại sao chị Lan khóc vậy?', '왜 란 씨가 울어요?', ''), (3, V, 'Xin chào, tôi là người Hàn Quốc.', '안녕하세요. 저는 한국 사람이에요.', ''),
             (4, V, 'Minho sẽ không đến.', '민호는 오지 않을 거예요.', ''), (5, V, 'Bạn học bao lâu?', '너는 얼마 동안 공부하니?', 'Bạn học trong bao lâu?'), (6, V, 'Ngày mai tôi sẽ đi.', '내일 나는 갈 거예요.', ''),
             (7, V, 'Tôi muốn gặp giám đốc ạ.', '사장님을 만나고 싶어요.', ''), (8, V, 'Công việc của bạn là gì?', '당신의 직업은 어떻게 되세요?', ''),
             (9, V, 'Bạn là sinh viên đại học phải không?', '당신은 대학생이신가요?', ''), (10, V, 'Tôi đã sống ở Thành phố Hồ Chí Minh ba năm rồi.', '호찌민에서 산 지 3년이 됐어요.', '')],
     'b29': [(1, V, 'Đưa các con đến trường.', '아이들을 학교에 바래다주다.', ''), (2, V, 'Mấy giờ rồi?', '지금 몇 시입니까?', ''), (3, V, 'Ghi nhớ từ mới.', '새로운 단어를 기억하다.', ''),
             (4, V, 'Tôi dự định đi công tác sang năm.', '저는 내년에 출장을 갈 예정입니다.', 'Tôi dự định đi công tác năm sau.'), (5, V, 'Sau khi tan làm, tôi gặp bạn.', '퇴근 후에 친구를 만납니다.', ''),
             (6, V, 'Ông ấy là giám đốc công ty.', '그는 회사의 사장입니다.', ''), (7, V, 'Chắc chắn không?', '확실합니까?', ''), (8, V, 'Bác Hồ.', '호찌민 주석(호 아저씨).', ''),
             (9, V, 'Chúng tôi đã đặt vé máy bay ở sân bay.', '우리는 공항에서 비행기 표를 예약했습니다.', 'Chúng tôi đã đặt vé ở sân bay.'), (10, V, 'Ăn món Tây rồi đi quán kem.', '서양 음식을 먹고 아이스크림 가게에 가다.', '')]}
IMG = {}
EX = {'giỏi hơn': ('Đừng lo! Từ từ em sẽ giỏi hơn.', '걱정 마! 차차 더 잘하게 될 거야.'), 'khi đó': ('Khi đó thì mình lại ăn món ăn Nhật.', '그럴 때는 나는 또 일본 음식을 먹어.'), 'rùa': ('Con rùa đi rất chậm.', '거북이는 아주 느리게 걸어요.'), 'kẻ trộm': ('Kẻ trộm đã lấy xe máy của tôi.', '도둑이 제 오토바이를 가져갔어요.'), 'làm đêm': ('Tuần này tôi phải làm đêm.', '이번 주에 저는 야근해야 해요.'), 'hắt hơi': ('Tôi bị cảm nên hắt hơi nhiều.', '저는 감기에 걸려서 재채기를 많이 해요.'), 'cột đèn': ('Xe máy đậu cạnh cột đèn.', '오토바이가 가로등 옆에 세워져 있어요.'), 'tiền mừng': ('Tôi bỏ tiền mừng vào phong bì.', '저는 축의금을 봉투에 넣었어요.')}   # 예문 없던 낱말 — giỏi hơn·khi đó 는 교재 문장, 나머지 여섯은 새로 지음(5순위)
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
    for key, label, W in (('b27', 'B반 10/27 단어 시험', B27), ('b28', 'B반 10/28 단어 시험', B28), ('b29', 'B반 10/29 단어 시험', B29)):
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
        assert len({(N(w['vi']), w['dir']) for w in words}) == len(words), '낱말 겹침(같은 방향)'   # 10/29 는 같은 낱말이 두 방향으로 나온다
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'key': key, 'words': words})   # key 를 적는다 — A반 21회가 없어 차례로 세면 a21 이 된다
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
    (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/29'" not in s:
        s = s.replace("'10/23', '10/24']", "'10/23', '10/24', '10/27', '10/28', '10/29']", 1); assert "'10/29'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
