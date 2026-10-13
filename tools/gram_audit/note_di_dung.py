#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""21.0 đi(문장 끝) · 22.0 đừng 카드에 교재 1권 8과 문법 상자의 정의를 한 줄 더 (2026-10-13 밤, 대표님 "문장 끝 đi 는 request 뜻이라는데 넣었니? đừng 도 있니?").
교재 8과: "Đi: câu cầu khiến — 상대에게 어떤 일을 하라고 요청" · "Đừng: 상대에게 어떤 일을 하지 말라고 요청". 둘 다 이미 카드(21.0·22.0·구별 22.1)와 8과 지도(BOX 1-8)에 있었다.
쓰기: python3 tools/gram_audit/note_di_dung.py"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent.parent
G = json.load(open(R / 'data/grammar.json', encoding='utf-8')); b = G['books'][0]['bai']
g = b[20]['g'][0]; assert g['t'].startswith('đi')
if '교재 1권 8과' not in g['b']:
    g['b'] = ('<b>문장 끝의 đi</b>는 상대에게 <b>어떤 일을 하라고 요청·권유</b>하는 청유문의 끝말입니다(교재 1권 8과 문법 상자: trợ từ cuối câu đi — "Anh xem giùm tôi đi."). '
              '한국어의 \'~해요·~하세요·~해라\'처럼 부드럽게 재촉합니다. 동사(구) 뒤, 문장 맨 끝에 붙입니다. 동사 \'가다\'의 đi 와는 다릅니다(Chúng ta đi đi! — 앞은 가다, 뒤는 요청).')
g = b[21]['g'][0]; assert g['t'].startswith('đừng')
if '교재 1권 8과' not in g['b']:
    g['b'] = ('<b>đừng + 동사</b>는 상대에게 <b>어떤 일을 하지 말라고 요청</b>하는 말입니다(교재 1권 8과 문법 상자: phụ từ đừng — "Đừng lo."). '
              '한국어와 달리 동사 바로 앞에 đừng 만 붙이면 됩니다. 아주 강한 금지(규칙·표지판)는 không được · cấm 을 쓰고, 일터에선 đừng 이 무난합니다. 끝에 nhé 를 붙이면 부드러워집니다.')
json.dump(G, open(R / 'data/grammar.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('21.0 · 22.0 본문 고침')
