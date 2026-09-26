#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""글 목록(JSON 배열 파일)의 소리(북부 여 vi-VN-HoaiMyNeural · 남 vi-VN-NamMinhNeural)를 없는 것만 만들어 audio_index.json 에 올린다.
대표님 지시 2026-09-26: 헷갈리는 짝 낱말·문장 안 낱말(눌러 듣기)도 우리 소리로 — 기기 목소리는 북부·선택 목소리가 아니라서 쓰지 않는다.
사용: python3 tools/gen_audio_list.py <목록.json> [--jobs 5]
- 이미 있으면(정확히 같은 글자, 또는 소문자 표제어) 건너뛴다. 실패는 다시 시도한다.
- 소리 파일 이름 = sha1(글)[:12]. 색인에는 파일이 f·m 둘 다 있을 때만 올린다."""
import asyncio, hashlib, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

R = pathlib.Path(__file__).resolve().parent.parent
VOICES = {"f": "vi-VN-HoaiMyNeural", "m": "vi-VN-NamMinhNeural"}
k12 = lambda t: hashlib.sha1(t.encode()).hexdigest()[:12]


def main():
    import edge_tts
    src = pathlib.Path(sys.argv[1])
    jobs = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 5
    texts = list(dict.fromkeys(json.loads(src.read_text(encoding="utf-8"))))
    idxp = R / "data/audio_index.json"
    idx = json.loads(idxp.read_text(encoding="utf-8"))
    low = {k.lower() for k in idx}
    need = [t for t in texts if t not in idx and t.lower() not in low]
    print(f"목록 {len(texts)} · 만들 것 {len(need)}", flush=True)
    sem = asyncio.Semaphore(jobs)
    done = [0]

    async def make(t, v):
        p = R / "audio" / v / "n" / f"{k12(t)}.mp3"
        if p.exists() and p.stat().st_size > 3000:
            return True
        p.parent.mkdir(parents=True, exist_ok=True)
        async with sem:
            for a in range(4):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(t, VOICES[v]).save(str(p)), timeout=40)
                    if p.stat().st_size > 3000:
                        return True
                except Exception:
                    if p.exists():
                        p.unlink()
                    await asyncio.sleep(2 + a * 2)
        return False

    async def one(t):
        r = await asyncio.gather(*[make(t, v) for v in VOICES])
        done[0] += 1
        if done[0] % 100 == 0:
            print(f"  {done[0]}/{len(need)}", flush=True)
        return t, all(r)

    async def run():
        return await asyncio.gather(*[one(t) for t in need])

    res = asyncio.run(run())
    ok = [t for t, good in res if good]
    idx = json.loads(idxp.read_text(encoding="utf-8"))          # 다른 작업이 그새 고쳤을 수 있으니 다시 읽는다
    for t in ok:
        idx[t] = k12(t)
    idxp.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"새로 {len(ok)} · 실패 {len(need) - len(ok)}", [t for t, g in res if not g][:10], flush=True)
    # 새로 만든 소리는 바로 앞뒤 무음을 잘라 낸다(edge-tts 는 소리 뒤에 1초 안팎 무음을 붙인다 — tools/trim_audio.py)
    if "--no-trim" not in sys.argv and ok:
        import multiprocessing as mp
        import trim_audio
        paths = [R / "audio" / v / "n" / f"{k12(t)}.mp3" for t in ok for v in VOICES]
        with mp.Pool(6) as pool:
            r = [x[1] for x in pool.imap_unordered(trim_audio.one, [(p, False) for p in paths], chunksize=10)]
        print("무음 자름", {k: r.count(k) for k in set(r)}, flush=True)


if __name__ == "__main__":
    main()
