/* 동아리 + 순위 서버 (Cloudflare Worker + KV) — v2
   설정: Worker 만들기 → 이 코드 붙여넣고 Deploy → Settings → Bindings →
        KV namespace, Variable name: CLUB → 다시 Deploy
   하는 일
   · 동아리 만들기 / 목록 / 가입(자유·승인제) / 승인 / 탈퇴
   · 이번 주 도장(월~일)과 외운 단어 수를 동아리원끼리 공유
   · 주간 순위 — 상위 5명만 이름 공개, 내 등수는 나에게만
   v2: 사람이 다 나간 동아리는 스스로 지워진다 / 바뀐 게 없으면 저장하지 않는다
   v3: 순위는 동아리 안이 아니라 **앱 전체**다 (act:'rank'). 전체 평균과 내 자리도 함께 준다.
       동아리는 이제 '이번 주 출석판'만 맡는다.
   v4: 순위는 별명이 아니라 기기마다 다른 표(uid)로 구분한다 — 같은 별명을 쓰는 두 사람이
       서로의 기록을 덮어쓰지 않게. 남의 등수와 이름은 아무에게도 보내지 않는다
       (누구나 자기 자리만 안다).
   v5: 운영자용 act:'stats' — **이름 없이 숫자만.** 누가 누구인지는 서버도 모른다.
       운영을 하려면 규모와 흐름은 알아야 하는데, 그걸 알기 위해 개인을 알 필요는 없다.
       재는 것: 몇 명 · 요일별 접속 · **어디까지 갔다 그만두는가(깔때기)** ·
       **얼마나 남아 있는가(코호트)** · **진짜 기억률** · **많은 사람이 틀리는 단어**.
       뒤의 넷이 앱을 어디서 고쳐야 하는지 알려주는 숫자다.
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

    const GKEY = `r:${week()}`, TTL = { expirationTtl: 60 * 60 * 24 * 30 };
    const FIELDS = ['say', 'ear', 'read', 'spell', 'memo'];

    if (act === 'stats') {                                   // 운영 현황 — 숫자만, 이름 없음
      const g = JSON.parse((await KV.get(GKEY)) || '{}');
      const list = Object.values(g);
      const byDay = [0, 0, 0, 0, 0, 0, 0];
      list.forEach(v => (v.w || []).forEach((x, i) => { if (x) byDay[i]++; }));
      const s2 = list.map(v => v.s).sort((a, b) => a - b);
      const mid = s2.length ? s2[Math.floor(s2.length / 2)] : 0;
      const clubs2 = Object.values(clubs);

      // 깔때기 — 끝낸 세트가 몇 개인 사람이 몇 명인가. 사람들이 어디서 멈추는지 보인다.
      const FB = [0, 1, 3, 6, 11, 21];
      const funnel = [0, 0, 0, 0, 0, 0];
      list.forEach(v => {
        const n = v.st || 0;
        let i = 0; while (i + 1 < FB.length && n >= FB[i + 1]) i++;
        funnel[i]++;
      });

      // 코호트 — 시작한 지 N일 지난 사람 중 최근 사흘 안에 공부한 사람
      const DAY = 86400000, now = Date.now();
      const MARK = [1, 3, 7, 14, 30];
      const cohort = [0, 0, 0, 0, 0], alive = [0, 0, 0, 0, 0];
      list.forEach(v => {
        if (!v.f) return;
        const age = Math.floor((now - Date.parse(v.f + 'T00:00:00Z')) / DAY);
        const idle = v.l ? Math.floor((now - Date.parse(v.l + 'T00:00:00Z')) / DAY) : 999;
        MARK.forEach((m, i) => { if (age >= m) { cohort[i]++; if (idle <= 3) alive[i]++; } });
      });

      // 진짜 기억률 — 다시 볼 때가 된 카드를 첫 시도에 맞힌 비율 (간격 반복의 핵심 지표)
      const tr = list.reduce((a, v) => v.tr ? [a[0] + v.tr[0], a[1] + v.tr[1]] : a, [0, 0]);

      // 많은 사람이 틀리는 단어 — 커리큘럼을 고칠 직접 근거 (누가 틀렸는지는 안 남는다)
      const hard = {};
      list.forEach(v => (v.ms || []).forEach(w => { hard[w] = (hard[w] || 0) + 1; }));
      const hardWords = Object.entries(hard).filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1]).slice(0, 15);
      return send({
        week: week(), people: list.length, byDay,
        active: list.filter(v => (v.w || []).reduce((a, x) => a + x, 0) > 0).length,
        started: list.filter(v => v.m > 0).length,          // 단어를 하나라도 외운 사람
        avgScore: s2.length ? Math.round(s2.reduce((a, x) => a + x, 0) / s2.length) : 0,
        midScore: mid,
        avgMemo: list.length ? Math.round(list.reduce((a, v) => a + v.m, 0) / list.length) : 0,
        clubs: clubs2.length, clubMembers: clubs2.reduce((a, c) => a + c.members.length, 0),
        funnel, cohort, alive, hardWords,
        trueRet: tr[1] ? Math.round(tr[0] * 100 / tr[1]) : 0, trueN: tr[1],
      });
    }

    if (act === 'rank') {                                    // 앱 전체 순위 + 전체 평균
      const uid = cut(b.uid, 16);
      if (!nick || !uid) return send({ error: '별명을 먼저 정해 주세요' });
      const g = JSON.parse((await KV.get(GKEY)) || '{}');
      const p = b.pct && typeof b.pct === 'object' ? b.pct : {};
      const mine = { n: nick, s: num(b.score, 999999), m: num(b.memo, 99999), p: {} };
      for (const k of FIELDS) if (typeof p[k] === 'number') mine.p[k] = num(p[k], 100);
      mine.w = (Array.isArray(b.days) ? b.days : []).slice(0, 7).map(x => x ? 1 : 0);
      mine.f = cut(b.f, 10); mine.l = cut(b.l, 10);          // 첫날 · 마지막 날
      mine.dd = num(b.dd, 9999); mine.st = num(b.st, 9999);  // 공부한 날 · 끝낸 세트
      if (Array.isArray(b.tr)) mine.tr = [num(b.tr[0], 99999), num(b.tr[1], 99999)];
      mine.ms = (Array.isArray(b.ms) ? b.ms : []).slice(0, 8).map(x => cut(x, 24));
      const was = g[uid];
      if (was && was.w) for (let i = 0; i < 7; i++) mine.w[i] = mine.w[i] || was.w[i] || 0;
      if (!was || was.n !== mine.n || was.s !== mine.s || was.m !== mine.m
          || String(was.w) !== String(mine.w)
          || JSON.stringify(was.p) !== JSON.stringify(mine.p)) {   // 바뀐 게 없으면 저장하지 않는다
        g[uid] = mine;
        let ent = Object.entries(g);
        if (ent.length > 2000) {                             // 너무 커지면 점수 낮은 쪽부터 잘라낸다
          ent = ent.sort((x, y) => y[1].s - x[1].s).slice(0, 2000);
          for (const k of Object.keys(g)) delete g[k];
          for (const [k, v] of ent) g[k] = v;
          g[uid] = mine;
        }
        await KV.put(GKEY, JSON.stringify(g), TTL);
      }
      const list = Object.entries(g).sort((x, y) => y[1].s - x[1].s);
      const rank = list.findIndex(([k]) => k === uid) + 1;
      const avg = {};
      for (const k of FIELDS) {
        const v = list.map(([, x]) => x.p[k]).filter(x => typeof x === 'number');
        if (v.length >= 3) avg[k] = Math.round(v.reduce((a, x) => a + x, 0) / v.length);
      }
      const scores = list.map(([, x]) => x.s);
      // 남의 등수도 이름도 내보내지 않는다 — 나가는 것은 내 자리와 전체 평균뿐이다
      return send({
        rank, total: list.length,
        pct: list.length >= 3 ? Math.max(1, Math.round(rank * 100 / list.length)) : 0,
        avgScore: scores.length ? Math.round(scores.reduce((a, x) => a + x, 0) / scores.length) : 0,
        avgMemo: list.length ? Math.round(list.reduce((a, [, x]) => a + x.m, 0) / list.length) : 0,
        avg, myScore: mine.s, myMemo: mine.m, myPct: mine.p,
      });
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
      // 동아리는 출석판만 맡는다 — 순위는 앱 전체(act:'rank')로 뺐다.
      // 많이 나온 사람 순. 같으면 외운 단어가 많은 쪽.
      const list = Object.entries(board).sort((x, y) =>
        (y[1].days || []).reduce((a, v) => a + v, 0) - (x[1].days || []).reduce((a, v) => a + v, 0)
        || y[1].memo - x[1].memo);
      return send({
        name: c.name, owner: c.owner, wait: c.owner === nick ? c.wait : undefined,
        total: list.length,
        members: list.map(([n, v]) => ({ nick: n, days: v.days, memo: v.memo })),
      });
    }
    return send({ error: 'bad act' });
  },
};
