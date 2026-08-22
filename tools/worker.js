/* AI 중계 서버 (Cloudflare Worker에 붙여넣는 코드)
   하는 일: 앱의 요청을 받아 → 금고에 든 키(GEMINI_KEY)를 붙여 → 구글에 전달.
   키는 이 서버 밖으로 절대 안 나간다. 우리 앱에서 온 요청만 받는다.
   혼잡(분당 한도) 대책: ① 몰려서 막히면 서버가 스스로 몇 초 쉬었다 최대 2번 재시도
   ② GEMINI_KEY에 키를 쉼표로 여러 개 넣으면 돌려가며 쓴다 — 키 수만큼 한도가 늘어난다. */
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
    if (body.length > 1_000_000)             // 녹음(WAV) 포함 최대 1MB
      return new Response('{"error":"too big"}', { status: 413, headers: cors });

    const keys = env.GEMINI_KEY.split(',').map(k => k.trim()).filter(Boolean);
    const start = Math.floor(Math.random() * keys.length);   // 첫 키를 무작위로 골라 분산
    let r = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      for (let k = 0; k < keys.length; k++) {
        r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='
            + keys[(start + k) % keys.length],
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (r.status !== 429) break;         // 이 키가 막혔으면 다음 키로
      }
      if (r.status !== 429 || attempt === 2) break;
      await new Promise(res => setTimeout(res, 4000 + attempt * 6000));  // 4초, 10초 쉬고 재시도
    }
    return new Response(await r.text(), {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
