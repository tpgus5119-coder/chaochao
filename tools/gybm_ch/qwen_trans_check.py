"""메인 예문 (vi, ko) 쌍이 서로 번역인지 Qwen 이 걸러 본다(플래그용 — 판정은 사람이 한다). 결과: qwen_trans.json"""
import json, sys, time, pathlib, urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT = pathlib.Path.home() / "짜오짜오/베트남어-어플"
g = json.loads((ROOT / "data/gybm.json").read_text(encoding="utf-8"))
main = [s for s in g["sources"] if s["key"] == "main"][0]
pairs = []
for l in main["lessons"]:
    for w in l["words"]:
        ex = w.get("ex") or {}
        if ex.get("vi") and ex.get("ko"): pairs.append((w["vi"], ex["vi"], ex["ko"]))
out_p = pathlib.Path(__file__).resolve().parent / "qwen_trans.json"
done = json.loads(out_p.read_text(encoding="utf-8")) if out_p.exists() else {}
todo = [p for p in pairs if p[1] + "||" + p[2] not in done]
print("전체", len(pairs), "남음", len(todo), flush=True)
def ask(p):
    w, vi, ko = p
    q = f"베트남어 문장: {vi}\n한국어 번역: {ko}\n\n이 한국어가 베트남어 문장의 뜻과 맞는 번역인가? 문장 뜻이 다르거나 다른 문장의 번역이면 BAD. 어투 차이·의역은 OK.\n첫 단어는 OK 또는 BAD 중 하나만, 그 뒤에 한 줄 이유."
    body = {"model": "qwen/qwen3.5-9b", "messages": [{"role": "user", "content": q}, {"role": "assistant", "content": "<think>\n\n</think>\n\n"}], "temperature": 0.0, "max_tokens": 60}
    for a in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request("http://localhost:1234/v1/chat/completions", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=120)
            return p, json.loads(r.read())["choices"][0]["message"]["content"].strip()
        except Exception as e:
            time.sleep(3)
    return p, "ERR"
t0 = time.time(); n = 0
with ThreadPoolExecutor(2) as ex:
    for p, a in ex.map(ask, todo):
        done[p[1] + "||" + p[2]] = {"w": p[0], "a": a}; n += 1
        if n % 100 == 0:
            out_p.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8"); print(n, f"{time.time()-t0:.0f}s", flush=True)
out_p.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8"); print("끝", n, f"{time.time()-t0:.0f}s")
