/* AI 중계 서버 (Cloudflare Worker에 붙여넣는 코드) — v3
   하는 일: 앱의 요청을 받아 → 금고에 든 키(GEMINI_KEY)를 붙여 → 구글에 전달.
   키는 이 서버 밖으로 절대 안 나간다. 우리 앱에서 온 요청만 받는다.
   막힐 때 대책 세 겹:
     ① 키 여러 개(GEMINI_KEY에 쉼표로) 돌려쓰기 — 분당 한도를 키 수만큼 늘린다
     ② 모델 갈아타기 — 앞 모델이 붐비면(429·500·503) 다음 모델로
     ③ 짧게 쉬었다 재시도 */
const MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
const BUSY = [429, 500, 502, 503, 504];

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
    let r = null;
    for (let round = 0; round < 2; round++) {
      for (const model of MODELS) {
        for (let k = 0; k < keys.length; k++) {
          r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=`
              + keys[(start + k) % keys.length],
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          if (!BUSY.includes(r.status)) break;   // 이 키·모델이 막혔으면 다음으로
        }
        if (!BUSY.includes(r.status)) break;
      }
      if (!BUSY.includes(r.status) || round === 1) break;
      await new Promise(res => setTimeout(res, 5000));       // 다 붐비면 5초 쉬고 한 바퀴 더
    }
    return new Response(await r.text(), {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
