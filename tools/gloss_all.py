#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""위키낱말사전 원문(raw)에서 **모든 어원·모든 품사**의 뜻을 다시 뽑는다 (2026-09-29 밤).
전에 fetch_dict_gloss.py 는 첫 어원의 뜻만, 그것도 여섯 개까지만 담아 tập(習 동사 '운동하다')·bầu(투표하다) 같은 뜻이 빠졌다.
쓰기: python3 tools/gloss_all.py            → data/_dict_gloss.json 의 defs 를 전부 다시 씀(raw 는 그대로, 전 파일은 원본자료/에 복사)
      from gloss_all import parse            → parse(raw) = [{"pos","lab","t"}] (lab = 지역·문체 표시)"""
import json, pathlib, re, shutil, sys, datetime
R = pathlib.Path(__file__).resolve().parent.parent
POS = ("Noun", "Verb", "Adjective", "Adverb", "Pronoun", "Particle", "Interjection", "Preposition", "Conjunction", "Numeral", "Classifier", "Proper noun", "Phrase", "Idiom", "Prefix", "Suffix", "Determiner", "Proverb", "Prepositional phrase", "Contraction", "Letter", "Symbol", "Number", "Postposition", "Affix", "Circumfix", "Infix", "Article")
SKIP_H = ("Romanization", "Pronunciation", "References", "Derived terms", "See also", "Related terms", "Synonyms", "Antonyms", "Usage notes", "Anagrams", "Further reading", "Descendants", "Alternative forms", "Compounds", "Quotations", "Hypernyms", "Hyponyms", "Coordinate terms", "Translations", "Etymology")
# 뜻이 아닌 줄(한자음 읽기·놈자 꼴·이름·지명)
NOT_DEF = re.compile(r"\{\{(sino-vietnamese reading of|han tu form of|vi-Nom form of|vi-hantu form|han tu\b|rfdef|surname|given name|place\b|name translit)")
LB = re.compile(r"\{\{(?:lb|label|lbl)\|vi\|([^}]*)\}\}")
# 옛말·속어·전문 분야 등 앱 뜻 목록에 안 올리는 표시
EXC = ("obsolete", "archaic", "dated", "rare", "slang", "vulgar", "derogatory", "offensive", "humorous", "euphemistic", "internet", "text messaging", "neologism", "eye dialect", "misspelling", "nonstandard", "proscribed", "poetic", "chinese mythology", "buddhism", "christianity", "roman catholicism", "biblical", "card games", "billiards", "numismatics", "criminal", "in translations", "only used in", "only in compounds", "in compounds", "nickname", "louisiana", "now only in", "in certain regions", "north central vietnam", "nghệ an", "hai phong", "thanh hoa", "quảng nam", "hải phòng", "thanh hóa")

def clean(t):
    t = re.sub(r"\{\{(?:l|m|w|taxlink|taxfmt)\|[^|}]*\|([^|}]*)(?:\|[^}]*)?\}\}", r"\1", t)
    t = re.sub(r"\{\{(?:gloss|gl)\|([^}]*)\}\}", r"(\1)", t)
    t = re.sub(r"\{\{(?:n-g|non-gloss|non-gloss definition|ngd)\|([^}]*)\}\}", r"\1", t)
    t = re.sub(r"\{\{(?:syn of|synonym of)\|vi\|([^|}]*)(?:\|\|([^}|]*))?[^}]*\}\}", lambda m: "= " + m.group(1) + (" (" + m.group(2) + ")" if m.group(2) else ""), t)
    t = re.sub(r"\{\{(?:alt form|alternative form of|alt sp|alternative spelling of|vi-alternative spelling of|short for|clipping of|abbreviation of|initialism of|contraction of|ellipsis of|aphetic form of)\|vi\|([^|}]*)(?:\|\|([^}|]*))?[^}]*\}\}", lambda m: "= " + m.group(1) + (" (" + m.group(2) + ")" if m.group(2) else ""), t)
    t = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", r"\2", t)
    t = re.sub(r"\{\{[^}]*\}\}", "", t)
    t = re.sub(r"''+", "", t)
    return re.sub(r"\s+", " ", t).strip(" ;:.,")

def parse(raw):
    out, pos = [], None
    for l in raw.splitlines():
        m = re.match(r"^=+\s*([A-Za-z ]+?)\s*=+$", l)
        if m:
            h = m.group(1).strip()
            pos = h if h in POS else None
            continue
        if not l.startswith("# ") or pos is None or NOT_DEF.search(l):
            continue
        labs = LB.findall(l)
        lab = " · ".join(x.replace("|", ", ").replace("_, ", "").replace(", _", "") for x in labs)
        t = clean(LB.sub("", l[2:]))
        if t:
            out.append({"pos": pos, "lab": lab, "t": t})
    return out

def is_exc(lab):
    L = lab.lower()
    return any(e in L for e in EXC)

def as_defs(ps):
    return [("(" + p["lab"] + ") " if p["lab"] else "") + p["t"] for p in ps]

def main():
    p = R / "data/_dict_gloss.json"
    bak = R.parent / "원본자료" / ("_dict_gloss_" + datetime.date.today().isoformat() + "_전.json")
    bak.parent.mkdir(parents=True, exist_ok=True)
    if not bak.exists():
        shutil.copy(p, bak)
    G = json.loads(p.read_text(encoding="utf-8"))
    n = more = 0
    for k, v in G.items():
        if not v.get("raw"):
            continue
        ps = parse(v["raw"])
        d = as_defs(ps)
        if len(d) > len(v.get("defs") or []):
            more += 1
        v["defs"] = d
        v["pos"] = list(dict.fromkeys(x["pos"] for x in ps))
        n += 1
    p.write_text(json.dumps(G, ensure_ascii=False), encoding="utf-8")
    print(f"뜻 다시 뽑음 {n} · 전보다 뜻이 늘어난 낱말 {more} · 전 파일 → {bak}")

if __name__ == "__main__":
    main()
