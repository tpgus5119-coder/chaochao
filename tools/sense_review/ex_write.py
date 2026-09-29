#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""일상·직무·선배·22기 — 기본 뜻(자료에 적힌 뜻)으로 쓰이지 않은 예문을 새로 쓴 예문으로 바꾼다 (2026-09-29, 대표님 지시 §14-24).

판정표: tools/sense_review/예문_새로씀.tsv   열: 갈래 · 수업키 · 낱말 · 새 예문 · 번역 · 메모
  새 예문을 비우면 번역만 바꾼다(번역 오타·오역).
넣는 곳 — 그 갈래 그 수업의 그 낱말 하나만(다른 수업·다른 갈래의 같은 낱말은 판정표에 따로 적는다):
  일상 data/days.json · 직무 data/order.json · 선배/22기 data/gybm.json (+ 22기는 원본 data/cohort22.json 도 —
  build_gybm 이 원본에 적힌 예문을 먼저 쓰기 때문. 선배는 원본에 예문이 없어 gybm.json 옛 값이 유지된다)
새 문장 소리(북부 여·남)를 만들고 data/audio_index.json 에 올린다.
쓰기: python3 tools/sense_review/ex_write.py [--no-audio]"""
import asyncio
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from common import R, D, key  # noqa: E402
from ex_check import has_word  # noqa: E402

sys.path.insert(0, str(R / "tools"))
sys.path.insert(0, str(R / "tools/book_ex"))
import vi_kr  # noqa: E402
from apply_ex import make, k12, VOICES  # noqa: E402

GKEY = {"선배": "senior", "22기": "c22"}


def in_order(vi, ex):
    """떨어진 틀 낱말(không … nào cả) — 낱말 조각이 예문에 차례대로 다 있나. 차례가 뒤집힌 quàng khăn 은 못 지나간다"""
    s = re.sub(r"[^\w\s]", " ", key(ex)).split()
    i = 0
    for t in key(vi).split():
        while i < len(s) and s[i] != t:
            i += 1
        if i == len(s):
            return False
        i += 1
    return True


def rows():
    out = []
    for line in (D / "예문_새로씀.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        c = (line.split("\t") + [""] * 6)[:6]
        out.append(dict(zip(("part", "lk", "vi", "evi", "eko", "memo"), [x.strip() for x in c])))
    return out


def main():
    F = {n: R / f"data/{n}.json" for n in ("days", "order", "gybm", "cohort22")}
    J = {n: json.loads(p.read_text(encoding="utf-8")) for n, p in F.items()}
    days = {str(d["day"]): d for d in J["days"]["days"] if isinstance(d["day"], int) and not d.get("track")}
    job = {}
    for ti, t in enumerate(J["order"]["vols"][0]["tracks"]):
        for ci, c in enumerate(t["chapters"]):
            for li, l in enumerate(c["lessons"]):
                job[f"J0.{ti}.{ci}.{li}"] = l
    src = {s["key"]: s for s in J["gybm"]["sources"]}
    c22 = [w for d in J["cohort22"]["days"] for w in d["words"]]

    bad, texts, n = [], [], {"예문": 0, "번역만": 0, "22기 원본": 0}
    changed = set()
    for r in rows():
        where = r["part"] + " " + r["lk"] + " " + r["vi"]
        if r["evi"] and not has_word(r["vi"], r["evi"]) and not in_order(r["vi"], r["evi"]):
            bad.append(where + ": 새 예문에 낱말이 없다"); continue
        if not re.search(r"[가-힣]", r["eko"]):
            bad.append(where + ": 번역이 한글이 아니다"); continue
        if r["part"] == "일상":
            L, fn = (days.get(r["lk"]) or {}).get("words", []), "days"
        elif r["part"] == "직무":
            L, fn = (job.get(r["lk"]) or {}).get("words", []), "order"
        else:
            li = int(r["lk"].replace(f"B:{GKEY[r['part']]}", ""))
            L, fn = src[GKEY[r["part"]]]["lessons"][li]["words"], "gybm"
        ws = [w for w in L if key(w["vi"]) == key(r["vi"])]
        if len(ws) != 1:
            bad.append(f"{where}: 그 수업에서 낱말 {len(ws)}개"); continue
        w = ws[0]
        old = (w.get("ex") or {}).get("vi", "")
        vi = r["evi"] or old
        if r["part"] == "일상":
            ex = {"vi": vi, "ko": r["eko"], "kr": vi_kr.word(vi)}
        elif r["part"] == "직무":
            ex = {"vi": vi, "ko": r["eko"], "kr": vi_kr.word(vi), "krs": vi_kr.word(vi, True), "src": "claude"}
        else:
            ex = {"vi": vi, "ko": r["eko"]}
            if (w.get("ex") or {}).get("kr"):      # 22기 원본 126개는 예문 발음 칸이 있다 — 버리지 말고 새 문장 발음으로
                ex["kr"] = vi_kr.word(vi)
        if r["evi"] and fn == "gybm":
            w["ex_chk"] = "sense_fix"      # build_gybm 이 같은 출처 옛 값으로 살려 둔다
        w["ex"] = ex
        changed.add(fn)
        n["예문" if r["evi"] else "번역만"] += 1
        if r["evi"]:
            texts.append(vi)
        if r["part"] == "22기":
            # 22기 앱 수업 = 원본 회차 하나를 셋으로 나눈 것(수업 li ↔ 원본 days[li // 3]) — 그 회차 안에서만 찾는다.
            # 옛 예문 글로 찾으면 다른 회차의 같은 낱말까지 바뀐다(cao 5·33 이 같은 옛 예문이었다)
            hit = [x for x in J["cohort22"]["days"][li // 3]["words"] if key(x["vi"]) == key(r["vi"])]
            for x in hit:
                x["ex"] = dict(ex)
            n["22기 원본"] += len(hit)
            if hit:
                changed.add("cohort22")
            else:
                bad.append(where + ": 22기 원본 그 회차에서 낱말을 못 찾음")
    # 22기 원본과 앱 자료가 어긋나지 않았나 마지막으로 본다(옛 예문 글로 찾던 때 cao 5회차까지 바뀐 적이 있다) —
    # 바꾼 낱말마다 앱 자료(gybm)와 원본의 예문 묶음이 같은지 보고, 다르면 쓰지 않는다
    for k in {key(r["vi"]) for r in rows() if r["part"] == "22기"}:
        a = sorted(json.dumps(w.get("ex"), ensure_ascii=False, sort_keys=True) for l in src["c22"]["lessons"] for w in l["words"] if key(w["vi"]) == k)
        b = sorted(json.dumps(x.get("ex"), ensure_ascii=False, sort_keys=True) for x in c22 if key(x["vi"]) == k)
        if a != b:
            bad.append(f"22기 {k}: 앱 자료와 원본의 예문이 어긋남 — 같은 낱말의 다른 회차도 판정표에 적는다")
    if bad:
        print("\n".join(bad))
        raise SystemExit("판정표를 고친 뒤 다시 — 아무것도 쓰지 않았다")
    for fn in changed:     # 파일마다 원래 꼴 그대로(order.json 은 빈칸 없이 한 줄) — 꼴이 바뀌면 바뀐 줄이 파일 통째가 된다
        s = json.dumps(J[fn], ensure_ascii=False, separators=(",", ":")) if fn == "order" else json.dumps(J[fn], ensure_ascii=False, indent=1)
        F[fn].write_text(s, encoding="utf-8")
    print("넣음", n, "· 고친 파일", sorted(changed))
    if "--no-audio" in sys.argv:
        return
    idxp = R / "data/audio_index.json"
    idx = json.loads(idxp.read_text(encoding="utf-8"))
    need = [t for t in dict.fromkeys(texts) if idx.get(t) != k12(t) or not all((R / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES)]
    print("소리 만들 문장", len(need), flush=True)

    async def run():
        fail = []
        for t in need:
            for v in VOICES:
                if not await make(t, v):
                    fail.append((v, t))
        return fail
    fail = asyncio.run(run())
    for t in need:
        if all((R / f"audio/{v}/n/{k12(t)}.mp3").exists() for v in VOICES):
            idx[t] = k12(t)
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print("소리 실패", fail)


if __name__ == "__main__":
    main()
