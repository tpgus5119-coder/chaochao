#!/usr/bin/env python3
"""한국어 모의고사 출제기 — 시험 '형식'을 따르되 문항은 우리가 만든다.

왜 이렇게 만드나:
  EPS 표준교재·공개문항, KIIP 교재·평가 견본은 모두 '변경금지' 또는 라이선스 미표시다.
  즉 기출 문항을 그대로 옮겨 쓰는 건 못 한다. 반면 시험의 **형식**(몇 문항, 어떤 유형,
  몇 분)은 저작물이 아니라 사실이라 그대로 따라도 된다. 그래서 형식만 베끼고
  문항은 우리 어휘 자료(국립국어원 학습용 어휘 5,744 + krdict 뜻풀이)로 새로 찍는다.

오답 보기 고르는 법:
  같은 등급(A/B/C) + 같은 품사에서만 뽑는다. 등급이 섞이면 난이도가 튀고,
  품사가 섞이면 뜻을 몰라도 형태만 보고 답이 찍힌다.
"""
import json, os, random, sys, unicodedata
import ko_content

DATA = os.path.join(os.path.dirname(__file__), "..", "data")

def load():
    words = json.load(open(os.path.join(DATA, "_ko_words.json"), encoding="utf-8"))
    gloss = json.load(open(os.path.join(DATA, "_ko_vi_gloss.json"), encoding="utf-8"))
    days = json.load(open(os.path.join(DATA, "days.json"), encoding="utf-8"))
    # 베트남어 과정에 붙여 둔 그림을 한국어 뜻으로 되짚어 재사용한다
    pics = {}
    for d in days["days"]:
        for w in d.get("words") or []:
            if w.get("img") and w.get("ko"):
                pics.setdefault(w["ko"].split("(")[0].strip(), w["img"])
    return words, gloss, pics

def clean_dfn(s):
    """뜻풀이에 표제어가 그대로 박혀 있으면 답이 새어 나간다 — 그런 건 안 쓴다."""
    return (s or "").strip()

def vi_tokens(s):
    """'y tá, bác sĩ' → {'y tá','bác sĩ'}. 뜻이 겹치는 보기를 걸러내는 데 쓴다."""
    return {t.strip().lower() for t in str(s or "").split(",") if t.strip()}

def pick_distractors(rng, answer, pool_by_key, key, n=3, distinct_vi=False):
    """오답은 같은 등급·같은 품사에서만 뽑는다.

    distinct_vi=True 면 보기끼리 베트남어 뜻이 한 조각도 겹치지 않게 한다 —
    보기 넷의 뜻이 겹치면 정답이 둘이 되어 문제가 깨진다.
    """
    pool = pool_by_key.get(key, [])
    cands = [w for w in pool if w["ko"] != answer["ko"]]
    if len(cands) < n:
        return None
    if not distinct_vi:
        return rng.sample(cands, n)

    for _ in range(30):                       # 겹치지 않는 조합이 나올 때까지 몇 번 다시 뽑는다
        pick = rng.sample(cands, n)
        sets = [vi_tokens(answer.get("vi"))] + [vi_tokens(w.get("vi")) for w in pick]
        if any(not s for s in sets):
            continue
        ok = all(not (sets[i] & sets[j])
                 for i in range(len(sets)) for j in range(i + 1, len(sets)))
        if ok:
            return pick
    return None

def mk_choice_q(rng, answer, distractors, stem, show, qtype, extra=None):
    opts = distractors + [answer]
    rng.shuffle(opts)
    q = {
        "type": qtype,
        "stem": stem,
        "options": [show(o) for o in opts],
        "answer": opts.index(answer),
        "word": answer["ko"],
    }
    if extra:
        q.update(extra)
    return q

# ── 문항 유형 ────────────────────────────────────────────────
def q_dfn2word(rng, w, gloss, pool_by_key):
    """뜻풀이를 주고 단어를 고르게 한다 (TOPIK·KIIP 어휘 유형)."""
    g = gloss.get(w["ko"]) or {}
    dfn = clean_dfn(g.get("ko_dfn"))
    if not dfn or w["ko"] in dfn:
        return None
    d = pick_distractors(rng, w, pool_by_key, (w["grade"], w["pos"]), distinct_vi=True)
    if not d:
        return None
    return mk_choice_q(rng, w, d, f"다음 설명에 맞는 단어는?\n{dfn}",
                       lambda o: o["ko"], "dfn2word")

def q_word2vi(rng, w, gloss, pool_by_key):
    """단어를 주고 베트남어 뜻을 고르게 한다 (학습자 자가 점검용)."""
    if not w.get("vi"):
        return None
    d = pick_distractors(rng, w, pool_by_key, (w["grade"], w["pos"]), distinct_vi=True)
    if not d:
        return None
    return mk_choice_q(rng, w, d, f"'{w['ko']}'의 뜻으로 알맞은 것은?",
                       lambda o: o["vi"], "word2vi")

def q_vi2word(rng, w, gloss, pool_by_key):
    """베트남어 뜻을 주고 한국어 단어를 고르게 한다 (산출 방향 — 더 어렵다)."""
    if not w.get("vi"):
        return None
    d = pick_distractors(rng, w, pool_by_key, (w["grade"], w["pos"]), distinct_vi=True)
    if not d:
        return None
    return mk_choice_q(rng, w, d, f"'{w['vi']}'에 해당하는 한국어는?",
                       lambda o: o["ko"], "vi2word")

# 그림 문항에 쓸 수 있는 낱말 — 그림 하나만 보고 그 말이 딱 떠오르는 것만 손으로 골랐다.
#
# 왜 손으로 골랐나: 그림은 베트남어 과정에 붙여 둔 것을 되쓰는데, 거기엔 동사·부사·
# 추상명사에도 그림이 있다("더", "가다", "세금"). 베트남어 수업에서는 앞뒤 문맥이 있어
# 통했지만, 시험 문항으로 그림만 떼면 무슨 뜻인지 알 길이 없다. 품사만으로는 못 거른다
# ("세금"도 명사다). 그래서 191개 명사를 눈으로 훑어 구체물만 남겼다.
#
# 오답도 반드시 이 목록에서 뽑는다 — 오답이 그림으로 못 그릴 말이면
# 그림을 안 보고도 "저건 그림이 안 되니 답이 아니다"로 찍어 맞힐 수 있다.
#
# 몸의 부위(손·코·입·머리)는 뺐다. 시험지를 실제로 그려 보고 알았다 —
# 테이프 그림이 "손에 들린 테이프"였는데 오답에 '손'이 있어 정답이 둘처럼 보였다.
# 물건 그림에는 그걸 쥔 손·사람이 딸려 나오는 일이 흔해서, 몸 부위는 오답으로 못 쓴다.
#
# 상위 개념어도 뺐다('야채'는 감자·당근·오이·토마토를 다 아우르고, '볶음밥'은 '밥'과 겹친다).
# 토마토 그림에 오답으로 '야채'가 붙으면 둘 다 맞는 말이라 다툴 거리가 된다.
PIC_OK = set("""
가위 감자 개 계단 고양이 고추 골목 공장 공항 구름 기계 기숙사 길 노래방 눈 단추 달걀
닭고기 당근 대사관 돈 돼지 두부 딸기 마늘 맥주 문 바나나 바늘 바지 밥 버스 병원
복숭아 비닐봉지 비행기 사과 사진 사탕 서류 선물 수박 숟가락 시장 신발 실
쓰레기 아이스크림 약 약국 엘리베이터 여권 오이 우산 은행 의자 자 장갑 전선
정류장 종이 주머니 지갑 집 창고 천 칼 커피 컴퓨터 택시 테이프 토마토 통로 호텔 화장실
""".split())

def q_pic2word(rng, w, gloss, pool_by_key, pics, pic_pool):
    """그림을 보고 단어를 고르게 한다 (EPS [1~4], KIIP [1~2] 유형)."""
    key = w["ko"].split("(")[0].strip()
    if key not in PIC_OK:
        return None
    img = pics.get(key)
    if not img:
        return None
    cands = [x for x in pic_pool if x["ko"] != w["ko"]]
    if len(cands) < 3:
        return None
    d = rng.sample(cands, 3)
    return mk_choice_q(rng, w, d, "그림에 맞는 것을 고르십시오.",
                       lambda o: o["ko"], "pic2word", extra={"img": img})

# 조사 문항 — 문틀은 직접 썼다(기출 전재 아님).
# 고르는 규칙: **주어진 보기 넷 중 하나만** 말이 되어야 한다.
#   보기에 없는 다른 조사가 또 맞는 건 상관없다("오늘도 비가"). 보기 안에 정답이 둘이면 안 된다.
#   그래서 오답은 기능이 확연히 다른 것(에게=사람에게, 처럼=비유, 마다=매번, 보다=비교)에서 골랐다.
PARTICLE_BANK = [
    ("아침마다 공원(   ) 걷습니다.", "에서", ["에게", "처럼", "보다"]),
    ("친구(   ) 같이 밥을 먹었습니다.", "와", ["를", "에게", "마다"]),
    ("회사(   ) 집까지 30분 걸립니다.", "에서", ["에게", "보다", "처럼"]),
    ("동생(   ) 선물을 주었습니다.", "에게", ["에서", "부터", "까지"]),
    ("오늘(   ) 비가 옵니다.", "은", ["를", "에게", "와"]),
    ("한국어(   ) 공부합니다.", "를", ["에게", "처럼", "마다"]),
    ("월요일(   ) 금요일까지 일합니다.", "부터", ["에게", "처럼", "보다"]),
    ("이 옷이 저 옷(   ) 쌉니다.", "보다", ["에게", "부터", "마다"]),
    ("커피(   ) 마실까요?", "를", ["에게", "처럼", "마다"]),
    ("주말에는 집(   ) 쉽니다.", "에서", ["에게", "보다", "처럼"]),
    ("가방 안(   ) 책이 있습니다.", "에", ["를", "처럼", "부터"]),
    ("저(   ) 베트남 사람입니다.", "는", ["를", "에게", "에서"]),
    ("학교(   ) 갑니다.", "에", ["를", "처럼", "보다"]),
    ("밥(   ) 먹었습니다.", "을", ["에", "에서", "처럼"]),
    ("병원(   ) 일합니다.", "에서", ["를", "처럼", "마다"]),
    ("형(   ) 함께 삽니다.", "과", ["를", "에", "부터"]),
    ("일요일(   ) 쉽니다.", "에", ["를", "처럼", "보다"]),
    ("시장(   ) 과일을 샀습니다.", "에서", ["에게", "처럼", "마다"]),
    ("어머니(   ) 전화를 드렸습니다.", "께", ["를", "에서", "부터"]),
    ("물(   ) 없습니다.", "이", ["을", "에게", "처럼"]),
    ("매일 두 시간(   ) 공부합니다.", "씩", ["에게", "부터", "처럼"]),
    ("이것은 제 것(   ) 아닙니다.", "이", ["을", "에게", "처럼"]),
    ("서울(   ) 기차로 갑니다.", "까지", ["에게", "처럼", "마다"]),
    ("그 사람(   ) 되고 싶습니다.", "처럼", ["를", "에서", "부터"]),
    ("사장님(   ) 오셨습니다.", "께서", ["를", "에게", "부터"]),
    ("아이(   ) 같이 갑니다.", "도", ["를", "에서", "처럼"]),
    ("방(   ) 창문이 있습니다.", "마다", ["를", "에게", "보다"]),
    ("친구(   ) 편지를 받았습니다.", "에게서", ["를", "처럼", "마다"]),
    ("저는 매운 것(   ) 못 먹습니다.", "을", ["에게", "처럼", "마다"]),
    ("여기(   ) 사진을 찍지 마세요.", "에서", ["를", "에게", "보다"]),
    ("다섯 시(   ) 만납시다.", "에", ["를", "처럼", "마다"]),
    ("지갑(   ) 잃어버렸습니다.", "을", ["에", "에게", "처럼"]),
    ("한국(   ) 온 지 3년 됐습니다.", "에", ["를", "처럼", "보다"]),
    ("날씨(   ) 좋습니다.", "가", ["를", "에게", "에서"]),
    ("은행(   ) 갔다 왔습니다.", "에", ["를", "처럼", "마다"]),
    ("연필(   ) 이름을 씁니다.", "로", ["에게", "마다", "보다"]),
]

def q_particle(rng, idx):
    stem, ans, wrong = PARTICLE_BANK[idx]
    opts = wrong + [ans]
    rng.shuffle(opts)
    return {"type": "particle", "stem": f"( )에 알맞은 것을 고르십시오.\n{stem}",
            "options": opts, "answer": opts.index(ans), "word": ans}

# ── 듣기·읽기 (직접 쓴 재료를 문항으로 감싼다) ────────────────
def q_listen_reply(rng, idx):
    """질문을 듣고 알맞은 대답을 고른다. 문제는 소리로만 나가고 화면엔 안 적힌다."""
    heard, ans, wrong = ko_content.LISTEN_REPLY[idx]
    opts = wrong + [ans]
    rng.shuffle(opts)
    return {"type": "listen_reply", "stem": "잘 듣고 알맞은 대답을 고르십시오.",
            "audio": [heard], "options": opts, "answer": opts.index(ans)}

def q_listen_dialog(rng, idx):
    """짧은 대화를 듣고 물음에 답한다. 질문은 글로 보여 준다(실제 시험도 그렇다)."""
    lines, q, ans, wrong = ko_content.LISTEN_DIALOG[idx]
    opts = wrong + [ans]
    rng.shuffle(opts)
    return {"type": "listen_dialog", "stem": f"잘 듣고 물음에 답하십시오.\n{q}",
            # 남녀가 번갈아 말하도록 목소리를 같이 실어 보낸다
            "audio": [{"v": "m" if who == "남" else "f", "t": text} for who, text in lines],
            "options": opts, "answer": opts.index(ans)}

def q_listen_pic(rng, w, pics, pic_pool):
    """낱말을 듣고 맞는 그림을 고른다 — 보기가 넷 다 그림이다."""
    key = w["ko"].split("(")[0].strip()
    img = pics.get(key)
    if not img:
        return None
    cands = [x for x in pic_pool if x["ko"] != w["ko"]]
    if len(cands) < 3:
        return None
    picked = [w] + rng.sample(cands, 3)
    rng.shuffle(picked)
    return {"type": "listen_pic", "stem": "잘 듣고 알맞은 그림을 고르십시오.",
            "audio": [w["ko"]],
            "options": [pics[x["ko"].split("(")[0].strip()] for x in picked],
            "answer": picked.index(w), "word": w["ko"], "optkind": "img"}

def q_read(rng, pidx, qidx):
    """지문을 읽고 물음에 답한다."""
    title, passage, qs = ko_content.READ_BANK[pidx]
    q, ans, wrong = qs[qidx]
    opts = wrong + [ans]
    rng.shuffle(opts)
    return {"type": "read", "stem": q, "passage": passage, "ptitle": title,
            "options": opts, "answer": opts.index(ans)}

# ── 시험 설계도 ──────────────────────────────────────────────
# 문항 수·시간·유형 배열은 실제 시험을 그대로 따랐다(형식은 사실이라 따라도 된다).
BLUEPRINTS = {
    # EPS-TOPIK은 읽기 20 + 듣기 20 = 40문항이다. 그 비율을 그대로 지켰다.
    "eps-topik": {
        "name": "EPS-TOPIK 모의고사",
        "desc": "고용허가제 한국어능력시험 · 읽기 20 + 듣기 20",
        "minutes": 50,
        "grades": ["A", "B"],
        "sections": [
            {"label": "[1~4] 그림을 보고 맞는 것을 고르십시오.", "kind": "pic2word", "n": 4},
            {"label": "[5~8] 다음 설명에 맞는 단어를 고르십시오.", "kind": "dfn2word", "n": 4},
            {"label": "[9~14] ( )에 알맞은 것을 고르십시오.", "kind": "particle", "n": 6},
            {"label": "[15~20] 다음 글을 읽고 물음에 답하십시오.", "kind": "read", "n": 6},
            {"label": "[21~26] 잘 듣고 알맞은 그림을 고르십시오.", "kind": "listen_pic", "n": 6},
            {"label": "[27~34] 잘 듣고 알맞은 대답을 고르십시오.", "kind": "listen_reply", "n": 8},
            {"label": "[35~40] 대화를 듣고 물음에 답하십시오.", "kind": "listen_dialog", "n": 6},
        ],
    },
    # KIIP 사전평가 필기에는 듣기가 없다(듣기 대신 구술이 따로 있다). 그래서 여기도 안 넣었다.
    "kiip-pre": {
        "name": "KIIP 사전평가 모의고사",
        "desc": "사회통합프로그램 기본소양 사전평가 필기 형식",
        "minutes": 50,
        "grades": ["A", "B", "C"],
        "sections": [
            {"label": "[1~2] 그림을 보고 알맞은 것을 고르십시오.", "kind": "pic2word", "n": 2},
            {"label": "[3~8] ( )에 알맞은 것을 고르십시오.", "kind": "particle", "n": 6},
            {"label": "[9~20] 다음 설명에 맞는 단어는?", "kind": "dfn2word", "n": 12},
            {"label": "[21~32] 뜻이 맞는 것을 고르십시오.", "kind": "word2vi", "n": 12},
            {"label": "[33~40] 다음 글을 읽고 물음에 답하십시오.", "kind": "read", "n": 8},
        ],
    },
    "topik-1": {
        "name": "TOPIK I 모의고사",
        "desc": "TOPIK I · 듣기 10 + 읽기 20",
        "minutes": 45,
        "grades": ["A", "B"],
        "sections": [
            {"label": "[1~4] 잘 듣고 알맞은 그림을 고르십시오.", "kind": "listen_pic", "n": 4},
            {"label": "[5~10] 잘 듣고 알맞은 대답을 고르십시오.", "kind": "listen_reply", "n": 6},
            {"label": "[11~18] 다음 설명에 맞는 단어는?", "kind": "dfn2word", "n": 8},
            {"label": "[19~24] ( )에 알맞은 것을 고르십시오.", "kind": "particle", "n": 6},
            {"label": "[25~30] 한국어로 알맞은 것을 고르십시오.", "kind": "vi2word", "n": 6},
        ],
    },
}

def build(exam_id, seed, words, gloss, pics, state):
    bp = BLUEPRINTS[exam_id]
    rng = random.Random(f"{exam_id}-{seed}")

    usable = [w for w in words if w["grade"] in bp["grades"]]
    # 그림 문항 전용 후보 — 정답도 오답도 여기서만 뽑는다
    pic_pool = [w for w in words
                if w["ko"].split("(")[0].strip() in PIC_OK
                and pics.get(w["ko"].split("(")[0].strip())]
    pool_by_key = {}
    for w in usable:
        pool_by_key.setdefault((w["grade"], w["pos"]), []).append(w)

    # 회차를 넘어 이어지는 기억. 1·2·3회차를 연달아 푸는 사람에게 같은 문제가 또 나오면 안 된다.
    used = state.setdefault("used_words", set())

    # 손으로 쓴 재료(조사 문틀·듣기 대본·읽기 지문)는 개수가 정해져 있다.
    # 회차마다 앞에서부터 꺼내 쓰고, 동나면 조용히 줄이지 말고 아래에서 부족분을 보고한다.
    def take(name, size):
        left = state.get(name)
        if left is None:
            left = list(range(size))
            random.Random(f"{exam_id}-{name}").shuffle(left)
            state[name] = left
        return left
    p_left = take("particles", len(PARTICLE_BANK))
    lr_left = take("listen_reply", len(ko_content.LISTEN_REPLY))
    ld_left = take("listen_dialog", len(ko_content.LISTEN_DIALOG))
    # 읽기는 (지문번호, 그 지문의 몇째 문항)이 한 짝이다
    rd_left = state.get("read")
    if rd_left is None:
        rd_left = [(pi, qi) for pi, p in enumerate(ko_content.READ_BANK) for qi in range(len(p[2]))]
        random.Random(f"{exam_id}-read").shuffle(rd_left)
        state["read"] = rd_left

    qs, skipped = [], 0

    for sec in bp["sections"]:
        made = 0
        tries = 0
        while made < sec["n"] and tries < 4000:
            tries += 1
            if sec["kind"] == "particle":
                if not p_left:
                    break
                q = q_particle(rng, p_left.pop(0))
            elif sec["kind"] == "listen_reply":
                if not lr_left:
                    break
                q = q_listen_reply(rng, lr_left.pop(0))
            elif sec["kind"] == "listen_dialog":
                if not ld_left:
                    break
                q = q_listen_dialog(rng, ld_left.pop(0))
            elif sec["kind"] == "read":
                if not rd_left:
                    break
                q = q_read(rng, *rd_left.pop(0))
            elif sec["kind"] == "listen_pic":
                w = rng.choice(pic_pool) if pic_pool else None
                if not w or w["ko"] in used:
                    continue
                q = q_listen_pic(rng, w, pics, pic_pool)
                if not q:
                    continue
                used.add(w["ko"])
            else:
                w = rng.choice(pic_pool if sec["kind"] == "pic2word" and pic_pool else usable)
                if w["ko"] in used:
                    continue
                fn = {"dfn2word": q_dfn2word, "word2vi": q_word2vi, "vi2word": q_vi2word}.get(sec["kind"])
                if fn:
                    q = fn(rng, w, gloss, pool_by_key)
                else:
                    q = q_pic2word(rng, w, gloss, pool_by_key, pics, pic_pool)
                if not q:
                    continue
                used.add(w["ko"])
            q["section"] = sec["label"]
            q["no"] = len(qs) + 1
            qs.append(q)
            made += 1
        if made < sec["n"]:
            skipped += sec["n"] - made
            print(f"  ! '{sec['label']}' {sec['n']}문항 요청 → {made}문항만 생성", file=sys.stderr)

    rebalance(rng, qs)

    return {
        "id": exam_id, "set": seed, "name": bp["name"], "desc": bp["desc"],
        "minutes": bp["minutes"], "total": len(qs), "shortfall": skipped,
        "questions": qs,
    }

def rebalance(rng, qs):
    """정답 번호를 네 자리에 고르게 흩는다.

    보기를 섞기만 하고 두면 정답이 한 번호에 몰리는 판이 가끔 나온다
    (실제로 20문항 중 13개가 ④번에 몰린 회차가 나왔다 — 그러면 ④만 찍어도 65점이다).
    운에 맡기지 말고, 각 번호가 전체의 1/4씩 되도록 정답과 그 자리의 보기를 맞바꾼다.
    보기 내용은 그대로고 자리만 바뀌므로 문제의 뜻은 달라지지 않는다.
    """
    targets = [i % 4 for i in range(len(qs))]
    rng.shuffle(targets)
    for q, t in zip(qs, targets):
        a = q["answer"]
        if a == t:
            continue
        q["options"][a], q["options"][t] = q["options"][t], q["options"][a]
        q["answer"] = t

if __name__ == "__main__":
    words, gloss, pics = load()
    print(f"어휘 {len(words)} · 뜻풀이 {len(gloss)} · 그림 {len(pics)}", file=sys.stderr)
    out = {"note": "형식만 실제 시험을 따르고 문항은 자체 생성. 기출 전재 아님.", "exams": [],
           # 정답이 하나가 아닌 문항 — AI가 채점한다
           "extra": {
               "speak": [{"passage": p, "questions": qs} for p, qs in ko_content.SPEAK_BANK],
               "write": [{"title": t, "chars": n} for t, n in ko_content.WRITE_BANK],
           }}
    for exam_id in BLUEPRINTS:
        state = {}                     # 시험 종류마다 따로 — EPS와 KIIP는 서로 겹쳐도 된다
        for seed in (1, 2, 3):
            e = build(exam_id, seed, words, gloss, pics, state)
            out["exams"].append(e)
            print(f"{exam_id} {seed}회차: {e['total']}문항 (부족 {e['shortfall']})", file=sys.stderr)
    path = os.path.join(DATA, "ko_exams.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("저장:", path, file=sys.stderr)
