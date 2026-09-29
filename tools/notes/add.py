#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""대표님 필기 낱말을 일상회화 주제에 넣는다 (2026-09-30). 판: tools/notes/필기_낱말.tsv (낱말 ⇥ 주제 ⇥ 뜻 ⇥ 예문 ⇥ 예문 뜻 ⇥ 그림 글감).
· 회화(일상+직무)에 이미 있으면 안 넣는다(같은 파트 안 중복 금지). 교재·선배·22기(gybm.json)에 있으면 뜻·예문·그림·발음을 그대로 가져온다.
· 주제의 일차(18낱말 미만)에 붙이고, 자리가 없으면 그 주제 뒤에 '<주제> · 보강' 일차를 새로 만든다. n(표시 차례)은 배열 차례로 다시 매긴다.
· 소리·그림이 없는 글은 scratchpad 에 목록으로 남긴다 → gen_audio_list.py · notes/img.py 가 만든다.
쓰기: python3 tools/notes/add.py [--dry]"""
import json, pathlib, re, sys, unicodedata as U, hashlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from vi_kr import word as krw            # noqa: E402
from build_boost import tones as tonesf  # noqa: E402
SP = pathlib.Path("/private/tmp/claude-501/-Users-leesehyeon-----/d0dc869d-c57f-4a4f-b3b4-4891244877a1/scratchpad")
nfc = lambda s: U.normalize("NFC", str(s or "")).strip()
CAP = 18   # 한 일차 12~18낱말 규칙 — 넘치면 그 주제 전체를 고르게 다시 나눈다(2026-09-30)
KR_FIX = {"bra-xin": "브라 씬", "mê-hi-cô": "메 히 꼬", "ai-len": "아이 렌", "cherry": "쎄 리", "xin-ga-po": "씬 가 뽀"}

def name_of(ko):
    return "w-" + hashlib.sha1(U.normalize("NFC", ko).encode()).hexdigest()[:10] + ".webp"

def kr_of(text):
    t = nfc(text)
    out = []
    for tok in t.split():
        k = tok.lower().strip(".,!?")
        out.append(KR_FIX[k] if k in KR_FIX else krw(tok))
    return re.sub(r"\s+", " ", " ".join(out)).strip()

def main():
    dry = "--dry" in sys.argv
    rows = []
    for ln in (R / "tools/notes/필기_낱말.tsv").read_text(encoding="utf-8").splitlines():
        if not ln.strip() or ln.startswith("#"): continue
        p = (ln.rstrip("\n") + "\t" * 6).split("\t")
        rows.append({"vi": nfc(p[0]), "theme": nfc(p[1]), "ko": nfc(p[2]), "exvi": nfc(p[3]), "exko": nfc(p[4]), "prompt": nfc(p[5])})
    D = json.loads((R / "data/days.json").read_text(encoding="utf-8")); days = D["days"]
    O = json.loads((R / "data/order.json").read_text(encoding="utf-8"))
    conv = set()
    def grab(o):
        if isinstance(o, dict):
            ws = o.get("words")
            if isinstance(ws, list):
                for w in ws:
                    if isinstance(w, dict) and isinstance(w.get("vi"), str): conv.add(nfc(w["vi"]).lower())
            for v in o.values(): grab(v)
        elif isinstance(o, list):
            for v in o: grab(v)
    grab(D); grab(O)
    G = json.loads((R / "data/gybm.json").read_text(encoding="utf-8"))
    gi = {}
    for s in sorted(G["sources"], key=lambda s: {"main": 0, "senior": 1, "c22": 2}.get(s["key"], 9)):
        for l in s["lessons"]:
            for w in l["words"]:
                gi.setdefault(nfc(w["vi"]).lower(), w)
    AIDX = json.loads((R / "data/audio_index.json").read_text(encoding="utf-8"))
    alow = {k.lower() for k in AIDX}
    imgdir = R / "img"
    theme_of = lambda t: re.sub(r"\s*\(\d+/\d+\)\s*$", "", re.sub(r"\s*·\s*보강.*$", "", nfc(t)))
    added, skipped, need_audio, need_img, newdays, noex = [], [], [], [], [], []
    for r in rows:
        k = r["vi"].lower()
        if k in conv: skipped.append((r["vi"], "회화에 이미 있음")); continue
        g = gi.get(k)
        ko = r["ko"] or (g and g.get("ko")) or ""
        if not ko: skipped.append((r["vi"], "뜻 없음")); continue
        e = {"vi": r["vi"], "ko": ko, "kr_read": (g and g.get("kr_read")) or kr_of(r["vi"]), "tones": tonesf(r["vi"])}
        if r["exvi"]: e["ex"] = {"vi": r["exvi"], "ko": r["exko"], "kr": kr_of(r["exvi"])}
        elif g and g.get("ex") and g["ex"].get("vi"):
            e["ex"] = {"vi": g["ex"]["vi"], "ko": g["ex"].get("ko", ""), "kr": g["ex"].get("kr") or kr_of(g["ex"]["vi"])}
        else: noex.append(r["vi"])
        if g and g.get("hanja"): e["hanja"] = g["hanja"]
        img = (g and g.get("img")) or ""
        if img and not (imgdir / img).exists(): img = ""
        if not img:
            img = name_of(ko.split("(")[0].split("/")[0].strip())
            if not (imgdir / img).exists():
                if r["prompt"]: need_img.append([img, r["prompt"] + ", Flat vector illustration, bold black outlines, flat pastel fill, one centered subject, plain white background"])
                else: need_img.append([img, ""])
        e["img"] = img
        e["src"] = "필기"
        for t in [e["vi"]] + ([e["ex"]["vi"]] if e.get("ex") else []):
            if t not in AIDX and t.lower() not in alow: need_audio.append(t)
        # 자리 찾기
        th = r["theme"]
        group = [i for i, d in enumerate(days) if theme_of(d.get("theme", "")) == th]
        if not group: skipped.append((r["vi"], "주제 없음: " + th)); continue
        slot = group[-1]                                   # 일단 주제의 마지막 일차 뒤에 붙인다 — 아래에서 고르게 다시 나눈다
        days[slot]["words"].append(e); conv.add(k)
        added.append((r["vi"], th))
    # 주제마다 낱말 수가 18을 넘는 일차가 있으면 그 주제 전체를 ceil(total/18) 일차로 고르게 다시 나눈다(차례는 그대로)
    import math
    themes = list(dict.fromkeys(theme_of(d.get("theme", "")) for d in days))
    for th in themes:
        group = [i for i, d in enumerate(days) if theme_of(d.get("theme", "")) == th]
        if not any(len(days[i]["words"]) > CAP for i in group): continue
        words = [w for i in group for w in days[i]["words"]]
        N = math.ceil(len(words) / CAP); base, extra = divmod(len(words), N)
        parts = []; pos = 0
        for j in range(N):
            n = base + (1 if j < extra else 0); parts.append(words[pos:pos + n]); pos += n
        objs = [days[i] for i in group]
        while len(objs) < N:
            nd = {"day": max(d["day"] for d in days) + 1, "theme": th, "words": []}
            days.insert(group[-1] + 1 + (len(objs) - len(group)), nd); objs.append(nd); newdays.append(nd["day"])
        for j, o in enumerate(objs):
            o["words"] = parts[j]; o["theme"] = th if N == 1 else f"{th} ({j + 1}/{N})"
    for i, d in enumerate(days): d["n"] = i + 1
    print(f"넣음 {len(added)} · 건너뜀 {len(skipped)} · 새 일차 {len(newdays)} {newdays}")
    print(f"소리 만들 글 {len(need_audio)} · 그림 만들 것 {len(need_img)}(글감 없음 {sum(1 for x in need_img if not x[1])}) · 예문 없음 {noex}")
    for s in skipped: print("  건너뜀:", s)
    if dry:
        for a in added: print("  ", a)
        return
    (R / "data/days.json").write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding="utf-8")
    (SP / "notes_audio.json").write_text(json.dumps(list(dict.fromkeys(need_audio)), ensure_ascii=False), encoding="utf-8")
    (SP / "notes_img.json").write_text(json.dumps(need_img, ensure_ascii=False, indent=0), encoding="utf-8")
    (SP / "notes_added.json").write_text(json.dumps(added, ensure_ascii=False, indent=0), encoding="utf-8")
    print("days.json 씀")

if __name__ == "__main__":
    main()
