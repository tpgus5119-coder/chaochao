#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""헷갈리는 짝 빌더 (tools/build_siblings.py) → data/siblings.json

대표님 제안(2026-09-24): 낱말 하나를 볼 때 ① 성조만 다른 낱말, ② o·ô·ơ 처럼 글자 모양이 조금 다른
낱말도 같이 보고 싶다("단어를 외울 때 성조도 쉽게 함께 외워지고 싶어").

만드는 것 (모두 **글자 규칙**으로 센다 — AI 를 쓰지 않는다)
  tone  : 성조만 다른 음절 가족.  열쇠 = 성조 부호를 뗀 음절 (ma → ma·mà·má·mả·mã·mạ)
  shape : 모양만 다른 음절 가족.  열쇠 = 모든 부호를 뗀 음절 + 성조 (co|ngang → co·cô·cơ)

뜻은 **우리 앱 안의 낱말**에서만 가져온다 — 지어내지 않는다.
  ① 한 음절 낱말로 앱에 있으면 그 뜻  ② 없으면 그 음절이 든 앱 낱말(예: chuyền → bóng chuyền 배구)
  ③ 둘 다 없는 짝은 '사전에 있는 다른 짝'으로만 적는다(뜻 미확인).
한국어기초사전 거꾸로 찾기는 시험해 보니 엉뚱한 뜻이 많아(múa→휘갈기다, tận→조사) 쓰지 않는다.

두 곳을 다 읽는다(docs/기준.md §13): days.json(하루 5분) · order.json(직무) · gybm.json · basicwords.json · senior.json · exgloss.json
"""
import json, pathlib, re, sys, unicodedata, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "siblings.json"

TONE_MARK = {0x0300: "huyền", 0x0301: "sắc", 0x0303: "ngã", 0x0309: "hỏi", 0x0323: "nặng"}
TONES = ["ngang", "huyền", "sắc", "hỏi", "ngã", "nặng"]
SHAPE_MARK = {0x0302, 0x0306, 0x031B}
ALLOWED = set(TONE_MARK) | SHAPE_MARK
NOT_VI = set("fjwz")
VOWELS = set("aeiouy")


def nfc(s):
    return unicodedata.normalize("NFC", s)


def low(s):
    return nfc(s).strip().lower()


def nfd(s):
    return unicodedata.normalize("NFD", s)


def tone_of(s):
    for c in nfd(s):
        if ord(c) in TONE_MARK:
            return TONE_MARK[ord(c)]
    return "ngang"


def strip_tone(s):
    return nfc("".join(c for c in nfd(s) if ord(c) not in TONE_MARK))


def strip_all(s):
    t = "".join(c for c in nfd(s) if not (0x0300 <= ord(c) <= 0x036F))
    return t.replace("đ", "d")


def is_vi_syl(s):
    """베트남 음절로 볼 수 있나 — 글자·부호가 다 베트남어 것이고, 모음이 있고, f j w z 가 없다."""
    if not s:
        return False
    for c in nfd(s):
        if 0x0300 <= ord(c) <= 0x036F and ord(c) not in ALLOWED:
            return False
    base = strip_all(s)
    if not re.fullmatch(r"[a-z]+", base):
        return False
    return bool(set(base) & VOWELS) and not (set(base) & NOT_VI)


def modern_penalty(s):
    """hòa·khỏe·thủy(새 표기)는 0, hoà·khoẻ·thuỷ(옛 표기)는 1 — 같은 낱말의 두 표기 중 새 것을 고르려고."""
    base = strip_all(s)
    m = re.search(r"(oa|oe|uy)(?:[a-z]*)$", base)
    if not m:
        return 0
    d = nfd(s)
    for i, c in enumerate(d):
        if ord(c) in TONE_MARK:
            prev = "".join(x for x in d[:i] if not (0x0300 <= ord(x) <= 0x036F)).replace("đ", "d")
            return 0 if len(prev) <= m.start() + 1 else 1
    return 0


# ---------- 한국어 뜻 다듬기 ----------
def tokens_of(ko):
    """앱에 적힌 뜻(예: '귀신, 유령 (ghost, spirit)')에서 짧은 한국어 뜻 조각만 뽑는다."""
    t = nfc(str(ko)).strip()
    t = re.split(r"\s[—–]\s|\s-\s", t)[0]
    inner = re.findall(r"\(([^()]*)\)", t)
    t2 = re.sub(r"\([^()]*\)", " ", t)
    if not re.search(r"[가-힣]", t2) and inner:
        t2 = inner[0]
    out = []
    for p in re.split(r"[;,/·]", t2):
        p = re.sub(r"\s+", " ", p).strip(" .")
        if not p or re.search(r"[A-Za-z()]", p) or not re.search(r"[가-힣0-9]", p):
            continue
        if len(p) > 12:
            continue
        if p not in out:
            out.append(p)
    return out


def join_tokens(gl):
    """gl = [(rank, ko), ...] → '볼·뺨' 처럼 최대 3조각, 20자 안쪽. 출처가 다르면 각 출처의 첫 조각부터 담는다."""
    gl = sorted(gl, key=lambda x: x[0])
    per = [tokens_of(k) for _, k in gl]
    picked = []
    for toks in per:
        if toks and toks[0] not in picked:
            picked.append(toks[0])
    for toks in per:
        for t in toks[1:]:
            if t not in picked:
                picked.append(t)
    picked = [t for t in picked if not re.fullmatch(r"[0-9]+", t)] or picked
    out = []
    for t in picked:
        cand = out + [t]
        joined = len("·".join(cand))
        if joined > 20 or (len(cand) > 2 and joined > 14) or len(cand) > 3:
            break
        out.append(t)
    return "·".join(out)


# ---------- 앱 낱말 모으기 ----------
def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def walk(x):
    if isinstance(x, dict):
        vi, ko = x.get("vi"), x.get("ko")
        if isinstance(vi, str) and isinstance(ko, str):
            yield vi, ko
        for v in x.values():
            yield from walk(v)
    elif isinstance(x, list):
        for v in x:
            yield from walk(v)


# 앱 자료에서 찾은 오타 — 짝 화면에 그대로 싣지 않는다(원본이 고쳐지면 이 목록에서 뺀다).
#   sấu=벌레      : 벌레는 sâu 다(예문도 'con sấu bò trên lá'). 선배 18기 자료(basicwords·gybm)의 오타로 보인다.
#   sưc           : sức(힘)의 오타 — 'sưc khỏe thể chất'(senior.json). p·t·c·ch 받침 규칙에 걸려 드러났다.
BAD_PAIR = {("sấu", "벌레")}
BAD_SYL = {"sưc"}


def collect():
    """낱말(소문자) → [(순위, 뜻)]. 순위가 낮을수록 믿는다(하루 5분 < 직무 < GYBM < 기초 < 선배 < 예문 낱말)."""
    raw = []
    raw += [(0, vi, ko) for vi, ko in walk(load("days.json"))]
    raw += [(1, vi, ko) for vi, ko in walk(load("order.json"))]
    raw += [(2, vi, ko) for vi, ko in walk(load("gybm.json"))]
    raw += [(3, vi, ko) for vi, ko in walk(load("basicwords.json"))]
    raw += [(4, w[0], w[1]) for w in load("senior.json")["words"]]
    raw += [(5, vi, v.get("ko", "")) for vi, v in load("exgloss.json").items() if isinstance(v, dict)]
    gl = collections.defaultdict(list)
    for rank, vi, ko in raw:
        vi = nfc(vi).strip()
        if not vi or not ko or vi[0].isupper():
            continue
        if re.search(r"[.,!?;:…()/\d]", vi):
            continue
        sy = vi.split()
        if len(sy) > 4 or not all(is_vi_syl(s) for s in sy):
            continue
        if BAD_SYL & set(sy) or any(vi == b and str(ko).startswith(k) for b, k in BAD_PAIR):
            continue
        gl[vi].append((rank, ko))
    return gl


def build():
    gl = collect()
    app_words = set(gl)
    app_syl = {s for w in app_words for s in w.split()}

    mean = {}
    for w, lst in gl.items():
        if " " not in w:
            m = join_tokens(lst)
            if m:
                mean[w] = m

    comp = collections.defaultdict(list)          # 음절 → [(음절 수, 순위, 낱말, 뜻)]
    for w, lst in gl.items():
        sy = w.split()
        if 2 <= len(sy) <= 4:
            m = join_tokens(lst)
            if not m:
                continue
            best = min(r for r, _ in lst)
            for s in set(sy):
                comp[s].append((len(sy), best, w, m))
    example = {}
    for s, lst in comp.items():
        lst.sort()
        ex = []
        for _, _, w, m in lst:
            if len(ex) < 1:
                ex.append((w, m.split("·")[0]))
        example[s] = ex[0]

    dictw = [low(w) for w in json.loads((DATA / "_vi_words.json").read_text(encoding="utf-8"))]
    dict_single = {w for w in dictw if " " not in w and is_vi_syl(w)}
    freq = collections.Counter(s for w in dictw for s in set(w.split()))

    def info(s):
        """[음절, 뜻] 또는 [음절, '', 예 낱말, 예 뜻] 또는 None(앱에 근거가 없다)."""
        if s in mean:
            return [s, mean[s]]
        if s in example:
            return [s, "", example[s][0], example[s][1]]
        return None

    universe = dict_single | app_syl
    tone_fam, shape_fam = {}, {}

    def variants_pick(vs):
        return sorted(vs, key=lambda s: (info(s) is None, modern_penalty(s), s not in app_syl, -freq[s], s))[0]

    # ---- 성조 가족
    by_base = collections.defaultdict(lambda: collections.defaultdict(list))
    for s in sorted(universe):
        by_base[strip_tone(s)][tone_of(s)].append(s)
    for base, slots in by_base.items():
        if base not in app_syl and not any(v in app_syl for vs in slots.values() for v in vs):
            continue
        m, u = [], []
        for t in TONES:
            vs = slots.get(t)
            if not vs:
                continue
            pick = variants_pick(vs)
            i = info(pick)
            if i:
                m.append(i)
            elif freq[pick] >= 2:
                u.append((freq[pick], pick))
        u = [p for _, p in sorted(u, reverse=True)[:3]]
        if len(m) >= 2 or (len(m) == 1 and u):
            tone_fam[base] = {"m": m, **({"u": u} if u else {})}

    # ---- 모양 가족 (성조는 같고 모음·đ 모양만 다르다)
    by_key = collections.defaultdict(lambda: collections.defaultdict(list))
    for s in sorted(universe):
        by_key[(strip_all(s), tone_of(s))][strip_tone(s)].append(s)
    for (base, t), forms in by_key.items():
        if len(forms) < 2:
            continue
        if not any(v in app_syl for vs in forms.values() for v in vs):
            continue
        m, u = [], []
        for form in sorted(forms, key=lambda f: (len([c for c in nfd(f) if 0x0300 <= ord(c) <= 0x036F]), f)):
            pick = variants_pick(forms[form])
            i = info(pick)
            if i:
                m.append(i)
            elif freq[pick] >= 2:
                u.append((freq[pick], pick))
        u = [p for _, p in sorted(u, reverse=True)[:3]]
        if len(m) >= 2 or (len(m) == 1 and u):
            shape_fam[f"{base}|{TONES.index(t)}"] = {"m": m, **({"u": u} if u else {})}

    return gl, app_words, app_syl, tone_fam, shape_fam


def panel_words(words, app_syl, tone_fam, shape_fam):
    """카드에 '헷갈리는 짝'이 뜨는 앱 낱말 수 — 음절 하나라도 자기 말고 짝이 있으면 뜬다."""
    n = 0
    for w in words:
        hit = False
        for s in w.split():
            f = tone_fam.get(strip_tone(s))
            g = shape_fam.get(f"{strip_all(s)}|{TONES.index(tone_of(s))}")
            for fam in (f, g):
                if fam and (len([i for i in fam["m"] if i[0] != s]) + len(fam.get("u", []))) > 0:
                    hit = True
        n += hit
    return n


def main():
    gl, app_words, app_syl, tone_fam, shape_fam = build()
    doc = {
        "note": "헷갈리는 짝 — tools/build_siblings.py 가 만든다(직접 고치지 않는다). tone: 성조 부호를 뗀 음절 열쇠 · "
                "shape: 모든 부호를 뗀 음절|성조번호 열쇠. m=뜻을 앱에서 찾은 짝 [음절, 뜻] 또는 [음절, '', 예 낱말, 예 뜻], u=사전에만 있는 짝(뜻 미확인).",
        "tone": tone_fam,
        "shape": shape_fam,
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    words = sorted(app_words)
    single = [w for w in words if " " not in w]
    print(f"앱 낱말 {len(words)}개 (한 음절 {len(single)}개) · 쓰인 음절 {len(app_syl)}개")
    print(f"성조 가족 {len(tone_fam)}개 · 모양 가족 {len(shape_fam)}개 · 파일 {OUT.stat().st_size:,}바이트")
    print(f"카드에 패널이 뜨는 앱 낱말 {panel_words(words, app_syl, tone_fam, shape_fam)}개 / {len(words)}개 "
          f"(한 음절 {panel_words(single, app_syl, tone_fam, shape_fam)}개 / {len(single)}개)")
    sixes = sum(1 for f in tone_fam.values() if len(f["m"]) == 6)
    print(f"여섯 성조가 다 있는 가족 {sixes}개")
    for k in ("ma", "ban", "co", "cô", "tai", "chuyên"):
        f = tone_fam.get(k)
        print(f"  tone[{k}] =", json.dumps(f, ensure_ascii=False) if f else None)
    for k in ("co|0", "mua|0", "an|0", "sau|2"):
        f = shape_fam.get(k)
        print(f"  shape[{k}] =", json.dumps(f, ensure_ascii=False) if f else None)
    if "--sample" in sys.argv:
        import random
        random.seed(11)
        print("\n-- 성조 가족 표본")
        for k in random.sample(sorted(tone_fam), 22):
            print(f"  {k:8}", " | ".join(f"{i[0]}={i[1] or '(' + i[2] + ' ' + i[3] + ')'}" for i in tone_fam[k]["m"]), "  +미확인", tone_fam[k].get("u", ""))
        print("-- 모양 가족 표본")
        for k in random.sample(sorted(shape_fam), 16):
            print(f"  {k:10}", " | ".join(f"{i[0]}={i[1] or '(' + i[2] + ' ' + i[3] + ')'}" for i in shape_fam[k]["m"]), "  +미확인", shape_fam[k].get("u", ""))


if __name__ == "__main__":
    sys.exit(main())
