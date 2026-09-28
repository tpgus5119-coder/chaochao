#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""한자 뿌리·외래어 뿌리 판정 재료 만들기 (규칙만, AI 없음) — 위키낱말사전 원문(data/_etym_raw.json 영어판, data/_etym_raw_vi.json 베트남어판)에
적힌 틀(template)만 읽는다. 지어내지 않는다: 틀에 한자·차용 언어가 적혀 있지 않으면 비워 둔다.
어원이 여럿(Etymology 1, 2 …)이면 절마다 뜻풀이를 함께 남겨 클로드가 앱 뜻과 맞는 절을 고른다.
쓰기: python3 tools/build_roots.py  → scratch 판정표(stdout 요약) · data/_roots_cand.json"""
import json, pathlib, re, sys
R = pathlib.Path(__file__).resolve().parent.parent
CJK = re.compile(r'[㐀-鿿\U00020000-\U0002ffff]')
SINO_LANG = {'zh', 'ltc', 'och', 'lzh', 'lzh-lit', 'cmn', 'yue', 'nan', 'nan-hbl', 'nan-tws', 'hak', 'wuu', 'zh-lit', 'sit'}
NATIVE_LANG = {'mkh-vie-pro', 'mkh-pro', 'aav-pro', 'mkh-mvi', 'aav', 'tai', 'mkh', 'vi-mid'}
LANG_KO = {'fr': '프랑스어', 'en': '영어', 'ja': '일본어', 'ru': '러시아어', 'de': '독일어', 'nl': '네덜란드어', 'dum': '네덜란드어', 'pt': '포르투갈어', 'es': '스페인어',
           'it': '이탈리아어', 'la': '라틴어', 'km': '크메르어', 'th': '태국어', 'lo': '라오어', 'ms': '말레이어', 'id': '인도네시아어', 'sa': '산스크리트어',
           'pi': '팔리어', 'ar': '아랍어', 'ko': '한국어', 'yue': '광둥어', 'nan': '민난어', 'nan-hbl': '민난어', 'nan-tws': '민난어', 'cmn': '중국어(표준어)',
           'hak': '객가어', 'grc': '고대 그리스어', 'he': '히브리어', 'mn': '몽골어', 'cjm': '짬어', 'tr': '튀르키예어', 'fa': '페르시아어', 'hi': '힌디어'}
HEDGE = re.compile(r'\b(possibly|perhaps|probably|uncertain|unclear|maybe|may be|doubtful|disputed|unknown|folk etymology|speculative|obscure)\b', re.I)
BOR = r'(?:bor\+?|lbor|obor|ubor|slbor|der\+?|psm|translit|bor-lite)'

def blocks(raw):
    """(머리, 어원 글, 뜻풀이들) 목록. 어원 머리가 없으면 통째로 한 절."""
    heads = list(re.finditer(r'^===\s*Etymology(?:\s*(\d+))?\s*===\s*$', raw, re.M))
    if not heads:
        return [('', '', [d for d in re.findall(r'^# (.+)$', raw, re.M)])]
    out = []
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(raw)
        body = raw[h.end():end]
        m = re.search(r'^===+\s*[A-Z][a-z ]+\s*===+\s*$', body, re.M)
        ety = body[:m.start()] if m else body
        defs = re.findall(r'^# (.+)$', body, re.M)
        if len(heads) == 1:        # 어원이 하나면 그 뒤 모든 품사 절의 뜻풀이가 이 어원 것
            defs = re.findall(r'^# (.+)$', raw[h.end():], re.M)
        out.append((h.group(0).strip('= '), ety.strip(), defs))
    return out

def clean_def(d):
    d = re.sub(r'\{\{lb\|vi\|([^}]*)\}\}', lambda m: '(' + m.group(1).replace('|', ', ') + ')', d)
    d = re.sub(r'\{\{(?:l|m|w)\|[a-z\-]+\|([^|}]+)[^}]*\}\}', r'\1', d)
    d = re.sub(r'\{\{[^{}]*\}\}', '', d); d = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', d)
    return re.sub(r"''+", '', d).strip()[:70]

def templates(text, name):
    """이름이 name 인 틀을 중첩 괄호까지 맞춰 꺼내 윗단계 '|' 로 나눈 인자 목록들을 돌려준다"""
    out = []
    for m in re.finditer(r'\{\{' + re.escape(name) + r'\|', text):
        i, depth, start = m.end(), 1, m.end()
        while i < len(text) and depth:
            if text.startswith('{{', i): depth += 1; i += 2; continue
            if text.startswith('}}', i): depth -= 1; i += 2; continue
            i += 1
        body = text[start:i - 2]
        args, d, cur = [], 0, ''
        j = 0
        while j < len(body):
            if body.startswith('{{', j): d += 1; cur += '{{'; j += 2; continue
            if body.startswith('}}', j): d -= 1; cur += '}}'; j += 2; continue
            if body[j] == '|' and d == 0: args.append(cur); cur = ''; j += 1; continue
            cur += body[j]; j += 1
        args.append(cur)
        out.append(args)
    return out

def sino(ety):
    """(한자, 출처, 옛한자어?, 표준 한자음) — vi-etym-sino 틀: 글자·뜻 짝, hv=n(한자음과 소리가 다름)·preMC=y(중고한어 이전 옛 차용)·표준 한자음"""
    ts = templates(ety, 'vi-etym-sino')
    if ts:
        ps = ts[0]
        pos = [p for p in ps if '=' not in p]
        kv = dict(p.split('=', 1) for p in ps if '=' in p)
        han = ''.join(p for p in pos if CJK.search(p) and len(p) <= 4 and not re.search(r'[A-Za-z]', p))
        if han:
            sv = None
            if len(han) == 1:
                cand = [p for p in pos[2:] if p and not CJK.search(p) and re.fullmatch(r"[a-zà-ỹđ ]+", p.strip().lower())]
                sv = cand[0].strip() if cand else (kv.get('3') or None)
            old = kv.get('hv') == 'n' or kv.get('preMC') == 'y'
            return han, 'vi-etym-sino', old, sv
    m = re.search(r'Sino-Vietnamese (?:word |reading )?(?:from|of) (?:\{\{[^|}]*\|[a-z-]+\|)?\[?\[?([\u3400-\u9fff]+)', ety)
    if m: return m.group(1), 'sino-text', False, None
    m = re.search(r'\{\{(?:der|bor)\+?\|vi\|(?:zh|ltc|lzh|lzh-lit|och)\|([\u3400-\u9fff]+)', ety)
    if m: return m.group(1), 'der-zh', True, None
    m = re.search(r'\[\[Chinese\]\]\s*\[\[([\u3400-\u9fff]+)\]\]', ety)
    if m: return m.group(1), 'chinese-link', True, None
    return None, None, False, None

def loan(ety):
    # etymon/ety 꼴: {{etymon|vi|...|:bor|fr:beurre}} , {{ety|vi|:bor|fr:auto}}
    m = re.search(r'\{\{(?:etymon|ety)\|vi\|[^}]*?:(?:bor|der|psm)\|([a-z\-]+):([^|}<]+)', ety)
    if m and m.group(1) not in SINO_LANG | NATIVE_LANG: return m.group(1), m.group(2).strip(), 'etymon'
    for m in re.finditer(r'\{\{(' + BOR + r')\|vi\|([a-z\-]+)\|([^|}]*)', ety):
        kind, lg, w = m.group(1), m.group(2), m.group(3).strip()
        if lg in NATIVE_LANG or lg.endswith('-pro') or w.startswith('*'): return None
        if lg in SINO_LANG and lg not in ('yue', 'nan', 'nan-hbl', 'nan-tws', 'cmn', 'hak'): return None
        return lg, w, kind
    return None

def native(ety):
    return bool(re.search(r'\{\{inh\+?\|vi\|(?:' + '|'.join(map(re.escape, NATIVE_LANG)) + r')\|', ety))

def compound_part(ety):
    """'From {{m|vi|xe}} + {{der|vi|fr|bus}}' 처럼 낱말 일부만 외래어인 경우"""
    return bool(re.search(r'\+\s*\{\{(?:' + BOR + r')\|vi\|', ety) or re.search(r'\{\{(?:' + BOR + r')\|vi\|[^}]*\}\}\s*\+', ety))

def vi_sino(raw):
    m = re.search(r'\{\{vi-etym-sino\|([^}]*)\}\}', raw)
    if m:
        han = ''.join(p for p in m.group(1).split('|') if CJK.search(p) and len(p) <= 4 and '=' not in p)
        if han: return han
    m = re.search(r'(?:Phiên âm Hán[- ]Việt|Hán[- ]Việt) (?:của|từ) \[?\[?([㐀-鿿]+)', raw)
    if m: return m.group(1)
    return None

def main():
    EN = json.loads((R / 'data/_etym_raw.json').read_text(encoding='utf-8'))
    VI = json.loads((R / 'data/_etym_raw_vi.json').read_text(encoding='utf-8')) if (R / 'data/_etym_raw_vi.json').exists() else {}
    out = {}
    for k, v in EN.items():
        raw = v.get('raw') or ''
        bl = []
        for head, ety, defs in (blocks(raw) if raw else []):
            h, hsrc, hold, hsv = sino(ety)
            ln = loan(ety)
            unsure = bool(HEDGE.search(ety))
            hpart = bool(h) and bool(re.search(r'(\{\{m\|vi\|[^}]*\}\}\s*\+|\+\s*\{\{der\|vi\|zh|the (?:first|second) (?:syllable|element))', ety))
            bl.append({'head': head, 'han': h, 'hsrc': hsrc, 'old': hold, 'sv': hsv, 'hpart': hpart, 'loan': ln, 'part': compound_part(ety) if ln else False, 'unsure': unsure,
                       'native': native(ety), 'defs': [clean_def(d) for d in defs[:4]], 'ety': re.sub(r'\s+', ' ', ety)[:260]})
        vr = (VI.get(k) or {}).get('raw') or ''
        out[k] = {'blocks': bl, 'vi_han': vi_sino(vr) if vr else None}
    (R / 'data/_roots_cand.json').write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    n_s = sum(1 for v in out.values() if any(b['han'] for b in v['blocks']) or v['vi_han'])
    n_l = sum(1 for v in out.values() if any(b['loan'] for b in v['blocks']))
    n_m = sum(1 for v in out.values() if len(v['blocks']) > 1)
    print(f'낱말 {len(out)} · 한자 근거 있음 {n_s} · 외래어 근거 있음 {n_l} · 어원 여럿 {n_m}')

if __name__ == '__main__':
    main()
