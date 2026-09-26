#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""헷갈리는 짝 자료(data/sib.json) 만들기 — 대표님 지시 2026-09-27:
"성조 다른 것·모양 비슷한 것·동의어·반의어를 인터넷 사전처럼 최대한 다 넣어라. 앱에 없는 단어도. 한베·베한에 없으면 베영·영베에서라도."

만드는 것
  t  글자는 같고 성조만 다른 음절 가족        (열쇠 = 성조 부호를 뗀 음절)
  s  성조는 같고 모음·đ 모양만 다른 음절 가족  (열쇠 = 모든 부호를 뗀 음절|성조 번호)
  k  글자 뼈대(모든 부호 뗀 글자)가 같은 음절 전부 (열쇠 = 뼈대)
  w  낱말 → {k 한국어 뜻 · e 영어 뜻 · x [예 낱말, 예 뜻] · s 동의어[] · a 반의어[]}
뜻 순서(믿는 순서): ① 앱 낱말의 한국어 뜻 ② 사전으로 찾아 눈 검수한 뜻(data/_sib_meanings.json)
  ③ 베트남어 위키낱말의 한국어 번역({{ko}}) ④ 영어 위키낱말 뜻풀이(짧게) ⑤ 이 음절이 든 앱 낱말(예).
  뜻이 전혀 없는 낱말은 싣지 않는다(뜻 모르는 낱말을 늘어놓지 않는다).
동의어·반의어: 베트남어 위키낱말({{-syn-}}·{{-ant-}}) + 영어 위키낱말({{syn|vi|…}}·{{ant|vi|…}}) — 서로 짝이니 반대쪽에도 넣는다.
입력: data/_lex_src.json (위키낱말에서 받아 줄인 것: 낱말 → {ko, en, vs, va, es, ea}) · 앱 자료 · data/_sib_meanings.json · 옛 data/siblings.json
사용: python3 tools/build_lex.py
"""
import collections, json, pathlib, re, sys, unicodedata

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import build_siblings as bs

nfc = lambda s: unicodedata.normalize("NFC", s.strip().lower())
TM = {0x0300, 0x0301, 0x0303, 0x0309, 0x0323}
TONES = ["ngang", "huyền", "sắc", "hỏi", "ngã", "nặng"]


def strip_tone(s):
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if ord(c) not in TM))


def strip_all(s):
    d = unicodedata.normalize("NFD", s)
    return "".join(c for c in d if not (0x0300 <= ord(c) <= 0x036F)).replace("đ", "d")


def tone_idx(s):
    for c in unicodedata.normalize("NFD", s):
        if ord(c) in TM:
            return {0x0300: 1, 0x0301: 2, 0x0309: 3, 0x0303: 4, 0x0323: 5}[ord(c)]
    return 0


VI_WORD = re.compile(r"^[a-zà-ỹđ]+( [a-zà-ỹđ]+){0,3}$")


def short_en(d):
    """영어 뜻풀이 → 짧게: 앞 두 뜻만, 품사·꼬리표 뗌."""
    out = []
    for p in (d or "").split(" / "):
        if re.search(r"alternative (spelling|form)|Sino-Vietnamese|Romanization|obsolete|archaic|vulgar|synonym of|clip of|short for|initialism|abbreviation", p, re.I):
            continue
        t = re.sub(r"^\([A-Za-z -]+\)\s*", "", p)
        t = re.sub(r"^\s*(\([^)]*\)\s*)+", "", t)          # (dialectal) 같은 꼬리표
        t = re.sub(r"\{\{[^}]*\}?\}?|\(\s*\)", "", t).strip(" ;,.")
        t = re.split(r";", t)[0].strip()
        if t and len(t) > 1 and t not in out:
            out.append(t)
        if len(out) == 2:
            break
    if len(out) == 2 and len("; ".join(out)) > 34:
        out = out[:1]
    s = "; ".join(out)
    if len(s) > 40:
        s = s[:40].rsplit(" ", 1)[0]
        s = re.sub(r"(\s+(a|an|the|of|or|and|to|from|with|by|in|on|for|that|which|who|as|at))+$", "", s).rstrip(" ;,:") + "…"
    return s.rstrip(" ;,:") if s else ""


def short_ko_from_wiki(lst):
    out = []
    for x in lst:
        x = re.sub(r"\(.*?\)|«.*?»", "", x).strip()
        if x and re.search(r"[가-힣]", x) and len(x) <= 14 and x not in out:
            out.append(x)
        if len(out) == 2:
            break
    return "·".join(out)


def main():
    src = json.loads((R / "data/_lex_src.json").read_text(encoding="utf-8"))
    verified = json.loads((R / "data/_sib_meanings.json").read_text(encoding="utf-8"))
    old = json.loads((R / "data/siblings.json").read_text(encoding="utf-8")) if (R / "data/siblings.json").exists() else {"tone": {}, "shape": {}}
    gl = bs.collect()                               # 앱 낱말 → [(순위, 뜻)]
    app_k = {}
    for w, lst in gl.items():
        m = bs.join_tokens(lst)
        if m:
            app_k[w] = m
    old_k, old_x = {}, {}
    for kind in ("tone", "shape"):
        for fam in old.get(kind, {}).values():
            for it in fam.get("m", []):
                if it[1]:
                    old_k.setdefault(it[0], it[1])
                elif len(it) >= 4:
                    old_x.setdefault(it[0], [it[2], it[3]])

    # 클로드가 직접 옮기고 대조한 한국어 뜻(2026-09-27) — 가장 먼저 쓴다. '!' 는 낱말이 아닌 것(글자 이름 등)이라 뺀다.
    ko_fix = json.loads((R / "data/_sib_ko.json").read_text(encoding="utf-8")) if (R / "data/_sib_ko.json").exists() else {}

    def gloss(w):
        g = {}
        if ko_fix.get(w) == "!":
            return g
        k = ko_fix.get(w) or app_k.get(w) or old_k.get(w) or verified.get(w)
        s0 = src.get(w) or {}
        if not k and s0.get("ko"):
            k = short_ko_from_wiki(s0["ko"])
        if k:
            g["k"] = k
        e = short_en(s0.get("en", ""))
        if e:
            g["e"] = e
        if not k and not e and w in old_x:
            g["x"] = old_x[w]
        return g

    # ── 음절 전체: 사전의 한 음절 낱말 + 앱 음절 + 옛 짝 음절
    words = [nfc(w) for w in json.loads((R / "data/_vi_words.json").read_text(encoding="utf-8"))]
    syl = {w for w in words if " " not in w and VI_WORD.match(w)}
    syl |= {s for w in app_k for s in w.split() if VI_WORD.match(s)}
    syl |= {it[0] for kind in ("tone", "shape") for fam in old.get(kind, {}).values() for it in fam.get("m", [])}
    # 진짜 베트남어 음절 짜임인 것만 — 사전 표제어 중 붙여 쓴 외래어(amoniac·ankađien)가 음절로 끼지 않게
    SYL = re.compile(r"^(ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdghklmnpqrstvx]|)[aeiouy]{1,3}(ch|c|ng|nh|n|m|p|t|)$")
    def syl_ok(x):
        b = strip_all(x)
        if not SYL.match(b):
            return False
        if re.search(r"(p|t|c|ch)$", b) and tone_idx(x) not in (0, 2, 5):
            return False                      # 받침 p·t·c·ch 는 sắc·nặng 만 (ngang 은 표기 오류 방지 위해 허용)
        return True
    syl = {s for s in syl if bs.is_vi_syl(s) and s not in bs.BAD_SYL and syl_ok(s)}

    W = {}

    def need(w):
        if w not in W:
            g = gloss(w)
            if g:
                W[w] = g
        return w in W

    fam_t, fam_s, fam_k = collections.defaultdict(set), collections.defaultdict(set), collections.defaultdict(set)
    # 같은 소리인데 성조 부호 자리만 다른 표기(hòa/hoà · thủy/thuỷ)는 하나만 — 앱 낱말에 쓰인 쪽, 없으면 옛 표기(hòa)
    app_syl = {t for w in app_k for t in w.split()}
    def old_style(x):
        d = unicodedata.normalize("NFD", x)
        m = re.search(r"([ou])[^\W\d_]?[̣̀́̃̉]?([aey])", d)
        return bool(m and re.search(r"[̣̀́̃̉]", d[m.start(): m.start() + 3]) and not re.search(r"[̣̀́̃̉]", d[m.start() + 2:]))
    best = {}
    for s in sorted(syl):
        k2 = (strip_tone(s), tone_idx(s))
        sc = (s not in app_syl, not old_style(s), s)
        if k2 not in best or sc < best[k2][0]:
            best[k2] = (sc, s)
    keep = {v[1] for v in best.values()}
    for s in sorted(syl):
        if s not in keep or not need(s):
            continue
        fam_t[strip_tone(s)].add(s)
        fam_s[strip_all(s) + "|" + str(tone_idx(s))].add(s)
        fam_k[strip_all(s)].add(s)
    key_tone = lambda w: (tone_idx(w), strip_tone(w))
    T = {k: sorted(v, key=key_tone) for k, v in fam_t.items() if len(v) > 1}
    S = {k: sorted(v, key=key_tone) for k, v in fam_s.items() if len(v) > 1}
    K = {k: sorted(v, key=key_tone) for k, v in fam_k.items() if len(v) > 1}

    # ── 동의어·반의어 (양방향)
    rel = collections.defaultdict(lambda: {"s": [], "a": []})
    evid = collections.defaultdict(set)              # (종류, 낱말쌍) → 그 쌍을 적은 곳들 (위키 종류·방향)

    bad_rel = {frozenset(p) for p in json.loads((R / "data/_sib_badrel.json").read_text(encoding="utf-8"))} if (R / "data/_sib_badrel.json").exists() else set()

    def add(a, b, kind, tag):
        if a == b or not VI_WORD.match(a) or not VI_WORD.match(b) or frozenset((a, b)) in bad_rel:
            return
        evid[(kind,) + tuple(sorted((a, b)))].add(tag + ":" + a)
        for x, y in ((a, b), (b, a)):
            if y not in rel[x][kind]:
                rel[x][kind].append(y)
    for w, v in src.items():
        w = nfc(w)
        if not VI_WORD.match(w):
            continue
        for t in v.get("vs", []):
            add(w, nfc(t), "s", "vi")
        for t in v.get("es", []):
            add(w, nfc(t), "s", "en")
        for t in v.get("va", []):
            add(w, nfc(t), "a", "vi")
        for t in v.get("ea", []):
            add(w, nfc(t), "a", "en")

    def strong(kind, x, y):
        """두 위키가 다 적었거나, 양쪽 낱말 문서가 서로를 적었으면 믿는다."""
        e = evid.get((kind,) + tuple(sorted((x, y))), set())
        return len({t.split(":")[0] for t in e}) >= 2 or len({t.split(":")[1] for t in e}) >= 2
    # 동의어 거름 — 위키낱말의 동의어 칸에는 친척말(ba 아버지 ↔ bác 큰아버지)처럼 뜻이 조금 다른 것도 섞여 있다.
    # 두 낱말의 뜻(한국어 조각·영어 낱말)이 하나라도 겹치거나, 서로가 서로를 동의어로 적은 것만 남긴다.
    STOP = set("a an the of to be in on for and or with without one that this who which what from by as at it is are".split())
    def bag(w):
        g = W.get(w) or gloss(w)
        ks = {t for t in re.split(r"[·,; ]", g.get("k", "")) if len(t) >= 2}
        es = {t for t in re.findall(r"[a-z]{3,}", g.get("e", "").lower()) if t not in STOP}
        return ks, es
    def near(x, y):
        kx, ex = bag(x); ky, ey = bag(y)
        if ex & ey: return True
        return any(a == b or (len(a) >= 2 and len(b) >= 2 and (a in b or b in a)) for a in kx for b in ky)
    # 뜻(gloss)이 있는 낱말만, 한 낱말에 6개까지. 서로 동의어이면서 반의어인 모순은 반의어를 남기고 동의어에서 뺀다.
    n_rel = 0
    for w, r in rel.items():
        a = [x for x in r["a"] if need(x)][:6]
        s = [x for x in r["s"] if x not in a and need(x) and (near(w, x) or strong("s", w, x))][:6]
        if (a or s) and need(w):
            W[w]["a"], W[w]["s"] = a, s
            if not a: del W[w]["a"]
            if not s: del W[w]["s"]
            n_rel += 1
    for w, g in W.items():                            # 앱 낱말에 쓰이는 음절·낱말은 p:1 — 비슷한 낱말 목록에서 먼저 보인다
        if w in app_k or w in app_syl:
            g["p"] = 1
    for g in W.values():                              # 한국어 뜻이 있으면 영어 뜻(뜻 겹침 검사에만 썼다)은 화면 자료에서 뺀다
        if "k" in g:
            g.pop("e", None)
            g.pop("x", None)
    doc = {"t": T, "s": S, "k": K, "w": W}
    (R / "data/sib.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"성조 가족 {len(T)} · 모양 가족 {len(S)} · 뼈대 가족 {len(K)} · 낱말 {len(W)} (동의·반의 있는 낱말 {n_rel})")
    ko = sum(1 for g in W.values() if "k" in g); en = sum(1 for g in W.values() if "k" not in g and "e" in g); ex = sum(1 for g in W.values() if "k" not in g and "e" not in g)
    print(f"뜻 — 한국어 {ko} · 영어만 {en} · 예만 {ex}")


if __name__ == "__main__":
    main()
