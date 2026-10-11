#!/bin/bash
# 배포 한 판: attach_img(있으면) → stamp → make_commit (대표님 규칙: 배포는 이 스크립트로만). 2026-10-09 scratchpad 에서 옮김(오류 감시 bug_watch 도 이것을 씀)
set -e
cd ~/짜오짜오/베트남어-어플
[ -f tools/attach_img.py ] && python3 tools/attach_img.py >/dev/null 2>&1 || true
python3 tools/stale_imgs.py   # 같은 이름으로 다시 그린 그림은 기기 캐시에서 빼게 (2026-10-11 "기기마다 이미지가 다르냐")
python3 tools/stamp.py | tail -1
python3 tools/gybm_ch/make_commit.py "$1"
grep -o 'app.js?v=[0-9a-f]*' index.html | head -1
