#!/usr/bin/env python3
"""사전 한 벌 → data/_dict_full.json · data/_dict_en.json (2026-10-01)
표제어 = tools/dict_full/src.json(영어판·베트남어판 위키, 원문 차례 그대로) + tools/dict_keep.tsv(앱 굳은 말, 대표님 결정 대기 — --nokeep 이면 뺀다)
뜻(한국어) = 여러 뜻·새 표제어는 fs_NN.ko.tsv(뜻마다 한 줄), 한 뜻 표제어는 기존 참고 사전(data/_dict_ko.json) 줄
품사 = 위키 품사 → [명][동][형]… · 유의어·반의어 = 위키 Synonyms/Antonyms · 영어 = 영어판 뜻풀이(검색 열쇠만, 화면에 안 보임)
결과: {소문자 표제어: {"h": 표제어, "p": [품사 표시…], "s": [한국어 뜻…], "y": [유의어], "a": [반의어], "v": "다른 표기면 원래 꼴"}}"""
import json, glob, re, sys, pathlib, unicodedata as U
R = pathlib.Path(__file__).resolve().parent.parent.parent; D = R / "tools/dict_full"
key = lambda s: U.normalize("NFC", s).strip().lower()
TAG = {"Noun": "명", "Verb": "동", "Adjective": "형", "Adverb": "부", "Pronoun": "대", "Particle": "조", "Interjection": "감", "Preposition": "전", "Conjunction": "접",
       "Numeral": "수", "Classifier": "분류", "Proper noun": "고유", "Phrase": "구", "Idiom": "관용", "Proverb": "속담", "Prefix": "접두", "Suffix": "접미",
       "Determiner": "관형", "Affix": "접사", "Combining form": "어근", "Letter": "글자", "Symbol": "기호", "Contraction": "줄임", "Romanization": "", "": ""}
def main():
    src = json.load(open(D / "src.json")); dk = {key(k): v for k, v in json.load(open(R / "data/_dict_ko.json")).items()}
    ko = {}
    for f in sorted(glob.glob(str(D / "fs_*.json"))):
        items = {it["n"]: it for it in json.load(open(f))}
        t = f[:-5] + ".ko.tsv"
        if not pathlib.Path(t).exists(): print("없음", t); continue
        for l in open(t, encoding="utf-8"):
            p = l.rstrip("\n").split("\t")
            if len(p) < 3: continue
            it = items[int(p[0])]; ko.setdefault(it["vi"], {})[int(p[1])] = p[2].strip()
    fix = {}                                               # 한 뜻 표제어 검수(fv_NN.ko.tsv: n<탭>새 뜻) — 옛 참고 사전 줄이 위키 뜻과 다른 것
    for f in sorted(glob.glob(str(D / "fv_*.json"))):
        items = {it[0]: it[1] for it in json.load(open(f))}
        t = f[:-5] + ".ko.tsv"
        if not pathlib.Path(t).exists(): continue
        for l in open(t, encoding="utf-8"):
            p = l.rstrip("\n").split("\t")
            if len(p) >= 2 and p[0].strip().isdigit() and int(p[0]) in items: fix[items[int(p[0])]] = p[1].strip()
    hun = json.load(open(R / "data/_hanja_hun.json")); g = json.load(open(R / "data/_dict_gloss.json"))
    for c, hu in {"二": ["두", "이"], "三": ["석", "삼"], "四": ["넉", "사"], "五": ["다섯", "오"], "六": ["여섯", "육"], "七": ["일곱", "칠"], "八": ["여덟", "팔"],
                  "九": ["아홉", "구"], "十": ["열", "십"], "百": ["일백", "백"], "千": ["일천", "천"], "萬": ["일만", "만"]}.items():
        hun.setdefault(c, [hu])                            # 수 한자의 훈·음(표준) — 위키 훈음 표에 빠진 것
    NUM = {"영": "0", "공": "0", "하나": "1", "한": "1", "일": "1", "둘": "2", "두": "2", "이": "2", "셋": "3", "세": "3", "삼": "3", "넷": "4", "네": "4", "사": "4", "다섯": "5", "오": "5",
           "여섯": "6", "육": "6", "일곱": "7", "칠": "7", "여덟": "8", "팔": "8", "아홉": "9", "구": "9", "열": "10", "십": "10", "스물": "20", "서른": "30", "마흔": "40", "쉰": "50",
           "예순": "60", "일흔": "70", "여든": "80", "아흔": "90", "백": "100", "천": "1000", "만": "10000", "십만": "100000", "백만": "1000000", "천만": "10000000", "억": "100000000", "십억": "1000000000"}
    out, en, miss = {}, {}, 0
    for k, v in src.items():
        if not re.search(r"[A-Za-zÀ-ỹđĐ]", k): continue      # 한자 표제어(布政使·日本 — 한자 꼴)는 베트남 글자 사전에서 뺀다
        ss = v["s"]
        if k in ko: kos = [ko[k].get(i + 1, "-") for i in range(len(ss))]
        elif v.get("alt") and v["alt"] in ko: kos = [ko[v["alt"]].get(i + 1, "-") for i in range(len(ss))]
        elif len(ss) == 1 and k in fix: kos = [fix[k]]
        elif len(ss) == 1 and key(k) in dk: kos = [dk[key(k)]]
        elif v.get("alt") and key(v["alt"]) in dk and len(ss) == 1: kos = [dk[key(v["alt"])]]
        else: kos = ["-"] * len(ss); miss += 1
        keep, seen_s = [], set()
        for s_, m in zip(ss, kos):
            if s_["pos"] == "Numeral" and m in NUM: m = NUM[m]          # 숫자 뜻은 숫자로 (대표님 2026-09-30 "통일감": 여덟 → 8)
            t = (TAG.get(s_["pos"], s_["pos"]), m)
            if m and m != "-" and m not in {x[1] for x in keep}: keep.append(t)      # 같은 뜻이 두 번(úc '뇌 · 뇌', thứ hai [명]·[고유] '월요일')이면 하나로
        # 한자음 — 위키의 'Sino-Vietnamese reading of 三' 줄(뜻 줄이 아니라 따로 둔 것)을 [한자] 로 (tam → 三 석 삼: 합성어 tam giác 삼각형의 tam)
        hv = re.findall(r"\{\{sino-vietnamese reading of\|([^}|]+)", (g.get(k) or {}).get("raw") or "") if v["lang"] == "en" else []
        if hv:
            hs = " · ".join(c + ("(" + " ".join(hun[c][0]) + ")" if c in hun and hun[c] else "") for c in dict.fromkeys(hv))
            keep.append(("한자", hs))
        if not keep: continue
        e = {"h": k, "p": [a for a, _ in keep], "s": [b for _, b in keep]}
        if v["syn"]: e["y"] = v["syn"][:12]
        if v["ant"]: e["a"] = v["ant"][:8]
        if v.get("alt"): e["v"] = v["alt"]
        kk = key(k)
        if kk in out:                                      # 대소문자만 다른 표제어(úc 뇌 / Úc 호주)는 한 줄에 — 소문자 뜻 먼저, 고유명사 뜻을 뒤에
            o = out[kk]; lo, hi = (o, e) if o["h"] == o["h"].lower() else (e, o)
            pairs = list(zip(lo["p"], lo["s"])) + [x for x in zip(hi["p"], hi["s"]) if x[1] not in set(lo["s"])]   # 소문자 쪽에 이미 있는 뜻은 다시 안 붙인다
            m = {"h": lo["h"], "p": [a for a, _ in pairs], "s": [b for _, b in pairs]}
            for f in ("y", "a", "v"):
                if lo.get(f) or hi.get(f): m[f] = (lo.get(f) or []) + [x for x in (hi.get(f) or []) if x not in (lo.get(f) or [])] if f != "v" else (lo.get(f) or hi.get(f))
            out[kk] = m
        else: out[kk] = e
        if v["lang"] == "en": en[kk] = [s["t"][:80] for s in ss][:6]
    if "--nokeep" not in sys.argv:
        for l in open(R / "tools/dict_keep.tsv", encoding="utf-8"):
            w = l.strip()
            if not w or w.startswith("#") or key(w) in out: continue
            if key(w) in dk: out[key(w)] = {"h": w, "p": [""], "s": [dk[key(w)]], "k": 1}     # k = 위키 밖 굳은 말
    json.dump(out, open(R / "data/_dict_full.json", "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(en, open(R / "data/_dict_en.json", "w"), ensure_ascii=False, separators=(",", ":"))
    ns = sum(len(e["s"]) for e in out.values())
    print("표제어", len(out), "· 뜻", ns, "· 한국어 없는 표제어(뺌)", miss, "· 영어 열쇠", len(en), "· 크기", (R / "data/_dict_full.json").stat().st_size // 1024, "KB")
if __name__ == "__main__":
    main()
    # [보충] 뜻은 merge 뒤에 다시 얹는다 (tools/dict_sup/apply.py, 2026-10-01) — 빼먹으면 보충 뜻이 사라진다
    import runpy; runpy.run_path(str(pathlib.Path(__file__).resolve().parent.parent / "dict_sup/apply.py"), run_name="__main__")
