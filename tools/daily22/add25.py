# -*- coding: utf-8 -*-
"""22기 B반 25회(시험일 10/23, 파일 날짜) — 2026-10-23 대표님 "b25 ㄱ". b25.pdf 는 **정답지뿐**(교재 1권 8·9과): 1~20 한→베(베트남어 정답만 적혀 있어 문제의 한국어는 클로드가 씀),
21~40 베→한(한국어 정답만 적혀 있어 문제 낱말의 베트남어는 교재 단어표에서 맞는 것 — 24 퇴근하다는 교재에 없어 tan làm), 문장 10 모두 한→베(변형 인정은 alt). 쓰기: python3 tools/daily22/add25.py"""
import json, pathlib, sys, unicodedata as U
B25 = [('ngoại ngữ', '외국어', 'to_vi', []), ('tiếng Việt', '베트남어', 'to_vi', []), ('tiếng Anh', '영어', 'to_vi', []), ('tiếng Hàn', '한국어', 'to_vi', ['tiếng Hàn Quốc']), ('tiếng Trung', '중국어', 'to_vi', ['tiếng Trung Quốc']), ('tiếng Nhật', '일본어', 'to_vi', ['tiếng Nhật Bản']), ('nói', '말하다', 'to_vi', []), ('nghe', '듣다', 'to_vi', []), ('đọc', '읽다', 'to_vi', []), ('viết', '쓰다', 'to_vi', []), ('có thể', '~할 수 있다', 'to_vi', ['được']), ('biết', '(할 줄) 알다', 'to_vi', []), ('một chút', '조금', 'to_vi', ['một ít']), ('giỏi', '잘하다', 'to_vi', ['lưu loát']), ('dịch', '번역하다, 통역하다', 'to_vi', ['phiên dịch']), ('thức dậy', '일어나다', 'to_vi', []), ('rửa mặt', '세수하다', 'to_vi', []), ('đánh răng', '이를 닦다', 'to_vi', []), ('tắm', '샤워하다, 목욕하다', 'to_vi', []), ('ăn sáng', '아침을 먹다', 'to_vi', ['ăn điểm tâm']), ('ăn trưa', '점심을 먹다', 'to_ko', []), ('ăn tối', '저녁을 먹다', 'to_ko', []), ('đi làm', '출근하다, 일하러 가다', 'to_ko', []), ('tan làm', '퇴근하다', 'to_ko', []), ('đi ngủ', '자러 가다', 'to_ko', []), ('tập thể dục', '운동하다', 'to_ko', []), ('chơi thể thao', '스포츠를 하다', 'to_ko', []), ('xem phim', '영화를 보다', 'to_ko', []), ('nghe nhạc', '음악을 듣다', 'to_ko', []), ('nấu ăn', '요리하다', 'to_ko', []), ('đi chợ', '장보다', 'to_ko', []), ('thường', '보통, 자주', 'to_ko', []), ('luôn luôn', '항상, 언제나', 'to_ko', []), ('thỉnh thoảng', '가끔, 때때로', 'to_ko', []), ('không bao giờ', '전혀(결코) ~하지 않다', 'to_ko', []), ('mấy giờ', '몇 시', 'to_ko', []), ('buổi sáng', '오전, 아침', 'to_ko', []), ('buổi chiều', '오후', 'to_ko', []), ('buổi tối', '저녁, 밤', 'to_ko', []), ('cuối tuần', '주말', 'to_ko', [])]
S = {'b25': [(1, 'to_vi', 'Anh ấy biết nói tiếng Việt không?', '그는 베트남어를 할 줄 압니까?', 'Anh ấy có thể nói tiếng Việt không?'), (2, 'to_vi', 'Tôi có thể nói tiếng Hàn nhưng không biết nói tiếng Trung Quốc.', '나는 한국어를 말할 수 있지만, 중국어는 할 줄 모릅니다.', ''), (3, 'to_vi', 'Bạn nói tiếng Anh có giỏi không?', '당신은 영어를 유창하게 잘합니까?', 'Bạn nói tiếng Anh có lưu loát không?'), (4, 'to_vi', 'Tôi có thể nói được một chút tiếng Việt.', '나는 베트남어를 조금 말할 수 있습니다.', ''), (5, 'to_vi', 'Anh Nam có thể nói tiếng gì?', '남 씨는 무슨 언어를 말할 수 있습니까?', 'Anh Nam có thể nói được tiếng gì?'), (6, 'to_vi', 'Hàng ngày bạn thức dậy lúc mấy giờ?', '매일 당신은 몇 시에 일어납니까?', ''), (7, 'to_vi', 'Tôi thường đi làm lúc 7 giờ rưỡi sáng.', '나는 보통 아침 7시 반에 출근합니다.', 'Tôi thường đi làm lúc 7 giờ 30 phút sáng.'), (8, 'to_vi', 'Buổi sáng, tôi thường không ăn sáng vì không có thời gian.', '아침에 나는 시간이 없어서 보통 아침 식사를 하지 않는다.', ''), (9, 'to_vi', 'Buổi tối, tôi thường học bài hoặc nghe nhạc.', '저녁에 나는 보통 공부를 하거나 음악을 듣는다.', ''), (10, 'to_vi', 'Vào cuối tuần bạn thường làm gì?', '주말에 당신은 보통 무엇을 합니까?', 'Cuối tuần bạn thường làm gì?')]}
IMG = {}
EX = {}
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
    for key, label, W in (('b25', 'B반 10/23 단어 시험', B25),):
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
    if "'10/23'" not in s:
        s = s.replace("'10/21', '10/22']", "'10/21', '10/22', '10/23']", 1); assert "'10/23'" in s
    bp.write_text(s, encoding='utf-8'); print('문장.tsv · build.py ok')
if __name__ == '__main__':
    main()
