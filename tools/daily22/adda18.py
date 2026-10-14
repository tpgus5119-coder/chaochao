# -*- coding: utf-8 -*-
"""22기 A반 18회(a반/a18.pdf — **문제지**뿐, 답지 없음; 시험일 10/15 로 둠) → cohort22.json 회차 + 문장.tsv + build.py NAME_KR. 2026-10-14 대표님 "a18도 추가해줘".
a18: 1~20 영어 뜻 → 베트남어(to_vi, a16 의 21~40 과 같은 스무 낱말) · 21~40 베트남어 → 뜻(to_ko) · 문장 1~5·9~10 베→한, 6~8 영→베.
답지가 없어 뜻·번역은 클로드가 썼다(영어 뜻은 한국어로 — 화면에 영어 안 씀). 앱에 없던 lòng·đau lòng·khám phá 는 Draw Things 그림(img/c22-long·c22-dau-long·c22-kham-pha)과 예문 새로,
'Đỉnh (núi)' 는 앱 'đỉnh'(다른 정답 đỉnh núi). 문장 속 이름(Sang Hyun·Minjun·Bong Jun·Dong Ha·G-Dragon)은 build.py NAME_KR 에 더함. 쓰기: python3 tools/daily22/adda18.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
A18 = [(v, k, 'to_vi', None, None, alt) for v, k, alt in [
 ('đơn', '신청서', []), ('xin', '청하다·부탁하다', []), ('chờ', '기다리다', []), ('nghe nói', '듣자 하니·~라고 들었다', []), ('hình như', '~인 것 같다', []),
 ('bằng', '~로(수단)', []), ('giùm', '(대신) ~해 주다', ['giúp']), ('quen', '익숙하다', []), ('bao lâu', '얼마나 오래', []), ('đừng', '~하지 마', []),
 ('trung tâm', '센터·학원', []), ('đã từng', '~해 본 적 있다', ['từng']), ('được', '~할 수 있다', []), ('tiếng mẹ đẻ', '모국어', []), ('Nga', '러시아', []),
 ('có khi', '~할 때가 있다', []), ('đừng lo', '걱정하지 마', []), ('ngoại ngữ', '외국어', []), ('đi ra ngoài', '밖에 나가다', []), ('sau đó', '그 후에·그다음에', [])]] + [(v, k, 'to_ko', ex, img, alt) for v, k, ex, img, alt in [
 ('bối rối', '당황하다·어쩔 줄 모르다', None, None, []), ('đừng', '~하지 마', None, None, []), ('quá khứ', '과거', None, None, []), ('hiện tại', '현재', None, None, []),
 ('tương lai', '미래', None, None, []), ('đau', '아프다', None, None, []),
 ('lòng', '마음·속', ('Mẹ tôi có tấm lòng rất tốt.', '우리 어머니는 마음씨가 아주 좋아요.'), 'c22-long.webp', []),
 ('đau lòng', '가슴 아프다', ('Nghe tin đó, tôi rất đau lòng.', '그 소식을 듣고 저는 아주 가슴이 아팠어요.'), 'c22-dau-long.webp', []),
 ('nhắn', '(메시지를) 남기다·전하다', None, None, []), ('tin', '소식·뉴스, 믿다', None, None, []), ('nhắn tin', '문자를 보내다', None, None, []), ('tin nhắn', '문자 메시지', None, None, []),
 ('tiến bộ', '발전하다·향상되다', None, None, []), ('biển', '바다', None, None, []), ('núi', '산', None, None, []),
 ('đỉnh', '정상·꼭대기(산)', None, None, ['đỉnh núi']),
 ('khám phá', '탐험하다·발견하다', ('Chúng tôi muốn khám phá thành phố này.', '우리는 이 도시를 탐험하고 싶어요.'), 'c22-kham-pha.webp', []),
 ('sai', '틀리다', None, None, []), ('rảnh', '한가하다', None, None, []), ('kỳ thi', '시험', None, None, [])]]
S = {'a18': [
 (1, 'to_ko', 'Sang Hyun ơi, đừng nói linh tinh!', '상현아, 헛소리하지 마!', ''),
 (2, 'to_ko', 'Minjun ơi, đừng ngủ trong lớp!', '민준아, 수업 중에 자지 마!', ''),
 (3, 'to_ko', 'Đau lòng là bài hát của G-Dragon.', "'Đau lòng'은 지드래곤의 노래예요.", ''),
 (4, 'to_ko', 'Em Bong Jun ơi, xoá bảng giúp em đi!', '봉준아, 칠판 좀 지워 줘!', ''),
 (5, 'to_ko', 'Dong Ha mới mua điện thoại mới.', '동하는 새 전화기를 막 샀어요.', ''),
 (6, 'to_vi', 'Anh ấy nói được tiếng gì?', '그는 무슨 언어를 할 수 있어요?', 'Anh ấy có thể nói tiếng gì? / Anh ấy nói tiếng gì được?'),
 (7, 'to_vi', 'Sang Hyun đã học tiếng Việt được bao lâu rồi?', '상현이는 베트남어를 공부한 지 얼마나 됐어요?', 'Sang Hyun học tiếng Việt bao lâu rồi? / Sang Hyun đã học tiếng Việt bao lâu rồi?'),
 (8, 'to_vi', 'Sang Hyun đã béo được bao lâu rồi?', '상현이는 통통해진 지 얼마나 됐어요?', 'Sang Hyun béo bao lâu rồi? / Sang Hyun đã mập được bao lâu rồi?'),
 (9, 'to_ko', 'Sang Hyun đã nói linh tinh được bao lâu rồi?', '상현이는 헛소리한 지 얼마나 됐어요?', ''),
 (10, 'to_ko', 'Sang Hyun đã đáng yêu được bao lâu rồi?', '상현이는 사랑스러워진 지 얼마나 됐어요?', '')]}

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
    key, label, W = 'a18', 'A반 10/15 단어 시험', A18
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
        C['days'].append({'no': max(d['no'] for d in C['days']) + 1, 'label': label, 'words': words})
        print(key, '낱말', len(words), '· 뜻→베', sum(w['dir'] == 'to_vi' for w in words), '· 예문 없음', [w['vi'] for w in words if 'ex' not in w])
        (R / 'data/cohort22.json').write_text(json.dumps(C, ensure_ascii=False, indent=1), encoding='utf-8')
    tsv = R / 'tools/daily22/문장.tsv'; txt = tsv.read_text(encoding='utf-8')
    for k2, rows in S.items():
        if f'\n{k2}\t' in txt: continue
        txt = txt.rstrip('\n') + '\n' + '\n'.join('\t'.join([k2, str(n), d, vi, ko, alt, '시험지']) for n, d, vi, ko, alt in rows) + '\n'
    tsv.write_text(txt, encoding='utf-8')
    bp = R / 'tools/daily22/build.py'; s = bp.read_text(encoding='utf-8')
    if "'Sang Hyun'" not in s:
        s = s.replace("'Seoul': '서울', 'Sang-hyeon': '상현'}", "'Seoul': '서울', 'Sang-hyeon': '상현', 'Sang Hyun': '상현', 'Minjun': '민준', 'Bong Jun': '봉준', 'Dong Ha': '동하', 'G-Dragon': '지드래곤'}", 1); assert "'Sang Hyun'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
