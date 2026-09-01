#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""**누구에게 시킬까** — 일을 Qwen·제미나이·클로드에 가르는 관문.

대표님 지시 (2026-09-01): "퀄리티가 떨어지지 않고, 너의 토큰을 아낄 수 있고,
                          시간이 너무 오래 걸리지 않을 조건에서 항상 Qwen에게 시켜라.
                          그 판단 과정을 시스템화해서 만들어라."

## 실측이 이 관문의 근거다 (2026-09-01, 낱말 100개)
  · 속도  낱말 하나에 **1.2초** (100개 117초)
  · 품질  글자까지 같음 50 · 표현만 다르고 맞음 33 · **틀림 11** · 우리보다 나음 6
          → 정확도 83~89%
  · 틀리는 버릇 셋
      ① 말을 잘라먹는다        xe máy 오토바이 → '오토'
      ② 비슷한데 어긋난다       bếp núc 주방 → '주부'
      ③ 없는 것을 지어낸다      "50개 달라" 하면 없는 말로 채운다 (실제 255개)

## 네 관문 — 하나라도 걸리면 Qwen에게 안 준다
  ① 검산할 수 있나  답이 맞는지 **사전·규칙·이미 있는 자료**로 공짜로 확인되나
  ② 틀리면 보이나   틀린 결과가 눈에 띄나. 조용히 스며들면 안 된다
  ③ 지어낼 자리가 없나  "몇 개 채워라"는 금지. 있는 것을 **고르는** 일이어야 한다
  ④ 시간이 되나    1.2초 × 건수. 그림을 굽는 중이면 GPU 를 나눠 써 느려진다

## 쓰는 법
    from route import who
    who("뜻 달기")            # → 'qwen'
    who(verifiable=True, visible=True, closed=True, n=800)
"""
import sys

SEC_PER_ITEM = 1.2          # 실측 (2026-09-01)
TIME_LIMIT = 3600           # 한 판에 한 시간 넘으면 나눠 돌린다


def who(job=None, *, verifiable=None, visible=None, closed=None, n=1, gpu_busy=False):
    """누가 할 일인지 고른다. 이유도 함께 돌려준다 → (누구, 왜)"""
    if job is not None and job in JOBS:
        j = JOBS[job]
        return j["who"], j["why"]
    if not verifiable:
        return "claude", "검산할 길이 없다 — 틀린 채로 남는다"
    if not visible:
        return "claude", "틀려도 눈에 안 띈다 — 그대로 외워 버린다"
    if not closed:
        return "claude", "지어낼 자리가 있다 — 없는 것을 채운다"
    secs = n * SEC_PER_ITEM * (2.5 if gpu_busy else 1)
    if secs > TIME_LIMIT:
        return "qwen(나눠서)", f"{int(secs/60)}분 걸린다 — 여러 판으로 쪼개 돌린다"
    return "qwen", f"네 관문 통과 · {int(secs)}초"


# ── 실제로 해 본 일들. who 는 위 네 관문을 적용한 결과다.
JOBS = {
 # 시킨다
 "뜻 달기":        {"who": "qwen", "why": "사전 뜻풀이로 검산된다 · 794개 함"},
 "그림 글감 만들기":  {"who": "qwen", "why": "한글 섞임을 규칙으로 거른다 · 2,741개 함"},
 "쓰는 말인가 판정":  {"who": "qwen", "why": "사전이 뒷받침 · 고르는 일이라 못 지어낸다"},
 "사전 뜻풀이 대조":  {"who": "qwen", "why": "사전 본문을 쥐여 주면 지어낼 자리가 없다"},
 "기사 요약":       {"who": "qwen", "why": "짧아 사람이 훑으면 보인다 · 매일 함"},
 "기사 제목 다듬기":  {"who": "qwen", "why": "지어낸 숫자를 규칙으로 거른다"},
 "기사 낱말·대화":   {"who": "qwen", "why": "본문에 없는 낱말을 규칙으로 버린다"},
 "그림이 뜻을 알려주나": {"who": "qwen", "why": "틀려도 사람이 보면 안다"},
 "낱말 갈래 나누기":  {"who": "qwen", "why": "분류는 틀려도 눈에 띈다"},

 # 안 시킨다
 "숫자·시간·요일":   {"who": "사람", "why": "정해진 체계다. hai trăm giờ(이백 시)를 무한정 만든다"},
 "목록 채우기":      {"who": "사람", "why": "'50개 달라'면 없는 말로 채운다 — 실제 255개 지어냈다"},
 "예문 짓기":       {"who": "gemini", "why": "문법이 틀리면 그대로 외운다 · 검산할 길이 없다"},
 "문법 설명":       {"who": "gemini", "why": "틀려도 배우는 사람은 모른다"},
 "근거 없이 뜻 고치기": {"who": "사람", "why": "사전 첫 뜻만 보고 cầu(다리)를 '셔틀콕'이라 했다"},
 "그림이 이상한가":   {"who": "claude", "why": "AI 는 글감만 읽는다 — 그림 자체를 못 본다"},
 "마지막 판정":      {"who": "claude", "why": "무엇을 앱에 넣을지는 사람 몫이다"},
}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        w, why = who(sys.argv[1])
        print(f"{sys.argv[1]} → {w} ({why})")
    else:
        for k, v in JOBS.items():
            print(f"  {k:20} {v['who']:10} {v['why']}")
