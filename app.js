'use strict';

/* 확대·축소 원천 봉쇄 — iOS 사파리는 meta의 user-scalable=no 를 무시할 수 있어
   집게 확대(gesturestart)를 코드로 막는다. 더블탭 확대는 CSS touch-action이 막는다 —
   touchend 를 건드리면 빠른 연타 클릭이 죽으므로(전에 겪은 사고) 절대 손대지 않는다. */
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- 저장 ---------- */
const KEY = 'vnstudy.v2';
const S = Object.assign({ voice: 'f', region: 'n', kr: 'show', done: {}, srs: {}, act: {}, stats: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'));
let saveWarned = false;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    // 시크릿 모드나 저장 공간이 꽉 찬 경우. 학습은 계속 되게 두고 한 번만 알린다.
    if (!saveWarned) {
      saveWarned = true;
      alert('이 브라우저에서는 진도가 저장되지 않습니다.\n시크릿 모드를 끄거나 다른 브라우저로 열어 주세요.\n(학습은 그대로 하실 수 있습니다)');
    }
  }
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
let ALL = [], AIDX = {}, DRILL = [], VDRILL = [];
const $ = s => document.querySelector(s);
/* ── 화면 언어 (1단계) ────────────────────────────────────────────
   베트남 사용자를 위해 화면 문구를 베트남어로. 6천 줄의 한국어를 다 뜯지 않고,
   글자가 화면에 놓이는 길목(el·show)에서 **문구를 통째로 맞바꾼다.**
   표에 있는 문구만 바뀐다 — 아직 없는 문구는 한국어로 남고, 표를 채우면 늘어난다. */
const UIVI = {
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
  'AI 대화': 'Trò chuyện với AI',
  'AI 듣기 실패:': 'AI nghe thất bại:',
  'AI 선생님 점검': 'Thầy AI kiểm tra',
  'AI 선생님이 보는 중…': 'Thầy AI đang xem…',
  'AI 점검 실패:': 'Kiểm tra AI thất bại:',
  'AI 채점 실패:': 'Chấm điểm AI thất bại:',
  'AI 채점을 쓰려면 <b>내 정보</b>에서 구글 무료 키를 한 번 넣어 주세요.': 'Để dùng chấm điểm AI, hãy nhập khóa miễn phí của Google một lần trong <b>Thông tin của tôi</b>.',
  'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.': 'Cần khóa AI — hãy nhập trong Thông tin của tôi.',
  'AIza… 로 시작하는 키': 'Khóa bắt đầu bằng AIza…',
  'AI가 듣는 중…': 'AI đang nghe…',
  'AI가 읽는 중…': 'AI đang đọc…',
  'AI와 베트남어로 대화하려면 <b>구글 무료 키</b>가 한 번 필요합니다.<br>': 'Để trò chuyện với AI bằng tiếng Việt, cần <b>khóa miễn phí của Google</b> một lần.<br>',
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
  '같은 동아리 사람끼리 엄지척과 쪽지를 주고받습니다': 'Các thành viên cùng câu lạc bộ có thể gửi lượt thích và tin nhắn cho nhau',
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
  '담벼락은 서버가 새 판이어야 보입니다.': 'Bảng tin chỉ hiện khi máy chủ đã cập nhật bản mới.',
  '대화 내용은 구글 서버로 전송됩니다. 개인정보(실명 전체·주소·사번)는 쓰지 마세요.': 'Nội dung trò chuyện được gửi tới máy chủ Google. Đừng nhập thông tin cá nhân (họ tên đầy đủ, địa chỉ, mã nhân viên).',
  '동아리에 들어가기': 'Tham gia câu lạc bộ',
  '되돌릴 수 없습니다. 정말 지울까요?\n(백업해 둔 글자가 있으면 나중에 되살릴 수 있습니다)': 'Không thể hoàn tác. Bạn thực sự muốn xóa?\n(Nếu đã sao lưu thì sau này vẫn khôi phục được)',
  '두 과목이 10문제를 넘으면 강점·약점과 처방이 나옵니다.': 'Khi hai kỹ năng vượt 10 câu, sẽ hiện điểm mạnh, điểm yếu và lời khuyên.',
  '듣고 있습니다… 다 말하면 위 단추를 누르세요.': 'Đang nghe… Nói xong hãy bấm nút phía trên.',
  '들어 보기': 'Nghe thử',
  '들어보기': 'Nghe thử',
  '로그아웃할까요? 진도는 이 기기에 그대로 남습니다.': 'Bạn muốn đăng xuất? Tiến độ học vẫn được giữ trên thiết bị này.',
  '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.': 'Không dùng được micro. Hãy cho phép trong cài đặt trình duyệt.',
  '막대는 나, 세로 선은 <b>다른 사람들의 평균</b>입니다.': 'Cột là bạn, đường dọc là <b>mức trung bình của người khác</b>.',
  '만나는 땅으로 묶여 있습니다. 같은 도시면 한국인도 베트남인도 함께 옵니다.': 'Nhóm theo nơi gặp mặt. Cùng thành phố thì cả người Hàn và người Việt đều đến.',
  '많은 사람이 틀리는 단어': 'Những từ nhiều người hay sai',
  '말하기 (구술시험)': 'Nói (thi vấn đáp)',
  '말하기 · 쓰기': 'Nói · Viết',
  '말하기 · 쓰기 연습': 'Luyện nói · viết',
  '맞게 썼어요': 'Bạn viết đúng',
  '매일 새벽 6시 30분에 어제 기사 다섯 편으로 만들어집니다.': 'Được tạo lúc 6 giờ 30 sáng mỗi ngày từ năm bài báo của hôm trước.',
  '매일 아침 6시 30분에 업데이트됩니다. 최근 3일치만 남습니다.<br>기사 출처 — 인사이드비나': 'Cập nhật lúc 6 giờ 30 sáng mỗi ngày. Chỉ giữ lại 3 ngày gần nhất.<br>Nguồn bài báo — Inside Vina',
  '모음 소개 다시 보기': 'Xem lại phần giới thiệu nguyên âm',
  '모의고사': 'Thi thử',
  '기초 문법': 'Ngữ pháp cơ bản',
  '한국어 기초 문법 18개 — 배우는 순서 그대로입니다.':
    '18 điểm ngữ pháp cơ bản tiếng Hàn — đúng theo thứ tự học.',
  '문법 자료를 받지 못했습니다. 인터넷을 확인해 주세요.':
    'Không tải được tài liệu ngữ pháp. Hãy kiểm tra kết nối mạng.',
  /* ── 베트남인용 한국어 과정 홈 화면 ── */
  '베트남인을 위한 한국어': 'Tiếng Hàn cho người Việt',
  'EPS-TOPIK · KIIP · TOPIK I 시험 대비': 'Luyện thi EPS-TOPIK · KIIP · TOPIK I',
  '응시': 'Đã thi', '회': ' lần', '평균': 'Trung bình', '점': ' điểm',
  '지금 있는 것 — 모의고사, AI 채점 말하기·쓰기': 'Hiện đã có — đề thi thử, luyện nói·viết có AI chấm',
  '아직 없는 것 — 날마다 배우는 과정': 'Chưa có — khóa học theo từng ngày',
  '목록으로': 'Về danh sách',
  '문장 고르기': 'Chọn câu',
  '문장 고쳐 주기': 'Sửa câu giúp tôi',
  '문제 유형별 정답률 (누적)': 'Tỷ lệ đúng theo dạng bài (cộng dồn)',
  '미완으로': 'Để chưa xong',
  '배운 기록을 모두 지우고 처음부터 다시 시작할까요?': 'Bạn muốn xóa toàn bộ ghi chép đã học và bắt đầu lại từ đầu?',
  '배운 문장으로 말 걸기': 'Bắt chuyện bằng câu đã học',
  '배울 말씨': 'Giọng muốn học',
  '번역 실패': 'Dịch thất bại',
  '베트남 소식': 'Tin tức Việt Nam',
  '베트남 자판에는 <b>성조 글쇠가 없습니다.</b> 글자를 다 치고': 'Bàn phím tiếng Việt <b>không có phím thanh điệu.</b> Hãy gõ hết chữ rồi',
  '베트남어로 <b>입 밖에 내어</b> 말해 보세요. 속으로만 생각하면 효과가 절반입니다.': 'Hãy <b>nói thành tiếng</b> bằng tiếng Việt. Chỉ nghĩ trong đầu thì hiệu quả giảm một nửa.',
  '별명': 'Biệt danh',
  '별명 (2~10글자)': 'Biệt danh (2~10 ký tự)',
  '별명 (2~10자) — 순위·동아리에 보입니다': 'Biệt danh (2~10 ký tự) — hiển thị ở bảng xếp hạng và câu lạc bộ',
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
  '비밀번호 (8자 이상)': 'Mật khẩu (từ 8 ký tự)',
  '사람': 'người',
  '사람 목록을 불러오지 못했습니다.': 'Không tải được danh sách thành viên.',
  '사람을 누르면 <b>엄지척</b>과 <b>쪽지</b>를 보낼 수 있습니다.': 'Bấm vào một người để gửi <b>lượt thích</b> và <b>tin nhắn</b>.',
  '사진': 'Ảnh',
  '사진과 분석은 <b>같은 동아리 사람에게만</b> 보입니다.': 'Ảnh và phân tích <b>chỉ hiển thị với người cùng câu lạc bộ</b>.',
  '새': 'Mới',
  '새로고침': 'Tải lại',
  '서버에 저장된 진도가 있습니다.\n이 기기로 불러올까요? 지금 기기의 진도는 덮어써집니다.': 'Có tiến độ đã lưu trên máy chủ.\nBạn muốn tải về thiết bị này? Tiến độ hiện tại trên máy sẽ bị ghi đè.',
  '성조 6개 소개 다시 보기': 'Xem lại phần giới thiệu 6 thanh điệu',
  '성조는 낱말 뒤에 <b>f s r x j</b> 를 붙여 찍습니다 (chao+f → chào).': 'Thanh điệu được gõ bằng cách thêm <b>f s r x j</b> sau từ (chao+f → chào).',
  '성조별 정답률 (누적)': 'Tỷ lệ đúng theo thanh điệu (cộng dồn)',
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
  '아무나 못 들어오게 (내가 받아 줘야 가입)': 'Không cho ai cũng vào được (tôi duyệt thì mới được tham gia)',
  '아이디 (영문·숫자 4~20자)': 'Tên đăng nhập (chữ và số, 4~20 ký tự)',
  '아주 좋습니다 ✔': 'Rất tốt ✔',
  '아직 글이 없습니다 — 첫 줄을 남겨 보세요.': 'Chưa có bài viết nào — hãy để lại dòng đầu tiên.',
  '아직 기사 세트가 없습니다': 'Chưa có phần bài báo nào',
  '아직 끝낸 세트가 없습니다': 'Bạn chưa hoàn thành phần nào',
  '아직 다른 사람이 없습니다.': 'Chưa có ai khác.',
  '아직 만들어진 동아리가 없습니다. 첫 번째로 만들어 보세요.': 'Chưa có câu lạc bộ nào. Hãy là người đầu tiên tạo nhé.',
  '아직 문제 수가 적어 강점·약점을 말할 수 없습니다. 한 주만 더 해 보세요 — 과목마다 10문제가 넘으면 판정합니다.': 'Số câu còn ít nên chưa thể nói về điểm mạnh, điểm yếu. Hãy học thêm một tuần — mỗi kỹ năng vượt 10 câu là sẽ đánh giá được.',
  '아직 배운 단어가 없습니다. 먼저 오늘 학습을 시작해 보세요.': 'Bạn chưa học từ nào. Hãy bắt đầu bài học hôm nay trước.',
  '아직 배운 문장이 없습니다': 'Bạn chưa học câu nào',
  '알겠어요': 'Đã hiểu',
  '알림': 'Thông báo',
  '어디서 만나나요 — 같은 도시라야 실제로 모입니다': 'Gặp nhau ở đâu — phải cùng thành phố mới gặp được thật',
  '어떤 동아리인가요?': 'Câu lạc bộ như thế nào?',
  '어제 베트남 소식을 읽으면서 말도 익힙니다. 여기 단어는 <b>복습에 안 들어갑니다</b>.': 'Vừa đọc tin Việt Nam hôm qua vừa học tiếng. Từ ở đây <b>không vào phần ôn tập</b>.',
  '언제든 바꿀 수 있습니다. <b>먼저 쓴 사람이 임자</b>라 겹치는 별명은 못 씁니다.': 'Bạn có thể đổi bất cứ lúc nào. <b>Ai dùng trước thì thuộc về người đó</b> nên không dùng được biệt danh trùng.',
  '얼마나 남아 있는가': 'Còn nhớ được bao nhiêu',
  '업종': 'Ngành nghề',
  '여기에 쓰세요…': 'Viết vào đây…',
  '옆으로 밀면 앞뒤로 넘어갑니다. 그냥 두면 3초마다 저절로 넘어갑니다.': 'Vuốt sang ngang để chuyển thẻ. Nếu để yên, cứ 3 giây sẽ tự chuyển.',
  '예: <b>': 'Ví dụ: <b>',
  '예보 출처 — Open-Meteo (무료 기상 자료)': 'Nguồn dự báo — Open-Meteo (dữ liệu khí tượng miễn phí)',
  '오늘 배운 것, 한 마디… (베트남어 환영)': 'Hôm nay học được gì, viết một câu… (rất hoan nghênh tiếng Việt)',
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
  '이름 (예: 하노이 탁구, 빈즈엉 3공장)': 'Tên (ví dụ: Bóng bàn Hà Nội, Nhà máy 3 Bình Dương)',
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
  '한 줄 소개 (60자 — 예: 퇴근 후 풋살, 초보 환영)': 'Giới thiệu một dòng (60 ký tự — ví dụ: Đá futsal sau giờ làm, hoan nghênh người mới)',
  '한국어로 쓰셨네요 — 베트남어로는': 'Bạn đã viết bằng tiếng Hàn — trong tiếng Việt là',
  '화면 언어': 'Ngôn ngữ màn hình',
  '＋ 새 단어 ·': '＋ Từ mới ·',
  '🎤 말하고 채점받기': '🎤 Nói và nhận chấm điểm',
  '💬 현지에서는 ·': '💬 Người bản xứ nói ·',
  '📕 오답노트 (': '📕 Sổ lỗi sai (',
  '🔊 다시 듣기': '🔊 Nghe lại',
  '🔑 한자어': '🔑 Từ Hán Việt',
  '🛡️ <b>연속 보호권</b>이 어제 하루를 메웠습니다.<br>연속 기록이 이어집니다. (남은 보호권': '🛡️ <b>Quyền bảo vệ chuỗi ngày</b> đã bù cho ngày hôm qua.<br>Chuỗi ngày học vẫn tiếp tục. (Còn lại',
  '🛡️ 이번 주 5일을 채워 <b>연속 보호권</b>을 받았습니다. (': '🛡️ Bạn đã học đủ 5 ngày tuần này và nhận được <b>quyền bảo vệ chuỗi ngày</b>. (',
  '하루 5분': 'Học 5 phút', '복습': 'Ôn tập', '기본기': 'Cơ bản', '문법': 'Ngữ pháp',
  '동아리': 'Câu lạc bộ', '사용법': 'Hướng dẫn', '일상': 'Hằng ngày', '직무': 'Công việc',
  '기사': 'Bản tin', '단어': 'Từ vựng', '문장': 'Câu', '최근 학습': 'Bài vừa học', '오답노트': 'Sổ lỗi sai',
  '오늘 학습': 'Bài hôm nay', '오늘 복습': 'Ôn hôm nay', '내일 학습': 'Bài ngày mai',
  '내일 복습': 'Ôn ngày mai', '없음': 'Không có', '배운 단어': 'Từ đã học',
  '외운 단어': 'Từ đã thuộc', '끝낸 세트': 'Bài đã xong',
  '진도 백업': 'Sao lưu', '백업 불러오기': 'Khôi phục', '진도 초기화': 'Xóa tiến độ',
  '다음 ›': 'Tiếp ›', '확인 문제 ›': 'Kiểm tra ›', '완료 ›': 'Xong ›', '홈으로': 'Về trang chính',
  '듣기': 'Nghe', '느리게 듣기': 'Nghe chậm', '느리게': 'Chậm', '따라 말하기': 'Nói theo',
  '말하기': 'Nói', '읽기': 'Đọc', '쓰기': 'Viết', '암기': 'Ghi nhớ', '랜덤': 'Ngẫu nhiên',
  '3분': '3 phút', '오늘 완료': 'Xong hôm nay', '지우기': 'Xóa', '채점받기': 'Chấm điểm',
  '정답 보기': 'Xem đáp án', '보내기': 'Gửi', '만들기': 'Tạo', '올리기': 'Đăng',
  '번역': 'Dịch', '바꾸기': 'Đổi', '보기': 'Xem', '받기': 'Nhận',
  '메신저': 'Tin nhắn', '내 정보': 'Của tôi', '이름': 'Tên', '지역': 'Vùng miền',
  '계정': 'Tài khoản', '로그인': 'Đăng nhập', '가입': 'Đăng ký', '로그아웃': 'Đăng xuất',
  '로그인·가입': 'Đăng nhập / Đăng ký', '배울 언어': 'Ngôn ngữ học', '보호권': 'Khiên bảo vệ',
  '서버 진도': 'Tiến độ trên máy chủ', '나중에 둘러보기': 'Xem sau', '처음이세요? 가입하기': 'Lần đầu? Đăng ký', '이미 계정이 있어요 — 로그인': 'Đã có tài khoản — Đăng nhập', '가입하기': 'Đăng ký', '로그인': 'Đăng nhập', '회원가입': 'Đăng ký', '뭐예요?': 'Là gì?',
  '동아리 만들기': 'Tạo câu lạc bộ', '다른 동아리 보기': 'Xem CLB khác', '동아리 탈퇴': 'Rời CLB',
  '동아리 사람들': 'Thành viên CLB', '오늘 한 줄': 'Một dòng hôm nay', '이번 주 출석': 'Điểm danh tuần này',
  '주간 성적표': 'Bảng điểm tuần', '이름없음': 'Chưa có tên',
  '모음': 'Nguyên âm', '자음': 'Phụ âm', '성조': 'Thanh điệu', '호칭': 'Xưng hô',
  '어순': 'Trật tự từ', '단위': 'Đơn vị', '남부 소리': 'Giọng Nam', '겹모음': 'Nguyên âm đôi',
  '자판 쓰는 법': 'Cách gõ phím', '숫자 읽는 법': 'Cách đọc số',
  '듣고 뜻을 고르세요': 'Nghe và chọn nghĩa', '뜻을 고르세요': 'Chọn nghĩa',
  '베트남어로 말해 보세요': 'Hãy nói bằng tiếng Việt', '듣고 자판으로 쳐 보세요': 'Nghe và gõ lại',
  '듣고 손으로 써 보세요': 'Nghe và viết tay', '모르겠어요': 'Không biết',
  '원어민': 'Người bản xứ', '나': 'Tôi', '번갈아 듣기': 'Nghe lần lượt',
  '발음': 'Phát âm', '높낮이': 'Thanh điệu', '띄어쓰기': 'Dấu cách', '확인': 'OK',
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
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 번호는 두 과정 다 Day N 으로 통일. 트랙 구분은 앞에 붙는 '일상/직무' 말이 한다.
const label = d => (typeof d.day === 'string' ? '준비 ' + d.day.slice(1)
  : 'Day ' + (d.n || d.day));
const trackName = d => (typeof d.day === 'string' ? '' : d.track === 'work' ? '직무 ' : '일상 ');

/* ---------- 소리 ---------- */
/* 아이폰 사파리는 '사용자가 방금 누른 것'이 아니면 새 Audio 재생을 막는다.
   그래서 Audio 하나를 만들어 두고 주소만 바꿔 쓴다. 한 번 허락되면 그 뒤로는 계속 난다. */
const audio = new Audio();
const myVoice = new Audio();          // 내가 녹음한 것 재생용 (따로 둔다)

/* 지역(북부/남부) × 목소리(여/남) 에 따른 소리 폴더. 남부도 여·남 둘 다 있다. */
const voiceDir = () => S.region === 's' ? (S.voice === 'm' ? 'sm' : 'sf') : S.voice;

function play(text, slow, dir) {
  const h = AIDX[text];
  if (!h) return;
  const d = dir || voiceDir();
  audio.pause();
  audio.onerror = null;
  audio.src = `audio/${d}/${slow ? 'slow' : 'n'}/${h}.mp3`;
  // 남부 파일이 아직 없으면 북부로라도 들려준다
  if (d === 'sf' || d === 'sm') audio.onerror = () => {
    audio.onerror = null;
    audio.src = `audio/${S.voice}/${slow ? 'slow' : 'n'}/${h}.mp3`;
    audio.play().catch(() => { });
  };
  audio.currentTime = 0;
  audio.play().catch(() => { });
}
function playMine() {
  if (!REC.url) return;
  myVoice.pause();
  myVoice.src = REC.url;
  myVoice.currentTime = 0;
  myVoice.play().catch(() => { });
}
function soundRow(text, withSlow) {
  const row = el('div', 'sound');
  const a = el('button', 'ghost', '듣기');
  a.onclick = () => play(text, false);
  row.append(a);
  if (withSlow) {
    const b = el('button', 'ghost', '느리게 듣기');
    b.onclick = () => play(text, true);
    row.append(b);
  }
  return row;
}

/* 정답·오답 소리 — 답한 '즉시' 오는 피드백이 늦게 오는 피드백보다 낫다.
   소리는 짧고 작게(0.2초), 진동은 안드로이드에서만 울린다. */
function fxTone(ok) {
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
function bigWord(vi, tones) {
  const b = el('button', 'bigw');
  b.type = 'button';
  const list = (tones || []).length ? tones : vi.split(' ').map(sy => ({ syl: sy, name: 'ngang' }));
  list.forEach(t => {
    const u = el('span', 'bwsyl ' + t.name);
    u.append(el('b', null, esc(t.syl)), el('i', null, toneArrow(t.name)));
    if (t.ko) u.title = t.name + ' · ' + t.ko;
    b.append(u);
  });
  b.onclick = () => play(vi, false);
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
let REC = { stream: null, mr: null, url: null, key: null };

/* 카드를 넘기거나 화면을 떠나면 녹음 상태를 비운다.
   안 그러면 앞 단어의 녹음이 다음 카드에서 '내 소리'로 재생된다. */
function resetRec() {
  try { if (REC.mr && REC.mr.state === 'recording') REC.mr.stop(); } catch (e) { }
  if (REC.url) { URL.revokeObjectURL(REC.url); REC.url = null; }
  REC.mr = null; REC.key = null;
  releaseMic();
}

/* 마이크는 다 쓰면 반드시 놓아준다. 안 놓으면 폰에 녹음 표시가 계속 뜬다. */
function releaseMic() {
  if (REC.stream) {
    REC.stream.getTracks().forEach(t => t.stop());
    REC.stream = null;
  }
}

const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

async function toggleRec(text, btn, box) {
  if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
  if (!S.rectold) {                      // 처음 한 번만 — 녹음이 어디로 가고 어디에 남는지
    S.rectold = 1; save();
    popup('<b>녹음은 어디에 남나요</b><br>' +
      '· 우리 서버에는 <b>저장하지 않습니다.</b> 저장소 자체가 붙어 있지 않습니다.<br>' +
      '· 폰 안에서만 잠깐 들고 있다가 <b>다음 녹음 때 지웁니다.</b> 앱을 닫으면 사라집니다.<br>' +
      '· 발음을 받아 적는 일은 <b>구글(제미나이)</b>이 합니다 — 소리가 구글로 갑니다. ' +
      '구글이 그것을 얼마나 두는지는 <b>우리가 정하지 못합니다.</b><br>' +
      '· 높낮이 판정은 <b>폰 안에서</b> 합니다. 아무 데도 안 보냅니다.');
  }
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
  mr.start();
  btn.dataset.on = '1';
  btn.classList.add('rec-on');       // 이름은 그대로, 녹음 중은 색으로만 알린다
  setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, secs * 1000);
}


/* ---------- 녹음 중 실시간 표시 ----------
   말하는 동안 음높이가 그려진다. 끝나고 나서야 보는 것보다, 말하면서 보는 쪽이
   자기 소리를 고치는 데 낫다. 45ms 창으로 60ms마다 한 점 — 폰에서도 가볍다.
   함께 하는 일: 남은 시간 표시 · **폰을 입 가까이 대라**는 안내 · 너무 작으면 알려 주기. */
const RECSEC = t => (String(t || '').trim().split(/\s+/).length > 1 ? 7 : 3.5);   // 문장 7초 · 낱말 3.5초

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
  let quiet = 0, raf = 0, last = 0, dead = false;

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
    else { quiet = 0; pts.push(PITCH.yin(buf, ctx.sampleRate) || null); }
    if (quiet === 25) tip.innerHTML = '<b>소리가 잘 안 들립니다</b> — 폰을 더 가까이 대고 조금 크게';
    draw();
  };
  tick();
  return () => { dead = true; cancelAnimationFrame(raf); wrap.remove();
                 try { src.disconnect(); } catch (e) { } };
}

function drawCompare(text, box) {
  box.textContent = '';
  box.parentElement?.querySelector('.prenat')?.remove();   // 원어민 단독 곡선은 겹쳐 그리기로 대체
  const row = el('div', 'cmp');
  const a = el('button', 'ghost', '원어민');
  a.onclick = () => play(text, false);
  const b = el('button', 'ghost', '나');
  b.onclick = () => {
    if (REC.key === text) playMine();
  };
  const c = el('button', 'ghost', '번갈아 듣기');
  c.onclick = async () => {
    play(text, false);
    await new Promise(r => setTimeout(r, 2200));
    if (REC.key === text) playMine();
  };
  /* 판정 칸은 **그래프 아래**에 온다 — 그림을 보고 나서 결과를 읽는 순서가 자연스럽다.
     발음(AI)과 높낮이(곡선)는 서로 다른 것을 보므로 한 칸에 나란히 둔다. */
  const curve = el('div', 'curvearea');
  const said = el('div', 'saidbox');
  said.append(el('div', 'vrow', '<span class="vname">발음</span><span class="vmark">…</span>'),
              el('div', 'vrow', '<span class="vname">높낮이</span><span class="vmark">…</span>'));
  row.append(a, b, c);
  box.append(row, curve, said);
  showTone(text, REC.url, curve);        // 녹음이 끝나면 버튼 없이 바로 그린다
  if (aiReady()) aiListen(text, REC.url, said);   // 발음도 누를 것 없이 바로
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
/* 말소리 하나를 AI에게 묻는다 — 퀴즈든 따라 말하기든 **같은 방식**을 쓴다.
   낱말이면 헷갈리는 넷 중에서 고르게 하고(실측 92%), 문장이면 받아쓰게 한다.
   예전에는 따라 말하기만 옛 받아쓰기(60%)를 쓰고 있었다 — 같은 소리에 다른 점수가 나왔다. */
async function askSpeech(text, b64, onWait) {
  const opts = sayOpts(text);
  if (opts) {
    const t = await gCall({
      contents: [{ role: 'user', parts: [
        { text: '이 녹음은 베트남어 낱말 하나를 읽은 것이다. 아래 보기 가운데 **무엇을 말했는지** 하나만 고르라.\n'
                + opts.map((o, i) => (i + 1) + '. ' + o).join('\n')
                + '\n보기에 없으면 0 이라고 답하라. 숫자 하나만 답하고 다른 말은 붙이지 마라.' },
        { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
      generationConfig: { maxOutputTokens: 6, thinkingConfig: { thinkingBudget: 0 } }
    }, onWait);
    const m = /\d/.exec(t || ''), k = m ? +m[0] : 0;
    const heard = k >= 1 && k <= opts.length ? opts[k - 1] : null;
    return { heard, ok: heard ? heard === text : null, pick: true };
  }
  const heard = await gCall({
    contents: [{ role: 'user', parts: [
      { text: '이 녹음은 한국인이 베트남어를 읽은 것이다. 들린 그대로 베트남어 철자로 받아 적어라. 철자만 답하고 다른 말은 붙이지 마라.' },
      { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
    generationConfig: { maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } }
  }, onWait);
  const clean = x => String(x || '').toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
  const ok = clean(heard) === clean(text) || stripTone(clean(heard)) === stripTone(clean(text));
  return { heard, ok, pick: false };
}

async function aiListen(text, blobUrl, box) {
  try {
    const b64 = await recToWav(blobUrl);
    const { heard, ok, pick } = await askSpeech(text, b64);
    if (ok !== null) {
      S.stats.pronAll = (S.stats.pronAll || 0) + 1;
      if (ok) S.stats.pronOk = (S.stats.pronOk || 0) + 1;
      save();
    }
    // 받아쓰기일 때는 **성조 부호를 떼고** 보여준다. AI는 실제로 낸 높낮이가 아니라
    // '그런 낱말이 있으니까'로 부호를 채워 넣는다 — chao 를 평평하게 읽어도 chào 라고 적는다.
    const show = x => esc(pick ? x : stripTone(x));
    if (ok === null) { verdict(box, 0, null, '발음', '가려내기 어렵습니다 — 조금 크게 다시'); return; }
    verdict(box, 0, ok, '발음',
      ok ? (pick ? '알아들었습니다' : show(heard) + ' 로 들렸습니다')
         : show(heard) + ' 처럼 들립니다 (목표 ' + show(text) + ')');
    if (!ok) box.append(el('div', 'fixtip', '↳ ' + sayTip(text, heard)));
  } catch (e) { verdict(box, 0, null, '발음', 'AI가 듣지 못했습니다'); }
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
}

/* 첫 단어에서 한 번만 — 눌러서 소리 듣는 법을 모르면 이 앱의 절반이 안 보인다 */
function tutorTap() {
  if (S.tut) return;
  S.tut = 1; save();
  popup('<b>글자를 누르면 소리가 납니다</b><br>' +
        '단어도, 아래 예문도 눌러 보세요. 시계 단추는 느리게, 마이크 단추는 따라 말하기입니다.');
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

/* 원어민 높낮이 곡선 + 내 녹음 결과 자리. 버튼은 밖에 두고 여기는 그림만 맡는다. */
function curveArea(text, box) {
  const wrap = el('div', 'speak');
  const pre = el('div', 'curvearea prenat');
  nativeCurve(text).then(nat => {
    if (!nat || !nat.curve) return;
    pre.innerHTML = `<div class="curvebox">${curveSvg(null, nat.curve)}</div>` +
      `<div class="curvelegend"><span class="k nat"></span>원어민 소리 높낮이 (느린 발음)</div>`;
  });
  wrap.append(pre, box);
  return wrap;
}

function speakRow(text, withSound) {
  const wrap = el('div', 'speak');
  const row = el('div', 'qplay');
  if (withSound) {
    const s1 = el('button', 'ghost', '듣기'); s1.onclick = () => play(text, false);
    const s2 = el('button', 'ghost', '느리게 듣기'); s2.onclick = () => play(text, true);
    row.append(s1, s2);
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
      `<div class="curvelegend"><span class="k nat"></span>원어민 소리 높낮이 (느린 발음)</div>`;
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
  const h = AIDX[text];
  if (!h) return (nativeCache[key] = null);
  try {
    let r = await fetch(`audio/${voiceDir()}/slow/${h}.mp3`);
    if (!r.ok && S.region === 's') r = await fetch(`audio/${S.voice}/slow/${h}.mp3`);
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

async function showTone(text, blobUrl, box) {
  box.textContent = '';
  const wait = el('div', 'cmpnote', '소리 높낮이를 재는 중…');
  box.append(wait);

  let mine = null, nat = null;
  try {
    const r = await fetch(blobUrl);
    mine = await PITCH.analyze(await r.arrayBuffer(), getCtx(), true);   // 허밍 거르기
  } catch (e) { }
  nat = await nativeCurve(text);
  wait.remove();

  if (mine && mine.reject) { verdict(box.parentElement, 1, null, '높낮이', esc(mine.reject)); return; }
  if (!mine || !mine.curve) {
    verdict(box.parentElement, 1, null, '높낮이', '못 읽었습니다 — 조금 크고 또박또박 다시');
    return;
  }

  const wrap = el('div', 'curvebox');
  wrap.innerHTML = curveSvg(mine.curve, nat && nat.curve);
  box.append(wrap);
  const lg = el('div', 'curvelegend');
  lg.innerHTML = `<span class="k nat"></span>원어민 &nbsp; <span class="k mine"></span>나`;
  box.append(lg);

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
  const host = box.parentElement;
  if (!j) { verdict(host, 1, null, '높낮이', '이번엔 높낮이를 못 읽었습니다'); return; }
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

/* 이 낱말이 내야 할 성조 무리. 한 음절짜리는 데이터에 적힌 성조를 그대로 쓴다
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
const VIEWS = ['home', 'learn', 'quiz', 'tone', 'award', 'rules', 'chat', 'type', 'speak', 'course', 'write', 'news', 'wx', 'guide', 'week', 'nick', 'sub', 'club', 'exam'];
/* 위 북부남부·여남 토글은 소리가 나는 화면에서만 보여준다 — 나머지에선 자리만 차지한다 */
const SNDV = ['learn', 'quiz', 'tone', 'speak', 'type', 'write'];
let CURV = 'home';
const NAV = [];                      // 뒤로가기 발자국 (홈에 오면 비운다)
const dive = fn => { NAV.push(fn); };
function topBtns() {
  const need = SNDV.includes(CURV);
  $('#region').hidden = !need;
  $('#voice').hidden = !need;
  $('#wxnow').hidden = CURV !== 'home';          // 첫 화면에서만
  $('#goChat').hidden = CURV === 'chat';
  drawChatDot();
}

/* 머리 왼쪽 — 지금 베트남 시각과 날씨. 지역은 내 정보에서 고른 북부/남부를 따른다.
   출국 준비 중인 사람에게 '지금 거기 몇 시인가'는 매일 궁금한 것이고,
   날씨는 그날 뭘 입을지가 아니라 '내가 갈 곳이 어떤 곳인가'를 계속 상기시킨다. */
let WXNOW = { at: 0, t: null, code: null, city: null };
function drawWxNow() {
  const b = $('#wxnow');
  const c = S.region === 's' ? 's' : 'n';
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
function show(v, title, canBack) {
  if (v === 'home') NAV.length = 0;
  audio.pause(); myVoice.pause();               // 넘어가면 재생 중이던 소리도 멈춘다
  resetRec();
  VIEWS.forEach(x => $('#' + x).hidden = x !== v);
  $('#title').textContent = tr(title);
  if (DMT) { clearInterval(DMT); DMT = 0; }
  if (v !== 'chat') DM = null;
  $('#back').hidden = !canBack;
  CURV = v;
  topBtns();
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
    /* 연속 보호권 — 듀오링고의 streak freeze 를 우리 식으로.
       ① 어제 하루만 비었고 그제는 했으면, 보호권이 있을 때 어제를 메운다(값 2 = 보호권 자국).
       ② 보호권은 한 주에 5일 이상 공부하면 1개 (최대 2개). 사는 게 아니라 버는 것이다. */
    const y = new Date(); y.setDate(y.getDate() - 1);
    const y2 = new Date(); y2.setDate(y2.getDate() - 2);
    if (!S.act[ymd(y)] && S.act[ymd(y2)] && (S.shield || 0) > 0) {
      S.act[ymd(y)] = 2; S.shield--;
      popup('🛡️ <b>연속 보호권</b>이 어제 하루를 메웠습니다.<br>연속 기록이 이어집니다. (남은 보호권 ' + S.shield + '개)');
    }
    const wk = weekKey();
    if (S.shieldWk !== wk) {
      const n7 = Object.keys(S.act).filter(d => weekKey(new Date(d)) === wk).length;
      if (n7 >= 5) { S.shield = Math.min(2, (S.shield || 0) + 1); S.shieldWk = wk;
                     popup('🛡️ 이번 주 5일을 채워 <b>연속 보호권</b>을 받았습니다. (' + S.shield + '개)<br>하루 빠져도 연속이 이어집니다.'); }
    }
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

const doneCount = () => Object.keys(S.done).filter(k => +k >= 1).length;
const BADGES = [
  // ① 기초 — 시작을 뗐는가
  { icon: '🔤', name: '기본기를 뗐다', how: '기본기 학습 완료',
    test: () => ['P1','P2','P3','R1','R2','R3','R4'].every(k => S.done[k]) },
  { icon: '👋', name: '첫 5일',        how: '일상 Day 1~5 완료',             test: () => [1,2,3,4,5].every(k => S.done[k]) },
  { icon: '🏭', name: '출근 첫날',     how: '직무 세트 1개 완료',            test: () => ALL.some(d => d.track === 'work' && S.done[d.day]) },
  // ② 진도 — 얼마나 걸어왔는가
  { icon: '🌓', name: '10세트',        how: '아무 세트나 10개 완료',         test: () => doneCount() >= 10 },
  { icon: '🏔️', name: '25세트',        how: '세트 25개 완료',                test: () => doneCount() >= 25 },
  { icon: '🎖️', name: '50세트',        how: '세트 50개 완료',                test: () => doneCount() >= 50 },
  { icon: '🏁', name: '전 과정 완주',  how: '100세트 전부 완료',             test: () => doneCount() >= 100 },
  // ③ 어휘 — 만난 단어와 실제로 남은 단어
  { icon: '🔠', name: '단어 50',       how: '복습 창고에 단어 50개',         test: () => Object.keys(S.srs).length >= 50 },
  { icon: '💯', name: '단어 100',      how: '복습 창고에 단어 100개',        test: () => Object.keys(S.srs).length >= 100 },
  { icon: '📗', name: '단어 200',      how: '복습 창고에 단어 200개',        test: () => Object.keys(S.srs).length >= 200 },
  { icon: '📚', name: '단어 300',      how: '복습 창고에 단어 300개',        test: () => Object.keys(S.srs).length >= 300 },
  { icon: '📖', name: '단어 450',      how: '복습 창고에 단어 450개',        test: () => Object.keys(S.srs).length >= 450 },
  { icon: '🚀', name: '단어 600',      how: '복습 창고에 단어 600개',        test: () => Object.keys(S.srs).length >= 600 },
  { icon: '🏆', name: '단어 1000',     how: '전 과정 단어 1000개',           test: () => Object.keys(S.srs).length >= 1000 },
  { icon: '🧠', name: '외운 단어 100', how: '간격을 두고 두 번 이상 맞힌 단어 100개',
    test: () => Object.values(S.srs).filter(v => v.lv >= 2).length >= 100 },
  { icon: '🧩', name: '외운 단어 300', how: '간격을 두고 두 번 이상 맞힌 단어 300개',
    test: () => Object.values(S.srs).filter(v => v.lv >= 2).length >= 300 },
  // ④ 훈련 — 귀와 입
  { icon: '👂', name: '성조 8/10',     how: '성조 훈련에서 8점',             test: () => (S.stats.toneBest || 0) >= 8 },
  { icon: '🎯', name: '성조 만점',     how: '성조 훈련에서 10점',            test: () => (S.stats.toneBest || 0) >= 10 },
  { icon: '🗣️', name: '50번 말했다',   how: '소리 내어 50번',                test: () => (S.stats.said || 0) >= 50 },
  { icon: '🎙️', name: '120번 말했다',  how: '소리 내어 120번',               test: () => (S.stats.said || 0) >= 120 },
  { icon: '📢', name: '300번 말했다',  how: '소리 내어 300번',               test: () => (S.stats.said || 0) >= 300 },
  { icon: '🔊', name: '600번 말했다',  how: '소리 내어 600번',               test: () => (S.stats.said || 0) >= 600 },
  { icon: '💬', name: 'AI와 첫 대화',  how: 'AI 대화 한 번 시작',            test: () => (S.stats.chat || 0) >= 1 },
  // ⑤ 꾸준함 — 돌아오는 힘
  { icon: '📅', name: '한 주 5일',     how: '이번 주 5일 공부',              test: () => weekDots().filter(d => d.done).length >= 5 },
  { icon: '🔁', name: '복습 10판',     how: '복습 퀴즈 10번 완료',           test: () => (S.stats.rev || 0) >= 10 },
  { icon: '♻️', name: '복습 30판',     how: '복습 퀴즈 30번 완료',           test: () => (S.stats.rev || 0) >= 30 },
  { icon: '🔄', name: '복습 80판',     how: '복습 퀴즈 80번 완료',           test: () => (S.stats.rev || 0) >= 80 },
  { icon: '📆', name: '10일 출석',     how: '지금까지 총 10일 공부',         test: () => Object.keys(S.act).length >= 10 },
  { icon: '🗓️', name: '30일 출석',     how: '지금까지 총 30일 공부',         test: () => Object.keys(S.act).length >= 30 },
  { icon: '📔', name: '60일 출석',     how: '지금까지 총 60일 공부',         test: () => Object.keys(S.act).length >= 60 },
  { icon: '💎', name: '100일 출석',    how: '지금까지 총 100일 공부',        test: () => Object.keys(S.act).length >= 100 },
];



/* ---------- 실력 분석 ----------
   숫자를 눈에 보이게 그린다. 다만 표본이 적으면 그리지 않는다 —
   10문제로 "약점"을 말하면 그건 분석이 아니라 점(占)이다. */
const NEED = 10;                       // 이만큼 풀어야 판정한다
function bars(rows) {
  const box = el('div', 'bars');
  rows.forEach(([name, pct, n, avg, nlabel]) => {
    const thin = n < NEED;
    const r = el('div', 'barrow' + (thin ? ' thin' : ''));
    r.append(el('span', 'bname', name));
    const bar = el('span', 'bbar' + (typeof avg === 'number' ? ' avg' : ''));
    if (!thin) {
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
    r.append(el('span', 'bpct', thin ? '—' : pct + '%'));
    r.append(el('span', 'bn', nlabel != null ? nlabel
                                    : thin ? (NEED - n) + '문제 더' : n + '문제'));
    box.append(r);
  });
  return box;
}
function analysisData(mode) {
  const cur = snapshot(), b = (mode === 'week' && S.wk && S.wk.base) || {};
  const subj = SUBJ.map(x => {
    const n = (cur[x.all] || 0) - (b[x.all] || 0), ok = (cur[x.ok] || 0) - (b[x.ok] || 0);
    return { name: x.k, n, pct: n ? Math.round(ok * 100 / n) : null, tip: x.tip };
  });
  return subj;
}
function renderAnalysis(host, mode) {
  host.textContent = '';
  const tab = el('div', 'rolepick');
  [['week', '이번 주'], ['all', '누적']].forEach(([k, t]) => {
    const bb = el('button', 'ghost sm' + (mode === k ? ' pick' : ''), (mode === k ? '✓ ' : '') + t);
    bb.onclick = () => renderAnalysis(host, k);
    tab.append(bb);
  });
  host.append(el('p', 'anahead', '실력 분석'));
  host.append(tab);

  const subj = analysisData(mode);
  const ok = subj.filter(x => x.n >= NEED);
  host.append(el('p', 'newsday', '과목별 정답률'));
  const sbox = el('div');
  const drawSubj = avg => {
    sbox.textContent = '';
    sbox.append(bars(subj.map((x, i) => [x.name, x.pct === null ? 0 : x.pct, x.n,
                                         avg ? avg[RANKKEY[i]] : undefined])));
    if (avg) sbox.append(el('p', 'dimtxt',
      '막대는 나, 세로 선은 <b>다른 사람들의 평균</b>입니다.'));
  };
  drawSubj(null);
  host.append(sbox);
  // 다른 사람들의 평균을 받아 와 눈금으로 얹는다 (등수는 보여주지 않는다 — 견줄 것은 실력이지 자리가 아니다)
  if (S.nick && S.nick !== '이름없음') {
    const sk = skillScore();
    cCall({ act: 'rank', uid: myUid(), score: sk.score, memo: sk.memo, pct: myPcts(),
            days: weekDots().map(d => d.done ? 1 : 0),
            f: (Object.keys(S.act || {}).sort()[0] || ''),
            l: (Object.keys(S.act || {}).sort().pop() || ''),
            dd: Object.keys(S.act || {}).length,
            st: Object.keys(S.done).filter(k => +k >= 1).length,
            tr: Object.values(S.stats.od || {}).reduce((a, v) => [a[0] + v.ok, a[1] + v.all], [0, 0]),
            ms: Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2)
                  .sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]) })
      .then(j => { if (j && j.avg && Object.keys(j.avg).length) drawSubj(j.avg); })
      .catch(() => { });
  }


  const TN = { 'ngang': '평평', 'huyền': '내려감', 'sắc': '올라감',
               'hỏi': '내렸다올림', 'ngã': '끊었다올림', 'nặng': '짧고무겁게' };
  const named = (box, map) => Object.entries(S.stats[box] || {})
    .map(([k, v]) => [(map && map[k]) || k, Math.round(v.ok * 100 / v.all), v.all])
    .sort((a, b) => a[1] - b[1]);
  const tn = named('tn', TN);
  if (tn.length) { host.append(el('p', 'newsday', '성조별 정답률 (누적)')); host.append(bars(tn)); }

  const MD = { listen: '듣고 고르기', read: '읽고 고르기', meaning: '뜻 고르기',
               recall: '떠올려 말하기', dict: '받아쓰기',
               say: '말하기 (AI 채점)', sayself: '말하기 (스스로 매김)',
               type: '타이핑', hand: '손글씨 (스스로 매김)' };
  // 스스로 매긴 것과 AI가 매긴 것을 한 막대에 섞으면 그 막대는 아무것도 뜻하지 않게 된다
  const md = named('md', MD);
  if (md.length) { host.append(el('p', 'newsday', '문제 유형별 정답률 (누적)')); host.append(bars(md)); }

  /* 나머지 갈래는 [자세히] 안에 접어 둔다 — 다 펼치면 화면이 두 배가 되어
     정작 중요한 다섯 과목이 안 보인다. */
  /* 남긴 것은 셋뿐이다 — 재는 대상이 분명하고, 결과가 처방으로 이어지는 것만.
     뺀 것: 시간대별(매일 같은 시간에 해서 비교군이 없다) · 그림 있음/없음과 한자어
     (그림이 붙는 단어는 원래 구체어라 쉽다 — 그림 효과가 아니라 단어 난이도를 잰 것이다)
     · 첫 시도/두 번째(답을 보고 다시 푸는 것이라 높은 게 당연하다). */
  const MORE = [
    ['ltr', null, '어려운 글자가 든 단어', 'ư ơ ă â ê ô đ 가 든 단어만 따로 셉니다'],
    ['sy' + 'l', null, '단어 길이별', '긴 단어에서 떨어지면 소리 덩어리를 아직 못 묶은 것입니다'],
    ['lv', null, '복습 사다리 단계별', '뒷단(30·60일)이 낮으면 간격이 너무 벌어진 것입니다'],
    ['od', null, '얼마나 밀렸을 때 풀었나', '밀릴수록 떨어지는 폭이 곧 밀린 값입니다'],
    ['serr', null, '쓰기 오답의 종류', '성조만 흘렸는지, 글자를 틀렸는지'],
  ];
  const rows = MORE.map(([box, map, title, note]) => [title, note, named(box, map)])
                   .filter(r => r[2].length);
  const more = host;                        // 접지 않는다 — 분석은 다 보여야 분석이다
  const conf = Object.entries(S.stats.conf || {})
    .map(([k, v]) => [k, v.all]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  {
    rows.forEach(([title, note, data]) => {
      more.append(el('p', 'newsday', esc(title)));
      more.append(bars(data));
      more.append(el('p', 'dimtxt', esc(note)));
    });
    if (conf.length) {
      more.append(el('p', 'newsday', '자주 헷갈리는 짝 (귀 훈련)'));
      more.append(el('p', 'dimtxt', conf.map(c => esc(c[0]) + ' ' + c[1] + '번').join('<br>')));
    }
  }

  // 처방 — 분석만 하고 끝내지 않는다
  if (ok.length < 2) {
    host.append(el('p', 'note', '두 과목이 10문제를 넘으면 강점·약점과 처방이 나옵니다.'));
    return;
  }
  const worst = ok.reduce((a, x) => x.pct < a.pct ? x : a);
  const best = ok.reduce((a, x) => x.pct > a.pct ? x : a);
  const RX = {
    '암기': ['<b>복습</b>을 하루도 밀리지 마세요 — 밀린 카드가 쌓이면 정답률이 먼저 떨어집니다.',
             '틀린 단어는 그 자리에서 한 번 더 나옵니다. 그때 <b>소리 내어</b> 말하면 다음 판에서 살아납니다.'],
    '읽기': ['글자를 <b>소리로 바꿔 읽는</b> 연습이 모자란 것입니다 — 복습의 [읽기]를 며칠 이어서 해 보세요.',
             '뜻이 안 떠오르면 그 단어의 <b>그림</b>을 한 번 보고 넘어가세요. 그림이 붙은 단어가 더 오래 남습니다.'],
    '듣기': ['기본기의 <b>성조</b>와 <b>모음</b>을 하루 한 판씩. 저녁에 하면 자는 동안 소리가 정리됩니다.',
           '<b>느리게 듣기</b>로 먼저 듣고, 그다음 보통 속도로 한 번 더 들어 보세요.'],
    '쓰기': ['<b>손글씨</b>를 며칠 이어서 해 보세요. 부호 위치는 손으로 써야 붙습니다.',
             '<b>타이핑</b>에서 글자 보기를 누르지 말고 먼저 쳐 보세요 — 보고 치면 기억에 안 남습니다.'],
    '말하기': ['<b>따라 말하기</b>에서 녹음한 뒤 원어민 곡선과 겹쳐 보세요.',
             '<b>AI가 듣기</b>를 눌러 알아듣는 발음인지 확인하세요 — 안 알아들으면 조금 크게, 또박또박.'],
  };
  const card = el('div', 'rulecard');
  card.append(el('div', 'rhead', '<b>이렇게 하면 올라갑니다</b>'));
  const allGood = worst.pct >= 80;
  const lines = [allGood
    ? `<b>모두 좋습니다.</b> 더 올릴 곳 — <b>${esc(worst.name)} ${worst.pct}%</b> (${worst.n}문제)`
    : `<b>약한 곳 — ${esc(worst.name)} ${worst.pct}%</b> (${worst.n}문제)`,
    ...(RX[worst.name] || []).map(t => '· ' + t)];
  const tnOk = tn.filter(t => t[2] >= NEED);        // 열 문제를 넘긴 성조만 말한다
  if (tnOk.length && tnOk[0][1] < 70) lines.push(`· 성조 중에서는 <b>${tnOk[0][0]}</b>이 ${tnOk[0][1]}%로 가장 약합니다 — 기본기 성조에서 그 소리만 골라 들어 보세요.`);
  const miss = Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (miss.length) lines.push('· <b>발목 잡는 단어</b>(두 번 이상 틀린 것) — ' + miss.map(m => esc(m[0])).join(' · ') +
    '<br>&nbsp;&nbsp;이 단어만 따로 소리 내어 다섯 번씩. 맞히기 시작하면 목록에서 서서히 사라집니다.');
  lines.push(`<br><b>잘하는 곳 — ${esc(best.name)} ${best.pct}%</b> · ${esc(best.tip)}`);
  card.append(el('div', 'rbody', lines.join('<br>')));
  host.append(card);
  const dl = el('button', 'ghost', '분석 결과 그림으로 저장');
  dl.style.width = '100%'; dl.style.marginBottom = '14px';
  dl.onclick = () => analysisCard(mode);
  host.append(dl);
}


/* 분석 결과를 그림 한 장으로 — 폰 갤러리에 저장하거나 단톡방에 보낼 수 있다 */
async function analysisCard(mode) {
  const subj = analysisData(mode).filter(x => x.n >= 10);
  const TN = { 'ngang': '평평', 'huyền': '내려감', 'sắc': '올라감',
               'hỏi': '내렸다올림', 'ngã': '끊었다올림', 'nặng': '짧고무겁게' };
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
  if (tn.length) drawBars('성조별 정답률 (누적)', tn);
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
async function shareCard() {
  const c = document.createElement('canvas');
  c.width = 720; c.height = 900;
  const x = c.getContext('2d');
  x.fillStyle = '#0f1115'; x.fillRect(0, 0, 720, 900);
  x.strokeStyle = '#2a3040'; x.lineWidth = 2; x.strokeRect(24, 24, 672, 852);
  x.textAlign = 'center';
  x.fillStyle = '#7aa2ff'; x.font = 'bold 62px sans-serif';
  x.fillText('짜오짜오', 360, 128);
  x.fillStyle = '#8b93a7'; x.font = '26px sans-serif';
  x.fillText(ymd() + ' · 베트남어 공부 중', 360, 176);
  const dots = weekDots();
  '월화수목금토일'.split('').forEach((lb, i) => {
    const cx = 360 + (i - 3) * 88;
    x.beginPath(); x.arc(cx, 278, 30, 0, 7);
    x.fillStyle = dots[i].done ? '#2f9e63' : '#1a1f2b'; x.fill();
    x.strokeStyle = dots[i].today ? '#7aa2ff' : '#2a3040'; x.lineWidth = 3; x.stroke();
    x.fillStyle = dots[i].done ? '#fff' : '#5a6273'; x.font = '25px sans-serif';
    x.fillText(lb, cx, 287);
  });
  x.fillStyle = '#e7ebf4'; x.font = 'bold 34px sans-serif';
  x.fillText(`이번 주 ${dots.filter(d => d.done).length} / 5일`, 360, 372);
  [['배운 단어', Object.keys(S.srs).length], ['끝낸 세트', doneCount()], ['소리 낸 횟수', S.stats.said || 0]]
    .forEach(([k, v], i) => {
      const cx = 360 + (i - 1) * 212;
      x.fillStyle = '#7aa2ff'; x.font = 'bold 50px sans-serif'; x.fillText(String(v), cx, 490);
      x.fillStyle = '#8b93a7'; x.font = '23px sans-serif'; x.fillText(k, cx, 530);
    });
  const got = BADGES.filter(g => g.test());
  x.fillStyle = '#e7ebf4'; x.font = 'bold 30px sans-serif';
  x.fillText(got.length ? '최근 업적' : '이제 시작했습니다', 360, 630);
  if (got.length) {
    const g = got[got.length - 1];
    x.font = '62px sans-serif'; x.fillText(g.icon, 360, 712);
    x.fillStyle = '#7aa2ff'; x.font = 'bold 32px sans-serif'; x.fillText(g.name, 360, 764);
    x.fillStyle = '#8b93a7'; x.font = '23px sans-serif';
    x.fillText(`업적 ${got.length} / ${BADGES.length}`, 360, 802);
  }
  x.fillStyle = '#5a6273'; x.font = '23px sans-serif';
  x.fillText('tpgus5119-coder.github.io/chaochao', 360, 858);

  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'chaochao-card.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { }
  }
  // 공유 창이 없는 기기: 카드를 띄워서 길게 눌러 저장하게 한다
  $('#awardBody .cardimg')?.remove();
  const im = new Image();
  im.src = c.toDataURL('image/png'); im.className = 'cardimg'; im.alt = '자랑 카드';
  $('#awardBody').prepend(im);
}

/* 업적 전체 화면 — 홈에는 딴 것 몇 개만 보이고, 나머지는 여기서 */


/* ── 진도 서버 저장 ──────────────────────────────────────────
   로그인한 사람만. 하루 한 번 + 세트를 끝낼 때 올린다.
   서버 쓰기 한도(무료 1,000/일)를 아끼려고 그 이상은 안 올린다. */
const PROGKEYS = ['done', 'srs', 'act', 'stats', 'shield', 'shieldWk', 'nat', 'learn', 'region', 'nick'];
function cloudSave(force) {
  if (!S.acct || !S.acct.tok) return Promise.resolve();
  const today = ymd();
  if (!force && S.cloudAt === today) return Promise.resolve();
  const data = {};
  PROGKEYS.forEach(k => { if (S[k] !== undefined) data[k] = S[k]; });
  return cCall({ act: 'save', id: S.acct.id, tok: S.acct.tok, data })
    .then(() => { S.cloudAt = today; save(); })
    .catch(() => { });                     // 안 되면 조용히 — 다음 기회에 또 올린다
}
async function cloudLoad() {
  const j = await cCall({ act: 'load', id: S.acct.id, tok: S.acct.tok });
  if (!j.data) return false;
  PROGKEYS.forEach(k => { if (j.data[k] !== undefined) S[k] = j.data[k]; });
  save();
  popup('<b>진도를 불러왔습니다.</b> 화면을 새로 그립니다.');
  setTimeout(() => location.reload(), 900);
  return true;
}
/* ── 계정 로그인·가입 ────────────────────────────────────────────
   이메일이 없어서 비밀번호를 잊으면 되찾을 길이 없다 — 화면에 그대로 밝힌다.
   서버에는 비밀번호의 으깬 값(해시)만 남는다. */
function acctForm(gate, mode) {
  mode = mode || 'login';                 // 로그인과 가입은 딴 화면 — 섞어 두면 헷갈린다 (사용자 지시)
  const b = $('#subBody');
  b.textContent = '';
  b.append(el('p', 'lede', mode === 'login'
    ? '아이디로 어느 폰에서든 <b>내 별명·동아리</b>가 따라옵니다.'
    : '<b>처음 오셨군요!</b> 1분이면 됩니다 — 별명과 아이디만 정하면 끝.'));
  // 별명이 아직 없으면(첫 방문 가입) 여기서 같이 정한다 — 가입에 별명이 필요해서다
  const nickIn = el('input', 'keyin'); nickIn.type = 'text'; nickIn.maxLength = 10;
  nickIn.placeholder = '별명 (2~10자) — 순위·동아리에 보입니다';
  const id = el('input', 'keyin'); id.type = 'text'; id.placeholder = '아이디 (영문·숫자 4~20자)';
  id.autocapitalize = 'none'; id.maxLength = 20;
  const pw = el('input', 'keyin'); pw.type = 'password';
  // 비밀번호 규칙은 NIST 지침대로: 길이만 본다(8자+). 특수문자 강제는 뻔한 변형만 낳는다.
  pw.placeholder = '비밀번호 (8자 이상)'; pw.maxLength = 64;

  /* 가입 화면에만 나오는 것들 — 국적과 배울 언어 */
  const profBox = el('div', 'profbox');
  const mkSel = (opts) => {
    const w = el('div', 'catpick'); let cur = opts[0][0];
    opts.forEach(([k, nm], i) => {
      const c = el('button', 'catchipbtn' + (i === 0 ? ' on' : ''), nm);
      c.type = 'button';
      c.onclick = () => { cur = k; [...w.children].forEach(x => x.classList.remove('on')); c.classList.add('on'); w.dispatchEvent(new Event('pick')); };
      w.append(c);
    });
    w.val = () => cur;
    return w;
  };
  const natW = mkSel([['kr', '🇰🇷 한국'], ['vn', '🇻🇳 베트남'], ['etc', '🌏 그 외']]);
  const lrnW = el('div');
  const regW = el('div');
  const drawLearn = () => {
    lrnW.textContent = ''; regW.textContent = '';
    const nat = natW.val();
    // 지금 있는 과정은 베트남어(한국인용)뿐이다 — 한국어는 준비 중이라고 정직하게 밝힌다
    const opts = nat === 'kr' ? [['vi', '베트남어']]
               : nat === 'vn' ? [['ko', '한국어 (준비 중)']]
               : [['vi', '베트남어'], ['ko', '한국어 (준비 중)']];
    lrnW.sel = mkSel(opts);
    lrnW.append(el('p', 'note', '배울 언어'), lrnW.sel);
    const drawReg = () => {
      regW.textContent = '';
      if (lrnW.sel.val() === 'vi') {                 // 남북은 베트남어를 배울 때만 뜻이 있다
        regW.sel = mkSel([['n', '북부 (하노이)'], ['s', '남부 (호찌민)']]);
        regW.append(el('p', 'note', '배울 말씨'), regW.sel);
      }
    };
    lrnW.sel.addEventListener('pick', drawReg);
    drawReg();
  };
  natW.addEventListener('pick', drawLearn);
  drawLearn();
  profBox.append(el('p', 'note', '국적'), natW, lrnW, regW);

  const err = el('p', 'note nickerr'); err.hidden = true;
  const oops = m => { err.textContent = m; err.hidden = false; };
  const go = (act) => async () => {
    err.hidden = true;
    const i = id.value.trim().toLowerCase(), p = pw.value;
    if (!/^[a-z0-9_]{4,20}$/.test(i)) return oops('아이디는 영문·숫자 4~20자입니다.');
    if (p.length < 4) return oops('비밀번호는 4자 이상입니다.');
    if (act === 'signup' && p.length < 8) return oops('비밀번호는 8자 이상입니다.');
    try {
      if (act === 'signup' && !S.nick) {
        const v = nickIn.value.trim();
        if (v.length < 2) return oops('별명을 2자 이상 적어 주세요.');
        await cCall({ act: 'nick', nick: v });        // 먼저 쓴 사람이 임자 — 겹치면 여기서 걸린다
        S.nick = v; save();
      }
      const prof = act === 'signup'
        ? { nat: natW.val(), learn: lrnW.sel.val(), reg: regW.sel ? regW.sel.val() : '' } : {};
      const j = await cCall(Object.assign({ act, id: i, pw: p }, prof));
      if (act === 'signup' && prof.reg) { S.region = prof.reg; drawRegion(); }
      if (act === 'signup') { S.nat = prof.nat; S.learn = prof.learn;
        if (prof.nat === 'vn') S.ui = 'vi';       // 베트남 분은 화면도 베트남어로
      }
      if (act === 'login' && j.prof) {
        S.nat = j.prof.nat || S.nat; S.learn = j.prof.learn || S.learn;
        if (j.prof.reg) S.region = j.prof.reg;
        drawRegion();
      }
      if (act === 'login') {
        // 계정의 기기표를 이 기기에 입힌다 — 이제 서버가 보기에 같은 사람이다
        S.uid = j.uid;
        if (j.nick) S.nick = j.nick;
        if (j.club) S.club = { id: j.club.id, name: j.club.name };
        MATES = null;
      }
      S.acct = { id: i, tok: j.tok || '' }; save();
      if (act === 'login' && j.hasProg) {
        // 서버에 진도가 있다 — 새 기기라면 그대로 받고, 이미 공부한 기기라면 물어본다
        const mine = Object.keys(S.done || {}).length;
        if (mine === 0 || confirm('서버에 저장된 진도가 있습니다.\n이 기기로 불러올까요? 지금 기기의 진도는 덮어써집니다.')) {
          try { await cloudLoad(); } catch (e) { }
        }
      }
      popup(act === 'signup'
        ? '<b>가입됐습니다.</b><br>비밀번호를 잊으면 <b>되찾을 길이 없습니다</b> — 적어 두세요.<br>다른 폰에서 로그인하면 지금 별명·동아리가 따라옵니다.'
        : '<b>로그인됐습니다.</b> 별명·동아리가 이 기기로 따라왔습니다.');
      if (gate) renderHome(); else renderAwards();
    } catch (e) { oops(e.message || '안 됐습니다'); }
  };
  const bs = el('div');
  const main = el('button', 'primary big', mode === 'login' ? tr('로그인') : tr('가입하기'));
  main.style.width = '100%';
  main.onclick = go(mode === 'login' ? 'login' : 'signup');
  bs.append(main);
  if (!S.nick) profBox.append(el('p', 'note', '별명'), nickIn);
  if (mode === 'login') b.append(id, pw, err, bs);
  else b.append(profBox, id, pw, err, bs);
  // 두 화면 사이를 오가는 문
  const sw = el('button', 'ghost');
  sw.style.width = '100%'; sw.style.marginTop = '10px';
  sw.textContent = mode === 'login' ? tr('처음이세요? 가입하기') : tr('이미 계정이 있어요 — 로그인');
  sw.onclick = () => acctForm(gate, mode === 'login' ? 'signup' : 'login');
  b.append(sw);
  if (gate) {
    // 관문 모드 — 로그인 전에는 열 때마다 이 화면이 먼저다. '나중에'는 이번 접속만 통과.
    const later = el('button', 'ghost', tr('나중에 둘러보기'));
    later.style.width = '100%'; later.style.marginTop = '10px';
    later.onclick = () => { try { sessionStorage.setItem('gateSkip', '1'); } catch (e) {}
                            if (!S.nick) { askNick(); return; } renderHome(); };
    b.append(later);
  }
  b.append(el('p', 'note', '· 서버에는 비밀번호의 <b>으깬 값(해시)</b>만 남습니다 — 원문은 저장하지 않습니다.<br>' +
    '· 이메일이 없어 비밀번호를 잊으면 <b>되찾을 수 없습니다.</b><br>' +
    '· 학습 진도는 기기 안에 있습니다 — 폰을 바꿀 때는 <b>진도 백업</b>을 같이 쓰세요.'));
  show('sub', mode === 'login' ? tr('로그인') : tr('회원가입'), true);
}

function renderAwards() {
  const b = $('#awardBody');
  b.textContent = '';

  // 지역 설정 — 배치가 정해지면 여기서 바꾼다
  const rg = el('div', 'planrow');
  rg.append(el('span', 'pk', '지역'), el('span', 'pv', S.region === 's' ? '남부 (호찌민)' : '북부 (하노이)'));
  const rb = el('button', 'ghost sm', '바꾸기');
  rb.onclick = () => { S.region = S.region === 's' ? 'n' : 's'; save(); drawRegion(); renderAwards(); };
  rg.append(rb);

  /* 계정 — 아이디+비밀번호. 어느 기기서든 로그인하면 같은 사람(별명·동아리·엄지)이 된다.
     핵심은 기기표(uid)다: 로그인하면 이 기기의 uid 를 계정의 uid 로 갈아끼운다. */
  if (S.acct && S.acct.tok) {
    // 올리기 단추는 없앴다 — 학습·복습을 마칠 때마다 알아서 올라간다 (사용자 지시)
    const cl = el('div', 'planrow');
    cl.append(el('span', 'pk', '서버 진도'),
              el('span', 'pv', S.cloudAt ? S.cloudAt + ' 자동 저장됨' : '학습을 마치면 자동 저장됩니다'));
    b.append(cl);
  }

  /* 화면 언어 — 한국어 → Tiếng Việt → 나란히(개발용) 로 돌아간다.
     '나란히'는 만드는 사람용이다. 베트남어 옆에 한국어 원문을 같이 띄워
     "이 화면이 무엇이고 번역이 맞게 붙었는가"를 눈으로 대조하려고 둔다. */
  const UINAME = { ko: '한국어', vi: 'Tiếng Việt', dev: 'Việt + 한국어 (개발용)' };
  const NEXTUI = { ko: 'vi', vi: 'dev', dev: 'ko' };
  const ui = el('div', 'planrow');
  ui.append(el('span', 'pk', '화면 언어'), el('span', 'pv', UINAME[S.ui] || '한국어'));
  const ub = el('button', 'ghost sm', UINAME[NEXTUI[S.ui] || 'vi'] + ' →');
  ub.onclick = () => { S.ui = NEXTUI[S.ui] || 'vi'; save(); renderAwards(); drawMenu(); };
  ui.append(ub);
  b.append(ui);

  const shrow = el('div', 'planrow');
  shrow.append(el('span', 'pk', '보호권'), el('span', 'pv', '🛡️ ' + (S.shield || 0) + '개'));
  const shhow = el('button', 'ghost sm', '뭐예요?');
  shhow.onclick = () => popup('한 주에 <b>5일</b> 공부하면 🛡️ 1개를 받습니다 (최대 2개).<br>' +
    '하루를 빠지면 보호권이 <b>알아서</b> 그날을 메워 연속 기록이 이어집니다.<br>돈으로는 못 삽니다 — 공부로만 법니다.');
  shrow.append(shhow);
  b.append(shrow);

  const LEARNNM = { vi: '베트남어', ko: '한국어' };
  const ln = el('div', 'planrow');
  ln.append(el('span', 'pk', '배울 언어'), el('span', 'pv', LEARNNM[S.learn] || '베트남어'));
  const lb = el('button', 'ghost sm', '바꾸기');
  lb.onclick = () => popup('지금 있는 과정은 <b>베트남어(한국인용)</b>뿐입니다.<br>' +
    '<b>베트남 분들을 위한 한국어 과정</b>은 준비 중입니다 — ' +
    '만들어지면 여기서 바꿀 수 있습니다.<br>거짓 선택지를 두지 않으려고 미리 밝혀 둡니다.');
  ln.append(lb);
  b.append(ln);

  const ac = el('div', 'planrow');
  ac.append(el('span', 'pk', '계정'),
            el('span', 'pv', S.acct ? esc(S.acct.id) : '없음 (이 기기에만 저장)'));
  const ab = el('button', 'ghost sm', S.acct ? '로그아웃' : '로그인·가입');
  ab.onclick = () => {
    if (S.acct) { if (confirm('로그아웃할까요? 진도는 이 기기에 그대로 남습니다.')) { S.acct = null; save(); renderAwards(); } }
    else acctForm();
  };
  ac.append(ab);
  b.append(ac);

  const got = BADGES.filter(x => x.test()).length;
  const nm = el('div', 'planrow');
  nm.append(el('span', 'pk', '이름'), el('span', 'pv', esc(S.nick || '이름없음')));
  const ch = el('button', 'ghost sm', '바꾸기');
  ch.onclick = askNick;
  nm.append(ch);
  if (canPush()) {
    const nr = el('div', 'planrow');
    nr.append(el('span', 'pk', '알림'), el('span', 'pv', S.push ? '켜짐' : '꺼짐'));
    const nb = el('button', 'ghost sm', S.push ? '끄기' : '켜기');
    nb.onclick = async () => {
      if (S.push) { await stopPush(); renderAwards(); return; }
      const err = await askPush();
      if (err) alert(err); else alert('알림을 켰습니다.\n하루 한 번, 그날 아직 공부 안 했을 때만 옵니다.');
      renderAwards();
    };
    nr.append(nb);
    b.append(nr);
  }
  const pc = el('div', 'planrow');
  pc.append(el('span', 'pk', '하루'),
             el('span', 'pv', (S.pace || 1) + '세트' + ((S.pace || 1) > 1 ? ' (일상+직무)' : '')));
  const pb = el('button', 'ghost sm', '바꾸기');
  pb.onclick = () => { S.pace = (S.pace || 1) >= 2 ? 1 : 2; save(); renderAwards(); };
  pc.append(pb);
  b.append(nm, rg, pc);

  // 프로필 사진 — 동아리 사람들에게만 보인다. 안 정하면 실루엣.
  const fr = el('div', 'planrow');
  fr.append(el('span', 'pk', '사진'));
  const pv = el('span', 'pv');
  pv.append(faceEl(myUid()));
  fr.append(pv);
  const fb = el('button', 'ghost sm', (FACE[myUid()] || {}).d ? '바꾸기' : '올리기');
  fb.onclick = () => pickFace(renderAwards);
  fr.append(fb);
  if ((FACE[myUid()] || {}).d) {
    const fd = el('button', 'ghost sm', '지우기');
    fd.onclick = () => { FACE[myUid()] = { v: 0, d: '' }; faceSave(); S.avv = 0; save();
                         cCall({ act: 'setface', img: '' }).catch(() => { }); renderAwards(); };
    fr.append(fd);
  }
  b.append(fr);

  // 분석 공개 — 끄면 남에게 숫자가 하나도 안 나간다
  const op = el('div', 'planrow');
  op.append(el('span', 'pk', '분석 공개'), el('span', 'pv', S.open ? '동아리에 공개' : '나만 보기'));
  const ob = el('button', 'ghost sm', S.open ? '끄기' : '켜기');
  ob.onclick = () => { S.open = S.open ? 0 : 1; save();
                       if (S.club) mateSync().catch(() => { }); renderAwards(); };
  op.append(ob);
  b.append(op);
  b.append(el('p', 'note', '사진과 분석은 <b>같은 동아리 사람에게만</b> 보입니다. ' +
    '사진과 쪽지는 서버에 그대로 저장되며 암호가 걸려 있지 않습니다.'));

  const st = el('div', 'stats mine');
  [['연속', streakDays() + '일'], ['모두', totalDays() + '일']].forEach(([k, v]) => {
    const c = el('div', 'stat'); c.append(el('b', null, v), el('span', null, k)); st.append(c);
  });
  b.append(st);

  const ana = el('div');
  renderAnalysis(ana, 'week');
  b.append(ana);
  b.append(el('p', 'lede', `업적 <b>${got}</b> / ${BADGES.length}`));
  BADGES.forEach(bg => {
    const on = bg.test();
    const row = el('div', 'awrow' + (on ? ' on' : ''));
    row.append(el('span', 'awi', bg.icon),
               el('span', 'awn', esc(bg.name)),
               el('span', 'awh', on ? '달성 ✔' : esc(bg.how)));
    b.append(row);
  });
  if (S.admin) {
    const ad = el('button', 'ghost', '운영 현황 보기');
    ad.style.width = '100%'; ad.style.marginTop = '10px';
    ad.onclick = () => { dive(renderAwards); showAdmin(); };
    b.append(ad);
  }
  const sh = el('button', 'primary big', '자랑 카드 만들기');
  sh.style.width = '100%'; sh.style.marginTop = '16px';
  sh.onclick = shareCard;
  b.append(sh);
  show('award', '내 정보', true);
}

function renderProgress(host) {
  const box = host || $('#progress');
  box.textContent = '';

  const dots = weekDots();
  const n = dots.filter(d => d.done).length;
  const head = el('div', 'phead');
  head.append(el('strong', null, '이번 주 ' + n + '일 공부'));
  if (n >= 5) head.append(el('span', null, '아주 좋습니다 ✔'));
  box.append(head);

  const row = el('div', 'dots');
  '월화수목금토일'.split('').forEach((label, i) => {
    const d = dots[i];
    const s = el('span', 'dot' + (d.done ? ' on' : '') + (d.today ? ' today' : '') + (d.future ? ' fut' : ''));
    s.textContent = label;
    row.append(s);
  });
  box.append(row);

  const st = el('div', 'stats');
  const words = Object.keys(S.srs).length;
  const memo = Object.values(S.srs).filter(v => v.lv >= 2).length;   // 간격을 두고 두 번 맞힌 단어
  const days = Object.keys(S.done).filter(k => +k >= 1).length;
  [['배운 단어', words], ['외운 단어', memo], ['끝낸 세트', days]]
    .forEach(([k, v]) => {
      const c = el('div', 'stat');
      c.append(el('b', null, String(v)), el('span', null, k));
      st.append(c);
    });
  box.append(st);

  // 딴 업적만 몇 개 미리 보여주고, 전체는 업적 화면에서
  const got = BADGES.filter(b => b.test());
  const bd = el('div', 'badges');
  got.slice(-4).forEach(b => {
    const s = el('span', 'badge on');
    s.append(el('i', null, b.icon), el('em', null, b.name));
    bd.append(s);
  });
  box.append(bd);
}


/* ---------- 주간 총복습 ----------
   그 주에 새로 배운 카드를 **한 묶음으로 통째** 한 바퀴 돈다.
   같은 반복 횟수라면 작게 쪼개 여러 바퀴 도는 것보다 큰 묶음 한 바퀴가 낫다는
   실험이 있다(Kornell 2009). 그런데 참가자의 72%가 반대로 판단했다 —
   그래서 '쪼개기' 기능은 일부러 만들지 않는다. */
function weekWords() {
  const from = now() - 7 * DAY;
  const learned = Object.entries(S.srs)
    .filter(([, v]) => v.first && v.first >= from)
    .map(([k]) => k);
  return learned.map(v => allWords().find(w => w.vi === v)).filter(Boolean);
}



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
  { k: '말하기', ok: 'pronOk', all: 'pronAll', tip: '내 발음을 AI가 알아듣는 비율' },
  { k: '듣기', ok: 'earOk', all: 'earAll', tip: '소리만 듣고 뜻·성조를 가리기' },
  { k: '읽기', ok: 'readOk', all: 'readAll', tip: '글자를 보고 뜻을 바로 떠올리기' },
  { k: '쓰기', ok: 'spellOk', all: 'spellAll', tip: '받아쓰기·타이핑으로 철자 맞히기' },
  { k: '암기', ok: 'qOk', all: 'qAll', tip: '배운 것이 얼마나 남아 있는가 (전체 정답률)' },
];
function snapshot() {
  const t = S.stats || {};
  const o = { memo: Object.values(S.srs).filter(v => v.lv >= 2).length,
              days: Object.keys(S.act).length, drill: t.drill || 0,
              sets: Object.keys(S.done).filter(k => +k >= 1).length, said: t.said || 0 };
  SUBJ.forEach(x => { o[x.ok] = t[x.ok] || 0; o[x.all] = t[x.all] || 0; });
  return o;
}
function weekReport(base) {
  const cur = snapshot(), b = base || {};
  const subj = SUBJ.map(x => {
    const n = (cur[x.all] || 0) - (b[x.all] || 0), ok = (cur[x.ok] || 0) - (b[x.ok] || 0);
    return { name: x.k, n, pct: n ? Math.round(ok * 100 / n) : null, tip: x.tip };
  });
  const d = k => (cur[k] || 0) - (b[k] || 0);
  const r = { subj, memo: d('memo'), days: d('days'), sets: d('sets'), said: d('said') };
  r.skill = skillScore();               // 순위와 같은 잣대 — 따로 놀지 않게

  const solved = d('qAll') + d('drill');
  r.solved = solved;
  return r;
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
function skillScore() {
  const cur = snapshot();
  const done = SUBJ.map(x => [cur[x.all] || 0, cur[x.ok] || 0]).filter(([n]) => n >= NEED);
  if (!done.length) return { score: 0, acc: null, memo: cur.memo, subjects: 0 };
  const acc = Math.round(done.reduce((a, [n, ok]) => a + ok / n, 0) * 100 / done.length);
  return { score: Math.round(cur.memo * acc / 100), acc, memo: cur.memo, subjects: done.length };
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
  go.onclick = () => { S.wk = { k: weekKey(), base: snapshot() }; save(); renderHome(); };
  b.append(go);
  show('week', '주간 성적표', false);
}

/* 닉네임 — 최초 한 번. 서버에 저장되지 않고, 순위에만 쓰인다 */
function askNick() {
  const b = $('#nickBody');
  b.textContent = '';
  b.append(el('p', 'lede', '이름이 뭐예요?'));
  b.append(el('p', 'vi mid', 'Tên bạn là gì?'));
  b.append(el('p', 'note', '언제든 바꿀 수 있습니다. <b>먼저 쓴 사람이 임자</b>라 겹치는 별명은 못 씁니다.'));
  const inp = el('input', 'keyin'); inp.type = 'text'; inp.placeholder = '별명 (2~10글자)'; inp.maxLength = 10;
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
    S.nick = v;
    try {
      await cCall({ act: 'nick' });
    } catch (e) {
      S.nick = old;
      err.textContent = '「' + v + '」는 ' + (e.message || '쓸 수 없습니다') + ' — 다른 별명을 지어 주세요.';
      err.hidden = false; go.disabled = false; inp.focus(); inp.select();
      return;
    }
    S.wk = { k: weekKey(), base: snapshot() }; save();
    renderHome();
  };
  b.append(inp, err, go);
  // 위쪽 뒤로가기로 그냥 나갈 수 있다. 처음이라 이름이 없으면 '이름없음'으로 두고 나간다.
  const had = !!S.nick;
  dive(() => {
    if (!S.nick) { S.nick = '이름없음'; S.wk = { k: weekKey(), base: snapshot() }; save(); }
    had ? renderAwards() : renderHome();
  });
  show('nick', '이름', true);
}


/* ---------- 홈 메뉴 ----------
   첫 화면은 큰 칸 여덟 개뿐이다. 칸을 누르면 그 안에서 고른다 —
   첫 화면에 버튼이 많을수록 고르는 데 힘이 들고, 결국 아무것도 안 누르게 된다. */
/* 한국어를 배우는 사람의 첫 화면.
   베트남어 과정은 '오늘 배울 세트'가 중심이지만, 여기는 아직 날마다 배우는 과정이 없다.
   그래서 있는 것만 정직하게 보여 준다 — 모의고사 성적과, 아직 없는 것에 대한 안내.
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

  // 모의고사 성적 요약 — 본 적이 있으면 최근 점수, 없으면 시작 안내.
  // 숫자가 낀 문장이라 el() 통짜 번역을 못 쓴다 — 낱말만 tr() 로 옮기고 숫자를 직접 끼운다.
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
  note.append(el('b', null, '지금 있는 것 — 모의고사, AI 채점 말하기·쓰기'));
  note.append(document.createElement('br'));
  note.append(document.createTextNode(tr('아직 없는 것 — 날마다 배우는 과정')));
  plan.append(note);
}

/* 무엇을 배우는 사람인가 — 이 한 줄이 앱의 절반을 가른다.
   베트남 사람이 한국어를 배우러 온 것과, 한국 사람이 베트남어를 배우러 온 것은
   같은 앱이 아니다. 성조 훈련·베트남어 자판은 앞사람에게 아무 쓸모가 없고,
   모의고사(EPS·TOPIK·KIIP)는 뒷사람에게 아무 쓸모가 없다. */
const learnKo = () => S.learn === 'ko';

const MENUS_VI = {          // 한국인이 베트남어를 배운다 (지금까지의 앱)
  day:   { name: '하루 5분', items: () => [
            ['일상', () => renderDays('daily')], ['직무', () => renderDays('work')],
            ['기사', showNewsLearn]] },
  rev:   { name: '복습', items: () => [
            ['최근 학습', () => freshMenu('word')],
            ['단어', () => reviewMenu('word')], ['문장', () => reviewMenu('sent')]] },
  basic: { name: '기본기', items: () => [
            ['모음', vowelEntry], ['자음', () => { const d = ALL.find(x => x.day === 'P3'); if (d) startLearn(d); }],
            ['성조', toneEntry], ['겹모음', () => startRule(4)], ['자판 쓰는 법', kbGuide],
            ['호칭', () => startRule(0)], ['어순', () => startRule(1)], ['숫자 읽는 법', () => startRule(5)],
            ['단위', () => startRule(2)], ['남부 소리', () => startRule(3)]] },
  gram:  { name: '문법', items: () => GRAMMAR.map((g, i) => [g.title, () => startRule('G' + i)]) },
  club:  { name: '동아리', items: () => [['보기', showClub]] },
  guide: { name: '사용법', items: () => [['보기', showGuide]] },
};

const MENUS_KO = {          // 베트남 사람이 한국어를 배운다
  exam:  { name: '모의고사', items: () => [['보기', examEntry]] },
  gram2: { name: '기초 문법', items: () => [['보기', koGramEntry]] },
  club:  { name: '동아리', items: () => [['보기', showClub]] },
  guide: { name: '사용법', items: () => [['보기', showGuide]] },
};

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

function examEntry() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '실제 시험과 <b>같은 형식</b>으로 풀어 봅니다.<br>'
    + '문항은 우리가 직접 만든 것입니다 — 기출 문제가 아닙니다.'));
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

function drawExamList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '실제 시험과 <b>같은 형식</b>으로 풀어 봅니다.<br>'
    + '문항은 우리가 직접 만든 것입니다 — 기출 문제가 아닙니다.'));
  // 같은 시험은 회차끼리 묶어 보여준다
  const byId = {};
  EXDATA.exams.forEach(e => (byId[e.id] = byId[e.id] || []).push(e));
  Object.values(byId).forEach(list => {
    b.append(el('h3', 'exhead', esc(list[0].name)));
    b.append(el('p', 'note', esc(list[0].desc)));
    list.forEach(e => {
      const best = (S.exam || {})[e.id + '-' + e.set];
      const btn = el('button', 'bigmenu');
      btn.append(el('b', null, `${e.set}회차`));
      btn.append(el('span', 'exmeta', `${e.total}문항 · ${e.minutes}분`));
      if (best) {                    // 전에 본 적이 있으면 점수를 같이 보여준다
        const pct = Math.round(best.score / best.total * 100);
        btn.append(el('span', 'mbadge' + (pct >= 60 ? '' : ' red'), `${pct}점`));
      }
      btn.onclick = () => startExam(e);
      b.append(btn);
    });
  });
  // 말하기·쓰기는 정답이 하나가 아니라 시험지에 못 넣는다 — 따로 둔다
  b.append(el('h3', 'exhead', '말하기 · 쓰기'));
  b.append(el('p', 'note', 'KIIP 구술시험과 작문시험 형식 · AI가 읽고 고칠 점을 알려 줍니다.'));
  const x = el('button', 'bigmenu');
  x.append(el('b', null, '말하기 · 쓰기 연습'));
  x.append(el('span', 'exmeta', `구술 ${EXDATA.extra.speak.length}세트 · 작문 ${EXDATA.extra.write.length}제목`));
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
  b.append(el('p', 'lede', '한국어 기초 문법 18개 — 배우는 순서 그대로입니다.'));
  show('exam', '기초 문법', true);
  if (KGDATA) return drawGramList();
  fetch('data/ko_grammar.json', { cache: 'no-cache' })
    .then(r => r.json()).then(j => { KGDATA = j.items; drawGramList(); })
    .catch(() => b.append(el('p', 'lede', '문법 자료를 받지 못했습니다. 인터넷을 확인해 주세요.')));
}

function drawGramList() {
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '한국어 기초 문법 18개 — 배우는 순서 그대로입니다.'));
  KGDATA.forEach((g, i) => {
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
  card.append(el('div', 'exask', esc(g.title_ko)));
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

  const nav = el('div', 'exnav');
  const prev = el('button', 'ghost big', '‹ 이전');
  prev.disabled = i === 0;
  prev.onclick = () => drawGramCard(i - 1);
  const next = el('button', 'primary big', i === KGDATA.length - 1 ? '목록으로' : '다음 ›');
  next.onclick = () => i === KGDATA.length - 1 ? drawGramList() : drawGramCard(i + 1);
  nav.append(prev, next);
  b.append(nav);
  show('exam', '기초 문법', true);
}

function startExam(e) {
  EX = { exam: e, at: 0, marks: new Array(e.questions.length).fill(-1),
         left: e.minutes * 60 };
  if (EX.timer) clearInterval(EX.timer);
  EX.timer = setInterval(() => {
    if ($('#exam').hidden || !EX) return;      // 다른 화면에 가 있으면 시계도 멈춘다
    EX.left--;
    if (EX.left <= 0) { finishExam(true); return; }
    const t = $('#extime');
    if (t) { t.textContent = fmtLeft(EX.left); t.className = 'extime' + (EX.left <= 60 ? ' hot' : ''); }
  }, 1000);
  drawExamQ();
}

const fmtLeft = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function drawExamQ() {
  if (!EX) return;
  const e = EX.exam, q = e.questions[EX.at];
  const b = $('#examBody');
  b.textContent = '';

  // 머리줄 — 남은 시간과 진행 상황
  const head = el('div', 'exbar');
  head.append(el('span', 'expos', `${EX.at + 1} / ${e.questions.length}`));
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

  const lines = q.stem.split('\n');
  card.append(el('div', 'exask', esc(lines[0])));
  if (lines[1]) card.append(el('div', 'exbody', esc(lines[1])));

  // 듣기 — 문제가 소리로만 나간다. 몇 번이든 다시 들을 수 있게 둔다
  // (실제 시험은 두 번까지지만, 연습에서까지 막으면 틀린 이유를 못 짚는다).
  if (q.audio && q.audio.length) {
    const pb = el('button', 'explay');
    const paint = () => { pb.textContent = EX.playing ? '⏸ 멈추기' : '▶ 듣기'; };
    pb.onclick = () => {
      if (EX.playing) { audio.pause(); audio.onended = null; EX.playing = false; paint(); return; }
      EX.playing = true; paint();
      playKoSeq(q.audio, () => { EX.playing = false; paint(); });
    };
    paint();
    card.append(pb);
    card.append(el('p', 'note', '소리로만 나옵니다 — 몇 번이든 다시 들을 수 있습니다.'));
  }

  if (q.img) {
    const im = new Image();
    im.className = 'expic'; im.alt = ''; im.src = 'img/' + q.img;
    card.append(im);
  }

  const CIRC = '①②③④';
  // 보기가 그림인 문항(듣고 그림 고르기)은 두 칸씩 늘어놓는다 — 글 보기와 모양이 달라야 헷갈리지 않는다
  const box = q.optkind === 'img' ? el('div', 'exgrid') : card;
  q.options.forEach((o, i) => {
    const on = EX.marks[EX.at] === i;
    const opt = el('button', (q.optkind === 'img' ? 'exopti' : 'exopt') + (on ? ' on' : ''));
    if (q.optkind === 'img') {
      const im = new Image(); im.alt = ''; im.src = 'img/' + o;
      opt.append(im, el('span', 'exnum', CIRC[i]));
    } else {
      opt.append(el('span', 'exnum', CIRC[i]), el('span', null, esc(String(o))));
    }
    opt.onclick = () => {
      // 같은 것을 다시 누르면 고른 것을 지운다 — 실제 시험지에서 지우개 쓰는 것과 같다
      EX.marks[EX.at] = on ? -1 : i;
      drawExamQ();
    };
    box.append(opt);
  });
  if (box !== card) card.append(box);
  b.append(card);

  // 앞뒤 이동
  const nav = el('div', 'exnav');
  const prev = el('button', 'ghost big', '‹ 이전');
  prev.disabled = EX.at === 0;
  prev.onclick = () => { EX.at--; drawExamQ(); };
  const next = el('button', 'primary big', EX.at === e.questions.length - 1 ? '제출하기' : '다음 ›');
  next.onclick = () => {
    if (EX.at < e.questions.length - 1) { EX.at++; drawExamQ(); return; }
    const blank = EX.marks.filter(m => m < 0).length;
    if (blank && !confirm(`아직 ${blank}문항이 비어 있습니다. 그대로 제출할까요?`)) return;
    finishExam(false);
  };
  nav.append(prev, next);
  b.append(nav);

  // 번호판 — 어디를 안 풀었는지 한눈에 보이고, 눌러서 바로 건너뛴다
  const pad = el('div', 'expad');
  e.questions.forEach((_, i) => {
    const n = el('button', 'expn' + (EX.marks[i] >= 0 ? ' done' : '') + (i === EX.at ? ' cur' : ''));
    n.textContent = String(i + 1);
    n.onclick = () => { EX.at = i; drawExamQ(); };
    pad.append(n);
  });
  b.append(pad);

  show('exam', e.name, true);
}

function finishExam(timeUp) {
  if (!EX) return;
  if (EX.timer) { clearInterval(EX.timer); EX.timer = 0; }
  const e = EX.exam, marks = EX.marks;
  const wrong = [];
  let score = 0;
  e.questions.forEach((q, i) => {
    if (marks[i] === q.answer) score++;
    else wrong.push({ q, picked: marks[i] });
  });

  // 점수를 남긴다 — 다음에 목록에서 바로 보인다
  S.exam = S.exam || {};
  const key = e.id + '-' + e.set;
  const prev = S.exam[key];
  if (!prev || score > prev.score) S.exam[key] = { score, total: e.questions.length, at: now() };
  touchToday(); save();

  const b = $('#examBody');
  b.textContent = '';
  const pct = Math.round(score / e.questions.length * 100);
  const r = el('div', 'result' + (pct >= 60 ? ' perfect' : ''));
  r.append(el('div', 'n', `${score} / ${e.questions.length}`));
  r.append(el('div', null, timeUp ? `시간이 다 됐습니다 · ${pct}점` : `${pct}점`));
  b.append(r);

  if (wrong.length) {
    b.append(el('h3', 'exhead', `틀린 문항 ${wrong.length}개`));
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
      c.append(el('div', 'exans', `정답 ${CIRC[q.answer]} <b>${esc(shown(q.options[q.answer]))}</b>`
        + (picked >= 0 ? ` · 고른 답 ${CIRC[picked]} ${esc(shown(q.options[picked]))}` : ' · 비워 둠')));
      // 그림 보기 문항은 정답 그림을 다시 보여 준다 — 글로 '(그림)'만 봐서는 뭘 틀렸는지 모른다
      if (q.optkind === 'img') {
        const im = new Image(); im.className = 'expic'; im.alt = '';
        im.src = 'img/' + q.options[q.answer];
        c.append(im);
      }
      // 틀린 낱말은 소리로 한 번 더 — 눈으로만 보면 발음이 안 붙는다
      if (q.word && q.word.length > 1 && !(q.audio && q.audio.length)) {
        const p = el('button', 'ghost sm', '🔊 ' + esc(q.word));
        p.onclick = () => speakKo(q.word);
        c.append(p);
      }
      b.append(c);
    });
  } else {
    b.append(el('p', 'lede', '다 맞았습니다.'));
  }

  const again = el('button', 'primary big', '다시 풀기');
  again.style.marginTop = '18px';
  again.onclick = () => startExam(e);
  const list = el('button', 'ghost big', '다른 시험 고르기');
  list.style.marginTop = '8px';
  list.onclick = () => { EX = null; drawExamList(); };
  b.append(again, list);
  show('exam', '채점 결과', true);
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
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'lede', '정답이 하나가 아닌 문제입니다 — <b>AI가 읽고 고칠 점을 알려 줍니다.</b>'));
  if (!aiReady()) {
    b.append(el('p', 'note', 'AI 채점을 쓰려면 <b>내 정보</b>에서 구글 무료 키를 한 번 넣어 주세요.'));
  }
  b.append(el('h3', 'exhead', '말하기 (구술시험)'));
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
  show('exam', '말하기 · 쓰기', true);
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

async function recordAndGrade(question, passage, out, btn) {
  if (!aiReady()) { out.textContent = 'AI 키가 필요합니다 — 내 정보에서 넣어 주세요.'; return; }
  if (!canRecord()) { out.textContent = '이 기기에서는 녹음을 쓸 수 없습니다.'; return; }
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

function examWrite(wi) {
  const w = EXDATA.extra.write[wi];
  const b = $('#examBody');
  b.textContent = '';
  b.append(el('p', 'exsec', `쓰기 · ${w.chars}자 정도`));
  const card = el('div', 'excard');
  card.append(el('div', 'exask', esc(w.title)));

  const ta = el('textarea', 'exwrite');
  ta.placeholder = '여기에 쓰세요…';
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
      audio.pause(); audio.src = src; audio.currentTime = 0;
      audio.onended = () => setTimeout(step, 450);
      audio.play().catch(() => { audio.onended = null; done && done(); });
    });
  };
  step();
}
/* 글자 → 미리 구워 둔 mp3 주소. 색인에 없으면 null(그때는 폰 목소리로 읽는다) */
function koSrc(text, v, cb) {
  const make = () => cb(KOIDX[text] ? `audio/ko-${v}/n/${KOIDX[text]}.mp3` : null);
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
function drawMenu() {
  const box = $('#menu');
  box.textContent = '';
  Object.entries(MENUS).forEach(([id, m]) => {
    const t = el('button', 'mtile');
    t.append(el('b', null, m.name));
    if (id === 'rev') {
      const n = dueWords().length;
      // 쪽지 알림과 같은 빨간 동그라미로 — 알림은 앱 안에서 한 가지 모양이어야 눈에 익는다
      if (n) t.append(el('span', 'mbadge red', String(n)));
    }
    t.onclick = () => {
      const items = m.items();
      if (items.length === 1) return items[0][1]();     // 하나뿐이면 바로 연다
      renderMenu(id);
    };
    box.append(t);
  });
}


/* ---------- 홈 ---------- */
const allWords = () => ALL.flatMap(d => d.words || []);
/* 끝낸 세트의 대화 문장 — 복습에서 단어와 같이 다룬다 */
const allSents = () => ALL.flatMap(d => (d.dialog?.lines || []).map(l =>
  ({ vi: l.vi, ko: l.ko, kr_read: l.kr_read, tones: l.tones, sent: true })));
const lessonSents = () => [...(typeof RULES === 'undefined' ? [] : RULES),
                           ...(typeof GRAMMAR === 'undefined' ? [] : GRAMMAR)]
  .flatMap(r => (r.cards || []).map(c => ({ vi: c.vi, ko: c.ko, kr_read: c.kr, tones: c.tones, sent: true })));
const findItem = vi => allWords().find(w => w.vi === vi)
  || allSents().find(x => x.vi === vi) || lessonSents().find(x => x.vi === vi);
/* 오늘 꺼낼 카드 차례. 최근에 배운 것일수록 먼저 — 갓 배운 것이 가장 빨리 샌다.
   다만 오래 밀린 카드도 같이 올라와야 한다(2주까지). 안 그러면 밀린 카드가 영영 뒤에 남는다.
   ±3일 흔들기를 섞어 매번 같은 순서로 나오지 않게 한다. */
function dueWords() {
  const n = now();
  return Object.entries(S.srs).filter(([, v]) => v.due <= n)
    .map(([k, v]) => [k, (v.first || 0) + Math.min(n - v.due, 14 * DAY) + (Math.random() - .5) * 6 * DAY])
    .sort((a, b) => b[1] - a[1]).map(x => x[0]);
}


/* 목록의 머리말 — **차례 자체가 주제별로 모여 있으니** 그 묶음을 그대로 적는다.
   (예전에는 '만든 차례'로 묶어서 같은 주제가 앞뒤로 흩어져 보였다.) */
const GROUPS = [
  // 일상 — 교재들처럼 '장소·상황'으로 묶고 그 이름을 그대로 머리말로 쓴다.
  // 한 주제가 한 덩어리다 (표시 번호 n 기준. 차례를 바꾸면 여기도 같이 바꾼다).
  [d => !d.track && d.n <= 6,  '첫 인사와 자기소개'],
  [d => !d.track && d.n <= 8,  '숫자 세기'],
  [d => !d.track && d.n <= 11, '시간과 요일'],
  [d => !d.track && d.n <= 13, '일과 하루'],
  [d => !d.track && d.n <= 16, '부탁하고 약속하기'],
  [d => !d.track && d.n <= 18, '쉬는 날과 명절'],
  [d => !d.track && d.n <= 20, '아플 때 — 약국과 병원'],
  [d => !d.track && d.n <= 23, '시장에서 — 사고 팔기'],
  [d => !d.track && d.n <= 25, '마음과 맞장구'],
  [d => !d.track && d.n <= 29, '식당과 카페에서'],
  [d => !d.track && d.n <= 32, '길과 교통'],
  [d => !d.track && d.n <= 35, '집과 살림'],
  [d => !d.track && d.n <= 37, '가족과 고향'],
  [d => !d.track,              '스몰토크 — 날씨 · 주말 · 축구'],
  // 직무 — 취업 여정 순서: 기초(공통) → 업종 기초 → 회사 생활 → 관리자 말 → 심화 → 출하
  [d => d.track === 'work' && d.day <= 40 && d.cat === '공통', '공장 기초 (공통)'],
  [d => d.track === 'work' && d.day <= 40, '봉제 기초'],
  [d => d.track === 'work' && d.day >= 51 && d.day <= 55, '전자·디스플레이 기초'],
  [d => d.track === 'work' && d.day >= 56 && d.day <= 60, '사무·서비스 (시티잡)'],
  [d => d.track === 'work' && d.day >= 61 && d.day <= 65, '직장 문화 (공통)'],
  [d => d.track === 'work' && d.day >= 66 && d.day <= 70, '계약·행정 (공통)'],
  [d => d.track === 'work' && d.day >= 81 && d.day <= 85, '관리자 화법 (공통)'],
  [d => d.track === 'work' && d.day >= 86 && d.day <= 90, '봉제 심화'],
  [d => d.track === 'work' && d.day >= 91 && d.day <= 95, '전자 심화'],
  [d => d.track === 'work', '창고·물류 (공통)']
];

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

function renderHome() {
  cloudSave();                           // 로그인한 사람은 하루 한 번 서버에 진도를 남긴다
  pingRooms();                              // 하루 이상 조용하면 먼저 말을 걸어 둔다
  drawMenu();
  drawWxNow();
  // 한국어를 배우는 사람에게는 베트남어 일정판이 아무 뜻이 없다 — 딴 판을 그린다
  if (learnKo()) { drawKoHome(); show('home', '짜오짜오', false); return; }
  renderProgress($('#progress'));      // 이번 주 도장·통계·업적 (첫 화면 일정판 아래)
  const nx = nextDay();
  const due = dueWords();

  // 오늘·내일 일정판 — 뭘 하게 될지 미리 보이고, 버튼 하나로 바로 들어간다
  const plan = $('#plan');
  plan.textContent = '';
  // 행 자체를 누르면 바로 실행된다
  const prow = (k, v, state, fn) => {
    const r = el('div', 'plancell ' + state + (fn ? ' go' : ''));
    r.append(el('span', 'pk', k), el('span', 'pv', esc(v)));
    if (fn) r.onclick = fn;
    plan.append(r);
  };
  const todayCnt = Object.entries(S.done)
    .filter(([k, v]) => +k >= 1 && typeof v === 'number' && ymd(v) === ymd()).length;
  const pace = S.pace || 1;                       // 하루에 몇 세트 할 것인가 (내 정보에서 바꾼다)
  const left = Math.max(0, pace - todayCnt);      // 오늘 남은 세트
  const doneToday = left === 0;
  const queue = upcoming(left + pace);            // 오늘 남은 것 + 내일 것
  const nm = d => trackName(d) + label(d);
  // 오늘 학습
  if (doneToday) prow('오늘 학습', pace > 1 ? todayCnt + '세트 완료' : '완료', 'done', null);
  else if (queue.length) {
    const t = queue.slice(0, left);
    prow('오늘 학습', t.map(nm).join(' · ') + (t.length > 1 ? '' : '\n' + t[0].theme),
         'todo', () => startLearn(t[0]));
  } else prow('오늘 학습', '전 과정 완료', 'none', null);
  // 오늘 복습 — 문장도 같이 나오므로 뭉뚱그려 '단어'라고 하지 않는다
  const dueW = due.map(findItem).filter(Boolean);
  const ns = dueW.filter(x => x.sent).length, nw = dueW.length - ns;
  if (due.length) prow('오늘 복습', ns ? `단어 ${nw} · 문장 ${ns}` : '단어 ' + nw + '개',
                       'todo', () => reviewStart());
  else prow('오늘 복습', S.revDay === ymd() ? '완료' : '없음', S.revDay === ymd() ? 'done' : 'none', null);
  // 내일 학습 (+예습)
  const tset = queue.slice(left, left + pace);
  if (tset.length) {
    const words = tset.flatMap(d => d.words || []);
    prow('내일 학습', tset.map(nm).join(' · ') + (tset.length > 1 ? '' : '\n' + tset[0].theme),
         'next', words.length ? () => flashRun(words, '예습 · ' + tset.map(nm).join(' · ')) : null);
  } else prow('내일 학습', '없음', 'none', null);
  // 내일 복습 — 내일 새로 나올(만기되는) 카드 수
  const tmr = Object.entries(S.srs).filter(([, v]) => v.due > now() && v.due <= now() + DAY)
    .map(([k]) => findItem(k)).filter(Boolean);
  const ts = tmr.filter(x => x.sent).length, tw = tmr.length - ts;
  prow('내일 복습', !tmr.length ? '없음' : ts ? `단어 ${tw} · 문장 ${ts}` : '단어 ' + tw + '개',
       tmr.length ? 'next' : 'none', null);

  show('home', '짜오짜오', false);
}

/* 학습 과정 목록 — 트랙별로 보여준다 */
function renderDays(track) {
  const nx = nextDay();
  const list = $('#dayList');
  list.textContent = '';
  const days = ALL.filter(d =>
    (track === 'work' ? d.track === 'work'
    : (typeof d.day === 'number' && !d.track)) && visibleDay(d));

  if (track === 'work') {              // 내 업종만 남기기 — 끈 업종은 학습·일정에서도 빠진다
    const li = el('li', 'catpick');
    li.append(el('span', null, '업종 '));
    ['봉제', '전자', '사무'].forEach(c => {
      const on = !hiddenCats().includes(c);
      const bb = el('button', 'ghost sm' + (on ? ' pick' : ''), (on ? '✓ ' : '') + c);
      bb.onclick = () => {
        const h = new Set(hiddenCats());
        on ? h.add(c) : h.delete(c);
        S.hide = [...h]; save();
        renderDays('work');
      };
      li.append(bb);
    });
    list.append(li);
  }
  const row = d => {                       // 한 줄 그리기 (두 보기가 같은 줄을 쓴다)
    const done = !!S.done[d.day];
    const b = el('button');
    b.dataset.done = done ? '1' : '0';
    if (nx && d.day === nx.day && (d.track || '') === (nx.track || '')) b.dataset.next = '1';
    const nm2 = el('span', 'nm', esc(d.theme));
    if (d.cat) nm2.append(el('i', 'catchip', esc(d.cat)));
    b.append(el('span', 'num', esc(label(d))), nm2,
             el('span', 'st', done ? '완료 ✔' : (d.words || []).length + '단어 + 대화'));
    b.onclick = () => { dive(() => renderDays(track)); startLearn(d); };
    const li = el('li'); li.append(b);
    if (done) {
      const u = el('button', 'ghost sm undo', '미완으로');
      u.onclick = () => { delete S.done[d.day]; save(); renderDays(track); };
      li.append(u);
    }
    return li;
  };

  let g = -1;
  days.forEach(d => {
    const gi = GROUPS.findIndex(([f]) => f(d));
    if (gi !== g) { g = gi; list.append(el('li', 'grp', esc(GROUPS[gi][1]))); }
    list.append(row(d));
  });
  show('course', track === 'work' ? '직무' : '일상', true);
}

/* ---------- 학습 ---------- */
let L = null;

function startLearn(d) {
  // 순서: 단어 카드 → 확인 문제(암기 다지기) → 오늘의 대화(문장으로 써먹기).
  // 문장이 마무리인 이유: 외운 것을 산출(말하기)로 끝내야 하루가 완성된다.
  const items = [];
  // 설명은 책 표지처럼 맨 앞 한 장으로. 단어 화면에서는 사라져서 그림 자리를 벌어 준다.
  const ci = cultureFor(d);
  if (d.intro) items.push({ k: 'cover', d: {
    t: label(d) + ' · ' + d.theme, b: d.intro,
    // 표지 그림은 그날 대화 장면 그림. 이미 만들어 둔 것이라 새로 뽑을 것이 없다.
    img: (d.dialog && d.dialog.img) || (d.words || []).map(w => w.img).find(Boolean),
    emoji: (d.dialog && d.dialog.emoji) || '',
    // 사용법은 처음 세 세트에만. 그 뒤엔 손이 기억한다 — 계속 띄우면 잔소리가 된다.
    how: (Object.keys(S.done).filter(k => +k >= 1).length < 3)
      ? '<b>베트남어 글자를 누르면 소리가 납니다.</b> 예문 칸도 누르면 들립니다.<br>' +
        '🕐 느리게 듣기 · 🎤 따라 말하기 — 녹음하면 원어민과 높낮이를 겹쳐 보여줍니다.'
      : '',
    cult: ci, pre: d.pre || [] } });
  (d.letters || []).forEach(x => items.push({ k: 'letter', d: x }));
  (d.tones || []).forEach(x => items.push({ k: 'tone', d: x }));
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  L = { day: d, items, i: 0 };
  drawCard();
  // 제목은 버튼 이름과 같게 — 준비 날들은 주제만 (준비 N 표기는 뺀다)
  show('learn', typeof d.day === 'string' ? d.theme : label(d) + ' · ' + d.theme, true);
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

/* 예문의 낱말마다 뜻을 붙인다 — 문장만 던져 주면 어느 조각이 어느 뜻인지 알 수가 없다.
   우리가 가르친 1,020개 사전에서 **긴 낱말부터** 맞춘다
   (bao nhiêu 를 bao / nhiêu 로 쪼개면 뜻이 안 나온다).
   그래도 안 잡히는 몇 개만 아래에 따로 적어 둔다. */
const EXTRAG = { 'để': '~하도록·두다', 'dạ': '네 (공손)', 'mắc': '비싸다',
                 'ngàn': '천 (1,000)', 'nhất': '가장', 'bàn': '탁자' };
let GVOC = null;
function glossOf(vi) {
  if (!GVOC) { GVOC = {}; allWords().forEach(w => { const k = w.vi.toLowerCase();
                                                    if (!GVOC[k]) GVOC[k] = w.ko; }); }
  const toks = vi.replace(/[,.!?;:]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length;) {
    let hit = null;
    for (let n = 3; n >= 1 && !hit; n--) {
      if (i + n > toks.length) continue;
      const ph = toks.slice(i, i + n).join(' ').toLowerCase();
      const m = GVOC[ph] || EXTRAG[ph];
      if (m) hit = { w: toks.slice(i, i + n).join(' '), m, n };
    }
    if (hit) { out.push(hit); i += hit.n; }
    else { out.push({ w: toks[i], m: null, n: 1 }); i += 1; }
  }
  return out.filter(x => x.m);
}
/* 낱말 뜻 줄 — 대화 화면의 gloss 와 같은 차림새 */
function glossRow(vi) {
  const list = glossOf(vi);
  if (!list.length) return null;
  const g = el('div', 'gloss');
  list.forEach(x => {
    const cell = el('div', 'gcell');
    cell.append(el('span', 'gtop').appendChild(el('span', 'gw', esc(x.w))).parentNode,
                el('span', 'gm', esc(x.m)));
    g.append(cell);
  });
  return g;
}

function drawCard() {
  resetRec();
  const c = $('#card');
  c.textContent = '';
  const it = L.items[L.i], x = it.d;

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
    c.append(el('div', 'exline', '예: <b>' + esc(x.ex) + '</b> — ' + esc(x.ex_ko)));
    // 소리는 글자가 아니라 예시 단어를 읽는다 — 버튼에 그걸 밝힌다
    const row = el('div', 'sound');
    const a = el('button', 'ghost', esc(x.ex) + ' 듣기'); a.onclick = () => play(x.ex, false);
    const b2 = el('button', 'ghost', '느리게'); b2.onclick = () => play(x.ex, true);
    row.append(a, b2); c.append(row);
    c.append(speakRow(x.ex));               // 준비 단계부터 따라 말하기 + 곡선 비교
  }

  if (it.k === 'tone') {
    c.append(el('div', 'vi', esc(x.vi)));
    c.append(el('div', 'tone-shape', toneArrow(x.mark)));
    c.append(reveal(x.kr_read));
    c.append(el('div', 'ko', esc(x.ko)));
    c.append(speakRow(x.vi, true));         // 듣기·느리게 + 따라 말하기 + 곡선 비교
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
    if (x.kr) row.append(el('span', 'wkr', '[' + esc(x.kr) + ']'));
    row.append(iconBtn('slow', '느리게 듣기', () => play(x.vi, true)));
    const rbox = el('div', 'cmpbox');
    if (canRecord()) {
      const mic = iconBtn('mic', '따라 말하기', null);
      mic.onclick = () => toggleRec(x.vi, mic, rbox);
      row.append(mic);
    }
    c.append(row);
    c.append(el('div', 'ko', esc(x.ko)));
    const gr = glossRow(x.vi); if (gr) c.append(gr);      // 낱말마다 뜻
    c.append(el('div', 'rulenote', esc(x.note)));
    if (L.day.day === 'R4') {          // 남부 소리 수업은 카드에서 바로 남북을 맞대 듣는다
      const cmp = el('div', 'sound');
      const bn = el('button', 'ghost', '북부 소리');
      bn.onclick = () => play(x.vi, false, S.voice);
      const bs = el('button', 'ghost', '남부 소리');
      bs.onclick = () => play(x.vi, false, 'sf');
      cmp.append(bn, bs);
      c.append(cmp);
    }
    c.append(curveArea(x.vi, rbox));
  }

  if (it.k === 'word') {
    // 그림을 크게 두려고 글자 요소를 줄였다.
    // 그림 → [단어 · 발음 · 느리게 · 마이크] → 뜻 → 예문(누르면 소리) → 원어민 곡선
    const p = pic(x, 'pic big'); if (p) c.append(p);
    else if (x.form) {                       // 그림으로 못 그리는 말은 '자리'를 보여준다
      const fb = el('div', 'formbox');
      fb.append(el('div', 'formf', esc(x.form)));
      if (x.fex) fb.append(el('div', 'formex', esc(x.fex)));
      c.append(fb);
    }
    const row = el('div', 'wrow');
    row.append(bigWord(x.vi, x.tones));
    if (x.kr_read) row.append(el('span', 'wkr', '[' + esc(x.kr_read) + ']'));
    row.append(iconBtn('slow', '느리게 듣기', () => play(x.vi, true)));
    const box = el('div', 'cmpbox');
    if (canRecord()) {
      const mic = iconBtn('mic', '따라 말하기', null);
      mic.onclick = () => toggleRec(x.vi, mic, box);
      row.append(mic);
    }
    c.append(row);
    c.append(el('div', 'ko', esc(x.ko)));
    if (x.hanja) c.append(el('div', 'hanja', '🔑 한자어 ' + esc(x.hanja)));
    if (x.south) c.append(el('div', 'south', '남부에서는 ' + esc(x.south)));
    const exm = exampleFor(L.day, x);
    if (exm) {
      const eb = el('button', 'wex');
      eb.type = 'button';
      const top = el('div', 'wextop');
      top.append(el('span', 'wexvi', esc(exm.vi)));
      if (exm.kr) top.append(el('span', 'wexkr', '[' + esc(exm.kr) + ']'));
      eb.append(top);
      if (exm.ko) eb.append(el('div', 'wexko', esc(exm.ko)));
      eb.onclick = () => play(exm.vi, false);
      c.append(eb);
    }
    c.append(curveArea(x.vi, box));
    tutorTap();
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
      lrow.append(el('div', 'lvi', esc(l.vi)));
      const bt = iconBtn('slow', '듣기', () => play(l.vi, false));
      bt.classList.remove('slow'); bt.classList.add('playi');
      bt.innerHTML = ICON.play;
      const bs = iconBtn('slow', '느리게 듣기', () => play(l.vi, true));
      lrow.append(bt, bs);
      row.append(lrow);
      row.append(reveal(l.kr_read));
      row.append(el('div', 'lko', esc(l.ko)));
      // 단어별 풀이 + 그 단어의 성조를 한 칸에
      const norm = x => x.toLowerCase().replace(/[.,!?;:'"]/g, '');
      const tmap = {};
      (l.tones || []).forEach(t => { tmap[norm(t.syl)] = t; });
      const g = el('div', 'gloss');
      l.gloss.forEach(pp => {
        const cell = el('div', 'gcell');
        const top = el('span', 'gtop');
        top.append(el('span', 'gw', esc(pp.w)));
        const t = tmap[norm(pp.w.split(' ')[0])];
        if (t) {
          const ch = el('span', 'gt ' + t.name, toneArrow(t.name));
          ch.title = t.name + ' · ' + t.ko;
          top.append(ch);
        }
        cell.append(top, el('span', 'gm', esc(pp.m)));
        /* 낱말 칸을 누르면 그 낱말 소리가 난다 — 우리 음원이 없으면 기계 목소리로라도 */
        cell.setAttribute('role', 'button'); cell.tabIndex = 0;
        cell.onclick = () => (AIDX[pp.w] ? play(pp.w, false) : speakVi(pp.w));
        cell.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cell.onclick(); } };
        g.append(cell);
      });
      row.append(g);
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
        if (o.kr_read) L2.append(el('span', 'exkr', '[' + esc(o.kr_read) + ']'));
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
  const KIND = { letter: '글자', tone: '성조', word: '단어', dialog: '대화', rule: '예문', cult: '문화' };
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
  $('#prev').disabled = L.i === 0;
  const last = L.i === L.items.length - 1;
  $('#next').textContent = last ? (L.cult ? '다 봤어요' : (L.day.words || []).length ? '확인 문제 ›'
    : L.day.rule ? '연습 문제 ›'
    : L.day.day === 'P1' || L.day.day === 'P2' ? '귀로 구별하기 ›' : '완료 ›') : '다음 ›';
}

$('#prev').onclick = () => { if (!$('#learn').hidden && L.i > 0) { L.i--; drawCard(); } };
$('#next').onclick = () => {
  // 연타 방지는 시간이 아니라 '아직 이 화면에 있는가'로 판단한다.
  // 시간으로 막으면 앞 화면에서 막 넘어온 사람까지 막힌다.
  if ($('#learn').hidden) return;
  if (L.i < L.items.length - 1) { L.i++; drawCard(); return; }
  if (L.cult) { renderHome(); return; }
  if (L.news) {                        // 기사 세트 — 대화 두 줄을 보고 끝. 채점도 복습도 없다
    if (!L.dlg && L.day.dialog) { L.items = [{ k: 'dialog', d: L.day.dialog }]; L.i = 0; L.dlg = true;
                                  drawCard(); show('learn', L.day.theme, true); return; }
    renderHome(); return;
  }
  if (L.dlg) {                         // 대화(써먹기)까지 끝나면 오늘 완료
    S.done[L.day.day] = now();
    (L.day.dialog?.lines || []).forEach(l => {          // 그날 문장도 복습 창고로
      if (!S.srs[l.vi]) S.srs[l.vi] = { lv: 0, first: now(), due: now() + STEPS[0] * DAY };
    });
    touchToday(); save();
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
  if (L.day.day === 'P1') { dive(backToCards); startVowel(); }
  else if (L.day.day === 'P2') { dive(backToCards); startTone(); }
  else renderHome();
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
    if (dir < 0 && L.i > 0) { L.i--; drawCard(); }
    else if (dir > 0 && L.i < L.items.length - 1) { L.i++; drawCard(); }
  };
  card.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) goto(dx < 0 ? 1 : -1);   // 왼쪽으로 밀면 다음(+1), 오른쪽으로 밀면 이전(-1)
  }, { passive: true });
})();

/* ---------- 훑기 엔진 (예습·간략 복습) ----------
   카드가 소리와 함께 저절로 넘어간다 — 인출이 없어 외우는 효과는 약하지만,
   내일 것을 미리 눈에 발라두거나(예습) 바쁜 날 밀린 카드를 훑는(간략) 용도.
   카드를 누르면 바로 다음으로 넘어간다. */
let FL = null;
function flashRun(words, title) {
  const ws = (words || []).filter(w => AIDX[w.vi]);
  if (!ws.length) return;
  FL = { list: ws, i: 0 };
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
    const hm = el('button', 'primary big', '홈으로');
    hm.style.marginTop = '20px'; hm.onclick = renderHome;
    r.append(hm); b.append(r);
    touchToday();
    return;
  }
  $('#quizFill').style.width = (FL.i / FL.list.length * 100) + '%';
  const w = FL.list[FL.i];
  const c = el('div', 'card');
  const p = pic(w, 'pic'); if (p) c.append(p);
  c.append(el('div', 'vi', esc(w.vi)));
  c.append(toneRow(w.tones));
  c.append(reveal(w.kr_read));
  c.append(el('div', 'ko', esc(w.ko)));
  b.append(c);
  const dots = el('div', 'fldots');
  FL.list.forEach((_, i) => dots.append(el('i', i === FL.i ? 'on' : null)));
  b.append(dots);
  b.append(el('p', 'note', '옆으로 밀면 앞뒤로 넘어갑니다. 그냥 두면 3초마다 저절로 넘어갑니다.'));
  let moved = false;
  const go = (step) => {
    if (moved || $('#quiz').hidden || !FL) return;
    moved = true; clearTimeout(tm); audio.onended = null;
    FL.i = Math.max(0, FL.i + (step === undefined ? 1 : step)); drawFlash();
  };
  // 릴스처럼 — 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
  let x0 = null;
  c.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  c.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    else go(1);
  }, { passive: true });
  audio.pause();
  audio.src = `audio/${voiceDir()}/n/${AIDX[w.vi]}.mp3`;
  audio.currentTime = 0;
  audio.play().catch(() => { });
  const tm = setTimeout(go, 3000);       // 한 장에 3초 — 소리가 끝나도 남은 시간은 눈으로 본다
  c.onclick = go;                        // 급하면 눌러서 바로 다음
}

/* 확인 문제 뒤의 마무리 — 오늘 배운 문장을 실제로 써먹는다 */
function startDialog(d) {
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
  if (aiReady() && d.dialog) {
    const c = el('button', 'primary big', '이 대화로 AI 선생님과 역할극 ›');
    c.style.marginTop = '20px';
    c.onclick = startChat;
    r.append(c);
  }
  const hm = el('button', 'ghost big', '홈으로');
  hm.style.marginTop = '10px';
  hm.onclick = renderHome;
  r.append(hm);
  b.append(r);
  show('quiz', '오늘 완료', true);
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
const SKILLS = [
  { k: 'say',    name: '말하기', how: '뜻만 보고 베트남어로 말하기 — AI가 듣고 채점' },
  { k: 'listen', name: '듣기', how: '소리 듣고 뜻 고르기' },
  { k: 'read',   name: '읽기', how: '글자 보고 뜻 고르기' },
  { k: 'write',  name: '쓰기', how: '소리 듣고 자판으로 · 가끔 손으로 쓰기' },
];
function pickMode(w, lv) {
  const r = Math.random();
  if (w.sent) return r < .5 ? 'listen' : 'say';          // 문장은 알아듣기와 말하기 위주
  if (lv >= 2) return r < .35 ? 'say' : r < .52 ? 'type' : r < .60 ? 'hand' : r < .80 ? 'listen' : 'read';
  if (lv >= 1) return r < .22 ? 'say' : r < .45 ? 'type' : r < .75 ? 'listen' : 'read';
  return r < .55 ? 'listen' : 'read';
}
/* 낱말 → 속한 세트 색인. 오답 보기를 같은 세트에서 뽑기 위한 것 —
   엉뚱한 세트의 단어가 보기로 나오면 뜻만 슬쩍 봐도 답이 티가 난다. */
let CHAPIX = null;
function chapOf(vi) {
  if (!CHAPIX) { CHAPIX = {}; ALL.forEach(d => (d.words || []).forEach(w => { CHAPIX[w.vi] = d.day; })); }
  return CHAPIX[vi];
}
function buildQuestions(words, forced) {
  const pool = allWords();
  // 오답 보기는 같은 종류에서 고른다 — 문장 문제에 단어 뜻을 섞으면
  // 길이만 보고 정답을 찍을 수 있어 문제가 문제 구실을 못 한다.
  const spool = [...allSents(), ...lessonSents()];
  return words.map(w => {
    const lv = (S.srs[w.vi] || {}).lv || 0;
    let mode = forced === 'write' ? (!w.sent && Math.random() < .35 ? 'hand' : 'type')
             : forced || pickMode(w, lv);
    if ((mode === 'listen' || mode === 'type') && !AIDX[w.vi]) mode = 'read';   // 소리가 없으면 눈으로
    let src = w.sent ? spool : pool;
    if (src.length < 4) src = [...src, ...(w.sent ? pool : spool)];             // 모자라면 채운다
    const seen = new Set([w.vi]);
    // 같은 세트 이웃부터 — 주제가 같아야 헷갈리는 진짜 보기가 된다. 모자라면 전체에서 채운다.
    const home = w.sent ? undefined : chapOf(w.vi);
    const near = home === undefined ? []
      : src.filter(x => !seen.has(x.vi) && chapOf(x.vi) === home && seen.add(x.vi))
           .sort(() => Math.random() - .5).slice(0, 3);
    const others = near.concat(
      src.filter(x => !seen.has(x.vi) && seen.add(x.vi))
         .sort(() => Math.random() - .5).slice(0, 3 - near.length));
    return { w, mode, opts: [w, ...others].sort(() => Math.random() - .5) };
  }).sort(() => Math.random() - .5);
}

const REV_CHUNK = 20;                          // 복습 한 판의 최대 문제 수
function startQuiz(words, day, cap, early, opt) {
  const o = opt || {};
  let src = words || dueWords().map(findItem).filter(Boolean);
  if (o.kind === 'word') src = src.filter(x => !x.sent);
  if (o.kind === 'sent') src = src.filter(x => x.sent);
  if (!src.length) { noItems(o); return; }
  if (!day) src = src.slice(0, cap || REV_CHUNK);   // 복습은 20개씩 끊어 낸다
  const list = buildQuestions(src, o.skill);
  Q = { list, i: 0, ok: 0, day, total: list.length, early, opt: o };
  drawQuiz();
  const nm = (o.kind === 'sent' ? '문장' : o.kind === 'word' ? '단어' : '') +
             (o.skill ? ' ' + (SKILLS.find(x => x.k === o.skill) || {}).name : '');
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

function reviewMenu(kind) {
  const b = $('#quizBody');
  b.textContent = '';
  $('#quizFill').style.width = '0%';
  const due = dueWords().map(findItem).filter(Boolean).filter(x => kind === 'sent' ? x.sent : !x.sent);
  b.append(el('p', 'lede', (kind === 'sent' ? '문장' : '단어') + ' 복습 — ' + due.length + '개 대기'));
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
  quick.onclick = () => { dive(back); flashRun(due.slice(0, 20), (kind === 'sent' ? '문장' : '단어') + ' 3분'); };
  b.append(quick);
  const mr = missRow(missWords(kind), back);
  if (mr) b.append(mr);
  show('quiz', (kind === 'sent' ? '문장' : '단어') + ' 복습', true);
}

/* 복습 입구 — 처음이거나 꺼낼 카드가 없으면 방식부터 설명한다.
   전에는 카드가 없으면 말없이 홈으로 돌아가서 버튼이 죽은 것처럼 보였다.
   설명은 홈의 [방식] 버튼으로 언제든 다시 볼 수 있다. */
function reviewStart(cap) {
  const due = dueWords().map(findItem).filter(Boolean);
  if (S.revSeen && due.length) { startQuiz(due, null, cap); return; }
  drawRevInfo(cap);
}
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
    const soon = Object.values(S.srs).map(v => v.due).filter(d => d > now()).sort((x, y) => x - y)[0];
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
  return Object.entries(S.stats.miss || {}).filter(([, n]) => n >= 2)
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
  Q.t0 = Date.now();                                   // 이 문제를 언제 봤는지 (반응 속도)
  const LABEL = { listen: '듣고 뜻을 고르세요', read: '뜻을 고르세요', say: '베트남어로 말해 보세요',
                  type: '듣고 자판으로 쳐 보세요', hand: '듣고 손으로 써 보세요', recall: '소리 내어 말해 보세요',
                  dict: '듣고 글자를 만들어 보세요' };
  body.append(el('div', 'q', LABEL[q.mode]));

  if (q.mode === 'recall') return drawSay(body, q);   // 옛 이름 호환
  if (q.mode === 'say') return drawSay(body, q);
  if (q.mode === 'type') return drawTypeQ(body, q);
  if (q.mode === 'hand') return drawHandQ(body, q);
  if (q.mode === 'dict') return drawDict(body, q);

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
  if (q.mode === 'listen') {           // 귀로만 — 글자는 답한 뒤에 보여준다
    const wrap = el('div', 'qplay');
    const b = el('button', 'primary big', '듣기');
    b.onclick = () => play(q.w.vi, false);
    const sl = el('button', 'ghost', '느리게 듣기');
    sl.onclick = () => play(q.w.vi, true);
    wrap.append(b, sl);
    const m = addMic(); if (m) wrap.append(m);
    body.append(wrap, sayBox);
    play(q.w.vi, false);
  } else {                             // 눈으로 — 글자를 보여주고 뜻을 고른다
    /* 글자를 **누르면 소리**가 난다. 따로 '듣기' 단추를 두지 않는다 —
       앱 어디서나 낱말은 누르면 들리는 것으로 통일한다. */
    const main = el('button', 'qmain qtap' + (q.w.sent ? ' sent' : ''), esc(q.w.vi));
    main.type = 'button';
    main.onclick = () => (AIDX[q.w.vi] ? play(q.w.vi, false) : speakVi(q.w.vi));
    body.append(main);
    const wrap = el('div', 'qplay');
    const m = addMic(); if (m) wrap.append(m);
    if (wrap.children.length) body.append(wrap);
    body.append(sayBox);
  }

  const opts = el('div', 'opts');
  q.opts.forEach(o => {
    const b = el('button', null, esc(o.ko));      // 보기는 언제나 '뜻' — 무엇을 묻는지가 분명해진다
    b.dataset.vi = o.vi;
    b.onclick = () => answer(b, o.vi === q.w.vi, q.w);
    opts.append(b);
  });
  body.append(opts);
}

/* 오답 뒤에는 스스로 넘긴다 — 틀린 걸 볼 시간이 필요하다. 정답은 자동으로 넘어간다. */
function nextBtn(box, fn) {
  const b = el('button', 'primary big', '다음 ›');
  b.style.width = '100%'; b.style.marginTop = '14px';
  b.onclick = fn;
  box.append(b);
}


/* 받아쓰기 — 소리를 듣고 음절 조각으로 그대로 만든다.
   조각에 '같은 글자, 다른 성조' 미끼를 섞어서 성조까지 들어야 풀리게 한다.
   보고 베끼기는 인출이 없어 효과가 약하다 — 소리→철자 인출이라야 남는다. */
function drawDict(body, q) {
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기');
  b.onclick = () => play(q.w.vi, false);
  const sl = el('button', 'ghost', '느리게 듣기');
  sl.onclick = () => play(q.w.vi, true);
  wrap.append(b, sl);
  body.append(wrap);
  play(q.w.vi, false);
  body.append(el('div', 'q mid', esc(q.w.ko)));   // 뜻은 보여준다 — 철자와 성조를 시험하는 것이니까

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
    markSpeed(good, 'dict');
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    if (!good) bump('serr', bare(picked.join(' ')) === bare(q.w.vi) ? '성조만 틀림' : '글자를 틀림', false);
    fxTone(good);
    chk.disabled = undo.disabled = true;
    [...tiles.children].forEach(t => t.disabled = true);
    ans.dataset.r = good ? 'ok' : 'no';
    if (!good) ans.textContent = picked.join(' ') + '  →  ' + q.w.vi;
    if (good) Q.ok++; else requeue(Q.list[Q.i]);
    grade(q.w.vi, good, Q.early);
    if (good) setTimeout(() => { Q.i++; drawQuiz(); }, 600);
    else nextBtn(body, () => { Q.i++; drawQuiz(); });
  };
  const row = el('div', 'qplay'); row.append(undo, chk);
  body.append(ans, tiles, row);
}

/* 입으로 — 듣고 따라 말하고, 원어민 높낮이와 겹쳐 본다 (복습 안에서) */
/* 말하기 — 한국어 뜻만 보고 베트남어로 말한다(가장 어렵고 가장 남는 방식).
   보기도 글자도 주지 않는다: 단서 없이 꺼내야 진짜 기억이 된다. */
function drawSay(body, q) {
  const w = q.w;
  const p = pic(w, 'pic mid'); if (p) body.append(p);
  body.append(el('div', 'qmain' + (w.sent ? ' sent' : ''), esc(w.ko)));
  const jbox = el('div', 'cmpnote judge');
  let done = false;
  const finish = (ok, judged) => {
    if (done) return; done = true;
    markSpeed(ok, judged ? 'say' : 'sayself');
    grade(w.vi, ok, Q.early);
    if (ok) Q.ok++; else requeue(q);
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(w.kr_read));
    const sr = soundRow(w.vi, true); sr.classList.add('mid');
    ans.append(sr);
    body.append(ans);
    nextBtn(body, () => { Q.i++; drawQuiz(); });
  };
  const jb = judgeBtn(w.vi, jbox, finish);
  const row = el('div', 'qplay');
  if (jb) row.append(jb);
  const showA = el('button', jb ? 'ghost' : 'primary big', jb ? '모르겠어요' : '말했어요 · 정답 보기');
  showA.onclick = () => { bumpSaid(); finish(!jb ? true : false, false); };
  row.append(showA);
  body.append(row, jbox);
}

/* 손으로 — 성조 부호까지 써 본다 (복습 안에서) */
function drawHandQ(body, q) {
  const w = q.w;
  body.append(el('div', 'qmain', esc(w.ko)));
  const row = el('div', 'qplay');
  const p1 = el('button', 'ghost', '듣기'); p1.onclick = () => play(w.vi, false);
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
    ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(w.kr_read));
    body.insertBefore(ans, box);
  };
  const mark = good => {
    markSpeed(good, 'hand');
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
  if (aiReady()) {
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

/* 연습용 화면 자판 — 대화 자판과 **같은 텔렉스**를 쓴다.
   예전에는 여기만 모자 글쇠(ă â ê…)와 성조 화살표가 따로 붙어 있었다.
   대화에서 익힌 방식이 시험에서 안 통하면 두 번 배우는 셈이다. */
function viKeypad(get, set, onGo) {
  const kb = el('div', 'vkb');
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
  KBROWS.forEach(chars => {
    const row = el('div', 'vkrow');
    chars.forEach(ch => row.append(key(ch, () => tap(ch))));
    kb.append(row);
  });
  const brow = el('div', 'vkrow');
  brow.append(key('띄어쓰기', () => set(get() + ' '), 'wide'),
              key('⌫', () => set(get().slice(0, -1)), 'wide'),
              key('확인', onGo, 'go wide'));
  kb.append(brow);
  kb.append(el('p', 'note', '성조는 낱말 뒤에 <b>f s r x j</b> 를 붙여 찍습니다 (chao+f → chào). ' +
    '모자는 <b>aa ee oo aw ow uw dd</b>. 실제 베트남 자판과 같은 방식입니다.'));
  return kb;
}

/* 자판으로 — 철자와 부호 위치를 정확히 (복습 안에서) */
function drawTypeQ(body, q) {
  const w = q.w;
  body.append(el('div', 'qmain', esc(w.ko)));
  const row = el('div', 'qplay');
  const p1 = el('button', 'ghost', '듣기'); p1.onclick = () => play(w.vi, false);
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  row.append(p1, p2); body.append(row);
  play(w.vi, false);
  let txt = '';
  const out = el('div', 'dictans');
  const draw = () => { out.textContent = txt || '· · ·'; };
  draw(); body.append(out);
  body.append(viKeypad(() => txt, v => { txt = v; draw(); }, () => {
    if (!txt.trim()) return;
    const good = txt.trim().toLowerCase() === w.vi.toLowerCase();
    markSpeed(good, 'type');
    fxTone(good);
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    if (!good) bump('serr', bare(txt) === bare(w.vi) ? '성조만 틀림' : '글자를 틀림', false);
    out.dataset.r = good ? 'ok' : 'no';
    if (!good) out.textContent = txt.trim() + '  →  ' + w.vi;
    grade(w.vi, good, Q.early);
    if (good) { Q.ok++; setTimeout(() => { Q.i++; drawQuiz(); }, 700); }
    else { requeue(q); nextBtn(body, () => { Q.i++; drawQuiz(); }); }
  }));
}


/* 말한 것을 AI가 받아 적어 맞는지 본다.
   성조는 채점하지 않는다(AI도 성조는 틀린다). 글자가 맞으면 정답으로 친다 —
   "알아들을 수 있게 말했는가"가 이 단계의 목표다. */
/* 말하기 보기 넷 만들기 — 목표 + 헷갈릴 낱말 셋.
   성조만 다른 낱말을 먼저 넣는다(sữa/sửa). 그래야 성조가 어설플 때 그쪽이 골라져
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
function judgeBtn(target, box, onDone) {
  if (!canRecord() || !aiReady()) return null;
  const b = el('button', 'rec', '🎤 말하고 채점받기');
  b.onclick = async () => {
    if (REC.mr && REC.mr.state === 'recording') { REC.mr.stop(); return; }
    try {
      if (!REC.stream) REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { box.textContent = '마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요.'; return; }
    const chunks = [];
    const mr = new MediaRecorder(REC.stream);
    REC.mr = mr; REC.key = target;
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      releaseMic();
      b.textContent = '🎤 말하고 채점받기';
      const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
      if (REC.url) URL.revokeObjectURL(REC.url);
      REC.url = url;
      box.textContent = 'AI가 듣는 중…';
      bumpSaid();
      try {
        const b64 = await recToWav(url);
        const { heard, ok } = await askSpeech(target, b64,
          i => { box.textContent = `AI가 붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
        if (ok !== null) {                    // 판정을 미룬 것은 성적에 넣지 않는다
          S.stats.pronAll = (S.stats.pronAll || 0) + 1;
          if (ok) S.stats.pronOk = (S.stats.pronOk || 0) + 1;
          save();
        }
        box.innerHTML = (ok === true
          ? '<b class="okmsg">알아들었습니다.</b>'
          : heard
            ? '<b class="nomsg">「' + esc(heard) + '」처럼 들립니다.</b> 목표는 <b>' + esc(target)
              + '</b> — 조금 크게, 또박또박 다시 해 보세요.'
            : '<b>가려내기 어렵습니다 — <b>틀렸다고 하지 않겠습니다.</b></b> 폰을 입 가까이 대고 조금 크게 다시 해 보세요.')
          + '<span class="tonenote">높낮이는 아래 곡선이 봅니다.</span>';
        fxTone(ok === true);
        onDone && onDone(ok, true);   // null 이면 점수 없음 (AI가 매긴 것임을 알린다)
      } catch (e) { box.textContent = 'AI 듣기 실패: ' + (e.message || ''); }
    };
    const kill = liveRec(box, REC.stream, RECSEC(target),
                         () => { if (mr.state === 'recording') mr.stop(); });
    const prevStop = mr.onstop;
    mr.onstop = async e => { kill(); await prevStop(e); };
    mr.start();
    b.textContent = '■ 멈추기';
    setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, RECSEC(target) * 1000);
  };
  return b;
}

/* 회상형 — 보기를 주지 않고 직접 떠올려 소리 내게 한다.
   4지선다는 아는 것처럼 보이게 만든다(실제보다 20% 과대평가). 회상이 진짜다.
   게다가 소리 내어 말하므로 산출 효과까지 같이 얻는다. 채점은 본인이 한다. */
function drawRecall(body, q) {
  body.append(el('div', 'qmain', esc(q.w.ko)));
  { const p = pic(q.w, 'pic mid'); if (p) body.append(p); }

  const hint = el('p', 'cmpnote', '베트남어로 <b>입 밖에 내어</b> 말해 보세요. 속으로만 생각하면 효과가 절반입니다.');
  body.append(hint);

  const jbox = el('div', 'cmpnote judge');
  const jb = judgeBtn(q.w.vi, jbox, ok => {
    grade(q.w.vi, ok, Q.early);
    if (ok) Q.ok++; else requeue(q);
    nextBtn(body, () => { Q.i++; drawQuiz(); });
  });
  if (jb) { const row = el('div', 'qplay'); row.append(jb); body.append(row, jbox); }

  const show = el('button', 'primary big', jb ? '모르겠어요 · 정답 보기' : '말했어요 · 정답 보기');
  show.style.width = '100%';
  body.append(show);

  show.onclick = () => {
    bumpSaid();                      // 소리 내어 말했다고 스스로 누른 순간
    show.remove(); hint.remove();
    const ans = el('div', 'ansbox');
    ans.append(el('div', 'vi sm', esc(q.w.vi)));
    ans.append(toneRow(q.w.tones));
    ans.append(reveal(q.w.kr_read));
    const sr = soundRow(q.w.vi, true);
    sr.classList.add('mid');
    ans.append(sr);
    body.append(ans);

    const grade2 = el('div', 'opts');
    const ok = el('button', null, '✓ 맞았어요');
    ok.onclick = () => { fxTone(true); markSpeed(true, 'sayself'); grade(q.w.vi, true, Q.early); Q.ok++; Q.i++; drawQuiz(); };
    const no = el('button', null, '✗ 못 맞혔어요');
    no.onclick = () => { markSpeed(false, 'sayself'); grade(q.w.vi, false); requeue(q); Q.i++; drawQuiz(); };
    grade2.append(ok, no);
    body.append(grade2);
  };
}

function answer(btn, correct, w) {
  const md = Q.list[Q.i].mode;
  markSpeed(correct, md);
  // 눈으로 푼 것은 읽기, 귀로 푼 것은 듣기로 센다 (전에는 둘 다 '암기'에만 쌓였다)
  const bx = md === 'read' ? 'read' : md === 'listen' ? 'ear' : null;
  if (bx) { S.stats[bx + 'All'] = (S.stats[bx + 'All'] || 0) + 1;
            if (correct) S.stats[bx + 'Ok'] = (S.stats[bx + 'Ok'] || 0) + 1; }
  [...btn.parentNode.children].forEach(b => b.disabled = true);
  btn.dataset.r = correct ? 'ok' : 'no';
  fxTone(correct);
  if (!correct) {
    [...btn.parentNode.children].forEach(b => {
      if (b.dataset.vi === w.vi || b.textContent === w.ko) b.dataset.r = 'ok';
    });
  }
  if (correct) Q.ok++;
  else requeue(Q.list[Q.i]);        // 틀린 건 이번 판 끝에 한 번 더
  grade(w.vi, correct, Q.early);
  // 답한 뒤에는 글자·성조·발음·뜻을 한 번에 보여준다 (맞았든 틀렸든)
  const ans = el('div', 'ansbox');
  ans.append(el('div', 'vi sm', esc(w.vi)), toneRow(w.tones), reveal(w.kr_read),
             el('div', 'ko', esc(w.ko)));
  btn.parentNode.after(ans);
  if (correct) setTimeout(() => { Q.i++; drawQuiz(); }, 450);
  else nextBtn($('#quizBody'), () => { Q.i++; drawQuiz(); });
}

/* 틀린 문제를 같은 판 뒤쪽에 한 번만 다시 넣는다.
   틀린 채로 끝내면 그 기억이 남는다. 맞히고 끝내야 한다. */
/* 얼마나 빨리 답했나 — 정답만 센다(틀린 건 고민 시간이 뒤섞인다).
   정답률이 같아도 느리면 아직 '자동'이 안 된 것이다. */
function markSpeed(ok, mode) {
  bump('md', mode, ok);
  if (!ok || !Q.t0) return;
  const ms = Date.now() - Q.t0;
  if (ms < 500 || ms > 20000) return;                  // 튀는 값은 버린다
  S.stats.ms = (S.stats.ms || 0) + ms;
  S.stats.msN = (S.stats.msN || 0) + 1;
}

function requeue(q) {
  if (q.retry) return;                          // 두 번은 안 미룬다
  Q.list.push({ ...q, retry: true });
}

/* 어떤 성조에서 자주 틀리는지 — 단어의 첫 음절 성조로 센다 */
const toneOfWord = vi => {
  const w = allWords().find(x => x.vi === vi);
  return (w && (w.tones || [])[0] || {}).name || null;
};
function bump(box, key, ok) {
  if (!key) return;
  const b = S.stats[box] || (S.stats[box] = {});
  const c = b[key] || (b[key] = { ok: 0, all: 0 });
  c.all++; if (ok) c.ok++;
}
/* 채점은 잘게 나눌수록 분석이 깊어진다. 다만 한 문제에 조회는 한 번만 한다 —
   allWords()가 1000개짜리 배열을 훑기 때문에 문제마다 여러 번 부르면 폰이 느려진다. */
const HARDLTR = ['ư', 'ơ', 'ă', 'â', 'ê', 'ô', 'đ'];
/* 성조 부호만 뗀 모양. "성조만 틀렸나 글자를 틀렸나"를 가르는 데 쓴다 */
const bare = t => t.trim().toLowerCase().split(/\s+/).map(stripTone).join(' ');
function grade(vi, ok, early) {
  touchToday();
  // 암기 점수용 계수기 — 인출 시도와 성공을 센다
  S.stats.qAll = (S.stats.qAll || 0) + 1;
  if (ok) S.stats.qOk = (S.stats.qOk || 0) + 1;

  const w = allWords().find(x => x.vi === vi);
  bump('tn', (w && (w.tones || [])[0] || {}).name || null, ok);          // 성조별
  const syl = vi.trim().split(/\s+/).length;
  bump('syl', syl === 1 ? '1음절' : syl === 2 ? '2음절' : '3음절+', ok);   // 길이별
  if (HARDLTR.some(c => vi.includes(c))) bump('ltr', '어려운 모음·đ', ok); // ư ơ ă â ê ô đ 가 든 단어
  const r0 = S.srs[vi];
  if (!early && r0) {
    bump('lv', '사다리 ' + (r0.lv || 0) + '단', ok);                      // 복습 단계별
    const od = r0.due ? now() - r0.due : -1;
    if (od >= 0) bump('od', od < DAY ? '제때' : od < 4 * DAY ? '1~3일 밀림'
                          : od < 8 * DAY ? '4~7일 밀림' : '8일 넘게 밀림', ok);
  }
  if (!ok) {                                          // 자주 틀리는 단어
    const m = S.stats.miss || (S.stats.miss = {});
    m[vi] = (m[vi] || 0) + 1;
  } else if (S.stats.miss && S.stats.miss[vi]) {
    S.stats.miss[vi] = Math.max(0, S.stats.miss[vi] - 0.5);   // 맞히면 서서히 지워진다
  }
  if (early && ok) { save(); return; }   // 예정보다 일찍 꺼내 맞힌 건 사다리를 안 올린다
  const r = S.srs[vi] || { lv: 0, first: now() };
  if (!r.first) r.first = now();
  r.lv = ok ? Math.min(r.lv + 1, STEPS.length - 1) : Math.max(0, r.lv - 2);
  r.due = now() + STEPS[r.lv] * DAY;
  S.srs[vi] = r;
  save();
}

function finishQuiz() {
  $('#quizFill').style.width = '100%';
  if (!Q.day) {
    S.stats.rev = (S.stats.rev || 0) + 1;                          // 복습 판 수 (업적용)
    if (!Q.early) S.revDay = ymd();                                // 오늘 복습을 끝냈다는 도장
    save();
    cloudSave(true);                       // 복습을 마쳤으니 서버에도 남긴다 (버튼 없이 자동)
  }
  const n = Q.ok, t = Q.total;
  const again = Q.list.length - Q.total;
  const r = el('div', 'result');
  if (n === t && t > 0) {          // 다 맞힌 날은 축하가 있어야 한다
    r.classList.add('perfect');
    const cf = el('div', 'confetti');
    for (let i = 0; i < 14; i++) { const s = el('i'); s.style.setProperty('--i', i); cf.append(s); }
    r.append(cf);
    fxTone(true);
  }
  r.append(el('div', 'n', n + ' / ' + t));
  if (again) r.append(el('div', 'sub', again + '개는 그 자리에서 한 번 더 물었습니다'));
  r.append(el('div', null, n === t ? '전부 맞혔습니다' :
    n >= t * .7 ? '좋습니다. 틀린 건 내일 다시 나옵니다' :
      '틀린 건 내일 다시 나옵니다. 처음엔 다 그렇습니다'));
  const soon = Object.values(S.srs).map(v => v.due).filter(d => d > now()).sort((a, b) => a - b)[0];
  if (soon) {
    const days = Math.max(1, Math.round((soon - now()) / DAY));
    r.append(el('p', 'note', `다음 복습은 ${days}일 뒤입니다. 잊기 직전에 다시 꺼내야 오래 남습니다.`));
  }
  const left = Q.day ? 0 : dueWords().length;
  if (left) {
    const more = el('button', 'primary big', '이어서 ' + Math.min(left, REV_CHUNK) + '개 더');
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
    if (Q.day) { S.done[Q.day.day] = now(); touchToday(); save(); }
    renderHome();
  };
  r.append(b);
  $('#quizBody').textContent = '';
  $('#quizBody').append(r);
}


/* ---------- 성조 훈련 (미니멀 페어) ----------
   성조만 다르고 나머지는 같은 단어를 소리로만 구별시킨다.
   시판 앱 대부분이 빠뜨린 부분이고, 성조 습득 연구가 가리키는 표준 훈련법이다. */
let T = null;

/* 모음 구별 듣기 — 한국인이 가장 오래 헷갈리는 o/ô/ơ · u/ư · a/ă 를 귀로 가른다 */
let VD = null;
function startVowel() {
  const qs = [];
  VDRILL.forEach(g => g.items.forEach(it => qs.push({ g, it })));
  VD = { list: qs.sort(() => Math.random() - .5).slice(0, 10), i: 0, ok: 0 };
  drawVowel();
  show('tone', '모음', true);
}
function drawVowel() {
  const body = $('#toneBody');
  body.textContent = '';
  if (VD.i >= VD.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', VD.ok + ' / ' + VD.list.length));
    r.append(el('div', null, VD.ok >= 7 ? '모음이 귀에 들어오고 있습니다' : '괜찮습니다. u와 ư는 원래 오래 걸립니다'));
    const b2 = el('button', 'primary big', '다시 하기'); b2.style.marginTop = '16px'; b2.onclick = startVowel;
    const h2 = el('button', 'ghost big', '홈으로'); h2.style.marginLeft = '8px'; h2.onclick = renderHome;
    r.append(b2, h2); body.append(r); return;
  }
  const { g, it } = VD.list[VD.i];
  if (VD.i === 0) {
    body.append(el('div', 'intro',
      "글자는 아는데 소리가 다른 모음들입니다. o 입 크게 '오' · ô 오므린 '오' · ơ '어' · ư 입 벌린 '으' — 귀에만 익히면 됩니다."));
    const rb = el('button', 'ghost sm', '모음 소개 다시 보기');
    rb.onclick = () => startLearn(ALL.find(d => d.day === 'P1'));
    body.append(rb);
  }
  body.append(el('div', 'q', `${VD.i + 1} / ${VD.list.length} · 소리를 듣고 고르세요`));
  body.append(el('div', 'tonehint', esc(g.note)));
  const wrap = el('div', 'qplay');
  const b = el('button', 'primary big', '듣기'); b.onclick = () => play(it.vi, false);
  const sl = el('button', 'ghost', '느리게 듣기'); sl.onclick = () => play(it.vi, true);
  wrap.append(b, sl); body.append(wrap);
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
      if (good) { VD.ok++; setTimeout(() => { VD.i++; drawVowel(); }, 500); }
      else nextBtn(body, () => { VD.i++; drawVowel(); });
    };
    opts.append(btn);
  });
  body.append(opts);
}

/* 성조는 버튼 하나 — 처음이면 소개 카드(준비 2)부터, 그 뒤로는 바로 훈련 */
function toneEntry() {
  const p2 = ALL.find(d => d.day === 'P2');
  if (p2 && !S.done['P2']) { startLearn(p2); return; }
  startTone();
}

/* 모음도 버튼 하나 — 처음이면 모음 카드(준비 1)부터, 그 뒤로는 바로 구별 훈련.
   자음은 카드만 있고 '구별 훈련'이 없는 것은 의도다: 북부 표준에서
   tr=ch, s=x, d=gi=r이 같은 소리로 합쳐져 귀로 가르는 훈련이 성립하지 않는다. */
function vowelEntry() {
  const p1 = ALL.find(d => d.day === 'P1');
  if (p1 && !S.done['P1']) { startLearn(p1); return; }
  startVowel();
}

/* 한 세션 = 듣고 구별 6문제 + 들은 소리에 부호 붙이기 4문제 (같은 귀의 두 얼굴) */
function startTone() {
  const qs = [];
  DRILL.forEach(g => g.items.forEach(it => qs.push({ kind: 'pair', g, it })));
  const pairs = qs.sort(() => Math.random() - .5).slice(0, 6);
  const marks = markPool().sort(() => Math.random() - .5).slice(0, 4)
    .map(w => ({ kind: 'mark', w }));
  T = { list: [...pairs, ...marks].sort(() => Math.random() - .5), i: 0, ok: 0 };
  drawTone();
  show('tone', '성조', true);
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
  b.onclick = () => play(it.vi, false, S.voice);
  const sl = el('button', 'ghost', '느리게 듣기');
  sl.onclick = () => play(it.vi, true, S.voice);
  wrap.append(b, sl);
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
      if (good) { T.ok++; setTimeout(() => { T.i++; drawTone(); }, 500); }
      else nextBtn(body, () => { T.i++; drawTone(); });
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
  const sl = el('button', 'ghost', '느리게 듣기');
  sl.onclick = () => play(w.vi, true);
  wrap.append(b, sl);
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
      if (good) setTimeout(() => { T.i++; drawTone(); }, 500);
      else nextBtn(body, () => { T.i++; drawTone(); });
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
  r.append(b, h);
  $('#toneBody').textContent = '';
  $('#toneBody').append(r);
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
  { key: 'R4', title: '남부 소리',
    intro: '남부(호찌민 쪽)는 글은 완전히 같고 소리가 다릅니다. 위의 북부 버튼을 눌러 남부 소리로 바꿔 비교하며 들어 보세요.',
    cards: [
      { vi: 'dạ', ko: '네 (공손)', kr: '북부 자 → 남부 야',
        tones: tns('dạ:nặng'), note: 'd · gi · v 가 남부에서 y 이 소리가 된다' },
      { vi: 'ba', ko: '아빠 (남부)', kr: '바',
        tones: tns('ba:ngang'), note: '북부 bố → 남부 ba. 엄마도 mẹ → má' },
      { vi: 'mắc', ko: '비싸다 (남부)', kr: '막',
        tones: tns('mắc:sắc'), note: '북부 đắt → 남부 mắc' },
      { vi: 'ngàn', ko: '천 1,000 (남부)', kr: '응안',
        tones: tns('ngàn:huyền'), note: '북부 nghìn → 남부 ngàn. 성조도 hỏi·ngã가 하나로 합쳐진다' }],
    quiz: [{ q: '남부에서 "아빠"는?', opts: ['ba', 'bố'], a: 0, say: 'ba' },
           { q: '남부에서 "비싸다"는?', opts: ['mắc', 'đắt'], a: 0, say: 'mắc' },
           { q: '남부에서 "천(1000)"은?', opts: ['ngàn', 'nghìn'], a: 0, say: 'ngàn' }] },

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
      if (c.vi.split(' ').length < 2) return;          // 낱말 하나짜리는 뺀다
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
        row.append(iconBtn('slow', '느리게 듣기', () => play(q.say, true)));
        if (canRecord()) {
          const mic = iconBtn('mic', '따라 말하기', null);
          mic.onclick = () => toggleRec(q.say, mic, box);
          row.append(mic);
        }
        box.append(row);
        b.append(box);
      }
      if (good) setTimeout(() => { RL.i++; drawRule(); }, q.say ? 2200 : 900);
      else nextBtn(b, () => { RL.i++; drawRule(); });
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
function startType() {
  const ws = practiceWords(8).filter(w => AIDX[w.vi]);
  if (!ws.length) return;
  TY = { list: ws, i: 0, txt: '' };
  drawType();
  show('type', '타이핑', true);
}
function drawType() {
  const b = $('#typeBody'); b.textContent = '';
  if (TY.i >= TY.list.length) {
    const r = el('div', 'result');
    r.append(el('div', 'n', TY.list.length + '개'));
    r.append(el('div', null, '자판으로 친 단어는 철자까지 정확해집니다'));
    const hm = el('button', 'primary big', '홈으로'); hm.onclick = renderHome;
    hm.style.marginTop = '24px'; r.append(hm); b.append(r); return;
  }
  const w = TY.list[TY.i]; TY.txt = '';
  b.append(el('div', 'q', `${TY.i + 1} / ${TY.list.length} · 듣고 자판으로 쳐 보세요`));
  b.append(el('div', 'qmain', esc(w.ko)));
  const wrap = el('div', 'qplay');
  const p1 = el('button', 'primary', '듣기'); p1.onclick = () => play(w.vi, false);
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  // 디딤돌: 먼저 기억으로 쳐 보고, 막히면 글자를 보고 따라 친다.
  // 단 보고 친 성공은 복습 사다리를 올리지 않는다 — 기억에서 꺼낸 게 아니니까.
  let hinted = false;
  const p3 = el('button', 'ghost', '글자 보기');
  p3.onclick = () => {
    hinted = true; p3.disabled = true;
    wrap.after(el('div', 'hintvi', esc(w.vi)));
  };
  wrap.append(p1, p2, p3); b.append(wrap);
  play(w.vi, false);

  const out = el('div', 'dictans');
  const draw = () => { out.textContent = TY.txt || '· · ·'; };
  draw(); b.append(out);

  b.append(viKeypad(() => TY.txt, v => { TY.txt = v; draw(); }, () => {
    if (!TY.txt.trim()) return;
    const good = TY.txt.trim().toLowerCase() === w.vi.toLowerCase();
    S.stats.spellAll = (S.stats.spellAll || 0) + 1;
    if (good) S.stats.spellOk = (S.stats.spellOk || 0) + 1;
    fxTone(good);
    out.dataset.r = good ? 'ok' : 'no';
    if (!good) out.textContent = TY.txt.trim() + '  →  ' + w.vi;
    if (!good || !hinted) grade(w.vi, good);   // 보고 친 성공은 사다리에 반영 안 함
    setTimeout(() => { TY.i++; drawType(); }, good ? 600 : 1900);
  }));
  b.append(el('p', 'note', '실제 폰·컴퓨터의 베트남어 자판도 설정에서 추가하는 내장 기능입니다(다운로드 아님). ' +
    '둘 다 영어 자판에 텔렉스 규칙(aa→â, dd→đ, 낱말 끝 s→´ …)을 얹는 같은 방식이라, 여기서 익힌 글자 그대로 쓸 수 있습니다.'));
}

/* 지난 세트의 문장 — 단어만 반복하면 입이 문장까지 못 간다.
   최근 것만 주지 않고 오래된 것도 섞는다(오래 안 본 것일수록 다시 꺼낼 값어치가 크다). */
function pastSentences(n) {
  const done = ALL.filter(d => typeof d.day === 'number' && S.done[d.day] && d.dialog);
  if (!done.length) return [];
  const pick = [];
  const spots = [done.length - 1, 0, Math.floor(done.length / 2)];   // 최근·처음·중간 순
  for (const idx of spots) {
    const d = done[idx];
    const ls = (d.dialog.lines || []).filter(l => AIDX[l.vi]);
    if (!ls.length) continue;
    const l = ls[Math.floor(Math.random() * ls.length)];
    if (!pick.some(x => x.vi === l.vi))
      pick.push({ vi: l.vi, ko: l.ko, kr_read: l.kr_read, tones: l.tones, sent: true });
    if (pick.length >= n) break;
  }
  return pick;
}

/* ---------- 따라 말하기 연습 ---------- */
let SP = null;
function startSpeak() {
  const ws = practiceWords(6).filter(w => AIDX[w.vi]).concat(pastSentences(2));
  if (!ws.length) return;
  SP = { list: ws, i: 0 };
  drawSpeak();
  show('speak', '따라 말하기', true);
}
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
function startWrite() {
  const ws = practiceWords(6).filter(w => AIDX[w.vi]);
  if (!ws.length) return;
  WR = { list: ws, i: 0 };
  drawWrite();
  show('write', '손글씨', true);
}
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
  const p2 = el('button', 'ghost', '느리게 듣기'); p2.onclick = () => play(w.vi, true);
  wrap.append(p1, p2); b.append(wrap);
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
  if (aiReady()) {
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
                '읽어내려 하지 말고 **두 장을 견주어라.** 둘째가 첫째와 같은 낱말인가?\n\n' +
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
let CH = null;
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

function learnedVi() {
  const out = [];
  for (const d of ALL) {
    (d.words || []).forEach(w => out.push(w.vi));
    if (typeof d.day === 'number' && !S.done[d.day]) break;   // 오늘(진행 중인 날)까지만
  }
  return out;
}
const todayDay = () => ALL.find(d => typeof d.day === 'number' && !S.done[d.day]) || ALL[ALL.length - 1];

function chatSys(mode, myRole, day) {
  const t = day || todayDay();
  const dlg = (t.dialog?.lines || []).map(l => l.who + ': ' + l.vi).join(' / ');
  return '당신은 베트남어를 처음 배우는 한국인의 대화 상대다. 북부(하노이) 표준을 쓴다.\n' +
    '반드시 이 형식으로만 답한다. 다른 말은 붙이지 않는다:\n' +
    'VI: 베트남어 한 문장 (최대 7단어)\nKR: 그 발음의 한글 표기\nKO: 한국어 뜻\n' +
    '학습자의 베트남어에 성조나 단어 실수가 있으면 넷째 줄 "FIX: 짧은 교정"으로 알려준다.\n' +
    /* 어휘 정책 — 세 층으로 나눈다.
       ① 뼈대는 배운 말: 알아들어야 대화가 되고, 다시 만나야 복습이 된다.
       ② 한 마디에 새 단어 한둘: 지금 수준보다 아주 조금 위여야 는다(이해 가능한 입력).
          새 단어는 NEW 줄로 밝힌다 — 알아채지 못한 것은 배워지지 않는다.
       ③ 이따금 현지 표현: 책에 없는 줄임말·입말은 여기서만 만난다.
          정석을 먼저 주고 REAL 줄에 곁들인다 — 순서가 바뀌면 초보가 혼란스럽다. */
    '어휘는 이렇게 고른다:\n' +
    // 쉼표 대신 빈칸 하나 — 뜻은 그대로인데 이 줄이 가장 큰 덩어리라 14% 줄어든다
    ' · 뼈대는 학습자가 이미 배운 말로 쓴다: ' + learnedVi().join(' ') + '\n' +
    ' · 한 마디에 새 단어는 많아야 한둘만 섞는다. 섞었으면 "NEW: 단어=뜻" 줄을 덧붙인다.\n' +
    ' · 서너 마디에 한 번쯤, 같은 뜻을 현지 사람들이 실제로 쓰는 짧은 말·줄임말로도 알려준다:\n' +
    '   "REAL: 현지 표현 = 한국어 뜻" 줄로. 매번 붙이지는 마라.\n' +
    ' · NEW·REAL 은 없으면 그 줄을 아예 쓰지 않는다.\n' +
    '한 번에 한 문장. 쉬운 질문으로 대화를 이어간다.\n' +
    /* 한국어를 막지 않는다. 초보에게 '목표어만' 을 강요하면 할 말이 없어 대화가 끊긴다.
       대신 한국어로 쓴 그 말을 **베트남어로 어떻게 하는지 크게 돌려준다** —
       도피구가 아니라 발판이 되게. 알아채지 못한 것은 배워지지 않는다. */
    '학습자가 **한국어로 썼으면**, 그 말을 학습자가 베트남어로 어떻게 말했어야 하는지\n' +
    '   "SAY: 베트남어문장 | 한글발음" 줄로 반드시 덧붙인다. 베트남어로 썼으면 이 줄은 쓰지 않는다.\n' +
    (mode === 'today'
      ? `역할극: 오늘의 대화(${dlg})에서 학습자가 ${myRole} 역할, 당신이 ${myRole === 'A' ? 'B' : 'A'} 역할이다. ` +
        (myRole === 'B' ? '당신(A)의 첫 대사로 시작한다.' : '학습자(A)가 먼저 말하도록 짧게 유도한다.') +
        ' 대화가 이어지면 조금씩 넓힌다.'
      : '아주 쉬운 자유 대화. 인사로 시작한다.');
}

function bubble(cls, text) {
  const b = el('div', 'cb ' + cls);
  if (text != null) b.textContent = text;
  $('#chatLog').append(b);
  b.scrollIntoView({ block: 'end', behavior: 'smooth' });
  return b;
}

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
/* 선생님 목소리 방향 — 머리의 여/남 단추가 아니라 **선생님의 성별·지역**을 따른다.
   남자 선생님인데 여자 목소리가 나던 원인이 이것이었다. */
const tchDir = () => {
  const m = (S.tch || 'f') === 'm' ? 'm' : 'f';
  return S.region === 's' ? (m === 'm' ? 'sm' : 'sf') : m;
};
/* 폰마다 받는 길이 다르다 — 아이폰과 안드로이드를 구별해서 알려준다.
   (기종·버전마다 메뉴 이름이 조금씩 달라서 '비슷한 이름'이라고 밝혀 둔다) */
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function voiceHowTo() {
  return isIOS()
    ? '아이폰: 설정 → 손쉬운 사용 → 콘텐츠 말하기 → 음성 → 베트남어 추가\n' +
      '(안 보이면 설정 → 일반 → 언어 및 지역에서 베트남어를 넣고 다시 보세요)'
    : '안드로이드: 설정 → 일반(또는 시스템) → 언어 및 입력 → 음성 → 텍스트 음성 변환 → ' +
      '구글 TTS 설정 → 음성 데이터 설치 → 베트남어\n(기종마다 메뉴 이름이 조금 다릅니다)';
}

function speakVi(t, retry) {
  if (AIDX[t]) { play(t, false, tchDir()); return; }   // 우리 음원이 있으면 그게 낫다 (선생님 성별·지역으로)
  const u = new SpeechSynthesisUtterance(t);
  const vs = viVoices();
  const male = (S.tch || 'f') === 'm';
  // 폰마다 목소리 이름이 다르다 — 이름으로 남녀를 찾고, 못 찾으면 높낮이로 흉내 낸다
  const M = /male|nam\b|vim|minh|_m|-m\b/i, F = /female|linh|hoai|my|vif|_f|-f\b/i;
  const pick = vs.find(v => (male ? M : F).test(v.name || ''));
  if (pick) u.voice = pick;
  else if (vs.length) { u.voice = vs[0]; u.pitch = male ? .65 : 1.15; }
  if (pick && vs.length === 1) u.pitch = male ? .65 : 1.15;
  u.lang = 'vi-VN'; u.rate = .85;
  let started = false;
  u.onstart = () => { started = true; $('#tch').classList.add('talk'); };
  u.onend = u.onerror = () => $('#tch').classList.remove('talk');
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  // 크롬·사파리에서 첫 호출이 조용히 씹히는 일이 있다 — 안 시작하면 한 번만 다시
  if (!retry) setTimeout(() => { if (!started) speakVi(t, true); }, 450);
}

/* ---------- AI 선생님 캐릭터 ----------
   화면 속 선생님은 성적을 올리는 장치가 아니라 계속 쓰게 만드는 장치다
   (있기만 해도 동기가 오른다 — 페르소나 효과). 학습 효과 근거는 '말할 때
   움직일 때'만 있어서(체화 원리), 소리가 나는 동안만 입을 움직인다.
   그림 파일 없이 SVG라 몇 KB고, 이름으로 cô(여 선생님)·thầy(남 선생님) 호칭도 가르친다. */
function tchSvg() {
  const f = (S.tch || 'f') === 'f';
  const hair = f
    ? '<path d="M52 58 Q54 24 100 22 Q146 24 148 58 L148 112 Q140 118 136 106 L136 66 Q118 46 100 48 Q82 46 64 66 L64 106 Q60 118 52 112 Z" fill="#2d2438"/>'
    : '<path d="M54 62 Q52 26 100 24 Q148 26 146 62 L140 56 Q118 40 100 42 Q82 40 60 56 Z" fill="#33291f"/>';
  return `<svg viewBox="0 0 200 150" class="tchsvg">
    <ellipse cx="100" cy="152" rx="56" ry="26" fill="${f ? '#c94f6d' : '#3f6ea5'}"/>
    <path d="M74 134 Q100 120 126 134 L126 150 L74 150 Z" fill="${f ? '#e0607e' : '#4a7cb5'}"/>
    <circle cx="100" cy="74" r="42" fill="#f2c9a0"/>
    ${hair}
    <path d="M76 64 Q83 60 90 64" stroke="#241f1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M110 64 Q117 60 124 64" stroke="#241f1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <g class="teye"><circle cx="84" cy="76" r="4.6" fill="#241f1a"/><circle cx="116" cy="76" r="4.6" fill="#241f1a"/></g>
    <circle cx="72" cy="90" r="6" fill="#eba07c" opacity=".55"/>
    <circle cx="128" cy="90" r="6" fill="#eba07c" opacity=".55"/>
    <ellipse class="tmouth" cx="100" cy="98" rx="9" ry="4" fill="#a4543f"/>
  </svg>`;
}
function drawTch() {
  const p = $('#tch');
  p.hidden = false;
  const w = who(S.region === 's' ? 's' : 'n', S.tch || 'f');
  const im = new Image();               // 사진이 있으면 그림 대신 사진을 단다
  im.src = 'img/' + w.img + '.webp';
  im.alt = ''; im.className = 'tchface';
  im.onload = () => { const svg = p.querySelector('.tchsvg'); if (svg) svg.replaceWith(im); };
  p.innerHTML = tchSvg() + `<span class="tchname">${esc(w.name)} · ${esc(w.kr)}</span>`;
}

function aiBubble(text) {
  const m = {};
  text.split('\n').forEach(l => {
    const mt = l.match(/^\s*(VI|KR|KO|FIX|NEW|REAL|SAY)\s*:\s*(.+)/i);
    if (mt) { const k = mt[1].toUpperCase(); m[k] = m[k] ? m[k] + ' ' + mt[2].trim() : mt[2].trim(); }
  });
  const b = bubble('ai');
  if (!m.VI) { b.textContent = text.trim(); return; }
  b.append(el('div', 'cvi', esc(m.VI)));
  if (m.KR) b.append(el('div', 'ckr', '[' + esc(m.KR) + ']'));
  if (m.KO) b.append(el('div', 'cko', esc(m.KO)));
  if (m.FIX) b.append(el('div', 'cfix', '✎ ' + esc(m.FIX)));
  if (m.SAY) {                          // 한국어로 썼을 때 — 베트남어로는 이렇게
    const [vi, kr] = m.SAY.split('|').map(x => x.trim());
    const sb = el('div', 'csay');
    sb.append(el('span', 'csayh', '한국어로 쓰셨네요 — 베트남어로는'),
              el('b', null, esc(vi)));
    if (kr) sb.append(el('span', 'csaykr', '[' + esc(kr) + ']'));
    const pb = el('button', 'ghost sm', '들어보기');
    pb.onclick = () => speakVi(vi);
    sb.append(pb);
    b.append(sb);
  }
  if (m.NEW) b.append(el('div', 'cnew', '＋ 새 단어 · ' + esc(m.NEW)));
  if (m.REAL) b.append(el('div', 'creal', '💬 현지에서는 · ' + esc(m.REAL)));
  speakVi(m.VI);                       // 오면 바로 읽어준다 (입도 같이 움직인다)
  const bt = el('button', 'ghost sm', '다시 듣기');
  bt.onclick = () => speakVi(m.VI);
  b.append(bt);
  // VOICES 가 null 이면 아직 목록을 못 받은 것이다 — 그때는 없다고 단정하지 않는다
  if (!AIDX[m.VI] && VOICES && !viVoice() && !S.novoice) {   // 한 번만 알린다
    S.novoice = 1; save();
    bubble('note wide', '이 폰에는 베트남어 목소리가 없어 이 문장은 소리가 안 납니다.\n' + voiceHowTo());
  }
  b.scrollIntoView({ block: 'end', behavior: 'smooth' });
}

async function chatSend(userText) {
  if (userText) { CH.hist.push({ role: 'user', parts: [{ text: userText }] }); bubble('me', userText);
                  if (CH.room) save(); }
  const wait = bubble('ai wait', '…');
  try {
    const text = await gCall({
      system_instruction: { parts: [{ text: CH.sys }] },
      contents: CH.hist.slice(-12),          // 최근 12마디만 보낸다 (무료 한도 아끼기)
      // 답은 최대 일곱 줄(VI/KR/KO/FIX/NEW/REAL/SAY)이라 320 이면 넉넉하다.
      // 800 은 닿을 일이 없고, 모델이 한 번 폭주하면 그 값이 그대로 청구된다(나온 토큰이 여덟 배 비싸다).
      generationConfig: { maxOutputTokens: 320, temperature: .6, thinkingConfig: { thinkingBudget: 0 } }
    }, i => { wait.textContent = `붐빕니다 — 다시 시도 중 (${i + 2}/3)…`; });
    CH.hist.push({ role: 'model', parts: [{ text }] });
    if (CH.room) { if (CH.hist.length > 40) CH.hist.splice(0, CH.hist.length - 40); save(); }
    wait.remove();
    aiBubble(text);
  } catch (e) {
    wait.remove();
    bubble('ai err', '⚠ ' + (e.message || '연결 실패'));
  }
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
/* 두벌식 — 실제 한글 자판과 같은 자리 */
const KOROWS = [
  ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
  ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
  ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'],
];
const KOSHIFT = { 'ㅂ':'ㅃ','ㅈ':'ㅉ','ㄷ':'ㄸ','ㄱ':'ㄲ','ㅅ':'ㅆ','ㅐ':'ㅒ','ㅔ':'ㅖ' };
const NUMROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['-','/',':',';','(',')','₫','&','@','"'],
  ['.',',','?','!','\'','%','+'],
];


/* ── 자판 쓰는 법 ────────────────────────────────────────────────
   베트남 자판에는 성조 글쇠가 없다. 글자를 다 치고 **열쇠 글자**를 뒤에 붙인다(텔렉스).
   베트남 사람 대다수가 이렇게 친다 — 우리 자판도 똑같이 만들었다. */
const TLXHELP = [
  ['성조 여섯', [['(그대로)', 'ma', 'ma', '평평하게'], ['f', 'maf', 'mà', '낮게 내려감'],
                 ['s', 'mas', 'má', '짧게 올라감'], ['r', 'mar', 'mả', '내렸다 올림'],
                 ['x', 'max', 'mã', '흔들며 올림'], ['j', 'maj', 'mạ', '뚝 떨어짐']]],
  ['모자 일곱', [['aa', 'aa', 'â', ''], ['aw', 'aw', 'ă', ''], ['ee', 'ee', 'ê', ''],
                 ['oo', 'oo', 'ô', ''], ['ow', 'ow', 'ơ', ''], ['uw', 'uw', 'ư', ''],
                 ['dd', 'dd', 'đ', '']]],
];
function kbGuide() {
  const b = $('#rulesBody');
  b.textContent = '';
  b.append(el('h2', null, '자판 쓰는 법'));
  b.append(el('p', 'lede', '베트남 자판에는 <b>성조 글쇠가 없습니다.</b> 글자를 다 치고 ' +
    '<b>열쇠 글자</b>를 뒤에 붙이면 부호가 얹힙니다. 베트남 사람 대다수가 이렇게 칩니다(텔렉스).'));
  const demo = el('div', 'kbdemo');
  demo.innerHTML = '<b>chao</b> 치고 <b>f</b> → <b class="big">chào</b>' +
                   '<br><b>chi</b> 치고 <b>j</b> → <b class="big">chị</b>' +
                   '<br><b>com</b> 치고 <b>ow</b> → <b class="big">cơm</b>';
  b.append(demo);
  TLXHELP.forEach(([title, rows]) => {
    b.append(el('div', 'grp', title));
    const t = el('div', 'kbtab');
    rows.forEach(([k, typed, made, ko]) => {
      const r = el('div', 'kbtr');
      r.append(el('span', 'kbk', esc(k)), el('span', 'kbt', esc(typed) + ' →'),
               el('span', 'kbm', esc(made)), el('span', 'kbko', esc(ko)));
      const say = el('button', 'ibtn slow', ICON.slow);
      say.type = 'button'; say.title = '들어 보기';
      say.onclick = () => speakVi(made);
      r.append(say);
      t.append(r);
    });
    b.append(t);
  });
  b.append(el('p', 'note', '부호를 지우려면 <b>z</b> 를 칩니다. 같은 열쇠를 한 번 더 치면 되돌아갑니다 ' +
    '— <b>chaof</b> 를 한 번 더 치면 <b>chaof</b> 그대로 남습니다.'));
  b.append(el('p', 'note', '숫자와 기호는 자판의 <b>123</b>, 한글은 <b>베/한</b> 을 누르세요.'));
  show('rules', '자판 쓰는 법', true);
}

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
/* 낱말 뒤에 ch 를 쳤을 때 텔렉스가 만드는 낱말. 바꿀 것이 없으면 null. */
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
  /* w 는 바로 앞 글자가 아니라 **낱말의 모음 덩어리**를 찾아간다 — 진짜 텔렉스가 그렇다.
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
     낱말 안에서 같은 밑글자를 뒤에서부터 찾아 모자를 씌운다. 진짜 텔렉스가 그렇다. */
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

/* ── 한글 조합 ────────────────────────────────────────────────
   낱자를 눌러 글자를 만든다. ㄱ+ㅏ+ㅁ → 감. 실제 자판이 하는 일을 그대로 한다. */
const HCHO  = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const HJUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const HJONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const VJOIN = { 'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ' };
const CJOIN = { 'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ',
                'ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ' };
const CSPLIT = Object.fromEntries(Object.entries(CJOIN).map(([k, v]) => [v, [k[0], k[1]]]));
const isV = c => HJUNG.includes(c);
let HG = null;                                     // 조합 중인 글자 {cho,jung,jong}

const hgChar = h => {
  if (!h) return '';
  if (!h.jung) return h.cho || '';
  const a = HCHO.indexOf(h.cho), b = HJUNG.indexOf(h.jung), c = HJONG.indexOf(h.jong || ' ');
  if (a < 0 || b < 0) return (h.cho || '') + h.jung + (h.jong || '');
  return String.fromCharCode(0xAC00 + (a * 21 + b) * 28 + (c < 0 ? 0 : c));
};

function drawChatTone() {
  const bar = $('#chatTone');
  if (bar.dataset.on) return;                      // 한 번만 그린다
  bar.dataset.on = '1';
  const inp = $('#chatText');

  /* 커서 자리 다루기 */
  const at = () => inp.selectionStart ?? inp.value.length;
  const put = t => {
    const a = at(), b = inp.selectionEnd ?? a;
    inp.value = inp.value.slice(0, a) + t + inp.value.slice(b);
    const c = a + t.length; inp.setSelectionRange(c, c);
  };
  const back = () => {
    const a = at(), b = inp.selectionEnd ?? a;
    if (b > a) { inp.value = inp.value.slice(0, a) + inp.value.slice(b); inp.setSelectionRange(a, a); return; }
    if (!a) return;
    inp.value = inp.value.slice(0, a - 1) + inp.value.slice(a);
    inp.setSelectionRange(a - 1, a - 1);
  };
  /* 조합 중인 글자를 화면에 반영 — 앞 글자를 지우고 새 글자를 놓는다 */
  const paint = (had, now) => { if (had) back(); if (now) put(now); };
  const hgDone = () => { HG = null; };

  /* 한글 낱자 하나 */
  const hgKey = j => {
    const had = hgChar(HG);
    if (!HG) { HG = isV(j) ? { cho: '', jung: j, jong: '' } : { cho: j, jung: '', jong: '' };
               paint(had, hgChar(HG)); return; }
    if (isV(j)) {
      if (HG.jong) {                               // 받침이 다음 글자의 첫소리로 넘어간다 (감+ㅏ → 가마)
        const jo = HG.jong, sp = CSPLIT[jo];
        const keep = sp ? sp[0] : '', move = sp ? sp[1] : jo;
        HG.jong = keep;
        const left = hgChar(HG);
        HG = { cho: move, jung: j, jong: '' };
        paint(had, left + hgChar(HG));
        return;
      }
      if (HG.jung) {                               // 겹모음 (ㅗ+ㅏ → ㅘ)
        const v = VJOIN[HG.jung + j];
        if (v) { HG.jung = v; paint(had, hgChar(HG)); return; }
        hgDone(); HG = { cho: '', jung: j, jong: '' }; paint(0, hgChar(HG)); return;
      }
      HG.jung = j; paint(had, hgChar(HG)); return;
    }
    // 자음
    if (HG.jung && !HG.jong && HJONG.includes(j)) { HG.jong = j; paint(had, hgChar(HG)); return; }
    if (HG.jung && HG.jong) {                      // 겹받침 (ㄹ+ㄱ → ㄺ)
      const c = CJOIN[HG.jong + j];
      if (c) { HG.jong = c; paint(had, hgChar(HG)); return; }
    }
    hgDone(); HG = { cho: j, jung: '', jong: '' }; paint(0, j);
  };

  /* 누름은 pointerdown 하나로 끝낸다.
     touchstart 에서 preventDefault 를 하면 아이폰이 click 을 아예 만들지 않아
     글쇠를 눌러도 아무것도 입력되지 않았다. 그리고 pointerdown 으로 처리하면
     자판처럼 즉각 반응하고, 빠르게 두 번 눌러도 화면이 확대되지 않는다. */
  /* 누른 것이 **보여야** 자판이다: 손가락이 글쇠를 가리니
     ① 글쇠 위로 풍선을 띄워 방금 누른 글자를 보여주고 ② 눌림 색을 주고
     ③ 진동을 울린다(안드로이드만 — 아이폰 웹은 진동을 막아 둔 것이라 우리가 못 연다). */
  const key = (label, fn, cls) => {
    const k = el('button', 'tk' + (cls ? ' ' + cls : ''), label);
    k.type = 'button';
    k.addEventListener('pointerdown', e => {
      e.preventDefault();                       // 입력칸이 포커스를 잃지 않게
      try { navigator.vibrate && navigator.vibrate(8); } catch (x) { }
      k.classList.add('hit');
      if (label.length <= 2) {                  // 글자 글쇠만 풍선 (space·베/한 은 뺀다)
        const pop = el('i', 'kpop', label);
        k.append(pop);
        setTimeout(() => pop.remove(), 260);
      }
      setTimeout(() => k.classList.remove('hit'), 140);
      fn(); chatGrow(); inp.focus({ preventScroll: true });
    });
    k.addEventListener('click', e => e.preventDefault());
    return k;
  };
  const row = cls => { const r = el('div', 'kbrow ' + cls); bar.append(r); return r; };
  const letters = (rows, cls, tap) => rows.forEach((chars, n) => {
    const r = row(cls + ' r' + n);
    if (n === 2) r.append(key('⇧', () => { KBUP = KBUP ? 0 : 1; bar.classList.toggle('caps', !!KBUP); }, 'wide shift'));
    chars.forEach(c => r.append(key(c, () => tap(c), 'let')));
    if (n === 2) r.append(key('⌫', () => { hgDone(); back(); }, 'wide del'));
  });

  /* 성조 글쇠는 두지 않는다 — 진짜 베트남 자판에는 없다. 텔렉스로 친다. */

  // ② 베트남어 글자 · ③ 한글 낱자 · ④ 숫자와 기호
  /* 베트남어 글쇠 — 텔렉스로 친다 */
  letters(KBROWS, 'vi', c => {
    const ch = KBUP ? c.toUpperCase() : c;
    const a = at(), head = inp.value.slice(0, a);
    const cut = Math.max(head.lastIndexOf(' '), head.lastIndexOf('\n')) + 1;
    const word = head.slice(cut);
    const made = telex(word, ch);
    if (made === null) put(ch);
    else {
      inp.value = head.slice(0, cut) + made + inp.value.slice(a);
      const p = cut + made.length; inp.setSelectionRange(p, p);
    }
    if (KBUP) { KBUP = 0; bar.classList.remove('caps'); }
  });
  letters(KOROWS, 'ko', c => { hgKey(KBUP && KOSHIFT[c] ? KOSHIFT[c] : c);
                               if (KBUP) { KBUP = 0; bar.classList.remove('caps'); } });
  letters(NUMROWS, 'num', c => { hgDone(); put(c); });

  // ⑤ 아래 줄
  const r3 = row('foot');
  r3.append(key('베/한', kbSwap, 'wide lang'));
  r3.append(key('123', () => { bar.classList.toggle('num'); }, 'wide numk'));
  r3.append(key('space', () => { hgDone(); put(' '); }, 'space'));
  r3.append(key('.', () => { hgDone(); put('.'); }, 'punc'));
  r3.append(key('⌨', kbNative, 'wide natk'));
  r3.append(key('▾', () => { hgDone(); kbShow(false); inp.blur(); }, 'wide down'));

  // 폰 자판을 쓰는 동안 보이는 한 줄 — 돌아오는 문
  const rn = row('nat');
  rn.append(key('ă  화면 자판으로', kbVirt, 'toviet'));
  kbPaint();
}

/* 폰에 깔린 진짜 자판으로 — 햅틱도 있고 손에 익어 좋다.
   다만 웹은 폰 자판의 **언어를 못 바꾼다.** 베트남어 자판(텔렉스 내장)을
   설정에서 한 번 추가해야 하고, 그 안내를 딱 한 번 띄운다. */
function kbNative() {
  S.kbnat = 1; save();
  const inp = $('#chatText');
  inp.removeAttribute('inputmode');
  kbShow(true);
  inp.blur(); setTimeout(() => inp.focus({ preventScroll: true }), 0);
  if (!S.natTip) {
    S.natTip = 1; save();
    popup('<b>폰의 베트남어 자판을 한 번만 추가해 주세요.</b><br>' +
      (isIOS()
        ? '아이폰: 설정 → 일반 → 키보드 → 키보드 → 새로운 키보드 추가 → <b>베트남어</b> (Telex 선택)'
        : '안드로이드: Gboard(자판) 설정 → 언어 → <b>베트남어</b> 추가 (Telex 선택)') +
      '<br>그다음 자판의 <b>🌐 지구본</b> 키로 바꿔 씁니다.<br>' +
      '성조는 우리 자판과 똑같이 <b>chao+f → chào</b> 식으로 칩니다.');
  }
}
function kbVirt() {
  S.kbnat = 0; save();
  const inp = $('#chatText');
  inp.setAttribute('inputmode', 'none');
  inp.blur();
  kbShow(true);
  inp.focus({ preventScroll: true });
}
let KBUP = 0;

/* 지금 어느 자판인지 화면에 반영한다 */
function kbPaint() {
  const bar = $('#chatTone'), inp = $('#chatText');
  if (!bar || !bar.dataset.on) return;
  const vi = S.chatvi !== 0;
  bar.classList.toggle('koma', !vi);
  inp.setAttribute('lang', vi ? 'vi' : 'ko');
  inp.placeholder = vi ? 'Tiếng Việt…' : '한국어로 써도 됩니다…';
}
function kbSwap() { S.chatvi = S.chatvi === 0 ? 1 : 0; save(); HG = null; kbPaint(); }

function kbShow(on) {
  const bar = $('#chatTone');
  if (!bar) return;
  drawChatTone();
  const nat = !!S.kbnat;                              // 폰 자판을 쓰기로 한 사람
  bar.classList.toggle('up', !!on);
  bar.classList.toggle('natmode', nat);
  if (nat) $('#chatText').removeAttribute('inputmode');
  else $('#chatText').setAttribute('inputmode', 'none');   // 우리 자판일 때만 폰 자판을 막는다
  kbPaint();
  if (!on) HG = null;
}
/* 대화 내용을 누르면 자판이 내려간다. 입력칸을 누르면 다시 올라온다(폰이 알아서 한다). */
$('#chatLog').addEventListener('pointerdown', e => {
  if (!e.target.closest('button, a, input, textarea')) { kbShow(false); $('#chatText').blur(); }
});
/* 가로로 긴 입력칸을 누르면 **우리 자판**이 올라온다. 폰 자판은 [한] 을 눌러야 나온다. */
/* 가로로 긴 입력칸을 누르면 화면 자판이 올라온다. 폰 자판은 뜨지 않는다. */
$('#chatText').addEventListener('pointerdown', () => {
  $('#chatText').setAttribute('inputmode', 'none');   // 눌리기 전에 막아야 폰 자판이 안 뜬다
  kbShow(true);
});
$('#chatText').addEventListener('focus', () => kbShow(true));

/* 입력칸은 글이 길어지면 세로로 자란다 — 한 줄에 가려 뭘 썼는지 안 보이면 고칠 수가 없다.
   최대 다섯 줄까지 늘고 그 뒤로는 칸 안에서 스크롤된다. */
function chatGrow() {
  const t = $('#chatText');
  t.parentElement.dataset.v = t.value;   // 틀이 이 글의 키만큼 늘어난다 (높이는 css가 정한다)
}
$('#chatText').addEventListener('input', chatGrow);
$('#chatText').addEventListener('keydown', e => {          // 컴퓨터 자판: 엔터는 보내기, 시프트+엔터는 줄바꿈
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chatForm').requestSubmit(); }
});

function startChat() {
  CH = null;
  if (!aiReady()) {
    $('#chatLog').textContent = ''; $('#chatForm').hidden = true; $('#tch').hidden = true;
    renderChatKey(); show('chat', 'AI 대화', true); return;
  }
  renderRooms();
}

function renderChatKey() {
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';
  s.append(el('p', 'lede', 'AI와 베트남어로 대화하려면 <b>구글 무료 키</b>가 한 번 필요합니다.<br>' +
    '카드 등록 없음 · 하루 수백 마디 무료 · 키는 이 폰에만 저장됩니다.'));
  const ol = el('ol', 'keysteps');
  ['구글 계정으로 <b>aistudio.google.com/apikey</b> 에 들어간다',
   '<b>Create API key</b> 버튼을 누른다',
   '나온 긴 글자를 복사해 아래에 붙여넣는다'].forEach(t => ol.append(el('li', null, t)));
  s.append(ol);
  const inp = el('input', 'keyin'); inp.type = 'password'; inp.placeholder = 'AIza… 로 시작하는 키';
  const b = el('button', 'primary big', '저장하고 시작');
  b.onclick = () => {
    const v = inp.value.trim();
    if (v.length < 20) { alert('키가 너무 짧습니다. 전체를 복사해 주세요.'); return; }
    S.gkey = v; save(); renderRooms();
  };
  s.append(inp, b);
  s.append(el('p', 'note', '대화 내용은 구글 서버로 전송됩니다. 개인정보(실명 전체·주소·사번)는 쓰지 마세요.'));
}

/* 대화방 — 지역×성별로 넷. 나가도 지난 대화가 남는다(카톡처럼).
   방마다 선생님이 다르니 말투도 소리도 달라진다. 방 비우기로 처음부터 다시 할 수 있다. */
const ROOMS = [['n', 'f'], ['n', 'm'], ['s', 'f'], ['s', 'm']];
/* 이름은 베트남에서 실제로 가장 흔한 것들에서 골랐다 (forebears 통계 기준).
   Linh 2위·75%가 여자 · Tuấn 5위·94%가 남자 · Thảo 13위·84%가 여자 · Huy 14위·92%가 남자.
   북부/남부로 이름이 갈리는 통계는 못 찾았다 — 흔한 이름 넷을 지역에 나눠 붙였다. */
const PEOPLE = {
  nf: { name: 'Thùy Linh', kr: '투이 린', img: 'tch-nf' },
  nm: { name: 'Anh Tuấn',  kr: '아인 뚜언', img: 'tch-nm' },
  sf: { name: 'Ngọc Thảo', kr: '응옥 타오', img: 'tch-sf' },
  sm: { name: 'Quang Huy', kr: '꽝 후이', img: 'tch-sm' },
};
const roomKey = (rg, tc) => rg + tc;
const who = (rg, tc) => PEOPLE[roomKey(rg, tc)] || PEOPLE.nf;
const roomName = (rg, tc) => who(rg, tc).name;
/* 하루 넘게 조용하면 먼저 말을 걸어 둔다 — 다음에 앱을 열면 메시지가 와 있다.
   폰 알림까지는 아직 아니다(그건 푸시 서버가 따로 있어야 한다). 앱 안에서 보이는 데까지다. */
const PING = {
  nf: ['Chào bạn! Hôm nay bạn khỏe không?', 'Bạn đã ăn cơm chưa?', 'Lâu rồi không gặp!'],
  nm: ['Chào bạn! Hôm nay bạn làm gì?', 'Bạn đang bận không?', 'Hôm nay trời đẹp nhỉ!'],
  sf: ['Chào bạn! Bạn khỏe không?', 'Bạn ăn gì chưa?', 'Hôm nay bạn thế nào?'],
  sm: ['Chào bạn! Bạn có rảnh không?', 'Dạo này bạn sao rồi?', 'Hôm nay bạn đi làm à?'],
};
const PINGKO = {
  'Chào bạn! Hôm nay bạn khỏe không?': '안녕! 오늘 잘 지내?',
  'Bạn đã ăn cơm chưa?': '밥은 먹었어?',
  'Lâu rồi không gặp!': '오랜만이야!',
  'Chào bạn! Hôm nay bạn làm gì?': '안녕! 오늘 뭐 해?',
  'Bạn đang bận không?': '지금 바빠?',
  'Hôm nay trời đẹp nhỉ!': '오늘 날씨 좋다, 그치?',
  'Chào bạn! Bạn khỏe không?': '안녕! 잘 지내?',
  'Bạn ăn gì chưa?': '뭐 좀 먹었어?',
  'Hôm nay bạn thế nào?': '오늘 어때?',
  'Chào bạn! Bạn có rảnh không?': '안녕! 시간 있어?',
  'Dạo này bạn sao rồi?': '요즘 어떻게 지내?',
  'Hôm nay bạn đi làm à?': '오늘 일하러 가?',
};
/* 복습할 때가 된 문장이 있으면 **그 문장으로** 말을 건다.
   그러면 메신저가 곧 문장 복습이 된다 — 따로 '문장 복습'을 누르러 갈 필요가 없다.
   꺼낼 문장이 없는 날에는 그냥 인사말. */
function dueSentence() {
  const d = dueWords().map(findItem).filter(x => x && x.sent);
  return d.length ? d[0] : null;
}
function pingRooms() {
  if (!S.room) return;
  let sent = false;
  Object.entries(S.room).forEach(([k, r]) => {
    if (!r.hist || !r.hist.length) return;                 // 한 번도 안 연 방은 건드리지 않는다
    if (r.unread) return;
    if (r.at && Date.now() - r.at < DAY) return;           // 하루는 기다린다
    const q = dueSentence();
    let vi, ko;
    if (q && !sent) { vi = q.vi; ko = q.ko; }              // 복습 문장은 한 방에만
    else { const list = PING[k] || PING.nf;
           vi = list[Math.floor(Math.random() * list.length)]; ko = PINGKO[vi] || ''; }
    r.hist.push({ role: 'model', parts: [{ text: 'VI: ' + vi + '\nKO: ' + ko }] });
    r.unread = (r.unread || 0) + 1;
    r.at = Date.now();
    sent = true;
  });
  if (sent) save();
}

/* 일주일이 지난 대화는 저절로 지워진다 — 손으로 비울 일이 없게. */
function sweepRooms() {
  const cut = Date.now() - 7 * DAY;
  let hit = 0;
  Object.values(S.room || {}).forEach(r => {
    if (r.at && r.at < cut && r.hist.length) { r.hist = []; r.at = 0; hit++; }
  });
  if (hit) save();
}
function roomOf(k) { S.room = S.room || {}; return (S.room[k] = S.room[k] || { hist: [] }); }
function renderRooms() {
  const s = $('#chatSetup');
  s.hidden = false; s.textContent = '';
  $('#chatLog').textContent = '';
  $('#chatForm').hidden = true;
  $('#chatTone').hidden = true;
  $('#tch').hidden = true;
  sweepRooms();
  ROOMS.forEach(([rg, tc]) => {
    const k = roomKey(rg, tc), r = (S.room || {})[k], p = who(rg, tc);
    const last = r && r.hist.length
      ? (r.hist[r.hist.length - 1].parts || []).map(x => x.text || '').join('')
          .split('\n')[0].replace(/^VI:\s*/, '') : '';
    const btn = el('button', 'msgrow');
    const av = el('span', 'msgav');
    const im = new Image();
    im.src = 'img/' + p.img + '.webp'; im.alt = '';
    im.onload = () => { av.textContent = ''; av.append(im); };
    av.textContent = p.name[0];
    const mid = el('span', 'msgmid');
    mid.append(el('b', null, esc(p.name) + '  <i>' + (rg === 's' ? '남부' : '북부') + '</i>'),
               el('span', 'msglast', esc(last ? last.slice(0, 34) : '대화를 시작해 보세요')));
    btn.append(av, mid);
    if (r && r.unread) btn.append(el('span', 'msgbadge', String(r.unread)));
    btn.onclick = () => { dive(renderRooms); openRoom(rg, tc); };
    s.append(btn);
  });
  drawMateRows(s);
  show('chat', '메신저', true);
}

/* 쌤 넷 밑에 같은 동아리 사람들을 잇대어 붙인다 — 메신저 하나로 다 되게. */
function drawMateRows(s) {
  const head = el('div', 'phead');
  head.append(el('strong', null, '동아리 사람들'));
  s.append(head);
  if (!S.club) {
    const go = el('button', 'bigmenu');
    go.append(el('b', null, '동아리에 들어가기'),
              el('span', 'msub', '같은 동아리 사람끼리 엄지척과 쪽지를 주고받습니다'));
    go.onclick = () => { dive(renderRooms); showClub(); };
    s.append(go);
    return;
  }
  const wait = el('p', 'note', '불러오는 중…');
  s.append(wait);
  const paint = () => {
    wait.remove();
    /* 같은 별명이 기기 두 대로 들어오면 두 줄로 떴다 — 별명으로 걸러 하나만 남긴다 */
    const seen = {};
    ((MATES || {}).people || []).filter(x => x.uid !== myUid())
      .forEach(m => { const k = m.nick; if (!seen[k] || (m.td || 0) > (seen[k].td || 0)) seen[k] = m; });
    const list = Object.values(seen);
    if (!list.length) { s.append(el('p', 'note', '아직 다른 사람이 없습니다.')); return; }
    list.forEach(m => {
      const btn = el('button', 'msgrow');
      btn.append(faceEl(m.uid, 'row'));
      const mid = el('span', 'msgmid');
      mid.append(el('b', null, esc(m.nick) + '  <i>연속 ' + m.st + '일</i>'),
                 el('span', 'msglast', `모두 ${m.td}일 · 외운 단어 ${m.memo} · 엄지 ${m.th}`));
      btn.append(mid);
      if (mateNew(m)) btn.append(el('span', 'msgbadge', '새'));
      // 메신저답게 누르면 **바로 쪽지방**으로 — 프로필은 쪽지방 위의 이름을 누르면 나온다
      btn.onclick = () => { dive(renderRooms); openDm(m.uid); };
      s.append(btn);
    });
  };
  if (MATES) paint();
  mateSync().then(paint).catch(() => { wait.textContent = '사람 목록을 불러오지 못했습니다.'; });
}
function openRoom(rg, tc) {
  S.region = rg; S.tch = tc; save(); drawRegion();
  const k = roomKey(rg, tc), r = roomOf(k);
  S.stats.chat = (S.stats.chat || 0) + 1; touchToday(); save();
  $('#chatSetup').hidden = true;
  $('#chatForm').hidden = false;
  $('#chatTone').hidden = false; drawChatTone();
  $('#chatMic').hidden = false;
  drawTch();
  $('#chatLog').textContent = '';
  CH = { mode: 'free', room: k, sys: chatSys('free'), hist: r.hist };
  // 지난 대화를 다시 그린다
  r.hist.forEach(m => {
    const t = (m.parts || []).map(x => x.text || '').join('');
    if (!t) return;
    if (m.role === 'user') { if (t !== '(대화를 시작해 주세요)') bubble('me', t); }
    else aiBubble(t);
  });
  r.unread = 0; r.at = Date.now(); save();     // 들어오면 읽음 · 마지막 시각 기록
  const pickBtn = el('button', 'ghost sm pickline', '배운 문장으로 말 걸기');
  pickBtn.onclick = () => pickLine(rg, tc);
  $('#chatLog').prepend(pickBtn);
  if (!r.hist.length) {
    CH.hist.push({ role: 'user', parts: [{ text: '(대화를 시작해 주세요)' }] });
    chatSend(null);
  }
  show('chat', roomName(rg, tc), true);
}

/* 배운 문장 아무거나 골라 그 문장으로 말을 건다 — 복습 때가 안 됐어도 언제든.
   위에는 오늘 꺼낼 때가 된 문장을 먼저 올린다. */
function pickLine(rg, tc) {
  const b = $('#subBody');
  b.textContent = '';
  const due = new Set(dueWords());
  const all = [...allSents(), ...lessonSents()]
    .filter(x => x.vi && S.srs[x.vi])                       // 배운 문장만
    .sort((a, c) => (due.has(c.vi) ? 1 : 0) - (due.has(a.vi) ? 1 : 0));
  if (!all.length) {
    b.append(el('p', 'lede', '아직 배운 문장이 없습니다'));
    b.append(el('p', 'note', '하루 학습을 한 세트 끝내면 그날 대화 문장이 여기에 들어옵니다.'));
    show('sub', '문장 고르기', true); return;
  }
  b.append(el('p', 'note', '고른 문장으로 상대가 말을 겁니다. <b>·</b> 표가 붙은 것은 오늘 꺼낼 때가 된 문장입니다.'));
  all.slice(0, 60).forEach(x => {
    const btn = el('button', 'bigmenu');
    btn.append(el('b', null, (due.has(x.vi) ? '· ' : '') + esc(x.vi)),
               el('span', 'msub', esc(x.ko || '')));
    btn.onclick = () => { NAV.pop(); startLineTalk(rg, tc, x); };
    b.append(btn);
  });
  dive(() => openRoom(rg, tc));
  show('sub', '문장 고르기', true);
}
function startLineTalk(rg, tc, x) {
  const r = roomOf(roomKey(rg, tc));
  r.hist.push({ role: 'model', parts: [{ text: 'VI: ' + x.vi + '\nKO: ' + (x.ko || '') }] });
  r.at = Date.now(); r.unread = 0; save();
  openRoom(rg, tc);
}


function beginChat(mode, myRole, day) {
  S.stats.chat = (S.stats.chat || 0) + 1; touchToday(); save();
  $('#chatSetup').hidden = true;
  $('#chatForm').hidden = false;
  $('#chatTone').hidden = false; drawChatTone();
  $('#chatMic').hidden = false;
  drawTch();
  CH = { mode, sys: chatSys(mode, myRole, day), hist: [{ role: 'user', parts: [{ text: '(대화를 시작해 주세요)' }] }] };
  chatSend(null);
}

/* 복습 [대화] — 끝낸 세트의 문장으로 AI 선생님과 역할극 (오늘 것뿐 아니라 지난 것도) */

/* 말로 대화 — 녹음한 말을 AI가 받아 적어 그대로 보낸다 (타자 없이 입으로) */
let MIC = null;
$('#chatMic').onclick = async () => {
  if (!CH) return;
  const btn = $('#chatMic');
  if (MIC) { MIC.stop(); return; }
  if (!canRecord()) { bubble('ai err', '⚠ 이 기기에서는 녹음이 안 됩니다'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    MIC = new MediaRecorder(stream);
    MIC.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    MIC.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      MIC = null;
      btn.classList.remove('rec'); btn.disabled = true;
      const url = URL.createObjectURL(new Blob(chunks));
      try {
        const b64 = await recToWav(url);
        const heard = await gCall({
          contents: [{ role: 'user', parts: [
            { text: '녹음은 한국인이 베트남어를 말한 것이다. 들린 대로 <베트남어 철자>로만 적어라. ' +
                    '한글이나 영어로 적지 마라. 설명·따옴표 없이 문장만 적어라.' },
            { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
          generationConfig: { maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } }
        });
        const inp = $('#chatText');
        inp.value = heard;                       // 바로 보내지 않는다 — 고쳐 쓸 기회를 준다
        chatGrow();
        inp.focus({ preventScroll: true });
        const w = findItem(heard) || allWords().find(x => x.vi.toLowerCase() === heard.toLowerCase());
        bubble('note wide', '글자로는 이렇게 들렸습니다: ' + stripTone(heard) + (w ? ' — ' + w.ko : '') +
          '\n맞으면 보내기, 다르면 고쳐서 보내세요.');
      } catch (e) { bubble('ai err', '⚠ ' + (e.message || '듣기 실패')); }
      URL.revokeObjectURL(url);
      btn.disabled = false;
    };
    MIC.start();
    btn.classList.add('rec');
    setTimeout(() => { if (MIC && MIC.state === 'recording') MIC.stop(); }, 7000);   // 메신저는 문장이라 7초
  } catch (e) { bubble('ai err', '⚠ 마이크를 쓸 수 없습니다. 브라우저 설정에서 허용해 주세요'); }
};

/* 사진 보며 대화 — 폰 카메라로 찍은 사진을 줄여서(512px) 대화에 붙인다.
   실시간 영상은 무료 한도로 무리지만, 사진 한 장씩은 같은 무료 호출에 들어간다. */
/* 사진 보내기는 뺐다 — AI 몫을 크게 먹는데(사진 한 장이 낱말 채점 두 번 값) 학습에 꼭 필요하진 않다 */

/* ---------- 시작 ---------- */
/* 뒤로가기 — 한 단계씩. 전에는 어디서 눌러도 홈으로 튀어서,
   복습 안에서 방식만 바꾸려 해도 처음부터 다시 들어가야 했다. */
$('#back').onclick = () => { const f = NAV.pop(); (f || renderHome)(); };
$('#goMe').onclick = renderAwards;
$('#goChat').onclick = () => { dive(renderHome); startChat(); };
/* 머리 메신저 단추 — 안 읽은 것이 있으면 빨간 점. 진짜 메신저처럼 어디서나 보인다 */
function drawChatDot() {
  const n = Object.values(S.room || {}).reduce((a, r) => a + (r.unread || 0), 0)
          + (((MATES || {}).people) || []).filter(mateNew).length;
  $('#goChat').querySelector('.chatdot').hidden = !n;
}

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
  const c = (city === 'n' || city === 's') ? city : (S.region === 's' ? 's' : 'n');
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
function showGuide() {
  const b = $('#guideBody');
  b.textContent = '';
  const sec = (icon, title, lines) => {
    const c = el('div', 'gsec');
    c.append(el('div', 'ghead', `<span>${icon}</span>${title}`));
    const ul = el('ul');
    lines.forEach(t => { const li = el('li'); li.innerHTML = t; ul.append(li); });
    c.append(ul);
    b.append(c);
  };

  sec('🕐', '하루 5분', [
    '홈 맨 위 <b>오늘 학습</b>을 누르세요. 그날 할 것이 바로 열립니다.',
    '<b>단어 10 → 확인 문제 → 오늘의 대화</b> 순서로 저절로 이어집니다.',
    '<b>오늘 복습</b>이 떠 있으면 같이 하세요. <b>실력은 여기서 나옵니다.</b>',
  ]);

  sec('📱', '화면', [
    '<b>🕐 시각·날씨</b> 왼쪽 위 · <b>💬 메신저</b> · <b>👤 내 정보</b> 오른쪽 위',
    '<b>북부 | 남부</b> · <b>여 | 남</b> — 소리를 바꿔 듣습니다',
    '베트남어 글자를 <b>누르면 소리</b>가 납니다. 🕐 느리게 · 🎤 따라 말하기',
  ]);

  sec('🎤', '말하기 채점', [
    '녹음하면 <b>내 높낮이가 실시간으로 그려집니다.</b> 낱말 3.5초 · 문장 7초',
    '<b>발음</b>은 AI가 받아 적어서, <b>높낮이</b>는 곡선으로 따로 봅니다.',
    '<b>애매하면 틀렸다고 하지 않습니다</b> — "가려내기 어렵습니다"라고 합니다.',
  ]);

  sec('✍️', '쓰기 채점', [
    '<b>손글씨</b>는 AI가 정답 글씨와 나란히 놓고 견줍니다 — 글자·성조·모자를 따로.',
    '<b>자판</b>은 성조 부호까지 정확히 칩니다. 틀리면 되돌릴 수 있습니다.',
  ]);

  sec('👥', '함께 하기', [
    '<b>메신저</b> — 쌤 넷(북남·남녀)과 <b>동아리 사람들</b>에게 쪽지·엄지척',
    '<b>동아리</b> — 이번 주 누가 며칠 나왔는지 서로 보입니다. 하나만 들어갑니다.',
    '<b>기사</b> — 어제 베트남 소식 다섯 꼭지. 외우는 자리가 아니라 스치는 자리입니다.',
  ]);

  sec('💾', '진도 지키기', [
    '<b>진도 → 진도 백업</b>을 가끔 눌러 두세요. 폰을 바꾸거나 브라우저가 저장소를 비울 때 대비입니다.',
  ]);

  // ── 왜 이렇게 만들었나 ──────────────────────────────
  b.append(el('div', 'gwhy', '왜 이렇게 만들었나'));
  const why = (n, t, d) => {
    const c = el('div', 'grow');
    c.append(el('b', 'gnum', n), el('div', 'gtxt', '<b>' + t + '</b><br>' + d));
    b.append(c);
  };
  why('254', '몰아서 하지 않고 <b>나눠서</b> 합니다',
      '연구 254편·관찰 14,000건을 모아 보니 나눠서 하는 쪽이 늘 나았습니다. 복습 간격은 <b>1·3·7·14·30·60일</b>입니다. <span class="gsrc">Cepeda 2006</span>');
  why('49<span>%</span>', '복습은 <b>한 묶음으로 통째</b> 돕니다',
      '카드를 잘게 쪼개 여러 바퀴 돈 쪽은 36%, 큰 묶음 한 바퀴 돈 쪽은 49%가 남았습니다. 그런데 참가자 <b>72%는 쪼개는 쪽을 골랐습니다</b> — 그래서 쪼개기 기능은 일부러 안 만들었습니다. <span class="gsrc">Kornell 2009</span>');
  why('4', '<b>네 목소리</b>로 듣습니다',
      '한 사람 소리만 들으면 그 사람 소리만 알아듣게 됩니다. 여러 사람으로 익히면 <b>처음 듣는 사람 말도 알아듣습니다</b>(78.1%→85.9%). 북부·남부 × 남·여 네 목소리를 씁니다. <span class="gsrc">Logan·Lively·Pisoni 1991</span>');
  why('1,151', '성조 판정을 <b>원어민 소리로 맞췄습니다</b>',
      '원어민 음성 1,151개를 재서 본보기를 만들었습니다. 맞히는 비율 <b>87%</b>. 확신이 없으면 판정을 미뤄, 제대로 낸 발음을 틀렸다고 하는 일이 <b>13.2%에서 1.4%로</b> 줄었습니다. <span class="gsrc">직접 측정</span>');
  why('g=.61', '<b>말을 걸어 주는 상대</b>가 있습니다',
      'AI와 대화하는 것이 언어 학습에 중간~큰 효과가 있다는 메타분석이 있습니다. 특히 <b>듣기·말하기</b>에서 큽니다. 쌤은 배운 말을 뼈대로 쓰고, 새 말은 한 마디에 한둘만 섞습니다. <span class="gsrc">Lyu 2025 · Wang 2025</span>');
  why('✍️', '손으로 <b>쓰게</b> 합니다',
      '손으로 쓴 낱말이 타자로 친 낱말보다 잘 남습니다. 제2언어 글자는 <b>써 본 쪽이 더 잘 알아봅니다.</b> 자판 연습은 성조 부호 위치를 익히려고 따로 둡니다. <span class="gsrc">Longcamp 외</span>');
  why('🖼️', '낱말마다 <b>그림</b>을 답니다',
      '글자만 있을 때보다 그림이 함께 있을 때 더 잘 떠오릅니다(그림 우월 효과·이중부호화). 개수·국기·달력처럼 <b>AI가 늘 틀리는 것은 손으로 그렸습니다.</b> <span class="gsrc">Paivio · Childers 1984</span>');
  why('50~70<span>%</span>', '<b>한자어</b>를 짚어 줍니다',
      '베트남어 낱말의 절반 넘게가 한자에서 왔습니다. 한국어와 소리가 닮은 것이 많아 우리에게 유리합니다 — <b>quản lý(관리) · an toàn(안전) · điện thoại(전화)</b>. 카드에 🔑 표로 알려 드립니다. <span class="gsrc">Sino-Vietnamese</span>');
  why('94', '<b>주제별로</b> 묶었습니다',
      '교재들이 장소·상황으로 묶는 방식을 따랐습니다 — 첫 인사 · 숫자 · 시장 · 식당 · 길 · 아플 때. 일상 40 + 직무 54세트, 낱말 940개. 억지로 늘린 8세트는 덜어냈습니다. <span class="gsrc">Colloquial Vietnamese 외</span>');
  why('5', '<b>공장에서 쓰는 말</b>이 따로 있습니다',
      '안전 · 불량 · 근태 · 지시하기 · 급여명세 · 근로계약 · 비자. 업종(봉제·전자·사무)을 골라 필요한 것만 봅니다. 표지에는 문화 이야기 <b>59장</b>이 붙습니다. <span class="gsrc">현장 어휘</span>');

  b.append(el('p', 'gfoot',
    '출처 · Cepeda, Pashler, Vul, Wixted &amp; Rohrer (2006) <i>Psychological Bulletin</i> 132, 354–380 · ' +
    'Kornell (2009) <i>Applied Cognitive Psychology</i> · ' +
    'Logan, Lively &amp; Pisoni (1991) <i>JASA</i> · ' +
    'Lyu (2025) <i>Int. J. Applied Linguistics</i> · Wang 외 (2025) <i>Review of Educational Research</i> · ' +
    'Longcamp 외 · Roediger &amp; Karpicke (2006) · Paivio 이중부호화 · Childers &amp; Houston (1984)<br>' +
    '성조 판정 수치는 이 앱이 원어민 음성 1,151개를 직접 재서 얻은 것입니다.'));

  show('guide', '사용법', true);
}

/* 베트남 문화 — 학습 카드와 같은 방식으로 한 장씩 넘기며 본다 */
const CULTURE = [
  { e: '🙇', t: '호칭이 예의의 절반', b: '나이를 물어보는 건 실례가 아니라 <b>당신을 뭐라고 부를지 정하려는 것</b>입니다.<br>' +
      '<b>anh</b>(아인) 손위 남자 = 형·오빠 · <b>chị</b>(찌) 손위 여자 = 누나·언니 · <b>em</b>(앰) 손아래 = 동생.<br>' +
      '이 셋만 제대로 써도 예의 바른 사람이 됩니다.' },
  { e: '📛', t: '이름은 뒤에서 부른다', b: '베트남 이름은 <b>성 + 가운데 이름 + 끝 이름</b> 순서입니다(예: Nguyễn Văn Hùng).<br>' +
      '부를 때는 성이 아니라 <b>끝 이름</b>을 씁니다 — "Anh Hùng"처럼 호칭 뒤에 끝 이름을 붙입니다.' },
  { e: '🤲', t: '두 손으로', b: '물건·서류·명함을 주고받을 때 <b>두 손</b>을 쓰면 공손하게 봅니다. 한 손이면 다른 손을 팔에 살짝 대는 것도 같은 뜻입니다.' },
  { e: '🍻', t: '회식과 건배', b: '건배할 때 <b>Một, hai, ba, dô!</b>(못 하이 바, 요! — 하나 둘 셋, 야!)를 외칩니다.<br>' +
      '잔을 부딪칠 때 손윗사람보다 <b>잔을 살짝 낮게</b> 대면 좋아합니다. 회식 뒤 노래방(karaoke)으로 이어지는 일이 흔합니다.' },
  { e: '😴', t: '점심 후 낮잠', b: '많은 공장·사무실이 점심 뒤 <b>불을 끄고 30분쯤</b> 낮잠을 잡니다(<b>ngủ trưa</b> 응우 쯔어). 바닥에 돗자리와 베개를 펴는 곳도 흔합니다.<br>' +
      '더운 낮을 피해 쉬던 농사 시절의 습관이 남은 것입니다. 놀라지 말고 같이 쉬면 됩니다.' },
  { e: '☕', t: '커피의 나라', b: '연유를 넣은 진한 <b>cà phê sữa đá</b>(까 페 스어 다 — 아이스 연유 커피)가 국민 음료입니다.<br>' +
      '베트남은 세계 손꼽히는 커피 생산국이고, 커피숍에 오래 앉아 있는 것이 일상 문화입니다.' },
  { e: '🍵', t: '차부터 한 잔', b: '사무실이나 집에 손님이 오면 먼저 <b>차(trà)</b>를 냅니다. 거절하지 말고 한 모금이라도 마시는 것이 예의입니다.' },
  { e: '🧧', t: '설(Tết)이 일 년의 중심', b: '음력 설 전후로 <b>나라가 멈춥니다</b>. 법정 휴일은 <b>5일</b>이고 주말이 붙어 더 길어집니다.<br>' +
      '이른바 <b>13월 월급</b>은 <b>법으로 정해진 것이 아니라 관례</b>입니다 — 노동법에 의무 규정이 없고, 회사 내부 규정이나 단체협약에 적혀 있으면 그때 지킬 의무가 생깁니다.<br>' +
      '아이·손아래에게 세뱃돈 <b>lì xì</b>(리 씨)를 붉은 봉투에 담아 줍니다.' }, 
  { e: '🇻🇳', t: '쉬는 날', b: '법정 공휴일은 <b>1/1 · 음력 설(5일) · 훙왕 기일(음력 3/10) · 4/30 통일기념일 · 5/1 노동절 · 9/2 국경일(2일)</b>로, 2026년 기준 <b>모두 11일</b>입니다(노동법 112조).<br>' +
      '설 연휴가 가장 길고, 4/30~5/1은 붙여서 쉽니다. 주말이 겹치면 대체 휴일이 붙습니다.' },
  { e: '💵', t: '돈 다루기', b: '지폐 단위가 커서 <b>0의 개수</b>를 봐야 합니다. 색이 닮은 짝이 둘 있습니다 — <b>2만 동과 50만 동</b>(둘 다 파랑), <b>1만 동과 20만 동</b>. 스물다섯 배 차이라 낼 때 한 번 더 봐야 합니다.<br>' +
      '시장은 흥정이 자연스럽지만, 마트·편의점은 정찰제입니다.' },
  { e: '🚫', t: '하지 않는 것이 좋은 일', b: '어른의 <b>머리를 만지지 않기</b>, 밥에 <b>젓가락을 꽂지 않기</b>(제사 상 연상), 사람을 <b>손가락으로 가리키지 않기</b>.<br>' +
      '국가·지도자에 대한 험담은 <b>법적 문제</b>가 될 수 있으니 하지 않는 편이 안전합니다.' },
  { e: '🏠', t: '가족이 먼저', b: '월급의 상당 부분을 고향 가족에게 보내는 일이 흔합니다. 명절에 고향 가는 것을 아주 중요하게 여깁니다.<br>' +
      '가족·고향 이야기를 물어보면 마음이 빨리 열립니다.' },
  { e: '👟', t: '신발과 집', b: '집에 들어갈 때는 <b>신발을 벗습니다</b>. 식당·가게는 신은 채로 들어갑니다.' },
  { e: '🌦️', t: '북부는 사계절, 남부는 두 계절', b: '하노이는 봄(흐리고 이슬비)·여름(무덥고 소나기)·가을(맑고 선선)·겨울(15도 안팎, <b>난방이 없어</b> 체감은 더 춥다)이 있습니다.<br>' +
      '호찌민은 연중 27도 안팎에 <b>우기(5~10월)와 건기(11~4월)</b>뿐입니다.' },
  { e: '⚽', t: '축구 — 여기서는 국민 스포츠', b: '현지 조사기업 <b>Adtima</b>의 시장조사에서 <b>축구 85%</b>로 압도적 1위였습니다(테니스 15% · 배구 12% · 수영 12%). ' +
      '축구를 좋아한다는 <b>85% 가운데 3분의 1</b>은 관련 기사를 다 챙겨보는 열성 팬이었습니다. 여기서 축구는 <b>킹 스포츠</b>라 불립니다.<br>' +
      '<b>국가대표</b> 별명은 <b>황금 별 전사</b>(Những chiến binh sao vàng)입니다. ' +
      '2018년 <b>박항서 감독</b>이 U-23 아시아선수권 준우승과 아세안선수권 우승을 이끌면서 열기가 폭발했습니다 — ' +
      '그 뒤로 한국 사람에게 축구는 <b>가장 확실한 말문 트기</b>입니다.<br>' +
      '국내 리그는 <b>V리그 1</b>(하노이 FC·비엣텔·HAGL 등).<br>' +
      '저녁이면 동네 <b>인조잔디 구장(sân cỏ nhân tạo)</b>이 사람으로 찹니다. 5인제·7인제로 돈을 걷어 구장을 빌려 뜁니다 — ' +
      '<b>같이 뛰자고 하면 거의 거절하지 않습니다.</b>' },
  { e: '👩‍🏭', t: '공장에서 만날 사람들', b: '베트남 노동조합 연구원 조사에서 공장 근로자 <b>평균 나이 31.2세</b>였습니다. ' +
      '<b>전자는 26.9세</b>, <b>봉제·신발은 29.5세</b>로 더 젊습니다.<br>' +
      '섬유·의류는 일하는 사람의 <b>약 74~75%가 여성</b>이고, 대부분 시골에서 온 사람들입니다. ' +
      '한 회사에 머무는 기간은 평균 <b>6~7년</b>입니다.<br>' +
      '20~30대 한국인이 중간관리자로 가면 <b>나와 비슷하거나 어린 여성 작업자</b>가 대다수입니다 — ' +
      '<b>em</b>으로 부르되 함부로 대하지 않는 것이 시작입니다.' },
  { e: '🍜', t: '아침은 밖에서 사 먹는다', b: '길가 가게에서 쌀국수(<b>phở</b> 퍼)나 바게트 샌드위치(<b>bánh mì</b> 반 미)로 아침을 때우는 것이 흔합니다.<br>' +
      '점심도 회사 식당이나 도시락(<b>cơm hộp</b> 껌 홉)으로 빨리 먹고 낮잠을 잡니다.<br>' +
      '아침에 "밥 먹었어요?"(<b>Ăn sáng chưa?</b>)는 인사말에 가깝습니다 — 진짜 묻는 게 아닐 때가 많습니다.' },
  { e: '🍫', t: '한국 라면을 이미 먹고 있다', b: '베트남은 <b>1인당 라면 소비량이 세계에서 손꼽히는 나라</b>이고, 수입 면 제품 중 <b>한국산이 절반 이상</b>을 차지합니다(2022년 52.3%).<br>' +
      '짜장라면과 매운 볶음면이 특히 인기입니다. 한국 식품은 베트남에서 <b>우리 농식품 수출 4위 시장</b>일 만큼 자리를 잡았습니다.<br>' +
      '작업자들과 말문을 트기에 <b>라면 이야기</b>만 한 것이 없습니다.' },
  { e: '🚫', t: '설 첫날에 하지 않는 것', b: '설 첫날(<b>mùng 1</b>)에는 <b>비질과 쓰레기 버리기</b>를 피합니다 — 복을 쓸어 내보낸다고 봅니다(사흘째까지 지키기도 합니다).<br>' +
      '<b>돈을 빌리거나 빌려주는 것</b>, <b>불과 물을 남에게 주는 것</b>도 피합니다. 재물이 새 나간다는 뜻입니다.<br>' +
      '첫 손님이 한 해 운을 정한다는 <b>xông đất</b>(쏭 덧) 풍습이 있어, 상중인 사람은 남의 집에 먼저 들어가지 않습니다.<br>' +
      '<b>믿고 안 믿고를 떠나 그날은 그냥 맞춰 주는 것</b>이 편합니다.' },
  { e: '🎬', t: '한국 것을 이미 알고 있다', b: '한 조사에서 <b>68%</b>가 한국 드라마·영화를 좋아한다고, <b>51%</b>가 K팝을 좋아한다고 답했습니다.<br>' +
      '1990년대 말 한국 드라마가 들어간 뒤로 삼십 년 가까이 이어진 흐름입니다. <b>한국에서 왔다</b>는 것만으로 말이 붙는 일이 흔합니다.<br>' +
      '다만 "한국 게 더 낫다"는 식으로 견주는 말은 하지 않는 편이 좋습니다.' },
  { e: '💬', t: '잘로가 여기의 카톡', b: '베트남 사람 열에 여덟이 <b>Zalo</b>(잘로)를 씁니다 — 2024년 월 이용자 <b>7,780만 명</b>, 하루 오가는 말이 <b>21억 건</b>입니다.<br>' +
      '카카오톡·라인·위챗이 다 들어왔다가 물러났고 잘로만 남았습니다. 회사 공지도, 반장 연락도, 식당 예약도 잘로로 옵니다.<br>' +
      '유심을 사면 <b>잘로부터 깔고 번호를 등록</b>하는 것이 첫 일입니다.' },
  { e: '🙋', t: '못 알아들었다고 말해도 된다', b: '초보가 한 번에 알아듣는 일은 없습니다. 되묻는 것은 무례가 아닙니다.<br>' +
      '<b>Xin lỗi, nói chậm lại.</b>(씬 로이, 노이 짬 라이 — 죄송해요, 천천히 말해 주세요)<br>' +
      '<b>Dạ?</b>(자?) 한 마디면 "네?" 가 됩니다. 남부에서는 <b>dạ</b> 를 문장 앞에 붙이기만 해도 말이 공손해집니다.' },
  { e: '🎨', t: '붉은색과 흰색', b: '<b>붉은색</b>은 복과 기쁨입니다 — 결혼식도, 설 세뱃돈 봉투(<b>lì xì</b>)도 붉은색입니다.<br>' +
      '<b>흰색</b>은 상(喪)의 색입니다. 장례에서 흰 두건과 흰 상복을 씁니다.<br>' +
      '그래서 축의금을 <b>흰 봉투</b>에 넣지 않습니다. 결혼식에 갈 때 온통 흰옷·검은옷도 피하는 편이 좋습니다.' },
  { e: '💊', t: '약국이 먼저, 그다음 병원', b: '약국(<b>nhà thuốc</b> 냐 투옥)에서 처방전 없이 살 수 있는 약이 많습니다. 감기·배탈 정도는 약국에서 해결하는 것이 보통입니다.<br>' +
      '다만 <b>항생제는 법으로는 처방이 필요한데</b> 실제로는 그냥 파는 곳이 많습니다. 베트남은 <b>항생제 내성률이 세계에서 높은 축</b>에 듭니다 — 스스로 항생제를 골라 먹지 마세요.<br>' +
      '열이 사흘 넘게 가거나 배가 심하게 아프면 약국이 아니라 병원(<b>bệnh viện</b>)으로 갑니다.' },
  { e: '📄', t: '노동허가서가 먼저다', b: '외국인이 <b>3개월 넘게</b> 일하려면 <b>노동허가서(giấy phép lao động)</b>가 있어야 합니다. 유효기간은 최대 <b>2년</b>이고, 더 일하려면 다시 받습니다.<br>' +
      '신청은 <b>회사가</b> 합니다. 본인이 준비할 것은 대개 <b>범죄경력회보서</b>(3개월 이내 발급 → 한국에서 공증 → 영사확인 → 베트남어 번역공증)와 <b>베트남 병원의 건강검진서</b>입니다.<br>' +
      '서류 한 장이 빠지면 몇 주가 밀립니다 — 출국 전에 회사에 목록을 받아 두세요.' },
  { e: '💴', t: '월급에서 빠지는 것', b: '베트남의 사회보험은 회사와 본인이 나눠 냅니다. 합쳐서 급여의 <b>32%</b>이고, 그중 <b>본인 몫은 10.5%</b>입니다.<br>' +
      '본인 부담 = <b>연금·유족 8% + 의료보험 1.5% + 실업보험 1%</b>.<br>' +
      '회사 몫은 21.5%입니다(연금 14 · 상병출산 3 · 산재 0.5 · 의료 3 · 실업 1).<br>' +
      '급여명세에 <b>BHXH · BHYT · BHTN</b> 이라고 적혀 나오는 것이 이 셋입니다.' },
  { e: '📈', t: '최저임금은 지역마다 다르다', b: '베트남은 나라를 <b>1~4지역</b>으로 나눠 최저임금을 따로 정합니다. 하노이·호찌민 도심이 1지역, 시골이 4지역입니다.<br>' +
      '<b>2026년 1월 1일부터</b>(시행령 293/2025/ND-CP) 월 최저임금은 <b>1지역 531만 동 · 2지역 473만 동 · 3지역 414만 동 · 4지역 370만 동</b>입니다 — 평균 7.2% 올랐습니다.<br>' +
      '같은 회사라도 공장이 어느 지역에 있느냐로 기준이 달라집니다.' },
  { e: '🌴', t: '연차와 잔업에는 한도가 있다', b: '한 회사에서 <b>12개월</b>을 채우면 <b>연차 12일</b>이 생깁니다(힘들거나 위험한 일은 14일·16일).<br>' +
      '잔업은 <b>한 달 30시간 · 한 해 200시간</b>을 넘길 수 없습니다. 정부가 정한 특별한 경우에만 <b>한 해 300시간</b>까지입니다.<br>' +
      '한국식으로 "오늘 좀 더 하자"를 이어 붙이면 법을 넘깁니다 — 라인을 맡으면 이 숫자를 먼저 외워 두세요.' },
  { e: '🤝', t: '지적은 따로, 칭찬은 여럿 앞에서', b: '여러 사람 앞에서 이름을 부르며 나무라면, 일보다 <b>얼굴이 상한 것</b>이 먼저 남습니다. 베트남 진출 기업 안내서들이 공통으로 말리는 일입니다.<br>' +
      '잘못은 <b>따로 불러</b> 조용히, 잘한 일은 <b>사람들 앞에서</b> 짚어 주는 편이 라인이 잘 돕니다.<br>' +
      '목소리를 높이면 이겼다고 보지 않고 <b>자기를 다스리지 못한다</b>고 봅니다.' },
  { e: '🏠', t: '주소는 골목까지 읽는다', b: '베트남 주소는 큰길에서 <b>골목으로 파고드는</b> 순서로 적습니다.<br>' +
      '<b>số 12, ngõ 5, đường Nguyễn Trãi</b> = 응우옌짜이 <b>길</b>의 5번 <b>골목</b> 안 12번지.<br>' +
      '북부는 골목을 <b>ngõ</b>(응오), 남부는 <b>hẻm</b>(햄)이라 합니다. 골목 안에 또 골목이 있으면 <b>12/5</b> 처럼 빗금으로 적습니다.<br>' +
      '택시·배달에 주소를 부를 때 이 순서대로 말하면 한 번에 통합니다.' },
  { e: '🪔', t: '가게 앞의 작은 제단', b: '가게·사무실 바닥 구석에 작은 <b>제단</b>이 놓이고 아침마다 향을 피우는 것을 보게 됩니다. 장사가 잘되게 비는 <b>재물신(Thần Tài)</b> 자리입니다.<br>' +
      '과일·꽃·물이 놓여 있으면 <b>건드리지도 넘어가지도 않습니다</b>. 발로 가리키는 것도 피합니다.<br>' +
      '믿음을 묻지 말고 그냥 비켜 가면 됩니다.' },
  { e: '📅', t: '달력이 두 개 돈다', b: '베트남 달력에는 양력 밑에 <b>음력(âm lịch)</b>이 같이 적혀 있습니다.<br>' +
      '설(<b>Tết</b>)·제사(<b>giỗ</b>)·보름(<b>rằm</b>)은 모두 음력으로 셉니다. 매달 <b>1일과 15일</b>에 향을 피우고 절에 가는 사람이 많습니다.<br>' +
      '"다음 달 언제 쉬냐"는 물음에 음력 날짜가 나오면 놀라지 마세요 — 두 달력이 같이 돕니다.' },
  { e: '🏡', t: '고향(quê)을 묻는다', b: '처음 만나면 나이 다음으로 <b>고향</b>을 묻습니다. <b>Quê anh ở đâu?</b>(꾸에 아인 어 더우 — 고향이 어디예요?)<br>' +
      '공장 사람들 대다수가 시골에서 도시로 온 사람들이라, 고향은 곧 <b>그 사람 이야기의 시작</b>입니다.<br>' +
      '고향 이야기를 물어보면 말문이 빨리 트입니다. 설에 고향에 가는 일을 아주 중요하게 여깁니다.' },
  { e: '🍚', t: '먼저 권하고 먹는다', b: '밥상에서 어른보다 먼저 수저를 들지 않습니다. 먹기 전에 <b>Mời</b>(머이 — 드세요)로 권합니다.<br>' +
      '<b>Mời anh ăn cơm.</b>(머이 아인 안 껌 — 형님, 드세요) 한 마디면 예의가 갖춰집니다.<br>' +
      '반찬은 가운데 두고 나눠 먹습니다. 밥에 <b>젓가락을 꽂지 않습니다</b> — 제사 상을 떠올리게 합니다.' },
  { e: '🦺', t: '안전은 서류가 아니라 습관', b: '베트남 노동법은 <b>안전보건 교육</b>을 회사의 의무로 정하고 있습니다. 그런데 더운 날 안전모·마스크가 벗겨지는 것이 현장의 현실입니다.<br>' +
      '중간관리자가 <b>먼저 쓰고 다니는 것</b>이 백 번 말하는 것보다 빠릅니다.<br>' +
      '<b>Cẩn thận!</b>(껀 턴 — 조심해요!) · <b>Nguy hiểm!</b>(응위 히엠 — 위험해요!) 두 마디는 첫날 외워 두세요.' },
  { e: '🔢', t: '점과 쉼표가 우리와 반대', b: '베트남은 <b>천 단위에 점(.)</b>, <b>소수점에 쉼표(,)</b>를 씁니다.<br>' +
      '<b>1.000</b> = 천 · <b>1.000.000</b> = 백만 · <b>1,5</b> = 1.5 · <b>0,75</b> = 0.75<br>' +
      '수량표·납기표를 잘못 읽으면 천 배가 틀립니다. 숫자를 받으면 <b>점인지 쉼표인지</b> 한 번 더 봅니다.' },
  { e: '📆', t: '날짜는 일 / 월 / 년', b: '베트남은 <b>일 / 월 / 년</b> 순서로 적습니다 — <b>22/08/2026</b> 은 2026년 <b>8월 22일</b>입니다.<br>' +
      '한국은 년/월/일이라 <b>08/09</b> 를 8월 9일로 읽기 쉬운데, 여기서는 <b>9월 8일</b>입니다.<br>' +
      '납기·검사일처럼 숫자만 적힌 날짜는 <b>월을 소리 내어 확인</b>하고 넘기는 것이 안전합니다.' },
  { e: '🔌', t: '220V, 플러그는 그대로', b: '베트남 전압은 한국과 같은 <b>220V</b>이고 둥근 구멍 콘센트라 <b>한국 플러그가 대개 그대로 들어갑니다</b>.<br>' +
      '다만 <b>주파수가 50Hz</b>로 한국(60Hz)과 다릅니다. 어댑터에 <b>50/60Hz</b> 라고 적혀 있으면 괜찮습니다.<br>' +
      '모터가 도는 기계는 50Hz에서 조금 느리게 돕니다 — 설비 이야기를 할 때 걸리는 대목입니다.' },
  { e: '🕐', t: '한국보다 두 시간 느리다', b: '베트남은 <b>UTC+7</b>, 한국은 UTC+9 — <b>두 시간</b> 차이입니다. 서머타임은 없습니다.<br>' +
      '한국 오전 <b>9시</b> = 베트남 오전 <b>7시</b>. 한국 본사가 퇴근할 때 여기는 아직 오후입니다.<br>' +
      '보고 시각을 정할 때 "한국 시각으로"인지 "여기 시각으로"인지 <b>반드시 붙여 말합니다</b>.' },
  { e: '🐟', t: '세는 말이 따로 있다', b: '베트남어는 개수를 셀 때 <b>물건에 맞는 세는 말</b>을 넣습니다 — 한국어의 "한 <b>마리</b>·한 <b>장</b>"과 같습니다.<br>' +
      '<b>cái</b>(까이) 보통 물건 · <b>con</b>(꼰) 동물 · <b>chiếc</b>(찌엑) 한 짝·탈것 · <b>quả/trái</b>(꽈/짜이) 과일 · <b>tờ</b>(떠) 종이<br>' +
      '<b>hai con cá</b> = 물고기 두 마리 · <b>ba cái ghế</b> = 의자 세 개.<br>' +
      '모르겠으면 일단 <b>cái</b> 를 쓰면 대개 통합니다.' },
  { e: '🗣️', t: '남과 북 — 말도 결도 다릅니다', b: '<b>왜 다른가</b> · 나라가 <b>1,650km</b>나 길어 옛날에는 오가기가 어려웠습니다. ' +
      '남쪽 땅은 원래 <b>참파·크메르</b>의 땅이었고 베트남 사람이 남쪽으로 내려가며 뒤늦게 합쳐진 곳입니다. ' +
      '여기에 수백 년의 분열과 프랑스 지배, <b>남북 분단(1954~1975)</b>이 겹쳐 소리와 말이 갈렸습니다.<br>' +
      '<b>글은 완전히 같습니다.</b> 다른 것은 소리와 몇몇 낱말입니다 — 아빠 <b>bố</b>(북)/<b>ba</b>(남) · 네 <b>vâng</b>/<b>dạ</b> · 숟가락 <b>thìa</b>/<b>muỗng</b>. ' +
      '남부는 <b>hỏi와 ngã를 잘 안 가릅니다</b>.<br>' +
      '<b>결도 다릅니다</b> · 북부는 전통·격식·서열을 중히 여기고, 남부는 장사에 밝고 개방적이라고들 합니다(통계가 아니라 통설입니다).<br>' +
      '<b>다만 한국의 지역감정만큼 첨예하지는 않습니다.</b> 어느 쪽이 낫다는 말은 하지 마세요. ' +
      '특히 <b>전쟁 이야기</b>는 남부에 가족사가 얽힌 사람이 있습니다. 사람을 출신 지역으로 묶어 판단하지도 마세요.' },
  { e: '🗓️', t: '주말에 뭐 하나', b: '베트남 노동법이 정한 기본 근로시간은 <b>하루 8시간 · 주 48시간</b>입니다. 국가가 주 40시간을 권장할 뿐 강제하지 않아서, ' +
      '<b>공장은 토요일까지 엿새 일하는 곳이 흔합니다.</b> "주말"이 하루뿐인 사람이 많다는 뜻입니다.<br>' +
      '쉬는 날에는 <b>카페에 오래 앉아 있기</b>, 가족·고향 사람들과 밥 먹기, 축구 보기가 흔합니다. 젊은 사람은 <b>틱톡</b>과 <b>노래방</b>을 많이 합니다.<br>' +
      '"주말에 뭐 했어요?"(<b>Cuối tuần bạn làm gì?</b>)는 월요일 아침의 안전한 말문 트기입니다.' },
  { e: '📱', t: '폰에 뭐가 깔려 있나', b: '여기서 하루가 돌아가는 앱들입니다 — 이것만 깔면 말이 서툴러도 살 수 있습니다.<br>' +
      '· <b>메신저</b> <b>Zalo</b>(잘로). 개인·회사 연락이 다 여기로 옵니다.<br>' +
      '· <b>SNS</b> <b>페이스북</b>과 <b>틱톡</b>. 가게 홍보도 페이스북 페이지로 합니다.<br>' +
      '· <b>이동·배달</b> <b>Grab</b>(그랩) · <b>Be</b>(베) · <b>ShopeeFood</b>(쇼피푸드).<br>' +
      '· <b>결제</b> <b>MoMo</b>(모모) · <b>ZaloPay</b> · <b>VNPay</b>.<br>' +
      '· <b>쇼핑</b> <b>Shopee</b>(쇼피)가 가장 크고 <b>TikTok Shop</b>이 가장 빨리 크고 있습니다.<br>' +
      '도착한 날 <b>유심 → 잘로 → 그랩</b> 순서로 깔면 그날부터 움직일 수 있습니다.' },
  { e: '💳', t: '현금 대신 QR', b: '전자지갑이 아주 널리 쓰입니다. <b>MoMo</b>(모모)가 이용자 <b>3,100만 명</b> 남짓으로 가장 크고, <b>ZaloPay</b>·<b>VNPay</b> 가 뒤를 잇습니다.<br>' +
      '길가 국수집·과일 노점에도 <b>QR 종이</b>가 붙어 있어 폰으로 찍어 보냅니다.<br>' +
      '다만 <b>현금도 여전히 많이</b> 씁니다 — 잔돈(1만·2만 동)을 늘 조금 갖고 다니는 편이 편합니다.' },
  { e: '🙏', t: '존댓말 대신 호칭과 ạ', b: '베트남어에는 한국어 같은 <b>존댓말 어미가 따로 없습니다.</b> 대신 두 가지로 예의를 표시합니다.<br>' +
      '① <b>호칭</b> — anh·chị·em 을 문장 안에 넣습니다. <b>Cảm ơn anh.</b>(형님, 고맙습니다)<br>' +
      '② 문장 끝의 <b>ạ</b>(아) — 붙이기만 하면 공손해집니다. <b>Vâng ạ. / Cảm ơn chị ạ.</b><br>' +
      '남부에서는 앞에 <b>dạ</b>(자)를 붙입니다. <b>Dạ, cảm ơn anh.</b><br>' +
      '이 두 글자가 한국어의 "-요/-습니다" 자리를 대신합니다.' },
  { e: '🎒', t: '도착한 첫 주에 할 일', b: '· <b>거주 신고(tạm trú)</b> — 외국인은 머무는 곳을 관할 공안에 신고해야 합니다. <b>원칙은 도착 24시간 안</b>이고, 보통 <b>집주인이나 호텔이 대신</b> 해 줍니다. 빠뜨리면 <b>최대 500만 동</b> 벌금이 나올 수 있으니 집주인에게 "했느냐"고 꼭 물어보세요.<br>' +
      '· <b>유심</b>과 <b>잘로</b> 등록 · <b>그랩</b> 설치<br>' +
      '· <b>노동허가서</b> 서류를 회사에 확인<br>' +
      '· <b>생수통</b> 배달 시켜 두기<br>' +
      '· 회사 근처 <b>병원</b> 이름과 위치 알아 두기' },
  { e: '🏦', t: '은행 — 계좌부터 만들어야 산다', b: '큰 은행은 <b>Vietcombank</b>·<b>BIDV</b>·<b>Techcombank</b>·<b>VietinBank</b>·<b>Agribank</b>입니다. 지점과 ATM이 어디에나 있습니다.<br>' +
      '한국계는 <b>신한베트남은행</b>과 <b>우리은행 베트남</b>이 개인 영업을 합니다 — 한국어 상담이 되고 앱도 한국어를 지원합니다.<br>' +
      '<b>계좌는 아무나 못 만듭니다.</b> <b>노동허가서 + 임시거주증(TRC)</b> 또는 <b>1년 이상 장기 비자</b>가 있어야 합니다. ' +
      '단기 비자·무비자는 창구에서 거절당하는 일이 흔합니다.<br>' +
      '한국으로 보낼 때는 은행 창구보다 <b>Wise</b> 같은 앱이 수수료가 쌉니다.' },
  { e: '🏥', t: '병원 — 어디로 갈지 미리 정해 두기', b: '가벼운 것은 약국, 그다음이 병원입니다. <b>회사 근처 병원 이름과 위치를 첫 주에 알아 두세요.</b><br>' +
      '<b>하노이</b> · <b>Vinmec Times City</b> — 베트남 최초로 <b>JCI 국제 인증</b>을 받은 종합병원(2015년)<br>' +
      '<b>호찌민</b> · <b>FV Hospital</b>(프랑스-베트남 병원, <b>한국인 코디네이터</b> 상주) · <b>Vinmec Central Park</b><br>' +
      '<b>국제병원은 비쌉니다.</b> 회사 단체보험이나 개인 해외의료보험이 있는지 출국 전에 확인하세요. ' +
      '공립병원은 싸지만 대기가 길고 영어가 잘 안 통합니다.' },
  { e: '🚨', t: '긴급 전화는 113 · 114 · 115', b: '<b>한국의 112·119가 아닙니다.</b> 세 개로 나뉘어 있습니다.<br>' +
      '· <b>113</b> — 경찰 (도난·사고·폭행)<br>· <b>114</b> — 소방·구조 (불·갇힘)<br>· <b>115</b> — 구급차 (의료 응급)<br>' +
      '셋 다 24시간이고 전국 어디서나 걸립니다. 지금은 <b>하나로 합치는 작업이 진행 중</b>이라 어느 번호로 걸어도 연결되게 바뀌어 가고 있습니다.<br>' +
      '<b>Cứu tôi với!</b>(끄우 또이 버이 — 도와주세요!) · <b>Gọi cấp cứu!</b>(고이 껍 끄우 — 구급차 불러 주세요!)<br>' +
      '주베트남 대사관·주호치민 총영사관의 <b>긴급 연락처</b>도 폰에 저장해 두세요.' },
  { e: '🛵', t: '어떻게 다니나 — 그랩 · 버스 · 지하철', b: '<b>Grab</b>(그랩) 앱 하나로 오토바이 택시·자동차 택시·음식 배달이 다 됩니다. <b>Be</b>·<b>ShopeeFood</b> 도 함께 씁니다. ' +
      '값이 앱에 미리 뜨고 지도로 따라오니 <b>말이 안 통해도 탈 수 있습니다</b>. 오토바이 택시는 <b>헬멧을 기사가 줍니다</b>(헬멧은 법으로 의무).<br>' +
      '<b>지하철은 아주 새것</b>입니다. 두 도시에 한 노선씩뿐입니다.<br>' +
      '· <b>하노이 2A호선</b>(Cát Linh–Hà Đông, 2021년) — 8,000~15,000동, 카드형 표<br>' +
      '· <b>호찌민 1호선</b>(Bến Thành–Suối Tiên, <b>2024년 12월 22일 개통</b>) — 6,000~19,000동. <b>HCMC Metro 앱</b>의 QR·비접촉 카드·종이표<br>' +
      '노선이 하나뿐이라 <b>출퇴근은 아직 오토바이와 버스</b>가 주력입니다.' },
  { e: '🏙️', t: '두 도시 — 하노이와 호찌민', b: '<b>하노이</b> · 나라의 <b>정치·행정 중심</b>. 천 년 된 도시라 골목이 좁습니다. 겨울에 15도까지 내려가는데 <b>난방이 없어</b> 더 춥게 느껴집니다.<br>' +
      '호안끼엠 호수 · 36거리 · 문묘 · 서호 / 쇼핑은 <b>롯데센터 하노이</b>·<b>이온몰</b>·<b>빈컴센터</b> / 한인 상권은 <b>미딩·낌마</b><br>' +
      '<b>호찌민</b> · 옛 이름 <b>사이공</b>. 나라의 <b>경제 중심</b>이고 더 빠르고 개방적입니다. 연중 27도 안팎에 우기·건기만 있습니다.<br>' +
      '<b>랜드마크 81</b>(461m·81층, 베트남 최고층) · 벤탄시장 · 노트르담 성당 · 중앙우체국 / 한인 밀집지는 <b>푸미흥(7군)</b>' },
  { e: '🛒', t: '시장이 아직 생활의 중심', b: '마트가 늘고 있지만 <b>재래시장(chợ)</b>이 여전히 중심입니다. 동네마다 시장이 있고 아침이 가장 붐빕니다.<br>' +
      '· <b>시장·노점은 흥정이 기본</b>입니다. 부르는 값이 정가가 아닙니다.<br>' +
      '· <b>마트·편의점은 정찰제</b>입니다. 여기서 흥정하면 안 됩니다.<br>' +
      '· 외국인에게 값을 높여 부르는 일이 흔합니다 — 기분 상할 일이 아니라 관행입니다.<br>' +
      '<b>Bao nhiêu tiền?</b>(바오 니에우 띠엔 — 얼마예요?) · <b>Bớt chút đi!</b>(벋 쭏 디 — 좀 깎아 주세요!)<br>' +
      '편의점은 <b>Circle K</b>·<b>GS25</b>·<b>Ministop</b>·<b>WinMart+</b> 가 많습니다.' },
  { e: '🗺️', t: '베트남이라는 나라', b: '인구 <b>약 1억 명</b>(2023년에 1억을 넘었습니다). 젊은 나라입니다.<br>' +
      '남북으로 <b>1,650km</b>가 넘게 길쭉해서 북쪽 끝과 남쪽 끝의 날씨가 완전히 다릅니다.<br>' +
      '<b>낑족(Kinh)</b>이 인구의 85% 남짓이고 54개 민족이 함께 삽니다.<br>' +
      '글자는 로마자(<b>Quốc ngữ</b>)를 쓰지만 원래 한자를 쓰던 나라라 <b>한자어가 아주 많습니다</b> — 우리에게 유리한 대목입니다.<br>' +
      '정치는 <b>공산당 일당제</b>입니다. 국가·지도자 험담은 <b>법적 문제</b>가 될 수 있습니다.<br>' +
      'GDP 약 <b>4,760억 달러</b>(2024년), 성장률은 최근 몇 해 <b>6~8%</b>대이고 <b>한국은 가장 큰 투자국의 하나</b>입니다.' },
  { e: '📜', t: '지나온 길 — 왜 이렇게 되었나', b: '· <b>~10세기</b> 천 년 가까이 <b>중국의 지배</b>. 한자와 유교가 이때 들어왔습니다.<br>' +
      '· <b>19세기 후반</b> <b>프랑스 식민지</b>. 로마자 표기·커피·바게트가 이때 들어왔습니다.<br>' +
      '· <b>1945년</b> 호찌민이 독립 선언 · <b>1954년</b> 남북으로 갈림<br>' +
      '· <b>1955~1975년</b> 전쟁. <b>한국군도 파병</b>되었습니다 — 이 이야기는 먼저 꺼내지 않는 편이 좋습니다.<br>' +
      '· <b>1975년</b> 통일. 사이공이 호찌민시가 됩니다.<br>' +
      '· <b>1986년</b> <b>도이머이(Đổi mới, 쇄신)</b> 개혁으로 시장경제를 받아들이며 지금의 성장이 시작됩니다.<br>' +
      '지금 대다수는 <b>전쟁을 겪지 않은 세대</b>이고 한국에 대한 감정도 대체로 좋습니다.' },
  { e: '🏫', t: '아이가 있다면 — 학교', b: '<b>한국국제학교</b> · <b>하노이한국국제학교</b>와 <b>호찌민시한국국제학교</b>가 있습니다. ' +
      '<b>한국 교육부가 인가한 재외한국학교</b>라 한국 교육과정·교과서·교사이고 귀국 후 편입이 수월합니다. ' +
      '<b>학비가 국제학교 중 가장 낮은 편</b>입니다(초등 기준 연 3,000만~3,500만 동, 우리 돈 150만~175만 원 안팎).<br>' +
      '<b>외국계 국제학교</b>는 영어로 수업하고 학비가 <b>몇 배</b>입니다.<br>' +
      '고를 때는 학비만 보지 말고 <b>국제 인증(IB·CIS·WASC)</b>·운영 주체의 재정·운영 이력을 함께 보세요. ' +
      '회사가 학비를 어디까지 대는지도 계약 전에 확인해야 합니다.' },
  { e: '🏠', t: '집 — 어디서 어떻게 사나', b: '공장은 <b>기숙사</b>를 주는 곳이 많습니다. 공짜거나 아주 쌉니다.<br>' +
      '따로 구한다면 <b>아파트(căn hộ)</b>가 관리·보안이 되고 외국인이 많습니다. 보증금은 보통 <b>1~2개월치</b>, 월세는 선불입니다. ' +
      '전기·수도·인터넷이 따로인지 확인하세요 — <b>전기요금이 비쌉니다.</b><br>' +
      '<b>마시는 물은 사서 마십니다.</b> 수돗물을 그대로 마시지 않고, 집·사무실에 <b>20리터 생수통(bình nước)</b>을 배달시켜 씁니다.<br>' +
      '외국인은 <b>임시거주 신고(tạm trú)</b>가 필요합니다. 보통 집주인이 해 주는데 <b>"했느냐"고 반드시 확인</b>하세요 — 최대 500만 동 벌금이 나올 수 있습니다.' },
  { e: '💸', t: '세금 — 183일이 갈림길', b: '베트남에 <b>183일 이상</b> 머물면 베트남 세법상 <b>거주자</b>로 볼 가능성이 높습니다. ' +
      '그러면 현지 급여뿐 아니라 <b>한국 본사에서 받은 급여·상여까지 신고 대상</b>이 될 수 있습니다.<br>' +
      '현지 급여만 신고하고 넘어갔다가 <b>가산세와 지연이자</b>를 무는 일이 실제로 있습니다. ' +
      '요즘은 해외 지급소득 파악이 촘촘해져서 그냥 넘어가지 않습니다.<br>' +
      '어렵게 생각할 것 없이 <b>회사 세무 담당에게 "저는 거주자입니까"</b> 한 번만 물어보세요. ' +
      '한국·베트남 조세조약이 있어 이중과세는 조정됩니다.' },
  { e: '🛡️', t: '치안 — 날치기만 조심하면', b: '베트남은 공안 조직이 강해 <b>치안은 상대적으로 양호한 편</b>입니다. ' +
      '다만 <b>오토바이 날치기</b>는 계속 일어납니다 — 가방과 폰을 낚아채고 달아납니다.<br>' +
      '· 가방은 <b>도로 반대쪽</b>으로 메세요.<br>' +
      '· <b>길에서 폰을 들고 걷지 마세요.</b> 지도를 볼 일이 있으면 가게 안으로 들어가서 봅니다.<br>' +
      '· 현금은 <b>소액만</b> 들고 다니고, 여권은 두고 사본만 가지고 다닙니다.<br>' +
      '잃어버렸을 때는 <b>113</b>(경찰). 여권을 잃으면 대사관·총영사관으로 갑니다.' },
  { e: '🏍️', t: '오토바이 — 다리이자 가장 큰 위험', b: '출퇴근·배달·이사까지 오토바이로 합니다. <b>헬멧은 법으로 의무</b>이고, ' +
      '그랩 오토바이 택시는 <b>기사가 헬멧을 줍니다</b>.<br>' +
      '<b>여기서 가장 큰 위험은 범죄가 아니라 교통사고입니다.</b> ' +
      '베트남 교통사고 사망자의 <b>90%가 오토바이 사고</b>라는 보도가 있습니다.<br>' +
      '길을 건널 때는 멈칫하거나 뛰지 말고 <b>일정한 속도로 천천히</b> 걷습니다 — 오토바이가 알아서 피해 갑니다. ' +
      '갑자기 서거나 뛰면 오히려 위험합니다.<br>' +
      '처음 몇 달은 직접 몰기보다 <b>그랩</b>을 쓰는 편이 안전합니다.' },
];
/* 세트 → 그 자리에 어울리는 문화 이야기. **번호가 아니라 주제 이름으로** 짝짓는다.
   번호로 하면 차례를 한 번 바꿀 때마다 짝이 통째로 어긋난다 — 실제로 두 번 어긋났다.
   억지로 채우지 않는다. 안 맞는 자리는 비워 둔다 — 딴소리가 나면 안 하느니만 못하다.
   한 장은 두 곳까지만 쓴다. 봉제·전자 심화 세트는 문화 이야기가 안 붙어 비워 뒀다. */
const CULTAT = {
  '일상 — 인사와 호칭': '호칭이 예의의 절반',
  '일상 — 이름 묻고 답하기': '이름은 뒤에서 부른다',
  '일상 — 어느 나라, 어디 사세요': '베트남이라는 나라',
  '일상 — 반갑습니다 / 잘 지내세요': '한국 것을 이미 알고 있다',
  '일상 — 못 알아들었을 때': '못 알아들었다고 말해도 된다',
  '일상 — 헤어질 때': '두 손으로',
  '일상 — 개수 세기': '세는 말이 따로 있다',
  '일상 — 나이와 시간': '고향(quê)을 묻는다',
  '일상 — 요일': '달력이 두 개 돈다',
  '일상 — 했다 / 할 것이다': '지나온 길 — 왜 이렇게 되었나',
  '일상 — 무슨 일 하세요': '공장에서 만날 사람들',
  '일상 — 하루 일과': '점심 후 낮잠',
  '일상 — 부탁하기': '존댓말 대신 호칭과 ạ',
  '일상 — 쉬는 날': '쉬는 날',
  '일상 — 축하와 명절': '설 첫날에 하지 않는 것',
  '일상 — 아플 때': '약국이 먼저, 그다음 병원',
  '일상 — 아플 때 더 자세히': '병원 — 어디로 갈지 미리 정해 두기',
  '일상 — 사고 팔기': '시장이 아직 생활의 중심',
  '일상 — 숫자와 돈 계산': '돈 다루기',
  '일상 — 색깔': '붉은색과 흰색',
  '일상 — 맞장구와 리액션': '남과 북 — 말도 결도 다릅니다',
  '일상 — 먹고 마시기': '아침은 밖에서 사 먹는다',
  '일상 — 만나서 한잔': '회식과 건배',
  '일상 — 카페': '커피의 나라',
  '일상 — 쌀국수 주문 심화': '먼저 권하고 먹는다',
  '일상 — 어디에 있어요': '두 도시 — 하노이와 호찌민',
  '일상 — 타고 다니기': '오토바이 — 다리이자 가장 큰 위험',
  '일상 — 택배와 그랩': '어떻게 다니나 — 그랩 · 버스 · 지하철',
  '일상 — 집안일': '집 — 어디서 어떻게 사나',
  '일상 — 베트남에서 살기': '도착한 첫 주에 할 일',
  '일상 — 유심과 휴대폰': '폰에 뭐가 깔려 있나',
  '일상 — 가족': '가족이 먼저',
  '일상 — 고향과 나이': '아이가 있다면 — 학교',
  '일상 — 날씨': '북부는 사계절, 남부는 두 계절',
  '일상 — 주말 이야기': '주말에 뭐 하나',
  '일상 — 축구 이야기': '축구 — 여기서는 국민 스포츠',
  '직무 — 회사와 사람들': '공장에서 만날 사람들',
  '직무 — 수량과 납기': '점과 쉼표가 우리와 반대',
  '직무 — 안전': '안전은 서류가 아니라 습관',
  '직무 — 기계와 전기': '220V, 플러그는 그대로',
  '직무 — 근태와 보고': '연차와 잔업에는 한도가 있다',
  '직무 — 세고 적기': '날짜는 일 / 월 / 년',
  '직무 — 식당과 기숙사': '한국 라면을 이미 먹고 있다',
  '직무 — 큰 숫자와 월급': '월급에서 빠지는 것',
  '직무 — 공장 안 길찾기': '주소는 골목까지 읽는다',
  '직무 — 전화와 연락': '잘로가 여기의 카톡',
  '직무 — 사무실': '가게 앞의 작은 제단',
  '직무 — 손님 응대': '차부터 한 잔',
  '직무 — 은행과 서류': '은행 — 계좌부터 만들어야 산다',
  '직무 — 복장과 태도': '신발과 집',
  '직무 — 동료와 지내기': '하지 않는 것이 좋은 일',
  '직무 — 회식': '회식과 건배',
  '직무 — 휴가와 근태 심화': '설(Tết)이 일 년의 중심',
  '직무 — 근로계약': '최저임금은 지역마다 다르다',
  '직무 — 급여명세 읽기': '세금 — 183일이 갈림길',
  '직무 — 비자와 체류': '노동허가서가 먼저다',
  '직무 — 건강검진과 응급': '긴급 전화는 113 · 114 · 115',
  '직무 — 잃어버렸을 때': '치안 — 날치기만 조심하면',
  '직무 — 지적은 따로, 부드럽게': '지적은 따로, 칭찬은 여럿 앞에서',
  '직무 — 실수했을 때': '못 알아들었다고 말해도 된다',
  '직무 — 일정과 출장': '한국보다 두 시간 느리다',
  '직무 — 지게차와 안전거리': '안전은 서류가 아니라 습관',
  '직무 — 입고와 출고': '현금 대신 QR',
};
const CULTBY = {};
CULTURE.forEach(c => { CULTBY[c.t] = c; });
const cultureFor = d =>
  CULTBY[CULTAT[(d.track === 'work' ? '직무 — ' : '일상 — ') + (d.theme || '')]] || null;


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
      btn.append(el('b', null, esc(d.theme)), el('span', 'msub', esc(d.title)));
      btn.onclick = () => { dive(showNewsLearn); startNews(d); };
      b.append(btn);
    });
  });
}
function startNews(d) {
  const items = [{ k: 'cover', d: { t: '📰 ' + d.theme, b: esc(d.intro), src: d.u, title: d.title,
                                    img: (d.words || []).map(w => w.img).find(Boolean),
                                    emoji: (d.words || []).map(w => w.emoji).find(Boolean) } }];
  (d.words || []).forEach(x => items.push({ k: 'word', d: x }));
  L = { day: { day: d.day, theme: d.theme, words: d.words, dialog: d.dialog, news: true },
        items, i: 0, news: true };
  drawCard();
  show('learn', d.theme, true);
}

/* 오늘 기사 — 깃허브 로봇이 아침마다 골라둔 것을 보여준다 (data/news.json) */
function showNews() {
  const b = $('#newsBody');
  b.textContent = '';
  fetch('data/news.json', { cache: 'no-cache' }).then(r => r.json()).then(n => {
    let last = null;
    (n.items || []).forEach(it => {
      if (it.d !== last) { b.append(el('p', 'newsday', esc(it.d))); last = it.d; }
      const a = el('a', 'newsrow');
      a.href = it.u; a.target = '_blank'; a.rel = 'noopener';
      a.append(el('span', 'ncat', it.cat || '경제·직무'), el('b', null, esc(it.t)));
      b.append(a);
    });
    b.append(el('p', 'note', '매일 아침 6시 30분에 업데이트됩니다. 최근 3일치만 남습니다.<br>기사 출처 — 인사이드비나'));
  }).catch(() => b.append(el('p', 'note', '기사를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')));
  show('news', '베트남 소식', true);
}
$('#chatForm').onsubmit = e => {
  e.preventDefault();
  const v = $('#chatText').value.trim();
  if (!v) return;
  $('#chatText').value = '';
  chatGrow();
  if (DM) { dmSay(v); return; }
  if (CH) chatSend(v);
};
/* 진도 백업 — 아이폰 사파리가 저장소를 비울 수 있어서 대비한다.
   단추는 홈 아래가 아니라 '진도' 타일 안에 있다 — 첫 화면은 학습만 남긴다.
   200단어가 다 쌓이면 원본이 7.5KB라 압축해서 내보낸다 (10,600자 → 2,900자). */
const b64 = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));

async function makeBackup() {
  const raw = JSON.stringify({ done: S.done, srs: S.srs, firstDay: S.firstDay, act: S.act, stats: S.stats });
  if (typeof CompressionStream === 'undefined')
    return 'VNSTUDY1' + btoa(unescape(encodeURIComponent(raw)));
  const st = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
  return 'VNSTUDY2' + b64(new Uint8Array(await new Response(st).arrayBuffer()));
}

async function readBackup(v) {
  if (v.startsWith('VNSTUDY2')) {
    const st = new Blob([unb64(v.slice(8))]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(st).text());
  }
  if (v.startsWith('VNSTUDY1'))
    return JSON.parse(decodeURIComponent(escape(atob(v.slice(8)))));
  throw new Error('형식 아님');
}

$('#bkExport').onclick = () => doExport();
$('#bkImport').onclick = () => doImport();
$('#bkReset').onclick = () => doReset();
async function doExport() {
  const blob = await makeBackup();
  let copied = false;
  try { await navigator.clipboard.writeText(blob); copied = true; } catch (e) { }
  const n = Object.keys(S.done).length;
  prompt(`${n}일치 진도를 담았습니다 (${blob.length}자).\n` +
    (copied ? '이미 복사해 뒀습니다. ' : '') +
    '메모 앱에 붙여넣어 두세요.', blob);
}

async function doImport() {
  const v = (prompt('백업해둔 글자를 붙여넣으세요.') || '').trim();
  if (!v) return;
  try {
    const o = await readBackup(v);
    const nd = Object.keys(o.done || {}).length, nw = Object.keys(o.srs || {}).length;
    if (!confirm(`${nd}일치 진도와 단어 ${nw}개를 되살립니다.\n지금 진도는 덮어씁니다. 진행할까요?`)) return;
    S.done = o.done || {}; S.srs = o.srs || {}; S.firstDay = o.firstDay;
    S.act = o.act || {}; S.stats = o.stats || {};
    save(); renderHome(); alert('되살렸습니다.');
  } catch (e) {
    alert('백업 글자가 아니거나 중간이 잘렸습니다.\nVNSTUDY 로 시작하는 글자 전체를 복사해 주세요.');
  }
}


/* 위 토글 두 개 — 두 값이 다 보이고 지금 켜진 쪽만 진하게 (현재 상태가 헷갈리지 않게) */
function seg(a, b, first) {
  return `<i${first ? ' class="on"' : ''}>${a}</i><i${first ? '' : ' class="on"'}>${b}</i>`;
}
function drawVoiceBtn() {
  $('#voice').innerHTML = seg('여', '남', S.voice === 'f');
}
/* 진도 초기화 — 처음부터 다시. 되돌릴 수 없어서 두 번 묻는다 */
function doReset() {
  if (!confirm('배운 기록을 모두 지우고 처음부터 다시 시작할까요?')) return;
  if (!confirm('되돌릴 수 없습니다. 정말 지울까요?\n(백업해 둔 글자가 있으면 나중에 되살릴 수 있습니다)')) return;
  const nick = S.nick;
  S.done = {}; S.srs = {}; S.act = {}; S.stats = {}; S.wk = { k: weekKey(), base: snapshot() };
  S.nick = nick; save(); renderHome();
}

$('#voice').onclick = () => {
  S.voice = S.voice === 'f' ? 'm' : 'f'; save(); drawVoiceBtn();
  if (!$('#learn').hidden && L) drawCard();
};

/* 북부(하노이) ↔ 남부(호찌민) 소리 전환. 남부 목소리는 여성 하나뿐이다. */
function drawRegion() {
  $('#region').innerHTML = seg('북부', '남부', S.region !== 's');
  drawVoiceBtn();
  topBtns();
}
$('#region').onclick = () => {
  S.region = S.region === 's' ? 'n' : 's'; save(); drawRegion();
  // 남부와 북부는 높낮이가 다르다 — 보고 있던 카드의 원어민 곡선도 다시 그린다
  if (!$('#learn').hidden && L) drawCard();
};

/* ---------- 다른 사람들의 평균 ----------
   등수는 보여주지 않는다. 견줄 것은 '내가 몇 등이냐'가 아니라
   '내 듣기가 남들보다 약한가'다 — 그래야 무엇을 더 할지가 나온다.
   서버는 과목별 평균만 돌려준다. AI를 안 쓰므로 사용량과 무관하다. */
const RANKKEY = ['say', 'ear', 'read', 'spell', 'memo'];
/* 순위표의 자리표. 별명은 겹칠 수 있어서 기기마다 다른 표를 하나 만들어 쓴다.
   이 표에는 아무 뜻이 없다 — 누구인지 알 수 있는 정보가 아니다. */
const myUid = () => S.uid || (S.uid = Math.random().toString(36).slice(2, 10), save(), S.uid);
const RANKNM = { say: '말하기', ear: '듣기', read: '읽기', spell: '쓰기', memo: '암기' };
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

/* ---------- 동아리 ----------
   왜 있는가: 혼자 하는 공부는 3주를 못 넘긴다. 사람은 "나만 안 하고 있다"는
   느낌에 가장 잘 움직인다. 그래서 보여 주는 것은 점수가 아니라 도장판이다 —
   누가 이번 주 며칠 나왔는지. 순위는 곁다리로만 둔다(1~5등만 이름 공개).
   서버에 올라가는 것은 별명·도장·외운 단어 수뿐. 실명도 기록도 올리지 않는다. */
const CLUBURL = 'https://viet-club.chaochao-app.workers.dev';
async function cCall(o) {
  const r = await fetch(CLUBURL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify(Object.assign({ nick: S.nick, uid: myUid() }, o)) });
  const j = await r.json();
  // 'gone' 은 **동아리를 물어본 요청**(id 포함)에만 뜻이 있다. 계정 같은 다른 요청이
  // 옛 서버에 떨어져 gone 을 받아도 동아리를 지우면 안 된다.
  if (j.error === 'gone' && o.id) { S.club = null; save(); throw new Error('이 동아리는 사라졌습니다.'); }
  if (j.error === 'gone') throw new Error('서버가 아직 옛 판입니다 — 관리자에게 알려 주세요.');
  if (j.error === 'notmember') { S.club = null; save();
    throw new Error('이 동아리의 회원이 아닙니다 — 다시 가입해 주세요.'); }
  if (j.error) throw new Error(j.error);
  return j;
}
const clubBusy = t => { const b = $('#clubBody'); b.textContent = '';
                        b.append(el('p', 'lede', t)); show('club', '동아리', true); };
const clubFail = e => { const b = $('#clubBody'); b.textContent = '';
  b.append(el('p', 'lede', esc(e.message || '연결하지 못했습니다')));
  const again = el('button', 'primary big', '다시'); again.style.width = '100%';
  again.onclick = showClub; b.append(again); show('club', '동아리', true); };

function showClub() {
  if (!S.nick || S.nick === '이름없음') { askNick(); return; }
  clubBusy('불러오는 중…');
  if (S.club) {
    mateSync().then(() => clubHome(MATES)).catch(e => { if (!S.club) clubList(); else clubFail(e); });
  } else clubList();
}

/* 동아리 갈래 — 목록에서 한눈에 구분되게 이모지와 함께 */
const CLUBCATS = [
  ['study', '📚', '공부'], ['sport', '⚽', '운동'], ['work', '🏭', '일·회사'],
  ['hobby', '🎨', '취미'], ['food', '🍜', '밥·모임'], ['talk', '💬', '수다'],
  ['local', '📍', '지역'], ['etc', '🌱', '기타']];
const catOf = k => CLUBCATS.find(c => c[0] === k);

/* 어느 땅에서 만나는가 — 갈래보다 이게 먼저다.
   한국에서 만든 동아리에는 베트남 사람이 못 온다. '하노이 탁구'라야 둘 다 온다. */
const CLUBCITY = [
  ['hn', '하노이'], ['bn', '박닌·타이응우옌'], ['hp', '하이퐁·꽝닌'],
  ['dn', '다낭·후에'], ['hcm', '호찌민'], ['bd', '빈즈엉·동나이'],
  ['vn', '베트남 그 밖'], ['kr', '한국'], ['on', '온라인 (어디서든)']];
const cityOf = k => CLUBCITY.find(c => c[0] === k);
const cityNm = k => (cityOf(k) || ['', '온라인 (어디서든)'])[1];

function clubList() {
  clubBusy('불러오는 중…');
  cCall({ act: 'clubs' }).then(j => {
    const b = $('#clubBody');
    b.textContent = '';
    b.append(el('p', 'lede', '만나는 땅으로 묶여 있습니다. 같은 도시면 한국인도 베트남인도 함께 옵니다.'));
    const mk = el('button', 'primary big', '동아리 만들기');
    mk.style.width = '100%'; mk.style.marginBottom = '14px';
    mk.onclick = clubCreate;
    b.append(mk);
    if (!j.clubs.length) b.append(el('p', 'note', '아직 만들어진 동아리가 없습니다. 첫 번째로 만들어 보세요.'));
    /* 도시별로 묶어 보여준다 — 갈래는 줄 앞 이모지로 남는다 */
    const groups = {};
    j.clubs.forEach(c => { const k = cityOf(c.city) ? c.city : 'on';
                           (groups[k] = groups[k] || []).push(c); });
    const order = CLUBCITY.map(x => x[0]).filter(k => groups[k]);
    order.forEach(k => {
      if (j.clubs.length > 3) b.append(el('div', 'grp', '📍 ' + cityNm(k)));
      groups[k].forEach(c => {
      const row = el('button', 'bigmenu clubrow');
      const mine = S.club && S.club.id === c.id;
      row.append(el('b', null, (catOf(c.cat) || catOf('etc'))[1] + ' ' + esc(c.name)
                   + (mine ? ' <i class="minechip">내 동아리</i>' : '')),
                 el('span', 'msub', esc(c.desc || '') + (c.desc ? ' · ' : '')
                   + `${c.n}명` + (c.approve ? ' · 승인제' : '')));
      row.onclick = () => {
        clubBusy('들어가는 중…');
        cCall({ act: 'join', id: c.id }).then(r => {
          if (r.state === 'wait') { clubBusy('가입 신청했습니다. 개설자가 받아 주면 들어갑니다.');
                                    const bk = el('button', 'ghost', '목록으로'); bk.onclick = clubList;
                                    $('#clubBody').append(bk); return; }
          S.club = { id: c.id, name: c.name }; save(); showClub();
        }).catch(clubFail);
      };
      b.append(row);
      });
    });
    show('club', '동아리', true);
  }).catch(clubFail);
}

function clubCreate() {
  const b = $('#clubBody');
  b.textContent = '';
  b.append(el('p', 'lede', '어떤 동아리인가요?'));
  const inp = el('input', 'keyin'); inp.type = 'text'; inp.maxLength = 20;
  inp.placeholder = '이름 (예: 하노이 탁구, 빈즈엉 3공장)';
  const de = el('input', 'keyin'); de.type = 'text'; de.maxLength = 60;
  de.placeholder = '한 줄 소개 (60자 — 예: 퇴근 후 풋살, 초보 환영)';
  // 갈래 — 하나 고른다. 이모지가 목록에서 이 동아리의 표가 된다.
  let cat = 'etc';
  const cw = el('div', 'catpick');
  CLUBCATS.forEach(([k, emo, nm]) => {
    const c2 = el('button', 'catchipbtn', emo + ' ' + nm);
    c2.type = 'button';
    if (k === cat) c2.classList.add('on');
    c2.onclick = () => { cat = k; [...cw.children].forEach(x => x.classList.remove('on')); c2.classList.add('on'); };
    cw.append(c2);
  });
  // 어디서 만나는가 — 기본값은 배우는 말씨를 따른다(북부→하노이, 남부→호찌민)
  let city = S.region === 's' ? 'hcm' : 'hn';
  const vw = el('div', 'catpick');
  CLUBCITY.forEach(([k, nm]) => {
    const c3 = el('button', 'catchipbtn', nm);
    c3.type = 'button';
    if (k === city) c3.classList.add('on');
    c3.onclick = () => { city = k; [...vw.children].forEach(x => x.classList.remove('on')); c3.classList.add('on'); };
    vw.append(c3);
  });
  const ap = el('label', 'chk');
  const cb = el('input'); cb.type = 'checkbox';
  ap.append(cb, el('span', null, '아무나 못 들어오게 (내가 받아 줘야 가입)'));
  const go = el('button', 'primary big', '만들기');
  go.style.width = '100%';
  go.onclick = () => {
    const v = inp.value.trim();
    if (v.length < 2) { inp.focus(); return; }
    clubBusy('만드는 중…');
    cCall({ act: 'create', name: v, approve: cb.checked, desc: de.value.trim(), cat, city })
      .then(j => { S.club = { id: j.id, name: j.name }; save(); showClub(); })
      .catch(clubFail);
  };
  b.append(inp, de,
    el('p', 'note', '어디서 만나나요 — 같은 도시라야 실제로 모입니다'), vw,
    el('p', 'note', '갈래를 고르세요'), cw, ap, go);
  dive(clubList);                       // 위쪽 뒤로가기로 목록으로 돌아간다
  show('club', '동아리 만들기', true);
  inp.focus();
}

function clubHome(j) {
  S.club = { id: S.club.id, name: j.name }; save();
  const b = $('#clubBody');
  b.textContent = '';
  b.append(el('p', 'lede', esc(j.name) + ' · ' + j.total + '명'));

  // 승인 대기 (개설자에게만)
  (j.wait || []).forEach(w => {
    const row = el('div', 'planrow');
    row.append(el('span', 'pk', '신청'), el('span', 'pv', esc(w)));
    const ok = el('button', 'ghost sm', '받기');
    ok.onclick = () => { clubBusy('처리 중…'); cCall({ act: 'accept', id: S.club.id, who: w })
      .then(showClub).catch(clubFail); };
    row.append(ok);
    b.append(row);
  });

  // 이번 주 도장판 — 이 동아리의 핵심 화면
  const head = el('div', 'phead');
  head.append(el('strong', null, '이번 주 출석'));
  head.append(el('span', 'dimtxt', '월 화 수 목 금 토 일'));
  b.append(head);
  // 같은 별명(같은 사람의 다른 기기)은 하나만 — 메신저와 같은 규칙
  const uniq = {};
  (j.people || []).forEach(m => { if (!uniq[m.nick] || (m.td || 0) > (uniq[m.nick].td || 0)) uniq[m.nick] = m; });
  Object.values(uniq).forEach(m => {
    const row = el('button', 'cmem' + (m.uid === myUid() ? ' me' : ''));
    row.append(faceEl(m.uid), el('span', 'cn', esc(m.nick)));
    const dd = el('span', 'dots');
    for (let i = 0; i < 7; i++) dd.append(el('i', 'dot' + ((m.days || [])[i] ? ' on' : '')));
    row.append(dd, el('span', 'cw', (m.memo || 0) + '단어'));
    if (mateNew(m)) row.append(el('i', 'newdot'));
    row.onclick = () => { dive(showClub); showMate(m.uid); };
    b.append(row);
  });

  b.append(el('p', 'note', '사람을 누르면 <b>엄지척</b>과 <b>쪽지</b>를 보낼 수 있습니다.'));
  // 동아리는 하나만 — '다른 동아리 보기'는 없앴다. 옮기려면 먼저 탈퇴한다.
  /* 오늘 한 줄 — 동아리 담벼락. 쪽지(1:1)보다 커뮤니티를 만드는 것은 담이다. */
  const fh = el('div', 'phead');
  fh.append(el('strong', null, '오늘 한 줄'), el('span', 'dimtxt', '최근 50개 · 30일 뒤 사라짐'));
  b.append(fh);
  const fin = el('div', 'feedin');
  const ftxt = el('input', 'keyin'); ftxt.type = 'text'; ftxt.maxLength = 200;
  ftxt.placeholder = '오늘 배운 것, 한 마디… (베트남어 환영)';
  const fgo = el('button', 'primary', '올리기');
  fin.append(ftxt, fgo);
  b.append(fin);
  const flist = el('div', 'feedlist');
  b.append(flist);
  const drawFeed = posts => {
    flist.textContent = '';
    if (!posts.length) { flist.append(el('p', 'note', '아직 글이 없습니다 — 첫 줄을 남겨 보세요.')); return; }
    posts.slice().reverse().forEach(pp => {
      const card = el('div', 'feedcard');
      const hd = el('div', 'feedhd');
      hd.append(faceEl(pp.f, 'row'), el('b', null, esc(pp.n)), el('span', 'dmt', dmWhen(pp.t)));
      card.append(hd, el('div', 'feedtx', esc(pp.x)));
      flist.append(card);
    });
  };
  cCall({ act: 'feed', id: S.club.id }).then(r => drawFeed(r.posts || []))
    .catch(() => flist.append(el('p', 'note', '담벼락은 서버가 새 판이어야 보입니다.')));
  fgo.onclick = () => {
    const x = ftxt.value.trim();
    if (!x) { ftxt.focus(); return; }
    fgo.disabled = true;
    cCall({ act: 'post', id: S.club.id, x })
      .then(r => { ftxt.value = ''; fgo.disabled = false; drawFeed(r.posts || []); })
      .catch(e => { fgo.disabled = false; alert(e.message || '안 올라갔습니다'); });
  };

  const more = el('button', 'ghost sm', '다른 동아리 보기');
  more.onclick = () => { dive(showClub); clubList(); };
  b.append(more);
  const out = el('button', 'ghost sm', '동아리 탈퇴');
  out.onclick = () => {
    if (!confirm(j.name + ' 에서 탈퇴할까요?')) return;
    clubBusy('탈퇴하는 중…');
    cCall({ act: 'leave', id: S.club.id })
      .then(() => { S.club = null; save(); clubList(); }).catch(clubFail);
  };
  const row = el('div', 'rolepick');
  row.append(out);
  b.append(row);
  show('club', '동아리', true);
}


/* ---------- 동아리 사람들 ----------
   같은 동아리 안에서만 서로 보이고 서로 말을 건다. 서버에 올라가는 것은
   별명·진도 숫자·본인이 올린 사진·본인이 쓴 쪽지뿐이고, 실명은 애초에 받지 않는다.
   **쪽지와 사진은 암호화되지 않는다** — 그 사실을 앱 화면에도 그대로 적어 둔다.
   사람은 별명이 아니라 uid(기기마다 다른 표)로 구분한다. 별명은 바뀌고 겹치니까. */
let MATES = null;                       // 마지막으로 받아 온 사람 목록
let DM = null, DMT = 0;                 // 지금 열려 있는 쪽지방 · 새로고침 시계

/* 사진은 본체(S)와 따로 둔다 — S 는 저장할 때마다 통째로 다시 쓰이는데,
   거기에 사진 스무 장이 끼면 진도를 저장할 때마다 수백 KB를 쓰게 된다. */
const FKEY = 'cc_face';
let FACE = (() => { try { return JSON.parse(localStorage.getItem(FKEY) || '{}'); } catch (e) { return {}; } })();
const faceSave = () => { try { localStorage.setItem(FKEY, JSON.stringify(FACE)); } catch (e) { } };

/* 온 날 세기.
   솔직히: 연속 기록은 하루 끊기면 그만두게 만든다는 걱정이 있어 일부러 안 세고 있었다.
   이제 세되 **끊긴 것을 벌하지 않는다** — 빨간 글씨도, 잃는다는 말도 쓰지 않는다.
   그리고 '모두 며칠'을 나란히 둔다. 연속이 0이 돼도 모두 며칠은 줄지 않는다. */
const totalDays = () => Object.keys(S.act || {}).length;
function streakDays() {
  const d = new Date();
  if (!S.act[ymd(d)]) d.setDate(d.getDate() - 1);      // 오늘 아직 안 했으면 어제부터 센다
  let n = 0;
  while (S.act[ymd(d)] && n < 4000) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const SILH = '<svg viewBox="0 0 40 40" class="silh"><circle cx="20" cy="15.2" r="7.6"/>' +
             '<path d="M5.6 38a14.4 14.4 0 0 1 28.8 0Z"/></svg>';
function faceEl(uid, cls) {
  const s = el('span', 'mav' + (cls ? ' ' + cls : ''));
  const d = (FACE[uid] || {}).d;
  if (d) { const im = new Image(); im.src = d; im.alt = ''; s.append(im); }
  else s.innerHTML = SILH;
  return s;
}

/* 내 현황을 올리고 사람 목록을 받아 온다 (한 번 오가며 둘 다 한다).
   서버는 바뀐 것이 없으면 저장하지 않는다 — KV 는 하루 쓰기가 1000번뿐이다. */
function mateSync() {
  if (!S.club) return Promise.resolve(null);
  const dots = weekDots(), sk = skillScore();
  return cCall({ act: 'report', id: S.club.id, days: dots.map(d => d.done ? 1 : 0),
                 memo: sk.memo, score: sk.score, st: streakDays(), td: totalDays(),
                 op: S.open ? 1 : 0, av: S.avv || 0, bl: S.block || [], pct: myPcts() })
    .then(j => { MATES = j; return pullFaces(j.people || []); });
}
/* 사진은 판 번호가 달라진 사람 것만 새로 받는다. 나머지는 폰에 남은 것을 쓴다. */
function pullFaces(people) {
  const need = people.filter(p => (p.av || 0) !== ((FACE[p.uid] || {}).v || 0)).map(p => p.uid);
  if (!need.length) return MATES;
  return cCall({ act: 'face', id: S.club.id, uids: need }).then(r => {
    need.forEach(u => {
      const p = people.find(x => x.uid === u);
      FACE[u] = { v: p.av || 0, d: (r.face || {})[u] || '' };
    });
    faceSave();
    return MATES;
  }).catch(() => MATES);
}
const mateNew = p => MATES && MATES.inbox && MATES.inbox[p.uid] > ((S.seen || {})[p.uid] || 0);

/* 사람 한 명 — 사진·온 날·엄지척·분석·쪽지 */
function showMate(u) {
  const p = ((MATES || {}).people || []).find(x => x.uid === u);
  const b = $('#subBody');
  b.textContent = '';
  if (!p) { b.append(el('p', 'lede', '이 사람을 찾지 못했습니다')); show('sub', '사람', true); return; }
  const me = u === myUid();

  const head = el('div', 'mhead');
  head.append(faceEl(u, 'big'));
  const nm = el('div', 'mname');
  nm.append(el('b', null, esc(p.nick) + (me ? ' <i>(나)</i>' : '')),
            el('span', 'msub', `연속 ${p.st}일 · 모두 ${p.td}일`),
            el('span', 'msub', `외운 단어 ${p.memo}개 · 받은 엄지 ${p.th}`));
  head.append(nm);
  b.append(head);

  const dots = el('div', 'dots wk');
  '월화수목금토일'.split('').forEach((lb, i) => {
    const s = el('span', 'dot' + ((p.days || [])[i] ? ' on' : ''));
    s.textContent = lb; dots.append(s);
  });
  b.append(el('p', 'note', '이번 주'), dots);

  if (!me) {
    const blocked = (S.block || []).includes(u);
    const tb = el('button', 'primary big', p.thToday ? '👍 오늘 눌렀습니다' : '👍 엄지척');
    tb.style.width = '100%'; tb.style.marginTop = '14px';
    tb.disabled = !!p.thToday;
    tb.onclick = () => {
      tb.disabled = true;
      cCall({ act: 'thumb', id: S.club.id, to: u })
        .then(r => { p.th = r.th; p.thToday = true; showMate(u); })
        .catch(e => { tb.textContent = '👍 ' + (e.message || '안 됐습니다'); });
    };
    const dm = el('button', 'ghost big', blocked ? '차단한 사람입니다' : '쪽지 보내기');
    dm.style.width = '100%'; dm.style.marginTop = '8px';
    dm.disabled = blocked;
    dm.onclick = () => { dive(() => showMate(u)); openDm(u); };
    b.append(tb, dm);
  }

  // 분석 — 본인이 켠 사람만 보인다
  b.append(el('div', 'phead', '<strong>실력 분석</strong>'));
  if (p.pct) {
    const my = myPcts();
    b.append(bars(SUBJ.map((x, i) => {
      const k = RANKKEY[i], v = p.pct[k];
      const has = typeof v === 'number';
      return [x.k, has ? v : 0, has ? NEED : 0,
              typeof my[k] === 'number' ? my[k] : undefined,
              has ? '' : '아직'];        // 문제 수는 서버가 안 보낸다 — 지어내지 않는다
    })));
    b.append(el('p', 'note', '세로 눈금은 <b>내 정답률</b>입니다.'));
  } else {
    b.append(el('p', 'note', me ? '내 정보에서 <b>분석 공개</b>를 켜면 동아리 사람들에게 보입니다.'
                                : '이 사람은 분석을 공개하지 않았습니다.'));
  }

  if (!me) {
    const blocked = (S.block || []).includes(u);
    const bl = el('button', 'ghost sm', blocked ? '차단 풀기' : '차단하기');
    bl.style.marginTop = '16px';
    bl.onclick = () => {
      S.block = (S.block || []).filter(x => x !== u);
      if (!blocked) S.block.push(u);
      save();
      mateSync().then(() => showMate(u)).catch(() => showMate(u));
    };
    b.append(bl);
    b.append(el('p', 'note', '차단하면 그 사람의 쪽지가 들어오지 않습니다.'));
  }
  show('sub', p.nick, true);
}

/* ---------- 쪽지방 ----------
   대화창(AI 방)의 틀을 그대로 쓴다 — 말풍선도 입력칸도 성조 줄도 이미 있다.
   다른 점은 보내기가 AI 가 아니라 사람에게 간다는 것뿐이다.
   서버는 최근 60줄만 들고 있고 30일이 지나면 지운다. */
function openDm(u) {
  const p = ((MATES || {}).people || []).find(x => x.uid === u);
  if (!p) return;
  CH = null;
  DM = { uid: u, nick: p.nick, n: -1 };
  $('#chatSetup').hidden = true;
  $('#tch').hidden = true;
  $('#chatForm').hidden = false;
  $('#chatTone').hidden = false; drawChatTone();
 $('#chatMic').hidden = true;   // 사람끼리는 글로만
  $('#chatLog').textContent = '';
  const prow = el('button', 'ghost sm dmprof', '👤 ' + esc(p.nick) + ' 프로필 · 엄지척');
  prow.onclick = () => { dive(() => openDm(u)); showMate(u); };
  $('#chatLog').append(prow);
  $('#chatLog').append(el('p', 'note dmwarn',
    '쪽지는 <b>암호가 걸려 있지 않습니다</b>. 서버에 30일 남고, 운영자는 마음먹으면 볼 수 있습니다.<br>' +
    '비밀번호·계좌·주소 같은 것은 여기에 쓰지 마세요.'));
  show('chat', p.nick, true);
  dmPull(true);
  DMT = setInterval(() => dmPull(false), 15000);
}
function dmPull(first) {
  if (!DM || !S.club) return;   // 동아리가 사라지면 조용히 멈춘다
  const u = DM.uid;
  cCall({ act: 'dm', id: S.club.id, to: u }).then(j => {
    if (!DM || DM.uid !== u) return;
    const msgs = j.msgs || [];
    if (!first && msgs.length === DM.n) return;               // 바뀐 게 없으면 그냥 둔다
    DM.n = msgs.length;
    const warn = $('#chatLog').firstChild;
    $('#chatLog').textContent = '';
    if (warn) $('#chatLog').append(warn);
    if (!msgs.length) $('#chatLog').append(el('p', 'lede', '첫 마디를 걸어 보세요'));
    msgs.forEach(m => {
      const mine = m.f === myUid();
      const bb = bubble(mine ? 'me' : 'ai', m.x);
      bb.append(el('span', 'dmt', dmWhen(m.t)));
      if (!mine) {
        /* 받은 말에만: [번역]은 누를 때만 AI를 부른다(자동이면 몫이 샌다).
           [✏️]는 헬로톡의 문장 고쳐 주기 — 상대 글을 따와서 고쳐 보내게 한다. */
        const tools = el('span', 'dmtools');
        const tr = el('button', 'ghost sm', '번역');
        tr.onclick = async () => {
          tr.disabled = true; tr.textContent = '…';
          const to = S.nat === 'vn' ? '베트남어' : S.nat === 'etc' ? '영어' : '한국어';
          try {
            const t = await gCall({ contents: [{ role: 'user', parts: [
              { text: '다음 문장을 자연스러운 ' + to + '로 번역하라. 번역문만 답하라.\n' + m.x }] }],
              generationConfig: { maxOutputTokens: 80, thinkingConfig: { thinkingBudget: 0 } } });
            tr.replaceWith(el('span', 'dmtrans', esc(t.trim())));
          } catch (e) { tr.textContent = '번역 실패'; tr.disabled = false; }
        };
        const fx = el('button', 'ghost sm', '✏️');
        fx.title = '문장 고쳐 주기';
        fx.onclick = () => {
          const inp2 = $('#chatText');
          inp2.value = '"' + m.x + '" → ';
          chatGrow(); inp2.focus({ preventScroll: true });
        };
        tools.append(tr, fx);
        bb.append(tools);
      }
    });
    S.seen = S.seen || {}; S.seen[u] = Date.now(); save();
    drawChatDot();
  }).catch(() => { });
}
const dmWhen = t => {
  const d = new Date(t), n = new Date();
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return ymd(d) === ymd(n) ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
};
function dmSay(text) {
  if (!DM || !S.club) return;
  const u = DM.uid;
  const bb = bubble('me', text);
  bb.append(el('span', 'dmt', '보내는 중…'));
  cCall({ act: 'say', id: S.club.id, to: u, x: text })
    .then(() => { DM.n = -1; dmPull(true); })
    .catch(e => { bb.className = 'cb err'; bb.textContent = '⚠ ' + (e.message || '못 보냈습니다'); });
}

/* ---------- 프로필 사진 ----------
   폰에서 고른 사진을 **160×160 으로 줄여서** 올린다. 원본은 올리지 않는다 —
   서버 한 칸에 담을 크기(≒10KB)로 맞추고, 남들이 목록을 볼 때 무겁지 않게 하려는 것이다. */
function pickFace(after) {
  const f = el('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = () => {
    const file = f.files && f.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 160;
        const s = Math.min(im.width, im.height);
        c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 160, 160);
        let d = c.toDataURL('image/jpeg', .72);
        if (d.length > 15000) d = c.toDataURL('image/jpeg', .55);
        if (d.length > 15000) d = c.toDataURL('image/jpeg', .4);
        saveFace(d, after);
      };
      im.onerror = () => alert('사진을 열지 못했습니다');
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  };
  f.click();
}
function saveFace(d, after) {
  cCall({ act: 'setface', img: d }).then(() => {
    S.avv = (S.avv || 0) + 1; save();
    FACE[myUid()] = { v: S.avv, d }; faceSave();
    if (S.club) mateSync().catch(() => { });
    after && after();
  }).catch(e => alert('사진을 올리지 못했습니다 — ' + (e.message || '')));
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
  AIDX = a;
  drawRegion();
  // 로그인 관문 — 안 되어 있으면 어느 기기든 열자마자 계정 화면부터 (사용자 지시).
  // 로그인된 기기는 로그아웃 전까지 그대로 유지된다(S.acct 가 기기에 남는다).
  let skip = false; try { skip = !!sessionStorage.getItem('gateSkip'); } catch (e) {}
  if ((!S.acct || !S.acct.tok) && !skip) { acctForm(true, 'login'); return; }
  if (!S.nick) { askNick(); return; }                 // 최초 1회
  if (S.wk && S.wk.k !== weekKey()) { showWeek(weekReport(S.wk.base)); return; }
  renderHome();
}).catch(e => { $('#title').textContent = '불러오기 실패'; console.error(e); });
