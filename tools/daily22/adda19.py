# -*- coding: utf-8 -*-
"""22기 A반 19회(a반/a19.pdf 정답지, 시험일 10/16 로 둠 — a18 다음) → cohort22.json 회차 + 문장.tsv + build.py DATES. 2026-10-15 대표님 "a19 추가했다".
a19: 1~18·20 영어 뜻 → 베트남어(to_vi), 19 'rỗi (= rảnh)' 와 21~40 베트남어 → 뜻(to_ko). 문장 1~5·9 베→뜻, 6~8·10 영→베. 영어 뜻은 한국어로(화면에 영어 안 씀).
문장 6 정답지 'Anh ấy nói tiếng Anh rất giỏi.' 는 물음(He speaks Vietnamese very well)과 어긋나는 오타로 보고 tiếng Việt 로(a16 의 'xem đĩ' 처럼).
앱에 없던 cấp 2(중학교)는 글로 'cấp hai'(다른 정답 cấp 2·trung học cơ sở), 그림은 trung học cơ sở 것. 'từ'(낱말)는 앱의 từ(~부터)와 뜻이 달라 그림·예문을 từ vựng 쪽으로. 쓰기: python3 tools/daily22/adda19.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
A19 = [(v, k, 'to_vi', ex, img, alt) for v, k, ex, img, alt in [
 ('giỏi', '잘하다', None, None, []), ('kém', '못하다, 부족하다', None, None, []), ('vậy', '그래서, 그럼', None, None, ['thế']),
 ('giùm', '(대신) ~해 주다', None, None, ['giúp']),
 ('cấp hai', '중학교', ('Em trai tôi đang học cấp hai.', '제 남동생은 중학교에 다녀요.'), 'w-f06a036b69.webp', ['cấp 2', 'trung học cơ sở']),
 ('đeo', '(장신구를) 하다, 차다', None, None, []), ('trễ', '늦다', None, None, ['muộn']), ('nên', '~해야 한다, 그래서', None, None, []),
 ('từ', '낱말, 단어', ('Tôi chưa biết từ này.', '저는 이 낱말을 아직 몰라요.'), 'b-tu-vung.webp', []),
 ('nghĩa', '뜻, 의미', None, None, []), ('đơn', '신청서', None, None, []), ('ở đây', '여기에(서)', None, None, []), ('tháng', '달, 월', None, None, []),
 ('từ từ', '천천히, 조금씩', None, None, ['một chút']), ('khi', '~할 때', None, None, []), ('nhưng', '하지만', None, None, []), ('hơn', '더, ~보다', None, None, []),
 ('đi dạo', '산책하다', None, None, [])]] + [
 ('rỗi', '한가하다(= rảnh)', 'to_ko', None, None, ['rảnh']),
 ('một mình', '혼자', 'to_vi', None, None, [])] + [(v, k, 'to_ko', ex, img, alt) for v, k, ex, img, alt in [
 ('giải thích', '설명하다', None, None, []), ('bảo tàng', '박물관', None, None, []), ('luyện', '연습하다', None, None, []), ('trung tâm', '센터', None, None, []),
 ('ngại', '쑥스럽다, 부끄럽다', None, None, []), ('thuốc', '약', None, None, []), ('sau khi', '~한 후에', None, None, []), ('trước khi', '~하기 전에', None, None, []),
 ('tin tức', '뉴스, 소식', None, None, []), ('chờ', '기다리다', None, None, []), ('đánh răng', '이를 닦다', None, None, []), ('đường', '길, 거리', None, None, []),
 ('lỗi', '실수, 잘못', None, None, []), ('làm thêm', '아르바이트하다', None, None, []), ('đừng lo', '걱정하지 마', None, None, []), ('cảm thấy', '느끼다', None, None, []),
 ('nghe nói', '~라고 듣다', None, None, []), ('thường', '보통, 자주', None, None, []), ('thức khuya', '밤늦게까지 깨어 있다', None, None, []), ('ngủ sớm', '일찍 자다', None, None, [])]]
S = {'a19': [
 (1, 'to_ko', 'Em mới học tiếng Việt một tháng.', '저는 베트남어를 배운 지 한 달밖에 안 됐어요.', ''),
 (2, 'to_ko', 'Bạn nên ngủ sớm, không nên thức khuya.', '일찍 자야 해요, 밤늦게까지 깨어 있으면 안 돼요.', ''),
 (3, 'to_ko', 'Trước khi đi ngủ, tôi luôn đánh răng.', '자기 전에 저는 늘 이를 닦아요.', ''),
 (4, 'to_ko', 'Từ từ em sẽ giỏi hơn.', '차차 더 잘하게 될 거예요.', ''),
 (5, 'to_ko', 'Em sẽ học bao lâu?', '얼마 동안 공부할 거예요?', ''),
 (6, 'to_vi', 'Anh ấy nói tiếng Việt rất giỏi.', '그는 베트남어를 아주 잘해요.', 'Anh ấy nói tiếng Việt giỏi lắm. / Anh ấy nói tiếng Việt giỏi quá.'),
 (7, 'to_vi', 'Hôm nay tôi đi bảo tàng một mình.', '오늘 저는 혼자 박물관에 가요.', 'Hôm nay tôi đi đến bảo tàng một mình. / Hôm nay tôi một mình đi bảo tàng.'),
 (8, 'to_vi', 'Đừng lo, lỗi này không sao đâu.', '걱정 마요, 이 실수는 괜찮아요.', 'Đừng lo, lỗi này không sao.'),
 (9, 'to_ko', 'Từ này tiếng Việt nghĩa là gì?', '이 낱말은 베트남어로 무슨 뜻이에요?', ''),
 (10, 'to_vi', 'Các bạn viết đơn đi.', '여러분, 신청서를 쓰세요.', 'Các bạn viết đơn đi!')]}

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
    key, label, W = 'a19', 'A반 10/16 단어 시험', A19
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
    if "'10/16'" not in s:
        s = s.replace("'10/14', '10/15']", "'10/14', '10/15', '10/16']", 1); assert "'10/16'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
