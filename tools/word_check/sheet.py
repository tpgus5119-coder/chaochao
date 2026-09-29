#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""낱말 하나씩 검사판 (2026-09-29, 대표님: "단어 하나 뜻(순서도)과 발음과 헷갈리는 짝 작업 — 모두 단어 하나 완료하고 검사하고. 챕터 단위로 검사하지 말고").
낱말마다 한 덩어리: 앱에 나오는 곳과 뜻 · 뜻 목록(차례) · 참고 사전 뜻 · 영어 위키 뜻 차례(판정용, 화면에 안 씀) · 발음(자료 값 ↔ vi_kr) ·
헷갈리는 짝(성조 가족·모양 가족·유의어·반의어·뜻 번호) · 녹음 받아쓰기(data/_asr_word.jsonl).
사용: python3 tools/word_check/sheet.py <시작 순번> <개수>   (차례는 tools/word_check/_main_words.json)"""
import json, pathlib, re, sys, unicodedata
R = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(R / "tools"))
from vi_kr import word as vk
J = lambda p: json.loads((R / p).read_text(encoding="utf-8"))

def occ_index():
    occ = {}
    g = J("data/gybm.json")
    for s in g["sources"]:
        for li, l in enumerate(s["lessons"]):
            for w in l["words"]:
                occ.setdefault(w["vi"].lower(), []).append((f"{s['label']} {li+1}·{l['title'][:18]}", w.get("ko", ""), w.get("kr_read", ""), (w.get("ex") or {}).get("vi", "")))
    def walk(o, lab):
        if isinstance(o, dict):
            if isinstance(o.get("vi"), str) and "ko" in o and len(o["vi"]) < 40:
                occ.setdefault(o["vi"].lower(), []).append((lab, o.get("ko", ""), o.get("kr_read", o.get("kr", "")), (o.get("ex") or {}).get("vi", "") if isinstance(o.get("ex"), dict) else ""))
            for k, v in o.items():
                walk(v, lab if k not in ("title", "theme") else lab)
        elif isinstance(o, list):
            for v in o: walk(v, lab)
    for f, lab in (("data/order.json", "일상·직무"), ("data/days.json", "기초·days")):
        walk(J(f), lab)
    return occ

def strip_tone(s):
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn" or c in "̛̂̆"))

def main():
    start, n = int(sys.argv[1]), int(sys.argv[2])
    words = J("tools/word_check/_main_words.json")[start - 1:start - 1 + n]
    occ = occ_index()
    SIB = J("data/sib.json"); W = SIB["w"]
    SEN = J("data/_senses.json"); DK = J("data/_dict_ko.json"); GL = J("data/_dict_gloss.json")
    asr = {}
    p = R / "data/_asr_word.jsonl"
    if p.exists():
        for ln in p.read_text(encoding="utf-8").splitlines():
            try: r = json.loads(ln); asr[r["k"]] = r
            except Exception: pass
    for i, w in enumerate(words, start):
        lw = w.lower()
        print(f"\n## {i}. {w}")
        seen = set()
        for lab, ko, kr, ex in occ.get(lw, []):
            key = (lab.split(' ')[0], ko, kr)
            if key in seen: continue
            seen.add(key)
            print(f"   곳 {lab[:30]:<30} 뜻 {ko[:40]:<40} 발음 {kr}")
        if SEN.get(lw): print("   뜻목록 " + " | ".join(f"{j+1}) {s}" for j, s in enumerate(SEN[lw])))
        print(f"   짝사전 k {W.get(lw, {}).get('k', '-')} · 참고사전 {str(DK.get(lw, '-'))[:70]}")
        gl = GL.get(lw) or {}
        if gl.get("defs"): print("   위키(영) " + " / ".join(d[:50] for d in gl["defs"][:5]))
        print(f"   vi_kr 북 {vk(w)} · 남 {vk(w, south=True)}")
        g = W.get(lw, {})
        m = g.get("m") or {}
        rel = lambda xs: ", ".join(f"{x}{'@'+str(m[x]) if x in m else ''}" for x in xs)
        if g.get("s") or g.get("a"): print(f"   유의 {rel(g.get('s', []))}  반의 {rel(g.get('a', []))}")
        fam = []
        for syl in lw.split():
            t = SIB["t"].get(strip_tone(syl).replace("̂", "").replace("̆", "").replace("̛", ""))
            fam.append(f"{syl}:{len(t) if t else 0}")
        print(f"   성조가족 {' '.join(fam)}")
        a = asr.get(w) or asr.get(lw)
        if a: print(f"   녹음 여 [{a.get('f')}] {a.get('f_r')} · 남 [{a.get('m')}] {a.get('m_r')} {'통과' if a.get('pass') else '확인 필요'}")
        else: print("   녹음 받아쓰기 아직")
if __name__ == "__main__":
    main()
