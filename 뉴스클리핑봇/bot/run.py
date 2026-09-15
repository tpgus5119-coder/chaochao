# -*- coding: utf-8 -*-
"""매일 20:00 실행되는 본체. 수집→중복제거→선별(부족시 2일로 확대)→조립→전송→보고."""
import sys
import time
import traceback

import config
from collect import collect
from compose import compose, compose_report
from dedup import commit, is_dup, load_state, mark, recent_headlines
from curate import curate

DRY_RUN = "--dry-run" in sys.argv  # 전송 없이 메시지만 출력 (로컬 테스트용)


def build_message(key, cfg, state):
    """한 주제의 기사 선정 + 메시지. (articles, text) 반환. 없으면 (None, None)."""
    recent = recent_headlines(state, config.RECENT_HEADLINES_DAYS)
    for days in (config.DAYS_PRIMARY, config.DAYS_FALLBACK):
        cands = [a for a in collect(cfg, days) if not is_dup(state, a)]
        picks = curate(cfg, cands, recent)
        if len(picks) >= config.MIN_ARTICLES or days == config.DAYS_FALLBACK:
            if not picks:
                return None, None
            return picks, compose(cfg, picks)
    return None, None


def main():
    state = load_state(config.DEDUP_RETENTION_DAYS)
    results = {}
    fatal = ""

    if not DRY_RUN:
        from send_kakao import send
    else:
        def send(room, text, retries=1):  # noqa: ARG001
            print(f"\n===== [{room}] =====\n{text}\n")
            return True

    for key, cfg in config.TOPICS.items():
        try:
            articles, text = build_message(key, cfg, state)
            if not articles:
                results[key] = {"name": cfg["name"], "ok": False, "count": 0,
                                "error": "당일·전일 기준 맞는 기사 없음"}
                continue
            send(cfg["room"], text, retries=1)
            for a in articles:
                mark(state, a)
            commit(state)
            results[key] = {"name": cfg["name"], "ok": True, "count": len(articles), "error": ""}
            time.sleep(config.SEND_DELAY)
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            results[key] = {"name": cfg["name"], "ok": False, "count": 0, "error": str(e)}

    report = compose_report(results, fatal)
    print(report)
    if config.REPORT_ROOM and not DRY_RUN:
        try:
            send(config.REPORT_ROOM, report, retries=2)
        except Exception:  # noqa: BLE001
            traceback.print_exc()

    # 하나라도 실패면 종료코드 1 (작업 스케줄러 로그/알림용)
    sys.exit(0 if all(r["ok"] for r in results.values()) else 1)


if __name__ == "__main__":
    main()
