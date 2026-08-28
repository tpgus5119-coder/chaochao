#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""그림 검수 — 판정은 세 갈래(통과/보류/버림후보)이고, **이 도구는 아무것도 지우지 않는다.**

왜 세 갈래인가 (사용자 원칙: "좋은 이미지는 삭제하지 마라"):
  통과     : 결함이 하나도 안 잡힌 그림. 손대지 않는다.
  보류     : 기계가 의심하지만 확신 못 하는 그림. **사람이 본 뒤에만** 처분한다.
  버림후보 : 기계적으로 확실한 결함(깨진 파일 등). 그래도 지우지 않고 목록만 낸다.

무엇을 잡나 — 각 단계에 근거를 적었다:
  ① 깨진 파일       : 열리지 않는 그림은 화면에서 빈 칸이 된다. (기계 판정, 확실)
  ② 글자 박힘(OCR)  : 확산 모델이 그림에 가짜 글자를 흔히 박는다. 우리 검수 원칙이
                       원래 'OCR·잉크비율'이었다(확산 모델 부정어 사고 이후 세운 것).
                       낱말 그림에 글자가 있으면 읽기 힌트가 되어 문항을 오염시킨다.
                       macOS Vision(ko·vi·en)으로 읽는다 — tools/ocr.swift.
  ③ 어둡거나 하얗게 빈 그림: 평균 밝기가 극단이면 생성 실패 판이다.
  ④ 시험 그림 무결성 : 그림 고르기 문항이 쓰는 낱말(PIC_OK)의 그림이 실제로 있는가.
                       없으면 그 문항이 조용히 안 나온다.
  ⑤ 고아 파일        : 어떤 데이터도 참조하지 않는 그림. **지우지 않는다** —
                       나중에 쓸 수 있고, 지우는 건 사람이 정한다. 목록만 낸다.
  ⑥ 용량            : 150KB 넘으면 느린 폰·비싼 데이터 요금에 부담(저용량 원칙).

쓰기:  python3 tools/img_audit.py            # 전체 검수, 보고서만
       python3 tools/img_audit.py --ocr      # OCR까지 (수 분 걸린다)
결과:  data/_img_audit.json (다음 검수 때 안 바뀐 파일은 건너뛴다)
"""
import hashlib, json, os, pathlib, re, subprocess, sys

R = pathlib.Path(__file__).resolve().parent.parent
IMG = R / "img"
OCRBIN = R / "tools" / "bin" / "ocr"
CACHE = R / "data" / "_img_audit.json"

def sha(p):
    return hashlib.sha1(p.read_bytes()).hexdigest()[:12]


def refs():
    """데이터 파일들이 참조하는 그림 이름 전부."""
    out = set()
    for f in (R / "data").glob("*.json"):
        t = f.read_text(encoding="utf-8", errors="ignore")
        out |= set(re.findall(r'"([A-Za-z0-9_\-]+\.(?:webp|svg|png|jpg))"', t))
    # 코드에 박힌 것 (app.js 의 아이콘 등)
    t = (R / "app.js").read_text(encoding="utf-8", errors="ignore")
    out |= set(re.findall(r"['\"]([A-Za-z0-9_\-]+\.(?:webp|svg|png|jpg))['\"]", t))
    return out


def ocr_text(p):
    r = subprocess.run([str(OCRBIN), str(p)], capture_output=True, text=True, timeout=90)
    if r.returncode != 0:
        return None                      # 실행 실패 — 합격으로 치지 않고 '모름'으로
    # 이 OCR(tools/ocr.swift)은 "=== 경로" 머리줄 뒤에 읽은 글을 **맨글로** 낸다.
    # 처음에 옛 바이너리의 탭 형식(신뢰도\t글)을 기대하고 파싱했다가 전부 버려서
    # 1,293장이 '글자 없음'으로 통과하는 헛검사가 됐다 — 글자를 박은 시험 그림으로
    # 검사기 자체를 검사해서 잡았다. 검사기는 반드시 '걸려야 할 표본'으로 먼저 검증한다.
    out = []
    for ln in r.stdout.splitlines():
        if ln.startswith("===") or not ln.strip():
            continue
        out.append(ln.strip())
    return " ".join(out)


def main():
    do_ocr = "--ocr" in sys.argv
    from PIL import Image, ImageStat

    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    used = refs()

    # 시험 그림 문항이 기대는 낱말들
    sys.path.insert(0, str(R / "tools"))
    import ko_exam_gen as g
    words, gloss, pics = g.load()
    need_pics = sorted(w for w in g.PIC_OK if w in pics)

    verdict = {"통과": [], "보류": [], "버림후보": []}
    notes = {}

    files = sorted(IMG.iterdir())
    for i, p in enumerate(files):
        if p.name.startswith("."):
            continue
        key = p.name
        h = sha(p)
        old = cache.get(key)
        if old and old.get("sha") == h and (old.get("ocr_done") or not do_ocr):
            verdict[old["verdict"]].append(key)
            if old.get("why"):
                notes[key] = old["why"]
            continue

        why = []
        hard = False           # 기계적으로 확실한 결함인가
        # ① 깨진 파일 + ③ 밝기
        bright = None
        if p.suffix != ".svg":
            try:
                im = Image.open(p)
                im.verify()
                im = Image.open(p).convert("L")
                st = ImageStat.Stat(im)
                bright = st.mean[0]
                # 문턱은 실측으로 정했다: 우리 그림체가 '흰 바탕 평면 그림'이라
                # 평균 밝기 250 넘는 정상 그림이 87장이나 된다(밥·우유·화살표 아이콘).
                # 처음에 밝기>250 으로 잡았더니 전부 오판이었다 — 눈으로 확인했다.
                # 정말 빈 판은 **구조가 없다**: 표준편차<3 (전체 1,281장 중 0장이 걸린다.
                # 즉 지금은 깨끗하고, 앞으로 생성 실패 판이 들어오면 여기서 걸린다).
                if st.stddev[0] < 3:
                    why.append(f"밋밋한 판(표준편차 {st.stddev[0]:.1f}) — 생성 실패 의심")
            except Exception as e:
                why.append(f"열리지 않음: {e}")
                hard = True
        # ⑥ 용량
        kb = p.stat().st_size / 1024
        if kb > 150:
            why.append(f"용량 {kb:.0f}KB (150KB 초과)")
        # ② OCR
        ocr_done = False
        if do_ocr and p.suffix != ".svg" and not hard and OCRBIN.exists():
            txt = ocr_text(p)
            ocr_done = txt is not None
            if txt:
                # 두 글자 이상 읽히면 의심 — 한 글자는 무늬를 오독하는 일이 잦다
                if len(re.sub(r"\s", "", txt)) >= 2:
                    why.append(f"글자 박힘 의심: “{txt[:40]}”")

        v = "버림후보" if hard else ("보류" if why else "통과")
        verdict[v].append(key)
        if why:
            notes[key] = why
        cache[key] = {"sha": h, "verdict": v, "why": why, "ocr_done": ocr_done,
                      "kb": round(kb, 1), "bright": round(bright, 1) if bright else None}
        if (i + 1) % 200 == 0:
            print(f"  {i + 1}/{len(files)}…", file=sys.stderr)

    # ④ 시험 그림 무결성
    missing = [w for w in need_pics if not (IMG / pics[w]).exists()]
    # ⑤ 고아
    all_names = {p.name for p in files if not p.name.startswith(".")}
    orphans = sorted(all_names - used)

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")

    print("═" * 66)
    print(f" 그림 검수 — {len(all_names)}장  (지운 것: 0장 — 이 도구는 지우지 않는다)")
    print("═" * 66)
    print(f" 통과 {len(verdict['통과'])} · 보류 {len(verdict['보류'])} · 버림후보 {len(verdict['버림후보'])}")
    for v in ("버림후보", "보류"):
        for k in verdict[v][:20]:
            print(f"   [{v}] {k} — {'; '.join(notes.get(k, []))}")
        if len(verdict[v]) > 20:
            print(f"   … 외 {len(verdict[v]) - 20}장 (data/_img_audit.json)")
    print(f"\n 시험 그림 문항 무결성: 낱말 {len(need_pics)}개 · 그림 빠짐 {len(missing)}개"
          + (f" — {missing}" if missing else ""))
    print(f" 참조 없는 그림(고아): {len(orphans)}장 — **지우지 않는다.** 목록만 남긴다.")
    for k in orphans[:10]:
        print(f"   (고아) {k}")
    if len(orphans) > 10:
        print(f"   … 외 {len(orphans) - 10}장")
    if not do_ocr:
        print("\n --ocr 을 붙이면 글자 박힘 검사까지 한다 (수 분).")


if __name__ == "__main__":
    main()
