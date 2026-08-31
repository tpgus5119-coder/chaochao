#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기사 본문에서 **다섯 줄 요약**을 만든다 → data/news_days.json 의 sum5 칸

왜 (대표님 지시 2026-08-31): "카드뉴스에 기사내용이 너무 빈약하다. 더 추가해줘. 5줄 안팎으로"
  지금 카드에 얹히던 intro 는 두 줄뿐이라 기사를 읽은 느낌이 안 났다.
  본문(1,500~3,500자)이 data/news_body.json 에 이미 있으므로 그것을 줄여 쓴다.

AI 는 중계 워커(tools/worker.js)를 부른다 — 열쇠는 스크립트가 아니라 워커 금고에 있다.
쓰기: python3 tools/news_sum5.py [--day 2026-08-28]
"""
import argparse, json, pathlib, re, subprocess, time

R = pathlib.Path(__file__).resolve().parent.parent
URL = "https://viet-ai.chaochao-app.workers.dev"
ORIGIN = "https://tpgus5119-coder.github.io"

ASK = (
    "너는 베트남에서 일하는 한국 사람들에게 뉴스를 알기 쉽게 전해 주는 편집자다.\n"
    "아래 기사를 **다섯 줄로** 요약하라.\n"
    "규칙\n"
    " ① 정확히 5줄. 한 줄은 완성된 문장이고 **40자 안팎**으로 짧게\n"
    " ② 숫자·회사 이름·지역 같은 **구체적인 사실**을 살려라 (5천억 달러·2200개 공장처럼)\n"
    " ③ 첫 줄은 무슨 일이 있었는지, 마지막 줄은 그래서 우리에게 무슨 뜻인지\n"
    " ④ 전문용어는 풀어서 써라. 비전공자가 한 번에 읽히게\n"
    " ⑤ 제목을 그대로 되풀이하지 마라\n"
    ' 출력은 JSON 만: {"sum5": ["줄1","줄2","줄3","줄4","줄5"]}\n\n'
)


def ask(title, body, tries=4):
    p = ASK + f"제목: {title}\n본문:\n{body[:3500]}"
    req = json.dumps({"contents": [{"parts": [{"text": p}]}]})
    for k in range(tries):
        try:
            r = subprocess.run(
                ["curl", "-sS", "-X", "POST", URL, "-H", "Content-Type: application/json",
                 "-H", f"Origin: {ORIGIN}", "--data-binary", "@-"],
                input=req, capture_output=True, text=True, timeout=200).stdout
        except Exception:
            time.sleep(2 * (k + 1)); continue
        t = r
        try: t = json.loads(r)["candidates"][0]["content"]["parts"][0]["text"]
        except Exception: pass
        # 로컬 모델로 바꿔 쓸 때를 대비해 생각 부분을 떼어 낸다
        t = re.sub(r"(?s)<think>.*?</think>", "", t)
        m = re.search(r"\{.*\}", t, re.S)
        if m:
            try:
                got = json.loads(m.group(0)).get("sum5")
                if isinstance(got, list) and len(got) >= 4:
                    return [str(x).strip() for x in got[:5] if str(x).strip()]
            except Exception:
                pass
        time.sleep(1.5 * (k + 1))
    return None


def main():
    a = argparse.ArgumentParser(); a.add_argument("--day"); a.add_argument("--force", action="store_true")
    a = a.parse_args()

    bp = R / "data" / "news_body.json"
    if not bp.exists():
        print("data/news_body.json 이 없다 — fetch_news.py 를 먼저 돌려라"); return
    bodies = {x["t"]: x.get("body", "") for x in json.loads(bp.read_text(encoding="utf-8"))["picked"]}

    dp = R / "data" / "news_days.json"
    D = json.loads(dp.read_text(encoding="utf-8"))
    days = D["days"]
    target = [d for d in days if (not a.day or d.get("ts") == a.day)]

    done = 0
    for d in target:
        if d.get("sum5") and not a.force:
            continue
        body = bodies.get(d.get("title", ""))
        if not body or len(body) < 200:
            print("  본문 없음:", d.get("title", "")[:30]); continue
        got = ask(d["title"], body)
        if not got:
            print("  실패:", d.get("title", "")[:30]); continue
        d["sum5"] = got
        done += 1
        print(f"  {d.get('theme','')} — {len(got)}줄", flush=True)

    if done:
        dp.write_text(json.dumps(D, ensure_ascii=False), encoding="utf-8")
    print(f"다섯 줄 요약 {done}편 만듦")


main()
