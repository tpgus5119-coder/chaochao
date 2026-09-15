# -*- coding: utf-8 -*-
"""선정 기사 → 카톡에 붙일 메시지 문자열. 첨부 이미지 형식."""
import datetime as dt

import config

_WD = ["월", "화", "수", "목", "금", "토", "일"]


def _today_kr():
    now = dt.datetime.now()  # 클라우드 PC는 KST로 설정해 둔다
    return f"{now.month}.{now.day} ({_WD[now.weekday()]})"


def compose(topic_cfg, articles) -> str:
    head = f"{topic_cfg['flag']} {topic_cfg['name']} 뉴스 클리핑 – {_today_kr()}"
    if config.HEADER_CREDIT:
        head += f"\n- {config.HEADER_CREDIT}"
    blocks = [head]
    for i, a in enumerate(articles, 1):
        blocks.append(f"{i}. {a['title']}\n- {a['source'] or '출처 미상'}\n{a['link']}")
    return "\n\n".join(blocks)


def compose_report(results: dict, error: str = "") -> str:
    ts = dt.datetime.now().strftime("%m/%d %H:%M")
    lines = [f"[뉴스클리핑봇] {ts} 실행 결과"]
    for key, r in results.items():
        if r["ok"]:
            lines.append(f"  {r['name']}: {r['count']}건 전송 완료")
        else:
            lines.append(f"  {r['name']}: 실패 - {r['error']}")
    if error:
        lines.append(f"  전체 오류: {error}")
    return "\n".join(lines)
