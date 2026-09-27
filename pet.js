/* pet.js — 짜오(앵무) 그림판.
   왜 그림 파일이 아니라 코드로 그리나(대표님 지적 2026-09-27 저녁): 그림 생성기로 뽑으면 장마다 종·자세·각도가
   달라진다(정면·옆면·고개 꺾은 새가 섞임). 뼈대 하나(몸·날개·머리·볏·눈·부리·꼬리)를 코드로 그리고 종마다 색·볏·꼬리만
   바꾸면 **늘 같은 새**가 같은 각도(정면)로 나온다. 움직임은 부위마다 붙인 class 를 style.css 의 '짜오 움직임' 덩이가 돌린다.
   기본 종은 왕관앵무(cockatiel, vẹt mào) — 볏이 있어 기분(기쁨=볏 세움·배고픔=볏 처짐)이 한눈에 보인다. */
const PET_SPECIES = {
  cockatiel: { name: '왕관앵무', vi: 'vẹt mào', body: '#B8BDC5', belly: '#D8DCE2', wing: '#98A0A9', bar: '#F7F8FA', head: '#FFD75A', crest: '#F4C542', crestN: 3,
               cheek: '#FF8A3D', cheekR: 11, beak: '#A7ACB4', beak2: '#8B9098', tail: '#8A9199', tail2: '#A8AEB6', feet: '#B99DA3', baby: '#FFE68C', eye: '#1B1B1B', tailLen: 1, egg: '#FFF8EA' },
  budgie:    { name: '사랑앵무', vi: 'vẹt yến phụng', body: '#5BB4F0', belly: '#9AD3F8', wing: '#3F8FD2', scallop: '#1E4E7C', head: '#FFFFFF', crestN: 0,
               cheek: '#6E5BE0', cheekR: 6, beak: '#D8B98D', beak2: '#B99A70', tail: '#2E6EB4', tail2: '#5BB4F0', feet: '#9AA3AD', baby: '#EEF4F9', eye: '#1B1B1B', tailLen: .9, egg: '#EAF4FD' },
  lovebird:  { name: '모란앵무', vi: 'vẹt uyên ương', body: '#63C25C', belly: '#A5E39A', wing: '#43A64B', head: '#FF9E6E', crestN: 0,
               cheek: '#FFC7A6', cheekR: 10, beak: '#F4E8DC', beak2: '#D9CBBB', tail: '#43A64B', tail2: '#63C25C', feet: '#9AA3AD', baby: '#EAF7E3', eye: '#1B1B1B', tailLen: .55, egg: '#F0FAEC' },
  conure:    { name: '썬코뉴어', vi: 'vẹt mặt trời', body: '#FFB22E', belly: '#FFD86B', wing: '#4CAF50', head: '#FFC744', crestN: 0,
               cheek: '#FF7A1F', cheekR: 10, beak: '#2E2E2E', beak2: '#1B1B1B', tail: '#3E8E41', tail2: '#7CC57F', feet: '#7A7A7A', baby: '#FFEBB3', eye: '#1B1B1B', ring: '#FFFFFF', tailLen: 1, egg: '#FFF4DC' },
  grey:      { name: '회색앵무', vi: 'vẹt xám', body: '#8F969F', belly: '#C6CBD2', wing: '#6F7781', head: '#A2A9B1', mask: '#F2F3F5', crestN: 0,
               cheek: null, beak: '#2E2E2E', beak2: '#1B1B1B', tail: '#E53935', tail2: '#FF6B62', feet: '#7A7A7A', baby: '#DCE0E5', eye: '#1B1B1B', tailLen: .7, egg: '#F1F2F4' },
  macaw:     { name: '금강앵무', vi: 'vẹt đuôi dài', body: '#2F80ED', belly: '#FFC107', wing: '#1F5FC4', head: '#2F80ED', mask: '#F8F8F8', crestN: 0,
               cheek: null, beak: '#2E2E2E', beak2: '#1B1B1B', tail: '#1F5FC4', tail2: '#2F80ED', feet: '#7A7A7A', baby: '#DCE8FF', eye: '#1B1B1B', tailLen: 1.35, egg: '#E9F0FF' },
};
/* 먹이 그림 — 베트남 과일로 (먹이 이름이 곧 낱말 하나). (0,0) 가운데 32×32 */
const PET_FOOD_ICON = {
  seed:   '<ellipse cx="0" cy="0" rx="7" ry="11" fill="#5C5142"/><path d="M0 -9 v18 M-3.2 -8 v16 M3.2 -8 v16" stroke="#D9CBB0" stroke-width="1.6" stroke-linecap="round"/>',
  banana: '<path d="M-13 2 Q-2 15 13 -1 Q11 9 -1 13 Q-11 13 -13 2Z" fill="#FFD54F" stroke="#D9A400" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 -1 l3 -3" stroke="#7A5C1E" stroke-width="2.2" stroke-linecap="round"/>',
  mango:  '<ellipse cx="0" cy="1" rx="10" ry="12.5" fill="#FF9F43" transform="rotate(-22)"/><ellipse cx="-3" cy="-2" rx="4" ry="6" fill="#FFC078" transform="rotate(-22)" opacity=".8"/><path d="M4 -12 q7 -5 11 -1" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" fill="none"/>',
  dragon: '<ellipse cx="0" cy="0" rx="9.5" ry="12.5" fill="#E91E63"/><path d="M-6 -9 l-5 -5 M6 -9 l5 -5 M-9 1 l-5 -2 M9 1 l5 -2 M-6 10 l-4 4 M6 10 l4 4" stroke="#66BB6A" stroke-width="2.6" stroke-linecap="round"/>',
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
   o.food: 먹는 중 보여 줄 먹이 열쇠 · o.hatch: 2단계 위에 껍데기 윗부분을 얹어 '깨는' 움직임을 시킨다 */
function petSvg(stage, spKey, o) {
  o = o || {};
  const P = PET_SPECIES[spKey] || PET_SPECIES.cockatiel;
  const id = 'pg' + (petSvg._n = (petSvg._n || 0) + 1);
  const eggFill = P.egg || '#FFF8EA', eggLine = petShade(eggFill, .14);
  const shadow = '<ellipse class="pt-shadow" cx="100" cy="192" rx="42" ry="5.5" fill="rgba(0,0,0,.09)"/>';

  /* 볏 — 부채꼴 n 깃, 가운데가 가장 높다. 밑동은 머리 원 안에 숨는다 */
  const feather = (bx, tx, ty) =>
    `<path d="M${bx - 5} 54 C${bx - 7} ${(54 + ty) / 2} ${tx - 9} ${ty + 16} ${tx} ${ty} C${tx + 3} ${ty + 16} ${bx + 7} ${(54 + ty) / 2} ${bx + 5} 54 Z" fill="${P.crest || P.head}"/>`;
  const crest = n => n >= 3 ? feather(94, 78, 12) + feather(106, 122, 12) + feather(100, 100, 2)
                : n === 2 ? feather(96, 88, 8) + feather(104, 114, 6)
                : n === 1 ? feather(100, 102, 10) : '';

  const eye = (cx, cy, r, lidFill) => `<g class="pt-eye">
      ${P.ring ? `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="${P.ring}"/>` : ''}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.eye}"/><circle cx="${cx + r * .37}" cy="${cy - r * .37}" r="${r * .36}" fill="#fff"/>
      <path class="pt-smile" d="M${cx - r - .5} ${cy + 3} Q${cx} ${cy - r - 1} ${cx + r + .5} ${cy + 3}" fill="none" stroke="${P.eye}" stroke-width="3" stroke-linecap="round"/>
      <rect class="pt-lid" x="${cx - r - 2}" y="${cy - r - 2.5}" width="${r * 2 + 4}" height="${r * 2 + 5}" rx="${r + 2}" fill="${lidFill}"/>
    </g>`;

  const wing = side => {
    const s = side === 'l' ? 1 : -1, cx = 100 - 43 * s, rot = 14 * s;
    return `<g class="pt-wing ${side}">
      <ellipse cx="${cx}" cy="136" rx="15" ry="31" fill="${P.wing}" transform="rotate(${rot} ${cx} 136)"/>
      ${P.bar ? `<ellipse cx="${cx}" cy="142" rx="5" ry="15" fill="${P.bar}" transform="rotate(${rot} ${cx} 142)"/>` : ''}
      ${P.scallop ? `<g fill="none" stroke="${P.scallop}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${rot} ${cx} 136)">
        <path d="M${cx - 9} 121 q9 -5 18 0"/><path d="M${cx - 11} 133 q11 -5 22 0"/><path d="M${cx - 11} 145 q11 -5 22 0"/><path d="M${cx - 8} 157 q8 -4 16 0"/></g>` : ''}
    </g>`;
  };
  const cap = `<g class="pt-cap"><path d="M58 48 L100 32 L142 48 L100 64 Z" fill="#1E1E1E"/><path d="M78 54 v9 q22 13 44 0 v-9 Z" fill="#1E1E1E"/>
      <path d="M142 48 v18" stroke="#FF8A3D" stroke-width="3" stroke-linecap="round"/><circle cx="142" cy="68" r="4" fill="#FF8A3D"/></g>`;

  /* 어른 뼈대 — crestN·tailLen 만 단계별로 바꾼다 */
  const bird = (crestN, tailLen, hat) => {
    /* 꼬리 — 정면에서는 몸 뒤로 곧게 늘어진다(세 깃, 가운데가 가장 길다). 옆으로 벌리면 다리처럼 보인다 */
    const tail = `<g class="pt-tail">
      <rect x="94" y="146" width="12" height="${Math.round(40 * tailLen)}" rx="6" fill="${P.tail}" transform="rotate(9 100 148)"/>
      <rect x="94" y="146" width="12" height="${Math.round(40 * tailLen)}" rx="6" fill="${P.tail}" transform="rotate(-9 100 148)"/>
      <rect x="94" y="148" width="12" height="${Math.round(48 * tailLen)}" rx="6" fill="${P.tail2}"/></g>`;
    const body = `<g class="pt-body">
      <ellipse cx="100" cy="134" rx="45" ry="43" fill="${P.body}"/>
      <ellipse cx="100" cy="145" rx="28" ry="27" fill="${P.belly}"/>
      ${wing('l')}${wing('r')}</g>`;
    /* 발 — 짧은 다리 + 앞발가락 셋 */
    const foot = cx => `<rect x="${cx - 5.5}" y="168" width="11" height="14" rx="5"/>
      <path d="M${cx - 10} 187 q2 -6 6 -6 t6 6 M${cx - 4} 188 q2 -7 4 -7 t4 7 M${cx - 2} 187 q2 -6 6 -6 t6 6" fill="none" stroke="${P.feet}" stroke-width="4" stroke-linecap="round"/>`;
    const feet = `<g class="pt-feet" fill="${P.feet}">${foot(89)}${foot(111)}</g>`;
    const lid = P.mask || P.head;
    const head = `<g class="pt-head">
      ${crestN ? `<g class="pt-crest">${crest(crestN)}</g>` : ''}
      <circle cx="100" cy="80" r="40" fill="${P.head}"/>
      ${P.mask ? `<ellipse cx="100" cy="88" rx="30" ry="24" fill="${P.mask}"/>` : ''}
      ${P.cheek ? `<circle cx="70" cy="96" r="${P.cheekR}" fill="${P.cheek}"/><circle cx="130" cy="96" r="${P.cheekR}" fill="${P.cheek}"/>` : ''}
      ${eye(85, 78, 6.5, lid)}${eye(115, 78, 6.5, lid)}
      <path class="pt-beak" d="M90 94 Q100 86 110 94 L106 106 Q100 111 94 106 Z" fill="${P.beak}"/>
      <path class="pt-beakb" d="M95 106 Q100 109 105 106 L104 112 Q100 115 96 112 Z" fill="${P.beak2}"/>
      ${hat ? cap : ''}
      <g class="pt-zz" fill="${P.eye}" font-family="system-ui,sans-serif" font-weight="800"><text x="146" y="54" font-size="16">z</text><text x="160" y="38" font-size="12">z</text></g>
    </g>`;
    return shadow + tail + body + feet + head;
  };

  /* 갓 깬 아기 — 노란 솜털 공, 반쪽 껍데기 안 */
  const chick = () => {
    const fl = P.baby, fl2 = petShade(fl, .12);
    return `<g class="pt-chick">
      <g class="pt-body"><circle cx="100" cy="146" r="33" fill="${fl}"/>
        <ellipse cx="71" cy="146" rx="9" ry="16" fill="${fl2}" transform="rotate(14 71 146)"/>
        <ellipse cx="129" cy="146" rx="9" ry="16" fill="${fl2}" transform="rotate(-14 129 146)"/></g>
      <g class="pt-head">
        ${P.crestN ? `<g class="pt-crest"><path d="M96 76 C95 62 97 52 106 42 C104 54 104 64 104 76 Z" fill="${fl2}"/></g>` : ''}
        <circle cx="100" cy="102" r="35" fill="${fl}"/>
        ${P.cheek ? `<circle cx="74" cy="116" r="8" fill="${P.cheek}"/><circle cx="126" cy="116" r="8" fill="${P.cheek}"/>` : ''}
        ${eye(87, 100, 7.5, fl)}${eye(113, 100, 7.5, fl)}
        <path class="pt-beak" d="M92 117 Q100 112 108 117 L105 126 Q100 130 95 126 Z" fill="${P.beak}"/>
        <path class="pt-beakb" d="M96 126 Q100 128 104 126 L103 131 Q100 133 97 131 Z" fill="${P.beak2}"/>
        <g class="pt-zz" fill="${P.eye}" font-family="system-ui,sans-serif" font-weight="800"><text x="140" y="76" font-size="16">z</text><text x="154" y="60" font-size="12">z</text></g>
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
  else if (stage === 3) inner = `<g transform="translate(18 34) scale(.82)">${bird(Math.min(P.crestN, 2), P.tailLen * .6, false)}</g>`;
  else if (stage === 4) inner = bird(P.crestN, P.tailLen, false);
  else inner = bird(P.crestN, P.tailLen, true);
  // 자리 옮김은 바깥 g 에, 움직임 class 는 안쪽 g 에 — CSS transform 이 SVG transform 속성을 덮어쓰기 때문(같은 g 에 두면 자리가 0,0 이 된다)
  const food = o.food && PET_FOOD_ICON[o.food] ? `<g transform="translate(100 166)"><g class="pt-food">${PET_FOOD_ICON[o.food]}</g></g>` : '';
  return `<svg class="ptsvg st${stage} sp-${spKey || 'cockatiel'}" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${o.label || P.name}">${inner}${food}</svg>`;
}
