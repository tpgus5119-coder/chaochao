# -*- coding: utf-8 -*-
"""모의고사가 실제 시험지와 얼마나 비슷한지 — 갈래별 문장 길이·8~10과 낱말 몫·문법 종류 수를 실제 2차 시험(2026-10-12 녹음·사진) 수치와 맞댄다
(2026-10-13 밤, 대표님 "우리 모의고사와 실제 시험이 최대한 비슷하도록 모든 수치 조절해봐 — 단어·문법·말하기 속도 다").
실제 시험 글은 학교 자료라 여기 두지 않고 **수치만** 둔다(실제 2차: 듣기 1 6.2 · 듣기 2 7.0 · 듣기 3 문장 10.6·대화 12.2 · 듣기 4 문장 7.4·대화 8.2 · 읽기 2 지문 18.4 · 읽기 3 지문 22.6 ·
읽기 4 문장 7.0 · 배열 8.8 · 고치기 7.4 · 말하기 문장 6.4 · 말하기 낱말 2.0음절 · 내용 낱말 162종(새 범위 4~7과 85 = 52%) · 문법 67종 · 말 속도 2.6음절/초(우리 TTS 3.6 → 0.7배)).
쓰기: python3 tools/mock3/metrics.py [mock3|mock2|mock1]"""
import json, re, collections, pathlib, sys, statistics as st
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock3')); sys.path.insert(0, str(R / 'tools/gram_tok'))
import common3 as c
TARGET = {'A1': 6.2, 'A2': 7.0, 'A3s': 10.6, 'A3d': 12.2, 'A4s': 7.4, 'A4d': 8.2, 'B2': 18.4, 'B3': 22.6, 'B4': 7.0, 'C1': 8.8, 'C2': 7.4, 'D2': 6.4, 'D1syl': 2.0, 'new%': 52, 'kinds': 162, 'gram': 67}
FUNC = set('''là và của có không ở đi đến với cho để từ về trong trên dưới này đó kia ấy thì mà rồi chưa đã đang sẽ sắp cũng đều rất lắm quá hơi khá được bị phải nên vì tại sao
tôi anh chị em ông bà cô thầy bạn họ chúng tôi chúng ta nó mình ai gì nào đâu mấy bao nhiêu bao giờ bao lâu thế nào tại sao sao à ạ nhé đấy chứ hả ừ vâng dạ ơi
một hai ba bốn năm sáu bảy tám chín mười mươi trăm nghìn ngàn lẻ mốt lăm hay hoặc nhưng còn cùng vẫn mới vừa chỉ cả các những mỗi mọi vài nhiều ít xong lúc khi'''.split())
GT = json.load(open(R / 'data/_gram_tok.json', encoding='utf-8'))
RX = {it['id']: [re.compile(r, re.I) for r in it['re']] for it in GT['items']}
def gram_types(texts):
    out = set()
    for t in texts:
        for it in GT['items']:
            if not it.get('always') and any(x.search(t) for x in RX[it['id']]): out.add(it['id'])
    return out
def sec_texts(q):
    g = collections.defaultdict(list)
    for x in q:
        s = x['sec']
        if s.startswith('A 듣기 · 1'): g['A1'].append(x['audio'])
        elif s.startswith('A 듣기 · 2'): g['A2'].append(x['audio'])
        elif s.startswith('A 듣기 · 3'): g['A3d' if '\n' in x['audio'] else 'A3s'].append(x['audio'].replace('\n', ' '))
        elif s.startswith('A 듣기 · 4'): g['A4d' if '\n' in x['audio'] else 'A4s'].append(x['audio'].replace('\n', ' '))
        elif s.startswith('B 읽기 · 2'): g['B2'].append(x['text'])
        elif s.startswith('B 읽기 · 3'):
            if x['text'] not in g['B3']: g['B3'].append(x['text'])
        elif s.startswith('B 읽기 · 4'): g['B4'] += [x['prompt'], x['opts'][x['ans']]]
        elif x['k'] == 'puzzle': g['C1'].append(x['vi'])
        elif x['k'] == 'type' and x.get('fix'): g['C2'].append(x['fix'])
        elif s.startswith('D 말하기 · 1'): g['D1'].append(x['vi'])
        elif s.startswith('D 말하기 · 2'): g['D2'].append(x['vi'])
    return g
def kinds_of(q, lo):
    """내용 낱말 종류(기능어·이름 뺌) → {낱말: 과}. lo = 새 범위 첫 과"""
    kinds = {}
    for x in q:
        for f in ('audio', 'text', 'vi', 'prompt'):
            if isinstance(x.get(f), str) and not re.search('[가-힣]', x[f]):
                t = c.toks(x[f]); i = 0
                while i < len(t):
                    for n in (4, 3, 2, 1):
                        k = ' '.join(t[i:i + n])
                        if k in c.LES: 
                            if k not in FUNC and not re.fullmatch(r'\d+', k): kinds[k] = c.LES[k]
                            i += n; break
                    else: i += 1
    return kinds
def row(name, q, lo=8):
    g = sec_texts(q); avg = lambda k: st.mean(len(c.toks(x)) for x in g[k]) if g[k] else 0
    kinds = kinds_of(q, lo); new = sum(1 for b in kinds.values() if b >= lo)
    allt = [x for v in g.values() for x in v]
    r = {k: avg(k) for k in ('A1', 'A2', 'A3s', 'A3d', 'A4s', 'A4d', 'B2', 'B3', 'B4', 'C1', 'C2', 'D2')}
    r['D1syl'] = st.mean(len(x.split()) for x in g['D1']) if g['D1'] else 0
    r['new%'] = round(100 * new / max(1, len(kinds))); r['kinds'] = len(kinds); r['gram'] = len(gram_types(allt))
    return r
if __name__ == '__main__':
    pre = sys.argv[1] if len(sys.argv) > 1 else 'mock3'
    lo = {'mock3': 8, 'mock2': 4, 'mock1': 1}[pre]
    keys = list(TARGET)
    print(f"{'':9}" + ''.join(f'{k:>6}' for k in keys))
    print(f"{'실제 2차':9}" + ''.join(f'{TARGET[k]:>6}' for k in keys))
    for p in sorted((R / 'data').glob(f'{pre}_*.json')):
        r = row(p.stem, json.load(open(p, encoding='utf-8'))['q'], lo)
        print(f'{p.stem:9}' + ''.join(f'{r[k]:>6.1f}' if isinstance(r[k], float) else f'{r[k]:>6}' for k in keys))
