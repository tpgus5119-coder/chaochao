#!/usr/bin/env python3
"""낱말 뜻(ko)에 섞인 영어를 걷어 낸다 (대표님 지시: 화면에 영어 뜻 금지, 2026-09-28 밤).
영어로 보는 기준: 부호 없는 로마자 낱말 가운데 베트남어 음절이 아닌 것(또는 to·the 같은 영어 기능어).
베트남어 예(괄호 속 'theo mẫu' 등)·사람 이름·약자(QR·ATM·km)는 남긴다.
걷어 낸 뒤 한글이 하나도 안 남는 뜻은 고치지 않고 따로 적어 둔다(클로드가 손으로 옮긴다).
쓰기: python3 tools/fix_senior/clean_en.py 보기   → 바뀔 것만 적는다 (scratchpad)
      python3 tools/fix_senior/clean_en.py 고치기 → 파일에 쓴다"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
SYL = None
EN_STOP = {"to", "the", "of", "a", "an", "in", "on", "for", "and", "or", "be", "is", "it", "at", "by", "up", "out", "off",
           "with", "as", "from", "not", "no", "do", "go", "get", "one", "all", "my", "your", "this", "that", "so", "very",
           "can", "how", "what", "who", "when", "where", "why", "i", "you", "he", "she", "we", "they", "me", "him", "her",
           "us", "them", "am", "are", "was", "were", "been", "has", "have", "had", "will", "would", "could", "should",
           "must", "may", "might", "time", "day", "man", "men", "sell", "good", "bad", "hot", "cold", "big", "small",
           "new", "old", "some", "any", "more", "most", "less", "than", "then", "there", "here", "into", "over", "under",
           "about", "after", "before", "down", "own", "make", "made", "take", "give", "put", "set", "let", "see", "say",
           "come", "way", "thing", "things", "person", "people", "place", "work", "job", "home", "car", "bus", "bike",
           "phone", "room", "same", "each", "other", "such", "only", "also", "just", "too", "much", "many", "few", "e", "g",
           "etc", "eg", "ie", "vs", "sb", "sth", "someone", "something", "one's", "oneself", "don", "t", "s", "doesn"}
KEEP = {"qr", "atm", "sns", "usb", "tv", "ok", "km", "kg", "cm", "mm", "ml", "gps", "sms", "led", "lcd", "wifi", "sim",
        "vnd", "usd", "it", "pr", "ceo", "ai", "app", "pcb", "cv", "hr", "qc", "kpi", "sop", "erp", "mc", "dj", "pc",
        "cpu", "ram", "dvd", "cd", "bmi", "dna", "ila", "topik", "vlpt", "ielts", "gdp", "vat", "id", "pin", "otp", "mv",
        "lp", "a", "b", "c", "s", "v", "o", "n", "x", "y"}


def syl():
    global SYL
    if SYL is None:
        words = json.loads((ROOT / "data/_vi_words.json").read_text(encoding="utf-8"))
        SYL = {s for w in words for s in str(w).lower().split()}
    return SYL


def is_keep(w, viw):
    """영어가 아닌 로마자 — 그 낱말의 베트남어 글에도 나오는 것(이름 Kate·Mary, tin), 약자(QR·km), 자리표시 대문자 한 글자(A·B)"""
    lw = w.lower().replace("’", "'")
    return lw in viw or lw in KEEP or (len(w) == 1 and w != "I")


# 부호 없이 쓴 베트남어 음절(ngang 성조) — 사전 표제어 속 순수 로마자 음절 가운데 베트남어 꼴인 것 (xanh·kinh·doanh·hoa·linh·ly…).
# 사전에 영어 외래어(check·test·email)가 섞여 있어 꼴(첫소리+모음+끝소리)로 한 번 더 거른다
VN_FORM = re.compile(r"(?:ngh|ng|gh|gi|kh|nh|ph|qu|th|tr|ch|[bcdghklmnprstvx])?"
                     r"(?:a|e|i|o|u|y|ai|ao|au|ay|eo|ia|iu|oa|oe|oi|oo|ua|ui|uo|uu|uy|ieu|yeu|oai|oay|oeo|uay|uoi|uya|uyu)"
                     r"(?:ch|nh|ng|c|m|n|p|t)?")
VN_ASCII = None


def vn_ascii():
    global VN_ASCII
    if VN_ASCII is None:
        VN_ASCII = {w for w in syl() if w.isascii() and w.isalpha() and VN_FORM.fullmatch(w)}
    return VN_ASCII


def is_en_word(w, viw=frozenset()):
    if not re.fullmatch(r"[A-Za-z][A-Za-z'’\-]*", w) or is_keep(w, viw):
        return False
    if w == "I":
        return True
    parts = [p for p in re.split(r"[-'’]", w.lower()) if p]
    return any(p not in vn_ascii() for p in parts)


EN_RUN = re.compile(r"[A-Za-z][A-Za-z'’\-]*(?:[ \t]*[,/&+]?[ \t]*[A-Za-z][A-Za-z'’\-]*)*(?:\.\.\.|…)?")


def run_is_en(s, a, b, viw=frozenset(), vi_bare=""):
    """s[a:b] 로마자 덩이가 영어인가. 남기는 것: ① 모두 is_keep ② 부호 있는 베트남어 낱말과 빈칸 하나로 이어진 것(hai mươi · hay không)
    ③ '(예) an khang = …' 예시 자리 ④ 한글이 바로 붙은 것(linh와 · tro의 — 베트남어·이름에 토씨) ⑤ 모두 부호 없는 베트남어 음절이고 영어 기능어만은 아닌 것.
    다만 덩이가 그 낱말의 베트남어를 부호만 뗀 것(아오자이 Ao Dai)이면 겹치니 걷는다"""
    run = s[a:b]
    ws = re.findall(r"[A-Za-z][A-Za-z'’\-]*", run)
    if not ws or all(is_keep(w, viw) for w in ws):
        return False
    if vi_bare and re.sub(r"\s+", " ", run.lower()).strip() == vi_bare:
        return True
    before, after = s[:a], s[b:]
    if re.search(r"[A-Za-zÀ-ỹĐđ]*[À-ỹĐđ][A-Za-zÀ-ỹĐđ]*\s$", before) or re.match(r"\s[A-Za-zÀ-ỹĐđ]*[À-ỹĐđ]", after):
        return False
    if re.search(r"\(예\)\s*$", before) and re.match(r"\s*=", after):
        return False
    if re.match(r"[가-힣]", after):
        return False
    if any(is_en_word(w, viw) for w in ws):
        return True
    return all(w.lower() in EN_STOP and not is_keep(w, viw) for w in ws)


def clean(ko, vi=""):
    s0 = s = str(ko)
    if not re.search(r"[A-Za-z]", s):
        return s
    viw = frozenset(re.findall(r"[a-z]+", str(vi).lower()))
    import unicodedata
    vi_bare = re.sub(r"\s+", " ", "".join(c for c in unicodedata.normalize("NFD", str(vi).lower()) if not unicodedata.combining(c)).replace("đ", "d")).strip()
    s = s.replace("／", "/")
    if re.search(r"[가-힣]", s):                                   # 영어 서수·큰 수: 'the 24th' · '1 million'
        s = re.sub(r"(?:\bthe\s+)?\b\d+(?:st|nd|rd|th)\b", "", s)
        s = re.sub(r"\b\d+\s+(?:million|billion|thousand|hundred)s?\b", "", s)
        s = re.sub(r"\b\d+-(?=[A-Za-z]{3})", "", s)                 # '4-way intersection' 의 '4-'
        s = re.sub(r"(?:\b(?:the|early|late)\s+)*\b\d{2,4}s\b", "", s)          # 'the early 1990s'
    # 베트남어 글자(부호 있는 로마자)에 바로 붙은 덩이는 건드리지 않는다 — 베트남어 낱말의 일부
    out, i, cut = [], 0, 0
    for m in EN_RUN.finditer(s):
        a, b = m.start(), m.end()
        prev = s[a - 1] if a > 0 else ""
        nxt = s[b] if b < len(s) else ""
        viet = re.match(r"[À-ỹĐđ]", prev or " ") or re.match(r"[À-ỹĐđ]", nxt or " ")
        if viet or not run_is_en(s, a, b, viw, vi_bare):
            continue
        out.append(s[i:a]); i = b; cut += 1
    out.append(s[i:])
    if not cut and s == s0.replace("／", "/"):
        return s0                                          # 걷어 낸 것이 없으면 한 글자도 안 바꾼다
    t = "".join(out)
    # 남은 부스러기 정리 — 빈 괄호·겹친 구분자·앞뒤 구분자
    for _ in range(4):
        t = re.sub(r"\(\s*[,/;:·\-–~=\s]*\)", "", t)
        t = re.sub(r"\[\s*\]", "", t)
        t = re.sub(r"\s*([,/;·])\s*(?:[,/;·]\s*)+", r"\1 ", t)
        t = re.sub(r"^\s*[,/;:·\-–=|]+\s*", "", t)
        t = re.sub(r"\s*[,/;:·\-–=(|]+\s*$", "", t)
        t = re.sub(r"\s+~$", "", t)                                  # 'keep (on) ~ing' 을 걷고 남은 물결표
        t = re.sub(r"\(\s*[?!.]+\s*\)", "", t)                        # 'right?' 를 걷고 남은 '(?)'
        t = re.sub(r"\(\s*\d+(?:\s+\d+)+\s*\)", "", t)                 # '(2 days 1 night)' 를 걷고 남은 '(2 1 )'
        t = re.sub(r"^[.…]+\s*(?=[^가-힣])", "", t)                    # 'even… also..' 를 걷고 남은 앞 점 ('…했을' 은 둔다)
        t = re.sub(r"(?:\s+[?!,.…]+)+$", "", t)                       # 'okay?, right?' · 'but also …' 를 걷고 남은 끝 부호
        t = re.sub(r"([^.])\.\.$", r"\1.", t)                          # '마세요.Don’t worry.' → '마세요.'
        if t.count("]") > t.count("["):
            t = re.sub(r"\s*\]\s*$", "", t)                             # '(fallen leaves)]' 를 걷고 남은 ']'
        if t.count("'") % 2 == 1:
            t = re.sub(r"\s*'\s*$", "", t)                               # "(quiet)'" 를 걷고 남은 따옴표
        t = re.sub(r",\s*\(", " (", t)                                # '자주, (*규칙적인 경우)' → '자주 (*규칙적인 경우)'
        t = re.sub(r"([.?!])\s+[.?!]+$", r"\1", t)                     # 'You are welcome.' 을 걷고 남은 마침표
        if re.fullmatch(r"\([^()]+\)(?:\s*/\s*\([^()]+\))+", t):             # '(환율)/(비율)' → '환율/비율'
            t = re.sub(r"\(([^()]+)\)", r"\1", t)
        t = re.sub(r"\s{2,}", " ", t).strip()
    m = re.fullmatch(r"\[(.*)\]", t)                                  # '[바로(강조)]' → '바로(강조)'
    if m:
        t = m.group(1).strip()
    m = re.fullmatch(r"\(([^()]*)\)", t)                              # 뜻 전체가 괄호 하나면 벗긴다: '(드물게)' → '드물게'
    if m:
        t = m.group(1).strip()
    if t.count("(") > t.count(")"):                                    # 한글 바로 뒤에 남은 여는 괄호 짝 맞추기
        t = t + ")"
    return t


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "보기"
    SP = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT
    changes, empty = [], []

    over = {}                                                        # 손으로 고친 뜻 (tools/fix_senior/뜻_손질.tsv)
    for line in (ROOT / "tools/fix_senior/뜻_손질.tsv").read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"):
            a0, b0, c0 = line.split("\t")[:3]
            over.setdefault(a0.strip().lower(), []).append((b0, c0.strip()))

    def fix(fname, vi, ko):
        if not isinstance(ko, str):
            return ko
        hand = next((c0 for b0, c0 in over.get(str(vi).strip().lower(), []) if b0 in ko), None)
        new = hand if hand else clean(ko, vi)
        if new == ko:
            return ko
        if not re.search(r"[가-힣]", new):
            empty.append((fname, vi, ko))
            return ko
        changes.append((fname, vi, ko, new))
        return new

    def walk(o, fname):
        if isinstance(o, dict):
            if isinstance(o.get("vi"), str) and isinstance(o.get("ko"), str):
                o["ko"] = fix(fname, o["vi"], o["ko"])
            for v in o.values():
                walk(v, fname)
        elif isinstance(o, list):
            for v in o:
                walk(v, fname)

    files = {}
    for f in ("basicwords", "days", "cohort22"):      # news_days 는 기사 봇이 고치는 파일이라 건드리지 않는다(영어는 IELTS 이름 하나뿐)
        p = ROOT / f"data/{f}.json"
        j = json.loads(p.read_text(encoding="utf-8"))
        walk(j["days"] if f == "days" else j, f)            # days.json 의 글자 카드(prep)는 i·e·ê 같은 글자 설명이라 뺀다
        files[f] = (p, j, 1)
    p = ROOT / "data/senior.json"
    sn = json.loads(p.read_text(encoding="utf-8"))
    for w in sn["words"]:
        w[1] = fix("senior", w[0], w[1])
    files["senior"] = (p, sn, None)
    p = ROOT / "data/exgloss.json"
    eg = json.loads(p.read_text(encoding="utf-8"))
    for k, v in eg.items():
        if isinstance(v, dict):
            v["ko"] = fix("exgloss", k, v.get("ko"))
        else:
            eg[k] = fix("exgloss", k, v)
    files["exgloss"] = (p, eg, 1)
    eg_full = {}                                                     # 짝 사전의 잘린 뜻을 온전히 채울 곳: 예문 낱말 뜻(exgloss) · 앱 낱말 뜻
    for kk0, vv0 in eg.items():
        ko0 = vv0.get("ko") if isinstance(vv0, dict) else vv0
        if isinstance(ko0, str) and ko0:
            eg_full.setdefault(kk0.strip().lower(), ko0)
    p = ROOT / "data/sib.json"
    sb = json.loads(p.read_text(encoding="utf-8"))
    app_full = {}                                                    # 앱 낱말의 온전한 뜻 (짝 사전에 30자에서 잘려 들어간 것을 되살린다)
    def grab(o):
        if isinstance(o, dict):
            if isinstance(o.get("vi"), str) and isinstance(o.get("ko"), str):
                app_full.setdefault(o["vi"].strip().lower(), []).append(o["ko"])
            for v0 in o.values():
                grab(v0)
        elif isinstance(o, list):
            for v0 in o:
                grab(v0)
    for f in ("gybm", "days", "order", "basicwords"):
        grab(files[f][1] if f in files else json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8")))
    for kk0, vv0 in eg_full.items():
        app_full.setdefault(kk0, []).append(vv0)
    for k, v in sb["w"].items():
        kk = v.get("k")
        if isinstance(kk, str) and len(kk) == 30:                    # 30자에서 잘린 뜻 → 앞머리가 같은 온전한 뜻으로
            full = next((x for x in app_full.get(k, []) if len(x) > 30 and x.startswith(kk[:24])), None)
            if full:
                changes.append(("sib", k, kk, full)); v["k"] = full; kk = full
        if isinstance(kk, str) and kk.startswith("{'ko': '"):          # 사전 꼴 글자가 뜻 칸에 그대로 들어간 것(잘려 있기도 하다) → 뜻만 꺼낸다
            full = eg_full.get(k)
            m = re.match(r"\{'ko': '([^']*)", kk)
            val = full or (m.group(1).strip() if m else "")
            if val:
                changes.append(("sib", k, kk, val)); v["k"] = val; kk = v["k"]
        if isinstance(kk, str):
            v["k"] = fix("sib", k, kk)
    files["sib"] = (p, sb, None)

    (SP / "en_changes.tsv").write_text("".join(f"{a}\t{b}\t{c}\t{d}\n" for a, b, c, d in changes), encoding="utf-8")
    (SP / "en_empty.tsv").write_text("".join(f"{a}\t{b}\t{c}\n" for a, b, c in empty), encoding="utf-8")
    print(f"바뀔 뜻 {len(changes)} · 영어뿐이라 손으로 옮길 것 {len(empty)}")
    if mode != "고치기":
        return
    touched = {c[0] for c in changes}
    for f, (p, j, fmt) in files.items():
        if f not in touched:
            continue
        txt = json.dumps(j, ensure_ascii=False, indent=1) if fmt == 1 else json.dumps(j, ensure_ascii=False)
        p.write_text(txt, encoding="utf-8")
    print("썼다")


if __name__ == "__main__":
    main()
