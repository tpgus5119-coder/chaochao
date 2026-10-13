# -*- coding: utf-8 -*-
"""일상 낱말 3,398개 하나씩 읽은 최종 점검에서 나온 고침 (2026-10-13, 대표님 "단어 하나하나 단위로 검사하고 다음으로").
① 뜻 글이 깨진 것(빗금·괄호·설명 섞임) 39개 ② 낱말 앞글자가 대문자인 보통 낱말 25개 → 소문자(소리 색인에 소문자 열쇠를 같은 파일로 더함)
③ 소묶음 잘못 든 것 2개(quốc kỳ → 외국·국민·민족·국기, chuông → 그 밖의 명사) ④ 뜻의 쉼표 뒤 띄어쓰기.
쓰기: python3 tools/day_reorg/fix_1013.py"""
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
P = R / 'data/days.json'; D = json.loads(P.read_text(encoding='utf-8'))
KO = {
 'tin': '믿다', 'kết cấu': '구조, 구성', 'đạo diễn': '(영화) 감독, 연출가', 'vất vả': '힘들다, 고생스럽다', 'còn lâu': '아직 멀었다, 한참 남았다',
 'từ': '단어, 낱말', 'lời': '말, 용어', 'tổng số': '총수, 총합', 'Bà nội': '친할머니', 'anh họ': '사촌 형·사촌 오빠', 'chị họ': '사촌 누나·사촌 언니',
 'Vắng mặt': '결석·불참', 'phòng chờ': '대기실·대합실', 'hôm kia': '그저께', 'Tháng Giêng': '(음력) 1월, 정월', 'Tháng Chạp': '(음력) 12월, 섣달',
 'Sân': '운동장, 코트·마당', 'Do': '~때문에, ~로 인해', 'đồ ăn': '먹을 것, 음식', 'quà lưu niệm': '기념품, 기념 선물', 'kem chống nắng': '자외선 차단제',
 'máy in': '프린터, 인쇄기', 'cố': '노력하다, 애쓰다', 'quý': '아끼다, 귀하게 여기다(연장자·가까운 사람에게)', 'khẳng định': '단언하다, 확언하다',
 'dai': '끈질기다, 질기다', 'nhiệt tình': '열정적인, 열성적인', 'vay': '(돈을) 빌리다', 'lá vàng': '노란 잎, 낙엽',
 'đàn thập lục': '16현 쟁(베트남 전통 악기, đàn tranh)', 'chả cá': '생선 구이(차까)', 'bún thang': '분탕(하노이 닭·계란·햄 쌀국수)',
 'thế kỷ': '세기(100년)', 'thập kỷ': '10년(십 년)', 'thiên niên kỷ': '천년', 'cờ đỏ': '붉은 깃발, 경고 신호',
 'phổ thông': '일반의, 보통의; (tiếng phổ thông) 표준어', 'sắc thái': '뉘앙스, 색조·양상', 'tính': '계산하다; 성질, ~성', 'biểu thị': '표시하다, 나타내다',
 'tái': '살짝 익힌(레어); 창백하다', 'cao lên': '키가 크다, 키가 커지다', 'phó': '부-, 차장', 'lẻ': '(101 처럼 자릿수가 빌 때) 영 · 홀수의(linh 와 같음)',
}
LOWER = ['Dĩ nhiên', 'Hẹn gặp', 'Bà nội', 'Em họ', 'Chị dâu', 'Anh rể', 'Em dâu', 'Kỳ nghỉ', 'Đàm phán', 'Vắng mặt', 'Ban đêm', 'Nam', 'Hè', 'Thể lực',
         'Trận đấu', 'Sân', 'Do', 'Bánh cuốn', 'Rang', 'Tệp', 'Ưu tiên', 'Giấy tờ', 'Chăn', 'Cốc', 'Thiên nhiên']
MOVE = {'quốc kỳ': ('나라', '외국·국민·민족·국기'), 'chuông': ('그 밖의 낱말', '그 밖의 명사')}
name = lambda d: re.sub(r'\s*\(\d+/\d+\)$', '', d['theme'])
days = [d for d in D['days'] if isinstance(d.get('day'), int) and not d.get('track')]
idxp = R / 'data/audio_index.json'; idx = json.loads(idxp.read_text(encoding='utf-8'))
n_ko = n_low = n_sp = 0; moved = []
for d in days:
    for w in d['words']:
        if w['vi'] in KO: w['ko'] = KO[w['vi']]; n_ko += 1
        if w['vi'] in LOWER:
            lo = w['vi'].lower()
            if w['vi'] in idx and lo not in idx: idx[lo] = idx[w['vi']]
            w['vi'] = lo; n_low += 1
        k2 = re.sub(r',(?=[가-힣(~])', ', ', str(w.get('ko', '')))
        if k2 != w.get('ko'): w['ko'] = k2; n_sp += 1
for vi, (theme, g) in MOVE.items():
    src = next(d for d in days if any(w['vi'] == vi for w in d['words'])); w = next(x for x in src['words'] if x['vi'] == vi); src['words'].remove(w)
    dst = next(d for d in days if name(d) == theme and any(x.get('g') == g for x in d['words']))
    last = max(i for i, x in enumerate(dst['words']) if x.get('g') == g); w['g'] = g; dst['words'].insert(last + 1, w); moved.append((vi, src['theme'], dst['theme']))
assert all(d['words'] for d in days)
P.write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8'); idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=0), encoding='utf-8')
print('뜻 고침', n_ko, '· 소문자', n_low, '· 쉼표 띄움', n_sp, '· 옮김', moved)
