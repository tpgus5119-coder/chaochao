# -*- coding: utf-8 -*-
"""주간시험 3 모의고사 다섯 벌을 **벌 사이에 차이가 없게** 섞는다 (2026-10-13 밤, 대표님 "동일한 회차의 모의고사 간에 차별점 두지 마라 — 비슷한 난이도·단어·문법").
전엔 ex1~ex5 가 벌마다 주제(외국어·날짜·가족…)를 달리 써서 낱말이 한 과에 쏠렸다(1벌 8과 22종·9과 3·10과 3, 2벌 9과 36종…).
방법: ex1~ex5 를 그대로 실행해 문항을 받은 뒤, 갈래마다 다섯 벌의 같은 자리 문항을 돌려 나눈다(새 k벌의 j번째 = 옛 (k+m·j)%5 벌의 j번째).
  · 듣기 2(한 사람 다섯 장면 그림)·쓰기 3(그림)은 벌에 붙은 것이라 그대로 둔다.
  · 읽기 1(보기 다섯 빈칸)은 벌마다 8·9·10과 문법 낱말을 섞은 새 보기·문장으로 다시 쓴다(아래 B1).
  · 듣기 3·4 는 1~5 문장·6~10 대화를 따로 돌리고, 대화 목소리 번갈이(fm/mf 차 ≤1)·함정 다섯 이상·같은 문장 겹침 검사는 common3.build 가 그대로 한다.
결과: 벌마다 8·9·10과 낱말이 고르게, 문법 상자(8과 12·9과 6·10과 8)를 다섯 벌이 비슷하게 덮는다. **이 파일이 빌드 입구다** — ex1~5 를 따로 돌리지 않는다.
쓰기: python3 tools/mock3/mix.py"""
import json, pathlib, re, shutil, sys, itertools
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / 'tools/mock3'))
import common3 as c
CAP = {}
def _cap(no, q): CAP[no] = q
c.build = _cap
for n in range(1, 6):
    src = (R / f'tools/mock3/ex{n}.py').read_text(encoding='utf-8')
    exec(compile(src, f'ex{n}.py', 'exec'), {'__name__': f'ex{n}', '__file__': str(R / f'tools/mock3/ex{n}.py')})
assert sorted(CAP) == [1, 2, 3, 4, 5]
SEC = lambda q, p: [x for x in q if x['sec'].startswith(p)]
# 읽기 1 — 벌마다 **헷갈리는 짝**으로 보기 다섯 (2026-10-13 밤, 유저 피드백 "빈칸 넣기 상향 조정" + 실제 2차 보기가 sẽ/sắp·lắm/quá 같은 짝이었다):
#   1 물음말(bao giờ·bao lâu·bao nhiêu·thứ mấy·thế nào) · 2 때 부사(mới·đã·sẽ·đang·sắp) · 3 가능·부정(được·được không·chưa·không·đừng) · 4 잇는 말(còn·cùng·với·cũng·nhưng) · 5 정도·끝말(khá·lắm·chứ·đấy·nhé)
# 2026-10-17 대표님 "문법상 답이 될 수 있는 게 2개 이상 아님? 답이 2개 이상이면 절대 안 된다" — 문장마다 보기 다섯을 다 넣어 보고 하나만 맞게 다시 짬
#   (전: Sinh nhật chị là ____(thứ mấy·bao giờ 둘 다) · ____ anh đi công tác(bao giờ·thứ mấy) · Anh ấy ____ đi công tác chưa(đã·sắp) · Bố là bác sĩ, ____ mẹ(còn·nhưng) ·
#    Hai anh em ____ học(cùng·cũng) · đi chợ ____ bà(với·cùng) · mắc ____!(lắm·đấy·chứ) 등). 같은 자리에 오는 말(끝말끼리·때 부사끼리)을 한 벌에 몰지 않는다.
# 문장 순위(대표님 2026-09-23): 1 교재 원문 · 2 교재 변형 · 3 수업 자료 원문 · 4 수업 자료 변형 · 5 새로 지음 — 정답이 하나뿐인 문장 안에서 이 차례로 고름 (10-24 다시 고름)
# 2026-10-24 대표님 "나이 비교와 còn·cùng·khá·chứ 는 왜 안 넣었냐 · 쌤이 bằng·như 는 10과 문법이라 했다" — 전 짜임은 벌마다 주제 하나라 10과가 4·5벌에 몰리고 chứ 는 0.
#   이제 벌마다 8과 하나 · 9과 하나 · 10과 상자(còn·cùng·khá·chứ) 둘 · 비교(bằng·hơn·như·bằng nhau·나이 hơn) 하나. 문장마다 보기 다섯을 다 넣어 보고 하나만 되게 짬
#   (còn 은 '아직'으로도 들어가 버리는 자리(còn mệt·còn sống)를 피해 'A. Còn B' 꼴에만, chứ 는 물음 끝(…chứ?)이 아닌 대답 'Có chứ!' 꼴에만).
B1 = {1: (["được", "bao giờ", "còn", "khá", "bằng"], [("Em nói tiếng Pháp ____ không?", "được", "프랑스어 할 수 있어요?"),
                                                  ("A: Anh đặt vé máy bay ____? B: Hôm qua.", "bao giờ", "비행기 표는 언제 예약했어요? – 어제요."),
                                                  ("Bố tôi mất rồi. ____ mẹ tôi đã về hưu.", "còn", "아빠는 돌아가셨어요. 그리고 엄마는 은퇴하셨어요."),
                                                  ("Nhà anh ấy ____ xa công ty.", "khá", "그의 집은 회사에서 꽤 멀어요."),
                                                  ("Tôi cao ____ chị Lan.", "bằng", "저는 란 언니만큼 키가 커요.")]),
      2: (["bao lâu", "xong", "cùng", "chứ", "hơn"], [("Anh còn ở đây ____ nữa?", "bao lâu", "여기 얼마나 더 계세요?"),
                                                 ("Tôi làm bài tập ____ rồi.", "xong", "저는 숙제를 다 했어요."),
                                                 ("Bố mẹ tôi ____ nghỉ hưu.", "cùng", "부모님은 함께 은퇴하셨어요."),
                                                 ("A: Anh có đi du lịch với bố mẹ không? B: Có ____.", "chứ", "부모님과 여행 가요? – 물론이죠."),
                                                 ("Tôi ____ em tôi 4 tuổi.", "hơn", "저는 동생보다 네 살 많아요.")]),
      3: (["mới", "bao giờ", "chứ", "còn", "như"], [("Tôi ____ đến Việt Nam hôm qua.", "mới", "저는 어제 막 베트남에 왔어요."),
                                                ("A: Chị đi Nha Trang ____? B: Tuần trước.", "bao giờ", "냐짱에 언제 갔어요? – 지난주에요."),
                                                ("A: Anh Sơn có em gái không? B: Có ____!", "chứ", "선 씨는 여동생이 있어요? – 그럼요!"),
                                                ("Mẹ tôi là giáo viên. ____ bố tôi là bác sĩ.", "còn", "엄마는 선생님이에요. 그리고 아빠는 의사예요."),
                                                ("Cô ấy đẹp ____ hoa.", "như", "그녀는 꽃처럼 예뻐요.")]),
      4: (["được không", "xong", "cùng", "khá", "bằng nhau"], [("Anh xem giùm tôi ____?", "được không", "좀 봐 줄 수 있어요?"),
                                                         ("Tôi ăn sáng ____ rồi.", "xong", "저는 아침을 다 먹었어요."),
                                                         ("Chúng tôi ____ đi thăm ông bà.", "cùng", "우리는 함께 조부모님을 뵈러 갔어요."),
                                                         ("Nhà tôi ____ xa trường.", "khá", "우리 집은 학교에서 꽤 멀어요."),
                                                         ("Tôi và chị Lan cao ____.", "bằng nhau", "저와 란 언니는 키가 같아요.")]),
      5: (["đừng", "từng", "còn", "chứ", "lớn hơn"], [("____ lo! Từ từ em sẽ giỏi hơn.", "đừng", "걱정하지 마! 차차 더 잘하게 될 거야."),
                                                 ("Nghe nói anh Brian đã ____ làm việc ở Seoul.", "từng", "브라이언 씨가 서울에서 일한 적이 있대요."),
                                                 ("Tôi là con cả. ____ anh?", "còn", "저는 첫째예요. 당신은요?"),
                                                 ("A: Anh có yêu vợ không? B: Có ____!", "chứ", "아내를 사랑해요? – 물론이죠!"),
                                                 ("Hoa ____ Lan 5 tuổi.", "lớn hơn", "호아는 란보다 다섯 살 많아요.")])}
# 읽기 4 는 보기 목록이 벌마다 다시 만들어지므로 짝(먼저 하는 말·뜻·대답·뜻)으로 되돌린다
def b4_pairs(items):
    out = []
    for x in items:
        m = re.match(r'(.*) — (.*)\n답: [A-J]\. (.*) — (.*)$', x['exp'], re.S); assert m, x['exp']
        out.append((m.group(1), m.group(2), m.group(3), m.group(4)))
    return out
OLD = {n: {'A1': SEC(q, 'A 듣기 · 1'), 'A2': SEC(q, 'A 듣기 · 2'), 'A3': SEC(q, 'A 듣기 · 3'), 'A4': SEC(q, 'A 듣기 · 4'), 'B2': SEC(q, 'B 읽기 · 2'),
            'B3': [SEC(q, 'B 읽기 · 3')[i:i + 2] for i in range(0, 10, 2)], 'B4': b4_pairs(SEC(q, 'B 읽기 · 4')), 'C1': SEC(q, 'C 쓰기 · 1'), 'C2': SEC(q, 'C 쓰기 · 2'), 'C3': SEC(q, 'C 쓰기 · 3'),
            'D1': SEC(q, 'D 말하기 · 1'), 'D2': SEC(q, 'D 말하기 · 2')} for n, q in CAP.items()}
import textbook3                                                   # 교재 8~10과 문장 그대로 쓰는 갈래(듣기 4·읽기 4·쓰기 1·2)로 갈아 끼움 (2026-10-17 대표님 "교재의 문장을 가급적 사용")
for _n, _g in textbook3.sets().items():
    for _k, _v in _g.items(): OLD[_n][_k] = _v
def rot(key, k, m, lo=0, hi=None):
    """새 k벌의 key 갈래: j번째 자리는 옛 (k+m*j)%5 벌의 j번째 (lo~hi 자리만)"""
    L = OLD[1][key]; hi = len(L) if hi is None else hi
    return [OLD[((k - 1 + m * j) % 5) + 1][key][j] for j in range(lo, hi)]
def assemble(k, M):
    q = []
    q += rot('A1', k, M[0]); q += OLD[k]['A2']
    q += rot('A3', k, M[1], 0, 5) + rot('A3', k, M[2], 5, 10); q += rot('A4', k, M[3], 0, 5) + rot('A4', k, M[4], 5, 10)
    q += c.B1S(k, *B1[k]); q += rot('B2', k, M[5])
    for pair in rot('B3', k, M[6]): q += pair
    q += c.B4S(k, rot('B4', k, M[7])); q += rot('C1', k, M[8]); q += rot('C2', k, M[9]); q += OLD[k]['C3']; q += rot('D1', k, M[10]) + rot('D2', k, M[11])
    return json.loads(json.dumps(q))
del c.build; import importlib; importlib.reload(c); build = c.build
bak = R / 'tools/mock3/_mix_bak'; bak.mkdir(exist_ok=True)
for n in range(1, 6):
    p = R / f'data/mock3_{n}.json'
    if p.exists(): shutil.move(str(p), str(bak / p.name))
def balance(sets):
    """대화 목소리 fm/mf 가 벌마다 비슷하게 — 많은 벌과 적은 벌이 같은 자리의 대화를 맞바꾼다(글·목소리는 그대로라 소리 파일도 그대로)"""
    def cnt(q): v = [x['voices'] for x in q if x.get('voices')]; return v.count('fm') - v.count('mf')
    for _ in range(40):
        d = {k: cnt(q) for k, q in sets.items()}
        hi = max(d, key=d.get); lo = min(d, key=d.get)
        if d[hi] - d[lo] <= 2: return True
        done = False
        for i, (x, y) in enumerate(zip(sets[hi], sets[lo])):
            if x.get('voices') == 'fm' and y.get('voices') == 'mf' and x['sec'] == y['sec']:
                sets[hi][i], sets[lo][i] = y, x; done = True; break
        if not done: return False
    return False
import random, gram_cover
# 2026-10-24 대표님 "다섯 개 모두 난이도 구분 없이, 문법과 단어 차별 없이 — 문장과 문제만 다르지 범위와 난이도는 동일하게":
#   나누기 배수 M 을 많이 뽑아, 교재 문법(gram_cover.PAT)마다 벌 사이 개수 차이(최대-최소)의 합이 가장 작은 차례부터 빌드해 본다.
_CH = json.loads((R / 'data/realbook.json').read_text(encoding='utf-8'))['books'][0]['chapters']
CHW = {c['bai']: [re.compile(r'(?<!\w)' + re.escape(w['vi'].lower()) + r'(?!\w)') for w in c['words']] for c in _CH if c['bai'] in (8, 9, 10)}
LEN_SECS = ('A 듣기 · 3', 'A 듣기 · 4', 'B 읽기 · 2', 'B 읽기 · 3', 'C 쓰기 · 1', 'C 쓰기 · 2')
def spread(sets):
    """벌 사이 차이 점수 — 교재 문법 개수(×3) + 8·9·10과 낱말 가짓수(×1) + 칸별 평균 문장 길이(낱말, ×4). 낮을수록 다섯 벌이 같다 (2026-10-24 대표님 '난이도·문법·단어 차별 없이')"""
    rows = {k: {g: sum(1 for u in gram_cover.units(q) if re.search(p, u)) for g, p in gram_cover.PAT.items()} for k, q in sets.items()}
    sc = 0
    for g in gram_cover.PAT:
        v = [rows[k][g] for k in rows]; sc += (max(v) - min(v)) * 3 + (10 if min(v) == 0 else 0)
    txt = {k: ' '.join(gram_cover.units(q)).lower() for k, q in sets.items()}
    for b, ws in CHW.items():
        v = [sum(1 for w in ws if w.search(txt[k])) for k in sets]; sc += max(v) - min(v)
    for sec in LEN_SECS:
        v = []
        for k, q in sets.items():
            us = gram_cover.units([x for x in q if x['sec'].startswith(sec)]); v.append(sum(len(u.split()) for u in us) / max(1, len(us)))
        sc += (max(v) - min(v)) * 4
    return round(sc, 1)
rnd = random.Random(7)
cand = [[1] * 12] + [[rnd.choice([1, 2, 3, 4]) for _ in range(12)] for _ in range(600)]
scored = sorted(((spread({k: assemble(k, M) for k in range(1, 6)}), i, M) for i, M in enumerate(cand)))
print('문법 차이 점수 — 처음', spread({k: assemble(k, cand[0]) for k in range(1, 6)}), '· 가장 좋은 것', scored[0][0])
order = [M for _, _, M in scored]
FIXED = ('A 듣기 · 2', 'B 읽기 · 1', 'B 읽기 · 4', 'C 쓰기 · 3')   # 벌에 붙은 그림 문항·보기 목록을 같이 쓰는 칸은 맞바꾸지 않는다
def swap_units(q):
    """맞바꿀 수 있는 자리 묶음 — 같은 지문을 쓰는 읽기 2·3 은 두 문항을 한 묶음으로"""
    out, i = [], 0
    while i < len(q):
        x = q[i]
        if x['sec'].startswith(FIXED): i += 1; continue
        j = i + 1
        while j < len(q) and q[j]['sec'] == x['sec'] and x.get('text') and q[j].get('text') == x.get('text'): j += 1
        out.append((i, j)); i = j
    return out
def dup(q):
    seen = {}
    for x in q:
        for u in gram_cover.units([x]):
            k = re.sub(r'[^\w\s]', '', u.lower()).strip()
            if len(k.split()) < 4: continue
            if k in seen and seen[k] != x['sec'][:9]: return True
            seen.setdefault(k, x['sec'][:9])
    return False
def polish(sets, seed):
    """같은 칸 같은 자리 문항을 벌 사이에서 맞바꿔 문법 차이를 줄인다(문장·꼴은 그대로, 어느 벌로 가는지만)"""
    r = random.Random(seed); best = spread(sets); U = swap_units(sets[1])
    for _ in range(4000):
        i, j = U[r.randrange(len(U))]; a, b = r.sample(range(1, 6), 2)
        if [x['sec'] for x in sets[a][i:j]] != [x['sec'] for x in sets[b][i:j]]: continue
        sets[a][i:j], sets[b][i:j] = sets[b][i:j], sets[a][i:j]
        sc = spread(sets) if not (dup(sets[a]) or dup(sets[b])) else 10 ** 9   # 한 벌 안 다른 칸에 같은 문장이 생기는 맞바꾸기는 하지 않는다(빌드가 막는다)
        if sc <= best: best = sc
        else: sets[a][i:j], sets[b][i:j] = sets[b][i:j], sets[a][i:j]
    return best
ok = False; tried = 0
while not ok and tried < min(400, len(order)):
    M = order[tried]; tried += 1
    sets = {k: assemble(k, M) for k in range(1, 6)}
    print('맞바꾸기 뒤 문법 차이 점수', polish(sets, tried))
    if not balance(sets): continue
    try:
        for k in range(1, 6): build(k, sets[k])
        ok = True; print('섞기 성공 M =', M, '시도', tried)
    except (SystemExit, AssertionError) as e:
        for n in range(1, 6): (R / f'data/mock3_{n}.json').unlink(missing_ok=True)
        print('실패', tried, str(e)[:160], flush=True)
if not ok:
    for f in bak.glob('*.json'): shutil.move(str(f), str(R / 'data' / f.name))
    raise SystemExit('섞기 실패 — 옛 파일 되돌림')
shutil.rmtree(bak)
