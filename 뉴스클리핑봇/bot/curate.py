# -*- coding: utf-8 -*-
"""Claude API로 '한국인 독자용 그 나라 경제 기사'를 중요도 순 3~5개 고른다.
기사 원제목은 그대로 쓴다(요약/재작성 없음). 여기서는 번호만 고른다."""
import json
import os

import anthropic

import config

_SYS = """너는 한국인 독자를 위한 해외 경제 뉴스 큐레이터다.
후보 중에서 아래를 모두 만족하는 기사만 고르고, 중요도(한국 독자 기준) 순으로 최대 {maxn}개를 정한다.

[선정 기준]
1. 기사의 주제 자체가 '{name}'일 것. 한국 국내 이슈가 그 나라를 잠깐 언급한 기사는 제외.
2. 경제 기사일 것. 정치·외교·사건사고·연예·스포츠·문화·여행 제외.
3. 한국인 독자에게 읽을 가치가 있을 것. 다음 중 하나면 해당:
   - 그 나라에 진출한 한국 기업 소식(실적·투자·공장·수주·계약·MOU)
   - 그 나라의 거시지표: 성장률·GDP·물가·환율·교역·고용
   - 그 나라 시장·산업 전망, 한국과의 교역·투자·정책
4. 홍보성 국정 기사 제외: 회사명·수치·구체 사실 없이 '자랑스러운 성과',
   '새 시대의 열망', '위대한 도약' 같은 미사여구뿐인 글.
5. 칼럼·사설: {column_rule}
6. 같은 사안이 여러 건이면 가장 최신·구체적인 것 1건만.
7. 아래 '최근 발송 목록'에 있는 기사와 같은 사안이면 제외(제목이 달라도).

[최근 발송 목록]
{recent}

[출력]
JSON 하나만. 설명 금지.
{{"picks": [<후보 번호>, ...]}}
중요도 순. 기준에 맞는 게 {minn}개 미만이면 맞는 것만(억지로 채우지 말 것).
맞는 게 하나도 없으면 {{"picks": []}}."""

_COLUMN_RULES = {
    "keep_if_substantive": "구체적 전망·데이터가 있으면 허용, 단순 논평은 제외.",
    "exclude": "무조건 제외.",
}


def _client():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("환경변수 ANTHROPIC_API_KEY 가 없습니다.")
    return anthropic.Anthropic(api_key=key)


def curate(topic_cfg, candidates, recent=None):
    """candidates: collect() 결과. recent: 최근 발송 원제목 리스트.
    반환: 선정 기사 dict 리스트(원본 그대로, 중요도 순)."""
    if not candidates:
        return []
    lines = []
    for i, c in enumerate(candidates[:40]):
        lines.append(f"[{i}] ({c['source']} / {c['published'][:10]}) {c['title']}\n    {c['summary']}")
    sys = _SYS.format(
        name=topic_cfg["name"],
        maxn=config.MAX_ARTICLES,
        minn=config.MIN_ARTICLES,
        column_rule=_COLUMN_RULES.get(config.COLUMN_POLICY, _COLUMN_RULES["keep_if_substantive"]),
        recent="\n".join(f"- {h}" for h in (recent or [])) or "(없음)",
    )
    msg = _client().messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=400,
        system=sys,
        messages=[{"role": "user", "content": "기사 후보:\n\n" + "\n\n".join(lines)}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text").strip()
    text = text[text.find("{"): text.rfind("}") + 1]
    picks = json.loads(text).get("picks", [])

    out, seen = [], set()
    for idx in picks[: config.MAX_ARTICLES]:
        if isinstance(idx, int) and 0 <= idx < len(candidates) and idx not in seen:
            seen.add(idx)
            out.append(dict(candidates[idx]))
    return out
