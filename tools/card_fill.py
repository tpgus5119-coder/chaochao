#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""**고른 기사의 재료를 만든다** — 낱말 열·대화 두 줄·여섯 줄 풀이

대표님 지적 (2026-09-02): "기사를 먼저 선정하고, 그 기사에서 학습 세트를 뽑아야지."

## 왜 따로 만드나
`news_lesson.py` 는 **새로 받은 기사**만 처리한다 (이미 저장된 것은 건너뛴다).
`news_sum5.py` 는 **마지막에 받은 기사**의 본문만 본다.
그래서 '저장은 됐는데 재료가 없는' 기사는 어느 쪽도 손대지 못했다.
이 도구는 **pub 이 찍힌 기사**를 보고, 본문을 다시 받아서라도 재료를 채운다.

쓰기: python3 tools/card_fill.py
"""
import json, pathlib, re, subprocess, sys

R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "tools"))
import vi_kr
from qwen import ask, up

F = R / "data" / "news_days.json"
BODY = R / "data" / "_bodies.json"        # 주소 → 본문. 한 번 받으면 남는다

LESSON = ("아래 기사를 읽고 베트남어 학습 재료를 만들어라.\n"
          " ① words: 기사와 관련된 베트남어 낱말 **정확히 6개**. 초급이 쓸 만한 것\n"
          "    각각 vi(베트남어)·ko(한국어 뜻 12자 이내)\n"
          " ② lines: 그 기사 내용을 주고받는 **대화 두 줄**. who 는 A·B\n"
          "    각각 vi·ko. 위 낱말을 되도록 쓴다\n"
          " ③ theme: 이 기사를 두 낱말로 (예: 교통 안전)\n"
          "규칙: 성조 부호를 빠뜨리지 마라. 한국어 뜻은 한글만.\n"
          '출력은 JSON 하나만: {"theme":"","words":[{"vi":"","ko":""}],'
          '"lines":[{"who":"A","vi":"","ko":""}]}\n\n')

SUM5 = ("아래 기사를 읽고 **여섯 줄**로 풀어 알려 줘라.\n"
        " ① 존댓말이되 **'~요'** 로 끝낸다. '~습니다'·'~한다' 금지\n"
        " ② **한 줄은 28자를 넘기지 마라.** 카드에서 두 줄로 접히면 답답해진다\n"
        " ③ 한 줄에 한 가지만 담는다. '~하고 ~하며' 로 길게 잇지 마라\n"
        " ④ 첫 줄은 무슨 일이 있었는지, 마지막 줄은 우리에게 무슨 뜻인지\n"
        '출력은 JSON 하나만: {"sum5":["","","","","",""]}\n\n')


def body_of(url, cache):
    if url in cache and len(cache[url]) > 200:
        return cache[url]
    try:
        h = subprocess.run(["curl", "-sSL", "-m", "25", "-A", "Mozilla/5.0", url],
                           capture_output=True, text=True, timeout=40).stdout
    except Exception:
        return ""
    m = re.search(r'id="article-view-content-div"[^>]*>(.*?)</div>\s*</div>', h, re.S)
    t = m.group(1) if m else " ".join(re.findall(r'<p class="Normal"[^>]*>(.*?)</p>', h, re.S))
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", t, flags=re.S)
    import html as _h
    t = _h.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))).strip()
    if len(t) > 200:
        cache[url] = t[:6000]
    return t


def jget(txt):
    m = re.search(r"\{.*\}", txt or "", re.S)
    try:
        return json.loads(m.group(0)) if m else None
    except Exception:
        return None


def lines_of(txt):
    """여섯 줄 풀이를 뽑는다. **JSON 이 아니어도 받는다** —
    Qwen 이 제대로 여섯 줄을 써 놓고 줄글로 줘서 통째로 버려졌다 (2026-09-02 실측)."""
    g = jget(txt)
    got = (g or {}).get("sum5") if isinstance(g, dict) else None
    if isinstance(got, list) and len(got) >= 4:
        return [str(x).strip() for x in got if str(x).strip()][:6]
    # 줄글이면 줄로 나눈다. 번호·따옴표·머리표를 떼어 낸다
    out = []
    for ln in (txt or "").split("\n"):
        # 머리표만 뗀다 — '1.' '2)' '- ' 처럼 **점이나 괄호가 붙은** 숫자만.
        # 그냥 숫자로 시작하는 문장의 숫자를 떼면 안 된다
        # (실측 2026-09-02: '2020년 개정된 법은…' 이 '년 개정된 법은…' 이 됐다)
        t = re.sub(r'^[\s\-·•*]+', "", ln)
        t = re.sub(r'^\d{1,2}[.)]\s+', "", t).strip().strip('"').strip("'")
        t = re.sub(r'^[\[\]{}",]+|[\[\]{}",]+$', "", t).strip()
        if len(t) >= 10 and re.search(r"[가-힣]", t) and not t.startswith(("제목", "본문", "sum5")):
            out.append(t)
    return out[:6] if len(out) >= 4 else []


def main():
    if not up():
        print("Qwen 이 안 켜져 있다"); return
    j = json.loads(F.read_text(encoding="utf-8"))
    cache = json.loads(BODY.read_text(encoding="utf-8")) if BODY.exists() else {}
    pub = [d for d in j["days"] if d.get("pub")]
    print(f"펴낼 기사 {len(pub)}")

    for d in pub:
        need_l = (len(d.get("words") or []) < 6
                  or len(((d.get("dialog") or {}).get("lines") or [])) < 2)
        need_s = len(d.get("sum5") or []) < 4
        if not (need_l or need_s):
            continue
        b = body_of(d.get("u") or "", cache)
        if len(b) < 200:
            print(f"  본문 못 받음: {(d.get('title') or '')[:30]}"); continue
        head = f"제목: {d.get('title')}\n본문:\n{b[:2500]}"

        if need_l:
            g = jget(ask(LESSON + head, max_tokens=2500))
            if g and len(g.get("words") or []) >= 5 and len(g.get("lines") or []) >= 2:
                ws = []
                for w in g["words"][:6]:
                    vi = str(w.get("vi") or "").strip()
                    ko = str(w.get("ko") or "").strip()
                    if not vi or not ko or re.search(r"[^가-힣ㄱ-ㆎ0-9 ·()~,./%\-]", ko):
                        continue
                    ws.append({"vi": vi, "ko": ko, "kr_read": vi_kr.word(vi) or ""})
                ls = [{"who": (l.get("who") or "AB"[i % 2]),
                       "vi": str(l.get("vi") or "").strip(),
                       "ko": str(l.get("ko") or "").strip(),
                       "kr_read": vi_kr.word(str(l.get("vi") or "").strip()) or ""}
                      for i, l in enumerate(g["lines"][:2])]
                if len(ws) >= 5 and all(x["vi"] for x in ls):
                    d["words"] = ws
                    d["dialog"] = {"title": g.get("theme") or "기사", "emoji": "📰",
                                   "lines": ls, "extra": []}
                    d["theme"] = (g.get("theme") or d.get("theme") or "기사")[:12]
                    print(f"  낱말·대화 채움: {(d.get('title') or '')[:30]}")

        if need_s:
            got = lines_of(ask(SUM5 + head, max_tokens=2000))
            if len(got) >= 4:
                import news_sum5 as N
                d["sum5"] = [N.tidy(x) for x in got[:6]]
                print(f"  여섯 줄 풀이 채움: {(d.get('title') or '')[:30]}")
        F.write_text(json.dumps(j, ensure_ascii=False, indent=1), encoding="utf-8")

    BODY.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    bad = [d for d in pub if len(d.get("sum5") or []) < 4 or len(d.get("words") or []) < 6]
    print(f"\n아직 재료가 모자란 기사 {len(bad)}")
    for d in bad:
        print(f"  {(d.get('title') or '')[:40]}")


if __name__ == "__main__":
    main()
