/* 동아리 + 순위 서버 (Cloudflare Worker + KV) — v2
   설정: Worker 만들기 → 이 코드 붙여넣고 Deploy → Settings → Bindings →
        KV namespace, Variable name: CLUB → 다시 Deploy
   하는 일
   · 동아리 만들기 / 목록 / 가입(자유·승인제) / 승인 / 탈퇴
   · 이번 주 도장(월~일)과 외운 단어 수를 동아리원끼리 공유
   · 주간 순위 — 상위 5명만 이름 공개, 내 등수는 나에게만
   v2: 사람이 다 나간 동아리는 스스로 지워진다 / 바뀐 게 없으면 저장하지 않는다
   개인정보는 별명과 진도 숫자뿐이다. */
const CORS = o => ({
  'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json',
});
const OK = ['https://tpgus5119-coder.github.io', 'http://localhost:8899'];
const MAX_CLUBS = 300;
const cut = (s, n) => String(s == null ? '' : s).slice(0, n);
const num = (v, hi) => Math.max(0, Math.min(hi, ~~v));
const week = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
                     return d.toISOString().slice(0, 10); };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = CORS(OK.includes(origin) ? origin : 'null');
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !OK.includes(origin))
      return new Response('{"error":"blocked"}', { status: 403, headers: cors });

    const KV = env.CLUB;
    const send = o => new Response(JSON.stringify(o), { headers: cors });
    if (!KV) return send({ error: 'KV 저장소가 연결되지 않았습니다 (Bindings: CLUB)' });

    const b = await req.json().catch(() => ({}));
    const act = cut(b.act, 20), nick = cut(b.nick, 10);
    const clubs = JSON.parse((await KV.get('clubs')) || '{}');
    const save = () => KV.put('clubs', JSON.stringify(clubs));

    if (act === 'clubs')                                     // 목록 (사람 많은 순)
      return send({ clubs: Object.entries(clubs)
        .map(([id, c]) => ({ id, name: c.name, n: c.members.length, approve: !!c.approve }))
        .sort((x, y) => y.n - x.n) });

    if (act === 'create') {                                  // 만들기
      if (!nick) return send({ error: '별명을 먼저 정해 주세요' });
      if (Object.keys(clubs).length >= MAX_CLUBS) return send({ error: '동아리가 너무 많습니다' });
      const name = cut(b.name, 20).trim();
      if (!name) return send({ error: '이름을 적어 주세요' });
      if (Object.values(clubs).some(c => c.name === name)) return send({ error: '같은 이름이 이미 있습니다' });
      const id = Math.random().toString(36).slice(2, 8);
      clubs[id] = { name, owner: nick, approve: !!b.approve, members: [nick], wait: [] };
      await save();
      return send({ id, name });
    }

    const id = cut(b.id, 12), c = clubs[id];
    if (!c) return send({ error: 'gone' });                  // 사라진 동아리
    c.wait = c.wait || [];

    if (act === 'join') {
      if (c.members.includes(nick)) return send({ ok: true, state: 'member' });
      if (c.members.length >= 100) return send({ error: '정원이 찼습니다 (100명)' });
      if (c.approve) { if (!c.wait.includes(nick)) { c.wait.push(nick); await save(); } }
      else { c.members.push(nick); await save(); }
      return send({ ok: true, state: c.approve ? 'wait' : 'member' });
    }

    if (act === 'accept' && c.owner === nick) {              // 개설자가 승인
      const who = cut(b.who, 10);
      c.wait = c.wait.filter(x => x !== who);
      if (!c.members.includes(who)) c.members.push(who);
      await save();
      return send({ ok: true });
    }

    if (act === 'leave') {
      c.members = c.members.filter(x => x !== nick);
      c.wait = c.wait.filter(x => x !== nick);
      if (!c.members.length) delete clubs[id];               // 아무도 없으면 동아리를 지운다
      else if (c.owner === nick) c.owner = c.members[0];     // 방장이 나가면 다음 사람에게
      await save();
      return send({ ok: true });
    }

    if (act === 'report') {                                  // 내 현황 올리고 동아리 현황 받기
      if (!c.members.includes(nick)) return send({ error: 'gone' });
      const key = `w:${week()}:${id}`;
      const board = JSON.parse((await KV.get(key)) || '{}');
      const mine = { days: (Array.isArray(b.days) ? b.days : []).slice(0, 7).map(x => x ? 1 : 0),
                     memo: num(b.memo, 99999), score: num(b.score, 99999) };
      const old = board[nick];
      if (!old || old.memo !== mine.memo || old.score !== mine.score
          || String(old.days) !== String(mine.days)) {       // 바뀐 게 없으면 저장하지 않는다
        board[nick] = mine;
        await KV.put(key, JSON.stringify(board), { expirationTtl: 60 * 60 * 24 * 60 });
      }
      for (const n of Object.keys(board)) if (!c.members.includes(n)) delete board[n];
      const list = Object.entries(board).sort((x, y) => y[1].score - x[1].score);
      const rank = list.findIndex(([n]) => n === nick) + 1;
      return send({
        name: c.name, owner: c.owner, wait: c.owner === nick ? c.wait : undefined,
        rank, total: list.length,
        pct: list.length >= 3 ? Math.max(1, Math.round(rank * 100 / list.length)) : 0,
        top: list.slice(0, 5).map(([n, v]) => ({ nick: n, score: v.score })),
        members: list.map(([n, v]) => ({ nick: n, days: v.days, memo: v.memo })),
      });
    }
    return send({ error: 'bad act' });
  },
};
