#!/usr/bin/env python3
"""날마다 배우기 — 문법 78개를 78일로 채운다 (사용자 지시: 완성).

나눠 맡는 자리
  · 낱말(10개) : 국립국어원 학습용 어휘 목록(data/_ko_words.json, 등급 A/B/C)에서 고른다.
                 뜻도 그 파일 것을 쓴다 — 지어내지 않는다.
  · 주제·대화·미션 : ko_days_more.py 에 사람이 직접 쓴다. 기계가 쓴 문장은 한 줄도 없다.

낱말 고르는 규칙
  1) 그 날 문법의 제목·예문에 실제로 나오는 낱말을 먼저 넣는다(문법과 낱말이 따로 놀면 안 된다).
  2) ko_days_more.py 가 콕 집어 준 낱말(seed)을 넣는다.
  3) 모자란 자리는 그 단계에 맞는 등급에서 순위(자주 쓰는 순)대로 채운다.
  4) 앞선 날에 이미 나온 낱말은 안 쓴다. 한 글자짜리도 안 쓴다
     — 한 글자 한자어는 동음이의어가 많아 뜻이 어긋나기 쉽다(kr-vi 사전에서 크게 데었다).
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRADE_OF = {"초급1": ["A"], "초급2": ["A", "B"], "중급1": ["B"], "중급2": ["B", "C"]}
PER_DAY = 10

# 뜻이 어긋나기 쉬워 자동으로는 안 쓰는 말 (숫자·단위·한 글자 한자어)
RISKY = set("""일 이 삼 사 오 육 칠 팔 구 십 개 명 장 권 대 병 잔 벌 켤레 마리 번 살 원 년 월
분 초 시 주 말 밤 낮 곳 것 수 등 및 저 그 이 안 밖 위 아래 앞 뒤 옆 中 등등""".split())


def load():
    words = json.load(open(f"{ROOT}/data/_ko_words.json", encoding="utf-8"))
    gram = json.load(open(f"{ROOT}/data/ko_grammar.json", encoding="utf-8"))["items"]
    days = json.load(open(f"{ROOT}/data/ko_days.json", encoding="utf-8"))
    return words, {g["pattern"]: g for g in gram}, days


def usable(w):
    return (w.get("vi") and len(w["ko"]) > 1 and w["ko"] not in RISKY
            and re.fullmatch(r"[가-힣]+", w["ko"]))


def from_text(gram_item, by_ko):
    """문법 제목·예문에 실제로 쓰인 낱말 — 어절에서 조사·어미를 벗겨 찾는다."""
    txt = gram_item["title_ko"] + " " + " ".join(e["ko"] for e in gram_item.get("examples", []))
    out = []
    for tok in re.findall(r"[가-힣]+", txt):
        for cut in range(len(tok), 1, -1):          # 긴 쪽부터 사전에 있는지 본다
            head = tok[:cut]
            for cand in (head, head + "다", head + "하다"):
                w = by_ko.get(cand)
                if w and usable(w) and w not in out:
                    out.append(w); break
            else:
                continue
            break
    return out


def build():
    from ko_days_more import MORE
    from ko_days_more2 import MORE2
    MORE = MORE + MORE2
    words, gram, days = load()
    by_ko = {w["ko"]: w for w in words}
    used = {w["ko"] for d in days["days"] for w in d["words"]}
    have = {d["grammar"] for d in days["days"]}
    # 자주 쓰는 순으로 채운다 — 파일 순서를 믿지 말고 rank 로 다시 세운다.
    # (안 그러면 '의식주·팥빙수' 같은 드문 말이 초급 첫날에 들어간다)
    pools = {lv: sorted([w for w in words if w["grade"] in gs and usable(w)],
                        key=lambda w: w.get("rank", 99999))
             for lv, gs in GRADE_OF.items()}

    made, miss = [], []
    for m in MORE:
        g = gram.get(m["g"])
        if not g:
            miss.append(m["g"]); continue
        if m["g"] in have:
            continue
        picked = []

        def add(w):
            if w and w["ko"] not in used and w not in picked and len(picked) < PER_DAY:
                picked.append(w); used.add(w["ko"])

        for ko in m.get("seed", []):                 # ① 사람이 콕 집은 낱말
            w = by_ko.get(ko)
            if not w:
                miss.append(f"{m['g']}: 낱말 '{ko}' 가 어휘 목록에 없음")
            add(w)
        for w in from_text(g, by_ko):                # ② 문법 예문에 나오는 낱말
            add(w)
        for w in pools[g["level"]]:                  # ③ 나머지는 자주 쓰는 순으로
            add(w)
        if len(picked) < PER_DAY:
            miss.append(f"{m['g']}: 낱말 {len(picked)}개밖에 못 채움")

        made.append({
            "day": None,
            "grammar": m["g"],
            "theme": {"ko": m["t"][0], "vi": m["t"][1]},
            "words": [{"ko": w["ko"], "vi": w["vi"]} for w in picked],
            "dialog": {"title": m["dt"],
                       "lines": [{"who": w, "ko": k, "vi": v} for w, k, v in m["d"]]},
            "mission": {"ko": m["m"][0], "vi": m["m"][1]},
        })

    # 처음 18일 가운데 낱말이 모자란 날도 여기서 채운다 (사용자 지시: 1강 10개 고정)
    for d in days["days"]:
        if len(d["words"]) >= PER_DAY:
            continue
        g = gram.get(d["grammar"])
        lv = g["level"] if g else "초급1"
        for w in (from_text(g, by_ko) if g else []) + pools[lv]:
            if len(d["words"]) >= PER_DAY:
                break
            if w["ko"] in used:
                continue
            d["words"].append({"ko": w["ko"], "vi": w["vi"]}); used.add(w["ko"])

    # 같은 낱말이 두 날에 겹치면 뒤엣것을 지우고 그 자리를 새로 채운다.
    # (뜻이 다른 동음이의어는 그대로 둔다 — '팔(8)'과 '팔(cánh tay)'은 다른 말이다)
    seen = {}
    for d in days["days"] + made:
        g = gram.get(d["grammar"]); lv = g["level"] if g else "초급1"
        keep = []
        for w in d["words"]:
            if seen.get(w["ko"]) == w["vi"]:
                continue
            seen[w["ko"]] = w["vi"]; keep.append(w)
        for w in pools[lv]:
            if len(keep) >= PER_DAY: break
            if w["ko"] in seen: continue
            seen[w["ko"]] = w["vi"]; keep.append({"ko": w["ko"], "vi": w["vi"]})
        d["words"] = keep

    # 문법책 차례대로 이어 붙이고 날짜를 다시 매긴다
    order = {g["pattern"]: (["초급1", "초급2", "중급1", "중급2"].index(g["level"]), g["n"])
             for g in gram.values()}
    allday = days["days"] + made
    allday.sort(key=lambda d: order.get(d["grammar"], (9, 999)))
    for i, d in enumerate(allday, 1):
        d["day"] = i
    days["days"] = allday
    days["note"] = (days.get("note", "") + " · 문법 78개를 78일로 채움 "
                    "(낱말=국립국어원 어휘 목록, 주제·대화·미션=직접 씀)").strip(" ·")

    json.dump(days, open(f"{ROOT}/data/ko_days.json", "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print(f"날 {len(allday)}개 · 새로 만든 날 {len(made)}개")
    bad = [(d["day"], len(d["words"])) for d in allday if len(d["words"]) != PER_DAY]
    print(f"낱말 10개 아닌 날: {bad if bad else '없음'}")
    if miss:
        print("확인할 것:")
        for x in miss[:20]:
            print("  -", x)


if __name__ == "__main__":
    build()
