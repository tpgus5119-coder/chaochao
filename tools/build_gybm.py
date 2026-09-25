#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GYBM 통합 낱말 빌더 (tools/build_gybm.py) — 3차 재구성 — 중복 제거 범위를 **출처별**로 바꾼다.
대표님 지시(2026-09-23): "gybm 말고. 교재마다 중복단어 없도록. 메인교재1에 chao가
있다면 서브교재2에도 chao가 있을 수 있음. 그러나 메인교재2에도 있으면 안 된다.
일반회화나 직무회화에 chao 있어도 된다."
→ 중복 제거는 "메인교재(1·2권 합쳐서)" / "서브교재" / "수업자료" / "선배단어"
  네 출처 **각각의 안에서만** 한다. 출처가 다르면 같은 낱말이 각자 따로 있어도 된다.

지금까지 만든 예문(Qwen·클로드 창작분 포함)·그림 연결을 잃지 않도록, 재구성 전
gybm.json을 낱말(vi) 기준 캐시로 먼저 떠 두고, enrich() 가 이 캐시를 최우선으로 쓴다."""
import json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = str(ROOT / "data")
SP = str(ROOT / "data" / "_gybm_src")      # 서브 교재·수업 자료 낱말 원본(교재에서 뽑아 뜻을 단 것)
IMG = ROOT / "img"
sys.path.insert(0, str(ROOT / "tools"))
from vi_kr import word as vi_kr_word

def nfc(s):
    return unicodedata.normalize("NFC", s.strip())

# 대문자로 시작해야 뜻이 갈리는 낱말 — 중복 제거·캐시에서 소문자로 뭉개지 않는다 (Anh 영국 ≠ anh 형/오빠 · Ý 이탈리아 ≠ ý 뜻)
EXACT_CASE = {"Anh", "Ý"}

def key(s):
    t = nfc(s)
    return t if t in EXACT_CASE else t.lower()

def ckey(s):
    return nfc(s)

def is_england(w):
    # 같은 글자 'Anh' 라도 영국(나라)과 형/오빠는 다른 낱말 — 서로의 예문·그림을 물려받지 않게 한다
    return nfc(w["vi"]) == "Anh" and str(w.get("ko", "")).startswith("영국")

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

have_img = {p.name for p in IMG.glob("*.webp")}

def wname(ko):
    import hashlib
    k1 = nfc(ko).split("/")[0].strip()
    # gen_word_img.py 는 "(" 앞까지를 뜻으로 삼아 이름을 짓는다 — 둘 다 찾는다
    k2 = re.sub(r"\s+", " ", nfc(ko).split("/")[0].split("(")[0]).strip()
    for k in (k1, k2):
        if not k: continue
        n = "w-" + hashlib.sha1(k.encode()).hexdigest()[:10] + ".webp"
        if n in have_img: return n
    return None

def kko(k):
    t = nfc(str(k)).strip()
    t = re.sub(r"^\(\s*(?:명|동|형|부|전|접|대|수|조|감)(?:\s*[·/]\s*(?:명|동|형|부|전|접|대|수|조|감))*\s*\)\s*", "", t)
    t = t.split("/")[0]
    if not t.startswith("("):
        t = t.split("(")[0]
    else:
        t = t.strip("()")
    return re.sub(r"[\s,·]", "", t).strip()

# ---------- 기존 gybm.json → 낱말 캐시(예문·그림 보존용) ----------
old_cache = {}
old_src = {}      # (출처 key, 낱말) → 그 출처 안의 옛 낱말 — 같은 출처 값을 먼저 쓴다(메인에서 고친 예문·그림이 뒤 출처 값에 덮이지 않게, 2026-09-25)
old_path = pathlib.Path(DATA) / "gybm.json"
if old_path.exists():
    old = json.loads(old_path.read_text(encoding="utf-8"))
    for src in old["sources"]:
        for l in src["lessons"]:
            for w in l["words"]:
                if is_england(w): continue
                old_cache[ckey(w["vi"])] = w
                old_src.setdefault((src["key"], ckey(w["vi"])), w)
print(f"기존 gybm.json 캐시: {len(old_cache)}개 낱말 (예문·그림 재사용용)")

# ---------- basicwords.json 대조용(대소문자 안전) ----------
bw_list = load(f"{DATA}/basicwords.json")["words"]
bw_exact, bw_lower = {}, {}
for w in bw_list:
    ke = nfc(w["vi"])
    bw_exact.setdefault(ke, w)
    bw_lower.setdefault(ke.lower(), w)

def find_bw(vi):
    ke = nfc(vi)
    return bw_exact.get(ke) or bw_lower.get(ke.lower())

# ---------- 일상(days.json)+직무(order.json) 이미지 재사용 풀 ----------
img_by_vi, img_by_ko = {}, {}
def _index_word(w):
    im = w.get("img")
    if not im or im not in have_img:
        return
    img_by_vi.setdefault(key(w.get("vi", "")), im)
    kk = kko(w.get("ko", ""))
    if kk:
        img_by_ko.setdefault(kk, im)

dj = pathlib.Path(f"{DATA}/days.json")
if dj.exists():
    D = load(dj)
    for d in D["days"]:
        for w in (d.get("words") or []):
            _index_word(w)

oj = pathlib.Path(f"{DATA}/order.json")
if oj.exists():
    O = load(oj)
    def walk(v):
        for t in (v.get("tracks") or [v]):
            for c in t["chapters"]:
                for l in c["lessons"]:
                    yield from l["words"]
    for v in O["vols"]:
        for w in walk(v):
            _index_word(w)
    for w in O.get("gramwords", []):
        _index_word(w)

def find_reuse_img(vi, ko):
    return img_by_vi.get(key(vi)) or img_by_ko.get(kko(ko)) or wname(ko)

kr_cache = {}
def kr_of(vi):
    if vi not in kr_cache:
        try:
            kr_cache[vi] = vi_kr_word(vi)
        except Exception:
            kr_cache[vi] = None
    return kr_cache[vi]

def enrich(w, skey=None):
    out = {"vi": nfc(w["vi"]), "ko": w.get("ko", "")}
    if w.get("gl"):
        out["gl"] = 1        # 교재 낱말장(Bảng từ) 낱말 — 앱에서 '핵심' 표시 (tools/mark_glossary.py)
    ck = ckey(w["vi"])
    if is_england(w):
        bw = find_bw("Anh") or {}
        for f in ("kr_read", "ex", "img", "star", "weekly"):
            if bw.get(f): out[f] = bw[f]
        return out
    cached = old_src.get((skey, ck)) or old_cache.get(ck)
    if cached:
        # 이전에 이미 값을 구해 둔 낱말 — 예문·그림·발음을 그대로 재사용(새로 안 만든다)
        for f in ("kr_read", "ex", "ex_src", "img", "star", "weekly"):
            if cached.get(f):
                out[f] = cached[f]
        if out.get("img"):
            return out
        # 캐시에 그림이 없었으면 아래에서 한 번 더 재사용 탐색
    bw = find_bw(w["vi"])
    if bw:
        out.setdefault("kr_read", bw.get("kr_read") or kr_of(w["vi"]))
        if bw.get("ex") and not out.get("ex"):
            out["ex"] = bw["ex"]
        if bw.get("img") and not out.get("img"):
            out["img"] = bw["img"]
        if bw.get("star") and not out.get("star"):
            out["star"] = bw["star"]
        if bw.get("weekly") and not out.get("weekly"):
            out["weekly"] = bw["weekly"]
    if not out.get("kr_read"):
        out["kr_read"] = w.get("kr_read") or kr_of(w["vi"])
    if not out.get("img"):
        im = find_reuse_img(w["vi"], w.get("ko", ""))
        if im:
            out["img"] = im
    return out

CASE_LOG = []   # 대소문자만 다른데 뜻이 다른 쌍이 중복 제거로 사라지는지 본다
def dedupe(words, seen, skey=None):
    """seen 은 **출처 하나** 안에서만 공유한다 — 대표님 지시대로 출처 간에는 안 나눈다."""
    out = []
    for w in words:
        if not w.get("vi") or not w.get("ko"):
            continue
        k = key(w["vi"])
        if k in seen:
            prev = seen[k]
            if prev[0] != nfc(w["vi"]) and kko(prev[1]) != kko(w.get("ko", "")):
                CASE_LOG.append((prev[0], prev[1], nfc(w["vi"]), w.get("ko", "")))
            continue
        seen[k] = (nfc(w["vi"]), w.get("ko", ""))
        out.append(enrich(w, skey))
    return out

def chunk_chapters(chapters, seen, size=15, skey=None):
    lessons = []
    for ch in chapters:
        kept = dedupe(ch["words"], seen, skey)
        if not kept:
            continue
        parts = [kept[i:i + size] for i in range(0, len(kept), size)]
        for i, part in enumerate(parts):
            title = ch["title"]
            if len(parts) > 1:
                title = f"{title} · {i+1}부"
            lessons.append({"title": title, "sub": ch.get("title_ko", ""), "words": part})
    return lessons

# ================= 출처 1: 메인 교재 (1·2권 합쳐 하나의 출처) =================
rb = load(f"{DATA}/realbook.json")
main_chapters = []
for vol in rb["books"]:
    for ch in vol["chapters"]:
        main_chapters.append({"title": ch["title"], "title_ko": ch.get("title_ko", ""), "words": ch["words"]})
    if vol.get("glossary_supplement"):
        main_chapters.append({"title": f"{vol['title']} 낱말장 보충", "title_ko": "", "words": vol["glossary_supplement"]})

# ================= 출처 2: 서브 교재 =================
sub_chapters = []
phan1 = load(f"{SP}/sub_v1_phan1.json")
sub_chapters.append({"title": "Ngữ âm (발음 개념어)", "title_ko": "발음 개념어", "words": phan1["words"]})
for n in range(1, 9):
    d = load(f"{SP}/sub_v1_bai{n}.json")
    sub_chapters.append({"title": d["title"], "title_ko": d.get("title_ko", ""), "words": d["words"]})
glos = load(f"{SP}/sub_v1_glossary.json")
sub_chapters.append({"title": "Bảng từ (낱말장)", "title_ko": "낱말장", "words": glos})

# ================= 출처 3: 수업 자료(줌) =================
zoom_chapters = []
for n in range(1, 11):
    d = load(f"{SP}/zoom_bai{n}.json")
    zoom_chapters.append({"title": d["title"], "title_ko": d.get("title_ko", ""), "words": d["words"]})

# ================= 출처 4: 선배 시험 단어 =================
sets = load(f"{DATA}/basicword_sets.json")["sets"]
def bset_title(t):
    """차례는 회차(일차) 오름차순 → 같은 회차 안에서는 20기·19기·18기·17기 (대표님 지시 2026-09-25 #3).
    basicword_sets.json 이 이미 그 순서라 그대로 따라 걷는다 — 아래 검증(check_senior_order)이 어긋남을 잡는다."""
    if t["kind"] == "일일":
        return f"{t['no']}회차 · {t['cohort']}기"
    if t["kind"] == "주간":
        return f"주간 {t['no']}회 · {t['cohort']}기"
    return f"기타 모음 · {t['cohort']}기"

def check_senior_order(sets):
    def k(t):
        return ((0 if t["kind"] == "일일" else 1 if t["kind"] == "주간" else 2), int(t["no"] or 0), -int(t["cohort"]))
    bad = [(a, b) for a, b in zip(sets, sets[1:]) if k(a) > k(b)]
    assert not bad, f"선배 시험 세트 순서 어긋남 {len(bad)}곳: {bad[:3]}"
check_senior_order(sets)

senior_chapters = []
for s in sets:
    ws = [{"vi": v, "ko": (find_bw(v) or {}).get("ko", "")} for v in s["words"]]
    ws = [w for w in ws if w["ko"]]
    if ws:
        senior_chapters.append({"title": bset_title(s), "title_ko": "", "words": ws})

gybm = {
    "note": "GYBM 학습용 통합 낱말 — 중복 제거는 **출처 하나 안에서만** 한다"
            "(메인교재는 1·2권 합쳐 하나의 출처). 출처가 다르면 같은 낱말이 각자 있을 수"
            " 있다(대표님 지시, 2026-09-23: \"메인교재1에 chao 있으면 서브교재2에도 있을"
            " 수 있는데 메인교재2엔 없어야 한다\"). 일상회화·직무회화와는 원래 별개.",
    "sources": [
        {"key": "main", "label": "메인 교재", "sub": "Tiếng Việt Cho Người Nước Ngoài 1·2권",
         "lessons": chunk_chapters(main_chapters, {}, skey="main")},
        # 서브 교재·줌 수업 자료는 GYBM 에서 뺐다(대표님 결정 2026-09-25) — 일상회화 '보강' 세션(tools/build_boost.py)으로 쓴다.
        # 원본은 그대로 두고, 되살리려면 SUB_ZOOM = True.
        {"key": "senior", "label": "선배 시험 단어", "sub": "17~20기 매일·매주 시험",
         "lessons": chunk_chapters(senior_chapters, {}, skey="senior")},
    ],
}

SUB_ZOOM = False
if SUB_ZOOM:
    gybm["sources"][1:1] = [
        {"key": "sub", "label": "서브 교재", "sub": "Tiếng Việt Cơ sở", "lessons": chunk_chapters(sub_chapters, {}, skey="sub")},
        {"key": "zoom", "label": "수업 자료", "sub": "줌 수업 슬라이드 10개", "lessons": chunk_chapters(zoom_chapters, {}, skey="zoom")},
    ]

# ================= 출처 5: 22기 시험 단어 (대표님이 날마다 올려 주시는 시험 파일 → 올린 순서대로 한 일차씩) =================
# data/cohort22.json = {"days":[{"no":1,"words":[{"vi":..,"ko":..,"ex":{..}?}, ...]}, ...]}
# 아직 한 일차도 없으면 출처를 만들지 않는다(빈 출처가 화면에 뜨지 않게). 22기끼리만 중복을 뺀다.
c22p = pathlib.Path(f"{DATA}/cohort22.json")
if c22p.exists():
    c22 = load(c22p)
    ch22 = [{"title": f"{d['no']}회차 · 22기", "title_ko": "", "words": d["words"]}
            for d in sorted(c22.get("days", []), key=lambda d: d["no"]) if d.get("words")]
    if ch22:
        gybm["sources"].append({"key": "c22", "label": "22기 시험 단어", "sub": "22기 매일 시험 (올린 순서대로)",
                                "lessons": chunk_chapters(ch22, {}, skey="c22")})

with open(f"{DATA}/gybm.json", "w", encoding="utf-8") as f:
    json.dump(gybm, f, ensure_ascii=False, indent=1)

total = img_n = ex_n = 0
for s in gybm["sources"]:
    n = sum(len(l["words"]) for l in s["lessons"])
    ni = sum(1 for l in s["lessons"] for w in l["words"] if w.get("img"))
    ne = sum(1 for l in s["lessons"] for w in l["words"] if w.get("ex"))
    total += n; img_n += ni; ex_n += ne
    print(f"{s['label']:12s}: 레슨 {len(s['lessons']):4d}개, 낱말 {n:5d}개, img {ni:5d}, ex {ne:5d}")
print(f"전체 낱말(출처별 중복 허용): {total} · img있음 {img_n}({img_n*100//total}%) · ex있음 {ex_n}({ex_n*100//total}%)")
print("저장 완료:", f"{DATA}/gybm.json")
# 대소문자만 다르고 한글 뜻이 하나도 안 겹치는 쌍 = 서로 다른 낱말일 가능성 (예: Đông 동쪽 ↔ đông 붐비는)
_real = [a for a in CASE_LOG if not (set(re.findall(r"[가-힣]", a[1])) & set(re.findall(r"[가-힣]", a[3])))]
print(f"대소문자만 다른 중복 {len(CASE_LOG)}쌍 중 뜻이 다른 듯한 것 {len(_real)}쌍 (중복 제거로 한쪽이 사라짐)")
for a in _real: print("  남김", repr(a[0]), a[1][:22], "| 사라짐", repr(a[2]), a[3][:22])
