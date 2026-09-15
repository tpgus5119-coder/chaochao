#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기초단어(basicwords.json) 낱말을 인터넷 대형 사전(VDict, 베-영)에 대조한다.

대표님 지적 (2026-09-15): "로컬 사전으로 하면 안된다고 옛날부터 말햇잔아.
인터넷에 잇는 대형 사전으로 해야한다고." — 맞는 말이다. data/_vi_words.json은
그저 표제어 4만 7천 개 목록일 뿐, 뜻풀이가 없어 "뜻이 맞나"는 검증하지 못했다.
이 도구는 실제로 인터넷에 있는 대형 사전(vdict.com)에서 **뜻풀이 원문**을 가져와
data/_vdict_def.json에 저장한다. 글로베(Glosbe)의 베-한 방향은 표제어 커버리지가
얕아(일상 낱말도 404가 잦음, 실측 확인함) 베-영 방향의 VDict를 1차로 쓴다.

쓰기: python3 tools/vdict_check.py [--n 200]  (ن 생략 시 basicwords.json 전체)
결과: data/_vdict_def.json = {vi: {"status": 200|404|"error", "def": "영어 뜻풀이"}}
"""
import argparse, json, pathlib, re, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests, certifi
from urllib.parse import quote

R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / "data" / "_vdict_def.json"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def fetch_one(vi):
    url = f"https://vdict.com/{quote(vi)},2,0,0.html"  # 2 = Việt - Anh
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=15, verify=certifi.where(),
                              headers={"User-Agent": UA})
            if r.status_code == 404:
                return vi, {"status": 404, "def": ""}
            html = r.text
            m = re.search(
                r'<span class="d_1">Definition</span>.*?class="word-type mb-2">',
                html, re.S)
            block = m.group(0) if m else ""
            text = re.sub(r"<[^>]+>", " ", block)
            text = re.sub(r"\s+", " ", text).strip()
            text = text.replace("Definition", "", 1).strip(" :")
            return vi, {"status": r.status_code, "def": text[:400]}
        except Exception as e:
            if attempt == 2:
                return vi, {"status": "error", "def": str(e)[:120]}
            time.sleep(1 + attempt)


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--n", type=int, default=0)
    a = a.parse_args()

    d = json.loads((R / "data" / "basicwords.json").read_text(encoding="utf-8"))
    # 별(겹치는 기수 수) 높은 것부터 — 이미 예문·그림을 넣은 낱말을 먼저 대조해야
    # 그만큼 먼저 검수를 끝낼 수 있다. 같은 낱말이 여러 번 나오면 가장 높은 별을 쓴다.
    best_star = {}
    for w in d["words"]:
        best_star[w["vi"]] = max(best_star.get(w["vi"], -1), w["star"])
    words = sorted(best_star, key=lambda v: (-best_star[v], v))
    if a.n:
        words = words[:a.n]

    cache = {}
    if OUT.exists():
        cache = json.loads(OUT.read_text(encoding="utf-8"))
    todo = [w for w in words if w not in cache]
    print(f"대상 {len(words)}개 · 이미 있음 {len(words)-len(todo)}개 · 새로 받을 것 {len(todo)}개",
          flush=True)

    done = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(fetch_one, w): w for w in todo}
        for fut in as_completed(futs):
            vi, res = fut.result()
            cache[vi] = res
            done += 1
            if done % 100 == 0:
                OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
                ok = sum(1 for v in cache.values() if v["status"] == 200)
                print(f"  {done}/{len(todo)} · 지금까지 200(있음) {ok} / {len(cache)}", flush=True)

    OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    ok = sum(1 for v in cache.values() if v["status"] == 200)
    nf = sum(1 for v in cache.values() if v["status"] == 404)
    er = sum(1 for v in cache.values() if v["status"] == "error")
    print(f"\n끝. 전체 {len(cache)}개 중 사전에 있음(200) {ok} · 없음(404) {nf} · 오류 {er}")


if __name__ == "__main__":
    main()
