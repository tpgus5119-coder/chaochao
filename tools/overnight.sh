#!/bin/sh
# 밤새 도는 일 — 새 일상 과정을 만들고 검수한다 (대표님 지시 2026-08-31)
#
# 앱 자료(order.json 등)는 **건드리지 않는다.** data/_new_*.json 에만 쌓는다.
# 다 만든 뒤 사람이 보고 바꿔 넣는 것이 안전하다.
#
# 쓰기: nohup sh tools/overnight.sh > logs/overnight.log 2>&1 &
cd "$(dirname "$0")/.."
export LANG=ko_KR.UTF-8

say() { echo ""; echo "===== $1 · $(date '+%H:%M') ====="; }

# 모델이 내려가 있을 수 있다 — 다시 올린다
~/.lmstudio/bin/lms load qwen/qwen3.5-9b -c 16384 --gpu max --ttl 21600 --parallel 1 -y >/dev/null 2>&1

# ① 낱말 고르기 — 여러 판 돌린다.
#    한 판에 다 못 채운다(모델이 이따금 빈 답을 준다). 판마다 빈 꼭지를 다시 채운다.
for i in 1 2 3 4 5 6; do
  say "낱말 고르기 $i 판"
  python3 tools/new_words.py --want 50
done

# ② 뜻 검수 — 사전으로 대조한다(토큰이 안 든다)
say "뜻 검수"
python3 tools/new_check.py

# ③ 발음 — 도구가 만든다(AI 아님)
say "발음"
python3 tools/new_kr.py

say "여기까지"
