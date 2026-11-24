/* =========================================================
   ARCANUM · 세력 관계도 (faction relations, interactive SVG)
   설정집 '세력·국가' 항목을 노드로, world.factionRelations를 선으로 그린다.
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.UI;

  const TYPES = {
    ally: { label: '동맹', color: '#63a67f' },
    hostile: { label: '적대', color: '#c0626b' },
    rival: { label: '경쟁', color: '#b487c9' },
    subject: { label: '종속', color: '#c9a05a' },
    trade: { label: '교역·협정', color: '#7fa9d8' }
  };

  // 바둑판 격자 — 노드는 격자 교차점에만 놓인다
  const CELL = 64;
  const GRID_MIN_X = CELL, GRID_MAX_X = 320, GRID_MIN_Y = CELL, GRID_MAX_Y = 448;
  function snapX(x) { return U.clamp(Math.round(x / CELL) * CELL, GRID_MIN_X, GRID_MAX_X); }
  function snapY(y) { return U.clamp(Math.round(y / CELL) * CELL, GRID_MIN_Y, GRID_MAX_Y); }

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
    mounted: false
  };

  function world() { return state.opts.world ? state.opts.world() : null; }

  function factions() {
    const w = world();
    // 국가와 세력을 함께 노드로 — 국가는 바깥 점선 고리로 구분한다
    return ((w && w.lore) || []).filter((l) => l.category === 'faction' || l.category === 'nation');
  }

  function posOf(w, l, i, total) {
    if (!w.factionNodes) w.factionNodes = {};
    let p = w.factionNodes[l.id];
    if (!p) {
      // 원형으로 흩어 놓는다
      const angle = (i / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
      const n = Math.max(1, total);
      // 노드가 많을수록 고리를 넓혀 이름이 겹치지 않게
      const rx = 100 + Math.min(80, n * 6.5);
      const ry = 150 + Math.min(120, n * 9.5);
      // 안팎으로 번갈아 놓아 이름이 겹치지 않게
      const k = i % 2 ? 0.7 : 1;
      p = { x: snapX(180 + Math.cos(angle) * rx * k), y: snapY(260 + Math.sin(angle) * ry * k) };
      w.factionNodes[l.id] = p;
    }
    return p;
  }

  function nationNameOf(w, l) {
    if (!l || !l.nationId) return '';
    const n = ((w && w.lore) || []).find((x) => x.id === l.nationId);
    return n ? n.title : '';
  }

  function raceNamesOf(w, l) {
    return ((l && l.raceIds) || []).map((id) => {
      const r = ((w && w.lore) || []).find((x) => x.id === id);
      return r ? r.title : '';
    }).filter(Boolean);
  }

  function nodeList() {
    const w = world();
    const list = factions();
    return list.map((l, i) => Object.assign({ lore: l, pos: posOf(w, l, i, list.length) }, l));
  }

  function applyView() {
    if (!state.svg) return;
    const v = state.view;
    state.svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
  }

  function scaleFactor() {
    if (!state.svg) return 1;
    const r = state.svg.getBoundingClientRect();
    return r.width ? (state.view.w / r.width) : 1;
  }

  function toWorld(clientX, clientY) {
    const r = state.svg.getBoundingClientRect();
    const s = scaleFactor();
    return { x: state.view.x + (clientX - r.left) * s, y: state.view.y + (clientY - r.top) * s };
  }

  function edgeGeometry(a, b, offset) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const cx = (a.x + b.x) / 2 + nx * (offset || 0);
    const cy = (a.y + b.y) / 2 + ny * (offset || 0);
    const r = 22;
    const sdx = cx - a.x, sdy = cy - a.y, sl = Math.hypot(sdx, sdy) || 1;
    const edx = b.x - cx, edy = b.y - cy, el = Math.hypot(edx, edy) || 1;
    const sx = a.x + (sdx / sl) * r, sy = a.y + (sdy / sl) * r;
    const ex = b.x - (edx / el) * r, ey = b.y - (edy / el) * r;
    return {
      d: 'M' + sx.toFixed(2) + ' ' + sy.toFixed(2) + ' Q' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ' ' + ex.toFixed(2) + ' ' + ey.toFixed(2),
      ex: ex, ey: ey, ux: edx / el, uy: edy / el,
      mx: 0.25 * sx + 0.5 * cx + 0.25 * ex,
      my: 0.25 * sy + 0.5 * cy + 0.25 * ey
    };
  }

  function arrowHead(g, color) {
    const size = 8;
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

  function render() {
    const svg = state.svg;
    if (!svg) return;
    const w = world();
    const nodes = nodeList();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges = svg.querySelector('.fedges');
    const gnodes = svg.querySelector('.fnodes');
    if (!edges || !gnodes) return;

    let ehtml = '';
    const rels = ((w && w.factionRelations) || []).slice();
    const byPair = new Map();
    rels.forEach((r) => {
      const key = [r.a, r.b].sort().join('|');
      if (!byPair.has(key)) byPair.set(key, []);
      byPair.get(key).push(r);
    });
    byPair.forEach((list) => {
      const firstDir = list[0].a + '|' + list[0].b;
      const bothWays = list.some((r) => (r.a + '|' + r.b) !== firstDir);
      list.forEach((r) => {
        const a = byId.get(r.a);
        const b = byId.get(r.b);
        if (!a || !b) return;
        const sameDir = list.filter((x) => x.a === r.a && x.b === r.b);
        const idx = sameDir.indexOf(r);
        const sign = ((r.a + '|' + r.b) === firstDir) ? 1 : -1;
        const offset = bothWays
          ? sign * (28 + idx * 20)
          : (idx - (sameDir.length - 1) / 2) * 24;
        const g = edgeGeometry(a.pos, b.pos, offset);
        const type = TYPES[r.type] || TYPES.ally;
        const label = r.label || type.label;
        const dash = r.type === 'hostile' ? ' stroke-dasharray="7 5"' : (r.type === 'subject' ? ' stroke-dasharray="4 3"' : '');
        ehtml +=
          '<g class="fedge" data-fedge="' + U.esc(r.id) + '">' +
            '<path d="' + g.d + '" fill="none" stroke="' + type.color + '" stroke-width="1.7" opacity=".85"' + dash + '/>' +
            '<path d="' + g.d + '" fill="none" stroke="transparent" stroke-width="14" style="pointer-events:stroke;cursor:pointer"/>' +
            arrowHead(g, type.color) +
            '<rect x="' + (g.mx - Math.min(44, (label.length * 3.5 + 8) / 2)).toFixed(1) + '" y="' + (g.my - 6.5).toFixed(1) + '" width="' + Math.min(88, label.length * 3.5 + 8).toFixed(1) + '" height="13" rx="6.5" fill="#141010" fill-opacity=".84" stroke="' + type.color + '" stroke-opacity=".5" stroke-width=".7"/>' +
            '<text x="' + g.mx.toFixed(1) + '" y="' + (g.my + 2.6).toFixed(1) + '" text-anchor="middle" font-size="6.6" fill="' + type.color + '" font-family="-apple-system, sans-serif">' + U.esc(truncate(label, 13)) + '</text>' +
          '</g>';
      });
    });

    let nhtml = '';
    nodes.forEach((n) => {
      const selected = state.selected.indexOf(n.id) > -1;
      const color = n.color || '#c9a24a';
      const isNation = n.category === 'nation';
      const races = isNation ? raceNamesOf(w, n) : [];
      const nation = isNation ? '' : nationNameOf(w, n);
      nhtml +=
        '<g class="fnode' + (selected ? ' is-selected' : '') + (n.pos && n.pos.pinned ? ' is-pinned' : '') + '" data-fnode="' + U.esc(n.id) + '" transform="translate(' + n.pos.x + ' ' + n.pos.y + ')">' +
          (selected ? '<circle r="26" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="2 2" opacity=".9"/>' : '') +
          (n.pos && n.pos.pinned ? '<circle r="27" fill="none" stroke="#d4af37" stroke-width="1.2" stroke-opacity=".9" stroke-dasharray="1.4 2.8"/>' : '') +
          (isNation ? '<circle r="24" fill="none" stroke="' + color + '" stroke-width="1" stroke-dasharray="1.6 2.6" opacity=".7"/>' : '') +
          '<circle r="21" fill="#1a1411" stroke="' + color + '" stroke-width="1.4" opacity=".95"/>' +
          '<text text-anchor="middle" y="4.4" font-size="11" fill="' + color + '" font-family="AppleMyungjo, Georgia, serif">' + U.esc(String(n.title || '').slice(0, 1)) + '</text>' +
          '<text class="fnode-label" text-anchor="middle" y="33" font-size="7.2" fill="#d8cdb4" stroke="#100d0b" stroke-width="2.4" paint-order="stroke" font-family="-apple-system, sans-serif">' + U.esc(truncate(n.title, 9)) + '</text>' +
          (n.pos && n.pos.pinned ? '<text y="-30" text-anchor="middle" font-size="9" aria-hidden="true">📌</text>' : '') +
          (races.length ? '<text class="fnode-race" text-anchor="middle" y="41" font-size="5.6" fill="#9c9078" stroke="#100d0b" stroke-width="1.8" paint-order="stroke" font-family="-apple-system, sans-serif">' + U.esc(truncate(races.join(' · '), 14)) + '</text>' : '') +
          (!isNation ? '<text class="fnode-nation" text-anchor="middle" y="41" font-size="5.6" fill="' + (nation ? '#c0a463' : '#7d7466') + '" stroke="#100d0b" stroke-width="1.8" paint-order="stroke" font-family="-apple-system, sans-serif">' + U.esc(nation || '무소속') + '</text>' : '') +
        '</g>';
    });

    edges.innerHTML = ehtml;
    gnodes.innerHTML = nhtml;
  }

  function handleTap(target, clientX, clientY) {
    const nodeEl = target.closest ? target.closest('[data-fnode]') : null;
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-fnode');
      if (state.mode === 'link') {
        if (state.selected.indexOf(id) > -1) return;
        state.selected.push(id);
        if (state.selected.length === 2) {
          const a = state.selected[0];
          const b = state.selected[1];
          state.selected = [];
          state.mode = 'view';
          render();
          if (state.opts.onLinkPair) state.opts.onLinkPair(a, b);
        } else {
          render();
        }
        return;
      }
      // 더블 탭 = 위치 고정/해제, 한 번 탭 = 세력 상세
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
      return;
    }
    const edgeEl = target.closest ? target.closest('[data-fedge]') : null;
    if (edgeEl && state.opts.onEdge) state.opts.onEdge(edgeEl.getAttribute('data-fedge'));
  }

  function togglePin(id) {
    const w = world();
    if (!w) return;
    if (!w.factionNodes) w.factionNodes = {};
    const cur = w.factionNodes[id];
    if (!cur) return;
    cur.pinned = !cur.pinned;
    if (cur.pinned) {
      cur.x = snapX(cur.x);
      cur.y = snapY(cur.y);
    }
    if (state.opts.onNodeMoved) state.opts.onNodeMoved();
    render();
    U.haptic(12);
    const title = factionTitle(id);
    U.toast(cur.pinned ? '📌 ' + title + ' 위치를 고정했어요' : title + ' 위치 고정을 풀었어요', { icon: 'i-pin', duration: 1600 });
  }

  function factionTitle(id) {
    const l = factions().find((x) => x.id === id);
    return l ? l.title : '세력';
  }
  function bind() {
    const svg = state.svg;

    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 2) {
        const pts = Array.from(state.pointers.values());
        state.pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, view: Object.assign({}, state.view) };
        state.drag = null;
        return;
      }
      if (state.pointers.size > 2) return;
      const nodeEl = e.target.closest ? e.target.closest('[data-fnode]') : null;
      if (nodeEl) {
        state.drag = { type: 'node', id: nodeEl.getAttribute('data-fnode'), startX: e.clientX, startY: e.clientY, moved: 0, origin: e.target };
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
        const factor = U.clamp(dist / state.pinch.dist, 0.3, 4);
        const v = state.pinch.view;
        const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
        const nw = U.clamp(v.w / factor, 90, 900);
        const nh = nw * (v.h / v.w);
        state.view = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
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
        const w = world();
        if (!w || !w.factionNodes) return;
        const cur = w.factionNodes[drag.id] || { x: 180, y: 260 };
        if (cur.pinned) return;   // 고정된 노드는 끌어도 움직이지 않는다
        const p = toWorld(e.clientX, e.clientY);
        // 노드 중심을 잡고 끌도록 클릭 지점과의 차이를 반영
        if (!drag.grab) drag.grab = { x: cur.x - toWorld(drag.startX, drag.startY).x, y: cur.y - toWorld(drag.startX, drag.startY).y };
        cur.x = snapX(p.x + drag.grab.x);
        cur.y = snapY(p.y + drag.grab.y);
        render();
        e.preventDefault();
      } else if (drag.type === 'pan') {
        const s = scaleFactor() || 1;
        state.view.x = drag.view.x - dx * s;
        state.view.y = drag.view.y - dy * s;
        applyView();
        e.preventDefault();
      }
    });

    function endPointer(e) {
      const wasDrag = state.drag;
      state.pointers.delete(e.pointerId);
      if (state.pointers.size < 2) state.pinch = null;
      if (wasDrag && wasDrag.moved < 6) handleTap(wasDrag.origin || e.target, e.clientX, e.clientY);
      else if (wasDrag && wasDrag.type === 'node' && state.opts.onNodeMoved) state.opts.onNodeMoved();
      state.drag = null;
    }
    svg.addEventListener('pointerup', endPointer);
    svg.addEventListener('pointercancel', () => { state.pointers.clear(); state.pinch = null; state.drag = null; });
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 0.9);
    }, { passive: false });
  }

  function zoom(f) {
    const v = state.view;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const nw = U.clamp(v.w / f, 90, 900);
    const nh = nw * (v.h / v.w);
    state.view = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    applyView();
  }

  function fit() {
    const nodes = nodeList();
    if (!nodes.length) {
      state.view = { x: 0, y: 0, w: 360, h: 520 };
      applyView();
      return;
    }
    let minX = 9999, minY = 9999, maxX = -9999, maxY = -9999;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.pos.x);
      minY = Math.min(minY, n.pos.y);
      maxX = Math.max(maxX, n.pos.x);
      maxY = Math.max(maxY, n.pos.y);
    });
    const pad = 60;
    const bw = Math.max(180, maxX - minX + pad * 2);
    const bh = Math.max(220, maxY - minY + pad * 2);
    const r = state.svg && state.svg.getBoundingClientRect();
    const ratio = (r && r.width) ? (r.height / r.width) : 1.45;
    let vw = bw, vh = bw * ratio;
    if (vh < bh) { vh = bh; vw = bh / ratio; }
    state.view = { x: (minX + maxX) / 2 - vw / 2, y: (minY + maxY) / 2 - vh / 2, w: vw, h: vh };
    applyView();
  }

  function setLinkMode(on) {
    state.mode = on ? 'link' : 'view';
    state.selected = [];
    render();
    const hint = state.host && state.host.querySelector('.graph-hint');
    if (hint) hint.textContent = on ? '세력을 두 개 차례로 탭하면 관계를 이을 수 있어요' : '노드를 끌면 바둑판 칸에 맞춰지고, 두 번 탭하면 위치가 고정돼요';
  }

  function refresh() {
    render();
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
      '<svg id="faction-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
        '<defs><pattern id="faction-grid" width="64" height="64" patternUnits="userSpaceOnUse">' +
          '<path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(212,175,55,.16)" stroke-width=".5"/>' +
        '</pattern></defs>' +
        '<rect class="graph-grid-bg" x="-4000" y="-4000" width="8000" height="8000" fill="url(#faction-grid)"/>' +
        '<g class="fedges"></g>' +
        '<g class="fnodes"></g>' +
      '</svg>' +
      '<div class="graph-legend">' + Object.keys(TYPES).map((k) =>
        '<span><i style="background:' + TYPES[k].color + '"></i>' + TYPES[k].label + '</span>').join('') + '</div>' +
      '<div class="graph-hint"></div>';

    state.svg = host.querySelector('#faction-svg');
    bind();
    refresh();
    requestAnimationFrame(fit);
    return api;
  }

  function destroy() {
    if (state.tap) clearTimeout(state.tap.timer);
    if (state.host) state.host.innerHTML = '';
    state.svg = null;
    state.host = null;
    state.mounted = false;
    state.drag = null;
    state.tap = null;
    state.pointers = new Map();
    state.selected = [];
  }

  const api = { mount, refresh, destroy, fit, zoom, setLinkMode, TYPES, state };
  global.FactionGraph = api;
})(window);
