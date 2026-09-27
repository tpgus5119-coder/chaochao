/* pet.js — 짜오(앵무) 그림판 (3판, 2026-09-27 저녁 — 대표님이 보내 주신 파란 앵무 그림의 짜임을 그대로 따른다).
   왜 그림 파일이 아니라 코드로 그리나: 생성기 그림은 장마다 종·자세·각도가 달라진다. 뼈대 하나(머리 덮개·얼굴·흰 눈·부리·볏·몸·흰 배·날개·발)를
   코드로 그리고 종마다 색만 바꾸면 **늘 같은 새**가 같은 각도(정면)로 나온다. 움직임은 부위 class(pt-*)를 style.css 의 '짜오 움직임' 덩이가 돌린다.
   3판의 짜임(참고 그림에서 옮긴 것): 머리 위는 진한 덮개, 얼굴은 밝은 색이 두 볼로 갈라져 가운데가 뾰족하게 파임 · 눈은 흰자 + 남색 눈동자 + 빛 둘 ·
   주황 부리는 벌어져 웃고 안은 어둡고 혀가 분홍 · 볏은 불꽃 셋 · 몸은 밝은 색에 흰 배 · 날개는 양옆으로 펴고 끝이 깃 셋으로 갈라짐 · 발은 주황 세 발가락.
   종 목록·값은 대표님 지시: 왕관앵무(가장 작다 → 처음 알)·퀘이커·코뉴어·회색앵무·청금강·홍금강. 클수록 비싸고, 청금강=홍금강.
   'chao' 는 앱 마스코트(아이콘의 파란 새) — 상점에는 없다. */
const PET_SPECIES = {
  chao:      { name: '짜오', vi: 'Chào', cm: 0, price: 0,
               cap: '#0E5FC9', face: '#5DB9F0', body: '#5DB9F0', belly: '#FFFFFF', wing: '#0E5FC9', crest: '#F5843A', crestN: 3,
               cheek: '#3F9FD8', beak: '#F5843A', beak2: '#E2712B', feet: '#F5843A', tail: '#0E5FC9', tailH: 10, baby: '#BFE5FA', egg: '#EAF4FD' },
  cockatiel: { name: '왕관앵무', vi: 'vẹt mào', cm: 32, price: 0,
               cap: '#F3C63E', face: '#FFE36B', body: '#C9CDD3', belly: '#FFFFFF', wing: '#9AA1AA', bar: '#F7F8FA', crest: '#F3C63E', crestN: 3,
               cheek: '#FF8A3D', cheekSolid: 1, beak: '#B0B5BD', beak2: '#8E939B', feet: '#C29CA5', tail: '#9EA5AE', tailH: 22, baby: '#FFE98F', egg: '#FFF8EA' },
  quaker:    { name: '퀘이커앵무', vi: 'vẹt thầy tu', cm: 29, price: 300,
               cap: '#4CAF50', face: '#DDE1DA', body: '#74C36A', belly: '#E6E9E3', wing: '#3E8E41', tip: '#4A8FD8', crestN: 0,
               cheek: '#C5CBC4', beak: '#E4B77E', beak2: '#C79A62', feet: '#9AA3AD', tail: '#3E8E41', tailH: 16, baby: '#E6F3E1', egg: '#EFF8EC' },
  conure:    { name: '썬코뉴어', vi: 'vẹt mặt trời', cm: 30, price: 500,
               cap: '#FF9800', face: '#FFC744', body: '#FFC83D', belly: '#FFE082', wing: '#4CAF50', tip: '#2F80ED', crestN: 0,
               cheek: '#FF7A1F', beak: '#2E2E2E', beak2: '#1B1B1B', feet: '#7A7A7A', tail: '#4CAF50', tailH: 18, baby: '#FFEAB0', egg: '#FFF4DC' },
  grey:      { name: '회색앵무', vi: 'vẹt xám', cm: 33, price: 800,
               cap: '#8E959E', face: '#F2F3F5', body: '#A2A9B1', belly: '#DDE0E4', wing: '#6F7781', crestN: 0,
               cheek: '#CFD3D8', beak: '#2E2E2E', beak2: '#1B1B1B', feet: '#7A7A7A', tail: '#E53935', tailH: 14, baby: '#E0E3E7', egg: '#F1F2F4' },
  macawblue: { name: '청금강앵무', vi: 'vẹt xanh vàng', cm: 86, price: 1200,
               cap: '#1F5FC4', face: '#F8F8F8', body: '#2F80ED', belly: '#FFC107', wing: '#1F5FC4', tip: '#3CB371', crestN: 0,
               cheek: '#E3E6EA', beak: '#2E2E2E', beak2: '#1B1B1B', feet: '#7A7A7A', tail: '#1F5FC4', tailH: 24, baby: '#DCE8FF', egg: '#E9F0FF' },
  macawred:  { name: '홍금강앵무', vi: 'vẹt đỏ', cm: 85, price: 1200,
               cap: '#C62828', face: '#FAFAFA', body: '#E53935', belly: '#FFCDD2', wing: '#E53935', band: '#FFC107', tip: '#2F80ED', crestN: 0,
               cheek: '#F5CFCF', beak: '#F1EBE2', beak2: '#2B2B2B', feet: '#7A7A7A', tail: '#D32F2F', tailH: 24, baby: '#FFDCDC', egg: '#FFECEC' },
};
const PET_ORDER = ['cockatiel', 'quaker', 'conure', 'grey', 'macawblue', 'macawred'];
/* 먹이 그림 — 씨앗·베트남 과일 17가지 (먹이 이름이 곧 단어 하나). (0,0) 가운데 32×32 */
const PET_FOOD_ICON = {
  seed:   '<ellipse cx="0" cy="0" rx="7" ry="11" fill="#5C5142"/><path d="M0 -9 v18 M-3.2 -8 v16 M3.2 -8 v16" stroke="#D9CBB0" stroke-width="1.6" stroke-linecap="round"/>',
  millet: '<path d="M0 12 V-2" stroke="#8BAA3C" stroke-width="2.2" stroke-linecap="round"/><g fill="#E8C547"><circle cx="-5" cy="-8" r="3.4"/><circle cx="2" cy="-11" r="3.4"/><circle cx="6" cy="-4" r="3.4"/><circle cx="-1" cy="-3" r="3.4"/><circle cx="-6" cy="1" r="3.4"/><circle cx="4" cy="3" r="3.4"/></g>',
  banana: '<path d="M-13 2 Q-2 15 13 -1 Q11 9 -1 13 Q-11 13 -13 2Z" fill="#FFD54F" stroke="#D9A400" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 -1 l3 -3" stroke="#7A5C1E" stroke-width="2.2" stroke-linecap="round"/>',
  apple:  '<circle cx="0" cy="2" r="11" fill="#E53935"/><circle cx="-4" cy="-2" r="3.5" fill="#FF8A80" opacity=".7"/><path d="M0 -9 v-4" stroke="#6D4C41" stroke-width="2.2" stroke-linecap="round"/><path d="M1 -11 q6 -4 8 1 q-6 3 -8 -1z" fill="#4CAF50"/>',
  orange: '<circle cx="0" cy="1" r="11.5" fill="#FF9800"/><circle cx="-4" cy="-3" r="3.5" fill="#FFCC80" opacity=".7"/><path d="M1 -10 q6 -4 8 1 q-6 3 -8 -1z" fill="#4CAF50"/>',
  guava:  '<circle cx="0" cy="2" r="11" fill="#7CB342"/><circle cx="-4" cy="-2" r="3.5" fill="#C5E1A5" opacity=".7"/><path d="M0 -9 v-4" stroke="#558B2F" stroke-width="2.2" stroke-linecap="round"/><path d="M1 -11 q6 -4 8 1 q-6 3 -8 -1z" fill="#388E3C"/>',
  grape:  '<path d="M0 -13 v-2" stroke="#6D4C41" stroke-width="2.2" stroke-linecap="round"/><g fill="#7E57C2"><circle cx="-5" cy="-7" r="4"/><circle cx="5" cy="-7" r="4"/><circle cx="0" cy="-9" r="4"/><circle cx="-7" cy="0" r="4"/><circle cx="0" cy="-1" r="4"/><circle cx="7" cy="0" r="4"/><circle cx="-4" cy="7" r="4"/><circle cx="4" cy="7" r="4"/><circle cx="0" cy="12" r="3.6"/></g>',
  strawberry: '<path d="M0 13 C-11 6 -12 -4 -6 -7 Q0 -9 6 -7 C12 -4 11 6 0 13Z" fill="#E53935"/><g fill="#FFF59D"><circle cx="-4" cy="0" r="1.2"/><circle cx="3" cy="-2" r="1.2"/><circle cx="0" cy="5" r="1.2"/><circle cx="5" cy="4" r="1.2"/><circle cx="-5" cy="6" r="1.2"/></g><path d="M-7 -8 l4 3 l3 -5 l3 5 l4 -3 l-2 5 h-10z" fill="#4CAF50"/>',
  mango:  '<ellipse cx="0" cy="1" rx="10" ry="12.5" fill="#FF9F43" transform="rotate(-22)"/><ellipse cx="-3" cy="-2" rx="4" ry="6" fill="#FFC078" transform="rotate(-22)" opacity=".8"/><path d="M4 -12 q7 -5 11 -1" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" fill="none"/>',
  watermelon: '<path d="M-14 -3 A14 14 0 0 0 14 -3 Z" fill="#43A047"/><path d="M-11 -3 A11 11 0 0 0 11 -3 Z" fill="#FF5252"/><g fill="#263238"><ellipse cx="-4" cy="1" rx="1.2" ry="2"/><ellipse cx="3" cy="2" rx="1.2" ry="2"/><ellipse cx="0" cy="6" rx="1.2" ry="2"/></g>',
  papaya: '<ellipse cx="0" cy="2" rx="8.5" ry="13" fill="#FFA726"/><ellipse cx="0" cy="4" rx="4" ry="7" fill="#FF7043" opacity=".6"/><path d="M0 -11 q0 -4 3 -5" stroke="#4CAF50" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
  coconut: '<circle cx="0" cy="1" r="12" fill="#795548"/><g fill="#3E2723"><circle cx="-3.5" cy="-4" r="1.8"/><circle cx="3.5" cy="-4" r="1.8"/><circle cx="0" cy="2" r="1.8"/></g>',
  dragon: '<ellipse cx="0" cy="0" rx="9.5" ry="12.5" fill="#E91E63"/><path d="M-6 -9 l-5 -5 M6 -9 l5 -5 M-9 1 l-5 -2 M9 1 l5 -2 M-6 10 l-4 4 M6 10 l4 4" stroke="#66BB6A" stroke-width="2.6" stroke-linecap="round"/>',
  lychee: '<circle cx="0" cy="2" r="11" fill="#E53935"/><g fill="#B71C1C"><circle cx="-5" cy="-2" r="1.3"/><circle cx="2" cy="-5" r="1.3"/><circle cx="5" cy="3" r="1.3"/><circle cx="-2" cy="6" r="1.3"/><circle cx="-6" cy="5" r="1.3"/><circle cx="4" cy="8" r="1.3"/></g><path d="M0 -9 v-5" stroke="#6D4C41" stroke-width="2" stroke-linecap="round"/><path d="M1 -12 q6 -3 8 2 q-6 2 -8 -2z" fill="#4CAF50"/>',
  rambutan: '<g stroke="#C62828" stroke-width="1.8" stroke-linecap="round"><path d="M-8 -8 l-4 -4 M0 -11 l0 -5 M8 -8 l4 -4 M-11 1 l-5 0 M11 1 l5 0 M-8 9 l-4 4 M8 9 l4 4 M0 12 l0 5"/></g><circle cx="0" cy="1" r="10" fill="#E53935"/>',
  mangosteen: '<circle cx="0" cy="3" r="11" fill="#6A1B9A"/><path d="M-7 -6 l3 -3 h8 l3 3z" fill="#7CB342"/><path d="M0 -9 v-4" stroke="#558B2F" stroke-width="2.2" stroke-linecap="round"/>',
  durian: '<ellipse cx="0" cy="1" rx="11" ry="12.5" fill="#C0CA33"/><g fill="#9E9D24"><path d="M-9 -8 l-3 -4 l5 1z"/><path d="M0 -11 l0 -5 l3 3z"/><path d="M9 -8 l3 -4 l-5 1z"/><path d="M-12 2 l-5 -1 l4 4z"/><path d="M12 2 l5 -1 l-4 4z"/><path d="M-8 11 l-3 4 l5 -1z"/><path d="M8 11 l3 4 l-5 -1z"/></g>',
};
function petFoodSvg(k, size) {
  return `<svg viewBox="-16 -16 32 32" width="${size || 28}" height="${size || 28}" aria-hidden="true">${PET_FOOD_ICON[k] || ''}</svg>`;
}
/* 색을 어둡게(k>0)·밝게(k<0) */
function petShade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(k > 0 ? c * (1 - k) : c + (255 - c) * -k)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join('');
}
/* 단계: 0 알 · 1 금 간 알 · 2 갓 깬 아기(반쪽 껍데기 안) · 3 어린 · 4 어른 · 5 박사(학사모)
   o.food: 먹는 중 보여 줄 먹이 열쇠 · o.hatch: 2단계 위에 껍데기 윗부분을 얹어 '깨는' 움직임을 시킨다 · o.label: aria-label */
function petSvg(stage, spKey, o) {
  o = o || {};
  const P = PET_SPECIES[spKey] || PET_SPECIES.cockatiel;
  const id = 'pg' + (petSvg._n = (petSvg._n || 0) + 1);
  const PUPIL = '#1E2A44', MOUTH = '#7A2A2A', TONGUE = '#F48FB1';
  const eggFill = P.egg || '#FFF8EA', eggLine = petShade(eggFill, .14);
  const shadow = '<ellipse class="pt-shadow" cx="100" cy="192" rx="36" ry="5" fill="rgba(0,0,0,.09)"/>';

  /* 볏 — 불꽃 셋, 위로 뻗어 뒤(왼쪽)로 휜다. 밑동은 머리 덮개 안에 숨는다 */
  const flame = (bx, tx, ty, w) => `<path d="M${bx - w} 46 C ${bx - w - 2} ${(46 + ty) / 2 + 4}, ${tx - 8} ${ty + 12}, ${tx} ${ty} C ${tx + 6} ${ty + 14}, ${bx + w + 4} ${(46 + ty) / 2}, ${bx + w} 46 Z" fill="${P.crest}"/>`;
  const crest = n => n >= 3 ? flame(106, 118, 14, 5) + flame(92, 74, 12, 5) + flame(99, 94, 0, 6)
                : n === 2 ? flame(94, 78, 14, 5) + flame(102, 100, 4, 6)
                : n === 1 ? flame(100, 96, 12, 4) : '';
  /* 눈 — 흰자 + 남색 눈동자 + 큰 빛·작은 빛. 웃을 때는 ^ 로 바뀐다. 눈꺼풀은 얼굴색 */
  const eye = (cx, cy, r, lidFill) => `<g class="pt-eye">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF"/>
      <circle cx="${cx + r * .05}" cy="${cy + r * .08}" r="${r * .68}" fill="${PUPIL}"/>
      <circle cx="${cx + r * .32}" cy="${cy - r * .3}" r="${r * .26}" fill="#fff"/><circle cx="${cx - r * .28}" cy="${cy + r * .36}" r="${r * .13}" fill="#fff"/>
      <path class="pt-smile" d="M${cx - r} ${cy + 4} Q${cx} ${cy - r - 3} ${cx + r} ${cy + 4}" fill="none" stroke="${PUPIL}" stroke-width="3.6" stroke-linecap="round"/>
      <rect class="pt-lid" x="${cx - r - 2}" y="${cy - r - 2.5}" width="${r * 2 + 4}" height="${r * 2 + 5}" rx="${r + 2}" fill="${lidFill}"/>
    </g>`;
  /* 날개 — 양옆으로 펴고 끝이 깃 셋으로 갈라진다. 종에 따라 흰 띠·노란 띠·파란 깃끝 */
  const wing = side => {
    const s = side === 'l' ? 1 : -1, ax = 100 - 30 * s;          // 어깨
    const P2 = (x, y) => `${100 - (100 - x) * s} ${y}`;           // 왼쪽 좌표를 거울로
    const body = `<path d="M${P2(70, 122)} C ${P2(58, 106)} ${P2(36, 104)} ${P2(26, 116)} L ${P2(38, 150)} C ${P2(50, 150)} ${P2(64, 142)} ${P2(72, 134)} Z" fill="${P.wing}"/>`;
    const tips = `<g fill="${P.tip || P.wing}"><circle cx="${100 - (100 - 27) * s}" cy="118" r="7"/><circle cx="${100 - (100 - 25) * s}" cy="131" r="7"/><circle cx="${100 - (100 - 31) * s}" cy="144" r="7"/></g>`;
    const band = P.band ? `<path d="M${P2(60, 118)} C ${P2(50, 112)} ${P2(40, 114)} ${P2(34, 122)} L ${P2(42, 140)} C ${P2(52, 138)} ${P2(60, 132)} ${P2(64, 126)} Z" fill="${P.band}"/>` : '';
    const bar = P.bar ? `<path d="M${P2(56, 124)} C ${P2(48, 122)} ${P2(42, 126)} ${P2(40, 132)} L ${P2(46, 140)} C ${P2(52, 136)} ${P2(56, 130)} ${P2(56, 124)} Z" fill="${P.bar}"/>` : '';
    return `<g class="pt-wing ${side}">${body}${tips}${band}${bar}</g>`;
  };
  const cap = `<g class="pt-cap"><path d="M52 50 L100 32 L148 50 L100 68 Z" fill="#1E1E1E"/><path d="M74 56 v10 q26 14 52 0 v-10 Z" fill="#1E1E1E"/>
      <path d="M148 50 v18" stroke="#FF8A3D" stroke-width="3" stroke-linecap="round"/><circle cx="148" cy="70" r="4" fill="#FF8A3D"/></g>`;
  const zz = (x, y) => `<g class="pt-zz" fill="${PUPIL}" font-family="system-ui,sans-serif" font-weight="800"><text x="${x}" y="${y}" font-size="16">z</text><text x="${x + 14}" y="${y - 16}" font-size="12">z</text></g>`;
  /* 부리 — 주황, 벌어져 웃는다(안은 어둡고 혀는 분홍). 콧구멍 둘. 아래 부리는 씹을 때 움직인다 */
  const beak = (cx, cy, k) => `
      <path class="pt-beak" d="M${cx - 11 * k} ${cy} C ${cx - 11 * k} ${cy - 12 * k}, ${cx + 11 * k} ${cy - 12 * k}, ${cx + 11 * k} ${cy} C ${cx + 11 * k} ${cy + 9 * k}, ${cx + 5 * k} ${cy + 14 * k}, ${cx} ${cy + 14 * k} C ${cx - 5 * k} ${cy + 14 * k}, ${cx - 11 * k} ${cy + 9 * k}, ${cx - 11 * k} ${cy} Z" fill="${P.beak}"/>
      <g fill="${petShade(P.beak, .28)}"><circle cx="${cx - 4 * k}" cy="${cy - 5 * k}" r="${1.4 * k}"/><circle cx="${cx + 4 * k}" cy="${cy - 5 * k}" r="${1.4 * k}"/></g>
      <path d="M${cx - 8 * k} ${cy + 4 * k} Q ${cx} ${cy + 15 * k} ${cx + 8 * k} ${cy + 4 * k} Z" fill="${MOUTH}"/>
      <ellipse cx="${cx}" cy="${cy + 9.5 * k}" rx="${4.2 * k}" ry="${2.6 * k}" fill="${TONGUE}"/>
      <path class="pt-beakb" d="M${cx - 7 * k} ${cy + 8 * k} Q ${cx} ${cy + 13 * k} ${cx + 7 * k} ${cy + 8 * k} L ${cx + 5 * k} ${cy + 16 * k} Q ${cx} ${cy + 19 * k} ${cx - 5 * k} ${cy + 16 * k} Z" fill="${P.beak2}"/>`;
  const foot = cx => `<rect x="${cx - 3}" y="166" width="6" height="16" rx="2" fill="${P.feet}"/>
      <path d="M${cx - 12} 186 c1 -6 6 -8 12 -8 s11 2 12 8 c-3 3 -7 4 -12 4 s-9 -1 -12 -4 Z" fill="${P.feet}"/>
      <path d="M${cx - 4} 181 v6 M${cx + 4} 181 v6" stroke="${petShade(P.feet, .22)}" stroke-width="1.6" stroke-linecap="round"/>`;

  /* 어른 뼈대 — crestN·tailH 만 단계별로 바꾼다 */
  const bird = (crestN, tailH, hat) => {
    const tail = tailH ? `<g class="pt-tail"><rect x="92" y="164" width="16" height="${tailH + 12}" rx="8" fill="${P.tail}"/></g>` : '';
    const feet = `<g class="pt-feet">${foot(89)}${foot(111)}</g>`;
    const body = `<g class="pt-body">
      <ellipse cx="100" cy="142" rx="38" ry="40" fill="${P.body}"/>
      <ellipse cx="100" cy="156" rx="25" ry="24" fill="${P.belly}"/>
      ${wing('l')}${wing('r')}</g>`;
    const head = `<g class="pt-head">
      ${crestN ? `<g class="pt-crest">${crest(crestN)}</g>` : ''}
      <circle cx="100" cy="84" r="48" fill="${P.cap}"/>
      <g fill="${P.face}"><circle cx="74" cy="94" r="28"/><circle cx="126" cy="94" r="28"/><path d="M52 94 a48 48 0 0 0 96 0 Z"/></g>
      ${P.cheek ? (P.cheekSolid ? `<circle cx="64" cy="112" r="9" fill="${P.cheek}"/><circle cx="136" cy="112" r="9" fill="${P.cheek}"/>`
                                 : `<ellipse cx="66" cy="114" rx="10" ry="6.5" fill="${P.cheek}"/><ellipse cx="134" cy="114" rx="10" ry="6.5" fill="${P.cheek}"/>`) : ''}
      ${eye(77, 92, 14, P.face)}${eye(123, 92, 14, P.face)}
      ${beak(100, 100, 1)}
      ${hat ? cap : ''}
      ${zz(152, 60)}
    </g>`;
    return shadow + tail + feet + body + head;
  };

  /* 갓 깬 아기 — 솜털 공, 반쪽 껍데기 안. 눈이 더 크다 */
  const chick = () => {
    const fl = P.baby, fl2 = petShade(fl, .12);
    return `<g class="pt-chick">
      <g class="pt-body"><circle cx="100" cy="150" r="30" fill="${fl}"/>
        <ellipse cx="74" cy="150" rx="8" ry="14" fill="${fl2}" transform="rotate(16 74 150)"/>
        <ellipse cx="126" cy="150" rx="8" ry="14" fill="${fl2}" transform="rotate(-16 126 150)"/></g>
      <g class="pt-head">
        ${P.crestN ? `<g class="pt-crest"><path d="M96 70 C 94 58, 98 48, 104 40 C 108 52, 106 62, 104 72 Z" fill="${P.crest}"/></g>` : ''}
        <circle cx="100" cy="104" r="38" fill="${fl}"/>
        ${P.cheek ? `<ellipse cx="70" cy="121" rx="8" ry="5" fill="${P.cheekSolid ? P.cheek : '#FF9E9E'}" opacity="${P.cheekSolid ? 1 : .5}"/><ellipse cx="130" cy="121" rx="8" ry="5" fill="${P.cheekSolid ? P.cheek : '#FF9E9E'}" opacity="${P.cheekSolid ? 1 : .5}"/>` : ''}
        ${eye(84, 104, 12, fl)}${eye(116, 104, 12, fl)}
        ${beak(100, 117, .7)}
        ${zz(144, 80)}
      </g></g>`;
  };
  const zig = 'M50 152 l10 -12 10 12 10 -12 10 12 10 -12 10 12 10 -12 10 12 10 -12 10 12';
  const shellBot = `<path class="pt-shellbot" d="${zig} C150 184 130 194 100 194 C70 194 50 184 50 152 Z" fill="${eggFill}" stroke="${eggLine}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const shellTop = `<path class="pt-eggtop" d="${zig} C152 100 136 40 100 40 C64 40 48 100 50 152 Z" fill="${eggFill}" stroke="${eggLine}" stroke-width="2.5" stroke-linejoin="round"/>`;

  const egg = crack => `<defs><radialGradient id="${id}" cx="38%" cy="28%" r="78%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${petShade(eggFill, .06)}"/></radialGradient></defs>
    ${shadow}<g class="pt-egg">
    <path d="M100 26 C144 26 164 86 162 132 C160 178 132 192 100 192 C68 192 40 178 38 132 C36 86 56 26 100 26 Z" fill="url(#${id})" stroke="${eggLine}" stroke-width="2.5"/>
    <g fill="${petShade(eggFill, .09)}"><circle cx="72" cy="92" r="4"/><circle cx="126" cy="140" r="3.4"/><circle cx="64" cy="142" r="2.8"/><circle cx="136" cy="96" r="2.6"/></g>
    ${crack ? `<path class="pt-crack" d="M114 40 l-11 17 13 14 -15 19 12 15 -9 14" fill="none" stroke="${petShade(eggFill, .32)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    </g>`;

  let inner;
  if (stage === 0) inner = egg(false);
  else if (stage === 1) inner = egg(true);
  else if (stage === 2) inner = shadow + chick() + shellBot + (o.hatch ? shellTop : '');
  else if (stage === 3) inner = `<g transform="translate(16 32) scale(.84)">${bird(Math.min(P.crestN, 2), Math.round(P.tailH * .6), false)}</g>`;
  else if (stage === 4) inner = bird(P.crestN, P.tailH, false);
  else inner = bird(P.crestN, P.tailH, true);
  // 자리 옮김은 바깥 g 에, 움직임 class 는 안쪽 g 에 — CSS transform 이 SVG transform 속성을 덮어쓰기 때문
  const food = o.food && PET_FOOD_ICON[o.food] ? `<g transform="translate(100 172)"><g class="pt-food">${PET_FOOD_ICON[o.food]}</g></g>` : '';
  return `<svg class="ptsvg st${stage} sp-${spKey || 'cockatiel'}" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${o.label || P.name}">${inner}${food}</svg>`;
}
