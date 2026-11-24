/* =========================================================
   ARCANUM · 등급 아이콘 — 기본 팩(30종) + 설명 기반 문장(SVG) 생성기
   - 기본 아이콘: 이모지 24종 + 커스텀 SVG 문장 6종
   - 설명을 넣으면 모티브(검·방패·불꽃·얼음…) + 색(금·청·적·자·녹·흑·백)
     + 외곽 프레임(원형 룬 / 방패형 / 육각 마법진)을 읽어 인라인 SVG를 만든다.
   - 저장 형식: world.rankSystems[].icon 그대로 문자열.
       'svg:<encodeURIComponent(svg markup)>'  또는  'data:image/svg+xml...'  또는  이모지·글자
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------
     색 팔레트
     --------------------------------------------------------- */
  const PALETTES = [
    { name: '백', keys: ['하얀빛', '하얀', '백색', '흰색', '흰빛', '설백', '순백', '은백', '백', '흰'],
      main: '#ece9f4', light: '#ffffff', deep: '#a8a4b8' },
    { name: '흑', keys: ['검은빛', '검은색', '검은', '검정색', '검정', '까만', '흑색', '암흑', '칠흑', '흑'],
      main: '#b3aec8', light: '#ddd8ec', deep: '#6b6580' },
    { name: '금', keys: ['황금빛', '황금색', '황금', '금빛', '골드', '금색', '노란', '노랑', '금'],
      main: '#e8c46a', light: '#fff0bd', deep: '#a5812c' },
    { name: '청', keys: ['푸른빛', '푸른', '푸르스름', '파아란', '파란', '파랑', '하늘빛', '하늘색',
      '청록', '쪽빛', '남색', '청색', '시린', '청'],
      main: '#6ba8e6', light: '#c3e2ff', deep: '#2f679e' },
    { name: '적', keys: ['붉은빛', '붉은', '빨간색', '빨간', '빨강', '진홍', '핏빛', '혈색', '적색', '홍색', '주홍', '적'],
      main: '#e2584f', light: '#ffb4a8', deep: '#96271f' },
    { name: '자', keys: ['보라빛', '보라색', '보랏빛', '보라', '자색', '자줏빛', '제비꽃', '자'],
      main: '#b07ce8', light: '#e0c8ff', deep: '#6a3f9e' },
    { name: '녹', keys: ['초록빛', '초록색', '초록', '녹색', '풀빛', '에메랄드', '비취', '녹'],
      main: '#63bf7a', light: '#b8eec4', deep: '#2f7a44' },
    { name: '철', keys: ['강철빛', '강철', '무쇠', '잿빛', '은색', '은빛', '회색', '철색', '철'],
      main: '#aab4c0', light: '#dfe6ee', deep: '#5f6a76' }
  ];

  const COLOR_KEYS = [];
  PALETTES.forEach((p) => p.keys.forEach((k) => COLOR_KEYS.push({ k: k, p: p })));
  COLOR_KEYS.sort((a, b) => b.k.length - a.k.length);

  const GOLD = PALETTES.find((p) => p.name === '금');
  const DESIGN = { main: 'currentColor', light: 'currentColor', deep: 'currentColor' };

  /* ---------------------------------------------------------
     모티브 (48×48 좌표계, 중심 24,24)
     --------------------------------------------------------- */
  function snowflake(c) {
    const arm = '<g><path d="M24 8.4v31.2"/>' +
      '<path d="M24 14.6 19.5 10.1M24 14.6 28.5 10.1"/>' +
      '<path d="M24 33.4 19.5 37.9M24 33.4 28.5 37.9"/>' +
      '<path d="M24 24 20.6 20.6M24 24 27.4 20.6M24 24 20.6 27.4M24 24 27.4 27.4"/></g>';
    return '<g stroke="' + c.main + '" stroke-width="1.9" stroke-linecap="round" fill="none">' +
      arm + '<g transform="rotate(60 24 24)">' + arm + '</g>' +
      '<g transform="rotate(120 24 24)">' + arm + '</g></g>' +
      '<circle cx="24" cy="24" r="2.3" fill="' + c.main + '"/>';
  }

  function pine(x, base, h, w, c) {
    const top = base - h;
    return '<path d="M' + x + ' ' + top + ' ' + (x + w) + ' ' + (base - h * 0.34) +
      'h-' + (w * 0.28).toFixed(1) + 'L' + (x + w * 0.86) + ' ' + base + 'h-' + (w * 1.72).toFixed(1) +
      'L' + (x - w * 0.6) + ' ' + (base - h * 0.34) + 'h' + (w * 0.28).toFixed(1) + 'Z" ' +
      'fill="' + c.main + '" fill-opacity=".26" stroke="' + c.main + '" stroke-width="1.6" stroke-linejoin="round"/>';
  }

  function star4(x, y, r) {
    return '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r * 0.28) + ' ' + (y - r * 0.28) + ' ' +
      (x + r) + ' ' + y + ' ' + (x + r * 0.28) + ' ' + (y + r * 0.28) + ' ' +
      x + ' ' + (y + r) + ' ' + (x - r * 0.28) + ' ' + (y + r * 0.28) + ' ' +
      (x - r) + ' ' + y + ' ' + (x - r * 0.28) + ' ' + (y - r * 0.28) + 'Z"/>';
  }

  const MOTIFS = {
    blade: {
      label: '검',
      keys: ['대검', '장검', '성검', '장도', '세이버', '레이피어', '검', '칼', '도'],
      draw: (c) => '<path d="M24 5.2 28.4 12.2V27h-8.8V12.2Z" fill="' + c.main + '" opacity=".9"/>' +
        '<path d="M24 5.2 28.4 12.2V27H24Z" fill="' + c.light + '" opacity=".4"/>' +
        '<path d="M15.2 27.6h17.6" stroke="' + c.main + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M24 30.2v6.2" stroke="' + c.main + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<circle cx="24" cy="38.6" r="2.1" fill="' + c.main + '"/>'
    },
    shield: {
      label: '방패',
      keys: ['방패'],
      draw: (c) => '<path d="M24 6.4 35.8 11v9.2c0 8.6-5.6 14-11.8 16.6C17.8 34.2 12.2 28.8 12.2 20.2V11Z" ' +
        'fill="' + c.main + '" fill-opacity=".2" stroke="' + c.main + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M24 13 30.6 15.5v4.9c0 5-3.2 8.4-6.6 10.2-3.4-1.8-6.6-5.2-6.6-10.2v-4.9Z" ' +
        'stroke="' + c.light + '" stroke-width="1.5" stroke-linejoin="round" opacity=".9"/>'
    },
    flame: {
      label: '불꽃',
      keys: ['불꽃', '화염', '불길', '불', '인화'],
      draw: (c) => '<path d="M24.2 4.4c2.4 5 5.9 8.2 7.8 12.3 2 4.2 1.9 8.6-.7 11.6-2.3 2.7-5.9 4-9.6 3.2-4.9-1-8-5.2-7.4-10.2.5-3.8 2.6-7 5.4-9.4-.5 3 .4 5.2 2.2 6.2-.2-4.9 1-9.7 2.3-13.7Z" ' +
        'fill="' + c.main + '" fill-opacity=".2" stroke="' + c.main + '" stroke-width="1.9" stroke-linejoin="round"/>' +
        '<path d="M25.4 18.6c2.6 3.2 4.2 5.4 4.2 8.1 0 2.8-2 4.8-4.6 4.8s-4.6-2-4.6-4.8c0-2.7 1.6-4.9 4.2-8.1Z" fill="' + c.main + '" opacity=".9"/>' +
        '<path d="M16.2 37.6h15.6" stroke="' + c.main + '" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>'
    },
    frost: {
      label: '얼음',
      keys: ['얼음', '빙결', '빙정', '설한', '눈꽃', '눈보라', '서리', '한기', '빙'],
      draw: (c) => snowflake(c)
    },
    bolt: {
      label: '번개',
      keys: ['번개', '뇌전', '천둥', '벼락', '뇌명', '뢰'],
      draw: (c) => '<path d="M27.6 4.6 13.4 26.6h8.4L18 43.4 34.6 20.4h-8.8Z" ' +
        'fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="2" stroke-linejoin="round"/>'
    },
    moon: {
      label: '달',
      keys: ['반월', '달빛', '월광', '달'],
      draw: (c) => '<mask id="RI_MOON" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">' +
        '<rect width="48" height="48" fill="#fff"/><circle cx="34.5" cy="19.5" r="13.2" fill="#000"/></mask>' +
        '<circle cx="24" cy="24" r="16" fill="' + c.main + '" mask="url(#RI_MOON)" opacity=".95"/>' +
        '<path d="M35.5 33.4l1.3 2.9 2.9 1.3-2.9 1.3-1.3 2.9-1.3-2.9-2.9-1.3 2.9-1.3z" fill="' + c.light + '" opacity=".9"/>'
    },
    sun: {
      label: '태양',
      keys: ['태양', '햇빛', '햇살', '일광', '해'],
      draw: (c) => {
        let rays = '';
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const x1 = 24 + Math.cos(a) * 12.4, y1 = 24 + Math.sin(a) * 12.4;
          const x2 = 24 + Math.cos(a) * 17, y2 = 24 + Math.sin(a) * 17;
          rays += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"/>';
        }
        return '<g stroke="' + c.main + '" stroke-width="2.1" stroke-linecap="round">' + rays + '</g>' +
          '<circle cx="24" cy="24" r="8.4" fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="2"/>' +
          '<circle cx="24" cy="24" r="3.2" fill="' + c.main + '"/>';
      }
    },
    crown: {
      label: '왕관',
      keys: ['왕관', '면류관', '티아라', '관'],
      draw: (c) => '<path d="M10.6 32.6h26.8l-2.7-16.4-6.5 5.9L24 10.4l-4.2 11.7-6.5-5.9Z" ' +
        'fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M10.6 36.4h26.8" stroke="' + c.main + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="24" cy="18.6" r="2.1" fill="' + c.light + '"/>' +
        '<circle cx="16.3" cy="26.6" r="1.6" fill="' + c.light + '" opacity=".85"/>' +
        '<circle cx="31.7" cy="26.6" r="1.6" fill="' + c.light + '" opacity=".85"/>'
    },
    dragon: {
      label: '용',
      keys: ['드래곤', '비룡', '와이번', '용의', '용'],
      draw: (c) => '<path d="M6.4 28.4c3.6-1.2 6.6-3 9.2-5.6l-.6-4.2c0-6.4 5.2-11.4 12.2-11.4h4.6L34 2.6l1.6 6.6 5.8-3.4-1.6 7.2c3.4 1 5.6 3.6 6.4 7.2.6 2.8.2 5.4-1 7.6l1.6 3.6-4.6-.4c-1.4 2.4-3.6 4-6.4 4.6l-2.4 5.6 1.2 4.8-5.2-2.6-3.4 3-2.6-4.6c-4.6-1-8.6-3.4-11.4-7.2l-4.2 1.8 1-4.2-3.8-.6Z" ' +
        'fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="1.7" stroke-linejoin="round"/>' +
        '<circle cx="29.4" cy="18.4" r="1.8" fill="' + c.light + '"/>' +
        '<path d="M15 25.6c3.4-1.4 7-1.6 10.6-.6" stroke="' + c.main + '" stroke-width="1.2" opacity=".65" stroke-linecap="round"/>' +
        '<path d="M23.8 27.4c2 1.6 4.2 2.4 6.6 2.2" stroke="' + c.main + '" stroke-width="1.1" opacity=".5" stroke-linecap="round"/>'
    },
    feather: {
      label: '깃털',
      keys: ['깃털', '날깃', '깃'],
      draw: (c) => '<path d="M35.6 8.4c-13.2 1.6-20.4 8.2-22.4 20.4l-2.6 8.8 8.2-3.2c11.2-3.6 16.2-10.8 16.8-26Z" ' +
        'fill="' + c.main + '" fill-opacity=".18" stroke="' + c.main + '" stroke-width="1.9" stroke-linejoin="round"/>' +
        '<path d="M32.4 12.2 14.8 33.2" stroke="' + c.main + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M27.4 15.2 23.8 19.4M30.2 20 25.4 25.4M24 13.4 20.6 17" stroke="' + c.main + '" stroke-width="1.1" opacity=".55" stroke-linecap="round"/>'
    },
    skull: {
      label: '해골',
      keys: ['해골', '두개골', '骷髅', '骷髅'],
      draw: (c) => '<path d="M24 7.6c-8.4 0-13.6 5.6-13.6 12.8 0 4 1.6 6.8 4.2 8.5v4.5c0 1 .8 1.8 1.8 1.8h15.2c1 0 1.8-.8 1.8-1.8v-4.5c2.6-1.7 4.2-4.5 4.2-8.5C37.6 13.2 32.4 7.6 24 7.6Z" ' +
        'fill="' + c.main + '" fill-opacity=".16" stroke="' + c.main + '" stroke-width="1.9" stroke-linejoin="round"/>' +
        '<ellipse cx="18.4" cy="21.2" rx="4" ry="3.6" fill="' + c.main + '" opacity=".85"/>' +
        '<ellipse cx="29.6" cy="21.2" rx="4" ry="3.6" fill="' + c.main + '" opacity=".85"/>' +
        '<path d="M24 25.4l2.3 4.2h-4.6z" fill="' + c.main + '" opacity=".8"/>' +
        '<path d="M20 35.2v-3.8M24 35.2v-3.8M28 35.2v-3.8" stroke="' + c.main + '" stroke-width="1.4" opacity=".65"/>'
    },
    eye: {
      label: '눈',
      keys: ['눈동자', '안목', '천리안', '눈'],
      draw: (c) => '<path d="M5.4 24c6.4-8.4 12.2-11.8 18.6-11.8S36.2 15.6 42.6 24c-6.4 8.4-12.2 11.8-18.6 11.8S11.8 32.4 5.4 24Z" ' +
        'fill="' + c.main + '" fill-opacity=".12" stroke="' + c.main + '" stroke-width="1.9" stroke-linejoin="round"/>' +
        '<circle cx="24" cy="24" r="6.6" stroke="' + c.main + '" stroke-width="1.7"/>' +
        '<circle cx="24" cy="24" r="2.9" fill="' + c.main + '"/>' +
        '<path d="M24 4.4v3M24 40.6v3M6.6 6.6 8.8 8.8M39.2 39.2l2.2 2.2M41.4 6.6 39.2 8.8M8.8 39.2 6.6 41.4" stroke="' + c.main + '" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>'
    },
    rune: {
      label: '마법진',
      keys: ['마법진', '마법원', '주문진', '룬문자', '룬', '마법'],
      draw: (c) => '<circle cx="24" cy="24" r="15.6" stroke="' + c.main + '" stroke-width="1.6" opacity=".9"/>' +
        '<circle cx="24" cy="24" r="11.2" stroke="' + c.main + '" stroke-width="1.2" stroke-dasharray="1.6 3.2" opacity=".75"/>' +
        '<path d="M24 10.6 35.6 30.6H12.4Z" stroke="' + c.main + '" stroke-width="1.4" stroke-linejoin="round" opacity=".85"/>' +
        '<path d="M24 37.4 12.4 17.4h23.2Z" stroke="' + c.main + '" stroke-width="1.2" stroke-linejoin="round" opacity=".45"/>' +
        '<circle cx="24" cy="24" r="2.4" fill="' + c.main + '"/>'
    },
    wave: {
      label: '물',
      keys: ['물결', '파도', '물방울', '파랑새', '물'],
      draw: (c) => '<path d="M24 5.4c3.2 4 5 6.4 5 8.8a5 5 0 0 1-10 0c0-2.4 1.8-4.8 5-8.8Z" ' +
        'fill="' + c.main + '" fill-opacity=".28" stroke="' + c.main + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M4.6 27.4c3.2-4.2 6.5-4.2 9.7 0s6.5 4.2 9.7 0 6.5-4.2 9.7 0 6.5 4.2 9.7 0" stroke="' + c.main + '" stroke-width="2.1" stroke-linecap="round" fill="none"/>' +
        '<path d="M4.6 35c3.2-4.2 6.5-4.2 9.7 0s6.5 4.2 9.7 0 6.5-4.2 9.7 0 6.5 4.2 9.7 0" stroke="' + c.main + '" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".55"/>'
    },
    forest: {
      label: '숲',
      keys: ['숲', '수풀', '나무', '고목', '림'],
      draw: (c) => pine(14.6, 34, 15, 4.4, c) + pine(33.4, 34, 15, 4.4, c) + pine(24, 38.6, 22, 6, c) +
        '<path d="M24 38.6v2.6M14.6 34v2.6M33.4 34v2.6" stroke="' + c.main + '" stroke-width="1.7" stroke-linecap="round" opacity=".8"/>'
    },
    crystal: {
      label: '수정',
      keys: ['수정', '크리스탈', '결정', '보석', '원석', '영석'],
      draw: (c) => '<path d="M24 5.4 33.6 16 24 42.6 14.4 16Z" fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="1.9" stroke-linejoin="round"/>' +
        '<path d="M14.4 16h19.2M24 5.4 20.6 16 24 42.6M24 5.4 27.4 16 24 42.6" stroke="' + c.main + '" stroke-width="1.2" opacity=".6" stroke-linejoin="round"/>'
    },
    star: {
      label: '별',
      keys: ['별빛', '성표', '별'],
      draw: (c) => '<path d="M24 4.4 27.4 20.6 43.6 24 27.4 27.4 24 43.6 20.6 27.4 4.4 24 20.6 20.6Z" ' +
        'fill="' + c.main + '" fill-opacity=".9" stroke="' + c.main + '" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<circle cx="24" cy="24" r="2.6" fill="' + c.light + '" opacity=".8"/>'
    },
    chain: {
      label: '사슬',
      keys: ['쇠사슬', '족쇄', '사슬', '고리'],
      draw: (c) => '<g stroke="' + c.main + '" stroke-width="2.5" fill="none" stroke-linecap="round">' +
        '<ellipse cx="24" cy="15.6" rx="8.6" ry="5.2" transform="rotate(-18 24 15.6)"/>' +
        '<ellipse cx="24" cy="32.4" rx="5.2" ry="8.6" transform="rotate(-18 24 32.4)"/>' +
        '<ellipse cx="24" cy="24" rx="3.4" ry="5.6" transform="rotate(-18 24 24)"/></g>'
    },
    scales: {
      label: '저울',
      keys: ['저울', '천칭', '형량', '재판'],
      draw: (c) => '<path d="M24 8.2v30.4M9.4 13.4h29.2" stroke="' + c.main + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<circle cx="24" cy="10.2" r="2.1" fill="' + c.main + '"/>' +
        '<path d="M9.4 14v6.2M38.6 14v6.2" stroke="' + c.main + '" stroke-width="1.5" opacity=".8"/>' +
        '<path d="M3.6 20.4h11.6l-5.8 8.2Z" fill="' + c.main + '" fill-opacity=".24" stroke="' + c.main + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M32.8 20.4h11.6L38.6 28.6Z" fill="' + c.main + '" fill-opacity=".24" stroke="' + c.main + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M15.6 38.6h16.8" stroke="' + c.main + '" stroke-width="2.4" stroke-linecap="round"/>'
    },
    spear: {
      label: '창',
      keys: ['창날', '장창', '창', '투창'],
      draw: (c) => '<path d="M24 4.4 28.8 14.4v3.6h-9.6v-3.6Z" fill="' + c.main + '" fill-opacity=".9" stroke="' + c.main + '" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M24 4.4v13.6" stroke="' + c.light + '" stroke-width="1" opacity=".45"/>' +
        '<path d="M19.2 18.4h9.6" stroke="' + c.main + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M24 20.4v23" stroke="' + c.main + '" stroke-width="2.4" stroke-linecap="round"/>'
    },
    bow: {
      label: '활',
      keys: ['장궁', '곡궁', '활'],
      draw: (c) => '<path d="M13.4 5.4c9.2 6.6 13.8 12.2 13.8 18.6S22.6 35.8 13.4 42.6" stroke="' + c.main + '" stroke-width="2.3" stroke-linecap="round" fill="none"/>' +
        '<path d="M13.4 5.4v37.2" stroke="' + c.main + '" stroke-width="1" opacity=".55" stroke-dasharray="2 2.6"/>' +
        '<path d="M16.6 24h19.6" stroke="' + c.main + '" stroke-width="1.9" stroke-linecap="round"/>' +
        '<path d="M36.2 24 31.4 20.6M36.2 24 31.4 27.4" stroke="' + c.main + '" stroke-width="1.9" stroke-linecap="round"/>'
    },
    grimoire: {
      label: '마도서',
      keys: ['마도서', '고서', '서적', '마서', '책'],
      draw: (c) => '<path d="M24 13.6c-4.2-2.6-8.8-3.2-14.4-3.2v23.2c5.6 0 10.2.6 14.4 3.2 4.2-2.6 8.8-3.2 14.4-3.2V10.4c-5.6 0-10.2.6-14.4 3.2Z" ' +
        'fill="' + c.main + '" fill-opacity=".18" stroke="' + c.main + '" stroke-width="1.9" stroke-linejoin="round"/>' +
        '<path d="M24 13.6v23.2" stroke="' + c.main + '" stroke-width="1.4" opacity=".8"/>' +
        '<path d="M13.6 16.4c2.6.1 5 .5 7 1.4M13.6 21c2.6.1 5 .5 7 1.4M33.4 16.4c-2.6.1-5 .5-7 1.4" stroke="' + c.main + '" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>' +
        '<circle cx="24" cy="26.6" r="2.1" fill="' + c.light + '" opacity=".9"/>'
    },
    wings: {
      label: '날개',
      keys: ['날개', '학익', '익'],
      draw: (c) => {
        const one = '<path d="M23.2 34.4c-3.6-8.8-10.6-14.6-19.6-16 3.2 4.2 4.8 8 5.4 12 3.4-1.2 6.2-.8 8.2 1.2-1.8 1-2.9 2.6-3.4 4.8 3.6 1 6.2 3 8.6 6" ' +
          'fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>';
        return '<g>' + one + '</g><g transform="translate(48 0) scale(-1 1)">' + one + '</g>' +
          '<path d="M24 22.4v15.2" stroke="' + c.main + '" stroke-width="2" stroke-linecap="round" opacity=".9"/>' +
          '<circle cx="24" cy="20.4" r="2.2" fill="' + c.main + '"/>';
      }
    },
    candle: {
      label: '촛불',
      keys: ['촛불', '촛대', '양초', '초롱', '등불'],
      draw: (c) => '<path d="M24 5.6c3 3.4 4.7 5.7 4.7 8a4.7 4.7 0 0 1-9.4 0c0-2.3 1.7-4.6 4.7-8Z" ' +
        'fill="' + c.main + '" fill-opacity=".45" stroke="' + c.main + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M24 17.4v3.2" stroke="' + c.main + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M19.4 20.6h9.2v15.8h-9.2Z" fill="' + c.main + '" fill-opacity=".22" stroke="' + c.main + '" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M19.4 22.6c-1.4 1.4-1.6 4.2-.4 5.4" stroke="' + c.main + '" stroke-width="1.2" opacity=".6" stroke-linecap="round"/>' +
        '<path d="M15.6 38.4h16.8" stroke="' + c.main + '" stroke-width="2.2" stroke-linecap="round"/>'
    },
    phoenix: {
      label: '불새',
      keys: ['불사조', '봉황', '피닉스'],
      draw: (c) => '<path d="M24 8.4c3.6 3.4 5.4 7.4 5.4 11.8 0 3-1 5.4-2.4 7.4 5-2 8.6-6.4 9.6-12.4 2.6 3.6 3.6 7.4 3 11.4-1 6.4-6 11-12.4 11.4v2.4h-6.4V38c-6.4-.4-11.4-5-12.4-11.4-.6-4 .4-7.8 3-11.4 1 6 4.6 10.4 9.6 12.4-1.4-2-2.4-4.4-2.4-7.4 0-4.4 1.8-8.4 5.4-11.8Z" ' +
        'fill="' + c.main + '" fill-opacity=".24" stroke="' + c.main + '" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<circle cx="24" cy="18.4" r="2.2" fill="' + c.light + '"/>'
    }
  };

  const MOTIF_KEYS = [];
  Object.keys(MOTIFS).forEach((id) => {
    (MOTIFS[id].keys || []).forEach((k) => MOTIF_KEYS.push({ k: k, id: id }));
  });
  MOTIF_KEYS.sort((a, b) => b.k.length - a.k.length);

  const ELEMENT = { flame: 1, frost: 1, bolt: 1, wave: 1, forest: 1 };

  /* ---------------------------------------------------------
     외곽 프레임
     --------------------------------------------------------- */
  const FRAMES = {
    runes: {
      label: '원형 룬',
      keys: ['원형룬', '원형 룬', '원형', '둥근', '룬틀', '원테'],
      box: { scale: 0.72, cy: 24.6 },
      draw: (c) => '<circle cx="24" cy="24" r="21" stroke="' + c.main + '" stroke-width="1.6" opacity=".85" fill="none"/>' +
        '<circle cx="24" cy="24" r="18.4" stroke="' + c.main + '" stroke-width="1.1" stroke-dasharray="1.8 3.6" opacity=".6" fill="none"/>' +
        '<circle cx="24" cy="3" r="1.9" fill="' + c.main + '" opacity=".9"/>' +
        '<circle cx="24" cy="45" r="1.9" fill="' + c.main + '" opacity=".9"/>' +
        '<circle cx="3" cy="24" r="1.9" fill="' + c.main + '" opacity=".9"/>' +
        '<circle cx="45" cy="24" r="1.9" fill="' + c.main + '" opacity=".9"/>'
    },
    shield: {
      label: '방패형',
      keys: ['방패형', '방패 테두리', '방패 프레임', '방패틀'],
      box: { scale: 0.6, cy: 24.8 },
      draw: (c) => '<path d="M24 2.6 42.8 9.6v11.9c0 11.4-8 18.7-18.8 22.6C13.2 40.2 5.2 32.9 5.2 21.5V9.6Z" ' +
        'fill="' + c.main + '" fill-opacity=".07" stroke="' + c.main + '" stroke-width="1.7" stroke-linejoin="round"/>' +
        '<path d="M24 6.6 38.9 12.2v9.3c0 9.2-6.4 15.2-14.9 18.4C15.5 36.7 9.1 30.7 9.1 21.5v-9.3Z" ' +
        'stroke="' + c.main + '" stroke-width=".9" opacity=".45" fill="none" stroke-dasharray="2 2.6"/>'
    },
    hex: {
      label: '육각 마법진',
      keys: ['육각마법진', '육각형', '육각', '마법진 틀'],
      box: { scale: 0.68, cy: 24.4 },
      draw: (c) => '<path d="M24 2.6 42.8 13.3v21.4L24 45.4 5.2 34.7V13.3Z" fill="' + c.main + '" fill-opacity=".07" ' +
        'stroke="' + c.main + '" stroke-width="1.7" stroke-linejoin="round"/>' +
        '<path d="M24 7 38.2 15.2v17.6L24 41 9.8 32.8V15.2Z" stroke="' + c.main + '" stroke-width="1" ' +
        'stroke-dasharray="2 3" opacity=".6" fill="none" stroke-linejoin="round"/>' +
        '<circle cx="24" cy="3.6" r="1.7" fill="' + c.main + '"/>' +
        '<circle cx="41.6" cy="13.8" r="1.7" fill="' + c.main + '"/>' +
        '<circle cx="41.6" cy="34.2" r="1.7" fill="' + c.main + '"/>' +
        '<circle cx="24" cy="44.4" r="1.7" fill="' + c.main + '"/>' +
        '<circle cx="6.4" cy="34.2" r="1.7" fill="' + c.main + '"/>' +
        '<circle cx="6.4" cy="13.8" r="1.7" fill="' + c.main + '"/>'
    }
  };

  const FRAME_KEYS = [];
  Object.keys(FRAMES).forEach((id) => {
    (FRAMES[id].keys || []).forEach((k) => FRAME_KEYS.push({ k: k, id: id }));
  });
  FRAME_KEYS.sort((a, b) => b.k.length - a.k.length);

  /* ---------------------------------------------------------
     기본 아이콘 팩 — 판타지 문장 5종(모두 같은 계열의 인라인 SVG).
     등급 색(--rank-color)을 그대로 따라가서 목록·배지 어디서나 톤이 맞는다.
     --------------------------------------------------------- */
  const PRESETS = [
    { motif: 'rune', frame: 'hex', label: '아케인 마법진', title: '아케인 마법진' },
    { motif: 'blade', frame: 'runes', label: '판타지 장검', title: '장검' },
    { motif: 'shield', frame: 'runes', label: '기사 문장', title: '방패 문장' },
    { motif: 'flame', frame: 'runes', label: '불꽃', title: '불꽃' },
    { motif: 'crown', frame: 'runes', label: '왕관', title: '왕관' }
  ];

  /* ---------------------------------------------------------
     유틸
     --------------------------------------------------------- */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isValidSvg(markup) {
    if (!markup || !/^<svg[\s>]/i.test(markup)) return false;
    if (/<script|on[a-z]+\s*=|javascript:|<foreignobject|<!entity/i.test(markup)) return false;
    return true;
  }

  const SVG_TAG = '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">';

  function encodeSvg(markup) {
    return 'svg:' + encodeURIComponent(markup.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim());
  }

  function decodeSvg(icon) {
    const raw = String(icon || '');
    if (/^svg:/i.test(raw)) {
      try { return decodeURIComponent(raw.slice(4)); } catch (e) { return ''; }
    }
    return raw;
  }

  function isCustom(icon) {
    const raw = String(icon || '').trim();
    return /^svg:/i.test(raw) || /^data:image\//i.test(raw) || /^<svg[\s>]/i.test(raw);
  }

  /* ---------------------------------------------------------
     compose — spec {main, accents[], palette, frame, seed, title}
     --------------------------------------------------------- */
  function compose(spec) {
    const rnd = rng(spec.seed || 1);
    const pal = spec.palette || GOLD;
    const c = { main: pal.main, light: pal.light, deep: pal.deep };
    const frameId = FRAMES[spec.frame] ? spec.frame : 'runes';
    const frame = FRAMES[frameId];
    const main = MOTIFS[spec.main] ? spec.main : 'blade';
    const accents = (spec.accents || []).filter((a) => MOTIFS[a] && a !== main).slice(0, 2);

    let pieces = '';
    pieces += '<g>' + frame.draw(c) + '</g>';

    // 보조 모티브: 원소는 네 모서리의 작은 결정으로, 물체는 아래쪽 작은 문장으로
    accents.forEach((id, i) => {
      if (ELEMENT[id]) {
        const pts = frameId === 'shield' ? [[14.6, 15.4], [33.4, 15.4], [14.6, 30], [33.4, 30]]
          : [[12.2, 12.6], [35.8, 12.6], [12.2, 35.4], [35.8, 35.4]];
        pts.forEach((pt, j) => {
          const sc = 0.26 + ((i + j) % 2) * 0.04;
          pieces += '<g opacity=".8" transform="translate(' + pt[0] + ' ' + pt[1] + ') scale(' + sc.toFixed(2) + ') translate(-24 -24)">' +
            MOTIFS[id].draw(c) + '</g>';
        });
      } else {
        const y = frameId === 'shield' ? 37.4 : 38.6;
        const sc = frameId === 'shield' ? 0.24 : 0.28;
        pieces += '<g opacity=".95" transform="translate(24 ' + y + ') scale(' + sc.toFixed(3) + ') translate(-24 -24)">' +
          MOTIFS[id].draw(c) + '</g>';
      }
    });

    // 주 모티브
    const box = frame.box;
    const scale = box.scale * (0.95 + rnd() * 0.1);
    const rot = (rnd() - 0.5) * 3.5;
    const mirror = rnd() < 0.5 ? -1 : 1;
    pieces += '<g transform="translate(24 ' + box.cy + ') rotate(' + rot.toFixed(1) + ') ' +
      'scale(' + (scale * mirror).toFixed(3) + ' ' + scale.toFixed(3) + ') translate(-24 -24)">' +
      MOTIFS[main].draw(c) + '</g>';

    // 반짝임 한두 개 — 문장이 살아 보이게
    const sparks = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < sparks; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 15 + rnd() * 4;
      const x = 24 + Math.cos(a) * r;
      const y = 24 + Math.sin(a) * r * 0.9;
      const s = 1.2 + rnd() * 1.1;
      pieces += '<g fill="' + c.light + '" opacity="' + (0.5 + rnd() * 0.35).toFixed(2) + '">' + star4(x, y, s) + '</g>';
    }

    const title = escHtml(String(spec.title || '문장').slice(0, 40));
    return SVG_TAG + '<title>' + title + '</title>' + pieces + '</svg>';
  }

  /* ---------------------------------------------------------
     parse — 설명 → spec
     --------------------------------------------------------- */
  const MASK = '\u0000';

  function parse(text, seed) {
    const raw = String(text == null ? '' : text).trim();
    let rest = ' ' + raw + ' ';
    // 마스킹해도 길이가 그대로라, 찾은 자리 i가 곧 원문에서의 자리다.
    function take(key) {
      const i = rest.indexOf(key);
      if (i === -1) return -1;
      rest = rest.slice(0, i) + new Array(key.length + 1).join(MASK) + rest.slice(i + key.length);
      return i;
    }

    let frame = null;
    FRAME_KEYS.some((f) => {
      if (take(f.k) > -1) { frame = f.id; return true; }
      return false;
    });

    let palette = null;
    COLOR_KEYS.some((p) => {
      if (take(p.k) > -1) { palette = p.p; return true; }
      return false;
    });

    const hits = [];
    MOTIF_KEYS.forEach((m) => {
      if (hits.length >= 4) return;
      if (hits.some((h) => h.id === m.id)) return;
      const at = take(m.k);
      if (at > -1) hits.push({ id: m.id, at: at });
    });
    hits.sort((a, b) => a.at - b.at);
    const found = hits.map((h) => h.id);

    // '마법진'이면 기본 외곽도 육각 마법진이 자연스럽다
    if (!frame && found.indexOf('rune') > -1) frame = 'hex';

    let main = null;
    let accents = [];
    if (found.length === 1) {
      main = found[0];
    } else if (found.length > 1) {
      const objects = found.filter((id) => !ELEMENT[id]);
      const elements = found.filter((id) => ELEMENT[id]);
      if (objects.length) {
        main = objects[objects.length - 1];
        accents = elements.concat(objects.slice(0, -1));
      } else {
        main = found[found.length - 1];
        accents = found.slice(0, -1);
      }
    }
    if (!main) main = 'blade';

    const spec = {
      main: main,
      accents: accents,
      palette: palette || GOLD,
      frame: frame || 'runes',
      seed: (seed >>> 0) || ((Date.now() % 100000) + 7),
      title: raw || '문장'
    };
    return spec;
  }

  function describe(spec) {
    const parts = [];
    if (spec.palette) parts.push(spec.palette.name);
    parts.push(MOTIFS[spec.main].label);
    (spec.accents || []).forEach((a) => { if (MOTIFS[a]) parts.push(MOTIFS[a].label); });
    parts.push(FRAMES[spec.frame || 'runes'].label);
    return parts.join(' · ');
  }

  function build(desc, seed) {
    const spec = parse(desc, seed);
    const markup = compose(spec);
    return { value: encodeSvg(markup), markup: markup, spec: spec, summary: describe(spec) };
  }

  /* ---------------------------------------------------------
     기본 팩 → 아이콘 문자열 (한 번 만들면 같은 값 — 선택 표시가 안정적)
     --------------------------------------------------------- */
  function design(motif, frame, title) {
    return encodeSvg(compose({
      main: motif, accents: [], palette: DESIGN,
      frame: frame || 'runes', seed: 11, title: title || MOTIFS[motif].label
    }));
  }

  let packCache = null;
  function pack() {
    if (!packCache) {
      packCache = PRESETS.map((p) => ({ value: design(p.motif, p.frame, p.title), label: p.label, kind: 'design' }));
    }
    return packCache.map((x) => ({ value: x.value, label: x.label, kind: x.kind }));
  }

  /* ---------------------------------------------------------
     렌더 — 이모지 / 글자 / svg: / data URI 모두 같은 자리에서
     --------------------------------------------------------- */
  function render(icon, opts) {
    const o = opts || {};
    const cls = 'rank-icon' + (o.cls ? ' ' + o.cls : '');
    const raw = String(icon == null ? '' : icon).trim();

    if (isCustom(raw)) {
      if (/^data:image\//i.test(raw)) {
        return '<img class="' + cls + ' rank-icon--img" src="' + escHtml(raw) + '" alt="">';
      }
      const markup = decodeSvg(raw);
      if (isValidSvg(markup)) {
        return '<span class="' + cls + ' rank-icon--svg" aria-hidden="true">' + markup + '</span>';
      }
    }
    return '<span class="' + cls + ' rank-icon--text" aria-hidden="true">' + escHtml(raw || '⚔') + '</span>';
  }

  function name(icon) {
    const raw = String(icon || '').trim();
    if (!isCustom(raw)) return raw || '⚔';
    if (/^data:image\//i.test(raw)) return '이미지 아이콘';
    const m = decodeSvg(raw).match(/<title>([^<]*)<\/title>/i);
    return m ? m[1] : '문장 아이콘';
  }

  function text(icon) {
    const raw = String(icon || '').trim();
    if (!isCustom(raw)) return raw || '⚔';
    return '✦';
  }

  global.RankIcon = {
    pack: pack,
    design: design,
    build: build,
    parse: parse,
    describe: describe,
    compose: compose,
    render: render,
    name: name,
    text: text,
    isCustom: isCustom,
    isValidSvg: isValidSvg,
    encodeSvg: encodeSvg,
    PRESETS: PRESETS,
    MOTIFS: MOTIFS,
    FRAMES: FRAMES,
    PALETTES: PALETTES
  };
})(window);
