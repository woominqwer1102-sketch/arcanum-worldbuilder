/* =========================================================
   ARCANUM · 🎲 대륙 랜덤 생성
   지구 대륙의 간략한 윤곽을 회전·반전·확대해 섞고, 해안선을 프랙탈로
   다듬은 뒤 옛날 양피지 질감과 세피아 잉크로 그려 세계 지도로 쓴다.
   ========================================================= */
(function (global) {
  'use strict';

  const INK = '60,44,28';          // 세피아 잉크 (r,g,b)
  const INK_DARK = '44,32,20';

  /* 대륙 윤곽 — 0~1 상자 안의 점들. 지구 대륙의 인상을 단순화한 것. */
  const SHAPES = {
    // 유라시아풍 거대 대륙 (가로로 넓고 동쪽에 반도)
    eurasia: { aspect: 1.5, pts: [
      [0.02, 0.46], [0.07, 0.31], [0.16, 0.22], [0.27, 0.16], [0.38, 0.11], [0.50, 0.13],
      [0.60, 0.08], [0.72, 0.11], [0.82, 0.17], [0.92, 0.25], [0.97, 0.36], [0.92, 0.44],
      [0.95, 0.53], [0.87, 0.58], [0.78, 0.55], [0.71, 0.62], [0.62, 0.58], [0.53, 0.64],
      [0.44, 0.59], [0.35, 0.65], [0.26, 0.60], [0.19, 0.67], [0.12, 0.60], [0.07, 0.53]
    ] },
    // 아메리카풍 세로 대륙 (가느다란 지협으로 이어진 두 덩어리)
    americas: { aspect: 0.72, pts: [
      [0.46, 0.02], [0.62, 0.05], [0.71, 0.14], [0.66, 0.23], [0.57, 0.28], [0.60, 0.35],
      [0.67, 0.42], [0.62, 0.50], [0.54, 0.55], [0.58, 0.62], [0.52, 0.72], [0.44, 0.84],
      [0.35, 0.94], [0.26, 0.97], [0.23, 0.87], [0.30, 0.76], [0.24, 0.66], [0.18, 0.56],
      [0.22, 0.46], [0.16, 0.38], [0.22, 0.30], [0.27, 0.20], [0.30, 0.10]
    ] },
    // 아프리카풍 대륙 (둥근 상부 + 남쪽으로 좁아지는 반도)
    africa: { aspect: 0.98, pts: [
      [0.18, 0.08], [0.35, 0.02], [0.54, 0.04], [0.70, 0.11], [0.77, 0.24], [0.73, 0.36],
      [0.66, 0.45], [0.63, 0.55], [0.55, 0.66], [0.50, 0.78], [0.41, 0.90], [0.33, 0.96],
      [0.27, 0.85], [0.24, 0.72], [0.17, 0.60], [0.10, 0.47], [0.09, 0.33], [0.12, 0.18]
    ] },
    // 호주풍 대륙 (오목한 만이 있는 둥근 덩어리)
    australia: { aspect: 1.22, pts: [
      [0.14, 0.34], [0.26, 0.18], [0.44, 0.10], [0.62, 0.13], [0.78, 0.22], [0.87, 0.36],
      [0.84, 0.50], [0.72, 0.58], [0.62, 0.52], [0.55, 0.62], [0.42, 0.68], [0.30, 0.62],
      [0.18, 0.54], [0.10, 0.44]
    ] },
    // 그린란드·마다가스카르풍 큰 섬
    greenland: { aspect: 0.86, pts: [
      [0.44, 0.04], [0.62, 0.10], [0.72, 0.24], [0.68, 0.40], [0.74, 0.54], [0.62, 0.66],
      [0.50, 0.78], [0.38, 0.86], [0.28, 0.74], [0.30, 0.58], [0.22, 0.44], [0.28, 0.28],
      [0.34, 0.14]
    ] }
  };

  const BIG = ['eurasia', 'americas', 'africa'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* 해안선 프랙탈 — 각 변의 중점을 수직 방향으로 흔들어 리아스식 해안을 만든다 */
  function fractalize(pts, iterations, roughness, rnd) {
    let list = pts.map((p) => [p[0], p[1]]);
    for (let it = 0; it < iterations; it++) {
      const next = [];
      const r = roughness * Math.pow(0.62, it);
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const b = list[(i + 1) % list.length];
        next.push(a);
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const off = (rnd() - 0.5) * len * r;
        next.push([(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off]);
      }
      list = next;
    }
    return list;
  }

  function bbox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach((p) => {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
  }

  /* 한 대륙을 회전·반전·확대해 캔버스 위 좌표로 옮긴다 */
  function place(shape, opts) {
    const aspect = shape.aspect || 1;
    const cos = Math.cos(opts.rot);
    const sin = Math.sin(opts.rot);
    return shape.pts.map(([x, y]) => {
      let ux = ((x - 0.5) * aspect) * opts.mx;
      let uy = ((y - 0.5)) * opts.my;
      const rx = ux * cos - uy * sin;
      const ry = ux * sin + uy * cos;
      return [opts.cx + rx * opts.size, opts.cy + ry * opts.size];
    });
  }

  function fitInto(shape, cx, cy, size, rot, mx, my, W, H) {
    let pts = place(shape, { cx: cx, cy: cy, size: size, rot: rot, mx: mx, my: my });
    let box = bbox(pts);
    const maxW = W * 0.94;
    const maxH = H * 0.92;
    // 너무 크면 줄이고, 시작점을 다시 잡는다
    let scale = 1;
    if (box.w > maxW) scale = Math.min(scale, maxW / box.w);
    if (box.h > maxH) scale = Math.min(scale, maxH / box.h);
    if (scale < 1) {
      size *= scale;
      pts = place(shape, { cx: cx, cy: cy, size: size, rot: rot, mx: mx, my: my });
      box = bbox(pts);
    }
    // 캔버스 밖으로 나간 만큼만 안으로 민다
    let dx = 0, dy = 0;
    if (box.minX < W * 0.03) dx = W * 0.03 - box.minX;
    if (box.maxX > W * 0.97) dx = W * 0.97 - box.maxX;
    if (box.minY < H * 0.03) dy = H * 0.03 - box.minY;
    if (box.maxY > H * 0.97) dy = H * 0.97 - box.maxY;
    if (dx || dy) {
      pts = pts.map((p) => [p[0] + dx, p[1] + dy]);
      box = bbox(pts);
    }
    const radius = Math.max(box.w, box.h) / 2;
    return { pts: pts, cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, radius: radius, box: box };
  }

  function smoothPath(ctx, pts) {
    const n = pts.length;
    if (!n) return;
    const last = pts[n - 1];
    const first = pts[0];
    ctx.beginPath();
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }

  function drawSea(ctx, W, H, rnd) {
    // 바다 물결선 — 육지가 위에 덮이므로 바다에만 남는다
    const count = Math.round((W * H) / 16000);
    for (let i = 0; i < count; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const len = 14 + rnd() * 30;
      const amp = 1.4 + rnd() * 1.8;
      ctx.strokeStyle = 'rgba(' + INK + ',' + (0.07 + rnd() * 0.1).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 1; k <= 6; k++) {
        ctx.lineTo(x + (len * k) / 6, y + Math.sin(k * 1.15 + rnd() * 0.3) * amp);
      }
      ctx.stroke();
    }
  }

  function drawLand(ctx, pts, W, H) {
    // 1) 옅은 그림자
    ctx.save();
    ctx.translate(4, 6);
    ctx.fillStyle = 'rgba(80,56,30,.14)';
    smoothPath(ctx, pts);
    ctx.fill();
    ctx.restore();

    // 2) 얕은 바다 테두리
    ctx.strokeStyle = 'rgba(96,74,44,.10)';
    ctx.lineWidth = 26;
    ctx.lineJoin = 'round';
    smoothPath(ctx, pts);
    ctx.stroke();

    // 3) 육지 채우기 — 양피지보다 한 톤 밝게
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f8eed6');
    g.addColorStop(1, '#efe0bd');
    ctx.fillStyle = g;
    smoothPath(ctx, pts);
    ctx.fill();

    // 4) 해안선 — 넓고 옅은 선 위에 가는 세피아 잉크
    ctx.strokeStyle = 'rgba(' + INK + ',.34)';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    smoothPath(ctx, pts);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(' + INK_DARK + ',.92)';
    ctx.lineWidth = 1.9;
    smoothPath(ctx, pts);
    ctx.stroke();
  }

  function drawIslets(ctx, layout, rnd, W, H) {
    const count = 3 + Math.floor(rnd() * 4);
    let drawn = 0;
    for (let attempt = 0; attempt < count * 8 && drawn < count; attempt++) {
      const x = W * (0.08 + rnd() * 0.84);
      const y = H * (0.08 + rnd() * 0.84);
      let ok = true;
      for (let i = 0; i < layout.length; i++) {
        const l = layout[i];
        if (Math.hypot(x - l.cx, y - l.cy) < l.radius * 0.92) { ok = false; break; }
      }
      if (!ok) continue;
      const r = Math.min(W, H) * (0.012 + rnd() * 0.026);
      const pts = [];
      const steps = 8 + Math.floor(rnd() * 3);
      for (let s2 = 0; s2 < steps; s2++) {
        const a = (s2 / steps) * Math.PI * 2;
        const rr = r * (0.7 + rnd() * 0.6);
        pts.push([x + Math.cos(a) * rr * 1.15, y + Math.sin(a) * rr]);
      }
      drawLand(ctx, fractalize(pts, 2, 0.3, rnd), W, H);
      drawn += 1;
    }
  }

  function drawCompass(ctx, x, y, r, rnd) {
    ctx.save();
    ctx.translate(x, y);
    // 바탕 원
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.7);
    halo.addColorStop(0, 'rgba(248,238,214,.85)');
    halo.addColorStop(1, 'rgba(248,238,214,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(' + INK + ',.75)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2); ctx.stroke();

    // 8방위 별
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const long = i % 2 === 0 ? r * 0.92 : r * 0.44;
      const w = r * 0.17;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * long, Math.sin(a) * long);
      ctx.lineTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w);
      ctx.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(' + INK_DARK + ',.82)' : 'rgba(' + INK + ',.32)';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(150,110,40,.9)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFrame(ctx, W, H) {
    ctx.strokeStyle = 'rgba(' + INK + ',.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(W * 0.022, H * 0.016, W * 0.956, H * 0.968);
    ctx.strokeStyle = 'rgba(' + INK + ',.32)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W * 0.038, H * 0.028, W * 0.924, H * 0.944);
  }

  /* 대륙 3~5개를 겹치지 않게 배치하고 섬 군도를 곁들인다 */
  function buildLayout(rnd, W, H) {
    const count = 3 + Math.floor(rnd() * 3);           // 대륙 3 ~ 5개
    const pool = Object.keys(SHAPES);
    const primaryName = BIG[Math.floor(rnd() * BIG.length)];
    const picks = [primaryName];
    let guard = 0;
    while (picks.length < count && guard++ < 40) {
      const name = pool[Math.floor(rnd() * pool.length)];
      if (picks.indexOf(name) === -1) picks.push(name);
    }
    if (rnd() < 0.6) picks.push('isles');              // 섬 군도는 덤으로

    const placed = [];
    const out = [];

    picks.forEach((name, i) => {
      const isPrimary = i === 0;
      if (name === 'isles') {
        const isles = buildIsles(rnd, W, H, placed);
        isles.forEach((island) => {
          placed.push({ cx: island.cx, cy: island.cy, radius: island.radius });
          island.isle = true;
          out.push(island);
        });
        return;
      }
      const shape = SHAPES[name];
      const baseSize = isPrimary ? (0.58 + rnd() * 0.14) : (0.24 + rnd() * 0.22);
      const rot = rnd() * Math.PI * 2;
      const mx = rnd() < 0.5 ? -1 : 1;
      const my = rnd() < 0.5 ? -1 : 1;

      let best = null;
      for (let k = 0; k < 34; k++) {
        const spread = isPrimary ? 0.14 : 0.36;
        const cx = W * (0.5 + (rnd() - 0.5) * spread * 2);
        const cy = H * (0.5 + (rnd() - 0.5) * spread * 2);
        const fitted = fitInto(shape, cx, cy, Math.min(W, H) * baseSize, rot, mx, my, W, H);
        let clash = false;
        for (let j = 0; j < placed.length; j++) {
          const d = Math.hypot(fitted.cx - placed[j].cx, fitted.cy - placed[j].cy);
          if (d < (fitted.radius + placed[j].radius) * 0.62) { clash = true; break; }
        }
        if (!best) best = fitted;
        if (!clash) { best = fitted; break; }
      }
      placed.push({ cx: best.cx, cy: best.cy, radius: best.radius });
      out.push({ pts: fractalize(best.pts, 4, 0.36, rnd), cx: best.cx, cy: best.cy, radius: best.radius, box: best.box });
    });

    return out;
  }

  /* 섬 군도 — 영국·일본처럼 호를 그리는 작은 섬들 */
  function buildIsles(rnd, W, H, placed) {
    const n = 4 + Math.floor(rnd() * 4);
    const baseX = W * (0.22 + rnd() * 0.56);
    const baseY = H * (0.22 + rnd() * 0.56);
    const angle = rnd() * Math.PI * 2;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i / Math.max(1, n - 1)) - 0.5;
      const cx = baseX + Math.cos(angle) * t * W * 0.34 + (rnd() - 0.5) * W * 0.05;
      const cy = baseY + Math.sin(angle) * t * H * 0.34 + (rnd() - 0.5) * H * 0.05;
      let r = Math.min(W, H) * (0.035 + rnd() * 0.055);
      let clash = false;
      for (let j = 0; j < placed.length; j++) {
        const d = Math.hypot(cx - placed[j].cx, cy - placed[j].cy);
        if (d < (r + placed[j].radius) * 0.7) { clash = true; break; }
      }
      if (clash) r *= 0.6;
      const pts = [];
      const steps = 9 + Math.floor(rnd() * 4);
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const rr = r * (0.76 + rnd() * 0.46);
        pts.push([cx + Math.cos(a) * rr * 1.1, cy + Math.sin(a) * rr]);
      }
      out.push({ pts: fractalize(pts, 2, 0.3, rnd), cx: cx, cy: cy, radius: r, box: bbox(pts) });
    }
    return out;
  }

  function chooseCompassSpot(layout, W, H) {
    // 육지에서 가장 먼 모서리
    const corners = [
      { x: W * 0.14, y: H * 0.13 },
      { x: W * 0.86, y: H * 0.13 },
      { x: W * 0.14, y: H * 0.87 },
      { x: W * 0.86, y: H * 0.87 }
    ];
    let best = corners[0];
    let bestScore = -1;
    corners.forEach((c) => {
      let score = Infinity;
      layout.forEach((l) => {
        const d = Math.hypot(c.x - l.cx, c.y - l.cy) - l.radius;
        if (d < score) score = d;
      });
      if (score > bestScore) { bestScore = score; best = c; }
    });
    return best;
  }

  /* 메인: 양피지 세계지도 한 장을 data URL로 돌려준다 */
  function continent(opts) {
    const o = opts || {};
    const W = o.width || 1000;
    const H = o.height || 1333;
    const seed = (typeof o.seed === 'number') ? o.seed : Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(seed);

    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('캔버스를 만들지 못했어요.');

    // 1) 양피지 바탕 (업로드 변환과 같은 질감)
    if (global.MapView && typeof global.MapView.parchmentBase === 'function') {
      global.MapView.parchmentBase(ctx, W, H);
    } else {
      ctx.fillStyle = '#eedcb8';
      ctx.fillRect(0, 0, W, H);
    }

    // 2) 바다 물결
    drawSea(ctx, W, H, rnd);

    // 3) 대륙
    const layout = buildLayout(rnd, W, H);
    layout.forEach((land) => drawLand(ctx, land.pts, W, H));

    // 3-1) 대륙 곁의 작은 섬들 (리아스식 해안의 부속섬 느낌)
    drawIslets(ctx, layout, rnd, W, H);

    // 4) 나침반 · 테두리
    const spot = chooseCompassSpot(layout, W, H);
    drawCompass(ctx, spot.x, spot.y, Math.min(W, H) * 0.062, rnd);
    drawFrame(ctx, W, H);

    let dataURL = '';
    try {
      dataURL = cv.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      dataURL = cv.toDataURL('image/png');
    }
    const mains = layout.filter((l) => !l.isle).length;
    return { dataURL: dataURL, width: W, height: H, seed: seed, continents: mains };
  }

  global.WorldGen = {
    continent: continent,
    shapes: SHAPES,
    _internals: { fractalize: fractalize, buildLayout: buildLayout, place: place, bbox: bbox, mulberry32: mulberry32 }
  };
})(window);
