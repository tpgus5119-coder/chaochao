# -*- coding: utf-8 -*-
"""뜻 검토(tools/sense_review) 공용 — 갈래별 수업 목록과 판정표 읽기.

수업 키는 앱과 같다: 일상 = 날 번호(정수를 글자로), 직무 = 'J0.갈래.장.과', 교재·선배·22기 = 'B:main3' 꼴(gybmKey).
"""
import json
import pathlib

R = pathlib.Path(__file__).resolve().parent.parent.parent
D = R / "tools/sense_review"
PARTS = ["일상", "직무", "교재", "선배", "22기"]
GKEY = {"교재": "main", "선배": "senior", "22기": "c22"}


def lessons(part):
    """[(수업 키, 수업 이름, [낱말 dict …]), …] — 앱의 단어 탭 차례 그대로"""
    if part == "일상":
        days = json.loads((R / "data/days.json").read_text(encoding="utf-8"))["days"]
        days = sorted([d for d in days if isinstance(d["day"], int) and not d.get("track")], key=lambda d: d.get("n", 0))
        return [(str(d["day"]), f"{i + 1}. {d['theme']}", d.get("words", [])) for i, d in enumerate(days)]
    if part == "직무":
        v = json.loads((R / "data/order.json").read_text(encoding="utf-8"))["vols"][0]
        out = []
        for ti, t in enumerate(v["tracks"]):
            for ci, c in enumerate(t["chapters"]):
                for li, l in enumerate(c["lessons"]):
                    out.append((f"J0.{ti}.{ci}.{li}", f"{t['track']} · {l.get('t') or li + 1}", l["words"]))
        return out
    g = json.loads((R / "data/gybm.json").read_text(encoding="utf-8"))
    src = next(s for s in g["sources"] if s["key"] == GKEY[part])
    return [(f"B:{src['key']}{li}", l.get("title") or str(li + 1), l["words"]) for li, l in enumerate(src["lessons"])]


def read_tsv(name):
    p = D / name
    rows = []
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            rows.append(line.split("\t"))
    return rows


def key(vi):
    return " ".join(str(vi).strip().lower().split())
