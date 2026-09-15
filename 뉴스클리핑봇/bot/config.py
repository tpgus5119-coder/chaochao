# -*- coding: utf-8 -*-
"""설정. 값만 고치면 됩니다. API 키는 환경변수 ANTHROPIC_API_KEY 로 넣습니다."""

# 주제별 설정: key -> (헤더 이모지, 표시 이름, 검색어들, 카톡 방 이름)
TOPICS = {
    "vietnam": {
        "flag": "🇻🇳",
        "name": "베트남 경제",
        "queries": ["베트남 경제", "베트남 진출 한국기업", "베트남 성장률", "베트남 투자 전망", "베트남 수출"],
        "room": "베트남 경제 뉴스",          # ← 실제 오픈채팅방 이름으로 교체
    },
    "china": {
        "flag": "🇨🇳",
        "name": "중국 경제",
        "queries": ["중국 경제", "중국 진출 한국기업", "중국 성장률", "중국 시장 전망", "중국 수출"],
        "room": "중국 경제 뉴스",            # ← 교체
    },
    "indonesia": {
        "flag": "🇮🇩",
        "name": "인도네시아 경제",
        "queries": ["인도네시아 경제", "인도네시아 진출 한국기업", "인도네시아 성장률",
                     "인도네시아 시장 전망", "인도네시아 니켈"],
        "room": "인도네시아 경제 뉴스",       # ← 교체
    },
}

# 결과 보고를 받을 카톡 방 (보통 '나와의 채팅'). 비우면 보고 안 함.
REPORT_ROOM = "나와의 채팅"

# 기사 개수
MIN_ARTICLES = 3          # 최소 목표
MAX_ARTICLES = 5          # 최대
DAYS_PRIMARY = 1          # 우선 당일(24h)
DAYS_FALLBACK = 2         # 부족하면 이틀 전까지 허용

# 중복 방지: 최근 며칠간 보낸 기사는 다시 안 보냄 (전날+서버 장애·주말 대비 7일)
DEDUP_RETENTION_DAYS = 7
# Claude에게 "이것들과 같은 사안이면 빼라"고 넘길 최근 발송 제목 (최근 N일)
RECENT_HEADLINES_DAYS = 2

# 제외할 현지·관영 매체 (한글판이 있어도 홍보성 국정기사가 많음)
FOREIGN_MEDIA_DENY = [
    "Vietnam.vn", "Thông tấn xã Việt Nam", "Vietnam News Agency", "VietnamPlus",
    "VOI.ID", "Antara", "Republika", "신화통신", "Xinhua", "인민망", "People's Daily",
    "글로벌타임스", "Global Times", "CGTN", "China Daily",
]

# 칼럼·사설 처리: "keep_if_substantive"(전망·데이터 있으면 허용) 또는 "exclude"(무조건 제외)
COLUMN_POLICY = "keep_if_substantive"

# 선별에 쓸 모델 (하루 1회라 비용은 수백 원). 품질 우선이면 sonnet.
ANTHROPIC_MODEL = "claude-sonnet-5"

# 헤더에 붙일 발행 주체 문구 (첨부 이미지의 "1213호 / …제공" 자리)
HEADER_CREDIT = ""       # 예: "대우세계경영연구회 제공". 비우면 생략.

# 카톡 전송 사이 대기(초) — 너무 빠르면 도배로 오인/누락
SEND_DELAY = 2.0
