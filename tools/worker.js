/* AI 중계 서버 (Cloudflare Worker에 붙여넣는 코드) — v3
   하는 일: 앱의 요청을 받아 → 금고에 든 키(GEMINI_KEY)를 붙여 → 구글에 전달.
   키는 이 서버 밖으로 절대 안 나간다. 우리 앱에서 온 요청만 받는다.
   막힐 때 대책 세 겹:
     ① 키 여러 개(GEMINI_KEY에 쉼표로) 돌려쓰기 — 분당 한도를 키 수만큼 늘린다
     ② 모델 갈아타기 — 앞 모델이 붐비면(429·500·503) 다음 모델로
     ③ 짧게 쉬었다 재시도 */
/* 쓸 수 있는 것은 **다 쓴다** (사용자 지시). 무료 몫은 모델마다 따로 걸리므로,
   목록이 길수록 하루에 받을 수 있는 사람이 늘어난다.
   차례는 **좋은 것 먼저**다 — 앞엣것이 붐빌 때만 뒤로 밀린다.
   이름이 틀리거나 없어진 모델은 404 를 뱉고 그냥 다음으로 넘어간다(BUSY 에 404 가 있다).
   그래서 후보를 넣어 두는 것은 안전하다 — 손해는 첫 호출 한 번의 왕복뿐이고,
   그마저도 확인된 모델을 앞에 둬서 평소에는 겪지 않는다. */
const MODELS = [
  'gemini-2.5-flash',          // 확인됨 (대표님 계기판) — 품질 기준
  'gemini-3.1-flash-lite',     // 확인됨 — 하루 몫이 크다(500)
  'gemini-3.5-flash-lite',     // 확인됨 — 하루 몫이 크다(500)
  'gemini-2.5-flash-lite',     // 후보
  'gemini-3.5-flash',          // 후보
  'gemini-3.1-flash',          // 후보
];

/* 구글이 전부 막혔을 때 마지막으로 기대는 곳 — **Cloudflare Workers AI**.
   왜 여기인가: 이미 우리 서버가 도는 그 계정이다. 새 회사에 가입할 일도,
   카드 걸 일도 없다. 하루 10,000 뉴런이 공짜고, 이 서버와 같은 데서 돈다.
   왜 마지막인가: 여기 모델은 구글 것보다 작아서 채점 글이 거칠다.
   **구글이 살아 있으면 구글을 쓴다.** 여기는 '앱이 죽는 것'만 막는 자리다.
   쓰려면 Cloudflare 대시보드에서 **AI 바인딩**을 하나 더 걸어야 한다
   (Settings → Bindings → Add → Workers AI → 이름 AI). 안 걸어도 앱은 그대로 돈다. */
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';
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

    /* 열쇠가 **몇 개** 꽂혀 있는지만 알려 준다. 열쇠도, 그 조각도 내보내지 않는다.
       왜 필요한가: Cloudflare 는 Secret 을 다시 보여주지 않는다(암호화). 그래서
       '지금 열쇠가 하나인가 다섯인가'를 알 길이 없어 짐작으로 답하게 된다.
       무료 몫은 **프로젝트마다 따로** 걸리므로 열쇠 수가 곧 하루 한도 배수다.
       주소창에서 바로 보려고 GET 도 받고 출처도 안 따진다 — 숫자 하나뿐이라 안전하다.
       주소: https://viet-ai.chaochao-app.workers.dev/?keys=1 */
    if (new URL(req.url).searchParams.get('keys') === '1') {
      const n = (env.GEMINI_KEY || '').split(',').map(k => k.trim()).filter(Boolean).length;
      return new Response(JSON.stringify({ keys: n, models: MODELS.length,
        cloudflare: !!env.AI,        // 예비(Workers AI) 바인딩이 걸려 있나
        note: '무료 몫은 프로젝트마다 따로 걸린다. 열쇠 수 × 모델 수 = 하루 한도 배수.' }),
        { headers: { 'Content-Type': 'application/json' } });
    }
    if (req.method !== 'POST' || !allowed)
      return new Response('{"error":"blocked"}', { status: 403, headers: cors });

    const body = await req.text();
    if (body.length > 1_000_000)             // 녹음·사진 포함 최대 1MB
      return new Response('{"error":"too big"}', { status: 413, headers: cors });

    const keys = env.GEMINI_KEY.split(',').map(k => k.trim()).filter(Boolean);
    const start = Math.floor(Math.random() * keys.length);   // 첫 키를 무작위로 골라 분산
    /* 한 바퀴만 돈다. 예전에는 두 바퀴를 돌았는데, 앱도 세 번 재시도하고 있어서
       **한 번 누를 때 구글로 최대 18번**이 나갔다. 무료 몫이 분당 10~20번이라
       한 사람이 한 번 누르는 것만으로 바닥나곤 했다. 이제 최대 (모델 3 × 키 수) 다. */
    let r = null, first = null;
    for (const model of MODELS) {
      for (let k = 0; k < keys.length; k++) {
        r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=`
            + keys[(start + k) % keys.length],
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!r.ok && !first) first = { status: r.status, text: await r.clone().text() };
        if (!BUSY.includes(r.status)) break;     // 이 키·모델이 막혔으면 다음으로
      }
      if (!BUSY.includes(r.status)) break;
    }
    /* 구글이 다 막혔다 — Cloudflare 로 넘긴다. 바인딩이 없으면 그냥 건너뛴다. */
    if (!r.ok && BUSY.includes(r.status) && env.AI) {
      try {
        const j = JSON.parse(body);
        // 구글 꼴(contents[].parts[].text) 을 평범한 대화 꼴로 옮긴다.
        // 소리·사진이 든 요청은 넘기지 않는다 — 이 모델은 글만 읽는다.
        const parts = (j.contents || []).flatMap(c => c.parts || []);
        if (!parts.some(p => p.inline_data || p.inlineData)) {
          const prompt = parts.map(p => p.text || '').join('\n').trim();
          if (prompt) {
            const out = await env.AI.run(CF_MODEL, {
              messages: [{ role: 'user', content: prompt }],
              max_tokens: (j.generationConfig || {}).maxOutputTokens || 400,
            });
            const txt = out && (out.response || out.result || '');
            if (txt) return new Response(JSON.stringify({
              candidates: [{ content: { parts: [{ text: txt }] } }],
              _by: 'cloudflare',            // 어디서 온 답인지 남긴다(디버깅용)
            }), { headers: { ...cors, 'Content-Type': 'application/json' } });
          }
        }
      } catch (e) { /* 예비가 실패하면 원래 구글 에러를 그대로 돌려준다 */ }
    }

    // 끝내 실패했으면 **맨 처음** 에러를 돌려준다.
    // 마지막 예비 모델이 뱉은 엉뚱한 말보다 첫 모델의 답이 원인에 가깝다.
    return new Response(r.ok ? await r.text() : (first ? first.text : await r.text()), {
      status: r.ok ? r.status : (first ? first.status : r.status),
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
