#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""**이름 없는 목차** — 권 / 챕터 / 레슨 번호만. → data/order.json

차례를 정하는 규칙 (대표님, 2026-08-30)
  ① **기수 번호를 더한 값이 큰 낱말이 앞**이다.
     20+19+18+17=74 > 20+19+18=57 > 19+18+17=54 > 20+19=39 > 20=20
     겹친 기수가 많을수록 합이 커지므로 이 하나로 '겹침 수'까지 함께 반영된다.
     그리고 같은 겹침 수라면 **더 최근 기수**에 나온 쪽이 앞이다.
  ② 합이 같으면 **가장 최근 기수에서 몇 회차에 나왔는지**(이른 회차가 앞).
  ③ 그것도 같으면 그 회차 안에서 적힌 차례.  ④ 그래도 같으면 글자 차례.
  → 예외 없이 모든 낱말의 자리가 정해진다.

무엇을 넣나
  · 일상: **선배 낱말만.** 우리가 만든 일상 낱말은 뺀다.
  · 직무: 선배 직무 낱말을 위 규칙대로 먼저, **우리가 만든 직무 낱말은 그 뒤에.**
쓰기: python3 tools/order_build.py
"""
import json, pathlib, re, sys, unicodedata as U, collections

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr
sys.path.insert(0, str(R / "tools"))
from senior_split import JOB as JOBPAT

PER = 15
JOBRE = [(k, re.compile(v)) for k, v in JOBPAT.items()]
# 갈래는 **다섯**이면 된다. 공통이 대부분이고 업종 낱말은 원래 적다 —
# 공장에서 쓰는 말의 대부분은 어느 공장에서나 같기 때문이다(실측: 620개 중 483개가 공통).
JOBORDER = ["공통", "봉제", "전자", "기계·금속", "식품·화학"]


def field_of(ko):
    """직무 낱말을 갈래로 — 봉제 갈 사람은 전자를 안 배워도 된다(대표님 지시).
       업종에 안 걸리면 '공통'이다. 관리자·잔업·수량·버튼 같은 말이 그것이다."""
    for k, rx in JOBRE:
        if k.startswith("공통"): continue
        if rx.search(ko or ""): return k
    return "공통"                      # 한 레슨 열다섯 낱말

def key(v):
    """겹침을 견줄 때 쓰는 꼴 — 괄호 안은 곁들이 설명이라 뗀다."""
    s = U.normalize("NFC", str(v)).strip().lower()
    s = re.sub(r"\([^)]*\)", "", s)
    return re.sub(r"\s+", " ", s).strip(" .,;:!?~–—/\"'")


def exkey(v):
    """예문 표(_examples.json)의 열쇠 꼴 — gen_examples.py 와 **똑같아야** 한다.
       여기서 괄호를 떼면 'bến xe (buýt)' 를 못 찾아 낱말이 통째로 떨어진다."""
    s = U.normalize("NFC", str(v)).strip().lower()
    s = re.sub(r"^[\d]+[.\)]\s*", "", s)
    return re.sub(r"\s+", " ", s).strip(" .,;:!?~–—/\"'()")

def rank(w):
    """작을수록 앞. 위 ①②③④ 를 그대로 옮긴 것."""
    gis = re.findall(r"\d\d", w.get("gi", ""))
    tot = sum(int(g) for g in gis)
    rd = w.get("rd") or {}
    late = max(rd, key=lambda g: int(g)) if rd else None
    no, at = rd[late] if late else (9999, 9999)
    return (-tot, no, at, w["vi"].lower())

def main():
    sp = json.loads((R / "data" / "_senior_split.json").read_text(encoding="utf-8"))["words"]
    ex = json.loads((R / "data" / "_examples.json").read_text(encoding="utf-8"))
    # 앱이 이미 가진 것 — 그림·한자·성조, 그리고 앱 대화의 예문
    d = json.loads((R / "data" / "days.json").read_text(encoding="utf-8"))
    days = d if isinstance(d, list) else d["days"]
    extra, appjob, sents = {}, [], []
    for day in days:
        work = day.get("track") == "work"
        for w in (day.get("words") or []):
            k = key(w.get("vi", ""))
            if not k: continue
            extra[k] = {t: w[t] for t in ("img", "hanja", "tones", "kr_read", "south") if w.get(t)}
            if work: appjob.append({"vi": w["vi"], "ko": w.get("ko", ""), "app": 1})
        dl = day.get("dialog") or {}
        for l in (dl.get("lines") or []):
            if l.get("vi"): sents.append({"vi": l["vi"], "ko": l.get("ko", ""), "kr": l.get("kr_read", "")})
    holds = [" " + key(s["vi"]) + " " for s in sents]
    used = set()

    def dress(w, job_app=False):
        k = key(w["vi"])
        o = {"vi": w["vi"], "ko": w["ko"], "kr": vi_kr.word(w["vi"]), "krs": vi_kr.word(w["vi"], True)}
        gis = re.findall(r"\d\d", w.get("gi", ""))
        if gis: o["gi"] = "".join(gis); o["sr"] = 1
        if len(gis) >= 2: o["core"] = len(gis)
        if job_app: o["app"] = 1
        o.update(extra.get(k, {}))
        t = " " + k + " "
        hit = next((i for i, h in enumerate(holds) if t in h and i not in used), None)
        if hit is not None:
            used.add(hit); s = sents[hit]
            o["ex"] = {"vi": s["vi"], "ko": s["ko"], "kr": s["kr"] or vi_kr.word(s["vi"]),
                       "krs": vi_kr.word(s["vi"], True)}
        else:
            e = ex.get(exkey(w["vi"])) or ex.get(k)
            if e: o["ex"] = e
        return o if o.get("ex") else None          # 예문이 없는 것은 낱말이 아니다

    life = sorted([w for w in sp if w["field"] == "일상"], key=rank)
    job  = sorted([w for w in sp if w["field"] != "일상"], key=rank)
    L = [x for x in (dress(w) for w in life) if x]
    # 시험지가 아닌 모음집(교재 낱말표 등)에서 온 것은 **시험 낱말 뒤에** 붙인다.
    # 회차가 없어 차례를 매길 수 없기 때문이다 (2026-08-30, 파일 779개를 하나씩 열어 본 결과).
    xw = R / "data" / "_extra_words.json"
    if xw.exists():
        have = {key(x["vi"]) for x in L}
        for w in json.loads(xw.read_text(encoding="utf-8"))["words"]:
            if key(w["vi"]) in have: continue
            x = dress(w)
            if x: x["book"] = 1; L.append(x); have.add(key(w["vi"]))
    J = [x for x in (dress(w) for w in job) if x]
    seen = {key(x["vi"]) for x in J}
    # 직무 차례: 선배 시험 → 카톡방 정리 → 우리가 만든 것
    kk = R / "data" / "_kakao_job.json"
    if kk.exists():
        for w in json.loads(kk.read_text(encoding="utf-8"))["words"]:
            if key(w["vi"]) in seen: continue
            x = dress(w); 
            if x: x["kakao"] = 1; J.append(x); seen.add(key(w["vi"]))
    J += [x for x in (dress(w, True) for w in appjob if key(w["vi"]) not in seen) if x]

    def cut(ws, per_ch):
        """레슨 15낱말 → 챕터 per_ch 레슨."""
        les = [ws[i:i + PER] for i in range(0, len(ws), PER)]
        return [les[i:i + per_ch] for i in range(0, len(les), per_ch)]

    # 레슨 15낱말 · 챕터 10레슨(150낱말) · 권 6챕터(900낱말)
    LES_PER_CH, CH_PER_VOL = 10, 6
    vols = []
    chs = cut(L, LES_PER_CH)
    for i in range(0, len(chs), CH_PER_VOL):
        vols.append({"kind": "life",
                     "chapters": [{"lessons": [{"words": w} for w in ch]}
                                  for ch in chs[i:i + CH_PER_VOL]]})
    # 직무는 **갈래별로** 나눈다 — 갈래는 이름을 둔다(어디로 갈지가 사람마다 다르다)
    byf = collections.OrderedDict((k, []) for k in JOBORDER)
    for x in J: byf.setdefault(field_of(x["ko"]), []).append(x)
    tracks = []
    for k, ws in byf.items():
        if not ws: continue
        tracks.append({"track": k, "words": len(ws),
                       "chapters": [{"lessons": [{"words": w} for w in ch]}
                                    for ch in cut(ws, LES_PER_CH)]})
    vols.append({"kind": "job", "tracks": tracks})
    (R / "data" / "order.json").write_text(json.dumps(
        {"note": "이름 없는 목차. 권/챕터/레슨 번호만. 차례는 기수 합 → 최근 기수 회차 → 회차 안 자리.",
         "vols": vols}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"일상(선배만) {len(L)} · 직무 {len(J)}(그중 우리가 만든 것 {sum(1 for x in J if x.get('app'))})")
    for i, v in enumerate(vols, 1):
        if v["kind"] == "job":
            print(f"   {i}권 직무 — 갈래 {len(v['tracks'])}개")
            for t in v["tracks"]:
                ls = sum(len(c["lessons"]) for c in t["chapters"])
                print(f"        {t['track']:<16} {len(t['chapters'])}챕터 · {ls}레슨 · {t['words']}낱말")
            continue
        n = sum(len(l["words"]) for c in v["chapters"] for l in c["lessons"])
        ls = sum(len(c["lessons"]) for c in v["chapters"])
        print(f"   {i}권 일상  {len(v['chapters'])}챕터 · {ls}레슨 · {n}낱말")
main()
