'use strict';

/* 확대·축소 원천 봉쇄 — iOS 사파리는 meta의 user-scalable=no 를 무시할 수 있어
   집게 확대(gesturestart)를 코드로 막는다. 더블탭 확대는 CSS touch-action이 막는다 —
   touchend 를 건드리면 빠른 연타 클릭이 죽으므로(전에 겪은 사고) 절대 손대지 않는다. */
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- 저장 ---------- */
const KEY = 'vnstudy.v2';
const S = Object.assign({ voice: 'f', region: 'n', kr: 'show', wspd: .8, pgm: 'word', done: {}, srs: {},
                          qbank: {}, act: {}, stats: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'));

/* 화면 말은 무조건 한국어다 (대표님 지시, 2026-09-12) — 이 앱은 한국인 전용.
   베트남인용은 나중에 별개 앱으로 그대로 복붙해서 그쪽만 vi로 고정한다.
   전에는 폰 언어로 짐작해 골랐지만(베트남어 폰이면 vi) 이제는 고를 사람 자체가 없다. */
if (S.ui !== 'ko') { S.ui = 'ko'; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
let saveWarned = false;
function save() {
  try { if (S.stats) dayTally(); } catch (e) { }              // 하루 집계 (2026-09-30 밤) — 계수기가 는 만큼을 오늘 칸에
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    // 시크릿 모드나 저장 공간이 꽉 찬 경우. 학습은 계속 되게 두고 한 번만 알린다.
    if (!saveWarned) {
      saveWarned = true;
      alert('이 브라우저에서는 진도가 저장되지 않습니다.\n시크릿 모드를 끄거나 다른 브라우저로 열어 주세요.\n(학습은 그대로 하실 수 있습니다)');
    }
  }
  if (typeof cloudTouch === 'function') cloudTouch();   // 2026-09-30: 바뀌면 올린다(20초 뒤·3분에 한 번) — 아래 옛 결정은 이것으로 바꿨다
  /* 서버 백업은 여기서 하지 않는다 (대표님 결정 2026-09-27: 챕터를 끝냈을 때만).
     전에는 폰에 적을 때마다 8초 뒤 서버에도 올려서 20분 공부에 50번쯤 썼다 — KV 무료 한도(하루 1,000번)를
     40명이면 넘긴다. 이제 세트 끝(finishDay 앞)·복습 끝·진도 초기화·앱을 켤 때 하루 한 번(renderHome)만 올린다. */
}

/* 단톡방 공유용 키 링크: 주소 뒤 #k=... 를 한 번 읽어 저장하고 지운다.
   #(해시) 부분은 서버로 전송되지 않아 어디에도 기록이 안 남는다. */
if (location.hash === '#admin') {          // 운영자 화면 켜기 (이 폰에만 남는다)
  S.admin = 1;
  localStorage.setItem(KEY, JSON.stringify(S));
  history.replaceState(null, '', location.pathname + location.search);
}
if (location.hash.startsWith('#k=')) {
  S.gkey = decodeURIComponent(location.hash.slice(3));
  save();
  history.replaceState(null, '', location.pathname + location.search);
}

const DAY = 864e5;
const STEPS = [1, 3, 7, 14, 30, 60];   // 일 단위. 반년~1년 기억을 목표로 한 간격
const now = () => Date.now();

/* ---------- 데이터 ---------- */
let ALL = [], AIDX = {}, DRILL = [], VDRILL = [], EAR = {};
/* 녹음 찾기 — 대소문자 안 가린다. 문장 첫 단어(Đây, Bạn...)은 대문자로 들어오는데
   녹음은 소문자 표제어로만 있어서, 이 한 곳을 통하지 않으면 문장마다 첫 단어만
   기기 목소리로 나서 "목소리가 섞인다"가 된다(2026-09-09 원인 확정). */
/* 같은 말의 다른 표기를 한 열쇠로 (2026-09-29, 대표님: "quản lý 마지막 y 대신 i 로 해도 된다는데? 반영 가능한 것 모두")
   ① 성조 자리 두 꼴(hoà/hòa·thuý/thúy) ② 자음 뒤 끝소리 i/y(lý/lí·kỹ/kĩ·sỹ/sĩ·Mỹ/Mĩ·quý/quí —
   교육부 결정 1989/2018/QĐ-BGDĐT 가 자음 뒤는 i 로 정했지만 y 표기도 널리 쓰여 둘 다 통한다).
   음절마다 성조 부호를 떼어 끝에 번호로 붙이므로 성조 자리가 달라도 같은 열쇠다.
   y 가 자음 뒤 **홀로 모음**일 때만 i 로 — ay·ây·uy·yê·y tế(홀로 y)는 소리나 규정이 달라 건드리지 않는다. */
const VI_TONE = { '\u0300': 1, '\u0301': 2, '\u0309': 3, '\u0303': 4, '\u0323': 5 };
const VI_ONSET_Y = /^(b|c|ch|d|đ|g|gh|h|k|kh|l|m|n|ng|ngh|nh|p|ph|r|s|t|th|tr|v|x|qu)y$/;
function viCanon(s) {
  return String(s || '').normalize('NFC').toLowerCase().replace(/[.,!?;:…"“”()]+/g, ' ').split(/\s+/).filter(Boolean).map(syl => {
    let t = 0;
    const base = syl.normalize('NFD').replace(/[\u0300\u0301\u0309\u0303\u0323]/g, c => { t = VI_TONE[c]; return ''; }).normalize('NFC');
    return (VI_ONSET_Y.test(base) ? base.slice(0, -1) + 'i' : base) + (t || '');
  }).join(' ');
}
/* 열쇠 → 실제 표제어 색인 (자료 하나마다 한 번만 만든다) */
const CANON_IX = new WeakMap();
function canonFind(obj, t) {
  if (!obj) return null;
  let ix = CANON_IX.get(obj);
  if (!ix) { ix = new Map(); Object.keys(obj).forEach(k => { const c = viCanon(k); if (!ix.has(c)) ix.set(c, k); }); CANON_IX.set(obj, ix); }
  return ix.get(viCanon(t)) || null;
}
const recKey = t => AIDX[t] ? t : (AIDX[t.toLowerCase()] ? t.toLowerCase() : canonFind(AIDX, t));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
/* ── 화면 언어 (1단계) ────────────────────────────────────────────
   베트남 사용자를 위해 화면 문구를 베트남어로. 6천 줄의 한국어를 다 뜯지 않고,
   글자가 화면에 놓이는 길목(el·show)에서 **문구를 통째로 맞바꾼다.**
   표에 있는 문구만 바뀐다 — 아직 없는 문구는 한국어로 남고, 표를 채우면 늘어난다. */
const UIVI = {
  '‹ 돌아가기': '‹ Quay lại',
  '시험 보고 오셨나요?': 'Bạn vừa đi thi về?',
  '무엇이 나왔는지 알려 주기': 'Cho biết đề có gì',
  '1분 · 이름 안 받습니다': '1 phút · Không hỏi tên',
  '어떤 시험이었나요?': 'Bạn thi kỳ nào?',
  '어떤 소재가 나왔나요? (여러 개 고를 수 있습니다)': 'Đề nói về chủ đề gì? (chọn nhiều được)',
  '기억나는 단어이 있으면 적어 주세요 (쉼표로 나눠서, 단어만)':
    'Nhớ từ nào thì ghi lại (ngăn bằng dấu phẩy, chỉ từ thôi)',
  '예: 환승, 계약서, 분리배출': 'Ví dụ: 환승, 계약서, 분리배출',
  '많이 어려웠나요?': 'Đề có khó không?',
  '아주 쉬움': 'Rất dễ', '쉬움': 'Dễ', '보통': 'Bình thường',
  '어려움': 'Khó', '아주 어려움': 'Rất khó',
  '보내지 못했습니다': 'Không gửi được',
  '소재를 하나 이상 골라 주세요.': 'Hãy chọn ít nhất một chủ đề.',
  '고맙습니다. 다음 사람에게 큰 도움이 됩니다.': 'Cảm ơn bạn. Điều này giúp ích rất nhiều cho người sau.',
  '문장처럼 긴 것 N개는 보내지 않았습니다.': 'N mục quá dài (giống câu văn) đã không được gửi.',
  '다른 사람이 적은 것 보기': 'Xem người khác đã ghi gì',
  '시험을 보고 온 사람들이 적어 준 것입니다.': 'Đây là những gì người vừa đi thi ghi lại.',
  '두 사람 이상이 적은 단어만 보여 줍니다 — 한 사람 기억은 틀릴 수 있습니다.':
    'Chỉ hiện từ có từ hai người trở lên ghi — trí nhớ một người có thể sai.',
  '제보 N건': 'N lượt báo', '체감 난이도 N/5': 'Độ khó cảm nhận N/5',
  '여러 사람이 적은 단어': 'Từ nhiều người cùng ghi',
  '아직 제보가 없습니다. 첫 번째로 알려 주세요.': 'Chưa có báo cáo nào. Bạn hãy là người đầu tiên.',
  '나도 알려 주기': 'Tôi cũng muốn báo', '무엇이 나왔나': 'Đề có gì',
  '서버가 아직 새 판이 아닙니다 — 잠시 뒤에 다시 해 주세요.':
    'Máy chủ chưa cập nhật bản mới — hãy thử lại sau.',
  '시험에서 <b>어떤 소재가 나왔는지</b>만 알려 주세요.<br><b>문제를 그대로 옮겨 적으면 안 됩니다</b> — 남의 저작물이라 우리도 못 받습니다.':
    'Chỉ cho biết <b>đề nói về chủ đề gì</b>.<br><b>Đừng chép nguyên văn câu hỏi</b> — đó là tác phẩm của người khác, chúng tôi không nhận.',
  '어떤 <b>소재</b>가 나왔는지 알려 주시면 다음 사람이 준비하기 쉬워집니다. <b>문제를 그대로 옮겨 적지는 마세요</b> — 소재와 단어만 받습니다.':
    'Cho biết đề về <b>chủ đề</b> gì sẽ giúp người sau ôn dễ hơn. <b>Đừng chép nguyên văn câu hỏi</b> — chỉ nhận chủ đề và từ vựng.',
  '빈칸 채우기': 'Điền vào chỗ trống', '㉠ ㉡ 두 자리': 'Hai chỗ ㉠ ㉡',
  '논술 (54번 꼴)': 'Bài luận (dạng câu 54)', '자료 설명 (53번 꼴)': 'Mô tả dữ liệu (dạng câu 53)',
  'N자 정도': 'Khoảng N chữ', '모범답 보기': 'Xem đáp án mẫu', 'AI에게 봐 달라기': 'Nhờ AI xem giúp',
  '먼저 써 보세요.': 'Hãy thử viết trước đã.', '조금 더 써 주세요.': 'Hãy viết thêm một chút.',
  'TOPIK II 쓰기': 'Viết TOPIK II',
  '51·52번은 빈칸 채우기, 53·54번은 긴 글입니다. 실제 시험과 같은 꼴입니다.':
    'Câu 51·52 là điền chỗ trống, câu 53·54 là bài viết dài. Đúng dạng của kỳ thi thật.',
  '한 달 순위는 서버가 새 판이어야 나옵니다 — 지금은 이번 주만 줄을 세웁니다.':
    'Bảng xếp hạng tháng cần máy chủ bản mới — hiện chỉ xếp hạng theo tuần này.', '한 달 순위': 'Xếp hạng tháng',
  '한 달': 'Tháng', '한 달 점수': 'Điểm tháng', '최근 주에 더 무게': 'Tuần gần hơn tính nặng hơn',
  '취업 (EPS)': 'Việc làm (EPS)', '체류·귀화 (KIIP)': 'Cư trú·nhập tịch (KIIP)',
  '유학·자격 (TOPIK)': 'Du học·chứng chỉ (TOPIK)',
  '한국에서 일하려면 보는 시험입니다.': 'Kỳ thi cần có để đi làm ở Hàn Quốc.',
  '사회통합프로그램 사전평가와 단계평가입니다.': 'Đánh giá đầu vào và đánh giá từng cấp của KIIP.',
  '한국어능력시험 형식 그대로입니다.': 'Đúng theo định dạng kỳ thi TOPIK.',
  'N벌': 'N bộ', 'N회차': 'Lần N', '풀어 보기': 'Làm thử', '문항': ' câu', '분': ' phút', '해설': 'Giải thích', '해설이 아직 없습니다.': 'Chưa có giải thích.',
  '내가 고른 답': 'Bạn đã chọn', '(그림)': '(hình)',
  '맞힌 문항 해설': 'Giải thích câu đúng', '맞힌 문항 해설도 보기': 'Xem giải thích câu đúng',
  '일터 단어': 'Từ nơi làm việc',
  /* ── 2026-08 대량 보강: 화면 문구 베트남어 ── */
  '<b>✍️ 일주일에 한 번은 손으로 써보세요.</b><br>': '<b>✍️ Mỗi tuần hãy viết tay một lần.</b><br>',
  '<b>글자를 누르면 소리가 납니다</b><br>': '<b>Bấm vào chữ sẽ phát ra âm thanh</b><br>',
  '<b>녹음은 어디에 남나요</b><br>': '<b>Bản ghi âm được lưu ở đâu</b><br>',
  '<b>이렇게 하면 올라갑니다</b>': '<b>Làm thế này thì sẽ tiến bộ</b>',
  '<b>이번 주 강점과 약점</b>': '<b>Điểm mạnh và điểm yếu tuần này</b>',
  '<b>진도를 불러왔습니다.</b> 화면을 새로 그립니다.': '<b>Đã tải tiến độ.</b> Màn hình sẽ được vẽ lại.',
  '<b>진짜 기억률</b> = 다시 볼 때가 된 카드를 첫 시도에 맞힌 비율.': '<b>Tỷ lệ nhớ thật</b> = tỷ lệ trả lời đúng ngay lần đầu với thẻ đã đến hạn ôn.',
  '<b>폰을 입 가까이</b> 대고 또박또박 말하세요': '<b>Đưa điện thoại gần miệng</b> và nói thật rõ ràng',
  '<b>폰의 베트남어 자판을 한 번만 추가해 주세요.</b><br>': '<b>Hãy thêm bàn phím tiếng Việt vào điện thoại một lần.</b><br>',
  '<span class="ri">🔁</span><b>복습은 이렇게 돌아갑니다</b>': '<span class="ri">🔁</span><b>Ôn tập vận hành như thế này</b>',
  '<span class="vname">높낮이</span><span class="vmark">…</span>': '<span class="vname">Cao độ</span><span class="vmark">…</span>',
  '<span class="vname">발음</span><span class="vmark">…</span>': '<span class="vname">Phát âm</span><span class="vmark">…</span>',
  '<strong>실력 분석</strong>': '<strong>Phân tích năng lực</strong>',
  'AI 듣기 실패:': 'AI nghe thất bại:',
  'AI 선생님 점검': 'Thầy AI kiểm tra',
  'AI 선생님이 보는 중…': 'Thầy AI đang xem…',
  'AI 점검 실패:': 'Kiểm tra AI thất bại:',
  'AI 채점 실패:': 'Chấm điểm AI thất bại:',
  'AI 채점을 쓰려면 <b>내 정보</b>에서 구글 무료 키를 한 번 넣어 주세요.': 'Để dùng chấm điểm AI, hãy nhập khóa miễn phí của Google một lần trong <b>Thông tin của tôi</b>.',
  'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.': 'Cần khóa AI — hãy nhập trong Thông tin của tôi.',
  'AIza… 로 시작하는 키': 'Khóa bắt đầu bằng AIza…',
  'AI가 읽는 중…': 'AI đang đọc…',
  'KIIP 구술시험과 작문시험 형식 · AI가 읽고 고칠 점을 알려 줍니다.': 'Định dạng thi vấn đáp và thi viết của KIIP · AI đọc và chỉ ra chỗ cần sửa.',
  '· 서버에는 비밀번호의 <b>으깬 값(해시)</b>만 남습니다 — 원문은 저장하지 않습니다.<br>': '· Máy chủ chỉ lưu <b>giá trị băm (hash)</b> của mật khẩu — không lưu mật khẩu gốc.<br>',
  '· 이 두 성조(<b>hỏi</b> 와 <b>ngã</b>)는 <b>남부·중부에서 하나로 합쳐져</b> 현지 사람들도 잘 가르지 않습니다 —': '· Hai thanh này (<b>hỏi</b> và <b>ngã</b>) <b>nhập làm một ở miền Nam và miền Trung</b> nên người bản xứ cũng ít phân biệt —',
  '‹ 다른 제목 고르기': '‹ Chọn đề khác',
  '‹ 이전': '‹ Trước',
  '↳ 소리가 짧거나 흐려서 <b>확실하게 가릴 수 없습니다.</b>': '↳ Âm thanh quá ngắn hoặc không rõ nên <b>không thể phân biệt chắc chắn.</b>',
  '⌫ 지우기': '⌫ Xóa',
  '⏹ 다 말했어요': '⏹ Tôi đã nói xong',
  '■ 멈추기': '■ Dừng',
  '▶ 대화 전체 듣기': '▶ Nghe toàn bộ hội thoại',
  '✓ 맞게 썼어요': '✓ Bạn viết đúng',
  '✓ 맞았어요': '✓ Đúng rồi',
  '✗ 못 맞혔어요': '✗ Chưa đúng',
  '✗ 틀렸어요': '✗ Sai rồi',
  '가장 어려운 건 hỏi(내렸다 올림)와 ngã(끊었다 올림)입니다. 이 둘은 원어민도 지역에 따라 섞어 씁니다.': 'Khó nhất là hỏi và ngã. Ngay cả người bản xứ cũng dùng lẫn tùy theo vùng miền.',
  '갈래를 고르세요': 'Hãy chọn nhóm',
  '같은 글자에 성조만 다른 단어들입니다. 높낮이만 귀로 가립니다 — 부호 붙이기 문제도 섞여 나옵니다.': 'Đây là những từ viết giống nhau, chỉ khác thanh điệu. Chỉ phân biệt bằng tai — có xen cả bài đánh dấu thanh.',
  '고른 문장으로 상대가 말을 겁니다. <b>·</b> 표가 붙은 것은 오늘 꺼낼 때가 된 문장입니다.': 'Đối phương sẽ bắt chuyện bằng câu bạn chọn. Câu có dấu <b>·</b> là câu đến hạn ôn hôm nay.',
  '과목별 정답률': 'Tỷ lệ đúng theo kỹ năng',
  '국적': 'Quốc tịch',
  '그래도 최근 단어 다시 보기': 'Vẫn xem lại các từ gần đây',
  '글자 보기': 'Xem chữ',
  '기사를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.': 'Không tải được bài báo. Hãy kiểm tra kết nối mạng.',
  '끝낸 세트 (어디서 멈추는가)': 'Phần đã hoàn thành (dừng ở đâu)',
  '날씨': 'Thời tiết',
  '날씨를 불러오는 중…': 'Đang tải thời tiết…',
  '날씨를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.': 'Không tải được thời tiết. Hãy kiểm tra kết nối mạng.',
  '남부에서는': 'Ở miền Nam thì',
  '남은 복습': 'Còn phải ôn',
  '녹음 중': 'Đang ghi âm',
  '눈과 귀로 훑었습니다 — 외우는 건 퀴즈가 합니다': 'Bạn đã xem và nghe qua — phần ghi nhớ để bài kiểm tra lo',
  '다 말했으면 <b>가운데 빨간 네모</b>를 누르세요': 'Nói xong hãy bấm <b>ô vuông đỏ ở giữa</b>',
  '다 맞았습니다.': 'Bạn đã trả lời đúng tất cả.',
  '다른 시험 고르기': 'Chọn đề khác',
  '다시': 'Lại',
  '다시 듣기': 'Nghe lại',
  '다시 풀기': 'Làm lại',
  '다시 하기': 'Làm lại',
  '단어 → 확인 문제 → 문장까지, 한 세트를 다 했습니다': 'Từ vựng → bài kiểm tra → câu nói: bạn đã hoàn thành một phần trọn vẹn',
  '되돌릴 수 없습니다. 정말 지울까요?\n(백업해 둔 글자가 있으면 나중에 되살릴 수 있습니다)': 'Không thể hoàn tác. Bạn thực sự muốn xóa?\n(Nếu đã sao lưu thì sau này vẫn khôi phục được)',
  '두 과목이 10문제를 넘으면 강점·약점과 처방이 나옵니다.': 'Khi hai kỹ năng vượt 10 câu, sẽ hiện điểm mạnh, điểm yếu và lời khuyên.',
  '듣고 있습니다… 다 말하면 위 단추를 누르세요.': 'Đang nghe… Nói xong hãy bấm nút phía trên.',
  '들어 보기': 'Nghe thử',
  '들어보기': 'Nghe thử',
  '로그아웃할까요?': 'Bạn muốn đăng xuất?',
  '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.': 'Không dùng được micro. Hãy cho phép trong cài đặt trình duyệt.',
  '막대는 나, 세로 선은 <b>다른 사람들의 평균</b>입니다.': 'Cột là bạn, đường dọc là <b>mức trung bình của người khác</b>.',
  '만나는 땅으로 묶여 있습니다. 같은 도시면 한국인도 베트남인도 함께 옵니다.': 'Nhóm theo nơi gặp mặt. Cùng thành phố thì cả người Hàn và người Việt đều đến.',
  '많은 사람이 틀리는 단어': 'Những từ nhiều người hay sai',
  '말하기 (구술시험)': 'Nói (thi vấn đáp)',
  '말하기 · 쓰기': 'Nói · Viết',
  '맞게 썼어요': 'Bạn viết đúng',
  '매일 새벽 6시 30분에 어제 기사 다섯 편으로 만들어집니다.': 'Được tạo lúc 6 giờ 30 sáng mỗi ngày từ năm bài báo của hôm trước.',
  '매일 아침 6시 30분에 업데이트됩니다. 최근 3일치만 남습니다.<br>기사 출처 — 인사이드비나': 'Cập nhật lúc 6 giờ 30 sáng mỗi ngày. Chỉ giữ lại 3 ngày gần nhất.<br>Nguồn bài báo — Inside Vina',
  '모음 소개 다시 보기': 'Xem lại phần giới thiệu nguyên âm',
  '모의고사': 'Thi thử',
  '기초 문법': 'Ngữ pháp cơ bản',
  '한국어 기초 문법 78개 — 초급1부터 중급2까지, 배우는 순서 그대로입니다.':
    '78 điểm ngữ pháp tiếng Hàn — từ Sơ cấp 1 đến Trung cấp 2, đúng theo thứ tự học.',
  '문법 자료를 받지 못했습니다. 인터넷을 확인해 주세요.':
    'Không tải được tài liệu ngữ pháp. Hãy kiểm tra kết nối mạng.',
  '초급1': 'Sơ cấp 1', '초급2': 'Sơ cấp 2', '중급1': 'Trung cấp 1', '중급2': 'Trung cấp 2',
  '한글 기본기 — 모음·자음부터 숫자·인사말까지.':
    'Kiến thức nền tảng — từ nguyên âm, phụ âm đến số đếm, câu chào.',
  '자료를 받지 못했습니다. 인터넷을 확인해 주세요.':
    'Không tải được tài liệu. Hãy kiểm tra kết nối mạng.',
  /* ── 점수 ── */
  '점수': 'Điểm thưởng',
  '오늘 출석': 'Điểm danh hôm nay', '연속 3일': 'Liên tục 3 ngày', '연속 7일': 'Liên tục 7 ngày',
  '모의고사를 끝냈습니다': 'Bạn đã hoàn thành một đề thi thử',
  '자주 틀리던 단어 5개를 잡았습니다': 'Bạn đã khắc phục 5 từ hay sai',
  '지금까지 모두': 'Tổng cộng đã tích', '지난주': 'Tuần trước',
  '순위': 'Xếp hạng', '이번 주 순위': 'Xếp hạng tuần này',
  '복습을 끝냈습니다': 'Bạn đã hoàn thành ôn tập', '오늘 세트를 끝냈습니다': 'Bạn đã hoàn thành bài hôm nay',
  '자주 틀리던 단어를 잡았습니다': 'Bạn đã khắc phục một từ hay sai',
  '복습을 끝내면': 'Hoàn thành ôn tập', '오늘 세트를 끝내면': 'Hoàn thành bài hôm nay',
  '그날 처음 앱을 열면': 'Mở ứng dụng lần đầu trong ngày',
  '모의고사 한 회를 끝내면': 'Hoàn thành một đề thi thử',
  '문법·기본기·문화 카드를 처음 볼 때마다': 'Mỗi thẻ ngữ pháp·nền tảng·văn hóa xem lần đầu',
  '받아쓰기·타이핑 한 판': 'Một lượt chép chính tả·gõ phím',
  '가장 높습니다 — 복습이 무너지면 나머지가 다 무너집니다':
    'Cao nhất — nếu bỏ ôn tập thì mọi thứ khác sụp theo',
  '틀린 걸 고친 순간이 가장 값집니다': 'Khoảnh khắc sửa được lỗi là quý nhất',
  '오는 것 자체에 주는 몫이라 작습니다': 'Phần thưởng cho việc ghé vào nên nhỏ',
  '어려운 것일수록 높습니다 — 점수를 좇는 것과 실제로 느는 것이 같은 방향이 되게 했습니다.':
    'Càng khó điểm càng cao — để việc săn điểm và việc thật sự tiến bộ đi cùng một hướng.',
  '최근 한 달 점수 <b>N점</b> — 최근 주에 더 무게를 줍니다(이번 주 1.0 · 1주 전 0.7 · 2주 전 0.5 · 3주 전 0.3).':
    'Điểm một tháng gần đây <b>N điểm</b> — tuần gần hơn được tính nặng hơn (tuần này 1.0 · 1 tuần trước 0.7 · 2 tuần trước 0.5 · 3 tuần trước 0.3).',
  '북부 (하노이)': 'Miền Bắc (Hà Nội)', '남부 (호찌민)': 'Miền Nam (TP.HCM)',
  '나란히 (개발용)': 'Song song (cho nhà phát triển)',
  '하루 분량': 'Lượng mỗi ngày', '하루 한 레슨': '1 bài/ngày', '하루 두 레슨': '2 bài/ngày', '월요일마다 초기화': 'Đặt lại mỗi thứ Hai',
  'N위': 'Hạng N', 'N명 중': 'trong N người', '이번 주 점수': 'Điểm tuần này', 'N점': 'N điểm',
  // 모의고사 채점 — TOPIK 은 문항마다 배점이 달라 '맞힌 개수'와 '점수'가 다른 숫자다
  '맞힌 비율': 'Tỉ lệ đúng', '시간이 다 됐습니다': 'Đã hết giờ',
  '틀린 문항만 다시 풀기': 'Làm lại các câu sai', '오답': 'Câu sai',
  '급은 듣기·쓰기·읽기를 합쳐야 나옵니다.': 'Cấp bậc chỉ có khi cộng cả Nghe · Viết · Đọc.',
  'N급 수준입니다': 'Tương đương cấp N', '아직 급이 나오지 않습니다': 'Chưa đạt cấp nào',
  // KIIP — 우리가 채점하는 것은 필기 객관식뿐이라, 그 사실을 화면에 적어 둔다
  '여기에 쓰십시오': 'Viết vào đây', '쓴 답': 'Câu trả lời đã viết',
  '띄어쓰기는 채점에 영향을 주지 않습니다.': 'Khoảng trắng không ảnh hưởng đến chấm điểm.',
  '여기는 필기 객관식만 채점했습니다.': 'Ở đây chỉ chấm phần trắc nghiệm viết.',
  '작문 N문항 M점': 'Viết luận N câu M điểm', '구술 N문항 M점': 'Vấn đáp N câu M điểm',
  '합격은 100점 만점에 60점입니다.': 'Đạt là 60/100 điểm.',
  '합격선을 넘었습니다': 'Đã vượt điểm đạt', '합격선에 모자랍니다': 'Chưa đủ điểm đạt',
  '남은 점수에 따라 갈립니다': 'Tùy điểm còn lại',
  // 문항 되풀이 창고 — 한 번 맞혔다고 빼지 않는다
  '다시 풀 문항': 'Câu cần làm lại',
  // 듣기 규칙 — 실제 시험이 막는 것을 우리도 막는다
  '다 들었습니다': 'Đã nghe hết',
  '실제 시험처럼 정해진 횟수만 들려줍니다.': 'Chỉ phát đúng số lần như thi thật.',
  'N번 더 들을 수 있습니다.': 'Còn nghe được N lần.',
  '세 번 맞히면 쉽니다. 지금 창고에 N개.':
    'Đúng ba lần thì câu đó nghỉ. Hiện có N câu trong kho.',
  // TOPIK 말하기 — 시간표가 이 시험의 핵심이라 화면 문구도 시간을 앞세운다
  '6문항 · 유형마다 준비·응답 시간이 다릅니다. 실제 시험처럼 시간이 흐릅니다.':
    '6 câu · Mỗi dạng có thời gian chuẩn bị và trả lời khác nhau. Đồng hồ chạy như thi thật.',
  '시작 (시간이 흐릅니다)': 'Bắt đầu (đồng hồ sẽ chạy)',
  '준비하세요': 'Hãy chuẩn bị', '말하세요': 'Hãy nói',
  '준비 N초': 'Chuẩn bị N giây', '응답 N초': 'Trả lời N giây',
  '그만두기': 'Dừng lại', '다 말했어요': 'Tôi nói xong rồi',
  '마이크를 쓸 수 없습니다.': 'Không dùng được micro.',
  '녹음했습니다. AI 채점을 쓰려면 내 정보에서 키를 넣어 주세요.':
    'Đã ghi âm. Để AI chấm, hãy nhập khóa ở mục Thông tin của tôi.',
  'AI가 듣는 중…': 'AI đang nghe…', 'AI가 붐빕니다 — 다시 시도 중': 'AI đang bận — đang thử lại',
  'AI 채점 실패': 'AI chấm thất bại',
  'N점만 더 하면 위 사람을 따라잡습니다.': 'Chỉ cần thêm N điểm là bắt kịp người trên.',
  '지금 1위입니다. 월요일까지 지켜 보세요.': 'Bạn đang hạng 1. Hãy giữ vững đến thứ Hai.',
  '오늘 공부하면 순위가 생깁니다': 'Học hôm nay để có bảng xếp hạng',
  '점수 올리는 법': 'Cách tăng điểm',
  'AI 채점에 쓰는 점수': 'Điểm thưởng dùng cho AI chấm',
  'AI 채점 한 번에 <b>N점</b>을 씁니다. 점수를 써도 <b>순위는 안 내려갑니다</b>.':
    'Mỗi lần AI chấm dùng <b>N điểm thưởng</b>. Dùng điểm thưởng <b>không làm tụt hạng</b>.',
  '지금은 <b>이번 주 출석 도장</b>으로 매긴 순위입니다 — 서버가 새 판으로 바뀌면 점수 순위로 바뀝니다.':
    'Hiện đang xếp hạng theo <b>dấu điểm danh tuần này</b> — khi máy chủ cập nhật sẽ chuyển sang xếp hạng theo điểm thưởng.',
  '명': 'người', '출석 도장': 'dấu điểm danh', '이렇게 모입니다': 'Tích điểm như thế này',
  '하루 한 번이라도 공부하면': 'Học dù chỉ một lần trong ngày',
  '모의고사 한 회 끝내면': 'Hoàn thành một đề thi thử',
  '자주 틀린 단어 5개를 잡으면': 'Khắc phục 5 từ hay sai',
  '점수가 모자랍니다': 'Không đủ điểm thưởng', '필요': 'Cần', '남음': 'Còn lại',
  'AI 채점 한 번에 <b>N점</b>을 씁니다.': 'Mỗi lần AI chấm điểm sẽ dùng <b>N điểm thưởng</b>.',
  '<b>내 정보</b>에 내 구글 키를 넣어 두셨으므로 AI 채점은 점수를 쓰지 않습니다.':
    'Vì bạn đã nhập khóa Google trong <b>Thông tin của tôi</b> nên AI chấm điểm không tốn điểm thưởng.',
  '공부하면 다시 쌓입니다. 내 정보에 구글 키를 넣으면 점수 없이 쓸 수 있습니다.':
    'Học tiếp sẽ tích lại. Nhập khóa Google trong Thông tin của tôi thì dùng được mà không tốn điểm.',
  '남과 견주지 않습니다 — <b>지난주의 나</b>와만 견줍니다.':
    'Không so với người khác — chỉ so với <b>chính bạn tuần trước</b>.',
  /* ── 나만의 단어장 ── */
  '단어장': 'Sổ từ của tôi',
  '단어장에 담기': 'Lưu vào sổ từ của tôi',
  '★ 내가 담은 것': '★ Tôi đã lưu',
  '⚠ 자주 틀린 것': '⚠ Hay sai',
  '틀림': 'Sai', '번': 'lần',
  '아직 뜻이 없는 단어입니다': 'Từ này chưa có nghĩa trong từ điển',
  '아직 담은 단어이 없습니다. 배우는 화면에서 단어 옆 <b>☆</b>를 누르면 여기에 모입니다.':
    'Chưa có từ nào được lưu. Nhấn <b>☆</b> bên cạnh từ ở màn hình học để lưu vào đây.',
  '아직 자주 틀린 단어이 없습니다. 퀴즈에서 틀린 단어이 여기에 저절로 모입니다.':
    'Chưa có từ nào hay sai. Những từ bạn làm sai trong bài kiểm tra sẽ tự động vào đây.',
  '퀴즈에서 <b>맞힐 때마다 횟수가 줄어</b> 저절로 사라집니다 — 지울 필요가 없습니다.':
    'Mỗi lần bạn trả lời đúng, <b>số lần sai sẽ giảm</b> và từ đó tự biến mất — không cần xóa.',
  '한국 문화': 'Văn hóa Hàn Quốc',
  '한국 생활 문화 — 직장 예절부터 위급 상황까지.':
    'Văn hóa sinh hoạt Hàn Quốc — từ phép tắc nơi làm việc đến tình huống khẩn cấp.',
  '날마다 배우기': 'Học mỗi ngày',
  '날마다 배우기 — 초급1부터 중급2까지 78일. 하루에 문법 하나, 단어 열 개, 대화 한 편입니다.':
    'Học mỗi ngày — 78 ngày, từ Sơ cấp 1 đến Trung cấp 2. Mỗi ngày một điểm ngữ pháp, mười từ và một đoạn hội thoại.',
  '오늘의 문법 보기': 'Xem ngữ pháp hôm nay',
  '오늘의 단어': 'Từ vựng hôm nay',
  '오늘의 미션': 'Nhiệm vụ hôm nay',
  /* ── 베트남인용 한국어 과정 홈 화면 ── */
  '베트남인을 위한 한국어': 'Tiếng Hàn cho người Việt',
  'EPS-TOPIK · KIIP · TOPIK I 시험 대비': 'Luyện thi EPS-TOPIK · KIIP · TOPIK I',
  '응시': 'Đã thi', '회': ' lần', '평균': 'Trung bình', '점': ' điểm',
  '지금 있는 것 — 날마다 배우기 78일, 모의고사 45벌(보기별 해설 포함), 기본기, 문법 78개, 한국 문화, AI 채점 말하기·쓰기':
    'Hiện đã có — Học mỗi ngày 78 ngày, 45 đề thi thử (kèm giải thích từng phương án), kiến thức nền tảng, 78 điểm ngữ pháp, văn hóa Hàn Quốc, luyện nói·viết có AI chấm',
  '아직 없는 것 — TOPIK II 쓰기 연습 회차, 공식 기출 풀이(공식 자료실로 안내합니다)':
    'Chưa có — thêm đề luyện viết TOPIK II, và giải đề thi thật (chúng tôi dẫn bạn tới trang chính thức)',
  '목록으로': 'Về danh sách',
  '풀이 전략': 'Mẹo làm bài',
  '왜': 'Vì sao',
  '어떻게': 'Làm thế nào',
  '오늘 해볼 것': 'Hôm nay hãy thử',
  '이전': 'Trước',
  '다음': 'Sau',
  '뜻과 단어을 짝지어 보세요': 'Hãy ghép nghĩa với từ',
  '조각을 눌러 문장을 만들어 보세요': 'Nhấn các mảnh để ghép thành câu',
  '아래 조각을 눌러 보세요': 'Hãy nhấn các mảnh bên dưới',
  'N개 중 M개를 한 번에 맞혔어요': 'Bạn đúng M/N ngay lần đầu',
  '보통 속도': 'Tốc độ thường',
  '📚 학습한 모든 단어': '📚 Tất cả từ đã học', '★ 담은 것': '★ Đã lưu',
  '여기까지 학습한 단어 N개입니다': 'Bạn đã học N từ',
  '여기 있는 단어로 복습하기': 'Ôn tập các từ này',
  '자주 틀린 것만 복습하기': 'Chỉ ôn những từ hay sai',
  '찾을 말 (베트남어·한국어)': 'Tìm từ (tiếng Việt · tiếng Hàn)',
  '앞 200개만 보입니다 — 더 적어 보세요': 'Chỉ hiện 200 từ đầu — hãy gõ thêm',
  '아직 학습한 단어가 없습니다. 학습을 한 세트 끝내면 여기에 모입니다.':
    'Chưa có từ nào. Hoàn thành một phần học thì từ sẽ xuất hiện ở đây.',
  '단어 N개쯤 외운 뒤에 보면 더 잘 듣습니다': 'Học khoảng N từ rồi xem sẽ hiểu hơn',
  '듣기로 넘어가기 ›': 'Sang phần nghe ›',
  '스킵': 'Bỏ qua',
  '알림 켜기': 'Bật thông báo', '알림 끄기': 'Tắt thông báo', '계정': 'Tài khoản',
  '최근 찾은 말': 'Từ đã tra gần đây', '이 기기에만 남습니다': 'Chỉ lưu trên máy này', '기록 지우기': 'Xóa lịch sử',
  '찾은 말 기록을 지울까요? 이 기기에서만 지워집니다.': 'Xóa lịch sử tra từ? Chỉ xóa trên máy này.',
  '1초 안에 답하고 틀린 문제가 N개입니다. 모르겠으면 스킵하세요 — 찍은 답은 기록만 망칩니다.': 'Có N câu trả lời sai trong vòng 1 giây. Không biết thì hãy bỏ qua — đoán bừa chỉ làm hỏng hồ sơ.',
  '복습 간격 조정': 'Điều chỉnh khoảng ôn', '일 뒤 정답률': ' ngày sau, tỉ lệ đúng', '문제': ' câu',
  'N개는 스킵했습니다 — 성적에 넣지 않았고, 다음 복습에 다시 나옵니다': 'Đã bỏ qua N câu — không tính điểm, sẽ gặp lại ở lần ôn sau',
  '이번엔 다 스킵했습니다. 스킵한 건 외운 것으로 치지 않습니다': 'Lần này bỏ qua hết. Bỏ qua không tính là đã thuộc',
  '답한 것은 전부 맞혔습니다': 'Những câu đã trả lời đều đúng',
  '스킵한 N문제는 0점입니다 — 시험 점수에만 들고, 실력 분석에는 들지 않습니다': 'N câu bỏ qua tính 0 điểm — chỉ vào điểm thi, không vào phân tích năng lực',
  '스킵한 문제 N개는 어느 통계에도 넣지 않았습니다 — 틀린 게 아니라 아직 안 재 본 것입니다': 'N câu bỏ qua không vào thống kê nào — không phải sai, chỉ là chưa đo',
  '실제 시험처럼 자동으로 나옵니다. 두 번 들려줍니다.':
    'Âm thanh tự phát như thi thật. Sẽ cho nghe hai lần.',
  '읽기 시간이 끝났습니다. 듣기를 시작합니다.':
    'Hết giờ phần đọc. Bắt đầu phần nghe.',
  '문장 고르기': 'Chọn câu',
  '문장 고쳐 주기': 'Sửa câu giúp tôi',
  '미완으로': 'Để chưa xong',
  '배운 기록을 모두 지우고 처음부터 다시 시작할까요?': 'Bạn muốn xóa toàn bộ ghi chép đã học và bắt đầu lại từ đầu?',
  '배운 문장으로 말 걸기': 'Bắt chuyện bằng câu đã học',
  '배울 말씨': 'Giọng muốn học',
  '번역 실패': 'Dịch thất bại',
  '베트남 소식': 'Tin tức Việt Nam',
  '베트남 자판에는 <b>성조 글쇠가 없습니다.</b> 글자를 다 치고': 'Bàn phím tiếng Việt <b>không có phím thanh điệu.</b> Hãy gõ hết chữ rồi',
  '베트남어로 <b>입 밖에 내어</b> 말해 보세요. 속으로만 생각하면 효과가 절반입니다.': 'Hãy <b>nói thành tiếng</b> bằng tiếng Việt. Chỉ nghĩ trong đầu thì hiệu quả giảm một nửa.',
  '보내는 중…': 'Đang gửi…',
  '복습 때가 아니어도 <b>언제든</b> 다시 볼 수 있습니다.': 'Bạn có thể xem lại <b>bất cứ lúc nào</b>, kể cả chưa đến hạn ôn.',
  '복습 시작 (': 'Bắt đầu ôn (',
  '부호를 지우려면 <b>z</b> 를 칩니다. 같은 열쇠를 한 번 더 치면 되돌아갑니다': 'Gõ <b>z</b> để xóa dấu. Gõ lại cùng phím đó sẽ quay về như cũ',
  '북부 소리': 'Giọng miền Bắc',
  '분석 결과 그림으로 저장': 'Lưu kết quả phân tích thành ảnh',
  '분석 공개': 'Công khai phân tích',
  '불러오기 실패': 'Tải thất bại',
  '불러오는 중…': 'Đang tải…',
  '불러오지 못했습니다': 'Không tải được',
  '사람': 'người',
  '사진': 'Ảnh',
  '새': 'Mới',
  '새로고침': 'Tải lại',
  '서버에 저장된 진도가 있습니다.\n이 기기로 불러올까요? 지금 기기의 진도는 덮어써집니다.': 'Có tiến độ đã lưu trên máy chủ.\nBạn muốn tải về thiết bị này? Tiến độ hiện tại trên máy sẽ bị ghi đè.',
  '성조 6개 소개 다시 보기': 'Xem lại phần giới thiệu 6 thanh điệu',
  '성조는 단어 뒤에 <b>f s r x j</b> 를 붙여 찍습니다 (chao+f → chào).': 'Thanh điệu được gõ bằng cách thêm <b>f s r x j</b> sau từ (chao+f → chào).',
  '성조별 정답률': 'Tỷ lệ đúng theo thanh điệu (cộng dồn)',
  '세로 눈금은 <b>내 정답률</b>입니다.': 'Trục dọc là <b>tỷ lệ đúng của bạn</b>.',
  '소리 내어 따라 말해 보세요. 속으로 읽는 것보다 훨씬 잘 남습니다.': 'Hãy nói to theo. Cách này nhớ lâu hơn nhiều so với đọc thầm.',
  '소리 내어 말한 만큼 입이 기억합니다': 'Nói ra miệng bao nhiêu thì miệng nhớ bấy nhiêu',
  '소리 높낮이를 재는 중…': 'Đang đo cao độ giọng nói…',
  '소리로만 나옵니다 — 몇 번이든 다시 들을 수 있습니다.': 'Chỉ phát bằng âm thanh — bạn có thể nghe lại bao nhiêu lần cũng được.',
  '손글씨': 'Viết tay',
  '손으로 쓴 글자는 눈으로만 본 것보다 오래 남습니다': 'Chữ viết tay sẽ nhớ lâu hơn chữ chỉ nhìn bằng mắt',
  '숫자와 기호는 자판의 <b>123</b>, 한글은 <b>베/한</b> 을 누르세요.': 'Số và ký hiệu bấm <b>123</b>, tiếng Hàn bấm <b>Việt/Hàn</b> trên bàn phím.',
  '시작하기': 'Bắt đầu',
  '시험지 받는 중…': 'Đang tải đề thi…',
  '시험지를 받지 못했습니다. 인터넷을 확인하고 다시 열어 주세요.': 'Không tải được đề thi. Hãy kiểm tra kết nối mạng rồi mở lại.',
  '신청': 'Đăng ký',
  '실력 분석': 'Phân tích năng lực',
  '실제 시험과 <b>같은 형식</b>으로 풀어 봅니다.<br>': 'Làm bài theo <b>đúng định dạng</b> của kỳ thi thật.<br>',
  '실제 폰·컴퓨터의 베트남어 자판도 설정에서 추가하는 내장 기능입니다(다운로드 아님).': 'Bàn phím tiếng Việt trên điện thoại và máy tính cũng là chức năng có sẵn, chỉ cần thêm trong cài đặt (không phải tải về).',
  '쓰기 (작문시험)': 'Viết (thi viết)',
  '아이디 (영문·숫자 4~20자)': 'Tên đăng nhập (chữ và số, 4~20 ký tự)',
  '아주 좋습니다 ✔': 'Rất tốt ✔',
  '아직 기사 세트가 없습니다': 'Chưa có phần bài báo nào',
  '아직 끝낸 세트가 없습니다': 'Bạn chưa hoàn thành phần nào',
  '아직 문제 수가 적어 강점·약점을 말할 수 없습니다. 한 주만 더 해 보세요 — 과목마다 10문제가 넘으면 판정합니다.': 'Số câu còn ít nên chưa thể nói về điểm mạnh, điểm yếu. Hãy học thêm một tuần — mỗi kỹ năng vượt 10 câu là sẽ đánh giá được.',
  '아직 배운 단어가 없습니다. 먼저 오늘 학습을 시작해 보세요.': 'Bạn chưa học từ nào. Hãy bắt đầu bài học hôm nay trước.',
  '아직 배운 문장이 없습니다': 'Bạn chưa học câu nào',
  '알겠어요': 'Đã hiểu',
  '알림': 'Thông báo',
  '어제 베트남 소식을 읽으면서 말도 익힙니다. 여기 단어는 <b>복습에 안 들어갑니다</b>.': 'Vừa đọc tin Việt Nam hôm qua vừa học tiếng. Từ ở đây <b>không vào phần ôn tập</b>.',
  '언제든 바꿀 수 있습니다. <b>먼저 쓴 사람이 임자</b>라 겹치는 별명은 못 씁니다.': 'Bạn có thể đổi bất cứ lúc nào. <b>Ai dùng trước thì thuộc về người đó</b> nên không dùng được biệt danh trùng.',
  '얼마나 남아 있는가': 'Còn nhớ được bao nhiêu',
  '업종': 'Ngành nghề',
  '옆으로 밀면 앞뒤로 넘어갑니다. 그냥 두면 3초마다 저절로 넘어갑니다.': 'Vuốt sang ngang để chuyển thẻ. Nếu để yên, cứ 3 giây sẽ tự chuyển.',
  '예: <b>': 'Ví dụ: <b>',
  '예보 출처 — Open-Meteo (무료 기상 자료)': 'Nguồn dự báo — Open-Meteo (dữ liệu khí tượng miễn phí)',
  '오늘 학습 시작': 'Bắt đầu học hôm nay',
  '오늘의 대화': 'Hội thoại hôm nay',
  '오늘의 대화 ·': 'Hội thoại hôm nay ·',
  '왜 이렇게 만들었나': 'Vì sao lại làm như vậy',
  '요일별 접속자': 'Người truy cập theo ngày trong tuần',
  '운영 현황': 'Tình hình vận hành',
  '운영 현황 보기': 'Xem tình hình vận hành',
  '원문 기사 보기 ›': 'Xem bài báo gốc ›',
  '월 화 수 목 금 토 일': 'T2 T3 T4 T5 T6 T7 CN',
  '월평균 기온 · 강수량': 'Nhiệt độ và lượng mưa trung bình tháng',
  '이 기기에서는 녹음을 쓸 수 없습니다.': 'Thiết bị này không dùng được chức năng ghi âm.',
  '이 단어들은 그림·예문·나오는 순서를 손봐야 할 자리입니다.': 'Đây là những từ cần chỉnh lại hình, câu ví dụ hoặc thứ tự xuất hiện.',
  '이 대화로 AI 선생님과 역할극 ›': 'Đóng vai với thầy AI bằng hội thoại này ›',
  '이 사람을 찾지 못했습니다': 'Không tìm thấy người này',
  '이 세트에 <b>미리 나오는 말</b> — 정식으로는 뒤에서 배웁니다': '<b>Từ xuất hiện trước</b> trong phần này — sẽ học kỹ ở bài sau',
  '이렇게도 말합니다': 'Cũng có thể nói như thế này',
  '이름도 기기도 알 수 없습니다 — 서버가 숫자만 셉니다.': 'Không biết được tên hay thiết bị — máy chủ chỉ đếm số lượng.',
  '이름이 뭐예요?': 'Tên bạn là gì?',
  '이번 주': 'Tuần này',
  '이번 주 (': 'Tuần này (',
  '이번 주 시작하기': 'Bắt đầu tuần này',
  '이어서': 'Tiếp tục',
  '읽기 + 질문 5개': 'Đọc to + 5 câu hỏi',
  '자랑 카드 만들기': 'Tạo thẻ khoe thành tích',
  '자주 헷갈리는 짝 (귀 훈련)': 'Cặp hay nhầm (luyện tai)',
  '자판으로 친 단어는 철자까지 정확해집니다': 'Từ gõ bằng bàn phím sẽ chính xác đến từng chữ cái',
  '저장하고 시작': 'Lưu và bắt đầu',
  '전체 평균': 'Trung bình toàn bộ',
  '정답이 하나가 아닌 문제입니다 — <b>AI가 읽고 고칠 점을 알려 줍니다.</b>': 'Đây là dạng bài không chỉ có một đáp án — <b>AI sẽ đọc và chỉ ra chỗ cần sửa.</b>',
  '조금 더 써 주세요 (스무 자 이상).': 'Hãy viết thêm một chút (từ 20 chữ trở lên).',
  '지금 있는 과정은 <b>베트남어(한국인용)</b>뿐입니다.<br>': 'Hiện chỉ có khóa <b>tiếng Việt (dành cho người Hàn)</b>.<br>',
  '지난주 성적표': 'Bảng điểm tuần trước',
  '짜오짜오': 'Chào Chào',
  '쪽지는 <b>암호가 걸려 있지 않습니다</b>. 서버에 30일 남고, 운영자는 마음먹으면 볼 수 있습니다.<br>': 'Tin nhắn <b>không được mã hóa</b>. Lưu trên máy chủ 30 ngày, và quản trị viên có thể xem nếu muốn.<br>',
  '차단하면 그 사람의 쪽지가 들어오지 않습니다.': 'Nếu chặn thì tin nhắn của người đó sẽ không vào nữa.',
  '채점 결과': 'Kết quả chấm',
  '첫 마디를 걸어 보세요': 'Hãy nói câu đầu tiên',
  '초': ' giây',
  '최근 50개 · 30일 뒤 사라짐': '50 bài gần nhất · sẽ mất sau 30 ngày',
  '출처 · Cepeda, Pashler, Vul, Wixted &amp; Rohrer (2006) <i>Psychological Bulletin</i> 132, 354–380 ·': 'Nguồn · Cepeda, Pashler, Vul, Wixted &amp; Rohrer (2006) <i>Psychological Bulletin</i> 132, 354–380 ·',
  '타이핑': 'Gõ phím',
  '틀렸어요 (곧 다시 나옴)': 'Sai rồi (sẽ sớm hiện lại)',
  '하루': 'Một ngày',
  '하루 5분에서 한 세트를 끝내면 여기서 바로 다시 볼 수 있습니다.': 'Khi hoàn thành một phần trong mục 5 phút mỗi ngày, bạn có thể xem lại ngay tại đây.',
  '하루 학습을 한 세트 끝내면 그날 대화 문장이 여기에 들어옵니다.': 'Hoàn thành một phần học trong ngày thì câu hội thoại hôm đó sẽ vào đây.',
  '학습에서 만난 단어는 전부 복습 창고에 들어갑니다. 문제를 <b>맞힐 때마다</b> 그 단어는 더 나중에 나옵니다 —': 'Mọi từ bạn gặp khi học đều vào kho ôn tập. <b>Mỗi lần trả lời đúng</b>, từ đó sẽ xuất hiện lại muộn hơn —',
  '한 주에 <b>5일</b> 공부하면 🛡️ 1개를 받습니다 (최대 2개).<br>': 'Học <b>5 ngày</b> một tuần thì được 1 chiếc 🛡️ (tối đa 2 chiếc).<br>',
  '한국어로 쓰셨네요 — 베트남어로는': 'Bạn đã viết bằng tiếng Hàn — trong tiếng Việt là',
  '화면 언어': 'Ngôn ngữ màn hình',
  '＋ 새 단어 ·': '＋ Từ mới ·',
  '🎤 말하고 채점받기': '🎤 Nói và nhận chấm điểm',
  '💬 현지에서는 ·': '💬 Người bản xứ nói ·',
  '📕 오답노트 (': '📕 Sổ lỗi sai (',
  '🔊 다시 듣기': '🔊 Nghe lại',
  '🔑 한자어': '🔑 Từ Hán Việt',
  '하루 5분': 'Học 5 phút', '일상 단어': 'Từ vựng hằng ngày', '직무 단어': 'Từ vựng công việc',
  '기본기': 'Cơ bản', '문법': 'Ngữ pháp',
  '사용법': 'Hướng dẫn', '일상': 'Hằng ngày', '직무': 'Công việc',
  '기사': 'Bản tin', '단어': 'Từ vựng', '문장': 'Câu', '최근 학습': 'Bài vừa học', '오답노트': 'Sổ lỗi sai',
  '오늘 학습': 'Bài hôm nay', '오늘 복습': 'Ôn hôm nay', '내일 학습': 'Bài ngày mai',
  '내일 복습': 'Ôn ngày mai', '없음': 'Không có', '배운 단어': 'Từ đã học',
  '외운 단어': 'Từ đã thuộc', '끝낸 세트': 'Bài đã xong',
  '진도 백업': 'Sao lưu', '백업 불러오기': 'Khôi phục', '진도 초기화': 'Xóa tiến độ',
  '다음 ›': 'Tiếp ›', '확인 문제 ›': 'Kiểm tra ›', '완료 ›': 'Xong ›', '홈으로': 'Về trang chính',
  '소리 속도': 'Tốc độ đọc',
  '느리게 듣기': 'Nghe chậm', '느리게': 'Chậm', '따라 말하기': 'Nói theo',
  '말하기': 'Nói', '읽기': 'Đọc', '쓰기': 'Viết', '암기': 'Ghi nhớ', '랜덤': 'Ngẫu nhiên',
  '3분': '3 phút', '오늘 완료': 'Xong hôm nay', '지우기': 'Xóa', '채점받기': 'Chấm điểm',
  '정답 보기': 'Xem đáp án', '보내기': 'Gửi', '만들기': 'Tạo', '올리기': 'Đăng',
  '번역': 'Dịch', '바꾸기': 'Đổi', '보기': 'Xem', '받기': 'Nhận',
  /* ── 실전 단어 · 앱 전체 순위 ── */
  '실전 단어': 'Từ vựng thực chiến',
  '실전 단어를 받는 중…': 'Đang tải từ vựng thực chiến…',
  '자료를 못 받았습니다 — 잠시 뒤 다시': 'Không tải được dữ liệu — hãy thử lại sau',
  '중요': 'Quan trọng', '완료 ✔': 'Hoàn thành ✔',
  '개 대기': ' đang chờ', '개': ' từ', '아직': 'Chưa', '불러오기': 'Tải về',
  '정말 지웁니다': 'Xoá thật',
  '서버에 저장된 진도가 있습니다. 이 기기로 불러올까요?<br>지금 기기의 진도는 덮어써집니다.':
  'Máy chủ có tiến độ đã lưu. Tải về máy này?<br>Tiến độ hiện tại sẽ bị ghi đè.',
  '<b>알림을 켰습니다.</b><br>하루 한 번, 그날 아직 공부 안 했을 때만 옵니다.':
  '<b>Đã bật thông báo.</b><br>Mỗi ngày một lần, chỉ khi bạn chưa học.',
  '안 올라갔습니다': 'Không tải lên được',
  '아직 읽은 기사가 없습니다. 기사를 먼저 보세요.': 'Bạn chưa đọc bản tin nào. Hãy xem bản tin trước.', '카드뉴스': 'Thẻ tin',
  '그림을 길게 누르면 폰에 저장됩니다.': 'Nhấn giữ ảnh để lưu vào máy.',
  '기사 복습': 'Ôn bản tin', '사전': 'Từ điển', '내 단어장': 'Sổ từ của tôi',
  '단어 N개 · 베트남어로도 한국어로도 찾습니다': 'N từ · tra được cả tiếng Việt lẫn tiếng Hàn',
  '찾을 말 (성조는 안 찍어도 됩니다)': 'Từ cần tra (không cần dấu)',
  '한 글자만 넣어도 찾습니다': 'Gõ một chữ cũng tra được', '찾는 말이 없습니다': 'Không tìm thấy',
  'N개 찾음': 'Tìm thấy N', '사전, 뜻 구분 없음': 'từ điển, không chia theo nghĩa', '문장 속에서': 'Trong câu', '예문 더 보기': 'Thêm câu ví dụ', '교재 예문': 'Câu ví dụ trong giáo trình', '만든 예문': 'Câu ví dụ tự soạn', '원문에 품사가 없어 판정한 것': 'Từ loại do chúng tôi xác định (bản gốc không ghi)', '단어 시험': 'Kiểm tra từ vựng', '베트남 기사': 'Tin Việt Nam', '기사 N개': 'N bài', '카드뉴스가 아직 없습니다': 'Chưa có thẻ tin', '한자어 맞히기': 'Đoán từ Hán Việt', '맞히기 시작': 'Bắt đầu', '발음 규칙 표': 'Bảng quy tắc âm', '첫소리': 'Phụ âm đầu', '받침': 'Âm cuối', '한자 글자 N쌍을 세어 낸 비율입니다': 'Tỉ lệ đếm từ N cặp chữ Hán', '선배 메모': 'Ghi chú của khóa trước', '선배 예문': 'Câu ví dụ của khóa trước', '보충': 'Bổ sung', '사전 예문': 'Câu ví dụ trong từ điển', '자주 쓰는 말': 'Thông dụng', '앱 속 예문': 'Câu ví dụ trong ứng dụng', '뜻으로 찾은 낱말': 'Tìm theo nghĩa', '발음으로 찾은 낱말': 'Tìm theo cách đọc', '베트남어 낱말': 'Từ tiếng Việt', '영어 뜻으로 찾은 낱말': 'Tìm theo nghĩa tiếng Anh', 'N개': 'N từ', 'N개 더 보기': 'Xem thêm N', '앞 60개만 보입니다 — 더 적어 보세요': 'Chỉ hiện 60 mục đầu — hãy gõ thêm', '아니요': 'Không', '네': 'Vâng', '소리 자동 재생': 'Tự phát âm', '관련': 'Liên quan', '혀 투명': 'Lưỡi trong suốt', '위아래 벌림': 'Mở dọc', '좌우 벌림': 'Mở ngang', '오므림': 'Tròn môi', '베트남 단어': 'Từ tiếng Việt', '영어 뜻': 'Nghĩa tiếng Anh', '문법 고르기': 'Chọn ngữ pháp', '문장에 쓰인 문형을 고른다 (끝낸 문법 과)': 'Chọn mẫu câu được dùng (bài ngữ pháp đã học)', '위 문제를 섞는다': 'Trộn các dạng trên', '문법 카드': 'Thẻ ngữ pháp', '소리 자동 재생 켜짐 — 누르면 끔': 'Đang tự phát âm — bấm để tắt', '소리 자동 재생 꺼짐 — 누르면 켬': 'Đã tắt tự phát âm — bấm để bật',
  ' 에서 탈퇴할까요?': ' — rời câu lạc bộ?', '탈퇴하는 중…': 'Đang rời…', '영역별 정답률': 'Tỷ lệ đúng theo kỹ năng',
  '말하기·듣기·읽기·쓰기·암기': 'Nói · Nghe · Đọc · Viết · Nhớ',
  '모든 문제 유형을 합친 값': 'Gộp mọi dạng câu hỏi', '자주 헷갈리는 짝': 'Cặp hay nhầm',
  '귀 훈련': 'Luyện tai', '두 영역이 10문제를 넘으면 강점·약점과 처방이 나옵니다.':
  'Khi hai kỹ năng vượt 10 câu, bạn sẽ thấy điểm mạnh·yếu và lời khuyên.', '자판 치는 법': 'Cách gõ bàn phím', '갈래': ' nhóm', '챕터': ' chương', '개 문법': ' ngữ pháp', '장': ' thẻ',
  '갈 곳이 정해졌으면 그 갈래만 고르세요': 'Đã biết nơi làm thì chỉ chọn nhóm đó',
  '고른 것 지우기': 'Bỏ chọn', '고름': 'Đã chọn', '고르기': 'Chọn',
  '열두 강 · 그림과 숫자로 읽습니다': '12 buổi · đọc bằng hình và số',
  '「」는 이미 쓰는 사람이 있습니다 — 다른 별명을 지어 주세요.': '「」 đã có người dùng — hãy đặt biệt danh khác.',
  '한 레슨 15단어': 'Mỗi bài 15 từ',
  '선배': 'Khoá trước', '과': ' bài', '끝낸 과': 'Bài đã xong',
  '강': ' buổi', '과정': 'Khoá học', '전체 보기': 'Xem toàn bộ', '핵심만': 'Chỉ phần cốt lõi',
  '핵심': 'Cốt lõi', '기본기 · 문법': 'Nền tảng · Ngữ pháp',
  // 2026-09-28 밤: 문제 수 · 핵심 통일 · 한자·외래어 뿌리
  '문제 수': 'Số câu', '핵심 단어 N개 — 찾는 말을 입력하면 전체에서 찾습니다': 'N từ cốt lõi — nhập từ cần tìm để tìm trong toàn bộ',
  'GYBM 단어 N개 · 핵심 = 교재 단어장·선배 시험·주간 시험에 나온 단어': 'N từ GYBM · Cốt lõi = từ trong bảng từ giáo trình, đề thi khoá trước và thi tuần',
  '옛 한자어': 'Từ Hán cổ', '옛 한자음 섞임': 'Có âm Hán cổ', '한자음': 'Âm Hán Việt',
  '프랑스어': 'tiếng Pháp', '영어': 'tiếng Anh', '광둥어': 'tiếng Quảng Đông', '민난어': 'tiếng Mân Nam', '일본어': 'tiếng Nhật', '한국어': 'tiếng Hàn', '라오어': 'tiếng Lào', '중국어(표준어)': 'tiếng Trung (phổ thông)',
  '문화 · 베트남 바로알기': 'Văn hoá · Hiểu đúng Việt Nam',
  '7권 · 문화와 베트남 바로알기': 'Quyển 7 · Văn hoá và Hiểu đúng Việt Nam',
  '베트남 문화': 'Văn hoá Việt Nam', '베트남 바로알기': 'Hiểu đúng Việt Nam',
  '한 강 15단어 · 복습은 따로 있습니다': '15 từ mỗi buổi · Ôn tập ở mục riêng',
  '네 기수 중 두 기수 이상에 나온 단어만 모았습니다 — 급할 때는 이 길만 걸어도 됩니다.':
    'Chỉ những từ xuất hiện ở từ hai khoá trở lên — khi vội, chỉ cần học phần này.',
  '강의자료 12강': '12 bài giảng',
  '밀어서 넘기면 이 강의 단어 20개와 문장 4개가 나옵니다.':
    'Vuốt để xem 20 từ và 4 câu của bài này.',
  '교재 문법 175': '175 ngữ pháp giáo trình',
  '다 봤어요': 'Đã xem xong',
  '풀던 문제를 그만두고 홈으로 갈까요?': 'Dừng bài đang làm và về trang chính?', '선배 기수가 실제로 시험 본 단어': 'Từ các khoá trước đã thi thật',
  '실전 단어 복습': 'Ôn từ vựng thực chiến',
  '익힌 단어': 'Từ đã luyện',
  '초록 = 앱에서 이미 배운 말': 'Xanh lá = từ đã học trong ứng dụng',
  '하루 5분 복습과 섞이지 않습니다': 'Không trộn với phần ôn tập 5 phút mỗi ngày',
  '이 회차 시험 보기': 'Làm bài thi đợt này',
  '앱 전체 N명 가운데': 'Trong tổng số N người dùng',
  '앱 전체 N명 중': 'Trong tổng số N người',
  '오늘 공부하면 줄에 섭니다.': 'Học hôm nay là bạn sẽ vào bảng.',
  '순위 서버에 못 닿았습니다 — 잠시 뒤 다시 열어 보세요.':
    'Không kết nối được máy chủ xếp hạng — hãy mở lại sau.',
  '내 정보': 'Của tôi', '이름': 'Tên', '지역': 'Vùng miền',
  '계정': 'Tài khoản', '가입': 'Đăng ký', '로그아웃': 'Đăng xuất',
  '로그인·가입': 'Đăng nhập / Đăng ký', '배울 언어': 'Ngôn ngữ học', '보호권': 'Khiên bảo vệ',
  '아이디로 어느 폰에서든 <b>내 별명</b>이 따라옵니다.':
    'Đăng nhập để <b>biệt danh</b> của bạn theo bạn trên mọi điện thoại.',
  '<b>처음 오셨군요!</b> 1분이면 됩니다 — 별명과 아이디만 정하면 끝.':
    '<b>Chào bạn mới!</b> Chỉ mất 1 phút — chọn biệt danh và tên đăng nhập là xong.',
  '· 서버에는 비밀번호의 <b>으깬 값(해시)</b>만 남습니다 — 원문은 저장하지 않습니다.':
    '· Máy chủ chỉ lưu <b>bản mã hóa</b> của mật khẩu — không lưu mật khẩu gốc.',
  '· 이메일이 없어 비밀번호를 잊으면 <b>되찾을 수 없습니다.</b>':
    '· Không có email nên nếu quên mật khẩu thì <b>không lấy lại được.</b>',
  '비밀번호 (8자 이상)': 'Mật khẩu (từ 8 ký tự)',
  '별명': 'Biệt danh',
  '별명 (2~10자) — 순위에 보입니다': 'Biệt danh (2~10 ký tự) — hiện ở bảng xếp hạng',
  '별명 (2~10글자)': 'Biệt danh (2~10 ký tự)',
  '여기에 쓰세요…': 'Viết vào đây…',
  '한 줄 소개 (60자 — 예: 퇴근 후 풋살, 초보 환영)': 'Giới thiệu một dòng (60 ký tự — ví dụ: Đá bóng sau giờ làm, chào người mới)',
  '오늘 배운 것, 한 마디… (베트남어 환영)': 'Hôm nay bạn học được gì? Viết một câu… (tiếng Việt cũng được)',
  '실제 시험과 <b>같은 형식</b>으로 풀어 봅니다.':
    'Làm bài với <b>đúng định dạng</b> của kỳ thi thật.',
  '문항은 우리가 직접 만든 것입니다 — 기출 문제가 아닙니다.':
    'Câu hỏi do chúng tôi tự soạn — không phải đề thi thật.',
  '공통문항': 'Câu hỏi chung', '회차': ' lượt',
  '지난 회차보다 늘었습니다.': 'Bạn đã tiến bộ so với lượt trước.',
  '지난 회차와 같습니다.': 'Bằng với lượt trước.',
  '지난 회차보다 줄었습니다.': 'Thấp hơn lượt trước.',
  '이 여섯 문항은 모든 회차에 똑같이 들어 있습니다. 회차마다 문제가 달라 총점은 흔들릴 수 있지만, 여기 숫자는 회차끼리 그대로 견줄 수 있습니다.':
    'Sáu câu này giống nhau ở mọi lượt thi. Tổng điểm có thể thay đổi vì đề khác nhau, '
    + 'nhưng con số ở đây thì so sánh được giữa các lượt.',
  '짝과 함께': 'Cùng bạn học',
  '자기 것만 여십시오 — 서로 보면 물어볼 것이 없어집니다.':
    'Chỉ mở phần của mình — nếu xem của nhau thì không còn gì để hỏi.',
  '눌러서 보기': 'Nhấn để xem',
  '실제 시험과 같이, 한 번 고른 답은 바꿀 수 없습니다.':
    'Giống kỳ thi thật: đã chọn đáp án thì không đổi được.',
  '말하기 · 쓰기 연습': 'Luyện nói · viết',
  '구술 N세트 · 작문 M제목': 'N bộ nói · M đề viết',
  '틀린 문항 N개': 'N câu sai', '나는 W': 'Tôi là W',
  '멈추기': 'Dừng', '듣기': 'Nghe',
  '오늘 확인 문제': 'Kiểm tra hôm nay', '잘 듣고 알맞은 것을 고르십시오.': 'Nghe kỹ và chọn đáp án đúng.',
  '다시 꺼낼 단어 N개': 'N từ cần ôn lại',
  '세 번 맞히면 쉽니다. 틀리면 되돌아옵니다.':
    'Đúng ba lần thì từ đó nghỉ. Sai thì quay lại.',
  '복습': 'Ôn tập',
  /* 2026-08-31 화면말 검수(ui_audit)에서 빠져 있던 넷 — 베트남 분 화면에 한국어가 그대로 떴다.
     '무엇을 배우시겠습니까?' 는 베트남 분이 앱에서 **맨 처음 보는 문장**이다.
     ui_audit 이 남기는 '나중에 설정에서 바꿀 수 있습니다 ·' 하나는 **일부러 안 넣는다** —
     그 줄은 언어를 아직 안 고른 화면이라 한국어와 베트남어를 나란히 쓴다(app.js:2394). */
  '학습': 'Học',
  '문화': 'Văn hóa',
  '성조만 틀렸어요 — 글자는 맞았습니다': 'Chỉ sai thanh điệu — chữ thì đúng',
  '글자가 틀렸어요': 'Sai chữ',
  '기사 보러가기': 'Xem bài gốc',
  '이번 주 N일 공부': 'Học N ngày tuần này',
  '자유 복습': 'Ôn tập tự do',
  '무엇을 배우시겠습니까?': 'Bạn muốn học gì?',
  '서버 진도': 'Tiến độ trên máy chủ', '나중에 둘러보기': 'Xem sau', '처음이세요? 가입하기': 'Lần đầu? Đăng ký', '이미 계정이 있어요 — 로그인': 'Đã có tài khoản — Đăng nhập', '가입하기': 'Đăng ký', '로그인': 'Đăng nhập', '회원가입': 'Đăng ký', '뭐예요?': 'Là gì?',
  '주간 성적표': 'Bảng điểm tuần', '이름없음': 'Chưa có tên',
  '모음': 'Nguyên âm', '자음': 'Phụ âm', '성조': 'Thanh điệu', '호칭': 'Xưng hô',
  '어순': 'Trật tự từ', '단위': 'Đơn vị', '남부 소리': 'Giọng Nam', '겹모음': 'Nguyên âm đôi',
  '자판 쓰는 법': 'Cách gõ phím', '숫자 읽는 법': 'Cách đọc số',
  '듣고 뜻을 고르세요': 'Nghe và chọn nghĩa', '뜻을 고르세요': 'Chọn nghĩa',
  '베트남어로 말해 보세요': 'Hãy nói bằng tiếng Việt', '듣고 자판으로 쳐 보세요': 'Nghe và gõ lại',
  '듣고 손으로 써 보세요': 'Nghe và viết tay', '모르겠어요': 'Không biết',
  '원어민': 'Người bản xứ', '나': 'Tôi', '번갈아 듣기': 'Nghe lần lượt',
  '발음': 'Phát âm', '높낮이': 'Thanh điệu', '띄어쓰기': 'Dấu cách', '확인': 'OK',
  '천천히': 'Chậm', '그래프를 누르면 아주 느리게(0.2배)': 'Chạm vào biểu đồ để nghe rất chậm (0,2×)', '알아 둘 것': 'Cần nhớ', '북부에서 같은 소리': 'Miền Bắc đọc giống nhau', '다른 소리 — 구별해야 함': 'Âm khác — cần phân biệt', '뜻을 누르면 그 뜻의 유의어·반의어로 바뀝니다': 'Chạm vào một nghĩa để xem từ đồng nghĩa · trái nghĩa của nghĩa đó', '이 뜻의 유의어·반의어는 아직 자료에 없습니다.': 'Chưa có từ đồng nghĩa · trái nghĩa cho nghĩa này.', '발음 면으로 넘기기': 'Chuyển sang mặt phát âm', '단어 면으로 넘기기': 'Chuyển sang mặt từ vựng',
  '원어민 소리 높낮이': 'Cao độ giọng người bản xứ',
  '녹음': 'Ghi âm', '듣기 속도': 'Tốc độ nghe', '재생 위치': 'Vị trí phát', '멈춤': 'Tạm dừng', '재생': 'Phát', '닫기': 'Đóng',
  '이 단어과 헷갈리는 짝이 없습니다.': 'Từ này không có từ dễ nhầm.',
  '유의어': 'Đồng nghĩa', '반의어': 'Trái nghĩa', '뜻이 비슷함': 'Nghĩa gần giống', '뜻이 반대': 'Nghĩa ngược lại', '따라가는 것': 'Hiển thị', '입모양': 'Khẩu hình', '그림': 'Hình',
  /* 탈퇴 · 순위 · 가입 화면 (2026-08-29 대표님 지시) */
  '내 말 (화면에 나올 말)':
    'Ngôn ngữ của tôi (hiện trên màn hình)',
  '탈퇴':
    'Xóa tài khoản',
  '계정과 진도를 지웁니다':
    'Xóa tài khoản và tiến độ',
  '탈퇴하기':
    'Xóa tài khoản',
  '정말 떠나시겠습니까?':
    'Bạn thực sự muốn rời đi?',
  '계정·별명·진도가 <b>모두 지워지고 되돌릴 수 없습니다.</b> 같은 아이디를 다시 쓸 수 없습니다.':
    'Tài khoản, biệt danh và tiến độ sẽ <b>bị xóa hoàn toàn, không thể khôi phục.</b> Bạn không thể dùng lại ID này.',
  '떠나시는 까닭을 알려 주시면 고치겠습니다. 안 고르셔도 나가실 수 있습니다.':
    'Cho chúng tôi biết lý do để cải thiện. Bạn vẫn rời đi được dù không chọn.',
  '너무 어렵습니다':
    'Quá khó',
  '너무 쉽습니다':
    'Quá dễ',
  '시간이 없습니다':
    'Không có thời gian',
  '고장이 잦습니다':
    'Hay bị lỗi',
  '필요한 것이 없습니다':
    'Không có thứ tôi cần',
  '그 밖의 까닭':
    'Lý do khác',
  '더 하실 말씀 (안 쓰셔도 됩니다)':
    'Góp ý thêm (không bắt buộc)',
  '비밀번호를 한 번 더':
    'Nhập lại mật khẩu',
  '비밀번호를 적어 주세요.':
    'Vui lòng nhập mật khẩu.',
  '영영 지우기':
    'Xóa vĩnh viễn',
  '마지막 확인입니다. 지우면 되돌릴 수 없습니다.':
    'Xác nhận lần cuối. Đã xóa thì không khôi phục được.',
  '내 자리는 N위입니다 — 나만 보입니다.':
    'Bạn đang ở hạng N — chỉ mình bạn thấy.',
  '발음과 높낮이 모두 통과':
    'Đạt cả phát âm và thanh điệu',
  '따라 말하기에서 발음과 높낮이가 모두 통과되면':
    'Khi nói theo đạt cả phát âm và thanh điệu',
  '둘 중 하나만 맞아서는 안 됩니다':
    'Chỉ đúng một trong hai thì chưa được',
  '자주 틀리던 단어을 하나 외울 때마다':
    'Mỗi khi thuộc được một từ hay sai',
  '틀린 것을 고친 순간이 가장 값집니다':
    'Khoảnh khắc sửa được lỗi là quý nhất',
  '점수는 <b>효과크기 × 걸리는 시간</b>으로 정했습니다 — 연구가 잰 "얼마나 남는가"에 그 활동에 드는 시간을 곱한 값입니다. 그래서 점수를 좇는 것과 실제로 느는 것이 같은 방향이 됩니다.':
    'Điểm được tính theo <b>độ hiệu quả × thời gian bỏ ra</b> — lấy mức "còn nhớ được bao nhiêu" mà nghiên cứu đo được nhân với thời gian dành cho hoạt động đó. Nhờ vậy, chạy theo điểm cũng chính là tiến bộ thật.',
  '헷갈리는 짝': 'Cặp dễ nhầm',
  '성조만 다른 단어': 'Từ chỉ khác thanh điệu',
  '글자는 같고 높낮이만 다름': 'Cùng chữ, chỉ khác cao độ',
  '모양이 조금 다른 글자': 'Chữ cái hơi khác dạng',
  '성조는 같음': 'Cùng thanh điệu',
  '뜻 미확인': 'Chưa rõ nghĩa',
  '예': 'VD',
  '순서대로 듣기': 'Nghe lần lượt',
  '사전에는 더 있음(뜻 미확인)': 'Trong từ điển còn có (chưa rõ nghĩa)',
  '내렸다 올림': 'Xuống rồi lên',
  '끊었다 올림': 'Ngắt rồi lên',
  '짧고 무겁게': 'Ngắn và nặng',
  '평평하게': 'Bằng phẳng',
  '내려감': 'Xuống',
  '올라감': 'Lên',
  '<b>hỏi</b>와 <b>ngã</b>는 남부·중부에서 한 소리로 합쳐집니다. 북부 소리로는 다릅니다.':
    '<b>hỏi</b> và <b>ngã</b> nhập làm một ở miền Nam và miền Trung. Giọng miền Bắc thì khác nhau.',
  '받침이 <b>p·t·c·ch</b>인 음절은 성조가 <b>sắc</b> 아니면 <b>nặng</b> 둘 중 하나뿐입니다.':
    'Âm tiết kết thúc bằng <b>p·t·c·ch</b> chỉ có thể mang thanh <b>sắc</b> hoặc <b>nặng</b>.',
};
/* 화면 글을 베트남어로 바꾼다.
   'dev' 는 만드는 사람용 — 베트남어 뒤에 한국어 원문을 ⟨ ⟩ 로 같이 붙인다.
   태그(<span>)가 아니라 그냥 글자로 붙이는 이유: 이 함수의 결과가
   innerHTML 로도 가고 textContent 로도 가기 때문이다. 태그를 쓰면 한쪽에서 글자로 새어 나온다. */

const tr = h => {
  if (!S || typeof h !== 'string') return h;
  const v = UIVI[h];
  if (S.ui === 'vi') return v || h;
  if (S.ui === 'dev') return v ? v + ' ⟨' + h + '⟩' : h;
  return h;
};
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = tr(h); return n; };
// 그림: img/ 폴더에 파일이 있으면 그걸, 없으면 이모지를 보여준다 (파일 확인은 브라우저가 알아서)
const pic = (x, cls) => {
  if (!x.emoji && !x.img) return null;
  const d = el('div', cls, esc(x.emoji || ''));
  if (x.img) {
    const im = new Image();
    im.alt = ''; im.src = 'img/' + x.img;
    im.onload = () => { d.textContent = ''; d.append(im); };
  }
  return d;
};
/* 배우는 내용은 **번역하지 않는다.**
   el(태그, 꾸밈, 내용) 은 내용을 tr() 에 넣는다. UI 글귀에는 그게 맞지만
   단어·문장·보기 같은 **내용**까지 사전을 타면 안 된다 —
   화면 말이 베트남어일 때 한국어 단어 '이름'이 'Tên' 으로 바뀌어 나왔다.
   한국어를 배우러 온 사람이 한국어 자리에서 베트남어를 보는 것이다.
   실제로 이렇게 바뀌던 단어이 열다섯 개였다(이름·국적·사람·사진·날씨·하루·
   다시·지역·필요·신청·분).

   고치는 자리는 여기 하나면 된다. tr() 은 이미 '문자열이 아니면 그대로 돌려준다'.
   그러니 esc() 가 원시 문자열 대신 String 객체를 내놓으면 사전을 타지 않는다.
   부르는 쪽 158군데를 손대지 않아도 된다. */
const esc = s => new String(String(s).replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
// 번호는 두 과정 다 Day N 으로 통일. 트랙 구분은 앞에 붙는 '일상/직무' 말이 한다.
const label = d => (typeof d.day === 'string' ? (typeof BASIC_ORDER !== 'undefined' && BASIC_ORDER.includes(d.day) ? '기본기 ' + (BASIC_ORDER.indexOf(d.day) + 1) : '준비 ' + d.day.slice(1))
  : 'Day ' + (d.n || d.day));
const trackName = d => (typeof d.day === 'string' ? '' : d.track === 'work' ? '직무 ' : '일상 ');

/* ---------- 소리 ---------- */
/* 아이폰 사파리는 '사용자가 방금 누른 것'이 아니면 새 Audio 재생을 막는다.
   그래서 Audio 하나를 만들어 두고 주소만 바꿔 쓴다. 한 번 허락되면 그 뒤로는 계속 난다. */
const audio = new Audio();
/* 재생 속도 — 대표님 지시 (2026-09-01): "모든 tts 소리 속도 1배속과 0.7배속 정도로
   다 해줘. 재생 가능하도록." 느린 소리를 **따로 만들지 않는다.** playbackRate 는
   높낮이를 지켜 주므로 성조가 안 뭉개지고, 파일이 한 벌이면 저장소도 반이다
   (전에 느린 파일 16,000개로 1GB에 닿았던 적이 있다). */
const rate = () => Number(S.rate || 0.8);
const myVoice = new Audio();          // 내가 녹음한 것 재생용 (따로 둔다)
/* 아주 느리게(0.4·0.2배) 틀어도 높낮이(성조)는 그대로 — 브라우저 기본값이지만 옛 사파리는 접두어가 필요하다 (2026-09-27) */
[audio, myVoice].forEach(a => { try { a.preservesPitch = true; a.webkitPreservesPitch = true; a.mozPreservesPitch = true; } catch (e) { } });

/* 목소리(여/남) 에 따른 소리 폴더. 남부는 완전히 없앴다(대표님 지시, 2026-09-09). */
const voiceDir = () => S.voice;

/* 느린 소리 — 파일이 있으면 그것을, 없으면 **보통 소리를 늘려서** 들려준다.
   늘리기(playbackRate)는 높낮이를 지켜 주므로 성조가 뭉개지지 않는다.
   느린 파일만 16,000개라 저장소가 1GB에 가까워졌다 — 앞으로 늘 것은 늘리기로 받는다. */
/* 소리 내기. **고른 목소리 말고 다른 목소리로 바꿔 틀지 않는다** (대표님 지시, 2026-08-30):
   "남부 남자로 선택된 상태라면 예문의 단어도 모두 남부 남자가 해야지."
   전에는 남부 파일이 없으면 북부 녹음으로 슬쩍 바꿔 틀었다 — 그래서 남녀·남북이 섞여 들렸다.
   이제 남부 파일이 없으면 기기 목소리로 낸다(성별은 맞춘다). 없는 소리는 내지 않는다. */
/* ── 재생 위치 하나로 묶기 (대표님 지시 2026-09-24·25: 소리·높낮이·입모양·그림을 한꺼번에) ──
   audio.currentTime 하나를 시계로 삼아, 화면에 떠 있는 '보기'(높낮이 그래프 위 단어, 입모양)들이
   자기 단어이 지금 재생 중일 때만 그 시각에 맞춰 움직인다. 보기는 PB.views 에 등록하고,
   화면에서 사라지면(root.isConnected=false) 알아서 빠진다. */
const PB = { views: new Set(), raf: 0, hold: null, spdSrc: null };
/* 지금 audio 가 **이 단어의 고른 목소리 파일**인가 — 여·남은 같은 이름(해시)이라 폴더까지 봐야 한다(목소리를 바꾼 뒤 옛 목소리를 이어 트는 일이 없게) */
const ownsAudio = h => !!h && !!audio.src && audio.src.includes('/' + voiceDir() + '/n/' + h + '.mp3');
/* 보기(입모양·높낮이 그래프)가 지금 소리 위치를 따라야 하는가 — 재생 중이거나, 사용자가 재생 막대로 멈춰 둔 자리(hold)일 때 */
const pbLive = (h, playing) => ownsAudio(h) && (playing || PB.hold === h);
function pbTick() {
  const playing = !audio.paused && !audio.ended, mine = !myVoice.paused && !myVoice.ended;   // mine: 내 녹음을 듣는 중
  PB.views.forEach(v => {
    if (!v.root.isConnected) { PB.views.delete(v); return; }
    try { v.update(playing, mine); } catch (e) { }
  });
  PB.raf = (playing || mine) ? requestAnimationFrame(pbTick) : 0;
}
audio.addEventListener('play', () => { if (!PB.raf) PB.raf = requestAnimationFrame(pbTick); });
audio.addEventListener('ended', () => { PB.hold = null; });
['pause', 'ended', 'emptied', 'seeked'].forEach(ev => audio.addEventListener(ev, () => { setTimeout(pbTick, 0); }));
myVoice.addEventListener('play', () => { if (!PB.raf) PB.raf = requestAnimationFrame(pbTick); });
['pause', 'ended', 'emptied', 'seeked'].forEach(ev => myVoice.addEventListener(ev, () => { setTimeout(pbTick, 0); }));

function play(text, slow, dir, spd) {
  /* 대소문자 구분 없이 찾는다 — 문장 첫머리라 대문자로 들어온 단어(Đây, Bạn...)도
     소문자 표제어 녹음을 그대로 쓴다(2026-09-09, 위 tapLine 주석 참고). */
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  const d = dir || voiceDir();
  if (!h) { speakVi(text, false, spd ? spd : (slow ? rate() * .7 : 0), S.voice); return; }
  audio.pause();
  PB.hold = null;
  PB.spdSrc = spd ? `audio/${d}/n/${h}.mp3` : null;      // 단어 카드의 속도 단추(0.6·0.8·1배)로 튼 소리인가
  audio.onerror = null;
  /* 조금 느리게 튼다 (대표님 지시 2026-08-31) — 원어민 속도가 초보에겐 빠르다.
     playbackRate 는 높낮이를 지켜 주므로 성조가 뭉개지지 않는다. */
  /* **느리게 단추가 실제로 느려지게 한다** (대표님 지시 2026-09-03:
     "원래 속도로 재생하는 버튼과, 좀 느리게 재생하는 버튼을 만들어 주라").
     전에는 slow 를 받아 놓고 쓰지 않아 두 단추가 같은 속도로 났다.
     설정에서 고른 속도를 바탕으로, 느리게는 거기서 한 번 더 늦춘다. */
  /* **순서가 진짜 원인이었다** (대표님 지적, 2026-09-09: "0.8배속인데 존나 빠르게 느껴짐").
     src 를 나중에 넣으면 브라우저(특히 아이폰 사파리)가 새 소리를 불러오면서
     playbackRate 를 조용히 1배로 되돌린다 — 그래서 설정을 0.8로 바꿔도 실제로는
     계속 1배로 나고 있었다. 이 파일 다른 다섯 곳(예: 8783줄)은 이미 src 먼저였는데
     제일 많이 쓰이는 이 자리만 거꾸로였다. 순서만 바꾼다. */
  audio.src = `audio/${d}/n/${h}.mp3`;
  const r = spd ? spd : (slow ? Math.max(.5, rate() * .7) : rate());
  /* 그래프를 누르면 **무조건 0.2배** (대표님 지시 2026-09-29) — 사파리는 새 소리를 불러오면서 속도를 기본값(1배)으로
     되돌리는 일이 있다. 기본 속도(defaultPlaybackRate)까지 같이 넣고, 소리가 실제로 시작되면 한 번 더 맞춘다 */
  audio.defaultPlaybackRate = r;
  audio.playbackRate = r;
  const want = audio.src;
  audio.addEventListener('playing', () => { if (audio.src === want && audio.playbackRate !== r) audio.playbackRate = r; }, { once: true });
  audio.onerror = () => { audio.onerror = null; speakVi(text, false, spd ? spd : (slow ? rate() * .7 : 0), S.voice); };
  audio.currentTime = 0;
  audio.play().catch(() => { });
}
/* 소리 미리 받기 (2026-09-28 밤, 대표님: "단어 누르면 소리가 바로 나오게 — 재생 시작이 늦다. 속도 말고").
   누를 때 받기 시작하면 인터넷 왕복만큼 늦다 → 화면에 낱말이 뜨는 순간 그 소리를 미리 받아 둔다(서비스 워커 캐시에 남는다).
   같은 파일은 한 번만. 폰 TTS(녹음 없는 낱말)는 첫 터치 때 소리 없이 한 번 깨워 둔다 — 첫 호출이 씹혀 0.45초 늦던 것 */
const PREF = new Set();
function prefetchSnd(texts) {
  setTimeout(() => (texts || []).forEach(t => {
    const s = String(t || '').replace(/[,.!?;:"“”‘’'()]/g, '').trim();
    if (!s) return;
    const h = AIDX[s] || AIDX[s.toLowerCase()];
    if (!h) return;
    const url = `audio/${voiceDir()}/n/${h}.mp3`;
    if (PREF.has(url)) return;
    PREF.add(url);
    fetch(url).catch(() => PREF.delete(url));
  }), 0);
}
addEventListener('pointerdown', function ttsWarm() {
  removeEventListener('pointerdown', ttsWarm, true);
  try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'vi-VN'; speechSynthesis.speak(u); } } catch (e) { }
}, true);
function playMine() {
  if (!REC.url) return;
  myVoice.pause();
  myVoice.src = REC.url;
  myVoice.currentTime = 0;
  myVoice.play().catch(() => { });
}

/* 정답·오답 소리 — 답한 '즉시' 오는 피드백이 늦게 오는 피드백보다 낫다.
   소리는 짧고 작게(0.2초), 진동은 안드로이드에서만 울린다.
   이 함수는 앱 안의 모든 퀴즈 종류(단어 맞추기·성조·타이핑·문형 등, 18곳)가
   정답 판정 직후 공통으로 부른다 — 그래서 정답 세리머니를 여기 한 곳에만 붙이면
   어떤 퀴즈에서 풀든 똑같이 나온다(대표님 지시, 2026-09-15: "xp 마스코트 세레머니를
   하나로 합쳐줘. 화려하기보다는 그래도 절제되지 않게" — 아이콘+글 한 덩어리로,
   화면을 다 덮는 컨페티는 안 쓰고 짧게 뜨고 사라지는 배지 하나로 절충한다). */
function fxTone(ok) {
  if (typeof Q !== 'undefined' && Q && Q.blind && Q._answered) return;   // 실제 시험처럼 — 맞았는지 소리로도 알리지 않는다 (2026-09-30)
  try {
    const c = getCtx(), t = c.currentTime;
    if (ok) [880, 1318].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.07, t + i * .09);
      g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .12);
      o.connect(g); g.connect(c.destination);
      o.start(t + i * .09); o.stop(t + i * .09 + .13);
    });
    else {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = 196;
      g.gain.setValueAtTime(.06, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + .2);
    }
    navigator.vibrate?.(ok ? 12 : 60);
  } catch (e) { }
  celebrate(ok);
}
/* 연속 정답 — 이 세션(새로고침 전까지) 동안만 센다. 저장 안 함 —
   진짜 실력 지표(S.stats)와 섞이면 안 되는, 그저 지금 흥이 오르고 있다는 표시일 뿐. */
let FX_STREAK = 0;
/* 보석 — 대표님 지시(2026-09-15): "하트보석 시스템은 좋아. 게임느낌도잇어야한다.
   재밋어야해... 화려하기보다는 그래도 절제되지 않게... 너무 듀오링고를 카피해서
   짝퉁 느낌이 나면 안된다." 목숨(하트)처럼 막는 장치는 안 둔다 — 이 앱은 실전
   시험 준비용이라, 틀렸다고 더 못 풀게 막으면 공부가 아니라 훼방이 된다.
   대신 보석은 순전히 보상(맞힐 때마다 쌓이는 것)이라 안전하다 — 정답 판정이
   모이는 이 한 곳(celebrate)에서만 주면 18곳 호출부를 하나도 안 건드려도 된다. */
/* 콤보 → 동 (대표님 지시 2026-09-27 밤: "6연속 정답 팝업 좋아. 콤보처럼. 맞출수록·콤보가 클수록 동 더"). 다이아몬드(보석)는 뺐다.
   맞힐 때마다 1동, 3연속부터 2동, 5연속 3동, 10연속 5동, 20연속 8동. 돈은 짜오 상점에서 쓴다. */
const comboGain = n => n >= 20 ? 8 : n >= 10 ? 5 : n >= 5 ? 3 : n >= 3 ? 2 : 1;
function celebrate(ok) {
  if (typeof Q !== 'undefined' && Q && Q.blind && Q._answered) return;
  if (!ok) { FX_STREAK = 0; return; }
  FX_STREAK++;
  const gain = comboGain(FX_STREAK);
  earn(gain, tr('정답'));
  const old = document.querySelector('.celebrate'); if (old) old.remove();
  const el2 = document.createElement('div');
  el2.className = 'celebrate' + (FX_STREAK >= 5 ? ' big' : '');
  el2.innerHTML = '<span class="celeb-t">' +
    (FX_STREAK >= 2 ? tr(FX_STREAK + '연속 정답!') : tr('정답이에요!')) +
    '</span><span class="celeb-gem">' + COIN_SVG + '+' + gain + tr('동') + '</span>';
  document.body.append(el2);
  requestAnimationFrame(() => el2.classList.add('on'));
  setTimeout(() => { el2.classList.remove('on'); setTimeout(() => el2.remove(), 220); }, 1100);
}

/* 성조를 화살표로 그린다 — 이름 없이 방향과 끝점만. 화살촉이 소리가 끝나는 곳이다 */
const TARR = {
  'ngang': { d: 'M3 10 L15 10',                     x: 16,   y: 10,   a: 0 },
  'sắc':   { d: 'M4 15.5 L14.5 6.5',                x: 16,   y: 5.2,  a: -40 },
  'huyền': { d: 'M4 4.5 L14.5 13.5',                x: 16,   y: 14.8, a: 40 },
  'hỏi':   { d: 'M4 5 C6.5 15.5, 10.5 16, 14 10.5', x: 15,   y: 9.3,  a: -45 },
  'ngã':   { d: 'M3 15 L8 11 M11 8.2 L14.5 5.4',    x: 15.8, y: 4.4,  a: -38 },
  'nặng':  { d: 'M8.5 4 L12.5 10',                  x: 13.5, y: 11.6, a: 56, dot: [16, 15.5] },
};
function toneArrow(name) {
  const t = TARR[name] || TARR['ngang'];
  return `<svg viewBox="0 0 20 20" class="tarr"><path d="${t.d}"/>` +
    `<g transform="translate(${t.x} ${t.y}) rotate(${t.a})"><path d="M-4.4 -3 L0 0 L-4.4 3"/></g>` +
    (t.dot ? `<circle cx="${t.dot[0]}" cy="${t.dot[1]}" r="1.7"/>` : '') + `</svg>`;
}
/* 단어를 크게 — 글자 위에 성조 화살표를 얹어 한 덩어리로 보여준다.
   전에는 큰 글자와 작은 성조칩이 따로 있어 같은 단어가 두 번 보였다.
   누르면 소리가 난다(버튼을 따로 두지 않는다 — 그림 자리를 벌기 위해). */
function bigWord(vi, tones, onTap) {
  const b = el('button', 'bigw');
  b.type = 'button';
  /* 성조 정보가 없는 단어(GYBM 메인·서브·줌·선배 단어 7천여 개)은 **글자에서 성조를 읽어** 화살표를 그린다.
     전에는 전부 'ngang'(평평)으로 그려서 chào·đến·này 같은 단어도 평평한 화살표가 붙었다(2026-09-24 발견). */
  const list = (tones || []).length ? tones : vi.split(' ').map(sy => ({ syl: sy, name: sibToneOf(sy) }));
  list.forEach(t => {
    const u = el('span', 'bwsyl ' + t.name);
    u.append(el('b', null, esc(t.syl)), el('i', null, toneArrow(t.name)));
    if (t.ko) u.title = t.name + ' · ' + t.ko;
    b.append(u);
  });
  b.onclick = onTap || (() => play(vi, false));
  return b;
}
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M9 6.5 17 12 9 17.5Z"/></svg>',
  slow: '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>',
};
const iconBtn = (kind, title, fn) => {
  const b = el('button', 'ibtn ' + kind, ICON[kind]);
  b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
  b.onclick = fn;
  return b;
};

function toneRow(tones, small) {
  const r = el('div', 'tones' + (small ? ' sm' : ''));
  (tones || []).forEach(t => {
    const b = el('span', 'tchip ' + t.name);
    b.append(el('i', null, esc(t.syl)), el('b', null, toneArrow(t.name)));
    b.title = t.name + ' · ' + t.ko;
    r.append(b);
  });
  return r;
}

/* ---------- 헷갈리는 짝 ----------
   대표님 제안(2026-09-24): 단어 하나를 볼 때 ① 성조만 다른 단어 ② o·ô·ơ 처럼 글자 모양이 조금 다른
   단어도 같이 본다. 자료 data/siblings.json 은 tools/build_siblings.py 가 글자 규칙으로 만든다.
   뜻은 앱 안 단어과 사전(영어 위키단어·한국어기초사전 겹침 → 눈 검수)에서만 가져온다 — 근거가 없는 짝은 화면에 올리지 않는다(2026-09-26, tools/apply_sib_meanings.py).
   처음 배울 때 관련 단어을 한꺼번에 외우면 오히려 헷갈린다는 연구(의미 군집)가 많아서, 단어 카드에서는
   접어 두고 퀴즈에서 틀렸을 때만 펼쳐 보여 준다. */
let SIB = null, SIBP = null;
/* 낱말 뜻 찾기 — 여러 자료를 차례로: 앱 낱말(DICT) → 뜻 목록(_senses, 흔한 차례) → 짝 사전(sib.json 한국어 뜻) → 참고 사전(_dict_ko, 검수본) */
async function meaningOf(vi) {
  const k0 = String(vi || '').trim().toLowerCase();
  if (!k0) return '';
  for (const k of (toneAlt(k0) === k0 ? [k0] : [k0, toneAlt(k0)])) {      // toà 로 적힌 말도 tòa 로 찾는다
    try { const d = dictBuild(); const hit = Array.isArray(d) && d.find(x => String(x.vi).toLowerCase() === k); if (hit && hit.ko) return hit.ko; } catch (e) { }
    try { await sensesLoad(); const ss = SENSES && SENSES[k]; if (ss && ss.length) return ss.join(' · '); } catch (e) { }
    try { const s = await sibLoad(); const w = s && s.w && s.w[k]; if (w && w.k) return w.k; } catch (e) { }
    try { if (!DKO) DKO = await fetch('data/_dict_ko.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})); const e = DKO[k]; if (e) return Array.isArray(e) ? e.join(' · ') : String(e); } catch (e) { }
  }
  /* 다른 표기(quản lí/quản lý·hoà/hòa)로 한 번 더 — 같은 차례로 (2026-09-29) */
  try { const d = dictBuild(); const c = viCanon(k0); const hit = Array.isArray(d) && d.find(x => !x.ref && viCanon(x.vi) === c); if (hit && hit.ko) return hit.ko; } catch (e) { }
  try { await sensesLoad(); const k = canonFind(SENSES, k0); if (k && SENSES[k].length) return SENSES[k].join(' · '); } catch (e) { }
  try { const s = await sibLoad(); const k = s && canonFind(s.w, k0); if (k && s.w[k].k) return s.w[k].k; } catch (e) { }
  try { const k = canonFind(DKO, k0); if (k) { const e = DKO[k]; return Array.isArray(e) ? e.join(' · ') : String(e); } } catch (e) { }
  return '';
}
/* 성조 표시 자리 두 가지 — 옛 꼴 hòa·tòa·khỏe·thúy 와 새 꼴 hoà·toà·khoẻ·thuý 는 같은 말이다.
   음절 끝의 oa·oe·uy 에서 성조 자리를 바꿔 본다 (자료마다 섞여 있어 한쪽으로만 찾으면 뜻이 안 나온다, 2026-09-28 밤) */
const TONE_ALT = (() => {
  const m = {}, t = ['̀', '́', '̉', '̃', '̣'];
  ['oa', 'oe', 'uy'].forEach(p => t.forEach(c => {
    const a = (p[0] + c).normalize('NFC') + p[1], b = p[0] + (p[1] + c).normalize('NFC');
    m[a] = b; m[b] = a;
  }));
  return m;
})();
const TONE_ALT_RE = new RegExp('(' + Object.keys(TONE_ALT).join('|') + ')(?![a-zà-ỹđ])', 'g');
const toneAlt = s => String(s).replace(TONE_ALT_RE, x => TONE_ALT[x]);
let DKO = null, DKH = null;          // 참고 사전 뜻 · 표제어 대문자 꼴 (소문자 열쇠 → 원래 꼴)
/* 사전 한 벌 (2026-10-01, 대표님: "위키는 그대로 — 품사·모든 뜻·차례 그대로·유의어·반의어·영어로도 검색") — data/_dict_full.json
   {소문자 표제어: {h 표제어, p [품사 표시], s [한국어 뜻], y [유의어], a [반의어], v 다른 표기의 원래 꼴, k 위키 밖 굳은 말}} (tools/dict_full/merge_full.py) */
let DFULL = null, KO2VI = null;     // KO2VI = 한국어 → 베트남어 (국립국어원 한국어기초사전 대역, data/_ko2vi.json)
/* 품사가 같은 뜻끼리 묶어 한 줄 글로: "[명] 탁자 · 판 · [동] 의논하다" — 사전 목록 줄과 검색에 쓴다 */
function dfullText(e) {
  let out = '', last = null;
  e.s.forEach((t, i) => { const p = e.p[i] || ''; if (p !== last) { out += (out ? ' · ' : '') + (p ? '[' + p + '] ' : ''); last = p; } else out += ' · '; out += t; });
  return out;
}
/* 사전 낱말 카드의 뜻 칸 — 품사별로 번호를 매겨 모든 뜻을 위키 차례 그대로, 밑에 유의어·반의어(누르면 그 낱말 카드) */
function dfullBox(e, back) {
  const box = el('div', 'dfull');
  let ol = null, last = null;
  e.s.forEach((t, i) => {
    const p = e.p[i] || '';
    if (p !== last || !ol) {
      const g = el('div', 'dfg');
      /* 원문(옛 무료 사전 FVDP)에 품사가 없어 우리가 판정한 것은 점선 테두리로 (tools/dict_pos, 2026-10-01) */
      if (p) { const ps = el('span', 'dfpos' + ((e.pj || []).includes(i) ? ' pj' : ''), esc(p)); if ((e.pj || []).includes(i)) ps.title = tr('원문에 품사가 없어 판정한 것'); g.append(ps); }
      ol = el('ol', 'dfol'); g.append(ol); box.append(g); last = p;
    }
    /* [보충] — 위키에 없던 흔한 뜻(nhạc nhẹ 경음악). 수업 자료·국립국어원 한국어기초사전 대역에서 찾아 클로드가 검사해 넣은 것(tools/dict_sup, 2026-10-01) */
    ol.append(el('li', null, esc(t) + ((e.b || []).includes(i) ? ' <small class="dfsup">' + tr('보충') + '</small>' : '')));
  });
  // 유의어·반의어 줄은 '헷갈리는 짝'으로 옮겼다 (대표님 2026-10-01 밤 "유의어와 반의어는 헷갈리는 짝에 넣는 게 좋을 것 같은데?") — dictRel()
  if (e.v) box.append(el('div', 'dfnote', tr('다른 표기') + ': ' + esc(e.v)));
  return box;
}
function sibLoad() {
  if (SIB) return Promise.resolve(SIB);
  if (!SIBP) SIBP = fetch('data/sib.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { sibIndex(j); return (SIB = j); }).catch(() => { SIBP = null; return null; });
  return SIBP;
}
const SIB_T = ['ngang', 'huyền', 'sắc', 'hỏi', 'ngã', 'nặng'];
const SIB_KO = { 'ngang': '평평하게', 'huyền': '내려감', 'sắc': '올라감', 'hỏi': '내렸다 올림',
                 'ngã': '끊었다 올림', 'nặng': '짧고 무겁게' };
const sibToneOf = s => {
  const m = s.normalize('NFD').match(/[̣̀́̃̉]/);
  return m ? { '̀': 'huyền', '́': 'sắc', '̃': 'ngã', '̉': 'hỏi', '̣': 'nặng' }[m[0]] : 'ngang';
};
/* 성조 부호 자리만 다른 표기(hòa/hoà)는 같은 단어로 본다 */
const sibKey = s => stripTone(s) + '|' + sibToneOf(s);
const sibBase = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
/* 비슷한 소리·모양 단어 (대표님 지시 2026-09-27: "o·u·d 만 넣지 말고 비슷한 건 다") —
   음절을 [첫 자음][모음][받침]+성조로 쪼개어, 한 부분만 헷갈리기 쉬운 짝으로 바꿔 본다. 성조는 그대로 둔다.
   바꾼 결과가 sib.json 에 있는 진짜 음절일 때만 보여 준다(없는 글자는 안 나온다). */
const SIB_SYL = /^(ngh|ng|nh|ph|th|tr|ch|gh|gi|kh|qu|[bcdđghklmnpqrstvx])?([aăâeêioôơuưy]+)(ch|c|ng|nh|n|m|p|t)?$/;
function sibParse(s) {
  const m = SIB_SYL.exec(stripTone(s.toLowerCase()));
  return m ? { i: m[1] || '', v: m[2], f: m[3] || '', t: sibToneOf(s) } : null;
}
const sibPairMap = pairs => { const m = {}; pairs.forEach(([a, b]) => { (m[a] = m[a] || new Set()).add(b); (m[b] = m[b] || new Set()).add(a); }); return m; };
const SIB_VOW = sibPairMap([['a', 'ă'], ['a', 'â'], ['ă', 'â'], ['e', 'ê'], ['ê', 'i'], ['e', 'i'], ['i', 'y'], ['o', 'ô'], ['o', 'ơ'], ['ô', 'ơ'],
                            ['u', 'ư'], ['o', 'u'], ['ô', 'u'], ['ơ', 'ư'], ['â', 'ơ'], ['a', 'o'], ['e', 'a']]);
const SIB_VGRP = [['ia', 'iê', 'yê', 'ya'], ['ua', 'uô'], ['ưa', 'ươ'], ['uy', 'ui'], ['oa', 'ua'], ['ai', 'ay'], ['ao', 'au'], ['âu', 'ao'], ['ây', 'ai']];
const SIB_INI = sibPairMap([['ch', 'tr'], ['s', 'x'], ['d', 'gi'], ['d', 'r'], ['gi', 'r'], ['d', 'đ'], ['l', 'n'], ['n', 'nh'], ['ng', 'nh'], ['ng', 'n'],
                            ['kh', 'h'], ['kh', 'c'], ['kh', 'k'], ['t', 'th'], ['t', 'đ'], ['t', 'tr'], ['c', 'k'], ['c', 'q'], ['g', 'gh'], ['ng', 'ngh'],
                            ['b', 'd'], ['b', 'đ'], ['b', 'p'], ['b', 'v'], ['m', 'n'], ['b', 'm'], ['ph', 'b'], ['th', 'kh'], ['x', 'ch'], ['', 'h'], ['g', 'ng']]);
const SIB_FIN = sibPairMap([['n', 'ng'], ['ng', 'nh'], ['n', 'nh'], ['n', 'm'], ['t', 'c'], ['c', 'ch'], ['t', 'ch'], ['p', 't'], ['m', 'p'], ['', 'n'], ['', 'ng'], ['', 'nh'], ['', 'm'], ['', 'c'], ['', 't']]);
let SIB_IDX = null;
function sibIndex(j) {
  SIB_IDX = new Map();
  Object.keys(j.w).forEach(w => {
    if (w.indexOf(' ') >= 0) return;
    const p = sibParse(w);
    if (!p) return;
    const k = p.i + '|' + p.v + '|' + p.f + '|' + p.t;
    (SIB_IDX.get(k) || SIB_IDX.set(k, []).get(k)).push(w);
  });
}
/* 단어 s 에서 한 부분만 바꾼 진짜 음절들 — {v: 모음, i: 첫 자음, f: 받침} 각각 배열 */
function sibNear(s, exclude) {
  const p = sibParse(s), out = { v: [], i: [], f: [] };
  if (!p || !SIB_IDX) return out;
  const seen = new Set([s]);
  const grab = (kind, i, v, f) => {
    (SIB_IDX.get(i + '|' + v + '|' + f + '|' + p.t) || []).forEach(w => {
      if (seen.has(w) || (exclude && exclude(w))) return;
      seen.add(w); out[kind].push(w);
    });
  };
  const vs = new Set();
  [...p.v].forEach((ch, x) => (SIB_VOW[ch] || []).forEach(c => vs.add(p.v.slice(0, x) + c + p.v.slice(x + 1))));
  SIB_VGRP.forEach(g => { if (g.includes(p.v)) g.forEach(c => c !== p.v && vs.add(c)); });
  vs.forEach(v => grab('v', p.i, v, p.f));
  (SIB_INI[p.i] || []).forEach(i => grab('i', i, p.v, p.f));
  (SIB_FIN[p.f] || []).forEach(f => grab('f', p.i, p.v, f));
  const rank = w => (SIB.w[w] && SIB.w[w].p ? 0 : 1);
  Object.keys(out).forEach(k => out[k].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'vi')));
  return out;
}
/* 단어의 음절마다 짝(가족)을 찾는다 — 자기 말고 짝이 하나라도 있는 음절만 돌려준다.
   가족 셋(대표님 지시 2026-09-27: 모양 비슷한 것·성조 다른 것 다 넣는다):
     tone  글자는 같고 성조만 다름(ma·mà·má…)        shape 성조는 같고 모음·đ 모양만 다름(mua·mưa)
     skel  글자 뼈대(부호 뺀 글자)가 같은 나머지 전부(mua·mùa·mưa·múa·mừa…) — 위 둘에 안 든 것만 따로 보여 준다 */
function sibFams(vi) {
  const seen = new Set(), out = [];
  vi.toLowerCase().replace(/[.,!?;:…"'“”‘’()]/g, ' ').split(/\s+/).filter(Boolean).forEach(s => {
    if (seen.has(s)) return;
    seen.add(s);
    const tf = SIB.t[stripTone(s)], sf = SIB.s[sibBase(s) + '|' + SIB_T.indexOf(sibToneOf(s))], kf = SIB.k[sibBase(s)];
    const other = f => f && f.some(x => sibKey(x) !== sibKey(s));
    const inT = new Set(tf || []), inS = new Set(sf || []);
    const rest = kf ? kf.filter(x => sibKey(x) !== sibKey(s) && !inT.has(x) && !inS.has(x)) : [];
    const b0 = sibBase(s);
    const nr = sibNear(s, x => sibBase(x) === b0);          // 글자 뼈대가 같은 것(위 세 가족)은 빼고, 다른 글자로 바뀐 것만
    const has = a => (a.length ? a : null);
    if (other(tf) || other(sf) || rest.length || nr.v.length || nr.i.length || nr.f.length)
      out.push({ s, tf: other(tf) ? tf : null, sf: other(sf) ? sf : null, kf: rest.length ? rest : null, vf: has(nr.v), if_: has(nr.i), ff: has(nr.f) });
  });
  return out;
}
/* 단어의 동의어·반의어 (없으면 null) */
/* 사전(위키낱말사전 Synonyms·Antonyms 칸)의 유의어·반의어 — 헷갈리는 짝 자료(sib.json)에 이미 있는 것은 빼고.
   'vô#Prefix' 같은 접두사·접미사 표시는 낱말이 아니라 뺀다. 우리 사전에 없는 낱말(뜻을 보일 수 없음, Bạch Hải)도 뺀다. 사전(DFULL)을 불러 둔 때만(사전 카드) */
/* 짝 줄에 붙일 사전 뜻 — 대문자로 시작하면(Bơn 베른) 고유명사 뜻만, 아니면 고유명사가 아닌 첫 뜻. 사전은 대소문자를 한 표제어에 합쳐 두어서(bơn 모래톱 + Bơn 베른) 그냥 첫 뜻을 쓰면 남의 뜻이 붙는다 */
function dictGloss(w) {
  const e = typeof DFULL !== 'undefined' && DFULL && DFULL[String(w).toLowerCase().trim()];
  if (!e) return '';
  const cap = /^[A-ZÀ-ỸĐ]/.test(String(w).trim()) && String(w).trim() !== String(w).trim().toLowerCase();
  const i = e.p.findIndex(p => cap ? p === '고유' : p !== '고유');
  return i < 0 ? '' : e.s[i];
}
/* 사전(위키) 유의어·반의어를 '헷갈리는 짝'에 보이는 것은 **껐다** (2026-10-02). 위키의 {{syn}}·{{ant}} 는 뜻 하나에 붙는데 우리 자료(src.json y·a)는
   표제어 단위로 합쳐 받아, 다른 뜻·다른 낱말(동형어)의 짝이 섞였다 — chim(새) 유의어에 비속어, ông(할아버지) 유의어에 vì(왜냐하면), tủ(장)↔phủ(덮다).
   앱 낱말 3,738 가운데 이 자료로 짝이 더해지던 146개를 다 보니 대부분 틀렸다. 뜻별로 다시 뽑아 검수하기 전까지는 검수된 짝(data/sib.json)만 보인다 */
const DICT_REL_ON = false;
function dictRel(vi) {
  if (!DICT_REL_ON) return null;
  const e = typeof DFULL !== 'undefined' && DFULL && DFULL[String(vi).toLowerCase().trim()];
  if (!e || !(e.y || e.a)) return null;
  const sr = SIB && sibRel(vi), have = new Set([...((sr && sr.s) || []), ...((sr && sr.a) || [])].map(w => w.toLowerCase()));
  const clean = l => [...new Set((l || []).filter(w => !/#(Prefix|Suffix)/i.test(w)).map(w => w.split('#')[0].trim())
    .filter(w => w && w.toLowerCase() !== String(vi).toLowerCase().trim() && !have.has(w.toLowerCase()) && dictGloss(w)))];   // 뜻을 보일 수 있는(사전에 있는) 낱말만
  const r = { s: clean(e.y), a: clean(e.a) };
  return r.s.length || r.a.length ? r : null;
}
function sibRel(vi) {
  const w = SIB.w[vi.toLowerCase().trim()];
  return w && ((w.s && w.s.length) || (w.a && w.a.length)) ? w : null;
}
/* 모양 짝은 어느 글자가 다른지 색으로 짚어 준다 (o ↔ ô ↔ ơ) — 성조 부호는 빼고 모음 모양만 견준다 */
function sibDiff(syl, cur) {
  const a = [...syl.normalize('NFC')], ta = a.map(c => stripTone(c)), tb = [...cur.normalize('NFC')].map(c => stripTone(c));
  let p = 0; while (p < ta.length && p < tb.length && ta[p] === tb[p]) p++;
  let q = 0; while (q < ta.length - p && q < tb.length - p && ta[ta.length - 1 - q] === tb[tb.length - 1 - q]) q++;
  return a.map((ch, i) => i >= p && i < a.length - q ? '<u class="dif">' + esc(ch) + '</u>' : esc(ch)).join('');
}
/* 짝 한 줄: 단어 · 뜻(한국어, 없으면 이 음절이 든 예) · ▶ — 영어 뜻은 화면에 안 올린다(대표님 지시) */
function pairRow(word, cur, mode) {
  const w0 = SIB.w[word] || {};
  const key = recKey(word), tn = sibToneOf(word.split(' ')[0]);
  const r = el('div', 'prow' + (cur && (word === cur || (word.indexOf(' ') < 0 && cur.indexOf(' ') < 0 && sibKey(word) === sibKey(cur))) ? ' cur' : ''));
  const one = word.indexOf(' ') < 0;
  const w = el('span', 'psyl ' + (one ? tn : ''));
  w.append(el('b', null, (mode === 'shape' || mode === 'sim') && word !== cur ? sibDiff(word, cur) : esc(word)));
  if (one) w.append(el('i', null, toneArrow(tn)));
  const m = el('span', 'pmn');
  if (w0.k) m.append(el('span', 'pko', esc(w0.k)));
  else if (w0.x) m.append(el('span', 'pko no', tr('예') + ' <b>' + esc(w0.x[0]) + '</b> ' + esc(w0.x[1] || '')));
  else if (dictGloss(word)) m.append(el('span', 'pko', esc(dictGloss(word))));   // 사전 유의어·반의어(짝 자료 밖) — 사전 첫 뜻
  // 성조 이름(ngang · 평평하게 …) 글은 뺐다 (대표님 지시 2026-09-27 밤) — 화살표만
  /* 낱말을 누르면 그 낱말의 카드로 (대표님 지시 2026-09-30: "헷갈리는 짝 팝업에서 단어 누르면 그 단어 카드로") — 뒤로 가면 원래 화면 */
  w.classList.add('tapword'); w.title = tr('이 낱말 카드로');
  w.onclick = () => pairToCard(word);
  r.append(w, m);
  /* 소리 단추는 **늘** 있다 (대표님 지시 2026-09-27: 짝 단어 모두 TTS). 우리 소리 파일이 있으면 그것을, 아직 없으면 기기 목소리로 */
  const b = iconBtn('play', tr('듣기'), () => key ? play(key, false, null, pairSpd()) : speakVi(word, false, pairSpd()));
  b.classList.add('playi');
  r.append(b);
  return r;
}
/* 짝 목록의 낱말 → 그 낱말 카드 (2026-09-30). 사전이 아는 낱말이면 사전 항목(뜻·발음·파트) 그대로, 모르면 짝 자료의 뜻만으로 카드를 연다.
   뒤로 가기: 카드에서 왔으면 그 카드로(L 을 되돌려 다시 그림), 문제 풀이에서 왔으면 다음 문제로(답한 문제를 다시 그리면 두 번 채점될 수 있다),
   그 밖은 보통 뒤로 가기와 같다. 팝업은 닫는다. */
async function pairToCard(word) {
  const L0 = L, v0 = CURV, t0 = $('#title').textContent, c0 = LCRUMB, tab0 = ACTIVE_TAB;
  document.querySelectorAll('.modalback').forEach(b => b.remove());
  try { await dictReady(); } catch (e) { }
  const k = viCanon(word);
  const w0 = (SIB && SIB.w[word]) || {};
  const x = (DICT || dictBuild()).find(e => viCanon(e.vi) === k) || { vi: word, ko: w0.k || '', kr: krOf(word) || '' };
  const back = () => {
    L = L0; LCRUMB = c0; ACTIVE_TAB = tab0;
    if (v0 === 'quiz' && typeof Q !== 'undefined' && Q) { show('quiz', t0, true); Q.i++; drawQuiz(); }
    else if (v0 === 'learn' && L0 && L0.items && L0.items[L0.i]) { drawCard(); show('learn', t0, true); drawLessonTabs(); }
    else { const f = NAV.pop(); (f || renderHome)(); }
  };
  openWordCard(x, back);
}
/* 성조 가족을 순서대로 들려준다 — 같은 글자에 높낮이만 다른 소리를 이어서 듣는 것이 핵심이다 */
function pairSeq(items, rows, wrap, btn) {
  if (wrap._seq) { wrap._seq = false; return; }
  wrap._seq = true;
  btn.classList.add('on');
  (async () => {
    for (let i = 0; i < items.length && wrap._seq && wrap.isConnected; i++) {
      const key = recKey(items[i]);
      if (!key) continue;
      rows.forEach(r => r.classList.remove('now'));
      rows[i].classList.add('now');
      play(key, false, null, pairSpd());
      const nat = await nativeCurve(key);
      const endAt = nat && nat.e ? nat.e + .1 : 0;                 // 소리가 들리는 끝까지만 (파일 뒤 무음은 기다리지 않는다)
      await new Promise(res => {
        const t = setTimeout(res, 2400);
        const iv = setInterval(() => { if (audio.paused || audio.ended || (endAt && audio.currentTime >= endAt)) { clearTimeout(t); clearInterval(iv); res(); } }, 40);
      });
      await new Promise(r => setTimeout(r, 250));
    }
    rows.forEach(r => r.classList.remove('now'));
    wrap._seq = false;
    btn.classList.remove('on');
  })();
}
function pairPanel(vi, opt) {
  const o = opt || {};
  const wrap = el('div', o.bare ? 'pairbox bare' : 'pairbox');
  const lk0 = o.lk !== undefined ? o.lk : curLessonKey();
  let sel = null;                                   // 지금 고른 뜻 번호 — 처음엔 기본 뜻
  sibLoad().then(() => sensesLoad()).then(() => sdefLoad()).then(() => {          // 뜻 목록·기본 뜻도 같이 — 동의어·반의어를 뜻별로 나누는 데 쓴다
    if (!SIB || !wrap.isConnected) return;
    const fams = sibFams(vi), rel = sibRel(vi), drel = dictRel(vi);
    if (!fams.length && !rel && !drel) return;
    const head = el('button', 'pairhead', '<span>' + tr('헷갈리는 짝') + '</span><i class="pchev">▾</i>');
    head.type = 'button';
    const body = el('div', 'pairbody');
    let cur = 0, built = false;
    const CAP = 8;                                    // 처음엔 여덟 줄만, 나머지는 [더 보기]
    const section = (title, note, list, s, mode) => {
      const sec = el('div', 'psec');
      sec.append(el('div', 'ptitle', tr(title) + '<span>' + tr(note) + '</span>'));
      const rows = list.map(x => pairRow(x, s, mode));
      rows.forEach((r, i) => { if (i >= CAP) r.hidden = true; sec.append(r); });
      if (rows.length > CAP) {
        const more = el('button', 'ghost sm pmore', '＋ ' + (rows.length - CAP) + tr('개 더 보기'));
        more.type = 'button';
        more.onclick = () => { rows.forEach(r => { r.hidden = false; }); more.remove(); };
        sec.append(more);
      }
      if (mode === 'tone' && list.filter(x => recKey(x)).length > 1) {
        const b = el('button', 'ghost sm pseq', '▶ ' + tr('순서대로 듣기'));
        b.type = 'button';
        b.onclick = () => pairSeq(list, rows, wrap, b);
        sec.append(b);
      }
      return sec;
    };
    const draw = () => {
      body.textContent = '';
      if (!o.bare) {                               // 카드 안에 펼친 짝 목록에도 제 속도 토글 (팝업은 머리에 있다)
        const sp = el('div', 'pspdrow');
        sp.append(el('span', null, tr('짝 듣기 속도')), spdChip({ pair: true }));
        body.append(sp);
      }
      if (rel) {                                   // 동의어·반의어는 눌린 단어 전체 기준 — 음절 고르기와 상관없이 늘 위에
        /* **뜻별로** (대표님 지시 2026-09-28 밤: "같은 단어라도 어떤 뜻에 포커싱되어 있냐에 따라 동의어·반의어가 달라진다").
           rel.m = {짝: 뜻 번호} (tools/rel_sense/뜻별_짝.tsv, 클로드 판정). 지금 보는 뜻(o.ko)의 짝을 맨 위에 굵은 뜻 이름과 함께,
           나머지는 뜻 이름 밑에 나눠 보인다. 판정이 없는 낱말은 예전처럼 한 줄로 */
        /* **고른 뜻 하나만** (대표님 지시 2026-09-28: "헷갈리는 짝 팝업에서 뜻을 고르면 그 뜻 기준으로 동의어·반의어") —
           rel.m = {짝: 뜻 번호} (tools/rel_sense·tools/sense_review, 클로드 판정). 처음엔 이 수업의 기본 뜻. 뜻 목록이 없는 낱말은 예전처럼 한 줄로 */
        const ss = rel.m && SENSES && SENSES[vi.toLowerCase().trim()];
        if (!ss) {
          if (rel.s && rel.s.length) body.append(section('유의어', '뜻이 비슷함', rel.s, '', 'rel'));
          if (rel.a && rel.a.length) body.append(section('반의어', '뜻이 반대', rel.a, '', 'rel'));
        } else {
          if (sel == null) sel = senseDefault(vi, o.ko, lk0) || 1;
          const of = list => (list || []).filter(x => { const v = rel.m[x]; return Array.isArray(v) ? v.includes(sel) : (v || 0) === sel; });   // 한 짝이 여러 뜻의 짝일 수 있다([1,2])
          const syn = of(rel.s), ant = of(rel.a);
          const sec = el('div', 'psec');
          sec.append(el('div', 'prelsense cur', '<i>' + sel + '</i>' + esc(ss[sel - 1])));
          if (!syn.length && !ant.length) sec.append(el('div', 'pnote', tr('이 뜻의 유의어·반의어는 아직 자료에 없습니다.')));
          body.append(sec);
          if (syn.length) body.append(section('유의어', '뜻이 비슷함', syn, '', 'rel'));
          if (ant.length) body.append(section('반의어', '뜻이 반대', ant, '', 'rel'));
        }
      }
      /* 사전의 유의어·반의어 (2026-10-01 밤) — 위키는 뜻별로 나뉘어 있지 않아 '뜻 구분 없음'으로 따로 */
      if (drel) {
        if (drel.s.length) body.append(section('유의어', rel ? '사전, 뜻 구분 없음' : '뜻이 비슷함', drel.s, '', 'rel'));
        if (drel.a.length) body.append(section('반의어', rel ? '사전, 뜻 구분 없음' : '뜻이 반대', drel.a, '', 'rel'));
      }
      if (fams.length > 1) {
        const sel = el('div', 'psel');
        fams.forEach((f, i) => {
          const b = el('button', 'pchip pick' + (i === cur ? ' on' : ''), esc(f.s));
          b.type = 'button';
          b.onclick = () => { cur = i; draw(); };
          sel.append(b);
        });
        body.append(sel);
      }
      const F = fams[cur];
      if (F) {
        if (F.tf) body.append(section('성조만 다른 단어', '글자는 같고 높낮이만 다름', F.tf, F.s, 'tone'));
        if (F.sf) body.append(section('모양이 조금 다른 글자', '성조는 같음', F.sf, F.s, 'shape'));
        if (F.vf) body.append(section('모음이 비슷한 단어', 'o·u · ô·ơ · a·ă·â · e·ê·i 처럼 모음만 바뀜', F.vf, F.s, 'sim'));
        if (F.if_) body.append(section('첫 자음이 비슷한 단어', 'ch·tr · s·x · d·gi·r · l·n · d·đ 처럼 첫소리만 바뀜', F.if_, F.s, 'sim'));
        if (F.ff) body.append(section('받침이 비슷한 단어', 'n·ng·nh · t·c·ch · m·p 처럼 받침만 바뀜', F.ff, F.s, 'sim'));
        if (F.kf) body.append(section('비슷하게 생긴 다른 글자', '글자 모양·성조가 모두 다름', F.kf, F.s, 'skel'));
        const tn = F.tf ? F.tf.map(x => sibToneOf(x)) : [];
        if (tn.includes('hỏi') && tn.includes('ngã'))
          body.append(el('div', 'pnote', '<b>hỏi</b>와 <b>ngã</b>는 남부·중부에서 한 소리로 합쳐집니다. 북부 소리로는 다릅니다.'));
        if (/(p|t|c|ch)$/.test(F.s) && ['sắc', 'nặng'].includes(sibToneOf(F.s)))
          body.append(el('div', 'pnote', '받침이 <b>p·t·c·ch</b>인 음절은 성조가 <b>sắc</b> 아니면 <b>nặng</b> 둘 중 하나뿐입니다.'));
      }
    };
    if (o.api) o.api({ setSense(i) { sel = i; if (built) draw(); } });
    const set = open => {
      head.classList.toggle('on', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.hidden = !open;
      if (open && !built) { built = true; draw(); }
    };
    head.onclick = () => set(body.hidden);
    if (o.bare) { wrap.append(body); set(true); }        // 팝업 안에서는 머리 단추 없이 바로 펼친다
    else { wrap.append(head, body); set(!!o.open); }
  });
  return wrap;
}

/* 단어을 누르면 **팝업**으로 헷갈리는 짝을 보여 준다 (대표님 지시 2026-09-26) — 단어 면·발음 면 똑같이. */
function pairPopup(vi, info) {
  const inf = info || {};
  const back = el('div', 'modalback');
  const box = el('div', 'modalbox pairpop');
  const hd = el('div', 'pairpophd');
  hd.append(el('b', null, esc(vi)));
  if (inf.kr) hd.append(el('span', 'pkr', '[' + esc(inf.kr) + ']'));
  /* 재생 단추 + **짝 전용 속도**(카드 속도와 별개 — 대표님 지시 2026-09-27; 기본 0.8배 — 2026-09-29 밤) */
  const pl = iconBtn('play', tr('듣기'), () => { const k = recKey(vi); k ? play(k, false, null, pairSpd()) : speakVi(vi, false, pairSpd()); });
  pl.classList.add('playi');
  const grp = el('span', 'pspd');
  grp.append(pl, spdChip({ pair: true }));
  hd.append(grp);
  box.append(hd);
  const lk = inf.lk !== undefined ? inf.lk : curLessonKey();       // 이 팝업이 열린 수업 — 기본 뜻을 고르는 데 쓴다
  let panelApi = null;
  if (inf.ko) { const pk = el('div', 'pairpopko', esc(inf.ko)); box.append(pk); sensePick(pk, vi, inf.ko, lk, i => { if (panelApi) panelApi.setSense(i); }); rootPills(pk, { vi, ko: inf.ko }); }   // 뜻 여러 개 — 골라서 짝 바꾸기 (2026-09-28) · 한자·외래어 뿌리
  { const so = southOf(vi); if (so) box.append(southLine(so)); }   // 남부 말이면 북부 말도 (2026-09-29)
  const sub = el('div', 'pairpopsub', tr('헷갈리는 짝'));
  const body = el('div', 'pairpopbody');
  const ok = el('button', 'primary big', tr('닫기'));
  ok.style.width = '100%';
  const close = () => { const w = body.firstChild; if (w) w._seq = false; back.remove(); };
  ok.onclick = close;
  box.append(sub, body, ok);
  // 팝업이 떠 있는 채로도 오류를 보낼 수 있게 (대표님 지시 2026-09-27) — 짝 단어이 보고에 같이 붙는다
  const rp = el('button', 'ghost sm bugsm', '⚑ ' + tr('이 화면 오류 보고'));
  rp.type = 'button'; rp.onclick = () => bugReport({ pair: vi });
  box.append(rp);
  back.append(box);
  back.onclick = e => { if (e.target === back) close(); };
  document.body.append(back);
  sibLoad().then(() => {
    if (!SIB) { body.append(el('div', 'pnote', tr('불러오지 못했습니다'))); return; }
    if (!sibFams(vi).length && !sibRel(vi) && !dictRel(vi)) { body.append(el('div', 'pnote', tr('이 단어과 헷갈리는 짝이 없습니다.'))); return; }
    body.append(pairPanel(vi, { bare: true, ko: inf.ko, lk, api: a => { panelApi = a; } }));   // 골라진 뜻(처음엔 기본 뜻)의 동의어·반의어만 (2026-09-28)
  });
}

/* 대화 전체를 순서대로 재생한다 */
async function playSeq(list, rows) {
  const view = 'learn';
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if ($('#' + view).hidden) { (rows || []).forEach(r => r.classList.remove('now')); return; }
    if (rows) { rows.forEach(r => r.classList.remove('now')); rows[i]?.classList.add('now'); }
    const h = AIDX[t];
    if (!h) continue;
    audio.pause();
    audio.src = `audio/${voiceDir()}/n/${h}.mp3`;
    audio.defaultPlaybackRate = audio.playbackRate = rate();
    audio.currentTime = 0;
    await new Promise(res => {
      audio.onended = audio.onerror = res;
      audio.play().catch(res);
      setTimeout(res, 9000);
    });
    audio.onended = audio.onerror = null;
    await new Promise(r => setTimeout(r, 400));
  }
  (rows || []).forEach(r => r.classList.remove('now'));
}


/* ---------- 따라 말하기 ----------
   산출 효과(production effect): 눈으로만 보는 것보다 소리 내어 말하면 기억이 크게 좋아진다.
   그리고 남이 읽어주는 걸 듣는 것보다 '내가 말한 것'이 더 잘 남는다(운동 정보 + 자기참조).
   자동 채점은 하지 않는다 — 성조 채점은 지금 기술로 못 믿는다. 나란히 듣고 사람이 판단한다. */
let REC = { stream: null, mr: null, url: null, key: null, localHeard: null, sr: null };
const HAND_AI = false;   // 손글씨 AI 채점 기능 제외 (대표님 지시 2026-09-08) — 손글씨 연습·자가채점은 그대로 둔다
/* 발음 판정을 폰 안(브라우저 내장 음성인식)에서 먼저 시도한다 (대표님 지시 2026-09-08).
   구글 제미나이 호출을 아예 없애는 게 아니라 — 브라우저가 못 알아들으면(지원 안 하거나 결과가 비면)
   그때만 기존 제미나이 방식으로 넘어간다. 아직 실제 폰에서 검증 전이라 폴백을 반드시 남겨둔다. */
const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
/* 실제 폰 테스트에서 "인식이 안 된다"고 나온 원인을 찾았다(2026-09-09):
   음성인식 결과(onresult)는 stop() 을 부른다고 바로 오지 않고 조금 뒤에 이벤트로 온다.
   그런데 녹음이 끝나자마자(REC.localHeard 를) 바로 읽어버려서 늘 비어 있었다 —
   **결과를 기다리지 않고 확인한 것**이 진짜 원인이다. 그래서 startLocalASR()이
   "결과가 오면(또는 최대 4초 안에) 끝나는 약속(Promise)"을 REC.localDone 에 남기고,
   판정하는 쪽(aiListen 등)이 그 약속을 기다린 뒤에 REC.localHeard 를 읽도록 고쳤다. */
/* 빠르고 정확하게 (대표님 지시 2026-09-28 밤: "인식 속도 빠르고 정확도 높게, 무료로") — 폰 내장 인식만 쓴다(무료).
   ① 전에는 '2초 기다림'을 녹음 **시작**부터 셌다. 녹음은 말이 끝나고 0.66초 뒤 저절로 멈추는데(liveRec),
      폰 인식의 답은 멈춘 **뒤** 0.3~1.5초에 온다 → 답이 오기 전에 기다림이 끝나 소리 비교(덜 정확)로 넘어갔다.
      이제 기다림은 녹음이 **끝난 때**부터 센다(stopLocalASR). 녹음 시작부터는 먹통 방지용 넉넉한 한도만.
   ② 인식이 '확정' 답을 주면 end 를 기다리지 않고 바로 판정한다. 녹음 중에 확정 답이 오면 녹음도 바로 끝낸다.
   ③ 후보를 여럿(5) 받아, 그 안에 목표 낱말이 있으면 그것으로 본다 — 짧은 낱말은 폰이 더 흔한 말을 첫 후보로 적기 쉽다. */
const ASR_AFTER_STOP = 2500;
function startLocalASR() {
  REC.localHeard = null; REC.localErr = null; REC.localAlts = [];
  /* 왜 실패했는지를 반드시 남긴다(2026-09-27 저녁, 대표님: "높낮이는 O·X 가 되는데 발음은 표시가 안 된다").
     전에는 결과가 없으면 아무 말 없이 '…' 만 남았다 — 폰에서 무엇이 잘못됐는지 알 길이 없었다. */
  if (!SRClass) { REC.localErr = 'unsupported'; REC.localDone = Promise.resolve(); REC.localFinish = null; return; }
  REC.localDone = new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; REC.localFinish = null; resolve(); } };
    REC.localFinish = finish;
    try {
      const r = new SRClass();
      r.lang = learnKo() ? 'ko-KR' : 'vi-VN';
      r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
      r.onresult = e => {
        const res = e.results[e.results.length - 1];
        const alts = [];
        for (let i = 0; i < res.length; i++) if (res[i] && res[i].transcript) alts.push(res[i].transcript);
        REC.localAlts = alts;
        REC.localHeard = alts[0] || null;
        if (res.isFinal !== false && REC.localHeard) {
          finish();                                                          // ② 확정 답 → 바로
          if (REC.mr && REC.mr.state === 'recording') { try { REC.mr.stop(); } catch (x) { } }
        }
      };
      r.onerror = e => { REC.localErr = (e && e.error) || 'error'; };
      r.onnomatch = () => { if (!REC.localErr) REC.localErr = 'nomatch'; };
      r.onend = finish;      // 결과가 없어도(못 알아들어도) end 는 반드시 온다
      r.start();
      REC.sr = r;
      setTimeout(() => { if (!done && !REC.localHeard && !REC.localErr) REC.localErr = 'timeout'; finish(); }, 12000);   // 먹통 방지 한도(녹음 최대 7초 + 여유)
    } catch (e) { REC.sr = null; REC.localErr = 'start:' + (e && e.name || 'error'); finish(); }
  });
}
/* 소리 비교(judge.js) 후보 — 목표 + 헷갈리는 짝(성조·모양·글자 가족) + 같은 음절 수의 다른 단어. 녹음이 있는 것만, 최대 8 */
function jgCands(text) {
  const key = t => String(t || '').toLowerCase().trim();
  const h = AIDX[text] || AIDX[key(text)];
  if (!h) return null;
  const out = [{ vi: text, h }], seen = new Set([key(text)]);
  const add = v => { if (!v || typeof v !== 'string' || seen.has(key(v))) return; const hh = AIDX[v] || AIDX[key(v)]; if (!hh) return; seen.add(key(v)); out.push({ vi: v, h: hh }); };
  try { if (typeof SIB !== 'undefined' && SIB) sibFams(text).forEach(f => [f.tf, f.sf, f.kf, f.vf, f.if_, f.ff].forEach(a => (a || []).forEach(add))); } catch (e) { }
  const syl = key(text).split(/\s+/).length;
  const pool = allWords().map(w => w.vi).filter(v => v && key(v).split(/\s+/).length === syl);
  for (let i = 0; i < 60 && out.length < 8 && pool.length; i++) add(pool[Math.floor(Math.random() * pool.length)]);
  return out.length >= 3 ? out : null;
}
/* 폰 인식이 답을 안 줬을 때 — 소리 비교로 판정해 본다. 돌려주는 것: {ok, heard} / {ok:null, why} / null(못 잼) */
async function soundFallback(text, blobUrl) {
  let c = REC.cands && REC.cands[0] && REC.cands[0].vi === text ? REC.cands : null;
  if (!c) { try { await sibLoad(); } catch (e) { } c = jgCands(text); }   // 헷갈리는 짝을 후보에 넣으려면 짝 자료가 먼저 있어야 한다
  if (!c || typeof soundJudge !== 'function' || !blobUrl) return null;
  try { return await soundJudge(text, blobUrl, c); } catch (e) { return null; }
}
/* 폰 음성 인식이 아무것도 못 돌려줬을 때 화면에 적을 까닭 — 원인 코드도 작게 같이 적는다(폰 화면을 보고 고칠 수 있게) */
function asrFailText() {
  const e = REC.localErr || '';
  const why = e === 'unsupported' ? '이 브라우저에는 음성 인식이 없습니다 — 아이폰은 사파리에서 열어 보세요'
    : e === 'not-allowed' || e === 'service-not-allowed' ? '음성 인식 권한이 꺼져 있습니다 — 폰 설정에서 이 브라우저의 음성 인식(받아쓰기)을 켜 주세요'
    : e === 'audio-capture' ? '음성 인식이 마이크를 못 잡았습니다 — 다른 앱이 마이크를 쓰고 있는지 보세요'
    : e === 'no-speech' || e === 'nomatch' ? '말소리를 못 알아들었습니다 — 폰을 입 가까이 대고 조금 크게'
    : e === 'network' ? '음성 인식에는 인터넷이 필요합니다'
    : e === 'language-not-supported' ? '이 폰은 베트남어 음성 인식을 지원하지 않습니다'
    : e === 'aborted' ? '인식이 중간에 끊겼습니다 — 다시 말해 보세요'
    : e === 'timeout' ? '음성 인식이 답을 주지 않았습니다 — 다시 말해 보세요'
    : '아무것도 못 알아들었습니다 — 조금 크게 다시';
  return why + (e ? ' <small>(' + esc(e) + ')</small>' : '');
}
function stopLocalASR() {
  try { REC.sr && REC.sr.stop(); } catch (e) { }
  const f = REC.localFinish;                 // ① 기다림은 녹음이 끝난 때부터 — 2.5초 안에 답이 없으면 소리 비교로
  if (f) setTimeout(() => { if (REC.localFinish === f) { if (!REC.localHeard && !REC.localErr) REC.localErr = 'timeout'; f(); } }, ASR_AFTER_STOP);
}
/* 폰 인식 결과를 기존 askSpeech()와 같은 모양({heard, ok, pick})으로 바꾼다 —
   호출하는 쪽(aiListen 등)을 안 건드리려고 반환 형태를 맞춘다. */
function judgeLocalHeard(text, heard) {
  const clean = x => String(x || '').toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
  /* ③ 폰이 준 후보 여럿 중 목표와 같은 것이 있으면 그것을 들은 말로 본다 (글자·성조 부호까지 같거나, 부호를 떼고 같거나).
     성조는 이 줄이 아니라 높낮이 곡선이 따로 본다 */
  const alts = (REC.localAlts || []).filter(Boolean);
  if (alts.length > 1 && !sayOpts(text)) {
    const exact = alts.find(a => clean(a) === clean(text));
    const loose = exact || alts.find(a => stripTone(clean(a)) === stripTone(clean(text)));
    if (loose) heard = loose;
  }
  const opts = sayOpts(text);
  if (opts) {
    const h = clean(heard);
    const hit = opts.find(o => clean(o) === h || (h && h.includes(clean(o))));
    return { heard: hit || heard, ok: hit ? hit === text : null, pick: true };
  }
  const ok = clean(heard) === clean(text) || stripTone(clean(heard)) === stripTone(clean(text));
  return { heard, ok, pick: false };
}

/* 카드를 넘기거나 화면을 떠나면 녹음 상태를 비운다.
   안 그러면 앞 단어의 녹음이 다음 카드에서 '내 소리'로 재생된다. */
function resetRec() {
  try { if (REC.mr && REC.mr.state === 'recording') REC.mr.stop(); } catch (e) { }
  if (REC.url) { URL.revokeObjectURL(REC.url); REC.url = null; }
  REC.mr = null; REC.key = null;
  releaseMic();
}

/* 마이크는 다 쓰면 반드시 놓아준다. 안 놓으면 폰에 녹음 표시가 계속 뜬다. */
/* 마이크 — 녹음이 끝나도 90초는 잡고 있는다(다음 녹음 때 '허용?'을 또 묻지 않게, 대표님 지시 2026-09-27 밤). 화면을 떠나거나 앱이 숨으면 바로 놓는다 */
let MIC_T = 0;
function releaseMic(force) {
  clearTimeout(MIC_T);
  if (!REC.stream) return;
  if (!force) { MIC_T = setTimeout(() => releaseMic(true), 90000); return; }
  REC.stream.getTracks().forEach(t => t.stop());
  REC.stream = null;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseMic(true); });

const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

async function toggleRec(text, btn, box) {
  if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
  // '녹음은 어디에 남나요' 안내창은 뺐다 (대표님 지시 2026-09-28). 녹음은 서버로 가지 않고 폰 안에서만 잠깐 쓴다는 사실은 그대로다
  try {
    if (!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    box.textContent = '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.';
    return;
  }
  const chunks = [];
  const mr = new MediaRecorder(REC.stream);
  REC.mr = mr; REC.key = text;
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    stopLocalASR();                    // 폰 음성인식도 같이 끝낸다
    releaseMic();                      // 녹음이 끝나면 마이크를 놓는다
    if (REC.url) URL.revokeObjectURL(REC.url);
    REC.url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
    btn.dataset.on = '0';
    btn.classList.remove('rec-on');
    bumpSaid();
    drawCompare(text, box);
  };
  const secs = RECSEC(text);
  const kill = liveRec(box, REC.stream, secs, () => { if (mr.state === 'recording') mr.stop(); });
  const oldStop = mr.onstop;
  mr.onstop = e => { kill(); oldStop(e); };
  startLocalASR();                     // 녹음 시작과 동시에 폰 음성인식도 같이 켠다
  mr.start();
  REC.cands = null;                    // 소리 비교 후보를 미리 만들고 원어민 소리를 데워 둔다 — 녹음이 끝나면 바로 견준다 (2026-09-28)
  if (typeof soundJudge === 'function') sibLoad().catch(() => { }).then(() => { const c = jgCands(text); if (c) { REC.cands = c; jgPrepare(c); } });
  btn.dataset.on = '1';
  btn.classList.add('rec-on');       // 이름은 그대로, 녹음 중은 색으로만 알린다
  setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, secs * 1000);
}


/* ---------- 녹음 중 실시간 표시 ----------
   말하는 동안 음높이가 그려진다. 끝나고 나서야 보는 것보다, 말하면서 보는 쪽이
   자기 소리를 고치는 데 낫다. 45ms 창으로 60ms마다 한 점 — 폰에서도 가볍다.
   함께 하는 일: 남은 시간 표시 · **폰을 입 가까이 대라**는 안내 · 너무 작으면 알려 주기. */
const RECSEC = t => (String(t || '').trim().split(/\s+/).length > 1 ? 7 : 3.5);   // 문장 7초 · 단어 3.5초

function liveRec(box, stream, secs, onStop) {
  /* 녹음은 **화면 전체**로 알린다. 작은 상자 안에서 하니 사람들이
     지금 녹음 중인지, 어디를 눌러야 끝나는지 몰라 헤맸다.
     한가운데 빨간 네모 하나 — 그것만 누르면 끝나고 원래 화면으로 돌아온다. */
  box.textContent = '';
  const wrap = el('div', 'recfull');
  const left = el('b', 'recleft', secs.toFixed(1));
  const head = el('div', 'rechead');
  head.append(el('span', 'livedot'), el('span', null, '녹음 중'), left, el('span', 'recsec', '초'));
  const stop = el('button', 'recstop', '');
  stop.setAttribute('aria-label', '녹음 끝내기');
  stop.append(el('i', 'recsq'));
  stop.onclick = () => onStop && onStop();
  const cv = el('canvas', 'livecv'); cv.width = 640; cv.height = 150;
  const tip = el('div', 'livetip', '<b>폰을 입 가까이</b> 대고 또박또박 말하세요');
  const hint = el('div', 'rechint', '다 말했으면 <b>가운데 빨간 네모</b>를 누르세요');
  wrap.append(head, stop, cv, tip, hint);
  document.body.append(wrap);

  const ctx = getCtx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser(); an.fftSize = 2048;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  const pts = [];
  const t0 = performance.now();
  let quiet = 0, raf = 0, last = 0, dead = false, spoke = false;   // spoke: 한 번이라도 소리를 냈나

  const draw = () => {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const v = pts.filter(p => p !== null);
    if (v.length > 2) {
      const lo = Math.min(...v), hi = Math.max(...v), sp = Math.max(4, hi - lo);
      g.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent') || '#3b6ef6';
      g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      let started = false;
      pts.forEach((p, i) => {
        if (p === null) { started = false; return; }
        const x = i / Math.max(1, secs * 1000 / 60) * cv.width;
        const y = cv.height - 18 - ((p - lo) / sp) * (cv.height - 36);
        started ? g.lineTo(x, y) : g.moveTo(x, y);
        started = true;
      });
      g.stroke();
    }
  };
  const tick = () => {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const el0 = (now - t0) / 1000;
    left.textContent = Math.max(0, secs - el0).toFixed(1) + '초';
    if (now - last < 60) return;
    last = now;
    an.getFloatTimeDomainData(buf);
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.012) { pts.push(null); quiet++; }
    else { quiet = 0; spoke = true; pts.push(PITCH.yin(buf, ctx.sampleRate) || null); }
    if (quiet === 25 && !spoke) tip.innerHTML = '<b>소리가 잘 안 들립니다</b> — 폰을 더 가까이 대고 조금 크게';
    /* **말이 끝나면 바로 멈춘다** (대표님 지적: 인식이 느리다, 2026-08-29).
       전에는 단어도 무조건 3.5초, 문장은 7초를 채웠다. 0.8초 만에 말하고도
       2.7초를 멍하니 기다린 것이다 — 그 기다림이 곧 '느리다'였다.
       한 번이라도 소리를 낸 뒤 0.66초(11틱 × 60ms) 조용하면 끝낸 것으로 본다.
       0.66초는 단어 사이 숨보다 길고 '다 말했다'보다 짧은 자리다. */
    if (spoke && quiet >= 11) { onStop && onStop(); return; }
    draw();
  };
  tick();
  return () => { dead = true; cancelAnimationFrame(raf); wrap.remove();
                 try { src.disconnect(); } catch (e) { } };
}

/* 원어민 소리를 고른 속도로, 내 소리와 순서대로/겹쳐서 듣는다 (대표님 지시 2026-09-27) */
/* 원어민→나 듣기. both=true 면 **겹쳐서** — 두 소리가 '들리기 시작하는 순간'을 정확히 맞춘다 (대표님 지시 2026-09-27).
   내 녹음은 말하기 전 빈 시간이 제각각이라 그냥 둘을 같이 틀면 원어민이 먼저 들린다.
   그래서 둘 다 미리 불러 두고, 각자 소리가 시작되는 자리(PITCH.analyze 의 s)로 옮겨 놓은 뒤 한 틱에 함께 튼다(overlayPlay). */
function nativeThenMine(text, both) {
  if (REC.key !== text || !REC.url) return;
  const spd = spdOf();
  if (both) { overlayPlay(text, spd); return; }
  play(text, false, null, spd);                                          // 순서대로: 원어민 → 나
  nativeCurve(text).then(nat => {
    const endAt = nat && nat.e ? nat.e + .1 : 0;                         // 소리가 들리는 끝(파일 뒤 무음은 기다리지 않는다)
    const iv = setInterval(() => {
      if (audio.paused || audio.ended || (endAt && audio.currentTime >= endAt)) {
        clearInterval(iv);
        if (REC.key === text) { audio.pause(); playMine(); }
      }
    }, 40);
    setTimeout(() => clearInterval(iv), 9000);
  });
}
async function overlayPlay(text, spd) {
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  if (!h) { play(text, false, null, spd); playMine(); return; }
  const nat = await nativeCurve(text);
  const mine = REC.mine && REC.mineKey === text ? REC.mine : null;
  if (REC.key !== text || !REC.url) return;
  audio.pause(); myVoice.pause(); PB.hold = null;
  const src = `audio/${voiceDir()}/n/${h}.mp3`;
  PB.spdSrc = src;
  audio.onerror = null;
  audio.src = src; audio.defaultPlaybackRate = audio.playbackRate = spd;               // 원어민은 고른 듣기 속도로
  myVoice.src = REC.url; myVoice.playbackRate = 1;
  const ready = a => new Promise(res => {                   // 둘 다 바로 틀 수 있을 때까지
    if (a.readyState >= 3) return res();
    const done = () => { a.removeEventListener('canplay', done); res(); };
    a.addEventListener('canplay', done);
    setTimeout(res, 2000);
  });
  await Promise.all([ready(audio), ready(myVoice)]);
  const seekTo = (a, t) => new Promise(res => {             // 각자 소리가 나기 직전 자리로
    if (!(t > 0)) { a.currentTime = 0; return res(); }
    const done = () => { a.removeEventListener('seeked', done); res(); };
    a.addEventListener('seeked', done);
    a.currentTime = t;
    setTimeout(res, 400);
  });
  await Promise.all([seekTo(audio, nat && nat.s ? Math.max(0, nat.s - .03) : 0),
                     seekTo(myVoice, mine && mine.s ? Math.max(0, mine.s - .03) : 0)]);
  if (REC.key !== text) return;
  audio.play().catch(() => { }); myVoice.play().catch(() => { });   // 같은 틱에 함께
}

function drawCompare(text, box) {
  box.textContent = '';
  const merged = !!box.dataset.merged;     // 단어 카드: 그래프는 카드의 하나뿐인 그래프에 겹쳐 그린다
  if (!merged) box.parentElement?.querySelector('.prenat')?.remove();   // (옛 화면) 원어민 단독 곡선은 겹쳐 그리기로 대체
  const row = el('div', 'cmp');
  const a = el('button', 'ghost', '원어민');
  a.onclick = () => play(text, false, null, merged ? spdOf() : undefined);
  const b = el('button', 'ghost', '나');
  b.onclick = () => {
    if (REC.key === text) playMine();
  };
  const c = el('button', 'ghost', merged ? '순서대로 듣기' : '번갈아 듣기');
  if (merged) c.onclick = () => nativeThenMine(text, false);
  else c.onclick = async () => {
    play(text, false);
    await new Promise(r => setTimeout(r, 2200));
    if (REC.key === text) playMine();
  };
  /* 판정 칸은 **그래프 아래**에 온다 — 그림을 보고 나서 결과를 읽는 순서가 자연스럽다.
     발음(AI)과 높낮이(곡선)는 서로 다른 것을 보므로 한 칸에 나란히 둔다. */
  const said = el('div', 'saidbox');
  said.append(el('div', 'vrow', '<span class="vname">발음</span><span class="vmark">…</span>'),
              el('div', 'vrow', '<span class="vname">높낮이</span><span class="vmark">…</span>'));
  row.append(a, b, c);
  if (merged) {
    const d = el('button', 'ghost', '겹쳐서 듣기');
    d.onclick = () => nativeThenMine(text, true);
    row.append(d);
    box.append(row, said);
    REC.mine = null; window.dispatchEvent(new CustomEvent('chao-rec', { detail: text }));   // 새 녹음 — 옛 내 곡선을 지운다
    showTone(text, REC.url, null, box);
  } else {
    const curve = el('div', 'curvearea');
    box.append(row, curve, said);
    showTone(text, REC.url, curve);        // 녹음이 끝나면 버튼 없이 바로 그린다
  }
  aiListen(text, REC.url, said);   // 발음도 누를 것 없이 바로 (폰으로만 판정). 인식이 없는 폰이면 그 까닭을 적는다
}

/* 녹음을 16kHz 모노 WAV 로 바꾼다 — 폰마다 다른 녹음 형식을 AI가 다 읽지는 못해서 */
async function recToWav(blobUrl) {
  const src = await getCtx().decodeAudioData(await (await fetch(blobUrl)).arrayBuffer());
  const off = new OfflineAudioContext(1, Math.ceil(src.duration * 16000), 16000);
  const s = off.createBufferSource(); s.buffer = src; s.connect(off.destination); s.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const w = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const put = (o, t) => [...t].forEach((c, i) => w.setUint8(o + i, c.charCodeAt(0)));
  put(0, 'RIFF'); w.setUint32(4, 36 + pcm.length * 2, true); put(8, 'WAVEfmt ');
  w.setUint32(16, 16, true); w.setUint16(20, 1, true); w.setUint16(22, 1, true);
  w.setUint32(24, 16000, true); w.setUint32(28, 32000, true); w.setUint16(32, 2, true);
  w.setUint16(34, 16, true); put(36, 'data'); w.setUint32(40, pcm.length * 2, true);
  pcm.forEach((v, i) => w.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true));
  const u8 = new Uint8Array(w.buffer);
  let bin = '';
  for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return btoa(bin);
}

/* AI 받아쓰기 판정.
   실험해 보니 AI는 '무슨 음절인지'는 정확히 듣지만 '성조'는 원어민 소리도 틀렸다.
   그래서 성조 채점은 안 시키고, 글자를 알아들을 수 있는 발음인지만 묻는다.
   성조는 위의 높낮이 곡선이 담당한다 — 둘이 합쳐야 온전한 피드백이 된다. */
/* 발음(글자)은 AI가 받아 적어 보고, 성조는 아래 높낮이 곡선이 본다.
   둘이 하는 일이 다르다 — 합쳐야 '무슨 소리를, 어떤 높낮이로' 냈는지가 다 보인다. */

async function aiListen(text, blobUrl, box) {
  try {
    // 오직 폰(브라우저 내장 음성인식)으로만 판정한다 — 구글(제미나이) 호출은 절대 하지 않는다
    // (대표님 지시 2026-09-08). 결과가 이벤트로 늦게 오므로 반드시 먼저 기다린다(2026-09-09 수정).
    const soundP = soundFallback(text, blobUrl).catch(() => null);   // 폰 인식을 기다리는 동안 소리 비교도 같이 돌린다 (2026-09-28: 느리다는 지적)
    if (REC.localDone) await REC.localDone;
    if (!REC.localHeard) {                       // 폰 인식이 답을 안 줬다 → 소리 비교로 (2026-09-27 저녁)
      verdict(box, 0, null, '발음', '소리를 견주는 중…');
      const r = await soundP;
      if (r && r.ok !== null) {
        S.stats.pronAll = (S.stats.pronAll || 0) + 1; if (r.ok) S.stats.pronOk = (S.stats.pronOk || 0) + 1; if (!r.ok && r.heard) noteLetters(text, r.heard, 'ltrs');
        bump('pj', 'snd', r.ok); if (CURV !== 'quiz') bump('md', 'card', r.ok); save();   // 판정 방식별 · 카드에서 한 말하기 (2026-10-02)
        verdict(box, 0, r.ok, '발음', (r.ok ? '알아들었습니다' : esc(r.heard) + ' 처럼 들립니다 (목표 ' + esc(text) + ')') + ' <small>(소리 비교)</small>');
        heardLine(box, { letters: r.heard || (r.ok ? text : '') });
        if (!r.ok) box.append(el('div', 'fixtip', '↳ ' + sayTip(text, r.heard)));
        return;
      }
      bump('pj', 'none', false); save();                // 폰도 소리 비교도 판정 못 함 — 점수에는 안 넣고 횟수만 (2026-10-02)
      verdict(box, 0, null, '발음', r && r.why ? r.why : asrFailText()); return;
    }
    const { heard, ok, pick } = judgeLocalHeard(text, REC.localHeard);
    sibLoad().then(() => heardLine(box, { letters: heard }));
    if (ok !== null) {
      S.stats.pronAll = (S.stats.pronAll || 0) + 1;
      if (ok) S.stats.pronOk = (S.stats.pronOk || 0) + 1;
      if (!ok && heard) noteLetters(text, heard, 'ltrs');          // 말하기 글자별 (2026-09-30 밤)
      bump('pj', 'asr', ok); if (CURV !== 'quiz') bump('md', 'card', ok);   // 판정 방식별 · 카드에서 한 말하기 (2026-10-02)
      save();
    }
    // 받아쓰기일 때는 **성조 부호를 떼고** 보여준다. AI는 실제로 낸 높낮이가 아니라
    // '그런 단어이 있으니까'로 부호를 채워 넣는다 — chao 를 평평하게 읽어도 chào 라고 적는다.
    const show = x => esc(pick ? x : stripTone(x));
    if (ok === null) { verdict(box, 0, null, '발음', '가려내기 어렵습니다 — 조금 크게 다시'); return; }
    verdict(box, 0, ok, '발음',
      ok ? (pick ? '알아들었습니다' : show(heard) + ' 로 들렸습니다')
         : show(heard) + ' 처럼 들립니다 (목표 ' + show(text) + ')');
    if (!ok) box.append(el('div', 'fixtip', '↳ ' + sayTip(text, heard)));
  } catch (e) { verdict(box, 0, null, '발음', '판정 중에 오류가 났습니다 <small>(' + esc(String(e && e.message || e).slice(0, 60)) + ')</small>'); }
}

/* '들린 말' 한 줄 — 발음(폰 인식이 알아들은 글자)과 높낮이(곡선이 가린 성조 무리)를 합친다 (대표님 물음 2026-09-28 밤:
   "내가 말한 것을 성조까지 인식해서 단어로 보여 줄 수 있냐, 두 파트를 합쳐 최종 어떤 단어·성조로 들렸는지").
   · 글자는 폰 인식 것에서 성조 부호를 뗀다 — 폰 인식은 실제 높낮이가 아니라 '있는 낱말'로 부호를 채우기 때문
   · 성조는 곡선이 가린 무리(내려감 = ngang·huyền·nặng / 올라감 = sắc / 내렸다 올라감 = hỏi·ngã) 안에서 **실제로 있는 음절**만 후보로 보인다
     (여섯 성조를 곡선만으로 가르면 58% 라 못 믿는다 — 세 무리는 87%, pitch.js 실측). 한 음절 낱말만 성조를 합친다 */
function heardLine(host, part) {
  const sb = host && (host.classList && host.classList.contains('saidbox') ? host : host.querySelector && host.querySelector('.saidbox'));
  if (!sb) return;
  sb._heard = Object.assign(sb._heard || {}, part);
  const h = sb._heard;
  let row = sb.querySelector('.heardrow');
  if (!row) { row = el('div', 'heardrow'); sb.append(row); }
  if (!h.letters) { row.innerHTML = '<span class="hname">' + tr('들린 말') + '</span><span class="hval">…</span>'; return; }
  const base = stripTone(String(h.letters).toLowerCase().replace(/[.,!?]/g, '').trim());
  let show = esc(base);
  if (h.fam && base && !base.includes(' ') && SIB && SIB.t && SIB.t[base]) {
    const cands = SIB.t[base].filter(s => PITCH.FAM[sibToneOf(s)] === h.fam);
    show = (cands.length ? cands.map(s => '<b>' + esc(s) + '</b>').join(' · ') : esc(base)) + ' <small>(' + tr('높낮이') + ': ' + esc(PITCH.FAMKO[h.fam]) + ')</small>';
  } else if (h.fam && base && !base.includes(' ')) show = '<b>' + esc(base) + '</b> <small>(' + tr('높낮이') + ': ' + esc(PITCH.FAMKO[h.fam]) + ')</small>';
  else show = '<b>' + esc(h.letters) + '</b>';
  row.innerHTML = '<span class="hname">' + tr('들린 말') + '</span><span class="hval">' + show + '</span>';
}
/* 판정 한 줄 — O(초록) / X(빨강) 과 그 밑의 작은 설명.
   두 줄이 각각 다른 것을 본다: 발음은 AI가 글자를, 높낮이는 곡선이 성조를. */
function verdict(box, i, ok, name, sub) {
  const r = box && box.querySelectorAll('.vrow')[i];
  if (!r) return;
  r.className = 'vrow ' + (ok === null ? '' : ok ? 'ok' : 'no');
  r.innerHTML = '<span class="vname">' + name + '</span>' +
    '<span class="vmark">' + (ok === null ? '—' : ok ? 'O' : 'X') + '</span>' +
    '<span class="vsub">' + sub + '</span>';
  sayCredit(box);
  if (box.onVerdict) box.onVerdict(i, ok);            // 말하기 테스트가 판정을 받아 채점한다 (2026-09-27 밤)
}

/* 따라 말하기 점수 — **발음과 높낮이가 둘 다 O 일 때만** 준다 (사용자 지시).
   전에는 규칙표에 '+5 따라 말하기를 AI가 알아들으면'이라고 적어 두고 실제로는
   한 번도 주지 않았다. 못 받는 점수를 걸어 둔 셈이었다.
   둘 중 하나만 맞아서는 안 된다 — 글자를 맞게 읽어도 성조가 틀리면 딴 단어이 되고,
   성조가 맞아도 자음·모음이 틀리면 알아듣지 못한다. */
function sayCredit(box) {
  if (!box) return;
  const rows = box.querySelectorAll('.vrow');
  if (rows.length < 2) return;
  const pass = [...rows].every(r => r.classList.contains('ok'));
  if (!pass || box.dataset.paid) return;
  box.dataset.paid = '1';                     // 한 번 녹음에 한 번만
  earn(CRD.say, tr('발음과 높낮이 모두 통과'));
}

/* 예/아니오 확인 창. 브라우저 confirm() 은 **홈 화면에 설치한 PWA 에서 막히는 폰이 있다** —
   그러면 아무 일도 안 일어난다(대표님: "동아리 탈퇴 버튼 작동 안 한다", 2026-08-30).
   그래서 앱이 그리는 창으로 바꾼다. 답을 Promise 로 돌려준다. */
function askYN(html, yes, danger) {
  return new Promise(res => {
    const back = el('div', 'modalback');
    const box = el('div', 'modalbox');
    box.append(el('div', 'modalb', html));
    const row = el('div', 'rolepick');
    const no = el('button', 'ghost', tr('아니요'));
    const y = el('button', 'primary' + (danger ? ' danger' : ''), tr(yes || '네'));
    no.onclick = () => { back.remove(); res(false); };
    y.onclick = () => { back.remove(); res(true); };
    row.append(no, y); box.append(row);
    back.append(box);
    back.onclick = e => { if (e.target === back) { back.remove(); res(false); } };
    document.body.append(back);
  });
}

function popup(html) {
  const back = el('div', 'modalback');
  const box = el('div', 'modalbox');
  box.append(el('div', 'modalb', html));
  const ok = el('button', 'primary big', '알겠어요');
  ok.style.width = '100%';
  ok.onclick = () => back.remove();
  box.append(ok);
  back.append(box);
  back.onclick = e => { if (e.target === back) back.remove(); };
  document.body.append(back);
}

/* 원어민 높낮이 곡선 + 내 녹음 결과 자리. 버튼은 밖에 두고 여기는 그림만 맡는다.
   2026-09-25 #7: 곡선 위에 **단어이 직접** 얹혀서, 소리가 재생되는 동안 높낮이를 따라 위아래로 움직인다
   (위쪽 단어 표시는 그대로). 재생 중이 아닐 때는 출발점에 서 있다. 단어을 누르면 소리가 난다. */
function pitchStage(text, nat) {
  const NSs = 'http://www.w3.org/2000/svg';
  const W = 300, H = 118, PAD = 12;
  const raw = nat.raw && nat.raw.length > 4 ? nat.raw : null;
  const box = el('div', 'curvebox pwstage');
  if (!raw || !nat.total) {               // 시간 정보가 없으면 예전 그림 그대로
    box.innerHTML = curveSvg(null, nat.curve);
    return box;
  }
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  const vals = raw.filter(v => v !== null && isFinite(v));
  const lo = Math.min(-3, Math.min(...vals)), hi = Math.max(3, Math.max(...vals));
  const t0 = nat.t0, span = raw.length * nat.hop;
  const xmin = Math.max(0, t0 - 0.10), xmax = Math.min(nat.total, t0 + span + 0.10);
  const px = t => PAD + (t - xmin) / ((xmax - xmin) || 1) * (W - PAD * 2);
  const py = v => 26 + (hi - v) * (H - 26 - PAD) / ((hi - lo) || 1);
  const pts = raw.map((v, i) => v === null ? null : [px(t0 + i * nat.hop), py(v)]);
  let d = '', pen = false;
  pts.forEach(q => { if (!q) { pen = false; return; } d += (pen ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); pen = true; });
  const svg = document.createElementNS(NSs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'curve pw');
  const uid = 'pw' + Math.random().toString(36).slice(2, 7);
  svg.innerHTML =
    `<defs><clipPath id="${uid}"><rect x="0" y="0" width="0" height="${H}"/></clipPath></defs>` +
    `<line x1="${PAD}" y1="${py(0).toFixed(1)}" x2="${W - PAD}" y2="${py(0).toFixed(1)}" class="mid"/>` +
    `<path d="${d}" class="nat"/>` +
    `<path d="${d}" class="played" clip-path="url(#${uid})"/>` +
    `<g class="pwword"><rect class="pwpill" rx="11" ry="11" height="22"/><text class="pwtx" text-anchor="middle"></text></g>`;
  box.append(svg);
  const clip = svg.querySelector('clipPath rect'), gW = svg.querySelector('.pwword');
  const rectE = gW.querySelector('rect'), txt = gW.querySelector('text');
  const syl = text.split(' ').filter(Boolean);
  const first = pts.find(q => q), lastQ = [...pts].reverse().find(q => q);
  const at = t => {                         // 시각 t(초) → 곡선 위 점 (사이 빈 곳은 앞뒤를 이어 준다)
    const i = clamp01((t - t0) / (nat.hop * (raw.length - 1))) * (raw.length - 1);
    let a = Math.floor(i), b = Math.ceil(i);
    while (a > 0 && pts[a] === null) a--;
    while (b < pts.length - 1 && pts[b] === null) b++;
    const A = pts[a] || first, B = pts[b] || lastQ;
    const f = b === a ? 0 : (i - a) / (b - a);
    return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
  };
  const place = (t, playing) => {
    const q = at(t);
    const s = syl.length > 1 ? syl[Math.min(syl.length - 1, Math.floor(clamp01((t - t0) / span) * syl.length))] : syl[0];
    txt.textContent = s;
    const w = Math.max(38, s.length * 9.5 + 18);
    rectE.setAttribute('width', w); rectE.setAttribute('x', -w / 2); rectE.setAttribute('y', -11);
    txt.setAttribute('y', 5);
    const cx = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, q[0])), cy = Math.max(13, q[1] - 17);
    gW.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)})`);
    gW.classList.toggle('on', !!playing);
    clip.setAttribute('width', playing ? q[0].toFixed(1) : 0);
  };
  place(t0, false);
  gW.onclick = () => play(text, false, null, SLOW_TAP);   // 그래프를 누르면 0.2배 고정 (대표님 지시 2026-09-29 밤: "발음 그래프 박스·입모양 박스는 0.2배 고정")
  gW.style.cursor = 'pointer';
  PB.views.add({ root: box, update(playing) {
    if (pbLive(h, playing)) place(clamp(audio.currentTime, t0, t0 + span), true);
    else place(t0, false);
  } });
  return box;
}
const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

function curveArea(text, box) {
  const wrap = el('div', 'speak');
  const pre = el('div', 'curvearea prenat');
  nativeCurve(text).then(nat => {
    if (!nat || !nat.curve) return;
    pre.append(pitchStage(text, nat));
    pre.append(el('div', 'curvelegend', '<span class="k nat"></span>원어민 소리 높낮이 — 단어이 소리를 따라 움직입니다'));
  });
  if (box) wrap.append(pre, box); else wrap.append(pre);
  return wrap;
}

/* 하나뿐인 높낮이 그래프 (대표님 지시 2026-09-27: "두 그래프를 하나로 합치자").
   · 원어민 곡선(회색)에 단어(또는 입·그림)이 소리를 따라 위아래로 움직인다.
   · 말하기(녹음)를 하면 내 곡선(파랑)이 **같은 그래프에 겹쳐** 나오고, 내 소리를 들을 때는 내 곡선 위를 따라간다.
   · 원어민 소리와 내 소리를 **겹쳐서** 들으면 두 표지가 동시에 움직인다.
   · 따라가는 것은 [단어 | 입 | 그림] 중에서 고른다(S.pgm). 입·그림은 곡선 위쪽에 더 큰 자리를 둔다. */
function pitchGraph(text, opt) {
  const o = opt || {};
  const W = 300, PAD = 12, PADL = 34;                 // 왼쪽은 계이름 눈금 자리
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  const wrap = el('div', 'pgwrap');
  const box = el('div', 'pgraph curvebox');
  const svgHost = el('div', 'pgsvg');
  const mkN = el('div', 'pgmk mouth'), mkM = el('div', 'pgmk me mouth');
  mkM.hidden = true;
  box.append(svgHost, mkN, mkM);
  wrap.append(box);
  /* 따라가는 표지는 **입모양 하나**(대표님 지시 2026-09-27: 단어·그림 고르기 없앰). '원어민 소리 높낮이' 같은 글도 없다.
     왼쪽 눈금은 계이름 — 원어민 목소리의 중앙값(nat.med Hz)을 기준으로 반음 곡선을 실제 음높이로 되돌려 도·레·미로 적는다. */
  let nat = null, mine = null, built = false, mouths = [];
  const G = { H: 158, TOP: 66 };
  let X0 = 0, X1 = 0, px = () => 0, py = () => 0, seriesN = null, seriesM = null;
  const NOTE = ['도', '도♯', '레', '레♯', '미', '파', '파♯', '솔', '솔♯', '라', '라♯', '시'];
  const noteOf = hz => { const m = Math.round(69 + 12 * Math.log2(hz / 440)); return { name: NOTE[((m % 12) + 12) % 12], oct: Math.floor(m / 12) - 1, sharp: NOTE[((m % 12) + 12) % 12].includes('♯') }; };

  const clip = (id, w, H) => `<clipPath id="${id}"><rect x="0" y="0" width="${w}" height="${H}"/></clipPath>`;
  const pathOf = (pts) => { let d = '', pen = false; pts.forEach(q => { if (!q) { pen = false; return; } d += (pen ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); pen = true; }); return d; };
  let uid = 'pg' + Math.random().toString(36).slice(2, 7), clN = null, clM = null;

  function draw() {
    const rawN = nat && nat.raw && nat.raw.length > 4 ? nat.raw : null;
    seriesN = seriesM = null;
    if (!rawN) { svgHost.textContent = ''; return; }
    const spanN = rawN.length * nat.hop, t0 = nat.t0;
    const xmin = Math.max(0, t0 - .10), xmax = Math.min(nat.total, t0 + spanN + .10);
    px = t => PADL + (t - xmin) / ((xmax - xmin) || 1) * (W - PADL - PAD);
    X0 = px(t0); X1 = px(t0 + spanN);
    const vals = rawN.filter(v => v !== null && isFinite(v)).concat(mine && mine.raw ? mine.raw.filter(v => v !== null && isFinite(v)) : []);
    const lo = Math.min(-3, Math.min(...vals)), hi = Math.max(3, Math.max(...vals));
    py = v => G.TOP + (hi - v) * (G.H - G.TOP - PAD) / ((hi - lo) || 1);
    seriesN = { raw: rawN, t0, hop: nat.hop, span: spanN, x: t => px(t) };
    const ptsN = rawN.map((v, i) => v === null ? null : [px(t0 + i * nat.hop), py(v)]);
    let mineSvg = '';
    if (mine && mine.raw && mine.raw.length > 4) {
      const spanM = mine.raw.length * mine.hop;
      seriesM = { raw: mine.raw, t0: mine.t0, hop: mine.hop, span: spanM, x: t => X0 + (t - mine.t0) / (spanM || 1) * (X1 - X0) };
      const ptsM = mine.raw.map((v, i) => v === null ? null : [seriesM.x(mine.t0 + i * mine.hop), py(v)]);
      const dM = pathOf(ptsM);
      mineSvg = `<path d="${dM}" class="mine"/><path d="${dM}" class="mplayed" clip-path="url(#${uid}m)"/>`;
    }
    // 계이름 눈금 — 반음 값 정수마다 실제 음을 구해 온음(♯ 아닌 것)만 적는다
    let scale = '';
    if (nat.med) {
      let lastY = -99;                       // 이름표가 겹치지 않게 — 반음 사이(미·파, 시·도)는 줄만 긋고 글자는 건너뛴다
      for (let st = Math.ceil(lo); st <= Math.floor(hi); st++) {
        const n = noteOf(nat.med * Math.pow(2, st / 12));
        if (n.sharp) continue;
        const y = py(st).toFixed(1);
        scale += `<line x1="${PADL}" y1="${y}" x2="${W - PAD}" y2="${y}" class="pgnl"/>`;
        if (Math.abs(+y - lastY) >= 11) {
          scale += `<text x="${PADL - 4}" y="${(+y + 3).toFixed(1)}" class="pgnt">${n.name}<tspan class="pgno">${n.oct}</tspan></text>`;
          lastY = +y;
        }
      }
    }
    const dN = pathOf(ptsN);
    svgHost.innerHTML = `<svg viewBox="0 0 ${W} ${G.H}" class="curve pw">` +
      `<defs>${clip(uid + 'n', 0, G.H)}${clip(uid + 'm', 0, G.H)}</defs>${scale}` +
      `<path d="${dN}" class="nat"/><path d="${dN}" class="played" clip-path="url(#${uid}n)"/>${mineSvg}</svg>`;
    clN = svgHost.querySelector(`#${uid}n rect`); clM = svgHost.querySelector(`#${uid}m rect`);
  }

  function atSeries(sr, t) {              // 시각 t → 곡선 위 점 (사이 빈 곳은 앞뒤를 이어 준다)
    const raw = sr.raw, n = raw.length, i = clamp01((t - sr.t0) / (sr.hop * (n - 1))) * (n - 1);
    let a = Math.floor(i), b = Math.ceil(i);
    while (a > 0 && raw[a] === null) a--;
    while (b < n - 1 && raw[b] === null) b++;
    const va = raw[a] ?? raw.find(v => v !== null), vb = raw[b] ?? [...raw].reverse().find(v => v !== null);
    const f = b === a ? 0 : (i - a) / (b - a);
    const tt = sr.t0 + (a + (b - a) * f) * sr.hop;
    return [sr.x(tt), py(va + (vb - va) * f)];
  }

  function buildMarkers() {
    if (built) return;
    built = true;
    mouths = [];
    [mkN, mkM].forEach((mk, k) => {
      mk.textContent = '';
      const host = el('div', 'pgmouth'); mk.append(host);
      if (typeof MOUTH !== 'undefined') { const M = MOUTH.create(host, { front: true }); M.setWord(text); M.at(0); mouths[k] = M; }
    });
  }

  function place(mk, k, sr, t, playing, u) {
    const q = atSeries(sr, t);
    if (mouths[k]) mouths[k].at(clamp01(u));
    mk.style.left = (clamp(q[0], 22, W - 22) / W * 100).toFixed(2) + '%';
    mk.style.top = (q[1] / G.H * 100).toFixed(2) + '%';
    mk.classList.toggle('on', !!playing);
    return q;
  }

  function update(playing, minePlaying) {
    if (!seriesN) return;
    buildMarkers();
    const nLive = pbLive(h, playing);
    const tN = nLive ? clamp(audio.currentTime, seriesN.t0, seriesN.t0 + seriesN.span) : seriesN.t0;
    const a = Math.max(0, nat.t0 - .06), b = Math.min(nat.total, nat.t0 + seriesN.span + .05);
    /* 이 낱말 소리가 아닐 때(예문·다른 낱말 재생 중)는 입을 **처음 모양에 둔다** — 전에는 재생 시각만 보고 입을 움직여
       예문을 누르면 아래 그래프의 입이 따라 움직였다(대표님 지적 2026-09-29: "예문 클릭할 때 아래의 입모양 움직이지 말라") */
    const q = place(mkN, 0, seriesN, tN, nLive, nLive ? (audio.currentTime - a) / ((b - a) || 1) : 0);
    if (clN) clN.setAttribute('width', nLive ? q[0].toFixed(1) : 0);
    if (seriesM) {
      const mLive = !!minePlaying && REC.key === text;
      const tM = mLive ? clamp(myVoice.currentTime, seriesM.t0, seriesM.t0 + seriesM.span) : seriesM.t0;
      mkM.hidden = !mLive;
      if (mLive) {
        const a2 = Math.max(0, mine.t0 - .06), b2 = Math.min(mine.total, mine.t0 + seriesM.span + .05);
        const q2 = place(mkM, 1, seriesM, tM, true, (myVoice.currentTime - a2) / ((b2 - a2) || 1));
        if (clM) clM.setAttribute('width', q2[0].toFixed(1));
      } else if (clM) clM.setAttribute('width', 0);
    } else mkM.hidden = true;
  }

  const onRec = ev => {
    if (!box.isConnected) { window.removeEventListener('chao-rec', onRec); return; }
    if (ev.detail !== text) return;
    mine = (REC.key === text && REC.mine) ? REC.mine : null;
    draw(); update(false, false);
  };
  window.addEventListener('chao-rec', onRec);
  if (REC.key === text && REC.mine) mine = REC.mine;
  nativeCurve(text).then(n => {
    nat = n;
    if (!nat || !nat.raw || nat.raw.length < 5) { wrap.hidden = true; return; }
    draw(); update(false, false);
    /* 그래프(따라가는 입모양 포함) 어디를 눌러도 **0.2배 고정** (대표님 지시 2026-09-28: "발음이 너무 빨라 입모양도 너무 빠름").
       위 [▶ 듣기]는 고른 속도 그대로다. */
    box.classList.add('slowtap');
    box.onclick = () => play(text, false, null, SLOW_TAP);
    wrap.append(el('div', 'slowtaphint', tr('그래프를 누르면 아주 느리게(0.2배)')));
  });
  PB.views.add({ root: wrap, update });
  return wrap;
}

/* 듣기 속도 — 1·0.8·0.6·0.4·0.2배 (대표님 지시 2026-09-27, 0.4·0.2 추가). 고른 값은 저장하고, 단어 카드·예문·'원어민 듣기'가 모두 같은 값을 쓴다. */
const SPDS = [1, .8, .6, .4, .2];
const SLOW_TAP = .2;                 // 그래프·입모양 그림을 누르면 이 속도로 (2026-09-28)
const spdOf = () => SPDS.includes(Number(S.wspd)) ? Number(S.wspd) : .8;
/* 카드가 바뀌면 듣기(단어·예문) 속도는 다시 0.8배 (대표님 지시 2026-09-30: "0.4로 재생하고 다음 카드로 넘겼어도 0.8, 뒤로 가서 다시 재생해도 0.8").
   한 카드 안에서 고른 속도는 그 카드에서만 산다. 그래프·입모양 상자를 누르면 0.2배(SLOW_TAP)는 그대로 */
let SPD_CARD = null;
function spdResetFor(id) { if (id !== SPD_CARD) { SPD_CARD = id; S.wspd = .8; } }
const spdLab = v => v + '배';
/* 속도 칩 — 누르면 1배·0.8배·0.6배 목록이 내려오고 **바로 고른다**(대표님 지시 2026-09-27: 1배에서 0.6배로도 한 번에).
   .lgrp 가 overflow:hidden 이라 목록은 화면 맨 위 층(body)에 띄우고 칩 자리에 맞춘다. */
let SPDMENU = null;
function spdMenuClose() { if (SPDMENU) { SPDMENU.remove(); SPDMENU = null; } document.querySelectorAll('.spdchip.open').forEach(x => x.classList.remove('open')); }
function spdSet(v) {
  S.wspd = v; save();
  document.querySelectorAll('.spdchip').forEach(x => { x.title = tr('듣기 속도') + ' ' + spdLab(v); x.setAttribute('aria-label', tr('듣기 속도') + ' ' + spdLab(v)); });
  if (PB.spdSrc && audio.src.endsWith(PB.spdSrc) && !audio.paused) audio.playbackRate = v;   // 듣는 중이면 바로 바꾼다
}
/* 헷갈리는 짝은 **제 속도**를 따로 둔다 (대표님 지시 2026-09-27: "별개로 속도 조절"). 기본은 0.8배(2026-09-29 밤 "디폴트값은 0.8로. 모두 고정"). 카드의 듣기 속도(S.wspd)와 무관하다. */
const pairSpd = () => SPDS.includes(Number(S.pspd)) ? Number(S.pspd) : .8;   // 기본 0.8배 (대표님 지시 2026-09-29 밤: "디폴트값은 0.8로. 모두 고정" — 전에는 1배)
function pairSpdSet(v) { S.pspd = v; save(); document.querySelectorAll('.spdchip.pair').forEach(x => { x.title = tr('짝 듣기 속도') + ' ' + spdLab(v); }); }
/* 시험지(실제 시험지·모의고사) 듣기는 **1배가 기본** (대표님 2026-10-06 "모의고사는 실전 같은 거니까 1배속을 디폴트로, 마찬가지로 속도 조절") —
   시험을 시작할 때 1배로 돌아가고, 시험 안에서 고른 속도는 그 시험이 끝날 때까지만 산다(저장 안 함). 카드 듣기 속도(0.8 기본)와 따로 */
let EXAM_SPD = 1;
const examSpd = () => EXAM_SPD;
function examSpdSet(v) { EXAM_SPD = v; if (!audio.paused) audio.playbackRate = v; document.querySelectorAll('.spdchip.exam').forEach(x => { x.title = tr('듣기 속도') + ' ' + spdLab(v); }); }
/* opt.pair 이면 헷갈리는 짝 속도(pairSpd)를 읽고 쓴다. 아니면 카드 듣기 속도 */
function spdChip(opt) {
  const pr = !!(opt && opt.pair), ex = !!(opt && opt.exam);
  const get = pr ? pairSpd : ex ? examSpd : spdOf, set = pr ? pairSpdSet : ex ? examSpdSet : spdSet;
  const b = el('button', 'spdchip' + (pr ? ' pair' : '') + (ex ? ' pair exam' : ''));   // 듣기 옆 ▾ — 누르면 1·0.8·0.6·0.4·0.2배 목록. 시험지(exam)는 값이 보이고 1배 기본
  b.type = 'button';
  if (pr || ex) b.append(el('span', 'spdval', spdLab(get())));    // 짝·시험에서는 값도 같이 보인다 — 카드 속도와 다른 값임을 알 수 있게
  b.append(el('i', 'spdcaret', '▾'));
  b.title = tr('듣기 속도') + ' ' + spdLab(get());
  b.setAttribute('aria-label', tr('듣기 속도') + ' ' + spdLab(get()));
  b.setAttribute('aria-haspopup', 'listbox');
  b.onclick = ev => {
    ev.stopPropagation();
    if (SPDMENU) { const same = b.classList.contains('open'); spdMenuClose(); if (same) return; }
    const m = el('div', 'spdmenu');
    m.setAttribute('role', 'listbox');
    SPDS.forEach(v => {
      const o = el('button', 'spdopt' + (v === get() ? ' on' : ''), '<span>' + spdLab(v) + '</span><i>' + (v === get() ? '✓' : '') + '</i>');
      o.type = 'button';
      o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', v === get() ? 'true' : 'false');
      o.onclick = e => { e.stopPropagation(); set(v); const sv = b.querySelector('.spdval'); if (sv) sv.textContent = spdLab(v); spdMenuClose(); };
      m.append(o);
    });
    document.body.append(m);
    const r = b.getBoundingClientRect();
    const w = Math.max(r.width, 120), h = m.offsetHeight;
    const below = window.innerHeight - r.bottom >= h + 12;
    m.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8) + 'px';
    m.style.width = w + 'px';
    m.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
    SPDMENU = m;
    b.classList.add('open');
  };
  return b;
}
addEventListener('click', spdMenuClose);
addEventListener('scroll', spdMenuClose, true);
addEventListener('resize', spdMenuClose);
addEventListener('keydown', e => { if (e.key === 'Escape') spdMenuClose(); });
/* [▶ 듣기][0.8배] — fn(속도) 를 부른다 */
function listenGroup(fn) {
  const g = el('div', 'lgrp');
  const b = el('button', 'ghost lbtn', '▶ ' + tr('듣기'));
  b.type = 'button';
  b.onclick = ev => { ev.stopPropagation(); fn(spdOf()); };
  g.append(b, spdChip());
  return g;
}

/* 단어 밑 단추 줄 — [▶ 듣기 0.8배] [🔴 말하기] (대표님 지시 2026-09-26·27). 뜻 바로 아래, 단어 면·발음 면 같은 자리.
   box: 말하기(녹음) 결과가 뜨는 자리 — 원어민→나 순서대로 듣기·겹쳐서 듣기와 발음·높낮이 판정. */
function wordControls(text, box) {
  const row = el('div', 'wctl');
  row.append(listenGroup(spd => play(text, false, null, spd)));
  if (canRecord()) {
    const mic = el('button', 'rec', ICON.mic + '<span>' + tr('말하기') + '</span>');
    mic.type = 'button';
    box.dataset.merged = '1';                 // 그래프는 카드의 하나뿐인 그래프에 겹쳐 그린다
    mic.onclick = () => toggleRec(text, mic, box);
    row.append(mic);
  } else {
    box.append(el('div', 'cmpnote', '이 기기·브라우저에서는 녹음을 못 씁니다 — 소리 내어 따라 말해만 보세요.'));
  }
  return row;
}

/* 재생 막대 — 끌어서 원하는 자리로 옮긴다 (대표님 지시 2026-09-26). 재생·멈춤 단추는 없다(위의 [듣기]가 한다).
   막대의 처음·끝은 **소리가 실제로 들리는 구간**이다(2026-09-27: 파일 뒤에 1초 안팎 무음이 붙어 있어서
   소리가 끝난 뒤에도 막대가 계속 갔다). 끌면 입모양·높낮이 그래프도 그 자리에 멈춘다(PB.hold). */
function playBar(text) {
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  const wrap = el('div', 'pbar');
  const rng = document.createElement('input');
  rng.type = 'range'; rng.min = 0; rng.max = 1000; rng.step = 1; rng.value = 0; rng.className = 'prng';
  rng.setAttribute('aria-label', tr('재생 위치'));
  const tm = el('span', 'ptm', '0.00 / 0.00');
  wrap.append(rng, tm);
  if (!h) { rng.disabled = true; return wrap; }
  let span = null, dur0 = 0, drag = false, resume = false;
  const url = () => `audio/${voiceDir()}/n/${h}.mp3`;
  /* 끌면 소리가 따라온다 (대표님 지시 2026-09-27: 천천히 끌면 천천히 들리게) —
     손가락이 지나는 자리마다 원음 90ms 조각을 원래 높이 그대로 낸다(DJ 스크럽처럼). 조각 사이 간격이 곧 끄는 빠르기다. */
  let buf = null, bufUrl = '', lastT = -1, lastAt = 0;
  const bufLoad = () => {
    const u = url();
    if (buf && bufUrl === u) return Promise.resolve(buf);
    return fetch(u).then(r => r.arrayBuffer()).then(ab => getCtx().decodeAudioData(ab)).then(b => { buf = b; bufUrl = u; return b; }).catch(() => null);
  };
  const grain = t => {
    if (!buf) return;
    const ctx = getCtx(), src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; src.connect(g); g.connect(ctx.destination);
    const at = ctx.currentTime, len = .09;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.9, at + .012);
    g.gain.setValueAtTime(.9, at + len - .015); g.gain.linearRampToValueAtTime(0, at + len);
    src.start(at, Math.max(0, Math.min(buf.duration - len, t)), len);
  };
  const fmt = t => (Math.round(t * 100) / 100).toFixed(2);
  const D = () => (ownsAudio(h) && isFinite(audio.duration) && audio.duration) ? audio.duration : dur0;
  const range = () => span || { a: 0, b: D() };
  const paint = () => {
    const R = range(), len = Math.max(.05, R.b - R.a), own = ownsAudio(h);
    let pos = own ? clamp((audio.currentTime - R.a) / len, 0, 1) : 0;
    if (own && audio.ended) pos = 1;
    if (!drag) rng.value = Math.round(pos * 1000);
    tm.textContent = fmt((drag ? rng.value / 1000 : pos) * len) + ' / ' + fmt(len);
  };
  nativeCurve(text).then(n => {
    if (n && n.e > n.s) span = { a: Math.max(0, n.s - .05), b: Math.min(n.total, n.e + .12) };
    paint();
  });
  const probe = new Audio();                       // 소리 분석이 안 되는 단어은 파일 길이로
  probe.preload = 'metadata';
  probe.onloadedmetadata = () => { dur0 = probe.duration || 0; paint(); };
  probe.src = url();
  const load = () => {
    if (ownsAudio(h)) return Promise.resolve();
    audio.pause(); PB.hold = null; PB.spdSrc = null; audio.onerror = null;
    audio.src = url(); audio.defaultPlaybackRate = audio.playbackRate = spdOf();
    return new Promise(res => { audio.addEventListener('loadedmetadata', res, { once: true }); setTimeout(res, 2500); });
  };
  rng.addEventListener('input', async () => {
    drag = true;
    bufLoad();
    if (!ownsAudio(h)) await load();
    if (!audio.paused && !audio.ended) { resume = true; audio.pause(); }
    PB.hold = h;
    const R = range(), len = R.b - R.a;
    if (len <= 0) return;
    const t = R.a + clamp(rng.value / 1000, 0, 1) * len;
    audio.currentTime = t;
    if (Math.abs(t - lastT) >= .025 && performance.now() - lastAt > 40) { lastT = t; lastAt = performance.now(); grain(t); }
    setTimeout(pbTick, 0);
    paint();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = false;
    if (resume) { resume = false; PB.hold = null; audio.play().catch(() => { }); }
    paint();
  };
  rng.addEventListener('change', endDrag);
  ['pointerup', 'pointercancel', 'touchend', 'mouseup'].forEach(ev => rng.addEventListener(ev, endDrag));
  PB.views.add({ root: wrap, update() { paint(); } });
  paint();
  return wrap;
}

/* 입모양 2D — 정면 입술(왼쪽)과 옆 단면(오른쪽: 혀·입천장·연구개·콧길·성대) (대표님 지시 2026-09-25 #6, 09-26 배치·글자 정리).
   소리(audio)와 같은 시계로 움직인다(PB). 재생은 단어 아래의 [듣기] 단추와 재생 막대(playBar)가 맡는다 — 이 그림에는 단추를 두지 않는다.
   그림의 세부 좌표는 **모식도**다 — 베트남어 전용 MRI·초음파 자료가 없어 범주(혀 높이·앞뒤·둥글기, 닿는 곳)만 근거가 있다.
   화면에는 '모식도'·'숨기기'·'이름표' 같은 글을 두지 않는다(대표님 지시 09-26). */
function mouthPanel(text) {
  const wrap = el('div', 'mouthbox');
  if (typeof MOUTH === 'undefined') return wrap;
  /* 정면을 크게, 옆 단면은 단추로 (대표님 물음 2026-09-27 "옆모습이 크게 도움이 되나?").
     혀 자리가 갈리는 소리(ư·ơ·â·ng·nh·đ·tr·r·kh)에서만 옆 단면이 값어치가 있어 기본은 정면, 고른 쪽은 저장(S.mview). */
  const sw = el('div', 'mouthsw');
  const body = el('div', 'mouthsvg');
  const cap = el('div', 'mouthcap');
  wrap.append(sw, body, cap);
  const M = MOUTH.create(body);
  const setV = v => {
    S.mview = v; save(); M.setView(v); body.dataset.v = v;
    sw.querySelectorAll('button[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v));   // 혀 투명 단추는 건드리지 않는다
  };
  [['front', '정면'], ['side', '옆 단면']].forEach(([v, lab]) => {
    const b = el('button', 'ghost sm', tr(lab)); b.type = 'button'; b.dataset.v = v; b.onclick = () => setV(v); sw.append(b);
  });
  /* '혀 투명' 단추는 뺐다 (대표님 2026-10-02) */
  M.setWord(text);
  setV(S.mview === 'side' ? 'side' : 'front');
  /* 세 축 막대(수치)는 뺐다 (대표님 2026-10-02 "발음 그림 밑에 수치로 어느 정도 벌리는지 표시해 주는 것은 빼") — 그림 자체를 크게 과장해 보인다 */
  body.classList.add('slowtap');                     // 입모양 그림을 눌러도 0.2배 고정 (2026-09-28)
  body.onclick = () => play(text, false, null, SLOW_TAP);
  const capOf = id => { const q = MOUTH.SI[id]; return q ? `<b>${q.sp}</b> [${q.ipa}] · ${q.tg} · ${q.pl}` : ''; };
  const idle = () => { const id = M.at(M.vowelT()); cap.innerHTML = capOf(id); };   // 멈춰 있을 때 — 입을 다문 그림 대신 첫 모음의 입 (2026-10-02)
  idle();
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  let nat = null, lastId = '';
  nativeCurve(text).then(n => { nat = n; });
  const show = t => { const id = M.at(t); if (id !== lastId) { lastId = id; cap.innerHTML = capOf(id); } };
  PB.views.add({ root: wrap, update(playing) {
    if (pbLive(h, playing) && nat && nat.raw) {
      const span = nat.raw.length * nat.hop, a = Math.max(0, nat.t0 - .06), b = Math.min(nat.total, nat.t0 + span + .05);
      show(clamp((audio.currentTime - a) / ((b - a) || 1), 0, 1));
    } else if (pbLive(h, playing)) {
      show(clamp(audio.currentTime / (audio.duration || 1), 0, 1));
    } else if (lastId !== 'idle') { lastId = 'idle'; idle(); }
  } });
  return wrap;
}

function speakRow(text, withSound) {
  const wrap = el('div', 'speak');
  const row = el('div', 'qplay');
  if (withSound) {
    const s1 = el('button', 'ghost', '🔊 듣기'); s1.onclick = () => play(text, false);
    row.append(s1);
  }
  if (!canRecord()) {
    if (withSound) wrap.append(row);
    wrap.append(el('div', 'cmpnote', '소리 내어 따라 말해 보세요. 속으로 읽는 것보다 훨씬 잘 남습니다.'));
    return wrap;
  }
  const box = el('div', 'cmpbox');
  const b = el('button', 'rec', '따라 말하기');
  b.onclick = () => toggleRec(text, b, box);
  row.append(b);
  const pre = el('div', 'curvearea prenat');   // 원어민 높낮이는 묻지 않고 바로 보여준다
  nativeCurve(text).then(nat => {
    if (!nat || !nat.curve) return;
    pre.innerHTML = `<div class="curvebox">${curveSvg(null, nat.curve)}</div>` +
      `<div class="curvelegend"><span class="k nat"></span>원어민 소리 높낮이</div>`;
  });
  wrap.append(row, pre, box);
  return wrap;
}


/* ---------- 성조 그림으로 보기 ----------
   음성인식이 아니다. 소리의 **높낮이 곡선**만 뽑아 원어민 것과 겹쳐 그린다.
   "맞다/틀리다"로 단정하지 않는다 — 모양이 눈에 보이면 스스로 고칠 수 있다. */
let actx = null;
const nativeCache = {};

function getCtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

async function nativeCurve(text) {
  const key = voiceDir() + '|' + text;
  if (nativeCache[key] !== undefined) return nativeCache[key];
  const h = AIDX[text] || AIDX[text.toLowerCase()];
  if (!h) return (nativeCache[key] = null);
  try {
    /* 느린 판은 더 두지 않는다 ('느리게 듣기'를 없앴고 저장소가 1GB 에 닿았다).
       보통 소리로도 높낮이 곡선은 그려진다 (2026-08-30). */
    const r = await fetch(`audio/${voiceDir()}/n/${h}.mp3`);
    const c = await PITCH.analyze(await r.arrayBuffer(), getCtx());
    return (nativeCache[key] = c);
  } catch (e) { return (nativeCache[key] = null); }
}

function curveSvg(mine, native) {
  const W = 260, H = 92, PAD = 8;
  const all = [...(mine || []), ...(native || [])].filter(v => v !== null && isFinite(v));
  const lo = Math.min(-4, Math.min(...all)), hi = Math.max(4, Math.max(...all));
  const px = (i, n) => PAD + i * (W - PAD * 2) / (n - 1);
  const py = v => PAD + (hi - v) * (H - PAD * 2) / (hi - lo || 1);
  const path = arr => arr ? arr.map((v, i) => `${i ? 'L' : 'M'}${px(i, arr.length).toFixed(1)} ${py(v).toFixed(1)}`).join(' ') : '';
  const zero = py(0).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" class="curve">
    <line x1="${PAD}" y1="${zero}" x2="${W - PAD}" y2="${zero}" class="mid"/>
    ${native ? `<path d="${path(native)}" class="nat"/>` : ''}
    ${mine ? `<path d="${path(mine)}" class="mine"/>` : ''}
  </svg>`;
}

async function showTone(text, blobUrl, box, hostBox) {
  const merged = !!hostBox;                 // 단어 카드: 하나뿐인 그래프에 내 곡선을 겹친다(pitchGraph 가 'chao-rec' 로 받는다)
  const wait = el('div', 'cmpnote', '소리 높낮이를 재는 중…');
  if (merged) hostBox.append(wait); else { box.textContent = ''; box.append(wait); }

  let mine = null, nat = null;
  try {
    const r = await fetch(blobUrl);
    mine = await PITCH.analyze(await r.arrayBuffer(), getCtx(), true);   // 허밍 거르기
  } catch (e) { }
  nat = await nativeCurve(text);
  wait.remove();

  const host = merged ? hostBox : box.parentElement;
  if (mine && mine.reject) { verdict(host, 1, null, '높낮이', esc(mine.reject)); return; }
  if (!mine || !mine.curve) {
    verdict(host, 1, null, '높낮이', '못 읽었습니다 — 조금 크고 또박또박 다시');
    return;
  }

  if (merged) {
    REC.mine = mine; REC.mineKey = text;
    window.dispatchEvent(new CustomEvent('chao-rec', { detail: text }));
  } else {
    const wrap = el('div', 'curvebox');
    wrap.innerHTML = curveSvg(mine.curve, nat && nat.curve);
    box.append(wrap);
    const lg = el('div', 'curvelegend');
    lg.innerHTML = `<span class="k nat"></span>원어민 &nbsp; <span class="k mine"></span>나`;
    box.append(lg);
  }

  /* 점수를 매기지 않는다.
     음높이만 보는 방식은 성조를 세밀하게 가려내지 못한다(문헌상 72~75%).
     그래서 '오르내리는 방향'이 같았는지만 말해주고, 나머지는 눈으로 보게 한다. */
  /* 판정은 '끝이 어디냐'가 아니라 **곡선 모양 전체**로 한다.
     예전에는 앞뒤 삼분의 일만 견줘서, 가운데가 푹 꺼져도 끝만 맞으면 통과였다.
     이제 원어민 1,151개로 뽑은 본보기와 견준다. */
  /* 판정은 셋 중 하나다 — 맞음 / 틀림 / **못 가리겠음**.
     '모르겠다'가 없으면 제대로 낸 발음의 13%를 틀렸다고 하게 된다(실측). */
  const want = targetFam(text) || (nat && PITCH.classify(nat) && PITCH.classify(nat).fam);
  const j = want && PITCH.judge(mine, want);
  { const c = j && j.v !== 'unsure' ? j.fam : null; if (c && text.trim().split(/\s+/).length === 1) sibLoad().then(() => heardLine(host, { fam: c })); }
  if (!j) { verdict(host, 1, null, '높낮이', '이번엔 높낮이를 못 읽었습니다'); return; }
  /* 성조 판정을 분석에 쌓는다 (2026-10-02 대표님 "말하기 세부 — 소리 인식을 잘 못하던데 방해 아님?") — 폰 음성 인식과 상관없이 앱이 직접 잰 높낮이.
     목표 무리(flat·rise·dip)마다 맞음/다르게 들림. '못 가리겠음'은 점수에 안 넣고 stone_u 에 따로 센다 */
  if (j.v === 'unsure') bump('stone_u', want, false); else bump('stone', want, j.v === 'ok');
  save();
  if (j.v === 'ok') {
    verdict(host, 1, true, '높낮이', `${j.ko} — 모양이 맞습니다`);
  } else if (j.v === 'miss') {
    verdict(host, 1, false, '높낮이', `${j.wantKo}이어야 하는데 <b>${j.ko}</b>으로 들립니다`);
    toneTip(host, j.want, j.fam, text);
    if (j.note) hardToneNote(host);
  } else {
    verdict(host, 1, null, '높낮이', '가려내기 어렵습니다');
    if (j.note) hardToneNote(host);
    host.append(el('div', 'fixtip', '↳ 소리가 짧거나 흐려서 <b>확실하게 가릴 수 없습니다.</b> ' +
      '틀렸다고 하지 않겠습니다 — <b>폰을 입 가까이</b> 대고 한 번 더 또박또박 말해 보세요.'));
  }
}

/* 이 단어이 내야 할 성조 무리. 한 음절짜리는 데이터에 적힌 성조를 그대로 쓴다
   (원어민 녹음을 다시 재는 것보다 정확하다). 여러 음절이면 원어민 녹음으로 견준다. */
function targetFam(text) {
  const it = findItem(text);
  const t = it && it.tones;
  if (!t || t.length !== 1) return null;
  return PITCH.FAM[t[0].name] || null;
}

/* hỏi·ngã 는 원어민 사이에서도 갈리는 성조다 — 못 냈다고 기죽을 일이 아니라는 것을 알려 준다.
   다만 '베트남 사람이 다 못 한다'는 말은 사실이 아니다. 북부는 또렷이 가른다. */
function hardToneNote(host) {
  host.append(el('div', 'fixtip soft',
    '· 이 두 성조(<b>hỏi</b> 와 <b>ngã</b>)는 <b>남부·중부에서 하나로 합쳐져</b> 현지 사람들도 잘 가르지 않습니다 — ' +
    '남부는 사실상 다섯 성조이고, 베트남 사람이 맞춤법에서 가장 많이 틀리는 것도 이 둘입니다.<br>' +
    '기계도 여기서 가장 많이 헷갈립니다. <b>못 맞혔다고 기죽지 마세요.</b> 북부 소리로는 <b>내렸다가 다시 올립니다.</b>'));
}

/* 틀렸을 때 **무엇을 어떻게** 고칠지 한 줄. 이름만 말해 주면 고칠 수가 없다. */
const TONETIP = {
  'flat>rise': '끝을 올리셨습니다 — <b>올리지 말고 그대로 내려 놓으세요.</b>',
  'flat>dip':  '가운데가 푹 꺼졌습니다 — <b>한 번에 쭉 내리세요.</b> 중간에 다시 올리지 마세요.',
  'rise>flat': '내리기만 했습니다 — <b>끝을 위로 치켜올리세요.</b>',
  'rise>dip':  '내렸다 올리셨습니다 — <b>처음부터 곧장 올리세요.</b>',
  'dip>flat':  '내리기만 했습니다 — <b>내렸다가 다시 올리세요.</b>',
  'dip>rise':  '올리기만 했습니다 — <b>먼저 내렸다가 올리세요.</b>',
};
const TONEHINT = {
  'ngang': '평평하게, 높이를 그대로 유지합니다.',
  'huyền': '낮게 시작해 천천히 더 내립니다.',
  'sắc':   '짧고 날카롭게 위로 올립니다.',
  'hỏi':   '내렸다가 다시 올립니다.',
  'ngã':   '가운데를 한 번 끊었다가 올립니다.',
  'nặng':  '짧고 무겁게 뚝 끊습니다.',
};
function toneTip(host, want, got, text) {
  const t = TONETIP[want + '>' + got];
  if (!t) return;
  const it = findItem(text), nm = it && it.tones && it.tones.length === 1 && it.tones[0].name;
  const d = el('div', 'fixtip', '↳ ' + t + (nm && TONEHINT[nm] ? ' <i>' + esc(text) + '는 ' + TONEHINT[nm] + '</i>' : ''));
  host.append(d);
}

/* 글자가 다르게 들렸을 때의 한 줄. */
function sayTip(target, heard) {
  const a = stripTone(target).toLowerCase().replace(/\s+/g, ' ').trim();
  const b = stripTone(heard).toLowerCase().replace(/\s+/g, ' ').trim();
  if (b.split(' ').length < a.split(' ').length) return '음절이 빠졌습니다 — <b>한 음절씩 끊어서</b> 말해 보세요.';
  if (b.split(' ').length > a.split(' ').length) return '음절이 늘었습니다 — <b>붙여서 한 번에</b> 말해 보세요.';
  if (a[0] !== b[0]) return '<b>첫소리</b>가 다르게 들립니다 — 입 모양을 먼저 만들고 시작하세요.';
  if (a.slice(-1) !== b.slice(-1)) return '<b>끝소리</b>가 다르게 들립니다 — 끝까지 소리를 내세요.';
  return '<b>입을 조금 더 크게</b> 벌리고 천천히 말해 보세요.';
}

/* ---------- 화면 ---------- */
const VIEWS = ['home', 'learn', 'quiz', 'tone', 'award', 'rules', 'type', 'speak', 'course', 'write', 'news', 'wx', 'week', 'nick', 'sub', 'exam'];
/* 위 여남 토글은 소리가 나는 화면에서만 보여준다 — 나머지에선 자리만 차지한다.
   북부/남부 토글은 없앴다(대표님 지시, 2026-09-09) — 버튼 자체를 index.html에서 지웠다. */
const SNDV = ['learn', 'quiz', 'tone', 'speak', 'type', 'write'];
let CURV = 'home';
let FACE = null;                     // 단어 카드가 열려 있을 때 [단어|발음] 넘기는 함수 — 머리띠 #face 가 부른다 (2026-09-27)
const NAV = [];                      // 뒤로가기 발자국 (홈에 오면 비운다)
const dive = fn => { NAV.push(fn); };
function topBtns() {
  const need = SNDV.includes(CURV);
  $('#voice').hidden = !need;
  $('#wxnow').hidden = CURV !== 'home';          // 첫 화면에서만
}

/* ---------- 아래 탭 막대 ----------
   처음엔(2026-09-08) 목록류 화면에서만 켰다. 그런데 학습 중에 다른 데로 못 갔다 —
   대표님 지시(2026-09-09): "항상 화면 하단에는 버튼 4개가 표시되도록, 학습하는
   중에도 언제든 이동할 수 있도록." 이제 어느 화면에서든 늘 켜 둔다. 자판·채팅
   입력칸처럼 화면 아래에 붙박이가 있는 화면은 그 붙박이를 탭 막대 위로 올렸다
   (style.css의 --tabbar-h, .chatin/.tonebar 참고). */
let ACTIVE_TAB = 'home';
function syncTabBar() {
  $('#tabbar').hidden = false;
  document.body.classList.add('has-tabbar');
  $$('#tabbar .tabbtn').forEach(b => b.classList.toggle('on', b.dataset.tab === ACTIVE_TAB));
}
/* 아래 탭 4개 (2026-09-08 홈 재설계 지시): 하루5분·학습·시험·내 정보.
   기존 기능(startLearn·courseEntry·reviewMenu·vlptEntry·renderAwards)을 그대로 잇는다 —
   화면을 새로 짜는 게 아니라 들어가는 문만 새로 낸다. */
/* 홈 ≠ 하루5분 (대표님 지시, 2026-09-12: "홈버튼 누르면 스티치가 디자인해준 화면을
   보여주라고, 하루5분을 보여주지말고"). 홈 단추·탭은 renderHome()(스티치 대시보드)을
   그대로 쓴다. 앱을 처음 켤 때만 dailyFlowEntry()(하루5분)로 바로 들어간다
   (10241번 줄, 2026-09-09 지시는 그대로 유지) — 그 둘은 이제 서로 다른 문이다. */
/* 2026-09-27 대표님 지시: 아래 단추는 [홈][학습][테스트] + 넷째(미정 — 정하실 때까지 '사전').
   하루5분 탭은 뺐다 — 홈의 [오늘 학습 시작하기]가 같은 문(dailyFlowEntry → startLearn)이다. */
const TAB_ACTIONS = { home: renderHome, study: studyHubEntry, test: testHubEntry, dict: () => { NAV.length = 0; dictEntry(); } };
$$('#tabbar .tabbtn').forEach(b => b.onclick = () => {
  ACTIVE_TAB = b.dataset.tab;
  (TAB_ACTIONS[b.dataset.tab] || renderHome)();
});
/* 하루5분 — 오늘 레슨을 바로 시작한다. startLearn() 안에 이미 카드→테스트→오늘의 대화가
   순서대로 들어있어 새로 안 짜도 된다. '이어하기'도 새 상태를 안 만들어도 된다 — 이미
   S.done[k]로 끝난 세트를 표시해 두므로, courseQueue()가 중간에 나가도 같은 미완성
   레슨을 다시 돌려준다(끝난 게 아니니까). */
function dailyFlowEntry() {
  /* 과정이 아직 안 왔으면 — 앱을 막 켰을 때는 늘 COURSE 가 비어 있으니, 받아 온 뒤
     이 함수를 다시 불러 바로 오늘 학습으로 들어간다(2026-09-09 지시).
     단, 그사이 사용자가 다른 탭(홈 등)으로 넘어갔으면 다시 끼어들지 않는다 —
     ACTIVE_TAB 이 여전히 'daily'일 때만 재시도한다. */
  if (!COURSE) {
    fetch('data/order.json', { cache: 'no-cache' }).then(r => r.json())
      .then(j => { COURSE = j; loadCWords();
                   if (ACTIVE_TAB === 'daily') dailyFlowEntry(); })
      .catch(() => { renderHome(); });
    return;
  }
  const q = courseQueue(1);
  if (q.length) startLearn(q[0]);
  else renderHome();                                     // 오늘 할 게 없으면(다 끝남) 홈으로
}
/* 학습 — 회화/시험 대비/복습 세 갈래로 보낸다. 각 화면은 이미 있는 걸 그대로 쓴다
   (courseEntry·reviewMenu 중복 금지). '시험 대비 전용 학습'은 아직 콘텐츠가 없어
   준비 중이라고 정직하게 말한다 — 되는 척 안 한다. */
/* 학습 탭 (대표님 지시 2026-09-27) — 네 카드를 한 화면에 늘어놓는다 (기본기·단어·문법·내 단어장).
   2-1 기본기: 자음(P3) · 모음(P1) · 성조(P2) · 타이핑(자판 치는 법은 그 안에 접힘) — 09-27 낮 지시로 재편
   2-2 단어: 일상(회화 일차) · 직무(8갈래) · 교재(메인 교재) · 단어시험(선배) · 수업 단어(22기 A·B반 회차 순)
   2-3 문법: 책마다 한 줄 — 기초 · 중급 1·2 · 메인 교재 1·2권 · 줌 수업
   화면을 새로 짜지 않고 **있는 문**(startLearn·renderDays·drawJob·drawGybmLessons·startGram)만 잇는다. */
/* 2026-09-27 저녁, 대표님: "학습에서 크게 기본·단어·문법으로 나눠야지. 거기 들어가서 챕터 보이게".
   스티치(Stitch MCP, 프로젝트 'TOPIK Duolingo for Vietnam', 디자인 시스템 'Functional Clarity') 시안 두 장을 그대로 옮겼다:
   ① 학습 허브 = 큰 카드 셋(아이콘·제목 22px·부제·8px 진도 막대·'끝냄 n/N')
   ② 단어 = 갈래 다섯 줄이 접혔다 펼쳐지는 아코디언, 펼치면 그 갈래의 챕터가 길(로드맵)로 보인다.
   기본·문법도 같은 틀: 기본은 길 하나, 문법은 책마다 아코디언. */
const HUB_ICO = {
  basic: '<svg viewBox="0 0 24 24"><path d="M4 5.5c2.4-1 5-1 8 .4v13c-3-1.4-5.6-1.4-8-.4z"/><path d="M20 5.5c-2.4-1-5-1-8 .4v13c3-1.4 5.6-1.4 8-.4z"/></svg>',
  words: '<svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="13" height="14" rx="2"/><path d="M8 3.5h10.5a2 2 0 0 1 2 2V16"/><path d="M7 11h6M7 15h4"/></svg>',
  gram: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 11h10M4 16h7"/><path d="m15 19 5-5-2-2-5 5v2z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  test: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10l1.5 1.5 3-3M8.5 16h7"/></svg>',
  han: '<svg viewBox="0 0 24 24"><text x="12" y="17.5" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor" stroke="none">漢</text></svg>',
};
let WOPEN = null;                                   // 단어 화면에서 펼쳐 둔 갈래
let GOPEN = null;                                   // 문법 화면에서 펼쳐 둔 책
let ANA_OPEN = null;                                // 실력 분석에서 펼쳐 둔 영역
/* 영역을 눌러 펼치는 세부 분석은 잠시 뺐다 (대표님 2026-10-02 "일단은 세부적인 성적 분석은 빼 봐") — 기록은 그대로 쌓이고, true 로 바꾸면 다시 보인다 */
const ANA_DETAIL = false;
function studyStats() {
  const basicKeys = [...BASIC_ORDER, 'TYPE'];          // 자음 · 모음 · 겹모음 · 받침 · 성조 · 헷갈리는 소리 · 타이핑(24판을 끝내면 끝냄)
  const basic = [basicKeys.filter(k => S.done[k]).length, basicKeys.length];
  const days = ALL.filter(d => typeof d.day === 'number' && !d.track);
  let wd = days.filter(d => S.done[d.day]).length, wa = days.length;
  if (COURSE) jobVols().forEach(jv => jv.tracks.forEach((t, ti) => t.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => {
    wa++; if (S.done['J0.' + ti + '.' + ci + '.' + li]) wd++; }))));
  if (GYBM) GYBM.forEach(src => src.lessons.forEach((l, li) => { wa++; if (bdone()[gybmKey(src.key, li)]) wd++; }));
  let gd = 0, ga = 0;
  if (GRAM) GRAM.books.forEach((bk, bi) => bk.bai.forEach((x, ni) => { ga++; if (S.done[gkey(bi, ni)]) gd++; }));
  return { basic, words: [wd, wa], gram: [gd, ga] };
}
function studyHubEntry() {
  SBOX = 'srs';
  const b = $('#subBody');
  b.textContent = '';
  const st = studyStats();
  /* 부제 글줄은 뺐다 (대표님 지시 2026-09-27: "학습과 테스트에 있는 소제목 글자들 모두 없애") — 제목·진행 막대·숫자만 */
  const card = (ico, t, prog, fn) => {
    const c = el('button', 'hubcard');
    const [done, all] = prog || [0, 0];
    const pct = all ? Math.round(done / all * 100) : 0;
    c.innerHTML = `<span class="hubico">${ico}</span><span class="hubbody"><b class="hubt">${esc(tr(t))}</b>` +
      (prog ? `<span class="hubprog"><i class="hubbar"><i style="width:${done ? Math.max(3, pct) : 0}%"></i></i><small>${done}/${all}</small></span>` : '') +
      `</span><svg class="hubchev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`;
    c.onclick = () => { dive(studyHubEntry); WOPEN = null; GOPEN = null; fn(); };   // 들어갈 때 토글은 모두 닫힌 채로 (대표님 지시 2026-09-30: "토글 열려 있지 마라")
    b.append(c);
  };
  card(HUB_ICO.basic, '기본기', st.basic, studyBasicsEntry);
  card(HUB_ICO.words, '단어', st.words, studyWordsEntry);       // 내 단어장은 단어 안으로 옮겼다 (대표님 지시 2026-09-30)
  card(HUB_ICO.gram, '문법', st.gram, studyGramEntry);
  card(HUB_ICO.test, '단어 시험', null, () => dailyEntry('study'));   // 이름 '매일 단어 시험' → '단어 시험' (대표님 2026-10-01) · 22기 반 시험 — 학습에서는 카드로 학습만, 시험은 테스트 탭 (2026-09-30)
  /* '한자어 맞히기' 카드는 뺐다 (대표님 2026-10-02 "학습 탭에 한자어 맞히기가 왜 있냐") — hanQuizEntry 함수는 남겨 둠 */
  /* 학습 탭의 '주간 시험'은 뺐다 (대표님 2026-10-01: 주간 시험은 범위 낱말+문법의 종합이라 단어·문법에서 이미 배운다). 쓰기 연습은 테스트 탭 회차 화면으로 */
  show('sub', '학습', true);
  // 자료가 아직 안 왔으면 받아서 이 화면을 다시 그린다 (진도 숫자가 채워진다). 다른 데로 갔으면 건드리지 않는다.
  const still = () => CURV === 'sub' && $('#title').textContent === tr('학습');
  if (!GRAM) fetch('data/grammar.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { GRAM = gramReady(j); if (still()) studyHubEntry(); }).catch(() => {});
  if (!GYBM) gybmBuild(() => { if (still()) studyHubEntry(); });
  if (!COURSE) withCourse(() => { if (still()) studyHubEntry(); });
}
function hanQuiz(pane, pool) {
  const N = 10, pick = [...pool].sort(() => Math.random() - .5).slice(0, N);
  let i = 0, ok = 0;
  const draw = () => {
    pane.textContent = '';
    if (i >= pick.length) {
      pane.append(el('div', 'hanqend', '<b>' + ok + ' / ' + pick.length + '</b>'));
      const again = el('button', 'primary', tr('다시')); again.type = 'button'; again.onclick = () => hanQuiz(pane, pool);
      pane.append(again); return;
    }
    const q = pick[i], n = q.vi.split(' ').length, sy = new Set(q.vi.toLowerCase().split(' '));
    const same = pool.filter(x => x !== q && x.vi.split(' ').length === n);
    const near = same.filter(x => x.vi.toLowerCase().split(' ').some(t => sy.has(t))).sort(() => Math.random() - .5);
    const opts = [q, ...near.slice(0, 2)];
    same.sort(() => Math.random() - .5).forEach(x => { if (opts.length < 4 && !opts.includes(x)) opts.push(x); });
    opts.sort(() => Math.random() - .5);
    pane.append(el('div', 'hanqn', (i + 1) + ' / ' + pick.length));
    pane.append(el('div', 'hanqh', esc(q.h)), el('div', 'hanqr', esc(q.r)));
    const box = el('div', 'hanqopts');
    opts.forEach(o => {
      const bt = el('button', 'hanqopt', esc(o.vi)); bt.type = 'button'; bt.dataset.v = o.vi;
      bt.onclick = () => {
        [...box.children].forEach(c => { c.disabled = true; });
        const good = o === q; if (good) ok++;
        bt.classList.add(good ? 'ok' : 'no');
        [...box.children].find(c => c.dataset.v === q.vi).classList.add('ok');
        const k = recKey(q.vi); if (k) play(k, false, voiceDir()); else speakVi(q.vi, false, 0, S.voice);
        const map = [...q.h].map((c, j) => esc(c) + ' ' + esc([...q.r][j]) + ' → <b>' + esc(q.vi.split(' ')[j]) + '</b>').join(' · ');
        pane.append(el('div', 'hanqans', '<div class="hanqmap">' + map + '</div>' + (q.ko ? '<div class="hanqko">' + esc(q.ko) + '</div>' : '')));
        const nx = el('button', 'primary', tr('다음')); nx.type = 'button'; nx.onclick = () => { i++; draw(); };
        pane.append(nx);
      };
      box.append(bt);
    });
    pane.append(box);
  };
  draw();
}
/* 기본기 — 자음 · 모음 · 성조 · 타이핑, 단추 넷 (대표님 지시 2026-09-27).
   · 차례의 근거: 자음(첫소리) → 모음(가운뎃소리) → 성조(음절 전체에 얹힘) — 베트남 초등 국어(Tiếng Việt 1)가
     음절을 가르치는 차례(âm đầu → vần → thanh)와 같다. 타이핑은 셋을 다 알아야 칠 수 있으니 맨 뒤.
   · '자판 치는 법'은 타이핑 연습 안(맨 위 접힘 표)으로 넣었고, '성조 듣고 가르기'·'모음 듣고 가르기'는
     성조·모음 챕터의 끝(귀로 구별하기)과 같은 것이라 뺐다. 손글씨는 테스트로 옮겼다. */
/* 2026-09-28 대표님 지시 "모든 모음과 자음이 나오게 · 뒤에 뭐만 올 수 있다 · 같거나 비슷한 소리" → 겹모음(P4)·받침(P5)·헷갈리는 소리(P6) 추가.
   차례: 첫소리 → 모음 → 겹모음 → 받침(모음을 알아야 연습됨) → 성조 → 헷갈리는 소리. 자료 원본은 tools/build_basics.py */
/* 2026-09-29 대표님 지시 "i와 y의 차이 · 각 모음 위의 모자·성조 · gio 같은 결합 — 관련된 모든 것 / 숫자 읽는 규칙 자세하게 / 긴 글을 나누는 기준(학문적으로)"
   → 철자·성조 부호 규칙(P7)·숫자 읽기(P8)·끊어 읽기(P9). 숫자·끊어 읽기 카드는 입모양 대신 규칙이 주인공이라 입모양 판을 안 그린다(x.nomouth). */
const BASIC_ORDER = ['P3', 'P1', 'P4', 'P5', 'P2', 'P6', 'P7', 'P8', 'P9'];
function studyBasicsEntry() {
  const b = $('#subBody'); b.textContent = '';
  const back = () => studyBasicsEntry();
  const nodes = [];
  BASIC_ORDER.forEach(k => { const d = ALL.find(x => x.day === k); if (d) nodes.push({
    key: d.day, title: d.theme, done: !!S.done[d.day], fn: () => { dive(back); startLearn(d); } }); });
  nodes.push({ key: 'TYPE', title: '타이핑', done: !!S.done['TYPE'], fn: () => { dive(back); startType(); } });
  nodes.forEach((n, i) => { n.num = i + 1; });
  const list = el('div', 'ulist');
  b.append(list);
  renderRoadmap(list, nodes, null, { freeNav: true });
  show('sub', '기본기', true);
}
/* 아코디언 한 줄 — 머리(제목·부제·n/N 알약·화살)와, 펼치면 길이 그려지는 몸통 */
function accRow(host, o, open, onToggle, scroll) {
  const box = el('div', 'acc' + (open ? ' open' : ''));
  const head = el('button', 'acchead');
  head.type = 'button';
  head.innerHTML = `<span class="acctxt"><b>${esc(tr(o.title))}</b></span>` +      // 부제 글줄은 뺐다 (2026-09-27)
    `<span class="accpill">${o.done}/${o.all}</span><svg class="accchev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`;
  head.onclick = onToggle;
  box.append(head);
  if (open) {
    const body = el('div', 'accbody');
    box.append(body);
    if (o.nodes) {
      const list = el('div', 'ulist');
      body.append(list);
      renderRoadmap(list, o.nodes, null, { freeNav: true, noScroll: !scroll });
      const nx = list.querySelector('.ubtn:not(.done)');            // 다음 할 것 표시 + 그 자리로 (2026-09-27 밤)
      if (nx) { nx.classList.add('next'); if (scroll) setTimeout(() => { try { nx.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }, 60); }
    } else body.append(el('p', 'note', tr(o.note || '불러오는 중…')));
  }
  host.append(box);
}
/* 단어 — 다섯 갈래 아코디언, 펼치면 챕터가 길로 */
/* 교재 과 ↔ 일상 주제 (대표님 지시 2026-09-29: "메인교재 4단원은 직업과 장소 — 일상에 직업·장소 챕터가 있으면 관련 챕터 표시").
   data/topic_links.json = { main: { 교재 과 제목: { book: '1권 4과', topic, days: [일상 주제 이름…] } } } — 목록의 작은 줄에 서로 적는다 */
let TLINK = null, TLINK_P = null;
function tlinkLoad(fn) {
  if (TLINK) return fn && fn();
  if (!TLINK_P) TLINK_P = fetch('data/topic_links.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { TLINK = j.main || {}; }).catch(() => { TLINK = {}; });
  TLINK_P.then(() => fn && fn());
}
const tlinkMain = title => { const x = TLINK && TLINK[String(title).split(' · ')[0]]; return x ? tr('관련') + ': ' + tr('일상') + ' ' + x.days.slice(0, 3).map(t => tr(t)).join('·') : ''; };
function studyWordsEntry(scroll) {
  const b = $('#subBody'); b.textContent = '';
  const back = () => studyWordsEntry();
  const still = () => CURV === 'sub' && $('#title').textContent === tr('단어');   // 탭 상태(ACTIVE_TAB)는 안 본다 — 다른 길로 들어와도 자료가 오면 다시 그려야 한다 (2026-09-28 무한 로딩 원인)
  if (!TLINK) tlinkLoad(() => { if (still()) studyWordsEntry(true); });
  const rows = [];
  // ① 일상
  const days = ALL.filter(d => typeof d.day === 'number' && !d.track).sort((x, y) => (x.n || 0) - (y.n || 0));
  rows.push({ key: 'days', title: '일상', sub: days.length + tr('일차') + ' · ' + days.reduce((a, d) => a + (d.words || []).length, 0) + tr('단어'),
    done: days.filter(d => S.done[d.day]).length, all: days.length,
    nodes: days.map((d, i) => ({ key: d.day, title: d.theme, rel: '', num: i + 1,   // '교재 1권 1과' 작은 줄은 뺐다 (대표님 2026-10-02)
                                 done: !!S.done[d.day],
                                 fn: () => { SBOX = 'srs'; dive(back); startLearn(d); } })) });
  // ② 직무 — 갈래별 레슨 전부를 한 길로 (갈래 이름 · 레슨 이름)
  const jv = COURSE ? jobVol(0) : null;
  if (jv) {
    const nodes = []; let n = 0;
    jv.tracks.forEach((t, ti) => t.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => {
      const k = 'J0.' + ti + '.' + ci + '.' + li;
      nodes.push({ key: k, title: t.track + ' · ' + lsName(l, li), sub: l.words.length + tr('단어'), num: ++n, done: !!S.done[k],
                   fn: () => { SBOX = 'srs'; JOBI = 0; dive(back); startLearn({ day: k, theme: t.track + ' · ' + lsName(l, li), words: l.words, course: 1 }); } });
    })));
    rows.push({ key: 'job', title: '직무', sub: jv.tracks.length + tr('갈래') + ' · ' + jv.tracks.reduce((a, t) => a + (t.words || 0), 0) + tr('단어'),
      done: nodes.filter(x => x.done).length, all: nodes.length, nodes });
  } else rows.push({ key: 'job', title: '직무', sub: '8갈래', done: 0, all: 0, nodes: null });
  // ③④⑤ 교재 · 단어시험 · 수업 단어
  /* 22기 단어 시험 자료는 테스트 → 매일 단어 시험으로 옮겼다 (대표님 결정 2026-09-30: 같은 자료로 들어가는 문이 둘이면 헷갈린다). 복습 창고(bsrs)·지난 진도는 그대로 */
  [['main', '교재']].forEach(([key, title]) => {   // '선배 단어 시험 자료' 칸은 지웠다 (대표님 2026-10-03 "선배 단어 완전 삭제") — 일상·직무에 섞여 들어간 낱말은 그대로
    const src = GYBM && GYBM.find(s => s.key === key);
    if (!src) { rows.push({ key, title, sub: '', done: 0, all: 0, nodes: null }); return; }
    const nodes = src.lessons.map((l, li) => ({ key: gybmKey(key, li), title: l.title,
      sub: (l.sub ? l.sub + ' · ' : '') + l.words.length + tr('단어') + (l.words.some(isCore) ? ' · ' + tr('핵심') + ' ' + l.words.filter(isCore).length : ''),
      rel: key === 'main' ? tlinkMain(l.title) : '',   // 관련 일상 주제 (2026-09-29)
      num: li + 1, done: !!bdone()[gybmKey(key, li)],
      fn: () => { SBOX = 'bsrs'; dive(back); startLearn({ theme: l.title, day: gybmKey(key, li), basic: 1, words: l.words }); } }));
    rows.push({ key, title, sub: src.lessons.length + tr('레슨') + ' · ' + src.lessons.reduce((a, l) => a + l.words.length, 0).toLocaleString('ko-KR') + tr('단어'),
      done: nodes.filter(x => x.done).length, all: nodes.length, nodes });
  });
  // 처음엔 다 접혀 있다 — 갈래를 눌러야 그 안이 보인다 (대표님 지시 2026-09-27)
  { const wb = el('button', 'hubcard');                  // 내 단어장 — 단어 안 맨 위 (대표님 지시 2026-09-30)
    wb.innerHTML = `<span class="hubico">${HUB_ICO.book}</span><span class="hubbody"><b class="hubt2">${esc(tr('내 단어장'))}</b></span><svg class="hubchev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`;
    wb.onclick = () => { dive(back); wordbookEntry(); }; b.append(wb); }
  rows.forEach(r => accRow(b, r, WOPEN === r.key, () => { WOPEN = WOPEN === r.key ? null : r.key; studyWordsEntry(true); }, scroll));
  show('sub', '단어', true);
  if (!COURSE) withCourse(() => { if (still()) studyWordsEntry(); });
  if (!GYBM) {
    gybmBuild(() => { if (still()) studyWordsEntry(true); });
    setTimeout(() => {                                       // 8초 안에 안 오면 무한 로딩으로 두지 않는다
      if (GYBM || !still()) return;
      const note = b.querySelector('.acc.open .note');
      if (!note) return;
      note.textContent = ''; note.append(el('span', null, tr('자료를 받지 못했습니다. ')));
      const rb = el('button', 'ghost sm', tr('다시 시도')); rb.type = 'button'; rb.onclick = () => { GYBM = null; studyWordsEntry(true); }; note.append(rb);
    }, 8000);
  }
}
/* 문법 — 책마다 아코디언, 펼치면 과가 길로 */
function studyGramEntry(scroll) {
  const b = $('#subBody'); b.textContent = '';
  const back = () => studyGramEntry();
  if (!GRAM) {
    b.append(el('p', 'lede', tr('불러오는 중…')));
    show('sub', '문법', true);
    fetch('data/grammar.json', { cache: 'no-cache' }).then(r => r.json())
      .then(j => { GRAM = gramReady(j); if (CURV === 'sub' && $('#title').textContent === tr('문법')) studyGramEntry(); })
      .catch(() => { b.textContent = ''; b.append(el('p', 'lede', tr('불러오지 못했습니다'))); });
    return;
  }
  /* 두 눈으로 본다 (대표님 지시 2026-09-30 밤: "메인교재·사이드자료·줌 수업 자료가 문법 파트의 교재 파트가 되어야 한다. 내가 말한 문법은 초반에 다").
     46과는 그대로(열쇠 'H과'·진도 안 깨짐). 같은 과를 두 갈래로 늘어놓는다 — 한 과가 여러 묶음에 들어갈 수 있다.
     ① 수준별: 초급 = 메인 1권에서 온 과 + 줌 수업 과 + 17과(ở đâu·đi đâu, 2권 2과) + 사이드 기초에서만 온 필수 과(14·18·20·23).
        대표님이 든 문법이 전부 들어간다 — có…không 5·19, phải không 5, ở đâu 17, gì 4·5, ai 5, đều 28, đã 10·11, đi/về 18·21, nào 5·15, mấy/bao nhiêu 8·15, của 4(2026-09-30 새로).
        중급 = 나머지(메인 2권·사이드 중급). 안에서는 46과의 원래 차례(쉬운 것부터).
     ② 교재별: 메인 1권(src 3) · 메인 2권(4) · 사이드 기초(0 = Tiếng Việt Cơ sở 2) · 사이드 중급 1(1 = Nâng cao 1) · 사이드 중급 2(2 = Nâng cao 2) · 줌 수업(5), 그 책의 과 차례.
        메인 보조(B1~B3)의 문형 6개는 4·5과 안에 있으나 책 번호가 없어 따로 묶지 못한다. */
  const bk = GRAM.books[0];
  const BK = [[3, '메인 1권', '메인 교재 1권'], [4, '메인 2권', '메인 교재 2권'], [6, '메인 보조', 'VSL1 B1~B3'], [0, '사이드 기초', 'Tiếng Việt Cơ sở 2'], [1, '사이드 중급 1', 'Tiếng Việt Nâng cao 1'], [2, '사이드 중급 2', 'Tiếng Việt Nâng cao 2'], [5, '줌 수업', '줌 수업 자료']];
  const BKN = { 3: '1권', 4: '2권', 6: '보조 B', 0: '기초', 1: '중급 1', 2: '중급 2', 5: '줌' };   // 6 = 메인 보조 VSL1 B1(6-0)·B2(6-1)·B3(6-2) (2026-09-30)
  const ESS = { 14: 1, 17: 1, 18: 1, 20: 1, 23: 1 };
  const units = bk.bai.map((x, ni) => {
    if (x.ng) return null;                              // 문법이 아닌 과(1·2과) — 기본기·일상으로 옮김
    const ch = {};
    (x.src || []).forEach(t => { const [b2, c] = t.split('-').map(Number); if (ch[b2] === undefined || c < ch[b2]) ch[b2] = c; });   // 책마다 첫 과
    const lv = ch[3] !== undefined || ch[5] !== undefined || ESS[x.no] ? '초급' : '중급';
    const fb = [3, 4, 6, 5, 0, 1, 2].find(b2 => ch[b2] !== undefined);
    const from = fb !== undefined ? BKN[fb] + ' ' + (ch[fb] + 1) + tr('과') : '';
    return { ni, x, ch, lv, from };
  }).filter(Boolean);
  const node = (u, from) => ({ key: gkey(0, u.ni), title: u.x.t, sub: (from ? from + ' · ' : '') + (u.x.g || []).length + tr('개 문법'),
    done: !!S.done[gkey(0, u.ni)], fn: () => { dive(back); startGram(0, u.ni); } });
  const row = (key, title, sub, us, fromOf) => {
    const nodes = us.map((u, i) => Object.assign(node(u, fromOf(u)), { num: i + 1 }));
    return { key, title, sub: us.length + tr('과') + (sub ? ' · ' + sub : ''), done: nodes.filter(n => n.done).length, all: nodes.length, nodes };
  };
  const toggle = k => () => { GOPEN = GOPEN === k ? null : k; studyGramEntry(true); };
  /* 자주 쓰는 순서 (대표님 2026-10-01 "출처로 구분하지 말고 자주 쓰이는 순서로 — 시중 베스트셀러·스테디셀러 참고").
     예스24 판매량 1·2위 GO! 독학·NEW 가장 쉬운 독학 첫걸음과 착! 붙는·한 번에 끝내는 첫걸음·회화 핵심패턴 233·문법 마스터에서
     그 문법이 처음 나오는 과가 이른 것부터 — 근거는 tools/grammar_order/순서.tsv. 과 열쇠(gkey)는 그대로라 진도는 안 깨진다. 출처 글은 뺐다 */
  const GSTAGE = [['1단계', '처음 말하기', [2, 3, 4, 7, 6, 8, 12, 13]], ['2단계', '때·일상·할 수 있다', [9, 10, 22, 11, 16, 17, 18, 14, 26, 15]],
                  ['3단계', '부탁·비교·이유', [45, 20, 21, 39, 32, 28, 19, 23, 5, 27, 24, 30, 41]], ['4단계', '더 자연스럽게', [25, 29, 31, 33, 34, 35, 36, 37, 38, 40, 42, 43, 44]]];
  const byNi = {}; units.forEach(u => { byNi[u.ni] = u; });
  let num = 0;
  GSTAGE.forEach(([k, sub, nis]) => {
    const us = nis.map(n => byNi[n]).filter(Boolean);
    const nodes = us.map(u => Object.assign(node(u, ''), { num: ++num }));
    accRow(b, { key: k, title: tr(k), sub: us.length + tr('과') + ' · ' + tr(sub), done: nodes.filter(n => n.done).length, all: nodes.length, nodes }, GOPEN === k, toggle(k), scroll);
  });
  /* 교재별 묶음은 넣지 않는다 (대표님 2026-10-01 "출처로 구분하지 말고 자주 쓰이는 순서로" · 2026-10-06 "문법 파트에 교재별 구분 하지 말라니까") —
     과별 문법 지도(data/_gram_ch.json)는 주간 시험 범위·문장 테스트 범위에만 쓴다 */
  show('sub', '문법', true);
}
/* 과정 자료(order.json)가 있어야 하는 문 — 없으면 받아 온 뒤 연다 */
function withCourse(fn) {
  if (COURSE) return fn();
  fetch('data/order.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { COURSE = j; loadCWords(); fn(); }).catch(() => popup(tr('불러오지 못했습니다')));
}
function drawGramBook(bi) {
  const bk = GRAM.books[bi];
  const list = $('#dayList'); list.textContent = '';
  const nodes = bk.bai.map((x, ni) => {
    if (x.ng) return null;                              // 문법이 아닌 과는 목록에서 뺀다 (2026-09-30)
    const k = gkey(bi, ni);
    return { key: k, title: x.t, sub: x.no + tr('과') + ' · ' + (x.g || []).length + tr('개 문법'), num: ni + 1,
             done: !!S.done[k], fn: () => { dive(() => drawGramBook(bi)); startGram(bi, ni); } };
  }).filter(Boolean);
  roadInList(list, nodes);
  show('course', bk.book, true);
}

/* 머리 왼쪽 — 지금 베트남 시각과 날씨. 지역은 내 정보에서 고른 북부/남부를 따른다.
   출국 준비 중인 사람에게 '지금 거기 몇 시인가'는 매일 궁금한 것이고,
   날씨는 그날 뭘 입을지가 아니라 '내가 갈 곳이 어떤 곳인가'를 계속 상기시킨다. */
let WXNOW = { at: 0, t: null, code: null, city: null };
function drawWxNow() {
  const b = $('#wxnow');
  const c = 'n';   // 남부 없앰 — 항상 북부(하노이)
  const now = new Date();
  // 베트남은 한국보다 2시간 느리다 (UTC+7 / UTC+9)
  const vn = new Date(now.getTime() - 2 * 3600e3);
  const hh = String(vn.getHours()).padStart(2, '0') + ':' + String(vn.getMinutes()).padStart(2, '0');
  const icon = WXNOW.city === c && WXNOW.code != null ? (WXICON[WXNOW.code] || '·') : '';
  const temp = WXNOW.city === c && WXNOW.t != null ? Math.round(WXNOW.t) + '°' : '';
  b.innerHTML = `<span class="wxt">${hh}</span><span class="wxd">${icon}<b>${temp}</b></span>`;
  b.onclick = () => { dive(renderHome); showWx(c); };
  if (WXNOW.city !== c || Date.now() - WXNOW.at > 30 * 60e3) {   // 30분에 한 번만 묻는다
    const q = WXCITY[c];
    WXNOW.city = c; WXNOW.at = Date.now();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${q.lat}&longitude=${q.lon}` +
          '&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh')
      .then(r => r.json()).then(j => {
        WXNOW.t = j.current?.temperature_2m;
        WXNOW.code = j.current?.weather_code;
        drawWxNow();
      }).catch(() => { });
  }
}
setInterval(() => { if (CURV === 'home') drawWxNow(); }, 60e3);
/* 지금 무엇을 공부·시험하는지 — 머리띠 한 줄 (대표님 지시 2026-09-28 밤: "학습·테스트 중 최상단에 챕터 번호와 제목. 예: 단어-교재-1 chào em …").
   길면 3초 쉬었다가 천천히 옆으로 흘러 잘린 글자를 보여 주고, 끝에서 잠깐 멈춘 뒤 처음 자리로 돌아와 다시 3초 쉰다.
   '움직임 줄이기' 설정이면 흐르지 않고 말줄임(…)으로 둔다 */
var LCRUMB = '', CRUMB_ANIM = null;          // var — 앱이 켜지는 도중 show() 가 이 줄보다 먼저 불려도 멈추지 않게
var GYBM_NAME = { main: '교재', senior: '선배 시험', c22: '22기 시험' };
function jobNum(k) {
  const jv = COURSE && typeof jobVol === 'function' ? jobVol(0) : null;
  if (!jv) return '';
  let n = 0, hit = '';
  jv.tracks.forEach((t, ti) => t.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => { n++; if ('J0.' + ti + '.' + ci + '.' + li === k) hit = n; })));
  return hit;
}
function crumbOf(d) {
  if (!d) return '';
  const k = d.day, th = tr(d.theme || '');
  let m;
  if (typeof k === 'string' && (m = k.match(/^B:(main|senior|c22)(\d+)$/))) return tr('단어') + '-' + tr(GYBM_NAME[m[1]]) + '-' + (+m[2] + 1) + ' ' + th;
  if (typeof k === 'number') return tr('단어') + '-' + tr(d.track === 'work' ? '직무' : '일상') + '-' + (d.n || k) + ' ' + th;
  if (typeof k === 'string' && /^J0\./.test(k)) return tr('단어') + '-' + tr('직무') + '-' + jobNum(k) + ' ' + th;
  if (typeof k === 'string' && typeof BASIC_ORDER !== 'undefined' && BASIC_ORDER.includes(k)) return tr('기본기') + '-' + (BASIC_ORDER.indexOf(k) + 1) + ' ' + th;
  return th;
}
function setCrumb(text) {
  const box = $('#crumb');
  if (!box) return;
  const sp = box.firstElementChild, t = text || '';
  box.hidden = !t;
  if (sp.textContent === t && CRUMB_ANIM) return;          // 같은 글이면 흐름을 처음부터 다시 하지 않는다
  sp.textContent = t;
  crumbFlow();
}
function crumbFlow() {
  const box = $('#crumb'), sp = box && box.firstElementChild;
  if (CRUMB_ANIM) { CRUMB_ANIM.cancel(); CRUMB_ANIM = null; }
  const my = crumbFlow.n = (crumbFlow.n || 0) + 1;          // 짧은 새에 두 번 불리면 늦은 것만 — 흐름이 겹치지 않게
  if (!sp || box.hidden) return;
  setTimeout(() => {                                        // 그리기 뒤에 잰다 (rAF 는 화면이 가려지면 멈춰서 타이머로)
    if (my !== crumbFlow.n || box.hidden) return;
    if (CRUMB_ANIM) { CRUMB_ANIM.cancel(); CRUMB_ANIM = null; }
    const over = Math.ceil(sp.scrollWidth - box.clientWidth);
    box.classList.toggle('long', over > 2);
    if (over <= 2 || !sp.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wait = 3000, slide = Math.max(1600, over / 30 * 1000), hold = 1200, back = 800, T = wait + slide + hold + back;
    CRUMB_ANIM = sp.animate([
      { transform: 'translateX(0)', offset: 0 },
      { transform: 'translateX(0)', offset: wait / T, easing: 'linear' },                 // 3초 쉼
      { transform: 'translateX(' + (-over) + 'px)', offset: (wait + slide) / T },           // 천천히 흘러 끝까지
      { transform: 'translateX(' + (-over) + 'px)', offset: (wait + slide + hold) / T, easing: 'ease-in-out' },   // 끝에서 잠깐
      { transform: 'translateX(0)', offset: 1 }                                             // 처음 자리로 스르르
    ], { duration: T, iterations: Infinity });
  }, 60);
}
addEventListener('resize', () => { clearTimeout(crumbFlow.t); crumbFlow.t = setTimeout(crumbFlow, 200); });
function show(v, title, canBack) {
  if (v === 'home') { NAV.length = 0; SBOX = 'srs'; }   // 홈에 서면 복습 창고는 늘 하루 5분 것

  audio.pause(); myVoice.pause();               // 넘어가면 재생 중이던 소리도 멈춘다
  /* 첫 화면 소리 살리기 (대표님 2026-10-05 "테스트 첫 화면 나올 때 그 단어(문장)도 소리 나라") — 문제·카드는 화면을 그리면서 autoSay 를 부르고
     그 **뒤에** show 가 불려, 위 pause 가 방금 튼 첫 소리를 끊었다. 방금(0.6초 안) 자동 재생을 부탁한 것이 있으면 다시 튼다 */
  if (AS_PEND && Date.now() - AS_PEND.t < 600) { const vi = AS_PEND.vi; AS_PEND = null; setTimeout(() => { autoSay(vi); AS_PEND = null; }, 0); }
  resetRec();
  if (v !== 'learn' && v !== 'quiz') releaseMic(true);   // 카드·테스트 밖으로 나가면 마이크를 놓는다
  VIEWS.forEach(x => $('#' + x).hidden = x !== v);
  $('#title').textContent = tr(title);
  if (v !== 'learn' && v !== 'quiz') LCRUMB = '';           // 학습·문제 흐름 밖으로 나가면 지난 과 이름을 지운다
  setCrumb(v === 'learn' ? (LCRUMB || tr(title))
    : v === 'quiz' ? (ACTIVE_TAB === 'test' ? tr('테스트') + '-' + tr(title) : LCRUMB ? LCRUMB + ' · ' + tr(title) : tr(title)) : '');
  $('#back').hidden = !canBack;
  if (v !== 'learn') { $('#face').hidden = true; FACE = null; }
  if (v === 'learn') inkSetup();                                  // 손글씨 겹쳐 쓰기 (2026-09-28 밤)
  if (INK.btn) { INK.btn.hidden = v !== 'learn'; if (v !== 'learn') { inkFinger(false); inkClear(); } }   // [단어|발음]은 단어 카드에서만 — drawCard 가 show() 보다 먼저 켜 두므로 learn 에서는 건드리지 않는다
  /* 머리띠의 홈 단추는 뺐다 (대표님 지시 2026-09-27) — 아래 탭의 [홈]이 어디서든 한 번에 나가는 길이다. */
  if (window.cardArrows) setTimeout(window.cardArrows, 0);   // 좌우 넘김 단추는 학습 화면에서만
  CURV = v;
  if (v === 'home') ACTIVE_TAB = 'home';
  topBtns();
  /* 카드·테스트 화면에서는 아래 탭 4개를 숨긴다 (대표님 지시 2026-09-30: "하단은 손이 자주 가서 실수로 눌러 학습 중에 빠져나가는 일이 비일비재할 것" —
     나가는 길은 머리띠의 [‹ 뒤로] 하나뿐). 진도는 세트를 끝내야 확정되므로 실수로 나가면 그 세트가 날아간다. */
  if (v === 'learn' || v === 'quiz') { $('#tabbar').hidden = true; document.body.classList.remove('has-tabbar'); }
  else syncTabBar();
  window.scrollTo(0, 0);
}


/* ---------- 기록과 배지 ----------
   솔직히: 점수·배지가 '학습'을 만든다는 증거는 약하다. 올리는 건 '참여'다.
   그런데 간격 반복은 돌아와야만 돌아간다. 그래서 목표를 '돌아오는 것'에만 건다.
   연속 기록(streak)은 하루 끊기면 그만두는 원인이라 쓰지 않는다.
   대신 '이번 주 5일'로 두고 이틀은 쉬어도 되게 한다. */
const ymd = t => {
  // 반드시 '그 사람이 사는 곳의 날짜'로 센다.
  // toISOString()은 UTC라, 한국(UTC+9)에서 오전 9시 이전 공부가 전날로 기록된다.
  const d = t ? new Date(t) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function touchToday() {
  const k = ymd();
  if (!S.act[k]) {
    S.act[k] = 1;
    // 연속 보호권은 없앴다 (사용자 지시). 빠진 날을 가짜로 메우면 기록이 사실이 아니게 된다.
    earnAttend();                       // 출석 점수 (오늘 처음 공부한 순간에만)
    save();
  }
}
function bumpSaid(n) {
  S.stats.said = (S.stats.said || 0) + (n || 1);
  touchToday(); save();
}

/* 이번 주(월~일) 며칠 했는가 */
function weekDots() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    out.push({ key: ymd(d), done: !!S.act[ymd(d)], future: d > now, today: ymd(d) === ymd() });
  }
  return out;
}




/* ---------- 실력 분석 ----------
   숫자를 눈에 보이게 그린다. 다만 표본이 적으면 그리지 않는다 —
   10문제로 "약점"을 말하면 그건 분석이 아니라 점(占)이다. */
const NEED = 10;                       // 이만큼 풀어야 판정한다
/* 막대는 **한 문제만 풀어도** 그린다 (대표님 지시, 2026-08-30):
   "6/10 이런 식으로 남은 문제 표시 지워. 1문제만 했어도 바로 그래프."
   오른쪽에는 **맞은 수 / 푼 수**. 아무것도 안 했으면 막대 없이 '아직'만. */
function bars(rows) {
  const box = el('div', 'bars');
  rows.forEach(([name, pct, n, avg, nlabel, okn]) => {
    const none = !n;
    const r = el('div', 'barrow' + (none ? ' thin' : ''));
    r.append(el('span', 'bname', name));
    const bar = el('span', 'bbar' + (typeof avg === 'number' ? ' avg' : ''));
    if (!none) {
      const fill = el('i');
      fill.style.width = Math.max(2, pct) + '%';
      fill.className = pct >= 80 ? 'hi' : pct >= 60 ? 'mid' : 'lo';
      bar.append(fill);
    }
    if (typeof avg === 'number') {          // 다른 사람들의 평균 자리를 세로 눈금으로
      const pin = el('u');
      pin.style.left = Math.min(99, Math.max(1, avg)) + '%';
      pin.title = '전체 평균 ' + avg + '%';
      bar.append(pin);
    }
    r.append(bar);
    r.append(el('span', 'bpct', none ? '' : pct + '%'));
    r.append(el('span', 'bn', nlabel != null ? nlabel
                : none ? tr('아직')
                       : (okn != null ? okn : Math.round(pct * n / 100)) + '/' + n));
    box.append(r);
  });
  return box;
}
/* ── 분석 v2 (대표님 지시 2026-09-30 밤: "분석은 우리 앱의 핵심. 가로 막대 하나 말고 항목별로 기간별 변화. 말하기를 자세히 보면 성조별·글자별. 시간 축까지. 더 성장할 피드백") ──
   재료는 S.stats.day[날짜] (dayTally — 2026-09-30 부터 쌓인다). 7일·4주·12주는 그 날들의 합, '전체'는 누적 계수기 그대로.
   영역마다: 정답률 · 앞 같은 기간과 견준 ▲▼(둘 다 5문제 넘을 때) · 12주 주별 정답률 작은 선 · 누르면 갈래별(문제 유형·성조·글자·오답 종류·간격·밀림).
   처방은 글로 끝내지 않고 단추로 바로 그 훈련을 연다. 10문제 미만이면 판정하지 않는 원칙(NEED)은 그대로. */
const PERIODS = [['week', '7일', 7], ['m1', '4주', 28], ['m3', '12주', 84], ['all', '전체', 0]];
const dayKeys = n => { const out = [], t = Date.now(); for (let i = 0; i < n; i++) out.push(ymd(t - i * DAY)); return out; };
function sumDays(keys) {
  const day = (S.stats && S.stats.day) || {}, o = {};
  keys.forEach(k => { const b = day[k]; if (!b) return; for (const f in b) { if (f === 'memo' || f === 'learned') continue; o[f] = (o[f] || 0) + b[f]; } });
  return o;
}
function periodStats(mode) {
  const p = PERIODS.find(x => x[0] === mode) || PERIODS[0];
  if (!p[2]) return { cur: tallyCur(), prev: null, days: 0, label: p[1] };
  const ks = dayKeys(p[2] * 2);
  return { cur: sumDays(ks.slice(0, p[2])), prev: sumDays(ks.slice(p[2])), days: p[2], label: p[1] };
}
const pctOf = (o, okK, allK) => { const n = (o && o[allK]) || 0, ok = (o && o[okK]) || 0; return { n, ok, pct: n ? Math.round(ok * 100 / n) : null }; };
function analysisData(mode) {
  const ps = periodStats(mode);
  return SUBJ.map(x => Object.assign({ name: x.k, tip: x.tip }, pctOf(ps.cur, x.ok, x.all)));
}
function weekSeries(okK, allK) {                      // 12주 주별 정답률 — 작은 선 그래프 재료
  const ks = dayKeys(84), out = [];
  for (let w = 11; w >= 0; w--) out.push(pctOf(sumDays(ks.slice(w * 7, w * 7 + 7)), okK, allK).pct);
  return out;
}
function sparkline(series, w, h) {
  w = w || 116; h = h || 28;
  const cv = el('canvas', 'anaspark'); cv.width = w * 2; cv.height = h * 2; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const x = cv.getContext('2d'); x.scale(2, 2);
  const col = (getComputedStyle(document.body).getPropertyValue('--ok') || '').trim() || '#2a9d5c';
  x.strokeStyle = 'rgba(128,128,128,.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(2, h - 2.5); x.lineTo(w - 2, h - 2.5); x.stroke();
  const pts = series.map((p, i) => p == null ? null : [4 + i * (w - 8) / Math.max(1, series.length - 1), h - 3 - (p / 100) * (h - 7)]);
  x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); let on = false;
  pts.forEach(p => { if (!p) return; if (!on) { x.moveTo(p[0], p[1]); on = true; } else x.lineTo(p[0], p[1]); });
  x.stroke(); x.fillStyle = col;
  pts.forEach(p => { if (p) { x.beginPath(); x.arc(p[0], p[1], 2.2, 0, 7); x.fill(); } });
  return cv;
}
const MODE_NM = { card: '카드에서 말하기', write_ko: '뜻 보고 베트남어 쓰기', listen: '듣고 뜻 고르기', listen_ko: '뜻 듣고 낱말 고르기', tone: '성조 부호 고르기', pic_tf: '그림 맞다·틀리다', pic4: '그림 고르기', read: '읽고 뜻 고르기', read_ko: '뜻 보고 낱말 고르기', match: '짝 맞추기', cloze: '빈칸', tf: '문장 맞다·틀리다', err: '틀린 글자 찾기', gpat: '문법 고르기', gcloze: '문법 빈칸', type: '타이핑', dictation: '받아쓰기', hand: '손글씨', dict: '글자 조각 만들기', say: '말하기', say_ko: '뜻 듣고 말하기', shadow: '따라 말하기', say_pic: '그림 보고 말하기', sayself: '말하기(스스로 판정)', recall: '말하기', puzzle: '문장 조각', puzzle_ko: '뜻 듣고 문장 조각', puzzle_vi: '문장 듣고 조각' };
const SUBJ_KEY = { '말하기': 'say', '듣기': 'ear', '읽기': 'read', '쓰기': 'spell', '암기': 'memo' };
const SUBJ_SKILL = { say: 'say', ear: 'listen', read: 'read', spell: 'write' };
/* 상자(box)의 갈래별 줄 — o 는 평평한 열쇠('tn_ear:ngang:ok')의 합. keep(열쇠)로 고르고 map(열쇠)로 이름을 붙인다 */
function boxRows(o, box, map, keep) {
  const rows = {};
  Object.keys(o || {}).forEach(k => {
    const m = k.split(':'); if (m[0] !== box || m.length < 3 || (keep && !keep(m[1]))) return;
    const r = rows[m[1]] || (rows[m[1]] = { ok: 0, all: 0 }); if (m[2] === 'ok') r.ok += o[k]; else r.all += o[k];
  });
  return Object.entries(rows).filter(([, v]) => v.all > 0).map(([k, v]) => [(map ? map(k) : k), Math.round(v.ok * 100 / v.all), v.all, undefined, null, v.ok, k]).sort((a, b) => a[1] - b[1]);
}
const gramName = k => /^\d+$/.test(k) ? (k + tr('과') + (GRAM ? ' ' + ((GRAM.books[0].bai.find(x => x.no === +k) || {}).t || '').split(' — ')[0] : '')) : String(k).split(' — ')[0];
const TN_NM = { 'ngang': '평평', 'huyền': '내려감', 'sắc': '올라감', 'hỏi': '내렸다올림', 'ngã': '끊었다올림', 'nặng': '짧고무겁게' };
const tnName = k => (TN_NM[k] || k) + ' ' + toneArrow(k);
const stoneName = k => ({ flat: '평평·내려감·짧고무겁게', rise: '올라감', dip: '내렸다 올림' })[k] || k;   // pitch.js 세 무리 (ngang·huyền·nặng / sắc / hỏi·ngã)
/* ── 시안 A·B (대표님 2026-10-02 "a,b") ──
   A 성장: 이 기간 문제 정답률(+앞 기간 대비) · 12주 주별 정답률 선 · 외운 낱말(+이 기간에 늘어난 수) · 최근 7일 공부한 날 · 약한 곳 하나와 바로 가기.
   B 영역 비교: 다섯 영역 오각형(이 기간 vs 앞 기간) — 그 밑 영역별 막대는 원래 목록. 10문제 미만인 영역은 오각형에서 0 으로 두고 점선 표시 */
function anaSummary(host, ps, mode) {
  const box = el('div', 'anasum');
  const c = pctOf(ps.cur, 'qOk', 'qAll'), p = ps.prev ? pctOf(ps.prev, 'qOk', 'qAll') : null;
  const top = el('div', 'anatop');
  const lab = mode === 'all' ? tr('지금까지 문제 정답률') : tr('최근 N 문제 정답률').replace('N', tr(ps.label));
  let delta = '';
  if (p && p.n >= 5 && c.n >= 5 && c.pct !== null && p.pct !== null) { const d = c.pct - p.pct; delta = ' <span class="anadelta ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '± ') + Math.abs(d) + '</span>'; }
  top.append(el('div', 'analab', esc(lab)), el('div', 'anabig', (c.pct === null ? tr('아직') : c.pct + '%') + delta + (c.n ? ' <small>' + c.ok + '/' + c.n + '</small>' : '')));
  box.append(top);
  const ser = weekSeries('qOk', 'qAll');
  if (ser.some(v => v != null)) { const sp = sparkline(ser, 300, 54); sp.classList.add('anabigspark'); box.append(sp, el('div', 'anaspklab', '<span>' + tr('12주 전') + '</span><span>' + tr('이번 주') + '</span>')); }
  const memo = memoCount();
  let grow = '';
  if (ps.days) { const day = (S.stats && S.stats.day) || {}, start = dayKeys(ps.days + 1).pop(), keys = Object.keys(day).filter(k => k <= start && day[k].memo2 != null).sort(); if (keys.length) { const g = memo - day[keys[keys.length - 1]].memo2; if (g) grow = ' <span class="anadelta ' + (g > 0 ? 'up' : 'down') + '">' + (g > 0 ? '+' : '') + g + '</span>'; } }
  box.append(el('div', 'anamemo', '<span>' + tr('외운 낱말') + '</span><b>' + memo.toLocaleString('ko-KR') + '</b>' + grow));
  const dots = el('div', 'anadays'); const ks = dayKeys(7).reverse();
  ks.forEach(k => { const on = !!(S.act && S.act[k]); const d = el('i', on ? 'on' : ''); d.title = k.slice(5).replace('-', '/'); dots.append(d); });
  box.append(el('div', 'analab', tr('최근 7일 공부한 날') + ' ' + ks.filter(k => S.act && S.act[k]).length + '/7'), dots);
  host.append(box);
}
function anaRadar(host, cur, prev) {
  const ax = SUBJ.map(x => ({ k: x.k, c: pctOf(cur, x.ok, x.all), p: prev ? pctOf(prev, x.ok, x.all) : null }));
  if (ax.filter(a => a.c.n >= 1).length < 2) return;                 // 두 영역 넘게 풀어야 모양이 된다
  const W = 260, H = 210, cx = 130, cy = 112, R = 78, n = ax.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const poly = vals => vals.map((v, i) => pt(i, v).map(z => z.toFixed(1)).join(',')).join(' ');
  const grid = [1, .5].map(f => `<polygon points="${poly(ax.map(() => f))}" fill="none" stroke="var(--line)" stroke-width="${f === 1 ? 1 : .7}"/>`).join('');
  const spokes = ax.map((a, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width=".6"/>`; }).join('');
  const prevP = prev && ax.some(a => a.p && a.p.n) ? `<polygon points="${poly(ax.map(a => a.p && a.p.pct != null ? a.p.pct / 100 : 0))}" fill="var(--dim)" fill-opacity=".12" stroke="var(--dim)" stroke-width="1.2" stroke-dasharray="3 3"/>` : '';
  const curP = `<polygon points="${poly(ax.map(a => a.c.pct != null ? a.c.pct / 100 : 0))}" fill="var(--ok, #2a9d5c)" fill-opacity=".22" stroke="var(--ok, #2a9d5c)" stroke-width="2"/>`;
  const labels = ax.map((a, i) => { const [x, y] = pt(i, 1.2); const anc = Math.abs(x - cx) < 5 ? 'middle' : x > cx ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anc}" font-size="12" fill="var(--fg)">${esc(tr(a.k))}${a.c.pct != null ? ' ' + a.c.pct : ''}</text>`; }).join('');
  const box = el('div', 'anaradar');
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr('다섯 영역 정답률'))}">${grid}${spokes}${prevP}${curP}${labels}</svg>` +
    `<div class="analeg"><span><i class="cur"></i>${tr('이번 기간')}</span>${prevP ? `<span><i class="prev"></i>${tr('앞 기간')}</span>` : ''}</div>`;
  host.append(box);
}
function renderAnalysis(host, mode) {
  host.textContent = '';
  const tab = el('div', 'rolepick');
  PERIODS.forEach(([k, t]) => { const bb = el('button', 'ghost sm' + (mode === k ? ' pick' : ''), (mode === k ? '✓ ' : '') + t); bb.onclick = () => renderAnalysis(host, k); tab.append(bb); });
  host.append(el('p', 'anahead', '실력 분석'), tab);
  const ps = periodStats(mode), cur = ps.cur, prev = ps.prev;
  const firstDay = Object.keys((S.stats && S.stats.day) || {}).sort()[0];
  if (mode !== 'all') host.append(el('p', 'dimtxt', firstDay ? tr('날짜별 기록은 N부터 쌓입니다 — 그 전 것은 전체에만 있습니다').replace('N', firstDay.slice(5).replace('-', '/')) : tr('날짜별 기록이 아직 없습니다 — 오늘부터 쌓입니다')));
  anaSummary(host, ps, mode);                               // 시안 A 성장 (2026-10-02)
  const avg = {};                                           // 다른 사람들의 평균 (받아 오면 채운다)
  host.append(el('p', 'anasec', tr('영역별') + ' <span>' + (ANA_DETAIL ? tr('누르면 자세히 · 작은 선은 12주 흐름') : tr('작은 선은 12주 흐름')) + '</span>'));
  anaRadar(host, cur, prev);                                // 시안 B 영역 비교 오각형 (2026-10-02)
  const list = el('div', 'analist'); host.append(list);
  const detail = (sb, x) => {
    const d = el('div', 'anadetail');
    const put = (title, rows, note) => { if (!rows.length) return; d.append(el('p', 'anasec', esc(title))); d.append(bars(rows)); if (note) d.append(el('p', 'dimtxt', esc(note))); };
    const chips = (title, box, note) => {
      const rows = boxRows(cur, box).sort((a, b) => b[2] - a[2]).slice(0, 8); if (!rows.length) return;
      d.append(el('p', 'anasec', esc(title))); d.append(el('p', 'anachips', rows.map(r => '<span>' + esc(r[0]) + ' <b>' + r[2] + '</b></span>').join(''))); if (note) d.append(el('p', 'dimtxt', esc(note)));
    };
    if (sb !== 'memo') put(tr('문제 유형별'), boxRows(cur, 'md', k => MODE_NM[k] || k, k => MODE_SUBJ[k] === sb));
    if (sb === 'say') {
      /* 말하기 세부 (2026-10-02): 성조는 폰 음성 인식이 아니라 앱이 잰 높낮이 곡선 판정으로. 소리로 실제 갈리는 세 무리로만 가린다(pitch.js — 원어민 실측 87%).
         예전 '성조별'은 '폰이 낱말을 알아들었나'를 첫 음절 성조로 나눈 것이라 성조 점수가 아니었다 */
      const und = boxRows(cur, 'stone_u', k => k).reduce((a, r) => a + r[2], 0);
      put(tr('성조 — 높낮이 곡선 판정'), boxRows(cur, 'stone', stoneName), tr('원어민 본보기와 곡선 모양을 견줍니다. 평평·내려감·짧고무겁게는 소리로 거의 같아 한 무리로 봅니다.') + (und ? ' ' + tr('못 가리겠다고 한 N번은 넣지 않았습니다.').replace('N', und) : ''));
      const pj = boxRows(cur, 'pj', k => k === 'asr' ? tr('폰 음성 인식') : k === 'snd' ? tr('소리 비교') : k).filter(r => r[6] !== 'none');
      const none = boxRows(cur, 'pj', k => k).filter(r => r[6] === 'none').reduce((a, r) => a + r[2], 0);
      put(tr('낱말을 알아들었나 — 판정 방식별'), pj, tr('폰 음성 인식은 짧은 낱말 하나를 잘 못 알아듣기도 합니다 — 틀림이 꼭 발음 탓은 아닙니다.') + (none ? ' ' + tr('둘 다 판정 못 한 N번은 점수에 넣지 않았습니다.').replace('N', none) : ''));
    } else put(tr('성조별'), boxRows(cur, 'tn_' + sb, tnName), tr('낱말 첫 음절의 성조로 셉니다'));
    if (sb === 'spell') { put(tr('오답의 종류'), boxRows(cur, 'serr')); chips(tr('자주 틀리는 글자'), 'ltrw', tr('음절마다 처음 어긋난 글자 · 횟수')); }
    if (sb === 'say') chips(tr('잘 못 알아듣는 글자'), 'ltrs', tr('폰이 알아들은 것과 목표를 견줘 처음 어긋난 글자 · 횟수'));
    if (sb === 'ear') {
      const conf = Object.entries((S.stats && S.stats.conf) || {}).map(([k, v]) => [k, v.all]).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (conf.length) { d.append(el('p', 'anasec', tr('자주 헷갈리는 짝') + ' <span>' + tr('누적') + '</span>')); d.append(el('p', 'dimtxt', conf.map(c => esc(c[0]) + ' ' + c[1] + tr('번')).join('<br>'))); }
    }
    if (sb === 'memo') {
      put(tr('간격별 기억률'), boxRows(cur, 'lvt', k => STEPS[+k] + tr('일 뒤')).sort((a, b) => +a[6] - +b[6]), tr('그 간격을 제때 기다린 뒤 맞힌 비율 — 복습 간격 보정의 근거'));
      put(tr('얼마나 밀렸을 때 풀었나'), boxRows(cur, 'od'), tr('밀릴수록 떨어지는 폭이 곧 밀린 값입니다'));
    }
    if (!d.children.length) d.append(el('p', 'dimtxt', tr('이 기간에 이 영역의 세부 기록이 없습니다')));
    return d;
  };
  const drawList = () => {
    list.textContent = '';
    SUBJ.forEach((x, i) => {
      const sb = SUBJ_KEY[x.k], c = pctOf(cur, x.ok, x.all), p = prev ? pctOf(prev, x.ok, x.all) : null;
      const row = el('button', 'anarow' + (ANA_OPEN === sb ? ' open' : '')); row.type = 'button';
      const head = el('div', 'anahd');
      head.append(el('b', 'ananm', esc(x.k)));
      head.append(el('span', 'anapct', c.pct === null ? tr('아직') : c.pct + '%'));
      if (p && p.pct !== null && c.pct !== null && c.n >= 5 && p.n >= 5) { const dd = c.pct - p.pct; head.append(el('span', 'anadelta ' + (dd > 0 ? 'up' : dd < 0 ? 'down' : ''), (dd > 0 ? '▲ ' : dd < 0 ? '▼ ' : '± ') + Math.abs(dd))); }
      head.append(el('span', 'anan', c.n ? c.ok + '/' + c.n : ''));
      if (avg[RANKKEY[i]] != null) head.append(el('span', 'anaavg', tr('다른 사람 평균') + ' ' + avg[RANKKEY[i]] + '%'));
      row.append(head, sparkline(weekSeries(x.ok, x.all)));
      if (ANA_DETAIL) row.onclick = () => { ANA_OPEN = ANA_OPEN === sb ? null : sb; drawList(); };
      list.append(row);
      if (ANA_DETAIL && ANA_OPEN === sb) list.append(detail(sb, x));
    });
    /* 문장 (2026-09-30, 대표님 "문장 학습 분석도 필요하지?") — 낱말이 아니라 **문장 문제**만: 조각 배열·문장 뜻 고르기·빈칸·받아쓰기·문법 문제.
       다섯 영역과 겹쳐 세지만(문장 조각은 쓰기에도 든다) 문장만 따로 모아 보는 줄이다. 세부는 문제 유형별 · 쓰인 문법별 */
    const c = pctOf(cur, 'sentOk', 'sentAll'), p = prev ? pctOf(prev, 'sentOk', 'sentAll') : null;
    const row = el('button', 'anarow' + (ANA_OPEN === 'sent' ? ' open' : '')); row.type = 'button';
    const head = el('div', 'anahd');
    head.append(el('b', 'ananm', tr('문장')), el('span', 'anapct', c.pct === null ? tr('아직') : c.pct + '%'));
    if (p && p.pct !== null && c.pct !== null && c.n >= 5 && p.n >= 5) { const dd = c.pct - p.pct; head.append(el('span', 'anadelta ' + (dd > 0 ? 'up' : dd < 0 ? 'down' : ''), (dd > 0 ? '▲ ' : dd < 0 ? '▼ ' : '± ') + Math.abs(dd))); }
    head.append(el('span', 'anan', c.n ? c.ok + '/' + c.n : ''));
    row.append(head, sparkline(weekSeries('sentOk', 'sentAll')));
    if (ANA_DETAIL) row.onclick = () => { ANA_OPEN = ANA_OPEN === 'sent' ? null : 'sent'; drawList(); };
    list.append(row);
    if (ANA_DETAIL && ANA_OPEN === 'sent') {
      const d = el('div', 'anadetail');
      const put = (title, rows, note) => { if (!rows.length) return; d.append(el('p', 'anasec', esc(title))); d.append(bars(rows)); if (note) d.append(el('p', 'dimtxt', esc(note))); };
      put(tr('문제 유형별'), boxRows(cur, 'smd', k => MODE_NM[k] || k));
      put(tr('쓰인 문법별'), boxRows(cur, 'gr', gramName), tr('문장 속 문형으로 셉니다 — 단어 시험·주간 시험 문장'));
      if (!d.children.length) d.append(el('p', 'dimtxt', tr('아직 푼 문장 문제가 없습니다')));
      list.append(d);
    }
  };
  drawList();
  if (S.nick && S.nick !== '이름없음') {                    // 다른 사람들의 평균 (등수는 안 보여 준다 — 견줄 것은 실력이지 자리가 아니다)
    const sk = skillScore();
    cCall({ act: 'rank', uid: myUid(), score: sk.score, memo: sk.memo, pct: myPcts(), cr: weekCredits(), crm: monthCredits(),
            days: weekDots().map(d => d.done ? 1 : 0), f: (Object.keys(S.act || {}).sort()[0] || ''), l: (Object.keys(S.act || {}).sort().pop() || ''),
            dd: Object.keys(S.act || {}).length, st: Object.keys(S.done).filter(k => +k >= 1).length,
            tr: Object.values(S.stats.od || {}).reduce((a, v) => [a[0] + v.ok, a[1] + v.all], [0, 0]),
            ms: Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]) })
      .then(j => { if (j && j.avg && Object.keys(j.avg).length) { Object.assign(avg, j.avg); drawList(); } }).catch(() => { });
  }
  renderRx(host, cur, prev);
  const dl = el('button', 'ghost', '분석 결과 그림으로 저장'); dl.style.width = '100%'; dl.style.marginBottom = '14px';
  dl.onclick = () => analysisCard(mode === 'all' ? 'all' : 'week'); host.append(dl);
}
/* 처방 — 분석만 하고 끝내지 않는다. 단추를 누르면 바로 그 훈련 (2026-09-30 밤) */
function renderRx(host, cur, prev) {
  const rows = SUBJ.map(x => Object.assign({ name: x.k, sb: SUBJ_KEY[x.k], tip: x.tip }, pctOf(cur, x.ok, x.all), { prev: prev ? pctOf(prev, x.ok, x.all) : null }))
    .concat([Object.assign({ name: '문장', sb: 'sent', tip: '낱말을 문장 차례로 쓰고, 문장 뜻을 알아보기' }, pctOf(cur, 'sentOk', 'sentAll'), { prev: prev ? pctOf(prev, 'sentOk', 'sentAll') : null })]);   // 문장 줄도 처방 대상 (2026-09-30)
  const ok = rows.filter(r => r.n >= NEED);
  const lines = [], btns = [];
  const btn = (t, fn) => { const b = el('button', 'ghost sm anabtn', t); b.type = 'button'; b.onclick = fn; btns.push(b); };
  const pool20 = () => { const ws = Object.keys(S.srs || {}).map(findItem).filter(Boolean).sort(() => Math.random() - .5); return ws.slice(0, 20); };
  const tail = [];
  if (S.stats.skipN) tail.push(tr('스킵한 문제 N개는 어느 통계에도 넣지 않았습니다 — 틀린 게 아니라 아직 안 재 본 것입니다').replace('N', S.stats.skipN));
  if ((S.stats.guessN || 0) >= 5 && S.stats.guessN / Math.max(1, S.stats.ansN || 0) >= .2) tail.push(tr('1초 안에 답하고 틀린 문제가 N개입니다. 모르겠으면 스킵하세요 — 찍은 답은 기록만 망칩니다.').replace('N', S.stats.guessN));
  const adj = STEPS.map((d, i) => [i, d, stepDays(i)]).filter(x => x[1] !== x[2]);
  if (adj.length) tail.push(tr('복습 간격 조정') + ' — ' + adj.map(([i, d, e]) => { const c = S.stats.lvt[String(i)]; return d + tr('일') + ' → ' + e + tr('일') + ' (' + d + tr('일 뒤 정답률') + ' ' + Math.round(c.ok * 100 / c.all) + '%, ' + c.all + tr('문제') + ')'; }).join(' · '));
  rows.forEach(r => {                                     // 앞 기간과 견준 변화 — 8점 넘게 움직인 것만 말한다
    if (!r.prev || r.prev.n < NEED || r.n < NEED) return;
    const d = r.pct - r.prev.pct;
    if (d <= -8) lines.push(`· <b>${esc(r.name)}</b>${tr('가 앞 기간')} ${r.prev.pct}% → ${r.pct}%${tr('로 내려갔습니다. 이 영역을 이번 주에 한 판 더')}`);
    else if (d >= 8) lines.push(`· <b>${esc(r.name)}</b>${tr('가 앞 기간')} ${r.prev.pct}% → ${r.pct}%${tr('로 올라갔습니다')}`);
  });
  const card = el('div', 'rulecard'); card.append(el('div', 'rhead', '<b>이렇게 하면 올라갑니다</b>'));
  if (ok.length < 2) {
    lines.push(tr('두 영역이 10문제를 넘으면 강점·약점과 처방이 나옵니다.'));
    card.append(el('div', 'rbody', lines.concat(tail).join('<br>'))); host.append(card); return;
  }
  const worst = ok.reduce((a, x) => x.pct < a.pct ? x : a), best = ok.reduce((a, x) => x.pct > a.pct ? x : a);
  const RX = {
    '암기': ['<b>복습</b>을 하루도 밀리지 마세요 — 밀린 카드가 쌓이면 정답률이 먼저 떨어집니다.',
             '틀린 단어는 그 자리에서 한 번 더 나옵니다. 그때 <b>소리 내어</b> 말하면 다음 판에서 살아납니다.'],
    '읽기': ['글자를 <b>소리로 바꿔 읽는</b> 연습이 모자란 것입니다 — 복습의 [읽기]를 며칠 이어서 해 보세요.',
             '뜻이 안 떠오르면 그 단어의 <b>그림</b>을 한 번 보고 넘어가세요. 그림이 붙은 단어가 더 오래 남습니다.'],
    '듣기': ['기본기의 <b>성조</b>와 <b>모음</b>을 하루 한 판씩. 저녁에 하면 자는 동안 소리가 정리됩니다.',
             '먼저 소리를 듣고, 그다음 따라 말해 보세요.'],
    '쓰기': ['<b>손글씨</b>를 며칠 이어서 해 보세요. 부호 위치는 손으로 써야 붙습니다.',
             '<b>타이핑</b>에서 글자 보기를 누르지 말고 먼저 쳐 보세요 — 보고 치면 기억에 안 남습니다.'],
    '문장': ['테스트의 <b>문장</b>을 하루 한 판 — 낱말을 알아도 차례(어순)를 모르면 문장이 안 됩니다.',
             '틀린 문장은 <b>쓰인 문법 카드</b>를 다시 보세요 — 단어 시험 결과에서 바로 갈 수 있습니다.'],
    '말하기': ['단어 카드의 <b>말하기</b>를 누른 뒤 원어민 곡선과 겹쳐 보세요.',
               '말한 뒤 나오는 <b>높낮이</b> 판정을 보세요 — 다르게 들린다고 하면 원어민 곡선과 겹쳐 듣기로 비교하세요.'],
  };
  lines.unshift(worst.pct >= 80 ? `<b>모두 좋습니다.</b> 더 올릴 곳 — <b>${esc(worst.name)} ${worst.pct}%</b> (${worst.n}문제)` : `<b>약한 곳 — ${esc(worst.name)} ${worst.pct}%</b> (${worst.n}문제)`,
                ...(RX[worst.name] || []).map(t => '· ' + t));
  if (worst.sb === 'sent') btn(tr('문장 연습'), () => testSents());
  else if (SUBJ_SKILL[worst.sb]) btn(tr('N 훈련 20문제').replace('N', worst.name), () => { const ws = pool20(); if (ws.length) startQuiz(ws, null, 20, true, { skill: SUBJ_SKILL[worst.sb] }); else popup(tr('아직 배운 단어가 없습니다')); });
  else btn(tr('복습 시작'), () => startQuiz(null, null));
  const tn = (worst.sb === 'say' ? boxRows(cur, 'stone', stoneName) : boxRows(cur, 'tn_' + worst.sb, tnName)).filter(t => t[2] >= NEED);   // 말하기는 높낮이 곡선 판정 (2026-10-02)
  if (tn.length && tn[0][1] < 70) { lines.push(`· ${esc(worst.name)}${tr('에서 성조는')} <b>${esc(tn[0][0])}</b>${tr('이')} ${tn[0][1]}%${tr('로 가장 약합니다 — 기본기 성조에서 그 소리만 골라 들어 보세요.')}`); btn(tr('성조 훈련'), () => startTone()); }
  const gw = boxRows(cur, 'gr', gramName).filter(r => r[2] >= 5 && r[1] < 70);   // 문장 속에서 약한 문법 (5문제 넘은 것만)
  if (gw.length) {
    lines.push('· ' + tr('문장에서 가장 약한 문법') + ' — <b>' + esc(gw[0][0]) + '</b> ' + gw[0][1] + '% (' + gw[0][2] + tr('문제') + ')');
    const no = +gw[0][6]; if (no && GRAM) { const ni = GRAM.books[0].bai.findIndex(x => x.no === no); if (ni >= 0) btn(tr('그 문법 카드'), () => startGram(0, ni)); }
  }
  const miss = Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (miss.length) {
    lines.push('· <b>발목 잡는 단어</b>(두 번 이상 틀린 것) — ' + miss.map(m => esc(m[0])).join(' · ') + '<br>&nbsp;&nbsp;이 단어만 따로 소리 내어 다섯 번씩. 맞히기 시작하면 목록에서 서서히 사라집니다.');
    btn(tr('이 단어만 풀기'), () => { const ws = missWords(); if (ws.length) startQuiz(ws.slice(0, 20), null, null, true); });
  }
  const skp = Object.entries(S.stats.skipW || {}).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (skp.length) lines.push('· <b>자꾸 스킵하는 단어</b>(두 번 이상 스킵한 것) — ' + skp.map(m => esc(m[0])).join(' · ') + '<br>&nbsp;&nbsp;스킵한 건 틀린 게 아니라 아직 안 재 본 것입니다. 시간 있을 때 이 단어만 골라 풀어 보세요.');
  const forget = boxRows(cur, 'lvt', k => STEPS[+k] + tr('일 뒤')).filter(r => r[2] >= NEED).sort((a, b) => +a[6] - +b[6]);
  if (forget.length >= 2) lines.push('· <b>' + tr('잊는 곡선') + '</b> — ' + forget.map(r => r[0] + ' ' + r[1] + '%').join(' · ') + '<br>&nbsp;&nbsp;' + tr('떨어지는 간격이 곧 잊기 시작하는 때입니다 — 그 앞에서 복습이 오게 간격이 저절로 조정됩니다.'));
  lines.push(`<br><b>잘하는 곳 — ${esc(best.name)} ${best.pct}%</b> · ${esc(best.tip)}`);
  card.append(el('div', 'rbody', lines.concat(tail).join('<br>')));
  if (btns.length) { const bb = el('div', 'anabtns'); btns.forEach(b => bb.append(b)); card.append(bb); }
  host.append(card);
}

/* 분석 결과를 그림 한 장으로 — 폰 갤러리에 저장하거나 단톡방에 보낼 수 있다 */
async function analysisCard(mode) {
  const subj = analysisData(mode).filter(x => x.n >= 10);
  /* 성조 이름 옆에 **높낮이 화살표**를 붙인다 (대표님 지시, 2026-08-30) —
     '내렸다올림' 같은 말보다 그림이 빠르다. 카드에서 쓰는 것과 같은 그림이다. */
  const TN = { 'ngang': '평평', 'huyền': '내려감', 'sắc': '올라감',
               'hỏi': '내렸다올림', 'ngã': '끊었다올림', 'nặng': '짧고무겁게' };
  const tnName = k => (TN[k] || k) + ' ' + toneArrow(k);
  const tn = Object.entries(S.stats.tn || {}).filter(([, v]) => v.all >= 5)
    .map(([k, v]) => [TN[k] || k, Math.round(v.ok * 100 / v.all)]).sort((a, b) => a[1] - b[1]);
  const H = 300 + subj.length * 46 + (tn.length ? 60 + tn.length * 34 : 0);
  const c = document.createElement('canvas');
  c.width = 720; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0f1115'; x.fillRect(0, 0, 720, H);
  x.strokeStyle = '#2a3040'; x.lineWidth = 2; x.strokeRect(20, 20, 680, H - 40);
  x.fillStyle = '#7aa2ff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'left';
  x.fillText('실력 분석', 52, 84);
  x.fillStyle = '#8b93a7'; x.font = '22px sans-serif';
  x.fillText((S.nick ? S.nick + ' · ' : '') + (mode === 'week' ? '이번 주' : '누적') + ' · ' + ymd(), 52, 118);
  let y = 176;
  const drawBars = (title, rows) => {
    x.fillStyle = '#e7ebf4'; x.font = 'bold 24px sans-serif';
    x.fillText(title, 52, y); y += 30;
    rows.forEach(([name, pct]) => {
      x.fillStyle = '#8b93a7'; x.font = '20px sans-serif';
      x.fillText(name, 52, y + 16);
      x.fillStyle = '#1a1f2b'; x.fillRect(210, y, 380, 18);
      x.fillStyle = pct >= 80 ? '#2f9e63' : pct >= 60 ? '#d8a13c' : '#d1555f';
      x.fillRect(210, y, Math.max(6, 380 * pct / 100), 18);
      x.fillStyle = '#e7ebf4'; x.font = 'bold 20px sans-serif';
      x.fillText(pct + '%', 606, y + 16);
      y += 34;
    });
    y += 18;
  };
  drawBars('과목별 정답률', subj.map(v => [v.name, v.pct]));
  // 성조별 정답률은 뺐다 (2026-09-27 저녁)
  if (subj.length) {
    const worst = subj.reduce((a, v) => v.pct < a.pct ? v : a);
    x.fillStyle = '#8b93a7'; x.font = '20px sans-serif';
    x.fillText('가장 약한 곳: ' + worst.name + ' ' + worst.pct + '%', 52, H - 78);
  }
  x.fillStyle = '#5a6273'; x.font = '19px sans-serif';
  x.fillText('짜오짜오 · tpgus5119-coder.github.io/chaochao', 52, H - 44);

  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'chaochao-analysis.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { }
  }
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = 'chaochao-analysis.png'; a.click();
}

/* 자랑 카드 — 내 진행 상황을 그림 한 장으로 만들어 단톡방에 공유한다.
   목표를 남에게 보이면 지속률이 올라간다(공개 선언 효과). 서버 없이 폰 안에서 그린다. */

/* 업적 전체 화면 — 홈에는 딴 것 몇 개만 보이고, 나머지는 여기서 */


/* ── 진도 서버 저장 ──────────────────────────────────────────
   로그인한 사람만. 하루 한 번 + 세트를 끝낼 때 올린다.
   서버 쓰기 한도(무료 1,000/일)를 아끼려고 그 이상은 안 올린다. */
const PROGKEYS = ['done', 'srs', 'ssrs', 'bsrs', 'star', 'act', 'stats', 'shield', 'shieldWk', 'nat', 'learn', 'region', 'nick', 'cr', 'pet', 'petName',   // 돈(cr)·짜오 살림(pet)도 같이 (2026-09-27 저녁)   // 실전·GYBM 창고와 별표도 같이 올린다 (2026-09-27)
  /* 2026-09-29 (대표님 "아이패드와 폰에서 진도 연동 안되는듯"): 실전·GYBM 과를 끝낸 기록(sdone·bdone)이
     여기 빠져 있어서 폰에서 끝낸 GYBM 과가 아이패드에 **한 번도** 가지 않았다. 시험 성적·문항 창고·성조 테스트도 같이. */
  'sdone', 'bdone', 'kbank', 'qbank', 'exam', 'anchor', 'vlpt', 'tt', 'kday', 'revDay', 'lastTrack',
  'score',   // 실제 반 시험 점수 (2026-09-29)
  'daily'];  // 매일 단어 시험 최고점·지난 결과 (2026-09-30)
/* 진도 서버 맞추기 (2026-09-29 다시 짬).
   예전에는 서버에서 **받는 것이 로그인하는 순간 한 번뿐**이었다 — 폰과 아이패드가 둘 다 로그인된 채로 쓰면
   서로의 진도를 영영 못 받았고, 올릴 때는 나중에 올린 기기가 서버 것을 통째로 덮었다(앞 기기 진도가 사라짐).
   이제
   · 앱을 켤 때와 다시 앞으로 올 때 서버 것을 받아 본다 (읽기는 무료 한도가 넉넉하다 — 하루 10만)
   · 이 기기에 올리지 않은 공부가 없으면 서버 것을 그대로 받고, 있으면 **둘을 합친다**(mergeProg)
   · 올리기 전에도 먼저 받아서 합친다 — 그래야 남의 기기 진도를 덮지 않는다
   · 올리는 때는 전과 같다: 세트 끝·복습 끝·진도 초기화·하루 첫 화면 (대표님 결정 2026-09-27, 쓰기 한도 1,000/일)
   S.cloudSeen = 마지막으로 맞춘 서버 판의 시각(서버가 준 at), S.cloudHash = 그때 진도의 지문. */
const progData = () => { const d = {}; PROGKEYS.forEach(k => { if (S[k] !== undefined) d[k] = S[k]; }); return d; };
function progHash(d) {                      // 진도 지문 — 바뀌었는지만 보면 되므로 짧은 수 하나
  const s = JSON.stringify(d);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + '.' + s.length;
}
/* 두 기기 진도 합치기. L = 이 기기, R = 서버. 지우는 쪽보다 **잃지 않는 쪽**을 고른다. */
function mergeProg(L, R) {
  const out = {};
  const newer = (a, b) => {                 // 같은 낱말의 두 기록 — 더 나중에 손댄 것
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a || b;
    for (const f of ['t', 'at', 'due']) if (a[f] != null && b[f] != null && a[f] !== b[f]) return a[f] > b[f] ? a : b;
    return a;
  };
  const byKey = (a, b, pick) => {
    const o = Object.assign({}, b || {});
    for (const [k, v] of Object.entries(a || {})) o[k] = k in o ? pick(v, o[k]) : v;
    return o;
  };
  const deep = (a, b) => {                  // 통계: 수는 큰 쪽, 목록은 긴 쪽, 묶음은 안으로 들어가서
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length >= b.length ? a : b;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) return byKey(a, b, deep);
    return a === undefined ? b : a;
  };
  const maxNum = (x, y) => typeof x === 'number' && typeof y === 'number' ? Math.max(x, y) : x;
  for (const k of PROGKEYS) {
    const a = L[k], b = R[k];
    if (a === undefined) { if (b !== undefined) out[k] = b; continue; }
    if (b === undefined) { out[k] = a; continue; }
    switch (k) {
      case 'done': case 'sdone': case 'bdone': case 'act': case 'star': out[k] = byKey(a, b, maxNum); break;
      case 'srs': case 'ssrs': case 'bsrs': case 'kbank': case 'qbank': case 'vlpt': out[k] = byKey(a, b, newer); break;
      case 'exam': out[k] = byKey(a, b, (x, y) => ((y && y.score) || 0) > ((x && x.score) || 0) ? y : x); break;   // 최고 점수
      case 'stats': case 'shield': case 'shieldWk': case 'anchor': case 'daily': out[k] = deep(a, b); break;   // daily: 최고점은 큰 쪽, 지난 결과는 긴 쪽
      case 'cr': out[k] = (b.sum || 0) > (a.sum || 0) ? b : a; break;         // 모두 번 돈이 많은 쪽 — 쓴 돈도 그쪽 기록과 맞는다
      case 'pet': out[k] = (b.fed || 0) > (a.fed || 0) ? b : a; break;
      case 'tt': out[k] = ((b.r || []).length > (a.r || []).length) ? b : a; break;
      case 'kday': out[k] = maxNum(a, b); break;
      case 'revDay': out[k] = String(b) > String(a) ? b : a; break;
      case 'score': {                       // (회차, 날짜) 한 줄 — 두 기기에서 고쳤으면 나중에 적은 것
        const m = new Map();
        [...b, ...a].forEach(x => { const kk = x.r + '|' + x.d; const o = m.get(kk); if (!o || (x.at || 0) >= (o.at || 0)) m.set(kk, x); });
        out[k] = [...m.values()]; break;
      }
      default: out[k] = a;                  // 별명·말씨·국적 같은 설정은 지금 손에 든 기기 것
    }
  }
  return out;
}
let cloudBusy = null, cloudPulled = 0;
/* push: true 면 (바뀐 게 있을 때) 올린다. 돌려주는 값 = 서버에서 받아 이 기기 진도가 바뀌었나 */
function cloudSync(push, overwrite) {
  if (!S.acct || !S.acct.tok) return Promise.resolve(false);
  if (cloudBusy) return cloudBusy.then(() => cloudSync(push, overwrite));   // 겹쳐 돌면 서로 덮는다 — 줄 세운다
  cloudBusy = (async () => {
    let changed = false, needPush = false;
    if (!overwrite) {
      const j = await cCall({ act: 'load', id: S.acct.id, tok: S.acct.tok });
      cloudPulled = Date.now();
      const srvAt = j.at || 0;
      if (j.data && srvAt > (S.cloudSeen || 0)) {            // 다른 기기가 그 뒤에 올린 것이 있다
        const dirty = progHash(progData()) !== S.cloudHash;
        const got = dirty ? mergeProg(progData(), j.data) : j.data;
        PROGKEYS.forEach(k => { if (got[k] !== undefined) S[k] = got[k]; });
        tallyReset();                                            // 받아 합친 것은 내가 오늘 한 게 아니다 — 집계 기준만 새로
        S.cloudSeen = srvAt;
        S.cloudHash = progHash(j.data);                        // 서버 판의 지문
        needPush = progHash(progData()) !== S.cloudHash;       // 합쳐서 서버에 없는 것이 생겼으면 올린다
        changed = true;
        save();
      }
    }
    const data = progData(), h = progHash(data);
    if ((push || needPush) && (overwrite || h !== S.cloudHash)) {
      const r = await cCall({ act: 'save', id: S.acct.id, tok: S.acct.tok, data });
      S.cloudSeen = r.at || Date.now(); S.cloudHash = h; S.cloudAt = ymd(); save();
    }
    return changed;
  })().then(v => { if (S.cloudErr) { delete S.cloudErr; save(); } cloudLastPush = Date.now(); return v; })
    .catch(e => {                                                   // 2026-09-30: 조용히 삼키지 않는다 — 내 정보에 보이고, 로그인이 끊긴 것이면 한 번 알린다
      S.cloudErr = { m: String((e && e.message) || e), at: Date.now() }; cloudErrAt = Date.now(); save();
      if (/로그인/.test(S.cloudErr.m) && !cloudWarned) { cloudWarned = true; popup('<b>서버 진도와 맞추지 못했습니다.</b><br>다른 기기에서 비밀번호를 바꿨으면 이 기기도 로그아웃 뒤 다시 로그인해 주세요.'); }
      return false;
    }).finally(() => { cloudBusy = null; });
  return cloudBusy;
}
/* 진도가 바뀔 때마다 올린다 (대표님 2026-09-30 "폰·노트북·아이패드 진도 통합이 안 되어 있다") —
   전에는 세트 끝·복습 끝·하루 한 번만 올려서, 그 사이에 한 것(복습 답·별표·기본기·문항 창고)은 다른 기기로 가지 않았다.
   조용해진 뒤 20초에 올리고, 3분에 한 번을 넘지 않는다(KV 쓰기 한도). 앱이 뒤로 가면(다른 앱·화면 끄기) 바로 올린다. */
let cloudTimer = null, cloudLastPush = 0, cloudErrAt = 0, cloudWarned = false;
function cloudTouch() {
  if (!S.acct || !S.acct.tok || cloudBusy) return;
  if (S.cloudErr && /로그인/.test(S.cloudErr.m)) return;             // 다시 로그인할 때까지 두드리지 않는다
  if (Date.now() - cloudErrAt < 300e3) return;                       // 서버가 안 되면 5분 쉬었다 한다
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => cloudSync(true, false), Math.max(20e3, 180e3 - (Date.now() - cloudLastPush)));
}
function cloudFlush() {                                             // 앱을 떠날 때 — 바뀐 것이 있으면 지금 올린다
  if (!S.acct || !S.acct.tok || cloudBusy) return;
  clearTimeout(cloudTimer);
  if (progHash(progData()) !== S.cloudHash) cloudSync(true, false);
}
window.addEventListener('pagehide', cloudFlush);
/* 예전 이름 그대로 부른다 — force(세트 끝·복습 끝)는 바로 올리고, 아니면 하루 한 번만 올린다 */
function cloudSave(force) {
  return cloudSync(force || S.cloudAt !== ymd(), false);
}
/* 받아 온 진도로 화면을 새로 그린다 — 공부하던 화면(카드·문제)은 건드리지 않고, 홈에 있을 때만 */
function cloudPull() {
  return cloudSync(S.cloudAt !== ymd(), false).then(changed => {
    if (changed && CURV === 'home') renderHome();
    return changed;
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cloudFlush(); return; }                          // 다른 앱으로 가기 전에 올린다 (2026-09-30)
  if (Date.now() - cloudPulled > 30e3) cloudPull();                       // 다른 기기에서 하고 돌아온 경우
});
/* 로그인 직후 — 이 기기에 공부한 것이 없으면 서버 것을 받고, 있으면 합쳐서 다시 올린다 */
async function loginPull() {
  const mine = Object.keys(S.done || {}).length + Object.keys(S.srs || {}).length
             + Object.keys(S.sdone || {}).length + Object.keys(S.bdone || {}).length;
  try {
    if (!mine) { await cloudLoad(); return; }
    S.cloudSeen = 0; S.cloudHash = '';          // 이 계정으로는 아직 맞춘 적이 없다 — 반드시 합친다
    if (await cloudSync(true, false)) {
      popup('<b>이 기기의 진도와 서버 진도를 합쳤습니다.</b> 화면을 새로 그립니다.');
      setTimeout(() => location.reload(), 900);
    }
  } catch (e) { }
}
async function cloudLoad() {
  const j = await cCall({ act: 'load', id: S.acct.id, tok: S.acct.tok });
  if (!j.data) return false;
  PROGKEYS.forEach(k => { if (j.data[k] !== undefined) S[k] = j.data[k]; });
  tallyReset();
  S.cloudSeen = j.at || Date.now(); S.cloudHash = progHash(progData());
  save();
  popup('<b>진도를 불러왔습니다.</b> 화면을 새로 그립니다.');
  setTimeout(() => location.reload(), 900);
  return true;
}
/* ── 계정 로그인·가입 ────────────────────────────────────────────
   이메일이 없어서 비밀번호를 잊으면 되찾을 길이 없다 — 화면에 그대로 밝힌다.
   서버에는 비밀번호의 으깬 값(해시)만 남는다. */
async function quitForm() {
  /* 대표님 2026-09-30: "탈퇴한다고 하면 '정말 탈퇴하시겠습니까?' 네/아니요만, 바로 탈퇴". 까닭 묻기·비밀번호 다시 받기는 뺐다.
     서버 v18 은 로그인 증표(tok)로 지운다. 옛 서버(v17 이하)면 비밀번호를 한 번 묻는다. 같은 아이디는 지운 뒤 다시 쓸 수 있다(서버가 계정 열쇠를 지운다) */
  if (!await askYN(tr('정말 탈퇴하시겠습니까?'), tr('네'), true)) return;
  const bye = () => { try { localStorage.removeItem('vnstudy.prog.' + S.acct.id); } catch (e) { } localStorage.removeItem('vnstudy.v2'); location.reload(); };
  try {
    const j = await cCall({ act: 'quit', id: S.acct.id, tok: S.acct.tok });
    if (j && j.error && /비밀번호/.test(j.error)) throw new Error('pw');
    bye(); return;
  } catch (e) {
    if (String(e.message) !== 'pw' && !/비밀번호/.test(String(e.message))) { bye(); return; }   // 서버가 못 지워도 이 기기에서는 나간다
  }
  const b = $('#subBody'); b.textContent = '';                   // 옛 서버 — 비밀번호 한 번
  b.append(el('p', 'lede', tr('비밀번호를 한 번 적어 주세요')));
  const pw = el('input', 'keyin'); pw.type = 'password'; pw.placeholder = tr('비밀번호'); b.append(pw);
  const err = el('p', 'note nickerr'); err.hidden = true;
  const go = el('button', 'primary big danger', tr('탈퇴')); go.style.width = '100%';
  go.onclick = async () => {
    if (!pw.value) { err.textContent = tr('비밀번호를 적어 주세요.'); err.hidden = false; return; }
    go.disabled = true;
    try { const j = await cCall({ act: 'quit', id: S.acct.id, pw: pw.value }); if (j && j.error) { err.textContent = j.error; err.hidden = false; go.disabled = false; return; } } catch (e) { }
    bye();
  };
  b.append(go, err);
  const back = el('button', 'ghost big', tr('그만두기')); back.style.width = '100%'; back.style.marginTop = '8px'; back.onclick = renderHome; b.append(back);
  show('sub', tr('탈퇴'), true);
}

/* 구글·페이스북 로그인은 없앴다 (대표님 지시 2026-09-29: "구글 이런 거 없애고 그냥 아이디와 비번만").
   2026-09-30 대표님: "그냥 아이디 비번 치고 들어가도록. 비번 제한 없음. 아이디도 자유, 아이디가 곧 닉네임" →
   별명 칸을 없애고 **아이디 = 별명**(순위·동아리에 보이는 이름). 아이디는 한글·영문 어느 글자든 1~20자, 비밀번호는 길이 제한 없음(1자 이상).
   비밀번호 찾기 질문은 가입 때 **안 물어도 된다**(비워 두면 건너뜀, 내 정보에서 나중에 정할 수 있다). 옛 서버(v16)는 아이디 영문 4~20자·비밀번호 8자를 요구하므로 그 오류가 그대로 보인다 → 워커 v17 을 올려야 한다. */
/* 아이디마다 진도가 따로 (대표님 2026-09-30: "같은 기기에서 다른 아이디로 로그인했는데 왜 진도가 같냐") —
   다른 아이디로 들어오면 이 기기의 진도는 앞 아이디 이름으로 따로 재워 두고(localStorage 'vnstudy.prog.<아이디>'), 새 아이디는 빈 진도에서 서버 것을 받는다.
   앞 아이디로 다시 들어오면 재워 둔 것을 깨워 서버와 합친다. 아이디 없이(손님으로) 공부한 진도는 처음 들어오는 아이디의 것이 된다. */
function acctSwitch(newId) {
  const prev = (S.acct && S.acct.id) || S.lastId || '';
  if (prev && prev !== newId) {
    try { localStorage.setItem('vnstudy.prog.' + prev, JSON.stringify(progData())); } catch (e) { }
    PROGKEYS.forEach(k => { delete S[k]; });
    S.done = {}; S.srs = {}; S.ssrs = {}; S.bsrs = {}; S.star = {}; S.act = {}; S.stats = {}; S.qbank = {};
    delete S.miss; delete S.revDay; delete S.revSeen; S.cloudSeen = 0; S.cloudHash = ''; delete S.cloudErr;
    try { const kept = localStorage.getItem('vnstudy.prog.' + newId);
      if (kept) { const d = JSON.parse(kept); PROGKEYS.forEach(k => { if (d[k] !== undefined) S[k] = d[k]; }); localStorage.removeItem('vnstudy.prog.' + newId); } } catch (e) { }
    S.wk = { k: weekKey(), base: snapshot() };
    tallyReset();
  }
  S.lastId = newId;
}
function acctForm(gate, mode) {
  mode = mode || 'login';                 // 로그인과 가입은 딴 화면 — 섞어 두면 헷갈린다 (사용자 지시)
  const b = $('#subBody');
  b.textContent = '';
  const id = el('input', 'keyin'); id.type = 'text'; id.placeholder = tr('아이디');
  id.autocapitalize = 'none'; id.maxLength = 20;
  const pw = el('input', 'keyin'); pw.type = 'password';
  pw.placeholder = tr('비밀번호'); pw.maxLength = 64;
  const qBox = qaFields();                // 비밀번호 찾기 질문·답 (가입 화면에만, 선택)
  const err = el('p', 'note nickerr'); err.hidden = true;
  const oops = m => { err.textContent = m; err.hidden = false; };
  const go = (act) => async () => {
    err.hidden = true;
    const i = id.value.trim(), p = pw.value;
    if (!i) return oops('아이디를 적어 주세요.');
    if (i.length > 20) return oops('아이디는 20자까지입니다.');
    if (!p) return oops('비밀번호를 적어 주세요.');
    let qv = null;
    if (act === 'signup') {
      const v = qBox.val();
      const touched = !v.error || /답을/.test(v.error);   // 질문을 골랐거나 답을 적었으면 끝까지 받고, 아무것도 안 건드렸으면 건너뛴다
      if (touched && v.error) return oops(v.error);
      qv = touched ? v : { q: '', qa: '' };
    }
    try {
      if (act === 'signup') {
        await cCall({ act: 'nick', nick: i });        // 아이디가 곧 별명 — 먼저 쓴 사람이 임자, 겹치면 여기서 걸린다
        S.nick = i; save();
      }
      const extra = act === 'signup' ? { nat: 'kr', learn: 'vi', reg: '', ui: 'ko', email: '', q: qv.q, qa: qv.qa } : {};
      const j = await cCall(Object.assign({ act, id: i, pw: p }, extra));
      if (act === 'signup') { S.nat = 'kr'; S.learn = 'vi'; S.ui = 'ko'; save(); }
      if (act === 'login' && j.prof) {
        S.nat = j.prof.nat || S.nat; S.learn = j.prof.learn || S.learn;
        S.ui = 'ko';                                // 무조건 한국어 — 예전 계정 값은 무시한다
        drawRegion();
      }
      if (act === 'login') {
        // 계정의 기기표를 이 기기에 입힌다 — 이제 서버가 보기에 같은 사람이다
        S.uid = j.uid;
        S.nick = j.nick || i;                       // 별명이 없던 옛 계정은 아이디를 별명으로
      }
      acctSwitch(i.toLowerCase());                  // 다른 아이디면 이 기기의 진도를 따로 재우고 빈 진도로 (2026-09-30)
      S.acct = { id: i.toLowerCase(), tok: j.tok || '' }; delete S.cloudErr; save();
      if (act === 'login' && j.hasProg) {
        // 서버에 진도가 있다 — 새 기기라면 그대로 받고, 이미 공부한 기기라면 **둘을 합친다** (2026-09-29:
        // 전에는 '덮어쓸까요?'를 물었다 — 어느 쪽을 골라도 한쪽 기기의 공부가 사라졌다)
        await loginPull();
      }
      ACTIVE_TAB = 'home'; renderHome();             // 가입·로그인 뒤 첫 화면은 홈, 팝업 없이 (대표님 2026-09-30)
    } catch (e) { oops(e.message || '안 됐습니다'); }
  };
  const bs = el('div');
  const main = el('button', 'primary big', mode === 'login' ? tr('로그인') : tr('가입하기'));
  main.style.width = '100%';
  main.onclick = go(mode === 'login' ? 'login' : 'signup');
  bs.append(main);
  if (mode === 'login') b.append(id, pw, err, bs);
  else {
    b.append(id, pw, qBox, err, bs);          // 설명 글은 뺐다 (대표님 2026-09-30) — 순위·동아리는 이미 없는 것
  }
  // 두 화면 사이를 오가는 문
  const sw = el('button', 'ghost');
  sw.style.width = '100%'; sw.style.marginTop = '10px';
  sw.textContent = mode === 'login' ? tr('처음이세요? 가입하기') : tr('이미 계정이 있어요 — 로그인');
  sw.onclick = () => acctForm(gate, mode === 'login' ? 'signup' : 'login');
  b.append(sw);
  // '나중에 둘러보기'는 없앴다 (대표님 지시, 2026-09-12) — 로그인 전에는 다른 화면으로 못 나간다.
  if (mode === 'login') {
    const forgot = el('button', 'ghost sm', tr('비밀번호를 잊으셨나요?'));
    forgot.style.width = '100%'; forgot.style.marginTop = '8px';
    forgot.onclick = () => forgotForm(gate);
    b.append(forgot);
  }
  show('sub', mode === 'login' ? tr('로그인') : tr('회원가입'), !gate);
  /* 로그인 관문 화면에서는 다른 데로 못 나가야 한다 (대표님 지시, 2026-09-12).
     show()가 늘 아래 탭 막대를 켜므로, 관문일 때는 그 뒤에 다시 잠근다. */
  if (gate) { $('#tabbar').hidden = true; }
}

/* 비밀번호 찾기 질문·답 칸 — 가입 화면과 '질문 정하기' 화면이 같이 쓴다.
   질문은 고르거나 직접 쓴다. 답은 띄어쓰기·대소문자를 가리지 않는다(서버가 맞춰 본다). */
const QA_QS = ['처음 다닌 초등학교 이름은?', '처음 키운 동물 이름은?', '어머니의 고향은?', '가장 좋아하는 음식은?', '어릴 때 가장 친했던 친구 이름은?'];
function qaFields() {
  const box = el('div', 'qabox');
  box.append(el('p', 'note', tr('비밀번호 찾기 질문-답을 맞히면 새 비밀번호를 정할 수 있습니다.')));
  const sel = el('select', 'keyin');
  [...QA_QS, tr('직접 쓰기')].forEach((q, i) => { const o = document.createElement('option'); o.value = i < QA_QS.length ? q : ''; o.textContent = q; sel.append(o); });
  const own = el('input', 'keyin'); own.type = 'text'; own.maxLength = 80; own.placeholder = tr('질문을 직접 쓰세요'); own.hidden = true;
  sel.onchange = () => { own.hidden = !!sel.value; };
  const ans = el('input', 'keyin'); ans.type = 'text'; ans.maxLength = 60; ans.placeholder = tr('답'); ans.autocomplete = 'off';
  box.append(sel, own, ans);
  box.val = () => {
    const q = (sel.value || own.value).trim(), qa = ans.value.trim();
    if (!q) return { error: tr('질문을 골라 주세요.') };
    if (!qa.replace(/\s+/g, '').length) return { error: tr('답을 적어 주세요.') };
    return { q, qa };
  };
  return box;
}
/* 질문 정하기·바꾸기 — 로그인한 사람만 (예전 가입자는 로그인 뒤 한 번 권한다) */
function setqForm(next, first) {
  if (!S.acct || !S.acct.tok) { acctForm(); return; }
  const b = $('#subBody');
  b.textContent = '';
  if (first) b.append(el('p', 'lede', tr('비밀번호를 잊었을 때 되찾을 질문을 정해 두세요.')));
  const qBox = qaFields();
  const err = el('p', 'note nickerr'); err.hidden = true;
  const go = el('button', 'primary big', tr('저장'));
  go.style.width = '100%';
  go.onclick = async () => {
    const v = qBox.val();
    if (v.error) { err.textContent = v.error; err.hidden = false; return; }
    go.disabled = true;
    try {
      await cCall({ act: 'setq', id: S.acct.id, tok: S.acct.tok, q: v.q, qa: v.qa });
      popup('<b>' + tr('저장했습니다.') + '</b>');
      (next || renderHome)();
    } catch (e) {
      err.textContent = /bad act/.test(e.message || '') ? tr('서버가 아직 옛 판입니다 — 서버를 새로 올린 뒤에 해 주세요.') : (e.message || tr('실패했습니다'));
      err.hidden = false; go.disabled = false;
    }
  };
  b.append(qBox, err, go);
  const later = el('button', 'ghost'); later.style.width = '100%'; later.style.marginTop = '10px';
  later.textContent = first ? tr('나중에') : tr('‹ 돌아가기');
  later.onclick = () => (next || renderHome)();
  b.append(later);
  show('sub', tr('비밀번호 찾기 질문'), true);
}

/* 비밀번호 찾기 — 아이디 → 질문 → 답과 새 비밀번호 (대표님 지시 2026-09-29).
   **원래 비밀번호는 보여 줄 수 없다** — 서버에도 되돌릴 수 없는 으깬 값(해시)만 있다. 그래서 답이 맞으면 새로 정한다.
   틀린 답은 아이디마다 하루 5번까지(서버가 센다). 예전의 이메일 링크 방식은 쓰지 않는다. */
function forgotForm(gate) {
  const b = $('#subBody');
  b.textContent = '';
  const id = el('input', 'keyin'); id.type = 'text'; id.placeholder = tr('아이디');
  id.autocapitalize = 'none'; id.maxLength = 20;
  const err = el('p', 'note nickerr'); err.hidden = true;
  const step2 = el('div'); step2.hidden = true;
  const qLine = el('p', 'lede');
  const ans = el('input', 'keyin'); ans.type = 'text'; ans.maxLength = 60; ans.placeholder = tr('답'); ans.autocomplete = 'off';
  const npw = el('input', 'keyin'); npw.type = 'password'; npw.maxLength = 64; npw.placeholder = tr('새 비밀번호 (8자 이상)');
  const npw2 = el('input', 'keyin'); npw2.type = 'password'; npw2.maxLength = 64; npw2.placeholder = tr('새 비밀번호 한 번 더');
  const fin = el('button', 'primary big', tr('새 비밀번호로 바꾸기')); fin.style.width = '100%';
  step2.append(qLine, ans, npw, npw2, fin);
  const next = el('button', 'primary big', tr('질문 보기')); next.style.width = '100%';
  const fail = e => { err.textContent = /bad act/.test(e.message || '') ? tr('서버가 아직 옛 판입니다 — 잠시 뒤에 다시 해 주세요.') : (e.message || tr('실패했습니다')); err.hidden = false; };
  next.onclick = async () => {
    err.hidden = true;
    const i = id.value.trim().toLowerCase();
    if (!/^[a-z0-9_]{4,20}$/.test(i)) { err.textContent = tr('아이디는 영문·숫자 4~20자입니다.'); err.hidden = false; return; }
    next.disabled = true;
    try {
      const j = await cCall({ act: 'getq', id: i });
      qLine.textContent = j.q; step2.hidden = false; next.hidden = true; id.disabled = true; ans.focus();
    } catch (e) { fail(e); next.disabled = false; }
  };
  fin.onclick = async () => {
    err.hidden = true;
    if (npw.value.length < 8) { err.textContent = tr('비밀번호는 8자 이상입니다.'); err.hidden = false; return; }
    if (npw.value !== npw2.value) { err.textContent = tr('새 비밀번호 두 칸이 다릅니다.'); err.hidden = false; return; }
    fin.disabled = true;
    try {
      await cCall({ act: 'ansq', id: id.value.trim().toLowerCase(), qa: ans.value, pw: npw.value });
      popup('<b>' + tr('바뀌었습니다.') + '</b> ' + tr('새 비밀번호로 로그인해 주세요.'));
      acctForm(gate, 'login');
    } catch (e) { fail(e); fin.disabled = false; }
  };
  b.append(id, next, step2, err);
  const back = el('button', 'ghost'); back.style.width = '100%'; back.style.marginTop = '10px';
  back.textContent = tr('‹ 돌아가기');
  back.onclick = () => acctForm(gate, 'login');
  b.append(back);
  show('sub', tr('비밀번호 찾기'), !gate);
  if (gate) { $('#tabbar').hidden = true; }
}

/* 새 비밀번호 정하기 — 메일 속 링크(?reset=토큰)로 들어오면 뜨는 화면.
   토큰은 서버가 1시간만 유효하게, 한 번만 쓰게 관리한다. */
function resetPwForm(token) {
  const b = $('#subBody');
  b.textContent = '';
  b.append(el('p', 'lede', tr('새 비밀번호를 정해 주세요.')));
  const pw = el('input', 'keyin'); pw.type = 'password'; pw.placeholder = tr('새 비밀번호 (8자 이상)'); pw.maxLength = 64;
  const err = el('p', 'note nickerr'); err.hidden = true;
  const go = el('button', 'primary big', tr('바꾸기'));
  go.style.width = '100%';
  go.onclick = async () => {
    if (pw.value.length < 8) { err.textContent = tr('비밀번호는 8자 이상입니다.'); err.hidden = false; return; }
    go.disabled = true;
    try {
      await cCall({ act: 'resetpw', token, pw: pw.value });
      popup('<b>' + tr('바뀌었습니다.') + '</b> ' + tr('새 비밀번호로 로그인해 주세요.'));
      // 링크를 다시 못 쓰게 주소창의 ?reset= 을 지운다
      history.replaceState(null, '', location.pathname);
      acctForm(true, 'login');
    } catch (e) { err.textContent = e.message || tr('실패했습니다'); err.hidden = false; go.disabled = false; }
  };
  b.append(pw, err, go);
  show('sub', tr('새 비밀번호'), false);
  $('#tabbar').hidden = true;
}

/* 직접 고르는 줄 — 예전에는 '바꾸기' 단추를 눌러야 다음 값으로 넘어갔다.
   그러면 ①지금 무엇을 고를 수 있는지 안 보이고 ②원하는 값까지 여러 번 눌러야 했다.
   이제 값을 모두 늘어놓고 **누른 것이 곧 선택**이다 (사용자 지시). */

/* 내 정보 — 계정 · 이름 · 알림 · 하루 분량 순서 (대표님 지시, 2026-09-12).
   소리 속도·화면 언어 칸은 없앴다 — 소리는 항상 0.8배속, 화면은 항상 한국어라
   고를 게 없다. 연속·누적 학습일도 홈에 이미 있어 여기선 뺐다(중복 금지). */
/* 내 정보 — 스티치 시안 '내 정보 (프로필 & 설정)'(2026-09-27 저녁)대로:
   프로필 카드(머리글자 동그라미·이름·계정·[바꾸기]) → 통계 타일 셋 → 하루 분량 → 설정 목록 카드(줄 사이 선) → 로그아웃 · 탈퇴하기 글자 단추 + 판번호 */
function renderAwards() { renderHome(); }   // 내 정보 화면은 홈에 녹였다 (2026-09-27 오후)

/* 진도 초기화 — 배운 것·복습 창고·별표·통계를 모두 비운다. 로그인돼 있으면 서버 진도도 빈 것으로 덮는다
   (대표님 지시 2026-09-27: "tpgus5119 아이디의 진도 리셋"). 별명·계정·설정(목소리·하루 분량·알림)은 남긴다. */
async function resetProgress() {
  if (!await askYN(tr('<b>진도를 모두 지울까요?</b><br>배운 세트·복습 창고·별표·통계가 비워집니다. 되돌릴 수 없습니다.'), '지우기', true)) return;
  ['done', 'srs', 'ssrs', 'bsrs', 'star', 'act', 'stats', 'shield', 'shieldWk', 'nat', 'cr', 'pet', 'miss', 'revDay', 'revSeen', 'cloudAt'].forEach(k => { delete S[k]; });
  S.done = {}; S.srs = {}; S.ssrs = {}; S.bsrs = {}; S.star = {}; S.act = {}; S.stats = {};
  save();
  if (S.acct && S.acct.tok) await cloudSync(true, true);   // 덮어쓰기 — 합치면 서버의 옛 진도가 되살아난다
  popup(tr('<b>진도를 지웠습니다.</b> 처음부터 다시 시작합니다.'));
  setTimeout(() => location.reload(), 900);
}

/* 업적 전체 목록 — 홈에서는 요약만 보이고, 여기서 다 본다 (대표님 지시, 2026-09-12). */

/* 실력 분석 전체 — 홈 카드는 뺐다. 여기서만 본다 (대표님 지시, 2026-09-12). */
function renderAnalysisPage() {
  const b = $('#subBody');
  b.textContent = '';
  renderAnalysis(b, 'week');
  show('sub', '실력 분석', true);
}

/* 이번 주 며칠 공부했는지(요일 동그라미)는 뺐다 (대표님 지시, 2026-09-12) —
   맨 위 '연속 학습' 배지와 같은 정보를 두 번 보여주는 것이었다.
   여기는 이제 '배운/외운/끝낸' 숫자와 업적 요약만 보여준다. */


/* ---------- 주간 총복습 ----------
   그 주에 새로 배운 카드를 **한 묶음으로 통째** 한 바퀴 돈다.
   같은 반복 횟수라면 작게 쪼개 여러 바퀴 도는 것보다 큰 묶음 한 바퀴가 낫다는
   실험이 있다(Kornell 2009). 그런데 참가자의 72%가 반대로 판단했다 —
   그래서 '쪼개기' 기능은 일부러 만들지 않는다. */



/* ---------- 주간 성적표 ----------
   점수는 지어내지 않는다. 앱이 직접 채점한 것만 센다:
   말하기=AI가 알아들은 비율, 듣기=소리로 가린 정답률, 읽기=글자 보고 뜻,
   쓰기=받아쓰기·타이핑, 암기=전체 인출 정답률.
   문제 수가 적으면(10문제 미만) 판정하지 않는다 — 적은 표본으로 강점·약점을 말하면 거짓이 된다. */
const weekKey = t => { const d = t ? new Date(t) : new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };   // 그 주 월요일
/* 네 가지 힘을 말하기 → 듣기 → 읽기 → 쓰기 순으로 본다(입 → 귀 → 눈 → 손).
   맨 아래 '암기'는 넷을 통틀어 "배운 것이 실제로 남아 있는가"만 따로 센다. */
const SUBJ = [
  { k: '말하기', ok: 'pronOk', all: 'pronAll', tip: '내가 말한 낱말을 폰(음성 인식·소리 비교)이 알아들은 비율 — 성조는 세부의 높낮이 판정' },
  { k: '듣기', ok: 'earOk', all: 'earAll', tip: '소리만 듣고 뜻·성조를 가리기' },
  { k: '읽기', ok: 'readOk', all: 'readAll', tip: '글자를 보고 뜻을 바로 떠올리기' },
  { k: '쓰기', ok: 'spellOk', all: 'spellAll', tip: '받아쓰기·타이핑으로 철자 맞히기' },
  { k: '암기', ok: 'qOk', all: 'qAll', tip: '배운 것이 얼마나 남아 있는가 (전체 정답률)' },
];
/* 외운 낱말 = 세 복습 창고(일상 srs · 실전 ssrs · 교재·선배·22기 bsrs)에서 2단계 넘은 것 (2026-10-02: 전에는 일상 창고만 세서 교재로 공부하면 0) */
const memoCount = () => ['srs', 'ssrs', 'bsrs'].reduce((a, k) => a + Object.values(S[k] || {}).filter(v => v.lv >= 2).length, 0);
function snapshot() {
  const t = S.stats || {};
  const o = { memo: memoCount(),
              days: Object.keys(S.act).length, drill: t.drill || 0,
              sets: Object.keys(S.done).filter(k => +k >= 1).length, said: t.said || 0 };
  SUBJ.forEach(x => { o[x.ok] = t[x.ok] || 0; o[x.all] = t[x.all] || 0; });
  return o;
}

/* ---------- 실력 점수 ----------
   순위와 실력 분석이 따로 놀면 안 된다. 순위는 분석에서 나와야 한다.
   그래서 점수를 지어내지 않고 **분석이 이미 재고 있는 두 가지만** 쓴다.

     실력 점수 = 외운 단어 수 × 평균 정답률

   뜻이 분명하다 — "믿을 만하게 아는 단어가 몇 개인가".
     · 외운 단어 = 하루 이상 간격을 두고 두 번 이상 맞힌 단어 (앱이 쓰는 '진짜 실력'의 정의)
     · 평균 정답률 = 말하기·듣기·읽기·쓰기·암기 중 **10문제를 넘긴 과목만** 평균
   300단어를 80%로 아는 사람이 240, 100단어를 95%로 아는 사람이 95다.

   뺀 것: 소리 낸 횟수 · 공부한 날 · 푼 문제 수.
   그건 노력이지 실력이 아니고, 노력은 동아리 출석판이 이미 보여준다.
   많이 누른 사람이 이기는 순위는 실력 순위가 아니다.

   과목이 하나도 10문제를 못 넘으면 점수를 내지 않는다(0) — 못 잰 것을 재었다고 하지 않는다. */
/* 되살림(2026-09-28 밤): 09-27 죽은 코드 정리 때 지웠으나 부르는 곳이 남아 있었다 — weekReport 는 새 주 첫 실행(월요일)에서, skillScore 는 실력 분석에서. 월요일에 앱이 안 켜진 원인. */
/* ---------- 실력 점수 ----------
   순위와 실력 분석이 따로 놀면 안 된다. 순위는 분석에서 나와야 한다.
   그래서 점수를 지어내지 않고 **분석이 이미 재고 있는 두 가지만** 쓴다.

     실력 점수 = 외운 단어 수 × 평균 정답률

   뜻이 분명하다 — "믿을 만하게 아는 단어가 몇 개인가".
     · 외운 단어 = 하루 이상 간격을 두고 두 번 이상 맞힌 단어 (앱이 쓰는 '진짜 실력'의 정의)
     · 평균 정답률 = 말하기·듣기·읽기·쓰기·암기 중 **10문제를 넘긴 과목만** 평균
   300단어를 80%로 아는 사람이 240, 100단어를 95%로 아는 사람이 95다.

   뺀 것: 소리 낸 횟수 · 공부한 날 · 푼 문제 수.
   그건 노력이지 실력이 아니고, 노력은 동아리 출석판이 이미 보여준다.
   많이 누른 사람이 이기는 순위는 실력 순위가 아니다.

   과목이 하나도 10문제를 못 넘으면 점수를 내지 않는다(0) — 못 잰 것을 재었다고 하지 않는다. */
function skillScore() {
  const cur = snapshot();
  const done = SUBJ.map(x => [cur[x.all] || 0, cur[x.ok] || 0]).filter(([n]) => n >= NEED);
  if (!done.length) return { score: 0, acc: null, memo: cur.memo, subjects: 0 };
  const acc = Math.round(done.reduce((a, [n, ok]) => a + ok / n, 0) * 100 / done.length);
  return { score: Math.round(cur.memo * acc / 100), acc, memo: cur.memo, subjects: done.length };
}
function weekReport(base) {
  const cur = snapshot(), b = base || {};
  const subj = SUBJ.map(x => {
    const n = (cur[x.all] || 0) - (b[x.all] || 0), ok = (cur[x.ok] || 0) - (b[x.ok] || 0);
    return { name: x.k, n, ok, pct: n ? Math.round(ok * 100 / n) : null, tip: x.tip };
  });
  const d = k => (cur[k] || 0) - (b[k] || 0);
  const r = { subj, memo: d('memo'), days: d('days'), sets: d('sets'), said: d('said') };
  r.skill = skillScore();               // 순위와 같은 잣대 — 따로 놀지 않게

  const solved = d('qAll') + d('drill');
  r.solved = solved;
  return r;
}
/* 되살림(2026-09-28 밤) — 09-27 정리 때 지워졌지만 실력 분석(순위 보내기)과 AI 호출이 아직 부른다 */
const onAppKey = () => !S.gkey && !!PROXY;
const weekCredits = () => (credits().wk || {})[weekKey()] || 0;
/* 한 달 점수 — 최근 주에 더 무게를 준다(MONTH_W 는 아래 동 계산 쪽에 그대로 있다) */
function monthCredits() {
  const wk = credits().wk || {};
  let sum = 0;
  MONTH_W.forEach((w, i) => {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    sum += (wk[weekKey(d)] || 0) * w;
  });
  return Math.round(sum);
}
function showWeek(rep) {
  const b = $('#weekBody');
  b.textContent = '';
  b.append(el('p', 'lede', '지난주 성적표' + (S.nick ? ' — ' + esc(S.nick) : '')));
  const st = el('div', 'stats');
  [['공부한 날', rep.days + '일'], ['끝낸 세트', rep.sets], ['새로 외운 단어', rep.memo], ['소리 낸 횟수', rep.said]]
    .forEach(([k, v]) => { const c = el('div', 'stat');
      c.append(el('b', null, String(v)), el('span', null, k)); st.append(c); });
  b.append(st);

  const ok = rep.subj.filter(x => x.n >= 10);
  rep.subj.forEach(x => {
    const row = el('div', 'subj');
    row.append(el('span', 'sname', x.name));
    const bar = el('span', 'sbar');
    if (x.pct !== null) { const fill = el('i'); fill.style.width = x.pct + '%'; bar.append(fill); }
    row.append(bar);
    row.append(el('span', 'spct', x.pct === null ? '—' : x.pct + '%'));
    row.append(el('span', 'sn', x.n ? x.n + '문제' : '안 함'));
    b.append(row);
  });

  if (ok.length >= 2) {
    const best = ok.reduce((a, x) => x.pct > a.pct ? x : a);
    const worst = ok.reduce((a, x) => x.pct < a.pct ? x : a);
    const c = el('div', 'rulecard');
    c.append(el('div', 'rhead', '<b>이번 주 강점과 약점</b>'));
    c.append(el('div', 'rbody',
      `<b>강점 — ${esc(best.name)} ${best.pct}%</b> · ${esc(best.tip)}<br>` +
      `<b>약점 — ${esc(worst.name)} ${worst.pct}%</b> · ${esc(worst.tip)}<br><br>` +
      (worst.name === '듣기' ? '이번 주는 기본기의 <b>성조·모음</b>을 자기 전에 한 번씩 돌려 보세요. 자는 동안 소리가 정리됩니다.'
       : worst.name === '쓰기' ? '<b>복습 → 쓰기</b>를 며칠 이어서 해 보세요. 부호 위치는 손으로 써야 붙습니다.'
       : worst.name === '말하기' ? '<b>복습 → 말하기</b>를 눌러 보세요. 알아듣는 발음인지가 바로 나옵니다.'
       : worst.name === '읽기' ? '<b>복습 → 읽기</b>를 며칠 이어서. 글자를 보고 뜻이 바로 떠오를 때까지가 목표입니다.'
       : '<b>복습</b>을 밀리지 않게 하는 것이 제일 빠릅니다 — 잊기 직전에 꺼내야 오래 남습니다.')));
    b.append(c);
  } else {
    b.append(el('p', 'note', '아직 문제 수가 적어 강점·약점을 말할 수 없습니다. 한 주만 더 해 보세요 — 과목마다 10문제가 넘으면 판정합니다.'));
  }

  const go = el('button', 'primary big', '이번 주 시작하기');
  go.style.width = '100%'; go.style.marginTop = '18px';
  go.onclick = () => { S.wk = { k: weekKey(), base: snapshot() }; save(); ACTIVE_TAB = 'home'; renderHome(); };   // 성적표 다음은 홈 (2026-09-27)
  b.append(go);
  show('week', '주간 성적표', false);
}

/* 닉네임 — 최초 한 번. 서버에 저장되지 않고, 순위에만 쓰인다 */
/* 무엇을 배우러 왔는가 — **앱에서 가장 중요한 한 번의 선택**이다.
   지금까지 이걸 가입할 때만 물었다. 그래서 로그인을 건너뛴 사람은 아무것도 고르지
   않은 채 기본값(한국인용 베트남어 과정)에 떨어졌다. 베트남 사람이 한국어를 배우러
   왔다가 베트남어 교재를 받는 셈이다. 그 사람은 앱이 고장 난 줄 알고 나간다.

   두 말을 나란히 적는다. 아직 아무것도 못 읽는 사람이 고르는 자리라서,
   글자를 못 읽어도 자기 나라 말을 알아보고 누를 수 있어야 한다. */
function askLearn() {
  // 이 앱은 한국인이 베트남어를 배우는 전용 앱으로 고정한다(2026-09-07 대표님 지시 —
  // 완전히 별개의 앱으로 분리, 언어 선택 화면 자체를 없앤다). 예전엔 여기서 한국어/
  // 베트남어 중 골랐지만, 이제 고를 게 없으므로 그냥 바로 시작한다.
  S.learn = 'vi';
  save();
  dailyFlowEntry();
}

function askNick() {
  const b = $('#nickBody');
  b.textContent = '';
  b.append(el('p', 'lede', '이름이 뭐예요?'));
  b.append(el('p', 'vi mid', 'Tên bạn là gì?'));
  b.append(el('p', 'note', '언제든 바꿀 수 있습니다. <b>먼저 쓴 사람이 임자</b>라 겹치는 별명은 못 씁니다.'));
  const inp = el('input', 'keyin'); inp.type = 'text'; inp.placeholder = tr('별명 (2~10글자)'); inp.maxLength = 10;
  const go = el('button', 'primary big', '시작하기');
  go.style.width = '100%';
  const err = el('p', 'note nickerr');
  err.hidden = true;
  go.onclick = async () => {
    const v = inp.value.trim();
    if (v.length < 2) { inp.focus(); return; }
    // 같은 별명이 둘이면 동아리 출석판에서 누가 누구인지 알 수 없다 — 먼저 쓴 사람이 임자다
    go.disabled = true; err.hidden = true;
    const old = S.nick;
    if (v === petName()) { popup(tr('짜오 이름과 같은 별명은 안 됩니다')); return; }
    S.nick = v;
    try {
      await cCall({ act: 'nick' });
    } catch (e) {
      /* 서버에 **못 닿은 것**과 별명이 **겹친 것**은 다르다 (2026-08-30 검수).
         전에는 둘을 한 덩어리로 묶어 'Failed to fetch' 를 그대로 보여 주고 가입을 막았다 —
         인터넷이 잠깐 끊기면 앱에 아예 못 들어갔다. 못 닿았으면 그냥 들여보낸다. */
      const msg = String(e && e.message || '');
      const dup = /겹|이미|중복|taken|exist|duplicate/i.test(msg);
      if (dup) {
        S.nick = old;
        err.textContent = tr('「」는 이미 쓰는 사람이 있습니다 — 다른 별명을 지어 주세요.')
          .replace('「」', '「' + v + '」');
        err.hidden = false; go.disabled = false; inp.focus(); inp.select();
        return;
      }
      S.nickcheck = 0;                    // 나중에 다시 확인한다
    }
    S.wk = { k: weekKey(), base: snapshot() }; save();
    S.learn ? dailyFlowEntry() : askLearn();
  };
  b.append(inp, err, go);
  // 위쪽 뒤로가기로 그냥 나갈 수 있다. 처음이라 이름이 없으면 '이름없음'으로 두고 나간다.
  const had = !!S.nick;
  dive(() => {
    if (!S.nick) { S.nick = '이름없음'; S.wk = { k: weekKey(), base: snapshot() }; save(); }
    had ? renderAwards() : (S.learn ? dailyFlowEntry() : askLearn());
  });
  show('nick', '이름', true);
}


/* ---------- 홈 메뉴 ----------
   첫 화면은 큰 칸 여덟 개뿐이다. 칸을 누르면 그 안에서 고른다 —
   첫 화면에 버튼이 많을수록 고르는 데 힘이 들고, 결국 아무것도 안 누르게 된다. */
/* 한국어를 배우는 사람의 첫 화면.
   '날마다 배우기'가 생겨서(초급1~중급2 78일) 맨 위 큰 카드로 올렸다 —
   베트남어 과정이 '오늘 배울 세트'를 첫 화면 중심에 두는 것과 같은 자리다.
   그 아래는 모의고사 성적과, 아직 없는 것에 대한 정직한 안내.
   없는 것을 있는 척 채워 두면 눌러 보고 실망한다. */
function drawKoHome() {
  const plan = $('#plan');
  plan.textContent = '';
  $('#progress').textContent = '';

  // el() 은 셋째 인자를 자동으로 tr() 에 태운다 — 'vi' 면 베트남어만, 'dev' 면 한국어를 ⟨ ⟩ 로 덧붙인다.
  // 실제 베트남 이용자(vi)는 절대로 한글 원문을 보면 안 된다 — 개발용 대조는 dev 모드에서만.
  const head = el('div', 'kohead');
  head.append(el('div', 'kohtit', '베트남인을 위한 한국어'));
  head.append(el('div', 'kohsub', 'EPS-TOPIK · KIIP · TOPIK I 시험 대비'));
  plan.append(head);

  // 날마다 배우기 — 오늘 화면 첫 자리. 진도는 S.kday(마지막으로 본 날, 없으면 1일차부터).
  const dayRow = el('div', 'plancell go');
  const dk = el('span', 'pk'), dv = el('span', 'pv');
  dk.textContent = tr('날마다 배우기');
  dv.textContent = 'Day ' + (S.kday || 1) + ' · ' + tr('초급1');
  dayRow.append(dk, dv);
  dayRow.onclick = koDayEntry;
  plan.append(dayRow);

  // 모의고사 성적 요약 — 본 적이 있으면 최근 점수, 없으면 시작 안내.
  // 숫자가 낀 문장이라 el() 통짜 번역을 못 쓴다 — 단어만 tr() 로 옮기고 숫자를 직접 끼운다.
  const scores = Object.entries(S.exam || {});
  const row = el('div', 'plancell go');
  const pk = el('span', 'pk'), pv = el('span', 'pv');
  if (scores.length) {
    const best = scores.map(([, v]) => Math.round(v.score / v.total * 100));
    const avg = Math.round(best.reduce((a, c) => a + c, 0) / best.length);
    pk.textContent = tr('응시') + ' ' + scores.length + tr('회');
    pv.textContent = tr('평균') + ' ' + avg + tr('점');
  } else {
    pk.textContent = tr('모의고사'); pv.textContent = tr('시작하기');
  }
  row.append(pk, pv);
  row.onclick = examEntry;
  plan.append(row);

  const note = el('p', 'note');
  note.append(el('b', null, '지금 있는 것 — 날마다 배우기 78일, 모의고사 45벌(보기별 해설 포함), 기본기, 문법 78개, 한국 문화, AI 채점 말하기·쓰기'));
  note.append(document.createElement('br'));
  note.append(document.createTextNode(tr('아직 없는 것 — TOPIK II 쓰기 연습 회차, 공식 기출 풀이(공식 자료실로 안내합니다)')));
  plan.append(note);
}

/* 이 앱은 한국인이 베트남어를 배우는 전용 앱으로 고정한다(2026-09-07 대표님 지시).
   베트남인용 한국어 코스는 별개의 앱(저장소)으로 완전히 분리됐다. 아래 한국어 코스
   코드(MENUS_KO, 시험 엔진, drawKoHome 등)는 이 분기 때문에 전부 도달 불가능한
   죽은 코드다 — 다음 정리 때 통째로 들어내기 쉽도록 일부러 그대로 남겨 두었다. */
const learnKo = () => false;

const MENUS_VI = {          // 한국인이 베트남어를 배운다 (지금까지의 앱)
  /* 첫 화면은 **누르면 바로 그것**이 나와야 한다 (대표님 지시, 2026-08-30).
     '학습'을 누르면 하위 메뉴 없이 곧장 권 목록이 뜬다.
     기본기·문법·문화는 첫 화면에서 뺐다 — 학습(1권)과 문화 단추 안에 이미 있다.
     대화 108·핵심만도 뺐다: 단어은 학습으로 합쳤고, 갈래가 늘면 어디로 가야 할지 흐려진다. */
  /* 첫 화면 차례 (대표님 지시, 2026-08-30):
       학습 – 복습 – 단어장 – 문화 – 순위 – 사용법
     기사는 문화 안으로 넣었다 — 읽는 자리끼리 모은다. */
  day:   { name: '학습', items: () => [['보기', courseEntry]] },
  /* 복습은 둘이다:
       ① 복습     — 잊을 때가 된 것을 앱이 골라 준다(간격 반복)
       ② 자유 복습 — 내가 끝낸 레슨을 골라서 그것만 푼다
     단어·문장을 가르지 않는다 — 문장은 단어 밑의 예문으로 이미 붙어 있다. */
  rev:   { name: '복습', items: () => [['복습', () => reviewMenu('all')],
                                      ['자유 복습', freePickEntry],
                                      ['기사 복습', newsReviewEntry]] },
  book:  { name: '단어장', items: () => [['내 단어장', wordbookEntry],
                                        ['사전', dictEntry]] },
  cult:  { name: '문화', items: () => [['베트남 바로알기', knowEntry],
                                      ['오늘의 기사', showNewsLearn]] },
};

/* 시험 탭 입구 — 학습 탭과 같은 갈래(회화·GYBM)로 보낸다 (대표님 지시,
   2026-09-16: "시험탭내부도 회화, gybm, 공인인증시험. 이런식으로 학습탭과 동일하게").
   2026-09-25 대표님 지시로 공인인증시험(VLPT 모의고사) 갈래는 통째로 뺐다.
   회화·GYBM은 아직 시험 콘텐츠가 없어 준비 중이라고 정직하게 말한다 — 단어만 먼저
   업데이트하고 시험 문항은 나중에 만들라는 지시라 여기서 지어내지 않는다. */
/* 테스트 탭 (대표님 지시 2026-09-27) — 네 문.
   3-1 오늘 복습: 간격 반복(1·3·7·14·30·60일 — 강성태식 복습 주기와 같은 원리)으로 오늘 때가 된 단어을
       **카드로 쭉 훑고 → 바로 테스트**. 창고는 셋(하루5분·실전·GYBM)이라 섞지 않고 각각 문을 낸다.
   3-2 배운 단어 전체: 지금까지 배운 모든 단어을 랜덤으로 (20·50·전부). 맞고 틀림은 단어마다 제 창고에 쌓인다.
   3-3 선택 복습: 내 단어장(별표)·오답 노트·일차/레슨 골라서.
   3-4 최근 학습 복습: 가장 마지막에 끝낸 세트를 다시 (카드 → 테스트). */
function testHubEntry(sub) {
  SBOX = 'srs';
  const b = $('#examBody');
  b.textContent = '';
  /* 스티치 시안 '테스트'(2026-09-27 저녁): 아이콘 + 20px 제목 + 부제 + 오른쪽 화살, 오늘 복습은 파란 테두리·'오늘' 알약·'카드 → 테스트 → 결과' 칩 */
  const ICO = {
    today: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6.5v5c0 4.6 3.4 8.4 8 9.5 4.6-1.1 8-4.9 8-9.5v-5z"/><path d="m9 12 2 2 4-4"/></svg>',
    all: '<svg viewBox="0 0 24 24"><path d="M4 7h4l3 5-3 5H4M20 7h-4l-3 5 3 5h4"/><path d="m17 5 3 2-3 2M17 15l3 2-3 2"/></svg>',
    pick: '<svg viewBox="0 0 24 24"><path d="M4 6h2M4 12h2M4 18h2M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1 1 1.5-2"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    write: '<svg viewBox="0 0 24 24"><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 7 3 3"/></svg>',
    tone: '<svg viewBox="0 0 24 24"><path d="M3 15c2.5 0 3-6 6-6s3.5 8 6 8 3-5 6-5"/></svg>',
  };
  /* 부제 글줄은 뺐다 (대표님 지시 2026-09-27). 숫자(대기·단어 수)만 오른쪽 알약으로 */
  const row = (ico, t, n, fn, o) => {
    o = o || {};
    const c = el('button', 'hubcard' + (o.today ? ' today' : '') + (o.dis ? ' off' : ''));
    c.innerHTML = `<span class="hubico">${ico}</span><span class="hubbody"><b class="hubt2">${esc(tr(t))}${o.today ? '<span class="hubtag">' + tr('오늘') + '</span>' : ''}</b></span>` +
      (n ? `<span class="accpill">${n}</span>` : '') +
      `<svg class="hubchev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`;
    if (o.dis) c.disabled = true;
    else c.onclick = () => { dive(sub === 'review' ? testReviewEntry : testHubEntry); fn(); };
    b.append(c);
  };
  if (sub === 'review') {                               // 복습 갈래 안 (2026-09-30)
    const due0 = dueCount(), pool0 = learnedPool(), stars0 = Object.keys(starOf()).length;
    b.append(qnPicker());
    row(ICO.today, '오늘 복습', due0, () => testToday(), { today: true, dis: !due0 });
    row(ICO.all, '배운 단어 전체', pool0.length ? pool0.length.toLocaleString('ko-KR') : 0, () => testAllLearned(pool0), { dis: !pool0.length });
    row(ICO.star, '내 단어장', stars0, () => startWordbookQuiz(Object.entries(starOf()).map(([k, v]) => (v && v.vi) || k), '단어장 복습'), { dis: !stars0 });
    row(ICO.pick, '선택 복습', 0, testPickEntry);
    show('exam', tr('복습'), true);
    return;
  }
  /* 오늘 복습은 **하나** — 세 창고(하루5분·실전·GYBM)의 오늘 단어을 한 판에 모은다 (대표님 지시 2026-09-27:
     "gybm단어 오늘 복습, 이거는 뭐냐"). 단어마다 제 창고에 채점이 쌓인다(boxOf). */
  const due = dueCount();
  const pool = learnedPool();
  b.append(qnPicker());                                   // 문제 수 10·20·30 — 학습 뒤 확인 문제와 같은 값 (2026-09-28 밤)
  /* 다섯 갈래: 복습(오늘 복습·배운 단어 전체·내 단어장·선택 복습) · 성조·모자 · 문장 · 단어 시험(매일) · 주간 시험.
     (2026-10-02 대표님 "문장이란 단어와 문법의 조합") 문법 테스트는 문장 테스트로 합쳤다 — 재료(끝낸 문법 과 예문)와 '문법 고르기' 문제,
     틀리면 그 과 문법 카드로 가는 단추는 문장 테스트 안에 그대로 있다 */
  row(ICO.today, '복습', due, () => testReviewEntry(), { today: !!due });
  row(ICO.tone, '성조·모자', 0, startToneTest);      // 성조·모음 모자를 귀로 가리기 — 여남 목소리·틀리면 비교 듣기·단계 (2026-09-28, 모자 2026-09-29)
  row(ICO.write, '문장', 0, () => testSents());       // 배운 단어 예문 + 끝낸 문법 과 예문 (2026-10-02 문법 테스트를 합침)
  row(ICO.pick, '단어 시험', 0, () => dailyEntry('test'));   // 22기 매일 단어 시험 — 실제 시험처럼 (2026-09-30)
  row(ICO.pick, '주간 시험', 0, weeklyEntry);   // 회차별(범위별) 모의시험 — 실제 반 시험 짜임 (2026-09-28)
  show('exam', '테스트', true);
  if (!COURSE) withCourse(() => { if (ACTIVE_TAB === 'test' && CURV === 'exam' && $('#title').textContent === tr('테스트')) testHubEntry(); });
  if (!GYBM) gybmBuild(() => { if (ACTIVE_TAB === 'test' && CURV === 'exam' && $('#title').textContent === tr('테스트')) testHubEntry(); });
}
/* 카드로 쭉 → [이제 테스트 시작] → 같은 단어로 문제 */
function testReviewEntry() { testHubEntry('review'); }
function cardsThenQuiz(words, title, o) {
  const ws = (words || []).slice(0, qN());          // 카드도 문제 수만큼만 — 카드 50장 보고 문제는 20개면 어긋난다 (2026-09-28 밤)
  if (!ws.length) { popup(tr('복습할 단어이 없습니다')); return; }
  flashRun(ws, title, { next: () => startQuiz(ws, null, ws.length, !!(o && o.early), (o && o.opt) || {}) });
}
/* 오늘 때가 된 단어 — 세 창고를 다 본다. 단어마다 제 창고 이름(_box)을 단다 */
const dueN = box => Object.values(S[box] || {}).filter(v => v.due <= now()).length;
const dueCount = () => dueN('srs') + dueN('ssrs') + dueN('bsrs');
function dueAll() {
  const seen = new Set(), out = [];
  const add = (w, box) => { if (!w || !w.vi) return; const k = w.vi.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push(Object.assign({}, w, { _box: box })); };
  dueWords().forEach(k => add(findItem(k), 'srs'));                       // 하루5분 창고는 원래 차례(급한 것 먼저)대로
  const n = now(), words = allWords();
  const sen = typeof seniorItems === 'function' ? seniorItems() : [];
  Object.entries(S.ssrs || {}).forEach(([k, v]) => { if (v.due <= n) add(sen.find(x => x.vi === k) || words.find(x => x.vi === k), 'ssrs'); });
  const gy = GYBM ? gybmAllWords() : [];
  Object.entries(S.bsrs || {}).forEach(([k, v]) => { if (v.due <= n) add(gy.find(x => x.vi === k) || words.find(x => x.vi === k), 'bsrs'); });
  return out;
}
function testToday() {
  SBOX = 'srs';
  const due = dueAll();
  if (!due.length) { drawRevInfo(); return; }
  S.revSeen = 1; save();
  const boxOf = {}; due.forEach(w => { boxOf[w.vi] = w._box; });
  cardsThenQuiz(due, '오늘 복습 카드', { opt: { boxOf: vi => boxOf[vi] || 'srs' } });
}
/* 지금까지 배운 단어 — 끝낸 일차·레슨의 단어 + 세 복습 창고의 단어. 단어마다 제 창고 이름(_box)을 단다 */
function learnedPool() {
  const out = new Map();
  const put = (w, box) => { if (!w || !w.vi) return; const k = w.vi.toLowerCase(); if (!out.has(k)) out.set(k, Object.assign({}, w, { _box: box })); };
  ALL.forEach(d => { if (typeof d.day === 'number' && !d.track && S.done[d.day]) (d.words || []).forEach(w => put(w, 'srs')); });
  if (COURSE) freeUnits().forEach(u => u[2].forEach(w => put(w, 'srs')));
  const words = allWords();
  Object.keys(S.srs || {}).forEach(k => put(words.find(x => x.vi === k), 'srs'));
  const sen = typeof seniorItems === 'function' ? seniorItems() : [];
  Object.keys(S.ssrs || {}).forEach(k => put(sen.find(x => x.vi === k) || words.find(x => x.vi === k), 'ssrs'));
  if (GYBM) { const g = gybmAllWords(); Object.keys(S.bsrs || {}).forEach(k => put(g.find(x => x.vi === k) || words.find(x => x.vi === k), 'bsrs')); }
  return [...out.values()];
}
function testAllLearned(pool) {
  pool = pool || learnedPool();
  const b = $('#examBody'); b.textContent = '';
  b.append(el('p', 'lede', tr('지금까지 배운') + ' ' + pool.length + tr('단어') + ' — ' + tr('몇 문제를 풀까요?')));
  const boxOf = {}; pool.forEach(w => { boxOf[w.vi] = w._box; });
  const ns = [10, 20, 30].filter(n => n <= pool.length);          // 학습 뒤 확인 문제와 같은 10·20·30 (2026-09-28 밤)
  if (!ns.length) ns.push(pool.length);
  ns.forEach(n => {
    const btn = el('button', 'bigmenu', n + tr('문제'));
    btn.onclick = () => {
      if ([10, 20, 30].includes(n)) QN = n;
      const ws = pool.slice().sort(() => Math.random() - .5).slice(0, n);
      dive(() => testAllLearned(pool));
      startQuiz(ws, null, n, false, { kind: 'word', boxOf: vi => boxOf[vi] || 'srs' });
    };
    b.append(btn);
  });
  show('exam', '배운 단어 전체', true);
}
/* 테스트 탭의 문장·문법 (대표님 물음 2026-09-28 밤: "테스트에 문법 테스트와 문장 테스트도 넣을까?" → 넣음).
   둘 다 고른 문제 수(qN)만큼. 배운 것만 낸다 — 안 배운 것을 풀면 복습이 아니라 시험이다 */
function learnedSents() {
  const out = [], seen = new Set();
  const put = (s, graded) => {
    if (!s || !s.vi || seen.has(s.vi)) return; seen.add(s.vi);
    out.push(Object.assign({ vi: s.vi, ko: s.ko || '', kr_read: s.kr_read || s.kr || '', tones: s.tones, sent: true }, graded ? {} : { nograde: true }));
  };
  Object.keys(S.srs || {}).forEach(k => { const it = findItem(k); if (it && it.sent) put(it, true); });            // 복습 창고의 문장 — 채점이 창고에 쌓인다
  learnedPool().forEach(w => { const e = w.ex; if (e && e.vi && e.ko && e.vi.split(/\s+/).length >= 3) put(e, false); });   // 배운 단어의 예문 — 창고에는 안 넣는다
  return out.filter(x => x.ko);
}
/* 대답 만들기 (대표님 2026-10-06 "문장을 보고 대답을 작성하는 테스트") — 교재 대화에서 '물음 → 대답' 짝을 뽑아,
   물음을 보여 주고(누르면 소리) 그 대답을 조각으로 만든다. 범위: 교재(메인) 과 가운데 한 세트라도 끝낸 과까지(최소 1과). 대답은 3~9낱말 */
let REALBOOK = null, REALBOOK_P = null;
function realbookLoad() {
  if (REALBOOK) return Promise.resolve();
  if (!REALBOOK_P) REALBOOK_P = fetch('data/realbook.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { REALBOOK = j; }).catch(() => { REALBOOK_P = null; popup(tr('교재 대화를 불러오지 못했습니다')); });
  return REALBOOK_P;
}
function replyLoad(cb) { realbookLoad().then(() => { if (REALBOOK) gybmBuild(() => cb(replyPairs())); }); }
function replyPairs() {
  const chs = ((REALBOOK.books || [])[0] || {}).chapters || [];
  const main = GYBM && GYBM.find(x => x.key === 'main');
  let maxCh = 1;                                            // 적어도 1·2과 — 1과만으론 짝이 넷뿐이다
  if (main) {
    const base = t => String(t).replace(/\s*·\s*\d+부$/, ''), order = [...new Set(main.lessons.map(l => base(l.title)))];
    main.lessons.forEach((l, i) => { if (bdone()[gybmKey('main', i)]) maxCh = Math.max(maxCh, order.indexOf(base(l.title))); });
  }
  const out = [], seen = new Set();
  const strip = t => String(t).replace(/^[^:：]{1,24}[:：]\s*/, '').trim();   // 'David: ' 같은 말하는 사람 이름을 뗀다
  /* 뜻 안의 사람 이름은 한글로 — koShow 가 로마자를 모두 지워 '저는 를 만나지' 가 되기 때문. 없는 이름은 베트남어 읽기(krOf) */
  const koNm = koNames;                                      // 이름표는 전역 NAME_KO (koShow 와 같이 씀)
  chs.slice(0, maxCh + 1).forEach(c => {
    const vs = [], ks = [];
    (c.dialogues || []).forEach(dl => { const a = String(dl.vi).split(' / '), b = String(dl.ko || '').split(' / '); a.forEach((x, i) => { vs.push(strip(x)); ks.push(strip(b[i] || '')); }); });
    for (let i = 0; i + 1 < vs.length; i++) {
      const qv = vs[i], av = vs[i + 1];
      if (!/\?$/.test(qv) || /\?$/.test(av) || seen.has(av)) continue;
      const n = av.replace(/[.!?]+$/, '').split(/\s+/).length;
      if (n < 3 || n > 9 || qv.split(/\s+/).length > 14) continue;
      seen.add(av);
      out.push({ vi: av, ko: koNm(ks[i + 1]), ask: qv, askKo: koNm(ks[i]), sent: true, nograde: true });
    }
  });
  return out;
}
function testSents(mode) {
  /* 문장 = 단어 학습의 연장 (대표님 2026-09-30: "학습은 단어로 하고, 테스트에서 문장을 만드는 것까지") — 배운 낱말의 예문으로 문장을 **만든다**.
     (2026-10-02 대표님 "문장이란 단어와 문법의 조합 — 문장 테스트와 문법 테스트가 따로 있어야 하나?") → 문법 테스트를 여기로 합쳤다:
     재료 = 배운 낱말의 예문 + 끝낸 문법 과의 예문. 문제 꼴에 '문법 고르기'(이 문장에 쓰인 문형은?)를 더했고,
     문법 과 예문을 틀리면 '○과 문법 카드' 단추가 뜬다(nextBtn). 조각 배열·쳐서 쓰기·듣고 조각·뜻 고르기는 buildQuestions 의 forced 로 */
  if (!GRAM) { gramEnsure(() => testSents(mode)); return; }
  if (!GTOK) { gramTokLoad().then(() => testSents(mode)); return; }
  const gsents = learnedGramSents();
  const seen = new Set(gsents.map(x => x.vi));
  /* 문장은 **끝낸 문법 과의 문형으로만 된 것** (대표님 2026-10-06 "문장 테스트의 문장들이 유저의 문법 학습 순서와 매치가 안 되지?") —
     배운 낱말의 예문이라도 아직 안 배운 문형(예: nếu … thì)이 들어 있으면 뺀다. 문법 과를 하나도 안 끝냈으면 문형이 하나도 안 잡히는 문장만 남는다 */
  const okIds = knownGramIds();
  const all0 = [...learnedSents().filter(x => !seen.has(x.vi)), ...gsents];
  const pool = all0.filter(x => sentWithinKnown(x.vi, okIds)).sort(() => Math.random() - .5);
  if (pool.length < 4) { popup(tr('지금까지 끝낸 문법 과로 풀 수 있는 문장이 적습니다 — 문법 과를 더 끝내면 늘어납니다') + ' (' + pool.length + '/' + all0.length + ')'); return; }
  if (!mode) {
    const b = $('#examBody'); b.textContent = '';
    b.append(qnPicker());
    b.append(el('p', 'note', tr('끝낸 문법 과의 문형으로만 된 문장 N개 (전체 M개)').replace('N', pool.length).replace('M', all0.length)));   // 문법 학습 순서에 맞춘 범위 (2026-10-06)
    const mk = (t, meta, m) => { const x = el('button', 'bigmenu'); x.append(el('b', null, esc(tr(t)) + ' <span class="exmeta">' + esc(tr(meta)) + '</span>')); x.onclick = () => { dive(() => testSents()); testSents(m); }; b.append(x); };
    mk('문장 만들기', '뜻을 보고 조각을 차례대로 눌러 문장을 만든다', 'puzzle');
    // '뜻 보고 쓰기'(자판으로 치기)는 뺐다 — 대표님 2026-10-06 "직접 쓰면 너무 어렵다, 단어 블록을 조립하도록"
    mk('대답 만들기', '질문을 읽고 조각으로 대답을 만든다 (교재 대화)', 'reply');
    mk('듣고 만들기', '문장을 듣고 조각으로 만든다', 'puzzle_vi');
    mk('뜻 고르기', '문장을 읽고 뜻을 고른다', 'read');
    if (gsents.length) mk('문법 고르기', '문장에 쓰인 문형을 고른다 (끝낸 문법 과)', 'gpat');
    mk('섞어서', '위 문제를 섞는다', 'mix');
    show('exam', tr('문장'), true);
    return;
  }
  SBOX = 'srs';
  const N = qN(), mix = a => a.slice().sort(() => Math.random() - .5);
  const gpatQ = s => {
    const wrong = [], ks = new Set([s.gk]);
    [...mix(learnedGram()), ...mix(gramPool())].forEach(p => { if (wrong.length < 3 && !ks.has(p.k)) { ks.add(p.k); wrong.push({ k: p.k, t: p.t }); } });   // 오답 보기는 배운 문법에서 먼저 — 모자라면 전체에서
    return { w: s, mode: 'gpat', opts: [], popts: mix([{ k: s.gk, t: s.gt }, ...wrong]) };
  };
  if (mode === 'reply') {
    replyLoad(pairs => {
      if (pairs.length < 4) { popup(tr('대답을 만들 교재 대화가 아직 적습니다 — 교재 과를 더 끝내면 늘어납니다')); return; }
      startQuiz(mix(pairs), null, N, true, { kind: 'sent', skill: 'puzzle' }); if (Q) Q.noMore = true;
    });
    return;
  }
  if (mode !== 'gpat' && mode !== 'mix') {
    startQuiz(pool, null, N, true, { kind: 'sent', skill: mode });
    if (Q) Q.noMore = true;
    return;
  }
  let L;
  if (mode === 'gpat') L = mix(gsents).slice(0, N).map(gpatQ);
  else {
    const src = pool.slice(0, N);
    L = buildQuestions(src, ['puzzle', 'puzzle_vi', 'read']);
    let k = 0;
    L = L.map(q => (q.w && q.w.gk && k++ % 2 === 0 ? gpatQ(q.w) : q));   // 문법 과 예문은 둘에 하나꼴로 '문법 고르기'
  }
  Q = { list: L, i: 0, ok: 0, day: null, total: L.length, early: true, opt: { kind: 'sent' }, noMore: true };
  sensesLoad();
  drawQuiz();
  show('quiz', tr('문장'), true);
}
/* 문형 알아보기 (2026-10-06, 대표님 "메인 교재에 녹아 있는 문법도 모두 앱에 · 주간 시험 범위에 맞는 문법 · 문장 테스트를 문법 학습 순서에 맞게"):
   data/_gram_tok.json = 문형마다 문장에서 알아보는 정규식(tools/gram_tok/규칙.tsv → build.py, 예문으로 검산), data/_gram_ch.json = 메인 교재 권-과 → 그 과 대화·문법 상자에 나오는 문형.
   gramDetect(문장) → 문형 id(과.번) 목록. 글자·소리처럼 늘 아는 문형(always)은 안 센다 */
let GTOK = null, GCH = null, GCH_BOOKS = [], GTOK_P = null;
function gramTokLoad() {
  if (GTOK && GCH) return Promise.resolve();
  if (!GTOK_P) GTOK_P = Promise.all([fetch('data/_gram_tok.json', { cache: 'no-cache' }).then(r => r.json()), fetch('data/_gram_ch.json', { cache: 'no-cache' }).then(r => r.json())])
    .then(([t, c]) => { GTOK = (t.items || []).map(x => Object.assign({}, x, { rx: (x.re || []).map(r => new RegExp(r, 'i')) })); GCH = c.chapters || {}; GCH_BOOKS = c.books || []; })
    .catch(() => { GTOK = []; GCH = {}; });
  return GTOK_P;
}
function gramDetect(vi) {
  if (!GTOK) return [];
  const s = String(vi || '').toLowerCase();
  return GTOK.filter(x => !x.always && x.rx.some(r => r.test(s))).map(x => x.id);
}
/* 끝낸 문법 과의 문형 id 들 + 늘 아는 것 — 문장이 이 안의 문형만 쓰면 '배운 문법으로 된 문장' */
function knownGramIds() {
  const ok = new Set();
  if (!GTOK || !GRAM) return ok;
  GTOK.forEach(x => { if (x.always || S.done[gkey(0, x.li)]) ok.add(x.id); });
  return ok;
}
function sentWithinKnown(vi, ok) { return gramDetect(vi).every(id => ok.has(id)); }
function learnedGram() {
  const out = [];
  if (!GRAM) return out;
  (GRAM.books || []).forEach((b, bi) => b.bai.forEach((x, ni) => {
    if (S.done[gkey(bi, ni)]) x.g.forEach(g => { if (g.k && g.t && g.ex && g.ex.length) out.push(g); });
  }));
  return out;
}
/* 끝낸 문법 과의 예문 — 문형(gk·gt)과 과 자리(gbi·gni)를 단다. 문장 테스트가 쓴다 (2026-10-02, 문법 테스트를 문장으로 합침) */
function learnedGramSents() {
  const out = [], seen = new Set();
  if (!GRAM) return out;
  (GRAM.books || []).forEach((b, bi) => b.bai.forEach((x, ni) => {
    if (!S.done[gkey(bi, ni)]) return;
    x.g.forEach(g => { if (g.k && g.t && g.ex) g.ex.forEach(e => { if (e.vi && e.ko && !seen.has(e.vi)) { seen.add(e.vi); out.push({ vi: e.vi, ko: e.ko, kr_read: e.kr || '', sent: true, nograde: true, gk: g.k, gt: g.t, gbi: bi, gni: ni }); } }); });
  }));
  return out;
}
function testPickEntry() {
  const b = $('#examBody'); b.textContent = '';
  /* 부제 글줄 없이 제목만 (2026-09-27). 내 단어장은 테스트 첫 화면으로 올렸다 */
  const row = (t, n, fn, dis) => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, esc(tr(t)) + (n ? ' <span class="mbadge">' + n + '</span>' : '')));
    if (dis) btn.disabled = true;
    else btn.onclick = () => { dive(testPickEntry); fn(); };
    b.append(btn);
  };
  const miss = missWords('word');
  row('오답 노트', miss.length, () => { S.revSeen = 1; save(); startQuiz(miss.slice(0, 20), null, null, true); }, !miss.length);
  // 갈래 이름만 (대표님 지시 2026-09-27 저녁: '일차 고르기·레슨 고르기' 같은 꼬리 글 없이). 어느 갈래든 모든 과를 자유롭게 고른다
  row('일상', 0, () => pickUnits('days'));
  row('직무', 0, () => withCourse(() => pickUnits('job')));
  row('교재', 0, () => gybmBuild(() => pickUnits('main')));
  row('22기 단어 시험 자료', 0, () => gybmBuild(() => pickUnits('c22')));
  show('exam', '선택 복습', true);
}
let PICK = null;                                   // 고른 단위 열쇠들 (갈래마다 새로)
function pickUnits(kind) {
  const units = [];                                // [열쇠, 이름, 단어들, 끝냄, 창고]
  if (kind === 'days') ALL.filter(d => typeof d.day === 'number' && !d.track).sort((a, b) => (a.n || 0) - (b.n || 0))
    .forEach(d => units.push([d.day, d.theme, d.words || [], !!S.done[d.day], 'srs']));
  else if (kind === 'job') { const jv = jobVol(0); if (jv) jv.tracks.forEach((t, ti) => t.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => {
    const k = 'J0.' + ti + '.' + ci + '.' + li; units.push([k, t.track + ' · ' + lsName(l, li), l.words, !!S.done[k], 'srs']); }))); }
  else { const src = (GYBM || []).find(s => s.key === kind); if (src) src.lessons.forEach((l, li) => {
    const k = gybmKey(src.key, li); units.push([k, l.title, l.words, !!bdone()[k], 'bsrs']); }); }
  PICK = PICK && PICK.kind === kind ? PICK : { kind, set: new Set() };
  const title = { days: '일상', job: '직무', main: '교재', senior: '선배 단어 시험 자료', c22: '22기 단어 시험 자료' }[kind] || kind;
  const b = $('#examBody'); b.textContent = '';
  b.append(el('p', 'lede', tr('복습할 것을 고르세요') + ' — ' + units.length + tr('개') + ' (✓ ' + tr('끝낸 것') + ')'));
  const list = el('div', 'freelist');
  units.forEach(([k, nm, ws, done]) => {
    const on = PICK.set.has(k);
    const r = el('button', 'freerow' + (on ? ' on' : '')); r.type = 'button';
    r.append(el('i', 'freebox', on ? '☑' : '☐'), el('span', 'freenm', (done ? '✓ ' : '') + esc(nm)), el('span', 'freen', ws.length + tr('단어')));
    r.onclick = () => { on ? PICK.set.delete(k) : PICK.set.add(k); pickUnits(kind); };
    list.append(r);
  });
  b.append(list);
  const picked = units.filter(u => PICK.set.has(u[0]));
  const n = picked.reduce((a, u) => a + u[2].length, 0);
  const all = el('button', 'bigmenu', tr('끝낸 것 모두 고르기'));
  all.onclick = () => { units.filter(u => u[3]).forEach(u => PICK.set.add(u[0])); pickUnits(kind); };
  const none = el('button', 'bigmenu', tr('모두 풀기(해제)'));
  none.onclick = () => { PICK.set.clear(); pickUnits(kind); };
  b.append(all, none);
  if (n) {
    const go = el('button', 'primary big');
    go.style.width = '100%'; go.style.marginTop = '14px';
    go.textContent = tr('고른 것 복습') + ' (' + n + tr('단어') + ')';
    go.onclick = () => {
      SBOX = picked[0][4];
      const ws = picked.flatMap(u => u[2]).slice().sort(() => Math.random() - .5);   // 섞어서 고른 문제 수만큼 (앞 과만 나오지 않게)
      dive(() => pickUnits(kind));
      cardsThenQuiz(ws, title + ' ' + tr('카드'), { opt: { kind: 'word' } });
    };
    b.append(go);
  }
  show('exam', title + ' · ' + tr('선택 복습'), true);
}
/* 가장 마지막에 끝낸 세트 — 일차·회화 레슨·직무 레슨·GYBM 레슨 가운데 끝낸 시각이 가장 늦은 것 */

/* ── 베트남어 능력시험(VLPT) 모의고사 (2026-09-08 대표님 지시) ──
   VLPT(Vietnamese Language Proficiency Test)는 하노이 국립대(VNU-USSH)가 운영하는
   실제 공인 시험이다(CEFR A1~C2). 여기 문항은 그 형식을 따라 **우리가 직접 만든
   연습 문제**다 — 실제 기출문제가 아니다(사이트 exam 소개 문구와 같은 원칙).
   기존 퀴즈 엔진(startQuiz)은 단어 복습 전용이라 그대로 못 쓴다 — 여기는
   지문+객관식+정답풀이가 필요해서 #examBody 자리(다른 화면들과 공유)에 따로 그린다. */
let VLPT = null;
function vlptEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', 'VLPT(베트남 국립대 하노이대 주관 베트남어 능력시험) 형식을 따른 모의고사입니다.'));
  b.append(el('p', 'note', '문항은 우리가 직접 만든 연습 문제입니다 — 실제 기출 문제가 아닙니다.'));
  if (!VLPT) {
    b.append(el('p', 'note', '불러오는 중…'));
    fetch('data/vi_exams.json', { cache: 'no-cache' })
      .then(r => r.json()).then(j => { VLPT = j.exams; if (!$('#exam').hidden) vlptEntry(); })
      .catch(() => { b.append(el('p', 'note', '불러오지 못했습니다.')); });
    show('exam', '능력시험', true);
    return;
  }
  VLPT.forEach(ex => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, `[${ex.level}] ${ex.title}`));
    btn.append(el('span', 'exmeta', ex.sub + ' · ' + ex.questions.length + '문항'));
    const done = S.vlpt && S.vlpt[ex.id];
    if (done) btn.append(el('span', 'exmeta', `최근 점수 ${done.score}/${done.total}`));
    btn.onclick = () => vlptStart(ex);
    b.append(btn);
  });
  show('exam', '능력시험', true);
}
function vlptStart(ex) {
  let i = 0, ok = 0;
  const answers = [];
  const draw = () => {
    const b = $('#examBody');
    b.textContent = '';
    if (i >= ex.questions.length) { vlptResult(ex, ok, answers); return; }
    const q = ex.questions[i];
    b.append(el('p', 'note', `${ex.title} · ${i + 1}/${ex.questions.length}`));
    if (q.passage) b.append(el('div', 'vlptpassage', esc(q.passage)));
    b.append(el('p', 'vlptq', esc(q.q)));
    q.options.forEach((opt, oi) => {
      const ob = el('button', 'bigmenu');
      ob.append(el('span', null, opt));
      ob.onclick = () => {
        const correct = oi === q.answer;
        if (correct) ok++;
        answers.push({ q, picked: oi, correct });
        i++; draw();
      };
      b.append(ob);
    });
  };
  draw();
  show('exam', ex.title, true);
}
function vlptResult(ex, ok, answers) {
  const b = $('#examBody');
  b.textContent = '';
  S.vlpt = S.vlpt || {}; S.vlpt[ex.id] = { score: ok, total: ex.questions.length, at: now() }; save();
  b.append(el('p', 'lede', `${ok} / ${ex.questions.length} 점`));
  answers.forEach((a, idx) => {
    const card = el('div', 'vlptcard' + (a.correct ? ' ok' : ' no'));
    card.append(el('p', 'vlptq', `${idx + 1}. ` + esc(a.q.q)));
    card.append(el('p', 'note', (a.correct ? '✔ 정답: ' : '✘ 오답 — 정답: ') + a.q.options[a.q.answer]));
    card.append(el('p', 'note', a.q.explain));
    b.append(card);
  });
  const back = el('button', 'primary big', '목록으로');
  back.style.width = '100%'; back.style.marginTop = '10px';
  back.onclick = vlptEntry;
  b.append(back);
  show('exam', '결과', true);
}

const MENUS_KO = {          // 베트남 사람이 한국어를 배운다
  day:    { name: '날마다 배우기', items: () => [['보기', koDayEntry]] },
  exam:   { name: '모의고사', items: () => [['보기', examEntry]] },
  strat:  { name: '풀이 전략', items: () => [['보기', koStrategyEntry]] },
  basic2: { name: '기본기', items: () => [['보기', koBasicEntry]] },
  gram2:  { name: '기초 문법', items: () => [['보기', koGramEntry]] },
  culture:{ name: '한국 문화', items: () => [['보기', koCultureEntry]] },
  book:   { name: '단어장', items: () => [['보기', wordbookEntry]] },
};

/* '더 공부할 곳'을 뺐다 (2026-08-29, 사용자 지시).
   무료였을 때는 "우리 앱 + 공식 무료 자료"를 한 묶음으로 안내하는 것이 이점이었다.
   유료로 가면 그 논리가 사라진다 — 돈을 받으면서 남의 무료 자료로 보내는 꼴이다.
   지운 것이 아니라 접은 것이다. 되살리려면 git 이력에 그대로 있다. */

// drawMenu 등이 그대로 쓸 수 있도록, 고른 쪽을 MENUS 라는 이름으로 내놓는다
const MENUS = new Proxy({}, {
  get: (_, k) => (learnKo() ? MENUS_KO : MENUS_VI)[k],
  has: (_, k) => k in (learnKo() ? MENUS_KO : MENUS_VI),
  ownKeys: () => Reflect.ownKeys(learnKo() ? MENUS_KO : MENUS_VI),
  getOwnPropertyDescriptor: (_, k) => {
    const m = learnKo() ? MENUS_KO : MENUS_VI;
    return k in m ? { value: m[k], enumerable: true, configurable: true } : undefined;
  },
});
/* ---------- 모의고사 ----------
   연습 퀴즈와는 딴판으로 굴러야 한다. 연습은 한 문제 풀 때마다 맞았는지 알려주지만,
   시험은 끝날 때까지 안 알려준다 — 실제 시험장이 그렇고, 중간에 알려주면
   "내가 지금 몇 개 틀렸지" 하는 딴생각이 붙어 시험 연습이 안 된다.
   그래서 ① 채점은 제출한 뒤 한 번에 ② 시간은 계속 흐르고 ③ 아무 문항이나 오갈 수 있고
   ④ 안 푼 문항이 몇 개인지 늘 보인다. */
let EX = null;                      // {exam, at, marks[], t0, timer}
let EXDATA = null;                  // ko_exams.json (한 번만 받아 둔다)

/* 시험 이름·설명은 tr() 사전이 아니라 **데이터에** 두 나라 말이 다 있다
   (ko_exam_gen 이 name_vi·desc_vi 를 같이 낸다). 문항 수가 바뀌어도 어긋나지 않게
   생성기 쪽에 둔 것이다. 여기서는 화면 말에 맞춰 고르기만 한다. */
const exName = e => (S.ui === 'vi' && e.name_vi) ? e.name_vi : e.name;
const exDesc = e => (S.ui === 'vi' && e.desc_vi) ? e.desc_vi : e.desc;

function examEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', tr('실제 시험과 <b>같은 형식</b>으로 풀어 봅니다.') + '<br>'
    + tr('문항은 우리가 직접 만든 것입니다 — 기출 문제가 아닙니다.')));
  show('exam', '모의고사', true);
  if (EXDATA) return drawExamList();
  b.append(el('p', 'note', '시험지 받는 중…'));
  fetch('data/ko_exams.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(j => { EXDATA = j; drawExamList(); })
    .catch(() => {
      b.textContent = '';
      b.append(el('p', 'lede', '시험지를 받지 못했습니다. 인터넷을 확인하고 다시 열어 주세요.'));
    });
}

function examGroup(host, list) {
  host.append(el('h3', 'exhead', esc(exName(list[0]))));
  host.append(el('p', 'note', esc(exDesc(list[0]))));
  list.forEach(e => {
    const best = (S.exam || {})[e.id + '-' + e.set];
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, list.length > 1 ? tr('N회차').replace('N', e.set) : tr('풀어 보기')));
    btn.append(el('span', 'exmeta', `${e.total}${tr('문항')} · ${e.minutes}${tr('분')}`));
    if (best) {                    // 전에 본 적이 있으면 점수를 같이 보여준다
      const pct = Math.round(best.score / best.total * 100);
      btn.append(el('span', 'mbadge' + (pct >= 60 ? '' : ' red'), tr('N점').replace('N', pct)));
    }
    btn.onclick = () => startExam(e);
    host.append(btn);
  });
}

/* 다시 풀 문항이 밀려 있으면 목록 맨 위에 내놓는다.
   새 회차를 한 벌 더 푸는 것보다 **틀렸던 것을 다시 꺼내는 편**이 훨씬 남는다.
   그래서 자리도 맨 위다. 세 번 맞힐 때까지 사라지지 않는다. */
function drawRedoRow(host) {
  const due = qbankDue(EXDATA);
  if (!due.length) return;
  const bank = S.qbank || {};
  const total = Object.values(bank).filter(r => r.ok < QGOAL).length;
  const btn = el('button', 'bigmenu redo');
  btn.append(el('b', null, `${tr('다시 풀 문항')} ${due.length}`));
  btn.append(el('span', 'exmeta',
    tr('세 번 맞히면 쉽니다. 지금 창고에 N개.').replace('N', total)));
  btn.onclick = () => startExam({
    id: 'redo', set: 0, sub: true, name: tr('다시 풀 문항'),
    desc: '', minutes: Math.max(5, Math.ceil(due.length * 0.75)),
    total: due.length, full: 0, grades_at: null,
    questions: due.map(({ q }, i) => ({ ...q, no: i + 1 })),
  });
  host.append(btn);
}

function drawExamList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', tr('실제 시험과 <b>같은 형식</b>으로 풀어 봅니다.') + '<br>'
    + tr('문항은 우리가 직접 만든 것입니다 — 기출 문제가 아닙니다.')));
  drawRedoRow(b);
  // 시험이 서른 벌이 넘는다. 한 줄로 늘어놓으면 못 찾으니 목적별로 접어 둔다.
  const byId = {};
  EXDATA.exams.forEach(e => (byId[e.id] = byId[e.id] || []).push(e));
  const CATS = [
    ['🏭', '취업 (EPS)', '한국에서 일하려면 보는 시험입니다.',
      id => id === 'eps-topik' || id.startsWith('eps-job-')],
    ['🏛️', '체류·귀화 (KIIP)', '사회통합프로그램 사전평가와 단계평가입니다.',
      id => id.startsWith('kiip-')],
    ['🎓', '유학·자격 (TOPIK)', '한국어능력시험 형식 그대로입니다.',
      id => id.startsWith('topik-')],
  ];
  const shown = new Set();
  CATS.forEach(([icon, title, note, match]) => {
    const ids = Object.keys(byId).filter(match);
    if (!ids.length) return;
    ids.forEach(i => shown.add(i));
    const n = ids.reduce((s, i) => s + byId[i].length, 0);
    const wrap = el('details', 'excat');
    const sum = el('summary');
    sum.append(el('span', 'exicon', icon));
    sum.append(el('b', null, tr(title)));
    sum.append(el('span', 'exmeta', tr('N벌').replace('N', n)));
    wrap.append(sum);
    wrap.append(el('p', 'note', tr(note)));
    ids.forEach(id => examGroup(wrap, byId[id]));
    b.append(wrap);
  });
  Object.keys(byId).filter(i => !shown.has(i)).forEach(id => examGroup(b, byId[id]));
  // 말하기·쓰기는 정답이 하나가 아니라 시험지에 못 넣는다 — 따로 둔다
  b.append(el('h3', 'exhead', '말하기 · 쓰기'));
  b.append(el('p', 'note', 'KIIP 구술시험과 작문시험 형식 · AI가 읽고 고칠 점을 알려 줍니다.'));
  /* 시험 보고 온 사람이 "뭐가 나왔다"를 적는 자리.
     경쟁 앱이 커진 방식이 이것이다 — 다만 우리는 **문항 본문은 받지 않는다.**
     소재·유형·기억나는 단어만 받는다. 문항을 그대로 모으면 그건 남의 저작물을
     모으는 창구가 되고, 우리가 지켜 온 선을 우리 손으로 넘는 일이 된다. */
  b.append(el('h3', 'exhead', tr('시험 보고 오셨나요?')));
  b.append(el('p', 'note', '어떤 <b>소재</b>가 나왔는지 알려 주시면 다음 사람이 준비하기 쉬워집니다. <b>문제를 그대로 옮겨 적지는 마세요</b> — 소재와 단어만 받습니다.'));
  const sg = el('button', 'bigmenu');
  sg.append(el('b', null, tr('무엇이 나왔는지 알려 주기')));
  sg.append(el('span', 'exmeta', tr('1분 · 이름 안 받습니다')));
  sg.onclick = examSight;
  b.append(sg);

  const x = el('button', 'bigmenu');
  x.append(el('b', null, tr('말하기 · 쓰기 연습')));
  x.append(el('span', 'exmeta', tr('구술 N세트 · 작문 M제목')
    .replace('N', EXDATA.extra.speak.length).replace('M', EXDATA.extra.write.length)));
  x.onclick = examExtra;
  b.append(x);
}

/* ---------- 한국어 기초 문법 ----------
   시험 문제(모의고사)와 다르다 — 여기는 맞히는 게 아니라 배우는 자리다.
   그래서 채점도 타이머도 없고, 화살표로 앞뒤 문법을 자유롭게 오간다. */
let KGDATA = null, KG = null;

function koGramEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한국어 기초 문법 78개 — 초급1부터 중급2까지, 배우는 순서 그대로입니다.'));
  show('exam', '기초 문법', true);
  if (KGDATA) return drawGramList();
  fetch('data/ko_grammar.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KGDATA = j.items; drawGramList(); })
    .catch(() => b.append(el('p', 'lede', '문법 자료를 받지 못했습니다. 인터넷을 확인해 주세요.')));
}

function drawGramList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한국어 기초 문법 78개 — 초급1부터 중급2까지, 배우는 순서 그대로입니다.'));
  let lastLevel = null;
  KGDATA.forEach((g, i) => {
    if (g.level !== lastLevel) { lastLevel = g.level; b.append(el('h3', 'exhead', tr(g.level))); }
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, `${g.n}. ${g.pattern}`));
    btn.append(el('span', 'exmeta', g.title_ko));
    btn.onclick = () => drawGramCard(i);
    b.append(btn);
  });
}

function drawGramCard(i) {
  KG = i;
  const g = KGDATA[i];
  const b = $('#examBody');
  b.textContent = '';

  const head = el('div', 'exbar');
  head.append(el('span', 'expos', `${i + 1} / ${KGDATA.length}`));
  b.append(head);

  // 목표 문장(title_ko)과 그 뜻(title_vi)은 베트남어 화면에서도 늘 같이 보여야 한다 —
  // 배우는 대상이 한국어 자체이기 때문이다(베트남어 과정에서 vi+ko를 늘 같이 보여주는 것과 같다).
  // 하지만 '설명글'은 다르다 — 베트남 사람에게 한글 설명은 못 읽는 글자일 뿐이라,
  // vi 모드에서는 베트남어 설명만, dev 모드에서만 한글 설명을 같이 보여준다.
  const card = el('div', 'excard');
  card.append(el('div', 'gpat', g.pattern));
  // 목표 문장에도 소리를 붙인다 — 예문에만 있고 정작 제목 문장에는 없었다
  const tline = el('div', 'exask');
  tline.append(el('span', null, esc(g.title_ko)));
  const tsay = el('button', 'iconbtn', '🔊');
  tsay.onclick = () => speakKo(g.title_ko);
  tline.append(tsay);
  card.append(tline);
  card.append(el('div', 'exbody', esc(g.title_vi)));
  if (S.ui !== 'vi') card.append(el('div', 'gexp', esc(g.explain_ko)));
  card.append(el('div', 'gexp vi', esc(g.explain_vi)));

  g.examples.forEach(ex => {
    const row = el('div', 'gex');
    const line = el('div', 'gexko');
    line.append(el('span', null, esc(ex.ko)));
    const p = el('button', 'iconbtn', '🔊');
    p.onclick = () => speakKo(ex.ko);
    line.append(p);
    row.append(line, el('div', 'gexvi', esc(ex.vi)));
    card.append(row);
  });
  b.append(card);

  /* '‹ 이전 / 다음 ›' 단추를 뺐다 (대표님 지시) — **밀어서 넘긴다.**
     맨 끝 장에서만 '목록으로'를 남긴다. 안 그러면 나갈 길이 없다. */
  swipeNav(b, () => i > 0 && drawGramCard(i - 1), () => i < KGDATA.length - 1 && drawGramCard(i + 1));
  if (i === KGDATA.length - 1) {
    const nav = el('div', 'exnav');
    const done = el('button', 'primary big', tr('목록으로'));
    done.onclick = drawGramList;
    nav.append(done);
    b.append(nav);
  }
  show('exam', '기초 문법', true);
}

/* ---------- 한글 기본기 ----------
   모음·자음·받침·숫자 같은 표(table) 형태 자료 — 문법 카드와 뼈대는 같지만
   examples(문장 쌍) 대신 table(글자·읽기·설명 세 칸) 행을 그린다. */
let KBDATA = null, KB = null;

function koBasicEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한글 기본기 — 모음·자음부터 숫자·인사말까지.'));
  show('exam', '기본기', true);
  if (KBDATA) return drawBasicList();
  fetch('data/ko_basics.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KBDATA = j.items; drawBasicList(); })
    .catch(() => b.append(el('p', 'lede', '자료를 받지 못했습니다. 인터넷을 확인해 주세요.')));
}

function drawBasicList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한글 기본기 — 모음·자음부터 숫자·인사말까지.'));
  KBDATA.forEach((it, i) => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, `${it.n}. ${it.title_ko}`));
    btn.append(el('span', 'exmeta', it.title_vi));
    btn.onclick = () => drawBasicCard(i);
    b.append(btn);
  });
}

function drawBasicCard(i) {
  KB = i;
  const it = KBDATA[i];
  const b = $('#examBody');
  b.textContent = '';

  const head = el('div', 'exbar');
  head.append(el('span', 'expos', `${i + 1} / ${KBDATA.length}`));
  b.append(head);

  const card = el('div', 'excard');
  card.append(el('div', 'exask', esc(it.title_ko)));
  card.append(el('div', 'exbody', esc(it.title_vi)));
  if (S.ui !== 'vi') card.append(el('div', 'gexp', esc(it.explain_ko)));
  card.append(el('div', 'gexp vi', esc(it.explain_vi)));

  it.table.forEach(row => {
    const r = el('div', 'gex');
    const line = el('div', 'gexko');
    line.append(el('span', null, esc(row.ko)));
    line.append(el('span', 'exmeta', esc(row.read)));
    /* 소리 — 'ㅏ'·'ㄱ' 같은 홀자모는 그대로는 못 읽으니 say('아'·'가')를 대신 읽는다.
       전에는 이 표에 소리 단추가 아예 없었다 — 발음을 배우는 자리인데 소리가 없었다. */
    const say = row.say || row.ko;
    if (KOIDX === null || KOIDX[say]) {
      const p = el('button', 'iconbtn', '🔊');
      p.onclick = () => speakKo(say);
      line.append(p);
    }
    r.append(line, el('div', 'gexvi', esc(row.vi)));
    card.append(r);
  });
  b.append(card);

  /* '‹ 이전 / 다음 ›' 단추를 뺐다 (대표님 지시) — **밀어서 넘긴다.**
     맨 끝 장에서만 '목록으로'를 남긴다. 안 그러면 나갈 길이 없다. */
  swipeNav(b, () => i > 0 && drawBasicCard(i - 1), () => i < KBDATA.length - 1 && drawBasicCard(i + 1));
  if (i === KBDATA.length - 1) {
    const nav = el('div', 'exnav');
    const done = el('button', 'primary big', tr('목록으로'));
    done.onclick = drawBasicList;
    nav.append(done);
    b.append(nav);
  }
  show('exam', '기본기', true);
}

/* ---------- 한국 문화 ----------
   기본기와 뼈대가 완전히 같다(제목·설명·표). 특정 교재를 안 보고
   공휴일 날짜·신고 전화번호 같은 공공 상식만 적었다 — tools/ko_culture.py 참고. */
let KCDATA = null, KC = null;

/* ── 풀이 전략 ───────────────────────────────────────────────────
   토익에는 '몇 초에 무엇을, 어디를 먼저 보고, 어느 유형을 뒤로 미루는지'가 촘촘히
   정리돼 있는데 EPS 에는 그게 없다. 조사해 보니 한국어로 된 EPS 풀이 전략 강의가
   **아예 없고**(시판 교재 4권 전부 품절, 공단 E-Class 는 회화 강의), 베트남어로
   유형별 전략을 세운 곳도 없었다. 그 빈자리를 여기서 채운다.

   **모의고사에는 이 내용을 절대 띄우지 않는다**(사용자 지시). 실제 시험에 없는
   도움말을 켜 놓고 연습하면 실전과 다른 환경에서 훈련하는 것이라서다.

   차시마다 need(권장 선행 단어 수)가 있다 — Paton(2018)에서 왕초보에게 전략부터
   가르쳤더니 오히려 점수가 떨어졌다(인지 과부하). 그래서 아직 이르면 말린다.
   막지는 않는다. 말리되 본인이 원하면 연다. */
let KSDATA = null;
// **로 감싼 곳을 굵게. esc() 를 먼저 걸어야 남의 태그가 안 들어온다.
const stBold = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

function koStrategyEntry() {
  const b = $('#examBody');
  b.textContent = '';
  show('exam', '풀이 전략', true);
  if (KSDATA) return drawStratList();
  fetch('data/ko_strategy.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KSDATA = j.items; drawStratList(); })
    .catch(() => b.append(el('p', 'lede', tr('자료를 받지 못했습니다. 인터넷을 확인해 주세요.'))));
}

// 내가 아는 단어 수 — 전략을 열 때가 됐는지 재는 잣대
const kWordsKnown = () => Object.keys(S.kbank || {}).length;

function drawStratList() {
  const b = $('#examBody');
  b.textContent = '';
  const vi = S.ui === 'vi';
  b.append(el('p', 'lede', esc(vi
    ? 'Mẹo làm bài EPS-TOPIK. Đây là chỗ học cách làm — trong bài thi thử sẽ không hiện gì cả, giống hệt phòng thi.'
    : 'EPS-TOPIK 을 어떻게 푸는가. 요령은 여기서 배웁니다 — 모의고사에는 아무것도 뜨지 않습니다. 실제 시험과 같게.')));
  const known = kWordsKnown();
  KSDATA.forEach((it, i) => {
    const btn = el('button', 'bigmenu');
    const early = it.need && known < it.need;
    btn.append(el('b', null, `${it.n}. ${esc(vi ? it.vi : it.ko)}`));
    btn.append(el('span', 'exmeta', esc(vi ? it.ko : it.vi)));
    if (early) btn.append(el('span', 'exmeta', esc(tr('단어 N개쯤 외운 뒤에 보면 더 잘 듣습니다')
      .replace('N', it.need))));
    btn.onclick = () => drawStratCard(i);
    b.append(btn);
  });
}

function drawStratCard(i) {
  const it = KSDATA[i];
  const b = $('#examBody');
  b.textContent = '';
  const vi = S.ui === 'vi';

  const head = el('div', 'exbar');
  head.append(el('span', 'expart', esc(it.tag)));
  head.append(el('span', 'expos', `${i + 1} / ${KSDATA.length}`));
  b.append(head);

  const card = el('div', 'excard');
  card.append(el('div', 'exask', esc(vi ? it.vi : it.ko)));
  card.append(el('div', 'exbody', esc(vi ? it.ko : it.vi)));
  b.append(card);

  // 왜 — 근거를 먼저 준다. 까닭을 모르면 요령은 미신이 된다.
  const why = el('div', 'excard');
  why.append(el('h3', 'exhead', tr('왜')));
  if (!vi) why.append(el('div', 'gexp', esc(it.why_ko)));
  why.append(el('div', 'gexp vi', esc(it.why_vi)));
  b.append(why);

  // 어떻게 — 손이 따라 할 수 있는 순서
  const how = el('div', 'excard');
  how.append(el('h3', 'exhead', tr('어떻게')));
  (vi ? it.how_vi : it.how_ko).forEach((s, k) => {
    const r = el('div', 'gex');
    const line = el('div', 'gexko');
    line.append(el('b', null, String(k + 1) + '.'));
    line.append(el('span', null, stBold(s)));
    r.append(line);
    if (!vi && it.how_vi[k]) r.append(el('div', 'gexvi', stBold(it.how_vi[k])));
    how.append(r);
  });
  b.append(how);

  const doo = el('div', 'excard');
  doo.append(el('h3', 'exhead', tr('오늘 해볼 것')));
  if (!vi) doo.append(el('div', 'gexp', esc(it.do_ko)));
  doo.append(el('div', 'gexp vi', esc(it.do_vi)));
  b.append(doo);

  const nav = el('div', 'exnav');
  const prev = el('button', 'ghost big', '‹ ' + tr('이전'));
  prev.disabled = i === 0; prev.onclick = () => drawStratCard(i - 1);
  const next = el('button', 'primary big', i === KSDATA.length - 1
    ? tr('목록으로') : tr('다음') + ' ›');
  next.onclick = () => (i === KSDATA.length - 1 ? drawStratList() : drawStratCard(i + 1));
  nav.append(prev, next);
  b.append(nav);
  show('exam', (vi ? it.vi : it.ko), true);
}

function koCultureEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한국 생활 문화 — 직장 예절부터 위급 상황까지.'));
  show('exam', '한국 문화', true);
  if (KCDATA) return drawCultureList();
  fetch('data/ko_culture.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KCDATA = j.items; drawCultureList(); })
    .catch(() => b.append(el('p', 'lede', '자료를 받지 못했습니다. 인터넷을 확인해 주세요.')));
}

function drawCultureList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한국 생활 문화 — 직장 예절부터 위급 상황까지.'));
  KCDATA.forEach((it, i) => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, `${it.n}. ${it.title_ko}`));
    btn.append(el('span', 'exmeta', it.title_vi));
    btn.onclick = () => drawCultureCard(i);
    b.append(btn);
  });
}

function drawCultureCard(i) {
  KC = i;
  const it = KCDATA[i];
  const b = $('#examBody');
  b.textContent = '';

  const head = el('div', 'exbar');
  head.append(el('span', 'expos', `${i + 1} / ${KCDATA.length}`));
  b.append(head);

  const card = el('div', 'excard');
  card.append(el('div', 'exask', esc(it.title_ko)));
  card.append(el('div', 'exbody', esc(it.title_vi)));
  if (S.ui !== 'vi') card.append(el('div', 'gexp', esc(it.explain_ko)));
  card.append(el('div', 'gexp vi', esc(it.explain_vi)));

  it.table.forEach(row => {
    const r = el('div', 'gex');
    const line = el('div', 'gexko');
    line.append(el('span', null, esc(row.ko)));
    line.append(el('span', 'exmeta', esc(row.read)));
    /* 소리 — 'ㅏ'·'ㄱ' 같은 홀자모는 그대로는 못 읽으니 say('아'·'가')를 대신 읽는다.
       전에는 이 표에 소리 단추가 아예 없었다 — 발음을 배우는 자리인데 소리가 없었다. */
    const say = row.say || row.ko;
    if (KOIDX === null || KOIDX[say]) {
      const p = el('button', 'iconbtn', '🔊');
      p.onclick = () => speakKo(say);
      line.append(p);
    }
    r.append(line, el('div', 'gexvi', esc(row.vi)));
    card.append(r);
  });
  b.append(card);

  /* '‹ 이전 / 다음 ›' 단추를 뺐다 (대표님 지시) — **밀어서 넘긴다.**
     맨 끝 장에서만 '목록으로'를 남긴다. 안 그러면 나갈 길이 없다. */
  swipeNav(b, () => i > 0 && drawCultureCard(i - 1), () => i < KCDATA.length - 1 && drawCultureCard(i + 1));
  if (i === KCDATA.length - 1) {
    const nav = el('div', 'exnav');
    const done = el('button', 'primary big', tr('목록으로'));
    done.onclick = drawCultureList;
    nav.append(done);
    b.append(nav);
  }
  show('exam', '한국 문화', true);
}

/* ---------- 날마다 배우기 ----------
   78일: 초급1~중급2. 그날의 문법(ko_grammar.json, 문법 '이름'으로 연결)·단어·대화·
   미션을 한 화면에 묶는다. 단어·대화는 문법 카드와 같은 행 모양(gex)을 그대로 쓴다 —
   문법 카드에서 이미 검증된 모양이라 새 스타일을 안 만들어도 된다. */
let KDDATA = null, KD = null;

function koDayEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '날마다 배우기 — 초급1부터 중급2까지 78일. 하루에 문법 하나, 단어 열 개, 대화 한 편입니다.'));
  show('exam', '날마다 배우기', true);
  if (KDDATA) return drawDayList();
  fetch('data/ko_days.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KDDATA = j.days; drawDayList(); })
    .catch(() => b.append(el('p', 'lede', '자료를 받지 못했습니다. 인터넷을 확인해 주세요.')));
}

function drawDayList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', tr('날마다 배우기 — 초급1부터 중급2까지 78일. 하루에 문법 하나, 단어 열 개, 대화 한 편입니다.')));

  /* 오늘 다시 꺼낼 단어 — **맨 위에** 둔다.
     새 날을 하나 더 배우는 것보다 지난 단어을 다시 꺼내는 편이 남는다(d=4.03).
     여기 없으면 복습이 저절로 돌아오지 않는다 — 사람이 스스로 옛 날을 찾아
     들어가야 하는데, 아무도 그러지 않는다. */
  const due = kdue();
  if (due.length) {
    const r = el('button', 'bigmenu redo');
    r.append(el('b', null, '🔁 ' + tr('다시 꺼낼 단어 N개').replace('N', due.length)));
    r.append(el('span', 'exmeta', tr('세 번 맞히면 쉽니다. 틀리면 되돌아옵니다.')));
    r.onclick = () => {
      const ws = due.slice(0, 12).map(x => x.w);
      startExam(koDayQuiz({ day: tr('복습'), words: ws }, ws));
    };
    b.append(r);
  }

  KDDATA.forEach((d, i) => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, `Day ${d.day}. ${d.theme.ko}`));
    btn.append(el('span', 'exmeta', d.theme.vi));
    btn.onclick = () => drawDayCard(i);
    b.append(btn);
  });
}

/* w 를 주면 그림(또는 이모지)을 왼쪽에 붙인다. 대화 줄은 w 없이 부르므로
   예전 모양 그대로 남는다 — 대화에 그림을 붙이면 줄마다 그림이 달려 어지럽다. */
function dayWordRow(host, ko, vi, prefix, star, w) {
  const row = el('div', 'gex');
  const line = el('div', 'gexko');
  if (prefix) line.append(el('b', null, prefix));
  line.append(el('span', null, esc(ko)));
  const p = el('button', 'iconbtn', '🔊');
  p.onclick = () => speakKo(ko);
  line.append(p);
  if (star) line.append(starBtn(ko, ko, vi));   // 단어만 담는다(대화 줄은 담지 않는다)
  const txt = el('div', 'gextxt');
  txt.append(line, el('div', 'gexvi', esc(vi)));
  const im = w && pic(w, 'gexpic');
  if (im) { const wrap = el('div', 'gexwrap'); wrap.append(im, txt); row.append(wrap); }
  else row.append(txt);
  host.append(row);
}

/* ── 한국어 과정 · 하루 확인 문제 ──────────────────────────────────
   이 과정에는 **꺼내기가 아예 없었다.** 단어을 읽고, 대화를 읽고, 미션을 읽고
   다음 날로 넘어갈 뿐이었다. 우리가 모아 둔 근거가 한목소리로 말하는 것이
   "다시 읽기는 공부가 아니다"인데, 정작 주 과정이 읽기만 시키고 있었다.

   시험 엔진을 그대로 쓴다 — 보기·그림·소리·채점·해설이 이미 다 되어 있다.
   따로 만들면 같은 것을 두 벌 갖게 된다.

   묻는 방식 셋을 돌려 가며 쓴다. 알아보기(한국어→뜻)만 시키면 시험장에서
   막힌다 — 골라내는 것과 떠올리는 것은 다른 힘이다.
     ① 한국어 → 뜻 (그림과 함께)   ② 뜻 → 한국어   ③ 소리 → 한국어
   오답은 **같은 날 단어에서** 뽑는다. 엉뚱한 날에서 뽑으면 뜻만 슬쩍 봐도 티가 난다. */
const KSTEPS = [0, 1, 3, 7];        // 맞힌 횟수별 다음까지 일수 — 시험 창고와 같은 결
const KGOAL = 3;

function kmark(ko, ok) {
  S.kbank = S.kbank || {};
  const r = S.kbank[ko] || { ok: 0 };
  r.ok = ok ? Math.min(KGOAL, r.ok + 1) : Math.max(0, r.ok - 2);
  r.due = now() + KSTEPS[Math.min(r.ok, KSTEPS.length - 1)] * DAY;
  S.kbank[ko] = r; save();
}
const kdue = () => {
  const b = S.kbank || {};
  return (KDDATA || []).flatMap(d => (d.words || []).map(w => ({ w, d })))
    .filter(x => { const r = b[x.w.ko]; return r && r.ok < KGOAL && (r.due || 0) <= now(); });
};

function koDayQuiz(d, words) {
  const pool = words || d.words;
  const others = w => (d.words.filter(x => x.ko !== w.ko))
    .sort(() => Math.random() - .5).slice(0, 3);
  const qs = pool.map((w, i) => {
    const o = others(w);
    const kind = i % 3;
    if (kind === 0) {
      const opts = [w, ...o].sort(() => Math.random() - .5);
      return { type: 'kday_meaning', stem: w.ko, img: w.img,
               options: opts.map(x => x.vi), answer: opts.indexOf(w),
               exp: opts.map(x => x.ko + ' = ' + x.vi), word: w.ko };
    }
    if (kind === 1) {
      const opts = [w, ...o].sort(() => Math.random() - .5);
      return { type: 'kday_word', stem: w.vi,
               options: opts.map(x => x.ko), answer: opts.indexOf(w),
               exp: opts.map(x => x.ko + ' = ' + x.vi), word: w.ko };
    }
    const opts = [w, ...o].sort(() => Math.random() - .5);
    return { type: 'kday_listen', stem: tr('잘 듣고 알맞은 것을 고르십시오.'),
             audio: [{ v: S.voice === 'm' ? 'm' : 'f', t: w.ko }],
             options: opts.map(x => x.ko), answer: opts.indexOf(w),
             exp: opts.map(x => x.ko + ' = ' + x.vi), word: w.ko };
  }).sort(() => Math.random() - .5);
  qs.forEach((q, i) => { q.no = i + 1; q.section = ''; });
  return { id: 'kday-' + d.day, set: 1, day: true, sub: true, plays: 0,
           name: `Day ${d.day} ` + tr('확인'), name_vi: `Day ${d.day} — Kiểm tra`,
           desc: '', desc_vi: '', minutes: Math.max(4, qs.length),
           total: qs.length, questions: qs };
}

function drawDayCard(i) {
  KD = i;
  const d = KDDATA[i];
  S.kday = d.day; touchToday(); save();
  const b = $('#examBody');
  b.textContent = '';

  const head = el('div', 'exbar');
  head.append(el('span', 'expos', `Day ${d.day} / ${KDDATA.length}`));
  b.append(head);

  const top = el('div', 'excard');
  // 표지 — 그 과가 무엇에 대한 것인지 한 장으로. 글은 이미 그림 안에 박혀 있다.
  if (d.cover) {
    const cv = el('img', 'kcover');
    cv.src = 'img/' + d.cover; cv.alt = d.theme.ko; cv.loading = 'lazy';
    top.append(cv);
  }
  top.append(el('div', 'exask', esc(d.theme.ko)));
  top.append(el('div', 'exbody', esc(d.theme.vi)));
  const findG = list => list.findIndex(g => g.pattern === d.grammar);   // 번호 아닌 이름으로 찾는다
  const gi = KGDATA ? findG(KGDATA) : -1;
  const gbtn = el('button', 'ghost', tr('오늘의 문법 보기'));
  gbtn.onclick = () => {
    if (gi >= 0) return drawGramCard(gi);
    fetch('data/ko_grammar.json', { cache: 'no-cache' }).then(r => r.json())
      .then(j => { KGDATA = j.items; drawGramCard(findG(KGDATA)); });
  };
  top.append(gbtn);
  b.append(top);

  const wcard = el('div', 'excard');
  wcard.append(el('h3', 'exhead', tr('오늘의 단어')));
  d.words.forEach(w => dayWordRow(wcard, w.ko, w.vi, null, true, w));
  b.append(wcard);

  // 대화·미션은 단어책(회화책) 과정처럼 없는 날도 있다 — 있을 때만 그린다.
  if (d.dialog) {
    const dcard = el('div', 'excard');
    // 대화 제목은 한국어로만 나오던 자리다 — 베트남 분에겐 뜻 모를 글자였다.
    // 주제와 같은 꼴로 두 말을 나란히 둔다(한국어를 배우러 왔으니 한국어도 남긴다).
    dcard.append(el('h3', 'exhead', esc(d.dialog.title)
      + (d.dialog.title_vi ? '<span class="exmeta">' + esc(d.dialog.title_vi) + '</span>' : '')));
    d.dialog.lines.forEach(l => dayWordRow(dcard, l.ko, l.vi, l.who + '. '));
    b.append(dcard);
  }

  if (d.mission) {
    const mcard = el('div', 'excard');
    mcard.append(el('h3', 'exhead', tr('오늘의 미션')));
    if (S.ui !== 'vi') mcard.append(el('div', 'gexp', esc(d.mission.ko)));
    mcard.append(el('div', 'gexp vi', esc(d.mission.vi)));
    b.append(mcard);
  }

  /* '‹ 이전 / 다음 ›' 을 뺐다 (대표님 지시) — **밀어서 넘긴다.** */
  const qz = el('button', 'primary big', '✍️ ' + tr('오늘 확인 문제'));
  qz.style.width = '100%'; qz.style.marginTop = '6px';
  qz.onclick = () => startExam(koDayQuiz(d));
  b.append(qz);

  swipeNav(b, () => i > 0 && drawDayCard(i - 1), () => i < KDDATA.length - 1 && drawDayCard(i + 1));
  const nav = el('div', 'exnav');
  if (i === KDDATA.length - 1) {
    const done = el('button', 'ghost big', tr('목록으로'));
    done.onclick = drawDayList;
    nav.append(done);
  }
  b.append(nav);
  show('exam', `Day ${d.day}`, true);
}

function startExam(e) {
  /* 답이 잠기는 시험은 **시작 전에** 알린다. 실제 시험도 시작 전 안내 화면에서
     알려 주고 들어간다 — 문항을 만난 뒤에 알면 그건 함정이지 연습이 아니다. */
  if (e.lock && !confirm(tr(
      '이 시험은 실제 시험과 같이 한 번 고른 답을 바꿀 수 없습니다.\n\n'
      + '고용허가제 한국어능력시험(EPS-TOPIK) 공식 프로그램이 그렇게 동작합니다.\n'
      + '시작할까요?'))) return;
  /* CBT 흉내 — 공식 체험 프로그램의 타이머 코드를 읽어 확인한 규칙 그대로.
     읽기·듣기 시계가 **따로** 돌고, 읽기 시계가 0이 되면 듣기로 **강제 이동**하며,
     듣기에 들어가면 **되돌아갈 수 없다**. 읽기에 남긴 시간은 이월되지 않는다.
     그래서 안 푼 읽기 문항을 남기고 넘어가면 그대로 잃는다 — 이게 이 시험의 급소다. */
  const cbt = e.cbt && !e.sub ? e.cbt : null;
  if (cbt && !confirm(tr(
      '실제 시험처럼 읽기와 듣기의 시간이 따로 갑니다.\n\n'
      + '· 읽기 25분이 끝나면 자동으로 듣기로 넘어갑니다\n'
      + '· 듣기에 들어가면 읽기로 돌아갈 수 없습니다\n'
      + '· 읽기에 남은 시간은 듣기로 넘어가지 않습니다\n\n'
      + '안 푼 읽기 문항은 그대로 0점이 됩니다. 시작할까요?'))) return;
  EX = { exam: e, at: 0, marks: new Array(e.questions.length).fill(-1),
         left: cbt ? cbt.read * 60 : e.minutes * 60,
         cbt, part: cbt ? 'read' : null };
  if (EX.timer) clearInterval(EX.timer);
  EX.timer = setInterval(() => {
    if ($('#exam').hidden || !EX) return;      // 다른 화면에 가 있으면 시계도 멈춘다
    EX.left--;
    if (EX.left <= 0) {
      // 읽기 시간이 끝났다 — 실제 프로그램처럼 듣기 첫 문항으로 끌고 간다
      if (EX.cbt && EX.part === 'read') { enterListening(true); return; }
      finishExam(true); return;
    }
    const t = $('#extime');
    if (t) { t.textContent = fmtLeft(EX.left); t.className = 'extime' + (EX.left <= 60 ? ' hot' : ''); }
  }, 1000);
  drawExamQ();
}

/* 읽기 → 듣기. 한 번 넘어가면 끝이다. 남은 읽기 시간은 버린다(실제와 같게). */
function enterListening(auto) {
  const blank = EX.marks.slice(0, EX.cbt.split).filter(m => !answered(m)).length;
  if (!auto && !confirm(tr(
      blank ? '읽기에 안 푼 문항이 N개 있습니다.\n듣기로 넘어가면 다시 돌아올 수 없고 그대로 0점이 됩니다.\n넘어갈까요?'
            : '듣기로 넘어가면 읽기로 다시 돌아올 수 없습니다.\n넘어갈까요?').replace('N', blank))) return;
  EX.part = 'listen';
  EX.left = EX.cbt.listen * 60;                  // 남은 읽기 시간은 이월하지 않는다
  EX.at = EX.cbt.split;
  if (auto) alert(tr('읽기 시간이 끝났습니다. 듣기를 시작합니다.'));
  drawExamQ();
}

const fmtLeft = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* 답을 골랐는가 / 맞았는가 — 객관식은 번호, 단답형(KIIP)은 써 넣은 글이라 함께 못 센다.
   단답형 채점은 띄어쓰기와 문장부호를 지우고 견준다. 사람이 '근로 계약서'라고 써도
   '근로계약서'와 같게 본다 — 맞춤법 시험이 아니라 단어을 아는지 보는 것이라서. */
/* ── 문항 되풀이 창고 ─────────────────────────────────────────────
   틀린 문항은 **은퇴하지 않는다.** 한 번 맞혔다고 빼면 안 된다 —
   '한 번 도달'과 '기억에 남음'은 다른 일이다(인출 연습). 간격을 두고
   **세 번** 맞힐 때까지 다시 낸다. 틀리면 횟수가 뒤로 두 칸 물러난다.

   단어 창고(S.srs)와 따로 두는 까닭: 단어은 뜻 하나를 아는 것이고,
   문항은 '그 형식으로 물었을 때 답할 수 있는가'라서 잊는 속도가 다르다. */
const QSTEPS = [0, 1, 3, 7];        // 맞힌 횟수별 다음 출제까지 일수 (3번 맞히면 7일 뒤)
const QGOAL = 3;                    // 세 번 맞히면 창고에서 쉰다 — 지우지는 않는다
/* 문항 이름표 — 시험지를 다시 찍어도 같은 문항이면 같아야 한다.
   번호(1번·2번)로 잡으면 문항 순서가 바뀔 때 전부 어긋난다. 그래서 내용으로 잡는다. */
const qkey = q => [q.type, (q.stem || '').slice(0, 70), q.img || '', q.word || ''].join('|');

function qbankMark(q, ok, e) {
  const bank = S.qbank || (S.qbank = {});
  const k = qkey(q);
  const r = bank[k] || { ok: 0, seen: 0, e: e.id, s: e.set };
  r.seen++;
  r.ok = ok ? r.ok + 1 : Math.max(0, r.ok - 2);   // 틀리면 두 칸 물러난다
  // '다시 풀 문항' 묶음에서 풀었을 때는 출처를 덮어쓰지 않는다 — 원래 시험이 어디였는지 잃는다
  if (e.id !== 'redo') { r.e = e.id; r.s = e.set; }
  r.due = now() + QSTEPS[Math.min(r.ok, QSTEPS.length - 1)] * DAY;
  bank[k] = r;
}

/* 지금 다시 내야 할 문항 수 — 아직 세 번을 못 맞혔고 때가 된 것 */
function qbankDue(exdata) {
  const bank = S.qbank || {};
  const out = [], taken = {};
  (exdata ? exdata.exams : []).forEach(e => {
    e.questions.forEach(q => {
      const k = qkey(q);
      // 같은 문항이 여러 시험지에 들어 있다(회차끼리 겹치는 유형). 창고에서는 하나다 —
      // 안 거르면 창고 10개가 '낼 것 15개'로 부풀어 보인다.
      if (taken[k]) return;
      const r = bank[k];
      if (r && r.ok < QGOAL && (r.due || 0) <= now()) { taken[k] = 1; out.push({ q, e }); }
    });
  });
  return out;
}

const answered = m => typeof m === 'string' ? m.trim() !== '' : m >= 0;
const normShort = s => String(s == null ? '' : s).replace(/[\s.,!?·'"]/g, '').toLowerCase();
const isRight = (q, m) => q.short ? (answered(m) && normShort(m) === normShort(q.answerText))
                                  : m === q.answer;

function drawExamQ() {
  if (!EX) return;
  const e = EX.exam, q = e.questions[EX.at];
  const b = $('#examBody');
  b.textContent = '';

  // 머리줄 — 남은 시간과 진행 상황
  const head = el('div', 'exbar');
  if (EX.cbt) {
    // 실제 화면처럼 지금이 읽기인지 듣기인지 늘 보인다
    const r = EX.part === 'read';
    const a = r ? 0 : EX.cbt.split, z = r ? EX.cbt.split : e.questions.length;
    head.append(el('span', 'expart', tr(r ? '읽기' : '듣기')));
    head.append(el('span', 'expos', `${EX.at + 1 - a} / ${z - a}`));
  } else head.append(el('span', 'expos', `${EX.at + 1} / ${e.questions.length}`));
  const t = el('span', 'extime' + (EX.left <= 60 ? ' hot' : ''));
  t.id = 'extime'; t.textContent = fmtLeft(EX.left);
  head.append(t);
  b.append(head);

  b.append(el('p', 'exsec', esc(q.section)));

  const card = el('div', 'excard');

  // 읽기 지문은 물음보다 **먼저** 와야 한다 — 실제 시험지가 그렇고, 물음부터 보면 지문을 훑게 된다
  if (q.passage) {
    const pw = el('div', 'expass');
    if (q.ptitle) pw.append(el('div', 'exptit', esc(q.ptitle)));
    q.passage.split('\n').forEach(line => pw.append(el('div', null, esc(line))));
    card.append(pw);
  }

  /* 구간 이름과 물음이 똑같은 유형이 있다(듣기의 고정 발문). 두 번 적으면
     화면만 길어지고 읽는 사람은 같은 줄을 두 번 읽는다 — 겹치면 한 번만 적는다. */
  const lines = q.stem.split('\n');
  const flat = x => String(x || '').replace(/\s|\[|\]|[0-9~]/g, '');
  if (!flat(q.section).includes(flat(lines[0]))) {
    card.append(el('div', 'exask', esc(lines[0])));
  }
  if (lines[1]) card.append(el('div', 'exbody', esc(lines[1])));

  /* 듣기 — 실제 시험은 **정해진 횟수만** 들려준다.
     TOPIK I 은 두 번이다(102회 1번 음원의 말한 시간 4.2초 ÷ '우산이 있어요?' 7자 →
     한 번이면 1.67 글자/초로 실측 속도의 절반이라 말이 안 되고, 두 번이면 3.33 으로
     실측과 맞는다). TOPIK II 는 한 번이다.
     몇 번이든 듣게 두면 열 번 들어 맞히므로 듣기 연습이 되지 않는다.
     다만 **오답 다시 풀기(sub)** 에서는 막지 않는다 — 거기서는 틀린 이유를 짚어야 한다. */
  if (q.audio && q.audio.length) {
    const at0 = EX.at;                               // 늦게 도착한 재생이 남의 문항을 덮지 않게
    const cap = e.sub ? 0 : (e.plays || 0);          // 0 = 제한 없음
    EX.plays = EX.plays || {};
    const used = () => EX.plays[EX.at] || 0;
    const pb = el('button', 'explay');
    const left = el('p', 'note');
    const paint = () => {
      const over = cap && used() >= cap;
      pb.disabled = !!over && !EX.playing;
      pb.textContent = EX.playing ? '⏸ ' + tr('멈추기')
        : '▶ ' + tr(over ? '다 들었습니다' : '듣기');
      left.textContent = !cap ? tr('소리로만 나옵니다 — 몇 번이든 다시 들을 수 있습니다.')
        : over ? tr('실제 시험처럼 정해진 횟수만 들려줍니다.')
        : tr('N번 더 들을 수 있습니다.').replace('N', cap - used());
    };
    const run = () => {
      if (cap && used() >= cap) return;
      EX.plays[EX.at] = used() + 1;
      EX.playing = true; paint();
      playKoSeq(q.audio, () => { EX.playing = false; paint(); });
    };
    pb.onclick = () => {
      if (EX.playing) { audio.pause(); audio.onended = null; EX.playing = false; paint(); return; }
      run();
    };
    paint();
    card.append(pb, left);
    /* CBT 듣기는 **자동 진행**이다 — 문항이 뜨면 바로 소리가 나고, 내가 누를 것이 없다.
       공식 체험 프로그램이 그렇게 돈다(듣기 문항 표시와 동시에 재생, 이동 단추 없음).
       그래서 여기서는 재생 단추를 숨기고 스스로 튼다. 실제 시험에서 "준비되면 누르지"
       하다가 시간을 흘리는 사람이 없도록, 손이 그 리듬에 익어야 한다. */
    if (EX.cbt && EX.part === 'listen' && !used()) {
      pb.hidden = true;
      left.textContent = tr('실제 시험처럼 자동으로 나옵니다. 두 번 들려줍니다.');
      setTimeout(() => { if (EX && EX.at === at0) run(); }, 700);
    }
  }

  if (q.img) {
    const im = new Image();
    im.className = 'expic'; im.alt = ''; im.src = 'img/' + q.img;
    card.append(im);
  }

  const CIRC = '①②③④';
  // 단답형(KIIP 사전평가 49·50번) — 보기가 없다. 직접 써 넣는다.
  if (q.short) {
    const inp = el('input', 'exshort');
    inp.type = 'text'; inp.autocomplete = 'off'; inp.placeholder = tr('여기에 쓰십시오');
    inp.value = typeof EX.marks[EX.at] === 'string' ? EX.marks[EX.at] : '';
    // 글자마다 다시 그리면 글쇠가 튄다 — 값만 담아 둔다
    inp.oninput = () => { EX.marks[EX.at] = inp.value; };
    card.append(inp);
    card.append(el('p', 'note', tr('띄어쓰기는 채점에 영향을 주지 않습니다.')));
    b.append(card);
  } else {
  // 보기가 그림인 문항(듣고 그림 고르기)은 두 칸씩 늘어놓는다 — 글 보기와 모양이 달라야 헷갈리지 않는다
  const box = q.optkind === 'img' ? el('div', 'exgrid') : card;
  /* 답 잠금 — **EPS 에만** 건다.
     공식 CBT 체험 프로그램에서 ①을 고른 뒤 ②를 눌러 봤는데 바뀌지 않았고,
     안내문도 "Once you choose an answer, you can`t change the answer." 다.
     TOPIK IBT 는 정반대라("선택 번호를 수정할 수 있습니다") 거기엔 걸면 안 된다.
     시험이 잔인해서가 아니라 **실제와 같아야** 연습이 연습 노릇을 하기 때문이다. */
  const locked = e.lock && answered(EX.marks[EX.at]);
  q.options.forEach((o, i) => {
    const on = EX.marks[EX.at] === i;
    const opt = el('button', (q.optkind === 'img' ? 'exopti' : 'exopt')
      + (on ? ' on' : '') + (locked ? ' lockd' : ''));
    if (q.optkind === 'img') {
      const im = new Image(); im.alt = ''; im.src = 'img/' + o;
      opt.append(im, el('span', 'exnum', CIRC[i]));
    } else {
      opt.append(el('span', 'exnum', CIRC[i]), el('span', null, esc(String(o))));
    }
    if (locked) opt.disabled = true;
    else opt.onclick = () => {
      // 같은 것을 다시 누르면 고른 것을 지운다 — 실제 시험지에서 지우개 쓰는 것과 같다
      EX.marks[EX.at] = on ? -1 : i;
      drawExamQ();
    };
    box.append(opt);
  });
  if (box !== card) card.append(box);
  if (locked) card.append(el('p', 'note lockmsg',
    tr('실제 시험과 같이, 한 번 고른 답은 바꿀 수 없습니다.')));
  b.append(card);
  }

  /* 문항 사이 이동은 **막지 않는다.**
     한때 '지나온 듣기 문항으로 못 돌아가게' 막았는데 그건 실제와 달랐다.
     공식 기출 풀어보기 화면을 열어 보니 문항이 한 쪽에 다 펼쳐져 있고
     (최상단으로 ▲ / 최하단으로 ▼) 듣기는 **하나의 방송**으로 흐른다.
     종이 시험도 마찬가지다 — 시험지가 앞에 있으니 앞 문항으로 돌아가
     답을 고칠 수 있다. 되돌아갈 수 없는 것은 **소리**지 문항이 아니다.
     그 '소리는 정해진 횟수만'은 아래 재생 횟수 제한이 이미 맡고 있다. */

  // 앞뒤 이동
  const nav = el('div', 'exnav');
  // CBT 는 구간 안에서만 오간다 — 듣기에서 읽기로 넘어가는 길은 없다.
  const lo = EX.cbt ? (EX.part === 'read' ? 0 : EX.cbt.split) : 0;
  const hi = EX.cbt ? (EX.part === 'read' ? EX.cbt.split : e.questions.length)
                    : e.questions.length;
  const prev = el('button', 'ghost big', '‹ 이전');
  prev.disabled = EX.at === lo;
  prev.onclick = () => { EX.at--; drawExamQ(); };
  const last = EX.at === hi - 1;
  const toListen = EX.cbt && EX.part === 'read' && last;
  const next = el('button', 'primary big',
    toListen ? tr('듣기로 넘어가기 ›') : last ? '제출하기' : '다음 ›');
  next.onclick = () => {
    if (toListen) { enterListening(false); return; }
    if (EX.at < hi - 1) { EX.at++; drawExamQ(); return; }
    const blank = EX.marks.filter((m, i) => !answered(m)).length;
    if (blank && !confirm(`아직 ${blank}문항이 비어 있습니다. 그대로 제출할까요?`)) return;
    finishExam(false);
  };
  nav.append(prev, next);
  b.append(nav);

  // 번호판 — 어디를 안 풀었는지 한눈에 보이고, 눌러서 바로 건너뛴다
  const pad = el('div', 'expad');
  e.questions.forEach((_, i) => {
    if (EX.cbt && (i < lo || i >= hi)) return;   // 지금 구간만 보인다
    // 공식 IBT 는 **안 푼 문제**를 붉게 표시한다. 우리도 그렇게 한다 —
    // 푼 것을 세는 것보다 남은 것을 보는 편이 시험장에서 쓸모 있다.
    const n = el('button', 'expn' + (answered(EX.marks[i]) ? ' done' : ' todo') + (i === EX.at ? ' cur' : ''));
    n.textContent = String(i + 1);
    // 공식 CBT 의 번호판에는 onclick 이 없다(DOM 으로 확인) — 상태 표시 전용이다.
    // 우리도 그렇게 둔다. 이동은 이전/다음으로만.
    if (!EX.cbt) n.onclick = () => { EX.at = i; drawExamQ(); };
    else n.disabled = true;
    pad.append(n);
  });
  b.append(pad);

  show('exam', exName(e), true);
}

/* ── 공통문항 ────────────────────────────────────────────────────
   회차마다 문항이 전부 다르면 1회차 70점과 2회차 70점을 **견줄 수 없다** —
   점수가 오른 것이 실력인지 문제가 쉬웠던 것인지 가릴 방법이 없기 때문이다.
   그래서 회차에 걸쳐 **같은 문항 여섯 개**를 심어 두고(ko_exam_gen.add_anchors),
   그 여섯 개만 따로 세어 회차끼리 견준다. 시험을 여러 벌 만드는 곳은 다 이렇게 한다.

   전체 점수는 여전히 회차마다 흔들릴 수 있다. 여기 숫자만 흔들리지 않는다 —
   그러니 "정말 늘었나"는 여기를 봐야 한다. 그 말을 화면에도 적어 둔다. */
function anchorScore(e, marks) {
  let n = 0, ok = 0;
  e.questions.forEach((q, i) => { if (q.anchor) { n++; if (isRight(q, marks[i])) ok++; } });
  return n ? { n, ok } : null;
}
function anchorPanel(host, e, marks) {
  if (e.sub) return;                       // 오답만 다시 푼 판은 눈금이 될 수 없다
  const a = anchorScore(e, marks);
  if (!a) return;
  S.anchor = S.anchor || {};
  const hist = S.anchor[e.id] = S.anchor[e.id] || {};
  hist[e.set] = a.ok;
  save();
  const c = el('div', 'excard anchor');
  c.append(el('div', 'anch', `📏 ${tr('공통문항')} ${a.ok} / ${a.n}`));
  const other = Object.entries(hist).filter(([k]) => String(k) !== String(e.set));
  if (other.length) {
    c.append(el('div', 'gexp', other
      .map(([k, v]) => `${k}${tr('회차')} ${v}/${a.n}`).join(' · ')));
    const best = Math.max(...other.map(([, v]) => v));
    c.append(el('div', 'gexp vi', a.ok > best ? tr('지난 회차보다 늘었습니다.')
      : a.ok === best ? tr('지난 회차와 같습니다.') : tr('지난 회차보다 줄었습니다.')));
  }
  c.append(el('p', 'note', tr('이 여섯 문항은 모든 회차에 똑같이 들어 있습니다. '
    + '회차마다 문제가 달라 총점은 흔들릴 수 있지만, 여기 숫자는 회차끼리 그대로 견줄 수 있습니다.')));
  host.append(c);
}

function finishExam(timeUp) {
  if (!EX) return;
  if (EX.timer) { clearInterval(EX.timer); EX.timer = 0; }
  const e = EX.exam, marks = EX.marks;
  const wrong = [];
  let score = 0;
  e.questions.forEach((q, i) => {
    const ok = isRight(q, marks[i]);
    if (ok) score++;
    else wrong.push({ q, picked: marks[i] });
    /* 창고에 넣고 세기. 틀린 것은 새로 담고, 이미 담긴 것은 맞혔을 때 한 칸 올린다.
       맞힌 것을 새로 담지는 않는다 — 처음부터 맞힌 문항까지 다시 낼 이유는 없다. */
    if (e.day) kmark(q.word, ok);              // 하루 확인 문제는 단어 단위로 센다
    else if (!ok || (S.qbank || {})[qkey(q)]) qbankMark(q, ok, e);
  });

  // 점수를 남긴다 — 다음에 목록에서 바로 보인다.
  // 오답만 다시 푼 것(sub)은 기록하지 않는다 — 부분 풀이가 회차 성적을 덮으면 안 된다.
  S.exam = S.exam || {};
  const key = e.id + '-' + e.set;
  const prev = S.exam[key];
  if (!e.sub) {
    if (!prev) earn(CRD.exam, tr('모의고사를 끝냈습니다'));   // 회차당 한 번만 (다시 풀어도 또 주지 않는다)
    if (!prev || score > prev.score) S.exam[key] = { score, total: e.questions.length, at: now() };
  }
  touchToday(); save();

  const b = $('#examBody');
  b.textContent = '';
  const pct = Math.round(score / e.questions.length * 100);
  // 앞에서 만든 뒤 아래에서 붙인다 — '맞힌 문항 해설' 단추가 이 자리 앞에 끼워 넣는다
  var again, list;
  const r = el('div', 'result' + (pct >= 60 ? ' perfect' : ''));
  r.append(el('div', 'n', `${score} / ${e.questions.length}`));

  /* 실제 시험 점수 — TOPIK은 문항마다 배점이 다르다(듣기 4·3점, 읽기 2·3점).
     맞힌 개수만 세면 실제 성적과 다른 숫자가 나와서, 급을 가늠하는 데 못 쓴다.
     배점은 기출 24회차에서 문항 번호별로 세어 확인한 것이다(tools/topik_blueprint.py). */
  if (e.full) {
    let got = 0;
    e.questions.forEach((q, i) => { if (isRight(q, marks[i])) got += (q.pt || 0); });
    got = Math.round(got * 10) / 10;                 // 1.5점짜리(KIIP)는 소수가 나온다
    r.append(el('div', 'exscore', `${got}점 / ${e.full}점`));
    const cuts = (e.grades_at || []).filter(g => got >= g[0]);
    if (e.grades_at) {
      r.append(el('div', 'exgrade', cuts.length
        ? tr('N급 수준입니다').replace('N', cuts[cuts.length - 1][1].replace('급', ''))
        : tr('아직 급이 나오지 않습니다')));
    } else if (e.place_at || e.pass_at) {
      /* KIIP — 우리가 채점한 것은 **필기 객관식뿐**이다. 작문·구술 점수가 더해져야
         진짜 결과가 나온다. 그래서 하나로 딱 잘라 말하지 않고 **폭**으로 말한다.
         구술을 0점 받으면 지금 점수가 그대로 총점이고, 다 맞으면 그만큼 올라간다.
         (없는 점수를 평균값으로 채워 넣으면 그건 지어낸 성적이다.) */
      const add = ((e.oral || [0, 0])[1] || 0) + ((e.essay || [0, 0])[1] || 0);
      const name = v => {
        const c = (e.place_at || []).filter(g => v >= g[0]);
        return c.length ? c[c.length - 1][1] : (e.place_at ? '0단계' : null);
      };
      if (e.place_at) {
        const lo = name(got), hi = name(got + add);
        r.append(el('div', 'exgrade', lo === hi ? lo : `${lo} ~ ${hi}`));
      } else {
        const lo = got >= e.pass_at, hi = got + add >= e.pass_at;
        r.append(el('div', 'exgrade', lo ? tr('합격선을 넘었습니다')
          : hi ? tr('남은 점수에 따라 갈립니다') : tr('합격선에 모자랍니다')));
      }
      const parts = [];
      if (e.essay) parts.push(tr('작문 N문항 M점').replace('N', e.essay[0]).replace('M', e.essay[1]));
      if (e.oral) parts.push(tr('구술 N문항 M점').replace('N', e.oral[0]).replace('M', e.oral[1]));
      r.append(el('div', 'note', tr('여기는 필기 객관식만 채점했습니다.') + ' ' + parts.join(' · ')
        + (e.pass_at ? ` · ${tr('합격은 100점 만점에 60점입니다.')}` : '')));
    } else {
      // 한 영역만으로는 급이 안 나온다 — 있는 척하지 않는다
      r.append(el('div', 'note', tr('급은 듣기·쓰기·읽기를 합쳐야 나옵니다.')));
    }
  }
  // 배점이 있는 시험에서는 '점'을 두 뜻으로 쓰면 안 된다 — 여기서는 맞힌 비율만 말한다
  const tail = e.full ? `${tr('맞힌 비율')} ${pct}%` : `${pct}점`;
  r.append(el('div', null, timeUp ? `${tr('시간이 다 됐습니다')} · ${tail}` : tail));
  b.append(r);
  anchorPanel(b, e, marks);

  if (wrong.length) {
    b.append(el('h3', 'exhead', tr('틀린 문항 N개').replace('N', wrong.length)));
    const CIRC = '①②③④';
    wrong.forEach(({ q, picked }) => {
      const c = el('div', 'excard wrong');
      if (q.passage) {
        const pw = el('div', 'expass');
        if (q.ptitle) pw.append(el('div', 'exptit', esc(q.ptitle)));
        q.passage.split('\n').forEach(line => pw.append(el('div', null, esc(line))));
        c.append(pw);
      }
      const lines = q.stem.split('\n');
      c.append(el('div', 'exask', `${q.no}. ` + esc(lines[0])));
      if (lines[1]) c.append(el('div', 'exbody', esc(lines[1])));
      // 듣기는 채점 뒤에 **대본을 글로 보여 준다** — 못 알아들은 이유를 눈으로 확인해야 는다
      if (q.audio && q.audio.length) {
        const sc = el('div', 'exscript');
        q.audio.forEach(a => {
          const who = typeof a === 'string' ? '' : (a.v === 'm' ? '남: ' : '여: ');
          sc.append(el('div', null, esc(who + (typeof a === 'string' ? a : a.t))));
        });
        c.append(sc);
        const rp = el('button', 'ghost sm', '🔊 다시 듣기');
        rp.onclick = () => playKoSeq(q.audio);
        c.append(rp);
      }
      if (q.img) {
        const im = new Image(); im.className = 'expic'; im.alt = ''; im.src = 'img/' + q.img;
        c.append(im);
      }
      const shown = o => q.optkind === 'img' ? '(그림)' : String(o);
      if (q.short) {
        // 단답형은 보기가 없다 — 쓴 글을 그대로 되비춰 준다
        c.append(el('div', 'exans', `정답 <b>${esc(q.answerText)}</b>`
          + (answered(picked) ? ` · ${tr('쓴 답')} ${esc(picked)}` : ' · 비워 둠')));
      } else {
      c.append(el('div', 'exans', `정답 ${CIRC[q.answer]} <b>${esc(shown(q.options[q.answer]))}</b>`
        + (picked >= 0 ? ` · 고른 답 ${CIRC[picked]} ${esc(shown(q.options[picked]))}` : ' · 비워 둠')));
      }
      // 그림 보기 문항은 정답 그림을 다시 보여 준다 — 글로 '(그림)'만 봐서는 뭘 틀렸는지 모른다
      if (q.optkind === 'img') {
        const im = new Image(); im.className = 'expic'; im.alt = '';
        im.src = 'img/' + q.options[q.answer];
        c.append(im);
      }
      // 틀린 단어은 소리로 한 번 더 — 눈으로만 보면 발음이 안 붙는다
      if (q.word && q.word.length > 1 && !(q.audio && q.audio.length)) {
        const p = el('button', 'ghost sm', '🔊 ' + esc(q.word));
        p.onclick = () => speakKo(q.word);
        c.append(p);
      }
      c.append(expBlock(q, picked));
      b.append(c);
    });
  } else {
    b.append(el('p', 'lede', '다 맞았습니다.'));
  }

  // 맞힌 문항도 해설을 볼 수 있게 — 찍어서 맞힌 것은 다음에 틀린다
  if (wrong.length < e.questions.length) {
    const all = el('button', 'ghost big', '맞힌 문항 해설도 보기');
    all.style.marginTop = '14px';
    all.onclick = () => {
      all.remove();
      b.insertBefore(el('h3', 'exhead', '맞힌 문항 해설'), again);
      e.questions.forEach((q, i) => {
        if (!isRight(q, marks[i])) return;
        const c = el('div', 'excard');
        c.append(el('div', 'exask', `${q.no}. ` + esc(q.stem.split('\n')[0])));
        c.append(el('div', 'exans', q.short
          ? `정답 <b>${esc(q.answerText)}</b>`
          : `정답 ${'①②③④'[q.answer]} <b>`
            + esc(q.optkind === 'img' ? '(그림)' : String(q.options[q.answer])) + '</b>'));
        c.append(expBlock(q, q.answer));
        b.insertBefore(c, again);
      });
    };
    b.append(all);
  }

  /* 틀린 문항만 다시 풀기 — 통째 재응시보다 이게 먼저다.
     맞힌 53문항을 또 푸는 건 시간 낭비고, 틀린 것을 **떠올려서 다시 답하는 것**이
     해설을 다시 읽는 것보다 오래 남는다(인출 연습 — 시험 효과).
     원래 회차의 기록(S.exam)은 건드리지 않는다 — 부분 풀이는 성적이 아니다. */
  if (wrong.length && wrong.length < e.questions.length) {
    const redo = el('button', 'primary big', `${tr('틀린 문항만 다시 풀기')} (${wrong.length})`);
    redo.style.marginTop = '18px';
    redo.onclick = () => startExam({
      ...e, sub: true, full: 0, grades_at: null, name: exName(e) + ' · ' + tr('오답'),
      minutes: Math.max(5, Math.round(e.minutes * wrong.length / e.questions.length)),
      questions: wrong.map(w => w.q),
    });
    b.append(redo);
  }
  again = el('button', wrong.length && wrong.length < e.questions.length ? 'ghost big' : 'primary big',
             '다시 풀기');
  again.style.marginTop = wrong.length && wrong.length < e.questions.length ? '8px' : '18px';
  again.onclick = () => startExam(e);
  list = el('button', 'ghost big', '다른 시험 고르기');
  list.style.marginTop = '8px';
  list.onclick = () => { EX = null; drawExamList(); };

  b.append(again, list);
  show('exam', '채점 결과', true);
}

/* ---------- 해설 ----------
   문항마다 보기 넷의 해설이 같은 차례로 들어 있다(ko_exam_gen.py 가 만든다).
   정답 줄은 '왜 맞는지', 나머지는 '왜 틀렸는지'. 내가 고른 오답은 따로 표시해
   눈이 먼저 가게 한다 — 사람은 자기가 틀린 이유부터 알고 싶어 한다. */
function expBlock(q, picked) {
  const box = el('div', 'exwhy');
  if (!q.exp || !q.exp.length) {
    box.append(el('div', 'exnote', tr('해설이 아직 없습니다.')));
    return box;
  }
  // 단답형은 보기별 해설이 아니라 한 줄짜리 글이다 — 아래 보기 훑기를 돌리면 깨진다
  if (q.short || typeof q.exp === 'string') {
    box.append(el('div', 'exwhead', tr('해설')));
    box.append(el('div', 'exnote', esc(q.exp)));
    return box;
  }
  box.append(el('div', 'exwhead', tr('해설')));
  const shown = o => q.optkind === 'img' ? tr('(그림)') : String(o);
  q.exp.forEach((t, i) => {
    if (!t) return;
    const right = i === q.answer;
    const mine = i === picked && !right;
    const row = el('div', 'exwrow' + (right ? ' ok' : mine ? ' mine' : ''));
    row.append(el('span', 'exwno', '①②③④'[i]));
    const s = el('span', 'exwtx');
    s.append(el('b', null, esc(shown(q.options[i]))));
    s.append(document.createTextNode(' — ' + t));
    if (mine) s.append(el('span', 'exwtag', tr('내가 고른 답')));
    row.append(s);
    box.append(row);
  });
  return box;
}

/* ---------- 구술·작문 (AI가 채점한다) ----------
   객관식은 정답이 하나라 기계가 채점하지만, 말하기·쓰기는 정답이 여럿이다.
   그래서 점수 하나만 던지지 않고 **뭘 고치면 되는지**를 같이 준다 —
   "3점"만 보면 다음에 뭘 해야 할지 모른다.
   AI가 매긴 점수는 성적으로 저장하지 않는다. 사람마다 다르게 나오는 것을 기록으로 남기면 잘못된 믿음이 생긴다. */
const SPEAK_RUBRIC =
  '너는 한국어 말하기 시험 채점관이다. 응시자는 한국에서 일하는 외국인 노동자다.\n'
  + '아래 형식으로만 답한다. 다른 말은 붙이지 않는다:\n'
  + '점수: (1~5 중 하나)\n좋은 점: (한 문장)\n고칠 점: (한 문장, 구체적으로)\n이렇게 말해 보세요: (더 나은 예시 한 문장)\n'
  + '채점 기준: 질문에 맞는 답을 했는가 > 알아들을 수 있는가 > 문법·어휘. \n'
  + '발음이 조금 서툴러도 뜻이 통하면 깎지 않는다. 응시자는 배우는 사람이니 말은 따뜻하게 한다.\n'
  + '설명은 쉬운 한국어로 짧게 쓴다.';

function examExtra() {
  // 시험지를 아직 못 받았으면 먼저 받아 온다 — 여기로 곧장 들어오는 길이 생겨도 안 깨지게
  if (!EXDATA) { examEntry(); return; }
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '정답이 하나가 아닌 문제입니다 — <b>AI가 읽고 고칠 점을 알려 줍니다.</b>'));
  if (!aiReady()) {
    b.append(el('p', 'note', 'AI 채점을 쓰려면 <b>내 정보</b>에서 구글 무료 키를 한 번 넣어 주세요.'));
  }
  /* TOPIK 말하기는 KIIP 구술과 다른 시험이다 — 유형마다 준비·응답 시간이 정해져 있고
     그 시간표를 지키는 것이 시험의 핵심이다. 그래서 묶음을 따로 둔다. */
  const ts = (EXDATA.extra || {}).topik_speak || [];
  if (ts.length) {
    b.append(el('h3', 'exhead', 'TOPIK ' + tr('말하기') + ' (IBT)'));
    b.append(el('p', 'note', tr('6문항 · 유형마다 준비·응답 시간이 다릅니다. 실제 시험처럼 시간이 흐릅니다.')));
    ts.forEach((s, i) => {
      const btn = el('button', 'bigmenu');
      btn.append(el('b', null, tr('N회차').replace('N', s.set)));
      btn.append(el('span', 'exmeta',
        s.questions.map(q => `${q.prep}/${q.resp}${tr('초')}`).join(' · ')));
      btn.onclick = () => examT2Speak(i, 0);
      b.append(btn);
    });
  }

  b.append(el('h3', 'exhead', 'KIIP ' + tr('말하기 (구술시험)')));
  EXDATA.extra.speak.forEach((s, i) => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, `${i + 1}번 세트`));
    btn.append(el('span', 'exmeta', '읽기 + 질문 5개'));
    btn.onclick = () => examSpeak(i, 0);
    b.append(btn);
  });
  b.append(el('h3', 'exhead', '쓰기 (작문시험)'));
  EXDATA.extra.write.forEach((w, i) => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, esc(w.title)));
    btn.append(el('span', 'exmeta', `${w.chars}자 정도`));
    btn.onclick = () => examWrite(i);
    b.append(btn);
  });

  /* TOPIK II 쓰기는 꼴이 둘이다 — 51·52번은 빈칸 두 개, 53·54번은 긴 글.
     빈칸형은 모범답이 있어 AI 없이도 스스로 맞춰 볼 수 있게 했다(점수가 없어도 쓸 수 있게). */
  const bl = (EXDATA.extra || {}).t2_blank || [];
  const lg = (EXDATA.extra || {}).t2_long || [];
  if (bl.length || lg.length) {
    b.append(el('h3', 'exhead', 'TOPIK II 쓰기'));
    b.append(el('p', 'note', tr('51·52번은 빈칸 채우기, 53·54번은 긴 글입니다. 실제 시험과 같은 꼴입니다.')));
    bl.forEach((w, i) => {
      const btn = el('button', 'bigmenu');
      btn.append(el('b', null, tr('빈칸 채우기') + ' · ' + esc(w.title)));
      btn.append(el('span', 'exmeta', tr('㉠ ㉡ 두 자리')));
      btn.onclick = () => examT2Blank(i);
      b.append(btn);
    });
    lg.forEach((w, i) => {
      const btn = el('button', 'bigmenu');
      btn.append(el('b', null, (w.chars > 400 ? tr('논술 (54번 꼴)') : tr('자료 설명 (53번 꼴)'))));
      btn.append(el('span', 'exmeta', tr('N자 정도').replace('N', w.chars)));
      btn.onclick = () => examWriteLong(i);
      b.append(btn);
    });
  }
  show('exam', '말하기 · 쓰기', true);
}

/* ---------- 시험 보고 온 사람의 제보 ----------
   받는 것: 시험 종류 · 소재 · 기억나는 단어 · 체감 난이도. 그게 전부다.
   안 받는 것: 문항 본문. 화면에도 그렇게 적어 두고, 서버도 긴 글은 잘라 버린다.
   모인 것은 이름 없이 숫자로만 되돌려 준다 — "요즘 이런 소재가 많이 나왔다". */
const SIGHT_KIND = [['eps', 'EPS-TOPIK'], ['topik1', 'TOPIK I'],
                    ['topik2', 'TOPIK II'], ['kiip', 'KIIP']];
const SIGHT_TOPIC = ['관계·감정', '경제·사회', '문화·여가', '학교·공부', '환경·과학',
                     '일·직장', '생활·집', '건강·병원', '교통·이동'];

function examSight() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '시험에서 <b>어떤 소재가 나왔는지</b>만 알려 주세요.<br><b>문제를 그대로 옮겨 적으면 안 됩니다</b> — 남의 저작물이라 우리도 못 받습니다.'));

  let kind = 'eps', hard = 3;
  const picked = new Set();
  b.append(el('p', 'note', tr('어떤 시험이었나요?')));
  const kindBox = el('div');
  const drawKind = () => {
    kindBox.textContent = '';
    kindBox.append(chipRow(SIGHT_KIND, kind, k => { kind = k; drawKind(); }));
  };
  drawKind();
  b.append(kindBox);

  b.append(el('p', 'note', tr('어떤 소재가 나왔나요? (여러 개 고를 수 있습니다)')));
  const tw = el('div', 'catpick');
  SIGHT_TOPIC.forEach(t => {
    const c = el('button', 'catchipbtn', esc(t));
    c.type = 'button';
    c.onclick = () => {
      if (picked.has(t)) { picked.delete(t); c.classList.remove('on'); }
      else { picked.add(t); c.classList.add('on'); }
    };
    tw.append(c);
  });
  b.append(tw);

  b.append(el('p', 'note', tr('기억나는 단어이 있으면 적어 주세요 (쉼표로 나눠서, 단어만)')));
  const wi = el('input', 'keyin'); wi.type = 'text'; wi.maxLength = 140;
  wi.placeholder = tr('예: 환승, 계약서, 분리배출');
  b.append(wi);

  b.append(el('p', 'note', tr('많이 어려웠나요?')));
  const hardBox = el('div');
  const HARD = [[1, tr('아주 쉬움')], [2, tr('쉬움')], [3, tr('보통')],
                [4, tr('어려움')], [5, tr('아주 어려움')]];
  const drawHard = () => {
    hardBox.textContent = '';
    hardBox.append(chipRow(HARD, hard, k => { hard = k; drawHard(); }));
  };
  drawHard();
  b.append(hardBox);

  const out = el('div', 'exgrade');
  const go = el('button', 'primary big', tr('보내기'));
  go.style.width = '100%'; go.style.marginTop = '14px';
  go.onclick = () => {
    // 문장을 적어 보낸 경우를 걸러 낸다 — 문항 본문이 흘러 들어오는 통로가 되면 안 된다
    const words = wi.value.split(/[,·\n]/).map(x => x.trim())
      .filter(x => x && x.length <= 12 && !/[.!?]/.test(x)).slice(0, 10);
    const dropped = wi.value.split(/[,·\n]/).map(x => x.trim()).filter(x => x).length - words.length;
    if (!picked.size && !words.length) { out.textContent = tr('소재를 하나 이상 골라 주세요.'); return; }
    go.disabled = true;
    out.textContent = tr('보내는 중…');
    cCall({ act: 'sight', kind, topics: [...picked], words, hard })
      .then(() => {
        out.textContent = tr('고맙습니다. 다음 사람에게 큰 도움이 됩니다.')
          + (dropped ? ' ' + tr('문장처럼 긴 것 N개는 보내지 않았습니다.').replace('N', dropped) : '');
        setTimeout(examSightBoard, 900);
      })
      .catch(e => { go.disabled = false;
        out.textContent = /gone|옛 판/.test(e.message || '')
          ? tr('서버가 아직 새 판이 아닙니다 — 잠시 뒤에 다시 해 주세요.')
          : (e.message || tr('보내지 못했습니다')); });
  };
  const see = el('button', 'ghost big', tr('다른 사람이 적은 것 보기'));
  see.style.width = '100%'; see.style.marginTop = '8px';
  see.onclick = examSightBoard;
  b.append(go, see, out);
  const back = el('button', 'ghost sm', '‹ 돌아가기');
  back.style.marginTop = '12px';
  back.onclick = examExtra;
  b.append(back);
  show('exam', tr('시험 보고 오셨나요?'), true);
}

function examSightBoard() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', tr('시험을 보고 온 사람들이 적어 준 것입니다.') + ' '
    + tr('두 사람 이상이 적은 단어만 보여 줍니다 — 한 사람 기억은 틀릴 수 있습니다.')));
  const box = el('div');
  box.append(el('p', 'note', tr('불러오는 중…')));
  b.append(box);
  cCall({ act: 'sights' }).then(j => {
    box.textContent = '';
    let any = false;
    SIGHT_KIND.forEach(([k, nm]) => {
      const v = j[k] || {};
      if (!v.n) return;
      any = true;
      box.append(el('h3', 'exhead', nm + ' · ' + tr('제보 N건').replace('N', v.n)
        + (v.hard ? ' · ' + tr('체감 난이도 N/5').replace('N', v.hard) : '')));
      const tops = Object.entries(v.topics || {}).sort((a, c) => c[1] - a[1]);
      if (tops.length) {
        const top = tops[0][1] || 1;
        const bars = el('div', 'crclub');
        tops.forEach(([t, n], i) => bars.append(rankRow(i, t, n, top, false)));
        box.append(bars);
      }
      const ws = Object.entries(v.words || {});
      if (ws.length) {
        box.append(el('p', 'note', tr('여러 사람이 적은 단어')));
        const wrap = el('div', 'ctags');
        ws.forEach(([w, n]) => wrap.append(el('i', 'ctag', esc(w) + ' ×' + n)));
        box.append(wrap);
      }
    });
    if (!any) box.append(el('p', 'note', tr('아직 제보가 없습니다. 첫 번째로 알려 주세요.')));
  }).catch(() => {
    box.textContent = '';
    box.append(el('p', 'note', tr('서버가 아직 새 판이 아닙니다 — 잠시 뒤에 다시 해 주세요.')));
  });
  const again = el('button', 'primary big', tr('나도 알려 주기'));
  again.style.width = '100%'; again.style.marginTop = '14px';
  again.onclick = examSight;
  const back = el('button', 'ghost sm', '‹ 돌아가기');
  back.style.marginTop = '8px';
  back.onclick = examExtra;
  b.append(again, back);
  show('exam', tr('무엇이 나왔나'), true);
}

/* 51·52번 꼴 — 빈칸 둘. 채점 기준이 뚜렷해서 모범답을 보여 주는 것만으로도 배운다.
   AI 키가 있으면 내 답을 봐 주고, 없으면 모범답과 견주게 한다. */
function examT2Blank(i) {
  const w = EXDATA.extra.t2_blank[i];
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'exsec', tr('TOPIK II 쓰기') + ' · ' + tr('빈칸 채우기')));
  const card = el('div', 'excard');
  card.append(el('div', 'exask', esc(w.title)));
  const pw = el('div', 'expass');
  w.text.split('\n').forEach(l => pw.append(el('div', null, esc(l))));
  card.append(pw);

  const ins = [];
  ['㉠', '㉡'].forEach(mark => {
    const row = el('div', 'blankrow');
    row.append(el('span', 'blankno', mark));
    const t = el('input', 'keyin'); t.type = 'text'; t.maxLength = 60;
    t.placeholder = tr('여기에 쓰세요…');
    row.append(t); ins.push(t);
    card.append(row);
  });

  const out = el('div', 'exgrade');
  const see = el('button', 'ghost', tr('모범답 보기'));
  see.onclick = () => {
    out.textContent = '';
    w.model.forEach(m => out.append(el('div', 'exgline', esc(m))));
    out.append(el('div', 'exgline dim', esc(w.how)));
    see.disabled = true;
  };
  const go = el('button', 'explay', tr('AI에게 봐 달라기'));
  go.onclick = async () => {
    const mine = ins.map(x => x.value.trim());
    if (mine.every(x => !x)) { out.textContent = tr('먼저 써 보세요.'); return; }
    if (!aiReady()) { out.textContent = 'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.'; return; }
    if (!aiPay(out)) return;
    out.textContent = 'AI가 읽는 중…';
    try {
      const t = await gCall({
        contents: [{ role: 'user', parts: [{ text:
          'TOPIK II 쓰기 51·52번 채점자다. 아래 글의 빈칸 ㉠㉡에 응시자가 쓴 답이 '
          + '문맥과 문법에 맞는지 각각 한 줄로 평하고, 틀렸으면 고쳐 준다. 한국어로 짧게.\n\n'
          + '[글]\n' + w.text + '\n\n[채점 요령]\n' + w.how
          + '\n\n[응시자 답]\n㉠ ' + mine[0] + '\n㉡ ' + mine[1] }] }],
        generationConfig: { maxOutputTokens: 400 }
      }, n => { out.textContent = `AI가 붐빕니다 — 다시 시도 중 (${n + 2}/3)…`; });
      out.textContent = '';
      String(t).split('\n').filter(x => x.trim())
        .forEach(line => out.append(el('div', 'exgline', esc(line))));
      touchToday(); save();
    } catch (e) { out.textContent = 'AI 채점 실패: ' + (e.message || ''); }
  };
  card.append(go, see, out);
  b.append(card);
  const back = el('button', 'ghost big', '‹ 다른 제목 고르기');
  back.style.marginTop = '12px';
  back.onclick = examExtra;
  b.append(back);
  show('exam', 'TOPIK II 쓰기', true);
}

/* 53·54번 꼴 — 긴 글. 채점 요령을 AI에게 같이 넘긴다.
   "잘 썼나요"라고만 물으면 채점이 그때그때 달라진다 — 무엇을 볼지 정해 줘야 한다. */
function examWriteLong(i) {
  const w = EXDATA.extra.t2_long[i];
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'exsec', tr('TOPIK II 쓰기') + ' · ' + tr('N자 정도').replace('N', w.chars)));
  const card = el('div', 'excard');
  w.title.split('\n').forEach(l => card.append(el('div', 'exask', esc(l))));
  const ta = el('textarea', 'exwrite');
  ta.placeholder = tr('여기에 쓰세요…');
  ta.rows = 14;
  const cnt = el('p', 'note', `0 / ${w.chars}자`);
  ta.oninput = () => { cnt.textContent = `${ta.value.length} / ${w.chars}자`; };
  card.append(ta, cnt);

  const out = el('div', 'exgrade');
  const go = el('button', 'explay', '채점받기');
  go.onclick = async () => {
    const text = ta.value.trim();
    if (text.length < 80) { out.textContent = tr('조금 더 써 주세요.'); return; }
    if (!aiReady()) { out.textContent = 'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.'; return; }
    if (!aiPay(out)) return;
    out.textContent = 'AI가 읽는 중…';
    try {
      const t = await gCall({
        contents: [{ role: 'user', parts: [{ text:
          'TOPIK II 쓰기 채점자다. 아래 채점 요령의 항목마다 O/X와 한 줄 이유를 적고, '
          + '마지막에 고칠 곳 세 가지를 짚어 준다. 점수는 매기지 말고 무엇을 고치면 되는지만 말한다. '
          + '한국어로 짧게.\n\n[문제]\n' + w.title + '\n\n[채점 요령]\n' + w.how
          + '\n\n[응시자 글]\n' + text }] }],
        generationConfig: { maxOutputTokens: 800 }
      }, n => { out.textContent = `AI가 붐빕니다 — 다시 시도 중 (${n + 2}/3)…`; });
      out.textContent = '';
      String(t).split('\n').filter(x => x.trim())
        .forEach(line => out.append(el('div', 'exgline', esc(line))));
      touchToday(); save();
    } catch (e) { out.textContent = 'AI 채점 실패: ' + (e.message || ''); }
  };
  card.append(go, out);
  b.append(card);
  const back = el('button', 'ghost big', '‹ 다른 제목 고르기');
  back.style.marginTop = '12px';
  back.onclick = examExtra;
  b.append(back);
  show('exam', 'TOPIK II 쓰기', true);
}

function examSpeak(si, qi) {
  const set = EXDATA.extra.speak[si], q = set.questions[qi];
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'exsec', `말하기 ${si + 1}번 세트 · 질문 ${qi + 1} / ${set.questions.length}`));

  const card = el('div', 'excard');
  // 지문은 첫 질문(낭독)에서만 크게 보여 준다. 뒤 질문에서도 남겨 두면 보고 읽게 된다
  if (qi === 0) {
    const pw = el('div', 'expass');
    set.passage.split('\n').forEach(l => pw.append(el('div', null, esc(l))));
    card.append(pw);
  }
  card.append(el('div', 'exask', esc(q)));

  const out = el('div', 'exgrade');
  const mic = el('button', 'explay', '🎤 말하고 채점받기');
  mic.onclick = () => recordAndGrade(q, set.passage, out, mic);
  card.append(mic, out);
  b.append(card);

  const nav = el('div', 'exnav');
  const prev = el('button', 'ghost big', '‹ 이전');
  prev.disabled = qi === 0;
  prev.onclick = () => examSpeak(si, qi - 1);
  const next = el('button', 'primary big', qi === set.questions.length - 1 ? '끝내기' : '다음 ›');
  next.onclick = () => qi === set.questions.length - 1 ? examExtra() : examSpeak(si, qi + 1);
  nav.append(prev, next);
  b.append(nav);
  show('exam', '말하기', true);
}

/* AI 채점을 시작해도 되는가 — 앱이 내주는 열쇠로 돌 때만 점수를 본다.
   내 구글 키를 넣은 사람은 자기 몫으로 쓰는 것이라 점수와 무관하다. */
function aiPay(out) {
  if (!onAppKey()) return true;
  if (spend(AI_COST)) return true;
  out.textContent = '';
  out.append(el('div', 'exgline', tr('점수가 모자랍니다') + ' — ' + tr('필요') + ' ' + AI_COST
    + ' · ' + tr('남음') + ' ' + credits().bal));
  out.append(el('div', 'exgline', tr('공부하면 다시 쌓입니다. 내 정보에 구글 키를 넣으면 점수 없이 쓸 수 있습니다.')));
  return false;
}

async function recordAndGrade(question, passage, out, btn) {
  if (!aiReady()) { out.textContent = 'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.'; return; }
  if (!canRecord()) { out.textContent = '이 기기에서는 녹음을 쓸 수 없습니다.'; return; }
  if (!aiPay(out)) return;
  if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
  try {
    if (!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) { out.textContent = '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.'; return; }
  const chunks = [];
  const mr = new MediaRecorder(REC.stream);
  REC.mr = mr;
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    releaseMic();
    btn.textContent = '🎤 말하고 채점받기';
    out.textContent = 'AI가 듣는 중…';
    try {
      const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
      if (REC.url) URL.revokeObjectURL(REC.url);
      REC.url = url;
      const b64 = await recToWav(url);
      const t = await gCall({
        contents: [{ role: 'user', parts: [
          { text: SPEAK_RUBRIC + '\n\n[읽기 지문]\n' + passage + '\n\n[질문]\n' + question
                  + '\n\n아래 녹음이 응시자의 답이다.' },
          { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
        generationConfig: { maxOutputTokens: 400 }
      }, i => { out.textContent = `AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
      out.textContent = '';
      String(t).split('\n').filter(x => x.trim())
        .forEach(line => out.append(el('div', 'exgline', esc(line))));
      touchToday(); save();
    } catch (e) { out.textContent = 'AI 채점 실패: ' + (e.message || ''); }
  };
  mr.start();
  btn.textContent = '⏹ 다 말했어요';
  out.textContent = '듣고 있습니다… 다 말하면 위 단추를 누르세요.';
}

/* ---------- TOPIK 말하기 평가 (IBT) ----------
   이 시험의 핵심은 **시간표**다. 준비 20초에 30초를 말하는 것(1번)과
   준비 70초에 80초를 말하는 것(5·6번)은 아주 다른 일이다. 그래서 화면이
   공식 시간표대로 흐른다 — 준비 시간이 끝나면 "삐" 소리가 나고 그때부터
   녹음이 저절로 시작되며, 응답 시간이 끝나면 저절로 멈춘다.
   시간을 스스로 재게 하면 이 시험을 연습하는 뜻이 없다.

   채점은 공식 평가요소 셋으로 나눠 준다 — 점수 하나만 주면 뭘 고칠지 모른다. */
const T2SPEAK_RUBRIC =
  '너는 한국어능력시험(TOPIK) 말하기 평가 채점관이다.\n'
  + '공식 평가요소 세 가지로만 나눠서, 아래 형식 그대로 답한다. 다른 말은 붙이지 않는다:\n'
  + '내용 및 과제 수행: (상/중/하 중 하나) — (한 문장)\n'
  + '언어 사용: (상/중/하 중 하나) — (한 문장)\n'
  + '발화 전달력: (상/중/하 중 하나) — (한 문장)\n'
  + '이렇게 말해 보세요: (더 나은 표현 한두 문장)\n'
  + '기준: 과제에 맞는 내용인가 · 담화 구성이 조직적인가 · 상황에 맞는 어휘와 문법인가 · '
  + '발음과 억양이 이해 가능하고 속도가 자연스러운가.\n'
  + '응시자는 한국에서 일하거나 공부하는 베트남 사람이다. 배우는 사람이니 말은 따뜻하게 하고, '
  + '설명은 쉬운 한국어로 짧게 쓴다.';

/** 준비 → "삐" → 녹음 → 자동 정지. 시간은 문항이 들고 있는 공식 값을 쓴다. */
function t2SpeakRun(q, host, out) {
  host.textContent = '';
  const bar = el('div', 'spkbar');
  const lab = el('div', 'spklab');
  const num = el('div', 'spknum');
  bar.append(lab, num);
  host.append(bar);
  const stopBtn = el('button', 'ghost sm', tr('그만두기'));
  host.append(stopBtn);

  let timer = 0, mr = null;
  const clear = () => { if (timer) clearInterval(timer); timer = 0; };
  const bail = () => { clear(); if (mr && mr.state === 'recording') mr.stop(); else releaseMic(); host.textContent = ''; };
  stopBtn.onclick = bail;

  const countdown = (secs, label, cls, done) => {
    let left = secs;
    lab.textContent = tr(label);
    bar.className = 'spkbar ' + cls;
    num.textContent = left;
    clear();
    timer = setInterval(() => {
      num.textContent = --left;
      if (left <= 0) { clear(); done(); }
    }, 1000);
  };

  countdown(q.prep, '준비하세요', 'prep', async () => {
    beep();                                  // 공식 시험의 "삐" 신호
    if (!canRecord()) { out.textContent = tr('이 기기에서는 녹음을 쓸 수 없습니다.'); host.textContent = ''; return; }
    try {
      if (!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { out.textContent = tr('마이크를 쓸 수 없습니다.'); host.textContent = ''; return; }
    const chunks = [];
    mr = new MediaRecorder(REC.stream);
    REC.mr = mr;
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      clear(); releaseMic(); host.textContent = '';
      if (!aiReady()) { out.textContent = tr('녹음했습니다. AI 채점을 쓰려면 내 정보에서 키를 넣어 주세요.'); return; }
      if (!aiPay(out)) return;
      out.textContent = tr('AI가 듣는 중…');
      try {
        const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
        if (REC.url) URL.revokeObjectURL(REC.url);
        REC.url = url;
        const b64 = await recToWav(url);
        const ctx = [`[문항 유형] ${q.kind} (${q.level})`, `[문제] ${q.ask}`];
        if (q.partner) ctx.push(`[들려준 말]\n${q.partner}`);
        if (q.scene) ctx.push(`[그림 내용]\n${q.scene.join('\n')}`);
        if (q.data) ctx.push(`[자료]\n${q.data}`);
        ctx.push(`[응답 시간] ${q.resp}초`);
        const t = await gCall({
          contents: [{ role: 'user', parts: [
            { text: T2SPEAK_RUBRIC + '\n\n' + ctx.join('\n') + '\n\n아래 녹음이 응시자의 답이다.' },
            { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
          generationConfig: { maxOutputTokens: 420 }
        }, i => { out.textContent = `${tr('AI가 붐빕니다 — 다시 시도 중')} (${i + 2}/3)…`; });
        out.textContent = '';
        String(t).split('\n').filter(x => x.trim())
          .forEach(line => out.append(el('div', 'exgline', esc(line))));
        touchToday(); save();
      } catch (e) { out.textContent = tr('AI 채점 실패') + ': ' + (e.message || ''); }
    };
    mr.start();
    stopBtn.textContent = tr('다 말했어요');
    stopBtn.onclick = () => { if (mr.state === 'recording') mr.stop(); };
    countdown(q.resp, '말하세요', 'resp', () => { if (mr.state === 'recording') mr.stop(); });
  });
}

/* "삐" — 공식 시험이 응답 시작을 알리는 신호. 소리 파일을 두지 않고 바로 만든다(용량 0). */
function beep() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ac = new C(), o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.35);
    setTimeout(() => ac.close(), 600);
  } catch (e) { /* 소리가 안 나도 시험은 굴러가야 한다 */ }
}

function examT2Speak(si, qi) {
  const set = EXDATA.extra.topik_speak[si], q = set.questions[qi];
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'exsec',
    `${tr('말하기')} ${set.set}${tr('회차')} · ${qi + 1} / ${set.questions.length} · ${esc(q.kind)}`));

  const card = el('div', 'excard');
  card.append(el('div', 'spkmeta',
    `${q.level} · ${tr('준비 N초').replace('N', q.prep)} · ${tr('응답 N초').replace('N', q.resp)}`));
  if (q.img) {
    const im = new Image(); im.className = 'expic'; im.alt = ''; im.src = 'img/' + q.img;
    card.append(im);
  }
  if (q.chart) {
    const im = new Image(); im.className = 'expic'; im.alt = ''; im.src = 'img/' + q.chart;
    card.append(im);
    // 도표를 못 읽는 사람도 답할 수 있어야 한다 — 값을 글로도 준다
    if (q.data) card.append(el('div', 'exbody', esc(q.data)));
  }
  if (q.scene) {
    // 네 컷 그림 대신 장면을 글로 준다. 없는 그림을 있는 척하지 않는다.
    const sc = el('div', 'expass');
    q.scene.forEach((s, i) => sc.append(el('div', null, `${i + 1}. ${esc(s)}`)));
    card.append(sc);
  }
  if (q.partner) {
    const pw = el('div', 'exscript');
    q.partner.split('\n').forEach(l => pw.append(el('div', null, esc(l))));
    card.append(pw);
  }
  card.append(el('div', 'exask', esc(q.ask)));
  if (q.guide) card.append(el('div', 'note', `💡 ${esc(q.guide)}`));

  const stage = el('div', 'spkstage');
  const out = el('div', 'exgrade');
  const go = el('button', 'explay', '▶ ' + tr('시작 (시간이 흐릅니다)'));
  go.onclick = () => { out.textContent = ''; t2SpeakRun(q, stage, out); };
  card.append(go, stage, out);
  b.append(card);

  const nav = el('div', 'exnav');
  const prev = el('button', 'ghost big', '‹ 이전');
  prev.disabled = qi === 0;
  prev.onclick = () => examT2Speak(si, qi - 1);
  const next = el('button', 'primary big', qi === set.questions.length - 1 ? '끝내기' : '다음 ›');
  next.onclick = () => qi === set.questions.length - 1 ? examExtra() : examT2Speak(si, qi + 1);
  nav.append(prev, next);
  b.append(nav);
  show('exam', 'TOPIK ' + tr('말하기'), true);
}

function examWrite(wi) {
  const w = EXDATA.extra.write[wi];
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'exsec', `쓰기 · ${w.chars}자 정도`));
  const card = el('div', 'excard');
  card.append(el('div', 'exask', esc(w.title)));

  const ta = el('textarea', 'exwrite');
  ta.placeholder = tr('여기에 쓰세요…');
  ta.rows = 10;
  const cnt = el('p', 'note', `0 / ${w.chars}자`);
  ta.oninput = () => { cnt.textContent = `${ta.value.length} / ${w.chars}자`; };
  card.append(ta, cnt);

  const out = el('div', 'exgrade');
  const go = el('button', 'explay', '채점받기');
  go.onclick = async () => {
    const text = ta.value.trim();
    if (text.length < 20) { out.textContent = '조금 더 써 주세요 (스무 자 이상).'; return; }
    if (!aiReady()) { out.textContent = 'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.'; return; }
    if (!aiPay(out)) return;
    out.textContent = 'AI가 읽는 중…';
    try {
      const t = await gCall({
        contents: [{ role: 'user', parts: [{ text:
          SPEAK_RUBRIC.replace('말하기', '쓰기').replace('아래 녹음이', '아래 글이')
          + '\n마지막에 "고쳐 쓴 글:" 줄을 붙이고, 틀린 곳만 고친 전체 글을 한 번 더 쓴다.\n\n'
          + '[제목]\n' + w.title + '\n\n[응시자가 쓴 글]\n' + text }] }],
        generationConfig: { maxOutputTokens: 700 }
      }, i => { out.textContent = `AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
      out.textContent = '';
      String(t).split('\n').filter(x => x.trim())
        .forEach(line => out.append(el('div', 'exgline', esc(line))));
      touchToday(); save();
    } catch (e) { out.textContent = 'AI 채점 실패: ' + (e.message || ''); }
  };
  card.append(go, out);
  b.append(card);

  const back = el('button', 'ghost big', '‹ 다른 제목 고르기');
  back.style.marginTop = '12px';
  back.onclick = examExtra;
  b.append(back);
  show('exam', '쓰기', true);
}

/* 듣기 대본을 차례로 들려준다.
   대화는 남녀가 갈리므로 목소리를 줄마다 바꿔 준다 — 한 목소리로 읽으면 누가 한 말인지 모른다.
   줄 사이는 잠깐 쉰다. 붙여 놓으면 두 사람 말이 한 덩어리로 들린다. */
function playKoSeq(items, done) {
  let i = 0;
  const step = () => {
    if (i >= items.length) { audio.onended = null; done && done(); return; }
    const it = items[i++];
    const text = typeof it === 'string' ? it : it.t;
    const v = typeof it === 'string' ? (S.voice === 'm' ? 'm' : 'f') : it.v;
    koSrc(text, v, src => {
      if (!src) { step(); return; }               // 소리가 없으면 그 줄은 건너뛴다
      // 시험 속도판('x')이 아직 안 구워진 말이면 기본 속도판으로 물러난다.
      // 새 문항을 넣고 tools/gen_exam_audio.py 를 안 돌린 사이에 소리가 통째로
      // 안 나는 일을 막는다.
      let fell = false;
      audio.pause(); audio.src = src; audio.currentTime = 0;
    audio.defaultPlaybackRate = audio.playbackRate = rate();
      audio.onended = () => setTimeout(step, 450);
      audio.onerror = () => {
        if (fell) { audio.onerror = null; step(); return; }
        fell = true;
        audio.src = src.replace('/x/', '/n/');
        audio.defaultPlaybackRate = audio.playbackRate = rate();
        audio.play().catch(() => step());
      };
      audio.play().catch(() => { audio.onended = null; done && done(); });
    });
  };
  step();
}
/* 글자 → 미리 구워 둔 mp3 주소. 색인에 없으면 null(그때는 폰 목소리로 읽는다)

   시험 중에는 'x' 갈래를 쓴다 — **실제 시험 속도로 구워 둔 소리**다.
   실측(tools/listen_rate.py): 공식 102회 TOPIK I 듣기가 2.97~3.33 글자/초인데
   우리 기본 소리는 5.62 글자/초로 **1.78배 빨랐다**. 시험보다 빠른 소리로
   연습하면 연습이 시험보다 어려워지고 자기 실력을 가늠할 수 없다.
   단어 소리는 그대로 둔다 — 외울 때는 또박또박 빠른 편이 낫다. */
function koSrc(text, v, cb) {
  const make = () => cb(KOIDX[text] ? `audio/ko-${v}/x/${KOIDX[text]}.mp3` : null);
  if (KOIDX) return make();
  fetch('data/ko_audio_index.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KOIDX = j; make(); })
    .catch(() => { KOIDX = {}; cb(null); });
}

/* 한국어 소리 — 미리 구워 둔 mp3가 있으면 그걸 쓰고, 없으면 폰의 목소리로 읽는다 */
let KOIDX = null;
function speakKo(text) {
  const play = id => {
    audio.pause();
    audio.src = `audio/ko-${S.voice === 'm' ? 'm' : 'f'}/n/${id}.mp3`;
    audio.defaultPlaybackRate = audio.playbackRate = rate();
    audio.currentTime = 0;
    audio.play().catch(() => sysSpeakKo(text));
  };
  if (KOIDX) { KOIDX[text] ? play(KOIDX[text]) : sysSpeakKo(text); return; }
  fetch('data/ko_audio_index.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(j => { KOIDX = j; KOIDX[text] ? play(KOIDX[text]) : sysSpeakKo(text); })
    .catch(() => { KOIDX = {}; sysSpeakKo(text); });
}
function sysSpeakKo(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    /* 한국어 폰 목소리도 **고른 목소리(남·여)** 로 (대표님 지시 2026-09-29: "모든 tts") — 이름으로 남녀를 찾고, 없으면 높낮이로 흉내 낸다(speakVi 와 같은 방법) */
    const male = S.voice === 'm';
    const ks = (VOICES || []).filter(v => (v.lang || '').toLowerCase().startsWith('ko'));
    const pick = ks.find(v => (male ? /male|minsu|injoon|jinho|hyunsu|_m\b|-m\b/i : /female|yuna|sora|sunhi|seoyeon|jimin|_f\b|-f\b/i).test(v.name || ''));
    if (pick) u.voice = pick;
    else if (ks.length) { u.voice = ks[0]; u.pitch = male ? .65 : 1.15; }
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { /* 목소리가 없는 기기도 있다 — 조용히 넘긴다 */ }
}

function renderMenu(id) {
  const m = MENUS[id];
  const b = $('#subBody');
  b.textContent = '';
  m.items().forEach(([label, fn]) => {
    const btn = el('button', 'bigmenu');
    btn.textContent = label;
    btn.onclick = () => { dive(() => renderMenu(id)); fn(); };
    b.append(btn);
  });
  if (m.foot) b.append(el('p', 'note', m.foot));
  show('sub', m.name, true);
}


/* ---------- 홈 ---------- */
/* 단어 창고 — 옛 days.json 것 + **새 과정(일곱 권)** 것.
   복습·오답노트·문장 속 단어 풀이가 모두 이 창고를 본다.
   과정 단어이 여기 없으면 복습 카드가 빈칸으로 뜬다(2026-08-30). */
let CWORDS = [];
const allWords = () => ALL.flatMap(d => d.words || []).concat(CWORDS);
/* 끝낸 세트의 대화 문장 — 복습에서 단어와 같이 다룬다 */
const allSents = () => ALL.flatMap(d => (d.dialog?.lines || []).map(l =>
  ({ vi: l.vi, ko: l.ko, kr_read: l.kr_read, tones: l.tones, sent: true })));
const lessonSents = () => [...(typeof RULES === 'undefined' ? [] : RULES),
                           ...(typeof GRAMMAR === 'undefined' ? [] : GRAMMAR)]
  .flatMap(r => (r.cards || []).map(c => ({ vi: c.vi, ko: c.ko, kr_read: c.kr, tones: c.tones, sent: true })));
const seniorItems = () => SENIOR ? SENIOR.words.map(w => ({ vi: w[0], ko: w[1], imp: !!(w[2] & 1) })) : [];
/* 단어의 예문을 문장 항목으로 (2026-09-28 대표님 지시 "문장 테스트 ㄱㄱ"): days.json 에 대화(dialog)가 없어 문장 문제가 한 번도 안 나오고 있었다.
   세트를 끝내면 그 과 예문 가운데 소리 있는 것 3개가 복습 창고에 문장으로 들어가고, 문장 문제(듣고 뜻·말하기·따라 말하기·퍼즐 셋)로 나온다 */
let EXSENTS = null;
function exSents() {
  if (!EXSENTS) { EXSENTS = {}; [...allWords(), ...(GYBM ? gybmAllWords() : [])].forEach(w => { const e = w.ex; if (e && e.vi && !EXSENTS[e.vi]) EXSENTS[e.vi] = { vi: e.vi, ko: e.ko || '', kr_read: e.kr || '', sent: true, of: w.vi }; }); }
  return EXSENTS;
}
function addSetSentences(words) {
  const box = srsBox(), cand = (words || []).map(w => w.ex && w.ex.vi).filter(v => v && AIDX[v] && !box[v] && v.split(/\s+/).length >= 3 && !allWords().some(x => x.vi === v));
  cand.sort(() => Math.random() - .5).slice(0, 3).forEach(v => { box[v] = { lv: 0, first: now(), due: now() + STEPS[0] * DAY }; });
}
const findItem = vi => (SBOX === 'ssrs' ? seniorItems().find(w => w.vi === vi) : null)
  || (SBOX === 'bsrs' ? gybmAllWords().find(w => w.vi === vi) : null)
  || allWords().find(w => w.vi === vi)
  || allSents().find(x => x.vi === vi) || lessonSents().find(x => x.vi === vi) || exSents()[vi] || null;
/* 오늘 꺼낼 카드 차례. 최근에 배운 것일수록 먼저 — 갓 배운 것이 가장 빨리 샌다.
   다만 오래 밀린 카드도 같이 올라와야 한다(2주까지). 안 그러면 밀린 카드가 영영 뒤에 남는다.
   ±3일 흔들기를 섞어 매번 같은 순서로 나오지 않게 한다. */
/* 복습 창고가 **셋**이다 — 하루 5분 것(S.srs)·실전 단어 것(S.ssrs)·기초단어 것(S.bsrs).
   대표님 지시: "복습은 이 테스트들은 다른거랑 섞이지 않게해주고".
   한 창고에 담으면 하루 5분 복습에 실전/기초단어 단어이 쏟아져 원래 공부가 묻힌다.
   진도(S.done)도 따로 둔다(S.sdone·S.bdone) — 안 그러면 '오늘 몇 강 했나'가 부풀어 순위까지 어긋난다. */
let SBOX = 'srs';
const srsBox = () => (S[SBOX] = S[SBOX] || {});
/* 오답노트도 창고별이다. 한 통에 담으면 하루 5분 오답노트에 실전/기초단어가 섞인다
   — 대표님 지시(복습은 섞이지 않게)가 여기까지 걸린다. */
const missBox = () => {
  const k = SBOX === 'ssrs' ? 'smiss' : SBOX === 'bsrs' ? 'bmiss' : 'miss';
  return (S.stats[k] = S.stats[k] || {});
};
function dueWords() {
  const n = now();
  return Object.entries(srsBox()).filter(([, v]) => v.due <= n)
    .map(([k, v]) => [k, (v.first || 0) + Math.min(n - v.due, 14 * DAY) + (Math.random() - .5) * 6 * DAY])
    .sort((a, b) => b[1] - a[1]).map(x => x[0]);
}


/* 내 업종이 아닌 직무 묶음은 가릴 수 있다 — 가린 것은 목록·일정·추천에서 빠진다 */
const hiddenCats = () => S.hide || [];
const visibleDay = d => !(d.track === 'work' && hiddenCats().includes(d.cat));

/* 앞으로 할 세트 n개 — 일상·직무를 번갈아. 기본기(모음·성조 등)는 일정에 안 넣는다(각자 알아서).
   '하루 몇 세트'를 2로 올리면 오늘 두 개, 내일 두 개가 잡힌다. */
function upcoming(n) {
  const daily = ALL.filter(d => typeof d.day === 'number' && !d.track && !S.done[d.day]);
  const work = ALL.filter(d => d.track === 'work' && !S.done[d.day] && visibleDay(d));
  let nd = ALL.filter(d => typeof d.day === 'number' && !d.track && S.done[d.day]).length;
  let nw = ALL.filter(d => d.track === 'work' && S.done[d.day]).length;
  const out = [];
  let i = 0, j = 0;
  while (out.length < n && (i < daily.length || j < work.length)) {
    const useDaily = j >= work.length || (i < daily.length && nd <= nw);
    if (useDaily) { out.push(daily[i++]); nd++; } else { out.push(work[j++]); nw++; }
  }
  return out;
}
const nextDay = () => upcoming(1)[0] || null;

/* **새 과정(order.json)** 에서 아직 안 끝낸 레슨을 차례로 낸다 (2026-08-30).
   첫 화면이 옛 days.json 을 보느라 '일상 Day 3 · 직무 Day 3' 같은 지난 판 이름을 띄웠다.
   차례: 1권 문법 → 일상과 직무를 번갈아. 직무는 **고른 갈래만** (안 골랐으면 다 본다). */
function courseQueue(n) {
  if (!COURSE) return [];
  const life = [], job = [];
  // 일상 쪽은 order.json 에 아직 kind:'life' 권이 없다 — COURSE(lifeVols)만 보면
  // 여기 배열이 늘 비어서 하루5분이 직무만 낸다. 옛 days.json(ALL)을 그대로 쓴다 —
  // drawCourse()의 '일상 단어' 줄(재생목록 renderDays())과 **같은 자료·같은
  // 완료 열쇠(S.done[d.day])**를 써야 진도가 두 군데로 안 갈린다 (2026-09-09).
  const lifeDays = ALL.filter(d => typeof d.day === 'number' && !d.track && visibleDay(d))
    .sort((a, b) => (a.n || 0) - (b.n || 0));
  let nd = 0;
  lifeDays.forEach(d => { if (S.done[d.day]) nd++; else life.push(d); });
  const jv = jobVol(0);
  if (jv) {
    const pick = S.jobpick || {};
    const any = jv.tracks.some(t => pick[t.track]);
    jv.tracks.forEach((t, ti) => {
      if (any && !pick[t.track]) return;
      t.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => {
        const k = jkey(ti, ci, li);
        if (!S.done[k]) job.push({ day: k, theme: t.track + ' · ' + lsName(l, li),
                                   words: l.words, course: 1, kind: '직무' });
      }));
    });
  }
  const out = [];
  let i = 0, j = 0;
  let nw = Object.keys(S.done).filter(k => k[0] === 'J').length;
  while (out.length < n && (i < life.length || j < job.length)) {
    const useLife = j >= job.length || (i < life.length && nd <= nw * 2);   // 일상 둘에 직무 하나
    if (useLife) { out.push(life[i++]); nd++; } else { out.push(job[j++]); nw++; }
  }
  return out;
}

/* 홈 세로 지도(로드맵)에 보여줄 "최근에 끝낸 몇 과" — 끝낸 시각은 S.done[key] 가
   이미 담고 있다(끝낼 때 now() 를 넣는다, app.js 학습 마침 자리 참고). 새 값을 안 만든다. */

/* 세로 지도 그리기 — 완료(체크) · 지금(고리, 누르면 학습 시작) · 다음(자물쇠) 세 상태.
   '지금' 칸을 누르면 하는 일은 홈 일정판의 '오늘 학습' 칸과 **같아야** 한다(중복 금지) —
   그래서 그 손잡이(curFn)를 만들어 준 dailyFlowEntry() 에서 그대로 받아 쓴다.
   opt.freeNav=true 면 잠그지 않고 전부 눌러도 된다 — GYBM 챕터처럼 실제 수업 진도를
   따라가야 해서 앱이 순서를 강제하면 안 되는 경우다(대표님 지시, 2026-09-22: "길따라
   올라가듯이 선택하면서" 두오링고 지도를 GYBM에도 적용). 이때 🔒 대신 과 번호(nd.num)를 보여준다. */
/* 챕터 목록 — **단추를 늘어놓는다** (대표님 지시 2026-09-27: "길 가는 것처럼 보이는 컨셉은 없애자.
   그냥 버튼 눌러서 할 수 있도록"). 옛 이름(renderRoadmap)은 부르는 데가 많아 그대로 두고 속만 바꿨다.
   줄마다 번호 · 제목 · 끝냈으면 ✓. 부제 글줄은 그리지 않는다. 어느 과든 눌러 들어간다. */
function renderRoadmap(host, nodes, curKey, opt) {
  host.textContent = '';
  host.classList.add('ulist');
  if (!nodes.length) return;
  nodes.forEach((nd, i) => {
    const row = el('button', 'ubtn' + (nd.done ? ' done' : ''));
    row.type = 'button'; if (nd.key != null) row.dataset.key = nd.key;
    row.append(el('span', 'unum', nd.num != null ? String(nd.num) : String(i + 1)));
    if (!/^\d+$/.test(String(nd.title || '').trim())) row.append(el('span', 'utitle', esc(nd.title) + (nd.rel ? '<small class="urel">' + esc(nd.rel) + '</small>' : '')));   // 선배 자료처럼 숫자만인 제목은 번호로만 (2026-09-27 밤) · 관련 과 한 줄 (2026-09-29)
    row.append(el('span', 'ust', nd.done ? '✓' : '›'));
    if (nd.fn) row.onclick = nd.fn;
    host.append(row);
  });
}

/* 목차의 레슨 줄들을 단추 목록으로 — 회화(일상·직무·기본기+문법)와 GYBM 이 같은 모양.
   nodes: [{key, title, num, done, fn}]  list: #dayList 같은 <ul> */
function roadInList(list, nodes, opt) {
  const li = el('li', 'roadli');
  const box = el('div', 'ulist');
  li.append(box); list.append(li);
  renderRoadmap(box, nodes, null, { freeNav: true });
  /* 다음 할 것(첫 미완)을 표시하고 그 자리로 굴린다 (대표님 지시 2026-09-27 밤: "방금 학습한 것과 다음 학습할 쪽이 바로 보이도록") */
  const o = opt || {};
  const tgt = o.focusKey ? box.querySelector('[data-key="' + String(o.focusKey).replace(/"/g, '') + '"]') : box.querySelector('.ubtn:not(.done)');
  if (tgt && o.focus !== false) { tgt.classList.add('next'); setTimeout(() => { try { tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }, 60); }
}

/* ---------- 홈 (대표님 지시 2026-09-27: 딱 세 덩이) ----------
   ① 인사 + 연속 학습  ② 키우는 앵무 '짜오'  ③ [오늘 학습][오늘 복습]
   왜 이 차례인가 — 첫 화면의 근거:
   · 연속 학습일을 맨 위에: 듀오링고가 그렇게 한다. 손실 회피(Kahneman & Tversky 1979) — 쌓아 둔 것을 잃기 싫어 돌아온다.
     듀오링고가 공개한 실험(2023 블로그)에서도 스트릭이 잔존율을 가장 크게 올린 장치였다.
   · 캐릭터 + 다음 단계 진행 막대: 부여된 진척 효과(Nunes & Drèze 2006) — 조금이라도 채워진 막대가 완주율을 높인다.
     '내가 키운다'는 소유 효과(Kahneman·Knetsch·Thaler 1990) — 다마고치가 학습을 놓기 어렵게 만든다.
   · 큰 단추 둘: 힉의 법칙(Hick 1952) — 고를 것이 적을수록 빨리 시작한다. 주 행동은 하나(파란 단추)뿐.
   · 글자 본문 16px 이상·설명 13px 이상, 누르는 곳 44px 이상(Apple HIG · WCAG 2.5.5). 주간 성적·업적·내일 예고는 내 정보로 옮겼다. */
const PET_NAME = '짜오';
const PET_STAGES = [
  { n: 0,   name: '알',       hint: '단어을 배우면 알이 깨어나요' },
  { n: 5,   name: '금 간 알',  hint: '조금만 더 — 곧 깨어나요' },
  { n: 20,  name: '아기 앵무', hint: '배운 단어만 말할 수 있어요' },
  { n: 80,  name: '어린 앵무', hint: '문장을 말하기 시작했어요' },
  { n: 250, name: '어른 앵무', hint: '이제 제법 대화가 돼요' },
  { n: 700, name: '박사 앵무', hint: '베트남어 박사예요' },
];
/* 배운 단어 — 세 창고(하루5분·선배·GYBM) 모두. 단어 안의 음절도 '배운 것'으로 친다(xin chào 를 배웠으면 chào 도) */
function petLearned() {
  const s = new Set();
  ['srs', 'ssrs', 'bsrs'].forEach(k => Object.keys(S[k] || {}).forEach(v => {
    const t = v.toLowerCase(); s.add(t); t.split(/\s+/).forEach(x => s.add(x));
  }));
  return s;
}
const petCount = () => new Set(['srs', 'ssrs', 'bsrs'].flatMap(k => Object.keys(S[k] || {}).map(v => v.toLowerCase()))).size;
function petStage(n) { let i = 0; PET_STAGES.forEach((st, k) => { if (n >= st.n) i = k; }); return i; }
/* 짜오가 할 말 — **배운 단어로만** 된 문장(예문·대화 문장 가운데 모든 단어을 배운 것). 없으면 배운 단어 하나. */
const petTok = t => t.toLowerCase().replace(/[.,!?;:…"“”'()]/g, ' ').split(/\s+/).filter(Boolean);
/* 짜오 말 만들기 — 배운 단어만으로 (대표님 지시 2026-09-27 밤: "배운 단어를 조합해 문장을 만들어도 된다. 시내+버스를 배웠으면 시내버스도").
   차례: ① 배운 단어로만 된 예문·대화 문장(petSay) ② 없으면 배운 단어를 문법 틀에 넣은 짧은 문장 ③ 그것도 안 되면 배운 단어 둘 나열("나 먹다").
   품사는 data/_pos.json(영어 위키낱말사전 첫 품사). 틀: 나+동사+명사(Tôi ăn cơm) · 나+형용사(Tôi vui) · 명사+này+형용사 · 나+동사 · 나 thích 명사 · 나 muốn 동사.
   합성어: 배운 두 단어를 붙인 것이 앱 단어면(xe + buýt = xe buýt) 명사로 쓴다. 한국어 뜻은 단어 뜻을 우리말 어순(주어 목적어 서술어)으로 나열한 것이라 매끈하지 않다. */
let POS = null, POS_P = null;
function posLoad() {
  if (POS) return Promise.resolve();
  if (!POS_P) POS_P = fetch('data/_pos.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { POS = j; }).catch(() => { POS = {}; });
  return POS_P;
}
const koStem = v => { const k = (GVOC && GVOC[v]) || ''; return String(k).split(/[,;(·/]/)[0].trim(); };
function petMake(whole) {
  if (!POS || !GVOC) return null;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const L = [...whole].filter(v => POS[v] && GVOC[v]);
  const by = k => L.filter(v => POS[v] === k);
  const PRON = ['tôi', 'em', 'anh', 'chị', 'bạn', 'mình', 'chúng ta', 'chúng tôi'];
  const pron = L.filter(v => PRON.includes(v));
  const Sv = pron.length ? pick(pron) : null;
  const FUNC = new Set(['muốn', 'thích', 'cần', 'phải', 'có thể', 'là', 'có', 'không', 'đi']);   // 틀 자체에 쓰는 말은 자리 채우기에서 뺀다
  const V = by('v').filter(v => !FUNC.has(v) && v !== Sv), N = by('n').filter(v => v !== Sv && !PRON.includes(v)), A = by('a');
  const comp = [];
  L.forEach(a => L.forEach(b => { if (a !== b && GVOC[a + ' ' + b]) comp.push(a + ' ' + b); }));   // 시내+버스 → 시내버스
  const NN = N.concat(comp);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const cands = [];
  if (Sv && V.length && NN.length) cands.push(() => { const v = pick(V), n = pick(NN); return { vi: cap(`${Sv} ${v} ${n}.`), ko: `${koStem(Sv)} ${koStem(n)} ${koStem(v)}` }; });
  if (Sv && A.length) cands.push(() => { const a = pick(A); return { vi: cap(`${Sv} ${a}.`), ko: `${koStem(Sv)} ${koStem(a)}` }; });
  if (NN.length && A.length && whole.has('này')) cands.push(() => { const n = pick(NN), a = pick(A); return { vi: cap(`${n} này ${a}.`), ko: `이 ${koStem(n)} ${koStem(a)}` }; });
  if (Sv && V.length) cands.push(() => { const v = pick(V); return { vi: cap(`${Sv} ${v}.`), ko: `${koStem(Sv)} ${koStem(v)}` }; });
  if (Sv && whole.has('thích') && NN.length) cands.push(() => { const n = pick(NN); return { vi: cap(`${Sv} thích ${n}.`), ko: `${koStem(Sv)} ${koStem(n)} 좋아하다` }; });
  if (Sv && whole.has('muốn') && V.length) cands.push(() => { const v = pick(V); return { vi: cap(`${Sv} muốn ${v}.`), ko: `${koStem(Sv)} ${koStem(v)} 원하다` }; });
  if (cands.length) return pick(cands)();
  const all = [...whole].filter(v => GVOC[v]);
  if (all.length >= 2) { const a = pick(all), b = pick(all.filter(x => x !== a)); return { vi: cap(a + ' ' + b), ko: koStem(a) + ' ' + koStem(b) }; }
  return null;
}
function petSay(learned) {
  if (!learned.size) return null;
  const pool = [];
  const push = (vi, ko) => { const tk = vi ? petTok(vi) : []; if (tk.length >= 2 && tk.every(t => learned.has(t))) pool.push({ vi, ko }); };
  allWords().forEach(w => { if (w.ex && w.ex.vi) push(w.ex.vi, w.ex.ko); });
  allSents().forEach(x => push(x.vi, x.ko));
  if (!pool.length) {                                   // 통째로 배운 문장이 없으면 배운 단어로 짧은 문장을 만든다 (2026-09-27 밤)
    const whole = new Set(['srs', 'ssrs', 'bsrs'].flatMap(k => Object.keys(S[k] || {}).map(v => v.toLowerCase())));
    if (!GVOC) glossAll('a');                            // GVOC(단어→뜻)를 채운다
    if (!POS) posLoad().then(() => { if (!$('#home').hidden) renderHome(); });
    const g = petMake(whole);
    if (g) pool.push(g);
    else ['srs', 'ssrs', 'bsrs'].forEach(k => Object.keys(S[k] || {}).forEach(v => { const it = findItem(v); pool.push({ vi: v, ko: it && it.ko || '' }); }));
  }
  if (!pool.length) return null;
  const cand = pool.filter(p => p.vi !== S.petLast);
  const src = cand.length ? cand : pool;
  const pick = src[Math.floor(Math.random() * src.length)];
  S.petLast = pick.vi; save();
  return pick;
}
/* 앵무 그림은 pet.js 의 petSvg(stage, 종, 옵션) 이 그린다 (2026-09-27 저녁 — 종별 뼈대 하나·부위별 움직임). */
function homeGreet() {
  const g = el('div', 'hgreet');
  const top = el('div', 'htop');                          // 인사와 연속·누적을 한 줄에 (대표님 지시 2026-09-30: "불필요한 공간 낭비 말자")
  top.append(el('div', 'hname', tr('반갑습니다, ') + esc(S.nick || tr('학습자')) + tr('님')));
  const dots = weekDots();
  const row = el('div', 'hstreak');
  row.append(el('span', 'hpill fire', '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>' + tr('연속') + ' ' + streakDays() + tr('일')));
  row.append(el('span', 'hpill', tr('누적') + ' ' + Object.keys(S.act || {}).length + tr('일')));
  top.append(row);
  g.append(top);
  const wk = el('div', 'hdots');
  tr('월 화 수 목 금 토 일').split(' ').forEach((lab, i) => {
    const x = dots[i] || {};
    const c = el('div', 'hdot' + (x.done ? ' on' : '') + (x.today ? ' today' : '') + (x.future ? ' fut' : ''));
    c.append(el('i', null, x.done ? '✓' : ''), el('span', null, lab));
    wk.append(c);
  });
  g.append(wk);
  return g;
}
/* 지금까지 얼마나 배웠나 — 단어·외운 단어·세트 막대 (대표님 지시 2026-09-27 오후) */
function homeProgress() {
  const box = el('div', 'hprog');
  box.append(el('div', 'hsttl', tr('지금까지')));
  const learned = petCount();
  const memo = ['srs', 'ssrs', 'bsrs'].reduce((a, k) => a + Object.values(S[k] || {}).filter(v => v.lv >= 2).length, 0);
  const allW = new Set(allWords().map(w => (w.vi || '').toLowerCase()));
  if (GYBM) gybmAllWords().forEach(w => allW.add((w.vi || '').toLowerCase()));
  const st = studyStats();
  const line = (k, v, t) => {
    const r = el('div', 'hprow');
    r.append(el('span', 'hpk', k), el('span', 'hpv', '<b>' + v.toLocaleString('ko-KR') + '</b> / ' + t.toLocaleString('ko-KR')));
    const bar = el('div', 'hpbar'); const f = el('i'); f.style.width = (t ? Math.min(100, Math.round(v / t * 100)) : 0) + '%'; bar.append(f);
    box.append(r, bar);
  };
  line(tr('배운 단어'), learned, allW.size);
  line(tr('외운 단어'), memo, learned || 1);
  line(tr('끝낸 세트'), st.words[0], st.words[1]);
  return box;
}
/* 실력 분석 — 홈에 바로 보인다(누적 다섯 영역). 자세한 것은 › (대표님 지시: 토글로 가리지 말 것) */
function homeSkills() {
  const box = el('div', 'hskill');
  const hd = el('button', 'hsttl go'); hd.type = 'button'; hd.append(el('span', null, tr('실력 분석')), el('span', 'parrow', '›'));
  hd.onclick = () => { dive(renderHome); renderAnalysisPage(); };
  box.append(hd);
  const subj = analysisData('all');
  box.append(bars(subj.map(x => [x.name, x.pct === null ? 0 : x.pct, x.n, undefined, null, x.ok])));
  return box;
}
/* 베트남 기사 — 실력 분석 밑 (대표님 2026-10-01: "누르면 최근 5일 날짜 버튼 → 누르면 카드뉴스 그대로").
   카드뉴스 그림(img/card/<날짜>-<n>-{1,2}.webp, tools/card_news.py)이 실제로 있는 날만 센다 — 만들지 못한 날(9/27·9/29)은 빈 화면이 되니까. */
function homeNews() {
  const box = el('div', 'hskill');
  const hd = el('button', 'hsttl go'); hd.type = 'button'; hd.append(el('span', null, tr('베트남 기사')), el('span', 'parrow', '›'));
  hd.onclick = () => { dive(renderHome); newsDatesEntry(); };
  box.append(hd);
  return box;
}
const cardOk = src => new Promise(res => { const im = new Image(); const t = setTimeout(() => res(false), 8000); im.onload = () => { clearTimeout(t); res(true); }; im.onerror = () => { clearTimeout(t); res(false); }; im.src = src; });
async function newsDatesEntry() {
  const b = $('#subBody'); b.textContent = '';
  b.append(el('p', 'lede', tr('불러오는 중…')));
  show('sub', '베트남 기사', true);
  const days = await newsSets();
  const by = {};
  days.forEach(d => { (by[d.ts] = by[d.ts] || []).push(d); });
  const dates = Object.keys(by).sort().reverse().slice(0, 12);
  const has = await Promise.all(dates.map(async ts => (await Promise.all(by[ts].map((d, i) => cardOk(`img/card/${ts}-${i + 1}-1.webp`)))).filter(Boolean).length));
  const pick = dates.map((ts, i) => [ts, has[i]]).filter(x => x[1] > 0).slice(0, 5);
  if ($('#title').textContent !== tr('베트남 기사')) return;          // 그새 다른 화면으로 갔으면 그대로 둔다
  b.textContent = '';
  if (!pick.length) { b.append(el('p', 'note', tr('카드뉴스가 아직 없습니다'))); return; }
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  pick.forEach(([ts, n]) => {
    const dt = new Date(ts + 'T00:00:00');
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, esc((dt.getMonth() + 1) + tr('월') + ' ' + dt.getDate() + tr('일') + ' (' + tr(WD[dt.getDay()]) + ')')), el('span', 'msub', tr('기사 N개').replace('N', n)));
    btn.onclick = () => { dive(newsDatesEntry); newsDayCards(ts, by[ts]); };
    b.append(btn);
  });
}
/* 그날 카드뉴스 — 단어 카드처럼 한 장씩 옆으로 넘긴다 (대표님 2026-10-01 "단어카드처럼 옆으로 넘기는 형태 — 어플에 통일감").
   화면 양옆 붙박이 ‹ › 단추(.pagearrow, 단어 카드와 같은 것) + 손가락·마우스로 밀기 + 화살표 키. 밑에 '3 / 20'.
   그 날 기사들의 카드(기사마다 두 장)를 차례로 잇는다. 그림이 없는 장은 미리 걸러 뺀다. 그림은 길게 누르면 폰에 저장된다 */
async function newsDayCards(ts, list) {
  const b = $('#subBody'); b.textContent = '';
  const dt = new Date(ts + 'T00:00:00');
  show('sub', (dt.getMonth() + 1) + tr('월') + ' ' + dt.getDate() + tr('일'), true);
  b.append(el('p', 'lede', tr('불러오는 중…')));
  const all = [];
  list.forEach((d, i) => [1, 2].forEach(n => all.push({ d, src: `img/card/${ts}-${i + 1}-${n}.webp` })));
  const ok = await Promise.all(all.map(x => cardOk(x.src)));
  const pages = all.filter((x, k) => ok[k]);
  b.textContent = '';
  if (!pages.length) { b.append(el('p', 'note', tr('카드뉴스가 아직 없습니다'))); return; }
  let i = 0;
  const head = el('div', 'newstop newshead');
  const frame = el('div', 'card newscard');
  const im = el('img', 'cardimg'); im.alt = tr('카드뉴스');
  frame.append(im);
  const link = el('a', 'ghost newslink'); link.target = '_blank'; link.rel = 'noopener';
  const pos = el('div', 'newspos');
  const prev = el('button', 'pagearrow left', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', tr('이전'));
  const next = el('button', 'pagearrow right', '›'); next.type = 'button'; next.setAttribute('aria-label', tr('다음'));
  const draw = () => {
    const pg = pages[i], d = pg.d;
    head.textContent = '';
    if (d.cat) head.append(el('i', 'newscat', esc(d.cat)));
    head.append(el('b', null, esc(d.theme || '')));
    im.src = pg.src;
    if (pages[i + 1]) { const pre = new Image(); pre.src = pages[i + 1].src; }   // 다음 장을 미리 받아 둔다
    if (d.u) { link.hidden = false; link.href = d.u; link.textContent = '🔗 ' + tr('기사 보러가기'); } else link.hidden = true;
    pos.textContent = (i + 1) + ' / ' + pages.length;
    prev.disabled = i <= 0; next.disabled = i >= pages.length - 1;
  };
  const go = dir => { const j = i + dir; if (j < 0 || j >= pages.length) return; i = j; draw(); };
  prev.onclick = () => go(-1); next.onclick = () => go(1);
  /* 밀기 — 단어 카드와 같은 규칙: 가로가 40px 넘고 세로의 1.5배 넘을 때만(긴 화면을 스크롤하다 넘어가지 않게) */
  let x0 = null, y0 = null;
  frame.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  frame.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  }, { passive: true });
  let m0 = null, my0 = null;
  frame.addEventListener('mousedown', e => { m0 = e.clientX; my0 = e.clientY; e.preventDefault(); });   // 그림 끌기(드래그 저장) 대신 넘기기
  frame.addEventListener('mouseup', e => {
    if (m0 === null) return;
    const dx = e.clientX - m0, dy = e.clientY - my0; m0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  });
  const onKey = e => {
    if (!b.contains(frame)) { window.removeEventListener('keydown', onKey); return; }   // 다른 화면으로 가면 풀린다
    if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1);
  };
  window.addEventListener('keydown', onKey);
  b.append(head, frame, pos, link, prev, next);
  draw();
}
/* ---------- 짜오 살림 — 돈(동)·먹이·둥지·알 상점 (대표님 지시 2026-09-27 저녁) ----------
   돈 = 기존 점수 창고(credits: earn/spend. 값의 근거는 tools/pricing.py · docs/scoring-basis.md). 화면 이름만 '동'(đồng).
   먹이 = 베트남 과일(단어 하나씩). 배부름 재기는 뺐다(대표님: "배부름 없애도 될 듯") — 먹이면 먹고 웃고 그 과일 이름을 말한다.
   둥지 = 키우는 새 여러 마리. 처음 알은 왕관앵무(여섯 종 중 가장 작다). 다른 알은 상점에서 동으로 산다(클수록 비싸다, 청금강=홍금강).
   새마다 자라는 기준은 **그 알을 얻은 뒤 배운 단어 수** — 첫 새는 0부터. 먹이는 기분만 바꾼다. 배움이 아닌 것으로 자라면 안 된다. */
const PET_FOOD = [
  { k: 'seed',       vi: 'hạt hướng dương', ko: '해바라기씨', cost: 10 },
  { k: 'millet',     vi: 'hạt kê',          ko: '조(기장)',   cost: 10 },
  { k: 'banana',     vi: 'chuối',           ko: '바나나',     cost: 20 },
  { k: 'apple',      vi: 'táo',             ko: '사과',       cost: 20 },
  { k: 'orange',     vi: 'cam',             ko: '오렌지',     cost: 25 },
  { k: 'guava',      vi: 'ổi',              ko: '구아바',     cost: 25 },
  { k: 'grape',      vi: 'nho',             ko: '포도',       cost: 30 },
  { k: 'strawberry', vi: 'dâu tây',         ko: '딸기',       cost: 30 },
  { k: 'mango',      vi: 'xoài',            ko: '망고',       cost: 35 },
  { k: 'watermelon', vi: 'dưa hấu',         ko: '수박',       cost: 35 },
  { k: 'papaya',     vi: 'đu đủ',           ko: '파파야',     cost: 35 },
  { k: 'coconut',    vi: 'dừa',             ko: '코코넛',     cost: 40 },
  { k: 'dragon',     vi: 'thanh long',      ko: '용과',       cost: 50 },
  { k: 'lychee',     vi: 'vải',             ko: '리치',       cost: 50 },
  { k: 'rambutan',   vi: 'chôm chôm',       ko: '람부탄',     cost: 50 },
  { k: 'mangosteen', vi: 'măng cụt',        ko: '망고스틴',   cost: 60 },
  { k: 'durian',     vi: 'sầu riêng',       ko: '두리안',     cost: 100 },
];
function petState() {
  if (!S.pet || !Array.isArray(S.pet.birds)) {              // 옛 꼴({sp, seen}) → 둥지 꼴로
    const old = S.pet || {};
    S.pet = { birds: [{ sp: PET_SPECIES[old.sp] ? old.sp : 'cockatiel', born: 0, seen: typeof old.seen === 'number' ? old.seen : -1, name: (S.petName || '').trim() || '' }], cur: 0, fed: old.fed || 0 };
    save();
  }
  const p = S.pet;
  if (!p.birds.length) p.birds.push({ sp: 'cockatiel', born: 0, seen: -1, name: '' });
  p.birds.forEach(b => { if (!PET_SPECIES[b.sp]) b.sp = 'cockatiel'; });
  p.cur = Math.min(Math.max(0, p.cur || 0), p.birds.length - 1);
  return p;
}
const petCur = () => { const p = petState(); return p.birds[p.cur]; };
const birdN = b => Math.max(0, petCount() - (b.born || 0));          // 이 새를 얻은 뒤 배운 단어 수
/* 짜오 이름 — 새마다 따로. 첫 새의 기본은 '짜오', 산 새의 기본은 종 이름. 별명과 같게는 못 짓는다 */
const petName = () => { const b = petCur(); return (b.name || '').trim() || (petState().cur === 0 ? PET_NAME : PET_SPECIES[b.sp].name); };
const petAsleep = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };
const COIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#F5C542"/><circle cx="12" cy="12" r="6.8" fill="none" stroke="#C99A1E" stroke-width="1.6"/></svg>';
const coinPill = () => el('span', 'petcoin', COIN_SVG + credits().bal.toLocaleString('ko-KR') + tr('동'));
const sheetClose = (back, box) => { const no = el('button', 'ghost', tr('닫기')); no.type = 'button'; no.onclick = () => back.remove(); const row = el('div', 'bugbtns'); row.append(no); box.append(row);
  back.append(box); back.onclick = e => { if (e.target === back) back.remove(); }; document.body.append(back); };
/* 상점 — 먹이(지금 앞에 선 새에게 바로 준다)와 알(둥지에 새 새)을 한 창에 (대표님 지시 2026-09-27: "먹이 주기 버튼 대신 상점. 먹이도 팔고 알도 팔고") */
function petShop(onFed) {
  const p = petState(), bird = petCur(), si = petStage(birdN(bird));
  const back = el('div', 'modalback'), box = el('div', 'modalbox feedbox');
  const hd = el('div', 'pairpophd'); hd.append(el('b', null, tr('상점')), coinPill()); box.append(hd);
  box.append(el('div', 'shopsec', tr('먹이') + ' <small>' + esc(petName()) + tr('에게 바로 줘요') + '</small>'));
  const list = el('div', 'feedlist foods');
  PET_FOOD.forEach(f => {
    const r = el('div', 'feedrow');
    r.append(el('span', 'ficon', petFoodSvg(f.k, 34)));
    const bd = el('div', 'fbody'), top = el('div', 'ftop');
    const pl = iconBtn('play', tr('듣기'), ev => { ev.stopPropagation(); const k = recKey(f.vi); k ? play(k, false, null, spdOf()) : speakVi(f.vi, false, spdOf()); });
    pl.classList.add('playi');
    top.append(el('span', 'fvi', esc(f.vi)), pl);
    bd.append(top, el('span', 'fko', esc(f.ko)));
    const b = el('button', 'primary', f.cost + tr('동')); b.type = 'button';
    b.disabled = si < 2 || credits().bal < f.cost;
    b.onclick = () => { if (!spend(f.cost)) return; p.fed = (p.fed || 0) + 1; save(); back.remove(); onFed(f); };
    r.append(bd, b); list.append(r);
  });
  box.append(list);
  if (si < 2) box.append(el('div', 'pnote', tr('알은 아직 먹지 않아요 — 깨어나면 줄 수 있어요')));
  else if (credits().bal < PET_FOOD[0].cost) box.append(el('div', 'pnote', tr('동이 모자라요 — 세트를 끝내거나 복습하면 벌어요')));
  box.append(el('div', 'shopsec', tr('알') + ' <small>' + tr('산 뒤에 배운 단어로 자라요 · 큰 앵무일수록 비싸요') + '</small>'));
  const eggs = el('div', 'feedlist');
  PET_ORDER.forEach(k => {
    const sp = PET_SPECIES[k];
    if (!sp.price) return;                                   // 왕관앵무는 처음부터 있다
    const owned = p.birds.some(b => b.sp === k);
    const r = el('div', 'feedrow');
    r.append(el('span', 'ficon big', petSvg(4, k, { label: sp.name })));
    const bd = el('div', 'fbody');
    bd.append(el('span', 'fvi', esc(sp.name)), el('span', 'fko', esc(sp.vi)));
    const b = el('button', 'primary', owned ? tr('있음') : sp.price.toLocaleString('ko-KR') + tr('동')); b.type = 'button';
    b.disabled = owned || credits().bal < sp.price;
    b.onclick = () => {
      if (!spend(sp.price)) return;
      p.birds.push({ sp: k, born: petCount(), seen: -1, name: '' }); p.cur = p.birds.length - 1; save();
      back.remove(); renderHome();
    };
    r.append(bd, b); eggs.append(r);
  });
  box.append(eggs);
  sheetClose(back, box);
}
/* 둥지 — 가진 새들의 작은 그림. 누르면 그 새를 앞에 세운다 */
function nestRow(p) {
  const row = el('div', 'nest');
  p.birds.forEach((b, i) => {
    const bt = el('button', 'nestbtn' + (i === p.cur ? ' on' : '')); bt.type = 'button';
    const nm = (b.name || '').trim() || (i === 0 ? PET_NAME : PET_SPECIES[b.sp].name);
    bt.innerHTML = petSvg(petStage(birdN(b)), b.sp, { label: nm }); bt.title = nm;
    bt.onclick = () => { if (p.cur !== i) { p.cur = i; save(); renderHome(); } };
    row.append(bt);
  });
  return row;                                            // 알은 [상점]에서 산다 (둥지의 ＋ 는 뺐다)
}
function petCard() {
  const card = el('div', 'petcard');
  const learned = petLearned();
  const p = petState(), bird = petCur();
  const n = birdN(bird), si = petStage(n), st = PET_STAGES[si], nx = PET_STAGES[si + 1];
  const asleep = si >= 2 && petAsleep();
  const bub = el('div', 'petbub');
  const line = (vi, ko) => {
    bub.hidden = false; bub.textContent = '';
    // 문장의 단어를 누르면 헷갈리는 짝 팝업 (대표님 지시 2026-09-27 저녁) — 낱말 카드의 예문과 같은 tapLine
    if (/\s/.test(vi.trim())) { const tl = tapLine(vi, 'petvi tapline'); tl.onclick = ev => ev.stopPropagation(); bub.append(tl); }
    else bub.append(el('span', 'petvi', esc(vi)));
    const pl = iconBtn('play', tr('듣기'), ev => { ev.stopPropagation(); const k = recKey(vi); k ? play(k, false, null, .8) : speakVi(vi, false, .8); });   // 짜오 말은 0.8배 고정 (대표님 지시 2026-09-27 밤)
    pl.classList.add('playi'); bub.append(pl);
    if (ko) bub.append(el('span', 'petko', esc(ko)));
  };
  const setBub = q => {
    if (si < 2) { bub.hidden = true; return; }                       // 알 단계에는 말풍선이 없다
    if (!q) { line('Xin chào!', tr(st.hint)); return; }
    line(q.vi, q.ko);
  };
  if (asleep) { bub.textContent = ''; bub.append(el('span', 'petko', tr('자는 중이에요 (밤 10시부터 아침 6시까지)'))); }
  else setBub(petSay(learned));
  // 단계가 올랐으면 한 번짜리 움직임 — 금 가기(1) · 깨기(2) · 커지기(3~)
  let anim = '';
  if (bird.seen < 0) { bird.seen = si; save(); }
  else if (si > bird.seen) { anim = si === 1 ? 'crack' : si === 2 ? 'hatch' : 'grow'; bird.seen = si; save(); }
  const fig = el('button', 'petfig'); fig.type = 'button'; fig.setAttribute('aria-label', petName() + ' — ' + tr('누르면 말해요'));
  fig.innerHTML = petSvg(si, bird.sp, { hatch: anim === 'hatch', label: petName() });
  if (si < 2) fig.classList.add('wob');
  if (asleep) fig.classList.add('sleep');
  if (anim) { fig.classList.add(anim); if (anim !== 'hatch') setTimeout(() => fig.classList.remove(anim), 2600); }
  const once = (cls, ms) => new Promise(r => { fig.classList.remove(cls); void fig.offsetWidth; fig.classList.add(cls); setTimeout(() => { fig.classList.remove(cls); r(); }, ms); });
  fig.onclick = () => {
    if (asleep) { fig.classList.remove('sleep'); once('hop', 600); setTimeout(() => fig.classList.add('sleep'), 6000); return; }   // 깨우면 잠깐만 일어난다
    once('hop', 600);
    if (si >= 2) setBub(petSay(learned));
  };
  const meta = el('div', 'petmeta');
  const bar = el('div', 'petbar'); const fill = el('i');
  const pct = nx ? Math.min(100, Math.round((n - st.n) / (nx.n - st.n) * 100)) : 100;
  fill.style.width = pct + '%'; bar.append(fill);
  meta.append(bar, el('div', 'petcap', tr(p.cur === 0 ? '배운 단어' : '함께 배운 단어') + ' ' + n + (nx ? ' · ' + tr('다음 단계까지') + ' ' + (nx.n - n) : '')));
  const row = el('div', 'petrow');
  row.append(nestRow(p));
  {
    const fb = el('button', 'feedbtn', tr('상점')); fb.type = 'button';
    fb.onclick = () => petShop(async f => {
      fig.classList.remove('sleep');
      fig.innerHTML = petSvg(si, bird.sp, { food: f.k, label: petName() });
      await once('eat', 1700);
      fig.innerHTML = petSvg(si, bird.sp, { label: petName() });   // 먹이 그림을 치우고 웃는다
      line(f.vi.charAt(0).toUpperCase() + f.vi.slice(1) + '! Ngon quá!', f.ko + '! ' + tr('맛있어요!'));
      await once('laugh', 1500);
      renderHome();
    });
    row.append(fb);
  }
  meta.append(row);
  const head = el('div', 'pethead');
  const nm = el('button', 'petnm', esc(petName()) + ' <i>✎</i>'); nm.type = 'button'; nm.title = tr('이름 바꾸기');
  nm.onclick = async () => { const v = await askText(tr('짜오 이름'), petName(), 10); if (v === null) return; if (v && v === (S.nick || '').trim()) { popup(tr('별명과 같은 이름은 안 됩니다 — 짜오를 부를 때 헷갈립니다')); return; } bird.name = v; save(); renderHome(); };
  head.append(nm, coinPill());              // '1단계 · 알' 같은 단계 글은 뺐다 (대표님 지시 2026-09-27 저녁)
  card.append(head, bub, fig, meta);
  return card;
}
/* 짜오 이름 — 사용자가 지어 줄 수 있다 (대표님 물음 2026-09-27: 별명과는 별개, 겹쳐도 됨). 기본 '짜오' */
function askText(title, cur, max) {
  return new Promise(res => {
    const back = el('div', 'modalback'), box = el('div', 'modalbox');
    box.append(el('div', 'pairpophd', '<b>' + esc(title) + '</b>'));
    const inp = document.createElement('input'); inp.className = 'keyin'; inp.value = cur || ''; inp.maxLength = max || 12; inp.style.width = '100%';
    const row = el('div', 'bugbtns');
    const ok = el('button', 'primary', tr('저장')), no = el('button', 'ghost', tr('취소'));
    ok.type = no.type = 'button';
    ok.onclick = () => { back.remove(); res(inp.value.trim()); };
    no.onclick = () => { back.remove(); res(null); };
    row.append(no, ok); box.append(inp, row); back.append(box);
    back.onclick = e => { if (e.target === back) { back.remove(); res(null); } };
    document.body.append(back); setTimeout(() => inp.focus(), 50);
  });
}
/* 홈 아래 '설정' 덩이 — 내 정보 화면을 없애고 여기로 (대표님 지시 2026-09-27 오후):
   하루 분량(−/+), 알림(스위치), 실력 분석, 별명·계정 줄 */
function homeSettings() {
  const box = el('div', 'hset');
  const row = (label, right, fn) => {
    const r = el(fn ? 'button' : 'div', 'hsrow' + (fn ? ' go' : ''));
    if (fn) { r.type = 'button'; r.onclick = fn; }
    r.append(el('span', 'hsk', label));
    if (right) r.append(right);
    if (fn) r.append(el('span', 'parrow', '›'));
    box.append(r); return r;
  };
  // 하루 분량 설정은 없앴다 (2026-09-27 저녁) — 홈의 [이어서 학습]이 마지막 갈래의 다음 세트 하나를 잇는다

  // 실력 분석 줄은 뺐다 — 그래프가 바로 위에 있고 그 머리(›)가 자세히 보기로 간다 (대표님 지시 2026-09-27 저녁)
  // 계정 — [별명 바꾸기]는 뺐다 (대표님 지시 2026-09-30: 아이디가 곧 별명이라 별명을 바꾸면 아이디가 바뀐다). 아이디·별명 글자도 안 적는다 — 인사말에 이미 있다
  const acct = el('span', 'hslinks');
  /* 한 줄 (대표님 2026-09-30: "계정·진도 동기화·알림 버튼을 한 줄로. 동기화는 자동으로") — 진도 동기화는 저장할 때마다·앱을 뒤로 보낼 때·홈에 설 때 저절로 되므로 단추를 뺐다.
     오류가 나면 로그인 안내 팝업이 한 번 뜬다(cloudSync). 이 줄: 로그아웃(또는 로그인·가입) · 비밀번호 찾기 질문 · 알림 켜기/끄기 · 진도 초기화 · 탈퇴 */
  const lo = el('button', 'metext', S.acct ? tr('로그아웃') : tr('로그인·가입')); lo.type = 'button';
  lo.onclick = async () => {
    if (S.acct) { if (await askYN(tr('로그아웃할까요?'), '로그아웃')) { S.lastId = S.acct.id; S.acct = null; save(); renderHome(); } }
    else acctForm();
  };
  acct.append(lo);
  if (S.acct) { const qb = el('button', 'metext', tr('비밀번호 질문')); qb.type = 'button'; qb.onclick = () => setqForm(renderHome); acct.append(qb); }
  if (canPush()) {                                         // 알림 — 글자 단추: '알림 켜기' 를 누르면 켜지고 '알림 끄기'로, 다시 누르면 꺼진다
    const pb = el('button', 'metext', tr(S.push ? '알림 끄기' : '알림 켜기')); pb.type = 'button';
    pb.onclick = async () => { pb.disabled = true; if (S.push) await stopPush(); else { const err = await askPush(); if (err) popup(esc(err)); } renderHome(); };
    acct.append(pb);
  }
  const rs = el('button', 'metext danger', tr('초기화')); rs.type = 'button'; rs.onclick = resetProgress; acct.append(rs);
  if (S.acct) { const q = el('button', 'metext danger', tr('탈퇴')); q.type = 'button'; q.onclick = quitForm; acct.append(q); }
  /* 자료 출처 — 사전 결과 밑 문구를 뺀 대신(대표님 2026-10-01) 여기 둔다. 위키낱말사전·한국어기초사전은 CC BY-SA 라 출처를 밝혀야 한다 */
  { const cr = el('button', 'metext', tr('출처')); cr.type = 'button';
    cr.onclick = () => popup(tr('사전 자료') + ': Wiktionary(영어판·베트남어판, CC BY-SA 4.0)의 뜻·예문·한자 어원과 국립국어원 한국어기초사전(CC BY-SA 2.0 KR)을 바탕으로 한국어로 옮겼습니다. [보충] 뜻은 수업 자료와 한국어기초사전 대역에서 더했습니다. 자주 쓰는 말 순위는 베트남어 위키백과(CC BY-SA 4.0) 글로 셌습니다.');
    acct.append(cr); }
  row(tr('계정') + (S.acct ? '' : ' <small>' + tr('기기에만 저장') + '</small>'), acct);
  if (S.admin) row(tr('운영 현황'), null, () => { dive(renderHome); showAdmin(); });
  return box;
}
/* 이어서 학습 — 마지막으로 공부한 갈래의 다음 세트 (대표님 물음 2026-09-27 저녁: "어떤 파트를 기본으로?" → 갈래를 정하지 않고,
   마지막에 하던 갈래를 잇는다. 하루 분량 설정은 없앴다). 갈래: life(일상) · job(직무) · gybm:<출처> · gram(기본기·문법).
   아무것도 안 했으면 일상 1과. 그 갈래를 다 끝냈으면 일상으로. */
function noteTrack(d) {
  let t = null;
  if (typeof d.day === 'number') t = 'life';
  else if (typeof d.day === 'string' && d.day.startsWith('J0.')) t = 'job';
  else if (typeof d.day === 'string' && d.day.startsWith('B:')) t = 'gybm:' + d.day.slice(2).replace(/\d+$/, '');
  else if (typeof d.day === 'string' && (d.day[0] === 'G' || d.day[0] === 'P')) t = 'gram';
  if (t && S.lastTrack !== t) { S.lastTrack = t; save(); }
}
const GRAM_ORD = [2, 3, 4, 7, 6, 8, 12, 13, 9, 10, 22, 11, 16, 17, 18, 14, 26, 15, 45, 20, 21, 39, 32, 28, 19, 23, 5, 27, 24, 30, 41, 25, 29, 31, 33, 34, 35, 36, 37, 38, 40, 42, 43, 44];
/* 방금 끝낸 세트의 **바로 다음** 세트 — 같은 갈래·같은 차례에서 하나 뒤. 마지막이면 없음(null).
   대표님 지시 2026-10-05: "다음 세트 누르면 그 챕터의 다음 챕터를 학습할 수 있어야지. 왜 다른 학습으로 가냐 · 마지막 챕터면 다음 챕터가 없는 거지"
   (전에는 resumeNext 로 '마지막 갈래의 안 끝난 첫 세트'를 골라, 22기·다 끝낸 갈래에서는 일상으로 넘어갔다) */
function nextAfter(d) {
  const k = d && d.day;
  if (typeof k === 'number') {
    const L = ALL.filter(x => typeof x.day === 'number' && !x.track && visibleDay(x)).sort((a, b) => (a.n || 0) - (b.n || 0));
    const i = L.findIndex(x => x.day === k), n = i >= 0 && L[i + 1];
    return n ? { d: n, name: n.theme || (trackName(n) + label(n)), kind: '일상' } : null;
  }
  if (typeof k !== 'string') return null;
  if (k.startsWith('J0.')) {
    const jv = jobVol(0); if (!jv) return null;
    const pick = S.jobpick || {}, any = jv.tracks.some(t => pick[t.track]), all = [];
    jv.tracks.forEach((t, ti) => { if (any && !pick[t.track]) return;
      t.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => all.push({ day: jkey(ti, ci, li), theme: t.track + ' · ' + lsName(l, li), words: l.words, course: 1, kind: '직무' }))); });
    const i = all.findIndex(x => x.day === k), n = i >= 0 && all[i + 1];
    return n ? { d: n, name: n.theme, kind: '직무' } : null;
  }
  if (k.startsWith('B:') && GYBM) {
    const src = GYBM.find(x => k.startsWith('B:' + x.key) && /^\d+$/.test(k.slice(2 + x.key.length)));
    if (!src) return null;
    const ni = +k.slice(2 + src.key.length) + 1, l = src.lessons[ni];
    return l ? { d: { theme: l.title, day: gybmKey(src.key, ni), basic: 1, words: l.words }, name: l.title, kind: src.label, box: 'bsrs' } : null;
  }
  if (/^H\d+$/.test(k) && GRAM) {
    const i = GRAM_ORD.indexOf(+k.slice(1));
    for (const ni of i >= 0 ? GRAM_ORD.slice(i + 1) : []) { const b = GRAM.books[0].bai[ni]; if (b && !b.ng) return { gram: [0, ni], name: b.t, kind: '문법' }; }
  }
  return null;
}
function resumeNext() {
  const t = S.lastTrack || 'life';
  const q = COURSE ? courseQueue(999) : [];
  if (t === 'job') { const j = q.find(d => d.kind === '직무'); if (j) return { d: j, name: j.theme, kind: '직무' }; }
  if (t.startsWith('gybm:') && t !== 'gybm:c22' && GYBM) {          // 22기는 학습에서 뺐다 — 이어서 학습은 일상으로
    const key = t.slice(5), src = GYBM.find(x => x.key === key);
    if (src) { const li = src.lessons.findIndex((l, i) => !bdone()[gybmKey(key, i)]);
      if (li >= 0) { const l = src.lessons[li]; return { d: { theme: l.title, day: gybmKey(key, li), basic: 1, words: l.words }, name: l.title, kind: src.label, box: 'bsrs' }; } }
  }
  if (t === 'gram' && GRAM) {
    /* 문법 화면과 같은 '자주 쓰는 순서'로 (tools/grammar_order/순서.tsv, 2026-10-01) */
    for (const ni of GRAM_ORD) if (GRAM.books[0].bai[ni] && !GRAM.books[0].bai[ni].ng && !S.done[gkey(0, ni)]) return { gram: [0, ni], name: GRAM.books[0].bai[ni].t, kind: '문법' };
  }
  const life = q.find(d => d.kind !== '직무');
  if (life) return { d: life, name: life.theme || (trackName(life) + label(life)), kind: '일상' };
  const j = q.find(d => d.kind === '직무');
  return j ? { d: j, name: j.theme, kind: '직무' } : null;
}
function homeActions() {
  const box = el('div', 'hact');
  // '학습 시작(오늘 학습)' 단추는 뺐다 (대표님 지시 2026-09-28: 하루 분량과 함께 없앤다). 학습은 학습 탭에서 고르고, 세트가 끝나면 [다음 세트 ›]가 잇는다
  const b2 = el('button', 'hbtn sec');
  const dn = dueCount();                                 // 세 창고 합 — 테스트 탭의 '오늘 복습'과 같은 숫자
  b2.append(el('b', null, tr('복습 시작')),
            el('small', null, dn ? dn + tr('개') : (S.revDay === ymd() ? tr('오늘 복습 완료') : tr('복습할 것 없음'))));
  b2.disabled = !dn; if (dn) b2.onclick = () => { ACTIVE_TAB = 'test'; testToday(); };   // 테스트 탭의 '오늘 복습'과 같은 문 (카드 → 테스트)
  // 훑어보기(쇼츠) 단추는 뺐다 (대표님 지시 2026-09-28 "훑어보기는 그냥 없애자")
  box.append(b2);
  return box;
}
function renderHome() {
  /* 홈에 설 때 다른 기기 진도를 받아 본다(받은 게 있으면 홈을 다시 그린다). 하루 첫 번에는 올리기도 한다.
     홈은 자주 다시 그려지므로 30초 안에 또 받지는 않는다 (2026-09-29) */
  if (Date.now() - cloudPulled > 30e3 || S.cloudAt !== ymd()) cloudPull();
  drawWxNow();
  // 한국어를 배우는 사람에게는 베트남어 일정판이 아무 뜻이 없다 — 딴 판을 그린다
  if (learnKo()) { drawKoHome(); show('home', '짜오짜오', false); return; }
  if (!COURSE) fetch('data/order.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { COURSE = j; loadCWords(); if (!$('#home').hidden) renderHome(); }).catch(() => {});
  $('#progress').textContent = ''; $('#progress').hidden = true;   // 통계·업적은 내 정보에서 본다
  if (!GYBM) gybmBuild(() => { if (!$('#home').hidden) renderHome(); });   // '지금까지'의 전체 단어·세트 수에 교재·시험 자료도 들어가게
  const plan = $('#plan');
  plan.textContent = '';
  // '복습 시작' 단추(homeActions)는 뺐다 (대표님 2026-10-01 "홈에 복습시작 그 버튼은 없애자") — 복습은 테스트 탭
  plan.append(homeGreet(), petCard(), homeProgress(), homeSkills(), homeNews(), homeSettings());
  show('home', '짜오짜오', false);
}

/* 업적 목록 — 예전엔 '내 정보' 화면 안에서만 보였다. 홈으로 옮기면서
   공용 함수로 뺐다(2026-09-09) — renderAwards()는 이제 이걸 안 부른다. */

/* 학습 과정 목록 — 트랙별로 보여준다 */
/* 일상 단어 목차 — 옛 직무(track:'work') 갈래는 2026-09-09에 order.json으로
   완전히 옮기고 여기선 지웠다. drawJob()이 직무 목차를 따로 그린다. */
function renderDays() {
  const list = $('#dayList');
  list.textContent = '';
  // n = 실제 학습 차례(기초→심화, 빈틈없이 1,2,3...). day는 예전에 쓰던 옛 번호라
  // 뒤섞여 있어도 정상이다 — 지금까지는 자료 배열 순서가 우연히 n 순서와 같아서
  // 문제가 없었는데, 언젠가 배열 순서가 어긋나면 목차가 조용히 뒤섞인다.
  // 그래서 n으로 직접 정렬해 확실하게 맞춘다 (2026-09-09).
  const days = ALL.filter(d => typeof d.day === 'number' && !d.track)
    .sort((a, b) => (a.n || 0) - (b.n || 0));

  /* 단추 목록 (2026-09-27: 길 그림 없앰). 번호·제목·끝냄 표시만 */
  const nodes = days.map((d, i) => ({ key: d.day, title: d.theme, num: i + 1, done: !!S.done[d.day],
                                      fn: () => { dive(renderDays); startLearn(d); } }));
  roadInList(list, nodes);
  show('course', '일상 단어', true);
}

/* ---------- 학습 ---------- */
let L = null;

function startLearn(d) {
  noteTrack(d);
  LCRUMB = crumbOf(d);                                 // 머리띠 '단어-교재-1 Xin chào · 1부' (2026-09-28 밤)
  // 순서: 단어 카드 → 확인 문제(암기 다지기) → 오늘의 대화(문장으로 써먹기).
  // 문장이 마무리인 이유: 외운 것을 산출(말하기)로 끝내야 하루가 완성된다.
  const items = [];
  // 설명은 책 표지처럼 맨 앞 한 장으로. 단어 화면에서는 사라져서 그림 자리를 벌어 준다.
  if (d.intro) items.push({ k: 'cover', d: {
    t: label(d) + ' · ' + d.theme, b: d.intro,
    // 표지 그림은 **그 과의 표지판**(cover). 그날 단어 그림 셋에 제목을 얹어 만든 것이라
    // 새로 뽑을 것이 없고, 제목이 진짜 글꼴로 박혀 있어 추상적인 주제도 알아본다.
    img: d.cover || (d.dialog && d.dialog.img) || (d.words || []).map(w => w.img).find(Boolean),
    emoji: (d.dialog && d.dialog.emoji) || '',
    // 사용법은 처음 세 세트에만. 그 뒤엔 손이 기억한다 — 계속 띄우면 잔소리가 된다.
    how: (Object.keys(S.done).filter(k => +k >= 1).length < 3)
      ? '<b>베트남어 글자를 누르면 소리가 납니다.</b> 예문 칸도 누르면 들립니다.<br>' +
        '🎤 따라 말하기 — <b>말하기</b>를 누르면 원어민과 높낮이를 겹쳐 보여줍니다.'
      : '',
    /* 문화 조각은 표지에서 뺐다 (대표님 지시, 2026-08-30) — 문화는 따로 한 권으로 모은다.
       표지는 그 과가 무엇인지만 말하면 된다. */
    pre: d.pre || [] } });
  (d.letters || []).forEach(x => items.push({ k: 'letter', d: x }));
  (d.tones || []).forEach(x => items.push({ k: 'tone', d: x }));
  (d.cmp || []).forEach(x => items.push({ k: 'cmp', d: x }));        // 헷갈리는 소리 짝 (기본기 P6)
  (d.after || []).forEach(x => items.push({ k: 'know', d: x }));     // 장 끝 읽을거리 한 장 (받침 규칙 등)
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  L = { day: d, items, i: 0 };
  drawCard();
  // 제목은 버튼 이름과 같게 — 준비 날들은 주제만 (준비 N 표기는 뺀다)
  show('learn', typeof d.day === 'string' ? d.theme : label(d) + ' · ' + d.theme, true);
  drawLessonTabs();
}
/* 학습 방법 탭 — 2026-09-25 대표님 지시로 강의·애니메이션·노래 단추를 없앴다
   ("단어카드만 남기고 위쪽 버튼은 없애자"). 카드 학습만 남으므로 탭 줄은 늘 숨긴다.
   새 레슨은 늘 카드부터 시작한다. */
function drawLessonTabs() {
  const bar = $('#lessonTabs');
  $('#card').hidden = false; $('#lessonExtra').hidden = true;
  bar.hidden = true;
  bar.textContent = '';
}

/* 단어의 예문 — 새로 짓지 않고 그날 대화·바꿔말하기에서 그 단어가 든 문장을 꺼내 쓴다.
   (모든 단어가 그날 문장 어딘가에 나오는 것은 조립 검증기가 보장한다. 음원도 이미 있다.)
   같은 문장이 열 단어에 붙으면 예문이 아니라 배경이 된다. 그래서 세트 안에서
   한 문장은 한 단어에만 준다 — 남는 단어가 없을 때만 다시 쓴다. */
const exNorm = t => t.toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
function exampleMap(day) {
  if (day._exmap) return day._exmap;
  const pool = [
    ...(day.dialog?.lines || []).map(l => ({ vi: l.vi, ko: l.ko, kr: l.kr_read })),
    ...(day.dialog?.extra || []).map(t => typeof t === 'string' ? { vi: t } : { vi: t.vi, ko: t.ko, kr: t.kr_read }),
  ];
  const holds = pool.map(p => ' ' + exNorm(p.vi) + ' ');
  const used = new Set(), map = {};
  const pick = (w, fresh) => {
    const t = ' ' + exNorm(w.vi) + ' ';
    for (let i = 0; i < pool.length; i++)
      if ((!fresh || !used.has(i)) && holds[i].includes(t)) { used.add(i); return pool[i]; }
    return null;
  };
  // 짧은 단어는 여러 문장에 걸리므로, 걸리는 문장이 적은 단어부터 먼저 고르게 한다
  const ws = [...(day.words || [])].sort((a, b) =>
    holds.filter(h => h.includes(' ' + exNorm(a.vi) + ' ')).length -
    holds.filter(h => h.includes(' ' + exNorm(b.vi) + ' ')).length);
  ws.forEach(w => { const h = pick(w, true); if (h) map[w.vi] = h; });
  ws.forEach(w => { if (!map[w.vi]) { const h = pick(w, false); if (h) map[w.vi] = h; } });
  return (day._exmap = map);
}
const exampleFor = (day, w) => exampleMap(day)[w.vi] || null;

/* 한글 독음: 기본 숨김. 시작 14일 뒤에는 아예 안 나온다 */
/* 한글 발음 — 항상 보여준다 (사용자 지시) */
function reveal(txt) {
  return txt ? el('div', 'krline', '[' + esc(txt) + ']') : el('span');
}

/* 예문의 단어마다 뜻을 붙인다 — 문장만 던져 주면 어느 조각이 어느 뜻인지 알 수가 없다.
   우리가 가르친 1,020개 사전에서 **긴 단어부터** 맞춘다
   (bao nhiêu 를 bao / nhiêu 로 쪼개면 뜻이 안 나온다).
   그래도 안 잡히는 몇 개만 아래에 따로 적어 둔다. */
const EXTRAG = { 'để': '~하도록·두다', 'dạ': '네 (공손)', 'mắc': '비싸다',
                 'ngàn': '천 (1,000)', 'nhất': '가장', 'bàn': '탁자' };
/* 예문에만 나오는 단어의 뜻 (data/exgloss.json) — này·đang·ở 처럼 과정 단어표에 없는 말들.
   없으면 예문 단어을 눌렀을 때 「아직 뜻이 없는 단어입니다」가 뜬다 (466종 3,201회였다).
   대표님 지시(2026-08-30): 예문 단어도 소리·발음·뜻이 다 나와야 한다. */
let EXG = {};
fetch('data/exgloss.json').then(r => r.json()).then(j => { EXG = j; GVOC = null; GKR = null; }).catch(() => {});
/* 남부 딱지 (대표님 지시 2026-09-29: "작은 딱지는 남부만 넣어. 기준은 북부니까") — data/_south.json {낱말: {n: 북부 말, s: 어느 뜻일 때, w: 근거}}.
   판정은 tools/south/남부.tsv (낱말마다 위키낱말사전 지역 표시·교재 표기를 근거로). 붙은 말 접기(nấu ăn→nấu)는 대표님 지시로 걷어냈다("인터넷 대형 사전처럼 분리"). */
let SOUTH = {}, SOUTH_P = null;
function southLoad() {
  if (!SOUTH_P) SOUTH_P = fetch('data/_south.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { SOUTH = j; }).catch(() => { SOUTH = {}; });
  return SOUTH_P;
}
southLoad();
const southOf = vi => SOUTH[String(vi || '').trim().toLowerCase()] || null;
/* 남부 말 줄 — "남부 말 (○○ 뜻일 때) · 북부에서는 ○○ 🔊". 북부 말을 누르면 그 말의 짝 팝업, 스피커는 북부 말 소리 */
function southLine(so) {
  const d = el('div', 'south southline');
  d.append(el('span', 'southlab', tr('남부 말') + (so.s ? ' <small>(' + esc(so.s) + ' ' + tr('뜻일 때') + ')</small>' : '')));
  const ns = String(so.n || '').split('·').map(t => t.trim()).filter(Boolean);
  if (ns.length) {
    d.append(el('span', 'southarr', '· ' + tr('북부에서는')));
    ns.forEach(n0 => {
      const n = n0.replace(/\s*\([^)]*\)\s*/g, ' ').trim();   // 'bát (to)' → 소리·팝업은 bát, 글자는 그대로
      const b = el('button', 'southn', '<b>' + esc(n0) + '</b>');
      b.type = 'button';
      b.onclick = () => pairPopup(n, { kr: krOf(n), ko: (SIB && SIB.w[n.toLowerCase()] && SIB.w[n.toLowerCase()].k) || (DKO && DKO[n.toLowerCase()]) || '' });
      const spk = el('button', 'southspk', '🔊'); spk.type = 'button'; spk.title = tr('듣기');
      spk.onclick = () => { const k = recKey(n); k ? play(k, false, voiceDir()) : speakVi(n, false, 0, S.voice); };
      d.append(b, spk);
    });
  }
  return d;
}
const exgKo = k => { const v = EXG[k]; return v && (typeof v === 'string' ? v : v.ko); };
const exgKr = k => { const v = EXG[k]; return v && typeof v === 'object'
  ? v.kr : ''; };
let GVOC = null, GVOC_G = false;
/* 문장 속 단어 사전 — 일상·직무(allWords)에 교재·선배·22기 단어(gybmAllWords)까지 (2026-09-28 밤: 교재 단어가 빠져
   'bảo vệ môi trường' 이 bảo / vệ / môi(입술) / trường(학교) 로 쪼개져 엉뚱한 뜻이 붙었다). 교재 자료가 늦게 오면 그때 다시 만든다 */
function gvocBuild() {
  const g = typeof GYBM !== 'undefined' && !!GYBM;
  if (GVOC && (GVOC_G || !g)) return;
  GVOC = {}; GVOC_G = g;
  const put = w => { if (!w || !w.vi || !w.ko || w.sent) return; const k = String(w.vi).toLowerCase().trim(); if (!GVOC[k]) GVOC[k] = w.ko; };
  allWords().forEach(put);
  if (g && typeof gybmAllWords === 'function') gybmAllWords().forEach(put);
}
function glossOf(vi) {
  gvocBuild();
  const toks = vi.replace(/[,.!?;:]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length;) {
    let hit = null;
    for (let n = 3; n >= 1 && !hit; n--) {
      if (i + n > toks.length) continue;
      const ph = toks.slice(i, i + n).join(' ').toLowerCase();
      const m = GVOC[ph] || EXTRAG[ph] || exgKo(ph);
      if (m) hit = { w: toks.slice(i, i + n).join(' '), m, n };
    }
    if (hit) { out.push(hit); i += hit.n; }
    else { out.push({ w: toks[i], m: null, n: 1 }); i += 1; }
  }
  return out.filter(x => x.m);
}
/* 뜻이 없는 단어까지 **하나도 안 빼고** 돌려준다.
   glossOf 는 뜻을 못 찾은 단어을 버리는데(.filter), 그러면 문장 밑 뜻줄에서
   단어이 통째로 사라져 "왜 이건 없지?" 하게 된다. 문장을 누를 수 있게 만들 때는
   빠짐없이 다 있어야 하므로 이쪽을 쓴다. */
/* 한글 발음 표기를 고르는 한 자리 — 자료마다 이름이 다르다
   (새 과정은 kr_read, 옛 days.json은 kr). 남부(krs/kr_south)는 완전히 없앴다
   (대표님 지시, 2026-09-09). */
function krShow(w) {
  if (!w) return '';
  if (typeof w === 'string') return w;
  const n = w.kr_read || w.kr || '';
  return n || '';
}

/* 단어 → 한글 소리(kr_read) 찾기표. 예문 안의 단어을 눌렀을 때
   뜻만이 아니라 **어떻게 읽는지**도 같이 보여 주려고 만든다 (대표님 지시, 2026-08-30). */
let GKR = null, GKRR = null;
function krOf(w) {
  const want = 'kr';
  if (GKRR !== want) { GKR = null; GKRR = want; }        // 지역을 바꾸면 표를 다시 만든다
  if (!GKR) { GKR = {}; allWords().forEach(x => { const k = x.vi.toLowerCase();
    const v = krShow(x);
    if (v && !GKR[k]) GKR[k] = v; }); }
  const k = String(w).toLowerCase().replace(/[,.!?;:"“”‘’'()…]/g, '').trim();
  return GKR[k] || exgKr(k) || sylKr(k);
}
/* 참고 사전 낱말의 한글 발음 (2026-09-29) — tools/vi_kr.py(규칙식, AI 금지)로 음절마다 미리 만든 표 data/_kr_syl.json 을 이어 붙인다.
   음절을 이어 붙인 것은 낱말 전체를 vi_kr 로 돌린 것과 같다(참고 사전 25,841개 중 다른 것은 외래어 조각 33개뿐 — 그런 것은 표에 없어 빈 값).
   한 음절이라도 표에 없으면 빈 값 — 반쪽 발음은 보여 주지 않는다. */
let KRSYL = null;
function sylKr(k) {
  if (!KRSYL) return '';
  const ps = String(k).split(/[\s-]+/).filter(Boolean);
  const r = ps.map(p => KRSYL[p]);
  return ps.length && r.every(Boolean) ? r.join(' ') : '';
}

/* 문장 한 줄의 발음 — 단어 발음을 이어 붙인다. 하나라도 모르면 빈 값을 낸다
   (반쪽짜리 발음을 보여 주느니 안 보여 주는 게 낫다). 2026-08-30 */

/* 문장별 '안 묶을 것' — data/_seg.json = { "<문장>": ["người nhận", "một phần"] } (클로드가 문맥을 읽어 확정한 것만, 2026-09-28).
   Qwen 1차(tools/seg_check.py) → 클로드 확정 → 이 파일. 있으면 그 문장에서는 그 묶음을 낱말로 푼다 */
let SEG = null, SEG_P = null;
function segLoad() {
  if (SEG) return Promise.resolve();
  if (!SEG_P) SEG_P = fetch('data/_seg.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { SEG = j; }).catch(() => { SEG = {}; });
  return SEG_P;
}
segLoad();
function glossAll(vi, extra) {
  gvocBuild();
  /* data/_seg.json 한 문장 = ["안 묶을 묶음"…] (옛 꼴) 또는 { no: [안 묶을 묶음], ko: { "낱말#n": 이 문장에서의 뜻 } } (2026-09-28 밤).
     ko 는 그 낱말이 그 문장에서 n번째로 나올 때의 뜻 — 사람이 쓴 한국어 번역에 그 뜻이 들어 있거나 문법 규칙으로 정해진 것만(클로드 검수) */
  const sg = (SEG && SEG[vi]) || [];
  const noMerge = new Set((Array.isArray(sg) ? sg : (sg.no || [])).map(x => String(x).toLowerCase()));
  const koAt = Array.isArray(sg) ? {} : (sg.ko || {});
  const seenN = {};
  const look0 = ph => (extra && extra[ph]) || GVOC[ph] || EXTRAG[ph] || exgKo(ph);
  const look = ph => look0(ph) || (toneAlt(ph) !== ph && look0(toneAlt(ph)));     // toà ↔ tòa
  /* 붙여 쓴 기호에서 낱말을 떼어 낸다 — từ...đến · xe lửa/tàu hỏa · (tại)sao · cơm sen… 가 통째로 한 덩이가 되어
     뜻을 못 찾았다. 글자가 하나도 없는 조각(숫자·기호)은 누르는 단추가 아니라 그냥 글로 둔다 (2026-09-28 밤) */
  const SEP = /(\.{2,}|…|~|\/|=|\+|·|\([^()\s]+\))/;
  const hasL = t => /[a-zà-ỹđ]/.test(String(t).toLowerCase());
  const toks = [];                        // 공백도 남겨 문장 모양 그대로 다시 그린다
  vi.split(/(\s+)/).forEach(t => { if (/^\s+$/.test(t)) toks.push(t); else t.split(SEP).forEach(p => { if (p) toks.push(p); }); });
  const out = [];
  for (let i = 0; i < toks.length;) {
    if (/^\s+$/.test(toks[i]) || !hasL(toks[i])) { out.push({ sp: toks[i] }); i++; continue; }
    let hit = null;
    for (let n = 5; n >= 1 && !hit; n -= 2) {          // 단어·공백·단어… 이라 2칸씩
      const slice = toks.slice(i, i + n);
      if (slice.length < n) continue;
      if (n > 1 && slice.some((t, j) => j % 2 ? !/^\s+$/.test(t) : !hasL(t))) continue;    // 낱말·공백·낱말 차례일 때만 묶는다
      const ph = slice.join('').replace(/[,.!?;:"“”‘’'()…]/g, '').toLowerCase().trim();   // 따옴표·괄호에 싸인 단어도 뜻을 찾는다
      if (n > 1 && noMerge.has(ph)) continue;                                            // 이 문장에서는 안 묶는 것 (data/_seg.json)
      if (n > 1 && slice.slice(0, -1).some(t => /[,.;:!?]["”’)]*$/.test(t))) continue;   // 쉼표·마침표를 넘어서는 묶지 않는다 ('bạn, tôi' 가 '내 친구'가 되던 것, 2026-09-28)
      const m = ph && look(ph);
      if (m) hit = { w: slice.join(''), m, n };
    }
    if (hit) {
      const key = hit.w.replace(/[,.!?;:"“”‘’'()…]/g, '').toLowerCase().trim();
      seenN[key] = (seenN[key] || 0) + 1;
      const ctx = koAt[key + '#' + seenN[key]];
      out.push({ w: hit.w, m: ctx || hit.m }); i += hit.n;
    }
    else { out.push({ w: toks[i], m: null }); i += 1; }
  }
  return out;
}

/* 문장을 단어 단위로 눌러볼 수 있게 만든다.
   예전에는 문장 **밑에** 단어 뜻을 줄줄이 깔았다. 두 가지가 문제였다 —
   ① 사전에 없는 단어은 뜻줄에서 아예 빠져 학습자가 "이 단어은 왜 없지?" 하게 된다
   ② 뜻줄이 길어 정작 문장 자체가 화면에서 밀려난다.
   이제 문장 속 단어을 직접 누르면 그 자리에서 소리가 나고 뜻이 뜬다.
   빠지는 단어이 없고(모든 단어이 눌린다), 화면도 문장 하나로 짧아진다. */
/* 한자 뿌리 알약 — "翁 · 옹" 밑에 글자마다 훈·음("늙은이 옹"). 훈은 data/_hanja_hun.json(영어 위키낱말사전 {{ko-hanja|훈|음}}, tools/fetch_hanja_hun.py).
   여러 훈음이 있는 글자는 우리 음(뒤의 한글)과 맞는 것을 고른다. 없으면 훈 줄을 안 붙인다 (대표님 지시 2026-09-27 밤) */
/* 단어의 뜻 여러 개 — 카드 뜻 밑에 작은 글로 (대표님 지시 2026-09-27 밤: 최소 3개, 흔한 순서). data/_senses.json 은 클로드가 검수한 것만 */
let SENSES = null, SENSES_P = null;
function sensesLoad() {
  if (SENSES) return Promise.resolve();
  if (!SENSES_P) SENSES_P = fetch('data/_senses.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { SENSES = j; }).catch(() => { SENSES = {}; });
  return SENSES_P;
}
/* 수업마다 낱말의 **기본 뜻**(1부터 _senses 차례) — data/_sdef.json {수업 키: {낱말: 뜻 번호}} (대표님 지시 2026-09-28:
   "출처의 앞뒤 문맥·출처에 적힌 뜻을 디폴트로. 선배·22기는 메인교재에 있는 낱말이면 그 디폴트를 따른다"). tools/sense_review/apply.py 가 만든다.
   표에 없으면 예전처럼 이 과의 뜻(ko)과 글자가 겹치는 뜻을 찾는다. 수업 밖(사전 등)은 0 = 정하지 않음 → 첫째(가장 흔한) 뜻 */
let SDEF = null, SDEF_P = null;
function sdefLoad() {
  if (SDEF) return Promise.resolve();
  if (!SDEF_P) SDEF_P = fetch('data/_sdef.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { SDEF = j; }).catch(() => { SDEF = {}; });
  return SDEF_P;
}
const curLessonKey = () => (typeof L !== 'undefined' && L && L.day && !L.dict && L.day.day != null) ? L.day.day : null;
const senseParts = t => String(t || '').replace(/\([^)]*\)/g, ' ').split(/[,;·/]/).map(p => p.trim().replace(/^~/, '')).filter(Boolean);
function senseDefault(vi, ko, lk) {
  const k = String(vi || '').trim().toLowerCase();
  const ss = SENSES && SENSES[k];
  if (!ss || ss.length < 2) return 0;
  const tab = SDEF && lk != null ? SDEF[String(lk)] : null;
  if (tab && tab[k] >= 1 && tab[k] <= ss.length) return tab[k];
  if (!ko) return 0;
  const mine = new Set(senseParts(ko));
  return ss.findIndex(t => senseParts(t).some(p => mine.has(p))) + 1;   // 못 찾으면 0
}
function senseLine(host, x) {
  /* 뜻이 여럿이면 **가진 뜻 모두를 흔히 쓰는 차례로** 번호를 붙여 보여 준다 (대표님 지시 2026-09-28).
     이 과(카드)의 **기본 뜻**(senseDefault)은 색으로 — 기본 뜻이 첫째가 아닐 수도 있다. data/_senses.json 은 클로드가 사전 뜻풀이를 근거로 낱말마다 적은 것 */
  const draw = () => {
    const ss = SENSES && SENSES[String(x.vi || '').trim().toLowerCase()];
    if (!ss || ss.length < 2) return;
    const hit = senseDefault(x.vi, x.ko, x.lk !== undefined ? x.lk : curLessonKey()) - 1;
    const list = el('div', 'senselist');
    ss.forEach((t, i) => { const sp = el('span', 'sn' + (i === hit ? ' cur' : ''), '<i>' + (i + 1) + '</i>' + esc(t)); list.append(sp); });   // 3개까지 → 가진 뜻 모두 (대표님 지시 2026-09-28 밤)
    const tn = [...host.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (hit >= 0 && tn) tn.replaceWith(list);          // 이 과의 뜻이 목록 안에 있으면 목록이 뜻 자리를 대신한다
    else host.append(list);                             // 없으면(이 과만의 특수한 뜻) 원래 뜻을 두고 밑에 목록
  };
  if (SENSES && SDEF) draw(); else Promise.all([sensesLoad(), sdefLoad()]).then(draw);
}
/* 팝업의 뜻 고르개 — 뜻을 누르면 그 뜻이 골라지고(onPick) 동의어·반의어가 그 뜻 기준으로 바뀐다 (대표님 지시 2026-09-28).
   처음 골라진 것은 기본 뜻. 기본 뜻은 옅은 색, 골라진 뜻은 진한 색 */
function sensePick(host, vi, ko, lk, onPick) {
  Promise.all([sensesLoad(), sdefLoad()]).then(() => {
    const ss = SENSES && SENSES[String(vi || '').trim().toLowerCase()];
    if (!ss || ss.length < 2) return;
    const def = senseDefault(vi, ko, lk);
    let sel = def || 1;
    const list = el('div', 'senselist pick');
    const draw = () => {
      list.textContent = '';
      ss.forEach((t, i) => {
        const b = el('button', 'sn' + (i + 1 === def ? ' def' : '') + (i + 1 === sel ? ' cur' : ''), '<i>' + (i + 1) + '</i>' + esc(t));
        b.type = 'button';
        b.onclick = () => { sel = i + 1; draw(); onPick(sel); };
        list.append(b);
      });
    };
    draw();
    const tn = [...host.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (def && tn) tn.replaceWith(list); else host.append(list);
    list.before(el('div', 'snhint', tr('뜻을 누르면 그 뜻의 유의어·반의어로 바뀝니다')));
  });
}
let HUN = null, HUN_P = null;
function hunLoad() {
  if (HUN) return Promise.resolve();
  if (!HUN_P) HUN_P = fetch('data/_hanja_hun.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { HUN = j; }).catch(() => { HUN = {}; });
  return HUN_P;
}
/* 한자 뿌리·외래어 뿌리 — data/_roots.json (tools/make_roots.py). 클로드가 위키낱말사전 원문을 낱말마다 보고 판정한 것만 싣는다
   (대표님 지시 2026-09-28 밤: "한문 뿌리 아닌데 넣지 말라, 사실대로"). 표에 없는 낱말은 아무것도 안 붙인다 — 예전 x.hanja(검수 전)는 안 쓴다.
   · 옛 한자어: 표준 한자음과 소리가 다른 옛 차용(tuổi ← 歲 tuế) — '옛 한자어 · 한자음 tuế' 를 밝힌다
   · 일부 음절만 한자어·외래어: 그 음절을 앞에 적는다(giá = 價 · xe buýt 의 buýt ← 프랑스어 bus)
   · 뜻마다 뿌리가 다르면(thư 편지 書 / 쉬다 舒) 카드 뜻에 든 말로 고른다 */
let ROOTS = null, ROOTS_P = null;
function rootsLoad() {
  if (ROOTS) return Promise.resolve();
  if (!ROOTS_P) ROOTS_P = fetch('data/_roots.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { ROOTS = j; }).catch(() => { ROOTS = {}; });
  return ROOTS_P;
}
/* 분류사 cái 가 붙은 표제어 (대표님 물음 2026-09-29: "cái nhà 이거 집이라고 나오는데 맞냐? nhà 만 집 아님?")
   선배 자료가 사물 낱말을 'Cái bàn·Cái mũ·cái nhà'처럼 분류사를 붙인 꼴로 적었다. 뜻(집)은 맞지만 낱말은 뒤의 nhà 이고,
   cái 는 '사물 하나'를 가리킬 때 앞에 붙는 분류사다. cái + 형용사·동사(cái nóng 더위·cái chết 죽음)는 그 성질·일을 가리키는 명사를 만든다. */
const CAI_NOUNIFY = new Set(['cái nóng', 'cái lạnh', 'cái đẹp', 'cái xấu', 'cái ác', 'cái thiện', 'cái chết', 'cái tôi', 'cái đói', 'cái nghèo']);
function caiNote(host, x) {
  const m = /^cái\s+(.+)$/i.exec(String(x.vi || '').trim());
  if (!m) return;
  const rest = m[1], lo = String(x.vi).trim().toLowerCase();
  host.append(el('div', 'clfnote', CAI_NOUNIFY.has(lo)
    ? tr('cái + 형용사·동사 → 그 성질·일을 가리키는 명사입니다') + ' (' + esc(rest) + ' → ' + esc(x.vi) + ')'
    : tr('cái 는 사물 하나를 가리킬 때 앞에 붙는 분류사입니다 — 낱말 자체는') + ' <b>' + esc(rest) + '</b>'));
}
function rootPills(host, x) {
  const box = el('span', 'roots');                 // 자리를 먼저 잡아 둔다 — 파일이 늦게 와도 뜻 목록과 순서가 바뀌지 않게
  host.append(box);
  const draw = () => {
    const k0 = String(x.vi || '').trim().toLowerCase();
    const alts = ROOTS && (ROOTS[k0] || ROOTS[canonFind(ROOTS, k0)]);   // 철자 꼴만 다른 것(kỹ/kĩ thuật · hoá/hóa)도 같은 낱말로 (2026-10-01)
    if (!alts) return;
    const ko = String(x.ko || '');
    alts.filter(a => !a.c || a.c.some(k => ko.includes(k))).forEach(a => {
      if (a.h) box.append(hanjaPill(a.h + ' · ' + a.r, {
        pre: a.p ? a.p + ' =' : '',
        note: a.o ? tr([...a.h].length > 1 ? '옛 한자음 섞임' : '옛 한자어') + (a.s ? ' · ' + tr('한자음') + ' ' + a.s : '') : ''   // thông tin 은 tin 만 옛 음
      }));
      else if (a.l) box.append(el('span', 'loanpill', (a.p ? esc(a.p) + ' ← ' : '') + esc(tr(a.l)) + ' <b>' + esc(a.w) + '</b>'));
    });
  };
  if (ROOTS) draw(); else rootsLoad().then(draw);
}
function hanjaPill(h, o) {
  const opt = o || {};
  const sp = el('span', 'hanja', '<span class="rmain">' + (opt.pre ? '<small class="rpart">' + esc(opt.pre) + '</small> ' : '') + esc(h) + '</span>');
  const note = opt.note ? el('small', 'rold', esc(opt.note)) : null;
  if (note) sp.append(note);
  const [chars, reading] = String(h).split(' · ');
  const draw = () => {
    if (!HUN || !chars) return;
    const syl = (reading || '').replace(/\s+/g, ''), parts = [];
    /* 음이 맞는 훈만 — 두음법칙(역량의 '역' ↔ '힘 력')은 같게 본다. 맞는 것이 없으면 억지로 첫 훈을 붙이지 않는다
       (行 '항'에 '다닐 행'을 붙이면 틀린 풀이가 된다, 2026-09-28 밤) */
    const same = (a, b) => {
      if (a === b) return true;
      const x = (a || '').charCodeAt(0) - 0xAC00, y = (b || '').charCodeAt(0) - 0xAC00;
      if (!(x >= 0 && x < 11172 && y >= 0 && y < 11172)) return false;
      return x % 588 === y % 588 && [2, 5, 11].includes(Math.floor(x / 588)) && [2, 5, 11].includes(Math.floor(y / 588));
    };
    [...chars].forEach((c, i) => {
      const pick = (HUN[c] || []).find(p => same(p[1], syl[i]));
      if (pick) parts.push(pick[0] + ' ' + pick[1]);
    });
    if (parts.length) sp.insertBefore(el('small', 'hun', esc(parts.join(' · '))), note);   // 훈음은 한자 바로 밑, '옛 한자어' 풀이는 맨 밑
  };
  if (HUN) draw(); else hunLoad().then(draw);
  return sp;
}
function tapLine(vi, cls, o) {
  const opt = o || {};
  const wrap = el('div', 'tapwrap');
  const line = el('div', cls || 'tapline');
  const info = el('div', 'tapinfo');
  let on = null;
  const toks = glossAll(vi, opt.dict);
  prefetchSnd([vi].concat(toks.filter(t => t.sp === undefined).map(t => t.w)));   // 문장·낱말 소리를 미리 (누르면 바로 나게)
  toks.forEach(t => {
    if (t.sp !== undefined) { line.append(document.createTextNode(t.sp)); return; }
    const w = el('button', 'tapw' + (t.m ? '' : ' nom'));
    w.type = 'button';
    w.textContent = t.w;
    w.onclick = ev => {
      // 상자 전체가 '문장 전체 재생' 단추가 됐다(2026-09-09) — 단어 단추는 그걸 가리지 않게
      // 이벤트가 상자까지 안 번지게 막는다. 안 그러면 단어 하나 눌러도 문장 전체가 겹쳐 난다.
      ev.stopPropagation();
      if (on) on.classList.remove('on');
      on = w; w.classList.add('on');
      const bare = t.w.replace(/[,.!?;:"“”‘’'()…]/g, '').trim();   // 따옴표에 싸인 단어('"tôi"')도 우리 소리를 찾는다
      /* 단어을 누르면 **헷갈리는 짝 팝업**이 뜬다 (대표님 지시 2026-09-27: 단어 카드의 단어과 똑같이).
         소리는 팝업 머리의 ▶ 로 듣는다(고른 목소리로만 — 예전 주석: 문장 첫 단어은 대문자로 시작하지만
         단어 녹음은 소문자 표제어라 대소문자 구분 없이 찾는다, 2026-09-09). */
      pairPopup(bare, { kr: krOf(bare), ko: t.m });
      info.textContent = '';
      info.append(el('b', null, esc(bare)));
      // 성조 — 대화 화면에서는 단어마다 성조 모양도 같이 보여 준다
      const tn = opt.tones && opt.tones[bare.toLowerCase().split(' ')[0]];
      if (tn) {
        const ch = el('span', 'gt ' + tn.name, toneArrow(tn.name));
        ch.title = tn.name + ' · ' + tn.ko;
        info.append(ch);
      }
      const kr = krOf(bare);
      if (kr) info.append(el('span', 'gkr', '[' + esc(kr) + ']'));
      /* 뜻이 묶음 사전에 없으면 다른 자료에서 찾는다 — 뜻 목록(_senses)·짝 사전(sib.json)·앱 낱말 사전 (대표님 지적 2026-09-28 밤:
         "뜻이 없는 단어라고 표시하지 말고 뜻을 넣으라", 짝 팝업에는 '어휘'가 있었다). 끝내 없을 때만 그 사실을 적는다 */
      const mtx = document.createTextNode(' — ' + (t.m || '…'));
      info.append(mtx);
      if (!t.m) meaningOf(bare).then(m => { mtx.textContent = ' — ' + (m || tr('아직 뜻이 없는 단어입니다')); });
    };
    line.append(w);
  });
  wrap.append(line, info);
  return wrap;
}

/* 단어 뜻 줄 — 대화 화면의 gloss 와 같은 차림새 (아직 쓰는 곳이 있어 남겨 둔다) */

/* ---------- 나만의 단어장 ----------
   ① 별표 — 배우다가 "이건 따로 챙기자" 싶은 단어을 그 자리에서 담는다.
   ② 오답노트 — 퀴즈에서 자주 틀린 단어(S.stats.miss)이 저절로 모인다.
   두 과정(베트남어·한국어)이 한 단어장을 같이 쓴다. 열쇠는 배우는 말 쪽 글자다. */
function starOf() { return S.star || (S.star = {}); }
function isStar(k) { return !!starOf()[k]; }
function toggleStar(k, ko, vi) {
  const st = starOf();
  if (st[k]) delete st[k];
  else st[k] = { ko, vi, t: now() };
  save();
  return !!st[k];
}
/* 별 단추 — 학습 화면 어디서든 단어 옆에 붙인다 */
// 선배 별표(seniorStar)는 완전히 없앴다 (대표님 지시, 2026-09-09).

/* ---------- 교재 문법 (1권) ----------
   책 → 과 → 문법 카드. 한 과가 곧 한 강이다(문법 5~8개).
   예문은 단어마다 눌러 소리·발음·뜻을 볼 수 있다 — 단어 카드와 같은 방식이다. */
let GRAM = null;
/* 문법 진도 열쇠 — 한 줄 문법(2026-09-27 밤)은 'H<과>'. 옛 책·과 열쇠('G<책>-<과>')는 gramReady 가 한 번 옮긴다 */
const gkey = (bi, ni) => 'H' + ni;
function gramReady(j) {
  try {
    if (j && j.books && j.books.length === 1 && !S.gramMig) {
      j.books[0].bai.forEach((x, ni) => {
        const t = (x.src || []).map(k => S.done['G' + k]).filter(Boolean)[0];
        if (t && !S.done[gkey(0, ni)]) S.done[gkey(0, ni)] = t;
      });
      S.gramMig = 1; save();
    }
  } catch (e) { }
  /* 문법이 아닌 것 (대표님 물음 2026-09-30 "문법이 아닌 것이 섞여 있니? 어디로 옮겨야겠니?") — 자료에 ng(옮긴 곳)가 붙은 과·항목은
     문법 화면·문법 카드·문법 테스트에서 뺀다. 과(1·2과)는 목록에서만 숨기고(진도 열쇠 'H과'는 차례라 배열은 그대로), 항목은 x.g 에서 걷어 x.ngItems 로.
     옮긴 곳: 1과 → 기본기 발음 · 2과 → 일상 '인사와 자기소개' · 13·14·16·46과의 낱말·표현 → 일상 해당 주제(없던 표현 7개는 일상에 새로 넣음) */
  try { (j.books || []).forEach(b => b.bai.forEach(x => { if (x.g) { x.ngItems = x.g.filter(g => g.ng); x.g = x.g.filter(g => !g.ng); } })); } catch (e) { }
  return j;
}


/* ---------- 과정 — **이름 없는 목차** (대표님 결정, 2026-08-30) ----------
   권 / 챕터 / 레슨 번호만 쓴다. 주제 이름을 붙이지 않는다.
   차례는 오로지 **기수 합**이다 — 네 기수에 다 나온 말이 맨 앞, 한 기수에만 나온 말이 뒤.
   같으면 가장 최근 기수의 회차, 그것도 같으면 회차 안의 자리. 예외 없이 정해진다.
   1권(규칙)과 7권(문화)은 성격이 달라 따로 단추가 있다.
   직무만 **갈래**가 있다 — 봉제로 갈 사람이 전자를 배울 까닭이 없기 때문이다. */
let COURSE = null;
const ckey = (v, c, l) => 'C' + v + '.' + c + '.' + l;
let JOBI = 0;                                   // 지금 보고 있는 직무 권 (0 공통 · 1 업종)
const jkey = (t, c, l) => 'J' + JOBI + '.' + t + '.' + c + '.' + l;

function loadCWords() {
  if (!COURSE || CWORDS.length) return;
  const out = [];
  const eat = chs => chs.forEach(c => c.lessons.forEach(l => l.words.forEach(w => out.push(w))));
  COURSE.vols.forEach(v => v.tracks ? v.tracks.forEach(t => eat(t.chapters)) : eat(v.chapters));
  CWORDS = out;
  GVOC = null; GKR = null;
}

addEventListener('load', () => {
  if (COURSE) return;
  fetch('data/order.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { COURSE = j; loadCWords(); }).catch(() => { });
});

function courseEntry() {
  if (COURSE) return drawCourse();
  const list = $('#dayList'); list.textContent = '';
  list.append(el('li', 'catpick', tr('불러오는 중…')));
  show('course', '학습', true);
  fetch('data/order.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { COURSE = j; loadCWords(); drawCourse(); })
    .catch(() => { list.textContent = ''; list.append(el('li', 'catpick', tr('불러오지 못했습니다'))); });
}

const lifeVols = () => COURSE.vols.filter(v => v.kind === 'life');
const jobVols = () => COURSE.vols.filter(v => v.kind === 'job');
const jobVol = (i) => jobVols()[i || 0];

function chDone(chs, mk) {
  let n = 0, all = 0;
  chs.forEach((c, ci) => c.lessons.forEach((l, li) => { all++; if (S.done[mk(ci, li)]) n++; }));
  return [n, all];
}

/* 목차 오른쪽 표시는 **어느 층에서나 같은 꼴**이다 (대표님 지시, 2026-08-30):
     권 → 끝낸/전체 챕터 · 챕터 → 끝낸/전체 레슨 · 레슨 → 단어 수.
   전에는 권만 레슨 수를, 직무만 단어 수를 보여 줘 층마다 잣대가 달랐다. */
const stat = (done, all, unit) => done + '/' + all + ' ' + tr(unit);
/* 1권(문법)도 다른 권과 **같은 꼴**로 센다 — 끝낸 과 / 전체 과 (대표님 지시, 2026-08-30).
   전에는 문법만 목록 위에 '문법 177 · 끝낸 과 0/30' 이라는 다른 잣대를 달고 있었다. */
function gramStat() {
  let all = 0, done = 0;
  ALL.filter(d => typeof d.day === 'string' && d.day[0] === 'P').forEach(d => {
    all++; if (S.done[d.day]) done++; });
  if (GRAM) GRAM.books.forEach((b, bi) => b.bai.forEach((x, ni) => {
    all++; if (S.done[gkey(bi, ni)]) done++; }));
  return stat(done, all, '챕터');
}

function drawCourse() {
  /* 1권 몫을 세려면 문법 자료가 있어야 한다 — 없으면 조용히 받아 와서 다시 그린다
     (다른 권은 0/7 챕터인데 1권만 '보기'로 떠 잣대가 어긋나 보였다) */
  if (!GRAM) fetch('data/grammar.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { GRAM = gramReady(j); if (!$('#course').hidden) drawCourse(); }).catch(() => {});
  const list = $('#dayList'); list.textContent = '';
  const head = el('li', 'catpick');
  list.append(head);

  const row = (num, name, right, fn, done) => {
    const b = el('button');
    if (done !== undefined) b.dataset.done = done ? '1' : '0';
    b.append(el('span', 'num', num), el('span', 'nm', name), el('span', 'st', right));
    b.onclick = fn;
    const li = el('li'); li.append(b); list.append(li);
  };

  row('1권', tr('기본기 · 문법'), gramStat(), () => { dive(drawCourse); gramEntry(); });
  lifeVols().forEach((v, vi) => {
    const [n, all] = chDone(v.chapters, (c, l) => ckey(vi, c, l));
    const cd = v.chapters.filter((c, ci) =>
      c.lessons.every((l, li) => S.done[ckey(vi, ci, li)])).length;
    /* 제목이 있으면 제목을 쓴다 (대표님 지시 2026-09-02 "제목 안 보이잖아").
       '일상'만 여섯 줄 늘어서면 무엇이 다른지 알 수 없다. */
    row((vi + 2) + '권', v.title ? tr(v.title) : tr('일상'), stat(cd, v.chapters.length, '챕터'),
        () => { dive(drawCourse); drawVol(vi); }, n >= all);
  });
  /* 2권은 **하루 5분**이다 (대표님 지시 2026-09-02:
     "기본기와 문법이 1권이면 하루 5분이 2권, 직무가 3권").
     자료를 옮겨 담지 않고 **원래 화면을 그대로 부른다** — 진도가 두 군데로 갈리면 안 된다. */
  {
    const ds = ALL.filter(d => typeof d.day === 'number' && !d.track && visibleDay(d));
    const dn = ds.filter(d => S.done[d.day]).length;
    row((lifeVols().length + 2) + '권', tr('일상 단어'), stat(dn, ds.length, '세트'),
        () => { dive(drawCourse); renderDays(); }, dn >= ds.length && ds.length > 0);
  }
  /* 직무는 **한 권**이다 (대표님 결정, 2026-08-30) — 꼭 필요한 기본 999개만.
     심화 단어은 앱에 넣지 않는다. 현장에서 배우면 되는 말이다. */
  const jv0 = jobVol(0);
  if (jv0) {
    const td = jv0.tracks.filter((t, ti) =>
      t.chapters.every((c, ci) => c.lessons.every((l, li) => S.done[jkey(ti, ci, li)]))).length;
    row((lifeVols().length + 3) + '권', tr('직무 단어'), stat(td, jv0.tracks.length, '챕터'),
        () => { dive(drawCourse); drawJob(0); }, td >= jv0.tracks.length);
  }
  /* 문화는 **첫 화면에 따로** 뒀다 (대표님 지시, 2026-08-30) —
     단어을 외우는 자리가 아니라 읽는 자리라 성격이 다르다. 여기서는 뺀다. */
  show('course', '학습', true);
}

/* 일상 한 권 — 챕터 번호만 */
function drawVol(vi) {
  const v = lifeVols()[vi];
  const list = $('#dayList'); list.textContent = '';
  v.chapters.forEach((c, ci) => {
    const done = c.lessons.filter((l, li) => S.done[ckey(vi, ci, li)]).length;
    const b = el('button');
    b.dataset.done = done >= c.lessons.length ? '1' : '0';
    const cn = c.lessons.reduce((a, l) => a + l.words.length, 0) + tr('단어');
    b.append(el('span', 'num', tr('챕터') + ' ' + (ci + 1)),
             el('span', 'nm', c.t ? tr(c.t) : cn),
             el('span', 'st', stat(done, c.lessons.length, '레슨')));
    b.onclick = () => { dive(() => drawVol(vi)); drawCh(vi, ci); };
    const li = el('li'); li.append(b); list.append(li);
  });
  show('course', v.title ? tr(v.title) : (vi + 2) + '권', true);
}

function drawCh(vi, ci) {
  const c = lifeVols()[vi].chapters[ci];
  const list = $('#dayList'); list.textContent = '';
  /* 레슨 줄은 **길(로드맵)** 로 그린다 (대표님 지시 2026-09-25: GYBM 과 같은 모양).
     단어을 늘어놓지는 않는다 (2026-08-30) — 그것이 주제인 줄 알게 된다.
     대신 **꼭지 제목**이 있으면 그것을 쓴다 (2026-09-02). 진짜 주제이기 때문이다. */
  const nodes = c.lessons.map((l, li) => {
    const k = ckey(vi, ci, li);
    return { key: k, title: tr(lsName(l, li)), sub: l.words.length + tr('단어'), num: li + 1,
             done: !!S.done[k],
             fn: () => { dive(() => drawCh(vi, ci));
               startLearn({ day: k, theme: l.t ? tr(l.t) : (vi + 2) + '권 ' + (ci + 1) + '-' + (li + 1),
                            words: l.words, course: 1 }); } };
  });
  roadInList(list, nodes);
  show('course', c.t ? tr(c.t) : (vi + 2) + '권 · ' + tr('챕터') + ' ' + (ci + 1), true);
}

/* 직무 — 갈래를 **체크로 고른다** (대표님 지시, 2026-08-30).
   안내 글은 뺐다. 갈 곳이 정해진 사람은 그 갈래만 고르면 된다.
   고른 것이 없으면 다 보인다 — 처음 여는 사람이 막히지 않게. */
const jobPick = () => (S.jobpick = S.jobpick || {});
function drawJob(ji) {
  JOBI = ji || 0;
  const jv = jobVol(JOBI);
  const list = $('#dayList'); list.textContent = '';
  const pick = jobPick();
  const anyPick = jv.tracks.some((t) => pick[t.track]);

  /* catpick 은 글자를 nowrap 으로 잡아 안내 글이 세로로 눌린다 — 따로 만든다 */
  const head = el('li', 'jobhead');
  head.append(el('span', null, tr('갈 곳이 정해졌으면 그 갈래만 고르세요')));
  if (anyPick) {
    const clr = el('button', 'ghost jsmall', tr('고른 것 지우기'));
    clr.onclick = () => { S.jobpick = {}; save(); drawJob(JOBI); };
    head.append(clr);
  }
  list.append(head);

  jv.tracks.forEach((t, ti) => {
    const [n, all2] = chDone(t.chapters, (c, l) => jkey(ti, c, l));
    const row = el('li', 'jobrow');
    const cb = el('button', 'jobcb');
    cb.type = 'button';
    cb.setAttribute('role', 'checkbox');
    const on = !!pick[t.track];
    cb.setAttribute('aria-checked', on ? 'true' : 'false');
    cb.dataset.on = on ? '1' : '0';
    cb.textContent = on ? '✔' : '';
    cb.title = t.track + ' ' + tr(on ? '고름' : '고르기');
    cb.onclick = (e) => { e.stopPropagation();
      if (pick[t.track]) delete pick[t.track]; else pick[t.track] = 1;
      save(); drawJob(JOBI); };
    const b = el('button');
    b.dataset.done = n >= all2 ? '1' : '0';
    if (anyPick && !on) b.dataset.dim = '1';
    /* 갈래 이름은 길다 — num 칸(44px)이 아니라 이름 칸에 넣는다 */
    b.append(el('span', 'nm', esc(t.track)),
             el('span', 'st', t.words + tr('단어') + ' · ' +
               stat(t.chapters.filter((c, ci) =>
                 c.lessons.every((l, li) => S.done[jkey(ti, ci, li)])).length,
                 t.chapters.length, '챕터')));
    b.onclick = () => { dive(() => drawJob(JOBI)); drawJobTrack(ti); };
    row.append(cb, b); list.append(row);
  });
  show('course', '직무 단어', true);
}

/* 레슨 이름 — 예전 자료는 l.t 에, 새로 지은 것은 l.theme 에 있다.
   이름이 없으면 '레슨 3' 이라고 뜨는데, 그러면 무엇을 배우는지 알 수 없다
   (대표님 지적 2026-09-03: "챕터 123단어, 레슨1. 이렇게 하면 어떤 내용인지 모르잖아"). */
const lsName = (l, i) => l.t || l.theme || (tr('레슨') + ' ' + (i + 1));

function drawJobTrack(ti) {
  const t = jobVol(JOBI).tracks[ti];
  // 챕터가 하나뿐이면 **바로 레슨 목록으로.** '챕터 1' 만 있는 화면을 또 보여 줄 까닭이 없다
  if ((t.chapters || []).length === 1) return drawJobCh(ti, 0);
  const list = $('#dayList'); list.textContent = '';
  t.chapters.forEach((c, ci) => {
    const done = c.lessons.filter((l, li) => S.done[jkey(ti, ci, li)]).length;
    const b = el('button');
    b.dataset.done = done >= c.lessons.length ? '1' : '0';
    const cn = c.lessons.reduce((a, l) => a + l.words.length, 0) + tr('단어');
    b.append(el('span', 'num', tr('챕터') + ' ' + (ci + 1)),
             el('span', 'nm', c.t ? tr(c.t) : cn),
             el('span', 'st', stat(done, c.lessons.length, '레슨')));
    b.onclick = () => { dive(() => drawJobTrack(ti)); drawJobCh(ti, ci); };
    const li = el('li'); li.append(b); list.append(li);
  });
  show('course', t.track, true);
}

function drawJobCh(ti, ci) {
  const t = jobVol(JOBI).tracks[ti], c = t.chapters[ci];
  // 제목은 갈래 이름 그대로 — '직무 단어 › 공통 · 생산과 공정' 으로 읽힌다
  const list = $('#dayList'); list.textContent = '';
  const nodes = c.lessons.map((l, li) => {
    const k = jkey(ti, ci, li);
    return { key: k, title: tr(lsName(l, li)), sub: l.words.length + tr('단어'), num: li + 1,
             done: !!S.done[k],
             fn: () => { dive(() => drawJobCh(ti, ci));
               startLearn({ day: k, theme: t.track + ' · ' + lsName(l, li),
                            words: l.words, course: 1 }); } };
  });
  roadInList(list, nodes);
  show('course', t.track + ' · ' + tr('챕터') + ' ' + (ci + 1), true);
}

/* 핵심만 — 두 기수 이상에 나온 단어. 급할 때 가는 길. */
let CORE = null;
function coreList() {
  if (CORE) return CORE;
  const ws = CWORDS.filter(w => w.core);
  CORE = [];
  for (let i = 0; i < ws.length; i += 15) CORE.push(ws.slice(i, i + 15));
  return CORE;
}
function drawCore() {
  const ch = coreList();
  const list = $('#dayList'); list.textContent = '';
  const head = el('li', 'catpick');
  head.append(el('span', 'msub',
    tr('네 기수 중 두 기수 이상에 나온 단어만 모았습니다 — 급할 때는 이 길만 걸어도 됩니다.')));
  list.append(head);
  const nodes = ch.map((c, i) => {
    const k = 'K' + i;
    return { key: k, title: tr('레슨') + ' ' + (i + 1),
             sub: c.slice(0, 3).map(w => w.ko.split('/')[0].trim()).join(' · ') + ' · ' + c.length + tr('단어'),
             num: i + 1, done: !!S.done[k],
             fn: () => { dive(drawCore);
               startLearn({ day: k, theme: tr('핵심') + ' ' + (i + 1), words: c, course: 1 }); } };
  });
  roadInList(list, nodes);
  show('course', '핵심만', true);
}

function gramEntry() {
  if (GRAM) return drawGramList();
  const list = $('#dayList'); list.textContent = '';
  list.append(el('li', 'catpick', tr('불러오는 중…')));
  show('course', '기본기 · 문법', true);
  fetch('data/grammar.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { GRAM = gramReady(j); drawGramList(); })
    .catch(() => { list.textContent = ''; list.append(el('li', 'catpick', tr('불러오지 못했습니다'))); });
}

/* 자판 치는 법 — 성조·모자를 어떻게 찍는지. 전에는 문제 화면 밑에 잔글씨로만 있었다.
   대표님 지적(2026-08-30): "기존의 기본기에 있던 내용 모두 들어갔니? 타이핑하는 법 등등" */
const TYPEKEYS = [
  { k: 'f', t: 'huyền ˋ', ex: 'chao+f', out: 'chào', ko: '안녕' },
  { k: 's', t: 'sắc ˊ', ex: 'ca+s', out: 'cá', ko: '물고기' },
  { k: 'r', t: 'hỏi ˀ', ex: 'hoi+r', out: 'hỏi', ko: '묻다' },
  { k: 'x', t: 'ngã ˜', ex: 'ma+x', out: 'mã', ko: '코드' },
  { k: 'j', t: 'nặng ˳', ex: 'ma+j', out: 'mạ', ko: '모종' },
  { k: 'aa', t: 'â', ex: 'caan', out: 'cân', ko: '저울' },
  { k: 'aw', t: 'ă', ex: 'nawm', out: 'năm', ko: '다섯' },
  { k: 'ee', t: 'ê', ex: 'dees', out: 'dế', ko: '귀뚜라미' },
  { k: 'oo', t: 'ô', ex: 'coo', out: 'cô', ko: '고모·선생님' },
  { k: 'ow', t: 'ơ', ex: 'bow', out: 'bơ', ko: '버터' },
  { k: 'uw', t: 'ư', ex: 'tuw', out: 'tư', ko: '넷' },
  { k: 'dd', t: 'đ', ex: 'ddi', out: 'đi', ko: '가다' },
];

function drawGramList() {
  const list = $('#dayList'); list.textContent = '';
  /* **기본기가 1권에 들어 있어야 한다** (대표님 지적, 2026-08-30).
     글자·모음·성조·자음·자판 — 문법보다 먼저 봐야 할 것들인데 진입점이 없었다.
     2026-09-25: 다른 목차들과 같이 **한 줄 길**로 그린다 — 기본기 → 자판 → 문법 순으로 위로 오른다. */
  const nodes = [];
  ALL.filter(d => typeof d.day === 'string' && d.day[0] === 'P').forEach(d => {
    const n = (d.letters || d.tones || d.cmp || []).length;
    nodes.push({ key: d.day, title: d.theme, sub: tr('기본기') + ' · ' + n + tr('개'),
                 done: !!S.done[d.day], fn: () => { dive(drawGramList); startLearn(d); } });
  });
  GRAM.books.forEach((b, bi) => b.bai.forEach((x, ni) => {
    if (x.ng) return;                                   // 문법이 아닌 과 (2026-09-30)
    const k = gkey(bi, ni);
    nodes.push({ key: k, title: x.t, sub: tr('문법') + ' ' + x.no + tr('과') + ' · ' + x.g.length + tr('개 문법'),
                 done: !!S.done[k], fn: () => { dive(drawGramList); startGram(bi, ni); } });
  }));
  nodes.forEach((n, i) => { n.num = i + 1; });
  roadInList(list, nodes);
  show('course', '기본기 · 문법', true);
}

function startGram(bi, ni) {
  const b = GRAM.books[bi], x = b.bai[ni];
  noteTrack({ day: gkey(bi, ni) });
  LCRUMB = tr('문법') + '-' + x.no + ' ' + tr(x.t);
  L = { day: { day: gkey(bi, ni), theme: x.t, gram: 1 }, i: 0,
        items: x.g.map(g => ({ k: 'gram', d: g })) };
  drawCard();
  show('learn', tr('문법') + ' ' + x.no + '과 · ' + x.t, true);
}

/* 문법·기본기 확인 문제 (2026-09-09 대표님 지시 — "기본기와 문법에도 문제 넣어줘").
   카드로 보기만 하고 끝나던 것을, 그 과에서 배운 문형으로 만든 4지선다로 마무리한다.
   초급(고르기)만 우선 넣는다 — 문법은 스스로 만들어 쓰는 게 아니라 알아보는 것부터라
   타이핑 같은 산출형 문제는 아직 안 맞다고 판단했다. */
function gramPool() {
  // 오답 보기를 뽑을 문형 창고 — 이 책(GRAM) 전체에서 긁어온다
  const out = [];
  (GRAM.books || []).forEach(b => b.bai.forEach(x => x.g.forEach(g => {
    if (g.k && g.t) out.push({ k: g.k, t: g.t });
  })));
  return out;
}
function startGramQuiz(dayKey, theme, gramItems) {
  const pool = gramPool().filter(p => !gramItems.some(g => g.k === p.k));
  const qs = gramItems.filter(g => g.ex && g.ex.length).map(g => {
    const ex = g.ex[Math.floor(Math.random() * g.ex.length)];
    const seen = new Set([g.k]);
    const wrong = pool.filter(p => { if (seen.has(p.k)) return false; seen.add(p.k); return true; })
      .sort(() => Math.random() - .5).slice(0, 3);
    const opts = [{ k: g.k, t: g.t }, ...wrong].sort(() => Math.random() - .5);
    return { ex, correct: g.k, opts };
  });
  if (!qs.length) { S.done[dayKey] = now(); save(); dailyFlowEntry(); return; }   // 예문이 없으면 그냥 완료
  GQ = { qs, i: 0, ok: 0, dayKey, theme };
  drawGramQuiz();
  show('quiz', theme + ' · 확인 문제', true);
}
let GQ = null;
function drawGramQuiz() {
  const q = GQ.qs[GQ.i];
  const b = $('#quizBody'); b.textContent = '';
  $('#quizFill').style.width = Math.round(GQ.i / GQ.qs.length * 100) + '%';
  b.append(el('p', 'lede', (GQ.i + 1) + ' / ' + GQ.qs.length));
  const box = el('div', 'wex');
  box.append(tapLine(q.ex.vi, 'wexvi tapline'));
  box.append(el('div', 'wexko', esc(q.ex.ko)));
  b.append(box);
  b.append(el('p', 'q', tr('이 문장에 쓰인 문형은?')));
  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const btn = el('button', null, esc(o.k) + ' — ' + esc(o.t));
    btn.dataset.k = o.k;                 // 정답 표시는 글자 앞부분이 아니라 문형 값으로 (앞부분이 같은 문형이 늘었다)
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const ok = o.k === q.correct;
      btn.dataset.r = ok ? 'ok' : 'no';
      if (!ok) [...opts.children].forEach(x => { if (x.dataset.k === q.correct) x.dataset.r = 'ok'; });
      fxTone(ok);
      if (ok) GQ.ok++;
      nextBtn(b, () => {
        GQ.i++;
        if (GQ.i < GQ.qs.length) drawGramQuiz();
        else { S.done[GQ.dayKey] = now(); save();
               popup('<b>' + tr('확인 문제 끝') + '</b> — ' + GQ.ok + ' / ' + GQ.qs.length);
               dailyFlowEntry(); }
      });
    };
    opts.append(btn);
  });
  b.append(opts);
}

/* 모음·자음·성조를 **베트남어로 뭐라 하는가** — 기본기와 한 이야기다 (대표님 지적, 2026-08-30). */

function starBtn(k, ko, vi) {
  const b = el('button', 'starb' + (isStar(k) ? ' on' : ''));
  b.type = 'button';
  b.textContent = isStar(k) ? '★' : '☆';
  b.title = tr('단어장에 담기');
  b.onclick = e => {
    e.stopPropagation();
    const onNow = toggleStar(k, ko, vi);
    b.textContent = onNow ? '★' : '☆';
    b.classList.toggle('on', onNow);
  };
  return b;
}

/* ---------- 출석 점수 ----------
   왜 '순위표'가 아니라 '점수'인가 — 근거를 남겨 둔다.
   ① Hanus & Fox(2015, Computers & Education) 16주 실험: 같은 수업을 두 반으로 나눠
      한쪽에만 순위표·배지를 넣었더니 그 반이 동기·만족도가 갈수록 떨어지고
      **기말 점수까지 낮았다**. 순위표가 '배우려는 마음'을 '이기려는 마음'으로 바꿨다.
   ② Li 외(2024, JCAL) 리뷰: 순위표는 '내 주변만 보이는' 상대형은 도움이 되지만,
      **전체 등수가 다 보이는 절대형은 하위권의 의욕을 꺾는다.** 우리 동아리는
      서로 아는 열댓 명이라 무조건 절대형이 된다 — 꼴찌가 누군지 다 안다.
   ③ 메타분석들은 게임화가 흥미·자율성은 올려도 **실력 자체에는 효과가 거의 없다**고 본다.
   그래서 개인 순위표는 만들지 않는다. 대신 (가) 점수는 '내가 쌓은 노력의 기록'이고
   (나) 비교는 '지난주의 나'와만 하며 (다) 동아리는 등수가 아니라 **합계**로 뭉친다.

   쓰는 곳: AI 채점. 단, **앱이 내주는 열쇠로 돌 때만** 깎는다 — 내 열쇠(내 정보에
   넣은 구글 키)로 쓰는 사람은 자기 돈으로 쓰는 것이라 깎을 이유가 없다. */
/* 점수를 무엇에 주는가 — 규칙을 눈에 보이게 늘어놓는다.
   원칙 하나: **어려운 것일수록, 오래 남는 것일수록 높게.** 그래야 점수를 좇는 것과
   실제로 느는 것이 같은 방향이 된다. 그래서 '복습'이 가장 높다 — 이 앱은 복습이
   무너지면 나머지가 다 무너지는 구조이기 때문이다(새 단어는 복습이 받쳐야 남는다).
   과정마다 있는 기능이 다르므로 규칙도 갈린다 — 베트남어 과정에는 모의고사가 없는데
   '모의고사 +30'을 적어 두면 얻을 수 없는 점수를 걸어 둔 셈이 된다(사용자 지적). */
/* 숫자는 **`tools/pricing.py` 가 계산한 것**이다 — 손으로 고치지 말고 그 파일을 고쳐라.
   계산식: 점수 ∝ 효과크기(g) × 걸리는 시간(분).
     · g 는 메타분석 값 — 인출 연습 g=.61 (Adesope 2017, 217연구),
       산출 효과 g=.37 (Fawcett 2013), 간격 반복 '중간~큰' (Kim & Webb 2022).
     · 시간을 곱하는 까닭: 같은 효과라도 30초짜리와 5분짜리를 같게 주면
       짧은 것만 반복하는 것이 이득이 된다.
   근거와 계산 과정은 docs/scoring-basis.md 에 있다. */
const CRD = {
  day: 5,      // 그날 처음 앱을 연 것 — g=0(오는 것은 배움이 아니다). 그래도 0 이면
               // '오늘은 시간 없으니 아예 열지 말자'가 되므로 가장 작은 몫만
  set: 20,     // 오늘 세트 (.61 × 4분)
  rev: 25,     // 복습 (.61 × 5분) — 가장 높다. 기준점이다
  fix: 2,      // 오답 하나 정복 (.61 × 0.5분)
  say: 3,      // 따라 말하기 (.37 × 1분) — 발음과 높낮이를 **둘 다** 통과했을 때만
  write: 5,    // 받아쓰기 한 판 (.37 × 1.5분)
  d3: 20, d7: 50,   // 연속 3일 · 7일 — 계산이 아니라 설계값이다(듀오링고식 연속 보상)
  exam: 30,    // 모의고사 (.61 × 40분 = 200점이지만 **상한 30**. 안 그러면
               // 모의고사만 반복하는 것이 최적이 된다)
  card: 2,     // 카드 읽기 — 인출이 아니라 g=0. 그래도 0 이면 문법 카드를 안 보므로 **바닥값**
};
/* AI 채점 값 — 실제 원가에서 역산했다(docs/scoring-basis.md).
   가장 비싼 호출(쓰기 채점)이 한 번에 3.13원이다. 5점이면 1점 ≒ 0.63원.
   하루 열심히 하면 50점이 쌓이니 AI 채점 열 번, 한 달 원가는 사람당 600원 아래다. */
const AI_COST = 5;
function credits() {
  if (!S.cr) S.cr = { bal: 0, sum: 0, wk: {} };     // 남은 것 · 모두 번 것 · 주별 적립
  return S.cr;
}
function earn(n, why) {
  if (!(n > 0)) return;
  const c = credits();
  c.bal += n; c.sum += n;
  const w = weekKey();
  c.wk[w] = (c.wk[w] || 0) + n;
  // 주 기록은 8주만 남긴다 — 저장 공간을 계속 먹으면 안 된다
  const keep = Object.keys(c.wk).sort().slice(-8);
  Object.keys(c.wk).forEach(k => { if (!keep.includes(k)) delete c.wk[k]; });
  save();
  // 점수 알림은 뺐다 (2026-09-27: 순위 화면을 없앴으니 점수는 AI 채점 몫으로만 조용히 쌓인다)
}
function spend(n) {
  const c = credits();
  if (c.bal < n) return false;
  c.bal -= n; save();
  return true;
}
/* 앱이 내주는 열쇠로 도는가(=우리가 돈을 내는가). 내 키가 있으면 점수와 무관하다. */

/* 출석·연속 보너스 — touchToday 가 '오늘 처음'일 때만 부른다 */
function earnAttend() {
  earn(CRD.day, tr('오늘 출석'));
  const st = streakDays();
  const c = credits();
  if (st >= 7 && c.d7 !== ymd()) { c.d7 = ymd(); earn(CRD.d7, tr('연속 7일')); }
  else if (st >= 3 && c.d3 !== ymd()) { c.d3 = ymd(); earn(CRD.d3, tr('연속 3일')); }
}
/* 하루에 한 번만 주는 몫 — 같은 일을 반복해서 점수를 긁는 것을 막는다 */
function earnOnce(key, n, why) {
  const c = credits();
  c.once = c.once || {};
  if (c.once[key] === ymd()) return;
  c.once[key] = ymd();
  earn(n, why);
}

/* 이 과정에서 실제로 얻을 수 있는 점수만 보여 준다 */

/* 한 달 점수 — 최근 주에 더 무게를 준다.
   지난달에 몰아서 하고 이번 달 내내 논 사람이 위에 있으면 순위가 거짓말이 된다.
   이번 주 1.0 · 1주 전 0.7 · 2주 전 0.5 · 3주 전 0.3 으로 접는다. */
const MONTH_W = [1, 0.7, 0.5, 0.3];

/* ---------- 이번 주 순위판 ----------
   ⚠ 앞의 주석에 적어 둔 대로, 연구는 '전체 등수가 다 보이는 순위표'가 하위권의
   의욕을 꺾는다고 본다(Li 외 2024). 그래도 순위를 넣는 것은 사용자의 결정이다.
   대신 해악을 줄이면서 겨루는 재미는 그대로 두는 장치를 하나 넣었다 —
   **월요일마다 0으로 초기화**된다(듀오링고 리그와 같은 방식).
   그래서 한 주 밀려도 다음 주 월요일이면 모두가 같은 자리에서 다시 시작한다.
   '영영 꼴찌'가 없으면 포기할 이유도 없다. 서버도 주가 바뀌면 점수를 0으로 준다.

   서버가 옛 판(점수 필드 없음)이면 순위를 지어내지 않고, 이번 주 출석 도장으로
   대신 매기고 그 사실을 화면에 밝힌다 — 없는 숫자로 등수를 만들면 안 된다. */
/* 순위 한 줄 — 사람이든 동아리든 같은 모양으로 그린다.
   1·2·3등은 메달을 달아 준다. 숫자만 다르면 눈이 등수를 못 읽는다(색만으로도 안 된다). */

/* 순위판은 **1~3위만** 내건다 (사용자 지시).
   4위 아래는 이름을 걸지 않는다 — 내 등수는 화면 맨 위 '내 자리'에서 나만 본다.
   연구가 말하는 해악(전체 등수 공개가 하위권 의욕을 꺾는다, Li 외 2024)을
   피하면서 겨루는 재미는 위 세 자리에 남긴다. */
/* 개인 순위 = **앱 전체 사람 중에서** (대표님 지시, 2026-08-29).
   전에는 같은 동아리 사람끼리만 줄을 세웠다. 동아리가 셋뿐이라 그건 순위가 아니라 방 안 겨루기였다.
   서버가 내주는 것은 **맨 위 셋의 별명·점수**와 **내 자리**뿐이다 —
   4등 아래는 이름도 등수도 오지 않는다. 자기 등수는 자기만 본다. */

/* 이 화면의 주인공은 **순위**다. 점수는 순위를 매기기 위한 재료로 뒤에 놓는다.
   숫자는 둘이고 하는 일이 다르다 — 헷갈리면 안 되므로 화면에서도 갈라 놓는다.
     · 이번 주 점수 : 순위용. 월요일마다 0으로 초기화된다.
     · 모은 점수 : AI 채점에 쓰는 몫. 계속 쌓이고, **써도 순위는 안 내려간다**
       (순위는 '번 것'으로 매기지 '남은 것'으로 매기지 않는다 — 안 그러면
        AI 채점을 쓸수록 등수가 떨어져서, 좋은 기능을 쓰지 말라는 말이 된다). */

/* 좌우로 밀어 이전·다음 — 사진첩과 같은 방향(왼쪽으로 밀면 다음).
   한국어 과정 카드들(날마다·문법·기본기·문화)은 '‹이전 / 다음›' 단추만 있었는데,
   폰에서는 미는 게 훨씬 빠르다. 단추를 누르는 동작과 안 겹치도록 40px 넘게
   민 것만 넘긴다(가벼운 탭은 무시). */
function swipeNav(host, prev, next) {
  let x0 = null, y0 = null;
  host.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  host.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    // 세로로 더 많이 움직였으면 그건 스크롤이다 — 넘기지 않는다
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    (dx < 0 ? next : prev)();
  }, { passive: true });
}

/* 가로 막대 한 줄 — 운영 현황(제보 주제)에서 쓴다. 1·2·3등은 메달 (순위 화면은 2026-09-27에 뺐지만 이 줄은 남긴다) */
const MEDAL = ['🥇', '🥈', '🥉'];
function rankRow(i, name, val, top, mine, sub) {
  const r = el('div', 'crank' + (mine ? ' me' : ''));
  r.append(el('span', 'crno' + (i < 3 ? ' hi' : ''), i < 3 ? MEDAL[i] : String(i + 1)));
  const nk = el('span', 'crnick');
  nk.append(document.createTextNode(name));
  if (mine) nk.append(el('span', 'crmine', tr('나')));
  if (sub) nk.append(el('i', 'cnsub', sub));
  r.append(nk);
  const bar = el('span', 'crbar');
  const fill = el('i');
  fill.style.width = Math.max(4, Math.round(val / (top || 1) * 100)) + '%';
  bar.append(fill);
  r.append(bar, el('span', 'crval', String(val)));
  return r;
}
let WB = 'all';                        // 단어장에서 보고 있는 칸 — 학습한 모든 단어 · 자주 틀린 것 · 담은 것 (2026-10-02 차례)
/* 단어장은 **하루 5분 것만** 담는다 (대표님 지시: 섞지 마라).
   실전 단어는 제 화면에서 회차별로 보므로 여기 섞으면 목록만 길어진다. */
/* ---------- 베트남어 사전 ----------
   대표님 지시(2026-08-30): "베트남어 사전도 어플에 추가해줘."
   따로 자료를 받지 않는다 — 앱이 이미 단어 5,100여 개와 예문 단어 사전을 갖고 있다.
   베트남어로도 한국어로도 찾을 수 있고, 성조를 안 찍어도 찾아진다(뼈대로 견준다).
   AI 를 쓰지 않으므로 돈이 들지 않는다. */
let DICT = null;
/* 앱 예문 (대표님 2026-10-01 "사전에 예문이 없다 → 앱 속 예문 연결") — 사전 낱말 카드에 앱에 이미 있는 문장(일상·직무·교재·선배·22기·문법 예문·대화)
   가운데 그 낱말이 **낱말로** 쓰인 것을 보인다. 문장을 사전 표제어로 왼쪽부터 가장 긴 것부터 잘라(an toàn 은 한 덩어리) 그 조각이 찾는 낱말과 같을 때만 —
   an 을 찾을 때 an toàn 속 an 은 안 센다. 새 문장을 만들지 않는다(지어내지 않는다). 처음 열 때 한 번 만든다 */
let APPEX = null;
/* 사전 '문장' 칸 (2026-10-02) — 앱 예문·교재 원문(appExIndex) + 사전 예문(DEX). 낱말 단위로 찾으려고 모자·성조 뗀 글을 한 번만 만들어 둔다 */
let DSENT = null, DTAB = 'vi', DTABQ = '';
function dictSentPool() {
  if (DSENT && DSENT.dex === !!DEX) return DSENT.list;
  const list = [], seen = new Set();
  const put = (v, k) => { v = String(v || '').trim(); k = String(k || '').trim(); const lk = v.toLowerCase(); if (!v || !k || seen.has(lk)) return; seen.add(lk); list.push({ vi: v, ko: k, b: ' ' + dictBare(v) + ' ', n: v.split(/\s+/).length }); };
  appExIndex().list.forEach(m => put(m.vi, m.ko));
  if (DEX) Object.values(DEX).forEach(a => a.forEach(p => put(p[0], p[1])));
  DSENT = { dex: !!DEX, list };
  return list;
}
/* keys: 모자 뗀 낱말(구)들 — 그 가운데 하나라도 낱말 단위로 든 문장. 친 말 그 자체인 문장 먼저, 그다음 짧은 문장. 20개까지 */
function dictSents(keys) {
  keys = keys.filter(Boolean); if (!keys.length) return [];
  const hit = [];
  for (const m of dictSentPool()) { if (keys.some(k => m.b.includes(' ' + k + ' '))) hit.push(m); }
  hit.sort((a, b) => (keys.includes(a.b.trim()) ? 0 : 1) - (keys.includes(b.b.trim()) ? 0 : 1) || a.n - b.n);
  return hit.slice(0, 20).map(m => ({ vi: m.vi, ko: m.ko, sent: 1 }));
}
function dictSentsKo(q) {
  const hit = dictSentPool().filter(m => m.ko.toLowerCase().includes(q));
  hit.sort((a, b) => a.n - b.n);
  return hit.slice(0, 20).map(m => ({ vi: m.vi, ko: m.ko, sent: 1 }));
}
function appExIndex() {
  if (APPEX) return APPEX;
  const heads = new Set(dictBuild().map(x => x.vi.toLowerCase()));
  const list = [], seenV = new Set();
  const add = o => {
    const v = String(o.vi).trim(), k = v.toLowerCase();
    if (v.split(/\s+/).length < 3 || seenV.has(k) || !/[a-zà-ỹđ]/i.test(v)) return;
    seenV.add(k); list.push({ vi: v, ko: String(o.ko).trim(), kr: o.kr || '', au: !!(AIDX && (AIDX[v] || AIDX[k])) });   // 우리 소리 있는 문장 먼저 (recKey 는 느려 미리 센다)
  };
  const walk = (o, dep) => {
    if (!o || dep > 16) return;                                  // order.json 은 권→트랙→챕터→과→낱말→예문 으로 깊다
    if (Array.isArray(o)) { o.forEach(v => walk(v, dep + 1)); return; }
    if (typeof o !== 'object') return;
    if (typeof o.vi === 'string' && typeof o.ko === 'string' && o.ko) add(o);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, dep + 1);
  };
  /* 교재 원문 먼저 — 메인 교재 낱말의 예문 가운데 쪽 이미지로 대조해 교재 문장으로 확인한 것(ex_src = main_book, tools/book_ex, 2,094문장).
     나머지(일상·직무·선배·22기·문법 예문)는 대부분 AI·클로드가 쓴 문장이다 — '만든 예문'(대표님 2026-10-01 "거의 대부분 지어낸 문장일걸?" → 출처 표시로 확인) */
  /* 교재 원문 표시 둘 다 본다 — 낱말의 ex_src(메인 교재) · 예문 안의 src(일상·직무·선배·22기 예문을 교재 원문으로 바꾼 것, tools/ex_source 2026-10-01) */
  const bkSet = new Set();
  const scan = (o, dep) => {
    if (!o || dep > 16) return;
    if (Array.isArray(o)) { o.forEach(v => scan(v, dep + 1)); return; }
    if (typeof o !== 'object') return;
    if (o.ex && o.ex.vi && (o.ex_src === 'main_book' || o.ex.src === 'main_book')) bkSet.add(String(o.ex.vi).trim().toLowerCase());
    for (const v of Object.values(o)) if (v && typeof v === 'object') scan(v, dep + 1);
  };
  scan(ALL, 0); scan(COURSE, 0); scan(GYBM, 0);
  (GYBM || []).forEach(src => src.lessons.forEach(l => l.words.forEach(w => { if (w.ex && w.ex.vi && bkSet.has(String(w.ex.vi).trim().toLowerCase())) add(w.ex); })));
  walk(ALL, 0); walk(COURSE, 0); walk(GYBM, 0); walk(GRAM, 0);
  list.forEach(s2 => { if (bkSet.has(s2.vi.toLowerCase())) s2.bk = 1; });
  const idx = new Map();
  list.forEach((s2, i) => {
    const raw = s2.vi.replace(/[.,!?;:"“”‘’()…–—]/g, ' ').split(/\s+/).filter(Boolean), t = raw.map(x => x.toLowerCase());
    for (let a = 0; a < t.length;) {
      let n = Math.min(4, t.length - a);
      for (; n > 1; n--) if (heads.has(t.slice(a, a + n).join(' '))) break;
      /* 문장 가운데 대문자로 시작하면 이름(bé An·Hà Nội)이다 — 소문자 낱말(an)의 예문으로 세지 않고 대문자 열쇠로 둔다 */
      const cap = a > 0 && raw[a][0] !== t[a][0];
      const base = t.slice(a, a + n).join(' ');
      const keys = cap ? ['^' + base] : a === 0 && raw[0][0] !== t[0][0] ? [base, '^' + base] : [base];   // 문장 첫 낱말은 이름일 수도(Hà Nội là …) — 두 열쇠 다
      keys.forEach(w => { if (!idx.has(w)) idx.set(w, []); const arr = idx.get(w); if (arr[arr.length - 1] !== i) arr.push(i); });
      a += n;
    }
  });
  APPEX = { list, idx };
  return APPEX;
}
const sentRank = s2 => /[.!?]$/.test(s2.vi) || (s2.vi[0] !== s2.vi[0].toLowerCase()) ? 0 : 1;   // 온전한 문장이 짧은 구(ăn tại chỗ)보다 먼저
function appExFor(vi, skip, book) {
  const v0 = String(vi).trim(), X = appExIndex();
  const ids = X.idx.get((v0 !== v0.toLowerCase() ? '^' : '') + v0.toLowerCase()) || [];   // 대문자 든 표제어(Hà Nội)는 이름 열쇠로 — [À-Ỹ] 범위는 소문자도 품어 쓰지 않는다
  const sk = String(skip || '').trim().toLowerCase();
  return ids.map(i => X.list[i]).filter(s2 => s2.vi.toLowerCase() !== sk && (book === undefined || !!s2.bk === book))
    .sort((a, b) => sentRank(a) - sentRank(b) || (a.au ? 0 : 1) - (b.au ? 0 : 1) || a.vi.length - b.vi.length).slice(0, 3);
}
let DFREQ = null;   // 낱말 빈도 순위 (data/_dict_freq.json — tools/dict_freq/count.py, 위키백과 + 앱 예문, 2026-10-01)
const FREQ_TOP = 3000;   // 이 순위 안이면 '자주 쓰는 말' 표시
let DEX = null, DEX_P = null;   // 사전 예문 (data/_dict_ex.json, 2026-10-01)
function dexLoad() {
  if (DEX) return Promise.resolve();
  if (!DEX_P) DEX_P = fetch('data/_dict_ex.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { DEX = j; }).catch(() => { DEX = {}; });
  return DEX_P;
}
/* 선배 메모(선배 한월어 엑셀 메모 파일)는 지웠다 (대표님 2026-10-03 "단어 카드에 선배 메모라는 것이 남아 있네 — 선배 단어 완전 삭제") */
let DSKIP = null;   // 사전에서 뺄 문장 (data/_dict_skip.json — 대표님 지시 2026-09-29: "사전 검색했는데 왜 문장도 검색되니")
let DEN = null;     // 영어 검색 열쇠 (data/_dict_en.json — 영어는 열쇠일 뿐, 화면에는 한국어만)
const ENQ = q => /^[a-z][a-z' -]*$/i.test(q);
const dictBare = v => {
  let t = String(v).normalize('NFD').replace(/[\u0300-\u0323]/g, '');
  t = t.normalize('NFC').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9 ]/g, '').trim();
  // 자음 뒤 홀로 끝나는 y 는 i 로 — 'quan li' 로 쳐도 quản lý 가 나온다 (viCanon 과 같은 규칙, 2026-09-29)
  return t.split(' ').map(x => /^(b|c|ch|d|g|gh|h|k|kh|l|m|n|ng|ngh|nh|p|ph|r|s|t|th|tr|v|x|qu)y$/.test(x) ? x.slice(0, -1) + 'i' : x).join(' ');
};
/* 모자(ă â ê ô ơ ư đ)는 두고 성조만 뺀 꼴 — 'ăn' 을 치면 ăn·ắn·ằn 이 an·án 보다 앞에 오게 (2026-09-29 밤) */
const dictHat = v => viCanon(v).replace(/[0-9]/g, '');
function dictBuild() {
  if (DICT) return DICT;
  const seen = new Map();
  /* 문장은 사전에 안 나온다 (대표님 지시 2026-09-27) — 단어·구만. 다섯 단어 이상이거나 문장 부호가 들어 있으면 문장으로 본다. */
  const isSent = v => v.split(/\s+/).length >= 5 || /[.!?…]$/.test(v) || /[,;:"“”]/.test(v);
  const KEEP = ['ex', 'ex_src', 'img', 'kr', 'kr_read', 'tones', 'alt', 'hanja', 'south', 'work', 'gl', 'form', 'fex'];
  // 괄호 안의 ·,/; 는 구절 경계가 아니다 — '운동하다(헬스·체조: tập gym·tập thể dục)' 이 세 조각으로 찢기지 않게 (2026-09-29 밤)
  const SEP = { '·': '\u0001', ',': '\u0002', '/': '\u0003', ';': '\u0004' }, UNSEP = { '\u0001': '·', '\u0002': ',', '\u0003': '/', '\u0004': ';' };
  const phr = g => g.replace(/\([^)]*\)/g, m => m.replace(/[·,\/;]/g, c => SEP[c])).split(/\s*[·\/,;]\s*/).map(s => s.replace(/[\u0001-\u0004]/g, c => UNSEP[c]).trim()).filter(Boolean);
  const put = (vi, ko, w, onlyNew, src) => {
    const k = String(vi || '').trim();
    if (!k || !ko || (isSent(k) && !onlyNew)) return;   // 참고 사전의 속담·관용구(4낱말 이상)는 사전 표제어라 문장 걸개를 안 탄다 (2026-09-30)
    const kk = viCanon(k);                  // quản lý/quản lí·hoà/hòa 는 한 줄로 (2026-09-29)
    /* 문장·문형·글자 묶음은 사전에 안 나온다 (2026-09-29): 다섯 낱말 미만이라 위 걸개를 빠져나온 문장(tôi đi nhé·có sao không …)은
       손으로 고른 목록(_dict_skip.json)으로, 'c · k · q'·'từ ~ đến ~'·'mỗi A một B'·한글 제목 같은 것은 글자 꼴로 거른다 */
    if ((DSKIP && DSKIP.has(kk)) || /[·\/~()]/.test(k) || /[가-힣]/.test(k) || /(^|\s)[A-Z](\s|$)/.test(k)) return;
    /* 낱말이 아닌 것은 사전에 없다 (대표님 2026-09-30 "실제 베-한 사전에 있는 것만"): 숫자(1·2023), 문형 빈칸(càng...càng, 'cả  lẫn'), 음절 조각("(예) ắc quy = …" 뜻) */
    if (/^\d/.test(k) || /\.\.\.|  /.test(k) || /^\(예\)/.test(String(ko))) return;
    /* 뜻은 **사전 한 벌**에서 (대표님 2026-09-30 "출처마다 뜻이 겹친다 — 사전 하나로"): 참고 사전 줄이 있으면 그것이 뜻이고, 없으면 처음 넣은 수업 자료의 뜻 하나.
       수업 자료끼리는 뜻을 이어 붙이지 않는다(전엔 '책상 · 책상, 탁자 · 테이블·탁자' 처럼 겹쳤다). 수업 자료의 첫 뜻이 사전 줄에 없으면 그 하나만 뒤에 보탠다 */
    if (onlyNew && seen.has(kk)) {
      const o = seen.get(kk), first = phr(o.ko)[0] || '', dko = String(ko);
      o.ko = dko; if (first && !phr(dko).some(h => h === first || h.includes(first) || first.includes(h))) o.ko += ' · ' + first;
      return;
    }
    if (!seen.has(kk)) seen.set(kk, onlyNew ? { vi: k, ko: String(ko), ref: 1 } : { vi: k, ko: String(ko) });
    const o = seen.get(kk);
    /* 어느 파트에서 나온 단어인지 (대표님 지시 2026-09-29: "사전-일상-cái nhà 이런 식으로") — 먼저 넣은 파트부터 둘까지 */
    // '예문·사전·참고 사전'은 수업 파트가 없을 때만 — '선배·사전'처럼 군더더기가 붙지 않게
    const part = !['예문', '사전', '참고 사전'].includes(src);
    if (src && (part || !(o.src && o.src.length))) { o.src = o.src || []; if (!o.src.includes(src) && o.src.length < 2) o.src.push(src); }
    /* 여러 자료의 뜻을 합칠 때 겹치는 단어은 다시 안 붙인다 — "누나·언니 / 누나·언니뻘 여자 / 언니" 처럼 길어지지 않게. 세 갈래까지만. */
    /* 뜻은 **구절** 단위로 합친다 (2026-09-29): 앞서는 낱말 단위라 '요리하다 / 요리하다, 밥을 짓다 / 요리하다·요리·밥을 짓다' 처럼 같은 뜻이 세 번 붙었다.
       새 자료의 구절 중 이미 있는 구절(또는 그것을 품은 구절)과 겹치지 않는 것만 ' · ' 로 잇는다. 여섯 구절까지. */
    if (w) KEEP.forEach(f => { if (o[f] === undefined && w[f] !== undefined) o[f] = w[f]; });
  };
  /* 앱에 있는 단어은 **전부** (대표님 지시 2026-09-27: "최소한 우리 어플에 있는 모든 단어는 들어가야 함") */
  ALL.forEach(d => (d.words || []).forEach(w => put(w.vi, w.ko, w, false, /^P/.test(String(d.day)) ? '기본기' : '일상')));   // 기본기·일상
  CWORDS.forEach(w => put(w.vi, w.ko, w, false, '직무'));                                                              // 직무(order.json)
  const GSRC = { main: '교재', c22: '22기' };
  (GYBM || []).forEach(g => g.lessons.forEach(l => l.words.forEach(w => put(w.vi, w.ko, w, false, GSRC[g.key] || 'GYBM'))));   // GYBM 교재·선배·22기
  if (GRAM) GRAM.books.forEach(b => b.bai.forEach(c => c.g.forEach(g =>
    (g.kw || []).forEach(([w, m]) => put(String(w).replace(/[.…]/g, '').trim(), m, null, false, '문법')))));   // 문법 핵심 단어
  Object.entries(EXG || {}).forEach(([k, v]) => put(k, typeof v === 'string' ? v : v.ko, typeof v === 'object' ? { kr: v.kr } : null, false, '예문'));   // 예문 단어
  if (SIB) Object.entries(SIB.w).forEach(([k, v]) => { if (v.k) put(k, v.k, null, false, '사전'); });   // 헷갈리는 짝 자료(사전 단어 — 한국어 뜻 있는 것)
  /* 참고 사전 (2026-09-29, 대표님 "사전 작업 다 못했니?") — 뜻 25,835개를 다 옮겨 놓고도 사전 탭이 찾지 않았다.
     앱·짝 자료에 없는 말만 '참고' 표시를 달아 넣는다. 열쇠가 소문자라 대문자 꼴은 _dict_head.json 에서 되살린다. */
  if (DFULL) Object.entries(DFULL).forEach(([k, e]) => put(e.h || k, dfullText(e), null, true, '참고 사전'));   // 사전 한 벌(위키 그대로, 2026-10-01)
  else if (DKO) Object.entries(DKO).forEach(([k, v]) => put((DKH && DKH[k]) || k, Array.isArray(v) ? v.join(' · ') : v, null, true, '참고 사전'));
  /* 검수된 뜻 목록(data/_senses.json)의 뜻도 사전 뜻에 넣는다 — 한국어로 찾을 때 '운동하다' 로 tập 이 나오게 (대표님 지시 2026-09-29 밤: "모든 뜻을 가져와서 표기"). 여덟 구절까지 */
  if (SENSES) seen.forEach(o => {
    const ss = SENSES[String(o.vi).trim().toLowerCase()];
    if (!ss || ss.length < 2) return;
    const have = phr(o.ko);
    const add = ss.map(t => t.trim()).filter(p => p && !have.some(h => h === p || h.includes(p) || p.includes(h)));
    if (add.length && have.length < 8) o.ko += ' · ' + add.slice(0, 8 - have.length).join(' · ');
  });
  DICT = [...seen.values()].map(x => ({ ...x, b: dictBare(x.vi), h: dictHat(x.vi), en: (DEN && DEN[x.vi.toLowerCase()]) || null, fr: (DFREQ && DFREQ[x.vi.toLowerCase()]) || 99999 }));
  DICT.sort((a, b) => a.b.localeCompare(b.b));
  return DICT;
}
/* 사전이 읽는 자료가 다 와 있는지 — 안 온 것은 받아 온다 (문법·선배·GYBM·짝 자료는 그 화면을 열어야만 받아 왔다) */
async function dictReady() {
  const get = (path, fn) => fetch(path, { cache: 'no-cache' }).then(r => r.json()).then(fn).catch(() => { });
  const jobs = [];
  if (!SIB) jobs.push(sibLoad());
  if (!GRAM) jobs.push(get('data/grammar.json', j => { GRAM = gramReady(j); }));
  if (typeof GYBM !== 'undefined' && !GYBM) jobs.push(get('data/gybm.json', j => { GYBM = j.sources; GYBM_ALL = null; }));   // gybmBuild 와 같이 sources 배열만 (2026-09-27: 통째로 넣어 사전이 멈췄다)
  if (!COURSE) jobs.push(get('data/order.json', j => { COURSE = j; loadCWords(); }));
  if (!DKO) jobs.push(get('data/_dict_ko.json', j => { DKO = j; }));
  if (!DFULL) jobs.push(get('data/_dict_full.json', j => { DFULL = j; }));
  if (!KO2VI) jobs.push(get('data/_ko2vi.json', j => { KO2VI = j; }));
  if (!DKH) jobs.push(get('data/_dict_head.json', j => { DKH = j; }));
  if (!KRSYL) jobs.push(get('data/_kr_syl.json', j => { KRSYL = j; }));
  if (!DSKIP) jobs.push(get('data/_dict_skip.json', j => { DSKIP = new Set(j.map(viCanon)); }));
  if (!DEN) jobs.push(get('data/_dict_en.json', j => { DEN = j; }));
  if (!DFREQ) jobs.push(get('data/_dict_freq.json', j => { DFREQ = j; }));
  jobs.push(southLoad(), sensesLoad(), dexLoad());   // 사전 예문은 '문장 속에서' 찾기에도 쓴다 (2026-10-01)   // 남부 딱지·검수된 뜻 목록 (2026-09-29 밤)
  await Promise.all(jobs);
  DICT = null;
}
/* 사전에서 단어을 누르면 **단어 카드와 완전히 같은 화면**으로 연다 (대표님 지시 2026-09-27) —
   단어/발음 면·헷갈리는 짝·듣기·말하기·입모양·높낮이 전부. 학습 진도와는 상관없다(L.dict). */
function openWordCard(x, back) {
  const w = Object.assign({}, x);
  delete w.b;
  if (!w.vi) return;
  LCRUMB = tr('사전') + '-' + (x.src && x.src.length ? x.src.map(t => tr(t)).join('·') + '-' : '') + w.vi;   // 사전-일상-cái nhà (2026-09-29)
  L = { day: { day: 'dict', theme: tr('사전'), words: [w] }, items: [{ k: 'word', d: w }], i: 0, dict: true };
  if (back) dive(back);
  drawCard();
  show('learn', w.vi, true);
  drawLessonTabs();
}
/* 사전 검색 기록 (대표님 지시 2026-09-30: "각자 폰에 남기면 서버비 부담 없지? 몇 개까지?") — 누른 낱말을 이 기기에만 50개.
   S 에 두지만 PROGKEYS 밖이라 서버로 안 올라간다(진도 해시에도 안 든다). 같은 말은 맨 위로 올린다. 50개 ≈ 3KB — 크기는 문제가 아니고, 그보다 길면 아무도 안 내려 본다 */
/* 사전 낱말의 한글 발음 열쇠(띄어쓰기 뺌) — 발음으로 찾기 (대표님 2026-10-01 "발음으로 검색해도 나올 수 있게").
   북부(kr·kr_read)와 남부(krs) 발음, 없으면 음절 표(_kr_syl.json, tools/vi_kr.py 규칙)로 만든 발음. 처음 한 번 만들어 둔다 */
function dictKrKeys(x) {
  if (x.kk) return x.kk;
  const made = /[fjwz]/i.test(x.vi) || /[A-Z]{2}/.test(x.vi) ? '' : krOf(x.vi);   // 베트남어에 없는 글자(fan·jeans)·머리글자(ANTV)는 음절 표로 만들면 반쪽 발음('안')이 된다 — 안 만든다
  const ks = [x.kr_read, x.kr, x.krs, made].filter(Boolean).map(k => String(k).replace(/[\s\[\]]+/g, ''));
  x.kk = [...new Set(ks)];
  return x.kk;
}
/* 영어 열쇠를 뜻 하나하나로 — 'to prohibit; to forbid' → prohibit · forbid. 앞의 to·a·an·the 와 괄호는 뺀다.
   전에는 열쇠 통째로 'to …' 로 시작하는지 봐서 to 를 치면 동사 7천 개가 걸렸다 (2026-10-01) */
function dictEnTerms(x) {
  if (x.et) return x.et;
  const t = [];
  (x.en || []).forEach(e => String(e).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/\s*[;,/]\s*/).forEach(p => {
    p = p.replace(/^(to|a|an|the)\s+/, '').replace(/\s+/g, ' ').trim();
    if (p && !t.includes(p)) t.push(p);
  }));
  x.et = t;
  return t;
}
const DICT_HIST_MAX = 50;
function dictRemember(x) {
  const h = (S.dictHist || []).filter(e => e.vi !== x.vi);
  h.unshift({ vi: x.vi, ko: x.ko, t: Date.now() });
  S.dictHist = h.slice(0, DICT_HIST_MAX); save();
}
/* ── 사진에서 글자 찾기 ── Tesseract.js 5 (폰 안 OCR). 엔진·핵심은 jsdelivr, 글자 자료는 tessdata_fast(GitHub) — 모두 무료·한도 없음 */
let OCR = null;
/* 어느 단계에서 막혔는지 남긴다 (대표님 2026-09-30 폰에서 "준비하지 못했습니다 — 인터넷 연결" 이 떴는데 와이파이는 됐음). 엔진(jsdelivr → unpkg)과
   글자 자료(jsdelivr 의 GitHub 거울 → raw.githubusercontent) 는 한 곳이 막히면 다른 곳으로 다시 받는다. 실패하면 e.step 에 단계 이름. */
const ocrStep = (step, e) => { const err = e instanceof Error ? e : new Error(String(e && e.message || e || '')); err.step = step; return err; };
function loadScript(src) { return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error(src.split('/')[2])); document.head.append(sc); }); }
async function ocrWorker(lang) {
  if (!window.Tesseract) {
    try { await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'); }
    catch (e) { try { await loadScript('https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js'); } catch (e2) { throw ocrStep('엔진 받기', e2); } }
  }
  if (OCR && OCR.lang === lang) return OCR.w;
  if (OCR) { try { await OCR.w.terminate(); } catch (e) { } OCR = null; }
  const PATHS = ['https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@main', 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main'];
  let last = null;
  for (const langPath of PATHS) {
    try { const w = await Tesseract.createWorker(lang, 1, { langPath, gzip: false }); OCR = { w, lang }; return w; }
    catch (e) { last = e; }
  }
  throw ocrStep('글자 자료 받기', last);
}
/* 사진을 그림판(canvas)에 옮겨 긴 변 1600px 이하로 줄인다 — 폰 사진 원본(4000px, 12MP)은 인식 엔진 메모리를 넘겨 실패하기 쉽고,
   아이폰 HEIC 도 브라우저가 그릴 수 있으면 여기서 보통 그림이 된다. 못 그리면 e.step = '사진 열기' */
async function ocrCanvas(file, max) {
  let bmp = null;
  try { bmp = await createImageBitmap(file); }
  catch (e) {
    bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(file.type || 'image')); im.src = URL.createObjectURL(file); }).catch(e2 => { throw ocrStep('사진 열기', e2); });
  }
  const W = bmp.width || bmp.naturalWidth, H = bmp.height || bmp.naturalHeight;
  if (!W || !H) throw ocrStep('사진 열기', new Error('0px'));
  const k = Math.min(1, max / Math.max(W, H));
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return c;
}
async function photoSearch(file, inp, redraw, host) {
  const old = host.querySelector('.photopan'); if (old) old.remove();
  const pan = el('div', 'photopan');
  const top = el('div', 'photohd');
  /* 베트남어 글자만 읽는다 (대표님 2026-09-30 "한국어 글자도 읽어야 하나?") — 영어·로마자는 베트남어 자료로도 읽히고(같은 알파벳), 한국어는 따로 1.6MB 자료가 필요한데 쓸 일이 없다 */
  const lang = () => 'vie';
  const cl = el('button', 'ghost sm', tr('닫기')); cl.type = 'button'; cl.onclick = () => pan.remove();
  top.append(cl); pan.append(top);
  const wrap = el('div', 'photowrap'); const im = new Image(); im.className = 'photoimg'; im.alt = ''; im.src = URL.createObjectURL(file); wrap.append(im); pan.append(wrap);
  const st = el('p', 'dimtxt', tr('글자 인식 준비 중… 처음 한 번은 조금 걸립니다')); pan.append(st);
  host.querySelector('.dictsearch').after(pan);
  const out0 = host.querySelector('.dictout');            // 사전 결과 칸 — 목록의 낱말을 누르면 사진 판 바로 아래에 오게 옮긴다
  try {
    const w = await ocrWorker(lang());
    const cv = await ocrCanvas(file, 1600);
    let data;
    try { ({ data } = await w.recognize(cv)); } catch (e) { throw ocrStep('글자 읽기', e); }
    await new Promise(r => { if (im.complete && im.naturalWidth) r(); else im.onload = r; });
    const sx = im.clientWidth / (cv.width || 1), sy = im.clientHeight / (cv.height || 1);   // 알약 자리는 줄인 그림 기준
    const clean = t => String(t || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    const words = (data.words || []).map(x => ({ t: clean(x.text), b: x.bbox, c: x.confidence })).filter(x => x.t && /\p{L}/u.test(x.t) && x.c >= 40);
    /* 사진 위 알약 = 그 자리를 **다시 읽기**(잘못 읽혔을 때 — 대표님 2026-09-30 "사진에서 글자 인식을 잘 못하는 경우가 있어서"):
       그 낱말 상자만 잘라 글자 높이 60px 쯤으로 키워 한 낱말 모드로 다시 읽고, 다르게 읽히면 알약·목록 글자를 바꾼다.
       사진 밑 목록 = 그 낱말 **찾기**(결과는 목록 바로 아래 사전 결과 칸에). */
    const recheck = async x => {
      st.textContent = tr('다시 읽는 중') + '… ' + x.t;
      try {
        const m = 6, bx = x.b, cx = Math.max(0, bx.x0 - m), cy = Math.max(0, bx.y0 - m);
        const cw = Math.min(cv.width - cx, bx.x1 - bx.x0 + 2 * m), ch = Math.min(cv.height - cy, bx.y1 - bx.y0 + 2 * m);
        const k = Math.max(1, Math.min(4, 60 / Math.max(1, ch)));
        const c2 = document.createElement('canvas'); c2.width = Math.round(cw * k); c2.height = Math.round(ch * k);
        c2.getContext('2d').drawImage(cv, cx, cy, cw, ch, 0, 0, c2.width, c2.height);
        await w.setParameters({ tessedit_pageseg_mode: '8' });                       // 한 낱말
        let t = '';
        try { const r = await w.recognize(c2); t = clean(String(r.data.text || '').trim().split(/\s+/)[0] || ''); }
        finally { await w.setParameters({ tessedit_pageseg_mode: '3' }); }
        if (t && /\p{L}/u.test(t) && t !== x.t) { x.t = t; x.chip.textContent = t; if (x.li) x.li.textContent = t; st.textContent = tr('다시 읽음') + ': ' + t; }
        else st.textContent = tr('같게 읽힙니다') + ' — ' + tr('틀렸으면 찾을 말 칸에 직접 고쳐 쓰세요');
      } catch (e) { st.textContent = tr('다시 읽지 못했습니다'); }
    };
    words.forEach(x => {
      const chip = el('button', 'photochip', esc(x.t)); chip.type = 'button'; chip.title = tr('다시 읽기');
      chip.style.left = Math.round(x.b.x0 * sx) + 'px'; chip.style.top = Math.round(x.b.y0 * sy) + 'px';
      chip.onclick = () => recheck(x); x.chip = chip; wrap.append(chip);
    });
    st.textContent = words.length ? tr('사진 위 알약 = 다시 읽기 · 아래 목록 = 찾기') : tr('글자를 못 찾았습니다 — 글자가 크고 또렷한 사진이 좋습니다');
    if (words.length) {
      const list = el('p', 'anachips');
      words.forEach(x => { const c = el('span', null, esc(x.t)); c.onclick = () => { inp.value = x.t; redraw(); pan.after(out0); }; x.li = c; list.append(c); });
      pan.append(list);
    }
  } catch (e) {
    /* 어느 단계가 막혔는지와 원인 한 토막을 보여 준다 — '인터넷 연결' 만 말하면 와이파이가 되는 폰에서 원인을 알 수 없었다(2026-09-30) */
    const step = (e && e.step) || '준비', msg = String(e && e.message || '').slice(0, 60);
    st.textContent = tr('글자 인식 실패') + ' — ' + tr(step) + (msg ? ' (' + msg + ')' : '');
    console.warn('photoSearch', step, e);
  }
}
function dictEntry(q0) {
  const b = $('#subBody'); b.textContent = '';
  const lede = el('p', 'lede', tr('불러오는 중…'));
  /* 입력칸 + 지우기(×), 줄마다 오른쪽에 스피커. 돋보기는 뺐다 (대표님 지시 2026-09-27: '찾을 말' 글자와 겹친다) */
  const box = el('div', 'dictsearch');
  const inp = el('input', 'keyin dictin');
  inp.type = 'search'; inp.placeholder = tr('찾을 말 (성조는 안 찍어도 됩니다)');   // 아래 성조·모자 단추로 찍을 수도 있다 (2026-10-05)
  if (typeof q0 === 'string' && q0) inp.value = q0;   // 내 정보 → 사전 에서는 click 이벤트가 넘어온다
  const clr = el('button', 'dsclear', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>');
  clr.type = 'button'; clr.title = tr('지우기');
  clr.onclick = () => { inp.value = ''; inp.focus(); draw(); };
  box.append(inp, clr);
  /* 말로 찾기 (대표님 물음 2026-09-30 "말로 검색도 되냐" → 폰·브라우저 내장 음성 인식 — 무료, 앱 용량 0, 서버 안 거침).
     말할 언어는 작은 단추(VI/한)로 고르고 기기에 기억한다. 들은 글자를 입력칸에 넣고 바로 찾는다 */
  if (SRClass) {
    /* 베트남어만 듣는다 (대표님 2026-09-30 "말할 언어 버튼이 있어야 하니?") — 폰 음성 인식은 한 번에 한 언어로만 듣고 스스로 가리지 못한다. 찾을 말은 베트남어라 고정 */
    const lang = () => 'vi-VN';
    const mic = el('button', 'dsmic', '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>');
    mic.type = 'button'; mic.title = tr('말로 찾기');
    let sr = null;
    mic.onclick = () => {
      if (sr) { try { sr.stop(); } catch (e) { } return; }
      sr = new SRClass(); sr.lang = lang(); sr.interimResults = true; sr.maxAlternatives = 1;
      mic.classList.add('on');
      sr.onresult = ev => { const r = ev.results[ev.results.length - 1]; inp.value = String(r[0].transcript || '').replace(/[.?!。]+$/, '').trim(); draw(); };
      sr.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') popup(tr('마이크를 쓸 수 없습니다 — 브라우저 설정에서 마이크를 허용해 주세요')); };
      sr.onend = () => { mic.classList.remove('on'); sr = null; };
      try { sr.start(); } catch (e) { mic.classList.remove('on'); sr = null; }
    };
    box.classList.add('hasmic'); box.append(mic);
  }
  /* 사진에서 글자 찾기 (대표님 2026-09-30 "사진 검색 무료면 넣자") — 폰 안에서 Tesseract(무료)로 읽는다. 처음 한 번 읽기 엔진(약 2.8MB)과
     베트남어 글자 자료(0.5MB, 한국어는 1.6MB)를 받아 브라우저가 보관하고, 사진은 폰 밖으로 안 나간다. 읽은 낱말을 사진 위 그 자리에 알약으로 얹고 누르면 찾는다.
     사물(동물 같은 것) 알아보기는 서버 AI가 있어야 해서 아직 없다 */
  { const cam = el('button', 'dsmic dscam', '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>');
    cam.type = 'button'; cam.title = tr('사진에서 찾기');
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true;
    cam.onclick = () => fi.click();
    fi.onchange = () => { const f = fi.files && fi.files[0]; if (f) photoSearch(f, inp, () => draw(), b); fi.value = ''; };
    box.classList.add('hasmic'); box.append(cam, fi); }
  const out = el('div', 'dictout');
  let d = [];
  /* 결과 한 줄 — 찾은 말 목록과 최근 찾은 말 목록이 같은 줄을 쓴다 */
  const dictRow = x => {
    const row = el('button', 'dictrow');
    row.type = 'button';
    const kr = krShow(x) || krOf(x.vi);
    // 참고 사전(앱 수업에는 없는 말)은 작은 표시를 단다 — 배운 단어와 섞여 보이지 않게 (2026-09-29)
    row.append(el('b', 'dvi', esc(x.vi) + (x.fr <= FREQ_TOP ? ' <small class="dref freqtag">' + tr('자주 쓰는 말') + '</small>' : '') + (x.ref ? ' <small class="dref">' + tr('참고 사전') + '</small>' : '') + (southOf(x.vi) ? ' <small class="dref southtag">' + tr('남부') + '</small>' : '')));
    row.append(el('span', 'dkr', kr ? '[' + esc(kr) + ']' : ''));   // 발음이 없어도 칸은 둔다 — 스피커가 늘 오른쪽 끝
    row.append(el('span', 'dko', esc(x.ko)));
    const spk = el('span', 'dspk', '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>');
    spk.setAttribute('role', 'button'); spk.title = tr('듣기');
    spk.onclick = ev => { ev.stopPropagation(); const k = recKey(x.vi); k ? play(k, false, voiceDir()) : speakVi(x.vi, false, 0, S.voice); };
    /* 별(나만의 단어장) — 들어가지 않고 줄에서 바로 담는다 (대표님 2026-10-05). 카드의 ☆ 와 같은 열쇠(vi). 줄이 단추라 안에 단추를 못 넣어 span */
    const st = el('span', 'dstar' + (isStar(x.vi) ? ' on' : ''), isStar(x.vi) ? '★' : '☆');
    st.setAttribute('role', 'button'); st.title = tr('단어장에 담기');
    st.onclick = ev => { ev.stopPropagation(); const on = toggleStar(x.vi, x.ko, x.vi); st.textContent = on ? '★' : '☆'; st.classList.toggle('on', on); };
    row.append(st, spk);
    row.onclick = () => { dictRemember(x); openWordCard(x, () => dictEntry(inp.value)); };   // 누르면 단어 카드 — 뒤로 가면 찾던 말 그대로. 누른 말은 기록에 남는다 (2026-09-30)
    return row;
  };
  /* 문장 한 줄 — '문장 속에서' 칸. 누르면 그 문장 소리(우리 소리가 없으면 기기 소리) */
  const sentRow = m => {
    const row = el('div', 'dictrow sentrow');
    row.append(tapLine(m.vi, 'dvi tapline'), el('span', 'dko', esc(m.ko)));
    const spk = el('span', 'dspk', '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>');
    spk.setAttribute('role', 'button'); spk.title = tr('듣기');
    spk.onclick = ev => { ev.stopPropagation(); const k = recKey(m.vi); k ? play(k, false, voiceDir()) : speakVi(m.vi, false, 0, S.voice); };
    row.append(spk);
    return row;
  };
  /* 최근 찾은 말 (대표님 지시 2026-09-30) — 입력칸이 비어 있을 때. 이 기기(localStorage)에만 남고 서버로는 안 간다(PROGKEYS 밖). 최대 DICT_HIST_MAX 개 */
  const histDraw = () => {
    const h = S.dictHist || [];
    if (!h.length) { out.append(el('p', 'note', tr('한 글자만 넣어도 찾습니다'))); return; }
    out.append(el('p', 'note', tr('최근 검색한 단어')));          // 개수·'이 기기에만' 글은 뺐다 (대표님 2026-09-30)
    h.forEach(e => out.append(dictRow(d.find(y => y.vi === e.vi) || { vi: e.vi, ko: e.ko })));
    const cl = el('button', 'ghost sm', tr('기록 지우기')); cl.type = 'button'; cl.style.marginTop = '10px';
    cl.onclick = async () => { if (await askYN(tr('찾은 말 기록을 지울까요? 이 기기에서만 지워집니다.'), tr('지우기'), true)) { S.dictHist = []; save(); draw(); } };
    out.append(cl);
  };
  const draw = () => {
    const q = inp.value.trim();
    out.textContent = '';
    clr.hidden = !q;
    if (q.length < 1) { histDraw(); return; }
    const qb = dictBare(q), qk = q.toLowerCase(), qh = dictHat(q);
    /* 띄어쓰기 틀려도 찾는다 (대표님 2026-10-05) — 빈칸을 다 뺀 글자로도 견준다: 'bệnhviện'·'benh vien' → bệnh viện, '병원 비' → 병원비 */
    const nsp = t => t.replace(/\s+/g, ''), qbN = nsp(qb), qkN = nsp(qk);
    const num = /^\d[\d.,]*$/.test(q);              // 숫자로 찾기(8 → tám) — 뜻에 그 숫자가 있는 낱말 (대표님 2026-10-01)
    const kor = /[가-힣]/.test(q) || num;
    const k2v = (kor && !num && KO2VI && KO2VI[qk]) || [];   // 한→베: 국립국어원 한국어기초사전 대역 (2026-10-01) — 맨 위로
    /* 정확한 것부터 (대표님 지시 2026-09-29: "병원이라고 검색하면 병원이 최상단에 나와야지 왜 병원비가 최상단에 있냐").
       한국어: 뜻이 그 말 자체(병원) 0 → 여러 뜻 중 하나가 그 말 1 → 그 말로 시작(병원비) 2 → 어딘가 들어 있음 3.
       앞서는 '시작하면 0' 한 갈래뿐이라 '병원'과 '병원비'가 같은 등급이 되고, 베트남어 길이(viện phí 8 < bệnh viện 9)로 병원비가 위로 올라갔다.
       베트남어: 그 말 자체 0 → 그 말로 시작 1 → 들어 있음 2. 같은 등급이면 수업 낱말이 참고 사전보다 먼저, 그다음 짧은 것. */
    // 뜻은 구절 단위로 견준다 — '학교 정문'의 첫 낱말이 '학교'라고 병원·학교와 같은 등급이 되지 않게. 괄호 설명은 빼고 본다: '학교(기관)' = '학교'
    const phrs = s => s.toLowerCase().replace(/\[[^\]]*\]\s*/g, '').replace(/\([^)]*\)/g, '').split(/\s*[·\/,;]\s*/).map(p => p.trim()).filter(Boolean);   // 괄호는 자르기 전에 뺀다 — 괄호 안 ·,/ 로 찢기면 괄호가 안 닫혀 못 뺐다 (2026-09-29 밤)
    const enq = !kor && ENQ(q);                     // 영어로 찾기(hospital) — 영어는 열쇠일 뿐 화면엔 안 나온다
    /* 칸을 나눠 보인다 (대표님 2026-10-01 "영어로 뜻을 검색하는 것과 단어를 검색하는 것 중복되어 검색될 수도"):
       로마자로 치면 ① 베트남어 낱말 ② 영어 뜻으로 찾은 낱말(①에 나온 것은 빼고) — ban 을 치면 bạn·bán 이 위 칸, 영어 ban(금지하다) 뜻의 cấm 은 아래 칸.
       한글로 치면 ① 뜻으로 찾은 낱말 ② 발음으로 찾은 낱말(깜언 → cảm ơn, ①에 나온 것은 빼고). 한 낱말은 한 칸에만 나온다 */
    const cmp = (a, b2) => {
                   /* 베트남어 차례 (2026-09-29 밤, 대표님: "a만 검색해도 모자 쓴 것들도 다 검색 · 우선순위는 근거 기반으로") — docs/기준.md §14-33
                      ① 범위: 낱말 전체가 그 말 0 · 첫 낱말이 그 말 1 · 다른 자리의 한 낱말이 그 말 2 · 앞부분만 3 · 안에 들어 있음 4
                      ② 정확도: 성조·모자까지 똑같음 0 · 모자까지(성조 빼고) 1 · 모자·성조 다 빼고 2
                      점수 = 범위×3 + 정확도 — 범위가 먼저: 친 말 그 자체인 낱말(ăn)이 그 말을 품은 낱말(an toàn)보다 앞, 같은 범위면 친 글자와 더 똑같은 것(an > án > ăn) */
                   const ext = (s, t) => s === t ? 0 : s.startsWith(t + ' ') ? 1 : (s.includes(' ' + t + ' ') || s.endsWith(' ' + t)) ? 2 : s.startsWith(t) ? 3 : s.includes(t) ? 4 : 9;
                   const abbr = x => /\./.test(x.vi) ? 1 : 0;   // 'Đ.'·'Đ.C.G.' 같은 약어 표제어 — 점 뗀 글자(d)가 친 말과 똑같아 'đ' 한 글자에 맨 위로 왔다 (2026-10-06)
                   const sc = x => {
                     if (kor) { const i2 = k2v.indexOf(x.vi.toLowerCase()); if (i2 >= 0) return -10 + i2; const p = phrs(x.ko); return p[0] === qk ? 0 : p.includes(qk) ? 1 : p.some(v => v.startsWith(qk)) ? 2 : 3; }
                     let best = 99;
                     [[x.vi.toLowerCase(), qk], [x.h, qh], [x.b, qb]].forEach(([s, t], f) => { const e = ext(s, t); if (e < 9) best = Math.min(best, e * 3 + f); });
                     if (best < 99) return best + (abbr(x) ? 15 : 0);   // 약어는 앞·안에 든 낱말(최대 14)보다 뒤로
                     if (qbN.length >= 2) { const xb = nsp(x.b); if (xb === qbN) return 1; if (xb.startsWith(qbN)) return 10; if (xb.includes(qbN)) return 13; }   // 띄어쓰기만 다른 것
                     return x.en && x.en[0] === qk ? 20 : 21;   // 영어 열쇠로만 잡힌 것은 맨 뒤 — 첫 뜻이 딱 그 말이면 먼저
                   };
                   const lesson = x => x.src && x.src.some(s => !['예문', '사전', '참고 사전'].includes(s)) ? 0 : 1;   // 수업에 나온 말이 먼저 (trường học 이 học hiệu 보다 위)
                   const nw = x => x.vi.split(/\s+/).length;   // 같은 등급이면 낱말 수가 적은 것(trường)이 붙은 말(trường học)보다 먼저
                   return sc(a) - sc(b2) || (a.ref ? 1 : 0) - (b2.ref ? 1 : 0) || lesson(a) - lesson(b2) || (a.fr || 99999) - (b2.fr || 99999) || nw(a) - nw(b2) || (kor ? a.ko.length - b2.ko.length : 0) || a.vi.length - b2.vi.length;
                 };
    const viHit = x => x.b.includes(qb) || x.vi.toLowerCase().includes(qk) || (qbN.length >= 2 && nsp(x.b).includes(qbN));
    /* 영어 뜻 찾기 (2026-10-02 대표님 "왜 영어로 사전 검색 못 하냐 — skil 같은 거"): 전에는 뜻 하나가 친 말과 **똑같을 때만** 잡혀
       덜 친 말(skil)·복수·과거형(skills·walked)은 0개였다. 이제 ① 똑같음 ② 그 말로 시작하는 구(skill set) ③ 뜻 안의 한 낱말 ④ 친 말로 시작(한 글자부터, skil → skill).
       복수·-ed·-ing 는 밑꼴로도 찾는다(skills → skill, studies → study) */
    const enForms = enq ? [...new Set([qk, qk.replace(/ies$/, 'y'), qk.replace(/es$/, ''), qk.replace(/s$/, ''), qk.replace(/ed$/, ''), qk.replace(/ed$/, 'e'), qk.replace(/ing$/, ''), qk.replace(/ing$/, 'e')].filter(f => f.length >= 2))] : [];
    const enScore = x => {
      let best = 9999;
      dictEnTerms(x).forEach((e, i) => {
        const ws = e.split(' ');
        const lv = enForms.some(f => e === f) ? 0 : enForms.some(f => e.startsWith(f + ' ')) ? 1 : enForms.some(f => ws.includes(f)) ? 2
          : e.startsWith(qk) || ws.some(w => w.startsWith(qk)) ? 3 : 9;   // 한 글자부터 (대표님 2026-10-02 "영어 뜻도 1글자만 해도 나와야지")
        if (lv < 9) best = Math.min(best, lv * 100 + i);
      });
      return best;
    };
    const enHit = x => enq && enScore(x) < 9999;
    const secs = [];
    if (kor) {
      let mean = d.filter(x => num ? phrs(x.ko).includes(qk) : x.ko.toLowerCase().includes(qk) || k2v.includes(x.vi.toLowerCase()) || (qkN.length >= 2 && nsp(x.ko.toLowerCase()).includes(qkN))).sort(cmp);
      const qp = q.replace(/\s+/g, '');
      let pron = [];
      if (!num && /^[가-힣]+$/.test(qp)) {
        /* 발음이 **딱 맞는** 낱말(안 → an·ăn·ẩn)은 발음 칸에 모은다 — 뜻에 '안'이 들어 있을 뿐인(편안하다) an 이 뜻 칸 아래로 묻히지 않게.
           뜻이 그 말 그대로인 것(안 = trong)은 뜻 칸에 남는다. 발음이 그 말로 시작만 하는 것(안 → an toàn)은 뜻 칸에 없을 때만 */
        const exact = x => dictKrKeys(x).includes(qp);
        mean = mean.filter(x => !exact(x) || phrs(x.ko).includes(qk) || k2v.includes(x.vi.toLowerCase()));
        const inMean = new Set(mean.map(x => x.vi));
        pron = d.filter(x => !inMean.has(x.vi) && dictKrKeys(x).some(k => k.startsWith(qp)))
          .sort((a, b2) => (exact(a) ? 0 : 1) - (exact(b2) ? 0 : 1) || (a.ref ? 1 : 0) - (b2.ref ? 1 : 0)
            || a.vi.split(/\s+/).length - b2.vi.split(/\s+/).length || a.vi.length - b2.vi.length);
      }
      /* 발음과 딱 맞는 낱말이 있고, 뜻으로는 그 말 그대로인 낱말이 없으면(깜언·씬짜오) 발음 칸을 위로 */
      const pronFirst = pron.length && dictKrKeys(pron[0]).includes(qp) && !k2v.length && !mean.some(x => phrs(x.ko).includes(qk));
      const S1 = [tr('뜻으로 찾은 낱말'), mean], S2 = [tr('발음으로 찾은 낱말'), pron];
      secs.push(...(pronFirst ? [S2, S1] : [S1, S2]));
      if (!num && qp.length >= 2) secs.push([tr('문장'), dictSentsKo(qk)]);   // 단어 뒤에 문장 — 한국어 뜻에 그 말이 든 문장 (2026-10-02)
    } else {
      const vi = d.filter(viHit).sort(cmp);
      const inVi = new Set(vi.map(x => x.vi));
      const lessonW = x => x.src && x.src.some(t => !['예문', '사전', '참고 사전'].includes(t)) ? 0 : 1;
      /* 차례(2026-10-02): ① 뜻이 친 말과 똑같은 낱말(참고 사전 아님) ② 그 말로 시작하는 구이거나 그 말이 낱말로 든 **수업 낱말**(kỹ năng 'technical skill', trâu 'water buffalo')
         ③ 똑같지만 참고 사전 낱말 ④ 뜻 안에 든 나머지 ⑤ 덜 친 말(skil → skill)로만 잡힌 것. 같은 칸 안에서는 수업 낱말 → 자주 쓰는 말 → 더 똑같은 뜻.
         똑같음만 앞세우면 skill 에 thân thủ(문어·참고 사전)가 먼저였고, 수업 낱말만 앞세우면 water 에 trâu('water buffalo')가 nước 바로 뒤였다 */
      const enT = x => { const lv = Math.floor(enScore(x) / 100); return lv === 0 && !x.ref ? 0 : lv <= 2 && !lessonW(x) ? 1 : lv === 0 ? 2 : lv <= 2 ? 3 : 4; };   // 'water buffalo'(trâu)처럼 그 말로 시작하는 구는 똑같음(nước·tưới) 뒤로
      const en = enq ? d.filter(x => !inVi.has(x.vi) && enHit(x)).sort((a, b2) => enT(a) - enT(b2) || lessonW(a) - lessonW(b2) || (a.fr || 99999) - (b2.fr || 99999) || enScore(a) - enScore(b2) || a.vi.length - b2.vi.length) : [];
      /* (대표님 2026-10-02) 로마자는 베트남어와 영어가 같이 쓰니 칸 대신 **단추 둘**: [베트남 단어] [영어 뜻] — 고른 쪽만 보인다.
         기본은 베트남 단어. 베트남어 쪽에 아무것도 없고 영어 뜻만 있으면 저절로 영어 뜻. 새로 칠 때마다 다시 정한다.
         단어를 다 보인 **뒤에** 문장(앱 예문·교재 원문·사전 예문): 베트남 단어 쪽은 친 말이 낱말 단위로 든 문장,
         영어 뜻 쪽은 그 영어 뜻으로 찾은 낱말(앞 5개)이 든 문장. 사전에 없는 구(trời mưa)도 문장으로 뜻을 본다 */
      const viS = dictSents([qb]);
      const enS = en.length ? dictSents(en.slice(0, 5).map(x => dictBare(x.vi))) : [];
      /* 기본 단추: 친 말과 **똑같은** 베트남어 낱말이 있으면 베트남 단어(ban → bạn·bán). 없고 영어 뜻이 낱말로 맞는 게 있으면 영어 뜻(car → xe hơi, money → tiền).
         둘 다 아니면 결과가 있는 쪽 — 덜 친 말(hap)은 베트남어 쪽. 전에는 베트남어가 하나라도 걸리면(car → ca-ra, house → Vinahouse) 베트남 단어로 가 영어 뜻이 가려졌다 */
      /* 기본 단추는 베트남 단어 (대표님 2026-10-02 다시 "디폴트 값은 베트남 단어 검색") — 베트남어 쪽에 낱말·문장이 하나도 없을 때만 영어 뜻.
         (잠깐 '똑같은 베트남어 낱말이 없으면 영어 뜻'으로 바꿨다가 되돌림) */
      if (DTABQ !== qk) { DTABQ = qk; DTAB = (vi.length || viS.length) ? 'vi' : en.length ? 'en' : 'vi'; }
      const tabs = el('div', 'dtabs');
      [['vi', tr('베트남 단어'), vi.length], ['en', tr('영어 뜻'), en.length]].forEach(([k, nm, n]) => {
        const t = el('button', 'dtab' + (DTAB === k ? ' on' : ''), esc(nm) + ' <small>' + n + '</small>'); t.type = 'button';
        t.onclick = () => { DTAB = k; draw(); };
        tabs.append(t);
      });
      out.append(tabs);
      if (DTAB === 'en') secs.push([tr('영어 뜻으로 찾은 낱말'), en], [tr('문장'), enS]);
      else secs.push([tr('베트남어 낱말'), vi], [tr('문장'), viS]);
    }
    const live = secs.filter(s2 => s2[1].length);
    if (!live.length) { out.append(el('p', 'note', tr('찾는 말이 없습니다'))); return; }
    const CAP = 40;
    live.forEach(([name, list]) => {
      out.append(el('p', 'dsec', esc(name) + ' <small>' + tr('N개').replace('N', list.length) + '</small>'));
      list.slice(0, CAP).forEach(x => out.append(x.sent ? sentRow(x) : dictRow(x)));
      if (list.length > CAP) {
        const more = el('button', 'ghost sm dmore', tr('N개 더 보기').replace('N', list.length - CAP)); more.type = 'button';
        more.onclick = () => { const frag = document.createDocumentFragment(); list.slice(CAP).forEach(x => frag.append(dictRow(x))); more.replaceWith(frag); };
        out.append(more);
      }
    });
    out.append(el('p', 'dicthint', tr('단어을 누르면 단어 카드가 열립니다')));
    // 참고 사전 출처 문구는 뺐다 (대표님 2026-10-01). 위키낱말사전·한국어기초사전 출처(CC BY-SA 조건)는 '내 정보'의 자료 출처에 둔다
  };
  let tm = null;
  inp.oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 120); };
  b.append(lede, box, viKeys(inp, draw), out);
  show('sub', '사전', true);
  dictReady().then(() => {
    if ($('#sub').hidden) return;
    d = dictBuild();
    lede.remove();                                    // 머리글('단어 N개 · …')은 뺐다 (대표님 2026-09-30)
    draw();
  });
  setTimeout(() => inp.focus(), 60);
}

/* 선배 시험 원자료(basicwords, GYBM 17~20기 — 별·빨간 밑줄 값의 출처)는
   이제 앱이 직접 안 읽는다 — tools/build_gybm.py가 미리 대조해서 data/gybm.json에
   별·밑줄·예문·그림을 구워 넣어 두기 때문이다(2026-09-22 GYBM 개편). 그 원자료
   자체는 그 스크립트의 입력 자료로만 남는다. */
function basicWordRow(x) {
  const row = el('button', 'dictrow basicrow');
  row.type = 'button';
  // 그림이 있으면 맨 위 한 줄 전체를 차지한다(.dictrow의 [dvi][dkr][dko] 3칸
  // 그리드는 그대로 두고, grid-column:1/-1로 그 위에 얹는다 — .dex와 같은 요령).
  if (x.img) {
    const im = new Image(); im.alt = ''; im.className = 'bwimg';
    im.src = 'img/' + x.img;
    row.append(im);
  }
  // .dictrow는 [dvi][dkr][dko] 3칸 그리드다 — 별을 딴 칸으로 안 붙이고 dvi 안에
  // 같이 넣어야 기존 사전 화면 줄 짜임을 안 깬다.
  const vi = el('span', 'dvi');
  vi.append(el('span', 'bwvi', esc(x.vi)));
  if (isCore(x)) vi.append(el('span', 'corepill sm', tr('핵심')));      // ★·빨간 밑줄 대신 핵심 하나 (2026-09-28 밤)
  row.append(vi);
  if (x.kr_read) row.append(el('span', 'dkr', '[' + esc(x.kr_read) + ']'));
  row.append(el('span', 'dko', esc(x.ko)));
  if (x.ex) row.append(el('span', 'dex', esc(x.ex.vi) + ' — ' + esc(x.ex.ko)));
  row.onclick = () => { const k = recKey(x.vi); k ? play(k, false, voiceDir()) : speakVi(x.vi, false, 0, S.voice); };
  return row;
}
/* GYBM 시험 — 출처(메인교재·선배단어, 22기 자료가 올라오면 22기도 — 서브교재·수업자료는 2026-09-25 에 회화 보강으로 옮김)를 미리 하나로 합쳐 둔
   data/gybm.json을 쓴다(대표님 지시, 2026-09-22: "출처가 4개가 잇네... 4개의 큰 구분이
   잇어야겟네"). 단어 하나가 여러 출처에 겹쳐도 **한 곳에만** 있도록 빌드 단계에서 이미
   중복 제거하고 15개씩 묶어 뒀다 — "chào가 여러 번 나와도 중복해서 넣지 마라"는 지시대로
   앱은 그 결과만 그대로 쓴다. 챕터→목록→"단어 카드로 배우기" 버튼 3단계였던 것을 없애고,
   레슨을 누르면 회화·직무회화와 똑같이 바로 단어카드(startLearn/drawCard)로 들어간다. */
let GYBM = null;
const bdone = () => (S.bdone = S.bdone || {});
/* 강조는 '핵심' 하나로 (대표님 지시 2026-09-28 밤: "별표·빨간 밑줄·핵심 세 가지 → 핵심으로 통일").
   교재 단어장(gl) · 선배 시험에 나온 것(star, 예전 ★) · 주간 시험(weekly, 예전 빨간 밑줄)을 모두 '핵심'으로 본다 */
function isCore(x) { return !!(x && (x.gl || x.star > 0 || x.weekly)); }
function gybmBuild(cb) {
  if (GYBM) { cb(GYBM); return; }
  fetch('data/gybm.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { GYBM = j.sources; cb(GYBM); })
    .catch(() => { GYBM = []; cb(GYBM); });
}
const gybmKey = (srcKey, i) => 'B:' + srcKey + i;
/* GYBM 단어 전체를 한 배열로 — 복습 화면(findItem)과 객관식 오답 보기(buildQuestions)가
   예전엔 BASICWORDS(선배 원자료)만 봤는데, 이제 GYBM 단어은 메인교재·서브교재·
   수업자료에서 온 것도 많아 BASICWORDS에 없을 수 있다. 그래서 GYBM 전체를 대신 쓴다. */
let GYBM_ALL = null;
function gybmAllWords() {
  if (GYBM_ALL) return GYBM_ALL;
  GYBM_ALL = [];
  (GYBM || []).forEach(src => src.lessons.forEach(l => l.words.forEach(w => GYBM_ALL.push(w))));
  return GYBM_ALL;
}

/* GYBM 학습 입구 — 다른 단어 학습과 같은 틀(목록 → 배우기 → 시험 → 복습)을 쓴다
   (대표님 지시: "선배 단어들도 다른 단어 학습과 동일하게 해줘. 배우고 복습하는것.").
   창고(S.bsrs)·진도(S.bdone)는 예전 기초단어 때 쓰던 것 그대로 이어받는다 — 단어
   자체(vi 텍스트)로 키를 잡는 S.bsrs 복습 진도는 구조가 바뀌어도 안 끊긴다. */
function gybmEntry() {
  SBOX = 'bsrs';
  const b = $('#subBody'); b.textContent = '';
  b.append(el('p', 'lede', tr('불러오는 중…')));
  show('sub', 'GYBM 시험', true);
  // 8초 안에 안 끝나면 무한 로딩으로 안 두고 재시도 버튼을 보여준다
  // (2026-09-17: 로딩중 멈춤 신고 이후 추가 — 캐시·네트워크 문제를 눈에 보이게 한다).
  let loaded = false;
  const timer = setTimeout(() => {
    if (loaded) return;
    b.textContent = '';
    b.append(el('p', 'lede', tr('불러오지 못했습니다')));
    b.append(el('p', 'note', tr('인터넷 연결을 확인하시거나, 앱을 완전히 껐다 켜 보세요(새로고침으로 안 되면 캐시 문제일 수 있습니다).')));
    const retry = el('button', 'primary sm', tr('다시 시도'));
    retry.onclick = gybmEntry;
    b.append(retry);
  }, 8000);
  gybmBuild(() => {
    loaded = true; clearTimeout(timer);
    drawGybmSources();
  });
}
function drawGybmSources() {
  SBOX = 'bsrs';
  const b = $('#subBody'); b.textContent = '';

  const head = el('div', 'catpick');
  const due = Object.values(S.bsrs || {}).filter(v => v.due <= now()).length;
  head.append(el('span', 'msub', tr('GYBM 시험 대비') + '  ·  '));
  const rb = el('button', 'primary sm', tr('GYBM 단어 복습') + (due ? ' (' + due + ')' : ''));
  rb.onclick = () => { SBOX = 'bsrs'; dive(drawGybmSources); reviewMenu('word'); };
  head.append(rb);
  head.append(el('span', 'msub', tr('다른 복습과 섞이지 않습니다')));
  b.append(head);

  const sb = el('button', 'bigmenu');
  sb.append(el('b', null, tr('🔍 단어 찾기')), el('span', 'exmeta', tr('전체에서 찾기')));
  sb.onclick = () => { dive(drawGybmSources); gybmSearch(); };
  b.append(sb);

  const list = el('div', 'dictout');
  GYBM.forEach((src, si) => {
    const n = src.lessons.reduce((s, l) => s + l.words.length, 0);
    const doneN = src.lessons.filter((l, li) => bdone()[gybmKey(src.key, li)]).length;
    const btn = el('button', 'dictrow');
    btn.type = 'button';
    btn.append(el('span', 'dvi', esc(src.label)),
      el('span', 'dko', esc(src.sub)),
      el('span', 'dkr', n + tr('단어') + (doneN ? ' · ' + doneN + '/' + src.lessons.length : '')));
    btn.onclick = () => { dive(drawGybmSources); drawGybmLessons(si); };
    list.append(btn);
  });
  b.append(list);
  show('sub', 'GYBM 시험', true);
}
/* 레슨 세로 지도 — 두오링고처럼 15개씩 잘라 둔 레슨을 한 줄로 쭉 잇는다.
   실제 수업 진도를 따라가야 하므로 잠그지 않는다(freeNav:true, 대표님 지시 2026-09-22).
   레슨을 누르면 목록·버튼 없이 **바로** 단어카드로 들어간다("단어 카드로 배우기"
   버튼도 없앰 — 회화·직무회화가 레슨을 누르면 바로 카드가 뜨는 것과 동일하게). */
function drawGybmLessons(si) {
  const src = GYBM[si];
  const b = $('#subBody'); b.textContent = '';
  const box = el('div', 'ulist');
  const nodes = src.lessons.map((l, li) => ({
    key: gybmKey(src.key, li),
    title: l.title,
    num: li + 1,
    done: !!bdone()[gybmKey(src.key, li)],
    fn: () => {
      SBOX = 'bsrs';
      dive(() => drawGybmLessons(si));
      startLearn({ theme: l.title, day: gybmKey(src.key, li), basic: 1, words: l.words });
    },
  }));
  renderRoadmap(box, nodes, null, { freeNav: true });
  b.append(box);
  show('sub', src.label, true);
}
/* 단어 찾기 — 레슨 순서로 훑는 것 말고, 특정 단어을 바로 찾고 싶을 때 쓴다. */
function gybmSearch() {
  SBOX = 'bsrs';
  const b = $('#subBody'); b.textContent = '';
  show('sub', tr('GYBM 단어 찾기'), true);
  const words = [];
  GYBM.forEach(src => src.lessons.forEach(l => l.words.forEach(w => words.push(w))));
  b.append(el('p', 'lede', tr('GYBM 단어 N개 · 핵심 = 교재 단어장·선배 시험·주간 시험에 나온 단어')
    .replace('N', words.length.toLocaleString('ko-KR'))));
  const inp = el('input', 'keyin dictin');
  inp.type = 'search'; inp.placeholder = tr('찾을 말 (성조는 안 찍어도 됩니다)');   // 아래 성조·모자 단추로 찍을 수도 있다 (2026-10-05)
  const out = el('div', 'dictout');
  const draw = () => {
    const q = inp.value.trim();
    out.textContent = '';
    let list, note;
    if (q.length < 1) {
      list = words.filter(isCore).sort((a, b) => (b.star || 0) - (a.star || 0));
      note = tr('핵심 단어 N개 — 찾는 말을 입력하면 전체에서 찾습니다').replace('N', list.length);
    } else {
      const qb = dictBare(q), qk = q.toLowerCase();
      const kor = /[가-힣]/.test(q);
      const nsp = t => t.replace(/\s+/g, ''), qbN = nsp(qb), qkN = nsp(qk);   // 띄어쓰기 틀려도 (2026-10-05)
      list = words.filter(x => kor ? (x.ko.toLowerCase().includes(qk) || nsp(x.ko.toLowerCase()).includes(qkN))
                                    : (dictBare(x.vi).includes(qb) || x.vi.toLowerCase().includes(qk) || nsp(dictBare(x.vi)).includes(qbN)));
      note = tr('N개 찾음').replace('N', list.length);
    }
    out.append(el('p', 'note', note));
    list = list.slice(0, 80);
    if (!list.length) { out.append(el('p', 'note', tr('찾는 말이 없습니다'))); return; }
    list.forEach(x => out.append(basicWordRow(x)));
    if (list.length >= 80) out.append(el('p', 'note', tr('앞 80개만 보입니다 — 더 적어 보세요')));
  };
  let tm = null;
  inp.oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 120); };
  b.append(inp, out);
  draw();
  setTimeout(() => inp.focus(), 60);
}

/* 단어 한 줄 — **뜻·발음·두 속도 단추**를 한 줄에 (대표님 지시 2026-09-03:
   "단어와 발음과 뜻 보여줘 … 원재생속도와 느린재생속도버전").
   meta 가 있으면 오른쪽에 곁들인다 (틀린 횟수 같은 것). */
function wbRow(vi, ko, meta) {
  const r = el('div', 'wbrow');
  const top = el('div', 'wbtop');
  top.append(el('b', 'wbvi', esc(vi)));
  const kr = krOf(vi);
  if (kr) top.append(el('span', 'wbkr', '[' + esc(kr) + ']'));
  if (meta) top.append(el('span', 'exmeta', meta));
  const p1 = el('button', 'iconbtn', '🔊');
  p1.title = tr('보통 속도');
  p1.onclick = () => { const k = recKey(vi); k ? play(k, false) : speakVi(vi, false, 0, S.voice); };
  top.append(p1, starBtn(vi, ko || '', vi));   // 🐢 는 뺐다 (2026-09-27 밤)
  r.append(top, el('div', 'wbko', esc(ko || '')));
  return r;
}

/* 지금까지 배운 단어을 모두 모은다 — 하루 5분 창고(S.srs)와 직무 창고(S.ssrs).
   대표님 지시 (2026-09-03): "지금까지 학습한 모든 단어들을 리스트업한 단어장과
   그 대상으로도 복습할 수 있도록." */
function learnedAll() {
  /* (2026-10-02 대표님 "학습한 모든 단어에 단어가 하나도 없는데?") 전에는 하루5분 창고(S.srs)·실전 창고(S.ssrs)만 셌다.
     교재·선배·22기(GYBM, 진도 S.bdone·창고 S.bsrs)나 일상·직무 레슨으로 공부한 단어는 빠져 0개로 보였다.
     이제 **끝낸 세트·레슨의 단어 전부** + 세 창고에서 한 번이라도 답한 단어. 문장(복습 창고에 든 예문)은 뺀다 */
  const out = new Map();
  const words = allWords(), gy = GYBM ? gybmAllWords() : [], sen = typeof seniorItems === 'function' && SENIOR ? seniorItems() : [];
  const add = (w, box) => {
    const v = String(w && w.vi || '').trim();
    if (!v || out.has(v.toLowerCase()) || w.sent) return;
    out.set(v.toLowerCase(), { vi: v, ko: w.ko || '', box });
  };
  ALL.forEach(d => { if (typeof d.day === 'number' && !d.track && S.done[d.day]) (d.words || []).forEach(w => add(w, 'srs')); });
  if (COURSE) freeUnits().forEach(u => (u[2] || []).forEach(w => add(w, 'srs')));
  if (GYBM) GYBM.forEach(src => src.lessons.forEach((l, li) => { if (bdone()[gybmKey(src.key, li)]) (l.words || []).forEach(w => add(w, 'bsrs')); }));
  const look = (k, ...lists) => { for (const L2 of lists) { const w = L2.find(x => x.vi === k); if (w) return w; } return null; };
  Object.keys(S.srs || {}).forEach(k => add(look(k, words, gy), 'srs'));
  Object.keys(S.ssrs || {}).forEach(k => add(look(k, sen, words) || { vi: k }, 'ssrs'));
  Object.keys(S.bsrs || {}).forEach(k => add(look(k, gy, words), 'bsrs'));
  return [...out.values()];
}

function wordbookEntry() { SBOX = 'srs'; WB = 'all'; drawWordbook(); }   // 열면 '학습한 모든 단어'부터 (대표님 2026-10-02)
function drawWordbook() {
  const ko = learnKo();
  const host = ko ? $('#examBody') : $('#subBody');
  host.textContent = '';
  if (WB === 'all' && (!GYBM || !COURSE)) {                 // 교재·직무 레슨 단어를 세려면 자료가 있어야 한다 — 받고 다시 그린다
    host.append(el('p', 'note', tr('불러오는 중…')));
    show(ko ? 'exam' : 'sub', '단어장', true);
    const again = () => { if (GYBM && COURSE && $('#title').textContent === tr('단어장')) drawWordbook(); };
    if (!GYBM) gybmBuild(again); if (!COURSE) withCourse(again);
    return;
  }

  const tabs = el('div', 'wbtabs');
  const mk = (k, label) => {
    const t = el('button', 'wbtab' + (WB === k ? ' on' : ''), label);
    t.onclick = () => { WB = k; drawWordbook(); };
    return t;
  };
  const misses = Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 1);
  const learned = learnedAll();
  tabs.append(mk('all', tr('📚 학습한 모든 단어') + ' ' + learned.length),       // 차례: 학습한 모든 단어 · 자주 틀린 것 · 담은 것 (대표님 2026-10-02)
              mk('miss', tr('⚠ 자주 틀린 것') + ' ' + misses.length),
              mk('star', tr('★ 담은 것') + ' ' + Object.keys(starOf()).length));
  host.append(tabs);

  if (WB === 'star') {
    const list = Object.entries(starOf()).sort((a, b) => b[1].t - a[1].t);
    if (!list.length) {
      host.append(el('p', 'note', '아직 담은 단어이 없습니다. 배우는 화면에서 단어 옆 <b>☆</b>를 누르면 여기에 모입니다.'));
    }
    list.forEach(([k, v]) => host.append(
      ko ? wbRow(v.ko || k, v.vi || '', '') : wbRow(v.vi || k, v.ko || '', '')));

  } else if (WB === 'miss') {
    if (!misses.length) {
      host.append(el('p', 'note', '아직 자주 틀린 단어이 없습니다. 퀴즈에서 틀린 단어이 여기에 저절로 모입니다.'));
    }
    // 많이 틀린 것부터 — 맞히면 점수가 깎여 스스로 사라진다
    misses.sort((a, b) => b[1] - a[1]).forEach(([vi, n]) => {
      const w = allWords().find(x => x.vi === vi);
      host.append(wbRow(vi, w ? w.ko : '', tr('틀림') + ' ' + Math.round(n) + tr('번')));
    });
    if (misses.length) {
      host.append(el('p', 'note', '퀴즈에서 <b>맞힐 때마다 횟수가 줄어</b> 저절로 사라집니다 — 지울 필요가 없습니다.'));
      const go = el('button', 'primary big', tr('자주 틀린 것만 복습하기') + ' ›');
      go.style.width = '100%';
      go.onclick = () => startWordbookQuiz(misses.map(([vi]) => vi), '자주 틀린 단어');
      host.append(go);
    }

  } else {
    if (!learned.length) {
      host.append(el('p', 'note', '아직 배운 단어이 없습니다. 학습을 한 세트 끝내면 여기에 모입니다.'));
    } else {
      host.append(el('p', 'lede', tr('여기까지 학습한 단어 N개입니다')
        .replace('N', learned.length.toLocaleString('ko-KR'))));
      const go = el('button', 'primary big', tr('여기 있는 단어로 복습하기') + ' ›');
      go.style.width = '100%'; go.style.marginBottom = '12px';
      go.onclick = () => startWordbookQuiz(learned.map(x => x.vi), '학습한 모든 단어');
      host.append(go);

      // 많으면 찾기가 있어야 쓸 수 있다
      const inp = el('input', 'keyin dictin');
      inp.type = 'search'; inp.placeholder = tr('찾을 말 (베트남어·한국어)');
      const out = el('div');
      const draw = () => {
        const q = inp.value.trim().toLowerCase();
        out.textContent = '';
        const hit = q ? learned.filter(x => x.vi.toLowerCase().includes(q)
                                         || (x.ko || '').toLowerCase().includes(q))
                      : learned;
        if (!hit.length) { out.append(el('p', 'note', tr('찾는 말이 없습니다'))); return; }
        hit.slice(0, 200).forEach(x => out.append(wbRow(x.vi, x.ko, '')));
        if (hit.length > 200) out.append(el('p', 'note', tr('앞 200개만 보입니다 — 더 적어 보세요')));
      };
      let tm = null;
      inp.oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 120); };
      host.append(inp, out);
      draw();
    }
  }
  show(ko ? 'exam' : 'sub', '단어장', true);
}

/* ── 손글씨 겹쳐 쓰기 (대표님 지시 2026-09-28 밤: "단어 카드·발음 카드 화면 위에 펜·손가락으로 필기, 몇 초 뒤 스르르 사라지게.
   외울 때 손도 같이 외우면 도움") ──
   · 애플펜슬·S펜도 손가락과 같이 ✍ 단추를 켰을 때만 쓴다(2026-10-05; 전엔 펜은 늘 썼다).
   · 손가락은 ✍ 단추를 켰을 때만 — 늘 켜 두면 카드 넘기기·단추 누르기를 막는다.
   · 획마다 따로, 그 획을 끝내고 1초 뒤 0.6초에 걸쳐 사라진다(2026-09-30 대표님 "획 단위로"; 그 전엔 마지막 획 뒤 전체가 함께).
     다 사라지면 그리기를 멈춘다(배터리·발열 없음).
   · 색은 파랑 하나(대표님 지시 2026-09-28: "파랑 하나만 남겨" — 검정·빨강·형광펜과 색 고르기 판을 뺐다).
     빨강은 앱에서 '틀림' 색이고, 검정은 어두운 화면에서 안 보이고 인쇄 글씨와 섞인다. 앱 강조색(--accent)을 써서 밝은·어두운 화면 둘 다 보인다 */
const INK = { cv: null, g: null, strokes: [], cur: null, raf: 0, finger: false, btn: null, last: 0, block: false };
const INK_HOLD = 1000, INK_FADE = 600;
const inkBlue = () => getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#1877f2';
const inkPt = e => ({ x: e.clientX, y: e.clientY });
function inkSetup() {
  if (INK.cv) return;
  const cv = document.createElement('canvas'); cv.id = 'inkcv'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv); INK.cv = cv; INK.g = cv.getContext('2d');
  const size = () => { const r = window.devicePixelRatio || 1; cv.width = Math.round(innerWidth * r); cv.height = Math.round(innerHeight * r); INK.g.setTransform(r, 0, 0, r, 0, 0); inkLoop(); };
  size(); addEventListener('resize', size);
  const btn = document.createElement('button'); btn.id = 'inkBtn'; btn.type = 'button'; btn.hidden = true;
  btn.setAttribute('aria-label', tr('손가락으로 쓰기')); btn.title = tr('손가락으로 쓰기');
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 7 3 3"/></svg>';
  btn.onclick = () => inkFinger(!INK.finger);
  document.body.append(btn); INK.btn = btn;
  const here = () => CURV === 'learn';
  // 손가락(켰을 때) — 캔버스가 받는다
  cv.addEventListener('pointerdown', e => { if (!INK.finger || !here()) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { } inkStart(e); });
  cv.addEventListener('pointermove', e => { if (INK.cur && INK.cur.id === e.pointerId) { e.preventDefault(); inkMove(e); } });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, e => { if (INK.cur && INK.cur.id === e.pointerId) inkEnd(); }));
  // 펜도 ✍ 를 켰을 때만 쓴다 (대표님 2026-10-05 "필기 모드 키지도 않았는데 왜 필기가 되니? 애플펜슬로 하니까 그냥 되던데") — 켜면 위 캔버스가 펜·손가락을 함께 받는다.
  //   전에는 펜(pointerType 'pen')은 켜기 없이 늘 썼다
  document.addEventListener('pointermove', e => { if (e.pointerType === 'pen' && INK.cur && INK.cur.id === e.pointerId) { e.preventDefault(); inkMove(e); } }, true);
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, e => { if (e.pointerType === 'pen' && INK.cur && INK.cur.id === e.pointerId) inkEnd(); }, true));
  // 글씨를 쓴 획이 단추 위에서 끝나도 그 단추가 눌리지 않게 — 톡 친 것만 눌린다
  document.addEventListener('click', e => { if (INK.block) { INK.block = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('touchmove', e => { if (INK.cur) e.preventDefault(); }, { passive: false });   // 펜으로 쓰는 동안 화면이 밀리지 않게
}
function inkStart(e) {
  const pen = e.pointerType === 'pen';
  INK.cur = { id: e.pointerId, pts: [inkPt(e)], w: pen ? 2.2 + (e.pressure || .5) * 2.6 : 3.4, x0: e.clientX, y0: e.clientY, t0: performance.now(), tap: true, pen };
  INK.strokes.push(INK.cur); INK.block = false; inkLoop();
}
function inkMove(e) {
  const s = INK.cur; if (!s) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  (evs.length ? evs : [e]).forEach(x => s.pts.push(inkPt(x)));
  if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 6) s.tap = false;
  inkLoop();
}
function inkEnd() {
  const s = INK.cur; if (!s) return;
  INK.cur = null; INK.last = performance.now(); s.t1 = INK.last;                    // 획마다 제 끝난 때 — 획 하나하나 따로 사라진다 (대표님 2026-09-30)
  if (s.pen && s.tap && INK.last - s.t0 < 350) { INK.strokes.pop(); return; }   // 펜으로 톡 — 글씨가 아니라 누르기
  if (s.pen) INK.block = true;                                                      // 펜 획 끝의 클릭은 막는다
  inkLoop();
}
function inkLoop() { if (!INK.raf && INK.g) INK.raf = requestAnimationFrame(inkDraw); }
function inkDraw() {
  INK.raf = 0;
  const g = INK.g, now = performance.now();
  g.clearRect(0, 0, innerWidth, innerHeight);
  /* 획마다 따로: 그 획을 끝낸 지 1초 뒤 0.6초에 걸쳐 사라진다 (대표님 2026-09-30: "이어 쓰는 단위로 지워지지 말고 획 하나하나"). 다 사라진 획은 버린다 */
  INK.strokes = INK.strokes.filter(s => s === INK.cur || now - s.t1 <= INK_HOLD + INK_FADE);
  if (!INK.strokes.length) return;                                                // 다 사라졌다 — 여기서 멈춘다
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = inkBlue();
  INK.strokes.forEach(s => {
    const age = s === INK.cur ? 0 : now - s.t1;
    g.globalAlpha = Math.max(0, Math.min(1, 1 - (age - INK_HOLD) / INK_FADE));
    g.lineWidth = s.w; g.beginPath();
    s.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    if (s.pts.length === 1) g.lineTo(s.pts[0].x + .1, s.pts[0].y + .1);
    g.stroke();
  });
  g.globalAlpha = 1;
  if (INK.strokes.length) INK.raf = requestAnimationFrame(inkDraw);
}
function inkFinger(on) {
  INK.finger = !!on;
  document.body.classList.toggle('inking', INK.finger);
  if (INK.btn) { INK.btn.classList.toggle('on', INK.finger); INK.btn.setAttribute('aria-pressed', INK.finger ? 'true' : 'false'); }
}
function inkClear() { INK.strokes = []; INK.cur = null; if (INK.g) INK.g.clearRect(0, 0, innerWidth, innerHeight); }

/* 관련 챕터로 바로 가기 (대표님 지시 2026-10-02 "기본기·문법·단어 모두 연관된 챕터를 바로 갈 수 있게 — 기본기에서 숫자를 배우면 숫자 단어 챕터로 가는 버튼").
   같은 주제끼리 묶은 표: 기본기 과(day) · 문법 과 번호(no) · 일상 주제 이름. 교재 과 ↔ 일상 주제는 data/topic_links.json(TLINK) 을 같이 쓴다.
   묶음은 클로드가 과 내용(문형 제목·낱말)을 보고 같은 주제끼리 이었다 — 숫자·인사·묻기·시간·빈도·색·길·이어 주는 말·정도·부탁·주문·의견·소리 */
const REL_GROUPS = [
  { basic: ['P8'], gram: [8, 9], life: ['숫자 세기'] },   // 문법 1과(소리)·7과(숫자 읽기)는 기본기로 옮겼다(grammar.json ng) — 목록에 없는 과는 단추로도 안 보낸다
  { gram: [2, 3], life: ['인사', '자기소개'] },   // 일상 'A와 B' 주제를 둘로 나눔 (2026-10-02, tools/day_split)
  { gram: [5], life: ['가리키는 말', '묻는 말'] },
  { gram: [13, 14], life: ['시간', '요일·날짜', '달 이름'] },
  { gram: [15], life: ['얼마나 자주, 언제'] },
  { gram: [16], life: ['색깔'] },
  { gram: [17, 18], life: ['오고 가기', '길 묻기', '길', '교통'] },
  { gram: [27, 29, 31], life: ['이어 주는 말'] },
  { gram: [12, 43], life: ['자리를 나타내는 말', '정도·관계를 나타내는 말'] },
  { gram: [21, 22, 24], life: ['부탁하고 약속하기'] },
  { gram: [46], life: ['식당', '카페'] },
  { gram: [42], life: ['생각 말하기', '의견'] },
];
function relChips() {
  if (!L || !L.day) return [];
  const d = L.day, out = [], seen = new Set();
  const lifeBase = t => String(t || '').split(' (')[0];
  const add = (label, go, key) => { if (seen.has(key)) return; seen.add(key); out.push({ label, go }); };
  const lifeGo = theme => {
    const ds = ALL.filter(x => typeof x.day === 'number' && !x.track && lifeBase(x.theme) === theme).sort((a, b) => (a.n || 0) - (b.n || 0));
    if (!ds.length) return null;
    const pick = ds.find(x => !S.done[x.day]) || ds[0];
    return () => { SBOX = 'srs'; startLearn(pick); };
  };
  const gramGo = no => { if (!GRAM) return null; const ni = GRAM.books[0].bai.findIndex(b => b.no === no); return ni < 0 || GRAM.books[0].bai[ni].ng ? null : () => startGram(0, ni); };
  const basicGo = k => { const x = ALL.find(y => y.day === k); return x ? () => startLearn(x) : null; };
  const mainLessons = base => { const src = GYBM && GYBM.find(x => x.key === 'main'); if (!src) return null;
    const li = src.lessons.findIndex((l, i) => String(l.title).split(' · ')[0] === base && !bdone()[gybmKey('main', i)]);
    const i2 = li >= 0 ? li : src.lessons.findIndex(l => String(l.title).split(' · ')[0] === base);
    if (i2 < 0) return null; const l = src.lessons[i2];
    return () => { SBOX = 'bsrs'; startLearn({ theme: l.title, day: gybmKey('main', i2), basic: 1, words: l.words }); }; };
  // 지금 과가 어느 묶음에 드는가
  let me = null;
  if (typeof d.day === 'string' && d.day[0] === 'P') me = { basic: d.day };
  else if (d.gram && GRAM) { const x = GRAM.books[0].bai.find(b => b.t === d.theme); if (x) me = { gram: x.no }; }
  else if (typeof d.day === 'number' && !d.track) me = { life: lifeBase(d.theme) };
  else if (typeof d.day === 'string' && d.day.startsWith('B:main')) me = { main: String(d.theme).split(' · ')[0] };
  if (!me) return out;
  REL_GROUPS.forEach(g => {
    const hit = (me.basic && (g.basic || []).includes(me.basic)) || (me.gram && (g.gram || []).includes(me.gram)) || (me.life && (g.life || []).includes(me.life));
    if (!hit) return;
    (g.basic || []).forEach(k => { if (k === me.basic) return; const x = ALL.find(y => y.day === k), go = basicGo(k); if (x && go) add(tr('기본기') + ' · ' + tr(x.theme), go, 'b' + k); });
    (g.gram || []).forEach(no => { if (no === me.gram) return; const go = gramGo(no), x = GRAM && GRAM.books[0].bai.find(b => b.no === no); if (go && x) add(tr('문법') + ' ' + no + tr('과') + ' · ' + tr(String(x.t).split(' — ')[0]), go, 'g' + no); });
    (g.life || []).forEach(t => { if (t === me.life) return; const go = lifeGo(t); if (go) add(tr('일상') + ' · ' + tr(t), go, 'l' + t); });
  });
  // 교재 ↔ 일상 (topic_links)
  if (TLINK && me.life) Object.entries(TLINK).forEach(([title, x]) => { if (x.days.includes(me.life)) { const go = mainLessons(title); if (go) add(tr('교재') + ' ' + x.book + ' · ' + title, go, 'm' + title); } });
  if (TLINK && me.main && TLINK[me.main]) TLINK[me.main].days.forEach(t => { const go = lifeGo(t); if (go) add(tr('일상') + ' · ' + tr(t), go, 'l' + t); });
  return out.slice(0, 6);
}
function drawRelLinks() {
  let box = $('#relLinks');
  if (!box) { box = el('div', 'rellinks'); box.id = 'relLinks'; $('#card').after(box); }
  box.textContent = '';
  if (!TLINK) tlinkLoad(() => { if (!$('#learn').hidden) drawRelLinks(); });
  if (!GYBM) gybmBuild(() => { if (!$('#learn').hidden) drawRelLinks(); });
  if (!GRAM) gramEnsure(() => { if (!$('#learn').hidden) drawRelLinks(); });
  const chips = relChips();
  box.hidden = !chips.length;
  if (!chips.length) return;
  box.append(el('span', 'rellab', tr('관련')));
  const snap = L;
  chips.forEach(c => {
    const b = el('button', 'relchip', esc(c.label) + ' ›'); b.type = 'button';
    b.onclick = () => { const title = $('#title').textContent, crumb = LCRUMB, at = snap.i;   // 제목은 누를 때 — drawCard 는 show() 보다 먼저 돈다
      dive(() => { L = snap; L.i = at; LCRUMB = crumb; drawCard(); show('learn', title, true); }); c.go(); };
    box.append(b);
  });
}
function drawCard() {
  spdResetFor('L:' + (L && L.day ? L.day.day : '') + ':' + (L ? L.i : ''));
  resetRec();
  inkClear();                                  // 카드를 넘기면 앞 카드에 쓴 글씨는 바로 지운다
  if (window.cardArrows) setTimeout(window.cardArrows, 0);
  drawRelLinks();                              // 관련 챕터 단추 (2026-10-02)
  const c = $('#card');
  $('#face').hidden = true; FACE = null;
  c.textContent = '';
  const it = L.items[L.i], x = it.d;
  { const nx = L.items[L.i + 1]; prefetchSnd([x && x.vi, x && x.ex && x.ex.vi, nx && nx.d && nx.d.vi]); }   // 이 카드·다음 카드 소리를 미리 (2026-09-28 밤)

  if (it.k === 'card') {                     // 카드뉴스 한 장 (기사 세트의 맨 앞 두 장)
    const im = el('img', 'newscardimg');
    im.src = x.src; im.alt = tr('카드뉴스') + ' ' + x.n; im.loading = 'eager';
    // 아직 안 만들어진 날이면 그냥 다음 장으로 — 빈 화면을 보여 주지 않는다
    im.onerror = () => { if (L.i < L.items.length - 1) { L.i++; drawCard(); } };
    c.append(im);
    if (x.n === 2 && x.u) {
      const a = el('a', 'srclink', tr('기사 보러가기') + ' ›');
      a.href = x.u; a.target = '_blank'; a.rel = 'noopener';
      c.append(a);
    }
  }

  if (it.k === 'cover') {
    const cp = pic(x, 'pic cover'); if (cp) c.append(cp);
    c.append(el('div', 'covert', esc(x.t)));
    c.append(el('div', 'coverb', x.b));       // 우리가 쓴 글이라 굵게 표시를 살린다
    if (x.src) {                              // 기사 세트 — 원문으로 가는 길
      const a = el('a', 'srclink', '원문 기사 보기 ›');
      a.href = x.src; a.target = '_blank'; a.rel = 'noopener';
      c.append(a);
    }
    if (x.pre && x.pre.length) {              // 제 차례보다 먼저 나오는 말 — 몰라도 되게 미리 적어 준다
      const k = el('div', 'kinbox');
      k.append(el('div', 'kint', '이 세트에 <b>미리 나오는 말</b> — 정식으로는 뒤에서 배웁니다'));
      x.pre.forEach(w => k.append(el('span', 'prew', '<b>' + esc(w.vi) + '</b> ' + esc(w.ko))));
      c.append(k);
    }
    if (x.how) c.append(el('div', 'coverhow', x.how));   // 처음 몇 번만 나오는 짧은 사용법
    if (x.cult) {                             // 이 주제에 붙는 베트남 문화 한 조각
      const k = el('div', 'cultbox');
      k.append(el('div', 'cultt', x.cult.e + ' ' + esc(x.cult.t)));
      k.append(el('div', 'cultb', x.cult.b));
      c.append(k);
    }
  }

  if (it.k === 'letter') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'ko', esc(x.ko)));   // ko에 발음이 이미 있어 따로 안 겹쳐 쓴다
    /* **글자 소리 그 자체**를 들려준다 (대표님 지시 2026-09-27: "ba 듣기 대신 진짜 그 소리").
       모음은 그 모음 하나를, 자음은 베트남 초등학교가 자음을 읽는 방식(bờ·cờ·dờ… — 자음 뒤에 'ơ'를 붙여
       첫소리만 들리게)으로 읽은 소리(x.snd)를 튼다. 예시 단어은 그 뒤 작은 단추로 남긴다. */
    const row = el('div', 'sound');
    const snd = x.snd || x.vi;
    const a = el('button', 'primary', '🔊 ' + tr('소리 듣기'));
    a.onclick = () => { const k = recKey(snd); k ? play(k, false, null, spdOf()) : speakVi(snd, false, spdOf()); };
    row.append(a);
    if (x.ex) {
      const e = el('button', 'ghost', esc(x.ex) + ' ' + tr('듣기'));
      e.onclick = () => play(x.ex, false, null, spdOf());
      row.append(e);
    }
    c.append(row);
    /* 기본기 글자 카드 = **발음 면** (대표님 지시 2026-09-28: "기본기는 발음 카드면만 보여줘도 된다. 특별한 사항만 글로") —
       소리 단추가 트는 말(snd)로 움직이는 입모양(정면·옆 단면, 누르면 0.2배) + 알아 둘 것(뒤에 무엇이 오나·철자 규칙) */
    if (!x.nomouth) c.append(mouthPanel(snd));
    if (x.rules && x.rules.length) {
      const rb = el('div', 'lrules');
      rb.append(el('div', 'lrulet', tr('알아 둘 것')));
      const ul = el('ul');
      x.rules.forEach(r => ul.append(el('li', null, r)));
      rb.append(ul);
      c.append(rb);
    }
    if (x.ex) c.append(el('div', 'exline', '예: <b>' + esc(x.ex) + '</b> — ' + esc(x.ex_ko)));
    if (L.day && L.day.day === 'P3' && x.snd && x.snd !== x.vi) c.append(el('div', 'lnote', tr('자음은 베트남 학교식으로') + ' <b>' + esc(x.snd) + '</b>' + tr('처럼 읽어 첫소리만 들려줍니다')));
    c.append(speakRow(snd));                // 글자 소리를 따라 말하기 + 곡선 비교
  }

  if (it.k === 'cmp') {
    /* 헷갈리는 소리 짝 (기본기 P6) — 낱말을 누르면 그 소리 + 그 낱말의 입모양, [번갈아 듣기]로 비교 */
    c.append(el('div', 'cmpt', esc(x.t)));
    c.append(el('div', 'cmpsame ' + (x.same ? 'same' : 'diff'), tr(x.same ? '북부에서 같은 소리' : '다른 소리 — 구별해야 함')));
    const list = el('div', 'cmplist'), mhost = el('div', 'cmpmouth'), rows = [];
    const pick = (i, sound) => {
      rows.forEach((r, j) => r.classList.toggle('on', j === i));
      mhost.textContent = '';
      mhost.append(mouthPanel(x.items[i].vi));
      if (sound) play(x.items[i].vi, false, null, spdOf());
    };
    x.items.forEach((o, i) => {
      const r = el('button', 'cmprow', '<span class="cmpplay">▶</span><b>' + esc(o.vi) + '</b><span>' + esc(o.ko) + '</span>');
      r.type = 'button';
      r.onclick = () => pick(i, true);
      rows.push(r); list.append(r);
    });
    c.append(list);
    const seq = el('button', 'ghost cmpseq', '▶ ' + tr('번갈아 듣기'));
    seq.type = 'button';
    seq.onclick = () => { const w = x.items.map(o => o.vi); playSeq(w.concat(w), rows.concat(rows)); };
    c.append(seq);
    c.append(el('div', 'rulenote', x.note));
    c.append(mhost);
    pick(0, false);
  }

  if (it.k === 'tone') {
    const tp = pic(x, 'pic'); if (tp) c.append(tp);        // ma·má·mả… 단어 그림 (2026-09-26)
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'tone-shape', toneArrow(x.mark)));
    c.append(reveal(krShow(x)));
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(speakRow(x.vi, true));         // 듣기·느리게 + 따라 말하기 + 곡선 비교
  }

  if (it.k === 'know') {
    c.append(el('div', 'cultemo', esc(x.e || '📌')));
    c.append(el('div', 'ko', esc(x.t)));
    c.append(el('div', 'rulenote', x.b));
    if (x.n && x.n.length) c.append(numBars(x.n, x.u));   // 숫자는 글보다 그림이 빠르다
  }

  if (it.k === 'ksent') {
    /* 동그란 소리 단추를 없애고 상자 전체를 누르면 문장이 재생되게 (대표님 지시, 2026-09-09).
       발음(kr)을 뜻(ko)보다 먼저 보여준다(순서도 지시하신 대로). */
    const box = el('div', 'wex wexplay');
    box.onclick = () => { const k = recKey(x.vi); k ? play(k, false) : speakVi(x.vi); };
    box.append(tapLine(x.vi, 'wexvi tapline'));
    box.append(el('div', 'wexkr', '[' + esc(x.kr) + ']'));
    box.append(el('div', 'wexko', esc(x.ko)));
    c.append(box);
  }

  if (it.k === 'gram') {
    c.append(el('div', 'gramt', esc(x.t)));
    c.append(el('div', 'gramk', esc(x.k)));
    /* 짜임에 늘어놓은 단어의 **뜻을 함께** 보여 준다 (대표님 지적, 2026-08-30):
       "모르는 단어들을 나열하면서 사용하라고 하면 되냐?" — 맞는 말이었다.
       biết một chút / khá / giỏi 를 늘어놓고 뜻은 하나도 안 적혀 있었다. */
    if (x.kw && x.kw.length) {
      const kb = el('div', 'gramkw');
      x.kw.forEach(([w, m]) => {
        const it2 = el('button', 'gkw');
        it2.type = 'button';
        it2.append(el('b', null, esc(w)), el('span', null, esc(m)));
        it2.onclick = () => { const t = w.replace(/[.…]/g, '').trim();
          const key = recKey(t);
          if (key) play(key, false, voiceDir()); else speakVi(t, false, 0, S.voice); };
        kb.append(it2);
      });
      c.append(kb);
    }
    c.append(el('div', 'rulenote', x.b));
    if (x.tip) c.append(el('div', 'gramtip', '💡 ' + esc(x.tip)));
    x.ex.forEach(e => {
      const box = el('div', 'wex wexplay');
      box.onclick = () => { const k = recKey(e.vi); k ? play(k, false) : speakVi(e.vi); };
      box.append(tapLine(e.vi, 'wexvi tapline'));
      box.append(el('div', 'wexkr', '[' + esc(e.kr) + ']'));
      box.append(el('div', 'wexko', esc(e.ko)));
      c.append(box);
    });
  }

  if (it.k === 'cult') {
    c.append(el('div', 'cultemo', esc(x.e)));
    c.append(el('div', 'ko', esc(x.t)));
    c.append(el('div', 'rulenote', x.b));
  }

  if (it.k === 'rule') {
    // 규칙 예문 — 단어 카드와 같은 차림새 + 규칙 설명 한 줄
    const row = el('div', 'wrow');
    row.append(bigWord(x.vi, x.tones));
    if (krShow(x)) row.append(el('span', 'wkr', '[' + esc(krShow(x)) + ']'));
    const rbox = el('div', 'cmpbox');
    if (canRecord()) {
      const mic = iconBtn('mic', '따라 말하기', null);
      mic.onclick = () => toggleRec(x.vi, mic, rbox);
      row.append(mic);
    } else {
      /* 마이크 단추를 그냥 안 그리기만 하면 대표님 표현대로 "아예 반응없음"이 된다
         — 왜 안 되는지도 안 보인다(2026-09-09 지적). 이유를 보여준다. */
      rbox.append(el('div', 'cmpnote', '이 기기·브라우저에서는 녹음을 못 씁니다 — 소리 내어 따라 말해만 보세요.'));
    }
    c.append(row);
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(tapLine(x.vi));                 // 단어을 누르면 소리 + 뜻
    c.append(el('div', 'rulenote', esc(x.note)));
    // R4(남부 소리 비교 수업)를 없애면서 이 북부/남부 맞대 듣기 버튼도 같이 지웠다.
    c.append(curveArea(x.vi, rbox));
  }

  if (it.k === 'word') {
    /* 단어 하나에 **두 면** — 단어 면(그림·단어·발음·뜻·예문·높낮이 그래프)과
       발음 면(입모양·단어이 그래프 위를 따라 움직이는 높낮이·재생 막대). 단추 하나로 넘긴다
       (대표님 지시, 2026-09-26). 카드를 열 때는 늘 **단어 면**에서 시작한다.
       단어을 누르면 어느 면에서든 헷갈리는 짝이 팝업으로 뜬다. 단어 뜻 밑에 [듣기][말하기]. */
    const cf = el('div', 'wfcard');           // 단어 면
    const pf = el('div', 'wfpron');           // 발음 면
    const tg = $('#face');                    // 머리띠 가운데 [단어|발음] (대표님 지시 2026-09-27: 맨 위로 옮김 — 남/여 · 단어/발음 · 내 정보)
    tg.hidden = false;
    const setFace = f => {
      L.face = f;
      cf.hidden = f !== 'card'; pf.hidden = f !== 'pron';
      tg.dataset.f = f;
      tg.setAttribute('aria-label', f === 'card' ? tr('발음 면으로 넘기기') : tr('단어 면으로 넘기기'));
    };
    FACE = setFace;
    autoSay(x.vi);                            // 카드가 뜨면 소리 (2026-10-02) — 면을 바꿀 때는 다시 안 튼다
    const tapPair = () => pairPopup(x.vi, { kr: krShow(x), ko: x.ko });

    /* ── 단어 면 ──
       그림 → [단어 · 발음 · 별] → [듣기 · 말하기] → 뜻 → 예문(누르면 소리) → 높낮이 그래프 */
    const p = pic(x, 'pic big'); if (p) cf.append(p);
    else if (x.form) {                       // 그림으로 못 그리는 말은 '자리'를 보여준다
      const fb = el('div', 'formbox');
      fb.append(el('div', 'formf', esc(x.form)));
      if (x.fex) fb.append(el('div', 'formex', esc(x.fex)));
      cf.append(fb);
    }
    const row = el('div', 'wrow');
    row.append(bigWord(x.vi, x.tones, tapPair));
    const so = southOf(x.vi);                                // 남부 말이면 작은 딱지 — 북부 기준 (2026-09-29)
    if (so) row.append(el('span', 'southpill', tr('남부')));
    if (krShow(x)) row.append(el('span', 'wkr', '[' + esc(krShow(x)) + ']'));
    row.append(starBtn(x.vi, x.ko, x.vi));    // 나만의 단어장에 담기
    cf.append(row);
    /* 뜻이 같은 다른 단어 — 지우지 않고 **같이 보여 준다** (대표님 지시, 2026-08-30).
       ngang vai 와 rộng vai 는 둘 다 '어깨 넓이'다. 하나만 두면 나머지를 못 배운다. */
    if (x.alt && x.alt.length) {
      const box = el('div', 'altrow');
      box.append(el('span', 'altlab', tr('같은 뜻')));
      x.alt.forEach(a2 => {
        const b2 = el('button', 'altw');
        b2.type = 'button';
        b2.append(el('b', null, esc(a2.vi)));
        const kr = a2.kr;
        if (kr) b2.append(el('span', 'altkr', '[' + esc(kr) + ']'));
        b2.onclick = () => { const k = recKey(a2.vi); k ? play(k, false) : speakVi(a2.vi); };
        box.append(b2);
      });
      cf.append(box);
    }
    // 선배 표시(⭐)는 완전히 없앴다 (대표님 지시, 2026-09-09).
    const kob = el('div', 'ko', esc(x.ko));
    /* 단어장(교재 맨 뒤 Bảng từ)에 실린 단어은 '핵심' 표시 — 그 밖의 단어은 그냥 둔다
       (대표님 지시 2026-09-25 #13). 데이터는 gybm.json 의 gl:1 (단어장 표시). */
    if (isCore(x)) kob.prepend(el('span', 'corepill', tr('핵심')));
    cf.append(kob);
    const boxC = el('div', 'cmpbox');         // 말하기(녹음) 결과 — 뜻 바로 아래 [듣기][말하기] 밑에 (대표님 지시 2026-09-27)
    cf.append(wordControls(x.vi, boxC), boxC);
    /* 일터에서 뜻이 달라지는 단어 — 직무 권에 또 두지 않고 여기에 덧붙인다
       (대표님 지적, 2026-08-30: 같은 단어을 두 번 외우게 하지 않는다). */
    if (x.work && x.work.length)
      cf.append(el('div', 'workuse', '🏭 ' + tr('일터에서는') + ' ' +
                  x.work.map(t2 => esc(t2)).join(' · ')));
    rootPills(kob, x);                                     // 한자·외래어 뿌리 — 검수된 data/_roots.json 만 (2026-09-28 밤). 알약: 한자·음 + 글자마다 훈
    caiNote(cf, x);                                        // 'cái nhà' 처럼 분류사가 붙은 표제어 (2026-09-29)
    const dfe = L.dict && DFULL && DFULL[String(x.vi).trim().toLowerCase()];
    if (dfe) { kob.textContent = ''; if (isCore(x)) kob.append(el('span', 'corepill', tr('핵심'))); kob.append(dfullBox(dfe, () => openWordCard(x))); rootPills(kob, x); }   // 사전 카드: 품사별 모든 뜻·유의어·반의어 (2026-10-01) — 한자 알약은 뜻 목록 밑에 다시(위에서 단 것은 지워진다)
    else senseLine(kob, x);                                // 뜻이 여럿이면 최대 3개 (검수된 data/_senses.json)
    if (so) cf.append(southLine(so));                       // 남부 말 · 북부에서는 ○○ (2026-09-29)
    else if (x.south) cf.append(el('div', 'south', '남부에서는 ' + esc(x.south)));
    /* 예문 — 통째로 누르던 단추를 **단어마다 누르는 줄**로 바꿨다 (대표님 지시, 2026-08-30).
       단어을 누르면 그 단어만 소리가 나고, 한글 소리와 뜻이 아래 줄에 뜬다.
       문장 전체를 듣는 길은 오른쪽 작은 단추로 남겨 둔다. */
    /* 새 짜임에서는 예문이 **단어 안에** 들어 있다(course.json). 없으면 옛 방식대로
       그날 대화에서 그 단어이 든 문장을 찾아 쓴다. */
    const exm = x.ex || exampleFor(L.day, x);
    if (exm && !L.dict) {                                   // 수업 카드: 그 낱말의 예문 그대로
      const eb = el('div', 'wex wexplay');
      eb.onclick = () => { const k = recKey(exm.vi); k ? play(k, false) : speakVi(exm.vi); };
      eb.append(tapLine(exm.vi, 'wexvi tapline'));
      const ekr = exm.kr;
      if (ekr) eb.append(el('div', 'wexkr', '[' + esc(ekr) + ']'));
      if (exm.ko) eb.append(el('div', 'wexko', esc(exm.ko)));
      /* 예문 밑 [듣기][속도] 단추는 뺐다 (대표님 2026-10-02 "예문의 듣기 버튼 없애자 — 예문 박스 누르면 소리") */
      cf.append(eb);
    }
    /* 사전 카드의 예문 — 차례 (대표님 2026-10-01 "1순위 메인 교재 문장, 2순위 사전 문장, 둘 다 없으면 그때 만든 예문"):
       ① 교재 예문: 메인 교재 원문(쪽 이미지로 확인한 2,094문장) 가운데 그 낱말이 낱말로 쓰인 것
       ② 사전 예문: 위키낱말사전 예문 그대로 + 한국어(data/_dict_ex.json)
       ③ 만든 예문: ①② 가 하나도 없을 때만 — 그 낱말의 수업 예문과 앱의 다른 문장(일상·직무·선배·22기, 대부분 AI·클로드가 쓴 것).
       세 칸 합쳐 3문장. 선배 엑셀 예문은 뺐다(대표님 2026-10-01). 칸 이름으로 출처를 밝힌다 */
    if (L.dict) {
      const exRow = m => {
        const r = el('div', 'appexrow');
        r.append(tapLine(m.vi, 'appexvi tapline'));
        if (m.ko) r.append(el('div', 'appexko', esc(m.ko)));
        const spk = el('button', 'appexspk', '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>');
        spk.type = 'button'; spk.title = tr('듣기');
        spk.onclick = ev => { ev.stopPropagation(); const k = recKey(m.vi); k ? play(k, false) : speakVi(m.vi); };
        r.append(spk);
        return r;
      };
      const host = el('div', 'appex');
      cf.append(host);
      dexLoad().then(() => {
        const have = new Set(), MAX = 3;
        const take = (list, n) => list.filter(m => { const k = m.vi.toLowerCase(); if (have.has(k)) return false; have.add(k); return true; }).slice(0, n);
        const own = exm && exm.vi ? [{ vi: exm.vi, ko: exm.ko || '', bk: x.ex_src === 'main_book' || exm.src === 'main_book' }] : [];
        const t1 = take([...own.filter(m => m.bk), ...appExFor(x.vi, null, true)], MAX);
        const t2 = take(((DEX && DEX[String(x.vi).trim().toLowerCase()]) || []).map(([v, k]) => ({ vi: v, ko: k })), MAX - t1.length);
        const t3 = t1.length || t2.length ? [] : take([...own.filter(m => !m.bk), ...appExFor(x.vi, null, false)], MAX);
        /* 처음엔 한 문장만 (대표님 2026-10-01 "단어 카드마다 하나의 예문이면 괜찮지?") — 나머지는 [예문 더 보기] 를 눌러야 펼친다(뜻이 여럿인 낱말 cảm 느끼다·감기 같은 것) */
        const all = [...t1.map(m => [tr('교재 예문'), m]), ...t2.map(m => [tr('사전 예문'), m]), ...t3.map(m => [tr('만든 예문'), m])];
        if (!all.length) { host.remove(); return; }
        let lastH = null;
        const put = (box, [h, m]) => { if (h !== lastH) { box.append(el('div', 'appexh', h)); lastH = h; } box.append(exRow(m)); };
        put(host, all[0]);
        if (all.length > 1) {
          const more = el('div', 'appexmore'); more.hidden = true;
          all.slice(1).forEach(x2 => put(more, x2));
          const btn = el('button', 'ghost sm appexbtn', tr('예문 더 보기') + ' (' + (all.length - 1) + ')'); btn.type = 'button';
          btn.onclick = () => { more.hidden = !more.hidden; btn.textContent = more.hidden ? tr('예문 더 보기') + ' (' + (all.length - 1) + ')' : tr('접기'); };
          host.append(btn, more);
        }
      });
    }
    // 카드 안의 '헷갈리는 짝 ▾' 줄은 뺐다 — 단어을 누르면 같은 것이 팝업으로 뜬다 (대표님 지시 2026-09-27 저녁)
    cf.append(pitchGraph(x.vi, { img: x.img }));   // 하나뿐인 높낮이 그래프 — 단어이 따라가고, 말하면 내 곡선이 겹친다
    /* 큰 사전 바로가기 — 네이버 베트남어사전을 새 창으로(자료를 가져오지 않고 그 사이트를 여는 것이라 무료·저작권 문제 없음, 2026-10-01).
       자리: 카드 맨 아래 그래프 밑 (대표님 2026-10-01 밤 "그래프 밑, 최하단으로"). 구글 번역 단추는 뺐다("너무 버퍼링 걸린다") */
    if (L.dict) {
      const lk = el('div', 'dflinks'), a = document.createElement('a');
      a.className = 'dflink'; a.href = 'https://dict.naver.com/vikodict/#/search?query=' + encodeURIComponent(x.vi);
      a.target = '_blank'; a.rel = 'noopener'; a.textContent = tr('네이버 사전') + ' ↗';
      lk.append(a); cf.append(lk);
    }

    /* ── 발음 면 ──
       단어 → [듣기 · 말하기] (단어 면과 같은 자리) → 뜻 → 재생 막대 → 입모양 → 단어이 따라 움직이는 높낮이 */
    const prow = el('div', 'wrow');
    prow.append(bigWord(x.vi, x.tones, tapPair));
    if (krShow(x)) prow.append(el('span', 'wkr', '[' + esc(krShow(x)) + ']'));
    const boxP = el('div', 'cmpbox');
    const pko = el('div', 'ko', esc(x.ko)); rootPills(pko, x);
    pf.append(prow, pko, wordControls(x.vi, boxP), boxP);
    pf.append(playBar(x.vi));                  // 재생 막대 (2026-09-26)
    pf.append(mouthPanel(x.vi));               // 입모양 2D (2026-09-25 #6)
    pf.append(pitchGraph(x.vi, { img: x.img })); // 단어이 소리를 따라 움직이는 하나뿐인 높낮이 그래프 (2026-09-25 #7 · 09-27 합침)

    c.append(cf, pf);
    setFace(L.keepFace || 'card');           // 목소리를 바꿔 다시 그릴 때만 보던 면을 지킨다
    L.keepFace = null;
    // 첫 카드의 '쓰는 법' 안내창(tutorTap)은 뺐다 (대표님 지시 2026-09-27 저녁)
  }

  if (it.k === 'dialog') {
    c.classList.add('wide');
    c.append(el('div', 'setbadge daily', '오늘의 대화 · ' + esc(x.title)));
    const p = pic(x, 'pic'); if (p) c.append(p);
    const lineEls = [];
    const all = el('button', 'primary', '▶ 대화 전체 듣기');
    all.onclick = () => playSeq(x.lines.map(l => l.vi), lineEls);
    c.append(all);

    x.lines.forEach(l => {
      const row = el('div', 'line ' + (l.who === 'A' ? 'a' : 'b'));
      const head = el('div', 'lhead');
      head.append(el('span', 'who', l.who));
      row.append(head);
      /* 문장 줄 — 듣기 단추는 **문장 오른쪽**에 붙인다. 왼쪽 머리에 있으면
         문장을 읽기 전에 단추부터 보게 되어 순서가 거꾸로다. */
      const lrow = el('div', 'lrow');
      /* 문장 자체를 눌러볼 수 있게 — 밑에 단어 뜻줄을 따로 깔지 않는다.
         뜻은 이 대화가 들고 있는 gloss(사람이 붙인 것)를 먼저 쓰고, 없으면 사전을 본다.
         그래서 gloss 에 없던 단어도 이제 빠지지 않는다. */
      const dict = {};
      (l.gloss || []).forEach(pp => { dict[pp.w.toLowerCase().replace(/[,.!?;:]/g, '')] = pp.m; });
      const tmap0 = {};
      (l.tones || []).forEach(t => { tmap0[t.syl.toLowerCase().replace(/[.,!?;:'"]/g, '')] = t; });
      lrow.append(tapLine(l.vi, 'lvi', { dict, tones: tmap0 }));
      const bt = iconBtn('slow', '듣기', () => play(l.vi, false));
      bt.classList.remove('slow'); bt.classList.add('playi');
      bt.innerHTML = ICON.play;
      lrow.append(bt, bs);
      row.append(lrow);
      row.append(reveal(krShow(l)));
      row.append(el('div', 'lko', esc(l.ko)));
      // 단어 뜻줄은 없앴다 — 위 문장의 단어을 직접 누르면 소리와 뜻이 그 자리에 뜬다.
      row.append(speakRow(l.vi));
      lineEls.push(row);
      c.append(row);
    });

    if (x.extra && x.extra.length) {
      const sw = el('div', 'ex');
      sw.append(el('div', 'exhead', '이렇게도 말합니다'));
      x.extra.forEach(t => {
        const o = typeof t === 'string' ? { vi: t } : t;
        const b = el('button', 'exrow');
        const L2 = el('span', 'exl');
        L2.append(el('span', 'exvi', esc(o.vi)));
        if (o.ko) L2.append(el('span', 'exko', esc(o.ko)));
        if (krShow(o)) L2.append(el('span', 'exkr', '[' + esc(krShow(o)) + ']'));
        b.append(L2, el('span', 'exspk', '듣기'));
        b.onclick = () => play(o.vi, false);
        sw.append(b);
      });
      c.append(sw);
    }
  } else {
    c.classList.remove('wide');
  }

  // '1 / 12'만 보면 외울 게 12개인 줄 안다. 무엇을 세는지 붙여준다.
  const KIND = { letter: '글자', tone: '성조', word: '단어', dialog: '대화', rule: '예문', cult: '문화', cmp: '소리 짝', know: '알아 두기' };
  if (L.day && ['P7', 'P8', 'P9'].includes(L.day.day)) KIND.letter = '규칙';   // 철자·숫자·끊어 읽기 카드는 글자가 아니라 규칙 (2026-09-29)
  // 표지는 세는 대상에서 빼야 '단어 1 / 10'이 맞는다
  const kinds = L.items.map(x => x.k);
  if (it.k === 'cover') {
    $('#pos').textContent = '';
  } else if (it.k === 'dialog') {
    $('#pos').textContent = '오늘의 대화';
  } else {
    const same = kinds.filter(k => k === it.k).length;
    const nth = kinds.slice(0, L.i + 1).filter(k => k === it.k).length;
    $('#pos').textContent = `${KIND[it.k] || ''} ${nth} / ${same}`;
  }
  /* 단추는 **마지막 장에서만** 나온다 (대표님 지시) — 그 사이는 밀어서 넘긴다.
     마지막 장의 단추는 '다음'이 아니라 진도를 확정하는 자리라 남긴다. */
  if (L.dict) $('#pos').textContent = tr('사전');
  const last = L.i === L.items.length - 1;
  $('#next').hidden = !last || !!L.dict;      // 사전에서 연 단어 카드는 확인 문제로 안 간다
  const qnr = $('#qnRow');                       // 단어 확인 문제로 가는 마지막 장에만 문제 수 고르기 (2026-09-28 밤)
  if (qnr) { qnr.textContent = ''; const toQuiz = last && !L.dict && !L.day.gram && !L.cult && !L.day.know && !L.news && !L.dlg && (L.day.words || []).length;
             qnr.hidden = !toQuiz; if (toQuiz) qnr.append(qnPicker()); }
  $('#next').textContent = L.day.gram ? '확인 문제 ›'
    : L.cult || L.day.know ? '다 봤어요' : (L.day.words || []).length ? '확인 문제 ›'
    : L.day.rule ? '연습 문제 ›'
    : ['P1', 'P2', 'P4', 'P5', 'P6'].includes(L.day.day) ? '귀로 구별하기 ›' : '완료 ›';
}
$('#next').onclick = () => {
  // 연타 방지는 시간이 아니라 '아직 이 화면에 있는가'로 판단한다.
  // 시간으로 막으면 앞 화면에서 막 넘어온 사람까지 막힌다.
  if ($('#learn').hidden) return;
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if (L.cult) { dailyFlowEntry(); return; }
  if (L.day.gram) { startGramQuiz(L.day.day, L.day.theme, L.items.map(it => it.d)); return; }
  if (L.day.know) { S.done[L.day.day] = now(); save(); dailyFlowEntry(); return; }
  if (L.news) {                        // 기사 세트 — 대화 두 줄을 보고 끝. 채점도 복습도 없다
    if (!L.dlg && L.day.dialog) { L.items = [{ k: 'dialog', d: L.day.dialog }]; L.i = 0; L.dlg = true;
                                  drawCard(); show('learn', L.day.theme, true); return; }
    dailyFlowEntry(); return;
  }
  if (L.dlg) {                         // 대화(써먹기)까지 끝나면 오늘 완료
    const firstDone = !S.done[L.day.day];   // 처음 끝내는 세트마다 돈을 준다 (2026-09-27 저녁: 학습하면 짜오 먹이 살 돈을 번다). 다시 하는 세트는 하루 한 번만
    S.done[L.day.day] = now();
    (L.day.dialog?.lines || []).forEach(l => {          // 그날 문장도 복습 창고로
      if (!S.srs[l.vi]) S.srs[l.vi] = { lv: 0, first: now(), due: now() + STEPS[0] * DAY };
    });
    touchToday(); save();
    if (firstDone) earn(CRD.set, tr('세트를 끝냈습니다')); else earnOnce('set', CRD.set, tr('오늘 세트를 끝냈습니다'));
    cloudSave(true);                        // 세트를 끝냈으니 서버에도 남긴다
    finishDay(L.day);
    return;
  }
  if ((L.day.words || []).length) {
    const back = L.day, at = L.i;                    // 확인 문제에서 뒤로 = 보던 카드로
    dive(() => { startLearn(back); L.i = Math.min(at, L.items.length - 1); drawCard(); });
    startQuiz(L.day.words, L.day); return;
  }
  if (L.day.rule) {                    // 규칙 카드가 끝나면 연습 문제로
    const r0 = L.day.rule, at = L.i;
    dive(() => { startRule(RULES.indexOf(r0) >= 0 ? RULES.indexOf(r0) : 'G' + GRAMMAR.indexOf(r0));
                 L.i = Math.min(at, L.items.length - 1); drawCard(); });
    RL = { r: L.day.rule, i: 0, ok: 0 };
    drawRule();
    show('rules', L.day.rule.title, true);
    return;
  }
  S.done[L.day.day] = now(); touchToday(); save();
  // 소개가 끝나면 바로 귀 훈련으로 이어진다 — 배우기와 시험하기가 한 흐름
  const d0 = L.day, at0 = L.i;
  const backToCards = () => { startLearn(d0); L.i = Math.min(at0, L.items.length - 1); drawCard(); };
  if (['P1', 'P4', 'P5', 'P6'].includes(L.day.day)) { dive(backToCards); startEar(L.day.day); }
  else if (L.day.day === 'P2') { dive(backToCards); startTone(); }
  else if (typeof L.day.day === 'string' && L.day.day[0] === 'P') studyBasicsEntry();   // 자음 챕터 → 기본기 목록으로
  else dailyFlowEntry();
};

/* 사진첩처럼 — 카드를 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전.
   버튼(마이크·소리·예문)을 누르는 동작과 헷갈리지 않도록 스와이프(드래그)만 반응하고,
   가벼운 탭은 무시한다 — 카드 위 아무 데나 눌러도 화면이 넘어가면 글을 읽다가도 실수로 넘어간다.
   마지막 카드에서 다음으로 넘기는 건('확인 문제로 가기' 같은 진도 확정) 여기서 다루지 않는다 —
   그건 실수로 밀려서 넘어가면 안 되는 결정이라 '다음 ›' 버튼을 눌러야만 넘어간다. */
(() => {
  const card = $('#card');
  let x0 = null;
  const goto = dir => {                       // dir: -1 이전, +1 다음
    if ($('#learn').hidden) return;
    L.keepFace = L.face;                      // 발음 면을 보다가 넘기면 다음 카드도 발음 면 (대표님 2026-10-02)
    if (dir < 0 && L.i > 0) { L.i--; drawCard(); }
    else if (dir > 0 && L.i < L.items.length - 1) { L.i++; drawCard(); }
    L.keepFace = null;
    if (window.cardArrows) window.cardArrows();
  };
  /* 좌우 붙박이 단추 — 밀기를 모르는 사람을 위한 길 (대표님 지시 2026-08-31) */
  const prevB = $('#goPrev'), nextB = $('#goNext');
  window.cardArrows = () => {
    if (!prevB || !nextB) return;
    const on = !$('#learn').hidden && L && L.items;
    prevB.hidden = nextB.hidden = !on;
    if (!on) return;
    prevB.disabled = L.i <= 0;
    nextB.disabled = L.i >= L.items.length - 1;
  };
  if (prevB) prevB.onclick = () => goto(-1);
  if (nextB) nextB.onclick = () => goto(1);
  /* 세로로 밀면(스크롤) 넘어가지 않는다 (대표님 지시 2026-09-30: "위아래로 스와이프해서 이전·이후 이동하는 거 안 되게").
     전에는 가로 움직임만 40px 넘으면 넘겨서, 긴 카드를 비스듬히 스크롤하다 카드가 넘어갔다.
     이제 가로가 세로의 1.5배 넘게 움직였을 때만 — 단어 면·발음 면 모두. */
  /* 한 손가락 밀기 (대표님 2026-10-03 "2손가락 제스처 없애자. 필기 모드 아닐 때 좌우 스와이프로 이전·이후, 위로 손가락 올리면 카드면 전환. 필기 켜고 끄기는 제스처 없애자").
     필기가 켜져 있으면 손가락은 글씨만 쓴다(밀기 없음 — 단추로 넘긴다).
     좌우: 가로 40px 넘게, 세로의 1.5배 넘게 → ← 다음 · → 이전.
     위로: 세로 90px 넘게, 가로의 2.5배 넘게, 0.7초 안 — 세로 밀기는 원래 스크롤이라 **맨 아래에서 시작해 맨 아래에서 끝날 때만**(짧은 카드는 늘) → 단어 면 ↔ 발음 면 */
  const atBottom = () => (window.scrollY || 0) + innerHeight >= document.documentElement.scrollHeight - 2;
  const lv = $('#learn');
  let sw = null;
  lv.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || INK.finger || e.target.closest('input, textarea, .pbar')) { sw = null; return; }
    sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), bot: atBottom() };
  }, { passive: true });
  lv.addEventListener('touchend', e => {
    const v = sw; sw = null;
    if (!v || lv.hidden || INK.finger) return;
    const dx = e.changedTouches[0].clientX - v.x, dy = e.changedTouches[0].clientY - v.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { goto(dx < 0 ? 1 : -1); return; }
    if (dy < -90 && Math.abs(dy) >= Math.abs(dx) * 2.5 && performance.now() - v.t <= 700 && v.bot && atBottom() && FACE && L) FACE(L.face === 'pron' ? 'card' : 'pron');
  }, { passive: true });
  /* 컴퓨터에서도 넘어가야 한다 — 손가락만 받으면 마우스로는 아무 일도 안 일어난다.
     단추·입력칸 위에서 시작한 끌기는 무시한다(마이크 단추를 끌다가 넘어가면 안 된다). */
  let m0 = null, my0 = null;
  card.addEventListener('mousedown', e => {
    m0 = e.target.closest('button, input, textarea, a') ? null : e.clientX; my0 = e.clientY;
  });
  window.addEventListener('mouseup', e => {
    if (m0 === null) return;
    const dx = e.clientX - m0, dy = e.clientY - my0; m0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goto(dx < 0 ? 1 : -1);
  });
  // 화살표 키로도 — 글자를 쓰는 중이면 건드리지 않는다
  window.addEventListener('keydown', e => {
    if ($('#learn').hidden) return;
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'ArrowLeft') goto(-1);
    else if (e.key === 'ArrowRight') goto(1);
  });
})();

/* ---------- 훑기 엔진 (예습·간략 복습) ----------
   카드가 소리와 함께 저절로 넘어간다 — 인출이 없어 외우는 효과는 약하지만,
   내일 것을 미리 눈에 발라두거나(예습) 바쁜 날 밀린 카드를 훑는(간략) 용도.
   카드를 누르면 바로 다음으로 넘어간다. */
let FL = null;
let FLTM = 0;                  // 카드 넘김 타이머는 하나뿐 — 새 카드를 그리면 옛것을 끈다
const FLSEEN = new Set();      // 오늘 이 목록에서 이미 저절로 넘겨 본 카드 ('날짜|제목|낱말')
/* opt.next 가 있으면 카드를 다 넘긴 뒤 [테스트 시작] 단추로 잇는다 (2026-09-27 테스트 탭 3-1: "카드로 쭉 보여준 뒤에 테스트").
   소리가 없는 단어도 뺀 채 넘어가지 않는다 — 카드는 보여 주고 소리만 못 낸다. */
function flashRun(words, title, opt) {
  const ws = (words || []).filter(w => w && w.vi && (AIDX[w.vi] || (opt && opt.next)));
  if (!ws.length) { if (opt && opt.next) opt.next(); return; }
  FL = { list: ws, i: 0, next: opt && opt.next, nextLabel: opt && opt.nextLabel, title };
  show('quiz', title, true);
  drawFlash();
}
function drawFlash() {
  const b = $('#quizBody');
  b.textContent = '';
  audio.onended = null;
  if (!FL || FL.i >= FL.list.length) {
    $('#quizFill').style.width = '100%';
    const r = el('div', 'result');
    r.append(el('div', 'n', (FL ? FL.list.length : 0) + '개'));
    r.append(el('div', null, '눈과 귀로 훑었습니다 — 외우는 건 퀴즈가 합니다'));
    if (FL && FL.next) {                       // 카드 → 바로 테스트 (테스트 탭)
      const nx = el('button', 'primary big', FL.nextLabel || '이제 테스트 시작');
      nx.style.marginTop = '20px'; nx.onclick = () => { const f = FL.next; FL = null; f(); };
      r.append(nx);
      const hm = el('button', 'ghost big', '홈으로');
      hm.style.marginTop = '10px'; hm.onclick = renderHome;
      r.append(hm);
    } else {
      const hm = el('button', 'primary big', '홈으로');
      hm.style.marginTop = '20px'; hm.onclick = renderHome;
      r.append(hm);
    }
    b.append(r);
    touchToday();
    return;
  }
  $('#quizFill').style.width = (FL.i / FL.list.length * 100) + '%';
  const w = FL.list[FL.i];
  spdResetFor('F:' + FL.i + ':' + (w && w.vi));
  const c = el('div', 'card flcard' + (w.sent ? ' flsent' : ''));
  const top = el('div', 'flhead');
  top.append(el('span', 'flcount', tr('카드') + ' ' + (FL.i + 1) + ' / ' + FL.list.length), el('span', 'flpill', esc($('#title').textContent.replace(/ 카드$/, ''))));
  c.append(top);
  const p = pic(w, 'pic'); if (p) c.append(p);
  c.append(el('div', 'vi', esc(w.vi)));
  c.append(toneRow(w.tones));
  if (krShow(w)) c.append(el('span', 'wkr', '[' + esc(krShow(w)) + ']'));
  const fko = el('div', 'ko', esc(w.ko)); rootPills(fko, w);
  c.append(fko);
  const exm = w.ex && w.ex.vi ? w.ex : null;
  if (exm) { c.append(el('div', 'flex', esc(exm.vi))); if (exm.ko) c.append(el('div', 'flexko', esc(exm.ko))); }
  if (w.sent && w.alt && w.alt.length) c.append(el('div', 'flexko', tr('다른 정답') + ' · ' + w.alt.map(esc).join(' · ')));
  c.append(listenGroup(spd => { const k = recKey(w.vi); k ? play(k, false, null, spd) : speakVi(w.vi, false, spd); }));
  b.append(c);
  let moved = false;
  /* c.isConnected: 이 카드가 아직 화면에 있을 때만 넘긴다. 예전에는 카드를 둔 채 홈으로 나가도 3초 타이머가
     살아 있어서, 다시 들어오면 그 옛 타이머가 1초 만에 새 카드를 넘겼다 (대표님 지적 2026-09-29) */
  const go = (step) => {
    if (moved || $('#quiz').hidden || !FL || !c.isConnected) return;
    moved = true; clearTimeout(FLTM); audio.onended = null;
    FL.i = Math.max(0, FL.i + (step === undefined ? 1 : step)); drawFlash();
  };
  // 카드 밑 [‹] · · ● · · [›] (캔버스 시안 2026-09-27)
  const nav = el('div', 'flnav');
  const lb = el('button', 'flarr', '‹'), rb = el('button', 'flarr', '›');
  lb.type = rb.type = 'button'; lb.disabled = FL.i === 0;
  lb.onclick = ev => { ev.stopPropagation(); go(-1); }; rb.onclick = ev => { ev.stopPropagation(); go(1); };
  const dots = el('div', 'fldots');
  FL.list.forEach((_, i) => dots.append(el('i', i === FL.i ? 'on' : null)));
  nav.append(lb, dots, rb); b.append(nav);
  if (FL.next) {                             // 카드를 다 안 봐도 바로 테스트로 갈 수 있다
    const nx = el('button', 'primary big', FL.nextLabel || tr('이제 테스트 시작'));
    nx.style.width = '100%'; nx.onclick = () => { clearTimeout(FLTM); const f = FL.next; FL = null; f(); };
    b.append(nx);
  }
  // 릴스처럼 — 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
  let x0 = null, y0 = null;
  c.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  c.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dy) > 40 && Math.abs(dy) >= Math.abs(dx)) return;   // 세로 스크롤은 넘기지 않는다 (2026-09-30)
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    else if (!e.target.closest('button')) go(1);   // [▶ 듣기]·속도 단추를 누른 건 넘기라는 뜻이 아니다
  }, { passive: true });
  audio.pause();
  audio.src = `audio/${voiceDir()}/n/${AIDX[w.vi]}.mp3`;
  audio.defaultPlaybackRate = audio.playbackRate = rate();
  audio.currentTime = 0;
  audio.play().catch(() => { });
  /* 한 장에 3초 — 소리가 끝나도 남은 시간은 눈으로 본다. 저절로 넘기는 건 **처음 볼 때 한 번만**이다.
     뒤로 돌아와 다시 보거나 나갔다가 다시 들어와 보는 카드는 들여다보려고 온 것이니 멈춰 둔다
     (대표님 지시 2026-09-29) — 밀거나 눌러야 넘어간다. */
  clearTimeout(FLTM);
  const seenKey = ymd() + '|' + FL.title + '|' + w.vi;
  if (!FLSEEN.has(seenKey)) { FLSEEN.add(seenKey); FLTM = setTimeout(go, 3000); }
  c.onclick = go;                        // 급하면 눌러서 바로 다음
}

/* 확인 문제 뒤의 마무리 — 오늘 배운 문장을 실제로 써먹는다 */
function startDialog(d) {
  LCRUMB = crumbOf(d) + ' · ' + tr('문장으로 써먹기');
  L = { day: d, items: [{ k: 'dialog', d: d.dialog }], i: 0, dlg: true };
  drawCard();
  show('learn', label(d) + ' · 문장으로 써먹기', true);
}
function finishDay(d) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '100%';
  const r = el('div', 'result perfect');
  r.append(el('div', 'n', '오늘 완료'));
  r.append(el('div', null, '단어 → 확인 문제 → 문장까지, 한 세트를 다 했습니다'));
  /* AI 선생님과 자유 대화(역할극)는 뺐다 (대표님 지시 2026-08-31). */
  b.append(r);
  afterSetBtns(b, d);                       // [다음 세트 ›][목록으로] (2026-09-27 밤)
  missionCard(b, d);
  show('quiz', '오늘 완료', true);
}

/* 세트를 끝낸 뒤의 두 단추 (대표님 물음 2026-09-27 밤 "어떤 화면이 나오게 할까?") — 저절로 다음 세트로 가지 않는다(숨 돌릴 틈·짜오 동 확인).
   [다음 세트 ›]는 같은 갈래의 다음 과를 바로 시작, [목록으로]는 학습 탭 단어 목록에서 그 갈래를 펼치고 다음 과로 굴려 둔다 */
function afterSetBtns(host, d) {
  const row = el('div', 'hact');
  const nx = nextAfter(d);
  if (nx) {
    const b1 = el('button', 'primary big', tr('다음 세트') + ' › ' + esc(nx.name));
    b1.onclick = () => { if (nx.gram) startGram(nx.gram[0], nx.gram[1]); else { SBOX = nx.box || 'srs'; if (nx.kind === '직무') JOBI = 0; startLearn(nx.d); } };
    row.append(b1);
  }
  const b2 = el('button', 'ghost big', tr('목록으로'));
  b2.onclick = () => {
    const t = S.lastTrack || 'life';
    ACTIVE_TAB = 'study'; NAV.length = 0;
    if (t === 'gram') { studyGramEntry(true); return; }
    WOPEN = t === 'life' ? 'days' : t === 'job' ? 'job' : t.slice(5);
    if (t.startsWith('gybm:')) gybmBuild(() => studyWordsEntry(true)); else studyWordsEntry(true);
  };
  row.append(b2);
  host.append(row);
}

/* 짝 미션 — 세트를 다 한 **뒤에** 나온다. 오늘 배운 것으로 실제로 말을 주고받는 자리다.
   효과크기가 이 앱에서 가장 큰 활동이다(짝 대화 g=1.09) — 그런데 지금까지
   23강에 써 놓고 **어디에도 그리지 않고 있었다.** 자료만 있고 화면이 없었다.

   두 사람 카드(a·b)는 **각자 자기 것만** 연다. 서로 보면 물어볼 것이 없어져
   '정보 차이'가 사라지고, 그러면 그냥 낭독이 된다 — 미션이 미션이 아니게 된다. */
function missionCard(host, d) {
  const m = d && d.mission;
  if (!m || !m.goal) return;
  /* 미션 글에서 **이렇게** 강조한 곳만 굵게 한다.
     먼저 통째로 escape 한 **뒤에** 바꾸므로, 글에 <나 &가 있어도 태그가 되지 않는다. */
  const bold = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const c = el('div', 'excard mission');
  c.append(el('h3', 'exhead', '🤝 ' + tr('짝과 함께')));
  c.append(el('div', 'msgoal', bold(m.goal)));
  if (m.how) c.append(el('div', 'gexp', bold(m.how)));
  if (m.a || m.b) {
    c.append(el('p', 'note', tr('자기 것만 여십시오 — 서로 보면 물어볼 것이 없어집니다.')));
    const row = el('div', 'msrow');
    [['A', m.a], ['B', m.b]].forEach(([who, txt]) => {
      if (!txt) return;
      const btn = el('button', 'msrole');
      btn.append(el('b', null, tr('나는 W').replace('W', who)), el('span', null, tr('눌러서 보기')));
      btn.onclick = () => {
        btn.textContent = '';
        btn.className = 'msrole open';
        btn.append(el('b', null, who), el('span', null, esc(txt)));
        btn.onclick = null;
      };
      row.append(btn);
    });
    c.append(row);
  }
  host.append(c);
}

/* ---------- 퀴즈 ---------- */
let Q = null;

/* 네 가지 힘을 각각 시험한다 — 무엇을 넣고(입력) 무엇을 내놓는가(출력)로 갈린다.
     듣기 = 소리 듣고 → 뜻 고르기        (귀로 알아듣는 힘)
     읽기 = 글자 보고 → 뜻 고르기        (눈으로 알아보는 힘)
     말하기 = 한국어 뜻 보고 → 입으로 말하기 (AI가 받아 적어 채점)
     쓰기 = 소리 듣고 → 자판으로 쓰기     (듣기와 철자를 한 번에)
   고르는 문제는 쉽고, 만들어 내는 문제는 어렵다. 어려운 쪽이 기억에 더 남는다.
   그래서 처음 만난 단어는 듣기·읽기부터, 익숙해질수록 말하기·쓰기가 많아진다. */
const SKILLS = [                                           // 말하기 갈래는 뺐다 (2026-10-06 대표님 "말하기 테스트는 빼자") — 복습 메뉴의 [말하기] 단추도 사라진다
  { k: 'listen', name: '듣기', how: '소리 듣고 뜻 고르기' },
  { k: 'read',   name: '읽기', how: '글자 보고 뜻 고르기' },
  { k: 'write',  name: '쓰기', how: '소리 듣고 자판으로 · 가끔 손으로 쓰기' },
];
/* 문제 유형을 고른다 — **네 가지가 처음부터 다 나온다** (대표님 지적, 2026-08-29).
   전에는 사다리 0단(처음 만난 단어)에서 '듣고 고르기'와 '읽고 고르기' 둘뿐이었다.
   그래서 실전 단어처럼 다 새 단어인 곳에서는 **말하기·쓰기가 아예 안 나왔다.**
   이제 0단에도 말하기·타이핑을 섞는다. 다만 처음에는 알아보기(듣기·읽기) 쪽이 두텁다 —
   한 번도 못 본 단어을 곧바로 쓰라고 하면 틀리는 것 말고 배우는 게 없다.
   손글씨는 1단부터 — 글자 모양을 한 번은 본 뒤라야 손이 따라간다. */
/* 짝 맞추기와 문장 퍼즐을 넣었다 (대표님 전달 2026-09-03 — 듀오링고를 써 본 분들 의견:
   "좌측 한글 뜻, 우측 베트남어를 다섯씩 놓고 짝 짓는 퀴즈. + 문장을 퍼즐 맞추듯이").
   고르기만 하면 눈이 익을 뿐이라 손이 안 움직인다 — 이 둘은 손으로 옮겨야 풀린다. */
function pickMode(w, lv) {
  const r = Math.random();
  // 문장은 알아듣기·말하기 위주, 그리고 **퍼즐**로 어순을 만져 본다
  // 2026-09-28: 뜻 듣고 말하기(say_ko)·뜻 듣고 고르기(listen_ko)·뜻 보고 고르기(read_ko)·성조 부호 고르기(tone)·따라 말하기(shadow)·뜻 듣고/문장 듣고 퍼즐 추가. 손글씨는 뺐다
  /* 말하기(say·shadow)는 문제에서 뺐다 (대표님 2026-10-06 "말하기 테스트는 빼자 — 기기가 잘 인식 못 한다. 단어 학습(카드)에서 말하기 연습만") */
  if (w.sent) return r < .30 ? 'listen' : r < .70 ? 'puzzle' : 'puzzle_vi';   // 뜻 듣고 배열(puzzle_ko)은 뺐다 — 듣는 것은 베트남어만 (2026-09-28)
  // 뜻 듣고 단어 고르기(listen_ko)는 뺐다 (대표님 지시 2026-09-28)
  // 뜻 듣고 말하기(say_ko)도 뺐다 (대표님 지시 2026-09-28)
  if (lv >= 2) return r < .24 ? 'type' : r < .44 ? 'listen' : r < .62 ? 'read' : r < .76 ? 'read_ko' : r < .90 ? 'tone' : 'match';
  if (lv >= 1) return r < .22 ? 'type' : r < .44 ? 'listen' : r < .64 ? 'read' : r < .78 ? 'read_ko' : r < .90 ? 'tone' : 'match';
  return r < .16 ? 'type' : r < .44 ? 'listen' : r < .68 ? 'read' : r < .82 ? 'read_ko' : r < .92 ? 'tone' : 'match';
}
/* 단어 → 속한 세트 색인. 오답 보기를 같은 세트에서 뽑기 위한 것 —
   엉뚱한 세트의 단어가 보기로 나오면 뜻만 슬쩍 봐도 답이 티가 난다. */
let CHAPIX = null;
function chapOf(vi) {
  if (!CHAPIX) { CHAPIX = {}; ALL.forEach(d => (d.words || []).forEach(w => { CHAPIX[w.vi] = d.day; })); }
  return CHAPIX[vi];
}
function buildQuestions(words, forced) {
  /* 오답 보기를 어디서 뽑나 — **지금 공부하는 묶음 안에서**.
     실전 단어를 앱 단어(1,080개)로 둘러싸면 문제가 쉬워진다: 시험 단어 하나에
     엉뚱한 주제의 보기 셋이 붙어 눈에 띄기 때문이다. 같은 회차 30개 안에서 뽑아야
     진짜로 헷갈린다. 실전 단어 화면에서만 그렇게 하고, 나머지는 그대로 둔다. */
  const pool = SBOX === 'ssrs' && SENIOR
    ? (words.length >= 4 ? words : seniorItems())
    : SBOX === 'bsrs' && GYBM
    ? (words.length >= 4 ? words : gybmAllWords())
    : allWords();
  // 오답 보기는 같은 종류에서 고른다 — 문장 문제에 단어 뜻을 섞으면
  // 길이만 보고 정답을 찍을 수 있어 문제가 문제 구실을 못 한다.
  const spool = [...allSents(), ...lessonSents(), ...Object.values(exSents())];
  return words.map(w => {
    const lv = (srsBox()[w.vi] || {}).lv || 0;   // 실전 단어는 제 창고(S.ssrs)를 봐야 한다
    let mode = forced === 'write' ? 'type'
             : Array.isArray(forced) ? forced[Math.floor(Math.random() * forced.length)]
             : forced || pickMode(w, lv);
    // 녹음이 없어도 **기기 목소리**가 있으면 듣기·자판 쓰기를 낸다.
    // 실전 단어 2,078개에는 녹음이 없다. 그것 때문에 문제 유형이 '읽기' 하나로
    // 쪼그라들면 기존 복습과 다른 물건이 된다(대표님 지시: 틀을 그대로 가져와라).
    if ((mode === 'listen' || mode === 'type' || mode === 'tone' || mode === 'shadow' || mode === 'puzzle_vi') && !AIDX[w.vi] && !viVoice()) mode = w.sent ? 'puzzle' : 'read';
    if ((mode === 'listen_ko' || mode === 'say_ko' || mode === 'puzzle_ko') && !('speechSynthesis' in window)) mode = mode === 'puzzle_ko' ? 'puzzle' : mode === 'say_ko' ? 'say' : 'read_ko';
    /* 문장은 자판으로 안 친다 (대표님 2026-10-06 "문장에서는 타이핑 빼야겠지") — 복습 메뉴 [쓰기]·받아쓰기·말하기로 문장이 걸리면 조각 배열로(소리가 있으면 절반은 듣고 조각) */
    if (w.sent && ['type', 'write_ko', 'dictation', 'say', 'shadow', 'say_ko', 'hand'].includes(mode)) mode = (AIDX[w.vi] || viVoice()) && Math.random() < .5 ? 'puzzle_vi' : 'puzzle';
    let src = w.sent ? spool : pool;
    if (src.length < 4) src = [...src, ...(w.sent ? pool : spool)];             // 모자라면 채운다
    const seen = new Set([w.vi]);
    /* 뜻이 같은 단어은 오답이 될 수 없다 — 그건 틀린 보기가 아니라 **또 하나의 정답**이다.
       실제로 Day 16 의 đau 와 ốm 이 둘 다 '아프다'였고, 둘이 한 문제에 나오면
       어느 쪽을 골라도 맞는 문항이 됐다(1,000문항을 만들어 세어 보니 판마다 0~2건).
       뜻풀이 자체도 갈라 적었지만(days.json), 앞으로 또 겹칠 수 있으니 여기서도 막는다.
       괄호 앞의 알맹이로 견준다 — '아프다 (병이 나다)' 와 '아프다' 는 같은 말이다. */
    const stem = s => String(s || '').split(/[,;(·]/)[0].trim();
    const mine = stem(w.ko);
    const okOpt = x => !seen.has(x.vi) && stem(x.ko) !== mine && seen.add(x.vi);
    // 같은 세트 이웃부터 — 주제가 같아야 헷갈리는 진짜 보기가 된다. 모자라면 전체에서 채운다.
    const home = w.sent ? undefined : chapOf(w.vi);
    const near = home === undefined ? []
      : src.filter(x => chapOf(x.vi) === home && okOpt(x))
           .sort(() => Math.random() - .5).slice(0, 3);
    const others = near.concat(
      src.filter(okOpt).sort(() => Math.random() - .5).slice(0, 3 - near.length));
    return { w, mode, opts: [w, ...others].sort(() => Math.random() - .5) };
  }).sort(() => Math.random() - .5);
}

/* 단어장에서 바로 복습 (대표님 지시 2026-09-03: "그 대상으로도 복습할 수 있도록").
   단어 글자만 갖고 있으므로 **뜻·예문이 붙은 원래 단어**을 찾아 문제로 만든다.
   섞어서 스무 개씩 낸다 — 늘 앞에서 스무 개면 뒤쪽 단어은 영영 안 나온다. */
function startWordbookQuiz(viList, name) {
  const all = allWords();
  const sen = typeof seniorItems === 'function' ? seniorItems() : [];
  const gy = GYBM ? gybmAllWords() : [];                 // 교재·선배·22기 단어도 (2026-10-02) — 채점은 제 창고(bsrs)로
  const src = [], boxOf = {};
  const seen = {};
  viList.forEach(vi => {
    if (seen[vi]) return;
    let w = all.find(x => x.vi === vi), box = 'srs';
    if (!w) { w = sen.find(x => x.vi === vi); box = 'ssrs'; }
    if (!w) { w = gy.find(x => x.vi === vi); box = 'bsrs'; }
    if (w) { seen[vi] = 1; src.push(w); boxOf[vi] = box; }
  });
  if (!src.length) { popup('복습할 단어을 못 찾았습니다.'); return; }
  src.sort(() => Math.random() - .5);
  startQuiz(src, null, qN(), false, { boxOf: vi => boxOf[vi] || 'srs' });
  show('quiz', name || '단어장 복습', true);
}

/* 문제 수 — 10·20·30 중 사용자가 고른다 (대표님 지시 2026-09-28 밤: "학습 후 30문제 너무 많다. 학습 후와 테스트 모두 같게, 고를 수 있게").
   S.qn 에 남아 학습 뒤 확인 문제·테스트가 같은 수를 쓴다. 처음엔 20 */
/* 2026-10-05 대표님 "테스트 갯수 20개 디폴트로 일단 선택되어라. 유저가 변동은 할 수 있음" — 고른 수를 저장하지 않는다.
   앱을 열 때마다 20 에서 시작하고, 바꾸면 그때(앱을 닫기 전까지)만 그 수. 전에 10 을 골라 둔 사람도 다시 20 부터 */
let QN = 20;
function qN() { return QN; }
function qnPicker(onPick) {
  const row = el('div', 'qnpick');
  row.append(el('span', 'qnlab', tr('문제 수')));
  [10, 20, 30].forEach(n => {
    const b = el('button', 'qnchip' + (qN() === n ? ' on' : ''), String(n));
    b.type = 'button';
    b.onclick = e => { e.stopPropagation(); QN = n; row.querySelectorAll('.qnchip').forEach(x => x.classList.toggle('on', x === b)); if (onPick) onPick(n); };
    row.append(b);
  });
  return row;
}
/* 세트 뒤 확인 문제 — 단어마다 **두 번** (대표님 지시 2026-09-27 밤): 먼저 알아보기(듣고 뜻·읽고 뜻·짝 맞추기) 한 바퀴, 다음 만들어 내기(타이핑·말하기) 한 바퀴.
   틀린 것은 그 판 끝에 또 나오므로 결국 단어마다 두 번은 맞혀야 끝난다. 손글씨는 뺐다. 말하기는 녹음이 되는 폰에서만. */
function buildSetQuestions(words) {
  /* 고른 문제 수(qN)에 맞춘다: 알아보기 한 바퀴를 먼저 채우고(단어가 더 많으면 그중 일부), 남는 수만큼 만들어 내기.
     15단어 세트에서 10 → 알아보기 10 · 20 → 알아보기 15 + 만들기 5 · 30 → 15 + 15 (2026-09-28 밤) */
  const N = qN(), mix = a => a.slice().sort(() => Math.random() - .5);
  const recW = words.length <= N ? words : mix(words).slice(0, N);
  const rec = buildQuestions(recW, ['listen', 'read', 'read_ko', 'match', 'tone', 'listen', 'read']);
  const k = Math.min(words.length, N - recW.length);
  const prod = k > 0 ? buildQuestions(mix(words).slice(0, k), ['type']) : [];   // 말하기는 뺐다 (2026-10-06) — 만들어 내기는 타이핑만
  return rec.concat(prod);
}
function startQuiz(words, day, cap, early, opt) {
  const o = opt || {};
  let src = words || dueWords().map(findItem).filter(Boolean);
  if (o.kind === 'word') src = src.filter(x => !x.sent);
  if (o.kind === 'sent') src = src.filter(x => x.sent);
  if (!src.length) { noItems(o); return; }
  if (!day) src = src.slice(0, Math.min(cap || qN(), qN()));   // 테스트·복습은 고른 문제 수(10·20·30)만큼
  const list = day ? buildSetQuestions(src) : buildQuestions(src, o.skill);
  Q = { list, i: 0, ok: 0, day, total: list.length, early, opt: o };
  sensesLoad();                                   // 답한 뒤 보기마다 뜻 3개를 붙이려면 미리 (2026-09-28 밤)
  drawQuiz();
  const nm = (o.kind === 'sent' ? '문장' : o.kind === 'word' ? '단어' : '') +
             (o.skill && typeof o.skill === 'string' && SKILLS.find(x => x.k === o.skill) ? ' ' + SKILLS.find(x => x.k === o.skill).name : '');
  show('quiz', day ? '확인 문제' : (nm.trim() || (cap ? '3분 복습' : '복습')), true);
}
function noItems(o) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  b.append(el('p', 'lede', (o && o.kind === 'sent' ? '문장' : '단어') + ' 복습이 아직 없습니다'));
  b.append(el('p', 'note', o && o.kind === 'sent'
    ? '하루 학습을 끝내면 그날 대화 문장이 복습 창고에 들어옵니다.'
    : '오늘은 꺼낼 단어가 없습니다. 없는 날은 정상입니다.'));
  const h = el('button', 'primary big', '홈으로');
  h.style.width = '100%'; h.onclick = renderHome;
  b.append(h);
  show('quiz', '복습', true);
}

/* 복습 고르기 — 단어냐 문장이냐, 그리고 네 가지 힘 중 무엇이냐 */

/* ── 방금 배운 것 ────────────────────────────────────────────────
   보통 복습은 **때가 되어야** 나온다(1·3·7·14·30·60일). 그래서 오늘 막 배운 것을
   지금 한 번 더 보고 싶어도 볼 수가 없었다. 이 문은 그 때를 무시하고
   **가장 마지막에 끝낸 세트**를 바로 꺼낸다. 성적은 그대로 쌓인다.
   하위 구성은 기존 복습과 똑같이 둔다 — 화면마다 다르면 헷갈린다. */
function freshDay() {
  const done = ALL.filter(d => typeof d.day === 'number' && S.done[d.day]);
  return done.length ? done[done.length - 1] : null;
}
function freshItems(kind) {
  const d = freshDay();
  if (!d) return [];
  const ws = (d.words || []).slice();
  // 그 세트의 문장 = 그날 대화 줄
  const ss = (d.dialog?.lines || []).map(l =>
    ({ vi: l.vi, ko: l.ko, kr_read: l.kr_read, tones: l.tones, sent: true }));
  return kind === 'sent' ? ss : kind === 'word' ? ws : [...ws, ...ss];
}

/* ---------- 자유 복습 ----------
   앱이 골라 주는 복습(간격 반복) 말고, **내가 고른 것만** 푸는 자리다 (대표님 지시, 2026-08-30).
   끝낸 레슨을 여러 개 체크하면 그 레슨의 단어만 모아 문제로 낸다.
   왜 끝낸 것만 보여 주나: 안 배운 것을 풀면 그건 시험이지 복습이 아니다. */
function freePickEntry() {
  const go = () => drawFreePick();
  if (COURSE) return go();
  fetch('data/order.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { COURSE = j; loadCWords(); go(); }).catch(() => { });
}

let FREE = null;                                  // 체크한 레슨 열쇠들
function freeUnits() {
  /* [열쇠, 이름, 단어들] — 끝낸 레슨만. */
  const out = [];
  lifeVols().forEach((v, vi) => v.chapters.forEach((c, ci) => c.lessons.forEach((l, li) => {
    const k = ckey(vi, ci, li);
    if (S.done[k]) out.push([k, (vi + 2) + '권 ' + (ci + 1) + '-' + (li + 1), l.words]);
  })));
  jobVols().forEach(jv => jv.tracks.forEach((t, ti) => t.chapters.forEach((c, ci) =>
    c.lessons.forEach((l, li) => {
      const k = 'J0.' + ti + '.' + ci + '.' + li;
      if (S.done[k]) out.push([k, t.track + ' ' + (ci + 1) + '-' + (li + 1), l.words]);
    }))));
  return out;
}

function drawFreePick() {
  const us = freeUnits();
  FREE = FREE || new Set();
  const b = $('#quizBody'); b.textContent = '';
  $('#quizFill').style.width = '0%';
  if (!us.length) {
    b.append(el('p', 'lede', tr('아직 끝낸 레슨이 없습니다. 학습에서 한 레슨을 끝내면 여기에 나옵니다.')));
    show('quiz', '자유 복습', true); return;
  }
  b.append(el('p', 'lede', tr('풀고 싶은 레슨을 고르세요') + ' — ' + us.length + tr('개 끝냄')));
  const list = el('div', 'freelist');
  us.forEach(([k, nm, ws]) => {
    const row = el('button', 'freerow' + (FREE.has(k) ? ' on' : ''));
    row.type = 'button';
    row.append(el('i', 'freebox', FREE.has(k) ? '☑' : '☐'),
               el('span', 'freenm', esc(nm)),
               el('span', 'freen', ws.length + tr('단어')));
    row.onclick = () => {
      FREE.has(k) ? FREE.delete(k) : FREE.add(k);
      drawFreePick();
    };
    list.append(row);
  });
  b.append(list);
  const picked = us.filter(([k]) => FREE.has(k));
  const n = picked.reduce((a, [, , ws]) => a + ws.length, 0);
  const all = el('button', 'bigmenu', tr('모두 고르기'));
  all.onclick = () => { us.forEach(([k]) => FREE.add(k)); drawFreePick(); };
  const none = el('button', 'bigmenu', tr('모두 풀기(해제)'));
  none.onclick = () => { FREE.clear(); drawFreePick(); };
  b.append(all, none);
  if (n) {
    const go = el('button', 'primary big');
    go.style.width = '100%'; go.style.marginTop = '14px';
    go.textContent = tr('고른 것 풀기') + ' (' + n + tr('단어') + ')';
    go.onclick = () => {
      const ws = picked.flatMap(([, , w]) => w);
      dive(drawFreePick);
      startQuiz(ws, null, null, false, { kind: 'word' });
    };
    b.append(go);
  }
  show('quiz', '자유 복습', true);
}

function freshMenu(kind) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  const d = freshDay();
  if (!d) {
    b.append(el('p', 'lede', '아직 끝낸 세트가 없습니다'));
    b.append(el('p', 'note', '하루 5분에서 한 세트를 끝내면 여기서 바로 다시 볼 수 있습니다.'));
    const h = el('button', 'primary big', '홈으로'); h.style.width = '100%'; h.onclick = renderHome;
    b.append(h);
    show('quiz', '최근 학습', true); return;
  }
  const src = freshItems(kind);
  b.append(el('p', 'lede', esc(label(d)) + ' · ' + esc(d.theme) + ' — ' +
    (kind === 'sent' ? '문장' : '단어') + ' ' + src.length + '개'));
  b.append(el('p', 'note', '복습 때가 아니어도 <b>언제든</b> 다시 볼 수 있습니다.'));
  const back = () => freshMenu(kind);
  const go = (opt, list) => { dive(back); startQuiz(list || src, null, null, false, opt); };
  const all = el('button', 'bigmenu', '랜덤');
  all.onclick = () => go({ kind });
  b.append(all);
  SKILLS.forEach(sk => {
    const btn = el('button', 'bigmenu', esc(sk.name));
    btn.onclick = () => go({ kind, skill: sk.k });
    b.append(btn);
  });
  const quick = el('button', 'bigmenu', '3분');
  quick.onclick = () => { dive(back); flashRun(src.slice(0, 20), '최근 학습 3분'); };
  b.append(quick);
  const mr = missRow(src.filter(x => (S.stats.miss || {})[x.vi] >= 2), back);
  if (mr) b.append(mr);
  const other = el('button', 'ghost', kind === 'sent' ? '단어로 보기' : '문장으로 보기');
  other.style.width = '100%'; other.style.marginTop = '10px';
  other.onclick = () => freshMenu(kind === 'sent' ? 'word' : 'sent');
  b.append(other);
  show('quiz', '최근 학습', true);
}

/* 기사 복습 (대표님 지시, 2026-08-30): "복습에 기사 복습만 따로 만들어주고
   (동일하게 읽기 듣기 쓰기 말하기 모두 가능하도록)".
   기사 단어은 간격 반복 창고에 넣지 않는다 — 스치는 자리라서다.
   그래서 **여기서만** 따로 모아 푼다. 일주일치 기사 단어이 대상이다. */
function newsWords() {
  return (NEWSD || []).flatMap(d => (d.words || []).map(w => ({ ...w, news: 1 })));
}
function newsReviewEntry() {
  const go = () => {
    const ws = newsWords();
    if (!ws.length) { popup(tr('아직 읽은 기사가 없습니다. 기사를 먼저 보세요.')); return; }
    const b = $('#quizBody'); b.textContent = '';
    $('#quizFill').style.width = '0%';
    b.append(el('p', 'lede', tr('기사 복습') + ' — ' + ws.length + tr('개')));
    const back = () => newsReviewEntry();
    const all = el('button', 'bigmenu', tr('랜덤'));
    all.onclick = () => { dive(back); startQuiz(ws.slice(), null, 20, false, {}); };
    b.append(all);
    SKILLS.forEach(sk => {
      const btn = el('button', 'bigmenu', esc(sk.name));
      btn.onclick = () => { dive(back); startQuiz(ws.slice(), null, 20, false, { skill: sk.k }); };
      b.append(btn);
    });
    show('quiz', '기사 복습', true);
  };
  if (NEWSD) return go();
  newsSets().then(go);
}

function reviewMenu(kind) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  /* 단어·문장을 가르지 않는다 (대표님 지시, 2026-08-30) —
     문장은 단어 밑의 예문으로 붙어 있으니 따로 나눌 까닭이 없다. */
  const due = dueWords().map(findItem).filter(Boolean)
    .filter(x => kind === 'all' ? true : kind === 'sent' ? x.sent : !x.sent);
  const nm = kind === 'all' ? '' : (kind === 'sent' ? '문장' : '단어') + ' ';
  b.append(el('p', 'lede', nm + tr('복습') + ' — ' + due.length + tr('개 대기')));
  const back = () => reviewMenu(kind);
  const all = el('button', 'bigmenu', '랜덤');
  all.onclick = () => { dive(back); startQuiz(null, null, null, false, { kind }); };
  b.append(all);
  SKILLS.forEach(sk => {
    const btn = el('button', 'bigmenu', esc(sk.name));
    btn.onclick = () => { dive(back); startQuiz(null, null, null, false, { kind, skill: sk.k }); };
    b.append(btn);
  });
  const quick = el('button', 'bigmenu', '3분');
  quick.onclick = () => { dive(back); flashRun(due.slice(0, 20), nm + ' 3분'); };
  b.append(quick);
  const mr = missRow(missWords(kind), back);
  if (mr) b.append(mr);
  show('quiz', nm + ' 복습', true);
}

/* 복습 입구 — 처음이거나 꺼낼 카드가 없으면 방식부터 설명한다.
   전에는 카드가 없으면 말없이 홈으로 돌아가서 버튼이 죽은 것처럼 보였다.
   설명은 홈의 [방식] 버튼으로 언제든 다시 볼 수 있다. */
function drawRevInfo(cap) {
  const due = dueWords().map(findItem).filter(Boolean);
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  const c = el('div', 'rulecard');
  c.append(el('div', 'rhead', '<span class="ri">🔁</span><b>복습은 이렇게 돌아갑니다</b>'));
  c.append(el('div', 'rbody',
    '학습에서 만난 단어는 전부 복습 창고에 들어갑니다. 문제를 <b>맞힐 때마다</b> 그 단어는 더 나중에 나옵니다 — ' +
    '<b>1일 → 3일 → 7일 → 14일 → 30일 → 60일</b>. 틀리면 두 계단 내려와 곧 다시 나옵니다.<br><br>' +
    '잊어버리기 <b>직전에</b> 꺼내 보는 것이 기억을 가장 오래 남깁니다(간격 반복 — 기억 연구에서 가장 근거가 단단한 방법입니다). ' +
    '그래서 복습할 카드가 <b>있는 날도, 없는 날도</b> 있습니다. 없는 날은 정상입니다.<br><br>' +
    '<b>[랜덤]</b>이 곧 공부법 책들이 말하는 그 복습입니다 — 간격 반복 + 직접 떠올리기 + 즉시 피드백. ' +
    '<b>[말하기·듣기·읽기·쓰기]</b>는 같은 단어를 한 가지 방식으로만 몰아서 볼 때, ' +
    '<b>[3분]</b>은 바쁜 날 훑고 지나갈 때 씁니다(자동 넘김이라 효과는 약합니다).'));
  b.append(c);

  const learned = Object.keys(S.srs).length;
  const st = el('p', 'note');
  if (due.length) st.innerHTML = `오늘 꺼낼 카드: <b>${due.length}장</b> · 창고에 ${learned}단어`;
  else if (learned) {
    const soon = Object.values(srsBox()).map(v => v.due).filter(d => d > now()).sort((x, y) => x - y)[0];
    st.innerHTML = `지금은 꺼낼 카드가 없습니다 (창고에 ${learned}단어).` +
      (soon ? ` 다음 카드는 <b>${Math.max(1, Math.round((soon - now()) / DAY))}일 뒤</b>에 나옵니다.` : '');
  } else st.textContent = '아직 배운 단어가 없습니다. 먼저 오늘 학습을 시작해 보세요.';
  b.append(st);

  const go = el('button', 'primary big');
  go.style.width = '100%';
  if (due.length) {
    go.textContent = '복습 시작 (' + due.length + '장)';
    go.onclick = () => { S.revSeen = 1; save(); startQuiz(due, null, cap); };
  } else if (learned) {
    // 예정보다 일찍 꺼내 보는 건 자유 — 단, 맞혀도 간격은 안 늘어난다 (미리 본 건 인출이 아니라서)
    go.textContent = '그래도 최근 단어 다시 보기';
    go.onclick = () => { S.revSeen = 1; save(); startQuiz(practiceWords(cap || 20), null, null, true); };
  } else {
    const nx = nextDay();
    go.textContent = '오늘 학습 시작';
    go.onclick = () => nx && startLearn(nx);
  }
  b.append(go);
  show('quiz', '복습', true);
}

/* 오답노트 — 두 번 이상 틀린 단어만 골라 다시 푼다.
   맞히면 miss 가 깎여 목록에서 스스로 사라진다(비우는 재미). 셋 미만이면 메뉴에 안 보인다. */
function missWords(kind) {
  return Object.entries(missBox()).filter(([, n]) => n >= 2)
    .sort((x, y) => y[1] - x[1]).map(([vi]) => findItem(vi)).filter(Boolean)
    .filter(x => kind === 'sent' ? x.sent : kind === 'word' ? !x.sent : true);
}
/* 명단은 하나다 — 단어·문장·최근 학습 어디서 맞혀도 같은 miss 가 깎여서 다 같이 지워진다 */
function missRow(list, back) {
  if (!list.length) return null;
  const mb = el('button', 'bigmenu', '📕 오답노트 (' + list.length + ')');
  mb.onclick = () => { dive(back); S.revSeen = 1; save();
                       startQuiz(list.slice(0, 20), null, null, true); };  // 예정 밖 — 간격은 안 늘린다
  return mb;
}

function drawQuiz() {
  const body = $('#quizBody');
  body.textContent = '';
  $('#quizFill').style.width = (Q.i / Q.list.length * 100) + '%';
  if (Q.i >= Q.list.length) return finishQuiz();

  const q = Q.list[Q.i];
  Q._answered = false;
  Q.t0 = Date.now();                                   // 이 문제를 언제 봤는지 (반응 속도)
  { const nx = Q.list[Q.i + 1]; prefetchSnd([q.w && q.w.vi, ...(q.opts || []).map(o => o && o.vi), nx && nx.w && nx.w.vi]); }   // 소리 미리 (2026-09-28 밤)
  const LABEL = { listen: '듣고 뜻을 고르세요', read: '뜻을 고르세요', say: '베트남어로 말해 보세요',
                  type: '듣고 자판으로 쳐 보세요', hand: '듣고 손으로 써 보세요', recall: '소리 내어 말해 보세요',
                  dict: '듣고 글자를 만들어 보세요',
                  match: '뜻과 단어를 짝지어 보세요', puzzle: '조각을 눌러 문장을 만들어 보세요',
                  read_ko: '뜻을 보고 단어를 고르세요', listen_ko: '뜻을 듣고 단어를 고르세요', say_ko: '뜻을 듣고 베트남어로 말해 보세요',
                  tone: '성조 부호가 맞는 것을 고르세요', shadow: '듣고 따라 말해 보세요', write_ko: '뜻을 보고 베트남어로 쳐 보세요',
                  puzzle_ko: '뜻을 듣고 조각으로 문장을 만들어 보세요', puzzle_vi: '문장을 듣고 조각으로 만들어 보세요',
                  pic_tf: '듣고 그림이 맞으면 맞다, 아니면 틀리다', pic4: '듣고 맞는 그림을 고르세요', dictation: '듣고 그대로 쳐 보세요',
                  cloze: '빈칸에 들어갈 단어를 고르세요', gpat: '이 문장에 쓰인 문법을 고르세요', gcloze: '빈칸에 들어갈 말을 고르세요 (문법)', tf: '문장과 뜻이 맞으면 맞다, 아니면 틀리다', err: '틀리게 적힌 단어를 누르세요', say_pic: '그림을 보고 베트남어로 말해 보세요' };
  /* 맨 윗줄: 몇 번째 문제 · [스킵] (대표님 지시 2026-09-30: "시간 없어서 찍고 넘어간 게 틀린 걸로 잡히면 기록이 망가진다").
     넘기면 어느 통계에도 들지 않고 창고 사다리도 안 움직인다 — 틀린 게 아니라 '아직 안 재 본' 것. 답한 뒤에는 단추가 사라진다 (skipQ) */
  const qc0 = el('div', 'qcount');
  qc0.append(el('span', null, (Q.i + 1) + ' / ' + Q.list.length));
  const sk = el('button', 'qskip', tr('스킵') + ' ›'); sk.type = 'button'; sk.onclick = skipQ; qc0.append(sk);
  body.append(qc0);
  { const lb = q.w && q.w.sent && q.mode === 'read_ko' ? '뜻을 보고 문장을 고르세요' : (LABEL[q.mode] || '');   // 시험지 문항(fx)은 지시문이 없다
    body.append(el('div', 'q', (Q.exam && q.sec ? q.sec + (lb ? ' · ' : '') : '') + lb)); }
  if (Q.exam) { q._okBefore = Q.ok; const pq = Q.i > 0 ? Q.list[Q.i - 1] : null; if (pq && pq._ok === undefined) pq._ok = Q.ok > (pq._okBefore || 0); }   // 시험 채점용

  if (q.mode === 'recall') return drawSay(body, q);   // 옛 이름 호환
  if (q.mode === 'say' || q.mode === 'say_ko' || q.mode === 'shadow' || q.mode === 'say_pic') return drawSay(body, q);
  if (q.mode === 'type' || q.mode === 'dictation' || q.mode === 'write_ko') return drawTypeQ(body, q);
  if (q.mode === 'pic_tf' || q.mode === 'pic4' || q.mode === 'cloze' || q.mode === 'gcloze' || q.mode === 'tf' || q.mode === 'err' || q.mode === 'gpat') return drawExamKind(body, q);
  if (q.mode === 'fx') return drawFixed(body, q);   // 1차 시험지 그대로 (2026-09-30)
  if (q.mode === 'hand') return drawHandQ(body, q);
  if (q.mode === 'dict') return drawDict(body, q);
  if (q.mode === 'match') return drawMatch(body, q);
  if (q.mode === 'tone') return drawToneQ(body, q);
  if (q.mode === 'puzzle' || q.mode === 'puzzle_ko' || q.mode === 'puzzle_vi') return drawPuzzle(body, q);

  /* 소리를 듣는 자리에는 **말하는 길**도 같이 둔다. 듣기만 하면 입이 안 열린다.
     시험 흐름을 흐트러뜨리지 않게, 누를 사람만 누르는 작은 마이크로 둔다.
     누르면 하루 5분 카드와 똑같이 발음·높낮이를 짚어 준다. */
  const sayBox = el('div', 'qsay');
  const addMic = () => {
    if (!canRecord()) return;
    const mic = iconBtn('mic', '따라 말하기', null);
    mic.onclick = () => toggleRec(q.w.vi, mic, sayBox);
    return mic;
  };
  const koQ = q.mode === 'read_ko' || q.mode === 'listen_ko';          // 뜻이 물음, 보기는 베트남어
  if (q.mode === 'listen' || q.mode === 'listen_ko') {   // 귀로만 — 글자는 답한 뒤에 보여준다
    const wrap = el('div', 'qplay');
    const b = el('button', 'primary big', koQ ? '뜻 듣기' : '듣기');
    b.onclick = () => koQ ? speakKo(koShow(q.w.ko)) : sound(q.w.vi);
    wrap.append(b);
    if (!koQ) { const m = addMic(); if (m) wrap.append(m); }
    if (!koQ) sentPeek(wrap, q.w.vi);                       // 주간 시험 듣기 — 문장 보기 (2026-10-06)
    body.append(wrap, sayBox);
    koQ ? setTimeout(() => speakKo(koShow(q.w.ko)), 150) : (sound(q.w.vi), AS_PEND = { vi: q.w.vi, t: Date.now() });   // 첫 문제도 화면 바뀜에 안 끊기게 (2026-10-05)
  } else {                             // 눈으로 — 글자(또는 뜻)를 보여주고 고른다
    const main = el('button', 'qmain qtap' + (q.w.sent ? ' sent' : ''), esc(koQ ? koShow(q.w.ko) : q.w.vi));
    main.type = 'button';
    if (!koQ) main.onclick = () => sound(q.w.vi);   // 뜻 물음에서는 아무 소리도 안 낸다 (한국어 읽어 주기 없음)
    if (!koQ) autoSay(q.w.vi);                       // 베트남어가 보이는 문제는 뜰 때 소리 (2026-10-02). 뜻 보고 베트남어 고르기는 답한 뒤에만
    const qc = el('div', 'qcard');                   // 물음 카드 (캔버스 시안 2026-09-27)
    qc.append(body.querySelector('.q'), main);
    body.append(qc);
    body.append(sayBox);                 // 읽고 뜻 고르기에는 듣기·말하기 단추를 두지 않는다 — 단어를 누르면 소리가 난다 (대표님 지시 2026-09-28)
  }

  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const b = el('button', null, esc(koQ ? o.vi : koShow(o.ko)));      // 보기는 '뜻'(뜻 물음이면 베트남어) — 무엇을 묻는지가 분명해진다
    b.dataset.vi = o.vi;
    b.onclick = () => answer(b, o.vi === q.w.vi, q.w);
    opts.append(b);
  });
  body.append(opts);
}

/* 오답 뒤에는 스스로 넘긴다 — 틀린 걸 볼 시간이 필요하다. 정답은 자동으로 넘어간다. */
function nextBtn(box, fn) {
  hideSkip();                                        // 답이 났으니 '넘기기'는 치운다
  if (typeof Q !== 'undefined' && Q && Q.blind && CURV === 'quiz') { setTimeout(fn, 0); return; }   // 실제 시험처럼 — 맞았는지 안 보여 주고 바로 다음 문제 (2026-09-30)
  { const qw = Q && Q.list && Q.list[Q.i] && Q.list[Q.i].w;   // 문법 과 예문을 틀렸으면 그 과로 가는 단추 (2026-10-02, 문장·문법 테스트 합침)
    if (qw && qw.gni != null && Q._lastOk === false && GRAM && GRAM.books[qw.gbi] && GRAM.books[qw.gbi].bai[qw.gni]) {
      const x = GRAM.books[qw.gbi].bai[qw.gni], Qs = Q, tt = $('#title').textContent;
      const g = el('button', 'ghost', tr('문법 카드') + ' · ' + esc(String(x.t).split(' — ')[0]) + ' ›');
      g.type = 'button'; g.style.width = '100%'; g.style.marginTop = '14px';
      g.onclick = () => { dive(() => { Q = Qs; Q.i++; drawQuiz(); show('quiz', tt, true); }); startGram(qw.gbi, qw.gni); };
      box.append(g);
    } }
  const b = el('button', 'primary big', '다음 ›');
  b.style.width = '100%'; b.style.marginTop = '14px';
  b.onclick = fn;
  box.append(b);
}


/* ── 짝 맞추기 ──
   왼쪽에 뜻 다섯, 오른쪽에 베트남어 다섯. 하나 고르고 짝을 누르면 맞춰진다.
   다섯을 다 맞춰야 넘어간다. 한 문제로 다섯 단어을 만지니 복습이 빨리 돈다. */
function drawMatch(body, q) {
  // 같은 판의 다른 단어을 짝으로 쓴다 — 같은 세트라 진짜로 헷갈린다
  const seen = new Set([q.w.vi]);
  const mates = [];
  Q.list.forEach(x => {
    if (mates.length >= 4 || !x.w || seen.has(x.w.vi) || !x.w.ko) return;
    if (x.w.sent) return;                       // 문장은 칸이 넘쳐 짝 맞추기에 안 맞는다
    seen.add(x.w.vi); mates.push(x.w);
  });
  if (mates.length < 3) {                       // 그래도 모자라면 보기에서 채운다
    (q.opts || []).forEach(o => {
      if (mates.length >= 4 || seen.has(o.vi) || !o.ko) return;
      seen.add(o.vi); mates.push(o);
    });
  }
  if (mates.length < 3) {                       // 짝을 못 채우면 평범한 고르기로 되돌린다
    q.mode = 'read'; return drawQuiz();
  }
  const pairs = [q.w, ...mates].slice(0, 5);
  const lefts = [...pairs].sort(() => Math.random() - .5);
  const rights = [...pairs].sort(() => Math.random() - .5);

  const grid = el('div', 'match');
  const colL = el('div', 'matchcol'), colR = el('div', 'matchcol');
  grid.append(colL, colR);
  const note = el('div', 'matchdone');
  let sel = null, left = pairs.length, wrong = 0, firstTry = {};

  const btnOf = (w, side) => {
    const b = el('button', 'matchbtn', esc(side === 'L' ? koShow(w.ko) : w.vi));
    b.type = 'button';
    b.dataset.vi = w.vi; b.dataset.side = side;
    b.onclick = () => {
      if (b.dataset.s === 'ok') return;
      if (side === 'R') sound(w.vi);            // 오른쪽을 누르면 소리도 들린다
      if (!sel) { sel = b; b.dataset.s = 'sel'; return; }
      if (sel === b) { sel = null; b.dataset.s = ''; return; }
      if (sel.dataset.side === side) {          // 같은 쪽을 또 누르면 고른 것만 옮긴다
        sel.dataset.s = ''; sel = b; b.dataset.s = 'sel'; return;
      }
      const ok = sel.dataset.vi === b.dataset.vi;
      const vi = ok ? b.dataset.vi : null;
      if (ok) {
        sel.dataset.s = b.dataset.s = 'ok';
        left--;
        if (firstTry[vi] === undefined) firstTry[vi] = true;
        grade(vi, firstTry[vi] !== false, Q.early);
        fxTone(true);
        sel = null;
        if (!left) done();
      } else {
        firstTry[sel.dataset.vi] = false; firstTry[b.dataset.vi] = false;
        wrong++;
        const a = sel; a.dataset.s = 'no'; b.dataset.s = 'no';
        fxTone(false);
        setTimeout(() => { if (a.dataset.s === 'no') a.dataset.s = ''; 
                           if (b.dataset.s === 'no') b.dataset.s = ''; }, 380);
        sel = null;
      }
    };
    return b;
  };
  lefts.forEach(w => colL.append(btnOf(w, 'L')));
  rights.forEach(w => colR.append(btnOf(w, 'R')));

  function done() {
    const clean = pairs.filter(w => firstTry[w.vi] !== false).length;
    markSpeed(clean === pairs.length, 'match');
    S.stats.readAll = (S.stats.readAll || 0) + pairs.length;
    S.stats.readOk = (S.stats.readOk || 0) + clean;
    if (firstTry[q.w.vi] !== false) Q.ok++; else requeue(Q.list[Q.i]);
    note.textContent = tr('N개 중 M개를 한 번에 맞혔어요')
      .replace('N', pairs.length).replace('M', clean);
    save();
    nextBtn($('#quizBody'), () => { Q.i++; drawQuiz(); });
  }
  body.append(grid, note);
}

/* ── 문장 퍼즐 ──
   조각을 눌러 문장을 만든다. 어순은 설명으로 안 붙는다 — 손으로 놓아 봐야 붙는다. */
/* 뜻 글에서 베트남어 낱말을 뺀다 — 문제로 보일 때 힌트가 되지 않게 (대표님 2026-09-30: "cô giáo 뜻이 '선생님 (여자) cô 라고도' 면 퀴즈 힌트").
   괄호 안에 로마자가 있으면 괄호째, 맨몸 로마자 낱말은 뒤의 '라고도'와 함께 뺀다. 카드·결과 화면은 그대로(배울 때는 봐야 하니까). 다 빠지면 원래 글 */
/* 교재·시험에 나오는 사람 이름 → 한글 (2026-10-06 오류 보고 "오늘 를 만났어요 — 누구를 만났는지 왜 표시 안 하니": koShow 가 로마자를 모두 지워 이름이 사라졌다) */
const NAME_KO = { 'David': '데이비드', 'Brian': '브라이언', 'Eun Ji': '은지', 'EunJi': '은지', 'Hiroki': '히로키', 'Kate': '케이트', 'Vân': '번', 'Loan': '로안', 'Dorothy': '도로시', 'Dũng': '중', 'Min': '민', 'Lệ': '레', 'Mây': '머이', 'Tư': '뜨', 'Hoa': '호아', 'Hà': '하', 'Mai': '마이', 'Yumiko': '유미코', 'Linda': '린다', 'James': '제임스', 'Tom': '톰', 'Hiroko': '히로코', 'So Jeong': '소정', 'Emily': '에밀리', 'Jack': '잭', 'Lee': '이', 'FAHASA': '파하사', 'Hiroshi': '히로시', 'John': '존', 'Jenny': '제니', 'Anna': '안나', 'Peter': '피터', 'Lan': '란', 'Nam': '남', 'Hùng': '훙', 'Thu': '투', 'Long': '롱', 'Kim': '김', 'Park': '박', 'Seoul': '서울', 'Hà Nội': '하노이', 'Đà Nẵng': '다낭', 'Huế': '후에', 'Sài Gòn': '사이공' };
const koNames = t => String(t).replace(/[A-ZÀ-Ỹ][A-Za-zÀ-ỹđ]*(?:\s[A-ZÀ-Ỹ][A-Za-zÀ-ỹđ]*)?/g, m => NAME_KO[m] || (NAME_KO[m.split(' ')[0]] ? NAME_KO[m.split(' ')[0]] + m.slice(m.split(' ')[0].length) : m));
function koShow(ko) {
  let s = String(ko || '');
  if (!/[A-Za-zÀ-ỹđĐ]/.test(s)) return s;
  s = koNames(s);                                              // 아는 이름은 한글로
  s = s.replace(/\([^()]*[A-Za-zÀ-ỹđĐ][^()]*\)/g, '');
  /* 모르는 이름이라도 뒤에 한글(조사·'입니다')이 바로 붙은 로마자 덩어리(Eun Ji를·David입니다)는 이름이라 남긴다 — 영어 뜻풀이는 그렇게 붙지 않는다 */
  const keep = []; s = s.replace(/[A-ZÀ-Ỹ][A-Za-zÀ-ỹđĐ'’.-]*(?:\s[A-ZÀ-Ỹ][A-Za-zÀ-ỹđĐ'’.-]*)*(?=[가-힣])/g, m => { keep.push(m); return '\u0001' + (keep.length - 1) + '\u0001'; });
  s = s.replace(/[A-Za-zÀ-ỹđĐ][A-Za-zÀ-ỹđĐ'’.-]*(\s+[A-Za-zÀ-ỹđĐ][A-Za-zÀ-ỹđĐ'’.-]*)*\s*(이?라고도|이?라고|=)?/g, '');
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => keep[+i]);
  s = s.replace(/\(\s*\)/g, '').replace(/\s*([·,;/])\s*(?=[·,;/])/g, '').replace(/^\s*[·,;/=]+\s*|\s*[·,;/=]+\s*$/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,;)])/g, '$1').trim();
  return s || String(ko || '');
}
/* 퍼즐 조각의 대문자 — 문장 첫 낱말이 대문자면 "이게 첫 조각"이라고 알려 주는 셈이라(대표님 2026-09-30) 소문자로 보인다.
   이름·지명은 그대로: 다른 문장 가운데에서 대문자로 나온 낱말(anh Nam · Hà Nội) 목록(properSet)에 있거나, 바로 뒤 낱말도 대문자(Hà Nội)면 고유명사로 본다 */
const isCap = x => { const c = String(x || '')[0] || ''; return c !== c.toLowerCase() && c === c.toUpperCase(); };   // 첫 글자가 대문자 (À-Ỹ 범위 검사는 소문자 à·đ·ơ 도 걸려서 틀렸다)
let PROPER = null;
function properSet() {
  if (PROPER) return PROPER;
  /* 문장 가운데서 대문자로 나온 횟수(capMid) 가 소문자로 나온 횟수(low) 이상이어야 고유명사 — 'Tôi' 는 "B: Tôi…" 처럼 가운데 대문자로도 나오지만
     소문자 tôi 가 훨씬 많아 빠지고, 'Nam' 은 anh Nam·Việt Nam 이 소문자 nam(남쪽) 보다 많아 남는다 */
  const capMid = {}, low = {};
  const add = v => { const t = String(v || '').split(/\s+/); t.forEach((x, i) => {
    const k = x.replace(/[.,;:?!]+$/, ''); if (!k) return;
    if (isCap(k)) { if (i > 0 && !/[.?!:]$/.test(t[i - 1])) capMid[k] = (capMid[k] || 0) + 1; }
    else low[k] = (low[k] || 0) + 1;
  }); };
  const each = w => { if (!w) return; if (w.ex && w.ex.vi) add(w.ex.vi); if (w.sent && w.vi) add(w.vi); (w.fex || []).forEach(e => e && e.vi && add(e.vi)); };
  /* 자료가 아직 안 온 화면(테스트 탭에서 바로 시험)에서는 CWORDS 가 없다 — 없는 자료는 건너뛴다 (2026-09-30 밤 대표님 "조각이 안 보인다": 여기서 멈춰 퍼즐 조각이 안 그려졌다) */
  try {
    (typeof ALL !== 'undefined' && ALL || []).forEach(d => (d.words || []).forEach(each));
    (typeof CWORDS !== 'undefined' && CWORDS || []).forEach(each);
    (GYBM || []).forEach(g => (g.lessons || []).forEach(l => (l.words || []).forEach(each)));
    if (DAILY22) (DAILY22.tests || []).forEach(t => (t.sents || []).forEach(x => add(x.vi)));
    if (GRAM && GRAM.books) GRAM.books.forEach(bk => (bk.bai || []).forEach(c => (c.g || []).forEach(g => (g.ex || []).forEach(e => e && e.vi && add(e.vi)))));
  } catch (e) { console.warn('properSet', e); }
  PROPER = new Set(Object.keys(capMid).filter(k => capMid[k] >= (low[k[0].toLowerCase() + k.slice(1)] || 0)));
  return PROPER;
}
function tileText(want, i) {
  const x = want[i];
  try { properSet(); } catch (e) { return x; }
  if (!isCap(x)) return x;
  const first = i === 0 || /[.?!]$/.test(want[i - 1]);
  if (!first) return x;
  if (properSet().has(x.replace(/[.,;:?!]+$/, ''))) return x;
  if (want[i + 1] && isCap(want[i + 1])) return x;
  return x[0].toLowerCase() + x.slice(1);
}
function drawPuzzle(body, q) {
  const w = q.w, md = q.mode;
  if (w.ask) {                                              // 대답 만들기 — 물음을 보여 주고(누르면 소리) 그 대답을 조각으로 (2026-10-06)
    const bx = el('div', 'wex'); bx.append(tapLine(w.ask, 'wexvi tapline')); if (w.askKo) bx.append(el('div', 'wexko', esc(koShow(w.askKo)))); body.append(bx);
    autoSay(w.ask);
  }
  if (md === 'puzzle') body.append(el('div', 'puzzhint', (w.ask ? tr('대답') + ': ' : '') + esc(koShow(w.ko))));      // 뜻은 보여준다 — 어순을 묻는 문제니까
  const row0 = el('div', 'qplay');
  if (md === 'puzzle_ko') { const kb = el('button', 'primary big', '🔊 뜻 듣기'); kb.onclick = () => speakKo(koShow(w.ko)); row0.append(kb); setTimeout(() => speakKo(koShow(w.ko)), 150); }   // 뜻을 듣고 만든다 (2026-09-28)
  else if (md === 'puzzle_vi') { const pb = el('button', 'primary big', '🔊 듣기'); pb.onclick = () => play(w.vi, false); row0.append(pb); if (md === 'puzzle_vi') setTimeout(() => play(w.vi, false), 150); }   // 문장을 듣고 만든다
  body.append(row0);

  /* 마침표\u00b7물음표는 조각에서 뗀다 — 'gỗ.' 처럼 붙어 있으면
     그 조각이 맨 끝이라는 게 티가 나서 문제가 헐거워진다. */
  const tail = (String(w.vi).trim().match(/[.?!]+$/) || [''])[0];
  const want = String(w.vi).trim().replace(/[.?!]+$/, '').split(/\s+/);
  if (want.length < 3) { q.mode = 'listen'; return drawQuiz(); }   // 조각이 둘이면 퍼즐이 아니다
  /* 시험지가 조각을 정해 준 문제(1차 시험지 'anh John'·'sinh viên' 처럼 여러 낱말이 한 조각)는 그 조각 그대로 (2026-09-30) */
  const tiles = (w.tiles && w.tiles.length ? w.tiles.slice() : want.map((x, i) => tileText(want, i))).sort(() => Math.random() - .5);   // 시험지 조각은 대소문자도 시험지 그대로   // 첫 낱말 대문자는 소문자로 (고유명사 빼고)

  const ans = el('div', 'puzzans');
  const pool = el('div', 'puzztiles');
  const picked = [];
  const redraw = () => {
    ans.textContent = '';
    if (!picked.length) { ans.append(el('span', 'puzzhint', tr('아래 조각을 눌러 보세요'))); return; }
    picked.forEach((it, i) => {
      const t = el('button', 'puzzpick', esc(it.word));
      t.onclick = () => { if (ans.dataset.r) return;
        picked.splice(i, 1); it.node.disabled = false; redraw(); };
      ans.append(t);
    });
  };
  tiles.forEach(word => {
    const t = el('button', 'puzztile', esc(word));
    t.onclick = () => { if (ans.dataset.r) return;
      t.disabled = true; picked.push({ word, node: t }); redraw(); };
    pool.append(t);
  });
  redraw();

  const chk = el('button', 'primary big', tr('확인'));
  chk.style.width = '100%'; chk.style.marginTop = '12px';
  chk.onclick = () => {
    if (!picked.length || ans.dataset.r) return;
    const mine = picked.map(x => x.word).join(' ');
    const good = mine.toLowerCase().replace(/\s+/g, ' ') === want.join(' ').toLowerCase();
    if (good && tail) ans.dataset.tail = tail;
    markSpeed(good, 'puzzle'); sound(w.vi);
    fxTone(good);
    ans.dataset.r = good ? 'ok' : 'no';
    chk.disabled = true;
    [...pool.children].forEach(t => t.disabled = true);
    if (good) Q.ok++; else requeue(Q.list[Q.i]);
    if (!w.nograde) grade(w.vi, good, Q.early);
    if (!good) ans.after(el('div', 'puzzright', '→ ' + esc(w.vi)));   // 바른 문장은 내 답 줄 바로 밑에 한 줄로 (아래 따로 상자 없이, 2026-09-28 밤)
    save();
    nextBtn($('#quizBody'), () => { Q.i++; drawQuiz(); });
  };
  body.append(ans, pool, chk);
}

/* 받아쓰기 — 소리를 듣고 음절 조각으로 그대로 만든다.
   조각에 '같은 글자, 다른 성조' 미끼를 섞어서 성조까지 들어야 풀리게 한다.
   보고 베끼기는 인출이 없어 효과가 약하다 — 소리→철자 인출이라야 남는다. */
function drawDict(body, q) {
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => sound(q.w.vi);
  wrap.append(b);
  body.append(wrap);
  sound(q.w.vi);
  body.append(el('div', 'q mid', esc(koShow(q.w.ko))));   // 뜻은 보여준다 — 철자와 성조를 시험하는 것이니까

  const syls = q.w.vi.split(' ');
  const MKS = ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323'];
  const pool = [];
  syls.forEach(sy => {
    pool.push(sy);
    const bare = stripTone(sy), pos = tonePos(bare);
    MKS.map(m => withMark(bare, m, pos))
      .filter(v => v !== sy && !syls.includes(v))
      .sort(() => Math.random() - .5).slice(0, 2)
      .forEach(v => pool.push(v));
  });
  pool.sort(() => Math.random() - .5);

  const picked = [], used = [];
  const ans = el('div', 'dictans');
  const draw = () => { ans.textContent = picked.length ? picked.join(' ') : '· · ·'; };
  draw();
  const tiles = el('div', 'dicttiles');
  pool.forEach(sy => {
    const t = el('button', 'tile', esc(sy));
    t.onclick = () => { t.disabled = true; picked.push(sy); used.push(t); draw(); };
    tiles.append(t);
  });
  const undo = el('button', 'ghost', '⌫ 지우기');
  undo.onclick = () => { if (!picked.length) return; picked.pop(); used.pop().disabled = false; draw(); };
  const chk = el('button', 'primary', '확인');
  chk.onclick = () => {
    if (!picked.length) return;
    const good = picked.join(' ').toLowerCase() === q.w.vi.toLowerCase();
    markSpeed(good, 'dict'); sound(q.w.vi);
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    const toneOnly2 = !good && bare(picked.join(' ')) === bare(q.w.vi);
    if (!good) bump('serr', toneOnly2 ? '성조만 틀림' : '글자를 틀림', false);
    if (!good) noteLetters(q.w.vi, picked.join(' '), 'ltrw');
    if (toneOnly2) ans.append(el('div', 'tonemiss', tr('성조만 틀렸어요 — 글자는 맞았습니다')));
    fxTone(good);
    chk.disabled = undo.disabled = true;
    [...tiles.children].forEach(t => t.disabled = true);
    ans.dataset.r = good ? 'ok' : 'no';
    if (!good) ans.textContent = picked.join(' ') + '  →  ' + q.w.vi;
    if (good) Q.ok++; else requeue(Q.list[Q.i]);
    grade(q.w.vi, good, Q.early);
    /* 맞아도 **저절로 넘어가지 않는다** (대표님 지시 2026-08-31).
       맞은 답을 눈으로 확인할 틈도 없이 화면이 바뀌면 무엇을 맞혔는지 남지 않는다. */
    nextBtn(body, () => { Q.i++; drawQuiz(); });
  };
  const row = el('div', 'qplay'); row.append(undo, chk);
  body.append(ans, tiles, row);
}

/* 입으로 — 듣고 따라 말하고, 원어민 높낮이와 겹쳐 본다 (복습 안에서) */
/* 말하기 — 한국어 뜻만 보고 베트남어로 말한다(가장 어렵고 가장 남는 방식).
   보기도 글자도 주지 않는다: 단서 없이 꺼내야 진짜 기억이 된다. */
/* ── 주간 시험 (대표님 지시 2026-09-28: 실제 반 시험 구조를 따른 모의시험) ──
   실제 시험(90분, 말하기 별도): A 듣기 40(그림 맞다/틀리다 5·그림 고르기 5·답 고르기 10·짧은 답 10) · B 읽기 30(빈칸 5·읽고 답 5·맞다/틀리다 10·알맞은 문장 10)
   · C 쓰기(배열 5·틀린 곳 5·한 주제 10문장) · D 말하기(발음·그림 보고·상황 읽고). 앱에서는 같은 짜임을 43문항으로 줄이고 자동 채점이 되는 것만 넣는다.
   재료 = 지난 7일에 끝낸 세트의 단어(없으면 배운 단어 전부, 그것도 없으면 첫 60단어)와 그 예문. 틀려도 다시 안 내고 부분별 점수를 낸다. */
function weeklyMaterial() {
  const cut = now() - 7 * DAY, words = [], seen = new Set();
  const put = w => { if (w && w.vi && !w.sent && !seen.has(w.vi)) { seen.add(w.vi); words.push(w); } };
  ALL.forEach(d => { if (typeof d.day === 'number' && typeof S.done[d.day] === 'number' && S.done[d.day] >= cut) (d.words || []).forEach(put); });
  if (GYBM) GYBM.forEach(src => src.lessons.forEach((l, li) => { const t = bdone()[gybmKey(src.key, li)]; if (typeof t === 'number' && t >= cut) l.words.forEach(put); }));
  if (words.length < 12) ['srs', 'ssrs', 'bsrs'].forEach(k => Object.keys(S[k] || {}).forEach(v => put(findItem(v))));
  if (words.length < 12) allWords().slice(0, 60).forEach(put);
  return words;
}
/* 회차 — 실제 반 시험 범위대로 (대표님 지시 2026-09-28). 1회차 = 메인 교재 1권 1~3과, 말하기는 발음만. 다음 회차는 대표님이 범위를 알려 주면 여기에 더한다 */
let WEEKLY_ROUNDS = [
  { no: 1, name: '1회차', desc: '메인 교재 1권 1~3과', chapters: [0, 1, 2], speak: 'pron', topic: '자기소개 (이름·나라·하는 일·배우는 것)' },
];
fetch('data/weekly.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { if (j && j.rounds && j.rounds.length) WEEKLY_ROUNDS = j.rounds; }).catch(() => { });   // 회차는 자료 파일에서 (2026-09-28)
/* ── 내 시험 성적 · 성장 곡선 (대표님 지시 2026-09-29: "성적 곡선은 현재 주간 시험 성적들로 하자") ──
   실제 반 시험 점수를 회차마다 적는다(총점 100 = 듣기 30 · 읽기 30 · 쓰기 20 · 말하기 20 — 1회 시험지 짜임).
   그래프: 실제 시험 총점(실선) + 앱 안 모의시험 맞힌 비율(점선, 같은 회차의 마지막 결과) — 둘 다 100점 기준이라 축 하나.
   색은 --chart1/--chart2(dataviz 색 검사 통과), 모의시험은 점선으로도 가린다(색만으로 가리지 않게). 아래에 표.
   S.score = [{r 회차, d 날짜, t 총점, p [듣기,읽기,쓰기,말하기] | null, at}] — 진도와 같이 서버에 올린다(PROGKEYS). */
const SCORE_PARTS = [['듣기', 30], ['읽기', 30], ['쓰기', 20], ['말하기', 20]];
const scoreList = () => (S.score || []).filter(x => !x.del).sort((a, b) => a.r - b.r || String(a.d).localeCompare(String(b.d)));
function scoreCard(host) {
  const card = el('div', 'scorecard');
  const head = el('div', 'schead');
  head.append(el('b', null, tr('내 시험 성적')));
  const add = el('button', 'ghost sm', tr('+ 점수 적기')); add.type = 'button';
  add.onclick = () => { dive(weeklyEntry); scoreForm(); };
  head.append(add);
  card.append(head);
  const L = scoreList();
  // 앱 모의시험 — 회차마다 마지막 결과를 100점으로 바꿔 (맞힌 수 / 문항 수)
  const mock = {};
  (S.stats.wexam || []).forEach(x => { if (x.tot) mock[x.round || 1] = Math.round(x.ok / x.tot * 1000) / 10; });
  const rounds = [...new Set([...L.map(x => x.r), ...Object.keys(mock).map(Number)])].sort((a, b) => a - b);
  if (!rounds.length) {
    card.append(el('p', 'note', tr('반 시험 점수를 적으면 회차마다 곡선으로 보여 줍니다. 앱의 모의시험 점수도 같이 그립니다.')));
    host.append(card); return;
  }
  const W = 320, H = 170, pl = 30, pr = 34, pt = 14, pb = 26;
  const X = i => rounds.length === 1 ? (pl + (W - pr)) / 2 : pl + i * (W - pl - pr) / (rounds.length - 1);
  const Y = v => pt + (100 - v) * (H - pt - pb) / 100;
  let svg = `<svg class="scorechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tr('회차별 시험 점수'))}">`;
  [0, 25, 50, 75, 100].forEach(v => {
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="scgrid${v % 50 ? ' faint' : ''}"/>`;
    if (v % 50 === 0) svg += `<text x="${pl - 6}" y="${Y(v) + 4}" class="scaxis" text-anchor="end">${v}</text>`;
  });
  rounds.forEach((r, i) => { svg += `<text x="${X(i)}" y="${H - 8}" class="scaxis" text-anchor="middle">${r}${esc(tr('회'))}</text>`; });
  const line = (pts, cls) => pts.length > 1 ? `<polyline class="${cls}" points="${pts.map(p => p.join(',')).join(' ')}"/>` : '';
  const realPts = [], mockPts = [];
  rounds.forEach((r, i) => {
    const e = L.filter(x => x.r === r).slice(-1)[0];
    if (e) realPts.push([X(i), Y(e.t), e]);
    if (mock[r] != null) mockPts.push([X(i), Y(mock[r]), mock[r]]);
  });
  svg += line(mockPts.map(p => [p[0], p[1]]), 'scmock');
  svg += line(realPts.map(p => [p[0], p[1]]), 'screal');
  mockPts.forEach(p => { svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="scdot mock"><title>${esc(tr('앱 모의시험'))} ${p[2]}</title></circle>`; });
  realPts.forEach(p => { svg += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" class="scdot real"><title>${esc(tr('실제 시험'))} ${p[2].r}${esc(tr('회'))} ${p[2].t}</title></circle>`; });
  const last = realPts[realPts.length - 1];
  if (last) svg += `<text x="${last[0] + 7}" y="${last[1] + 4}" class="sclabel">${last[2].t}</text>`;   // 마지막 실제 점수만 바로 적는다 — 나머지는 아래 표
  svg += '</svg>';
  const legend = el('div', 'sclegend',
    `<span><i class="lg real"></i>${esc(tr('실제 시험'))}</span><span><i class="lg mock"></i>${esc(tr('앱 모의시험'))}</span>`);
  card.append(legend, el('div', 'scwrap', svg));
  if (L.length) {
    const tbl = el('div', 'sctable');
    tbl.append(el('div', 'scrow schd', `<span>${tr('회차')}</span><span>${tr('총점')}</span><span>${SCORE_PARTS.map(([n, m]) => n + '<small>/' + m + '</small>').join(' · ')}</span><span></span>`));
    L.slice().reverse().forEach(e => {
      const r = el('div', 'scrow');
      const ed = el('button', 'metext', tr('고치기')); ed.type = 'button';
      ed.onclick = () => { dive(weeklyEntry); scoreForm(e); };
      r.append(el('span', null, e.r + tr('회') + ' <small>' + esc(e.d || '') + '</small>'), el('span', 'sct', String(e.t)),
               el('span', 'scp', e.p ? e.p.map(v => v == null ? '–' : v).join(' · ') : '–'), ed);
      tbl.append(r);
    });
    card.append(tbl);
  }
  host.append(card);
}
/* 점수 적기·고치기 — 부분 점수를 적으면 총점은 더해서 채운다. 소수점은 쉼표(89,25)로 적어도 된다 */
function scoreForm(e) {
  const b = $('#examBody'); b.textContent = '';
  const num = (ph, v, max) => { const i = el('input', 'keyin'); i.type = 'text'; i.inputMode = 'decimal'; i.placeholder = ph; if (v != null) i.value = String(v); i.dataset.max = max; return i; };
  const rIn = num(tr('회차 (예: 1)'), e ? e.r : ((scoreList().slice(-1)[0] || { r: 0 }).r + 1), 99); rIn.inputMode = 'numeric';
  const dIn = el('input', 'keyin'); dIn.type = 'date'; dIn.value = e ? e.d : ymd();
  const parts = SCORE_PARTS.map(([n, m], i) => num(tr(n) + ' (' + m + tr('점') + ')', e && e.p ? e.p[i] : null, m));
  const tIn = num(tr('총점 (100점)'), e ? e.t : null, 100);
  const val = i => { const t = i.value.trim().replace(',', '.'); return t === '' ? null : Number(t); };
  const sync = () => { const v = parts.map(val); if (v.every(x => x != null && !isNaN(x))) tIn.value = String(Math.round(v.reduce((a, c) => a + c, 0) * 100) / 100); };
  parts.forEach(i => { i.oninput = sync; });
  const err = el('p', 'note nickerr'); err.hidden = true;
  const ok = el('button', 'primary big', tr('저장')); ok.style.width = '100%';
  ok.onclick = () => {
    const bad = m => { err.textContent = m; err.hidden = false; };
    const r = Math.round(val(rIn)), t = val(tIn), p = parts.map(val);
    if (!(r >= 1 && r <= 99)) return bad(tr('회차를 1 이상으로 적어 주세요.'));
    if (t == null || isNaN(t) || t < 0 || t > 100) return bad(tr('총점은 0~100 사이로 적어 주세요.'));
    for (let i = 0; i < p.length; i++) if (p[i] != null && (isNaN(p[i]) || p[i] < 0 || p[i] > SCORE_PARTS[i][1])) return bad(tr(SCORE_PARTS[i][0]) + ' ' + tr('점수가 범위를 넘습니다.'));
    S.score = (S.score || []).filter(x => x !== e && !(x.r === r && x.d === dIn.value));
    if (e && (e.r !== r || e.d !== dIn.value)) S.score.push({ r: e.r, d: e.d, del: 1, at: now() });   // 회차·날짜를 바꿨으면 옛 줄은 지움 표시
    S.score.push({ r, d: dIn.value || ymd(), t, p: p.some(x => x != null) ? p : null, at: now() });
    save(); cloudSave(true);
    weeklyEntry();
  };
  b.append(el('p', 'lede', tr('반 시험 점수를 적어 주세요 — 부분 점수를 적으면 총점은 저절로 채워집니다')), rIn, dIn, ...parts, tIn, err, ok);
  if (e) {
    const del = el('button', 'ghost danger', tr('이 점수 지우기')); del.style.width = '100%'; del.style.marginTop = '10px';
    // 지운 자리에 '지움' 표시를 남긴다 — 그래야 다른 기기와 합칠 때 되살아나지 않는다(나중에 적은 것이 이긴다)
    del.onclick = async () => { if (!await askYN(tr('이 회차 점수를 지울까요?'), '지우기', true)) return; S.score = (S.score || []).filter(x => !(x.r === e.r && x.d === e.d)); S.score.push({ r: e.r, d: e.d, del: 1, at: now() }); save(); cloudSave(true); weeklyEntry(); };
    b.append(del);
  }
  show('exam', tr('시험 점수'), true);
}
function weeklyEntry() {
  const b = $('#examBody'); b.textContent = '';
  scoreCard(b);                                         // 내 시험 성적 · 성장 곡선 (2026-09-29)
  WEEKLY_ROUNDS.forEach(r => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, esc(tr(r.name)) + ' <span class="exmeta">' + esc(r.desc) + '</span>'));
    btn.onclick = () => { dive(weeklyEntry); weeklyRound(r); };
    b.append(btn);
  });
  show('exam', '주간 시험', true);
}
/* ── 1차 시험지 그대로 (2026-09-30) ──
   data/exam1.json 의 문항을 차례대로. 듣기는 시험지에 대본이 없어 앱이 정답에 맞춰 지은 문장을 기계 소리로 들려준다(made).
   쓰기 3(그림 보고 5문장)은 모범 답안을 보고 스스로 매긴다(_score 0~1). 90분(말하기 제외)이 지나면 남은 문제는 0점으로 끝난다. */
const FIXED_EXAMS = { exam1: { file: 'data/exam1.json', name: '실제 시험지 (1차)', round: 1 },
  m2_1: { file: 'data/mock2_1.json', name: '모의고사 1', round: 2 }, m2_2: { file: 'data/mock2_2.json', name: '모의고사 2', round: 2 }, m2_3: { file: 'data/mock2_3.json', name: '모의고사 3', round: 2 },
  m2_4: { file: 'data/mock2_4.json', name: '모의고사 4', round: 2 }, m2_5: { file: 'data/mock2_5.json', name: '모의고사 5', round: 2 } };
/* 주간시험 1 = 실제 1차 시험지 그대로, 주간시험 2 = 2차 시험 안내 틀(tools/mock2/common.py)로 낸 모의고사 다섯(1~7과). 옛 2차 예상 시험지(exam2)는 모의고사 1 로 다시 냈다 (2026-10-06) */   // 파일 이름을 글자 그대로 적어야 배포 목록에 든다. 2차는 교재 1권 1~7과로 클로드가 냄 (2026-10-06)
let EXAM1_TIMER = 0, FIXED = {};
function startExam1(key) {
  key = key || 'exam1';
  const go = () => {
    const J = FIXED[key];
    EXAM_SPD = 1;                                          // 시험지 듣기는 1배부터 (2026-10-06)
    const L = J.q.map(x => {
      const w = { vi: x.vi || x.prompt || x.audio || x.sec, ko: x.ko || '', nograde: true, sent: true, fx: x };
      if (x.k === 'puzzle') return { w: { vi: x.vi, ko: '', nograde: true, sent: true, tiles: x.tiles }, mode: 'puzzle', sec: x.sec, opts: [] };
      if (x.k === 'say') return { w: { vi: x.vi, ko: '', nograde: true, kr_read: krOf(x.vi) || '' }, mode: 'say', sec: x.sec, opts: [] };
      return { w, mode: 'fx', sec: x.sec, opts: [] };
    }).filter(q => q.mode !== 'say');                      // 시험지의 D 말하기는 앱에서 안 낸다 (2026-10-06)
    SBOX = 'bsrs';
    Q = { list: L, i: 0, ok: 0, day: null, total: L.length, early: true, opt: {}, exam: true, blind: true, round: 0, exam1: true, fixed: key, deadline: Date.now() + J.time * 60000 };
    drawQuiz();
    show('quiz', FIXED_EXAMS[key].name, true);
    exam1Clock();
  };
  if (FIXED[key]) go(); else fetch(FIXED_EXAMS[key].file, { cache: 'no-cache' }).then(r => r.json()).then(j => { FIXED[key] = j; go(); }).catch(() => popup(tr('시험지를 불러오지 못했습니다')));
}
function exam1Clock() {
  clearInterval(EXAM1_TIMER);
  let box = $('#examClock');
  if (!box) { box = el('div', 'examclock'); box.id = 'examClock'; $('#quiz').prepend(box); }
  box.hidden = false;
  const tick = () => {
    if (CURV !== 'quiz' || !Q || !Q.exam1) { clearInterval(EXAM1_TIMER); box.hidden = true; return; }
    const left = Math.max(0, Q.deadline - Date.now()), m = Math.floor(left / 60000), sc = Math.floor(left % 60000 / 1000);
    box.textContent = m + ':' + String(sc).padStart(2, '0');
    box.classList.toggle('low', left < 5 * 60000);
    if (!left) { clearInterval(EXAM1_TIMER); box.hidden = true; Q.i = Q.list.length; drawQuiz(); }   // 시간 끝 — 남은 문제는 0점
  };
  tick(); EXAM1_TIMER = setInterval(tick, 1000);
}
/* 시험지 문항 그리기 — tf(맞다/틀리다) · choice(보기 고르기) · pick(그림 고르기) · free(그림 보고 5문장, 스스로 매김) */
function drawFixed(body, q) {
  const x = q.w.fx, w = q.w;
  const say = t => { const k = recKey(t); k ? play(k, false, undefined, examSpd()) : speakVi(t, false, examSpd()); };   // 시험 속도(1배 기본, 칩으로 바꿈)
  if (x.audio) { const row = el('div', 'qplay'); const lb = el('button', 'primary big', '🔊 ' + tr('듣기')); lb.onclick = () => say(x.audio); row.append(lb, spdChip({ exam: true })); sentPeek(row, x.audio); body.append(row); setTimeout(() => say(x.audio), 200); }
  if (x.img && x.k !== 'pick') { const im = new Image(); im.src = 'img/' + x.img; im.alt = ''; im.className = 'fximg'; body.append(im); }
  if (x.text) body.append(el('div', 'fxtext', esc(x.text)));
  if (x.prompt) body.append(el('div', 'qmain sent', esc(x.prompt)));
  const box = el('div', 'opts');
  if (x.k === 'tf') {
    [['맞다', true], ['틀리다', false]].forEach(([t, v]) => { const b = el('button', null, tr(t)); const good = v === x.ans; b.dataset.vi = good ? w.vi : '-'; b.onclick = () => answer(b, good, w); box.append(b); });
    body.append(box); return;
  }
  if (x.k === 'choice') {
    let idx = x.opts.map((o, i) => i); if (x.shuffle) idx = idx.sort(() => Math.random() - .5);
    idx.forEach(i => { const b = el('button', null, esc(x.opts[i])); const good = i === x.ans; b.dataset.vi = good ? w.vi : '-'; b.onclick = () => answer(b, good, w); box.append(b); });
    body.append(box); return;
  }
  if (x.k === 'pick') {
    const grid = el('div', 'picgrid five');
    x.opts.forEach((im0, i) => { const b = el('button', 'picopt'); const good = i === x.ans; b.dataset.vi = good ? w.vi : '-'; const im = new Image(); im.src = 'img/' + im0; im.alt = ''; b.append(im, el('small', null, 'ABCDE'[i])); b.onclick = () => answer(b, good, w); grid.append(b); });
    body.append(grid); return;
  }
  if (x.k === 'errpick') {                                   // 틀린 곳 찾기 (2차 시험 틀 'Tìm lỗi sai') — 낱말을 눌러 틀린 자리를 짚는다 (2026-10-06)
    const toks = x.vi.replace(/[.?!]+$/, '').split(/\s+/);
    const line = el('div', 'errline'); let done = false;
    toks.forEach((t, i) => {
      const bt = el('button', 'errtok', esc(t)); bt.type = 'button';
      bt.onclick = () => {
        if (done) return; done = true;
        const good = i === x.bad;
        [...line.children].forEach((c, k2) => { c.disabled = true; if (k2 === x.bad) c.dataset.r = 'ok'; });
        if (!good) bt.dataset.r = 'no';
        fxTone(good); if (good) Q.ok++;
        body.append(el('div', 'q mid', '→ ' + esc(x.fix) + (x.ko ? '<br><small class="dimtxt">' + esc(x.ko) + '</small>' : '')));
        nextBtn(body, () => { Q.i++; drawQuiz(); });
      };
      line.append(bt);
    });
    body.append(el('p', 'note', tr('틀린 낱말을 누르세요')), line); return;
  }
  if (x.k === 'free') {
    const ta = el('textarea', 'fxfree'); ta.rows = x.n + 1; ta.placeholder = tr('문장을 한 줄에 하나씩');
    body.append(ta);
    const done = el('button', 'primary big', tr('다 썼어요 — 모범 답안 보기')); done.style.width = '100%';
    done.onclick = () => {
      done.disabled = true; ta.readOnly = true;
      body.append(el('div', 'fxmodel', '<b>' + tr('모범 답안') + '</b><br>' + x.model.map(esc).join('<br>')));
      body.append(el('p', 'q mid', tr('맞게 쓴 문장이 몇 개인가요?')));
      const g = el('div', 'opts');
      for (let n = 0; n <= x.n; n++) { const b = el('button', null, String(n)); b.onclick = () => { [...g.children].forEach(c => c.disabled = true); b.dataset.r = 'ok'; q._score = n / x.n; q._ok = n === x.n; q._ans = true; if (q._ok) Q.ok++; nextBtn(body, () => { Q.i++; drawQuiz(); }); }; g.append(b); }
      body.append(g);
    };
    body.append(done); return;
  }
}
/* 학습 탭의 주간 시험 (대표님 지시 2026-09-30: "학습 파트에 일일 단어시험과 주간시험 학습할 수 있게 — 그 안에서는 카드로 학습만") */
/* 테스트 탭의 회차 — **시험지만** (대표님 2026-09-30 "테스트에서는 실제 시험지처럼" · 2026-10-06 "쓰기 없애" — 쓰기 연습·학습 탭 주간 시험 화면·손으로 적던 회차 문법 목록은 뺐다) */
function weeklyRound(r) {
  const b = $('#examBody'); b.textContent = '';
  /* 시험지 — 주간시험 1 은 실제 1차 시험지 그대로, 주간시험 2 는 모의고사 다섯 (대표님 2026-10-06). 풀 때마다 같은 문제, 90분, 끝에 채점 */
  Object.entries(FIXED_EXAMS).filter(([k, e]) => e.round === r.no).forEach(([k, e]) => {
    const eb = el('button', 'bigmenu');
    const done = (S.stats.wexam || []).filter(x => x.round === k).slice(-1)[0];
    eb.append(el('b', null, esc(tr(e.name)) + ' <span class="exmeta">' + esc(r.desc) + ' · ' + tr('90분 · 끝에 채점') + (done ? ' · ' + tr('지난 결과') + ' ' + done.ok + '/' + done.tot : '') + '</span>'));
    eb.onclick = () => { dive(() => weeklyRound(r)); startExam1(k); };
    b.append(eb);
  });
  show('exam', r.name, true);
}
/* 문법 자료가 아직 없으면 불러온 뒤 이어 간다 */
function gramEnsure(cb) {
  if (GRAM) { cb(); return; }
  fetch('data/grammar.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { GRAM = gramReady(j); cb(); }).catch(() => popup(tr('문법 자료를 못 불러왔습니다')));
}
/* 회차 범위의 단어 — 메인 교재는 과 제목(· N부 앞) 차례로 과를 센다 */
function weeklyRoundWords(r) {
  const main = GYBM && GYBM.find(x => x.key === 'main');
  if (!main) return [];
  const base = t => String(t).replace(/\s*·\s*\d+부$/, '');
  const order = [...new Set(main.lessons.map(l => base(l.title)))];
  const want = new Set(r.chapters.map(i => order[i]).filter(Boolean));
  const out = [], seen = new Set();
  main.lessons.forEach(l => { if (want.has(base(l.title))) l.words.forEach(w => { if (!seen.has(w.vi)) { seen.add(w.vi); out.push(w); } }); });
  return out;
}
/* ── 매일 단어 시험 (대표님 지시 2026-09-30: "매일 보는 단어 시험(문법 포함)을 테스트 파트에 — 학습 진행 후 테스트도 이어서") ──
   자료 data/daily22.json (tools/daily22/build.py): 22기 A·B반 시험지 그대로 — 낱말 40개(시험지가 물은 방향: 뜻→베트남어 / 베트남어→뜻)와 문장 10개.
   흐름: 날짜 고르기 → [학습하고 시험 보기] 낱말 카드 → 문장 카드 → 시험 / [바로 시험]. 시험 = 시험지 차례 그대로, 1문제 1점, 스킵은 0점.
   낱말 채점은 GYBM 창고(bsrs)로 — 새 낱말은 창고에 들어가 '오늘 복습'에 다시 나온다. 문장은 창고에 안 넣는다(nograde).
   결과는 S.daily[key] = {best, runs:[{d, ok, tot}]} (진도 동기화 PROGKEYS). 틀린 문장은 쓰인 문법 과로 가는 단추. */
let DAILY22 = null;
function dailyLoad(cb) {
  if (DAILY22) { cb(); return; }
  fetch('data/daily22.json', { cache: 'no-cache' }).then(r => r.json()).then(j => { DAILY22 = j.tests || []; cb(); })
    .catch(() => popup(tr('불러오지 못했습니다')));
}
const dailyWords = t => t.words.map(w => Object.assign({}, w));
const dailySents = t => t.sents.map(x => ({ vi: x.vi, ko: x.ko, kr_read: x.kr, sent: true, nograde: true, gram: x.gram, alt: x.alt, dir: x.dir, dsrc: x.src }));
function dailyEntry(mode) {
  /* mode 'study' = 학습 탭(카드로 학습만) · 그 밖 = 테스트 탭(실제 시험처럼) — 대표님 지시 2026-09-30 */
  const study = mode === 'study';
  const b = $(study ? '#subBody' : '#examBody'); b.textContent = '';
  show(study ? 'sub' : 'exam', tr('단어 시험'), true);
  if (!DAILY22) { b.append(el('p', 'lede', tr('불러오는 중…'))); dailyLoad(() => { if ($('#title').textContent === tr('단어 시험')) dailyEntry(mode); }); return; }
  const cls = S.dcls || 'B';
  const pick = el('div', 'rolepick');
  ['A', 'B'].forEach(c => { const bb = el('button', 'ghost sm' + (cls === c ? ' pick' : ''), (cls === c ? '✓ ' : '') + c + tr('반')); bb.onclick = () => { S.dcls = c; save(); dailyEntry(mode); }; pick.append(bb); });
  b.append(pick);
  DAILY22.filter(t => t.cls === cls).slice().reverse().forEach(t => {        // 최신 날짜가 위
    const rec = (S.daily || {})[t.key], tot = t.words.length + t.sents.length;
    const c = el('button', 'hubcard');
    c.innerHTML = `<span class="hubbody"><b class="hubt2">${esc(t.date)} ${esc(tr('단어 시험'))}</b></span>` +
      (rec && rec.best != null ? `<span class="accpill">${rec.best}/${tot}</span>` : '') + `<svg class="hubchev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`;
    c.onclick = study ? () => { dive(() => dailyEntry('study')); dailyStudyOnly(t); } : () => { dive(() => dailyEntry()); dailyRound(t); };
    b.append(c);
  });
}
/* 학습 탭의 매일 단어 시험 = 보통 수업과 똑같이 **세트로 나눠**(카드 → 확인 문제) — 대표님 2026-09-30 "동일하게 단어 학습할 수 있게… 나눠서… 이전처럼".
   22기 자료(gybm.json c22)에 이미 13~14개씩 세 세트로 잘라 둔 레슨을 그대로 쓴다(진도는 교재 창고 bdone/bsrs). 문장은 학습에 없고 테스트에만. */
function dailyStudyOnly(t) {
  SBOX = 'bsrs';
  const b = $('#subBody'); b.textContent = '';
  show('sub', t.label, true);
  gybmBuild(() => {
    const src = (GYBM || []).find(g => g.key === 'c22');
    const sets = src ? src.lessons.map((l, li) => [l, li]).filter(([l]) => String(l.title).startsWith(t.label)) : [];
    if (!sets.length) { startLearn({ theme: t.label, day: 'daily:' + t.key, basic: 1, words: dailyWords(t) }); return; }   // 잘라 둔 것이 없으면 통째로 한 세트
    const box = el('div', 'ulist');
    const nodes = sets.map(([l, li], n) => ({
      key: gybmKey('c22', li), num: n + 1, title: tr('세트') + ' ' + (n + 1) + '/' + sets.length + ' · ' + l.words.length + tr('단어'), done: !!bdone()[gybmKey('c22', li)],
      fn: () => { SBOX = 'bsrs'; dive(() => dailyStudyOnly(t)); startLearn({ theme: l.title, day: gybmKey('c22', li), basic: 1, words: l.words }); },
    }));
    renderRoadmap(box, nodes, null, { freeNav: true });
    b.append(box);
  });
}
function dailyRound(t) {
  const b = $('#examBody'); b.textContent = '';
  const tot = t.words.length + t.sents.length, rec = (S.daily || {})[t.key];
  b.append(el('p', 'lede', esc(t.cls + tr('반') + ' ' + t.date + ' ' + tr('단어 시험'))));
  b.append(el('p', 'note', tr('낱말 N개 · 문장 10개 · 모두 M문제').replace('N', t.words.length).replace('M', tot)));
  const go = el('button', 'primary big', tr('시험 보기')); go.style.width = '100%';
  go.onclick = () => { dive(() => dailyRound(t)); gramEnsure(() => startDaily(t)); };
  b.append(go);
  if (rec && rec.runs && rec.runs.length) {
    b.append(el('p', 'anasec', tr('지난 결과') + ' <span>' + tr('최고') + ' ' + rec.best + ' / ' + tot + '</span>'));
    b.append(el('p', 'dimtxt', rec.runs.slice(-5).reverse().map(r => esc(String(r.d).slice(5).replace('-', '/')) + ' · ' + r.ok + ' / ' + r.tot).join('<br>')));
  }
  show('exam', t.date + ' ' + tr('단어 시험'), true);
}
function startDaily(t) {
  const ws = dailyWords(t), ss = dailySents(t);
  const pick = (arr, n) => arr.slice().sort(() => Math.random() - .5).slice(0, n);
  const mk = (w, sec, pool) => ({ w, mode: 'read', sec, opts: [w, ...pick(pool.filter(x => x.vi !== w.vi && x.ko !== w.ko), 3)].sort(() => Math.random() - .5) });
  const L = [];
  ws.forEach(w => L.push(w.dir === 'to_vi' ? { w, mode: 'write_ko', sec: tr('낱말 · 베트남어로 쓰기') } : mk(w, tr('낱말 · 뜻 고르기'), ws)));
  ss.forEach(x => {
    if (x.dir === 'to_ko') { L.push(mk(x, tr('문장 · 뜻 고르기'), ss)); return; }
    const n = x.vi.replace(/[.?!]+$/, '').split(/\s+/).length;
    if (n >= 3) L.push({ w: x, mode: 'puzzle', sec: tr('문장 · 베트남어로') });
    else L.push({ w: x, mode: 'read_ko', sec: tr('문장 · 베트남어로'), opts: [x, ...pick(ss.filter(y => y.vi !== x.vi), 3)].sort(() => Math.random() - .5) });   // 두 낱말 이하(Chào bạn.)는 조각이 안 되니 뜻 보고 문장 고르기 — 자판 치기는 뺐다 (2026-10-06)
  });
  SBOX = 'bsrs';
  Q = { list: L, i: 0, ok: 0, day: null, total: L.length, early: false, opt: {}, exam: true, blind: true, daily: t.key, dtest: t };   // blind: 실제 시험처럼 끝에 채점
  sensesLoad();
  drawQuiz();
  show('quiz', t.date + ' ' + tr('단어 시험'), true);
}
function finishDaily() {
  const last = Q.list[Q.list.length - 1]; if (last && last._ok === undefined) last._ok = Q.ok > (last._okBefore || 0);
  const t = Q.dtest, tot = Q.list.length, ok = Q.list.filter(q => q._ok).length;
  const secs = {}; Q.list.forEach(q => { const s0 = secs[q.sec] = secs[q.sec] || [0, 0]; s0[1]++; if (q._ok) s0[0]++; });
  S.daily = S.daily || {}; const rec = S.daily[t.key] = S.daily[t.key] || {};
  rec.best = Math.max(rec.best || 0, ok); rec.runs = (rec.runs || []).concat([{ d: ymd(), ok, tot }]).slice(-10); save();
  cloudSave(true);
  const r = el('div', 'result');
  if (ok === tot) { r.classList.add('perfect'); const cf = el('div', 'confetti'); for (let i = 0; i < 14; i++) { const s0 = el('i'); s0.style.setProperty('--i', i); cf.append(s0); } r.append(cf); fxTone(true); }
  r.append(el('div', 'n', ok + ' / ' + tot), el('div', null, esc(t.cls + tr('반') + ' ' + t.date + ' ' + tr('단어 시험')) + ' · ' + Math.round(ok * 100 / Math.max(1, tot)) + '% · ' + tr('최고') + ' ' + rec.best));
  if (Q.skip) r.append(el('div', 'sub', tr('스킵한 N문제는 0점입니다 — 시험 점수에만 들고, 실력 분석에는 들지 않습니다').replace('N', Q.skip)));
  const tb = el('div', 'exsec');
  Object.entries(secs).forEach(([k, v]) => { const row = el('div', 'exsecrow'); row.append(el('span', null, esc(k)), el('b', null, v[0] + ' / ' + v[1])); tb.append(row); });
  r.append(tb);
  const wrong = Q.list.filter(q => !q._ok);
  if (wrong.length) {
    r.append(el('p', 'anasec', tr('틀린 것') + ' <span>' + wrong.length + '</span>'));
    const box = el('div', 'dwrong');
    wrong.forEach(q => {
      const w = q.w, row = el('div', 'dwrow');
      row.append(el('div', 'dwq', esc(w.vi) + (w.alt && w.alt.length ? ' <small>' + tr('또는') + ' ' + w.alt.map(esc).join(' · ') + '</small>' : '')));
      row.append(el('div', 'dwa', esc(w.ko) + (q._skip ? ' <small class="dimtxt">' + tr('스킵') + '</small>' : '')));
      const gb = el('div', 'dwgram');
      (w.gram || []).forEach(no => {
        const ni = GRAM ? GRAM.books[0].bai.findIndex(x => x.no === no) : -1; if (ni < 0) return;
        const bt = el('button', 'ghost sm', no + tr('과') + ' ' + esc(GRAM.books[0].bai[ni].t.split(' — ')[0]));
        bt.type = 'button'; bt.onclick = () => { dive(() => dailyRound(t)); startGram(0, ni); };
        gb.append(bt);
      });
      if (gb.children.length) row.append(gb);
      box.append(row);
    });
    r.append(box);
    const again = el('button', 'primary big', tr('틀린 것만 카드로 보고 다시 시험')); again.style.width = '100%'; again.style.marginTop = '14px';
    again.onclick = () => flashRun(wrong.map(q => q.w), t.date + ' ' + tr('틀린 것'), { nextLabel: tr('다시 시험'), next: () => startDaily(t) });
    r.append(again);
  }
  const re = el('button', wrong.length ? 'ghost big' : 'primary big', tr('다시 풀기')); re.style.width = '100%'; re.style.marginTop = '10px'; re.onclick = () => startDaily(t);
  const ls = el('button', 'ghost big', tr('날짜 목록으로')); ls.style.width = '100%'; ls.style.marginTop = '10px'; ls.onclick = () => { ACTIVE_TAB = 'test'; dailyEntry(); };
  const hm = el('button', 'ghost big', tr('홈으로')); hm.style.width = '100%'; hm.style.marginTop = '10px'; hm.onclick = () => { ACTIVE_TAB = 'home'; renderHome(); };   // 시험 결과에서 바로 홈 (2026-09-30 밤)
  r.append(re, ls, hm);
  $('#quizBody').textContent = ''; $('#quizBody').append(r);
}
/* 앱이 만들던 주간 시험(startWeeklyExam)은 뺐다 (대표님 2026-10-06 "주간시험 1에는 실제 시험지만, 주간시험 2에는 모의고사 5개") — 시험은 모두 고정 시험지(FIXED_EXAMS) */
/* 시험 전용 문제들 — 그림 맞다/틀리다 · 그림 고르기 · 빈칸 · 문장 맞다/틀리다 · 틀린 곳 찾기 */
/* 시험 듣기 문제의 [문장 보기] (대표님 2026-10-06 "듣기 문제는 문장 보기 버튼도 — 주간 시험") — 누르면 들려준 문장이 글자로 보인다. 주간 시험·시험지에서만 */
function sentPeek(host, text) {
  if (!(Q && Q.exam && (Q.round || Q.exam1)) || !text) return;
  const b = el('button', 'ghost', tr('문장 보기')); b.type = 'button';
  b.onclick = () => { b.replaceWith(el('div', 'q mid sentpeek', esc(text))); };
  host.append(b);
}
function drawExamKind(body, q) {
  const w = q.w, md = q.mode;
  const tfBtns = (isTrue) => {
    const box = el('div', 'opts');
    [['맞다', isTrue], ['틀리다', !isTrue]].forEach(([t, good]) => { const b = el('button', null, t); b.dataset.vi = good ? w.vi : '-'; b.onclick = () => answer(b, good, w); box.append(b); });
    body.append(box);
  };
  if (md === 'pic_tf' || md === 'pic4') {
    const sayT = q.say || w.vi;                             // 주간 시험은 낱말의 예문을 들려준다 (2026-10-06)
    const row = el('div', 'qplay'); const lb = el('button', 'primary big', '듣기'); lb.onclick = () => sound(sayT); row.append(lb); sentPeek(row, sayT); body.append(row);
    sound(sayT);
    if (md === 'pic_tf') {
      const other = q.opts.find(o => o.vi !== w.vi && o.img) || w;
      const shown = Math.random() < .5 ? w : other;
      const p = pic(shown, 'pic mid'); if (p) body.append(p);
      tfBtns(shown === w);
    } else {
      const grid = el('div', 'picgrid');
      q.opts.forEach(o => { const b = el('button', 'picopt'); b.dataset.vi = o.vi; const im = new Image(); im.src = 'img/' + o.img; im.alt = ''; b.append(im); b.onclick = () => answer(b, o.vi === w.vi, w); grid.append(b); });
      body.append(grid);
    }
    return;
  }
  if (md === 'cloze') {
    const tok = w.of || '';
    const re = new RegExp('(^|\\s)' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[\\s.,!?])', 'i');
    const shown = re.test(w.vi) ? w.vi.replace(re, '$1____') : w.vi;
    if (q.say) { const row = el('div', 'qplay'); const lb = el('button', 'primary big', '듣기'); lb.onclick = () => sound(q.say); row.append(lb); sentPeek(row, q.say); body.append(row, el('div', 'qmain sent', esc(shown))); sound(q.say); }   // 듣고 빈칸 — 뜻은 안 보여 준다 (2026-10-06)
    else body.append(el('div', 'qmain sent', esc(shown)), el('div', 'q mid', esc(koShow(w.ko))));
    const target = findItem(tok) || { vi: tok, ko: '' };
    const pool = (Q.round ? weeklyRoundWords(WEEKLY_ROUNDS.find(r => r.no === Q.round) || WEEKLY_ROUNDS[0]) : weeklyMaterial()).filter(x => x.vi !== tok);
    const opts = [target, ...pool.sort(() => Math.random() - .5).slice(0, 3)].sort(() => Math.random() - .5);
    const box = el('div', 'opts');
    opts.forEach(o => { const b = el('button', null, esc(o.vi)); b.dataset.vi = o.vi === tok ? w.vi : '-'; b.onclick = () => answer(b, o.vi === tok, w); box.append(b); });
    body.append(box); return;
  }
  if (md === 'gpat') {                                     // 테스트 탭 문법 — 예문에 쓰인 문형 고르기 (2026-09-28 밤)
    const bx = el('div', 'wex');
    bx.append(tapLine(w.vi, 'wexvi tapline'));
    if (w.ko) bx.append(el('div', 'wexko', esc(koShow(w.ko))));
    body.append(bx);
    autoSay(w.vi);                                          // 문장이 보이면 소리 (2026-10-03 대표님 "테스트 문장은 화면 넘어오면 자동 재생")
    const box = el('div', 'opts');
    (q.popts || []).forEach(o => { const b = el('button', null, esc(o.k) + ' — ' + esc(o.t)); const good = o.k === w.gk; b.dataset.vi = good ? w.vi : '-'; b.onclick = () => answer(b, good, w); box.append(b); });
    body.append(box); return;
  }
  if (md === 'gcloze') {                                   // 문법 빈칸 — 보기는 회차 문법의 말들 (2026-09-28)
    const tok = w.tok || '';
    const re = new RegExp('(^|\\s)' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[\\s.,!?])', 'i');
    body.append(el('div', 'qmain sent', esc(w.vi.replace(re, '$1____'))), el('div', 'q mid', esc(koShow(w.ko))));
    const box = el('div', 'opts');
    (q.topts || []).forEach(o => { const b = el('button', null, esc(o)); const good = o === tok.toLowerCase(); b.dataset.vi = good ? w.vi : '-'; b.onclick = () => answer(b, good, w); box.append(b); });
    body.append(box); return;
  }
  if (md === 'tf') {
    const other = q.opts.find(o => o.vi !== w.vi && o.ko) || w;
    const isTrue = Math.random() < .5;
    body.append(el('div', 'qmain sent', esc(w.vi)), el('div', 'q mid', esc(koShow(isTrue ? w.ko : other.ko))));
    autoSay(w.vi);                                          // 2026-10-03 자동 재생
    tfBtns(isTrue); return;
  }
  if (md === 'err') {
    const toks = w.vi.replace(/[.?!]+$/, '').split(/\s+/);
    const MK = ['', '̀', '́', '̉', '̃', '̣'];
    let bad = -1, altered = null;
    for (let g = 0; g < 40 && bad < 0; g++) {
      const i = Math.floor(Math.random() * toks.length), b = stripTone(toks[i]);
      const c = withMark(b, MK[Math.floor(Math.random() * 6)], tonePos(b));
      if (c.toLowerCase() !== toks[i].toLowerCase()) { bad = i; altered = c; }
    }
    if (bad < 0) { q.mode = 'read'; return drawQuiz(); }
    const line = el('div', 'errline');
    let done = false;
    toks.forEach((t, i) => {
      const b = el('button', 'errtok', esc(i === bad ? altered : t)); b.type = 'button';
      b.onclick = () => {
        if (done) return; done = true;
        const good = i === bad;
        [...line.children].forEach((x, k) => { x.disabled = true; if (k === bad) { x.dataset.r = 'ok'; x.innerHTML = '<s>' + esc(altered) + '</s> ' + esc(toks[bad]); } });   // 틀린 곳 자리에 바른 글자를 바로 옆에
        if (!good) b.dataset.r = 'no';
        fxTone(good); sound(w.vi); celebrate(good);
        grade(w.vi, good, Q.early); if (good) Q.ok++;
        // 아래 정답 상자는 없앴다 — 뜻은 문제 위에, 문장은 이 줄에 바른 글자가 표시된다 (2026-09-28 밤)
        nextBtn(body, () => { Q.i++; drawQuiz(); });
      };
      line.append(b);
    });
    body.append(el('div', 'q mid', esc(koShow(w.ko))), line);
    return;
  }
}
function finishWeekly() {
  clearInterval(EXAM1_TIMER); { const ec = $('#examClock'); if (ec) ec.hidden = true; }   // 1차 시험지 시계 끄기
  const last = Q.list[Q.list.length - 1]; if (last && last._ok === undefined) last._ok = Q.ok > (last._okBefore || 0);
  const secs = {}; Q.list.forEach(q => { const s0 = secs[q.sec] = secs[q.sec] || [0, 0]; s0[1]++; if (q._ok) s0[0]++; });
  /* 시험지 배점으로 바꿔 적는다 (1차 시험지: 듣기 30 · 읽기 30 · 쓰기 20 · 말하기 20). 쓰기의 '그림 보고 5문장'(10점)은 선생님 채점이라 앱은 10점만 잰다.
     말하기를 못 본 기기(녹음 안 됨)는 말하기를 빼고 만점을 줄인다 */
  const W = { A: 30, B: 30, C: Q.exam1 ? 20 : 10, D: 20 }, NM = { A: '듣기', B: '읽기', C: '쓰기', D: '말하기' };   // 1차 시험지 그대로면 쓰기 20 (그림 5문장은 스스로 매김)
  const sc = q => q._score !== undefined ? q._score : (q._ok ? 1 : 0);
  const part = {}; Q.list.forEach(q => { const k = (q.sec || '')[0]; if (!W[k]) return; const p0 = part[k] = part[k] || [0, 0]; p0[1]++; p0[0] += sc(q); });
  const pts = Object.entries(part).map(([k, [o, n]]) => [k, Math.round(o / n * W[k] * 4) / 4, W[k]]);
  const got = pts.reduce((a, x) => a + x[1], 0), max = pts.reduce((a, x) => a + x[2], 0);
  const r = el('div', 'result');
  const tot = Q.list.length, ok = Q.list.filter(q => q._ok).length;
  r.append(el('div', 'n', got + ' / ' + max), el('div', null, tr('주간 시험 결과') + ' · ' + ok + ' / ' + tot + tr('문제')));
  const tp = el('div', 'exsec');
  pts.forEach(([k, g, m]) => { const row = el('div', 'exsecrow'); row.append(el('span', null, esc(tr(NM[k]))), el('b', null, g + ' / ' + m)); tp.append(row); });
  r.append(tp);
  if (Q.skip) r.append(el('div', 'sub', tr('스킵한 N문제는 0점입니다 — 시험 점수에만 들고, 실력 분석에는 들지 않습니다').replace('N', Q.skip)));
  const tb = el('div', 'exsec');
  Object.entries(secs).forEach(([k, v]) => { const row = el('div', 'exsecrow'); row.append(el('span', null, esc(k)), el('b', null, v[0] + ' / ' + v[1])); tb.append(row); });
  r.append(tb);
  S.stats.wexam = S.stats.wexam || []; S.stats.wexam.push({ d: ymd(), ok, tot, secs, round: Q.fixed || (Q.round || 0), pts: got, max }); if (S.stats.wexam.length > 20) S.stats.wexam.shift(); save();
  examWrongList(r, Q.list);
  const b = el('button', 'primary big', tr('홈으로')); b.style.marginTop = '20px'; b.onclick = () => { ACTIVE_TAB = 'home'; renderHome(); }; r.append(b);
  $('#quizBody').textContent = ''; $('#quizBody').append(r);
}
/* 시험 뒤 '틀린 것' — 문제 → 정답(다른 정답)·스킵 표시 (매일·주간 시험이 같이 쓴다) */
function examWrongList(r, list) {
  const wrong = list.filter(q => !q._ok);
  if (!wrong.length) return wrong;
  r.append(el('p', 'anasec', tr('틀린 것') + ' <span>' + wrong.length + '</span>'));
  const box = el('div', 'dwrong');
  wrong.forEach(q => {
    const w = q.w, row = el('div', 'dwrow');
    row.append(el('div', 'dwq', esc(w.vi) + (w.alt && w.alt.length ? ' <small>' + tr('또는') + ' ' + w.alt.map(esc).join(' · ') + '</small>' : '')));
    row.append(el('div', 'dwa', esc(w.ko || '') + (q.sec ? ' <small class="dimtxt">' + esc(q.sec) + '</small>' : '') + (q._skip ? ' <small class="dimtxt">' + tr('스킵') + '</small>' : '')));
    box.append(row);
  });
  r.append(box);
  return wrong;
}
/* 성조 부호 고르기 (대표님 지시 2026-09-28) — 부호 없는 글자를 보여 주고 소리를 들려준 뒤, 맞게 적힌 것을 넷 중 고른다.
   틀린 보기는 음절 하나의 성조만 바꾼 것 — 그래야 성조를 듣는 문제가 된다 */
function drawToneQ(body, q) {
  const w = q.w, syls = String(w.vi).trim().split(/\s+/);
  const bare = syls.map(stripTone).join(' ');
  const main = el('button', 'qmain qtap', esc(bare)); main.type = 'button'; main.onclick = () => sound(w.vi);
  const qc = el('div', 'qcard'); qc.append(body.querySelector('.q'), main, el('div', 'q mid', esc(koShow(w.ko)))); body.append(qc);   // 뜻도 보여 준다 (대표님 지시 2026-09-28: 소리만 듣고 맞추라는 건 너무 어렵다)
  // 듣기 단추는 뺐다 — 글자를 누르면 소리가 난다 (대표님 지시 2026-09-28)
  sound(w.vi);
  const MK = ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323'];
  const seen = new Set([w.vi.toLowerCase()]), opts = [w.vi];
  for (let g = 0; g < 80 && opts.length < 4; g++) {
    const i = Math.floor(Math.random() * syls.length), b = stripTone(syls[i]);
    const c = [...syls]; c[i] = withMark(b, MK[Math.floor(Math.random() * 6)], tonePos(b));
    const cand = c.join(' ');
    if (!seen.has(cand.toLowerCase())) { seen.add(cand.toLowerCase()); opts.push(cand); }
  }
  const box = el('div', 'opts');
  opts.sort(() => Math.random() - .5).forEach(o => { const b = el('button', null, esc(o)); b.dataset.vi = o; b.onclick = () => answer(b, o === w.vi, w); box.append(b); });
  body.append(box);
}
function drawSay(body, q) {
  const w = q.w, koMode = q.mode === 'say_ko', shadow = q.mode === 'shadow', picOnly = q.mode === 'say_pic';
  const p = pic(w, 'pic mid'); if (p && !shadow) body.append(p);
  const tapQ = txt => { const b = el('button', 'qmain qtap' + (w.sent ? ' sent' : ''), esc(txt)); b.type = 'button'; b.onclick = () => sound(w.vi); return b; };   // 듣기 단추는 뺐다 — 글자를 누르면 소리가 난다 (대표님 지시 2026-09-28)
  if (shadow) body.append(tapQ(w.vi));          // 따라 말하기 — 베트남어를 보며 듣고 따라 한다
  else if (picOnly) { /* 그림만 보고 말한다 (주간 시험 D2) — 뜻 글은 없다 */ }
  else if (koMode) { const kr = el('div', 'qplay'); const kb = el('button', 'primary big', '🔊 뜻 듣기'); kb.onclick = () => speakKo(koShow(w.ko)); kr.append(kb); body.append(kr); setTimeout(() => speakKo(koShow(w.ko)), 150); }
  else if (!picOnly) body.append(tapQ(koShow(w.ko)));
  let done = false;
  const finish = (ok, judged) => {
    if (done) return; done = true;
    markSpeed(ok, judged ? 'say' : 'sayself'); sound(w.vi);
    grade(w.vi, ok, Q.early);
    if (ok) Q.ok++; else requeue(q);
    /* 정답(베트남어·발음)은 아래 상자가 아니라 문제 글자 바로 옆에 (대표님 지시 2026-09-28 밤) — 낱말을 누르면 헷갈리는 짝 */
    const ans = el('span', 'optinfo ansinl');
    const vb = el('button', 'oivi tapword', esc(w.vi)); vb.type = 'button'; vb.onclick = () => pairPopup(w.vi, { kr: w.kr_read, ko: w.ko });
    ans.append(vb);
    const kr0 = w.sent ? '' : (krShow(w) || krOf(w.vi) || '');
    if (kr0) ans.append(el('span', 'oikr', '[' + esc(kr0) + ']'));
    const qm0 = body.querySelector('.qmain') || body.querySelector('.pic') || body.querySelector('.qplay');
    if (qm0) qm0.after(ans); else body.prepend(ans);
    /* 판정이 나도 '다음'은 말하기 단추 바로 밑 **같은 자리** (대표님 재지시 2026-09-30: "말하기 맞거나 틀리거나 어쨌든 다음으로 넘어갈 수 있게 — 아직도 없니").
       전에는 판정 뒤 단추를 그래프·결과 상자 맨 아래로 옮겨서, 폰에서는 화면 밖으로 밀려 안 보였다 */
    hideSkip();
    if (Q.blind) { setTimeout(() => { Q.i++; drawQuiz(); }, 0); return; }
    /* 판정 뒤에는 '다음'을 **맨 아래**로 (대표님 2026-09-30 밤: "그래프 위에 나와서 어색") — 판정 전에는 말하기 단추 밑에 있다가, 판정이 나면 그래프·결과 밑으로 내려간다 */
    const nr = body.querySelector('.nextrow');
    if (nr) { body.append(nr); nr.querySelector('button').onclick = () => { Q.i++; drawQuiz(); }; }
    else nextBtn(body, () => { Q.i++; drawQuiz(); });
  };
  /* 카드의 말하기와 **같은 길**(대표님 지적 2026-09-27 밤: "발음을 알아들을 수 없고 높낮이 그래프도 안 보인다") —
     높낮이 그래프에 내 곡선이 겹치고, 그 아래 발음(폰 인식 → 안 되면 소리 비교)·높낮이 O/X 가 뜬다. 발음 판정이 채점이 된다. */
  const box = el('div', 'cmpbox'); box.dataset.merged = '1';
  box.onVerdict = (i, ok) => { if (i === 0 && ok !== null) finish(ok === true, true); };
  const row = el('div', 'qplay');
  if (shadow) setTimeout(() => sound(w.vi), 150);
  const rec = canRecord();
  /* 듣기 단추를 말하기 왼쪽에 (대표님 2026-09-30 밤: "어차피 말하기 버튼이 있어야 하니까 듣기 버튼도 그 왼쪽에") — 시험(blind)에서도 듣는 건 된다 */
  { const lb = el('button', 'ghost', '🔊 ' + tr('듣기')); lb.type = 'button'; lb.onclick = () => { const k = recKey(w.vi); k ? play(k, false) : speakVi(w.vi, false); }; row.append(lb); }
  if (rec) { const mic = el('button', 'rec', '🎤 말하기'); mic.onclick = () => toggleRec(w.vi, mic, box); row.append(mic); }
  const showA = el('button', rec ? 'ghost' : 'primary big', rec ? '모르겠어요' : '말했어요 · 정답 보기');
  showA.onclick = () => { bumpSaid(); finish(!rec, false); };
  row.append(showA);
  body.append(row, pitchGraph(w.vi, {}), box);
  /* 판정이 나든 안 나든 넘어갈 수 있어야 한다 (대표님 지시 2026-09-28: "다른 테스트들도 맞든 틀리든 다음 버튼이 활성화되잖아").
     전에는 폰 인식이 답을 못 주면(—) 단추가 안 생겨 그 자리에서 막혔다. 판정 전에 누르면 틀린 것으로 적고 바로 다음으로 간다 */
  const early = el('div', 'nextrow');
  const nx = el('button', 'primary big', tr('다음') + ' ›'); nx.style.width = '100%';
  /* 판정 전에 누르면 틀림이 아니라 **스킵**(통계에 안 듦, 시험이면 0점) — 폰이 못 알아들었는데 틀림으로 적히면 기록이 망가진다 (2026-09-30) */
  nx.onclick = () => { if (!done) { done = true; skipQ(); return; } Q.i++; drawQuiz(); };
  early.append(nx); row.after(early);                 // 말하기 단추 바로 밑 — 스크롤 없이 보이게
}

/* 손으로 — 성조 부호까지 써 본다 (복습 안에서) */
function drawHandQ(body, q) {
  const w = q.w;
  body.append(el('div', 'qmain', esc(koShow(w.ko))));
  const row = el('div', 'qplay');
  const p1 = el('button', 'ghost', '🔊 듣기'); p1.onclick = () => play(w.vi, false);
  row.append(p1); body.append(row);
  const cv = el('canvas', 'wpad');
  cv.width = 640; cv.height = 200;
  const ctx = cv.getContext('2d');
  const paper = () => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#e3e6ec'; ctx.lineWidth = 2;   // 공책처럼 옅은 줄 — 글자 수는 알려주지 않는다
    [70, 130].forEach(y => { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(cv.width - 20, y); ctx.stroke(); });
    ctx.strokeStyle = '#16181d'; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
  };
  paper();
  let drawing = false;
  const pos = e => { const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = e => { drawing = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  cv.onpointermove = e => { if (drawing) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
  body.append(cv);
  const box = el('div', 'cmpbox');
  const tools = el('div', 'qplay');
  const cl = el('button', 'ghost', '지우기'); cl.onclick = paper;
  tools.append(cl);
  /* 채점은 AI가 한다. 다만 **확신이 없으면 점수를 매기지 않고** 본인에게 넘긴다 —
     틀리지 않은 글씨를 틀렸다고 하는 것이 가장 나쁘다.
     AI가 틀렸다고 했을 때도 되돌릴 단추를 둔다(기계는 열에 하나쯤 틀린다). */
  const answer = () => {
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(krShow(w)));
    body.insertBefore(ans, box);
  };
  const mark = good => {
    markSpeed(good, 'hand'); sound(w.vi);
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) { S.stats.spellOk = (S.stats.spellOk || 0) + 1; fxTone(true); grade(w.vi, true, Q.early); Q.ok++; }
    else { grade(w.vi, false); requeue(q); }
    Q.i++; drawQuiz();
  };
  const byHand = () => {                      // AI가 못 가릴 때만 — 본인이 판단
    const g = el('div', 'opts');
    const ok = el('button', null, '✓ 맞게 썼어요'); ok.onclick = () => mark(true);
    const no = el('button', null, '✗ 틀렸어요');   no.onclick = () => mark(false);
    g.append(ok, no); body.append(g);
  };
  if (HAND_AI && aiReady()) {
    const ai = el('button', 'primary', '채점받기');
    ai.onclick = () => {
      ai.disabled = true;
      aiRead(w.vi, cv, box, v => {
        answer();
        if (v === null) { byHand(); return; }                 // 모르겠음 → 점수 안 매김
        const nx = el('div', 'opts');
        const go = el('button', 'primary', v ? '다음 ›' : '다음 ›');
        go.onclick = () => mark(v);
        const undo = el('button', 'ghost', v ? '아니에요, 틀렸어요' : '아니에요, 맞게 썼어요');
        undo.onclick = () => mark(!v);
        nx.append(go, undo); body.append(nx);
      }).finally(() => { ai.disabled = false; });
    };
    tools.append(ai);
  }
  const show = el('button', aiReady() ? 'ghost' : 'primary', '정답 보기');
  show.onclick = () => { show.disabled = true; answer(); byHand(); };
  tools.append(show);
  body.append(tools, box);
  play(w.vi, false);
}

/* 연습용 화면 자판 = **아이폰 베트남어(텔렉스) 자판과 같은 배열** (대표님 지시 2026-09-30: "실제 폰 자판과 100% 동일하게").
   줄: q…p / a…l(반 칸 들여쓰기) / ⇧ z…m ⌫ / 123 · (빈 긴 글쇠 = 띄어쓰기) · ✓(확인). 글쇠 글자는 뺐다 (대표님 2026-09-30: 폰 자판과 글자를 맞출 필요 없이).
   ⇧ 한 번 = 다음 글자만 대문자, 두 번 연달아 = 고정. 123 = 숫자·문장 부호 판(아이폰과 같은 배열, #+= 으로 기호 판), ABC 로 돌아온다.
   ⌫ 를 누르고 있으면 연달아 지운다. 모음·d 를 길게 누르면(0.4초) 부호 붙은 글자 목록이 뜬다(아이폰 길게 누르기와 같다).
   텔렉스(aa·aw·ee·oo·ow·uw·dd·s·f·r·x·j)는 그대로 된다. 아이폰의 🌐(자판 바꾸기)·이모지 글쇠는 여기서 할 일이 없어 없다.
   예전에는 여기만 모자 글쇠(ă â ê…)와 성조 화살표가 따로 붙어 있었다. 대화에서 익힌 방식이 시험에서 안 통하면 두 번 배우는 셈이다. */
const KB_NUM = [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'], ['.', ',', '?', '!', "'"]];
const KB_SYM = [['[', ']', '{', '}', '#', '%', '^', '*', '+', '='], ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'], ['.', ',', '?', '!', "'"]];
const KB_HOLD = { a: 'à á ả ã ạ ă â', e: 'è é ẻ ẽ ẹ ê', i: 'ì í ỉ ĩ ị', o: 'ò ó ỏ õ ọ ô ơ', u: 'ù ú ủ ũ ụ ư', y: 'ỳ ý ỷ ỹ ỵ', d: 'đ' };
function viKeypad(get, set, onGo) {
  const kb = el('div', 'vkb ios');
  let shift = 0, layer = 'abc', shiftAt = 0;          // shift: 0 없음 · 1 다음 한 글자 · 2 고정(두 번 연달아)
  const key = (label, fn, cls) => {
    const k = el('button', 'vk' + (cls ? ' ' + cls : ''), label);
    k.type = 'button'; k.onclick = fn; return k;
  };
  const tap = ch => {
    const t = get();
    const cut = Math.max(t.lastIndexOf(' '), t.lastIndexOf('\n')) + 1;
    const made = telex(t.slice(cut), ch);
    set(made === null ? t + ch : t.slice(0, cut) + made);
  };
  const del = () => set(get().slice(0, -1));
  const holdDel = k => {                              // ⌫ 를 누르고 있으면 연달아
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    k.addEventListener('pointerdown', () => { stop(); t1 = setTimeout(() => { t2 = setInterval(del, 90); }, 500); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => k.addEventListener(ev, stop));
  };
  let pop = null;
  const closePop = () => { if (pop) { pop.remove(); pop = null; } };
  const hold = (k, ch) => {                           // 길게 누르면 부호 글자 목록 (아이폰과 같다)
    let t = null, fired = false;
    k.addEventListener('pointerdown', () => {
      fired = false; clearTimeout(t);
      t = setTimeout(() => {
        fired = true; closePop();
        pop = el('div', 'vkpop');
        (shift ? KB_HOLD[ch].toUpperCase() : KB_HOLD[ch]).split(' ').forEach(v => {
          const b = el('button', 'vkpk', v); b.type = 'button';
          b.onclick = ev => { ev.stopPropagation(); set(get() + v); if (shift === 1) { shift = 0; draw(); } closePop(); };
          pop.append(b);
        });
        k.append(pop);
      }, 400);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => k.addEventListener(ev, () => clearTimeout(t)));
    k.addEventListener('click', ev => { if (fired) { ev.stopImmediatePropagation(); fired = false; } }, true);   // 길게 눌렀으면 보통 입력은 안 한다
  };
  document.addEventListener('pointerdown', e => { if (pop && !e.target.closest('.vkpop')) closePop(); }, true);
  const bottom = (lab, fn) => {
    const row = el('div', 'vkrow bottom');
    row.append(key(lab, fn, 'fn abc'), key('', () => { set(get() + ' '); if (shift === 1) { shift = 0; draw(); } }, 'space'), key('✓', onGo, 'go ret'));
    kb.append(row);
  };
  const draw = () => {
    kb.textContent = ''; closePop();
    if (layer === 'abc') {
      KBROWS.forEach((chars, ri) => {
        const row = el('div', 'vkrow r' + (ri + 1));
        if (ri === 2) row.append(key(shift === 2 ? '⇪' : '⇧', () => {
          const now2 = Date.now();
          shift = shift === 2 ? 0 : (shift === 1 && now2 - shiftAt < 350 ? 2 : (shift === 1 ? 0 : 1));   // 두 번 연달아 = 고정
          shiftAt = now2; draw();
        }, 'fn shift' + (shift ? ' on' : '')));
        chars.forEach(ch => {
          const k = key(shift ? ch.toUpperCase() : ch, () => { tap(shift ? ch.toUpperCase() : ch); if (shift === 1) { shift = 0; draw(); } });
          if (KB_HOLD[ch]) hold(k, ch);
          row.append(k);
        });
        if (ri === 2) { const d = key('⌫', del, 'fn del'); holdDel(d); row.append(d); }
        kb.append(row);
      });
      bottom('123', () => { layer = 'num'; draw(); });
    } else {
      (layer === 'num' ? KB_NUM : KB_SYM).forEach((chars, ri) => {
        const row = el('div', 'vkrow n' + (ri + 1));
        if (ri === 2) row.append(key(layer === 'num' ? '#+=' : '123', () => { layer = layer === 'num' ? 'sym' : 'num'; draw(); }, 'fn'));
        chars.forEach(ch => row.append(key(ch, () => set(get() + ch))));
        if (ri === 2) { const d = key('⌫', del, 'fn del'); holdDel(d); row.append(d); }
        kb.append(row);
      });
      bottom('ABC', () => { layer = 'abc'; draw(); });
    }
  };
  draw();
  // 자판 밑 설명 글은 뺐다 (대표님 지시 2026-09-27) — 규칙은 타이핑 연습의 화면마다 위에 보인다
  return kb;
}

/* 자판으로 — 철자와 부호 위치를 정확히 (복습 안에서) */
/* 성조·모자 치는 법 — 접힌 한 줄, 누르면 표 (타이핑 테스트) */
function telexHint() {
  const w = el('div', 'thint');
  const hd = el('button', 'thinthd', tr('성조·모자 치는 법') + ' ▾'); hd.type = 'button';
  const tb = el('div', 'thintb');
  const rows = [['a f', 'à'], ['a s', 'á'], ['a r', 'ả'], ['a x', 'ã'], ['a j', 'ạ'], ['a a', 'â'], ['a w', 'ă'], ['e e', 'ê'], ['o o', 'ô'], ['o w', 'ơ'], ['u w', 'ư'], ['d d', 'đ']];
  rows.forEach(([k, v]) => { const r = el('span', 'thk'); r.innerHTML = '<kbd>' + k.split(' ').join('</kbd><kbd>') + '</kbd>→<b>' + v + '</b>'; tb.append(r); });
  // 늘 펼쳐 둔다 (대표님 지시 2026-09-28: "상시로 표시") — 머리글은 이름표만
  hd.textContent = tr('성조·모자 치는 법'); hd.disabled = true;
  w.append(hd, tb);
  return w;
}
function drawTypeQ(body, q) {
  const w = q.w;
  /* write_ko = 뜻을 보고 베트남어로 쓰기 (매일 단어 시험, 2026-09-30) — 시험지처럼 소리를 먼저 들려주지 않는다. 답한 뒤에만 소리 */
  const silent = q.mode === 'write_ko';
  let txt = '', typed = false;
  const qm = el('button', 'qmain qtap', q.mode === 'dictation' ? '🔊' : esc(koShow(w.ko))); qm.type = 'button';   // 받아쓰기는 뜻 없이 듣고 친다 (주간 시험 A4)
  qm.onclick = () => { if (!silent || typed) play(w.vi, false); }; body.append(qm);   // 듣기 단추는 뺐다 — 글자를 누르면 소리가 난다 (대표님 지시 2026-09-28)
  if (!silent) play(w.vi, false);
  body.append(telexHint());          // 성조·모자 치는 법 (접힘) — 대표님 지시 2026-09-27 밤
  const out = el('div', 'dictans');
  const draw = () => { out.textContent = txt || '· · ·'; };
  draw(); body.append(out);
  body.append(viKeypad(() => txt, v => { txt = v; draw(); }, () => {
    if (!txt.trim()) return;
    if (typed) return; typed = true;   // 확인을 두 번 눌러도 한 번만 (대표님 지적 2026-09-27 밤)
    const good = [w.vi, ...(w.alt || [])].some(a => viCanon(txt) === viCanon(a));   // 성조 자리(hoà/hòa)·i/y(lý/lí) 두 꼴 다 정답 (2026-09-29) · 시험지의 다른 정답(alt)도 정답
    markSpeed(good, 'type');
    fxTone(good); sound(w.vi);
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    /* 성조만 틀린 것은 **오답이되 따로 알려 준다** (대표님 지시 2026-08-31).
       ma·mà·má·mả·mã·mạ 는 서로 다른 단어이라 성조를 봐주면 안 된다.
       다만 '글자를 틀림' 과 한 덩어리로 묶으면 무엇을 고쳐야 할지 모른다. */
    const toneOnly = !good && bare(txt) === bare(w.vi);
    if (!good) bump('serr', toneOnly ? '성조만 틀림' : '글자를 틀림', false);
    if (!good) noteLetters(w.vi, txt, 'ltrw');
    out.dataset.r = good ? 'ok' : (toneOnly ? 'tone' : 'no');
    if (!good) {
      out.textContent = txt.trim() + '  →  ' + w.vi;
      body.append(el('div', 'tonemiss', toneOnly
        ? tr('성조만 틀렸어요 — 글자는 맞았습니다')
        : tr('글자가 틀렸어요')));
    }
    const kr1 = w.sent ? '' : (krShow(w) || krOf(w.vi) || '');
    if (kr1) out.append(el('span', 'oikr', ' [' + esc(kr1) + ']'));   // 발음은 답 줄 옆에 (2026-09-28 밤)
    if (!w.nograde) grade(w.vi, good, Q.early);                       // 시험 문장(nograde)은 낱말 창고에 안 넣는다
    if (good) Q.ok++; else requeue(q);
    nextBtn(body, () => { Q.i++; drawQuiz(); });
  }));
}


/* 말한 것을 AI가 받아 적어 맞는지 본다.
   성조는 채점하지 않는다(AI도 성조는 틀린다). 글자가 맞으면 정답으로 친다 —
   "알아들을 수 있게 말했는가"가 이 단계의 목표다. */
/* 말하기 보기 넷 만들기 — 목표 + 헷갈릴 단어 셋.
   성조만 다른 단어을 먼저 넣는다(sữa/sửa). 그래야 성조가 어설플 때 그쪽이 골라져
   '고르기'가 봐주기로 흐르지 않는다. 문장은 보기를 만들 수 없으니 받아쓰기로 간다. */
function sayOpts(target) {
  const it = findItem(target);
  if (!it || it.sent || !target || target.length > 20) return null;
  const pool = allWords().map(w => w.vi).filter(v => v && v !== target);
  if (pool.length < 3) return null;
  const near = pool.filter(v => stripTone(v.toLowerCase()) === stripTone(target.toLowerCase()));
  const rest = pool.filter(v => !near.includes(v) && Math.abs(v.length - target.length) <= 2);
  const pick = [...new Set([...near.slice(0, 2), ...rest.sort(() => Math.random() - .5)])].slice(0, 3);
  while (pick.length < 3) { const v = pool[Math.floor(Math.random() * pool.length)];
                            if (!pick.includes(v)) pick.push(v); }
  return [target, ...pick].sort(() => Math.random() - .5);
}

/* 회상형 — 보기를 주지 않고 직접 떠올려 소리 내게 한다.
   4지선다는 아는 것처럼 보이게 만든다(실제보다 20% 과대평가). 회상이 진짜다.
   게다가 소리 내어 말하므로 산출 효과까지 같이 얻는다. 채점은 본인이 한다. */

function answer(btn, correct, w) {
  const md = Q.list[Q.i].mode;
  Q.list[Q.i]._ans = true; hideSkip();          // 문법 예문(nograde)도 답한 뒤에는 못 넘긴다
  markSpeed(correct, md);
  // 눈으로 푼 것은 읽기, 귀로 푼 것은 듣기로 센다 (전에는 둘 다 '암기'에만 쌓였다)
  const bx = (md === 'read' || md === 'read_ko') ? 'read' : (md === 'listen' || md === 'listen_ko' || md === 'tone') ? 'ear' : null;
  if (bx) { S.stats[bx + 'All'] = (S.stats[bx + 'All'] || 0) + 1;
            if (correct) S.stats[bx + 'Ok'] = (S.stats[bx + 'Ok'] || 0) + 1; }
  [...btn.parentNode.children].forEach(b => b.disabled = true);
  btn.dataset.r = correct ? 'ok' : 'no';
  fxTone(correct);
  if (!correct) {
    [...btn.parentNode.children].forEach(b => {
      if (b.dataset.vi === w.vi || b.textContent === koShow(w.ko)) b.dataset.r = 'ok';
    });
  }
  if (correct) Q.ok++;
  else requeue(Q.list[Q.i]);        // 틀린 건 이번 판 끝에 한 번 더
  if (!w.nograde) grade(w.vi, correct, Q.early);   // 문법 예문(주간 시험)은 단어 창고에 안 넣는다 (2026-09-28)
  sound(w.vi);                      // 답이 열릴 때 소리 한 번 (대표님 지시 2026-09-27 밤) — 맞든 틀리든
  /* 보기마다 발음과 뜻 (대표님 지시 2026-09-28 밤: "정답이든 오답이든 옆에(길면 아래) 발음과 뜻, 뜻은 흔히 쓰는 순서로 3개까지.
     그러면 하단의 정답 단어·발음·뜻 상자는 없애도 된다"). 모든 보기가 낱말·문장 보기일 때만 — 그림·맞다틀리다 같은 문제는 옛 상자 그대로 */
  const qq = Q.list[Q.i], obtn = [...btn.parentNode.children];
  const byVi = new Map((qq.opts || []).filter(o => o && o.vi).map(o => [o.vi, o]));
  if (obtn.length > 1 && obtn.every(b => byVi.has(b.dataset.vi))) {
    obtn.forEach(b => {
      const o = byVi.get(b.dataset.vi);
      b.classList.add('ann', 'answered'); b.append(optInfo(o, b.textContent.trim() === o.vi));
      /* 답한 뒤에는 보기를 누르면 그 낱말의 헷갈리는 짝 (대표님 지시 2026-09-28 밤). 짝 창은 누를 때만 그리므로 가만히 있을 때는 비용이 없다 */
      if (!o.sent) { b.disabled = false; b.onclick = () => pairPopup(o.vi, { kr: krOf(o.vi) || o.kr_read, ko: o.ko }); }
    });
    nextBtn($('#quizBody'), () => { Q.i++; drawQuiz(); });
    return;
  }
  /* 그 밖의 문제(성조 고르기·맞다/틀리다·빈칸·문형 고르기·그림 맞다/틀리다)도 **아래 따로 뜨던 정답 상자를 없앴다**
     (대표님 재지시 2026-09-28 밤: "정답·오답 나올 때 아래에 따로 단어·뜻·발음 보여주지 말고 단어 옆에") — 문제 글자나 보기 옆에 붙인다 */
  const qb = $('#quizBody'), qm = qb.querySelector('.qmain');
  let put = false;
  obtn.forEach(b => {                                            // 성조 고르기: 보기가 곧 낱말 — 맞는 낱말엔 발음·뜻, 다른 보기도 실제 낱말이면 그 뜻
    const t = b.textContent.trim();
    if (!t || b.dataset.vi !== t) return;
    const sw = t === w.vi ? w : (SIB && SIB.w && SIB.w[t.toLowerCase()] && SIB.w[t.toLowerCase()].k ? { vi: t, ko: SIB.w[t.toLowerCase()].k } : null);
    if (sw) { b.classList.add('ann', 'answered'); b.append(optInfo(sw, true)); }
    put = true;
  });
  if (!put && qm && /____/.test(qm.textContent)) { qm.textContent = w.vi; qm.classList.add('filled'); put = true; }   // 빈칸 — 문장에 답을 채워 보인다 (뜻은 이미 밑에 있다)
  else if (!put && qm && md !== 'gpat') { qm.after(optInfo(w, !!w.sent || qm.textContent.trim() === w.vi)); put = true; }   // 맞다/틀리다 — 문제 글자 옆에 발음·참 뜻
  else if (!put && md !== 'gpat') { const p0 = qb.querySelector('.pic') || qb.querySelector('.q'); if (p0) p0.after(optInfo(w, false)); }   // 그림 맞다/틀리다 — 그림 옆에 낱말·발음·뜻
  nextBtn(qb, () => { Q.i++; drawQuiz(); });
}

/* 보기 한 칸의 풀이 — 베트남어 보기면 [발음] 뜻①②③, 뜻 보기면 베트남어 [발음] (+ 다른 뜻). 뜻은 검수된 data/_senses.json 차례(흔히 쓰는 순서) */
function optInfo(o, showsVi) {
  const box = el('span', 'optinfo');
  const kr = o.sent ? '' : (krOf(o.vi) || o.kr_read || '');
  const ss = !o.sent && SENSES && SENSES[String(o.vi).toLowerCase().trim()];
  const senses = (ss && ss.length ? ss : [o.ko]).filter(Boolean);                      // 가진 뜻 모두 (2026-09-28 밤)
  if (showsVi) {
    if (kr) box.append(el('span', 'oikr', '[' + esc(kr) + ']'));
    box.append(el('span', 'oiko', senses.map((s, i) => (senses.length > 1 ? '<i>' + (i + 1) + '</i>' : '') + esc(s)).join(' ')));
  } else {
    box.append(el('b', 'oivi', esc(o.vi)));
    if (kr) box.append(el('span', 'oikr', '[' + esc(kr) + ']'));
    const more = senses.length > 1 ? senses : [];
    if (more.length) box.append(el('span', 'oiko', more.map((s, i) => '<i>' + (i + 1) + '</i>' + esc(s)).join(' ')));
  }
  return box;
}
/* 틀린 문제를 같은 판 뒤쪽에 한 번만 다시 넣는다.
   틀린 채로 끝내면 그 기억이 남는다. 맞히고 끝내야 한다. */
/* 얼마나 빨리 답했나 — 정답만 센다(틀린 건 고민 시간이 뒤섞인다).
   정답률이 같아도 느리면 아직 '자동'이 안 된 것이다. */
function markSpeed(ok, mode) {
  if (typeof Q !== 'undefined' && Q) Q._lastOk = !!ok;         // 문법 과 예문을 틀리면 nextBtn 이 그 과 단추를 띄운다 (2026-10-02)
  if (typeof Q !== 'undefined' && Q) Q._answered = true;       // 답이 났다 — 시험(blind)이면 이 뒤 효과음·소리·축하를 끈다
  bump('md', mode, ok);
  { const qw = (typeof Q !== 'undefined' && Q && Q.list && Q.list[Q.i]) ? Q.list[Q.i].w : null;   // 문장 문제 (분석 v2 '문장' 영역, 2026-09-30)
    if (qw && qw.sent) {
      S.stats.sentAll = (S.stats.sentAll || 0) + 1; if (ok) S.stats.sentOk = (S.stats.sentOk || 0) + 1;
      bump('smd', mode, ok);
      [].concat(qw.gram || []).forEach(g => bump('gr', String(g), ok));   // 쓰인 문법 — 과 번호(매일 시험) 또는 문형 제목(주간 시험)
    } }
  if (!Q.t0) return;
  const ms = Date.now() - Q.t0;
  S.stats.ansN = (S.stats.ansN || 0) + 1;                                 // 답한 문제 수 (찍기 비율의 분모)
  if (!ok) { if (ms < 1000) S.stats.guessN = (S.stats.guessN || 0) + 1; return; }   // 1초 안에 답하고 틀림 = 찍었을 가능성 → 분석에서 '스킵하세요' (2026-09-30)
  if (ms < 500 || ms > 20000) return;                  // 튀는 값은 버린다
  S.stats.ms = (S.stats.ms || 0) + ms;
  S.stats.msN = (S.stats.msN || 0) + 1;
}

/* ── 스킵 (대표님 지시 2026-09-30, 글자는 '스킵'으로 — 09-30 낮) ──
   찍어서 틀리면 '틀림'으로 남아 실력 분석이 망가지고 의욕이 꺾인다. 그래서 풀지 않고 넘기는 길을 둔다.
   넘긴 문제는: 정답률(말하기·듣기·읽기·쓰기·암기) 어디에도 안 들어감 · 오답 노트에 안 들어감 · 창고 사다리 그대로(기한이 지난 채라
   다음 복습에 다시 나옴) · 이번 판 끝에 다시 안 물음. 대신 '넘긴 수'만 따로 센다(S.stats.skipN, 낱말별 S.stats.skipW) — 자꾸 넘기는 낱말은
   분석에서 '아직 안 재 본 것'으로 따로 보여 준다. 주간 시험에서는 그 문제가 0점이다(점수 시험이니까). 다 넘기면 외운 단어는 그대로 0 —
   넘김은 앎이 아니다. 답한 뒤(_ans)에는 넘길 수 없다 — 이미 통계에 들어갔다. */
function hideSkip() { const s = $('#quizBody') && $('#quizBody').querySelector('.qskip'); if (s) s.remove(); }
function skipQ() {
  if (!Q || Q.i >= Q.list.length) return;
  const q = Q.list[Q.i];
  if (q._ans) return;
  q._skip = true; if (Q.exam) q._ok = false;
  Q.skip = (Q.skip || 0) + 1;
  S.stats.skipN = (S.stats.skipN || 0) + 1;
  const vi = q.w && q.w.vi;
  if (vi) { const b = S.stats.skipW || (S.stats.skipW = {}); b[vi] = (b[vi] || 0) + 1; }
  save();
  Q.i++; drawQuiz();
}
function requeue(q) {
  if (Q && Q.exam) return;                      // 주간 시험에서는 다시 안 낸다 — 점수를 매기는 시험이니까 (2026-09-28)
  if (q.retry) return;                          // 두 번은 안 미룬다
  Q.list.push({ ...q, retry: true });
}

/* 어떤 성조에서 자주 틀리는지 — 단어의 첫 음절 성조로 센다 */
function bump(box, key, ok) {
  if (!key) return;
  const b = S.stats[box] || (S.stats[box] = {});
  const c = b[key] || (b[key] = { ok: 0, all: 0 });
  c.all++; if (ok) c.ok++;
}
/* ── 문제 유형 → 영역 (성조별·글자별을 영역마다 따로 세려고, 2026-09-30 밤) ── */
const MODE_SUBJ = { card: 'say', write_ko: 'spell', say: 'say', say_ko: 'say', shadow: 'say', say_pic: 'say', recall: 'say', sayself: 'say',
                    listen: 'ear', listen_ko: 'ear', tone: 'ear', pic_tf: 'ear', pic4: 'ear',
                    read: 'read', read_ko: 'read', match: 'read', cloze: 'read', tf: 'read', err: 'read', gpat: 'read', gcloze: 'read', puzzle: 'read', puzzle_ko: 'read', puzzle_vi: 'read',
                    type: 'spell', dictation: 'spell', hand: 'spell', dict: 'spell' };
const subjOfMode = m => MODE_SUBJ[m] || null;
/* 글자별 기록 — 목표와 내가 쓴(또는 폰이 알아들은) 것을 음절마다 견줘 **처음 어긋난 글자**를 센다 (쓰기 ltrw · 말하기 ltrs).
   맞은 글자는 세지 않는다 — 비율이 아니라 '어느 글자에서 자주 어긋나나'만 본다 (2026-09-30 밤, 대표님: "알파벳별 기록도 필요하니?") */
function noteLetters(want, got, box) {
  if (!want || !got) return;
  const a = String(want).trim().toLowerCase().normalize('NFC').split(/\s+/), b = String(got).trim().toLowerCase().normalize('NFC').split(/\s+/);
  a.forEach((sa, i) => {
    const sb = b[i] || ''; if (sa === sb) return;
    const ca = [...sa], cb = [...sb]; let j = 0; while (j < ca.length && ca[j] === cb[j]) j++;
    const ch = ca[j] || ca[ca.length - 1];
    if (ch && /[a-zđăâêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/.test(ch)) bump(box, ch, false);
  });
}
/* ── 하루 단위 집계 (분석의 시간 축, 2026-09-30 밤) ──
   누적 계수기(다섯 영역 *All/*Ok · tn·md·lvt·serr·od·ltrw·ltrs·tn_영역 · skipN·guessN·ansN·ms·msN)가 **오늘 늘어난 만큼**을 S.stats.day[날짜]에 적는다.
   save() 한 곳에서만 잰다 — 계수기가 30군데 흩어져 있어 하나씩 손대면 빠뜨린다. 다른 기기 진도를 받아 합친 직후에는 늘어난 것이 내가 오늘 한 게 아니므로
   tallyReset() 으로 기준만 새로 잡는다. 그날의 외운 단어 수(memo)·배운 단어 수(learned)는 상태값이라 그대로 적는다.
   하루 30~60개 숫자(0.5~1KB) → 1년 300KB. 기기끼리는 날짜별 열쇠마다 큰 쪽을 취한다(mergeProg deep). */
const TALLY_BOX = ['tn', 'md', 'lvt', 'serr', 'od', 'ltrw', 'ltrs', 'tn_say', 'tn_ear', 'tn_read', 'tn_spell', 'tn_memo', 'smd', 'gr', 'stone', 'stone_u', 'pj'];   // stone·stone_u·pj: 말하기 세부 (2026-10-02)
function tallyCur() {
  const t = S.stats || {}, cur = {};
  SUBJ.forEach(x => { cur[x.ok] = t[x.ok] || 0; cur[x.all] = t[x.all] || 0; });
  ['skipN', 'guessN', 'ansN', 'ms', 'msN', 'said', 'drill', 'sentAll', 'sentOk'].forEach(k => { cur[k] = t[k] || 0; });
  TALLY_BOX.forEach(bx => Object.entries(t[bx] || {}).forEach(([k, v]) => {
    if (v && typeof v === 'object') { cur[bx + ':' + k + ':ok'] = v.ok || 0; cur[bx + ':' + k + ':all'] = v.all || 0; } else cur[bx + ':' + k + ':all'] = v || 0;
  }));
  return cur;
}
function tallyReset() { if (S.stats) S.stats._last = tallyCur(); }
function dayTally() {
  const t = S.stats; if (!t) return;
  const cur = tallyCur(), prev = t._last;
  if (!prev) { t._last = cur; return; }
  let b = null;
  for (const k in cur) {
    const dv = cur[k] - (prev[k] || 0);
    if (dv > 0) { if (!b) { const day = t.day || (t.day = {}), d = ymd(); b = day[d] || (day[d] = {}); } b[k] = (b[k] || 0) + dv; }
  }
  t._last = cur;
  if (b) { b.memo = Object.values(S.srs || {}).filter(v => v.lv >= 2).length; b.learned = Object.keys(S.srs || {}).length; b.memo2 = memoCount(); }   // memo2: 세 창고 다 (2026-10-02)
}
/* 채점은 잘게 나눌수록 분석이 깊어진다. 다만 한 문제에 조회는 한 번만 한다 —
   allWords()가 1000개짜리 배열을 훑기 때문에 문제마다 여러 번 부르면 폰이 느려진다. */
const HARDLTR = ['ư', 'ơ', 'ă', 'â', 'ê', 'ô', 'đ'];
/* 성조 부호만 뗀 모양. "성조만 틀렸나 글자를 틀렸나"를 가르는 데 쓴다 */
const bare = t => t.trim().toLowerCase().split(/\s+/).map(stripTone).join(' ');
/* 창고가 섞인 판(테스트 탭 '배운 단어 전체')은 단어마다 제 창고에 적는다 — opt.boxOf(vi) 가 창고 이름을 준다.
   그래야 GYBM 단어이 하루 5분 창고(S.srs)로 새어 들어가지 않는다 (복습은 섞이지 않게 — 대표님 지시). */
function grade(vi, ok, early) {
  if (typeof Q !== 'undefined' && Q && Q.list && Q.list[Q.i]) { Q.list[Q.i]._ans = true; hideSkip(); }   // 답이 통계에 들어갔다 — 이제 못 넘긴다
  const bx = (typeof Q !== 'undefined' && Q && Q.opt && Q.opt.boxOf) ? Q.opt.boxOf(vi) : null;
  const s0 = SBOX;
  if (bx) SBOX = bx;
  try { grade0(vi, ok, early); } finally { SBOX = s0; }
}
function grade0(vi, ok, early) {
  touchToday();
  if (typeof Q !== 'undefined' && Q && Q.daily) { const r0 = srsBox()[vi]; early = !!(r0 && r0.due > now()); }   // 매일 단어 시험: 새 낱말은 창고로, 기한 전 낱말은 사다리 그대로 (2026-09-30)
  // 암기 점수용 계수기 — 인출 시도와 성공을 센다
  S.stats.qAll = (S.stats.qAll || 0) + 1;
  if (ok) S.stats.qOk = (S.stats.qOk || 0) + 1;

  const w = allWords().find(x => x.vi === vi);
  bump('tn', (w && (w.tones || [])[0] || {}).name || null, ok);          // 성조별
  { const md = (typeof Q !== 'undefined' && Q && Q.list && Q.list[Q.i]) ? Q.list[Q.i].mode : null, sb = subjOfMode(md);   // 영역별 성조 (분석 v2, 2026-09-30 밤)
    if (sb) bump('tn_' + sb, (w && (w.tones || [])[0] || {}).name || null, ok); }
  const syl = vi.trim().split(/\s+/).length;
  bump('syl', syl === 1 ? '1음절' : syl === 2 ? '2음절' : '3음절+', ok);   // 길이별
  if (HARDLTR.some(c => vi.includes(c))) bump('ltr', '어려운 모음·đ', ok); // ư ơ ă â ê ô đ 가 든 단어
  const r0 = srsBox()[vi];
  if (!early && r0) {
    bump('lv', '사다리 ' + (r0.lv || 0) + '단', ok);                      // 복습 단계별
    const od = r0.due ? now() - r0.due : -1;
    if (od >= 0) bump('od', od < DAY ? '제때' : od < 4 * DAY ? '1~3일 밀림'
                          : od < 8 * DAY ? '4~7일 밀림' : '8일 넘게 밀림', ok);
    if (od >= 0 && od < DAY) bump('lvt', String(r0.lv || 0), ok);        // 제때 푼 것만 — 간격별 기억률 (복습 간격 보정의 근거, 2026-09-30)
  }
  if (!ok) {                                          // 자주 틀리는 단어
    const m = missBox();
    m[vi] = (m[vi] || 0) + 1;
  } else if (missBox()[vi]) {
    const m = missBox(), was = m[vi];
    m[vi] = Math.max(0, was - 0.5);                           // 맞히면 서서히 지워진다
    /* 오답노트에서 완전히 빠지는 순간을 센다 — 5개를 잡을 때마다 점수.
       '틀린 걸 고쳤다'는 게 점수를 주기에 가장 옳은 순간이다(그냥 많이 푸는 것보다). */
    if (was > 0 && m[vi] === 0) {
      earn(CRD.fix, tr('자주 틀리던 단어를 잡았습니다'));
    }
  }
  if (early && ok) { save(); return; }   // 예정보다 일찍 꺼내 맞힌 건 사다리를 안 올린다
  const r = srsBox()[vi] || { lv: 0, first: now() };
  if (!r.first) r.first = now();
  r.lv = ok ? Math.min(r.lv + 1, STEPS.length - 1) : Math.max(0, r.lv - 2);
  r.due = now() + stepDays(r.lv) * DAY;                 // 고정 간격에 개인 보정을 조금 얹은 값 (stepDays)
  r.t = now();                          // 마지막으로 푼 때 — 두 기기 진도를 합칠 때 더 나중 것을 고른다 (mergeProg)
  r.h = ((r.h || '') + (ok ? '1' : '0')).slice(-8);   // 낱말별 이력 — 마지막 8번 (1 맞음·0 틀림). 낱말마다 잘 잊는지 보는 재료 (2026-09-30)
  srsBox()[vi] = r;
  save();
}

/* ── 복습 간격의 개인 보정 (대표님 물음 2026-09-30: "복습 간격이 사람마다 다르니? 성적을 분석해서 조금 조절하되 고정에서 하루쯤만 벗어나게") ──
   근거는 S.stats.lvt — 그 단계의 간격을 **제때** 기다린 뒤 푼 문제의 정답률(밀린 뒤 푼 것은 간격 탓인지 밀린 탓인지 모르니 뺀다).
   10문제가 넘은 단계만 본다(NEED). 정답률 70% 미만이면 그 단계 간격을 줄이고, 95% 이상이면 늘린다. 벗어나는 폭은 STEP_BOUND —
   1·3·7·14일 단계는 하루, 30·60일 단계는 사흘. 최소 하루. 화면(실력 분석)에 '복습 간격 조정 — 3일 → 2일 (3일 뒤 정답률 62%, 14문제)'로 보인다. */
const STEP_BOUND = [1, 1, 1, 1, 3, 3];
function stepDays(lv) {
  const base = STEPS[lv] || STEPS[STEPS.length - 1];
  const c = ((S.stats || {}).lvt || {})[String(lv)];
  if (!c || c.all < NEED) return base;
  const p = c.ok / c.all, b = STEP_BOUND[lv] || 1;
  return Math.max(1, base + (p < .7 ? -b : p >= .95 ? b : 0));
}

function finishQuiz() {
  $('#quizFill').style.width = '100%';
  if (Q.exam) return Q.daily ? finishDaily() : finishWeekly();
  const sk = Q.skip || 0, halfSkipped = sk * 2 > Q.total;     // 절반 넘게 넘긴 판은 복습 도장·복습 크레딧을 주지 않는다 — 판을 넘긴 것이지 복습한 것이 아니다
  if (!Q.day) {
    if (!halfSkipped) {
      S.stats.rev = (S.stats.rev || 0) + 1;                          // 복습 판 수 (업적용)
      earnOnce('rev', CRD.rev, tr('복습을 끝냈습니다'));
      if (!Q.early) S.revDay = ymd();                                // 오늘 복습을 끝냈다는 도장
    }
    save();
    cloudSave(true);                       // 복습을 마쳤으니 서버에도 남긴다 (버튼 없이 자동)
  }
  const n = Q.ok, t = Q.total - sk;                            // 넘긴 문제는 분모에서 뺀다 — 푼 것만 성적이다
  const again = Q.list.length - Q.total;
  const r = el('div', 'result');
  if (n === t && t > 0 && !sk) {   // 다 맞힌 날은 축하가 있어야 한다 (넘긴 게 있으면 '다' 맞힌 게 아니다)
    r.classList.add('perfect');
    const cf = el('div', 'confetti');
    for (let i = 0; i < 14; i++) { const s = el('i'); s.style.setProperty('--i', i); cf.append(s); }
    r.append(cf);
    fxTone(true);
  }
  r.append(el('div', 'n', n + ' / ' + t));
  if (again) r.append(el('div', 'sub', again + '개는 그 자리에서 한 번 더 물었습니다'));
  if (sk) r.append(el('div', 'sub', tr('N개는 스킵했습니다 — 성적에 넣지 않았고, 다음 복습에 다시 나옵니다').replace('N', sk)));
  r.append(el('div', null, !t ? tr('이번엔 다 스킵했습니다. 스킵한 건 외운 것으로 치지 않습니다') :
    n === t ? (sk ? tr('답한 것은 전부 맞혔습니다') : '전부 맞혔습니다') :
    n >= t * .7 ? '좋습니다. 틀린 건 내일 다시 나옵니다' :
      '틀린 건 내일 다시 나옵니다. 처음엔 다 그렇습니다'));
  const soon = Object.values(srsBox()).map(v => v.due).filter(d => d > now()).sort((a, b) => a - b)[0];
  if (soon) {
    const days = Math.max(1, Math.round((soon - now()) / DAY));
    r.append(el('p', 'note', `다음 복습은 ${days}일 뒤입니다. 잊기 직전에 다시 꺼내야 오래 남습니다.`));
  }
  const left = Q.day || Q.noMore ? 0 : dueWords().length;
  if (left) {
    const more = el('button', 'primary big', '이어서 ' + Math.min(left, qN()) + '개 더');
    more.style.marginTop = '20px'; more.style.width = '100%';
    more.onclick = () => startQuiz(null, null);
    r.append(more);
    r.append(el('p', 'note', '남은 복습 ' + left + '개. 지금 끝내도 됩니다 — 답한 단어는 이미 저장됐습니다.'));
  }
  const hasDlg = Q.day && Q.day.dialog;
  const b = el('button', 'primary big', hasDlg ? '문장으로 써먹기 ›' : Q.day ? '오늘 완료' : '홈으로');
  b.style.marginTop = '24px';
  b.onclick = () => {
    if (hasDlg) { startDialog(Q.day); return; }
    if (Q.day) { (Q.day.senior ? (S.sdone = S.sdone || {}) : Q.day.basic ? (S.bdone = S.bdone || {}) : S.done)[Q.day.day] = now();
                 addSetSentences(Q.day.words);           // 그 과 예문 3개를 문장 문제로 (2026-09-28)
                 touchToday(); save();
                 r.textContent = ''; r.append(el('div', 'n', tr('세트 완료'))); afterSetBtns(r, Q.day); return; }   // 다음 세트 · 목록으로 (2026-09-27 밤)
    dailyFlowEntry();
  };
  r.append(b);
  $('#quizBody').textContent = '';
  $('#quizBody').append(r);
}


/* ---------- 실전 단어 (GYBM 20기가 실제로 본 시험) ----------
   왜 하루 5분 밑이 아니라 **따로**인가 (대표님 지시): 복습이 섞이면 안 된다.
   창고도 따로(S.ssrs), 진도도 따로(S.sdone)다 — 위 SBOX 주석을 보라.
   자료는 228KB 라 **누를 때 받는다.** 홈 화면을 늦추면 안 된다. */
let SENIOR = null;
const sdone = () => (S.sdone = S.sdone || {});
/* ---------- 성조 훈련 (미니멀 페어) ----------
   성조만 다르고 나머지는 같은 단어를 소리로만 구별시킨다.
   시판 앱 대부분이 빠뜨린 부분이고, 성조 습득 연구가 가리키는 표준 훈련법이다. */
let T = null;

/* 모음 구별 듣기 — 한국인이 가장 오래 헷갈리는 o/ô/ơ · u/ư · a/ă 를 귀로 가른다 */
let VD = null;
/* 귀로 구별하기 — 장마다(모음 P1·겹모음 P4·받침 P5·헷갈리는 소리 P6) 묶음 안의 비슷한 소리를 듣고 고른다.
   2026-09-28: 모음 묶음(voweldrill)이 8월 24일 재조립 때 빈 목록이 되어 문제가 0개였다 → tools/build_basics.py 의 eardrill 로 되살리고 넓힘 */
const EAR_INTRO = {
  P1: "글자는 아는데 소리가 다른 모음들입니다. o 입 크게 '오' · ô 오므린 '오' · ơ '어' · ư 입술 편 '으' — 귀에만 익히면 됩니다.",
  P4: "겹모음 — a 가 긴가 짧은가(ai·ay, ao·au)와 입술 모양(ua·ưa, oi·ôi·ơi)을 귀로 가릅니다.",
  P5: "받침 — 끝소리 -n·-ng·-nh, -t·-c·-ch 를 귀로 가릅니다. 짧은 소리라 여러 번 들어도 됩니다.",
  P6: "헷갈리는 첫소리 — 북부에서도 서로 다른 소리들(l·n, t·th, b·v, c·kh, n·ng, đ·d)입니다.",
};
function startEar(key) {
  const k = key || 'P1';
  const groups = (EAR && EAR[k] && EAR[k].length) ? EAR[k] : (k === 'P1' ? VDRILL : []);
  const qs = [];
  groups.forEach(g => g.items.forEach(it => qs.push({ g, it })));
  VD = { key: k, list: qs.sort(() => Math.random() - .5).slice(0, 10), i: 0, ok: 0 };
  drawVowel();
  const d = ALL.find(x => x.day === k);
  show('tone', d ? d.theme : '모음', true);
}
function drawVowel() {
  const body = $('#toneBody');
  body.textContent = '';
  if (VD.i >= VD.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', VD.ok + ' / ' + VD.list.length));
    r.append(el('div', null, VD.ok >= 7 ? '귀에 들어오고 있습니다' : (VD.key === 'P1' ? '괜찮습니다. u와 ư는 원래 오래 걸립니다' : '괜찮습니다. 여러 번 들으면 차이가 들리기 시작합니다')));
    const b2 = el('button', 'primary big', '다시 하기'); b2.style.marginTop = '16px'; b2.onclick = () => startEar(VD.key);
    const h2 = el('button', 'ghost big', '홈으로'); h2.style.marginLeft = '8px'; h2.onclick = renderHome;
    r.append(b2, h2); body.append(r); return;
  }
  const { g, it } = VD.list[VD.i];
  if (VD.i === 0) {
    body.append(el('div', 'intro', EAR_INTRO[VD.key] || EAR_INTRO.P1));
    const d0 = ALL.find(d => d.day === VD.key);
    const rb = el('button', 'ghost sm', (d0 ? d0.theme : '모음') + ' 소개 다시 보기');
    rb.onclick = () => startLearn(d0 || ALL.find(d => d.day === 'P1'));
    body.append(rb);
  }
  body.append(el('div', 'q', `${VD.i + 1} / ${VD.list.length} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', esc(g.note)));
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기'); b.onclick = () => play(it.vi, false);
  wrap.append(b); body.append(wrap);
  play(it.vi, false);
  const opts = el('div', 'opts tonelist');
  g.items.forEach(o => {
    const btn = el('button');
    btn.append(el('span', 'tvi', esc(o.vi)), el('span', 'tko', esc(o.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = o.vi === it.vi;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.querySelector('.tvi').textContent === it.vi) x.dataset.r = 'ok';
      });
      S.stats.earAll = (S.stats.earAll || 0) + 1;
      S.stats.drill = (S.stats.drill || 0) + 1;
      if (good) S.stats.earOk = (S.stats.earOk || 0) + 1;
      else bump('conf', it.vi + ' → ' + o.vi, false);   // 무엇을 무엇으로 잘못 들었나
      save();
      if (good) VD.ok++;
      nextBtn(body, () => { VD.i++; drawVowel(); });
    };
    opts.append(btn);
  });
  body.append(opts);
}

/* 성조는 버튼 하나 — 처음이면 소개 카드(준비 2)부터, 그 뒤로는 바로 훈련 */

/* 모음도 버튼 하나 — 처음이면 모음 카드(준비 1)부터, 그 뒤로는 바로 구별 훈련.
   자음은 카드만 있고 '구별 훈련'이 없는 것은 의도다: 북부 표준에서
   tr=ch, s=x, d=gi=r이 같은 소리로 합쳐져 귀로 가르는 훈련이 성립하지 않는다. */

/* 한 세션 = 듣고 구별 6문제 + 들은 소리에 부호 붙이기 4문제 (같은 귀의 두 얼굴) */
function startTone() {
  const qs = [];
  DRILL.forEach(g => g.items.forEach(it => qs.push({ kind: 'pair', g, it })));
  const pairs = qs.sort(() => Math.random() - .5).slice(0, 6);
  const marks = markPool().sort(() => Math.random() - .5).slice(0, 4)
    .map(w => ({ kind: 'mark', w }));
  T = { list: [...pairs, ...marks].sort(() => Math.random() - .5), i: 0, ok: 0 };
  show('tone', '성조', true);      // show 가 소리를 멈추므로 화면부터 연다 — 전엔 첫 문제 소리가 끊겼다
  drawTone();
}

function drawTone() {
  const body = $('#toneBody');
  body.textContent = '';
  if (T.i >= T.list.length) return finishTone();
  const item = T.list[T.i];
  if (T.i === 0) body.append(el('div', 'intro',
    '같은 글자에 성조만 다른 단어들입니다. 높낮이만 귀로 가립니다 — 부호 붙이기 문제도 섞여 나옵니다.'));
  if (item.kind === 'mark') return drawToneMark(body, item.w);
  const { g, it } = item;

  body.append(el('div', 'q', `${T.i + 1} / ${T.list.length} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', `글자는 모두 <b>${esc(g.base)}</b> 로 같습니다. 성조만 다릅니다.`));

  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  /* 성조 문제만은 **일부러 북부 소리로** 낸다 (고치지 마라).
     남부는 hỏi 와 ngã 를 한 소리로 합쳐 버린다. 그런데 이 훈련에는 둘 다 나온다
     (days.json tonedrill: ngang·huyền·sắc·hỏi·ngã·nặng). 남부로 내면 두 답이
     똑같이 들려 **문제 자체가 성립하지 않는다.** 남녀는 고른 대로 따라간다. */
  b.onclick = () => play(it.vi, false, S.voice);
  wrap.append(b);
  body.append(wrap);
  play(it.vi, false, S.voice);

  const opts = el('div', 'opts tonelist');
  g.items.forEach(o => {
    const btn = el('button');
    btn.append(el('span', 'tvi', esc(o.vi)),
               el('span', 'tmark', toneArrow(o.mark)),
               el('span', 'tko', esc(o.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = o.vi === it.vi;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.querySelector('.tvi').textContent === it.vi) x.dataset.r = 'ok';
      });
      S.stats.earAll = (S.stats.earAll || 0) + 1;
      S.stats.drill = (S.stats.drill || 0) + 1;
      if (good) S.stats.earOk = (S.stats.earOk || 0) + 1;
      else bump('conf', it.vi + ' → ' + o.vi, false);   // 무엇을 무엇으로 잘못 들었나
      save();
      if (good) T.ok++;
      nextBtn(body, () => { T.i++; drawTone(); });
    };
    opts.append(btn);
  });
  body.append(opts);
  if (T.i === 0) {
    const rb = el('button', 'ghost sm', '성조 6개 소개 다시 보기');
    rb.style.marginTop = '14px';
    rb.onclick = () => startLearn(ALL.find(d => d.day === 'P2'));
    body.append(rb);
  }
}

/* 배운 단어의 성조 부호 고르기 — 성조 세션의 두 번째 문제 유형 */
function drawToneMark(body, w) {
  const want = w.tones[0].name;
  body.append(el('div', 'q', `${T.i + 1} / ${T.list.length} · 듣고 성조 부호를 고르세요`));
  const bare = stripTone(w.vi);
  const pos = tonePos(w.vi);
  body.append(el('div', 'markbare', esc(bare)));

  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => play(w.vi, false);
  wrap.append(b);
  body.append(wrap);

  const opts = el('div', 'opts markopts');
  MARKS.forEach(mk => {
    const shown = withMark(bare, mk.m, pos);
    const btn = el('button');
    btn.dataset.tone = mk.name;
    btn.append(el('span', 'mkvi', esc(shown)),
               el('span', 'gt ' + mk.name, toneArrow(mk.name)),
               el('span', 'mkko', esc(mk.ko)));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = mk.name === want;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.dataset.tone === want) x.dataset.r = 'ok';
      });
      S.stats.earAll = (S.stats.earAll || 0) + 1;
      S.stats.drill = (S.stats.drill || 0) + 1;
      if (good) { T.ok++; S.stats.earOk = (S.stats.earOk || 0) + 1; }
      else bump('conf', want + ' → ' + mk.name, false);
      grade(w.vi, good);
      nextBtn(body, () => { T.i++; drawTone(); });
    };
    opts.append(btn);
  });
  body.append(opts);
  play(w.vi, false);
}

function finishTone() {
  const n = T.ok, t = T.list.length;
  if (n > (S.stats.toneBest || 0)) { S.stats.toneBest = n; save(); }
  touchToday();
  const r = el('div', 'result');
  r.append(el('div', 'n', n + ' / ' + t));
  r.append(el('div', null, n >= 7 ? '소리가 들리기 시작했습니다'
    : n >= 4 ? '보통입니다. 성조는 몇 주 걸립니다'
    : '괜찮습니다. 처음엔 아무도 못 구별합니다'));
  r.append(el('p', 'note', '가장 어려운 건 hỏi(내렸다 올림)와 ngã(끊었다 올림)입니다. 이 둘은 원어민도 지역에 따라 섞어 씁니다.'));
  r.append(el('div', 'rule',
    '<b>✍️ 일주일에 한 번은 손으로 써보세요.</b><br>' +
    '종이에 <b>à á ả ã ạ</b> 를 다섯 번씩. 눈으로만 보면 hỏi와 ngã가 끝까지 안 구별됩니다.'));
  const b = el('button', 'primary big', '다시 하기');
  b.style.marginTop = '18px';
  b.onclick = startTone;
  const h = el('button', 'ghost big', '홈으로');
  h.style.marginTop = '10px'; h.style.marginLeft = '8px';
  h.onclick = renderHome;
  const tt = el('button', 'ghost big', '성조 테스트로 더 연습');     // 테스트 탭의 성조 테스트(여러 낱말·여남 목소리)로 이어진다
  tt.style.marginTop = '10px'; tt.style.marginLeft = '8px';
  tt.onclick = startToneTest;
  r.append(b, h, tt);
  $('#toneBody').textContent = '';
  $('#toneBody').append(r);
}


/* ── 성조 테스트 (대표님 지시 2026-09-28: "성조 테스트만 따로 — 성조를 어려워함. 계속 들으면 차이가 조금 느껴지는 것 같다") ──
   근거: 성조가 없는 말을 쓰는 사람도 '듣고 고르기 → 곧바로 정답'을 짧게 되풀이하면 구별력이 오른다
   (Wang·Spence·Jongman·Sereno 1999, 중국어 성조 2주 훈련 — 여러 낱말·여러 목소리로 해야 처음 듣는 낱말에도 통한다).
   · 문제: 소리 하나를 듣고, 글자는 같고 성조만 다른 보기 중에서 고른다.
     자료는 data/tonetest.json (tools/build_tonetest.py — 짝 사전 t 에서 여·남 녹음이 다 있는 낱말만).
   · 목소리: 여·남을 섞는다 — **이 테스트만의 예외**다(한 목소리만 들으면 그 목소리에만 익숙해진다).
     북부 소리만 쓴다(남부는 hỏi·ngã 가 합쳐져 문제가 성립하지 않는다 — 위 성조 세션과 같은 이유).
   · 틀리면 정답 → 고른 것 순서로 이어 들려준다(차이를 귀에 새기는 자리). 맞히면 저절로 넘어간다.
   · 단계: 보기 2개에서 시작. 최근 10문제 중 8개를 맞히면 보기를 하나 늘리고, 최근 6문제 중 2개 이하면 하나 줄인다.
     그만큼 큰 묶음이 20개 넘게 있을 때까지만 늘린다.
   · 자주 헷갈리는 성조 쌍(S.tt.cf)을 보기로 더 자주 붙이고, 자주 틀리는 성조(S.tt.tn)를 문제로 더 자주 낸다.
   모음 모자 (대표님 지시 2026-09-29: "모음 모자도 성조처럼 헷갈림. 성조만 맞춰야 할 수도, 모자만, 둘 다 맞춰야 할 수도"):
   · 갈래 셋 — t 성조만(위 그대로) · s 모자만(성조는 같고 a/ă/â·e/ê·o/ô/ơ·u/ư 만 다름, 예 thuốc/thước)
     · k 둘 다(chắc/chác/chặc…). 자료는 tonetest.json 의 f·s·k (짝 사전 t·s·k, 자음이 다른 d/đ 는 한 문제에 안 섞음).
   · 갈래마다 단계·틀린 기록을 따로 둔다(S.tt = 성조만, S.tt.s·S.tt.k). 한 낱말 = [글자, 성조, 뜻, 모음].
   · '둘 다'는 보기가 셋 이상이면 모자가 다른 보기와 성조가 다른 보기를 적어도 하나씩 넣는다. */
let TTJ = null, TTP = null, TT = null;
function ttLoad() {
  if (TTJ) return Promise.resolve(TTJ);
  if (!TTP) TTP = fetch('data/tonetest.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => (TTJ = j)).catch(() => { TTP = null; return null; });
  return TTP;
}
const TT_MODES = [['t', '성조만'], ['s', '모자만'], ['k', '둘 다']];
const ttMode = () => (TT_MODES.some(m => m[0] === S.ttMode) ? S.ttMode : 't');
const ttFams = () => (TTJ && TTJ[ttMode() === 't' ? 'f' : ttMode()]) || [];
const ttS = () => {
  const b = S.tt || (S.tt = { lv: 2, r: [], tn: {}, cf: {} });
  const m = ttMode();
  return m === 't' ? b : (b[m] || (b[m] = { lv: 2, r: [], tn: {}, cf: {} }));
};
/* 문제의 '갈래 값' — 성조만이면 성조, 모자만이면 모음, 둘 다면 모음+성조. 보기끼리 이것이 다르다 */
const ttCat = x => { const m = ttMode(); return m === 't' ? x[1] : m === 's' ? x[3] : x[3] + ' ' + x[1]; };
function ttLabel(c) {                           // 표·안내에 쓰는 이름
  const m = ttMode();
  if (m === 't') return toneArrow(c) + ' ' + esc(c) + ' <small>' + esc(SIB_KO[c]) + '</small>';
  if (m === 's') return tr('모음') + ' <b>' + esc(c) + '</b>';
  const [v, t] = c.split(' ');
  return tr('모음') + ' <b>' + esc(v) + '</b> · ' + toneArrow(t) + ' <small>' + esc(SIB_KO[t]) + '</small>';
}
/* '둘 다'는 보기가 셋부터다 — 정답과 **모자만** 다른 보기 하나, **성조만** 다른 보기 하나가 함께 있어야
   한쪽만 들어서는 못 맞힌다(보기 둘이면 어느 한쪽만 듣고도 가려진다). 그런 짝이 둘 다 있는 낱말만 정답으로 낸다. */
const ttMinLv = () => 3;   // 난이도 올림 (대표님 2026-10-05 "성조와 모자 테스트 난이도 약간 더 높여도 된다") — 보기 둘(반반 찍기)은 없앴다
const ttAnchor = (f, x) => ttMode() !== 'k'
  || (f.some(y => y[1] === x[1] && y[3] !== x[3]) && f.some(y => y[3] === x[3] && y[1] !== x[1]));
function ttMaxLv() {
  let lv = ttMinLv();
  const fs = ttFams();
  for (let k = lv + 1; k <= 6; k++) if (fs.filter(f => f.length >= k).length >= 20) lv = k;
  return lv;
}
function startToneTest() {
  ttLoad().then(() => {
    if (!ttFams().length) { popup(tr('성조 문제를 불러오지 못했습니다')); return; }
    const st = ttS();
    if (!st.v2) { st.v2 = 1; st.lv = Math.max(st.lv || 0, 4); st.r = []; }   // 2026-10-05: 처음엔 보기 4개부터 (전엔 2개). 한 번만 올려 둔다
    st.lv = Math.max(ttMinLv(), Math.min(st.lv || 4, ttMaxLv()));
    TT = { i: 0, n: qN(), ok: 0, used: new Set(), log: [], tok: 0 };
    show('tone', '성조·모자 테스트', true);     // show 가 소리를 멈추므로 화면부터 연다 — 그다음 첫 소리
    drawToneTest();
  });
}
function ttPick() {
  const st = ttS(), lv = st.lv, m = ttMode();
  const fams = ttFams().filter(f => f.length >= lv && f.some(x => ttAnchor(f, x)));
  const cats = [...new Set(fams.flatMap(f => f.filter(x => ttAnchor(f, x)).map(ttCat)))];
  // 갈래 값마다 무게 — 기본 1, 세 번 이상 푼 것은 틀린 비율만큼 더, 아직 덜 푼 것은 조금 더
  const wt = t => { const c = st.tn[t]; return 1 + (c && c.all >= 3 ? 4 * (1 - c.ok / c.all) : .6); };
  let r = Math.random() * cats.reduce((a, t) => a + wt(t), 0), tgt = cats[0];
  for (const t of cats) { r -= wt(t); if (r <= 0) { tgt = t; break; } }
  let pool = fams.filter(f => f.some(x => ttCat(x) === tgt && ttAnchor(f, x)));
  const fresh = pool.filter(f => !TT.used.has(f[0][0]));
  if (fresh.length) pool = fresh;
  const fam = pool[Math.floor(Math.random() * pool.length)];
  TT.used.add(fam[0][0]);
  const ans = fam.find(x => ttCat(x) === tgt && ttAnchor(fam, x));
  const conf = x => (st.cf[tgt + '>' + ttCat(x)] || 0) + (st.cf[ttCat(x) + '>' + tgt] || 0);
  const ranked = fam.filter(x => x !== ans).map(x => ({ x, s: conf(x) + Math.random() * 1.5 }))
    .sort((a, b) => b.s - a.s).map(o => o.x);
  const others = [];
  if (m === 'k')                                // 모자만 다른 보기 하나, 성조만 다른 보기 하나는 꼭 (ttAnchor 가 있음을 보장)
    [x => x[1] === ans[1] && x[3] !== ans[3], x => x[3] === ans[3] && x[1] !== ans[1]]
      .forEach(p => { const c = ranked.find(o => p(o) && !others.includes(o)); if (c) others.push(c); });
  ranked.forEach(o => { if (others.length < lv - 1 && !others.includes(o)) others.push(o); });
  const opts = m === 't' ? [ans, ...others].sort((a, b) => SIB_T.indexOf(a[1]) - SIB_T.indexOf(b[1]))
                         : [ans, ...others].sort((a, b) => fam.indexOf(a) - fam.indexOf(b));   // 묶음 차례 = 모음 → 성조
  return { ans, opts, dir: Math.random() < .5 ? 'f' : 'm' };
}
function drawToneTest() {
  const body = $('#toneBody');
  body.textContent = '';
  if (TT.i >= TT.n) return finishToneTest();
  const st = ttS(), q = ttPick(), tok = ++TT.tok, m = ttMode();
  if (TT.i === 0) {
    const pick = el('div', 'catpick');            // 갈래 고르기 — 바꾸면 새 판
    TT_MODES.forEach(([k, nm]) => {
      const c = el('button', 'catchipbtn' + (k === m ? ' on' : ''), tr(nm));
      c.type = 'button';
      c.onclick = () => { if (k === ttMode()) return; S.ttMode = k; save(); startToneTest(); };
      pick.append(c);
    });
    body.append(pick);
    body.append(el('div', 'intro', m === 't'
      ? '소리 하나를 듣고, 글자는 같고 성조만 다른 보기 중에서 고르세요. 틀리면 정답과 고른 것을 이어서 들려줍니다.'
      : m === 's'
      ? '소리 하나를 듣고, 성조는 같고 모음 모자(ă·â·ê·ô·ơ·ư)만 다른 보기 중에서 고르세요. 틀리면 정답과 고른 것을 이어서 들려줍니다.'
      : '소리 하나를 듣고, 모음 모자도 성조도 섞인 보기 중에서 고르세요. 틀리면 정답과 고른 것을 이어서 들려줍니다.'));
  }
  body.append(el('div', 'q', `${TT.i + 1} / ${TT.n} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', `보기 ${st.lv}개 · ${q.dir === 'f' ? '여자' : '남자'} 목소리`));
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => play(q.ans[0], false, q.dir);
  const sl = el('button', 'ghost', '느리게');
  sl.onclick = () => play(q.ans[0], true, q.dir);
  wrap.append(b, sl);
  body.append(wrap);
  // 보기 소리도 미리 받아 둔다 — 틀렸을 때 이어 듣기가 끊기지 않게
  q.opts.forEach(o => { const h = AIDX[o[0]]; if (h) fetch(`audio/${q.dir}/n/${h}.mp3`).catch(() => { }); });
  const opts = el('div', 'opts tonelist ttopts');
  q.opts.forEach(o => {
    const btn = el('button');
    btn.dataset.vi = o[0];
    btn.append(el('span', 'tvi', esc(o[0])),
               el('span', 'tmark', m === 't' ? toneArrow(o[1]) + ' ' + esc(SIB_KO[o[1]])
                                 : m === 's' ? tr('모음') + ' ' + esc(o[3])
                                 : tr('모음') + ' ' + esc(o[3]) + ' · ' + toneArrow(o[1]) + ' ' + esc(SIB_KO[o[1]])),
               el('span', 'tko', ''));
    btn.onclick = () => ttAnswer(body, opts, btn, o, q, tok);
    opts.append(btn);
  });
  body.append(opts);
  play(q.ans[0], false, q.dir);
}
function ttAnswer(body, opts, btn, o, q, tok) {
  [...opts.children].forEach(x => x.disabled = true);
  const st = ttS(), good = o === q.ans;
  btn.dataset.r = good ? 'ok' : 'no';
  [...opts.children].forEach(x => {                    // 답한 뒤에는 보기마다 뜻을 붙인다
    const it = q.opts.find(z => z[0] === x.dataset.vi);
    x.querySelector('.tko').textContent = it ? it[2] : '';
    if (x.dataset.vi === q.ans[0]) x.dataset.r = 'ok';
  });
  fxTone(good);
  const ca = ttCat(q.ans), co = ttCat(o);
  const c = st.tn[ca] || (st.tn[ca] = { ok: 0, all: 0 });
  c.all++; if (good) c.ok++;
  if (!good) st.cf[ca + '>' + co] = (st.cf[ca + '>' + co] || 0) + 1;
  if (ttMode() === 't') bump('tn', q.ans[1], good);     // 분석 화면의 성조별 칸에도 같이 적는다 (성조만일 때만 — 모자 문제는 성조를 가리는 문제가 아니다)
  if (!good) bump('conf', q.ans[0] + ' → ' + o[0], false);
  S.stats.earAll = (S.stats.earAll || 0) + 1;
  if (good) { S.stats.earOk = (S.stats.earOk || 0) + 1; TT.ok++; }
  TT.log.push({ t: ca, ok: good });
  const msg = ttLevel(st, good);
  touchToday(); save();
  if (msg) body.append(el('div', 'ttlv', esc(msg)));
  if (good) {
    setTimeout(() => { if (TT && TT.tok === tok && CURV === 'tone') { TT.i++; drawToneTest(); } }, msg ? 1600 : 900);
    return;
  }
  const cmp = el('div', 'ttcmp', '<div class="ttcmpt">두 소리를 이어서 들어 보세요 — 정답 다음에 고른 것</div>');
  const row = el('div', 'ttcmpb');
  const bA = el('button', 'ghost', `정답 <b>${esc(q.ans[0])}</b> ▶`);
  bA.onclick = () => play(q.ans[0], false, q.dir);
  const bB = el('button', 'ghost', `고른 것 <b>${esc(o[0])}</b> ▶`);
  bB.onclick = () => play(o[0], false, q.dir);
  const bAB = el('button', 'ghost', '둘 다 이어서 ▶');
  bAB.onclick = () => ttPair(q.ans[0], o[0], q.dir, tok);
  row.append(bA, bB, bAB);
  cmp.append(row);
  body.append(cmp);
  ttPair(q.ans[0], o[0], q.dir, tok);
  nextBtn(body, () => { TT.i++; drawToneTest(); });
}
/* 정답 → 잠깐 쉬고 → 고른 것. 다음 문제로 넘어갔으면(tok 가 바뀌었으면) 이어 틀지 않는다 */
function ttPair(a, b, dir, tok) {
  play(a, false, dir);
  audio.addEventListener('ended', () => {
    if (!TT || TT.tok !== tok || CURV !== 'tone') return;
    setTimeout(() => { if (TT && TT.tok === tok && CURV === 'tone') play(b, false, dir); }, 350);
  }, { once: true });
}
function ttLevel(st, good) {
  st.r = (st.r || []).concat(good ? 1 : 0).slice(-10);
  const sum = a => a.reduce((x, y) => x + y, 0), mx = ttMaxLv();
  if (st.r.length >= 10 && sum(st.r) >= 7 && st.lv < mx) { st.lv++; st.r = []; return `잘하고 있어요 — 이제 보기 ${st.lv}개로 늘립니다`; }
  if (st.r.length >= 6 && sum(st.r.slice(-6)) <= 2 && st.lv > ttMinLv()) { st.lv--; st.r = []; return `조금 쉽게 — 보기 ${st.lv}개로 줄입니다`; }
  return '';
}
function finishToneTest() {
  const st = ttS(), body = $('#toneBody');
  body.textContent = '';
  const r = el('div', 'result');
  r.append(el('div', 'n', TT.ok + ' / ' + TT.n));
  r.append(el('div', null, TT.ok >= TT.n * .8 ? '귀가 트이고 있어요'
    : TT.ok >= TT.n * .5 ? '좋아요. 성조는 매일 조금씩 들을 때 가장 잘 늡니다'
    : '괜찮아요. 처음엔 누구나 헷갈립니다 — 틀린 뒤 두 소리를 이어 듣는 것이 가장 도움이 됩니다'));
  const tbl = el('div', 'tttbl');                      // 이번 판 갈래 값별 (성조만이면 성조 차례, 아니면 처음 나온 차례)
  const cats = ttMode() === 't' ? SIB_T.slice() : [...new Set(TT.log.map(x => x.t))].sort();
  cats.forEach(t => {
    const L = TT.log.filter(x => x.t === t);
    if (!L.length) return;
    const k = L.filter(x => x.ok).length;
    tbl.append(el('div', 'ttrow' + (k < L.length ? ' miss' : ''),
      `<span class="ttname">${ttLabel(t)}</span><span class="ttsc">${k} / ${L.length}</span>`));
  });
  r.append(tbl);
  const pairs = {};                                    // 지금까지 가장 헷갈린 쌍(방향 없이)
  Object.entries(st.cf).forEach(([k, n]) => { const key = k.split('>').sort().join('|'); pairs[key] = (pairs[key] || 0) + n; });
  const top = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const [a, b] = top[0].split('|');
    r.append(el('p', 'note', `지금까지 가장 헷갈린 쌍: ${ttLabel(a)} ↔ ${ttLabel(b)} — ${top[1]}번. 이 쌍을 보기로 더 자주 냅니다.`));
  }
  r.append(el('p', 'note', `지금 갈래: ${esc(tr(TT_MODES.find(x => x[0] === ttMode())[1]))} · 보기 ${st.lv}개 · 여·남 목소리를 섞어 들려줍니다(북부 발음)`));
  const again = el('button', 'primary big', '한 판 더');
  again.style.marginTop = '18px';
  again.onclick = startToneTest;
  const back = el('button', 'ghost big', '테스트로');
  back.style.marginTop = '10px'; back.style.marginLeft = '8px';
  back.onclick = testHubEntry;
  r.append(again, back);
  body.append(r);
}

/* ---------- 성조 부호 도구 ----------
   ă â đ ê ô ơ ư 와 다섯 성조 부호는 로마자를 쓰는 사람에게도 새 글자 모양이라,
   눈으로만 보면 hỏi 와 ngã 가 끝까지 구별되지 않는다.
   부호 문제는 위 성조 세션에 섞여 나온다. */
const MARKS = [
  { m: '',  name: 'ngang', ko: '평평하게',   ex: 'a' },
  { m: '\u0300', name: 'huyền', ko: '내려감',   ex: 'à' },
  { m: '\u0301', name: 'sắc',   ko: '올라감',   ex: 'á' },
  { m: '\u0309', name: 'hỏi',   ko: '내렸다 올림', ex: 'ả' },
  { m: '\u0303', name: 'ngã',   ko: '끊었다 올림', ex: 'ã' },
  { m: '\u0323', name: 'nặng',  ko: '짧고 무겁게', ex: 'ạ' }
];

/* 성조·모자 단추 (대표님 2026-10-05 "사전 검색에서 베트남어로 검색할 수 있게도 해 주라 — 성조와 모자") — 한국 키보드로는 à·ơ 를 못 친다.
   단추를 누르면 **지금 치고 있는 낱말(맨 끝 음절)**에 붙는다: 성조는 그 음절의 주모음(tonePos 규칙)에, 모자는 그 음절의 맨 뒤 a·e·o·u·d 에.
   같은 단추를 한 번 더 누르면 뗀다. 모자를 바꾸면 성조는 새 자리로 옮겨 다시 단다 */
const VK_TONES = [['\u0300', 'à'], ['\u0301', 'á'], ['\u0309', 'ả'], ['\u0303', 'ã'], ['\u0323', 'ạ']];
const VK_HATS = { 'â': ['a', '\u0302'], 'ă': ['a', '\u0306'], 'ê': ['e', '\u0302'], 'ô': ['o', '\u0302'], 'ơ': ['o', '\u031b'], 'ư': ['u', '\u031b'], 'đ': ['d', ''] };
function vkEdit(word, kind, key) {
  const nfd = word.normalize('NFD'), tm = (nfd.match(/[\u0300\u0301\u0309\u0303\u0323]/) || [''])[0];
  let bare = stripTone(word);
  if (kind === 'tone') { const m = tm === key ? '' : key; return m ? withMark(bare, m, tonePos(bare)) : bare; }
  const [base, mark] = VK_HATS[key];
  const chars = [...bare];
  for (let i = chars.length - 1; i >= 0; i--) {
    const c = chars[i], lo = c.toLowerCase(), up = c !== lo;
    const root = lo.normalize('NFD')[0] === 'đ' ? 'd' : lo === 'đ' ? 'd' : lo.normalize('NFD')[0];
    if (root !== base) continue;
    let n = lo === key ? base : key;                    // 이미 그 모자면 뗀다
    chars[i] = up ? n.toUpperCase() : n; break;
  }
  bare = chars.join('');
  return tm ? withMark(bare, tm, tonePos(bare)) : bare;
}
function viKeys(inp, after) {
  const row = el('div', 'vkeys');
  /* 2026-10-06 고침(대표님 "đ 검색도 할 수 있어야"): 빈칸이거나 끝에 공백이 있으면(새 낱말) 모자 단추는 그 글자를 **넣는다**(đ·â…),
     치고 있는 낱말에 바꿀 글자가 없으면(ch + ê) 그 글자를 덧붙인다(chê). 전에는 셋 다 아무 일도 안 했다. 성조 단추는 모음이 있어야 찍힌다 */
  const hit = (kind, key) => {
    const v = inp.value, m = v.match(/(\S+)$/);
    if (!m) { if (kind === 'hat') inp.value = v + key; inp.focus(); after(); return; }
    const w = m[1], e = vkEdit(w, kind, key);
    inp.value = v.slice(0, m.index) + (e === w && kind === 'hat' ? w + key : e);
    inp.focus(); after();
  };
  VK_TONES.forEach(([mk, show]) => { const b = el('button', 'vk', show); b.type = 'button'; b.onmousedown = e => e.preventDefault(); b.onclick = () => hit('tone', mk); row.append(b); });
  row.append(el('span', 'vksep'));
  Object.keys(VK_HATS).forEach(h => { const b = el('button', 'vk', h); b.type = 'button'; b.onmousedown = e => e.preventDefault(); b.onclick = () => hit('hat', h); row.append(b); });
  return row;
}
function stripTone(syl) {
  return syl.normalize('NFD').replace(/[\u0300\u0301\u0309\u0303\u0323]/g, '').normalize('NFC');
}

/* 성조 부호는 **모음**에 붙는다. 자음에 붙이면 글자가 깨진다(c̀on ✗ / còn ✓).
   원래 단어에 부호가 있으면 그 자리를 그대로 쓰고,
   없으면(ngang) 베트남어 규칙으로 주모음을 찾는다. */
function tonePos(syl) {
  const d = syl.normalize('NFD');
  const i = d.search(/[\u0300\u0301\u0309\u0303\u0323]/);
  if (i > 0) {
    // 결합 부호를 뺀 글자 수 = NFC 기준 위치
    return [...d.slice(0, i)].filter(ch => !/[\u0300-\u036f]/.test(ch)).length - 1;
  }
  const bare = stripTone(syl);
  const V = [];
  [...bare].forEach((ch, k) => { if (/[aăâeêioôơuưy]/i.test(ch)) V.push(k); });
  if (!V.length) return -1;
  for (const k of V) if (/[ơê]/i.test(bare[k])) return k;   // ơ·ê 가 있으면 무조건 거기
  if (V.length === 1) return V[0];
  const last = V[V.length - 1];
  return last < bare.length - 1 ? last : V[V.length - 2];   // 받침이 있으면 뒤 모음, 없으면 앞 모음
}

function withMark(bare, mark, pos) {
  if (!mark || pos < 0) return bare;
  const a = [...bare];
  a[pos] = (a[pos] + mark).normalize('NFC');
  return a.join('');
}

function markPool() {
  // 배운 단어 위주. 부호 없는(ngang) 단어는 뺀다 — 제시 글자가 곧 답이 되어버린다.
  const learned = new Set();
  for (const d of ALL) {
    (d.words || []).forEach(w => learned.add(w.vi));
    if (typeof d.day === 'number' && !S.done[d.day]) break;
  }
  const ok = w => w.vi.split(' ').length === 1 && (w.tones || [])[0]
    && w.tones[0].name !== 'ngang' && AIDX[w.vi];
  const all = allWords().filter(ok);
  const mine = all.filter(w => learned.has(w.vi));
  return mine.length >= 6 ? mine : all;
}



/* ---------- 규칙 수업 4개 (기초 훈련) ----------
   읽기 자료가 아니라 다른 학습과 같은 카드 수업이다:
   예문 카드(성조 화살표·한글 발음·듣고 따라 말하기) → 연습 문제.
   규칙 설명은 카드마다 한 줄만 — 초급자는 설명보다 예문으로 배운다.
   짧고 기능 부하가 큰 규칙 넷만 다룬다. 그 이상의 문법 수업은 초급에 근거가 얇다. */
const RTONE = { ngang: '평평', 'huyền': '내려감', 'sắc': '올라감',
                'hỏi': '내렸다 올림', 'ngã': '끊었다 올림', 'nặng': '짧고 무겁게' };
const tns = s => s.split(',').map(p => {
  const [syl, name] = p.trim().split(':');
  return { syl, name, ko: RTONE[name] };
});
const RULES = [
  { key: 'R1', title: '호칭',
    intro: '한국어처럼 호칭이 있습니다. 다만 한 걸음 더 — 상대가 바뀌면 "나"를 가리키는 말도 바뀝니다.',
    cards: [
      { vi: 'Em chào anh.', ko: '(손위 남자에게) 안녕하세요', kr: '앰 짜오 아잉',
        tones: tns('Em:ngang, chào:huyền, anh:ngang'), note: '상대가 anh 손위 남자면, 나는 em' },
      { vi: 'Anh chào em.', ko: '(손아래에게) 안녕', kr: '아잉 짜오 앰',
        tones: tns('Anh:ngang, chào:huyền, em:ngang'), note: '상대가 em 손아래면, 이번엔 내가 anh' },
      { vi: 'tôi', ko: '나 (누구에게나)', kr: '또이',
        tones: tns('tôi:ngang'), note: 'tôi 저 — 잘 모르는 상대에게. 실례가 아니다' }],
    quiz: [{ q: '손위 남자에게 인사합니다. "나"는?', opts: ['em', 'anh'], a: 0, say: 'Em chào anh.' },
           { q: '손아래 직원에게 인사합니다. 이번엔 "나"는?', opts: ['anh', 'em'], a: 0, say: 'Anh chào em.' },
           { q: '처음 보는 사람 앞에서 실례 없는 "나"는?', opts: ['tôi', 'em'], a: 0 }] },
  { key: 'R2', title: '어순',
    intro: '꾸미는 말이 뒤에 옵니다. 한국어와 정반대 — 이것 하나만 뒤집으면 문장이 만들어집니다.',
    cards: [
      { vi: 'người tốt', ko: '좋은 사람', kr: '응으어이 똣',
        tones: tns('người:huyền, tốt:sắc'), note: 'người 사람 + tốt 좋은 — 꾸미는 말이 뒤' },
      { vi: 'tên của tôi', ko: '내 이름', kr: '뗀 꾸어 또이',
        tones: tns('tên:ngang, của:hỏi, tôi:ngang'), note: 'tên 이름 + của ~의 + tôi 나' },
      { vi: 'hộp này', ko: '이 상자', kr: '홉 나이',
        tones: tns('hộp:nặng, này:huyền'), note: 'hộp 상자 + này 이' }],
    quiz: [{ q: '"좋은 사람"은?', opts: ['người tốt', 'tốt người'], a: 0, say: 'người tốt' },
           { q: '"내 이름"은?', opts: ['tên của tôi', 'tôi của tên'], a: 0, say: 'tên của tôi' },
           { q: '"이 상자"는?', opts: ['hộp này', 'này hộp'], a: 0, say: 'hộp này' }] },
  { key: 'R3', title: '단위',
    intro: '숫자 뒤에는 단위가 붙습니다. 한국어의 개·마리·대와 같습니다 — 세 개면 초급은 넘어갑니다.',
    cards: [
      { vi: 'hai cái', ko: '두 개 (물건)', kr: '하이 까이',
        tones: tns('hai:ngang, cái:sắc'), note: 'cái 물건' },
      { vi: 'ba con', ko: '세 마리 (동물)', kr: '바 껀',
        tones: tns('ba:ngang, con:ngang'), note: 'con 동물' },
      { vi: 'một chiếc', ko: '한 대 (기계·탈것)', kr: '못 찌엑',
        tones: tns('một:nặng, chiếc:sắc'), note: 'chiếc 기계·탈것' }],
    quiz: [{ q: '물건 두 개 — 알맞은 쪽은?', opts: ['hai cái', 'hai con'], a: 0, say: 'hai cái' },
           { q: '동물 세 마리는?', opts: ['ba con', 'ba cái'], a: 0, say: 'ba con' },
           { q: '기계 한 대는?', opts: ['một chiếc', 'một cái'], a: 0, say: 'một chiếc' }] },
  /* R4('남부 소리' 비교 수업)는 삭제함 (대표님 지시 2026-09-09: 남부 목소리 어플에서 완전히
     제거) — 북부/남부를 맞대 듣게 하는 게 이 수업의 전부였는데, 남부 음성 자체가 없어졌다. */

  /* 겹모음 — 학원 1강에서 다룬 것. 모음 두셋이 붙어 한 덩어리로 소리 난다.
     낱글자만 알면 mưa 를 '므+아'로 끊어 읽게 된다. */
  { key: 'R5', title: '겹모음',
    intro: '모음이 둘·셋 붙어 <b>한 덩어리</b>로 소리 납니다. 끊어 읽으면 다른 말이 됩니다.',
    cards: [
      { vi: 'mưa', ko: '비 (ư+a)', kr: '므어',
        tones: tns('mưa:ngang'), note: 'ư + a → ưa. 「므아」가 아니라 한 덩어리 「므어」' },
      { vi: 'yêu', ko: '사랑하다 (y+ê+u)', kr: '이에우',
        tones: tns('yêu:ngang'), note: '모음 셋이 한 덩어리. người yêu 애인' },
      { vi: 'xoài', ko: '망고 (o+a+i)', kr: '쏘아이',
        tones: tns('xoài:huyền'), note: 'o + a + i → oai' },
      { vi: 'hươu', ko: '사슴 (ư+ơ+u)', kr: '흐어우',
        tones: tns('hươu:ngang'), note: 'ư + ơ + u → ươu. 가장 긴 덩어리' }],
    quiz: [{ q: 'mưa 는 어떻게 읽나요?', opts: ['한 덩어리로 「므어」', '끊어서 「므·아」'], a: 0, say: 'mưa' },
           { q: '「사랑하다」는?', opts: ['yêu', 'yiêu'], a: 0, say: 'yêu' },
           { q: 'xoài 의 겹모음은?', opts: ['oai', 'oài 는 겹모음이 아니다'], a: 0, say: 'xoài' }] },

  /* 숫자 예외 — 학원 4강. 21·24·25 는 규칙대로 읽지 않는다.
     돈을 세고 수량을 말할 때 매일 걸리는 대목이라 따로 세운다. */
  { key: 'R6', title: '숫자 읽는 법',
    intro: '10까지는 그대로인데 <b>21·24·25에서 말이 바뀝니다.</b> 시장과 월급에서 매일 쓰는 대목입니다.',
    cards: [
      { vi: 'hai mốt', ko: '21 — một 이 mốt 으로', kr: '하이 못',
        tones: tns('hai:ngang, mốt:sắc'), note: '21·31·41… 끝의 1은 <b>mốt</b>. hai một 이 아니다' },
      { vi: 'hai tư', ko: '24 — bốn 이 tư 로', kr: '하이 뜨',
        tones: tns('hai:ngang, tư:ngang'), note: '24·34… 끝의 4는 <b>tư</b> 가 더 흔하다' },
      { vi: 'mười lăm', ko: '15 — năm 이 lăm 으로', kr: '므어이 람',
        tones: tns('mười:huyền, lăm:ngang'), note: '15·25·35… 끝의 5는 <b>lăm</b>. mười năm 이 아니다' },
      { vi: 'hai mươi', ko: '20 — mười 이 아니라 mươi', kr: '하이 므어이',
        tones: tns('hai:ngang, mươi:ngang'), note: '10은 mười, 20·30·40은 <b>mươi</b> (성조가 없다)' },
      { vi: 'một trăm', ko: '100', kr: '못 짬',
        tones: tns('một:nặng, trăm:ngang'), note: '111 = một trăm mười một' },
      { vi: 'một nghìn', ko: '1,000 (돈)', kr: '못 응인',
        tones: tns('một:nặng, nghìn:huyền'), note: '100만은 một triệu. 값을 말할 때 늘 쓴다' }],
    quiz: [{ q: '21 을 말하면?', opts: ['hai mốt', 'hai một'], a: 0, say: 'hai mốt' },
           { q: '15 는?', opts: ['mười lăm', 'mười năm'], a: 0, say: 'mười lăm' },
           { q: '24 는? (더 흔한 쪽)', opts: ['hai tư', 'hai bốn'], a: 0, say: 'hai tư' },
           { q: '20 은?', opts: ['hai mươi', 'hai mười'], a: 0, say: 'hai mươi' },
           { q: '1,000,000 동은?', opts: ['một triệu', 'một nghìn nghìn'], a: 0, say: 'một triệu' }] },

];


/* ---------- 문법 8가지 ----------
   문법 '수업'을 크게 만들지는 않는다. 다만 이 여덟 개는 없으면 말이 안 만들어진다 —
   부정·질문·시제·부탁처럼 하루에도 수십 번 쓰는 뼈대만 고른다.
   설명은 한 줄, 나머지는 예문으로 익힌다. */
const GRAMMAR = [
  { key: 'G1', title: '아니다', intro: '동사·형용사 앞에 không만 붙이면 부정이 됩니다. 모양이 바뀌는 것은 없습니다.',
    cards: [
      { vi: 'không', ko: '아니다·안', kr: '콩', tones: tns('không:ngang'), note: '무엇이든 그 앞에 붙인다' },
      { vi: 'Tôi không hiểu.', ko: '저는 이해 못 해요', kr: '또이 콩 히에우',
        tones: tns('Tôi:ngang, không:ngang, hiểu:hỏi'), note: 'tôi 나 + không 안 + hiểu 이해하다' },
      { vi: 'Cái này không đắt.', ko: '이건 안 비싸요', kr: '까이 나이 콩 닷',
        tones: tns('Cái:sắc, này:huyền, không:ngang, đắt:sắc'), note: '형용사 앞에도 똑같이' }],
    quiz: [{ q: '"저는 안 가요"는?', opts: ['Tôi không đi', 'Tôi đi không'], a: 0, say: 'Tôi không đi.' },
           { q: '"안 비싸요"는?', opts: ['không đắt', 'đắt không'], a: 0 },
           { q: 'không은 어디에 붙나요?', opts: ['동사·형용사 앞', '문장 맨 끝'], a: 0 }] },
  { key: 'G2', title: '예/아니오 질문', intro: '문장 끝에 không? 을 붙이면 "~해요?"가 됩니다. 대답은 có(네) / không(아니오).',
    cards: [
      { vi: 'Anh khỏe không?', ko: '잘 지내세요?', kr: '아인 쾌 콩',
        tones: tns('Anh:ngang, khỏe:hỏi, không:ngang'), note: '문장 + không? 물음' },
      { vi: 'Có.', ko: '네 (있어요·그래요)', kr: '꼬', tones: tns('Có:sắc'), note: 'có 네 — 한 마디로 충분' },
      { vi: 'Anh có bận không?', ko: '바쁘세요?', kr: '아인 꼬 번 콩',
        tones: tns('Anh:ngang, có:sắc, bận:nặng, không:ngang'), note: 'có ~ không 으로 감싸도 된다' }],
    quiz: [{ q: '"밥 먹었어요?"에 가까운 형태는?', opts: ['Anh ăn cơm không?', 'Không anh ăn cơm?'], a: 0 },
           { q: '"네"라고 짧게 답하려면?', opts: ['Có', 'Không'], a: 0, say: 'Có.' },
           { q: 'không? 은 어디에 오나요?', opts: ['문장 맨 끝', '문장 맨 앞'], a: 0 }] },
  { key: 'G3', title: '무엇·어디·언제', intro: '의문사는 한국어와 달리 <b>묻는 자리에 그대로</b> 둡니다. 순서를 바꾸지 않습니다.',
    cards: [
      { vi: 'Cái này là gì?', ko: '이게 뭐예요?', kr: '까이 나이 라 지',
        tones: tns('Cái:sắc, này:huyền, là:huyền, gì:huyền'), note: 'gì = 무엇' },
      { vi: 'Anh ở đâu?', ko: '어디 계세요?', kr: '아인 어 더우',
        tones: tns('Anh:ngang, ở:hỏi, đâu:ngang'), note: 'đâu = 어디' },
      { vi: 'Mấy giờ?', ko: '몇 시예요?', kr: '머이 저',
        tones: tns('Mấy:sắc, giờ:huyền'), note: 'mấy = 몇 (작은 수)' }],
    quiz: [{ q: '"이름이 뭐예요?"는?', opts: ['Tên anh là gì?', 'Gì tên anh là?'], a: 0, say: 'Tên anh là gì?' },
           { q: '"어디"는?', opts: ['đâu', 'gì'], a: 0 },
           { q: '의문사는 어디에 두나요?', opts: ['묻는 자리 그대로', '항상 문장 맨 앞'], a: 0 }] },
  { key: 'G4', title: '했다 · 하고 있다 · 할 것이다', intro: '동사는 모양이 안 바뀝니다. 앞에 <b>đã · đang · sẽ</b> 만 얹으면 시제가 됩니다.',
    cards: [
      { vi: 'Tôi đã ăn.', ko: '저는 먹었어요', kr: '또이 다 안',
        tones: tns('Tôi:ngang, đã:ngã, ăn:ngang'), note: 'đã = 이미 (과거)' },
      { vi: 'Tôi đang làm.', ko: '저는 하고 있어요', kr: '또이 당 람',
        tones: tns('Tôi:ngang, đang:ngang, làm:huyền'), note: 'đang = ~하는 중' },
      { vi: 'Tôi sẽ về.', ko: '저는 돌아갈 거예요', kr: '또이 새 베',
        tones: tns('Tôi:ngang, sẽ:ngã, về:huyền'), note: 'sẽ = ~할 것이다' }],
    quiz: [{ q: '"먹고 있어요"는?', opts: ['đang ăn', 'đã ăn'], a: 0, say: 'Tôi đang ăn.' },
           { q: '"갈 거예요"는?', opts: ['sẽ đi', 'đã đi'], a: 0 },
           { q: '동사 모양은?', opts: ['안 바뀐다', '시제마다 바뀐다'], a: 0 }] },
  { key: 'G5', title: '해 주세요 · 하지 마세요', intro: '부탁은 <b>làm ơn</b>(부디)이나 문장 끝 <b>nhé</b>, 금지는 <b>đừng</b>입니다.',
    cards: [
      { vi: 'Làm ơn giúp tôi.', ko: '좀 도와주세요', kr: '람 언 줍 또이',
        tones: tns('Làm:huyền, ơn:ngang, giúp:sắc, tôi:ngang'), note: 'làm ơn = 부디 (정중)' },
      { vi: 'Đừng bấm nút.', ko: '버튼 누르지 마세요', kr: '등 범 눗',
        tones: tns('Đừng:huyền, bấm:sắc, nút:sắc'), note: 'đừng = ~하지 마' },
      { vi: 'Làm lại nhé.', ko: '다시 해요', kr: '람 라이 녜',
        tones: tns('Làm:huyền, lại:nặng, nhé:sắc'), note: 'nhé = 부드럽게 권하는 끝맺음' }],
    quiz: [{ q: '"하지 마세요"의 앞말은?', opts: ['đừng', 'làm ơn'], a: 0 },
           { q: '정중히 부탁할 때는?', opts: ['Làm ơn ~', 'Đừng ~'], a: 0, say: 'Làm ơn giúp tôi.' },
           { q: 'nhé 는 어디에?', opts: ['문장 끝', '문장 앞'], a: 0 }] },
  { key: 'G6', title: '있다 · 없다', intro: '<b>có</b> 하나로 "있다·가지다"가 다 됩니다. 없으면 앞에 không.',
    cards: [
      { vi: 'Tôi có tiền.', ko: '저 돈 있어요', kr: '또이 꼬 띠엔',
        tones: tns('Tôi:ngang, có:sắc, tiền:huyền'), note: 'có = 있다·가지다' },
      { vi: 'Không có.', ko: '없어요', kr: '콩 꼬', tones: tns('Không:ngang, có:sắc'), note: '가장 많이 쓰는 두 마디' },
      { vi: 'Ở đây có nhà vệ sinh không?', ko: '여기 화장실 있어요?', kr: '어 더이 꼬 냐 베 신 콩',
        tones: tns('Ở:hỏi, đây:ngang, có:sắc, nhà:huyền, vệ:nặng, sinh:ngang, không:ngang'), note: 'có 있다 + không 물음' }],
    quiz: [{ q: '"없어요"는?', opts: ['Không có', 'Có không'], a: 0, say: 'Không có.' },
           { q: '"돈 있어요"는?', opts: ['Tôi có tiền', 'Tôi tiền có'], a: 0 },
           { q: 'có 의 뜻은?', opts: ['있다·가지다', '하지 마라'], a: 0 }] },
  { key: 'G7', title: '더 · 가장', intro: '비교는 <b>hơn</b>(더), 최고는 <b>nhất</b>(가장). 형용사 <b>뒤</b>에 붙습니다.',
    cards: [
      { vi: 'Cái này rẻ hơn.', ko: '이게 더 싸요', kr: '까이 나이 재 헌',
        tones: tns('Cái:sắc, này:huyền, rẻ:hỏi, hơn:ngang'), note: 'rẻ 싸다 + hơn 더' },
      { vi: 'Cái này tốt nhất.', ko: '이게 가장 좋아요', kr: '까이 나이 똣 녓',
        tones: tns('Cái:sắc, này:huyền, tốt:sắc, nhất:sắc'), note: 'tốt 좋다 + nhất 가장' },
      { vi: 'Nhanh hơn nhé.', ko: '더 빨리요', kr: '냐인 헌 녜',
        tones: tns('Nhanh:ngang, hơn:ngang, nhé:sắc'), note: '현장에서 매일 듣는 말' }],
    quiz: [{ q: '"더 싸요"는?', opts: ['rẻ hơn', 'hơn rẻ'], a: 0, say: 'Cái này rẻ hơn.' },
           { q: '"가장 좋다"는?', opts: ['tốt nhất', 'nhất tốt'], a: 0 },
           { q: 'hơn·nhất 의 자리는?', opts: ['형용사 뒤', '형용사 앞'], a: 0 }] },
  { key: 'G8', title: '할 수 있다', intro: '가능·허락은 <b>được</b>. 동사 뒤에 붙이고, 물을 때는 được không? 입니다.',
    cards: [
      { vi: 'Được.', ko: '돼요·괜찮아요', kr: '드억', tones: tns('Được:nặng'), note: '한 마디로 승낙' },
      { vi: 'Tôi làm được.', ko: '저 할 수 있어요', kr: '또이 람 드억',
        tones: tns('Tôi:ngang, làm:huyền, được:nặng'), note: '동사 + được ~할 수 있다' },
      { vi: 'Sửa được không?', ko: '고칠 수 있어요?', kr: '스어 드억 콩',
        tones: tns('Sửa:hỏi, được:nặng, không:ngang'), note: '가능한지 묻기' }],
    quiz: [{ q: '"할 수 있어요"는?', opts: ['làm được', 'được làm'], a: 0, say: 'Tôi làm được.' },
           { q: '"돼요?"라고 물으려면?', opts: ['~ được không?', '~ không được?'], a: 0 },
           { q: 'được 의 자리는?', opts: ['동사 뒤', '동사 앞'], a: 0 }] },
  { key: 'G9', title: '다 했다 · 아직', intro: '끝났는지 묻고 답하는 말. 공장에서 하루에도 수십 번 씁니다. <b>rồi</b>=했다, <b>chưa</b>=아직/했어요?',
    cards: [
      { vi: 'Xong chưa?', ko: '다 됐어요?', kr: '쏭 쯔어',
        tones: tns('Xong:ngang, chưa:ngang'), note: '문장 끝 chưa? 했어요?' },
      { vi: 'Làm xong rồi.', ko: '다 했어요', kr: '람 쏭 조이',
        tones: tns('Làm:huyền, xong:ngang, rồi:huyền'), note: 'rồi = 이미 그렇게 됐다' },
      { vi: 'Em chưa làm.', ko: '아직 안 했어요', kr: '앰 쯔어 람',
        tones: tns('Em:ngang, chưa:ngang, làm:huyền'), note: '동사 앞 chưa 아직 안 했다' }],
    quiz: [{ q: '"다 했어요"는?', opts: ['Làm xong rồi', 'Làm xong chưa'], a: 0, say: 'Làm xong rồi.' },
           { q: '"아직 안 했어요"는?', opts: ['Em chưa làm', 'Em làm rồi'], a: 0, say: 'Em chưa làm.' },
           { q: '끝났는지 물으려면 문장 끝에?', opts: ['chưa?', 'rồi?'], a: 0 }] },
  { key: 'G10', title: '해야 한다 · 하고 싶다', intro: '동사 앞에 하나만 얹으면 됩니다 — <b>phải</b>(해야 한다) · <b>muốn</b>(하고 싶다) · <b>cần</b>(필요하다).',
    cards: [
      { vi: 'Anh phải đeo găng tay.', ko: '장갑 끼셔야 해요', kr: '아인 파이 대오 강 따이',
        tones: tns('Anh:ngang, phải:hỏi, đeo:ngang, găng:ngang, tay:ngang'), note: 'phải = 의무 (안전 지시에 늘 나온다)' },
      { vi: 'Em muốn nghỉ.', ko: '쉬고 싶어요', kr: '앰 무온 응이',
        tones: tns('Em:ngang, muốn:sắc, nghỉ:hỏi'), note: 'muốn = 바람' },
      { vi: 'Em cần cái này.', ko: '이게 필요해요', kr: '앰 껀 까이 나이',
        tones: tns('Em:ngang, cần:huyền, cái:sắc, này:huyền'), note: 'cần = 필요' }],
    quiz: [{ q: '"쉬고 싶어요"는?', opts: ['Em muốn nghỉ', 'Em phải nghỉ'], a: 0, say: 'Em muốn nghỉ.' },
           { q: '"~해야 한다"는?', opts: ['phải', 'muốn'], a: 0 },
           { q: '이 말들의 자리는?', opts: ['동사 앞', '동사 뒤'], a: 0 }] },
  { key: 'G11', title: '고장났다 · 다쳤다', intro: '나쁜 일을 당했을 때는 <b>bị</b>, 좋은 일을 받았을 때는 <b>được</b>. 사고·고장 신고에 꼭 필요합니다.',
    cards: [
      { vi: 'Máy bị hỏng rồi.', ko: '기계 고장났어요', kr: '마이 비 홍 조이',
        tones: tns('Máy:sắc, bị:nặng, hỏng:hỏi, rồi:huyền'), note: 'bị 당하다 + 나쁜 일' },
      { vi: 'Em bị đau tay.', ko: '손을 다쳤어요', kr: '앰 비 다우 따이',
        tones: tns('Em:ngang, bị:nặng, đau:ngang, tay:ngang'), note: 'bị 당하다 — 아플 때도' },
      { vi: 'Em được nghỉ.', ko: '쉬게 됐어요 (허락받았어요)', kr: '앰 드억 응이',
        tones: tns('Em:ngang, được:nặng, nghỉ:hỏi'), note: 'được 받다 + 좋은 일' }],
    quiz: [{ q: '"기계 고장났어요"는?', opts: ['Máy bị hỏng', 'Máy được hỏng'], a: 0, say: 'Máy bị hỏng rồi.' },
           { q: '다쳤을 때 쓰는 말은?', opts: ['bị', 'được'], a: 0 },
           { q: '"쉬게 됐어요"는?', opts: ['Em được nghỉ', 'Em bị nghỉ'], a: 0, say: 'Em được nghỉ.' }] },
  { key: 'G12', title: '~해 주세요', intro: '부탁의 만능 열쇠 <b>cho</b>. "Cho + 사람 + 무엇/동사" 로 말하면 됩니다.',
    cards: [
      { vi: 'Cho em nghỉ năm phút.', ko: '5분만 쉬게 해 주세요', kr: '쪼 앰 응이 남 풋',
        tones: tns('Cho:ngang, em:ngang, nghỉ:hỏi, năm:ngang, phút:sắc'), note: 'cho ~해 주세요 + tôi 나 + 동사' },
      { vi: 'Cho tôi cái này.', ko: '이거 주세요', kr: '쪼 또이 까이 나이',
        tones: tns('Cho:ngang, tôi:ngang, cái:sắc, này:huyền'), note: '가게·식당에서 그대로' },
      { vi: 'Cho em hỏi.', ko: '뭐 좀 여쭐게요', kr: '쪼 앰 호이',
        tones: tns('Cho:ngang, em:ngang, hỏi:hỏi'), note: '말 걸 때 첫마디' }],
    quiz: [{ q: '"이거 주세요"는?', opts: ['Cho tôi cái này', 'Cái này cho tôi'], a: 0, say: 'Cho tôi cái này.' },
           { q: '말을 걸 때 첫마디는?', opts: ['Cho em hỏi', 'Cho em nghỉ'], a: 0, say: 'Cho em hỏi.' },
           { q: 'cho 다음에 오는 것은?', opts: ['사람', '동사'], a: 0 }] },
  { key: 'G13', title: '어디에 있어요', intro: '<b>ở</b> 뒤에 방향 말을 붙입니다 — trong(안) · trên(위) · dưới(아래) · ngoài(밖) · cạnh(옆).',
    cards: [
      { vi: 'Ở trong kho.', ko: '창고 안에요', kr: '어 쫑 코',
        tones: tns('Ở:hỏi, trong:ngang, kho:ngang'), note: 'ở ~에 + trong 안 + 장소' },
      { vi: 'Để ở trên bàn.', ko: '탁자 위에 두세요', kr: '데 어 쩬 반',
        tones: tns('Để:hỏi, ở:hỏi, trên:ngang, bàn:huyền'), note: '물건 놓을 자리 말하기' },
      { vi: 'Cái này để ở đâu?', ko: '이건 어디에 둬요?', kr: '까이 나이 데 어 더우',
        tones: tns('Cái:sắc, này:huyền, để:hỏi, ở:hỏi, đâu:ngang'), note: '현장에서 매일 쓰는 질문' }],
    quiz: [{ q: '"창고 안에"는?', opts: ['ở trong kho', 'kho ở trong'], a: 0, say: 'Ở trong kho.' },
           { q: '"위에"는?', opts: ['trên', 'dưới'], a: 0 },
           { q: '"어디에 둬요?"는?', opts: ['để ở đâu?', 'đâu để ở?'], a: 0 }] },
  { key: 'G14', title: '언제 · 얼마 · 맞죠?', intro: '남은 의문사 셋과, 확인할 때 붙이는 <b>phải không?</b> 입니다.',
    cards: [
      { vi: 'Bao giờ xong?', ko: '언제 끝나요?', kr: '바오 저 쏭',
        tones: tns('Bao:ngang, giờ:huyền, xong:ngang'), note: 'bao giờ = 언제' },
      { vi: 'Bao nhiêu tiền?', ko: '얼마예요?', kr: '바오 니에우 띠엔',
        tones: tns('Bao:ngang, nhiêu:ngang, tiền:huyền'), note: 'bao nhiêu = 얼마·몇 (큰 수)' },
      { vi: 'Anh là quản lý, phải không?', ko: '관리자님 맞죠?', kr: '아인 라 꽌 리 파이 콩',
        tones: tns('Anh:ngang, là:huyền, quản:hỏi, lý:sắc, phải:hỏi, không:ngang'), note: '문장 끝 phải không? 맞죠?' }],
    quiz: [{ q: '"언제 끝나요?"는?', opts: ['Bao giờ xong?', 'Bao nhiêu xong?'], a: 0, say: 'Bao giờ xong?' },
           { q: '"얼마예요?"는?', opts: ['Bao nhiêu tiền?', 'Bao giờ tiền?'], a: 0, say: 'Bao nhiêu tiền?' },
           { q: '"맞죠?"라고 확인할 때는?', opts: ['phải không?', 'chưa?'], a: 0 }] },
];

let RL = null;
function startRule(i) {
  const r = (typeof i === 'string') ? GRAMMAR[+i.slice(1)] : RULES[i];
  // 다른 학습과 같은 카드 화면으로 가르친다 — 카드가 끝나면 연습 문제
  const cw = (r.cards || []).flatMap(c0 => glossOf(c0.vi).map(g => g.w))
    .map(w => (allWords().find(x => x.vi.toLowerCase() === w.toLowerCase()) || {}).img)
    .find(Boolean);
  LCRUMB = tr('기본기') + '-' + tr(r.title);
  L = { day: { day: r.key, theme: r.title, intro: r.intro, words: [], rule: r },
        items: [{ k: 'cover', d: { t: r.title, b: r.intro, img: cw } },
                ...r.cards.map(c => ({ k: 'rule', d: c }))], i: 0 };
  drawCard();
  show('learn', r.title, true);
}
function drawRule() {
  const b = $('#rulesBody');
  b.textContent = '';
  const r = RL.r;

  if (RL.i >= r.quiz.length) {          // 결과
    S.done[r.key] = now();
    // 배운 예문은 문장 복습 창고로 — 기본기·문법도 복습 체계 안에 들어온다
    (r.cards || []).forEach(c => {
      if (c.vi.split(' ').length < 2) return;          // 단어 하나짜리는 뺀다
      if (!S.srs[c.vi]) S.srs[c.vi] = { lv: 0, first: now(), due: now() + STEPS[0] * DAY };
    });
    touchToday(); save();
    const res = el('div', 'result');
    res.append(el('div', 'n', RL.ok + ' / ' + r.quiz.length));
    res.append(el('div', null, RL.ok === r.quiz.length ? '규칙이 손에 붙었습니다'
      : '틀린 건 앞의 예문을 한 번 더 들어 보세요'));
    const b2 = el('button', 'primary big', '다시 하기');
    b2.style.marginTop = '16px';
    b2.onclick = () => startRule(RULES.indexOf(r));
    const h = el('button', 'ghost big', '홈으로');
    h.style.marginLeft = '8px'; h.onclick = renderHome;
    res.append(b2, h);
    b.append(res);
    return;
  }

  const q = r.quiz[RL.i];               // 문제
  b.append(el('div', 'q', `${RL.i + 1} / ${r.quiz.length}`));
  b.append(el('div', 'q mid', esc(q.q)));
  const order = q.opts.map((_, i) => i).sort(() => Math.random() - .5);
  const opts = el('div', 'opts');
  order.forEach(oi => {
    const btn = el('button', null, esc(q.opts[oi]));
    btn.onclick = () => {
      [...opts.children].forEach(x => x.disabled = true);
      const good = oi === q.a;
      btn.dataset.r = good ? 'ok' : 'no';
      fxTone(good);
      if (!good) [...opts.children].forEach(x => {
        if (x.textContent === q.opts[q.a]) x.dataset.r = 'ok';
      });
      if (good) RL.ok++;
      if (q.say) play(q.say, false);                 // 정답 소리를 바로 들려준다
      /* 소리를 들려주는 자리에는 **말하는 길**도 같이 둔다 — 기본기·문법도 하루 5분과 같은 틀이다.
         정답을 크게 보여 주고, 듣기와 따라 말하기를 붙인다(발음·높낮이까지 짚어 준다). */
      if (q.say) {
        const box = el('div', 'rsay');
        const row = el('div', 'wrow');
        row.append(bigWord(q.say, (findItem(q.say) || {}).tones));
        if (canRecord()) {
          const mic = iconBtn('mic', '따라 말하기', null);
          mic.onclick = () => toggleRec(q.say, mic, box);
          row.append(mic);
        }
        box.append(row);
        b.append(box);
      }
      nextBtn(b, () => { RL.i++; drawRule(); });
    };
    opts.append(btn);
  });
  b.append(opts);
}

/* ---------- 쓰기 연습 (손글씨 + 화면 자판) ----------
   손으로 쓰면 눈으로만 볼 때보다 글자가 더 잘 남는다(쓰는 동작이 기억에 같이 저장된다).
   손글씨는 자동 판정을 하지 않는다 — 판정이 목적이 아니라 쓰는 행위가 목적이고,
   정답을 열어 스스로 비교하는 것으로 충분하다. */

function practiceWords(n) {
  // 복습 예정 단어 먼저, 그다음 지금까지 배운 모든 단어를 최근 것부터
  const due = dueWords().map(findItem).filter(Boolean);
  const doneDays = ALL.filter(d => typeof d.day === 'number' && S.done[d.day]).reverse();
  const recent = doneDays.length ? doneDays.flatMap(d => d.words || [])
    : (ALL.find(d => d.day === 1) || {}).words || [];
  const pool = [...due, ...recent.filter(w => !due.some(x => x.vi === w.vi))];
  return pool.slice(0, n);
}

/* 화면 속 베트남어 자판 — 다운로드 없이 브라우저 안에서 바로.
   실기기 자판(텔렉스 방식)의 전 단계 연습: 글자와 성조 부호의 짝을 손에 익힌다. */
let TY = null;
/* 타이핑 — Telex 익히기 (대표님 지시 2026-09-27: "안녕하세요 같은 걸 치게 하지 말고 à 를 치게").
   부호 하나마다 **두 판**: ① 글자 만들기 — 위에 규칙(a + f → à)을 보여 주고 그 글자 하나를 친다
   ② 그 글자가 든 단어 — 단어·뜻·소리를 보고 그 단어을 친다. 성조 다섯(f s r x j) → 모자 일곱(aa aw ee oo ow uw dd) 차례.
   틀리면 규칙을 다시 보여 주고 그 자리에서 다시 친다(세 번 틀리면 넘어간다). 자판은 실제 Telex 와 같다. */
const TYPE_TARGET = { f: 'à', s: 'á', r: 'ả', x: 'ã', j: 'ạ', aa: 'â', aw: 'ă', ee: 'ê', oo: 'ô', ow: 'ơ', uw: 'ư', dd: 'đ' };
const typeSteps = () => TYPEKEYS.flatMap(x => {
  const keys = x.k.length === 1 ? ['a', x.k] : [x.k[0], x.k[1]];
  const ch = TYPE_TARGET[x.k];
  return [{ kind: 'char', keys, target: ch, name: x.t, x },
          { kind: 'word', keys, target: x.out, name: x.t, x }];
});
function startType() {
  TY = { list: typeSteps(), i: 0, txt: '', miss: 0 };
  drawType();
  show('type', '타이핑', true);
}
const kbd = k => '<kbd class="tkey">' + esc(k) + '</kbd>';
function drawType() {
  const b = $('#typeBody'); b.textContent = '';
  if (TY.i >= TY.list.length) {
    if (!S.done['TYPE']) { S.done['TYPE'] = now(); touchToday(); save(); }   // 24판을 다 치면 기본기 4/4
    const r = el('div', 'result');
    r.append(el('div', 'n', TYPEKEYS.length + '가지'));
    r.append(el('div', null, '성조 다섯과 모자 일곱을 다 쳐 봤습니다'));
    const ag = el('button', 'primary big', '한 번 더'); ag.onclick = startType; ag.style.marginTop = '24px';
    const bk = el('button', 'ghost big', '기본기로'); bk.onclick = studyBasicsEntry; bk.style.marginLeft = '8px'; bk.style.marginTop = '24px';
    r.append(ag, bk); b.append(r); return;
  }
  const st = TY.list[TY.i]; TY.txt = ''; TY.miss = 0;
  b.append(el('div', 'q', `${TY.i + 1} / ${TY.list.length} · ${st.kind === 'char' ? esc(st.target) + ' 만들기' : esc(st.target) + ' 치기'}`));
  // 규칙 — 어떤 키를 차례로 누르면 그 글자가 되는지
  const rule = el('div', 'tkrule');
  rule.innerHTML = kbd(st.keys[0]) + '<span class="tkplus">+</span>' + kbd(st.keys[1]) + '<span class="tkarrow">→</span><b class="tkout">' + esc(TYPE_TARGET[st.x.k]) + '</b>' +
    '<span class="tkname">' + esc(st.name) + '</span>';
  b.append(rule);
  if (st.kind === 'char') {
    b.append(el('div', 'tktarget', esc(st.target)));
    b.append(el('div', 'tkhint', '위 차례대로 눌러 이 글자를 만들어 보세요'));
  } else {
    // 단어 — 글자 안의 목표 글자를 진하게, 뜻과 소리
    const ch = TYPE_TARGET[st.x.k];
    const shown = esc(st.target).replace(esc(ch), '<b>' + esc(ch) + '</b>');
    const wt = el('div', 'tktarget word'); wt.innerHTML = shown; b.append(wt);
    const meta = el('div', 'tkmeta');
    meta.append(el('span', null, esc(st.x.ko)));
    const pl = iconBtn('play', tr('듣기'), () => { const k = recKey(st.target); k ? play(k, false) : speakVi(st.target); });
    pl.classList.add('playi'); meta.append(pl);
    b.append(meta);
    b.append(el('div', 'tkhint', esc(st.x.ex.replace('+', ' + ')) + ' 처럼 쳐 보세요'));
  }
  const out = el('div', 'dictans');
  const draw = () => { out.textContent = TY.txt || '· · ·'; };
  draw(); b.append(out);
  const fb = el('div', 'tkfb'); b.append(fb);
  b.append(viKeypad(() => TY.txt, v => { TY.txt = v; draw(); out.dataset.r = ''; fb.textContent = ''; }, () => {
    if (!TY.txt.trim()) return;
    const good = viCanon(TY.txt) === viCanon(st.target);
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    fxTone(good);
    out.dataset.r = good ? 'ok' : 'no';
    if (good) { fb.textContent = '맞았습니다'; setTimeout(() => { TY.i++; drawType(); }, 600); return; }
    TY.miss++;
    fb.innerHTML = esc(TY.txt.trim()) + ' → <b>' + esc(st.target) + '</b> · ' + kbd(st.keys[0]) + ' 다음에 ' + kbd(st.keys[1]);
    if (TY.miss >= 3) setTimeout(() => { TY.i++; drawType(); }, 1900);
    else { TY.txt = ''; draw(); }
  }));
}

/* 지난 세트의 문장 — 단어만 반복하면 입이 문장까지 못 간다.
   최근 것만 주지 않고 오래된 것도 섞는다(오래 안 본 것일수록 다시 꺼낼 값어치가 크다). */

/* ---------- 따라 말하기 연습 ---------- */
let SP = null;
function drawSpeak() {
  const b = $('#speakBody'); b.textContent = '';
  resetRec();
  if (SP.i >= SP.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', SP.list.length + '개'));
    r.append(el('div', null, '소리 내어 말한 만큼 입이 기억합니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = SP.list[SP.i];
  b.append(el('div', 'q', `${SP.i + 1} / ${SP.list.length} · ` + (w.sent ? '지난 세트 문장 — 듣고 따라 말해 보세요' : '듣고 따라 말해 보세요')));
  b.append(el('div', 'qmain', esc(w.vi)));
  b.append(toneRow(w.tones));
  b.append(reveal(w.kr_read));
  b.append(el('div', 'q mid', esc(w.ko)));
  b.append(speakRow(w.vi, true));
  const nx = el('button', 'primary big', '다음 ›');
  nx.style.width = '100%'; nx.style.marginTop = '14px';
  nx.onclick = () => { SP.i++; drawSpeak(); };
  b.append(nx);
  play(w.vi, false);
}

/* ---------- 손글씨 ----------
   낯선 글자·성조 부호는 손으로 써야 오래 남는다(성인 외국문자 실험에서 손글씨가
   타이핑을 이겼고, 타이핑으로 배운 글자는 3주 뒤 기억이 무너졌다).
   흐름: 뜻과 소리만 주고 → 기억으로 쓴다(인출) → 정답과 비교 → 원하면 AI 선생님 점검.
   AI 점검은 참고용이다 — 흘려 쓰면 AI도 잘못 읽으므로 눈 비교가 기본이다. */
let WR = null;
function drawWrite() {
  const b = $('#writeBody'); b.textContent = '';
  if (WR.i >= WR.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', WR.list.length + '개'));
    r.append(el('div', null, '손으로 쓴 글자는 눈으로만 본 것보다 오래 남습니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = WR.list[WR.i];
  b.append(el('div', 'q', `${WR.i + 1} / ${WR.list.length} · 듣고, 기억으로 써 보세요 (성조 부호까지)`));
  b.append(el('div', 'qmain', esc(w.ko)));
  const wrap = el('div', 'qplay');
  const p1 = el('button', 'primary', '듣기'); p1.onclick = () => play(w.vi, false);
  wrap.append(p1); b.append(wrap);
  play(w.vi, false);

  // 종이처럼 — 흰 바탕에 검은 획 (AI도 이쪽을 잘 읽는다)
  const cv = el('canvas', 'wpad');
  cv.width = 640; cv.height = 200;
  const ctx = cv.getContext('2d');
  const paper = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
  paper();
  ctx.strokeStyle = '#16181d'; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
  let drawing = false, drew = false;
  const pos = e => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  };
  cv.onpointerdown = e => { drawing = drew = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  cv.onpointermove = e => { if (drawing) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
  b.append(cv);

  const box = el('div', 'cmpbox');
  const row = el('div', 'qplay');
  const cl = el('button', 'ghost', '지우기');
  cl.onclick = () => { paper(); ctx.strokeStyle = '#16181d'; drew = false; };
  row.append(cl);
  if (HAND_AI && aiReady()) {
    const ai = el('button', 'ghost', 'AI 선생님 점검');
    ai.onclick = () => {
      if (!drew) return;
      ai.disabled = true;
      aiRead(w.vi, cv, box).finally(() => { ai.disabled = false; });
    };
    row.append(ai);
  }
  const showA = el('button', 'primary', '정답 보기');
  showA.onclick = () => {
    showA.disabled = true;
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)));
    ans.append(toneRow(w.tones));
    ans.append(reveal(w.kr_read));
    b.insertBefore(ans, box);
    // 자가 채점 — AI와 무관하게, 이 단어를 복습에 언제 다시 낼지 정하는 용도
    const g = el('div', 'qplay');
    const ok = el('button', 'ghost sm', '맞게 썼어요');
    ok.onclick = () => { fxTone(true); grade(w.vi, true); WR.i++; drawWrite(); };
    const no = el('button', 'ghost sm', '틀렸어요 (곧 다시 나옴)');
    no.onclick = () => { grade(w.vi, false); WR.i++; drawWrite(); };
    g.append(ok, no);
    b.insertBefore(g, box);
  };
  row.append(showA);
  b.append(row, box);

  // 채점 없이도 오갈 수 있어야 한다
  const nav = el('div', 'pager');
  const pv = el('button', 'ghost big', '‹');
  pv.disabled = WR.i === 0;
  pv.onclick = () => { WR.i--; drawWrite(); };
  const nx = el('button', 'primary big', '다음 ›');
  nx.onclick = () => { WR.i++; drawWrite(); };
  nav.append(pv, el('span', null, `${WR.i + 1} / ${WR.list.length}`), nx);
  b.append(nav);
}

/* AI가 손글씨를 읽고 선생님처럼 짚어준다 — 무슨 글자로 읽히는지, 빠진 부호, 조언 한 줄.
   요청이 몰려 막히면(분당 한도) 30초 세고 한 번은 스스로 다시 시도한다. */
/* 손글씨 그림을 가볍게 만든다 — 글씨가 있는 부분만 잘라 512px로 줄인다.
   보내는 양이 5~10배 줄어 AI 답이 눈에 띄게 빨라진다(내용은 그대로). */
function inkCrop(cv) {
  const x = cv.getContext('2d');
  const d = x.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y += 2) for (let px = 0; px < cv.width; px += 2) {
    const i = (y * cv.width + px) * 4;
    if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) {
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0 || y1 <= y0) return cv.toDataURL('image/png').split(',')[1];
  const pad = 16;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(cv.width, x1 + pad); y1 = Math.min(cv.height, y1 + pad);
  const w = x1 - x0, h = y1 - y0, k = Math.min(1, 512 / w);
  const o = document.createElement('canvas');
  o.width = Math.round(w * k); o.height = Math.round(h * k);
  const ox = o.getContext('2d');
  ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height);
  ox.drawImage(cv, x0, y0, w, h, 0, 0, o.width, o.height);
  return o.toDataURL('image/jpeg', .8).split(',')[1];
}

/* ---------- 손글씨 채점 ----------
   조사해서 알게 된 것: 이 일은 **인식(recognition)이 아니라 대조(verification)** 다.
   "이게 뭐라고 쓰였나"는 어렵고(일반 손글씨 85~92%, 학습에 안 쓰인 언어는 더 떨어진다),
   "이게 chào 라고 쓰인 게 맞나"는 훨씬 쉽다. 우리는 정답을 알고 있으니 뒤쪽만 물으면 된다.
   그래서 **정답을 글씨로 그려서 손글씨와 나란히 보여준다** — 읽으라고 하지 않고 견주라고 시킨다.
   그리고 볼 곳을 딱 정해 준다: 알파벳 차례 · 성조 부호 · 모자(ă â ê ô ơ ư đ).
   마지막으로 **확신이 없으면 "모르겠음"이라고 답하게** 한다 — 틀리지 않은 글씨를 틀렸다고
   하는 것이 가장 나쁘다. 그때는 점수를 매기지 않는다. */
function targetCard(text) {
  const c = document.createElement('canvas');
  c.width = 720; c.height = 240;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#000';
  let px = 150;
  do { g.font = `700 ${px}px "Times New Roman", Georgia, serif`; px -= 6; }
  while (g.measureText(text).width > c.width - 60 && px > 30);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2);
  return c.toDataURL('image/jpeg', .9).split(',')[1];
}

const HANDQ = ['글자', '성조', '모자'];
function parseHand(t) {
  const o = {};
  t.split('\n').forEach(l => {
    const m = l.match(/^\s*[-*]?\s*(읽힘|글자|성조|모자|판정|조언)\s*[:：]\s*(.+)$/);
    if (m) o[m[1]] = m[2].trim();
  });
  return o;
}

async function aiRead(target, cv, box, onGrade) {
  const note = el('div', 'cmpnote ainote', 'AI 선생님이 보는 중…');
  box.querySelector('.ainote')?.remove();
  box.append(note);
  try {
    const mine = inkCrop(cv), want = targetCard(target);
    const t = await gCall({
      contents: [{ role: 'user', parts: [
        { text: '사진 두 장이다. **첫째**는 인쇄된 정답 "' + target + '", ' +
                '**둘째**는 한국인 학습자가 손으로 쓴 것이다.\n' +
                '읽어내려 하지 말고 **두 장을 견주어라.** 둘째가 첫째와 같은 단어인가?\n\n' +
                '볼 곳은 셋이다:\n' +
                ' · 글자 — 알파벳이 빠짐없이 같은 차례로 있는가\n' +
                ' · 성조 — 성조 부호(◌́ ◌̀ ◌̉ ◌̃ ◌̣)가 맞는 글자 위(아래)에 맞는 모양으로 있는가\n' +
                ' · 모자 — ă â ê ô ơ ư đ 의 모자·갈고리·가로줄이 제대로 붙었는가\n\n' +
                '**흐리거나 흘려 써서 확실하지 않으면 "모르겠음"이라고 답하라.** ' +
                '틀리지 않은 글씨를 틀렸다고 하면 안 된다.\n\n' +
                '아래 형식 그대로, 한국어로:\n' +
                '읽힘: (둘째 사진이 읽히는 그대로)\n' +
                '글자: 맞음 | 틀림 | 모르겠음\n' +
                '성조: 맞음 | 틀림 | 없음 | 모르겠음\n' +
                '모자: 맞음 | 틀림 | 해당없음 | 모르겠음\n' +
                '판정: 맞음 | 틀림 | 모르겠음\n' +
                '조언: (한 줄. 무엇을 어떻게 고칠지)' },
        { inline_data: { mime_type: 'image/jpeg', data: want } },
        { inline_data: { mime_type: 'image/jpeg', data: mine } }] }],
      // 답은 여섯 줄(읽힘·글자·성조·모자·판정·조언)이라 160이면 넉넉하다.
      // 나온 토큰은 들어간 토큰보다 여덟 배 비싸므로 상한을 낮춰 둔다.
      generationConfig: { maxOutputTokens: 160, thinkingConfig: { thinkingBudget: 0 } }
    }, i => { note.textContent = `지금 AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
    const r = parseHand(t);
    /* 판정은 **코드가** 짓는다. AI 의 '판정' 한 줄만 믿으면 안 된다는 것을 손글씨 119장으로 재서 알았다.
       폰에 손가락으로 그린 성조 갈고리(◌̉ ◌̃)는 기계가 잘 못 읽는다 — 옛 방식은
       맞게 쓴 40장 중 **22장에 X** 를 줬다(그중 4장은 제 입으로 정답대로 읽어 놓고 틀렸다고 했다).
       그래서 세 갈래로 나눈다:
         글자·모자가 다르다      → 틀림   (여기서 틀리면 진짜 틀린 것이다)
         글자·모자는 같고 성조만 → 짚어만 준다. X 를 주지 않는다
         전부 같다               → 맞음
       코드 판단이 '맞음' 이어도 AI 가 틀렸다고 하면 한 칸 내린다(겹쳐 보기).
       실측 119장: 억울한 X 37%→11%, 틀렸는데 맞았다고 한 것 6%→0%. */
    const bare = x => String(x || '').replace(/\(.*?\)/g, '').toLowerCase()
                      .replace(/[.,!?"'“”]/g, '').replace(/\s+/g, ' ').trim();
    const noTone = x => bare(x).normalize('NFD')
                      .replace(/[̣̀́̃̉]/g, '').normalize('NFC');
    const heard = bare(r['읽힘']), tgt = bare(target), aiNo = /틀림/.test(r['판정'] || '');
    let v;
    if (!heard) v = aiNo ? '틀림' : /맞음/.test(r['판정'] || '') ? '맞음' : '모르겠음';
    else if (heard === tgt) v = aiNo ? '성조만' : '맞음';
    else if (noTone(heard) === noTone(tgt)) v = '성조만';
    else v = '틀림';
    const ok = v === '맞음', tone = v === '성조만', no = v === '틀림';
    r['판정'] = tone ? '성조 부호만 다름' : v;
    note.className = 'cmpnote ainote ' + (ok ? 'ok' : no ? 'no' : '');
    const chip = k => {
      const x = r[k] || '모르겠음';
      const c = /맞음|해당없음/.test(x) ? 'ok' : /틀림/.test(x) ? 'no' : '';
      return `<span class="hchip ${c}">${k} ${esc(x)}</span>`;
    };
    note.innerHTML =
      '<b>' + (ok ? '맞게 썼습니다'
             : tone ? '글자는 맞습니다 — 성조 부호만 다시 보세요'
             : no ? '다르게 쓰였습니다' : '가려내기 어렵습니다') + '</b>' +
      '<span class="hrow">' + HANDQ.map(chip).join('') + '</span>' +
      (r['조언'] ? '<span>' + esc(r['조언']) + '</span>' : '') +
      (tone ? '<span class="dimtxt">글자와 모자는 정답과 같습니다. 손가락으로 그린 성조 부호는 ' +
              '기계가 잘못 읽는 일이 잦아 <b>틀렸다고 하지 않습니다.</b></span>'
       : (ok || no) ? '' : '<span class="dimtxt">흐리거나 흘려 써서 확실하지 않습니다 — ' +
        '<b>틀렸다고 하지 않겠습니다.</b> 조금 크고 또박또박 다시 써 보세요.</span>');
    const got = ok || tone ? true : no ? false : null;
    onGrade && onGrade(got, r);
    return got;
  } catch (e) {
    note.textContent = 'AI 점검 실패: ' + (e.message || '');
    onGrade && onGrade(null, {});
    return null;
  }
}

/* ---------- AI 대화 ----------
   대화 시스템으로 연습하면 말하기가 는다는 메타분석이 있다(말하기 d=0.84).
   단, 왕초보에게는 자유대화보다 '배운 단어 안의 제한 대화'가 낫다 —
   그래서 지금까지 배운 단어 목록을 매번 같이 보낸다.
   대화 내용은 구글 서버로 간다. */
/* AI 중계 서버 — 키를 서버가 숨겨 들고 있어서 누구나 키 없이 쓴다.
   (2026-08-22 개통. 비우면 예전 방식(각자 키)으로 돌아간다) */
const PROXY = 'https://viet-ai.chaochao-app.workers.dev';
/* 순위 서버 — 주소를 채우면 주간 순위가 켜진다 (비면 개인 성적표만) */
const aiReady = () => !!(PROXY || S.gkey);
/* AI 호출 한 군데로 모은다 — 구글이 붐비는 날(429·503)에도 앱이 스스로 버틴다.
   서버도 재시도하지만, 서버가 옛 코드여도 여기서 한 번 더 막아준다. */
/* 하루 몫이 바닥난 것과 잠깐 몰린 것은 **다른 일**이다.
   전자는 잠시 뒤에도 안 되는데 "잠시 뒤 다시"라고 안내하면 계속 헛손질하게 된다.
   구글이 보내는 글에 PerDay/per day 가 들어 있으면 하루치가 끝난 것이다. */
let AIOUT = 0;                                   // 하루치가 끝난 시각(밀리초). 한동안 아예 안 부른다
const AIOUT_MS = 30 * 60 * 1000;
const aiOut = () => AIOUT && Date.now() - AIOUT < AIOUT_MS;
const OUTMSG = '오늘 AI 몫을 다 썼습니다 — 내일 다시 됩니다.\n' +
               '그동안 듣기·읽기·자판 쓰기로는 그대로 공부하실 수 있습니다.';

async function gCall(payload, onWait) {
  if (aiOut()) throw new Error(OUTMSG);
  let last = 0, perDay = false;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(GURL(), { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload) });
    if (r.ok) {
      const j = await r.json();
      const t = ((j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('')).trim();
      if (t) { AIOUT = 0; return t; }
      last = 0;
    } else {
      last = r.status;
      if (last === 429) {
        const body = await r.text().catch(() => '');
        if (/PerDay|per day|일일/i.test(body)) perDay = true;
      }
    }
    if (last === 400 || last === 403) throw new Error(
      PROXY ? '서버 연결에 문제가 있습니다' : '키가 잘못됐거나 만료됐습니다');
    if (perDay) break;                           // 하루치가 끝났으면 더 두드려 봐야 소용없다
    // 429(몰림)에는 **다시 두드리지 않는다.** 서버가 이미 모델을 돌아가며 다 해 봤다.
    // 여기서 또 세 번 두드리면 한 번 누를 때 구글로 열여덟 번이 나가 몫이 순식간에 사라진다.
    if (last === 429) break;
    if (i < 2) { onWait && onWait(i); await new Promise(res => setTimeout(res, 4000 + i * 4000)); }
  }
  if (perDay) { AIOUT = Date.now(); throw new Error(OUTMSG); }
  throw new Error(last === 429 ? '요청이 몰려 있습니다 — 잠시 뒤 다시 해 보세요'
    : last ? '지금 AI가 붐빕니다 — 잠시 뒤 다시 해 보세요' : '빈 답이 왔습니다');
}
const GURL = () => PROXY ||
  ('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(S.gkey));


/* 기기에 베트남어 음성이 깔려 있을 때만 AI 문장을 소리로 들려줄 수 있다.
   조심할 것: **아이폰은 목록을 늦게 준다.** 처음 물으면 빈 배열이 오고
   voiceschanged 가 온 뒤라야 채워진다. 그것을 안 기다려서
   베트남어를 이미 깔아 둔 아이폰에도 '목소리가 없다'고 잘못 알렸다. */
let VOICES = null;                                  // null = 아직 못 받음, [] = 정말 없음
function loadVoices() {
  if (!window.speechSynthesis) { VOICES = []; return; }
  const v = speechSynthesis.getVoices();
  if (v && v.length) VOICES = v;
}
if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.onvoiceschanged = () => {
    loadVoices();
    if (viVoices().length && S.novoice) { S.novoice = 0; save(); }   // 나중에 깔았으면 잔소리를 거둔다
  };
  setTimeout(loadVoices, 400);
  setTimeout(loadVoices, 1500);
}
const viVoices = () => (VOICES || []).filter(v => (v.lang || '').toLowerCase().startsWith('vi'));
const viVoice = () => viVoices()[0] || null;
/* 폰마다 받는 길이 다르다 — 아이폰과 안드로이드를 구별해서 알려준다.
   (기종·버전마다 메뉴 이름이 조금씩 달라서 '비슷한 이름'이라고 밝혀 둔다) */
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* 소리 한 군데로 — 녹음이 있으면 녹음, 없으면 기기 목소리.
   전에는 문제 화면이 play() 를 바로 불러서, 녹음 없는 단어은 **아무 소리도 안 났다**. */
/* 소리 자동 재생 (대표님 2026-10-02: "단어카드를 넘기든, 단어 테스트를 넘기든 단어가 화면에 보이면 자동으로 소리 재생") —
   단어 카드가 뜰 때 · 베트남어를 보여 주는 문제가 뜰 때. 한국어를 보고 베트남어를 맞히는 문제는 답을 들려주는 셈이라 안 튼다(답한 뒤에는 원래대로 소리가 난다).
   머리띠 스피커 단추로 끈다(수업 중·지하철). 기본은 켜짐 */
const autoOn = () => true;   // 머리띠 스피커(켜기/끄기) 단추는 뺐다 (대표님 2026-10-02 "최상단 스피커 버튼 왜 있냐 없애") — 늘 켜짐. 예전에 끈 사람(S.autoSnd=false)도 다시 켜짐
let AS_PEND = null;
function autoSay(vi) {
  if (!autoOn() || !vi) return;
  AS_PEND = { vi, t: Date.now() };
  const k = recKey(vi); k ? play(k, false) : speakVi(vi);
}
function sound(t) {
  if (typeof Q !== 'undefined' && Q && Q.blind && Q._answered && CURV === 'quiz') return;   // 시험 중 답한 뒤 정답 소리를 안 들려준다
  if (AIDX[t]) { play(t, false); return; }
  speakVi(t, false, 0, S.voice);
}
/* 목소리는 **대표님이 고른 것 하나**로 (대표님 지적, 2026-08-29).
   전에는 기본이 메신저 쌤 성별(S.tch)이었다. 그래서 같은 문장 안에서도
   녹음이 있는 단어은 고른 목소리로, 없는 단어은 쌤 목소리로 나서 남녀가 오갔다.
   메신저에서만 쌤 목소리를 쓰고(who='m'/'f' 를 넘긴다), 나머지는 고른 목소리다. */
function speakVi(t, retry, spd, who) {
  const g = who === 'm' || who === 'f' ? who : (S.voice === 'm' ? 'm' : 'f');
  if (AIDX[t]) {                                       // 우리 음원이 있으면 그게 낫다
    play(t, false, g);
    return;
  }
  const u = new SpeechSynthesisUtterance(t);
  const vs = viVoices();
  if (!vs.length && VOICES && VOICES.length && !S.ttsTold) {      // 폰에 베트남어 목소리가 없다 → 한 번만 설정 길을 알려 준다
    S.ttsTold = 1; save();
    popup('<b>이 폰에 베트남어 읽어 주기 목소리가 없습니다</b><br>우리 소리가 없는 단어는 폰이 대신 읽어 주는데, 지금은 다른 나라 말투로 읽힙니다.<br>' +
      '· 안드로이드: 설정 → 일반(또는 접근성) → 텍스트 음성 변환(TTS) → 기본 엔진 옆 ⚙ → 음성 데이터 설치 → <b>베트남어</b><br>' +
      '· 아이폰: 설정 → 손쉬운 사용 → 콘텐츠 말하기 → 음성 → <b>베트남어</b> 내려받기<br>설치한 뒤 앱을 다시 열면 됩니다.');
  }
  const male = g === 'm';
  // 폰마다 목소리 이름이 다르다 — 이름으로 남녀를 찾고, 못 찾으면 높낮이로 흉내 낸다
  const M = /male|nam\b|vim|minh|_m|-m\b/i, F = /female|linh|hoai|my|vif|_f|-f\b/i;
  const pick = vs.find(v => (male ? M : F).test(v.name || ''));
  if (pick) u.voice = pick;
  else if (vs.length) { u.voice = vs[0]; u.pitch = male ? .65 : 1.15; }
  if (pick && vs.length === 1) u.pitch = male ? .65 : 1.15;
  /* 기기 목소리(녹음이 없을 때 대신 쓰는 것)도 설정의 재생속도(기본 0.8배)를 그대로 따른다
     (대표님 지시, 2026-09-09: "속도도 0.8배속 모두 다 적용했니?") — 예전엔 여기만
     따로 .85 로 못 박혀 있어서 설정을 바꿔도 기기 목소리는 안 느려졌었다. */
  u.lang = 'vi-VN'; u.rate = spd ? spd : rate();
  let started = false;
  u.onstart = () => { started = true; };
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  // 크롬·사파리에서 첫 호출이 조용히 씹히는 일이 있다 — 안 시작하면 한 번만 다시
  if (!retry) setTimeout(() => { if (!started) speakVi(t, true, spd, who); }, 450);
}




/* ── 화면 자판 — 베트남어 · 한글 ─────────────────────────────────
   폰 자판으로는 성조를 못 친다. 그래서 자판을 화면 안에 통째로 그린다.
   글자 배열은 **베트남 사람들이 실제로 쓰는 것과 같은 QWERTY** 다 —
   베트남어는 로마자를 쓰므로 자판 자체는 영문 자판과 같고, 다른 것은
   성조와 모자(ă â ê ô ơ ư đ)를 얹는 방법뿐이다.
   한글도 폰 자판에 기대지 않고 우리가 그린다 — [베/한] 한 번으로 바뀐다. */
const KBROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];



/* ── 텔렉스 ──────────────────────────────────────────────────
   베트남 사람들이 실제로 치는 방식. 글자를 치고 뒤에 열쇠 글자를 붙인다.
     aa→â  ee→ê  oo→ô  aw→ă  ow→ơ  uw→ư  dd→đ
     s→´(sắc)  f→`(huyền)  r→̉(hỏi)  x→~(ngã)  j→.(nặng)  z→부호 지움
   같은 열쇠를 한 번 더 치면 되돌아간다 (chaoff → chaof 가 아니라 chaof→chào, 한 번 더 f → chaof).
   폰에서는 텔렉스가 압도적이고, 데스크탑에서는 VNI(숫자)도 쓴다. 우리는 폰이라 텔렉스다. */
const TLXTONE = { s: '́', f: '̀', r: '̉', x: '̃', j: '̣' };
const TLXHAT = { aa: 'â', ee: 'ê', oo: 'ô', aw: 'ă', ow: 'ơ', uw: 'ư', dd: 'đ' };
const TLXBASE = Object.fromEntries(Object.entries(TLXHAT).map(([k, v]) => [v, k]));
const curTone = w => {
  const m = w.normalize('NFD').match(/[̣̀́̃̉]/);
  return m ? m[0] : '';
};
/* 단어 뒤에 ch 를 쳤을 때 텔렉스가 만드는 단어. 바꿀 것이 없으면 null. */
function telex(word, ch) {
  const up = ch !== ch.toLowerCase(), c = ch.toLowerCase();
  if (!word) return null;
  // ① 성조 열쇠
  if (TLXTONE[c] || c === 'z') {
    const bare = stripTone(word);
    if (!/[aăâeêioôơuưy]/i.test(bare)) return null;      // 모음이 없으면 그냥 글자
    const cur = curTone(word);
    if (c === 'z') return cur ? bare : null;
    if (cur === TLXTONE[c]) return bare + ch;            // 한 번 더 → 되돌리고 글자를 남긴다
    return withMark(bare, TLXTONE[c], tonePos(bare));
  }
  // ② 모자 열쇠
  const last = word[word.length - 1], lastLow = last.toLowerCase();
  // w 는 아래 '모음 덩어리' 규칙이 맡는다 — 여기서 가로채면 muaw 가 muă 가 된다
  const made = c === 'w' ? null : TLXHAT[lastLow + c];
  if (made) return word.slice(0, -1) + (up || last !== lastLow ? made.toUpperCase() : made);
  /* w 는 바로 앞 글자가 아니라 **단어의 모음 덩어리**를 찾아간다 — 진짜 텔렉스가 그렇다.
     comw → cơm, muaw → mưa, duongw → dương. 앞 글자만 보면 comw·muă·duơng 이 되어 버린다.
     덩어리 안에서 uo 가 있으면 둘 다, 없으면 u > o > a 차례로 하나만 바꾼다. */
  if (c === 'w') {
    const V = 'aăâeêioôơuưy';
    const bare = stripTone(word).toLowerCase();
    let e = -1;
    for (let i = word.length - 1; i >= 0; i--) if (V.includes(bare[i])) { e = i; break; }
    if (e >= 0) {
      let b0 = e; while (b0 > 0 && V.includes(bare[b0 - 1])) b0--;
      const setAt = (str, i, ch2) => {
        const t = curTone(str[i]);
        const put2 = t ? withMark(ch2, t, 0) : ch2;
        const upC = str[i] === str[i].toUpperCase() && str[i] !== stripTone(str[i]).toLowerCase();
        return str.slice(0, i) + (upC ? put2.toUpperCase() : put2) + str.slice(i + 1);
      };
      for (let i = b0; i < e; i++)                       // uo → ươ (둘 다)
        if (bare[i] === 'u' && bare[i + 1] === 'o')
          return setAt(setAt(word, i, 'ư'), i + 1, 'ơ');
      for (const want of ['u', 'o', 'a'])                // 없으면 u > o > a 차례로 하나만
        for (let i = b0; i <= e; i++)
          if (bare[i] === want) return setAt(word, i, TLXHAT[want + 'w']);
    }
  }
  /* aa·ee·oo·dd 도 붙어 있지 않아도 된다 — banw 가 아니라 bana 로 쳐도 bân 이 된다.
     단어 안에서 같은 밑글자를 뒤에서부터 찾아 모자를 씌운다. 진짜 텔렉스가 그렇다. */
  if (TLXHAT[c + c]) {
    const bare2 = stripTone(word).toLowerCase();
    for (let i = word.length - 1; i >= 0; i--) {
      if (bare2[i] !== c) continue;
      if (TLXBASE[stripTone(word[i]).toLowerCase()]) break;   // 이미 모자가 있으면 되돌리기 쪽으로
      const t = curTone(word[i]);
      const ch2 = t ? withMark(TLXHAT[c + c], t, 0) : TLXHAT[c + c];
      const upC = word[i] === word[i].toUpperCase() && word[i] !== bare2[i];
      return word.slice(0, i) + (upC ? ch2.toUpperCase() : ch2) + word.slice(i + 1);
    }
  }
  const code = TLXBASE[stripTone(lastLow)];              // 이미 모자가 있으면 되돌린다
  if (code && code[1] === c) {
    const tone = curTone(word);
    const back = code[0] + ch;
    return word.slice(0, -1) + (tone ? withMark(back[0], tone, 0) + ch : back);
  }
  return null;
}



/* ---------- 시작 ---------- */
/* 뒤로가기 — 한 단계씩. 전에는 어디서 눌러도 홈으로 튀어서,
   복습 안에서 방식만 바꾸려 해도 처음부터 다시 들어가야 했다. */
$('#back').onclick = () => { const f = NAV.pop(); (f || renderHome)(); };
/* 머리띠의 내 정보 단추는 뺐다 (대표님 지시 2026-09-27 오후) — 내용은 홈 아래 '설정'으로 녹였다(homeSettings) */

/* ── 오류 보고 (대표님 지시 2026-09-27 밤) ──────────────────────────────
   머리띠의 ⚑ 단추 — 어느 화면에서든(헷갈리는 짝 팝업이 떠 있어도) 지금 화면의 오류를 보낸다.
   화면 사진 대신 **그 화면을 다시 그릴 수 있는 것**을 보낸다: 화면 이름·탭·단어·소리 파일·그림 파일·목소리·
   팝업 단어·판번호·기기 + 지금 화면의 HTML(글자라 작다, 사진이 아니다 — 같은 CSS 로 그대로 다시 그려 볼 수 있다).
   서버는 동아리 워커(Cloudflare KV, 공짜)의 'bug' 행동에 쌓이고 tools/bug_admin.py 로 읽는다.
   서버가 아직 옛 판이거나 오프라인이면 기기(S.bugq)에 두었다가 다음에 다시 보낸다. */
function bugContext() {
  const c = { view: CURV, tab: ACTIVE_TAB, title: $('#title').textContent, crumb: ($('#crumb') && $('#crumb').textContent) || '',
              ver: ((document.querySelector('script[src*="app.js"]') || {}).src || '').split('v=')[1] || '',
              voice: S.voice, online: navigator.onLine, ua: navigator.userAgent.slice(0, 160),
              scr: innerWidth + 'x' + innerHeight, at: new Date().toISOString() };
  try {
    if (L && L.items && L.items[L.i]) {
      const it = L.items[L.i], d = it.d || {};
      c.lesson = L.day && L.day.day; c.theme = L.day && L.day.theme; c.face = L.face;
      c.item = { k: it.k, vi: d.vi, ko: d.ko, img: d.img, ex: d.ex && d.ex.vi, t: d.t, i: L.i, n: L.items.length };
    }
    if (typeof Q !== 'undefined' && Q && Q.list && Q.list[Q.i]) {
      const q = Q.list[Q.i];
      c.quiz = { i: Q.i, total: Q.total, mode: q.mode, word: q.word || (q.w && q.w.vi), stem: String(q.stem || '').slice(0, 80), img: q.img };
    }
    if (typeof FL !== 'undefined' && FL && FL.list && FL.list[FL.i]) c.flash = { i: FL.i, vi: FL.list[FL.i].vi };
    c.audio = (audio.src || '').split('/').slice(-3).join('/');
    const pp = document.querySelector('.pairpop'); if (pp) c.pair = (pp.querySelector('.pairpophd b') || {}).textContent;
    c.mview = S.mview; c.spd = S.spd;
  } catch (e) { c.ctxErr = String(e).slice(0, 80); }
  return c;
}
function bugSnapshot() {
  try {
    const main = document.querySelector('main');
    const vis = [...main.children].filter(x => !x.hidden).map(x => x.outerHTML).join('');
    const pops = [...document.querySelectorAll('.modalback:not(.bugback)')].map(x => x.outerHTML).join('');
    let h = ('<header id="top">' + $('#top').innerHTML + '</header>' + vis + pops).replace(/\s+/g, ' ');
    return h.length > 150000 ? h.slice(0, 150000) + '<!--cut-->' : h;
  } catch (e) { return ''; }
}
const BUG_KINDS = [['img', '그림이 이상해요'], ['snd', '소리가 이상해요'], ['mean', '뜻·발음이 틀려요'],
                   ['ui', '화면이 깨져요'], ['dead', '안 눌리거나 멈춰요'], ['etc', '기타']];
function bugReport(extra) {
  if (document.querySelector('.bugback')) return;
  const back = el('div', 'modalback bugback');
  const box = el('div', 'modalbox bugbox');
  const where = !$('#crumb').hidden && $('#crumb').textContent ? $('#crumb').textContent : $('#title').textContent;   // 머리띠 줄(단어-교재-1 …)이 있으면 그것 (2026-09-28 밤)
  box.append(el('div', 'bughd', '<b>⚑ ' + tr('이 화면 오류 보고') + '</b><span>' + esc(where) + '</span>'));
  let kind = 'img';                                   // 처음 고른 것 = '그림이 이상해요' (대표님 지시 2026-09-28 밤)
  const chips = el('div', 'chiprow bugchips');
  BUG_KINDS.forEach(([k, t]) => {
    const c = el('button', 'chip' + (k === kind ? ' on' : ''), tr(t)); c.type = 'button';
    c.onclick = () => { kind = k; [...chips.children].forEach(x => x.classList.toggle('on', x === c)); };
    chips.append(c);
  });
  box.append(chips);
  const ta = el('textarea', 'bugta'); ta.rows = 3;
  ta.placeholder = tr('무엇이 이상한지 한 줄만 적어 주세요 (안 적어도 됩니다)');
  box.append(ta);
  const snapRow = el('label', 'bugsnap');
  const cb = el('input'); cb.type = 'checkbox'; cb.checked = true;
  snapRow.append(cb, el('span', null, tr('화면 모습도 함께 보내기 (글자만, 사진이 아닙니다)')));
  box.append(snapRow);
  // 안내 문장('지금 화면·단어·소리·그림 파일 이름이 자동으로 붙습니다…')은 뺐다 (대표님 지시 2026-09-27 저녁)
  const row = el('div', 'bugbtns');
  const cancel = el('button', 'ghost big', tr('취소')), send = el('button', 'primary big', tr('보내기'));
  cancel.onclick = () => back.remove();
  send.onclick = async () => {
    send.disabled = true;
    const rep = { kind, note: ta.value.trim().slice(0, 500), ctx: Object.assign(bugContext(), extra || {}), snap: cb.checked ? bugSnapshot() : '' };
    back.remove();
    const ok = await bugSend(rep);
    popup(ok ? '<b>' + tr('보냈습니다. 고맙습니다!') + '</b><br>' + tr('확인해서 고치겠습니다.')
             : '<b>' + tr('지금은 보내지 못했습니다.') + '</b><br>' + tr('기기에 두었다가 연결되면 자동으로 보냅니다.'));
  };
  row.append(cancel, send); box.append(row);
  back.append(box); document.body.append(back);
  setTimeout(() => ta.focus(), 50);
}
async function bugSend(rep) {
  try { const j = await cCall(Object.assign({ act: 'bug' }, rep)); if (j && j.ok) return true; } catch (e) { }
  S.bugq = (S.bugq || []).concat([rep]).slice(-20); save();
  return false;
}
async function bugFlush() {
  if (!(S.bugq || []).length || !navigator.onLine) return;
  const q = S.bugq.slice(); S.bugq = []; save();
  for (const rep of q) await bugSend(rep);
}
$('#goBug').onclick = () => bugReport();
addEventListener('load', () => setTimeout(bugFlush, 4000));
$('#face').innerHTML = '<i data-f="card">' + tr('단어') + '</i><i data-f="pron">' + tr('발음') + '</i>';   // 남/여 단추와 같은 꼴 (대표님 2026-10-03 "디자인 통일")
$('#face').onclick = () => { if (FACE && L) FACE(L.face === 'pron' ? 'card' : 'pron'); };
/* 머리띠의 홈 단추는 뺐다 (대표님 지시 2026-09-27) — 홈은 아래 탭의 [홈]이 맡는다 (renderHome). */

/* 날씨·시간 — 베트남 시각(실시간)과 하노이·호찌민 한 주 예보.
   무료 기상 서비스(Open-Meteo, 키·가입 불필요)라 운영비 0원 원칙에 맞다. */
const WXICON = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
  80: '🌧️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
/* 지방별 날씨 이야기 — 옷·건강·출퇴근에 바로 걸리는 것만 */
const WXNOTE = {
  n: ['하노이는 <b>사계절이 뚜렷합니다.</b> 봄(2~4월)은 흐리고 이슬비가 계속돼 빨래가 잘 안 마릅니다.',
      '여름(5~8월)은 35도를 넘고 습해서 체감이 더 높습니다. 오후 소나기가 잦고, 7~9월엔 태풍이 올라옵니다.',
      '가을(9~11월)이 가장 좋습니다 — 맑고 선선해 밖에서 지내기 좋습니다.',
      '겨울(12~1월)은 15도 안팎까지 떨어지는데 <b>난방이 없어</b> 체감은 훨씬 춥습니다. 두꺼운 옷을 챙기세요.',
      '겨울~봄에는 미세먼지가 심한 날이 많습니다. 마스크를 상비하세요.'],
  s: ['호찌민은 <b>계절이 둘뿐입니다</b> — 우기와 건기. 일 년 내내 27도 안팎으로 덥습니다.',
      '우기(5~10월)엔 오후 한때 굵은 소나기가 거의 매일 옵니다. 30분이면 그치니 우비 하나면 됩니다.',
      '건기(11~4월)는 비가 거의 없고 맑습니다. 3~4월이 가장 덥습니다(35도 이상).',
      '비 온 뒤 길이 잠기는 곳이 있어 오토바이 출퇴근 때 조심해야 합니다.',
      '겨울에도 반팔로 지냅니다 — 두꺼운 옷은 필요 없습니다.'],
};
const WXCLIMATE = {   // 월별 평균 기온(도) / 강수량(mm) — 기상 평년값
  n: [[17,18],[18,26],[20,44],[24,90],[28,189],[30,240],[30,288],[29,318],[28,265],[26,131],[22,43],[18,23]],
  s: [[26,14],[27,4],[28,10],[30,50],[29,218],[28,312],[28,294],[28,270],[27,327],[27,267],[27,117],[26,48]],
};
const WXCITY = { n: { name: '하노이 (북부)', lat: 21.03, lon: 105.85 },
                 s: { name: '호찌민 (남부)', lat: 10.82, lon: 106.63 } };
function showWx(city) {
  const c = (city === 'n' || city === 's') ? city : 'n';
  show('wx', '날씨', true);
  const b = $('#wxBody');
  b.textContent = '';
  const pick = el('div', 'qplay');
  ['n', 's'].forEach(k => {
    const bb = el('button', 'ghost sm' + (k === c ? ' pick' : ''), WXCITY[k].name);
    bb.onclick = () => showWx(k);
    pick.append(bb);
  });
  b.append(pick);
  const box = el('div', null, '날씨를 불러오는 중…');
  b.append(box);
  const q = WXCITY[c];
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + q.lat + '&longitude=' + q.lon +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FBangkok')
    .then(r => r.json()).then(js => {
      box.textContent = '';
      const d = js.daily;
      box.append(el('p', 'newsday', '이번 주'));
      const row = el('div', 'wxrow');
      d.time.forEach((t, k) => {
        const day = new Date(t + 'T00:00');
        const cell = el('div', 'wxday' + (k === 0 ? ' today' : ''));
        cell.append(el('span', null, k === 0 ? '오늘' : ['일','월','화','수','목','금','토'][day.getDay()]),
                    el('i', null, WXICON[d.weather_code[k]] || '☁️'),
                    el('b', null, Math.round(d.temperature_2m_max[k]) + '°'),
                    el('em', null, Math.round(d.temperature_2m_min[k]) + '°'));
        if (d.precipitation_sum[k] >= 1) cell.append(el('u', null, Math.round(d.precipitation_sum[k]) + 'mm'));
        row.append(cell);
      });
      box.append(row);
      box.append(el('p', 'newsday', '월평균 기온 · 강수량'));
      const cur = new Date().getMonth();
      const wrap = el('div', 'wxscroll');
      const mrow = el('div', 'wxrow wxclim');
      WXCLIMATE[c].forEach(([tp, rn], i) => {
        const cell = el('div', 'wxday' + (i === cur ? ' today' : ''));
        cell.append(el('span', null, (i + 1) + '월'), el('b', null, tp + '°'), el('em', null, rn + 'mm'));
        mrow.append(cell);
      });
      wrap.append(mrow); box.append(wrap);
      box.append(el('p', 'newsday', WXCITY[c].name + ' 날씨는 이렇습니다'));
      const ul = el('ul', 'wxnote');
      WXNOTE[c].forEach(t => { const li = el('li'); li.innerHTML = t; ul.append(li); });
      box.append(ul);
      box.append(el('p', 'note', '예보 출처 — Open-Meteo (무료 기상 자료)'));
    }).catch(() => { box.textContent = '날씨를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'; });
}

/* 사용법 — 짧은 제목 + 한 줄씩. 이 앱의 모든 설계 근거가 여기 모여 있다. */

/* 베트남 문화 — 학습 카드와 같은 방식으로 한 장씩 넘기며 본다 */
/* 세트 → 그 자리에 어울리는 문화 이야기. **번호가 아니라 주제 이름으로** 짝짓는다.
   번호로 하면 차례를 한 번 바꿀 때마다 짝이 통째로 어긋난다 — 실제로 두 번 어긋났다.
   억지로 채우지 않는다. 안 맞는 자리는 비워 둔다 — 딴소리가 나면 안 하느니만 못하다.
   한 장은 두 곳까지만 쓴다. 봉제·전자 심화 세트는 문화 이야기가 안 붙어 비워 뒀다. */
/* 문화 카드 한 벌 — 표지에서 뺀 조각들을 죽 넘겨 볼 수 있게. */

/* 숫자를 막대로 — 글보다 그림이 빠르다 (7권 바로알기).
   색만으로 크기를 알리지 않는다: **막대 길이 + 숫자**를 함께 보여 준다(색각 배려, CLAUDE.md).
   rows = [[값, 이름], …] · unit = 단위 이름 */
function numBars(rows, unit) {
  const box = el('div', 'nbars');
  const max = Math.max(...rows.map(r => Math.abs(Number(r[0])) || 0)) || 1;
  rows.forEach(([v, name], i) => {
    const n = Number(v) || 0;
    const r = el('div', 'nbar');
    r.append(el('span', 'nbnm', esc(String(name))));
    const track = el('span', 'nbtrack');
    const fill = el('i', 'nbfill');
    fill.style.width = Math.max(3, Math.abs(n) / max * 100) + '%';
    fill.dataset.k = String(i % 4);              // 무늬가 네 가지 — 색이 안 보여도 갈린다
    track.append(fill);
    r.append(track);
    r.append(el('span', 'nbval', n.toLocaleString('ko-KR')));
    box.append(r);
  });
  if (unit) box.append(el('div', 'nbunit', tr('단위') + ': ' + esc(unit)));
  return box;
}

/* ---------- 7권 베트남 바로알기 ----------
   메뉴가 knowEntry 를 부르는데 함수가 없었다 — 눌러도 아무 일이 없었다 (2026-08-30 검수).
   강 열두 개를 고르면 그 강의 카드를 문화와 **같은 꼴**로 넘겨 본다 (대표님 지시:
   "문화와 바로알기 ui 동일하게 해라"). 단어·문장은 없다 — 읽는 자리다. */
let KNOW = null;
function knowEntry() {
  if (KNOW) return drawKnowList();
  const b = $('#subBody'); b.textContent = '';
  b.append(el('p', 'lede', tr('불러오는 중…')));
  show('sub', '베트남 바로알기', true);
  fetch('data/know.json', { cache: 'no-cache' }).then(r => r.json())
    .then(j => { KNOW = j.lec || []; drawKnowList(); })
    .catch(() => { b.textContent = ''; b.append(el('p', 'lede', tr('불러오지 못했습니다'))); });
}
function drawKnowList() {
  const b = $('#subBody'); b.textContent = '';
  b.append(el('p', 'lede', tr('열두 강 · 그림과 숫자로 읽습니다')));
  const list = el('ul', 'days');
  KNOW.forEach((x, i) => {
    const bt = el('button');
    bt.dataset.done = S.done['KNOW' + i] ? '1' : '0';
    bt.append(el('span', 'num', (i + 1) + tr('강')),
              el('span', 'nm', esc(x.t)),
              el('span', 'st', (x.c || []).length + tr('장')));
    bt.onclick = () => { dive(drawKnowList); startKnow(i); };
    const li = el('li'); li.append(bt); list.append(li);
  });
  b.append(list);
  show('sub', '베트남 바로알기', true);
}
function startKnow(i) {
  const x = KNOW[i];
  LCRUMB = tr('문화') + '-' + (i + 1) + ' ' + tr(x.t);
  L = { day: { day: 'KNOW' + i, theme: x.t, know: 1 }, cult: 1, i: 0,
        items: (x.c || []).map(c => ({ k: 'know', d: c })) };
  drawCard();
  show('learn', x.t, true);
}




/* ---------- 기사 학습 ----------
   어제 베트남에서 무슨 일이 있었는지 읽으면서 겸사겸사 말도 익히는 자리다.
   **복습 창고에 넣지 않는다** — 여기 단어는 외우라고 있는 게 아니라 스치라고 있다.
   그래서 채점도, 사다리도 없다. 일주일치만 남고 지난 것은 사라진다. */
let NEWSD = null;
function newsSets() {
  if (NEWSD) return Promise.resolve(NEWSD);
  return fetch('data/news_days.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : { days: [] })
    .then(j => (NEWSD = j.days || []))
    .catch(() => (NEWSD = []));
}
function showNewsLearn() {
  const b = $('#subBody');
  b.textContent = '';
  b.append(el('p', 'lede', '불러오는 중…'));
  show('sub', '기사', true);
  newsSets().then(days => {
    b.textContent = '';
    if (!days.length) {
      b.append(el('p', 'lede', '아직 기사 세트가 없습니다'));
      b.append(el('p', 'note', '매일 새벽 6시 30분에 어제 기사 다섯 편으로 만들어집니다.'));
      return;
    }
    b.append(el('p', 'note', '어제 베트남 소식을 읽으면서 말도 익힙니다. 여기 단어는 <b>복습에 안 들어갑니다</b>.'));
    let last = null;
    days.forEach(d => {
      if (d.ts !== last) { b.append(el('p', 'newsday', esc(d.ts.slice(5).replace('-', '월 ') + '일'))); last = d.ts; }
      const btn = el('button', 'bigmenu');
      /* 갈래를 앞에 붙인다 (대표님 지시, 2026-08-30) — 무엇에 대한 기사인지 먼저 보인다.
         색만으로 가르지 않는다: 글자 그대로 '경제'·'일자리'라 적는다(색각 배려). */
      const top = el('span', 'newstop');
      if (d.cat) top.append(el('i', 'newscat', esc(d.cat)));
      top.append(el('b', null, esc(d.theme)));
      btn.append(top, el('span', 'msub', esc(d.title)));
      /* **제목을 누르면 바로 카드뉴스**가 뜬다 (대표님 지시 2026-09-02).
         전에는 학습으로 갔고 카드뉴스는 아래 작은 단추였다 — 그러지 말라 하셨다.
         원문 보러 가기 단추는 **카드뉴스 화면 아래**에 있다(showCards). */
      btn.onclick = () => showCards(d);
      b.append(btn);
    });
  });
}
/* 카드뉴스 두 장 — 눌러서 크게 보고, 길게 누르면 폰에 저장된다(브라우저 기본 동작). */
function cardName(d, n) {
  const day = (NEWSD || []).filter(x => x.ts === d.ts);
  const i = day.indexOf(d) + 1;
  return `img/card/${d.ts}-${i}-${n}.webp`;
}
function showCards(d) {
  const b = $('#subBody'); b.textContent = '';
  b.append(el('p', 'lede', esc(d.title)));
  const box = el('div', 'cardbox');
  let got = 0;
  [1, 2].forEach(n => {
    const im = el('img', 'cardimg');
    im.src = cardName(d, n);
    im.alt = tr('카드뉴스') + ' ' + n;
    im.loading = 'lazy';
    im.onerror = () => im.remove();
    im.onload = () => { got++; };
    box.append(im);
  });
  b.append(box);
  if (d.u) {
    const go = el('a', 'primary big', '🔗 ' + tr('기사 보러가기'));
    go.href = d.u; go.target = '_blank'; go.rel = 'noopener';
    go.style.display = 'block'; go.style.textAlign = 'center'; go.style.margin = '14px 0';
    b.append(go);
  }
  b.append(el('p', 'note', tr('그림을 길게 누르면 폰에 저장됩니다.')));
  show('sub', '카드뉴스', true);
}


/* 오늘 기사 — 깃허브 로봇이 아침마다 골라둔 것을 보여준다 (data/news.json) */
/* 진도 백업 — 아이폰 사파리가 저장소를 비울 수 있어서 대비한다.
   단추는 홈 아래가 아니라 '진도' 타일 안에 있다 — 첫 화면은 학습만 남긴다.
   200단어가 다 쌓이면 원본이 7.5KB라 압축해서 내보낸다 (10,600자 → 2,900자). */
const b64 = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s); };



/* 진도 단추(백업·불러오기·초기화)는 화면에서 뺐다 — 진도는 이제 저절로 서버에 올라간다.
   함수는 남겨 둔다: doReset 은 '내 정보'에서 아직 쓰고, 나머지는 서버가 죽었을 때의 대비책이다. */



/* 위 토글 두 개 — 두 값이 다 보이고 지금 켜진 쪽만 진하게 (현재 상태가 헷갈리지 않게) */
function seg(a, b, first) {
  /* 좁은 폰에서는 '북부'의 뒷글자를 CSS 로 숨긴다 — 머리띠가 22px 넘쳐
     제목이 사라지고 화면이 옆으로 밀렸다 (2026-08-30 검수) */
  const cut = s => s.length > 1 ? s[0] + '<span class="wo">' + s.slice(1) + '</span>' : s;
  return `<i${first ? ' class="on"' : ''}>${cut(a)}</i><i${first ? '' : ' class="on"'}>${cut(b)}</i>`;
}
function drawVoiceBtn() {
  $('#voice').innerHTML = seg('남', '여', S.voice === 'm');   // 남·여 차례 (대표님 지시 2026-09-27)
}

$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save(); drawVoiceBtn();
  audio.pause(); PB.hold = null;                 // 다른 목소리로 바꾸면 듣던 소리는 멈추고, 이후 모든 재생은 새 목소리로
  if (!$('#learn').hidden && L) { L.keepFace = L.face; drawCard(); }
};

/* 남부(호찌민) 소리는 완전히 없앴다 (대표님 지시, 2026-09-09) — 버튼도 index.html에서
   지웠고 코드에서도 자리를 뺐다. 이 함수 이름만 옛 흔적으로 남아 있다. */
function drawRegion() {
  drawVoiceBtn();
  topBtns();
}

/* ---------- 다른 사람들의 평균 ----------
   등수는 보여주지 않는다. 견줄 것은 '내가 몇 등이냐'가 아니라
   '내 듣기가 남들보다 약한가'다 — 그래야 무엇을 더 할지가 나온다.
   서버는 과목별 평균만 돌려준다. AI를 안 쓰므로 사용량과 무관하다. */
const RANKKEY = ['say', 'ear', 'read', 'spell', 'memo'];
/* 순위표의 자리표. 별명은 겹칠 수 있어서 기기마다 다른 표를 하나 만들어 쓴다.
   이 표에는 아무 뜻이 없다 — 누구인지 알 수 있는 정보가 아니다. */
const myUid = () => S.uid || (S.uid = Math.random().toString(36).slice(2, 10), save(), S.uid);
function myPcts() {
  const cur = snapshot(), o = {};
  SUBJ.forEach((x, i) => {
    const n = cur[x.all] || 0;
    if (n >= NEED) o[RANKKEY[i]] = Math.round((cur[x.ok] || 0) * 100 / n);
  });
  return o;
}

/* ---------- 운영 현황 (운영자만) ----------
   운영을 하려면 몇 명이 쓰는지, 언제 오는지는 알아야 한다.
   그러나 그걸 알기 위해 **누구인지를 알 필요는 없다** — 서버는 별명조차 안 내보낸다.
   주소 뒤에 #admin 을 한 번 붙여 열면 이 화면이 켜진다(그 표시는 이 폰에만 남는다). */
function showAdmin() {
  const b = $('#subBody');
  b.textContent = '';
  b.append(el('p', 'lede', '불러오는 중…'));
  show('sub', '운영 현황', true);
  cCall({ act: 'stats' }).then(j => {
    b.textContent = '';
    b.append(el('p', 'lede', '이번 주 (' + j.week + ' 시작)'));
    const st = el('div', 'stats');
    [['쓴 사람', j.people], ['공부한 사람', j.active], ['단어를 외운 사람', j.started]]
      .forEach(([k, v]) => { const c = el('div', 'stat');
        c.append(el('b', null, String(v)), el('span', null, k)); st.append(c); });
    b.append(st);

    b.append(el('p', 'newsday', '요일별 접속자'));
    const rows = '월화수목금토일'.split('').map((nm, i) =>
      [nm + '요일', j.people ? Math.round(j.byDay[i] * 100 / j.people) : 0, NEED]);
    b.append(bars(rows));
    b.append(el('p', 'dimtxt', j.byDay.map((n, i) => '월화수목금토일'[i] + ' ' + n + '명').join(' · ')));

    // 어디까지 갔다가 그만두는가 — 앱을 고칠 자리를 알려주는 가장 중요한 그림
    if (j.funnel) {
      b.append(el('p', 'newsday', '끝낸 세트 (어디서 멈추는가)'));
      const F = ['0개', '1~2', '3~5', '6~10', '11~20', '21+'];
      b.append(bars(F.map((nm, i) => [nm, j.people ? Math.round(j.funnel[i] * 100 / j.people) : 0, NEED])));
      b.append(el('p', 'dimtxt', j.funnel.map((n, i) => F[i] + ' ' + n + '명').join(' · ')));
    }
    // 아직 하고 있는가 — 시작한 지 오래된 사람 중 최근 사흘 안에 공부한 비율
    if (j.cohort) {
      b.append(el('p', 'newsday', '얼마나 남아 있는가'));
      const C = [['1일 뒤', 0], ['3일 뒤', 1], ['7일 뒤', 2], ['14일 뒤', 3], ['30일 뒤', 4]];
      b.append(bars(C.map(([nm, i]) => [nm, j.cohort[i] ? Math.round(j.alive[i] * 100 / j.cohort[i]) : 0,
                                        j.cohort[i] ? NEED : 0])));
      b.append(el('p', 'dimtxt', C.map(([nm, i]) => nm + ' ' + j.alive[i] + '/' + j.cohort[i]).join(' · ') +
        '<br>시작한 지 그만큼 지난 사람 중, 최근 사흘 안에 공부한 사람 수입니다.'));
    }
    const st2 = el('div', 'stats');
    [['평균 실력 점수', j.avgScore], ['가운뎃값', j.midScore], ['평균 외운 단어', j.avgMemo],
     ['진짜 기억률', (j.trueRet || 0) + '%']]
      .forEach(([k, v]) => { const c = el('div', 'stat');
        c.append(el('b', null, String(v)), el('span', null, k)); st2.append(c); });
    b.append(st2);
    b.append(el('p', 'dimtxt', '<b>진짜 기억률</b> = 다시 볼 때가 된 카드를 첫 시도에 맞힌 비율. ' +
      '간격 반복에서 <b>85~90%</b>가 목표입니다. 낮으면 간격이 너무 벌어진 것이고, ' +
      '너무 높으면 필요 없는 복습을 시키고 있는 것입니다.'));
    // 어느 단어가 발목을 잡는가 — 커리큘럼을 고칠 직접 근거
    if ((j.hardWords || []).length) {
      b.append(el('p', 'newsday', '많은 사람이 틀리는 단어'));
      b.append(el('p', 'dimtxt', j.hardWords.map(w => esc(w[0]) + ' <b>' + w[1] + '명</b>').join(' · ')));
      b.append(el('p', 'dimtxt', '이 단어들은 그림·예문·나오는 순서를 손봐야 할 자리입니다.'));
    }
    b.append(el('p', 'note', '이름도 기기도 알 수 없습니다 — 서버가 숫자만 셉니다. ' +
      '순위판은 주 단위라 월요일 새벽에 0부터 다시 셉니다.'));
    const again = el('button', 'ghost sm', '새로고침');
    again.onclick = showAdmin;
    b.append(again);
  }).catch(e => { b.textContent = ''; b.append(el('p', 'lede', '불러오지 못했습니다')); });
}

/* ---------- 서버 호출 ----------
   계정(로그인·가입·별명)과 프로필 사진(폰 알림 구독)에 쓰는 공용 서버.
   동아리 기능은 빠졌지만 주소·이름은 그대로 둔다(다른 데서도 이 서버를 쓴다). */
const CLUBURL = 'https://viet-club.chaochao-app.workers.dev';
async function cCall(o) {
  /* 네트워크가 한 번 미끄러지면 **바로 다시 한 번** 해 본다 (2026-08-31).
     서버는 멀쩡했다 — 폰이 잠깐 끊기거나 워커가 깨어나는 사이에 걸린 것이다.
     사람에게 '다시' 를 누르게 하지 말고 앱이 먼저 한 번 더 해 본다. */
  let r = null;
  for (let k = 0; k < 2; k++) {
    try {
      r = await fetch(CLUBURL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify(Object.assign({ nick: S.nick, uid: myUid() }, o)) });
      break;
    } catch (e) {
      if (k) throw new Error('연결하지 못했습니다 — 잠시 뒤 다시 해 주세요.');
      await new Promise(z => setTimeout(z, 700));
    }
  }
  const j = await r.json();
  if (j.error === 'gone') throw new Error('서버가 아직 옛 판입니다 — 관리자에게 알려 주세요.');
  if (j.error) throw new Error(j.error);
  return j;
}

function chipRow(items, cur, onPick) {
  const w = el('div', 'chiprow');
  items.forEach(([k, label]) => {
    const c = el('button', 'chip' + (k === cur ? ' on' : ''), esc(label));
    c.type = 'button';
    c.onclick = () => onPick(k);
    w.append(c);
  });
  return w;
}

/* 온 날 세기.
   솔직히: 연속 기록은 하루 끊기면 그만두게 만든다는 걱정이 있어 일부러 안 세고 있었다.
   이제 세되 **끊긴 것을 벌하지 않는다** — 빨간 글씨도, 잃는다는 말도 쓰지 않는다.
   그리고 '모두 며칠'을 나란히 둔다. 연속이 0이 돼도 모두 며칠은 줄지 않는다. */
function streakDays() {
  const d = new Date();
  if (!S.act[ymd(d)]) d.setDate(d.getDate() - 1);      // 오늘 아직 안 했으면 어제부터 센다
  let n = 0;
  while (S.act[ymd(d)] && n < 4000) { n++; d.setDate(d.getDate() - 1); }
  return n;
}


/* ---------- 폰 알림 ----------
   서버가 보내는 것은 '깨워라' 신호뿐이다. 대화 내용은 안 보낸다 — 무슨 말이 왔는지는
   앱을 열어야 보인다. 서버에 남는 것은 알림 주소 하나뿐이고, 그것으로는 누구인지 알 수 없다.
   아이폰은 **홈 화면에 추가**해야만 알림이 온다(사파리 제약). 안드로이드는 그냥 된다. */
const VAPID = 'BIXezZvZv-VlkJ49y1sGnEtMfqWkENMJOyZPi1XubrE2J6DeCh2ttTDoimW-EO7PR1U-8qNqSyMetpfZMwZEnTQ';
const b64bytes = b => { const s = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
                        return Uint8Array.from(s, c => c.charCodeAt(0)); };
function canPush() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}
async function askPush() {
  if (!canPush()) return '이 브라우저는 알림을 지원하지 않습니다.';
  const ok = await Notification.requestPermission();
  if (ok !== 'granted') return '알림이 꺼져 있습니다. 브라우저 설정에서 허용해 주세요.';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe(
      { userVisibleOnly: true, applicationServerKey: b64bytes(VAPID) });
    await cCall({ act: 'sub', uid: myUid(), sub: sub.toJSON() });
    S.push = 1; save();
    return null;
  } catch (e) { return '알림을 켜지 못했습니다 — ' + (e.message || ''); }
}
async function stopPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await cCall({ act: 'unsub', uid: myUid() });
  } catch (e) { }
  S.push = 0; save();
}

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

Promise.all([
  fetch('data/days.json', { cache: 'no-cache' }).then(r => r.json()),
  fetch('data/audio_index.json', { cache: 'no-cache' }).then(r => r.json())
]).then(([d, a]) => {
  ALL = [...(d.prep || []), ...d.days];
  DRILL = d.tonedrill || [];
  VDRILL = d.voweldrill || [];
  EAR = d.eardrill || {};                 // 장마다 '귀로 구별하기' 묶음 (tools/build_basics.py, 2026-09-28)
  AIDX = a;
  /* 대문자 표제어('Giới')만 색인에 있으면 문장 가운데의 소문자 단어('giới')을 눌러도 우리 소리가 안 났다 —
     기기 목소리로 넘어가 북부·고른 목소리가 아니었다(2026-09-26). 소문자 별칭을 달아 둔다. */
  for (const k of Object.keys(a)) { const l = k.toLowerCase(); if (l !== k && !(l in a)) a[l] = a[k]; }
  drawRegion();
  try { tallyReset(); } catch (e) { }                   // 하루 집계의 기준을 켤 때 잡아 둔다 — 첫 문제부터 오늘 칸에 들어가게 (2026-09-30 밤)
  // 메일 속 재설정 링크(?reset=토큰)로 들어온 경우 — 다른 무엇보다 먼저 처리한다.
  const resetTok = new URLSearchParams(location.search).get('reset');
  if (resetTok) { resetPwForm(resetTok); return; }
  // 로그인 관문 — 안 되어 있으면 어느 기기든 열자마자 계정 화면부터, 다른 데로 못 나간다
  // (대표님 지시, 2026-09-12: '나중에 둘러보기' 없앰). 로그인된 기기는 로그아웃 전까지
  // 그대로 유지된다(S.acct 가 기기에 남는다).
  if (!S.acct || !S.acct.tok) { acctForm(true, 'login'); return; }
  if (!S.nick) { askNick(); return; }                 // 최초 1회
  if (S.wk && S.wk.k !== weekKey()) { showWeek(weekReport(S.wk.base)); return; }
  // 앱을 켜면 **홈**이 뜬다 — 앵무 '짜오'와 [오늘 학습][오늘 복습] 단추가 바로 보인다 (대표님 지시 2026-09-27, 09-09 지시를 뒤집음).
  ACTIVE_TAB = 'home';
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
