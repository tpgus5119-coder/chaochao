#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기계로 못 가른 116개를 **손으로** 마무리한다 → senior_pool.json 을 고쳐 쓴다.

왜 손인가 (2026-08-30): 시험지 칸이 어긋나 '뜻' 자리에 베트남어가 들어온 것이
남았다(who=ai 처럼 앞뒤가 뒤집힌 것도 있다). 규칙을 더 얹으면 멀쩡한 낱말까지
같이 떨어진다. 116개면 눈으로 다 읽을 수 있는 양이다 — 그래서 읽고 적었다.
쓰기: python3 tools/senior_hand.py
"""
import collections, json, pathlib, re, unicodedata as U

R = pathlib.Path(__file__).resolve().parent.parent

# 낱말 → 한글 뜻 (살릴 것)
KEEP = {
 "khoẻ":"건강하다", "mọi người":"모두, 사람들", "củ hành tây":"양파", "hiền":"착하다",
 "sẽ":"~할 것이다", "Tường":"벽", "tennis":"테니스장", "núi":"산", "tối qua":"어젯밤",
 "hải":"바다", "chơi":"놀다", "làm việc":"일하다", "viết":"쓰다", "chiều nay":"오늘 오후",
 "rút":"뽑다, 인출하다", "cắt":"자르다", "nước ép":"주스", "thuốc lá":"담배",
 "ký túc xá":"기숙사", "cuối":"마지막", "bến xe (buýt)":"버스 정류장",
 "(Viện) bảo tàng":"박물관", "Có tiếng":"유명하다", "(màu) xanh lá cây":"초록색",
 "(màu) xanh da trời":"파란색", "(màu) da trời":"하늘색", "thành viên":"구성원",
 "cầu tre":"대나무 다리", "đối diện(với)":"맞은편", "tàu thuỷ":"배, 선박",
 "ở kia":"저기", "thay đổi":"바꾸다", "liên hoan":"모임, 회식",
 "Thứ hai":"월요일", "Thứ ba":"화요일", "Thứ tư":"수요일", "Thứ năm":"목요일",
 "Thứ bảy":"토요일", "Thư viện Quốc gia":"국립도서관", "hẹn hò":"데이트하다",
 "kết thúc / xong":"끝나다", "đói bụng":"배고프다", "Tây":"서쪽", "Bắc":"북쪽",
 "Trải":"펴다, 깔다", "dùng được":"쓸 수 있다", "size nhỏ":"작은 치수",
 "size vừa":"보통 치수", "size lớn":"큰 치수", "phía":"쪽, 방향",
 "nói rõ":"분명히 말하다", "chương trình học":"교육 과정", "quán nhậu":"술집",
 "sống":"살다", "dong dỏng/cao gầy":"호리호리하다", "gà mái":"암탉",
 "Tư lạng":"냉장고", "aó sơ":"와이셔츠", "mời / xin":"청하다, 권하다",
 "Hè này":"올여름", "Năm sau":"내년", "good / well/ or":"좋다 / 잘 / 또는",
 "A Lô ạ":"여보세요", "nâng cốc":"건배하다", "đạo":"따르다, 종교",
 "ấn":"누르다", "dê":"염소", "bàn":"책상, 탁자",
}
# 베트남어가 아닌 글자와 끝소리 — **모양으로** 가른다.
#   f·j·w·z 는 베트남어에 없다. 끝소리는 c·ch·m·n·ng·nh·p·t 와 모음뿐이다.
#   이 잣대여야 nghe·mua·cao·xem 같은 **성조 부호 없는 진짜 베트남어**를 안 버린다.
#   (한때 '알파벳만 있으면 영어'로 쳐서 295개를 통째로 버릴 뻔했다.)
NOTVI = re.compile(r"[fjwzFJWZ]")
CODA_OK = re.compile(r"(?:[aeiouyàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]"
                     r"|ch|ng|nh|[cmnpt])$", re.I)

# 베트남어가 빌려 쓰는 말 — 모양은 베트남어가 아니지만 진짜 쓰는 낱말이다
LOAN = {"web", "inox", "email", "video", "internet", "wifi", "taxi", "logo", "menu",
        "shop", "sales", "marketing", "container", "pallet", "sample", "size"}

def not_viet(v):
    for tok in v.split():
        if tok.lower().strip(".,;:!?()") in LOAN: continue
        t = tok.strip(".,;:!?()'\"")
        if not t: continue
        if NOTVI.search(t): return True
        if not CODA_OK.search(t): return True
    return False

def junk(vi, ko):
    """칸이 어긋나 붙어 버린 것·오타·영어 찌꺼기를 가려낸다 (2026-08-30).
       기계로 예문을 만들어 보니 **문장이 안 만들어지는 것들**이 있었다.
       들여다보니 낱말이 아니었다 — 'viện nhóm ô'(기관/무리/우산)처럼 세 낱말이 붙은 것,
       '(I'm' 처럼 괄호가 깨진 것, 'Menerapkan'(인도네시아어) 같은 것들이다."""
    v = vi.strip()
    if v.count("(") != v.count(")"): return "괄호 깨짐"
    if re.match(r"^[A-Za-z][A-Za-z .,'\-]*$", v) and not_viet(v): return "베트남어 아님"
    # 뜻이 '기관 / 무리 / 우산' 처럼 두 번 넘게 갈라져 있으면 칸이 붙은 것이다
    if ko.count("/") >= 2 and len(v.split()) >= 2: return "칸이 붙음"
    if len(v.split()) >= 3 and ko.count("/") >= 1: return "칸이 붙음"
    if re.search(r"[a-z][A-ZĐ]", v): return "붙어 버림"          # mởcửa
    return None


def head(vi):
    """낱말 하나로 다듬는다 — 시험지에는 '보기'가 여럿 적힌 칸이 많다.
       'bố / ba' → bố · 'bến xe (buýt)' → bến xe · 'anh/chị/em họ' → anh họ.
       예문을 만들 때도, 소리를 만들 때도 **낱말 하나**여야 한다."""
    v = U.normalize("NFC", str(vi)).strip()
    v = re.sub(r"\s*\([^)]*\)\s*", " ", v)          # 괄호 안은 곁들이 설명이다
    if "/" in v:
        parts = [x.strip() for x in v.split("/") if x.strip()]
        if parts:
            # 'anh/chị/em họ' 처럼 뒤에 공통 꼬리가 붙는 꼴을 살린다
            tail = parts[-1].split()
            v = parts[0] + (" " + " ".join(tail[1:]) if len(tail) > 1 and len(parts[0].split()) == 1 else "")
    return re.sub(r"\s+", " ", v).strip(" ,.;:")


def bare(v):
    """성조·모자·괄호·대소문자를 다 벗긴 뼈대. 겹침을 찾을 때만 쓴다."""
    s = U.normalize("NFD", v.lower())
    s = "".join(c for c in s if not U.combining(c)).replace("đ", "d")
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"[^a-z ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def dedupe(ws):
    """뼈대도 같고 **뜻도 같은** 것만 하나로 합친다.
       성조가 다르면 다른 낱말이다(bạn 친구 · bán 팔다 · bận 바쁘다) — 절대 안 합친다."""
    g = collections.defaultdict(list)
    for w in ws:
        # **뜻이 비어 있으면 절대 합치지 않는다** — ấn(누르다)과 ăn(먹다)이 합쳐졌었다.
        # 뼈대가 같아도 뜻이 없으면 같은 낱말이라는 근거가 없다 (2026-08-30).
        key = (bare(w["vi"]), w["ko"]) if w.get("ko") else ("\0" + w["vi"], "")
        g[key].append(w)
    out, gone = [], 0
    for _, arr in g.items():
        if len(arr) == 1: out.append(arr[0]); continue
        # 남길 것: 기수에 더 많이 나온 것 → 괄호 없는 것 → 소문자로 시작하는 것
        arr.sort(key=lambda w: (-w["n"], "(" in w["vi"], w["vi"][:1].isupper(), len(w["vi"])))
        keep = dict(arr[0])
        keep["gi"] = "".join(sorted({c for w in arr for c in re.findall(r"\d\d", w["gi"])}))
        keep["n"] = len(re.findall(r"\d\d", keep["gi"]))
        out.append(keep); gone += len(arr) - 1
    return out, gone


def main():
    p = R / "data" / "senior_pool.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    kept = dropped = 0
    out = []
    for w in d["words"]:
        if w.get("ko"): out.append(w); continue
        ko = KEEP.get(w["vi"])
        if not ko: dropped += 1; continue          # 남은 것은 문장 토막이다 — 버린다
        w = dict(w); w["ko"] = ko; w.pop("en", None)
        out.append(w); kept += 1
    for w in out:                       # 낱말 하나로 다듬기
        h = head(w["vi"])
        if h and h != w["vi"]: w["vi"] = h
    # ── 칸이 붙은 줄은 **버리지 말고 쪼갠다** (2026-08-30).
    #    'xe tải mặt trăng | 트럭 / 달' 은 xe tải(트럭) 과 mặt trăng(달) 두 낱말이
    #    한 줄에 붙어 버린 것이다. 쪼개면 둘 다 살아난다.
    #    쪼갤 수 있는지는 **쪼갠 조각이 다른 줄에도 낱말로 있는가**로 판단한다.
    known = {bare(w["vi"]) for w in out}
    split_add, split_n = [], 0
    for w in list(out):
        if junk(w["vi"], w["ko"]) != "칸이 붙음": continue
        parts = [x.strip() for x in w["ko"].split("/") if x.strip()]
        toks = w["vi"].split()
        if len(parts) < 2 or len(toks) < len(parts): continue
        # 앞에서부터 조각을 붙여 가며 '아는 낱말'이 되는 자리에서 끊는다
        cut, i, ok = [], 0, True
        for pi, part in enumerate(parts):
            last = pi == len(parts) - 1
            found = None
            for j in range(len(toks), i, -1) if last else range(i + 1, len(toks) + 1):
                cand = " ".join(toks[i:j])
                if bare(cand) in known: found = (cand, j); break
            if not found: ok = False; break
            cut.append((found[0], part)); i = found[1]
        if ok and i == len(toks) and len(cut) == len(parts):
            for vi2, ko2 in cut:
                split_add.append({**w, "vi": vi2, "ko": ko2, "split": 1})
            out.remove(w); split_n += 1
    out += split_add

    junked = collections.Counter()
    keep = []
    for w in out:
        why = junk(w["vi"], w["ko"])
        if why: junked[why] += 1
        else: keep.append(w)
    out = keep
    out, gone = dedupe(out)
    out.sort(key=lambda w: (w.get("pos") is None, w.get("pos") or 0, -w["n"]))
    d["words"] = out
    d["note"] = ("네 기수(17·18·19·20) 단어시험. 겹침을 지웠다(뼈대와 뜻이 둘 다 같을 때만). "
                 "pos = 배운 차례 0~1. gi = 나온 기수.")
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"손으로 뜻 채운 것 {kept} · 토막이라 버린 것 {dropped} · 겹쳐서 합친 것 {gone} · 남은 낱말 {len(out)}")
    if junked: print("  낱말이 아니라 버린 것:", dict(junked))
    print(f"  칸이 붙은 줄을 쪼개 살린 것: {split_n}줄 → {len(split_add)}낱말")


if __name__ == "__main__":
    main()
