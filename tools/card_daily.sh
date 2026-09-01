#!/bin/sh
# 매일 저녁 카드뉴스 (대표님 지시 2026-09-01 "매일 저녁 자동으로 카드뉴스 제작해줘")
#
# 차례: 기사 받기 → 학습 세트 → 여섯 줄 요약 → 제목 다듬기 → 카드 두 장 → 바탕화면 → 파워포인트 → 올리기
# **모두 Qwen 으로 돈다** (CHAO_LOCAL=1). 제미나이 몫을 안 쓴다.
cd "$(dirname "$0")/.." || exit 1
export LANG=ko_KR.UTF-8 CHAO_LOCAL=1
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; export PATH
say() { echo ""; echo "===== $1 · $(date '+%m-%d %H:%M') ====="; }

# 깃허브 로봇이 저녁 8시에 올린 기사를 받아 온다
say "기사 내려받기"; git pull --rebase --autostash 2>&1 | tail -2

say "기사 받기";        python3 tools/fetch_news.py   2>&1 | tail -3
say "학습 세트";        python3 tools/news_lesson.py  2>&1 | tail -3
say "여섯 줄 요약";      python3 tools/news_sum5.py --local 2>&1 | tail -2
say "제목 다듬기";       python3 tools/card_title.py   2>&1 | tail -3
say "카드 두 장씩";      python3 tools/card_news.py    2>&1 | tail -3
say "바탕화면으로";      python3 tools/card_export.py  2>&1 | tail -2
say "파워포인트";        python3 tools/card_ppt.py     2>&1 | tail -2
say "소리";            python3 tools/gen_audio.py    2>&1 | tail -1

say "올리기"
python3 tools/stamp.py 2>&1 | tail -1
git add -A && git commit -q -m "오늘의 카드뉴스 (자동)" && git push origin main 2>&1 | tail -1
say "끝"
