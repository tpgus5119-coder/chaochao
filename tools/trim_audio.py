#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""베트남어 소리 파일(audio/f/n · audio/m/n)의 **앞뒤 무음을 잘라 낸다** (대표님 지적 2026-09-27: "소리는 진작 끝났는데 재생바는 1초 더 간다").
edge-tts 가 만든 파일은 소리 뒤에 평균 1초(최대 1.6초) 무음이 붙어 있고 앞에도 0.2초 있다 — 재생바·'대화 전체 듣기'·저장소 크기 모두 손해다.
- 다시 인코딩하지 않는다(ffmpeg -c copy, mp3 프레임 단위 26ms) → 음질 그대로.
- 끝: 마지막 소리 뒤 0.25초를 남긴다 · 앞: 첫 소리 앞 0.05초를 남긴다. 소리 크기 기준은 최대의 1%(-40dB).
- 이미 잘랐으면(꼬리 0.4초 미만·머리 0.12초 미만) 건드리지 않는다 → 다시 돌려도 같다.
사용: python3 tools/trim_audio.py [--jobs 6] [--limit N] [--dry] [파일 ...]"""
import multiprocessing as mp, pathlib, subprocess, sys, tempfile, os
import numpy as np

R = pathlib.Path(__file__).resolve().parent.parent
SR = 16000
TAIL_KEEP, HEAD_KEEP = 0.25, 0.05
TAIL_MIN, HEAD_MIN = 0.40, 0.12


def measure(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if len(x) < SR * 0.2:
        return None
    win = SR // 100
    n = len(x) // win
    env = np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(1))
    pk = float(env.max())
    if pk < 0.005:
        return None
    ok = np.where(env > max(pk * 0.01, 0.0015))[0]
    return len(x) / SR, ok[0] * 0.01, (ok[-1] + 1) * 0.01


def one(args):
    path, dry = args
    m = measure(path)
    if not m:
        return path, "skip", 0
    dur, s, e = m
    tail, head = dur - e, s
    start = max(0.0, s - HEAD_KEEP) if head > HEAD_MIN else 0.0
    end = min(dur, e + TAIL_KEEP) if tail > TAIL_MIN else dur
    if start == 0.0 and end >= dur - 0.01:
        return path, "same", 0
    if dry:
        return path, "would", dur - (end - start)
    tmp = tempfile.mktemp(suffix=".mp3", dir=str(path.parent))
    r = subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-ss", f"{start:.3f}", "-t", f"{end - start:.3f}", "-i", str(path),
                        "-c", "copy", "-map_metadata", "-1", tmp], capture_output=True)
    if r.returncode or not os.path.exists(tmp) or os.path.getsize(tmp) < 1500:
        if os.path.exists(tmp):
            os.unlink(tmp)
        return path, "fail", 0
    m2 = measure(pathlib.Path(tmp))                     # 잘라 낸 뒤에도 소리 길이가 그대로인지 확인
    if not m2 or abs((m2[2] - m2[1]) - (e - s)) > 0.12:
        os.unlink(tmp)
        return path, "fail", 0
    os.replace(tmp, path)
    return path, "cut", dur - (end - start)


def main():
    jobs = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 6
    lim = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    dry = "--dry" in sys.argv
    files = [pathlib.Path(a) for a in sys.argv[1:] if a.endswith(".mp3")]
    if not files:
        files = sorted(list((R / "audio/f/n").glob("*.mp3")) + list((R / "audio/m/n").glob("*.mp3")))
    if lim:
        files = files[:lim]
    print(f"대상 {len(files)}", flush=True)
    cnt, saved, done = {}, 0.0, 0
    with mp.Pool(jobs) as pool:
        for p, st, sv in pool.imap_unordered(one, [(f, dry) for f in files], chunksize=20):
            cnt[st] = cnt.get(st, 0) + 1
            saved += sv
            done += 1
            if st == "fail":
                print("실패", p, flush=True)
            if done % 2000 == 0:
                print(done, cnt, f"줄인 소리 {saved/60:.0f}분", flush=True)
    print("끝", cnt, f"줄인 소리 {saved/60:.0f}분", flush=True)


if __name__ == "__main__":
    main()
