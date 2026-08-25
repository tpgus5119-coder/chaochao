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
   v6: 폰 알림(웹 푸시). 보내는 것은 '깨워라' 신호뿐 — 대화 내용은 서버를 지나가지 않는다.
       **하루 한 번**, 오늘 아직 공부 안 한 사람에게만. 읽씹이 사흘 이어지면 그 사람은 쉰다
       (그다음 앱을 한 번이라도 열면 다시 0부터 — 돌아온 사람은 다시 챙긴다).
       Settings → Variables and Secrets 에 VAPID_PRIV 와 PUSH_KEY 를 넣어야 돈다.
       재는 것: 몇 명 · 요일별 접속 · **어디까지 갔다 그만두는가(깔때기)** ·
       **얼마나 남아 있는가(코호트)** · **진짜 기억률** · **많은 사람이 틀리는 단어**.
       뒤의 넷이 앱을 어디서 고쳐야 하는지 알려주는 숫자다.
   v7: **사람끼리** — 같은 동아리 안에서만.
       · 사람 목록(uid 로 구분) · 엄지척 하루 한 번 · 쪽지 · 프로필 사진 · 분석 공개 여부
       · 차단하면 그 사람 쪽지는 아예 안 들어온다
       숨기지 않을 것: 쪽지 글과 사진은 **이 서버에 그대로 저장된다**(30일·사진은 바꿀 때까지).
       암호화하지 않으므로 운영자는 마음먹으면 볼 수 있다. 앱 화면에도 그렇게 적어 둔다.
       막는 것은 Origin 허용목록 하나뿐이다 — 비밀 이야기를 할 자리가 아니다.
   v8: 별명은 먼저 쓴 사람이 임자(act:'nick') · 동아리는 **하나만** 들어간다.
   개인정보는 별명·진도 숫자·본인이 올린 사진·본인이 쓴 쪽지뿐이다. 실명은 받지 않는다. */
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

/* 웹 푸시 — 내용 없는 신호만 보낸다.
   VAPID 는 '이 서버가 보낸 게 맞다'는 서명이다. 내용을 안 실으므로 암호화는 필요 없다. */
const u8 = b64 => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function vapidJwt(aud, privB64) {
  const key = await crypto.subtle.importKey('pkcs8', u8(privB64),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(new TextEncoder().encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:chaochao@example.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key,
    new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64u(sig);
}

async function webpush(endpoint, privB64) {
  const aud = new URL(endpoint).origin;
  const jwt = await vapidJwt(aud, privB64);
  const pub = 'BIXezZvZv-VlkJ49y1sGnEtMfqWkENMJOyZPi1XubrE2J6DeCh2ttTDoimW-EO7PR1U-8qNqSyMetpfZMwZEnTQ';
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'TTL': '86400', 'Authorization': `vapid t=${jwt}, k=${pub}` },
  });
}

const today = () => new Date().toISOString().slice(0, 10);

/* 동아리 사람 목록 — 남에게 나가는 것만 골라 담는다.
   분석(정답률·점수)은 **본인이 공개로 켠 사람 것만** 나간다. 사진은 판 번호만 나가고
   그림 자체는 따로 받아 간다(목록이 무거워지지 않게). */
function dirOf(cu, c, me) {
  const people = Object.entries(cu)
    .filter(([u, v]) => v && v.n)
    .map(([u, v]) => {
      const o = { uid: u, nick: v.n, days: v.wk === week() ? (v.w || []) : [],
                  memo: v.m || 0, st: v.st || 0, td: v.td || 0,
                  th: v.th || 0, av: v.av || 0, at: v.at || '',
                  thToday: !!(v.tb && v.tb[me] === today()) };
      if (v.op) { o.score = v.s || 0; o.pct = v.p || {}; }
      return o;
    })
    .sort((x, y) => (y.days || []).reduce((a, n) => a + n, 0) - (x.days || []).reduce((a, n) => a + n, 0)
                    || y.memo - x.memo);
  return { name: c.name, owner: c.owner, wait: c.owner === cu[me]?.n ? c.wait : undefined,
           total: people.length, people, members: people.map(p => ({ nick: p.nick, days: p.days, memo: p.memo })),
           block: (cu[me] && cu[me].bl) || [] };
}
async function inboxOf(KV, uid) {
  if (!uid) return {};
  return JSON.parse((await KV.get(`mb:${uid}`)) || '{}');
}

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

    /* ── 별명 자리 잡기 ─────────────────────────────────
       같은 별명이 둘이면 동아리 출석판에서 누가 누구인지 알 수 없다.
       그래서 먼저 쓴 사람이 임자다. 기기표(uid)가 같으면 자기 것이니 그냥 통과. */
    const NKEY = 'nicks';
    if (act === 'nick') {
      const uid = cut(b.uid, 16);
      if (!nick || !uid) return send({ error: '별명과 기기 표가 있어야 합니다' });
      const nicks = JSON.parse((await KV.get(NKEY)) || '{}');
      const low = nick.toLowerCase();
      if (nicks[low] && nicks[low] !== uid) return send({ error: '이미 쓰는 사람이 있습니다' });
      for (const k of Object.keys(nicks)) if (nicks[k] === uid && k !== low) delete nicks[k];
      if (nicks[low] !== uid) { nicks[low] = uid; await KV.put(NKEY, JSON.stringify(nicks)); }
      // 별명을 바꿨는데 동아리 명단은 옛 이름 그대로면, 다음 접속에 '너는 회원이 아니다'가 되어
      // 앱이 동아리를 지워 버린다. 실제로 그 사고가 났다 — 이름을 바꿀 때 명단도 같이 고친다.
      let moved = false;
      for (const c of Object.values(clubs)) {
        const was = (c.uids || {})[uid];
        if (!was || was === nick) continue;
        c.uids[uid] = nick;
        c.members = c.members.map(x => (x === was ? nick : x));
        c.wait = (c.wait || []).map(x => (x === was ? nick : x));
        if (c.owner === was) c.owner = nick;
        moved = true;
      }
      if (moved) await save();
      return send({ ok: true });
    }

    if (act === 'wipe') {                                    // 관리자만 — 동아리를 전부 비운다
      if (!env.PUSH_KEY || cut(b.key, 64) !== env.PUSH_KEY) return send({ error: 'no' });
      const ids = Object.keys(clubs);
      for (const id of ids) await KV.delete(`cu:${id}`);
      await KV.put('clubs', '{}');
      return send({ ok: true, wiped: ids.length });
    }

    /* ── 계정 ─────────────────────────────────────────
       아이디+비밀번호로 어느 기기서든 같은 별명·같은 기록(동아리·엄지·사진)이 따라온다.
       비밀번호는 소금을 쳐서 으깬 값(해시)만 저장한다 — 원문은 어디에도 안 남는다.
       이메일이 없으므로 비밀번호를 잊으면 되찾을 길이 없다(가입 화면에 밝힌다). */
    const hashPw = async (salt, pw) => {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '\u0001' + pw));
      return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
    };
    if (act === 'signup' || act === 'login') {
      const id = cut(b.id, 20).toLowerCase().trim();
      const pw = String(b.pw || '').slice(0, 64);
      if (!/^[a-z0-9_]{4,20}$/.test(id)) return send({ error: '아이디는 영문·숫자 4~20자입니다' });
      if (pw.length < 4) return send({ error: '비밀번호는 4자 이상입니다' });
      const AK = 'acct:' + id;
      const acct = JSON.parse((await KV.get(AK)) || 'null');
      if (act === 'signup') {
        if (acct) return send({ error: '이미 있는 아이디입니다' });
        const uid = cut(b.uid, 16);
        if (!nick || !uid) return send({ error: '별명을 먼저 정해 주세요' });
        const salt = Math.random().toString(36).slice(2, 12);
        await KV.put(AK, JSON.stringify({ s: salt, h: await hashPw(salt, pw), u: uid }));
        return send({ ok: true, uid, nick });
      }
      if (!acct) return send({ error: '없는 아이디입니다' });
      if (await hashPw(acct.s, pw) !== acct.h) return send({ error: '비밀번호가 다릅니다' });
      // 이 계정(uid)의 지금 별명을 찾아 준다
      const nicks = JSON.parse((await KV.get(NKEY)) || '{}');
      let myNick = '';
      for (const [k, v] of Object.entries(nicks)) if (v === acct.u) { myNick = k; break; }
      // 이 uid 가 들어 있는 동아리도 알려 준다 (기기를 바꿔도 동아리가 따라온다)
      let myClub = null;
      for (const [cid, cc] of Object.entries(clubs))
        if (cc.uids && cc.uids[acct.u]) { myClub = { id: cid, name: cc.name, nick: cc.uids[acct.u] }; break; }
      return send({ ok: true, uid: acct.u, nick: myNick || (myClub && myClub.nick) || '', club: myClub });
    }

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
      clubs[id] = { name, owner: nick, approve: !!b.approve, members: [nick], wait: [],
                    uids: cut(b.uid, 16) ? { [cut(b.uid, 16)]: nick } : {} };
      await save();
      return send({ id, name });
    }

    const GKEY = `r:${week()}`, TTL = { expirationTtl: 60 * 60 * 24 * 30 };
    const FIELDS = ['say', 'ear', 'read', 'spell', 'memo'];

    /* ── 폰 알림 ─────────────────────────────────────────────
       알림 주소(endpoint)만 들고 있는다. 그것으로는 누구인지 알 수 없다.
       내용 없는 신호만 보내므로 암호화 짐이 없다 — 무슨 말이 왔는지는 앱을 열어야 본다. */
    const SUBK = 'push:subs';
    if (act === 'sub') {
      const uid = cut(b.uid, 16);
      if (!uid || !b.sub || !b.sub.endpoint) return send({ error: 'bad sub' });
      const subs = JSON.parse((await KV.get(SUBK)) || '{}');
      subs[uid] = { e: cut(b.sub.endpoint, 512), t: 0 };     // t = 마지막으로 보낸 날
      await KV.put(SUBK, JSON.stringify(subs));
      return send({ ok: true });
    }
    if (act === 'unsub') {
      const uid = cut(b.uid, 16);
      const subs = JSON.parse((await KV.get(SUBK)) || '{}');
      if (subs[uid]) { delete subs[uid]; await KV.put(SUBK, JSON.stringify(subs)); }
      return send({ ok: true });
    }
    if (act === 'push') {                                    // 로봇만 부른다 (PUSH_KEY 필요)
      if (!env.PUSH_KEY || cut(b.key, 64) !== env.PUSH_KEY) return send({ error: 'no' });
      if (!env.VAPID_PRIV) return send({ error: 'VAPID_PRIV 없음' });
      const subs = JSON.parse((await KV.get(SUBK)) || '{}');
      const g = JSON.parse((await KV.get(GKEY)) || '{}');
      const today = new Date().toISOString().slice(0, 10);
      const DAY = 86400000, now = Date.now();
      let sent = 0, gone = 0, skipped = 0;
      for (const [uid, v] of Object.entries(subs)) {
        if (v.t === today) { skipped++; continue; }           // 하루 한 번까지만
        const me = g[uid];
        const idle = me && me.l ? Math.floor((now - Date.parse(me.l + 'T00:00:00Z')) / DAY) : 99;
        if (idle < 1) { skipped++; continue; }                // 오늘 이미 공부한 사람은 안 부른다
        if ((v.miss || 0) >= 3) { skipped++; continue; }      // 세 번 내리 안 읽으면 그 사람은 쉰다
        try {
          const r = await webpush(v.e, env.VAPID_PRIV);
          if (r.status === 404 || r.status === 410) { delete subs[uid]; gone++; continue; }
          v.t = today; v.miss = (v.miss || 0) + 1; sent++;    // 앱을 열면 sub 이 다시 와서 0으로 돌아간다
        } catch (e) { }
      }
      await KV.put(SUBK, JSON.stringify(subs));
      return send({ sent, gone, skipped, total: Object.keys(subs).length });
    }

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

    /* ── 프로필 사진 ──────────────────────────────────────
       작게 줄여 온 것만 받는다(글자 16000개 ≒ 12KB). 사람마다 키 하나. */
    if (act === 'setface') {
      const img = cut(b.img, 16000), uid = cut(b.uid, 16);
      if (!uid) return send({ error: 'no uid' });
      if (!img) { await KV.delete(`av:${uid}`); return send({ ok: true }); }
      if (!img.startsWith('data:image/')) return send({ error: '사진이 아닙니다' });
      await KV.put(`av:${uid}`, img);
      return send({ ok: true });
    }
    if (act === 'face') {                                    // 남의 사진 받아 오기 (한 번에 여럿)
      const want = (Array.isArray(b.uids) ? b.uids : []).slice(0, 30).map(x => cut(x, 16));
      const out = {};
      for (const u of want) out[u] = (await KV.get(`av:${u}`)) || '';
      return send({ face: out });
    }

    const id = cut(b.id, 12), c = clubs[id];
    if (!c) return send({ error: 'gone' });                  // 정말로 사라진 동아리 (이때만 'gone')
    c.wait = c.wait || [];
    c.uids = c.uids || {};
    /* 사람을 붙드는 것은 **기기 표(uid)** 다. 별명은 얼굴 이름일 뿐이라 바뀐다.
       명단에 옛 이름이 남아 있으면 여기서 조용히 고쳐 준다. */
    const myUid = cut(b.uid, 16);
    if (myUid && c.uids[myUid] && c.uids[myUid] !== nick && nick) {
      const was = c.uids[myUid];
      c.uids[myUid] = nick;
      c.members = c.members.map(x => (x === was ? nick : x));
      c.wait = c.wait.map(x => (x === was ? nick : x));
      if (c.owner === was) c.owner = nick;
      await save();
    }

    if (act === 'join') {
      if (c.members.includes(nick)) return send({ ok: true, state: 'member' });
      // 여러 동아리에 겹쳐 들어갈 수 있다 (사용자 지시로 하나 제한을 풀었다)
      if (c.members.length >= 100) return send({ error: '정원이 찼습니다 (100명)' });
      if (myUid) c.uids[myUid] = nick;
      if (c.approve) { if (!c.wait.includes(nick)) { c.wait.push(nick); } await save(); }
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
      if (myUid) delete c.uids[myUid];
      c.members = c.members.filter(x => x !== nick);
      c.wait = c.wait.filter(x => x !== nick);
      if (!c.members.length) delete clubs[id];               // 아무도 없으면 동아리를 지운다
      else if (c.owner === nick) c.owner = c.members[0];     // 방장이 나가면 다음 사람에게
      await save();
      return send({ ok: true });
    }

    /* ── 동아리 사람들 ────────────────────────────────────
       예전에는 별명으로 줄을 세웠는데, 별명은 바뀌고 겹친다.
       이제 사람은 uid(기기마다 다른 표)로 구분하고 별명은 얼굴 이름일 뿐이다.
       한 동아리의 사람들을 **키 하나**에 모아 둔다 — KV 는 하루 쓰기 1000번뿐이라
       사람마다 키를 따로 두면 금방 바닥난다. */
    const CUK = `cu:${id}`, CTTL = { expirationTtl: 60 * 60 * 24 * 90 };
    const readCu = async () => JSON.parse((await KV.get(CUK)) || '{}');
    const uid = cut(b.uid, 16);

    if (act === 'report') {                                  // 내 현황 올리고 사람 목록 받기
      // 기기 표가 명단에 있으면 회원이다. 이름이 어긋난 것만으로 내보내지 않는다.
      if (!c.members.includes(nick)) {
        if (myUid && c.uids[myUid]) { c.members.push(nick); c.uids[myUid] = nick; await save(); }
        else return send({ error: 'notmember' });            // 'gone' 이 아니다 — 동아리는 살아 있다
      }
      if (!uid) return send({ error: 'no uid' });
      const cu = await readCu();
      const was = cu[uid] || {};
      const mine = {
        n: nick,
        w: (Array.isArray(b.days) ? b.days : []).slice(0, 7).map(x => x ? 1 : 0),
        wk: week(),                                          // 지난주 도장은 저절로 지워진다
        m: num(b.memo, 99999), s: num(b.score, 999999),
        st: num(b.st, 9999), td: num(b.td, 99999),           // 연속으로 온 날 · 온 날 모두
        op: b.op ? 1 : 0,                                    // 분석을 남에게 보일지
        av: num(b.av, 9999),                                 // 사진 판 번호 (남이 다시 받을지 판단)
        th: was.th || 0, tb: was.tb || {},                   // 받은 엄지 · 누가 언제 눌렀나
        bl: (Array.isArray(b.bl) ? b.bl : (was.bl || [])).slice(0, 50).map(x => cut(x, 16)),
        at: today(),
      };
      const p = b.pct && typeof b.pct === 'object' ? b.pct : {};
      mine.p = {};
      for (const k of FIELDS) if (typeof p[k] === 'number') mine.p[k] = num(p[k], 100);
      cu[uid] = mine;
      // 같은 사람이 폰·컴퓨터 두 대로 들어오면 기기표(uid)가 둘이라 명단에 두 번 떴다.
      // 별명이 같으면 같은 사람이다 — 방금 온 기기만 남긴다.
      for (const k of Object.keys(cu)) if (k !== uid && cu[k].n === nick) delete cu[k];
      for (const k of Object.keys(cu)) if (!c.members.includes(cu[k].n)) delete cu[k];
      // 바뀐 게 없으면 저장하지 않는다 (하루 쓰기 1000번을 아낀다)
      if (JSON.stringify(was) !== JSON.stringify(mine)) await KV.put(CUK, JSON.stringify(cu), CTTL);
      return send(Object.assign(dirOf(cu, c, uid), { inbox: await inboxOf(KV, uid) }));
    }

    if (act === 'dir') {                                     // 목록만 다시 받기 (안 쓰고 읽기만)
      const cu = await readCu();
      return send(Object.assign(dirOf(cu, c, uid), { inbox: await inboxOf(KV, uid) }));
    }

    if (act === 'thumb') {                                   // 엄지척 — 한 사람에게 하루 한 번
      const to = cut(b.to, 16);
      const cu = await readCu();
      if (!cu[uid] || !cu[to] || to === uid) return send({ error: '없는 사람입니다' });
      cu[to].tb = cu[to].tb || {};
      if (cu[to].tb[uid] === today()) return send({ error: '오늘은 이미 눌렀습니다', th: cu[to].th || 0 });
      cu[to].tb[uid] = today();
      cu[to].th = (cu[to].th || 0) + 1;
      await KV.put(CUK, JSON.stringify(cu), CTTL);
      return send({ ok: true, th: cu[to].th });
    }

    /* ── 쪽지 ────────────────────────────────────────────
       같은 동아리 사람끼리만. 한 짝의 대화가 키 하나이고 최근 60줄만 남는다.
       받는 쪽에게는 '누구한테 뭔가 왔다'는 표시만 따로 적어 둔다(mb:) —
       그래야 방을 안 열어 봐도 빨간 표가 뜬다. */
    const pairKey = (x, y) => 'dm:' + [x, y].sort().join('~');
    if (act === 'dm') {
      const to = cut(b.to, 16);
      const list = JSON.parse((await KV.get(pairKey(uid, to))) || '[]');
      return send({ msgs: list });
    }
    if (act === 'say') {
      const to = cut(b.to, 16), x = cut(b.x, 300).trim();
      if (!x) return send({ error: '빈 쪽지' });
      const cu = await readCu();
      if (!cu[uid] || !cu[to]) return send({ error: '같은 동아리 사람에게만 보낼 수 있습니다' });
      if ((cu[to].bl || []).includes(uid)) return send({ error: '이 사람에게는 보낼 수 없습니다' });
      const k = pairKey(uid, to);
      const list = JSON.parse((await KV.get(k)) || '[]');
      list.push({ f: uid, t: Date.now(), x });
      await KV.put(k, JSON.stringify(list.slice(-60)), { expirationTtl: 60 * 60 * 24 * 30 });
      const mb = JSON.parse((await KV.get(`mb:${to}`)) || '{}');
      mb[uid] = Date.now();
      await KV.put(`mb:${to}`, JSON.stringify(mb), { expirationTtl: 60 * 60 * 24 * 30 });
      return send({ ok: true, msgs: list.slice(-60) });
    }

    return send({ error: 'bad act' });
  },
};
