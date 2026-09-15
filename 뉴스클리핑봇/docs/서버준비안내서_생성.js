const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
p.author = "뉴스클리핑봇";

// ---- palette ----
const NAVY = "21295C";      // 딥 미드나잇
const BLUE = "065A82";      // 딥 블루 (dominant)
const TEAL = "1C7293";      // 틸
const ICE  = "CADCFC";      // 아이스
const BG   = "F4F7FA";      // 라이트 배경
const INK  = "1B2430";      // 본문 먹색
const MUTE = "5B6B7C";      // 캡션
const WHITE = "FFFFFF";
const GOLD = "E4B363";      // 포인트(실무자 주의)

const HEAD = "맑은 고딕";
const BODY = "맑은 고딕";

const MX = 0.7;             // 좌우 여백
const CW = 13.3 - MX * 2;   // 콘텐츠 폭

function bg(slide, color) { slide.background = { color }; }

function titleBar(slide, kicker, title, dark) {
  const c1 = dark ? ICE : TEAL;
  const c2 = dark ? WHITE : NAVY;
  if (kicker) slide.addText(kicker.toUpperCase(), {
    isTextBox: true, x: MX, y: 0.42, w: CW, h: 0.32, margin: 0,
    fontFace: BODY, fontSize: 12, bold: true, color: c1, charSpacing: 2,
  });
  slide.addText(title, {
    isTextBox: true, x: MX, y: 0.72, w: CW, h: 0.9, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: c2,
  });
}

function stepBadge(slide, n, x, y) {
  slide.addShape(p.ShapeType.ellipse, { x, y, w: 0.62, h: 0.62, fill: { color: BLUE } });
  slide.addText(String(n), {
    isTextBox: true, x, y, w: 0.62, h: 0.62, margin: 0, align: "center", valign: "middle",
    fontFace: HEAD, fontSize: 24, bold: true, color: WHITE,
  });
}

function who(slide, label, x, y) {
  const isStaff = label.indexOf("실무자") >= 0;
  const col = isStaff ? GOLD : TEAL;
  slide.addShape(p.ShapeType.roundRect, { x, y, w: 1.9, h: 0.42, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: col, width: 1.25 } });
  slide.addText(label, { isTextBox: true, x, y, w: 1.9, h: 0.42, margin: 0, align: "center",
    valign: "middle", fontFace: BODY, fontSize: 11.5, bold: true, color: isStaff ? "9A6B1E" : BLUE });
}

function bullets(slide, items, x, y, w, opts = {}) {
  slide.addText(
    items.map((t, i) => ({
      text: t.t !== undefined ? t.t : t,
      options: {
        bullet: { code: "2022" }, breakLine: true,
        paraSpaceAfter: opts.gap || 10, fontSize: opts.fs || 14.5,
        bold: !!(t.b), color: t.c || INK, fontFace: BODY,
        indentLevel: t.lvl || 0,
      },
    })),
    { isTextBox: true, x, y, w, h: opts.h || 4.5, margin: 0, valign: "top" }
  );
}

function footer(slide, n) {
  slide.addText("뉴스클리핑봇 · 서버 준비 안내서", { isTextBox: true, x: MX, y: 7.05, w: 8, h: 0.3,
    margin: 0, fontFace: BODY, fontSize: 9, color: MUTE });
  slide.addText(String(n), { isTextBox: true, x: 13.3 - MX - 0.5, y: 7.05, w: 0.5, h: 0.3,
    margin: 0, align: "right", fontFace: BODY, fontSize: 9, color: MUTE });
}

/* ---------------- 1. 표지 ---------------- */
let s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 10.3, y: -1.6, w: 4.6, h: 4.6, fill: { color: BLUE } });
s.addShape(p.ShapeType.ellipse, { x: 12.0, y: 4.7, w: 3.4, h: 3.4, fill: { color: TEAL } });
s.addText("설치 준비 안내서", { isTextBox: true, x: MX, y: 2.0, w: 10, h: 0.4, margin: 0,
  fontFace: BODY, fontSize: 14, bold: true, color: ICE, charSpacing: 3 });
s.addText("뉴스클리핑봇\n클라우드 서버 준비하기", { isTextBox: true, x: MX, y: 2.5, w: 10.5, h: 1.9,
  margin: 0, fontFace: HEAD, fontSize: 40, bold: true, color: WHITE, lineSpacingMultiple: 1.05 });
s.addText("가비아(gabia) g클라우드에서 윈도우 서버 한 대를 신청하고,\n접속 정보를 개발자에게 전달하기까지의 과정", {
  isTextBox: true, x: MX, y: 4.55, w: 10.5, h: 1.0, margin: 0,
  fontFace: BODY, fontSize: 15, color: ICE, lineSpacingMultiple: 1.2 });
s.addText("작성: 개발 담당  ·  대상: 운영 실무자", { isTextBox: true, x: MX, y: 6.5, w: 10, h: 0.4,
  margin: 0, fontFace: BODY, fontSize: 11, color: MUTE });

/* ---------------- 2. 이게 뭔가 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "왜 서버가 필요한가", "매일 저녁 8시, 서버가 알아서 기사를 보냅니다");
s.addText("베트남·중국·인도네시아 경제 기사를 자동으로 모아 3개 카카오톡 오픈채팅방에 전송하는 프로그램입니다. 사람이 매일 켜 줄 수 없으므로, 24시간 켜져 있는 클라우드 컴퓨터(서버) 한 대가 필요합니다.", {
  isTextBox: true, x: MX, y: 1.75, w: CW, h: 1.0, margin: 0, fontFace: BODY, fontSize: 14.5,
  color: INK, lineSpacingMultiple: 1.25 });

const flow = [
  ["기사 수집", "구글 뉴스에서\n당일 한글 기사"],
  ["기사 선별", "AI가 기준대로\n3~5개 선택"],
  ["메시지 작성", "링크 목록으로\n정리"],
  ["카톡 전송", "오픈채팅방\n3곳에 발송"],
];
let fx = MX;
const fw = 2.75, fgap = (CW - fw * 4) / 3;
flow.forEach((f, i) => {
  s.addShape(p.ShapeType.roundRect, { x: fx, y: 3.2, w: fw, h: 1.9, rectRadius: 0.1,
    fill: { color: WHITE }, line: { color: ICE, width: 1 } });
  s.addText(f[0], { isTextBox: true, x: fx, y: 3.4, w: fw, h: 0.5, margin: 0, align: "center",
    fontFace: HEAD, fontSize: 15, bold: true, color: BLUE });
  s.addText(f[1], { isTextBox: true, x: fx, y: 3.95, w: fw, h: 1.0, margin: 0, align: "center",
    fontFace: BODY, fontSize: 11.5, color: MUTE, lineSpacingMultiple: 1.15 });
  if (i < 3) s.addText("→", { isTextBox: true, x: fx + fw, y: 3.2, w: fgap, h: 1.9, margin: 0,
    align: "center", valign: "middle", fontFace: HEAD, fontSize: 20, bold: true, color: TEAL });
  fx += fw + fgap;
});
s.addText("이 안내서에서 준비하는 것은 위 과정이 돌아갈 「서버」 한 대뿐입니다. 프로그램 설치·설정은 개발자가 합니다.", {
  isTextBox: true, x: MX, y: 5.5, w: CW, h: 0.8, margin: 0, fontFace: BODY, fontSize: 13,
  italic: true, color: TEAL, lineSpacingMultiple: 1.2 });
footer(s, 2);

/* ---------------- 3. 누가 무엇을 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "역할 나누기", "실무자와 개발자가 나눠서 합니다");
const colW = (CW - 0.6) / 2;
// 실무자
s.addShape(p.ShapeType.roundRect, { x: MX, y: 1.8, w: colW, h: 4.9, rectRadius: 0.1,
  fill: { color: WHITE }, line: { color: GOLD, width: 1.5 } });
s.addText("운영 실무자 (이 안내서)", { isTextBox: true, x: MX + 0.35, y: 2.05, w: colW - 0.7, h: 0.5,
  margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: "9A6B1E" });
bullets(s, [
  "가비아 회원가입 / 로그인",
  "g클라우드 윈도우 서버 1대 신청",
  "월정액 요금 결제수단 등록",
  "서버 공인 IP · 관리자 비밀번호 확인",
  "봇 전용 카카오톡 계정 준비",
  "오픈채팅방 3곳에 그 계정 초대",
  "위 정보를 개발자에게 전달",
], MX + 0.35, 2.6, colW - 0.7, { fs: 13, gap: 9, h: 4 });
// 개발자
s.addShape(p.ShapeType.roundRect, { x: MX + colW + 0.6, y: 1.8, w: colW, h: 4.9, rectRadius: 0.1,
  fill: { color: WHITE }, line: { color: TEAL, width: 1.5 } });
s.addText("개발자", { isTextBox: true, x: MX + colW + 0.95, y: 2.05, w: colW - 0.7, h: 0.5,
  margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: BLUE });
bullets(s, [
  "서버 원격 접속",
  "윈도우 기본 설정(자동 로그인 등)",
  "파이썬 · 카카오톡 PC 설치",
  "봇 프로그램 넣고 설정",
  "AI 사용 키 등록",
  "테스트 전송 확인",
  "매일 20시 자동 실행 등록",
], MX + colW + 0.95, 2.6, colW - 0.7, { fs: 13, gap: 9, h: 4 });
footer(s, 3);

/* ---------------- 4. 준비물 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "시작 전 준비물", "이 4가지를 먼저 손에 두세요");
const prep = [
  ["이메일 주소", "가비아 회원가입에 사용. 회사 공용 메일 권장"],
  ["결제수단", "법인/개인 신용카드 또는 계좌이체. 월 3~5만원 정도 청구"],
  ["휴대폰", "카카오톡 로그인 시 인증번호 확인용"],
  ["카카오톡 계정", "봇이 사용할 계정. 개인 카톡과 분리 권장(별도 번호 부계정)"],
];
let py = 1.9;
prep.forEach((r, i) => {
  stepBadge(s, i + 1, MX, py + 0.05);
  s.addText(r[0], { isTextBox: true, x: MX + 0.95, y: py, w: 3.4, h: 0.7, margin: 0, valign: "middle",
    fontFace: HEAD, fontSize: 16, bold: true, color: NAVY });
  s.addText(r[1], { isTextBox: true, x: MX + 4.5, y: py, w: CW - 4.5, h: 0.7, margin: 0, valign: "middle",
    fontFace: BODY, fontSize: 13, color: INK });
  py += 1.15;
});
s.addShape(p.ShapeType.roundRect, { x: MX, y: py + 0.15, w: CW, h: 0.85, rectRadius: 0.08,
  fill: { color: "FBF1DE" }, line: { color: GOLD, width: 1 } });
s.addText("결제수단이 없으면 서버 신청이 끝나지 않습니다. 카드 등록 권한을 미리 확인하세요.", {
  isTextBox: true, x: MX + 0.3, y: py + 0.15, w: CW - 0.6, h: 0.85, margin: 0, valign: "middle",
  fontFace: BODY, fontSize: 12.5, bold: true, color: "9A6B1E" });
footer(s, 4);

/* ---------------- 5. STEP 1 회원가입 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "STEP 1 · 실무자", "가비아 회원가입하고 로그인");
stepBadge(s, 1, MX, 1.75);
bullets(s, [
  { t: "인터넷 주소창에 www.gabia.com 입력", b: true },
  "오른쪽 위 「회원가입」 → 개인 또는 법인 선택",
  "이메일 인증 → 아이디 · 비밀번호 설정",
  { t: "가입 완료 후 「로그인」", b: true },
  { t: "이 가비아 아이디/비밀번호는 나중에 서버가 멈췄을 때 다시 켜는 데 씁니다. 개발자에게도 알려줘야 합니다.", c: TEAL },
], MX + 0.95, 1.8, CW - 1.0, { fs: 14.5, gap: 12 });
footer(s, 5);

/* ---------------- 6. STEP 2 서버 신청 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "STEP 2 · 실무자", "g클라우드에서 윈도우 서버 신청");
s.addText("가비아 로그인 상태에서 상단 메뉴 「클라우드」 → 「g클라우드(클라우드 서버)」 → 「서버 생성 / 신청」. 화면 구성은 바뀔 수 있으니 아래 항목 이름으로 찾아 선택하세요.", {
  isTextBox: true, x: MX, y: 1.7, w: CW, h: 0.9, margin: 0, fontFace: BODY, fontSize: 13.5,
  color: INK, lineSpacingMultiple: 1.2 });
const rows = [
  ["운영체제(OS)", "Windows Server 2022 (64bit, 한국어)"],
  ["CPU / 메모리", "2 vCPU / 4 GB  (가장 낮은 축이면 충분)"],
  ["디스크", "SSD 50 GB"],
  ["공인 IP", "1개 신청 (필수)"],
  ["요금제", "정액제 (월 단위) — 시간제 아님"],
  ["지역", "국내(한국)"],
];
s.addTable(
  rows.map((r, i) => [
    { text: r[0], options: { fontFace: BODY, fontSize: 13, bold: true, color: NAVY,
      fill: { color: i % 2 ? "EEF3F8" : WHITE }, valign: "middle" } },
    { text: r[1], options: { fontFace: BODY, fontSize: 13, color: INK,
      fill: { color: i % 2 ? "EEF3F8" : WHITE }, valign: "middle" } },
  ]),
  { x: MX, y: 2.75, w: CW, colW: [3.0, CW - 3.0], rowH: 0.6,
    border: { type: "solid", color: ICE, pt: 1 } }
);
s.addText("월 요금은 사양·부가서비스에 따라 대략 3~5만원입니다. 정확한 금액은 신청 화면 하단 예상 요금에서 확인하세요.", {
  isTextBox: true, x: MX, y: 6.5, w: CW, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12,
  italic: true, color: MUTE });
footer(s, 6);

/* ---------------- 7. STEP 3 결제 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "STEP 3 · 실무자", "결제수단 등록하고 신청 완료");
stepBadge(s, 3, MX, 1.75);
bullets(s, [
  { t: "신청 마지막 단계에서 결제수단 등록", b: true },
  "신용카드(법인/개인) 또는 계좌이체·무통장",
  "「정액제 / 월 자동결제」로 설정 — 매달 끊기지 않게",
  { t: "신청 버튼을 누르면 몇 분 안에 서버가 만들어집니다", b: true },
  { t: "완료되면 가비아 「My가비아 → 이용중인 서비스」에 새 서버가 보입니다.", c: TEAL },
], MX + 0.95, 1.8, CW - 1.0, { fs: 14.5, gap: 12 });
footer(s, 7);

/* ---------------- 8. STEP 4 정보 확인 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "STEP 4 · 실무자", "서버 접속 정보 2가지를 확인");
s.addText("My가비아 → 이용중인 서비스 → 방금 만든 서버 클릭. 아래 두 값을 찾아 적어 둡니다. (관리자 비밀번호는 최초 발급값이 메일 또는 콘솔에 표시됩니다.)", {
  isTextBox: true, x: MX, y: 1.7, w: CW, h: 0.9, margin: 0, fontFace: BODY, fontSize: 13.5,
  color: INK, lineSpacingMultiple: 1.2 });
const info = [
  ["① 공인 IP 주소", "예) 123.45.67.89", "서버에 접속할 주소"],
  ["② 관리자 비밀번호", "Administrator 계정의 초기 비밀번호", "서버에 로그인할 열쇠"],
];
let iy = 2.8;
info.forEach((r) => {
  s.addShape(p.ShapeType.roundRect, { x: MX, y: iy, w: CW, h: 1.5, rectRadius: 0.1,
    fill: { color: WHITE }, line: { color: BLUE, width: 1.25 } });
  s.addText(r[0], { isTextBox: true, x: MX + 0.35, y: iy + 0.18, w: CW - 0.7, h: 0.45, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: BLUE });
  s.addText(r[1] + "  —  " + r[2], { isTextBox: true, x: MX + 0.35, y: iy + 0.7, w: CW - 0.7, h: 0.6,
    margin: 0, fontFace: BODY, fontSize: 13, color: INK });
  iy += 1.75;
});
s.addShape(p.ShapeType.roundRect, { x: MX, y: iy + 0.1, w: CW, h: 0.8, rectRadius: 0.08,
  fill: { color: "FBF1DE" }, line: { color: GOLD, width: 1 } });
s.addText("비밀번호는 메신저 공개 채팅에 올리지 말고, 개발자에게 직접(전화·대면·1회용 메모)으로 전달하세요.", {
  isTextBox: true, x: MX + 0.3, y: iy + 0.1, w: CW - 0.6, h: 0.8, margin: 0, valign: "middle",
  fontFace: BODY, fontSize: 12.5, bold: true, color: "9A6B1E" });
footer(s, 8);

/* ---------------- 9. STEP 5 카톡 준비 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "STEP 5 · 실무자", "봇이 쓸 카카오톡 계정 준비");
stepBadge(s, 5, MX, 1.75);
bullets(s, [
  { t: "봇 전용 카카오톡 계정을 정합니다", b: true },
  { t: "개인 카톡을 쓰면 봇이 켜져 있는 동안 개인 대화에 방해가 되므로, 별도 번호의 부계정을 권장합니다.", lvl: 1 },
  { t: "그 계정을 오픈채팅방 3곳(베트남·중국·인도네시아 경제)에 들어가게 합니다", b: true },
  { t: "가능하면 방장이 그 계정을 부방장/관리자로 지정 — 자동 강퇴 등을 피할 수 있음", lvl: 1 },
  { t: "방 이름 3개를 정확히 적어 둡니다 (개발자가 설정에 넣어야 함)", b: true },
], MX + 0.95, 1.8, CW - 1.0, { fs: 13.5, gap: 10 });
footer(s, 9);

/* ---------------- 10. STEP 6 전달 양식 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "STEP 6 · 실무자 → 개발자", "이 양식을 채워서 개발자에게 전달");
const hand = [
  ["가비아 로그인 아이디", "서버 재시작·요금 관리용"],
  ["가비아 로그인 비밀번호", "(직접 전달)"],
  ["서버 공인 IP 주소", "___ . ___ . ___ . ___"],
  ["서버 관리자 비밀번호", "(직접 전달)"],
  ["봇용 카카오톡 계정", "아이디 / 전화번호"],
  ["카카오톡 계정 비밀번호", "(직접 전달)"],
  ["오픈채팅방 이름 3개", "베트남 / 중국 / 인도네시아 방 정확한 이름"],
  ["결과 보고 받을 곳", "'나와의 채팅' 또는 담당자 카톡/텔레그램"],
];
s.addTable(
  hand.map((r, i) => [
    { text: r[0], options: { fontFace: BODY, fontSize: 12.5, bold: true, color: NAVY,
      fill: { color: i % 2 ? "EEF3F8" : WHITE }, valign: "middle" } },
    { text: r[1], options: { fontFace: BODY, fontSize: 12.5, color: MUTE,
      fill: { color: i % 2 ? "EEF3F8" : WHITE }, valign: "middle" } },
  ]),
  { x: MX, y: 1.75, w: CW, colW: [3.8, CW - 3.8], rowH: 0.56,
    border: { type: "solid", color: ICE, pt: 1 } }
);
s.addText("「(직접 전달)」 항목은 문서에 적지 말고 전화·대면으로 알려주세요.", {
  isTextBox: true, x: MX, y: 6.65, w: CW, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12,
  italic: true, color: "9A6B1E", bold: true });
footer(s, 10);

/* ---------------- 11. 개발자 단계(참고) ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "참고 · 개발자가 진행", "정보를 받은 뒤 개발자가 하는 일");
bullets(s, [
  { t: "① 원격 데스크톱으로 서버 접속 (윈도우 기본 프로그램)", b: true },
  { t: "② 시간대 서울, 절전 끄기, 자동 로그인 설정 — 재부팅돼도 스스로 켜지게", },
  { t: "③ 파이썬 · 카카오톡 PC 설치, 봇 프로그램 복사", },
  { t: "④ 카카오톡 로그인 (이때 휴대폰 인증 1회 필요 — 실무자 협조)", c: GOLD, b: true },
  { t: "⑤ AI 사용 키 등록, 테스트로 베트남 방에 1번 보내 보기", },
  { t: "⑥ 매일 저녁 8시 자동 실행 등록 → 이후 무인 운영", b: true },
], MX, 1.8, CW, { fs: 14, gap: 11 });
s.addText("④ 단계에서 봇 카톡 계정으로 오는 인증번호를 실무자가 확인해 알려줘야 합니다. 그 1번 이후로는 사람 손이 필요 없습니다.", {
  isTextBox: true, x: MX, y: 6.15, w: CW, h: 0.8, margin: 0, fontFace: BODY, fontSize: 12.5,
  italic: true, color: TEAL, lineSpacingMultiple: 1.2 });
footer(s, 11);

/* ---------------- 12. 운영 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "운영", "매일 확인할 것은 딱 하나");
s.addShape(p.ShapeType.roundRect, { x: MX, y: 1.9, w: CW, h: 1.6, rectRadius: 0.1,
  fill: { color: WHITE }, line: { color: TEAL, width: 1.5 } });
s.addText("저녁 8시 조금 지나 「결과 보고」 메시지가 오는지 본다", {
  isTextBox: true, x: MX + 0.4, y: 1.9, w: CW - 0.8, h: 1.6, margin: 0, valign: "middle",
  fontFace: HEAD, fontSize: 18, bold: true, color: NAVY });
s.addText("보고 메시지 예시", { isTextBox: true, x: MX, y: 3.8, w: CW, h: 0.35, margin: 0,
  fontFace: BODY, fontSize: 11, bold: true, color: MUTE, charSpacing: 1 });
s.addText("[뉴스클리핑봇] 09/03 20:01 실행 결과\n  베트남 경제: 4건 전송 완료\n  중국 경제: 3건 전송 완료\n  인도네시아 경제: 2건 전송 완료", {
  isTextBox: true, x: MX, y: 4.15, w: CW, h: 1.5, margin: 0.1, fontFace: "Consolas", fontSize: 12.5,
  color: INK, fill: { color: "EEF3F8" }, lineSpacingMultiple: 1.25 });
s.addText("이 메시지가 오면 정상입니다. 오지 않으면 다음 장을 보세요.", {
  isTextBox: true, x: MX, y: 5.95, w: CW, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: INK });
footer(s, 12);

/* ---------------- 13. 문제 대처 ---------------- */
s = p.addSlide(); bg(s, BG);
titleBar(s, "문제가 생기면", "증상별 대처");
const tr = [
  ["보고 메시지가 안 옴", "서버가 꺼졌을 수 있음 → 가비아 콘솔에서 서버 「재시작」 1번. 그래도 안 오면 개발자 연락"],
  ["\"기사 2건만 전송\"", "그날 조건에 맞는 기사가 실제로 적은 것. 정상 동작(최소 3건이 원칙이나 부족하면 있는 만큼)"],
  ["특정 방에만 전송 실패", "봇 계정이 그 방에서 나가졌거나 강퇴됨 → 다시 초대 후 개발자에게 알림"],
  ["요금 결제 실패 안내", "가비아에 등록한 카드 한도·유효기간 확인 후 재결제"],
];
s.addTable(
  tr.map((r, i) => [
    { text: r[0], options: { fontFace: BODY, fontSize: 12.5, bold: true, color: NAVY,
      fill: { color: i % 2 ? "EEF3F8" : WHITE }, valign: "middle" } },
    { text: r[1], options: { fontFace: BODY, fontSize: 12, color: INK,
      fill: { color: i % 2 ? "EEF3F8" : WHITE }, valign: "middle" } },
  ]),
  { x: MX, y: 1.85, w: CW, colW: [3.2, CW - 3.2], rowH: 1.15,
    border: { type: "solid", color: ICE, pt: 1 } }
);
footer(s, 13);

/* ---------------- 14. 체크리스트 ---------------- */
s = p.addSlide(); bg(s, NAVY);
s.addText("실무자 체크리스트", { isTextBox: true, x: MX, y: 0.7, w: CW, h: 0.7, margin: 0,
  fontFace: HEAD, fontSize: 30, bold: true, color: WHITE });
const chk = [
  "가비아 회원가입 · 로그인 완료",
  "g클라우드 윈도우 서버(2vCPU/4GB/Win2022) 신청",
  "공인 IP 1개 포함, 월 정액제로 결제",
  "서버 공인 IP 주소 확인",
  "서버 관리자 비밀번호 확인",
  "봇 전용 카카오톡 계정 준비",
  "오픈채팅방 3곳에 그 계정 참여(가능하면 관리자)",
  "전달 양식(10쪽) 작성해 개발자에게 전달",
];
s.addText(
  chk.map((t, i) => ({ text: t, options: { bullet: { code: "2610" }, breakLine: true,
    paraSpaceAfter: 12, fontSize: 15, color: ICE, fontFace: BODY } })),
  { isTextBox: true, x: MX, y: 1.7, w: CW, h: 5.0, margin: 0, valign: "top" }
);
s.addText("8개 항목이 끝나면 실무자 할 일 완료. 이후는 개발자가 진행합니다.", {
  isTextBox: true, x: MX, y: 6.7, w: CW, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12,
  italic: true, color: MUTE });

p.writeFile({ fileName: "/Users/leesehyeon/뉴스클리핑봇/docs/서버준비안내서.pptx" })
  .then((f) => console.log("saved", f));
