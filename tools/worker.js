/* AI 중계 서버 (Cloudflare Worker에 붙여넣는 코드) — v3
   하는 일: 앱의 요청을 받아 → 금고에 든 키(GEMINI_KEY)를 붙여 → 구글에 전달.
   키는 이 서버 밖으로 절대 안 나간다. 우리 앱에서 온 요청만 받는다.
   막힐 때 대책 세 겹:
     ① 키 여러 개(GEMINI_KEY에 쉼표로) 돌려쓰기 — 분당 한도를 키 수만큼 늘린다
     ② 모델 갈아타기 — 앞 모델이 붐비면(429·500·503) 다음 모델로
     ③ 짧게 쉬었다 재시도 */
const MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];
// '이 모델로는 안 된다' 는 신호 — 전부 '다음 모델로' 가 정답이다.
//   429·5xx = 붐빔   404 = 구글이 없앤 모델
//   400     = 그 모델이 우리 요청을 안 받는다.
// 400 을 여기 안 넣었더니 사고가 났다: 붐벼서 세 번째 모델로 밀린 요청이 400 을 맞고
// 그 자리에서 죽었다(사진 24번 몰아쳐서 6번). 앱에서는 손글씨·말하기 채점이 그냥 실패한다.
const BUSY = [400, 404, 429, 500, 502, 503, 504];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = [
      'https://tpgus5119-coder.github.io',   // 배포된 앱
      'http://localhost:8899',               // 개발 확인용
    ].includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !allowed)
      return new Response('{"error":"blocked"}', { status: 403, headers: cors });

    const body = await req.text();
    if (body.length > 1_000_000)             // 녹음·사진 포함 최대 1MB
      return new Response('{"error":"too big"}', { status: 413, headers: cors });

    const keys = env.GEMINI_KEY.split(',').map(k => k.trim()).filter(Boolean);
    const start = Math.floor(Math.random() * keys.length);   // 첫 키를 무작위로 골라 분산
    let r = null, first = null;
    for (let round = 0; round < 2; round++) {
      for (const model of MODELS) {
        for (let k = 0; k < keys.length; k++) {
          r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=`
              + keys[(start + k) % keys.length],
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          if (!r.ok && !first) first = { status: r.status, text: await r.clone().text() };
          if (!BUSY.includes(r.status)) break;   // 이 키·모델이 막혔으면 다음으로
        }
        if (!BUSY.includes(r.status)) break;
      }
      if (!BUSY.includes(r.status) || round === 1) break;
      await new Promise(res => setTimeout(res, 5000));       // 다 붐비면 5초 쉬고 한 바퀴 더
    }
    // 끝내 실패했으면 **맨 처음** 에러를 돌려준다.
    // 마지막 예비 모델이 뱉은 엉뚱한 말보다 첫 모델의 답이 원인에 가깝다.
    return new Response(r.ok ? await r.text() : (first ? first.text : await r.text()), {
      status: r.ok ? r.status : (first ? first.status : r.status),
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
