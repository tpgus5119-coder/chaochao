#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""그림 속 낱말 글자만 지우기 — 글자색 픽셀만 바탕색으로 (2026-09-28 밤). 네모로 통째로 칠하면 테두리·괄호선이 끊기고 색 덩어리가 생겼다.
① Vision 으로 글자 칸을 잡는다(tools/bin/ocr_box) ② 칸 안 가장 흔한 색 = 바탕색, 바탕과 먼 색 = 글자색
③ 칸 위아래는 '양옆이 바탕색인 줄'까지만 넓힌다(헤더 띠 밖 흰 바탕을 칠하지 않게) ④ 글자색에 더 가까운 픽셀만 바탕색으로, 두 번(잔상까지)
쓰기: from img_erase_keyed import erase_boxes"""
import numpy as np
from collections import Counter


def _q(c): return tuple((np.asarray(c) // 16).tolist())


def erase_box(im, x, y, w, h, bg=None):
    H, W = im.shape[:2]
    x0, y0, x1, y1 = max(0, int(x)), max(0, int(y)), min(W, int(x + w)), min(H, int(y + h))
    if x1 <= x0 or y1 <= y0: return
    tight = im[y0:y1, x0:x1].reshape(-1, 3)
    if bg is None:
        qs = [_q(c) for c in tight]; bq = Counter(qs).most_common(1)[0][0]
        bg = np.median(tight[[i for i, v in enumerate(qs) if v == bq]], axis=0)
    bg = np.asarray(bg, dtype=float)
    far = tight[np.abs(tight - bg).sum(1) > 90]
    if not len(far): return
    tc = np.median(far, axis=0)
    close = lambda px: np.abs(np.asarray(px, dtype=float) - bg).sum() < 45
    lx, rx = max(0, x0 - 3), min(W - 1, x1 + 2)
    top = y0
    while top > max(0, int(y - h * .45)) and close(im[top - 1, lx]) and close(im[top - 1, rx]): top -= 1
    bot = y1
    while bot < min(H, int(y + h + 3)) and close(im[bot, lx]) and close(im[bot, rx]): bot += 1
    reg = im[top:bot, max(0, x0 - 3):min(W, x1 + 3)]
    dt = np.abs(reg - tc).sum(2); db = np.abs(reg - bg).sum(2)
    m = (dt < db) & (db > 40)                              # 글자 획
    for _ in range(2):                                      # 획 둘레 2픽셀 — 흐릿한 가장자리(잔상)까지
        n = m.copy(); n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]; m = n
    reg[m & (db > 8)] = bg
