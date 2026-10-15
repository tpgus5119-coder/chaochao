# -*- coding: utf-8 -*-
"""22기 B반 19회(b반/b19.docx 정답지, 시험일 10/16 으로 둠 — b18 다음) → cohort22.json 회차 + 문장.tsv. 2026-10-15 대표님 "b19 추가해줘".
b19: 1~20 한→베(to_vi), 21~40 베→한(to_ko), 문장 10 모두 한→베. xe ô tô 가 5(한→베)·35(베→한) 두 번 — 낱말마다 dir 로 40문항 그대로.
문장 4 '그가 곧 졸업할 것이다 → Lan sắp tốt nghiệp' 은 물음과 주어가 어긋나 Anh ấy 로(다른 정답 Lan). hướng dẫn viên du lịch 는 hướng dẫn viên 그림·새 예문. 쓰기: python3 tools/daily22/addb19.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
B19 = [(v, k, 'to_vi', ex, img, alt) for v, k, ex, img, alt in [
 ('phát âm', '발음하다', None, None, []), ('sớm', '일찍', None, None, []), ('viết', '쓰다', None, None, []), ('hôm nay', '오늘', None, None, []),
 ('xe ô tô', '자동차', None, None, ['ô tô', 'xe hơi']), ('phỏng vấn', '인터뷰', None, None, []), ('thông tin', '정보', None, None, []),
 ('vừa mới', '방금 ~했다', None, None, ['vừa', 'mới']), ('nghĩa', '의미, 뜻', None, None, []), ('sữa', '우유', None, None, []),
 ('trung tâm ngoại ngữ', '외국어 센터', None, None, []), ('từ từ', '점차, 천천히, 느리게', None, None, []), ('hạnh phúc', '행복하다', None, None, []),
 ('kỹ năng', '기술, 능력, 스킬', None, None, []), ('nổi tiếng', '유명한', None, None, []), ('dễ', '쉽다', None, None, []), ('gia đình', '가족', None, None, []),
 ('bài tập', '숙제, 과제', None, None, []),
 ('hướng dẫn viên du lịch', '투어 가이드', ('Chị ấy là hướng dẫn viên du lịch ở Huế.', '그녀는 후에의 투어 가이드예요.'), 'bo-7ac1042804.webp', ['hướng dẫn viên']),
 ('khó', '어렵다', None, None, [])]] + [(v, k, 'to_ko', None, None, []) for v, k in [
 ('câu', '문장'), ('cuối tuần', '주말'), ('đừng lo', '걱정하지 마'), ('quên', '잊다'), ('xinh', '예쁘다'), ('giúp', '돕다'), ('nghỉ', '쉬다'),
 ('nhà máy', '공장'), ('cơ quan', '회사, 직장'), ('kem', '아이스크림'), ('tên', '이름'), ('tài xế', '운전기사'), ('nhà báo', '기자'), ('báo', '신문, 기사'),
 ('xe ô tô', '자동차'), ('hy vọng', '희망하다, 바라다'), ('phố', '거리'), ('nhưng', '그러나'), ('quán cà phê', '카페'), ('viện bảo tàng', '박물관')]]
S = {'b19': [
 (1, 'to_vi', 'Bạn có khỏe không?', '당신은 잘 지내나요?', 'Anh có khỏe không? / Chị có khỏe không?'),
 (2, 'to_vi', 'Bạn đã từng sống ở đâu?', '너는 어디에서 살았었니?', 'Bạn từng sống ở đâu?'),
 (3, 'to_vi', 'Chúng tôi đã họp xong rồi.', '우리는 회의를 다 했다.', 'Chúng tôi họp xong rồi.'),
 (4, 'to_vi', 'Anh ấy sắp tốt nghiệp.', '그가 곧 졸업할 것이다.', 'Anh ấy sắp tốt nghiệp rồi. / Lan sắp tốt nghiệp.'),
 (5, 'to_vi', 'Bạn học trong bao lâu?', '너는 얼마 동안 공부하니?', 'Bạn học bao lâu?'),
 (6, 'to_vi', 'Ngày mai tôi sẽ đi.', '내일 나는 갈 거예요.', 'Mai tôi sẽ đi.'),
 (7, 'to_vi', 'Năm nay bạn bao nhiêu tuổi?', '올해 당신은 나이가 어떻게 되세요?', 'Năm nay anh bao nhiêu tuổi? / Năm nay chị bao nhiêu tuổi?'),
 (8, 'to_vi', 'Công việc của bạn là gì?', '당신의 직업은 어떻게 되세요?', 'Nghề nghiệp của bạn là gì? / Bạn làm nghề gì?'),
 (9, 'to_vi', 'Bạn là sinh viên đại học phải không?', '당신은 대학생이신가요?', 'Bạn là sinh viên phải không? / Bạn có phải là sinh viên không?'),
 (10, 'to_vi', 'Tôi sống ở Hà Nội.', '저는 하노이에 살아요.', '')]}

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
    key, label, W = 'b19', 'B반 10/16 단어 시험', B19
    if any(d.get('label') == label for d in C['days']): print(key, '이미 들어 있음')
    else:
        words = []
        for vi, ko, dr, ex, img, alt in W:
            old = found.get(N(vi))
            if img: assert (R / 'img' / img).exists(), ('그림 없음', img)
            else: assert old and old.get('img'), ('앱에 없음', vi)
            img = img or old.get('img')
            if ex is None:
                oe = old.get('ex'); ex = (oe['vi'], oe.get('ko', '')) if isinstance(oe, dict) and oe.get('vi') else None
            kr = (old and (old.get('kr_read') or old.get('kr'))) or vi_kr(vi)
            w = {'vi': vi, 'ko': ko, 'kr_read': kr, 'img': img, 'dir': dr}
            if ex: w['ex'] = {'vi': ex[0], 'ko': ex[1]}
            if alt: w['alt'] = alt
            words.append(w)
        assert len(words) == 40, (key, len(words))   # xe ô tô 가 두 방향으로 두 번(5·35) — b16 처럼 낱말마다 dir
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'words': words})
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
        (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/16'" not in s:
        s = s.replace("'10/14', '10/15']", "'10/14', '10/15', '10/16']", 1); assert "'10/16'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
