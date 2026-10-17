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
B1 = {1: (["bao giờ", "bao lâu", "bao nhiêu", "thứ mấy", "ở đâu"], [("Anh đi công tác Đà Nẵng ____, tháng này hay tháng sau?", "bao giờ", "다낭 출장은 언제 가요, 이번 달이에요 다음 달이에요?"),
                                                                 ("Chị sống ở Hà Nội ____ rồi?", "bao lâu", "하노이에 산 지 얼마나 됐어요?"), ("Vé xe lửa đi Huế ____ tiền?", "bao nhiêu", "후에 가는 기차표는 얼마예요?"),
                                                                 ("Hôm nay là ____?", "thứ mấy", "오늘은 무슨 요일이에요?"), ("Bưu điện ____ vậy anh?", "ở đâu", "우체국이 어디에 있어요?")]),
      2: (["đang", "xong", "từng", "nữa", "rồi"], [("Tôi ăn sáng ____ rồi.", "xong", "저는 아침을 다 먹었어요."), ("Tôi đã ____ sống ở Huế hai năm.", "từng", "저는 후에에서 2년 산 적이 있어요."),
                                                   ("Anh còn ở Hà Nội bao lâu ____?", "nữa", "하노이에 얼마나 더 있어요?"), ("Tôi đã đến Việt Nam một năm ____.", "rồi", "베트남에 온 지 1년 됐어요."),
                                                   ("Bây giờ chị ấy ____ xem phim, đừng gọi chị ấy.", "đang", "지금 그녀는 영화를 보고 있으니 부르지 마세요.")]),
      3: (["được", "được không", "chưa bao giờ", "không phải", "đừng"], [("Chị ấy đọc ____ tiếng Hàn.", "được", "그녀는 한국어를 읽을 수 있어요."), ("Chị dạy giùm em ____?", "được không", "저 대신 가르쳐 줄 수 있어요?"),
                                                   ("Tôi ____ đi Nhật, tôi muốn đi một lần.", "chưa bao giờ", "저는 일본에 가 본 적이 없어서 한 번 가 보고 싶어요."), ("Anh ấy ____ là người Nga.", "không phải", "그는 러시아 사람이 아니에요."),
                                                   ("____ lo lắng quá, em làm được mà!", "đừng", "너무 걱정하지 마, 너는 할 수 있어!")]),
      4: (["còn", "cùng", "với", "cũng", "nhưng"], [("Tôi là người Hàn. ____ anh?", "còn", "저는 한국 사람이에요. 당신은요?"), ("Chúng tôi học ____ một lớp.", "cùng", "우리는 같은 반에서 공부해요."),
                                                    ("Anh nói ____ cô ấy chưa?", "với", "그녀에게 말했어요?"), ("Anh ấy là con út, tôi ____ là con út.", "cũng", "그는 막내이고, 저도 막내예요."),
                                                    ("Chị ấy nhỏ tuổi ____ rất tự tin.", "nhưng", "그녀는 어리지만 아주 자신 있어요.")]),
      5: (["khá", "mấy", "nhất", "bằng", "từ"], [("Nhà anh ấy ____ xa trung tâm.", "khá", "그의 집은 시내에서 꽤 멀어요."), ("Gia đình anh có ____ người?", "mấy", "가족이 몇 명이에요?"),
                                                ("Nam cao ____ lớp.", "nhất", "남이 반에서 키가 제일 커요."), ("Tôi đi làm ____ xe buýt.", "bằng", "저는 버스로 출근해요."),
                                                ("Tôi học ____ thứ hai đến thứ sáu.", "từ", "저는 월요일부터 금요일까지 공부해요.")])}
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
import random
rnd = random.Random(7); ok = False; tried = 0
while not ok and tried < 400:
    tried += 1
    M = [1] * 12 if tried == 1 else [rnd.choice([1, 2, 3]) for _ in range(12)]
    sets = {k: assemble(k, M) for k in range(1, 6)}
    if not balance(sets): continue
    try:
        for k in range(1, 6): build(k, sets[k])
        ok = True; print('섞기 성공 M =', M, '시도', tried)
    except (SystemExit, AssertionError) as e:
        for n in range(1, 6): (R / f'data/mock3_{n}.json').unlink(missing_ok=True)
        if tried <= 3: print('실패', tried, str(e)[:160])
if not ok:
    for f in bak.glob('*.json'): shutil.move(str(f), str(R / 'data' / f.name))
    raise SystemExit('섞기 실패 — 옛 파일 되돌림')
shutil.rmtree(bak)
