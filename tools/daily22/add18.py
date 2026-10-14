# -*- coding: utf-8 -*-
"""22기 B반 18회(b반/b18.pdf '국가 답지', 시험일 10/15 로 둠 — 대표님께 날짜 여쭘) → cohort22.json 회차 + 문장.tsv + build.py DATES. 2026-10-14 대표님 "a17, b18 추가해줘".
b18: 1~20 베→한(나라 이름 열 + được·không được·được không·bao lâu nữa …), 21~40 한→베, 문장 41~45 베→한 · 46~50 한→베. 뜻은 정답지 그대로.
나라 이름은 정답지의 베트남어 표기(Xin-ga-po·Mê-hi-cô·Ca-na-đa·Bra-xin·Ai-len) — 앱에 이미 그 꼴로 있다(국가 과). 없던 것: Ý(이탈리아, 앱 'Ý' 는 '뜻')·Anh(영국, 앱 'Anh' 은 '형') 은 깃발 그림을 PIL 로 새로(img/c22-y-italia·c22-anh-uk),
đất nước(quốc gia 그림)·người bản ngữ(tiếng mẹ đẻ 그림)·bao lâu nữa·bao lâu rồi(bao lâu 그림)·mới '막·겨우'(vừa mới 그림) 는 있는 그림을 쓰고 예문만 새로.
a17.pdf 는 a16.pdf 와 바이트까지 같은 파일(md5 adb01dcb…)이라 넣지 않았다 — 대표님께 여쭘. 쓰기: python3 tools/daily22/add18.py"""
import json, pathlib, sys, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools'))
from vi_kr import word as vi_kr
N = lambda s: U.normalize('NFC', s).lower().strip()
B18 = [(v, k, 'to_ko', ex, img, alt) for v, k, ex, img, alt in [
 ('Trung Quốc', '중국', None, None, []), ('Nhật Bản', '일본', None, None, []), ('Xin-ga-po', '싱가포르', None, None, []), ('Mê-hi-cô', '멕시코', None, None, []),
 ('Ý', '이탈리아', ('Tôi muốn đi du lịch Ý.', '저는 이탈리아에 여행 가고 싶어요.'), 'c22-y-italia.webp', []),
 ('Nga', '러시아', None, None, []), ('Úc', '호주', None, None, []), ('Tây Ban Nha', '스페인', None, None, []), ('Pháp', '프랑스', None, None, []), ('Hà Lan', '네덜란드', None, None, []),
 ('đất nước', '나라', ('Việt Nam là đất nước của tôi.', '베트남은 제 나라예요.'), 'b-quoc-gia.webp', []),
 ('quốc tịch', '국적', None, None, []), ('người nước ngoài', '외국인', None, None, []), ('tiếng Anh', '영어', None, None, []),
 ('người bản ngữ', '원어민', ('Tôi học phát âm với người bản ngữ.', '저는 원어민과 발음을 배워요.'), 'b-tieng-me-de.webp', []),
 ('phát âm', '발음', None, None, []), ('được', '~할 수 있다', None, None, []), ('không được', '~할 수 없다, ~하면 안 된다', None, None, []),
 ('được không', '~해도 돼요? / ~할 수 있어요?', None, None, []),
 ('bao lâu nữa', '앞으로 얼마나 (걸려요)', ('Bao lâu nữa anh về nước?', '얼마 후에 귀국해요?'), 'b-bao-lau.webp', [])]] + [(v, k, 'to_vi', ex, img, alt) for v, k, ex, img, alt in [
 ('Việt Nam', '베트남', None, None, []), ('Hàn Quốc', '한국', None, None, []),
 ('Ca-na-đa', '캐나다', ('Anh Tom là người Ca-na-đa.', '톰 씨는 캐나다 사람이에요.'), 'b-canada.webp', ['Canada']),
 ('Bra-xin', '브라질', None, None, ['Brazil', 'Braxin']), ('Đức', '독일', None, None, ['nước Đức']), ('Mỹ', '미국', None, None, ['nước Mỹ', 'Hoa Kỳ']),
 ('Ai-len', '아일랜드', None, None, ['Ireland', 'Ailen']),
 ('Anh', '영국', ('Chị ấy đã học ở Anh hai năm.', '그녀는 영국에서 2년 공부했어요.'), 'c22-anh-uk.webp', ['nước Anh']),
 ('Ba Lan', '폴란드', None, None, []), ('Thái Lan', '태국', None, None, []), ('người Việt', '베트남 사람', None, None, ['người Việt Nam']),
 ('tiếng Hàn', '한국어', None, None, ['tiếng Hàn Quốc']), ('tiếng Nhật', '일본어', None, None, []), ('nói', '말하다', None, None, []), ('biết', '할 줄 알다', None, None, []),
 ('trung tâm ngoại ngữ', '외국어센터', None, None, []),
 ('mới', '막 ~했다 / 겨우', ('Tôi mới học tiếng Việt một tháng.', '저는 베트남어를 배운 지 겨우 한 달 됐어요.'), 'w-f5d06ee27f.webp', ['vừa mới']),
 ('giúp', '~해 주다, 도와주다', None, None, ['giùm']), ('đừng', '~하지 마', None, None, []),
 ('bao lâu rồi', '얼마나 오래 됐어요?', ('Chị học tiếng Việt bao lâu rồi?', '베트남어 배운 지 얼마나 됐어요?'), 'b-bao-lau.webp', [])]]
S = {'b18': [
 (1, 'to_ko', 'Anh nói được mấy thứ tiếng?', '그는 몇 개 언어를 할 수 있어요?', ''),
 (2, 'to_ko', 'Tôi không nói được tiếng Nga.', '저는 러시아어를 못 해요.', ''),
 (3, 'to_ko', 'Chị sống ở Hàn Quốc bao lâu rồi?', '한국에서 산 지 얼마나 됐어요?', ''),
 (4, 'to_ko', 'Bao lâu nữa chúng ta đến Nhật Bản?', '얼마 후에 우리는 일본에 도착해요?', ''),
 (5, 'to_ko', 'Anh ấy mới đến Việt Nam hai tuần.', '그는 베트남에 온 지 겨우 2주 됐어요.', ''),
 (6, 'to_vi', 'Tôi nói được tiếng Nhật.', '저는 일본어를 말할 수 있어요.', 'Tôi nói tiếng Nhật được. / Tôi có thể nói tiếng Nhật.'),
 (7, 'to_vi', 'Tôi chụp ảnh ở đây được không?', '여기서 사진 찍어도 돼요?', 'Chụp ảnh ở đây được không? / Tôi có thể chụp ảnh ở đây không?'),
 (8, 'to_vi', 'Đừng nói tiếng Hàn ở đây.', '여기서 한국어로 말하지 마세요.', 'Ở đây đừng nói tiếng Hàn. / Đừng nói tiếng Hàn ở đây nhé.'),
 (9, 'to_vi', 'Chị nói giúp tôi bằng tiếng Anh được không?', '저 대신 영어로 말해 주실 수 있어요?', 'Anh nói giúp tôi bằng tiếng Anh được không? / Chị nói bằng tiếng Anh giúp tôi được không?'),
 (10, 'to_vi', 'Anh sẽ ở Thái Lan bao lâu?', '태국에 얼마나 오래 있을 거예요?', 'Chị sẽ ở Thái Lan bao lâu? / Anh ở Thái Lan bao lâu?')]}

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
    key, label, W = 'b18', 'B반 10/15 단어 시험', B18
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
    if "'10/15'" not in s:
        s = s.replace("'10/13', '10/14']", "'10/13', '10/14', '10/15']", 1); assert "'10/15'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
