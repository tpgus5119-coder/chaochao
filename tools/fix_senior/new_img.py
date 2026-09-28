#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""그림이 없는 낱말에 새 그림을 그린다 (2026-09-28 밤) — tools/fix_senior/new_img.json {파일이름: 장면}.
Draw Things(FLUX schnell 4단계, img_scene_redraw.py 와 같은 설정·같은 화풍) → 640px webp → Vision OCR 로 글자(2자 이상) 검사.
씨앗을 바꿔 최대 4번. 이미 있는 파일은 건너뛴다.
쓰기: python3 tools/fix_senior/new_img.py"""
import json, pathlib, sys, zlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from img_scene_redraw import make, letters, CFG


def main():
    jobs = json.loads((R / "tools/fix_senior/new_img.json").read_text(encoding="utf-8"))
    for name, scene in jobs.items():
        dst = R / "img" / name
        if dst.exists():
            print(name, "이미 있음"); continue
        best = None
        for k in range(4):
            seed = (zlib.crc32(name.encode()) + k * 7919) % 2_000_000_000
            im = make(scene + ", " + CFG["style"], seed).resize((640, 640))
            tmp = R / "_보관/img_redraw_try" / f"{name[:-5]}-{k}.webp"
            tmp.parent.mkdir(parents=True, exist_ok=True)
            im.save(tmp, "WEBP", quality=86, method=6)
            n = letters(tmp)
            if best is None or n < best[0]:
                best = (n, tmp)
            if n < 2:
                break
        dst.write_bytes(best[1].read_bytes())
        print(name, "글자 없음" if best[0] < 2 else f"글자 {best[0]}자 남음 — 확인 필요", flush=True)


if __name__ == "__main__":
    main()
