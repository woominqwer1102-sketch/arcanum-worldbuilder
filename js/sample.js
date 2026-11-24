/* =========================================================
   ARCANUM · sample world "아르카디아 연대기" + sample map
   ========================================================= */
(function (global) {
  'use strict';

  /* Fantasy parchment map drawn as vector SVG so it stays crisp
     at any phone size and adds almost no weight to the app. */
  function SampleMapSVG() {
    const ink = '#4a3a26';
    const inkSoft = '#6d5940';
    const land = '#f1e5c4';

    const tree = (x, y, s) =>
      '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + ink + '" opacity=".72">' +
      '<path d="M0 -12 L6 -2 L2.5 -2 L8 6 L-8 6 L-2.5 -2 L-6 -2 Z"/>' +
      '<rect x="-1" y="6" width="2" height="5" fill="' + inkSoft + '"/></g>';

    const mountain = (x, y, s) =>
      '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + ink + '" stroke-width="2" stroke-linejoin="round" opacity=".8">' +
      '<path d="M0 0 L14 -26 L28 0"/><path d="M8 -15 L14 -20 L20 -15" stroke="' + inkSoft + '"/>' +
      '<path d="M-18 4 L-6 -16 L6 4"/><path d="M20 6 L34 -18 L48 6"/><path d="M-46 8 L-34 -14 L-22 8"/></g>';

    const trees = [
      [596, 316, 1], [626, 300, .85], [654, 322, 1.1], [686, 300, .95], [716, 326, 1.05],
      [604, 356, .9], [638, 344, 1.05], [672, 362, .9], [706, 350, 1], [736, 372, .95],
      [590, 396, .85], [624, 386, 1], [660, 402, .9], [700, 392, 1.05], [726, 414, .9],
      [612, 430, .9], [648, 424, 1], [684, 436, .85]
    ].map((t) => tree(t[0], t[1], t[2])).join('');

    const mountains = [
      [236, 268, 1.1], [292, 240, 1.25], [346, 268, 1.05], [398, 236, .95],
      [262, 306, .9], [316, 310, .95], [368, 300, .85], [206, 320, .8]
    ].map((m) => mountain(m[0], m[1], m[2])).join('');

    const desertDots = Array.from({ length: 64 }).map((_, i) => {
      const x = 636 + ((i * 37) % 150);
      const y = 664 + ((i * 53) % 168);
      return '<circle cx="' + x + '" cy="' + y + '" r="' + (i % 4 === 0 ? 2.2 : 1.4) + '" fill="' + inkSoft + '" opacity=".45"/>';
    }).join('');

    const island =
      '<path d="M742 180 q18 -12 34 -2 q14 9 4 20 q-14 12 -30 4 q-14 -8 -8 -22z" fill="' + land + '" stroke="' + ink + '" stroke-width="2"/>' +
      '<path d="M128 872 q16 -10 28 0 q10 9 -2 17 q-14 8 -26 -1 q-10 -8 0 -16z" fill="' + land + '" stroke="' + ink + '" stroke-width="2"/>';

    return '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200">' +
      '<defs>' +
        '<linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#dbcaa3"/><stop offset=".55" stop-color="#d3c096"/><stop offset="1" stop-color="#c8b287"/>' +
        '</linearGradient>' +
        '<linearGradient id="paper" x1="0" y1="0" x2=".6" y2="1">' +
          '<stop offset="0" stop-color="#f6ecd0"/><stop offset=".6" stop-color="#efe2bf"/><stop offset="1" stop-color="#e7d8b1"/>' +
        '</linearGradient>' +
        '<radialGradient id="vignette" cx=".5" cy=".45" r=".78">' +
          '<stop offset=".55" stop-color="#7a5c2a" stop-opacity="0"/><stop offset="1" stop-color="#5c421c" stop-opacity=".28"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="900" height="1200" fill="url(#sea)"/>' +
      // sea wave lines
      (function () {
        let out = '';
        for (let y = 60; y < 1200; y += 54) {
          out += '<path d="M' + (20 + (y % 108)) + ' ' + y + ' q14 -7 28 0 q14 7 28 0" stroke="#ad9668" stroke-width="1.3" fill="none" opacity=".33"/>';
          out += '<path d="M' + (640 + (y % 140)) + ' ' + (y + 20) + ' q14 -7 28 0 q14 7 28 0" stroke="#ad9668" stroke-width="1.3" fill="none" opacity=".3"/>';
        }
        return out;
      })() +
      // landmass
      '<path d="M330 120 C420 96 520 104 600 140 C680 176 716 220 748 286 C776 344 762 388 784 442 C806 496 828 540 812 600 C798 654 800 700 776 756 C754 810 726 854 690 902 C654 950 606 1000 548 1042 C500 1076 452 1080 410 1050 C356 1010 322 964 288 918 C252 870 214 832 190 780 C166 728 148 676 138 620 C128 564 118 508 124 452 C130 396 148 340 176 288 C204 236 260 168 330 120 Z" fill="url(#paper)" stroke="' + ink + '" stroke-width="3.4"/>' +
      '<path d="M330 120 C420 96 520 104 600 140 C680 176 716 220 748 286 C776 344 762 388 784 442 C806 496 828 540 812 600 C798 654 800 700 776 756 C754 810 726 854 690 902 C654 950 606 1000 548 1042 C500 1076 452 1080 410 1050 C356 1010 322 964 288 918 C252 870 214 832 190 780 C166 728 148 676 138 620 C128 564 118 508 124 452 C130 396 148 340 176 288 C204 236 260 168 330 120 Z" fill="none" stroke="#fff6dc" stroke-width="7" stroke-opacity=".35"/>' +
      island +
      // rivers
      '<path d="M300 300 C316 380 300 430 320 470 C340 508 366 520 380 566 C392 606 372 646 372 676" fill="none" stroke="#7f9aa0" stroke-width="6.5" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M300 300 C316 380 300 430 320 470 C340 508 366 520 380 566 C392 606 372 646 372 676" fill="none" stroke="#cfe0dc" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M520 470 C540 520 528 560 552 600 C576 640 596 660 604 700 C612 740 596 780 600 820" fill="none" stroke="#7f9aa0" stroke-width="5" stroke-linecap="round" opacity=".7"/>' +
      // roads
      '<g stroke="' + ink + '" stroke-width="2" stroke-dasharray="7 8" fill="none" opacity=".42">' +
        '<path d="M186 556 C260 520 350 500 420 504"/>' +
        '<path d="M420 504 C470 520 540 470 600 424"/>' +
        '<path d="M420 504 C440 560 400 630 380 682"/>' +
        '<path d="M380 682 C420 760 470 830 512 884"/>' +
        '<path d="M380 682 C480 700 600 720 676 762"/>' +
      '</g>' +
      // lake
      '<ellipse cx="378" cy="684" rx="42" ry="26" fill="#a9c3c4" stroke="' + ink + '" stroke-width="2.4"/>' +
      '<ellipse cx="378" cy="684" rx="26" ry="13" fill="#c3d8d6" opacity=".8"/>' +
      mountains +
      trees +
      desertDots +
      // tower ruin
      '<g transform="translate(513 888)" stroke="' + ink + '" stroke-width="2.4" fill="none">' +
        '<path d="M-13 16 L-13 -20 L-7 -20 L-7 16"/><path d="M-2 16 L-2 -30 L4 -30 L4 16"/>' +
        '<path d="M9 16 L9 -14 L15 -14 L15 16"/><path d="M-16 16 H18"/>' +
      '</g>' +
      // cities
      '<g fill="' + ink + '">' +
        '<circle cx="423" cy="504" r="7"/><circle cx="423" cy="504" r="12" fill="none" stroke="' + ink + '" stroke-width="1.6"/>' +
        '<circle cx="180" cy="564" r="5"/>' +
        '<circle cx="600" cy="424" r="4.5"/>' +
        '<circle cx="676" cy="762" r="4.5"/>' +
        '<circle cx="300" cy="300" r="4"/>' +
      '</g>' +
      // cartouche title (region names live on the pins so the map stays clean)
      '<g fill="' + ink + '" font-family="Georgia, \'AppleMyungjo\', serif" text-anchor="middle">' +
        '<text x="450" y="72" font-size="27" letter-spacing="7" opacity=".8">아르카디아 대륙</text>' +
        '<text x="450" y="94" font-size="10.5" letter-spacing="5" opacity=".55">ARCANUM · 제3기 104년</text>' +
      '</g>' +
      // compass rose
      '<g transform="translate(130 1040)" stroke="' + ink + '" fill="' + ink + '" opacity=".8">' +
        '<circle r="46" fill="none" stroke-width="2"/>' +
        '<circle r="34" fill="none" stroke-width="1" opacity=".6"/>' +
        '<path d="M0 -40 L8 0 L0 40 L-8 0 Z" fill="' + ink + '"/>' +
        '<path d="M-40 0 L0 -7 L40 0 L0 7 Z" fill="none" stroke-width="1.4"/>' +
        '<text x="0" y="-54" font-size="13" text-anchor="middle" stroke="none" font-family="Georgia, serif">N</text>' +
      '</g>' +
      // frame + vignette
      '<rect x="14" y="14" width="872" height="1172" fill="none" stroke="' + ink + '" stroke-width="3"/>' +
      '<rect x="24" y="24" width="852" height="1152" fill="none" stroke="' + ink + '" stroke-width="1" opacity=".65"/>' +
      '<rect width="900" height="1200" fill="url(#vignette)"/>' +
      '</svg>';
  }

  const MAP_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SampleMapSVG());

  function SampleWorld() {
    const now = Date.now();
    const C = {
      aelric: 'c_aelric', seraphine: 'c_seraphine', malachar: 'c_malachar', elindra: 'c_elindra',
      thorn: 'c_thorn', isolde: 'c_isolde', corvus: 'c_corvus', nimue: 'c_nimue'
    };
    const M = {
      kingdom: 'm_baldren', peak: 'm_frost', forest: 'm_blackforest',
      desert: 'm_ash', lake: 'm_moonlake', tower: 'm_tower', port: 'm_port'
    };
    return {
      id: 'w_arcadia',
      name: '아르카디아 연대기',
      tagline: '잿빛 왕관이 부서진 뒤, 일곱 성소가 다시 빛나기 시작했다.',
      era: '제3기 104년',
      description: '천 년 전 용의 화염에 무너진 옛 왕국 아르카디아. 잿빛 왕관 전쟁이 끝난 지 사백 년이 지난 지금, 봉인되었던 일곱 성소의 인장이 하나씩 풀리고 있다. 황금 평원의 왕도 발드렌에서는 서약 기사단이, 검은숲 너머에서는 봉인술사회가, 그리고 폐허의 탑 아래에서는 누군가가 오래된 이름을 다시 부르고 있다.',
      createdAt: now,
      updatedAt: now,
      eraOrder: ['제1기', '제2기', '제3기'],
      characters: [
        {
          id: C.aelric, name: '아엘릭 반 다이렌', title: '서리검의 계승자', race: '인간', faction: '서약 기사단',
          age: '27세 · 182cm', abilities: '서리검 「글라시엘」 · 결빙의 검술',
          personality: '무뚝뚝하고 말수가 적다. 서약을 어기는 자를 가장 싫어하지만, 정작 자신이 지켜야 할 서약이 무엇인지는 아직 모른다. 추위에 강하고 술에 약하다.',
          notes: '왕도 발드렌의 하급 기사 서자로 태어났다. 열두 살에 처음 글라시엘을 만졌을 때 손이 얼어붙어 세 달을 앓았다.',
          image: null, pos: { x: 112, y: 122 }
        },
        {
          id: C.seraphine, name: '세라핀 아쉬포드', title: '황금 가지의 대마법사', race: '인간', faction: '봉인술사회',
          age: '34세', abilities: '봉인 마법 · 별의 지도 · 이름의 해독',
          personality: '호기심이 많고 웃음이 잦다. 대가 없이 얻는 것은 없다고 믿으며, 자기 목숨도 값으로 계산해 두었다.',
          notes: '봉인술사회 최연소 대마법사. 일곱 성소의 인장을 읽을 수 있는 마지막 세 사람 중 하나.',
          image: null, pos: { x: 252, y: 92 }
        },
        {
          id: C.malachar, name: '말라카르', title: '잿불의 군주', race: '용혈족', faction: '잿불 교단',
          age: '400세 이상', abilities: '화염 · 부패한 이름의 마법 · 재에서 다시 서는 몸',
          personality: '느리고 우아하다. 분노하지 않고, 대신 오래 기억한다. 자신을 죽인 자의 이름을 천 년 동안 외운다.',
          notes: '아르카디아를 태운 용의 후예. 잿빛 왕관의 마지막 소유자이며, 지금은 자기 이름을 되찾으려 한다.',
          image: null, pos: { x: 300, y: 254 }
        },
        {
          id: C.elindra, name: '엘린드라', title: '검은숲의 수호자', race: '엘프', faction: '검은숲 감시자',
          age: '240세', abilities: '밤의 이슬(장궁) · 숲의 길 읽기 · 매의 눈',
          personality: '냉정하고 과묵하다. 숲 밖의 일에는 관심이 없지만, 숲을 태운 불은 아직도 기억한다.',
          notes: '제2기 300년 대화재 이후 숲의 절반을 잃고 감시자의 자리를 이어받았다. 나무의 이름을 전부 외우고 있다.',
          image: null, pos: { x: 192, y: 208 }
        },
        {
          id: C.thorn, name: '토른 그림스톤', title: '무쇠 망치', race: '드워프', faction: '무쇠 길드',
          age: '156세', abilities: '전투 도끼 「산의 이빨」 · 룬 단조 · 독한 술',
          personality: '입이 거칠고 의리가 두껍다. 빚은 반드시 갚고, 약속은 반드시 지킨다.',
          notes: '서리봉우리 아래 무쇠 길드의 단조장. 글라시엘의 검집을 만든 장인의 손자.',
          image: null, pos: { x: 58, y: 262 }
        },
        {
          id: C.isolde, name: '이졸데 발드렌', title: '서약 없는 공주', race: '인간', faction: '아르카디아 왕실',
          age: '22세', abilities: '정통 검술 · 외교 · 왕관의 조각을 다루는 재주',
          personality: '당당하고 영리하다. 왕실이 무너진 뒤에도 고개를 숙이지 않았고, 그 때문에 미움을 샀다.',
          notes: '몰락한 왕실의 마지막 혈육. 핏줄에 용의 피가 섞여 있다는 소문이 있다.',
          image: null, pos: { x: 142, y: 384 }
        },
        {
          id: C.corvus, name: '코르부스', title: '침묵의 증인', race: '반요(까마귀 혈족)', faction: '무소속 · 정보상',
          age: '41세', abilities: '그림자 마법 · 독 · 기억에서 이름 지우기',
          personality: '농담을 하지 않는다. 목소리가 아니라 값으로 말한다. 다만 한 번은 값을 받지 않고 일했다.',
          notes: '무너진 왕실의 마지막 서기가 남긴 아이. 이졸데의 존재를 십 년 동안 숨겨 왔다.',
          image: null, pos: { x: 262, y: 402 }
        },
        {
          id: C.nimue, name: '니뮤에', title: '달의 호수의 아이', race: '정령혈족', faction: '성소 수호자',
          age: '겉보기 16세', abilities: '물의 정령술 · 인장 공명 · 물 위를 걷기',
          personality: '말이 느리고 표정이 적다. 기억을 잃었지만 이름은 잊지 않았다.',
          notes: '달의 호수 성소에서 깨어났다. 일곱 성소의 인장과 공명하며, 말라카르가 오래 찾던 이름을 알고 있다.',
          image: null, pos: { x: 70, y: 448 }
        }
      ],
      relations: [
        { id: 'r1', a: C.aelric, b: C.isolde, type: 'love', label: '어린 시절의 서약', note: '발드렌 성의 서고에서 함께 자랐다. 아엘릭이 기사가 되던 날, 둘은 서로의 이름을 각인했다.' },
        { id: 'r2', a: C.aelric, b: C.seraphine, type: 'alliance', label: '검과 인장', note: '세라핀이 글라시엘에 걸린 봉인을 읽어 주기로 했다.' },
        { id: 'r3', a: C.aelric, b: C.malachar, type: 'hostile', label: '되살아난 이름', note: '말라카르는 아엘릭 안에 잠든 옛 기사의 이름을 알아본다.' },
        { id: 'r4', a: C.seraphine, b: C.malachar, type: 'rival', label: '봉인을 둘러싼 집착', note: '서로가 서로의 연구 대상이다. 죽이지 않는 이유도 그것이다.' },
        { id: 'r5', a: C.elindra, b: C.seraphine, type: 'alliance', label: '숲의 빚', note: '세라핀이 대화재의 책임자를 밝혀 준 뒤로 오래된 빚이 있다.' },
        { id: 'r6', a: C.thorn, b: C.aelric, type: 'alliance', label: '검집의 인연', note: '토른이 글라시엘의 검집을 고쳐 주었다. 값은 아직 받지 않았다.' },
        { id: 'r7', a: C.corvus, b: C.isolde, type: 'family', label: '숨겨진 외삼촌', note: '코르부스는 이졸데를 왕실의 칼에서 지켜 왔다. 공주는 아직 그를 삼촌이라 부르지 않는다.' },
        { id: 'r8', a: C.nimue, b: C.malachar, type: 'hostile', label: '오래된 감시자', note: '니뮤에가 기억하기 전부터 둘은 서로를 알고 있었다.' },
        { id: 'r9', a: C.elindra, b: C.nimue, type: 'alliance', label: '성소의 수호자들', note: '숲과 호수, 두 성소의 수호자는 매 계절 이름을 교환한다.' },
        { id: 'r10', a: C.malachar, b: C.isolde, type: 'family', label: '핏줄에 흐르는 것', note: '왕실에 남은 용의 피. 말라카르는 이졸데를 마지막 조각으로 여긴다.' }
      ],
      events: [
        {
          id: 'e1', era: '제1기', year: 0, title: '아르카디아 함락', summary: '용의 화염이 왕도를 삼키고 잿빛 왕관이 땅에 묻혔다.',
          detail: '천 년 전, 말라카르의 화염이 일곱 밤 동안 하늘을 덮었다. 왕도는 재가 되었고 왕관은 조각으로 흩어져 일곱 성소에 나뉘어 묻혔다. 살아남은 서기들만이 그날의 이름을 기록했다.',
          characters: [C.malachar], locations: [M.kingdom]
        },
        {
          id: 'e2', era: '제2기', year: 47, title: '일곱 성소의 봉인', summary: '봉인술사회의 창립자들이 성소를 봉하고 이름을 감췄다.',
          detail: '살아남은 마법사들이 성소마다 인장을 세우고, 그 이름을 노래 대신 글자에 묶었다. 덕분에 말라카르는 오래 잠들었지만, 봉인의 대가는 매 세기 누군가의 기억이었다.',
          characters: [C.seraphine, C.nimue], locations: [M.lake]
        },
        {
          id: 'e3', era: '제2기', year: 300, title: '검은숲의 대화재', summary: '숲의 절반이 타버리고, 감시자 엘린드라가 자리를 이어받았다.',
          detail: '잿불 교단의 손에 의해 숲 동쪽이 불탔다. 불은 달의 호수 성소의 물로 꺼졌고, 그 대가로 니뮤에가 기억을 잃었다는 이야기가 숲에 남았다.',
          characters: [C.elindra, C.nimue], locations: [M.forest]
        },
        {
          id: 'e4', era: '제3기', year: 96, title: '발드렌 왕실의 몰락', summary: '왕이 서약을 저버리고 왕관의 한 조각을 팔았다.',
          detail: '작은 전쟁에 지친 왕이 잿불 교단에 왕관 조각을 넘겼다. 서약 기사단은 왕을 버렸고, 공주 이졸데는 성에서 쫓겨났다. 코르부스가 그 밤 그녀를 데리고 나왔다.',
          characters: [C.isolde, C.corvus], locations: [M.kingdom]
        },
        {
          id: 'e5', era: '제3기', year: 102, title: '서리검의 각성', summary: '발드렌 항구의 창고에서 글라시엘이 울었다.',
          detail: '하급 기사였던 아엘릭이 항구 창고에 버려진 검을 뽑았다. 검은 그의 이름을 대신 불렀고, 서리봉우리의 봉인이 그 울음에 응답했다.',
          characters: [C.aelric, C.seraphine], locations: [M.port]
        },
        {
          id: 'e6', era: '제3기', year: 104, title: '첫 번째 인장의 해제', summary: '폐허의 탑 아래에서 봉인이 풀리고 오래된 이름이 돌아왔다.',
          detail: '성소의 인장이 처음으로 스스로 풀렸다. 세라핀은 그 자리에서 시력을 절반 잃었고, 말라카르는 재에서 다시 서며 첫 문장을 말했다. "이제 누가 나를 부르지?"',
          characters: [C.malachar, C.seraphine, C.nimue], locations: [M.tower]
        }
      ],
      lore: [
        {
          id: 'l1', category: 'magic', title: '봉인술', body: '이름을 감추고 힘을 묶는 마법. 봉인된 존재는 이름을 잃고, 이름을 잃은 자는 존재의 절반을 잃는다. 대가로 성소의 인장은 매 세기 한 사람의 기억을 먹는다.', tags: ['봉인', '이름', '성소', '인장']
        },
        {
          id: 'l2', category: 'magic', title: '룬 맹세', body: '룬 문자로 새긴 계약은 죽음으로도 풀리지 않는다. 맹세를 어긴 자는 살아 있는 동안 이름을 잃고, 그 이름은 맹세를 받은 자가 대신 가지게 된다.', tags: ['룬', '계약', '서약', '이름']
        },
        {
          id: 'l3', category: 'faction', title: '서약 기사단', body: '아르카디아 왕실에 충성하던 마지막 기사단. 일곱 개의 서약 중 첫 번째는 "왕이 아니라 이름을 지킨다"이다. 왕실이 몰락한 뒤 기사단은 왕도에 남아 성문을 지킨다.', tags: ['기사단', '서약', '왕도']
        },
        {
          id: 'l4', category: 'faction', title: '잿불 교단', body: '말라카르를 따르는 재의 교단. "태워진 것은 다시 서고, 다시 선 것은 빚을 받는다"는 교리를 따른다. 왕관 조각을 모아 잿빛 왕관을 복원하려 한다.', tags: ['교단', '재', '왕관', '말라카르']
        },
        {
          id: 'l5', category: 'race', title: '용혈족', body: '용의 피를 이은 자들. 이마에 뿔이 자라고 황금빛 눈동자를 가진다. 피가 진할수록 불에 강하고, 오래 산다. 발드렌 왕실에는 한 줄기밖에 남지 않았다.', tags: ['용', '혈족', '왕실', '불']
        },
        {
          id: 'l6', category: 'item', title: '잿빛 왕관', body: '일곱 조각으로 부서진 옛 왕관. 조각마다 왕의 이름이 새겨져 있으며, 조각이 빛을 내면 그 이름이 부른다고 한다. 세 조각은 교단, 두 조각은 성소, 한 조각은 왕실, 마지막 하나는 지도 어디에도 없다.', tags: ['왕관', '유물', '조각', '이름']
        },
        {
          id: 'l7', category: 'rule', title: '이름의 법칙', body: '세계의 모든 것은 참된 이름을 가지며, 이름을 부르면 그 존재가 응답한다. 이름을 조용히 하는 것이 봉인의 기본 원리다.', tags: ['이름', '규칙', '봉인']
        }
      ],
      episodes: [
        {
          id: 'p1', no: 1, title: '재의 아침', status: 'done',
          synopsis: '발드렌 성문 앞에서 서약 없는 기사가 서리를 부른다. 항구 창고에서 검 한 자루가 울고, 공주는 도시에 들어선다.',
          characters: [C.aelric, C.isolde], locations: [M.kingdom, M.port],
          scenes: [
            { id: 's1', title: '성문의 서리', note: '아엘릭이 성문을 지킨다. 세 번째 경례를 받지 않은 자에게는 출입을 막는다.' },
            { id: 's2', title: '창고의 검', note: '발드렌 항구. 창고 벽에 기대어 있던 글라시엘이 먼저 울린다. 아엘릭은 검을 뽑지 않는다.' },
            { id: 's3', title: '도시에 들어선 공주', note: '이졸데가 깃발 없는 수레에 실려 성문에 닿는다. 아엘릭은 그녀의 이름을 말하지 않는다.' }
          ]
        },
        {
          id: 'p2', no: 2, title: '봉인의 대가', status: 'writing',
          synopsis: '세라핀이 성소의 인장을 읽고, 그 대가로 시력의 절반을 잃는다. 코르부스는 누군가의 이름을 지운다.',
          characters: [C.seraphine, C.corvus, C.elindra], locations: [M.forest, M.lake],
          scenes: [
            { id: 's4', title: '검은숲의 빛', note: '엘린드라가 세라핀을 숲의 가장자리에서 맞는다. 숲은 대화재 이후 처음으로 손님을 들인다.' },
            { id: 's5', title: '달의 호수의 인장', note: '물 위에 인장이 떠오른다. 세라핀은 읽고, 읽는 동안 두 눈이 흐려진다.' },
            { id: 's6', title: '지워진 이름', note: '코르부스가 누군가의 이름을 지운다. 지운 이름은 그의 서기가 가진다.' }
          ]
        },
        {
          id: 'p3', no: 3, title: '폐허의 탑', status: 'idea',
          synopsis: '아엘릭과 코르부스가 폐허의 탑 아래로 내려간다. 말라카르는 이미 그 자리에 서 있다.',
          characters: [C.aelric, C.corvus, C.malachar], locations: [M.tower, M.desert],
          scenes: [
            { id: 's7', title: '탑의 문', note: '탑 아래 문에는 일곱 개의 홈이 있다. 여섯 개는 이름이 지워져 있다.' },
            { id: 's8', title: '재에서 선 군주', note: '말라카르가 먼저 도착해 있다. 그는 검을 빼지 않고 아엘릭의 이름을 부른다.' }
          ]
        }
      ],
      map: {
        kind: 'sample',
        image: null,
        markers: [
          { id: M.kingdom, name: '발드렌', kind: 'kingdom', x: 47, y: 42, climate: '서늘한 대륙성 · 긴 겨울', faction: '아르카디아 왕실(명목상) · 서약 기사단', resources: '밀, 황금빛 석회, 옛 성소의 잔재', danger: '교단의 첩자와 왕실 잔당이 뒤섞인 골목', notes: '왕도. 거리마다 죽은 왕의 이름이 새겨져 있고, 서약 기사단이 성문을 지킨다.' },
          { id: M.peak, name: '서리봉우리', kind: 'mountain', x: 33, y: 20, climate: '일 년 내내 서리, 산정에는 눈', faction: '무쇠 길드', resources: '청철, 룬석, 얼지 않는 샘', danger: '눈보라와 산길을 지키는 바위거인', notes: '봉우리 아래 무쇠 길드의 대장간 도시가 있다. 글라시엘의 검집이 여기서 만들어졌다.' },
          { id: M.forest, name: '검은숲', kind: 'forest', x: 70, y: 31, climate: '습하고 그늘진 온대', faction: '검은숲 감시자', resources: '검은 참나무, 밤이슬, 약초', danger: '길을 바꾸는 숲과 대화재의 흔적', notes: '동쪽 절반이 아직 재로 남아 있다. 숲은 낯선 자의 이름을 먼저 묻는다.' },
          { id: M.desert, name: '잿빛 사막', kind: 'ruin', x: 76, y: 64, climate: '건조, 밤에는 혹한', faction: '잿불 교단의 순례길', resources: '유리화한 모래, 재의 소금', danger: '모래 아래의 옛 성벽과 재에서 서는 것들', notes: '천 년 전 왕도가 탄 자리. 지금은 아무것도 자라지 않는다.' },
          { id: M.lake, name: '달의 호수', kind: 'lake', x: 42, y: 57, climate: '안개 잦은 호숫가', faction: '성소 수호자', resources: '달빛 이끼, 성소의 물', danger: '호수 아래의 인장과 기억을 잃는 물', notes: '일곱 성소 중 두 번째. 니뮤에가 이곳에서 깨어났다.' },
          { id: M.tower, name: '폐허의 탑', kind: 'ruin', x: 57, y: 74, climate: '메마르고 바람이 많음', faction: '아무도 없다', resources: '봉인석, 옛 서기의 기록', danger: '풀린 인장과 이름을 부르는 소리', notes: '첫 번째 인장이 풀린 곳. 탑 아래에는 일곱 개의 홈이 있는 문이 있다.' },
          { id: M.port, name: '발드렌 항구', kind: 'port', x: 20, y: 47, climate: '안개와 소금바람', faction: '서약 기사단(세관) · 무소속 상단', resources: '소금, 밀수품, 먼 바다의 소문', danger: '세관과 밀수꾼, 그리고 검은 배', notes: '글라시엘이 발견된 창고가 아직 남아 있다. 바다 건너에서 온 소문이 가장 먼저 닿는 곳.' }
        ]
      }
    };
  }

  global.Sample = { mapURI: MAP_URI, mapSVG: SampleMapSVG, world: SampleWorld };
})(window);
