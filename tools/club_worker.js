/* 동아리 + 순위 서버 (Cloudflare Worker + KV)
   ─ 설정법 ────────────────────────────────────────────────
   1) Workers & Pages → Create → Worker 만들기 (이름 예: viet-club)
   2) Edit code → 이 파일 내용을 통째로 붙여넣고 Deploy
   3) Settings → Bindings → KV namespace 추가:
        Variable name: CLUB     (네임스페이스는 새로 만들면 됨)
   4) 배포된 주소를 알려주면 앱에 연결한다
   ─ 하는 일 ──────────────────────────────────────────────
   · 동아리 만들기 / 목록 / 가입(자유 또는 승인제) / 탈퇴
   · 멤버별 이번 주 도장(월~일 공부한 날)과 외운 단어 수 공유
   · 주간 순위(점수는 앱이 계산해 보낸다). 등수는 본인에게만, 상위 5명만 이름 공개
   개인정보는 별명과 진도 숫자뿐이다. */
const CORS = o => ({
  'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json',
});
const OK = ['https://tpgus5119-coder.github.io', 'http://localhost:8899'];
const cut = (s, n) => String(s == null ? '' : s).slice(0, n);
const week = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
                     return d.toISOString().slice(0, 10); };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = CORS(OK.includes(origin) ? origin : 'null');
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !OK.includes(origin))
      return new Response('{"error":"blocked"}', { status: 403, headers: cors });

    const b = await req.json().catch(() => ({}));
    const act = cut(b.act, 20), nick = cut(b.nick, 10);
    const KV = env.CLUB;
    const clubsRaw = JSON.parse((await KV.get('clubs')) || '{}');
    const send = o => new Response(JSON.stringify(o), { headers: cors });

    if (act === 'clubs') {                       // 목록
      return send({ clubs: Object.entries(clubsRaw).map(([id, c]) =>
        ({ id, name: c.name, n: (c.members || []).length, approve: !!c.approve })) });
    }
    if (act === 'create') {                      // 만들기
      const id = Math.random().toString(36).slice(2, 8);
      clubsRaw[id] = { name: cut(b.name, 20) || '이름 없는 동아리', owner: nick,
                       approve: !!b.approve, members: [nick], wait: [] };
      await KV.put('clubs', JSON.stringify(clubsRaw));
      return send({ id });
    }
    const c = clubsRaw[cut(b.id, 12)];
    if (!c) return send({ error: 'no club' });

    if (act === 'join') {                        // 가입 (자유 또는 승인 대기)
      if (c.members.includes(nick)) return send({ ok: true, state: 'member' });
      if (c.approve) { if (!c.wait.includes(nick)) c.wait.push(nick); }
      else c.members.push(nick);
      await KV.put('clubs', JSON.stringify(clubsRaw));
      return send({ ok: true, state: c.approve ? 'wait' : 'member' });
    }
    if (act === 'accept' && c.owner === nick) {  // 개설자가 승인
      const who = cut(b.who, 10);
      c.wait = c.wait.filter(x => x !== who);
      if (!c.members.includes(who)) c.members.push(who);
      await KV.put('clubs', JSON.stringify(clubsRaw));
      return send({ ok: true });
    }
    if (act === 'leave') {                       // 탈퇴
      c.members = c.members.filter(x => x !== nick);
      c.wait = (c.wait || []).filter(x => x !== nick);
      await KV.put('clubs', JSON.stringify(clubsRaw));
      return send({ ok: true });
    }
    if (act === 'report') {                      // 내 현황 올리고 동아리 현황 받기
      const wk = week(), key = `w:${wk}:${b.id}`;
      const board = JSON.parse((await KV.get(key)) || '{}');
      board[nick] = { days: Array.isArray(b.days) ? b.days.slice(0, 7).map(x => x ? 1 : 0) : [],
                      memo: Math.max(0, Math.min(99999, ~~b.memo)),
                      score: Math.max(0, Math.min(99999, ~~b.score)), t: Date.now() };
      await KV.put(key, JSON.stringify(board), { expirationTtl: 60 * 60 * 24 * 60 });
      const list = Object.entries(board).sort((x, y) => y[1].score - x[1].score);
      const rank = list.findIndex(([n]) => n === nick) + 1;
      return send({
        name: c.name, owner: c.owner, wait: c.owner === nick ? c.wait : undefined,
        rank, total: list.length,
        pct: list.length ? Math.max(1, Math.round(rank * 100 / list.length)) : 0,
        top: list.slice(0, 5).map(([n, v]) => ({ nick: n, score: v.score })),
        members: list.map(([n, v]) => ({ nick: n, days: v.days, memo: v.memo })),
      });
    }
    return send({ error: 'bad act' });
  },
};
