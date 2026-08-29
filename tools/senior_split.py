#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""선배 낱말을 **일상 / 직무** 로 가른다 → data/_senior_split.json

두 잣대를 같이 쓴다 (2026-08-30)
  ① **뜻**: 일터에서만 쓰는 말인가 (생산·품질·거래·사무·봉제…)
  ② **배운 때(pos)**: 뒤로 갈수록 일터 말이 는다 — 다만 그것만으로는 못 가른다.
     뒤쪽에도 미식가·육아법 같은 생활 말이 섞여 있다. 그래서 **뜻으로만** 가르고,
     pos 는 목차 차례에만 쓴다.
쓰기: python3 tools/senior_split.py
"""
import json, pathlib, re, collections

R = pathlib.Path(__file__).resolve().parent.parent

JOB = {
 "생산·현장": r"생산|공장|현장|라인$|작업|기계|설비|공정|가동|정지|조립|가공|수리|정비|점검|부품|자재|원단|원료|재료|금형|불량|양품|수율|검사|검수|규격|치수|샘플|시제품|포장|출고|입고|재고|창고|지게차|컨베이어|교대|주야|야근|잔업|특근|가동률|생산량|납기|공정도|불량률",
 "봉제·섬유": r"봉제|재봉|미싱|박음|시접|원단|옷감|재단|패턴|단추|지퍼|실밥|다림|다리미|염색|방직|직물|자수|주머니|소매|깃$|밑단|바느질|누비|시침|오바|아오자이",
 "품질·안전": r"품질|안전|사고|위험|보호구|안전모|장갑|마스크|소화|대피|비상|응급|재해|점검표|규정|수칙|위생|청결|정리정돈",
 "사무·서류": r"서류|문서|보고서|결재|승인|서명|도장|양식|기록|장부|명세|견적|계약|송장|영수|증빙|파일|복사|인쇄|스캔|이메일|메일|팩스|엑셀|프린터|용지|출력",
 "사람·조직": r"팀장|반장|조장|과장|부장|사장|대표|상사|부하|동료|직원|사원|인사|채용|면접|이력서|근태|출근|퇴근|지각|결근|휴가|연차|월차|급여|월급|임금|보너스|수당|승진|퇴직|해고|노조|교육훈련|사규|부서|소속|근무|재직|경력|근로|고용|모집|지원자|자격증|명함|출장|회의|보고|결재|업무|직책|직무|근속|본사|지사|지점|공무원|간부",
 "거래·돈": r"거래|주문서|발주|납품|수출|수입$|매출|매입|원가|단가|견적|정산|송금|결제|입금|출금|세금|부가세|관세|통관|선적|운송|물류|바이어|공급|업체|하청|외주|도매|소매|영업|판매|고객|계약|투자|이익|손실|예산|회계|장부|은행 업무|사업|창업|경영|기업|회사|시장 조사|광고|홍보|브랜드",
}
LIFE_HINT = r"먹|마시|자다|놀|사랑|친구|가족|여행|날씨|과일|동물|음식|옷$|집$"

def main():
    p = R / "data" / "senior_pool.json"
    if not p.exists(): p = R / "data" / "_senior_pool3.json"
    ws = json.loads(p.read_text(encoding="utf-8"))["words"]
    pats = {k: re.compile(v) for k, v in JOB.items()}
    life = re.compile(LIFE_HINT)
    cnt, out = collections.Counter(), []
    for w in ws:
        ko = w.get("ko", "")
        hit = next((k for k, r in pats.items() if r.search(ko)), None)
        w2 = dict(w); w2["field"] = hit or "일상"
        cnt[w2["field"]] += 1
        out.append(w2)
    (R / "data" / "_senior_split.json").write_text(
        json.dumps({"words": out}, ensure_ascii=False, indent=1), encoding="utf-8")
    job = sum(v for k, v in cnt.items() if k != "일상")
    print(f"전체 {len(out)}개 → 일상 {cnt['일상']}개 · 직무 {job}개")
    for k, v in cnt.most_common():
        if k != "일상": print(f"    {v:>5}  {k}")
main()
