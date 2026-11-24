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
    mentor: { label: '스승·제자', color: '#7f9fd0' },
    rival: { label: '라이벌', color: '#b487c9' },
    other: { label: '기타', color: '#9a9282' }
  };

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
    const ox = (-dy / len) * offset;
    const oy = (dx / len) * offset;
    const cx = (a.x + b.x) / 2 + ox;
    const cy = (a.y + b.y) / 2 + oy;
    return {
      d: 'M' + a.x + ' ' + a.y + ' Q' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y,
      mx: (a.x + 2 * cx + b.x) / 4,
      my: (a.y + 2 * cy + b.y) / 4
    };
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
      list.forEach((r, i) => {
        const a = chars.get(r.a);
        const b = chars.get(r.b);
        if (!a || !b) return;
        const offset = (i - (list.length - 1) / 2) * 30;
        const g = edgeGeometry(a.pos, b.pos, offset);
        const type = TYPES[r.type] || TYPES.other;
        const label = r.label || type.label;
        const dash = r.type === 'hostile' ? ' stroke-dasharray="7 5"' : '';
        html +=
          '<g class="gedge" data-edge="' + U.esc(r.id) + '">' +
            '<path d="' + g.d + '" fill="none" stroke="' + type.color + '" stroke-width="1.6" stroke-linecap="round" opacity=".9"' + dash + '/>' +
            '<path d="' + g.d + '" fill="none" stroke="transparent" stroke-width="12" style="pointer-events:stroke;cursor:pointer"/>' +
            '<rect x="' + (g.mx - Math.min(46, (label.length * 3.4 + 7) / 2)) + '" y="' + (g.my - 6) + '" width="' + Math.min(92, label.length * 3.4 + 7) + '" height="12" rx="6" fill="#141010" fill-opacity=".82" stroke="' + type.color + '" stroke-opacity=".5" stroke-width=".7"/>' +
            '<text x="' + g.mx + '" y="' + (g.my + 2.4) + '" text-anchor="middle" font-size="6.4" fill="' + type.color + '" font-family="-apple-system, sans-serif">' + U.esc(truncate(label, 13)) + '</text>' +
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
        '<g class="gnode' + (selected ? ' is-selected' : '') + '" data-node="' + U.esc(c.id) + '" transform="translate(' + c.pos.x + ' ' + c.pos.y + ')">' +
          (selected ? '<circle r="24" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="2 2" opacity=".9"/>' : '') +
          '<circle r="' + r + '" fill="#241a12" stroke="#d4af37" stroke-width="1.4" stroke-opacity=".75"/>' +
          (hasImg
            ? '<image href="' + U.esc(c.image) + '" x="' + (c.pos.x - r) + '" y="' + (c.pos.y - r) + '" width="' + (r * 2) + '" height="' + (r * 2) + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip_' + U.esc(c.id) + ')" style="pointer-events:none"/>'
            : '<text y="4.5" text-anchor="middle" font-size="13" fill="#d8b864" font-family="Georgia, \'AppleMyungjo\', serif">' + U.esc(U.initials(c.name)) + '</text>') +
          '<text class="gnode-lbl" y="32" text-anchor="middle" font-size="8.4" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round" font-family="-apple-system, sans-serif">' + U.esc(truncate(c.name, 8)) + '</text>' +
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
      hint.textContent = '노드를 끌어 옮기고, 탭하면 인물 상세가 열립니다.';
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
      } else if (state.opts.onNode) {
        state.opts.onNode(id);
      }
      return;
    }
    if (edgeEl && state.opts.onEdge) {
      state.opts.onEdge(edgeEl.getAttribute('data-edge'));
    }
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
        const p = toWorld(e.clientX, e.clientY);
        c.pos.x = Math.round(U.clamp(p.x, 24, 336));
        c.pos.y = Math.round(U.clamp(p.y, 24, 496));
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

    host.innerHTML =
      '<svg id="graph-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
        '<defs class="gdefs-clip"></defs>' +
        '<g class="gedges"></g>' +
        '<g class="gnodes"></g>' +
      '</svg>' +
      '<div class="graph-legend">' + Object.keys(TYPES).map((k) =>
        '<span><i style="background:' + TYPES[k].color + '"></i>' + TYPES[k].label + '</span>').join('') + '</div>' +
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
