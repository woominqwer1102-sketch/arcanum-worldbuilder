/* =========================================================
   ARCANUM · 인물 관계도 (interactive SVG)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.UI;

  const TYPES = {
    alliance: { label: '동맹', color: '#63a67f' },
    hostile: { label: '적대', color: '#c0626b' },
    family: { label: '가족', color: '#c9a05a' },
    love: { label: '연인', color: '#d98aa8' },
    friendship: { label: '친우', color: '#52a89b' },
    mentor: { label: '스승', color: '#7f9fd0' },
    student: { label: '제자', color: '#8fb4d8' },
    rival: { label: '라이벌', color: '#b487c9' },
    other: { label: '기타', color: '#9a9282' }
  };

  // 바둑판 격자 — 노드는 격자 교차점에만 놓인다
  const CELL = 64;
  const GRID_MIN_X = CELL, GRID_MAX_X = 320, GRID_MIN_Y = CELL, GRID_MAX_Y = 448;

  function snapX(x) { return U.clamp(Math.round(x / CELL) * CELL, GRID_MIN_X, GRID_MAX_X); }
  function snapY(y) { return U.clamp(Math.round(y / CELL) * CELL, GRID_MIN_Y, GRID_MAX_Y); }

  // 스승·제자: mentor는 a→b, student는 b→a 방향
  function isDirected(type) { return type === 'mentor' || type === 'student'; }
  function directedFromTo(r) {
    return r.type === 'student' ? { from: r.b, to: r.a } : { from: r.a, to: r.b };
  }

  const state = {
    host: null,
    svg: null,
    opts: {},
    view: { x: 0, y: 0, w: 360, h: 520 },
    mode: 'view',
    selected: [],
    drag: null,
    pointers: new Map(),
    pinch: null,
    tap: null,
    legend: true,
    mounted: false
  };

  function world() { return state.opts.world ? state.opts.world() : null; }

  function nodeMap() {
    const w = world();
    const map = new Map();
    (w ? w.characters : []).forEach((c) => map.set(c.id, c));
    return map;
  }

  function applyView() {
    if (!state.svg) return;
    const v = state.view;
    state.svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
  }

  function toWorld(clientX, clientY) {
    if (!state.svg) return { x: 0, y: 0 };
    const pt = state.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = state.svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function scaleFactor() {
    if (!state.svg) return 1;
    const ctm = state.svg.getScreenCTM();
    if (!ctm || !ctm.a) return 1;
    return ctm.a;
  }

  function edgeGeometry(a, b, offset) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const cx = (a.x + b.x) / 2 + nx * offset;
    const cy = (a.y + b.y) / 2 + ny * offset;
    // 노드 원 바깥에서 시작해 화살촉이 노드 가장자리에 닿도록 양끝을 다듬는다
    const r = 19;
    const sdx = cx - a.x, sdy = cy - a.y, sl = Math.hypot(sdx, sdy) || 1;
    const edx = b.x - cx, edy = b.y - cy, el = Math.hypot(edx, edy) || 1;
    const sx = a.x + (sdx / sl) * r, sy = a.y + (sdy / sl) * r;
    const ex = b.x - (edx / el) * r, ey = b.y - (edy / el) * r;
    return {
      d: 'M' + sx.toFixed(2) + ' ' + sy.toFixed(2) + ' Q' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ' ' + ex.toFixed(2) + ' ' + ey.toFixed(2),
      ex: ex, ey: ey,
      ux: edx / el, uy: edy / el,
      mx: (0.25 * sx + 0.5 * cx + 0.25 * ex),
      my: (0.25 * sy + 0.5 * cy + 0.25 * ey)
    };
  }

  // 끝 화살표 머리 — A → B 단방향
  function arrowHead(g, color) {
    const size = 7.5;
    const bx = g.ex - g.ux * size;
    const by = g.ey - g.uy * size;
    const px = -g.uy * size * 0.55;
    const py = g.ux * size * 0.55;
    return '<path d="M' + g.ex.toFixed(1) + ' ' + g.ey.toFixed(1) +
      ' L' + (bx + px).toFixed(1) + ' ' + (by + py).toFixed(1) +
      ' L' + (bx - px).toFixed(1) + ' ' + (by - py).toFixed(1) + ' Z" fill="' + color + '" opacity=".95"/>';
  }

  function truncate(name, n) {
    const s = String(name || '');
    return s.length > (n || 7) ? s.slice(0, n || 7) + '…' : s;
  }

  function renderEdges(svg, chars) {
    const w = world();
    const group = svg.querySelector('.gedges');
    if (!group) return;
    const byPair = new Map();
    const relations = (w ? w.relations : []).slice();
    relations.forEach((r) => {
      const key = [r.a, r.b].sort().join('|');
      if (!byPair.has(key)) byPair.set(key, []);
      byPair.get(key).push(r);
    });

    let html = '';
    byPair.forEach((list) => {
      // A→B 와 B→A 가 함께 있으면 서로 반대쪽으로 휘어 두 화살표가 모두 또렷하게
      const firstDir = list[0].a + '|' + list[0].b;
      const bothWays = list.some((r) => (r.a + '|' + r.b) !== firstDir);
      list.forEach((r) => {
        const a = chars.get(r.a);
        const b = chars.get(r.b);
        if (!a || !b) return;
        const sameDir = list.filter((x) => x.a === r.a && x.b === r.b);
        const idx = sameDir.indexOf(r);
        const sign = ((r.a + '|' + r.b) === firstDir) ? 1 : -1;
        const offset = bothWays
          ? sign * (26 + idx * 20)
          : (idx - (sameDir.length - 1) / 2) * 22;
        const g = edgeGeometry(a.pos, b.pos, offset);
        const type = TYPES[r.type] || TYPES.other;
        const directed = isDirected(r.type);
        const label = r.label || (directed ? '스승→제자' : type.label);
        const dash = r.type === 'hostile' ? ' stroke-dasharray="7 5"' : '';
        html +=
          '<g class="gedge" data-edge="' + U.esc(r.id) + '">' +
            '<path d="' + g.d + '" fill="none" stroke="' + type.color + '" stroke-width="1.6" stroke-linecap="round" opacity=".9"' + dash + '/>' +
            '<path d="' + g.d + '" fill="none" stroke="transparent" stroke-width="12" style="pointer-events:stroke;cursor:pointer"/>' +
            arrowHead(g, type.color) +
            '<rect x="' + (g.mx - Math.min(46, (label.length * 3.4 + 7) / 2)).toFixed(1) + '" y="' + (g.my - 6).toFixed(1) + '" width="' + Math.min(92, label.length * 3.4 + 7).toFixed(1) + '" height="12" rx="6" fill="#141010" fill-opacity=".82" stroke="' + type.color + '" stroke-opacity=".5" stroke-width=".7"/>' +
            '<text x="' + g.mx.toFixed(1) + '" y="' + (g.my + 2.4).toFixed(1) + '" text-anchor="middle" font-size="6.4" fill="' + type.color + '" font-family="-apple-system, sans-serif">' + U.esc(truncate(label, 13)) + '</text>' +
          '</g>';
      });
    });
    group.innerHTML = html;
  }

  function renderNodes(svg, chars) {
    const group = svg.querySelector('.gnodes');
    if (!group) return;
    let defs = '';
    let html = '';
    chars.forEach((c) => {
      const selected = state.selected.indexOf(c.id) > -1;
      const hasImg = !!c.image;
      const r = 18;
      if (hasImg) {
        defs += '<clipPath id="clip_' + U.esc(c.id) + '"><circle cx="' + c.pos.x + '" cy="' + c.pos.y + '" r="' + r + '"/></clipPath>';
      }
      html +=
        '<g class="gnode' + (selected ? ' is-selected' : '') + (c.pinned ? ' is-pinned' : '') + '" data-node="' + U.esc(c.id) + '" transform="translate(' + c.pos.x + ' ' + c.pos.y + ')">' +
          (selected ? '<circle r="24" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="2 2" opacity=".9"/>' : '') +
          (c.pinned ? '<circle r="23" fill="none" stroke="#d4af37" stroke-width="1.2" stroke-opacity=".9" stroke-dasharray="1.4 2.8"/>' : '') +
          '<circle r="' + r + '" fill="#241a12" stroke="#d4af37" stroke-width="1.4" stroke-opacity=".75"/>' +
          (hasImg
            ? '<image href="' + U.esc(c.image) + '" x="' + (c.pos.x - r) + '" y="' + (c.pos.y - r) + '" width="' + (r * 2) + '" height="' + (r * 2) + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip_' + U.esc(c.id) + ')" style="pointer-events:none"/>'
            : '<text y="4.5" text-anchor="middle" font-size="13" fill="#d8b864" font-family="Georgia, \'AppleMyungjo\', serif">' + U.esc(U.initials(c.name)) + '</text>') +
          '<text class="gnode-lbl" y="32" text-anchor="middle" font-size="8.4" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round" font-family="-apple-system, sans-serif">' + U.esc(truncate(c.name, 8)) + '</text>' +
          (c.pinned ? '<text y="-27" text-anchor="middle" font-size="9" aria-hidden="true">📌</text>' : '') +
        '</g>';
    });
    svg.querySelector('.gdefs-clip').innerHTML = defs;
    group.innerHTML = html;
  }

  function updateNodeTransform(c) {
    const g = state.svg.querySelector('[data-node="' + c.id + '"]');
    if (g) g.setAttribute('transform', 'translate(' + c.pos.x + ' ' + c.pos.y + ')');
  }

  function refresh() {
    if (!state.svg) return;
    const chars = nodeMap();
    renderEdges(state.svg, chars);
    renderNodes(state.svg, chars);
    applyView();
    updateHint();
  }

  function updateHint() {
    const hint = state.host && state.host.querySelector('.graph-hint');
    if (!hint) return;
    if (!nodeMap().size) {
      hint.textContent = '인물을 먼저 추가하면 관계도가 그려집니다.';
    } else if (state.mode === 'link') {
      hint.textContent = state.selected.length
        ? '상대 인물을 한 명 더 탭하세요.'
        : '관계를 이을 인물 두 명을 차례로 탭하세요.';
    } else {
      hint.textContent = '노드를 끌면 바둑판 칸에 맞춰지고, 두 번 탭하면 위치가 고정돼요.';
    }
  }

  function setLinkMode(on) {
    state.mode = on ? 'link' : 'view';
    state.selected = [];
    if (state.svg) refresh();
    const btn = state.host && state.host.querySelector('[data-graph="link"]');
    if (btn) btn.classList.toggle('is-on', on);
  }

  function clearSelection() {
    state.selected = [];
    refresh();
  }

  function handleTap(target, clientX, clientY) {
    const nodeEl = target.closest ? target.closest('[data-node]') : null;
    const edgeEl = target.closest ? target.closest('[data-edge]') : null;
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-node');
      if (state.mode === 'link') {
        if (state.selected.length === 0) {
          state.selected = [id];
          refresh();
          U.haptic(8);
        } else if (state.selected.length === 1) {
          if (state.selected[0] === id) {
            clearSelection();
            return;
          }
          const a = state.selected[0];
          state.selected = [];
          refresh();
          if (state.opts.onLinkPair) state.opts.onLinkPair(a, id);
        }
      } else {
        // 더블 탭 = 위치 고정/해제, 한 번 탭 = 인물 상세 (330ms 기다렸다 구분)
        const now = Date.now();
        if (state.tap && state.tap.id === id && now - state.tap.at <= 380) {
          clearTimeout(state.tap.timer);
          state.tap = null;
          togglePin(id);
          return;
        }
        if (state.tap) clearTimeout(state.tap.timer);
        const t = { id: id, at: now, timer: 0 };
        t.timer = setTimeout(() => {
          state.tap = null;
          if (state.opts.onNode) state.opts.onNode(id);
        }, 330);
        state.tap = t;
      }
      return;
    }
    if (edgeEl && state.opts.onEdge) {
      state.opts.onEdge(edgeEl.getAttribute('data-edge'));
    }
  }

  function togglePin(id) {
    const c = nodeMap().get(id);
    if (!c) return;
    c.pinned = !c.pinned;
    if (c.pinned) {
      if (!c.pos) c.pos = { x: 180, y: 260 };
      c.pos.x = snapX(c.pos.x);
      c.pos.y = snapY(c.pos.y);
    }
    if (state.opts.onNodeMoved) state.opts.onNodeMoved();
    refresh();
    U.haptic(12);
    U.toast(c.pinned ? '📌 ' + c.name + ' 위치를 고정했어요' : c.name + ' 위치 고정을 풀었어요', { icon: 'i-pin', duration: 1600 });
  }

  function bind() {
    const svg = state.svg;

    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 2) {
        const pts = Array.from(state.pointers.values());
        state.pinch = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          view: Object.assign({}, state.view),
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2
        };
        state.drag = null;
        return;
      }
      if (state.pointers.size > 2) return;

      const nodeEl = e.target.closest ? e.target.closest('[data-node]') : null;
      const edgeEl = e.target.closest ? e.target.closest('[data-edge]') : null;
      const chars = nodeMap();
      if (nodeEl) {
        const c = chars.get(nodeEl.getAttribute('data-node'));
        if (c) {
          state.drag = { type: 'node', id: c.id, startX: e.clientX, startY: e.clientY, moved: 0, origin: e.target };
        }
      } else if (edgeEl) {
        state.drag = { type: 'edge', id: edgeEl.getAttribute('data-edge'), startX: e.clientX, startY: e.clientY, moved: 0, origin: e.target };
      } else {
        state.drag = { type: 'pan', startX: e.clientX, startY: e.clientY, view: Object.assign({}, state.view), moved: 0, origin: e.target };
      }
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
    });

    svg.addEventListener('pointermove', (e) => {
      if (!state.pointers.has(e.pointerId)) return;
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (state.pinch && state.pointers.size === 2) {
        const pts = Array.from(state.pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const factor = U.clamp(dist / state.pinch.dist, 0.25, 4);
        const before = toWorld(midX, midY);
        const newW = U.clamp(state.pinch.view.w / factor, 90, 900);
        const newH = newW * (state.pinch.view.h / state.pinch.view.w);
        state.view.w = newW;
        state.view.h = newH;
        state.view.x = state.pinch.view.x;
        state.view.y = state.pinch.view.y;
        applyView();
        const after = toWorld(midX, midY);
        state.view.x += before.x - after.x;
        state.view.y += before.y - after.y;
        applyView();
        e.preventDefault();
        return;
      }

      const drag = state.drag;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));

      if (drag.type === 'node') {
        const c = nodeMap().get(drag.id);
        if (!c) return;
        if (c.pinned) return;   // 고정된 노드는 끌어도 움직이지 않는다
        const p = toWorld(e.clientX, e.clientY);
        c.pos.x = snapX(p.x);
        c.pos.y = snapY(p.y);
        updateNodeTransform(c);
        renderEdges(state.svg, nodeMap());
        e.preventDefault();
      } else if (drag.type === 'pan') {
        const s = scaleFactor() || 1;
        state.view.x = drag.view.x - dx / s;
        state.view.y = drag.view.y - dy / s;
        applyView();
        e.preventDefault();
      }
    });

    function endPointer(e) {
      const wasDrag = state.drag;
      state.pointers.delete(e.pointerId);

      if (state.pointers.size < 2) state.pinch = null;

      if (wasDrag && wasDrag.moved < 6) {
        handleTap(wasDrag.origin || e.target, e.clientX, e.clientY);
      } else if (wasDrag && wasDrag.type === 'node') {
        if (state.opts.onNodeMoved) state.opts.onNodeMoved();
        U.haptic(6);
      }
      state.drag = null;
    }

    svg.addEventListener('pointerup', endPointer);
    svg.addEventListener('pointercancel', (e) => {
      state.pointers.delete(e.pointerId);
      state.pinch = null;
      state.drag = null;
    });
    svg.addEventListener('pointerleave', (e) => {
      if (state.drag && state.drag.type === 'node' && state.pointers.size === 0) state.drag = null;
    });

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 0.9);
    }, { passive: false });
  }

  function zoom(f) {
    const v = state.view;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const w = U.clamp(v.w / f, 90, 900);
    const h = w * (v.h / v.w);
    state.view = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
    applyView();
  }

  function fit() {
    const chars = nodeMap();
    if (!chars.size) {
      state.view = { x: 0, y: 0, w: 360, h: 520 };
      applyView();
      return;
    }
    let minX = 9999, minY = 9999, maxX = -9999, maxY = -9999;
    chars.forEach((c) => {
      minX = Math.min(minX, c.pos.x);
      minY = Math.min(minY, c.pos.y);
      maxX = Math.max(maxX, c.pos.x);
      maxY = Math.max(maxY, c.pos.y);
    });
    const pad = 56;
    const w = Math.max(200, maxX - minX + pad * 2);
    const h = Math.max(240, maxY - minY + pad * 2);
    const ratio = (state.svg && state.svg.getBoundingClientRect().height / state.svg.getBoundingClientRect().width) || 1.45;
    let vw = w;
    let vh = w * ratio;
    if (vh < h) { vh = h; vw = h / ratio; }
    state.view = {
      x: (minX + maxX) / 2 - vw / 2,
      y: (minY + maxY) / 2 - vh / 2,
      w: vw,
      h: vh
    };
    applyView();
  }

  function mount(host, opts) {
    state.host = host;
    state.opts = opts || {};
    state.mounted = true;
    state.mode = 'view';
    state.selected = [];
    state.pointers = new Map();
    state.pinch = null;
    state.drag = null;
    state.tap = null;

    host.innerHTML =
      '<svg id="graph-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
        '<defs class="gdefs-clip"></defs>' +
        '<defs><pattern id="graph-grid" width="64" height="64" patternUnits="userSpaceOnUse">' +
          '<path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(212,175,55,.16)" stroke-width=".5"/>' +
        '</pattern></defs>' +
        '<rect class="graph-grid-bg" x="-4000" y="-4000" width="8000" height="8000" fill="url(#graph-grid)"/>' +
        '<g class="gedges"></g>' +
        '<g class="gnodes"></g>' +
      '</svg>' +
      '<div class="graph-legend">' + Object.keys(TYPES).filter((k) => k !== 'student').map((k) =>
        '<span><i style="background:' + TYPES[k].color + '"></i>' + (k === 'mentor' ? '스승·제자' : TYPES[k].label) + '</span>').join('') + '</div>' +
      '<div class="graph-hint"></div>';

    state.svg = host.querySelector('#graph-svg');
    bind();
    refresh();
    requestAnimationFrame(fit);
    return api;
  }

  function destroy() {
    if (state.host) state.host.innerHTML = '';
    state.svg = null;
    state.host = null;
    state.mounted = false;
    state.tap = null;
  }

  function toggleLegend() {
    state.legend = !state.legend;
    const el = state.host && state.host.querySelector('.graph-legend');
    if (el) el.style.display = state.legend ? '' : 'none';
    return state.legend;
  }

  const api = { mount, refresh, destroy, setLinkMode, fit, zoom, toggleLegend, clearSelection, TYPES, state };

  global.Graph = api;
})(window);
