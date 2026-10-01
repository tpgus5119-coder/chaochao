#!/usr/bin/env python3
"""사전 한 벌의 재료 (2026-10-01, 대표님: "위키는 그대로 카피 — 품사·모든 뜻·차례 그대로·유의어·반의어·영어로도 검색").
영어 위키낱말(data/_dict_gloss.json raw, 46,934 표제어) + 베트남어 위키낱말(우리에 없던 18,268, scratchpad viwikt_text*.json)에서
표제어마다 [품사, 표시, 뜻(원문 언어)] 를 **원문 차례 그대로 전부**, 유의어·반의어를 뽑는다 → tools/dict_full/src.json"""
import json, re, sys, pathlib, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools")); from gloss_all import parse, clean
SP = sys.argv[1] if len(sys.argv) > 1 else "/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad/"
nfc = lambda s: U.normalize("NFC", s)
def rel_en(raw):
    syn, ant = [], []
    for kind, lst in (("syn", syn), ("ant", ant)):
        for m in re.finditer(r"\{\{" + kind + r"\|vi\|([^}]*)\}\}", raw):
            for x in m.group(1).split("|"):
                x = x.strip()
                if x and "=" not in x and not x.startswith("Thesaurus") and x not in lst: lst.append(nfc(x))
    for head, lst in (("Synonyms", syn), ("Antonyms", ant)):
        for m in re.finditer(r"=+" + head + r"=+\n((?:\*.*\n?)+)", raw):
            for x in re.findall(r"\{\{l\|vi\|([^|}]*)", m.group(1)) + re.findall(r"\[\[([^\]|#]*)", m.group(1)):
                x = x.strip()
                if x and not x.startswith("Thesaurus") and x not in lst: lst.append(nfc(x))
    return syn, ant
VPOS = {"noun": "Noun", "n": "Noun", "pr-noun": "Proper noun", "verb": "Verb", "v": "Verb", "adj": "Adjective", "a": "Adjective", "adjc": "Adjective", "adv": "Adverb",
        "pronoun": "Pronoun", "pron": "Pronoun", "conj": "Conjunction", "prep": "Preposition", "intj": "Interjection", "interj": "Interjection", "num": "Numeral",
        "class": "Classifier", "part": "Particle", "phrase": "Phrase", "idiom": "Idiom", "proverb": "Proverb", "prefix": "Prefix", "suffix": "Suffix"}
def vi_section(t):
    m = re.search(r"==\s*\{\{langname\|vi\}\}\s*==", t)
    if m:
        t = t[m.end():]; m2 = re.search(r"\n==\s*\{\{langname\|", t); return t[:m2.start()] if m2 else t
    m = re.search(r"\{\{-vie-\}\}", t)
    if m: t = t[m.end():]
    # 다른 언어 절의 머리 — 품사 머리({{-noun-}} 등)와 헷갈리지 않게 언어 부호만 (전에 품사 머리에서 잘려 1만 4천 개를 잃었다)
    m2 = re.search(r"\{\{-(?:eng|fra|zho|jpn|kor|deu|spa|rus|ita|por|tha|khm|lao|cmn|nan|yue|hak|lat|tgl|msa|ind|nld|swe|pol|tur|ara|hin|mya|ceb|fin|hun|ces|ell|heb|vie-old|tày|tay|mnw|cjy)-\}\}", t)
    return t[:m2.start()] if m2 else t
def vclean(s):
    s = re.sub(r"\[\[([^\]|]*)\|([^\]]*)\]\]", r"\2", s); s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{nhãn\|vi\|([^}]*)\}\}", r"(\1)", s); s = re.sub(r"\{\{(?:lb|label|term)\|vi\|([^}]*)\}\}", r"(\1)", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s); s = s.replace("'''", "").replace("''", ""); s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", s).strip(" :;")
def parse_vi(txt):
    t = vi_section(txt); out, syn, ant, cur, sec = [], [], [], None, None
    for line in t.split("\n"):
        pm = re.match(r"\s*(?:===\s*\{\{ĐM\|([a-z-]+)\}\}\s*===|\{\{-([a-z-]+)-\}\})", line)
        if pm:
            key = pm.group(1) or pm.group(2); sec = key
            if key in ("pron", "trans", "ref", "etym", "see", "also", "der", "rel", "dev", "syn", "ant"): cur = None if key not in ("syn", "ant") else cur
            else: cur = VPOS.get(key, "")
            continue
        if sec in ("syn", "ant") and line.lstrip().startswith("*"):
            for x in re.findall(r"\[\[([^\]|#]*)", line):
                (syn if sec == "syn" else ant).append(nfc(x.strip()))
            continue
        if cur is not None and sec not in ("syn", "ant") and re.match(r"\s*#\s*[^#:*]", line) or (cur is None and sec is None and re.match(r"\s*#\s*[^#:*]", line)):
            d = vclean(re.sub(r"^\s*#\s*", "", line))
            if d: out.append({"pos": cur or "", "lab": "", "t": d})
    return out, syn, ant
ALT = re.compile(r"\{\{(?:vi-alternative spelling of|vi-alt sp|alt sp|alternative spelling of|alt form|alternative form of|vi-alt form|vi-alternative form of|alternative case form of|alt case|obsolete spelling of|obsolete form of|archaic spelling of|dated spelling of|misspelling of|vi-obsolete spelling of|standard spelling of|vi-alt case|altform|obs sp|vi-rdp of|only used in|reduplication of)\|(?:vi\|)?([^|}]+)")
def _place(m):
    args = [x for x in m.group(1).split("|") if x and "=" not in x]
    t = re.search(r"\bt1?=([^|}]+)", m.group(1))
    parts = [re.sub(r"^[a-z]{1,4}/", "", x).replace("<<", "").replace(">>", "") for x in args]
    return (t.group(1) + ": " if t else "") + "place: " + "; ".join(parts)
def pre(raw):
    # 고유명사 틀을 글로 (2026-10-01, 대표님 "위키는 그대로") — 전에는 틀째 지워져 Úc·Việt Nam·An Giang 같은 고유명사 뜻이 비었다
    raw = re.sub(r"\{\{tcl\|vi\|([^|}]*)[^}]*\}\}", r"\1", raw)
    raw = re.sub(r"\{\{w\|([^|}]*)\|([^|}]*)\}\}", r"\2", raw); raw = re.sub(r"\{\{w\|([^|}]*)\}\}", r"\1", raw)      # {{w|Northern Vietnam}}
    raw = re.sub(r"\{\{vi-home name\|?([^}|]*)[^}]*\}\}", lambda m: "a " + (m.group(1) + " " if m.group(1) else "") + "home name (nickname)", raw)
    raw = re.sub(r"\{\{place\|vi\|([^}]*)\}\}", _place, raw)
    raw = re.sub(r"\{\{surname\|vi[^}]*\}\}", "a surname", raw)
    raw = re.sub(r"\{\{given name\|vi\|?([^}|]*)[^}]*\}\}", lambda m: "a " + (m.group(1) + " " if m.group(1) else "") + "given name", raw)
    raw = re.sub(r"\{\{name translit\|vi\|[^|}]*\|([^|}]*)[^}]*\}\}", r"transliteration of \1", raw)
    return raw
def main():
    g = json.load(open(R / "data/_dict_gloss.json"))
    src, alt = {}, {}
    for k, v in g.items():
        raw = v.get("raw") or ""
        if not raw: continue
        m = [x.group(1).strip() for x in ALT.finditer(raw)]
        ss = parse(pre(raw))
        ss = [x for x in ss if x["t"] and not ALT.search(x["t"])]
        if not ss and m: alt[nfc(k)] = nfc(m[0]); continue        # 다른 표기만 적힌 표제어(khỏe → khoẻ, công ty → công ti) — 아래에서 그 뜻을 그대로 빌린다
        if not ss: continue
        syn, ant = rel_en(raw)
        src[nfc(k)] = {"lang": "en", "s": ss, "syn": syn, "ant": ant}
    na = 0
    for k, t in alt.items():
        if k in src: continue
        tgt = src.get(t) or src.get(alt.get(t, ""))
        if tgt: src[k] = {"lang": tgt["lang"], "s": tgt["s"], "syn": tgt["syn"], "ant": tgt["ant"], "alt": t}; na += 1
    print("다른 표기 표제어", len(alt), "· 뜻 빌림", na)
    nv = 0
    for f in ("viwikt_text.json", "viwikt_text4.json", "viwikt_text_more.json", "viwikt_text_more2.json"):
        if not pathlib.Path(SP + f).exists(): continue
        for k, txt in json.load(open(SP + f)).items():
            if not txt or nfc(k) in src: continue
            ss, syn, ant = parse_vi(txt)
            if ss: src[nfc(k)] = {"lang": "vi", "s": ss, "syn": syn, "ant": ant}; nv += 1
    json.dump(src, open(pathlib.Path(__file__).parent / "src.json", "w"), ensure_ascii=False)
    en = [v for v in src.values() if v["lang"] == "en"]; vi = [v for v in src.values() if v["lang"] == "vi"]
    print("표제어", len(src), "(영어 위키", len(en), "· 베트남어 위키", nv, ")")
    print("뜻 합계 영어", sum(len(v["s"]) for v in en), "· 베트남어", sum(len(v["s"]) for v in vi))
    print("뜻 둘 이상 표제어", sum(1 for v in src.values() if len(v["s"]) > 1), "· 그 뜻 합계", sum(len(v["s"]) for v in src.values() if len(v["s"]) > 1))
    print("유의어 있는 표제어", sum(1 for v in src.values() if v["syn"]), "· 반의어", sum(1 for v in src.values() if v["ant"]))
if __name__ == "__main__":
    main()
