"""새로 그릴 낱말(shared_regen.json)의 그림 프롬프트를 Qwen 이 초안 → 사람이 훑어 고친다. 결과: regen_prompts.json {낱말: 프롬프트}"""
import json, pathlib, sys, time, urllib.request, unicodedata
from concurrent.futures import ThreadPoolExecutor
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
SP = pathlib.Path(__file__).resolve().parent
regen = json.loads((SP / "shared_regen.json").read_text(encoding="utf-8"))
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
info = {}
for src in ("main", "senior", "sub", "zoom"):
    ss = [x for x in g["sources"] if x["key"] == src]
    if not ss: continue
    s = ss[0]
    for l in s["lessons"]:
        for w in l["words"]:
            info.setdefault(w["vi"], (w.get("ko", ""), (w.get("ex") or {}).get("ko", "")))
for f in ("days", "order"):
    d = json.loads((ROOT / f"data/{f}.json").read_text(encoding="utf-8"))
    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("vi"), str) and isinstance(o.get("ko"), str):
                exd = o.get("ex"); info.setdefault(o["vi"], (o["ko"], exd.get("ko", "") if isinstance(exd, dict) else ""))
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(d)
words = list(dict.fromkeys(r["vi"] for r in regen))
out_p = SP / "regen_prompts.json"
done = json.loads(out_p.read_text(encoding="utf-8")) if out_p.exists() else {}
todo = [w for w in words if w not in done]
print("낱말", len(words), "남음", len(todo), flush=True)
SYS = ("You write short image prompts for a flat-vector vocabulary illustration. Given a Vietnamese word, its Korean meaning and a Korean example sentence, "
       "write ONE English prompt (max 18 words) describing a single simple concrete scene or object that clearly conveys that meaning. "
       "Rules: no text, no letters, no numbers, no signs with words; people must be fully clothed; for abstract words show a typical everyday scene or a clear symbol. "
       "Examples: 'A hand pouring hot tea from a teapot into a cup' ; 'A tired man leaning on a wall with drooping shoulders' ; 'A glass of iced coffee with condensed milk'. "
       "Output only the prompt.")
def ask(w):
    ko, exko = info.get(w, ("", ""))
    q = f"Vietnamese word: {w}\nKorean meaning: {ko}\nKorean example: {exko}\n\nImage prompt:"
    body = {"model": "qwen/qwen3.5-9b", "messages": [{"role": "system", "content": SYS}, {"role": "user", "content": q}, {"role": "assistant", "content": "<think>\n\n</think>\n\n"}], "temperature": 0.3, "max_tokens": 80}
    for a in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request("http://localhost:1234/v1/chat/completions", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=120)
            return w, json.loads(r.read())["choices"][0]["message"]["content"].strip().strip('"')
        except Exception:
            time.sleep(3)
    return w, ""
n = 0
with ThreadPoolExecutor(2) as ex:
    for w, p in ex.map(ask, todo):
        done[w] = {"prompt": p, "ko": info.get(w, ("", ""))[0]}; n += 1
        if n % 50 == 0: out_p.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8"); print(n, flush=True)
out_p.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8"); print("끝", len(done))
