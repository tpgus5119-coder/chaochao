# -*- coding: utf-8 -*-
"""22기 B반 17회(시험일 10/14, b반/b17.pdf 정답지) → cohort22.json 회차 + 문장.tsv + build.py DATES. 2026-10-14 대표님 "b17 어플에 추가해줘".
b17: 1~20 베트남어 → 한국어(to_ko), 21~40 한국어 → 베트남어(to_vi), 문장 41~45 베→한, 46~50 한→베. 뜻은 정답지의 한국어 그대로.
앱에 없던 아홉(đi ngủ sớm·viết đơn·viết tiếng Pháp·hai thứ tiếng·khoảng 40 phút·đi uống cà phê·nói tiếng Việt·đi bệnh viện·làm việc ở công ty)은 모두 **있는 낱말을 이은 말**이라
그림은 그 낱말(ngủ sớm·đơn·tiếng Pháp·thứ tiếng·phút·cà phê·tiếng Việt·bệnh viện·công ty)의 그림을 그대로 쓰고 예문만 새로 썼다(새 그림은 안 그림).
숫자가 든 말(khoảng 40 phút)은 앱엔 글로(khoảng bốn mươi phút, 다른 정답 'khoảng 40 phút') — b14 때 규칙 그대로. 쓰기: python3 tools/daily22/add17.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
# (베트남어, 한국어 뜻, 방향, 새 예문 or None, 그림(새로 정한 것) or None, 다른 정답 꼴)
B17 = [(v, k, 'to_ko', ex, img, alt) for v, k, ex, img, alt in [
 ('trung tâm ngoại ngữ', '외국어 센터', None, None, []), ('người nước ngoài', '외국인', None, None, []), ('bữa ăn sáng', '아침 식사', None, None, []),
 ('tập thể dục', '운동하다', None, None, []), ('chuẩn bị', '준비하다', None, None, []), ('khách sạn', '호텔', None, None, []), ('mệt', '피곤하다', None, None, []),
 ('đại học', '대학교', None, None, []), ('ôn tập', '복습하다', None, None, []), ('kiểm tra', '시험(을 보다)', None, None, []), ('mua sắm', '쇼핑하다', None, None, []),
 ('thức khuya', '늦게 자다', None, None, []),
 ('đi ngủ sớm', '일찍 자다', ('Tối nay em đi ngủ sớm đi!', '오늘 밤은 일찍 자!'), 'c22-ngu-som.webp', []),
 ('viết đơn', '신청서를 쓰다', ('Em đang viết đơn xin học.', '저는 수강 신청서를 쓰고 있어요.'), 'w-63ced0df1d.webp', []),
 ('nói chuyện', '이야기하다', None, None, []), ('hội thoại', '회화, 대화', None, None, []), ('phát âm', '발음(하다)', None, None, []),
 ('giải thích', '설명하다', None, None, []), ('điện thoại', '전화(기)', None, None, []), ('tiếng Tây Ban Nha', '스페인어', None, None, [])]] + [(v, k, 'to_vi', ex, img, alt) for v, k, ex, img, alt in [
 ('ngoại ngữ', '외국어', None, None, []), ('học', '공부하다', None, None, ['học tập']), ('buồn ngủ', '졸리다', None, None, []), ('ngại', '쑥스럽다, 부끄럽다', None, None, []),
 ('một tiếng', '한 시간', None, None, ['một giờ']), ('một chút', '조금', None, None, []), ('giỏi ngoại ngữ', '외국어를 잘하다', None, None, []),
 ('viết tiếng Pháp', '프랑스어를 쓰다', ('Chị ấy viết tiếng Pháp rất giỏi.', '그녀는 프랑스어를 아주 잘 써요.'), 'w-c14ae10b1b.webp', []),
 ('sinh viên', '대학생', None, None, []), ('giáo viên', '선생님', None, None, []),
 ('hai thứ tiếng', '두 가지 언어', ('Anh ấy nói được hai thứ tiếng.', '그는 두 가지 언어를 할 수 있어요.'), 'w-eb2a8f87af.webp', []),
 ('người Việt', '베트남 사람', None, None, ['người Việt Nam']),
 ('khoảng bốn mươi phút', '약 40분', ('Từ nhà đến trường mất khoảng bốn mươi phút.', '집에서 학교까지 약 40분 걸려요.'), 'phut-minute.webp', ['khoảng 40 phút']),
 ('đi uống cà phê', '커피 마시러 가다', ('Chúng ta đi uống cà phê đi!', '우리 커피 마시러 가요!'), 'd12-ca-phe.webp', []),
 ('xem phim', '영화를 보다', None, None, []), ('đọc sách', '책을 읽다', None, None, []),
 ('nói tiếng Việt', '베트남어를 말하다', ('Em nói tiếng Việt được không?', '베트남어 할 수 있어?'), 'b-tieng-viet.webp', []),
 ('đi bệnh viện', '병원에 가다', ('Hôm nay tôi phải đi bệnh viện.', '오늘 저는 병원에 가야 해요.'), 'd16-benh-vien.webp', ['đến bệnh viện']),
 ('nghỉ một chút', '조금 쉬다', None, None, []),
 ('làm việc ở công ty', '회사에서 일하다', ('Chị tôi làm việc ở công ty Hàn Quốc.', '언니는 한국 회사에서 일해요.'), 'b-cong-ty.webp', [])]]
S = {'b17': [
 (1, 'to_ko', 'Tôi nói được tiếng Anh.', '저는 영어를 할 수 있어요.', ''),
 (2, 'to_ko', 'Em đã học tiếng Việt sáu tháng rồi.', '저는 베트남어를 6개월 동안 공부했어요.', 'Em đã học tiếng Việt 6 tháng rồi.'),
 (3, 'to_ko', 'Em ấy nói tiếng Việt rất giỏi.', '그 아이는 베트남어를 아주 잘해요.', ''),
 (4, 'to_ko', 'Em đi ngủ sớm đi!', '일찍 자세요!', ''),
 (5, 'to_ko', 'Em học tiếng Việt bao lâu rồi?', '베트남어를 얼마나 오래 공부했어요?', ''),
 (6, 'to_vi', 'Tôi nói được tiếng Nhật.', '저는 일본어를 할 수 있어요.', 'Tôi nói tiếng Nhật được. / Tôi có thể nói tiếng Nhật.'),
 (7, 'to_vi', 'Anh ấy nói tiếng Anh giỏi.', '그는 영어를 잘해요.', 'Anh ấy nói giỏi tiếng Anh. / Anh ấy nói tiếng Anh rất giỏi.'),
 (8, 'to_vi', 'Chị nghỉ một chút đi!', '조금 쉬세요!', 'Anh nghỉ một chút đi! / Nghỉ một chút đi!'),
 (9, 'to_vi', 'Anh đã sống ở Hàn Quốc bao lâu rồi?', '당신은 한국에서 얼마나 오래 살았어요?', 'Chị đã sống ở Hàn Quốc bao lâu rồi? / Anh sống ở Hàn Quốc bao lâu rồi?'),
 (10, 'to_vi', 'Phát âm tiếng Việt có khó không?', '베트남어 발음은 어려워요?', 'Phát âm tiếng Việt khó không?')]}

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
    key, label, W = 'b17', 'B반 10/14 단어 시험', B17
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
        assert len(words) == 40, (key, len(words))
        assert len({N(w['vi']) for w in words}) == 40, '낱말 겹침'
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'words': words})
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
        (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'10/14'" not in s:
        s = s.replace("'10/9', '10/13']", "'10/9', '10/13', '10/14']", 1); assert "'10/14'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
