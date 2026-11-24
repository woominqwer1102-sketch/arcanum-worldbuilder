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
      p = { x: Math.round(180 + Math.cos(angle) * rx * k), y: Math.round(260 + Math.sin(angle) * ry * k) };
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

  function edgeGeometry(a, b) {
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
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
    ((w && w.factionRelations) || []).forEach((r) => {
      const a = byId.get(r.a);
      const b = byId.get(r.b);
      if (!a || !b) return;
      const g = edgeGeometry(a.pos, b.pos);
      const type = TYPES[r.type] || TYPES.ally;
      const label = r.label || type.label;
      const dash = r.type === 'hostile' ? ' stroke-dasharray="7 5"' : (r.type === 'subject' ? ' stroke-dasharray="4 3"' : '');
      ehtml +=
        '<g class="fedge" data-fedge="' + U.esc(r.id) + '">' +
          '<line x1="' + g.x1 + '" y1="' + g.y1 + '" x2="' + g.x2 + '" y2="' + g.y2 + '" stroke="' + type.color + '" stroke-width="1.7" opacity=".85"' + dash + '/>' +
          '<line x1="' + g.x1 + '" y1="' + g.y1 + '" x2="' + g.x2 + '" y2="' + g.y2 + '" stroke="transparent" stroke-width="14" style="pointer-events:stroke;cursor:pointer"/>' +
          '<rect x="' + (g.mx - Math.min(44, (label.length * 3.5 + 8) / 2)) + '" y="' + (g.my - 6.5) + '" width="' + Math.min(88, label.length * 3.5 + 8) + '" height="13" rx="6.5" fill="#141010" fill-opacity=".84" stroke="' + type.color + '" stroke-opacity=".5" stroke-width=".7"/>' +
          '<text x="' + g.mx + '" y="' + (g.my + 2.6) + '" text-anchor="middle" font-size="6.6" fill="' + type.color + '" font-family="-apple-system, sans-serif">' + U.esc(truncate(label, 13)) + '</text>' +
        '</g>';
    });

    let nhtml = '';
    nodes.forEach((n) => {
      const selected = state.selected.indexOf(n.id) > -1;
      const color = n.color || '#c9a24a';
      const isNation = n.category === 'nation';
      const races = isNation ? raceNamesOf(w, n) : [];
      const nation = isNation ? '' : nationNameOf(w, n);
      nhtml +=
        '<g class="fnode' + (selected ? ' is-selected' : '') + '" data-fnode="' + U.esc(n.id) + '" transform="translate(' + n.pos.x + ' ' + n.pos.y + ')">' +
          (selected ? '<circle r="26" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="2 2" opacity=".9"/>' : '') +
          (isNation ? '<circle r="24" fill="none" stroke="' + color + '" stroke-width="1" stroke-dasharray="1.6 2.6" opacity=".7"/>' : '') +
          '<circle r="21" fill="#1a1411" stroke="' + color + '" stroke-width="1.4" opacity=".95"/>' +
          '<text text-anchor="middle" y="4.4" font-size="11" fill="' + color + '" font-family="AppleMyungjo, Georgia, serif">' + U.esc(String(n.title || '').slice(0, 1)) + '</text>' +
          '<text class="fnode-label" text-anchor="middle" y="33" font-size="7.2" fill="#d8cdb4" stroke="#100d0b" stroke-width="2.4" paint-order="stroke" font-family="-apple-system, sans-serif">' + U.esc(truncate(n.title, 9)) + '</text>' +
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
      if (state.opts.onNode) state.opts.onNode(id);
      return;
    }
    const edgeEl = target.closest ? target.closest('[data-fedge]') : null;
    if (edgeEl && state.opts.onEdge) state.opts.onEdge(edgeEl.getAttribute('data-fedge'));
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
        const p = toWorld(e.clientX, e.clientY);
        const cur = w.factionNodes[drag.id] || { x: 180, y: 260 };
        // 노드 중심을 잡고 끌도록 클릭 지점과의 차이를 반영
        if (!drag.grab) drag.grab = { x: cur.x - toWorld(drag.startX, drag.startY).x, y: cur.y - toWorld(drag.startX, drag.startY).y };
        cur.x = Math.round(U.clamp(p.x + drag.grab.x, 20, 340));
        cur.y = Math.round(U.clamp(p.y + drag.grab.y, 20, 500));
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
    if (hint) hint.textContent = on ? '세력을 두 개 차례로 탭하면 관계를 이을 수 있어요' : '';
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

    host.innerHTML =
      '<svg id="faction-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
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
    if (state.host) state.host.innerHTML = '';
    state.svg = null;
    state.host = null;
    state.mounted = false;
    state.drag = null;
    state.pointers = new Map();
    state.selected = [];
  }

  const api = { mount, refresh, destroy, fit, zoom, setLinkMode, TYPES, state };
  global.FactionGraph = api;
})(window);
